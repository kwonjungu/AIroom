// WP8 엔진 — 파서 진단(미지원·미닫힘), v1 원문 호환, 실행 trace·리셋 결정성, 재생기 타이머, 칠하기 보간, 화면 맞춤.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseTurtle, runTurtle, sceneAt, fitView, boundsOf, headingName } from '../../../public/vibe-v2/modes/learning/engines/turtle.js';
import { parsePixel, runPixel, runEvent, createGridCursor } from '../../../public/vibe-v2/modes/learning/engines/pixel.js';
import { parseMaze, runMaze, mazeStateAt } from '../../../public/vibe-v2/modes/learning/engines/maze.js';
import { diagLine } from '../../../public/vibe-v2/modes/learning/engines/common.js';
import { createPlayer } from '../../../public/vibe-v2/modes/learning/player.js';
import { cellsBetween, createStroke, paintToSource, cellAt } from '../../../public/vibe-v2/modes/learning/paint.js';
import { validate } from '../../../public/vibe-v2/shared/contracts/validate.js';
import { DiagnosticSchema } from '../../../public/vibe-v2/shared/contracts/schemas.js';
import { MAZE_MISSIONS } from '../../../public/vibe-v2/modes/learning/missions/maze.js';

const codes = d => d.map(x => `${x.code}@${diagLine(x)}`);
const errs = d => d.filter(x => x.severity === 'error');

// ── 파서 진단 ──
test('거북이: 모르는 줄·빠진 숫자·닫히지 않은 반복·짝 없는 } 를 줄 번호로 진단 (v1은 조용히 버림)', () => {
  const src = 'FORWARD 100\n앞으로 가\nRIGHT\nREPEAT 4 {\nFORWARD 10\n';
  const p = parseTurtle(src);
  assert.deepEqual(codes(errs(p.diagnostics)).sort(), ['MISSING_NUMBER@3', 'UNCLOSED_BLOCK@4', 'UNKNOWN_COMMAND@2'].sort());
  assert.deepEqual(codes(parseTurtle('FORWARD 10\n}\nLEFT 90').diagnostics), ['UNEXPECTED_CLOSE@2']);
  assert.deepEqual(codes(parseTurtle('forward 10').diagnostics), ['LOWERCASE_COMMAND@1']);
  assert.deepEqual(codes(parseTurtle('FORWARD 100 RIGHT 90').diagnostics), ['EXTRA_TOKENS@1']);
  assert.deepEqual(codes(parseTurtle('CALL 없는함수').diagnostics), ['UNKNOWN_FUNCTION@1']);
  assert.deepEqual(codes(parseTurtle('REPEAT 500 {\nFORWARD 1\n}').diagnostics), ['REPEAT_CLAMPED@1']);
  for (const d of p.diagnostics) assert.deepEqual(validate(DiagnosticSchema, d), [], '진단은 계약 모양');
});

test('거북이: v1 문법 호환 — 괄호 다음 줄, DEF/CALL, 주석, 장식 명령', () => {
  const src = 'DEF 네모 {\nREPEAT 4\n{\nFORWARD 50\nRIGHT 90\n}\n}\n// 주석\nPEN_COLOR #ff0000\nCALL 네모\nSAY 안녕\nSTAMP ⭐\nBG #112233\nCIRCLE 20\nJUMP 30\nHOME\nPEN_UP\nPEN_DOWN\nPEN_SIZE 5\nBACKWARD 10\nCLEAR';
  const p = parseTurtle(src);
  assert.deepEqual(p.diagnostics, []);
  const t = runTurtle(p.commands);
  assert.equal(t.steps.filter(s => s.seg).length, 5); // 네모 4변 + BACKWARD
  assert.equal(t.bg, '#112233');
  assert.equal(sceneAt(t, t.steps.length - 1).segs.length, 0, 'CLEAR 뒤에는 선이 없다');
});

