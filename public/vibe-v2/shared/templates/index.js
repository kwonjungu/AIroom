// 게임 공방 장르 템플릿 (WP4) — 받기·피하기·모으기·미로 탈출.
// 게임은 LLM이 코드를 쓰는 대신 이 검증된 템플릿 + 정형 노드(studio-2)로 만든다.
// instantiate(templateId, params, project)는 contracts/patch-apply.js 의 opts.instantiate 시그니처를 따른다.
// 모든 결과는 validateProject + checkStudioSemantics를 통과하고, runSmoke로 장르별 자동 플레이 검증을 한다.

import { diag, validateProject, ENGINE_VERSIONS } from '../contracts/schemas.js';
import { checkStudioSemantics } from '../compiler/semantic.js';
import { mazeLayout, mazePath, cellCenter } from '../compiler/maze.js';
import { simulate, recordInputs } from '../runtime/simulate.js';
import { TICK_HZ, msToTicks } from '../runtime/game-runtime.js';

// ── 고를 수 있는 모습 (preset 키 → emoji preset) ──
export const HEROES = Object.freeze({ cat: '🐱', turtle: '🐢', robot: '🤖', fish: '🐟', rocket: '🚀', unicorn: '🦄' });
export const CATCH_ITEMS = Object.freeze({ apple: '🍎', fish: '🐟', star: '⭐', candy: '🍬', coin: '🪙' });
export const HAZARDS = Object.freeze({ meteor: '☄️', bomb: '💣', alien: '👾' });
export const GEMS = Object.freeze({ gem: '💎', coin: '🪙', star: '⭐', flower: '🌸' });

// v1 MAZE_MISSIONS 맵 재사용 (보석 D 칸이 없는 맵만 — mazeMap 계약은 #.SG만 허용)
export const MAZE_MAPS = Object.freeze({
  first: { title: '첫걸음', v1MissionId: 1, rows: ['######', '#S..G#', '######'] },
  corner: { title: '모퉁이', v1MissionId: 2, rows: ['######', '#..G##', '#.####', '#S####', '######'] },
  hall: { title: '긴복도', v1MissionId: 4, rows: ['########', '#S....G#', '########'] },
  stairs: { title: '지그재그', v1MissionId: 5, rows: ['######', '####G#', '###..#', '##..##', '#S.###', '######'] },
  spiral: { title: '빙글길', v1MissionId: 6, rows: ['#####', '#####', '#G..#', '###.#', '#S..#', '#####'] },
  wall: { title: '벽탐지', v1MissionId: 8, rows: ['######', '#S...#', '####.#', '####.#', '####G#', '######'] },
  twoCorners: { title: '두모퉁이', v1MissionId: 9, rows: ['######', '#S...#', '####.#', '#G...#', '######'] },
  whirl: { title: '소용돌이', v1MissionId: 10, rows: ['########', '#S.....#', '######.#', '###G##.#', '###....#', '########'] },
});

const enumP = (values, def, label) => ({ type: 'enum', values: Object.keys(values), default: def, label });
const intP = (min, max, def, label) => ({ type: 'int', min, max, default: def, label });

