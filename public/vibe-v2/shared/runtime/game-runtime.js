// 게임 공방(studio-2) 런타임 — WP4. DOM 없는 순수 ES 모듈 (브라우저·Node 공용).
//
// 계약: shared/contracts/interfaces.js 의 GameRuntime / NormalizedInput / RuntimeSnapshot.
// - 고정 60Hz 시뮬레이션. step(dtMs)는 dt를 누적(한 번에 최대 100ms)하고 한 호출에 최대 5 tick만 따라잡는다.
// - 모든 시간 규칙(생성 간격·무적·제한 시간·버티기)은 tick 단위 단일 가상 시계. setInterval/setTimeout 없음.
// - 난수는 seed 기반 mulberry32 하나만 쓴다 → 같은 seed·같은 입력이면 같은 결과.
// - 충돌체는 원(radius). 빠른 물체는 tick을 substep으로 나눠 관통을 막는다.
// - 접촉은 enter(효과 실행) / stay(아무 일 없음) / exit(다시 닿을 수 있게 재장전)로 구분한다.
// - 자원 상한 초과는 조용히 자르지 않고 state='halted' + Diagnostic.
//
// 노드 의미(런타임 해석):
//   world     timeLimitSec>0 이면 loseWhen timeUp이 그 시각에 발동 (timeUp 규칙이 없으면 제한 시간은 쓰이지 않음)
//   player    horizontal = 좌우만, fourWay = 상하좌우(대각선은 속도 정규화). 무대 밖으로 못 나감. 미로가 있으면 S 칸 가운데에서 시작
//   spawner   fallFromTop: intervalMs마다 (살아 있는 수 < maxAlive이면) 1개를 위쪽 밖에서 만들고 speed px/s로 낙하,
//                          화면 아래로 완전히 나가면 제거 + 'miss' 이벤트. count개는 시작 시 화면 위쪽 밖에 엇갈려 배치.
//             scatter:     시작 시 count개를 무작위 배치(주인공과 겹치지 않게, 미로면 빈 길 칸), intervalMs마다 maxAlive까지 보충.
//                          speed>0이면 8방향 중 하나로 떠다니며 벽·무대 끝에서 튕긴다.
//   onTouch   주인공과 entity가 새로 닿는 순간(enter) effects를 순서대로 1회 실행.
//             addScore → 'collect', loseLife → 'hit'(무적 중이면 'shielded'), removeOther → 'remove', win/lose → 즉시 종료
//   stats     lives 0 = 목숨 규칙 없음. 피해 후 invincibleMs 동안 loseLife 재적용 금지
//   winWhen   score>=value / survivedSec>=value / reachedExit(주인공 중심이 G 칸 안)
//   loseWhen  livesZero / timeUp
//   종료 우선순위(같은 tick): livesZero 패배 > 승리 조건 > timeUp 패배

import { STUDIO_NODES, STUDIO_WORLD } from '../contracts/nodes.js';
import { validate } from '../contracts/validate.js';
import { diag } from '../contracts/schemas.js';
import { checkStudioSemantics, RUNTIME_LIMITS } from '../compiler/semantic.js';
import { mazeLayout, circleHitsWall, cellAt, cellCenter, openCells } from '../compiler/maze.js';

export const TICK_HZ = 60;
export const TICK_MS = 1000 / TICK_HZ;
export const MAX_FRAME_MS = 100;
export const MAX_CATCHUP_TICKS = 5;
export const CONTROLS = Object.freeze(['left', 'right', 'up', 'down', 'action']);

const W = STUDIO_WORLD.width, H = STUDIO_WORLD.height;
const MAX_SUBSTEPS = 8;
const S2 = Math.SQRT1_2;
const DIRS8 = [[1, 0], [S2, S2], [0, 1], [-S2, S2], [-1, 0], [-S2, -S2], [0, -1], [S2, -S2]];

