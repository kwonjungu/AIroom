// 구 공방 DSL(studio-dsl-1) 읽기 어댑터 — WP4.
// v1 parseStudioDSL(public/vibecoding.html)과 같은 문법을 읽되, v1이 조용히 버리던 것
// (모르는 명령, 닫히지 않은 블록, 깊이 초과, 이벤트 블록 중첩, 고아 ELSE, 잘못된 인자)을
// 줄 번호가 있는 Diagnostic(path='line:N')으로 보고한다. 원문은 항상 보존한다.

import { diag, validateProject, LIMITS, ENGINE_VERSIONS } from '../contracts/schemas.js';
import { checkStudioSemantics } from './semantic.js';

const MAX_DEPTH = LIMITS.nestingDepth; // v1과 같은 8
const EVENT_TYPES = new Set(['ON_KEY', 'ON_TOUCH', 'EVERY', 'ON_SCORE', 'ON_START', 'ON_VAR', 'FOREVER']);
const RESERVED = ['RANDOM', 'PLAYER_X', 'PLAYER_Y', 'TIMER', 'MOUSE_X', 'MOUSE_Y', 'COUNT', 'DISTANCE', 'TOUCHING', 'TOUCHING_EDGE', 'KEY_DOWN', 'AND', 'OR', 'NOT', 'IF', 'ELSE', 'SET', 'CHANGE', 'REPEAT', 'REPEAT_UNTIL', 'FOREVER', 'EVERY', 'WAIT', 'PLAYER', 'SPAWN', 'SPAWN_RANDOM', 'BG', 'SAY', 'SCORE', 'MOVE_X', 'MOVE_Y', 'MOVE_ALL', 'REMOVE', 'END_WIN', 'END_LOSE', 'ON_KEY', 'ON_TOUCH', 'ON_SCORE', 'ON_VAR', 'ON_START', 'SHOW_VAR', 'HIDE_VAR', 'UP', 'DOWN', 'LEFT', 'RIGHT', 'SPACE', 'GOTO', 'DEF', 'CALL', 'STOP'];
const KNOWN_BUT_UNSUPPORTED = new Set(['WAIT', 'GOTO', 'DEF', 'CALL', 'STOP']);

export function isLegacyVarName(name) {
  if (!name || typeof name !== 'string' || name.length > 12) return false;
  if (!/^[A-Za-z가-힣][A-Za-z0-9가-힣_]*$/.test(name)) return false;
  return !RESERVED.includes(name);
}

function parseValue(toks) {
  const t = toks[0];
  if (t === undefined) return null;
  if (/^-?\d+$/.test(t)) { toks.shift(); return { k: 'num', v: parseInt(t, 10) }; }
  if (t === 'RANDOM') {
    if (!/^-?\d+$/.test(toks[1] || '') || !/^-?\d+$/.test(toks[2] || '')) return null;
    const a = parseInt(toks[1], 10), b = parseInt(toks[2], 10); toks.splice(0, 3); return { k: 'rand', a, b };
  }
  if (t === 'PLAYER_X' || t === 'PLAYER_Y') { toks.shift(); return { k: 'sense', name: t }; }
  if (isLegacyVarName(t)) { toks.shift(); return { k: 'var', name: t }; }
  return null;
}

export function parseLegacyExpr(str) {
  if (!str) return null;
  const toks = String(str).trim().split(/\s+/).filter(Boolean);
  const a = parseValue(toks);
  if (!a) return null;
  if (!toks.length) return a;
  const op = toks.shift();
  if (!['+', '-', '*', '/'].includes(op)) return null;
  const b = parseValue(toks);
  if (!b || toks.length) return null;
  return { k: 'bin', op, a, b };
}

export function parseLegacyCond(str) {
  if (!str) return null;
  const s = String(str).trim();
  const m = s.match(/^TOUCHING\s+(\S+)$/);
  if (m) return { k: 'touch', emoji: m[1] };
  const toks = s.split(/\s+/).filter(Boolean);
  const a = parseValue(toks);
  if (!a) return null;
  const op = toks.shift();
  if (!['=', '!=', '<', '>', '<=', '>='].includes(op)) return null;
  const b = parseValue(toks);
  if (!b || toks.length) return null;
  return { k: 'cmp', op, a, b };
}

