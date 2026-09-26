// WP6 통합: WP7 createVibeApi + WP6 createAssetRoutes를 임시 express에 마운트, mock 공급자로 요청 → ready.
// 실제 이미지 API·학생 데이터·Redis 사용 안 함.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import express from 'express';
import { createVibeApi } from '../../../lib/vibe/api.js';
import { createMemoryKv } from '../../../lib/vibe/kv/index.js';
import { createAssetRoutes } from '../../../lib/vibe/assets/routes.js';
import { createMockProvider } from '../../../lib/vibe/assets/providers/mock.js';
import { decodePng } from '../../../lib/vibe/assets/image/codec.js';
import { simulate } from '../../../public/vibe-v2/shared/runtime/simulate.js';
import { client, projectDraft, newClass, joinedStudent, SECRET, STAFF_TOKENS } from './wp7-helpers.js';

const WH = 'whsec-test-0123456789';
const WK = 'wksec-test-0123456789';

async function startAssetApp({ provider, env = {}, pipelineLimits } = {}) {
  const clock = { t: Date.parse('2026-09-26T09:00:00Z') };
  const now = () => clock.t;
  const kv = createMemoryKv({ now });
  const logs = [];
  const api = createVibeApi({ express, kv, now, env: { VIBE_SESSION_SECRET: SECRET }, validateStaffSession: async t => STAFF_TOKENS[t] || null, log: e => logs.push(e) });
  const assets = createAssetRoutes({
    express, services: api.services, provider, now, log: e => logs.push(e), pipelineLimits,
    env: { VIBE_ASSET_WEBHOOK_SECRET: WH, VIBE_ASSET_WORKER_SECRET: WK, ...env },
  });
  const router = express.Router();
  router.use(api);          // 통합 담당이 lib/vibe/router.js에서 하는 연결과 같은 순서
  router.use(assets);
  const app = express();
  app.set('trust proxy', true);
  app.use('/api/vibe', router);
  const server = await new Promise(r => { const s = app.listen(0, '127.0.0.1', () => r(s)); });
  const base = `http://127.0.0.1:${server.address().port}/api/vibe`;
  return { base, clock, kv, logs, assets, close: () => new Promise(r => server.close(r)) };
}

const brief = (projectId, revision, over = {}) => ({
  schemaVersion: 1, projectId, baseRevision: revision, slotId: 'player.appearance', kind: 'sprite',
  subject: '파란 목도리를 한 고양이', stylePack: 'toto-world-v1', dimensions: { width: 512, height: 512 },
  transparent: true, pose: 'front-idle', paletteId: 'warm-adventure', textInImage: false, ...over,
});
const assetReq = (p, over = {}) => {
  const b = brief(p.id, p.revision, over);
  return { projectId: p.id, revision: p.revision, slotId: b.slotId, assetBrief: b };
};
async function pollReady(S, jobId, n = 10) {
  let r;
  for (let i = 0; i < n; i++) { r = await S.get('/assets/' + jobId); if (['ready', 'failed', 'cancelled', 'timed_out'].includes(r.body.job.status)) break; }
  return r;
}

let app, cls, A, B, pa;
before(async () => {
  app = await startAssetApp({ provider: createMockProvider() });
  const teacher = client(app.base, { staff: 'staff-A' });
  cls = await newClass(teacher);
  A = await joinedStudent(app.base, cls.inviteCode, { displayName: '권민지' });
  B = await joinedStudent(app.base, cls.inviteCode);
  pa = (await A.post('/projects', projectDraft('A의 게임'))).body.project;
});
after(async () => { await app.close(); });

