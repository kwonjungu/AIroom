// WP4 템플릿: 네 장르 계약 통과·smoke replay(ST01), params 범위, applyPatch({instantiate}) 연동, fixture 호환.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  TEMPLATES, MAZE_MAPS, instantiate, instantiateTemplate, checkTemplateParams, createTemplateProject, runSmoke,
} from '../../../public/vibe-v2/shared/templates/index.js';
import { checkStudioSemantics } from '../../../public/vibe-v2/shared/compiler/semantic.js';
import { validateProject } from '../../../public/vibe-v2/shared/contracts/schemas.js';
import { applyPatch, diffPrograms } from '../../../public/vibe-v2/shared/contracts/patch-apply.js';
import { catchGame } from '../../../public/vibe-v2/shared/contracts/fixtures.js';
import { simulate } from '../../../public/vibe-v2/shared/runtime/simulate.js';

const NOW = { now: '2026-09-26T00:00:00.000Z' };
const errors = d => d.filter(x => x.severity === 'error');
const IDS = ['catch', 'avoid', 'collect', 'maze'];
const patch = (base, operations) => ({ schemaVersion: 1, baseRevision: base.revision, summary: '테스트', operations, assetRequests: [] });

test('TEMPLATES 메타: 네 장르 모두 제목·아이콘·조작법·학생이 바꾸는 것·params 기본값이 범위 안', () => {
  assert.deepEqual(Object.keys(TEMPLATES), IDS);
  for (const t of Object.values(TEMPLATES)) {
    assert.ok(t.title && t.icon && t.controls.keyboard && t.controls.touch && t.studentChanges.length >= 3, t.id);
    for (const [k, s] of Object.entries(t.params)) {
      if (s.type === 'int') assert.ok(s.default >= s.min && s.default <= s.max, `${t.id}.${k}`);
      else assert.ok(s.values.includes(s.default), `${t.id}.${k}`);
    }
  }
});

test('네 템플릿 기본값·여러 params 조합이 validateProject + checkStudioSemantics 통과', () => {
  const combos = {
    catch: [{}, { hero: 'robot', item: 'star', goal: 20, fallSpeed: 400, spawnEveryMs: 400, timeLimitSec: 120 }, { goal: 1, timeLimitSec: 10 }],
    avoid: [{}, { hazard: 'bomb', lives: 1, surviveSec: 5, fallSpeed: 500, spawnEveryMs: 200, invincibleMs: 3000 }, { lives: 9, surviveSec: 300 }],
    collect: [{}, { gemCount: 20, goal: 99, hazard: 'bomb', timeLimitSec: 300 }, { gemCount: 1 }],
    maze: [{}, ...Object.keys(MAZE_MAPS).map(map => ({ map })), { speed: 80, timeLimitSec: 30 }],
  };
  for (const id of IDS) {
    for (const params of combos[id]) {
      const r = createTemplateProject(id, params, NOW);
      assert.ok(r.ok, `${id} ${JSON.stringify(params)} ${JSON.stringify(r.diagnostics)}`);
      assert.deepEqual(errors(validateProject(r.project)), [], id);
      assert.deepEqual(errors(checkStudioSemantics(r.project)), [], id);
      assert.equal(r.project.templateId, id);
    }
  }
});

test('ST01/smoke: 네 장르 모두 여러 seed에서 자동 플레이 → 기록·재생 trace 동일 + 장르 규칙 통과', () => {
  for (const id of IDS) {
    const { project } = createTemplateProject(id, {}, NOW);
    for (const seed of [1, 7, 2026]) {
      const r = runSmoke(project, { seed });
      assert.ok(r.ok, `${id} seed ${seed}: ${r.problems.join(' / ')}`);
    }
  }
  // 미로는 재사용한 v1 맵 전부 탈출 가능
  for (const map of Object.keys(MAZE_MAPS)) {
    const { project } = createTemplateProject('maze', { map }, NOW);
    const r = runSmoke(project, { seed: 1 });
    assert.ok(r.ok, `maze ${map}: ${r.problems.join(' / ')}`);
  }
});

