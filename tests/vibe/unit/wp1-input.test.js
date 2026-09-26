import { test } from 'node:test';
import assert from 'node:assert/strict';
import { enterAction, COMPOSITION_GRACE_MS } from '../../../public/vibe-v2/ui/text-input.js';
import { computeViewportVars, KEYBOARD_THRESHOLD } from '../../../public/vibe-v2/ui/viewport.js';

const E = (o = {}) => ({ key: 'Enter', ...o });

test('IME: 조합 중 Enter는 절대 전송하지 않는다', () => {
  assert.equal(enterAction(E({ isComposing: true }), { text: '사과' }), 'newline');
  assert.equal(enterAction(E({ keyCode: 229 }), { text: '사과' }), 'newline', 'Safari/구형 크롬: keyCode 229');
  assert.equal(enterAction(E(), { composing: true, text: '사과' }), 'newline', 'compositionstart~end 사이');
  assert.equal(enterAction(E(), { msSinceCompositionEnd: 5, text: '사과' }), 'ignore', 'Safari: 확정 직후 같은 Enter');
  assert.equal(enterAction(E(), { msSinceCompositionEnd: COMPOSITION_GRACE_MS + 1, text: '사과' }), 'submit');
});

test('IME: 한글 입력 시나리오(조합→확정→Enter) 오전송 0', () => {
  // 크롬: 조합 중 Enter(keydown isComposing=true) → compositionend → 다음 Enter가 전송
  const seq = [
    [E({ isComposing: true, keyCode: 229 }), { composing: true, text: '생선이 천천히 떨어지게' }],
    [E(), { composing: false, msSinceCompositionEnd: 2, text: '생선이 천천히 떨어지게' }],
  ];
  const sent = seq.filter(([e, s]) => enterAction(e, s) === 'submit').length;
  assert.equal(sent, 0);
  assert.equal(enterAction(E(), { msSinceCompositionEnd: 500, text: '생선이 천천히 떨어지게' }), 'submit');
});

test('Shift+Enter는 줄바꿈, 빈 글·생성 중은 전송 안 함', () => {
  assert.equal(enterAction(E({ shiftKey: true }), { text: '가' }), 'newline');
  assert.equal(enterAction(E(), { text: '   ' }), 'ignore');
  assert.equal(enterAction(E(), { text: '초안', busy: true }), 'ignore');
  assert.equal(enterAction({ key: 'a' }, { text: '가' }), 'none');
});

test('가상 키보드: 보이는 높이·가림 높이 계산', () => {
  assert.deepEqual(computeViewportVars({ innerHeight: 1024, vvHeight: null }), { vvh: 1024, kbInset: 0, keyboard: false });
  const open = computeViewportVars({ innerHeight: 1180, vvHeight: 780, vvOffsetTop: 0 });
  assert.equal(open.vvh, 780);
  assert.equal(open.kbInset, 400);
  assert.equal(open.keyboard, true);
  // iOS: 키보드가 열리며 화면이 위로 밀림(offsetTop) → 가림 높이에서 뺀다
  const shifted = computeViewportVars({ innerHeight: 1180, vvHeight: 780, vvOffsetTop: 100 });
  assert.equal(shifted.kbInset, 300);
  // 주소창 접힘 같은 작은 차이는 키보드로 보지 않는다
  assert.equal(computeViewportVars({ innerHeight: 800, vvHeight: 800 - KEYBOARD_THRESHOLD + 1 }).keyboard, false);
  // 확대(핀치 줌)로 vv가 innerHeight보다 작아져도 음수 없음
  assert.ok(computeViewportVars({ innerHeight: 800, vvHeight: 900, vvOffsetTop: 0 }).kbInset >= 0);
});
