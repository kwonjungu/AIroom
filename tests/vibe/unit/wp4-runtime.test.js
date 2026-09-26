// WP4 런타임: RT03 결정성, RT04 규칙 횟수, RT05 정리, RT06 자원 상한, RT07 프레임 독립, RT08 입력 해제, 성능.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { createGameRuntime, TICK_MS, msToTicks } from '../../../public/vibe-v2/shared/runtime/game-runtime.js';
import { simulate, recordInputs } from '../../../public/vibe-v2/shared/runtime/simulate.js';
import { catchGame, legacyStudio, goalCards } from '../../../public/vibe-v2/shared/contracts/fixtures.js';
import { createTemplateProject } from '../../../public/vibe-v2/shared/templates/index.js';

const NOW = { now: '2026-09-26T00:00:00.000Z' };
const tpl = (id, params = {}) => { const r = createTemplateProject(id, params, NOW); assert.ok(r.ok, JSON.stringify(r.diagnostics)); return r.project; };
const N = (id, kind, args) => ({ id, kind, args, children: [] });
const prog = nodes => ({ nodes, entrypoints: nodes.map(n => n.id) });
const errors = d => d.filter(x => x.severity === 'error');
const count = (trace, type) => trace.filter(e => e.type === type).length;

// ── RT03 ──
test('RT03: 같은 seed·입력이면 10회 모두 trace·최종 상태 동일, seed가 다르면 달라진다', () => {
  const p = catchGame();
  const inputScript = [
    { tick: 0, control: 'left', pressed: true }, { tick: 90, control: 'left', pressed: false },
    { tick: 120, control: 'right', pressed: true }, { tick: 400, control: 'right', pressed: false },
  ];
  const runs = Array.from({ length: 10 }, () => simulate(p, { seed: 42, ticks: 1200, inputScript }));
  const ref = JSON.stringify([runs[0].trace, runs[0].finalSnapshot]);
  for (const r of runs) assert.equal(JSON.stringify([r.trace, r.finalSnapshot]), ref);
  assert.ok(runs[0].trace.length > 10);
  const other = simulate(p, { seed: 43, ticks: 1200, inputScript });
  assert.notEqual(JSON.stringify(other.trace), JSON.stringify(runs[0].trace));
});

test('RT03: 기록한 입력(recordInputs)을 simulate로 재생하면 같은 trace', () => {
  const p = tpl('collect', { gemCount: 6 });
  const rec = recordInputs(p, { seed: 9, ticks: 1500, policy: s => ({ right: s.tick % 200 < 100, down: s.tick % 300 < 150, left: s.tick % 200 >= 100 }) });
  const rep = simulate(p, { seed: 9, ticks: 1500, inputScript: rec.inputScript });
  assert.equal(JSON.stringify(rep.trace), JSON.stringify(rec.result.trace));
});

// ── RT04 ──
test('RT04 받기: 점수=collect 합, 물건마다 1회, 수집·제거 같은 tick, 목표 점수 도달 tick에 승리', () => {
  const p = tpl('catch', { goal: 7 });
  const rec = recordInputs(p, { seed: 5, ticks: 3600, policy: (() => {
    return s => {
      const me = s.entities[0];
      const f = s.entities.filter(e => e.entity === 'apple' && e.y < me.y).sort((a, b) => b.y - a.y)[0];
      if (!f) return {};
      return f.x < me.x - 6 ? { left: true } : f.x > me.x + 6 ? { right: true } : {};
    };
  })() });
  const { trace, finalSnapshot } = rec.result;
  const collects = trace.filter(e => e.type === 'collect');
  assert.equal(finalSnapshot.state, 'won');
  assert.equal(finalSnapshot.score, 7);
  assert.equal(collects.length, 7);
  assert.equal(new Set(collects.map(c => c.id)).size, 7);
  for (const c of collects) assert.ok(trace.some(e => e.type === 'remove' && e.id === c.id && e.tick === c.tick), c.id);
  const win = trace.find(e => e.type === 'win');
  assert.equal(win.tick, collects[6].tick, '7번째 수집 tick에 승리');
  assert.equal(win.reason, 'score');
  // 놓친 물건은 miss로, 받은 물건과 겹치지 않는다
  const missIds = new Set(trace.filter(e => e.type === 'miss').map(e => e.id));
  for (const c of collects) assert.ok(!missIds.has(c.id));
  // spawn = 수집 + 놓침 + 아직 화면에 있는 것
  assert.equal(count(trace, 'spawn'), collects.length + missIds.size + (finalSnapshot.entities.length - 1));
});

