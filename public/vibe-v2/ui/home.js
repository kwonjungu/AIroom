// 홈: 첫 방문엔 두 갈래 길 + 대표 그림, 길을 고르면 챕터별 큰 미션 카드.
// app.js 시그니처: mountHome(root, { grade, onGrade(g), onStart(projectFactory), fixtures, catalog?, recent? })

import { h, createCleanupBag, isImagePath, ASSET_BASE } from './dom.js';
import {
  PATHS, recommendedPath, describeMission, chapterSummary, chapterNav, initialChapterIndex,
  chaptersForPath, demoCatalog, templateCards,
} from './catalog.js';
import { openDialog } from './dialog.js';
import { openSettings, createMuteToggle } from './settings.js';
import { createPrefStore, readSettings, applySettings } from './prefs.js';
import { describeSaveState } from './status.js';

const GRADES = [
  { id: 'low', label: '1~2학년' },
  { id: 'mid', label: '3~4학년' },
  { id: 'high', label: '5~6학년' },
];

// 홈이 다시 그려져도(학년 변경, 작업 화면에서 돌아옴) 보던 곳을 기억한다. 새로고침하면 처음 화면.
const memory = { view: 'start', chapter: {}, scroll: {}, focus: null };
let cleanupPrev = null;

/** 다른 화면으로 갈 때 홈 전역 리스너 정리 (shell.js가 호출) */
export function unmountHome() { cleanupPrev?.(); cleanupPrev = null; }