test('smoke 기대값: 받기=목표 점수, 피하기=가만히 있으면 목숨 수만큼 맞고 패배, 모으기=목표만큼 수집, 미로=도착', () => {
  const c = runSmoke(createTemplateProject('catch', { goal: 12 }, NOW).project, { seed: 3 });
  assert.equal(c.result.finalSnapshot.score, 12);
  const a = runSmoke(createTemplateProject('avoid', { lives: 4 }, NOW).project, { seed: 3 });
  assert.equal(a.result.trace.filter(e => e.type === 'hit').length, 4);
  assert.equal(a.result.finalSnapshot.state, 'lost');
  const m = runSmoke(createTemplateProject('collect', { gemCount: 3, goal: 7 }, NOW).project, { seed: 3, ticks: 60 * 120 });
  assert.ok(m.ok, m.problems.join('/'));
  assert.equal(m.result.trace.filter(e => e.type === 'collect').length, 7, '보충된 보석까지 모아 목표 달성');
  const z = runSmoke(createTemplateProject('maze', { map: 'twoCorners' }, NOW).project, { seed: 3 });
  assert.equal(z.result.finalSnapshot.state, 'won');
});

test('smoke가 실제로 규칙 위반을 잡는다 (자기검증)', () => {
  const { project } = createTemplateProject('catch', {}, NOW);
  project.program.nodes.find(n => n.kind === 'winWhen').args.value = 9999; // 도달 불가
  const r = runSmoke(project, { seed: 1, ticks: 600 });
  assert.equal(r.ok, false);
  assert.ok(r.problems.some(p => p.includes('목표')));
});

test('params 범위 검사: 모르는 키·범위 밖·잘못된 선택지·장르 성립 조건 → 진단, instantiate는 null', () => {
  assert.ok(checkTemplateParams('catch', { speed: 3 }).some(d => d.code === 'TEMPLATE_PARAM_UNKNOWN'));
  assert.ok(checkTemplateParams('catch', { goal: 0 }).some(d => d.code === 'TEMPLATE_PARAM_OUT_OF_RANGE'));
  assert.ok(checkTemplateParams('catch', { goal: 2.5 }).some(d => d.code === 'TEMPLATE_PARAM_OUT_OF_RANGE'));
  assert.ok(checkTemplateParams('avoid', { hero: 'dragon' }).some(d => d.code === 'TEMPLATE_PARAM_INVALID'));
  assert.ok(checkTemplateParams('catch', { goal: 50, timeLimitSec: 10 }).some(d => d.code === 'TEMPLATE_GOAL_TOO_HIGH'));
  assert.ok(checkTemplateParams('jump', {}).some(d => d.code === 'UNKNOWN_TEMPLATE'));
  assert.equal(instantiate('catch', { goal: 999 }, catchGame()), null);
  assert.equal(instantiate('jump', {}, catchGame()), null);
  const r = instantiateTemplate('avoid', { lives: 0 });
  assert.equal(r.ok, false);
  assert.ok(r.diagnostics[0].studentHint.includes('1부터 9'));
});

