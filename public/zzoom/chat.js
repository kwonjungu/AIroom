// 쭘 옆칸 채팅 (디자인 4). 자리: #zz-side-chat. fetch·Firebase 는 ctx.api 로만.
export const css = 'side.css';

const MAX = 500;
const GAP_MS = 1000;

/** 시각 값을 밀리초로. Firestore Timestamp·{seconds}·숫자·Date 모두 받는다. */
export function toMs(at) {
  if (at == null) return null;
  if (typeof at === 'number') return at;
  if (at instanceof Date) return at.getTime();
  if (typeof at.toMillis === 'function') return at.toMillis();
  if (typeof at.seconds === 'number') return at.seconds * 1000;
  if (typeof at._seconds === 'number') return at._seconds * 1000;
  return null;
}

export function clockText(at) {
  const ms = toMs(at);
  if (ms == null) return '';
  const d = new Date(ms);
  return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
}

/** 붙인 쪽의 말: 「2번 안건 5쪽」 */
export function refLabel(agenda, ref) {
  const i = (agenda || []).findIndex(a => a.aid === ref.aid);
  const name = i >= 0 ? `${i + 1}번 안건` : '안건';
  return `${name} ${ref.page}쪽`;
}

/** 서버가 준 글과 아직 안 돌아온 내 글을 합친다. 같은 글이 돌아왔으면 내 임시 글은 숨긴다. */
export function mergeMessages(list, pending) {
  const claimed = new Set();
  const out = list.slice();
  for (const p of pending) {
    const byId = p.id && list.some(m => m.id === p.id);
    let byText = false;
    if (!byId) {
      const hit = list.find(m => !claimed.has(m.id) && m.cid === p.cid && m.text === p.text && (toMs(m.at) ?? Infinity) >= p.at - 10000);
      if (hit) { claimed.add(hit.id); byText = true; }
    }
    if (!byId && !byText) out.push({ id: p.tmp, cid: p.cid, text: p.text, ref: p.ref, at: p.at, _p: p });
  }
  return out;
}

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

