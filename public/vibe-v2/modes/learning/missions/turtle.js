// 거북이 미션 — v1 TURTLE_MISSIONS 21개 + TURTLE_CHAPTERS + TURTLE_STORY 이관(순서·문구·목표 DSL·허용 오차 그대로).
//
// 필드: id 'turtle-<v1 id>' (저장·진도 키, 바꾸지 않음) · legacyId · chapter · title · level · description · hint
//   story · math(오늘의 정리) · target(v1 targetDSL) · tolerance · free(자유 창작)
//   answers: 정답 DSL(목표와 다른 모양의 동등 정답 — 풀어 쓰기·좌우 거울) · wrong: 알려진 오답(미션 의도상 틀림)
// 채점: grade.js gradeTurtle — v1 turtlePathSimilarity(거울 인정, 0.8 이상) + 모자란 선 검사 + 색 미션은 색 비교.

export const TURTLE_CHAPTERS = [
  { id: 'turtle-3-1', key: '3-1', icon: '🌱', title: '새싹 행성', story: '선분·직각·사각형이 사라진 새싹 행성! 기본 도형을 되살려 마을을 밝히자. (3-1 평면도형 연계)' },
  { id: 'turtle-4', key: '4학년', icon: '🔷', title: '크리스탈 행성', story: '세모 크리스탈이 산산조각 났어! 여러 가지 삼각형의 비밀을 찾아 복구하자. (4학년 각도·삼각형 연계)' },
  { id: 'turtle-4-2', key: '4-2', icon: '🧩', title: '퍼즐 행성', story: '사각형과 다각형 퍼즐이 흩어졌어! 조각을 맞춰 성문을 열자. (4-2 사각형·다각형 연계)' },
  { id: 'turtle-5', key: '5학년', icon: '🪞', title: '거울 행성', story: '반쪽이 사라진 거울 행성! 대칭과 색의 규칙으로 원래 모습을 찾자. (5학년 대칭·규칙 연계)' },
  { id: 'turtle-challenge', key: '도전', icon: '🌋', title: '용암 행성', story: '가장 뜨거운 시련의 행성! 배운 모든 것을 합쳐 별을 띄워라.' },
  { id: 'turtle-free', key: '자유', icon: '🌈', title: '무지개 행성', story: '무엇이든 그릴 수 있는 상상의 행성! 너만의 작품을 남겨줘.' },
];

const DESC = '시연을 보고 똑같이 만들어 보세요!';
const lines = (...a) => a.join('\n');
const rep = (n, ...body) => `REPEAT ${n} {\n${body.join('\n')}\n}`;
const unroll = (n, ...body) => Array.from({ length: n }, () => body.join('\n')).join('\n');

