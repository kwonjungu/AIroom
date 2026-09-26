// 게임 공방 규칙 카드 모델 (순수 함수, DOM 없음) — WP3.
// 프로젝트 노드를 학생 언어의 규칙 문장과 "바꿀 수 있는 값" 목록으로 바꾼다.
// 학년 high = 수치 그대로, mid(및 low) = "느리게/보통/빠르게" 같은 단계 표기.
// 여기서 만든 값 조작은 모두 EDITABLE_PARAMS 범위 안의 setParameter / setAppearance / add·removeBehavior 로만 적용된다.

import { EDITABLE_PARAMS, STUDIO_NODES } from '../../shared/contracts/nodes.js';
import { HEROES, CATCH_ITEMS, HAZARDS, GEMS, MAZE_MAPS } from '../../shared/templates/index.js';

// ── 이름·조사 ──
export const ENTITY_NAMES = Object.freeze({
  apple: '사과', fish: '생선', star: '별', candy: '사탕', coin: '동전', meteor: '운석', bomb: '폭탄',
  alien: '외계인', gem: '보석', flower: '꽃', bonus: '보너스 별', heart: '하트',
});

/** 받침 유무로 조사 고르기. 한글이 아니면(이모지 등) 받침 없는 쪽. */
export function josa(word, withBatchim, without) {
  const c = String(word ?? '').trim().slice(-1).charCodeAt(0);
  if (c >= 0xAC00 && c <= 0xD7A3) return (c - 0xAC00) % 28 ? withBatchim : without;
  return without;
}

export function emojiOf(project, slotId) {
  const a = (project?.assets || []).find(x => x.slotId === slotId);
  const p = a?.preset || '';
  return p.startsWith('emoji:') ? p.slice(6) : '';
}

export function entityName(entity) { return ENTITY_NAMES[entity] || entity; }

/** 모습 고르기 선택지 */
export const LOOKS = Object.freeze({
  player: Object.values(HEROES).concat(['🐶', '🐰', '🐸']),
  item: [...new Set([...Object.values(CATCH_ITEMS), ...Object.values(GEMS), ...Object.values(HAZARDS), '💖', '🍩', '🍉'])],
});

// ── 값 단계 (mid) ──
// 각 단계는 실제 저장 값이다. 표시만 바꾸고 규칙 의미(px/초, ms)는 그대로 둔다.
const STEPS = {
  'spawner.speed.fallFromTop': [{ v: 80, t: '느리게' }, { v: 140, t: '보통' }, { v: 240, t: '빠르게' }, { v: 360, t: '아주 빠르게' }],
  'spawner.speed.scatter': [{ v: 0, t: '멈춤' }, { v: 60, t: '천천히' }, { v: 120, t: '보통' }, { v: 200, t: '빠르게' }],
  'spawner.intervalMs': [{ v: 500, t: '자주' }, { v: 900, t: '보통' }, { v: 1500, t: '가끔' }, { v: 2500, t: '드물게' }],
  'spawner.count': [{ v: 3, t: '3개' }, { v: 5, t: '5개' }, { v: 8, t: '8개' }, { v: 12, t: '12개' }],
  'player.speed': [{ v: 200, t: '느리게' }, { v: 320, t: '보통' }, { v: 440, t: '빠르게' }],
  'player.movement': [{ v: 'horizontal', t: '좌우로만' }, { v: 'fourWay', t: '상하좌우' }],
  'stats.lives': [{ v: 1, t: '1개' }, { v: 2, t: '2개' }, { v: 3, t: '3개' }, { v: 5, t: '5개' }],
  'stats.invincibleMs': [{ v: 600, t: '짧게' }, { v: 1200, t: '보통' }, { v: 2000, t: '길게' }],
  'winWhen.value.score': [{ v: 5, t: '5점' }, { v: 10, t: '10점' }, { v: 15, t: '15점' }, { v: 20, t: '20점' }, { v: 30, t: '30점' }],
  'winWhen.value.survivedSec': [{ v: 15, t: '15초' }, { v: 30, t: '30초' }, { v: 45, t: '45초' }, { v: 60, t: '60초' }],
  'world.timeLimitSec': [{ v: 30, t: '30초' }, { v: 60, t: '60초' }, { v: 90, t: '90초' }, { v: 120, t: '2분' }],
};

