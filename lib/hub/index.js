'use strict';
// ===== 학교 공간(/hub) — 백암이와 독립된 다학교 서비스 =====
// 백암이 접근 코드를 몰라도 들어온다: NEIS 에서 학교를 찾고, 관리자가 그 학교에 준 코드를 넣는다.
// 관리자가 등록하지 않았거나 정지한 학교는 들어올 수 없다.
// 관리자(/hub/admin)는 백암이 관리자 코드(settings.json 의 adminHash — 백암이 암호화 그대로)로 들어오고,
// 학교 등록·코드 발급·정지·삭제와 모든 학교 데이터 열람·대리 작업(전체 권한)을 한다.
// 학교마다 저장 공간이 따로다: Redis 키 접두사 'hub:<학교코드>:'(로컬은 data-hub/<학교코드>/).
// 지금 들어 있는 도구는 채용 관리 하나이고, 학교 공간(/hub/s/<학교코드>)에 도구를 더해 넓힌다.
const path = require('node:path');
const fs = require('node:fs/promises');
const crypto = require('node:crypto');
const express = require('express');
const { createStore } = require('../recruitment/store');
const { createRouter } = require('../recruitment/routes');

const SCHOOL_ID = /^\d{7,10}$/;               // NEIS 행정표준코드(SD_SCHUL_CODE)
const CODE_RULE = /^[^\s]{4,40}$/;           // 학교 코드: 공백 없이 4~40자
const SESSION_MS = 12 * 60 * 60 * 1000;
const REGISTRY = 'hub:schools';
const MIGRATED = 'hub:migrated-baekam';