/** 템플릿 메타 — 제목·아이콘·조작법·학생이 바꾸는 것·params 범위 */
export const TEMPLATES = Object.freeze({
  catch: {
    id: 'catch', title: '받기 게임', icon: '🧺', genre: '받기',
    description: '하늘에서 떨어지는 것을 받아 점수를 모아요. 시간 안에 목표 점수를 넘기면 성공!',
    controls: { keyboard: '← → 방향키 (또는 A D)', touch: '화면 아래 왼쪽·오른쪽 버튼' },
    studentChanges: ['주인공', '떨어지는 것', '떨어지는 속도', '나오는 간격', '목표 점수', '제한 시간'],
    params: {
      hero: enumP(HEROES, 'cat', '주인공'),
      item: enumP(CATCH_ITEMS, 'apple', '떨어지는 것'),
      goal: intP(1, 50, 10, '목표 점수'),
      fallSpeed: intP(60, 400, 140, '떨어지는 속도(px/초)'),
      spawnEveryMs: intP(400, 3000, 900, '나오는 간격(ms)'),
      timeLimitSec: intP(10, 300, 60, '제한 시간(초)'),
    },
  },
  avoid: {
    id: 'avoid', title: '피하기 게임', icon: '☄️', genre: '피하기',
    description: '떨어지는 장애물을 피해 정해진 시간 동안 살아남아요. 부딪히면 잠깐 무적이 돼요.',
    controls: { keyboard: '← → 방향키 (또는 A D)', touch: '화면 아래 왼쪽·오른쪽 버튼' },
    studentChanges: ['주인공', '장애물', '장애물 간격', '떨어지는 속도', '목숨 수', '버틸 시간'],
    params: {
      hero: enumP(HEROES, 'rocket', '주인공'),
      hazard: enumP(HAZARDS, 'meteor', '장애물'),
      lives: intP(1, 9, 3, '목숨'),
      surviveSec: intP(5, 300, 30, '버틸 시간(초)'),
      fallSpeed: intP(80, 500, 240, '떨어지는 속도(px/초)'),
      spawnEveryMs: intP(200, 3000, 500, '장애물 간격(ms)'),
      invincibleMs: intP(300, 3000, 1200, '무적 시간(ms)'),
    },
  },
  collect: {
    id: 'collect', title: '모으기 게임', icon: '💎', genre: '모으기',
    description: '무대 곳곳의 보석을 찾아 모아요. 목표 개수를 모으면 성공!',
    controls: { keyboard: '↑ ↓ ← → 방향키 (또는 WASD)', touch: '화면의 큰 방향판' },
    studentChanges: ['주인공', '보석 종류', '보석 수', '목표 개수', '방해 폭탄', '제한 시간'],
    params: {
      hero: enumP(HEROES, 'turtle', '주인공'),
      gem: enumP(GEMS, 'gem', '보석'),
      gemCount: intP(1, 20, 5, '보석 수'),
      goal: intP(1, 99, 5, '목표 개수'),
      hazard: { type: 'enum', values: ['none', 'bomb'], default: 'none', label: '방해 폭탄' },
      timeLimitSec: intP(0, 300, 0, '제한 시간(초, 0=없음)'),
    },
  },
  maze: {
    id: 'maze', title: '미로 탈출', icon: '🧭', genre: '미로 탈출',
    description: '벽을 피해 출발(S)에서 도착(G)까지 가요. 도착하면 성공!',
    controls: { keyboard: '↑ ↓ ← → 방향키 (또는 WASD)', touch: '화면의 큰 방향판' },
    studentChanges: ['주인공', '미로 지도', '움직이는 속도', '제한 시간'],
    params: {
      hero: enumP(HEROES, 'turtle', '주인공'),
      map: enumP(MAZE_MAPS, 'whirl', '미로 지도'),
      speed: intP(80, 400, 200, '움직이는 속도(px/초)'),
      timeLimitSec: intP(0, 300, 0, '제한 시간(초, 0=없음)'),
    },
  },
});

/**
 * params 검사 (모르는 키·타입·범위·장르별 성립 조건).
 * @returns {object[]} Diagnostic[]
 */
export function checkTemplateParams(templateId, params = {}) {
  const t = TEMPLATES[templateId];
  if (!t) return [diag('UNKNOWN_TEMPLATE', { message: String(templateId), studentHint: '아직 준비되지 않은 게임 종류예요.' })];
  const out = [];
  if (!params || typeof params !== 'object' || Array.isArray(params)) {
    return [diag('TEMPLATE_PARAMS_INVALID', { path: '$.params', message: 'params must be object', studentHint: '게임 설정이 올바르지 않아요.' })];
  }
  for (const [k, v] of Object.entries(params)) {
    const spec = t.params[k];
    const path = `$.params.${k}`;
    if (!spec) { out.push(diag('TEMPLATE_PARAM_UNKNOWN', { path, message: `${templateId} has no param ${k}`, studentHint: '이 게임에서 바꿀 수 없는 설정이에요.' })); continue; }
    if (spec.type === 'enum' && !spec.values.includes(v)) out.push(diag('TEMPLATE_PARAM_INVALID', { path, message: `${k} not one of ${spec.values.join(',')}`, studentHint: `${spec.label}은(는) 준비된 것 중에서 골라 줘.` }));
    if (spec.type === 'int' && (!Number.isInteger(v) || v < spec.min || v > spec.max)) out.push(diag('TEMPLATE_PARAM_OUT_OF_RANGE', { path, message: `${k}=${v} not in ${spec.min}..${spec.max}`, studentHint: `${spec.label}은(는) ${spec.min}부터 ${spec.max}까지 정할 수 있어요.` }));
  }
  if (out.length) return out;
  const p = resolveParams(templateId, params);
  if (templateId === 'catch') {
    const maxItems = Math.floor(p.timeLimitSec * 1000 / p.spawnEveryMs);
    if (p.goal > Math.floor(maxItems * 0.8)) out.push(diag('TEMPLATE_GOAL_TOO_HIGH', { path: '$.params.goal', message: `goal ${p.goal} vs about ${maxItems} items in ${p.timeLimitSec}s`, studentHint: '시간 안에 모으기 어려운 점수예요. 시간을 늘리거나 점수를 낮춰 볼까?' }));
  }
  if (templateId === 'collect' && p.timeLimitSec > 0 && p.timeLimitSec < 10) {
    out.push(diag('TEMPLATE_TIME_TOO_SHORT', { path: '$.params.timeLimitSec', message: 'timeLimitSec < 10', studentHint: '제한 시간이 너무 짧아요. 10초 이상으로 해 줘.' }));
  }
  return out;
}

