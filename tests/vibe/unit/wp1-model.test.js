import { test } from 'node:test';
import assert from 'node:assert/strict';
import { describeSaveState, describeAiStatus, describeState, josa } from '../../../public/vibe-v2/ui/status.js';
import { SAVE_STATES } from '../../../public/vibe-v2/state/store.js';
import { STEPS, describeStep, firstSentence } from '../../../public/vibe-v2/ui/steps.js';
import {
  describeMission, chapterNav, chapterSummary, initialChapterIndex, demoCatalog, templateCards, chaptersForPath, recommendedPath,
} from '../../../public/vibe-v2/ui/catalog.js';
import { createPrefStore, readSettings, effectiveReduceMotion, PREF_PREFIX } from '../../../public/vibe-v2/ui/prefs.js';
import { createCleanupBag } from '../../../public/vibe-v2/ui/dom.js';
import { nextTrapIndex } from '../../../public/vibe-v2/ui/dialog.js';
import * as fixtures from '../../../public/vibe-v2/shared/contracts/fixtures.js';

test('저장 상태: 확인되지 않은 저장을 "저장됨"으로 보이지 않는다', () => {
  for (const s of SAVE_STATES) {
    const d = describeSaveState(s);
    assert.ok(d.label && d.icon, s);
    const claimsSaved = /저장됨/.test(d.label);
    assert.equal(claimsSaved, s === 'savedLocal' || s === 'savedClass', s + ' → ' + d.label);
    assert.equal(d.saved, claimsSaved);
  }
  assert.equal(describeSaveState('saving').label, '저장 중');
  assert.equal(describeSaveState('savedLocal').label, '이 기기에 저장됨');
  assert.equal(describeSaveState('savedClass').label, '학급에 저장됨');
  assert.equal(describeSaveState('unsaved').label, '저장 안 됨');
  assert.equal(describeSaveState('error').action.id, 'retry', '실패에는 다음 행동');
  assert.equal(describeSaveState('unsaved').action.id, 'save');
  assert.equal(describeSaveState(undefined).saved, false);
});

test('AI 상태는 단계 이름과 겹치지 않고, idle은 숨김', () => {
  const stepLabels = STEPS.map(s => s.label);
  for (const s of ['preparing', 'assembling', 'checking', 'done', 'failed']) {
    const d = describeAiStatus(s);
    assert.ok(d.visible && d.label.startsWith('AI'), s);
    assert.ok(!stepLabels.includes(d.label));
  }
  assert.equal(describeAiStatus('idle').visible, false);
  assert.equal(describeAiStatus('failed').busy, false);
});

test('화면 상태: 로딩·빈 목록·저장 실패·AI 실패마다 다음 행동', () => {
  assert.equal(describeState('loading').busy, true);
  for (const k of ['empty', 'saveFailed', 'aiFailed', 'offline']) {
    const d = describeState(k);
    assert.ok(d.actions.length >= 1, k);
    assert.doesNotMatch(d.title + d.text, /완료|저장됨/, k + ' 거짓 완료 표시 금지');
  }
  assert.match(describeState('aiFailed').text, /바뀌지 않았/);
  assert.equal(describeState('empty', { what: '게임' }).title, '아직 게임이 없어요');
  assert.equal(describeState('empty').title, '아직 작품이 없어요');
  assert.equal(josa('사과', '을', '를'), '를');
  assert.throws(() => describeState('nope'));
});

test('작업 단계 ①~⑤와 다음 행동', () => {
  assert.deepEqual(STEPS.map(s => s.id), ['think', 'make', 'try', 'change', 'save']);
  const d = describeStep('try', 'low');
  assert.equal(d.heading, '③ 해보기');
  assert.deepEqual(d.states, ['done', 'done', 'current', 'todo', 'todo']);
  assert.ok(d.nextAction.length > 0);
  assert.notEqual(describeStep('make', 'low').nextAction, describeStep('make', 'high').nextAction);
  assert.equal(describeStep('bogus').index, 0);
});

test('한 번에 한 문장', () => {
  assert.equal(firstSentence('네모를 먼저 놓아요. 그다음 세모!'), '네모를 먼저 놓아요.');
  assert.equal(firstSentence('  실행해 봐요  '), '실행해 봐요');
  assert.equal(firstSentence('3.5초 뒤에 떨어져요'), '3.5초 뒤에 떨어져요');
  assert.equal(firstSentence(''), '');
});

