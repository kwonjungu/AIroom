// 쭘 서버·Firebase 연결 — 경로와 응답 모양은 이 파일 한 곳에만 둔다(lib/zzoom/routes.js 와 맞춤).
// 약속: docs/meeting-2026-11-25/CONTRACTS.md 2절. 팀 모듈은 fetch·Firebase 를 직접 부르지 않고 이 함수들만 쓴다.

const BASE = '/api/zzoom';
const FB_VER = '10.12.0';
const FB = n => `https://www.gstatic.com/firebasejs/${FB_VER}/firebase-${n}.js`;
const COLL = 'zzoom_meetings';
const DB_NAME = 'kwon';
const PT_KEY = mid => 'zzoom_pt:' + mid;
const REFRESH_MS = 50 * 60000;     // 맞춤 토큰 1시간 → 50분에 갱신
const HEARTBEAT_MS = 60000;

export class ZzError extends Error {
  constructor(status, code, message, extra = {}) {
    super(message || code);
    this.name = 'ZzError'; this.status = status; this.code = code; this.extra = extra || {};
  }
}

// ---- store 연결(app.js 가 bindStore) ----
let store = null;
export function bindStore(s) { store = s; }
const sset = (k, v) => store && store.set(k, v);
const spatch = (k, v) => store && store.patch(k, v);
const toast = (text, kind = 'error') => store && store.emit('toast', { text, kind });

// ================= 기본 요청 =================
export function authToken() {
  try { return localStorage.getItem('airoom_auth_token') || null; } catch { return null; }
}
async function request(method, path, { body, pt, raw, contentType, auth = true } = {}) {
  const headers = {};
  if (auth) { const t = authToken(); if (t) headers['X-Auth-Token'] = t; }
  if (pt) headers['X-Zzoom-Pt'] = pt;
  let payload;
  if (raw !== undefined) { payload = raw; if (contentType) headers['Content-Type'] = contentType; }
  else if (body !== undefined) { payload = JSON.stringify(body); headers['Content-Type'] = 'application/json'; }
  let r;
  try { r = await fetch(path.startsWith('/') ? path : BASE + '/' + path, { method, headers, body: payload, credentials: 'same-origin' }); }
  catch { throw new ZzError(0, 'network', '서버에 연결하지 못했습니다. 인터넷 연결을 확인해 주세요.'); }
  return r;
}
async function asJson(r) {
  let data = null;
  try { data = await r.json(); } catch { data = null; }
  if (!r.ok) {
    const { error, message, ...extra } = data || {};
    if (r.status === 503 && error === 'not_configured') spatch('conn', { server: 'not_configured' });
    throw new ZzError(r.status, error || 'http_' + r.status, message || `서버 오류(${r.status})`, extra);
  }
  return data;
}
const call = async (method, path, opts) => asJson(await request(method, BASE + path, opts));

// ================= 2-1. 백암이·목록 =================
export async function health() {
  try {
    const r = await request('GET', BASE + '/health', { auth: false });
    const d = r.ok ? await r.json() : { ok: false };
    spatch('conn', { server: d.ok ? 'ok' : 'not_configured' });
    return { ok: !!d.ok, firebase: !!d.firebase, redis: !!d.redis };
  } catch {
    spatch('conn', { server: 'off' });
    return { ok: false, firebase: false, redis: false };
  }
}
export const listMeetings = () => call('GET', '/meetings');
export const createMeeting = b => call('POST', '/meetings', { body: b });
export const updateMeeting = (mid, b) => call('PATCH', `/meetings/${enc(mid)}`, { body: b });
export const deleteMeeting = mid => call('DELETE', `/meetings/${enc(mid)}`);
export const unlockHost = mid => call('POST', `/meetings/${enc(mid)}/unlock`, { body: {} });
export async function staffNames() {
  try {
    const r = await request('GET', '/api/staff');
    if (!r.ok) return [];
    const list = await r.json();
    return Array.isArray(list) ? [...new Set(list.map(s => String(s?.name || '').trim()).filter(Boolean))] : [];
  } catch { return []; }
}
export function rememberedName() { try { return localStorage.getItem('airoom_ws_name') || ''; } catch { return ''; } }
export function rememberName(n) { try { localStorage.setItem('airoom_ws_name', String(n || '').slice(0, 20)); } catch { /* 저장 못 해도 됨 */ } }
const enc = encodeURIComponent;