function resolveParams(templateId, params) {
  const t = TEMPLATES[templateId];
  const p = {};
  for (const [k, spec] of Object.entries(t.params)) p[k] = params[k] !== undefined ? params[k] : spec.default;
  if (templateId === 'collect' && params.goal === undefined) p.goal = p.gemCount;
  return p;
}

const N = (id, kind, args) => ({ id, kind, args, children: [] });

const BUILDERS = {
  catch(p) {
    const e = p.item;
    return {
      nodes: [
        N('world', 'world', { background: 'bg.main', timeLimitSec: p.timeLimitSec }),
        N('player', 'player', { appearance: 'player.appearance', x: 400, y: 540, speed: 320, radius: 28, movement: 'horizontal' }),
        N(`${e}-fall`, 'spawner', { entity: e, appearance: `${e}.appearance`, pattern: 'fallFromTop', intervalMs: p.spawnEveryMs, speed: p.fallSpeed, maxAlive: 8, count: 0, radius: 22 }),
        N(`touch-${e}`, 'onTouch', { entity: e, effects: [{ do: 'addScore', amount: 1 }, { do: 'removeOther' }] }),
        N('stats', 'stats', { lives: 0, invincibleMs: 0 }),
        N('win', 'winWhen', { stat: 'score', value: p.goal }),
        N('lose', 'loseWhen', { stat: 'timeUp' }),
      ],
      assets: { 'bg.main': 'bg-sky', 'player.appearance': 'emoji:' + HEROES[p.hero], [`${e}.appearance`]: 'emoji:' + CATCH_ITEMS[e] },
      heroSlotParam: 'hero',
    };
  },
  avoid(p) {
    const e = p.hazard;
    return {
      nodes: [
        N('world', 'world', { background: 'bg.main', timeLimitSec: 0 }),
        N('player', 'player', { appearance: 'player.appearance', x: 400, y: 540, speed: 360, radius: 26, movement: 'horizontal' }),
        // 장애물은 닿아도 사라지지 않고 지나간다 → 연속 접촉은 enter 1회 + 무적으로 목숨이 한 번만 준다
        N(`${e}-fall`, 'spawner', { entity: e, appearance: `${e}.appearance`, pattern: 'fallFromTop', intervalMs: p.spawnEveryMs, speed: p.fallSpeed, maxAlive: 12, count: 0, radius: 24 }),
        N(`touch-${e}`, 'onTouch', { entity: e, effects: [{ do: 'loseLife' }] }),
        N('stats', 'stats', { lives: p.lives, invincibleMs: p.invincibleMs }),
        N('win', 'winWhen', { stat: 'survivedSec', value: p.surviveSec }),
        N('lose', 'loseWhen', { stat: 'livesZero' }),
      ],
      assets: { 'bg.main': 'bg-space', 'player.appearance': 'emoji:' + HEROES[p.hero], [`${e}.appearance`]: 'emoji:' + HAZARDS[e] },
    };
  },
  collect(p) {
    const e = p.gem;
    const nodes = [
      N('world', 'world', { background: 'bg.main', timeLimitSec: p.timeLimitSec }),
      N('player', 'player', { appearance: 'player.appearance', x: 400, y: 300, speed: 280, radius: 26, movement: 'fourWay' }),
      N(`${e}-spot`, 'spawner', { entity: e, appearance: `${e}.appearance`, pattern: 'scatter', intervalMs: 3000, speed: 0, maxAlive: p.gemCount, count: p.gemCount, radius: 22 }),
      N(`touch-${e}`, 'onTouch', { entity: e, effects: [{ do: 'addScore', amount: 1 }, { do: 'removeOther' }] }),
    ];
    const assets = { 'bg.main': 'bg-meadow', 'player.appearance': 'emoji:' + HEROES[p.hero], [`${e}.appearance`]: 'emoji:' + GEMS[e] };
    if (p.hazard === 'bomb') {
      nodes.push(N('bomb-spot', 'spawner', { entity: 'bomb', appearance: 'bomb.appearance', pattern: 'scatter', intervalMs: 5000, speed: 0, maxAlive: 2, count: 2, radius: 22 }));
      nodes.push(N('touch-bomb', 'onTouch', { entity: 'bomb', effects: [{ do: 'loseLife' }, { do: 'removeOther' }] }));
      assets['bomb.appearance'] = 'emoji:💣';
    }
    nodes.push(N('stats', 'stats', { lives: p.hazard === 'bomb' ? 3 : 0, invincibleMs: p.hazard === 'bomb' ? 1000 : 0 }));
    nodes.push(N('win', 'winWhen', { stat: 'score', value: p.goal }));
    if (p.hazard === 'bomb') nodes.push(N('lose', 'loseWhen', { stat: 'livesZero' }));
    if (p.timeLimitSec > 0) nodes.push(N('lose-time', 'loseWhen', { stat: 'timeUp' }));
    return { nodes, assets };
  },
  maze(p) {
    const rows = [...MAZE_MAPS[p.map].rows];
    const L = mazeLayout(rows);
    const s = cellCenter(L, L.start.c, L.start.r);
    const radius = Math.max(8, Math.min(80, Math.floor(L.cell * 0.3)));
    const nodes = [
      N('world', 'world', { background: 'bg.main', timeLimitSec: p.timeLimitSec }),
      N('maze', 'mazeMap', { rows }),
      N('player', 'player', { appearance: 'player.appearance', x: s.x, y: s.y, speed: p.speed, radius, movement: 'fourWay' }),
      N('stats', 'stats', { lives: 0, invincibleMs: 0 }),
      N('win', 'winWhen', { stat: 'reachedExit', value: 0 }),
    ];
    if (p.timeLimitSec > 0) nodes.push(N('lose', 'loseWhen', { stat: 'timeUp' }));
    return { nodes, assets: { 'bg.main': 'bg-ruins', 'player.appearance': 'emoji:' + HEROES[p.hero] } };
  },
};

