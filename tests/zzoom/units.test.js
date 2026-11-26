'use strict';
// 쭘 서버 부품 단위 시험: 실제 REST 어댑터(gcp.js)를 가짜 HTTP 로, Whisper 키 순회·시간 예산, 창고 출입증, Lua 실행.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');

const { privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048, privateKeyEncoding: { type: 'pkcs8', format: 'pem' }, publicKeyEncoding: { type: 'spki', format: 'pem' } });
const SA = { client_email: 'sa@x.iam.gserviceaccount.com', private_key: privateKey, project_id: 'demo' };
const json = (status, body, headers = {}) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...headers } });

// 가짜 Google API: 요청마다 handler(url, init) 를 부른다
function fakeFetch(handler) {
    const log = [];
    const f = async (url, init = {}) => {
        url = String(url); log.push({ url, method: init.method || 'GET', body: init.body });
        if (url.startsWith('https://oauth2.googleapis.com/token')) return json(200, { access_token: 'at', expires_in: 3600 });
        return handler(url, init, log);
    };
    f.log = log;
    return f;
}

// ---------------------------------------------------------------- 지적14: REST 트랜잭션 읽기 충돌 재시도
test('지적14: 트랜잭션 안 읽기가 ABORTED 면 전체 트랜잭션을 다시 한다', async () => {
    const { createGcp } = require('../../lib/zzoom/gcp');
    let gets = 0;
    const f = fakeFetch((url, init) => {
        if (url.endsWith(':beginTransaction')) return json(200, { transaction: 'tx' + Math.random() });
        if (url.endsWith(':rollback')) return json(200, {});
        if (url.endsWith(':commit')) return json(200, { writeResults: [] });
        if (init.method === 'GET' || !init.method) {
            gets++;
            if (gets === 1) return json(409, { error: { code: 409, status: 'ABORTED', message: 'Transaction lock timeout' } });
            return json(200, { name: 'projects/demo/databases/kwon/documents/a/b', fields: { n: { integerValue: '3' } } });
        }
        return json(404, {});
    });
    const g = createGcp({ serviceAccount: SA, bucket: 'b', fetchImpl: f });
    const out = await g.runTransaction(async tx => { const d = await tx.get('a/b'); tx.update('a/b', { n: d.n + 1 }); return d.n; });
    assert.equal(out, 3);
    assert.equal(f.log.filter(x => x.url.endsWith(':beginTransaction')).length, 2, '두 번 시작');
    const commit = f.log.find(x => x.url.endsWith(':commit'));
    assert.match(commit.body, /"integerValue":"4"/);
});

test('지적14: 업무 오류는 재시도하지 않고, 저장소 장애는 502/503 으로 분류된다', async () => {
    const { createGcp } = require('../../lib/zzoom/gcp');
    const f = fakeFetch(url => {
        if (url.endsWith(':beginTransaction')) return json(200, { transaction: 't' });
        if (url.endsWith(':rollback')) return json(200, {});
        return json(503, { error: { code: 503, status: 'UNAVAILABLE', message: 'down' } });
    });
    const g = createGcp({ serviceAccount: SA, bucket: 'b', fetchImpl: f });
    await assert.rejects(g.runTransaction(async () => { throw Object.assign(new Error('업무'), { status: 409, code: 'poll_open' }); }), e => e.code === 'poll_open');
    assert.equal(f.log.filter(x => x.url.endsWith(':beginTransaction')).length, 1);
    await assert.rejects(g.get('a/b'), e => e.status === 503);
});

test('지적14: REST 직렬화·페이지 넘김 계약', async () => {
    const { createGcp, enc, dec } = require('../../lib/zzoom/gcp');
    const v = { a: 1, b: 1.5, c: 'x', d: [1, 'y'], e: { f: null, g: true }, h: [] };
    assert.deepEqual(dec(enc(v)), v);
    const f = fakeFetch(url => {
        const u = new URL(url);
        if (u.pathname.endsWith('/zzoom_meetings/m1/chat')) {
            return u.searchParams.get('pageToken') === 'p2'
                ? json(200, { documents: [{ name: 'x/chat/c3', fields: { t: { stringValue: '셋' } } }] })
                : json(200, { documents: [{ name: 'x/chat/c1', fields: {} }, { name: 'x/chat/c2', fields: {} }], nextPageToken: 'p2' });
        }
        return json(404, {});
    });
    const g = createGcp({ serviceAccount: SA, bucket: 'b', fetchImpl: f });
    const p1 = await g.list('zzoom_meetings/m1/chat', { pageSize: 2 });
    assert.deepEqual(p1.docs.map(d => d.id), ['c1', 'c2']); assert.equal(p1.next, 'p2');
    const p2 = await g.list('zzoom_meetings/m1/chat', { pageSize: 2, pageToken: p1.next });
    assert.deepEqual(p2.docs, [{ id: 'c3', data: { t: '셋' } }]); assert.equal(p2.next, null);
});

