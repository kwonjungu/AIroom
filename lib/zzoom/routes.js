'use strict';
// 쭘(ZZOOM) 서버 API — DESIGN.md v2 파트 A·C-5·D·E·F·G·H. server.js 가 /api/zzoom 에 붙인다.
// 쓰기는 전부 여기서 검사한 뒤 fb(Firestore·Storage) 에 쓴다. 비밀(코드 해시·참가 자격·원표·장부)은 Redis 에만.
const express = require('express');
const crypto = require('node:crypto');
const U = require('./util');
const { K, LUA, incrEx, remember, readJson, readVoteHash } = require('./keys');
const { runPurge, purgeMeeting, enqueue, removeOldStrokes, removePrefix, MEETINGS } = require('./purge');
const { buildMarkdown } = require('./export-md');
const { AUDIO_TYPES } = require('./whisper');

const { check, fail, str, isNum, clamp } = U;
const DAY = 86400000;
const TEN_DAYS = 10 * DAY;
const PT_LIFE = 12 * 3600000;
const CODE_TTL_SEC = 21 * 86400;             // 회의는 길어야 20일(만든 뒤 10일 안에 첫 입장 + 10일)
const KINDS = ['pdf', 'image', 'hwp', 'hwpx', 'pptx'];
const IMAGE_EXT = ['png', 'jpg', 'jpeg', 'webp'];
const LIMIT = {
    pages: 200, originalBytes: 52428800 - 1, pageBytes: 4 * 1048576, thumbBytes: 512 * 1024, px: 2000,
    agenda: 30, chat: 500, pageStrokes: 2000, meetingStrokes: 20000, strokeNums: 4500, strokeBatch: 20,
    pollOptions: 6, title: 80, agendaTitle: 100, name: 20
};
const ORIGINAL_TYPES = /^(application\/pdf|application\/octet-stream|application\/vnd\..+|application\/haansoft.*|application\/x-hwp|image\/(png|jpeg|webp))$/;
// 상태별 허용표 (DESIGN D-4)
const ALLOW = {
    ready: new Set(['upload', 'agenda', 'board', 'stroke', 'chat', 'state', 'presenter']),
    live: new Set(['upload', 'agenda', 'board', 'stroke', 'chat', 'state', 'presenter', 'live', 'hand', 'poll', 'vote', 'transcribe']),
    ended: new Set()
};
const PAGE_KEY = /^([a-z][a-z0-9]{6,20})_(\d{1,3})$/;
// 판서 색(DESIGN E, perfect-freehand 1.2.3): 형광펜 3색 · 펜 3색
const PALETTE = { hl: ['#FFE14D', '#9BE15D', '#FF8AD8'], pen: ['#E5484D', '#2F6FEB', '#1d1d1f'] };

const mpath = mid => `${MEETINGS}/${mid}`;
const sub = (mid, s, id) => `${MEETINGS}/${mid}/${s}${id ? '/' + id : ''}`;
// 시간 순으로 이름이 정렬되는 id
const timeId = (p, ms) => p + Math.floor(ms).toString(36).padStart(9, '0') + U.newId('x').slice(1, 6);

function hashCode(code, salt = crypto.randomBytes(16).toString('hex')) {
    return { hash: crypto.pbkdf2Sync(code, salt, 120000, 32, 'sha256').toString('hex'), salt };
}

