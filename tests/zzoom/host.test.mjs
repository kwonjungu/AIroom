// 디자인 5팀 순수 함수·대기열 단위 시험: node --test tests/zzoom/host.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import * as host from '../../public/zzoom/host.js';
import * as up from '../../public/zzoom/upload.js';
import * as rec from '../../public/zzoom/record.js';

const NOW = 1_800_000_000_000;

test('presence: 90초·5분 경계와 left', () => {
  assert.equal(host.presence({ seenAt: NOW - 1000 }, NOW), 'on');
  assert.equal(host.presence({ seenAt: NOW - 90_000 }, NOW), 'on');
  assert.equal(host.presence({ seenAt: NOW - 90_001 }, NOW), 'checking');
  assert.equal(host.presence({ seenAt: NOW - 300_000 }, NOW), 'checking');
  assert.equal(host.presence({ seenAt: NOW - 300_001 }, NOW), 'left');
  assert.equal(host.presence({ seenAt: NOW, left: true }, NOW), 'left');
  assert.equal(host.presence(null, NOW), 'left');
});

test('sortPeople·countOnline', () => {
  const ppl = [
    { cid: 'a', name: '다', seenAt: NOW - 400_000 },
    { cid: 'b', name: '나', seenAt: NOW - 100_000 },
    { cid: 'c', name: '가', seenAt: NOW },
    { cid: 'd', name: '라', seenAt: NOW, left: true },
  ];
  assert.deepEqual(host.sortPeople(ppl, NOW).map(p => p.state), ['on', 'checking', 'left', 'left']);
  assert.equal(host.countOnline(ppl, { people: 9 }, NOW), 2);
  assert.equal(host.countOnline([], { people: 9 }, NOW), 9);
  assert.equal(host.countOnline(null, null, NOW), 0);
  // 익명(ANON): 접속자는 상태별 수만
  assert.deepEqual(host.presenceCounts(ppl, NOW), { on: 1, checking: 1, left: 2 });
});

test('moveIndex 경계', () => {
  const l = [{ aid: 'a' }, { aid: 'b' }, { aid: 'c' }];
  assert.equal(host.moveIndex(l, 'a', -1), null);
  assert.equal(host.moveIndex(l, 'a', 1), 1);
  assert.equal(host.moveIndex(l, 'c', 1), null);
  assert.equal(host.moveIndex(l, 'x', 1), null);
});

test('agendaLabel', () => {
  assert.equal(host.agendaLabel({ title: '예산' }, 0), '예산');
  assert.equal(host.agendaLabel({ title: '' }, 2), '안건 3');
  assert.equal(host.agendaLabel({ kind: 'board', boardNo: 2 }, 0), '화이트보드 2');
});

test('upload titleFromName·precheck', () => {
  assert.equal(up.titleFromName('2026_학교_계획.hwpx'), '2026 학교 계획');
  assert.equal(up.titleFromName('.pdf'), '새 안건');
  assert.equal(up.precheck({ name: 'a.pdf', size: 10 }, {}), null);
  assert.match(up.precheck({ name: 'a.ppt', size: 10 }, {}), /PPTX/);
  assert.match(up.precheck({ name: 'a.pdf', size: 0 }, {}), /빈 파일/);
  assert.match(up.precheck({ name: 'a.pdf', size: 50 * 1024 * 1024 }, {}), /50MB/);
  assert.equal(up.precheck({ name: 'a.pdf', size: 50 * 1024 * 1024 - 1 }, {}), null);
  assert.match(up.precheck({ name: 'a.pdf', size: 1 }, { agendaCount: 30 }), /30개/);
  assert.match(up.precheck({ name: 'a.pdf', size: 1 }, { status: 'ended' }), /끝난/);
  // PPTX 는 PDF 안내 없이 그대로 통과
  assert.equal(up.precheck({ name: 'a.pptx', size: 10 }, {}), null);
});

