'use strict';
// 정리 작업 (DESIGN H-1). 지우기는 모두 되풀이해도 안전하다(이미 지운 것은 다시 안 보임).
// 단계는 Redis zz:purge:stage:<mid> 에 남겨 다음 실행이 이어서 한다.
const { K } = require('./keys');

const MEETINGS = 'zzoom_meetings';
const SUBS = ['agenda', 'pages', 'strokes', 'hands', 'people', 'chat', 'polls', 'transcript'];
const STAGES = ['storage', 'firestore', 'redis', 'doc'];
const UPLOAD_TTL = 24 * 3600 * 1000;

async function removePrefix(fb, prefix, deadline, now) {
    for (;;) {
        if (now() > deadline) return false;
        const { items } = await fb.storage.list(prefix, { max: 500 });
        if (!items.length) return true;
        for (let i = 0; i < items.length; i += 10) {
            await Promise.all(items.slice(i, i + 10).map(it => fb.storage.remove(it.name)));
            if (now() > deadline) return false;
        }
    }
}
async function removeCollection(fb, coll, deadline, now) {
    for (;;) {
        if (now() > deadline) return false;
        const { docs } = await fb.list(coll, { pageSize: 500 });
        if (!docs.length) return true;
        await fb.batch(docs.map(d => ({ op: 'delete', path: `${coll}/${d.id}` })));
    }
}

// 회의 하나를 끝까지(또는 시간 상한까지) 지운다. 다 지웠으면 true
async function purgeMeeting({ fb, redis, now }, mid, deadline) {
    const mpath = `${MEETINGS}/${mid}`;
    let stage = (await redis.get(K.purgeStage(mid))) || 'storage';
    stage = String(stage);
    const m = await fb.get(mpath);
    if (m && m.status !== 'deleting') await fb.update(mpath, { status: 'deleting' });
    for (let i = Math.max(0, STAGES.indexOf(stage)); i < STAGES.length; i++) {
        const s = STAGES[i];
        await redis.set(K.purgeStage(mid), s, { ex: 30 * 86400 });
        if (s === 'storage' && !(await removePrefix(fb, `zzoom/${mid}/`, deadline, now))) return false;
        if (s === 'firestore') for (const sub of SUBS) if (!(await removeCollection(fb, `${mpath}/${sub}`, deadline, now))) return false;
        if (s === 'redis') {
            const idx = await redis.hgetall(K.keys(mid));
            const keys = [...Object.keys(idx || {}), K.code(mid), K.tryAll(mid), K.sc(mid), K.seq(mid), K.keys(mid)];
            for (let j = 0; j < keys.length; j += 100) await redis.del(...keys.slice(j, j + 100));
            // 이 회의의 업로드·옛 선 대기 항목
            for (const q of [K.uploads, K.purgePages]) {
                const h = await redis.hgetall(q);
                const mine = Object.keys(h || {}).filter(f => f.startsWith(mid + '/') || f.startsWith(mid + '|'));
                if (mine.length) await redis.hdel(q, ...mine);
            }
        }
        if (s === 'doc') await fb.delete(mpath);
        if (now() > deadline && i < STAGES.length - 1) return false;
    }
    await redis.hdel(K.purge, mid);
    await redis.del(K.purgeStage(mid));
    return true;
}

const enqueue = (redis, mid, at) => redis.hset(K.purge, { [mid]: at });

// 한 번 실행: 기한 지난 회의를 대기열에 넣고 → 대기열 회의 → 24시간 지난 업로드 → 옛 선 순서로 지운다.
async function runPurge(ctx, { budgetMs = 50000 } = {}) {
    const { fb, redis, now } = ctx;
    const start = now(), deadline = start + budgetMs;
    const out = { expired: 0, meetingsDone: 0, meetingsLeft: 0, uploads: 0, oldStrokes: 0, timedOut: false };
    const expired = await fb.query(MEETINGS, { where: [['expiresAt', '<', start]], limit: 200 });
    for (const d of expired) { out.expired++; await enqueue(redis, d.id, start); if (d.data.status !== 'deleting') await fb.update(`${MEETINGS}/${d.id}`, { status: 'deleting' }); }
    const queue = Object.keys((await redis.hgetall(K.purge)) || {});
    for (const mid of queue) {
        if (now() > deadline) { out.meetingsLeft++; continue; }
        if (await purgeMeeting(ctx, mid, deadline)) out.meetingsDone++; else out.meetingsLeft++;
    }
    const ups = (await redis.hgetall(K.uploads)) || {};
    for (const [f, at] of Object.entries(ups)) {
        if (now() > deadline) break;
        if (start - Number(at) < UPLOAD_TTL) continue;
        const [mid, uploadId] = f.split('/');
        if (await removePrefix(fb, `zzoom/${mid}/up/${uploadId}/`, deadline, now)) { await redis.hdel(K.uploads, f); out.uploads++; }
    }
    const pages = (await redis.hgetall(K.purgePages)) || {};
    for (const [f, ep] of Object.entries(pages)) {
        if (now() > deadline) break;
        const [mid, pageKey] = f.split('|');
        const left = await removeOldStrokes(fb, mid, pageKey, Number(ep), 500);
        out.oldStrokes += left.deleted;
        if (left.done) await redis.hdel(K.purgePages, f);
    }
    out.timedOut = now() > deadline;
    return out;
}

// 쪽 지우기 뒤 옛 epoch 선 지우기(최대 limit 개). 다 지웠으면 done
async function removeOldStrokes(fb, mid, pageKey, epoch, limit) {
    const coll = `${MEETINGS}/${mid}/strokes`;
    const docs = (await fb.query(coll, { where: [['pageKey', '==', pageKey]], limit: 2500 })).filter(d => (d.data.epoch || 0) < epoch);
    const now = docs.slice(0, limit);
    for (let i = 0; i < now.length; i += 500) await fb.batch(now.slice(i, i + 500).map(d => ({ op: 'delete', path: `${coll}/${d.id}` })));
    return { deleted: now.length, done: docs.length <= limit };
}

module.exports = { runPurge, purgeMeeting, enqueue, removeOldStrokes, removePrefix, SUBS, MEETINGS };