function createRouter({ redis, validateSession, fb, groq, now = Date.now, isCopy = req => !!req.isCopy, env = process.env, purgeBudgetMs = 50000, deletePurgeBudgetMs = 20000 }) {
    const router = express.Router();
    const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

    // ① 시연본(/api/copy/zzoom)은 무조건 막는다. 저장소에 닿기 전에.
    router.use((req, res, next) => isCopy(req) ? res.status(403).json({ error: 'copy_blocked', message: '시연용 카피본에서는 쭘을 쓸 수 없습니다.' }) : next());
    router.use((req, res, next) => { res.set('Cache-Control', 'no-store'); res.set('X-Content-Type-Options', 'nosniff'); next(); });
    router.get('/health', (req, res) => res.json({ ok: !!(fb && redis), firebase: !!fb, redis: !!redis }));
    router.use((req, res, next) => (fb && redis) ? next() : res.status(503).json({ error: 'not_configured', message: '쭘 서버 설정(Firebase 서비스 계정·Redis)이 아직 없습니다.' }));
    router.use(express.json({ limit: '1mb' }));
    router.use((req, res, next) => { if (['POST', 'PATCH'].includes(req.method) && req.is('application/json') && (typeof req.body !== 'object' || Array.isArray(req.body))) return res.status(400).json({ error: 'bad_body', message: 'JSON 객체를 보내세요.' }); next(); });

    // ---- 공통 검사 ----
    const ipOf = req => String(req.ip || req.socket?.remoteAddress || '').slice(0, 64);
    async function session(req) { return validateSession(req.get('X-Auth-Token')); }
    const login = wrap(async (req, res, next) => { const s = await session(req); check(s, 401, 'login_required', '백암이에서 먼저 로그인하세요.'); req.sess = s; next(); });
    const admin = wrap(async (req, res, next) => { const s = await session(req); check(s, 401, 'login_required', '백암이에서 먼저 로그인하세요.'); check(s.role === 'admin', 403, 'admin_only', '관리자만 할 수 있습니다.'); req.sess = s; next(); });
    const gone = m => m.status === 'deleting' || now() >= m.expiresAt;
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
    function pt({ host = false, bodyPt = false } = {}) {
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
            if (host) {
                check(g.role === 'host', 403, 'host_only', '주관자만 할 수 있습니다.');
                check(role === 'host', 403, 'host_revoked', '주관 코드가 바뀌었습니다. 주관 코드를 다시 넣으세요.');
            }
            await rate(h.slice(0, 24), 'all', 5);
            req.g = { ...g, role, h }; req.m = m; req.mid = req.params.mid;
            next();
        });
    }
    const presenterOnly = (req, res, next) => { check(req.m.presenter?.cid === req.g.cid, 403, 'not_presenter', '진행자만 할 수 있습니다.'); next(); };

    async function issue(mid, m, { cid, name, role, via, grantVer }) {
        const p = U.rand(32);
        const exp = Math.min(now() + PT_LIFE, m.expiresAt);
        await redis.set(K.pt(U.sha256(p)), JSON.stringify({ mid, cid, name, role, via, grantVer, exp }), { ex: Math.max(1, Math.ceil((exp - now()) / 1000)) });
        const token = await fb.createCustomToken('zz_' + cid, { zz: 1, mid, role: role === 'host' ? 'host' : 'viewer', until: m.expiresAt });
        return { pt: p, cid, name, role, exp, until: m.expiresAt, token };
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
        const p = await fb.get(sub(mid, 'polls', pid));
        if (p && p.status === 'open') await fb.update(sub(mid, 'polls', pid), { status: 'closed', closedAt: now() });
        return p;
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
            if (isAdmin) s.hostLocked = Number(await redis.get(K.tryAll(d.id)) || 0) >= 50;
            out.push(s);
        }
        out.sort((a, b) => b.startsAt - a.startsAt);
        res.json({ meetings: out, isAdmin });
    }));
    router.post('/meetings', admin, wrap(async (req, res) => {
        const b = req.body || {};
        const title = str(b.title, LIMIT.title);
        check(title, 400, 'bad_title', '회의 제목을 넣으세요.');
        const startsAt = parseStartsAt(b.startsAt);
        check(/^\d{6}$/.test(String(b.hostCode || '')), 400, 'bad_code', '주관 코드는 숫자 6자리입니다.');
        const mid = U.newMid(), t = now();
        await redis.set(K.code(mid), JSON.stringify({ ...hashCode(String(b.hostCode)), grantVer: 1 }), { ex: CODE_TTL_SEC });
        const m = {
            title, startsAt, status: 'ready', createdAt: t, firstKeyAt: null, expiresAt: t + TEN_DAYS, startedAt: null, endedAt: null,
            allowRecording: b.allowRecording !== false, agendaOrder: [], boardCount: 0, live: null, presenter: null, penLock: false,
            pollId: null, recording: false, counts: { people: 0, hands: 0, peak: 0, at: 0 }
        };
        await fb.set(mpath(mid), m);
        res.status(201).json({ meeting: summary(mid, m) });
    }));
    router.patch('/meetings/:mid', admin, wrap(async (req, res) => {
        const mid = req.params.mid, b = req.body || {};
        const m = await loadMeeting(mid);
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
    router.delete('/meetings/:mid', admin, wrap(async (req, res) => {
        const mid = req.params.mid;
        const m = await fb.get(mpath(mid));
        const queued = Object.keys((await redis.hgetall(K.purge)) || {}).includes(mid);
        check(m || queued, 404, 'not_found', '회의가 없습니다.');
        if (m && m.status !== 'deleting') await fb.update(mpath(mid), { status: 'deleting' });
        await enqueue(redis, mid, now());
        const done = await purgeMeeting({ fb, redis, now }, mid, now() + deletePurgeBudgetMs);
        res.json({ deleted: done, queued: !done });
    }));
    router.post('/meetings/:mid/unlock', admin, wrap(async (req, res) => {
        const mid = req.params.mid;
        await loadMeeting(mid);
        const idx = Object.keys((await redis.hgetall(K.keys(mid))) || {}).filter(k => k.startsWith(`zz:try:${mid}:`));
        await redis.del(K.tryAll(mid), ...idx);
        res.json({ ok: true });
    }));

    // ================= 입장·주관·재발급 =================
    router.post('/:mid/join', login, wrap(async (req, res) => {
        const mid = req.params.mid;
        await rate('ip' + U.sha256(ipOf(req)).slice(0, 16), 'join', 20, 60);
        const name = str(req.body?.name, LIMIT.name);
        check(name, 400, 'bad_name', '이름을 넣으세요.');
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
        const cid = U.newId('c');
        const out = await issue(mid, m, { cid, name, role: isAdmin ? 'host' : 'viewer', via: isAdmin ? 'admin' : null, grantVer: null });
        await fb.set(sub(mid, 'people', cid), { name, role: out.role, seenAt: now() });
        res.json({ ...out, meeting: view(mid, m) });
    }));
    router.post('/:mid/host', pt(), wrap(async (req, res) => {
        const { mid, g, m } = req;
        if (g.role === 'host') { await redis.del(K.pt(g.h)); return res.json({ ...(await issue(mid, m, g)), meeting: view(mid, m) }); }
        const code = String(req.body?.code ?? '');
        const ipKey = K.tryIp(mid, U.sha256(ipOf(req)).slice(0, 16)), cidKey = K.tryCid(mid, g.cid);
        // 먼저 세고(INCR 원자) 나중에 확인한다 — 동시에 여러 번 보내도 한도를 넘지 못한다. 맞으면 되돌린다.
        const ttlAll = Math.ceil((m.expiresAt - now()) / 1000) + 86400;
        let nAll, nIp, nMe;
        try {
            [nAll, nIp, nMe] = await Promise.all([incrEx(redis, K.tryAll(mid), ttlAll), incrEx(redis, ipKey, 3600), incrEx(redis, cidKey, 3600)]);
            await remember(redis, mid, ipKey, cidKey);
        } catch { fail(503, 'redis_down', '잠시 주관 입장을 할 수 없습니다.'); }
        check(nAll <= 50, 423, 'host_locked', '주관 코드가 50번 틀려 주관 입장이 잠겼습니다. 관리자에게 풀어 달라고 하세요.');
        check(nIp <= 20 && nMe <= 5, 429, 'too_many_attempts', '주관 코드를 너무 많이 틀렸습니다. 1시간 뒤에 다시 하세요.');
        const rec = await readJson(redis, K.code(mid));
        check(rec, 503, 'no_code', '주관 코드가 설정돼 있지 않습니다.');
        const good = /^\d{6}$/.test(code) && U.safeEqual(hashCode(code, rec.salt).hash, rec.hash);
        if (!good) fail(403, 'wrong_code', '주관 코드가 맞지 않습니다.', { left: Math.max(0, Math.min(50 - nAll, 20 - nIp, 5 - nMe)) });
        await Promise.all([redis.decr(K.tryAll(mid)), redis.decr(ipKey), redis.decr(cidKey)]);
        await redis.del(K.pt(g.h));
        const out = await issue(mid, m, { cid: g.cid, name: g.name, role: 'host', via: 'code', grantVer: rec.grantVer });
        await fb.update(sub(mid, 'people', g.cid), { role: 'host' }).catch(() => fb.set(sub(mid, 'people', g.cid), { name: g.name, role: 'host', seenAt: now() }));
        res.json({ ...out, meeting: view(mid, m) });
    }));
    // 맞춤 토큰만 다시 받는다(재연결). 코드가 바뀐 host 는 viewer 로 내려간다.
    router.post('/:mid/refresh', pt(), wrap(async (req, res) => {
        const { mid, g, m } = req;
        if (g.role !== 'host' && g.via === 'code') {
            const { h, ...rest } = g;
            await redis.set(K.pt(h), JSON.stringify({ ...rest, role: 'viewer', via: null, grantVer: null }), { ex: Math.max(1, Math.ceil((g.exp - now()) / 1000)) });
        }
        const token = await fb.createCustomToken('zz_' + g.cid, { zz: 1, mid, role: g.role === 'host' ? 'host' : 'viewer', until: m.expiresAt });
        res.json({ token, role: g.role, cid: g.cid, name: g.name, exp: g.exp, until: m.expiresAt, meeting: view(mid, m) });
    }));

    // ================= 회의 상태·진행 =================
    router.post('/:mid/state', pt({ host: true }), wrap(async (req, res) => {
        const { mid, g } = req, action = req.body?.action;
        allow(req.m, 'state');
        const out = await fb.runTransaction(async tx => {
            const m = await tx.get(mpath(mid));
            check(m && !gone(m), 410, 'meeting_gone', '삭제됐거나 기한이 지난 회의입니다.');
            allow(m, 'state');
            const t = now(); let patch;
            if (action === 'start') {
                check(m.status === 'ready', 409, 'state_' + m.status, '이미 시작한 회의입니다.');
                const epoch = (m.presenter?.epoch || 0) + 1;
                const presenter = m.presenter?.cid ? { ...m.presenter } : { cid: g.cid, name: g.name, epoch };
                const ep = presenter.epoch;
                patch = { status: 'live', startedAt: t, presenter, live: { aid: (m.agendaOrder || [])[0] || null, page: 1, view: { cx: 0.5, cy: 0.5, z: 1 }, rev: 1, epoch: ep, forceSeq: 0, at: t } };
            } else if (action === 'end') {
                patch = { status: 'ended', endedAt: t, recording: false };
            } else if (action === 'penLock') {
                patch = { penLock: !!req.body.value };
            } else if (action === 'recording') {
                check(m.status === 'live', 409, 'state_' + m.status, '회의 중에만 녹음할 수 있습니다.');
                check(m.allowRecording !== false, 403, 'recording_off', '이 회의는 녹음을 허용하지 않았습니다.');
                patch = { recording: !!req.body.value };
            } else fail(400, 'bad_action', 'action 은 start·end·penLock·recording 가운데 하나입니다.');
            tx.update(mpath(mid), patch);
            return { ...m, ...patch };
        });
        // 끝내기: 열린 투표를 닫는다
        if (action === 'end' && out.pollId) await closePoll(mid, out.pollId);
        res.json({ meeting: view(mid, out) });
    }));
    router.post('/:mid/presenter', pt({ host: true }), wrap(async (req, res) => {
        const { mid, g } = req;
        allow(req.m, 'presenter');
        const out = await fb.runTransaction(async tx => {
            const m = await tx.get(mpath(mid));
            check(m && !gone(m), 410, 'meeting_gone', '삭제됐거나 기한이 지난 회의입니다.');
            allow(m, 'presenter');
            const epoch = Math.max(m.presenter?.epoch || 0, m.live?.epoch || 0) + 1;
            const patch = { presenter: { cid: g.cid, name: g.name, epoch } };
            if (m.live) patch.live = { ...m.live, epoch, at: now() };
            tx.update(mpath(mid), patch);
            return { ...m, ...patch };
        });
        res.json({ presenter: out.presenter, live: out.live || null });
    }));
    router.post('/:mid/live', pt({ host: true }), wrap(async (req, res) => {
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
                const a = await tx.get(sub(mid, 'agenda', b.aid));
                check(m && m.status === 'live' && !gone(m), 409, 'state_' + (m?.status || 'gone'), '회의 중이 아닙니다.');
                const cur = m.live || { rev: 0, epoch: 0, forceSeq: 0 };
                if (m.presenter?.cid !== g.cid || m.presenter.epoch !== b.epoch || cur.epoch !== b.epoch) fail(409, 'not_presenter', '진행권이 바뀌었습니다.', { live: m.live || null, presenter: m.presenter || null });
                if (cur.rev !== b.baseRev) fail(409, 'stale_rev', '진행 상태가 이미 바뀌었습니다.', { live: m.live || null, presenter: m.presenter || null });
                check(a && (m.agendaOrder || []).includes(b.aid), 400, 'bad_aid', '없는 안건입니다.');
                check(b.page <= a.pages, 400, 'bad_page', '없는 쪽입니다.');
                const next = { aid: b.aid, page: b.page, view: viewOk, rev: cur.rev + 1, epoch: b.epoch, forceSeq: (cur.forceSeq || 0) + (b.force ? 1 : 0), at: now() };
                tx.update(mpath(mid), { live: next });
                return next;
            });
            res.json({ live });
        }
    }));

    // ================= 업로드 (C-5) =================
    router.post('/:mid/uploads', pt({ host: true }), wrap(async (req, res) => {
        const { mid, g, m } = req, b = req.body || {};
        allow(m, 'upload');
        check(KINDS.includes(b.kind), 400, 'bad_kind', '올릴 수 없는 형식입니다.');
        check(Number.isInteger(b.pages) && b.pages >= 1 && b.pages <= LIMIT.pages, 400, 'bad_pages', `쪽 수는 1~${LIMIT.pages}쪽입니다.`);
        check(Number.isInteger(b.bytes) && b.bytes >= 1 && b.bytes <= LIMIT.originalBytes, 413, 'too_large', '원본은 50MB 미만이어야 합니다.');
        check((m.agendaOrder || []).length < LIMIT.agenda, 409, 'agenda_full', `안건은 ${LIMIT.agenda}개까지입니다.`);
        let ext = b.kind;
        if (b.kind === 'image') { ext = String(b.ext || '').toLowerCase(); check(IMAGE_EXT.includes(ext), 400, 'bad_ext', '그림은 png·jpg·webp 만 됩니다.'); }
        const uploadId = U.newId('u');
        const t = now();
        await redis.set(K.up(uploadId), JSON.stringify({ mid, cid: g.cid, kind: b.kind, pages: b.pages, bytes: b.bytes, ext, at: t }), { ex: 86400 });
        await redis.hset(K.uploads, { [`${mid}/${uploadId}`]: t });
        await remember(redis, mid, K.up(uploadId));
        const pad = n => String(n).padStart(3, '0');
        const pages = Array.from({ length: b.pages }, (_, i) => `p${pad(i + 1)}.webp`);
        res.status(201).json({
            uploadId, path: `zzoom/${mid}/up/${uploadId}/`,
            files: { pages, thumbs: pages.map(p => 't' + p.slice(1)), original: `original.${ext}` },
            limits: { pageBytes: LIMIT.pageBytes, thumbBytes: LIMIT.thumbBytes, originalBytes: LIMIT.originalBytes },
            expiresAt: t + DAY
        });
    }));
    router.post('/:mid/uploads/:uploadId/commit', pt({ host: true }), wrap(async (req, res) => {
        const { mid, g, m } = req, b = req.body || {}, uploadId = req.params.uploadId;
        allow(m, 'upload');
        check(U.ID_RE.test(uploadId) && uploadId[0] === 'u', 404, 'upload_unknown', '업로드 허가가 없습니다.');
        const aid = 'a' + uploadId.slice(1);
        const done = await fb.get(sub(mid, 'agenda', aid));
        if (done) return res.json({ aid, agenda: done, already: true });       // commit 재시도는 같은 결과
        const permit = await readJson(redis, K.up(uploadId));
        check(permit && permit.mid === mid, 404, 'upload_unknown', '업로드 허가가 없거나 만료됐습니다.');
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
        for (let i = 1; i <= permit.pages; i++) {
            for (const [nm, max] of [[`p${pad(i)}.webp`, LIMIT.pageBytes], [`t${pad(i)}.webp`, LIMIT.thumbBytes]]) {
                const it = byName.get(nm);
                if (!it) bad(`${nm} 파일이 없습니다.`);
                if (it.contentType !== 'image/webp') bad(`${nm} 형식이 webp 가 아닙니다.`);
                if (!(it.size > 0 && it.size <= max)) bad(`${nm} 크기가 한도를 넘습니다.`);
                byName.delete(nm);
            }
        }
        let original = null;
        const on = `original.${permit.ext}`;
        if (byName.has(on)) {
            const it = byName.get(on);
            if (it.size !== permit.bytes) bad('원본 크기가 허가받은 크기와 다릅니다.');
            if (!ORIGINAL_TYPES.test(it.contentType || '')) bad('원본 형식이 허용되지 않습니다.');
            original = { path: prefix + on, name: str(b.originalName, 120) || on, bytes: it.size };
            byName.delete(on);
        }
        if (byName.size) bad('허가받지 않은 파일이 있습니다: ' + [...byName.keys()].slice(0, 3).join(', '));
        const agenda = { title, kind: permit.kind, pages: permit.pages, sizes, ver: 1, base: prefix.slice(0, -1), original, createdBy: g.name, createdAt: now() };
        await fb.runTransaction(async tx => {
            const cur = await tx.get(mpath(mid));
            const exists = await tx.get(sub(mid, 'agenda', aid));
            check(cur && !gone(cur), 410, 'meeting_gone', '삭제됐거나 기한이 지난 회의입니다.');
            allow(cur, 'upload');
            if (exists) return;
            check((cur.agendaOrder || []).length < LIMIT.agenda, 409, 'agenda_full', `안건은 ${LIMIT.agenda}개까지입니다.`);
            tx.set(sub(mid, 'agenda', aid), agenda);
            tx.update(mpath(mid), { agendaOrder: [...(cur.agendaOrder || []), aid] });
        });
        await redis.del(K.up(uploadId));
        await redis.hdel(K.uploads, `${mid}/${uploadId}`);
        res.status(201).json({ aid, agenda });
    }));

    // ================= 안건·화이트보드 =================
    router.patch('/:mid/agenda/:aid', pt({ host: true }), wrap(async (req, res) => {
        const { mid } = req, aid = req.params.aid, b = req.body || {};
        allow(req.m, 'agenda');
        check(U.ID_RE.test(aid), 404, 'not_found', '안건이 없습니다.');
        const out = await fb.runTransaction(async tx => {
            const m = await tx.get(mpath(mid));
            const a = await tx.get(sub(mid, 'agenda', aid));
            check(m && !gone(m), 410, 'meeting_gone', '삭제됐거나 기한이 지난 회의입니다.');
            allow(m, 'agenda');
            check(a, 404, 'not_found', '안건이 없습니다.');
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
    router.delete('/:mid/agenda/:aid', pt({ host: true }), wrap(async (req, res) => {
        const { mid } = req, aid = req.params.aid;
        allow(req.m, 'agenda');
        check(U.ID_RE.test(aid), 404, 'not_found', '안건이 없습니다.');
        const a = await fb.runTransaction(async tx => {
            const m = await tx.get(mpath(mid));
            const a = await tx.get(sub(mid, 'agenda', aid));
            check(m && !gone(m), 410, 'meeting_gone', '삭제됐거나 기한이 지난 회의입니다.');
            allow(m, 'agenda');
            check(a, 404, 'not_found', '안건이 없습니다.');
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
            const agenda = { title: `화이트보드 ${n}`, kind: 'board', bg, pages: 1, sizes: [{ w: 1600, h: 1000 }], ver: 1, boardNo: n, createdBy: g.name, createdAt: now() };
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
        await rate(g.h.slice(0, 24), 'stroke', 1);
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
        // 쪽이 실제로 있고 epoch 가 지금 것인지
        const aids = [...new Set(clean.map(s => s.aid))], keys = [...new Set(clean.map(s => s.pageKey))];
        const agendas = Object.fromEntries(await Promise.all(aids.map(async a => [a, await fb.get(sub(mid, 'agenda', a))])));
        const epochs = Object.fromEntries(await Promise.all(keys.map(async k => [k, (await fb.get(sub(mid, 'pages', k)))?.epoch || 0])));
        for (const s of clean) {
            const a = agendas[s.aid];
            check(a && (m.agendaOrder || []).includes(s.aid) && s.page >= 1 && s.page <= a.pages, 400, 'bad_pageKey', '없는 쪽입니다.');
            check(s.epoch === epochs[s.pageKey], 409, 'stale_epoch', '이 쪽은 이미 지워졌습니다.', { pageKey: s.pageKey, epoch: epochs[s.pageKey] });
        }
        // 상한: 쪽당 2,000 · 회의당 2만
        const per = {}; for (const s of clean) per[s.pageKey] = (per[s.pageKey] || 0) + 1;
        const total = await redis.hincrby(K.sc(mid), 'all', clean.length);
        const pageCounts = {};
        for (const [k, n] of Object.entries(per)) pageCounts[k] = await redis.hincrby(K.sc(mid), k, n);
        if (total > LIMIT.meetingStrokes || Object.values(pageCounts).some(n => n > LIMIT.pageStrokes)) {
            await redis.hincrby(K.sc(mid), 'all', -clean.length);
            for (const [k, n] of Object.entries(per)) await redis.hincrby(K.sc(mid), k, -n);
            fail(409, 'stroke_limit', '이 쪽(또는 회의)에 선이 너무 많습니다. 쪽 지우기를 하세요.');
        }
        const t = now(), ops = [], ids = [];
        for (const s of clean) {
            const seq = await redis.hincrby(K.seq(mid), s.pageKey, 1);
            const id = U.newId('s');
            ops.push({ op: 'set', path: sub(mid, 'strokes', id), data: { ...s, cid: g.cid, name: g.name, at: t, seq } });
            ids.push({ id, seq, pageKey: s.pageKey });
        }
        await fb.batch(ops);
        res.status(201).json({ strokes: ids, at: t });
    }));
    router.delete('/:mid/strokes/:sid', pt(), wrap(async (req, res) => {
        const { mid, g, m } = req, sid = req.params.sid;
        allow(m, 'stroke');
        check(U.ID_RE.test(sid), 404, 'not_found', '선이 없습니다.');
        const s = await fb.get(sub(mid, 'strokes', sid));
        check(s, 404, 'not_found', '선이 없습니다.');
        check(s.cid === g.cid || g.role === 'host', 403, 'not_owner', '내 선만 지울 수 있습니다.');
        check(!m.penLock || g.role === 'host', 403, 'pen_locked', '주관자가 판서를 잠갔습니다.');
        await fb.delete(sub(mid, 'strokes', sid));
        await redis.hincrby(K.sc(mid), 'all', -1);
        await redis.hincrby(K.sc(mid), s.pageKey, -1);
        res.json({ ok: true });
    }));
    router.post('/:mid/pages/:pageKey/clear', pt({ host: true }), wrap(async (req, res) => {
        const { mid } = req, pageKey = req.params.pageKey;
        allow(req.m, 'stroke');
        check(PAGE_KEY.test(pageKey), 400, 'bad_pageKey', '쪽 키가 올바르지 않습니다.');
        const epoch = await fb.runTransaction(async tx => {
            const p = await tx.get(sub(mid, 'pages', pageKey));
            const e = (p?.epoch || 0) + 1;
            tx.set(sub(mid, 'pages', pageKey), { epoch: e });
            return e;
        });
        const had = Number(await redis.hget(K.sc(mid), pageKey) || 0);
        await redis.hset(K.sc(mid), { [pageKey]: 0 });
        if (had) await redis.hincrby(K.sc(mid), 'all', -had);
        const r = await removeOldStrokes(fb, mid, pageKey, epoch, 500);
        if (!r.done) await redis.hset(K.purgePages, { [`${mid}|${pageKey}`]: epoch });
        res.json({ pageKey, epoch });
    }));

    // ================= 채팅·손 (F-1·F-2) =================
    router.post('/:mid/chat', pt(), wrap(async (req, res) => {
        const { mid, g, m } = req, b = req.body || {};
        allow(m, 'chat');
        const text = typeof b.text === 'string' ? b.text.trim() : '';
        check(text && text.length <= LIMIT.chat, 400, 'bad_text', `채팅은 1~${LIMIT.chat}자입니다.`);
        await rate(g.h.slice(0, 24), 'chat', 1);
        let ref = null;
        if (b.ref) {
            check(U.ID_RE.test(String(b.ref.aid || '')) && Number.isInteger(b.ref.page) && b.ref.page >= 1 && b.ref.page <= 999, 400, 'bad_ref', '쪽 붙이기가 올바르지 않습니다.');
            ref = { aid: b.ref.aid, page: b.ref.page };
        }
        const t = now(), id = timeId('m', t);
        await fb.set(sub(mid, 'chat', id), { cid: g.cid, name: g.name, text, ref, at: t });
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
            const cur = await fb.get(sub(mid, 'hands', g.cid));
            if (!cur) await fb.set(sub(mid, 'hands', g.cid), { name: g.name, at: now() });
            return res.json({ up: true });
        }
        await fb.delete(sub(mid, 'hands', target));
        res.json({ up: false, cid: target });
    }));

    // ================= 접속 표시 (D-3, K2) =================
    // sendBeacon 은 헤더를 못 붙이므로 이 경로만 본문 pt 도 받는다.
    router.post('/:mid/heartbeat', pt({ bodyPt: true }), wrap(async (req, res) => {
        const { mid, g, m } = req, t = now();
        const leaving = !!req.body?.leaving;
        await fb.set(sub(mid, 'people', g.cid), { name: g.name, role: g.role, seenAt: leaving ? 0 : t, left: leaving });
        let counts = m.counts || null;
        if (t - (m.counts?.at || 0) >= 30000) {
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
        if (m.pollId) {
            const cur = await fb.get(sub(mid, 'polls', m.pollId));
            check(!cur || cur.status !== 'open', 409, 'poll_open', '열린 투표를 먼저 닫으세요.');
        }
        const pid = U.newId('p');
        const key = K.vote(mid, pid);
        await redis.hset(key, { '#status': 'open' });
        await redis.expire(key, Math.ceil((m.expiresAt - now()) / 1000) + 86400);
        await remember(redis, mid, key);
        const poll = { q, options, anonymous: b.anonymous !== false, status: 'open', revealed: false, tally: null, total: 0, names: null, createdAt: now(), createdBy: g.name };
        await fb.set(sub(mid, 'polls', pid), poll);
        await fb.update(mpath(mid), { pollId: pid });
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
        const r = Number(await redis.eval(LUA.vote, [K.vote(mid, pid)], [g.cid, optionId, g.name]));
        check(r !== -1, 409, 'poll_closed', '마감된 투표입니다.');
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
        const v = readVoteHash(await redis.hgetall(K.vote(mid, pid)), p.options);
        let names = null;
        if (!p.anonymous) {
            names = Object.fromEntries(p.options.map(o => [o.id, []]));
            for (const [cid, opt] of Object.entries(v.choices)) if (names[opt]) names[opt].push(v.names[cid] || '?');
        }
        const patch = { status: 'closed', revealed: true, tally: v.tally, total: v.total, names, closedAt: p.closedAt || now() };
        await fb.update(sub(mid, 'polls', pid), patch);
        res.json({ poll: { ...p, ...patch } });
    }));

    // ================= 녹음 → 대화 기록 (G-1) =================
    // 본문 = 소리 조각 그대로(Content-Type audio/webm 등, ≤3MB). ?n=조각번호&at=시작시각ms&aid=&page=
    router.post('/:mid/transcribe', express.raw({ type: () => true, limit: '3mb' }), pt({ host: true }), wrap(async (req, res) => {
        const { mid, m } = req;
        allow(m, 'transcribe');
        check(m.allowRecording !== false, 403, 'recording_off', '이 회의는 녹음을 허용하지 않았습니다.');
        check(groq, 503, 'no_groq', '받아쓰기 설정이 없습니다.');
        const mime = String(req.get('Content-Type') || '').split(';')[0].trim().toLowerCase();
        check(AUDIO_TYPES.includes(mime), 415, 'bad_audio', '소리 형식(webm·mp4·ogg·mp3·wav)이 아닙니다.');
        const buf = Buffer.isBuffer(req.body) ? req.body : null;
        check(buf && buf.length > 0, 400, 'empty_audio', '소리 조각이 비었습니다.');
        const n = Number(req.query.n);
        check(Number.isInteger(n) && n >= 0 && n < 10000, 400, 'bad_n', '조각 번호(n)가 필요합니다.');
        const t = now();
        const at = Number.isFinite(Number(req.query.at)) && req.query.at !== undefined ? clamp(Number(req.query.at), t - 300000, t) : t;
        let aid = m.live?.aid || null, page = m.live?.page || null;
        if (U.ID_RE.test(String(req.query.aid || '')) && Number.isInteger(Number(req.query.page))) { aid = String(req.query.aid); page = Number(req.query.page); }
        const r = await groq.transcribe({ buffer: buf, mime, language: 'ko' });   // 소리는 여기서 버린다
        if (!r.ok) fail(r.status === 429 ? 429 : 502, r.status === 429 ? 'groq_busy' : 'groq_failed', r.status === 429 ? '받아쓰기 한도에 걸렸습니다. 잠시 뒤 다시 보냅니다.' : '받아쓰기에 실패했습니다.');
        const id = 't' + String(n).padStart(5, '0');                                // 같은 조각 재시도는 덮어쓴다
        await fb.set(sub(mid, 'transcript', id), { n, at, text: r.text, aid, page });
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
            polls.push({ q: p.q, options: p.options, anonymous: p.anonymous, tally: v.tally, total: v.total, names: !p.anonymous && p.revealed ? p.names : null });
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
        res.status(500).json({ error: 'server_error', message: '서버 오류가 났습니다.' });
    });
    return router;
}

module.exports = { createRouter, hashCode, LIMIT, ALLOW };
