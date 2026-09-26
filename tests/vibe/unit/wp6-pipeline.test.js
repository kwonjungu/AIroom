// WP6 파이프라인 (mock 공급자, 메모리 KV·저장소): AS01 장애·지연 / AS02 멱등 / AS03 거부·후처리 / 비용 한도·취소·lease.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createMemoryKv } from '../../../lib/vibe/kv/index.js';
import { createAssetPipeline } from '../../../lib/vibe/assets/pipeline.js';
import { createMemoryStorage } from '../../../lib/vibe/assets/storage.js';
import { createAssetBudget } from '../../../lib/vibe/assets/budget.js';
import { createMockProvider } from '../../../lib/vibe/assets/providers/mock.js';
import { decodePng } from '../../../lib/vibe/assets/image/codec.js';
import { ASSET_JOB_STATES } from '../../../public/vibe-v2/shared/contracts/schemas.js';
import { MANIFEST_PATH } from '../../../lib/vibe/assets/build-manifest.js';

const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
const owner = { studentId: 's_student01', classId: 'c_class01', displayName: '권민지' };
const TERMINAL = ['ready', 'failed', 'cancelled', 'timed_out'];

function setup({ provider = createMockProvider(), budgetLimits, limits } = {}) {
  const clock = { t: Date.parse('2026-09-26T09:00:00Z') };
  const now = () => clock.t;
  const kv = createMemoryKv({ now });
  const storage = createMemoryStorage({ now });
  const budget = createAssetBudget(kv, { now, limits: budgetLimits });
  const logs = [];
  const pipe = createAssetPipeline({ kv, storage, manifest, provider, budget, now, log: e => logs.push(e), limits: { stepTimeoutMs: 40, ...limits } });
  return { clock, kv, storage, budget, pipe, provider, logs };
}
const brief = (over = {}) => ({
  schemaVersion: 1, projectId: 'p_demo1234', baseRevision: 3, slotId: 'player.appearance', kind: 'sprite',
  subject: '파란 목도리를 한 고양이', stylePack: 'toto-world-v1', dimensions: { width: 512, height: 512 },
  transparent: true, pose: 'front-idle', paletteId: 'warm-adventure', textInImage: false, ...over,
});
function submit(pipe, over = {}, extra = {}) {
  const b = brief(over);
  return pipe.submit({ owner: extra.owner || owner, projectId: b.projectId, revision: b.baseRevision, slotId: b.slotId, brief: b, requestedFrom: { assetId: null, preset: 'emoji:🐱' } });
}
async function run(pipe, jobId, n = 12) {
  let j;
  for (let i = 0; i < n; i++) { j = await pipe.step(jobId); if (TERMINAL.includes(j.status)) break; }
  return j;
}

test('정상: queued → generating → validating → processing → ready, 원본은 격리·결과만 승인·파생본 기록', async () => {
  const { pipe, storage, provider } = setup();
  const { job } = await submit(pipe);
  assert.equal(job.status, 'queued');
  assert.equal(job.placeholder, 'emoji:🐱');                // 기다리는 동안 쓸 모습
  const done = await run(pipe, job.jobId);
  assert.equal(done.status, 'ready');
  assert.equal(done.source, 'provider');
  const env = await pipe.get(job.jobId, owner);
  const path = env.events.map(e => e.status);
  assert.deepEqual(path, ['queued', 'generating', 'validating', 'processing', 'ready']);
  assert.ok(path.every(s => ASSET_JOB_STATES.includes(s)));
  const c = done.candidate;
  assert.match(c.assetId, /^ga_[a-f0-9]{32}$/);
  assert.equal(c.url, '/api/vibe/assets/files/' + c.assetId);
  const main = await storage.get(c.assetId);
  assert.equal(main.meta.approval, 'approved');
  assert.equal(main.meta.provider, 'mock');
  assert.equal(main.meta.promptVersion, 'asset-prompt-v1');
  assert.equal(main.meta.styleVersion, 'toto-world-v1@2026-09-26');
  assert.ok(main.meta.license && main.meta.provenance.label.startsWith('AI 생성'));
  const img = decodePng(main.bytes);
  assert.equal(img.data[3], 0);                                   // 실제 투명
  assert.deepEqual(c.derivatives.map(d => d.size), [128]);        // mock 원본 256 → 128 파생본
  // 원본(격리) + 주 이미지 + 파생본. mock 원본이 이미 요청 크기 이하라 주 이미지 = 원본 바이트 → 같은 assetId가 승인으로 승격
  const metas = storage._metas();
  assert.ok(metas.length >= 2 && metas.length <= 3);
  assert.equal((await storage.head(c.derivatives[0].assetId)).approval, 'approved');
  assert.equal(provider.calls.length, 1);
  assert.ok(!provider.calls[0].req.prompt.includes('민지'));
});

