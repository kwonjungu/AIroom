import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ALL_FIXTURES, catchGame, goalRepeat, shapeHouse } from '../../../public/vibe-v2/shared/contracts/fixtures.js';
import { validateProject, validateJob, validateAssetBrief, validateApiError, validatePatchShape } from '../../../public/vibe-v2/shared/contracts/schemas.js';
import { applyPatch, diffPrograms } from '../../../public/vibe-v2/shared/contracts/patch-apply.js';
import { createProjectStore } from '../../../public/vibe-v2/state/store.js';

const errors = d => d.filter(x => x.severity === 'error');

test('모든 fixture가 계약을 통과한다', () => {
  for (const [name, make] of Object.entries(ALL_FIXTURES)) {
    assert.deepEqual(errors(validateProject(make())), [], name);
  }
});

test('모르는 속성·범위 밖 값·다른 모드 노드를 거부한다', () => {
  const p = catchGame(); p.program.nodes[1].args.speed = 99999;
  assert.ok(errors(validateProject(p)).some(d => d.code === 'NODE_INVALID'));
  const q = catchGame(); q.program.nodes[0].args.evil = 1;
  assert.ok(errors(validateProject(q)).some(d => d.code === 'NODE_INVALID'));
  const r = shapeHouse(); r.program.nodes.push({ id: 'x', kind: 'player', args: {}, children: [] }); r.program.entrypoints.push('x');
  assert.ok(errors(validateProject(r)).some(d => d.code === 'NODE_KIND_NOT_ALLOWED'));
  const s = catchGame(); s.extra = true;
  assert.ok(errors(validateProject(s)).some(d => d.code === 'SCHEMA_INVALID'));
});

test('그래프 검사: 순환·중복 ID·깊이 초과', () => {
  const p = goalRepeat(); p.program.nodes[1] = { id: 'c1', kind: 'repeat', args: { times: 2 }, children: ['r1'] };
  assert.ok(errors(validateProject(p)).some(d => d.code === 'ENTRYPOINT_IS_CHILD' || d.code === 'CYCLE'));
  const q = goalRepeat(); q.program.nodes.push({ id: 'c1', kind: 'move', args: {}, children: [] });
  assert.ok(errors(validateProject(q)).some(d => d.code === 'DUPLICATE_NODE_ID'));
  const deep = goalRepeat(); deep.program.nodes = []; deep.program.entrypoints = ['r0'];
  for (let i = 0; i < 10; i++) deep.program.nodes.push({ id: 'r' + i, kind: 'repeat', args: { times: 2 }, children: i < 9 ? ['r' + (i + 1)] : [] });
  assert.ok(errors(validateProject(deep)).some(d => d.code === 'TOO_DEEP'));
});

test('setParameter는 범위 안에서만, 원본을 변경하지 않는다', () => {
  const p = catchGame();
  const snapshot = JSON.stringify(p);
  const ok = applyPatch(p, { schemaVersion: 1, baseRevision: 0, summary: '생선이 천천히', operations: [{ op: 'setParameter', nodeId: 'fish-fall', parameter: 'speed', value: 90 }], assetRequests: [] });
  assert.equal(ok.ok, true);
  assert.equal(ok.project.revision, 1);
  assert.equal(ok.project.program.nodes.find(n => n.id === 'fish-fall').args.speed, 90);
  assert.equal(JSON.stringify(p), snapshot, '입력 불변');
  const bad = applyPatch(p, { schemaVersion: 1, baseRevision: 0, summary: 'x', operations: [{ op: 'setParameter', nodeId: 'fish-fall', parameter: 'speed', value: 5000 }], assetRequests: [] });
  assert.equal(bad.ok, false); assert.equal(bad.diagnostics[0].code, 'VALUE_OUT_OF_RANGE');
  const notEditable = applyPatch(p, { schemaVersion: 1, baseRevision: 0, summary: 'x', operations: [{ op: 'setParameter', nodeId: 'fish-fall', parameter: 'entity', value: 'bomb' }], assetRequests: [] });
  assert.equal(notEditable.diagnostics[0].code, 'PARAMETER_NOT_EDITABLE');
});

test('baseRevision 불일치는 REVISION_CONFLICT', () => {
  const r = applyPatch(catchGame(), { schemaVersion: 1, baseRevision: 3, summary: 'x', operations: [{ op: 'removeBehavior', nodeId: 'lose' }], assetRequests: [] });
  assert.equal(r.diagnostics[0].code, 'REVISION_CONFLICT');
});

