// WP2 도형 겹치기 채점기 — SH01~SH04.
// 기대값은 미션 의미(목표 도형·학습 조건)와 손으로 계산한 기하에서 나온다. 채점기 출력을 복사하지 않는다.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SHAPE_MISSIONS, getShapeMission } from '../../../public/vibe-v2/modes/cards/missions/shape.js';
import { scoreShape, colorRaster, pixelPercent, rasterize } from '../../../public/vibe-v2/modes/cards/shape-score.js';

const GRAY = '#90A4AE'; // 어느 목표에도 쓰이지 않는 색
const asNodes = stamps => stamps.map((a, i) => ({ id: 's' + (i + 1), kind: 'stamp', args: { ...a }, children: [] }));
const permute = (arr, order) => order.map(i => arr[i]);

test('미션 데이터: v1 12개 + 새 2개, 모든 목표·카드는 계약 범위 안', () => {
  assert.equal(SHAPE_MISSIONS.length, 14);
  for (let n = 1; n <= 12; n++) assert.ok(getShapeMission('shape-' + n), 'v1 미션 shape-' + n + ' 보존');
  for (const m of SHAPE_MISSIONS) {
    assert.ok(['order', 'overlap', 'anchor', 'color', 'size'].includes(m.concept), m.id);
    assert.ok(m.hint && m.success && m.description, m.id + ' 문구');
    for (const s of [...m.target, ...m.cards]) {
      assert.ok(['circle', 'rect', 'tri', 'rhombus'].includes(s.shape));
      assert.ok(s.anchor >= 1 && s.anchor <= 9);
      assert.match(s.color, /^#[0-9A-F]{6}$/);
      assert.ok(['S', 'M', 'L'].includes(s.size));
    }
  }
  // README §6.1: 처음 3개는 도형 수·색 고정(카드 상자 = 목표와 같은 도형 묶음), 순서만 다르다
  for (const m of SHAPE_MISSIONS.slice(0, 3)) {
    assert.equal(m.palette, 'fixed'); assert.deepEqual(m.editable, []); assert.equal(m.concept, 'order');
    const key = s => JSON.stringify(s);
    assert.deepEqual(m.cards.map(key).sort(), m.target.map(key).sort(), m.id);
  }
  assert.equal(SHAPE_MISSIONS[0].conceptDemo, true, '첫 미션에서 "나중 카드가 위를 덮는다"를 보여 준다');
});

test('SH01: 모든 미션에서 빈 작품은 0점·완료 불가', () => {
  for (const m of SHAPE_MISSIONS) {
    const r = scoreShape([], m);
    assert.equal(r.percent, 0, m.id);
    assert.equal(r.complete, false, m.id);
    assert.ok(r.studentHint.length > 0);
  }
});

test('SH01 회귀: v1 방식(배경 포함 전체 표본)은 빈 집 짓기에 75% 넘게 주지만 새 채점은 0%', () => {
  const m = getShapeMission('shape-1');
  // v1 compareShapeCanvas 재현: 전체 칸 중 색이 같은 칸 비율(배경끼리도 일치로 셈)
  const a = colorRaster([], 40), b = colorRaster(m.target, 40);
  const v1Like = a.filter((c, i) => c === b[i]).length / a.length * 100;
  assert.ok(v1Like > 75, `v1식 점수 ${v1Like.toFixed(1)}% — 배포에서 본 79.9%와 같은 결함`);
  assert.equal(pixelPercent([], m.target), 0);
  assert.equal(scoreShape([], m).percent, 0);
});

test('SH02: 모든 미션의 목표 그대로 = 100%·완료 (args 배열·노드 배열 모두)', () => {
  for (const m of SHAPE_MISSIONS) {
    for (const input of [m.target, asNodes(m.target)]) {
      const r = scoreShape(input, m);
      assert.equal(r.percent, 100, m.id);
      assert.equal(r.complete, true, m.id);
      assert.deepEqual(r.differences, []);
    }
  }
});

test('SH02: 색 표기(소문자)와 표본 해상도가 달라도 정답은 정답 (안티앨리어싱 탈락 없음)', () => {
  for (const m of SHAPE_MISSIONS) {
    const lower = m.target.map(s => ({ ...s, color: s.color.toLowerCase() }));
    assert.equal(scoreShape(lower, m).complete, true, m.id);
    for (const g of [30, 60, 120, 240]) assert.equal(pixelPercent(m.target, m.target, g), 100);
  }
});

test('SH03: 필요한 도형이 빠지면 완료 거부 + 빠진 도형 힌트', () => {
  for (const m of SHAPE_MISSIONS) {
    m.target.forEach((_, i) => {
      const student = asNodes(m.target.filter((__, k) => k !== i));
      const r = scoreShape(student, m);
      assert.equal(r.complete, false, `${m.id} #${i} 누락`);
      assert.ok(r.differences.some(d => d.kind === 'missing' && d.targetIndex === i), `${m.id} #${i}`);
    });
  }
});

test('SH03: 완전히 가려진 도형(꽃의 작은 꽃잎)은 그림이 같아도 빠지면 구분한다', () => {
  const m = getShapeMission('shape-8');
  // 큰 빨강 마름모 위의 중간 빨강 마름모는 같은 색이라 보이지 않는다 → 빼도 그림은 같다
  const without = m.target.filter((_, k) => k !== 2);
  assert.equal(pixelPercent(without, m.target), 100);
  const r = scoreShape(without, m);
  assert.equal(r.complete, false);
  assert.deepEqual(r.differences.map(d => [d.kind, d.targetIndex]), [['missing', 2]]);
  // 미션이 requireHidden:false로 허용하면 완료
  assert.equal(scoreShape(without, { ...m, accept: { ...m.accept, requireHidden: false } }).complete, true);
});

test('SH03: 색이 다르면 완료 거부 + 그 카드에 색 힌트', () => {
  for (const m of SHAPE_MISSIONS) {
    m.target.forEach((t, i) => {
      const student = asNodes(m.target.map((s, k) => (k === i ? { ...s, color: GRAY } : s)));
      const r = scoreShape(student, m);
      assert.equal(r.complete, false, `${m.id} #${i}`);
      const d = r.differences.find(x => x.kind === 'color');
      assert.ok(d, `${m.id} #${i} color diff`);
      assert.equal(d.targetIndex, i); assert.equal(d.nodeId, 's' + (i + 1));
    });
  }
});

test('SH03: 위치가 다르면 완료 거부 + 위치 힌트', () => {
  for (const m of SHAPE_MISSIONS) {
    m.target.forEach((t, i) => {
      const moved = t.anchor === 1 ? 9 : 1; // 모든 목표에 1·9 칸 도형은 없다
      const r = scoreShape(asNodes(m.target.map((s, k) => (k === i ? { ...s, anchor: moved } : s))), m);
      assert.equal(r.complete, false, `${m.id} #${i}`);
      assert.ok(r.differences.some(d => d.kind === 'anchor' && d.targetIndex === i && d.nodeId === 's' + (i + 1)), `${m.id} #${i}`);
    });
  }
});

test('SH03: 크기가 다르면 완료 거부 + 크기 힌트', () => {
  for (const m of SHAPE_MISSIONS) {
    m.target.forEach((t, i) => {
      const size = t.size === 'S' ? 'L' : 'S';
      const r = scoreShape(asNodes(m.target.map((s, k) => (k === i ? { ...s, size } : s))), m);
      assert.equal(r.complete, false, `${m.id} #${i}`);
      assert.ok(r.differences.some(d => d.kind === 'size' && d.targetIndex === i), `${m.id} #${i}`);
    });
  }
});

test('SH03: 필요한 앞뒤 관계를 뒤집으면 완료 거부 + "나중에 찍어" 힌트가 그 카드에', () => {
  for (const m of SHAPE_MISSIONS) {
    for (const [a, b] of m.accept.orderMatters) {
      const order = m.target.map((_, k) => k);
      order[a] = b; order[b] = a;
      const nodes = asNodes(m.target);
      const r = scoreShape(permute(nodes, order), m);
      assert.equal(r.complete, false, `${m.id} ${a}<->${b}`);
      const d = r.differences.find(x => x.kind === 'order' && x.targetIndex === b);
      assert.ok(d, `${m.id} order diff for #${b}`);
      assert.equal(d.nodeId, 's' + (b + 1), '힌트는 나중에 찍어야 할 카드에 붙는다');
      assert.match(r.studentHint, /나중에/);
    }
  }
});

test('SH03: 집 짓기 순서 반대 → 사용자 예시 문구', () => {
  const m = getShapeMission('shape-1');
  const r = scoreShape(m.cards, m); // 시작 카드 상자 순서 = 세모, 네모
  assert.equal(r.complete, false);
  assert.equal(r.studentHint, '네모는 잘 놓았어. 세모를 나중에 찍어 볼까?');
  assert.ok(r.percent > 0 && r.percent < 100);
});

test('SH03: 필요 없는 도형이 더 있으면 완료 거부', () => {
  for (const m of SHAPE_MISSIONS) {
    const extra = { shape: 'circle', anchor: 1, color: GRAY, size: 'S' };
    const r = scoreShape(asNodes([...m.target, extra]), m);
    assert.equal(r.complete, false, m.id);
    assert.ok(r.differences.some(d => d.kind === 'extra' && d.nodeId === 's' + (m.target.length + 1)));
  }
});

// SH04 — 안 겹치는(또는 같은 색끼리만 겹치는) 도형의 순서 교환은 같은 그림 → 동등 정답.
// 기하(논리 360, 칸 중심 60/180/300, 반지름 L75·M56·S37)로 손 계산한 쌍만 쓴다.
const EQUIVALENT = {
  // 가운데 눈(S, y143~217)과 위쪽 눈(S, y23~97)은 안 겹침. 위쪽 눈은 얼굴(L, y105~255)과도 안 겹침.
  'shape-5': [[0, 2, 1], [2, 0, 1]],
  // 큰·중간 빨강 마름모는 같은 색. 줄기(S 네모 @8, y263~337)는 꽃잎(L 마름모 @5, 아래 꼭짓점 y255)과 안 겹침.
  'shape-8': [[0, 2, 1, 3], [1, 0, 2, 3], [1, 2, 0, 3]],
  'shape-12': [[0, 2, 1, 3], [1, 2, 0, 3]],
  // 빨강 머리(M 세모 @5, y124~236)와 주황 불꽃(M 세모 @8, y244~356)은 안 겹침.
  'shape-7': [[0, 2, 1]],
  'shape-11': [[0, 2, 1]],
  // 흰 몸통·흰 얼굴은 같은 색. 코(S 세모 @5)는 몸통(L 원 @8, 위 끝 y225)과 안 겹침.
  'shape-13': [[1, 0, 2]],
  // 파랑 꼬리(M 세모 @4)는 몸통(L 마름모 @5, 왼쪽 꼭짓점 x105)과 안 겹침.
  'shape-14': [[2, 0, 1], [0, 2, 1]],
};

test('SH04: 서로 안 겹치는 카드 순서 교환은 동등 정답(100%·완료)', () => {
  for (const [id, orders] of Object.entries(EQUIVALENT)) {
    const m = getShapeMission(id);
    for (const order of orders) {
      const r = scoreShape(permute(asNodes(m.target), order), m);
      assert.equal(r.percent, 100, `${id} ${order}`);
      assert.equal(r.complete, true, `${id} ${order} ${JSON.stringify(r.differences)}`);
    }
  }
});

test('SH04 반례: 겹치는 도형 순서를 바꿔 그림이 달라지면 동등 정답이 아니다 (사과: 사과 → 잎)', () => {
  const m = getShapeMission('shape-6');
  // 잎(M 세모 @2, y4~116)이 사과(L 원 @5, 위 끝 y105)와 y105~116에서 조금 겹친다
  const r = scoreShape(permute(asNodes(m.target), [1, 0, 2]), m);
  assert.equal(r.complete, false);
  assert.ok(r.percent < 100);
});

test('채점기는 순수 함수: 입력을 바꾸지 않고 같은 입력에 같은 결과', () => {
  const m = getShapeMission('shape-4');
  const input = asNodes(m.cards);
  const snap = JSON.stringify(input);
  const r1 = scoreShape(input, m), r2 = scoreShape(input, m);
  assert.deepEqual(r1, r2);
  assert.equal(JSON.stringify(input), snap);
  assert.equal(rasterize(m.target).length, 120 * 120);
});
