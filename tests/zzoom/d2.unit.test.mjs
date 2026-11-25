// D2 보기·따라가기 순수 계산 시험. node --test tests/zzoom/d2.unit.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  pageSize, fitScale, clampView, layout, screenToPage, zoomAt, anchorView, panBy, roundView, sameView, stepPage, BOARD_W, BOARD_H,
} from '../../public/zzoom/viewer.js';

const near = (a, b, e = 1e-6) => assert.ok(Math.abs(a - b) < e, `${a} ≈ ${b}`);
const G = { stageW: 1000, stageH: 600, pageW: 1000, pageH: 1414, pad: 16 };

test('pageSize: {w,h}·[w,h]·board·없음', () => {
  assert.deepEqual(pageSize({ sizes: [{ w: 10, h: 20 }] }, 1), { w: 10, h: 20 });
  assert.deepEqual(pageSize({ sizes: [[30, 40], [50, 60]] }, 2), { w: 50, h: 60 });
  assert.deepEqual(pageSize({ kind: 'board' }, 3), { w: BOARD_W, h: BOARD_H });
  assert.equal(pageSize({ sizes: [] }, 1), null);
  assert.equal(pageSize(null, 1), null);
  assert.equal(pageSize({ sizes: [[0, 10]] }, 1), null);
});

test('fitScale: 여백 안에 쪽 전체가 들어감', () => {
  const s = fitScale(G);
  near(s, (600 - 32) / 1414);
  assert.ok(1000 * s <= 1000 - 32 + 1e-9 && 1414 * s <= 600 - 32 + 1e-9);
});

test('clampView: z 1~6, 쪽이 작으면 가운데, 크면 가장자리 고정', () => {
  assert.deepEqual(clampView({ cx: 0.1, cy: 0.9, z: 0.3 }, G), { cx: 0.5, cy: 0.5, z: 1 });
  assert.equal(clampView({ cx: 0.5, cy: 0.5, z: 99 }, G).z, 6);
  const v = clampView({ cx: 0, cy: 0, z: 6 }, G);
  const L = layout(v, G);
  near(L.ox, 0, 1e-6); near(L.oy, 0, 1e-6);       // 왼쪽 위 모서리가 화면 모서리에 딱 붙음
  const v2 = clampView({ cx: 1, cy: 1, z: 6 }, G);
  const L2 = layout(v2, G);
  near(L2.ox + G.pageW * L2.scale, G.stageW, 1e-6);
  near(L2.oy + G.pageH * L2.scale, G.stageH, 1e-6);
  assert.deepEqual(clampView({ cx: 'x', cy: undefined, z: null }, G), { cx: 0.5, cy: 0.5, z: 1 });
});

test('layout: 약속 4절 식 — 중심점이 화면 가운데', () => {
  const v = { cx: 0.3, cy: 0.7, z: 3 };
  const L = layout(v, G);
  near(L.ox + 0.3 * G.pageW * L.scale, G.stageW / 2);
  near(L.oy + 0.7 * G.pageH * L.scale, G.stageH / 2);
});

test('screenToPage 는 layout 의 역', () => {
  const v = clampView({ cx: 0.4, cy: 0.6, z: 2.5 }, G);
  const L = layout(v, G);
  const p = screenToPage(L.ox + 0.25 * G.pageW * L.scale, L.oy + 0.8 * G.pageH * L.scale, v, G);
  near(p.x, 0.25); near(p.y, 0.8);
});

test('zoomAt: 손가락 아래 점이 그대로 머묾(clamp 안 걸릴 때)', () => {
  const v0 = clampView({ cx: 0.5, cy: 0.5, z: 2 }, G);
  const sx = 520, sy = 310;
  const before = screenToPage(sx, sy, v0, G);
  const v1 = zoomAt(v0, G, sx, sy, 3);
  const after = screenToPage(sx, sy, v1, G);
  near(before.x, after.x, 1e-9); near(before.y, after.y, 1e-9);
  assert.equal(v1.z, 3);
});

test('anchorView: 두 손가락 가운데가 쪽 점을 따라감', () => {
  const p = { x: 0.5, y: 0.4 };
  const v = anchorView(G, p, 480, 280, 4);
  const q = screenToPage(480, 280, v, G);
  near(q.x, 0.5, 1e-9); near(q.y, 0.4, 1e-9);
});

test('panBy: 끌기만큼 이동, 맞춤 상태에서는 그대로', () => {
  const fit = { cx: 0.5, cy: 0.5, z: 1 };
  assert.deepEqual(panBy(fit, G, 200, 200), fit);
  const v = clampView({ cx: 0.5, cy: 0.5, z: 3 }, G);
  const L0 = layout(v, G);
  const v2 = panBy(v, G, 30, -20);
  const L1 = layout(v2, G);
  near(L1.ox - L0.ox, 30, 1e-6); near(L1.oy - L0.oy, -20, 1e-6);
});

test('다른 비율 기기: 같은 live view 를 기기마다 clamp', () => {
  const tablet = { stageW: 800, stageH: 1100, pageW: 1000, pageH: 1414 };
  const v = clampView({ cx: 0.05, cy: 0.5, z: 2 }, tablet);
  assert.ok(v.cx > 0.05 && v.cx <= 0.5);
});

test('roundView·sameView', () => {
  assert.deepEqual(roundView({ cx: 0.123456, cy: 0.98765, z: 2.34567 }), { cx: 0.1235, cy: 0.9877, z: 2.346 });
  assert.ok(sameView({ cx: 0.5, cy: 0.5, z: 1 }, { cx: 0.5004, cy: 0.5, z: 1 }));
  assert.ok(!sameView({ cx: 0.5, cy: 0.5, z: 1 }, { cx: 0.6, cy: 0.5, z: 1 }));
});

test('stepPage: 안건 경계를 넘고 끝에서 멈춤', () => {
  const ag = [{ aid: 'a', pages: 2 }, { aid: 'b', pages: 3 }];
  assert.deepEqual(stepPage(ag, 'a', 1, 1), { aid: 'a', page: 2 });
  assert.deepEqual(stepPage(ag, 'a', 2, 1), { aid: 'b', page: 1 });
  assert.deepEqual(stepPage(ag, 'b', 1, -1), { aid: 'a', page: 2 });
  assert.equal(stepPage(ag, 'b', 3, 1), null);
  assert.equal(stepPage(ag, 'a', 1, -1), null);
  assert.equal(stepPage(ag, 'zz', 1, 1), null);
});
