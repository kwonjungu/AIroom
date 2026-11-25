// D1 단위 시험: list.js 의 순수 함수. 실행 node --test tests/zzoom/d1.unit.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatWhen, toInputValue, fromInputValue, daysLeftText } from '../../public/zzoom/list.js';

test('daysLeftText', () => {
  assert.equal(daysLeftText(10), '10일 뒤 삭제돼요');
  assert.equal(daysLeftText(1), '1일 안에 삭제돼요');
  assert.equal(daysLeftText(0), '곧 삭제돼요');
  assert.equal(daysLeftText(NaN), '');
});
test('formatWhen 한국 시간으로', () => {
  const s = formatWhen(Date.parse('2026-12-03T06:30:00Z')); // KST 15:30
  assert.match(s, /2026년 12월 3일/);
  assert.match(s, /오후 3:30/);
  assert.equal(formatWhen(NaN), '');
});
test('datetime-local 왕복', () => {
  const ms = new Date(2026, 11, 3, 15, 30).getTime();
  assert.equal(toInputValue(ms), '2026-12-03T15:30');
  assert.equal(fromInputValue('2026-12-03T15:30'), ms);
  assert.ok(Number.isNaN(fromInputValue('')));
});
