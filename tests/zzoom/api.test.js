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
    const groq = { async transcribe(a) { groqCalls.push({ bytes: a.buffer.length, mime: a.mime, language: a.language }); return { ok: true, text: '첫 안건 이야기' }; } };
    const sessCalls = { n: 0 };
    const validateSession = async t => { sessCalls.n++; return t === TOKENS.admin ? { role: 'admin' } : t === TOKENS.user ? { role: 'user' } : null; };
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
    async function join(mid, name = '참석자', auth = 'user') {
        const r = await call('POST', `/${mid}/join`, { auth, body: { name }, ip: `10.9.${Math.floor(ipSeq / 200)}.${ipSeq++ % 200}` });
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
    assert.equal(mk.status, 403); assert.equal(mk.json.error, 'admin_only');
    assert.equal((await h.call('POST', '/meetings', { auth: 'admin', body: { title: 'x', startsAt: Date.now(), hostCode: '12345' } })).json.error, 'bad_code');
    assert.equal((await h.call('POST', '/meetings', { auth: 'admin', body: { title: '', startsAt: Date.now(), hostCode: '123456' } })).json.error, 'bad_title');
    assert.equal((await h.call('POST', '/meetings', { auth: 'admin', body: [] })).status, 400);

    const mid = await h.createMeeting(), mid2 = await h.createMeeting();
    // 응답 어디에도 코드 해시가 없다
    const list = await h.call('GET', '/meetings', { auth: 'admin' });
    assert.equal(list.json.meetings.length, 2);
    assert.ok(!/hash|salt|123456/.test(list.text));
    assert.equal((await h.call('POST', `/${mid}/join`, { body: { name: 'a' } })).status, 401, '비로그인 입장');
    assert.equal((await h.call('POST', `/${mid}/join`, { auth: 'user', body: { name: '' } })).json.error, 'bad_name');
    assert.equal((await h.call('POST', '/mzzzzzzzzzzzz/join', { auth: 'user', body: { name: 'a' } })).status, 404);
    assert.equal((await h.call('POST', '/meetings/join', { auth: 'user', body: { name: 'a' } })).status, 404);

    const v = await h.join(mid, '김교사');
    assert.equal(v.role, 'viewer');
    assert.ok(v.pt && v.cid && v.token);
    const tok = h.fb.calls.tokens.at(-1);
    assert.deepEqual(tok.claims, { zz: 1, mid, role: 'viewer', until: v.until });
    assert.equal(tok.uid, 'zz_' + v.cid);
    // 관리자는 코드 없이 host
    const a = await h.join(mid, '관리자', 'admin');
    assert.equal(a.role, 'host'); assert.equal(h.fb.calls.tokens.at(-1).claims.role, 'host');

    // 자격 없이·엉터리 자격·viewer 의 host 요청·다른 회의 자격
    assert.equal((await h.call('POST', `/${mid}/chat`, { body: { text: 'hi' } })).json.error, 'pt_required');
    assert.equal((await h.call('POST', `/${mid}/chat`, { pt: 'nope', body: { text: 'hi' } })).json.error, 'pt_invalid');
    for (const [m, u, b] of [['POST', `/${mid}/state`, { action: 'start' }], ['POST', `/${mid}/uploads`, { kind: 'pdf', pages: 1, bytes: 10 }], ['POST', `/${mid}/boards`, {}], ['POST', `/${mid}/polls`, { q: 'q' }], ['GET', `/${mid}/export.md`], ['POST', `/${mid}/presenter`, {}]]) {
        const r = await h.call(m, u, { pt: v.pt, body: b });
        assert.equal(r.status, 403, u); assert.equal(r.json.error, 'host_only', u);
    }
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
    assert.equal(Number(await h.redis.get(`zz:try:${mid2}:all`)), 25, '실패 25회만 남는다(성공 1회는 되돌림)');

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
    const v = await h.join(mid, '정상');
    const lock = await h.call('POST', `/${mid}/host`, { pt: v.pt, body: { code: '123456' }, ip: '10.6.0.1' });
    assert.equal(lock.status, 423); assert.equal(lock.json.error, 'host_locked');
    const list = await h.call('GET', '/meetings', { auth: 'admin' });
    assert.equal(list.json.meetings.find(m => m.id === mid).hostLocked, true);
    assert.equal((await h.call('POST', `/meetings/${mid}/unlock`, { auth: 'user' })).status, 403);
    assert.equal((await h.call('POST', `/meetings/${mid}/unlock`, { auth: 'admin' })).status, 200);
    const ok = await h.call('POST', `/${mid}/host`, { pt: v.pt, body: { code: '123456' }, ip: '10.6.0.1' });
    assert.equal(ok.status, 200, ok.text);
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
    assert.equal((await h.call('POST', `/${mid}/live`, { pt: V.pt, body: { aid, page: 2, baseRev: live.rev, epoch: live.epoch } })).json.error, 'host_only');
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
    assert.equal(doc.cid, V.cid); assert.equal(doc.name, '참석'); assert.equal(doc.seq, 1); assert.equal(doc.color, '#FFE14D');
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
    const fast = await Promise.all([0, 1].map(() => h.call('POST', `/${mid}/strokes`, { pt: W.pt, body: stroke(`${aid}_2`), tick: 0 })));
    assert.deepEqual(fast.map(x => x.status).sort(), [201, 429]);
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
    assert.equal(cd.cid, V.cid); assert.equal(cd.name, '참석');
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
test('투표: 원표 비노출·바꾸기·마감 동시·숨긴 결과·공개 이름', async t => {
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

    // 공개 투표: reveal 때 names
    const p2 = await h.call('POST', `/${mid}/polls`, { pt: A.pt, body: { q: '공개 투표', options: ['가', '나'], anonymous: false } });
    const pid2 = p2.json.pid;
    await h.call('POST', `/${mid}/polls/${pid2}/vote`, { pt: vs[0].pt, body: { optionId: 'o1' } });
    await h.call('POST', `/${mid}/polls/${pid2}/vote`, { pt: vs[1].pt, body: { optionId: 'o2' } });
    assert.equal(h.fb.docs.get(`zzoom_meetings/${mid}/polls/${pid2}`).names, null, 'reveal 전에는 이름 없음');
    const rv2 = await h.call('POST', `/${mid}/polls/${pid2}/reveal`, { pt: A.pt });
    assert.deepEqual(rv2.json.poll.names, { o1: ['교사0'], o2: ['교사1'] });
    assert.deepEqual(rv2.json.poll.tally, { o1: 1, o2: 1 });

    // AI용 md: 비공개 투표는 숫자만
    const md = await h.call('GET', `/${mid}/export.md`, { pt: A.pt });
    assert.equal(md.status, 200); assert.match(md.headers.get('content-type'), /markdown/);
    assert.match(md.headers.get('content-disposition'), /filename\*=UTF-8''/);
    const anonPart = md.text.split('공개 투표')[0];
    assert.ok(anonPart.includes('체험학습 장소 정하기 (비공개)'));
    assert.ok(!/교사[0-3]/.test(anonPart.split('## 투표 결과')[1]), '비공개 투표 줄에 이름 없음');
    assert.ok(md.text.includes('가: 교사0'));
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
    assert.equal((await commit(body, V.pt)).json.error, 'host_only');
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
    assert.equal((await h.call('DELETE', `/${mid}/agenda/${aid}`, { pt: V.pt })).json.error, 'host_only');
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
    assert.equal((await h.call('DELETE', `/meetings/${mid}`, { auth: 'user' })).status, 403);
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
    assert.equal(fail.status, 500);
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
