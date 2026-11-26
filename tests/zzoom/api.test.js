'use strict';
// 쭘 서버 API 시험 (DESIGN 파트 J: API 격리·주관 코드·투표·진행·판서·업로드·삭제). 실패 경우 위주.
// 실제 Firebase·Redis·Groq 는 쓰지 않는다(메모리 가짜). 시계는 요청마다 1초씩 흐르게 해 속도 제한을 피한다.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { createRouter } = require('../../lib/zzoom/routes');
const { createFakeRedis } = require('./fakes/fake-redis');
const { createFakeFb } = require('./fakes/fake-fb');

const DAY = 86400000;
const TOKENS = { admin: 'admin-t', user: 'user-t' };

async function setup(opts = {}) {
    const clock = { t: Date.parse('2026-11-25T00:00:00Z') };
    const now = () => clock.t;
    const redis = createFakeRedis({ now });
    const fb = opts.noFb ? null : createFakeFb({ now });
    const groqCalls = [];
    const groq = opts.groq || { async transcribe(a) { groqCalls.push({ bytes: a.buffer.length, mime: a.mime, language: a.language }); return { ok: true, text: '첫 안건 이야기' }; } };
    const sessCalls = { n: 0 };
    // 'user-t#라벨' 처럼 # 뒤가 다른 토큰은 서로 다른 백암이 세션(= 다른 사람, ANON 사람 열쇠는 세션 토큰 해시)
    const validateSession = async t => { sessCalls.n++; const b = String(t || '').split('#')[0]; return b === TOKENS.admin ? { role: 'admin' } : b === TOKENS.user ? { role: 'user' } : null; };
    const app = express();
    app.set('trust proxy', true);
    // server.js 처럼 /api/copy/* → /api/* 재작성 + isCopy 표시
    app.use((req, res, next) => { if (req.url.startsWith('/api/copy/')) { req.url = '/api/' + req.url.slice('/api/copy/'.length); req.isCopy = true; } next(); });
    app.use('/api/zzoom', createRouter({ redis, validateSession, fb, groq, now, env: { CRON_SECRET: 'cron-secret' }, ...(opts.router || {}) }));
    const server = app.listen(0, '127.0.0.1');
    await new Promise(r => server.once('listening', r));
    const base = `http://127.0.0.1:${server.address().port}`;
    let ipSeq = 0;
    async function call(method, url, { body, auth, pt, ip, raw, type, headers = {}, tick = 1001 } = {}) {
        clock.t += tick;
        const h = { ...headers };
        if (auth) h['X-Auth-Token'] = TOKENS[auth] || auth;
        if (pt) h['X-Zzoom-Pt'] = pt;
        if (ip) h['X-Forwarded-For'] = ip;
        let b;
        if (raw) { b = raw; h['Content-Type'] = type || 'audio/webm'; }
        else if (body !== undefined) { b = JSON.stringify(body); h['Content-Type'] = 'application/json'; }
        const res = await fetch(base + (url.startsWith('/api') ? url : '/api/zzoom' + url), { method, headers: h, body: b });
        const text = await res.text();
        let json = null; try { json = JSON.parse(text); } catch { /* md 등 */ }
        return { status: res.status, json, text, headers: res.headers };
    }
    async function createMeeting(extra = {}) {
        const r = await call('POST', '/meetings', { auth: 'admin', body: { title: '학년 협의회', startsAt: '2026-11-26T06:00:00Z', hostCode: '123456', ...extra } });
        assert.equal(r.status, 201, r.text);
        return r.json.meeting.id;
    }
    // 익명(ANON): 서버는 이름을 받지 않는다. who 는 시험용 사람 표시(같은 who = 같은 로그인 세션). 이름이 저장되지 않는지 보려고 body 에 일부러 실어 보낸다.
    async function join(mid, who = '참석자', auth = 'user') {
        const r = await call('POST', `/${mid}/join`, { auth: (TOKENS[auth] || auth) + '#' + encodeURIComponent(who), body: { name: who }, ip: `10.9.${Math.floor(ipSeq / 200)}.${ipSeq++ % 200}` });
        assert.equal(r.status, 200, r.text);
        return r.json;
    }
    async function asHost(mid, name = '주관자') {
        const v = await join(mid, name);
        const r = await call('POST', `/${mid}/host`, { pt: v.pt, body: { code: '123456' }, ip: '10.200.0.' + (ipSeq++ % 200) });
        assert.equal(r.status, 200, r.text);
        return r.json;
    }
    async function board(mid, host, pages = 1) {
        const r = await call('POST', `/${mid}/boards`, { pt: host.pt, body: { bg: 'grid' } });
        assert.equal(r.status, 201, r.text);
        for (let i = 1; i < pages; i++) assert.equal((await call('POST', `/${mid}/boards`, { pt: host.pt, body: { action: 'addPage', aid: r.json.aid } })).status, 200);
        return r.json.aid;
    }
    const close = () => new Promise(r => server.close(r));
    return { clock, redis, fb, groqCalls, sessCalls, call, createMeeting, join, asHost, board, close };
}

const stroke = (pageKey, extra = {}) => ({ pageKey, epoch: 0, tool: 'pen', color: '#E5484D', w: 0.004, pts: [0.1, 0.1, 0.5, 0.2, 0.2, 0.5], ...extra });

// ---------------------------------------------------------------- API 격리
test('격리: 시연본·비로그인·권한·다른 회의·만료 자격', async t => {
    const h = await setup(); t.after(h.close);
    // /api/copy/zzoom 은 저장소·세션에 닿기 전에 403
    const before = { fb: h.fb.calls.n, redis: h.redis.calls.n, sess: h.sessCalls.n };
    for (const [m, u] of [['GET', '/api/copy/zzoom/meetings'], ['POST', '/api/copy/zzoom/meetings'], ['GET', '/api/copy/zzoom/maintenance/purge']]) {
        const r = await h.call(m, u, { auth: 'admin', body: m === 'POST' ? { title: 'x' } : undefined });
        assert.equal(r.status, 403); assert.equal(r.json.error, 'copy_blocked');
    }
    assert.deepEqual({ fb: h.fb.calls.n, redis: h.redis.calls.n, sess: h.sessCalls.n }, before, '시연본 요청이 운영 저장소를 0회 호출');

    assert.equal((await h.call('GET', '/meetings')).status, 401);
    assert.equal((await h.call('GET', '/meetings', { auth: 'bogus' })).status, 401);
    const mk = await h.call('POST', '/meetings', { auth: 'user', body: { title: 'x', startsAt: Date.now(), hostCode: '123456' } });
    // 사용자 결정(2026-11-25): 로그인한 교직원 누구나 회의(오늘의 안건)를 만든다. 수정·삭제는 만든 사람이나 관리자만.
    assert.equal(mk.status, 201); assert.equal(mk.json.meeting.mine, true);
    const umid = mk.json.meeting.id;
    assert.equal((await h.call('PATCH', `/meetings/${umid}`, { auth: 'user', body: { title: 'y' } })).status, 200, '만든 사람은 수정');
    const amk = await h.call('POST', '/meetings', { auth: 'admin', body: { title: 'a', startsAt: Date.now(), hostCode: '123456' } });
    const ap = await h.call('PATCH', `/meetings/${amk.json.meeting.id}`, { auth: 'user', body: { title: 'z' } });
    assert.equal(ap.status, 403); assert.equal(ap.json.error, 'manager_only', '남이 만든 회의는 수정 못 함');
    // 2026-11-26 사용자 결정: 회의 지우기는 누구나 — 아래에서 남이 만든 회의도 지워지는지 본다
    assert.equal((await h.call('POST', `/meetings/${amk.json.meeting.id}/unlock`, { auth: 'user' })).json.error, 'manager_only');
    assert.equal((await h.call('DELETE', `/meetings/${umid}`, { auth: 'user' })).status, 200, '만든 사람은 삭제');
    assert.equal((await h.call('DELETE', `/meetings/${amk.json.meeting.id}`, { auth: 'user' })).status, 200, '남이 만든 회의도 누구나 삭제(2026-11-26)');
    assert.equal((await h.call('POST', '/meetings', { auth: 'admin', body: { title: 'x', startsAt: Date.now(), hostCode: '12345' } })).json.error, 'bad_code');
    assert.equal((await h.call('POST', '/meetings', { auth: 'admin', body: { title: '', startsAt: Date.now(), hostCode: '123456' } })).json.error, 'bad_title');
    assert.equal((await h.call('POST', '/meetings', { auth: 'admin', body: [] })).status, 400);

    const mid = await h.createMeeting(), mid2 = await h.createMeeting();
    // 응답 어디에도 코드 해시가 없다
    const list = await h.call('GET', '/meetings', { auth: 'admin' });
    assert.equal(list.json.meetings.length, 2);
    assert.ok(!/hash|salt|123456/.test(list.text));
    assert.equal((await h.call('POST', `/${mid}/join`, { body: { name: 'a' } })).status, 401, '비로그인 입장');
    const noName = await h.call('POST', `/${mid}/join`, { auth: 'user', body: {} });
    assert.equal(noName.status, 200, '익명: 이름 없이 입장'); assert.equal(noName.json.name, undefined);
    assert.equal((await h.call('POST', '/mzzzzzzzzzzzz/join', { auth: 'user', body: { name: 'a' } })).status, 404);
    assert.equal((await h.call('POST', '/meetings/join', { auth: 'user', body: { name: 'a' } })).status, 404);

    const v = await h.join(mid, '김교사');
    assert.equal(v.role, 'viewer');
    assert.ok(v.pt && v.cid && v.token);
    const tok = h.fb.calls.tokens.at(-1);
    assert.deepEqual(tok.claims, { zz: 1, mid, role: 'viewer', until: v.tokenUntil });
    assert.ok(v.tokenUntil <= v.until && v.tokenUntil <= h.clock.t + 3600000, '맞춤 토큰 until 은 1시간 안(레드팀 RT-1)');
    assert.equal(tok.uid, 'zz_' + v.cid);
    // 관리자는 코드 없이 host
    const a = await h.join(mid, '관리자', 'admin');
    assert.equal(a.role, 'host'); assert.equal(h.fb.calls.tokens.at(-1).claims.role, 'host');

    // 자격 없이·엉터리 자격·viewer 의 host 요청·다른 회의 자격
    assert.equal((await h.call('POST', `/${mid}/chat`, { body: { text: 'hi' } })).json.error, 'pt_required');
    assert.equal((await h.call('POST', `/${mid}/chat`, { pt: 'nope', body: { text: 'hi' } })).json.error, 'pt_invalid');
    for (const [m, u, b] of [['POST', `/${mid}/state`, { action: 'start' }], ['POST', `/${mid}/boards`, {}], ['POST', `/${mid}/polls`, { q: 'q' }], ['GET', `/${mid}/export.md`]]) {
        const r = await h.call(m, u, { pt: v.pt, body: b });
        assert.equal(r.status, 403, u); assert.equal(r.json.error, 'host_only', u);
    }
    // AGENDA_OPEN: 참석자도 업로드 허가를 받는다(출입증 role 은 viewer 그대로). 발표하기는 회의 시작 뒤에만.
    const vu = await h.call('POST', `/${mid}/uploads`, { pt: v.pt, body: { kind: 'pdf', pages: 1, bytes: 10 } });
    assert.equal(vu.status, 201, vu.text); assert.equal(claimsOf(vu.json.token).role, 'viewer');
    assert.equal((await h.call('POST', `/${mid}/presenter`, { pt: v.pt, body: {} })).json.error, 'state_ready');
    const other = await h.call('POST', `/${mid2}/chat`, { pt: v.pt, body: { text: 'hi' } });
    assert.equal(other.status, 403); assert.equal(other.json.error, 'pt_other_meeting');
    const otherHost = await h.call('POST', `/${mid2}/state`, { pt: a.pt, body: { action: 'start' } });
    assert.equal(otherHost.json.error, 'pt_other_meeting', '관리자 host 자격도 다른 회의에는 못 쓴다');

    // 쓰기 OK (ready 상태 채팅)
    assert.equal((await h.call('POST', `/${mid}/chat`, { pt: v.pt, body: { text: '미리 의견' } })).status, 201);
    // ready 상태에서 손·투표는 안 된다
    assert.equal((await h.call('POST', `/${mid}/hand`, { pt: v.pt, body: { up: true } })).json.error, 'state_ready');

    // 12시간 지나면 자격 만료 → 다시 입장
    h.clock.t += 12 * 3600000;
    const exp = await h.call('POST', `/${mid}/chat`, { pt: v.pt, body: { text: 'late' } });
    assert.equal(exp.status, 401); assert.ok(['pt_expired', 'pt_invalid'].includes(exp.json.error));
    const v2 = await h.join(mid, '김교사');
    // 첫 발급 + 10일이 지나면 회의 자체가 막힌다(정리 작업과 무관)
    h.clock.t += 10 * DAY;
    const gone = await h.call('POST', `/${mid}/chat`, { pt: v2.pt, body: { text: 'x' } });
    assert.ok([401, 410].includes(gone.status), String(gone.status));
    const rejoin = await h.call('POST', `/${mid}/join`, { auth: 'user', body: { name: 'x' } });
    assert.equal(rejoin.status, 410); assert.equal(rejoin.json.error, 'meeting_gone');
    const list2 = await h.call('GET', '/meetings', { auth: 'user' });
    assert.ok(!list2.json.meetings.some(m => m.id === mid), '만료 회의는 일반 목록에서 빠진다');
});

test('설정 없음: Firebase·Redis 가 없으면 503, health 는 열림', async t => {
    const h = await setup({ noFb: true }); t.after(h.close);
    const r = await h.call('GET', '/meetings', { auth: 'admin' });
    assert.equal(r.status, 503); assert.equal(r.json.error, 'not_configured');
    const hh = await h.call('GET', '/health');
    assert.equal(hh.status, 200); assert.equal(hh.json.ok, false);
});

test('10일 만료는 첫 발급 시각 기준, 동시 입장에도 한 번만 정한다', async t => {
    const h = await setup(); t.after(h.close);
    const mid = await h.createMeeting();
    const created = h.fb.docs.get(`zzoom_meetings/${mid}`);
    assert.equal(created.firstKeyAt, null);
    h.clock.t += 3 * DAY;
    const rs = await Promise.all([1, 2, 3, 4].map(i => h.join(mid, '사람' + i)));
    const m = h.fb.docs.get(`zzoom_meetings/${mid}`);
    assert.ok(m.firstKeyAt > created.createdAt + 3 * DAY - 1);
    assert.equal(m.expiresAt, m.firstKeyAt + 10 * DAY);
    assert.ok(rs.every(r => r.until === rs[0].until || r.until === m.expiresAt));
    assert.ok(rs.every(r => r.exp <= m.expiresAt));
});

// ---------------------------------------------------------------- 주관 코드
test('주관 코드: 틀림·탭 5회 잠금·IP 20회 원자 증가·IP 잠금 중 맞는 코드도 거절·Redis 장애', async t => {
    const h = await setup(); t.after(h.close);
    const mid = await h.createMeeting();
    const v = await h.join(mid);
    const w1 = await h.call('POST', `/${mid}/host`, { pt: v.pt, body: { code: '000000' }, ip: '10.1.1.1' });
    assert.equal(w1.status, 403); assert.equal(w1.json.error, 'wrong_code'); assert.equal(w1.json.left, 4);
    assert.ok(!/hash|salt/.test(w1.text));
    for (let i = 0; i < 4; i++) assert.equal((await h.call('POST', `/${mid}/host`, { pt: v.pt, body: { code: '111111' }, ip: '10.1.1.1' })).status, 403);
    const locked = await h.call('POST', `/${mid}/host`, { pt: v.pt, body: { code: '123456' }, ip: '10.1.1.1' });
    assert.equal(locked.status, 429, '탭 5회 실패 뒤에는 맞는 코드도 거절'); assert.equal(locked.json.error, 'too_many_attempts');
    // 1시간 지나면 풀림
    h.clock.t += 3601000;
    const ok = await h.call('POST', `/${mid}/host`, { pt: v.pt, body: { code: '123456' }, ip: '10.1.1.1' });
    // 12시간 자격 안이므로 승격
    assert.equal(ok.status, 200, ok.text); assert.equal(ok.json.role, 'host');
    assert.notEqual(ok.json.pt, v.pt, '승격하면 새 자격');
    assert.equal((await h.call('POST', `/${mid}/chat`, { pt: v.pt, body: { text: 'x' } })).json.error, 'pt_invalid', '옛 자격은 폐기');

    // IP 한 곳에서 동시에 24번 틀리면 정확히 20번만 코드 확인까지 간다(INCR 원자)
    const mid2 = await h.createMeeting();
    const viewers = [];
    for (let i = 0; i < 6; i++) viewers.push(await h.join(mid2, '참석' + i));
    const burst = await Promise.all(viewers.flatMap(vv => [0, 1, 2, 3].map(() => h.call('POST', `/${mid2}/host`, { pt: vv.pt, body: { code: '999999' }, ip: '10.2.2.2', tick: 1 }))));
    const counts = burst.reduce((a, r) => { a[r.json.error] = (a[r.json.error] || 0) + 1; return a; }, {});
    assert.deepEqual(counts, { wrong_code: 20, too_many_attempts: 4 });
    const fresh = await h.join(mid2, '새 사람');
    const ipLocked = await h.call('POST', `/${mid2}/host`, { pt: fresh.pt, body: { code: '123456' }, ip: '10.2.2.2' });
    assert.equal(ipLocked.status, 429, 'IP 잠금 중에는 맞는 코드도 거절');
    // 다른 IP 에서는 됨, 성공한 시도는 장부에서 빠진다
    const okOther = await h.call('POST', `/${mid2}/host`, { pt: fresh.pt, body: { code: '123456' }, ip: '10.3.3.3' });
    assert.equal(okOther.status, 200);
    assert.equal(Number(await h.redis.get(`zz:try:${mid2}:all`)), 20, '코드까지 확인한 실패 20회만 남는다(한도에 걸린 5회·성공 1회는 되돌림, 감사 사소)');

    // Redis 장애면 host 발급 거절
    const mid3 = await h.createMeeting();
    const v3 = await h.join(mid3);
    const realEval = h.redis.eval;
    h.redis.eval = async () => { throw new Error('down'); };
    const down = await h.call('POST', `/${mid3}/host`, { pt: v3.pt, body: { code: '123456' }, ip: '10.4.4.4' });
    h.redis.eval = realEval;
    assert.equal(down.status, 503); assert.equal(down.json.error, 'redis_down');
});

test('주관 코드: 회의 전체 50회 잠금 → 관리자 풀기', async t => {
    const h = await setup(); t.after(h.close);
    const mid = await h.createMeeting();
    for (let i = 0; i < 10; i++) {
        const v = await h.join(mid, '시도' + i);
        for (let j = 0; j < 5; j++) assert.equal((await h.call('POST', `/${mid}/host`, { pt: v.pt, body: { code: '000000' }, ip: `10.5.${i}.1` })).json.error, 'wrong_code');
    }
    // 15분 임시 잠금: 틀린 적 있는 사람·IP 는 423(맞는 코드여도)
    const bad = await h.join(mid, '시도0');
    const lock = await h.call('POST', `/${mid}/host`, { pt: bad.pt, body: { code: '123456' }, ip: '10.5.0.1' });
    assert.equal(lock.status, 423); assert.equal(lock.json.error, 'host_locked');
    const list = await h.call('GET', '/meetings', { auth: 'admin' });
    assert.equal(list.json.meetings.find(m => m.id === mid).hostLocked, true);
    // 잠금 DoS 막기(레드팀 RT-2): 이 창에서 처음 시도하는 사람·IP 의 맞는 코드는 들어간다
    const v = await h.join(mid, '정상');
    const ok0 = await h.call('POST', `/${mid}/host`, { pt: v.pt, body: { code: '123456' }, ip: '10.6.0.1' });
    assert.equal(ok0.status, 200, ok0.text);
    // 15분이 지나면 저절로 풀린다(틀린 사람도 다시 시도 가능)
    h.clock.t += 15 * 60000 + 1000;
    const again = await h.join(mid, '시도1');
    assert.equal((await h.call('POST', `/${mid}/host`, { pt: again.pt, body: { code: '123456' }, ip: '10.5.1.1' })).status, 200);
    assert.equal((await h.call('POST', `/meetings/${mid}/unlock`, { auth: 'user' })).status, 403);
    assert.equal((await h.call('POST', `/meetings/${mid}/unlock`, { auth: 'admin' })).status, 200);
});

