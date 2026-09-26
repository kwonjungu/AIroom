// 도형 겹치기 미션 (v2 규격). v1 SHAPE_MISSIONS 12개를 모두 옮기고 README §6.1의 눈사람·물고기를 더했다.
//
// 필드
//  id        'shape-N' (N = v1 번호, 13·14는 새 미션). 저장·진도 키이므로 바꾸지 않는다.
//  concept   'order' | 'overlap' | 'anchor' | 'color' | 'size' — 이 미션이 가르치는 한 가지
//  target    stamp args 배열. 배열 순서 = 찍는 순서 = 나중 것이 위
//  cards     시작 카드. cardsPlaced=false 이면 "카드 상자"에 놓이고 눌러서 한 번씩 찍는다(도형 수·색 고정).
//            cardsPlaced=true 이면 처음부터 카드 줄에 놓여 있고, editable 속성만 바꿀 수 있다.
//  palette   'fixed'(cards만) | 'shapes'(도형 4종을 자유롭게 추가)
//  editable  속성 패널에서 바꿀 수 있는 속성
//  accept    orderMatters: [a,b] = 목표 a번을 b번보다 먼저 찍어야 한다(그림이 같아도 지켜야 하는 학습 조건).
//            그 밖의 순서는 "그림이 같으면 정답"(안 겹치는 도형·같은 색끼리 겹친 도형 교환 허용).
//            requireHidden: 목표에서 가려진 도형도 카드로 있어야 하는가. minPercent: 픽셀 일치 하한.
//  feedback  학생용 오답 문구. 키 = '<kind>:<targetIndex>' 또는 '<kind>' (kind: missing/order/color/anchor/size/extra)
//
// 위치 칸: 1 왼쪽 위, 2 위, 3 오른쪽 위, 4 왼쪽, 5 가운데, 6 오른쪽, 7 왼쪽 아래, 8 아래, 9 오른쪽 아래.

const C = {
  brown: '#8D6E63', red: '#E53935', blue: '#1E88E5', yellow: '#FDD835',
  green: '#43A047', white: '#FFFFFF', gray: '#90A4AE', orange: '#FB8C00',
};
const st = (shape, anchor, color, size) => ({ shape, anchor, color, size });

export const SHAPE_CHAPTERS = [
  { id: 'shape-order', title: '순서의 나라', story: '도형을 찍는 순서를 바꾸면 그림이 달라져! 나중에 찍은 도형이 위를 덮어.' },
  { id: 'shape-edit', title: '도형 마법사', story: '이제 도형의 색·크기·자리를 하나씩 바꿔 볼 차례!' },
];

