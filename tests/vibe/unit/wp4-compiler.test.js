// WP4 컴파일러: V2 의미 검증 + RT02 구 DSL 엄격 파서·변환.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkStudioSemantics } from '../../../public/vibe-v2/shared/compiler/semantic.js';
import { parseLegacyStudio, legacyToProject } from '../../../public/vibe-v2/shared/compiler/legacy-dsl.js';
import { mazeLayout, mazePath } from '../../../public/vibe-v2/shared/compiler/maze.js';
import { catchGame, legacyStudio } from '../../../public/vibe-v2/shared/contracts/fixtures.js';
import { validateProject, DiagnosticSchema } from '../../../public/vibe-v2/shared/contracts/schemas.js';
import { validate } from '../../../public/vibe-v2/shared/contracts/validate.js';
import { simulate } from '../../../public/vibe-v2/shared/runtime/simulate.js';

const errors = d => d.filter(x => x.severity === 'error');
const codes = d => d.map(x => x.code);
const N = (id, kind, args) => ({ id, kind, args, children: [] });
const withNodes = (mut) => { const p = catchGame(); mut(p.program.nodes, p); p.program.entrypoints = p.program.nodes.map(n => n.id); return p; };
const assertDiagShape = ds => { for (const d of ds) assert.deepEqual(validate(DiagnosticSchema, d), [], JSON.stringify(d)); };

// ── V2 의미 검증 ──
test('V2: catchGame fixture는 의미 오류 없음', () => {
  const d = checkStudioSemantics(catchGame());
  assert.deepEqual(errors(d), []);
  assertDiagShape(d);
});

test('V2: onTouch가 없는 spawner entity를 가리키면 오류(노드·경로 포함)', () => {
  const p = withNodes(ns => { ns.find(n => n.id === 'touch-fish').args.entity = 'fsh'; });
  const d = errors(checkStudioSemantics(p)).find(x => x.code === 'TOUCH_UNKNOWN_ENTITY');
  assert.ok(d);
  assert.equal(d.nodeId, 'touch-fish');
  assert.match(d.path, /^\$\.program\.nodes\[\d+\]\.args\.entity$/);
  assert.ok(d.studentHint.length > 0 && d.studentHint.length <= 120);
});

test('V2: player 필수·종료 조건 필수·loseLife는 목숨 필요·timeUp은 제한 시간 필요', () => {
  assert.ok(codes(checkStudioSemantics(withNodes(ns => ns.splice(ns.findIndex(n => n.kind === 'player'), 1)))).includes('PLAYER_MISSING'));
  assert.ok(codes(checkStudioSemantics(withNodes(ns => { for (const k of ['winWhen', 'loseWhen']) ns.splice(ns.findIndex(n => n.kind === k), 1); }))).includes('NO_END_CONDITION'));
  assert.ok(codes(errors(checkStudioSemantics(withNodes(ns => ns.find(n => n.id === 'touch-fish').args.effects.push({ do: 'loseLife' }))))).includes('LOSE_LIFE_WITHOUT_LIVES'));
  assert.ok(codes(errors(checkStudioSemantics(withNodes(ns => { ns.find(n => n.kind === 'world').args.timeLimitSec = 0; })))).includes('TIME_UP_WITHOUT_LIMIT'));
  assert.ok(codes(errors(checkStudioSemantics(withNodes(ns => ns.push(N('l2', 'loseWhen', { stat: 'livesZero' })))))).includes('LIVES_RULE_WITHOUT_LIVES'));
  assert.ok(codes(errors(checkStudioSemantics(withNodes(ns => { ns.find(n => n.id === 'touch-fish').args.effects = [{ do: 'removeOther' }]; })))).includes('SCORE_UNREACHABLE'));
  assert.ok(codes(errors(checkStudioSemantics(withNodes(ns => { ns.find(n => n.id === 'fish-fall').args.speed = 0; })))).includes('FALL_SPEED_ZERO'));
  // onTouch의 win 효과만으로도 종료 조건 성립
  const onlyTouchWin = withNodes(ns => { for (const k of ['winWhen', 'loseWhen']) ns.splice(ns.findIndex(n => n.kind === k), 1); ns.find(n => n.id === 'touch-fish').args.effects = [{ do: 'win' }]; });
  assert.ok(!codes(checkStudioSemantics(onlyTouchWin)).includes('NO_END_CONDITION'));
});

