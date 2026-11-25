// 쭘 첫 입장 안내 (EASY_UX 2026-11-26). 회의에 처음 들어왔을 때 말풍선 3장으로 무대, 안건, 손들기와 채팅을 알려 준다.
// 회의 담당자는 셋째 장 대신 「담당자 막대」 장을 본다. 이 기기에서 「다시 보지 않기」를 켠 채 닫으면 다시 띄우지 않는다.
// 기억: localStorage `zz_onboarded_v1` = 본 묶음 이름을 쉼표로("viewer", "host"). 읽기·쓰기는 모두 try/catch(사생활 창 등).
// 다시 보기: store.emit('cmd:onboard') (머리줄 「메뉴」의 「처음 안내 다시 보기」가 낸다).
// 남의 자리 안은 고치지 않는다. 가리킬 곳은 자리 id(#zz-center, #zz-wait, #zz-quick-hand, #zz-side-toggle, #zz-hostbar)로만 찾고,
// 주황 테두리는 그 위에 따로 띄운 상자로 그린다.
export const css = 'list.css';

export const KEY = 'zz_onboarded_v1';

export function readSeen(storage) {
  try { return new Set(String(storage.getItem(KEY) || '').split(',').map(s => s.trim()).filter(Boolean)); } catch { return new Set(); }
}
export function writeSeen(storage, set) {
  try { storage.setItem(KEY, [...set].join(',')); } catch { /* 저장 못 하면 다음에 또 보일 뿐 */ }
}

const STAGE = {
  id: 'stage', targets: ['#zz-center'],
  title: '가운데가 모두 함께 보는 화면이에요',
  body: '발표하는 분이 쪽을 넘기면 내 화면도 같이 넘어가요. 혼자 다른 쪽을 보다가도 위쪽 「발표 화면으로 돌아가기」를 누르면 다시 함께 봐요.'
};
const AGENDA = {
  id: 'agenda', targets: ['#zz-wait .za-panel', '#zz-wait .za-mini', '#zz-wait', '#zz-center'],
  title: '누구나 안건을 올리고 발표할 수 있어요',
  body: '「안건 추가」로 제목과 자료를 올려 두세요. 회의가 시작되면 안건 옆 「발표하기」를 눌러 모두에게 내 화면을 보여 줄 수 있어요. 다 보여 드렸으면 「발표 마치기」를 눌러 주세요.'
};
const TALK = {
  id: 'talk', all: true, targets: ['#zz-quick-hand', '#zz-side-toggle', '#zz-side-tabs'],
  title: '말하고 싶을 때는 손들기, 글은 채팅에',
  body: '「손들기」를 누르면 회의 담당자에게 내 차례가 보여요. 「채팅」에 글을 남기고 「투표」에 참여해요. 이름은 보이지 않아요.'
};
const HOST = {
  id: 'host', targets: ['#zz-hostbar'],
  title: '회의 담당자는 아래 막대를 써요',
  body: '「회의 시작하기」를 누르면 회의가 열려요. 녹음과 칠판, 판서 잠그기는 「더 보기」에 있어요. 다 마치면 「회의 끝내기」를 눌러 주세요.'
};

// 어떤 묶음을 보일지(순수 함수, 시험용으로 내보냄). seen = 이미 본 묶음, shown = 이번에 이미 본 묶음
export function pickCards(role, seen, shown = new Set(), force = false) {
  const host = role === 'host';
  if (force) return host ? [STAGE, AGENDA, HOST] : [STAGE, AGENDA, TALK];
  if (host) {
    if (seen.has('host') || shown.has('host')) return [];
    return (seen.has('viewer') || shown.has('viewer')) ? [HOST] : [STAGE, AGENDA, HOST];
  }
  if (seen.has('viewer') || seen.has('host') || shown.has('viewer') || shown.has('host')) return [];
  return [STAGE, AGENDA, TALK];
}

function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === false || v == null) continue;
    if (k === 'class') el.className = v;
    else if (k === 'text') el.textContent = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat()) if (kid != null && kid !== false) el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
  return el;
}

