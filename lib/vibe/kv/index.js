// KV 추상화 — 메모리(테스트·로컬 파일 모드)와 Upstash Redis가 같은 인터페이스를 가진다.
// 모든 키에 `vibe2:` 접두어를 붙인다. 컬렉션 전체를 한 키에 병합 저장하지 않는다(키 단위 저장).
//
// 인터페이스 (전부 async):
//   get(key)                                   → 값 | null
//   set(key, value, {ttlMs?, nx?})             → boolean (nx 실패 시 false)
//   del(...keys)                               → 지운 수
//   incrWithTtl(key, ttlMs)                    → 증가 후 값 (첫 증가 때 TTL 설정, 원자적)
//   expire(key, ttlMs)                         → boolean
//   casJson(key, expectedRevision, next, {ttlMs?})
//        → {ok:true} | {ok:false, current}
//        저장된 JSON의 `revision` 필드가 expectedRevision과 같을 때만 기록(null = 키가 없어야 함). 원자적.
//   zadd(key, score, member) / zrem(key, member) / zcard(key) / zrange(key, start, stop)
//   zrangeByScore(key, min, max, {offset?, count?})
//   zAcquire(key, member, limit, nowMs, expireAtMs) → boolean
//        score(=만료 시각) ≤ now 인 멤버를 지우고, 남은 수가 limit 미만이면 member 추가. 원자적 (동시 실행 슬롯용).
//   zExtend(key, member, expireAtMs)           → boolean (멤버가 있을 때만 갱신)
//   valueBytes(value)                          → 직렬화 크기

export const KEY_PREFIX = 'vibe2:';
export const MAX_VALUE_BYTES = 320 * 1024; // 프로젝트 256KB + 봉투 여유분. 이보다 큰 값은 저장 거부.

const enc = new TextEncoder();
export function valueBytes(v) { return enc.encode(JSON.stringify(v)).length; }

function tooLarge(key, bytes) {
  const e = new Error(`kv value too large (${bytes} bytes) for ${key}`);
  e.code = 'KV_VALUE_TOO_LARGE';
  return e;
}

// ───────────────────────── 메모리 ─────────────────────────

/**
 * @param {{ now?: () => number, maxValueBytes?: number }} [opts]
 */