test('V2: 버티기 시간이 제한 시간보다 길면(timeUp 있을 때) 이길 수 없음', () => {
  const p = withNodes(ns => { ns.find(n => n.kind === 'winWhen').args = { stat: 'survivedSec', value: 90 }; ns.find(n => n.id === 'touch-fish').args.effects = [{ do: 'removeOther' }]; });
  assert.ok(codes(errors(checkStudioSemantics(p))).includes('SURVIVE_AFTER_TIME_UP'));
});

test('V2: reachedExit는 mazeMap 필요, 미로는 S·G·행 길이·경로(BFS)·주인공 크기 검사', () => {
  const noMaze = withNodes(ns => { ns.find(n => n.kind === 'winWhen').args = { stat: 'reachedExit', value: 0 }; });
  assert.ok(codes(errors(checkStudioSemantics(noMaze))).includes('EXIT_WITHOUT_MAZE'));
  const maze = rows => withNodes(ns => {
    ns.find(n => n.kind === 'winWhen').args = { stat: 'reachedExit', value: 0 };
    ns.push(N('maze', 'mazeMap', { rows }));
    const pl = ns.find(n => n.kind === 'player'); pl.args.movement = 'fourWay'; pl.args.radius = 20;
  });
  assert.deepEqual(errors(checkStudioSemantics(maze(['#####', '#S.G#', '#####']))).map(d => d.code), []);
  assert.ok(codes(checkStudioSemantics(maze(['#####', '#S.G', '#####']))).includes('MAZE_ROW_LENGTH'));
  assert.ok(codes(checkStudioSemantics(maze(['#####', '#..G#', '#####']))).includes('MAZE_START_MISSING'));
  assert.ok(codes(checkStudioSemantics(maze(['#####', '#S..#', '#####']))).includes('MAZE_GOAL_MISSING'));
  assert.ok(codes(checkStudioSemantics(maze(['#####', '#S#G#', '#####']))).includes('MAZE_NO_PATH'));
  assert.ok(codes(checkStudioSemantics(maze(['#####', '#SSG#', '#####']))).includes('MAZE_START_DUPLICATED'));
  const big = maze(['#####', '#S.G#', '#####']); big.program.nodes.find(n => n.kind === 'player').args.radius = 80;
  assert.ok(codes(errors(checkStudioSemantics(big))).includes('MAZE_PLAYER_TOO_BIG'));
  // 좌우 이동만 되는 주인공은 세로 경로를 못 간다
  const vert = maze(['###', '#S#', '#.#', '#G#', '###']); vert.program.nodes.find(n => n.kind === 'player').args.movement = 'horizontal';
  assert.ok(codes(errors(checkStudioSemantics(vert))).includes('MAZE_NO_PATH'));
});

test('V2: 자원 예산(엔티티 80·핸들러 32)을 넘는 설계는 오류', () => {
  const p = withNodes(ns => { for (let k = 0; k < 3; k++) ns.push(N(`s${k}`, 'spawner', { entity: 'fish', appearance: 'fish.appearance', pattern: 'scatter', intervalMs: 500, speed: 0, maxAlive: 30, count: 30, radius: 10 })); });
  assert.ok(codes(errors(checkStudioSemantics(p))).includes('TOO_MANY_ENTITIES'));
  const q = withNodes(ns => { for (let k = 0; k < 32; k++) ns.push(N(`t${k}`, 'onTouch', { entity: 'fish', effects: [{ do: 'addScore', amount: 1 }] })); });
  assert.ok(codes(errors(checkStudioSemantics(q))).includes('TOO_MANY_HANDLERS'));
});

test('V2: legacySource만 있는 작품은 경고(실행은 v1 어댑터 몫)', () => {
  const d = checkStudioSemantics(legacyStudio());
  assert.deepEqual(codes(d), ['LEGACY_ONLY']);
  assert.equal(d[0].severity, 'warning');
});

test('maze BFS: v1 MAZE_MISSIONS 맵 경로 길이', () => {
  const L = mazeLayout(['########', '#S.....#', '######.#', '###G##.#', '###....#', '########']);
  const path = mazePath(L);
  assert.equal(path.length, 13); // 오른쪽 5 + 아래 3 + 왼쪽 3 + 위 1 + 출발 칸
  assert.deepEqual(path[0], { c: 1, r: 1 });
  assert.deepEqual(path.at(-1), { c: 3, r: 3 });
});

// ── RT02: 구 DSL 엄격 파서 ──
const at = (ds, code) => ds.filter(d => d.code === code).map(d => d.path);