// ================= Firebase (앱 'zzoom', inMemory, DB kwon) =================
let fbp = null;          // Promise<{A, Au, F, S, app, auth, db, st}>
let signedIn = null;     // { promise, resolve }
function newSignedIn() { let resolve; const promise = new Promise(r => { resolve = r; }); signedIn = { promise, resolve, done: false }; }
newSignedIn();
function firebase() {
  if (fbp) return fbp;
  fbp = (async () => {
    const cfg = await asJson(await request('GET', '/api/firebase-config')).catch(() => null);
    if (!cfg || !cfg.apiKey) throw new ZzError(503, 'no_firebase_config', 'Firebase 설정을 가져오지 못했습니다.');
    const [A, Au, F, S] = await Promise.all([import(FB('app')), import(FB('auth')), import(FB('firestore')), import(FB('storage'))]);
    const app = A.getApps().find(a => a.name === 'zzoom') || A.initializeApp(cfg, 'zzoom');
    let auth;
    try { auth = Au.initializeAuth(app, { persistence: Au.inMemoryPersistence }); } catch { auth = Au.getAuth(app); }
    const db = F.getFirestore(app, DB_NAME);
    const st = S.getStorage(app);
    return { A, Au, F, S, app, auth, db, st };
  })();
  fbp.catch(() => { fbp = null; });
  return fbp;
}
async function fbSignIn(token) {
  spatch('conn', { firebase: 'connecting' });
  try {
    const f = await firebase();
    await f.Au.signInWithCustomToken(f.auth, token);
    spatch('conn', { firebase: 'ok' });
    if (!signedIn.done) { signedIn.done = true; signedIn.resolve(f); }
    return f;
  } catch (e) {
    spatch('conn', { firebase: 'off' });
    throw e instanceof ZzError ? e : new ZzError(0, 'firebase_auth', '실시간 연결(Firebase)에 실패했습니다.', { detail: String(e?.code || e?.message || e) });
  }
}
async function fbSignOut() {
  if (!fbp) return;
  try { const f = await fbp; await f.Au.signOut(f.auth); } catch { /* 무시 */ }
  newSignedIn();
  spatch('conn', { firebase: 'off' });
}

// ================= 2-2. 입장·자격 =================
let S = null;   // 지금 회의 자격 { mid, pt, cid, name, role, exp, until, timers }
const tabId = Math.random().toString(36).slice(2) + Date.now().toString(36);
let chan = null;
function channel() {
  if (chan || typeof BroadcastChannel === 'undefined') return chan;
  chan = new BroadcastChannel('zzoom');
  // 같은 cid 를 쓰는 새 탭(복제된 탭)이 물으면 「내가 쓰고 있다」고 답한다(K3)
  chan.onmessage = ev => {
    const m = ev.data || {};
    if (m.t === 'hello' && S && m.cid === S.cid && m.id !== tabId) chan.postMessage({ t: 'mine', cid: m.cid, to: m.id });
  };
  return chan;
}
function cidInUse(cid) {
  const c = channel();
  if (!c) return Promise.resolve(false);
  return new Promise(res => {
    const h = ev => { const m = ev.data || {}; if (m.t === 'mine' && m.cid === cid && m.to === tabId) { done(true); } };
    const done = v => { c.removeEventListener('message', h); clearTimeout(tm); res(v); };
    c.addEventListener('message', h);
    const tm = setTimeout(() => done(false), 300);
    c.postMessage({ t: 'hello', cid, id: tabId });
  });
}
function saveGrant(mid, g) {
  try { sessionStorage.setItem(PT_KEY(mid), JSON.stringify({ pt: g.pt, cid: g.cid, name: g.name, role: g.role, exp: g.exp, until: g.until })); } catch { /* 무시 */ }
}
function loadGrant(mid) { try { return JSON.parse(sessionStorage.getItem(PT_KEY(mid)) || 'null'); } catch { return null; } }
function dropGrant(mid) { try { sessionStorage.removeItem(PT_KEY(mid)); } catch { /* 무시 */ } }