// ---------------------------------------------------------------- 지적07: 기한 전파
test('지적07: scoped(기한) 어댑터는 남은 시간 안에서 네트워크 대기를 끊는다', async () => {
    const { createGcp } = require('../../lib/zzoom/gcp');
    const hang = (url, init) => new Promise((_, rej) => init.signal?.addEventListener('abort', () => rej(init.signal.reason || new Error('abort'))));
    const g = createGcp({ serviceAccount: SA, bucket: 'b', fetchImpl: fakeFetch(hang) });
    assert.equal(typeof g.scoped, 'function');
    const t0 = Date.now();
    await assert.rejects(g.scoped(Date.now() + 300).get('a/b'));
    assert.ok(Date.now() - t0 < 3000, `${Date.now() - t0}ms`);
    await assert.rejects(g.scoped(Date.now() - 1).get('a/b'), e => e.code === 'deadline');
});

test('R1-N8: 접근 토큰 발급도 남은 시간(deadline) 안에서 끊긴다', async () => {
    const { createGcp } = require('../../lib/zzoom/gcp');
    // 토큰 주소에서 멈추는 fetch(콜드 스타트에 토큰 발급이 늦는 경우)
    const hang = (url, init) => new Promise((_, rej) => init.signal?.addEventListener('abort', () => rej(init.signal.reason || new Error('abort'))));
    const g = createGcp({ serviceAccount: SA, bucket: 'b', fetchImpl: hang });
    const t0 = Date.now();
    const r = await Promise.race([g.scoped(Date.now() + 300).get('a/b').then(() => 'OK', e => e.code || 'ERR'), new Promise(res => setTimeout(() => res('HANG'), 5000))]);
    assert.notEqual(r, 'HANG', '고정 15초를 기다리지 않는다');
    assert.ok(Date.now() - t0 < 2000, `${Date.now() - t0}ms`);
});

test('지적07: Whisper 는 키를 돌아도 전체 예산을 넘기지 않는다', async () => {
    const { createWhisper } = require('../../lib/zzoom/whisper');
    const hang = (url, init) => new Promise((_, rej) => init.signal?.addEventListener('abort', () => rej(new Error('timeout'))));
    const w = createWhisper({ getKeys: () => ['k1', 'k2', 'k3'], fetchImpl: hang, budgetMs: 400 });
    const t0 = Date.now();
    const r = await Promise.race([w.transcribe({ buffer: Buffer.from('a'), mime: 'audio/webm' }), new Promise(res => setTimeout(() => res('HANG'), 4000))]);
    assert.notEqual(r, 'HANG', '예산 안에 끝나야 한다');
    assert.equal(r.ok, false);
    assert.ok(Date.now() - t0 < 2000);
});

test('추가: Whisper 429 는 다음 키로, 모든 키가 429 면 retry-after 초를 돌려준다', async () => {
    const { createWhisper } = require('../../lib/zzoom/whisper');
    const used = [];
    const f = async (url, init) => { used.push(init.headers.Authorization); return json(429, { error: { message: 'rate' } }, { 'retry-after': used.length === 1 ? '3' : '12' }); };
    const w = createWhisper({ getKeys: () => ['k1', 'k2'], fetchImpl: f });
    const r = await w.transcribe({ buffer: Buffer.from('a'), mime: 'audio/webm' });
    assert.deepEqual(used, ['Bearer k1', 'Bearer k2']);
    assert.equal(r.status, 429); assert.equal(r.retryAfter, 3, '가장 짧은 대기');
    const ok = createWhisper({ getKeys: () => ['k1', 'k2'], fetchImpl: async (u, i) => i.headers.Authorization === 'Bearer k1' ? json(429, {}) : json(200, { text: ' 안녕 ' }) });
    assert.deepEqual(await ok.transcribe({ buffer: Buffer.from('a'), mime: 'audio/webm' }), { ok: true, text: '안녕' });
});

// ---------------------------------------------------------------- 지적12: 기존 앱 출입증 기한
test('지적12: 백암이 창고 출입증에는 until(세션 만료와 1시간 중 이른 것)이 들어간다', () => {
    const st = require('../../lib/storage-token');
    const now = Date.parse('2026-11-25T00:00:00Z');
    const a = st.claimsFor({ role: 'user', expiresAt: now + 10 * 60000 }, false, now);
    assert.equal(a.claims.ba, 1); assert.equal(a.claims.until, now + 10 * 60000);
    const b = st.claimsFor({ role: 'admin', expiresAt: now + 24 * 3600000 }, false, now);
    assert.equal(b.claims.until, now + 3600000);
    const c = st.claimsFor({ role: 'admin' }, true, now);
    assert.deepEqual(c.claims, { cp: 1, until: now + 3600000 });
    const rules = require('node:fs').readFileSync(require.resolve('../../storage.rules'), 'utf8');
    const fnBody = name => rules.slice(rules.indexOf(`function ${name}(`), rules.indexOf('}', rules.indexOf(`function ${name}(`)));
    assert.match(fnBody('baekam'), /until/); assert.match(fnBody('demo'), /until/);
});

