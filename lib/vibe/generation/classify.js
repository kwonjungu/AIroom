// 요청 분류 — 모델 호출 전에 서버 규칙으로 판단한다(§4.1 표).
//   direct      : 명확한 수치·모습 변경 → 규칙 기반 패치, 모델 호출 없음
//   template    : 새 게임 + 장르가 분명 → 템플릿 선택 + params, 모델 호출 없음
//   llm_plan    : 새 게임인데 장르가 모호 → 주 모델이 instantiateTemplate만 출력
//   llm_rule    : 규칙 추가·복합 수정·모호한 말 → 주 모델
//   unsupported : 지원하지 않는 장르·기능 → 가까운 대안 2개 안내(구현됐다고 꾸미지 않음)
//   at_limit    : 이미 가장 크거나 작은 값 → 모델 호출 없이 안내
//   invalid     : 빈 요청 등
// 불확실하면 direct로 억지 해석하지 않고 llm_rule로 넘긴다(검증기가 최종 관문).

import { STUDIO_NODES } from '../../../public/vibe-v2/shared/contracts/nodes.js';
import { TEMPLATES, MAZE_MAPS, checkTemplateParams } from '../../../public/vibe-v2/shared/templates/index.js';
import {
  ENTITY_WORDS, HERO_WORDS, BACKGROUND_WORDS, GENRE_PATTERNS, UNSUPPORTED, presetForEntity, entityName,
} from './vocab.js';
import { HEROES } from '../../../public/vibe-v2/shared/templates/index.js';

const STUDIO_KINDS = new Set(Object.keys(STUDIO_NODES));

const NEW_GAME_RE = /((새|새로운|다른|처음부터)\s*게임|게임을?\s*(새로|처음부터|다시)\s*만들|게임\s*(만들어|만들래|만들고|하나\s*만들|만들자))/;
const RULE_RE = /(닿으면|닿을\s*때|닿았을|닿아도|부딪히면|부딪치면|부딪혔|먹으면|먹을\s*때|잡으면|추가|넣어|넣고|넣기|넣자|놓고|더해|새로운?\s*규칙|규칙을|도\s*나오게|도\s*떨어지게|도\s*있게|도\s*나와|도\s*놓|넣(?:\s|$)|놓(?:\s|$)|생기게|나타나게|\S(?:으면|나면|되면)\s(?!좋))/;
const KEEP_RE = /(그대로|유지|안\s*바꾸|바꾸지\s*말|건드리지)/;
const COMPLAINT_RE = /(?:너무|넘|넘나|엄청)\s*(\S+)/;
const REMOVE_RE = /(없애|지워|빼\s*줘|빼줘|빼고|빼\s*주|삭제|제거|안\s*나오게|안\s*떨어지게|없게|없이)/;
const GOAL_RE = /(목표|점수|이기|이겨|이길|지는|지게|질\s*때|성공|실패|목숨|생명|하트|시간|초\b|\d+\s*초|끝나|끝내|버티|버틸|어렵|쉽)/;
const APPEAR_RE = /(모습|모양|그림|배경|대신|(으로|로)\s*(바꿔|바꾸|변신|해\s*줘))/;
const DESCRIPTIVE_RE = /(느림|느려요?(?!\s*(지게|져))|빨라요?(?!\s*(지게|져))|빠름|많아|적어)/;
const REQUEST_RE = /(빨리|천천히|천천이|느리게|빠르게|크게|작게|자주|가끔|게\s*해|해\s*줘|해줘|주세|늘려|줄여|낮춰|높여|올려|\d)/;
const PLAYER_RE = /(주인공|캐릭터|플레이어|내\s*캐릭|나를|내가|내\s*움직)/;

const SLIGHT = /(조금|약간|살짝|좀|쪼금|조끔|쬐끔)/;
const STRONG = /(훨씬|엄청|아주|매우|많이(?!\s*나)|완전|진짜)/;
const DOUBLE = /(두\s*배|2\s*배)/;
const HALF = /(절반|반으로|반만|반\s*정도)/;

