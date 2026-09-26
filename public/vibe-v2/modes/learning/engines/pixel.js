// 픽셀 DSL(pixel-dsl-1) 순수 엔진 — v1 parsePixelDSL / executePixelCommands / resolvePixelVar 이관.
//
// 좌표는 1부터(x 가로 →, y 세로 ↓). 토큰 기반: 한 줄에 여러 명령을 붙여도 된다(v1과 동일).
//   LED_ON x y · LED_OFF x y · LED_TOGGLE x y · LED_COLOR x y #색 · FILL_ALL [#색] · FILL_ROW y [#색] · FILL_COL x [#색]
//   CLEAR_ALL · RECT x1 y1 x2 y2 [#색] · BLINK x y n · WAIT ms · SHOW_ICON 이름
//   REPEAT n { } · FOR 변수 시작 끝 { } · DEF 이름 { } · CALL 이름
//   ON_BUTTON_A { } · ON_BUTTON_B { } · ON_SHAKE { } · ON_START { } · IF BUTTON_A { } ELSE { } · // 주석
// v1과 다른 점
//  - 모르는 토큰·빠진 인자·짝 없는 괄호·고아 ELSE·정의 안 된 변수를 줄 번호 진단으로 남긴다.
//  - 실행은 시간 없이 한 번에 trace(단계 목록)를 만든다. BLINK/WAIT의 기다림은 단계의 ms 로만 표시하고
//    실제 기다림은 UI 재생기가 한다 → v1의 pixelAnimCancel 전역 플래그(실행 버튼 순서 버그)가 없다.

import { LIMITS, lineDiag, tokenize } from './common.js';
import { resolveCalls } from './turtle.js';

export const PIXEL_DEFAULT_COLOR = '#FF0000';
export const PIXEL_ICONS = Object.freeze({
  HEART: [[0, 1, 0, 1, 0], [1, 1, 1, 1, 1], [1, 1, 1, 1, 1], [0, 1, 1, 1, 0], [0, 0, 1, 0, 0]],
  SMILEY: [[0, 0, 0, 0, 0], [0, 1, 0, 1, 0], [0, 0, 0, 0, 0], [1, 0, 0, 0, 1], [0, 1, 1, 1, 0]],
  SAD: [[0, 0, 0, 0, 0], [0, 1, 0, 1, 0], [0, 0, 0, 0, 0], [0, 1, 1, 1, 0], [1, 0, 0, 0, 1]],
  ARROW_UP: [[0, 0, 1, 0, 0], [0, 1, 1, 1, 0], [1, 0, 1, 0, 1], [0, 0, 1, 0, 0], [0, 0, 1, 0, 0]],
  ARROW_DOWN: [[0, 0, 1, 0, 0], [0, 0, 1, 0, 0], [1, 0, 1, 0, 1], [0, 1, 1, 1, 0], [0, 0, 1, 0, 0]],
  ARROW_LEFT: [[0, 0, 1, 0, 0], [0, 1, 0, 0, 0], [1, 1, 1, 1, 1], [0, 1, 0, 0, 0], [0, 0, 1, 0, 0]],
  ARROW_RIGHT: [[0, 0, 1, 0, 0], [0, 0, 0, 1, 0], [1, 1, 1, 1, 1], [0, 0, 0, 1, 0], [0, 0, 1, 0, 0]],
  CHECK: [[0, 0, 0, 0, 0], [0, 0, 0, 0, 1], [0, 0, 0, 1, 0], [1, 0, 1, 0, 0], [0, 1, 0, 0, 0]],
  X: [[1, 0, 0, 0, 1], [0, 1, 0, 1, 0], [0, 0, 1, 0, 0], [0, 1, 0, 1, 0], [1, 0, 0, 0, 1]],
  DIAMOND: [[0, 0, 1, 0, 0], [0, 1, 0, 1, 0], [1, 0, 0, 0, 1], [0, 1, 0, 1, 0], [0, 0, 1, 0, 0]],
  SQUARE: [[1, 1, 1, 1, 1], [1, 0, 0, 0, 1], [1, 0, 0, 0, 1], [1, 0, 0, 0, 1], [1, 1, 1, 1, 1]],
});