test('재사용: 알려진 이름뿐이면 생성하지 않는다 (공급자 호출 0)', async () => {
  const { pipe, provider } = setup();
  const r = await submit(pipe, { subject: '귀여운 고양이' });
  assert.equal(r.job.status, 'ready');
  assert.equal(r.job.source, 'catalog');
  assert.deepEqual(r.job.candidate, { assetId: null, preset: 'emoji:🐱', url: null });
  const bg = await submit(pipe, { subject: '우주', kind: 'background', slotId: 'bg.main', transparent: false, dimensions: { width: 1024, height: 576 } });
  assert.equal(bg.job.candidate.preset, 'bg-space');
  const snd = await submit(pipe, { subject: '별 먹는 소리', kind: 'sfx', slotId: 'sfx.collect', transparent: false });
  assert.equal(snd.job.candidate.preset, 'sfx:star');
  assert.equal(provider.calls.length, 0);
});

test('AS01: 공급자 없음 → 즉시 failed + placeholder 유지(게임 계속)', async () => {
  const { pipe } = setup({ provider: null });
  const { job } = await submit(pipe);
  assert.equal(job.status, 'failed');
  assert.deepEqual(job.codes, ['PROVIDER_UNAVAILABLE']);
  assert.equal(job.placeholder, 'emoji:🐱');
  assert.match(job.studentMessage, /지금 모습 그대로/);
});

test('AS01: 공급자 계속 실패 → 재시도 최대 2회(총 3번) 후 failed / 한 번 실패 후 성공', async () => {
  const a = setup({ provider: createMockProvider({ scenario: 'fail' }) });
  const j1 = await run(a.pipe, (await submit(a.pipe)).job.jobId);
  assert.equal(j1.status, 'failed');
  assert.equal(j1.attempts, 3);
  assert.equal(a.provider.calls.length, 3);
  const b = setup({ provider: createMockProvider({ sequence: ['fail', 'ok'] }) });
  const j2 = await run(b.pipe, (await submit(b.pipe)).job.jobId);
  assert.equal(j2.status, 'ready');
  assert.equal(j2.attempts, 2);
  const c = setup({ provider: createMockProvider({ scenario: 'down' }) });
  const j3 = await run(c.pipe, (await submit(c.pipe)).job.jobId);
  assert.equal(j3.status, 'failed');
  assert.deepEqual(j3.codes, ['PROVIDER_UNAVAILABLE']);
  assert.equal(c.provider.calls.length, 1);                      // 재시도해도 소용없는 오류는 재시도 안 함
});

test('AS01: 응답 없는 공급자(hang)는 호출 시간 제한으로 끊고, 장시간 지연은 기한초과(timed_out)', async () => {
  const a = setup({ provider: createMockProvider({ scenario: 'hang' }) });
  const t0 = Date.now();
  const j = await run(a.pipe, (await submit(a.pipe)).job.jobId);
  assert.equal(j.status, 'failed');
  assert.ok(j.codes.includes('TIMEOUT'));
  assert.ok(Date.now() - t0 < 3000);
  const b = setup({ provider: createMockProvider({ scenario: 'slow', readyAfterPolls: 1000 }) });
  const { job } = await submit(b.pipe);
  assert.equal((await b.pipe.step(job.jobId)).status, 'generating');
  assert.equal((await b.pipe.step(job.jobId)).status, 'generating');
  b.clock.t += 181_000;
  const late = await b.pipe.step(job.jobId);
  assert.equal(late.status, 'timed_out');
  assert.match(late.studentMessage, /지금 모습 그대로/);
});

