// 쭘 조립·라우팅 — 팀 모듈을 자리에 붙이고 떼며, Firestore 구독을 store 에 넣는다.
// 약속: docs/meeting-2026-11-25/CONTRACTS.md. 팀 모듈 파일이 아직 없으면 그 자리에 「준비 중」만 둔다.
import * as api from './api.js';

// ================= store (CONTRACTS 3절) =================
function createStore(init = {}) {
  const state = { ...init };
  const subs = new Map();
  const fire = (k, v, prev) => {
    for (const fn of [...(subs.get(k) || [])]) {
      try { fn(v, prev); } catch (e) { console.warn('[zzoom] store 구독 오류', k, e); }
    }
  };
  return {
    get: k => state[k],
    set(k, v) { const prev = state[k]; state[k] = v; fire(k, v, prev); },
    patch(k, part) { const prev = state[k]; state[k] = { ...(prev || {}), ...(part || {}) }; fire(k, state[k], prev); },
    on(k, fn) { if (!subs.has(k)) subs.set(k, new Set()); subs.get(k).add(fn); return () => subs.get(k)?.delete(fn); },
    emit(name, data) { fire(name, data); }
  };
}
const INITIAL = {
  meeting: null, agenda: [], live: null, role: null, follow: 'follow', page: null, viewport: null,
  tool: { mode: 'view', tool: 'pen', color: '#E5484D', w: 0.004 },
  hands: [], chat: [], polls: [], transcript: [], people: [], counts: null,
  conn: { server: 'ok', firebase: 'off' }, badges: {}, side: { open: true, tab: 'chat' }
};
const store = createStore(INITIAL);
api.bindStore(store);
window.__zzoom = { store, api };   // 시험·디버그용(화면 기능에서 쓰지 말 것)

// ================= 팀 모듈 표 =================
// slot = 파일이 없을 때 「준비 중」을 둘 자리
const MODULES = {
  list: { file: 'list.js', slot: 'zz-list' },
  join: { file: 'join.js', slot: 'zz-join' },
  viewer: { file: 'viewer.js', slot: 'zz-stage-overlay' },
  draw: { file: 'draw.js', slot: 'zz-toolbar' },
  board: { file: 'board.js', slot: null },
  chat: { file: 'chat.js', slot: 'zz-side-chat' },
  hands: { file: 'hands.js', slot: 'zz-side-hands' },
  poll: { file: 'poll.js', slot: 'zz-side-poll' },
  record: { file: 'record.js', slot: 'zz-side-log' },
  host: { file: 'host.js', slot: 'zz-hostbar-main' },
  upload: { file: 'upload.js', slot: null }
};
const MEETING_ALL = ['viewer', 'draw', 'board', 'chat', 'hands', 'poll', 'record'];
const MEETING_HOST = ['host'];   // EASY_UX: 막대 「안건 올리기」는 뺐다(안건은 「오늘의 안건」의 「안건 추가」 한 길로, 팀 C 요청)

const $ = id => document.getElementById(id);
const loaded = new Map();     // name → Promise<module|null>
const mounted = new Map();    // name → {unmount}
const cssDone = new Set();

// AGENDA_OPEN(2026-11-25): 대기 화면 「오늘의 안건」 모듈. 자리 #zz-wait 는 무대(#zz-center) 위 덮개로 여기서 만든다.
// 보이기·숨기기(시작 전이거나 진행 화면이 비었을 때)와 크기 맞추기는 agenda.js 가 한다. 회의 참석자 모두에게 붙는다.
MODULES.agenda = { file: 'agenda.js', slot: null };
MEETING_ALL.push('agenda');
// EASY_UX(2026-11-26): 첫 입장 안내(3장). 회의에 들어온 모두에게 붙고, 보일지는 onboard.js 가 정한다.
MODULES.onboard = { file: 'onboard.js', slot: null };
MEETING_ALL.push('onboard');
(function ensureWaitSlot() {
  if ($('zz-wait')) return;
  const c = $('zz-center');
  if (!c) return;
  const w = document.createElement('section');
  w.id = 'zz-wait'; w.hidden = true; w.setAttribute('aria-label', '오늘의 안건');
  c.appendChild(w);
})();

