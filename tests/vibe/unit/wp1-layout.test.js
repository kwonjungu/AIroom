import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decideLayout, visiblePanes, PANEL_MIN } from '../../../public/vibe-v2/ui/layout-rules.js';

const L = (width, height, grade = 'mid') => decideLayout({ width, height, grade }).layout;

test('README §5 기준 기기별 배치', () => {
  assert.equal(L(1440, 900), 'three', '넓고 높은 화면은 3열');
  assert.equal(L(1920, 1080), 'three');
  assert.equal(L(1366, 768), 'two', '크롬북 1366×768은 2열');
  assert.equal(L(1280, 720), 'two', '높이가 모자라면 3열 금지');
  assert.equal(L(1024, 768), 'two', '태블릿 가로 1024');
  assert.equal(L(1180, 820), 'two', 'iPad Air 가로');
  assert.equal(L(768, 1024), 'stack', '태블릿 세로');
  assert.equal(L(820, 1180), 'stack');
  assert.equal(L(390, 844), 'tabs', '휴대폰 보조');
  assert.equal(L(0, 0), 'tabs');
  // 데스크톱 스크롤바(약 15px)가 컨테이너 폭을 줄여도 같은 구간을 유지
  assert.equal(L(768 - 15, 1024), 'stack');
  assert.equal(L(1024 - 15, 768), 'two');
  assert.equal(L(1280 - 15, 900), 'three');
});

test('패널 실제 폭이 최소 폭에 못 미치면 한 단계 낮춘다', () => {
  const d = decideLayout({ width: 1440, height: 900, grade: 'mid' });
  assert.ok(d.panels.assist >= PANEL_MIN.base.assist);
  // 가로 900 태블릿: 2열에서 무대가 최소 폭 미만이면 stack
  const narrow = decideLayout({ width: 880, height: 600, grade: 'low' });
  assert.ok(narrow.layout === 'stack' || narrow.panels.stage >= PANEL_MIN.low.stage);
  // 저학년은 최소 폭이 더 커서 같은 폭에서도 3열이 덜 나온다
  for (let w = 1280; w <= 1600; w += 10) {
    const lo = decideLayout({ width: w, height: 900, grade: 'low' });
    if (lo.layout === 'three') {
      assert.ok(lo.panels.stage >= PANEL_MIN.low.stage && lo.panels.editor >= PANEL_MIN.low.editor && lo.panels.assist >= PANEL_MIN.low.assist, 'w=' + w);
    }
  }
});

test('200% 확대(CSS 폭 절반)는 좁은 배치로 떨어진다', () => {
  assert.equal(L(683, 384), 'tabs');
  assert.equal(L(700, 450), 'tabs');
});

test('작은 높이에서는 문서 스크롤(flow), 충분하면 화면 맞춤(viewport)', () => {
  assert.equal(decideLayout({ width: 1366, height: 768 }).fit, 'viewport');
  assert.equal(decideLayout({ width: 1366, height: 500 }).fit, 'flow');
  assert.equal(decideLayout({ width: 768, height: 1024 }).fit, 'flow');
});

test('폭이 커질수록 배치는 단조롭게 넓어진다 (tabs→stack→two→three)', () => {
  const rank = { tabs: 0, stack: 1, two: 2, three: 3 };
  for (const h of [700, 900]) {
    let prev = -1;
    for (let w = 300; w <= 2000; w += 4) {
      const r = rank[L(w, h)];
      assert.ok(r >= prev, `w=${w} h=${h}`);
      prev = r;
    }
  }
});

test('보이는 패널: 탭 선택은 배치가 바뀌어도 유지', () => {
  assert.deepEqual(visiblePanes('three', { pane: 'assist' }), { stage: true, editor: true, assist: true, tabs: [] });
  const two = visiblePanes('two', { pane: 'assist' });
  assert.equal(two.stage, true); assert.equal(two.assist, true); assert.equal(two.editor, false);
  const tabs = visiblePanes('tabs', { pane: 'assist' });
  assert.deepEqual([tabs.stage, tabs.editor, tabs.assist], [false, false, true]);
  // 좁은 화면에서 '무대' 탭을 골랐다가 넓어지면 편집을 보여준다
  const back = visiblePanes('two', { pane: 'stage' });
  assert.equal(back.editor, true);
  // 어떤 배치든 최소 한 패널은 보인다
  for (const lay of ['three', 'two', 'stack', 'tabs']) for (const pane of ['stage', 'editor', 'assist']) {
    const v = visiblePanes(lay, { pane });
    assert.ok(v.stage || v.editor || v.assist);
  }
});
