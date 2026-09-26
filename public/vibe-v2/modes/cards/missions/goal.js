// 별까지 가기 미션 (v1 GOAL_MISSIONS 12개 이관). 지도: # 벽(수풀), . 길, S 출발, G 별.
// 로버는 startDir(기본 위)을 보고 출발한다. 별 칸에 닿는 즉시 성공(v1과 같은 규칙).
// solution: 카드 배열. 문자열 = move/turnLeft/turnRight, {repeat:n, body:[...]} = 반복 카드.
// par: 가장 짧은 카드 수(반복 카드 1장 + 안의 카드). 별 점수에는 쓰지 않는다(실패 횟수 감점 금지).

export const GOAL_CHAPTERS = [
  { id: 'goal-seq', title: '순차의 길', story: '카드를 놓은 순서 그대로 로버가 움직여! 한 걸음씩 차례차례 별까지.' },
  { id: 'goal-rep', title: '반복의 길', story: '같은 걸음이 자꾸 나올 땐 반복 카드 하나로 묶으면 돼!' },
];

const M = 'move', L = 'turnLeft', R = 'turnRight';
const rep = (n, body) => ({ repeat: n, body });

export const GOAL_MISSIONS = [
  { id: 'goal-1', num: 1, chapter: 'goal-seq', title: '곧게 가기', icon: '⬆️', startDir: 'up', par: 2,
    map: ['#G#', '#.#', '#S#'],
    description: '로버를 별까지 데려다 주세요!', story: '앞으로 카드를 놓으면 로버가 한 칸 걸어가.',
    hint: '별까지 몇 칸인지 손가락으로 세어 봐. 앞으로 카드를 그만큼!', success: '별에 도착했어!',
    solution: [M, M] },
  { id: 'goal-2', num: 2, chapter: 'goal-seq', title: '조금 더', icon: '⬆️', startDir: 'up', par: 3,
    map: ['#G#', '#.#', '#.#', '#S#'],
    description: '로버를 별까지 데려다 주세요!', story: '이번엔 별이 조금 더 멀리 있어!',
    hint: '한 칸 더 멀어! 앞으로 카드를 세 장 놓아 볼까?', success: '칸을 잘 셌구나!',
    solution: [M, M, M] },
  { id: 'goal-3', num: 3, chapter: 'goal-seq', title: '오른쪽으로', icon: '↪️', startDir: 'up', par: 4,
    map: ['####', '#..G', '#S##'],
    description: '로버를 별까지 데려다 주세요!', story: '길이 오른쪽으로 꺾여 있어! 로버는 지금 위를 보고 있지.',
    hint: '한 칸 간 다음 오른쪽으로 돌아 봐!', success: '방향을 잘 바꿨어!',
    solution: [M, R, M, M] },
  { id: 'goal-4', num: 4, chapter: 'goal-seq', title: '왼쪽으로', icon: '↩️', startDir: 'up', par: 4,
    map: ['####', 'G..#', '##S#'],
    description: '로버를 별까지 데려다 주세요!', story: '이번엔 왼쪽으로 꺾인 길이야!',
    hint: '한 칸 간 다음 왼쪽으로 돌아 볼까?', success: '왼쪽 오른쪽을 잘 아는구나!',
    solution: [M, L, M, M] },
  { id: 'goal-5', num: 5, chapter: 'goal-seq', title: '계단 1', icon: '🪜', startDir: 'up', par: 6,
    map: ['#G##', '#..#', '##.#', '##S#'],
    description: '로버를 별까지 데려다 주세요!', story: '계단처럼 생긴 길이야!',
    hint: '올라가다 왼쪽으로 돌고, 다시 위로!', success: '계단을 다 올라왔어!',
    solution: [M, M, L, M, R, M] },
  { id: 'goal-6', num: 6, chapter: 'goal-seq', title: '계단 2', icon: '🪜', startDir: 'up', par: 7,
    map: ['##G#', '##.#', '#..#', '#.##', '#S##'],
    description: '로버를 별까지 데려다 주세요!', story: '더 긴 계단이야!',
    hint: '앞으로·돌기·앞으로를 잘 섞어 봐.', success: '긴 계단도 척척!',
    solution: [M, M, R, M, L, M, M] },
  { id: 'goal-7', num: 7, chapter: 'goal-rep', title: '똑같이 세 번', icon: '🔁', startDir: 'up', par: 3, allowRepeat: true,
    map: ['#G#', '#.#', '#.#', '#.#', '#.#', '#.#', '#S#'],
    description: '반복 카드로 짧게! 로버를 별까지!', story: '앞으로를 여섯 번 놓기는 힘들어. 반복 카드를 써 볼까?',
    hint: '반복 카드 안에 앞으로 두 장을 넣고 3번 반복해 봐!', success: '짧은 카드로 멀리 갔어!',
    solution: [rep(3, [M, M])] },
  { id: 'goal-8', num: 8, chapter: 'goal-rep', title: '네모 돌기', icon: '🔁', startDir: 'up', par: 4, allowRepeat: true,
    map: ['####', '#..G', '#.##', '#S##'],
    description: '반복 카드로 모퉁이를 돌아 별까지!', story: '앞으로와 돌기를 한 묶음으로 반복해 보자.',
    hint: '앞으로·앞으로·오른쪽 돌기를 한 묶음으로 두 번!', success: '모퉁이를 반복으로 돌았어!',
    solution: [rep(2, [M, M, R])] },
  { id: 'goal-9', num: 9, chapter: 'goal-rep', title: '긴 복도 반복', icon: '🔁', startDir: 'up', par: 3, allowRepeat: true,
    map: ['#G#', '#.#', '#.#', '#.#', '#.#', '#.#', '#.#', '#.#', '#S#'],
    description: '아주 긴 복도! 반복으로 짧게!', story: '복도가 여덟 칸이야. 몇 번 반복하면 될까?',
    hint: '앞으로 두 장을 4번 반복하면 딱 맞아!', success: '긴 복도를 단숨에!',
    solution: [rep(4, [M, M])] },
  { id: 'goal-10', num: 10, chapter: 'goal-rep', title: '반복+꺾기', icon: '🔁', startDir: 'up', par: 6, allowRepeat: true,
    map: ['###G', '##..', '#..#', '..##', 'S###'],
    description: '꺾이는 계단을 반복으로!', story: '어떤 묶음이 되풀이되는지 눈으로 찾아봐.',
    hint: '앞으로·오른쪽 돌기·앞으로·왼쪽 돌기를 세 번, 마지막에 한 칸 더!', success: '반복 속 규칙을 찾아냈어!',
    solution: [rep(3, [M, R, M, L]), M] },
  { id: 'goal-11', num: 11, chapter: 'goal-rep', title: '도전 미로', icon: '🏁', startDir: 'up', par: 13, allowRepeat: true,
    map: ['##G###', '#..###', '#.####', '#....#', '####.#', '####S#'],
    description: '배운 걸 모두 써서 별까지!', story: '벽을 피해 꺾이는 길을 따라가 줘.',
    hint: '천천히 한 칸씩! 로버가 어디를 보는지 확인해.', success: '넌 로버 대장이야!',
    solution: [M, M, L, M, M, M, R, M, M, R, M, L, M] },
  { id: 'goal-12', num: 12, chapter: 'goal-rep', title: '자유 도전', icon: '🏆', startDir: 'up', par: 12, allowRepeat: true,
    map: ['###G###', '##..###', '##.####', '#..####', '#.#####', '#.#####', '#S#####'],
    description: '마지막 도전! 별까지 데려가면 로버 박사!', story: '꺾이는 곳마다 어느 쪽으로 돌지 생각해 봐.',
    hint: '막히면 로버가 보는 방향부터 확인!', success: '넌 진짜 로버 박사야!',
    solution: [M, M, M, R, M, L, M, M, R, M, L, M] },
];

/** 미션이 없을 때(자유 연습) 쓰는 지도 */
export const GOAL_FREE_MISSION = {
  id: null, num: 0, chapter: null, title: '자유 연습', icon: '⭐', startDir: 'up', par: 0, allowRepeat: true,
  map: ['#####', '#..G#', '#.#.#', '#...#', '#S###'],
  description: '로버를 마음대로 움직여 별을 찾아요.', story: '', hint: '앞으로와 돌기 카드를 섞어 봐.', success: '별을 찾았어!',
  solution: [M, M, M, R, M, M],
};

export function getGoalMission(id) { return GOAL_MISSIONS.find(m => m.id === id) || null; }