test('요청 → 202 queued → 폴링 → ready, 후보 제안(자동 반영 안 함), 파일 제공', async () => {
  const r = await A.post('/assets', assetReq(pa));
  assert.equal(r.status, 202, JSON.stringify(r.body));
  assert.equal(r.body.created, true);
  assert.equal(r.body.job.status, 'queued');
  assert.equal(r.body.job.placeholder, 'emoji:🐱');
  assert.deepEqual(r.body.proposal, { applicable: false, reason: 'NOT_READY' });
  assert.ok(!JSON.stringify(r.body).includes('Flat vector'));      // 프롬프트는 학생에게 보내지 않는다
  const g = await pollReady(A, r.body.job.jobId);
  assert.equal(g.status, 200);
  assert.equal(g.body.job.status, 'ready');
  const c = g.body.job.candidate;
  assert.equal(g.body.proposal.applicable, true);
  assert.deepEqual(g.body.proposal.assetRef, { slotId: 'player.appearance', assetId: c.assetId, preset: 'emoji:🐱' });
  // 서버는 작품을 바꾸지 않았다
  const proj = (await A.get('/projects/' + pa.id)).body.project;
  assert.equal(proj.revision, pa.revision);
  assert.deepEqual(proj.assets, pa.assets);
  // 파일
  const f = await fetch(app.base.replace('/api/vibe', '') + c.url);
  assert.equal(f.status, 200);
  assert.equal(f.headers.get('content-type'), 'image/png');
  assert.equal(f.headers.get('x-content-type-options'), 'nosniff');
  assert.match(f.headers.get('cache-control'), /immutable/);
  const img = decodePng(new Uint8Array(await f.arrayBuffer()));
  assert.equal(img.data[3], 0);
  assert.equal((await fetch(app.base + '/assets/files/ga_' + 'f'.repeat(32))).status, 404);
  assert.equal((await fetch(app.base + '/assets/files/..%2F..%2Fserver.js')).status, 404);
});

test('AS02: 같은 요청 재전송은 같은 job (created:false)', async () => {
  const rs = await Promise.all([1, 2, 3, 4].map(() => A.post('/assets', assetReq(pa, { subject: '초록 모자 쓴 토끼' }))));
  assert.ok(rs.every(r => r.status === 202));
  assert.equal(new Set(rs.map(r => r.body.job.jobId)).size, 1);
  assert.equal(rs.filter(r => r.body.created).length, 1);
});

test('소유권·revision·brief 검증: 남의 작품/작업 404, revision 불일치 409, brief 불일치 400, 비로그인 401', async () => {
  app.clock.t += 120_000; // 학생당 분당 6회 생성 제한 창을 넘긴다
  const r = await A.post('/assets', assetReq(pa, { subject: '노란 우산 든 오리' }));
  assert.equal((await B.get('/assets/' + r.body.job.jobId)).status, 404);
  assert.equal((await B.post('/assets/' + r.body.job.jobId + '/cancel', {})).status, 404);
  assert.equal((await B.post('/assets', assetReq(pa))).status, 404);
  const stale = await A.post('/assets', { ...assetReq(pa), revision: pa.revision + 5, assetBrief: brief(pa.id, pa.revision + 5) });
  assert.equal(stale.status, 409);
  assert.equal(stale.body.error.code, 'REVISION_CONFLICT');
  assert.equal(stale.headers.get('x-vibe-revision'), String(pa.revision));
  const mismatch = await A.post('/assets', { ...assetReq(pa), slotId: 'fish.appearance' });
  assert.equal(mismatch.status, 400);
  assert.equal((await A.post('/assets', assetReq(pa, { slotId: 'ghost.appearance' }))).status, 400);
  assert.equal((await A.post('/assets', { ...assetReq(pa), assetBrief: { ...brief(pa.id, pa.revision), textInImage: true } })).status, 400);
  assert.equal((await client(app.base).post('/assets', assetReq(pa))).status, 401);
  assert.equal((await A.get('/assets/not-a-job')).status, 404);
});

test('재사용: 알려진 이름은 즉시 ready(생성 없음), 지금 모습과 다르면 후보 제안', async () => {
  app.clock.t += 120_000;
  const r = await A.post('/assets', assetReq(pa, { subject: '강아지' }));
  assert.equal(r.body.job.status, 'ready');
  assert.equal(r.body.job.source, 'catalog');
  assert.deepEqual(r.body.proposal.assetRef, { slotId: 'player.appearance', assetId: null, preset: 'emoji:🐶' });
  const same = await A.post('/assets', assetReq(pa, { subject: '고양이' }));
  assert.deepEqual(same.body.proposal, { applicable: false, reason: 'ALREADY_APPLIED' });
});