/** 파라미터별 감지 규칙: re로 언급을 찾고 inc/dec로 방향을 정한다 */
const PARAMS = [
  { key: 'interval', re: /(자주|간격|드물|가끔|많이\s*나|적게\s*나|덜\s*나|빨리\s*나|더\s*많이\s*(떨어|나))/, inc: /(드물|가끔|적게|덜|천천히\s*나)/, dec: /(자주|많이|빨리\s*나)/ },
  { key: 'speed', re: /(빠르|빨리|빠른|빨라|빠름|느리|느린|느려|느림|천천히|천천이|느릿|속도|느리개|빠르개)(?!\S*\s*(나오|생기|나타))/, inc: /(빠르|빨리|빠른|빨라|빠름|올려|높여|늘려)/, dec: /(느리|느린|느려|느림|천천히|천천이|느릿|줄여|낮춰|덜)/ },
  { key: 'goal', re: /(목표|몇\s*점|\d+\s*점\s*(되면|이면|모으면|넘으면|까지|으로|을|를)|점수를?\s*(\d|높|낮|올|내|줄|늘))/, inc: /(높|늘|올|많이|어렵)/, dec: /(낮|줄|내려|적게|쉽)/ },
  { key: 'lives', re: /(목숨|생명|하트|라이프)/, inc: /(늘|많|더|올|추가)/, dec: /(줄|적|낮|빼)/ },
  { key: 'time', re: /(제한\s*시간|시간\s*제한|시간을|시간이|시간\s*(늘|줄)|\d+\s*초|버틸|버티는)/, inc: /(늘|길|더|많)/, dec: /(줄|짧|적)/ },
  { key: 'size', re: /(크기|크게|커지|커져|키워|작게|작아|작은|큰\s)/, inc: /(크게|커|키워|큰)/, dec: /(작게|작아|작은)/ },
  { key: 'invincible', re: /(무적)/, inc: /(늘|길|더)/, dec: /(줄|짧|없)/ },
];