function loadModule(name) {
  if (!loaded.has(name)) {
    loaded.set(name, import(`/zzoom/${MODULES[name].file}`).then(mod => {
      if (typeof mod.mount !== 'function') { console.warn(`[zzoom] ${MODULES[name].file} 에 mount 가 없습니다.`); return null; }
      if (mod.css && !cssDone.has(mod.css)) {
        cssDone.add(mod.css);
        const href = `/zzoom/${String(mod.css).replace(/^\/?(zzoom\/)?/, '')}`;
        // 아직 없는 css 를 붙이면 콘솔 오류가 나므로 형식을 먼저 확인한다
        fetch(href, { method: 'HEAD' }).then(r => {
          if (!r.ok || !/text\/css/.test(r.headers.get('Content-Type') || '')) { console.info(`[zzoom] ${href} 아직 없음`); cssDone.delete(mod.css); return; }
          const l = document.createElement('link');
          l.rel = 'stylesheet'; l.href = href;
          document.head.appendChild(l);
        }).catch(() => cssDone.delete(mod.css));
      }
      return mod;
    }).catch(e => { console.info(`[zzoom] ${MODULES[name].file} 아직 없음 또는 불러오기 실패:`, e?.message || e); return null; }));
  }
  return loaded.get(name);
}

function makeCtx() {
  return {
    api, store, mid: currentMid,
    el(id) { const e = $(id); if (!e) throw new Error(`쭘 자리 #${id} 가 없습니다.`); return e; },
    t: (s, vars) => vars ? String(s).replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m)) : String(s),
    assets: n => `/zzoom/assets/${n}.webp`,
    modal: openModal,
    toast: (text, kind) => store.emit('toast', { text, kind })
  };
}

let mountSeq = 0;
async function mountAll(names) {
  const seq = mountSeq;
  await Promise.all(names.map(async name => {
    if (mounted.has(name)) return;
    const mod = await loadModule(name);
    if (seq !== mountSeq || mounted.has(name)) return;   // 그사이 화면이 바뀜
    if (!mod) { placeholder(name); mounted.set(name, { unmount() { clearPlaceholder(name); } }); return; }
    try {
      const h = mod.mount(makeCtx()) || {};
      mounted.set(name, { unmount: typeof h.unmount === 'function' ? h.unmount : () => {} });
    } catch (e) {
      console.warn(`[zzoom] ${name} 붙이기 오류`, e);
      store.emit('toast', { text: '화면 일부를 띄우지 못했어요. 새로 고침해 주세요.', kind: 'error' });
    }
  }));
}
function unmountAll(names = [...mounted.keys()]) {
  for (const name of names) {
    const h = mounted.get(name);
    if (!h) continue;
    mounted.delete(name);
    try { h.unmount(); } catch (e) { console.warn(`[zzoom] ${name} 떼기 오류`, e); }
  }
}
function placeholder(name) {
  const slot = MODULES[name].slot && $(MODULES[name].slot);
  if (!slot || slot.childElementCount) return;
  const p = document.createElement('div');
  p.className = 'zz-pending'; p.dataset.zzPending = name; p.textContent = '준비 중';
  slot.appendChild(p);
}
function clearPlaceholder(name) { document.querySelectorAll(`[data-zz-pending="${name}"]`).forEach(e => e.remove()); }

