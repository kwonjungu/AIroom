// 모델 평가 corpus (ACCEPTANCE §3) — 4장르 × 5유형 × 6변형 = 120과제.
// 변형 1~4 = dev(80), 변형 5~6 = holdout(40). holdout 문장을 프롬프트 예시(lib/vibe/generation/examples.js)에 넣지 않는다.
//
// 각 과제의 expect는 "독립 기대 체크리스트"다 — 생성기·검증기 코드가 아니라 사람이 정한 기준이며
// tests/vibe/evals/checklist.js 가 결과 프로젝트만 보고 판정한다.
//   template/params : 첫 생성 — 만들어져야 할 장르와 반영돼야 할 설정
//   change          : [{at, param, dir:'inc'|'dec'|'eq', value?}]  바뀌어야 할 값
//   appearance      : [{at, preset | presets}]                       바뀌어야 할 모습
//   add             : [{kind, entity?, effect?, stat?, value?}]       새로 있어야 할 규칙
//   effect          : [{entity, do, amount?}]                         닿기 효과의 값
//   anyOf           : [{change|add|appearance}]                        모호한 요청: 하나 이상 충족
//   keep            : 'rules'(기존 spawner·onTouch 유지) 'assets'(기존 모습 유지) 'goal'(이기기·지기·제한시간 유지)
//   keepParams      : [{at, param}]                                    "그대로 둬"라고 한 값

const SP = entity => ({ kind: 'spawner', entity });
const PL = { kind: 'player' };
const WORLD = { kind: 'world' };
const WIN = { kind: 'winWhen' };
const STATS = { kind: 'stats' };

const BASES = {
  catch: { templateId: 'catch', params: { hero: 'cat', item: 'apple' } },
  avoid: { templateId: 'avoid', params: { hero: 'rocket', hazard: 'meteor' } },
  collect: { templateId: 'collect', params: { hero: 'turtle', gem: 'gem' } },
  maze: { templateId: 'maze', params: { hero: 'turtle', map: 'whirl' } },
};

const GOALISH = e => (e.change || []).some(c => c.at.kind === 'winWhen' || c.at.kind === 'loseWhen' || (c.at.kind === 'world' && c.param === 'timeLimitSec'))
  || (e.add || []).some(a => a.kind === 'winWhen' || a.kind === 'loseWhen');

/** 기본 keep: 요청과 무관한 것은 유지돼야 한다 */
function withKeep(type, e) {
  if (type === 'first' || e.keep) return e;
  const keep = ['rules'];
  if (!(e.appearance || []).length) keep.push('assets');
  if (!GOALISH(e)) keep.push('goal');
  return { ...e, keep };
}

