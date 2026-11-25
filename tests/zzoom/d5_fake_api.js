// 디자인 5팀 화면 시험용 가짜 api.js. d5_e2e.py 가 /zzoom/api.js 자리에 끼운다(서버·Firebase 없음).
// window.__fake 로 시험이 상태를 바꾸고 부른 기록(calls)을 읽는다.
export class ZzError extends Error {
  constructor(status, code, message, extra = {}) { super(message || code); this.name = 'ZzError'; this.status = status; this.code = code; this.extra = extra; }
}
const P = new URLSearchParams(location.search);
const ROLE = P.get('role') || 'host';
const now = Date.now();
const F = window.__fake = {
  calls: [],
  store: null,
  cbs: {},
  meeting: {
    id: 'mabcdefghij12', title: '11월 교직원 협의회', status: P.get('status') || 'ready', allowRecording: true,
    agendaOrder: ['aaaaaaa1', 'bbbbbbb2'], live: null, presenter: null, penLock: false, recording: P.get('rec') === '1',
    counts: { people: 3, hands: 0, peak: 3, at: now }
  },
  agenda: [
    { aid: 'aaaaaaa1', title: '2027 교육과정 운영 계획', kind: 'pdf', pages: 12, sizes: [[1414, 2000]], ver: 1, original: { path: 'x/original.pdf', name: '교육과정.pdf', bytes: 10 } },
    { aid: 'bbbbbbb2', title: '학교 행사 일정', kind: 'hwp', pages: 3, sizes: [[1414, 2000]], ver: 1 }
  ],
  people: [
    { cid: 'c-host', name: '권주관', role: 'host', seenAt: now },
    { cid: 'c2', name: '김교사', role: 'viewer', seenAt: now - 10000 },
    { cid: 'c3', name: '박교사', role: 'viewer', seenAt: now - 120000 },
    { cid: 'c4', name: '이교사', role: 'viewer', seenAt: now - 20000, left: true }
  ],
  transcript: [],
  transcribeFail: 0,      // 앞으로 몇 번 연결 오류로 실패할지
  transcribeFatal: false, // 403 으로 실패
  push(k) {
    const map = { meeting: () => ({ ...F.meeting, agendaOrder: [...F.meeting.agendaOrder] }), agenda: () => F.agenda.map(a => ({ ...a })), people: () => F.people.map(p => ({ ...p })), transcript: () => [...F.transcript] };
    (F.cbs[k] || []).forEach(cb => cb(map[k]()));
  },
  setMeeting(patch) { Object.assign(F.meeting, patch); F.push('meeting'); }
};
const log = (name, ...args) => { F.calls.push({ name, args: JSON.parse(JSON.stringify(args.map(a => a instanceof Blob ? { blob: a.size, type: a.type } : a), (k, v) => v instanceof Blob ? { blob: v.size, type: v.type } : v)) }); };
const wait = ms => new Promise(r => setTimeout(r, ms));
const sub = k => (mid, cb) => { (F.cbs[k] ||= []).push(cb); setTimeout(() => F.push(k), 0); return () => { F.cbs[k] = F.cbs[k].filter(x => x !== cb); }; };
const none = () => (...a) => { const cb = a[a.length - 1]; setTimeout(() => cb([]), 0); return () => {}; };

export function bindStore(s) { F.store = s; }
export function authToken() { return 'fake-token'; }
export async function health() { return { ok: true, firebase: true, redis: true }; }
export async function listMeetings() { return { meetings: [], isAdmin: false }; }
export async function staffNames() { return []; }
export function rememberedName() { return '권주관'; }
export function rememberName() {}
export async function join() { return resume(); }
export async function resume() {
  const r = { cid: ROLE === 'host' ? 'c-host' : 'c2', name: ROLE === 'host' ? '권주관' : '김교사', role: ROLE, presenter: false };
  setTimeout(() => F.store.set('role', r), 0);
  return { ...r, meeting: F.meeting };
}
export async function becomeHost() { return null; }
export async function refresh() { return null; }
export async function leave() {}
export function session() { return { cid: 'c-host', name: '권주관', role: ROLE }; }