// ── 수치 범위 (high 슬라이더). 계약 범위의 부분집합이며 학생이 무의미한 값에 빠지지 않게 좁힌다. ──
const RANGES = {
  'spawner.speed.fallFromTop': { min: 20, max: 600, step: 10, unit: 'px/초' },
  'spawner.speed.scatter': { min: 0, max: 400, step: 10, unit: 'px/초' },
  'spawner.intervalMs': { min: 200, max: 5000, step: 100, unit: 'ms' },
  'spawner.count': { min: 1, max: 20, step: 1, unit: '개' },
  'player.speed': { min: 40, max: 600, step: 10, unit: 'px/초' },
  'stats.lives': { min: 1, max: 9, step: 1, unit: '개' },
  'stats.invincibleMs': { min: 0, max: 5000, step: 100, unit: 'ms' },
  'winWhen.value.score': { min: 1, max: 200, step: 1, unit: '점' },
  'winWhen.value.survivedSec': { min: 5, max: 300, step: 5, unit: '초' },
  'world.timeLimitSec': { min: 10, max: 600, step: 10, unit: '초' },
};

const LABELS = {
  'spawner.speed.fallFromTop': '떨어지는 속도',
  'spawner.speed.scatter': '떠다니는 속도',
  'spawner.intervalMs': '나오는 간격',
  'spawner.count': '개수',
  'player.speed': '움직이는 속도',
  'player.movement': '움직이는 방향',
  'stats.lives': '목숨',
  'stats.invincibleMs': '부딪힌 뒤 무적 시간',
  'winWhen.value.score': '목표 점수',
  'winWhen.value.survivedSec': '버틸 시간',
  'world.timeLimitSec': '제한 시간',
  'mazeMap.rows': '미로 지도',
};

/** node + param → STEPS/RANGES 키 */
export function paramKey(node, param) {
  if (node.kind === 'spawner' && param === 'speed') return `spawner.speed.${node.args.pattern}`;
  if (node.kind === 'winWhen' && param === 'value') return `winWhen.value.${node.args.stat}`;
  return `${node.kind}.${param}`;
}

export function paramLabel(node, param) { return LABELS[paramKey(node, param)] || param; }

/** 숫자 표시 (단위 포함) */
export function formatNumber(key, v) {
  const r = RANGES[key];
  if (typeof v !== 'number') return String(v);
  if (r?.unit === 'ms') return `${trimNum(v / 1000)}초`;
  if (r?.unit === 'px/초') return String(v);
  return `${v}${r?.unit || ''}`;
}
function trimNum(x) { return String(Math.round(x * 10) / 10); }

/** 가장 가까운 단계 */
export function nearestStep(steps, v) {
  if (!steps?.length) return null;
  if (typeof v !== 'number') return steps.find(s => s.v === v) || null;
  let best = steps[0];
  for (const s of steps) if (Math.abs(s.v - v) < Math.abs(best.v - v)) best = s;
  return best;
}

/**
 * 값을 학년에 맞게 표시한다.
 * high: "120" / "0.9초", mid: "보통" (정확히 단계 값이 아니면 "보통쯤").
 */
export function describeValue(node, param, value, grade = 'mid') {
  const key = paramKey(node, param);
  if (param === 'rows') return mazeTitle(value);
  if (grade !== 'high' && STEPS[key]) {
    const s = nearestStep(STEPS[key], value);
    if (s) return s.v === value ? s.t : `${s.t}쯤`;
  }
  if (param === 'movement') return value === 'fourWay' ? '상하좌우' : '좌우로만';
  return formatNumber(key, value);
}

function mazeTitle(rows) {
  const hit = Object.values(MAZE_MAPS).find(m => JSON.stringify(m.rows) === JSON.stringify(rows));
  return hit ? hit.title : `${rows?.[0]?.length || 0}×${rows?.length || 0} 지도`;
}

/**
 * 학생에게 보여 줄 조작 한 개.
 * @returns {null | {param, label, kind:'steps'|'range'|'choice', value, display, options?, min?, max?, step?, unit?}}
 */