test('applyPatch({instantiate}): 템플릿 교체 → 계약·의미 통과, revision+1, 실행 가능', () => {
  const base = catchGame();
  const r = applyPatch(base, patch(base, [{ op: 'instantiateTemplate', templateId: 'avoid', params: { lives: 5 } }]), { instantiate, ...NOW });
  assert.ok(r.ok, JSON.stringify(r.diagnostics));
  assert.equal(r.project.templateId, 'avoid');
  assert.equal(r.project.revision, 1);
  assert.deepEqual(errors(checkStudioSemantics(r.project)), []);
  assert.equal(r.project.program.nodes.find(n => n.kind === 'stats').args.lives, 5);
  // 주인공 모습을 따로 지정하지 않았으면 기존 작품의 주인공 에셋 유지
  assert.equal(r.project.assets.find(a => a.slotId === 'player.appearance').preset, 'emoji:🐱');
  assert.ok(['playing', 'won', 'lost'].includes(simulate(r.project, { seed: 1, ticks: 300 }).finalSnapshot.state));
  // 원본 불변
  assert.equal(base.templateId, 'catch');
  // 알 수 없는 템플릿·잘못된 params·instantiate 미제공
  assert.equal(applyPatch(base, patch(base, [{ op: 'instantiateTemplate', templateId: 'jump', params: {} }]), { instantiate }).diagnostics[0].code, 'UNKNOWN_TEMPLATE');
  assert.equal(applyPatch(base, patch(base, [{ op: 'instantiateTemplate', templateId: 'catch', params: { goal: -1 } }]), { instantiate }).ok, false);
  assert.equal(applyPatch(base, patch(base, [{ op: 'instantiateTemplate', templateId: 'catch', params: {} }])).diagnostics[0].code, 'TEMPLATE_UNAVAILABLE');
});

test('ST03 흐름: 받기 생성 → 폭탄·목숨 추가 → 사과 속도만 변경, 관계 없는 규칙·에셋·목표 유지', () => {
  const { project: p0 } = createTemplateProject('catch', { hero: 'cat', item: 'fish', goal: 10 }, NOW);
  const add = applyPatch(p0, patch(p0, [
    { op: 'addBehavior', parentId: null, node: { id: 'bomb-fall', kind: 'spawner', args: { entity: 'bomb', appearance: 'bomb.appearance', pattern: 'fallFromTop', intervalMs: 2000, speed: 180, maxAlive: 4, count: 0, radius: 22 }, children: [] } },
    { op: 'addBehavior', parentId: null, node: { id: 'touch-bomb', kind: 'onTouch', args: { entity: 'bomb', effects: [{ do: 'loseLife' }, { do: 'removeOther' }] }, children: [] } },
    { op: 'setParameter', nodeId: 'stats', parameter: 'lives', value: 3 },
    { op: 'setParameter', nodeId: 'stats', parameter: 'invincibleMs', value: 1000 },
    { op: 'addBehavior', parentId: null, node: { id: 'lose-lives', kind: 'loseWhen', args: { stat: 'livesZero' }, children: [] } },
    { op: 'setAppearance', nodeId: 'bomb-fall', slotId: 'bomb.appearance', preset: 'emoji:💣' },
  ]), NOW);
  assert.ok(add.ok, JSON.stringify(add.diagnostics));
  assert.deepEqual(errors(checkStudioSemantics(add.project)), []);
  const slow = applyPatch(add.project, patch(add.project, [{ op: 'setParameter', nodeId: 'fish-fall', parameter: 'speed', value: 90 }]), NOW);
  assert.ok(slow.ok);
  const diff = diffPrograms(add.project, slow.project);
  assert.deepEqual(diff.added, []);
  assert.deepEqual(diff.removed, []);
  assert.deepEqual(diff.changed, [{ nodeId: 'fish-fall', parameter: 'speed', before: 140, after: 90 }]);
  assert.deepEqual(slow.project.assets, add.project.assets);
  const r = simulate(slow.project, { seed: 5, ticks: 3600 });
  assert.ok(r.trace.some(e => e.type === 'spawn' && e.entity === 'bomb'));
  const hits = r.trace.filter(e => e.type === 'hit');
  if (r.finalSnapshot.state === 'lost' && r.trace.at(-1).reason === 'livesZero') assert.equal(hits.length, 3);
});

test('fixture 호환: catchGame(받기)은 의미 검증·smoke 통과', () => {
  const p = catchGame();
  assert.deepEqual(errors(checkStudioSemantics(p)), []);
  const r = runSmoke(p, { seed: 1 });
  assert.ok(r.ok, r.problems.join(' / '));
});
