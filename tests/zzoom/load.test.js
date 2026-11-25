'use strict';
// 쭘 30명 부하 시험 (REDTEAM_LOAD.md LD 절). 교직원 30명 회의 1시간을 시계 조작으로 압축해 흉내 낸다.
// 실제 Firebase·Redis·Groq 에 닿지 않는다(가짜 fb·Redis + 실제 createRouter + 로컬 express).
// 실행: node --test tests/zzoom/load.test.js
//   결과 JSON 은 표준 출력 'LOAD_RESULT ' 줄과 os.tmpdir()/zzoom-load-<시각>.json 에 남는다(저장소에 쓰지 않음).
//   LOAD_STRICT=1 이면 「잘못된 429」 같은 무른 문제도 실패로 친다.
const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const express = require('express');
const { createRouter } = require('../../lib/zzoom/routes');
const { createFakeRedis } = require('./fakes/fake-redis');
const { createFakeFb } = require('./fakes/fake-fb');

const STRICT = process.env.LOAD_STRICT === '1';
const T0 = Date.parse('2026-11-26T06:00:00Z');   // 회의 시작 시각(시뮬레이션 0초)
const TOKENS = { admin: 'admin-t', user: 'user-t' };
const PEOPLE = 30, DRAWERS = 20;

// ---------------------------------------------------------------- 읽기·쓰기 세는 fb 감싸개
// Firestore 과금 기준으로 센다: get 1읽기(없어도 1), list·query 는 돌려준 문서 수(0이면 1), set·update 1쓰기, delete 1삭제, batch 는 op 마다.
function countingFb(raw) {
    const c = { reads: 0, writes: 0, deletes: 0, storage: 0, byOp: {}, log: [] };
    const bump = (k, n = 1) => { c.byOp[k] = (c.byOp[k] || 0) + n; };
    const coll = p => { const s = p.split('/'); return s.length === 2 ? 'meeting' : s[2]; };
    const note = (op, p, d) => {
        if (op === 'delete') c.deletes++; else c.writes++;
        c.log.push({ op, coll: coll(p), pageKey: d?.pageKey || null, path: p });
    };
    const fb = {
        async get(p) { c.reads++; bump('get'); return raw.get(p); },
        async set(p, d) { note('set', p, d); bump('set'); return raw.set(p, d); },
        async update(p, d) { note('update', p, d); bump('update'); return raw.update(p, d); },
        async delete(p) { note('delete', p); bump('delete'); return raw.delete(p); },
        async list(cp, o) { const r = await raw.list(cp, o); c.reads += Math.max(1, r.docs.length); bump('list'); return r; },
        async query(cp, o) { const r = await raw.query(cp, o); c.reads += Math.max(1, r.length); bump('query'); return r; },
        async batch(ops) { const r = await raw.batch(ops); for (const o of ops) note(o.op, o.path, o.data); bump('batch'); return r; },
        runTransaction(fn) {
            bump('tx');
            return raw.runTransaction(tx => fn({
                get: async p => { c.reads++; return tx.get(p); },
                set: (p, d) => { note('set', p, d); return tx.set(p, d); },
                update: (p, d) => { note('update', p, d); return tx.update(p, d); },
                delete: p => { note('delete', p); return tx.delete(p); }
            }));
        },
        storage: {
            list: (...a) => { c.storage++; return raw.storage.list(...a); },
            meta: (...a) => { c.storage++; return raw.storage.meta(...a); },
            remove: (...a) => { c.storage++; return raw.storage.remove(...a); }
        },
        createCustomToken: (...a) => raw.createCustomToken(...a)
    };
    return { fb, c };
}

// ---------------------------------------------------------------- 서버·시계·호출
async function setup() {
    const clock = { t: T0 - 600000 };
    const now = () => clock.t;
    const redis = createFakeRedis({ now });
    const raw = createFakeFb({ now });
    const { fb, c: fbc } = countingFb(raw);
    const validateSession = async t => t === TOKENS.admin ? { role: 'admin' } : t === TOKENS.user ? { role: 'user' } : null;
    const app = express();
    app.set('trust proxy', true);
    const lat = [];   // 서버 처리 시간 {route, ms, status}
    app.use((req, res, next) => {
        const s = process.hrtime.bigint();
        res.on('finish', () => lat.push({ route: norm(req.originalUrl), ms: Number(process.hrtime.bigint() - s) / 1e6, status: res.statusCode }));
        next();
    });
    app.use('/api/zzoom', createRouter({ redis, validateSession, fb, groq: null, now, env: { CRON_SECRET: 'x' } }));
    const server = app.listen(0, '127.0.0.1');
    await new Promise(r => server.once('listening', r));
    const base = `http://127.0.0.1:${server.address().port}`;
    const calls = [];   // {t, who, route, status, error, expectOk}
    async function call(method, url, { body, auth, pt, ip = '10.0.0.1', who = '?', expectOk = true } = {}) {
        const h = { 'X-Forwarded-For': ip };
        if (auth) h['X-Auth-Token'] = TOKENS[auth];
        if (pt) h['X-Zzoom-Pt'] = pt;
        if (body !== undefined) h['Content-Type'] = 'application/json';
        const res = await fetch(base + '/api/zzoom' + url, { method, headers: h, body: body === undefined ? undefined : JSON.stringify(body) });
        const text = await res.text();
        let json = null; try { json = JSON.parse(text); } catch { /* */ }
        const rec = { t: (clock.t - T0) / 1000, who, route: norm('/api/zzoom' + url), method, status: res.status, error: json?.error || null, expectOk };
        calls.push(rec);
        return { status: res.status, json, text };
    }
    const close = () => new Promise(r => server.close(r));
    return { clock, redis, raw, fb, fbc, call, calls, lat, close };
}
const KNOWN = new Set(['meetings', 'join', 'host', 'refresh', 'state', 'presenter', 'live', 'uploads', 'commit', 'agenda', 'boards', 'strokes', 'pages', 'clear', 'chat', 'hand', 'heartbeat', 'polls', 'vote', 'mine', 'tally', 'close', 'reveal', 'transcribe', 'unlock', 'health', 'maintenance', 'purge']);
function norm(u) {
    return u.split('?')[0].split('/').map((s, i) => i < 3 ? s : /^m[a-z0-9]{12}$/.test(s) ? ':mid' : /_\d+$/.test(s) ? ':pageKey' : (!KNOWN.has(s) && /^[a-z][a-z0-9]{6,}$/.test(s)) ? ':id' : s).join('/');
}