export function mountHome(root, opts) {
  unmountHome();
  const bag = createCleanupBag();
  cleanupPrev = () => bag.clear();
  const prefs = createPrefStore();
  applySettings(readSettings(prefs));

  const grade = opts.grade || 'low';
  const rec = recommendedPath(grade);
  const catalog = Array.isArray(opts.catalog) && opts.catalog.length ? opts.catalog : null;

  const mute = createMuteToggle(prefs);
  bag.add(mute.destroy);

  const main = h('main', { class: 'home-main', id: 'v2-main', tabindex: '-1' });
  const live = h('p', { class: 'v2-visually-hidden', 'aria-live': 'polite' });
  const shell = h('div', { class: 'v2 v2-home', 'data-grade': grade, 'data-accent': PATHS[memory.view === 'start' ? rec : memory.view]?.accent || 'make' },
    h('a', { class: 'v2-skip', href: '#v2-main' }, '본문으로 건너뛰기'),
    h('header', { class: 'home-top' },
      h('div', { class: 'home-brand' }, h('span', { class: 'home-brand__mark', 'aria-hidden': 'true' }, '✨'), '바이브코딩'),
      h('div', { class: 'home-tools' },
        gradePicker(grade, g => { memory.focus = 'grade-' + g; opts.onGrade?.(g); }),
        mute.el,
        h('button', { type: 'button', class: 'v2-iconbtn', 'aria-label': '설정', title: '설정', onclick: () => openSettings({ prefs, grade }) }, '⚙️'))),
    main, live);
  root.replaceChildren(shell);

  function go(view) {
    saveScroll();
    memory.view = view;
    shell.dataset.accent = PATHS[view === 'start' ? rec : view]?.accent || 'make';
    render();
    main.focus({ preventScroll: true });
    window.scrollTo(0, memory.scroll[scrollKey()] || 0);
  }
  function scrollKey() { return memory.view + ':' + (memory.chapter[memory.view] ?? ''); }
  function saveScroll() { memory.scroll[scrollKey()] = window.scrollY; }
  function start(factory) { saveScroll(); opts.onStart(factory); }

  function render() {
    if (memory.view === 'cards' || memory.view === 'make') main.replaceChildren(...pathView(memory.view));
    else main.replaceChildren(...startView());
  }

  // ── 처음 화면 ───────────────────────────────────────────
  function startView() {
    const recent = Array.isArray(opts.recent) ? opts.recent.filter(r => typeof r?.open === 'function') : [];
    const out = [];
    if (recent.length) {
      const r = recent[0];
      const s = describeSaveState(r.saveState);
      out.push(h('section', { class: 'home-continue', 'aria-labelledby': 'cont-h' },
        h('h2', { id: 'cont-h', class: 'v2-visually-hidden' }, '최근 작품'),
        h('button', { type: 'button', class: 'v2-btn v2-btn--primary v2-btn--hero', onclick: () => { saveScroll(); r.open(); } },
          h('span', { class: 'home-continue__label' }, '이어서 만들기'),
          h('span', { class: 'home-continue__title' }, r.title || '내 작품')),
        h('p', { class: 'home-continue__meta' }, h('span', { 'aria-hidden': 'true' }, s.icon + ' '), s.label),
        h('button', { type: 'button', class: 'v2-btn', onclick: () => go(rec) }, '새로 만들기')));
    }
    out.push(h('h1', { class: 'home-h1' }, recent.length ? '아니면 새로 시작해요' : '무엇으로 만들어 볼까요?'));
    out.push(h('p', { class: 'home-lead' }, '학년 추천은 참고만 하세요. 어느 길이든 고를 수 있어요.'));
    out.push(h('div', { class: 'home-paths' }, pathCard('cards'), pathCard('make')));
    return out;
  }

  function pathCard(id) {
    const p = PATHS[id];
    const isRec = id === rec;
    const art = id === 'cards'
      ? h('div', { class: 'path-art path-art--cards', 'aria-hidden': 'true' },
        ['card-move.png', 'card-turn-right.png', 'card-move.png', 'card-goal-star.png'].map(f => h('img', { src: ASSET_BASE + f, alt: '', loading: 'lazy', decoding: 'async' })))
      : h('div', { class: 'path-art path-art--make', 'aria-hidden': 'true' }, h('img', { src: ASSET_BASE + 'card-studio.jpg', alt: '', decoding: 'async' }));
    return h('button', { type: 'button', class: 'path-card', 'data-accent': p.accent, 'data-path': id, onclick: () => go(id) },
      art,
      h('span', { class: 'path-card__body' },
        isRec ? h('span', { class: 'v2-tag' }, '★ ' + (id === 'cards' ? '1~2학년 추천' : '3~6학년 추천')) : null,
        h('span', { class: 'path-card__title' }, p.title),
        h('span', { class: 'path-card__desc' }, p.desc),
        h('span', { class: 'path-card__go', 'aria-hidden': 'true' }, '들어가기 →')));
  }

  // ── 길 화면 ─────────────────────────────────────────────
  function pathView(id) {
    const p = PATHS[id];
    const head = h('div', { class: 'home-pathhead' },
      h('button', { type: 'button', class: 'v2-btn', onclick: () => go('start') }, '← 처음 화면'),
      h('h1', { class: 'home-h1' }, p.title));
    const out = [head];
    if (id === 'make') {
      const tpls = templateCards(opts.fixtures);
      if (tpls.length) {
        out.push(h('section', { class: 'home-section', 'aria-labelledby': 'tpl-h' },
          h('h2', { id: 'tpl-h', class: 'home-h2' }, '게임 공방 — 무엇을 만들까요?'),
          h('div', { class: 'tpl-grid' }, tpls.map(templateCard))));
      }
    }
    const chapters = chaptersForPath(catalog || demoCatalog(opts.fixtures), id);
    if (chapters.length) out.push(chapterSection(id, chapters));
    else if (id === 'cards') out.push(emptyNote('아직 준비된 카드 미션이 없어요.'));
    return out;
  }

  function templateCard(t) {
    return h('article', { class: 'tpl-card' },
      h('div', { class: 'tpl-card__art', 'aria-hidden': 'true', style: { backgroundImage: `url("${ASSET_BASE}bg-stage-meadow.jpg")` } },
        h('span', { class: 'tpl-card__hero' }, t.hero), t.item ? h('span', { class: 'tpl-card__item' }, t.item) : null),
      h('h3', { class: 'tpl-card__title' }, t.title),
      h('p', { class: 'tpl-card__meta' }, h('span', { 'aria-hidden': 'true' }, '🎮 '), t.controls),
      t.goal ? h('p', { class: 'tpl-card__meta' }, h('span', { 'aria-hidden': 'true' }, '🏁 '), t.goal) : null,
      h('button', { type: 'button', class: 'v2-btn v2-btn--primary', onclick: () => start(t.makeProject), 'aria-label': `${t.title} ${t.legacy ? '열기' : '만들기 시작'}` }, t.legacy ? '열어 보기' : '이걸로 만들기'));
  }

  function chapterSection(pathId, chapters) {
    const nav = chapterNav(memory.chapter[pathId] ?? initialChapterIndex(chapters), chapters.length);
    memory.chapter[pathId] = nav.index;
    const ch = chapters[nav.index];
    const sum = chapterSummary(ch);
    const setChapter = i => { saveScroll(); memory.chapter[pathId] = i; render(); main.querySelector('.chap-title')?.focus(); };

    const navRow = chapters.length > 1 ? h('div', { class: 'chap-nav' },
      h('button', { type: 'button', class: 'v2-btn', disabled: nav.prev == null, onclick: () => setChapter(nav.prev) }, '◀ 이전'),
      h('button', { type: 'button', class: 'v2-btn', onclick: () => openChapterList(chapters, nav.index, setChapter) }, `챕터 목록 (${nav.index + 1}/${chapters.length})`),
      h('button', { type: 'button', class: 'v2-btn', disabled: nav.next == null, onclick: () => setChapter(nav.next) }, '다음 ▶')) : null;

    return h('section', { class: 'home-section chap', 'aria-labelledby': 'chap-h' },
      h('div', { class: 'chap-head' },
        h('h2', { id: 'chap-h', class: 'home-h2 chap-title', tabindex: '-1' }, ch.title + (ch.demo ? ' (예시)' : '')),
        h('p', { class: 'chap-meta' },
          h('span', null, `${sum.done}/${sum.total} 완료`),
          sum.current ? h('span', null, ' · 지금: ' + sum.current.title) : null)),
      navRow,
      h('ol', { class: 'mission-grid' }, ch.missions.map((m, i) => h('li', null, missionCard(m, i)))));
  }

  function missionCard(m, i) {
    const d = describeMission(m, i);
    const icon = isImagePath(m.icon)
      ? h('img', { class: 'mission__icon', src: m.icon, alt: '' })
      : h('span', { class: 'mission__icon mission__icon--emoji', 'aria-hidden': 'true' }, m.icon || '⭐');
    const reasonId = d.reason ? `why-${m.id}` : null;
    const card = h('button', {
      type: 'button', class: 'mission', 'data-status': m.status || 'open',
      'aria-disabled': d.disabled ? 'true' : null, 'aria-describedby': reasonId,
      'aria-current': m.status === 'current' ? 'step' : null,
    },
    h('span', { class: 'mission__top' },
      h('span', { class: 'mission__num', 'aria-hidden': 'true' }, d.num),
      d.badge ? h('span', { class: 'mission__badge' }, h('span', { 'aria-hidden': 'true' }, d.mark + ' '), d.badge) : null),
    icon,
    h('span', { class: 'mission__title' }, h('span', { class: 'v2-visually-hidden' }, d.srText + ': '), m.title),
    d.reason ? h('span', { class: 'mission__why', id: reasonId }, d.reason) : null);
    card.addEventListener('click', () => {
      if (d.disabled) {
        // 잠금: 이유를 소리 내어 읽히도록 짧게 알림 (포커스는 그대로)
        const why = card.querySelector('.mission__why');
        why?.classList.add('is-flash');
        live.textContent = '';
        bag.timeout(() => { live.textContent = `${m.title}: ${d.reason}`; }, 50);
        bag.timeout(() => why?.classList.remove('is-flash'), 900);
        return;
      }
      if (typeof m.makeProject === 'function') start(m.makeProject);
    });
    return card;
  }

  function openChapterList(chapters, current, setChapter) {
    let dlg;
    const list = h('ol', { class: 'chap-list' }, chapters.map((c, i) => {
      const s = chapterSummary(c);
      return h('li', null, h('button', {
        type: 'button', class: 'v2-btn chap-list__btn', 'aria-current': i === current ? 'true' : null,
        onclick: () => { dlg.close(); setChapter(i); },
      }, h('span', null, `${i + 1}. ${c.title}`), h('span', { class: 'chap-list__meta' }, `${s.done}/${s.total} 완료`)));
    }));
    dlg = openDialog({ title: '챕터 목록', body: list, grade });
  }

  function emptyNote(text) { return h('p', { class: 'home-empty' }, text); }

  render();
  // 돌아왔을 때 스크롤·포커스 복원
  requestAnimationFrame(() => {
    window.scrollTo(0, memory.scroll[scrollKey()] || 0);
    if (memory.focus) { shell.querySelector(`[data-focus-key="${memory.focus}"]`)?.focus(); memory.focus = null; }
  });
  return { destroy: unmountHome };
}

function gradePicker(grade, onPick) {
  return h('div', { class: 'grade-pick', role: 'group', 'aria-label': '학년 추천 설정' },
    h('span', { class: 'grade-pick__label', 'aria-hidden': 'true' }, '학년'),
    GRADES.map(g => h('button', {
      type: 'button', class: 'grade-pick__btn', 'aria-pressed': String(g.id === grade), 'data-focus-key': 'grade-' + g.id,
      onclick: () => { if (g.id !== grade) onPick(g.id); },
    }, g.label)));
}