test('RT04 받기: 제한 시간이 지나면 정확히 timeLimitSec*60 tick에 timeUp 패배', () => {
  const p = tpl('catch', { timeLimitSec: 10, goal: 5 });
  const r = simulate(p, { seed: 1, ticks: 1000 }); // 가만히 → 거의 못 받음
  const lose = r.trace.find(e => e.type === 'lose');
  assert.equal(r.finalSnapshot.state, 'lost');
  assert.equal(lose.reason, 'timeUp');
  assert.equal(lose.tick, 10 * 60);
  assert.equal(r.finalSnapshot.timeLeftMs, 0);
});

test('RT04 피하기: 연속 접촉은 enter 1회, 무적 시간 안 재피해 없음, 목숨 수만큼 맞으면 그 tick에 패배', () => {
  const lives = 3, invincibleMs = 1500;
  const p = tpl('avoid', { lives, invincibleMs, spawnEveryMs: 300 });
  const r = simulate(p, { seed: 11, ticks: 5000 });
  const hits = r.trace.filter(e => e.type === 'hit');
  const shielded = r.trace.filter(e => e.type === 'shielded');
  const inv = msToTicks(invincibleMs);
  assert.equal(hits.length, lives);
  hits.forEach((h, i) => assert.equal(h.lives, lives - 1 - i));
  for (let i = 1; i < hits.length; i++) assert.ok(hits[i].tick - hits[i - 1].tick >= inv);
  for (const s of shielded) assert.ok(hits.some(h => s.tick >= h.tick && s.tick < h.tick + inv), '무적 중에만 shielded');
  // 같은 장애물은 계속 겹쳐 있어도 한 번만 판정된다
  const judged = [...hits, ...shielded].map(e => e.id);
  assert.equal(new Set(judged).size, judged.length);
  const lose = r.trace.find(e => e.type === 'lose');
  assert.equal(lose.reason, 'livesZero');
  assert.equal(lose.tick, hits[lives - 1].tick);
  assert.equal(r.finalSnapshot.lives, 0);
});

test('RT04 피하기: 무적 0이면 새로 닿는 장애물마다 정확히 1회 피해 (tick마다 아님)', () => {
  const p = tpl('avoid', { lives: 9, invincibleMs: 300, spawnEveryMs: 200 });
  p.program.nodes.find(n => n.kind === 'stats').args.invincibleMs = 0;
  const r = simulate(p, { seed: 3, ticks: 3000 });
  const hits = r.trace.filter(e => e.type === 'hit');
  assert.ok(hits.length >= 2);
  assert.equal(new Set(hits.map(h => h.id)).size, hits.length, '장애물 하나당 피해 1회');
  assert.equal(count(r.trace, 'shielded'), 0);
});

test('RT04 피하기: 버티면 정확히 surviveSec*60 tick에 승리', () => {
  const p = tpl('avoid', { lives: 9, surviveSec: 5, spawnEveryMs: 3000, fallSpeed: 80 });
  const r = simulate(p, { seed: 2, ticks: 1000 });
  const win = r.trace.find(e => e.type === 'win');
  assert.equal(r.finalSnapshot.state, 'won');
  assert.equal(win.tick, 5 * 60);
  assert.equal(win.reason, 'survivedSec');
});