test('주관 코드: 회의 평생 200번 틀리면 관리자가 풀 때까지 잠금(대입 상한)', async t => {
    const h = await setup(); t.after(h.close);
    const mid = await h.createMeeting();
    await h.redis.set(`zz:try:${mid}:life`, '200');
    const v = await h.join(mid, '정상');
    const r = await h.call('POST', `/${mid}/host`, { pt: v.pt, body: { code: '123456' }, ip: '10.6.0.9' });
    assert.equal(r.status, 423);
    assert.equal((await h.call('POST', `/meetings/${mid}/unlock`, { auth: 'admin' })).status, 200);
    assert.equal((await h.call('POST', `/${mid}/host`, { pt: v.pt, body: { code: '123456' }, ip: '10.6.0.9' })).status, 200);
});

test('주관 코드 바꾸면 옛 host 는 다음 쓰기부터 거절, 재발급은 viewer', async t => {
    const h = await setup(); t.after(h.close);
    const mid = await h.createMeeting();
    const host = await h.asHost(mid);
    const admin = await h.join(mid, '관리자', 'admin');
    assert.equal((await h.call('POST', `/${mid}/boards`, { pt: host.pt, body: {} })).status, 201);
    const p = await h.call('PATCH', `/meetings/${mid}`, { auth: 'admin', body: { hostCode: '654321' } });
    assert.equal(p.status, 200); assert.equal(p.json.codeChanged, true);
    const r = await h.call('POST', `/${mid}/boards`, { pt: host.pt, body: {} });
    assert.equal(r.status, 403); assert.equal(r.json.error, 'host_revoked');
    const rf = await h.call('POST', `/${mid}/refresh`, { pt: host.pt });
    assert.equal(rf.status, 200); assert.equal(h.fb.calls.tokens.at(-1).claims.role, 'viewer');
    // 관리자 host 는 코드와 무관
    assert.equal((await h.call('POST', `/${mid}/boards`, { pt: admin.pt, body: {} })).status, 201);
    // 옛 코드는 틀림, 새 코드는 됨
    assert.equal((await h.call('POST', `/${mid}/host`, { pt: host.pt, body: { code: '123456' }, ip: '10.7.0.1' })).json.error, 'wrong_code');
    assert.equal((await h.call('POST', `/${mid}/host`, { pt: host.pt, body: { code: '654321' }, ip: '10.7.0.1' })).status, 200);
});

// ---------------------------------------------------------------- 진행
test('진행: 진행자 1명, 넘겨받기, 옛 epoch·옛 rev 거절, forceSeq', async t => {
    const h = await setup(); t.after(h.close);
    const mid = await h.createMeeting();
    const A = await h.join(mid, '관리자', 'admin');
    const B = await h.asHost(mid, '부장');
    const V = await h.join(mid, '참석');
    const aid = await h.board(mid, A, 3);
    assert.equal((await h.call('POST', `/${mid}/live`, { pt: A.pt, body: { aid, page: 1, baseRev: 0, epoch: 0 } })).json.error, 'state_ready', '시작 전 진행 거절');
    const st = await h.call('POST', `/${mid}/state`, { pt: A.pt, body: { action: 'start' } });
    assert.equal(st.status, 200); assert.equal(st.json.meeting.presenter.cid, A.cid);
    let live = st.json.meeting.live;
    assert.equal((await h.call('POST', `/${mid}/state`, { pt: A.pt, body: { action: 'start' } })).status, 409, '두 번 시작');
    assert.equal((await h.call('POST', `/${mid}/live`, { pt: V.pt, body: { aid, page: 2, baseRev: live.rev, epoch: live.epoch } })).json.error, 'not_presenter', '진행자가 아닌 참석자');
    const notP = await h.call('POST', `/${mid}/live`, { pt: B.pt, body: { aid, page: 2, baseRev: live.rev, epoch: live.epoch } });
    assert.equal(notP.status, 409); assert.equal(notP.json.error, 'not_presenter');
    let r = await h.call('POST', `/${mid}/live`, { pt: A.pt, body: { aid, page: 2, baseRev: live.rev, epoch: live.epoch, view: { cx: 9, cy: -1, z: 99 } } });
    assert.equal(r.status, 200); assert.deepEqual(r.json.live.view, { cx: 1, cy: 0, z: 6 }); assert.equal(r.json.live.rev, live.rev + 1);
    // 역순 응답: 옛 baseRev 로 다시 보내면 409 + 최신 상태
    const stale = await h.call('POST', `/${mid}/live`, { pt: A.pt, body: { aid, page: 3, baseRev: live.rev, epoch: live.epoch } });
    assert.equal(stale.status, 409); assert.equal(stale.json.error, 'stale_rev'); assert.equal(stale.json.live.page, 2);
    live = r.json.live;
    assert.equal((await h.call('POST', `/${mid}/live`, { pt: A.pt, body: { aid, page: 9, baseRev: live.rev, epoch: live.epoch } })).json.error, 'bad_page');
    assert.equal((await h.call('POST', `/${mid}/live`, { pt: A.pt, body: { aid: 'bxxxxxxxxxxxxx', page: 1, baseRev: live.rev, epoch: live.epoch } })).json.error, 'bad_aid');
    // B 가 넘겨받음 → epoch+1, A 의 옛 쓰기는 거절
    const take = await h.call('POST', `/${mid}/presenter`, { pt: B.pt, body: {} });
    assert.equal(take.status, 200); assert.equal(take.json.presenter.cid, B.cid); assert.equal(take.json.presenter.epoch, live.epoch + 1);
    const oldA = await h.call('POST', `/${mid}/live`, { pt: A.pt, body: { aid, page: 3, baseRev: live.rev, epoch: live.epoch } });
    assert.equal(oldA.status, 409); assert.equal(oldA.json.error, 'not_presenter'); assert.equal(oldA.json.presenter.cid, B.cid);
    live = take.json.live;
    // 동시에 두 번 보내면 하나만 반영
    const both = await Promise.all([3, 1].map(page => h.call('POST', `/${mid}/live`, { pt: B.pt, body: { aid, page, baseRev: live.rev, epoch: live.epoch }, tick: 1 })));
    assert.deepEqual(both.map(x => x.status).sort(), [200, 409]);
    const cur = h.fb.docs.get(`zzoom_meetings/${mid}`).live;
    assert.equal(cur.rev, live.rev + 1);
    // 모두 내 화면으로
    const f = await h.call('POST', `/${mid}/live`, { pt: B.pt, body: { aid, page: 1, baseRev: cur.rev, epoch: cur.epoch, force: true } });
    assert.equal(f.json.live.forceSeq, (cur.forceSeq || 0) + 1);
    // 끝내면 진행 거절
    assert.equal((await h.call('POST', `/${mid}/state`, { pt: B.pt, body: { action: 'end' } })).status, 200);
    assert.equal((await h.call('POST', `/${mid}/live`, { pt: B.pt, body: { aid, page: 2, baseRev: f.json.live.rev, epoch: f.json.live.epoch } })).json.error, 'state_ended');
});

// ---------------------------------------------------------------- 판서
test('판서: 새 형식 검증·epoch·seq·잠금·상한', async t => {
    const h = await setup(); t.after(h.close);
    const mid = await h.createMeeting();
    const A = await h.join(mid, '관리자', 'admin');
    const V = await h.join(mid, '참석');
    const W = await h.join(mid, '참석2');
    const aid = await h.board(mid, A, 2);
    const pk = `${aid}_1`;
    const bad = async (s, code) => { const r = await h.call('POST', `/${mid}/strokes`, { pt: V.pt, body: s }); assert.equal(r.status, 400, JSON.stringify(s).slice(0, 80)); assert.equal(r.json.error, code); };
    await bad(stroke(pk, { tool: 'marker' }), 'bad_tool');
    await bad(stroke(pk, { tool: 'hl', color: '#E5484D' }), 'bad_color');          // 형광펜에 펜 색
    await bad(stroke(pk, { tool: 'pen', color: '#FFE14D' }), 'bad_color');         // 펜에 형광펜 색
    await bad(stroke(pk, { color: '#123456' }), 'bad_color');
    await bad(stroke(pk, { w: 0.0005 }), 'bad_width');
    await bad(stroke(pk, { w: 0.06 }), 'bad_width');
    await bad(stroke(pk, { w: '0.004' }), 'bad_width');
    await bad(stroke(pk, { pts: [0.1, 0.1, 0.5, 0.2, 0.2] }), 'bad_pts');          // 3의 배수 아님
    await bad(stroke(pk, { pts: [0.1, 0.1, 0.5] }), 'bad_pts');                    // 6 미만
    await bad(stroke(pk, { pts: new Array(4503).fill(0.5) }), 'bad_pts');          // 4,500 넘음
    await bad(stroke(pk, { pts: [0.1, 1.2, 0.5, 0.2, 0.2, 0.5] }), 'bad_pts');     // 쪽 밖
    await bad(stroke(pk, { pts: [0.1, 0.1, -0.1, 0.2, 0.2, 0.5] }), 'bad_pts');    // 필압 음수
    await bad(stroke(pk, { pts: [0.1, 0.1, 0.5, 0.2, 0.2, null] }), 'bad_pts');
    await bad(stroke(pk, { pts: [[0.1, 0.1, 0.5], [0.2, 0.2, 0.5]] }), 'bad_pts');  // 옛 형식(점 배열)
    await bad(stroke(pk, { group: 'g'.repeat(41) }), 'bad_group');
    await bad(stroke(pk, { part: 21 }), 'bad_part');
    await bad(stroke(pk, { part: 1.5 }), 'bad_part');
    await bad(stroke(`${aid}_9`), 'bad_pageKey');                                   // 없는 쪽
    await bad(stroke('bxxxxxxxxxxxxx_1'), 'bad_pageKey');                           // 없는 안건
    await bad(stroke('../x_1'), 'bad_pageKey');
    await bad(stroke(pk, { epoch: undefined }), 'bad_epoch');

    // 정상: 형광펜 + 4,500 개 + group/part, 서버가 at·seq·cid·name 부여(보낸 cid 는 무시)
    const big = Array.from({ length: 4500 }, (_, i) => (i % 3 === 2 ? 0.5 : (i % 997) / 1000));
    const ok = await h.call('POST', `/${mid}/strokes`, { pt: V.pt, body: { ...stroke(pk, { tool: 'hl', color: '#ffe14d', w: 0.018, pts: big, group: 'g1', part: 0 }), cid: 'cfake', name: '가짜', seq: 99 } });
    assert.equal(ok.status, 201, ok.text);
    const sid = ok.json.strokes[0].id;
    const doc = h.fb.docs.get(`zzoom_meetings/${mid}/strokes/${sid}`);
    assert.equal(doc.cid, V.cid); assert.equal(doc.name, undefined, '익명: 선에 이름 없음'); assert.equal(doc.seq, 1); assert.equal(doc.color, '#FFE14D');
    assert.equal(doc.pts.length, 4500); assert.equal(doc.group, 'g1'); assert.equal(doc.part, 0); assert.equal(typeof doc.at, 'number');
    assert.ok(!('outline' in doc));
    const ok2 = await h.call('POST', `/${mid}/strokes`, { pt: W.pt, body: stroke(pk, { pts: [0.12345678, 0.5, 0.333333, 0.2, 0.2, 1] }) });
    assert.equal(ok2.json.strokes[0].seq, 2, '쪽별 seq 증가');
    assert.equal(h.fb.docs.get(`zzoom_meetings/${mid}/strokes/${ok2.json.strokes[0].id}`).pts[0], 0.1235);
    assert.equal((await h.call('POST', `/${mid}/strokes`, { pt: W.pt, body: stroke(`${aid}_2`) })).json.strokes[0].seq, 1, '다른 쪽은 따로 센다');

    // 남의 선 지우기 거절, host 는 됨
    assert.equal((await h.call('DELETE', `/${mid}/strokes/${sid}`, { pt: W.pt })).json.error, 'not_owner');
    // 판서 잠금: viewer 쓰기 거절, host 는 됨
    assert.equal((await h.call('POST', `/${mid}/state`, { pt: A.pt, body: { action: 'penLock', value: true } })).status, 200);
    assert.equal((await h.call('POST', `/${mid}/strokes`, { pt: V.pt, body: stroke(pk) })).json.error, 'pen_locked');
    assert.equal((await h.call('POST', `/${mid}/strokes`, { pt: A.pt, body: stroke(pk) })).status, 201);
    await h.call('POST', `/${mid}/state`, { pt: A.pt, body: { action: 'penLock', value: false } });
    assert.equal((await h.call('DELETE', `/${mid}/strokes/${sid}`, { pt: A.pt })).status, 200);

    // 쪽 지우기 → epoch+1, 옛 epoch 선 저장 거절, 옛 선은 지워짐
    assert.equal((await h.call('POST', `/${mid}/pages/${pk}/clear`, { pt: V.pt })).json.error, 'host_only');
    const cl = await h.call('POST', `/${mid}/pages/${pk}/clear`, { pt: A.pt });
    assert.equal(cl.json.epoch, 1);
    const old = await h.call('POST', `/${mid}/strokes`, { pt: V.pt, body: stroke(pk, { epoch: 0 }) });
    assert.equal(old.status, 409); assert.equal(old.json.error, 'stale_epoch'); assert.equal(old.json.epoch, 1);
    const left = [...h.fb.docs.entries()].filter(([p, d]) => p.includes('/strokes/') && d.pageKey === pk);
    assert.equal(left.length, 0, '옛 epoch 선 정리');
    assert.equal((await h.call('POST', `/${mid}/strokes`, { pt: V.pt, body: stroke(pk, { epoch: 1 }) })).status, 201);

    // 상한: 쪽당 2,000
    await h.redis.hset(`zz:sc:${mid}`, { [pk]: 2000 });
    const lim = await h.call('POST', `/${mid}/strokes`, { pt: V.pt, body: stroke(pk, { epoch: 1 }) });
    assert.equal(lim.status, 409); assert.equal(lim.json.error, 'stroke_limit');
    assert.equal(await h.redis.hget(`zz:sc:${mid}`, pk), '2000', '거절하면 개수를 되돌린다');
    // 회의당 2만
    await h.redis.hset(`zz:sc:${mid}`, { all: 20000 });
    assert.equal((await h.call('POST', `/${mid}/strokes`, { pt: V.pt, body: stroke(`${aid}_2`) })).json.error, 'stroke_limit');
    // 속도 제한: 같은 탭 1초 2번
    await h.redis.hset(`zz:sc:${mid}`, { all: 0 });
    // 판서 속도 제한: 같은 탭 1초에 3번까지(묶음 하나 = 1번), 4번째는 429
    const fast = await Promise.all([0, 1, 2, 3].map(() => h.call('POST', `/${mid}/strokes`, { pt: W.pt, body: stroke(`${aid}_2`), tick: 0 })));
    assert.deepEqual(fast.map(x => x.status).sort(), [201, 201, 201, 429]);
});

// ---------------------------------------------------------------- 채팅·손
test('채팅·손: 길이·본인 지우기·남의 손·끝난 뒤 잠금', async t => {
    const h = await setup(); t.after(h.close);
    const mid = await h.createMeeting();
    const A = await h.join(mid, '관리자', 'admin');
    const V = await h.join(mid, '참석');
    const W = await h.join(mid, '참석2');
    assert.equal((await h.call('POST', `/${mid}/chat`, { pt: V.pt, body: { text: 'x'.repeat(501) } })).json.error, 'bad_text');
    assert.equal((await h.call('POST', `/${mid}/chat`, { pt: V.pt, body: { text: '   ' } })).json.error, 'bad_text');
    const c = await h.call('POST', `/${mid}/chat`, { pt: V.pt, body: { text: '의견', cid: W.cid, name: '사칭' } });
    const cd = h.fb.docs.get(`zzoom_meetings/${mid}/chat/${c.json.id}`);
    assert.equal(cd.cid, V.cid); assert.equal(cd.name, undefined, '익명: 채팅에 이름 없음(사칭 name 도 버림)');
    assert.equal((await h.call('DELETE', `/${mid}/chat/${c.json.id}`, { pt: W.pt })).json.error, 'not_owner');
    assert.equal((await h.call('DELETE', `/${mid}/chat/${c.json.id}`, { pt: A.pt })).status, 200);
    await h.call('POST', `/${mid}/state`, { pt: A.pt, body: { action: 'start' } });
    assert.equal((await h.call('POST', `/${mid}/hand`, { pt: V.pt, body: { up: true } })).json.up, true);
    assert.equal((await h.call('POST', `/${mid}/hand`, { pt: W.pt, body: { up: true } })).json.up, true);
    assert.equal((await h.call('POST', `/${mid}/hand`, { pt: W.pt, body: { up: false, cid: V.cid } })).json.error, 'host_only', '남의 손 내리기');
    assert.equal((await h.call('POST', `/${mid}/hand`, { pt: W.pt, body: { all: true } })).json.error, 'host_only');
    assert.equal((await h.call('POST', `/${mid}/hand`, { pt: A.pt, body: { up: true, cid: V.cid } })).json.error, 'bad_hand', 'host 도 남의 손을 올리진 못함');
    assert.equal((await h.call('POST', `/${mid}/hand`, { pt: A.pt, body: { up: false, cid: V.cid } })).status, 200);
    assert.equal((await h.call('POST', `/${mid}/hand`, { pt: A.pt, body: { all: true } })).json.lowered, 1);
    // 접속 표시: 30초마다 counts
    const hb = await h.call('POST', `/${mid}/heartbeat`, { pt: V.pt, body: {}, tick: 31000 });
    assert.equal(hb.status, 200); assert.ok(hb.json.counts.people >= 1);
    // sendBeacon(본문 pt)
    assert.equal((await h.call('POST', `/${mid}/heartbeat`, { body: { pt: W.pt, leaving: true } })).status, 200);
    assert.equal(h.fb.docs.get(`zzoom_meetings/${mid}/people/${W.cid}`).left, true);
    await h.call('POST', `/${mid}/state`, { pt: A.pt, body: { action: 'end' } });
    assert.equal((await h.call('POST', `/${mid}/chat`, { pt: V.pt, body: { text: '늦은 글' } })).json.error, 'state_ended');
    assert.equal((await h.call('POST', `/${mid}/strokes`, { pt: V.pt, body: stroke('bxxxxxxxxxxxxx_1') })).json.error, 'state_ended');
    assert.equal((await h.call('POST', `/${mid}/state`, { pt: A.pt, body: { action: 'start' } })).json.error, 'state_ended', '다시 열기 없음');
});