// 시계 조작 사건 실행기: 같은 시각(ms) 사건은 동시에(Promise.all), 시각 순으로. 사건 안에서 뒤 시각 사건을 더 넣을 수 있다.
function sim(h) {
    const q = new Map(); let keys = [];
    const at = (sec, fn) => {
        const t = Math.round(sec * 1000);
        if (!q.has(t)) { q.set(t, []); let lo = 0, hi = keys.length; while (lo < hi) { const m = (lo + hi) >> 1; if (keys[m] < t) lo = m + 1; else hi = m; } keys.splice(lo, 0, t); }
        q.get(t).push(fn);
    };
    async function run() {
        while (keys.length) {
            const t = keys.shift(); const fns = q.get(t); q.delete(t);
            h.clock.t = T0 + t;
            await Promise.all(fns.map(f => f()));
        }
    }
    return { at, run };
}

const pct = (arr, p) => { if (!arr.length) return 0; const s = [...arr].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(p / 100 * s.length))]; };
const r2 = n => Math.round(n * 100) / 100;
function strokeBody(pageKey, i, extra = {}) {
    // 손글씨 한 획 ≈ 50점(150개 수)
    const pts = []; for (let k = 0; k < 50; k++) pts.push(r2((0.1 + (i % 30) * 0.02 + k * 0.004) % 1), r2((0.1 + k * 0.01) % 1), 0.5);
    return { pageKey, epoch: 0, tool: 'pen', color: '#E5484D', w: 0.004, pts, ...extra };
}

// 회의 만들기 + 안건(PDF 20쪽 업로드) + 주관자 둘
async function prepare(h, { ipOf }) {
    const mk = await h.call('POST', '/meetings', { auth: 'admin', body: { title: '교직원 협의회', startsAt: T0, hostCode: '246810' }, who: 'admin' });
    assert.equal(mk.status, 201, mk.text);
    const mid = mk.json.meeting.id;
    return mid;
}

// ================================================================ 시험 1: 입장 폭주
test('LD-1 30명 동시 입장: 교내 공인 IP 하나 공유 vs 기기마다 다른 IP', async t => {
    const out = {};
    for (const variant of ['sharedIp', 'ownIp']) {
        const h = await setup();
        try {
            const mid = await prepare(h, {});
            h.clock.t = T0 - 60000;
            const res = await Promise.all(Array.from({ length: PEOPLE }, (_, i) =>
                h.call('POST', `/${mid}/join`, { auth: 'user', body: { name: '교사' + (i + 1) }, ip: variant === 'sharedIp' ? '203.0.113.7' : `10.1.0.${i + 1}`, who: 'p' + i })));
            const codes = {}; for (const r of res) codes[r.status] = (codes[r.status] || 0) + 1;
            // 막힌 사람이 30초 뒤 다시 눌러 본다(같은 1분 창)
            h.clock.t += 30000;
            const retry = await Promise.all(res.map((r, i) => r.status === 200 ? null : h.call('POST', `/${mid}/join`, { auth: 'user', body: { name: '교사' + (i + 1) }, ip: '203.0.113.7', who: 'p' + i })).filter(Boolean));
            const retryCodes = {}; for (const r of retry) retryCodes[r.status] = (retryCodes[r.status] || 0) + 1;
            // 61초 뒤
            h.clock.t += 31000;
            const left = res.map((r, i) => [r, i]).filter(([r]) => r.status !== 200);
            const retry2 = await Promise.all(left.map(([, i]) => h.call('POST', `/${mid}/join`, { auth: 'user', body: { name: '교사' + (i + 1) }, ip: '203.0.113.7', who: 'p' + i })));
            const retry2Codes = {}; for (const r of retry2) retry2Codes[r.status] = (retry2Codes[r.status] || 0) + 1;
            const people = [...h.raw.docs.keys()].filter(p => p.includes('/people/')).length;
            const firstKey = (await h.raw.get('zzoom_meetings/' + mid)).firstKeyAt;
            out[variant] = { first: codes, retryAfter30s: retryCodes, retryAfter61s: retry2Codes, peopleDocs: people, firstKeyAtSet: !!firstKey, server500: h.calls.filter(c => c.status >= 500).length };
            assert.equal(out[variant].server500, 0);
        } finally { await h.close(); }
    }
    t.diagnostic(JSON.stringify(out));
    RESULT.join = out;
    assert.equal(out.ownIp.first[200], PEOPLE, '기기마다 IP 가 다르면 모두 입장');
    if (STRICT) assert.equal(out.sharedIp.first[200], PEOPLE, '공유 IP 에서 정상 입장이 429 로 막힘');
});