async function begin(mid, g, token) {
  stopTimers();
  S = { mid, pt: g.pt, cid: g.cid, name: g.name, role: g.role, exp: g.exp, until: g.until, timers: {} };
  saveGrant(mid, S);
  channel();
  await fbSignIn(token);
  scheduleRefresh();
  startHeartbeat();
  sset('role', { role: S.role, cid: S.cid, name: S.name, presenter: false });
}
function scheduleRefresh() {
  if (!S) return;
  clearTimeout(S.timers.refresh);
  const mid = S.mid;
  S.timers.refresh = setTimeout(() => { refresh(mid).catch(e => console.warn('[zzoom] 토큰 갱신 실패', e)); }, REFRESH_MS);
}

export async function join(mid, name) {
  const d = await call('POST', `/${enc(mid)}/join`, { body: { name } });
  await begin(mid, d, d.token);
  if (d.meeting) sset('meeting', { ...d.meeting, id: mid });
  return { cid: d.cid, name: d.name, role: d.role, meeting: d.meeting };
}
export async function resume(mid) {
  const g = loadGrant(mid);
  if (!g || !g.pt || (g.exp && g.exp < Date.now())) { dropGrant(mid); return null; }
  if (await cidInUse(g.cid)) {
    // 복제된 탭: 같은 자격을 함께 쓰지 않도록 새로 입장한다
    dropGrant(mid);
    return join(mid, g.name);
  }
  let d;
  try { d = await call('POST', `/${enc(mid)}/refresh`, { pt: g.pt, body: {} }); }
  catch (e) {
    if ([401, 403, 404, 410].includes(e.status)) { dropGrant(mid); if (e.status === 410) sset('meeting', { gone: true, id: mid }); return null; }
    throw e;
  }
  await begin(mid, { ...g, role: d.role, exp: d.exp, until: d.until, name: d.name, cid: d.cid }, d.token);
  if (d.meeting) sset('meeting', { ...d.meeting, id: mid });
  return { cid: d.cid, name: d.name, role: d.role, meeting: d.meeting };
}
export async function becomeHost(mid, code) {
  const d = await mcall(mid, 'POST', '/host', { body: { code: String(code || '') } });
  // 새 pt 로 바꿔 저장(옛 pt 는 서버가 폐기)
  await begin(mid, d, d.token);
  return { cid: d.cid, name: d.name, role: d.role };
}
export async function refresh(mid) {
  const d = await mcall(mid, 'POST', '/refresh', { body: {} });
  const before = S.role;
  S.role = d.role; S.exp = d.exp; S.until = d.until;
  saveGrant(mid, S);
  await fbSignIn(d.token);
  scheduleRefresh();
  if (before !== d.role) sset('role', { role: d.role, cid: S.cid, name: S.name, presenter: false });
  return { role: d.role };
}
export async function leave(mid) {
  if (S && S.mid === mid) { beacon(true); stopTimers(); S = null; }
  releaseImages();
  await fbSignOut();
}
export function session(mid) {
  if (!S || (mid && S.mid !== mid)) return null;
  return { cid: S.cid, name: S.name, role: S.role, exp: S.exp, until: S.until };
}
function stopTimers() {
  if (!S) return;
  clearTimeout(S.timers.refresh); clearInterval(S.timers.hb);
  if (S.timers.off) S.timers.off();
  S.timers = {};
}
// 회의 API 공통: pt 자동, 자격 오류면 자격을 지우고 다시 입장하게 한다
async function mcall(mid, method, path, opts = {}) {
  if (!S || S.mid !== mid) throw new ZzError(401, 'pt_required', '참가 자격이 없습니다. 다시 입장하세요.');
  try { return await call(method, `/${enc(mid)}${path}`, { ...opts, pt: S.pt }); }
  catch (e) { onGrantError(mid, e); throw e; }
}
function onGrantError(mid, e) {
  if ((e.status === 401 && /^pt_/.test(e.code)) || e.code === 'pt_other_meeting') {
    dropGrant(mid); stopTimers(); S = null;
    toast(e.message, 'warn');
    sset('role', null);
  } else if (e.status === 410) {
    sset('meeting', { gone: true, id: mid });
  } else if (e.code === 'host_revoked') {
    // 주관 코드가 바뀜 → 토큰을 다시 받아 viewer 로 내려간다
    refresh(mid).catch(() => {});
  }
}