test('RT04 모으기: addScore만 있고 제거 없음 → 머무는 동안(stay) 1점, 떠났다 돌아오면(exit→enter) +1', () => {
  const p = { program: prog([
    N('world', 'world', { background: 'bg.main', timeLimitSec: 0 }),
    N('player', 'player', { appearance: 'player.appearance', x: 100, y: 300, speed: 300, radius: 20, movement: 'fourWay' }),
    N('gem-spot', 'spawner', { entity: 'gem', appearance: 'gem.appearance', pattern: 'scatter', intervalMs: 10000, speed: 0, maxAlive: 1, count: 1, radius: 20 }),
    N('touch-gem', 'onTouch', { entity: 'gem', effects: [{ do: 'addScore', amount: 3 }] }),
    N('win', 'winWhen', { stat: 'score', value: 99 }),
  ]) };
  const rt = createGameRuntime();
  assert.deepEqual(errors(rt.load(p.program, [], 21)), []);
  let s = rt.snapshot();
  const gem = s.entities.find(e => e.entity === 'gem');
  const go = (tx, ty, max = 600) => {
    for (let i = 0; i < max; i++) {
      const me = s.entities[0];
      const dx = tx - me.x, dy = ty - me.y;
      rt.input({ control: 'left', pressed: dx < -3 }); rt.input({ control: 'right', pressed: dx > 3 });
      rt.input({ control: 'up', pressed: dy < -3 }); rt.input({ control: 'down', pressed: dy > 3 });
      if (Math.abs(dx) <= 3 && Math.abs(dy) <= 3) break;
      s = rt.stepTicks(1);
    }
    for (const c of ['left', 'right', 'up', 'down']) rt.input({ control: c, pressed: false });
  };
  go(gem.x, gem.y);
  assert.equal(rt.snapshot().score, 3);
  s = rt.stepTicks(120);                        // stay
  assert.equal(s.score, 3);
  go(gem.x > 400 ? gem.x - 200 : gem.x + 200, gem.y);  // exit
  assert.equal(rt.snapshot().score, 3);
  go(gem.x, gem.y);                              // enter again
  assert.equal(rt.snapshot().score, 6);
  rt.dispose();
});

test('RT04: 같은 entity에 onTouch 두 개 → 순서대로 둘 다 실행, 제거 후에도 같은 tick 중복 없음', () => {
  const p = tpl('collect', { gemCount: 4, goal: 8 });
  p.program.nodes.push(N('touch-gem2', 'onTouch', { entity: 'gem', effects: [{ do: 'addScore', amount: 1 }] }));
  p.program.entrypoints.push('touch-gem2');
  const policy = s => {
    const me = s.entities[0];
    const g = s.entities.filter(e => e.entity === 'gem').sort((a, b) => ((a.x - me.x) ** 2 + (a.y - me.y) ** 2) - ((b.x - me.x) ** 2 + (b.y - me.y) ** 2))[0];
    if (!g) return {};
    return { left: g.x < me.x - 4, right: g.x > me.x + 4, up: g.y < me.y - 4, down: g.y > me.y + 4 };
  };
  const { result } = recordInputs(p, { seed: 4, ticks: 3000, policy });
  const collects = result.trace.filter(e => e.type === 'collect');
  assert.equal(result.finalSnapshot.state, 'won');
  assert.equal(result.finalSnapshot.score, 8);
  assert.equal(collects.length, 8);
  assert.equal(new Set(collects.map(c => c.id)).size, 4, '보석 4개 × 규칙 2개');
  assert.equal(count(result.trace, 'remove'), 4);
});

test('RT04 미로: 벽을 통과하지 못하고, G 칸에 들어간 tick에 reachedExit 승리', () => {
  const p = tpl('maze', { map: 'first' });
  const r = simulate(p, { seed: 1, ticks: 300, inputScript: [{ tick: 0, control: 'up', pressed: true }] });
  const me = r.finalSnapshot.entities[0];
  const start = p.program.nodes.find(n => n.kind === 'player').args;
  const m = r.finalSnapshot.maze;
  assert.equal(r.finalSnapshot.state, 'playing');
  const wallBottom = m.oy + 1 * m.cell; // S가 있는 1행 바로 위(0행)는 벽
  assert.ok(me.y - me.r >= wallBottom - 1e-9, '위쪽 벽 칸 안으로 들어가지 않는다');
  assert.ok(start.y - me.y <= m.cell / 2 - me.r + 1e-9, '벽에 닿을 때까지만 움직인다');
  const r2 = simulate(p, { seed: 1, ticks: 600, inputScript: [{ tick: 0, control: 'right', pressed: true }] });
  assert.equal(r2.finalSnapshot.state, 'won');
  assert.equal(r2.trace.find(e => e.type === 'win').reason, 'reachedExit');
});