export function normalizeIntent(text) {
  return String(text ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
}

function findWord(t, table) {
  // 가장 먼저 등장하는 단어의 키
  let best = null, at = Infinity;
  for (const [key, v] of Object.entries(table)) {
    for (const w of (Array.isArray(v) ? v : v.words)) {
      const i = t.indexOf(w);
      if (i >= 0 && i < at) { at = i; best = key; }
    }
  }
  return best;
}

function entitiesMentioned(t) {
  const out = [];
  for (const [key, v] of Object.entries(ENTITY_WORDS)) {
    let i = Infinity;
    for (const w of v.words) { const j = t.indexOf(w); if (j >= 0 && j < i) i = j; }
    if (i < Infinity) out.push({ key, at: i });
  }
  return out.sort((a, b) => a.at - b.at).map(x => x.key);
}

function nodesOf(project, kind) { return project.program.nodes.filter(n => n.kind === kind); }

function detectGenres(t) {
  return Object.entries(GENRE_PATTERNS).filter(([, re]) => re.test(t)).map(([g]) => g);
}

function firstInt(t, re) {
  const m = re.exec(t);
  if (!m) return null;
  const s = m.slice(1).find(x => x !== undefined && /^\d+$/.test(x));
  return s === undefined ? null : Number(s);
}

/** 새 게임 params를 문장에서 뽑는다. 범위 밖 값은 버리고 adjusted에 기록(정직하게 안내). */
export function extractTemplateParams(templateId, t) {
  const spec = TEMPLATES[templateId].params;
  const p = {};
  const heroKey = (() => {
    for (const [k, words] of Object.entries(HERO_WORDS)) {
      for (const w of words) {
        if (new RegExp(`${w}(가|이|는|은|로|으로|를|을)?\\s*(주인공|가\\s|이\\s|는\\s|은\\s|로\\s|으로\\s|되)`).test(t + ' ') || new RegExp(`주인공(은|는|이|을|를)?\\s*${w}`).test(t)) return k;
      }
    }
    return null;
  })();
  if (heroKey && spec.hero.values.includes(heroKey)) p.hero = heroKey;
  const itemParam = { catch: 'item', avoid: 'hazard', collect: 'gem' }[templateId];
  if (itemParam) {
    const ents = entitiesMentioned(t).filter(k => spec[itemParam].values.includes(k) && !(k === 'fish' && heroKey === 'fish'));
    if (ents.length) p[itemParam] = ents[0];
  }
  const nums = {
    catch: { goal: /(\d+)\s*(점|개)/, timeLimitSec: /(\d+)\s*초/ },
    avoid: { surviveSec: /(\d+)\s*초/, lives: /(?:목숨|생명|하트)\D{0,4}(\d+)|(\d+)\s*개?\s*의?\s*(?:목숨|생명|하트)/ },
    collect: { gemCount: /(\d+)\s*개/, timeLimitSec: /(\d+)\s*초/ },
    maze: { timeLimitSec: /(\d+)\s*초/ },
  }[templateId];
  for (const [k, re] of Object.entries(nums)) { const v = firstInt(t, re); if (v !== null) p[k] = v; }
  if (templateId === 'collect' && /폭탄/.test(t)) p.hazard = 'bomb';
  if (templateId === 'maze') {
    if (/(쉬운|쉽게|짧은|처음|간단)/.test(t)) p.map = 'first';
    else if (/(어려운|어렵게|긴|복잡)/.test(t)) p.map = 'whirl';
  }
  const adjusted = [];
  for (const d of checkTemplateParams(templateId, p)) {
    const k = d.path.replace('$.params.', '');
    if (k in p) { adjusted.push({ param: k, value: p[k], code: d.code, studentHint: d.studentHint }); delete p[k]; }
  }
  // goal 같은 조합 검사로 여전히 실패하면 해당 값을 버린다
  for (const d of checkTemplateParams(templateId, p)) {
    const k = d.path.replace('$.params.', '');
    if (k in p) { adjusted.push({ param: k, value: p[k], code: d.code, studentHint: d.studentHint }); delete p[k]; }
  }
  return { params: p, adjusted };
}

function magnitude(t) {
  if (DOUBLE.test(t)) return { factor: 2 };
  if (HALF.test(t)) return { factor: 0.5 };
  if (SLIGHT.test(t)) return { m: 0.2 };
  if (STRONG.test(t)) return { m: 0.5 };
  return { m: 0.3 };
}

function rangeOf(kind, param) {
  const s = STUDIO_NODES[kind].properties.args.properties[param];
  return { min: s.minimum, max: s.maximum, integer: s.type === 'integer' };
}

/** 한 파라미터 언급 → {nodeId, kind, param, direction, value?} (대상을 못 정하면 nodeId null) */
function resolveMention(pdef, t, project, full = t) {
  const spawners = nodesOf(project, 'spawner');
  const ents = entitiesMentioned(t);
  const byEntity = ents.map(e => spawners.find(s => s.args.entity === e)).filter(Boolean);
  const player = nodesOf(project, 'player')[0];
  const heroWord = (() => {
    const pre = player && project.assets.find(a => a.slotId === player.args.appearance)?.preset;
    return Object.entries(HERO_WORDS).some(([k, ws]) => pre === 'emoji:' + HEROES[k] && ws.some(w => t.includes(w)));
  })();
  // 게임에 없는 것을 말했다면(예: 생선 게임에서 '사과') 추측해서 고치지 않는다
  if (ents.length && !byEntity.length && !heroWord && !PLAYER_RE.test(t)) return { nodeId: null, param: pdef.key, direction: null, value: null, unknownEntity: ents[0] };
  const world = nodesOf(project, 'world')[0];
  const stats = nodesOf(project, 'stats')[0];
  const wins = nodesOf(project, 'winWhen');
  const aboutPlayer = PLAYER_RE.test(t) || (heroWord && !byEntity.length);
  let node = null, param = null;
  switch (pdef.key) {
    case 'speed':
      if (aboutPlayer && !byEntity.length) { node = player; param = 'speed'; break; }
      if (byEntity.length === 1) { node = byEntity[0]; param = 'speed'; break; }
      if (!byEntity.length && /떨어지/.test(t)) { const falls = spawners.filter(s => s.args.pattern === 'fallFromTop'); if (falls.length === 1) { node = falls[0]; param = 'speed'; } break; }
      if (!byEntity.length && !aboutPlayer && spawners.length === 1 && spawners[0].args.speed > 0) { node = spawners[0]; param = 'speed'; }
      if (!byEntity.length && !aboutPlayer && spawners.length === 0 && player) { node = player; param = 'speed'; }
      break;
    case 'interval':
      if (byEntity.length === 1) { node = byEntity[0]; param = 'intervalMs'; } else if (!byEntity.length && spawners.length === 1) { node = spawners[0]; param = 'intervalMs'; }
      break;
    case 'goal': {
      const w = wins.filter(x => x.args.stat === 'score');
      if (w.length === 1) { node = w[0]; param = 'value'; }
      break;
    }
    case 'lives': if (stats && stats.args.lives > 0) { node = stats; param = 'lives'; } break;
    case 'time': {
      const surv = wins.filter(x => x.args.stat === 'survivedSec');
      if (/버티|버틸/.test(t) && surv.length === 1) { node = surv[0]; param = 'value'; } else if (world && (world.args.timeLimitSec > 0 || /(제한\s*시간|시간\s*제한)/.test(t)) && !/버티|버틸/.test(t)) { node = world; param = 'timeLimitSec'; } else if (surv.length === 1 && !(world && world.args.timeLimitSec > 0)) { node = surv[0]; param = 'value'; }
      break;
    }
    case 'size':
      if (aboutPlayer && !byEntity.length) { node = player; param = 'radius'; } else if (byEntity.length === 1) { node = byEntity[0]; param = 'radius'; }
      break;
    case 'invincible': if (stats) { node = stats; param = 'invincibleMs'; } break;
    default: break;
  }
  // "너무 빨라" 같은 불평은 반대 방향을 원한다는 뜻이다
  let tDir = t, complaint = null;
  const cm = COMPLAINT_RE.exec(t);
  if (cm) {
    if (pdef.inc.test(cm[1])) complaint = 'decrease';
    else if (pdef.dec.test(cm[1])) complaint = 'increase';
    if (complaint) tDir = t.replace(cm[0], ' ');
  }
  const inc = pdef.inc.test(tDir), dec = pdef.dec.test(tDir);
  let direction = inc && !dec ? 'increase' : dec && !inc ? 'decrease' : null;
  if (complaint) direction = !direction || direction === complaint ? complaint : null;
  // "거북이 느림 ㅠ"처럼 부탁 없이 상태만 말하면 불평으로 보고 반대 방향
  else if (direction && direction !== 'set' && DESCRIPTIVE_RE.test(full) && !REQUEST_RE.test(full)) direction = direction === 'increase' ? 'decrease' : 'increase';
  let value = null;
  const unit = { goal: /(\d+)\s*(점|개)/, time: /(\d+)\s*초/, lives: /(?:목숨|생명|하트)\D{0,4}(\d+)|(\d+)\s*개?\s*(?:의\s*)?(?:목숨|생명|하트)/, speed: /(?:속도)\D{0,4}(\d+)|(\d+)\s*(?:으로|로)\s*(?:빠르|느리|속도)/, interval: /(\d+)\s*ms/, size: /크기\D{0,4}(\d+)/, invincible: /(\d+)\s*ms/ }[pdef.key];
  const n = unit ? firstInt(t, unit) : null;
  if (n !== null) { value = n; direction = 'set'; }
  return node && param ? { nodeId: node.id, kind: node.kind, param, direction, value, before: node.args[param] } : { nodeId: null, param: pdef.key, direction, value };
}

/** 방향·크기 → 새 값 (범위 안으로) */
export function computeValue(m, t) {
  const r = rangeOf(m.kind, m.param);
  const before = Number(m.before);
  let v;
  if (m.direction === 'set') v = m.value;
  else {
    const g = magnitude(t);
    const sign = m.direction === 'increase' ? 1 : -1;
    if (g.factor) {
      let f = g.factor;
      if (sign < 0 && f > 1) f = 1 / f;
      if (sign > 0 && f < 1) f = 1 / f;
      v = before * f;
    } else if (m.param === 'lives') v = before + sign * (g.m >= 0.5 ? 2 : 1);
    else if (r.integer && before < 100) v = before + sign * Math.max(1, Math.round(before * g.m));
    else v = before * (1 + sign * g.m);
  }
  if (m.param === 'intervalMs' && m.direction !== 'set') v = Math.round(v / 50) * 50;
  v = Math.round(v);
  const clamped = Math.min(r.max, Math.max(r.min, v));
  return { value: clamped, clamped: clamped !== v, range: r };
}

function appearanceIntent(t, project) {
  const player = nodesOf(project, 'player')[0];
  const world = nodesOf(project, 'world')[0];
  if (/배경/.test(t) && world) {
    const bg = findWord(t, BACKGROUND_WORDS);
    if (bg) return { nodeId: world.id, slotId: world.args.background, preset: bg };
  }
  const spawners = nodesOf(project, 'spawner');
  const ents = entitiesMentioned(t);
  // "사과 대신 별" / "사과를 별로 바꿔"
  if (ents.length === 2 && /(대신|로\s*바꿔|으로\s*바꿔|로\s*바꾸|로\s*변신)/.test(t)) {
    const from = spawners.find(s => s.args.entity === ents[0]);
    const toPreset = presetForEntity(ents[1]);
    if (from && toPreset && !spawners.some(s => s.args.entity === ents[1])) return { nodeId: from.id, slotId: from.args.appearance, preset: toPreset, entitySwap: [ents[0], ents[1]] };
  }
  if (player && /(으로|로)\s*(바꿔|바꾸|해|변신|바뀌)/.test(t) && (PLAYER_RE.test(t) || /주인공/.test(t))) {
    const hero = findWord(t, HERO_WORDS);
    if (hero) return { nodeId: player.id, slotId: player.args.appearance, preset: 'emoji:' + HEROES[hero] };
  }
  return null;
}

/**
 * @param {{ text:string, project:object }} p
 */
export function classifyIntent({ text, project }) {
  const t = normalizeIntent(text).toLowerCase();
  const base = { expect: { allowRemove: false, allowAssets: false, allowGoal: false, allowTemplate: false, targets: [] } };
  if (!t) return { ...base, kind: 'invalid', code: 'EMPTY_INTENT', studentMessage: '어떻게 바꾸고 싶은지 한 문장으로 적어 줘.' };
  if (!project || project.mode !== 'studio') return { ...base, kind: 'unsupported', code: 'UNSUPPORTED_MODE', alternatives: [], studentMessage: '말로 바꾸기는 지금은 게임 공방에서만 할 수 있어요.' };

  for (const u of UNSUPPORTED) {
    if (u.re.test(t)) {
      const alts = u.alternatives.map(id => TEMPLATES[id].title);
      return { ...base, kind: 'unsupported', code: 'UNSUPPORTED_GENRE', alternatives: u.alternatives,
        studentMessage: `${u.what}은(는) 아직 만들 수 없어요. 대신 '${alts[0]}'이나 '${alts[1]}'로 해 볼까?` };
    }
  }

  const studio = project.program.nodes.filter(n => STUDIO_KINDS.has(n.kind));
  const empty = studio.length === 0;
  if (empty || NEW_GAME_RE.test(t)) {
    const genres = detectGenres(t);
    const expect = { ...base.expect, allowTemplate: true, allowAssets: true, allowGoal: true, allowRemove: true };
    if (genres.length === 1) {
      const templateId = genres[0];
      const { params, adjusted } = extractTemplateParams(templateId, t);
      return { kind: 'template', code: 'TEMPLATE_DIRECT', templateId, params, adjusted, expect: { ...expect, genre: templateId }, budget: 'generate' };
    }
    return { kind: 'llm_plan', code: 'TEMPLATE_PLAN', model: 'primary', budget: 'generate', candidates: genres, expect };
  }

  const expect = {
    allowRemove: REMOVE_RE.test(t),
    allowAssets: APPEAR_RE.test(t),
    allowGoal: GOAL_RE.test(t),
    allowTemplate: false,
    targets: [],
    keepParams: [],
  };
  // 절 단위로 읽는다: "…는 그대로"는 유지 조건, "…에 닿으면 목숨이 줄게"는 규칙 설명(수치 변경 아님)
  const clauses = t.split(/,|\.|!|\?|그리고|고\s/).map(c => c.trim()).filter(Boolean);
  const mentions = [], keepMentions = [];
  let ruleClauses = 0;
  for (const c of clauses.length ? clauses : [t]) {
    const keep = KEEP_RE.test(c);
    const rule = RULE_RE.test(c);
    if (rule) ruleClauses++;
    for (const p of PARAMS) {
      if (!p.re.test(c)) continue;
      const m = resolveMention(p, c, project, t);
      if (keep) keepMentions.push(m);
      else if (!rule) mentions.push(m);
    }
  }
  for (const m of keepMentions) if (m.nodeId) expect.keepParams.push({ nodeId: m.nodeId, param: m.param });
  const appearance = appearanceIntent(t, project);
  const isRule = ruleClauses > 0 || expect.allowRemove;
  const confident = mentions.filter(m => m.nodeId && m.direction);
  for (const m of confident) expect.targets.push({ nodeId: m.nodeId, param: m.param, direction: m.direction, value: m.direction === 'set' ? m.value : undefined });

  const single = !isRule && ((mentions.length === 1 && !appearance) || (mentions.length === 0 && appearance));
  if (single && appearance) {
    return { kind: 'direct', code: 'DIRECT_APPEARANCE', expect: { ...expect, allowAssets: true },
      operations: [{ op: 'setAppearance', nodeId: appearance.nodeId, slotId: appearance.slotId, preset: appearance.preset }] };
  }
  if (single && confident.length === 1) {
    const m = { ...confident[0] };
    // 멈춰 있는 것(속도 0)을 "천천히 움직이게" → 느린 속도로 움직이기 시작
    if (m.param === 'speed' && m.before === 0 && /(움직|돌아다니|다니게)/.test(t) && m.direction !== 'set') { m.direction = 'set'; m.value = 60; }
    const { value, range } = computeValue(m, t);
    if (value === m.before) {
      const edge = value >= range.max ? '가장 큰' : value <= range.min ? '가장 작은' : '같은';
      return { kind: 'at_limit', code: 'PARAM_AT_LIMIT', expect, studentMessage: `이미 ${edge} 값이라 더 바꿀 수 없어요. 다른 걸 바꿔 볼까?` };
    }
    const direction = m.direction === 'set' ? 'set' : m.direction;
    return { kind: 'direct', code: 'DIRECT_PARAM', expect: { ...expect, targets: [{ nodeId: m.nodeId, param: m.param, direction, value: direction === 'set' ? value : undefined }] },
      operations: [{ op: 'setParameter', nodeId: m.nodeId, parameter: m.param, value }] };
  }
  const budget = isRule || mentions.length > 1 || appearance ? 'generate' : 'simple';
  return { kind: 'llm_rule', code: isRule ? 'RULE_CHANGE' : 'AMBIGUOUS_CHANGE', model: 'primary', budget, expect, mentions: mentions.concat(keepMentions).map(m => ({ nodeId: m.nodeId, param: m.param })) };
}

export const _test = { PARAMS, entitiesMentioned, detectGenres, magnitude, entityName, MAZE_MAPS };
