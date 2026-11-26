'use strict';
// Redis 키와 Lua 스크립트 (DESIGN B-5). 시험용 가짜 Redis 는 이 Lua 본문을 fengari 로 그대로 실행한다(tests/zzoom/fakes/fake-redis.js).
const { parseJson } = require('./util');

const K = {
    code: mid => `zz:code:${mid}`,                        // {hash, salt, grantVer}
    pt: h => `zz:pt:${h}`,                                // 참가 자격 {mid,cid,role,via,grantVer,exp,person,sess,at} (이름 없음)
    tryCid: (mid, cid) => `zz:try:${mid}:cid:${cid}`,
    tryIp: (mid, ip) => `zz:try:${mid}:ip:${ip}`,
    tryAll: mid => `zz:try:${mid}:all`,                  // 회의 전체 15분 창(50번이면 그 창 동안 잠금)
    tryLife: mid => `zz:try:${mid}:life`,                // 회의 평생(200번이면 관리자가 풀 때까지 잠금)
    vote: (mid, pid) => `zz:vote:${mid}:${pid}`,         // hash: cid→선택, !사람→첫 cid, #status, #n:선택→수 (이름 없음, ANON)
    up: uploadId => `zz:up:${uploadId}`,                  // 업로드 허가(24시간)
    upOpen: mid => `zz:upopen:${mid}`,                    // hash: <uploadId> → '<사람>|<발급 시각>[|h]' (확정 전 15분 허가, 감사 R2 M2·R3 P3, h = 주관자)
    uploads: 'zz:uploads',                                // hash: "<mid>/<uploadId>"→발급 시각 (commit 안 된 것)
    purge: 'zz:purge',                                    // hash: mid→대기 시작 시각
    purgeStage: mid => `zz:purge:stage:${mid}`,           // 정리 커서(단계)
    purgePages: 'zz:purge:pages',                         // hash: "<mid>|<pageKey>"→지운 뒤 epoch (옛 선 정리)
    scp: mid => `zz:scp:${mid}`,                          // hash: <pageKey>#<epoch>|<사람> → 그 사람이 그 쪽에 쓴 선 수(사람당 상한)
    sc: mid => `zz:sc:${mid}`,                            // hash: all, <pageKey>#<epoch> → 선 개수(예약 포함)
    seq: mid => `zz:seq:${mid}`,                          // hash: <pageKey> → 선 순번
    keys: mid => `zz:keys:${mid}`,                        // hash: 회의에 딸린 Redis 키 목록(정리용)
    chatBucket: mid => `zz:chatb:${mid}`,                 // hash: t(남은 칸), ts — 회의 채팅 물통(감사 R3 P2, 60초 만료)
    rl: (h, b, w) => `zz:rl:${h}:${b}:${w}`               // 속도 제한
};

// 회의에 딸린 키의 안전 만료(R1-N3): 회의 수명 10일 + 1일. 삭제(purge)와 겹친 요청이 키를 다시 만들어도 영구히 남지 않는다.
const KEEP_SEC = 11 * 24 * 3600;
const KEEP = `redis.call('EXPIRE', KEYS[1], ${KEEP_SEC})
redis.call('EXPIRE', KEYS[2], ${KEEP_SEC})`;