test('substep: 서로 마주 보고 빠르게(상대 20px/tick > 두 반지름 합 16) 움직여도 관통하지 않는다', () => {
  // 비껴 맞는 경우(가로 간격 14 → 겹치는 세로 구간 15.5px)가 한 tick 상대 이동 20px보다 짧다.
  // substep 없이 tick 끝에서만 검사하면 대부분 지나쳐 버린다.
  const make = px => prog([
    N('player', 'player', { appearance: 'p', x: px, y: 590, speed: 600, radius: 8, movement: 'fourWay' }),
    N('f', 'spawner', { entity: 'dot', appearance: 'd', pattern: 'fallFromTop', intervalMs: 10000, speed: 600, maxAlive: 1, count: 1, radius: 8 }),
    N('t', 'onTouch', { entity: 'dot', effects: [{ do: 'addScore', amount: 1 }, { do: 'removeOther' }] }),
    N('win', 'winWhen', { stat: 'score', value: 1 }),
  ]);
  for (let seed = 1; seed <= 12; seed++) {
    const probe = createGameRuntime(); probe.load(make(400), [], seed);
    const dotX = probe.snapshot().entities[1].x; probe.dispose();
    const r = simulate({ program: make(dotX + 14) }, { seed, ticks: 400, inputScript: [{ tick: 0, control: 'up', pressed: true }] });
    assert.equal(r.finalSnapshot.state, 'won', `seed ${seed}`);
    assert.equal(count(r.trace, 'miss'), 0);
  }
});

// ── RT05 ──
test('RT05: reset/pause/resume 100회 후에도 타이머가 쌓이지 않고, dispose 후 잔여 0·입력 무시', () => {
  const p = tpl('collect', { hazard: 'bomb' });
  const spawners = p.program.nodes.filter(n => n.kind === 'spawner').length;
  const rt = createGameRuntime();
  rt.load(p.program, p.assets, 1);
  for (let i = 0; i < 100; i++) {
    rt.input({ control: 'right', pressed: true });
    rt.step(16.7); rt.step(33.3);
    rt.pause();
    assert.equal(rt.debugStats().heldInputs, 0, 'pause가 입력을 해제');
    const t = rt.step(1000).tick;
    assert.equal(rt.step(16.7).tick, t, '일시정지 중에는 진행 안 함');
    rt.resume();
    rt.step(16.7);
    rt.reset(i);
    const st = rt.debugStats();
    assert.equal(st.timers, spawners);
    assert.equal(st.tick, 0);
    assert.equal(st.state, 'ready');
    assert.equal(st.heldInputs, 0);
  }
  rt.dispose();
  const st = rt.debugStats();
  assert.deepEqual([st.timers, st.handlers, st.entities, st.heldInputs, st.pendingEvents], [0, 0, 0, 0, 0]);
  rt.input({ control: 'left', pressed: true });
  assert.equal(rt.debugStats().heldInputs, 0);
  // 만들고 버리기 100회
  for (let i = 0; i < 100; i++) {
    const r = createGameRuntime();
    r.load(p.program, p.assets, i);
    r.step(50);
    r.dispose();
    assert.equal(r.debugStats().timers, 0);
  }
});

test('RT05: 끝난 게임(won/lost)은 입력·step을 무시한다, reset하면 처음부터 같은 결과', () => {
  const p = tpl('maze', { map: 'first' });
  const rt = createGameRuntime();
  rt.load(p.program, p.assets, 1);
  rt.input({ control: 'right', pressed: true });
  let s; for (let i = 0; i < 400 && (!s || s.state === 'playing' || s.state === 'ready'); i++) s = rt.step(TICK_MS);
  assert.equal(s.state, 'won');
  const t = s.tick;
  rt.input({ control: 'left', pressed: true });
  assert.equal(rt.debugStats().heldInputs, 0);
  assert.equal(rt.step(50).tick, t);
  rt.reset(1);
  const again = rt.snapshot();
  assert.equal(again.state, 'ready');
  assert.equal(again.tick, 0);
  rt.dispose();
});

