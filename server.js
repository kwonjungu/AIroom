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
    'winter-schedule.json': 'winter-schedule'
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
    { path: 'winter-schedule', file: 'winter-schedule.json', fallback: { config: { startDate: '', endDate: '', holidays: [], setAt: null }, entries: {} } }
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
    app.post(`/api/${p}`, requireAuth, async (req, res) => {
        try { await writeData(file, req.body); res.json({ success: true }); }
        catch (e) { res.status(500).json({ error: '서버 오류가 발생했습니다.' }); }
    });
});

// Training record PATCH (개별 교직원 기록 수정)
app.patch('/api/training-records/:trainingId/:staffId', requireAuth, async (req, res) => {
    try {
        const records = await readData('training-records.json') || {};
        const { trainingId, staffId } = req.params;
        if (!records[trainingId]) records[trainingId] = {};
        records[trainingId][staffId] = req.body;
        await writeData('training-records.json', records);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ===== 방학 근무 (겨울방학 허가원 자동화) =====
const hwpx = require('./lib/hwpx');

// 개별 교직원 항목 저장 (PATCH) — 인증 사용자만, 이름 기반 복구 위해 staffId + name 필요
app.patch('/api/winter-schedule/entries/:staffId', requireAuth, async (req, res) => {
    try {
        const ws = (await readData('winter-schedule.json')) || { config: {}, entries: {} };
        if (!ws.entries) ws.entries = {};
        const { staffId } = req.params;
        ws.entries[staffId] = {
            ...(req.body || {}),
            staffId,
            updatedAt: new Date().toISOString()
        };
        await writeData('winter-schedule.json', ws);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
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

// 학부모 서명 제출
app.post('/api/esign-public/:token/submit', async (req, res) => {
    try {
        const docs = await readData('esign-docs.json') || [];
        const doc = docs.find(d => d.token === req.params.token);
        if (!doc) return res.status(404).json({ error: '문서를 찾을 수 없습니다.' });
        if (doc.status === 'closed') return res.status(410).json({ error: '마감된 문서입니다.' });
        if (doc.deadline && new Date(doc.deadline + 'T23:59:59') < new Date()) return res.status(410).json({ error: '마감 기한이 지났습니다.' });
        if (!doc.submissions) doc.submissions = [];
        const sub = {
            id: 'sub_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
            ...req.body,
            submittedAt: new Date().toISOString()
        };
        doc.submissions.push(sub);
        await writeData('esign-docs.json', docs);
        res.json({ success: true, message: '제출 완료' });
    } catch (e) { res.status(500).json({ error: e.message }); }
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

// 학부모 문서 제출 (JSON body max 10mb - 서명 이미지 포함)
app.post('/api/tdist-public/:token/submit', async (req, res) => {
    try {
        const docs = await readData('tdist-docs.json') || [];
        const doc = docs.find(d => d.token === req.params.token);
        if (!doc) return res.status(404).json({ error: '문서를 찾을 수 없습니다.' });
        if (doc.status === 'closed') return res.status(410).json({ error: '마감된 문서입니다.' });
        if (doc.deadline && new Date(doc.deadline + 'T23:59:59') < new Date()) return res.status(410).json({ error: '마감 기한이 지났습니다.' });
        if (!doc.submissions) doc.submissions = [];
        const sub = {
            id: 'sub_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
            ...req.body,
            submittedAt: new Date().toISOString()
        };
        doc.submissions.push(sub);
        await writeData('tdist-docs.json', docs);
        res.json({ success: true, message: '제출 완료' });
    } catch (e) { res.status(500).json({ error: e.message }); }
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
    const { content, title, audience, length, tone, sources, theme } = body || {};
    return {
        content, title, audience, length, tone, sources,
        theme: theme || 'education',
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
        const { deck, theme } = req.body || {};
        if (!deck || !Array.isArray(deck.slides) || deck.slides.length === 0) {
            return res.status(400).json({ error: 'deck.slides가 비어있습니다.' });
        }
        const { generatePptx, THEMES } = require('./lib/pptx-gen');
        const themeKey = THEMES[theme] ? theme : 'education';
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
