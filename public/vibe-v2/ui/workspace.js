// 작업 화면 셸: 상단(돌아가기·제목·저장·AI 상태 / 단계·안내 한 문장) + 무대·편집·도움 + 고정 실행 영역.
// app.js 시그니처: mountWorkspace(root, { grade, title, onBack }) → ShellApi & { destroy() }
// 추가(선택) 인자: mode — 강조색 결정. 추가 메서드: dockSlot, setSaveState, onSaveAction, showPane, getLayout.

import { h, createCleanupBag, accentForMode } from './dom.js';
import { decideLayout, visiblePanes } from './layout-rules.js';
import { watchViewport } from './viewport.js';
import { openDialog } from './dialog.js';
import { STEPS, describeStep, firstSentence } from './steps.js';
import { describeAiStatus, createSaveBadge } from './status.js';
import { createPrefStore, readSettings, applySettings, PREFS_EVENT } from './prefs.js';
import { openSettings, createMuteToggle } from './settings.js';
import { unmountHome } from './home.js';

const TONE_ICON = { info: '💬', hint: '💡', success: '✅', warn: '⚠️' };
const PANE_LABEL = { stage: '무대', editor: '만들기', assist: '도움' };

export function mountWorkspace(root, opts) {
  unmountHome();
  const bag = createCleanupBag();
  const prefs = createPrefStore();
  applySettings(readSettings(prefs));
  const grade = opts.grade || 'low';
  const accent = opts.mode ? accentForMode(opts.mode) : (grade === 'low' ? 'cards' : 'make');
  const uid = 'ws' + Math.random().toString(36).slice(2, 7);
  const dialogs = new Set();
  let backHandler = typeof opts.onBack === 'function' ? opts.onBack : null;
  let saveHandler = null;
  let destroyed = false;
  const st = { step: 'think', pane: 'editor', layout: null, fit: null };

  // ── 상단 1줄: 돌아가기 · 제목 · AI 상태 · 저장 상태 · 소리 · 설정
  const backBtn = h('button', { type: 'button', class: 'v2-btn ws-back' }, h('span', { 'aria-hidden': 'true' }, '← '), '돌아가기');
  bag.on(backBtn, 'click', () => backHandler?.());
  const titleEl = h('h1', { class: 'ws-title', title: opts.title || '' }, opts.title || '내 작품');
  const aiEl = h('div', { class: 'ws-ai', role: 'status', 'aria-live': 'polite', hidden: true },
    h('span', { class: 'ws-ai__icon', 'aria-hidden': 'true' }), h('span', { class: 'ws-ai__text' }));
  const save = createSaveBadge({ onAction: id => saveHandler?.(id), canAct: () => !!saveHandler });
  const mute = createMuteToggle(prefs);
  bag.add(mute.destroy);
  const settingsBtn = h('button', { type: 'button', class: 'v2-iconbtn', 'aria-label': '설정', title: '설정' }, '⚙️');
  bag.on(settingsBtn, 'click', () => { const d = openSettings({ prefs, grade }); track(d); });

  // ── 상단 2줄: 단계 표시(현재 단계 크게) · 안내 한 문장
  const stepItems = STEPS.map(s => h('li', { class: 'ws-step', 'data-step': s.id },
    h('span', { class: 'ws-step__num', 'aria-hidden': 'true' }, s.num),
    h('span', { class: 'ws-step__label' }, s.label),
    h('span', { class: 'ws-step__state v2-visually-hidden' })));
  const stepCount = h('span', { class: 'ws-stepcount', 'aria-hidden': 'true' });
  const steps = h('nav', { class: 'ws-steps', 'aria-label': '작업 단계' }, h('ol', null, stepItems), stepCount);
  const sayText = h('p', { class: 'ws-say__text' });
  const sayIcon = h('span', { class: 'ws-say__icon', 'aria-hidden': 'true' });
  const sayActions = h('span', { class: 'ws-say__actions v2-btnrow' });
  const canSpeak = typeof globalThis.speechSynthesis !== 'undefined' && typeof globalThis.SpeechSynthesisUtterance === 'function';
  const readBtn = canSpeak ? h('button', { type: 'button', class: 'v2-btn v2-btn--small ws-read', title: '안내를 소리 내어 읽어요' },
    h('span', { 'aria-hidden': 'true' }, '🗣️'), h('span', { class: 'ws-read__label' }, '읽어주기')) : null;
  if (readBtn) bag.on(readBtn, 'click', () => speak(sayText.textContent));
  const say = h('div', { class: 'ws-say', role: 'status', 'aria-live': 'polite', 'data-tone': 'info' }, sayIcon, sayText, sayActions);

  const header = h('header', { class: 'ws-top' },
    h('div', { class: 'ws-row ws-row--1' }, backBtn, titleEl, h('div', { class: 'ws-status' }, aiEl, save.el), mute.el, settingsBtn),
    h('div', { class: 'ws-row ws-row--2' }, steps, say, readBtn));

  // ── 본문: 무대 · 편집 · 도움 (배치가 바뀌어도 같은 요소를 유지 → 모드 상태·입력 초안 보존)
  const panes = {
    stage: h('section', { class: 'ws-pane ws-stage', 'data-stage': '', id: uid + '-stage', 'aria-label': '무대' }),
    editor: h('section', { class: 'ws-pane ws-editor', 'data-editor': '', id: uid + '-editor', 'aria-label': '만들기' }),
    assist: h('aside', { class: 'ws-pane ws-assist', 'data-assist': '', id: uid + '-assist', 'aria-label': '도움' }),
  };
  const tabBtns = {};
  for (const k of ['stage', 'editor', 'assist']) {
    tabBtns[k] = h('button', { type: 'button', role: 'tab', class: 'ws-tab', id: uid + '-tab-' + k, 'aria-controls': panes[k].id, 'data-pane': k },
      k === 'assist' && grade !== 'low' ? 'AI 도움' : PANE_LABEL[k], h('span', { class: 'ws-tab__dot', 'aria-hidden': 'true' }));
    bag.on(tabBtns[k], 'click', () => showPane(k, true));
  }
  const tabs = h('div', { class: 'ws-tabs', role: 'tablist', 'aria-label': '작업 화면 나누기' }, Object.values(tabBtns));
  bag.on(tabs, 'keydown', e => {
    const list = [...tabs.querySelectorAll('.ws-tab:not([hidden])')];
    const i = list.indexOf(document.activeElement);
    if (i < 0) return;
    let j = null;
    if (e.key === 'ArrowRight') j = (i + 1) % list.length;
    else if (e.key === 'ArrowLeft') j = (i - 1 + list.length) % list.length;
    else if (e.key === 'Home') j = 0;
    else if (e.key === 'End') j = list.length - 1;
    if (j == null) return;
    e.preventDefault();
    showPane(list[j].dataset.pane, true);
  });
  const dock = h('div', { class: 'ws-dock', 'data-dock': '' });
  const body = h('div', { class: 'ws-body' }, tabs, panes.stage, panes.editor, panes.assist);

  const ws = h('div', { class: 'v2 ws', 'data-workspace': '', 'data-grade': grade, 'data-accent': accent },
    h('a', { class: 'v2-skip', href: '#' + panes.editor.id }, '만들기 영역으로 건너뛰기'),
    header, body, dock);
  root.replaceChildren(ws);

  // ── 배치 판정: 작업 화면 컨테이너의 실제 폭 + 보이는 높이
  const stopViewport = watchViewport(ws);
  bag.add(stopViewport);
  let raf = 0;
  const relayout = () => {
    raf = 0;
    if (destroyed) return;
    const width = ws.clientWidth || root.clientWidth || window.innerWidth;
    const height = window.visualViewport?.height || window.innerHeight;
    const d = decideLayout({ width, height, grade });
    if (d.layout !== st.layout || d.fit !== st.fit) { st.layout = d.layout; st.fit = d.fit; applyLayout(); }
  };
  const schedule = () => { if (!raf) raf = requestAnimationFrame(relayout); };
  bag.add(() => raf && cancelAnimationFrame(raf));
  if (typeof ResizeObserver === 'function') {
    const ro = new ResizeObserver(schedule);
    ro.observe(ws);
    bag.add(() => ro.disconnect());
  }
  bag.on(window, 'resize', schedule);
  if (window.visualViewport) bag.on(window.visualViewport, 'resize', schedule);

  function applyLayout() {
    ws.dataset.layout = st.layout;
    ws.dataset.fit = st.fit;
    const vis = visiblePanes(st.layout, { pane: st.pane });
    const tabbed = vis.tabs.length > 0;
    tabs.hidden = !tabbed;
    for (const k of Object.keys(panes)) {
      const p = panes[k];
      const inTabs = vis.tabs.includes(k);
      p.hidden = !vis[k];
      tabBtns[k].hidden = !inTabs;
      if (inTabs) {
        p.setAttribute('role', 'tabpanel');
        p.setAttribute('aria-labelledby', tabBtns[k].id);
        p.removeAttribute('aria-label');
        tabBtns[k].setAttribute('aria-selected', String(vis[k]));
        tabBtns[k].tabIndex = vis[k] ? 0 : -1;
        if (vis[k]) tabBtns[k].removeAttribute('data-news');
      } else {
        p.removeAttribute('role');
        p.removeAttribute('aria-labelledby');
        p.setAttribute('aria-label', PANE_LABEL[k]);
      }
    }
    // 숨겨진 패널 안에 포커스가 남으면 그 패널의 탭으로 옮긴다
    const a = document.activeElement;
    for (const k of Object.keys(panes)) if (panes[k].hidden && panes[k].contains(a)) tabBtns[k].focus();
  }

  function showPane(k, focusTab) {
    if (!panes[k]) return;
    st.pane = k;
    if (st.layout) applyLayout();
    if (focusTab && !tabBtns[k].hidden) tabBtns[k].focus();
  }

  // 도움 패널이 가려진 동안 내용이 바뀌면 탭에 점 표시
  if (typeof MutationObserver === 'function') {
    const mo = new MutationObserver(() => { if (panes.assist.hidden) tabBtns.assist.dataset.news = 'true'; });
    mo.observe(panes.assist, { childList: true, subtree: true, characterData: true });
    bag.add(() => mo.disconnect());
  }

  // 읽어주기
  function speak(text) {
    if (!canSpeak || !text) return;
    if (readSettings(prefs).muted) return;
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'ko-KR';
      u.rate = grade === 'low' ? 0.9 : 1;
      speechSynthesis.speak(u);
    } catch { /* 음성 불가 */ }
  }
  const syncRead = () => { if (readBtn) readBtn.hidden = readSettings(prefs).muted || !sayText.textContent; };
  bag.on(window, PREFS_EVENT, syncRead);
  bag.add(() => { if (canSpeak) try { speechSynthesis.cancel(); } catch { /* 없음 */ } });

  function track(d) {
    dialogs.add(d);
    return d;
  }

  let aiTimer = null;
  const api = {
    setStep(step) {
      const d = describeStep(step, grade);
      st.step = d.step.id;
      stepItems.forEach((li, i) => {
        const s = d.states[i];
        li.dataset.state = s;
        if (s === 'current') li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current');
        li.querySelector('.ws-step__state').textContent = s === 'done' ? ' (지남)' : s === 'current' ? ' (지금)' : '';
      });
      stepCount.textContent = `${d.index + 1}/${d.total}`;
      api.say({ text: d.nextAction, tone: 'info' });
    },
    setAiStatus(state) {
      const d = describeAiStatus(state);
      clearTimeout(aiTimer);
      aiEl.hidden = !d.visible;
      aiEl.dataset.tone = d.tone;
      aiEl.dataset.busy = String(d.busy);
      aiEl.querySelector('.ws-ai__icon').textContent = d.icon;
      aiEl.querySelector('.ws-ai__text').textContent = d.label;
      ws.setAttribute('aria-busy', String(d.busy));
      if (state === 'done') aiTimer = setTimeout(() => { if (!destroyed) aiEl.hidden = true; }, 6000);
    },
    say({ text, tone = 'info', actions } = {}) {
      const one = firstSentence(text);
      if (one !== String(text ?? '').trim().replace(/\s+/g, ' ')) console.warn('[shell.say] 한 번에 한 문장만 보여 줍니다:', text);
      say.dataset.tone = TONE_ICON[tone] ? tone : 'info';
      sayIcon.textContent = TONE_ICON[say.dataset.tone];
      sayText.textContent = one;
      sayActions.replaceChildren(...(actions || []).slice(0, 2).map(a =>
        h('button', { type: 'button', class: 'v2-btn v2-btn--small', onclick: () => a.onClick?.() }, a.label)));
      syncRead();
    },
    dialog(o) {
      const d = openDialog({ ...o, grade, fallbackFocus: () => backBtn, onClose: () => { dialogs.delete(d); o.onClose?.(); } });
      return track(d);
    },
    stageSlot: () => panes.stage,
    editorSlot: () => panes.editor,
    assistSlot: () => panes.assist,
    onBack(fn) { backHandler = typeof fn === 'function' ? fn : backHandler; },

    // ── 계약 밖 추가 기능 (선택 사용)
    /** 실행·정지·되돌리기 버튼을 둘 고정 영역 (화면 아래, 키보드 위) */
    dockSlot: () => dock,
    /** store saveState 반영: 'idle'|'saving'|'savedLocal'|'savedClass'|'unsaved'|'error' */
    setSaveState(s) { save.update(s); },
    /** 저장 배지의 저장하기/다시 저장 버튼 → fn('save'|'retry') */
    onSaveAction(fn) { saveHandler = typeof fn === 'function' ? fn : null; save.update(save.el.dataset.state); },
    /** 좁은 화면에서 특정 패널을 앞으로 ('stage'|'editor'|'assist') */
    showPane(k) { showPane(k, false); },
    getLayout: () => ({ layout: st.layout, fit: st.fit, pane: st.pane }),

    destroy() {
      if (destroyed) return;
      destroyed = true;
      clearTimeout(aiTimer);
      for (const d of [...dialogs]) { try { d.close(); } catch { /* 이미 닫힘 */ } }
      dialogs.clear();
      bag.clear();
      ws.remove();
    },
  };

  api.setStep('think');
  relayout();
  return api;
}
