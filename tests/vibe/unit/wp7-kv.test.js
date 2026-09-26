import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createMemoryKv, createUpstashKv, LUA_CAS_JSON, LUA_ZACQUIRE, KEY_PREFIX } from '../../../lib/vibe/kv/index.js';
import { createRateLimiter } from '../../../lib/vibe/http/limits.js';
import { signToken, verifyToken, normalizeInviteCode, newInviteCode } from '../../../lib/vibe/auth/tokens.js';

test('메모리 KV: 접두어·TTL·nx·casJson·크기 제한', async () => {
  const clock = { t: 0 };
  const kv = createMemoryKv({ now: () => clock.t });
  assert.equal(await kv.set('a', { v: 1 }, { ttlMs: 100 }), true);
  assert.equal(await kv.set('a', { v: 2 }, { nx: true }), false);
  assert.ok(kv._keys().every(k => k.startsWith(KEY_PREFIX)));
  clock.t = 150;
  assert.equal(await kv.get('a'), null);

  assert.deepEqual(await kv.casJson('p', null, { revision: 0 }), { ok: true });
  assert.equal((await kv.casJson('p', null, { revision: 0 })).ok, false);
  assert.equal((await kv.casJson('p', 1, { revision: 2 })).ok, false);
  const races = await Promise.all([kv.casJson('p', 0, { revision: 1, w: 'x' }), kv.casJson('p', 0, { revision: 1, w: 'y' })]);
  assert.equal(races.filter(r => r.ok).length, 1);

  await assert.rejects(kv.set('big', { s: 'x'.repeat(400 * 1024) }), e => e.code === 'KV_VALUE_TOO_LARGE');
  const got = await kv.get('p'); got.w = 'mutated';
  assert.notEqual((await kv.get('p')).w, 'mutated', '반환값은 복사본');
});

test('메모리 KV: zAcquire는 만료 멤버를 치우고 limit을 지킨다', async () => {
  const kv = createMemoryKv();
  const r = await Promise.all([1, 2, 3].map(i => kv.zAcquire('s', 'm' + i, 2, 100, 200)));
  assert.equal(r.filter(Boolean).length, 2);
  assert.equal(await kv.zAcquire('s', 'm9', 2, 250, 400), true, '만료 후 획득');
});

test('슬라이딩 윈도우: 학생별 독립, 윈도우 경과 후 회복', async () => {
  const clock = { t: 60_000 * 10 };
  const kv = createMemoryKv({ now: () => clock.t });
  const rl = createRateLimiter(kv, { now: () => clock.t });
  const rule = id => [{ scope: 'student', id, limit: 3, windowMs: 60_000 }];
  for (let i = 0; i < 3; i++) assert.equal((await rl.hit(rule('a'))).ok, true);
  const denied = await rl.hit(rule('a'));
  assert.equal(denied.ok, false); assert.ok(denied.retryAfterMs >= 100);
  assert.equal((await rl.hit(rule('b'))).ok, true);
  clock.t += 125_000;
  assert.equal((await rl.hit(rule('a'))).ok, true);
});

test('토큰: 서명·만료·변조 검출, 초대 코드 형식', () => {
  const s = 'x'.repeat(40);
  const t = signToken(s, { typ: 's', sid: 's_1', exp: 1000 });
  assert.equal(verifyToken(s, t, 999).sid, 's_1');
  assert.equal(verifyToken(s, t, 1000), null);
  assert.equal(verifyToken('y'.repeat(40), t, 0), null);
  const [b, sig] = t.split('.');
  const forged = Buffer.from(JSON.stringify({ typ: 's', sid: 's_2', exp: 1000 })).toString('base64url');
  assert.equal(verifyToken(s, forged + '.' + sig, 0), null);
  assert.ok(b);
  for (let i = 0; i < 50; i++) assert.ok(normalizeInviteCode(newInviteCode()));
  assert.equal(normalizeInviteCode('ab1-3cd'), null, 'I/O/L/0/1 제외 알파벳만');
  assert.equal(normalizeInviteCode('ab 3cde'), 'AB3CDE');
});

test('Upstash 어댑터: 키 접두어·Lua 인자 배선 (가짜 redis, 실제 Redis 미검증)', async () => {
  const calls = [];
  const fake = {
    async eval(script, keys, args) { calls.push({ script, keys, args }); return script === LUA_CAS_JSON ? [0, '{"revision":7}'] : 1; },
    async get(k) { calls.push({ get: k }); return '{"revision":7}'; },
    async set(k, v, o) { calls.push({ set: k, v, o }); return 'OK'; },
  };
  const kv = createUpstashKv(fake);
  const r = await kv.casJson('proj:p_1', 6, { revision: 7 }, { ttlMs: 1000 });
  assert.deepEqual(r, { ok: false, current: { revision: 7 } });
  assert.deepEqual(calls[0].keys, ['vibe2:proj:p_1']);
  assert.deepEqual(calls[0].args, ['6', '{"revision":7}', '1000']);
  assert.deepEqual(await kv.get('x'), { revision: 7 });
  assert.equal(await kv.set('y', { a: 1 }, { nx: true, ttlMs: 50 }), true);
  assert.deepEqual(calls.at(-1).o, { px: 50, nx: true });
  assert.equal(await kv.zAcquire('slot:x', 'tok', 4, 10, 20), true);
  assert.equal(calls.at(-1).script, LUA_ZACQUIRE);
  assert.match(LUA_CAS_JSON, /cjson\.decode/);
});