const KEYWORDS = new Set(['LED_ON', 'LED_OFF', 'LED_COLOR', 'LED_TOGGLE', 'FILL_ALL', 'FILL_ROW', 'FILL_COL', 'CLEAR_ALL', 'RECT', 'BLINK', 'SHOW_ICON', 'WAIT', 'REPEAT', 'FOR', 'DEF', 'CALL', 'ON_BUTTON_A', 'ON_BUTTON_B', 'ON_SHAKE', 'ON_START', 'IF', 'ELSE', 'BUTTON_A', 'BUTTON_B']);
const isNum = t => /^\d+$/.test(t || '');
const isVar = t => !!t && !KEYWORDS.has(t) && t !== '{' && t !== '}' && /^[A-Za-z가-힣_][A-Za-z가-힣0-9_]*$/.test(t);
const isCoord = t => isNum(t) || isVar(t);
const coord = t => (isNum(t) ? +t : t);
const isColor = t => /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(t || '');
const normColor = t => (t.length === 4 ? '#' + t[1] + t[1] + t[2] + t[2] + t[3] + t[3] : t);
const MAX_WAIT = 5000;

/** @returns {{commands:object[], raw:object[], diagnostics:object[]}} */
export function parsePixel(text) {
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
  const skipBrace = () => { if (T(0) === '{') i++; };
  const skipArgs = () => { const ln = L(); i++; while (i < toks.length && toks[i].line === ln && (isNum(T(0)) || isColor(T(0)) || isVar(T(0)))) i++; };
  const takeColor = def => { if (isColor(T(0))) { const c = normColor(T(0)); i++; return c; } return def; };

  function block(openLine, openName) {
    const cmds = [];
    while (i < toks.length) {
      const t = T(0), line = L();
      if (t === '}') {
        i++;
        if (openLine == null) { report('UNEXPECTED_CLOSE', line, 'unmatched }', `${line}번째 줄: 닫는 괄호 }의 짝이 없어요.`); continue; }
        return cmds;
      }
      if ((t === 'LED_ON' || t === 'LED_OFF' || t === 'LED_TOGGLE')) {
        if (isCoord(T(1)) && isCoord(T(2))) { cmds.push({ type: t, x: coord(T(1)), y: coord(T(2)), line }); i += 3; continue; }
        report('BAD_ARGUMENT', line, t, `${line}번째 줄: ${t} 뒤에 x y 두 숫자를 써 줘요.`); skipArgs(); continue;
      }
      if (t === 'LED_COLOR') {
        if (isCoord(T(1)) && isCoord(T(2)) && isColor(T(3))) { cmds.push({ type: t, x: coord(T(1)), y: coord(T(2)), color: normColor(T(3)), line }); i += 4; continue; }
        report('BAD_ARGUMENT', line, t, `${line}번째 줄: LED_COLOR x y #색 순서로 써 줘요.`); skipArgs(); continue;
      }
      if (t === 'FILL_ALL') { i++; cmds.push({ type: t, color: takeColor('#ffffff'), line }); continue; }
      if (t === 'FILL_ROW' || t === 'FILL_COL') {
        if (isCoord(T(1))) { const v = coord(T(1)); i += 2; cmds.push(t === 'FILL_ROW' ? { type: t, y: v, color: takeColor('#ffffff'), line } : { type: t, x: v, color: takeColor('#ffffff'), line }); continue; }
        report('BAD_ARGUMENT', line, t, `${line}번째 줄: ${t} 뒤에 몇 번째 줄인지 써 줘요.`); skipArgs(); continue;
      }
      if (t === 'CLEAR_ALL') { cmds.push({ type: t, line }); i++; continue; }
      if (t === 'RECT') {
        if ([1, 2, 3, 4].every(k => isCoord(T(k)))) {
          const c = { type: t, x1: coord(T(1)), y1: coord(T(2)), x2: coord(T(3)), y2: coord(T(4)), line };
          i += 5; c.color = takeColor('#ffffff'); cmds.push(c); continue;
        }
        report('BAD_ARGUMENT', line, t, `${line}번째 줄: RECT x1 y1 x2 y2 순서로 써 줘요.`); skipArgs(); continue;
      }
      if (t === 'BLINK') {
        if (isCoord(T(1)) && isCoord(T(2)) && isNum(T(3))) { cmds.push({ type: t, x: coord(T(1)), y: coord(T(2)), count: Math.min(+T(3), 20), line }); i += 4; continue; }
        report('BAD_ARGUMENT', line, t, `${line}번째 줄: BLINK x y 횟수 순서로 써 줘요.`); skipArgs(); continue;
      }
      if (t === 'WAIT') {
        if (isNum(T(1))) {
          let ms = +T(1);
          if (ms > MAX_WAIT) { report('WAIT_CLAMPED', line, `WAIT ${ms}`, `${line}번째 줄: 기다리기는 ${MAX_WAIT}ms까지만 해요.`, 'warning'); ms = MAX_WAIT; }
          cmds.push({ type: t, ms, line }); i += 2; continue;
        }
        report('BAD_ARGUMENT', line, t, `${line}번째 줄: WAIT 뒤에 기다릴 시간(ms)을 써 줘요.`); skipArgs(); continue;
      }
      if (t === 'SHOW_ICON') {
        if (/^[\w가-힣]+$/.test(T(1) || '') && T(1) !== '{') { cmds.push({ type: t, name: T(1), line }); i += 2; continue; }
        report('BAD_ARGUMENT', line, t, `${line}번째 줄: SHOW_ICON 뒤에 그림 이름(HEART 등)을 써 줘요.`); skipArgs(); continue;
      }
      if (t === 'REPEAT') {
        if (isNum(T(1))) {
          const raw = parseInt(T(1), 10);
          if (raw > LIMITS.repeatMax) report('REPEAT_CLAMPED', line, `REPEAT ${raw}`, `${line}번째 줄: 반복은 ${LIMITS.repeatMax}번까지만 해요.`, 'warning');
          i += 2; skipBrace();
          cmds.push({ type: t, count: Math.min(raw, LIMITS.repeatMax), body: block(line, t), line }); continue;
        }
        report('BAD_ARGUMENT', line, t, `${line}번째 줄: REPEAT 뒤에 반복할 횟수를 써 줘요.`); skipArgs(); continue;
      }
      if (t === 'FOR') {
        if (isVar(T(1)) && isNum(T(2)) && isNum(T(3))) {
          const v = T(1), from = parseInt(T(2), 10); let to = parseInt(T(3), 10);
          if (to - from > LIMITS.repeatMax) { report('REPEAT_CLAMPED', line, 'FOR range', `${line}번째 줄: FOR는 ${LIMITS.repeatMax}번까지만 돌아요.`, 'warning'); to = from + LIMITS.repeatMax; }
          i += 4; skipBrace();
          cmds.push({ type: t, var: v, from, to, body: block(line, t), line }); continue;
        }
        report('BAD_ARGUMENT', line, t, `${line}번째 줄: FOR 변수 시작 끝 순서로 써 줘요 (예: FOR x 1 5).`); skipArgs(); continue;
      }
      if (t === 'DEF') {
        if (T(1) && T(1) !== '{' && T(1) !== '}') { const name = T(1); i += 2; skipBrace(); cmds.push({ type: t, name, body: block(line, t), line }); continue; }
        report('BAD_ARGUMENT', line, t, `${line}번째 줄: DEF 뒤에 함수 이름을 써 줘요.`); skipArgs(); continue;
      }
      if (t === 'CALL') {
        if (T(1) && T(1) !== '{' && T(1) !== '}') { cmds.push({ type: t, name: T(1), line }); i += 2; continue; }
        report('BAD_ARGUMENT', line, t, `${line}번째 줄: CALL 뒤에 함수 이름을 써 줘요.`); skipArgs(); continue;
      }
      if (t === 'ON_BUTTON_A' || t === 'ON_BUTTON_B' || t === 'ON_SHAKE' || t === 'ON_START') {
        i++; skipBrace(); cmds.push({ type: t, body: block(line, t), line }); continue;
      }
      if (t === 'IF') {
        if (T(1) === 'BUTTON_A' || T(1) === 'BUTTON_B') {
          const condition = T(1); i += 2; skipBrace();
          const body = block(line, t); let elseBody = null;
          if (T(0) === 'ELSE') { const el = L(); i++; skipBrace(); elseBody = block(el, 'ELSE'); }
          cmds.push({ type: t, condition, body, elseBody, line }); continue;
        }
        report('BAD_ARGUMENT', line, t, `${line}번째 줄: IF 뒤에는 BUTTON_A 또는 BUTTON_B가 와요.`); skipArgs(); continue;
      }
      if (t === 'ELSE') {
        report('ORPHAN_ELSE', line, 'ELSE without IF', `${line}번째 줄: ELSE 앞에 IF 블록이 있어야 해요.`);
        i++; skipBrace(); block(line, 'ELSE'); continue;
      }
      if (t === '{') { report('STRAY_OPEN_BRACE', line, 'unexpected {', `${line}번째 줄: 여는 괄호 {가 혼자 있어요.`); i++; continue; }
      if (KEYWORDS.has(String(t).toUpperCase()) && t !== String(t).toUpperCase()) report('LOWERCASE_COMMAND', line, t, `${line}번째 줄: 명령은 대문자로 써요 (${String(t).toUpperCase()}).`);
      else report('UNKNOWN_COMMAND', line, String(t).slice(0, 40), `${line}번째 줄: 픽셀이 모르는 말이 있어요 (${String(t).slice(0, 12)}).`);
      i++;
    }
    if (openLine != null) report('UNCLOSED_BLOCK', openLine, `${openName} not closed`, `${openLine}번째 줄: ${openName} 블록을 }로 닫아 줘요.`);
    return cmds;
  }
  const raw = block(null, null);
  const commands = resolveCalls(raw, diagnostics);
  checkVars(commands, new Set(), diagnostics, report);
  return { commands, raw, diagnostics };
}

