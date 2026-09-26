// 승인 에셋 카탈로그 원본 — build-manifest.js가 이 표 + 실제 파일(sha256·픽셀 크기)로 manifest.json을 만든다.
// 파일을 public/assets/vibe/에 추가하면 여기에도 등록해야 빌드가 통과한다(미등록 = 미승인).
//
// 출처(provenance)는 git 이력과 CLAUDE.md·LOWGRADE_ASSET_PROMPTS.md 기록에서 옮겼다:
//   ed5d2db  SVG 캐릭터 7종 — 손제작
//   533d04e  Nano Banana 배치, 검수 승인 20종 — 커밋에 배치 차수 기록 없음(1~6차 중)
//   be4c360  27종 — 커밋 메시지는 "상용 에셋"(=상용 수준 품질)으로 표기, CLAUDE.md는 Nano Banana 생성으로 기록. 차수 기록 없음
//   27f049d  Nano Banana 배치 7차 12종
//   c39f95d  Nano Banana 배치 8차(gen-assets8/8b/8c, gemini-2.5-flash-image) 22종

export const STYLE_PACK_ID = 'toto-world-v1';

export const PROVENANCE_GROUPS = Object.freeze({
  ed5d2db: { type: 'hand', label: '손제작', provider: null, model: null, batch: null, note: 'SVG 손제작 캐릭터' },
  '533d04e': { type: 'ai', label: 'AI 생성(Nano Banana, 배치 차수 미기록)', provider: 'google-gemini', model: 'nano-banana', batch: null, note: '커밋 533d04e: 배치 API 검수 승인분 20종' },
  be4c360: { type: 'ai', label: 'AI 생성(Nano Banana, 배치 차수 미기록)', provider: 'google-gemini', model: 'nano-banana', batch: null, note: '커밋 be4c360: 메시지 표기 "상용 에셋 27종" — 출처 문구 재확인 권장' },
  '27f049d': { type: 'ai', label: 'AI 생성(Nano Banana, 배치 7차)', provider: 'google-gemini', model: 'nano-banana', batch: 7, note: '커밋 27f049d' },
  c39f95d: { type: 'ai', label: 'AI 생성(Nano Banana, 배치 8차)', provider: 'google-gemini', model: 'gemini-2.5-flash-image', batch: 8, note: '커밋 c39f95d, gen-assets8/8b/8c' },
});

const G = (commit, files) => files.map(f => [f, commit]);
/** 파일명 → 추가 커밋 */
export const FILE_COMMIT = Object.freeze(Object.fromEntries([
  ...G('ed5d2db', ['pixel-hello.svg', 'pixel-success.svg', 'pixel-think.svg', 'toto-cheer.svg', 'toto-hello.svg', 'toto-success.svg', 'toto-think.svg']),
  ...G('533d04e', ['bg-canvas.jpg', 'bg-map.jpg', 'bg-maze.jpg', 'bg-space.jpg', 'planet-atelier.png', 'planet-billboard.png', 'planet-crystal.png',
    'planet-lava.png', 'planet-mirror.png', 'planet-neon.png', 'planet-puzzle.png', 'planet-rainbow.png', 'planet-sprout.png', 'planet-village.png',
    'turtle-top.png', 'ui-check.png', 'ui-lock.png', 'ui-star.png', 'ui-trophy.png']),
  ...G('be4c360', ['bg-canvas-chalk.jpg', 'bg-canvas-ocean.jpg', 'bg-canvas-purple.jpg', 'bg-stage-meadow.jpg', 'bg-stage-space.jpg', 'card-maze.jpg',
    'card-pixel.jpg', 'card-studio.jpg', 'card-turtle.jpg', 'it-alien.png', 'it-apple.png', 'it-bomb.png', 'it-candy.png', 'it-coin.png', 'it-flower.png',
    'it-gem.png', 'it-star.png', 'sp-cat.png', 'sp-fish.png', 'sp-robot.png', 'sp-rocket.png', 'sp-turtle.png', 'sp-unicorn.png', 'tile-gem.png',
    'tile-portal.png', 'tile-rock.png', 'title-hero.jpg']),
  ...G('27f049d', ['arrow-scroll.png', 'bg-story-city.jpg', 'bg-story-ruin.jpg', 'bg-story-studio.jpg', 'flag-chapter.png', 'gate-choice.png',
    'gate-exam.png', 'gate-loop.png', 'gate-seq.png', 'planet-studio.png', 'ui-star-empty.png', 'ui-trophy-glow.png']),
  ...G('c39f95d', ['anchor-dot.png', 'card-goal-star.png', 'card-move.png', 'card-repeat.png', 'card-turn-left.png', 'card-turn-right.png',
    'planet-path.png', 'planet-shapes.png', 'rover-hello.png', 'rover-hint.png', 'rover-success.png', 'rover-top.png', 'shape-canvas-bg.png',
    'shape-circle.png', 'shape-rect.png', 'shape-rhombus.png', 'shape-target-frame.png', 'shape-tri.png', 'tile-floor.png', 'tile-goal.png',
    'tile-start.png', 'tile-wall.png']),
]));

