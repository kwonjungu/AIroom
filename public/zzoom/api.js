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
const spatch = (k, v) => {
  if (!store) return;
  // 값이 같으면 이벤트를 내지 않는다(듣는 쪽이 바뀔 때만 알게, 감사 U06)
  const cur = store.get(k) || {};
  if (v && typeof v === 'object' && Object.keys(v).every(x => cur[x] === v[x])) return;
  store.patch(k, v);
};
const toast = (text, kind = 'error') => store && store.emit('toast', { text, kind });

// ================= 기본 요청 =================
export function authToken() {
  try { return localStorage.getItem('airoom_auth_token') || null; } catch { return null; }
}
// 이 기기의 백암이 기기 id(백암이 로그인 화면과 같은 localStorage 값). 서버는 회의를 만든 사람을 로그인 세션과 이 값으로 알아본다 —
// 백암이 로그인은 공용 코드라 계정이 없어서, 다시 로그인해도 「같은 사람」으로 알아볼 수 있는 것은 이 기기 id 뿐이다(감사 R2 M5).
export function deviceId() {
  try {
    let v = localStorage.getItem('baekam_device_id');
    if (!/^[A-Za-z0-9_-]{16,64}$/.test(v || '')) {
      v = (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36) + Math.random().toString(36).slice(2)).replace(/[^A-Za-z0-9_-]/g, '');
      localStorage.setItem('baekam_device_id', v);
    }
    return v;
  } catch { return ''; }
}
// 학교망은 구글(Firebase) 연결이 가끔 끊긴다(실측 10% 안팎). 권한·없음 오류가 아니면 잠깐 쉬고 다시 해 본다.
const sleep = ms => new Promise(r => setTimeout(r, ms));
const FATAL = /unauthorized|unauthenticated|permission|object-not-found|not-found|invalid-custom-token|custom-token-mismatch|canceled|aborted|quota/i;
// 끊기지 않고 멈춰 버리는 연결도 있어(실측) 한 번 시도마다 시간 제한을 둔다 — 멈추면 끊고 다시 한다.
function withTimeout(p, ms) {
  let t;
  return Promise.race([p, new Promise((_, rej) => { t = setTimeout(() => rej(Object.assign(new Error('timeout'), { code: 'net/timeout' })), ms); })]).finally(() => clearTimeout(t));
}
async function retryNet(fn, tries = 4, ms = 15000) {
  for (let a = 0; ; a++) {
    try { return await withTimeout(Promise.resolve().then(fn), ms); }
    catch (e) { if (a >= tries - 1 || FATAL.test(String(e?.code || e?.message || e))) throw e; await sleep([400, 1200, 2500, 4000][a] || 4000); }
  }
}
const REQ_TIMEOUT_MS = 20000;
const idemKey = () => { try { return crypto.randomUUID().replace(/-/g, ''); } catch { return Date.now().toString(36) + Math.random().toString(36).slice(2, 12); } };
async function request(method, path, { body, pt, raw, contentType, auth = true, keepalive = false, timeout = REQ_TIMEOUT_MS } = {}) {
  const headers = {};
  // 보내기마다 「같은 요청」 표(감사 R7 P5-M1). 다시 보내도 서버가 한 번만 반영하고 처음 응답을 돌려준다.
  if (method !== 'GET') headers['X-Zzoom-Idem'] = idemKey();
  if (auth) { const t = authToken(); if (t) headers['X-Auth-Token'] = t; const d = deviceId(); if (d) headers['X-Device-Id'] = d; }
  if (pt) headers['X-Zzoom-Pt'] = pt;
  let payload;
  if (raw !== undefined) { payload = raw; if (contentType) headers['Content-Type'] = contentType; }
  else if (body !== undefined) { payload = JSON.stringify(body); headers['Content-Type'] = 'application/json'; }
  const url = path.startsWith('/') ? path : BASE + '/' + path;
  // 응답이 끝내 안 오면 단추가 영영 잠기므로 시간 제한(기본 20초)에 끊는다.
  // 끊기면 다시 보낸다: GET 은 4번, 보내기는 3번. 보내기는 「같은 요청」 표가 있어 서버가 두 번 반영하지 않는다.
  const tries = method === 'GET' ? 4 : 3;
  for (let a = 0; ; a++) {
    const ac = typeof AbortController === 'function' ? new AbortController() : null;
    let timedOut = false;
    const timer = ac ? setTimeout(() => { timedOut = true; ac.abort(); }, timeout) : null;
    try {
      const r = await fetch(url, { method, headers, body: payload, credentials: 'same-origin', keepalive, signal: ac ? ac.signal : undefined });
      // 앞서 보낸 같은 요청을 서버가 아직 처리 중이면 조금 뒤 다시 물어 처음 응답을 받는다
      if (r.status === 409 && headers['X-Zzoom-Idem'] && a < tries + 3) {
        const d = await r.clone().json().catch(() => null);
        if (d?.error === 'in_progress') { await sleep(1500); continue; }
      }
      return r;
    }
    catch {
      if (a < tries - 1 && !keepalive) { await sleep([300, 1000, 2500][a] || 2500); continue; }
      throw new ZzError(0, 'network', '서버에 연결하지 못했어요. 인터넷 연결을 확인해 주세요.');
    } finally { if (timer) clearTimeout(timer); }
  }
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
export const deleteMeeting = mid => call('DELETE', `/meetings/${enc(mid)}`, { timeout: 45000 });   // 서버 정리 최대 20초+
export const unlockHost = mid => call('POST', `/meetings/${enc(mid)}/unlock`, { body: {} });
// 익명(ANON): 교직원 명부·airoom_ws_name 을 읽지도 쓰지도 않는다(staffNames·rememberedName·rememberName 없앰).
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
    if (!cfg || !cfg.apiKey) throw new ZzError(503, 'no_firebase_config', '실시간 연결 설정을 가져오지 못했어요.');
    const [A, Au, F, S] = await retryNet(() => Promise.all([import(FB('app')), import(FB('auth')), import(FB('firestore')), import(FB('storage'))]), 3);
    const app = A.getApps().find(a => a.name === 'zzoom') || A.initializeApp(cfg, 'zzoom');
    let auth;
    try { auth = Au.initializeAuth(app, { persistence: Au.inMemoryPersistence }); } catch { auth = Au.getAuth(app); }
    const db = F.getFirestore(app, DB_NAME);
    const st = S.getStorage(app);
    // SDK 기본은 실패해도 2분 동안 속으로 다시 해 화면이 「불러오는 중」에 멈춘다. 15초로 줄이고 나머지는 retryNet 이 맡는다.
    try { st.maxOperationRetryTime = 15000; } catch { /* 옛 SDK */ }
    return { A, Au, F, S, app, auth, db, st };
  })();
  fbp.catch(() => { fbp = null; });
  return fbp;
}
// 로그인·로그아웃은 한 줄로 세운다(감사 U15). 회의 A 의 늦은 로그인이 회의 B 의 로그인 뒤에 끝나 사용자를 바꾸지 못하게 한다.
// authSeq 는 줄에 넣은 순서 번호다. 늦게 끝난 옛 입장은 자기 뒤에 다른 로그인이 들어왔으면 로그아웃하지 않는다.
let authChain = Promise.resolve();
let authSeq = 0;
function authOp(fn) {
  authSeq++;
  const run = authChain.then(fn, fn);
  authChain = run.catch(() => {});
  return run;
}
export function authState() { return { seq: authSeq }; }   // 시험용
function fbSignIn(token) { return authOp(() => fbSignInNow(token)); }
async function fbSignInNow(token) {
  spatch('conn', { firebase: 'connecting' });
  try {
    const f = await firebase();
    await retryNet(() => f.Au.signInWithCustomToken(f.auth, token), 4, 8000);   // 로그인 뒤 accounts:lookup 이 멈추는 일이 실측됨
    spatch('conn', { firebase: 'ok' });
    if (!signedIn.done) { signedIn.done = true; signedIn.resolve(f); }
    return f;
  } catch (e) {
    spatch('conn', { firebase: 'off' });
    throw e instanceof ZzError ? e : new ZzError(0, 'firebase_auth', '실시간 연결에 실패했어요. 잠시 뒤 다시 입장해 주세요.', { detail: String(e?.code || e?.message || e) });
  }
}
function fbSignOut() { return authOp(() => fbSignOutNow()); }
async function fbSignOutNow() {
  if (!fbp) return;
  try { const f = await fbp; await f.Au.signOut(f.auth); } catch { /* 무시 */ }
  newSignedIn();
  spatch('conn', { firebase: 'off' });
}