export function controlFor(node, param, grade, project) {
  if (!(EDITABLE_PARAMS[node.kind] || []).includes(param)) return null;
  const key = paramKey(node, param);
  const value = node.args[param];
  const label = paramLabel(node, param);
  const display = describeValue(node, param, value, grade);
  if (param === 'movement') {
    return { param, label, kind: 'choice', value, display, options: STEPS['player.movement'].map(s => ({ value: s.v, label: s.t })) };
  }
  if (param === 'rows') {
    return { param, label, kind: 'choice', value, display, options: Object.values(MAZE_MAPS).map(m => ({ value: m.rows, label: m.title })) };
  }
  if (grade !== 'high' && STEPS[key]) {
    let steps = STEPS[key];
    // 제한 시간은 버티기 목표보다 짧으면 성립하지 않는다
    if (key === 'world.timeLimitSec') steps = steps.filter(s => s.v > survivalGoal(project));
    return { param, label, kind: 'steps', value, display, options: steps.map(s => ({ value: s.v, label: s.t })) };
  }
  const r = RANGES[key];
  if (!r) return null;
  let min = r.min;
  if (key === 'world.timeLimitSec') min = Math.max(min, survivalGoal(project) + 5);
  return { param, label, kind: 'range', value, display, min, max: r.max, step: r.step, unit: r.unit };
}

function survivalGoal(project) {
  const w = project?.program?.nodes?.find(n => n.kind === 'winWhen' && n.args.stat === 'survivedSec');
  return w ? w.args.value : 0;
}

// 카드별로 학생에게 여는 파라미터 (좌표·반지름은 열지 않는다)
const OPEN_PARAMS = {
  world: ['timeLimitSec'],
  player: ['speed', 'movement'],
  spawner: ['speed', 'intervalMs', 'count'],
  stats: ['lives', 'invincibleMs'],
  winWhen: ['value'],
  loseWhen: [],
  mazeMap: ['rows'],
  onTouch: [],
};

function openParams(node, project) {
  const nodes = project.program.nodes;
  let list = OPEN_PARAMS[node.kind] || [];
  if (node.kind === 'spawner') {
    list = node.args.pattern === 'fallFromTop' ? ['speed', 'intervalMs'] : (node.args.refill === false ? ['count', 'speed'] : ['count', 'speed', 'intervalMs']);
  }
  if (node.kind === 'player' && nodes.some(n => n.kind === 'mazeMap')) list = ['speed'];
  if (node.kind === 'winWhen' && node.args.stat === 'reachedExit') list = [];
  if (node.kind === 'world') {
    // 제한 시간은 "시간이 끝나면 실패" 규칙이 있을 때만 의미가 있다
    if (!nodes.some(n => n.kind === 'loseWhen' && n.args.stat === 'timeUp')) list = [];
  }
  return list;
}

// ── 문장 ──
function effectText(ef, name) {
  switch (ef.do) {
    case 'addScore': return `점수 +${ef.amount}`;
    case 'loseLife': return '목숨 -1';
    case 'removeOther': return `${name}${josa(name, '은', '는')} 사라져요`;
    case 'win': return '바로 성공';
    case 'lose': return '바로 실패';
    default: return ef.do;
  }
}

/**
 * 노드 하나 → 규칙 문장 (학년별 수치 표기 포함).
 * @returns {{icon:string, text:string}|null}  null이면 카드로 보이지 않는 노드
 */
export function ruleSentence(node, project, grade = 'mid') {
  const a = node.args;
  const v = p => describeValue(node, p, a[p], grade);
  switch (node.kind) {
    case 'world':
      return a.timeLimitSec > 0 ? { icon: '⏱', text: `제한 시간 ${formatNumber('world.timeLimitSec', a.timeLimitSec)}` } : null;
    case 'player': {
      const e = emojiOf(project, a.appearance) || '🙂';
      const dir = a.movement === 'fourWay' ? '상하좌우로' : '좌우로';
      return { icon: '🕹️', text: `주인공 ${e}${josa(e, '은', '는')} ${dir} 움직여요 · 속도 ${v('speed')}` };
    }
    case 'spawner': {
      const e = emojiOf(project, a.appearance) || '❔';
      const name = entityName(a.entity);
      const subj = `${e} ${name}${josa(name, '이', '가')}`;
      if (a.pattern === 'fallFromTop') {
        if (grade === 'high') return { icon: e, text: `${subj} ${formatNumber('spawner.intervalMs', a.intervalMs)}마다 떨어져요 · 속도 ${v('speed')}` };
        return { icon: e, text: `${subj} ${v('intervalMs')} 떨어져요 · 속도 ${v('speed')}` };
      }
      const move = a.speed > 0 ? `떠다녀요 · 속도 ${v('speed')}` : '흩어져 있어요';
      const refill = a.refill === false ? '' : ' · 없어지면 다시 채워져요';
      return { icon: e, text: `${subj} ${a.count}개 ${move}${refill}` };
    }
    case 'onTouch': {
      const sp = project.program.nodes.find(n => n.kind === 'spawner' && n.args.entity === a.entity);
      const e = (sp && emojiOf(project, sp.args.appearance)) || '❔';
      const name = entityName(a.entity);
      return { icon: '🤝', text: `${e}에 닿으면 ${a.effects.map(ef => effectText(ef, name)).join(', ')}` };
    }
    case 'stats':
      if (!(a.lives > 0)) return null;
      return { icon: '❤️', text: `목숨 ${v('lives')}${a.invincibleMs > 0 ? ` · 부딪힌 뒤 ${grade === 'high' ? formatNumber('stats.invincibleMs', a.invincibleMs) : v('invincibleMs')} 무적` : ''}` };
    case 'winWhen':
      if (a.stat === 'score') return { icon: '🏁', text: `점수 ${a.value}이면 성공` };
      if (a.stat === 'survivedSec') return { icon: '🏁', text: `${a.value}초 버티면 성공` };
      return { icon: '🏁', text: '도착(G)에 닿으면 성공' };
    case 'loseWhen':
      return a.stat === 'livesZero' ? { icon: '💔', text: '목숨이 0이면 실패' } : { icon: '⌛', text: '시간이 끝나면 실패' };
    case 'mazeMap':
      return { icon: '🧭', text: `미로 지도: ${mazeTitle(a.rows)}` };
    case 'legacySource':
      return { icon: '📜', text: '예전 코드 (원문 그대로 보관만 해요)' };
    default:
      return null;
  }
}