// ── RT06 ──
test('RT06: 엔티티 폭주 → 로드 단계에서 halted + TOO_MANY_ENTITIES (자르지 않음)', () => {
  const nodes = [N('player', 'player', { appearance: 'p', x: 400, y: 300, speed: 200, radius: 20, movement: 'fourWay' }),
    N('win', 'winWhen', { stat: 'survivedSec', value: 10 })];
  for (let k = 0; k < 3; k++) {
    nodes.push(N(`s${k}`, 'spawner', { entity: `e${k}`, appearance: `e${k}.a`, pattern: 'scatter', intervalMs: 200, speed: 0, maxAlive: 30, count: 30, radius: 8 }));
    nodes.push(N(`t${k}`, 'onTouch', { entity: `e${k}`, effects: [{ do: 'addScore', amount: 1 }] }));
  }
  const rt = createGameRuntime();
  const d = rt.load(prog(nodes), [], 1);
  assert.ok(d.some(x => x.code === 'TOO_MANY_ENTITIES' && x.severity === 'error'));
  const s = rt.step(100);
  assert.equal(s.state, 'halted');
  assert.equal(s.tick, 0);
  assert.ok(s.diagnostics.some(x => x.code === 'TOO_MANY_ENTITIES'));
});

test('RT06: 실행 중 엔티티 상한 초과 → halted + ENTITY_LIMIT 진단·halt 이벤트, 이후 진행 없음', () => {
  const p = tpl('catch', { spawnEveryMs: 400, fallSpeed: 60 });
  const rt = createGameRuntime({ limits: { activeEntities: 3 } });
  rt.load(p.program, p.assets, 1);
  const events = [];
  let s;
  for (let i = 0; i < 400; i++) { s = rt.step(TICK_MS); events.push(...s.events); if (s.state !== 'playing') break; }
  assert.equal(s.state, 'halted');
  assert.ok(s.diagnostics.some(x => x.code === 'ENTITY_LIMIT'));
  assert.ok(events.some(e => e.type === 'halt' && e.code === 'ENTITY_LIMIT'));
  assert.equal(s.entities.length - 1, 3, '상한까지는 그대로, 넘는 순간 정지');
  const t = s.tick;
  assert.equal(rt.step(100).tick, t);
});

test('RT06: 큰 수치·NaN·핸들러 33개·tick당 명령 초과·점수 상한 → 모두 halted + 진단', () => {
  const base = () => catchGame().program;
  const load = (program, limits) => { const rt = createGameRuntime({ limits }); const d = rt.load(program, [], 1); return { rt, d }; };

  const big = base(); big.nodes[2].args.speed = 1e12;
  let { rt, d } = load(big);
  assert.ok(d.some(x => x.code === 'RUNTIME_NODE_INVALID'));
  assert.equal(rt.step(16.7).state, 'halted');

  const nan = base(); nan.nodes[1].args.x = NaN;
  ({ rt, d } = load(nan));
  assert.ok(d.some(x => x.code === 'RUNTIME_NODE_INVALID'));
  assert.equal(rt.step(16.7).state, 'halted');

  const many = base();
  for (let k = 0; k < 32; k++) { many.nodes.push(N(`t${k}`, 'onTouch', { entity: 'fish', effects: [{ do: 'addScore', amount: 1 }] })); many.entrypoints.push(`t${k}`); }
  ({ rt, d } = load(many));
  assert.ok(d.some(x => x.code === 'TOO_MANY_HANDLERS'));
  assert.equal(rt.step(16.7).state, 'halted');

  const p = tpl('collect', { gemCount: 20 });
  ({ rt } = load(p.program, { commandsPerTick: 10 }));
  let s = rt.step(TICK_MS);
  assert.equal(s.state, 'halted');
  assert.ok(s.diagnostics.some(x => x.code === 'COMMAND_LIMIT'));

  const q = tpl('collect', { gemCount: 10, goal: 50 });
  const rec = recordInputs(q, { seed: 2, ticks: 3000, limits: { maxScore: 3 }, policy: snap => {
    const me = snap.entities[0]; const g = snap.entities.find(e => e.entity === 'gem');
    return g ? { left: g.x < me.x - 4, right: g.x > me.x + 4, up: g.y < me.y - 4, down: g.y > me.y + 4 } : {};
  } });
  assert.equal(rec.result.finalSnapshot.state, 'halted');
  assert.ok(rec.result.finalSnapshot.diagnostics.some(x => x.code === 'SCORE_LIMIT'));
});

test('RT06: 공방이 아닌 프로그램·legacy만 있는 작품은 실행하지 않고 진단', () => {
  const rt = createGameRuntime();
  assert.ok(rt.load(goalCards().program, [], 1).some(x => x.code === 'RUNTIME_UNKNOWN_NODE'));
  assert.equal(rt.step(16.7).state, 'halted');
  const d = rt.load(legacyStudio().program, [], 1);
  assert.ok(d.some(x => x.code === 'RUNTIME_NOT_RUNNABLE'));
  assert.equal(rt.step(16.7).state, 'halted');
});

