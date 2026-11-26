'use strict';
// 쭘(ZZOOM) 서버 API — DESIGN.md v2 파트 A·C-5·D·E·F·G·H. server.js 가 /api/zzoom 에 붙인다.
// 쓰기는 전부 여기서 검사한 뒤 fb(Firestore·Storage) 에 쓴다. 비밀(코드 해시·참가 자격·원표·장부)은 Redis 에만.
const express = require('express');
const crypto = require('node:crypto');
const U = require('./util');
const { K, LUA, KEEP_SEC, incrEx, remember, readJson, readVoteHash } = require('./keys');
const { runPurge, purgeMeeting, enqueue, removeOldStrokes, removePrefix, MEETINGS } = require('./purge');
const { buildMarkdown } = require('./export-md');
const { AUDIO_TYPES } = require('./whisper');
const { SOURCES, MAX_ORIGINAL_BYTES, okMime, pageCaps } = require('./contract');

const { check, fail, str, isNum, clamp } = U;
const DAY = 86400000;
const TEN_DAYS = 10 * DAY;
const PT_LIFE = 12 * 3600000;
const HOUR = 3600000;
const TOKEN_LIFE = HOUR;                      // 맞춤 토큰 claim until 은 1시간 — 코드가 바뀌면 refresh 가 viewer 로 내린다(지적01)
const UPLOAD_TOKEN_LIFE = 15 * 60000;         // 업로드 전용 출입증(up claim)과 확정 전 허가 자리는 허가 뒤 15분(감사 R3 P3)
const UPLOAD_COMMIT_LIFE = 23 * HOUR;         // commit 은 허가 뒤 23시간까지(정리 작업은 24시간 — 1시간 여유, 지적03)
const CODE_TTL_SEC = 21 * 86400;             // 회의는 길어야 20일(만든 뒤 10일 안에 첫 입장 + 10일)
const KINDS = ['pdf', 'image', 'hwp', 'hwpx', 'pptx'];
const LIMIT = {
    pages: 200, originalBytes: MAX_ORIGINAL_BYTES, px: 2000,   // 쪽·썸네일 크기 상한은 contract.js pageCaps(감사 R3 P6)
    openUploadsPerson: 3, openUploadsMeeting: 60,   // 회의 칸 60 + 발급 총량(감사 R4 Q1·Q2)
    permitsPersonPerHour: 12, permitsHostPerHour: 30, permitsMeetingPerHour: 60,
   
    agenda: 30, chat: 500, pageStrokes: 2000, personPageStrokes: 300, meetingStrokes: 20000, strokeNums: 4500, strokeBatch: 20,
    pollOptions: 6, title: 80, agendaTitle: 100, name: 20,
    personAgenda: 10,          // 한 사람이 올릴 수 있는 안건 수(AGENDA_OPEN)
    // 회의를 끝낸 뒤에도 끝내기 전에 시작한 녹음 조각(at < endedAt)은 이 시간 동안 받는다(D5: 마지막 1분이 사라지지 않게)
    transcribeGraceMs: 2 * 60 * 1000,
    // 녹음을 끈 사람의 마지막 조각을 받는 시간(감사 R3 P1)
    recordingTailMs: 90 * 1000
};
// 상태별 허용표 (DESIGN D-4)
const ALLOW = {
    ready: new Set(['upload', 'agenda', 'board', 'stroke', 'chat', 'state', 'presenter']),
    live: new Set(['upload', 'agenda', 'board', 'stroke', 'chat', 'state', 'presenter', 'live', 'hand', 'poll', 'vote', 'transcribe']),
    ended: new Set()
};
const PAGE_KEY = /^([a-z][a-z0-9]{6,20})_(\d{1,3})$/;
// 판서 색(DESIGN E, perfect-freehand 1.2.3): 형광펜 3색 · 펜 3색
const PALETTE = { hl: ['#FFE14D', '#9BE15D', '#FF8AD8'], pen: ['#E5484D', '#2F6FEB', '#1d1d1f'] };
// 속도 한도(부하 시험 LOAD.md 반영): 학교는 공인 IP 하나를 NAT 로 나눠 쓴다
const RATE = {
    joinIpPerMin: 120,        // 같은 IP 입장(학교 전체)
    joinDevicePerMin: 10,     // 같은 기기(X-Device-Id) 입장
    general: 8,               // 참가 자격당 초당(아래 둘은 빼고)
    live: 10,                 // 진행 /live 초당(화면 120ms 묶음, 2026-11-26)
    chatMeetingPerSec: 15,    // 회의 전체 채팅 초당(감사 R3 P2)
    chatMeetingBurst: 30,     // 회의 전체 채팅 한꺼번에(물통 크기)
    heartbeatPerMin: 6,       // /heartbeat 분당
    strokePerSec: 3,          // 판서 요청(묶음 1개 = 1번) 초당
    presenterEndWindowSec: 2,  // 「발표 마치기」 사람당 2초 1번
    takeWindowSec: 10,        // 참석자 「발표하기」(진행 넘겨받기): 사람당 10초 1번(주관자는 제한 없음)
    agendaAddPerMin: 10       // 참석자 안건 만들기·업로드 허가: 사람당 분당
};

// 비상 스위치: ZZOOM_ENABLED=0 이면 쭘을 끈다(값이 없거나 1 이면 켜짐)
const zzoomEnabled = (env = process.env) => String(env.ZZOOM_ENABLED ?? '1').trim() !== '0';
const DISABLED = { error: 'zzoom_disabled', message: '쭘을 잠시 쉬고 있습니다.' };
const DISABLED_HTML = '<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>쭘</title>'
    + '<style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;font-family:system-ui,sans-serif;background:#f5f5f7;color:#1d1d1f}main{text-align:center;padding:24px}a{color:#2f6feb}</style></head>'
    + '<body><main><h1>쭘을 잠시 쉬고 있습니다.</h1><p>잠시 뒤 다시 들어와 주세요.</p><p><a href="/">백암이로 가기</a></p></main></body></html>';

// Redis 클라이언트 감싸개: 어디서 실패하든 503 redis_down(지적14)
const REDIS_METHODS = ['get', 'set', 'del', 'incr', 'decr', 'expire', 'hset', 'hget', 'hgetall', 'hdel', 'hincrby', 'eval'];
function guardRedis(redis) {
    if (!redis) return redis;
    const g = Object.create(redis);
    for (const m of REDIS_METHODS) {
        if (typeof redis[m] !== 'function') continue;
        g[m] = async (...a) => {
            try { return await redis[m](...a); }
            catch (e) { throw new U.ZzError(503, 'redis_down', '잠시 쭘을 쓸 수 없습니다(저장소 장애).'); }
        };
    }
    return g;
}

// WebP 머리(앞 30바이트)에서 너비·높이 읽기. WebP 가 아니면 null
function webpSize(b) {
    if (!b || b.length < 30) return null;
    if (b.toString('latin1', 0, 4) !== 'RIFF' || b.toString('latin1', 8, 12) !== 'WEBP') return null;
    const kind = b.toString('latin1', 12, 16);
    if (kind === 'VP8X') return { w: 1 + b.readUIntLE(24, 3), h: 1 + b.readUIntLE(27, 3) };
    if (kind === 'VP8 ') return { w: b.readUInt16LE(26) & 0x3fff, h: b.readUInt16LE(28) & 0x3fff };
    if (kind === 'VP8L') {
        const b0 = b[21], b1 = b[22], b2 = b[23], b3 = b[24];
        return { w: 1 + (((b1 & 0x3f) << 8) | b0), h: 1 + (((b3 & 0x0f) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6)) };
    }
    return null;
}

const mpath = mid => `${MEETINGS}/${mid}`;
const sub = (mid, s, id) => `${MEETINGS}/${mid}/${s}${id ? '/' + id : ''}`;
// 시간 순으로 이름이 정렬되는 id
const timeId = (p, ms) => p + Math.floor(ms).toString(36).padStart(9, '0') + U.newId('x').slice(1, 6);

function hashCode(code, salt = crypto.randomBytes(16).toString('hex')) {
    return { hash: crypto.pbkdf2Sync(code, salt, 120000, 32, 'sha256').toString('hex'), salt };
}