/**
 * 파일 → manifest 항목 규칙. usableInGame:false는 학생 게임 슬롯 매칭에서 제외(UI·정답 기하용 그림).
 * ko: 한국어 매칭 키워드(첫 단어가 대표 이름)
 */
export const FILE_RULES = Object.freeze({
  // 게임 스프라이트 (v1 SPRITE_MAP과 같은 대응)
  'sp-cat.png': { key: 'sprite:cat', kind: 'sprite', category: 'hero', ko: ['고양이', '냥이', '야옹이', '캣'], emoji: '🐱' },
  'sp-fish.png': { key: 'sprite:fish', kind: 'sprite', category: 'hero', ko: ['물고기', '생선', '고기', '붕어', '금붕어'], emoji: '🐟' },
  'sp-robot.png': { key: 'sprite:robot', kind: 'sprite', category: 'hero', ko: ['로봇', '픽셀', '안드로이드'], emoji: '🤖' },
  'sp-rocket.png': { key: 'sprite:rocket', kind: 'sprite', category: 'hero', ko: ['로켓', '우주선', '비행선'], emoji: '🚀' },
  'sp-turtle.png': { key: 'sprite:turtle', kind: 'sprite', category: 'hero', ko: ['거북이', '거북', '토토'], emoji: '🐢' },
  'sp-unicorn.png': { key: 'sprite:unicorn', kind: 'sprite', category: 'hero', ko: ['유니콘', '말', '조랑말'], emoji: '🦄' },
  'it-apple.png': { key: 'sprite:apple', kind: 'sprite', category: 'item', ko: ['사과', '과일'], emoji: '🍎' },
  'it-star.png': { key: 'sprite:star', kind: 'sprite', category: 'item', ko: ['별', '별님', '스타'], emoji: '⭐' },
  'it-gem.png': { key: 'sprite:gem', kind: 'sprite', category: 'item', ko: ['보석', '다이아몬드', '다이아', '수정'], emoji: '💎' },
  'it-candy.png': { key: 'sprite:candy', kind: 'sprite', category: 'item', ko: ['사탕', '캔디', '과자'], emoji: '🍬' },
  'it-bomb.png': { key: 'sprite:bomb', kind: 'sprite', category: 'hazard', ko: ['폭탄'], emoji: '💣' },
  'it-alien.png': { key: 'sprite:alien', kind: 'sprite', category: 'hazard', ko: ['외계인', '에일리언', '몬스터', '괴물'], emoji: '👾' },
  'it-flower.png': { key: 'sprite:flower', kind: 'sprite', category: 'item', ko: ['꽃', '벚꽃', '꽃잎'], emoji: '🌸' },
  'it-coin.png': { key: 'sprite:coin', kind: 'sprite', category: 'item', ko: ['동전', '코인', '금화', '돈'], emoji: '🪙' },
  'rover-top.png': { key: 'sprite:rover', kind: 'sprite', category: 'hero', ko: ['로버', '탐사차', '탐사선'] },
  'turtle-top.png': { key: 'sprite:turtle-top', kind: 'sprite', category: 'hero', ko: ['거북이', '거북'] },
  'rover-hello.png': { key: 'sprite:rover-hello', kind: 'sprite', category: 'character', ko: ['로버', '탐사 로봇'] },
  'rover-hint.png': { key: 'sprite:rover-hint', kind: 'sprite', category: 'character', ko: ['로버'] },
  'rover-success.png': { key: 'sprite:rover-success', kind: 'sprite', category: 'character', ko: ['로버'] },
  'toto-hello.svg': { key: 'sprite:toto-hello', kind: 'sprite', category: 'character', ko: ['토토', '거북이'] },
  'toto-cheer.svg': { key: 'sprite:toto-cheer', kind: 'sprite', category: 'character', ko: ['토토'] },
  'toto-success.svg': { key: 'sprite:toto-success', kind: 'sprite', category: 'character', ko: ['토토'] },
  'toto-think.svg': { key: 'sprite:toto-think', kind: 'sprite', category: 'character', ko: ['토토'] },
  'pixel-hello.svg': { key: 'sprite:pixel-hello', kind: 'sprite', category: 'character', ko: ['픽셀', '로봇'] },
  'pixel-success.svg': { key: 'sprite:pixel-success', kind: 'sprite', category: 'character', ko: ['픽셀'] },
  'pixel-think.svg': { key: 'sprite:pixel-think', kind: 'sprite', category: 'character', ko: ['픽셀'] },
  'tile-gem.png': { key: 'tile:gem', kind: 'sprite', category: 'tile', ko: ['보석'] },
  'tile-portal.png': { key: 'tile:portal', kind: 'sprite', category: 'tile', ko: ['포털', '포탈', '문', '차원문'] },
  'tile-rock.png': { key: 'tile:rock', kind: 'sprite', category: 'tile', ko: ['바위', '돌'] },
  'tile-floor.png': { key: 'tile:floor', kind: 'sprite', category: 'tile', ko: ['바닥'], usableInGame: false },
  'tile-goal.png': { key: 'tile:goal', kind: 'sprite', category: 'tile', ko: ['도착', '목표', '깃발'] },
  'tile-start.png': { key: 'tile:start', kind: 'sprite', category: 'tile', ko: ['출발'], usableInGame: false },
  'tile-wall.png': { key: 'tile:wall', kind: 'sprite', category: 'tile', ko: ['벽', '벽돌'] },

  // 배경
  'bg-stage-space.jpg': { key: 'bg:stage-space', kind: 'background', category: 'stage', ko: ['우주', '달나라', '밤하늘', '달'], aliases: ['bg-space'] },
  'bg-stage-meadow.jpg': { key: 'bg:stage-meadow', kind: 'background', category: 'stage', ko: ['초원', '들판', '풀밭', '숲'], aliases: ['bg-meadow'] },
  'bg-maze.jpg': { key: 'bg:maze', kind: 'background', category: 'stage', ko: ['유적', '미로', '동굴', '고대'], aliases: ['bg-ruins'] },
  'bg-space.jpg': { key: 'bg:space', kind: 'background', category: 'story', ko: ['우주', '은하', '별하늘'] },
  'bg-map.jpg': { key: 'bg:map', kind: 'background', category: 'story', ko: ['지도', '모험 지도'] },
  'bg-canvas.jpg': { key: 'bg:canvas', kind: 'background', category: 'canvas', ko: ['밤', '어두운'] },
  'bg-canvas-chalk.jpg': { key: 'bg:canvas-chalk', kind: 'background', category: 'canvas', ko: ['칠판', '교실'] },
  'bg-canvas-ocean.jpg': { key: 'bg:canvas-ocean', kind: 'background', category: 'canvas', ko: ['바다', '바닷속', '물속', '해저'] },
  'bg-canvas-purple.jpg': { key: 'bg:canvas-purple', kind: 'background', category: 'canvas', ko: ['보라', '신비'] },
  'bg-story-city.jpg': { key: 'bg:story-city', kind: 'background', category: 'story', ko: ['도시', '마을', '거리'] },
  'bg-story-ruin.jpg': { key: 'bg:story-ruin', kind: 'background', category: 'story', ko: ['유적', '폐허', '고대'] },
  'bg-story-studio.jpg': { key: 'bg:story-studio', kind: 'background', category: 'story', ko: ['공방', '작업실', '스튜디오'] },
  'title-hero.jpg': { key: 'bg:title-hero', kind: 'background', category: 'keyart', ko: ['타이틀'], usableInGame: false },
  'shape-canvas-bg.png': { key: 'bg:shape-canvas', kind: 'background', category: 'canvas', ko: ['모눈', '격자'], usableInGame: false },

  // 카드 그림
  'card-maze.jpg': { key: 'card:maze', kind: 'card', category: 'mode', ko: ['미로'] },
  'card-pixel.jpg': { key: 'card:pixel', kind: 'card', category: 'mode', ko: ['픽셀', '전광판'] },
  'card-studio.jpg': { key: 'card:studio', kind: 'card', category: 'mode', ko: ['공방', '게임'] },
  'card-turtle.jpg': { key: 'card:turtle', kind: 'card', category: 'mode', ko: ['거북이 그림'] },
  'card-goal-star.png': { key: 'card:goal-star', kind: 'card', category: 'coding-card', ko: ['별 도착'], usableInGame: false },
  'card-move.png': { key: 'card:move', kind: 'card', category: 'coding-card', ko: ['앞으로'], usableInGame: false },
  'card-repeat.png': { key: 'card:repeat', kind: 'card', category: 'coding-card', ko: ['반복'], usableInGame: false },
  'card-turn-left.png': { key: 'card:turn-left', kind: 'card', category: 'coding-card', ko: ['왼쪽'], usableInGame: false },
  'card-turn-right.png': { key: 'card:turn-right', kind: 'card', category: 'coding-card', ko: ['오른쪽'], usableInGame: false },
  'planet-atelier.png': { key: 'card:planet-atelier', kind: 'card', category: 'planet', ko: ['행성', '팔레트 행성'] },
  'planet-billboard.png': { key: 'card:planet-billboard', kind: 'card', category: 'planet', ko: ['행성', '전광판'] },
  'planet-crystal.png': { key: 'card:planet-crystal', kind: 'card', category: 'planet', ko: ['얼음 행성', '크리스탈', '얼음'] },
  'planet-lava.png': { key: 'card:planet-lava', kind: 'card', category: 'planet', ko: ['용암', '화산', '용암 행성'] },
  'planet-mirror.png': { key: 'card:planet-mirror', kind: 'card', category: 'planet', ko: ['거울 행성'] },
  'planet-neon.png': { key: 'card:planet-neon', kind: 'card', category: 'planet', ko: ['네온', '네온 도시'] },
  'planet-puzzle.png': { key: 'card:planet-puzzle', kind: 'card', category: 'planet', ko: ['퍼즐'] },
  'planet-rainbow.png': { key: 'card:planet-rainbow', kind: 'card', category: 'planet', ko: ['무지개'] },
  'planet-sprout.png': { key: 'card:planet-sprout', kind: 'card', category: 'planet', ko: ['새싹', '식물'] },
  'planet-village.png': { key: 'card:planet-village', kind: 'card', category: 'planet', ko: ['마을 행성'] },
  'planet-studio.png': { key: 'card:planet-studio', kind: 'card', category: 'planet', ko: ['공방 행성'] },
  'planet-path.png': { key: 'card:planet-path', kind: 'card', category: 'planet', ko: ['길 행성'] },
  'planet-shapes.png': { key: 'card:planet-shapes', kind: 'card', category: 'planet', ko: ['도형 행성'] },
  'gate-choice.png': { key: 'card:gate-choice', kind: 'card', category: 'gate', ko: ['관문'] },
  'gate-exam.png': { key: 'card:gate-exam', kind: 'card', category: 'gate', ko: ['관문', '시험'] },
  'gate-loop.png': { key: 'card:gate-loop', kind: 'card', category: 'gate', ko: ['관문'] },
  'gate-seq.png': { key: 'card:gate-seq', kind: 'card', category: 'gate', ko: ['관문'] },

  // UI — 게임 슬롯에 쓰지 않는다. 도형 그림은 정답 기하 판정에 절대 쓰지 않는다(Canvas로 그림).
  'ui-check.png': { key: 'ui:check', kind: 'ui', category: 'ui', ko: ['체크'], usableInGame: false },
  'ui-lock.png': { key: 'ui:lock', kind: 'ui', category: 'ui', ko: ['자물쇠'], usableInGame: false },
  'ui-star.png': { key: 'ui:star', kind: 'ui', category: 'ui', ko: ['별'], usableInGame: false },
  'ui-star-empty.png': { key: 'ui:star-empty', kind: 'ui', category: 'ui', ko: ['빈 별'], usableInGame: false },
  'ui-trophy.png': { key: 'ui:trophy', kind: 'ui', category: 'ui', ko: ['트로피'], usableInGame: false },
  'ui-trophy-glow.png': { key: 'ui:trophy-glow', kind: 'ui', category: 'ui', ko: ['트로피'], usableInGame: false },
  'arrow-scroll.png': { key: 'ui:arrow-scroll', kind: 'ui', category: 'ui', ko: ['화살표'], usableInGame: false },
  'flag-chapter.png': { key: 'ui:flag-chapter', kind: 'ui', category: 'ui', ko: ['깃발'], usableInGame: false },
  'anchor-dot.png': { key: 'ui:anchor-dot', kind: 'ui', category: 'shape', ko: ['점'], usableInGame: false },
  'shape-circle.png': { key: 'ui:shape-circle', kind: 'ui', category: 'shape', ko: ['원'], usableInGame: false },
  'shape-rect.png': { key: 'ui:shape-rect', kind: 'ui', category: 'shape', ko: ['사각형'], usableInGame: false },
  'shape-rhombus.png': { key: 'ui:shape-rhombus', kind: 'ui', category: 'shape', ko: ['마름모'], usableInGame: false },
  'shape-target-frame.png': { key: 'ui:shape-target-frame', kind: 'ui', category: 'shape', ko: ['액자'], usableInGame: false },
  'shape-tri.png': { key: 'ui:shape-tri', kind: 'ui', category: 'shape', ko: ['삼각형'], usableInGame: false },
});

