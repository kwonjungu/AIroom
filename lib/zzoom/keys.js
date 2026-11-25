'use strict';
// Redis 키와 Lua 스크립트 (DESIGN B-5). 스크립트 첫 줄의 태그(-- zz:이름)는 시험용 가짜 Redis 가 알아보는 표시다. 지우지 말 것.
const { parseJson } = require('./util');

const K = {
    code: mid => `zz:code:${mid}`,                        // {hash, salt, grantVer}
    pt: h => `zz:pt:${h}`,                                // 참가 자격 {mid,cid,name,role,via,grantVer,exp}
    tryCid: (mid, cid) => `zz:try:${mid}:cid:${cid}`,
    tryIp: (mid, ip) => `zz:try:${mid}:ip:${ip}`,
    tryAll: mid => `zz:try:${mid}:all`,
    vote: (mid, pid) => `zz:vote:${mid}:${pid}`,         // hash: cid→선택, @cid→이름, #status, #n:선택→수
    up: uploadId => `zz:up:${uploadId}`,                  // 업로드 허가(24시간)
    uploads: 'zz:uploads',                                // hash: "<mid>/<uploadId>"→발급 시각 (commit 안 된 것)
    purge: 'zz:purge',                                    // hash: mid→대기 시작 시각
    purgeStage: mid => `zz:purge:stage:${mid}`,           // 정리 커서(단계)
    purgePages: 'zz:purge:pages',                         // hash: "<mid>|<pageKey>"→지운 뒤 epoch (옛 선 정리)
    sc: mid => `zz:sc:${mid}`,                            // hash: all, <pageKey> → 선 개수
    seq: mid => `zz:seq:${mid}`,                          // hash: <pageKey> → 선 순번
    keys: mid => `zz:keys:${mid}`,                        // hash: 회의에 딸린 Redis 키 목록(정리용)
    rl: (h, b, w) => `zz:rl:${h}:${b}:${w}`               // 속도 제한
};

const LUA = {
    // INCR + 첫 증가 때 EXPIRE 를 한 번에(원자)
    incrEx: `-- zz:incr_ex
local n = redis.call('INCR', KEYS[1])
if n == 1 then redis.call('EXPIRE', KEYS[1], tonumber(ARGV[1])) end
return n`,
    // 한 표: 이전 선택 차감 → 새 선택 증가. 마감이면 -1, 같은 선택이면 0, 바뀌면 1
    vote: `-- zz:vote
if redis.call('HGET', KEYS[1], '#status') ~= 'open' then return -1 end
local prev = redis.call('HGET', KEYS[1], ARGV[1])
redis.call('HSET', KEYS[1], '@' .. ARGV[1], ARGV[3])
if prev == ARGV[2] then return 0 end
if prev then redis.call('HINCRBY', KEYS[1], '#n:' .. prev, -1) end
redis.call('HSET', KEYS[1], ARGV[1], ARGV[2])
redis.call('HINCRBY', KEYS[1], '#n:' .. ARGV[2], 1)
return 1`
};

const incrEx = (redis, key, ttlSec) => redis.eval(LUA.incrEx, [key], [String(Math.max(1, Math.ceil(ttlSec)))]).then(Number);

// 회의에 딸린 키를 목록에 적어 둔다(정리 작업이 한 번에 지운다)
const remember = (redis, mid, ...keys) => redis.hset(K.keys(mid), Object.fromEntries(keys.map(k => [k, 1])));

async function readJson(redis, key) { return parseJson(await redis.get(key)); }

// 원표 해시 → {status, tally, total, choices(cid→선택), names(cid→이름)}
function readVoteHash(h, options) {
    h = h || {};
    const tally = Object.fromEntries(options.map(o => [o.id, 0]));
    const choices = {}, names = {};
    for (const [f, v] of Object.entries(h)) {
        if (f.startsWith('#n:')) { const id = f.slice(3); if (id in tally) tally[id] = Math.max(0, Number(v) || 0); }
        else if (f.startsWith('@')) names[f.slice(1)] = String(v);
        else if (!f.startsWith('#')) choices[f] = String(v);
    }
    const total = Object.values(tally).reduce((a, b) => a + b, 0);
    return { status: h['#status'] ? String(h['#status']) : null, tally, total, choices, names };
}

module.exports = { K, LUA, incrEx, remember, readJson, readVoteHash };
