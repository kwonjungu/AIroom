// 상태 표시: 저장 상태 배지 + 로딩·빈 목록·저장 실패·AI 실패 안내.
// 원칙: 완료가 확인되지 않은 것을 "저장됨"으로 보이지 않는다. 모든 상태에 다음 행동을 붙인다.

import { h } from './dom.js';

/** 저장 상태(store SAVE_STATES) → 화면 표시. 순수 함수. */
export function describeSaveState(state) {
  switch (state) {
    case 'saving': return { label: '저장 중', icon: '⏳', tone: 'info', busy: true, saved: false, action: null, detail: '잠깐만 기다려 주세요' };
    case 'savedLocal': return { label: '이 기기에 저장됨', icon: '💾', tone: 'success', busy: false, saved: true, action: null, detail: '이 기기에서 다시 열 수 있어요' };
    case 'savedClass': return { label: '학급에 저장됨', icon: '☁️', tone: 'success', busy: false, saved: true, action: null, detail: '다른 기기에서도 열 수 있어요' };
    case 'error': return { label: '저장 안 됨', icon: '⚠️', tone: 'danger', busy: false, saved: false, action: { id: 'retry', label: '다시 저장' }, detail: '저장하지 못했어요. 작품은 화면에 그대로 있어요' };
    case 'unsaved': return { label: '저장 안 됨', icon: '✏️', tone: 'warn', busy: false, saved: false, action: { id: 'save', label: '저장하기' }, detail: '바뀐 내용이 아직 저장되지 않았어요' };
    case 'idle':
    default: return { label: '저장 안 됨', icon: '✏️', tone: 'neutral', busy: false, saved: false, action: null, detail: '아직 저장한 적이 없어요' };
  }
}

/** AI 처리 상태(ShellApi.setAiStatus) → 표시. 작업 단계(①~⑤)와 모양·문구가 겹치지 않게 한다. */
export function describeAiStatus(state) {
  switch (state) {
    case 'preparing': return { label: 'AI 준비 중', icon: '🧠', tone: 'info', busy: true, visible: true };
    case 'assembling': return { label: 'AI 조립 중', icon: '🧩', tone: 'info', busy: true, visible: true };
    case 'checking': return { label: 'AI 검사 중', icon: '🔍', tone: 'info', busy: true, visible: true };
    case 'done': return { label: 'AI 제안 도착', icon: '📬', tone: 'success', busy: false, visible: true };
    case 'failed': return { label: 'AI가 못 만들었어요', icon: '⚠️', tone: 'danger', busy: false, visible: true };
    case 'idle':
    default: return { label: '', icon: '', tone: 'neutral', busy: false, visible: false };
  }
}

/**
 * 화면 상태 안내 (순수 함수).
 * @param {'loading'|'empty'|'saveFailed'|'aiFailed'|'offline'} kind
 * @param {{what?: string}} [ctx]
 * @returns {{title:string, text:string, icon:string, tone:string, busy:boolean, actions:{id:string,label:string,primary?:boolean}[]}}
 */
export function describeState(kind, ctx = {}) {
  const what = ctx.what || '작품';
  const eul = josa(what, '을', '를'), iga = josa(what, '이', '가');
  switch (kind) {
    case 'loading': return { title: '불러오는 중', text: `${what}${eul} 가져오고 있어요.`, icon: '⏳', tone: 'info', busy: true, actions: [] };
    case 'empty': return { title: `아직 ${what}${iga} 없어요`, text: '새로 만들면 여기에 모여요.', icon: '📂', tone: 'neutral', busy: false, actions: [{ id: 'new', label: '새로 만들기', primary: true }] };
    case 'saveFailed': return { title: '저장하지 못했어요', text: '작품은 화면에 그대로 있어요. 다시 저장해 보세요.', icon: '⚠️', tone: 'danger', busy: false, actions: [{ id: 'retry', label: '다시 저장', primary: true }, { id: 'later', label: '나중에' }] };
    case 'aiFailed': return { title: 'AI가 이번엔 못 만들었어요', text: '원래 작품은 바뀌지 않았어요. 말을 조금 바꿔 다시 부탁해 보세요.', icon: '⚠️', tone: 'danger', busy: false, actions: [{ id: 'retry', label: '다시 부탁하기', primary: true }, { id: 'lastGood', label: '마지막으로 잘 된 작품 열기' }] };
    case 'offline': return { title: '인터넷이 끊겼어요', text: '준비된 활동은 계속할 수 있어요. 저장은 이 기기에 해 둘게요.', icon: '📡', tone: 'warn', busy: false, actions: [{ id: 'retry', label: '다시 연결' }] };
    default: throw new Error('unknown state kind: ' + kind);
  }
}

/** 받침 유무로 조사 고르기 (한글이 아니면 받침 없는 쪽) */
export function josa(word, withBatchim, without) {
  const c = String(word).trim().slice(-1).charCodeAt(0);
  if (c >= 0xAC00 && c <= 0xD7A3) return (c - 0xAC00) % 28 ? withBatchim : without;
  return without;
}

/** 저장 배지 DOM. update(state)로 갱신, onAction(id)로 저장/재시도 요청. */
export function createSaveBadge({ onAction, canAct } = {}) {
  const icon = h('span', { class: 'v2-badge__icon', 'aria-hidden': 'true' });
  const text = h('span', { class: 'v2-badge__text' });
  const btn = h('button', { type: 'button', class: 'v2-btn v2-btn--small', hidden: true });
  const el = h('div', { class: 'v2-badge v2-savebadge', role: 'status', 'aria-live': 'polite' }, icon, text, btn);
  let current = null;
  btn.addEventListener('click', () => current?.action && onAction?.(current.action.id));
  function update(state) {
    current = describeSaveState(state);
    el.dataset.tone = current.tone;
    el.dataset.state = state || 'idle';
    icon.textContent = current.icon;
    text.textContent = current.label;
    el.title = current.detail;
    btn.hidden = !current.action || !onAction || (canAct ? !canAct() : false);
    if (current.action) btn.textContent = current.action.label;
  }
  update('idle');
  return { el, update };
}

/** 상태 안내 카드 DOM (로딩·빈 목록·실패). */
export function createStateView(kind, { onAction, what } = {}) {
  const d = describeState(kind, { what });
  const el = h('div', { class: 'v2-state', 'data-tone': d.tone, role: d.tone === 'danger' ? 'alert' : 'status', 'aria-busy': d.busy ? 'true' : 'false' },
    h('div', { class: 'v2-state__icon', 'aria-hidden': 'true' }, d.icon),
    h('h3', { class: 'v2-state__title' }, d.title),
    h('p', { class: 'v2-state__text' }, d.text),
    d.actions.length ? h('div', { class: 'v2-btnrow' }, d.actions.map(a =>
      h('button', { type: 'button', class: 'v2-btn' + (a.primary ? ' v2-btn--primary' : ''), onclick: () => onAction?.(a.id) }, a.label))) : null,
  );
  return el;
}
