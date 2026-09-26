// 미로 미션 — v1 MAZE_MISSIONS 12개 + MAZE_CHAPTERS + MAZE_STORY 이관(지도·방향·par·solution 그대로).
// answers[0] = v1 solution. wrong = 알려진 오답(한 칸 모자람·보석 안 줍기·반복 부족 등).
// 채점: grade.js gradeMaze — G 도착 + 보석 모두(v1 mazeSuccess 조건). par는 "짧은 코드" 배지일 뿐 성공 조건이 아니다.

export const MAZE_WORLD = {
  icon: '🔍', title: '미로 유적',
  intro: '먼 우주 어딘가에서 코드로 잠긴 고대 미로 유적이 발견됐어! 우주 견습 탐정 토토는 유적 깊은 곳에 잠든 별의 보물을 찾으라는 임무를 받았지.',
};

export const MAZE_CHAPTERS = [
  { id: 'maze-seq', key: '순차', icon: '🐾', title: '순차의 유적', story: '한 걸음씩 차례대로! 명령한 순서 그대로 걸어야 문이 열리는 유적이야.' },
  { id: 'maze-loop', key: '반복', icon: '🔁', title: '반복의 유적', story: '같은 무늬가 계속 이어지는 유적! 반복의 힘을 알면 긴 길도 짧은 주문으로 통과할 수 있어.' },
  { id: 'maze-if', key: '선택', icon: '🚪', title: '선택의 유적', story: '안개 때문에 앞이 안 보이는 유적! 벽을 만나면 어떻게 할지 미리 정해 두는 탐정만 통과할 수 있어.' },
  { id: 'maze-exam', key: '시험', icon: '🏆', title: '탐정 시험', story: '우주 탐정 협회의 마지막 시험! 배운 모든 것을 합쳐 진짜 탐정 배지를 받자.' },
];

const L = (...a) => a.join('\n');
const WALLRULE = n => `REPEAT ${n} {\nIF WALL {\nTURN_RIGHT\n} ELSE {\nMOVE\n}\n}`;