// ---------------------------------------------------------------- 투표
test('투표: 원표 비노출·바꾸기·마감 동시·숨긴 결과·공개 투표 없음(ANON)', async t => {
    const h = await setup(); t.after(h.close);
    const mid = await h.createMeeting();
    const A = await h.join(mid, '관리자', 'admin');
    const vs = [];
    for (let i = 0; i < 4; i++) vs.push(await h.join(mid, '교사' + i));
    await h.call('POST', `/${mid}/state`, { pt: A.pt, body: { action: 'start' } });
    assert.equal((await h.call('POST', `/${mid}/polls`, { pt: A.pt, body: { q: '', options: ['a', 'b'] } })).json.error, 'bad_question');
    assert.equal((await h.call('POST', `/${mid}/polls`, { pt: A.pt, body: { q: 'q', options: ['a'] } })).json.error, 'bad_options');
    assert.equal((await h.call('POST', `/${mid}/polls`, { pt: A.pt, body: { q: 'q', options: ['1', '2', '3', '4', '5', '6', '7'] } })).json.error, 'bad_options');
    const p = await h.call('POST', `/${mid}/polls`, { pt: A.pt, body: { q: '체험학습 장소 정하기' } });
    assert.equal(p.status, 201); assert.equal(p.json.poll.anonymous, true, '기본 비공개');
    const pid = p.json.pid;
    assert.deepEqual(p.json.poll.options.map(o => o.label), ['찬성', '반대', '보류']);
    assert.equal((await h.call('POST', `/${mid}/polls`, { pt: A.pt, body: { q: '두 번째' } })).json.error, 'poll_open');
    assert.equal((await h.call('POST', `/${mid}/polls/${pid}/vote`, { pt: vs[0].pt, body: { optionId: 'o9' } })).json.error, 'bad_option');
    const v1 = await h.call('POST', `/${mid}/polls/${pid}/vote`, { pt: vs[0].pt, body: { optionId: 'o1' } });
    assert.equal(v1.json.changed, true);
    assert.equal((await h.call('POST', `/${mid}/polls/${pid}/vote`, { pt: vs[0].pt, body: { optionId: 'o1' } })).json.changed, false);
    await h.call('POST', `/${mid}/polls/${pid}/vote`, { pt: vs[0].pt, body: { optionId: 'o2' } });   // 바꾸기
    await h.call('POST', `/${mid}/polls/${pid}/vote`, { pt: vs[1].pt, body: { optionId: 'o2' } });
    await h.call('POST', `/${mid}/polls/${pid}/vote`, { pt: vs[2].pt, body: { optionId: 'o3' } });
    // 참석자는 집계를 못 본다, 내 선택만 본다
    assert.equal((await h.call('GET', `/${mid}/polls/${pid}/tally`, { pt: vs[0].pt })).json.error, 'host_only');
    assert.equal((await h.call('GET', `/${mid}/polls/${pid}/mine`, { pt: vs[0].pt })).json.optionId, 'o2');
    assert.equal((await h.call('GET', `/${mid}/polls/${pid}/mine`, { pt: vs[3].pt })).json.optionId, null);
    const tl = await h.call('GET', `/${mid}/polls/${pid}/tally`, { pt: A.pt });
    assert.deepEqual(tl.json, { status: 'open', tally: { o1: 0, o2: 2, o3: 1 }, total: 3 });
    assert.ok(!tl.text.includes(vs[0].cid), '주관자 집계에도 개인 선택 없음');
    // Firestore 에는 결과 보이기 전 숫자도, 개인 선택도 없다
    const fsPoll = JSON.stringify([...h.fb.docs.entries()].filter(([k]) => k.includes('/polls/')));
    assert.ok(!fsPoll.includes(vs[0].cid)); assert.equal(h.fb.docs.get(`zzoom_meetings/${mid}/polls/${pid}`).tally, null);
    // 마감과 동시에 들어온 표: 마감 뒤 반영은 없어야 한다
    const [late, cls] = await Promise.all([
        h.call('POST', `/${mid}/polls/${pid}/close`, { pt: A.pt, tick: 1 }),
        h.call('POST', `/${mid}/polls/${pid}/vote`, { pt: vs[3].pt, body: { optionId: 'o1' }, tick: 1 })
    ]).then(([c, v]) => [v, c]);
    assert.equal(cls.status, 200);
    assert.ok([200, 409].includes(late.status));
    const after = (await h.call('GET', `/${mid}/polls/${pid}/tally`, { pt: A.pt })).json;
    assert.equal(after.status, 'closed'); assert.equal(after.total, late.status === 200 ? 4 : 3);
    assert.equal((await h.call('POST', `/${mid}/polls/${pid}/vote`, { pt: vs[1].pt, body: { optionId: 'o1' } })).json.error, 'poll_closed');
    // 비공개 reveal: 숫자만, 이름 없음
    const rv = await h.call('POST', `/${mid}/polls/${pid}/reveal`, { pt: A.pt });
    assert.equal(rv.json.poll.names, null); assert.equal(rv.json.poll.revealed, true);
    assert.ok(!JSON.stringify(h.fb.docs.get(`zzoom_meetings/${mid}/polls/${pid}`)).match(/교사\d/), 'Firestore 에 이름 없음');

    // 익명(ANON): 공개 투표를 달라고 해도(anonymous:false) 비공개로 만들고, 결과는 항목별 수만
    const p2 = await h.call('POST', `/${mid}/polls`, { pt: A.pt, body: { q: '두 번째 투표', options: ['가', '나'], anonymous: false } });
    assert.equal(p2.json.poll.anonymous, true, '공개 투표 없음');
    const pid2 = p2.json.pid;
    await h.call('POST', `/${mid}/polls/${pid2}/vote`, { pt: vs[0].pt, body: { optionId: 'o1' } });
    await h.call('POST', `/${mid}/polls/${pid2}/vote`, { pt: vs[1].pt, body: { optionId: 'o2' } });
    const rv2 = await h.call('POST', `/${mid}/polls/${pid2}/reveal`, { pt: A.pt });
    assert.equal(rv2.json.poll.names, null, 'reveal 해도 이름 없음');
    assert.deepEqual(rv2.json.poll.tally, { o1: 1, o2: 1 });
    // 원표 장부(Redis)에도 이름이 없다
    assert.ok(!JSON.stringify(await h.redis.hgetall(`zz:vote:${mid}:${pid2}`)).includes('교사'), 'Redis 원표에 이름 없음');

    // AI용 md: 투표는 숫자만
    const md = await h.call('GET', `/${mid}/export.md`, { pt: A.pt });
    assert.equal(md.status, 200); assert.match(md.headers.get('content-type'), /markdown/);
    assert.match(md.headers.get('content-disposition'), /filename\*=UTF-8''/);
    assert.ok(md.text.includes('체험학습 장소 정하기 (비공개)'));
    assert.ok(md.text.includes('두 번째 투표 (비공개)'));
    assert.ok(!/교사[0-3]|관리자/.test(md.text), 'md 어디에도 이름 없음');
    // 끝내면 열린 투표도 닫힘
    const p3 = await h.call('POST', `/${mid}/polls`, { pt: A.pt, body: { q: '세 번째' } });
    await h.call('POST', `/${mid}/state`, { pt: A.pt, body: { action: 'end' } });
    assert.equal(h.fb.docs.get(`zzoom_meetings/${mid}/polls/${p3.json.pid}`).status, 'closed');
});

// ---------------------------------------------------------------- 녹음
test('녹음: host 만, 소리 형식·크기, 녹음 끈 회의 거절, 소리는 저장 안 함', async t => {
    const h = await setup(); t.after(h.close);
    const mid = await h.createMeeting();
    const A = await h.join(mid, '관리자', 'admin');
    const V = await h.join(mid, '참석');
    const audio = Buffer.alloc(2048, 7);
    assert.equal((await h.call('POST', `/${mid}/transcribe?n=0`, { pt: A.pt, raw: audio })).json.error, 'state_ready');
    await h.call('POST', `/${mid}/state`, { pt: A.pt, body: { action: 'start' } });
    await h.call('POST', `/${mid}/state`, { pt: A.pt, body: { action: 'recording', value: true } });
    assert.equal((await h.call('POST', `/${mid}/transcribe?n=0`, { pt: V.pt, raw: audio })).json.error, 'host_only');
    assert.equal((await h.call('POST', `/${mid}/transcribe?n=0`, { pt: A.pt, raw: audio, type: 'text/plain' })).status, 415);
    assert.equal((await h.call('POST', `/${mid}/transcribe`, { pt: A.pt, raw: audio })).json.error, 'bad_n');
    assert.equal((await h.call('POST', `/${mid}/transcribe?n=0`, { pt: A.pt, raw: Buffer.alloc(3 * 1048576 + 10) })).status, 413);
    const ok = await h.call('POST', `/${mid}/transcribe?n=3`, { pt: A.pt, raw: audio, type: 'audio/webm;codecs=opus' });
    assert.equal(ok.status, 201, ok.text); assert.equal(ok.json.text, '첫 안건 이야기');
    assert.deepEqual(h.groqCalls.at(-1), { bytes: 2048, mime: 'audio/webm', language: 'ko' });
    const tr = h.fb.docs.get(`zzoom_meetings/${mid}/transcript/t00003`);
    assert.deepEqual(Object.keys(tr).sort(), ['aid', 'at', 'n', 'page', 'text']);
    assert.equal(h.fb.objects.size, 0, 'Storage 에 소리 없음');

    const mid2 = await h.createMeeting({ allowRecording: false });
    const A2 = await h.join(mid2, '관리자', 'admin');
    await h.call('POST', `/${mid2}/state`, { pt: A2.pt, body: { action: 'start' } });
    assert.equal((await h.call('POST', `/${mid2}/state`, { pt: A2.pt, body: { action: 'recording', value: true } })).json.error, 'recording_off');
    assert.equal((await h.call('POST', `/${mid2}/transcribe?n=0`, { pt: A2.pt, raw: audio })).json.error, 'recording_off');
});

// ---------------------------------------------------------------- 업로드
test('업로드: 허가·commit 위조·빠진 파일·형식·크기·재시도·진행 중 안건 지우기', async t => {
    const h = await setup(); t.after(h.close);
    const mid = await h.createMeeting(), mid2 = await h.createMeeting();
    const A = await h.join(mid, '관리자', 'admin');
    const A2 = await h.join(mid2, '관리자', 'admin');
    const bad = async (body, code) => assert.equal((await h.call('POST', `/${mid}/uploads`, { pt: A.pt, body })).json.error, code);
    await bad({ kind: 'ppt', pages: 1, bytes: 10 }, 'bad_kind');
    await bad({ kind: 'pdf', pages: 201, bytes: 10 }, 'bad_pages');
    await bad({ kind: 'pdf', pages: 0, bytes: 10 }, 'bad_pages');
    await bad({ kind: 'pdf', pages: 2, bytes: 52428800 }, 'too_large');
    await bad({ kind: 'image', pages: 1, bytes: 10, ext: 'svg' }, 'bad_ext');
    const up = await h.call('POST', `/${mid}/uploads`, { pt: A.pt, body: { kind: 'pdf', pages: 2, bytes: 5000 } });
    assert.equal(up.status, 201);
    const { uploadId, path } = up.json;
    assert.equal(path, `zzoom/${mid}/up/${uploadId}/`);
    assert.deepEqual(up.json.files, { pages: ['p001.webp', 'p002.webp'], thumbs: ['t001.webp', 't002.webp'], original: 'original.pdf' });
    const commit = (body, pt = A.pt, m = mid, u = uploadId) => h.call('POST', `/${m}/uploads/${u}/commit`, { pt, body });
    const body = { title: '안건1', pages: 2, sizes: [[1414, 2000], [1414, 2000]], originalName: '계획.pdf' };
    // 위조: 다른 회의·없는 id·viewer
    assert.equal((await commit(body, A2.pt, mid2)).json.error, 'upload_unknown');
    assert.equal((await commit(body, A.pt, mid, 'uxxxxxxxxxxxxx')).json.error, 'upload_unknown');
    const V = await h.join(mid, '참석');
    assert.equal((await commit(body, V.pt)).json.error, 'not_your_upload', '남의 허가는 확정 못 함');
    // 허가와 다른 쪽 수·크기
    assert.equal((await commit({ ...body, pages: 3 })).json.error, 'pages_mismatch');
    assert.equal((await commit({ ...body, sizes: [[1414, 2000]] })).json.error, 'bad_sizes');
    assert.equal((await commit({ ...body, sizes: [[1414, 2001], [10, 10]] })).json.error, 'bad_sizes');
    // 파일 빠짐(중간 실패)
    h.fb.put(path + 'p001.webp', 100000, 'image/webp');
    h.fb.put(path + 't001.webp', 9000, 'image/webp');
    let r = await commit(body);
    assert.equal(r.status, 422); assert.match(r.json.message, /p002\.webp/);
    // 형식 틀림
    h.fb.put(path + 'p002.webp', 100000, 'image/png');
    h.fb.put(path + 't002.webp', 9000, 'image/webp');
    assert.match((await commit(body)).json.message, /webp 가 아닙니다/);
    // 크기 넘음
    h.fb.put(path + 'p002.webp', 5 * 1048576, 'image/webp');
    assert.match((await commit(body)).json.message, /한도/);
    h.fb.put(path + 'p002.webp', 100000, 'image/webp');
    // 원본 크기가 허가와 다름
    h.fb.put(path + 'original.pdf', 4999, 'application/pdf');
    assert.match((await commit(body)).json.message, /원본 크기/);
    h.fb.put(path + 'original.pdf', 5000, 'text/html');
    assert.match((await commit(body)).json.message, /원본 형식/);
    h.fb.put(path + 'original.pdf', 5000, 'application/pdf');
    // 허가 안 받은 파일
    h.fb.put(path + 'evil.html', 10, 'text/html');
    assert.match((await commit(body)).json.message, /허가받지 않은 파일/);
    h.fb.objects.delete(path + 'evil.html');
    // 아직 안건으로 공개되지 않음
    assert.equal(h.fb.docs.get(`zzoom_meetings/${mid}`).agendaOrder.length, 0);
    r = await commit(body);
    assert.equal(r.status, 201, r.text);
    const aid = r.json.aid;
    assert.equal(r.json.agenda.original.bytes, 5000);
    assert.deepEqual(h.fb.docs.get(`zzoom_meetings/${mid}`).agendaOrder, [aid]);
    // commit 재시도는 같은 결과, 중복 추가 없음
    const again = await commit(body);
    assert.equal(again.json.already, true); assert.deepEqual(h.fb.docs.get(`zzoom_meetings/${mid}`).agendaOrder, [aid]);
    assert.equal(await h.redis.get(`zz:up:${uploadId}`), null, '허가는 한 번 쓰면 사라짐');
    // 안건 순서·제목
    const b2 = await h.board(mid, A);
    const pa = await h.call('PATCH', `/${mid}/agenda/${b2}`, { pt: A.pt, body: { index: 0, title: '먼저 볼 판' } });
    assert.deepEqual(pa.json.agendaOrder, [b2, aid]);
    // 진행 중 안건은 못 지움
    await h.call('POST', `/${mid}/state`, { pt: A.pt, body: { action: 'start' } });
    const del = await h.call('DELETE', `/${mid}/agenda/${b2}`, { pt: A.pt });
    assert.equal(del.status, 409); assert.equal(del.json.error, 'agenda_live');
    assert.equal((await h.call('DELETE', `/${mid}/agenda/${aid}`, { pt: V.pt })).json.error, 'not_agenda_owner');
    assert.equal((await h.call('DELETE', `/${mid}/agenda/${aid}`, { pt: A.pt })).status, 200);
    assert.equal([...h.fb.objects.keys()].filter(k => k.startsWith(path)).length, 0, '지운 안건 그림도 지움');

    // commit 안 한 업로드는 24시간 뒤 정리 작업이 지운다
    const up2 = await h.call('POST', `/${mid}/uploads`, { pt: A.pt, body: { kind: 'image', ext: 'png', pages: 1, bytes: 10 } });
    h.fb.put(up2.json.path + 'p001.webp', 10, 'image/webp');
    h.clock.t += DAY + 1000;
    const cron = await h.call('GET', '/maintenance/purge', { headers: { Authorization: 'Bearer cron-secret' } });
    assert.equal(cron.json.uploads, 1);
    assert.equal([...h.fb.objects.keys()].filter(k => k.startsWith(up2.json.path)).length, 0);
});

// ---------------------------------------------------------------- 삭제·정리
test('삭제: 즉시 정리·중복 실행·중간 실패 뒤 이어서·cron 인증·만료 직후 접근', async t => {
    const h = await setup(); t.after(h.close);
    async function fill(mid) {
        const A = await h.join(mid, '관리자', 'admin');
        const V = await h.join(mid, '참석');
        const aid = await h.board(mid, A);
        await h.call('POST', `/${mid}/strokes`, { pt: V.pt, body: stroke(`${aid}_1`) });
        await h.call('POST', `/${mid}/chat`, { pt: V.pt, body: { text: '글' } });
        await h.call('POST', `/${mid}/state`, { pt: A.pt, body: { action: 'start' } });
        await h.call('POST', `/${mid}/polls`, { pt: A.pt, body: { q: 'q' } });
        const up = await h.call('POST', `/${mid}/uploads`, { pt: A.pt, body: { kind: 'pdf', pages: 1, bytes: 10 } });
        h.fb.put(up.json.path + 'p001.webp', 10, 'image/webp');
        return { A, V };
    }
    const leftovers = mid => ({
        docs: [...h.fb.docs.keys()].filter(k => k.includes(mid)).length,
        objects: [...h.fb.objects.keys()].filter(k => k.includes(mid)).length,
        redis: h.redis.keysLike(new RegExp(mid)).length
    });
    const mid = await h.createMeeting();
    const { V } = await fill(mid);
    assert.ok(leftovers(mid).docs > 5 && leftovers(mid).objects === 1 && leftovers(mid).redis > 2);
    // 2026-11-26: 회의 지우기는 누구나(로그인 필요). 비로그인 삭제는 401
    assert.equal((await h.call('DELETE', `/meetings/${mid}`, {})).status, 401);
    const d = await h.call('DELETE', `/meetings/${mid}`, { auth: 'admin' });
    assert.equal(d.status, 200); assert.deepEqual(d.json, { deleted: true, queued: false });
    assert.deepEqual(leftovers(mid), { docs: 0, objects: 0, redis: 0 });
    assert.equal((await h.call('DELETE', `/meetings/${mid}`, { auth: 'admin' })).status, 404, '두 번째 삭제');
    const after = await h.call('POST', `/${mid}/chat`, { pt: V.pt, body: { text: 'x' } });
    assert.equal(after.status, 404, '삭제 뒤 옛 자격 쓰기');

    // 동시에 두 번 삭제
    const midB = await h.createMeeting();
    await fill(midB);
    const two = await Promise.all([0, 1].map(() => h.call('DELETE', `/meetings/${midB}`, { auth: 'admin', tick: 1 })));
    assert.ok(two.every(x => [200, 404].includes(x.status)), two.map(x => x.status).join());
    assert.deepEqual(leftovers(midB), { docs: 0, objects: 0, redis: 0 });

    // 중간 실패: Storage 삭제가 한 번 실패 → deleting 상태로 막히고, cron 이 이어서 끝낸다
    const midC = await h.createMeeting();
    const c = await fill(midC);
    const realRemove = h.fb.storage.remove;
    h.fb.storage.remove = async () => { throw new Error('storage 503'); };
    const fail = await h.call('DELETE', `/meetings/${midC}`, { auth: 'admin' });
    h.fb.storage.remove = realRemove;
    assert.equal(fail.status, 502, '저장소 오류는 502(지적14)');
    assert.equal(h.fb.docs.get(`zzoom_meetings/${midC}`).status, 'deleting');
    const blocked = await h.call('POST', `/${midC}/chat`, { pt: c.V.pt, body: { text: 'x' } });
    assert.equal(blocked.status, 410, '정리 전이라도 쓰기는 바로 막힘');
    assert.ok((await h.call('GET', '/meetings', { auth: 'user' })).json.meetings.every(m => m.id !== midC));
    // cron 인증
    assert.equal((await h.call('GET', '/maintenance/purge')).status, 401);
    assert.equal((await h.call('GET', '/maintenance/purge', { headers: { Authorization: 'Bearer wrong' } })).status, 401);
    assert.equal((await h.call('DELETE', '/maintenance/purge', { headers: { Authorization: 'Bearer cron-secret' } })).status, 405);
    const run = await h.call('GET', '/maintenance/purge', { headers: { Authorization: 'Bearer cron-secret' } });
    assert.equal(run.status, 200); assert.equal(run.json.meetingsDone, 1);
    assert.deepEqual(leftovers(midC), { docs: 0, objects: 0, redis: 0 });
    const rerun = await h.call('GET', '/maintenance/purge', { headers: { Authorization: 'Bearer cron-secret' } });
    assert.equal(rerun.json.meetingsDone, 0, '되풀이해도 안전');

    // 만료 → 관리자 목록에서 대기열 → cron 삭제
    const midD = await h.createMeeting();
    const dd = await fill(midD);
    h.clock.t += 10 * DAY + 1000;
    const late = await h.call('POST', `/${midD}/join`, { auth: 'admin', body: { name: '관리자' } });
    assert.equal(late.status, 410);
    const adminList = await h.call('GET', '/meetings', { auth: 'admin' });
    assert.equal(adminList.json.meetings.find(m => m.id === midD).status, 'deleting');
    const run2 = await h.call('GET', '/maintenance/purge', { headers: { Authorization: 'Bearer cron-secret' } });
    assert.ok(run2.json.meetingsDone >= 1);
    assert.deepEqual(leftovers(midD), { docs: 0, objects: 0, redis: 0 });
    assert.equal((await h.call('POST', `/${midD}/chat`, { pt: dd.V.pt, body: { text: 'x' } })).status, 401);
});

