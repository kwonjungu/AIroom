// 가상 키보드 대응: VisualViewport로 실제 보이는 높이를 CSS 변수에 넣는다.
// 100dvh는 iOS Safari에서 키보드를 빼 주지 않으므로 그것만 믿지 않는다.
//   --vvh       보이는 높이(px)
//   --kb-inset  키보드 등으로 가려진 아래쪽 높이(px)
//   data-keyboard="open|closed"  (대상 요소)

export const KEYBOARD_THRESHOLD = 120;

/**
 * @param {{innerHeight:number, vvHeight?:number|null, vvOffsetTop?:number|null}} m
 * @returns {{vvh:number, kbInset:number, keyboard:boolean}}
 */
export function computeViewportVars({ innerHeight, vvHeight, vvOffsetTop }) {
  const ih = Math.max(0, Number(innerHeight) || 0);
  if (vvHeight == null || !(vvHeight > 0)) return { vvh: ih, kbInset: 0, keyboard: false };
  const vvh = Math.round(vvHeight);
  const kbInset = Math.max(0, Math.round(ih - vvHeight - (Number(vvOffsetTop) || 0)));
  return { vvh, kbInset, keyboard: kbInset >= KEYBOARD_THRESHOLD };
}

/**
 * @param {HTMLElement} target  변수를 둘 요소 (작업 화면 루트)
 * @param {{win?: Window}} [o]
 * @returns {() => void} 해제 함수
 */
export function watchViewport(target, o = {}) {
  const win = o.win || window;
  const vv = win.visualViewport || null;
  let raf = 0;
  const apply = () => {
    raf = 0;
    const v = computeViewportVars({ innerHeight: win.innerHeight, vvHeight: vv?.height, vvOffsetTop: vv?.offsetTop });
    target.style.setProperty('--vvh', v.vvh + 'px');
    target.style.setProperty('--kb-inset', v.kbInset + 'px');
    target.dataset.keyboard = v.keyboard ? 'open' : 'closed';
    if (v.keyboard) keepFocusedVisible(win.document);
  };
  const schedule = () => { if (!raf) raf = win.requestAnimationFrame(apply); };
  apply();
  const src = vv || win;
  src.addEventListener('resize', schedule);
  if (vv) vv.addEventListener('scroll', schedule);
  win.addEventListener('orientationchange', schedule);
  return () => {
    if (raf) win.cancelAnimationFrame(raf);
    src.removeEventListener('resize', schedule);
    if (vv) vv.removeEventListener('scroll', schedule);
    win.removeEventListener('orientationchange', schedule);
  };
}

function keepFocusedVisible(doc) {
  const el = doc.activeElement;
  if (!el || !/^(TEXTAREA|INPUT)$/.test(el.tagName)) return;
  // 입력칸과 그 옆 전송·취소 버튼 묶음이 보이도록
  const box = el.closest('.v2-textinput') || el;
  box.scrollIntoView({ block: 'nearest' });
}
