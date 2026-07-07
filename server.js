const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const IS_VERCEL = !!process.env.VERCEL;
const LOCAL_DATA_DIR = path.join(__dirname, 'data');
// Upstash 직접 or Vercel 마켓플레이스(KV_REST_API_*) 둘 다 지원
// .env 파일 로드 (있으면)
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
    fs.readFileSync(envPath, 'utf-8').split('\n').forEach(line => {
        const m = line.match(/^([^#=]+)=(.*)$/);
        if (m && !process.env[m[1].trim()]) process.env[m[1].trim()] = m[2].trim();
    });
}

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
const HAS_REDIS = !!(REDIS_URL && REDIS_TOKEN);

// ===== 인증 시스템 (비밀번호 해시 암호화) =====
const DEFAULT_ACCESS_CODE = '1234';
const DEFAULT_ADMIN_CODE = 'admin1234';
const sessions = new Map(); // token → { role, createdAt, expiresAt } (로컬 캐시)
const SESSION_TTL = 24 * 60 * 60 * 1000; // 24시간
const SESSION_REDIS_TTL = 86400; // Redis TTL (초 단위, 24시간)

// --- 비밀번호 해시 유틸 ---
// SHA-256 + salt 방식. bcrypt 없이 Node 내장 crypto만 사용.
function hashPassword(plain, salt) {
    if (!salt) salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(plain, salt, 10000, 64, 'sha512').toString('hex');
    return { hash, salt };
}

function verifyPassword(plain, storedHash, storedSalt) {
    const { hash } = hashPassword(plain, storedSalt);
    return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(storedHash));
}

function generateToken() {
    return crypto.randomBytes(48).toString('hex');
}

// 세션 저장 (메모리 + Redis)
async function saveSession(token, session) {
    sessions.set(token, session);
    if (redis) {
        try { await redis.set('session:' + token, JSON.stringify(session), { ex: SESSION_REDIS_TTL }); }
        catch (e) { console.warn('Redis 세션 저장 실패:', e.message); }
    }
}

// 세션 삭제 (메모리 + Redis)
async function deleteSession(token) {
    sessions.delete(token);
    if (redis) {
        try { await redis.del('session:' + token); }
        catch (e) { console.warn('Redis 세션 삭제 실패:', e.message); }
    }
}

// 세션 검증 (메모리 → Redis 폴백)
async function validateSession(token) {
    if (!token) return null;
    // 메모리 캐시 먼저
    let session = sessions.get(token);
    if (session) {
        if (Date.now() > session.expiresAt) { deleteSession(token); return null; }
        return session;
    }
    // Redis에서 조회 (서버리스 환경 대응)
    if (redis) {
        try {
            const data = await redis.get('session:' + token);
            if (data) {
                session = typeof data === 'string' ? JSON.parse(data) : data;
                if (Date.now() > session.expiresAt) { deleteSession(token); return null; }
                sessions.set(token, session); // 메모리 캐시에 복원
                return session;
            }
        } catch (e) { console.warn('Redis 세션 조회 실패:', e.message); }
    }
    return null;
}

// 인증 미들웨어 — 보호된 API에 적용
async function requireAuth(req, res, next) {
    const token = req.headers['x-auth-token'];
    const session = await validateSession(token);
    if (!session) {
        return res.status(401).json({ error: '인증이 필요합니다.' });
    }
    req.session = session;
    next();
}

// 관리자 전용 미들웨어
async function requireAdmin(req, res, next) {
    const token = req.headers['x-auth-token'];
    const session = await validateSession(token);
    if (!session) {
        return res.status(401).json({ error: '인증이 필요합니다.' });
    }
    if (session.role !== 'admin') {
        return res.status(403).json({ error: '관리자 권한이 필요합니다.' });
    }
    req.session = session;
    next();
}

// Rate limiting (간단 구현)
const rateLimits = new Map(); // ip → { count, resetAt }
function rateLimit(maxRequests, windowMs) {
    return (req, res, next) => {
        const ip = req.ip || req.connection.remoteAddress;
        const now = Date.now();
        let entry = rateLimits.get(ip);
        if (!entry || now > entry.resetAt) {
            entry = { count: 0, resetAt: now + windowMs };
            rateLimits.set(ip, entry);
        }
        entry.count++;
        if (entry.count > maxRequests) {
            return res.status(429).json({ error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' });
        }
        next();
    };
}

// ===== 브루트포스 방어 시스템 =====
// IP별 로그인 실패 추적 및 점진적 잠금
const loginAttempts = new Map(); // ip → { failures, lockedUntil, totalFailures }
const LOCKOUT_POLICY = [
    { threshold: 5,  duration: 1 * 60 * 1000 },   // 5회 실패 → 1분 잠금
    { threshold: 10, duration: 5 * 60 * 1000 },   // 10회 실패 → 5분 잠금
    { threshold: 15, duration: 30 * 60 * 1000 },  // 15회 실패 → 30분 잠금
    { threshold: 20, duration: 60 * 60 * 1000 },  // 20회 실패 → 1시간 잠금
];
const MAX_FAILURES_BEFORE_LONG_LOCK = 25; // 25회 이상 → 24시간 잠금
const LONG_LOCK_DURATION = 24 * 60 * 60 * 1000;
const ATTEMPT_RESET_AFTER = 60 * 60 * 1000; // 마지막 실패 후 1시간 지나면 카운터 리셋

function getLoginAttemptInfo(ip) {
    const now = Date.now();
    let entry = loginAttempts.get(ip);
    if (!entry) return null;
    // 마지막 실패 후 1시간 경과 시 카운터 리셋
    if (entry.lastFailure && (now - entry.lastFailure) > ATTEMPT_RESET_AFTER) {
        loginAttempts.delete(ip);
        return null;
    }
    return entry;
}

function checkLoginLock(ip) {
    const now = Date.now();
    const entry = getLoginAttemptInfo(ip);
    if (!entry) return { locked: false };
    if (entry.lockedUntil && now < entry.lockedUntil) {
        const remainMs = entry.lockedUntil - now;
        const remainSec = Math.ceil(remainMs / 1000);
        return { locked: true, remainSec, failures: entry.failures };
    }
    return { locked: false, failures: entry.failures };
}

function recordLoginFailure(ip) {
    const now = Date.now();
    let entry = getLoginAttemptInfo(ip) || { failures: 0, lockedUntil: null, lastFailure: null };
    entry.failures++;
    entry.lastFailure = now;

    // 점진적 잠금 시간 결정
    if (entry.failures >= MAX_FAILURES_BEFORE_LONG_LOCK) {
        entry.lockedUntil = now + LONG_LOCK_DURATION;
    } else {
        // 정책 테이블에서 해당하는 가장 높은 단계 적용
        for (let i = LOCKOUT_POLICY.length - 1; i >= 0; i--) {
            if (entry.failures >= LOCKOUT_POLICY[i].threshold) {
                entry.lockedUntil = now + LOCKOUT_POLICY[i].duration;
                break;
            }
        }
    }

    loginAttempts.set(ip, entry);

    // 잠금 상태 반환
    const nextThreshold = LOCKOUT_POLICY.find(p => p.threshold > entry.failures);
    const remaining = nextThreshold ? (nextThreshold.threshold - entry.failures) : 0;
    return {
        failures: entry.failures,
        lockedUntil: entry.lockedUntil,
        attemptsUntilLock: remaining
    };
}

function resetLoginAttempts(ip) {
    loginAttempts.delete(ip);
}

// 오래된 잠금 기록 주기적 정리 (메모리 누수 방지)
setInterval(() => {
    const now = Date.now();
    for (const [ip, entry] of loginAttempts) {
        if (entry.lastFailure && (now - entry.lastFailure) > ATTEMPT_RESET_AFTER) {
            loginAttempts.delete(ip);
        }
    }
}, 10 * 60 * 1000); // 10분마다 정리

app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/defaults', express.static(path.join(__dirname, 'defaults')));
app.use('/defaults-posting', express.static(path.join(__dirname, 'defaults-posting')));

// 급식일지: /bap2/(백봉초), /bap3/(장평초)는 /bap/index.html을 공유하지만
// 데이터는 SCHOOL 키로 완전 분리됨 (Firestore 컬렉션 / Redis 사용자 맵 / 세션)
app.get(['/bap2', '/bap2/', '/bap3', '/bap3/'], (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'bap', 'index.html'));
});

// ===== 인증 API =====
// 저장된 해시를 읽거나, 없으면 초기 비밀번호로 해시를 생성해서 저장
async function getAuthCodes() {
    let settings = {};
    try { settings = (await readData('settings.json')) || {}; } catch (e) {}

    // 해시가 아직 없으면 (최초 실행) → 초기 비밀번호를 해시로 변환 후 저장
    if (!settings.auth || !settings.auth.accessHash) {
        const access = hashPassword(DEFAULT_ACCESS_CODE);
        const admin = hashPassword(DEFAULT_ADMIN_CODE);
        settings.auth = {
            accessHash: access.hash, accessSalt: access.salt,
            adminHash: admin.hash, adminSalt: admin.salt
        };
        await writeData('settings.json', settings);
    }
    return settings.auth;
}

// 로그인 (인증코드 검증 + 브루트포스 방어)
app.post('/api/auth/login', rateLimit(10, 60000), async (req, res) => {
    const ip = req.ip || req.connection.remoteAddress;
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: '인증 코드를 입력해주세요.' });

    // 잠금 상태 확인
    const lockStatus = checkLoginLock(ip);
    if (lockStatus.locked) {
        const min = Math.floor(lockStatus.remainSec / 60);
        const sec = lockStatus.remainSec % 60;
        const timeStr = min > 0 ? `${min}분 ${sec}초` : `${sec}초`;
        return res.status(429).json({
            error: `로그인 시도가 너무 많습니다. ${timeStr} 후에 다시 시도해주세요.`,
            locked: true,
            remainSec: lockStatus.remainSec,
            failures: lockStatus.failures
        });
    }

    const auth = await getAuthCodes();

    let role = null;
    try {
        if (verifyPassword(code, auth.adminHash, auth.adminSalt)) role = 'admin';
        else if (verifyPassword(code, auth.accessHash, auth.accessSalt)) role = 'user';
    } catch (e) {
        return res.status(500).json({ error: '인증 처리 오류' });
    }

    if (!role) {
        // 실패 기록 및 잠금 정보 반환
        const result = recordLoginFailure(ip);
        const response = { error: '잘못된 인증 코드입니다.' };
        if (result.attemptsUntilLock > 0 && result.attemptsUntilLock <= 3) {
            response.error += ` (${result.attemptsUntilLock}회 남음)`;
            response.attemptsLeft = result.attemptsUntilLock;
        }
        if (result.lockedUntil) {
            const lockSec = Math.ceil((result.lockedUntil - Date.now()) / 1000);
            const min = Math.floor(lockSec / 60);
            const sec = lockSec % 60;
            const timeStr = min > 0 ? `${min}분 ${sec}초` : `${sec}초`;
            response.error = `로그인 시도 초과. ${timeStr} 동안 잠금됩니다.`;
            response.locked = true;
            response.remainSec = lockSec;
        }
        response.failures = result.failures;
        return res.status(401).json(response);
    }

    // 로그인 성공 시 실패 카운터 리셋
    resetLoginAttempts(ip);

    const token = generateToken();
    await saveSession(token, {
        role,
        createdAt: Date.now(),
        expiresAt: Date.now() + SESSION_TTL
    });

    res.json({ success: true, token, role });
});

// 세션 검증
app.get('/api/auth/verify', async (req, res) => {
    const token = req.headers['x-auth-token'];
    const session = await validateSession(token);
    if (!session) return res.status(401).json({ valid: false });
    res.json({ valid: true, role: session.role });
});

// 로그아웃
app.post('/api/auth/logout', async (req, res) => {
    const token = req.headers['x-auth-token'];
    if (token) await deleteSession(token);
    res.json({ success: true });
});

// ===== Upstash Redis =====
let redis = null;
if (HAS_REDIS) {
    try {
        const { Redis } = require('@upstash/redis');
        redis = new Redis({ url: REDIS_URL, token: REDIS_TOKEN });
    } catch (e) { console.warn('Redis 로드 실패:', e.message); }
}