// ── RT07 ──
function runFrames(project, dt, frames, inputs) {
  const rt = createGameRuntime();
  rt.load(project.program, project.assets, 77);
  for (const ev of inputs) rt.input(ev);
  const byTick = new Map();
  const events = [];
  for (let i = 0; i < frames; i++) {
    const s = rt.step(dt);
    events.push(...s.events);
    byTick.set(s.tick, JSON.stringify({ state: s.state, score: s.score, lives: s.lives, entities: s.entities }));
  }
  rt.dispose();
  return { byTick, events };
}

test('RT07: 16.7ms×60 vs 33.3ms×30(×10초) — 같은 논리 tick에서 상태·이벤트 동일', () => {
  for (const p of [catchGame(), tpl('avoid', { spawnEveryMs: 300 }), tpl('collect')]) {
    const inputs = [{ control: 'right', pressed: true }, { control: 'down', pressed: true }];
    const a = runFrames(p, 16.7, 600, inputs);
    const b = runFrames(p, 33.3, 300, inputs);
    const c = runFrames(p, 1000 / 60, 600, inputs);
    const common = [...a.byTick.keys()].filter(t => b.byTick.has(t));
    assert.ok(common.length > 100, `공통 tick ${common.length}`);
    for (const t of common) assert.equal(a.byTick.get(t), b.byTick.get(t), `tick ${t}`);
    for (const t of common) if (c.byTick.has(t)) assert.equal(a.byTick.get(t), c.byTick.get(t));
    const upTo = Math.min(...[a, b].map(r => Math.max(...r.byTick.keys())));
    const ev = r => JSON.stringify(r.events.filter(e => e.tick <= upTo));
    assert.equal(ev(a), ev(b));
  }
});

test('RT07: 느린 프레임은 100ms까지만 누적, 한 step에 최대 5 tick (밀린 생성 폭탄 없음)', () => {
  const rt = createGameRuntime();
  const p = catchGame();
  rt.load(p.program, p.assets, 1);
  assert.equal(rt.step(5000).tick, 5);
  assert.equal(rt.step(100).tick, 10);
  assert.equal(rt.step(Infinity).tick, 10, 'Infinity/NaN은 0으로 취급');
  assert.equal(rt.step(NaN).tick, 10);
  // 같은 5 tick을 stepTicks로 진행한 것과 상태가 같다
  const r2 = createGameRuntime(); r2.load(p.program, p.assets, 1);
  const s2 = r2.stepTicks(10);
  const s1 = rt.snapshot();
  assert.equal(JSON.stringify(s1.entities), JSON.stringify(s2.entities));
});

// ── RT08 ──
test('RT08: 누른 동안만 이동, pressed:false·releaseAll·pause 즉시 멈춤, 반복 keydown은 속도에 영향 없음', () => {
  const p = catchGame();
  const speed = p.program.nodes[1].args.speed;
  const rt = createGameRuntime();
  rt.load(p.program, p.assets, 1);
  const x0 = rt.snapshot().entities[0].x;
  rt.input({ control: 'left', pressed: true });
  let s = rt.stepTicks(30);
  const x1 = s.entities[0].x;
  assert.ok(Math.abs((x0 - x1) - speed / 60 * 30) < 1e-6);
  // keydown 반복 10번 = 1번
  for (let k = 0; k < 10; k++) rt.input({ control: 'left', pressed: true });
  s = rt.stepTicks(10);
  assert.ok(Math.abs((x1 - s.entities[0].x) - speed / 60 * 10) < 1e-6);
  rt.input({ control: 'left', pressed: false });
  const x2 = rt.stepTicks(1).entities[0].x;
  assert.equal(rt.stepTicks(60).entities[0].x, x2, 'pressed:false 후 고착 없음');
  rt.input({ control: 'right', pressed: true });
  rt.releaseAll();   // blur / pointercancel
  assert.equal(rt.stepTicks(30).entities[0].x, x2);
  rt.input({ control: 'right', pressed: true });
  rt.pause(); rt.resume();
  assert.equal(rt.stepTicks(30).entities[0].x, x2, 'pause가 누름 상태를 해제');
  // horizontal 모드에서 up/down은 무시
  rt.input({ control: 'up', pressed: true });
  const y = rt.stepTicks(20).entities[0].y;
  assert.equal(y, p.program.nodes[1].args.y);
  rt.dispose();
});

