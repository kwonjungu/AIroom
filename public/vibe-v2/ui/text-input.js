// 한글 입력창: IME 조합 중 Enter 전송 금지, 전송·취소 버튼, 생성 중에도 초안 입력 가능.
// 모드(WP3 공방 등)가 AI 요청 입력에 쓴다. 전송·취소는 콜백으로만 알린다.

import { h, createCleanupBag } from './dom.js';

/** Safari는 조합 확정 직후의 Enter keydown에 isComposing=false, keyCode=229를 준다. */
export const COMPOSITION_GRACE_MS = 50;

/**
 * Enter 키 하나가 "전송"인지 판정 (순수 함수).
 * @param {{key:string, shiftKey?:boolean, isComposing?:boolean, keyCode?:number, ctrlKey?:boolean, metaKey?:boolean, altKey?:boolean}} e
 * @param {{composing?:boolean, msSinceCompositionEnd?:number, busy?:boolean, text?:string}} s
 * @returns {'submit'|'newline'|'ignore'|'none'}
 *   submit = 보내기, newline = 기본 동작(줄바꿈) 허용, ignore = 기본 동작도 막고 아무것도 안 함, none = Enter 아님
 */
export function enterAction(e, s = {}) {
  if (e.key !== 'Enter') return 'none';
  // 조합 중(또는 조합 확정용 Enter)이면 IME에 맡긴다: 막지도 보내지도 않는다
  if (e.isComposing || e.keyCode === 229 || s.composing) return 'newline';
  if (typeof s.msSinceCompositionEnd === 'number' && s.msSinceCompositionEnd < COMPOSITION_GRACE_MS) return 'ignore';
  if (e.shiftKey || e.altKey) return 'newline';
  if (s.busy) return 'ignore';                 // 생성 중: 초안은 유지, 중복 전송 금지
  if (!String(s.text ?? '').trim()) return 'ignore';
  return 'submit';
}

/**
 * @param {{
 *   label?: string, placeholder?: string, submitLabel?: string, cancelLabel?: string,
 *   maxLength?: number, onSubmit: (text:string)=>void, onCancel?: ()=>void, value?: string
 * }} opts
 */
export function createTextInput(opts) {
  const bag = createCleanupBag();
  let composing = false;
  let compositionEndAt = -Infinity;
  let busy = false;
  const id = 'ti-' + Math.random().toString(36).slice(2, 8);

  const area = h('textarea', {
    id, class: 'v2-textarea', rows: 2, maxlength: opts.maxLength || 300,
    placeholder: opts.placeholder || '', 'aria-describedby': id + '-hint', enterkeyhint: 'send',
  });
  if (opts.value) area.value = opts.value;
  const hint = h('p', { class: 'v2-hint', id: id + '-hint' }, 'Enter로 보내기 · Shift+Enter로 줄 바꾸기');
  const submit = h('button', { type: 'button', class: 'v2-btn v2-btn--primary' }, opts.submitLabel || '보내기');
  const cancel = h('button', { type: 'button', class: 'v2-btn', hidden: true }, opts.cancelLabel || '그만 만들기');
  const el = h('div', { class: 'v2-textinput', 'data-busy': 'false' },
    h('label', { class: 'v2-textinput__label', for: id }, opts.label || '하고 싶은 것을 적어 보세요'),
    area,
    h('div', { class: 'v2-textinput__row' }, hint, h('div', { class: 'v2-btnrow' }, cancel, submit)),
  );

  function doSubmit() {
    const text = area.value.trim();
    if (!text || busy) return;
    opts.onSubmit(text);
  }

  bag.on(area, 'compositionstart', () => { composing = true; });
  bag.on(area, 'compositionend', () => { composing = false; compositionEndAt = performance.now(); });
  bag.on(area, 'keydown', e => {
    const act = enterAction(e, { composing, msSinceCompositionEnd: performance.now() - compositionEndAt, busy, text: area.value });
    if (act === 'submit') { e.preventDefault(); doSubmit(); }
    else if (act === 'ignore') e.preventDefault();
  });
  bag.on(submit, 'click', doSubmit);
  bag.on(cancel, 'click', () => opts.onCancel?.());

  return {
    el,
    get value() { return area.value; },
    set value(v) { area.value = v; },
    focus() { area.focus(); },
    clear() { area.value = ''; },
    /** 생성 중 표시. 입력창은 계속 쓸 수 있다(초안). 전송 버튼은 잠그고 취소를 보인다. */
    setBusy(b) {
      busy = !!b;
      el.dataset.busy = String(busy);
      submit.disabled = busy;
      submit.textContent = busy ? '만드는 중…' : (opts.submitLabel || '보내기');
      cancel.hidden = !busy || !opts.onCancel;
      hint.textContent = busy ? '만드는 동안에도 다음 할 말을 적어 둘 수 있어요' : 'Enter로 보내기 · Shift+Enter로 줄 바꾸기';
    },
    destroy() { bag.clear(); el.remove(); },
  };
}
