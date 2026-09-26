// 소리·움직임 설정 UI (홈과 작업 화면 공용).

import { h } from './dom.js';
import { openDialog } from './dialog.js';
import { createPrefStore, readSettings, updateSetting, MOTION_LABELS, PREFS_EVENT } from './prefs.js';

/** 헤더용 빠른 음소거 토글. 반환: {el, destroy} */
export function createMuteToggle(prefs = createPrefStore()) {
  const btn = h('button', { type: 'button', class: 'v2-iconbtn v2-mute' });
  const render = () => {
    const { muted } = readSettings(prefs);
    btn.setAttribute('aria-pressed', String(muted));
    btn.setAttribute('aria-label', muted ? '소리 켜기 (지금 꺼짐)' : '소리 끄기 (지금 켜짐)');
    btn.title = muted ? '소리 꺼짐' : '소리 켜짐';
    btn.textContent = muted ? '🔇' : '🔊';
  };
  btn.addEventListener('click', () => updateSetting(prefs, 'muted', !readSettings(prefs).muted));
  globalThis.addEventListener(PREFS_EVENT, render);
  render();
  return { el: btn, destroy() { globalThis.removeEventListener(PREFS_EVENT, render); } };
}

/** 설정 대화상자 */
export function openSettings({ prefs = createPrefStore(), grade } = {}) {
  const body = h('div', { class: 'v2-settings' });
  const draw = () => {
    const s = readSettings(prefs);
    body.replaceChildren(
      h('fieldset', { class: 'v2-field' },
        h('legend', null, '소리'),
        h('p', { class: 'v2-hint' }, '수업 중에는 한 번에 모든 소리를 끌 수 있어요.'),
        h('div', { class: 'v2-seg' },
          segBtn('🔊 켜기', !s.muted, () => { updateSetting(prefs, 'muted', false); draw(); }),
          segBtn('🔇 모두 끄기', s.muted, () => { updateSetting(prefs, 'muted', true); draw(); }))),
      h('fieldset', { class: 'v2-field' },
        h('legend', null, '움직임'),
        h('p', { class: 'v2-hint' }, '튀는 효과와 화면 이동을 줄여요.'),
        h('div', { class: 'v2-seg' },
          ['system', 'on', 'off'].map(v => segBtn(MOTION_LABELS[v], s.reduceMotion === v, () => { updateSetting(prefs, 'reduceMotion', v); draw(); })))),
    );
  };
  draw();
  return openDialog({ title: '설정', body, actions: [{ label: '닫기', primary: true }], grade });
}

function segBtn(label, pressed, onClick) {
  return h('button', { type: 'button', class: 'v2-seg__btn', 'aria-pressed': String(pressed), onclick: e => { onClick(); refocus(e, label); } }, label);
}

// 다시 그린 뒤 같은 버튼에 포커스 유지
function refocus(e, label) {
  const field = e.currentTarget?.closest?.('.v2-settings');
  queueMicrotask(() => {
    const again = [...(field || document).querySelectorAll('.v2-seg__btn')].find(b => b.textContent === label);
    again?.focus();
  });
}
