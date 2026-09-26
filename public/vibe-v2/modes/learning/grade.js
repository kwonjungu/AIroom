// 거북이·픽셀·미로 채점 (WP8). DOM 없음.
//
// 공통 결과: { complete, score(0~100), free, hint(학생용 한 문장), diagnostics, detail }
//   - 파싱 오류(error)가 있으면 실행·완료하지 않는다(줄 번호 힌트).
//   - 빈 작품은 0점·완료 불가. (v1 픽셀은 빈 5×5 격자가 '점 하나' 미션에서 96%로 성공 처리됐다.)
// 거북이: v1 turtlePathSimilarity(양방향 커버리지·거울 인정) ≥ 0.8 에 두 가지를 더했다.
//   ① 모자란 선 검사: 그린 선 길이가 목표의 85% 미만이면 완료 불가(3변만 그린 정사각형이 v1에서 82%로 통과하던 문제)
//   ② 색 미션(목표에 PEN_COLOR): 목표 선 위 점의 80% 이상이 같은 색으로 덮여야 함(v1은 색을 보지 않았다)
// 픽셀: 칸 단위 정확 비교(켜짐/꺼짐). 점수 = 켜진 칸 IoU. 이벤트 미션(9번)은 버튼별 결과를 검사.
// 미로: G 도착 + 보석 전부 (v1 mazeSuccess). par 이하이면 shortCode 배지.

import { hasErrors } from './engines/common.js';
import { parseTurtle, runTurtle, turtlePathSimilarity, turtleCommandsToPath, densifyPath } from './engines/turtle.js';
import { parsePixel, runPixel, runEvent, PIXEL_ICONS, litCount } from './engines/pixel.js';
import { parseMaze, runMaze, countBlocks, DIR_NAMES } from './engines/maze.js';

const firstError = diags => diags.find(d => d.severity === 'error');
const failParse = diags => ({ complete: false, score: 0, free: false, hint: firstError(diags).studentHint, diagnostics: diags, detail: { parseError: true } });

// ── 거북이 ──
function pathLength(cmds) {
  let len = 0;
  for (const sub of turtleCommandsToPath(cmds)) for (let i = 1; i < sub.length; i++) len += Math.hypot(sub[i].x - sub[i - 1].x, sub[i].y - sub[i - 1].y);
  return len;
}
const normHex = c => {
  const s = String(c || '').trim().toLowerCase();
  return /^#[0-9a-f]{3}$/.test(s) ? '#' + s[1] + s[1] + s[2] + s[2] + s[3] + s[3] : s;
};
function coloredPoints(cmds) {
  const pts = [];
  for (const s of runTurtle(cmds).steps) {
    if (!s.seg) continue;
    const p = densifyPath([[{ x: s.seg.x1, y: s.seg.y1 }, { x: s.seg.x2, y: s.seg.y2 }]], 4);
    for (const q of p) pts.push({ ...q, color: normHex(s.seg.color) });
  }
  return pts;
}
function colorCoverage(targetPts, stuPts, tol) {
  if (!targetPts.length) return 1;
  const tol2 = tol * tol;
  let hit = 0;
  for (const p of targetPts) {
    let best = null, bd = Infinity;
    for (const q of stuPts) { const d = (p.x - q.x) ** 2 + (p.y - q.y) ** 2; if (d < bd) { bd = d; best = q; } }
    if (best && bd <= tol2 && best.color === p.color) hit++;
  }
  return hit / targetPts.length;
}
const hasPenColor = cmds => cmds.some(c => c.type === 'PEN_COLOR' || (c.body && hasPenColor(c.body)));