test('픽셀: 미지원 토큰·빠진 인자·고아 ELSE·미닫힘·정의 안 된 변수', () => {
  assert.deepEqual(codes(parsePixel('LED_ON 3').diagnostics), ['BAD_ARGUMENT@1']);
  assert.deepEqual(codes(parsePixel('LED_ON 1 1\n불 켜 #줘').diagnostics), ['UNKNOWN_COMMAND@2']);
  assert.deepEqual(codes(parsePixel('REPEAT 3 {\nLED_ON 1 1').diagnostics), ['UNCLOSED_BLOCK@1']);
  assert.deepEqual(codes(parsePixel('ELSE { LED_ON 1 1 }').diagnostics), ['ORPHAN_ELSE@1']);
  assert.deepEqual(codes(parsePixel('LED_ON x 1').diagnostics), ['UNKNOWN_VARIABLE@1']);
  assert.deepEqual(codes(parsePixel('}\nLED_ON 1 1').diagnostics), ['UNEXPECTED_CLOSE@1']);
  // v1 호환: 한 줄에 붙인 명령, #RGB, FOR 변수, DEF 안 변수는 호출 지점 FOR로 해석
  const ok = parsePixel('REPEAT 2 { LED_ON 1 1 } FILL_ROW 2 #f00\nDEF 점 {\nLED_ON i 3\n}\nFOR i 1 5 {\nCALL 점\n}');
  assert.deepEqual(ok.diagnostics, []);
  const g = runPixel(ok.commands, { size: 5 }).grid;
  assert.equal(g[1][0], '#ff0000');
  assert.ok([0, 1, 2, 3, 4].every(x => g[2][x]));
});

test('미로: 미지원·IF 뒤 WALL 없음·미닫힘, MOVE n 관용 표기', () => {
  assert.deepEqual(codes(parseMaze('MOVE\n점프').diagnostics), ['UNKNOWN_COMMAND@2']);
  assert.deepEqual(codes(parseMaze('IF GEM { MOVE }').diagnostics).includes('BAD_ARGUMENT@1'), true);
  assert.deepEqual(codes(parseMaze('REPEAT 3 {\nMOVE').diagnostics), ['UNCLOSED_BLOCK@1']);
  assert.equal(parseMaze('MOVE 3').commands.length, 3);
  assert.deepEqual(parseMaze('REPEAT 5 { MOVE }').diagnostics, []);
});

// ── 실행·결정성 ──
test('거북이 trace: 줄 번호·반복 회차·방향, 두 번 실행해도 같다', () => {
  const src = 'REPEAT 4 {\nFORWARD 100\nRIGHT 90\n}';
  const a = runTurtle(parseTurtle(src).commands), b = runTurtle(parseTurtle(src).commands);
  assert.deepEqual(a, b);
  assert.equal(a.steps.length, 8);
  assert.deepEqual(a.steps.map(s => s.line), [2, 3, 2, 3, 2, 3, 2, 3]);
  assert.deepEqual(a.steps[5].loops, [{ line: 1, iter: 3, count: 4 }]);
  assert.equal(a.final.heading, 0);
  assert.equal(headingName(90), '오른쪽');
  assert.ok(Math.abs(a.steps[0].to.y + 100) < 1e-9, '위로 100');
});

test('거북이: 5000단계 초과는 실행 전 진단(v1 MAX_STEPS)', () => {
  const t = runTurtle(parseTurtle('REPEAT 100 {\nREPEAT 100 {\nFORWARD 1\n}\n}').commands);
  assert.equal(t.overflow, true);
  assert.equal(t.diagnostics[0].code, 'TOO_MANY_STEPS');
});

test('픽셀 trace: BLINK는 마지막에 켜진 채, 커서 앞뒤 이동이 처음부터 계산과 같다', () => {
  const tr = runPixel(parsePixel('LED_ON 1 1\nBLINK 3 3 2\nWAIT 100\nLED_OFF 1 1').commands, { size: 5 });
  assert.deepEqual(tr.steps.map(s => s.type), ['LED_ON', 'BLINK', 'BLINK', 'BLINK', 'WAIT', 'LED_OFF']);
  assert.deepEqual(tr.steps.map(s => s.ms), [0, 200, 200, 200, 100, 0]);
  assert.ok(tr.grid[2][2]);
  const cur = createGridCursor(tr);
  const g3 = JSON.stringify(cur.seek(3));
  cur.seek(5); cur.seek(0);
  assert.equal(JSON.stringify(cur.seek(3)), g3, '뒤로 갔다 다시 와도 같은 격자');
  assert.equal(JSON.stringify(cur.seek(5)), JSON.stringify(tr.grid));
});

