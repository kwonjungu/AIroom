'use strict';
// 시험용 메모리 Redis — Upstash 클라이언트 모양(get/set/del/incr/expire/h*/eval).
// eval 은 lib/zzoom/keys.js 의 Lua 본문을 fengari(Lua 5.3, 순수 JS)로 **그대로 실행**한다(감사 15).
// redis.call 은 아래 동기 명령표로 이어진다. 한 번에 하나씩(원자).
const { lua, lauxlib, lualib, to_luastring, to_jsstring } = require('fengari');

function createFakeRedis({ now = Date.now } = {}) {
    const data = new Map();   // key → {v, exp}
    const calls = { n: 0, evals: [] };
    let down = false;
    const failing = new Map(); // 명령 이름 → 남은 실패 횟수
    const live = k => { const e = data.get(k); if (!e) return null; if (e.exp && e.exp <= now()) { data.delete(k); return null; } return e; };
    const hash = k => { const e = live(k); if (e && !(e.v instanceof Map)) throw new Error('WRONGTYPE'); if (e) return e.v; const m = new Map(); data.set(k, { v: m, exp: 0 }); return m; };
    const touch = name => {
        calls.n++;
        if (down) throw new Error('fake redis down');
        const n = failing.get(name);
        if (n) { failing.set(name, n - 1); throw new Error('fake redis ' + name + ' 실패'); }
    };

    // ---- 동기 명령(값 규칙은 Redis 와 같다: 없는 값은 null) ----
    const cmd = {
        get(k) { const e = live(k); return e ? e.v : null; },
        set(k, v, o = {}) { if (o.nx && live(k)) return null; data.set(k, { v: typeof v === 'string' ? v : JSON.stringify(v), exp: o.ex ? now() + o.ex * 1000 : 0 }); return 'OK'; },
        del(...ks) { let n = 0; for (const k of ks) if (data.delete(k)) n++; return n; },
        incr(k) { const e = live(k); const n = (e ? Number(e.v) : 0) + 1; data.set(k, { v: String(n), exp: e?.exp || 0 }); return n; },
        decr(k) { const e = live(k); const n = (e ? Number(e.v) : 0) - 1; data.set(k, { v: String(n), exp: e?.exp || 0 }); return n; },
        expire(k, s) { const e = live(k); if (!e) return 0; e.exp = now() + Number(s) * 1000; return 1; },
        hset(k, obj) { const h = hash(k); for (const [f, v] of Object.entries(obj)) h.set(f, String(v)); return Object.keys(obj).length; },
        hget(k, f) { const e = live(k); return e && e.v.has(f) ? e.v.get(f) : null; },
        hexists(k, f) { const e = live(k); return e && e.v.has(f) ? 1 : 0; },
        hkeys(k) { const e = live(k); return e ? [...e.v.keys()] : []; },
        hgetall(k) { const e = live(k); if (!e || !e.v.size) return null; return Object.fromEntries(e.v); },
        hdel(k, ...fs) { const e = live(k); if (!e) return 0; let n = 0; for (const f of fs) if (e.v.delete(f)) n++; return n; },
        hincrby(k, f, by) { const h = hash(k); const n = Number(h.get(f) || 0) + Number(by); h.set(f, String(n)); return n; }
    };

    // ---- Lua → 위 명령. 인자는 문자열, 반환은 Redis 규칙(정수·문자열·nil=false·배열) ----
    function luaCall(name, args) {
        switch (name) {
            case 'GET': return cmd.get(args[0]);
            case 'SET': return cmd.set(args[0], args[1]);
            case 'DEL': return cmd.del(...args);
            case 'INCR': return cmd.incr(args[0]);
            case 'EXPIRE': return cmd.expire(args[0], args[1]);
            case 'HGET': return cmd.hget(args[0], args[1]);
            case 'HSET': { const o = {}; for (let i = 1; i < args.length; i += 2) o[args[i]] = args[i + 1]; return cmd.hset(args[0], o); }
            case 'HDEL': return cmd.hdel(args[0], ...args.slice(1));
            case 'HEXISTS': return cmd.hexists(args[0], args[1]);
            case 'HKEYS': return cmd.hkeys(args[0]);
            case 'HGETALL': { const o = cmd.hgetall(args[0]) || {}; return Object.entries(o).flat(); }   // Redis 처럼 [필드, 값, …]
            case 'HINCRBY': {
                if (!/^-?\d+$/.test(String(args[2]))) throw new Error('ERR value is not an integer');
                return cmd.hincrby(args[0], args[1], Number(args[2]));
            }
            default: throw new Error('fake redis Lua: 지원하지 않는 명령 ' + name);
        }
    }
    function pushValue(L, v) {
        if (v === null || v === undefined || v === false) lua.lua_pushboolean(L, false);
        else if (typeof v === 'number') lua.lua_pushinteger(L, Math.trunc(v));
        else if (Array.isArray(v)) { lua.lua_createtable(L, v.length, 0); v.forEach((x, i) => { pushValue(L, x); lua.lua_rawseti(L, -2, i + 1); }); }
        else lua.lua_pushstring(L, to_luastring(String(v)));
    }
    function luaArgToString(L, i) {
        const t = lua.lua_type(L, i);
        if (t === lua.LUA_TNUMBER) { const n = lua.lua_tonumber(L, i); return Number.isInteger(n) ? String(n) : String(n); }
        if (t === lua.LUA_TSTRING) return to_jsstring(lua.lua_tostring(L, i));
        throw new Error('fake redis Lua: 인자는 문자열·숫자만');
    }
    function readResult(L, i) {
        const t = lua.lua_type(L, i);
        if (t === lua.LUA_TNUMBER) return Math.trunc(lua.lua_tonumber(L, i));   // Redis: Lua 숫자 → 정수
        if (t === lua.LUA_TSTRING) return to_jsstring(lua.lua_tostring(L, i));
        if (t === lua.LUA_TBOOLEAN) return lua.lua_toboolean(L, i) ? 1 : null;
        if (t === lua.LUA_TNIL) return null;
        if (t === lua.LUA_TTABLE) {
            const out = []; const n = lua.lua_rawlen(L, i);
            for (let j = 1; j <= n; j++) { lua.lua_rawgeti(L, i, j); out.push(readResult(L, lua.lua_gettop(L))); lua.lua_pop(L, 1); }
            return out;
        }
        return null;
    }
    function runLua(script, keys, args) {
        const L = lauxlib.luaL_newstate();
        lualib.luaL_openlibs(L);
        const setArr = (name, arr) => { lua.lua_createtable(L, arr.length, 0); arr.forEach((x, i) => { lua.lua_pushstring(L, to_luastring(String(x))); lua.lua_rawseti(L, -2, i + 1); }); lua.lua_setglobal(L, to_luastring(name)); };
        setArr('KEYS', keys); setArr('ARGV', args);
        lua.lua_createtable(L, 0, 1);
        lua.lua_pushjsfunction(L, L2 => {
            const n = lua.lua_gettop(L2);
            const a = []; for (let i = 1; i <= n; i++) a.push(luaArgToString(L2, i));
            let r;
            try { r = luaCall(String(a[0]).toUpperCase(), a.slice(1)); }
            catch (e) { lauxlib.luaL_error(L2, to_luastring(e.message)); }
            pushValue(L2, r);
            return 1;
        });
        lua.lua_setfield(L, -2, to_luastring('call'));
        lua.lua_setglobal(L, to_luastring('redis'));
        if (lauxlib.luaL_loadstring(L, to_luastring(script)) !== lua.LUA_OK || lua.lua_pcall(L, 0, 1, 0) !== lua.LUA_OK) {
            throw new Error('Lua 오류: ' + to_jsstring(lua.lua_tostring(L, -1)));
        }
        return readResult(L, lua.lua_gettop(L));
    }

    const api = {
        calls, data,
        setDown(v) { down = v; },
        // 시험 도우미: 다음 n번의 해당 명령을 실패시킨다(예: failNext('hdel'))
        failNext(name, n = 1) { failing.set(name, n); },
        // 운영 @upstash/redis 처럼 JSON 으로 읽히는 값은 객체·숫자로 바꿔 돌려준다(감사 R8 Q1-1: 문자열로만 시험해 운영 버그를 놓침)
        async get(k) { touch('get'); const v = cmd.get(k); if (typeof v !== 'string') return v; try { return JSON.parse(v); } catch { return v; } },
        async set(k, v, o = {}) { touch('set'); return cmd.set(k, v, o); },
        async del(...ks) { touch('del'); return cmd.del(...ks); },
        async incr(k) { touch('incr'); return cmd.incr(k); },
        async decr(k) { touch('decr'); return cmd.decr(k); },
        async expire(k, s) { touch('expire'); return cmd.expire(k, s); },
        async hset(k, obj) { touch('hset'); return cmd.hset(k, obj); },
        async hget(k, f) { touch('hget'); return cmd.hget(k, f); },
        async hgetall(k) { touch('hgetall'); return cmd.hgetall(k); },
        async hdel(k, ...fs) { touch('hdel'); return cmd.hdel(k, ...fs); },
        async hincrby(k, f, by) { touch('hincrby'); return cmd.hincrby(k, f, by); },
        async eval(script, keys, args) {
            touch('eval');
            calls.evals.push(/^-- zz:(\w+)/.exec(script)?.[1] || '?');
            return runLua(script, keys.map(String), args.map(String));
        },
        keysLike(re) { return [...data.keys()].filter(k => live(k) && re.test(k)); }
    };
    return api;
}
module.exports = { createFakeRedis };