/** 아이콘 + 문장 한 줄 (문장이 이미 아이콘으로 시작하면 한 번만) */
export function lineOf(s) {
  if (!s) return null;
  return s.text.startsWith(s.icon) ? s.text : `${s.icon} ${s.text}`;
}

const KIND_ORDER = { player: 0, spawner: 1, onTouch: 2, mazeMap: 3, stats: 4, winWhen: 5, loseWhen: 6, world: 7, legacySource: 9 };

/**
 * 프로젝트 → 규칙 카드 목록.
 * @returns {{nodeId, kind, icon, text, controls:object[], removable:boolean, look:null|{slotId, current, choices}}[]}
 */
export function summarizeRules(project, grade = 'mid') {
  const g = grade === 'high' ? 'high' : 'mid';
  const nodes = project?.program?.nodes || [];
  const cards = [];
  for (const n of nodes) {
    const s = ruleSentence(n, project, g);
    if (!s) continue;
    const controls = openParams(n, project).map(p => controlFor(n, p, g, project)).filter(Boolean);
    let look = null;
    if ((n.kind === 'player' || n.kind === 'spawner') && STUDIO_NODES[n.kind]) {
      look = { slotId: n.args.appearance, current: emojiOf(project, n.args.appearance), choices: n.kind === 'player' ? LOOKS.player : LOOKS.item };
    }
    cards.push({ nodeId: n.id, kind: n.kind, icon: s.icon, text: s.text, controls, removable: isRemovable(n, project), look });
  }
  cards.sort((x, y) => (KIND_ORDER[x.kind] ?? 8) - (KIND_ORDER[y.kind] ?? 8));
  return cards;
}

/** 규칙 빼기 버튼을 보일지 (주인공·무대·목숨 수치·주 승리 조건은 빼지 않는다) */
export function isRemovable(node, project) {
  if (['player', 'world', 'stats', 'mazeMap', 'legacySource', 'winWhen'].includes(node.kind)) return false;
  if (node.kind === 'onTouch') return false; // 물건 규칙은 spawner 카드에서 함께 뺀다
  return !!project;
}

// ── 조작 → 정형 변경 ──

/** 값 바꾸기 → operations. scatter의 개수는 최대 개수와 같이 맞춘다. */
export function setValueOps(project, nodeId, param, value) {
  const n = project.program.nodes.find(x => x.id === nodeId);
  if (!n) return [];
  const ops = [{ op: 'setParameter', nodeId, parameter: param, value }];
  if (n.kind === 'spawner' && param === 'count' && n.args.pattern === 'scatter') {
    ops.push({ op: 'setParameter', nodeId, parameter: 'maxAlive', value: Math.max(1, Math.min(40, value)) });
  }
  // 버티기 목표를 늘리면 제한 시간도 같이 늘려야 규칙이 성립한다
  if (n.kind === 'winWhen' && n.args.stat === 'survivedSec' && param === 'value') {
    const world = project.program.nodes.find(x => x.kind === 'world');
    const hasTimeUp = project.program.nodes.some(x => x.kind === 'loseWhen' && x.args.stat === 'timeUp');
    if (world && hasTimeUp && world.args.timeLimitSec > 0 && world.args.timeLimitSec < value) {
      ops.push({ op: 'setParameter', nodeId: world.id, parameter: 'timeLimitSec', value: Math.min(600, value + 10) });
    }
  }
  return ops;
}

