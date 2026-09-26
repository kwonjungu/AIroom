// 게임 공방(studio-2) 의미 검증 — 하네스 V2 층. 순수 함수, DOM 없음.
// 구조(V1: 스키마·ID·그래프)는 contracts/schemas.js의 validateProject가 담당하고,
// 여기서는 "스키마는 맞지만 게임으로 성립하지 않는" 경우를 찾는다.

import { diag } from '../contracts/schemas.js';
import { mazeLayout, mazePath } from './maze.js';

/** 런타임과 공유하는 자원 상한 (HARNESS §5.2) */
export const RUNTIME_LIMITS = Object.freeze({
  activeEntities: 80,
  eventHandlers: 32,
  commandsPerTick: 2000,
  maxScore: 999999,
});

const STUDIO_KINDS = new Set(['world', 'player', 'spawner', 'onTouch', 'stats', 'winWhen', 'loseWhen', 'mazeMap']);

/**
 * @param {object} projectOrProgram  Project 또는 {nodes, entrypoints}
 * @returns {object[]} Diagnostic[]
 */
export function checkStudioSemantics(projectOrProgram) {
  const program = projectOrProgram?.program ?? projectOrProgram;
  const out = [];
  if (!program || !Array.isArray(program.nodes)) {
    return [diag('PROGRAM_MISSING', { path: '$.program', studentHint: '게임 내용이 비어 있어요.' })];
  }
  const nodes = program.nodes;
  const idx = new Map(nodes.map((n, i) => [n, i]));
  const at = (n, sub = '') => `$.program.nodes[${idx.get(n)}]${sub}`;
  const E = (code, n, sub, message, studentHint, severity = 'error') =>
    out.push(diag(code, { severity, nodeId: n ? n.id : null, path: n ? at(n, sub) : '$.program', message, studentHint }));

  const of = k => nodes.filter(n => n.kind === k);
  const legacy = of('legacySource');
  const studio = nodes.filter(n => STUDIO_KINDS.has(n.kind));
  if (legacy.length && !studio.length) {
    E('LEGACY_ONLY', legacy[0], '', 'program has only legacySource; studio-2 runtime cannot run it',
      '예전 방식으로 만든 게임이라 옛 무대에서 실행돼요.', 'warning');
    return out;
  }
  if (legacy.length) E('LEGACY_SOURCE_KEPT', legacy[0], '', 'legacySource kept as original text; ignored by runtime', '예전 코드는 보관만 하고 실행하지 않아요.', 'warning');

  const worlds = of('world'), players = of('player'), spawners = of('spawner'), touches = of('onTouch');
  const statsN = of('stats'), wins = of('winWhen'), loses = of('loseWhen'), mazes = of('mazeMap');
  const world = worlds[0], player = players[0], stats = statsN[0], maze = mazes[0];

  // ── 필수 요소 ──
  if (!players.length) E('PLAYER_MISSING', null, '', 'player node required', '주인공이 없어요. 주인공을 먼저 정해 줘.');
  if (players.length > 1) E('PLAYER_DUPLICATED', players[1], '', 'only one player allowed', '주인공은 한 명만 둘 수 있어요.');
  if (!world) E('WORLD_MISSING', null, '', 'world node missing; defaults used (no time limit)', '무대 설정이 없어서 기본 무대를 써요.', 'warning');

  // ── 자원 예산 (런타임 상한과 같은 값) ──
  const handlerCount = touches.length + spawners.length;
  if (handlerCount > RUNTIME_LIMITS.eventHandlers) {
    E('TOO_MANY_HANDLERS', null, '', `${handlerCount} handlers > ${RUNTIME_LIMITS.eventHandlers}`, '규칙이 너무 많아요. 몇 개를 줄여 볼까?');
  }
  const entityBudget = spawners.reduce((s, n) => s + Math.max(n.args.maxAlive ?? 0, n.args.count ?? 0), 0);
  if (entityBudget > RUNTIME_LIMITS.activeEntities) {
    E('TOO_MANY_ENTITIES', null, '', `spawners may create ${entityBudget} entities > ${RUNTIME_LIMITS.activeEntities}`, '한꺼번에 나오는 물건이 너무 많아요.');
  }

  // ── spawner ──
  const produced = new Map(); // entity -> spawner[]
  for (const s of spawners) {
    const a = s.args;
    if (!produced.has(a.entity)) produced.set(a.entity, []);
    produced.get(a.entity).push(s);
    if (a.pattern === 'fallFromTop' && !(a.speed > 0)) {
      E('FALL_SPEED_ZERO', s, '.args.speed', 'fallFromTop with speed 0 never enters the screen', '떨어지는 속도가 0이면 물건이 내려오지 않아요.');
    }
    if (a.pattern === 'scatter' && a.count > a.maxAlive) {
      E('SCATTER_COUNT_OVER_MAX', s, '.args.count', `count ${a.count} > maxAlive ${a.maxAlive}; refill waits until below maxAlive`, '처음 개수가 최대 개수보다 많아요.', 'warning');
    }
    if (a.pattern === 'scatter' && a.count === 0 && a.maxAlive > 0) {
      E('SCATTER_STARTS_EMPTY', s, '.args.count', `scatter starts empty; first refill after ${a.intervalMs}ms`, '처음에는 물건이 없다가 조금 뒤에 나타나요.', 'warning');
    }
  }

  // ── onTouch ──
  const touched = new Set();
  let hasAddScore = false, hasLoseLife = false, hasWinEffect = false, hasLoseEffect = false;
  for (const t of touches) {
    const a = t.args;
    touched.add(a.entity);
    if (!produced.has(a.entity)) {
      E('TOUCH_UNKNOWN_ENTITY', t, '.args.entity', `no spawner makes entity '${a.entity}'`, `'${a.entity}'을(를) 만드는 규칙이 없어서 닿을 수가 없어요.`);
    }
    const seen = new Set();
    a.effects.forEach((ef, i) => {
      if (ef.do === 'addScore') hasAddScore = true;
      if (ef.do === 'loseLife') hasLoseLife = true;
      if (ef.do === 'win') hasWinEffect = true;
      if (ef.do === 'lose') hasLoseEffect = true;
      if (ef.do !== 'addScore' && seen.has(ef.do)) {
        E('EFFECT_REPEATED', t, `.args.effects[${i}]`, `effect ${ef.do} repeated`, '같은 일이 두 번 들어 있어요.', 'warning');
      }
      if ((ef.do === 'win' || ef.do === 'lose') && i < a.effects.length - 1) {
        E('EFFECT_AFTER_END', t, `.args.effects[${i + 1}]`, 'effects after win/lose never run', '게임이 끝난 뒤의 일은 실행되지 않아요.', 'warning');
      }
      seen.add(ef.do);
    });
  }
  for (const [ent, ss] of produced) {
    if (!touched.has(ent)) E('SPAWNER_WITHOUT_TOUCH', ss[0], '.args.entity', `entity '${ent}' has no onTouch rule`, `'${ent}'에 닿았을 때 일어날 일이 없어요.`, 'warning');
  }

  // ── 목숨 ──
  const lives = stats ? stats.args.lives : 0;
  if (hasLoseLife && lives <= 0) {
    const t = touches.find(x => x.args.effects.some(e => e.do === 'loseLife'));
    E('LOSE_LIFE_WITHOUT_LIVES', t, '.args.effects', 'loseLife used but stats.lives is 0 or missing', '목숨이 줄어드는 규칙이 있는데 목숨 수가 없어요.');
  }
  if (lives > 0 && !hasLoseLife) E('LIVES_UNUSED', stats, '.args.lives', 'lives set but nothing takes a life', '목숨이 있지만 줄어드는 일이 없어요.', 'warning');

  // ── 이기기/지기 ──
  const timeLimit = world ? world.args.timeLimitSec : 0;
  for (const w of wins) {
    const { stat, value } = w.args;
    if (stat === 'score') {
      if (value <= 0) E('WIN_IMMEDIATE', w, '.args.value', 'score >= 0 is true at start', '목표 점수가 0이면 시작하자마자 이겨요.', 'warning');
      else if (!hasAddScore) E('SCORE_UNREACHABLE', w, '.args.value', 'win by score but no addScore effect', '점수를 얻는 규칙이 없어서 이길 수 없어요.');
    }
    if (stat === 'survivedSec') {
      if (value <= 0) E('WIN_IMMEDIATE', w, '.args.value', 'survivedSec >= 0 is true at start', '버티는 시간이 0이면 시작하자마자 이겨요.', 'warning');
      if (timeLimit > 0 && value > timeLimit && loses.some(l => l.args.stat === 'timeUp')) {
        E('SURVIVE_AFTER_TIME_UP', w, '.args.value', `survivedSec ${value} > timeLimitSec ${timeLimit}`, '버텨야 하는 시간이 제한 시간보다 길어요.');
      }
    }
    if (stat === 'reachedExit' && !maze) E('EXIT_WITHOUT_MAZE', w, '.args.stat', 'reachedExit needs mazeMap', '도착 규칙을 쓰려면 미로가 있어야 해요.');
  }
  for (const l of loses) {
    if (l.args.stat === 'livesZero' && lives <= 0) E('LIVES_RULE_WITHOUT_LIVES', l, '.args.stat', 'livesZero needs stats.lives > 0', '목숨이 0이 되면 지는 규칙에는 목숨 수가 필요해요.');
    if (l.args.stat === 'livesZero' && lives > 0 && !hasLoseLife) E('LIVES_NEVER_DECREASE', l, '.args.stat', 'livesZero but nothing takes a life', '목숨이 줄어드는 일이 없어서 이 규칙은 일어나지 않아요.', 'warning');
    if (l.args.stat === 'timeUp' && !(timeLimit > 0)) E('TIME_UP_WITHOUT_LIMIT', l, '.args.stat', 'timeUp needs world.timeLimitSec > 0', '시간이 끝나면 지는 규칙에는 제한 시간이 필요해요.');
  }
  if (timeLimit > 0 && !loses.some(l => l.args.stat === 'timeUp')) {
    E('TIME_LIMIT_UNUSED', world, '.args.timeLimitSec', 'timeLimitSec set but no loseWhen timeUp; runtime ignores the limit', '제한 시간이 있지만 시간이 끝나도 아무 일이 없어요.', 'warning');
  }
  // onTouch의 win/lose 효과도 종료 조건으로 인정한다.
  if (!wins.length && !loses.length && !hasWinEffect && !hasLoseEffect) {
    E('NO_END_CONDITION', null, '', 'need at least one winWhen/loseWhen (or win/lose effect)', '이기거나 지는 규칙이 하나는 있어야 게임이 끝나요.');
  } else if (!wins.length && !hasWinEffect) {
    E('NO_WIN_CONDITION', null, '', 'no way to win; game can only be lost', '이기는 방법도 하나 정해 주면 더 재밌어요.', 'warning');
  }

  // ── 미로 ──
  if (maze) {
    const L = mazeLayout(maze.args.rows);
    if (L.ragged) E('MAZE_ROW_LENGTH', maze, '.args.rows', 'rows must have equal length', '미로의 줄 길이가 서로 달라요.');
    if (L.starts === 0) E('MAZE_START_MISSING', maze, '.args.rows', 'no S cell', '미로에 출발(S) 칸이 없어요.');
    if (L.starts > 1) E('MAZE_START_DUPLICATED', maze, '.args.rows', `${L.starts} S cells`, '출발(S) 칸은 하나만 있어야 해요.');
    if (L.goals === 0) E('MAZE_GOAL_MISSING', maze, '.args.rows', 'no G cell', '미로에 도착(G) 칸이 없어요.');
    if (L.goals > 1) E('MAZE_GOAL_DUPLICATED', maze, '.args.rows', `${L.goals} G cells`, '도착(G) 칸은 하나만 있어야 해요.');
    if (!L.ragged && L.starts === 1 && L.goals === 1) {
      const move = player ? player.args.movement : 'fourWay';
      if (!mazePath(L, move)) {
        E('MAZE_NO_PATH', maze, '.args.rows', `no path from S to G (movement ${move})`,
          move === 'horizontal' ? '좌우로만 움직여서는 도착할 수 없어요.' : '출발에서 도착까지 이어진 길이 없어요.');
      }
      if (player && player.args.radius * 2 >= L.cell) {
        E('MAZE_PLAYER_TOO_BIG', player, '.args.radius', `player diameter ${player.args.radius * 2} >= cell ${L.cell.toFixed(1)}`, '주인공이 너무 커서 미로 길을 지나갈 수 없어요.');
      }
    }
    if (!wins.some(w => w.args.stat === 'reachedExit')) E('MAZE_WITHOUT_EXIT_RULE', maze, '', 'mazeMap without winWhen reachedExit', '도착하면 이기는 규칙을 넣어 볼까?', 'warning');
  }
  return out;
}

export const hasErrors = diags => diags.some(d => d.severity === 'error');
