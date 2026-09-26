// 픽셀 미션 — v1 PIXEL_MISSIONS 18개 + PIXEL_CHAPTERS + PIXEL_STORY 이관(목표 격자·문구 그대로).
//
// v1에는 정답 DSL이 없어 새로 썼다(answers). 좌표는 1부터(x 가로, y 세로).
// 채점: grade.js gradePixel — 칸 단위 정확 비교(켜짐/꺼짐). v1은 90% 일치로 성공 처리해 빈 격자도 96%가 나왔다.
// 9번(버튼 이벤트)은 v1에 목표 격자가 없던 미션이다 → events 검사(버튼 A=하트, B=엑스)로 채점한다.

const grid = n => Array.from({ length: n }, () => Array(n).fill(0));
const L = (...a) => a.join('\n');

export const PIXEL_CHAPTERS = [
  { id: 'pixel-5', key: '5×5', icon: '🏘️', title: '픽셀 마을', story: '정전이 된 픽셀 마을! 로봇 픽셀과 함께 LED 불빛을 하나씩 되살리자.' },
  { id: 'pixel-8', key: '8×8', icon: '🌆', title: '네온 도시', story: '화면이 커진 네온 도시! 8×8 전광판의 규칙을 찾아 불을 밝히자.' },
  { id: 'pixel-16', key: '16×16', icon: '🌌', title: '은하 전광판', story: '우주에서도 보이는 거대 전광판! 큰 그림도 규칙만 알면 문제없어.' },
  { id: 'pixel-free', key: '자유', icon: '🎨', title: '자유 아틀리에', story: '네 마음대로 그리는 화가의 방! 상상하는 그림을 픽셀에게 말해 봐.' },
];

// 16×16 얼굴 목표(v1과 같은 계산)
function faceTarget() {
  const g = grid(16);
  const cx = 7.5, cy = 7.5, r = 7;
  for (let a = 0; a < 360; a += 5) { const x = Math.round(cx + r * Math.cos(a * Math.PI / 180)), y = Math.round(cy + r * Math.sin(a * Math.PI / 180)); if (x >= 0 && x < 16 && y >= 0 && y < 16) g[y][x] = 1; }
  g[5][4] = 1; g[5][5] = 1; g[6][4] = 1; g[6][5] = 1;
  g[5][10] = 1; g[5][11] = 1; g[6][10] = 1; g[6][11] = 1;
  g[8][7] = 1; g[8][8] = 1;
  for (let x = 4; x <= 11; x++) g[11][x] = 1; g[10][3] = 1; g[10][12] = 1;
  return g;
}
// 얼굴 윤곽: 원 공식을 그대로 좌표 목록으로 (정답 DSL은 LED_ON 줄로 적는다)
function circleOutlineLines() {
  const seen = new Set(); const out = [];
  for (let a = 0; a < 360; a += 5) {
    const x = Math.round(7.5 + 7 * Math.cos(a * Math.PI / 180)), y = Math.round(7.5 + 7 * Math.sin(a * Math.PI / 180));
    const k = x + ',' + y; if (seen.has(k)) continue; seen.add(k); out.push(`LED_ON ${x + 1} ${y + 1}`);
  }
  return out;
}
const FACE_PARTS = ['RECT 5 6 6 7', 'RECT 11 6 12 7', 'LED_ON 8 9', 'LED_ON 9 9', 'RECT 5 12 12 12', 'LED_ON 4 11', 'LED_ON 13 11'];
const antiDiag = n => Array.from({ length: n }, (_, i) => `LED_ON ${n - i} ${i + 1}`);

