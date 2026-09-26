// 계약 예제 프로젝트 — 테스트·mock·UI 개발용. 모두 validateProject를 통과해야 한다(tests/vibe/contracts).

const T = '2026-09-26T00:00:00.000Z';

function base(id, mode, title, engineVersion, program, extra = {}) {
  return {
    schemaVersion: 2, id, revision: 0, mode, title, templateId: null, engineVersion,
    capabilityVersion: '1', program, assets: [], learning: { missionId: null, missionVersion: null },
    createdAt: T, updatedAt: T, ...extra,
  };
}

/** 받기: 고양이가 생선을 받아 10개면 성공 */
export const catchGame = () => base('p_fixture_catch', 'studio', '생선 받기', 'studio-2', {
  nodes: [
    { id: 'world', kind: 'world', args: { background: 'bg.main', timeLimitSec: 60 }, children: [] },
    { id: 'player', kind: 'player', args: { appearance: 'player.appearance', x: 400, y: 540, speed: 320, radius: 28, movement: 'horizontal' }, children: [] },
    { id: 'fish-fall', kind: 'spawner', args: { entity: 'fish', appearance: 'fish.appearance', pattern: 'fallFromTop', intervalMs: 900, speed: 120, maxAlive: 8, count: 0, radius: 20 }, children: [] },
    { id: 'touch-fish', kind: 'onTouch', args: { entity: 'fish', effects: [{ do: 'addScore', amount: 1 }, { do: 'removeOther' }] }, children: [] },
    { id: 'stats', kind: 'stats', args: { lives: 0, invincibleMs: 0 }, children: [] },
    { id: 'win', kind: 'winWhen', args: { stat: 'score', value: 10 }, children: [] },
    { id: 'lose', kind: 'loseWhen', args: { stat: 'timeUp' }, children: [] },
  ],
  entrypoints: ['world', 'player', 'fish-fall', 'touch-fish', 'stats', 'win', 'lose'],
}, {
  templateId: 'catch',
  assets: [
    { slotId: 'bg.main', assetId: null, preset: 'bg-sky' },
    { slotId: 'player.appearance', assetId: null, preset: 'emoji:🐱' },
    { slotId: 'fish.appearance', assetId: null, preset: 'emoji:🐟' },
  ],
});

/** 별까지 가기: 앞으로 2 */
export const goalCards = () => base('p_fixture_goal', 'goal', '곧게 가기', 'cards-1', {
  nodes: [
    { id: 'c1', kind: 'move', args: {}, children: [] },
    { id: 'c2', kind: 'move', args: {}, children: [] },
  ],
  entrypoints: ['c1', 'c2'],
}, { learning: { missionId: 'goal-1', missionVersion: '1' } });

/** 별까지 가기: 반복 */
export const goalRepeat = () => base('p_fixture_goal_rep', 'goal', '반복 가기', 'cards-1', {
  nodes: [
    { id: 'r1', kind: 'repeat', args: { times: 3 }, children: ['c1'] },
    { id: 'c1', kind: 'move', args: {}, children: [] },
  ],
  entrypoints: ['r1'],
});

/** 도형 겹치기: 집 짓기 정답 */
export const shapeHouse = () => base('p_fixture_shape', 'shape', '집 짓기', 'cards-1', {
  nodes: [
    { id: 's1', kind: 'stamp', args: { shape: 'rect', anchor: 5, color: '#8D6E63', size: 'L' }, children: [] },
    { id: 's2', kind: 'stamp', args: { shape: 'tri', anchor: 5, color: '#E53935', size: 'L' }, children: [] },
  ],
  entrypoints: ['s1', 's2'],
}, { learning: { missionId: 'shape-1', missionVersion: '1' } });

/** 구 공방 작품(원문 보존) */
export const legacyStudio = () => base('p_fixture_legacy', 'studio', '옛 게임', 'legacy-1', {
  nodes: [{ id: 'src', kind: 'legacySource', args: { language: 'studio-dsl-1', source: 'SPRITE 🐱 200 250\nON_KEY LEFT {\n  MOVE_X -10\n}' }, children: [] }],
  entrypoints: ['src'],
});

export const ALL_FIXTURES = { catchGame, goalCards, goalRepeat, shapeHouse, legacyStudio };