test('삭제: 시간 상한에 걸리면 대기열로 넘기고 다음 실행이 이어서', async t => {
    const h = await setup({ router: { deletePurgeBudgetMs: -1, purgeBudgetMs: 60000 } }); t.after(h.close);
    const mid = await h.createMeeting();
    const A = await h.join(mid, '관리자', 'admin');
    await h.board(mid, A);
    h.fb.put(`zzoom/${mid}/up/uabc1234567890/p001.webp`, 10, 'image/webp');
    const d = await h.call('DELETE', `/meetings/${mid}`, { auth: 'admin' });
    assert.deepEqual(d.json, { deleted: false, queued: true });
    assert.equal(h.fb.docs.get(`zzoom_meetings/${mid}`).status, 'deleting');
    const run = await h.call('GET', '/maintenance/purge', { headers: { Authorization: 'Bearer cron-secret' } });
    assert.equal(run.json.meetingsDone, 1);
    assert.equal([...h.fb.docs.keys()].filter(k => k.includes(mid)).length, 0);
    assert.equal(h.redis.keysLike(new RegExp(mid)).length, 0);
});

test('cron: CRON_SECRET 이 없으면 거절', async t => {
    const h = await setup({ router: { env: {} } }); t.after(h.close);
    const r = await h.call('GET', '/maintenance/purge', { headers: { Authorization: 'Bearer ' } });
    assert.equal(r.status, 503); assert.equal(r.json.error, 'no_cron_secret');
});

test('업로드 쪽 수 한도: 200쪽 허용, 201쪽 거절', async t => {
    const h = await setup(); t.after(h.close);
    const mid = await h.createMeeting();
    const A = await h.join(mid, '관리자', 'admin');
    const up = n => h.call('POST', `/${mid}/uploads`, { pt: A.pt, body: { kind: 'pdf', pages: n, bytes: 10 } });
    assert.equal((await up(200)).status, 201);
    assert.equal((await up(201)).json.error, 'bad_pages');
});

// ================================================================ 감사(AUDIT_ENGINE_REPORT) 지적별 시험
const sleep = ms => new Promise(r => setTimeout(r, ms));
const claimsOf = tok => JSON.parse(Buffer.from(String(tok).split('.')[1], 'base64url').toString()).claims;
const strokeDocs = (h, mid) => [...h.fb.docs.entries()].filter(([k]) => k.startsWith(`zzoom_meetings/${mid}/strokes/`)).map(([, v]) => v);
// 쓰기 하나를 한 번만 멈추게 하는 훅. entered 는 멈춘 순간 풀린다.
function pauseOnce(h, match, ms = 250) {
    let fired = false, enter;
    const entered = new Promise(r => { enter = r; });
    h.fb.hooks.beforeWrite = async (op, paths) => {
        if (fired || !paths.some(match)) return;
        fired = true; enter(); await sleep(ms);
    };
    return entered;
}
async function upload(h, mid, A, body = { kind: 'pdf', pages: 1, bytes: 10 }) {
    const up = await h.call('POST', `/${mid}/uploads`, { pt: A.pt, body });
    assert.equal(up.status, 201, up.text);
    return up.json;
}
function putPages(h, path, n) {
    for (let i = 1; i <= n; i++) {
        const p = String(i).padStart(3, '0');
        h.fb.put(path + `p${p}.webp`, 1000, 'image/webp');
        h.fb.put(path + `t${p}.webp`, 100, 'image/webp');
    }
}
const commitBody = n => ({ title: '안', pages: n, sizes: Array.from({ length: n }, () => [1414, 2000]) });

test('지적01: 맞춤 토큰 until 은 1시간 안(host·viewer), 업로드는 허가 하나에만 쓰는 짧은 출입증', async t => {
    const h = await setup(); t.after(h.close);
    const mid = await h.createMeeting();
    const V = await h.join(mid, '참석');
    const cv = claimsOf(V.token);
    assert.ok(cv.until <= h.clock.t + 3600000 && cv.until > h.clock.t, 'viewer 도 1시간');
    const H = await h.asHost(mid);
    const c = claimsOf(H.token);
    assert.equal(c.role, 'host');
    assert.ok(Number.isInteger(c.until) && c.until <= h.clock.t + 3600000 && c.until > h.clock.t - 5000, 'host 권한은 1시간 안에 끝난다');
    const up = await upload(h, mid, H, { kind: 'pdf', pages: 3, bytes: 4000 });
    assert.ok(up.token, '업로드 전용 출입증');
    const u = claimsOf(up.token);
    assert.equal(u.up, up.uploadId); assert.equal(u.upPages, 3); assert.equal(u.upExt, 'pdf'); assert.equal(u.upBytes, 4000);
    assert.ok(u.until <= h.clock.t + 3600000 && u.until > h.clock.t - 5000);
    // 한 시간 뒤 refresh 는 다시 1시간을 준다
    h.clock.t += 50 * 60000;
    const r0 = await h.call('POST', `/${mid}/refresh`, { pt: H.pt });
    assert.equal(r0.status, 200); assert.ok(claimsOf(r0.json.token).until > c.until, 'refresh 가 늘린다');
    // 코드를 바꾸면 refresh 는 viewer 출입증만 준다
    await h.call('PATCH', `/meetings/${mid}`, { auth: 'admin', body: { hostCode: '654321' } });
    const r = await h.call('POST', `/${mid}/refresh`, { pt: H.pt });
    assert.equal(r.json.role, 'viewer');
    assert.equal(claimsOf(r.json.token).role, 'viewer');
    // AGENDA_OPEN: 내려간 host 도 참석자로서 업로드 허가는 받지만 출입증은 viewer claim 이다
    const down = await h.call('POST', `/${mid}/uploads`, { pt: H.pt, body: { kind: 'pdf', pages: 1, bytes: 1 } });
    assert.equal(down.status, 201, down.text); assert.equal(claimsOf(down.json.token).role, 'viewer', '내려간 host 의 업로드 출입증은 viewer');
});

test('지적01: 회의를 지운 뒤 늦게 올라온 업로드 파일도 장부에 남아 24시간 뒤 지워진다', async t => {
    const h = await setup(); t.after(h.close);
    const mid = await h.createMeeting();
    const A = await h.join(mid, '관리자', 'admin');
    const up = await upload(h, mid, A);
    assert.equal((await h.call('DELETE', `/meetings/${mid}`, { auth: 'admin' })).json.deleted, true);
    h.fb.put(up.path + 'p001.webp', 10, 'image/webp');   // 삭제 단계가 지나간 뒤 올라옴
    h.clock.t += DAY + 1000;
    await h.call('GET', '/maintenance/purge', { headers: { Authorization: 'Bearer cron-secret' } });
    assert.equal([...h.fb.objects.keys()].filter(k => k.includes(mid)).length, 0, '고아 파일 없음');
});

test('지적02: commit 은 실제 WebP 바이트와 쪽 크기를 확인한다', async t => {
    const h = await setup(); t.after(h.close);
    const mid = await h.createMeeting();
    const A = await h.join(mid, '관리자', 'admin');
    const up = await upload(h, mid, A);
    putPages(h, up.path, 1);
    h.fb.put(up.path + 'p001.webp', 1000, 'image/webp', Buffer.from('<html>not a webp at all.......</html>'));
    let r = await h.call('POST', `/${mid}/uploads/${up.uploadId}/commit`, { pt: A.pt, body: commitBody(1) });
    assert.equal(r.status, 422, r.text); assert.match(r.json.message, /WebP/);
    const { webpHead } = require('./fakes/fake-fb');
    h.fb.put(up.path + 'p001.webp', 1000, 'image/webp', webpHead(1000, 1000));
    r = await h.call('POST', `/${mid}/uploads/${up.uploadId}/commit`, { pt: A.pt, body: commitBody(1) });
    assert.equal(r.status, 422, r.text); assert.match(r.json.message, /크기/);
    h.fb.put(up.path + 'p001.webp', 1000, 'image/webp');
    assert.equal((await h.call('POST', `/${mid}/uploads/${up.uploadId}/commit`, { pt: A.pt, body: commitBody(1) })).status, 201);
});

test('지적03: commit 뒤 장부 정리가 실패해도 재시도가 장부를 고치고, cron 은 확정된 안건 파일을 지우지 않는다', async t => {
    const h = await setup(); t.after(h.close);
    const mid = await h.createMeeting();
    const A = await h.join(mid, '관리자', 'admin');
    const up = await upload(h, mid, A);
    putPages(h, up.path, 1);
    h.redis.failNext('hdel');
    const first = await h.call('POST', `/${mid}/uploads/${up.uploadId}/commit`, { pt: A.pt, body: commitBody(1) });
    assert.ok([201, 503].includes(first.status), first.text);
    const again = await h.call('POST', `/${mid}/uploads/${up.uploadId}/commit`, { pt: A.pt, body: commitBody(1) });
    assert.ok([200, 201].includes(again.status), again.text);
    assert.ok(!Object.keys((await h.redis.hgetall('zz:uploads')) || {}).some(f => f.endsWith(up.uploadId)), '재시도가 장부를 비운다');
    // 장부에 남은 경우(다른 경로로 실패)도 cron 이 안건을 확인하고 지우지 않는다
    await h.redis.hset('zz:uploads', { [`${mid}/${up.uploadId}`]: h.clock.t - DAY });
    h.clock.t += DAY + 1000;
    await h.call('GET', '/maintenance/purge', { headers: { Authorization: 'Bearer cron-secret' } });
    assert.equal([...h.fb.objects.keys()].filter(k => k.startsWith(up.path)).length, 2, '안건 그림이 남는다');
    assert.ok(h.fb.docs.get(`zzoom_meetings/${mid}/agenda/a${up.uploadId.slice(1)}`));
    assert.ok(!Object.keys((await h.redis.hgetall('zz:uploads')) || {}).length, '장부는 정리');
});

test('지적03: 허가 23시간이 지나면 commit 을 받지 않는다(cron 24시간 정리와 겹치지 않게)', async t => {
    const h = await setup(); t.after(h.close);
    const mid = await h.createMeeting();
    const A = await h.join(mid, '관리자', 'admin');
    const up = await upload(h, mid, A);
    putPages(h, up.path, 1);
    h.clock.t += 23 * 3600000 + 1000;
    const A2 = await h.join(mid, '관리자', 'admin');
    const r = await h.call('POST', `/${mid}/uploads/${up.uploadId}/commit`, { pt: A2.pt, body: commitBody(1) });
    assert.equal(r.status, 410, r.text); assert.equal(r.json.error, 'upload_expired');
});

test('지적04: 받아쓰기 응답을 기다리는 사이 회의를 지우면 기록을 다시 만들지 않는다', async t => {
    let release; const gate = new Promise(r => { release = r; });
    let entered; const inGroq = new Promise(r => { entered = r; });
    const h = await setup({ groq: { async transcribe() { entered(); await gate; return { ok: true, text: '늦은 기록' }; } } }); t.after(h.close);
    const mid = await h.createMeeting();
    const A = await h.join(mid, '관리자', 'admin');
    await h.call('POST', `/${mid}/state`, { pt: A.pt, body: { action: 'start' } });
    await h.call('POST', `/${mid}/state`, { pt: A.pt, body: { action: 'recording', value: true } });
    const tr = h.call('POST', `/${mid}/transcribe?n=0`, { pt: A.pt, raw: Buffer.from('aud') });
    await inGroq;
    const d = await h.call('DELETE', `/meetings/${mid}`, { auth: 'admin' });
    assert.equal(d.json.deleted, true);
    release();
    const r = await tr;
    assert.ok([404, 410].includes(r.status), r.status + ' ' + r.text);
    assert.equal([...h.fb.docs.keys()].filter(k => k.includes(mid)).length, 0, '부모 없는 자식 문서 없음');
});

test('지적05: 판서 저장이 쪽 지우기와 겹쳐도 옛 epoch 선이 남지 않고 개수 장부가 실제와 같다', async t => {
    const h = await setup(); t.after(h.close);
    const mid = await h.createMeeting();
    const A = await h.join(mid, '관리자', 'admin');
    const aid = await h.board(mid, A);
    const pk = `${aid}_1`;
    const entered = pauseOnce(h, p => p.includes('/strokes/'));
    const st = h.call('POST', `/${mid}/strokes`, { pt: A.pt, body: stroke(pk) });
    await entered;
    const cl = await h.call('POST', `/${mid}/pages/${pk}/clear`, { pt: A.pt, tick: 2000 });
    assert.equal(cl.status, 200, cl.text);
    const s = await st;
    assert.ok([201, 409].includes(s.status), s.text);
    const ep = h.fb.docs.get(`zzoom_meetings/${mid}/pages/${pk}`).epoch;
    const queued = Object.keys((await h.redis.hgetall('zz:purge:pages')) || {}).length;
    assert.equal(strokeDocs(h, mid).filter(d => d.epoch < ep).length === 0 || queued > 0, true, '옛 epoch 선이 남으면 정리 예약이 있어야 한다');
    const all = Number((await h.redis.hget(`zz:sc:${mid}`, 'all')) || 0);
    assert.equal(all, strokeDocs(h, mid).filter(d => d.epoch >= ep).length, '개수 장부 = 현재 선 수');
});

test('지적05: 같은 선을 동시에 두 번 지워도 개수가 음수가 되지 않는다', async t => {
    const h = await setup(); t.after(h.close);
    const mid = await h.createMeeting();
    const A = await h.join(mid, '관리자', 'admin');
    const aid = await h.board(mid, A);
    const r = await h.call('POST', `/${mid}/strokes`, { pt: A.pt, body: stroke(`${aid}_1`) });
    const sid = r.json.strokes[0].id;
    pauseOnce(h, p => p.endsWith('/strokes/' + sid));
    const two = await Promise.all([0, 1].map(() => h.call('DELETE', `/${mid}/strokes/${sid}`, { pt: A.pt, tick: 1 })));
    assert.ok(two.some(x => x.status === 200), two.map(x => x.status).join());
    assert.equal(Number((await h.redis.hget(`zz:sc:${mid}`, 'all')) || 0), 0);
    assert.equal(strokeDocs(h, mid).length, 0);
});

test('지적06: 투표 동시 생성은 하나만 열리고, 끝내기 뒤 Redis 실패는 재시도로 고쳐진다', async t => {
    const h = await setup(); t.after(h.close);
    const mid = await h.createMeeting();
    const A = await h.join(mid, '관리자', 'admin');
    await h.call('POST', `/${mid}/state`, { pt: A.pt, body: { action: 'start' } });
    pauseOnce(h, p => p.includes('/polls/'));
    const two = await Promise.all([0, 1].map(i => h.call('POST', `/${mid}/polls`, { pt: A.pt, body: { q: '질문' + i }, tick: 1 })));
    assert.deepEqual(two.map(x => x.status).sort(), [201, 409], two.map(x => x.text).join(' / '));
    const open = [...h.fb.docs.entries()].filter(([k, v]) => k.includes(`${mid}/polls/`) && v.status === 'open');
    assert.equal(open.length, 1);
    const pid = open[0][0].split('/').pop();
    h.redis.failNext('hset');
    const end = await h.call('POST', `/${mid}/state`, { pt: A.pt, body: { action: 'end' } });
    assert.notEqual(end.status, 200);
    const retry = await h.call('POST', `/${mid}/state`, { pt: A.pt, body: { action: 'end' } });
    assert.equal(retry.status, 200, retry.text);
    assert.equal(h.fb.docs.get(`zzoom_meetings/${mid}/polls/${pid}`).status, 'closed');
    assert.equal(await h.redis.hget(`zz:vote:${mid}:${pid}`, '#status'), 'closed');
});

test('지적07: cron 은 예산을 넘기지 않는다(만료 회의 200건, 건당 1초)', async () => {
    const { runPurge } = require('../../lib/zzoom/purge');
    const clock = { t: Date.parse('2026-11-25T00:00:00Z') };
    const now = () => clock.t;
    const fb = createFakeFb({ now }), redis = createFakeRedis({ now });
    for (let i = 0; i < 200; i++) fb.docs.set(`zzoom_meetings/m${String(i).padStart(12, '0')}`, { status: 'ready', expiresAt: clock.t - 1000 });
    fb.hooks.beforeWrite = async () => { clock.t += 1000; };
    const start = clock.t;
    const out = await runPurge({ fb, redis, now }, { budgetMs: 50000 });
    assert.ok(clock.t - start <= 52000, `가상 경과 ${clock.t - start}ms`);
    assert.equal(out.timedOut, true);
});

test('지적09: 변환기가 받는 형식은 서버 업로드 허가도 받는다(hwpx·gif·bmp·avif·heic)', async t => {
    const h = await setup(); t.after(h.close);
    const mid = await h.createMeeting();
    const A = await h.join(mid, '관리자', 'admin');
    for (const [kind, ext] of [['hwpx', 'hwpx'], ['hwp', 'hwp'], ['image', 'gif'], ['image', 'bmp'], ['image', 'avif'], ['image', 'heic'], ['image', 'heif'], ['pptx', 'pptx']]) {
        h.clock.t += 3600000 + 1;   // 확정 전 허가는 사람당 3개(감사 R2 M2) — 출입증이 끝난 허가는 세지 않는다
        const r = await h.call('POST', `/${mid}/uploads`, { pt: A.pt, body: { kind, ext, pages: 1, bytes: 10 } });
        assert.equal(r.status, 201, `${kind}/${ext}: ${r.text}`);
        assert.equal(r.json.files.original, `original.${ext}`);
    }
    assert.equal((await h.call('POST', `/${mid}/uploads`, { pt: A.pt, body: { kind: 'image', ext: 'hwpx', pages: 1, bytes: 10 } })).status, 400, '종류와 확장자가 어긋나면 거절');
    h.clock.t += 3600000 + 1;
    const up = await upload(h, mid, A, { kind: 'hwpx', ext: 'hwpx', pages: 1, bytes: 10 });
    putPages(h, up.path, 1);
    h.fb.put(up.path + 'original.hwpx', 10, 'application/hwp+zip');
    const r = await h.call('POST', `/${mid}/uploads/${up.uploadId}/commit`, { pt: A.pt, body: commitBody(1) });
    assert.equal(r.status, 201, r.text);
});

