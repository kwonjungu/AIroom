// 미로 DSL(maze-dsl-1) 순수 엔진 — v1 parseMazeDSL / mazeApplyCmd / mazeFlatten / runMaze 이관.
//
// 지도: '#' 벽, '.' 길, 'S' 출발, 'G' 보물, 'D' 보석. 방향은 로봇(토토) 기준: TURN_LEFT/TURN_RIGHT.
//   MOVE [n] · TURN_LEFT · TURN_RIGHT · PICK · REPEAT n { } · IF WALL { } ELSE { } · // 주석
// 규칙(v1 그대로): G에 닿는 즉시 끝(남은 명령 무시) · 벽에 부딪히면 그 자리에서 끝 · 빈 칸 PICK은 아무 일 없음
//   · REPEAT는 미리 펼치고(5000 상한) IF WALL은 실행하는 순간의 앞칸으로 판단.
// v1과 다른 점: 모르는 토큰·빠진 인자·짝 없는 괄호·고아 ELSE를 줄 번호 진단으로 남긴다.

import { LIMITS, lineDiag, tokenize } from './common.js';

export const DELTA = Object.freeze({ up: [-1, 0], right: [0, 1], down: [1, 0], left: [0, -1] });
export const TURN_LEFT = Object.freeze({ up: 'left', left: 'down', down: 'right', right: 'up' });
export const TURN_RIGHT = Object.freeze({ up: 'right', right: 'down', down: 'left', left: 'up' });
export const DIR_NAMES = Object.freeze({ up: '위', right: '오른쪽', down: '아래', left: '왼쪽' });

const KEYWORDS = new Set(['MOVE', 'TURN_LEFT', 'TURN_RIGHT', 'PICK', 'REPEAT', 'IF', 'ELSE', 'WALL']);

/** @returns {{commands:object[], diagnostics:object[]}} */
export function parseMaze(text) {
  const toks = tokenize(text);
  const diagnostics = [];
  const reported = new Set();
  const report = (code, line, msg, hint, sev) => {
    const k = code + ':' + line;
    if (reported.has(k)) return;
    reported.add(k);
    diagnostics.push(lineDiag(code, line, msg, hint, sev));
  };
  let i = 0;
  const T = k => toks[i + k]?.t;
  const L = () => toks[i]?.line ?? (toks[toks.length - 1]?.line || 1);
  const skipArgs = () => { const ln = L(); i++; while (i < toks.length && toks[i].line === ln && /^\d+$/.test(T(0))) i++; };
  const skipBrace = () => { if (T(0) === '{') i++; };

  function block(openLine, openName) {
    const cmds = [];
    while (i < toks.length) {
      const t = T(0), line = L();
      if (t === '}') {
        i++;
        if (openLine == null) { report('UNEXPECTED_CLOSE', line, 'unmatched }', `${line}번째 줄: 닫는 괄호 }의 짝이 없어요.`); continue; }
        return cmds;
      }
      if (t === 'REPEAT') {
        if (/^\d+$/.test(T(1) || '')) {
          const raw = parseInt(T(1), 10);
          if (raw > LIMITS.repeatMax) report('REPEAT_CLAMPED', line, `REPEAT ${raw}`, `${line}번째 줄: 반복은 ${LIMITS.repeatMax}번까지만 해요.`, 'warning');
          i += 2; skipBrace();
          cmds.push({ type: 'REPEAT', count: Math.min(raw, LIMITS.repeatMax), body: block(line, 'REPEAT'), line });
          continue;
        }
        report('BAD_ARGUMENT', line, t, `${line}번째 줄: REPEAT 뒤에 반복할 횟수를 써 줘요.`); skipArgs(); continue;
      }
      if (t === 'IF') {
        if (T(1) === 'WALL') {
          i += 2; skipBrace();
          const body = block(line, 'IF'); let elseBody = null, elseLine = null;
          if (T(0) === 'ELSE') { elseLine = L(); i++; skipBrace(); elseBody = block(elseLine, 'ELSE'); }
          cmds.push({ type: 'IF_WALL', body, elseBody, line, elseLine });
          continue;
        }
        report('BAD_ARGUMENT', line, t, `${line}번째 줄: IF 뒤에는 WALL이 와요 (IF WALL).`); skipArgs(); continue;
      }
      if (t === 'ELSE') {
        report('ORPHAN_ELSE', line, 'ELSE without IF', `${line}번째 줄: ELSE 앞에 IF WALL 블록이 있어야 해요.`);
        i++; skipBrace(); block(line, 'ELSE'); continue;
      }
      if (t === 'MOVE') {
        i++;
        if (/^\d+$/.test(T(0) || '')) { const n = Math.min(parseInt(T(0), 10), 50); i++; for (let k = 0; k < n; k++) cmds.push({ type: 'MOVE', line }); }
        else cmds.push({ type: 'MOVE', line });
        continue;
      }
      if (t === 'TURN_LEFT' || t === 'TURN_RIGHT' || t === 'PICK') { cmds.push({ type: t, line }); i++; continue; }
      if (t === '{') { report('STRAY_OPEN_BRACE', line, 'unexpected {', `${line}번째 줄: 여는 괄호 {가 혼자 있어요.`); i++; continue; }
      if (KEYWORDS.has(String(t).toUpperCase()) && t !== String(t).toUpperCase()) report('LOWERCASE_COMMAND', line, t, `${line}번째 줄: 명령은 대문자로 써요 (${String(t).toUpperCase()}).`);
      else report('UNKNOWN_COMMAND', line, String(t).slice(0, 40), `${line}번째 줄: 토토가 모르는 말이 있어요 (${String(t).slice(0, 12)}).`);
      i++;
    }
    if (openLine != null) report('UNCLOSED_BLOCK', openLine, `${openName} not closed`, `${openLine}번째 줄: ${openName} 블록을 }로 닫아 줘요.`);
    return cmds;
  }
  const commands = block(null, null);
  return { commands, diagnostics };
}

