// 작업 단계 ①~⑤ (순수 데이터·함수). AI 처리 상태(준비·조립·검사)와는 별개다.

export const STEPS = Object.freeze([
  { id: 'think', num: '①', label: '생각하기', next: { low: '무엇을 만들지 그림을 골라요', base: '무엇을 만들지 정해요' } },
  { id: 'make', num: '②', label: '만들기', next: { low: '카드를 눌러 차례대로 놓아요', base: '말이나 블록으로 만들어요' } },
  { id: 'try', num: '③', label: '해보기', next: { low: '실행을 눌러 봐요', base: '실행해서 잘 되는지 봐요' } },
  { id: 'change', num: '④', label: '바꾸기', next: { low: '카드 하나를 바꿔 봐요', base: '한 가지를 바꾸고 다시 해봐요' } },
  { id: 'save', num: '⑤', label: '저장하기', next: { low: '저장을 눌러요', base: '이름을 붙여 저장해요' } },
]);

export const STEP_IDS = STEPS.map(s => s.id);

/** @returns {{index:number, step:object, total:number, heading:string, nextAction:string, states:('done'|'current'|'todo')[]}} */
export function describeStep(stepId, grade = 'mid') {
  const index = Math.max(0, STEP_IDS.indexOf(stepId));
  const step = STEPS[index];
  return {
    index,
    step,
    total: STEPS.length,
    heading: `${step.num} ${step.label}`,
    nextAction: grade === 'low' ? step.next.low : step.next.base,
    states: STEPS.map((_, i) => (i < index ? 'done' : i === index ? 'current' : 'todo')),
  };
}

/** 한 번에 한 문장: 첫 문장만 남기고 나머지는 잘라 낸다(말줄임 없음). 순수 함수. */
export function firstSentence(text) {
  const t = String(text ?? '').trim().replace(/\s+/g, ' ');
  const m = t.match(/^.+?[.!?。](?=\s|$)/);
  return m ? m[0] : t;
}
