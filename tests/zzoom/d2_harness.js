// D2 화면 시험용 받침: 진짜 index.html·zzoom.css·viewer.js 에 가짜 store·api 를 붙인다(서버·Firebase 없음).
// window.__d2.mount(opts) / unmount() / store / log 를 시험이 부른다.
const COLORS = ['#d93025', '#188038', '#1a73e8', '#f9ab00', '#9334e6', '#00838f', '#e8710a', '#5f6368'];
export const pageColor = (aid, p) => COLORS[((aid.charCodeAt(1) || 0) + p) % COLORS.length];

function createStore(init = {}) {
  const state = { ...init };
  const subs = new Map();
  const fire = (k, v, prev) => { for (const fn of [...(subs.get(k) || [])]) { try { fn(v, prev); } catch (e) { console.error('store 구독 오류', k, e); } } };
  const s = {
    get: k => state[k],
    set(k, v) { const prev = state[k]; state[k] = v; fire(k, v, prev); },
    patch(k, part) { const prev = state[k]; state[k] = { ...(prev || {}), ...(part || {}) }; fire(k, state[k], prev); },
    on(k, fn) { if (!subs.has(k)) subs.set(k, new Set()); subs.get(k).add(fn); return () => subs.get(k)?.delete(fn); },
    emit(name, data) { log.events.push([name, data]); fire(name, data); },
    count: () => [...subs.values()].reduce((n, x) => n + x.size, 0),
  };
  return s;
}

const log = { img: [], release: [], live: [], events: [], toasts: [] };
const delays = {};       // 'aid:p' → ms
let liveMode = 'ok';     // ok | stale | fail
let staleLive = null;

async function makeImage(a, p, thumb) {
  const [w, h] = (a.sizes?.[p - 1]) || [800, 600];
  const c = document.createElement('canvas');
  c.width = thumb ? Math.round(w / 8) : w; c.height = thumb ? Math.round(h / 8) : h;
  const g = c.getContext('2d');
  g.fillStyle = pageColor(a.aid, p); g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = '#fff'; g.font = `bold ${Math.round(c.height / 8)}px sans-serif`;
  g.fillText(`${a.title} ${p}`, c.width * 0.05, c.height * 0.15);
  const blob = await new Promise(r => c.toBlob(r, 'image/png'));
  return URL.createObjectURL(blob);
}

class ZzError extends Error { constructor(status, code, message, extra) { super(message); this.status = status; this.code = code; this.extra = extra; } }

let store = null;
const api = {
  pageImageUrl(a, p, { thumb = false } = {}) {
    log.img.push(`${a.aid}:${p}${thumb ? ':t' : ''}`);
    if (!a || a.kind === 'board') return Promise.resolve(null);
    const d = delays[`${a.aid}:${p}`] || 0;
    return new Promise(r => setTimeout(r, d)).then(() => makeImage(a, p, thumb));
  },
  releaseImages(keep) { log.release.push((keep || []).length); },
  originalBlob: async () => new Blob(['원본'], { type: 'application/pdf' }),
  async sendLive(mid, body) {
    log.live.push({ ...body, t: performance.now() });
    await new Promise(r => setTimeout(r, 40));
    if (liveMode === 'stale') { liveMode = 'ok'; store.set('live', staleLive); throw new ZzError(409, 'stale_rev', '진행 상태가 이미 바뀌었습니다.', { live: staleLive }); }
    if (liveMode === 'fail') throw new ZzError(0, 'network', '연결 끊김');
    const cur = store.get('live') || { rev: 0, epoch: 1, forceSeq: 0 };
    const live = { ...cur, aid: body.aid, page: body.page, view: body.view, rev: (cur.rev || 0) + 1, forceSeq: (cur.forceSeq || 0) + (body.force ? 1 : 0), at: Date.now() };
    store.set('live', live);
    return { live };
  },
};