test('지적14: Redis 장애는 어디서 나든 503 redis_down', async t => {
    const h = await setup(); t.after(h.close);
    const mid = await h.createMeeting();
    const V = await h.join(mid, '참석');
    h.redis.setDown(true);
    const r = await h.call('POST', `/${mid}/chat`, { pt: V.pt, body: { text: 'x' } });
    h.redis.setDown(false);
    assert.equal(r.status, 503); assert.equal(r.json.error, 'redis_down');
});

test('사소: 시도 한도(탭·IP)에 걸린 요청은 회의 전체 시도 수에 남지 않는다', async t => {
    const h = await setup(); t.after(h.close);
    const mid = await h.createMeeting();
    const v = await h.join(mid, '김');
    for (let i = 0; i < 7; i++) await h.call('POST', `/${mid}/host`, { pt: v.pt, body: { code: '000000' }, ip: '10.1.1.1' });
    assert.equal(Number(await h.redis.get(`zz:try:${mid}:all`)), 5);
});

test('사소: server.js 의 10MB JSON 파서는 /api/zzoom 을 건너뛴다(쭘 1MB 상한)', () => {
    const src = require('node:fs').readFileSync(require.resolve('../../server.js'), 'utf8');
    assert.match(src, /jsonExceptZzoom/);
    assert.doesNotMatch(src, /^app\.use\(express\.json\(\{ limit: '10mb' \}\)\);/m);
});

test('추가: ZZOOM_ENABLED=0 이면 쭘 API 는 503 zzoom_disabled, health·cron 은 동작', async t => {
    const h = await setup({ router: { env: { CRON_SECRET: 'cron-secret', ZZOOM_ENABLED: '0' } } }); t.after(h.close);
    const r = await h.call('GET', '/meetings', { auth: 'admin' });
    assert.equal(r.status, 503); assert.equal(r.json.error, 'zzoom_disabled'); assert.equal(r.json.message, '쭘을 잠시 쉬고 있습니다.');
    assert.equal((await h.call('GET', '/health')).status, 200);
    assert.equal((await h.call('GET', '/maintenance/purge', { headers: { Authorization: 'Bearer cron-secret' } })).status, 200);
    const { zzoomEnabled } = require('../../lib/zzoom/routes');
    assert.equal(zzoomEnabled({}), true); assert.equal(zzoomEnabled({ ZZOOM_ENABLED: '1' }), true); assert.equal(zzoomEnabled({ ZZOOM_ENABLED: '0' }), false);
    const src = require('node:fs').readFileSync(require.resolve('../../server.js'), 'utf8');
    assert.match(src, /zzoomEnabled\(\)/, '/zzoom 화면 라우트도 같은 스위치');
});

test('추가: Groq 429 는 groq_busy 와 retryAfter(초)를 돌려준다', async t => {
    const h = await setup({ groq: { async transcribe() { return { ok: false, status: 429, retryAfter: 7, error: 'busy' }; } } }); t.after(h.close);
    const mid = await h.createMeeting();
    const A = await h.join(mid, '관리자', 'admin');
    await h.call('POST', `/${mid}/state`, { pt: A.pt, body: { action: 'start' } });
    await h.call('POST', `/${mid}/state`, { pt: A.pt, body: { action: 'recording', value: true } });
    const r = await h.call('POST', `/${mid}/transcribe?n=0`, { pt: A.pt, raw: Buffer.from('aud') });
    assert.equal(r.status, 429); assert.equal(r.json.error, 'groq_busy'); assert.equal(r.json.retryAfter, 7);
    assert.equal(r.headers.get('retry-after'), '7');
});

test('D5: 회의를 끝낸 뒤 2분 동안은 끝내기 전에 시작한 녹음 조각을 받는다', async t => {
    const h = await setup(); t.after(h.close);
    const mid = await h.createMeeting();
    const A = await h.join(mid, '관리자', 'admin');
    await h.call('POST', `/${mid}/state`, { pt: A.pt, body: { action: 'start' } });
    await h.call('POST', `/${mid}/state`, { pt: A.pt, body: { action: 'recording', value: true } });
    assert.equal((await h.call('POST', `/${mid}/transcribe?n=6&at=${h.clock.t}`, { pt: A.pt, raw: Buffer.from('aud') })).status, 201);
    h.clock.t += 10000;
    const segAt = h.clock.t;                       // 마지막 조각이 시작된 시각
    h.clock.t += 50000;
    const e = await h.call('POST', `/${mid}/state`, { pt: A.pt, body: { action: 'end' } });
    assert.equal(e.status, 200, e.text);
    const endedAt = h.clock.t;
    h.clock.t += 5000;                             // 끝낸 직후 마지막 조각이 올라온다
    const ok = await h.call('POST', `/${mid}/transcribe?n=7&at=${segAt}`, { pt: A.pt, raw: Buffer.from('aud') });
    assert.equal(ok.status, 201, ok.text);
    assert.ok(h.fb.docs.has(`zzoom/${mid}/transcript/t00007`) || [...h.fb.docs.keys()].some(k => k.includes(mid) && k.endsWith('t00007')), '기록이 남는다');
    // 끝낸 뒤에 시작한 조각은 거절
    const late = await h.call('POST', `/${mid}/transcribe?n=8&at=${endedAt + 1000}`, { pt: A.pt, raw: Buffer.from('aud') });
    assert.equal(late.status, 409, late.text); assert.equal(late.json.error, 'state_ended');
    // 시작 시각(at)이 없으면 끝낸 회의에는 받지 않는다
    const noAt = await h.call('POST', `/${mid}/transcribe?n=9`, { pt: A.pt, raw: Buffer.from('aud') });
    assert.equal(noAt.status, 409, noAt.text);
    // 2분이 지나면 끝내기 전 조각도 거절
    h.clock.t = endedAt + 120001;
    const A2 = await h.join(mid, '관리자', 'admin');
    const tooLate = await h.call('POST', `/${mid}/transcribe?n=10&at=${segAt + 1}`, { pt: (A2.pt || A.pt), raw: Buffer.from('aud') });
    assert.equal(tooLate.status, 409, tooLate.text); assert.equal(tooLate.json.error, 'state_ended');
    assert.notEqual(tooLate.status, 201);
});

test('감사 N2: 일반 세션은 회의 만들기 10분 5개까지', async t => {
    const h = await setup(); t.after(h.close);
    const mk = () => h.call('POST', '/meetings', { auth: 'user', body: { title: 't', startsAt: Date.now(), hostCode: '123456' } });
    for (let i = 0; i < 5; i++) assert.equal((await mk()).status, 201);
    const r = await mk();
    assert.equal(r.status, 429); assert.equal(r.json.error, 'rate_limited');
});

test('R1-N4: 끝낸 뒤 유예 조각은 받은 조각 바로 뒤 번호만, 덮어쓰기 없이, 회의당 5개까지', async t => {
    const h = await setup(); t.after(h.close);
    const mid = await h.createMeeting();
    const A = await h.join(mid, '관리자', 'admin');
    await h.call('POST', `/${mid}/state`, { pt: A.pt, body: { action: 'start' } });
    await h.call('POST', `/${mid}/state`, { pt: A.pt, body: { action: 'recording', value: true } });
    for (const n of [0, 1, 2]) assert.equal((await h.call('POST', `/${mid}/transcribe?n=${n}&at=${h.clock.t}`, { pt: A.pt, raw: Buffer.from('a') })).status, 201);
    const at = h.clock.t; h.clock.t += 30000;
    await h.call('POST', `/${mid}/state`, { pt: A.pt, body: { action: 'end' } });
    h.clock.t += 1000;
    const send = n => h.call('POST', `/${mid}/transcribe?n=${n}&at=${at}`, { pt: A.pt, raw: Buffer.from('a') });
    const over = await send(1);                    // 이미 받은 조각을 끝낸 뒤 덮어쓰기
    assert.equal(over.status, 409, over.text); assert.equal(over.json.error, 'transcript_exists');
    const jump = await send(40);                   // 받은 조각과 이어지지 않는 번호
    assert.equal(jump.status, 409, jump.text); assert.equal(jump.json.error, 'state_ended');
    for (const n of [3, 4, 5, 6, 7]) assert.equal((await send(n)).status, 201, 'n=' + n);
    const sixth = await send(8);
    assert.equal(sixth.status, 429, sixth.text);
});

test('R1-N3: 판서가 만들거나 다시 만드는 Redis 키에는 모두 만료가 걸린다(삭제와 겹쳐도 영구히 남지 않음)', async t => {
    const h = await setup(); t.after(h.close);
    const mid = await h.createMeeting();
    const A = await h.join(mid, '관리자', 'admin');
    const aid = await h.board(mid, A);
    const r = await h.call('POST', `/${mid}/strokes`, { pt: A.pt, body: stroke(`${aid}_1`) });
    assert.equal(r.status, 201, r.text);
    await require('../../lib/zzoom/keys').remember(h.redis, mid, 'zz:x:test');   // 정리 목록도 같은 만료
    for (const k of [`zz:sc:${mid}`, `zz:scp:${mid}`, `zz:seq:${mid}`, `zz:keys:${mid}`]) {
        const e = h.redis.data.get(k);
        assert.ok(e, k + ' 있음');
        assert.ok(e.exp > h.clock.t, k + ' 에 만료가 있다');
    }
});

// ---------------------------------------------------------------- AGENDA_OPEN: 누구나 안건·자료, 발표하기
const agendaDoc = (h, mid, aid) => h.fb.docs.get(`zzoom_meetings/${mid}/agenda/${aid}`);
let devIp = 0;
async function joinDev(h, mid, dev, name = '참석') {
    // 사람 = 백암이 로그인 세션(ANON). dev 가 같으면 같은 사람(다시 들어옴)
    const r = await h.call('POST', `/${mid}/join`, { auth: 'user-t#' + dev, body: { name }, headers: { 'X-Device-Id': dev }, ip: '10.77.' + Math.floor(devIp / 200) + '.' + (devIp++ % 200) });
    assert.equal(r.status, 200, r.text);
    return r.json;
}
async function attach(h, mid, who, aid, pages = 2) {
    const up = await h.call('POST', `/${mid}/uploads`, { pt: who.pt, body: { kind: 'pdf', pages, bytes: 10, aid } });
    if (up.status !== 201) return up;
    putPages(h, up.json.path, pages);
    return h.call('POST', `/${mid}/uploads/${up.json.uploadId}/commit`, { pt: who.pt, body: { ...commitBody(pages), aid } });
}

test('AGENDA_OPEN: 참석자 제목만 안건, 이름 없음, 주인과 주관자만 고치기, 순서는 주관자만', async t => {
    const h = await setup(); t.after(h.close);
    const mid = await h.createMeeting();
    const H = await h.join(mid, '관리자', 'admin');
    const V = await joinDev(h, mid, 'dev-v', '김교사');
    const W = await joinDev(h, mid, 'dev-w', '이교사');
    assert.equal((await h.call('POST', `/${mid}/agenda`, { pt: V.pt, body: { title: '   ' } })).json.error, 'bad_title');
    const xss = '<img src=x onerror=alert(1)>';
    const r = await h.call('POST', `/${mid}/agenda`, { pt: V.pt, body: { title: xss + 'x'.repeat(200) } });
    assert.equal(r.status, 201, r.text);
    const aid = r.json.aid;
    const doc = agendaDoc(h, mid, aid);
    assert.equal(doc.kind, 'empty'); assert.equal(doc.pages, 0); assert.equal(doc.title.length, 100, '제목 100자');
    assert.ok(doc.title.startsWith(xss), '제목은 글자 그대로(화면이 textContent 로 그림)');
    assert.equal(doc.ownerCid, V.cid);
    // 익명: 응답·문서 어디에도 이름이 없다
    for (const s of [JSON.stringify(doc), r.text]) { assert.ok(!s.includes('김교사'), '이름 없음'); assert.ok(!/createdBy|uploadedBy|"name"/.test(s), s); }
    assert.deepEqual(h.fb.docs.get(`zzoom_meetings/${mid}`).agendaOrder, [aid]);
    // 남은 못 고치고 못 지운다, 주인은 고친다
    assert.equal((await h.call('PATCH', `/${mid}/agenda/${aid}`, { pt: W.pt, body: { title: '남이' } })).json.error, 'not_agenda_owner');
    assert.equal((await h.call('DELETE', `/${mid}/agenda/${aid}`, { pt: W.pt })).json.error, 'not_agenda_owner');
    assert.equal((await h.call('PATCH', `/${mid}/agenda/${aid}`, { pt: V.pt, body: { title: '내 안건' } })).status, 200);
    assert.equal(agendaDoc(h, mid, aid).title, '내 안건');
    // 순서 바꾸기는 주관자만(주인이어도)
    const r2 = await h.call('POST', `/${mid}/agenda`, { pt: W.pt, body: { title: '두번째' } });
    assert.equal((await h.call('PATCH', `/${mid}/agenda/${aid}`, { pt: V.pt, body: { index: 1 } })).json.error, 'host_only');
    assert.deepEqual((await h.call('PATCH', `/${mid}/agenda/${r2.json.aid}`, { pt: H.pt, body: { index: 0 } })).json.agendaOrder, [r2.json.aid, aid]);
    // 다시 들어온 같은 사람(같은 기기)은 새 cid 여도 주인
    const V2 = await joinDev(h, mid, 'dev-v', '김교사');
    assert.notEqual(V2.cid, V.cid);
    assert.deepEqual((await h.call('GET', `/${mid}/agenda/mine`, { pt: V2.pt })).json.aids, [aid]);
    assert.deepEqual((await h.call('GET', `/${mid}/agenda/mine`, { pt: W.pt })).json.aids, [r2.json.aid]);
    assert.equal((await h.call('PATCH', `/${mid}/agenda/${aid}`, { pt: V2.pt, body: { title: '다시 고침' } })).status, 200);
    // 주관자는 남의 것도 고치고 지운다
    assert.equal((await h.call('PATCH', `/${mid}/agenda/${aid}`, { pt: H.pt, body: { title: '주관자가 고침' } })).status, 200);
    assert.equal((await h.call('DELETE', `/${mid}/agenda/${r2.json.aid}`, { pt: H.pt })).status, 200);
    // 주인은 자기 것을 지운다
    assert.equal((await h.call('DELETE', `/${mid}/agenda/${aid}`, { pt: V.pt })).status, 200);
    assert.deepEqual(h.fb.docs.get(`zzoom_meetings/${mid}`).agendaOrder, []);
});

test('AGENDA_OPEN: 상한(한 사람 10개, 회의 30개), 끝난 회의 거절, 업로드 허가도 같은 상한, 만들기 속도', async t => {
    const h = await setup(); t.after(h.close);
    const mid = await h.createMeeting();
    const H = await h.join(mid, '관리자', 'admin');
    const V = await joinDev(h, mid, 'dev-v');
    for (let i = 0; i < 10; i++) assert.equal((await h.call('POST', `/${mid}/agenda`, { pt: V.pt, body: { title: '안' + i }, tick: 7000 })).status, 201);
    assert.equal((await h.call('POST', `/${mid}/agenda`, { pt: V.pt, body: { title: '열한째' }, tick: 7000 })).json.error, 'agenda_person_full');
    assert.equal((await h.call('POST', `/${mid}/uploads`, { pt: V.pt, body: { kind: 'pdf', pages: 1, bytes: 10 }, tick: 7000 })).json.error, 'agenda_person_full', '업로드로 새 안건도 같은 상한');
    // 다시 들어와도(같은 기기) 같은 몫
    const V2 = await joinDev(h, mid, 'dev-v');
    assert.equal((await h.call('POST', `/${mid}/agenda`, { pt: V2.pt, body: { title: '우회' }, tick: 7000 })).json.error, 'agenda_person_full');
    // 회의 30개
    for (let i = 0; i < 20; i++) assert.equal((await h.call('POST', `/${mid}/agenda`, { pt: H.pt, body: { title: 'h' + i } })).status, 201);
    const W = await joinDev(h, mid, 'dev-w');
    assert.equal((await h.call('POST', `/${mid}/agenda`, { pt: W.pt, body: { title: '넘침' } })).json.error, 'agenda_full');
    assert.equal((await h.call('POST', `/${mid}/uploads`, { pt: W.pt, body: { kind: 'pdf', pages: 1, bytes: 10 } })).json.error, 'agenda_full');
    // 끝난 회의
    const mid2 = await h.createMeeting();
    const H2 = await h.join(mid2, '관리자', 'admin');
    const X = await joinDev(h, mid2, 'dev-x');
    const a = (await h.call('POST', `/${mid2}/agenda`, { pt: X.pt, body: { title: '끝나기 전' } })).json.aid;
    await h.call('POST', `/${mid2}/state`, { pt: H2.pt, body: { action: 'start' } });
    await h.call('POST', `/${mid2}/state`, { pt: H2.pt, body: { action: 'end' } });
    assert.equal((await h.call('POST', `/${mid2}/agenda`, { pt: X.pt, body: { title: '끝난 뒤' } })).json.error, 'state_ended');
    assert.equal((await h.call('POST', `/${mid2}/uploads`, { pt: X.pt, body: { kind: 'pdf', pages: 1, bytes: 10, aid: a } })).json.error, 'state_ended');
    assert.equal((await h.call('PATCH', `/${mid2}/agenda/${a}`, { pt: X.pt, body: { title: 'x' } })).json.error, 'state_ended');
    // 만들기 속도: 사람당 분당 10번
    const mid3 = await h.createMeeting();
    const Y = await joinDev(h, mid3, 'dev-y');
    h.clock.t = Math.ceil(h.clock.t / 60000) * 60000;   // 분 창 시작에 맞춤
    const codes = [];
    for (let i = 0; i < 11; i++) codes.push((await h.call('POST', `/${mid3}/agenda`, { pt: Y.pt, body: { title: 'r' + i }, tick: 150 })).status);
    assert.ok(codes.slice(0, 10).every(c => c === 201) && codes[10] === 429, codes.join());
});