/** mulberry32 — 32비트 seed 결정적 PRNG. [0,1) 반환 */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const msToTicks = ms => Math.max(1, Math.round(ms / TICK_MS));

/**
 * 프로그램을 실행용 설정으로 바꾼다 (V3 컴파일). 오류가 있으면 config=null.
 * @returns {{config: object|null, diagnostics: object[]}}
 */
export function compileStudio(program, limits = RUNTIME_LIMITS) {
  const out = [];
  if (!program || !Array.isArray(program.nodes)) {
    return { config: null, diagnostics: [diag('PROGRAM_MISSING', { path: '$.program', studentHint: '게임 내용이 비어 있어요.' })] };
  }
  program.nodes.forEach((n, i) => {
    const path = `$.program.nodes[${i}]`;
    if (n?.kind === 'legacySource') return;
    const schema = STUDIO_NODES[n?.kind];
    if (!schema) { out.push(diag('RUNTIME_UNKNOWN_NODE', { nodeId: n?.id ?? null, path, message: `kind ${n?.kind}`, studentHint: '게임 무대가 모르는 블록이 있어요.' })); return; }
    for (const e of validate(schema, n)) out.push(diag('RUNTIME_NODE_INVALID', { nodeId: n.id ?? null, path: path + e.path.slice(1), message: e.message, studentHint: '값이 허용 범위를 벗어났어요.' }));
  });
  if (out.length) return { config: null, diagnostics: out };
  out.push(...checkStudioSemantics(program));
  if (!program.nodes.some(n => n.kind === 'player') && !out.some(d => d.severity === 'error')) {
    // legacySource만 있는 작품 등: studio-2 런타임으로는 실행할 수 없다 (v1 어댑터 몫)
    out.push(diag('RUNTIME_NOT_RUNNABLE', { path: '$.program', message: 'no studio-2 player node (legacy-only program?)', studentHint: '이 작품은 새 게임 무대에서 실행할 수 없어요.' }));
  }

  const nodes = program.nodes;
  const one = k => nodes.find(n => n.kind === k);
  const all = k => nodes.filter(n => n.kind === k);
  const spawners = all('spawner'), touches = all('onTouch');
  const handlerCount = spawners.length + touches.length;
  if (handlerCount > limits.eventHandlers && !out.some(d => d.code === 'TOO_MANY_HANDLERS')) {
    out.push(diag('TOO_MANY_HANDLERS', { message: `${handlerCount} > ${limits.eventHandlers}`, studentHint: '규칙이 너무 많아요. 몇 개를 줄여 볼까?' }));
  }
  if (out.some(d => d.severity === 'error')) return { config: null, diagnostics: out };

  const world = one('world'), player = one('player'), stats = one('stats'), maze = one('mazeMap');
  const touchByEntity = new Map();
  for (const t of touches) {
    if (!touchByEntity.has(t.args.entity)) touchByEntity.set(t.args.entity, []);
    touchByEntity.get(t.args.entity).push(t.args.effects.map(e => ({ ...e })));
  }
  const L = maze ? mazeLayout(maze.args.rows) : null;
  const config = {
    background: world ? world.args.background : null,
    timeLimitTicks: world && world.args.timeLimitSec > 0 ? world.args.timeLimitSec * TICK_HZ : 0,
    player: { ...player.args, perTick: player.args.speed / TICK_HZ },
    spawners: spawners.map(s => ({
      nodeId: s.id, ...s.args,
      intervalTicks: msToTicks(s.args.intervalMs),
      perTick: s.args.speed / TICK_HZ,
    })),
    touchByEntity,
    wins: all('winWhen').map(w => ({ ...w.args })),
    loses: all('loseWhen').map(l => ({ ...l.args })),
    livesEnabled: !!stats && stats.args.lives > 0,
    lives: stats ? stats.args.lives : 0,
    invincibleTicks: stats && stats.args.invincibleMs > 0 ? msToTicks(stats.args.invincibleMs) : 0,
    maze: L,
    mazeOpen: L ? openCells(L) : null,
    mazeView: L ? Object.freeze({ rows: Object.freeze([...L.rows]), cols: L.cols, nrows: L.nrows, cell: L.cell, ox: L.ox, oy: L.oy }) : null,
    handlerCount,
  };
  return { config, diagnostics: out };
}