test('RT02: 모르는 명령·지원하지 않는 명령 → 줄 번호가 있는 오류 (조용히 버리지 않음)', () => {
  const { ast, diagnostics } = parseLegacyStudio('PLAYER 🐱 200 250\nFLY 3\n\nWAIT 100\nSPRITE 🐱 1 2');
  assert.deepEqual(at(diagnostics, 'LEGACY_UNKNOWN_COMMAND'), ['line:2', 'line:5']);
  assert.deepEqual(at(diagnostics, 'LEGACY_UNSUPPORTED_COMMAND'), ['line:4']);
  assert.equal(ast.length, 1);
  assertDiagShape(diagnostics);
});

test('RT02: 닫히지 않은 블록 → 여는 줄 위치 오류, 짝 없는 } → 그 줄 오류', () => {
  const a = parseLegacyStudio('PLAYER 🐱 200 250\nON_KEY LEFT {\n  MOVE_X -10\nEVERY 500 {\n  SCORE 1\n}');
  assert.deepEqual(at(a.diagnostics, 'LEGACY_UNCLOSED_BLOCK'), ['line:2']);
  const b = parseLegacyStudio('SCORE 1\n}\nEND_WIN');
  assert.deepEqual(at(b.diagnostics, 'LEGACY_UNEXPECTED_CLOSE'), ['line:2']);
  assert.equal(b.ast.length, 2);
});

test('RT02: 중첩 깊이 8 초과 → 초과가 시작된 줄에 오류, 8단계까지는 정상', () => {
  const nest = n => Array.from({ length: n }, () => 'REPEAT 2 {').join('\n') + '\nSCORE 1\n' + '}\n'.repeat(n);
  const ok = parseLegacyStudio(nest(8));
  assert.deepEqual(errors(ok.diagnostics), []);
  let d = ok.ast[0], depth = 1; while (d.body[0].type === 'REPEAT') { d = d.body[0]; depth++; }
  assert.equal(depth, 8);
  const deep = parseLegacyStudio(nest(9));
  assert.deepEqual(at(deep.diagnostics, 'LEGACY_TOO_DEEP'), ['line:9']);
});

test('RT02: 이벤트 블록 중첩·고아 ELSE·잘못된 인자·중괄호 누락 → 위치 오류', () => {
  const src = [
    'ON_KEY UP {',           // 1
    '  ON_TOUCH 🍎 { SCORE 1 }', // 2  이벤트 안 이벤트
    '}',                     // 3
    'ELSE { SAY x }',        // 4  고아 ELSE
    'SET 1abc 3',            // 5  잘못된 변수 이름
    'IF a >> 3 {',           // 6  잘못된 조건
    '}',                     // 7
    'ON_START',              // 8  { 누락
    'SCORE 2',               // 9
    '}',                     // 10
  ].join('\n');
  const { ast, diagnostics } = parseLegacyStudio(src);
  assert.deepEqual(at(diagnostics, 'LEGACY_NESTED_EVENT'), ['line:2']);
  assert.deepEqual(at(diagnostics, 'LEGACY_ORPHAN_ELSE'), ['line:4']);
  assert.deepEqual(at(diagnostics, 'LEGACY_BAD_ARGUMENT'), ['line:5', 'line:6']);
  assert.deepEqual(at(diagnostics, 'LEGACY_MISSING_BRACE'), ['line:8']);
  assert.equal(ast[0].type, 'ON_KEY');
  assert.equal(ast[0].body.length, 0, '중첩 이벤트는 AST에 넣지 않되 진단으로 알린다');
});

test('RT02: v1 한 줄 표기·ELSE·FOREVER·값 보정은 v1과 같게 읽고 보정은 경고', () => {
  const { ast, diagnostics } = parseLegacyStudio('ON_KEY UP { MOVE_Y -20 }\nIF 점수 > 3 {\nSAY 좋아\n} ELSE {\nSAY 힘내\n}\nFOREVER { MOVE_ALL 🍎 0 2 }\nEVERY 10 { SCORE 1 }\nREPEAT 500 { SCORE 1 }');
  assert.deepEqual(errors(diagnostics), []);
  assert.deepEqual(ast.map(c => c.type), ['ON_KEY', 'IF', 'EVERY', 'EVERY', 'REPEAT']);
  assert.equal(ast[1].elseBody.length, 1);
  assert.equal(ast[2].forever, true);
  assert.equal(ast[3].ms, 50);
  assert.equal(ast[4].count, 100);
  assert.deepEqual(at(diagnostics, 'LEGACY_VALUE_CLAMPED'), ['line:8', 'line:9']);
  assert.ok(ast.every(c => Number.isInteger(c.line)));
});