function checkVars(cmds, scope, diagnostics, report) {
  for (const c of cmds) {
    for (const k of ['x', 'y', 'x1', 'y1', 'x2', 'y2']) {
      if (typeof c[k] === 'string' && !scope.has(c[k])) report('UNKNOWN_VARIABLE', c.line, `variable ${c[k]}`, `${c.line}번째 줄: ${c[k]}는 FOR에서 만든 변수가 아니에요.`);
    }
    if (c.body) checkVars(c.body, c.type === 'FOR' ? new Set([...scope, c.var]) : scope, diagnostics, report);
    if (c.elseBody) checkVars(c.elseBody, scope, diagnostics, report);
  }
}

export function emptyGrid(size) { return Array.from({ length: size }, () => Array(size).fill(null)); }
export function cloneGrid(g) { return g.map(r => r.slice()); }

/**
 * @param {object[]} commands parsePixel().commands
 * @param {{size:number, color?:string, held?:Set<string>, grid?:(string|null)[][], handlers?:object, maxSteps?:number}} opts
 * @returns {{steps:object[], grid:(string|null)[][], initial:(string|null)[][], handlers:{A:object[]|null,B:object[]|null,SHAKE:object[]|null}, overflow:boolean, diagnostics:object[]}}
 *   step = {line, type, changes:[[x0,y0,value]], ms, loops, note?}  (x0,y0는 0부터)
 */
