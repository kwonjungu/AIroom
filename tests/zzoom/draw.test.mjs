// 디자인 3팀 단위 시험: node --test tests/zzoom/draw.test.mjs
// public/zzoom 은 브라우저 ES 모듈(.js)이라 package.json type 이 없는 이 저장소에서는 바로 import 할 수 없다.
// 임시 폴더에 type:module 로 복사해 불러온다. Path2D 는 기록용 가짜.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../public/zzoom');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'zzdraw-'));
fs.mkdirSync(path.join(tmp, 'vendor'));
fs.writeFileSync(path.join(tmp, 'package.json'), '{"type":"module"}');
for (const f of ['draw.js', 'board.js', 'vendor/perfect-freehand-1.2.3.mjs']) fs.copyFileSync(path.join(root, f), path.join(tmp, f));

class FakePath { constructor() { this.ops = []; } moveTo(...a) { this.ops.push(['M', ...a]); } quadraticCurveTo(...a) { this.ops.push(['Q', ...a]); } closePath() { this.ops.push(['Z']); } }
globalThis.Path2D = FakePath;
function fakeCtx() {
  const log = [];
  const c = { log, globalAlpha: 1, globalCompositeOperation: 'source-over', fillStyle: '', strokeStyle: '', lineWidth: 1 };
  for (const m of ['save', 'restore', 'fillRect', 'beginPath', 'rect', 'clip', 'moveTo', 'lineTo', 'stroke', 'setTransform']) c[m] = (...a) => log.push([m, ...a]);
  c.fill = p => log.push(['fill', p, c.globalAlpha, c.globalCompositeOperation, c.fillStyle]);
  return c;
}

const D = await import(pathToFileURL(path.join(tmp, 'draw.js')).href);
const B = await import(pathToFileURL(path.join(tmp, 'board.js')).href);

test('프리셋표: pen·hl 값이 설계 E 와 같다', () => {
  assert.deepEqual([D.PRESETS.pen.w, D.PRESETS.pen.thinning, D.PRESETS.pen.smoothing, D.PRESETS.pen.streamline], [0.004, 0.5, 0.5, 0.5]);
  assert.deepEqual([D.PRESETS.hl.w, D.PRESETS.hl.thinning, D.PRESETS.hl.smoothing, D.PRESETS.hl.streamline], [0.018, 0, 0.5, 0.6]);
  assert.equal(D.PRESETS.hl.alpha, 0.35);
  assert.equal(D.PRESETS.hl.op, 'multiply');
});

test('색 6개는 서버 PALETTE 와 같다', () => {
  assert.deepEqual(D.COLORS.hl.map(c => c.hex), ['#FFE14D', '#9BE15D', '#FF8AD8']);
  assert.deepEqual(D.COLORS.pen.map(c => c.hex), ['#E5484D', '#2F6FEB', '#1d1d1f']);
});

test('quantize: x·y 넷째 자리, p 둘째 자리, 0~1 로 자름', () => {
  assert.deepEqual(D.quantize(0.123456, 1.2, 0.876), [0.1235, 1, 0.88]);
  assert.deepEqual(D.quantize(-0.1, 0.5, -1), [0, 0.5, 0]);
});

test('좌표식: 화면 ↔ 쪽 비율 왕복(확대·이동·dpr 무관)', () => {
  const vp = { pageW: 1600, pageH: 1000, scale: 0.4375, ox: 37, oy: 12, dpr: 2 };
  for (const [x, y] of [[0, 0], [1, 1], [0.25, 0.75]]) {
    const [sx, sy] = D.toScreen(vp, x, y);
    const [bx, by] = D.toPage(vp, sx, sy);
    assert.ok(Math.abs(bx - x) < 1e-9 && Math.abs(by - y) < 1e-9);
  }
  assert.deepEqual(D.toScreen(vp, 1, 1), [37 + 700, 12 + 437.5]);
  const c = fakeCtx();
  D.applyViewport(c, vp);
  assert.deepEqual(c.log[0], ['setTransform', 0.875, 0, 0, 0.875, 74, 24]);
});

