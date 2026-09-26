// 작은 DOM 도우미. 프레임워크 없이 요소 생성과 리스너 정리만 한다.

/**
 * h('button', {class:'x', onclick: fn, 'aria-label': '닫기'}, '텍스트', childEl)
 * 텍스트는 항상 textContent로 들어간다(HTML 주입 없음).
 */
export function h(tag, attrs, ...children) {
  const el = document.createElement(tag);
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'dataset') Object.assign(el.dataset, v);
      else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
      else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
      else if (v === true) el.setAttribute(k, '');
      else el.setAttribute(k, String(v));
    }
  }
  append(el, children);
  return el;
}

function append(el, children) {
  for (const c of children) {
    if (c == null || c === false) continue;
    if (Array.isArray(c)) append(el, c);
    else el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
}

/**
 * 리스너·관찰자·타이머를 한곳에 모아 한 번에 해제한다 (destroy 누수 방지).
 * DOM 없이도 동작: EventTarget만 있으면 된다.
 */
export function createCleanupBag() {
  const items = [];
  return {
    on(target, type, fn, opts) {
      target.addEventListener(type, fn, opts);
      items.push(() => target.removeEventListener(type, fn, opts));
      return fn;
    },
    add(disposer) { if (typeof disposer === 'function') items.push(disposer); return disposer; },
    timeout(fn, ms) { const id = setTimeout(fn, ms); items.push(() => clearTimeout(id)); return id; },
    get size() { return items.length; },
    clear() {
      while (items.length) { const d = items.pop(); try { d(); } catch (e) { console.error(e); } }
    },
  };
}

export const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]), [contenteditable="true"]';

export function focusables(root) {
  return [...root.querySelectorAll(FOCUSABLE)].filter(el => !el.closest('[hidden],[inert]') && el.getClientRects().length > 0);
}

/** 그림 경로 여부 (아이콘 필드가 이모지인지 이미지인지 구분) */
export function isImagePath(s) { return typeof s === 'string' && /(^\.{0,2}\/|\.(png|jpe?g|svg|webp|gif)$)/i.test(s); }

/** 모드 → 강조색 계열 */
export function accentForMode(mode) {
  if (mode === 'goal' || mode === 'shape' || mode === 'cards') return 'cards';
  if (mode === 'turtle' || mode === 'pixel' || mode === 'maze' || mode === 'learning') return 'learn';
  return 'make';
}

/** v2 페이지 기준 공용 에셋 경로 (/vibe-v2/ → /assets/vibe/) */
export const ASSET_BASE = new URL('../../assets/vibe/', import.meta.url).href;
