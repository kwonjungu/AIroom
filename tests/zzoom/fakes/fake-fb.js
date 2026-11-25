'use strict';
// 시험용 메모리 fb 어댑터(lib/zzoom/fb.js 인터페이스). 트랜잭션은 한 번에 하나씩 돌려 격리를 흉내 낸다.
const clone = v => v === undefined ? undefined : JSON.parse(JSON.stringify(v));

function createFakeFb({ now = Date.now } = {}) {
    const docs = new Map();      // path → data
    const objects = new Map();   // name → {size, contentType, timeCreated}
    const calls = { n: 0, tokens: [] };
    let chain = Promise.resolve();
    const touch = () => { calls.n++; };
    const children = coll => {
        const depth = coll.split('/').length + 1;
        return [...docs.keys()].filter(p => p.startsWith(coll + '/') && p.split('/').length === depth).sort();
    };
    function checkValue(v, inArray) {
        if (Array.isArray(v)) { if (inArray) throw new Error('Firestore: 배열 안 배열 금지'); v.forEach(x => checkValue(x, true)); }
        else if (v && typeof v === 'object') Object.values(v).forEach(x => checkValue(x, false));
    }
    const write = {
        set(p, d) { checkValue(d); docs.set(p, clone(d)); },
        update(p, d) { if (!docs.has(p)) throw Object.assign(new Error('not found ' + p), { code: 'not_found', status: 404 }); checkValue(d); docs.set(p, { ...docs.get(p), ...clone(d) }); },
        delete(p) { docs.delete(p); }
    };
    const cmp = { '==': (a, b) => a === b, '<': (a, b) => a < b, '<=': (a, b) => a <= b, '>': (a, b) => a > b, '>=': (a, b) => a >= b };
    const fb = {
        docs, objects, calls,
        async get(p) { touch(); return clone(docs.get(p) ?? null); },
        async set(p, d) { touch(); write.set(p, d); },
        async update(p, d) { touch(); write.update(p, d); },
        async delete(p) { touch(); write.delete(p); },
        async list(coll, { pageSize = 300, pageToken } = {}) {
            touch();
            const all = children(coll); const start = pageToken ? Number(pageToken) : 0;
            const slice = all.slice(start, start + pageSize);
            return { docs: slice.map(p => ({ id: p.slice(coll.length + 1), data: clone(docs.get(p)) })), next: start + pageSize < all.length ? String(start + pageSize) : null };
        },
        async query(coll, { where = [], orderBy, limit } = {}) {
            touch();
            let out = children(coll).map(p => ({ id: p.slice(coll.length + 1), data: clone(docs.get(p)) }))
                .filter(d => where.every(([f, op, v]) => d.data[f] !== undefined && cmp[op](d.data[f], v)));
            if (orderBy) out.sort((a, b) => (a.data[orderBy[0]] > b.data[orderBy[0]] ? 1 : -1) * (orderBy[1] === 'desc' ? -1 : 1));
            return limit ? out.slice(0, limit) : out;
        },
        async batch(ops) { touch(); if (ops.length > 500) throw new Error('batch 500 초과'); for (const o of ops) if (o.op === 'update' && !docs.has(o.path)) throw new Error('not found'); for (const o of ops) write[o.op](o.path, o.data); },
        runTransaction(fn) {
            touch();
            const run = async () => {
                const writes = [];
                const tx = {
                    get: async p => clone(docs.get(p) ?? null),
                    set: (p, d) => writes.push(['set', p, d]), update: (p, d) => writes.push(['update', p, d]), delete: p => writes.push(['delete', p])
                };
                const out = await fn(tx);
                for (const [op, p, d] of writes) write[op](p, d);
                return out;
            };
            const r = chain.then(run, run);
            chain = r.catch(() => {});
            return r;
        },
        storage: {
            async list(prefix, { pageToken, max = 500 } = {}) {
                touch();
                const all = [...objects.keys()].filter(n => n.startsWith(prefix)).sort();
                const start = pageToken ? Number(pageToken) : 0;
                return { items: all.slice(start, start + max).map(n => ({ name: n, ...objects.get(n) })), next: start + max < all.length ? String(start + max) : null };
            },
            async meta(n) { touch(); return objects.has(n) ? { name: n, ...objects.get(n) } : null; },
            async remove(n) { touch(); objects.delete(n); }
        },
        async createCustomToken(uid, claims) { touch(); calls.tokens.push({ uid, claims: clone(claims) }); return 'fake.' + Buffer.from(JSON.stringify({ uid, claims })).toString('base64url'); },
        // 시험 도우미: 브라우저가 Storage 에 직접 올린 것처럼
        put(name, size, contentType) { objects.set(name, { size, contentType, timeCreated: now() }); }
    };
    return fb;
}
module.exports = { createFakeFb };