export function runPixel(commands, opts) {
  const size = opts.size;
  const color = opts.color || PIXEL_DEFAULT_COLOR;
  const held = opts.held || new Set();
  const max = opts.maxSteps ?? LIMITS.pixelSteps;
  const initial = opts.grid ? cloneGrid(opts.grid) : emptyGrid(size);
  const grid = cloneGrid(initial);
  const handlers = { A: null, B: null, SHAKE: null, ...(opts.handlers || {}) };
  const steps = [];
  const diagnostics = [];
  const loops = [];
  let overflow = false;
  const inb = (x, y) => Number.isInteger(x) && Number.isInteger(y) && x >= 0 && y >= 0 && x < size && y < size;
  const warned = new Set();
  const warn = (code, line, msg, hint) => { const k = code + line; if (!warned.has(k)) { warned.add(k); diagnostics.push(lineDiag(code, line, msg, hint, 'warning')); } };

  function push(c, changes, extra = {}) {
    if (steps.length >= max) { overflow = true; return false; }
    for (const [x, y, v] of changes) grid[y][x] = v;
    steps.push({ line: c.line, type: c.type, changes, ms: 0, loops: loops.map(l => ({ ...l })), ...extra });
    return true;
  }
  function val(v, env) { return typeof v === 'string' ? (v in env ? env[v] : NaN) : v; }

  function exec(cs, env) {
    for (const c of cs) {
      if (overflow) return;
      const V = k => val(c[k], env) - 1;
      switch (c.type) {
        case 'LED_ON': case 'LED_OFF': case 'LED_TOGGLE': case 'LED_COLOR': {
          const x = V('x'), y = V('y');
          if (!inb(x, y)) { warn('OUT_OF_GRID', c.line, `(${x + 1},${y + 1})`, `${c.line}번째 줄: (${x + 1}, ${y + 1}) 칸은 격자 밖이에요.`); push(c, []); break; }
          const v = c.type === 'LED_ON' ? color : c.type === 'LED_OFF' ? null : c.type === 'LED_COLOR' ? c.color : (grid[y][x] ? null : color);
          push(c, [[x, y, v]]);
          break;
        }
        case 'FILL_ALL': { const ch = []; for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) ch.push([x, y, c.color]); push(c, ch); break; }
        case 'FILL_ROW': { const y = V('y'); const ch = []; if (y >= 0 && y < size) for (let x = 0; x < size; x++) ch.push([x, y, c.color]); push(c, ch); break; }
        case 'FILL_COL': { const x = V('x'); const ch = []; if (x >= 0 && x < size) for (let y = 0; y < size; y++) ch.push([x, y, c.color]); push(c, ch); break; }
        case 'CLEAR_ALL': { const ch = []; for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) ch.push([x, y, null]); push(c, ch); break; }
        case 'RECT': {
          const a = [V('x1'), V('y1'), V('x2'), V('y2')];
          if (!a.every(Number.isFinite)) { push(c, []); break; }
          const x1 = Math.max(0, Math.min(a[0], a[2])), x2 = Math.min(size - 1, Math.max(a[0], a[2]));
          const y1 = Math.max(0, Math.min(a[1], a[3])), y2 = Math.min(size - 1, Math.max(a[1], a[3]));
          const ch = []; for (let y = y1; y <= y2; y++) for (let x = x1; x <= x2; x++) ch.push([x, y, c.color]);
          push(c, ch); break;
        }
        case 'BLINK': {
          const x = V('x'), y = V('y');
          if (!inb(x, y)) { push(c, []); break; }
          for (let r = 0; r < c.count; r++) {
            if (!push(c, [[x, y, color]], { ms: 200 })) return;
            if (r === c.count - 1) break; // 마지막엔 켜진 채로 (v1과 동일)
            if (!push(c, [[x, y, null]], { ms: 200 })) return;
          }
          break;
        }
        case 'WAIT': push(c, [], { ms: c.ms }); break;
        case 'SHOW_ICON': {
          const icon = PIXEL_ICONS[String(c.name).toUpperCase()];
          if (!icon) { warn('UNKNOWN_ICON', c.line, c.name, `${c.line}번째 줄: ${c.name} 그림은 없어요 (HEART, SMILEY, X …).`); push(c, []); break; }
          if (size !== 5) { warn('ICON_NEEDS_5', c.line, 'icon on non-5 grid', `${c.line}번째 줄: 그림 아이콘은 5×5 격자에서만 보여요.`); push(c, []); break; }
          const ch = []; for (let y = 0; y < 5; y++) for (let x = 0; x < 5; x++) ch.push([x, y, icon[y][x] ? color : null]);
          push(c, ch); break;
        }
        case 'REPEAT':
          for (let r = 0; r < c.count; r++) { loops.push({ line: c.line, iter: r + 1, count: c.count }); exec(c.body, env); loops.pop(); if (overflow) return; }
          break;
        case 'FOR':
          for (let v = c.from; v <= c.to; v++) {
            // v1 resolvePixelVar는 바깥 FOR가 먼저 치환 → 같은 이름이면 바깥 값이 이긴다
            const env2 = c.var in env ? env : { ...env, [c.var]: v };
            loops.push({ line: c.line, iter: v - c.from + 1, count: c.to - c.from + 1, var: c.var, value: v });
            exec(c.body, env2); loops.pop(); if (overflow) return;
          }
          break;
        case 'ON_BUTTON_A': handlers.A = c.body; push(c, [], { note: 'handler' }); break;
        case 'ON_BUTTON_B': handlers.B = c.body; push(c, [], { note: 'handler' }); break;
        case 'ON_SHAKE': handlers.SHAKE = c.body; push(c, [], { note: 'handler' }); break;
        case 'ON_START': exec(c.body, env); break;
        case 'IF': {
          const pressed = held.has(c.condition === 'BUTTON_A' ? 'A' : 'B');
          const branch = pressed ? c.body : c.elseBody;
          if (branch && branch.length) exec(branch, env);
          break;
        }
        default: break;
      }
    }
  }
  exec(commands, {});
  if (overflow) diagnostics.push(lineDiag('TOO_MANY_STEPS', 1, `> ${max} steps`, `명령이 너무 많아요(${max}개 넘음). 반복 횟수를 줄여 볼까?`));
  return { steps, grid, initial, handlers, overflow, diagnostics };
}

/** 버튼·흔들기 이벤트 실행 (v1 pressButton / triggerShake). 이어지는 trace를 돌려준다. */
export function runEvent(prev, which, opts) {
  const body = prev.handlers[which];
  if (!body) return null;
  const held = new Set(which === 'SHAKE' ? [] : [which]);
  return runPixel(body, { ...opts, grid: prev.grid, handlers: prev.handlers, held });
}

/** trace 재생용 격자 커서: 앞으로는 변화분만 적용, 뒤로 가면 처음부터 다시. */
export function createGridCursor(trace) {
  let grid = cloneGrid(trace.initial);
  let at = -1;
  return {
    seek(i) {
      const target = Math.min(i, trace.steps.length - 1);
      if (target < at) { grid = cloneGrid(trace.initial); at = -1; }
      while (at < target) { at++; for (const [x, y, v] of trace.steps[at].changes) grid[y][x] = v; }
      return grid;
    },
    get index() { return at; },
  };
}

/** 격자에서 켜진 칸 수 */
export function litCount(grid) { let n = 0; for (const r of grid) for (const v of r) if (v) n++; return n; }

/** 목표 배열(0/1)을 격자 모양 불리언으로 */
export function targetOn(target, x, y) { return !!(target[y] && target[y][x]); }