// KV 키 이름 (파일명 → KV 키)
const KV_KEYS = {
    'links.json': 'links',
    'categories.json': 'categories',
    'trainings.json': 'trainings',
    'staff.json': 'staff',
    'training-records.json': 'training-records',
    'sections.json': 'sections',
    'schedules.json': 'schedules',
    'tabs.json': 'tabs',
    'settings.json': 'settings',
    'news.json': 'news',
    'collections.json': 'collections',
    'esign-docs.json': 'esign-docs',
    'tdist-docs.json': 'tdist-docs',
    'checklist-posts.json': 'checklist-posts',
    'checklist-extra-staff.json': 'checklist-extra-staff',
    'winter-schedule.json': 'winter-schedule',
    'bap-managers.json': 'bap-managers',
    'bap-bosses.json': 'bap-bosses',
    'bap2-managers.json': 'bap2-managers',
    'bap2-bosses.json': 'bap2-bosses',
    'bap3-managers.json': 'bap3-managers',
    'bap3-bosses.json': 'bap3-bosses',
    'vibe-progress.json': 'vibe-progress'
};

// ===== 파일 기반 읽기/쓰기 (로컬 개발용) =====
function readFile(filename) {
    try {
        const dataPath = path.join(LOCAL_DATA_DIR, filename);
        if (fs.existsSync(dataPath)) return JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
        const defaultPath = path.join(__dirname, 'defaults', filename);
        if (fs.existsSync(defaultPath)) return JSON.parse(fs.readFileSync(defaultPath, 'utf-8'));
        return null;
    } catch (e) { return null; }
}

function writeFile(filename, data) {
    try {
        if (!fs.existsSync(LOCAL_DATA_DIR)) fs.mkdirSync(LOCAL_DATA_DIR, { recursive: true });
        fs.writeFileSync(path.join(LOCAL_DATA_DIR, filename), JSON.stringify(data, null, 2), 'utf-8');
    } catch (e) { console.error('파일 쓰기 실패:', e.message); }
}

// ===== 통합 읽기/쓰기 (KV 우선 → 파일 폴백) =====
async function redisRetry(fn, retries = 2) {
    for (let i = 0; i <= retries; i++) {
        try { return await fn(); }
        catch (e) {
            console.error(`Redis 시도 ${i+1}/${retries+1} 실패:`, e.message);
            if (i === retries) throw e;
            await new Promise(r => setTimeout(r, 500 * (i + 1)));
        }
    }
}

async function readData(filename) {
    const key = KV_KEYS[filename];
    // Upstash Redis 연결 시: Redis에서 읽기
    if (redis && key) {
        try {
            const data = await redisRetry(() => redis.get(key));
            if (data !== null && data !== undefined) return data;
            // Redis 비어있으면 defaults에서 초기 데이터 로드 후 Redis에 저장
            const defaults = readFile(filename);
            if (defaults) { await redis.set(key, JSON.stringify(defaults)); return defaults; }
            return null;
        } catch (e) {
            console.error('Redis 읽기 최종 실패 ('+key+'):', e.message);
            return readFile(filename);
        }
    }
    // 로컬: 파일에서 읽기
    return readFile(filename);
}

async function writeData(filename, data) {
    const key = KV_KEYS[filename];
    // Upstash Redis 연결 시: Redis에 저장
    if (redis && key) {
        try {
            await redisRetry(() => redis.set(key, JSON.stringify(data)));
        } catch (e) {
            console.error('Redis 쓰기 최종 실패 ('+key+'):', e.message);
            // Vercel에서 Redis 실패 시 에러 전파
            if (IS_VERCEL) throw new Error('데이터 저장 실패 - 잠시 후 다시 시도해주세요');
        }
    }
    // 로컬이면 파일에도 저장
    if (!IS_VERCEL) writeFile(filename, data);
}

// ===== API 라우트 =====
// 각 데이터 타입: GET(읽기), POST(전체 저장)
const DATA_ROUTES = [
    { path: 'links', file: 'links.json', fallback: [] },
    { path: 'categories', file: 'categories.json', fallback: [] },
    { path: 'trainings', file: 'trainings.json', fallback: [] },
    { path: 'staff', file: 'staff.json', fallback: [] },
    { path: 'training-records', file: 'training-records.json', fallback: {} },
    { path: 'sections', file: 'sections.json', fallback: [] },
    { path: 'schedules', file: 'schedules.json', fallback: [] },
    { path: 'tabs', file: 'tabs.json', fallback: [] },
    { path: 'settings', file: 'settings.json', fallback: {} },
    { path: 'news', file: 'news.json', fallback: [] },
    { path: 'collections', file: 'collections.json', fallback: [] },
    { path: 'esign-docs', file: 'esign-docs.json', fallback: [] },
    { path: 'tdist-docs', file: 'tdist-docs.json', fallback: [] },
    { path: 'checklist-posts', file: 'checklist-posts.json', fallback: [] },
    { path: 'checklist-extra-staff', file: 'checklist-extra-staff.json', fallback: [] },
    { path: 'winter-schedule', file: 'winter-schedule.json', fallback: { config: { startDate: '', endDate: '', holidays: [], setAt: null }, entries: {} } },
    { path: 'vibe-progress', file: 'vibe-progress.json', fallback: [] }
];

DATA_ROUTES.forEach(({ path: p, file, fallback }) => {
    app.get(`/api/${p}`, requireAuth, async (req, res) => {
        try {
            const data = await readData(file);
            res.json(data !== null && data !== undefined ? data : fallback);
        }
        catch (e) {
            console.error('GET /api/'+p+' 실패:', e.message);
            res.status(500).json({ error: '데이터 로딩 실패', _fallback: true });
        }
    });
    // 전체 덮어쓰기 POST (레거시) — 분산 락 안에서 직렬화. 신규 클라는 PATCH /api/items/* 사용.
    app.post(`/api/${p}`, requireAuth, async (req, res) => {
        try {
            await withRedisLock('data:' + p, async () => {
                await writeData(file, req.body);
            });
            res.json({ success: true });
        }
        catch (e) { res.status(500).json({ error: '서버 오류가 발생했습니다.' }); }
    });
});

// ===== 동시 편집 안전 (분산 뮤텍스 + per-item 머지) =====
// 문제: 기존 POST /api/<collection> 은 클라가 보낸 전체 배열로 통째 덮어쓰기였음.
// 두 사용자가 거의 동시에 서로 다른 항목을 수정하면 두 번째 POST 가 첫 번째 변경을 날림.
// 해결: 항목 단위 PATCH/DELETE 엔드포인트 + Redis NX 락으로 read-modify-write 원자성 확보.

// Upstash Redis는 서버리스 인스턴스 간 공유라 NX/EX 기반 락이 분산 환경에서 동작.
async function withRedisLock(key, fn, opts = {}) {
    const ttlMs = opts.ttl || 5000;
    const maxWaitMs = opts.maxWait || 5000;
    // 로컬(Redis 미연결)은 단일 프로세스이므로 락 없이 직접 실행
    if (!redis) return await fn();
    const lockKey = 'lock:' + key;
    const token = crypto.randomBytes(8).toString('hex');
    const ttlSec = Math.max(1, Math.ceil(ttlMs / 1000));
    const start = Date.now();
    while (true) {
        let acquired = false;
        try {
            acquired = await redis.set(lockKey, token, { nx: true, ex: ttlSec });
        } catch (e) {
            console.warn('lock acquire 실패, 락 없이 진행:', e.message);
            return await fn();
        }
        if (acquired) {
            try { return await fn(); }
            finally {
                try {
                    const cur = await redis.get(lockKey);
                    if (cur === token) await redis.del(lockKey);
                } catch (_) {}
            }
        }
        if (Date.now() - start > maxWaitMs) {
            const err = new Error('동시 편집 충돌: 잠시 후 다시 시도해 주세요.');
            err.status = 409;
            throw err;
        }
        await new Promise(r => setTimeout(r, 40 + Math.random() * 60));
    }
}

// 항목 단위 머지 가능한 최상위 배열 컬렉션
const ARRAY_COLLECTIONS = {
    'links': 'links.json',
    'categories': 'categories.json',
    'trainings': 'trainings.json',
    'staff': 'staff.json',
    'sections': 'sections.json',
    'schedules': 'schedules.json',
    'tabs': 'tabs.json',
    'news': 'news.json',
    'collections': 'collections.json',
    'esign-docs': 'esign-docs.json',
    'tdist-docs': 'tdist-docs.json',
    'checklist-posts': 'checklist-posts.json',
    'checklist-extra-staff': 'checklist-extra-staff.json',
    'vibe-progress': 'vibe-progress.json'
};

function reorderArrayByIds(arr, ids) {
    const byId = new Map(arr.filter(x => x && x.id).map(x => [x.id, x]));
    const out = [];
    for (const id of ids) {
        const it = byId.get(id);
        if (it) { out.push(it); byId.delete(id); }
    }
    for (const it of arr) {
        if (it && it.id && byId.has(it.id)) { out.push(it); byId.delete(it.id); }
    }
    out.forEach((it, i) => { if (typeof it.order === 'number') it.order = i; });
    return out;
}

// PATCH /api/items/:collection/:id — 항목 1개 원자적 upsert
app.patch('/api/items/:collection/:id', requireAuth, async (req, res) => {
    const { collection, id } = req.params;
    const file = ARRAY_COLLECTIONS[collection];
    if (!file) return res.status(400).json({ error: '알 수 없는 컬렉션' });
    try {
        await withRedisLock('data:' + collection, async () => {
            let arr = (await readData(file)) || [];
            if (!Array.isArray(arr)) arr = [];
            const incoming = { ...(req.body || {}), id };
            const idx = arr.findIndex(x => x && x.id === id);
            if (idx === -1) arr.push(incoming);
            else arr[idx] = { ...arr[idx], ...incoming };
            await writeData(file, arr);
        });
        res.json({ success: true });
    } catch (e) {
        res.status(e.status || 500).json({ error: e.message });
    }
});

// DELETE /api/items/:collection/:id — 항목 1개 원자적 삭제
app.delete('/api/items/:collection/:id', requireAuth, async (req, res) => {
    const { collection, id } = req.params;
    const file = ARRAY_COLLECTIONS[collection];
    if (!file) return res.status(400).json({ error: '알 수 없는 컬렉션' });
    try {
        await withRedisLock('data:' + collection, async () => {
            let arr = (await readData(file)) || [];
            if (!Array.isArray(arr)) return;
            await writeData(file, arr.filter(x => !x || x.id !== id));
        });
        res.json({ success: true });
    } catch (e) {
        res.status(e.status || 500).json({ error: e.message });
    }
});

// POST /api/items/:collection/reorder  body: {ids: [...]} — 원자적 순서 변경
app.post('/api/items/:collection/reorder', requireAuth, async (req, res) => {
    const { collection } = req.params;
    const file = ARRAY_COLLECTIONS[collection];
    if (!file) return res.status(400).json({ error: '알 수 없는 컬렉션' });
    const ids = Array.isArray(req.body && req.body.ids) ? req.body.ids : null;
    if (!ids) return res.status(400).json({ error: 'ids 배열 필요' });
    try {
        await withRedisLock('data:' + collection, async () => {
            let arr = (await readData(file)) || [];
            if (!Array.isArray(arr)) return;
            await writeData(file, reorderArrayByIds(arr, ids));
        });
        res.json({ success: true });
    } catch (e) {
        res.status(e.status || 500).json({ error: e.message });
    }
});

// POST /api/items/:collection/replace  body: [...] — 원자적 전체 치환 (락 안에서)
// 카테고리처럼 사용자가 모달에서 전체 리스트를 한번에 편집하는 경우용.
app.post('/api/items/:collection/replace', requireAuth, async (req, res) => {
    const { collection } = req.params;
    const file = ARRAY_COLLECTIONS[collection];
    if (!file) return res.status(400).json({ error: '알 수 없는 컬렉션' });
    const arr = req.body;
    if (!Array.isArray(arr)) return res.status(400).json({ error: '배열이 필요합니다' });
    try {
        await withRedisLock('data:' + collection, async () => {
            await writeData(file, arr);
        });
        res.json({ success: true });
    } catch (e) {
        res.status(e.status || 500).json({ error: e.message });
    }
});