test('AS04: 생성 중 학생이 슬롯을 바꾸면 늦게 온 그림은 제안하지 않는다(보관만)', async () => {
  const slow = await startAssetApp({ provider: createMockProvider({ scenario: 'slow', readyAfterPolls: 2 }) });
  try {
    const teacher = client(slow.base, { staff: 'staff-A' });
    const c = await newClass(teacher);
    const S = await joinedStudent(slow.base, c.inviteCode);
    let p = (await S.post('/projects', projectDraft('느린 그림'))).body.project;
    const r = await S.post('/assets', assetReq(p, { slotId: 'fish.appearance', subject: '무지개 비늘 물고기' }));
    assert.equal(r.status, 202);
    assert.equal((await S.get('/assets/' + r.body.job.jobId)).body.job.status, 'generating');
    const pr = await S.patch('/projects/' + p.id, { baseRevision: p.revision, patch: { schemaVersion: 1, summary: '모습 변경', assetRequests: [], operations: [{ op: 'setAppearance', nodeId: 'fish-fall', slotId: 'fish.appearance', preset: 'emoji:🍎' }] } });
    assert.equal(pr.status, 200, JSON.stringify(pr.body));
    p = pr.body.project;
    const g = await pollReady(S, r.body.job.jobId);
    assert.equal(g.body.job.status, 'ready');
    assert.deepEqual(g.body.proposal, { applicable: false, reason: 'SLOT_CHANGED' });
    const now = (await S.get('/projects/' + p.id)).body.project;
    assert.equal(now.assets.find(a => a.slotId === 'fish.appearance').preset, 'emoji:🍎');
    assert.equal(now.assets.find(a => a.slotId === 'fish.appearance').assetId, null);
    // 취소한 요청도 제안하지 않는다
    const r2 = await S.post('/assets', assetReq(now, { slotId: 'player.appearance', subject: '별무늬 망토 고양이' }));
    const cx = await S.post('/assets/' + r2.body.job.jobId + '/cancel', {});
    assert.equal(cx.status, 200);
    assert.equal(cx.body.job.status, 'cancelled');
    const g2 = await S.get('/assets/' + r2.body.job.jobId);
    assert.equal(g2.body.proposal.applicable, false);
  } finally { await slow.close(); }
});

test('AS05: 제안을 받아 작품에 반영해도 program(규칙·collider·속도)과 시뮬레이션 결과는 그대로', async () => {
  const S = await joinedStudent(app.base, cls.inviteCode);
  const p = (await S.post('/projects', projectDraft('반영 시험'))).body.project;
  const r = await S.post('/assets', assetReq(p, { subject: '빨간 망토 고양이' }));
  const g = await pollReady(S, r.body.job.jobId);
  assert.equal(g.body.proposal.applicable, true);
  const ref = g.body.proposal.assetRef;
  const nextAssets = p.assets.map(a => (a.slotId === ref.slotId ? ref : a));
  const put = await S.put('/projects/' + p.id, { baseRevision: p.revision, project: { ...p, assets: nextAssets, revision: p.revision + 1 } });
  assert.equal(put.status, 200, JSON.stringify(put.body));
  const saved = put.body.project;
  assert.deepEqual(saved.program, p.program);
  assert.equal(saved.assets.find(a => a.slotId === ref.slotId).assetId, ref.assetId);
  const a = simulate(p, { seed: 3, ticks: 600 });
  const b = simulate(saved, { seed: 3, ticks: 600 });
  assert.deepEqual(b.trace, a.trace);
  assert.equal(b.finalSnapshot.score, a.finalSnapshot.score);
  // 반영 뒤 같은 결과 재조회 → 이미 반영됨
  assert.deepEqual((await S.get('/assets/' + r.body.job.jobId)).body.proposal, { applicable: false, reason: 'ALREADY_APPLIED' });
});

test('AS01: 공급자 없음 → 202 + failed + placeholder (게임은 지금 모습으로 계속)', async () => {
  const none = await startAssetApp({ provider: null });
  try {
    const teacher = client(none.base, { staff: 'staff-A' });
    const c = await newClass(teacher);
    const S = await joinedStudent(none.base, c.inviteCode);
    const p = (await S.post('/projects', projectDraft('공급자 없음'))).body.project;
    const r = await S.post('/assets', assetReq(p));
    assert.equal(r.status, 202);
    assert.equal(r.body.job.status, 'failed');
    assert.deepEqual(r.body.job.codes, ['PROVIDER_UNAVAILABLE']);
    assert.equal(r.body.job.placeholder, 'emoji:🐱');
    assert.equal(none.assets.providerReason, 'disabled');
    // 재사용은 공급자 없이도 된다
    assert.equal((await S.post('/assets', assetReq(p, { subject: '펭귄' }))).body.job.status, 'ready');
  } finally { await none.close(); }
});