// ================= 모달·토스트 =================
// 열린 창 목록. 화면을 옮기면 모두 닫고(감사 U17), 다른 분이 발표를 시작하면 발표 화면에 자리를 내준다(U16, 「화면은 무조건 발표자가 가져간다」).
// keep() 이 참인 창(입력 중인 안건 추가, 올리는 중인 자료)은 닫지 않고 작게 접어 입력값과 작업을 지킨다.
const openModals = new Set();
function openModal({ title = '', body = null, actions = [], onClose, keep } = {}) {
  const root = $('zz-modal-root');
  const back = document.createElement('div');
  back.className = 'zz-modal-back';
  const box = document.createElement('div');
  box.className = 'zz-modal'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true');
  if (title) { const h = document.createElement('h2'); h.textContent = title; box.appendChild(h); box.setAttribute('aria-label', title); }
  if (body) box.appendChild(body);
  let closed = false;
  let chip = null;
  const close = () => {
    if (closed) return; closed = true;
    openModals.delete(handle);
    back.remove(); document.removeEventListener('keydown', key);
    try { onClose && onClose(); } catch (e) { console.warn(e); }
  };
  let focusBtn = null;
  if (actions.length) {
    const row = document.createElement('div'); row.className = 'zz-modal-actions';
    for (const a of actions) {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'zz-btn' + (a.primary ? ' primary' : '') + (a.danger ? ' danger' : '');
      b.textContent = a.label;
      if (a.focus) focusBtn = b;
      b.addEventListener('click', async () => {
        if (!a.onClick) return close();
        b.disabled = true;
        try { const r = await a.onClick({ close }); if (r !== false) close(); }
        catch (e) { store.emit('toast', { text: e?.message || String(e), kind: 'error' }); }
        finally { b.disabled = false; }
      });
      row.appendChild(b);
    }
    box.appendChild(row);
  }
  const minimized = () => back.classList.contains('is-min');
  const key = e => { if (e.key === 'Escape' && !minimized()) close(); };
  back.addEventListener('click', e => { if (e.target === back && !minimized()) close(); });
  document.addEventListener('keydown', key);
  back.appendChild(box); root.appendChild(back);
  // 첫 초점: 단추에 focus 표시가 있으면 그 단추(발표 확인 창의 「아니오」, 감사 U18), 없으면 첫 입력 칸이나 단추
  const first = focusBtn || box.querySelector('input, select, textarea, button');
  if (first) setTimeout(() => { if (!closed && !minimized()) first.focus(); }, 0);
  const handle = {
    el: box, close,
    keep: () => { try { return typeof keep === 'function' ? !!keep() : false; } catch { return false; } },
    minimize() {
      if (closed || minimized()) return;
      back.classList.add('is-min');
      box.hidden = true;
      if (document.activeElement && box.contains(document.activeElement)) document.activeElement.blur();
      chip = document.createElement('button');
      chip.type = 'button'; chip.className = 'zz-btn zz-modal-chip';
      chip.textContent = `${title || '창'} 이어서 하기`;
      chip.setAttribute('aria-label', `접어 둔 「${title || '창'}」 창 다시 열기`);
      chip.addEventListener('click', () => handle.restore());
      back.appendChild(chip);
    },
    restore() {
      if (closed || !minimized()) return;
      back.classList.remove('is-min'); box.hidden = false;
      if (chip) { chip.remove(); chip = null; }
      const f = box.querySelector('input, select, textarea, button');
      if (f) f.focus();
    }
  };
  openModals.add(handle);
  return handle;
}
function closeAllModals() { for (const m of [...openModals]) m.close(); }
// 다른 분이 발표를 시작함 → 손으로 연 「오늘의 안건」, 열린 창, 덮개 서랍을 닫고 발표 화면을 보인다
function yieldToPresenter() {
  let folded = 0;
  for (const m of [...openModals]) {
    if (m.keep()) { m.minimize(); folded++; } else m.close();
  }
  if (compact()) {
    const s = store.get('side');
    if (s?.open) store.set('side', { ...s, open: false });
    $('zz-agenda')?.removeAttribute('data-open');
  }
  store.emit('cmd:yield', {});
  if (folded) store.emit('toast', { text: '다른 분이 발표를 시작했어요. 쓰던 창은 접어 두었어요.', kind: 'info' });
}
store.on('toast', d => {
  const box = $('zz-toast');
  if (!d || !d.text) return;
  const it = document.createElement('div');
  it.className = 'zz-toast-item ' + (d.kind || 'info');
  it.setAttribute('role', d.kind === 'error' ? 'alert' : 'status');
  it.textContent = d.text;
  box.appendChild(it);
  while (box.childElementCount > 3) box.firstElementChild.remove();
  setTimeout(() => it.remove(), d.kind === 'error' ? 6000 : 3500);
});

