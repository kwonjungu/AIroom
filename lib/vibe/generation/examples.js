// 검증된 예시 — 프롬프트에 최대 2개. tests/vibe/unit/wp5-context.test.js 가 각 예시를 실제로
// 적용·검증(V1~V6)해 통과하는지 확인한다. 평가 holdout 과제의 문장을 여기에 넣지 않는다.
// base는 템플릿 기본값으로 만든 프로젝트(검증용), before는 프롬프트에 싣는 요약.

export const EXAMPLES = Object.freeze([
  {
    id: 'ex-rule-bomb',
    task: 'rule',
    base: { templateId: 'catch', params: { item: 'apple' } },
    request: '폭탄이 가끔 떨어지고, 닿으면 목숨 하나를 잃게 해 줘. 목숨은 3개, 다 잃으면 지는 거야.',
    before: [
      { id: 'apple-fall', kind: 'spawner', args: { entity: 'apple', pattern: 'fallFromTop', speed: 140 } },
      { id: 'stats', kind: 'stats', args: { lives: 0, invincibleMs: 0 } },
    ],
    output: {
      status: 'patch', summary: '폭탄이 떨어지고, 닿으면 목숨이 줄어요.',
      operations: [
        { op: 'addBehavior', parentId: null, node: { id: 'bomb-fall', kind: 'spawner', args: { entity: 'bomb', appearance: 'bomb.appearance', pattern: 'fallFromTop', intervalMs: 1500, speed: 160, maxAlive: 4, count: 0, radius: 22 }, children: [] } },
        { op: 'setAppearance', nodeId: 'bomb-fall', slotId: 'bomb.appearance', preset: 'emoji:💣' },
        { op: 'addBehavior', parentId: null, node: { id: 'touch-bomb', kind: 'onTouch', args: { entity: 'bomb', effects: [{ do: 'loseLife' }, { do: 'removeOther' }] }, children: [] } },
        { op: 'setParameter', nodeId: 'stats', parameter: 'lives', value: 3 },
        { op: 'setParameter', nodeId: 'stats', parameter: 'invincibleMs', value: 1000 },
        { op: 'addBehavior', parentId: null, node: { id: 'lose-lives', kind: 'loseWhen', args: { stat: 'livesZero' }, children: [] } },
      ],
    },
  },
  {
    id: 'ex-rule-compound',
    task: 'rule',
    base: { templateId: 'avoid', params: {} },
    request: '운석은 조금 덜 자주 나오고 버티는 시간은 20초로 줄여줘',
    before: [
      { id: 'meteor-fall', kind: 'spawner', args: { entity: 'meteor', intervalMs: 500, speed: 240 } },
      { id: 'win', kind: 'winWhen', args: { stat: 'survivedSec', value: 30 } },
    ],
    output: {
      status: 'patch', summary: '운석이 덜 자주 나오고 20초만 버티면 돼요.',
      operations: [
        { op: 'setParameter', nodeId: 'meteor-fall', parameter: 'intervalMs', value: 650 },
        { op: 'setParameter', nodeId: 'win', parameter: 'value', value: 20 },
      ],
    },
  },
  {
    id: 'ex-plan',
    task: 'plan',
    base: null,
    request: '로켓이 반짝이는 걸 모으는 놀이 하고 싶어',
    before: [],
    output: {
      status: 'patch', summary: '로켓이 보석을 모으는 게임을 만들었어요.',
      operations: [{ op: 'instantiateTemplate', templateId: 'collect', params: { hero: 'rocket', gem: 'gem', gemCount: null, goal: null, hazard: null, timeLimitSec: null } }],
    },
  },
]);
