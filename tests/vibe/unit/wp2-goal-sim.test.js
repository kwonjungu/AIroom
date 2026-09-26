// WP2 별까지 가기 시뮬레이터 — 모든 미션 해답 도착, 알려진 오답(한 칸 부족·벽 충돌) 실패.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GOAL_MISSIONS, GOAL_FREE_MISSION } from '../../../public/vibe-v2/modes/cards/missions/goal.js';
import { simulateGoal, programFromSolution } from '../../../public/vibe-v2/modes/cards/goal-sim.js';

// 지도 문자열에서 별 위치를 직접 찾는다 (시뮬레이터와 독립)
function starOf(map) {
  for (let r = 0; r < map.length; r++) { const c = map[r].indexOf('G'); if (c >= 0) return { r, c }; }
  return null;
}
const flat = kinds => ({ nodes: kinds.map((k, i) => ({ id: 'c' + (i + 1), kind: k, args: {}, children: [] })), entrypoints: kinds.map((_, i) => 'c' + (i + 1)) });

test('v1 별까지 가기 12개 미션 모두 이관', () => {
  assert.equal(GOAL_MISSIONS.length, 12);
  assert.deepEqual(GOAL_MISSIONS.map(m => m.id), Array.from({ length: 12 }, (_, i) => 'goal-' + (i + 1)));
  // 반복 카드는 7번부터 (v1 규칙)
  GOAL_MISSIONS.forEach((m, i) => assert.equal(!!m.allowRepeat, i >= 6, m.id));
});

test('모든 미션의 해답은 별에 도착한다', () => {
  for (const m of [...GOAL_MISSIONS, GOAL_FREE_MISSION]) {
    const t = simulateGoal(m, programFromSolution(m.solution));
    assert.equal(t.result, 'goal', m.id);
    assert.deepEqual({ r: t.final.r, c: t.final.c }, starOf(m.map), m.id);
    assert.equal(t.steps.at(-1).event, 'goal');
  }
});

test('한 칸 부족: 해답의 실제 동작에서 마지막 걸음을 빼면 별에 못 닿는다(short)', () => {
  for (const m of GOAL_MISSIONS) {
    const actions = simulateGoal(m, programFromSolution(m.solution)).steps.map(s => s.action);
    assert.equal(actions.at(-1), 'move');
    const t = simulateGoal(m, flat(actions.slice(0, -1)));
    assert.equal(t.result, 'short', m.id);
    assert.match(t.explanation.text, /1칸 남았어/, m.id); // 마지막 걸음 하나만 모자람
  }
});

test('벽 충돌: 모든 미션의 출발 칸 오른쪽은 수풀이거나 지도 밖 → 오른쪽 돌기+앞으로는 멈춘다', () => {
  for (const m of GOAL_MISSIONS) {
    const t = simulateGoal(m, flat(['turnRight', 'move']));
    assert.equal(t.result, 'bump', m.id);
    const last = t.steps.at(-1);
    assert.equal(last.event, 'bump');
    assert.equal(last.nodeId, 'c2');
    assert.equal(t.explanation.nodeId, 'c2', '어느 카드에서 멈췄는지');
    assert.match(t.explanation.text, /2번 카드/);
    assert.match(t.explanation.text, /오른쪽/, '왜: 로버가 오른쪽을 보고 있었다');
    // 로버는 출발 칸에 그대로
    const S = m.map.findIndex(r => r.includes('S'));
    assert.deepEqual({ r: last.r, c: last.c }, { r: S, c: m.map[S].indexOf('S') });
  }
});

test('벽 충돌 위치: 오른쪽으로(3번)에서 앞으로 두 번이면 두 번째 카드에서 위쪽 수풀', () => {
  const m = GOAL_MISSIONS[2];
  const t = simulateGoal(m, flat(['move', 'move']));
  assert.equal(t.result, 'bump');
  assert.deepEqual(t.steps.at(-1).blocked, { r: 0, c: 1 });
  assert.match(t.explanation.text, /2번 카드.*위쪽.*수풀/);
});

test('반복 카드: 실행 단계마다 반복 카드와 안쪽 카드 번호를 함께 알려 준다', () => {
  const m = GOAL_MISSIONS[6]; // 똑같이 세 번
  const t = simulateGoal(m, programFromSolution(m.solution));
  assert.equal(t.steps.length, 6);
  assert.deepEqual(t.steps.map(s => s.label), ['1-1', '1-2', '1-1', '1-2', '1-1', '1-2']);
  assert.deepEqual(t.steps.map(s => s.iteration), [1, 1, 2, 2, 3, 3]);
  assert.ok(t.steps.every(s => s.repeatId === 'r1'));
});

test('빈 카드 줄·과도한 반복', () => {
  assert.equal(simulateGoal(GOAL_MISSIONS[0], { nodes: [], entrypoints: [] }).result, 'empty');
  const big = { nodes: [{ id: 'r1', kind: 'repeat', args: { times: 9 }, children: ['c1', 'c2'] }, { id: 'c1', kind: 'turnLeft', args: {}, children: [] }, { id: 'c2', kind: 'turnRight', args: {}, children: [] }], entrypoints: ['r1'] };
  assert.equal(simulateGoal(GOAL_MISSIONS[0], big, { maxSteps: 10 }).result, 'overflow');
});

test('도착 즉시 성공: 별에 닿은 뒤의 카드는 실행하지 않는다 (v1 규칙)', () => {
  const t = simulateGoal(GOAL_MISSIONS[0], flat(['move', 'move', 'move', 'turnLeft']));
  assert.equal(t.result, 'goal');
  assert.equal(t.steps.length, 2);
});
