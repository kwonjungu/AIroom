// AGENDA_OPEN 화면 시험용 가짜 api.js. agenda_e2e.py 가 /zzoom/api.js 자리에 끼운다(서버·Firebase 없음).
// 익명: 가짜 자료에도 사람 이름을 넣지 않는다. window.__fake 로 상태를 바꾸고 부른 기록(calls)을 읽는다.
export class ZzError extends Error {
  constructor(status, code, message, extra = {}) { super(message || code); this.name = 'ZzError'; this.status = status; this.code = code; this.extra = extra; }
}
const P = new URLSearchParams(location.search);
const ROLE = P.get('role') || 'viewer';
const ME = ROLE === 'host' ? 'c-host' : 'c-me';
const now = Date.now();
const F = window.__fake = {
  calls: [], store: null, cbs: {}, me: ME, seq: 3,
  meeting: {
    id: 'mabcdefghij12', title: '11월 교직원 협의회', status: P.get('status') || 'ready', allowRecording: true,
    agendaOrder: ['aaaaaaa1', 'bbbbbbb2'], live: null, presenter: null, penLock: false, recording: false,
    counts: { people: 3, hands: 0, peak: 3, at: now }
  },
  agenda: [
    { aid: 'aaaaaaa1', title: '2027 교육과정 운영 계획', kind: 'pdf', pages: 4, sizes: [[1414, 2000], [1414, 2000], [1414, 2000], [1414, 2000]], ver: 1, ownerCid: 'c-other' },
    { aid: 'bbbbbbb2', title: '학교 행사 일정', kind: 'empty', pages: 0, sizes: [], ver: 1, ownerCid: 'c-other' }
  ],
  push(k) {
    const map = { meeting: () => JSON.parse(JSON.stringify(F.meeting)), agenda: () => F.agenda.map(a => ({ ...a })) };
    (F.cbs[k] || []).forEach(cb => cb(map[k]()));
  },
  setMeeting(patch) { Object.assign(F.meeting, patch); F.push('meeting'); },
  hands: [],
  setHands(v) { F.hands = v; (F.cbs.hands || []).forEach(cb => cb(v.slice())); }
};
const clean = v => (v instanceof Blob ? { blob: v.size, type: v.type } : typeof v === 'function' ? 'fn' : (typeof AbortSignal !== 'undefined' && v instanceof AbortSignal) ? 'signal' : v);
const log = (name, ...args) => { F.calls.push({ name, args: JSON.parse(JSON.stringify(args, (k, v) => clean(v))) }); };
const wait = ms => new Promise(r => setTimeout(r, ms));
const sub = k => (mid, cb) => { (F.cbs[k] ||= []).push(cb); setTimeout(() => F.push(k), 0); return () => { F.cbs[k] = F.cbs[k].filter(x => x !== cb); }; };
const none = () => (...a) => { const cb = a[a.length - 1]; setTimeout(() => cb([]), 0); return () => {}; };