/**
 * @param {{limits?: Partial<typeof RUNTIME_LIMITS>}} [options]  limits는 테스트·저사양 조정용
 * @returns {import('../contracts/interfaces.js').GameRuntime & {
 *   stepTicks(n:number): object, releaseAll(): void, snapshot(): object, debugStats(): object }}
 */
export function createGameRuntime(options = {}) {
  const limits = { ...RUNTIME_LIMITS, ...(options.limits || {}) };
  let config = null;
  let loadDiagnostics = [];
  let baseSeed = 0;
  let disposed = false;
  let S = emptyState();

  function emptyState() {
    return {
      tick: 0, state: 'ready', score: 0, lives: 0, invUntil: 0, rng: mulberry32(0),
      player: null, entities: [], serial: 0, timers: [], events: [], diagnostics: [],
      commands: 0, acc: 0, held: { left: false, right: false, up: false, down: false, action: false },
    };
  }

  // ── 상태 초기화 ──
  function init(seed) {
    S = emptyState();
    S.diagnostics = loadDiagnostics.slice();
    if (!config) { S.state = 'halted'; return; }
    S.rng = mulberry32(seed);
    S.lives = config.lives;
    const p = config.player;
    S.player = { x: p.x, y: p.y, r: p.radius, slot: p.appearance };
    if (config.maze && config.maze.start) {
      const c = cellCenter(config.maze, config.maze.start.c, config.maze.start.r);
      S.player.x = c.x; S.player.y = c.y;
    }
    clampPlayer();
    config.spawners.forEach((sp, i) => {
      S.timers.push({ spawner: i, next: sp.intervalTicks, period: sp.intervalTicks });
    });
    config.spawners.forEach((sp, i) => {
      for (let k = 0; k < sp.count && S.state !== 'halted'; k++) spawn(i, true);
    });
  }

  function clampPlayer() {
    const P = S.player;
    P.x = Math.max(P.r, Math.min(W - P.r, P.x));
    P.y = Math.max(P.r, Math.min(H - P.r, P.y));
  }

  function emit(ev) { S.events.push({ tick: S.tick, ...ev }); }

  function halt(code, message, studentHint) {
    if (S.state === 'halted') return;
    S.state = 'halted';
    S.diagnostics.push(diag(code, { message, studentHint, path: `tick:${S.tick}` }));
    emit({ type: 'halt', code });
    releaseAll();
  }

  function end(state, reason) {
    if (S.state !== 'playing') return;
    S.state = state;
    emit({ type: state === 'won' ? 'win' : 'lose', reason });
    releaseAll();
  }

  function alive(spIdx) {
    let n = 0;
    for (const e of S.entities) if (e.spawner === spIdx && !e.dead) n++;
    return n;
  }

  function activeCount() {
    let n = 0;
    for (const e of S.entities) if (!e.dead) n++;
    return n;
  }

  function spawn(spIdx, initial) {
    if (activeCount() + 1 > limits.activeEntities) {
      halt('ENTITY_LIMIT', `active entities would exceed ${limits.activeEntities}`, '물건이 너무 많이 생겨서 게임을 잠깐 멈췄어요.');
      return;
    }
    S.commands++;
    const sp = config.spawners[spIdx];
    const r = sp.radius;
    let x, y, vx = 0, vy = 0;
    if (sp.pattern === 'fallFromTop') {
      x = r + S.rng() * (W - 2 * r);
      y = initial ? -r - S.rng() * (H / 2) : -r;
      vy = sp.perTick;
    } else {
      if (config.maze && config.mazeOpen.length) {
        const pc = cellAt(config.maze, S.player.x, S.player.y);
        const cand = config.mazeOpen.filter(c => !(c.c === pc.c && c.r === pc.r));
        const pick = (cand.length ? cand : config.mazeOpen)[Math.floor(S.rng() * (cand.length || config.mazeOpen.length))];
        ({ x, y } = cellCenter(config.maze, pick.c, pick.r));
      } else {
        const minD = S.player.r + r + 40;
        for (let k = 0; k < 20; k++) {
          x = r + S.rng() * (W - 2 * r);
          y = r + S.rng() * (H - 2 * r);
          const dx = x - S.player.x, dy = y - S.player.y;
          if (dx * dx + dy * dy >= minD * minD) break;
        }
      }
      if (sp.perTick > 0) {
        const d = DIRS8[Math.floor(S.rng() * 8)];
        vx = d[0] * sp.perTick; vy = d[1] * sp.perTick;
      }
    }
    const id = `${sp.entity}-${++S.serial}`;
    S.entities.push({ id, entity: sp.entity, spawner: spIdx, pattern: sp.pattern, x, y, r, vx, vy, slot: sp.appearance, touching: false, dead: false });
    emit({ type: 'spawn', entity: sp.entity, id });
  }

  function fireTimers() {
    for (const t of S.timers) {
      while (t.next <= S.tick && S.state === 'playing') {
        S.commands++;
        t.next += t.period;
        const sp = config.spawners[t.spawner];
        if (sp.pattern === 'fallFromTop') {
          if (alive(t.spawner) < sp.maxAlive) spawn(t.spawner, false);
        } else {
          while (alive(t.spawner) < sp.maxAlive && S.state === 'playing') spawn(t.spawner, false);
        }
      }
      if (S.state !== 'playing') return;
    }
  }

  function movePlayer(dx, dy) {
    const P = S.player, L = config.maze;
    if (dx) {
      let nx = Math.max(P.r, Math.min(W - P.r, P.x + dx));
      if (!(L && circleHitsWall(L, nx, P.y, P.r))) P.x = nx;
    }
    if (dy) {
      let ny = Math.max(P.r, Math.min(H - P.r, P.y + dy));
      if (!(L && circleHitsWall(L, P.x, ny, P.r))) P.y = ny;
    }
  }

  function moveEntity(e, f) {
    if (e.pattern === 'fallFromTop') { e.y += e.vy * f; return; }
    if (!e.vx && !e.vy) return;
    const L = config.maze;
    let nx = e.x + e.vx * f;
    if (nx < e.r || nx > W - e.r || (L && circleHitsWall(L, nx, e.y, e.r))) e.vx = -e.vx; else e.x = nx;
    let ny = e.y + e.vy * f;
    if (ny < e.r || ny > H - e.r || (L && circleHitsWall(L, e.x, ny, e.r))) e.vy = -e.vy; else e.y = ny;
  }

  function runEffects(e) {
    const lists = config.touchByEntity.get(e.entity);
    emit({ type: 'touch', entity: e.entity, id: e.id });
    if (!lists) return;
    for (const effects of lists) {
      for (const ef of effects) {
        S.commands++;
        switch (ef.do) {
          case 'addScore':
            S.score += ef.amount;
            emit({ type: 'collect', entity: e.entity, id: e.id, amount: ef.amount, score: S.score });
            if (S.score > limits.maxScore) { halt('SCORE_LIMIT', `score ${S.score} > ${limits.maxScore}`, '점수가 너무 커져서 게임을 멈췄어요.'); return; }
            break;
          case 'loseLife':
            if (!config.livesEnabled) break;
            if (S.tick < S.invUntil) { emit({ type: 'shielded', entity: e.entity, id: e.id }); break; }
            S.lives = Math.max(0, S.lives - 1);
            S.invUntil = S.tick + config.invincibleTicks;
            emit({ type: 'hit', entity: e.entity, id: e.id, lives: S.lives });
            break;
          case 'removeOther':
            if (!e.dead) { e.dead = true; emit({ type: 'remove', entity: e.entity, id: e.id }); }
            break;
          case 'win': end('won', 'touch'); return;
          case 'lose': end('lost', 'touch'); return;
        }
      }
    }
  }

  function checkEnd() {
    if (S.state !== 'playing') return;
    const L = config.maze;
    if (config.livesEnabled && S.lives <= 0 && config.loses.some(l => l.stat === 'livesZero')) return end('lost', 'livesZero');
    for (const w of config.wins) {
      if (w.stat === 'score' && S.score >= w.value) return end('won', 'score');
      if (w.stat === 'survivedSec' && S.tick >= w.value * TICK_HZ) return end('won', 'survivedSec');
      if (w.stat === 'reachedExit' && L && L.goal) {
        const c = cellAt(L, S.player.x, S.player.y);
        if (c.c === L.goal.c && c.r === L.goal.r) return end('won', 'reachedExit');
      }
    }
    if (config.timeLimitTicks > 0 && S.tick >= config.timeLimitTicks && config.loses.some(l => l.stat === 'timeUp')) return end('lost', 'timeUp');
  }

  function advanceOne() {
    if (S.state !== 'playing') return;
    S.tick++;
    S.commands = 0;
    fireTimers();
    if (S.state !== 'playing') return;

    const p = config.player, h = S.held;
    let ix = (h.right ? 1 : 0) - (h.left ? 1 : 0);
    let iy = p.movement === 'fourWay' ? (h.down ? 1 : 0) - (h.up ? 1 : 0) : 0;
    let pdx = ix * p.perTick, pdy = iy * p.perTick;
    if (ix && iy) { pdx *= S2; pdy *= S2; }

    let maxV = 0, minR = Infinity;
    for (const e of S.entities) {
      const v = Math.abs(e.vx) + Math.abs(e.vy);
      if (v > maxV) maxV = v;
      if (e.r < minR) minR = e.r;
    }
    const disp = Math.abs(pdx) + Math.abs(pdy) + maxV;
    const reach = S.player.r + (minR === Infinity ? S.player.r : minR);
    const sub = Math.max(1, Math.min(MAX_SUBSTEPS, Math.ceil(disp / (reach * 0.5))));
    const f = 1 / sub;

    for (let s = 0; s < sub && S.state === 'playing'; s++) {
      movePlayer(pdx * f, pdy * f);
      const P = S.player;
      for (const e of S.entities) {
        if (e.dead) continue;
        moveEntity(e, f);
        S.commands++;
        const dx = e.x - P.x, dy = e.y - P.y, rr = e.r + P.r;
        const touching = dx * dx + dy * dy < rr * rr;
        if (touching && !e.touching) {           // enter
          e.touching = true;
          runEffects(e);
          if (S.state !== 'playing') break;
        } else if (!touching && e.touching) {    // exit
          e.touching = false;
        }                                         // stay: 아무 일 없음
      }
    }
    if (!Number.isFinite(S.player.x) || !Number.isFinite(S.player.y)) halt('NUMERIC_OVERFLOW', 'player position not finite', '숫자가 너무 커져서 게임을 멈췄어요.');

    const keep = [];
    for (const e of S.entities) {
      if (e.dead) continue;
      if (e.pattern === 'fallFromTop' && e.y - e.r > H) { emit({ type: 'miss', entity: e.entity, id: e.id }); continue; }
      keep.push(e);
    }
    S.entities = keep;

    checkEnd();
    if (S.commands > limits.commandsPerTick) halt('COMMAND_LIMIT', `${S.commands} commands in one tick > ${limits.commandsPerTick}`, '한 번에 할 일이 너무 많아서 게임을 멈췄어요.');
  }

  function snapshot() {
    const events = S.events;
    S.events = [];
    const ents = [];
    if (S.player) ents.push({ id: 'player', entity: 'player', x: S.player.x, y: S.player.y, r: S.player.r, slot: S.player.slot });
    for (const e of S.entities) if (!e.dead) ents.push({ id: e.id, entity: e.entity, x: e.x, y: e.y, r: e.r, slot: e.slot });
    return {
      tick: S.tick,
      state: S.state,
      score: S.score,
      lives: S.lives,
      elapsedMs: Math.floor(S.tick * TICK_MS),
      entities: ents,
      events,
      diagnostics: S.diagnostics.slice(),
      // ── 계약 확장(비파괴, 렌더러·HUD용) ──
      timeLeftMs: config && config.timeLimitTicks ? Math.max(0, Math.ceil((config.timeLimitTicks - S.tick) * TICK_MS)) : null,
      invincible: S.tick < S.invUntil,
      livesEnabled: !!config && config.livesEnabled,
      background: config ? config.background : null,
      maze: config ? config.mazeView : null,
    };
  }

  function releaseAll() { for (const k of CONTROLS) S.held[k] = false; }

  function begin() { if (S.state === 'ready') { S.state = 'playing'; S.acc = 0; emit({ type: 'start' }); } }

  return {
    load(program, assets, seed = 0) {
      if (disposed) return [diag('RUNTIME_DISPOSED', { studentHint: '게임 무대가 닫혔어요.' })];
      baseSeed = seed >>> 0;
      const { config: c, diagnostics } = compileStudio(program, limits);
      config = c;
      loadDiagnostics = diagnostics;
      init(baseSeed);
      return diagnostics.slice();
    },
    input(ev) {
      if (disposed || !ev || !CONTROLS.includes(ev.control)) return;
      if (S.state !== 'ready' && S.state !== 'playing') return;   // 끝난 게임·일시정지 중 입력 무시
      S.held[ev.control] = ev.pressed === true;
    },
    step(dtMs) {
      if (disposed || !config) return snapshot();
      begin();
      if (S.state !== 'playing') return snapshot();
      const dt = Number.isFinite(dtMs) && dtMs > 0 ? Math.min(dtMs, MAX_FRAME_MS) : 0;
      S.acc += dt;
      let n = 0;
      while (S.acc >= TICK_MS && n < MAX_CATCHUP_TICKS && S.state === 'playing') { advanceOne(); S.acc -= TICK_MS; n++; }
      if (S.acc >= TICK_MS) S.acc %= TICK_MS;   // 따라잡기 상한을 넘은 시간은 버린다 (밀린 생성 폭탄 방지)
      return snapshot();
    },
    /** 누적기와 무관하게 정확히 n tick 진행 (시뮬레이터·테스트용) */
    stepTicks(n) {
      if (disposed || !config) return snapshot();
      begin();
      for (let i = 0; i < n && S.state === 'playing'; i++) advanceOne();
      return snapshot();
    },
    pause() {
      if (disposed) return;
      if (S.state === 'playing') { S.state = 'paused'; S.acc = 0; releaseAll(); emit({ type: 'pause' }); }
    },
    resume() {
      if (disposed) return;
      if (S.state === 'paused') { S.state = 'playing'; S.acc = 0; emit({ type: 'resume' }); }
      else begin();
    },
    reset(seed) {
      if (disposed) return;
      init(seed === undefined ? baseSeed : seed >>> 0);
    },
    dispose() {
      disposed = true;
      config = null;
      S.timers = []; S.entities = []; S.events = [];
      releaseAll();
    },
    releaseAll() { if (!disposed) releaseAll(); },
    snapshot() { const ev = S.events; const snap = snapshot(); S.events = ev; snap.events = ev.slice(); return snap; },
    debugStats() {
      return {
        disposed,
        state: S.state,
        tick: S.tick,
        timers: S.timers.length,
        handlers: config ? config.handlerCount : 0,
        entities: S.entities.filter(e => !e.dead).length,
        heldInputs: CONTROLS.filter(k => S.held[k]).length,
        pendingEvents: S.events.length,
      };
    },
  };
}
