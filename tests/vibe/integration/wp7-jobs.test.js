import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createMemoryKv } from '../../../lib/vibe/kv/index.js';
import { createJobStore, JobError } from '../../../lib/vibe/jobs/store.js';
import { acquireGenerationSlots, acquireSlot, releaseSlot } from '../../../lib/vibe/http/limits.js';
import { validateJob } from '../../../public/vibe-v2/shared/contracts/schemas.js';

function setup() {
  const clock = { t: 1_000_000 };
  const kv = createMemoryKv({ now: () => clock.t });
  return { clock, kv, jobs: createJobStore(kv, { now: () => clock.t }) };
}
const base = { ownerId: 's_owner', projectId: 'p_proj0001', baseRevision: 3 };

test('create: requestId 멱등 — 10회 동시 재전송해도 job 1개', async () => {
  const { jobs, kv } = setup();
  const rs = await Promise.all(Array.from({ length: 10 }, () => jobs.create({ ...base, requestId: 'req-dup-0001' }).catch(e => e)));
  const ok = rs.filter(r => !(r instanceof Error));
  assert.equal(new Set(ok.map(r => r.job.jobId)).size, 1);
  assert.equal(ok.filter(r => r.created).length, 1);
  assert.deepEqual(validateJob(ok[0].job), []);
  assert.equal(await kv.zcard('jobs:active'), 1);
});

test('OP05: lease 만료 후 다른 worker가 인수, 동시에 처리하는 worker는 1개', async () => {
  const { jobs, clock } = setup();
  const { job } = await jobs.create({ ...base, requestId: 'req-lease-01' });

  // 5개 worker가 동시에 claim → 정확히 1개만 성공
  const claims = await Promise.all(['w1', 'w2', 'w3', 'w4', 'w5'].map(w => jobs.claimNext(w, 5_000)));
  const winners = claims.filter(Boolean);
  assert.equal(winners.length, 1);
  const first = winners[0].lease.workerId;
  const other = first === 'w1' ? 'w2' : 'w1';
  await jobs.transition(job.jobId, 'planning', { workerId: first });

  // 살아 있는 lease: 다른 worker는 전이·lease 불가
  await assert.rejects(jobs.transition(job.jobId, 'generating', { workerId: other }), e => e instanceof JobError && e.kind === 'LEASE_HELD');
  assert.equal((await jobs.lease(job.jobId, other, 5_000)).ok, false);
  assert.deepEqual(await jobs.reclaimable(), []);

  // heartbeat로 연장
  clock.t += 4_000;
  assert.equal((await jobs.heartbeat(job.jobId, first, 5_000)).ok, true);
  clock.t += 4_000;
  assert.equal((await jobs.lease(job.jobId, other, 5_000)).ok, false);

  // 첫 worker가 죽음(heartbeat 없음) → 만료 → 회수
  clock.t += 6_000;
  assert.deepEqual(await jobs.reclaimable(), [job.jobId]);
  const takeovers = await Promise.all(['w6', 'w7', 'w8'].map(w => jobs.claimNext(w, 5_000)));
  assert.equal(takeovers.filter(Boolean).length, 1);
  const second = takeovers.find(Boolean).lease.workerId;
  // 옛 worker는 더 이상 쓸 수 없다
  await assert.rejects(jobs.transition(job.jobId, 'generating', { workerId: first }), e => e.kind === 'LEASE_HELD');
  assert.equal((await jobs.heartbeat(job.jobId, first, 5_000)).ok, false);
  await jobs.transition(job.jobId, 'generating', { workerId: second });
  assert.equal((await jobs.get(job.jobId)).status, 'generating');
  await jobs.release(job.jobId, second);
  assert.deepEqual(await jobs.reclaimable(), [job.jobId]);
});