// ================= 머리줄·안내 =================
// 안내 띠는 한 번에 하나. 연결 안내(conn)는 다른 안내(오류)를 덮지 않고, 연결이 돌아오면 자기 것만 지운다.
let noticeOwner = '';
function notice(text, kind = '', owner = '') {
  const n = $('zz-notice');
  if (owner === 'conn' && noticeOwner && noticeOwner !== 'conn' && !n.hidden) return;
  if (!text) { if (owner && owner !== noticeOwner) return; n.hidden = true; n.textContent = ''; noticeOwner = ''; return; }
  n.className = kind; n.textContent = text; n.hidden = false; noticeOwner = owner || 'app';
}
// 연결 상태: 칩 대신 안내 띠(EASY_UX B4). 입장 직후 잠깐 「연결하는 중」은 띄우지 않고, 나쁜 상태가 몇 초 이어질 때만 띄운다.
let fbWasOk = false, connTimer = null;
function connBad() {
  const c = store.get('conn') || {};
  if (route.name !== 'meeting' || !store.get('role')) return false;
  if (c.server === 'off') return true;
  if (c.firebase === 'off' && fbWasOk) return true;
  if (c.firebase === 'connecting') return true;
  return false;
}
function renderConn() {
  const c = store.get('conn') || {};
  if (c.firebase === 'ok') fbWasOk = true;
  clearTimeout(connTimer); connTimer = null;
  if (!connBad()) { notice('', '', 'conn'); return; }
  const wait = c.firebase === 'connecting' && c.server !== 'off' ? 6000 : 2500;
  connTimer = setTimeout(() => { if (connBad()) notice('연결이 잠깐 끊겼어요. 다시 잇는 중이에요.', '', 'conn'); }, wait);
}
function renderStatus() {
  const box = $('zz-status');
  box.replaceChildren();
  const m = store.get('meeting');
  const chip = (text, cls, dot) => {
    const c = document.createElement('span'); c.className = 'zz-chip ' + (cls || '');
    if (dot) { const d = document.createElement('i'); d.className = 'zz-live-dot'; c.appendChild(d); }
    c.appendChild(document.createTextNode(text)); box.appendChild(c);
  };
  // EASY_UX B4: 회의 상태 칩 하나 + 녹음 중 + 내가 발표 중. 연결 상태는 칩이 아니라 안내 띠(renderConn).
  if (route.name === 'meeting' && m && !m.gone) {
    if (m.status === 'live') chip('회의 중', 'live', true);
    else if (m.status === 'ready') chip('시작 전');
    else if (m.status === 'ended') chip('끝난 회의');
    if (m.recording) chip('녹음 중', 'live rec', true);
    // 발표자 판정은 회의 문서로(role.presenter 는 늦게 따라올 수 있다, 팀 B 요청)
    const me = store.get('role')?.cid;
    if (m.status === 'live' && me && m.presenter?.cid === me) chip('내가 발표 중', 'me');
  }
}
['meeting', 'role'].forEach(k => store.on(k, renderStatus));
['conn', 'role'].forEach(k => store.on(k, renderConn));
store.on('meeting', m => {
  $('zz-meeting-title').textContent = route.name === 'meeting' && m && !m.gone ? (m.title || '') : '';
  document.title = route.name === 'meeting' && m?.title ? `${m.title} — 쭘 회의` : '쭘 회의';
  if (route.name === 'meeting' && m?.gone) notice('지워졌거나 보관 기한(10일)이 지난 회의예요. 목록으로 돌아가 주세요.', 'error');
  renderSide();
});
store.on('tool', t => document.body.classList.toggle('is-pen', t?.mode === 'pen'));

