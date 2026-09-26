// 학생 말(한국어)과 게임 노드 사이의 어휘표 — 규칙 기반 분류와 학생용 변경 요약에 함께 쓴다.

import { HEROES, CATCH_ITEMS, HAZARDS, GEMS, TEMPLATES } from '../../../public/vibe-v2/shared/templates/index.js';

/** entity 키 → 한국어 이름과 학생이 쓰는 말 */
export const ENTITY_WORDS = Object.freeze({
  apple: { name: '사과', words: ['사과'] },
  fish: { name: '생선', words: ['생선', '물고기', '고기'] },
  star: { name: '별', words: ['별'] },
  candy: { name: '사탕', words: ['사탕', '캔디'] },
  coin: { name: '동전', words: ['동전', '코인', '금화'] },
  meteor: { name: '운석', words: ['운석', '별똥별', '메테오'] },
  bomb: { name: '폭탄', words: ['폭탄'] },
  alien: { name: '외계인', words: ['외계인', '에일리언'] },
  gem: { name: '보석', words: ['보석', '다이아', '다이아몬드'] },
  flower: { name: '꽃', words: ['꽃'] },
});

export const HERO_WORDS = Object.freeze({
  cat: ['고양이', '냥이'], turtle: ['거북이', '거북'], robot: ['로봇'], fish: ['물고기'], rocket: ['로켓', '우주선'], unicorn: ['유니콘'],
});

export const BACKGROUND_WORDS = Object.freeze({
  'bg-sky': ['하늘'], 'bg-space': ['우주'], 'bg-meadow': ['풀밭', '초원', '들판'], 'bg-ruins': ['유적', '동굴', '돌길'],
});

/** setAppearance가 쓸 수 있는 preset 허용 목록 (URL·임의 문자열 금지) */
export const ALLOWED_PRESETS = Object.freeze(new Set([
  ...Object.values(HEROES), ...Object.values(CATCH_ITEMS), ...Object.values(HAZARDS), ...Object.values(GEMS),
].map(e => 'emoji:' + e).concat(Object.keys(BACKGROUND_WORDS))));

/** entity 키 → 그 entity의 기본 emoji preset */
export function presetForEntity(key) {
  const e = CATCH_ITEMS[key] || HAZARDS[key] || GEMS[key];
  return e ? 'emoji:' + e : null;
}

export const GENRE_OF_TEMPLATE = Object.freeze(Object.fromEntries(Object.values(TEMPLATES).map(t => [t.id, t.genre])));

export const GENRE_PATTERNS = Object.freeze({
  catch: /(받기|받는|받아|받을|잡는 ?게임|잡기|바구니)/,
  avoid: /(피하기|피하는|피해|피할|장애물|살아남|버티는)/,
  collect: /(모으기|모으는|모아|모을|수집|주워|줍는)/,
  maze: /(미로|탈출|길 ?찾기)/,
});

/** 지원하지 않는 장르/기능 → 가장 가까운 대안 2개 (구현된 것만) */
export const UNSUPPORTED = Object.freeze([
  { re: /(슈팅|총을|총알|총 ?쏘|쏘는|쏘기|쏘게|쏠 ?수|미사일|레이저|발사)/, what: '쏘는 게임', alternatives: ['avoid', 'catch'] },
  { re: /(레이싱|자동차|경주|카트)/, what: '자동차 경주', alternatives: ['avoid', 'maze'] },
  { re: /(점프|플랫폼|마리오|뛰어넘|발판)/, what: '점프 게임', alternatives: ['avoid', 'collect'] },
  { re: /(퍼즐|테트리스|블록 ?맞추|맞추기 ?게임|애니팡|같은 ?그림)/, what: '퍼즐 게임', alternatives: ['collect', 'maze'] },
  { re: /(rpg|알피지|전투|싸움|격투|보스|칼싸움|레벨 ?업)/i, what: '싸우는 게임', alternatives: ['avoid', 'collect'] },
  { re: /(3d|3차원|멀티|온라인|친구랑 ?같이|같이 ?하는|대전)/i, what: '여럿이 하는·입체 게임', alternatives: ['catch', 'collect'] },
  { re: /(축구|야구|농구|배구|골프|탁구|테니스|스포츠)/, what: '공놀이 게임', alternatives: ['catch', 'avoid'] },
  { re: /(오목|바둑|체스|장기|카드 ?게임|보드 ?게임|끝말잇기|퀴즈)/, what: '보드·퀴즈 게임', alternatives: ['maze', 'collect'] },
  { re: /(음악|리듬|노래|피아노)/, what: '리듬 게임', alternatives: ['catch', 'avoid'] },
  { re: /(그림 ?그리|색칠)/, what: '그림 그리기', alternatives: ['collect', 'catch'] },
]);