test('AGENDA_OPEN: 제목만 안건에 자료 붙이기(주인만), 재시도 같은 결과, 발표 중 바꾸기 거절, 자료 바꾸면 옛 그림 지움', async t => {
    const h = await setup(); t.after(h.close);
    const mid = await h.createMeeting();
    const H = await h.join(mid, '관리자', 'admin');
    const V = await joinDev(h, mid, 'dev-v');
    const W = await joinDev(h, mid, 'dev-w');
    const aid = (await h.call('POST', `/${mid}/agenda`, { pt: V.pt, body: { title: '학사 일정' } })).json.aid;
    assert.equal((await attach(h, mid, W, aid)).json.error, 'not_agenda_owner', '남의 안건에 자료 못 붙임');
    assert.equal((await h.call('POST', `/${mid}/uploads`, { pt: V.pt, body: { kind: 'pdf', pages: 1, bytes: 10, aid: 'bxxxxxxxxxxxxx' } })).json.error, 'not_found');
    const up = await h.call('POST', `/${mid}/uploads`, { pt: V.pt, body: { kind: 'pdf', pages: 2, bytes: 10, aid } });
    assert.equal(up.status, 201); assert.equal(claimsOf(up.json.token).role, 'viewer'); assert.equal(claimsOf(up.json.token).up, up.json.uploadId);
    putPages(h, up.json.path, 2);
    // 남이 그 허가로 확정하려 하면 거절
    assert.equal((await h.call('POST', `/${mid}/uploads/${up.json.uploadId}/commit`, { pt: W.pt, body: { ...commitBody(2), aid } })).json.error, 'not_your_upload');
    const c = await h.call('POST', `/${mid}/uploads/${up.json.uploadId}/commit`, { pt: V.pt, body: { ...commitBody(2), aid } });
    assert.equal(c.status, 201, c.text); assert.equal(c.json.aid, aid);
    let doc = agendaDoc(h, mid, aid);
    assert.equal(doc.title, '학사 일정', '제목 그대로'); assert.equal(doc.pages, 2); assert.equal(doc.kind, 'pdf'); assert.equal(doc.base, up.json.path.slice(0, -1));
    assert.ok(!/createdBy|"name"/.test(JSON.stringify(doc)));
    assert.deepEqual(h.fb.docs.get(`zzoom_meetings/${mid}`).agendaOrder, [aid], '새 안건이 생기지 않음');
    const again = await h.call('POST', `/${mid}/uploads/${up.json.uploadId}/commit`, { pt: V.pt, body: { ...commitBody(2), aid } });
    assert.equal(again.json.already, true); assert.equal(again.json.aid, aid);
    // 참석자 새 안건 업로드(aid 없이) — 주인이 붙는다
    const up2 = await h.call('POST', `/${mid}/uploads`, { pt: W.pt, body: { kind: 'pdf', pages: 1, bytes: 10 } });
    putPages(h, up2.json.path, 1);
    const c2 = await h.call('POST', `/${mid}/uploads/${up2.json.uploadId}/commit`, { pt: W.pt, body: commitBody(1) });
    assert.equal(c2.status, 201); assert.equal(agendaDoc(h, mid, c2.json.aid).ownerCid, W.cid);
    // 발표 중인 안건의 자료는 바꾸지 못한다
    await h.call('POST', `/${mid}/state`, { pt: H.pt, body: { action: 'start' } });
    assert.equal((await h.call('POST', `/${mid}/presenter`, { pt: V.pt, body: { aid } })).status, 200);
    assert.equal((await h.call('POST', `/${mid}/uploads`, { pt: V.pt, body: { kind: 'pdf', pages: 1, bytes: 10, aid }, tick: 11000 })).json.error, 'agenda_live');
    // 진행이 다른 안건으로 가면 바꿀 수 있고, 옛 그림과 그 위 판서는 지워진다
    assert.equal((await h.call('POST', `/${mid}/presenter`, { pt: H.pt, body: { aid: c2.json.aid } })).status, 200);
    h.fb.docs.set(`zzoom_meetings/${mid}/strokes/sold1`, { pageKey: aid + '_1', aid, page: 1, epoch: 0 });
    const c3 = await attach(h, mid, V, aid, 1);
    assert.equal(c3.status, 201, c3.text);
    doc = agendaDoc(h, mid, aid);
    assert.equal(doc.pages, 1); assert.equal(doc.ver, 3, "붙일 때마다 ver 증가");
    assert.equal([...h.fb.objects.keys()].filter(k => k.startsWith(up.json.path)).length, 0, '옛 그림 지움');
    assert.equal(h.fb.docs.has(`zzoom_meetings/${mid}/strokes/sold1`), false, '옛 판서 지움');
    // 화이트보드에는 자료를 못 붙인다
    const b = await h.board(mid, H);
    assert.equal((await h.call('POST', `/${mid}/uploads`, { pt: H.pt, body: { kind: 'pdf', pages: 1, bytes: 10, aid: b } })).json.error, 'not_found');
    assert.ok(!('createdBy' in agendaDoc(h, mid, b)), '화이트보드에도 이름 없음');
});

test('AGENDA_OPEN 5: 발표하기 — 참석자 누구나, 그 안건 첫 쪽으로 모두 끌어옴, 10초 1번, 주관자는 언제든, 끝난 회의 거절', async t => {
    const h = await setup(); t.after(h.close);
    const mid = await h.createMeeting();
    const H = await h.join(mid, '관리자', 'admin');
    const V = await joinDev(h, mid, 'dev-v', '김교사');
    const W = await joinDev(h, mid, 'dev-w');
    const empty = (await h.call('POST', `/${mid}/agenda`, { pt: V.pt, body: { title: '제목만' } })).json.aid;
    const doc = (await attach(h, mid, V, (await h.call('POST', `/${mid}/agenda`, { pt: V.pt, body: { title: '자료' } })).json.aid, 3)).json.aid;
    assert.equal((await h.call('POST', `/${mid}/presenter`, { pt: V.pt, body: { aid: doc } })).json.error, 'state_ready', '시작 전에는 참석자 발표 안 됨');
    await h.call('POST', `/${mid}/state`, { pt: H.pt, body: { action: 'start' } });
    const before = h.fb.docs.get(`zzoom_meetings/${mid}`).live;
    assert.equal((await h.call('POST', `/${mid}/presenter`, { pt: V.pt, body: { aid: empty }, tick: 11000 })).json.error, 'agenda_empty');
    assert.equal((await h.call('POST', `/${mid}/presenter`, { pt: V.pt, body: { aid: 'bxxxxxxxxxxxxx' }, tick: 11000 })).json.error, 'bad_aid');
    const tk = await h.call('POST', `/${mid}/presenter`, { pt: V.pt, body: { aid: doc }, tick: 11000 });
    assert.equal(tk.status, 200, tk.text);
    assert.equal(tk.json.presenter.cid, V.cid); assert.ok(!('name' in tk.json.presenter), '발표자 이름 없음');
    assert.equal(tk.json.live.aid, doc); assert.equal(tk.json.live.page, 1);
    assert.equal(tk.json.live.forceSeq, (before.forceSeq || 0) + 1, '자유 보기도 끌어옴');
    assert.equal(tk.json.live.epoch, tk.json.presenter.epoch);
    assert.ok(!JSON.stringify(h.fb.docs.get(`zzoom_meetings/${mid}`).presenter).includes('김교사'));
    // 참석자 발표자는 쪽 넘기기·확대를 보낸다
    let live = tk.json.live;
    const lv = await h.call('POST', `/${mid}/live`, { pt: V.pt, body: { aid: doc, page: 2, baseRev: live.rev, epoch: live.epoch, view: { cx: 0.3, cy: 0.3, z: 2 } } });
    assert.equal(lv.status, 200, lv.text); live = lv.json.live;
    // 다른 참석자는 진행을 못 보낸다(진행자 아님)
    assert.equal((await h.call('POST', `/${mid}/live`, { pt: W.pt, body: { aid: doc, page: 3, baseRev: live.rev, epoch: live.epoch } })).json.error, 'not_presenter');
    // 같은 사람 10초 안 두 번째는 429, 다시 들어와도(같은 기기) 같은 몫
    assert.equal((await h.call('POST', `/${mid}/presenter`, { pt: V.pt, body: { aid: doc }, tick: 500 })).status, 429);
    const V2 = await joinDev(h, mid, 'dev-v');
    assert.equal((await h.call('POST', `/${mid}/presenter`, { pt: V2.pt, body: { aid: doc }, tick: 500 })).status, 429, '재입장으로 우회 못 함');
    // 다른 사람이 넘겨받으면 앞 사람 쓰기는 거절
    const tw = await h.call('POST', `/${mid}/presenter`, { pt: W.pt, body: { aid: doc, page: 3 } });
    assert.equal(tw.status, 200); assert.equal(tw.json.live.page, 3);
    assert.equal((await h.call('POST', `/${mid}/live`, { pt: V.pt, body: { aid: doc, page: 1, baseRev: tw.json.live.rev, epoch: live.epoch } })).json.error, 'not_presenter');
    // 주관자는 언제든(제한 없이) 다시 가져온다
    for (let i = 0; i < 3; i++) assert.equal((await h.call('POST', `/${mid}/presenter`, { pt: H.pt, body: {}, tick: 200 })).status, 200);
    assert.equal(h.fb.docs.get(`zzoom_meetings/${mid}`).presenter.cid, H.cid);
    // 끝난 회의
    await h.call('POST', `/${mid}/state`, { pt: H.pt, body: { action: 'end' } });
    assert.equal((await h.call('POST', `/${mid}/presenter`, { pt: W.pt, body: { aid: doc }, tick: 11000 })).json.error, 'state_ended');
    assert.equal((await h.call('POST', `/${mid}/presenter`, { pt: H.pt, body: {} })).json.error, 'state_ended');
});

test('AGENDA_OPEN 레드팀: 발표 가로채기 폭주 — 10명이 1초 간격으로 계속 눌러도 사람당 10초 1번, epoch 는 성공 수만큼만', async t => {
    const h = await setup(); t.after(h.close);
    const mid = await h.createMeeting();
    const H = await h.join(mid, '관리자', 'admin');
    const ppl = [];
    for (let i = 0; i < 10; i++) ppl.push(await joinDev(h, mid, 'flood-' + i));
    const aid = (await attach(h, mid, H, (await h.call('POST', `/${mid}/agenda`, { pt: H.pt, body: { title: '자료' } })).json.aid, 1)).json.aid;
    await h.call('POST', `/${mid}/state`, { pt: H.pt, body: { action: 'start' } });
    const e0 = h.fb.docs.get(`zzoom_meetings/${mid}`).presenter.epoch;
    let ok = 0, limited = 0;
    const per = new Map();
    for (let round = 0; round < 3; round++) for (const [i, p] of ppl.entries()) {   // 30번, 1초 간격 → 사람마다 10초 간격으로 누름
        for (let k = 0; k < 3; k++) {   // 한 사람이 같은 순간 3번 연타
            const r = await h.call('POST', `/${mid}/presenter`, { pt: p.pt, body: { aid }, tick: k ? 1 : 1000 });
            if (r.status === 200) { ok++; per.set(i, (per.get(i) || 0) + 1); } else if (r.status === 429) limited++; else assert.fail(r.text);
        }
    }
    assert.equal(ok + limited, 90);
    for (const [i, n] of per) assert.ok(n <= 3, `사람 ${i}: ${n}번(30초에 10초 창 3개)`);
    assert.ok(limited >= 60, `연타는 막힘: ${limited}`);
    const m = h.fb.docs.get(`zzoom_meetings/${mid}`);
    assert.equal(m.presenter.epoch, e0 + ok, 'epoch 는 성공한 넘겨받기만큼');
    assert.equal(m.live.epoch, m.presenter.epoch);
    // 주관자는 폭주 중에도 바로 되찾는다
    assert.equal((await h.call('POST', `/${mid}/presenter`, { pt: H.pt, body: {}, tick: 1 })).status, 200);
});

// ---------------------------------------------------------------- 익명(ANON)
// 입력한 이름 문자열이 서버 응답 JSON·가짜 Firestore·가짜 Redis 어디에도 없는지 grep 한다.
test('ANON: 이름을 보내도 응답·Firestore·Redis·md 어디에도 남지 않는다', async t => {
    const h = await setup(); t.after(h.close);
    const NAME = '홍길순표식', NAME2 = '김철수표식';
    const mid = await h.createMeeting();
    const bodies = [];
    const call = async (...a) => { const r = await h.call(...a); bodies.push(r.text); return r; };
    const j1 = await call('POST', `/${mid}/join`, { auth: 'admin-t#a', body: { name: NAME }, ip: '10.66.0.1' });
    const j2 = await call('POST', `/${mid}/join`, { auth: 'user-t#b', body: { name: NAME2 }, ip: '10.66.0.2' });
    assert.equal(j1.status, 200); assert.equal(j2.status, 200);
    assert.equal(j1.json.name, undefined); assert.equal(j2.json.name, undefined);
    const A = j1.json, V = j2.json;
    await call('POST', `/${mid}/host`, { pt: V.pt, body: { code: '123456', name: NAME2 }, ip: '10.66.1.1' }).then(r => { V.pt = r.json.pt; });
    await call('POST', `/${mid}/refresh`, { pt: V.pt, body: {} });
    const aid = await h.board(mid, A);
    await call('POST', `/${mid}/state`, { pt: A.pt, body: { action: 'start' } });
    await call('POST', `/${mid}/state`, { pt: A.pt, body: { action: 'recording', value: true } });
    await call('POST', `/${mid}/chat`, { pt: V.pt, body: { text: '의견입니다', name: NAME2 } });
    await call('POST', `/${mid}/hand`, { pt: V.pt, body: { up: true, name: NAME2 } });
    await call('POST', `/${mid}/strokes`, { pt: V.pt, body: { ...stroke(aid + '_1'), name: NAME2 } });
    const p = await call('POST', `/${mid}/polls`, { pt: A.pt, body: { q: '질문', anonymous: false } });
    assert.equal(p.json.poll.anonymous, true);
    await call('POST', `/${mid}/polls/${p.json.pid}/vote`, { pt: V.pt, body: { optionId: 'o1' } });
    await call('GET', `/${mid}/polls/${p.json.pid}/tally`, { pt: A.pt });
    await call('POST', `/${mid}/polls/${p.json.pid}/reveal`, { pt: A.pt });
    await call('POST', `/${mid}/heartbeat`, { pt: V.pt, body: {}, tick: 31000 });
    await call('POST', `/${mid}/transcribe?n=0`, { pt: A.pt, raw: Buffer.from('소리') });
    const md = await call('GET', `/${mid}/export.md`, { pt: A.pt });
    assert.equal(md.status, 200);
    for (const b of bodies) for (const n of [NAME, NAME2]) assert.ok(!b.includes(n), `응답에 이름: ${b.slice(0, 200)}`);
    const fsAll = JSON.stringify([...h.fb.docs.entries()]);
    const rdAll = JSON.stringify([...h.redis.data.entries()].map(([k, e]) => [k, e.v instanceof Map ? [...e.v.entries()] : e.v]));
    for (const n of [NAME, NAME2]) { assert.ok(!fsAll.includes(n), 'Firestore 에 이름'); assert.ok(!rdAll.includes(n), 'Redis 에 이름'); }
    assert.ok(!/"name"/.test(fsAll), 'Firestore 문서에 name 칸 없음');
    // people 문서: role·seenAt 만
    const ppl = [...h.fb.docs.entries()].filter(([k]) => k.includes('/people/')).map(([, d]) => Object.keys(d).sort().join());
    assert.ok(ppl.length >= 2 && ppl.every(k => !k.includes('name')), ppl.join(' / '));
});

test('ANON·감사 R1 N1(RT-4): 사람 = 백암이 세션. 기기 id·이름을 바꿔 다시 들어와도 한 표', async t => {
    const h = await setup(); t.after(h.close);
    const mid = await h.createMeeting();
    const A = await h.join(mid, '관리자', 'admin');
    await h.call('POST', `/${mid}/state`, { pt: A.pt, body: { action: 'start' } });
    const pid = (await h.call('POST', `/${mid}/polls`, { pt: A.pt, body: { q: '한 표' } })).json.pid;
    const res = [];
    for (let i = 0; i < 5; i++) {
        const j = await h.call('POST', `/${mid}/join`, { auth: 'user-t#same-session', body: { name: '이름' + i }, headers: { 'X-Device-Id': 'dev-' + i }, ip: '10.67.0.' + i });
        assert.equal(j.status, 200, j.text);
        res.push((await h.call('POST', `/${mid}/polls/${pid}/vote`, { pt: j.json.pt, body: { optionId: 'o' + (1 + (i % 3)) } })).json);
    }
    assert.equal(res[0].ok, true);
    assert.ok(res.slice(1).every(r => r.error === 'already_voted'), JSON.stringify(res));
    const tl = (await h.call('GET', `/${mid}/polls/${pid}/tally`, { pt: A.pt })).json;
    assert.equal(tl.total, 1, '기기 id 를 바꿔 재입장해도 1표');
    // 다른 세션(다른 사람)은 따로 한 표
    const other = await h.call('POST', `/${mid}/join`, { auth: 'user-t#other-session', body: {}, headers: { 'X-Device-Id': 'dev-0' }, ip: '10.67.1.1' });
    assert.equal((await h.call('POST', `/${mid}/polls/${pid}/vote`, { pt: other.json.pt, body: { optionId: 'o2' } })).json.ok, true, '같은 기기 id 여도 다른 세션은 다른 사람');
});

test('D5: 녹음을 켠 사람이 나가거나 90초 넘게 끊기면 서버가 녹음을 내린다', async t => {
    const h = await setup(); t.after(h.close);
    const mid = await h.createMeeting();
    const A = await h.join(mid, '관리자', 'admin');
    const V = await h.join(mid, '참석');
    const mtg = () => h.fb.docs.get(`zzoom_meetings/${mid}`);
    await h.call('POST', `/${mid}/state`, { pt: A.pt, body: { action: 'start' } });
    assert.equal((await h.call('POST', `/${mid}/state`, { pt: A.pt, body: { action: 'recording', value: true } })).status, 200);
    assert.equal(mtg().recording, true); assert.equal(mtg().recordingBy, A.cid);
    // 남이 나가는 것은 상관없다
    await h.call('POST', `/${mid}/heartbeat`, { body: { pt: V.pt, leaving: true } });
    assert.equal(mtg().recording, true);
    // 켠 사람이 나가면(leave) 내려간다
    await h.call('POST', `/${mid}/heartbeat`, { body: { pt: A.pt, leaving: true } });
    assert.equal(mtg().recording, false); assert.equal(mtg().recordingBy, null);
    // 다시 켜고, 켠 사람이 90초 넘게 heartbeat 없음 → 다른 사람의 heartbeat(30초 셈)에서 내려간다
    const A2 = await h.join(mid, '관리자', 'admin');
    const V2 = await h.join(mid, '참석2');
    await h.call('POST', `/${mid}/heartbeat`, { pt: A2.pt, body: {} });
    await h.call('POST', `/${mid}/state`, { pt: A2.pt, body: { action: 'recording', value: true } });
    assert.equal(mtg().recordingBy, A2.cid);
    await h.call('POST', `/${mid}/heartbeat`, { pt: V2.pt, body: {}, tick: 40000 });
    assert.equal(mtg().recording, true, '40초 끊김은 아직 둔다');
    await h.call('POST', `/${mid}/heartbeat`, { pt: V2.pt, body: {}, tick: 60000 });
    assert.equal(mtg().recording, false, '90초 넘게 끊기면 내린다');
    // 끄기는 recordingBy 도 비운다
    await h.call('POST', `/${mid}/state`, { pt: A2.pt, body: { action: 'recording', value: true } });
    await h.call('POST', `/${mid}/state`, { pt: A2.pt, body: { action: 'recording', value: false } });
    assert.equal(mtg().recordingBy, null);
});