/** 미션 지도 → 초기 상태 */
export function initMaze(mission) {
  const map = mission.map.map(row => row.split(''));
  let sr = 0, sc = 0; const gems = [];
  map.forEach((row, r) => row.forEach((ch, c) => { if (ch === 'S') { sr = r; sc = c; } else if (ch === 'D') gems.push(r + ',' + c); }));
  return { map, rows: map.length, cols: Math.max(...map.map(r => r.length)), sr, sc, startDir: mission.startDir || 'right', gems };
}

export function isWall(map, r, c) {
  if (r < 0 || c < 0 || r >= map.length || !map[r] || c >= map[r].length) return true;
  return map[r][c] === '#';
}

/** v1 mazeFlatten: REPEAT만 펼침. 상한 초과면 overflow */
function flatten(cmds, max) {
  const flat = []; let over = false;
  (function fl(cs, loops) {
    for (const c of cs) {
      if (flat.length >= max) { over = true; return; }
      if (c.type === 'REPEAT') { for (let i = 0; i < c.count; i++) { fl(c.body, [...loops, { line: c.line, iter: i + 1, count: c.count }]); if (over) return; } }
      else flat.push({ cmd: c, loops });
    }
  })(cmds, []);
  return { flat, over };
}

/**
 * @param {object[]} commands parseMaze().commands
 * @param {object} mission {map, startDir}
 * @returns {{steps:object[], result:'goal'|'bump'|'end'|'overflow'|'empty', collected:string[], gemsTotal:number, final:{r,c,dir}, bump:{r,c,line,dir}|null, moves:number, diagnostics:object[]}}
 *   step = {line, type, event:'moved'|'goal'|'bump'|'turned'|'gem'|'noop'|'check', r, c, dir, wall?, blocked?, loops}
 */
