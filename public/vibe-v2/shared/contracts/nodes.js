// 프로그램 노드 계약 (contract v1) — 모드별 노드 kind와 args 스키마, 수정 가능한 파라미터 범위.
// 이 파일은 통합 담당(WP0) 소유. 변경 시 CONTRACT_VERSION을 올리고 mocks·tests를 함께 갱신한다.
//
// 좌표 단위: studio-2 엔진은 논리 800×600, 속도는 px/초, 시간은 ms.
// 구 엔진(400×300, 프레임당 이동량) 작품은 legacySource 노드로 원문 보존하며 새 단위와 섞지 않는다.

export const STUDIO_WORLD = Object.freeze({ width: 800, height: 600 });

const ID = { type: 'string', pattern: '^[a-z][a-z0-9_-]{0,39}$' };
const ENTITY = { type: 'string', pattern: '^[a-z][a-z0-9_]{0,23}$' };
const SLOT = { type: 'string', pattern: '^[a-z][a-z0-9_.-]{0,47}$' };
const COLOR = { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$' };
const EMPTY = { type: 'object', additionalProperties: false, properties: {} };

function node(kind, args, { children = false } = {}) {
  return {
    type: 'object', additionalProperties: false,
    required: ['id', 'kind', 'args', 'children'],
    properties: {
      id: ID,
      kind: { const: kind },
      args,
      children: children
        ? { type: 'array', maxItems: 60, items: ID }
        : { type: 'array', maxItems: 0 },
    },
  };
}

function obj(props, required = Object.keys(props)) {
  return { type: 'object', additionalProperties: false, required, properties: props };
}

// ── 게임 공방(studio-2) 노드 ──
const EFFECT = {
  oneOf: [
    obj({ do: { const: 'addScore' }, amount: { type: 'integer', minimum: 1, maximum: 100 } }),
    obj({ do: { const: 'loseLife' } }),
    obj({ do: { const: 'removeOther' } }),
    obj({ do: { const: 'win' } }),
    obj({ do: { const: 'lose' } }),
  ],
  discriminator: 'do',
};

export const STUDIO_NODES = {
  world: node('world', obj({
    background: SLOT,
    timeLimitSec: { type: 'integer', minimum: 0, maximum: 600 }, // 0 = 제한 없음
  })),
  player: node('player', obj({
    appearance: SLOT,
    x: { type: 'number', minimum: 0, maximum: STUDIO_WORLD.width },
    y: { type: 'number', minimum: 0, maximum: STUDIO_WORLD.height },
    speed: { type: 'number', minimum: 40, maximum: 600 },
    radius: { type: 'number', minimum: 8, maximum: 80 },
    movement: { enum: ['horizontal', 'fourWay'] },
  })),
  spawner: node('spawner', obj({
    entity: ENTITY,
    appearance: SLOT,
    pattern: { enum: ['fallFromTop', 'scatter'] },
    intervalMs: { type: 'integer', minimum: 200, maximum: 10000 }, // scatter는 0이 아닌 재생성 간격, 초기 배치는 count
    speed: { type: 'number', minimum: 0, maximum: 600 },
    maxAlive: { type: 'integer', minimum: 1, maximum: 40 },
    count: { type: 'integer', minimum: 0, maximum: 40 },         // 시작 시 배치 수
    radius: { type: 'number', minimum: 8, maximum: 80 },
  })),
  onTouch: node('onTouch', obj({
    entity: ENTITY,
    effects: { type: 'array', minItems: 1, maxItems: 4, items: EFFECT },
  })),
  stats: node('stats', obj({
    lives: { type: 'integer', minimum: 0, maximum: 9 },          // 0 = 목숨 규칙 없음
    invincibleMs: { type: 'integer', minimum: 0, maximum: 5000 },
  })),
  winWhen: node('winWhen', obj({
    stat: { enum: ['score', 'survivedSec', 'reachedExit'] },
    value: { type: 'integer', minimum: 0, maximum: 9999 },
  })),
  loseWhen: node('loseWhen', obj({
    stat: { enum: ['livesZero', 'timeUp'] },
  })),
  mazeMap: node('mazeMap', obj({
    // # 벽, . 길, S 출발, G 도착. 최대 20×20, 행 길이 동일은 의미 검증(V2)에서 확인
    rows: { type: 'array', minItems: 3, maxItems: 20, items: { type: 'string', pattern: '^[#.SG]{3,20}$' } },
  })),
};

// ── 저학년 카드: 별까지 가기(goal) ──
export const GOAL_NODES = {
  move: node('move', EMPTY),
  turnLeft: node('turnLeft', EMPTY),
  turnRight: node('turnRight', EMPTY),
  repeat: node('repeat', obj({ times: { type: 'integer', minimum: 2, maximum: 9 } }), { children: true }),
};

// ── 저학년 카드: 도형 겹치기(shape) ──
export const SHAPE_KINDS = ['circle', 'rect', 'tri', 'rhombus'];
export const SHAPE_NODES = {
  stamp: node('stamp', obj({
    shape: { enum: SHAPE_KINDS },
    anchor: { type: 'integer', minimum: 1, maximum: 9 }, // 3×3 칸, 5=가운데
    color: COLOR,
    size: { enum: ['S', 'M', 'L'] },
  })),
};

// ── 거북이·픽셀·미로 및 구 공방 작품: 원문 보존 어댑터 ──
export const LEGACY_NODES = {
  legacySource: node('legacySource', obj({
    language: { enum: ['studio-dsl-1', 'turtle-dsl-1', 'pixel-dsl-1', 'maze-dsl-1'] },
    source: { type: 'string', maxLength: 20000 },
  })),
};

/** 모드별 허용 노드 */
export const MODE_NODES = {
  studio: { ...STUDIO_NODES, ...LEGACY_NODES },
  goal: GOAL_NODES,
  shape: SHAPE_NODES,
  turtle: LEGACY_NODES,
  pixel: LEGACY_NODES,
  maze: LEGACY_NODES,
};

/**
 * AI·UI가 setParameter로 바꿀 수 있는 파라미터. 목록에 없는 args는 setParameter 대상이 아니다
 * (appearance는 setAppearance, effects는 add/removeBehavior로만 바뀐다).
 */
export const EDITABLE_PARAMS = {
  world: ['timeLimitSec'],
  player: ['x', 'y', 'speed', 'radius', 'movement'],
  spawner: ['pattern', 'intervalMs', 'speed', 'maxAlive', 'count', 'radius'],
  stats: ['lives', 'invincibleMs'],
  winWhen: ['stat', 'value'],
  loseWhen: ['stat'],
  mazeMap: ['rows'],
  repeat: ['times'],
  stamp: ['shape', 'anchor', 'color', 'size'],
};

/** 한 프로젝트 안에 하나만 허용되는 노드 */
export const SINGLETON_KINDS = ['world', 'player', 'stats', 'mazeMap'];
