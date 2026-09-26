// WP8 이관 미션 replay — 모든 미션의 정답은 완료, 알려진 오답은 거부, 빈 작품은 0점.
// 기대값은 미션 의도에서 나온다: 거북이=목표 도형, 픽셀=목표 격자(칸 단위)·버튼 그림, 미로=보물 도착+보석 전부.
// 채점기 출력을 정답으로 저장하지 않는다(ACCEPTANCE §2 채점 fixture 원칙).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { allLearningMissions, getLearningCatalog, makeLearningProject, findLearningMission, nextLearningMission, markLearningDone } from '../../../public/vibe-v2/modes/learning/catalog.js';
import { gradeMission, gradePixel } from '../../../public/vibe-v2/modes/learning/grade.js';
import { TURTLE_MISSIONS } from '../../../public/vibe-v2/modes/learning/missions/turtle.js';
import { PIXEL_MISSIONS } from '../../../public/vibe-v2/modes/learning/missions/pixel.js';
import { MAZE_MISSIONS } from '../../../public/vibe-v2/modes/learning/missions/maze.js';
import { parsePixel, runPixel, runEvent, PIXEL_ICONS } from '../../../public/vibe-v2/modes/learning/engines/pixel.js';
import { parseMaze, runMaze, mazeSolvable, countBlocks } from '../../../public/vibe-v2/modes/learning/engines/maze.js';
import { parseTurtle } from '../../../public/vibe-v2/modes/learning/engines/turtle.js';
import { validateProject } from '../../../public/vibe-v2/shared/contracts/schemas.js';
import { createProjectStore } from '../../../public/vibe-v2/state/store.js';
import { chaptersForPath, describeMission } from '../../../public/vibe-v2/ui/catalog.js';

test('v1 미션 수 그대로 이관: 거북이 21 · 픽셀 18 · 미로 12', () => {
  assert.equal(TURTLE_MISSIONS.length, 21);
  assert.equal(PIXEL_MISSIONS.length, 18);
  assert.equal(MAZE_MISSIONS.length, 12);
  // v1 id 모두 존재(순서는 v1 배열 순서)
  assert.deepEqual(TURTLE_MISSIONS.map(m => m.legacyId), [1, 2, 3, 4, 7, 5, 6, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21]);
  assert.deepEqual(PIXEL_MISSIONS.map(m => m.legacyId), Array.from({ length: 18 }, (_, i) => i + 1));
  assert.deepEqual(MAZE_MISSIONS.map(m => m.legacyId), Array.from({ length: 12 }, (_, i) => i + 1));
  for (const m of allLearningMissions()) {
    assert.ok(m.story && m.tip && m.hint && m.title, m.id + ' 스토리·정리·힌트');
    assert.ok(m.answers.length >= 1 && m.wrong.length >= 1, m.id + ' 정답 1개·오답 1개 이상');
  }
});

for (const m of allLearningMissions()) {
  test(`replay ${m.id} ${m.title}: 정답 완료 · 오답 거부`, () => {
    for (const a of m.answers) {
      const p = parseTurtleOrOther(m.mode, a);
      assert.deepEqual(p.diagnostics.filter(d => d.severity === 'error'), [], `${m.id} 정답에 파싱 오류`);
      const r = gradeMission(m.mode, m, a);
      assert.equal(r.complete, true, `${m.id} 정답 거부: ${r.hint} ${JSON.stringify(r.detail)}`);
    }
    for (const w of m.wrong) {
      const r = gradeMission(m.mode, m, w);
      assert.equal(r.complete, false, `${m.id} 오답 통과: ${JSON.stringify(w)}`);
      assert.ok(r.hint && r.hint.length <= 120, 'hint 한 문장');
    }
  });
}

function parseTurtleOrOther(mode, src) {
  if (mode === 'turtle') return parseTurtle(src);
  if (mode === 'pixel') return parsePixel(src);
  return parseMaze(src);
}

test('거북이: v1 목표 DSL 자체도 완료(100점), 거울·풀어쓰기 동등 정답 인정', () => {
  for (const m of TURTLE_MISSIONS.filter(x => x.target)) {
    const r = gradeMission('turtle', m, m.target);
    assert.equal(r.complete, true, m.id);
    assert.equal(r.score, 100, m.id);
  }
});

test('픽셀: 정답 DSL의 결과 격자 = 목표 격자(칸 단위) — 채점기 없이 직접 비교', () => {
  for (const m of PIXEL_MISSIONS.filter(x => x.targetGrid)) {
    const g = runPixel(parsePixel(m.answers[0]).commands, { size: m.gridSize }).grid;
    for (let y = 0; y < m.gridSize; y++) for (let x = 0; x < m.gridSize; x++) {
      assert.equal(!!g[y][x], !!m.targetGrid[y][x], `${m.id} (${x + 1},${y + 1})`);
    }
  }
});

