'use strict';
// 백암이 전체 로그인 잠금. 본관(교무실·채용·관리자 포털)·급식 관리자·메일 로그인이 같은 장부를 쓴다.
// 규칙(사용자 결정 2026-10-15):
//   · 같은 기기(브라우저)에서 10번 틀리면 그 기기를 24시간 금지
//   · 같은 IP 에서 합계 30번 틀리면 그 IP 전체를 24시간 금지(기기 ID 를 바꿔 가며 두드리는 공격 방어)
//   · 24시간이 지나면 저절로 풀리고, 관리자가 관리자 포털에서 바로 풀 수 있다
// 학교 PC 는 공인 IP 하나를 같이 쓴다. 선생님이 오타 몇 번 뒤 로그인에 성공하면 그 오타는 IP 장부에서 빼 준다 —
// 정상 사용자의 오타가 쌓여 학교 전체가 막히지 않게.
// 기록은 Redis 에 둔다(Vercel 은 서버가 여러 개 뜨고 자주 새로 떠서 메모리 장부는 금방 사라진다). Redis 가 없으면 메모리.
const DEVICE_LIMIT = 10;
const IP_LIMIT = 30;
const LOCK_MS = 24 * 60 * 60 * 1000;
const KEEP_MS = 24 * 60 * 60 * 1000;   // 마지막 실패 뒤 이만큼 지나면 장부에서 지운다
const PREFIX = 'loginguard:';
const INDEX = PREFIX + 'index';
const DEVICE_RE = /^[A-Za-z0-9_-]{16,64}$/;

function memoryStore() {
    const map = new Map(), index = new Set();
    return {
        async get(key) { const v = map.get(key); if (!v) return null; if (v.expires < Date.now()) { map.delete(key); return null; } return v.value; },
        async set(key, value, ttlMs) { map.set(key, { value, expires: Date.now() + ttlMs }); index.add(key); },
        async del(key) { map.delete(key); index.delete(key); },
        async keys() { return [...index]; }
    };
}
// Upstash REST 클라이언트(@upstash/redis). get 은 JSON 을 알아서 풀어 준다.
function redisStore(redis) {
    return {
        async get(key) { const v = await redis.get(key); return typeof v === 'string' ? JSON.parse(v) : v || null; },
        async set(key, value, ttlMs) { await redis.set(key, JSON.stringify(value), { px: ttlMs }); await redis.sadd(INDEX, key); },
        async del(key) { await redis.del(key); await redis.srem(INDEX, key); },
        async keys() { return (await redis.smembers(INDEX)) || []; }
    };
}

function createLoginGuard({ redis = null, now = () => Date.now(), deviceLimit = DEVICE_LIMIT, ipLimit = IP_LIMIT, lockMs = LOCK_MS } = {}) {
    const store = redis ? redisStore(redis) : memoryStore();
    const keyOf = (kind, id) => `${PREFIX}${kind}:${id}`;
    const deviceOf = raw => typeof raw === 'string' && DEVICE_RE.test(raw) ? raw : null;
    async function read(kind, id) { return id ? await store.get(keyOf(kind, id)) : null; }
    const lockedLeft = rec => rec?.lockedUntil && rec.lockedUntil > now() ? Math.ceil((rec.lockedUntil - now()) / 1000) : 0;

    // 로그인 전에 묻는다: 이 기기나 IP 가 금지 중인가.
    async function check({ ip, device }) {
        const dev = deviceOf(device);
        const [d, i] = await Promise.all([read('device', dev), read('ip', ip)]);
        const dl = lockedLeft(d), il = lockedLeft(i);
        if (il) return { locked: true, scope: 'ip', remainSec: il };
        if (dl) return { locked: true, scope: 'device', remainSec: dl };
        return { locked: false };
    }
    async function bump(kind, id, limit) {
        const rec = (await read(kind, id)) || { failures: 0, firstFailure: now() };
        rec.failures++; rec.lastFailure = now();
        if (rec.failures >= limit && !lockedLeft(rec)) rec.lockedUntil = now() + lockMs;
        await store.set(keyOf(kind, id), rec, Math.max(KEEP_MS, (rec.lockedUntil || 0) - now()) + 60000);
        return rec;
    }
    // 틀렸을 때. 남은 횟수와 금지 여부를 돌려준다.
    async function fail({ ip, device }) {
        const dev = deviceOf(device);
        const d = dev ? await bump('device', dev, deviceLimit) : null;
        const i = ip ? await bump('ip', ip, ipLimit) : null;
        const il = lockedLeft(i), dl = lockedLeft(d);
        const left = Math.min(d ? Math.max(0, deviceLimit - d.failures) : Infinity, i ? Math.max(0, ipLimit - i.failures) : Infinity);
        return { locked: !!(il || dl), scope: il ? 'ip' : dl ? 'device' : null, remainSec: il || dl || 0, left: Number.isFinite(left) ? left : null };
    }
    // 맞았을 때: 이 기기의 실패 기록을 지우고, 그만큼 IP 장부에서도 뺀다.
    async function success({ ip, device }) {
        const dev = deviceOf(device);
        const d = await read('device', dev);
        if (d) await store.del(keyOf('device', dev));
        const i = await read('ip', ip);
        if (i && d && !lockedLeft(i)) {
            i.failures = Math.max(0, i.failures - d.failures);
            if (i.failures === 0) await store.del(keyOf('ip', ip));
            else await store.set(keyOf('ip', ip), i, KEEP_MS);
        }
    }
    // 관리자 포털: 지금 금지 중이거나 실패가 쌓인 기록.
    async function list() {
        const out = [];
        for (const key of await store.keys()) {
            const rec = await store.get(key);
            if (!rec) { await store.del(key); continue; }
            const [kind, ...rest] = key.slice(PREFIX.length).split(':');   // IPv6 주소에도 ':' 가 있다
            out.push({ key, kind, id: kind === 'device' ? rest.join(':').slice(0, 8) + '…' : rest.join(':'), failures: rec.failures, lastFailure: rec.lastFailure, lockedUntil: lockedLeft(rec) ? rec.lockedUntil : null });
        }
        return out.sort((a, b) => (b.lockedUntil ? 1 : 0) - (a.lockedUntil ? 1 : 0) || b.lastFailure - a.lastFailure);
    }
    async function unlock(key) {
        if (typeof key !== 'string' || !key.startsWith(PREFIX + 'device:') && !key.startsWith(PREFIX + 'ip:')) return false;
        await store.del(key); return true;
    }
    return { check, fail, success, list, unlock, deviceOf };
}
// 화면에 보여 줄 문구.
function lockMessage(r) {
    const h = Math.floor(r.remainSec / 3600), m = Math.ceil((r.remainSec % 3600) / 60);
    const left = h ? `${h}시간 ${m}분` : `${m}분`;
    return r.scope === 'ip'
        ? `이 네트워크에서 로그인 실패가 너무 많아 ${left} 동안 로그인이 금지되었습니다. 관리자에게 해제를 요청하세요.`
        : `이 기기에서 로그인을 10번 틀려 ${left} 동안 로그인이 금지되었습니다. 관리자에게 해제를 요청하세요.`;
}
module.exports = { createLoginGuard, lockMessage, DEVICE_LIMIT, IP_LIMIT };