/** params → 슬롯에 해당하는 param 키 (학생이 명시하지 않은 모습은 기존 작품 에셋을 유지) */
const SLOT_PARAM = { 'player.appearance': 'hero' };

/**
 * 템플릿 인스턴스화 + 진단. UI·서버는 이쪽을 쓰면 실패 이유를 받을 수 있다.
 * @returns {{ok:true, result:{nodes:object[], entrypoints:string[], assets:object[]}, diagnostics:object[]} | {ok:false, diagnostics:object[]}}
 */
export function instantiateTemplate(templateId, params = {}, project = null) {
  if (project && project.mode !== 'studio') {
    return { ok: false, diagnostics: [diag('TEMPLATE_MODE_MISMATCH', { message: `mode ${project.mode}`, studentHint: '게임 공방에서만 쓸 수 있는 게임 틀이에요.' })] };
  }
  const pd = checkTemplateParams(templateId, params);
  if (pd.length) return { ok: false, diagnostics: pd };
  const p = resolveParams(templateId, params || {});
  const built = BUILDERS[templateId](p);
  const prevAssets = new Map((project?.assets || []).map(a => [a.slotId, a]));
  const assets = Object.entries(built.assets).map(([slotId, preset]) => {
    const keepPrev = prevAssets.has(slotId) && SLOT_PARAM[slotId] && params[SLOT_PARAM[slotId]] === undefined;
    return keepPrev ? { ...prevAssets.get(slotId) } : { slotId, assetId: null, preset };
  });
  const result = { nodes: built.nodes, entrypoints: built.nodes.map(n => n.id), assets };
  const sem = checkStudioSemantics(result);
  if (sem.some(d => d.severity === 'error')) return { ok: false, diagnostics: sem };
  return { ok: true, result, diagnostics: sem };
}