const RAW = [
  { id: 1, level: '3-1', title: '선분 긋기', hint: '거북이를 앞으로 보내면 돼요. 얼마나 갈까요?', target: 'FORWARD 100', tolerance: 15,
    answers: [lines('FORWARD 50', 'FORWARD 50')], wrong: ['FORWARD 40', lines('RIGHT 90', 'FORWARD 100')] },
  { id: 2, level: '3-1', title: '직각', hint: '거북이가 꺾이는 각도를 잘 관찰해 보세요.', target: 'FORWARD 100\nRIGHT 90\nFORWARD 100', tolerance: 15,
    answers: [lines('FORWARD 100', 'LEFT 90', 'FORWARD 100')], wrong: [lines('FORWARD 100', 'RIGHT 45', 'FORWARD 100')] },
  { id: 3, level: '3-1', title: '직사각형', hint: '변의 길이가 두 종류예요. 각각 얼마인지 관찰해 보세요.', target: 'REPEAT 2 {\nFORWARD 120\nRIGHT 90\nFORWARD 80\nRIGHT 90\n}', tolerance: 15,
    answers: [unroll(2, 'FORWARD 120', 'RIGHT 90', 'FORWARD 80', 'RIGHT 90')], wrong: [rep(4, 'FORWARD 100', 'RIGHT 90')] },
  { id: 4, level: '3-1', title: '정사각형', hint: '모든 변의 길이와 각도가 같아요. 반복을 활용해 보세요.', target: 'REPEAT 4 {\nFORWARD 100\nRIGHT 90\n}', tolerance: 15,
    answers: [unroll(4, 'FORWARD 100', 'RIGHT 90'), rep(4, 'FORWARD 100', 'LEFT 90')], wrong: [rep(3, 'FORWARD 100', 'RIGHT 90'), rep(2, 'FORWARD 100', 'RIGHT 90')] },
  { id: 7, level: '3-1', title: '직각삼각형', hint: '내각 중 하나가 특별해요. 무슨 각도일까요?', target: 'FORWARD 100\nLEFT 90\nFORWARD 80\nLEFT 129\nFORWARD 128', tolerance: 25,
    answers: [lines('FORWARD 100', 'RIGHT 90', 'FORWARD 80', 'RIGHT 129', 'FORWARD 128')], wrong: [lines('FORWARD 100', 'LEFT 90', 'FORWARD 80')] },
  { id: 5, level: '4학년', title: '정삼각형', hint: '변의 길이와 내각을 관찰하세요. 반복이 가능할까요?', target: 'REPEAT 3 {\nFORWARD 100\nRIGHT 120\n}', tolerance: 15,
    answers: [rep(3, 'FORWARD 100', 'LEFT 120')], wrong: [rep(3, 'FORWARD 100', 'RIGHT 90')] },
  { id: 6, level: '4학년', title: '이등변삼각형', hint: '변의 길이가 다 같지는 않아요. 각도도 잘 보세요.', target: 'FORWARD 120\nLEFT 127\nFORWARD 100\nLEFT 106\nFORWARD 100', tolerance: 20,
    answers: [lines('FORWARD 120', 'RIGHT 127', 'FORWARD 100', 'RIGHT 106', 'FORWARD 100')], wrong: [lines('FORWARD 120', 'LEFT 90', 'FORWARD 100')] },
  { id: 8, level: '4학년', title: '예각삼각형', hint: '세 각이 모두 90°보다 작아요. 그런데 세 변의 길이가 다 달라요!', target: 'FORWARD 115\nRIGHT 120\nFORWARD 141\nRIGHT 130\nFORWARD 130', tolerance: 25,
    answers: [lines('FORWARD 115', 'LEFT 120', 'FORWARD 141', 'LEFT 130', 'FORWARD 130')], wrong: [lines('FORWARD 115', 'RIGHT 90', 'FORWARD 141')] },
  { id: 9, level: '4학년', title: '둔각삼각형', hint: '내각 중 하나가 90°보다 커요. 시연에서 확인해 보세요.', target: 'FORWARD 100\nRIGHT 60\nFORWARD 100\nRIGHT 150\nFORWARD 173', tolerance: 25,
    answers: [lines('FORWARD 100', 'LEFT 60', 'FORWARD 100', 'LEFT 150', 'FORWARD 173')], wrong: [rep(3, 'FORWARD 100', 'RIGHT 120')] },
  { id: 10, level: '4-2', title: '평행사변형', hint: '마주보는 변끼리 길이가 같아요. 각도도 쌍으로 나타나요.', target: 'REPEAT 2 {\nFORWARD 120\nRIGHT 60\nFORWARD 80\nRIGHT 120\n}', tolerance: 20,
    answers: [unroll(2, 'FORWARD 120', 'RIGHT 60', 'FORWARD 80', 'RIGHT 120')], wrong: [rep(2, 'FORWARD 120', 'RIGHT 90', 'FORWARD 80', 'RIGHT 90')] },
  { id: 11, level: '4-2', title: '마름모', hint: '변의 길이를 잘 보세요. 평행사변형과 어떻게 다를까요?', target: 'REPEAT 2 {\nFORWARD 100\nRIGHT 60\nFORWARD 100\nRIGHT 120\n}', tolerance: 20,
    answers: [rep(2, 'FORWARD 100', 'LEFT 60', 'FORWARD 100', 'LEFT 120')], wrong: [rep(4, 'FORWARD 100', 'RIGHT 90')] },
  { id: 12, level: '4-2', title: '사다리꼴', hint: '평행한 변이 몇 쌍인지 세어 보세요.', target: 'FORWARD 120\nLEFT 120\nFORWARD 60\nLEFT 60\nFORWARD 60\nLEFT 60\nFORWARD 60', tolerance: 20,
    answers: [lines('FORWARD 120', 'RIGHT 120', 'FORWARD 60', 'RIGHT 60', 'FORWARD 60', 'RIGHT 60', 'FORWARD 60')], wrong: [lines('FORWARD 120', 'LEFT 120', 'FORWARD 60'), rep(4, 'FORWARD 60', 'LEFT 90')] },
  { id: 13, level: '4-2', title: '정오각형', hint: '변이 몇 개인지 세고, 외각의 합은 항상 360°예요.', target: 'REPEAT 5 {\nFORWARD 80\nRIGHT 72\n}', tolerance: 15,
    answers: [unroll(5, 'FORWARD 80', 'RIGHT 72')], wrong: [rep(6, 'FORWARD 80', 'RIGHT 60')] },
  { id: 14, level: '4-2', title: '정육각형', hint: '변이 몇 개인지 세고, 외각의 합은 항상 360°예요.', target: 'REPEAT 6 {\nFORWARD 70\nRIGHT 60\n}', tolerance: 15,
    answers: [rep(6, 'FORWARD 70', 'LEFT 60')], wrong: [rep(5, 'FORWARD 70', 'RIGHT 72')] },
  { id: 15, level: '5학년', title: '선대칭 도형', hint: '좌우 색이 다른 대칭 모양이에요. 어디서 색이 바뀌나요?', target: 'PEN_COLOR #ff0000\nFORWARD 80\nRIGHT 140\nFORWARD 80\nRIGHT 100\nFORWARD 50\nRIGHT 120\nPEN_COLOR #0000ff\nFORWARD 50\nRIGHT 100\nFORWARD 80\nRIGHT 140\nFORWARD 80', tolerance: 25,
    answers: [lines('PEN_COLOR #FF0000', 'FORWARD 80', 'LEFT 140', 'FORWARD 80', 'LEFT 100', 'FORWARD 50', 'LEFT 120', 'PEN_COLOR #0000FF', 'FORWARD 50', 'LEFT 100', 'FORWARD 80', 'LEFT 140', 'FORWARD 80')],
    wrong: [lines('FORWARD 80', 'RIGHT 140', 'FORWARD 80', 'RIGHT 100', 'FORWARD 50', 'RIGHT 120', 'FORWARD 50', 'RIGHT 100', 'FORWARD 80', 'RIGHT 140', 'FORWARD 80')] },
  { id: 16, level: '5학년', title: '색 변경 사각형', hint: '매 변마다 색이 달라요. 순서를 기억하세요.', target: 'PEN_COLOR #ff0000\nFORWARD 100\nRIGHT 90\nPEN_COLOR #ffff00\nFORWARD 100\nRIGHT 90\nPEN_COLOR #00cc00\nFORWARD 100\nRIGHT 90\nPEN_COLOR #0000ff\nFORWARD 100\nRIGHT 90', tolerance: 15,
    answers: [lines('PEN_COLOR #ff0000', 'FORWARD 100', 'LEFT 90', 'PEN_COLOR #ffff00', 'FORWARD 100', 'LEFT 90', 'PEN_COLOR #00cc00', 'FORWARD 100', 'LEFT 90', 'PEN_COLOR #0000ff', 'FORWARD 100', 'LEFT 90')],
    wrong: [rep(4, 'FORWARD 100', 'RIGHT 90'), lines('PEN_COLOR #0000ff', 'FORWARD 100', 'RIGHT 90', 'PEN_COLOR #00cc00', 'FORWARD 100', 'RIGHT 90', 'PEN_COLOR #ffff00', 'FORWARD 100', 'RIGHT 90', 'PEN_COLOR #ff0000', 'FORWARD 100', 'RIGHT 90')] },
  { id: 17, level: '도전', title: '별', hint: '꼭짓점이 몇 개인지, 거북이가 몇 도 도는지 관찰하세요.', target: 'REPEAT 5 {\nFORWARD 120\nRIGHT 144\n}', tolerance: 15,
    answers: [unroll(5, 'FORWARD 120', 'RIGHT 144')], wrong: [rep(5, 'FORWARD 120', 'RIGHT 72')] },
  { id: 18, level: '도전', title: '집', hint: '두 가지 도형이 합쳐져 있어요. 각각 어떤 도형일까요?', target: 'REPEAT 4 {\nFORWARD 100\nRIGHT 90\n}\nRIGHT 30\nREPEAT 3 {\nFORWARD 100\nRIGHT 120\n}', tolerance: 20,
    answers: [lines(rep(4, 'FORWARD 100', 'LEFT 90'), 'LEFT 30', rep(3, 'FORWARD 100', 'LEFT 120'))], wrong: [rep(4, 'FORWARD 100', 'RIGHT 90')] },
  { id: 19, level: '도전', title: '무지개 별', hint: '별 모양에 색이 추가됐어요. 색 순서와 각도를 관찰하세요.', target: 'PEN_COLOR #ff0000\nFORWARD 120\nRIGHT 144\nPEN_COLOR #ff8800\nFORWARD 120\nRIGHT 144\nPEN_COLOR #ffff00\nFORWARD 120\nRIGHT 144\nPEN_COLOR #00cc00\nFORWARD 120\nRIGHT 144\nPEN_COLOR #0000ff\nFORWARD 120\nRIGHT 144', tolerance: 15,
    answers: [lines('PEN_COLOR #ff0000', 'FORWARD 120', 'LEFT 144', 'PEN_COLOR #ff8800', 'FORWARD 120', 'LEFT 144', 'PEN_COLOR #ffff00', 'FORWARD 120', 'LEFT 144', 'PEN_COLOR #00cc00', 'FORWARD 120', 'LEFT 144', 'PEN_COLOR #0000ff', 'FORWARD 120', 'LEFT 144')],
    wrong: [rep(5, 'FORWARD 120', 'RIGHT 144')] },
  { id: 20, level: '도전', title: '나선 계단', hint: '각도는 같지만 길이가 달라요. 규칙을 찾아보세요.', target: 'FORWARD 20\nRIGHT 90\nFORWARD 40\nRIGHT 90\nFORWARD 60\nRIGHT 90\nFORWARD 80\nRIGHT 90\nFORWARD 100\nRIGHT 90\nFORWARD 120\nRIGHT 90', tolerance: 20,
    answers: [lines('FORWARD 20', 'LEFT 90', 'FORWARD 40', 'LEFT 90', 'FORWARD 60', 'LEFT 90', 'FORWARD 80', 'LEFT 90', 'FORWARD 100', 'LEFT 90', 'FORWARD 120', 'LEFT 90')], wrong: [rep(6, 'FORWARD 60', 'RIGHT 90')] },
  { id: 21, level: '자유', title: '자유 창작', description: '배운 것을 활용해서 자유롭게 그려보세요! 🎨', hint: '원하는 모양을 명령으로 써 보세요.', target: '', tolerance: 0, free: true,
    answers: [rep(4, 'FORWARD 50', 'RIGHT 90')], wrong: [''] },
];