export function bindStore(s) { F.store = s; }
export function authToken() { return 'fake-token'; }
export async function health() { return { ok: true, firebase: true, redis: true }; }
export async function listMeetings() { return { meetings: [], isAdmin: false }; }
export async function staffNames() { return []; }
export function rememberedName() { return ''; }
export function rememberName() {}
export async function join() { return resume(); }
export async function resume() {
  const r = { cid: ME, name: '', role: ROLE, presenter: false };
  setTimeout(() => F.store.set('role', r), 0);
  return { ...r, meeting: F.meeting };
}
export async function becomeHost() { return null; }
export async function refresh() { return null; }
export async function leave() {}
export function session() { return { cid: ME, role: ROLE }; }
export async function setState(mid, action) { log('setState', action); return { meeting: F.meeting }; }
export async function takePresenter() { return present(); }
export async function sendLive(mid, b) {
  log('sendLive', b);
  const l = F.meeting.live || { rev: 0, epoch: F.meeting.presenter?.epoch || 0, forceSeq: 0 };
  F.meeting.live = { ...l, aid: b.aid, page: b.page, view: b.view, rev: (l.rev || 0) + 1, forceSeq: (l.forceSeq || 0) + (b.force ? 1 : 0), at: Date.now() };
  F.push('meeting');
  return { live: F.meeting.live };
}
export async function updateAgenda(mid, aid, b) { log('updateAgenda', aid, b); const a = F.agenda.find(x => x.aid === aid); if (b.title) { a.title = b.title; F.push('agenda'); } return { agenda: a }; }
export async function deleteAgenda(mid, aid) {
  log('deleteAgenda', aid);
  F.agenda = F.agenda.filter(a => a.aid !== aid); F.meeting.agendaOrder = F.meeting.agendaOrder.filter(x => x !== aid);
  F.push('agenda'); F.push('meeting'); return { ok: true };
}
// ---- AGENDA_OPEN 새 함수 ----
export async function createAgenda(mid, title) {
  log('createAgenda', title);
  await wait(40);
  const aid = 'nnnnnnn' + (F.seq++);
  F.agenda.push({ aid, title, kind: 'empty', pages: 0, sizes: [], ver: 1, ownerCid: ME });
  F.meeting.agendaOrder.push(aid);
  F.push('agenda'); F.push('meeting');
  return { aid, agenda: F.agenda[F.agenda.length - 1] };
}
export async function myAgenda() { log('myAgenda'); return F.agenda.filter(a => a.ownerCid === ME).map(a => a.aid); }
export async function present(mid, aid) {
  log('present', aid || null);
  await wait(40);
  if (F.meeting.status !== 'live') throw new ZzError(409, 'state_ready', '회의가 시작된 뒤에 발표할 수 있어요.');
  const epoch = Math.max(F.meeting.presenter?.epoch || 0, F.meeting.live?.epoch || 0) + 1;
  F.meeting.presenter = { cid: ME, epoch };
  const l = F.meeting.live || { rev: 0, forceSeq: 0 };
  if (aid) F.meeting.live = { aid, page: 1, view: { cx: 0.5, cy: 0.5, z: 1 }, rev: (l.rev || 0) + 1, epoch, forceSeq: (l.forceSeq || 0) + 1, at: Date.now() };
  F.push('meeting');
  return { presenter: F.meeting.presenter, live: F.meeting.live };
}
export async function attachAgendaFile(mid, aid, { file, converted, onProgress, signal } = {}) {
  log('attachAgendaFile', aid, { name: file.name, pages: converted.pages.length, types: converted.pages.map(p => p.type) });
  const total = converted.pages.length * 2 + 1;
  for (let d = 0; d <= total; d++) {
    if (signal?.aborted) throw new ZzError(0, 'aborted', '올리기를 취소했어요.');
    onProgress && onProgress({ phase: 'upload', done: d, total });
    await wait(80);
  }
  onProgress && onProgress({ phase: 'commit', done: total, total });
  const a = F.agenda.find(x => x.aid === aid);
  Object.assign(a, { kind: 'image', pages: converted.pages.length, sizes: converted.pages.map(p => [p.w, p.h]), ver: (a.ver || 1) + 1 });
  F.push('agenda');
  return { aid, agenda: a };
}
export async function convertFile(file, { onProgress, signal } = {}) {
  log('convertFile', file.name);
  const mod = await import('/zzoom/convert/index.js');
  return mod.convert(file, { onProgress, signal });
}
// 쪽 그림: 안건 id 와 쪽 번호가 적힌 작은 SVG
export async function pageImageUrl(agenda, page) {
  if (!agenda || agenda.kind === 'board' || !(agenda.pages >= 1)) return null;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="707" height="1000"><rect width="707" height="1000" fill="#fff"/><text x="60" y="140" font-size="64" font-family="sans-serif" fill="#1d1d1f">${agenda.aid} ${page}</text></svg>`;
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}
export const releaseImages = () => {};
export async function originalBlob() { return null; }
export function downloadOriginal() { return Promise.resolve(false); }
export async function exportMd() { return {}; }
export async function uploadAgenda() { return {}; }
export async function transcribe() { return {}; }
export const startUpload = async () => ({});
export const commitUpload = async () => ({});
export const createBoard = async () => ({});
export const addBoardPage = async () => ({});
export const saveStrokes = async () => ({ strokes: [] });
export const deleteStroke = async () => ({});
export const clearPage = async () => ({});
export const sendChat = async () => ({});
export const deleteChat = async () => ({});
export async function setHand(mid, up) { log('setHand', up); await wait(30); return { ok: true }; }   // 손 칸 시험(ui_r2_e2e)
export const lowerHand = async () => ({});
export const lowerAllHands = async () => ({});
export const createPoll = async () => ({});
export const vote = async () => ({});
export const myVote = async () => ({ optionId: null });
export const pollTally = async () => ({ tally: {}, total: 0 });
export const closePoll = async () => ({});
export const revealPoll = async () => ({});
export const createMeeting = async () => ({});
export const updateMeeting = async () => ({});
export const deleteMeeting = async () => ({});
export const unlockHost = async () => ({});
export const subscribeMeeting = sub('meeting');
export const subscribeAgenda = sub('agenda');
export const subscribePeople = none();
export const subscribeTranscript = none();
export const subscribeHands = (mid, cb) => { (F.cbs.hands ||= []).push(cb); setTimeout(() => cb((F.hands || []).slice()), 0); return () => { F.cbs.hands = F.cbs.hands.filter(x => x !== cb); }; };
export const subscribeChat = none();
export const subscribePolls = none();
export const subscribeStrokes = none();
export const subscribePageEpoch = (mid, k, cb) => { setTimeout(() => cb(0), 0); return () => {}; };
export function acceptLive(next) {
  const s = F.store; if (!s) return false;
  const prev = s.get('live') || null; next = next || null;
  if (prev && next && prev.epoch === next.epoch && (next.rev || 0) < (prev.rev || 0)) return false;
  if (JSON.stringify(prev) === JSON.stringify(next)) return false;
  s.set('live', next); return true;
}
// ---- EASY_UX 팀 B: 발표 마치기, 업로드 허가 취소 ----
export async function presenterEnd(mid) {
  log('presenterEnd');
  await wait(40);
  if (F.meeting.status !== 'live') throw new ZzError(409, 'state_' + F.meeting.status, '회의 중일 때만 할 수 있어요.');
  if (F.meeting.presenter?.cid && F.meeting.presenter.cid !== ME && ROLE !== 'host') throw new ZzError(403, 'not_presenter', '지금 발표하는 사람이나 주관자만 발표를 마칠 수 있어요.');
  if (!F.meeting.presenter?.cid) return { presenter: F.meeting.presenter, live: F.meeting.live, changed: false };
  const epoch = Math.max(F.meeting.presenter?.epoch || 0, F.meeting.live?.epoch || 0) + 1;
  const l = F.meeting.live || { rev: 0, forceSeq: 0 };
  F.meeting.presenter = { cid: null, epoch };
  F.meeting.live = { aid: null, page: 1, view: { cx: 0.5, cy: 0.5, z: 1 }, rev: (l.rev || 0) + 1, epoch, forceSeq: (l.forceSeq || 0) + 1, at: Date.now() };
  F.push('meeting');
  return { presenter: F.meeting.presenter, live: F.meeting.live, changed: true };
}
export async function cancelUpload(mid, uploadId) { log('cancelUpload', uploadId); return { ok: true }; }