const RAW = [
  { id: 1, title: '첫걸음', level: '순차', description: '토토를 보물(G)까지 데려다 주세요!', map: ['######', '#S..G#', '######'], startDir: 'right',
    hint: 'S에서 G까지 몇 칸인지 손가락으로 짚으며 세어 봐.', par: 3, solution: 'MOVE\nMOVE\nMOVE',
    wrong: [L('MOVE', 'MOVE'), L('TURN_LEFT', 'MOVE', 'MOVE', 'MOVE')] },
  { id: 2, title: '모퉁이', level: '순차', description: '토토를 보물(G)까지 데려다 주세요!', map: ['######', '#..G##', '#.####', '#S####', '######'], startDir: 'up',
    hint: '토토가 지금 어느 쪽을 보고 있지? 몇 칸 가서 어느 손 쪽으로 돌지 생각해 봐.', par: 5, solution: 'MOVE\nMOVE\nTURN_RIGHT\nMOVE\nMOVE',
    wrong: [L('MOVE', 'MOVE', 'TURN_LEFT', 'MOVE', 'MOVE'), L('MOVE', 'TURN_RIGHT', 'MOVE', 'MOVE')] },
  { id: 3, title: '보석길', level: '순차', description: '보석(D)을 줍고 보물(G)까지 가세요!', map: ['#######', '###..G#', '###D###', '#S..###', '#######'], startDir: 'right',
    hint: '꺾는 곳이 두 번이야. 보석 칸에서는 무엇을 해야 할까?', par: 9, solution: 'MOVE\nMOVE\nTURN_LEFT\nMOVE\nPICK\nMOVE\nTURN_RIGHT\nMOVE\nMOVE',
    wrong: [L('MOVE', 'MOVE', 'TURN_LEFT', 'MOVE', 'MOVE', 'TURN_RIGHT', 'MOVE', 'MOVE')] },
  { id: 4, title: '긴복도', level: '반복', description: '토토를 보물(G)까지 데려다 주세요!', map: ['########', '#S....G#', '########'], startDir: 'right',
    hint: '"앞으로 가기"를 다섯 번 쓰는 대신, 한 번만 쓰는 마법의 주문(반복!)이 유적 벽에 새겨져 있대!', par: 2, solution: 'REPEAT 5 {\nMOVE\n}',
    wrong: ['REPEAT 4 {\nMOVE\n}'] },
  { id: 5, title: '지그재그', level: '반복', description: '계단을 올라 보물(G)까지 가세요!', map: ['######', '####G#', '###..#', '##..##', '#S.###', '######'], startDir: 'right',
    hint: '계단 한 칸을 오르는 데 필요한 명령 네 개를 먼저 찾아봐. 그게 몇 번 반복될까?', par: 5, solution: 'REPEAT 3 {\nMOVE\nTURN_LEFT\nMOVE\nTURN_RIGHT\n}',
    wrong: ['REPEAT 2 {\nMOVE\nTURN_LEFT\nMOVE\nTURN_RIGHT\n}', 'REPEAT 3 {\nMOVE\nTURN_RIGHT\nMOVE\nTURN_LEFT\n}'] },
  { id: 6, title: '빙글길', level: '반복', description: '빙글 감긴 길을 따라 보물(G)까지!', map: ['#####', '#####', '#G..#', '###.#', '#S..#', '#####'], startDir: 'right',
    hint: '"두 칸 가고 왼쪽으로 돌기"가 몇 번이면 도착할까?', par: 4, solution: 'REPEAT 3 {\nMOVE\nMOVE\nTURN_LEFT\n}',
    wrong: ['REPEAT 3 {\nMOVE\nMOVE\nTURN_RIGHT\n}'] },
  { id: 7, title: '보석복도', level: '반복', description: '보석 4개를 모두 줍고 보물(G)까지!', map: ['########', '#SDDDDG#', '########'], startDir: 'right',
    hint: '한 칸 가서 줍고, 한 칸 가서 줍고… 어? 뭔가 계속 반복되지 않아?', par: 4, solution: 'REPEAT 4 {\nMOVE\nPICK\n}\nMOVE',
    wrong: ['REPEAT 5 {\nMOVE\n}', 'REPEAT 3 {\nMOVE\nPICK\n}\nMOVE\nMOVE'] },
  { id: 8, title: '벽탐지', level: '선택', description: '안개 속! "벽이면 돌기" 수칙으로 통과하세요.', map: ['######', '#S...#', '####.#', '####.#', '####G#', '######'], startDir: 'right',
    hint: '"앞이 벽이면 돌고, 아니면 간다"를 계속 반복하면 토토는 어떻게 움직일까?', par: 4, solution: WALLRULE(7),
    wrong: [WALLRULE(5), 'REPEAT 7 {\nMOVE\n}'] },
  { id: 9, title: '두모퉁이', level: '선택', description: '모퉁이 두 개! 아까 그 수칙이 또 통할까요?', map: ['######', '#S...#', '####.#', '#G...#', '######'], startDir: 'right',
    hint: '지난 미션 코드에서 숫자 하나만 바꾸면 돼. 지나갈 칸과 모퉁이 수를 세어 봐!', par: 4, solution: WALLRULE(10),
    wrong: [WALLRULE(7)] },
  { id: 10, title: '소용돌이', level: '선택', description: '세 번 감기는 소용돌이! 같은 수칙으로 뚫어 보세요.', map: ['########', '#S.....#', '######.#', '###G##.#', '###....#', '########'], startDir: 'right',
    hint: '모퉁이가 세 개나 되지만 규칙은 딱 하나야. 반복 횟수만 다시 세어 봐!', par: 4, solution: WALLRULE(15),
    wrong: [WALLRULE(10), 'REPEAT 15 {\nIF WALL {\nTURN_LEFT\n} ELSE {\nMOVE\n}\n}'] },
  { id: 11, title: '보석계단', level: '시험', description: '시험 1교시! 계단의 보석 3개를 모두 줍고 올라가세요.', map: ['######', '####G#', '###.D#', '##.D##', '#SD###', '######'], startDir: 'right',
    hint: '한 계단에서 하는 일을 순서대로 말해 봐. 가서 줍고, 돌고, 오르고, 또 돌고… 묶을 수 있겠지?', par: 6, solution: 'REPEAT 3 {\nMOVE\nPICK\nTURN_LEFT\nMOVE\nTURN_RIGHT\n}',
    wrong: ['REPEAT 3 {\nMOVE\nTURN_LEFT\nMOVE\nTURN_RIGHT\n}'] },
  { id: 12, title: '탐정시험', level: '시험', description: '마지막 시험! 안개 낀 미로의 보석 2개를 줍고 보물까지.', map: ['########', '#S..D..#', '######.#', '#G####.#', '#..D...#', '########'], startDir: 'right',
    hint: '벽이면 돌고, 아니면 "가면서 줍기". 배운 걸 전부 한 가지 규칙에 담아 봐!', par: 5, solution: 'REPEAT 17 {\nIF WALL {\nTURN_RIGHT\n} ELSE {\nMOVE\nPICK\n}\n}',
    wrong: [WALLRULE(17)] },
];