// ---------------------------------------------------------------- 지적15: 가짜 Redis 가 Lua 본문을 실제로 실행
test('지적15: 가짜 Redis 는 태그가 아니라 Lua 본문을 실행한다', async () => {
    const { createFakeRedis } = require('./fakes/fake-redis');
    const { LUA } = require('../../lib/zzoom/keys');
    const r = createFakeRedis();
    assert.equal(await r.eval('-- zz:vote\nreturn 42', ['k'], []), 42, '본문을 바꾸면 결과도 바뀐다');
    await r.hset('v', { '#status': 'open' });
    assert.equal(await r.eval(LUA.vote, ['v'], ['c1', 'o1', '김']), 1);
    assert.equal(await r.eval(LUA.vote, ['v'], ['c1', 'o2', '김']), 1);
    assert.equal(await r.hget('v', '#n:o1'), '0');
    // 판서 개수 장부 Lua: 예약 → 상한 → 되돌리기 → 쪽 지우기
    assert.ok(LUA.scReserve && LUA.scRelease && LUA.scDrop, '개수 장부 Lua 가 있다');
    const K2 = ['sc', 'scp'];
    assert.equal(await r.eval(LUA.scReserve, K2, ['3', '2', '9', 'p1', 'a_1', '0', '2']), 2);
    assert.equal(await r.eval(LUA.scReserve, K2, ['3', '2', '9', 'p1', 'a_1', '0', '1']), -2, '쪽 상한');
    assert.equal(await r.eval(LUA.scReserve, K2, ['3', '5', '9', 'p1', 'a_2', '0', '2']), -1, '회의 상한');
    assert.equal(await r.eval(LUA.scReserve, K2, ['9', '9', '2', 'p1', 'a_1', '0', '1']), -3, '사람당 쪽 상한(레드팀 RT-4)');
    assert.equal(await r.eval(LUA.scDrop, K2, ['a_1', '1']), 2);
    assert.equal(await r.hget('scp', 'a_1#0|p1'), null, '쪽 지우기는 사람 몫도 비운다');
    assert.equal(await r.eval(LUA.scRelease, K2, ['p1', 'a_1', '0', '1']), 1);
    assert.equal(await r.hget('sc', 'all'), '0', '지운 쪽의 늦은 되돌리기는 무시');
});

// 화면 순수 함수: 0번 「오늘의 안건」(agenda.js). 브라우저 없이 불러 본다.
test('agenda.js 0번 오늘의 안건: 발표 중이면 대기 화면이 펼쳐지고, 내가 0번 발표자인지 가린다', async () => {
    const { pathToFileURL } = require('node:url');
    const path = require('node:path');
    const A = await import(pathToFileURL(path.join(__dirname, '../../public/zzoom/agenda.js')).href);
    const live = { status: 'live', presenter: { cid: 'c1', epoch: 2 } };
    assert.equal(A.TODAY, '_today');
    assert.equal(A.waitMode({ meeting: live, live: { aid: null, forceSeq: 3 } }), 'full', '0번 발표 중이면 펼침');
    assert.equal(A.waitMode({ meeting: live, live: { aid: null }, dismissed: true }), 'mini', '닫아 둔 사람은 render 가 forceSeq 로 다시 펼친다');
    assert.equal(A.waitMode({ meeting: live, live: { aid: 'a1' } }), 'mini');
    assert.equal(A.presentingToday({ meeting: live, live: { aid: null }, myCid: 'c1' }), true);
    assert.equal(A.presentingToday({ meeting: live, live: { aid: 'a1' }, myCid: 'c1' }), false, '안건 발표 중');
    assert.equal(A.presentingToday({ meeting: live, live: null, myCid: 'c2' }), false, '남이 발표자');
    assert.equal(A.presentingToday({ meeting: { ...live, status: 'ready' }, live: null, myCid: 'c1' }), false, '시작 전');
    assert.deepEqual(A.confirmLines({ meeting: live, myCid: 'c2' }), [A.BUSY_TEXT, A.CONFIRM_TEXT], '남이 0번 발표 중이어도 같은 확인 글');
    assert.deepEqual(A.confirmLines({ meeting: live, myCid: 'c1' }), [A.CONFIRM_TEXT]);
});