// ================= 옆칸 =================
const SIDE_TABS = [
  { id: 'chat', label: '채팅', icon: 'icon-chat' },
  { id: 'poll', label: '투표', icon: 'icon-poll' },
  { id: 'hands', label: '손 든 사람', icon: 'icon-hand' },
  { id: 'log', label: '녹음 기록', icon: 'icon-record' }
];
// 녹음 기록 탭: 담당자에게는 늘, 참석자에게는 녹음을 쓸 수 있는 회의에서만 보인다(EASY_UX B10)
function tabShown(id) {
  if (id !== 'log') return true;
  const m = store.get('meeting'), r = store.get('role');
  if (r?.role === 'host') return true;
  return !(m && m.allowRecording === false);
}
function buildSideTabs() {
  const bar = $('zz-side-tabs');
  bar.replaceChildren();
  for (const t of SIDE_TABS) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'zz-side-tab'; b.id = `zz-tab-${t.id}`;
    b.setAttribute('role', 'tab'); b.setAttribute('aria-controls', `zz-side-${t.id}`);
    b.innerHTML = `<img src="/zzoom/assets/${t.icon}.webp" alt=""><span></span><b class="zz-badge"></b>`;
    b.querySelector('span').textContent = t.label;
    b.addEventListener('click', () => {
      const s = store.get('side');
      store.set('side', { open: !(s.open && s.tab === t.id && compact()), tab: t.id });
    });
    bar.appendChild(b);
  }
}
const narrow = () => window.matchMedia('(max-width: 767.98px)').matches;
const COMPACT_Q = '(max-width: 1023.98px)';   // 1024px 미만: 안건·옆칸이 덮개, 처음엔 닫힘
const compact = () => window.matchMedia(COMPACT_Q).matches;
function renderSide() {
  const s = store.get('side') || {};
  if (!tabShown(s.tab)) { store.set('side', { ...s, tab: 'chat' }); return; }
  document.body.classList.toggle('side-closed', !s.open);
  for (const t of SIDE_TABS) {
    const on = t.id === s.tab;
    const tab = $(`zz-tab-${t.id}`);
    if (tab) { tab.setAttribute('aria-selected', String(on)); tab.hidden = !tabShown(t.id); }
    $(`zz-side-${t.id}`).hidden = !on;
  }
  $('zz-side-toggle').setAttribute('aria-pressed', String(!!s.open));
}
function renderBadges() {
  const b = store.get('badges') || {};
  for (const t of SIDE_TABS) { const e = $(`zz-tab-${t.id}`)?.querySelector('.zz-badge'); if (e) e.textContent = b[t.id] ? String(Math.min(99, b[t.id])) : ''; }
  // 머리줄 「채팅과 투표」 단추에도 새 글·새 투표 수(EASY_UX B4)
  const n = Math.min(99, (Number(b.chat) || 0) + (Number(b.poll) || 0));
  const tg = $('zz-side-toggle');
  const tb = tg?.querySelector('.zz-badge');
  if (tb) tb.textContent = n ? String(n) : '';
  if (tg) { if (n) tg.setAttribute('aria-label', `채팅과 투표, 새 소식 ${n}개`); else tg.removeAttribute('aria-label'); }
}
store.on('side', renderSide);
store.on('role', renderSide);
store.on('badges', renderBadges);