test('필압: 모두 0.5 면 흉내, 하나라도 다르면 펜 필압', () => {
  assert.equal(D.simulatesPressure([0, 0, 0.5, 1, 1, 0.5]), true);
  assert.equal(D.simulatesPressure([0, 0, 0.5, 1, 1, 0.7]), false);
  const o = D.strokeOptions({ tool: 'hl', w: 0.018, pts: [0, 0, 0.3, 1, 1, 0.6] }, 1600);
  assert.equal(o.size, 0.018 * 1600);
  assert.equal(o.thinning, 0);
  assert.equal(o.simulatePressure, false);
});

test('1,500점 나누기: 조각 끝점이 다음 조각 첫 점, 다시 합치면 원래 점', () => {
  const n = 3200, pts = [];
  for (let i = 0; i < n; i++) pts.push(i / n, 0.5, 0.5);
  const parts = D.splitPts(pts);
  assert.equal(parts.length, 3);
  assert.ok(parts.every(p => p.length / 3 <= 1500 && p.length % 3 === 0));
  assert.deepEqual(parts[1].slice(0, 3), parts[0].slice(-3));
  const merged = D.mergeGroups(parts.map((p, i) => ({ id: 's' + i, group: 'g1', part: i, cid: 'c1', pts: p, seq: i + 1 })).reverse());
  assert.equal(merged.length, 1);
  assert.deepEqual(merged[0].pts, pts);
  assert.deepEqual(merged[0].ids.sort(), ['s0', 's1', 's2']);
  assert.equal(D.splitPts([0, 0, 0.5, 1, 1, 0.5]).length, 1);
});

test('1,500점 나누기: 21조각을 넘는 점은 버림(서버 part 0~20)', () => {
  const pts = []; for (let i = 0; i < 40000; i++) pts.push(0.5, 0.5, 0.5);
  const parts = D.splitPts(pts);
  assert.equal(parts.length, 21);
  assert.ok(parts.every(p => p.length <= 4500));
});

test('mergeGroups: group 없는 선은 그대로, 순서 유지', () => {
  const out = D.mergeGroups([{ id: 'a', pts: [0, 0, .5, 1, 1, .5] }, { id: 'b', group: 'g', part: 0, pts: [0, 0, .5, .1, .1, .5] }, { id: 'c', pts: [0, 0, .5, 1, 1, .5] }]);
  assert.deepEqual(out.map(s => s.ids.join()), ['a', 'b', 'c']);
});

test('지우개 맞힘: 입력 점 사이 선분까지 반경 12px + 반 굵기', () => {
  const vp = { pageW: 1000, pageH: 1000, scale: 1, ox: 0, oy: 0, dpr: 1 };
  const s = { tool: 'pen', w: 0.004, pts: [0.1, 0.1, 0.5, 0.5, 0.1, 0.5] };   // (100,100)→(500,100), 굵기 4px
  assert.equal(D.hitStroke(s, vp, 300, 113), true);   // 13 ≤ 12+2
  assert.equal(D.hitStroke(s, vp, 300, 115), false);  // 15 > 14
  assert.equal(D.hitStroke(s, vp, 86, 100), true);    // 끝점 옆
  // 확대하면 화면 거리 기준이라 선 굵기는 화면 기준으로 커진다
  const vp2 = { ...vp, scale: 2 };
  assert.equal(D.hitStroke(s, vp2, 600, 217), false); // 17 > 12+4(확대로 굵기도 2배)
  assert.equal(D.hitStroke(s, vp2, 600, 215), true);
});