// ---- heartbeat (60초, 다시 보일 때, 닫을 때 sendBeacon) ----
function startHeartbeat() {
  if (!S) return;
  const mid = S.mid;
  const beat = async () => {
    if (!S || S.mid !== mid) return;
    try {
      const d = await mcall(mid, 'POST', '/heartbeat', { body: {} });
      if (d && d.counts) sset('counts', d.counts);
      spatch('conn', { server: 'ok' });
    } catch (e) { if (e.status === 0) spatch('conn', { server: 'off' }); }
  };
  const vis = () => { if (document.visibilityState === 'visible') beat(); };
  const hide = () => beacon(true);
  document.addEventListener('visibilitychange', vis);
  window.addEventListener('pagehide', hide);
  S.timers.hb = setInterval(beat, HEARTBEAT_MS);
  S.timers.off = () => { document.removeEventListener('visibilitychange', vis); window.removeEventListener('pagehide', hide); };
  beat();
}
function beacon(leaving) {
  if (!S || !navigator.sendBeacon) return;
  try { navigator.sendBeacon(`${BASE}/${enc(S.mid)}/heartbeat`, new Blob([JSON.stringify({ pt: S.pt, leaving: !!leaving })], { type: 'application/json' })); } catch { /* 최선 노력 */ }
}

