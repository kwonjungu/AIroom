// 별까지 가기 시뮬레이터 — 순수 함수(DOM 없음). 화면 애니메이션과 테스트가 같은 trace를 쓴다.
// 규칙(v1과 동일): 앞으로 = 보는 방향으로 한 칸. 벽(#)이나 지도 밖이면 그 자리에 멈추고 끝(bump).
// 별(G) 칸에 들어서는 즉시 성공(goal). 카드를 다 써도 별이 아니면 short.

import { orderedCards } from './program-ops.js';

export const DIRS = ['up', 'right', 'down', 'left'];
export const DELTA = { up: [-1, 0], right: [0, 1], down: [1, 0], left: [0, -1] };
export const DIR_NAMES = { up: '위쪽', right: '오른쪽', down: '아래쪽', left: '왼쪽' };
export const CARD_NAMES = { move: '앞으로 가기', turnLeft: '왼쪽으로 돌기', turnRight: '오른쪽으로 돌기', repeat: '반복' };
const TURN_LEFT = { up: 'left', left: 'down', down: 'right', right: 'up' };
const TURN_RIGHT = { up: 'right', right: 'down', down: 'left', left: 'up' };
export const MAX_STEPS = 500;

export function parseMap(mission) {
  const rows = mission.map.map(r => r.split(''));
  let start = { r: 0, c: 0 }, goal = null;
  rows.forEach((row, r) => row.forEach((ch, c) => { if (ch === 'S') start = { r, c }; if (ch === 'G') goal = { r, c }; }));
  return { rows, height: rows.length, width: Math.max(...rows.map(r => r.length)), start, goal, startDir: mission.startDir || 'up' };
}

export function isWall(map, r, c) {
  if (r < 0 || c < 0 || r >= map.rows.length || c >= (map.rows[r] || []).length) return true;
  return map.rows[r][c] === '#';
}

/** solution 표기(['move', {repeat:3, body:[...]}]) → program. id는 c1… / r1… */
export function programFromSolution(solution) {
  const nodes = [], entrypoints = [];
  let n = 0;
  for (const item of solution) {
    if (typeof item === 'string') {
      const id = 'c' + (++n);
      nodes.push({ id, kind: item, args: {}, children: [] }); entrypoints.push(id);
    } else {
      const id = 'r' + (++n);
      const children = item.body.map(k => { const cid = 'c' + (++n); nodes.push({ id: cid, kind: k, args: {}, children: [] }); return cid; });
      nodes.push({ id, kind: 'repeat', args: { times: item.repeat }, children }); entrypoints.push(id);
    }
  }
  return { nodes, entrypoints };
}

/**
 * @param {object} mission  {map, startDir}
 * @param {{nodes:object[], entrypoints:string[]}} program
 * @returns {{
 *   start:{r:number,c:number,dir:string},
 *   steps:{nodeId:string, label:string, repeatId:string|null, iteration:number|null, action:string, r:number, c:number, dir:string, event:'moved'|'turned'|'bump'|'goal', blocked?:{r:number,c:number}}[],
 *   result:'goal'|'bump'|'short'|'empty'|'overflow',
 *   final:{r:number,c:number,dir:string},
 *   explanation:{text:string, nodeId:string|null, stepIndex:number|null}
 * }}
 */
export function simulateGoal(mission, program, { maxSteps = MAX_STEPS } = {}) {
  const map = parseMap(mission);
  const labels = new Map(orderedCards(program).map(x => [x.node.id, x.label]));
  const byId = new Map(program.nodes.map(n => [n.id, n]));
  const st = { r: map.start.r, c: map.start.c, dir: map.startDir };
  const start = { ...st };
  const steps = [];
  let result = null;

  const exec = (id, repeatId, iteration) => {
    const n = byId.get(id);
    if (!n || result) return;
    if (n.kind === 'repeat') {
      for (let k = 1; k <= n.args.times && !result; k++) for (const cid of n.children) { exec(cid, n.id, k); if (result) return; }
      return;
    }
    if (steps.length >= maxSteps) { result = 'overflow'; return; }
    const base = { nodeId: n.id, label: labels.get(n.id) || '', repeatId, iteration, action: n.kind };
    if (n.kind === 'turnLeft' || n.kind === 'turnRight') {
      st.dir = (n.kind === 'turnLeft' ? TURN_LEFT : TURN_RIGHT)[st.dir];
      steps.push({ ...base, r: st.r, c: st.c, dir: st.dir, event: 'turned' });
      return;
    }
    if (n.kind === 'move') {
      const [dr, dc] = DELTA[st.dir];
      const nr = st.r + dr, nc = st.c + dc;
      if (isWall(map, nr, nc)) {
        steps.push({ ...base, r: st.r, c: st.c, dir: st.dir, event: 'bump', blocked: { r: nr, c: nc } });
        result = 'bump'; return;
      }
      st.r = nr; st.c = nc;
      const atGoal = map.rows[nr][nc] === 'G';
      steps.push({ ...base, r: st.r, c: st.c, dir: st.dir, event: atGoal ? 'goal' : 'moved' });
      if (atGoal) result = 'goal';
    }
  };
  for (const id of program.entrypoints) { exec(id, null, null); if (result) break; }

  if (!result) result = steps.length ? 'short' : 'empty';
  const last = steps.length - 1;
  let explanation;
  switch (result) {
    case 'goal': explanation = { text: mission.success || '별에 도착했어!', nodeId: steps[last].nodeId, stepIndex: last }; break;
    case 'bump': {
      const s = steps[last];
      const where = s.blocked.r < 0 || s.blocked.c < 0 || s.blocked.r >= map.height || s.blocked.c >= map.width ? '길 끝' : '수풀';
      explanation = { text: `${s.label}번 카드에서 멈췄어. 로버가 ${DIR_NAMES[s.dir]}을 보고 있는데 앞이 ${where}이야.`, nodeId: s.nodeId, stepIndex: last };
      break;
    }
    case 'short': {
      const d = map.goal ? Math.abs(map.goal.r - st.r) + Math.abs(map.goal.c - st.c) : 0;
      explanation = { text: `카드를 다 썼는데 별까지 ${d}칸 남았어. 카드를 더 놓아 볼까?`, nodeId: steps[last].nodeId, stepIndex: last };
      break;
    }
    case 'overflow': explanation = { text: '카드가 너무 많이 반복돼. 반복 횟수를 줄여 볼까?', nodeId: steps[last]?.nodeId ?? null, stepIndex: last }; break;
    default: explanation = { text: '카드를 눌러 로버에게 길을 알려 줘!', nodeId: null, stepIndex: null };
  }
  return { start, steps, result, final: { ...st }, explanation };
}