test('지연 공급자: pending → poll로 완료', async () => {
  const { pipe, provider } = setup({ provider: createMockProvider({ scenario: 'slow', readyAfterPolls: 3 }) });
  const { job } = await submit(pipe);
  const seen = [];
  for (let i = 0; i < 6; i++) { const j = await pipe.step(job.jobId); seen.push(j.status); if (j.status === 'ready') break; }
  assert.deepEqual(seen, ['generating', 'generating', 'generating', 'ready']); // 제출 1 + poll 3
  assert.equal(provider.calls.length, 1);
});

test('AS02: 같은 요청 10번 동시 POST → job 1개, 공급자 호출 1번. 다른 슬롯의 같은 내용은 캐시(청구 없음)', async () => {
  const { pipe, provider } = setup();
  const rs = await Promise.all(Array.from({ length: 10 }, () => submit(pipe)));
  assert.equal(new Set(rs.map(r => r.job.jobId)).size, 1);
  assert.equal(rs.filter(r => r.created).length, 1);
  const id = rs[0].job.jobId;
  const steps = await Promise.all(Array.from({ length: 5 }, (_, i) => pipe.step(id, 'w' + i)));  // 동시 작업자 5
  assert.ok(steps.length === 5);
  const done = await run(pipe, id);
  assert.equal(done.status, 'ready');
  assert.equal(provider.calls.length, 1);
  const again = await submit(pipe);                                 // 완료 후 재전송
  assert.equal(again.created, false);
  assert.equal(again.job.jobId, id);
  const other = await submit(pipe, { slotId: 'fish.appearance' });  // 같은 학생·같은 내용·다른 슬롯
  assert.notEqual(other.job.jobId, id);
  assert.equal(other.job.status, 'ready');
  assert.equal(other.job.source, 'cache');
  assert.equal(other.job.candidate.assetId, done.candidate.assetId);
  assert.equal(provider.calls.length, 1);
  // 다른 학생은 별도 사용자 범위 → 새로 생성
  const stranger = await submit(pipe, {}, { owner: { studentId: 's_student02', classId: 'c_class01' } });
  assert.equal(stranger.job.status, 'queued');
});

test('AS02: 동시에 같은 내용 두 작업(두 슬롯) → 생성 잠금으로 공급자 1번만', async () => {
  const { pipe, provider } = setup({ provider: createMockProvider({ scenario: 'slow', readyAfterPolls: 2 }) });
  const a = await submit(pipe);
  const b = await submit(pipe, { slotId: 'fish.appearance' });
  await pipe.step(a.job.jobId);
  assert.equal((await pipe.step(b.job.jobId)).status, 'queued');   // 잠금 대기
  assert.equal((await run(pipe, a.job.jobId)).status, 'ready');
  const jb = await run(pipe, b.job.jobId);
  assert.equal(jb.status, 'ready');
  assert.equal(jb.source, 'cache');
  assert.equal(provider.calls.length, 1);
});

test('AS02: webhook 중복 전송 → 한 번만 반영', async () => {
  const { pipe, provider } = setup({ provider: createMockProvider({ scenario: 'webhook' }) });
  const { job } = await submit(pipe);
  assert.equal((await pipe.step(job.jobId)).status, 'generating');
  const env = await pipe.get(job.jobId, owner);
  const body = provider.webhookBody(env.priv.providerJobId, 'evt_1');
  const rs = await Promise.all([pipe.handleWebhook(body), pipe.handleWebhook(body), pipe.handleWebhook(body)]);
  assert.equal(rs.filter(r => r.duplicate).length, 2);
  const j = (await pipe.get(job.jobId, owner)).job;
  assert.equal(j.status, 'ready');
  const env2 = await pipe.get(job.jobId, owner);
  assert.equal(env2.events.filter(e => e.status === 'ready').length, 1);
  assert.equal(provider.calls.length, 1);
});

