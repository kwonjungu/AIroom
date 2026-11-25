// D4 순수 함수 단위 시험: node --test tests/zzoom/d4.unit.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { toMs, clockText, refLabel, mergeMessages } from '../../public/zzoom/chat.js';
import { sortHands } from '../../public/zzoom/hands.js';
import { currentPoll, resultView } from '../../public/zzoom/poll.js';

test('toMs 여러 시각 형식', () => {
  assert.equal(toMs(1000), 1000);
  assert.equal(toMs({ seconds: 2 }), 2000);
  assert.equal(toMs({ toMillis: () => 5 }), 5);
  assert.equal(toMs(null), null);
  assert.match(clockText(new Date(2026, 0, 1, 9, 5).getTime()), /^09:05$/);
});
test('refLabel', () => {
  assert.equal(refLabel([{ aid: 'a' }, { aid: 'b' }], { aid: 'b', page: 5 }), '2번 안건 5쪽');
  assert.equal(refLabel([], { aid: 'x', page: 1 }), '안건 1쪽');
});
test('mergeMessages: 돌아온 내 글은 임시 글을 숨긴다', () => {
  const list = [{ id: 'm1', cid: 'c1', text: '안녕', at: 2000 }];
  const pend = [{ tmp: 't1', id: null, cid: 'c1', text: '안녕', at: 1500 }, { tmp: 't2', id: null, cid: 'c1', text: '다른 글', at: 1600 }];
  const r = mergeMessages(list, pend);
  assert.equal(r.length, 2);
  assert.equal(r[1].id, 't2');
});
test('mergeMessages: id 가 같으면 숨김', () => {
  const r = mergeMessages([{ id: 'm1', cid: 'c', text: 'x', at: 1 }], [{ tmp: 't', id: 'm1', cid: 'c', text: 'x', at: 1 }]);
  assert.equal(r.length, 1);
});
test('sortHands at 순, 같으면 cid', () => {
  const r = sortHands([{ cid: 'b', at: 5 }, { cid: 'a', at: 5 }, { cid: 'c', at: 1 }, { cid: 'd', at: { seconds: 0.002 } }]);
  assert.deepEqual(r.map(x => x.cid), ['c', 'd', 'a', 'b']);
});
test('currentPoll 열린 것 우선', () => {
  assert.equal(currentPoll([]), null);
  assert.equal(currentPoll([{ pid: '1', status: 'closed' }, { pid: '2', status: 'open' }, { pid: '3', status: 'closed' }]).pid, '2');
  assert.equal(currentPoll([{ pid: '1', status: 'closed' }, { pid: '3', status: 'closed' }]).pid, '3');
});
test('resultView: 비공개는 이름을 절대 내지 않고, reveal 전 참석자는 숫자도 없음', () => {
  const secret = { revealed: false, anonymous: true, tally: { o1: 3 }, total: 3, names: { o1: ['김가'] } };
  const v = resultView(secret, null);
  assert.equal(v.tally, null); assert.equal(v.names, null);
  const v2 = resultView({ ...secret, revealed: true }, null);
  assert.equal(v2.names, null); assert.deepEqual(v2.tally, { o1: 3 });
  const pub = { revealed: true, anonymous: false, tally: { o1: 1 }, total: 1, names: { o1: ['김가'] } };
  assert.equal(resultView(pub, null).names, null, '익명(ANON): 옛 공개 투표 문서여도 이름을 내지 않는다');
  const pubHidden = { ...pub, revealed: false };
  assert.equal(resultView(pubHidden, null).names, null);
  assert.equal(resultView({ revealed: false, anonymous: true }, { o1: 2, o2: 1 }).total, 3);
});