// ================= 2-2. 입장·자격 =================
let S = null;   // 지금 회의 자격 { mid, pt, cid, role, exp, until, timers } (이름 없음, ANON)
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
  try { sessionStorage.setItem(PT_KEY(mid), JSON.stringify({ pt: g.pt, cid: g.cid, role: g.role, exp: g.exp, until: g.until })); } catch { /* 무시 */ }
}
function loadGrant(mid) { try { return JSON.parse(sessionStorage.getItem(PT_KEY(mid)) || 'null'); } catch { return null; } }
function dropGrant(mid) { try { sessionStorage.removeItem(PT_KEY(mid)); } catch { /* 무시 */ } }

// 세대 번호: leave 할 때마다 올린다. 입장(join·resume·becomeHost) 도중 leave 가 끼면 늦게 끝난 입장은 아무것도 남기지 않는다(감사 U02).
let gen = 0;
const aborted = () => new ZzError(0, 'aborted', '입장을 그만뒀어요.');
async function begin(mid, g, token, myGen) {
  if (myGen !== gen) { quietLeave(mid, g.pt); throw aborted(); }
  stopTimers();
  S = { mid, pt: g.pt, cid: g.cid, role: g.role, exp: g.exp, until: g.until, timers: {} };
  saveGrant(mid, S);
  channel();
  const mySeq = authSeq + 1;   // 바로 아래 fbSignIn 이 받을 순서 번호
  try { await fbSignIn(token); }
  catch (e) {
    // 실시간 로그인 실패: 반쯤 입장한 채로 두지 않는다. 자격(sessionStorage)은 남겨 다시 누르면 같은 cid 로 재시도(감사 U13)
    if (S && S.pt === g.pt) { stopTimers(); S = null; }
    throw e;
  }
  if (myGen !== gen || !S || S.pt !== g.pt) {
    if (S && S.pt === g.pt) { stopTimers(); S = null; }
    quietLeave(mid, g.pt);
    // 내 로그인 뒤에 새 입장의 로그인이 줄에 들어왔으면 그 로그인을 끊지 않는다(U15)
    if (myGen !== gen && authSeq === mySeq) fbSignOut();
    throw aborted();
  }
  scheduleRefresh();
  startHeartbeat();
  sset('role', { role: S.role, cid: S.cid, presenter: false });
}
// 버려진 입장의 자격으로 「나감」을 알린다(접속자 명단에 남지 않게)
function quietLeave(mid, pt) {
  try { if (pt && navigator.sendBeacon) navigator.sendBeacon(`${BASE}/${enc(mid)}/heartbeat`, new Blob([JSON.stringify({ pt, leaving: true })], { type: 'application/json' })); } catch { /* 최선 노력 */ }
}
function scheduleRefresh(delay = REFRESH_MS) {
  if (!S) return;
  clearTimeout(S.timers.refresh);
  const mid = S.mid;
  S.timers.refresh = setTimeout(() => {
    refresh(mid).catch(e => {
      console.warn('[zzoom] 토큰 갱신 실패', e);
      // 한 번 실패로 끝내면 60분에 실시간 구독이 모두 끊긴다(감사 R7 P5-H1). 자격이 살아 있는 동안 20초마다 다시.
      if (e?.code === 'aborted' || [401, 403, 404, 410].includes(e?.status)) return;
      if (S && S.mid === mid) scheduleRefresh(20000);
    });
  }, delay);
}