// ================= 2-3. 회의 API =================
export const setState = (mid, action, value) => mcall(mid, 'POST', '/state', { body: value === undefined ? { action } : { action, value } });
export const takePresenter = mid => mcall(mid, 'POST', '/presenter', { body: {} });
// 진행 상태: baseRev·epoch 는 store live 에서 읽는다. 409 면 e.extra.live 로 맞추면 된다(서버가 최신 상태를 줌).
export async function sendLive(mid, { aid, page, view, force = false }) {
  const live = store?.get('live') || {};
  const m = store?.get('meeting') || {};
  const body = { aid, page, view, baseRev: live.rev || 0, epoch: m.presenter?.epoch ?? live.epoch ?? 0 };
  if (force) body.force = true;
  try {
    const d = await mcall(mid, 'POST', '/live', { body });
    if (d?.live) acceptLive(d.live);
    return d;
  } catch (e) {
    if (e.status === 409 && e.extra && 'live' in e.extra) acceptLive(e.extra.live);
    throw e;
  }
}
// store live 넣기: 같은 진행자 세션(epoch)에서 rev 가 더 낮은(늦게 온 옛) 스냅샷은 버린다. 바뀐 것이 없으면 이벤트도 내지 않는다.
export function acceptLive(next) {
  if (!store) return false;
  const prev = store.get('live') || null;
  next = next || null;
  if (prev && next && prev.epoch === next.epoch && (next.rev || 0) < (prev.rev || 0)) return false;
  if (JSON.stringify(prev) === JSON.stringify(next)) return false;
  store.set('live', next);
  return true;
}
export const startUpload = (mid, b) => mcall(mid, 'POST', '/uploads', { body: b });
export const commitUpload = (mid, uploadId, b) => mcall(mid, 'POST', `/uploads/${enc(uploadId)}/commit`, { body: b });
export const updateAgenda = (mid, aid, b) => mcall(mid, 'PATCH', `/agenda/${enc(aid)}`, { body: b });
export const deleteAgenda = (mid, aid) => mcall(mid, 'DELETE', `/agenda/${enc(aid)}`);
export const createBoard = (mid, bg) => mcall(mid, 'POST', '/boards', { body: bg ? { bg } : {} });
export const addBoardPage = (mid, aid) => mcall(mid, 'POST', '/boards', { body: { action: 'addPage', aid } });
export const saveStrokes = (mid, strokes) => mcall(mid, 'POST', '/strokes', { body: { strokes } });
export const deleteStroke = (mid, sid) => mcall(mid, 'DELETE', `/strokes/${enc(sid)}`);
export const clearPage = (mid, pageKey) => mcall(mid, 'POST', `/pages/${enc(pageKey)}/clear`, { body: {} });
export const sendChat = (mid, text, ref) => mcall(mid, 'POST', '/chat', { body: ref ? { text, ref } : { text } });
export const deleteChat = (mid, id) => mcall(mid, 'DELETE', `/chat/${enc(id)}`);
export const setHand = (mid, up) => mcall(mid, 'POST', '/hand', { body: { up: !!up } });
export const lowerHand = (mid, cid) => mcall(mid, 'POST', '/hand', { body: { up: false, cid } });
export const lowerAllHands = mid => mcall(mid, 'POST', '/hand', { body: { all: true } });
export const createPoll = (mid, b) => mcall(mid, 'POST', '/polls', { body: b });
export const vote = (mid, pid, optionId) => mcall(mid, 'POST', `/polls/${enc(pid)}/vote`, { body: { optionId } });
export const myVote = (mid, pid) => mcall(mid, 'GET', `/polls/${enc(pid)}/mine`);
export const pollTally = (mid, pid) => mcall(mid, 'GET', `/polls/${enc(pid)}/tally`);
export const closePoll = (mid, pid) => mcall(mid, 'POST', `/polls/${enc(pid)}/close`, { body: {} });
export const revealPoll = (mid, pid) => mcall(mid, 'POST', `/polls/${enc(pid)}/reveal`, { body: {} });
export function transcribe(mid, blob, { n, at, aid, page } = {}) {
  const q = new URLSearchParams({ n: String(n) });
  if (at != null) q.set('at', String(Math.round(at)));
  if (aid) q.set('aid', aid);
  if (page != null) q.set('page', String(page));
  return mcall(mid, 'POST', `/transcribe?${q}`, { raw: blob, contentType: blob.type || 'audio/webm' });
}
export async function exportMd(mid) {
  if (!S || S.mid !== mid) throw new ZzError(401, 'pt_required', '참가 자격이 없습니다.');
  const r = await request('GET', `${BASE}/${enc(mid)}/export.md`, { pt: S.pt });
  if (!r.ok) { try { await asJson(r); } catch (e) { onGrantError(mid, e); throw e; } }
  const blob = await r.blob();
  const cd = r.headers.get('Content-Disposition') || '';
  const m = /filename\*=UTF-8''([^;]+)/i.exec(cd);
  const name = m ? decodeURIComponent(m[1]) : '쭘_기록.md';
  saveBlob(blob, name);
  return { name, bytes: blob.size };
}
function saveBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}

