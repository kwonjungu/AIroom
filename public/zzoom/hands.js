// 쭘 손들기 (디자인 4). 자리: #zz-side-hands(목록), #zz-quick-hand(손들기 단추).
export const css = 'side.css';

function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (v === true) el.setAttribute(k, '');
    else el.setAttribute(k, v);
  }
  for (const k of kids.flat()) if (k != null) el.append(k.nodeType ? k : document.createTextNode(String(k)));
  return el;
}

/** 손 든 순서(at, 같으면 cid). at 은 숫자·Timestamp 모두. */
export function sortHands(hands) {
  const ms = a => (a == null ? Infinity : typeof a === 'number' ? a : typeof a.toMillis === 'function' ? a.toMillis() : typeof a.seconds === 'number' ? a.seconds * 1000 : Infinity);
  return (hands || []).slice().sort((x, y) => (ms(x.at) - ms(y.at)) || String(x.cid).localeCompare(String(y.cid)));
}

export function mount(ctx) {
  const { store, api, t } = ctx;
  const mid = ctx.mid;
  const listRoot = ctx.el('zz-side-hands');
  const quickRoot = ctx.el('zz-quick-hand');
  let optimistic = null; // true/false = 내가 방금 누른 상태(서버 반영 전)
  let busy = false;
  let alive = true;
  let settleTimer = 0;   // 낙관 상태를 서버 값으로 되돌리는 타이머. 하나만 기억해 연타·unmount 때 지운다(감사 U04)

  const quick = h('button', { type: 'button', class: 'zz-btn zs-hand-btn', 'aria-pressed': 'false', onclick: toggle },
    h('img', { class: 'zz-icon', src: ctx.assets('icon-hand'), alt: '' }), h('span', { class: 'zs-hand-label' }, t('손들기')));
  quickRoot.replaceChildren(quick);
  // 「손」 칸 안에도 손들기 단추를 둔다. 휴대폰(768px 미만)에서는 아래 서랍이 쪽 막대의 ✋ 를 덮기 때문(감사 U14)
  const inner = h('button', { type: 'button', class: 'zz-btn zs-hand-btn zs-hands-raise', 'aria-pressed': 'false', onclick: toggle },
    h('img', { class: 'zz-icon', src: ctx.assets('icon-hand'), alt: '' }), h('span', { class: 'zs-hand-label' }, t('손들기')));
  const body = h('div', { class: 'zs-hands' });
  listRoot.replaceChildren(body);

  const me = () => store.get('role')?.cid;
  const isHost = () => store.get('role')?.role === 'host';
  const live = () => store.get('meeting')?.status === 'live';
  const raised = () => {
    if (optimistic != null) return optimistic;
    return (store.get('hands') || []).some(x => x.cid === me());
  };

  async function toggle() {
    if (busy) return;
    if (!live()) { ctx.toast(t('회의가 시작되면 손을 들 수 있어요'), 'info'); return; }
    const want = !raised();
    clearTimeout(settleTimer); settleTimer = 0;   // 앞 타이머가 이번 낙관 상태를 지우지 않게
    optimistic = want; busy = true; paint();
    try { await api.setHand(mid, want); }
    catch (e) { optimistic = null; if (alive) ctx.toast((e && e.message) || t('손 상태를 바꾸지 못했어요'), 'error'); }
    finally {
      busy = false;
      if (alive) {
        paint();
        // 구독이 따라잡을 시간을 주고 서버 값으로 돌아간다
        settleTimer = setTimeout(() => { settleTimer = 0; if (!alive) return; optimistic = null; paint(); }, 1500);
      }
    }
  }

  async function lower(cid) {
    try { await api.lowerHand(mid, cid); }
    catch (e) { ctx.toast((e && e.message) || t('내리지 못했어요'), 'error'); }
  }
  async function lowerAll() {
    try { await api.lowerAllHands(mid); }
    catch (e) { ctx.toast((e && e.message) || t('모두 내리지 못했어요'), 'error'); }
  }

  function paint() {
    if (!alive) return;
    const hands = sortHands(store.get('hands'));
    const up = raised();
    // 쉬운 화면(B10): 시작 전에는 흐리게 두고 언제 쓸 수 있는지 글로 알린다. 눌러도 안내만 뜬다(끄지 않음)
    const m = store.get('meeting') || {};
    const ended = m.status === 'ended' || m.gone;
    const waiting = !live() && !ended;
    for (const b of [quick, inner]) {
      b.setAttribute('aria-pressed', String(up));
      b.classList.toggle('on', up);
      b.classList.toggle('is-wait', waiting);
      b.disabled = busy;
      b.hidden = !!ended;
      b.querySelector('.zs-hand-label').textContent = waiting
        ? (b === quick ? t('회의 시작 뒤 손들기') : t('회의가 시작되면 손을 들 수 있어요'))
        : up ? t('손 내리기') : t('손들기');
    }

    const n = hands.length;
    const b = { ...(store.get('badges') || {}) };
    if (n > 0) b.hands = n; else delete b.hands;
    store.set('badges', b);

    const host = isHost();
    // 익명(ANON): 이름 없이 손 든 사람 수와 순서 번호만. 내 손만 「나」. 회의 담당자는 「모두 내리기」와 「맨 앞 손 내리기」.
    const head = h('div', { class: 'zs-hands-head' },
      h('strong', {}, t('손 든 사람')), h('span', { class: 'zs-badge zz-num' }, `${n}${t('명')}`));
    if (host && n) head.append(
      h('button', { type: 'button', class: 'zz-btn ghost zs-mini', onclick: () => lower(hands[0].cid) }, t('맨 앞 손 내리기')),
      h('button', { type: 'button', class: 'zz-btn ghost zs-mini', onclick: lowerAll }, t('모두 내리기')));
    const rows = hands.map((x, i) => h('li', { class: 'zs-hand-row' + (x.cid === me() ? ' mine' : '') },
      h('span', { class: 'zs-order zz-num' }, String(i + 1)),
      h('span', { class: 'zs-hand-name' }, i === 0 ? t('첫 번째로 든 손') : `${i + 1}${t('번째로 든 손')}`),
      x.cid === me() ? h('span', { class: 'zs-mine-tag' }, t('나')) : null));
    const listEl = rows.length
      ? h('ol', { class: 'zs-hand-list' }, rows)
      : h('div', { class: 'zs-empty' }, h('img', { class: 'zz-icon', src: ctx.assets('icon-hand'), alt: '' }), h('p', {}, t('아직 손 든 사람이 없어요. 말하고 싶을 때 「손들기」를 눌러 주세요.')));
    body.replaceChildren(head, h('div', { class: 'zs-hands-me' }, inner), listEl);
  }

  const offs = [
    store.on('hands', () => { if (optimistic != null && (store.get('hands') || []).some(x => x.cid === me()) === optimistic) optimistic = null; paint(); }),
    store.on('role', paint),
    store.on('meeting', paint),
  ];
  paint();

  return {
    unmount() {
      alive = false;
      clearTimeout(settleTimer); settleTimer = 0;
      offs.forEach(f => f());
      const b = { ...(store.get('badges') || {}) }; delete b.hands; store.set('badges', b);
      listRoot.replaceChildren(); quickRoot.replaceChildren();
    },
  };
}