/** 규칙 빼기 → operations. spawner를 빼면 같은 물건의 닿기 규칙도 함께 뺀다. */
export function removeRuleOps(project, nodeId) {
  const nodes = project.program.nodes;
  const n = nodes.find(x => x.id === nodeId);
  if (!n) return [];
  const ops = [{ op: 'removeBehavior', nodeId }];
  if (n.kind === 'spawner') {
    const others = nodes.filter(x => x.kind === 'spawner' && x.id !== n.id && x.args.entity === n.args.entity);
    if (!others.length) for (const t of nodes.filter(x => x.kind === 'onTouch' && x.args.entity === n.args.entity)) ops.push({ op: 'removeBehavior', nodeId: t.id });
  }
  if (n.kind === 'loseWhen' && n.args.stat === 'timeUp') {
    const world = nodes.find(x => x.kind === 'world');
    if (world && world.args.timeLimitSec > 0) ops.push({ op: 'setParameter', nodeId: world.id, parameter: 'timeLimitSec', value: 0 });
  }
  return ops;
}

export function setLookOps(project, nodeId, emoji) {
  const n = project.program.nodes.find(x => x.id === nodeId);
  if (!n || !n.args.appearance) return [];
  return [{ op: 'setAppearance', nodeId, slotId: n.args.appearance, preset: 'emoji:' + emoji }];
}

function freeId(nodes, base) {
  const ids = new Set(nodes.map(n => n.id));
  if (!ids.has(base)) return base;
  for (let i = 2; i < 99; i++) if (!ids.has(`${base}-${i}`)) return `${base}-${i}`;
  return `${base}-${Date.now() % 1000}`;
}
function freeEntity(nodes, base) {
  const used = new Set(nodes.filter(n => n.kind === 'spawner' || n.kind === 'onTouch').map(n => n.args.entity));
  if (!used.has(base)) return base;
  for (let i = 2; i < 99; i++) if (!used.has(`${base}${i}`)) return `${base}${i}`;
  return base + 'x';
}

const N = (id, kind, args) => ({ id, kind, args, children: [] });

/** 준비된 규칙 추가 선택지 */
export const RULE_PRESETS = Object.freeze([
  { id: 'bomb', icon: '💣', label: '폭탄도 나오게 (닿으면 목숨 -1)' },
  { id: 'bonus', icon: '⭐', label: '보너스 별 (닿으면 점수 +3)' },
  { id: 'timeLimit', icon: '⏱', label: '제한 시간 (끝나면 실패)' },
]);

/** 지금 작품에 더할 수 있는 선택지 */
export function availablePresets(project) {
  const nodes = project?.program?.nodes || [];
  if (!nodes.some(n => n.kind === 'player')) return [];
  const has = e => nodes.some(n => n.kind === 'spawner' && n.args.entity === e);
  const out = [];
  if (!has('bomb')) out.push(RULE_PRESETS[0]);
  if (!has('bonus')) out.push(RULE_PRESETS[1]);
  if (!nodes.some(n => n.kind === 'loseWhen' && n.args.stat === 'timeUp')) out.push(RULE_PRESETS[2]);
  return out;
}