// ---- 변환·업로드 (C-5) ----
let convertMod = null;
export async function convertFile(file, opts = {}) {
  convertMod = convertMod || await import('/zzoom/convert/index.js');
  return convertMod.convert(file, opts);
}
const ORIGINAL_TYPE = {
  pdf: 'application/pdf',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  hwp: 'application/octet-stream', hwpx: 'application/octet-stream',
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp'
};
export async function uploadAgenda(mid, { file, converted, title, onProgress, signal } = {}) {
  const pages = converted?.pages || [], thumbs = converted?.thumbs || [];
  if (!pages.length) throw new ZzError(0, 'empty', '올릴 쪽이 없습니다.');
  const notWebp = [...pages.map(p => p.type || p.blob?.type), ...thumbs.map(t => t.type)].some(t => t !== 'image/webp');
  if (notWebp) throw new ZzError(0, 'webp_unsupported', '이 브라우저는 WebP 그림을 만들지 못합니다. 크롬이나 엣지에서 올려 주세요.');
  const ext = String(file?.name || '').toLowerCase().split('.').pop();
  let kind, upExt, withOriginal = !!file;
  if (['pdf', 'hwp', 'hwpx', 'pptx'].includes(ext)) { kind = ext; upExt = ext; }
  else { kind = 'image'; upExt = ['png', 'jpg', 'jpeg', 'webp'].includes(ext) ? ext : 'webp'; if (upExt !== ext) withOriginal = false; }
  const permit = await startUpload(mid, kind === 'image'
    ? { kind, pages: pages.length, bytes: file?.size || 1, ext: upExt }
    : { kind, pages: pages.length, bytes: file.size });
  const f = await signedIn.promise;
  const jobs = [];
  pages.forEach((p, i) => jobs.push({ name: permit.files.pages[i], blob: p.blob, type: 'image/webp' }));
  thumbs.forEach((t, i) => { if (permit.files.thumbs[i]) jobs.push({ name: permit.files.thumbs[i], blob: t, type: 'image/webp' }); });
  if (withOriginal) jobs.push({ name: permit.files.original, blob: file, type: ORIGINAL_TYPE[upExt] || 'application/octet-stream' });
  let done = 0;
  const total = jobs.length;
  onProgress && onProgress({ phase: 'upload', done, total });
  const put = async j => {
    for (let a = 0; ; a++) {
      if (signal?.aborted) throw new ZzError(0, 'aborted', '올리기를 취소했습니다.');
      try { await f.S.uploadBytes(f.S.ref(f.st, permit.path + j.name), j.blob, { contentType: j.type }); return; }
      catch (e) { if (a >= 2) throw new ZzError(0, 'upload_failed', `${j.name} 올리기에 실패했습니다.`, { detail: String(e?.code || e) }); }
    }
  };
  let next = 0;
  const worker = async () => { while (next < jobs.length) { const j = jobs[next++]; await put(j); done++; onProgress && onProgress({ phase: 'upload', done, total }); } };
  await Promise.all([worker(), worker(), worker()]);
  if (signal?.aborted) throw new ZzError(0, 'aborted', '올리기를 취소했습니다.');
  onProgress && onProgress({ phase: 'commit', done: total, total });
  const sizes = pages.map(p => [Math.round(p.w), Math.round(p.h)]);
  return commitUpload(mid, permit.uploadId, { title: title || file?.name || '안건', pages: pages.length, sizes, originalName: withOriginal ? file.name : undefined });
}

// ================= 2-4. 실시간 구독 =================
// 로그인 전이면 로그인 뒤 붙인다. 동기로 해제 함수를 돌려준다.
function live(make, cb, label) {
  let unsub = null, stopped = false;
  signedIn.promise.then(f => {
    if (stopped) return;
    try {
      unsub = make(f, snap => cb(snap), err => {
        console.warn('[zzoom] 구독 오류', label, err?.code || err);
        spatch('conn', { firebase: 'off' });
        if (err?.code === 'permission-denied') toast('실시간 자료를 읽을 권한이 없습니다. 다시 입장해 주세요.', 'warn');
      });
    } catch (e) { console.warn('[zzoom] 구독 실패', label, e); }
  });
  return () => { stopped = true; if (unsub) unsub(); };
}
const mref = (f, mid, ...p) => f.F.doc(f.db, COLL, mid, ...p);
const cref = (f, mid, name) => f.F.collection(f.db, COLL, mid, name);
const docs = snap => snap.docs.map(d => ({ id: d.id, ...d.data() }));