const STORY = {
  1: { story: '토토가 첫 에너지 길을 놓아야 해. 두 점을 곧게 잇는 빛의 길을 만들어 줘!', math: '두 점을 곧게 이은 선이 선분! 거북이가 100만큼 가면 길이 100인 선분이 생겨요. (끝없이 뻗으면 직선!)' },
  2: { story: '길이 뚝 끊겨 있어! 직각으로 꺾인 다리를 놓아 마을을 이어 줘.', math: '직각은 90°! 거북이가 90° 돌면 길이 직각으로 꺾여요.' },
  3: { story: '에너지 창고의 문이 사라졌어. 직사각형 문을 만들어 줘!', math: '직사각형은 마주 보는 변끼리 길이가 같아요. (긴 변, 짧은 변)이 2번씩!' },
  4: { story: '네 변이 똑같은 마법의 창문이 필요해. 반복의 힘을 쓰면 금방이야!', math: '정사각형: 90°씩 4번 돌면 90×4=360°. 한 바퀴 돌아 제자리로 와요!' },
  5: { story: '크리스탈 첫 조각! 세 변이 모두 똑같은 세모를 깎아 줘.', math: '정삼각형의 안쪽 각은 60°. 그런데 거북이가 도는 각은 180−60=120°!' },
  6: { story: '두 변만 길이가 같은 특별한 세모 조각이 필요해.', math: '이등변삼각형은 두 변의 길이가 같고, 두 밑각의 크기도 같아요.' },
  7: { story: '마을 지붕을 받칠 직각 세모 버팀목이 필요해! 새싹 행성의 마지막 관문이야.', math: '직각삼각형: 한 각이 정확히 90°(직각)인 삼각형이에요!' },
  8: { story: '모든 각이 뾰족한 세모 마법진을 그려야 마법이 발동돼. 이번엔 세 변이 다 달라!', math: '예각삼각형: 세 각(70°, 60°, 50°)이 모두 90°보다 작아요. 변이 달라도 각이 모두 예각이면 예각삼각형!' },
  9: { story: '한 각이 뭉툭한 세모가 성문을 지키고 있어. 똑같이 만들면 통과!', math: '둔각삼각형: 한 각이 90°보다 커요(둔각). 거북이는 바깥쪽 각만큼 돌아요!' },
  10: { story: '기울어진 퍼즐 조각을 찾았어! 마주 보는 변이 평행해.', math: '평행사변형: 이웃한 두 각의 합이 180°예요. (60°+120°=180°)' },
  11: { story: '네 변이 모두 같은 다이아몬드 조각이야. 반짝반짝!', math: '마름모: 네 변의 길이가 모두 같아요. 평행사변형과 무엇이 다를까요?' },
  12: { story: '위아래만 평행한 사다리꼴 조각으로 다리를 완성하자.', math: '사다리꼴: 평행한 변이 한 쌍! 나란한 두 변을 찾아보세요.' },
  13: { story: '다섯 별빛 탑을 세워야 해. 거북이가 도는 각의 비밀을 기억해!', math: '도형을 한 바퀴 돌면 거북이가 돈 각의 합은 꼭 360°! 다섯 번으로 나누면 360÷5=72°씩.' },
  14: { story: '벌집 모양 에너지 셀을 복구하자. 몇 도씩 돌면 될까?', math: '여섯 번 돌아 한 바퀴: 360÷6=60°씩! 변이 많아질수록 조금씩 돌아요.' },
  15: { story: '거울 행성의 반쪽이 사라졌어! 좌우가 똑같은 대칭 무늬를 그려 줘.', math: '선대칭 도형: 접으면 완전히 포개져요. 색이 바뀌는 곳이 대칭축!' },
  16: { story: '네 가지 색 에너지가 도는 사각형 회로를 만들어 줘!', math: '한 변마다 색이 바뀌는 순서(패턴)를 찾는 것도 수학이에요!' },
  17: { story: '용암 위로 별을 띄워라! 거북이가 크게 돌아야 별이 돼.', math: '별은 두 바퀴(720°)를 5번에 나눠 돌아요. 720÷5=144°!' },
  18: { story: '화산 대피소를 짓자! 두 가지 도형을 합치면 집이 돼.', math: '집 = 정사각형(90°×4) + 정삼각형(120°×3)의 조합이에요.' },
  19: { story: '다섯 색깔 별로 용암을 잠재우자!', math: '색은 5가지가 순서대로, 각도는 144°로 일정한 규칙이에요!' },
  20: { story: '하늘로 오르는 나선 계단! 규칙을 찾으면 오를 수 있어.', math: '20, 40, 60, 80… 20씩 커지는 수의 규칙(수열)이에요!' },
  21: { story: '무지개 행성에선 뭐든 그릴 수 있어. 너의 상상을 보여줘!', math: '배운 각도와 길이의 규칙을 마음껏 조합해 보세요.' },
};