// ── legacyToProject ──
const V1_EXAMPLE = `PLAYER 🐢 200 260
BG #0d3b66
SET 목숨 3
SHOW_VAR 목숨
ON_KEY LEFT { MOVE_X -20 }
ON_KEY RIGHT { MOVE_X 20 }
EVERY 1000 { SPAWN_RANDOM 🍎 }
EVERY 2000 { SPAWN_RANDOM 💣 }
EVERY 100 { MOVE_ALL 🍎 0 5
MOVE_ALL 💣 0 7 }
ON_TOUCH 🍎 { SCORE 1
REMOVE }
ON_TOUCH 💣 { CHANGE 목숨 -1
REMOVE }
ON_VAR 목숨 <= 0 { END_LOSE }
ON_SCORE 10 { END_WIN }`;

test('legacyToProject: v1 시스템 프롬프트 예제(사과+목숨)를 studio-2 노드로 변환, 원문 보존, 실행 가능', () => {
  const r = legacyToProject(V1_EXAMPLE, { now: '2026-09-26T00:00:00.000Z', title: '사과 받기' });
  assert.equal(r.converted, true);
  assert.deepEqual(errors(r.diagnostics), []);
  assert.deepEqual(errors(validateProject(r.project)), []);
  const byId = Object.fromEntries(r.project.program.nodes.map(n => [n.id, n]));
  assert.equal(byId['apple-fall'].args.speed, 100);   // 5px/100ms × 2배 = 100px/s
  assert.equal(byId['bomb-fall'].args.speed, 140);
  assert.equal(byId['apple-fall'].args.intervalMs, 1000);
  assert.deepEqual(byId['touch-bomb'].args.effects, [{ do: 'loseLife' }, { do: 'removeOther' }]);
  assert.equal(byId.stats.args.lives, 3);
  assert.deepEqual([byId.win.args, byId.lose.args], [{ stat: 'score', value: 10 }, { stat: 'livesZero' }]);
  assert.equal(byId.player.args.x, 400);
  assert.equal(byId['legacy-src'].args.source, V1_EXAMPLE, '원문 보존');
  assert.equal(r.original, V1_EXAMPLE);
  assert.equal(r.project.engineVersion, 'studio-2');
  const sim = simulate(r.project, { seed: 1, ticks: 600 });
  assert.ok(['playing', 'won', 'lost'].includes(sim.finalSnapshot.state));
  assert.ok(sim.trace.some(e => e.type === 'spawn'));
});

test('legacyToProject: 변환 못 하는 규칙은 legacySource에 남기고 LEGACY_PARTIAL 경고(줄 번호)', () => {
  const src = V1_EXAMPLE + '\nIF PLAYER_X > 300 {\nSAY 오른쪽\n}\nON_TOUCH ⭐ { SAY 반짝 }';
  const r = legacyToProject(src, { now: '2026-09-26T00:00:00.000Z' });
  const partial = r.diagnostics.find(d => d.code === 'LEGACY_PARTIAL');
  assert.ok(partial);
  assert.match(partial.message, /17/);
  assert.match(partial.message, /20/);
  assert.equal(partial.severity, 'warning');
  assert.ok(r.project.program.nodes.some(n => n.kind === 'legacySource' && n.args.source === src));
});

test('legacyToProject: 주인공이 없으면 원문만 보관(legacy-1), fixture legacyStudio 원문도 진단과 함께 보존', () => {
  const src = legacyStudio().program.nodes[0].args.source;
  const r = legacyToProject(src, { now: '2026-09-26T00:00:00.000Z' });
  assert.equal(r.converted, false);
  assert.equal(r.project.engineVersion, 'legacy-1');
  assert.deepEqual(r.project.program.nodes.map(n => n.kind), ['legacySource']);
  assert.equal(r.project.program.nodes[0].args.source, src);
  assert.ok(r.diagnostics.some(d => d.code === 'LEGACY_UNKNOWN_COMMAND' && d.path === 'line:1'), 'SPRITE는 v1 문법에도 없다');
  assert.deepEqual(errors(validateProject(r.project)), []);
  assertDiagShape(r.diagnostics);
});

test('legacyToProject: 빈 입력·20000자 초과도 원문 보존', () => {
  const empty = legacyToProject('', { now: '2026-09-26T00:00:00.000Z' });
  assert.equal(empty.original, '');
  const long = 'PLAYER 🐱 1 1\n' + 'SAY 가\n'.repeat(4000);
  const r = legacyToProject(long, { now: '2026-09-26T00:00:00.000Z' });
  assert.equal(r.original, long);
  assert.ok(r.diagnostics.some(d => d.code === 'LEGACY_SOURCE_TOO_LONG'));
});