test('불법 job 전이 거부, 종결 후 전이 불가, applied는 transition으로 도달 불가', async () => {
  const { jobs, kv } = setup();
  const { job } = await jobs.create({ ...base, requestId: 'req-trans-01' });
  const illegal = e => e instanceof JobError && e.kind === 'ILLEGAL_TRANSITION';
  await assert.rejects(jobs.transition(job.jobId, 'validating'), illegal);
  await assert.rejects(jobs.transition(job.jobId, 'ready', { candidate: { hash: 'abcdef0123456789', patch: {}, changes: [] } }), illegal);
  await assert.rejects(jobs.transition(job.jobId, 'applied'), illegal);
  await assert.rejects(jobs.transition(job.jobId, 'bogus'), illegal);
  await jobs.transition(job.jobId, 'planning');
  await assert.rejects(jobs.transition(job.jobId, 'ready'), e => e.kind === 'INVALID'); // 후보 없이 ready 금지
  await jobs.transition(job.jobId, 'failed', { studentMessage: '만들지 못했어요.' });
  assert.equal(await kv.zcard('jobs:active'), 0);
  for (const s of ['planning', 'cancelled', 'queued', 'ready']) await assert.rejects(jobs.transition(job.jobId, s), illegal);
  // 종결 job 취소는 반복 안전 (상태 유지)
  const c = await jobs.cancel(job.jobId, { ownerId: base.ownerId });
  assert.equal(c.ok, true); assert.equal(c.job.status, 'failed');
  assert.equal((await jobs.lease(job.jobId, 'w1', 1000)).ok, false);
});

test('취소: 반복 안전, 취소 후 beginApply 불가, apply 중에는 취소 거부', async () => {
  const { jobs } = setup();
  const cand = { hash: 'abcdef0123456789', patch: {}, changes: [] };
  const a = (await jobs.create({ ...base, requestId: 'req-cancel-1' })).job;
  await jobs.transition(a.jobId, 'planning');
  for (let i = 0; i < 3; i++) assert.equal((await jobs.cancel(a.jobId, { ownerId: base.ownerId })).job.status, 'cancelled');
  await assert.rejects(jobs.beginApply(a.jobId, base.ownerId, 'tok'), e => e.kind === 'NOT_READY');
  assert.equal((await jobs.cancel(a.jobId, { ownerId: 's_other' })).reason, 'NOT_FOUND');

  const b = (await jobs.create({ ...base, requestId: 'req-cancel-2' })).job;
  await jobs.transition(b.jobId, 'planning');
  await jobs.transition(b.jobId, 'ready', { candidate: cand });
  await jobs.beginApply(b.jobId, base.ownerId, 'tok-b');
  assert.equal((await jobs.cancel(b.jobId, { ownerId: base.ownerId })).reason, 'APPLYING');
  await jobs.finishApply(b.jobId, 'tok-b', 4);
  const ev = await jobs.events(b.jobId, { ownerId: base.ownerId, after: 2 });
  assert.deepEqual(ev.events.map(e => e.status), ['ready', 'applied']);
  assert.equal(await jobs.events(b.jobId, { ownerId: 's_other' }), null);
});

test('동시 실행 슬롯: 조직 4 · 학생 1 · 프로젝트 1, lease 만료 시 자동 회수', async () => {
  const clock = { t: 5_000_000 };
  const kv = createMemoryKv({ now: () => clock.t });
  const now = () => clock.t;
  const a = await acquireGenerationSlots(kv, { studentId: 's_a', projectId: 'p_a', now });
  assert.equal(a.ok, true);
  assert.equal((await acquireGenerationSlots(kv, { studentId: 's_a', projectId: 'p_other', now })).ok, false, '학생 1');
  assert.equal((await acquireGenerationSlots(kv, { studentId: 's_b', projectId: 'p_a', now })).ok, false, '프로젝트 1');
  const more = await Promise.all(['b', 'c', 'd', 'e', 'f'].map(x => acquireGenerationSlots(kv, { studentId: 's_' + x, projectId: 'p_' + x, now })));
  assert.equal(more.filter(r => r.ok).length, 3, '조직 LLM 4');
  // 실패한 시도는 잡았던 학생·프로젝트 슬롯을 돌려놓는다
  const failed = more.find(r => !r.ok);
  assert.equal(failed.scope, 'orgLlm');
  await a.release();
  assert.equal((await acquireGenerationSlots(kv, { studentId: 's_a', projectId: 'p_a2', now })).ok, true);
  // lease 만료
  clock.t += 60_000;
  const s = await acquireSlot(kv, { scope: 'orgLlm', id: 'default', limit: 4, now });
  assert.equal(s.ok, true);
  await releaseSlot(kv, { scope: 'orgLlm', id: 'default', token: s.token });
});
