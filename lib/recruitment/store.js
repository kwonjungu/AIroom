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
        // 삭제는 되돌릴 수 없다. 라우트에서 채용 제목 확인을 거친 뒤에만 호출한다.
        async remove(id) {
            available(); const target = file(id);
            await get(id); // 없는 채용이면 404 로 끝낸다
            if (redis) { await redis.del(`recruitment:${id}`); await redis.zrem('recruitment:index', id); }
            else await locked(async () => { await fs.rm(target, { force: true }); });
            return { id };
        },
        // rebase: 위원 자기 몫의 쓰기(서명·임시 저장·제출)처럼 다른 사람의 변경과 의미가 겹치지 않는 작업에만 쓴다.
        // 화면이 들고 있던 버전이 낡았어도 최신 저장본에 fn 을 다시 적용하고(fn 안의 도메인 검사는 최신 상태 기준으로 돈다),
        // Redis CAS 가 같은 순간 경쟁으로 실패하면 몇 번 다시 시도한다. 관리자 결정은 rebase 없이 엄격한 버전 검사를 받는다.
        async mutate(id, version, fn, { rebase = false } = {}) {
            available(); assert(Number.isInteger(version) && version >= 1, '현재 버전이 필요합니다. 새로고침 후 다시 시도하세요.', 409);
            const attempt = async () => {
                const r = await get(id);
                if (!rebase && r.version !== version) throw Object.assign(new DomainError('다른 사용자가 변경했습니다. 최신 내용을 불러온 뒤 다시 확인하세요.', 409), { currentVersion: r.version });
                const next = fn(structuredClone(r)); assert(!next?.then, '저장 작업 안에서 외부 API를 호출할 수 없습니다.', 500); next.version = r.version + 1;
                if (!redis) { await write(next); return next; }
                if ((await redis.eval(CAS, [`recruitment:${id}`], [r.version, JSON.stringify(next)])) === 1) return next;
                return null; // CAS 경합
            };
            const work = async () => {
                for (let i = 0; i < (rebase ? 5 : 1); i++) { const done = await attempt(); if (done) return done; }
                let currentVersion; try { currentVersion = (await get(id)).version; } catch { /* 없으면 생략 */ }
                throw Object.assign(new DomainError('동시 변경이 감지됐습니다. 잠시 뒤 다시 눌러 주세요.', 409), { currentVersion });
            };
            return redis ? work() : locked(work);
        }
    };
}
module.exports = { createStore, CREATE, CAS };
