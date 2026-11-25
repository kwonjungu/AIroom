// 쭘 투표 (디자인 4). 자리: #zz-side-poll.
// 비공개 투표는 남의 선택을 어디에도 그리지 않는다. 내 선택(myVote)과 집계 숫자만 쓴다.
export const css = 'side.css';

const DEFAULT_OPTS = ['찬성', '반대', '보류'];

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

/** 지금 보여 줄 투표: 열린 것이 있으면 그것, 없으면 가장 나중에 만든 것. */
export function currentPoll(polls) {
  const l = polls || [];
  return l.slice().reverse().find(p => p.status === 'open') || l[l.length - 1] || null;
}

/** 결과로 보여 줄 숫자. reveal 전 숫자가 null 이면 null. 익명(ANON): 모든 투표가 비공개라 이름은 언제나 없다. */
export function resultView(poll, hostTally) {
  const src = poll.revealed ? poll.tally : (hostTally || null);
  const total = poll.revealed ? (poll.total || 0) : (hostTally ? Object.values(hostTally).reduce((a, b) => a + (+b || 0), 0) : 0);
  return { tally: src, total, names: null };
}

export function mount(ctx) {
  const { store, api, t } = ctx;
  const mid = ctx.mid;
  const root = ctx.el('zz-side-poll');
  const body = h('div', { class: 'zs-poll' });
  root.replaceChildren(body);

  let mine = {};          // pid -> optionId (내 선택만)
  let mineLoaded = {};    // pid -> true
  let hostTally = null;   // 주관자 실시간 숫자 {id:n}
  let tallyPid = null;
  let timer = null;
  let busy = false;
  let draft = { q: '', opts: DEFAULT_OPTS.slice() };
  let creating = false;
  let seenIds = new Set();
  let baselined = false;

  const isHost = () => store.get('role')?.role === 'host';
  const live = () => store.get('meeting')?.status === 'live';
  const sideOnPoll = () => { const s = store.get('side'); return !!(s && s.open && s.tab === 'poll'); };
  const visible = () => sideOnPoll() && !document.hidden;

  function setBadge(n) {
    const b = { ...(store.get('badges') || {}) };
    if (n > 0) b.poll = n; else delete b.poll;
    store.set('badges', b);
  }

  async function loadMine(p) {
    if (mineLoaded[p.pid]) return;
    mineLoaded[p.pid] = true;
    try { const r = await api.myVote(mid, p.pid); if (r && r.optionId) { mine[p.pid] = r.optionId; render(); } }
    catch (e) { mineLoaded[p.pid] = false; }
  }

  async function vote(p, optionId) {
    if (busy || p.status !== 'open') return;
    if (mine[p.pid] === optionId) return;
    const prev = mine[p.pid];
    busy = true; mine[p.pid] = optionId; render();
    try { await api.vote(mid, p.pid, optionId); }
    catch (e) {
      if (prev) mine[p.pid] = prev; else delete mine[p.pid];
      ctx.toast((e && e.message) || t('투표하지 못했어요'), 'error');
    } finally { busy = false; render(); }
  }

  async function act(fn, errText) {
    if (busy) return; busy = true; render();
    try { await fn(); }
    catch (e) { ctx.toast((e && e.message) || errText, 'error'); }
    finally { busy = false; render(); }
  }

  async function create() {
    const q = draft.q.trim();
    const options = draft.opts.map(s => s.trim()).filter(Boolean);
    if (!q) { ctx.toast(t('질문을 적어 주세요'), 'warn'); return; }
    if (options.length < 2) { ctx.toast(t('고를 것은 두 개 이상 필요해요'), 'warn'); return; }
    await act(async () => {
      await api.createPoll(mid, { q, options });
      draft = { q: '', opts: DEFAULT_OPTS.slice() }; creating = false;
    }, t('투표를 열지 못했어요'));
  }

  // 주관자 실시간 숫자: 투표 칸이 보이고 열린 투표가 있을 때만 3초마다
  async function pollTally() {
    const p = currentPoll(store.get('polls'));
    if (!isHost() || !p || p.revealed || !visible()) return;
    try {
      const r = await api.pollTally(mid, p.pid);
      if (r && r.tally) { hostTally = r.tally; tallyPid = p.pid; render(); }
    } catch (e) { /* 다음 주기에 다시 */ }
  }
  function syncTimer() {
    const p = currentPoll(store.get('polls'));
    const need = isHost() && p && !p.revealed && visible();
    if (need && !timer) { timer = setInterval(pollTally, 3000); pollTally(); }
    if (!need && timer) { clearInterval(timer); timer = null; }
  }

  function optionRow(p, o, view, canVote) {
    const myPick = mine[p.pid] === o.id;
    const n = view.tally ? (+view.tally[o.id] || 0) : null;
    const pct = n != null && view.total ? Math.round((n / view.total) * 100) : 0;
    const el = h(canVote ? 'button' : 'div', {
      type: canVote ? 'button' : null,
      class: 'zs-opt' + (myPick ? ' picked' : '') + (canVote ? ' votable' : ''),
      'aria-pressed': canVote ? String(myPick) : null,
      onclick: canVote ? () => vote(p, o.id) : null,
    },
      n != null ? h('span', { class: 'zs-bar', style: `width:${pct}%` }) : null,
      h('span', { class: 'zs-opt-label' }, o.label),
      myPick ? h('span', { class: 'zs-mine-tag' }, t('내 선택')) : null,
      n != null ? h('span', { class: 'zs-opt-n zz-num' }, `${n}${t('표')}`) : null);
    return h('div', { class: 'zs-opt-wrap' }, el);
  }

  function pollCard(p) {
    const host = isHost();
    const open = p.status === 'open';
    const view = resultView(p, p.pid === tallyPid ? hostTally : null);
    const canVote = open && live() && !p.revealed;
    const card = h('div', { class: 'zz-card zs-pollcard' },
      h('div', { class: 'zs-poll-head' },
        h('span', { class: 'zs-chip ' + (open ? 'live' : '') }, open ? t('투표 중') : t('투표 끝'))),
      h('h3', { class: 'zs-q' }, p.q));
    if (canVote && !mine[p.pid]) card.append(h('p', { class: 'zs-howto' }, t('하나를 눌러 골라 주세요.')));
    card.append(...p.options.map(o => optionRow(p, o, view, canVote)));

    if (open && mine[p.pid]) card.append(h('p', { class: 'zs-note' }, t('골랐어요. 다른 항목을 누르면 바꿀 수 있어요.')));
    if (open && host && view.tally) card.append(h('p', { class: 'zs-note zz-num' }, `${t('지금까지')} ${view.total}${t('명')}`));
    if (!open && !p.revealed && !host) card.append(h('p', { class: 'zs-note' }, t('투표가 끝났어요. 회의 담당자가 결과를 보여 주면 여기에 나와요.')));
    if (p.revealed) card.append(h('p', { class: 'zs-note zz-num' }, `${t('총')} ${p.total || 0}${t('표')}`));

    card.append(h('p', { class: 'zs-fine' }, t('한 사람이 하나만 고를 수 있어요. 누가 무엇을 골랐는지는 아무도 몰라요.')));

    if (host) {
      const bar = h('div', { class: 'zs-poll-actions' });
      if (open) bar.append(h('button', { type: 'button', class: 'zz-btn', disabled: busy, onclick: () => act(() => api.closePoll(mid, p.pid), t('투표를 끝내지 못했어요')) }, t('투표 끝내기')));
      if (!p.revealed) bar.append(h('button', { type: 'button', class: 'zz-btn primary', disabled: busy, onclick: () => act(async () => { await api.revealPoll(mid, p.pid); }, t('결과를 보여 주지 못했어요')) }, t('결과 모두에게 보여 주기')));
      card.append(bar);
    }
    return card;
  }

  function createForm() {
    const q = h('input', { class: 'zs-field', id: 'zs-newpoll-q', type: 'text', maxlength: '200', value: draft.q, placeholder: t('예: 체육대회 날짜를 이대로 정할까요?'), 'aria-label': t('질문') });
    q.addEventListener('input', () => { draft.q = q.value; });
    const rows = draft.opts.map((v, i) => {
      const inp = h('input', { class: 'zs-field', type: 'text', maxlength: '40', value: v, 'aria-label': `${t('고를 것')} ${i + 1}` });
      inp.addEventListener('input', () => { draft.opts[i] = inp.value; });
      return h('div', { class: 'zs-optrow' }, inp,
        draft.opts.length > 2 ? h('button', { type: 'button', class: 'zz-btn ghost zs-mini', onclick: () => { draft.opts.splice(i, 1); render(); } }, t('빼기')) : null);
    });
    return h('div', { class: 'zz-card zs-pollcard' },
      h('h3', { class: 'zs-q' }, t('새 투표')),
      h('label', { class: 'zs-label', for: 'zs-newpoll-q' }, t('질문')), q,
      h('p', { class: 'zs-label' }, t('고를 것')), ...rows,
      draft.opts.length < 6 ? h('button', { type: 'button', class: 'zz-btn ghost zs-mini', onclick: () => { draft.opts.push(''); render(); } }, t('고를 것 더하기')) : null,
      h('p', { class: 'zs-note' }, t('누가 무엇을 골랐는지는 아무도 볼 수 없어요')),
      h('div', { class: 'zs-poll-actions' },
        h('button', { type: 'button', class: 'zz-btn ghost', onclick: () => { creating = false; render(); } }, t('취소')),
        h('button', { type: 'button', class: 'zz-btn primary', disabled: busy || !live(), onclick: create }, t('투표 시작하기'))),
      live() ? null : h('p', { class: 'zs-note' }, t('회의가 시작되면 투표를 시작할 수 있어요')));
  }

  function render() {
    const p = currentPoll(store.get('polls'));
    const host = isHost();
    const kids = [];
    const focus = document.activeElement;
    const keepFocus = focus && body.contains(focus) && focus.getAttribute ? focus.getAttribute('aria-label') : null;
    if (host && creating) kids.push(createForm());
    else {
      if (p) { loadMine(p); kids.push(pollCard(p)); }
      else kids.push(h('div', { class: 'zs-empty' }, h('img', { class: 'zz-icon', src: ctx.assets('icon-poll'), alt: '' }),
        h('p', {}, host ? t('아직 투표가 없어요. 「새 투표 만들기」로 열어 보세요.') : t('지금 열린 투표가 없어요. 투표가 열리면 알려 드려요.'))));
      if (host && (!p || p.status !== 'open')) {
        kids.push(h('button', { type: 'button', class: 'zz-btn primary zs-newpoll', onclick: () => { creating = true; render(); } }, t('새 투표 만들기')));
      }
    }
    body.replaceChildren(...kids);
    if (keepFocus) { const f = body.querySelector(`[aria-label="${keepFocus}"]`); if (f) f.focus(); }
    syncTimer();
  }

  function onPolls(polls) {
    const list = polls || [];
    const open = list.filter(p => p.status === 'open');
    if (!baselined) { baselined = true; seenIds = new Set(list.map(p => p.pid)); }
    // 새로 열린 투표가 있고 투표 칸이 닫혀 있으면 알림 숫자 1
    const fresh = open.filter(p => !seenIds.has(p.pid) && !mine[p.pid]);
    list.forEach(p => seenIds.add(p.pid));
    if (!isHost() && fresh.length && !sideOnPoll()) {
      setBadge(1);
      // 쉬운 화면(B10): 옆칸이 닫힌 태블릿과 휴대폰에서도 알 수 있게 한 번 알린다
      ctx.toast(t('새 투표가 열렸어요. 「채팅과 투표」에서 골라 주세요.'), 'info');
    }
    if (sideOnPoll() || !open.length) setBadge(0);
    render();
  }

  const offs = [
    store.on('polls', onPolls),
    store.on('role', () => { hostTally = null; tallyPid = null; render(); }),
    store.on('meeting', render),
    store.on('side', () => { if (sideOnPoll()) setBadge(0); render(); }),
  ];
  const onVis = () => syncTimer();
  document.addEventListener('visibilitychange', onVis);
  const first = store.get('polls');
  if (first) { baselined = true; seenIds = new Set(first.map(p => p.pid)); }
  render();

  return {
    unmount() {
      offs.forEach(f => f());
      document.removeEventListener('visibilitychange', onVis);
      if (timer) clearInterval(timer);
      mine = {}; hostTally = null;
      const b = { ...(store.get('badges') || {}) }; delete b.poll; store.set('badges', b);
      root.replaceChildren();
    },
  };
}