/** 준비된 규칙 추가 → operations (필요한 목숨·실패 규칙까지 함께) */
export function addPresetOps(project, presetId) {
  const nodes = project.program.nodes;
  const player = nodes.find(n => n.kind === 'player');
  const falling = player?.args.movement === 'horizontal';
  const ops = [];
  if (presetId === 'bomb' || presetId === 'bonus') {
    const bomb = presetId === 'bomb';
    const entity = freeEntity(nodes, bomb ? 'bomb' : 'bonus');
    const spId = freeId(nodes, `${entity}-${falling ? 'fall' : 'spot'}`);
    const slot = `${entity}.appearance`;
    const spawner = falling
      ? N(spId, 'spawner', { entity, appearance: slot, pattern: 'fallFromTop', intervalMs: bomb ? 1500 : 2500, speed: bomb ? 170 : 150, maxAlive: bomb ? 4 : 2, count: 0, radius: 22 })
      : N(spId, 'spawner', { entity, appearance: slot, pattern: 'scatter', intervalMs: bomb ? 5000 : 4000, speed: bomb ? 60 : 0, maxAlive: bomb ? 2 : 1, count: bomb ? 2 : 1, radius: 22 });
    ops.push({ op: 'addBehavior', parentId: null, node: spawner });
    ops.push({ op: 'setAppearance', nodeId: spId, slotId: slot, preset: bomb ? 'emoji:💣' : 'emoji:⭐' });
    const effects = bomb ? [{ do: 'loseLife' }, { do: 'removeOther' }] : [{ do: 'addScore', amount: 3 }, { do: 'removeOther' }];
    ops.push({ op: 'addBehavior', parentId: null, node: N(freeId(nodes, `touch-${entity}`), 'onTouch', { entity, effects }) });
    if (bomb) {
      const stats = nodes.find(n => n.kind === 'stats');
      if (!stats) ops.push({ op: 'addBehavior', parentId: null, node: N(freeId(nodes, 'stats'), 'stats', { lives: 3, invincibleMs: 1000 }) });
      else if (!(stats.args.lives > 0)) {
        ops.push({ op: 'setParameter', nodeId: stats.id, parameter: 'lives', value: 3 });
        if (!(stats.args.invincibleMs > 0)) ops.push({ op: 'setParameter', nodeId: stats.id, parameter: 'invincibleMs', value: 1000 });
      }
      if (!nodes.some(n => n.kind === 'loseWhen' && n.args.stat === 'livesZero')) {
        ops.push({ op: 'addBehavior', parentId: null, node: N(freeId(nodes, 'lose-lives'), 'loseWhen', { stat: 'livesZero' }) });
      }
    }
    return ops;
  }
  if (presetId === 'timeLimit') {
    const world = nodes.find(n => n.kind === 'world');
    const need = Math.max(60, survivalGoal(project) + 10);
    if (!world) ops.push({ op: 'addBehavior', parentId: null, node: N(freeId(nodes, 'world'), 'world', { background: 'bg.main', timeLimitSec: need }) });
    else if (!(world.args.timeLimitSec > survivalGoal(project))) ops.push({ op: 'setParameter', nodeId: world.id, parameter: 'timeLimitSec', value: need });
    ops.push({ op: 'addBehavior', parentId: null, node: N(freeId(nodes, 'lose-time'), 'loseWhen', { stat: 'timeUp' }) });
    return ops;
  }
  return [];
}

/** 작품에 연결된 AI 예시 문장 (현재 물건 이름을 넣는다) */
export function exampleChips(project) {
  const nodes = project?.program?.nodes || [];
  const sp = nodes.find(n => n.kind === 'spawner' && n.args.pattern === 'fallFromTop')
    || nodes.find(n => n.kind === 'spawner');
  const out = [];
  if (sp) {
    const name = entityName(sp.args.entity);
    const i = josa(name, '이', '가');
    if (sp.args.pattern === 'fallFromTop') {
      out.push(`${name}${i} 조금 더 천천히 떨어지게`);
      out.push(`${name}${i} 조금 더 빨리 떨어지게`);
    } else {
      out.push(`${name}${i} 조금 더 천천히 움직이게`);
      out.push(`${name}${i} 조금 더 빨리 움직이게`);
    }
  }
  const win = nodes.find(n => n.kind === 'winWhen');
  if (win?.args.stat === 'score') out.push(`목표 점수를 ${win.args.value + 5}점으로`);
  return out.slice(0, 3);
}

/** 템플릿 조작 설명 한 줄 (첫 조작 전) */
export function controlsLine(project) {
  const nodes = project?.program?.nodes || [];
  const player = nodes.find(n => n.kind === 'player');
  if (!player) return '';
  const e = emojiOf(project, player.args.appearance) || '주인공';
  const keys = player.args.movement === 'fourWay' ? '방향키(WASD)나 방향 버튼' : '← → 방향키(A D)나 좌우 버튼';
  const win = nodes.find(n => n.kind === 'winWhen');
  let goal = '';
  if (win?.args.stat === 'score') goal = ` 점수 ${win.args.value}이면 성공!`;
  else if (win?.args.stat === 'survivedSec') goal = ` ${win.args.value}초 버티면 성공!`;
  else if (win?.args.stat === 'reachedExit') goal = ' 도착(G)에 닿으면 성공!';
  return `${keys}${josa(keys, '으로', '로')} ${e}${josa(e, '을', '를')} 움직여요.${goal}`;
}