test('upload progressView·isAbort·errorText', () => {
  assert.deepEqual(up.progressView({ phase: 'render', done: 3, total: 10 }), { text: '쪽 그림으로 바꾸는 중 (3/10쪽)', ratio: 0.3 });
  assert.equal(up.progressView({ phase: 'render', done: 1, total: 4, ratio: 0.5 }).ratio, 0.5);
  assert.equal(up.progressView({ phase: 'upload', done: 9, total: 3 }).ratio, 1);
  assert.equal(up.progressView({ phase: 'commit' }).text, '안건으로 등록하고 있어요');
  assert.equal(up.isAbort({ code: 'ABORTED' }), true);
  assert.equal(up.isAbort({ name: 'AbortError' }), true);
  assert.equal(up.isAbort({ code: 'PDF_PARSE' }), false);
  assert.match(up.errorText({ code: 'webp_unsupported', status: 0 }), /엣지나 크롬/);
  assert.match(up.errorText({ code: 'network', status: 0 }), /연결이 끊겼/);
  assert.match(up.errorText({ code: 'upload_failed', status: 0, message: 'p001.webp 올리기에 실패했습니다.' }), /다시 올리기/);
  assert.equal(up.errorText({ code: 'empty', status: 0, message: '올릴 쪽이 없습니다.' }), '올릴 쪽이 없습니다.');
  assert.equal(up.errorText({ code: 'PDF_PASSWORD', message: '암호가 걸린 PDF 예요.' }), '암호가 걸린 PDF 예요.');
});

test('record 보조 함수', () => {
  assert.equal(rec.nextN([], -1), 0);
  assert.equal(rec.nextN([{ n: 0 }, { n: 4 }], 2), 5);
  assert.equal(rec.nextN([{ n: 1 }], 7), 8);
  assert.equal(rec.nextN([{ n: 9999 }], 0), 9999);
  assert.equal(rec.elapsed(0), '00:00');
  assert.equal(rec.elapsed(61_500), '01:01');
  assert.equal(rec.elapsed(3_661_000), '1:01:01');
  const ag = [{ aid: 'a1', kind: 'pdf' }, { aid: 'b1', kind: 'board' }];
  assert.equal(rec.placeText({ aid: 'a1', page: 5 }, ag), '1번 안건 5쪽');
  assert.equal(rec.placeText({ aid: 'b1', page: 2 }, ag), '칠판 2쪽');
  assert.equal(rec.placeText({ aid: 'zz', page: 2 }, ag), '지운 안건 2쪽');
  assert.equal(rec.placeText({}, ag), '');
  assert.equal(rec.isFatal({ status: 0 }), false);
  assert.equal(rec.isFatal({ status: 429 }), false);
  assert.equal(rec.isFatal({ status: 502 }), false);
  assert.equal(rec.isFatal({ status: 409 }), true);
  assert.equal(rec.isFatal({ status: 415 }), true);
  assert.deepEqual(rec.pickMime(undefined), { mimeType: '', base: 'audio/webm' });
  assert.equal(rec.pickMime({ isTypeSupported: m => m === 'audio/mp4' }).base, 'audio/mp4');
});

// ---- 대기열: 가짜 타이머로 재시도 순서 확인 ----
function fakeTimer() {
  const t = { now: 0, q: [] };
  t.setTimeout = (fn, ms) => { const id = t.q.length + 1; t.q.push({ id, fn, at: Date.now() + ms }); return id; };
  t.clearTimeout = id => { t.q = t.q.filter(x => x.id !== id); };
  t.fire = () => { const xs = t.q; t.q = []; xs.forEach(x => x.fn()); };
  return t;
}
const flush = () => new Promise(r => setTimeout(r, 0));

