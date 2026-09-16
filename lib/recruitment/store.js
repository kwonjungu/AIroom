'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const { DomainError, assert } = require('./domain');

// A recruitment is one bounded aggregate (20 applicants / 8 reviewers).
// Redis compare-and-swap prevents lost writes across serverless instances.
const CREATE = `if redis.call('EXISTS',KEYS[1]) == 1 then return 0 end redis.call('SET',KEYS[1],ARGV[1]); redis.call('ZADD',KEYS[2],ARGV[2],ARGV[3]); return 1`;
const CAS = `local old=redis.call('GET',KEYS[1]); if not old then return -1 end if cjson.decode(old).version ~= tonumber(ARGV[1]) then return 0 end redis.call('SET',KEYS[1],ARGV[2]); return 1`;
function createStore({ redis = null, directory, serverless = false }) {
    let queue = Promise.resolve();
    const locked = fn => { const work = queue.then(fn, fn); queue = work.catch(() => {}); return work; };
    function file(id) { assert(/^[a-f0-9-]{36}$/.test(id), '잘못된 채용 ID입니다.'); return path.join(directory, `${id}.json`); }
    function available() { if (serverless && !redis) throw new DomainError('채용 데이터 저장소가 연결되지 않았습니다. Redis 설정이 필요합니다.', 503); }
    async function get(id) {
        available(); file(id);
        if (redis) { const data = await redis.get(`recruitment:${id}`); if (!data) throw new DomainError('채용을 찾을 수 없습니다.', 404); return typeof data === 'string' ? JSON.parse(data) : data; }
        try { return JSON.parse(await fs.readFile(file(id), 'utf8')); } catch (e) { if (e.code === 'ENOENT') throw new DomainError('채용을 찾을 수 없습니다.', 404); throw e; }
    }
    async function write(r) { await fs.mkdir(directory, { recursive: true }); const target = file(r.id), temp = `${target}.${process.pid}.tmp`; await fs.writeFile(temp, JSON.stringify(r), { mode: 0o600 }); await fs.rename(temp, target); }
    return {
        get,
        async list() {
            available(); let ids;
            if (redis) ids = await redis.zrange('recruitment:index', 0, 199, { rev: true });
            else { await fs.mkdir(directory, { recursive: true }); ids = (await fs.readdir(directory)).filter(n => /^[a-f0-9-]{36}\.json$/.test(n)).map(n => n.slice(0, -5)); }
            const all = await Promise.all(ids.map(get)); return all.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 200);
        },
        async create(r) { available(); file(r.id); if (redis) { assert(await redis.eval(CREATE, [`recruitment:${r.id}`, 'recruitment:index'], [JSON.stringify(r), Date.parse(r.createdAt), r.id]), '중복된 채용입니다.', 409); } else await locked(async () => { try { await fs.access(file(r.id)); throw new DomainError('중복된 채용입니다.', 409); } catch (e) { if (e.code !== 'ENOENT') throw e; } await write(r); }); return r; },
        async mutate(id, version, fn) {
            available(); assert(Number.isInteger(version) && version >= 1, '현재 버전이 필요합니다. 새로고침 후 다시 시도하세요.', 409);
            const work = async () => { const r = await get(id); assert(r.version === version, '다른 사용자가 변경했습니다. 새로고침 후 다시 확인하세요.', 409); const next = fn(structuredClone(r)); assert(!next?.then, '저장 작업 안에서 외부 API를 호출할 수 없습니다.', 500); next.version = version + 1;
                if (redis) assert((await redis.eval(CAS, [`recruitment:${id}`], [version, JSON.stringify(next)])) === 1, '동시 변경이 감지됐습니다. 새로고침 후 다시 확인하세요.', 409); else await write(next); return next; };
            return redis ? work() : locked(work);
        }
    };
}
module.exports = { createStore, CREATE, CAS };