export const AGENDA = [
  { aid: 'a1', title: '학교 운영 계획', kind: 'pdf', pages: 5, sizes: Array(5).fill([1000, 1414]), base: 'zz/m/a1', ver: 1, original: { path: 'zz/m/a1/orig.pdf', name: '운영계획.pdf' } },
  { aid: 'a2', title: '행사 사진', kind: 'image', pages: 2, sizes: [[1600, 900], [1600, 900]], base: 'zz/m/a2', ver: 1 },
  { aid: 'b1', title: '화이트보드 1', kind: 'board', pages: 2, bg: 'grid', ver: 1 },
];

let handle = null;
async function mount(opts = {}) {
  // 진짜 app.js 처럼 1024 미만에서는 옆칸 서랍을 닫은 채 시작한다
  if (window.matchMedia('(max-width: 1023.98px)').matches) document.body.classList.add('side-closed');
  if (opts.delays) Object.assign(delays, opts.delays);
  store = createStore({
    meeting: opts.meeting || { id: 'm1', status: 'live', presenter: { cid: 'h1', name: '주관', epoch: 1 } },
    agenda: opts.agenda || AGENDA,
    live: 'live' in opts ? opts.live : { aid: 'a1', page: 1, view: { cx: 0.5, cy: 0.5, z: 1 }, rev: 1, epoch: 1, forceSeq: 2, at: 1 },
    role: opts.role || { role: 'viewer', cid: 'v1', name: '참석', presenter: false },
    tool: { mode: 'view', tool: 'pen', color: '#E5484D', w: 0.004 },
    follow: 'follow', page: null, viewport: null,
  });
  store.on('tool', t => document.body.classList.toggle('is-pen', t?.mode === 'pen'));
  store.on('toast', d => log.toasts.push(d));
  window.__d2.store = store;
  const mod = await import('/zzoom/viewer.js');
  const ctx = {
    api, store, mid: 'm1',
    el: id => { const e = document.getElementById(id); if (!e) throw new Error('자리 없음 ' + id); return e; },
    t: (s, v) => (v ? s.replace(/\{(\w+)\}/g, (_, k) => (k in v ? v[k] : `{${k}}`)) : s),
    assets: n => `/zzoom/assets/${n}.webp`,
    toast: (text, kind) => store.emit('toast', { text, kind }),
    modal: () => ({ el: null, close() {} }),
  };
  handle = mod.mount(ctx);
  return true;
}
function unmount() { handle?.unmount(); handle = null; return store.count(); }

// 화면 틀: 회의 화면만 보이게, 다른 팀 자리에는 표시만 둔다
document.body.classList.remove('route-list');
document.body.classList.add('route-meeting');
document.getElementById('zz-meeting').hidden = false;
document.getElementById('zz-list').hidden = true;
document.getElementById('zz-board-actions').innerHTML = '<span class="zz-chip" id="mark-board">3팀 자리</span>';
document.getElementById('zz-quick-hand').innerHTML = '<span class="zz-chip" id="mark-hand">4팀 자리</span>';
document.getElementById('zz-meeting-title').textContent = 'D2 시험 회의';

window.__d2 = {
  mount, unmount, log, delays, api, AGENDA, pageColor,
  setLiveMode(m, l) { liveMode = m; staleLive = l || null; },
  pixel(x, y) {
    const c = document.getElementById('zz-layer-bg');
    const d = c.getContext('2d').getImageData(Math.round(x * c.width), Math.round(y * c.height), 1, 1).data;
    return [d[0], d[1], d[2], d[3]];
  },
  hex(hx) { return [1, 3, 5].map(i => parseInt(hx.slice(i, i + 2), 16)); },
};
// app.js 의 「안건 목록」 단추(768~1023px) 배선을 그대로 흉내 낸다
{ const ag = document.getElementById('zz-agenda'), btn = document.getElementById('zz-agenda-toggle');
  btn?.addEventListener('click', () => { if (ag.hasAttribute('data-open')) ag.removeAttribute('data-open'); else ag.setAttribute('data-open', ''); }); }
window.__d2ready = true;