test('미션 카드 상태는 색 없이 글자·기호로 구분', () => {
  const texts = ['current', 'done', 'locked', 'open'].map((s, i) => describeMission({ status: s }, i));
  assert.equal(texts[0].badge, '지금 여기');
  assert.equal(texts[0].num, '1');
  assert.equal(texts[1].mark, '✓');
  assert.equal(texts[2].mark, '🔒');
  assert.ok(texts[2].reason && texts[2].disabled);
  assert.equal(describeMission({ status: 'locked', lockReason: '선생님이 열어 줘요' }, 0).reason, '선생님이 열어 줘요');
  const badges = new Set(texts.map(t => t.srText.replace(/^\d+번,?\s*/, '')));
  assert.equal(badges.size, 4, '상태마다 읽히는 글이 다르다');
});

test('챕터 이동·요약', () => {
  assert.deepEqual(chapterNav(0, 3), { index: 0, prev: null, next: 1 });
  assert.deepEqual(chapterNav(2, 3), { index: 2, prev: 1, next: null });
  assert.deepEqual(chapterNav(9, 3), { index: 2, prev: 1, next: null });
  assert.deepEqual(chapterNav(0, 1), { index: 0, prev: null, next: null });
  const ch = { missions: [{ status: 'done' }, { status: 'current', title: 'B' }, { status: 'locked' }] };
  assert.deepEqual(chapterSummary(ch), { done: 1, total: 3, current: ch.missions[1] });
  assert.equal(initialChapterIndex([{ missions: [{ status: 'done' }] }, ch]), 1);
});

test('catalog 없을 때 fixtures 데모 카드와 공방 템플릿', () => {
  const demo = demoCatalog(fixtures);
  assert.equal(demo.length, 1);
  assert.ok(demo[0].missions.length >= 3);
  for (const m of demo[0].missions) assert.equal(typeof m.makeProject().mode, 'string');
  assert.equal(chaptersForPath(demo, 'cards').length, 1);
  assert.equal(chaptersForPath(demo, 'make').length, 0);
  const tpl = templateCards(fixtures);
  assert.ok(tpl.some(t => t.title === '생선 받기' && t.hero === '🐱' && /←/.test(t.controls) && /10점/.test(t.goal)));
  assert.ok(tpl.every(t => t.makeProject().mode === 'studio'));
  assert.equal(recommendedPath('low'), 'cards');
  assert.equal(recommendedPath('high'), 'make');
});

test('설정 저장: app.js와 같은 vibe2_pref_* 규칙', () => {
  const mem = new Map();
  const storage = { getItem: k => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)) };
  const p = createPrefStore(storage);
  assert.deepEqual(readSettings(p), { muted: false, reduceMotion: 'system' });
  p.set('muted', true);
  p.set('reduceMotion', 'on');
  assert.equal(mem.get(PREF_PREFIX + 'muted'), 'true');
  assert.equal(PREF_PREFIX, 'vibe2_pref_');
  assert.deepEqual(readSettings(p), { muted: true, reduceMotion: 'on' });
  mem.set('vibe2_pref_reduceMotion', '"weird"');
  assert.equal(readSettings(p).reduceMotion, 'system');
  const broken = createPrefStore({ getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); } });
  assert.doesNotThrow(() => broken.set('muted', true));
  assert.equal(readSettings(broken).muted, false);
  assert.equal(effectiveReduceMotion('system', true), true);
  assert.equal(effectiveReduceMotion('off', true), false);
  assert.equal(effectiveReduceMotion('on', false), true);
});

test('정리 가방: 등록한 리스너를 모두 해제한다', () => {
  const t = new EventTarget();
  const bag = createCleanupBag();
  let n = 0;
  for (let i = 0; i < 100; i++) bag.on(t, 'x', () => n++);
  let disposed = 0;
  bag.add(() => disposed++);
  t.dispatchEvent(new Event('x'));
  assert.equal(n, 100);
  bag.clear();
  t.dispatchEvent(new Event('x'));
  assert.equal(n, 100, '해제 후 호출 없음');
  assert.equal(disposed, 1);
  assert.equal(bag.size, 0);
});

test('대화상자 Tab 가두기 순환', () => {
  assert.equal(nextTrapIndex(2, 3, false), 0);
  assert.equal(nextTrapIndex(0, 3, true), 2);
  assert.equal(nextTrapIndex(-1, 3, false), 0);
  assert.equal(nextTrapIndex(-1, 3, true), 2);
  assert.equal(nextTrapIndex(1, 3, false), 2);
  assert.equal(nextTrapIndex(0, 0, false), -1);
});