// ================================================================ 시험 2: 1시간 회의
test('LD-2 교직원 30명 회의 1시간 압축(heartbeat·진행·판서·채팅·투표·손·진행권)', async t => {
    const h = await setup();
    t.after(h.close);
    const wall0 = Date.now();
    const mid = await prepare(h, {});
    const issues = [];   // 단단한 문제(잃어버린 쓰기·순서·집계·500)
    const soft = [];     // 무른 문제(잘못된 429 등)
    const P = [];        // {i, name, pt, cid, ip, role}

    // ---- 입장(기기마다 IP 다르게; 공유 IP 문제는 LD-1) ----
    h.clock.t = T0 - 300000;
    const joined = await Promise.all(Array.from({ length: PEOPLE }, (_, i) =>
        h.call('POST', `/${mid}/join`, { auth: 'user', body: { name: '교사' + (i + 1) }, ip: `10.2.0.${i + 1}`, who: 'p' + i })));
    joined.forEach((r, i) => { assert.equal(r.status, 200, r.text); P.push({ i, name: '교사' + (i + 1), pt: r.json.pt, cid: r.json.cid, ip: `10.2.0.${i + 1}`, role: 'viewer' }); });
    // 주관자 둘(p0 교감, p1 부장) 코드로
    for (const i of [0, 1]) {
        h.clock.t += 1000;
        const r = await h.call('POST', `/${mid}/host`, { pt: P[i].pt, body: { code: '246810' }, ip: P[i].ip, who: 'p' + i });
        assert.equal(r.status, 200, r.text);
        P[i].pt = r.json.pt; P[i].role = 'host';
    }
    const A = P[0], B = P[1];
    // 안건: PDF 20쪽 업로드
    h.clock.t += 1000;
    const up = await h.call('POST', `/${mid}/uploads`, { pt: A.pt, body: { kind: 'pdf', pages: 20, bytes: 123456 }, who: 'p0' });
    assert.equal(up.status, 201, up.text);
    for (const f of up.json.files.pages) h.raw.put(up.json.path + f, 150000, 'image/webp');
    for (const f of up.json.files.thumbs) h.raw.put(up.json.path + f, 8000, 'image/webp');
    h.raw.put(up.json.path + up.json.files.original, 123456, 'application/pdf');
    h.clock.t += 1000;
    const cm = await h.call('POST', `/${mid}/uploads/${up.json.uploadId}/commit`, { pt: A.pt, body: { title: '안건1 학사일정', pages: 20, sizes: Array(20).fill({ w: 1600, h: 1131 }) }, who: 'p0' });
    assert.equal(cm.status, 201, cm.text);
    const docAid = cm.json.aid;
    h.clock.t += 1000;
    const st = await h.call('POST', `/${mid}/state`, { pt: A.pt, body: { action: 'start' }, who: 'p0' });
    assert.equal(st.status, 200, st.text);
    let live = st.json.meeting.live; let presenter = { cid: A.cid, epoch: live.epoch };   // 진행자 화면이 아는 값
    const fbBefore = { reads: h.fbc.reads, writes: h.fbc.writes, deletes: h.fbc.deletes };
    const reqBefore = h.calls.length;
    const logBefore = h.fbc.log.length;

    const S = sim(h);
    const go = (sec, fn) => S.at(sec, fn);
    const pageSwitches = [];   // 진행 화면이 바뀐 쪽 기록 {t, pageKey}
    let curPage = `${docAid}_1`;
    // 진행자 live 보내기(응답 rev 를 따라감). who 가 진행자가 아니면 409 가 정상.
    async function sendLive(who, aid, page, { expectOk = true, force = false } = {}) {
        const p = P[who];
        const r = await h.call('POST', `/${mid}/live`, { pt: p.pt, body: { aid, page, view: { cx: 0.5, cy: 0.5, z: 1 }, baseRev: live.rev, epoch: presenter.epoch, force }, who: 'p' + who, expectOk });
        if (r.status === 200) {
            const k = `${aid}_${page}`; if (k !== curPage) { curPage = k; pageSwitches.push({ t: (h.clock.t - T0) / 1000, pageKey: k }); }
            live = r.json.live;
        } else if (r.status === 409 && r.json?.live) { live = r.json.live; }
        return r;
    }

    // ---- heartbeat: 60초마다, 사람마다 시작 초를 흩뜨림 ----
    for (let k = 0; k < 60; k++) for (const p of P) go(k * 60 + p.i * 2 + 0.05, () => h.call('POST', `/${mid}/heartbeat`, { pt: p.pt, body: {}, who: 'p' + p.i }));

    // ---- 진행: 매분 쪽 넘기기 + 300ms 묶음 이동 4번 = 1시간 약 300번 ----
    let page = 1;
    for (let k = 0; k < 60; k++) {
        if (k >= 10 && k < 16) continue;   // 판서 시간(화이트보드)은 따로
        if (k >= 50 && k < 52) continue;   // 진행권 경쟁은 따로
        go(k * 60 + 5, () => sendLive(presenterIdx(), boardOrDoc(), (page = (page % 20) + 1, page)));
        for (let j = 1; j <= 4; j++) go(k * 60 + 5 + j * 0.3, () => sendLive(presenterIdx(), boardOrDoc(), page));
    }
    let onBoard = false, boardAid = null;
    const boardOrDoc = () => onBoard ? boardAid : docAid;
    let presenterWho = 0;
    const presenterIdx = () => presenterWho;

    // ---- 7분: 진행자가 바쁜 1초(300ms 이동 + 판서 + 채팅 + 집계 보기) — 초당 5회 한도에 걸리나 ----
    for (let j = 0; j < 10; j++) go(420 + 0.3 * j, () => sendLive(0, docAid, page));
    go(420.5, () => h.call('POST', `/${mid}/chat`, { pt: A.pt, body: { text: '이 쪽 표를 보세요' }, who: 'p0' }));
    go(420.6, () => h.call('POST', `/${mid}/strokes`, { pt: A.pt, body: { strokes: [strokeBody(`${docAid}_${page}`, 1)] }, who: 'p0' }));
    go(421.1, () => h.call('POST', `/${mid}/heartbeat`, { pt: A.pt, body: {}, who: 'p0' }));

    // ---- 10~16분: 화이트보드에서 20명 동시 판서(쪽당 상한 근처까지) ----
    go(598, async () => {
        const r = await h.call('POST', `/${mid}/boards`, { pt: A.pt, body: { bg: 'grid' }, who: 'p0' });
        assert.equal(r.status, 201, r.text);
        boardAid = r.json.aid; onBoard = true;
        if (r.json.live) { live = r.json.live; curPage = `${boardAid}_1`; pageSwitches.push({ t: 598, pageKey: curPage }); }
    });
    const drawers = P.slice(2, 2 + DRAWERS);
    const accepted = new Map();   // who → [{seq, at, order}]
    let drawOrder = 0;
    async function draw(p, n, { expectOk = true, tag = 'draw' } = {}) {
        const pk = `${boardAid}_1`;
        const strokes = Array.from({ length: n }, (_, k) => strokeBody(pk, drawOrder + k));
        const order = drawOrder; drawOrder += n;
        const r = await h.call('POST', `/${mid}/strokes`, { pt: p.pt, body: { strokes }, who: 'p' + p.i, expectOk });
        if (r.status === 201) { const a = accepted.get(p.i) || []; r.json.strokes.forEach((s, k) => a.push({ seq: s.seq, id: s.id, order: order + k, tag })); accepted.set(p.i, a); }
        return r;
    }
    // 묶어 보내는 브라우저: 1초에 한 번, 그 사이 그은 획 1~3개. 20명 × 약 95획 ≈ 1,900
    for (const p of drawers) {
        for (let s = 0; s < 47; s++) go(600 + s * 2 + (p.i % 10) * 0.1, () => draw(p, 2));
    }
    // 묶지 않는 브라우저(손 뗄 때마다 POST, 0.4초 간격 손글씨) — 5명 × 10획
    for (const p of P.slice(22, 27)) for (let s = 0; s < 10; s++) go(720 + s * 0.4 + p.i * 0.01, () => draw(p, 1, { tag: 'naive' }));
    // 상한 직전 경쟁: 남은 칸만큼만 받혀야 한다
    let race = null;
    go(800, async () => {
        const before = Number(await h.redis.hget(`zz:sc:${mid}`, `${boardAid}_1`) || 0);
        const target = 1995;
        // 정확히 1995 까지 채우기(한 사람씩, 시계를 1초씩 넘겨 속도 제한 피함)
        let n = before, k = 0;
        while (n < target) {
            h.clock.t += 1001;
            const p = drawers[k++ % drawers.length];
            const r = await draw(p, Math.min(20, target - n), { tag: 'fill' });
            if (r.status === 201) n += r.json.strokes.length; else break;
        }
        race = { before: n };
    });
    go(830, async () => {
        const res = await Promise.all(drawers.map(p => draw(p, 1, { expectOk: false, tag: 'race' })));
        const ok = res.filter(r => r.status === 201).length;
        const after = Number(await h.redis.hget(`zz:sc:${mid}`, `${boardAid}_1`) || 0);
        race = { ...race, sent: res.length, accepted: ok, expected: Math.max(0, 2000 - race.before), codes: res.map(r => r.status + ':' + (r.json?.error || '')).reduce((o, k) => (o[k] = (o[k] || 0) + 1, o), {}), counterAfter: after };
        if (ok !== race.expected) soft.push({ kind: 'stroke_limit_race', detail: `상한 직전 ${race.sent}명 동시 → ${ok}개 받음(받아야 할 수 ${race.expected})` });
    });
    // 판서 끝: 문서로 돌아감, 나중에 보드로 두 번 돌아가 봄(구독 다시 읽기 비용)
    go(960, () => { onBoard = false; return sendLive(0, docAid, page); });
    go(1500, () => sendLive(0, boardAid, 1));
    go(1530, () => sendLive(0, docAid, page));
    go(2700, () => sendLive(0, boardAid, 1));
    go(2730, () => sendLive(0, docAid, page));

    // ---- 20분: 채팅 폭주 ----
    const chatOk = [];   // {id, at, who, k}
    async function chat(p, k, expectOk) {
        const r = await h.call('POST', `/${mid}/chat`, { pt: p.pt, body: { text: `의견 ${p.i}-${k}` }, who: 'p' + p.i, expectOk });
        if (r.status === 201) chatOk.push({ id: r.json.id, at: r.json.at, who: p.i, k });
        return r;
    }
    for (const p of P) {
        go(1200, () => chat(p, 0, true));
        go(1200.5, () => chat(p, 1, false));        // 1초 안 두 번째 → 429 가 맞음
        go(1201.2, () => chat(p, 2, true));
        for (let s = 0; s < 10; s++) go(1210 + s * 1.0, () => chat(p, 10 + s, true));   // 딱 1초 간격 10글
        for (let s = 0; s < 5; s++) go(1230 + s * 1.05 + p.i * 0.013, () => chat(p, 30 + s, true)); // 1.05초 간격(경계 안 맞음)
    }

    // ---- 30분: 투표 30명 동시·바꾸기·마감 경쟁 ----
    const pollRes = {};
    let pid = null;
    const voteLog = [];   // {cid, opt, status, t}
    async function vote(p, opt, expectOk = true) {
        const r = await h.call('POST', `/${mid}/polls/${pid}/vote`, { pt: p.pt, body: { optionId: opt }, who: 'p' + p.i, expectOk });
        voteLog.push({ cid: p.cid, opt, status: r.status, error: r.json?.error, t: h.clock.t });
        return r;
    }
    go(1799, async () => { const r = await h.call('POST', `/${mid}/polls`, { pt: A.pt, body: { q: '체험학습 날짜 변경 찬성?', anonymous: true }, who: 'p0' }); assert.equal(r.status, 201, r.text); pid = r.json.pid; });
    for (const p of P) go(1800, () => vote(p, ['o1', 'o2', 'o3'][p.i % 3]));
    for (const p of P.slice(0, 10)) go(1801, () => vote(p, 'o2'));                // 바꾸기
    for (const p of P.slice(10, 15)) go(1801, () => vote(p, ['o1', 'o2', 'o3'][p.i % 3]));   // 같은 표 다시
    for (const p of P.slice(15, 25)) go(1802, () => vote(p, 'o3'));                // 바꾸기 2
    for (const p of P.slice(25, 30)) go(1803, () => vote(p, 'o1', false));          // 마감과 같은 순간
    go(1803, async () => { pollRes.close = (await h.call('POST', `/${mid}/polls/${pid}/close`, { pt: A.pt, body: {}, who: 'p0' })).status; });
    for (const p of P.slice(2, 8)) go(1804, () => vote(p, 'o1', false));            // 마감 뒤(409 가 맞음)
    go(1805, async () => {
        const tl = await h.call('GET', `/${mid}/polls/${pid}/tally`, { pt: A.pt, who: 'p0' });
        const rv = await h.call('POST', `/${mid}/polls/${pid}/reveal`, { pt: B.pt, body: {}, who: 'p1' });
        // 기대 집계: 사람마다 마지막으로 성공한 표
        const last = {}; for (const v of voteLog.sort((a, b) => a.t - b.t)) if (v.status === 200) last[v.cid] = v.opt;
        const exp = { o1: 0, o2: 0, o3: 0 }; for (const o of Object.values(last)) exp[o]++;
        const doc = await h.raw.get(`zzoom_meetings/${mid}/polls/${pid}`);
        pollRes.anon = { expected: exp, tally: tl.json?.tally, revealTally: rv.json?.poll?.tally, docTally: doc?.tally, total: doc?.total, voters: Object.keys(last).length,
            codes: voteLog.reduce((o, v) => { const k = v.status + (v.error ? ':' + v.error : ''); o[k] = (o[k] || 0) + 1; return o; }, {}) };
        for (const [k, v] of Object.entries({ tally: tl.json?.tally, reveal: rv.json?.poll?.tally, doc: doc?.tally })) {
            if (JSON.stringify(v) !== JSON.stringify(exp)) issues.push({ kind: 'tally_mismatch', detail: `${k} ${JSON.stringify(v)} ≠ 기대 ${JSON.stringify(exp)}` });
        }
    });
    // 공개 투표: 이름 수 = 표 수
    let pid2 = null; const vote2 = {};
    go(1900, async () => { const r = await h.call('POST', `/${mid}/polls`, { pt: A.pt, body: { q: '공개 투표', options: ['가', '나'], anonymous: false }, who: 'p0' }); pid2 = r.json?.pid; pollRes.publicCreate = r.status; });
    for (const p of P) go(1901, async () => { const r = await h.call('POST', `/${mid}/polls/${pid2}/vote`, { pt: p.pt, body: { optionId: p.i % 2 ? 'o2' : 'o1' }, who: 'p' + p.i }); if (r.status === 200) vote2[p.cid] = p.i % 2 ? 'o2' : 'o1'; });
    go(1903, async () => {
        const rv = await h.call('POST', `/${mid}/polls/${pid2}/reveal`, { pt: A.pt, body: {}, who: 'p0' });
        const poll = rv.json?.poll || {};
        const nNames = Object.values(poll.names || {}).reduce((a, b) => a + b.length, 0);
        pollRes.public = { total: poll.total, names: nNames, tally: poll.tally };
        if (!(poll.total === Object.keys(vote2).length && nNames === poll.total)) issues.push({ kind: 'public_poll_mismatch', detail: JSON.stringify(pollRes.public) });
    });

    // ---- 40분: 손들기 동시 ----
    const handRes = {};
    const handDocs = async () => [...h.raw.docs.keys()].filter(k => k.startsWith(`zzoom_meetings/${mid}/hands/`)).length;
    for (const p of P.slice(2)) go(2400, () => h.call('POST', `/${mid}/hand`, { pt: p.pt, body: { up: true }, who: 'p' + p.i }));
    for (const p of P.slice(2, 8)) go(2400.1, () => h.call('POST', `/${mid}/hand`, { pt: p.pt, body: { up: true }, who: 'p' + p.i }));   // 두 번 누름
    go(2401, async () => { handRes.afterUp = await handDocs(); if (handRes.afterUp !== PEOPLE - 2) issues.push({ kind: 'hand_lost', detail: `손 ${handRes.afterUp}/${PEOPLE - 2}` }); });
    for (const p of P.slice(2, 7)) go(2402, () => h.call('POST', `/${mid}/hand`, { pt: A.pt, body: { up: false, cid: p.cid }, who: 'p0' }));
    for (const p of P.slice(2, 7)) go(2402, () => h.call('POST', `/${mid}/hand`, { pt: p.pt, body: { up: true }, who: 'p' + p.i, expectOk: true }));   // 내려지는 순간 다시 듦
    go(2403, async () => { handRes.afterLowerRace = await handDocs(); });
    go(2405, () => h.call('POST', `/${mid}/hand`, { pt: B.pt, body: { all: true }, who: 'p1' }));
    for (const p of P.slice(10, 13)) go(2405, () => h.call('POST', `/${mid}/hand`, { pt: p.pt, body: { up: true }, who: 'p' + p.i }));
    go(2406, async () => { handRes.afterLowerAll = await handDocs(); });
    // counts(30초 묶음)가 따라오는지: 다음 heartbeat 묶음 뒤 meeting.counts
    go(2470, async () => { const m = await h.raw.get('zzoom_meetings/' + mid); handRes.countsAt2470 = m.counts; });

    // ---- 50~52분: 진행 넘겨받기 경쟁 ----
    const presRes = [];
    go(3000, async () => {
        // A 가 보내는 순간 B 가 넘겨받음
        const [la, tb] = await Promise.all([sendLive(0, docAid, page, { expectOk: false }), h.call('POST', `/${mid}/presenter`, { pt: B.pt, body: {}, who: 'p1' })]);
        presRes.push({ step: 'A live ∥ B take', a: la.status + ':' + (la.json?.error || ''), b: tb.status });
        if (tb.status === 200) { presenter = { cid: B.cid, epoch: tb.json.presenter.epoch }; live = tb.json.live || live; presenterWho = 1; }
    });
    go(3001, async () => {
        // 둘이 동시에 넘겨받기
        const [ta, tb] = await Promise.all([h.call('POST', `/${mid}/presenter`, { pt: A.pt, body: {}, who: 'p0' }), h.call('POST', `/${mid}/presenter`, { pt: B.pt, body: {}, who: 'p1' })]);
        const m = await h.raw.get('zzoom_meetings/' + mid);
        presRes.push({ step: 'A take ∥ B take', a: ta.status + ' e' + ta.json?.presenter?.epoch, b: tb.status + ' e' + tb.json?.presenter?.epoch, final: m.presenter.name + ' e' + m.presenter.epoch });
        if (ta.json?.presenter?.epoch === tb.json?.presenter?.epoch) issues.push({ kind: 'presenter_epoch_dup', detail: '두 넘겨받기가 같은 epoch' });
        // 둘 다 자기가 받은 epoch 로 live 를 보냄 → 하나만 성공해야 함
        const send = (who, ep) => h.call('POST', `/${mid}/live`, { pt: P[who].pt, body: { aid: docAid, page: 2, view: {}, baseRev: m.live.rev, epoch: ep }, who: 'p' + who, expectOk: false });
        h.clock.t += 300;
        const [sa, sb] = await Promise.all([send(0, ta.json.presenter.epoch), send(1, tb.json.presenter.epoch)]);
        const okN = [sa, sb].filter(r => r.status === 200).length;
        const m2 = await h.raw.get('zzoom_meetings/' + mid);
        presRes.push({ step: '둘 다 live', a: sa.status + ':' + (sa.json?.error || ''), b: sb.status + ':' + (sb.json?.error || ''), ok: okN, liveEpoch: m2.live.epoch, presenterEpoch: m2.presenter.epoch });
        if (okN !== 1) issues.push({ kind: 'presenter_race', detail: `live 성공 ${okN}개(1이어야 함)` });
        if (m2.live.epoch !== m2.presenter.epoch) issues.push({ kind: 'epoch_mismatch', detail: JSON.stringify({ live: m2.live.epoch, presenter: m2.presenter.epoch }) });
        live = m2.live; presenter = { cid: m2.presenter.cid, epoch: m2.presenter.epoch }; presenterWho = m2.presenter.cid === A.cid ? 0 : 1;
    });

    // ---- 60분: 끝내기 ----
    go(3599, async () => { const r = await h.call('POST', `/${mid}/state`, { pt: A.pt, body: { action: 'end' }, who: 'p0' }); assert.equal(r.status, 200, r.text); });

    await S.run();
    const wallMs = Date.now() - wall0;

    // ================= 검사 =================
    const sim1h = h.calls.slice(reqBefore);
    // 예외·500
    const e5 = sim1h.filter(c => c.status >= 500);
    if (e5.length) issues.push({ kind: 'server_5xx', detail: JSON.stringify(e5.slice(0, 5)) });
    // 잘못된 429(정상 사용자가 막힘)
    const bad429 = sim1h.filter(c => c.status === 429 && c.expectOk);
    const bad429By = {}; for (const c of bad429) { const k = `${c.route} ${c.error}`; bad429By[k] = (bad429By[k] || 0) + 1; }
    for (const [k, n] of Object.entries(bad429By)) soft.push({ kind: 'false_429', detail: `${k} × ${n}`, where: bad429.filter(c => `${c.route} ${c.error}` === k).slice(0, 40).map(c => `${c.who}@${c.t}s`).join(' ') });
    // 판서: 잃어버린 쓰기·seq 순서·카운터
    const bk = `${boardAid}_1`;
    const strokeDocs = [...h.raw.docs.entries()].filter(([k, v]) => k.startsWith(`zzoom_meetings/${mid}/strokes/`) && v.pageKey === bk).map(([, v]) => v);
    const acc = [...accepted.values()].flat();
    const seqs = strokeDocs.map(s => s.seq).sort((a, b) => a - b);
    const seqDup = seqs.length - new Set(seqs).size;
    const counter = Number(await h.redis.hget(`zz:sc:${mid}`, bk) || 0);
    const seqMax = Number(await h.redis.hget(`zz:seq:${mid}`, bk) || 0);
    if (strokeDocs.length !== acc.length) issues.push({ kind: 'stroke_lost', detail: `받았다고 한 선 ${acc.length} · 저장된 선 ${strokeDocs.length}` });
    if (seqDup) issues.push({ kind: 'seq_dup', detail: `seq 겹침 ${seqDup}` });
    if (counter !== strokeDocs.length) issues.push({ kind: 'stroke_counter', detail: `Redis 선 수 ${counter} · 실제 ${strokeDocs.length}` });
    let perAuthorReorder = 0;
    for (const list of accepted.values()) { const bySeq = [...list].sort((a, b) => a.seq - b.seq); for (let k = 1; k < bySeq.length; k++) if (bySeq[k].order < bySeq[k - 1].order) perAuthorReorder++; }
    if (perAuthorReorder) issues.push({ kind: 'seq_reorder', detail: `한 사람 선 순서 뒤바뀜 ${perAuthorReorder}` });
    const seqGaps = seqMax - seqs.length;
    // 채팅: 잃어버린 글·순서
    const chatDocs = [...h.raw.docs.keys()].filter(k => k.startsWith(`zzoom_meetings/${mid}/chat/`)).map(k => k.split('/').pop());
    const chatSet = new Set(chatDocs);
    const chatLost = chatOk.filter(c => !chatSet.has(c.id)).length;
    if (chatLost) issues.push({ kind: 'chat_lost', detail: `채팅 ${chatLost}개 사라짐` });
    const chatSorted = [...chatDocs].sort();
    let chatReorder = 0; { const atOf = new Map(chatOk.map(c => [c.id, c.at])); for (let k = 1; k < chatSorted.length; k++) if ((atOf.get(chatSorted[k]) ?? 0) < (atOf.get(chatSorted[k - 1]) ?? 0)) chatReorder++; }
    if (chatReorder) issues.push({ kind: 'chat_reorder', detail: `id 순서와 시각 순서 다름 ${chatReorder}` });
    let chatSelfReorder = 0; { const byWho = {}; for (const c of [...chatOk].sort((a, b) => a.id < b.id ? -1 : 1)) { (byWho[c.who] ||= []).push(c.k); } for (const ks of Object.values(byWho)) for (let k = 1; k < ks.length; k++) if (ks[k] < ks[k - 1]) chatSelfReorder++; }
    if (chatSelfReorder) issues.push({ kind: 'chat_self_reorder', detail: `한 사람 글 순서 뒤바뀜 ${chatSelfReorder}` });
    // counts(사람 수)
    const mEnd = await h.raw.get('zzoom_meetings/' + mid);
    const countsPeopleOk = handRes.countsAt2470?.people === PEOPLE;
    if (!countsPeopleOk) issues.push({ kind: 'counts_people', detail: JSON.stringify(handRes.countsAt2470) });

    // ================= 측정 =================
    const byRoute = {};
    for (const l of h.lat.slice(-sim1h.length)) { (byRoute[l.route] ||= []).push(l.ms); }
    const latTable = Object.entries(byRoute).map(([route, ms]) => ({ route, n: ms.length, p50: r2(pct(ms, 50)), p90: r2(pct(ms, 90)), p99: r2(pct(ms, 99)), max: r2(Math.max(...ms)) })).sort((a, b) => b.n - a.n);
    const allMs = h.lat.slice(-sim1h.length).map(l => l.ms);
    const perSec = {}; for (const c of sim1h) { const s = Math.floor(c.t); perSec[s] = (perSec[s] || 0) + 1; }
    const peakSec = Object.entries(perSec).sort((a, b) => b[1] - a[1])[0];
    const status = {}; for (const c of sim1h) { const k = c.status + (c.error ? ':' + c.error : ''); status[k] = (status[k] || 0) + 1; }
    const fbSim = { reads: h.fbc.reads - fbBefore.reads, writes: h.fbc.writes - fbBefore.writes, deletes: h.fbc.deletes - fbBefore.deletes };

    // 화면 쪽 읽기 추정: 구독 문서가 바뀔 때마다 구독자 수만큼 1읽기(추가·변경만, 삭제는 안 셈)
    const wlog = h.fbc.log.slice(logBefore).filter(w => w.op !== 'delete');
    const wc = {}; for (const w of wlog) wc[w.coll] = (wc[w.coll] || 0) + 1;
    const strokeW = wlog.filter(w => w.coll === 'strokes').length;
    const hosts = 2, viewersAll = PEOPLE;
    const client = {
        meeting: (wc.meeting || 0) * viewersAll,
        agenda: (wc.agenda || 0) * viewersAll,
        chat: (wc.chat || 0) * viewersAll,
        hands: (wc.hands || 0) * viewersAll,
        polls: (wc.polls || 0) * viewersAll,
        people_hostOnly: (wc.people || 0) * hosts,
        strokes_live: strokeW * viewersAll,   // 모두가 같은 쪽을 보고 있다고 가정
        pages_epoch: (wc.pages || 0) * viewersAll
    };
    // 쪽 바뀜마다 새 쪽 선 구독 다시 읽기(선 수, 0이면 1) + epoch 문서 1
    const strokesAt = (pk, t) => pk === bk ? (t >= 830 ? strokeDocs.length : 0) : 0;
    client.page_switch_reload = pageSwitches.reduce((s, ps) => s + viewersAll * (Math.max(1, strokesAt(ps.pageKey, ps.t)) + 1), 0);
    client.initial_join = viewersAll * (1 + 1 + 1 + 1);   // 회의·안건·첫 쪽 선(빈 쪽 1)·epoch (채팅·손·투표 비어 있음)
    const clientReads = Object.values(client).reduce((a, b) => a + b, 0);
    const PRICE = { read: 0.03 / 100000, write: 0.09 / 100000, del: 0.01 / 100000 };
    const totalReads = clientReads + fbSim.reads;
    const cost = { usd: r2((totalReads * PRICE.read + fbSim.writes * PRICE.write + fbSim.deletes * PRICE.del) * 10000) / 10000, krwAt1450: Math.round((totalReads * PRICE.read + fbSim.writes * PRICE.write + fbSim.deletes * PRICE.del) * 1450 * 10) / 10 };

    const out = {
        wallMs, simulatedSec: 3600,
        requests: { total: sim1h.length, perSimSecAvg: r2(sim1h.length / 3600), peakSimSec: { sec: Number(peakSec[0]), n: peakSec[1] }, wallPerSec: Math.round(sim1h.length / (wallMs / 1000)) },
        status,
        latencyAll: { n: allMs.length, p50: r2(pct(allMs, 50)), p90: r2(pct(allMs, 90)), p99: r2(pct(allMs, 99)), max: r2(Math.max(...allMs)) },
        latencyByRoute: latTable,
        fbServer: { ...fbSim, byOp: h.fbc.byOp, storageCalls: h.fbc.storage },
        redisCommands: h.redis.calls.n,
        firestoreWritesByColl: wc,
        clientReadsEstimate: { ...client, total: clientReads },
        cost: { totalReads, writes: fbSim.writes, deletes: fbSim.deletes, ...cost, price: 'reads $0.03 · writes $0.09 · deletes $0.01 per 100k (cloud.google.com/firestore/pricing 기본 표시 지역)' },
        strokes: { board: bk, docs: strokeDocs.length, accepted: acc.length, counter, seqMax, seqGaps, seqDup, perAuthorReorder, naive: summarizeTag(sim1h, 'naive'), race },
        chat: { ok: chatOk.length, docs: chatDocs.length, lost: chatLost, reorder: chatReorder, selfReorder: chatSelfReorder },
        polls: pollRes, hands: handRes, presenter: presRes, pageSwitches: pageSwitches.length,
        countsEnd: mEnd.counts, issues, soft
    };
    RESULT.meeting = out;
    t.diagnostic(JSON.stringify({ issues, soft, requests: out.requests, status }));
    assert.deepEqual(issues, [], '단단한 문제: ' + JSON.stringify(issues));
    if (STRICT) assert.deepEqual(soft, [], '무른 문제: ' + JSON.stringify(soft));

    function summarizeTag() {
        const n = sim1h.filter(c => c.route.endsWith('/strokes') && c.t >= 720 && c.t < 725);
        const o = {}; for (const c of n) { const k = c.status + (c.error ? ':' + c.error : ''); o[k] = (o[k] || 0) + 1; } return o;
    }
});

const RESULT = { at: new Date().toISOString(), node: process.version };
after(() => {
    const f = path.join(os.tmpdir(), `zzoom-load-${Date.now()}.json`);
    try { fs.writeFileSync(f, JSON.stringify(RESULT, null, 2)); } catch { /* */ }
    console.log('LOAD_RESULT_FILE ' + f);
    console.log('LOAD_RESULT ' + JSON.stringify(RESULT));
});