const ICON = { '3-1': '🌱', '4학년': '🔷', '4-2': '🧩', '5학년': '🪞', '도전': '🌋', '자유': '🌈' };

export const TURTLE_MISSIONS = RAW.map(m => ({
  id: 'turtle-' + m.id,
  legacyId: m.id,
  mode: 'turtle',
  chapter: TURTLE_CHAPTERS.find(c => c.key === m.level).id,
  level: m.level,
  icon: ICON[m.level],
  title: m.title,
  description: m.description || DESC,
  hint: m.hint,
  story: STORY[m.id].story,
  tip: STORY[m.id].math,
  target: m.target,
  tolerance: m.tolerance,
  free: !!m.free,
  success: m.free ? '멋진 작품이야!' : `${m.title} 완성! 목표와 똑같이 그렸어.`,
  answers: m.answers,
  wrong: m.wrong,
}));

export const TURTLE_CHIPS = [
  { label: '앞으로 100', code: 'FORWARD 100' },
  { label: '뒤로 50', code: 'BACKWARD 50' },
  { label: '오른쪽 90°', code: 'RIGHT 90' },
  { label: '왼쪽 90°', code: 'LEFT 90' },
  { label: '반복 4번', code: 'REPEAT 4 {\n\n}', caret: 11 },
  { label: '펜 들기', code: 'PEN_UP' },
  { label: '펜 내리기', code: 'PEN_DOWN' },
  { label: '펜 색', code: 'PEN_COLOR #ff0000' },
];