export const SHAPE_MISSIONS = [
  // ── 순서의 나라: 도형 수·색 고정, 순서만 ──
  {
    id: 'shape-1', num: 1, chapter: 'shape-order', title: '집 짓기', icon: '🏠', concept: 'order', conceptDemo: true,
    description: '네모 몸통 위에 세모 지붕을 얹어 집을 만들어요.',
    story: '카드를 누른 차례대로 도형이 찍혀. 나중에 찍은 도형이 먼저 찍은 도형을 덮어!',
    hint: '네모(몸통)를 먼저, 세모(지붕)를 나중에 찍어 봐.',
    success: '예쁜 집이 완성됐어! 나중에 찍은 세모가 위에 올라갔지?',
    target: [st('rect', 5, C.brown, 'L'), st('tri', 5, C.red, 'L')],
    cards: [st('tri', 5, C.red, 'L'), st('rect', 5, C.brown, 'L')],
    cardsPlaced: false, palette: 'fixed', editable: [],
    accept: { orderMatters: [[0, 1]] },
    feedback: { 'order:1': '네모는 잘 놓았어. 세모를 나중에 찍어 볼까?', 'missing:0': '갈색 네모가 아직 없어. 네모 카드를 눌러 볼까?', 'missing:1': '빨강 세모가 아직 없어. 세모 카드를 눌러 볼까?' },
  },
  {
    id: 'shape-2', num: 2, chapter: 'shape-order', title: '과녁', icon: '🎯', concept: 'order',
    description: '큰 빨강 원 위에 작은 흰 원을 겹쳐 과녁을 만들어요.',
    story: '흰 원을 먼저 찍으면 큰 빨강 원이 덮어서 흰 원이 사라져!',
    hint: '큰 빨강 원을 먼저, 작은 흰 원을 나중에!',
    success: '멋진 과녁이 됐어!',
    target: [st('circle', 5, C.red, 'L'), st('circle', 5, C.white, 'M')],
    cards: [st('circle', 5, C.white, 'M'), st('circle', 5, C.red, 'L')],
    cardsPlaced: false, palette: 'fixed', editable: [],
    accept: { orderMatters: [[0, 1]] },
    feedback: { 'order:1': '빨강 동그라미는 잘 놓았어. 흰 동그라미를 나중에 찍어 볼까?' },
  },
  {
    id: 'shape-3', num: 3, chapter: 'shape-order', title: '나무', icon: '🌳', concept: 'order',
    description: '갈색 기둥 위에 초록 잎을 겹쳐 나무를 만들어요.',
    story: '기둥을 나중에 찍으면 기둥이 잎을 덮어 버려.',
    hint: '갈색 네모(기둥)를 먼저, 초록 세모(잎)를 나중에!',
    success: '초록 나무가 자랐어!',
    target: [st('rect', 8, C.brown, 'L'), st('tri', 5, C.green, 'L')],
    cards: [st('tri', 5, C.green, 'L'), st('rect', 8, C.brown, 'L')],
    cardsPlaced: false, palette: 'fixed', editable: [],
    accept: { orderMatters: [[0, 1]] },
    feedback: { 'order:1': '기둥은 잘 놓았어. 초록 잎을 나중에 찍어 볼까?' },
  },
  {
    id: 'shape-4', num: 4, chapter: 'shape-order', title: '문 달린 집', icon: '🚪', concept: 'order',
    description: '집에 문을 달아요. 겹치는 순서를 잘 지켜요.',
    story: '몸통 위에 지붕, 그 위에 문! 문은 맨 마지막에 찍어야 보여.',
    hint: '몸통 → 지붕 → 문! 문은 맨 마지막!',
    success: '문이 달린 집이 완성!',
    target: [st('rect', 5, C.brown, 'L'), st('tri', 5, C.red, 'L'), st('rect', 8, C.blue, 'M')],
    cards: [st('tri', 5, C.red, 'L'), st('rect', 8, C.blue, 'M'), st('rect', 5, C.brown, 'L')],
    cardsPlaced: false, palette: 'fixed', editable: [],
    accept: { orderMatters: [[0, 1], [0, 2], [1, 2]] },
    feedback: { 'order:2': '지붕까지 잘 놓았어. 파랑 문을 맨 나중에 찍어 볼까?' },
  },
  {
    id: 'shape-5', num: 5, chapter: 'shape-order', title: '웃는 얼굴', icon: '😊', concept: 'order',
    description: '노랑 얼굴 위에 갈색 동그라미를 찍어 표정을 만들어요.',
    story: '얼굴을 나중에 찍으면 가운데 동그라미가 가려져. 위쪽 동그라미는 얼굴과 안 겹치니까 언제 찍어도 돼!',
    hint: '노랑 큰 원(얼굴)을 먼저, 갈색 작은 원을 나중에!',
    success: '웃는 얼굴이 됐어!',
    target: [st('circle', 5, C.yellow, 'L'), st('circle', 5, C.brown, 'S'), st('circle', 2, C.brown, 'S')],
    cards: [st('circle', 5, C.brown, 'S'), st('circle', 2, C.brown, 'S'), st('circle', 5, C.yellow, 'L')],
    cardsPlaced: false, palette: 'fixed', editable: [],
    accept: { orderMatters: [[0, 1]] },
    feedback: { 'order:1': '노랑 얼굴은 잘 놓았어. 가운데 갈색 동그라미를 나중에 찍어 볼까?' },
  },
  {
    id: 'shape-6', num: 6, chapter: 'shape-order', title: '사과', icon: '🍎', concept: 'order',
    description: '빨강 사과에 초록 잎과 갈색 꼭지를 달아요.',
    story: '사과를 먼저 그려야 잎과 꼭지가 보여.',
    hint: '빨강 원(사과) → 초록 세모(잎) → 갈색 네모(꼭지)!',
    success: '맛있는 사과가 됐어!',
    target: [st('circle', 5, C.red, 'L'), st('tri', 2, C.green, 'M'), st('rect', 2, C.brown, 'S')],
    cards: [st('rect', 2, C.brown, 'S'), st('tri', 2, C.green, 'M'), st('circle', 5, C.red, 'L')],
    cardsPlaced: false, palette: 'fixed', editable: [],
    // 사과 윗부분과 잎이 조금 겹친다 → 사과가 잎보다 먼저. 사과와 꼭지는 안 겹친다.
    accept: { orderMatters: [[0, 1], [1, 2]] },
    feedback: { 'order:1': '빨강 사과는 잘 놓았어. 초록 잎을 나중에 찍어 볼까?', 'order:2': '잎은 잘 놓았어. 갈색 꼭지를 나중에 찍어 볼까?' },
  },
  {
    id: 'shape-7', num: 7, chapter: 'shape-order', title: '로켓', icon: '🚀', concept: 'order',
    description: '네모 몸통에 세모 머리와 불꽃을 겹쳐 로켓을 만들어요.',
    story: '몸통이 맨 먼저야. 몸통을 나중에 찍으면 머리와 불꽃이 숨어.',
    hint: '몸통 → 머리 → 불꽃 순서로 겹쳐요!',
    success: '로켓 발사!',
    target: [st('rect', 5, C.blue, 'L'), st('tri', 5, C.red, 'M'), st('tri', 8, C.orange, 'M')],
    cards: [st('tri', 8, C.orange, 'M'), st('tri', 5, C.red, 'M'), st('rect', 5, C.blue, 'L')],
    cardsPlaced: false, palette: 'fixed', editable: [],
    accept: { orderMatters: [[0, 1], [0, 2]] },
    feedback: { 'order:1': '파랑 몸통은 잘 놓았어. 빨강 머리를 나중에 찍어 볼까?', 'order:2': '파랑 몸통은 잘 놓았어. 주황 불꽃을 나중에 찍어 볼까?' },
  },
  {
    id: 'shape-8', num: 8, chapter: 'shape-order', title: '꽃', icon: '🌸', concept: 'order',
    description: '기둥·꽃잎·꽃술을 차례로 겹쳐 꽃을 피워요.',
    story: '꽃술이 맨 위에 있어야 예뻐.',
    hint: '초록 기둥 → 빨강 꽃잎 → 노랑 꽃술(맨 위)!',
    success: '예쁜 꽃이 피었어!',
    target: [st('rect', 8, C.green, 'S'), st('rhombus', 5, C.red, 'L'), st('rhombus', 5, C.red, 'M'), st('circle', 5, C.yellow, 'S')],
    cards: [st('circle', 5, C.yellow, 'S'), st('rhombus', 5, C.red, 'M'), st('rect', 8, C.green, 'S'), st('rhombus', 5, C.red, 'L')],
    cardsPlaced: false, palette: 'fixed', editable: [],
    // 큰·작은 빨강 꽃잎은 같은 색이라 서로 순서를 바꿔도 그림이 같다 → 동등 정답
    accept: { orderMatters: [[1, 3], [2, 3]] },
    feedback: { 'order:3': '꽃잎은 잘 놓았어. 노랑 꽃술을 맨 나중에 찍어 볼까?' },
  },
  {
    id: 'shape-13', num: 13, chapter: 'shape-order', title: '눈사람', icon: '⛄', concept: 'overlap',
    description: '흰 몸통과 흰 머리, 주황 코로 눈사람을 만들어요.',
    story: '같은 색끼리 겹치면 누가 위인지 안 보여. 그래도 코는 얼굴보다 나중에!',
    hint: '흰 동그라미 두 개를 먼저, 주황 세모 코를 맨 나중에!',
    success: '눈사람이 웃고 있어!',
    target: [st('circle', 8, C.white, 'L'), st('circle', 5, C.white, 'M'), st('tri', 5, C.orange, 'S')],
    cards: [st('tri', 5, C.orange, 'S'), st('circle', 5, C.white, 'M'), st('circle', 8, C.white, 'L')],
    cardsPlaced: false, palette: 'fixed', editable: [],
    accept: { orderMatters: [[1, 2]] },
    feedback: { 'order:2': '흰 얼굴은 잘 놓았어. 주황 코를 나중에 찍어 볼까?' },
  },
  {
    id: 'shape-14', num: 14, chapter: 'shape-order', title: '물고기', icon: '🐟', concept: 'overlap',
    description: '주황 몸통에 흰 눈, 파랑 꼬리를 붙여 물고기를 만들어요.',
    story: '꼬리는 몸통과 안 겹쳐. 안 겹치는 도형은 언제 찍어도 그림이 같아!',
    hint: '주황 마름모(몸통)를 흰 눈보다 먼저! 꼬리는 아무 때나 괜찮아.',
    success: '물고기가 헤엄쳐!',
    target: [st('rhombus', 5, C.orange, 'L'), st('circle', 5, C.white, 'S'), st('tri', 4, C.blue, 'M')],
    cards: [st('circle', 5, C.white, 'S'), st('tri', 4, C.blue, 'M'), st('rhombus', 5, C.orange, 'L')],
    cardsPlaced: false, palette: 'fixed', editable: [],
    accept: { orderMatters: [[0, 1]] },
    feedback: { 'order:1': '주황 몸통은 잘 놓았어. 흰 눈을 나중에 찍어 볼까?' },
  },

  // ── 도형 마법사: 한 번에 한 가지 속성 ──
  {
    id: 'shape-9', num: 9, chapter: 'shape-edit', title: '집 색칠하기', icon: '🎨', concept: 'color',
    description: '회색 집에 색을 칠해요. 몸통은 갈색, 지붕은 빨강!',
    story: '카드를 누르고 색을 골라 봐. 여러 번 바꿔 보고 "완료"를 눌러.',
    hint: '네모는 갈색, 세모는 빨강으로!',
    success: '알록달록 집이 됐어!',
    target: [st('rect', 5, C.brown, 'L'), st('tri', 5, C.red, 'L')],
    cards: [st('rect', 5, C.gray, 'L'), st('tri', 5, C.gray, 'L')],
    cardsPlaced: true, palette: 'fixed', editable: ['color'],
    accept: { orderMatters: [[0, 1]] },
    feedback: { 'color:0': '네모 카드를 눌러 갈색으로 칠해 볼까?', 'color:1': '세모 카드를 눌러 빨강으로 칠해 볼까?' },
  },
  {
    id: 'shape-10', num: 10, chapter: 'shape-edit', title: '과녁 크기', icon: '🎯', concept: 'size',
    description: '두 원의 크기가 같아서 빨강이 안 보여요. 빨강 원을 크게 바꿔요.',
    story: '크기를 바꾸면 아래에 있던 도형이 다시 보여!',
    hint: '빨강 원을 "크게"로 바꿔 봐.',
    success: '과녁이 다시 보여!',
    target: [st('circle', 5, C.red, 'L'), st('circle', 5, C.white, 'M')],
    cards: [st('circle', 5, C.red, 'M'), st('circle', 5, C.white, 'M')],
    cardsPlaced: true, palette: 'fixed', editable: ['size'],
    accept: { orderMatters: [[0, 1]] },
    feedback: { 'size:0': '빨강 동그라미 카드를 눌러 "크게"로 바꿔 볼까?', 'size:1': '흰 동그라미는 "중간"이 딱 맞아.' },
  },
  {
    id: 'shape-11', num: 11, chapter: 'shape-edit', title: '로켓 불꽃', icon: '🔥', concept: 'anchor',
    description: '불꽃이 머리에 붙어 있어요. 불꽃을 로켓 아래로 옮겨요.',
    story: '위치 칸을 누르면 도형이 그 자리로 가.',
    hint: '주황 세모를 "아래" 칸으로!',
    success: '불꽃을 뿜으며 날아간다!',
    target: [st('rect', 5, C.blue, 'L'), st('tri', 5, C.red, 'M'), st('tri', 8, C.orange, 'M')],
    cards: [st('rect', 5, C.blue, 'L'), st('tri', 5, C.red, 'M'), st('tri', 5, C.orange, 'M')],
    cardsPlaced: true, palette: 'fixed', editable: ['anchor'],
    accept: { orderMatters: [[0, 1], [0, 2]] },
    feedback: { 'anchor:2': '주황 불꽃 카드를 눌러 "아래" 칸으로 옮겨 볼까?' },
  },
  {
    id: 'shape-12', num: 12, chapter: 'shape-edit', title: '꽃 마법사', icon: '✨', concept: 'order',
    description: '마지막 도전! 도형을 골라 목표 꽃을 스스로 만들어요.',
    story: '모양·색·크기·자리·순서를 모두 네가 정해!',
    hint: '기둥 → 큰 꽃잎 → 작은 꽃잎 → 가운데 꽃술 순서!',
    success: '넌 진짜 도형 마법사야!',
    target: [st('rect', 8, C.green, 'S'), st('rhombus', 5, C.red, 'L'), st('rhombus', 5, C.red, 'M'), st('circle', 5, C.yellow, 'S')],
    cards: [],
    cardsPlaced: true, palette: 'shapes', editable: ['shape', 'anchor', 'color', 'size'],
    accept: { orderMatters: [[1, 3], [2, 3]] },
    feedback: {},
  },
];

export function getShapeMission(id) { return SHAPE_MISSIONS.find(m => m.id === id) || null; }

/** 도형 팔레트('shapes')의 기본 카드 */
export const SHAPE_PALETTE = [
  st('rect', 5, C.brown, 'M'), st('tri', 5, C.red, 'M'), st('circle', 5, C.yellow, 'M'), st('rhombus', 5, C.blue, 'M'),
];