export function createMemoryKv(opts = {}) {
  const now = opts.now || Date.now;
  const maxBytes = opts.maxValueBytes || MAX_VALUE_BYTES;
  /** @type {Map<string, {v:any, exp:number|null}>} */
  const data = new Map();
  /** @type {Map<string, {m:Map<string,number>, exp:number|null}>} */
  const zsets = new Map();
  const k = key => KEY_PREFIX + key;
  const clone = v => (v === undefined ? null : JSON.parse(JSON.stringify(v)));
  // 실제 네트워크처럼 호출마다 한 번 양보해 경쟁 상태를 드러낸다. 각 연산 본체는 동기라 원자적이다.
  const tick = () => new Promise(r => setImmediate(r));

  function live(key) {
    const e = data.get(key);
    if (!e) return null;
    if (e.exp !== null && e.exp <= now()) { data.delete(key); return null; }
    return e;
  }
  function zlive(key) {
    const e = zsets.get(key);
    if (!e) return null;
    if (e.exp !== null && e.exp <= now()) { zsets.delete(key); return null; }
    return e;
  }
  function zget(key, create) {
    let e = zlive(key);
    if (!e && create) { e = { m: new Map(), exp: null }; zsets.set(key, e); }
    return e;
  }
  function sorted(e) {
    return [...e.m.entries()].sort((a, b) => a[1] - b[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
  }
  function put(key, value, ttlMs) {
    const bytes = valueBytes(value);
    if (bytes > maxBytes) throw tooLarge(key, bytes);
    data.set(key, { v: clone(value), exp: ttlMs ? now() + ttlMs : null });
  }

  return {
    kind: 'memory',
    async get(key) { await tick(); const e = live(k(key)); return e ? clone(e.v) : null; },
    async set(key, value, o = {}) {
      await tick();
      const kk = k(key);
      if (o.nx && live(kk)) return false;
      put(kk, value, o.ttlMs);
      return true;
    },
    async del(...keys) {
      await tick();
      let n = 0;
      for (const key of keys) { if (data.delete(k(key))) n++; if (zsets.delete(k(key))) n++; }
      return n;
    },
    async incrWithTtl(key, ttlMs) {
      await tick();
      const kk = k(key);
      const e = live(kk);
      const n = (e ? Number(e.v) || 0 : 0) + 1;
      data.set(kk, { v: n, exp: e ? e.exp : (ttlMs ? now() + ttlMs : null) });
      return n;
    },
    async expire(key, ttlMs) {
      await tick();
      const e = live(k(key)) || zlive(k(key));
      if (!e) return false;
      e.exp = now() + ttlMs;
      return true;
    },
    async casJson(key, expectedRevision, next, o = {}) {
      await tick();
      const kk = k(key);
      const e = live(kk);
      if (expectedRevision === null) {
        if (e) return { ok: false, current: clone(e.v) };
      } else if (!e || e.v?.revision !== expectedRevision) {
        return { ok: false, current: e ? clone(e.v) : null };
      }
      put(kk, next, o.ttlMs);
      return { ok: true };
    },
    async zadd(key, score, member) { await tick(); zget(k(key), true).m.set(String(member), Number(score)); return true; },
    async zrem(key, member) { await tick(); const e = zget(k(key)); return e ? (e.m.delete(String(member)) ? 1 : 0) : 0; },
    async zcard(key) { await tick(); return zget(k(key))?.m.size || 0; },
    async zrange(key, start, stop) {
      await tick();
      const e = zget(k(key)); if (!e) return [];
      const arr = sorted(e).map(x => x[0]);
      const end = stop < 0 ? arr.length + stop : stop;
      return arr.slice(start, end + 1);
    },
    async zrangeByScore(key, min, max, o = {}) {
      await tick();
      const e = zget(k(key)); if (!e) return [];
      const arr = sorted(e).filter(([, s]) => s >= min && s <= max).map(x => x[0]);
      const off = o.offset || 0;
      return o.count === undefined ? arr.slice(off) : arr.slice(off, off + o.count);
    },
    async zAcquire(key, member, limit, nowMs, expireAtMs) {
      await tick();
      const e = zget(k(key), true);
      for (const [m, s] of e.m) if (s <= nowMs) e.m.delete(m);
      if (e.m.has(String(member))) { e.m.set(String(member), expireAtMs); return true; }
      if (e.m.size >= limit) return false;
      e.m.set(String(member), expireAtMs);
      return true;
    },
    async zExtend(key, member, expireAtMs) {
      await tick();
      const e = zget(k(key));
      if (!e || !e.m.has(String(member))) return false;
      e.m.set(String(member), expireAtMs);
      return true;
    },
    /** 테스트 전용: 저장된 원시 키 목록 */
    _keys() { return [...data.keys(), ...zsets.keys()]; },
  };
}

// ───────────────────────── Upstash ─────────────────────────
// ⚠ 실제 Upstash에서 아직 검증하지 않았다(개발 환경에 비운영 Redis 없음). Lua 스크립트는 리뷰용으로 아래에 그대로 둔다.
// 권장: `new Redis({ url, token, automaticDeserialization: false })` 인스턴스를 넘긴다. true여도 parse()가 양쪽을 처리한다.

/** KEYS[1]=key, ARGV[1]=expectedRevision('' = 키가 없어야 함), ARGV[2]=다음 JSON, ARGV[3]=ttlMs('' = 무기한)
 *  반환 {1} 성공 | {0, 현재값 or ''} 실패 */
export const LUA_CAS_JSON = `
local cur = redis.call('GET', KEYS[1])
if ARGV[1] == '' then
  if cur then return {0, cur} end
else
  if not cur then return {0, ''} end
  local ok, obj = pcall(cjson.decode, cur)
  if (not ok) or type(obj) ~= 'table' or obj.revision == nil or tostring(obj.revision) ~= ARGV[1] then
    return {0, cur}
  end
end
if ARGV[3] ~= '' then
  redis.call('SET', KEYS[1], ARGV[2], 'PX', tonumber(ARGV[3]))
else
  redis.call('SET', KEYS[1], ARGV[2])
end
return {1}
`;

/** KEYS[1]=key, ARGV[1]=ttlMs → 증가 후 값. 첫 증가(=1)일 때만 PEXPIRE. */
export const LUA_INCR_TTL = `
local n = redis.call('INCR', KEYS[1])
if n == 1 and tonumber(ARGV[1]) > 0 then redis.call('PEXPIRE', KEYS[1], tonumber(ARGV[1])) end
return n
`;

/** KEYS[1]=zset, ARGV[1]=member, ARGV[2]=limit, ARGV[3]=nowMs, ARGV[4]=expireAtMs → 1 획득 | 0 거부 */
export const LUA_ZACQUIRE = `
redis.call('ZREMRANGEBYSCORE', KEYS[1], '-inf', tonumber(ARGV[3]))
if redis.call('ZSCORE', KEYS[1], ARGV[1]) then
  redis.call('ZADD', KEYS[1], tonumber(ARGV[4]), ARGV[1])
  return 1
end
if redis.call('ZCARD', KEYS[1]) >= tonumber(ARGV[2]) then return 0 end
redis.call('ZADD', KEYS[1], tonumber(ARGV[4]), ARGV[1])
redis.call('PEXPIRE', KEYS[1], math.max(1000, tonumber(ARGV[4]) - tonumber(ARGV[3]) + 60000))
return 1
`;

/** KEYS[1]=zset, ARGV[1]=member, ARGV[2]=expireAtMs → 멤버가 있을 때만 갱신 */
export const LUA_ZEXTEND = `
if redis.call('ZSCORE', KEYS[1], ARGV[1]) then
  redis.call('ZADD', KEYS[1], 'XX', tonumber(ARGV[2]), ARGV[1])
  return 1
end
return 0
`;

function parse(v) {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v !== 'string') return v;
  try { return JSON.parse(v); } catch { return v; }
}

/**
 * @param {import('@upstash/redis').Redis} redis
 * @param {{ maxValueBytes?: number }} [opts]
 */
export function createUpstashKv(redis, opts = {}) {
  if (!redis) throw new Error('createUpstashKv: redis instance required');
  const maxBytes = opts.maxValueBytes || MAX_VALUE_BYTES;
  const k = key => KEY_PREFIX + key;
  const ser = (key, v) => {
    const s = JSON.stringify(v);
    const bytes = Buffer.byteLength(s);
    if (bytes > maxBytes) throw tooLarge(key, bytes);
    return s;
  };

  return {
    kind: 'upstash',
    async get(key) { return parse(await redis.get(k(key))); },
    async set(key, value, o = {}) {
      const args = {};
      if (o.ttlMs) args.px = Math.max(1, Math.round(o.ttlMs));
      if (o.nx) args.nx = true;
      const r = await redis.set(k(key), ser(key, value), args);
      return r === 'OK' || r === true;
    },
    async del(...keys) { return keys.length ? redis.del(...keys.map(k)) : 0; },
    async incrWithTtl(key, ttlMs) { return Number(await redis.eval(LUA_INCR_TTL, [k(key)], [String(Math.round(ttlMs || 0))])); },
    async expire(key, ttlMs) { return Boolean(await redis.pexpire(k(key), Math.round(ttlMs))); },
    async casJson(key, expectedRevision, next, o = {}) {
      const r = await redis.eval(LUA_CAS_JSON, [k(key)], [
        expectedRevision === null ? '' : String(expectedRevision),
        ser(key, next),
        o.ttlMs ? String(Math.round(o.ttlMs)) : '',
      ]);
      const arr = Array.isArray(r) ? r : [r];
      if (Number(arr[0]) === 1) return { ok: true };
      return { ok: false, current: parse(arr[1]) };
    },
    async zadd(key, score, member) { await redis.zadd(k(key), { score: Number(score), member: String(member) }); return true; },
    async zrem(key, member) { return redis.zrem(k(key), String(member)); },
    async zcard(key) { return Number(await redis.zcard(k(key))); },
    async zrange(key, start, stop) { return (await redis.zrange(k(key), start, stop)).map(String); },
    async zrangeByScore(key, min, max, o = {}) {
      const extra = { byScore: true };
      if (o.count !== undefined) { extra.offset = o.offset || 0; extra.count = o.count; }
      return (await redis.zrange(k(key), min, max, extra)).map(String);
    },
    async zAcquire(key, member, limit, nowMs, expireAtMs) {
      return Number(await redis.eval(LUA_ZACQUIRE, [k(key)], [String(member), String(limit), String(nowMs), String(expireAtMs)])) === 1;
    },
    async zExtend(key, member, expireAtMs) {
      return Number(await redis.eval(LUA_ZEXTEND, [k(key)], [String(member), String(expireAtMs)])) === 1;
    },
  };
}