export function gradeTurtle(mission, source) {
  const parsed = parseTurtle(source);
  if (hasErrors(parsed.diagnostics)) return failParse(parsed.diagnostics);
  const run = runTurtle(parsed.commands);
  if (run.overflow) return failParse(run.diagnostics);
  const drew = run.steps.some(s => s.seg || s.circle || s.stamp);
  if (mission.free || !mission.target) {
    return { complete: drew, score: drew ? 100 : 0, free: true, hint: drew ? mission.success : '아직 그림이 없어 — 명령을 써서 거북이를 움직여 봐.', diagnostics: parsed.diagnostics, detail: { drew } };
  }
  const target = parseTurtle(mission.target).commands;
  const tol = mission.tolerance || 15;
  const sim = turtlePathSimilarity(target, parsed.commands, tol);
  const tLen = pathLength(target), sLen = pathLength(parsed.commands);
  const lengthRatio = tLen ? sLen / tLen : 0;
  const lengthOk = lengthRatio >= 0.85;
  let colorScore = 1;
  if (hasPenColor(target)) {
    const tp = coloredPoints(target), sp = coloredPoints(parsed.commands);
    colorScore = Math.max(colorCoverage(tp, sp, tol), colorCoverage(tp, sp.map(p => ({ ...p, x: -p.x })), tol));
  }
  const colorOk = colorScore >= 0.8;
  const shapeOk = sim >= 0.8;
  const complete = shapeOk && lengthOk && colorOk;
  const score = Math.round(sim * 100);
  let hint;
  if (!sLen) hint = '아직 선이 없어 — 명령을 써서 거북이를 움직여 봐.';
  else if (complete) hint = mission.success;
  else if (shapeOk && !lengthOk) hint = '선이 조금 모자라 — 빠진 변이 없는지 목표와 세어 봐.';
  else if (shapeOk && !colorOk) hint = '모양은 맞았어 — 이제 변마다 펜 색을 목표와 같게 바꿔 볼까?';
  else if (sim >= 0.5) hint = '거의 다 왔어 — 목표 점선과 겹쳐 보며 다른 곳을 찾아봐.';
  else hint = '목표 점선과 비교해 봐 — 첫 번째 선의 길이와 도는 각도부터 확인해 볼까?';
  return { complete, score, free: false, hint, diagnostics: parsed.diagnostics, detail: { sim, lengthRatio, colorScore } };
}

// ── 픽셀 ──
function iconGrid(name) { return PIXEL_ICONS[name]; }

export function gradePixel(mission, source) {
  const parsed = parsePixel(source);
  if (hasErrors(parsed.diagnostics)) return failParse(parsed.diagnostics);
  const opts = { size: mission.gridSize };
  const run = runPixel(parsed.commands, opts);
  if (run.overflow) return failParse(run.diagnostics);
  if (mission.events) {
    const checks = mission.events.map(ev => {
      const r = runEvent(run, ev.press, opts);
      if (!r) return { press: ev.press, ok: false, reason: 'noHandler' };
      const want = iconGrid(ev.icon);
      let ok = true;
      for (let y = 0; y < mission.gridSize; y++) for (let x = 0; x < mission.gridSize; x++) if (!!r.grid[y][x] !== !!want[y][x]) ok = false;
      return { press: ev.press, ok, reason: ok ? null : 'wrongPicture' };
    });
    const pass = checks.filter(c => c.ok).length;
    const bad = checks.find(c => !c.ok);
    const hint = !bad ? mission.success
      : bad.reason === 'noHandler' ? `버튼 ${bad.press}를 눌렀을 때 할 일이 없어 — ON_BUTTON_${bad.press} { } 를 써 봐.`
        : `버튼 ${bad.press}를 누르면 나오는 그림이 달라 — ${mission.events.find(e => e.press === bad.press).icon === 'HEART' ? '하트' : '엑스'}가 나오게 해 봐.`;
    return { complete: pass === checks.length, score: Math.round(pass / checks.length * 100), free: false, hint, diagnostics: parsed.diagnostics, detail: { checks } };
  }
  const lit = litCount(run.grid);
  if (mission.free || !mission.targetGrid) {
    return { complete: lit > 0, score: lit > 0 ? 100 : 0, free: true, hint: lit ? mission.success : '아직 켜진 칸이 없어 — 칸을 눌러 칠하거나 LED_ON을 써 봐.', diagnostics: parsed.diagnostics, detail: { lit } };
  }
  return { ...compareGrid(mission, run.grid), diagnostics: parsed.diagnostics };
}