test('폭탄 추가 → 속도만 변경: 관계 없는 규칙 보존 (ST03 계약 수준)', () => {
  let p = catchGame();
  const add = applyPatch(p, { schemaVersion: 1, baseRevision: 0, summary: '폭탄 추가', operations: [
    { op: 'addBehavior', parentId: null, node: { id: 'bomb-fall', kind: 'spawner', args: { entity: 'bomb', appearance: 'bomb.appearance', pattern: 'fallFromTop', intervalMs: 2000, speed: 160, maxAlive: 3, count: 0, radius: 20 }, children: [] } },
    { op: 'addBehavior', parentId: null, node: { id: 'touch-bomb', kind: 'onTouch', args: { entity: 'bomb', effects: [{ do: 'loseLife' }, { do: 'removeOther' }] }, children: [] } },
    { op: 'setParameter', nodeId: 'stats', parameter: 'lives', value: 3 },
  ], assetRequests: [] });
  assert.equal(add.ok, true, JSON.stringify(add.diagnostics));
  const slow = applyPatch(add.project, { schemaVersion: 1, baseRevision: 1, summary: '생선 천천히', operations: [{ op: 'setParameter', nodeId: 'fish-fall', parameter: 'speed', value: 80 }], assetRequests: [] });
  const d = diffPrograms(add.project, slow.project);
  assert.deepEqual(d.added, []); assert.deepEqual(d.removed, []);
  assert.deepEqual(d.changed, [{ nodeId: 'fish-fall', parameter: 'speed', before: 120, after: 80 }]);
});

test('잘못된 patch 모양(작업 13개, 모르는 op)을 거부', () => {
  const ops = Array.from({ length: 13 }, () => ({ op: 'removeBehavior', nodeId: 'lose' }));
  assert.ok(validatePatchShape({ schemaVersion: 1, baseRevision: 0, summary: 'x', operations: ops, assetRequests: [] }).length > 0);
  assert.ok(validatePatchShape({ schemaVersion: 1, baseRevision: 0, summary: 'x', operations: [{ op: 'eval', code: 'x' }], assetRequests: [] }).length > 0);
});

test('store: undo/redo는 revision을 계속 올리고 lastGood를 보존', () => {
  const s = createProjectStore(catchGame(), { now: () => '2026-09-26T01:00:00.000Z' });
  const r = s.applyPatch({ schemaVersion: 1, baseRevision: 0, summary: 'x', operations: [{ op: 'setParameter', nodeId: 'player', parameter: 'speed', value: 400 }], assetRequests: [] });
  assert.equal(r.ok, true);
  assert.equal(s.markRunnable(1), true);
  s.undo();
  assert.equal(s.getProject().revision, 2);
  assert.equal(s.getProject().program.nodes[1].args.speed, 320);
  s.redo();
  assert.equal(s.getProject().program.nodes[1].args.speed, 400);
  // 이전 revision 기반 patch는 거부
  const stale = s.applyPatch({ schemaVersion: 1, baseRevision: 1, summary: 'x', operations: [{ op: 'setParameter', nodeId: 'player', parameter: 'speed', value: 100 }], assetRequests: [] });
  assert.equal(stale.ok, false);
  assert.equal(s.getState().lastGood.revision, 1);
});

test('Job·AssetBrief·ApiError 스키마', () => {
  assert.deepEqual(validateJob({ jobId: 'j_abcd1', projectId: 'p_x', baseRevision: 0, requestId: 'req-12345678', status: 'ready', studentMessage: '준비됐어요', candidate: { hash: 'abcdef0123456789', patch: {}, changes: ['속도 3→5'] }, diagnostics: [], attempts: 1, createdAt: '2026-09-26T00:00:00Z', updatedAt: '2026-09-26T00:00:00Z' }), []);
  assert.ok(validateJob({ jobId: 'j_abcd1', projectId: 'p_x', baseRevision: 0, requestId: 'req-12345678', status: 'ready', studentMessage: '', candidate: null, diagnostics: [], attempts: 4, createdAt: '2026-09-26T00:00:00Z', updatedAt: '2026-09-26T00:00:00Z' }).length > 0, 'attempts>3 거부');
  assert.deepEqual(validateAssetBrief({ schemaVersion: 1, projectId: 'p_demo', baseRevision: 8, slotId: 'player.appearance', kind: 'sprite', subject: '파란 목도리를 한 고양이', stylePack: 'toto-world-v1', dimensions: { width: 512, height: 512 }, transparent: true, pose: 'front-idle', paletteId: 'warm-adventure', textInImage: false }), []);
  assert.deepEqual(validateApiError({ error: { code: 'REVISION_CONFLICT', message: '작품이 바뀌었어요', retryable: false, retryAfterMs: null, requestId: 'r1' } }), []);
});