function createRouter({ redis: rawRedis, validateSession, fb, groq, now = Date.now, isCopy = req => !!req.isCopy, env = process.env, purgeBudgetMs = 50000, deletePurgeBudgetMs = 20000 }) {
    const router = express.Router();
    const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
    const redis = guardRedis(rawRedis);

    // ① 시연본(/api/copy/zzoom)은 무조건 막는다. 저장소에 닿기 전에.
    router.use((req, res, next) => isCopy(req) ? res.status(403).json({ error: 'copy_blocked', message: '시연용 카피본에서는 쭘을 쓸 수 없습니다.' }) : next());
    router.use((req, res, next) => { res.set('Cache-Control', 'no-store'); res.set('X-Content-Type-Options', 'nosniff'); next(); });
    router.get('/health', (req, res) => res.json({ ok: !!(fb && redis) && zzoomEnabled(env), enabled: zzoomEnabled(env), firebase: !!fb, redis: !!redis }));
    // 비상 스위치. 정리 작업(cron)은 꺼져 있어도 돈다(10일 삭제 약속).
    router.use((req, res, next) => (zzoomEnabled(env) || req.path === '/maintenance/purge') ? next() : res.status(503).json(DISABLED));
    router.use((req, res, next) => (fb && redis) ? next() : res.status(503).json({ error: 'not_configured', message: '쭘 서버 설정(Firebase 서비스 계정·Redis)이 아직 없습니다.' }));
    router.use(express.json({ limit: '1mb' }));
    // 같은 요청 다시 보내기(감사 R7 P5-M1): 학교망에서 응답이 끊겨 화면이 다시 보내도 두 번 반영되지 않게.
    // 화면은 보내기마다 X-Zzoom-Idem 을 붙인다. 처음이면 처리하고 응답을 2분 기억, 같은 표가 또 오면 기억한 응답을 그대로 준다.
    router.use(wrap(async (req, res, next) => {
        const idem = req.get('X-Zzoom-Idem');
        if (req.method === 'GET' || !idem || !/^[A-Za-z0-9_-]{8,48}$/.test(idem)) return next();
        const rk = 'zz:idem:' + U.sha256(idem + '|' + req.method + '|' + req.originalUrl + '|' + (req.get('X-Zzoom-Pt') || req.get('X-Auth-Token') || '')).slice(0, 32);
        // 처리 중 표시는 시각을 같이 적는다. 앞 요청이 죽어 표시만 남으면(Vercel 은 응답 뒤 실행을 얼린다) 일정 시간 뒤 새로 처리한다.
        const staleMs = req.path.includes('/transcribe') ? 70000 : req.method === 'DELETE' ? 40000 : 12000;
        let first;
        try { first = await rawRedis.set(rk, 'p' + now(), { nx: true, ex: 120 }); } catch { return next(); }
        if (!first) {
            let raw = null;
            try { raw = await rawRedis.get(rk); } catch { raw = null; }
            let prev = null;
            if (raw && raw[0] === '{') { try { prev = JSON.parse(raw); } catch { prev = null; } }
            if (prev && prev.s) return res.status(prev.s).json(prev.b);
            const since = raw && raw[0] === 'p' ? Number(raw.slice(1)) : 0;
            if (!(since && now() - since > staleMs)) return res.status(409).json({ error: 'in_progress', message: '앞서 보낸 같은 요청을 처리하는 중입니다.' });
            try { await rawRedis.set(rk, 'p' + now(), { ex: 120 }); } catch { /* 그래도 처리 */ }
        }
        const json = res.json.bind(res);
        let saved = false;
        res.on('finish', () => { if (!saved) Promise.resolve(rawRedis.del(rk)).catch(() => {}); });
        res.json = body => {
            saved = true;
            const st = res.statusCode;
            // 서버가 받아들인 결과만 기억(5xx·429 는 다시 해 볼 수 있게 지운다).
            // 응답을 보내기 **전에** 적는다 — Vercel 은 응답 뒤 남은 일을 얼려서, 뒤에 적으면 '처리 중'만 남았다(운영 실측 2026-11-26).
            const keep = st < 500 && st !== 429;
            Promise.resolve(keep ? rawRedis.set(rk, JSON.stringify({ s: st, b: body }), { ex: 120 }) : rawRedis.del(rk))
                .catch(() => {}).then(() => json(body));
            return res;
        };
        next();
    }));
    router.use((req, res, next) => { if (['POST', 'PATCH'].includes(req.method) && req.is('application/json') && (typeof req.body !== 'object' || Array.isArray(req.body))) return res.status(400).json({ error: 'bad_body', message: 'JSON 객체를 보내세요.' }); next(); });

    // ---- 공통 검사 ----
    // 요청 IP: Vercel 이 붙이는 x-vercel-forwarded-for·x-real-ip 를 먼저, 없으면 X-Forwarded-For 의 **마지막** 값(가장 가까운 프록시가 붙인 값).
    // 맨 앞 값은 브라우저가 마음대로 넣을 수 있어 믿지 않는다(레드팀 RT-5).
    const ipOf = req => {
        const pick = v => String(v || '').split(',').map(x => x.trim()).filter(Boolean);
        const v = pick(req.get('x-vercel-forwarded-for'))[0] || pick(req.get('x-real-ip'))[0];
        const xff = pick(req.get('x-forwarded-for'));
        return String(v || xff[xff.length - 1] || req.socket?.remoteAddress || '').slice(0, 64);
    };
    // 사람 열쇠: **서버가 확인한(login 미들웨어) 백암이 세션 토큰**의 해시. 재입장(새 cid)으로 한도·투표를 우회하지 못하게 한다.
    // 클라이언트가 마음대로 바꾸는 X-Device-Id·이름은 쓰지 않는다(감사 R1 N1: 기기 id·이름만 바꿔 여러 표가 인정됐다).
    // 익명(ANON): 이름은 받지도 저장하지도 않는다. 같은 세션은 몇 번 다시 들어와도 같은 사람.
    const personOf = req => U.sha256('s:' + String(req.get('X-Auth-Token') || '')).slice(0, 24);
    async function session(req) { return validateSession(req.get('X-Auth-Token')); }
    const login = wrap(async (req, res, next) => { const s = await session(req); check(s, 401, 'login_required', '백암이에서 먼저 로그인하세요.'); req.sess = s; next(); });
    const admin = wrap(async (req, res, next) => { const s = await session(req); check(s, 401, 'login_required', '백암이에서 먼저 로그인하세요.'); check(s.role === 'admin', 403, 'admin_only', '관리자만 할 수 있습니다.'); req.sess = s; next(); });
    const gone = m => m.status === 'deleting' || now() >= m.expiresAt;
    // 회의 만들기는 로그인한 교직원 누구나(사용자 결정 2026-11-25). 수정·삭제·잠금 풀기는 관리자 또는 만든 사람.
    // 만든 사람 = 같은 로그인 세션(토큰)만(감사 R3 P4). 기기 id 는 브라우저 저장값이라 공용 PC 의 다른 교사도 같은 값을 쓴다 — 인정하지 않는다.
    // 다시 로그인한 사람은 회의 주관 코드로 주관자가 되고, 회의 고치기·지우기는 관리자에게 부탁한다. 옛 회의에 남은 기기 열쇠('d:')는 이제 맞지 않는다.
    const ownerKeys = req => {
        const tok = String(req.get('X-Auth-Token') || '');
        return tok ? [U.sha256('t:' + tok).slice(0, 24)] : [];
    };
    const canManage = (req, m) => req.sess.role === 'admin' || (!!m && Array.isArray(m.creator) && ownerKeys(req).some(k => m.creator.includes(k)));
    const manager = m => check(m, 403, 'manager_only', '회의를 만든 사람이나 관리자만 할 수 있습니다.');
    async function loadMeeting(mid) { const m = await fb.get(mpath(mid)); check(m, 404, 'not_found', '회의가 없습니다.'); return m; }
    function allow(m, action) { check(ALLOW[m.status]?.has(action), 409, 'state_' + m.status, `지금 회의 상태(${m.status})에서는 할 수 없습니다.`); }
    async function rate(id, bucket, max, windowSec = 1) {
        const w = Math.floor(now() / (windowSec * 1000));
        let n;
        try { n = await incrEx(redis, K.rl(id, bucket, w), windowSec + 1); }
        catch { fail(503, 'redis_down', '잠시 쭘을 쓸 수 없습니다(저장소 장애).'); }
        check(n <= max, 429, 'rate_limited', '요청이 너무 잦습니다. 잠시 뒤에 다시 하세요.');
    }
    router.param('mid', (req, res, next, mid) => U.MID_RE.test(mid) ? next() : res.status(404).json({ error: 'not_found', message: '회의가 없습니다.' }));

    // 참가 자격(X-Zzoom-Pt) 확인. host:true 면 주관자만. 코드로 받은 host 는 코드가 바뀌면(grantVer) 곧바로 viewer 취급.
    function pt({ host = false, bodyPt = false, bucket = 'all', max = RATE.general, windowSec = 1 } = {}) {
        return wrap(async (req, res, next) => {
            const raw = req.get('X-Zzoom-Pt') || (bodyPt && typeof req.body?.pt === 'string' ? req.body.pt : '');
            check(raw && raw.length <= 100, 401, 'pt_required', '참가 자격이 없습니다. 다시 입장하세요.');
            const h = U.sha256(raw);
            const g = await readJson(redis, K.pt(h));
            check(g, 401, 'pt_invalid', '참가 자격이 없거나 만료됐습니다. 다시 입장하세요.');
            check(g.mid === req.params.mid, 403, 'pt_other_meeting', '다른 회의의 참가 자격입니다.');
            check(g.exp > now(), 401, 'pt_expired', '참가 자격이 만료됐습니다. 다시 입장하세요.');
            const m = await loadMeeting(req.params.mid);
            check(!gone(m), 410, 'meeting_gone', '삭제됐거나 기한(10일)이 지난 회의입니다.');
            let role = g.role;
            if (role === 'host' && g.via === 'code') {
                const c = await readJson(redis, K.code(g.mid));
                if (!c || c.grantVer !== g.grantVer) role = 'viewer';
            }
            // 관리자로 받은 host 는 그 백암이 관리자 세션이 끝나면 곧바로 viewer 취급(감사 N9)
            if (role === 'host' && g.via === 'admin' && !(Number(g.adminUntil) > now())) role = 'viewer';
            if (role === 'host' && g.via === 'creator' && g.adminUntil != null && !(Number(g.adminUntil) > now())) role = 'viewer';
            // 관리자가 로그아웃(세션 삭제)했으면 남은 탭의 주관 동작도 끝낸다(감사 R2 M4). 입장 때 그 세션 토큰을 pt 기록에 두고 다시 확인한다.
            // (세션 토큰은 이미 같은 Redis 의 session:<토큰> 열쇠에 있으므로 새로 드러나는 값은 아니다. 관리자 host 에만 둔다.)
            if (role === 'host' && g.via === 'admin' && g.stok) {
                const s = await validateSession(g.stok).catch(() => null);
                if (!s || s.role !== 'admin') role = 'viewer';
            }
            // 만든 사람으로 받은 host(화면 결정 2026-11-26)도 그 로그인 세션이 끝나면 viewer 취급
            if (role === 'host' && g.via === 'creator') {
                const s = g.stok ? await validateSession(g.stok).catch(() => null) : null;
                if (!s) role = 'viewer';
            }
            if (host) {
                check(g.role === 'host', 403, 'host_only', '주관자만 할 수 있습니다.');
                check(role === 'host', 403, 'host_revoked', g.via === 'admin' || g.via === 'creator' ? '로그인이 끝났습니다. 다시 로그인하거나 주관 코드를 넣으세요.' : '주관 코드가 바뀌었습니다. 주관 코드를 다시 넣으세요.');
            }
            await rate(h.slice(0, 24), bucket, max, windowSec);
            req.g = { ...g, role, h }; req.m = m; req.mid = req.params.mid;
            next();
        });
    }
    const presenterOnly = (req, res, next) => { check(req.m.presenter?.cid === req.g.cid, 403, 'not_presenter', '진행자만 할 수 있습니다.'); next(); };
    // 안건 주인(AGENDA_OPEN): 익명이라 이름은 싣지 않고 cid 와 사람 열쇠 해시만 둔다. 다시 들어온 같은 사람(같은 백암이 로그인 세션)도 주인.
    // 해시에 회의 id 를 섞어 두 회의의 안건을 같은 사람으로 잇지 못하게 한다(감사 R2 M6). 이전 형식(회의 id 없음) 문서도 주인으로 알아본다.
    const ownHash = g => U.sha256('own:' + g.mid + ':' + (g.person || g.cid)).slice(0, 24);
    const ownHashOld = g => U.sha256('own:' + (g.person || g.cid)).slice(0, 24);
    const isOwner = (a, g) => !!a && (a.ownerCid === g.cid || (!!a.ownerHash && (a.ownerHash === ownHash(g) || a.ownerHash === ownHashOld(g))));
    const canEditAgenda = (a, g) => g.role === 'host' || isOwner(a, g);
    const editOnly = (a, g) => check(canEditAgenda(a, g), 403, 'not_agenda_owner', '내가 올린 안건만 고칠 수 있어요.');
    // 이 사람이 이 회의에 올린 안건 수(트랜잭션 안에서, 안건은 30개 이하라 하나씩 읽는다)
    async function ownedCount(tx, mid, m, g) {
        let n = 0;
        for (const id of m.agendaOrder || []) { const a = await tx.get(sub(mid, 'agenda', id)); if (isOwner(a, g)) n++; }
        return n;
    }
    const personFull = () => fail(409, 'agenda_person_full', `한 사람이 안건을 ${LIMIT.personAgenda}개까지 올릴 수 있어요.`);

    // Firebase 맞춤 토큰 claim. until = min(회의 만료, 지금+1시간) — 규칙은 until 만 보므로, 주관 코드가 바뀌거나 회의가 지워지면
    // 늦어도 1시간 안에 옛 권한이 끝난다. 화면은 50분마다 /refresh 로 다시 받는다(그때 서버가 현재 권한을 다시 확인).
    // Storage 쓰기는 이 토큰으로는 안 되고, 업로드 허가마다 따로 주는 up claim 토큰으로만 된다(지적01·02).
    // adminUntil: 관리자로 받은 host 면 그 관리자 세션 만료 시각 — 토큰 until 도 그 시각을 넘지 않는다(감사 N9)
    function claimsFor(mid, m, role, extra = {}, adminUntil = null) {
        const cap = role === 'host' && Number.isFinite(adminUntil) ? adminUntil : Infinity;
        return { zz: 1, mid, role: role === 'host' ? 'host' : 'viewer', until: Math.min(m.expiresAt, now() + TOKEN_LIFE, cap), ...extra };
    }
    async function issue(mid, m, { cid, role, via, grantVer, person, sess, at, adminUntil, stok }) {
        const p = U.rand(32);
        const exp = Math.min(now() + PT_LIFE, m.expiresAt);
        // 만든 사람 host 도 그 로그인 세션 만료(있으면)로 자른다(감사 R4 Q5)
        const au = via === 'admin' ? (Number.isFinite(adminUntil) ? adminUntil : now()) : via === 'creator' && Number.isFinite(adminUntil) ? adminUntil : null;
        // person: 사람 열쇠(백암이 로그인 세션 토큰 해시 — 기기 id·이름은 쓰지 않는다), sess: 백암이 로그인 세션 열쇠, at: 입장 시각 — 재입장 도배를 묶는 데 쓴다(레드팀 RT-3·4). 이름은 없다(ANON).
        await redis.set(K.pt(U.sha256(p)), JSON.stringify({ mid, cid, role, via, grantVer, exp, person, sess, at: at || now(), ...(au !== null ? { adminUntil: au } : {}), ...((via === 'admin' || via === 'creator') && stok ? { stok } : {}) }), { ex: Math.max(1, Math.ceil((exp - now()) / 1000)) });
        const claims = claimsFor(mid, m, role, {}, au);
        const token = await fb.createCustomToken('zz_' + cid, claims);
        return { pt: p, cid, role, exp, until: m.expiresAt, tokenUntil: claims.until, token };
    }
    // 회의가 살아 있고 그 상태에서 action 이 허용될 때만 fn 의 쓰기를 같은 트랜잭션으로 한다(지적04).
    // 삭제는 먼저 status 'deleting' 을 쓰므로, 겹친 쓰기는 트랜잭션 충돌로 다시 읽어 거절된다. fn(tx, m) 은 tx.get 을 먼저, 쓰기를 나중에.
    function guarded(mid, action, fn) {
        return fb.runTransaction(async tx => {
            const m = await tx.get(mpath(mid));
            check(m && !gone(m), 410, 'meeting_gone', '삭제됐거나 기한(10일)이 지난 회의입니다.');
            if (action) allow(m, action);
            return fn(tx, m);
        });
    }
    const view = (id, m) => ({
        id, title: m.title, startsAt: m.startsAt, status: m.status, createdAt: m.createdAt, firstKeyAt: m.firstKeyAt || null, expiresAt: m.expiresAt,
        allowRecording: m.allowRecording !== false, agendaOrder: m.agendaOrder || [], live: m.live || null, presenter: m.presenter || null,
        penLock: !!m.penLock, pollId: m.pollId || null, recording: !!m.recording, counts: m.counts || null
    });
    const summary = (id, m) => ({
        id, title: m.title, startsAt: m.startsAt, status: gone(m) ? 'deleting' : m.status, agendaCount: (m.agendaOrder || []).length,
        expiresAt: m.expiresAt, daysLeft: Math.max(0, Math.ceil((m.expiresAt - now()) / DAY)), allowRecording: m.allowRecording !== false
    });
    function parseStartsAt(v) {
        const t = typeof v === 'number' ? v : Date.parse(String(v || ''));
        check(Number.isFinite(t) && t > 0, 400, 'bad_startsAt', '회의 일시가 올바르지 않습니다.');
        return t;
    }
    async function listAll(coll, max = 5000) {
        const out = []; let next;
        do { const r = await fb.list(coll, { pageSize: 300, pageToken: next }); out.push(...r.docs); next = r.next; } while (next && out.length < max);
        return out;
    }
    async function closePoll(mid, pid) {
        await redis.hset(K.vote(mid, pid), { '#status': 'closed' });
        await redis.expire(K.vote(mid, pid), KEEP_SEC);   // 삭제와 겹쳐 다시 만들어져도 영구히 남지 않게(감사 R2 N3)
        return fb.runTransaction(async tx => {
            const p = await tx.get(sub(mid, 'polls', pid));
            if (p && p.status === 'open') tx.update(sub(mid, 'polls', pid), { status: 'closed', closedAt: now() });
            return p;
        });
    }

    // ================= 정리 작업 (cron) =================
    router.all('/maintenance/purge', wrap(async (req, res) => {
        check(['GET', 'POST'].includes(req.method), 405, 'method', 'GET 또는 POST');
        const secret = env.CRON_SECRET || '';
        check(secret, 503, 'no_cron_secret', 'CRON_SECRET 이 설정되지 않았습니다.');
        const given = (req.get('Authorization') || '').replace(/^Bearer /, '');
        check(U.safeEqual(given, secret), 401, 'bad_cron_secret', '예약 작업 인증 실패');
        res.json(await runPurge({ fb, redis, now }, { budgetMs: purgeBudgetMs }));
    }));

    // ================= 회의 목록·만들기 (백암이 세션) =================
    router.get('/meetings', login, wrap(async (req, res) => {
        const isAdmin = req.sess.role === 'admin';
        const docs = await listAll(MEETINGS, 1000);
        const out = [];
        for (const d of docs) {
            const m = d.data;
            if (gone(m)) {
                // 관리자가 목록을 열 때 기한 지난 회의를 정리 대기열에 넣는다(H-1)
                if (isAdmin) { if (m.status !== 'deleting') await fb.update(mpath(d.id), { status: 'deleting' }); await enqueue(redis, d.id, now()); out.push(summary(d.id, m)); }
                continue;
            }
            const s = summary(d.id, m);
            s.mine = canManage(req, m);
            if (s.mine) s.hostLocked = Number(await redis.get(K.tryAll(d.id)) || 0) >= 50 || Number(await redis.get(K.tryLife(d.id)) || 0) >= 200;
            out.push(s);
        }
        out.sort((a, b) => b.startsAt - a.startsAt);
        res.json({ meetings: out, isAdmin, canCreate: true });
    }));
    router.post('/meetings', login, wrap(async (req, res) => {
        const b = req.body || {};
        const title = str(b.title, LIMIT.title);
        check(title, 400, 'bad_title', '회의 제목을 넣으세요.');
        // 누구나 만들 수 있으니 남용 상한(감사 N2): 세션당 10분 5개, IP당 1시간 30개, 살아 있는 회의 100개
        if (req.sess.role !== 'admin') {
            await rate('s' + U.sha256('t:' + String(req.get('X-Auth-Token') || '')).slice(0, 16), 'mkmeet', 5, 600);
            await rate('ip' + U.sha256(ipOf(req)).slice(0, 16), 'mkmeet', 30, 3600);
        }
        // 살아 있는 회의 100개 상한은 교직원에게만(관리자는 지우고 다시 만들 필요 없이 만든다, 감사 R2 M5)
        const alive = req.sess.role === 'admin' ? 0 : (await listAll(MEETINGS, 1000)).filter(d => !gone(d.data)).length;
        check(alive < 100, 429, 'too_many_meetings', '열려 있는 회의가 너무 많습니다. 끝난 회의를 지운 뒤 다시 만드세요.');
        const startsAt = parseStartsAt(b.startsAt);
        check(/^\d{6}$/.test(String(b.hostCode || '')), 400, 'bad_code', '주관 코드는 숫자 6자리입니다.');
        const mid = U.newMid(), t = now();
        await redis.set(K.code(mid), JSON.stringify({ ...hashCode(String(b.hostCode)), grantVer: 1 }), { ex: CODE_TTL_SEC });
        const m = {
            title, startsAt, status: 'ready', createdAt: t, firstKeyAt: null, expiresAt: t + TEN_DAYS, startedAt: null, endedAt: null,
            allowRecording: b.allowRecording !== false, agendaOrder: [], boardCount: 0, live: null, presenter: null, penLock: false,
            pollId: null, recording: false, counts: { people: 0, hands: 0, peak: 0, at: 0 }, creator: ownerKeys(req)
        };
        await fb.set(mpath(mid), m);
        res.status(201).json({ meeting: { ...summary(mid, m), mine: true } });
    }));
    router.patch('/meetings/:mid', login, wrap(async (req, res) => {
        const mid = req.params.mid, b = req.body || {};
        const m = await loadMeeting(mid);
        manager(canManage(req, m));
        check(!gone(m), 410, 'meeting_gone', '삭제됐거나 기한이 지난 회의입니다.');
        const patch = {};
        if (b.title !== undefined) { patch.title = str(b.title, LIMIT.title); check(patch.title, 400, 'bad_title', '회의 제목을 넣으세요.'); }
        if (b.startsAt !== undefined) patch.startsAt = parseStartsAt(b.startsAt);
        if (b.allowRecording !== undefined) patch.allowRecording = !!b.allowRecording;
        if (b.hostCode !== undefined) {
            check(/^\d{6}$/.test(String(b.hostCode)), 400, 'bad_code', '주관 코드는 숫자 6자리입니다.');
            const old = await readJson(redis, K.code(mid));
            // grantVer 를 올리면 옛 코드로 받은 host 자격은 다음 쓰기부터 거절된다(A-3)
            await redis.set(K.code(mid), JSON.stringify({ ...hashCode(String(b.hostCode)), grantVer: (old?.grantVer || 0) + 1 }), { ex: CODE_TTL_SEC });
        }
        if (Object.keys(patch).length) await fb.update(mpath(mid), patch);
        res.json({ meeting: summary(mid, { ...m, ...patch }), codeChanged: b.hostCode !== undefined });
    }));
    router.delete('/meetings/:mid', login, wrap(async (req, res) => {
        const mid = req.params.mid;
        const m = await fb.get(mpath(mid));
        const queued = Object.keys((await redis.hgetall(K.purge)) || {}).includes(mid);
        check(m || queued, 404, 'not_found', '회의가 없습니다.');
        // 회의 지우기는 로그인한 사람 누구나(사용자 결정 2026-11-26: 「이미 만들어진 것도 누구나 지울 수 있게」). 화면은 확인 창을 거친다.
        // 한꺼번에 지우는 사고를 막으려 사람당 10분에 10개까지.
        await rate('del:' + personOf(req), 'meetingDelete', 10, 600);
        // 다시 로그인하면 세션 상한이 풀리므로(감사 R7 P2-3) 접속지와 전체 상한도 둔다. 학교는 한 접속지를 같이 쓰므로 조금 넉넉히.
        await rate('ip' + U.sha256(ipOf(req)).slice(0, 16), 'meetingDeleteIp', 20, 600);
        await rate('all', 'meetingDeleteAll', 40, 600);
        if (m && m.status !== 'deleting') await fb.update(mpath(mid), { status: 'deleting' });
        await enqueue(redis, mid, now());
        const done = await purgeMeeting({ fb, redis, now }, mid, now() + deletePurgeBudgetMs);
        res.json({ deleted: done, queued: !done });
    }));
    router.post('/meetings/:mid/unlock', login, wrap(async (req, res) => {
        const mid = req.params.mid;
        manager(canManage(req, await loadMeeting(mid)));
        const idx = Object.keys((await redis.hgetall(K.keys(mid))) || {}).filter(k => k.startsWith(`zz:try:${mid}:`));
        await redis.del(K.tryAll(mid), K.tryLife(mid), ...idx);
        res.json({ ok: true });
    }));

    // ================= 입장·주관·재발급 =================
    router.post('/:mid/join', login, wrap(async (req, res) => {
        const mid = req.params.mid;
        await rate('ip' + U.sha256(ipOf(req)).slice(0, 16), 'join', RATE.joinIpPerMin, 60);
        const dev = String(req.get('X-Device-Id') || '').slice(0, 100);
        if (dev) await rate('dv' + U.sha256(dev).slice(0, 16), 'join', RATE.joinDevicePerMin, 60);
        // 익명(ANON): body.name 이 와도 버린다
        let m = await loadMeeting(mid);
        check(!gone(m), 410, 'meeting_gone', '삭제됐거나 기한(10일)이 지난 회의입니다.');
        if (!m.firstKeyAt) {
            // 첫 발급 시각 + 10일 = 만료(A-4). 동시에 여러 명이 들어와도 한 번만 정한다.
            m = await fb.runTransaction(async tx => {
                const cur = await tx.get(mpath(mid));
                check(cur && !gone(cur), 410, 'meeting_gone', '삭제됐거나 기한이 지난 회의입니다.');
                if (cur.firstKeyAt) return cur;
                const t = now();
                const patch = { firstKeyAt: t, expiresAt: t + TEN_DAYS };
                tx.update(mpath(mid), patch);
                return { ...cur, ...patch };
            });
        }
        const isAdmin = req.sess.role === 'admin';
        // 회의를 만든 사람(같은 로그인 세션, 기기 id 는 보지 않음)은 주관 코드 없이 주관자로 들어온다(화면 결정 2026-11-26)
        const isCreator = !isAdmin && canManage(req, m);
        const cid = U.newId('c');
        // 관리자 host 는 그 관리자 세션 만료까지만(세션에 만료가 없으면 자격 수명 12시간)
        const adminUntil = isAdmin ? (Number.isFinite(Number(req.sess.expiresAt)) ? Number(req.sess.expiresAt) : now() + PT_LIFE) : null;
        const creatorUntil = isCreator && Number.isFinite(Number(req.sess.expiresAt)) ? Number(req.sess.expiresAt) : null;
        const out = await issue(mid, m, { cid, role: isAdmin || isCreator ? 'host' : 'viewer', via: isAdmin ? 'admin' : isCreator ? 'creator' : null, grantVer: null, person: personOf(req), sess: U.sha256(String(req.get('X-Auth-Token') || '')).slice(0, 24), adminUntil: isCreator ? creatorUntil : adminUntil, stok: isAdmin || isCreator ? String(req.get('X-Auth-Token') || '') : null });
        await guarded(mid, null, tx => tx.set(sub(mid, 'people', cid), { role: out.role, seenAt: now() }));
        res.json({ ...out, meeting: view(mid, m) });
    }));
    router.post('/:mid/host', pt(), wrap(async (req, res) => {
        const { mid, g, m } = req;
        if (g.role === 'host') { await redis.del(K.pt(g.h)); const { h: _h, name: _n, ...gg } = g; return res.json({ ...(await issue(mid, m, gg)), meeting: view(mid, m) }); }
        const code = String(req.body?.code ?? '');
        const ipKey = K.tryIp(mid, U.sha256(ipOf(req)).slice(0, 16)), cidKey = K.tryCid(mid, g.person || g.cid);
        // 먼저 세고(INCR 원자) 나중에 확인한다 — 동시에 여러 번 보내도 한도를 넘지 못한다. 맞으면 되돌린다.
        // 회의 전체: 15분에 50번이면 그 15분 동안 잠금(임시), 회의 평생 200번이면 관리자가 풀 때까지 잠금. 사람: 10분 5번. IP: 1시간 20번.
        const ttlLife = Math.ceil((m.expiresAt - now()) / 1000) + 86400;
        let nAll, nLife, nIp, nMe;
        try {
            [nAll, nLife, nIp, nMe] = await Promise.all([incrEx(redis, K.tryAll(mid), 900), incrEx(redis, K.tryLife(mid), ttlLife), incrEx(redis, ipKey, 3600), incrEx(redis, cidKey, 600)]);
            await remember(redis, mid, ipKey, cidKey);
        } catch { fail(503, 'redis_down', '잠시 주관 입장을 할 수 없습니다.'); }
        const undo = () => Promise.all([redis.decr(K.tryAll(mid)), redis.decr(K.tryLife(mid))]).catch(() => {});
        if (nLife > 200) { await undo(); fail(423, 'host_locked', '주관 코드를 너무 많이 틀려 주관 입장이 잠겼습니다. 관리자에게 풀어 달라고 하세요.'); }
        // 15분 임시 잠금 중이라도, 이 창에서 처음 시도하는 사람·IP(틀린 적 없음)는 한 번 확인한다(레드팀 RT-2: 잠금 DoS).
        // 틀린 적 있는 사람·IP 는 423. 이렇게 해도 회의 전체 대입 횟수는 평생 200번(성공 확률 0.02%)을 넘지 못한다.
        const clean = nIp === 1 && nMe === 1;
        if (nAll > 50 && !clean) { await undo(); fail(423, 'host_locked', '주관 코드가 여러 번 틀려 15분 동안 주관 입장이 잠겼습니다. 관리자는 바로 들어갈 수 있습니다.'); }
        if (!(nIp <= 20 && nMe <= 5)) {
            // 코드를 확인하지도 않은 요청은 회의 전체 시도 수에 남기지 않는다(감사 사소)
            await undo();
            fail(429, 'too_many_attempts', '주관 코드를 너무 많이 틀렸습니다. 잠시 뒤(10분)에 다시 하세요.');
        }
        const rec = await readJson(redis, K.code(mid));
        check(rec, 503, 'no_code', '주관 코드가 설정돼 있지 않습니다.');
        const good = /^\d{6}$/.test(code) && U.safeEqual(hashCode(code, rec.salt).hash, rec.hash);
        if (!good) fail(403, 'wrong_code', '주관 코드가 맞지 않습니다.', { left: Math.max(0, Math.min(50 - nAll, 20 - nIp, 5 - nMe)) });
        await Promise.all([redis.decr(K.tryAll(mid)), redis.decr(K.tryLife(mid)), redis.decr(ipKey), redis.decr(cidKey)]);
        await redis.del(K.pt(g.h));
        const out = await issue(mid, m, { cid: g.cid, role: 'host', via: 'code', grantVer: rec.grantVer, person: g.person, sess: g.sess, at: g.at });
        await guarded(mid, null, async tx => {
            const cur = await tx.get(sub(mid, 'people', g.cid));
            const { name: _n, ...keep } = cur || { seenAt: now() };   // 옛 문서의 이름은 버린다(ANON)
            tx.set(sub(mid, 'people', g.cid), { ...keep, role: 'host' });
        });
        res.json({ ...out, meeting: view(mid, m) });
    }));
    // 맞춤 토큰만 다시 받는다(재연결). 코드가 바뀐 host 는 viewer 로 내려간다.
    router.post('/:mid/refresh', pt(), wrap(async (req, res) => {
        const { mid, g, m } = req;
        const save = rec => { const { h, name: _n, ...rest } = g; return redis.set(K.pt(h), JSON.stringify({ ...rest, ...rec }), { ex: Math.max(1, Math.ceil((g.exp - now()) / 1000)) }); };
        let adminUntil = null;
        if (g.via === 'admin' && g.role === 'host') {
            // 감사 N9: 관리자 host 는 refresh 때 그 백암이 관리자 세션이 아직 살아 있는지 다시 본다(같은 세션이어야 함)
            const tok = String(req.get('X-Auth-Token') || '');
            const s = tok && U.sha256(tok).slice(0, 24) === g.sess ? await session(req) : null;
            if (s && s.role === 'admin') {
                adminUntil = Number.isFinite(Number(s.expiresAt)) ? Number(s.expiresAt) : now() + PT_LIFE;
                if (adminUntil !== g.adminUntil) await save({ adminUntil });
            } else g.role = 'viewer';
        }
        if (g.via === 'creator' && g.role === 'host') {
            const tok = String(req.get('X-Auth-Token') || '');
            const s = tok && U.sha256(tok).slice(0, 24) === g.sess ? await session(req) : null;
            if (!s || !canManage({ ...req, sess: s, get: k => req.get(k) }, m) || (Number.isFinite(Number(s.expiresAt)) && Number(s.expiresAt) <= now())) g.role = 'viewer';
            else if (Number.isFinite(Number(s.expiresAt))) { adminUntil = Number(s.expiresAt); if (adminUntil !== g.adminUntil) await save({ adminUntil }); }
        }
        if (g.role !== 'host' && (g.via === 'code' || g.via === 'admin' || g.via === 'creator')) {
            await save({ role: 'viewer', via: null, grantVer: null, adminUntil: null, stok: null });
            await guarded(mid, null, async tx => { const cur = await tx.get(sub(mid, 'people', g.cid)); if (cur) tx.set(sub(mid, 'people', g.cid), { ...cur, role: 'viewer' }); });
        }
        const token = await fb.createCustomToken('zz_' + g.cid, claimsFor(mid, m, g.role, {}, adminUntil));
        res.json({ token, role: g.role, cid: g.cid, exp: g.exp, until: m.expiresAt, meeting: view(mid, m) });
    }));

    // ================= 회의 상태·진행 =================
    router.post('/:mid/state', pt({ host: true }), wrap(async (req, res) => {
        const { mid, g } = req, action = req.body?.action;
        if (action === 'end' && req.m.status === 'ended') {
            // 되풀이 끝내기 = 뒷정리 다시 하기(앞선 끝내기에서 Redis 마감이 실패했을 수 있다)
            if (req.m.pollId) await closePoll(mid, req.m.pollId);
            return res.json({ meeting: view(mid, req.m), repaired: true });
        }
        allow(req.m, 'state');
        const out = await fb.runTransaction(async tx => {
            const m = await tx.get(mpath(mid));
            check(m && !gone(m), 410, 'meeting_gone', '삭제됐거나 기한이 지난 회의입니다.');
            allow(m, 'state');
            const poll = action === 'end' && m.pollId ? await tx.get(sub(mid, 'polls', m.pollId)) : null;
            const t = now(); let patch;
            if (action === 'start') {
                check(m.status === 'ready', 409, 'state_' + m.status, '이미 시작한 회의입니다.');
                const epoch = (m.presenter?.epoch || 0) + 1;
                const presenter = m.presenter?.cid ? { cid: m.presenter.cid, epoch: m.presenter.epoch } : { cid: g.cid, epoch };   // 익명: 발표자 이름은 싣지 않는다
                const ep = presenter.epoch;
                patch = { status: 'live', startedAt: t, presenter, live: { aid: (m.agendaOrder || [])[0] || null, page: 1, view: { cx: 0.5, cy: 0.5, z: 1 }, rev: 1, epoch: ep, forceSeq: 0, at: t } };
            } else if (action === 'end') {
                patch = { status: 'ended', endedAt: t, recording: false, recordingBy: null, ...(m.recording ? { recordingOffAt: t, recordingOffBy: m.recordingBy || null, recordingOffPerson: m.recordingPerson || null } : {}) };
                if (poll && poll.status === 'open') tx.update(sub(mid, 'polls', m.pollId), { status: 'closed', closedAt: t });
            } else if (action === 'penLock') {
                patch = { penLock: !!req.body.value };
            } else if (action === 'recording') {
                check(m.status === 'live', 409, 'state_' + m.status, '회의 중에만 녹음할 수 있습니다.');
                check(m.allowRecording !== false, 403, 'recording_off', '이 회의는 녹음을 허용하지 않았습니다.');
                // recordingBy: 녹음을 켠 cid — 그 사람이 나가거나 90초 넘게 끊기면 heartbeat 가 녹음을 내린다(D5)
                // 끌 때는 끈 시각과 켜 두었던 사람을 남긴다 — 그 사람의 마지막 조각은 90초 동안 받는다(감사 R3 P1)
                // recordingPerson: 켠 사람의 사람 열쇠(같은 로그인 세션) — 새로 고침해 cid 가 바뀌어도 이어 받는다(감사 R4 Q6)
                patch = req.body.value ? { recording: true, recordingBy: g.cid, recordingPerson: g.person || null, recordingOffAt: null, recordingOffBy: null, recordingOffPerson: null }
                    : { recording: false, recordingBy: null, recordingPerson: null, ...(m.recording ? { recordingOffAt: t, recordingOffBy: m.recordingBy || g.cid, recordingOffPerson: m.recordingPerson || null } : {}) };
            } else fail(400, 'bad_action', 'action 은 start·end·penLock·recording 가운데 하나입니다.');
            tx.update(mpath(mid), patch);
            return { ...m, ...patch };
        });
        // 끝내기: 열린 투표의 원표 장부도 마감(실패하면 503 — 같은 'end' 를 다시 보내면 고쳐진다)
        if (action === 'end' && out.pollId) await closePoll(mid, out.pollId);
        res.json({ meeting: view(mid, out) });
    }));
    // 진행 넘겨받기 = 「발표하기」(AGENDA_OPEN 5). 참석자 누구나, 회의 중(live)에만, 사람당 10초 1번. 주관자는 시작 전에도·제한 없이.
    // body.aid(선택): 그 안건 첫 쪽(또는 body.page)으로 진행을 옮기고 forceSeq 를 올려 자유 보기 중인 사람도 끌어온다(한 트랜잭션).
    router.post('/:mid/presenter', pt(), wrap(async (req, res) => {
        const { mid, g } = req, b = req.body || {};
        allow(req.m, 'presenter');
        const host = g.role === 'host';
        if (!host) {
            check(req.m.status === 'live', 409, 'state_' + req.m.status, '회의가 시작된 뒤에 발표할 수 있어요.');
            await rate('tk' + (g.person || g.cid), 'take', 1, RATE.takeWindowSec);
        }
        const toAid = b.aid === undefined || b.aid === null ? null : String(b.aid);
        if (toAid !== null) check(U.ID_RE.test(toAid), 400, 'bad_aid', '안건이 올바르지 않습니다.');
        const toPage = b.page === undefined ? 1 : b.page;
        check(Number.isInteger(toPage) && toPage >= 1, 400, 'bad_page', '쪽 번호가 올바르지 않습니다.');
        const out = await fb.runTransaction(async tx => {
            const m = await tx.get(mpath(mid));
            const a = toAid ? await tx.get(sub(mid, 'agenda', toAid)) : null;
            check(m && !gone(m), 410, 'meeting_gone', '삭제됐거나 기한이 지난 회의입니다.');
            allow(m, 'presenter');
            if (!host) check(m.status === 'live', 409, 'state_' + m.status, '회의가 시작된 뒤에 발표할 수 있어요.');
            if (toAid) {
                check(a && (m.agendaOrder || []).includes(toAid), 400, 'bad_aid', '없는 안건입니다.');
                check((a.pages | 0) >= 1, 409, 'agenda_empty', '아직 자료가 없는 안건이에요. 자료를 먼저 올려 주세요.');
                check(toPage <= a.pages, 400, 'bad_page', '없는 쪽입니다.');
                check(m.status === 'live', 409, 'state_' + m.status, '회의가 시작된 뒤에 발표할 수 있어요.');
            }
            const epoch = Math.max(m.presenter?.epoch || 0, m.live?.epoch || 0) + 1;
            const patch = { presenter: { cid: g.cid, epoch } };   // 익명: 이름 없음
            if (toAid) {
                const cur = m.live || { rev: 0, forceSeq: 0 };
                patch.live = { aid: toAid, page: toPage, view: { cx: 0.5, cy: 0.5, z: 1 }, rev: (cur.rev || 0) + 1, epoch, forceSeq: (cur.forceSeq || 0) + 1, at: now() };
            } else if (m.live) patch.live = { ...m.live, epoch, at: now() };
            tx.update(mpath(mid), patch);
            return { ...m, ...patch };
        });
        res.json({ presenter: out.presenter, live: out.live || null });
    }));
    // 발표 마치기(화면 결정 2026-11-26): 지금 발표자 본인이나 주관자. 발표자를 비우고(cid null) 모두 대기 화면으로 돌린다.
    // epoch 를 올려 옛 발표자의 진행·판서를 끊고, rev·forceSeq 를 올려 모두의 화면을 끌어온다. 끝난 회의는 409(허용표).
    router.post('/:mid/presenter/end', pt(), wrap(async (req, res) => {
        const { mid, g } = req;
        allow(req.m, 'presenter');
        await rate('pe' + (g.person || g.cid), 'pend', 1, RATE.presenterEndWindowSec);
        const out = await fb.runTransaction(async tx => {
            const m = await tx.get(mpath(mid));
            check(m && !gone(m), 410, 'meeting_gone', '삭제됐거나 기한이 지난 회의입니다.');
            allow(m, 'presenter');
            check(m.status === 'live', 409, 'state_' + m.status, '회의가 시작된 뒤에만 발표를 마칠 수 있어요.');
            if (!m.presenter?.cid) return { m, changed: false };
            check(m.presenter.cid === g.cid || g.role === 'host', 403, 'not_presenter', '지금 발표하는 사람이나 주관자만 발표를 마칠 수 있어요.');
            const epoch = Math.max(m.presenter?.epoch || 0, m.live?.epoch || 0) + 1;
            const cur = m.live || { rev: 0, forceSeq: 0 };
            const patch = { presenter: { cid: null, epoch }, live: { aid: null, page: 1, view: { cx: 0.5, cy: 0.5, z: 1 }, rev: (cur.rev || 0) + 1, epoch, forceSeq: (cur.forceSeq || 0) + 1, at: now() } };
            tx.update(mpath(mid), patch);
            return { m: { ...m, ...patch }, changed: true };
        });
        res.json({ presenter: out.m.presenter || null, live: out.m.live || null, changed: out.changed });
    }));
    // 진행자면 누구나(참석자 발표자 포함). 진행자 확인은 트랜잭션 안 presenter.cid·epoch 로 한다.
    router.post('/:mid/live', pt({ bucket: 'live', max: RATE.live }), wrap(async (req, res) => {
        const { mid, g } = req, b = req.body || {};
        allow(req.m, 'live');
        check(U.ID_RE.test(String(b.aid || '')), 400, 'bad_aid', '안건이 올바르지 않습니다.');
        check(Number.isInteger(b.page) && b.page >= 1, 400, 'bad_page', '쪽 번호가 올바르지 않습니다.');
        check(Number.isInteger(b.baseRev) && Number.isInteger(b.epoch), 400, 'bad_rev', 'baseRev·epoch 가 필요합니다.');
        const v = b.view || {};
        const viewOk = { cx: isNum(v.cx) ? clamp(v.cx, 0, 1) : 0.5, cy: isNum(v.cy) ? clamp(v.cy, 0, 1) : 0.5, z: isNum(v.z) ? clamp(v.z, 1, 6) : 1 };
        {
            const live = await fb.runTransaction(async tx => {
                const m = await tx.get(mpath(mid));
                // 같은 안건·쪽에서 확대·이동만 바뀌면 안건 문서는 다시 읽지 않는다(지연 줄이기 B). 안건 목록에 있는지는 계속 본다.
                const same = m?.live && m.live.aid === b.aid && m.live.page === b.page;
                const a = same ? null : await tx.get(sub(mid, 'agenda', b.aid));
                check(m && m.status === 'live' && !gone(m), 409, 'state_' + (m?.status || 'gone'), '회의 중이 아닙니다.');
                const cur = m.live || { rev: 0, epoch: 0, forceSeq: 0 };
                if (m.presenter?.cid !== g.cid || m.presenter.epoch !== b.epoch || cur.epoch !== b.epoch) fail(409, 'not_presenter', '진행권이 바뀌었습니다.', { live: m.live || null, presenter: m.presenter || null });
                if (cur.rev !== b.baseRev) fail(409, 'stale_rev', '진행 상태가 이미 바뀌었습니다.', { live: m.live || null, presenter: m.presenter || null });
                check((m.agendaOrder || []).includes(b.aid) && (same || a), 400, 'bad_aid', '없는 안건입니다.');
                if (!same) check(b.page <= a.pages, 400, 'bad_page', '없는 쪽입니다.');
                // full: 발표자가 켠 「전체 화면」 — 따라가는 사람 화면도 무대만 꽉 차게(보내지 않으면 지금 값 유지)
                const next = { aid: b.aid, page: b.page, view: viewOk, rev: cur.rev + 1, epoch: b.epoch, forceSeq: (cur.forceSeq || 0) + (b.force ? 1 : 0), full: b.full === undefined ? !!cur.full : !!b.full, at: now() };
                tx.update(mpath(mid), { live: next });
                return next;
            });
            res.json({ live });
        }
    }));

    // ================= 업로드 (C-5) =================
    // 참석자 누구나(AGENDA_OPEN). body.aid 가 있으면 그 안건(제목만 만든 것 또는 자료 바꾸기)에 붙인다 — 주인 또는 주관자만.
    router.post('/:mid/uploads', pt(), wrap(async (req, res) => {
        const { mid, g, m } = req, b = req.body || {};
        allow(m, 'upload');
        check(KINDS.includes(b.kind), 400, 'bad_kind', '올릴 수 없는 형식입니다.');
        check(Number.isInteger(b.pages) && b.pages >= 1 && b.pages <= LIMIT.pages, 400, 'bad_pages', `쪽 수는 1~${LIMIT.pages}쪽입니다.`);
        check(Number.isInteger(b.bytes) && b.bytes >= 1 && b.bytes <= LIMIT.originalBytes, 413, 'too_large', '원본은 50MB 미만이어야 합니다.');
        const toAid = b.aid === undefined || b.aid === null ? null : String(b.aid);
        if (toAid) {
            check(U.ID_RE.test(toAid) && (m.agendaOrder || []).includes(toAid), 404, 'not_found', '안건이 없습니다.');
            const a = await fb.get(sub(mid, 'agenda', toAid));
            check(a && a.kind !== 'board', 404, 'not_found', '자료를 붙일 수 없는 안건입니다.');
            editOnly(a, g);
            check(m.live?.aid !== toAid || m.status !== 'live', 409, 'agenda_live', '지금 발표 중인 안건의 자료는 바꿀 수 없어요.');
        } else {
            check((m.agendaOrder || []).length < LIMIT.agenda, 409, 'agenda_full', `안건은 ${LIMIT.agenda}개까지입니다.`);
            if (g.role !== 'host') { const n = await fb.runTransaction(tx => ownedCount(tx, mid, m, g)); if (n >= LIMIT.personAgenda) personFull(); }
        }
        if (g.role !== 'host') await rate('ag' + (g.person || g.cid), 'agadd', RATE.agendaAddPerMin, 60);
        // 확장자는 형식표(contract.js)에서, 종류와 맞아야 한다. 확장자를 안 주면 그림 밖 종류는 종류 이름이 곧 확장자.
        const ext = String(b.ext ?? (b.kind === 'image' ? '' : b.kind)).toLowerCase();
        check(SOURCES[ext] && SOURCES[ext].kind === b.kind, 400, 'bad_ext', '원본 확장자가 형식과 맞지 않습니다.');
        // 발급 총량(감사 R4 Q1): 취소해도 그 출입증은 15분 살아 있으므로 발급한 수 자체를 시간당으로 묶는다(취소한 것도 센다).
        // 사람당 12개(주관자 30개), 회의 전체 참석자 몫 60개. 주관자는 회의 몫에 들지 않는다(참석자 도배가 주관자를 막지 않게).
        const who = g.person || g.cid;
        if (g.role === 'host') await rate('ph' + who, 'permit', LIMIT.permitsHostPerHour, 3600);
        else { await rate('pp' + who, 'permit', LIMIT.permitsPersonPerHour, 3600); await rate('pm' + mid, 'permit', LIMIT.permitsMeetingPerHour, 3600); }
        const uploadId = U.newId('u');
        const t = now();
        // 확정 전 허가 개수 상한(감사 R2 M2·R3 P3·R4 Q2): 사람당 3개, 회의당 60개. 주관자는 회의 칸 밖(사람 3개만).
        // 허가 자리는 15분 뒤 저절로 풀리고, 실패한 허가는 화면이 DELETE 로 바로 돌려준다.
        const open = Number(await redis.eval(LUA.upOpen, [K.upOpen(mid)], [t, UPLOAD_TOKEN_LIFE, g.person || g.cid, uploadId, LIMIT.openUploadsPerson, LIMIT.openUploadsMeeting, g.role === 'host' ? '1' : '0'].map(String)));
        check(open > 0, 429, 'upload_busy', open === -1 ? `올리는 중인 자료가 ${LIMIT.openUploadsPerson}개 있어요. 하나를 마친 뒤 다시 올려 주세요.` : '이 회의에서 동시에 올리는 자료가 너무 많아요. 잠시 뒤 다시 올려 주세요.');
        const caps = pageCaps(b.pages);   // 허가 하나 = 원본 50MiB 미만 + 쪽 200MiB + 썸네일 20MiB(감사 R2 M2)
        // 업로드 출입증도 그 참가 자격(pt) 만료와, 관리자로 받은 host 면 관리자 세션 만료를 넘지 않는다(감사 N9 와 같은 원칙)
        const adminCap = g.role === 'host' && (g.via === 'admin' || g.via === 'creator') && g.adminUntil != null && Number.isFinite(Number(g.adminUntil)) ? Number(g.adminUntil) : Infinity;
        const upUntil = Math.min(t + UPLOAD_TOKEN_LIFE, m.expiresAt, Number(g.exp) || Infinity, adminCap);
        // 장부를 먼저 쓴다: 출입증을 받은 뒤 무슨 일이 나도(회의 삭제 포함) 24시간 뒤 정리 작업이 이 경로를 지운다(지적01·03)
        await redis.hset(K.uploads, { [`${mid}/${uploadId}`]: t });
        await redis.set(K.up(uploadId), JSON.stringify({ mid, cid: g.cid, person: g.person || null, kind: b.kind, pages: b.pages, bytes: b.bytes, ext, at: t, aid: toAid }), { ex: 86400 });
        await remember(redis, mid, K.up(uploadId));
        // 업로드 전용 출입증: 이 허가의 경로·파일 이름·쪽 수·원본 크기만 쓸 수 있고 15분 뒤 끝난다(storage.rules 가 확인)
        const token = await fb.createCustomToken('zz_' + g.cid, claimsFor(mid, m, g.role, { until: upUntil, up: uploadId, upPages: b.pages, upExt: ext, upBytes: b.bytes, upPageMax: caps.page, upThumbMax: caps.thumb }));
        const pad = n => String(n).padStart(3, '0');
        const pages = Array.from({ length: b.pages }, (_, i) => `p${pad(i + 1)}.webp`);
        res.status(201).json({
            uploadId, path: `zzoom/${mid}/up/${uploadId}/`, token, tokenUntil: upUntil,
            files: { pages, thumbs: pages.map(p => 't' + p.slice(1)), original: `original.${ext}` }, originalTypes: SOURCES[ext].mimes,
            limits: { pageBytes: caps.page, thumbBytes: caps.thumb, originalBytes: LIMIT.originalBytes },
            expiresAt: t + UPLOAD_COMMIT_LIFE
        });
    }));
    // 허가 취소(감사 R3 P3): 업로드나 확정에 실패한 화면이 자기 허가 자리를 돌려준다. 본인 허가만.
    // 장부(zz:uploads)는 두어 정리 작업이 올라간 파일을 지우게 한다. 출입증은 15분 뒤 저절로 끝난다.
    router.delete('/:mid/uploads/:uploadId', pt(), wrap(async (req, res) => {
        const { mid, g } = req, uploadId = req.params.uploadId;
        check(U.ID_RE.test(uploadId) && uploadId[0] === 'u', 404, 'upload_unknown', '업로드 허가가 없습니다.');
        const permit = await readJson(redis, K.up(uploadId));
        check(permit && permit.mid === mid, 404, 'upload_unknown', '업로드 허가가 없거나 이미 끝났습니다.');
        check(permit.person ? permit.person === g.person : permit.cid === g.cid, 403, 'not_yours', '내가 받은 업로드 허가만 취소할 수 있습니다.');
        try { await redis.hdel(K.upOpen(mid), uploadId); await redis.del(K.up(uploadId)); }
        catch { fail(503, 'redis_down', '잠시 쭘을 쓸 수 없습니다(저장소 장애).'); }
        res.json({ ok: true, uploadId });
    }));
    router.post('/:mid/uploads/:uploadId/commit', pt(), wrap(async (req, res) => {
        const { mid, g, m } = req, b = req.body || {}, uploadId = req.params.uploadId;
        allow(m, 'upload');
        check(U.ID_RE.test(uploadId) && uploadId[0] === 'u', 404, 'upload_unknown', '업로드 허가가 없습니다.');
        const newAid = 'a' + uploadId.slice(1);
        const upBase = `zzoom/${mid}/up/${uploadId}`;
        // 확정 뒤 장부 정리(되풀이해도 안전). 실패해도 안건은 이미 있으므로 성공으로 답하고, 정리 작업이 안건을 확인해 파일을 지키며 장부만 지운다.
        const cleanup = async () => {
            try { await redis.hdel(K.upOpen(mid), uploadId); await redis.del(K.up(uploadId)); await redis.hdel(K.uploads, `${mid}/${uploadId}`); }   // 허가 자리부터(R3 P5)
            catch (e) { console.warn('[zzoom] 업로드 장부 정리 실패(정리 작업이 다시 맞춘다):', e.message); }
        };
        // commit 재시도는 같은 결과 + 장부 다시 정리. 기존 안건에 붙인 업로드는 body.aid 의 base 가 이 업로드면 이미 끝난 것.
        let doneAid = newAid, done = await fb.get(sub(mid, 'agenda', newAid));
        if (!done && U.ID_RE.test(String(b.aid || ''))) { const x = await fb.get(sub(mid, 'agenda', String(b.aid))); if (x && x.base === upBase) { done = x; doneAid = String(b.aid); } }
        if (done) { await cleanup(); return res.json({ aid: doneAid, agenda: done, already: true }); }
        const permit = await readJson(redis, K.up(uploadId));
        check(permit && permit.mid === mid, 404, 'upload_unknown', '업로드 허가가 없거나 만료됐습니다.');
        // 허가는 받은 사람에게 묶인다(레드팀 RT-4): 같은 자격(cid)이거나, 다시 들어온 같은 사람(같은 백암이 로그인 세션의 사람 열쇠)만
        check(!permit.cid || permit.cid === g.cid || (permit.person && permit.person === g.person), 403, 'not_your_upload', '허가를 받은 사람만 확정할 수 있습니다.');
        const aid = permit.aid || newAid;
        check(now() - permit.at < UPLOAD_COMMIT_LIFE, 410, 'upload_expired', '업로드 허가가 지났습니다(23시간). 다시 올려 주세요.');
        check(b.pages === permit.pages, 400, 'pages_mismatch', '허가받은 쪽 수와 다릅니다.');
        check(Array.isArray(b.sizes) && b.sizes.length === permit.pages, 400, 'bad_sizes', 'sizes 는 쪽마다 하나씩입니다.');
        const sizes = b.sizes.map(s => {
            const w = Array.isArray(s) ? s[0] : s?.w, h = Array.isArray(s) ? s[1] : s?.h;
            check(Number.isInteger(w) && Number.isInteger(h) && w >= 1 && h >= 1 && w <= LIMIT.px && h <= LIMIT.px, 400, 'bad_sizes', `쪽 크기는 ${LIMIT.px}px 이하입니다.`);
            return { w, h };
        });
        const title = str(b.title, LIMIT.agendaTitle) || '안건';
        // Storage 객체 확인: 쪽·썸네일이 빠짐없이, 형식·크기 맞게, 다른 파일 없이
        const prefix = `zzoom/${mid}/up/${uploadId}/`;
        const items = []; let next;
        do { const r = await fb.storage.list(prefix, { max: 500, pageToken: next }); items.push(...r.items); next = r.next; } while (next && items.length < 1000);
        const byName = new Map(items.map(i => [i.name.slice(prefix.length), i]));
        const bad = msg => fail(422, 'upload_invalid', msg);
        const pad = n => String(n).padStart(3, '0');
        const caps = pageCaps(permit.pages);   // 허가 때 출입증에 실은 파일당 상한과 같다(감사 R2 M2)
        for (let i = 1; i <= permit.pages; i++) {
            for (const [nm, max] of [[`p${pad(i)}.webp`, caps.page], [`t${pad(i)}.webp`, caps.thumb]]) {
                const it = byName.get(nm);
                if (!it) bad(`${nm} 파일이 없습니다.`);
                if (it.contentType !== 'image/webp') bad(`${nm} 형식이 webp 가 아닙니다.`);
                if (!(it.size > 0 && it.size <= max)) bad(`${nm} 크기가 한도를 넘습니다.`);
                byName.delete(nm);
            }
        }
        // 실제 바이트 확인(지적02): 이름·메타데이터만이 아니라 파일 머리가 WebP 이고 쪽 크기가 commit 값과 같은지.
        if (fb.storage.head) {
            const jobs = [];
            for (let i = 1; i <= permit.pages; i++) {
                jobs.push([`p${pad(i)}.webp`, sizes[i - 1], LIMIT.px]);
                jobs.push([`t${pad(i)}.webp`, null, 320]);
            }
            for (let j = 0; j < jobs.length; j += 16) {
                const heads = await Promise.all(jobs.slice(j, j + 16).map(([nm]) => fb.storage.head(prefix + nm, 30)));
                heads.forEach((buf, k) => {
                    const [nm, want, maxSide] = jobs[j + k];
                    if (buf === undefined) return;   // 시험용 가짜 저장소가 바이트를 모를 때만(실제 어댑터는 Buffer|null)
                    const d = webpSize(buf);
                    if (!d) bad(`${nm} 이 WebP 그림이 아닙니다.`);
                    if (d.w > maxSide || d.h > maxSide) bad(`${nm} 그림 크기가 한도를 넘습니다.`);
                    if (want && (d.w !== want.w || d.h !== want.h)) bad(`${nm} 그림 크기(${d.w}×${d.h})가 알려 준 크기(${want.w}×${want.h})와 다릅니다.`);
                });
            }
        }
        let original = null;
        const on = `original.${permit.ext}`;
        if (byName.has(on)) {
            const it = byName.get(on);
            if (it.size !== permit.bytes) bad('원본 크기가 허가받은 크기와 다릅니다.');
            if (!okMime(permit.ext, it.contentType || '')) bad('원본 형식이 허용되지 않습니다.');
            original = { path: prefix + on, name: str(b.originalName, 120) || on, bytes: it.size };
            byName.delete(on);
        }
        if (byName.size) bad('허가받지 않은 파일이 있습니다: ' + [...byName.keys()].slice(0, 3).join(', '));
        if (permit.aid) {
            // 기존 안건(제목만 만든 것·자료 바꾸기)에 자료를 붙인다. 제목은 그대로 둔다.
            const patch = { kind: permit.kind, pages: permit.pages, sizes, base: upBase, original };
            let old = null, merged = null;
            await fb.runTransaction(async tx => {
                const cur = await tx.get(mpath(mid));
                const a = await tx.get(sub(mid, 'agenda', aid));
                check(cur && !gone(cur), 410, 'meeting_gone', '삭제됐거나 기한이 지난 회의입니다.');
                allow(cur, 'upload');
                check(a && (cur.agendaOrder || []).includes(aid), 404, 'not_found', '안건이 지워졌어요.');
                editOnly(a, g);
                if (a.base === upBase) { merged = a; return; }
                check(!(cur.status === 'live' && cur.live?.aid === aid), 409, 'agenda_live', '지금 발표 중인 안건의 자료는 바꿀 수 없어요.');
                old = a;
                merged = { ...a, ...patch, ver: (a.ver || 1) + 1 };
                tx.update(sub(mid, 'agenda', aid), { ...patch, ver: merged.ver });
            });
            await cleanup();
            // 옛 자료 그림과 그 위 판서는 지운다(최선 노력, 남으면 회의 정리 때)
            if (old) {
                try {
                    // 쪽마다 epoch 를 올려 옛 판서를 곧바로 안 보이게 하고 개수 장부도 비운다(감사 R7 P1-3: 500개 넘는 옛 선·장부가 남았다).
                    // 실제 문서 삭제는 쪽 지우기와 같은 정리 예약(purgePages)이 이어서 한다.
                    const keys = Array.from({ length: Math.min(old.pages || 1, LIMIT.pages || 200) }, (_, i) => `${aid}_${i + 1}`);
                    const eps = {};
                    await fb.runTransaction(async tx => {
                        for (const k of keys) eps[k] = ((await tx.get(sub(mid, 'pages', k)))?.epoch || 0) + 1;
                        for (const k of keys) tx.set(sub(mid, 'pages', k), { epoch: eps[k] });
                    });
                    for (const k of keys) await redis.eval(LUA.scDrop, [K.sc(mid), K.scp(mid)], [k, String(eps[k])]);
                    await redis.hset(K.purgePages, Object.fromEntries(keys.map(k => [`${mid}|${k}`, eps[k]])));
                    const until = now() + 8000;   // 바로 지울 수 있는 만큼 지우고, 남으면 정리 작업이 잇는다
                    for (const k of keys) {
                        if (now() > until) break;
                        const r = await removeOldStrokes(fb, mid, k, eps[k], 500);
                        if (r.done) await redis.hdel(K.purgePages, `${mid}|${k}`);
                    }
                    if (old.base && old.base !== upBase) await removePrefix(fb, old.base + '/', now() + 8000, now);
                } catch (e) { console.warn('[zzoom] 자료 바꾸기 뒷정리 실패:', e.message); }
            }
            return res.status(201).json({ aid, agenda: merged });
        }
        // 익명: 올린 사람 이름은 싣지 않는다. 권한 판정용 cid·사람 열쇠 해시만.
        const agenda = { title, kind: permit.kind, pages: permit.pages, sizes, ver: 1, base: prefix.slice(0, -1), original, ownerCid: g.cid, ownerHash: ownHash(g), createdAt: now() };
        await fb.runTransaction(async tx => {
            const cur = await tx.get(mpath(mid));
            const exists = await tx.get(sub(mid, 'agenda', aid));
            check(cur && !gone(cur), 410, 'meeting_gone', '삭제됐거나 기한이 지난 회의입니다.');
            allow(cur, 'upload');
            if (exists) return;
            check((cur.agendaOrder || []).length < LIMIT.agenda, 409, 'agenda_full', `안건은 ${LIMIT.agenda}개까지입니다.`);
            if (g.role !== 'host' && await ownedCount(tx, mid, cur, g) >= LIMIT.personAgenda) personFull();
            tx.set(sub(mid, 'agenda', aid), agenda);
            tx.update(mpath(mid), { agendaOrder: [...(cur.agendaOrder || []), aid] });
        });
        await cleanup();
        res.status(201).json({ aid, agenda });
    }));

    // ================= 안건·화이트보드 =================
    // 제목만 있는 안건 만들기(AGENDA_OPEN 2): 참석자 누구나, 자료는 나중에 /uploads {aid} 로 붙인다. 회의당 30개, 한 사람 10개.
    router.post('/:mid/agenda', pt(), wrap(async (req, res) => {
        const { mid, g, m } = req, b = req.body || {};
        allow(m, 'agenda');
        const title = str(b.title, LIMIT.agendaTitle);
        check(title, 400, 'bad_title', '안건 제목을 넣어 주세요.');
        if (g.role !== 'host') await rate('ag' + (g.person || g.cid), 'agadd', RATE.agendaAddPerMin, 60);
        const aid = U.newId('a');
        const agenda = { title, kind: 'empty', pages: 0, sizes: [], ver: 1, ownerCid: g.cid, ownerHash: ownHash(g), createdAt: now() };
        await guarded(mid, 'agenda', async (tx, cur) => {
            check((cur.agendaOrder || []).length < LIMIT.agenda, 409, 'agenda_full', `안건은 ${LIMIT.agenda}개까지입니다.`);
            if (g.role !== 'host' && await ownedCount(tx, mid, cur, g) >= LIMIT.personAgenda) personFull();
            tx.set(sub(mid, 'agenda', aid), agenda);
            tx.update(mpath(mid), { agendaOrder: [...(cur.agendaOrder || []), aid] });
        });
        res.status(201).json({ aid, agenda });
    }));
    // 내가 고칠 수 있는 안건(내가 올린 것). 다시 들어와 cid 가 바뀌어도 같은 사람이면 나온다. 이름은 주지 않는다.
    router.get('/:mid/agenda/mine', pt(), wrap(async (req, res) => {
        const { mid, g, m } = req;
        const mine = [];
        for (const id of m.agendaOrder || []) { const a = await fb.get(sub(mid, 'agenda', id)); if (isOwner(a, g)) mine.push(id); }
        res.json({ aids: mine });
    }));
    router.patch('/:mid/agenda/:aid', pt(), wrap(async (req, res) => {
        const { mid, g } = req, aid = req.params.aid, b = req.body || {};
        allow(req.m, 'agenda');
        check(U.ID_RE.test(aid), 404, 'not_found', '안건이 없습니다.');
        const out = await fb.runTransaction(async tx => {
            const m = await tx.get(mpath(mid));
            const a = await tx.get(sub(mid, 'agenda', aid));
            check(m && !gone(m), 410, 'meeting_gone', '삭제됐거나 기한이 지난 회의입니다.');
            allow(m, 'agenda');
            check(a, 404, 'not_found', '안건이 없습니다.');
            // 제목: 올린 사람 또는 주관자. 순서 바꾸기: 주관자만(AGENDA_OPEN 권한)
            if (b.index !== undefined) check(g.role === 'host', 403, 'host_only', '순서는 주관자만 바꿀 수 있어요.');
            if (b.title !== undefined) editOnly(a, g);
            let order = m.agendaOrder || [];
            if (b.title !== undefined) { const t = str(b.title, LIMIT.agendaTitle); check(t, 400, 'bad_title', '안건 제목을 넣으세요.'); tx.update(sub(mid, 'agenda', aid), { title: t, ver: (a.ver || 1) + 1 }); a.title = t; }
            if (b.index !== undefined) {
                check(Number.isInteger(b.index), 400, 'bad_index', 'index 는 정수입니다.');
                order = order.filter(x => x !== aid);
                order.splice(clamp(b.index, 0, order.length), 0, aid);
                tx.update(mpath(mid), { agendaOrder: order });
            }
            return { agendaOrder: order, agenda: a };
        });
        res.json(out);
    }));
    router.delete('/:mid/agenda/:aid', pt(), wrap(async (req, res) => {
        const { mid, g } = req, aid = req.params.aid;
        allow(req.m, 'agenda');
        check(U.ID_RE.test(aid), 404, 'not_found', '안건이 없습니다.');
        const a = await fb.runTransaction(async tx => {
            const m = await tx.get(mpath(mid));
            const a = await tx.get(sub(mid, 'agenda', aid));
            check(m && !gone(m), 410, 'meeting_gone', '삭제됐거나 기한이 지난 회의입니다.');
            allow(m, 'agenda');
            check(a, 404, 'not_found', '안건이 없습니다.');
            editOnly(a, g);   // 올린 사람 또는 주관자
            check(m.live?.aid !== aid, 409, 'agenda_live', '진행 중인 안건은 지울 수 없습니다.');
            tx.delete(sub(mid, 'agenda', aid));
            tx.update(mpath(mid), { agendaOrder: (m.agendaOrder || []).filter(x => x !== aid) });
            return a;
        });
        // 뒷정리(최선 노력): 그림 파일과 그 안건의 선. 남으면 회의 정리 때 지워진다.
        try {
            if (a.base) await removePrefix(fb, a.base + '/', now() + 8000, now);
            const strokes = await fb.query(sub(mid, 'strokes'), { where: [['aid', '==', aid]], limit: 500 });
            if (strokes.length) await fb.batch(strokes.map(d => ({ op: 'delete', path: sub(mid, 'strokes', d.id) })));
        } catch (e) { console.warn('[zzoom] 안건 뒷정리 실패:', e.message); }
        res.json({ ok: true });
    }));
    router.post('/:mid/boards', pt({ host: true }), wrap(async (req, res) => {
        const { mid, g } = req, b = req.body || {};
        allow(req.m, 'board');
        const BG = ['white', 'grid', 'lines'];
        if (b.action === 'addPage') {
            check(U.ID_RE.test(String(b.aid || '')), 400, 'bad_aid', '화이트보드가 올바르지 않습니다.');
            const out = await fb.runTransaction(async tx => {
                const m = await tx.get(mpath(mid));
                const a = await tx.get(sub(mid, 'agenda', b.aid));
                check(m && !gone(m), 410, 'meeting_gone', '삭제됐거나 기한이 지난 회의입니다.');
                allow(m, 'board');
                check(a && a.kind === 'board', 404, 'not_found', '화이트보드가 없습니다.');
                check(a.pages < LIMIT.pages, 409, 'board_full', `쪽은 ${LIMIT.pages}쪽까지입니다.`);
                const patch = { pages: a.pages + 1, sizes: [...(a.sizes || []), { w: 1600, h: 1000 }], ver: (a.ver || 1) + 1 };
                tx.update(sub(mid, 'agenda', b.aid), patch);
                return { aid: b.aid, pages: patch.pages };
            });
            return res.json(out);
        }
        check(b.action === undefined || b.action === 'create', 400, 'bad_action', 'action 은 create 또는 addPage 입니다.');
        const bg = BG.includes(b.bg) ? b.bg : 'white';
        const aid = U.newId('b');
        const out = await fb.runTransaction(async tx => {
            const m = await tx.get(mpath(mid));
            check(m && !gone(m), 410, 'meeting_gone', '삭제됐거나 기한이 지난 회의입니다.');
            allow(m, 'board');
            check((m.agendaOrder || []).length < LIMIT.agenda, 409, 'agenda_full', `안건은 ${LIMIT.agenda}개까지입니다.`);
            const n = (m.boardCount || 0) + 1;
            const agenda = { title: `화이트보드 ${n}`, kind: 'board', bg, pages: 1, sizes: [{ w: 1600, h: 1000 }], ver: 1, boardNo: n, ownerCid: g.cid, ownerHash: ownHash(g), createdAt: now() };   // 익명: 이름 없음
            tx.set(sub(mid, 'agenda', aid), agenda);
            const patch = { agendaOrder: [...(m.agendaOrder || []), aid], boardCount: n };
            // 진행자가 띄우면 진행도 그 판으로
            if (m.status === 'live' && m.presenter?.cid === g.cid && m.live) patch.live = { ...m.live, aid, page: 1, view: { cx: 0.5, cy: 0.5, z: 1 }, rev: m.live.rev + 1, at: now() };
            tx.update(mpath(mid), patch);
            return { aid, agenda, live: patch.live || null };
        });
        res.status(201).json(out);
    }));

    // ================= 판서 (E) =================
    router.post('/:mid/strokes', pt(), wrap(async (req, res) => {
        const { mid, g, m } = req;
        allow(m, 'stroke');
        check(!m.penLock || g.role === 'host', 403, 'pen_locked', '주관자가 판서를 잠갔습니다.');
        const list = Array.isArray(req.body?.strokes) ? req.body.strokes : (req.body?.pageKey ? [req.body] : null);
        check(list && list.length >= 1 && list.length <= LIMIT.strokeBatch, 400, 'bad_strokes', `선은 한 번에 1~${LIMIT.strokeBatch}개입니다.`);
        // 판서 요청은 묶음(선 1~20개)이 요청 1번이다. 초당 3번까지 — 묶지 않고 손 뗄 때마다 보내는 화면(0.4초 간격)도 받는다(부하 시험 LOAD.md 2).
        await rate(g.h.slice(0, 24), 'stroke', RATE.strokePerSec);
        const clean = list.map(s => {
            const mk = PAGE_KEY.exec(String(s?.pageKey || ''));
            check(mk, 400, 'bad_pageKey', '쪽 키가 올바르지 않습니다.');
            check(['pen', 'hl'].includes(s.tool), 400, 'bad_tool', 'tool 은 pen·hl 입니다.');
            const color = PALETTE[s.tool].find(c => c.toLowerCase() === String(s.color || '').toLowerCase());
            check(color, 400, 'bad_color', '쓸 수 없는 색입니다.');
            check(isNum(s.w) && s.w >= 0.001 && s.w <= 0.05, 400, 'bad_width', '굵기는 쪽 너비 비율(0.001~0.05)입니다.');
            check(Array.isArray(s.pts) && s.pts.length >= 6 && s.pts.length <= LIMIT.strokeNums && s.pts.length % 3 === 0, 400, 'bad_pts', `pts 는 [x,y,p,...] 길이 3의 배수, 6~${LIMIT.strokeNums} 입니다.`);
            const pts = s.pts.map(v => { check(isNum(v) && v >= 0 && v <= 1, 400, 'bad_pts', '좌표·필압은 0~1 입니다.'); return Math.round(v * 10000) / 10000; });
            check(Number.isInteger(s.epoch) && s.epoch >= 0, 400, 'bad_epoch', 'epoch 가 필요합니다.');
            const o = { pageKey: s.pageKey, aid: mk[1], page: Number(mk[2]), epoch: s.epoch, tool: s.tool, color, w: s.w, pts };
            if (s.group !== undefined) { check(typeof s.group === 'string' && s.group.length <= 40, 400, 'bad_group', 'group 은 40자 이하 문자열입니다.'); o.group = s.group; }
            if (s.part !== undefined) { check(Number.isInteger(s.part) && s.part >= 0 && s.part <= 20, 400, 'bad_part', 'part 는 0~20 정수입니다.'); o.part = s.part; }
            return o;
        });
        // 상한 예약(원자): 쪽당 2,000 · 회의당 2만 · 사람당 쪽 300. 장부는 epoch 를 같이 적어 쪽 지우기 뒤 늦은 저장·되돌리기를 무시한다.
        const per = {}; for (const s of clean) { const f = `${s.pageKey}|${s.epoch}`; per[f] = (per[f] || 0) + 1; }
        const who = g.person || g.cid;
        const pairs = Object.entries(per).flatMap(([f, n]) => [...f.split('|'), String(n)]);
        const r = Number(await redis.eval(LUA.scReserve, [K.sc(mid), K.scp(mid)], [LIMIT.meetingStrokes, LIMIT.pageStrokes, LIMIT.personPageStrokes, who, ...pairs].map(String)));
        if (r === -3) fail(409, 'stroke_limit_person', `한 사람이 한 쪽에 ${LIMIT.personPageStrokes}선까지 쓸 수 있습니다(지운 선도 셉니다). 주관자에게 쪽 지우기를 부탁하세요.`);
        if (r < 0) fail(409, 'stroke_limit', '이 쪽(또는 회의)에 선이 너무 많습니다. 쪽 지우기를 하세요.');
        const release = () => redis.eval(LUA.scRelease, [K.sc(mid), K.scp(mid)], [who, ...pairs].map(String)).catch(e => console.warn('[zzoom] 판서 예약 되돌리기 실패:', e.message));
        let ids, t;
        try {
            const seqs = [];
            for (const s of clean) seqs.push(await redis.hincrby(K.seq(mid), s.pageKey, 1));
            await redis.expire(K.seq(mid), KEEP_SEC);   // 삭제와 겹쳐 다시 만들어져도 영구히 남지 않게(R1-N3)
            // 쪽이 실제로 있고 epoch 가 지금 것인지, 회의 상태·판서 잠금을 **쓰는 트랜잭션 안에서** 다시 확인한다.
            const aids = [...new Set(clean.map(s => s.aid))], keys = [...new Set(clean.map(s => s.pageKey))];
            ids = await guarded(mid, 'stroke', async (tx, cur) => {
                check(!cur.penLock || g.role === 'host', 403, 'pen_locked', '주관자가 판서를 잠갔습니다.');
                const agendas = {}; for (const a of aids) agendas[a] = await tx.get(sub(mid, 'agenda', a));
                const epochs = {}; for (const k of keys) epochs[k] = (await tx.get(sub(mid, 'pages', k)))?.epoch || 0;
                for (const s of clean) {
                    const a = agendas[s.aid];
                    check(a && (cur.agendaOrder || []).includes(s.aid) && s.page >= 1 && s.page <= a.pages, 400, 'bad_pageKey', '없는 쪽입니다.');
                    check(s.epoch === epochs[s.pageKey], 409, 'stale_epoch', '이 쪽은 이미 지워졌습니다.', { pageKey: s.pageKey, epoch: epochs[s.pageKey] });
                }
                t = now();
                return clean.map((s, i) => {
                    const id = U.newId('s');
                    tx.set(sub(mid, 'strokes', id), { ...s, cid: g.cid, at: t, seq: seqs[i] });   // 익명: 이름 없음
                    return { id, seq: seqs[i], pageKey: s.pageKey };
                });
            });
        } catch (e) { await release(); throw e; }
        res.status(201).json({ strokes: ids, at: t });
    }));
    router.delete('/:mid/strokes/:sid', pt(), wrap(async (req, res) => {
        const { mid, g, m } = req, sid = req.params.sid;
        allow(m, 'stroke');
        check(U.ID_RE.test(sid), 404, 'not_found', '선이 없습니다.');
        check(!m.penLock || g.role === 'host', 403, 'pen_locked', '주관자가 판서를 잠갔습니다.');
        // 읽고 지우기를 한 트랜잭션으로: 동시에 두 번 지워도 한 번만 지운 것으로 센다(지적05)
        const s = await guarded(mid, 'stroke', async (tx, cur) => {
            check(!cur.penLock || g.role === 'host', 403, 'pen_locked', '주관자가 판서를 잠갔습니다.');
            const d = await tx.get(sub(mid, 'strokes', sid));
            check(d, 404, 'not_found', '선이 없습니다.');
            check(d.cid === g.cid || g.role === 'host', 403, 'not_owner', '내 선만 지울 수 있습니다.');
            tx.delete(sub(mid, 'strokes', sid));
            return d;
        });
        // 쪽 지우기로 이미 버린 epoch 면 아무것도 줄이지 않는다. 사람당 몫은 '쓴 선 수'라 지워도 돌려주지 않는다(쪽 지우기 때 초기화).
        await redis.eval(LUA.scRelease, [K.sc(mid), K.scp(mid)], ['', s.pageKey, String(s.epoch || 0), '1']);
        res.json({ ok: true });
    }));
    router.post('/:mid/pages/:pageKey/clear', pt({ host: true }), wrap(async (req, res) => {
        const { mid } = req, pageKey = req.params.pageKey;
        allow(req.m, 'stroke');
        check(PAGE_KEY.test(pageKey), 400, 'bad_pageKey', '쪽 키가 올바르지 않습니다.');
        const epoch = await guarded(mid, 'stroke', async tx => {
            const p = await tx.get(sub(mid, 'pages', pageKey));
            const e = (p?.epoch || 0) + 1;
            tx.set(sub(mid, 'pages', pageKey), { epoch: e });
            return e;
        });
        // 옛 epoch 개수를 통째로 버린다(원자). 아직 진행 중인 옛 epoch 저장은 트랜잭션에서 stale_epoch 로 거절되고 되돌리기는 무시된다.
        await redis.eval(LUA.scDrop, [K.sc(mid), K.scp(mid)], [pageKey, String(epoch)]);
        // 끝나지 않으면 정리 작업이 이어서 지우도록 먼저 예약해 둔다
        await redis.hset(K.purgePages, { [`${mid}|${pageKey}`]: epoch });
        const r = await removeOldStrokes(fb, mid, pageKey, epoch, 500);
        if (r.done) await redis.hdel(K.purgePages, `${mid}|${pageKey}`);
        res.json({ pageKey, epoch });
    }));

    // ================= 채팅·손 (F-1·F-2) =================
    router.post('/:mid/chat', pt(), wrap(async (req, res) => {
        const { mid, g, m } = req, b = req.body || {};
        allow(m, 'chat');
        const text = typeof b.text === 'string' ? b.text.trim() : '';
        check(text && text.length <= LIMIT.chat, 400, 'bad_text', `채팅은 1~${LIMIT.chat}자입니다.`);
        await rate(g.h.slice(0, 24), 'chat', 1);
        if (g.person) await rate('pp' + g.person, 'chat', 1);      // 재입장(새 pt)으로 1초 1글을 우회하지 못하게
        // 막 들어온(1분 안) 자격은 같은 로그인 세션끼리 1초 1글을 나눠 쓴다 — 이름을 바꿔 여러 번 들어와 도배하는 것을 막는다.
        // 백암이 세션은 브라우저 로그인마다 따로라서, 서로 다른 교사끼리는 이 묶음에 걸리지 않는다.
        if (g.sess && now() - (g.at || 0) < 60000) await rate('ns' + g.sess, 'chat', 1);
        // 공용 접근 코드라 로그인은 얼마든지 새로 만들 수 있다. 회의 전체 채팅은 초당 15개로 묶는다(레드팀 채팅 도배).
        // 물통 30개라서 30명이 회의 시작 때 한꺼번에 인사해도 모두 올라간다(감사 R3 P2: 입장 직후 묶음 폐지).
        // 주관자 공지는 물통 밖(감사 R4 Q4): 주관자는 사람당 1초 1글만 받는다
        let ok = 1; if (g.role !== 'host') try { ok = Number(await redis.eval(LUA.bucket, [K.chatBucket(mid)], [now(), RATE.chatMeetingPerSec, RATE.chatMeetingBurst].map(String))); }
        catch { fail(503, 'redis_down', '잠시 쭘을 쓸 수 없습니다(저장소 장애).'); }
        check(ok === 1, 429, 'rate_limited', '지금 채팅이 너무 많습니다. 잠시 뒤에 다시 보내 주세요.');
        let ref = null;
        if (b.ref) {
            check(U.ID_RE.test(String(b.ref.aid || '')) && Number.isInteger(b.ref.page) && b.ref.page >= 1 && b.ref.page <= 999, 400, 'bad_ref', '쪽 붙이기가 올바르지 않습니다.');
            ref = { aid: b.ref.aid, page: b.ref.page };
        }
        const t = now(), id = timeId('m', t);
        await guarded(mid, 'chat', tx => tx.set(sub(mid, 'chat', id), { cid: g.cid, text, ref, at: t }));   // 익명: 이름 없음
        res.status(201).json({ id, at: t });
    }));
    router.delete('/:mid/chat/:id', pt(), wrap(async (req, res) => {
        const { mid, g, m } = req, id = req.params.id;
        allow(m, 'chat');
        check(U.ID_RE.test(id), 404, 'not_found', '채팅이 없습니다.');
        const c = await fb.get(sub(mid, 'chat', id));
        check(c, 404, 'not_found', '채팅이 없습니다.');
        check(c.cid === g.cid || g.role === 'host', 403, 'not_owner', '내 글만 지울 수 있습니다.');
        await fb.delete(sub(mid, 'chat', id));
        res.json({ ok: true });
    }));
    router.post('/:mid/hand', pt(), wrap(async (req, res) => {
        const { mid, g, m } = req, b = req.body || {};
        allow(m, 'hand');
        if (b.all) {
            check(g.role === 'host', 403, 'host_only', '주관자만 모두 내릴 수 있습니다.');
            const t = now();
            const hands = await listAll(sub(mid, 'hands'), 1000);
            const old = hands.filter(h => (h.data.at || 0) <= t);
            for (let i = 0; i < old.length; i += 500) await fb.batch(old.slice(i, i + 500).map(h => ({ op: 'delete', path: sub(mid, 'hands', h.id) })));
            return res.json({ lowered: old.length });
        }
        const target = b.cid && b.cid !== g.cid ? String(b.cid) : g.cid;
        if (target !== g.cid) {
            check(g.role === 'host', 403, 'host_only', '남의 손은 주관자만 내릴 수 있습니다.');
            check(!b.up && U.ID_RE.test(target), 400, 'bad_hand', '남의 손은 내리기만 됩니다.');
        }
        if (b.up && target === g.cid) {
            await guarded(mid, 'hand', async tx => {
                const cur = await tx.get(sub(mid, 'hands', g.cid));
                if (!cur) tx.set(sub(mid, 'hands', g.cid), { at: now() });   // 익명: 이름 없음
            });
            return res.json({ up: true });
        }
        await fb.delete(sub(mid, 'hands', target));
        res.json({ up: false, cid: target });
    }));

    // 녹음 내리기: 트랜잭션 안에서 아직 같은 사람이 켜 둔 녹음일 때만(그사이 다른 주관자가 다시 켰으면 두기)
    function recordingOffIf(mid, same) {
        return fb.runTransaction(async tx => {
            const cur = await tx.get(mpath(mid));
            if (cur && cur.recording && same(cur)) tx.update(mpath(mid), { recording: false, recordingBy: null, recordingPerson: null, recordingOffAt: now(), recordingOffBy: cur.recordingBy || null, recordingOffPerson: cur.recordingPerson || null });
        });
    }

    // ================= 접속 표시 (D-3, K2) =================
    // sendBeacon 은 헤더를 못 붙이므로 이 경로만 본문 pt 도 받는다.
    router.post('/:mid/heartbeat', pt({ bodyPt: true, bucket: 'hb', max: RATE.heartbeatPerMin, windowSec: 60 }), wrap(async (req, res) => {
        const { mid, g, m } = req, t = now();
        const leaving = !!req.body?.leaving;
        await guarded(mid, null, tx => tx.set(sub(mid, 'people', g.cid), { role: g.role, seenAt: leaving ? 0 : t, left: leaving }));
        // 녹음을 켠 사람이 나가면(leave) 녹음 표시를 내린다(D5). 90초 넘게 끊긴 경우는 아래 30초 셈에서 본다.
        if (leaving && m.recording && m.recordingBy === g.cid) await recordingOffIf(mid, cur => cur.recordingBy === g.cid);
        let counts = m.counts || null;
        if (t - (m.counts?.at || 0) >= 30000) {
            if (m.recording && m.recordingBy && m.recordingBy !== g.cid) {
                const rp = await fb.get(sub(mid, 'people', m.recordingBy));
                if (!rp || rp.left || (rp.seenAt || 0) < t - 90000) await recordingOffIf(mid, cur => cur.recordingBy === m.recordingBy);
            }
            // 30초에 한 번, 이 요청이 접속자·손 수를 세어 쓴다(트랜잭션으로 한 요청만)
            const people = (await fb.query(sub(mid, 'people'), { where: [['seenAt', '>=', t - 90000]], limit: 500 })).length;
            const hands = (await listAll(sub(mid, 'hands'), 1000)).length;
            counts = await fb.runTransaction(async tx => {
                const cur = await tx.get(mpath(mid));
                if (!cur || t - (cur.counts?.at || 0) < 30000) return cur?.counts || null;
                const c = { people, hands, peak: Math.max(cur.counts?.peak || 0, people), at: t };
                tx.update(mpath(mid), { counts: c });
                return c;
            });
        }
        res.json({ ok: true, counts });
    }));

    // ================= 투표 (F-3) =================
    router.post('/:mid/polls', pt({ host: true }), wrap(async (req, res) => {
        const { mid, g, m } = req, b = req.body || {};
        allow(m, 'poll');
        const q = str(b.q, 200);
        check(q, 400, 'bad_question', '질문을 넣으세요.');
        const labels = b.options === undefined ? ['찬성', '반대', '보류'] : b.options;
        check(Array.isArray(labels) && labels.length >= 2 && labels.length <= LIMIT.pollOptions, 400, 'bad_options', `선택지는 2~${LIMIT.pollOptions}개입니다.`);
        const options = labels.map((l, i) => { const label = str(String(l ?? ''), 40); check(label, 400, 'bad_options', '빈 선택지가 있습니다.'); return { id: 'o' + (i + 1), label }; });
        const pid = U.newId('p');
        const key = K.vote(mid, pid);
        // 원표 장부를 먼저 연다(아직 아무도 pid 를 모른다). 트랜잭션이 거절되면 지운다.
        await redis.hset(key, { '#status': 'open' });
        await redis.expire(key, Math.ceil((m.expiresAt - now()) / 1000) + 86400);
        await remember(redis, mid, key);
        // 익명(ANON): 공개 투표는 없다. anonymous 는 늘 true, 만든 사람 이름도 싣지 않는다.
        const poll = { q, options, anonymous: true, status: 'open', revealed: false, tally: null, total: 0, names: null, createdAt: now() };
        try {
            await guarded(mid, 'poll', async (tx, cur) => {
                const open = cur.pollId ? await tx.get(sub(mid, 'polls', cur.pollId)) : null;
                check(!open || open.status !== 'open', 409, 'poll_open', '열린 투표를 먼저 닫으세요.');
                tx.set(sub(mid, 'polls', pid), poll);
                tx.update(mpath(mid), { pollId: pid });
            });
        } catch (e) { await redis.del(key).catch(() => {}); throw e; }
        res.status(201).json({ pid, poll });
    }));
    async function loadPoll(mid, pid) {
        check(U.ID_RE.test(pid), 404, 'not_found', '투표가 없습니다.');
        const p = await fb.get(sub(mid, 'polls', pid));
        check(p, 404, 'not_found', '투표가 없습니다.');
        return p;
    }
    router.post('/:mid/polls/:pid/vote', pt(), wrap(async (req, res) => {
        const { mid, g, m } = req, pid = req.params.pid;
        allow(m, 'vote');
        const p = await loadPoll(mid, pid);
        const optionId = String(req.body?.optionId || '');
        check(p.options.some(o => o.id === optionId), 400, 'bad_option', '없는 선택지입니다.');
        const r = Number(await redis.eval(LUA.vote, [K.vote(mid, pid)], [g.cid, optionId, '', g.person || '']));
        check(r !== -1, 409, 'poll_closed', '마감된 투표입니다.');
        check(r !== -2, 409, 'already_voted', '이미 다른 창(재입장)에서 투표했습니다. 처음 투표한 창에서 바꿀 수 있습니다.');
        res.json({ ok: true, optionId, changed: r === 1 });
    }));
    // 내 선택(새로고침 뒤 표시용). 남의 선택은 누구에게도 주지 않는다.
    router.get('/:mid/polls/:pid/mine', pt(), wrap(async (req, res) => {
        const { mid, g } = req, pid = req.params.pid;
        await loadPoll(mid, pid);
        const v = await redis.hget(K.vote(mid, pid), g.cid);
        res.json({ optionId: v == null ? null : String(v) });
    }));
    router.get('/:mid/polls/:pid/tally', pt({ host: true }), wrap(async (req, res) => {
        const { mid } = req, pid = req.params.pid;
        const p = await loadPoll(mid, pid);
        const v = readVoteHash(await redis.hgetall(K.vote(mid, pid)), p.options);
        res.json({ status: v.status === 'open' ? 'open' : 'closed', tally: v.tally, total: v.total });
    }));
    router.post('/:mid/polls/:pid/close', pt({ host: true }), wrap(async (req, res) => {
        const { mid, m } = req, pid = req.params.pid;
        allow(m, 'poll');
        await loadPoll(mid, pid);
        await closePoll(mid, pid);
        res.json({ status: 'closed' });
    }));
    router.post('/:mid/polls/:pid/reveal', pt({ host: true }), wrap(async (req, res) => {
        const { mid, m } = req, pid = req.params.pid;
        allow(m, 'poll');
        const p = await loadPoll(mid, pid);
        await redis.hset(K.vote(mid, pid), { '#status': 'closed' });   // 보이기 = 마감
        await redis.expire(K.vote(mid, pid), KEEP_SEC);
        const v = readVoteHash(await redis.hgetall(K.vote(mid, pid)), p.options);
        // 익명(ANON): 결과는 항목별 수만. 옛 공개 투표 문서여도 이름은 싣지 않는다.
        const patch = { status: 'closed', revealed: true, tally: v.tally, total: v.total, names: null, anonymous: true, closedAt: p.closedAt || now() };
        await guarded(mid, 'poll', tx => tx.update(sub(mid, 'polls', pid), patch));
        res.json({ poll: { ...p, ...patch } });
    }));

    // ================= 녹음 → 대화 기록 (G-1) =================
    // 본문 = 소리 조각 그대로(Content-Type audio/webm 등, ≤3MB). ?n=조각번호&at=시작시각ms&aid=&page=
    // 받아쓰기 허용: 진행 중이거나, 끝난 지 2분 안이고 조각 시작 시각(at)이 끝낸 시각보다 앞일 때(D5)
    // 녹음 표시가 켜져 있고 켠 사람이 보낼 때만 받는다(감사 R2 M3). 끝난 뒤 유예 조각은 끝내기가 표시를 내렸으므로 예외.
    // 감사 R3 P1: 화면은 mr.stop() 뒤 곧바로 녹음을 끄고, 마지막 조각은 그 뒤(onstop)에 보낸다. 그래서 녹음을 끈 사람이
    // 끈 뒤 90초 안에 보내는 이어지는 조각(꼬리)은 받는다. 돌려주는 값: 'on' | 'tail' | 'grace'.
    // since = 요청을 받은 시각. 트랜잭션에서 다시 볼 때 그 뒤에 꺼졌으면(받아쓰기 처리 중 끔) 켜져 있던 것으로 본다.
    // 같은 녹음 세션: 켠(끈) cid 이거나, 같은 사람 열쇠(같은 로그인 세션으로 다시 들어온 주관자, 감사 R4 Q6)
    const sameRec = (cid, person, g) => cid === g.cid || (!!person && !!g.person && person === g.person);
    // at = 조각 시작 시각(없으면 null). 꼬리 조각은 끄기 전에 시작한 것만(감사 R4 Q3).
    function recordingOn(m, g, grace, t, since = null, at = null) {
        if (grace) return 'grace';
        if (m.recording === true && (!m.recordingBy || sameRec(m.recordingBy, m.recordingPerson, g))) return 'on';
        if (m.recording !== true && m.recordingOffBy && sameRec(m.recordingOffBy, m.recordingOffPerson, g) && Number.isFinite(m.recordingOffAt)) {
            if (since !== null && m.recordingOffAt >= since) return 'on';
            if (t - m.recordingOffAt <= LIMIT.recordingTailMs) {
                check(at !== null && at < m.recordingOffAt, 409, 'recording_not_on', '녹음을 끈 뒤에 시작한 조각은 받지 않습니다.');
                return 'tail';
            }
        }
        fail(409, 'recording_not_on', '녹음이 켜져 있지 않습니다. 녹음 단추를 다시 눌러 주세요.');
    }
    // 돌려주는 값: true = 끝난 뒤 유예 조각(아래 graceCheck 를 더 거친다)
    function allowTranscribe(m, at, t) {
        if (m.status === 'ended' && at !== null && Number.isFinite(m.endedAt) && t - m.endedAt <= LIMIT.transcribeGraceMs && at < m.endedAt) return true;
        allow(m, 'transcribe');
        return false;
    }
    // 유예 조각은 주관자가 보낸 at 만 믿지 않는다(R1-N4): 이미 받은 조각은 덮어쓰지 않고,
    // 받은 조각 바로 뒤 번호(앞 3개 안에 받은 조각이 있거나 n<3)만 받는다. get = fb.get 또는 tx.get.
    async function graceCheck(get, mid, n, why = '회의가 끝났습니다. 끝내기 전에 녹음하던 조각만 받습니다.') {
        check(!(await get(sub(mid, 'transcript', 't' + String(n).padStart(5, '0')))), 409, 'transcript_exists', '이미 받은 조각입니다.');
        if (n < 3) return;
        for (let k = n - 1; k >= n - 3; k--) if (await get(sub(mid, 'transcript', 't' + String(k).padStart(5, '0')))) return;
        fail(409, why === null ? 'recording_not_on' : 'state_ended', why || '녹음이 꺼졌습니다. 끄기 전에 녹음하던 조각만 받습니다.');
    }
    // 꼬리 조각(R3 P1): 덮어쓰지 않고 받은 조각 바로 뒤 번호만, 녹음을 한 번 끌 때마다 3개까지(받아쓰기 비용을 묶는다)
    // 꼬리 개수는 저장에 성공한 조각만 센다(감사 R4 Q3: Groq 429·502 재시도를 세지 않는다). 덮어쓰기를 막으므로 번호마다 한 번.
    const tailKey = (mid, m) => K.rl(mid, 'tail', String(m.recordingOffAt));
    async function tailCheck(get, mid, n, m) {
        await graceCheck(get, mid, n, null);
        let c; try { c = Number(await redis.get(tailKey(mid, m)) || 0); } catch { fail(503, 'redis_down', '잠시 쭘을 쓸 수 없습니다(저장소 장애).'); }
        check(c < 3, 429, 'rate_limited', '녹음을 끈 뒤 받는 조각이 너무 많습니다.');
    }
    router.post('/:mid/transcribe', express.raw({ type: () => true, limit: '3mb' }), pt({ host: true }), wrap(async (req, res) => {
        const { mid, m } = req;
        const t0 = now();
        const at0 = req.query.at !== undefined && Number.isFinite(Number(req.query.at)) ? clamp(Number(req.query.at), t0 - 300000, t0) : null;
        const grace = allowTranscribe(m, at0, t0);
        check(m.allowRecording !== false, 403, 'recording_off', '이 회의는 녹음을 허용하지 않았습니다.');
        const mode = recordingOn(m, req.g, grace, t0, null, at0);
        check(groq, 503, 'no_groq', '받아쓰기 설정이 없습니다.');
        const mime = String(req.get('Content-Type') || '').split(';')[0].trim().toLowerCase();
        check(AUDIO_TYPES.includes(mime), 415, 'bad_audio', '소리 형식(webm·mp4·ogg·mp3·wav)이 아닙니다.');
        const buf = Buffer.isBuffer(req.body) ? req.body : null;
        check(buf && buf.length > 0, 400, 'empty_audio', '소리 조각이 비었습니다.');
        const n = Number(req.query.n);
        check(Number.isInteger(n) && n >= 0 && n < 10000, 400, 'bad_n', '조각 번호(n)가 필요합니다.');
        if (grace) {
            await graceCheck(p => fb.get(p), mid, n);
            // 유예 조각은 회의당 5개까지(받아쓰기 비용을 묶는다)
            let c; try { c = await incrEx(redis, K.rl(mid, 'grace', 'end'), 600); } catch { fail(503, 'redis_down', '잠시 쭘을 쓸 수 없습니다(저장소 장애).'); }
            check(c <= 5, 429, 'rate_limited', '끝낸 뒤 받는 녹음 조각이 너무 많습니다.');
        }
        if (mode === 'tail') await tailCheck(p => fb.get(p), mid, n, m);
        const t = now();
        const at = Number.isFinite(Number(req.query.at)) && req.query.at !== undefined ? clamp(Number(req.query.at), t - 300000, t) : t;
        let aid = m.live?.aid || null, page = m.live?.page || null;
        if (U.ID_RE.test(String(req.query.aid || '')) && Number.isInteger(Number(req.query.page))) { aid = String(req.query.aid); page = Number(req.query.page); }
        const r = await groq.transcribe({ buffer: buf, mime, language: 'ko' });   // 소리는 여기서 버린다
        if (!r.ok && r.status === 429) {
            // 모든 키가 한도(429) — 화면 대기열이 retryAfter 초 뒤 같은 조각을 다시 보낸다
            const ra = Number.isFinite(r.retryAfter) && r.retryAfter > 0 ? Math.ceil(r.retryAfter) : null;
            if (ra) res.set('Retry-After', String(ra));
            fail(429, 'groq_busy', '받아쓰기 한도에 걸렸습니다. 잠시 뒤 다시 보냅니다.', ra ? { retryAfter: ra } : undefined);
        }
        if (!r.ok) fail(502, 'groq_failed', '받아쓰기에 실패했습니다.');
        const id = 't' + String(n).padStart(5, '0');                                // 같은 조각 재시도는 덮어쓴다
        // 응답을 기다리는 사이 회의가 끝나거나 지워졌으면 쓰지 않는다(지적04)
        // 끝난 뒤 유예 시간 안의 조각은 응답을 기다린 시간만큼 늦어도 받는다(시각은 요청을 받은 t0 기준)
        await guarded(mid, null, async (tx, cur) => {
            const gr = allowTranscribe(cur, at0, t0);
            const md = recordingOn(cur, req.g, gr, t0, mode === 'on' ? t0 : null, at0);
            if (gr) await graceCheck(p => tx.get(p), mid, n);
            else if (md === 'tail') await graceCheck(p => tx.get(p), mid, n, null);
            tx.set(sub(mid, 'transcript', id), { n, at, text: r.text, aid, page });
            // 다시 들어온 녹음자(같은 사람 열쇠, 새 cid)가 녹음을 넘겨받는다 — 옛 cid 가 끊겼다고 heartbeat 가 녹음을 내리지 않게(R4 Q6)
            if (md === 'on' && cur.recording === true && cur.recordingBy && cur.recordingBy !== req.g.cid) tx.update(mpath(mid), { recordingBy: req.g.cid });
        });
        if (mode === 'tail') await incrEx(redis, tailKey(mid, m), 300).catch(e => console.warn('[zzoom] 꼬리 조각 세기 실패:', e.message));
        res.status(201).json({ id, n, text: r.text });
    }));

    // ================= AI용 md (G-2) =================
    router.get('/:mid/export.md', pt({ host: true }), wrap(async (req, res) => {
        const { mid, m } = req;
        const [agenda, transcript, chat, pollDocs] = await Promise.all(['agenda', 'transcript', 'chat', 'polls'].map(s => listAll(sub(mid, s))));
        const polls = [];
        for (const d of pollDocs.sort((a, b) => (a.data.createdAt || 0) - (b.data.createdAt || 0))) {
            const p = d.data;
            const v = readVoteHash(await redis.hgetall(K.vote(mid, d.id)), p.options);
            polls.push({ q: p.q, options: p.options, tally: v.tally, total: v.total });   // 익명: 이름 없음
        }
        const md = buildMarkdown({ meeting: m, agenda, transcript, chat, polls });
        const fname = `쭘_${String(m.title).replace(/[\\/:*?"<>|\s]+/g, '_').slice(0, 40)}_${U.kstDate(m.startedAt || m.startsAt || m.createdAt)}.md`;
        res.set('Content-Type', 'text/markdown; charset=utf-8');
        res.set('Content-Disposition', `attachment; filename="zzoom.md"; filename*=UTF-8''${encodeURIComponent(fname)}`);
        res.send(md);
    }));

    // ---- 오류 ----
    // eslint-disable-next-line no-unused-vars
    router.use((err, req, res, next) => {
        if (err instanceof U.ZzError) return res.status(err.status).json({ error: err.code, message: err.message, ...(err.extra || {}) });
        if (err.type === 'entity.too.large') return res.status(413).json({ error: 'too_large', message: '보낸 내용이 너무 큽니다.' });
        if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'bad_json', message: 'JSON 이 올바르지 않습니다.' });
        if (err.status === 503) return res.status(503).json({ error: err.code || 'unavailable', message: err.message });
        console.error('[zzoom]', req.method, req.path, err);
        // Firestore·Storage(REST) 장애: 일시적이면 503, 그 밖 저장소 오류는 502. 코드 결함만 500.
        if (err.code === 'deadline' || err.code === 'aborted' || err.status === 409) return res.status(503).json({ error: 'store_busy', message: '저장소가 바쁩니다. 잠시 뒤 다시 하세요.' });
        if (err.status === 502 || err.code === 'gcp_error' || err.code === 'not_found' || /storage|firestore|google api|fake/i.test(String(err.message))) return res.status(502).json({ error: 'store_failed', message: '저장소 오류가 났습니다. 잠시 뒤 다시 하세요.' });
        res.status(500).json({ error: 'server_error', message: '서버 오류가 났습니다.' });
    });
    return router;
}

module.exports = { createRouter, hashCode, LIMIT, ALLOW, RATE, zzoomEnabled, DISABLED_HTML, webpSize };