test('픽셀 이벤트: 버튼 A/B·IF BUTTON 분기·흔들기', () => {
  const base = runPixel(parsePixel('ON_BUTTON_A {\nIF BUTTON_A {\nLED_ON 1 1\n} ELSE {\nLED_ON 5 5\n}\n}\nON_SHAKE {\nCLEAR_ALL\n}').commands, { size: 5 });
  const a = runEvent(base, 'A', { size: 5 });
  assert.ok(a.grid[0][0] && !a.grid[4][4]);
  const s = runEvent(a, 'SHAKE', { size: 5 });
  assert.equal(s.grid.flat().filter(Boolean).length, 0);
  assert.equal(runEvent(base, 'B', { size: 5 }), null, '핸들러 없는 버튼은 아무것도 안 함');
});

test('미로 리셋 결정성: 같은 코드 10회 실행 trace 동일, 상태 되감기 일치, 충돌 위치 기록', () => {
  const m = MAZE_MISSIONS.find(x => x.legacyId === 12);
  const cmds = parseMaze(m.answers[0]).commands;
  const first = JSON.stringify(runMaze(cmds, m));
  for (let k = 0; k < 10; k++) assert.equal(JSON.stringify(runMaze(cmds, m)), first);
  const tr = runMaze(cmds, m);
  const mid = Math.floor(tr.steps.length / 2);
  const s = mazeStateAt(m, tr, mid);
  assert.deepEqual({ r: s.r, c: s.c, dir: s.dir }, { r: tr.steps[mid].r, c: tr.steps[mid].c, dir: tr.steps[mid].dir });
  assert.deepEqual(mazeStateAt(m, tr, -1), mazeStateAt(m, runMaze(cmds, m), -1));
  const bump = runMaze(parseMaze('MOVE\nTURN_LEFT\nMOVE').commands, MAZE_MISSIONS[0]);
  assert.equal(bump.result, 'bump');
  assert.deepEqual({ r: bump.bump.r, c: bump.bump.c, line: bump.bump.line, dir: bump.bump.dir }, { r: 0, c: 2, line: 3, dir: 'up' });
});

// ── 재생기 ──
function fakeClock() {
  let now = 0; const q = new Map(); let id = 0;
  return {
    schedule(fn, ms) { const k = ++id; q.set(k, { fn, at: now + ms }); return k; },
    cancel(k) { q.delete(k); },
    advance(ms) {
      const end = now + ms;
      for (;;) {
        let next = null;
        for (const [k, v] of q) if (v.at <= end && (!next || v.at < next[1].at)) next = [k, v];
        if (!next) break;
        q.delete(next[0]); now = next[1].at; next[1].fn();
      }
      now = end;
    },
    get size() { return q.size; },
  };
}

test('재생기: 한 단계·일시정지·리셋이 결정적이고, 빠른 재실행에도 예약 타이머는 1개 이하(v1 pixelAnimCancel 순서 버그 방지)', () => {
  const clk = fakeClock();
  const seen = [];
  const p = createPlayer({ length: 5, delayOf: () => 100, schedule: clk.schedule, cancel: clk.cancel, onStep: i => seen.push(i) });
  p.play();
  assert.deepEqual(seen, [0]);
  clk.advance(250);
  assert.deepEqual(seen, [0, 1, 2]);
  p.pause(); clk.advance(1000);
  assert.deepEqual(seen, [0, 1, 2], '멈춘 동안 진행 없음');
  assert.equal(clk.size, 0);
  p.step(); assert.equal(p.index, 3);
  p.reset(); assert.equal(p.index, -1);
  // 연타: play → reset → play → play
  seen.length = 0;
  p.play(); p.reset(); p.play(); p.play();
  assert.ok(clk.size <= 1, '예약 타이머는 하나뿐');
  clk.advance(10000);
  assert.deepEqual(seen, [0, -1, 0, 1, 2, 3, 4], '이전 실행이 섞이지 않는다');
  assert.equal(p.done, true);
  assert.equal(clk.size, 0);
  p.reset(); p.play(); p.dispose();
  assert.equal(clk.size, 0, 'dispose 후 남은 타이머 0');
  clk.advance(1000);
});

test('재생기: 같은 입력으로 두 번 재생하면 단계 순서·시간이 같다', () => {
  const run = () => { const clk = fakeClock(); const log = []; let t = 0; const p = createPlayer({ length: 4, delayOf: i => 50 * (i + 1), schedule: (f, ms) => clk.schedule(() => { t += ms; f(); }, ms), cancel: clk.cancel, onStep: i => log.push([i, t]) }); p.play(); clk.advance(1000); return log; };
  assert.deepEqual(run(), run());
});

