// 거북이 DSL(turtle-dsl-1) 순수 엔진 — v1 parseTurtleDSL / animateTurtle / turtlePathSimilarity 이관.
//
// 좌표: v1과 같다. 원점(0,0)에서 위(방향 0°)를 보고 출발, RIGHT = 시계 방향. x는 오른쪽, y는 화면 아래쪽(+).
// 문법(v1과 동일, 한 줄에 명령 하나):
//   FORWARD n · BACKWARD n · RIGHT n · LEFT n · PEN_UP · PEN_DOWN · PEN_COLOR #hex · PEN_SIZE n
//   HOME · CLEAR · CIRCLE n · JUMP n · SAY 글 · STAMP 이모지 · BG #RRGGBB
//   REPEAT n {  …  }   (여는 괄호는 다음 줄에 있어도 됨) · DEF 이름 { … } · CALL 이름 · // 주석
// v1과 다른 점: 모르는 줄·잘못된 인자·짝 없는 괄호를 버리지 않고 줄 번호 진단을 남긴다.

import { LIMITS, lineDiag } from './common.js';

const NUM_CMDS = new Set(['FORWARD', 'BACKWARD', 'RIGHT', 'LEFT', 'PEN_SIZE']);
const BARE_CMDS = new Set(['PEN_UP', 'PEN_DOWN', 'HOME', 'CLEAR']);
const KEYWORDS = ['FORWARD', 'BACKWARD', 'RIGHT', 'LEFT', 'PEN_UP', 'PEN_DOWN', 'PEN_COLOR', 'PEN_SIZE', 'HOME', 'CLEAR',
  'CIRCLE', 'JUMP', 'SAY', 'STAMP', 'BG', 'REPEAT', 'DEF', 'CALL'];
const NUM_RE = /^-?\d+(?:\.\d+)?$/;

export const TURTLE_DEFAULTS = Object.freeze({ color: '#00FF88', size: 3, bg: '#1a1a2e' });

/**
 * @param {string} text
 * @returns {{commands: object[], raw: object[], diagnostics: object[]}}
 *   raw = DEF/CALL 원형 유지(v1 forBlocks=true), commands = CALL을 본문으로 펼친 실행용
 */
