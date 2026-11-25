'use strict';
// 시험용 메모리 Redis — Upstash 클라이언트 모양(get/set/del/incr/expire/h*/eval).
// eval 은 lib/zzoom/keys.js 스크립트 첫 줄 태그(-- zz:이름)를 보고 같은 동작을 JS 로 한다. 한 번에 하나씩(원자).
function createFakeRedis({ now = Date.now } = {}) {
    const data = new Map();   // key → {v, exp}
    const calls = { n: 0 };
    let down = false;
    const live = k => { const e = data.get(k); if (!e) return null; if (e.exp && e.exp <= now()) { data.delete(k); return null; } return e; };
    const hash = k => { const e = live(k); if (e && !(e.v instanceof Map)) throw new Error('WRONGTYPE'); if (e) return e.v; const m = new Map(); data.set(k, { v: m, exp: 0 }); return m; };
    const touch = () => { calls.n++; if (down) throw new Error('fake redis down'); };
    const api = {
        calls, data,
        setDown(v) { down = v; },
        async get(k) { touch(); const e = live(k); return e ? e.v : null; },
        async set(k, v, o = {}) { touch(); if (o.nx && live(k)) return null; data.set(k, { v: typeof v === 'string' ? v : JSON.stringify(v), exp: o.ex ? now() + o.ex * 1000 : 0 }); return 'OK'; },
        async del(...ks) { touch(); let n = 0; for (const k of ks) if (data.delete(k)) n++; return n; },
        async incr(k) { touch(); const e = live(k); const n = (e ? Number(e.v) : 0) + 1; data.set(k, { v: String(n), exp: e?.exp || 0 }); return n; },
        async decr(k) { touch(); const e = live(k); const n = (e ? Number(e.v) : 0) - 1; data.set(k, { v: String(n), exp: e?.exp || 0 }); return n; },
        async expire(k, s) { touch(); const e = live(k); if (!e) return 0; e.exp = now() + s * 1000; return 1; },
        async hset(k, obj) { touch(); const h = hash(k); for (const [f, v] of Object.entries(obj)) h.set(f, String(v)); return Object.keys(obj).length; },
        async hget(k, f) { touch(); const e = live(k); return e && e.v.has(f) ? e.v.get(f) : null; },
        async hgetall(k) { touch(); const e = live(k); if (!e || !e.v.size) return null; return Object.fromEntries(e.v); },
        async hdel(k, ...fs) { touch(); const e = live(k); if (!e) return 0; let n = 0; for (const f of fs) if (e.v.delete(f)) n++; return n; },
        async hincrby(k, f, by) { touch(); const h = hash(k); const n = Number(h.get(f) || 0) + Number(by); h.set(f, String(n)); return n; },
        async eval(script, keys, args) {
            touch();
            const tag = /^-- zz:(\w+)/.exec(script)?.[1];
            if (tag === 'incr_ex') {
                const e = live(keys[0]); const n = (e ? Number(e.v) : 0) + 1;
                data.set(keys[0], { v: String(n), exp: e ? e.exp : now() + Number(args[0]) * 1000 });
                return n;
            }
            if (tag === 'vote') {
                const e = live(keys[0]);
                if (!e || e.v.get('#status') !== 'open') return -1;
                const h = e.v, [cid, opt, name] = args;
                const prev = h.has(cid) ? h.get(cid) : null;
                h.set('@' + cid, name);
                if (prev === opt) return 0;
                if (prev) h.set('#n:' + prev, String(Number(h.get('#n:' + prev) || 0) - 1));
                h.set(cid, opt);
                h.set('#n:' + opt, String(Number(h.get('#n:' + opt) || 0) + 1));
                return 1;
            }
            throw new Error('fake redis: 모르는 스크립트 ' + tag);
        },
        keysLike(re) { return [...data.keys()].filter(k => live(k) && re.test(k)); }
    };
    return api;
}
module.exports = { createFakeRedis };
