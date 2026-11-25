// D1 화면 시험용 임시 app.js (뼈대 app.js 가 없을 때 시험이 대신 끼워 넣는다). 가짜 api·store·ctx.
const q = new URLSearchParams(location.search);
const scen = q.get('s') || 'admin';
const handlers = {};
const state = { role: null, meeting: { title: '12월 교직원 회의' } };
const store = {
  get: k => state[k],
  set(k, v) { const p = state[k]; state[k] = v; (handlers[k] || []).forEach(f => f(v, p)); },
  on(k, f) { (handlers[k] ||= []).push(f); return () => { handlers[k] = handlers[k].filter(x => x !== f); }; },
  emit() {},
};
const now = Date.now(), DAY = 86400000;
let meetings = [
  { id: 'a1', title: '12월 교직원 회의', startsAt: now + DAY, status: 'ready', agendaCount: 3, expiresAt: now + 9 * DAY, daysLeft: 9, allowRecording: true },
  { id: 'a2', title: '겨울방학 연수 안내와 근무 일정을 함께 정하는 아주 긴 제목의 회의입니다 정말 길어요', startsAt: now - DAY, status: 'live', agendaCount: 4, expiresAt: now + 2 * DAY, daysLeft: 2, allowRecording: false, hostLocked: true },
  { id: 'a3', title: '지난 회의', startsAt: now - 5 * DAY, status: 'ended', agendaCount: 1, expiresAt: now + 1 * DAY, daysLeft: 1, allowRecording: true },
];
if (scen === 'empty') meetings = [];
const calls = (window.__calls = []);
class ZzError extends Error { constructor(status, code, message, extra) { super(message); this.status = status; this.code = code; this.extra = extra; } }
const api = {
  async listMeetings() { calls.push('list'); if (scen === 'neterr') throw new ZzError(0, 'network', '연결 끊김'); return { meetings: meetings.slice(), isAdmin: scen !== 'user' }; },
  async createMeeting(b) { calls.push(['create', b]); if (scen === 'createfail') throw new ZzError(400, 'bad_code', '주관 코드는 숫자 6자리입니다.'); meetings.unshift({ id: 'n' + meetings.length, title: b.title, startsAt: b.startsAt, status: 'ready', agendaCount: 0, daysLeft: 10, allowRecording: b.allowRecording }); return {}; },
  async updateMeeting(id, p) { calls.push(['update', id, p]); const m = meetings.find(x => x.id === id); Object.assign(m, p); return { codeChanged: p.hostCode !== undefined }; },
  async deleteMeeting(id) { calls.push(['delete', id]); meetings = meetings.filter(x => x.id !== id); return { deleted: true, queued: false }; },
  async unlockHost(id) { calls.push(['unlock', id]); meetings.find(x => x.id === id).hostLocked = false; return { ok: true }; },
  async staffNames() { return scen === 'nonames' ? [] : ['교사가', '교사나', '교사다', '교사라']; },
  rememberedName: () => localStorage.getItem('airoom_ws_name') || '',
  rememberName: n => localStorage.setItem('airoom_ws_name', n),
  session: () => null,
  async join(mid, name) { calls.push(['join', mid, name]); if (scen === 'joinfail') throw new ZzError(0, 'network', '연결 끊김'); store.set('role', { role: 'viewer', cid: 'c1', name, presenter: false }); return {}; },
  async becomeHost(mid, code) { calls.push(['host', code]); if (code !== '123456') throw new ZzError(403, 'wrong_code', '틀렸습니다', { left: 4 }); store.set('role', { ...state.role, role: 'host' }); return {}; },
};
const modalRoot = document.getElementById('zz-modal-root');
const ctx = {
  api, store, mid: location.hash.startsWith('#/m/') ? 'a1' : null,
  el: id => { const e = document.getElementById(id); if (!e) throw new Error('no ' + id); return e; },
  t: s => s, assets: n => `/zzoom/assets/${n}.webp`,
  toast: (text, kind) => { calls.push(['toast', text, kind]); },
  modal({ title, body, onClose }) {
    const back = document.createElement('div'); back.className = 'zz-modal-back';
    const box = document.createElement('div'); box.className = 'zz-modal'; box.setAttribute('role', 'dialog');
    const h = document.createElement('h2'); h.textContent = title; box.append(h, body);
    back.append(box); modalRoot.append(back);
    return { el: box, close() { back.remove(); onClose && onClose(); } };
  },
};
const meetingRoute = location.hash.startsWith('#/m/');
document.body.className = 'zz ' + (meetingRoute ? 'route-meeting' : 'route-list');
document.getElementById('zz-meeting').hidden = !meetingRoute;
const mods = [];
const addCss = f => { const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = '/zzoom/' + f; document.head.append(l); return new Promise(r => { l.onload = r; l.onerror = r; }); };
if (meetingRoute) {
  document.getElementById('zz-meeting-title').textContent = state.meeting.title;
  const j = await import('/zzoom/join.js'); await addCss(j.css); mods.push(j.mount(ctx));
  document.getElementById('zz-join').hidden = false;
  store.on('role', r => { document.getElementById('zz-join').hidden = !!r; });
} else {
  const l = await import('/zzoom/list.js'); await addCss(l.css); mods.push(l.mount(ctx));
}
window.__ctx = ctx; window.__mods = mods; window.__ready = true;