// [장르, 유형, [문장, expect] × 6]
const TABLE = {
  catch: {
    first: [
      ['고양이가 사과를 받는 게임 만들어줘', { template: 'catch', params: { hero: 'cat', item: 'apple' } }],
      ['하늘에서 별이 떨어지면 로봇이 받는 게임 하고 싶어', { template: 'catch', params: { hero: 'robot', item: 'star' } }],
      ['사탕 받기 게임 만들래 목표는 15점', { template: 'catch', params: { item: 'candy', goal: 15 } }],
      ['거북이가 동전을 바구니로 받아서 20점 모으는 게임', { template: 'catch', params: { hero: 'turtle', item: 'coin', goal: 20 } }],
      ['유니콘이 떨어지는 생선 받는 게임 만들어 줘, 시간은 90초', { template: 'catch', params: { hero: 'unicorn', item: 'fish', timeLimitSec: 90 } }],
      ['받기게임 만드러줘 사과 떨어지는거', { template: 'catch', params: { item: 'apple' } }],
    ],
    visual: [
      ['사과가 조금 더 천천히 떨어지게 해줘', { change: [{ at: SP('apple'), param: 'speed', dir: 'dec' }] }],
      ['사과가 훨씬 빨리 떨어졌으면 좋겠어', { change: [{ at: SP('apple'), param: 'speed', dir: 'inc' }] }],
      ['주인공을 로봇으로 바꿔줘', { appearance: [{ at: PL, preset: 'emoji:🤖' }] }],
      ['사과가 더 자주 나오게 해줘', { change: [{ at: SP('apple'), param: 'intervalMs', dir: 'dec' }] }],
      ['배경을 우주로 바꿔줘', { appearance: [{ at: WORLD, preset: 'bg-space' }] }],
      ['고양이가 좀 더 빨리 움직이면 좋겠어', { change: [{ at: PL, param: 'speed', dir: 'inc' }] }],
    ],
    rule: [
      ['폭탄도 떨어지게 하고 폭탄에 닿으면 목숨이 하나 줄게 해줘', { add: [SP('bomb'), { kind: 'onTouch', entity: 'bomb', effect: 'loseLife' }] }],
      ['별도 떨어지게 하고 별을 받으면 3점 주기', { add: [SP('star'), { kind: 'onTouch', entity: 'star', effect: 'addScore' }], effect: [{ entity: 'star', do: 'addScore', amount: 3 }] }],
      ['폭탄에 닿으면 바로 지는 규칙 추가해줘', { add: [SP('bomb'), { kind: 'onTouch', entity: 'bomb', effect: 'lose' }] }],
      ['운석이 떨어지고 닿으면 목숨이 줄게, 목숨 다 없어지면 지게 해줘', { add: [SP('meteor'), { kind: 'onTouch', entity: 'meteor', effect: 'loseLife' }, { kind: 'loseWhen', stat: 'livesZero' }] }],
      ['동전도 가끔 떨어지게 하고 받으면 5점', { add: [SP('coin'), { kind: 'onTouch', entity: 'coin', effect: 'addScore' }], effect: [{ entity: 'coin', do: 'addScore', amount: 5 }] }],
      ['외계인이 떨어지는데 닿으면 목숨이 줄어 목숨은 5개', { add: [SP('alien'), { kind: 'onTouch', entity: 'alien', effect: 'loseLife' }], change: [{ at: STATS, param: 'lives', dir: 'eq', value: 5 }], keep: ['rules', 'assets'] }],
    ],
    ambiguous: [
      ['사과가 너무 빨라요 느리개 해주세요', { change: [{ at: SP('apple'), param: 'speed', dir: 'dec' }] }],
      ['좀 더 쉽게 해줘', { anyOf: [{ change: [{ at: WIN, param: 'value', dir: 'dec' }] }, { change: [{ at: SP('apple'), param: 'speed', dir: 'dec' }] }, { change: [{ at: WORLD, param: 'timeLimitSec', dir: 'inc' }] }, { change: [{ at: PL, param: 'speed', dir: 'inc' }] }, { change: [{ at: SP('apple'), param: 'intervalMs', dir: 'dec' }] }], keep: ['rules', 'assets'] }],
      ['사과 떨어지는거 천천이', { change: [{ at: SP('apple'), param: 'speed', dir: 'dec' }] }],
      ['게임이 금방 끝나 시간 더 줘', { change: [{ at: WORLD, param: 'timeLimitSec', dir: 'inc' }] }],
      ['목표 점수를 낮춰줘 너무 어려워', { change: [{ at: WIN, param: 'value', dir: 'dec' }] }],
      ['더 어렵게 해 주세여', { anyOf: [{ change: [{ at: WIN, param: 'value', dir: 'inc' }] }, { change: [{ at: SP('apple'), param: 'speed', dir: 'inc' }] }, { change: [{ at: WORLD, param: 'timeLimitSec', dir: 'dec' }] }, { change: [{ at: SP('apple'), param: 'intervalMs', dir: 'inc' }] }, { change: [{ at: PL, param: 'speed', dir: 'dec' }] }], keep: ['rules', 'assets'] }],
    ],
    compound: [
      ['사과는 조금 느리게 하고 목표는 15점으로 해줘', { change: [{ at: SP('apple'), param: 'speed', dir: 'dec' }, { at: WIN, param: 'value', dir: 'eq', value: 15 }] }],
      ['폭탄을 추가하고 사과 속도는 그대로 둬', { add: [SP('bomb'), { kind: 'onTouch', entity: 'bomb' }], keepParams: [{ at: SP('apple'), param: 'speed' }] }],
      ['주인공을 거북이로 바꾸고 사과가 더 자주 나오게', { appearance: [{ at: PL, preset: 'emoji:🐢' }], change: [{ at: SP('apple'), param: 'intervalMs', dir: 'dec' }] }],
      ['제한 시간을 90초로 늘리고 목표를 20점으로', { change: [{ at: WORLD, param: 'timeLimitSec', dir: 'eq', value: 90 }, { at: WIN, param: 'value', dir: 'eq', value: 20 }] }],
      ['사과 받으면 2점 주고 떨어지는 속도는 빠르게', { effect: [{ entity: 'apple', do: 'addScore', amount: 2 }], change: [{ at: SP('apple'), param: 'speed', dir: 'inc' }] }],
      ['배경은 그대로 두고 사과 대신 사탕이 떨어지게, 목표도 그대로', { appearance: [{ at: SP('apple'), preset: 'emoji:🍬' }], keep: ['rules', 'goal'], keepSlots: ['bg.main'] }],
    ],
  },
  avoid: {
    first: [
      ['운석 피하기 게임 만들어줘', { template: 'avoid', params: { hazard: 'meteor' } }],
      ['로켓이 폭탄을 피하는 게임 30초 버티기', { template: 'avoid', params: { hero: 'rocket', hazard: 'bomb', surviveSec: 30 } }],
      ['외계인 피해서 살아남는 게임, 목숨은 5개', { template: 'avoid', params: { hazard: 'alien', lives: 5 } }],
      ['고양이가 떨어지는 폭탄을 피하는 게임 하고싶어요', { template: 'avoid', params: { hero: 'cat', hazard: 'bomb' } }],
      ['장애물 피하기 게임 만들어 줘 60초 동안', { template: 'avoid', params: { surviveSec: 60 } }],
      ['피하는 게임 만들어 쥬세요 유니콘이 주인공', { template: 'avoid', params: { hero: 'unicorn' } }],
    ],
    visual: [
      ['운석이 조금 더 천천히 떨어지게', { change: [{ at: SP('meteor'), param: 'speed', dir: 'dec' }] }],
      ['운석이 더 자주 떨어지게 해줘', { change: [{ at: SP('meteor'), param: 'intervalMs', dir: 'dec' }] }],
      ['로켓을 고양이로 바꿔줘', { appearance: [{ at: PL, preset: 'emoji:🐱' }] }],
      ['주인공이 더 빨리 움직이게', { change: [{ at: PL, param: 'speed', dir: 'inc' }] }],
      ['운석을 더 크게 해줘', { change: [{ at: SP('meteor'), param: 'radius', dir: 'inc' }] }],
      ['배경을 풀밭으로 바꿔줘', { appearance: [{ at: WORLD, preset: 'bg-meadow' }] }],
    ],
    rule: [
      ['별도 떨어지게 하고 별을 먹으면 점수 1점', { add: [SP('star'), { kind: 'onTouch', entity: 'star', effect: 'addScore' }] }],
      ['폭탄도 떨어지는데 폭탄에 닿으면 바로 져', { add: [SP('bomb'), { kind: 'onTouch', entity: 'bomb', effect: 'lose' }] }],
      ['보석을 받으면 점수를 주고 10점 모으면 이기게 해줘', { add: [SP('gem'), { kind: 'onTouch', entity: 'gem', effect: 'addScore' }, { kind: 'winWhen', stat: 'score', value: 10 }] }],
      ['시간 제한 45초 넣고 시간이 끝나면 지게', { change: [{ at: WORLD, param: 'timeLimitSec', dir: 'eq', value: 45 }], add: [{ kind: 'loseWhen', stat: 'timeUp' }] }],
      ['동전도 떨어지게 하고 받으면 2점', { add: [SP('coin'), { kind: 'onTouch', entity: 'coin', effect: 'addScore' }], effect: [{ entity: 'coin', do: 'addScore', amount: 2 }] }],
      ['사탕을 먹으면 점수 주는 규칙 추가', { add: [SP('candy'), { kind: 'onTouch', entity: 'candy', effect: 'addScore' }] }],
    ],
    ambiguous: [
      ['운석 넘 빨라 ㅠㅠ 천천히', { change: [{ at: SP('meteor'), param: 'speed', dir: 'dec' }] }],
      ['좀 덜 어렵게 해주라', { anyOf: [{ change: [{ at: STATS, param: 'lives', dir: 'inc' }] }, { change: [{ at: SP('meteor'), param: 'speed', dir: 'dec' }] }, { change: [{ at: SP('meteor'), param: 'intervalMs', dir: 'inc' }] }, { change: [{ at: WIN, param: 'value', dir: 'dec' }] }, { change: [{ at: STATS, param: 'invincibleMs', dir: 'inc' }] }], keep: ['rules', 'assets'] }],
      ['목슴 더 줘', { change: [{ at: STATS, param: 'lives', dir: 'inc' }] }],
      ['버티는 시간 좀 줄여줘', { change: [{ at: WIN, param: 'value', dir: 'dec' }] }],
      ['운석 너무 많이 나와', { change: [{ at: SP('meteor'), param: 'intervalMs', dir: 'inc' }] }],
      ['무적 시간 길게 해줘', { change: [{ at: STATS, param: 'invincibleMs', dir: 'inc' }] }],
    ],
    compound: [
      ['운석은 느리게 하고 목숨은 5개로 해줘', { change: [{ at: SP('meteor'), param: 'speed', dir: 'dec' }, { at: STATS, param: 'lives', dir: 'eq', value: 5 }] }],
      ['별 먹으면 점수 주는 규칙 넣고 운석 규칙은 그대로 둬', { add: [SP('star'), { kind: 'onTouch', entity: 'star', effect: 'addScore' }], keepParams: [{ at: SP('meteor'), param: 'speed' }, { at: SP('meteor'), param: 'intervalMs' }] }],
      ['주인공을 유니콘으로 바꾸고 버티는 시간은 40초', { appearance: [{ at: PL, preset: 'emoji:🦄' }], change: [{ at: WIN, param: 'value', dir: 'eq', value: 40 }] }],
      ['운석이 덜 자주 나오게 하고 목숨은 그대로', { change: [{ at: SP('meteor'), param: 'intervalMs', dir: 'inc' }], keepParams: [{ at: STATS, param: 'lives' }] }],
      ['폭탄도 떨어지게 하고 폭탄에 닿아도 목숨이 줄게, 운석 속도는 그대로', { add: [SP('bomb'), { kind: 'onTouch', entity: 'bomb', effect: 'loseLife' }], keepParams: [{ at: SP('meteor'), param: 'speed' }] }],
      ['배경을 하늘로 바꾸고 운석을 조금 작게', { appearance: [{ at: WORLD, preset: 'bg-sky' }], change: [{ at: SP('meteor'), param: 'radius', dir: 'dec' }] }],
    ],
  },
  collect: {
    first: [
      ['보석 모으기 게임 만들어줘', { template: 'collect', params: { gem: 'gem' } }],
      ['거북이가 꽃을 모으는 게임', { template: 'collect', params: { hero: 'turtle', gem: 'flower' } }],
      ['별 10개 모으는 게임 만들래', { template: 'collect', params: { gem: 'star', gemCount: 10 } }],
      ['동전 모으기 게임인데 폭탄도 있게 해줘', { template: 'collect', params: { gem: 'coin', hazard: 'bomb' } }],
      ['로봇이 보석 8개를 모으면 이기는 게임, 제한시간 60초', { template: 'collect', params: { hero: 'robot', gemCount: 8, timeLimitSec: 60 } }],
      ['모으는 게임 만들어 쥬세요 꽃 모으기', { template: 'collect', params: { gem: 'flower' } }],
    ],
    visual: [
      ['주인공이 조금 더 빨리 움직이게', { change: [{ at: PL, param: 'speed', dir: 'inc' }] }],
      ['보석을 더 크게 해줘', { change: [{ at: SP('gem'), param: 'radius', dir: 'inc' }] }],
      ['주인공을 로켓으로 바꿔줘', { appearance: [{ at: PL, preset: 'emoji:🚀' }] }],
      ['보석 대신 꽃으로 바꿔줘', { appearance: [{ at: SP('gem'), preset: 'emoji:🌸' }] }],
      ['배경을 동굴로 바꿔줘', { appearance: [{ at: WORLD, preset: 'bg-ruins' }] }],
      ['보석이 천천히 움직이게 해줘', { change: [{ at: SP('gem'), param: 'speed', dir: 'inc' }] }],
    ],
    rule: [
      ['폭탄을 놓고 폭탄에 닿으면 목숨이 줄게, 목숨은 3개', { add: [SP('bomb'), { kind: 'onTouch', entity: 'bomb', effect: 'loseLife' }], change: [{ at: STATS, param: 'lives', dir: 'eq', value: 3 }], keep: ['rules', 'assets'] }],
      ['제한 시간 30초를 넣고 시간이 끝나면 지게 해줘', { change: [{ at: WORLD, param: 'timeLimitSec', dir: 'eq', value: 30 }], add: [{ kind: 'loseWhen', stat: 'timeUp' }] }],
      ['별도 놓고 별을 먹으면 3점', { add: [SP('star'), { kind: 'onTouch', entity: 'star', effect: 'addScore' }], effect: [{ entity: 'star', do: 'addScore', amount: 3 }] }],
      ['외계인이 돌아다니다가 닿으면 지게 해줘', { add: [SP('alien'), { kind: 'onTouch', entity: 'alien', effect: 'lose' }] }],
      ['동전도 놓고 동전을 모으면 2점', { add: [SP('coin'), { kind: 'onTouch', entity: 'coin', effect: 'addScore' }], effect: [{ entity: 'coin', do: 'addScore', amount: 2 }] }],
      ['운석이 떨어지고 닿으면 목숨이 하나 줄어, 목숨 3개', { add: [SP('meteor'), { kind: 'onTouch', entity: 'meteor', effect: 'loseLife' }], change: [{ at: STATS, param: 'lives', dir: 'eq', value: 3 }], keep: ['rules', 'assets'] }],
    ],
    ambiguous: [
      ['보석 몇개 더 놔줘', { change: [{ at: SP('gem'), param: 'count', dir: 'inc' }] }],
      ['넘 쉬워 어렵게', { anyOf: [{ change: [{ at: WIN, param: 'value', dir: 'inc' }] }, { change: [{ at: PL, param: 'speed', dir: 'dec' }] }, { change: [{ at: SP('gem'), param: 'radius', dir: 'dec' }] }, { change: [{ at: WORLD, param: 'timeLimitSec', dir: 'inc' }] }, { add: [{ kind: 'spawner' }] }], keep: ['rules', 'assets'] }],
      ['주인공이 느려 빨리', { change: [{ at: PL, param: 'speed', dir: 'inc' }] }],
      ['목표를 3개로', { change: [{ at: WIN, param: 'value', dir: 'eq', value: 3 }] }],
      ['보석이 좀 작아졌으면', { change: [{ at: SP('gem'), param: 'radius', dir: 'dec' }] }],
      ['거북이 너무 느림..', { change: [{ at: PL, param: 'speed', dir: 'inc' }] }],
    ],
    compound: [
      ['보석은 7개 놓고 7개 모으면 이기게', { change: [{ at: SP('gem'), param: 'count', dir: 'eq', value: 7 }, { at: WIN, param: 'value', dir: 'eq', value: 7 }] }],
      ['폭탄을 추가하는데 보석 규칙은 그대로 두고', { add: [SP('bomb'), { kind: 'onTouch', entity: 'bomb' }] }],
      ['주인공을 고양이로 바꾸고 조금 더 빠르게', { appearance: [{ at: PL, preset: 'emoji:🐱' }], change: [{ at: PL, param: 'speed', dir: 'inc' }] }],
      ['보석을 더 크게 하고 배경은 그대로', { change: [{ at: SP('gem'), param: 'radius', dir: 'inc' }] }],
      ['목표는 그대로 두고 주인공만 빨리', { change: [{ at: PL, param: 'speed', dir: 'inc' }] }],
      ['꽃도 놓고 꽃을 먹으면 1점, 목표는 8점', { add: [SP('flower'), { kind: 'onTouch', entity: 'flower', effect: 'addScore' }], change: [{ at: WIN, param: 'value', dir: 'eq', value: 8 }] }],
    ],
  },
  maze: {
    first: [
      ['미로 탈출 게임 만들어줘', { template: 'maze', params: {} }],
      ['로봇이 미로를 빠져나가는 게임', { template: 'maze', params: { hero: 'robot' } }],
      ['쉬운 미로 게임 만들어 줘', { template: 'maze', params: { map: 'first' } }],
      ['고양이가 미로 탈출하는 게임, 60초 안에', { template: 'maze', params: { hero: 'cat', timeLimitSec: 60 } }],
      ['어려운 미로 탈출 만들래', { template: 'maze', params: { map: 'whirl' } }],
      ['미로게임 만드러줘 유니콘으로', { template: 'maze', params: { hero: 'unicorn' } }],
    ],
    visual: [
      ['주인공이 조금 더 빨리 움직이게', { change: [{ at: PL, param: 'speed', dir: 'inc' }] }],
      ['주인공을 로봇으로 바꿔줘', { appearance: [{ at: PL, preset: 'emoji:🤖' }] }],
      ['배경을 우주로 바꿔줘', { appearance: [{ at: WORLD, preset: 'bg-space' }] }],
      ['거북이가 너무 빨라 천천히', { change: [{ at: PL, param: 'speed', dir: 'dec' }] }],
      ['주인공을 조금 작게 해줘', { change: [{ at: PL, param: 'radius', dir: 'dec' }] }],
      ['배경을 풀밭으로', { appearance: [{ at: WORLD, preset: 'bg-meadow' }] }],
    ],
    rule: [
      ['제한 시간 60초 넣고 시간이 끝나면 지게 해줘', { change: [{ at: WORLD, param: 'timeLimitSec', dir: 'eq', value: 60 }], add: [{ kind: 'loseWhen', stat: 'timeUp' }] }],
      ['미로에 보석을 놓고 먹으면 점수 주기', { add: [SP('gem'), { kind: 'onTouch', entity: 'gem', effect: 'addScore' }] }],
      ['외계인이 돌아다니다 닿으면 목숨이 줄게, 목숨 3개', { add: [SP('alien'), { kind: 'onTouch', entity: 'alien', effect: 'loseLife' }], change: [{ at: STATS, param: 'lives', dir: 'eq', value: 3 }], keep: ['rules', 'assets'] }],
      ['별을 놓고 별을 먹으면 2점 주기', { add: [SP('star'), { kind: 'onTouch', entity: 'star', effect: 'addScore' }], effect: [{ entity: 'star', do: 'addScore', amount: 2 }] }],
      ['폭탄에 닿으면 지는 규칙 추가해줘', { add: [SP('bomb'), { kind: 'onTouch', entity: 'bomb', effect: 'lose' }] }],
      ['동전을 곳곳에 놓고 동전을 먹으면 점수', { add: [SP('coin'), { kind: 'onTouch', entity: 'coin', effect: 'addScore' }] }],
    ],
    ambiguous: [
      ['넘 느려요 빨리', { change: [{ at: PL, param: 'speed', dir: 'inc' }] }],
      ['시간 제한 좀 줘', { change: [{ at: WORLD, param: 'timeLimitSec', dir: 'inc' }] }],
      ['쥬인공 작게', { change: [{ at: PL, param: 'radius', dir: 'dec' }] }],
      ['더 어렵게 해 주세여', { anyOf: [{ change: [{ at: WORLD, param: 'timeLimitSec', dir: 'inc' }] }, { change: [{ at: PL, param: 'speed', dir: 'dec' }] }, { add: [{ kind: 'spawner' }] }], keep: ['rules', 'assets'] }],
      ['미로 길이 안 보여 배경 밝게', { appearance: [{ at: WORLD, presets: ['bg-sky', 'bg-meadow'] }] }],
      ['거북이 느림 ㅠ', { change: [{ at: PL, param: 'speed', dir: 'inc' }] }],
    ],
    compound: [
      ['주인공은 빨리, 배경은 그대로', { change: [{ at: PL, param: 'speed', dir: 'inc' }] }],
      ['제한 시간 90초 넣고 주인공 모습은 그대로', { change: [{ at: WORLD, param: 'timeLimitSec', dir: 'eq', value: 90 }] }],
      ['주인공을 고양이로 바꾸고 조금 빠르게', { appearance: [{ at: PL, preset: 'emoji:🐱' }], change: [{ at: PL, param: 'speed', dir: 'inc' }] }],
      ['보석을 놓고 먹으면 점수, 도착 규칙은 그대로', { add: [SP('gem'), { kind: 'onTouch', entity: 'gem', effect: 'addScore' }], keep: ['rules', 'assets', 'goal'] }],
      ['주인공 크기를 조금 작게 하고 속도는 그대로', { change: [{ at: PL, param: 'radius', dir: 'dec' }], keepParams: [{ at: PL, param: 'speed' }] }],
      ['배경을 우주로 바꾸고 제한 시간 120초', { appearance: [{ at: WORLD, preset: 'bg-space' }], change: [{ at: WORLD, param: 'timeLimitSec', dir: 'eq', value: 120 }] }],
    ],
  },
};

export const TYPES = ['first', 'visual', 'rule', 'ambiguous', 'compound'];
export const GENRES = ['catch', 'avoid', 'collect', 'maze'];

export const TASKS = Object.freeze(GENRES.flatMap(genre => TYPES.flatMap(type => TABLE[genre][type].map(([text, expect], i) => ({
  id: `${genre}-${type}-${i + 1}`,
  genre, type, variant: i + 1,
  split: i < 4 ? 'dev' : 'holdout',
  grade: i % 2 === 0 ? '3-4' : '5-6',
  text,
  base: type === 'first' ? null : BASES[genre],
  expect: withKeep(type, expect),
})))));

export const DEV = TASKS.filter(t => t.split === 'dev');
export const HOLDOUT = TASKS.filter(t => t.split === 'holdout');