export function mount(ctx) {
  const { store, api, t } = ctx;
  const root = ctx.el('zz-side-chat');
  const mid = ctx.mid;
  let pending = [];
  let lastSendAt = 0;
  let attach = false;
  let unread = 0;
  let baselined = false;
  let lastSeenId = null;
  let nearBottom = true;
  const mountedAt = Date.now();
  const timers = new Set();
  let seq = 0;

  const list = h('div', { class: 'zs-chat-list', role: 'log', 'aria-live': 'polite', 'aria-label': t('채팅 글') });
  const fresh = h('button', { type: 'button', class: 'zz-btn zs-newbtn', hidden: true, onclick: () => { scrollEnd(); } }, t('새 글 보기'));
  // 쉬운 화면(B10): 「보고 있는 쪽도 함께 보내기」는 입력 칸 아래 작은 확인 칸
  const attachBtn = h('input', { type: 'checkbox', class: 'zs-attach', id: 'zs-attach', onchange: toggleAttach });
  const attachText = h('span', { class: 'zs-attach-text' });
  const attachRow = h('label', { class: 'zs-check zs-attach-row', for: 'zs-attach' }, attachBtn, attachText);
  const ta = h('textarea', { class: 'zs-input', rows: '2', maxlength: String(MAX), placeholder: t('글을 입력해 주세요'), 'aria-label': t('채팅 입력') });
  const count = h('span', { class: 'zs-count zz-num' }, `0/${MAX}`);
  const hint = h('span', { class: 'zs-hint', role: 'status' });
  const sendBtn = h('button', { type: 'submit', class: 'zz-btn primary zs-send' }, t('보내기'));
  const form = h('form', { class: 'zs-composer', onsubmit: e => { e.preventDefault(); send(); } },
    ta, attachRow, h('div', { class: 'zs-foot' }, hint, count, sendBtn));
  root.replaceChildren(h('div', { class: 'zs-chat' }, list, fresh, form));

  ta.addEventListener('input', () => { count.textContent = `${ta.value.length}/${MAX}`; hint.textContent = ''; });
  ta.addEventListener('keydown', e => {
    // 한글 조합 중 Enter 는 보내기가 아니다
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing && e.keyCode !== 229) { e.preventDefault(); send(); }
  });
  list.addEventListener('scroll', () => {
    nearBottom = list.scrollHeight - list.scrollTop - list.clientHeight < 40;
    if (nearBottom) fresh.hidden = true;
  });

  function curRef() {
    const p = store.get('page') || store.get('live');
    return p && p.aid && p.page ? { aid: p.aid, page: p.page } : null;
  }
  function isHost() { return store.get('role')?.role === 'host'; }
  function myCid() { return store.get('role')?.cid; }
  function locked() { const m = store.get('meeting'); return !!(m && (m.status === 'ended' || m.gone)); }
  function sideOnChat() { const s = store.get('side'); return !!(s && s.open && s.tab === 'chat'); }

  function toggleAttach() {
    attach = !!curRef() && attachBtn.checked;
    paintComposer();
  }

  function paintComposer() {
    const ref = curRef();
    if (!ref) attach = false;
    attachBtn.disabled = !ref || locked();
    attachBtn.checked = attach;
    attachRow.classList.toggle('on', attach);
    attachRow.hidden = !ref || locked();
    attachText.textContent = ref ? `${t('보고 있는 쪽도 함께 보내기')} (${refLabel(store.get('agenda'), ref)})` : t('보고 있는 쪽도 함께 보내기');
    const lk = locked();
    ta.disabled = lk; sendBtn.disabled = lk;
    ta.placeholder = lk ? t('회의가 끝나서 글을 쓸 수 없어요') : t('글을 입력해 주세요');
  }

  function setUnread(n) {
    unread = n;
    const b = { ...(store.get('badges') || {}) };
    if (n > 0) b.chat = n; else delete b.chat;
    store.set('badges', b);
  }

  function send() {
    const text = ta.value.trim();
    if (!text || locked()) return;
    if (Date.now() - lastSendAt < GAP_MS) { hint.textContent = t('잠시 뒤에 다시 보내 주세요'); return; }
    const ref = attach ? curRef() : null;
    const role = store.get('role') || {};
    const p = { tmp: 'tmp' + (++seq), text, ref, at: Date.now(), cid: role.cid, state: 'sending', id: null };
    pending.push(p);
    ta.value = ''; count.textContent = `0/${MAX}`; hint.textContent = '';
    attach = false; paintComposer();
    nearBottom = true;
    deliver(p);
    render();
  }

  async function deliver(p) {
    p.state = 'sending'; lastSendAt = Date.now();
    try {
      const r = await api.sendChat(mid, p.text, p.ref || undefined);
      p.id = r && r.id; p.state = 'sent';
      const tm = setTimeout(() => { timers.delete(tm); pending = pending.filter(x => x !== p); render(); }, 10000);
      timers.add(tm);
    } catch (e) {
      p.state = 'failed'; p.err = e && e.message;
      if (e && e.status === 409 && e.message) ctx.toast(e.message, 'warn');
    }
    render();
  }

  function retry(p) { deliver(p); render(); }
  function discard(p) { pending = pending.filter(x => x !== p); render(); }

  async function removeMsg(m) {
    try { await api.deleteChat(mid, m.id); }
    catch (e) { ctx.toast((e && e.message) || t('지우지 못했어요'), 'error'); }
  }

  function render() {
    const all = mergeMessages(store.get('chat') || [], pending);
    const host = isHost(), me = myCid(), agenda = store.get('agenda');
    const keep = list.scrollTop;
    const items = all.map(m => {
      const mine = m.cid === me;
      const p = m._p;
      const row = h('div', { class: 'zs-msg' + (mine ? ' mine' : '') + (p ? ' pending' : '') + (p && p.state === 'failed' ? ' failed' : ''), 'data-id': m.id },
        h('div', { class: 'zs-msg-head' },
          mine ? h('span', { class: 'zs-name' }, t('나')) : null,   // 익명(ANON): 내 글만 「나」, 남의 글은 표시 없음
          h('span', { class: 'zs-time zz-num' }, p ? (p.state === 'sending' ? t('보내는 중') : '') : clockText(m.at))),
        h('div', { class: 'zs-text' }, m.text));
      if (m.ref && m.ref.aid) {
        row.append(h('button', { type: 'button', class: 'zs-ref', onclick: () => store.emit('cmd:nav', { aid: m.ref.aid, page: m.ref.page }) },
          h('img', { class: 'zz-icon zs-ref-ic', src: ctx.assets('icon-follow'), alt: '' }), refLabel(agenda, m.ref) + t(' 보기')));
      }
      if (p && p.state === 'failed') {
        row.append(h('div', { class: 'zs-fail' },
          h('span', {}, t('보내지 못했어요')),
          h('button', { type: 'button', class: 'zz-btn zs-mini', onclick: () => retry(p) }, t('다시 보내기')),
          h('button', { type: 'button', class: 'zz-btn ghost zs-mini', onclick: () => discard(p) }, t('버리기'))));
      } else if (!p && (mine || host)) {
        row.append(h('button', { type: 'button', class: 'zz-btn ghost zs-mini zs-del', 'aria-label': mine ? t('내 글 지우기') : t('글 지우기'), onclick: () => removeMsg(m) }, t('지우기')));
      }
      return row;
    });
    if (!items.length) {
      list.replaceChildren(h('div', { class: 'zs-empty' }, h('img', { class: 'zz-icon', src: ctx.assets('icon-chat'), alt: '' }), h('p', {}, t('아직 글이 없어요. 첫 글을 남겨 보세요.'))));
    } else {
      list.replaceChildren(...items);
    }
    if (nearBottom) scrollEnd(); else list.scrollTop = keep;
  }

  function scrollEnd() { list.scrollTop = list.scrollHeight; fresh.hidden = true; nearBottom = true; }

  function onChat(msgs) {
    msgs = msgs || [];
    const lastId = msgs.length ? msgs[msgs.length - 1].id : null;
    if (!baselined) {
      // 처음 받는 목록(최근 200개)은 안 읽은 글로 세지 않는다
      baselined = true; lastSeenId = lastId;
    } else if (sideOnChat()) {
      setUnread(0); lastSeenId = lastId;
    } else {
      const me = myCid();
      const idx = lastSeenId ? msgs.findIndex(m => m.id === lastSeenId) : -1;
      const fresh_ = (idx >= 0 ? msgs.slice(idx + 1) : msgs.slice(-Math.max(0, msgs.length))).filter(m => m.cid !== me);
      if (idx >= 0 && fresh_.length) setUnread(unread + fresh_.length);
      lastSeenId = lastId;
    }
    if (!nearBottom && msgs.length) fresh.hidden = false;
    render();
  }

  const offs = [
    store.on('chat', onChat),
    store.on('role', () => { render(); paintComposer(); }),
    store.on('page', paintComposer),
    store.on('live', paintComposer),
    store.on('agenda', () => { render(); paintComposer(); }),
    store.on('meeting', () => { paintComposer(); }),
    store.on('side', () => {
      if (sideOnChat()) { setUnread(0); const c = store.get('chat') || []; lastSeenId = c.length ? c[c.length - 1].id : lastSeenId; scrollEnd(); }
    }),
  ];

  // 붙이는 시점에 이미 있는 목록은 기준으로 삼는다. 비어 있으면 첫 이벤트를 기준으로 본다.
  const first = store.get('chat');
  if (first && first.length) { baselined = true; lastSeenId = first[first.length - 1].id; }
  else {
    const tm = setTimeout(() => { timers.delete(tm); baselined = true; }, 0);
    timers.add(tm);
    baselined = false;
    // 첫 이벤트가 1.5초 안에 오면 기준으로 삼고, 그 뒤부터 센다
    const cut = setTimeout(() => { timers.delete(cut); baselined = true; }, 1500);
    timers.add(cut);
  }
  paintComposer(); render();
  void mountedAt;

  return {
    unmount() {
      offs.forEach(f => f());
      timers.forEach(clearTimeout); timers.clear();
      const b = { ...(store.get('badges') || {}) }; delete b.chat; store.set('badges', b);
      root.replaceChildren();
    },
  };
}