function visibleRect(el) {
  if (!el || el.closest('[hidden]')) return null;
  const cs = getComputedStyle(el);
  if (cs.display === 'none' || cs.visibility === 'hidden') return null;
  const r = el.getBoundingClientRect();
  if (r.width < 4 || r.height < 4) return null;
  if (r.bottom <= 0 || r.right <= 0 || r.top >= innerHeight || r.left >= innerWidth) return null;
  return r;
}

export function mount(ctx) {
  const store = ctx.store;
  let storage = null;
  try { storage = window.localStorage; } catch { storage = null; }
  const mem = { getItem: () => '', setItem() {} };
  const st = storage || mem;
  const shown = new Set();      // 이번 입장에서 띄운 묶음(「다시 보지 않기」를 꺼도 같은 입장에서는 또 띄우지 않는다)
  let alive = true, layer = null, timer = null, tries = 0;
  const offs = [];

  const narrow = () => window.matchMedia('(max-width: 767.98px)').matches;
  const busy = () => {
    const root = document.getElementById('zz-modal-root');
    return !!(root && root.querySelector('.zz-modal-back:not(.is-min)'));
  };

  function close(remember, kind) {
    if (!layer) return;
    if (remember) { const seen = readSeen(st); seen.add(kind); if (kind === 'host') seen.add('viewer'); writeSeen(st, seen); }
    layer.el.remove();
    window.removeEventListener('resize', layer.place);
    document.removeEventListener('keydown', layer.key, true);
    const back = layer.back;
    layer = null;
    if (back && document.contains(back)) { try { back.focus(); } catch { /* 무시 */ } }
  }

  function show(cards, kind) {
    if (!cards.length || layer) return;
    shown.add(kind);
    let i = 0;
    const ringsBox = h('div', { class: 'zl-ob-rings', 'aria-hidden': 'true' });
    const step = h('p', { class: 'zl-ob-step zz-num' });
    const title = h('h2', { class: 'zl-ob-title', id: 'zl-ob-title' });
    const body = h('p', { class: 'zl-ob-body', id: 'zl-ob-body' });
    const again = h('input', { type: 'checkbox', class: 'zl-check', id: 'zl-ob-again' });
    again.checked = true;
    const skip = h('button', { type: 'button', class: 'zz-btn ghost zl-ob-skip', text: '건너뛰기' });
    const next = h('button', { type: 'button', class: 'zz-btn primary zl-ob-next' });
    const card = h('div', { class: 'zl-ob-card', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'zl-ob-title', 'aria-describedby': 'zl-ob-body' },
      step, title, body,
      h('label', { class: 'zl-check-row zl-ob-again', for: 'zl-ob-again' }, again, h('span', { text: '다시 보지 않기' })),
      h('div', { class: 'zl-ob-actions' }, skip, next));
    const el = h('div', { class: 'zl-ob' }, h('div', { class: 'zl-ob-back' }), ringsBox, card);

    function targetsOf(c) {
      const out = [];
      for (const sel of c.targets) {
        for (const t of document.querySelectorAll(sel)) {
          const r = visibleRect(t);
          if (r) { out.push(r); if (!c.all) return out; break; }
        }
      }
      return out;
    }
    function place() {
      if (!layer) return;
      const c = cards[i];
      const rects = targetsOf(c);
      ringsBox.replaceChildren(...rects.map(r => {
        const d = h('div', { class: 'zl-ob-ring' });
        const pad = 4;
        Object.assign(d.style, { left: `${Math.max(2, r.left - pad)}px`, top: `${Math.max(2, r.top - pad)}px`, width: `${Math.min(innerWidth - 4, r.width + pad * 2)}px`, height: `${Math.min(innerHeight - 4, r.height + pad * 2)}px` });
        return d;
      }));
      card.classList.toggle('is-sheet', narrow());
      if (narrow()) { card.style.left = card.style.top = ''; return; }
      // 넓은 화면: 첫 가리킨 곳 옆(아래, 위, 오른쪽, 왼쪽 차례로 자리가 나는 곳). 자리가 없으면 그 안쪽 아래 가운데.
      const W = card.offsetWidth, H = card.offsetHeight, M = 16, G = 14;
      const r = rects[0] || { left: innerWidth / 2, right: innerWidth / 2, top: innerHeight / 2, bottom: innerHeight / 2, width: 0, height: 0 };
      const clampX = x => Math.max(M, Math.min(innerWidth - W - M, x));
      const clampY = y => Math.max(M, Math.min(innerHeight - H - M, y));
      const cx = r.left + r.width / 2 - W / 2, cy = r.top + r.height / 2 - H / 2;
      let x, y;
      if (r.bottom + G + H + M <= innerHeight) { x = clampX(cx); y = r.bottom + G; }
      else if (r.top - G - H >= M) { x = clampX(cx); y = r.top - G - H; }
      else if (r.right + G + W + M <= innerWidth) { x = r.right + G; y = clampY(cy); }
      else if (r.left - G - W >= M) { x = r.left - G - W; y = clampY(cy); }
      else { x = clampX(cx); y = clampY(Math.min(r.bottom, innerHeight) - H - 24); }
      card.style.left = `${Math.round(x)}px`; card.style.top = `${Math.round(y)}px`;
    }
    function paint() {
      const c = cards[i];
      step.textContent = `${i + 1}/${cards.length}`;
      title.textContent = c.title;
      body.textContent = c.body;
      next.textContent = i === cards.length - 1 ? '시작하기' : '다음';
      el.dataset.card = c.id;
      place();
    }
    const finish = () => close(again.checked, kind);
    skip.addEventListener('click', finish);
    next.addEventListener('click', () => { if (i < cards.length - 1) { i++; paint(); next.focus(); } else finish(); });
    const key = e => {
      if (!layer) return;
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); finish(); return; }
      if (e.key === 'Tab') {   // 초점이 안내 밖으로 나가지 않게
        const f = [...card.querySelectorAll('input, button')];
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    layer = { el, place, key, back: document.activeElement };
    document.body.appendChild(el);
    window.addEventListener('resize', place);
    document.addEventListener('keydown', key, true);
    paint();
    // 무대 크기가 잡히는 동안 한 번 더 자리 맞추기
    setTimeout(() => { if (layer && layer.el === el) place(); }, 250);
    next.focus();
  }

  function schedule(ms, force) {
    clearTimeout(timer);
    timer = setTimeout(() => { timer = null; auto(force); }, ms);
  }
  function auto(force) {
    if (!alive) return;
    const r = store.get('role');
    const m = store.get('meeting');
    if (!r) return;
    if (!force && (!m || m.gone || m.status === 'ended')) return;
    const cards = pickCards(r.role, readSeen(st), shown, !!force);
    if (!cards.length) return;
    if (layer) { if (!force) return; close(false, ''); }
    // 다른 창이 열려 있거나 입장 화면이면 조금 기다렸다 다시 본다(최대 약 20초)
    const joinEl = document.getElementById('zz-join');
    if (busy() || (joinEl && !joinEl.hidden)) { if (++tries < 40) schedule(500, force); return; }
    show(cards, r.role === 'host' ? 'host' : 'viewer');
  }

  // 붙은 뒤 화면 모듈이 자리를 그릴 때까지 조금 기다린다. meeting 이 아직 없으면 올 때 다시 본다.
  schedule(800, false);
  offs.push(store.on('meeting', m => { if (!layer && !timer && m && !m.gone) schedule(800, false); }));
  let lastRole = store.get('role')?.role || null;
  offs.push(store.on('role', r => {
    const now = r?.role || null;
    if (!r) { close(false, ''); return; }
    if (now !== lastRole) { lastRole = now; if (now === 'host' && !layer) schedule(800, false); }
  }));
  // 다른 분이 발표를 시작하면 안내를 닫는다(발표 화면에 자리를 내준다). 기억하지는 않는다.
  offs.push(store.on('cmd:yield', () => close(false, '')));
  offs.push(store.on('cmd:onboard', () => { tries = 0; clearTimeout(timer); timer = null; auto(true); }));

  return {
    unmount() {
      alive = false;
      clearTimeout(timer);
      offs.forEach(f => { try { f(); } catch { /* 무시 */ } });
      close(false, '');
    }
  };
}