const STORY = {
  1: { story: '유적의 첫 번째 문이 열렸어! 토토가 보물까지 곧장 걸어가기만 하면 돼.', ct: '순차: 컴퓨터는 내가 적은 순서 그대로, 한 번에 하나씩 실행해요!' },
  2: { story: '이런, 길이 꺾여 있네? 토토는 지금 위쪽을 보고 서 있어.', ct: '순차: "가기"와 "돌기"의 순서가 바뀌면 도착하는 곳도 달라져요.' },
  3: { story: '벽 틈에서 보석이 반짝! 지나가는 길에 꼭 주워 가자.', ct: '순차: 길고 복잡한 일도 작은 명령으로 쪼개면 하나씩 해결돼요.' },
  4: { story: '이 복도는 정말 길다! 그런데 벽에 "같은 말을 다섯 번 하지 말라"는 옛 글자가 새겨져 있어.', ct: '반복: 같은 명령이 이어질 땐 REPEAT 하나로 묶으면 코드가 짧아져요!' },
  5: { story: '계단처럼 생긴 길이야! 자세히 보면 똑같은 모양이 세 번 이어져 있어.', ct: '반복: 반복되는 묶음(패턴)을 찾아내는 눈이 코딩 탐정의 눈이에요!' },
  6: { story: '길이 안쪽으로 빙글 감겨 있어! 토토가 어지럽지 않게 규칙을 찾아 줘.', ct: '반복: 반복 묶음 안에는 명령이 여러 개 들어가도 괜찮아요.' },
  7: { story: '우와, 보석이 줄줄이 떨어져 있어! 하나도 빠뜨리지 말고 줍자.', ct: '반복: "가서 줍기"처럼 서로 다른 두 일도 한 묶음으로 반복할 수 있어요.' },
  8: { story: '이 방은 안개 때문에 앞이 안 보여! 이럴 땐 탐정 수칙 1번, "벽을 만나면 오른쪽으로 돌아라"를 쓸 시간이야.', ct: '선택: IF는 "만약 ~라면"! 상황을 보고 컴퓨터가 스스로 행동을 골라요.' },
  9: { story: '이번엔 모퉁이가 두 개야. 그런데 이상하지? 아까 만든 코드가 그대로 통할 것 같은 느낌!', ct: '선택: 잘 만든 규칙 하나는 미로가 바뀌어도 다시 쓸 수 있어요!' },
  10: { story: '선택의 유적 가장 깊은 곳, 소용돌이 방이야! 토토의 벽 감지 수칙이 여기서도 통할까?', ct: '선택+반복: 짧은 규칙 하나로 복잡한 미로를 푸는 것, 그게 바로 알고리즘!' },
  11: { story: '드디어 탐정 시험 1교시! 보석이 놓인 계단을 오르며 하나도 빠짐없이 주워야 해.', ct: '종합: 순차로 묶음을 만들고 반복으로 돌리면 긴 일이 짧아져요.' },
  12: { story: '마지막 시험이야! 안개 낀 소용돌이 미로에 보석이 숨어 있어. 여길 통과하면 토토는 진짜 우주 탐정이 돼!', ct: '종합: 순차+반복+선택을 합치면 어떤 미로든 여는 만능 열쇠가 돼요!' },
};

export const MAZE_MISSIONS = RAW.map(m => {
  const ch = MAZE_CHAPTERS.find(c => c.key === m.level);
  return {
    id: 'maze-' + m.id,
    legacyId: m.id,
    mode: 'maze',
    chapter: ch.id,
    level: m.level,
    icon: ch.icon,
    title: m.title,
    description: m.description,
    hint: m.hint,
    story: STORY[m.id].story,
    tip: STORY[m.id].ct,
    map: m.map,
    startDir: m.startDir,
    par: m.par,
    free: false,
    success: `${m.title} 통과! 토토가 보물에 도착했어.`,
    answers: [m.solution],
    wrong: m.wrong,
  };
});

export const MAZE_CHIPS = [
  { label: '앞으로 한 칸', code: 'MOVE' },
  { label: '왼쪽으로 돌기', code: 'TURN_LEFT' },
  { label: '오른쪽으로 돌기', code: 'TURN_RIGHT' },
  { label: '보석 줍기', code: 'PICK' },
  { label: '반복 3번', code: 'REPEAT 3 {\n\n}', caret: 11 },
  { label: '벽이면', code: 'IF WALL {\nTURN_RIGHT\n} ELSE {\nMOVE\n}' },
];