export function runMaze(commands, mission, opts = {}) {
  const M = initMaze(mission);
  const max = opts.maxSteps ?? LIMITS.mazeSteps;
  const S = { r: M.sr, c: M.sc, dir: M.startDir, collected: new Set(), moves: 0 };
  const steps = [];
  const diagnostics = [];
  const top = flatten(commands, max);
  const out = extra => ({ steps, collected: [...S.collected], gemsTotal: M.gems.length, final: { r: S.r, c: S.c, dir: S.dir }, moves: S.moves, diagnostics, bump: null, ...extra });
  if (top.over) {
    diagnostics.push(lineDiag('TOO_MANY_STEPS', 1, `> ${max}`, `명령이 너무 많아요(${max}개 넘음). 반복 횟수를 줄여 볼까?`));
    return out({ result: 'overflow' });
  }
  if (!top.flat.length) return out({ result: 'empty' });
  let budget = max * 4; // IF 가지 안의 펼침까지 포함한 안전 상한
  let bump = null;

  function frontWall() { const [dr, dc] = DELTA[S.dir]; return isWall(M.map, S.r + dr, S.c + dc); }
  function exec(item) {
    if (--budget < 0) return 'overflow';
    const { cmd: c, loops } = item;
    const base = { line: c.line, type: c.type, loops };
    if (c.type === 'IF_WALL') {
      const wall = frontWall();
      steps.push({ ...base, event: 'check', wall, r: S.r, c: S.c, dir: S.dir });
      const branch = wall ? c.body : (c.elseBody || []);
      const sub = flatten(branch, max);
      if (sub.over) return 'overflow';
      for (const it of sub.flat) { const r = exec({ cmd: it.cmd, loops: [...loops, ...it.loops] }); if (r) return r; }
      return null;
    }
    if (c.type === 'MOVE') {
      const [dr, dc] = DELTA[S.dir]; const nr = S.r + dr, nc = S.c + dc;
      if (isWall(M.map, nr, nc)) {
        bump = { r: nr, c: nc, line: c.line, dir: S.dir, from: { r: S.r, c: S.c } };
        steps.push({ ...base, event: 'bump', r: S.r, c: S.c, dir: S.dir, blocked: { r: nr, c: nc } });
        return 'bump';
      }
      S.r = nr; S.c = nc; S.moves++;
      const goal = M.map[nr][nc] === 'G';
      steps.push({ ...base, event: goal ? 'goal' : 'moved', r: S.r, c: S.c, dir: S.dir });
      return goal ? 'goal' : null;
    }
    if (c.type === 'TURN_LEFT' || c.type === 'TURN_RIGHT') {
      S.dir = (c.type === 'TURN_LEFT' ? TURN_LEFT : TURN_RIGHT)[S.dir];
      steps.push({ ...base, event: 'turned', r: S.r, c: S.c, dir: S.dir });
      return null;
    }
    if (c.type === 'PICK') {
      const k = S.r + ',' + S.c;
      const gem = M.gems.includes(k) && !S.collected.has(k);
      if (gem) S.collected.add(k);
      steps.push({ ...base, event: gem ? 'gem' : 'noop', r: S.r, c: S.c, dir: S.dir, gem: gem ? k : undefined });
      return null;
    }
    return null;
  }
  let result = 'end';
  for (const it of top.flat) { const r = exec(it); if (r) { result = r; break; } }
  if (result === 'overflow') diagnostics.push(lineDiag('TOO_MANY_STEPS', 1, 'budget', '명령이 너무 많아요. 반복 횟수를 줄여 볼까?'));
  return out({ result, bump });
}

/** i번째 단계까지의 상태(재생·리셋 결정성). i<0 이면 출발 상태. */
export function mazeStateAt(mission, trace, i) {
  const M = initMaze(mission);
  let st = { r: M.sr, c: M.sc, dir: M.startDir };
  const collected = new Set(); const trail = [{ r: M.sr, c: M.sc }];
  let blocked = null;
  for (let k = 0; k <= i && k < trace.steps.length; k++) {
    const s = trace.steps[k];
    st = { r: s.r, c: s.c, dir: s.dir };
    if (s.event === 'moved' || s.event === 'goal') trail.push({ r: s.r, c: s.c });
    if (s.event === 'gem') collected.add(s.gem);
    if (s.event === 'bump') blocked = s.blocked;
  }
  return { ...st, collected, trail, blocked };
}

/** par 비교용 블록 수: 명령 1개 = 1 (REPEAT·IF WALL도 1). v1 m_* 블록 개수와 같다. MOVE n은 n개로 센다. */
export function countBlocks(cmds) {
  let n = 0;
  for (const c of cmds) { n++; if (c.body) n += countBlocks(c.body); if (c.elseBody) n += countBlocks(c.elseBody); }
  return n;
}

/** 지도에서 S→(모든 보석)→G 로 갈 수 있는지 (BFS, 정답 코드와 독립인 검사) */
export function mazeSolvable(mission) {
  const M = initMaze(mission);
  let goal = null;
  M.map.forEach((row, r) => row.forEach((ch, c) => { if (ch === 'G') goal = { r, c }; }));
  if (!goal) return false;
  const reach = new Set([M.sr + ',' + M.sc]);
  const q = [[M.sr, M.sc]];
  while (q.length) {
    const [r, c] = q.shift();
    for (const [dr, dc] of Object.values(DELTA)) {
      const nr = r + dr, nc = c + dc, k = nr + ',' + nc;
      if (reach.has(k) || isWall(M.map, nr, nc)) continue;
      reach.add(k);
      if (M.map[nr][nc] !== 'G') q.push([nr, nc]); // G에 닿으면 끝나므로 G를 지나갈 수 없다
    }
  }
  return reach.has(goal.r + ',' + goal.c) && M.gems.every(g => reach.has(g));
}
