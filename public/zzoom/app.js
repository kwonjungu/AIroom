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
const MEETING_HOST = ['host', 'upload'];

const $ = id => document.getElementById(id);
const loaded = new Map();     // name → Promise<module|null>
const mounted = new Map();    // name → {unmount}
const cssDone = new Set();

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
      store.emit('toast', { text: `화면 일부(${name})를 띄우지 못했습니다.`, kind: 'error' });
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
function openModal({ title = '', body = null, actions = [], onClose } = {}) {
  const root = $('zz-modal-root');
  const back = document.createElement('div');
  back.className = 'zz-modal-back';
  const box = document.createElement('div');
  box.className = 'zz-modal'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true');
  if (title) { const h = document.createElement('h2'); h.textContent = title; box.appendChild(h); box.setAttribute('aria-label', title); }
  if (body) box.appendChild(body);
  let closed = false;
  const close = () => {
    if (closed) return; closed = true;
    back.remove(); document.removeEventListener('keydown', key);
    try { onClose && onClose(); } catch (e) { console.warn(e); }
  };
  if (actions.length) {
    const row = document.createElement('div'); row.className = 'zz-modal-actions';
    for (const a of actions) {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'zz-btn' + (a.primary ? ' primary' : '') + (a.danger ? ' danger' : '');
      b.textContent = a.label;
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
  const key = e => { if (e.key === 'Escape') close(); };
  back.addEventListener('click', e => { if (e.target === back) close(); });
  document.addEventListener('keydown', key);
  back.appendChild(box); root.appendChild(back);
  const first = box.querySelector('input, select, textarea, button');
  if (first) setTimeout(() => first.focus(), 0);
  return { el: box, close };
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
function notice(text, kind = '') {
  const n = $('zz-notice');
  if (!text) { n.hidden = true; n.textContent = ''; return; }
  n.className = kind; n.textContent = text; n.hidden = false;
}
function renderStatus() {
  const box = $('zz-status');
  box.replaceChildren();
  const m = store.get('meeting');
  const conn = store.get('conn') || {};
  const chip = (text, cls, dot) => {
    const c = document.createElement('span'); c.className = 'zz-chip ' + (cls || '');
    if (dot) { const d = document.createElement('i'); d.className = 'zz-live-dot'; c.appendChild(d); }
    c.appendChild(document.createTextNode(text)); box.appendChild(c);
  };
  if (route.name === 'meeting' && m && !m.gone) {
    if (m.status === 'live') chip('진행 중', 'live', true);
    else if (m.status === 'ready') chip('시작 전');
    else if (m.status === 'ended') chip('끝난 회의');
    if (m.recording) chip('녹음 중', 'live', true);
  }
  if (route.name === 'meeting' && store.get('role')) {
    if (conn.server === 'off') chip('연결 확인 중', 'warn');
    else if (conn.firebase === 'connecting') chip('연결하는 중', 'warn');
    else if (conn.firebase === 'off') chip('실시간 끊김', 'warn');
  }
}
['meeting', 'conn', 'role'].forEach(k => store.on(k, renderStatus));
store.on('meeting', m => {
  $('zz-meeting-title').textContent = route.name === 'meeting' && m && !m.gone ? (m.title || '') : '';
  document.title = route.name === 'meeting' && m?.title ? `${m.title} — 쭘` : '쭘';
  if (route.name === 'meeting' && m?.gone) notice('삭제됐거나 기한(10일)이 지난 회의입니다. 목록으로 돌아가 주세요.', 'error');
});
store.on('tool', t => document.body.classList.toggle('is-pen', t?.mode === 'pen'));

// ================= 옆칸 =================
const SIDE_TABS = [
  { id: 'chat', label: '채팅', icon: 'icon-chat' },
  { id: 'poll', label: '투표', icon: 'icon-poll' },
  { id: 'hands', label: '손', icon: 'icon-hand' },
  { id: 'log', label: '기록', icon: 'icon-record' }
];
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
  document.body.classList.toggle('side-closed', !s.open);
  for (const t of SIDE_TABS) {
    const on = t.id === s.tab;
    $(`zz-tab-${t.id}`)?.setAttribute('aria-selected', String(on));
    $(`zz-side-${t.id}`).hidden = !on;
  }
  $('zz-side-toggle').setAttribute('aria-pressed', String(!!s.open));
}
function renderBadges() {
  const b = store.get('badges') || {};
  for (const t of SIDE_TABS) { const e = $(`zz-tab-${t.id}`)?.querySelector('.zz-badge'); if (e) e.textContent = b[t.id] ? String(Math.min(99, b[t.id])) : ''; }
}
store.on('side', renderSide);
store.on('badges', renderBadges);

// ================= 회의 구독 → store =================
let unsubs = [];
let peopleOff = null;
function wireMeeting(mid) {
  unwire();
  let order = [];
  let agendaRaw = [];
  const orderAgenda = () => {
    const byId = new Map(agendaRaw.map(a => [a.aid, a]));
    store.set('agenda', order.map(id => byId.get(id)).filter(Boolean));
  };
  unsubs.push(api.subscribeMeeting(mid, m => {
    store.set('meeting', m);
    if (m.gone) return;
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
  unmountAll();
  if (roleOff) { roleOff(); roleOff = null; }
  unwire();
  if (currentMid && (next.name !== 'meeting' || next.mid !== currentMid)) { await api.leave(currentMid).catch(() => {}); }
  for (const k of ['meeting', 'agenda', 'live', 'role', 'page', 'viewport', 'hands', 'chat', 'polls', 'transcript', 'people', 'counts']) store.set(k, INITIAL[k]);
  store.set('badges', {}); store.set('follow', 'follow');
  route = next; currentMid = next.mid || null; hostMounted = false;
  notice('');
  const body = document.body;
  body.classList.toggle('route-list', route.name === 'list');
  body.classList.toggle('route-meeting', route.name === 'meeting');
  body.classList.remove('is-host', 'is-presenter');
  $('zz-meeting').hidden = route.name !== 'meeting';
  $('zz-join').hidden = true;
  $('zz-side-toggle').hidden = route.name !== 'meeting';
  $('zz-list').replaceChildren();
  $('zz-gate').hidden = true;
  renderStatus();

  if (!api.authToken()) { showGate(); return; }
  const seq = mountSeq;
  const h = await api.health();
  if (seq !== mountSeq) return;
  if (!h.ok) {
    notice(h.firebase === false && h.redis === false && store.get('conn')?.server === 'off'
      ? '쭘 서버에 연결하지 못했습니다. 잠시 뒤 다시 열어 주세요.'
      : '쭘 서버 설정(Firebase 서비스 계정과 저장소)이 아직 없어 회의를 열 수 없습니다. 관리자에게 알려 주세요.', 'error');
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
  box.querySelector('p').textContent = '지금은 회의 목록을 불러올 수 없습니다.';
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
    $('zz-join').hidden = false;
    return;
  }
  $('zz-join').hidden = true;
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