test('AS03: 위조·대용량·폭탄·깨짐·빈 그림·가짜 투명 → 재시도 후 거부, 원본은 rejected(제공 안 됨)', async () => {
  const cases = { mimeForged: 'MIME_MISMATCH', mimeHtml: 'MIME_UNKNOWN', large: 'FILE_TOO_LARGE', hugePixels: 'TOO_MANY_PIXELS', broken: 'DECODE_FAILED',
    blank: 'BLANK_IMAGE', fakeTransparent: 'ALPHA_MISSING', checkerboard: 'FAKE_TRANSPARENCY_CHECKERBOARD', cropped: 'CROPPED_AT_EDGE', offCenter: 'OFF_CENTER' };
  for (const [scenario, code] of Object.entries(cases)) {
    const { pipe, provider, storage } = setup({ provider: createMockProvider({ scenario }) });
    const { job } = await submit(pipe);
    const j = await run(pipe, job.jobId);
    assert.equal(j.status, 'failed', scenario);
    assert.ok(j.codes.includes(code), `${scenario}: ${j.codes}`);
    assert.equal(j.candidate, null);
    assert.equal(j.placeholder, 'emoji:🐱');
    assert.equal(provider.calls.length, 3, scenario);
    // 승인(제공)되는 파일이 하나도 없어야 한다. 저장된 원본은 모두 rejected
    const metas = storage._metas();
    assert.equal(metas.filter(m => m.approval === 'approved').length, 0, scenario);
    assert.ok(metas.every(m => m.approval === 'rejected'), scenario);
  }
});

test('AS03: 체커보드 뒤 정상 재시도 → ready / 단색(크로마) 배경은 키잉 후처리로 진짜 투명', async () => {
  const a = setup({ provider: createMockProvider({ sequence: ['checkerboard', 'ok'] }) });
  const j = await run(a.pipe, (await submit(a.pipe)).job.jobId);
  assert.equal(j.status, 'ready');
  assert.equal(j.attempts, 2);
  const b = setup({ provider: createMockProvider({ scenario: 'greenScreen', transparent: false }) });
  const { job } = await submit(b.pipe);
  const j2 = await run(b.pipe, job.jobId);
  assert.equal(j2.status, 'ready');
  assert.ok(j2.codes.includes('KEYED_BACKGROUND'));
  assert.ok(b.provider.calls[0].req.chromaKey === '#00FF00' && /pure green/.test(b.provider.calls[0].req.prompt));
  const img = decodePng((await b.storage.get(j2.candidate.assetId)).bytes);
  assert.equal(img.data[3], 0);
  assert.equal(img.data[(128 * 256 + 128) * 4 + 3], 255);
});

test('배경: 불투명 16:9, 파생본 128/256', async () => {
  const { pipe } = setup();
  const r = await submit(pipe, { kind: 'background', slotId: 'bg.main', subject: '보라색 사막 오아시스', transparent: false, dimensions: { width: 1024, height: 576 }, pose: 'scene' });
  const j = await run(pipe, r.job.jobId);
  assert.equal(j.status, 'ready', j.codes.join());
  assert.deepEqual([j.candidate.width, j.candidate.height], [512, 288]);
  assert.deepEqual(j.candidate.derivatives.map(d => d.size), [128, 256]);
});

test('비용 한도: 학급 일일 예산 초과 시 유료 호출만 차단, 무료 mock은 영향 없음, 예약→정산', async () => {
  const paid = createMockProvider({ live: true, costMicroUsd: 100_000 });
  const { pipe, budget } = setup({ provider: paid, budgetLimits: { classDailyMicroUsd: 150_000 } });
  const j1 = await run(pipe, (await submit(pipe)).job.jobId);
  assert.equal(j1.status, 'ready');
  const j2 = await run(pipe, (await submit(pipe, { subject: '빨간 망토를 두른 강아지', slotId: 'fish.appearance' })).job.jobId);
  assert.equal(j2.status, 'failed');
  assert.deepEqual(j2.codes, ['QUOTA_EXCEEDED']);
  assert.match(j2.studentMessage, /오늘은/);
  assert.equal(paid.calls.length, 1);
  const u = await budget.usage({ classId: owner.classId });
  assert.equal(u.classMicroUsd, 100_000);
  // 재사용·캐시는 예산과 무관
  assert.equal((await submit(pipe, { subject: '고양이', slotId: 'cat.appearance' })).job.status, 'ready');
  // 무료 공급자는 한도 0이어도 동작
  const free = setup({ budgetLimits: { classDailyMicroUsd: 0, orgDailyMicroUsd: 0, studentDailyCount: 0 } });
  assert.equal((await run(free.pipe, (await submit(free.pipe)).job.jobId)).status, 'ready');
});