export async function setState(mid, action, value) {
  log('setState', action, value);
  await wait(50);
  const m = F.meeting;
  if (action === 'start') { m.status = 'live'; m.presenter = m.presenter || { cid: 'c-host', name: '권주관', epoch: 1 }; m.live = { aid: m.agendaOrder[0], page: 1, view: { cx: .5, cy: .5, z: 1 }, rev: 1, epoch: 1, forceSeq: 0, at: Date.now() }; }
  else if (action === 'end') { if (m.status !== 'live') throw new ZzError(409, 'state_' + m.status, '지금은 할 수 없습니다.'); m.status = 'ended'; m.recording = false; }
  else if (action === 'penLock') m.penLock = !!value;
  else if (action === 'recording') { if (m.status !== 'live') throw new ZzError(409, 'state_ready', '회의를 시작한 뒤에 녹음할 수 있습니다.'); m.recording = !!value; }
  F.push('meeting');
  return { meeting: m };
}
export async function takePresenter() {
  log('takePresenter');
  await wait(30);
  F.meeting.presenter = { cid: 'c-host', name: '권주관', epoch: (F.meeting.presenter?.epoch || 0) + 1 };
  F.push('meeting');
  return { presenter: F.meeting.presenter, live: F.meeting.live };
}
export async function sendLive(...a) { log('sendLive', a[1]); return { live: F.meeting.live }; }
export async function updateAgenda(mid, aid, b) {
  log('updateAgenda', aid, b);
  await wait(30);
  if (b.title) { F.agenda.find(a => a.aid === aid).title = b.title; F.push('agenda'); }
  if (Number.isInteger(b.index)) {
    const o = F.meeting.agendaOrder.filter(x => x !== aid);
    o.splice(b.index, 0, aid);
    F.meeting.agendaOrder = o; F.push('meeting');
  }
  return { agendaOrder: F.meeting.agendaOrder };
}
export async function deleteAgenda(mid, aid) {
  log('deleteAgenda', aid);
  await wait(30);
  if (F.meeting.live?.aid === aid) throw new ZzError(409, 'agenda_live', '진행 중인 안건은 지울 수 없습니다.');
  F.agenda = F.agenda.filter(a => a.aid !== aid);
  F.meeting.agendaOrder = F.meeting.agendaOrder.filter(x => x !== aid);
  F.push('agenda'); F.push('meeting');
  return { ok: true };
}
export async function exportMd(mid) { log('exportMd'); await wait(100); return { name: '쭘_기록.md', bytes: 10 }; }
export async function originalBlob(agenda) { log('originalBlob', agenda.aid); return new Blob(['%PDF-1.4 fake'], { type: 'application/pdf' }); }

// 변환: 이름이 slow 로 시작하면 느린 가짜(취소 시험), broken 이면 실패, 나머지는 진짜 변환기
export async function convertFile(file, { onProgress, signal } = {}) {
  log('convertFile', file.name);
  if (file.name.startsWith('slow')) {
    for (let i = 1; i <= 100; i++) {
      if (signal?.aborted) { F.aborted = (F.aborted || 0) + 1; throw Object.assign(new Error('취소'), { code: 'ABORTED' }); }
      onProgress && onProgress({ phase: 'render', done: i, total: 100, ratio: i / 100 });
      await wait(100);
    }
  }
  if (file.name.startsWith('broken')) { await wait(100); throw Object.assign(new Error('PDF 파일을 읽지 못했어요. 파일이 손상됐는지 확인해 주세요.'), { code: 'PDF_PARSE' }); }
  const mod = await import('/zzoom/convert/index.js');
  return mod.convert(file, { onProgress, signal });
}
export async function uploadAgenda(mid, { file, converted, title, onProgress, signal } = {}) {
  log('uploadAgenda', { name: file.name, title, pages: converted.pages.length, types: converted.pages.map(p => p.type) });
  const total = converted.pages.length * 2 + 1;
  for (let d = 0; d <= total; d++) {
    if (signal?.aborted) throw new ZzError(0, 'aborted', '올리기를 취소했습니다.');
    onProgress && onProgress({ phase: 'upload', done: d, total });
    await wait(F.uploadDelay || 150);
  }
  if (F.uploadFail) throw new ZzError(0, 'upload_failed', 'p001.webp 올리기에 실패했습니다.');
  onProgress && onProgress({ phase: 'commit', done: total, total });
  await wait(100);
  const aid = 'ccccccc' + (F.agenda.length + 1);
  F.agenda.push({ aid, title, kind: 'image', pages: converted.pages.length, sizes: converted.pages.map(p => [p.w, p.h]), ver: 1 });
  F.meeting.agendaOrder.push(aid);
  F.push('agenda'); F.push('meeting');
  return { aid };
}
export async function transcribe(mid, blob, meta) {
  log('transcribe', { size: blob.size, type: blob.type, ...meta });
  await wait(80);
  if (F.transcribeFatal) throw new ZzError(403, 'recording_off', '이 회의는 녹음을 허용하지 않았습니다.');
  if (F.transcribeFail > 0) { F.transcribeFail--; throw new ZzError(0, 'network', '서버에 연결하지 못했습니다.'); }
  F.transcript = F.transcript.filter(t => t.n !== meta.n).concat({ id: 't' + meta.n, n: meta.n, at: meta.at, aid: meta.aid, page: meta.page, text: `${meta.n + 1}번째 조각을 글로 바꾼 내용입니다. 다음 주 일정을 확인했습니다.` }).sort((a, b) => a.n - b.n);
  F.push('transcript');
  return { id: 't' + meta.n, n: meta.n };
}

