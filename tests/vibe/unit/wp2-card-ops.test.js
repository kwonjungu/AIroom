// WP2 카드 줄 편집 연산 + 저장소 — SH05(드롭 20회·undo 20회·미션 변경 후 중복/오염 0)의 논리 부분.
// 화면(포인터 드래그) 부분은 브라우저 확인 스크립트(evidence/wp2)에서 같은 시나리오를 돌린다.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as ops from '../../../public/vibe-v2/modes/cards/program-ops.js';
import { createProjectStore } from '../../../public/vibe-v2/state/store.js';
import { getCatalog } from '../../../public/vibe-v2/modes/cards/catalog.js';

const mission = id => getCatalog({ unlockAll: true }).flatMap(g => g.missions).find(m => m.id === id);
const clean = p => assert.deepEqual(ops.programIntegrity(p), { duplicateIds: 0, danglingRefs: 0, doubleRefs: 0, orphans: 0 });

test('SH05: 카드 20장 추가 → undo 20회 → 처음과 같음, 중복 id 0', () => {
  const store = createProjectStore(mission('goal-7').makeProject());
  const start = JSON.stringify(store.getProject().program);
  let counter = ops.maxIdNumber(store.getProject().program);
  for (let i = 0; i < 20; i++) {
    const prog = store.getProject().program;
    const kind = i % 5 === 0 ? 'repeat' : 'move';
    const node = { id: (kind === 'repeat' ? 'r' : 'c') + (++counter), kind, args: kind === 'repeat' ? { times: 2 } : {}, children: [] };
    const next = ops.insertNode(prog, node, null, i % 3 === 0 ? 0 : undefined);
    assert.ok(next);
    assert.equal(store.replaceProgram(next, { source: 'cards' }).ok, true);
    clean(store.getProject().program);
  }
  assert.equal(store.getProject().program.nodes.length, 20);
  for (let i = 0; i < 20; i++) assert.equal(store.undo(), true);
  assert.equal(JSON.stringify(store.getProject().program), start);
  assert.equal(store.undo(), false);
  // redo 후에도 중복 없음
  for (let i = 0; i < 20; i++) store.redo();
  assert.equal(store.getProject().program.nodes.length, 20);
  clean(store.getProject().program);
});

test('SH05: 같은 카드를 20번 옮겨도 개수 그대로', () => {
  const store = createProjectStore(mission('shape-9').makeProject());
  let prog = store.getProject().program;
  for (let i = 0; i < 20; i++) {
    const id = prog.entrypoints[0];
    prog = ops.moveNodeTo(prog, id, null, prog.entrypoints.length);
    store.replaceProgram(prog);
    prog = store.getProject().program;
  }
  assert.equal(prog.entrypoints.length, 2);
  clean(prog);
});

test('SH05: 미션 변경(store.load) 뒤 이전 미션 카드가 섞이지 않는다', () => {
  const store = createProjectStore(mission('shape-9').makeProject());
  const other = mission('shape-1').makeProject();
  assert.equal(store.load(other).ok, true);
  assert.deepEqual(store.getProject().program, { nodes: [], entrypoints: [] });
  assert.equal(store.getState().canUndo, false, '미션을 바꾸면 이전 미션으로 undo되지 않는다');
  assert.equal(store.getProject().learning.missionId, 'shape-1');
});

test('반복 카드 규칙: 반복 안에 반복 금지, 안쪽 카드 이동, 삭제 시 안쪽도 함께', () => {
  let p = ops.emptyProgram();
  p = ops.insertNode(p, { id: 'r1', kind: 'repeat', args: { times: 3 }, children: [] });
  p = ops.insertNode(p, { id: 'c2', kind: 'move', args: {}, children: [] }, 'r1');
  p = ops.insertNode(p, { id: 'c3', kind: 'turnLeft', args: {}, children: [] }, 'r1');
  assert.equal(ops.insertNode(p, { id: 'r4', kind: 'repeat', args: { times: 2 }, children: [] }, 'r1'), null);
  assert.deepEqual(ops.orderedCards(p).map(x => x.label), ['1', '1-1', '1-2']);
  const moved = ops.moveNode(p, 'c3', -1);
  assert.deepEqual(ops.getNode(moved, 'r1').children, ['c3', 'c2']);
  assert.equal(ops.moveNode(p, 'c2', -1), null, '맨 앞에서 더 앞으로는 못 간다');
  const out = ops.moveNodeTo(p, 'c2', null, 0);
  assert.deepEqual(out.entrypoints, ['c2', 'r1']);
  clean(out);
  const gone = ops.removeNode(p, 'r1');
  assert.deepEqual(gone, ops.emptyProgram());
  // 원본 불변
  assert.equal(p.nodes.length, 3);
});

test('같은 줄 안 드래그: 뒤로 옮길 때 삽입 위치 보정', () => {
  let p = ops.emptyProgram();
  for (const id of ['s1', 's2', 's3']) p = ops.insertNode(p, { id, kind: 'stamp', args: { shape: 'rect', anchor: 5, color: '#E53935', size: 'M' }, children: [] });
  assert.deepEqual(ops.moveNodeTo(p, 's1', null, 2).entrypoints, ['s2', 's1', 's3']);
  assert.deepEqual(ops.moveNodeTo(p, 's1', null, 3).entrypoints, ['s2', 's3', 's1']);
  assert.deepEqual(ops.moveNodeTo(p, 's3', null, 0).entrypoints, ['s3', 's1', 's2']);
});

test('속성 여러 개를 한 번에 바꾸면 undo 한 번으로 돌아간다 (store.applyPatch setParameter)', () => {
  const store = createProjectStore(mission('shape-9').makeProject());
  const before = JSON.stringify(store.getProject().program);
  const r = store.applyPatch({ schemaVersion: 1, baseRevision: store.getProject().revision, summary: '카드 속성', assetRequests: [],
    operations: [{ op: 'setParameter', nodeId: 's1', parameter: 'color', value: '#8D6E63' }, { op: 'setParameter', nodeId: 's1', parameter: 'size', value: 'M' }] });
  assert.equal(r.ok, true);
  assert.equal(store.getProject().program.nodes[0].args.color, '#8D6E63');
  store.undo();
  assert.equal(JSON.stringify(store.getProject().program), before);
});