function mountHub(app, { redis, IS_VERCEL, dataDir, getAuthCodes, verifyPassword, hashPassword, loginLockGate, loginFailed, loginSucceeded, prefixedRedis, legacyRecruitStore }) {
    const local = new Map();   // Redis 가 없을 때(로컬 개발) 세션
    // ── 저장: 학교 목록(한 덩어리 JSON) ──
    async function readRegistry() {
        if (redis) { const v = await redis.get(REGISTRY); return (typeof v === 'string' ? JSON.parse(v) : v) || {}; }
        try { return JSON.parse(await fs.readFile(path.join(dataDir, 'schools.json'), 'utf8')); } catch { return {}; }
    }
    async function writeRegistry(reg) {
        if (redis) return redis.set(REGISTRY, JSON.stringify(reg));
        await fs.mkdir(dataDir, { recursive: true }); await fs.writeFile(path.join(dataDir, 'schools.json'), JSON.stringify(reg, null, 1), { mode: 0o600 });
    }
    async function getFlag(key) { if (redis) return redis.get(key); try { return JSON.parse(await fs.readFile(path.join(dataDir, key.replace(/:/g, '_') + '.json'), 'utf8')); } catch { return null; } }
    async function setFlag(key, value) { if (redis) return redis.set(key, JSON.stringify(value)); await fs.mkdir(dataDir, { recursive: true }); await fs.writeFile(path.join(dataDir, key.replace(/:/g, '_') + '.json'), JSON.stringify(value)); }
    // ── 세션 ──
    async function saveSession(token, s) { if (redis) return redis.set('hub:session:' + token, JSON.stringify(s), { px: SESSION_MS }); local.set(token, { ...s, exp: Date.now() + SESSION_MS }); }
    async function loadSession(token) {
        if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
        if (redis) { const v = await redis.get('hub:session:' + token); return v ? (typeof v === 'string' ? JSON.parse(v) : v) : null; }
        const s = local.get(token); if (!s || s.exp < Date.now()) { local.delete(token); return null; } return s;
    }
    async function dropSession(token) { if (redis) await redis.del('hub:session:' + token); else local.delete(token); }
    const newToken = () => crypto.randomBytes(32).toString('hex');
    const tokenOf = req => req.get('X-Hub-Token') || req.get('X-Auth-Token') || '';
    const publicSchool = s => ({ id: s.id, name: s.name, region: s.region || '', kind: s.kind || '', active: s.active !== false });

    // ── 학교별 채용 저장소·라우터(한 번 만들어 둔다) ──
    const routers = new Map();
    const storeOf = id => createStore({ redis: prefixedRedis(redis, `hub:${id}:`), serverless: IS_VERCEL, directory: path.join(dataDir, id, 'recruitment') });
    function routerOf(id) {
        if (routers.has(id)) return routers.get(id);
        const store = storeOf(id);
        const router = createRouter({
            redis: prefixedRedis(redis, `hub:${id}:`), serverless: IS_VERCEL, directory: path.join(dataDir, id, 'recruitment'), store,
            pagePath: `/hub/s/${id}/recruitment`,
            // 학교 세션은 자기 학교만, 관리자 세션은 모든 학교를 채용 관리자로 다룬다.
            validateSession: async token => { const s = await loadSession(token); return s && (s.role === 'hubadmin' || s.schoolId === id) ? { role: 'admin' } : null; }
        });
        const entry = { router, store }; routers.set(id, entry); return entry;
    }

    const api = express.Router();
    api.use(express.json({ limit: '64kb' }));
    api.use((req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
    const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
    const fail = (res, status, error) => res.status(status).json({ error });

    // ── NEIS 학교 검색: 등록 여부를 함께 알려 준다(등록 안 된 학교는 고를 수만 있고 들어올 수 없다) ──
    const neisCache = new Map();
    // 옛 /recruitment 화면이 학교 공간으로 넘어갈지 묻는다(Vercel 은 정적 파일을 서버보다 먼저 내보내 서버 쪽 302 가 닿지 않는다).
    api.get('/migrated', wrap(async (req, res) => {
        let m = await getFlag(MIGRATED); if (typeof m === 'string') m = JSON.parse(m);
        res.set('Cache-Control', 'no-store'); res.json(m?.schoolId ? { schoolId: m.schoolId } : {});
    }));
    api.get('/neis', wrap(async (req, res) => {
        const q = String(req.query.q || '').trim();
        if (q.length < 2) return res.json({ items: [] });
        let rows = neisCache.get(q)?.rows;
        if (!rows || Date.now() - neisCache.get(q).at > 3600e3) {
            const params = new URLSearchParams({ Type: 'json', pIndex: '1', pSize: '30', SCHUL_NM: q });
            if (process.env.NEIS_API_KEY) params.set('KEY', process.env.NEIS_API_KEY);
            try { const j = await (await fetch('https://open.neis.go.kr/hub/schoolInfo?' + params)).json(); rows = (j.schoolInfo && j.schoolInfo[1] && j.schoolInfo[1].row) || []; }
            catch { return res.json({ items: [], error: 'NEIS 학교 검색에 연결하지 못했습니다. 잠시 뒤 다시 해 주세요.' }); }
            if (neisCache.size > 500) neisCache.clear(); neisCache.set(q, { at: Date.now(), rows });
        }
        const reg = await readRegistry();
        res.json({ items: rows.slice(0, 30).map(s => ({ id: s.SD_SCHUL_CODE, name: s.SCHUL_NM, kind: s.SCHUL_KND_SC_NM || '', region: s.LCTN_SC_NM || '', office: s.ATPT_OFCDC_SC_NM || '', atpt: s.ATPT_OFCDC_SC_CODE || '', address: s.ORG_RDNMA || '', registered: !!reg[s.SD_SCHUL_CODE] && reg[s.SD_SCHUL_CODE].active !== false })) });
    }));

    // ── 학교 로그인: 등록·사용 중인 학교 + 관리자가 준 코드. 백암이 전체 로그인 잠금(기기 10회·IP 30회)을 같이 쓴다 ──
    api.post('/login', loginLockGate, wrap(async (req, res) => {
        const { schoolId, code } = req.body || {};
        if (!SCHOOL_ID.test(String(schoolId || '')) || typeof code !== 'string' || !code) return fail(res, 400, '학교를 고르고 코드를 입력하세요.');
        const s = (await readRegistry())[schoolId];
        if (!s) return fail(res, 403, '관리자가 아직 등록하지 않은 학교입니다. 사용하려면 관리자에게 등록을 요청하세요.');
        if (s.active === false) return fail(res, 403, '관리자가 사용을 멈춘 학교입니다. 관리자에게 문의하세요.');
        if (!verifyPassword(code, s.codeHash, s.codeSalt)) return loginFailed(req, res, '학교 코드가 맞지 않습니다.');
        await loginSucceeded(req);
        const token = newToken(); await saveSession(token, { role: 'school', schoolId, at: Date.now() });
        res.json({ token, school: publicSchool(s) });
    }));
    api.get('/me', wrap(async (req, res) => {
        const s = await loadSession(tokenOf(req)); if (!s) return fail(res, 401, '다시 로그인하세요.');
        if (s.role === 'hubadmin') return res.json({ role: 'hubadmin' });
        const school = (await readRegistry())[s.schoolId]; if (!school || school.active === false) return fail(res, 403, '사용할 수 없는 학교입니다.');
        res.json({ role: 'school', school: publicSchool(school) });
    }));
    api.post('/logout', wrap(async (req, res) => { await dropSession(tokenOf(req)); res.json({ success: true }); }));
    // 학교 공간 첫 화면에 쓰는 학교 이름(등록된 학교만).
    api.get('/schools/:id', wrap(async (req, res) => {
        const s = (await readRegistry())[req.params.id]; if (!s) return fail(res, 404, '등록되지 않은 학교입니다.');
        res.json(publicSchool(s));
    }));

    // ── 관리자 ──
    // 백암이 관리자 코드(settings.json 의 adminHash·adminSalt)로 확인한다. 별도 비밀번호를 두지 않는다.
    api.post('/admin/login', loginLockGate, wrap(async (req, res) => {
        const { code } = req.body || {}; if (typeof code !== 'string' || !code) return fail(res, 400, '관리자 코드를 입력하세요.');
        const auth = await getAuthCodes();
        if (!verifyPassword(code, auth.adminHash, auth.adminSalt)) return loginFailed(req, res, '관리자 코드가 맞지 않습니다.');
        await loginSucceeded(req);
        const token = newToken(); await saveSession(token, { role: 'hubadmin', at: Date.now() });
        res.json({ token });
    }));
    async function hubAdmin(req, res, next) { try { const s = await loadSession(tokenOf(req)); if (s?.role !== 'hubadmin') return fail(res, s ? 403 : 401, '관리자 로그인이 필요합니다.'); req.hubAdmin = s; next(); } catch (e) { next(e); } }
    api.get('/admin/schools', hubAdmin, wrap(async (req, res) => {
        const reg = await readRegistry();
        const items = await Promise.all(Object.values(reg).map(async s => {
            let list = []; try { list = await routerOf(s.id).store.list(); } catch {}
            return { ...publicSchool(s), office: s.office || '', address: s.address || '', createdAt: s.createdAt, codeUpdatedAt: s.codeUpdatedAt, recruitments: list.length, lastActivity: list[0]?.createdAt || null };
        }));
        res.json({ items: items.sort((a, b) => a.name.localeCompare(b.name, 'ko')), migrated: await getFlag(MIGRATED) });
    }));
    // 학교 등록(또는 다시 등록): NEIS 에서 고른 학교 + 코드. 코드는 백암이와 같은 방식(PBKDF2)으로 해시만 저장한다.
    api.post('/admin/schools', hubAdmin, wrap(async (req, res) => {
        const { id, name, kind = '', region = '', office = '', address = '', code } = req.body || {};
        if (!SCHOOL_ID.test(String(id || '')) || typeof name !== 'string' || !name.trim()) return fail(res, 400, 'NEIS 에서 학교를 골라 주세요.');
        if (!CODE_RULE.test(String(code || ''))) return fail(res, 400, '학교 코드는 공백 없이 4~40자로 정하세요.');
        const reg = await readRegistry(), h = hashPassword(code), now = new Date().toISOString();
        reg[id] = { ...(reg[id] || { createdAt: now }), id, name: name.trim().slice(0, 60), kind: String(kind).slice(0, 20), region: String(region).slice(0, 20), office: String(office).slice(0, 40), address: String(address).slice(0, 120), codeHash: h.hash, codeSalt: h.salt, codeUpdatedAt: now, active: true };
        await writeRegistry(reg); res.status(201).json(publicSchool(reg[id]));
    }));
    api.post('/admin/schools/:id/code', hubAdmin, wrap(async (req, res) => {
        const reg = await readRegistry(), s = reg[req.params.id]; if (!s) return fail(res, 404, '등록되지 않은 학교입니다.');
        if (!CODE_RULE.test(String(req.body?.code || ''))) return fail(res, 400, '학교 코드는 공백 없이 4~40자로 정하세요.');
        const h = hashPassword(req.body.code); Object.assign(s, { codeHash: h.hash, codeSalt: h.salt, codeUpdatedAt: new Date().toISOString() });
        await writeRegistry(reg); res.json({ success: true });
    }));
    api.post('/admin/schools/:id/active', hubAdmin, wrap(async (req, res) => {
        const reg = await readRegistry(), s = reg[req.params.id]; if (!s) return fail(res, 404, '등록되지 않은 학교입니다.');
        s.active = req.body?.active === true; await writeRegistry(reg); res.json(publicSchool(s));
    }));
    // 학교 삭제: 학교 이름을 그대로 적어야 한다. purge 면 그 학교의 채용 데이터까지 지운다(되돌릴 수 없음).
    api.delete('/admin/schools/:id', hubAdmin, wrap(async (req, res) => {
        const reg = await readRegistry(), s = reg[req.params.id]; if (!s) return fail(res, 404, '등록되지 않은 학교입니다.');
        if (req.body?.confirmName !== s.name) return fail(res, 400, '학교 이름이 맞지 않아 지우지 않았습니다.');
        let purged = 0;
        if (req.body?.purge === true) { const { store } = routerOf(s.id); for (const r of await store.list()) { await store.remove(r.id); purged++; } }
        delete reg[s.id]; await writeRegistry(reg); routers.delete(s.id);
        res.json({ success: true, purged });
    }));
    // 백암이 안에 있던 채용(/recruitment)을 한 학교 공간으로 옮긴다. 원본은 지우지 않고 복사한다(같은 ID 는 건너뜀).
    // 옮긴 뒤에는 /recruitment 로 오는 사람(옛 위원 링크 포함)을 그 학교 공간으로 보낸다.
    api.post('/admin/migrate-baekam', hubAdmin, wrap(async (req, res) => {
        const reg = await readRegistry(), s = reg[req.body?.schoolId]; if (!s) return fail(res, 404, '먼저 옮겨 갈 학교를 등록하세요.');
        const { store } = routerOf(s.id), have = new Set((await store.list()).map(r => r.id));
        let copied = 0, skipped = 0;
        for (const r of await legacyRecruitStore.list()) { if (have.has(r.id)) { skipped++; continue; } await store.create(r); copied++; }
        await setFlag(MIGRATED, { schoolId: s.id, name: s.name, at: new Date().toISOString(), copied });
        res.json({ copied, skipped });
    }));
    api.use((err, req, res, next) => { console.error('[hub]', err.message); res.status(err.status || 500).json({ error: err.status ? err.message : '처리하지 못했습니다.' }); });
    app.use('/api/hub', (req, res, next) => (req.path.startsWith('/s/') ? next() : api(req, res, next)));

    // ── 학교 공간의 채용 관리 API: /api/hub/s/<학교코드>/recruitments/… ──
    app.use('/api/hub/s/:schoolId/recruitments', wrap(async (req, res, next) => {
        const id = req.params.schoolId || (req.baseUrl.match(/\/api\/hub\/s\/(\d+)\//) || [])[1];
        if (!SCHOOL_ID.test(String(id || ''))) return fail(res, 404, '학교를 찾을 수 없습니다.');
        const s = (await readRegistry())[id];
        if (!s) return fail(res, 404, '등록되지 않은 학교입니다.');
        // 정지한 학교는 학교 사람도 위원도 쓸 수 없다. 관리자는 계속 열람·작업할 수 있다.
        if (s.active === false) { const ses = await loadSession(tokenOf(req)); if (ses?.role !== 'hubadmin') return fail(res, 403, '관리자가 사용을 멈춘 학교입니다.'); }
        routerOf(id).router(req, res, () => fail(res, 404, 'not found'));
    }));

    // ── 화면 ──
    const page = file => (req, res) => { res.set('Referrer-Policy', 'no-referrer'); res.set('Cache-Control', 'no-cache'); res.sendFile(path.join(__dirname, '../../public/hub', file)); };
    app.get(['/hub', '/hub/'], page('index.html'));
    app.get(['/hub/admin', '/hub/admin/'], page('admin.html'));
    app.get(['/hub/s/:id', '/hub/s/:id/'], page('school.html'));
    app.get(['/hub/s/:id/recruitment', '/hub/s/:id/recruitment/'], page('recruitment.html'));
    return { readRegistry, getFlag, MIGRATED };
}
module.exports = { mountHub };