// ================= 회의 구독 → store =================
let unsubs = [];
let peopleOff = null;
function wireMeeting(mid) {
  unwire();
  let order = [];
  let agendaRaw = [];
  let seen = false, lastForce = 0, lastPc = null;
  const orderAgenda = () => {
    const byId = new Map(agendaRaw.map(a => [a.aid, a]));
    store.set('agenda', order.map(id => byId.get(id)).filter(Boolean));
  };
  unsubs.push(api.subscribeMeeting(mid, m => {
    store.set('meeting', m);
    if (m.gone) return;
    // 「화면은 무조건 발표자가 가져간다」: 다른 분이 새로 발표하거나(forceSeq 증가) 발표자가 바뀌면 내 화면을 비운다
    const l = m.live || null, pc = m.presenter?.cid || null, fs = Number(l?.forceSeq) || 0;
    const me = store.get('role')?.cid || null;
    if (seen && m.status === 'live' && l?.aid && pc && pc !== me && (fs > lastForce || pc !== lastPc)) yieldToPresenter();
    seen = true; lastForce = fs; lastPc = pc;
    const o = m.agendaOrder || [];
    if (o.join() !== order.join()) { order = o; orderAgenda(); }
    api.acceptLive(m.live || null);
    if (m.counts) store.set('counts', m.counts);
    syncPresenter();
  }));
  unsubs.push(api.subscribeAgenda(mid, list => { agendaRaw = list; orderAgenda(); }));
  unsubs.push(api.subscribeHands(mid, v => store.set('hands', v)));
  unsubs.push(api.subscribeChat(mid, v => store.set('chat', v)));
  unsubs.push(api.subscribePolls(mid, v => store.set('polls', v)));
  unsubs.push(api.subscribeTranscript(mid, v => store.set('transcript', v)));
}
function unwire() {
  unsubs.forEach(f => { try { f(); } catch { /* 무시 */ } });
  unsubs = [];
  if (peopleOff) { peopleOff(); peopleOff = null; }
}
function syncPresenter() {
  const r = store.get('role'), m = store.get('meeting');
  if (!r) return;
  const p = !!(m && m.presenter && m.presenter.cid === r.cid);
  if (p !== r.presenter) store.patch('role', { presenter: p });
  document.body.classList.toggle('is-presenter', p);
}

// ================= 라우팅 =================
let route = { name: 'list' };
let currentMid = null;
function parseRoute() {
  const m = /^#\/m\/([A-Za-z0-9_-]{4,64})$/.exec(location.hash || '');
  return m ? { name: 'meeting', mid: m[1] } : { name: 'list' };
}
let roleOff = null;
async function go() {
  const next = parseRoute();
  // 떠나기
  mountSeq++;
  closeAllModals();   // 화면을 옮기면 열린 창을 남기지 않는다(감사 U17)
  unmountAll();
  if (roleOff) { roleOff(); roleOff = null; }
  unwire();
  if (currentMid && (next.name !== 'meeting' || next.mid !== currentMid)) { await api.leave(currentMid).catch(() => {}); }
  for (const k of ['meeting', 'agenda', 'live', 'role', 'page', 'viewport', 'hands', 'chat', 'polls', 'transcript', 'people', 'counts']) store.set(k, INITIAL[k]);
  store.set('badges', {}); store.set('follow', 'follow');
  route = next; currentMid = next.mid || null; hostMounted = false;
  notice(''); fbWasOk = false; clearTimeout(connTimer); connTimer = null;
  const body = document.body;
  body.classList.toggle('route-list', route.name === 'list');
  body.classList.toggle('route-meeting', route.name === 'meeting');
  body.classList.remove('is-host', 'is-presenter');
  $('zz-meeting').hidden = route.name !== 'meeting';
  $('zz-join').hidden = true;
  $('zz-side-toggle').hidden = true;   // 회의에 들어간 뒤에만 보인다(onRole, EASY_UX B3)
  $('zz-list').replaceChildren();
  $('zz-gate').hidden = true;
  renderStatus();

  if (!api.authToken()) { showGate(); return; }
  const seq = mountSeq;
  const h = await api.health();
  if (seq !== mountSeq) return;
  if (!h.ok) {
    notice(h.firebase === false && h.redis === false && store.get('conn')?.server === 'off'
      ? '쭘 서버에 연결하지 못했어요. 잠시 뒤 다시 열어 주세요.'
      : '쭘 서버 설정이 아직 없어 회의를 열 수 없어요. 관리자에게 알려 주세요.', 'error');
    if (route.name === 'list') emptyList();
    return;
  }
  if (route.name === 'list') { await mountAll(['list']); return; }
  await enterMeeting(route.mid, seq);
}
function showGate() {
  $('zz-gate').hidden = false;
  $('zz-meeting').hidden = true;
}
function emptyList() {
  const box = document.createElement('div');
  box.className = 'zz-empty';
  box.innerHTML = '<img src="/zzoom/assets/empty-list.webp" alt=""><p></p>';
  box.querySelector('p').textContent = '지금은 회의 목록을 불러올 수 없어요.';
  $('zz-list').replaceChildren(box);
}
async function enterMeeting(mid, seq) {
  roleOff = store.on('role', r => onRole(mid, r));
  await mountAll(['join']);
  if (seq !== mountSeq) return;
  try {
    const r = await api.resume(mid);
    if (seq !== mountSeq) return;
    if (!r && !store.get('role')) $('zz-join').hidden = false;
  } catch (e) {
    if (seq !== mountSeq) return;
    if (e.code === 'login_required' || e.status === 401) { showGate(); return; }
    store.emit('toast', { text: e.message, kind: 'error' });
    $('zz-join').hidden = false;
  }
}
let hostMounted = false;
function onRole(mid, r) {
  const body = document.body;
  if (!r) {
    // 입장 전이거나 자격을 잃음 → 입장 화면으로
    unmountAll([...MEETING_ALL, ...MEETING_HOST]); hostMounted = false;
    unwire();
    body.classList.remove('is-host', 'is-presenter');
    $('zz-side-toggle').hidden = true;
    $('zz-join').hidden = false;
    return;
  }
  $('zz-join').hidden = true;
  $('zz-side-toggle').hidden = false;
  body.classList.toggle('is-host', r.role === 'host');
  if (!unsubs.length) wireMeeting(mid);
  syncPresenter();
  mountAll(MEETING_ALL);
  if (r.role === 'host' && !hostMounted) {
    hostMounted = true;
    if (!peopleOff) peopleOff = api.subscribePeople(mid, v => store.set('people', v));
    mountAll(MEETING_HOST);
  } else if (r.role !== 'host' && hostMounted) {
    hostMounted = false;
    unmountAll(MEETING_HOST);
    if (peopleOff) { peopleOff(); peopleOff = null; }
    store.set('people', []);
  }
}