// 다른 팀이 쓰는 것(이 시험에서는 빈 모듈로 바꿔 끼우므로 모양만)
export const startUpload = async () => ({});
export const commitUpload = async () => ({});
export const createBoard = async () => ({});
export const addBoardPage = async () => ({});
export const saveStrokes = async () => ({ strokes: [] });
export const deleteStroke = async () => ({});
export const clearPage = async () => ({});
export const sendChat = async () => ({});
export const deleteChat = async () => ({});
export const setHand = async () => ({});
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
export const subscribeMeeting = (mid, cb) => { (F.cbs.meeting ||= []).push(cb); setTimeout(() => F.push('meeting'), 0); return () => { F.cbs.meeting = F.cbs.meeting.filter(x => x !== cb); }; };
export const subscribeAgenda = sub('agenda');
export const subscribePeople = sub('people');
export const subscribeTranscript = sub('transcript');
export const subscribeHands = none();
export const subscribeChat = none();
export const subscribePolls = none();
export const subscribeStrokes = none();
export const subscribePageEpoch = (mid, k, cb) => { setTimeout(() => cb(0), 0); return () => {}; };
export const pageImageUrl = async () => null;
export const releaseImages = () => {};
export function downloadOriginal() { return Promise.resolve(false); }
// app.js 가 진행 상태를 store 에 넣을 때 부름(진짜 api.js 와 같은 규칙)
export function acceptLive(next) {
  const s = F.store; if (!s) return false;
  const prev = s.get('live') || null; next = next || null;
  if (prev && next && prev.epoch === next.epoch && (next.rev || 0) < (prev.rev || 0)) return false;
  if (JSON.stringify(prev) === JSON.stringify(next)) return false;
  s.set('live', next); return true;
}
// 원본 내려받기 이름: 진짜 api.js 와 같게 「안건 제목 + 확장자」(익명화로 원본 파일 이름은 쓰지 않는다)
export function originalFileName(agenda) {
  const ext = String(agenda?.original?.name || agenda?.original?.path || '').toLowerCase().split('.').pop();
  const base = String(agenda?.title || '안건').replace(/[\/:*?"<>|]+/g, ' ').trim().slice(0, 80) || '안건';
  return ['pdf', 'hwp', 'hwpx', 'pptx', 'png', 'jpg', 'jpeg', 'webp'].includes(ext) ? `${base}.${ext}` : base;
}
// 쉬운 화면 팀 C: 발표 마치기(CONTRACTS POST /:mid/presenter/end)
export async function presenterEnd() {
  log('presenterEnd');
  await wait(30);
  const changed = !!F.meeting.presenter?.cid;
  F.meeting.presenter = { cid: null, epoch: (F.meeting.presenter?.epoch || 0) + 1 };
  if (F.meeting.live) F.meeting.live = { ...F.meeting.live, aid: null, page: 1 };
  F.push('meeting');
  return { presenter: F.meeting.presenter, live: F.meeting.live, changed };
}