// ── 칠하기 ──
test('칠하기 보간: 빠른 드래그로 칸을 건너뛰어도 누락 0, 같은 칸 중복 0', () => {
  const line = cellsBetween({ x: 0, y: 0 }, { x: 7, y: 3 });
  for (let i = 1; i < line.length; i++) assert.ok(Math.abs(line[i].x - line[i - 1].x) <= 1 && Math.abs(line[i].y - line[i - 1].y) <= 1, '이웃 칸으로만 이동');
  assert.deepEqual(line.at(-1), { x: 7, y: 3 });
  const s = createStroke();
  const L = { ox: 20, oy: 20, cell: 50, n: 8 };
  const pts = [[25, 25], [30, 26], [380, 26], [381, 30], [40, 25]]; // 한 줄을 휙 긋고 되돌아옴
  let got = [];
  for (const [x, y] of pts) got = got.concat(s.add(cellAt(x, y, L)));
  assert.equal(got.length, 8, '0~7 모두 한 번씩');
  assert.equal(new Set(got.map(c => c.x + ',' + c.y)).size, got.length);
  assert.equal(cellAt(5, 5, L), null);
});

test('칠한 칸 → DSL 줄: 이미 켜진 칸은 건너뛰고, 색이 다르면 LED_COLOR, 지우기는 LED_OFF', () => {
  const grid = [[null, '#FF0000'], [null, null]];
  const r = paintToSource('LED_ON 2 1', [{ x: 0, y: 0 }, { x: 1, y: 0 }], 'paint', '#FF0000', grid, '#FF0000');
  assert.deepEqual(r.lines, ['LED_ON 1 1']);
  assert.equal(r.source, 'LED_ON 2 1\nLED_ON 1 1');
  assert.deepEqual(paintToSource('', [{ x: 1, y: 1 }], 'paint', '#0099FF', grid, '#FF0000').lines, ['LED_COLOR 2 2 #0099FF']);
  assert.deepEqual(paintToSource('X', [{ x: 1, y: 0 }, { x: 0, y: 1 }], 'erase', '#FF0000', grid, '#FF0000').lines, ['LED_OFF 2 1']);
  const out = paintToSource('', [{ x: 0, y: 0 }], 'paint', '#FF0000', [[null]], '#FF0000').source;
  assert.deepEqual(parsePixel(out).diagnostics, [], '만든 줄은 파서가 그대로 읽는다');
});

// ── 거북이 화면 맞춤 ──
test('화면 맞춤: 기본 1:1 가운데 원점(v1), 화면 밖 선은 모두 들어오게 축소, 고스트와 같은 변환', () => {
  const small = fitView({ minX: 0, minY: -100, maxX: 100, maxY: 0 }, 600, 400);
  assert.equal(small.scale, 1);
  assert.deepEqual(small.toScreen(0, 0), { x: 300, y: 200 });
  const big = runTurtle(parseTurtle('FORWARD 400\nRIGHT 90\nFORWARD 900').commands);
  const segs = sceneAt(big, big.steps.length - 1).segs;
  const v = fitView(boundsOf(segs), 600, 400);
  assert.ok(v.fitted && v.scale < 1);
  for (const s of segs) for (const [x, y] of [[s.x1, s.y1], [s.x2, s.y2]]) {
    const p = v.toScreen(x, y);
    assert.ok(p.x >= 0 && p.x <= 600 && p.y >= 0 && p.y <= 400, `(${x},${y}) 화면 안`);
    const w = v.toWorld(p.x, p.y);
    assert.ok(Math.abs(w.x - x) < 1e-6 && Math.abs(w.y - y) < 1e-6, '왕복 좌표 일치');
  }
  // 무대가 커져도(확대) 모든 선이 화면 안이고 왕복 좌표가 같다
  const v2 = fitView(boundsOf(segs), 1200, 800);
  for (const s of segs) { const p = v2.toScreen(s.x2, s.y2); assert.ok(p.x >= 0 && p.x <= 1200 && p.y >= 0 && p.y <= 800); const w = v2.toWorld(p.x, p.y); assert.ok(Math.abs(w.x - s.x2) < 1e-6); }
});