// ================= 시작 =================
function boot() {
  buildSideTabs();
  if (compact()) store.set('side', { open: false, tab: 'chat' });
  renderSide();
  // 넓은 화면에서 좁은 화면으로 바뀌면 덮개를 닫는다(무대를 가리지 않게)
  window.matchMedia(COMPACT_Q).addEventListener?.('change', e => { if (e.matches) { const s = store.get('side'); store.set('side', { ...s, open: false }); $('zz-agenda').removeAttribute('data-open'); } });
  // 768~1023px 의 「안건」 단추(그보다 좁으면 2팀 쪽 막대 단추). 열림 표시는 2팀이 붙이는 data-open 을 따라간다.
  const ag = $('zz-agenda'), agBtn = $('zz-agenda-toggle');
  agBtn.addEventListener('click', () => { if (ag.hasAttribute('data-open')) ag.removeAttribute('data-open'); else ag.setAttribute('data-open', ''); });
  new MutationObserver(() => agBtn.setAttribute('aria-expanded', String(ag.hasAttribute('data-open')))).observe(ag, { attributes: true, attributeFilter: ['data-open'] });
  // 따라가기 띠 높이만큼 도구 막대를 내린다(띠를 가리지 않게)
  const fb = $('zz-follow-bar'), center = $('zz-center');
  const syncFollow = () => center.style.setProperty('--zz-follow-h', fb.offsetHeight + 'px');
  if (typeof ResizeObserver !== 'undefined') new ResizeObserver(syncFollow).observe(fb);
  new MutationObserver(syncFollow).observe(fb, { childList: true, subtree: true, attributes: true });
  syncFollow();
  $('zz-side-toggle').addEventListener('click', () => { const s = store.get('side'); store.set('side', { ...s, open: !s.open }); });
  window.addEventListener('hashchange', () => { go(); });
  window.addEventListener('storage', e => { if (e.key === 'airoom_auth_token') go(); });
  go();
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