test('감사 N9: 관리자로 받은 host 는 관리자 세션이 끝나면 내려가고, refresh 때 세션을 다시 본다', async t => {
    const sess = new Map();   // 토큰 → {role, expiresAt}
    const validateSession = async tok => { const s = sess.get(tok); return s && s.expiresAt > h.clock.t ? s : null; };
    const h = await setup({ router: { validateSession } }); t.after(h.close);
    sess.set('admin-t', { role: 'admin', expiresAt: Infinity });
    const mid = await h.createMeeting();
    // 관리자 세션 30분 남음 → host 자격·토큰도 30분을 넘지 않는다
    sess.set('adm-short', { role: 'admin', expiresAt: h.clock.t + 30 * 60000 });
    const j = await h.call('POST', `/${mid}/join`, { auth: 'adm-short', body: {}, ip: '10.88.0.1' });
    assert.equal(j.status, 200, j.text); assert.equal(j.json.role, 'host');
    assert.ok(j.json.tokenUntil <= h.clock.t + 30 * 60000, '토큰 until ≤ 관리자 세션 만료');
    assert.equal((await h.call('POST', `/${mid}/state`, { pt: j.json.pt, body: { action: 'penLock', value: true } })).status, 200, '세션 안에서는 host');
    // refresh: 세션이 살아 있으면 host 유지
    const r1 = await h.call('POST', `/${mid}/refresh`, { pt: j.json.pt, auth: 'adm-short', body: {} });
    assert.equal(r1.json.role, 'host');
    // 다른 사람 토큰(관리자여도)으로는 연장 못 함 → viewer
    // (같은 세션이어야 함) — 먼저 세션 만료 뒤를 본다
    h.clock.t += 31 * 60000;
    const w = await h.call('POST', `/${mid}/state`, { pt: j.json.pt, body: { action: 'penLock', value: false } });
    assert.equal(w.status, 403); assert.equal(w.json.error, 'host_revoked', '세션이 끝나면 host 쓰기 거절');
    const r2 = await h.call('POST', `/${mid}/refresh`, { pt: j.json.pt, auth: 'adm-short', body: {} });
    assert.equal(r2.status, 200); assert.equal(r2.json.role, 'viewer', 'refresh 에서 viewer 로 내림');
    assert.equal(h.fb.calls.tokens.at(-1).claims.role, 'viewer');
    assert.equal(h.fb.docs.get(`zzoom_meetings/${mid}/people/${j.json.cid}`).role, 'viewer');
    // 다시 로그인(새 세션)해도 옛 자격이 host 로 되살아나지 않는다(다시 입장하면 새 host 자격)
    sess.set('adm-new', { role: 'admin', expiresAt: h.clock.t + 3600000 });
    assert.equal((await h.call('POST', `/${mid}/refresh`, { pt: j.json.pt, auth: 'adm-new', body: {} })).json.role, 'viewer');
    // 세션은 살아 있어도 refresh 에 다른 세션 토큰을 보내면 내려간다
    sess.set('adm-a', { role: 'admin', expiresAt: h.clock.t + 3600000 });
    sess.set('adm-b', { role: 'admin', expiresAt: h.clock.t + 3600000 });
    const ja = await h.call('POST', `/${mid}/join`, { auth: 'adm-a', body: {}, ip: '10.88.0.2' });
    assert.equal(ja.json.role, 'host');
    assert.equal((await h.call('POST', `/${mid}/refresh`, { pt: ja.json.pt, auth: 'adm-b', body: {} })).json.role, 'viewer');
});

test('AGENDA_OPEN: 업로드 허가 출입증 until 은 참가 자격 만료와 관리자 세션 만료를 넘지 않는다(N9 와 같은 원칙)', async t => {
    const sess = new Map();
    const validateSession = async tok => { const s = sess.get(tok); return s && s.expiresAt > h.clock.t ? s : null; };
    const h = await setup({ router: { validateSession } }); t.after(h.close);
    sess.set('admin-t', { role: 'admin', expiresAt: Infinity });
    sess.set('user-v', { role: 'user', expiresAt: Infinity });
    const mid = await h.createMeeting();
    // 관리자 세션 20분 남음: host 업로드 허가도 20분을 넘지 않는다
    sess.set('adm-20', { role: 'admin', expiresAt: h.clock.t + 20 * 60000 });
    const a = await h.call('POST', `/${mid}/join`, { auth: 'adm-20', body: {}, ip: '10.89.0.1' });
    assert.equal(a.json.role, 'host', a.text);
    const ua = await h.call('POST', `/${mid}/uploads`, { pt: a.json.pt, body: { kind: 'pdf', pages: 1, bytes: 10 } });
    assert.equal(ua.status, 201, ua.text);
    assert.ok(ua.json.tokenUntil <= h.clock.t + 20 * 60000, '업로드 until ≤ 관리자 세션 만료');
    assert.equal(h.fb.calls.tokens.at(-1).claims.until, ua.json.tokenUntil, 'claim until 도 같은 값');
    assert.equal(h.fb.calls.tokens.at(-1).claims.up, ua.json.uploadId);
    // 참석자: 참가 자격(12시간)이 20분 남았을 때 받은 허가는 그 만료를 넘지 않는다
    const v = await h.call('POST', `/${mid}/join`, { auth: 'user-v', body: {}, ip: '10.89.0.2' });
    assert.equal(v.status, 200, v.text);
    h.clock.t = v.json.exp - 20 * 60000;
    const uv = await h.call('POST', `/${mid}/uploads`, { pt: v.json.pt, body: { kind: 'pdf', pages: 1, bytes: 10 } });
    assert.equal(uv.status, 201, uv.text);
    assert.ok(uv.json.tokenUntil <= v.json.exp, '업로드 until ≤ 참가 자격 만료');
    assert.equal(h.fb.calls.tokens.at(-1).claims.until, uv.json.tokenUntil);
    assert.equal(h.fb.calls.tokens.at(-1).claims.role, 'viewer');
});

// ================================================================ 감사 R2
test('R2-M1: 제목만 있는 안건에 자료를 붙인 뒤 장부 정리가 실패해도 cron 은 붙은 파일을 지우지 않는다', async t => {
    const h = await setup(); t.after(h.close);
    const mid = await h.createMeeting();
    const V = await h.join(mid, '참석');
    const a = await h.call('POST', `/${mid}/agenda`, { pt: V.pt, body: { title: '내 안건' } });
    assert.equal(a.status, 201, a.text);
    const aid = a.json.aid;
    const up = await upload(h, mid, V, { kind: 'pdf', pages: 2, bytes: 10, aid });
    putPages(h, up.path, 2);
    h.redis.failNext('hdel');
    const c = await h.call('POST', `/${mid}/uploads/${up.uploadId}/commit`, { pt: V.pt, body: commitBody(2) });
    assert.equal(c.status, 201, c.text);
    assert.ok(Object.keys((await h.redis.hgetall('zz:uploads')) || {}).some(f => f.endsWith(up.uploadId)), '장부가 남은 상황');
    h.clock.t += DAY + 3600000;
    const p = await h.call('GET', '/maintenance/purge', { headers: { Authorization: 'Bearer cron-secret' } });
    assert.equal(p.status, 200, p.text);
    assert.equal([...h.fb.objects.keys()].filter(k => k.startsWith(up.path)).length, 4, '붙인 자료 파일 4개가 남는다');
    assert.ok(!Object.keys((await h.redis.hgetall('zz:uploads')) || {}).length, '장부는 정리');
});

test('R2-M2: 확정 안 된 업로드 허가는 사람당 3개, 회의당 60개까지(주관자는 회의 칸 밖, R3 P3·R4 Q2)', async t => {
    const h = await setup(); t.after(h.close);
    const mid = await h.createMeeting();
    const A = await h.join(mid, '관리자', 'admin');
    const ask = (who) => h.call('POST', `/${mid}/uploads`, { pt: who.pt, body: { kind: 'pdf', pages: 1, bytes: 10 } });
    const got = [];
    for (let i = 0; i < 3; i++) { const r = await ask(A); assert.equal(r.status, 201, r.text); got.push(r.json); }
    const four = await ask(A);
    assert.equal(four.status, 429, four.text); assert.equal(four.json.error, 'upload_busy');
    putPages(h, got[0].path, 1);
    assert.equal((await h.call('POST', `/${mid}/uploads/${got[0].uploadId}/commit`, { pt: A.pt, body: commitBody(1) })).status, 201);
    assert.equal((await ask(A)).status, 201, '확정 뒤에는 자리가 난다');
    let ok = 0, busy = 0;   // 주관자 허가 3개는 회의 칸에 들지 않는다(R3 P3)
    for (let i = 0; i < 21; i++) {
        const V = await h.join(mid, '참석' + i);
        for (let k = 0; k < 3; k++) { h.clock.t += 7000; const r = await ask(V); if (r.status === 201) ok++; else { assert.ok(['upload_busy', 'rate_limited'].includes(r.json.error), r.text); busy++; } }
    }
    assert.equal(ok, 60, '회의당 60개(R4 Q2, 시간당 발급 60개와 같다)'); assert.ok(busy > 0);
    h.clock.t += 15 * 60000 + 1000;
    const A2 = await h.join(mid, '관리자', 'admin');
    assert.equal((await ask(A2)).status, 201, '허가 수명(15분, R3 P3)이 지난 허가는 세지 않는다');
});

test('R2-M2: 허가 하나로 쓸 수 있는 바이트는 원본 50MiB + 쪽 그림 200MiB + 썸네일 20MiB 안이다', async t => {
    const h = await setup(); t.after(h.close);
    const mid = await h.createMeeting();
    const A = await h.join(mid, '관리자', 'admin');
    const { pageCaps } = require('../../lib/zzoom/contract');
    for (const pages of [1, 50, 120, 200]) {
        const r = await h.call('POST', `/${mid}/uploads`, { pt: A.pt, body: { kind: 'pdf', pages, bytes: 10 } });
        assert.equal(r.status, 201, r.text);
        const c = h.fb.calls.tokens.at(-1).claims;
        const cap = pageCaps(pages);
        assert.equal(c.upPageMax, cap.page); assert.equal(c.upThumbMax, cap.thumb);
        assert.equal(r.json.limits.pageBytes, cap.page); assert.equal(r.json.limits.thumbBytes, cap.thumb);
        assert.ok(cap.page <= 4 * 1048576 && cap.page * pages <= 200 * 1048576, `쪽 ${pages}: ${cap.page}`);
        assert.ok(cap.thumb <= 512 * 1024 && cap.thumb * pages <= 20 * 1048576);
        putPages(h, r.json.path, pages);
        const cm = await h.call('POST', `/${mid}/uploads/${r.json.uploadId}/commit`, { pt: A.pt, body: commitBody(pages) });
        assert.equal(cm.status, 201, cm.text);
    }
});

test('R2-M3: 녹음이 꺼진 회의(recording=false)에는 받아쓰기를 받지 않고, 켠 사람만 보낸다', async t => {
    const h = await setup(); t.after(h.close);
    const mid = await h.createMeeting();
    const A = await h.join(mid, '관리자', 'admin');
    const H = await h.asHost(mid, '주관2');
    await h.call('POST', `/${mid}/state`, { pt: A.pt, body: { action: 'start' } });
    const send = (who, n) => h.call('POST', `/${mid}/transcribe?n=${n}&at=${h.clock.t}`, { pt: who.pt, raw: Buffer.from('a') });
    const off = await send(A, 0);
    assert.equal(off.status, 409, off.text); assert.equal(off.json.error, 'recording_not_on');
    assert.equal((await h.call('POST', `/${mid}/state`, { pt: A.pt, body: { action: 'recording', value: true } })).status, 200);
    assert.equal((await send(A, 1)).status, 201);
    const other = await send(H, 2);
    assert.equal(other.status, 409, other.text); assert.equal(other.json.error, 'recording_not_on', '켠 사람이 아니면 거절');
    await h.call('POST', `/${mid}/state`, { pt: A.pt, body: { action: 'recording', value: false } });
    h.clock.t += 91000;   // 끈 뒤 90초 안의 이어지는 조각은 받는다(R3 P1). 그 뒤에는 거절.
    assert.equal((await send(A, 3)).status, 409);
});

test('R2-M4: 관리자가 로그아웃(세션 삭제)하면 남은 탭의 주관 동작이 막히고 출입증은 viewer 가 된다', async t => {
    const dead = new Set();
    const vs = async tk => { const s = String(tk || ''); if (dead.has(s)) return null; const b = s.split('#')[0]; return b === TOKENS.admin ? { role: 'admin' } : b === TOKENS.user ? { role: 'user' } : null; };
    const h = await setup({ router: { validateSession: vs } }); t.after(h.close);
    const mid = await h.createMeeting();
    const A = await h.join(mid, '관리자', 'admin');
    assert.equal((await h.call('POST', `/${mid}/state`, { pt: A.pt, body: { action: 'penLock', value: true } })).status, 200);
    dead.add(TOKENS.admin + '#' + encodeURIComponent('관리자'));
    const r = await h.call('POST', `/${mid}/state`, { pt: A.pt, body: { action: 'penLock', value: false } });
    assert.equal(r.status, 403, r.text); assert.equal(r.json.error, 'host_revoked');
    const up = await h.call('POST', `/${mid}/uploads`, { pt: A.pt, body: { kind: 'pdf', pages: 1, bytes: 10 } });
    assert.equal(up.status, 201, up.text);
    assert.equal(h.fb.calls.tokens.at(-1).claims.role, 'viewer', '출입증은 viewer');
});

test('R2-M5(감사 R3 P4 로 바뀜): 다시 로그인하면 같은 기기여도 만든 사람이 아니고, 관리자는 회의 100개 상한을 받지 않는다', async t => {
    const h = await setup(); t.after(h.close);
    const dev = { 'X-Device-Id': 'devAAAAAAAAAAAAAAAA1' };
    const mk = await h.call('POST', '/meetings', { auth: 'user-t#login1', headers: dev, body: { title: '내 회의', startsAt: '2026-11-26T06:00:00Z', hostCode: '123456' } });
    assert.equal(mk.status, 201, mk.text);
    const mid = mk.json.meeting.id;
    const again = await h.call('PATCH', `/meetings/${mid}`, { auth: 'user-t#login2', headers: dev, body: { title: '고친 제목' } });
    assert.equal(again.status, 403, '기기 id 만으로는 만든 사람이 아니다(공용 PC, R3 P4)');
    const other = await h.call('PATCH', `/meetings/${mid}`, { auth: 'user-t#login3', headers: { 'X-Device-Id': 'devBBBBBBBBBBBBBBBB2' }, body: { title: '남' } });
    assert.equal(other.status, 403);
    for (let i = 0; i < 100; i++) h.fb.docs.set(`zzoom_meetings/mfill${String(i).padStart(8, '0')}`, { title: 'x', status: 'ready', expiresAt: h.clock.t + DAY * 5, startsAt: 0, createdAt: 0 });
    const u = await h.call('POST', '/meetings', { auth: 'user-t#u9', body: { title: 'x', startsAt: '2026-11-26T06:00:00Z', hostCode: '123456' } });
    assert.equal(u.status, 429, u.text);
    const a = await h.call('POST', '/meetings', { auth: 'admin', body: { title: 'x', startsAt: '2026-11-26T06:00:00Z', hostCode: '123456' } });
    assert.equal(a.status, 201, a.text);
});

test('R2-M6: 안건 주인 해시는 회의마다 달라 두 회의의 안건을 같은 사람으로 잇지 못한다', async t => {
    const h = await setup(); t.after(h.close);
    const m1 = await h.createMeeting(), m2 = await h.createMeeting();
    const V1 = await h.join(m1, '같은이'), V2 = await h.join(m2, '같은이');
    const a1 = (await h.call('POST', `/${m1}/agenda`, { pt: V1.pt, body: { title: '가' } })).json.aid;
    const a2 = (await h.call('POST', `/${m2}/agenda`, { pt: V2.pt, body: { title: '나' } })).json.aid;
    const d1 = h.fb.docs.get(`zzoom_meetings/${m1}/agenda/${a1}`), d2 = h.fb.docs.get(`zzoom_meetings/${m2}/agenda/${a2}`);
    assert.ok(d1.ownerHash && d2.ownerHash);
    assert.notEqual(d1.ownerHash, d2.ownerHash);
    const V1b = await h.join(m1, '같은이');
    const e = await h.call('PATCH', `/${m1}/agenda/${a1}`, { pt: V1b.pt, body: { title: '가2' } });
    assert.equal(e.status, 200, e.text);
});

test('R2-N3: 투표 마감이 다시 만드는 투표 키에도 만료가 걸린다', async t => {
    const h = await setup(); t.after(h.close);
    const mid = await h.createMeeting();
    const A = await h.join(mid, '관리자', 'admin');
    await h.call('POST', `/${mid}/state`, { pt: A.pt, body: { action: 'start' } });
    const p = await h.call('POST', `/${mid}/polls`, { pt: A.pt, body: { q: '점심?', options: ['예', '아니오'] } });
    assert.equal(p.status, 201, p.text);
    const vk = [...h.redis.data.keys()].find(k => k.startsWith(`zz:vote:${mid}:`));
    const pid = vk.split(':').pop();
    assert.ok(vk, '투표 키 ' + [...h.redis.data.keys()].join(','));
    h.redis.data.delete(vk);
    const c = await h.call('POST', `/${mid}/polls/${pid}/close`, { pt: A.pt });
    assert.ok([200, 201].includes(c.status), c.text);
    const e = h.redis.data.get(vk);
    assert.ok(e && e.exp > h.clock.t, '만료가 있다');
});

// ================================================================ 감사 R3 (R2 회귀)
test('R3-P1: 녹음을 끈 사람의 마지막 조각은 끈 뒤 90초 안·이어지는 순번이면 받고, 처리 중 꺼져도 저장한다', async t => {
    let release = null;
    const groq = { async transcribe() { if (release) await new Promise(r => { const f = release; release = null; f(r); }); return { ok: true, text: '말' }; } };
    const h = await setup({ groq }); t.after(h.close);
    const mid = await h.createMeeting();
    const A = await h.join(mid, '관리자', 'admin');
    const H = await h.asHost(mid, '주관2');
    await h.call('POST', `/${mid}/state`, { pt: A.pt, body: { action: 'start' } });
    await h.call('POST', `/${mid}/state`, { pt: A.pt, body: { action: 'recording', value: true } });
    let tOff = null;   // 꼬리 조각은 끄기 전에 시작한 것(at < 끈 시각, 감사 R4 Q3)
    const send = (who, n) => h.call('POST', `/${mid}/transcribe?n=${n}&at=${tOff ?? h.clock.t}`, { pt: who.pt, raw: Buffer.from('a') });
    assert.equal((await send(A, 0)).status, 201);
    assert.equal((await send(A, 1)).status, 201);
    // 화면 순서: 녹음기 멈춤, 녹음 끄기, onstop 에서 마지막 조각 전송
    tOff = h.clock.t;
    assert.equal((await h.call('POST', `/${mid}/state`, { pt: A.pt, body: { action: 'recording', value: false } })).status, 200);
    h.clock.t += 5000;
    const last = await send(A, 2);
    assert.equal(last.status, 201, last.text);
    assert.equal((await send(H, 3)).status, 409, '다른 사람은 거절');
    assert.equal((await send(A, 40)).status, 409, '이어지지 않는 순번은 거절');
    const over = await send(A, 1);
    assert.equal(over.status, 409, '받은 조각 덮어쓰기 거절');
    h.clock.t += 90000;
    assert.equal((await send(A, 3)).status, 409, '90초가 지나면 거절');
    // 받아쓰기 처리 중에 꺼져도 결과를 저장한다
    tOff = null;
    await h.call('POST', `/${mid}/state`, { pt: A.pt, body: { action: 'recording', value: true } });
    let unblock; release = r => { unblock = r; };
    const inflight = send(A, 3);
    while (!unblock) await new Promise(r => setTimeout(r, 5));
    assert.equal((await h.call('POST', `/${mid}/state`, { pt: A.pt, body: { action: 'recording', value: false } })).status, 200);
    unblock();
    const r = await inflight;
    assert.equal(r.status, 201, r.text);
    assert.ok(h.fb.docs.get(`zzoom_meetings/${mid}/transcript/t00003`), '글이 남는다');
});

test('R3-P2: 입장 직후 30명이 같은 순간 인사해도 모두 올라가고, 사람당 초당 1개는 그대로', async t => {
    const h = await setup(); t.after(h.close);
    const mid = await h.createMeeting();
    const A = await h.join(mid, '관리자', 'admin');
    await h.call('POST', `/${mid}/state`, { pt: A.pt, body: { action: 'start' } });
    const ppl = [];
    for (let i = 0; i < 30; i++) ppl.push(await h.join(mid, '사람' + i, 'user', 0));
    const rs = await Promise.all(ppl.map(p => h.call('POST', `/${mid}/chat`, { pt: p.pt, body: { text: '안녕하세요' }, tick: 0 })));
    assert.equal(rs.filter(r => r.status === 201).length, 30, rs.map(r => r.status).join(','));
    const again = await h.call('POST', `/${mid}/chat`, { pt: ppl[0].pt, body: { text: '또' }, tick: 0 });
    assert.equal(again.status, 429, '같은 사람 같은 초 두 번째');
});