// ── 계약 모양 ──
test('RuntimeSnapshot은 순수 데이터(JSON 왕복 동일)이고 이벤트에 tick 번호가 있다', () => {
  const p = catchGame();
  const r = simulate(p, { seed: 1, ticks: 300 });
  const s = r.finalSnapshot;
  assert.deepEqual(JSON.parse(JSON.stringify(s)), s);
  for (const k of ['tick', 'state', 'score', 'lives', 'elapsedMs', 'entities', 'events', 'diagnostics']) assert.ok(k in s, k);
  for (const e of r.trace) assert.ok(Number.isInteger(e.tick) && typeof e.type === 'string');
  for (const e of s.entities) for (const k of ['id', 'entity', 'x', 'y', 'r', 'slot']) assert.ok(k in e);
  assert.equal(s.elapsedMs, Math.floor(s.tick * 1000 / 60));
});

test('simulate: 잘못된 inputScript·ticks는 진단으로 보고', () => {
  const r = simulate(catchGame(), { ticks: 10, inputScript: [{ tick: -1, control: 'left', pressed: true }, { tick: 1, control: 'jump', pressed: true }] });
  assert.equal(r.diagnostics.filter(d => d.code === 'SIM_BAD_INPUT').length, 2);
  assert.ok(simulate(catchGame(), { ticks: 1e9 }).diagnostics.some(d => d.code === 'SIM_BAD_TICKS'));
});

// ── 성능 ──
test('성능: 활성 엔티티 80개에서 1 tick 처리시간 측정', t => {
  const nodes = [
    N('world', 'world', { background: 'bg.main', timeLimitSec: 0 }),
    N('player', 'player', { appearance: 'p', x: 400, y: 300, speed: 300, radius: 20, movement: 'fourWay' }),
    N('a', 'spawner', { entity: 'ea', appearance: 'ea.a', pattern: 'scatter', intervalMs: 200, speed: 240, maxAlive: 40, count: 40, radius: 10 }),
    N('b', 'spawner', { entity: 'eb', appearance: 'eb.a', pattern: 'scatter', intervalMs: 200, speed: 600, maxAlive: 40, count: 40, radius: 8 }),
    N('ta', 'onTouch', { entity: 'ea', effects: [{ do: 'addScore', amount: 1 }, { do: 'removeOther' }] }),
    N('tb', 'onTouch', { entity: 'eb', effects: [{ do: 'addScore', amount: 1 }, { do: 'removeOther' }] }),
    N('win', 'winWhen', { stat: 'score', value: 9999 }),
  ];
  const rt = createGameRuntime();
  assert.deepEqual(errors(rt.load(prog(nodes), [], 1)), []);
  rt.input({ control: 'right', pressed: true }); rt.input({ control: 'down', pressed: true });
  for (let i = 0; i < 120; i++) rt.step(TICK_MS); // 워밍업
  const times = [];
  let minEnt = Infinity;
  for (let i = 0; i < 1200; i++) {
    if (i % 90 === 0) { rt.input({ control: 'right', pressed: i % 180 === 0 }); rt.input({ control: 'left', pressed: i % 180 !== 0 }); }
    const t0 = performance.now();
    const s = rt.step(TICK_MS);
    times.push(performance.now() - t0);
    minEnt = Math.min(minEnt, s.entities.length - 1);
    assert.equal(s.state, 'playing');
  }
  times.sort((a, b) => a - b);
  const mean = times.reduce((a, b) => a + b, 0) / times.length;
  const p95 = times[Math.floor(times.length * 0.95)];
  t.diagnostic(`entities>=${minEnt} (80 max) step mean=${mean.toFixed(4)}ms p95=${p95.toFixed(4)}ms max=${times[times.length - 1].toFixed(3)}ms`);
  assert.ok(minEnt >= 70, `대부분 80 근처 유지 (${minEnt})`);
  assert.ok(p95 < 4, `p95 ${p95}ms < 4ms 실행 예산`);
  rt.dispose();
});