/**
 * patch-apply.js opts.instantiate 시그니처. 알 수 없는 템플릿·잘못된 params면 null
 * (applyPatch는 이를 UNKNOWN_TEMPLATE로 보고한다 — 정확한 이유는 instantiateTemplate/checkTemplateParams로 조회).
 */
export function instantiate(templateId, params, project) {
  const r = instantiateTemplate(templateId, params, project);
  return r.ok ? r.result : null;
}

/** 새 작품 한 벌 (새 게임 만들기·테스트용). */
export function createTemplateProject(templateId, params = {}, meta = {}) {
  const r = instantiateTemplate(templateId, params, null);
  if (!r.ok) return { ok: false, diagnostics: r.diagnostics };
  const now = meta.now || new Date().toISOString();
  const project = {
    schemaVersion: 2,
    id: meta.id || `p_${templateId}_new`,
    revision: 0,
    mode: 'studio',
    title: meta.title || TEMPLATES[templateId].title,
    templateId,
    engineVersion: ENGINE_VERSIONS.studio,
    capabilityVersion: '1',
    program: { nodes: r.result.nodes, entrypoints: r.result.entrypoints },
    assets: r.result.assets,
    learning: { missionId: null, missionVersion: null },
    createdAt: now,
    updatedAt: now,
  };
  const v = validateProject(project);
  if (v.some(d => d.severity === 'error')) return { ok: false, diagnostics: v };
  return { ok: true, project, diagnostics: [...v, ...r.diagnostics] };
}

// ── 장르별 smoke replay ──

const findNode = (project, kind) => project.program.nodes.find(n => n.kind === kind);
const player = snap => snap.entities.find(e => e.id === 'player');

function chaseX(target, me, tol) {
  if (!target) return {};
  if (target.x < me.x - tol) return { left: true };
  if (target.x > me.x + tol) return { right: true };
  return {};
}

const POLICIES = {
  /** 받기: 가장 아래에 있는(곧 닿을) 점수 물건 쪽으로 좌우 이동 */
  catch(project) {
    const ent = project.program.nodes.find(n => n.kind === 'onTouch' && n.args.effects.some(e => e.do === 'addScore')).args.entity;
    return snap => {
      const me = player(snap);
      const items = snap.entities.filter(e => e.entity === ent && e.y < me.y);
      items.sort((a, b) => b.y - a.y);
      return chaseX(items[0], me, 6);
    };
  },
  /** 피하기: 가만히 있는다 → 목숨이 줄어 결국 진다 (무적·피해 횟수 검증용) */
  avoid() { return () => ({}); },
  /** 모으기: 가장 가까운 보석으로 대각선 이동 */
  collect(project) {
    const ent = project.program.nodes.find(n => n.kind === 'onTouch' && n.args.effects.some(e => e.do === 'addScore')).args.entity;
    return snap => {
      const me = player(snap);
      let best = null, bd = Infinity;
      for (const e of snap.entities) {
        if (e.entity !== ent) continue;
        const d = (e.x - me.x) ** 2 + (e.y - me.y) ** 2;
        if (d < bd) { bd = d; best = e; }
      }
      if (!best) return {};
      const tol = 4, o = {};
      if (best.x < me.x - tol) o.left = true; else if (best.x > me.x + tol) o.right = true;
      if (best.y < me.y - tol) o.up = true; else if (best.y > me.y + tol) o.down = true;
      return o;
    };
  },
  /** 미로: BFS 최단 경로의 칸 가운데를 차례로 따라간다 */
  maze(project) {
    const maze = findNode(project, 'mazeMap');
    const L = mazeLayout(maze.args.rows);
    const path = mazePath(L, findNode(project, 'player').args.movement) || [];
    const step = findNode(project, 'player').args.speed / TICK_HZ;
    let i = 1;
    return snap => {
      const me = player(snap);
      while (i < path.length) {
        const c = cellCenter(L, path[i].c, path[i].r);
        if (Math.abs(c.x - me.x) <= step && Math.abs(c.y - me.y) <= step) { i++; continue; }
        if (Math.abs(c.x - me.x) > step) return c.x < me.x ? { left: true } : { right: true };
        return c.y < me.y ? { up: true } : { down: true };
      }
      return {};
    };
  },
};