test('픽셀 9번(버튼 이벤트): A→하트, B→엑스 (v1 PIXEL_ICONS 기준)', () => {
  const m = PIXEL_MISSIONS.find(x => x.legacyId === 9);
  const base = runPixel(parsePixel(m.answers[0]).commands, { size: 5 });
  const a = runEvent(base, 'A', { size: 5 }), b = runEvent(base, 'B', { size: 5 });
  assert.deepEqual(a.grid.map(r => r.map(v => (v ? 1 : 0))), PIXEL_ICONS.HEART);
  assert.deepEqual(b.grid.map(r => r.map(v => (v ? 1 : 0))), PIXEL_ICONS.X);
});

test('미로: 모든 지도가 S→보석 전부→G 도달 가능(BFS, 정답 코드와 독립)', () => {
  for (const m of MAZE_MISSIONS) assert.equal(mazeSolvable(m), true, m.id);
});

test('미로: v1 solution의 블록 수 = par (v1 별 3개 기준과 일치)', () => {
  for (const m of MAZE_MISSIONS) assert.equal(countBlocks(parseMaze(m.answers[0]).commands), m.par, m.id);
});

test('미로: 정답은 G에서 끝나고 보석을 모두 줍는다', () => {
  for (const m of MAZE_MISSIONS) {
    const r = runMaze(parseMaze(m.answers[0]).commands, m);
    assert.equal(r.result, 'goal', m.id);
    assert.equal(r.collected.length, r.gemsTotal, m.id);
  }
});

test('빈 작품은 모든 미션에서 0점·완료 불가 (v1 픽셀 빈 격자 96% 회귀)', () => {
  for (const m of allLearningMissions()) {
    for (const src of ['', '   \n\n', '// 주석만']) {
      const r = gradeMission(m.mode, m, src);
      assert.equal(r.complete, false, m.id);
      assert.equal(r.score, 0, `${m.id} ${JSON.stringify(src)}`);
    }
  }
  // v1 updateMatchMeter 방식이면 '점 하나'(5×5 중 1칸) 빈 격자가 24/25=96%
  const dot = PIXEL_MISSIONS[0];
  assert.equal(gradePixel(dot, '').score, 0);
});

test('카탈로그: 모든 makeProject가 계약·store를 통과, 순서 잠금, 다음 미션', () => {
  const cat = getLearningCatalog(null);
  const ms = cat.flatMap(ch => ch.missions.map(m => ({ ...m, mode: ch.mode })));
  assert.equal(ms.length, 51);
  assert.deepEqual([...new Set(cat.map(c => c.mode))], ['turtle', 'pixel', 'maze']);
  for (const m of ms) {
    const p = m.makeProject();
    assert.deepEqual(validateProject(p), [], m.id);
    assert.equal(p.mode, m.mode);
    assert.equal(p.learning.missionId, m.id);
    assert.equal(p.program.nodes[0].kind, 'legacySource');
    assert.equal(p.program.nodes[0].args.language, m.mode + '-dsl-1');
    assert.doesNotThrow(() => createProjectStore(p));
    assert.ok(findLearningMission(m.id));
  }
  // 모드마다 첫 미션만 current
  for (const mode of ['turtle', 'pixel', 'maze']) {
    const list = ms.filter(m => m.mode === mode);
    assert.equal(list[0].status, 'current');
    assert.ok(list.slice(1).every(m => m.status === 'locked'));
  }
  const prog = markLearningDone(null, 'turtle-1');
  const cat2 = getLearningCatalog(prog).flatMap(c => c.missions);
  assert.equal(cat2.find(m => m.id === 'turtle-1').status, 'done');
  assert.equal(cat2.find(m => m.id === 'turtle-2').status, 'current');
  assert.ok(getLearningCatalog({ unlockAll: true }).flatMap(c => c.missions).every(m => m.status === 'open'));
  assert.equal(nextLearningMission('turtle-4').id, 'turtle-7'); // v1 배열 순서
  assert.equal(nextLearningMission('maze-12'), null);
  const p = makeLearningProject('pixel', null);
  assert.deepEqual(validateProject(p), []);
});

test('홈 연결: 학습 카탈로그는 "말과 블록으로 만들기" 길에만 나오고 카드 길에는 섞이지 않는다', () => {
  const cat = getLearningCatalog(null);
  assert.equal(chaptersForPath(cat, 'make').length, cat.length);
  assert.equal(chaptersForPath(cat, 'cards').length, 0);
  for (const ch of cat) for (const m of ch.missions) {
    const d = describeMission(m, 0);
    assert.ok(d.srText, m.id);
  }
});