export function parseTurtle(text) {
  const diagnostics = [];
  const root = { type: 'ROOT', body: [], line: 0 };
  const stack = [root];
  const lines = String(text ?? '').split('\n');
  for (let i = 0; i < lines.length; i++) {
    const ln = i + 1;
    const line = lines[i].trim();
    if (!line || line.startsWith('//')) continue;
    const cur = stack[stack.length - 1];
    if (line === '{') {
      if (cur.awaitBrace) { cur.awaitBrace = false; continue; }
      diagnostics.push(lineDiag('STRAY_OPEN_BRACE', ln, 'unexpected {', `${ln}번째 줄: 여는 괄호 {가 혼자 있어요.`));
      continue;
    }
    cur.awaitBrace = false;
    if (line === '}') {
      if (stack.length === 1) {
        diagnostics.push(lineDiag('UNEXPECTED_CLOSE', ln, 'unmatched }', `${ln}번째 줄: 닫는 괄호 }의 짝이 없어요.`));
        continue;
      }
      stack.pop();
      continue;
    }
    let m = line.match(/^REPEAT\s+(\d+)\s*\{?$/);
    if (m) {
      const n = parseInt(m[1], 10);
      if (n > LIMITS.repeatMax) diagnostics.push(lineDiag('REPEAT_CLAMPED', ln, `REPEAT ${n} > ${LIMITS.repeatMax}`, `${ln}번째 줄: 반복은 ${LIMITS.repeatMax}번까지만 해요.`, 'warning'));
      const node = { type: 'REPEAT', count: Math.min(n, LIMITS.repeatMax), body: [], line: ln, awaitBrace: !line.endsWith('{') };
      cur.body.push(node); stack.push(node);
      continue;
    }
    m = line.match(/^DEF\s+(\S+)\s*\{?$/);
    if (m) {
      const node = { type: 'DEF', name: m[1], body: [], line: ln, awaitBrace: !line.endsWith('{') };
      cur.body.push(node); stack.push(node);
      continue;
    }
    m = line.match(/^CALL\s+(\S+)$/);
    if (m) { cur.body.push({ type: 'CALL', name: m[1], line: ln }); continue; }
    m = line.match(/^(CIRCLE|JUMP)\s+(\d+(?:\.\d+)?)$/);
    if (m) { cur.body.push({ type: m[1], value: parseFloat(m[2]), line: ln }); continue; }
    m = line.match(/^SAY\s+(.+)$/);
    if (m) { cur.body.push({ type: 'SAY', text: m[1].trim().slice(0, 20), line: ln }); continue; }
    m = line.match(/^STAMP\s+(.+)$/);
    if (m) { cur.body.push({ type: 'STAMP', emoji: m[1].trim().slice(0, 4), line: ln }); continue; }
    m = line.match(/^BG\s+(#[0-9A-Fa-f]{6})$/);
    if (m) { cur.body.push({ type: 'BG', color: m[1], line: ln }); continue; }
    m = line.match(/^(FORWARD|BACKWARD|RIGHT|LEFT|PEN_UP|PEN_DOWN|PEN_COLOR|PEN_SIZE|HOME|CLEAR)(?:\s+(.*))?$/);
    if (m) {
      const type = m[1];
      const arg = (m[2] || '').trim();
      if (NUM_CMDS.has(type)) {
        if (!arg) { diagnostics.push(lineDiag('MISSING_NUMBER', ln, `${type} needs a number`, `${ln}번째 줄: ${type} 뒤에 숫자를 써 줘요.`)); continue; }
        if (!NUM_RE.test(arg)) {
          const extra = /^-?\d/.test(arg);
          diagnostics.push(lineDiag(extra ? 'EXTRA_TOKENS' : 'BAD_NUMBER', ln, `${type} ${arg}`,
            extra ? `${ln}번째 줄: 한 줄에 명령 하나만 써 줘요.` : `${ln}번째 줄: ${type} 뒤에는 숫자가 와야 해요.`));
          continue;
        }
        cur.body.push({ type, value: parseFloat(arg), line: ln });
      } else if (type === 'PEN_COLOR') {
        cur.body.push({ type, value: arg || '#000000', line: ln });
      } else {
        if (arg) diagnostics.push(lineDiag('EXTRA_TOKENS', ln, `${type} takes no argument`, `${ln}번째 줄: ${type} 뒤에는 아무것도 쓰지 않아요.`, 'warning'));
        cur.body.push({ type, line: ln });
      }
      continue;
    }
    const head = line.split(/[\s{]+/)[0];
    if (KEYWORDS.includes(head)) diagnostics.push(lineDiag('BAD_ARGUMENT', ln, line.slice(0, 80), `${ln}번째 줄: ${head}의 쓰는 법이 달라요.`));
    else if (KEYWORDS.includes(head.toUpperCase())) diagnostics.push(lineDiag('LOWERCASE_COMMAND', ln, line.slice(0, 80), `${ln}번째 줄: 명령은 대문자로 써요 (${head.toUpperCase()}).`));
    else diagnostics.push(lineDiag('UNKNOWN_COMMAND', ln, line.slice(0, 80), `${ln}번째 줄: 거북이가 모르는 명령이에요.`));
  }
  for (let k = stack.length - 1; k > 0; k--) {
    const b = stack[k];
    diagnostics.push(lineDiag('UNCLOSED_BLOCK', b.line, `${b.type} not closed`, `${b.line}번째 줄: ${b.type === 'DEF' ? '함수' : '반복'} 블록을 }로 닫아 줘요.`));
  }
  const raw = strip(root.body);
  const commands = resolveCalls(raw, diagnostics);
  return { commands, raw, diagnostics };
}

function strip(cmds) {
  return cmds.map(c => {
    const { awaitBrace, ...rest } = c; // eslint-disable-line no-unused-vars
    if (rest.body) rest.body = strip(rest.body);
    return rest;
  });
}

/** v1 resolveCalls: CALL → 함수 본문. 모르는 함수는 진단(v1은 조용히 버림). */
export function resolveCalls(cmds, diagnostics = []) {
  const fns = {};
  (function collect(cs) { for (const c of cs) { if (c.type === 'DEF') fns[c.name] = c.body || []; if (c.body) collect(c.body); if (c.elseBody) collect(c.elseBody); } })(cmds);
  const reported = new Set();
  function walk(cs, depth) {
    const out = [];
    for (const c of cs) {
      if (c.type === 'DEF') continue;
      if (c.type === 'CALL') {
        if (!fns[c.name]) {
          const key = 'u' + c.line;
          if (!reported.has(key)) { reported.add(key); diagnostics.push(lineDiag('UNKNOWN_FUNCTION', c.line, `no DEF ${c.name}`, `${c.line}번째 줄: ${c.name} 함수를 먼저 DEF로 만들어 줘요.`)); }
        } else if (depth >= LIMITS.callDepth) {
          const key = 'd' + c.line;
          if (!reported.has(key)) { reported.add(key); diagnostics.push(lineDiag('CALL_TOO_DEEP', c.line, 'call depth', `${c.line}번째 줄: 함수가 자기 자신을 너무 많이 불러요.`, 'warning')); }
        } else out.push(...walk(fns[c.name], depth + 1));
        continue;
      }
      const cc = { ...c };
      if (cc.body) cc.body = walk(cc.body, depth);
      if (cc.elseBody) cc.elseBody = walk(cc.elseBody, depth);
      out.push(cc);
    }
    return out;
  }
  return walk(cmds, 0);
}

const rad = a => (a - 90) * Math.PI / 180;
const norm = a => ((Math.round(a * 1000) / 1000 % 360) + 360) % 360;

/**
 * 한 단계씩 결정적으로 재생할 trace를 만든다(v1 animateTurtle의 flatten과 같은 의미).
 * @param {object[]} commands parseTurtle().commands
 * @param {{maxSteps?:number}} [opts]
 * @returns {{steps: object[], final: object, overflow: boolean, bg: string, diagnostics: object[]}}
 *   step = {line, type, value?, loops:[{line,iter,count}], from:{x,y,angle}, to:{x,y,angle}, seg?, circle?, stamp?, say?, clear?, pen:{down,color,size}}
 */
export function runTurtle(commands, opts = {}) {
  const max = opts.maxSteps ?? LIMITS.turtleSteps;
  const st = { x: 0, y: 0, angle: 0, down: true, color: TURTLE_DEFAULTS.color, size: TURTLE_DEFAULTS.size };
  const steps = [];
  const diagnostics = [];
  let overflow = false;
  let bg = TURTLE_DEFAULTS.bg;
  const loops = [];
  function exec(cs) {
    for (const c of cs) {
      if (overflow) return;
      if (c.type === 'REPEAT') {
        for (let r = 0; r < c.count; r++) {
          loops.push({ line: c.line, iter: r + 1, count: c.count });
          exec(c.body);
          loops.pop();
          if (overflow) return;
        }
        continue;
      }
      if (steps.length >= max) { overflow = true; return; }
      const from = { x: st.x, y: st.y, angle: st.angle };
      const s = { line: c.line, type: c.type, loops: loops.map(l => ({ ...l })), from };
      if ('value' in c) s.value = c.value;
      switch (c.type) {
        case 'FORWARD': case 'BACKWARD': {
          const d = (c.type === 'FORWARD' ? 1 : -1) * c.value;
          const nx = st.x + d * Math.cos(rad(st.angle)), ny = st.y + d * Math.sin(rad(st.angle));
          if (st.down) s.seg = { x1: st.x, y1: st.y, x2: nx, y2: ny, color: st.color, size: st.size, len: Math.abs(c.value) };
          st.x = nx; st.y = ny;
          break;
        }
        case 'JUMP': st.x += c.value * Math.cos(rad(st.angle)); st.y += c.value * Math.sin(rad(st.angle)); break;
        case 'RIGHT': st.angle += c.value; s.turn = c.value; break;
        case 'LEFT': st.angle -= c.value; s.turn = -c.value; break;
        case 'PEN_UP': st.down = false; break;
        case 'PEN_DOWN': st.down = true; break;
        case 'PEN_COLOR': st.color = c.value; break;
        case 'PEN_SIZE': st.size = c.value; break;
        case 'HOME': st.x = 0; st.y = 0; st.angle = 0; break;
        case 'CLEAR': s.clear = true; break;
        case 'CIRCLE': s.circle = { x: st.x, y: st.y, r: c.value, color: st.color, size: st.size }; break;
        case 'STAMP': s.stamp = { x: st.x, y: st.y, emoji: c.emoji }; break;
        case 'SAY': s.say = { x: st.x, y: st.y, text: c.text }; break;
        case 'BG': bg = c.color; break;
        default: break;
      }
      s.to = { x: st.x, y: st.y, angle: st.angle };
      s.pen = { down: st.down, color: st.color, size: st.size };
      steps.push(s);
    }
  }
  exec(commands);
  if (overflow) diagnostics.push(lineDiag('TOO_MANY_STEPS', 1, `> ${max} steps`, `명령이 너무 많아요(${max}개 넘음). 반복 횟수를 줄여 볼까?`));
  return { steps, final: { x: st.x, y: st.y, angle: st.angle, heading: norm(st.angle) }, overflow, bg, diagnostics };
}

/** i번째 단계까지(포함) 화면에 남아 있는 그림 요소. i<0 이면 빈 그림. */
export function sceneAt(trace, i) {
  const segs = [], circles = [], stamps = [], says = [];
  for (let k = 0; k <= i && k < trace.steps.length; k++) {
    const s = trace.steps[k];
    if (s.clear) { segs.length = 0; circles.length = 0; stamps.length = 0; says.length = 0; }
    if (s.seg) segs.push(s.seg);
    if (s.circle) circles.push(s.circle);
    if (s.stamp) stamps.push(s.stamp);
    if (s.say) says.push(s.say);
  }
  const s = trace.steps[Math.min(i, trace.steps.length - 1)];
  const pose = i < 0 || !s ? { x: 0, y: 0, angle: 0 } : s.to;
  return { segs, circles, stamps, says, pose };
}

/** 방향(도) → 학생용 이름 */
export function headingName(angle) {
  const a = norm(angle);
  const names = [[0, '위'], [45, '오른쪽 위'], [90, '오른쪽'], [135, '오른쪽 아래'], [180, '아래'], [225, '왼쪽 아래'], [270, '왼쪽'], [315, '왼쪽 위'], [360, '위']];
  let best = names[0];
  for (const n of names) if (Math.abs(n[0] - a) < Math.abs(best[0] - a)) best = n;
  return best[1];
}
export const normAngle = norm;

// ── 채점용 경로 (v1 turtleCommandsToPath / densifyPath / pathCoverage / turtlePathSimilarity 그대로) ──

/** 펜 내림 구간만 서브패스로. PEN_UP·JUMP·HOME 이동은 새 서브패스. */
export function turtleCommandsToPath(commands) {
  let x = 0, y = 0, angle = 0, penDown = true; const path = []; let sub = null;
  function draw(nx, ny) {
    if (penDown) { if (!sub) { sub = [{ x, y }]; path.push(sub); } sub.push({ x: nx, y: ny }); } else sub = null;
    x = nx; y = ny;
  }
  function exec(cmds) {
    for (const cmd of cmds) {
      if (cmd.type === 'FORWARD') draw(x + cmd.value * Math.cos(rad(angle)), y + cmd.value * Math.sin(rad(angle)));
      else if (cmd.type === 'BACKWARD') draw(x - cmd.value * Math.cos(rad(angle)), y - cmd.value * Math.sin(rad(angle)));
      else if (cmd.type === 'JUMP') { x += cmd.value * Math.cos(rad(angle)); y += cmd.value * Math.sin(rad(angle)); sub = null; }
      else if (cmd.type === 'RIGHT') angle += cmd.value; else if (cmd.type === 'LEFT') angle -= cmd.value;
      else if (cmd.type === 'PEN_UP') { penDown = false; sub = null; } else if (cmd.type === 'PEN_DOWN') penDown = true;
      else if (cmd.type === 'HOME') { x = 0; y = 0; angle = 0; sub = null; }
      else if (cmd.type === 'REPEAT') { for (let r = 0; r < cmd.count; r++) exec(cmd.body); }
    }
  }
  exec(commands);
  return path;
}

export function densifyPath(subpaths, gap) {
  const pts = [];
  for (const sp of subpaths) {
    if (!sp.length) continue;
    pts.push({ x: sp[0].x, y: sp[0].y });
    for (let i = 1; i < sp.length; i++) {
      const a = sp[i - 1], b = sp[i], d = Math.hypot(b.x - a.x, b.y - a.y);
      const n = Math.max(1, Math.ceil(d / gap));
      for (let k = 1; k <= n; k++) pts.push({ x: a.x + (b.x - a.x) * k / n, y: a.y + (b.y - a.y) * k / n });
    }
  }
  return pts;
}

export function pathCoverage(from, to, tol) {
  if (!from.length) return 0;
  const tol2 = tol * tol;
  let hit = 0;
  for (const p of from) {
    for (const q of to) { const dx = p.x - q.x, dy = p.y - q.y; if (dx * dx + dy * dy <= tol2) { hit++; break; } }
  }
  return hit / from.length;
}

/** 양방향 커버리지의 min = 유사도. 학생 경로는 원본·좌우 거울 중 높은 쪽(거울 해법 인정). 둘 다 비면 1. */
export function turtlePathSimilarity(targetCmds, studentCmds, tol) {
  const targetPts = densifyPath(turtleCommandsToPath(targetCmds), 4);
  const stuPts = densifyPath(turtleCommandsToPath(studentCmds), 4);
  if (!targetPts.length && !stuPts.length) return 1;
  if (!targetPts.length || !stuPts.length) return 0;
  const mirrorPts = stuPts.map(p => ({ x: -p.x, y: p.y }));
  const simOf = sp => Math.min(pathCoverage(targetPts, sp, tol), pathCoverage(sp, targetPts, tol));
  return Math.max(simOf(stuPts), simOf(mirrorPts));
}

/** 선분·원 목록의 경계 상자 (원점 포함) */
export function boundsOf(segs, circles = []) {
  let minX = 0, minY = 0, maxX = 0, maxY = 0;
  const add = (x, y) => { if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y; };
  for (const s of segs) { add(s.x1, s.y1); add(s.x2, s.y2); }
  for (const c of circles) { add(c.x - c.r, c.y - c.r); add(c.x + c.r, c.y + c.r); }
  return { minX, minY, maxX, maxY };
}

/**
 * 화면 맞춤(화면 밖 선 재맞춤): 기본은 v1과 같은 1:1 가운데 원점. 그림이 넘치면 전체가 보이도록 줄이고 옮긴다.
 * 목표 고스트와 학생 그림은 반드시 같은 view로 그린다 → 확대/축소해도 좌표가 일치한다.
 * @returns {{scale:number, ox:number, oy:number, fitted:boolean, toScreen:(x:number,y:number)=>{x:number,y:number}, toWorld:(sx:number,sy:number)=>{x:number,y:number}}}
 */
export function fitView(bounds, W, H, pad = 28) {
  const need = {
    minX: Math.min(bounds.minX, -40), maxX: Math.max(bounds.maxX, 40),
    minY: Math.min(bounds.minY, -40), maxY: Math.max(bounds.maxY, 40),
  };
  const halfW = W / 2 - pad, halfH = H / 2 - pad;
  const fitsCentered = -need.minX <= halfW && need.maxX <= halfW && -need.minY <= halfH && need.maxY <= halfH;
  let scale = 1, cx = 0, cy = 0;
  if (!fitsCentered) {
    const bw = need.maxX - need.minX, bh = need.maxY - need.minY;
    scale = Math.min(1, (W - pad * 2) / bw, (H - pad * 2) / bh);
    cx = (need.minX + need.maxX) / 2; cy = (need.minY + need.maxY) / 2;
  }
  const ox = W / 2 - cx * scale, oy = H / 2 - cy * scale;
  return {
    scale, ox, oy, fitted: !fitsCentered,
    toScreen: (x, y) => ({ x: ox + x * scale, y: oy + y * scale }),
    toWorld: (sx, sy) => ({ x: (sx - ox) / scale, y: (sy - oy) / scale }),
  };
}