test('비용: 실패로 끝난 호출 전 예약은 해제, 학생 하루 횟수 한도', async () => {
  const paid = createMockProvider({ live: true, costMicroUsd: 10_000, scenario: 'down' });
  const { pipe, budget } = setup({ provider: paid, budgetLimits: { studentDailyCount: 2 } });
  await run(pipe, (await submit(pipe)).job.jobId);
  assert.equal((await budget.usage({ classId: owner.classId })).classMicroUsd, 0);   // 호출 거부(down)는 청구 없음 → 해제
  const ok = createMockProvider({ live: true, costMicroUsd: 10_000 });
  const s2 = setup({ provider: ok, budgetLimits: { studentDailyCount: 2 } });
  for (const subj of ['초록 모자 쓴 토끼', '노란 우산 든 오리']) assert.equal((await run(s2.pipe, (await submit(s2.pipe, { subject: subj })).job.jobId)).status, 'ready');
  const third = await run(s2.pipe, (await submit(s2.pipe, { subject: '분홍 리본 단 판다' })).job.jobId);
  assert.deepEqual(third.codes, ['QUOTA_EXCEEDED']);
});

test('취소: 생성 중 취소 → cancelled, 늦은 결과는 작품에 반영 없이 캐시에만 보관, 재요청은 새 청구 없음', async () => {
  const { pipe, provider } = setup({ provider: createMockProvider({ scenario: 'webhook' }) });
  const { job } = await submit(pipe);
  await pipe.step(job.jobId);
  const env = await pipe.get(job.jobId, owner);
  const c = await pipe.cancel(job.jobId, owner);
  assert.equal(c.ok, true);
  assert.equal((await pipe.get(job.jobId, owner)).job.status, 'cancelled');
  assert.equal((await pipe.cancel(job.jobId, owner)).ok, true);   // 반복 안전
  await pipe.handleWebhook(provider.webhookBody(env.priv.providerJobId, 'evt_late'));
  const after = (await pipe.get(job.jobId, owner)).job;
  assert.equal(after.status, 'cancelled');
  assert.equal(after.candidate, null);
  const again = await submit(pipe);
  assert.notEqual(again.job.jobId, job.jobId);
  assert.equal(again.job.status, 'ready');
  assert.equal(again.job.source, 'cache');
  assert.equal(provider.calls.length, 1);
  assert.equal((await pipe.cancel(job.jobId, { studentId: 's_other' })).ok, false); // 남의 작업
});

test('부적절한 요청은 공급자에 보내지 않는다, 로그에 학생 원문·이름 없음', async () => {
  const { pipe, provider, logs } = setup();
  const r = await submit(pipe, { subject: '피투성이 괴물' });
  assert.equal(r.job.status, 'failed');
  assert.deepEqual(r.job.codes, ['UNSAFE_SUBJECT']);
  await run(pipe, (await submit(pipe)).job.jobId);
  assert.equal(provider.calls.length, 1);
  const text = JSON.stringify(logs);
  for (const bad of ['목도리', '권민지', '피투성이', 's_student01']) assert.ok(!text.includes(bad), bad);
  assert.ok(logs.some(l => l.outcome === 'ready' && l.provider === 'mock' && l.promptVersion === 'asset-prompt-v1'));
});

test('drain: 작업자 회수 루프가 남은 작업을 끝낸다', async () => {
  const { pipe } = setup();
  const a = await submit(pipe, { subject: '초록 모자 쓴 토끼' });
  const b = await submit(pipe, { subject: '노란 우산 든 오리', slotId: 'fish.appearance' });
  let out = [];
  for (let i = 0; i < 4; i++) out = out.concat(await pipe.drain({ max: 5 }));
  assert.equal((await pipe.get(a.job.jobId, owner)).job.status, 'ready');
  assert.equal((await pipe.get(b.job.jobId, owner)).job.status, 'ready');
});