test('webhook: 서명 필수, 중복 전송 멱등 / drain: 공유 비밀 필수', async () => {
  const provider = createMockProvider({ scenario: 'webhook' });
  const w = await startAssetApp({ provider, env: { VIBE_ASSET_STEP_ON_POLL: '0' } });
  try {
    const teacher = client(w.base, { staff: 'staff-A' });
    const c = await newClass(teacher);
    const S = await joinedStudent(w.base, c.inviteCode);
    const p = (await S.post('/projects', projectDraft('웹훅'))).body.project;
    const r = await S.post('/assets', assetReq(p));
    const jobId = r.body.job.jobId;
    assert.equal((await S.get('/assets/' + jobId)).body.job.status, 'queued'); // 폴링이 진행하지 않는 운영 모드
    const post = (path, body, headers = {}) => fetch(w.base + path, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) });
    assert.equal((await post('/assets/worker/drain', {})).status, 403);
    assert.equal((await post('/assets/worker/drain', {}, { 'x-vibe-worker-secret': 'wrong' })).status, 403);
    const d = await post('/assets/worker/drain', { max: 3 }, { 'x-vibe-worker-secret': WK });
    assert.equal(d.status, 200);
    assert.deepEqual((await d.json()).processed.map(x => x.status), ['generating']);
    const pjId = provider.calls[0] && (await w.assets.pipeline.get(jobId, { studentId: undefined }))?.priv.providerJobId;
    const body = provider.webhookBody(pjId, 'evt_dup');
    const sign = b => 'sha256=' + crypto.createHmac('sha256', WH).update(JSON.stringify(b)).digest('hex');
    assert.equal((await post('/assets/webhook/mock', body, { 'x-vibe-signature': 'sha256=00' })).status, 403);
    assert.equal((await post('/assets/webhook/other', body, { 'x-vibe-signature': sign(body) })).status, 404);
    const h1 = await post('/assets/webhook/mock', body, { 'x-vibe-signature': sign(body) });
    const h2 = await post('/assets/webhook/mock', body, { 'x-vibe-signature': sign(body) });
    assert.equal(h1.status, 200);
    assert.deepEqual(await h2.json(), { ok: true, duplicate: true });
    const g = await S.get('/assets/' + jobId);
    assert.equal(g.body.job.status, 'ready');
    assert.equal(g.body.job.events.filter(e => e.status === 'ready').length, 1);
    assert.equal(provider.calls.length, 1);
  } finally { await w.close(); }
});

test('로그: 학생 원문·이름·프롬프트 없음, requestId·jobId·공급자·결과는 있음', async () => {
  const text = JSON.stringify(app.logs);
  for (const bad of ['목도리', '권민지', 'Flat vector']) assert.ok(!text.includes(bad), bad);
  assert.ok(app.logs.some(l => l.event === 'asset' && l.outcome === 'ready' && l.jobId && l.provider === 'mock'));
});

test('생성 요청 제한: 학생당 분당 6회, 넘으면 429 + retryAfter (다른 학생은 영향 없음)', async () => {
  app.clock.t += 120_000;
  const subjects = ['해바라기 모자 곰', '구름 타는 여우', '초콜릿 성', '보라 날개 나비', '민트색 로봇 강아지', '달빛 고래'];
  for (const s of subjects) assert.equal((await A.post('/assets', assetReq(pa, { subject: s }))).status, 202, s);
  const over = await A.post('/assets', assetReq(pa, { subject: '일곱번째 그림' }));
  assert.equal(over.status, 429);
  assert.equal(over.body.error.code, 'RATE_LIMITED');
  assert.ok(over.body.error.retryAfterMs > 0);
  const pb = (await B.post('/projects', projectDraft('B의 게임'))).body.project;
  assert.equal((await B.post('/assets', assetReq(pb))).status, 202);
});