const RAW = [
  { id: 1, title: '점 하나', level: '5×5 기초', gridSize: 5, hint: '어디에 불이 켜졌는지 좌표를 관찰하세요.',
    targetGrid: [[0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [0, 0, 1, 0, 0], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0]],
    answers: ['LED_ON 3 3'], wrong: ['LED_ON 2 3', ''] },
  { id: 2, title: '가로줄', level: '5×5 기초', gridSize: 5, hint: '어떤 행이 켜졌나요? 반복을 활용해 보세요.',
    targetGrid: [[0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [1, 1, 1, 1, 1], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0]],
    answers: [L('FOR x 1 5 {', 'LED_ON x 3', '}'), 'FILL_ROW 3'], wrong: [L('FOR x 1 5 {', 'LED_ON x 2', '}'), L('FOR x 1 4 {', 'LED_ON x 3', '}')] },
  { id: 3, title: '대각선', level: '5×5 기초', gridSize: 5, hint: 'x와 y 좌표 사이에 규칙이 있어요.',
    targetGrid: [[1, 0, 0, 0, 0], [0, 1, 0, 0, 0], [0, 0, 1, 0, 0], [0, 0, 0, 1, 0], [0, 0, 0, 0, 1]],
    answers: [L('FOR i 1 5 {', 'LED_ON i i', '}')], wrong: [L('FOR i 1 4 {', 'LED_ON i i', '}'), antiDiag(5).join('\n')] },
  { id: 4, title: '십자가', level: '5×5 기초', gridSize: 5, hint: '가로줄 하나와 세로줄 하나가 겹쳐있어요.',
    targetGrid: [[0, 0, 1, 0, 0], [0, 0, 1, 0, 0], [1, 1, 1, 1, 1], [0, 0, 1, 0, 0], [0, 0, 1, 0, 0]],
    answers: [L('FOR i 1 5 {', 'LED_ON i 3', 'LED_ON 3 i', '}')], wrong: [L('FOR i 1 5 {', 'LED_ON i 3', '}')] },
  { id: 5, title: '하트', level: '5×5 패턴', gridSize: 5, hint: '위쪽은 두 봉우리, 아래로 갈수록 좁아져요.',
    targetGrid: [[0, 1, 0, 1, 0], [1, 1, 1, 1, 1], [1, 1, 1, 1, 1], [0, 1, 1, 1, 0], [0, 0, 1, 0, 0]],
    answers: [L('LED_ON 2 1', 'LED_ON 4 1', 'FILL_ROW 2 #ff0000', 'FILL_ROW 3 #ff0000', 'RECT 2 4 4 4 #ff0000', 'LED_ON 3 5'), 'SHOW_ICON HEART'], wrong: ['SHOW_ICON SMILEY', L('FILL_ROW 2', 'FILL_ROW 3')] },
  { id: 6, title: '웃는 얼굴', level: '5×5 패턴', gridSize: 5, hint: '눈 위치와 입 모양을 관찰하세요.',
    targetGrid: [[0, 0, 0, 0, 0], [0, 1, 0, 1, 0], [0, 0, 0, 0, 0], [1, 0, 0, 0, 1], [0, 1, 1, 1, 0]],
    answers: [L('LED_ON 2 2', 'LED_ON 4 2', 'LED_ON 1 4', 'LED_ON 5 4', 'FOR x 2 4 {', 'LED_ON x 5', '}')], wrong: ['SHOW_ICON SAD'] },
  { id: 7, title: '테두리', level: '5×5 반복', gridSize: 5, hint: '가장자리만 켜져 있어요. 한 줄씩 다 말하는 대신 반복 블록을 써 보세요.',
    targetGrid: [[1, 1, 1, 1, 1], [1, 0, 0, 0, 1], [1, 0, 0, 0, 1], [1, 0, 0, 0, 1], [1, 1, 1, 1, 1]],
    answers: [L('FOR i 1 5 {', 'LED_ON i 1', 'LED_ON i 5', 'LED_ON 1 i', 'LED_ON 5 i', '}')], wrong: ['FILL_ALL', L('FOR i 1 5 {', 'LED_ON i 1', 'LED_ON i 5', '}')] },
  { id: 8, title: '체크무늬', level: '5×5 반복', gridSize: 5, hint: '켜진 곳과 꺼진 곳의 좌표에 규칙이 있어요.',
    targetGrid: [[1, 0, 1, 0, 1], [0, 1, 0, 1, 0], [1, 0, 1, 0, 1], [0, 1, 0, 1, 0], [1, 0, 1, 0, 1]],
    // 모두 켠 뒤 2·4번째 세로줄과 2·4번째 가로줄을 뒤집으면 x+y가 짝수인 칸만 남는다
    answers: [L('FILL_ALL', 'FOR y 1 5 {', 'LED_TOGGLE 2 y', 'LED_TOGGLE 4 y', '}', 'FOR x 1 5 {', 'LED_TOGGLE x 2', 'LED_TOGGLE x 4', '}')],
    // 세로줄만 뒤집으면 줄무늬가 된다
    wrong: [L('FILL_ALL', 'FOR y 1 5 {', 'LED_TOGGLE 2 y', 'LED_TOGGLE 4 y', '}')] },
  { id: 9, title: '버튼 이벤트', level: '5×5 조건', gridSize: 5, description: '버튼 A → 하트, 버튼 B → 엑스가 나오게 해보세요!',
    hint: '"ON_BUTTON_A { SHOW_ICON HEART }"처럼 버튼마다 할 일을 적어 보세요.',
    targetGrid: null, events: [{ press: 'A', icon: 'HEART' }, { press: 'B', icon: 'X' }],
    answers: [L('ON_BUTTON_A {', 'SHOW_ICON HEART', '}', 'ON_BUTTON_B {', 'SHOW_ICON X', '}')],
    wrong: [L('ON_BUTTON_A {', 'SHOW_ICON X', '}', 'ON_BUTTON_B {', 'SHOW_ICON HEART', '}'), 'SHOW_ICON HEART'] },
  { id: 10, title: '가로줄 8칸', level: '8×8 기초', gridSize: 8, hint: '가운데 행을 관찰하세요. 격자가 커졌어요!',
    targetGrid: (() => { const g = grid(8); for (let x = 0; x < 8; x++) g[4][x] = 1; return g; })(),
    answers: [L('FOR x 1 8 {', 'LED_ON x 5', '}')], wrong: [L('FOR x 1 8 {', 'LED_ON x 4', '}')] },
  { id: 11, title: 'X자', level: '8×8 기초', gridSize: 8, hint: '두 대각선이 겹쳐있어요.',
    targetGrid: (() => { const g = grid(8); for (let i = 0; i < 8; i++) { g[i][i] = 1; g[i][7 - i] = 1; } return g; })(),
    answers: [L('FOR i 1 8 {', 'LED_ON i i', '}', ...antiDiag(8))], wrong: [L('FOR i 1 8 {', 'LED_ON i i', '}')] },
  { id: 12, title: '테두리 8×8', level: '8×8 반복', gridSize: 8, hint: '5×5 테두리와 같은 원리지만 크기가 달라요.',
    targetGrid: (() => { const g = grid(8); for (let i = 0; i < 8; i++) { g[0][i] = 1; g[7][i] = 1; g[i][0] = 1; g[i][7] = 1; } return g; })(),
    answers: [L('FOR i 1 8 {', 'LED_ON i 1', 'LED_ON i 8', 'LED_ON 1 i', 'LED_ON 8 i', '}')], wrong: [L('FOR i 1 5 {', 'LED_ON i 1', 'LED_ON i 5', 'LED_ON 1 i', 'LED_ON 5 i', '}')] },
  { id: 13, title: '사각 나선', level: '8×8 패턴', gridSize: 8, hint: '바깥 테두리와 안쪽 테두리가 겹쳐있어요.',
    targetGrid: (() => { const g = grid(8); for (let i = 0; i < 8; i++) { g[0][i] = 1; g[7][i] = 1; g[i][0] = 1; g[i][7] = 1; } for (let i = 2; i < 6; i++) { g[2][i] = 1; g[5][i] = 1; g[i][2] = 1; g[i][5] = 1; } return g; })(),
    answers: [L('DEF 테두리 {', 'LED_ON i 1', 'LED_ON i 8', 'LED_ON 1 i', 'LED_ON 8 i', '}', 'FOR i 1 8 {', 'CALL 테두리', '}', 'FOR i 3 6 {', 'LED_ON i 3', 'LED_ON i 6', 'LED_ON 3 i', 'LED_ON 6 i', '}')],
    wrong: [L('FOR i 1 8 {', 'LED_ON i 1', 'LED_ON i 8', 'LED_ON 1 i', 'LED_ON 8 i', '}')] },
  { id: 14, title: '화살표', level: '8×8 패턴', gridSize: 8, hint: '위쪽 삼각형과 아래쪽 직사각형이 합쳐져 있어요.',
    targetGrid: (() => { const g = grid(8); g[0][3] = 1; g[0][4] = 1; g[1][2] = 1; g[1][3] = 1; g[1][4] = 1; g[1][5] = 1; g[2][1] = 1; g[2][2] = 1; g[2][3] = 1; g[2][4] = 1; g[2][5] = 1; g[2][6] = 1; for (let y = 3; y < 8; y++) { g[y][3] = 1; g[y][4] = 1; } return g; })(),
    answers: [L('RECT 4 1 5 1', 'RECT 3 2 6 2', 'RECT 2 3 7 3', 'RECT 4 4 5 8')], wrong: ['RECT 4 1 5 8'] },
  { id: 15, title: '큰 하트', level: '16×16', gridSize: 16, hint: '5×5 하트를 크게 확대한 모양이에요.',
    targetGrid: (() => {
      const g = grid(16);
      const pts = [[2, 1], [3, 1], [4, 1], [5, 1], [9, 1], [10, 1], [11, 1], [12, 1],
        [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [8, 2], [9, 2], [10, 2], [11, 2], [12, 2], [13, 2],
        [1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [8, 3], [9, 3], [10, 3], [11, 3], [12, 3], [13, 3],
        [1, 4], [2, 4], [3, 4], [4, 4], [5, 4], [6, 4], [7, 4], [8, 4], [9, 4], [10, 4], [11, 4], [12, 4], [13, 4],
        [2, 5], [3, 5], [4, 5], [5, 5], [6, 5], [7, 5], [8, 5], [9, 5], [10, 5], [11, 5], [12, 5],
        [3, 6], [4, 6], [5, 6], [6, 6], [7, 6], [8, 6], [9, 6], [10, 6], [11, 6],
        [4, 7], [5, 7], [6, 7], [7, 7], [8, 7], [9, 7], [10, 7],
        [5, 8], [6, 8], [7, 8], [8, 8], [9, 8],
        [6, 9], [7, 9], [8, 9],
        [7, 10]];
      for (const [x, y] of pts) if (y < 16 && x < 16) g[y][x] = 1; return g;
    })(),
    answers: [L('RECT 3 2 6 2', 'RECT 10 2 13 2', 'RECT 2 3 7 3', 'RECT 9 3 14 3', 'RECT 2 4 14 5', 'RECT 3 6 13 6', 'RECT 4 7 12 7', 'RECT 5 8 11 8', 'RECT 6 9 10 9', 'RECT 7 10 9 10', 'LED_ON 8 11')],
    wrong: [L('RECT 3 2 6 2', 'RECT 10 2 13 2', 'RECT 2 3 7 3', 'RECT 9 3 14 3', 'RECT 2 4 14 5', 'RECT 3 6 13 6', 'RECT 4 7 12 7', 'RECT 5 8 11 8', 'RECT 6 9 10 9', 'RECT 7 10 9 10'), 'SHOW_ICON HEART'] },
  { id: 16, title: '큰 별', level: '16×16', gridSize: 16, hint: '가운데에서 바깥으로 뻗어나가는 모양이에요.',
    targetGrid: (() => { const g = grid(16); for (let i = 0; i < 16; i++) { g[7][i] = 1; g[8][i] = 1; g[i][7] = 1; g[i][8] = 1; } for (let i = 0; i < 16; i++) { g[i][i] = 1; g[i][15 - i] = 1; } return g; })(),
    answers: [L('FILL_ROW 8', 'FILL_ROW 9', 'FILL_COL 8', 'FILL_COL 9', 'FOR i 1 16 {', 'LED_ON i i', '}', ...antiDiag(16))],
    wrong: [L('FILL_ROW 8', 'FILL_ROW 9', 'FILL_COL 8', 'FILL_COL 9')] },
  { id: 17, title: '얼굴', level: '16×16', gridSize: 16, hint: '동그란 얼굴에 눈, 코, 입이 있어요.',
    targetGrid: faceTarget(),
    answers: [L(...circleOutlineLines(), ...FACE_PARTS)], wrong: [L(...circleOutlineLines(), ...FACE_PARTS.slice(0, 4))] },
  { id: 18, title: '자유 창작', level: '자유', gridSize: 5, description: '자유롭게 그려보세요! 🎨', hint: '칸을 눌러 칠하거나 명령을 써 보세요.',
    targetGrid: null, free: true, answers: ['SHOW_ICON SMILEY'], wrong: [''] },
];

const STORY = {
  1: { story: '깜깜한 마을에 첫 가로등을 켜자! 한가운데 칸이 어디인지 찾아봐.', math: '좌표 (x, y): x는 가로(→), y는 세로(↓)! 첫 칸이 (1,1)이에요.' },
  2: { story: '큰길을 밝히자! 한 줄을 통째로 켜야 해.', math: '같은 y줄에서 x만 1→5로 변해요. 한 줄 전체 = 반복의 힘!' },
  3: { story: '언덕길 조명을 켜자! 비스듬한 줄이야.', math: '규칙 발견: x와 y가 같은 칸! (1,1), (2,2), (3,3)…' },
  4: { story: '마을 병원의 십자 표시등을 복구해 줘!', math: '가로줄 하나 + 세로줄 하나 = 십자! 두 줄이 겹치는 칸은 어디일까요?' },
  5: { story: '마을 사람들에게 사랑의 불빛을! 하트를 켜 줘.', math: '하트는 좌우 대칭! 왼쪽 절반만 알면 오른쪽도 알 수 있어요.' },
  6: { story: '마을 광장에 웃음을 되찾아 주자!', math: '두 눈 (2,2)와 (4,2)는 가운데를 기준으로 대칭인 위치예요!' },
  7: { story: '마을 성벽의 테두리 조명을 모두 켜자!', math: '테두리 = x가 1 또는 5이거나, y가 1 또는 5인 칸!' },
  8: { story: '광장 바닥을 체크무늬로 꾸미자!', math: 'x+y가 짝수인 칸만 켜져요. 홀수·짝수의 규칙!' },
  9: { story: '마을 신호등을 만들자! 버튼에 따라 다른 불빛이 나와야 해.', math: '이벤트: "~하면 ~한다" — 조건과 결과를 연결하는 코딩의 핵심!' },
  10: { story: '네온 도시의 중앙 대로를 밝히자! 화면이 커졌어.', math: '격자가 8×8로 커져도 규칙은 같아요. 가운데 줄은 몇 번일까요?' },
  11: { story: '도시의 보물 표시 X를 그려 줘!', math: '두 대각선: x=y인 칸과 x+y=9인 칸이 겹쳐요!' },
  12: { story: '도시 성벽 테두리를 복구하자!', math: '5×5 테두리와 같은 규칙, 끝 번호만 8로 바뀌었어요!' },
  13: { story: '비밀 미로의 이중 테두리를 켜야 문이 열려!', math: '테두리 속의 테두리! 같은 규칙이 크기만 다르게 반복돼요.' },
  14: { story: '하늘을 가리키는 네온 화살표를 만들어 줘!', math: '위쪽은 점점 넓어지는 삼각형, 아래쪽은 직사각형 기둥!' },
  15: { story: '은하 전광판에 거대 하트를 쏘아 올리자!', math: '작은 하트를 확대한 모양! 크기가 커져도 모양의 규칙은 같아요(닮음).' },
  16: { story: '우주에서 빛나는 큰 별을 그려 줘!', math: '십자(+)와 대각선(×)을 겹치면 별이 돼요!' },
  17: { story: '전광판에 웃는 얼굴을 띄워 우주에 인사하자!', math: '원은 중심에서 같은 거리에 있는 점들의 모임이에요!' },
  18: { story: '자유 아틀리에에 온 걸 환영해! 상상하는 그림을 말해 봐.', math: '좌표, 대칭, 반복… 배운 규칙을 모두 써 볼 수 있어요.' },
};

// v1 pixelChapterKey: 16→16×16, 8→8×8, 18(자유)→자유, 나머지 5×5
const chapterOf = m => (m.gridSize === 16 ? 'pixel-16' : m.gridSize === 8 ? 'pixel-8' : m.free ? 'pixel-free' : 'pixel-5');
const ICON = { 'pixel-5': '🏘️', 'pixel-8': '🌆', 'pixel-16': '🌌', 'pixel-free': '🎨' };

export const PIXEL_MISSIONS = RAW.map(m => ({
  id: 'pixel-' + m.id,
  legacyId: m.id,
  mode: 'pixel',
  chapter: chapterOf(m),
  level: m.level,
  icon: ICON[chapterOf(m)],
  title: m.title,
  description: m.description || '시연을 보고 똑같이 만들어 보세요!',
  hint: m.hint,
  story: STORY[m.id].story,
  tip: STORY[m.id].math,
  gridSize: m.gridSize,
  targetGrid: m.targetGrid,
  events: m.events || null,
  free: !!m.free,
  success: m.free ? '멋진 작품이야!' : `${m.title} 완성! 불빛이 목표와 똑같아.`,
  answers: m.answers,
  wrong: m.wrong,
}));

export const PIXEL_CHIPS = [
  { label: '불 켜기', code: 'LED_ON 3 3' },
  { label: '불 끄기', code: 'LED_OFF 3 3' },
  { label: '한 줄 켜기', code: 'FILL_ROW 3' },
  { label: '세로줄 켜기', code: 'FILL_COL 3' },
  { label: '네모 칠하기', code: 'RECT 2 2 4 4' },
  { label: 'x를 1~5 반복', code: 'FOR x 1 5 {\nLED_ON x 1\n}' },
  { label: '반복 3번', code: 'REPEAT 3 {\n\n}', caret: 11 },
  { label: '깜빡이기', code: 'BLINK 3 3 3' },
  { label: '버튼 A', code: 'ON_BUTTON_A {\nSHOW_ICON HEART\n}' },
  { label: '모두 끄기', code: 'CLEAR_ALL' },
];

/** 색 이름(v1 COLORS 10색) */
export const PIXEL_COLORS = [
  { hex: '#FF0000', name: '빨강' }, { hex: '#FF6600', name: '주황' }, { hex: '#FFCC00', name: '노랑' },
  { hex: '#33CC33', name: '초록' }, { hex: '#0099FF', name: '파랑' }, { hex: '#6633FF', name: '보라' },
  { hex: '#FF33CC', name: '분홍' }, { hex: '#FFFFFF', name: '흰색' }, { hex: '#888888', name: '회색' },
];