test('ChunkQueue: 순서대로 하나씩 보냄', async () => {
  const sent = [];
  let inflight = 0, maxIn = 0;
  const q = new rec.ChunkQueue({
    send: async it => { inflight++; maxIn = Math.max(maxIn, inflight); await flush(); sent.push(it.n); inflight--; },
    delays: [0, 0, 0], timer: fakeTimer(),
  });
  q.add({ n: 2, blob: { size: 1 } });
  q.add({ n: 1, blob: { size: 1 } });
  q.add({ n: 3, blob: { size: 1 } });
  for (let i = 0; i < 10; i++) await flush();
  assert.equal(maxIn, 1);
  assert.equal(sent.length, 3);
  assert.equal(q.items().length, 0);
});

test('ChunkQueue: 일시 오류는 3번 다시, 그 뒤 실패 표시와 직접 다시 보내기', async () => {
  const timer = fakeTimer();
  let calls = 0, ok = false;
  const q = new rec.ChunkQueue({
    send: async () => { calls++; if (!ok) throw Object.assign(new Error('끊김'), { status: 0 }); },
    delays: [1, 1, 1], busyDelay: 1, timer,
  });
  q.add({ n: 0, blob: { size: 5 } });
  for (let round = 0; round < 6; round++) { for (let i = 0; i < 5; i++) await flush(); await new Promise(r => setTimeout(r, 3)); timer.fire(); }
  for (let i = 0; i < 5; i++) await flush();
  assert.equal(calls, 4);                    // 처음 1 + 다시 3
  const [it] = q.items();
  assert.equal(it.state, 'failed');
  assert.equal(it.error, '끊김');
  ok = true;
  q.retry(0);
  for (let i = 0; i < 5; i++) await flush();
  assert.equal(calls, 5);
  assert.equal(q.items().length, 0);
});

test('ChunkQueue: 고칠 수 없는 오류는 바로 실패, 다음 조각은 계속', async () => {
  const sent = [];
  const q = new rec.ChunkQueue({
    send: async it => { if (it.n === 0) throw Object.assign(new Error('녹음 꺼짐'), { status: 403 }); sent.push(it.n); },
    delays: [1, 1, 1], timer: fakeTimer(),
  });
  q.add({ n: 0, blob: { size: 1 } });
  q.add({ n: 1, blob: { size: 1 } });
  for (let i = 0; i < 10; i++) await flush();
  assert.deepEqual(sent, [1]);
  assert.deepEqual(q.items().map(x => [x.n, x.state]), [[0, 'failed']]);
});

test('ChunkQueue: 429 는 더 오래 쉼', async () => {
  const timer = fakeTimer();
  const q = new rec.ChunkQueue({
    send: async () => { throw Object.assign(new Error('한도'), { status: 429 }); },
    delays: [10, 10, 10], busyDelay: 60000, timer,
  });
  const t0 = Date.now();
  q.add({ n: 0, blob: { size: 1 } });
  for (let i = 0; i < 5; i++) await flush();
  assert.equal(q.items()[0].state, 'retry');
  assert.ok(q.list[0].at2 - t0 >= 60000);
  assert.ok(timer.q.length === 1 && timer.q[0].at - t0 >= 59000);
  q.close();
  assert.equal(timer.q.length, 0);
});

test('ChunkQueue.takeAll: 보내는 중인 것은 두고 나머지(실패 포함)를 n 순서로 꺼내고 닫음', () => {
  const q = new rec.ChunkQueue({ send: () => new Promise(() => {}), timer: fakeTimer() });
  q.add({ n: 3, blob: { size: 1 } });   // 바로 보내는 중이 됨
  q.list.push({ n: 5, blob: { size: 1 }, state: 'retry', tries: 1 });
  q.list.push({ n: 4, blob: { size: 1 }, state: 'failed', tries: 4 });
  q.list.push({ n: 6, blob: null, state: 'failed', tries: 0 });  // 소리 없는 실패 표시는 못 보냄
  const out = q.takeAll();
  assert.deepEqual(out.map(x => x.n), [4, 5]);
  assert.deepEqual(q.list.map(x => x.n), [3]);
  assert.equal(q.closed, true);
});
