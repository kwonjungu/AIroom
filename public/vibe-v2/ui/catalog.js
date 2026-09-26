// 홈의 경로·챕터·미션 카드 모델 (순수 함수). DOM은 home.js가 그린다.
// catalog 형식(WP2 modes/cards/catalog.js 제공 예정):
//   [{ id, title, mode, missions: [{ id, title, icon, status:'locked'|'current'|'done'|'open', makeProject, lockReason? }] }]

export const PATHS = Object.freeze({
  cards: { id: 'cards', title: '그림 카드로 시작', desc: '그림 카드를 눌러 차례대로 놓으면 움직여요', recommendFor: ['low'], accent: 'cards', modes: ['goal', 'shape'] },
  make: { id: 'make', title: '말과 블록으로 만들기', desc: '하고 싶은 것을 말하고 블록으로 고쳐서 게임을 만들어요', recommendFor: ['mid', 'high'], accent: 'make', modes: ['studio', 'turtle', 'pixel', 'maze'] },
});

export function recommendedPath(grade) { return grade === 'low' ? 'cards' : 'make'; }

/** 미션 상태 → 색 없이도 구분되는 표시 (아이콘 + 글자). */
export function describeMission(m, index) {
  const num = String(index + 1);
  switch (m.status) {
    case 'current': return { num, mark: '▶', badge: '지금 여기', srText: `${num}번, 지금 할 차례`, disabled: false };
    case 'done': return { num, mark: '✓', badge: '완료', srText: `${num}번, 완료`, disabled: false };
    case 'locked': return { num, mark: '🔒', badge: '잠김', reason: m.lockReason || '앞 미션을 끝내면 열려요', srText: `${num}번, 잠김`, disabled: true };
    case 'open':
    default: return { num, mark: '', badge: '', srText: `${num}번`, disabled: false };
  }
}

/** 챕터 요약: 완료 수·현재 미션 */
export function chapterSummary(ch) {
  const missions = ch.missions || [];
  const done = missions.filter(m => m.status === 'done').length;
  const current = missions.find(m => m.status === 'current') || missions.find(m => m.status === 'open') || null;
  return { done, total: missions.length, current };
}

/** 이전/다음 챕터 (순수) */
export function chapterNav(index, count) {
  const i = Math.min(Math.max(0, index | 0), Math.max(0, count - 1));
  return { index: i, prev: i > 0 ? i - 1 : null, next: i < count - 1 ? i + 1 : null };
}

/** 처음 열 챕터: 현재 미션이 있는 챕터, 없으면 첫 챕터 */
export function initialChapterIndex(chapters) {
  const i = chapters.findIndex(ch => (ch.missions || []).some(m => m.status === 'current'));
  return i >= 0 ? i : 0;
}

/** 경로별 챕터 나누기 */
export function chaptersForPath(catalog, pathId) {
  const modes = PATHS[pathId].modes;
  return (catalog || []).filter(ch => modes.includes(ch.mode));
}

const FIXTURE_META = {
  goalCards: { icon: '⭐', mode: 'goal' },
  goalRepeat: { icon: '🔁', mode: 'goal' },
  shapeHouse: { icon: '🏠', mode: 'shape' },
};

/**
 * catalog가 없을 때 fixtures로 만드는 데모 카탈로그 (카드 경로만).
 * @param {{ALL_FIXTURES: Record<string, ()=>object>}} fixtures
 */
export function demoCatalog(fixtures) {
  const all = fixtures?.ALL_FIXTURES || {};
  const missions = Object.entries(FIXTURE_META)
    .filter(([k]) => typeof all[k] === 'function')
    .map(([k, meta], i) => ({
      id: 'demo-' + k, title: all[k]().title, icon: meta.icon, mode: meta.mode,
      status: i === 0 ? 'current' : 'open', makeProject: all[k],
    }));
  return missions.length ? [{ id: 'demo', title: '맛보기', mode: 'goal', missions, demo: true }] : [];
}

/** 공방 템플릿 카드 모델: studio 프로젝트 fixture → 그림·조작 설명 */
export function templateCards(fixtures) {
  return templateCardsFrom(Object.entries(fixtures?.ALL_FIXTURES || {}));
}

/**
 * 공방 카탈로그(modes/studio/catalog.js)의 미션 → 템플릿 카드. 공방 챕터가 없으면 빈 배열.
 * @param {object[]|null} catalog
 */
export function studioTemplateCards(catalog) {
  const missions = (catalog || []).filter(ch => ch.mode === 'studio').flatMap(ch => ch.missions || []);
  return templateCardsFrom(missions.map(m => [m.id, m.makeProject]));
}

function templateCardsFrom(entries) {
  const out = [];
  for (const [key, make] of entries) {
    if (typeof make !== 'function') continue;
    const p = make();
    if (p.mode !== 'studio') continue;
    const nodes = p.program?.nodes || [];
    const player = nodes.find(n => n.kind === 'player');
    const spawner = nodes.find(n => n.kind === 'spawner');
    const win = nodes.find(n => n.kind === 'winWhen');
    const emoji = slot => (p.assets || []).find(a => a.slotId === slot)?.preset?.replace(/^emoji:/, '') || '';
    const legacy = nodes.some(n => n.kind === 'legacySource');
    out.push({
      id: key,
      title: p.title,
      makeProject: make,
      hero: player ? emoji(player.args.appearance) : '🎮',
      item: spawner ? emoji(spawner.args.appearance) : '',
      controls: legacy ? '예전에 만든 작품이에요' : controlText(player?.args?.movement),
      goal: win ? goalText(win.args) : '',
      legacy,
    });
  }
  return out;
}

export function controlText(movement) {
  switch (movement) {
    case 'horizontal': return '← → 방향키나 좌우 버튼으로 움직여요';
    case 'fourWay': return '방향키나 방향판으로 움직여요';
    default: return '방향키나 방향판으로 움직여요';
  }
}

export function goalText({ stat, value }) {
  if (stat === 'score') return `${value}점을 모으면 성공`;
  if (stat === 'survivedSec') return `${value}초 버티면 성공`;
  if (stat === 'reachedExit') return '출구에 닿으면 성공';
  return '';
}