test('R3-P3: 업로드 허가는 본인만 취소하고, 확정 전 허가는 15분, 주관자는 회의 20칸 상한 밖', async t => {
    const h = await setup(); t.after(h.close);
    const mid = await h.createMeeting();
    const A = await h.join(mid, '관리자', 'admin');
    const ask = who => h.call('POST', `/${mid}/uploads`, { pt: who.pt, body: { kind: 'pdf', pages: 1, bytes: 10 } });
    // 실패한 허가 취소: 본인만
    const V = await h.join(mid, '참석');
    const W = await h.join(mid, '남');
    const ups = [];
    for (let i = 0; i < 3; i++) ups.push((await ask(V)).json);
    assert.equal((await ask(V)).status, 429);
    const notMine = await h.call('DELETE', `/${mid}/uploads/${ups[0].uploadId}`, { pt: W.pt });
    assert.equal(notMine.status, 403, notMine.text);
    const mine = await h.call('DELETE', `/${mid}/uploads/${ups[0].uploadId}`, { pt: V.pt });
    assert.equal(mine.status, 200, mine.text);
    assert.equal((await ask(V)).status, 201, '취소하면 자리가 난다');
    assert.equal((await h.call('POST', `/${mid}/uploads/${ups[0].uploadId}/commit`, { pt: V.pt, body: commitBody(1) })).status, 404, '취소한 허가는 확정하지 못한다');
    // 공용 코드 여러 세션으로 회의 칸 채우기
    let filled = 0;
    for (let i = 0; i < 21 && filled < 70; i++) { const S = await h.join(mid, '채우기' + i); for (let k = 0; k < 3; k++) { h.clock.t += 7000; if ((await ask(S)).status === 201) filled++; } }
    const late = await h.join(mid, '늦은이');
    assert.equal((await ask(late)).status, 429, '회의 칸이 찼다');
    const hostUp = await ask(A);
    assert.equal(hostUp.status, 201, '주관자는 회의 칸 상한 밖: ' + hostUp.text);
    const T = h.fb.calls.tokens.at(-1).claims;
    assert.ok(T.until - h.clock.t <= 15 * 60000, '출입증 15분');
    // 칸 60 과 시간당 발급 60 이 같으므로(감사 R4 Q1·Q2) 다른 사람은 다음 한 시간 칸에서 다시 올린다
    h.clock.t += 3600000;
    const late2 = await h.join(mid, '늦은이2');
    assert.equal((await ask(late2)).status, 201, '한 시간 뒤에는 다른 사람도 올린다');
});

test('R3-P4: 기기 id 만으로는 만든 사람이 아니다(공용 PC). 다시 로그인한 사람은 주관 코드로 주관자가 된다', async t => {
    const h = await setup(); t.after(h.close);
    const dev = { 'X-Device-Id': 'devAAAAAAAAAAAAAAAA1' };
    const mk = await h.call('POST', '/meetings', { auth: 'user-t#login1', headers: dev, body: { title: '내 회의', startsAt: '2026-11-26T06:00:00Z', hostCode: '123456' } });
    assert.equal(mk.status, 201, mk.text);
    const mid = mk.json.meeting.id;
    assert.equal((await h.call('PATCH', `/meetings/${mid}`, { auth: 'user-t#login1', headers: dev, body: { title: '같은 세션' } })).status, 200);
    const other = await h.call('PATCH', `/meetings/${mid}`, { auth: 'user-t#login2', headers: dev, body: { hostCode: '000000' } });
    assert.equal(other.status, 403, other.text);
    const V = await h.join(mid, 'login2');
    const host = await h.call('POST', `/${mid}/host`, { pt: V.pt, body: { code: '123456' }, ip: '10.201.0.1' });
    assert.equal(host.status, 200, host.text); assert.equal(host.json.role, 'host');
});

// ================================================================ 화면 결정 반영(발표 마치기·만든 사람 바로 주관)
test('발표 마치기: 지금 발표자 본인이나 주관자만, presenter 를 비우고 모두 대기 화면(epoch·rev 올림), 끝난 회의 금지, 속도 한도', async t => {
    const h = await setup(); t.after(h.close);
    const mid = await h.createMeeting();
    const A = await h.join(mid, '관리자', 'admin');
    const V = await h.join(mid, '발표자'), W = await h.join(mid, '남');
    const aid = (await h.call('POST', `/${mid}/agenda`, { pt: A.pt, body: { title: '안건' } })).json.aid;
    const early = await h.call('POST', `/${mid}/presenter/end`, { pt: V.pt, body: {} });
    assert.equal(early.status, 409, '시작 전');
    await h.call('POST', `/${mid}/state`, { pt: A.pt, body: { action: 'start' } });
    const tk = await h.call('POST', `/${mid}/presenter`, { pt: V.pt, body: {} });
    assert.equal(tk.status, 200, tk.text);
    const before = h.fb.docs.get(`zzoom_meetings/${mid}`);
    const no = await h.call('POST', `/${mid}/presenter/end`, { pt: W.pt, body: {} });
    assert.equal(no.status, 403, no.text); assert.equal(no.json.error, 'not_presenter');
    const ok = await h.call('POST', `/${mid}/presenter/end`, { pt: V.pt, body: {} });
    assert.equal(ok.status, 200, ok.text);
    const m = h.fb.docs.get(`zzoom_meetings/${mid}`);
    assert.equal(m.presenter.cid, null, '발표자 비움');
    assert.ok(m.presenter.epoch > before.presenter.epoch && m.live.epoch === m.presenter.epoch, 'epoch 올림');
    assert.ok(m.live.rev > before.live.rev, 'rev 올림'); assert.equal(m.live.aid, null, '대기 화면');
    const again = await h.call('POST', `/${mid}/presenter/end`, { pt: V.pt, body: {}, tick: 0 });
    assert.equal(again.status, 429, '속도 한도');
    // 옛 발표자의 진행은 거절
    const lv = await h.call('POST', `/${mid}/live`, { pt: V.pt, body: { aid, page: 1, epoch: before.presenter.epoch, baseRev: m.live.rev } });
    assert.equal(lv.status, 409);
    // 주관자는 남의 발표를 마칠 수 있다
    await h.call('POST', `/${mid}/presenter`, { pt: W.pt, body: {}, tick: 11000 });
    assert.equal((await h.call('POST', `/${mid}/presenter/end`, { pt: A.pt, body: {} })).status, 200);
    assert.equal(h.fb.docs.get(`zzoom_meetings/${mid}`).presenter.cid, null);
    await h.call('POST', `/${mid}/state`, { pt: A.pt, body: { action: 'end' } });
    const ended = await h.call('POST', `/${mid}/presenter/end`, { pt: A.pt, body: {}, tick: 5000 });
    assert.equal(ended.status, 409); assert.equal(ended.json.error, 'state_ended');
});

test('만든 사람(같은 로그인 세션)은 입장하면 주관 코드 없이 주관자 pt 를 받고, 로그아웃하면 주관 동작이 막힌다', async t => {
    const dead = new Set();
    const vs = async tk => { const s = String(tk || ''); if (dead.has(s)) return null; const b = s.split('#')[0]; return b === TOKENS.admin ? { role: 'admin' } : b === TOKENS.user ? { role: 'user' } : null; };
    const h = await setup({ router: { validateSession: vs } }); t.after(h.close);
    const mk = await h.call('POST', '/meetings', { auth: 'user-t#maker', body: { title: '내 회의', startsAt: '2026-11-26T06:00:00Z', hostCode: '123456' } });
    const mid = mk.json.meeting.id;
    const me = await h.call('POST', `/${mid}/join`, { auth: 'user-t#maker', body: {} });
    assert.equal(me.status, 200, me.text); assert.equal(me.json.role, 'host');
    assert.equal(h.fb.calls.tokens.at(-1).claims.role, 'host');
    assert.equal((await h.call('POST', `/${mid}/state`, { pt: me.json.pt, body: { action: 'start' } })).status, 200);
    const other = await h.call('POST', `/${mid}/join`, { auth: 'user-t#maker2', headers: { 'X-Device-Id': 'devAAAAAAAAAAAAAAAA1' }, body: {} });
    assert.equal(other.json.role, 'viewer', '다른 로그인은 viewer');
    dead.add('user-t#maker');
    const r = await h.call('POST', `/${mid}/state`, { pt: me.json.pt, body: { action: 'penLock', value: true } });
    assert.equal(r.status, 403); assert.equal(r.json.error, 'host_revoked');
    const rf = await h.call('POST', `/${mid}/refresh`, { pt: me.json.pt, auth: 'user-t#maker' });
    assert.equal(rf.json.role, 'viewer', 'refresh 도 viewer');
});

// ================================================================ 감사 R4
test('R4-Q1: 업로드 허가 발급(취소 포함)은 사람당 시간당 12개, 주관자 30개, 회의(참석자) 시간당 60개', async t => {
    const h = await setup(); t.after(h.close);
    const mid = await h.createMeeting();
    const A = await h.join(mid, '관리자', 'admin');
    const ask = who => h.call('POST', `/${mid}/uploads`, { pt: who.pt, body: { kind: 'pdf', pages: 1, bytes: 10 } });
    const cycle = async who => { h.clock.t += 7000; const r = await ask(who); if (r.status === 201) await h.call('DELETE', `/${mid}/uploads/${r.json.uploadId}`, { pt: who.pt, tick: 0 }); return r; };
    const hs = []; for (let i = 0; i < 31; i++) hs.push((await cycle(A)).status);
    assert.equal(hs.filter(s => s === 201).length, 30, '주관자 시간당 30: ' + hs.join(','));
    const V = await h.join(mid, '참석');
    const vs = []; for (let i = 0; i < 13; i++) vs.push((await cycle(V)).status);
    assert.equal(vs.filter(s => s === 201).length, 12, '참석자 시간당 12: ' + vs.join(','));
    let ok = 12;
    for (let k = 0; k < 5; k++) { const S = await h.join(mid, '봇' + k); for (let i = 0; i < 12; i++) if ((await cycle(S)).status === 201) ok++; }
    assert.equal(ok, 60, '회의 시간당 60');
    h.clock.t += 3600000;
    const W = await h.join(mid, '한시간뒤');
    assert.equal((await ask(W)).status, 201, '한 시간 뒤 다시');
});

test('R4-Q2: 세션 7개가 3칸씩 채워도 다른 참석자는 올린다(회의 칸 60)', async t => {
    const h = await setup(); t.after(h.close);
    const mid = await h.createMeeting();
    const ask = who => h.call('POST', `/${mid}/uploads`, { pt: who.pt, body: { kind: 'pdf', pages: 1, bytes: 10 } });
    for (let k = 0; k < 7; k++) { const S = await h.join(mid, '봇' + k); for (let i = 0; i < 3; i++) { h.clock.t += 7000; assert.equal((await ask(S)).status, 201); } }
    const V = await h.join(mid, '참석');
    assert.equal((await ask(V)).status, 201);
});

test('R4-Q3·Q6: 녹음 꼬리는 같은 번호 재시도를 한 번만 세고 끈 뒤 시작한 조각은 거절, 다시 들어온 녹음자는 이어 보낸다', async t => {
    const seq = [];
    const groq = { async transcribe() { const r = seq.shift(); return r === 429 ? { ok: false, status: 429, retryAfter: 2 } : { ok: true, text: '말' }; } };
    const h = await setup({ groq }); t.after(h.close);
    const mid = await h.createMeeting();
    const A = await h.join(mid, '관리자', 'admin');
    await h.call('POST', `/${mid}/state`, { pt: A.pt, body: { action: 'start' } });
    await h.call('POST', `/${mid}/state`, { pt: A.pt, body: { action: 'recording', value: true } });
    const send = (who, n, at) => h.call('POST', `/${mid}/transcribe?n=${n}&at=${at ?? h.clock.t - 500}`, { pt: who.pt, raw: Buffer.from('a') });
    assert.equal((await send(A, 0)).status, 201);
    // Q6: 새로 고침(같은 로그인 세션, 새 cid)해도 녹음을 이어 보낸다
    const A2 = await h.join(mid, '관리자', 'admin');
    const cont = await send(A2, 1);
    assert.equal(cont.status, 201, cont.text);
    const tOn = h.clock.t;
    await h.call('POST', `/${mid}/state`, { pt: A2.pt, body: { action: 'recording', value: false } });
    // Q3: 같은 번호 Groq 429 두 번 뒤 성공 → 꼬리 하나로만 센다
    seq.push(429, 429);
    assert.equal((await send(A2, 2, tOn)).status, 429);
    assert.equal((await send(A2, 2, tOn)).status, 429);
    assert.equal((await send(A2, 2, tOn)).status, 201);
    assert.equal((await send(A2, 3, tOn)).status, 201);
    assert.equal((await send(A2, 4, tOn)).status, 201, '재시도를 세지 않아 꼬리 3개 모두');
    const late = await send(A2, 5, h.clock.t - 100);
    assert.equal(late.status, 409, '끈 뒤에 시작한 조각은 거절');
});

test('R4-Q4: 주관자 채팅(공지)은 회의 물통 밖(주관자 사람당 1초 1글만)', async t => {
    const h = await setup(); t.after(h.close);
    const mid = await h.createMeeting();
    const A = await h.join(mid, '관리자', 'admin');
    const bots = []; for (let i = 0; i < 35; i++) bots.push(await h.join(mid, '봇' + i));
    await Promise.all(bots.map(b => h.call('POST', `/${mid}/chat`, { pt: b.pt, body: { text: '도배' }, tick: 0 })));
    const r = await h.call('POST', `/${mid}/chat`, { pt: A.pt, body: { text: '공지' }, tick: 0 });
    assert.equal(r.status, 201, r.text);
});

test('R4-Q5: 만든 사람 주관자 토큰 until 은 그 로그인 세션 만료를 넘지 않고, refresh 도 세션을 본다', async t => {
    const clockRef = {};
    const vs = async tk => { const s = String(tk || ''); if (s === 'user-t#maker') return { role: 'user', expiresAt: clockRef.end }; return s.startsWith('user-t') ? { role: 'user' } : s.startsWith('admin-t') ? { role: 'admin' } : null; };
    const h = await setup({ router: { validateSession: vs } }); t.after(h.close);
    clockRef.end = h.clock.t + 20 * 60000;
    const mid = (await h.call('POST', '/meetings', { auth: 'user-t#maker', body: { title: '내 회의', startsAt: '2026-11-26T06:00:00Z', hostCode: '123456' } })).json.meeting.id;
    const me = await h.call('POST', `/${mid}/join`, { auth: 'user-t#maker', body: {} });
    assert.equal(me.json.role, 'host');
    assert.ok(h.fb.calls.tokens.at(-1).claims.until <= clockRef.end, '토큰 until ≤ 세션 만료');
    h.clock.t = clockRef.end + 1000;
    const r = await h.call('POST', `/${mid}/state`, { pt: me.json.pt, body: { action: 'penLock', value: true } });
    assert.equal(r.status, 403, '세션 만료 뒤 주관 동작');
    const rf = await h.call('POST', `/${mid}/refresh`, { pt: me.json.pt, auth: 'user-t#maker' });
    assert.equal(rf.json.role, 'viewer');
});

test('감사 R7: 같은 요청 표(X-Zzoom-Idem)로 다시 보내면 한 번만 반영하고 처음 응답을 준다', async t => {
    const h = await setup(); t.after(h.close);
    const mid = await h.createMeeting();
    const V = await h.join(mid, '참석');
    const idem = 'abcdefgh12345678';
    const r1 = await h.call('POST', `/${mid}/chat`, { pt: V.pt, body: { text: '안녕하세요' }, headers: { 'X-Zzoom-Idem': idem } });
    const r2 = await h.call('POST', `/${mid}/chat`, { pt: V.pt, body: { text: '안녕하세요' }, headers: { 'X-Zzoom-Idem': idem } });
    assert.ok(r1.status < 300, r1.text);
    assert.equal(r2.status, r1.status);
    assert.deepEqual(r2.json, r1.json);
    const r3 = await h.call('POST', `/${mid}/chat`, { pt: V.pt, body: { text: '안녕하세요' }, headers: { 'X-Zzoom-Idem': 'zzzzzzzz87654321' } });
    assert.ok(r3.status < 300, r3.text);
    assert.notDeepEqual(r3.json, r1.json);   // 다른 표는 새 요청
});

test('감사 R7: 큰 epoch 를 보내도 판서 상한 장부가 비워지지 않는다', async t => {
    const h = await setup(); t.after(h.close);
    const mid = await h.createMeeting();
    const A = await h.join(mid, '관리자', 'admin');
    const aid = await h.board(mid, A, 1);
    const pk = `${aid}_1`;
    await h.call('POST', `/${mid}/strokes`, { pt: A.pt, body: stroke(pk) });
    const before = Number(await h.redis.hget(`zz:sc:${mid}`, pk));
    const r = await h.call('POST', `/${mid}/strokes`, { pt: A.pt, body: stroke(pk, { epoch: 999999 }) });
    assert.equal(r.status, 409, r.text);   // stale_epoch
    assert.equal(Number(await h.redis.hget(`zz:sc:${mid}`, pk)), before);
    assert.equal(Number((await h.redis.hget(`zz:sc:${mid}`, pk + '@e')) || 0), 0);
});

test('감사 R7·R8: 같은 요청 표 — 처리 중 표시만 남은 요청은 25초 뒤 하나만 새로 처리, 결과는 응답 전에 적힌다(운영처럼 JSON 이 객체로 읽혀도)', async t => {
    const h = await setup(); t.after(h.close);
    const mid = await h.createMeeting();
    const V = await h.join(mid, '참석');
    const idem = 'stuckstuck123456';
    // 앞 요청이 죽어 '처리 중'만 남은 상태를 흉내: 같은 키 계산 대신 첫 요청 뒤 값을 처리 중으로 되돌린다
    const r1 = await h.call('POST', `/${mid}/chat`, { pt: V.pt, body: { text: '하나' }, headers: { 'X-Zzoom-Idem': idem } });
    assert.ok(r1.status < 300, r1.text);
    const U = require('../../lib/zzoom/util');
    const keys = ['zz:idem:' + U.sha256(idem + '|POST|' + `/api/zzoom/${mid}/chat` + '|' + V.pt).slice(0, 32)];
    const stored = await h.redis.get(keys[0]);
    assert.ok(stored && stored.s, '응답 전에 결과가 적혀 있어야 함');
    // 다시 보내면 처음 응답 그대로(운영 Upstash 처럼 객체로 읽혀도)
    const again = await h.call('POST', `/${mid}/chat`, { pt: V.pt, body: { text: '하나' }, headers: { 'X-Zzoom-Idem': idem } });
    assert.equal(again.status, r1.status); assert.deepEqual(again.json, r1.json);
    await h.redis.set(keys[0], JSON.stringify({ p: h.clock.t }), { ex: 120 });
    const r2 = await h.call('POST', `/${mid}/chat`, { pt: V.pt, body: { text: '하나' }, headers: { 'X-Zzoom-Idem': idem }, tick: 1000 });
    assert.equal(r2.status, 409); assert.equal(r2.json.error, 'in_progress');
    const r3 = await h.call('POST', `/${mid}/chat`, { pt: V.pt, body: { text: '하나' }, headers: { 'X-Zzoom-Idem': idem }, tick: 26000 });
    assert.ok(r3.status < 300, r3.text);
});
