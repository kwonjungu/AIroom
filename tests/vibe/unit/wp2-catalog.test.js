// WP2 미션 카탈로그 — 모든 makeProject 결과가 계약을 통과하고, 진도에 따라 상태가 정해진다.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getCatalog, markDone, nextMission, findMission } from '../../../public/vibe-v2/modes/cards/catalog.js';
import { validateProject } from '../../../public/vibe-v2/shared/contracts/schemas.js';
import { createProjectStore } from '../../../public/vibe-v2/state/store.js';

const allMissions = cat => cat.flatMap(g => g.missions.map(m => ({ ...m, mode: g.mode })));

test('모든 makeProject 결과가 validateProject를 통과(진단 0)', () => {
  const cat = getCatalog(null);
  const list = allMissions(cat);
  assert.equal(list.length, 26);
  for (const m of list) {
    const p = m.makeProject();
    assert.deepEqual(validateProject(p), [], m.id);
    assert.equal(p.mode, m.mode);
    assert.equal(p.learning.missionId, m.id);
    assert.equal(p.learning.missionVersion, '2');
    assert.doesNotThrow(() => createProjectStore(p));
  }
});

test('카탈로그 모양: 그룹·미션 필드', () => {
  const cat = getCatalog();
  assert.deepEqual(cat.map(g => g.mode), ['goal', 'goal', 'shape', 'shape']);
  for (const g of cat) {
    assert.ok(g.id && g.title);
    for (const m of g.missions) {
      assert.ok(m.id && m.title && m.icon);
      assert.equal(typeof m.makeProject, 'function');
      assert.ok(['locked', 'current', 'done', 'open'].includes(m.status));
    }
  }
  const ids = allMissions(cat).map(m => m.id);
  assert.equal(new Set(ids).size, ids.length, '미션 id 고유');
});

test('두 번 만든 프로젝트는 id가 달라 서로 섞이지 않는다', () => {
  const m = allMissions(getCatalog())[0];
  assert.notEqual(m.makeProject().id, m.makeProject().id);
});

test('진도 없음: 모드마다 첫 미션만 current, 나머지 locked', () => {
  const list = allMissions(getCatalog(null));
  const goal = list.filter(m => m.mode === 'goal'), shape = list.filter(m => m.mode === 'shape');
  for (const l of [goal, shape]) {
    assert.equal(l[0].status, 'current');
    assert.ok(l.slice(1).every(m => m.status === 'locked'));
  }
});

test('완료한 미션은 done, 다음 미션이 current; unlockAll이면 open', () => {
  let progress = markDone(null, 'goal-1');
  progress = markDone(progress, 'goal-2');
  const list = allMissions(getCatalog(progress));
  const by = id => list.find(m => m.id === id).status;
  assert.equal(by('goal-1'), 'done');
  assert.equal(by('goal-2'), 'done');
  assert.equal(by('goal-3'), 'current');
  assert.equal(by('goal-4'), 'locked');
  const open = allMissions(getCatalog({ ...progress, unlockAll: true }));
  assert.equal(open.find(m => m.id === 'goal-1').status, 'done');
  assert.ok(open.filter(m => !['goal-1', 'goal-2'].includes(m.id)).every(m => m.status === 'open'));
  // markDone은 원본을 바꾸지 않는다
  const p0 = { done: ['x'] }; markDone(p0, 'y'); assert.deepEqual(p0.done, ['x']);
});

test('카드가 처음부터 놓이는 미션은 시작 프로그램에 카드가 있다', () => {
  const p = allMissions(getCatalog()).find(m => m.id === 'shape-9').makeProject();
  assert.deepEqual(p.program.entrypoints, ['s1', 's2']);
  assert.equal(p.program.nodes[0].args.color, '#90A4AE');
  const p1 = allMissions(getCatalog()).find(m => m.id === 'shape-1').makeProject();
  assert.deepEqual(p1.program.nodes, [], '순서 미션은 빈 줄에서 시작해 눌러서 찍는다');
});

test('nextMission / findMission', () => {
  assert.equal(nextMission('goal-1').id, 'goal-2');
  assert.equal(nextMission('goal-12'), null);
  assert.equal(findMission('shape-13').title, '눈사람');
  assert.equal(findMission(null), null);
});