export async function join(mid) {   // 익명(ANON): 이름을 받지 않는다(옛 호출의 두 번째 인자는 무시)
  const myGen = gen;
  // 앞 입장이 실시간 로그인에서 실패해 자격만 남아 있으면 같은 cid 로 다시 시도한다(감사 U13)
  const old = loadGrant(mid);
  if (old && old.pt && (!old.exp || old.exp > Date.now())) {
    const r = await resume(mid).catch(e => { if (e.code === 'aborted') throw e; return null; });
    if (r) return r;
  }
  if (myGen !== gen) throw aborted();
  const d = await call('POST', `/${enc(mid)}/join`, { body: {} });
  await begin(mid, d, d.token, myGen);
  if (d.meeting) sset('meeting', { ...d.meeting, id: mid });
  return { cid: d.cid, role: d.role, meeting: d.meeting };
}
export async function resume(mid) {
  const myGen = gen;
  const g = loadGrant(mid);
  if (!g || !g.pt || (g.exp && g.exp < Date.now())) { dropGrant(mid); return null; }
  if (await cidInUse(g.cid)) {
    if (myGen !== gen) throw aborted();
    // 복제된 탭: 같은 자격을 함께 쓰지 않도록 새로 입장한다
    dropGrant(mid);
    return join(mid);
  }
  let d;
  try { d = await call('POST', `/${enc(mid)}/refresh`, { pt: g.pt, body: {} }); }
  catch (e) {
    if ([401, 403, 404, 410].includes(e.status)) { dropGrant(mid); if (e.status === 410) sset('meeting', { gone: true, id: mid }); return null; }
    throw e;
  }
  await begin(mid, { ...g, role: d.role, exp: d.exp, until: d.until, cid: d.cid }, d.token, myGen);
  if (d.meeting) sset('meeting', { ...d.meeting, id: mid });
  return { cid: d.cid, role: d.role, meeting: d.meeting };
}
export async function becomeHost(mid, code) {
  const myGen = gen;
  const d = await mcall(mid, 'POST', '/host', { body: { code: String(code || '') } });
  // 새 pt 로 바꿔 저장(옛 pt 는 서버가 폐기)
  try { await begin(mid, d, d.token, myGen); }
  catch (e) {
    if (e?.code === 'aborted') throw e;
    // 실시간 로그인만 실패: 옛 자격은 이미 서버가 버렸으므로 새 자격을 살려 두고 곧 다시 로그인한다(감사 R7 P5-M2).
    // 그러지 않으면 화면은 입장한 채인데 채팅·손들기·발표하기가 모두 「참가 자격이 없어요」로 막혔다.
    console.warn('[zzoom] 주관자 전환 뒤 실시간 로그인 실패, 3초 뒤 다시', e);
    S = { mid, pt: d.pt, cid: d.cid, role: d.role, exp: d.exp, until: d.until, timers: {} };
    saveGrant(mid, S);
    scheduleRefresh(3000);
    startHeartbeat();
    sset('role', { role: S.role, cid: S.cid, presenter: false });
  }
  return { cid: d.cid, role: d.role };
}
export async function refresh(mid) {
  const d = await mcall(mid, 'POST', '/refresh', { body: {} });
  if (!S || S.mid !== mid) return { role: null };     // 그사이 나감(감사 U01)
  const before = S.role;
  S.role = d.role; S.exp = d.exp; S.until = d.until;
  saveGrant(mid, S);
  // 업로드 중에는 업로드 전용 출입증으로 로그인해 있으므로 새 토큰은 업로드가 끝난 뒤 쓴다
  if (uploading) uploading.pending = d.token;
  else await fbSignIn(d.token);
  if (!S || S.mid !== mid) return { role: null };
  scheduleRefresh();
  if (before !== d.role) sset('role', { role: d.role, cid: S.cid, presenter: false });
  return { role: d.role };
}
export async function leave(mid) {
  gen++;
  if (S && S.mid === mid) { beacon(true); stopTimers(); S = null; }
  releaseImages();
  await fbSignOut();
}
export function session(mid) {
  if (!S || (mid && S.mid !== mid)) return null;
  return { cid: S.cid, role: S.role, exp: S.exp, until: S.until };
}
function stopTimers() {
  if (!S) return;
  clearTimeout(S.timers.refresh); clearInterval(S.timers.hb);
  if (S.timers.off) S.timers.off();
  S.timers = {};
}
// 회의 API 공통: pt 자동, 자격 오류면 자격을 지우고 다시 입장하게 한다
async function mcall(mid, method, path, opts = {}) {
  if (!S || S.mid !== mid) throw new ZzError(401, 'pt_required', '참가 자격이 없어요. 다시 입장해 주세요.');
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
// 탭을 닫는 순간 보내는 작은 알림(녹음 멈춤 등)도 끝까지 가게 keepalive
export const setState = (mid, action, value) => mcall(mid, 'POST', '/state', { body: value === undefined ? { action } : { action, value }, keepalive: true });
export const takePresenter = mid => mcall(mid, 'POST', '/presenter', { body: {} });
// 진행 상태: baseRev·epoch 는 store live 에서 읽는다. 409 면 e.extra.live 로 맞추면 된다(서버가 최신 상태를 줌).
export async function sendLive(mid, { aid, page, view, force = false, full }) {
  const live = store?.get('live') || {};
  const m = store?.get('meeting') || {};
  const body = { aid, page, view, baseRev: live.rev || 0, epoch: m.presenter?.epoch ?? live.epoch ?? 0 };
  if (force) body.force = true;
  if (full !== undefined) body.full = !!full;   // 발표자 「전체 화면」(보내지 않으면 서버가 지금 값을 유지)
  try {
    const d = await mcall(mid, 'POST', '/live', { body, timeout: 6000 });   // 멈춘 요청 하나가 발표 화면을 20초 막지 않게(감사 R7 P3-5)
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
// 응답이 오는 사이 주관자에서 내려왔으면 숫자를 주지 않는다(비공개 투표, 감사 U07)
export async function pollTally(mid, pid) {
  const d = await mcall(mid, 'GET', `/polls/${enc(pid)}/tally`);
  if (!S || S.mid !== mid || S.role !== 'host') throw new ZzError(403, 'host_only', '주관자만 볼 수 있어요.');
  return d;
}
export const closePoll = (mid, pid) => mcall(mid, 'POST', `/polls/${enc(pid)}/close`, { body: {} });
export const revealPoll = (mid, pid) => mcall(mid, 'POST', `/polls/${enc(pid)}/reveal`, { body: {} });
export function transcribe(mid, blob, { n, at, aid, page } = {}) {
  const q = new URLSearchParams({ n: String(n) });
  if (at != null) q.set('at', String(Math.round(at)));
  if (aid) q.set('aid', aid);
  if (page != null) q.set('page', String(page));
  return mcall(mid, 'POST', `/transcribe?${q}`, { raw: blob, contentType: blob.type || 'audio/webm', timeout: 60000 });   // 서버가 최대 45초 기다림
}
export async function exportMd(mid) {
  if (!S || S.mid !== mid) throw new ZzError(401, 'pt_required', '참가 자격이 없어요. 다시 입장해 주세요.');
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
// 원본 확장자 → 형식(서버 lib/zzoom/contract.js 와 같은 표, 서버가 originalTypes 를 주면 그것을 우선)
const ORIGINAL_TYPE = {
  pdf: 'application/pdf', hwp: 'application/x-hwp', hwpx: 'application/hwp+zip',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif',
  bmp: 'image/bmp', avif: 'image/avif', heic: 'image/heic', heif: 'image/heif'
};
const DOC_KINDS = ['pdf', 'hwp', 'hwpx', 'pptx'];
let uploading = null;            // 업로드 중이면 { pending: 그사이 받은 보통 토큰 }
// 익명(U19): 원본 파일 이름(사람 이름이 들어 있을 수 있음)은 서버에 보내지 않는다. 확장자만 남긴다.
function anonName(file) {
  const ext = String(file?.name || '').toLowerCase().split('.').pop();
  return ORIGINAL_TYPE[ext] ? `원본.${ext}` : '원본';
}
/** 원본 받기 때 쓸 파일 이름: 안건 제목 + 원본 확장자(원본 파일 이름은 쓰지 않는다) */
export function originalFileName(agenda) {
  const ext = String(agenda?.original?.name || agenda?.original?.path || '').toLowerCase().split('.').pop();
  const base = String(agenda?.title || '안건').replace(/[\\/:*?"<>|]+/g, ' ').trim().slice(0, 80) || '안건';
  return ORIGINAL_TYPE[ext] ? `${base}.${ext}` : base;
}
let uploadChain = Promise.resolve();
// 업로드는 한 번에 하나씩(업로드 전용 출입증 로그인이 앱 하나를 같이 쓰므로)
export function uploadAgenda(mid, opts = {}) {
  const run = uploadChain.then(() => uploadOne(mid, opts));
  uploadChain = run.catch(() => {});
  return run;
}
async function uploadOne(mid, { file, converted, title, onProgress, signal } = {}) {
  const pages = converted?.pages || [], thumbs = converted?.thumbs || [];
  if (!pages.length) throw new ZzError(0, 'empty', '올릴 쪽이 없어요.');
  const notWebp = [...pages.map(p => p.type || p.blob?.type), ...thumbs.map(t => t.type)].some(t => t !== 'image/webp');
  if (notWebp) throw new ZzError(0, 'webp_unsupported', '이 브라우저는 WebP 그림을 만들지 못해요. 엣지나 크롬에서 올려 주세요.');
  const ext = String(file?.name || '').toLowerCase().split('.').pop();
  if (!ORIGINAL_TYPE[ext]) throw new ZzError(0, 'bad_ext', '올릴 수 없는 파일 형식이에요.');
  const kind = DOC_KINDS.includes(ext) ? ext : 'image';
  const permit = await startUpload(mid, { kind, ext, pages: pages.length, bytes: file.size });
  // 허가를 받은 뒤 실패·취소·commit 실패로 끝나면 허가 자리를 바로 돌려준다(서버 감사 R4 P3, CONTRACTS 업로드 허가 취소)
  try {
    if (signal?.aborted) throw new ZzError(0, 'aborted', '올리기를 취소했어요.');
    const types = Array.isArray(permit.originalTypes) && permit.originalTypes.length ? permit.originalTypes : [ORIGINAL_TYPE[ext]];
    const origType = types.includes(file.type) ? file.type : types[0];
    const jobs = [];
    pages.forEach((p, i) => jobs.push({ name: permit.files.pages[i], blob: p.blob, type: 'image/webp', label: `${i + 1}쪽 그림` }));
    thumbs.forEach((t, i) => { if (permit.files.thumbs[i]) jobs.push({ name: permit.files.thumbs[i], blob: t, type: 'image/webp', label: `${i + 1}쪽 미리보기` }); });
    jobs.push({ name: permit.files.original, blob: file, type: origType, label: '원본 파일' });
    // Storage 쓰기는 이 허가에만 주는 업로드 전용 출입증(up claim)으로만 된다 → 그 토큰으로 로그인하고, 끝나면 보통 토큰으로 돌아간다
    uploading = { pending: null };
    try {
      const f = permit.token ? await fbSignIn(permit.token) : await signedIn.promise;
      const tokenUntil = permit.tokenUntil || Infinity;
      let done = 0;
      const total = jobs.length;
      onProgress && onProgress({ phase: 'upload', done, total });
      const put = async j => {
        for (let a = 0; ; a++) {
          if (signal?.aborted) throw new ZzError(0, 'aborted', '올리기를 취소했어요.');
          if (Date.now() > tokenUntil - 30000) throw new ZzError(0, 'upload_expired', '올리는 시간이 너무 길어 끊겼어요. 다시 올려 주세요.');
          try { await f.S.uploadBytes(f.S.ref(f.st, permit.path + j.name), j.blob, { contentType: j.type }); return; }
          catch (e) { if (a >= 2) throw new ZzError(0, 'upload_failed', `${j.label}을 올리지 못했어요. 다시 올려 주세요.`, { detail: String(e?.code || e), file: j.name }); }
        }
      };
      let next = 0;
      const worker = async () => { while (next < jobs.length) { const j = jobs[next++]; await put(j); done++; onProgress && onProgress({ phase: 'upload', done, total }); } };
      await Promise.all([worker(), worker(), worker()]);
      if (signal?.aborted) throw new ZzError(0, 'aborted', '올리기를 취소했어요.');
      onProgress && onProgress({ phase: 'commit', done: total, total });
    } finally {
      const pending = uploading && uploading.pending;
      uploading = null;
      // 보통 토큰으로 되돌린다: 업로드 중 갱신해 둔 것이 있으면 그것, 없으면 새로 받는다
      if (permit.token && S && S.mid === mid) {
        if (pending) await fbSignIn(pending).catch(e => console.warn('[zzoom] 로그인 되돌리기 실패', e));
        else await refresh(mid).catch(e => console.warn('[zzoom] 토큰 다시 받기 실패', e));
      }
    }
    const sizes = pages.map(p => [Math.round(p.w), Math.round(p.h)]);
    return await commitUpload(mid, permit.uploadId, { title: title || '안건', pages: pages.length, sizes, originalName: anonName(file) });
  } catch (e) {
    releasePermit(mid, permit.uploadId);
    throw e;
  }
}

// ================= 2-4. 실시간 구독 =================
// 로그인 전이면 로그인 뒤 붙인다. 동기로 해제 함수를 돌려준다.
function live(make, cb, label) {
  // 구독이 오류로 끝나면(토큰 만료·연결 문제 등) Firestore 는 다시 붙지 않는다. 학교망에서 실제로 끊기므로 쉬었다가 다시 구독한다.
  let unsub = null, stopped = false, fails = 0, timer = 0, warned = false;
  const start = () => {
    timer = 0;
    if (stopped) return;
    signedIn.promise.then(f => {
      if (stopped) return;
      try {
        unsub = make(f, snap => { fails = 0; spatch('conn', { firebase: 'ok' }); cb(snap); }, err => {
          console.warn('[zzoom] 구독 오류', label, err?.code || err);
          spatch('conn', { firebase: 'off' });
          // 권한 거절은 대개 실시간 출입증 만료 — 30초에 한 번 바로 새로 받는다(감사 R7 P5-H1)
          if (err?.code === 'permission-denied' && S && Date.now() - (S.permRefreshAt || 0) > 30000) { S.permRefreshAt = Date.now(); scheduleRefresh(0); }
          if (err?.code === 'permission-denied' && !warned) { warned = true; toast('실시간 연결을 다시 잇는 중이에요. 계속 안 되면 다시 입장해 주세요.', 'warn'); }
          try { unsub && unsub(); } catch { /* 무시 */ }
          unsub = null;
          fails++;
          if (!stopped && !timer) timer = setTimeout(start, Math.min(30000, 1000 * 2 ** Math.min(fails - 1, 5)));
        });
      } catch (e) {
        console.warn('[zzoom] 구독 실패', label, e);
        fails++;
        if (!stopped && !timer) timer = setTimeout(start, Math.min(30000, 1000 * 2 ** Math.min(fails - 1, 5)));
      }
    });
  };
  start();
  return () => { stopped = true; if (timer) clearTimeout(timer); if (unsub) unsub(); };
}
const mref = (f, mid, ...p) => f.F.doc(f.db, COLL, mid, ...p);
const cref = (f, mid, name) => f.F.collection(f.db, COLL, mid, name);
const docs = snap => snap.docs.map(d => ({ id: d.id, ...d.data() }));

export const subscribeMeeting = (mid, cb) => live((f, ok, bad) => f.F.onSnapshot(mref(f, mid), s => ok(s.exists() ? { ...s.data(), id: mid } : { gone: true, id: mid }), bad), cb, 'meeting');
export const subscribeAgenda = (mid, cb) => live((f, ok, bad) => f.F.onSnapshot(cref(f, mid, 'agenda'), s => ok(docs(s).map(d => ({ aid: d.id, ...d }))), bad), cb, 'agenda');
export const subscribeHands = (mid, cb) => live((f, ok, bad) => f.F.onSnapshot(cref(f, mid, 'hands'), s => ok(docs(s).map(d => ({ cid: d.id, at: d.at })).sort((a, b) => (a.at - b.at) || (a.cid < b.cid ? -1 : 1))), bad), cb, 'hands');
export const subscribeChat = (mid, cb) => live((f, ok, bad) => f.F.onSnapshot(f.F.query(cref(f, mid, 'chat'), f.F.orderBy('at', 'desc'), f.F.limit(200)), s => ok(docs(s).reverse()), bad), cb, 'chat');
export const subscribePolls = (mid, cb) => live((f, ok, bad) => f.F.onSnapshot(cref(f, mid, 'polls'), s => ok(docs(s).map(d => ({ pid: d.id, ...d })).sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0))), bad), cb, 'polls');
export const subscribeTranscript = (mid, cb) => live((f, ok, bad) => f.F.onSnapshot(cref(f, mid, 'transcript'), s => ok(docs(s).sort((a, b) => a.n - b.n)), bad), cb, 'transcript');
export const subscribePeople = (mid, cb) => live((f, ok, bad) => f.F.onSnapshot(cref(f, mid, 'people'), s => ok(docs(s).map(d => ({ cid: d.id, ...d }))), bad), cb, 'people');
// 쪽 단위(3팀). 복합 색인 없이 되게 pageKey 하나로만 묻고 seq 는 여기서 정렬한다.
export const subscribeStrokes = (mid, pageKey, cb) => live((f, ok, bad) => f.F.onSnapshot(f.F.query(cref(f, mid, 'strokes'), f.F.where('pageKey', '==', pageKey)), s => ok(docs(s).sort((a, b) => a.seq - b.seq)), bad), cb, 'strokes');
export const subscribePageEpoch = (mid, pageKey, cb) => live((f, ok, bad) => f.F.onSnapshot(mref(f, mid, 'pages', pageKey), s => ok(s.exists() ? (s.data().epoch || 0) : 0), bad), cb, 'page');

// ================= 2-5. 그림(Storage) =================
const imgCache = new Map();   // path → { p: Promise<objectURL>, url: 받은 뒤 URL }
export function pageImageUrl(agenda, page, { thumb = false } = {}) {
  if (!agenda || agenda.kind === 'board' || !agenda.base) return Promise.resolve(null);
  const path = `${agenda.base}/${thumb ? 't' : 'p'}${String(page).padStart(3, '0')}.webp`;
  if (!imgCache.has(path)) {
    const ent = { p: null, url: null };
    ent.p = signedIn.promise.then(f => retryNet(() => f.S.getBlob(f.S.ref(f.st, path)))).then(b => (ent.url = URL.createObjectURL(b)));
    ent.p.catch(() => { if (imgCache.get(path) === ent) imgCache.delete(path); });
    imgCache.set(path, ent);
  }
  return imgCache.get(path).p;
}
// keep = 남길 object URL 또는 Storage 경로. 아직 받는 중인 그림은 건드리지 않는다(곧 쓸 다음 쪽일 수 있어서, 감사 U08).
export function releaseImages(keep = []) {
  const k = new Set(keep);
  for (const [path, ent] of imgCache) {
    if (!ent.url || k.has(ent.url) || k.has(path)) continue;
    URL.revokeObjectURL(ent.url);
    imgCache.delete(path);
  }
}
export async function originalBlob(agenda) {
  if (!agenda?.original?.path) return null;
  const f = await signedIn.promise;
  return retryNet(() => f.S.getBlob(f.S.ref(f.st, agenda.original.path)));
}
export function downloadOriginal(agenda) {
  return originalBlob(agenda).then(b => { if (b) saveBlob(b, originalFileName(agenda)); return !!b; });
}

// ================= AGENDA_OPEN (2026-11-25): 누구나 안건 만들기·자료 붙이기·발표하기 =================
// 위 줄은 그대로 두고 새 함수만 덧붙였다(뼈대 담당이 U02·U14 를 고치는 중). 익명: 이름은 보내지도 받지도 않는다.
export const createAgenda = (mid, title) => mcall(mid, 'POST', '/agenda', { body: { title } });
// 내가 올린 안건 aid 목록(다시 들어와 cid 가 바뀌어도 같은 사람이면 나온다)
export const myAgenda = mid => mcall(mid, 'GET', '/agenda/mine').then(d => (Array.isArray(d?.aids) ? d.aids : []));
// 발표하기: 진행자가 되고, aid 를 주면 그 안건 page(기본 1)로 모두를 끌어온다(서버가 forceSeq 를 올림)
export async function present(mid, aid, page) {
  const body = aid ? (page ? { aid, page } : { aid }) : {};
  const d = await mcall(mid, 'POST', '/presenter', { body });
  // 회의 문서 스냅숏이 오기 전에 쪽을 넘겨도 epoch 가 맞도록 store 를 먼저 맞춘다(스냅숏이 곧 같은 값으로 덮는다)
  const m = store?.get('meeting');
  if (m && !m.gone && d?.presenter) store.set('meeting', { ...m, presenter: d.presenter, ...(d.live ? { live: d.live } : {}) });
  if (d?.live) acceptLive(d.live);
  return d;
}
// 이미 있는 안건(제목만 만든 것, 또는 자료 바꾸기)에 파일을 붙인다. 모양은 uploadAgenda 와 같고 aid 만 더 받는다.
export function attachAgendaFile(mid, aid, opts = {}) {
  const run = uploadChain.then(() => uploadToAgenda(mid, aid, opts));
  uploadChain = run.catch(() => {});
  return run;
}
async function uploadToAgenda(mid, aid, { file, converted, onProgress, signal } = {}) {
  const pages = converted?.pages || [], thumbs = converted?.thumbs || [];
  if (!aid) throw new ZzError(0, 'bad_aid', '안건을 골라 주세요.');
  if (!pages.length) throw new ZzError(0, 'empty', '올릴 쪽이 없어요.');
  const notWebp = [...pages.map(p => p.type || p.blob?.type), ...thumbs.map(t => t.type)].some(t => t !== 'image/webp');
  if (notWebp) throw new ZzError(0, 'webp_unsupported', '이 브라우저는 WebP 그림을 만들지 못해요. 엣지나 크롬에서 올려 주세요.');
  const ext = String(file?.name || '').toLowerCase().split('.').pop();
  if (!ORIGINAL_TYPE[ext]) throw new ZzError(0, 'bad_ext', '올릴 수 없는 파일 형식이에요.');
  const kind = DOC_KINDS.includes(ext) ? ext : 'image';
  const permit = await startUpload(mid, { kind, ext, pages: pages.length, bytes: file.size, aid });
  // 허가를 받은 뒤 실패·취소·commit 실패로 끝나면 허가 자리를 바로 돌려준다(서버 감사 R4 P3, CONTRACTS 업로드 허가 취소)
  try {
    if (signal?.aborted) throw new ZzError(0, 'aborted', '올리기를 취소했어요.');
    const types = Array.isArray(permit.originalTypes) && permit.originalTypes.length ? permit.originalTypes : [ORIGINAL_TYPE[ext]];
    const origType = types.includes(file.type) ? file.type : types[0];
    const jobs = [];
    pages.forEach((p, i) => jobs.push({ name: permit.files.pages[i], blob: p.blob, type: 'image/webp', label: `${i + 1}쪽 그림` }));
    thumbs.forEach((t, i) => { if (permit.files.thumbs[i]) jobs.push({ name: permit.files.thumbs[i], blob: t, type: 'image/webp', label: `${i + 1}쪽 미리보기` }); });
    jobs.push({ name: permit.files.original, blob: file, type: origType, label: '원본 파일' });
    uploading = { pending: null };
    try {
      const f = permit.token ? await fbSignIn(permit.token) : await signedIn.promise;
      const tokenUntil = permit.tokenUntil || Infinity;
      let done = 0;
      const total = jobs.length;
      onProgress && onProgress({ phase: 'upload', done, total });
      const put = async j => {
        for (let a = 0; ; a++) {
          if (signal?.aborted) throw new ZzError(0, 'aborted', '올리기를 취소했어요.');
          if (Date.now() > tokenUntil - 30000) throw new ZzError(0, 'upload_expired', '올리는 시간이 너무 길어 끊겼어요. 다시 올려 주세요.');
          try { await f.S.uploadBytes(f.S.ref(f.st, permit.path + j.name), j.blob, { contentType: j.type }); return; }
          catch (e) { if (a >= 2) throw new ZzError(0, 'upload_failed', '쪽 그림을 올리지 못했어요. 다시 올려 주세요.', { detail: String(e?.code || e) }); }
        }
      };
      let next = 0;
      const worker = async () => { while (next < jobs.length) { const j = jobs[next++]; await put(j); done++; onProgress && onProgress({ phase: 'upload', done, total }); } };
      await Promise.all([worker(), worker(), worker()]);
      if (signal?.aborted) throw new ZzError(0, 'aborted', '올리기를 취소했어요.');
      onProgress && onProgress({ phase: 'commit', done: total, total });
    } finally {
      const pending = uploading && uploading.pending;
      uploading = null;
      if (permit.token && S && S.mid === mid) {
        if (pending) await fbSignIn(pending).catch(e => console.warn('[zzoom] 로그인 되돌리기 실패', e));
        else await refresh(mid).catch(e => console.warn('[zzoom] 토큰 다시 받기 실패', e));
      }
    }
    const sizes = pages.map(p => [Math.round(p.w), Math.round(p.h)]);
    return await commitUpload(mid, permit.uploadId, { aid, pages: pages.length, sizes, originalName: anonName(file) });
  } catch (e) {
    releasePermit(mid, permit.uploadId);
    throw e;
  }
}
// ================= EASY_UX (2026-11-26): 발표 마치기 =================
// 지금 발표자 본인이나 담당자만. 서버가 presenter.cid 를 비우고 live.aid 를 null 로 돌려 모두 「오늘의 안건」 대기 화면으로 간다.
export async function presenterEnd(mid) {
  const d = await mcall(mid, 'POST', '/presenter/end', { body: {} });
  const m = store?.get('meeting');
  if (m && !m.gone && d && 'presenter' in d) store.set('meeting', { ...m, presenter: d.presenter, ...(d.live ? { live: d.live } : {}) });
  if (d?.live) acceptLive(d.live);
  return d;
}
// ================= 서버 감사 R4 P3 (2026-11-26): 업로드 허가 취소 =================
// 본인 허가만. 없거나 이미 확정된 허가(404 upload_unknown)는 조용히 넘긴다.
export const cancelUpload = (mid, uploadId) => mcall(mid, 'DELETE', `/uploads/${enc(uploadId)}`);
function releasePermit(mid, uploadId) {
  if (!uploadId) return;
  Promise.resolve().then(() => cancelUpload(mid, uploadId)).catch(e => {
    if (e?.status !== 404) console.warn('[zzoom] 업로드 허가 돌려주기 실패', e?.code || e);
  });
}