const LUA = {
    // INCR + 첫 증가 때 EXPIRE 를 한 번에(원자)
    incrEx: `-- zz:incr_ex
local n = redis.call('INCR', KEYS[1])
if n == 1 then redis.call('EXPIRE', KEYS[1], tonumber(ARGV[1])) end
return n`,
    // 한 표: 이전 선택 차감 → 새 선택 증가. 마감이면 -1, 같은 선택이면 0, 바뀌면 1.
    // ARGV[4] = 사람 열쇠: 같은 사람이 다른 cid(재입장)로 이미 투표했으면 -2. 장부 필드 '!<사람>' → 처음 투표한 cid.
    vote: `-- zz:vote
if redis.call('HGET', KEYS[1], '#status') ~= 'open' then return -1 end
if ARGV[4] and ARGV[4] ~= '' then
  local owner = redis.call('HGET', KEYS[1], '!' .. ARGV[4])
  if owner and owner ~= ARGV[1] then return -2 end
  if not owner then redis.call('HSET', KEYS[1], '!' .. ARGV[4], ARGV[1]) end
end
local prev = redis.call('HGET', KEYS[1], ARGV[1])
if prev == ARGV[2] then return 0 end
if prev then redis.call('HINCRBY', KEYS[1], '#n:' .. prev, -1) end
redis.call('HSET', KEYS[1], ARGV[1], ARGV[2])
redis.call('HINCRBY', KEYS[1], '#n:' .. ARGV[2], 1)
return 1`,
    // 판서 개수 장부(원자). KEYS = [sc, scp].
    // sc: 'all' = 회의 합계, '<pageKey>' = 그 쪽의 지금 epoch 선 수, '<pageKey>@e' = 그 수가 어느 epoch 것인지(없으면 0).
    // scp: '<pageKey>#<epoch>|<사람>' = 그 사람이 그 쪽(epoch)에 쓴 선 수(사람당 상한, 지워도 돌려주지 않음).
    // 예약: ARGV = 회의 상한, 쪽 상한, 사람당 쪽 상한, 사람, (pageKey, epoch, 개수)…
    // 회의 상한 -1, 쪽 상한 -2, 사람당 상한 -3, 아니면 늘리고 회의 합계. 옛 epoch 요청은 세지 않는다(저장 트랜잭션이 stale_epoch 로 거절).
    scReserve: `-- zz:sc_reserve
local maxAll, maxPage, maxPerson, who = tonumber(ARGV[1]), tonumber(ARGV[2]), tonumber(ARGV[3]), ARGV[4]
local function ep(pk) return tonumber(redis.call('HGET', KEYS[1], pk .. '@e') or '0') end
local function cnt(pk) return tonumber(redis.call('HGET', KEYS[1], pk) or '0') end
local all = tonumber(redis.call('HGET', KEYS[1], 'all') or '0')
local total = 0
for i = 5, #ARGV, 3 do
  local pk, e, n = ARGV[i], tonumber(ARGV[i + 1]), tonumber(ARGV[i + 2])
  if e >= ep(pk) then
    local cur = cnt(pk)   -- 큰 epoch 를 보내도 개수는 이어 센다(감사 R7 P1-2). 진짜 쪽 지우기는 scDrop 이 0 으로 만든다.
    if cur + n > maxPage then return -2 end
    if tonumber(redis.call('HGET', KEYS[2], pk .. '#' .. e .. '|' .. who) or '0') + n > maxPerson then return -3 end
    total = total + n
  end
end
if all + total > maxAll then return -1 end
for i = 5, #ARGV, 3 do
  local pk, e, n = ARGV[i], tonumber(ARGV[i + 1]), tonumber(ARGV[i + 2])
  local se = ep(pk)
  -- @e 는 쪽 지우기(scDrop)만 올린다. 화면이 보낸 epoch 로 올리면 장부를 비울 수 있었다(감사 R7 P1-2).
  if e >= se then
    redis.call('HINCRBY', KEYS[1], pk, n)
    redis.call('HINCRBY', KEYS[2], pk .. '#' .. e .. '|' .. who, n)
    all = all + n
  end
end
redis.call('HSET', KEYS[1], 'all', tostring(all))
${KEEP}
return all`,
    // 물통 속도 제한(원자, 감사 R3 P2). ARGV = 지금 ms, 초당 채움, 물통 크기. 한 칸을 쓰면 1, 비었으면 0.
    // 회의 채팅: 초당 15개로 채우고 30개까지 모아 둔다 — 30명이 한꺼번에 인사해도 받고, 오래 퍼붓는 도배는 초당 15개로 묶는다.
    bucket: `-- zz:bucket
local now, rate, cap = tonumber(ARGV[1]), tonumber(ARGV[2]), tonumber(ARGV[3])
local tok, ts = redis.call('HGET', KEYS[1], 't'), redis.call('HGET', KEYS[1], 'ts')
local n = cap
if tok and ts then n = math.min(cap, tonumber(tok) + math.max(0, now - tonumber(ts)) * rate / 1000) end
if n < 1 then return 0 end
redis.call('HSET', KEYS[1], 't', tostring(n - 1), 'ts', ARGV[1])
redis.call('EXPIRE', KEYS[1], 60)
return 1`,
    // 열린 업로드 허가 잡기(원자, 감사 R2 M2·R3 P3). ARGV = 지금, 허가 수명 ms, 사람, uploadId, 사람당 상한, 회의당 상한, 주관자('1').
    // 수명(15분)이 끝난 허가는 지우고 센다. 주관자 허가는 회의 상한에 넣지도 세지도 않는다(사람 상한만). 사람 상한 -1, 회의 상한 -2.
    upOpen: `-- zz:up_open
local now, life, who, id, maxMe, maxAll, host = tonumber(ARGV[1]), tonumber(ARGV[2]), ARGV[3], ARGV[4], tonumber(ARGV[5]), tonumber(ARGV[6]), ARGV[7] == '1'
local all, me = 0, 0
local h = redis.call('HGETALL', KEYS[1])
for i = 1, #h, 2 do
  local f, v = h[i], h[i + 1]
  local p, at = string.match(v, '^([^|]*)|(%d+)')
  if not at or tonumber(at) + life <= now then redis.call('HDEL', KEYS[1], f)
  else
    if string.sub(v, -2) ~= '|h' then all = all + 1 end
    if p == who then me = me + 1 end
  end
end
if me >= maxMe then return -1 end
if not host and all >= maxAll then return -2 end
redis.call('HSET', KEYS[1], id, who .. '|' .. ARGV[1] .. (host and '|h' or ''))
redis.call('EXPIRE', KEYS[1], ${KEEP_SEC})
return all + 1`,
    // 되돌리기·선 삭제(원자). ARGV = 사람(''이면 사람 몫은 그대로), (pageKey, epoch, 개수)…
    // 장부 epoch 가 같을 때만 줄인다 — 쪽 지우기로 이미 버린 epoch 는 건드리지 않는다. 0 밑으로 내려가지 않는다.
    scRelease: `-- zz:sc_release
local who = ARGV[1]
for i = 2, #ARGV, 3 do
  local pk, e, n = ARGV[i], tonumber(ARGV[i + 1]), tonumber(ARGV[i + 2])
  if tonumber(redis.call('HGET', KEYS[1], pk .. '@e') or '0') <= e then   -- 지금 epoch 이상이면 되돌림(R7 P1-2: 거절된 큰 epoch 예약도 돌려줌)
    local cur = tonumber(redis.call('HGET', KEYS[1], pk) or '0')
    local d = math.min(n, cur)
    if d > 0 then
      redis.call('HINCRBY', KEYS[1], pk, -d)
      redis.call('HINCRBY', KEYS[1], 'all', -d)
    end
    if who ~= '' then
      local f = pk .. '#' .. e .. '|' .. who
      local pc = tonumber(redis.call('HGET', KEYS[2], f) or '0')
      if pc > 0 then redis.call('HINCRBY', KEYS[2], f, -math.min(n, pc)) end
    end
  end
end
${KEEP}
return 1`,
    // 쪽 지우기(원자). ARGV = pageKey, 새 epoch. 장부가 더 옛 epoch 면 그 수를 합계에서 빼고 새 epoch 0 으로. 뺀 수를 돌려준다.
    scDrop: `-- zz:sc_drop
local pk, e = ARGV[1], tonumber(ARGV[2])
local had = 0
if tonumber(redis.call('HGET', KEYS[1], pk .. '@e') or '0') < e then
  had = tonumber(redis.call('HGET', KEYS[1], pk) or '0')
  redis.call('HSET', KEYS[1], pk, '0')
  redis.call('HSET', KEYS[1], pk .. '@e', tostring(e))
  if had ~= 0 then redis.call('HINCRBY', KEYS[1], 'all', -had) end
end
local prefix = pk .. '#'
for _, f in ipairs(redis.call('HKEYS', KEYS[2])) do
  if string.sub(f, 1, #prefix) == prefix then
    local fe = tonumber(string.match(string.sub(f, #prefix + 1), '^(%d+)|'))
    if fe and fe < e then redis.call('HDEL', KEYS[2], f) end
  end
end
${KEEP}
return had`
};