/** 노드 종류·파라미터 → 학생용 이름 */
export const PARAM_LABELS = Object.freeze({
  spawner: { speed: '속도', intervalMs: '나오는 간격(ms)', maxAlive: '한꺼번에 나오는 수', count: '처음 개수', radius: '크기', pattern: '나오는 방식', refill: '다시 채우기' },
  player: { speed: '움직이는 속도', radius: '크기', x: '가로 위치', y: '세로 위치', movement: '움직이는 방향' },
  world: { timeLimitSec: '제한 시간(초)', background: '배경' },
  stats: { lives: '목숨', invincibleMs: '무적 시간(ms)' },
  winWhen: { value: '목표', stat: '이기는 조건' },
  loseWhen: { stat: '지는 조건' },
  mazeMap: { rows: '미로 지도' },
});

const EFFECT_LABEL = { addScore: a => `점수 +${a.amount}`, loseLife: () => '목숨 -1', removeOther: () => '사라짐', win: () => '이김', lose: () => '짐' };
const WIN_STAT = { score: '점수', survivedSec: '버틴 시간(초)', reachedExit: '도착' };
const LOSE_STAT = { livesZero: '목숨이 0이 되면 짐', timeUp: '시간이 끝나면 짐' };

export function entityName(key) { return ENTITY_WORDS[key]?.name || key; }

/** 노드를 학생이 알아볼 이름으로 */
export function nodeLabel(n) {
  if (!n) return '규칙';
  switch (n.kind) {
    case 'player': return '주인공';
    case 'world': return '무대';
    case 'spawner': return entityName(n.args.entity);
    case 'onTouch': return `${entityName(n.args.entity)}에 닿으면`;
    case 'stats': return '목숨 설정';
    case 'winWhen': return '이기는 조건';
    case 'loseWhen': return '지는 조건';
    case 'mazeMap': return '미로';
    default: return n.kind;
  }
}

export function describeNode(n) {
  switch (n.kind) {
    case 'onTouch': return `${entityName(n.args.entity)}에 닿으면 ${n.args.effects.map(e => EFFECT_LABEL[e.do]?.(e) || e.do).join(', ')}`;
    case 'spawner': return `${josa(entityName(n.args.entity), '이가')} 나와요`;
    case 'winWhen': return n.args.stat === 'reachedExit' ? '도착하면 이김' : `${WIN_STAT[n.args.stat]} ${n.args.value}이면 이김`;
    case 'loseWhen': return LOSE_STAT[n.args.stat] || '지는 조건';
    case 'stats': return `목숨 ${n.args.lives}`;
    default: return nodeLabel(n);
  }
}

export function paramLabel(kind, param) { return PARAM_LABELS[kind]?.[param] || param; }

/** 받침에 맞는 조사: josa('사과','이가') → '사과가', josa('생선','이가') → '생선이'. 한글이 아니면 '이(가)' 꼴. */
export function josa(word, pair) {
  const w = String(word);
  const tail = w[w.length - 1] || '';
  const last = /\d/.test(tail) ? '영일이삼사오육칠팔구'.charCodeAt(Number(tail)) : w.charCodeAt(w.length - 1);
  const [a, b] = { 이가: ['이', '가'], 을를: ['을', '를'], 은는: ['은', '는'], 으로: ['으로', '로'], 과와: ['과', '와'] }[pair];
  if (!(last >= 0xac00 && last <= 0xd7a3)) return pair === '으로' ? `${w}(으)로` : `${w}${a}(${b})`;
  const jong = (last - 0xac00) % 28;
  if (pair === '으로') return w + (jong === 0 || jong === 8 ? '로' : '으로'); // ㄹ받침은 '로'
  return w + (jong === 0 ? b : a);
}

/** 변경 하나를 아이가 읽는 한 문장으로 */
export function changeSentence(n, param, before, after) {
  const name = nodeLabel(n);
  const up = Number(after) > Number(before);
  if (n.kind === 'spawner' && param === 'speed') return n.args.pattern === 'fallFromTop' ? `${josa(name, '이가')} 더 ${up ? '빨리' : '천천히'} 떨어져요.` : `${josa(name, '이가')} 더 ${up ? '빨리' : '천천히'} 움직여요.`;
  if (n.kind === 'spawner' && param === 'intervalMs') return `${josa(name, '이가')} 더 ${up ? '가끔' : '자주'} 나와요.`;
  if (n.kind === 'player' && param === 'speed') return `주인공이 더 ${up ? '빨리' : '천천히'} 움직여요.`;
  if (param === 'radius') return `${josa(name, '이가')} 더 ${up ? '커져요' : '작아져요'}.`;
  if (n.kind === 'winWhen' && param === 'value') return `목표가 ${josa(String(after), '으로')} 바뀌었어요.`;
  if (n.kind === 'world' && param === 'timeLimitSec') return `제한 시간이 ${after}초가 됐어요.`;
  if (n.kind === 'stats' && param === 'lives') return `목숨이 ${after}개가 됐어요.`;
  return `${name} ${josa(paramLabel(n.kind, param), '을를')} 바꿨어요.`;
}
