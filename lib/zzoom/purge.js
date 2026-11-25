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
// 시간 상한이 있는 저장소: gcp 어댑터는 남은 시간이 지나면 진행 중 REST 호출도 끊는다(지적07). 가짜·옛 어댑터는 그대로.
const scopedFb = (fb, deadline) => (typeof fb.scoped === 'function' ? fb.scoped(deadline) : fb);

// 회의 하나를 끝까지(또는 시간 상한까지) 지운다. 다 지웠으면 true
async function purgeMeeting({ fb: rawFb, redis, now }, mid, deadline) {
    const fb = scopedFb(rawFb, deadline);
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
            const keys = [...Object.keys(idx || {}), K.code(mid), K.tryAll(mid), K.tryLife(mid), K.sc(mid), K.scp(mid), K.seq(mid), K.upOpen(mid), K.chatBucket(mid), K.keys(mid)];
            for (let j = 0; j < keys.length; j += 100) await redis.del(...keys.slice(j, j + 100));
            // 이 회의의 옛 선 대기 항목. 업로드 장부(zz:uploads)는 **남긴다** — 삭제 뒤에 늦게 올라온 파일도
            // 24시간 뒤 업로드 정리가 지운다(지적01). 회의 문서가 없으니 그때는 안건 확인 없이 지운다.
            const h = await redis.hgetall(K.purgePages);
            const mine = Object.keys(h || {}).filter(f => f.startsWith(mid + '|'));
            if (mine.length) await redis.hdel(K.purgePages, ...mine);
        }
        if (s === 'doc') {
            // 앞 단계 사이에 늦게 들어온 하위 문서가 있으면 마지막으로 한 번 더 훑는다(쓰기는 'deleting' 트랜잭션으로 막히지만 이중 안전)
            for (const sub of SUBS) if (!(await removeCollection(fb, `${mpath}/${sub}`, deadline, now))) return false;
            await fb.delete(mpath);
        }
        if (now() > deadline && i < STAGES.length - 1) return false;
    }
    await redis.hdel(K.purge, mid);
    await redis.del(K.purgeStage(mid));
    return true;
}

const enqueue = (redis, mid, at) => redis.hset(K.purge, { [mid]: at });

// 한 번 실행: 기한 지난 회의를 대기열에 넣고 → 대기열 회의 → 24시간 지난 업로드 → 옛 선 순서로 지운다.
async function runPurge(ctx, { budgetMs = 50000 } = {}) {
    const { redis, now } = ctx;
    const start = now(), deadline = start + budgetMs;
    const fb = scopedFb(ctx.fb, deadline);
    const out = { expired: 0, meetingsDone: 0, meetingsLeft: 0, uploads: 0, uploadsKept: 0, oldStrokes: 0, timedOut: false };
    // 기한 지난 회의는 대기열(Redis)에만 넣는다. 'deleting' 표시는 purgeMeeting 이 한다(만료 회의는 expiresAt 으로 이미 막힘).
    // 한 번에 200건을 넘게 쓰지 않고 시간 상한도 본다(지적07).
    const expired = await fb.query(MEETINGS, { where: [['expiresAt', '<', start]], limit: 200 });
    for (const d of expired) {
        if (now() > deadline) break;
        out.expired++; await enqueue(redis, d.id, start);
    }
    const queue = Object.keys((await redis.hgetall(K.purge)) || {});
    for (const mid of queue) {
        if (now() > deadline) { out.meetingsLeft++; continue; }
        if (await purgeMeeting({ ...ctx, fb }, mid, deadline)) out.meetingsDone++; else out.meetingsLeft++;
    }
    const ups = (await redis.hgetall(K.uploads)) || {};
    for (const [f, at] of Object.entries(ups)) {
        if (now() > deadline) break;
        if (start - Number(at) < UPLOAD_TTL) continue;
        const [mid, uploadId] = f.split('/');
        // 장부 맞추기(지적03): commit 은 됐는데 장부 정리만 실패한 경우 — 안건 문서가 있으면 파일을 지키고 장부만 지운다
        // 기존 안건(제목만 만든 것·자료 바꾸기)에 붙인 업로드는 안건 id 가 a<uploadId> 가 아니다 — 안건의 base 가 이 업로드면 지킨다(감사 R2 M1)
        if (await uploadInUse(fb, mid, uploadId)) { await redis.hdel(K.uploads, f); out.uploadsKept++; continue; }
        if (await removePrefix(fb, `zzoom/${mid}/up/${uploadId}/`, deadline, now)) { await redis.hdel(K.uploads, f); out.uploads++; }
    }
    const pages = (await redis.hgetall(K.purgePages)) || {};
    for (const [f, ep] of Object.entries(pages)) {
        if (now() > deadline) break;
        const [mid, pageKey] = f.split('|');
        const left = await removeOldStrokes(fb, mid, pageKey, Number(ep), 500, deadline, now);
        out.oldStrokes += left.deleted;
        if (left.done) await redis.hdel(K.purgePages, f);
    }
    out.timedOut = now() > deadline;
    return out;
}

// 이 업로드 파일을 쓰는 안건이 있는가: 새 안건(a<uploadId>)이거나, 안건 문서의 base 가 이 업로드 폴더(안건은 회의당 30개 이하)
async function uploadInUse(fb, mid, uploadId) {
    if (await fb.get(`${MEETINGS}/${mid}/agenda/a${uploadId.slice(1)}`)) return true;
    const base = `zzoom/${mid}/up/${uploadId}`;
    let next;
    do {
        const r = await fb.list(`${MEETINGS}/${mid}/agenda`, { pageSize: 100, pageToken: next });
        if ((r.docs || []).some(d => d.data && String(d.data.base || '').replace(/\/$/, '') === base)) return true;
        next = r.next;
    } while (next);
    return false;
}

// 쪽 지우기 뒤 옛 epoch 선 지우기(최대 limit 개). 다 지웠으면 done
async function removeOldStrokes(fb, mid, pageKey, epoch, limit, deadline = Infinity, now = Date.now) {
    const coll = `${MEETINGS}/${mid}/strokes`;
    const docs = (await fb.query(coll, { where: [['pageKey', '==', pageKey]], limit: 2500 })).filter(d => (d.data.epoch || 0) < epoch);
    const pick = docs.slice(0, limit);
    let deleted = 0;
    for (let i = 0; i < pick.length; i += 500) {
        if (now() > deadline) return { deleted, done: false };
        const part = pick.slice(i, i + 500);
        await fb.batch(part.map(d => ({ op: 'delete', path: `${coll}/${d.id}` })));
        deleted += part.length;
    }
    return { deleted, done: docs.length <= limit };
}

module.exports = { runPurge, purgeMeeting, enqueue, removeOldStrokes, removePrefix, SUBS, MEETINGS };