function commonChecks(result, project, problems) {
  const collects = result.trace.filter(e => e.type === 'collect');
  const ids = new Set();
  for (const c of collects) {
    if (ids.has(c.id)) problems.push(`같은 물건(${c.id})에서 점수가 두 번 올랐다`);
    ids.add(c.id);
  }
  const removeOn = new Set(project.program.nodes.filter(n => n.kind === 'onTouch' && n.args.effects.some(e => e.do === 'removeOther')).map(n => n.args.entity));
  for (const c of collects) {
    if (removeOn.has(c.entity) && !result.trace.some(e => e.type === 'remove' && e.id === c.id && e.tick === c.tick)) problems.push(`${c.id} 수집과 제거가 같은 tick이 아니다`);
  }
  const sumScore = collects.reduce((s, c) => s + c.amount, 0);
  if (sumScore !== result.finalSnapshot.score) problems.push(`점수 ${result.finalSnapshot.score} != collect 합 ${sumScore}`);
  const stats = findNode(project, 'stats');
  const invTicks = stats && stats.args.invincibleMs > 0 ? msToTicks(stats.args.invincibleMs) : 0;
  const hits = result.trace.filter(e => e.type === 'hit');
  for (let k = 1; k < hits.length; k++) {
    if (hits[k].tick - hits[k - 1].tick < invTicks) problems.push(`무적 시간 안에 피해가 다시 들어갔다 (tick ${hits[k - 1].tick}→${hits[k].tick})`);
  }
}

const EXPECT = {
  catch(result, project, problems) {
    const goal = project.program.nodes.find(n => n.kind === 'winWhen').args.value;
    if (result.finalSnapshot.score < 1) problems.push('받기: 점수가 오르지 않았다');
    if (result.finalSnapshot.state !== 'won') problems.push(`받기: 목표 ${goal}점 도달 실패 (${result.finalSnapshot.state}, ${result.finalSnapshot.score}점)`);
  },
  avoid(result, project, problems) {
    const lives = findNode(project, 'stats').args.lives;
    const hits = result.trace.filter(e => e.type === 'hit').length;
    if (result.finalSnapshot.state !== 'lost') problems.push(`피하기: 가만히 있었는데 지지 않았다 (${result.finalSnapshot.state})`);
    if (hits !== lives) problems.push(`피하기: 피해 ${hits}회 != 목숨 ${lives}`);
    if (!result.trace.some(e => e.type === 'lose' && e.reason === 'livesZero')) problems.push('피하기: livesZero로 끝나지 않았다');
  },
  collect(result, project, problems) {
    const goal = project.program.nodes.find(n => n.kind === 'winWhen').args.value;
    if (result.finalSnapshot.state !== 'won') problems.push(`모으기: 성공하지 못했다 (${result.finalSnapshot.state}, ${result.finalSnapshot.score}/${goal})`);
    if (result.trace.filter(e => e.type === 'collect').length !== goal) problems.push('모으기: 수집 횟수가 목표와 다르다');
  },
  maze(result, project, problems) {
    if (result.finalSnapshot.state !== 'won' || !result.trace.some(e => e.type === 'win' && e.reason === 'reachedExit')) {
      problems.push(`미로: 도착하지 못했다 (${result.finalSnapshot.state})`);
    }
  },
};

/**
 * 장르별 smoke replay: 폐루프 자동 조작으로 입력을 기록 → simulate로 재생 → 기록/재생 trace 동일성 + 장르 규칙 검사.
 * @returns {{ok:boolean, problems:string[], inputScript:object[], result:object}}
 */
export function runSmoke(project, { seed = 1, ticks = 60 * 90, templateId = project.templateId } = {}) {
  const problems = [];
  if (!POLICIES[templateId]) return { ok: false, problems: [`smoke 정책이 없는 템플릿: ${templateId}`], inputScript: [], result: null };
  const rec = recordInputs(project, { seed, ticks, policy: POLICIES[templateId](project) });
  const replay = simulate(project, { seed, ticks, inputScript: rec.inputScript });
  if (JSON.stringify(rec.result.trace) !== JSON.stringify(replay.trace)) problems.push('기록한 입력을 다시 재생했는데 trace가 다르다');
  if (replay.diagnostics.some(d => d.severity === 'error')) problems.push('진단 오류: ' + replay.diagnostics.filter(d => d.severity === 'error').map(d => d.code).join(','));
  if (replay.finalSnapshot) {
    commonChecks(replay, project, problems);
    EXPECT[templateId](replay, project, problems);
  }
  return { ok: problems.length === 0, problems, inputScript: rec.inputScript, result: replay };
}