// ----- vibe-progress 전용 per-item PATCH 별칭 -----
// 클라이언트 계약: PATCH /api/vibe-progress/items/:id (항목: {id, cls, name, stars, completed, updatedAt})
// 일반 형식(PATCH /api/items/vibe-progress/:id)도 ARRAY_COLLECTIONS 등록으로 함께 동작.
app.patch('/api/vibe-progress/items/:id', requireAuth, async (req, res) => {
    const { id } = req.params;
    try {
        await withRedisLock('data:vibe-progress', async () => {
            let arr = (await readData('vibe-progress.json')) || [];
            if (!Array.isArray(arr)) arr = [];
            const incoming = { ...(req.body || {}), id };
            if (!incoming.updatedAt) incoming.updatedAt = new Date().toISOString();
            const idx = arr.findIndex(x => x && x.id === id);
            if (idx === -1) arr.push(incoming);
            else arr[idx] = { ...arr[idx], ...incoming };
            await writeData('vibe-progress.json', arr);
        });
        res.json({ success: true });
    } catch (e) {
        res.status(e.status || 500).json({ error: e.message });
    }
});

// ----- sections.json 내부 nested item -----
app.patch('/api/sections/:secId/items/:itemId', requireAuth, async (req, res) => {
    const { secId, itemId } = req.params;
    try {
        await withRedisLock('data:sections', async () => {
            let arr = (await readData('sections.json')) || [];
            if (!Array.isArray(arr)) arr = [];
            const sec = arr.find(s => s && s.id === secId);
            if (!sec) { const err = new Error('섹션을 찾을 수 없습니다'); err.status = 404; throw err; }
            if (!Array.isArray(sec.items)) sec.items = [];
            const incoming = { ...(req.body || {}), id: itemId };
            const idx = sec.items.findIndex(i => i && i.id === itemId);
            if (idx === -1) sec.items.push(incoming);
            else sec.items[idx] = { ...sec.items[idx], ...incoming };
            await writeData('sections.json', arr);
        });
        res.json({ success: true });
    } catch (e) { res.status(e.status || 500).json({ error: e.message }); }
});

app.delete('/api/sections/:secId/items/:itemId', requireAuth, async (req, res) => {
    const { secId, itemId } = req.params;
    try {
        await withRedisLock('data:sections', async () => {
            let arr = (await readData('sections.json')) || [];
            if (!Array.isArray(arr)) return;
            const sec = arr.find(s => s && s.id === secId);
            if (!sec || !Array.isArray(sec.items)) return;
            sec.items = sec.items.filter(i => i && i.id !== itemId);
            await writeData('sections.json', arr);
        });
        res.json({ success: true });
    } catch (e) { res.status(e.status || 500).json({ error: e.message }); }
});

app.post('/api/sections/:secId/items/reorder', requireAuth, async (req, res) => {
    const { secId } = req.params;
    const ids = Array.isArray(req.body && req.body.ids) ? req.body.ids : null;
    if (!ids) return res.status(400).json({ error: 'ids 배열 필요' });
    try {
        await withRedisLock('data:sections', async () => {
            let arr = (await readData('sections.json')) || [];
            if (!Array.isArray(arr)) return;
            const sec = arr.find(s => s && s.id === secId);
            if (!sec || !Array.isArray(sec.items)) return;
            sec.items = reorderArrayByIds(sec.items, ids);
            await writeData('sections.json', arr);
        });
        res.json({ success: true });
    } catch (e) { res.status(e.status || 500).json({ error: e.message }); }
});

// ----- tabs.json 내부 nested (tab → section → item) -----
app.patch('/api/tabs/:tabId/sections/:secId', requireAuth, async (req, res) => {
    const { tabId, secId } = req.params;
    try {
        await withRedisLock('data:tabs', async () => {
            let arr = (await readData('tabs.json')) || [];
            if (!Array.isArray(arr)) arr = [];
            const tab = arr.find(x => x && x.id === tabId);
            if (!tab) { const err = new Error('탭을 찾을 수 없습니다'); err.status = 404; throw err; }
            if (!Array.isArray(tab.sections)) tab.sections = [];
            const body = req.body || {};
            const incoming = { ...body, id: secId };
            const idx = tab.sections.findIndex(s => s && s.id === secId);
            if (idx === -1) {
                if (!('items' in incoming)) incoming.items = [];
                tab.sections.push(incoming);
            } else {
                const merged = { ...tab.sections[idx], ...incoming };
                // items 명시적으로 안 보내면 기존 것 보존 (메타만 수정 케이스)
                if (!('items' in body)) merged.items = tab.sections[idx].items || [];
                tab.sections[idx] = merged;
            }
            await writeData('tabs.json', arr);
        });
        res.json({ success: true });
    } catch (e) { res.status(e.status || 500).json({ error: e.message }); }
});

app.delete('/api/tabs/:tabId/sections/:secId', requireAuth, async (req, res) => {
    const { tabId, secId } = req.params;
    try {
        await withRedisLock('data:tabs', async () => {
            let arr = (await readData('tabs.json')) || [];
            if (!Array.isArray(arr)) return;
            const tab = arr.find(x => x && x.id === tabId);
            if (!tab || !Array.isArray(tab.sections)) return;
            tab.sections = tab.sections.filter(s => !s || s.id !== secId);
            await writeData('tabs.json', arr);
        });
        res.json({ success: true });
    } catch (e) { res.status(e.status || 500).json({ error: e.message }); }
});

app.post('/api/tabs/:tabId/sections/reorder', requireAuth, async (req, res) => {
    const { tabId } = req.params;
    const ids = Array.isArray(req.body && req.body.ids) ? req.body.ids : null;
    if (!ids) return res.status(400).json({ error: 'ids 배열 필요' });
    try {
        await withRedisLock('data:tabs', async () => {
            let arr = (await readData('tabs.json')) || [];
            if (!Array.isArray(arr)) return;
            const tab = arr.find(x => x && x.id === tabId);
            if (!tab || !Array.isArray(tab.sections)) return;
            tab.sections = reorderArrayByIds(tab.sections, ids);
            await writeData('tabs.json', arr);
        });
        res.json({ success: true });
    } catch (e) { res.status(e.status || 500).json({ error: e.message }); }
});

app.patch('/api/tabs/:tabId/sections/:secId/items/:itemId', requireAuth, async (req, res) => {
    const { tabId, secId, itemId } = req.params;
    try {
        await withRedisLock('data:tabs', async () => {
            let arr = (await readData('tabs.json')) || [];
            if (!Array.isArray(arr)) arr = [];
            const tab = arr.find(x => x && x.id === tabId);
            if (!tab) { const err = new Error('탭을 찾을 수 없습니다'); err.status = 404; throw err; }
            const sec = (tab.sections || []).find(s => s && s.id === secId);
            if (!sec) { const err = new Error('섹션을 찾을 수 없습니다'); err.status = 404; throw err; }
            if (!Array.isArray(sec.items)) sec.items = [];
            const incoming = { ...(req.body || {}), id: itemId };
            const idx = sec.items.findIndex(i => i && i.id === itemId);
            if (idx === -1) sec.items.push(incoming);
            else sec.items[idx] = { ...sec.items[idx], ...incoming };
            await writeData('tabs.json', arr);
        });
        res.json({ success: true });
    } catch (e) { res.status(e.status || 500).json({ error: e.message }); }
});

app.delete('/api/tabs/:tabId/sections/:secId/items/:itemId', requireAuth, async (req, res) => {
    const { tabId, secId, itemId } = req.params;
    try {
        await withRedisLock('data:tabs', async () => {
            let arr = (await readData('tabs.json')) || [];
            if (!Array.isArray(arr)) return;
            const tab = arr.find(x => x && x.id === tabId);
            if (!tab) return;
            const sec = (tab.sections || []).find(s => s && s.id === secId);
            if (!sec || !Array.isArray(sec.items)) return;
            sec.items = sec.items.filter(i => i && i.id !== itemId);
            await writeData('tabs.json', arr);
        });
        res.json({ success: true });
    } catch (e) { res.status(e.status || 500).json({ error: e.message }); }
});

// POST /api/collections/:colId/submissions — 자료집계 제출 atomic append
// body: 제출 객체 (submitter, fileName, downloadUrl, ...)
app.post('/api/collections/:colId/submissions', requireAuth, async (req, res) => {
    const { colId } = req.params;
    const sub = req.body || {};
    if (!sub || typeof sub !== 'object') return res.status(400).json({ error: '제출 데이터 필요' });
    try {
        await withRedisLock('data:collections', async () => {
            const arr = (await readData('collections.json')) || [];
            if (!Array.isArray(arr)) return;
            const col = arr.find(c => c && c.id === colId);
            if (!col) { const e = new Error('자료집계 없음'); e.status = 404; throw e; }
            if (!Array.isArray(col.submissions)) col.submissions = [];
            col.submissions.push({ ...sub, submittedAt: new Date().toISOString() });
            await writeData('collections.json', arr);
        });
        res.json({ success: true });
    } catch (e) { res.status(e.status || 500).json({ error: e.message }); }
});

// 탭 간 섹션 이동 (소스 제거 + 타겟 추가를 한 락 안에서)
// body: { fromTabId: 'home'|'<tabId>', toTabId: 'home'|'<tabId>', secId }
app.post('/api/sections/move', requireAuth, async (req, res) => {
    const { fromTabId, toTabId, secId } = req.body || {};
    if (!fromTabId || !toTabId || !secId) return res.status(400).json({ error: 'fromTabId/toTabId/secId 필요' });
    if (fromTabId === toTabId) return res.json({ success: true });
    try {
        // sections + tabs 둘 다 잠근다 (양쪽 다 건드리면)
        await withRedisLock('data:sections', async () => {
            await withRedisLock('data:tabs', async () => {
                let sections = (await readData('sections.json')) || [];
                let tabs = (await readData('tabs.json')) || [];
                if (!Array.isArray(sections)) sections = [];
                if (!Array.isArray(tabs)) tabs = [];
                let sec = null;
                if (fromTabId === 'home') {
                    const idx = sections.findIndex(s => s && s.id === secId);
                    if (idx === -1) { const err = new Error('소스 섹션 없음'); err.status = 404; throw err; }
                    sec = { ...sections[idx] };
                    sections.splice(idx, 1);
                } else {
                    const tab = tabs.find(t => t && t.id === fromTabId);
                    if (!tab || !Array.isArray(tab.sections)) { const err = new Error('소스 탭 없음'); err.status = 404; throw err; }
                    const idx = tab.sections.findIndex(s => s && s.id === secId);
                    if (idx === -1) { const err = new Error('소스 섹션 없음'); err.status = 404; throw err; }
                    sec = { ...tab.sections[idx] };
                    tab.sections.splice(idx, 1);
                }
                if (toTabId === 'home') {
                    sec.order = sections.length;
                    sections.push(sec);
                } else {
                    const tgt = tabs.find(t => t && t.id === toTabId);
                    if (!tgt) { const err = new Error('대상 탭 없음'); err.status = 404; throw err; }
                    if (!Array.isArray(tgt.sections)) tgt.sections = [];
                    sec.order = tgt.sections.length;
                    tgt.sections.push(sec);
                }
                await writeData('sections.json', sections);
                await writeData('tabs.json', tabs);
            });
        });
        res.json({ success: true });
    } catch (e) { res.status(e.status || 500).json({ error: e.message }); }
});

// Training record PATCH (개별 교직원 기록 수정) — 분산 락으로 read-modify-write 직렬화
app.patch('/api/training-records/:trainingId/:staffId', requireAuth, async (req, res) => {
    try {
        const { trainingId, staffId } = req.params;
        await withRedisLock('data:training-records', async () => {
            const records = (await readData('training-records.json')) || {};
            if (!records[trainingId]) records[trainingId] = {};
            records[trainingId][staffId] = req.body;
            await writeData('training-records.json', records);
        });
        res.json({ success: true });
    } catch (e) { res.status(e.status || 500).json({ error: e.message }); }
});

// ===== 방학 근무 (겨울방학 허가원 자동화) =====
const hwpx = require('./lib/hwpx');

// 개별 교직원 항목 저장 (PATCH) — 인증 사용자만, 이름 기반 복구 위해 staffId + name 필요
// 동시 편집 안전: 분산 락으로 read-modify-write 직렬화
app.patch('/api/winter-schedule/entries/:staffId', requireAuth, async (req, res) => {
    try {
        const { staffId } = req.params;
        await withRedisLock('data:winter-schedule', async () => {
            const ws = (await readData('winter-schedule.json')) || { config: {}, entries: {} };
            if (!ws.entries) ws.entries = {};
            ws.entries[staffId] = {
                ...(req.body || {}),
                staffId,
                updatedAt: new Date().toISOString()
            };
            await writeData('winter-schedule.json', ws);
        });
        res.json({ success: true });
    } catch (e) { res.status(e.status || 500).json({ error: e.message }); }
});