/** 칸 단위 비교 (그리기 결과 격자로 바로 채점할 때도 씀) */
export function compareGrid(mission, grid) {
  const n = mission.gridSize, t = mission.targetGrid;
  let tp = 0; const missing = [], extra = [];
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const want = !!(t[y] && t[y][x]), have = !!(grid[y] && grid[y][x]);
    if (want && have) tp++;
    else if (want) missing.push({ x: x + 1, y: y + 1 });
    else if (have) extra.push({ x: x + 1, y: y + 1 });
  }
  const union = tp + missing.length + extra.length;
  const score = union ? Math.round(tp / union * 100) : 0;
  const complete = !missing.length && !extra.length && tp > 0;
  let hint;
  if (complete) hint = mission.success;
  else if (!tp && !extra.length) hint = '아직 켜진 칸이 없어 — 목표 그림의 첫 칸 좌표부터 찾아봐.';
  else if (missing.length) hint = `(x:${missing[0].x}, y:${missing[0].y}) 칸에도 불이 켜져야 해${missing.length > 1 ? ` — 모자란 칸이 ${missing.length}개야` : ''}.`;
  else hint = `(x:${extra[0].x}, y:${extra[0].y}) 칸은 꺼져 있어야 해${extra.length > 1 ? ` — 더 켜진 칸이 ${extra.length}개야` : ''}.`;
  return { complete, score, free: false, hint, detail: { tp, missing, extra } };
}

// ── 미로 ──
export function gradeMaze(mission, source) {
  const parsed = parseMaze(source);
  if (hasErrors(parsed.diagnostics)) return failParse(parsed.diagnostics);
  const run = runMaze(parsed.commands, mission);
  const blocks = countBlocks(parsed.commands);
  const gemsLeft = run.gemsTotal - run.collected.length;
  const complete = run.result === 'goal' && gemsLeft === 0;
  const shortCode = complete && blocks <= mission.par;
  let hint;
  switch (run.result) {
    case 'empty': hint = '명령이 없어 — MOVE부터 써 볼까?'; break;
    case 'overflow': hint = run.diagnostics[0]?.studentHint || '명령이 너무 많아요.'; break;
    case 'bump': hint = `${run.bump.line}번째 줄에서 토토 앞(${DIR_NAMES[run.bump.dir]})이 벽이라 부딪혔어 — 그 앞 명령을 살펴봐.`; break;
    case 'goal': hint = gemsLeft ? `보물까지 갔지만 보석 ${gemsLeft}개를 놓쳤어 — 보석 칸에서 PICK을 써 봐.`
      : shortCode ? mission.success : `${mission.success.replace(/[.!]$/, '')} — 블록 ${blocks}개를 ${mission.par}개까지 줄여 볼 수도 있어.`; break;
    default: hint = '명령이 다 끝났는데 아직 보물에 닿지 못했어 — 몇 걸음이 더 필요할까?';
  }
  const progress = complete ? 100 : run.result === 'goal' ? 80 : 0;
  return { complete, score: progress, free: false, hint, diagnostics: [...parsed.diagnostics, ...run.diagnostics], detail: { result: run.result, blocks, par: mission.par, shortCode, gemsLeft, bump: run.bump } };
}

export function gradeMission(mode, mission, source) {
  if (mode === 'turtle') return gradeTurtle(mission, source);
  if (mode === 'pixel') return gradePixel(mission, source);
  if (mode === 'maze') return gradeMaze(mission, source);
  throw new Error('unknown learning mode ' + mode);
}