const HEADERS = [
  ['ON_KEY', /^ON_KEY\s+(UP|DOWN|LEFT|RIGHT)\s*(\{)?$/, m => ({ key: m[1] })],
  ['ON_TOUCH', /^ON_TOUCH\s+(\S+?)\s*(\{)?$/, m => ({ emoji: m[1] })],
  ['EVERY', /^EVERY\s+(\d+)\s*(\{)?$/, m => ({ ms: parseInt(m[1], 10) })],
  ['ON_SCORE', /^ON_SCORE\s+(\d+)\s*(\{)?$/, m => ({ value: parseInt(m[1], 10) })],
  ['ON_START', /^ON_START\s*(\{)?$/, () => ({})],
  ['ON_VAR', /^ON_VAR\s+(\S+)\s+(<=|>=|!=|=|<|>)\s+(.+?)\s*(\{)?$/, m => ({ name: m[1], op: m[2], raw: m[3] })],
  ['FOREVER', /^FOREVER\s*(\{)?$/, () => ({})],
  ['REPEAT_UNTIL', /^REPEAT_UNTIL\s+(.+?)\s*(\{)?$/, m => ({ raw: m[1] })],
  ['REPEAT', /^REPEAT\s+(\d+)\s*(\{)?$/, m => ({ count: parseInt(m[1], 10) })],
  ['IF', /^IF\s+(.+?)\s*(\{)?$/, m => ({ raw: m[1] })],
];

/**
 * 엄격 파서. v1과 같은 AST 모양 + 각 명령의 line.
 * @param {string} text
 * @returns {{ast: object[], diagnostics: object[]}}
 */
export function parseLegacyStudio(text) {
  const diagnostics = [];
  const D = (code, line, message, studentHint, severity = 'error') =>
    diagnostics.push(diag(code, { severity, path: `line:${line}`, message, studentHint }));
  if (typeof text !== 'string' || !text.trim()) return { ast: [], diagnostics };

  // 한 줄 표기 'ON_KEY UP { MOVE_Y -20 }'를 조각으로 나누되 원래 줄 번호를 유지한다
  const lines = [];
  text.split('\n').forEach((raw, i) => {
    const t = raw.trim();
    if (!t || t.startsWith('//')) return;
    for (const piece of t.replace(/\{/g, ' {\n').replace(/\}/g, '\n}\n').split('\n')) {
      const p = piece.trim();
      if (p) lines.push({ text: p, line: i + 1 });
    }
  });
  let i = 0;

  // 블록 여는 중괄호 소비. 없으면 v1처럼 다음 줄들을 본문으로 읽되 오류로 보고
  function openBrace(hasInline, header) {
    if (hasInline) return;
    if (i < lines.length && lines[i].text === '{') { i++; return; }
    D('LEGACY_MISSING_BRACE', header.line, `'${header.text}' needs '{'`, '블록을 여는 { 가 빠졌어요.');
  }

  /**
   * @param {number} depth  이 블록 안 명령의 깊이 (최상위 0)
   * @param {{line:number,text:string}|null} opener
   * @param {{inEvent:boolean, inTouch:boolean, dropping:boolean}} ctx
   */
  function parseBlock(depth, opener, ctx) {
    const cmds = [];
    const push = c => { if (!ctx.dropping) cmds.push(c); };
    while (i < lines.length) {
      const { text: L, line } = lines[i];
      if (L === '}') {
        i++;
        if (opener) return cmds;
        D('LEGACY_UNEXPECTED_CLOSE', line, "'}' without matching block", '짝이 없는 } 가 있어요.');
        continue;
      }
      if (L === '{') { i++; D('LEGACY_UNEXPECTED_OPEN', line, "'{' without block header", '무슨 블록인지 없이 { 만 있어요.'); parseBlock(depth + 1, { line, text: '{' }, { ...ctx, dropping: true }); continue; }

      // ── 블록 명령 ──
      let matched = false;
      for (const [type, re, pick] of HEADERS) {
        const m = L.match(re);
        if (!m) continue;
        matched = true;
        i++;
        const header = { line, text: L };
        openBrace(L.endsWith('{'), header);
        const isEvent = EVENT_TYPES.has(type);
        let dropping = ctx.dropping;
        if (!dropping && isEvent && depth > 0) {
          D('LEGACY_NESTED_EVENT', line, `${type} must be top-level (found at depth ${depth})`, '이벤트 블록(~하면, 마다)은 다른 블록 안에 넣을 수 없어요.');
          dropping = true;
        }
        if (!dropping && depth + 1 > MAX_DEPTH) {
          D('LEGACY_TOO_DEEP', line, `block body depth ${depth + 1} > ${MAX_DEPTH}`, `블록을 ${MAX_DEPTH}번보다 깊이 넣었어요.`);
          dropping = true;
        }
        const body = parseBlock(depth + 1, header, { inEvent: ctx.inEvent || isEvent, inTouch: ctx.inTouch || type === 'ON_TOUCH', dropping });
        let elseBody = null;
        if (type === 'IF' && i < lines.length && /^ELSE\s*(\{)?$/.test(lines[i].text)) {
          const el = lines[i]; i++;
          openBrace(el.text.endsWith('{'), el);
          elseBody = parseBlock(depth + 1, el, { ...ctx, dropping });
        }
        if (dropping) break;
        const f = pick(m);
        const node = { type, line, ...f, body };
        if (type === 'EVERY' && f.ms < 50) { D('LEGACY_VALUE_CLAMPED', line, `EVERY ${f.ms} < 50 → 50`, '너무 짧은 간격이라 50ms로 맞췄어요.', 'warning'); node.ms = 50; }
        if (type === 'REPEAT' && f.count > 100) { D('LEGACY_VALUE_CLAMPED', line, `REPEAT ${f.count} > 100 → 100`, '반복은 100번까지만 할 수 있어요.', 'warning'); node.count = 100; }
        if (type === 'FOREVER') { node.type = 'EVERY'; node.ms = 50; node.forever = true; }
        if (type === 'ON_VAR') {
          const v = parseLegacyExpr(f.raw);
          delete node.raw;
          if (!isLegacyVarName(f.name) || !v || v.k === 'bin') { D('LEGACY_BAD_ARGUMENT', line, `ON_VAR ${f.name} ${f.op} ${f.raw}`, '변수 이름이나 비교하는 값이 올바르지 않아요.'); break; }
          node.value = v;
        }
        if (type === 'IF' || type === 'REPEAT_UNTIL') {
          const cond = parseLegacyCond(f.raw);
          delete node.raw;
          if (!cond) { D('LEGACY_BAD_ARGUMENT', line, `condition '${f.raw}'`, '조건을 이해하지 못했어요. "값 비교 값" 한 개만 써 줘.'); break; }
          node.cond = cond;
          if (type === 'IF') node.elseBody = elseBody;
        }
        push(node);
        break;
      }
      if (matched) continue;
      if (/^ELSE\s*(\{)?$/.test(L)) {
        i++;
        D('LEGACY_ORPHAN_ELSE', line, 'ELSE without IF', '"아니면"은 "만약" 바로 뒤에만 올 수 있어요.');
        openBrace(L.endsWith('{'), { line, text: L });
        parseBlock(depth + 1, { line, text: L }, { ...ctx, dropping: true });
        continue;
      }

      // ── 한 줄 명령 ──
      i++;
      if (!ctx.dropping && depth > MAX_DEPTH) { D('LEGACY_TOO_DEEP', line, `depth ${depth} > ${MAX_DEPTH}`, `블록을 ${MAX_DEPTH}번보다 깊이 넣었어요.`); continue; }
      const c = parseSimple(L, line, ctx);
      if (c) push(c);
    }
    if (opener) D('LEGACY_UNCLOSED_BLOCK', opener.line, `'${opener.text}' is never closed`, '블록을 닫는 } 가 빠졌어요.');
    return cmds;
  }

  function parseSimple(L, line, ctx) {
    let m;
    const bad = what => { D('LEGACY_BAD_ARGUMENT', line, what, '명령에 들어간 값이 올바르지 않아요.'); return null; };
    if ((m = L.match(/^SET\s+(\S+)\s+(.+)$/))) { const e = parseLegacyExpr(m[2]); return isLegacyVarName(m[1]) && e ? { type: 'SET', line, name: m[1], expr: e } : bad(L); }
    if ((m = L.match(/^CHANGE\s+(\S+)\s+(.+)$/))) { const v = parseLegacyExpr(m[2]); return isLegacyVarName(m[1]) && v && v.k !== 'bin' ? { type: 'CHANGE', line, name: m[1], value: v } : bad(L); }
    if ((m = L.match(/^SHOW_VAR\s+(\S+)$/))) return isLegacyVarName(m[1]) ? { type: 'SHOW_VAR', line, name: m[1] } : bad(L);
    if ((m = L.match(/^HIDE_VAR\s+(\S+)$/))) return isLegacyVarName(m[1]) ? { type: 'HIDE_VAR', line, name: m[1] } : bad(L);
    if ((m = L.match(/^PLAYER\s+(\S+)\s+(-?\d+)\s+(-?\d+)$/))) return { type: 'PLAYER', line, emoji: m[1], x: +m[2], y: +m[3] };
    if ((m = L.match(/^SPAWN_RANDOM\s+(\S+)$/))) return { type: 'SPAWN_RANDOM', line, emoji: m[1] };
    if ((m = L.match(/^SPAWN\s+(\S+)\s+(-?\d+)\s+(-?\d+)$/))) return { type: 'SPAWN', line, emoji: m[1], x: +m[2], y: +m[3] };
    if ((m = L.match(/^MOVE_ALL\s+(\S+)\s+(-?\d+)\s+(-?\d+)$/))) return { type: 'MOVE_ALL', line, emoji: m[1], dx: +m[2], dy: +m[3] };
    if ((m = L.match(/^MOVE_([XY])\s+(-?\d+)$/))) return { type: 'MOVE_' + m[1], line, value: +m[2] };
    if ((m = L.match(/^MOVE_([XY])\s+(.+)$/))) { const e = parseLegacyExpr(m[2]); return e && e.k !== 'bin' ? { type: 'MOVE_' + m[1], line, expr: e } : bad(L); }
    if ((m = L.match(/^BG\s+(space|maze|stage-meadow|stage-space)$/))) return { type: 'BG', line, img: m[1] };
    if ((m = L.match(/^BG\s+(#[0-9A-Fa-f]{3,6})$/))) return { type: 'BG', line, color: m[1] };
    if ((m = L.match(/^SCORE\s+(-?\d+)$/))) return { type: 'SCORE', line, value: +m[1] };
    if ((m = L.match(/^SAY\s+(.+)$/))) return { type: 'SAY', line, text: m[1] };
    if (L === 'REMOVE') {
      if (!ctx.inTouch && !ctx.dropping) D('LEGACY_REMOVE_OUTSIDE_TOUCH', line, 'REMOVE outside ON_TOUCH does nothing', '"없애기"는 "닿으면" 블록 안에서만 동작해요.', 'warning');
      return { type: 'REMOVE', line };
    }
    if (L === 'END_WIN') return { type: 'END_WIN', line };
    if (L === 'END_LOSE') return { type: 'END_LOSE', line };
    if (/^NEXT\s*:/.test(L)) { D('LEGACY_IGNORED_LINE', line, 'AI suggestion line (NEXT:) is not code', 'AI 추천 문장 줄은 코드가 아니라서 건너뛰었어요.', 'warning'); return null; }
    const head = L.split(/\s+/)[0];
    if (/^(ON_KEY|ON_TOUCH|EVERY|ON_SCORE|ON_VAR|REPEAT|REPEAT_UNTIL|IF|PLAYER|SPAWN|SPAWN_RANDOM|MOVE_ALL|MOVE_X|MOVE_Y|BG|SCORE|SET|CHANGE|SHOW_VAR|HIDE_VAR)$/.test(head)) return bad(L);
    if (KNOWN_BUT_UNSUPPORTED.has(head)) { D('LEGACY_UNSUPPORTED_COMMAND', line, `${head} is not supported`, `'${head}' 명령은 아직 쓸 수 없어요.`); return null; }
    D('LEGACY_UNKNOWN_COMMAND', line, `unknown command '${L.slice(0, 60)}'`, '모르는 명령이 있어요. 철자를 확인해 줘.');
    return null;
  }

  const ast = parseBlock(0, null, { inEvent: false, inTouch: false, dropping: false });
  return { ast, diagnostics };
}

// ── studio-2 변환 ──

const EMOJI_ENTITY = { '🍎': 'apple', '⭐': 'star', '💎': 'gem', '🍬': 'candy', '💣': 'bomb', '👾': 'alien', '🌸': 'flower', '🐟': 'fish', '🪙': 'coin', '☄️': 'meteor' };
const BG_PRESET = { space: 'bg-space', maze: 'bg-ruins', 'stage-meadow': 'bg-meadow', 'stage-space': 'bg-space' };
const LIFE_VARS = new Set(['목숨', '생명', 'lives', 'life']);
const SCALE = 2; // v1 400×300 → v2 800×600
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

function hashText(s) {
  let h = 0x811c9dc5;
  for (let k = 0; k < s.length; k++) { h ^= s.charCodeAt(k); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(36);
}

/**
 * 구 DSL → studio-2 프로젝트. 알아볼 수 있는 규칙만 노드로 옮기고, 원문은 legacySource 노드로 항상 보존한다.
 * @param {string} text
 * @param {{id?:string, title?:string, now?:string}} [meta]
 * @returns {{project:object, ast:object[], diagnostics:object[], original:string, converted:boolean}}
 */
export function legacyToProject(text, meta = {}) {
  const original = typeof text === 'string' ? text : '';
  const { ast, diagnostics } = parseLegacyStudio(original);
  const W = (code, line, message, studentHint) => diagnostics.push(diag(code, { severity: 'warning', path: line ? `line:${line}` : '$', message, studentHint }));
  const unconverted = [];
  const skip = c => unconverted.push(c.line);

  let player = null, bg = null, lives = 0, fourWay = false;
  const falls = new Map();     // emoji -> {intervalMs, line}
  const speeds = new Map();    // emoji -> px/s
  const scatter = new Map();   // emoji -> count
  const touches = new Map();   // emoji -> effects[]
  let winScore = null, loseLives = false;

  const setup = c => {
    if (c.type === 'PLAYER' && !player) { player = c; return true; }
    if (c.type === 'BG') { bg = c.img ? BG_PRESET[c.img] : 'color:' + c.color; return true; }
    if (c.type === 'SET' && LIFE_VARS.has(c.name) && c.expr.k === 'num') { lives = c.expr.v; return true; }
    if (c.type === 'SPAWN') { scatter.set(c.emoji, (scatter.get(c.emoji) || 0) + 1); return true; }
    if ((c.type === 'SHOW_VAR' || c.type === 'HIDE_VAR') && (c.name === '점수' || LIFE_VARS.has(c.name))) return true; // HUD는 항상 표시
    return false;
  };

  for (const c of ast) {
    if (setup(c)) continue;
    if (c.type === 'ON_START') { for (const b of c.body) if (!setup(b)) skip(b); continue; }
    if (c.type === 'ON_KEY') {
      const ok = c.body.length > 0 && c.body.every(b => (b.type === 'MOVE_X' || b.type === 'MOVE_Y') && b.value !== undefined);
      if (!ok) { skip(c); continue; }
      if (c.key === 'UP' || c.key === 'DOWN') fourWay = true;
      continue;
    }
    if (c.type === 'EVERY' && !c.forever && c.body.length && c.body.every(b => b.type === 'SPAWN_RANDOM')) {
      for (const b of c.body) falls.set(b.emoji, { intervalMs: c.ms, line: c.line });
      continue;
    }
    if (c.type === 'EVERY' && c.body.length && c.body.every(b => b.type === 'MOVE_ALL' && b.dx === 0 && b.dy > 0)) {
      for (const b of c.body) speeds.set(b.emoji, b.dy * SCALE * 1000 / c.ms);
      continue;
    }
    if (c.type === 'ON_TOUCH') {
      const effects = [];
      let ok = c.body.length > 0;
      for (const b of c.body) {
        if (b.type === 'SCORE' && b.value >= 1 && b.value <= 100) effects.push({ do: 'addScore', amount: b.value });
        else if (b.type === 'REMOVE') effects.push({ do: 'removeOther' });
        else if (b.type === 'END_WIN') effects.push({ do: 'win' });
        else if (b.type === 'END_LOSE') effects.push({ do: 'lose' });
        else if (b.type === 'CHANGE' && LIFE_VARS.has(b.name) && b.value.k === 'num' && b.value.v === -1) effects.push({ do: 'loseLife' });
        else ok = false;
      }
      if (!ok || effects.length > 4) { skip(c); continue; }
      touches.set(c.emoji, effects);
      continue;
    }
    if (c.type === 'ON_SCORE' && c.body.length === 1 && c.body[0].type === 'END_WIN') { winScore = c.value; continue; }
    if (c.type === 'ON_VAR' && LIFE_VARS.has(c.name) && c.body.length === 1 && c.body[0].type === 'END_LOSE' && c.value.k === 'num'
      && ((c.op === '<=' && c.value.v === 0) || (c.op === '=' && c.value.v === 0) || (c.op === '<' && c.value.v === 1))) { loseLives = true; continue; }
    skip(c);
  }

  // ── 노드 조립 ──
  const now = meta.now || new Date().toISOString();
  const id = meta.id || `p_legacy_${hashText(original)}`;
  const nodes = [];
  const assets = [];
  const entityOf = new Map();
  let extra = 0;
  const entity = emoji => {
    if (!entityOf.has(emoji)) {
      let name = EMOJI_ENTITY[emoji] || `item${++extra}`;
      while ([...entityOf.values()].includes(name)) name = `item${++extra}`;
      entityOf.set(emoji, name);
      assets.push({ slotId: `${name}.appearance`, assetId: null, preset: 'emoji:' + emoji });
    }
    return entityOf.get(emoji);
  };

  const legacyNode = { id: 'legacy-src', kind: 'legacySource', args: { language: 'studio-dsl-1', source: original.slice(0, 20000) }, children: [] };
  if (original.length > 20000) diagnostics.push(diag('LEGACY_SOURCE_TOO_LONG', { path: '$', message: `${original.length} chars > 20000; full text kept in result.original only`, studentHint: '예전 코드가 너무 길어서 앞부분만 작품에 보관했어요.' }));

  let converted = false;
  if (player) {
    converted = true;
    nodes.push({ id: 'world', kind: 'world', args: { background: 'bg.main', timeLimitSec: 0 }, children: [] });
    assets.push({ slotId: 'bg.main', assetId: null, preset: bg || 'color:#1a1a2e' });
    nodes.push({ id: 'player', kind: 'player', args: {
      appearance: 'player.appearance',
      x: clamp(player.x * SCALE, 0, 800), y: clamp(player.y * SCALE, 0, 600),
      speed: 320, radius: 28, movement: fourWay ? 'fourWay' : 'horizontal',
    }, children: [] });
    assets.push({ slotId: 'player.appearance', assetId: null, preset: 'emoji:' + player.emoji });
    W('LEGACY_SPEED_APPROX', player.line, 'key-repeat movement mapped to 320 px/s', '예전 게임의 움직이는 속도는 비슷하게 맞췄어요.');

    for (const [emoji, f] of falls) {
      const e = entity(emoji);
      const sp = speeds.get(emoji) ?? 0;
      if (!speeds.has(emoji)) W('LEGACY_FALL_WITHOUT_MOVE', f.line, `${emoji} spawned at top but never moved (MOVE_ALL missing)`, '하늘에서 나오지만 움직이는 규칙이 없었어요.');
      const iv = clamp(f.intervalMs, 200, 10000);
      if (iv !== f.intervalMs) W('LEGACY_VALUE_CLAMPED', f.line, `EVERY ${f.intervalMs} → intervalMs ${iv}`, '나오는 간격을 새 무대 범위에 맞췄어요.');
      nodes.push({ id: `${e}-fall`, kind: 'spawner', args: { entity: e, appearance: `${e}.appearance`, pattern: 'fallFromTop', intervalMs: iv, speed: clamp(Math.round(sp), 0, 600), maxAlive: 8, count: 0, radius: 20 }, children: [] });
    }
    for (const [emoji, n] of scatter) {
      if (falls.has(emoji)) { W('LEGACY_SPAWN_MERGED', null, `${emoji} placed and dropped; placed copies dropped from conversion`, '같은 물건을 놓기와 떨어뜨리기로 둘 다 써서 떨어뜨리기만 옮겼어요.'); continue; }
      const e = entity(emoji);
      const cnt = clamp(n, 1, 40);
      W('LEGACY_SCATTER_POSITIONS', null, `${emoji} x${n}: fixed positions become random; refilled every 10s`, '보석 자리는 무작위로 바뀌고 10초마다 다시 채워져요.');
      nodes.push({ id: `${e}-spot`, kind: 'spawner', args: { entity: e, appearance: `${e}.appearance`, pattern: 'scatter', intervalMs: 10000, speed: 0, maxAlive: cnt, count: cnt, radius: 20 }, children: [] });
    }
    for (const [emoji, effects] of touches) {
      if (!entityOf.has(emoji)) { W('LEGACY_TOUCH_WITHOUT_SPAWN', null, `ON_TOUCH ${emoji} but it is never spawned`, '닿으면 규칙이 있지만 그 물건이 나오지 않아요.'); }
      const e = entity(emoji);
      nodes.push({ id: `touch-${e}`, kind: 'onTouch', args: { entity: e, effects }, children: [] });
    }
    const livesN = clamp(lives, 0, 9);
    if (lives !== livesN) W('LEGACY_VALUE_CLAMPED', null, `lives ${lives} → ${livesN}`, '목숨 수를 새 무대 범위에 맞췄어요.');
    nodes.push({ id: 'stats', kind: 'stats', args: { lives: livesN, invincibleMs: 0 }, children: [] });
    if (winScore !== null) nodes.push({ id: 'win', kind: 'winWhen', args: { stat: 'score', value: clamp(winScore, 0, 9999) }, children: [] });
    if (loseLives) nodes.push({ id: 'lose', kind: 'loseWhen', args: { stat: 'livesZero' }, children: [] });
  } else {
    W('LEGACY_NOT_CONVERTED', null, 'no PLAYER found; kept as legacy source only', '예전 게임을 그대로 보관했어요. 옛 무대에서 실행돼요.');
  }
  nodes.push(legacyNode);
  if (converted && unconverted.length) {
    const ls = [...new Set(unconverted)].sort((a, b) => a - b);
    W('LEGACY_PARTIAL', ls[0], `not converted (kept in legacySource): lines ${ls.join(',')}`, '일부 규칙은 새 무대로 옮기지 못해서 원문으로 보관했어요.');
  }

  const project = {
    schemaVersion: 2, id, revision: 0, mode: 'studio',
    title: (meta.title || '옛 게임').slice(0, 40),
    templateId: null,
    engineVersion: converted ? ENGINE_VERSIONS.studio : 'legacy-1',
    capabilityVersion: '1',
    program: { nodes, entrypoints: nodes.map(n => n.id) },
    assets,
    learning: { missionId: null, missionVersion: null },
    createdAt: now, updatedAt: now,
  };
  diagnostics.push(...validateProject(project));
  if (converted) diagnostics.push(...checkStudioSemantics(project).filter(d => d.code !== 'LEGACY_SOURCE_KEPT'));
  return { project, ast, diagnostics, original, converted };
}