/**
 * 이모지 preset (파일 없음, OS 글꼴로 그림). 템플릿 HEROES·CATCH_ITEMS·HAZARDS·GEMS + 흔한 요청어.
 * 한 이모지가 여러 한국어 단어를 가진다. 첫 단어가 대표 이름.
 */
export const EMOJI_PRESETS = Object.freeze([
  ['🐱', ['고양이', '냥이', '야옹이', '캣']], ['🐶', ['강아지', '개', '멍멍이', '댕댕이']], ['🐰', ['토끼']], ['🐻', ['곰', '곰돌이']],
  ['🐼', ['판다']], ['🦊', ['여우']], ['🐸', ['개구리']], ['🐵', ['원숭이']], ['🐯', ['호랑이', '호랭이']], ['🦁', ['사자']],
  ['🐷', ['돼지']], ['🐮', ['소', '젖소']], ['🐔', ['닭', '병아리']], ['🐧', ['펭귄']], ['🐦', ['새', '참새']], ['🦉', ['부엉이', '올빼미']],
  ['🐢', ['거북이', '거북', '토토']], ['🐟', ['물고기', '생선', '고기']], ['🐠', ['열대어']], ['🐬', ['돌고래']], ['🐳', ['고래']],
  ['🦈', ['상어']], ['🐙', ['문어']], ['🦀', ['게', '꽃게']], ['🐝', ['벌', '꿀벌']], ['🦋', ['나비']], ['🐞', ['무당벌레']],
  ['🐍', ['뱀']], ['🦖', ['공룡', '티라노']], ['🐉', ['용', '드래곤']], ['🦄', ['유니콘']], ['🤖', ['로봇', '픽셀']],
  ['🚀', ['로켓', '우주선']], ['🛸', ['비행접시', 'UFO', '유에프오']], ['👾', ['외계인', '몬스터', '괴물']], ['👻', ['유령', '귀신']],
  ['🧙', ['마법사']], ['🧚', ['요정']], ['🦸', ['영웅', '슈퍼히어로']], ['🥷', ['닌자']], ['🤴', ['왕자']], ['👸', ['공주']],
  ['🚗', ['자동차', '차']], ['🚌', ['버스']], ['🚲', ['자전거']], ['✈️', ['비행기']], ['🚁', ['헬리콥터']], ['⛵', ['배', '돛단배']],
  ['🍎', ['사과']], ['🍌', ['바나나']], ['🍓', ['딸기']], ['🍉', ['수박']], ['🍇', ['포도']], ['🍊', ['귤', '오렌지']], ['🍒', ['체리']],
  ['🍬', ['사탕', '캔디']], ['🍭', ['막대사탕']], ['🍩', ['도넛']], ['🍪', ['쿠키', '과자']], ['🍰', ['케이크']], ['🍦', ['아이스크림']],
  ['🍕', ['피자']], ['🍔', ['햄버거']], ['🥕', ['당근']], ['🍄', ['버섯']], ['🌸', ['꽃', '벚꽃']], ['🌻', ['해바라기']], ['🌳', ['나무']],
  ['🍀', ['네잎클로버', '클로버']], ['⭐', ['별']], ['🌟', ['반짝별']], ['🌙', ['달', '초승달']], ['☀️', ['해', '태양']], ['☁️', ['구름']],
  ['⚡', ['번개']], ['🔥', ['불', '불꽃']], ['💧', ['물방울']], ['❄️', ['눈송이', '눈']], ['🌈', ['무지개']], ['💎', ['보석', '다이아몬드']],
  ['🪙', ['동전', '코인', '금화']], ['💰', ['돈주머니', '돈']], ['🎁', ['선물', '상자']], ['🔑', ['열쇠']], ['👑', ['왕관']], ['❤️', ['하트', '마음']],
  ['⚽', ['축구공', '공']], ['🏀', ['농구공']], ['🎈', ['풍선']], ['💣', ['폭탄']], ['☄️', ['운석', '혜성', '별똥별']], ['🪨', ['바위', '돌']],
  ['🌵', ['선인장']], ['🏠', ['집']], ['🏰', ['성']],
]);

