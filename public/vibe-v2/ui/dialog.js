// 접근 가능한 대화상자: role=dialog, aria-modal, 포커스 가두기, Esc 닫기, 닫힌 뒤 원래 자리로 포커스.
// 배경은 inert로 막는다(스크린리더·Tab 모두). 여러 개가 겹치면 맨 위 것만 Esc를 받는다.

import { h, focusables, createCleanupBag } from './dom.js';

let seq = 0;
const stack = [];

/** Tab 순환 대상 계산 (순수 함수). index = 현재 포커스 위치(-1이면 밖) */
export function nextTrapIndex(index, count, shift) {
  if (count <= 0) return -1;
  if (index < 0) return shift ? count - 1 : 0;
  if (shift) return index === 0 ? count - 1 : index - 1;
  return index === count - 1 ? 0 : index + 1;
}

/**
 * @param {{
 *   title: string,
 *   body: HTMLElement|string,
 *   actions?: {label:string, onClick?:()=>any, primary?:boolean}[],
 *   dismissible?: boolean,          // 기본 true: Esc·닫기 버튼 허용
 *   onClose?: ()=>void,
 *   returnFocus?: HTMLElement|null, // 기본: 열 때 포커스가 있던 요소
 *   fallbackFocus?: ()=>HTMLElement|null,
 *   grade?: string,
 * }} opts
 * 동작 버튼은 onClick 후 자동으로 닫힌다. onClick이 false를 반환하면 열린 채로 둔다.
 * @returns {{close():void, el:HTMLElement}}
 */
export function openDialog(opts) {
  const doc = document;
  const bag = createCleanupBag();
  const id = 'v2dlg' + (++seq);
  const returnTo = opts.returnFocus !== undefined ? opts.returnFocus : doc.activeElement;
  const dismissible = opts.dismissible !== false;
  let closed = false;

  const bodyEl = typeof opts.body === 'string' ? h('p', { class: 'v2-dialog__text' }, opts.body) : opts.body;
  const actions = (opts.actions || []).map(a => {
    const b = h('button', { type: 'button', class: 'v2-btn' + (a.primary ? ' v2-btn--primary' : '') }, a.label);
    bag.on(b, 'click', () => {
      let keep = false;
      try { keep = a.onClick?.() === false; } catch (e) { console.error(e); }
      if (!keep) close();
    });
    return b;
  });
  const closeBtn = dismissible ? h('button', { type: 'button', class: 'v2-iconbtn v2-dialog__x', 'aria-label': '닫기' }, '✕') : null;
  if (closeBtn) bag.on(closeBtn, 'click', () => close());

  const panel = h('div', {
    class: 'v2-dialog', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': id + '-t',
    'aria-describedby': typeof opts.body === 'string' ? id + '-d' : null, tabindex: '-1',
  },
  h('div', { class: 'v2-dialog__head' }, h('h2', { class: 'v2-dialog__title', id: id + '-t' }, opts.title), closeBtn),
  h('div', { class: 'v2-dialog__body', id: id + '-d' }, bodyEl),
  actions.length ? h('div', { class: 'v2-dialog__actions v2-btnrow' }, actions) : null);
  const backdrop = h('div', { class: 'v2 v2-dialog-backdrop', 'data-grade': opts.grade || null }, panel);
  if (!opts.grade) {
    const g = returnTo?.closest?.('[data-grade]')?.getAttribute('data-grade');
    if (g) backdrop.dataset.grade = g;
  }

  // 배경 inert
  const inerted = [];
  for (const el of doc.body.children) {
    if (el !== backdrop && !el.inert) { el.inert = true; inerted.push(el); }
  }
  doc.body.append(backdrop);
  stack.push(panel);

  bag.on(panel, 'keydown', e => {
    if (stack[stack.length - 1] !== panel) return;
    if (e.key === 'Escape' && dismissible) { e.preventDefault(); e.stopPropagation(); close(); return; }
    if (e.key === 'Tab') {
      const list = focusables(panel);
      if (!list.length) { e.preventDefault(); panel.focus(); return; }
      const idx = list.indexOf(doc.activeElement);
      e.preventDefault();
      list[nextTrapIndex(idx, list.length, e.shiftKey)].focus();
    }
  });
  if (dismissible) bag.on(backdrop, 'pointerdown', e => { if (e.target === backdrop) close(); });

  // 처음 포커스: 본문 안의 첫 조작 → 주 동작 → 대화상자 자체
  const first = focusables(bodyEl instanceof HTMLElement ? bodyEl : panel)[0] || actions.find((_, i) => opts.actions[i].primary) || actions[0] || panel;
  first.focus();

  function close() {
    if (closed) return;
    closed = true;
    bag.clear();
    const i = stack.indexOf(panel);
    if (i >= 0) stack.splice(i, 1);
    backdrop.remove();
    for (const el of inerted) el.inert = false;
    const target = returnTo && returnTo.isConnected ? returnTo : opts.fallbackFocus?.();
    try { target?.focus?.(); } catch { /* 포커스 불가 */ }
    try { opts.onClose?.(); } catch (e) { console.error(e); }
  }
  return { close, el: panel };
}
