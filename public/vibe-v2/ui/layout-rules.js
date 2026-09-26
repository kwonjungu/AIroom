// 작업 화면 배치 판정 (순수 함수). README §5 표를 코드로 옮긴 것.
// 화면 크기만이 아니라 "각 패널이 실제로 받을 폭"이 최소 폭을 넘는지로 판단한다.

/** 패널 최소 폭(px). 저학년은 조작이 커서 더 넓게 잡는다. */
export const PANEL_MIN = Object.freeze({
  base: Object.freeze({ stage: 360, editor: 320, assist: 260 }),
  low: Object.freeze({ stage: 400, editor: 360, assist: 280 }),
});
export const LAYOUT_GAP = 16;       // 패널 사이
export const LAYOUT_PAD = 16;       // 좌우 여백(한쪽)
// 폭 기준은 "작업 화면 컨테이너 폭"이다. 데스크톱 스크롤바 자리(최대 약 20px)를 빼고도 README 기기 구간에 맞도록 잡았다.
export const THREE_MIN_WIDTH = 1260;  // README: 1280px 이상
export const TWO_MIN_WIDTH = 1000;    // README: 1024px 이상
export const STACK_MIN_WIDTH = 720;   // README: 768px 이상
export const THREE_MIN_HEIGHT = 800; // 1366×768 크롬북은 2열로 떨어지도록
export const FIT_MIN_HEIGHT = 600;   // 이보다 낮으면 문서 세로 스크롤 허용

/**
 * @param {{width:number, height:number, grade?:'low'|'mid'|'high'}} v  width = 작업 화면 컨테이너 실제 폭, height = 보이는 높이
 * @returns {{layout:'three'|'two'|'stack'|'tabs', fit:'viewport'|'flow', panels:{stage:number, editor:number, assist:number}}}
 *   panels = 해당 배치에서 각 패널이 받게 될 폭(숨은 패널은 0이 아닌 편집 영역 폭)
 */
export function decideLayout({ width, height, grade = 'mid' }) {
  const min = grade === 'low' ? PANEL_MIN.low : PANEL_MIN.base;
  const w = Math.max(0, Number(width) || 0);
  const h = Math.max(0, Number(height) || 0);

  // 3열: 무대 5 : 편집 4 : 도움 3
  if (w >= THREE_MIN_WIDTH && h >= THREE_MIN_HEIGHT) {
    const u = (w - LAYOUT_PAD * 2 - LAYOUT_GAP * 2) / 12;
    const panels = { stage: u * 5, editor: u * 4, assist: u * 3 };
    if (panels.stage >= min.stage && panels.editor >= min.editor && panels.assist >= min.assist) {
      return { layout: 'three', fit: 'viewport', panels: round(panels) };
    }
  }
  // 2열: 무대 + (편집|도움 탭). 1024 이상 또는 태블릿 가로
  const landscape = w > h;
  if (w >= TWO_MIN_WIDTH || (landscape && w >= 880)) {
    const u = (w - LAYOUT_PAD * 2 - LAYOUT_GAP) / 9;
    const panels = { stage: u * 5, editor: u * 4, assist: u * 4 };
    if (panels.stage >= min.stage && panels.editor >= min.editor) {
      return { layout: 'two', fit: h >= FIT_MIN_HEIGHT ? 'viewport' : 'flow', panels: round(panels) };
    }
  }
  const one = w - LAYOUT_PAD * 2;
  if (w >= STACK_MIN_WIDTH) return { layout: 'stack', fit: 'flow', panels: round({ stage: one, editor: one, assist: one }) };
  return { layout: 'tabs', fit: 'flow', panels: round({ stage: one, editor: one, assist: one }) };
}

function round(p) { return { stage: Math.floor(p.stage), editor: Math.floor(p.editor), assist: Math.floor(p.assist) }; }

/**
 * 배치별로 보이는 패널. two/stack은 편집 영역 안에서 편집·도움이 탭으로 번갈아 보인다.
 * @param {'three'|'two'|'stack'|'tabs'} layout
 * @param {{pane:'stage'|'editor'|'assist'}} sel  사용자가 마지막으로 고른 탭 (배치가 바뀌어도 보존)
 */
export function visiblePanes(layout, sel) {
  const pane = sel?.pane || 'editor';
  if (layout === 'three') return { stage: true, editor: true, assist: true, tabs: [] };
  if (layout === 'two' || layout === 'stack') {
    const side = pane === 'assist' ? 'assist' : 'editor';
    return { stage: true, editor: side === 'editor', assist: side === 'assist', tabs: ['editor', 'assist'] };
  }
  return { stage: pane === 'stage', editor: pane === 'editor', assist: pane === 'assist', tabs: ['stage', 'editor', 'assist'] };
}