/** 기본 배경 preset (WP4 BACKGROUND_COLORS와 같은 키) */
export const BACKGROUND_PRESETS = Object.freeze({
  'bg-sky': { ko: ['하늘', '파란 하늘', '낮'], color: '#BFE6FF' },
  'bg-space': { ko: ['우주', '밤하늘'], color: '#141B3A' },
  'bg-meadow': { ko: ['초원', '풀밭', '들판'], color: '#CDEFB8' },
  'bg-ruins': { ko: ['유적', '미로'], color: '#E9DDC4' },
});

/** 합성 효과음 (public/vibe-v2/assets/sfx.js). durationMs는 합성 코드 기준.
 *  게임 이벤트음은 0.2~1초. uiOnly(버튼 틱)는 v1 그대로 짧고 게임 슬롯에 쓰지 않는다. sfx:hit만 v2 신규 */
export const SFX_PRESETS = Object.freeze({
  'sfx:success': { ko: ['성공', '승리', '이김'], durationMs: 580, gameEvent: 'win' },
  'sfx:star': { ko: ['별', '점수', '획득', '먹기'], durationMs: 300, gameEvent: 'collect' },
  'sfx:fail': { ko: ['실패', '짐', '아야', '부딪힘'], durationMs: 520, gameEvent: 'lose' },
  'sfx:unlock': { ko: ['열림', '반짝', '잠금 해제'], durationMs: 540, gameEvent: null },
  'sfx:run': { ko: ['휙', '출발', '시작'], durationMs: 220, gameEvent: 'start' },
  'sfx:hit': { ko: ['쿵', '충돌', '맞음'], durationMs: 260, gameEvent: 'hit' },
  'sfx:pop': { ko: ['뽁', '톡'], durationMs: 90, gameEvent: null, uiOnly: true },
  'sfx:click': { ko: ['딸깍', '클릭'], durationMs: 50, gameEvent: null, uiOnly: true },
});

/** 첫 화면 전달 예산 (§6.2) */
export const BUDGET = Object.freeze({
  sprite: { targetBytes: 100 * 1024, maxBytes: 200 * 1024 },
  card: { targetBytes: 100 * 1024, maxBytes: 200 * 1024 },
  ui: { targetBytes: 100 * 1024, maxBytes: 200 * 1024 },
  background: { targetBytes: 300 * 1024, maxBytes: 500 * 1024 },
  sfx: { targetBytes: 100 * 1024, maxBytes: 100 * 1024 },
});
