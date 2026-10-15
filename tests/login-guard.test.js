'use strict';
// 백암이 전체 로그인 잠금: 기기 10회 · IP 30회 실패 → 24시간 금지, 관리자 해제, 성공하면 그 기기 오타는 IP 장부에서 뺀다.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createLoginGuard, lockMessage } = require('../lib/login-guard');

const dev = n => `device-${String(n).padStart(12, '0')}`;
function clock() { let t = Date.parse('2026-10-15T09:00:00+09:00'); return { now: () => t, add: ms => { t += ms; } }; }

test('같은 기기 10번째 실패에서 금지, 24시간 뒤 저절로 풀린다', async () => {
    const c = clock(), g = createLoginGuard({ now: c.now }), who = { ip: '1.1.1.1', device: dev(1) };
    for (let i = 1; i <= 9; i++) assert.equal((await g.fail(who)).locked, false, `${i}번째`);
    assert.equal((await g.check(who)).locked, false);
    const tenth = await g.fail(who);
    assert.equal(tenth.locked, true); assert.equal(tenth.scope, 'device');
    assert.equal((await g.check(who)).locked, true);
    assert.equal((await g.check({ ip: '1.1.1.1', device: dev(2) })).locked, false, '같은 학교 다른 PC 는 그대로');
    c.add(24 * 60 * 60 * 1000 - 1000); assert.equal((await g.check(who)).locked, true);
    c.add(2000); assert.equal((await g.check(who)).locked, false, '24시간 뒤 해제');
});

test('기기 ID 를 바꿔 가며 두드려도 같은 IP 합계 30번이면 IP 전체 금지', async () => {
    const g = createLoginGuard();
    for (let i = 0; i < 29; i++) assert.equal((await g.fail({ ip: '2.2.2.2', device: dev(100 + i) })).locked, false);
    const r = await g.fail({ ip: '2.2.2.2', device: dev(999) });
    assert.equal(r.locked, true); assert.equal(r.scope, 'ip');
    assert.equal((await g.check({ ip: '2.2.2.2', device: dev(5000) })).locked, true, '새 기기도 막힘');
    assert.equal((await g.check({ ip: '2.2.2.2' })).locked, true, '기기 ID 없이도 막힘');
    assert.equal((await g.check({ ip: '3.3.3.3', device: dev(1) })).locked, false, '다른 네트워크는 그대로');
});

test('로그인에 성공하면 그 기기의 오타는 IP 장부에서 빠진다(선생님 오타가 쌓여 학교가 막히지 않게)', async () => {
    const g = createLoginGuard();
    for (let t = 0; t < 20; t++) {           // 선생님 20명이 오타 3번씩 내고 결국 성공
        const who = { ip: '4.4.4.4', device: dev(t) };
        for (let i = 0; i < 3; i++) await g.fail(who);
        await g.success(who);
    }
    assert.equal((await g.check({ ip: '4.4.4.4', device: dev(77) })).locked, false);
    const ipRec = (await g.list()).find(x => x.kind === 'ip');
    assert.equal(ipRec, undefined, '성공한 오타는 모두 빠짐');
});

test('기기 ID 형식이 이상하면 IP 로만 센다', async () => {
    const g = createLoginGuard();
    await g.fail({ ip: '5.5.5.5', device: '<script>' });
    const items = await g.list();
    assert.deepEqual(items.map(x => x.kind), ['ip']);
});

test('관리자 해제: 목록에 금지 기록이 먼저 나오고, 해제하면 바로 로그인할 수 있다', async () => {
    const g = createLoginGuard(), who = { ip: '6.6.6.6', device: dev(6) };
    for (let i = 0; i < 10; i++) await g.fail(who);
    const items = await g.list();
    const locked = items.find(x => x.lockedUntil);
    assert.equal(locked.kind, 'device'); assert.ok(locked.id.endsWith('…'), '기기 ID 는 앞부분만');
    assert.equal(await g.unlock(locked.key), true);
    assert.equal((await g.check(who)).locked, false);
    assert.equal(await g.unlock('session:abc'), false, '잠금 장부가 아닌 키는 지우지 않는다');
});

test('금지 문구: 기기 / 네트워크를 구분해 남은 시간을 알려 준다', () => {
    assert.match(lockMessage({ scope: 'device', remainSec: 24 * 3600 }), /이 기기에서 로그인을 10번 틀려 24시간 0분/);
    assert.match(lockMessage({ scope: 'ip', remainSec: 90 }), /이 네트워크에서 .* 2분 동안/);
});

test('Redis 저장소: 같은 규칙이 Upstash 클라이언트 위에서도 돈다', async () => {
    // @upstash/redis 의 쓰는 부분만 흉내 낸다(get 은 JSON 을 풀어서 돌려준다).
    const kv = new Map(), sets = new Map();
    const redis = {
        async get(k) { const v = kv.get(k); return v === undefined ? null : JSON.parse(v); },
        async set(k, v, opt) { assert.ok(opt.px > 0, 'TTL 을 준다'); kv.set(k, v); },
        async del(k) { kv.delete(k); }, async sadd(k, m) { (sets.get(k) || sets.set(k, new Set()).get(k)).add(m); },
        async srem(k, m) { sets.get(k)?.delete(m); }, async smembers(k) { return [...(sets.get(k) || [])]; }
    };
    const g = createLoginGuard({ redis }), who = { ip: '7.7.7.7', device: dev(7) };
    for (let i = 0; i < 10; i++) await g.fail(who);
    assert.equal((await g.check(who)).locked, true);
    assert.equal((await createLoginGuard({ redis }).check(who)).locked, true, '다른 서버 인스턴스에서도 금지가 보인다');
});