test('renderStroke: 한 획을 한 번 채움, 형광펜은 0.35·multiply, 캐시는 같은 Path2D', () => {
  const c = fakeCtx();
  const hl = { tool: 'hl', color: '#FFE14D', w: 0.018, pts: [0.1, 0.1, 0.5, 0.3, 0.2, 0.5, 0.6, 0.4, 0.5] };
  D.renderStroke(c, hl, 1600, 1000, { cacheKey: 'x1' });
  D.renderStroke(c, hl, 1600, 1000, { cacheKey: 'x1', alpha: 0.3 });
  const fills = c.log.filter(l => l[0] === 'fill');
  assert.equal(fills.length, 2);
  assert.equal(fills[0][2], 0.35); assert.equal(fills[0][3], 'multiply'); assert.equal(fills[0][4], '#FFE14D');
  assert.ok(Math.abs(fills[1][2] - 0.105) < 1e-9);
  assert.equal(fills[0][1], fills[1][1]);              // 캐시
  assert.ok(fills[0][1].ops.length > 10);
  // 그린 뒤 ctx 상태는 되돌린다
  assert.equal(c.log.filter(l => l[0] === 'save').length, c.log.filter(l => l[0] === 'restore').length);
  const p = fakeCtx();
  D.renderStroke(p, { tool: 'pen', color: '#E5484D', w: 0.004, pts: [0.1, 0.1, 0.5, 0.2, 0.2, 0.5] }, 1600, 1000);
  const f = p.log.find(l => l[0] === 'fill');
  assert.equal(f[2], 1); assert.equal(f[3], 'source-over');
});

test('renderStroke: 외곽선은 쪽 px 좌표(기기·배율 무관하게 같은 모양)', () => {
  const s = { tool: 'pen', color: '#1d1d1f', w: 0.004, pts: [0.1, 0.1, 0.5, 0.5, 0.5, 0.5, 0.9, 0.2, 0.5] };
  const a = fakeCtx(), b = fakeCtx();
  D.renderStroke(a, s, 1600, 1000);
  D.renderStroke(b, s, 1600, 1000);
  assert.deepEqual(a.log.find(l => l[0] === 'fill')[1].ops, b.log.find(l => l[0] === 'fill')[1].ops);
  const xs = a.log.find(l => l[0] === 'fill')[1].ops.filter(o => o[0] !== 'Z').map(o => o[1]);
  assert.ok(Math.min(...xs) > 150 && Math.max(...xs) < 1450);
});

test('paintBoardBackground: 흰 바탕은 칠만, 모눈·줄은 선을 그림, 크기 0 이면 아무것도 안 함', () => {
  const w = fakeCtx(); B.paintBoardBackground(w, { x: 10, y: 20, w: 800, h: 500 }, 'white');
  assert.deepEqual(w.log.find(l => l[0] === 'fillRect'), ['fillRect', 10, 20, 800, 500]);
  assert.equal(w.log.filter(l => l[0] === 'stroke').length, 0);
  const g = fakeCtx(); B.paintBoardBackground(g, { x: 0, y: 0, w: 1600, h: 1000 }, 'grid');
  assert.equal(g.log.filter(l => l[0] === 'moveTo').length, 31 + 19 + 6 + 3);
  const l = fakeCtx(); B.paintBoardBackground(l, { x: 0, y: 0, w: 1600, h: 1000 }, 'lines');
  assert.ok(l.log.filter(x => x[0] === 'moveTo').length >= 14);
  const z = fakeCtx(); B.paintBoardBackground(z, { x: 0, y: 0, w: 0, h: 10 }, 'grid');
  assert.equal(z.log.length, 0);
  assert.equal(g.log.filter(x => x[0] === 'save').length, g.log.filter(x => x[0] === 'restore').length);
});

test('모듈 모양: css·mount 내보냄', () => {
  assert.equal(D.css, 'draw.css');
  assert.equal(typeof D.mount, 'function');
  assert.equal(typeof B.mount, 'function');
  assert.equal(B.BOARD_W / B.BOARD_H, 1.6);
});