const incrEx = (redis, key, ttlSec) => redis.eval(LUA.incrEx, [key], [String(Math.max(1, Math.ceil(ttlSec)))]).then(Number);

// 회의에 딸린 키를 목록에 적어 둔다(정리 작업이 한 번에 지운다)
const remember = async (redis, mid, ...keys) => { const r = await redis.hset(K.keys(mid), Object.fromEntries(keys.map(k => [k, 1]))); await redis.expire(K.keys(mid), KEEP_SEC); return r; };

async function readJson(redis, key) { return parseJson(await redis.get(key)); }

// 원표 해시 → {status, tally, total, choices(cid→선택), names(cid→이름)}
function readVoteHash(h, options) {
    h = h || {};
    const tally = Object.fromEntries(options.map(o => [o.id, 0]));
    const choices = {}, names = {};
    for (const [f, v] of Object.entries(h)) {
        if (f.startsWith('#n:')) { const id = f.slice(3); if (id in tally) tally[id] = Math.max(0, Number(v) || 0); }
        else if (f.startsWith('@')) names[f.slice(1)] = String(v);
        else if (!f.startsWith('#') && !f.startsWith('!')) choices[f] = String(v);
    }
    const total = Object.values(tally).reduce((a, b) => a + b, 0);
    return { status: h['#status'] ? String(h['#status']) : null, tally, total, choices, names };
}

module.exports = { K, LUA, KEEP_SEC, incrEx, remember, readJson, readVoteHash };