export const subscribeMeeting = (mid, cb) => live((f, ok, bad) => f.F.onSnapshot(mref(f, mid), s => ok(s.exists() ? { ...s.data(), id: mid } : { gone: true, id: mid }), bad), cb, 'meeting');
export const subscribeAgenda = (mid, cb) => live((f, ok, bad) => f.F.onSnapshot(cref(f, mid, 'agenda'), s => ok(docs(s).map(d => ({ aid: d.id, ...d }))), bad), cb, 'agenda');
export const subscribeHands = (mid, cb) => live((f, ok, bad) => f.F.onSnapshot(cref(f, mid, 'hands'), s => ok(docs(s).map(d => ({ cid: d.id, name: d.name, at: d.at })).sort((a, b) => (a.at - b.at) || (a.cid < b.cid ? -1 : 1))), bad), cb, 'hands');
export const subscribeChat = (mid, cb) => live((f, ok, bad) => f.F.onSnapshot(f.F.query(cref(f, mid, 'chat'), f.F.orderBy('at', 'desc'), f.F.limit(200)), s => ok(docs(s).reverse()), bad), cb, 'chat');
export const subscribePolls = (mid, cb) => live((f, ok, bad) => f.F.onSnapshot(cref(f, mid, 'polls'), s => ok(docs(s).map(d => ({ pid: d.id, ...d })).sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0))), bad), cb, 'polls');
export const subscribeTranscript = (mid, cb) => live((f, ok, bad) => f.F.onSnapshot(cref(f, mid, 'transcript'), s => ok(docs(s).sort((a, b) => a.n - b.n)), bad), cb, 'transcript');
export const subscribePeople = (mid, cb) => live((f, ok, bad) => f.F.onSnapshot(cref(f, mid, 'people'), s => ok(docs(s).map(d => ({ cid: d.id, ...d }))), bad), cb, 'people');
// 쪽 단위(3팀). 복합 색인 없이 되게 pageKey 하나로만 묻고 seq 는 여기서 정렬한다.
export const subscribeStrokes = (mid, pageKey, cb) => live((f, ok, bad) => f.F.onSnapshot(f.F.query(cref(f, mid, 'strokes'), f.F.where('pageKey', '==', pageKey)), s => ok(docs(s).sort((a, b) => a.seq - b.seq)), bad), cb, 'strokes');
export const subscribePageEpoch = (mid, pageKey, cb) => live((f, ok, bad) => f.F.onSnapshot(mref(f, mid, 'pages', pageKey), s => ok(s.exists() ? (s.data().epoch || 0) : 0), bad), cb, 'page');

// ================= 2-5. 그림(Storage) =================
const imgCache = new Map();   // path → Promise<objectURL>
export function pageImageUrl(agenda, page, { thumb = false } = {}) {
  if (!agenda || agenda.kind === 'board' || !agenda.base) return Promise.resolve(null);
  const path = `${agenda.base}/${thumb ? 't' : 'p'}${String(page).padStart(3, '0')}.webp`;
  if (!imgCache.has(path)) {
    const p = signedIn.promise.then(f => f.S.getBlob(f.S.ref(f.st, path))).then(b => URL.createObjectURL(b));
    p.catch(() => imgCache.delete(path));
    imgCache.set(path, p);
  }
  return imgCache.get(path);
}
export function releaseImages(keep = []) {
  const k = new Set(keep);
  for (const [path, p] of imgCache) {
    p.then(url => { if (!k.has(url)) { URL.revokeObjectURL(url); imgCache.delete(path); } }).catch(() => {});
  }
}
export async function originalBlob(agenda) {
  if (!agenda?.original?.path) return null;
  const f = await signedIn.promise;
  return f.S.getBlob(f.S.ref(f.st, agenda.original.path));
}
export function downloadOriginal(agenda) {
  return originalBlob(agenda).then(b => { if (b) saveBlob(b, agenda.original.name || 'original'); return !!b; });
}
