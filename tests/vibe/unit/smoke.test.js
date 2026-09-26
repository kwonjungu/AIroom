import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createMockGenerationClient } from '../../../public/vibe-v2/mocks/generation-mock.js';
import { catchGame } from '../../../public/vibe-v2/shared/contracts/fixtures.js';
import { validateJob } from '../../../public/vibe-v2/shared/contracts/schemas.js';

const req = (intentText, project = catchGame()) => ({ projectId: project.id, baseRevision: project.revision, intentText, mode: 'studio', requestId: 'req-00000001', project });

test('mock 생성: 성공 시 ready + 검증된 후보, Job 스키마 준수', async () => {
  const c = createMockGenerationClient({ delayMs: 1 });
  const j = await c.start(req('생선이 더 천천히'));
  const seen = [];
  const final = await c.watch(j.jobId, x => seen.push(x.status), { intervalMs: 1 });
  assert.equal(final.status, 'ready');
  assert.deepEqual(validateJob(final), []);
  assert.ok(final.candidate.changes[0].includes('fish-fall.speed'));
});

test('mock 생성: invalid/providerDown/timeout은 후보 없이 종결', async () => {
  for (const scenario of ['invalid', 'providerDown', 'timeout']) {
    const c = createMockGenerationClient({ delayMs: 1, scenario });
    const j = await c.start(req('생선이 더 천천히'));
    const final = await c.watch(j.jobId, null, { intervalMs: 1 });
    assert.ok(['failed', 'timed_out'].includes(final.status), scenario);
    assert.equal(final.candidate, null, scenario);
  }
});

test('mock 생성: 취소 후에는 ready가 되지 않는다', async () => {
  const c = createMockGenerationClient({ delayMs: 5 });
  const j = await c.start(req('빨리'));
  await c.cancel(j.jobId, 'req-00000001');
  await new Promise(r => setTimeout(r, 40));
  assert.equal((await c.get(j.jobId)).status, 'cancelled');
});