test('백오프: 1·2·4·8·16초에서 멈춤, 구독은 지금 쪽 하나(LRU 는 api.js)', () => {
  assert.deepEqual([1, 2, 3, 4, 5, 6, 9].map(D.backoff), [1000, 2000, 4000, 8000, 16000, 16000, 16000]);
  assert.equal(D.RETRY.tries, 6);
  assert.equal(D.PAGE_LRU, 1);
});

test('pageStrokesSource: subscribePageStrokes 가 있으면 그대로(인자 2개·3개 모두)', () => {
  const got = [];
  const api2 = { subscribePageStrokes(k, cb) { got.push(['2', k]); cb([{ id: 'a', seq: 1 }]); return () => got.push(['off']); } };
  const off = D.pageStrokesSource(api2, 'm1')('p_1', l => got.push(['cb', l.length]));
  off();
  assert.deepEqual(got, [['2', 'p_1'], ['cb', 1], ['off']]);
  const api3 = { subscribePageStrokes(mid, k, cb) { got.push([mid, k]); return () => {}; } };
  D.pageStrokesSource(api3, 'm1')('p_2', () => {});
  assert.deepEqual(got.at(-1), ['m1', 'p_2']);
});

test('pageStrokesSource 어댑터: 옛 두 구독을 합쳐 현재 epoch 만, seq 순으로', () => {
  let sCb, eCb, offs = 0;
  const api = { subscribeStrokes(m, k, cb) { sCb = cb; return () => offs++; }, subscribePageEpoch(m, k, cb) { eCb = cb; return () => offs++; } };
  const out = [];
  const off = D.pageStrokesSource(api, 'm1')('p_1', l => out.push(l.map(s => s.id)));
  sCb([{ id: 'b', seq: 3, epoch: 1 }, { id: 'old', seq: 1, epoch: 0 }, { id: 'a', seq: 2, epoch: 1 }]);
  assert.equal(out.length, 0);                    // epoch 를 알기 전에는 안 줌
  eCb(1);
  assert.deepEqual(out.at(-1), ['a', 'b']);
  eCb(2);
  assert.deepEqual(out.at(-1), []);               // 쪽 지우기
  off();
  assert.equal(offs, 2);
});

test('pageStrokesSource: subscribePageStrokes 가 있으면 그대로(2인자·3인자 모두)', () => {
  const calls = [];
  const a2 = { subscribePageStrokes(pageKey, cb) { calls.push(['2', pageKey]); cb([]); return () => calls.push(['off']); } };
  const off = D.pageStrokesSource(a2, 'm1')('p_1', () => calls.push(['cb']));
  off();
  const a3 = { subscribePageStrokes(mid, pageKey, cb) { calls.push(['3', mid, pageKey]); return () => {}; } };
  D.pageStrokesSource(a3, 'm1')('p_2', () => {});
  assert.deepEqual(calls, [['2', 'p_1'], ['cb'], ['off'], ['3', 'm1', 'p_2']]);
});

test('pageStrokesSource 어댑터: 옛 함수 두 개로 현재 epoch 선만 seq 순', () => {
  let sCb, eCb, offs = 0;
  const api = {
    subscribeStrokes(mid, k, cb) { sCb = cb; return () => offs++; },
    subscribePageEpoch(mid, k, cb) { eCb = cb; return () => offs++; },
  };
  const got = [];
  const off = D.pageStrokesSource(api, 'm1')('p_1', l => got.push(l.map(s => s.id)));
  sCb([{ id: 'b', seq: 3, epoch: 1 }, { id: 'old', seq: 1, epoch: 0 }, { id: 'a', seq: 2, epoch: 1 }]);
  assert.equal(got.length, 0);                 // epoch 를 알기 전에는 안 줌
  eCb(1);
  assert.deepEqual(got.at(-1), ['a', 'b']);
  eCb(2);
  assert.deepEqual(got.at(-1), []);            // 쪽 지우기 뒤
  off();
  assert.equal(offs, 2);
});