// 방학 세팅 (config 설정) — 인증된 사용자. 이 요청은 전체 entries를 날린다.
app.post('/api/winter-schedule/setup', requireAuth, async (req, res) => {
    try {
        const { startDate, endDate, holidays } = req.body || {};
        if (!startDate || !endDate) {
            return res.status(400).json({ error: '시작일과 종료일을 모두 지정해야 합니다.' });
        }
        const newConfig = {
            config: {
                startDate,
                endDate,
                holidays: Array.isArray(holidays) ? holidays : [],
                setAt: new Date().toISOString(),
            },
            entries: {} // 기존 entries 모두 삭제
        };
        await writeData('winter-schedule.json', newConfig);
        res.json({ success: true, config: newConfig.config });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ===== 공휴일 조회 (date.nager.at + 대체공휴일 + 추가 임시공휴일) =====
// date.nager.at는 대체공휴일과 선거·임시공휴일을 누락하므로 서버에서 보강.

// 대체공휴일 적용 대상 (관공서 공휴일에 관한 규정 제3조). 신정/현충일은 법률상 제외.
const SUBSTITUTABLE_SINGLE_NAMES = new Set([
    'Independence Movement Day',  // 3·1절
    'Liberation Day',             // 광복절
    'National Foundation Day',    // 개천절
    'Hangul Day',                 // 한글날
    "Children's Day",             // 어린이날
    "Buddha's Birthday",          // 부처님 오신 날 (2023~)
    'Christmas Day',              // 크리스마스 (2023~)
]);
const HOLIDAY_GROUPS = { 'Lunar New Year': '설날', 'Chuseok': '추석' }; // 3일 연휴

// date.nager.at가 누락하는 연도별 추가 공휴일
// - 근로자의 날 (공공기관 공휴일 아니지만 학교는 휴업)
// - 학교장 재량 휴업일 (학교 내규)
// - 전국동시선거 / 임시공휴일 등
// 여기 추가하면 학교일정 탭과 방학근무 탭 양쪽에 자동 반영된다.
const EXTRA_HOLIDAYS_BY_YEAR = {
    2026: [
        { date: '2026-05-01', name: '근로자의 날' },
        { date: '2026-05-04', name: '학교장 재량 휴업일' },
        { date: '2026-06-03', name: '제9회 전국동시지방선거' },
    ],
};

function computeHolidaysWithSubs(nagerData, year) {
    // 1) 기본 + 추가 수기 공휴일 병합
    const base = (nagerData || []).map(d => ({ date: d.date, name: d.localName, src: d.name }));
    const extras = (EXTRA_HOLIDAYS_BY_YEAR[year] || []).map(e => ({ date: e.date, name: e.name, src: 'extra' }));
    const all = [...base, ...extras];
    const existing = new Set(all.map(h => h.date));

    function nextBusinessDay(iso) {
        const d = new Date(iso + 'T00:00:00Z');
        while (true) {
            d.setUTCDate(d.getUTCDate() + 1);
            const ds = d.toISOString().slice(0, 10);
            const dow = d.getUTCDay();
            if (dow !== 0 && dow !== 6 && !existing.has(ds)) return ds;
        }
    }

    // 2) 단일 공휴일 중 토·일 겹침 → 다음 평일로 대체공휴일 추가
    for (const h of base) {
        if (!SUBSTITUTABLE_SINGLE_NAMES.has(h.src)) continue;
        const dow = new Date(h.date + 'T00:00:00Z').getUTCDay();
        if (dow === 0 || dow === 6) {
            const sub = nextBusinessDay(h.date);
            all.push({ date: sub, name: `${h.name} 대체공휴일`, src: 'substitute' });
            existing.add(sub);
        }
    }

    // 3) 설날·추석 연휴: 연휴 중 토·일 겹치면 연휴 마지막 다음 평일 1일 대체
    for (const [groupSrc, korName] of Object.entries(HOLIDAY_GROUPS)) {
        const dates = base.filter(h => h.src === groupSrc).map(h => h.date).sort();
        if (dates.length === 0) continue;
        const overlapsWeekend = dates.some(ds => {
            const d = new Date(ds + 'T00:00:00Z').getUTCDay();
            return d === 0 || d === 6;
        });
        if (overlapsWeekend) {
            const last = dates[dates.length - 1];
            const sub = nextBusinessDay(last);
            all.push({ date: sub, name: `${korName} 대체공휴일`, src: 'substitute' });
            existing.add(sub);
        }
    }

    return all
        .map(h => ({ date: h.date, name: h.name }))
        .sort((a, b) => a.date.localeCompare(b.date));
}

app.get('/api/winter-schedule/holidays', requireAuth, async (req, res) => {
    const year = parseInt(req.query.year, 10);
    if (!year || year < 1900 || year > 2100) {
        return res.status(400).json({ error: 'year 파라미터가 필요합니다.' });
    }
    try {
        const r = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/KR`);
        if (!r.ok) throw new Error(`upstream ${r.status}`);
        const data = await r.json();
        res.json(computeHolidaysWithSubs(data, year));
    } catch (e) {
        res.status(502).json({ error: '공휴일 조회 실패: ' + e.message });
    }
});

// ===== 오늘의 날씨·경보 알리미 (백암면 / 경기 용인 처인구) =====
// data.go.kr 공식 API를 서버에서 프록시 + Redis 캐시 (키 노출 방지·호출량 절감).
// 환경변수: DATA_GO_KR_KEY (data.go.kr 일반 인증키, URL-decoded 원본). 측정소는 WEATHER_DUST_STATION로 조정 가능.
const WEATHER_KEY = process.env.DATA_GO_KR_KEY || '';
const WEATHER_CACHE_KEY = 'cache:weather:baegam';        // 정상 응답 캐시 (10분)
const WEATHER_STALE_KEY = 'cache:weather:baegam:stale';  // 마지막 성공값 (폴백, 만료 없음)
const WEATHER_CACHE_TTL = 600;                            // 10분
const BAEGAM_LAT = 37.1607, BAEGAM_LON = 127.3766;       // 경기 용인 처인구 백암면
const DUST_STATION = process.env.WEATHER_DUST_STATION || '김량장동'; // 백암면 최근접 측정소(처인구). 실측 후 조정.
const WARN_STN_ID = 109;                                  // 기상특보 발표관서: 서울·인천·경기
const WARN_AREA_KEYWORDS = ['용인', '경기남부내륙', '경기도남부내륙', '경기남부', '경기도남부', '처인'];
const WARN_TYPES = ['폭염', '호우', '대설', '강풍', '한파', '태풍', '풍랑', '건조', '황사', '안개', '폭풍해일', '지진해일'];
const DUST_GRADE_LABEL = { '1': '좋음', '2': '보통', '3': '나쁨', '4': '매우나쁨' };
const PTY_LABEL = { '0': '없음', '1': '비', '2': '비/눈', '3': '눈', '5': '빗방울', '6': '진눈깨비', '7': '눈날림' };

// 기상청 동네예보 격자(DFS) 변환 — 위경도 → nx,ny
function dfsXyConv(lat, lon) {
    const RE = 6371.00877, GRID = 5.0, SLAT1 = 30.0, SLAT2 = 60.0;
    const OLON = 126.0, OLAT = 38.0, XO = 43, YO = 136, DEGRAD = Math.PI / 180.0;
    const re = RE / GRID, slat1 = SLAT1 * DEGRAD, slat2 = SLAT2 * DEGRAD;
    const olon = OLON * DEGRAD, olat = OLAT * DEGRAD;
    let sn = Math.tan(Math.PI * 0.25 + slat2 * 0.5) / Math.tan(Math.PI * 0.25 + slat1 * 0.5);
    sn = Math.log(Math.cos(slat1) / Math.cos(slat2)) / Math.log(sn);
    let sf = Math.tan(Math.PI * 0.25 + slat1 * 0.5);
    sf = Math.pow(sf, sn) * Math.cos(slat1) / sn;
    let ro = Math.tan(Math.PI * 0.25 + olat * 0.5);
    ro = re * sf / Math.pow(ro, sn);
    let ra = Math.tan(Math.PI * 0.25 + lat * DEGRAD * 0.5);
    ra = re * sf / Math.pow(ra, sn);
    let theta = lon * DEGRAD - olon;
    if (theta > Math.PI) theta -= 2.0 * Math.PI;
    if (theta < -Math.PI) theta += 2.0 * Math.PI;
    theta *= sn;
    return {
        nx: Math.floor(ra * Math.sin(theta) + XO + 0.5),
        ny: Math.floor(ro - ra * Math.cos(theta) + YO + 0.5)
    };
}

// 현재 KST 시각
function kstNow() {
    return new Date(Date.now() + 9 * 3600 * 1000);
}
function pad2(n) { return String(n).padStart(2, '0'); }

// 초단기실황 base_date/base_time (매시 40분 이후 해당 시각 제공)
function ncstBase() {
    const d = kstNow();
    if (d.getUTCMinutes() < 40) d.setUTCHours(d.getUTCHours() - 1);
    const yyyymmdd = `${d.getUTCFullYear()}${pad2(d.getUTCMonth() + 1)}${pad2(d.getUTCDate())}`;
    return { base_date: yyyymmdd, base_time: pad2(d.getUTCHours()) + '00' };
}

// timeout 포함 JSON fetch
async function fetchJsonTimeout(url, ms = 7000) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), ms);
    try {
        const r = await fetch(url, { signal: ctrl.signal });
        if (!r.ok) throw new Error(`upstream ${r.status}`);
        return await r.json();
    } finally { clearTimeout(t); }
}

function itemsOf(json) {
    const items = json && json.response && json.response.body && json.response.body.items;
    if (!items) return [];
    // 기상청은 items.item 형태, 에어코리아(미세먼지)는 items 자체가 배열
    const it = (items.item !== undefined) ? items.item : items;
    return Array.isArray(it) ? it : (it ? [it] : []);
}

// 초단기실황 → { temp, pty, rain, sky }
async function fetchWeatherNow() {
    const { nx, ny } = dfsXyConv(BAEGAM_LAT, BAEGAM_LON);
    const { base_date, base_time } = ncstBase();
    const url = `http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getUltraSrtNcst?serviceKey=${encodeURIComponent(WEATHER_KEY)}&dataType=JSON&numOfRows=20&pageNo=1&base_date=${base_date}&base_time=${base_time}&nx=${nx}&ny=${ny}`;
    const items = itemsOf(await fetchJsonTimeout(url));
    const get = (c) => { const f = items.find(i => i.category === c); return f ? f.obsrValue : null; };
    const t1h = get('T1H'), pty = get('PTY'), reh = get('REH');
    const temp = t1h != null ? Math.round(parseFloat(t1h)) : null;
    const humidity = reh != null ? Math.round(parseFloat(reh)) : null;
    const rain = PTY_LABEL[pty] || '없음';
    return { temp, humidity, pty, rain };
}

// 미세먼지 측정소 실시간 → { pm10, pm10Grade, pm25, pm25Grade, label, level }
async function fetchDust() {
    const url = `http://apis.data.go.kr/B552584/ArpltnInforInqireSvc/getMsrstnAcctoRltmMesureDnsty?serviceKey=${encodeURIComponent(WEATHER_KEY)}&returnType=json&numOfRows=1&pageNo=1&dataTerm=DAILY&ver=1.3&stationName=${encodeURIComponent(DUST_STATION)}`;
    const items = itemsOf(await fetchJsonTimeout(url));
    if (!items.length) return null;
    const d = items[0];
    const num = (v) => (v == null || v === '-' || v === '') ? null : parseInt(v, 10);
    const pm10 = num(d.pm10Value), pm25 = num(d.pm25Value);
    const pm10Grade = num(d.pm10Grade), pm25Grade = num(d.pm25Grade);
    const worst = Math.max(pm10Grade || 0, pm25Grade || 0) || null;
    const level = worst >= 4 ? 'danger' : worst === 3 ? 'warn' : 'ok';
    return { pm10, pm25, pm10Grade, pm25Grade, label: DUST_GRADE_LABEL[String(worst)] || '정보없음', level, station: DUST_STATION };
}

// 기상특보 통보문 → 백암면 해당 특보 배열
async function fetchWarnings() {
    const url = `http://apis.data.go.kr/1360000/WthrWrnInfoService/getWthrWrnMsg?serviceKey=${encodeURIComponent(WEATHER_KEY)}&dataType=JSON&numOfRows=5&pageNo=1&stnId=${WARN_STN_ID}`;
    const items = itemsOf(await fetchJsonTimeout(url));
    if (!items.length) return [];
    // 가장 최근 통보문(tmFc 기준) 선택
    items.sort((a, b) => String(b.tmFc).localeCompare(String(a.tmFc)));
    const text = String(items[0].t1 || items[0].t2 || '');
    return parseWarnings(text);
}

// 통보문 텍스트에서 (특보종류+주의보/경보) 추출, 백암면 지역 키워드가 인근에 있을 때만 채택
function parseWarnings(text) {
    if (!text) return [];
    const found = [];
    const re = new RegExp(`(${WARN_TYPES.join('|')})\\s*(주의보|경보)`, 'g');
    let m;
    while ((m = re.exec(text)) !== null) {
        const window = text.slice(m.index, m.index + 250); // 종류 뒤 지역 목록이 따라옴
        const hit = WARN_AREA_KEYWORDS.some(k => window.includes(k));
        if (!hit) continue;
        const type = m[1] + m[2];
        if (found.some(f => f.type === type)) continue;
        const level = (m[2] === '경보' || m[1] === '폭염' || m[1] === '한파' || m[1] === '태풍') && m[2] === '경보' ? 'danger' : 'warn';
        found.push({ type, kind: m[1], level });
    }
    return found;
}

app.get('/api/weather', requireAuth, async (req, res) => {
    if (!WEATHER_KEY) return res.status(503).json({ error: 'DATA_GO_KR_KEY 미설정' });
    try {
        if (redis && !req.query.nocache) {
            const cached = await redis.get(WEATHER_CACHE_KEY);
            if (cached) return res.json(typeof cached === 'string' ? JSON.parse(cached) : cached);
        }
        const [nowR, dustR, warnR] = await Promise.allSettled([fetchWeatherNow(), fetchDust(), fetchWarnings()]);
        const freshNow = nowR.status === 'fulfilled' ? nowR.value : null;
        const freshDust = dustR.status === 'fulfilled' ? dustR.value : null;
        const warnings = warnR.status === 'fulfilled' ? warnR.value : [];

        // 일부 항목(기온/미세먼지)이 일시 실패(예: data.go.kr throttle)하면
        // 마지막 정상값(stale)을 재사용해 화면이 '-'로 깜빡이지 않게 한다.
        let staleObj = null;
        if ((!freshNow || !freshDust) && redis) {
            try { const s = await redis.get(WEATHER_STALE_KEY); if (s) staleObj = typeof s === 'string' ? JSON.parse(s) : s; } catch (_) {}
        }
        const now = freshNow || (staleObj ? { temp: staleObj.temp, humidity: staleObj.humidity, rain: staleObj.rain, pty: staleObj.pty } : null);
        const dust = freshDust || (staleObj ? staleObj.dust : null);
        const usedStale = (!freshNow && now) || (!freshDust && dust);

        let alertLevel = 'none';
        if (warnings.some(w => w.level === 'danger') || (dust && dust.level === 'danger')) alertLevel = 'danger';
        else if (warnings.length || (dust && dust.level === 'warn')) alertLevel = 'warn';

        const result = {
            temp: now ? now.temp : null,
            humidity: now ? now.humidity : null,
            rain: now ? now.rain : null,
            pty: now ? now.pty : null,
            dust,
            warnings,
            alertLevel,
            updatedAt: new Date().toISOString(),
            partial: !freshNow || !freshDust || warnR.status !== 'fulfilled',
            stale: !!usedStale
        };

        if (req.query.debug) return res.json({ result, nx: dfsXyConv(BAEGAM_LAT, BAEGAM_LON), errors: { now: nowR.reason && String(nowR.reason), dust: dustR.reason && String(dustR.reason), warn: warnR.reason && String(warnR.reason) } });

        // 신선하게 받아온 경우에만 10분 캐시 + stale 갱신.
        // stale을 재사용 중이면 캐시하지 않아, throttle 해제 후 다음 요청이 바로 복구된다.
        if (redis && freshNow) {
            const s = JSON.stringify(result);
            redis.set(WEATHER_CACHE_KEY, s, { ex: WEATHER_CACHE_TTL }).catch(() => {});
            redis.set(WEATHER_STALE_KEY, s).catch(() => {});
        }
        res.json(result);
    } catch (e) {
        // 완전 실패 시 마지막 성공값(stale) 폴백
        if (redis) {
            try {
                const stale = await redis.get(WEATHER_STALE_KEY);
                if (stale) { const o = typeof stale === 'string' ? JSON.parse(stale) : stale; o.stale = true; return res.json(o); }
            } catch (_) {}
        }
        res.status(502).json({ error: '날씨 조회 실패: ' + e.message });
    }
});

// 허가원 다운로드 — 기본 DOCX (Word). HWPX는 ?format=hwpx 쿼리.
// 허가원 HWPX 다운로드. DOCX/HTML은 더 이상 서비스에서 노출하지 않지만,
// ?format=docx/html 쿼리로 호출하면 여전히 폴백을 생성해준다 (레거시 호출 보호용).
app.get('/api/winter-schedule/permit/:staffId', requireAuth, async (req, res) => {
    try {
        const { staffId } = req.params;
        const format = (req.query.format || 'hwpx').toLowerCase();
        const [ws, staff] = await Promise.all([
            readData('winter-schedule.json'),
            readData('staff.json')
        ]);
        const entry = (ws && ws.entries && ws.entries[staffId]) || null;
        if (!entry) return res.status(404).json({ error: '해당 교직원의 근무 현황이 없습니다.' });
        const staffRecord = (staff || []).find(s => s.id === staffId) || {};
        const name = entry.name || staffRecord.name || '';
        if (!name) return res.status(400).json({ error: '이름이 비어 있습니다.' });

        const payload = {
            name,
            school: entry.school || '백암초등학교',
            position: entry.position || staffRecord.position || '교사',
            applyDate: entry.applyDate,
            days: entry.days || {},
            config: (ws && ws.config) || null, // 주말·공휴일 자동 집계용
            fortyOnePeriods: entry.fortyOnePeriods,
            workPeriods: entry.workPeriods,
            summary: entry.summary,
        };

        const safeName = name.replace(/[^가-힣A-Za-z0-9_-]/g, '_');

        if (format === 'docx') {
            const { generatePermitDocx } = require('./lib/docx-permit');
            const buf = await generatePermitDocx(payload);
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
            res.setHeader('Content-Disposition',
                `attachment; filename*=UTF-8''${encodeURIComponent(`근무지외연수허가원_${safeName}.docx`)}`);
            return res.send(buf);
        }

        if (format === 'html') {
            const { generatePermitHtml } = require('./lib/html-permit');
            const html = generatePermitHtml(payload);
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            return res.send(html);
        }

        // 기본: HWPX
        const buf = await hwpx.generatePermit(payload);
        res.setHeader('Content-Type', 'application/hwp+zip');
        res.setHeader('Content-Disposition',
            `attachment; filename*=UTF-8''${encodeURIComponent(`근무지 외 연수 허가원(${safeName}).hwpx`)}`);
        res.send(buf);
    } catch (e) {
        console.error('permit gen error:', e);
        res.status(500).json({ error: e.message });
    }
});

// 전체 일정 엑셀 export (색 포함) — 인증된 사용자
app.get('/api/winter-schedule/xlsx', requireAuth, async (req, res) => {
    try {
        const [ws, staff] = await Promise.all([
            readData('winter-schedule.json'),
            readData('staff.json')
        ]);
        const buf = await require('./lib/xlsx-export').buildScheduleXlsx(ws, staff);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent('겨울방학근무현황.xlsx')}`);
        res.send(buf);
    } catch (e) {
        console.error('xlsx export error:', e);
        res.status(500).json({ error: e.message });
    }
});

// Export (전체 데이터 내보내기) — 관리자 전용
app.get('/api/export', requireAdmin, async (req, res) => {
    try {
        const [links, categories, sections, trainings, staff, trainingRecords, schedules, tabs, settings, news, collections, esignDocs, tdistDocs] = await Promise.all([
            readData('links.json'), readData('categories.json'), readData('sections.json'),
            readData('trainings.json'), readData('staff.json'), readData('training-records.json'),
            readData('schedules.json'), readData('tabs.json'), readData('settings.json'), readData('news.json'),
            readData('collections.json'), readData('esign-docs.json'), readData('tdist-docs.json')
        ]);
        res.json({ links, categories, sections, trainings, staff, trainingRecords, schedules, tabs, settings, news, collections, esignDocs, tdistDocs, exportedAt: new Date().toISOString() });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Import (전체 데이터 가져오기) — 관리자 전용
app.post('/api/import', requireAdmin, async (req, res) => {
    try {
        const { links, categories, sections, trainings, staff, trainingRecords, schedules, tabs, settings, news, collections, esignDocs, tdistDocs } = req.body;
        const writes = [];
        if (links) writes.push(writeData('links.json', links));
        if (categories) writes.push(writeData('categories.json', categories));
        if (sections) writes.push(writeData('sections.json', sections));
        if (trainings) writes.push(writeData('trainings.json', trainings));
        if (staff) writes.push(writeData('staff.json', staff));
        if (trainingRecords) writes.push(writeData('training-records.json', trainingRecords));
        if (schedules) writes.push(writeData('schedules.json', schedules));
        if (tabs) writes.push(writeData('tabs.json', tabs));
        if (settings) writes.push(writeData('settings.json', settings));
        if (news) writes.push(writeData('news.json', news));
        if (collections) writes.push(writeData('collections.json', collections));
        if (esignDocs) writes.push(writeData('esign-docs.json', esignDocs));
        if (tdistDocs) writes.push(writeData('tdist-docs.json', tdistDocs));
        await Promise.all(writes);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Health check
app.get('/api/health', async (req, res) => {
    const status = { server: true, redis: false, timestamp: new Date().toISOString() };
    if (redis) {
        try { await redis.ping(); status.redis = true; } catch (e) { status.redis = false; }
    }
    res.json(status);
});

// Firebase config (환경변수에서 클라이언트로 전달)
app.get('/api/firebase-config', requireAuth, (req, res) => {
    const cfg = {
        apiKey: process.env.FIREBASE_API_KEY,
        authDomain: process.env.FIREBASE_AUTH_DOMAIN,
        projectId: process.env.FIREBASE_PROJECT_ID,
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.FIREBASE_APP_ID
    };
    if (!cfg.apiKey) return res.json({});
    res.json(cfg);
});

// ===== 급식일지 시스템 (/bap) =====
// Firebase 웹 API 키는 공개되어도 되는 값이므로 인증 없이 노출
// (보안은 Firestore 규칙에서 수행)
app.get('/api/bap/config', (req, res) => {
    const cfg = {
        apiKey: process.env.FIREBASE_API_KEY,
        authDomain: process.env.FIREBASE_AUTH_DOMAIN,
        projectId: process.env.FIREBASE_PROJECT_ID,
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.FIREBASE_APP_ID
    };
    if (!cfg.apiKey) {
        return res.status(503).json({ error: 'Firebase config 환경변수가 설정되지 않았습니다.' });
    }
    res.json(cfg);
});

// 식단표지 HWPX/PDF 파싱 → Groq로 날짜별 메뉴 JSON 추출
// body: { fileBase64, filename?, year, month }
//   (구버전 호환) hwpxBase64 도 그대로 받음
// 전역 express.json 제한(10MB)을 이 라우트만 50MB로 상향
app.post('/api/bap/parse-menu', express.json({ limit: '50mb' }), async (req, res) => {
    try {
        const { fileBase64, hwpxBase64, filename, year, month } = req.body || {};
        const b64 = fileBase64 || hwpxBase64;
        if (!b64) return res.status(400).json({ error: 'fileBase64 파라미터가 필요합니다.' });
        const y = parseInt(year, 10);
        const m = parseInt(month, 10);
        if (!y || !m || m < 1 || m > 12) {
            return res.status(400).json({ error: 'year, month 파라미터가 유효하지 않습니다.' });
        }
        const buf = Buffer.from(b64, 'base64');
        if (buf.length < 100 || buf.length > 50 * 1024 * 1024) {
            return res.status(400).json({ error: '파일 크기가 유효하지 않습니다.' });
        }
        const { extractMenuText, parseMenuWithGroq } = require('./lib/bap-menu-parse');
        const text = await extractMenuText(buf, filename);
        if (!text || text.length < 50) {
            return res.status(400).json({ error: '파일에서 텍스트를 추출하지 못했습니다.' });
        }
        const menus = await parseMenuWithGroq(text, y, m, callGroqWithFallback);
        const count = Object.keys(menus).length;
        if (count === 0) {
            return res.status(422).json({ error: 'AI가 메뉴를 추출하지 못했습니다. 파일을 확인하세요.', textPreview: text.slice(0, 500) });
        }
        // rawText는 교사 검토 단계의 재파싱(/api/bap/revise-menu)에서 파일 재업로드 없이 재시도하기 위해 같이 내려보낸다.
        // 응답 크기 방어용으로 16KB까지만.
        res.json({ menus, count, rawText: text.slice(0, 16000) });
    } catch (e) {
        console.error('[/api/bap/parse-menu]', e);
        res.status(500).json({ error: e.message });
    }
});

// 교사 검토 의견을 반영해 LLM이 이전 결과 JSON을 수정한다.
// body: { rawText, previousMenus, feedback, year, month }
app.post('/api/bap/revise-menu', express.json({ limit: '20mb' }), async (req, res) => {
    try {
        const { rawText, previousMenus, feedback, year, month } = req.body || {};
        const y = parseInt(year, 10);
        const m = parseInt(month, 10);
        if (!rawText || typeof rawText !== 'string') return res.status(400).json({ error: 'rawText가 필요합니다.' });
        if (!previousMenus || typeof previousMenus !== 'object') return res.status(400).json({ error: 'previousMenus가 필요합니다.' });
        if (!feedback || typeof feedback !== 'string' || !feedback.trim()) return res.status(400).json({ error: '검토 의견을 입력하세요.' });
        if (!y || !m || m < 1 || m > 12) return res.status(400).json({ error: 'year, month가 유효하지 않습니다.' });
        const { reviseMenuWithGroq } = require('./lib/bap-menu-parse');
        const menus = await reviseMenuWithGroq(rawText, previousMenus, feedback, y, m, callGroqWithFallback);
        const count = Object.keys(menus).length;
        if (count === 0) {
            return res.status(422).json({ error: 'AI가 수정된 메뉴를 만들지 못했습니다.' });
        }
        res.json({ menus, count });
    } catch (e) {
        console.error('[/api/bap/revise-menu]', e);
        res.status(500).json({ error: e.message });
    }
});

// ===== /bap 사용자 인증 =====
// 기존 hashPassword(PBKDF2) + Redis 패턴 재사용. 별도 토큰 store(bap-session:)로
// 메인 앱 세션과 충돌 방지. 33명 내부 학교용이라 단순/실용 우선.
const BAP_SESSION_TTL = 30 * 86400; // 30일

function bapValidName(s) {
    return typeof s === 'string' && s.trim().length >= 1 && s.trim().length <= 30;
}
function bapValidPw(s) {
    return typeof s === 'string' && s.length >= 4 && s.length <= 128;
}
// 세 학교 완전 분리: /bap(백암) /bap2(백봉) /bap3(장평)
const BAP_SCHOOLS = new Set(['bap', 'bap2', 'bap3']);
function resolveSchool(req) {
    const raw = (req.header('X-Bap-School') || req.query.school || req.body?.school || 'bap').toString();
    return BAP_SCHOOLS.has(raw) ? raw : 'bap';
}
function bapRoleKey(role, school) {
    const prefix = BAP_SCHOOLS.has(school) ? school : 'bap';
    if (role === 'manager') return prefix + '-managers.json';
    if (role === 'boss')    return prefix + '-bosses.json';
    return null;
}

async function bapSessionGet(token) {
    if (!token) return null;
    if (!redis) return null;
    try {
        const data = await redis.get('bap-session:' + token);
        if (!data) return null;
        return typeof data === 'string' ? JSON.parse(data) : data;
    } catch (e) { return null; }
}
async function bapSessionSet(token, payload) {
    if (!redis) return;
    try { await redis.set('bap-session:' + token, JSON.stringify(payload), { ex: BAP_SESSION_TTL }); }
    catch (e) { console.warn('bap-session set 실패:', e.message); }
}
async function bapSessionDel(token) {
    if (!redis) return;
    try { await redis.del('bap-session:' + token); } catch (e) {}
}

// 인증 미들웨어 — 세션의 school과 요청된 school이 일치해야 함 (크로스-학교 차단)
async function bapAuth(req, res, next) {
    const token = req.header('X-Bap-Token');
    const sess = await bapSessionGet(token);
    if (!sess) return res.status(401).json({ error: '로그인이 필요합니다.' });
    const school = resolveSchool(req);
    const sessSchool = sess.school || 'bap'; // 레거시 세션 호환
    if (sessSchool !== school) return res.status(401).json({ error: '다른 학교의 세션입니다. 다시 로그인하세요.' });
    req.bapSession = sess;
    req.bapToken = token;
    req.bapSchool = school;
    next();
}

// 가입된 이름 목록 (로그인 dropdown용, 비번 정보 제외)
app.get('/api/bap/auth/list', async (req, res) => {
    const role = req.query.role;
    const school = resolveSchool(req);
    const file = bapRoleKey(role, school);
    if (!file) return res.status(400).json({ error: 'role은 manager 또는 boss' });
    const map = (await readData(file)) || {};
    res.json({ names: Object.keys(map).sort() });
});

// 회원가입
app.post('/api/bap/auth/signup', async (req, res) => {
    try {
        const { role, name, password } = req.body || {};
        const school = resolveSchool(req);
        const file = bapRoleKey(role, school);
        if (!file) return res.status(400).json({ error: 'role은 manager 또는 boss' });
        if (!bapValidName(name)) return res.status(400).json({ error: '이름은 1~30자' });
        if (!bapValidPw(password)) return res.status(400).json({ error: '비밀번호는 4~128자' });
        const cleanName = name.trim();
        const map = (await readData(file)) || {};
        if (map[cleanName]) return res.status(409).json({ error: '이미 가입된 이름입니다. 로그인하거나 다른 이름을 사용하세요.' });
        const { hash, salt } = hashPassword(password);
        const now = new Date().toISOString();
        map[cleanName] = { pwHash: hash, pwSalt: salt, createdAt: now, updatedAt: now };
        await writeData(file, map);
        const token = generateToken();
        await bapSessionSet(token, { role, school, name: cleanName, createdAt: Date.now() });
        res.json({ token, name: cleanName, role, school });
    } catch (e) {
        console.error('[bap signup]', e);
        res.status(500).json({ error: e.message });
    }
});

// 로그인
app.post('/api/bap/auth/login', async (req, res) => {
    try {
        const { role, name, password } = req.body || {};
        const school = resolveSchool(req);
        const file = bapRoleKey(role, school);
        if (!file) return res.status(400).json({ error: 'role은 manager 또는 boss' });
        if (!bapValidName(name) || !bapValidPw(password)) return res.status(400).json({ error: '이름/비밀번호 형식 오류' });
        const cleanName = name.trim();
        const map = (await readData(file)) || {};
        const acc = map[cleanName];
        if (!acc) return res.status(404).json({ error: '가입되지 않은 이름입니다.' });
        if (!verifyPassword(password, acc.pwHash, acc.pwSalt)) {
            return res.status(401).json({ error: '비밀번호가 틀립니다.' });
        }
        const token = generateToken();
        await bapSessionSet(token, { role, school, name: cleanName, createdAt: Date.now() });
        res.json({ token, name: cleanName, role, school });
    } catch (e) {
        console.error('[bap login]', e);
        res.status(500).json({ error: e.message });
    }
});

// 현재 세션 조회
app.get('/api/bap/auth/me', bapAuth, (req, res) => {
    res.json({ name: req.bapSession.name, role: req.bapSession.role, school: req.bapSchool });
});

// 비밀번호 변경
app.post('/api/bap/auth/change-password', bapAuth, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body || {};
        if (!bapValidPw(currentPassword) || !bapValidPw(newPassword)) {
            return res.status(400).json({ error: '비밀번호는 4~128자' });
        }
        const { role, name } = req.bapSession;
        const file = bapRoleKey(role, req.bapSchool);
        const map = (await readData(file)) || {};
        const acc = map[name];
        if (!acc) return res.status(404).json({ error: '계정을 찾을 수 없습니다.' });
        if (!verifyPassword(currentPassword, acc.pwHash, acc.pwSalt)) {
            return res.status(401).json({ error: '현재 비밀번호가 틀립니다.' });
        }
        const { hash, salt } = hashPassword(newPassword);
        acc.pwHash = hash; acc.pwSalt = salt; acc.updatedAt = new Date().toISOString();
        map[name] = acc;
        await writeData(file, map);
        res.json({ ok: true });
    } catch (e) {
        console.error('[bap change-password]', e);
        res.status(500).json({ error: e.message });
    }
});

// 로그아웃
app.post('/api/bap/auth/logout', bapAuth, async (req, res) => {
    await bapSessionDel(req.bapToken);
    res.json({ ok: true });
});

// 계정 삭제 (현재 비번 확인 후)
app.delete('/api/bap/auth/account', bapAuth, async (req, res) => {
    try {
        const { currentPassword } = req.body || {};
        if (!bapValidPw(currentPassword)) return res.status(400).json({ error: '비밀번호 형식 오류' });
        const { role, name } = req.bapSession;
        const file = bapRoleKey(role, req.bapSchool);
        const map = (await readData(file)) || {};
        const acc = map[name];
        if (!acc) return res.status(404).json({ error: '계정을 찾을 수 없습니다.' });
        if (!verifyPassword(currentPassword, acc.pwHash, acc.pwSalt)) {
            return res.status(401).json({ error: '비밀번호가 틀립니다.' });
        }
        delete map[name];
        await writeData(file, map);
        await bapSessionDel(req.bapToken);
        res.json({ ok: true });
    } catch (e) {
        console.error('[bap delete account]', e);
        res.status(500).json({ error: e.message });
    }
});

// ===== Firebase Storage 다운로드 프록시 (CORS 우회) =====
const https = require('https');
app.get('/api/proxy-download', requireAuth, (req, res) => {
    const url = req.query.url;
    console.log('[proxy] 요청 URL:', url);
    if (!url) return res.status(400).json({ error: 'url 파라미터 필요' });
    // Firebase Storage URL만 허용 — URL 파싱으로 정확한 도메인 검증
    let parsedUrl;
    try { parsedUrl = new URL(url); } catch (e) {
        return res.status(400).json({ error: '잘못된 URL 형식입니다.' });
    }
    const allowedHosts = ['firebasestorage.googleapis.com', 'storage.googleapis.com'];
    if (!allowedHosts.includes(parsedUrl.hostname)) {
        return res.status(403).json({ error: '허용되지 않는 URL' });
    }
    https.get(url, (proxyRes) => {
        console.log('[proxy] 응답 상태:', proxyRes.statusCode);
        if (proxyRes.statusCode !== 200) {
            return res.status(proxyRes.statusCode).json({ error: '원본 다운로드 실패: ' + proxyRes.statusCode });
        }
        res.setHeader('Content-Type', proxyRes.headers['content-type'] || 'application/octet-stream');
        if (proxyRes.headers['content-length']) res.setHeader('Content-Length', proxyRes.headers['content-length']);
        proxyRes.pipe(res);
    }).on('error', (e) => {
        console.error('[proxy] 에러:', e.message);
        res.status(500).json({ error: e.message });
    });
});

// ===== 전자서명 공개 서명 페이지 =====
// 문서 데이터 조회 (토큰 기반)
app.get('/api/esign-public/:token', async (req, res) => {
    try {
        const docs = await readData('esign-docs.json') || [];
        const doc = docs.find(d => d.token === req.params.token);
        if (!doc) return res.status(404).json({ error: '문서를 찾을 수 없습니다.' });
        if (doc.status === 'closed') return res.status(410).json({ error: '마감된 문서입니다.' });
        if (doc.deadline && new Date(doc.deadline + 'T23:59:59') < new Date()) return res.status(410).json({ error: '마감 기한이 지났습니다.' });
        // 제출 데이터는 제외하고 문서 구조만 반환
        const { submissions, password, ...publicDoc } = doc;
        res.json(publicDoc);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// 학부모 서명 제출 — 동시 제출 안전 (락으로 read-modify-write 직렬화)
app.post('/api/esign-public/:token/submit', async (req, res) => {
    try {
        await withRedisLock('data:esign-docs', async () => {
            const docs = (await readData('esign-docs.json')) || [];
            const doc = docs.find(d => d.token === req.params.token);
            if (!doc) { const e = new Error('문서를 찾을 수 없습니다.'); e.status = 404; throw e; }
            if (doc.status === 'closed') { const e = new Error('마감된 문서입니다.'); e.status = 410; throw e; }
            if (doc.deadline && new Date(doc.deadline + 'T23:59:59') < new Date()) { const e = new Error('마감 기한이 지났습니다.'); e.status = 410; throw e; }
            if (!doc.submissions) doc.submissions = [];
            const sub = {
                id: 'sub_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
                ...req.body,
                submittedAt: new Date().toISOString()
            };
            doc.submissions.push(sub);
            await writeData('esign-docs.json', docs);
        });
        res.json({ success: true, message: '제출 완료' });
    } catch (e) { res.status(e.status || 500).json({ error: e.message }); }
});

// 공개 서명 페이지 HTML 서빙
app.get('/sign/:token', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'sign.html'));
});

// ===== 교사 배포 문서 공개 API =====
// 문서 데이터 조회 (토큰 기반 - PDF + 필드 구조)
app.get('/api/tdist-public/:token', async (req, res) => {
    try {
        const docs = await readData('tdist-docs.json') || [];
        const doc = docs.find(d => d.token === req.params.token);
        if (!doc) return res.status(404).json({ error: '문서를 찾을 수 없습니다.' });
        if (doc.status === 'closed') return res.status(410).json({ error: '마감된 문서입니다.' });
        if (doc.deadline && new Date(doc.deadline + 'T23:59:59') < new Date()) return res.status(410).json({ error: '마감 기한이 지났습니다.' });
        // 제출 데이터, 비밀번호 제외하고 반환
        const { submissions, password, ...publicDoc } = doc;
        res.json(publicDoc);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// 학부모 문서 제출 — 동시 제출 안전 (락으로 read-modify-write 직렬화)
app.post('/api/tdist-public/:token/submit', async (req, res) => {
    try {
        await withRedisLock('data:tdist-docs', async () => {
            const docs = (await readData('tdist-docs.json')) || [];
            const doc = docs.find(d => d.token === req.params.token);
            if (!doc) { const e = new Error('문서를 찾을 수 없습니다.'); e.status = 404; throw e; }
            if (doc.status === 'closed') { const e = new Error('마감된 문서입니다.'); e.status = 410; throw e; }
            if (doc.deadline && new Date(doc.deadline + 'T23:59:59') < new Date()) { const e = new Error('마감 기한이 지났습니다.'); e.status = 410; throw e; }
            if (!doc.submissions) doc.submissions = [];
            const sub = {
                id: 'sub_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
                ...req.body,
                submittedAt: new Date().toISOString()
            };
            doc.submissions.push(sub);
            await writeData('tdist-docs.json', docs);
        });
        res.json({ success: true, message: '제출 완료' });
    } catch (e) { res.status(e.status || 500).json({ error: e.message }); }
});

// 비밀번호 검증 후 제출 목록 조회
app.post('/api/tdist-subs/:docId', async (req, res) => {
    try {
        const docs = await readData('tdist-docs.json') || [];
        const doc = docs.find(d => d.id === req.params.docId);
        if (!doc) return res.status(404).json({ error: '문서를 찾을 수 없습니다.' });
        if (doc.password && doc.password !== req.body.password) {
            return res.status(403).json({ error: '비밀번호가 올바르지 않습니다.' });
        }
        res.json({ submissions: doc.submissions || [], fields: doc.fields || [], title: doc.title, pdfData: doc.pdfData || null, pdfPages: doc.pdfPages || [] });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// 교사 배포 공개 페이지 HTML 서빙
app.get('/doc/:token', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'doc.html'));
});

// ===== AI 프록시 (Groq API) =====
// 환경변수에 키가 있으면 서버 키 우선 사용, 없으면 클라이언트 키 사용
// Groq API 키 리스트 — 환경변수에서 최대 4개까지 자동 수집
// GROQ_API_KEY (기본) + GROQ_API_KEY_2 + GROQ_API_KEY_3 + GROQ_API_KEY_4
// 한 키가 할당량 초과되면 다음 키로 자동 폴백한다.
function getGroqApiKeys() {
    return [
        process.env.GROQ_API_KEY,
        process.env.GROQ_API_KEY_2,
        process.env.GROQ_API_KEY_3,
        process.env.GROQ_API_KEY_4,
    ].filter(k => typeof k === 'string' && k.trim().length > 0);
}

app.get('/api/ai/status', (req, res) => {
    const keys = getGroqApiKeys();
    res.json({ hasServerKey: keys.length > 0, keyCount: keys.length });
});

// Groq 모델 폴백 순서 — 앞의 모델이 할당량 초과/폐기 시 다음 모델로 자동 전환
// 품질 우선순위: 70B > 8B. 70B 계열이 동일 공급량 기준 먼저 소진되므로 8B로 폴백.
const GROQ_FALLBACK_MODELS = [
    'llama-3.3-70b-versatile',  // 기본 (고품질)
    'llama-3.1-8b-instant',     // 빠르고 할당량 여유
    'llama3-70b-8192',          // 이전 세대 70B
    'llama3-8b-8192'            // 이전 세대 8B (최종 폴백)
];

// 429/할당량/모델 폐기 에러인지 판별
function isGroqQuotaError(status, data) {
    if (status === 429) return true;
    const code = data?.error?.code || '';
    const type = data?.error?.type || '';
    const msg = (data?.error?.message || '').toLowerCase();
    return (
        code === 'rate_limit_exceeded' ||
        code === 'insufficient_quota' ||
        code === 'model_decommissioned' ||
        code === 'model_not_found' ||
        type.includes('tokens_per') ||
        type.includes('requests_per') ||
        msg.includes('rate limit') ||
        msg.includes('quota') ||
        msg.includes('decommissioned')
    );
}

// Groq 호출 + 2단계 폴백
//   1) 같은 키로 모델 순회 (70B → 8B)
//   2) 모든 모델 실패 시 다음 키로 전환하여 다시 1) 수행
// 반환: { ok, status, data }  — data._fallbackModel / _fallbackKeyIndex 포함
async function callGroqWithFallback(body) {
    const keys = getGroqApiKeys();
    if (keys.length === 0) {
        return { ok: false, status: 400, data: { error: 'Groq API 키가 설정되지 않았습니다. Vercel 환경변수 GROQ_API_KEY를 설정하세요.' } };
    }

    const requested = body.model;
    const models = [requested, ...GROQ_FALLBACK_MODELS].filter(
        (m, i, arr) => m && arr.indexOf(m) === i
    );

    let lastStatus = 500;
    let lastData = { error: 'AI 호출 실패' };

    for (let ki = 0; ki < keys.length; ki++) {
        const apiKey = keys[ki];
        let authErrorOnThisKey = false;
        for (const model of models) {
            try {
                const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
                    body: JSON.stringify({ ...body, model })
                });
                const data = await response.json();
                if (response.ok) {
                    if (ki > 0 || model !== requested) {
                        console.log(`[Groq] 폴백 사용: key#${ki + 1}, model=${model}`);
                        data._fallbackModel = model;
                        data._fallbackKeyIndex = ki;
                    }
                    return { ok: true, status: 200, data };
                }
                lastStatus = response.status;
                lastData = data;
                // 인증 오류 → 이 키는 버리고 다음 키로 (잘못된 키나 취소된 키일 수 있음)
                if (response.status === 401 || response.status === 403) {
                    console.warn(`[Groq] key#${ki + 1} 인증 실패(${response.status}) — 다음 키로 전환`);
                    authErrorOnThisKey = true;
                    break;
                }
                // 할당량 외 에러(잘못된 요청 등) → 바로 중단
                if (!isGroqQuotaError(response.status, data)) {
                    return { ok: false, status: response.status, data };
                }
                console.warn(`[Groq] key#${ki + 1}/${model} 할당량 초과 — 다음 모델로`);
            } catch (e) {
                lastData = { error: 'AI API 호출 실패: ' + e.message };
            }
        }
        if (!authErrorOnThisKey) {
            console.warn(`[Groq] key#${ki + 1} 전 모델 소진 — 다음 키로 전환`);
        }
    }
    return { ok: false, status: lastStatus, data: lastData };
}

app.post('/api/ai/chat', requireAuth, async (req, res) => {
    const result = await callGroqWithFallback(req.body);
    res.status(result.status).json(result.data);
});

// ===== AI 프레젠테이션 생성 (PPTX) =====
// 입력: { content, title?, audience? }
// 출력: .pptx 파일 다운로드
// ===== PPTX 생성 파이프라인 (3단계 분리 + 재생성 + 히스토리) =====
const PPTX_HISTORY_FILE = 'pptx-history.json';
const PPTX_HISTORY_MAX = 3;

async function savePptxToHistory(entry) {
    try {
        const list = (await readData(PPTX_HISTORY_FILE)) || [];
        list.unshift(entry);
        while (list.length > PPTX_HISTORY_MAX) list.pop();
        await writeData(PPTX_HISTORY_FILE, list);
    } catch (e) { console.warn('pptx history 저장 실패:', e.message); }
}

function pptxCtxFromBody(body) {
    const { content, title, audience, length, tone, sources, theme, images, webSearch } = body || {};
    const imgArr = Array.isArray(images) ? images : [];
    return {
        content, title, audience, length, tone, sources,
        theme: theme || 'education',
        images: imgArr,           // base64 dataURL 배열
        imageCount: imgArr.length, // Writer 프롬프트가 참고
        webSearch: !!webSearch,
        footer: audience || '',
    };
}

// Step 1: outline 생성 (미리보기용)
app.post('/api/ai/pptx/outline', requireAuth, async (req, res) => {
    try {
        const ctx = pptxCtxFromBody(req.body);
        const { content, sources } = ctx;
        const hasContent = content && content.trim().length >= 5;
        const hasSources = Array.isArray(sources) && sources.some(s => s && s.text);
        if (!hasContent && !hasSources) return res.status(400).json({ error: '내용 또는 참고자료 중 하나는 필요합니다.' });

        // 스타일 레퍼런스: referenceIds 배열로 history 조회
        if (Array.isArray(req.body.referenceIds) && req.body.referenceIds.length > 0) {
            const hist = (await readData(PPTX_HISTORY_FILE)) || [];
            ctx.referenceDecks = hist.filter(h => req.body.referenceIds.includes(h.id));
        }

        const { generateOutlineOnly } = require('./lib/pptx-agent');
        const outline = await generateOutlineOnly(ctx, callGroqWithFallback);
        res.json(outline);
    } catch (e) {
        console.error('pptx outline error:', e.stage || '', e.message);
        const status = e.apiStatus || 500;
        res.status(status).json(e.apiData || { error: e.message });
    }
});

// Step 2: outline → deck 완성 (Writer + Reviewer)
app.post('/api/ai/pptx/build', requireAuth, async (req, res) => {
    try {
        const ctx = pptxCtxFromBody(req.body);
        const outlineRaw = req.body.outline;
        if (!outlineRaw || typeof outlineRaw !== 'object') {
            return res.status(400).json({ error: 'outline 객체가 필요합니다.' });
        }
        const { buildDeckFromOutline, normalizeOutline } = require('./lib/pptx-agent');
        const outline = normalizeOutline(outlineRaw);
        if (outline.outline.length === 0) {
            console.warn('[/api/ai/pptx/build] outline.outline 비어있음. 받은 원본:', JSON.stringify(outlineRaw).slice(0, 400));
            return res.status(400).json({ error: '개요에 슬라이드가 없습니다. 개요 생성을 다시 해주세요.' });
        }
        const deck = await buildDeckFromOutline(ctx, outline, callGroqWithFallback);
        res.json(deck);
    } catch (e) {
        console.error('pptx build error:', e.stage || '', e.message);
        const status = e.apiStatus || 500;
        res.status(status).json(e.apiData || { error: e.message });
    }
});

// Step 2.5: 한 슬라이드만 재생성
app.post('/api/ai/pptx/regen-slide', requireAuth, async (req, res) => {
    try {
        const ctx = pptxCtxFromBody(req.body);
        const { deck, slideIndex, hint } = req.body;
        if (!deck || typeof slideIndex !== 'number') {
            return res.status(400).json({ error: 'deck과 slideIndex가 필요합니다.' });
        }
        const { regenerateSlide } = require('./lib/pptx-agent');
        const updated = await regenerateSlide(ctx, deck, slideIndex, callGroqWithFallback, hint);
        res.json({ slide: updated, slideIndex });
    } catch (e) {
        console.error('pptx regen error:', e.message);
        const status = e.apiStatus || 500;
        res.status(status).json(e.apiData || { error: e.message });
    }
});

// Step 3: deck → PPTX 바이너리 렌더 (+ 히스토리 저장)
app.post('/api/ai/pptx/render', requireAuth, async (req, res) => {
    try {
        const { deck, theme, images } = req.body || {};
        if (!deck || !Array.isArray(deck.slides) || deck.slides.length === 0) {
            return res.status(400).json({ error: 'deck.slides가 비어있습니다.' });
        }
        const { generatePptx, THEMES } = require('./lib/pptx-gen');
        const themeKey = THEMES[theme] ? theme : 'education';
        // 렌더 시 이미지 배열을 deck에 주입 (프론트가 base64로 보냄)
        if (Array.isArray(images) && images.length > 0) deck.images = images;
        const buf = await generatePptx(deck, themeKey);

        // 히스토리 저장 (제목 + outline 요약 + 각 슬라이드 제목)
        const histEntry = {
            id: 'p_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
            createdAt: new Date().toISOString(),
            title: deck.title,
            subtitle: deck.subtitle || '',
            theme: themeKey,
            slides: (deck.slides || []).map(s => ({ title: s.title })),
        };
        savePptxToHistory(histEntry);

        const safeTitle = String(deck.title || 'presentation').replace(/[^가-힣A-Za-z0-9 _-]/g, '_').slice(0, 40);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
        res.setHeader('Content-Disposition',
            `attachment; filename*=UTF-8''${encodeURIComponent(`${safeTitle}.pptx`)}`);
        res.send(buf);
    } catch (e) {
        console.error('pptx render error:', e);
        res.status(500).json({ error: e.message });
    }
});

// 히스토리 조회 (스타일 레퍼런스 선택용)
app.get('/api/ai/pptx/history', requireAuth, async (req, res) => {
    try {
        const list = (await readData(PPTX_HISTORY_FILE)) || [];
        res.json(list);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// 히스토리 전체 삭제
app.delete('/api/ai/pptx/history', requireAuth, async (req, res) => {
    try {
        await writeData(PPTX_HISTORY_FILE, []);
        res.json({ success: true, cleared: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// 테마 목록
app.get('/api/ai/pptx/themes', requireAuth, (req, res) => {
    const { THEMES } = require('./lib/pptx-gen');
    res.json(Object.entries(THEMES).map(([key, v]) => ({
        key, name: v.name, primary: v.primary, accent: v.accent,
    })));
});

// ===== 가정통신문 번역 API (Groq) =====
app.post('/api/translate', requireAuth, async (req, res) => {
    if (getGroqApiKeys().length === 0) return res.status(400).json({ error: 'API 키가 설정되지 않았습니다.' });
    const { blocks, targetLang } = req.body;
    if (!blocks || !blocks.length || !targetLang) return res.status(400).json({ error: 'blocks와 targetLang이 필요합니다.' });

    const langNames = { en:'English', zh:'Chinese (Simplified)', vi:'Vietnamese', km:'Khmer (Cambodian)', ja:'Japanese', ru:'Russian' };
    const langName = langNames[targetLang] || targetLang;

    // 블록 텍스트를 번호 매겨서 하나의 프롬프트로 보냄
    const numbered = blocks.map((b, i) => `[${i}] ${b.text}`).join('\n');
    const systemPrompt = `You are a professional translator for school newsletters (가정통신문/안내장). Translate ALL of the following numbered text blocks from Korean to ${langName}.

CRITICAL RULES:
- You MUST translate EVERY single block. Do NOT skip any block.
- Return ONLY the translations in the exact same numbered format [0], [1], [2], etc.
- Keep the exact same numbering — every input number must appear in your output.
- Do not add any explanation, commentary, or extra text.
- Preserve line breaks within each block.
- If a block contains only numbers, dates, phone numbers, URLs, or proper nouns that don't need translation, return them as-is with their number tag.
- Translate everything including headers, footers, signatures, notes, instructions, checkbox items, etc.
- This is a school document for parents — translate naturally and clearly.`;

    try {
        const result = await callGroqWithFallback({
            model: 'llama-3.3-70b-versatile',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: numbered }
            ],
            temperature: 0.1,
            max_tokens: 8192
        });
        if (!result.ok) return res.status(result.status).json(result.data);
        const data = result.data;

        const content = data.choices?.[0]?.message?.content || '';
        // 번호별로 파싱
        const translations = {};
        const lines = content.split('\n');
        let currentIdx = -1;
        let currentText = '';
        for (const line of lines) {
            const m = line.match(/^\[(\d+)\]\s*(.*)/);
            if (m) {
                if (currentIdx >= 0) translations[currentIdx] = currentText.trim();
                currentIdx = parseInt(m[1]);
                currentText = m[2];
            } else if (currentIdx >= 0) {
                currentText += '\n' + line;
            }
        }
        if (currentIdx >= 0) translations[currentIdx] = currentText.trim();

        const translated = blocks.map((b, i) => ({
            ...b,
            translated: translations[i] || b.text
        }));
        res.json({ translations: translated, fallbackModel: data._fallbackModel });
    } catch (e) {
        res.status(500).json({ error: '번역 API 호출 실패: ' + e.message });
    }
});

// ===== 관리자 전용 API =====
// 세션 목록 조회
app.get('/api/admin/sessions', requireAdmin, (req, res) => {
    const list = [];
    sessions.forEach((session, token) => {
        list.push({
            tokenPrefix: token.slice(0, 8) + '...',
            role: session.role,
            createdAt: new Date(session.createdAt).toISOString(),
            expiresAt: new Date(session.expiresAt).toISOString()
        });
    });
    res.json(list);
});

// 모든 세션 강제 만료 (본인 제외)
app.post('/api/admin/sessions/clear', requireAdmin, (req, res) => {
    const myToken = req.headers['x-auth-token'];
    let cleared = 0;
    sessions.forEach((session, token) => {
        if (token !== myToken) { sessions.delete(token); cleared++; }
    });
    res.json({ success: true, cleared });
});

// 인증 코드 변경 (런타임 — 환경변수에 반영되지 않으므로 재시작 시 초기화)
app.post('/api/admin/change-codes', requireAdmin, async (req, res) => {
    const { accessCode, adminCode } = req.body;
    if (!accessCode && !adminCode) return res.status(400).json({ error: '변경할 코드를 입력해주세요.' });

    const settings = await readData('settings.json') || {};
    if (!settings.auth) settings.auth = {};

    if (accessCode) {
        if (accessCode.length < 4) return res.status(400).json({ error: '접속 코드는 4자 이상이어야 합니다.' });
        const h = hashPassword(accessCode);
        settings.auth.accessHash = h.hash;
        settings.auth.accessSalt = h.salt;
    }
    if (adminCode) {
        if (adminCode.length < 6) return res.status(400).json({ error: '관리자 코드는 6자 이상이어야 합니다.' });
        const h = hashPassword(adminCode);
        settings.auth.adminHash = h.hash;
        settings.auth.adminSalt = h.salt;
    }

    await writeData('settings.json', settings);
    res.json({ success: true, message: '인증 코드가 암호화되어 저장되었습니다.' });
});

// 감사 로그 조회 (최근 활동)
app.get('/api/admin/audit-log', requireAdmin, async (req, res) => {
    const log = await readData('audit-log.json') || [];
    res.json(log.slice(-100)); // 최근 100건
});

// 관리자 페이지 서빙
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// ===== /posting — 공유용 데모 모드 (개인정보 제거, 읽기 전용) =====
// 원리: defaults-posting/ 에 미리 익명화된 JSON을 두고, /api/posting/* 는 그것만 읽음.
// 인증 불필요. 모든 쓰기 요청은 no-op (성공 응답만 반환, 실제 저장 없음).
const POSTING_DIR = path.join(__dirname, 'defaults-posting');
function postingRead(filename) {
    try {
        const p = path.join(POSTING_DIR, filename);
        if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf-8'));
    } catch (e) { /* fall through */ }
    return null;
}
const POSTING_DATA = {
    'links': { file: 'links.json', fallback: [] },
    'categories': { file: 'categories.json', fallback: [] },
    'trainings': { file: 'trainings.json', fallback: [] },
    'staff': { file: 'staff.json', fallback: [] },
    'training-records': { file: 'training-records.json', fallback: {} },
    'sections': { file: 'sections.json', fallback: [] },
    'schedules': { file: 'schedules.json', fallback: [] },
    'tabs': { file: 'tabs.json', fallback: [] },
    'settings': { file: 'settings.json', fallback: {} },
    'news': { file: 'news.json', fallback: [] },
    'collections': { file: 'collections.json', fallback: [] },
    'esign-docs': { file: 'esign-docs.json', fallback: [] },
    'tdist-docs': { file: 'tdist-docs.json', fallback: [] },
    'checklist-posts': { file: 'checklist-posts.json', fallback: [] },
    'checklist-extra-staff': { file: 'checklist-extra-staff.json', fallback: [] },
    'winter-schedule': { file: 'winter-schedule.json', fallback: { config: { startDate: '', endDate: '', holidays: [], setAt: null }, entries: {} } },
    'vibe-progress': { file: 'vibe-progress.json', fallback: [] },
};
Object.entries(POSTING_DATA).forEach(([p, { file, fallback }]) => {
    app.get(`/api/posting/${p}`, (req, res) => {
        const data = postingRead(file);
        res.json(data !== null && data !== undefined ? data : fallback);
    });
});
// 인증 우회 — 데모는 항상 로그인 된 상태로 보이게
app.get('/api/posting/auth/verify', (req, res) => res.json({ valid: true, role: 'user', demo: true }));
app.post('/api/posting/auth/login', (req, res) => res.json({ success: true, token: 'posting-demo', role: 'user', demo: true }));
app.post('/api/posting/auth/logout', (req, res) => res.json({ success: true }));
// 외부 서비스는 비활성화 응답
app.get('/api/posting/firebase-config', (req, res) => res.json({}));
app.get('/api/posting/health', (req, res) => res.json({ server: true, demo: true, timestamp: new Date().toISOString() }));
app.get('/api/posting/ai/status', (req, res) => res.json({ enabled: false, demo: true }));
// 공휴일 조회는 비공개 정보 아님 — 원본과 동일하게 프록시
app.get('/api/posting/winter-schedule/holidays', async (req, res) => {
    try {
        const y = parseInt(req.query.year, 10);
        if (!y) return res.status(400).json({ error: 'year 필요' });
        const r = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${y}/KR`);
        const data = await r.json();
        res.json(Array.isArray(data) ? data.map(d => ({ date: d.date, name: d.localName || d.name })) : []);
    } catch (e) { res.json([]); }
});
// 그 외 /api/posting/* — GET은 빈 응답, 쓰기 (PATCH/POST/DELETE)는 성공만 반환 (no-op)
app.use('/api/posting', (req, res) => {
    if (req.method === 'GET') return res.json({ demo: true });
    res.json({ success: true, demo: true, message: '데모 모드: 변경 사항은 저장되지 않습니다.' });
});
// /posting 및 모든 서브패스 → 메인 SPA (index.html) 서빙. 프론트가 경로 보고 데모 모드 활성화.
app.get(/^\/posting(\/.*)?$/, (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// 메인 페이지
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// 로컬 개발용: app.listen
if (!IS_VERCEL) {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`서버 실행 중: http://localhost:${PORT}`);
        console.log(`Redis 연결: ${HAS_REDIS ? '활성' : '비활성 (파일 모드)'}`);
    });
}

// Vercel용 내보내기
module.exports = app;
