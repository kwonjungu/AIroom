// 참조 답안 생성기 — corpus 기대 체크리스트로부터 "모델이 냈어야 할" 출력 JSON을 만든다.
// 용도 1) dry-run: mock 공급자가 이 답을 돌려줘 러너·검증기·판정기 전체 흐름을 실제로 통과시킨다.
// 용도 2) 만족 가능성 검사: 모든 과제가 우리 계약·검증기 안에서 풀 수 있는 과제인지 확인한다
//        (검증기가 정답을 거짓 거절하면 여기서 드러난다).
// ⚠ 이 답으로 얻은 점수는 모델 품질이 아니다. 보고서에 반드시 "oracle(mock)"으로 표시한다.

const EMOJI = { cat: '🐱', turtle: '🐢', robot: '🤖', fish: '🐟', rocket: '🚀', unicorn: '🦄', apple: '🍎', star: '⭐', candy: '🍬', coin: '🪙', meteor: '☄️', bomb: '💣', alien: '👾', gem: '💎', flower: '🌸' };
const RANGE = {
  speed: [0, 600], intervalMs: [200, 10000], radius: [8, 80], count: [0, 40], maxAlive: [1, 40],
  lives: [0, 9], invincibleMs: [0, 5000], value: [0, 9999], timeLimitSec: [0, 600],
};

const find = (p, at) => p.program.nodes.find(n => n.kind === at.kind && (at.entity === undefined || n.args.entity === at.entity));
const clamp = (k, v) => Math.min(RANGE[k][1], Math.max(RANGE[k][0], Math.round(v)));

function nextValue(n, param, dir, value) {
  const cur = n.args[param];
  if (dir === 'eq') return value;
  if (dir === 'inc') {
    if (param === 'speed' && n.kind === 'player') return clamp(param, Math.max(cur * 1.3, 40));
    if (cur === 0) return { speed: 60, timeLimitSec: 60, lives: 3, count: 3, invincibleMs: 1000 }[param] ?? 1;
    return clamp(param, Math.max(cur + 1, cur * 1.3));
  }
  return clamp(param, Math.min(cur - 1, cur * 0.7));
}

/**
 * @param {object} task
 * @param {object} project  기준 프로젝트(첫 생성이면 빈 공방 작품)
 * @returns {{status:'patch', summary:string, operations:object[]}}
 */
export function referenceOutput(task, project) {
  const e = task.expect;
  if (e.template) {
    const params = { ...(e.params || {}) };
    if (e.template === 'collect' && params.gemCount && params.goal === undefined) params.goal = params.gemCount;
    return { status: 'patch', summary: '새 게임을 만들었어요.', operations: [{ op: 'instantiateTemplate', templateId: e.template, params }] };
  }
  const plan = e.anyOf ? { ...e, ...e.anyOf[0] } : e;
  const ops = [];
  const genreFalls = ['catch', 'avoid'].includes(task.genre);
  const stats = find(project, { kind: 'stats' });
  let livesSet = false;

  for (const c of plan.change || []) {
    const n = find(project, c.at);
    if (!n) continue;
    const v = nextValue(n, c.param, c.dir, c.value);
    ops.push({ op: 'setParameter', nodeId: n.id, parameter: c.param, value: v });
    if (c.param === 'count' && v > n.args.maxAlive) ops.push({ op: 'setParameter', nodeId: n.id, parameter: 'maxAlive', value: Math.min(40, v) });
    if (n.kind === 'stats' && c.param === 'lives') livesSet = true;
  }
  for (const a of plan.appearance || []) {
    const n = find(project, a.at);
    const slot = n.args.appearance ?? n.args.background;
    ops.push({ op: 'setAppearance', nodeId: n.id, slotId: slot, preset: a.preset || a.presets[0] });
  }
  const touchesAdded = new Set();
  for (const x of plan.add || []) {
    if (x.kind === 'spawner') {
      const ent = x.entity || 'bomb';
      const id = `${ent}-new`;
      const fall = genreFalls || ent === 'meteor';
      ops.push({ op: 'addBehavior', parentId: null, node: { id, kind: 'spawner', args: { entity: ent, appearance: `${ent}.appearance`, pattern: fall ? 'fallFromTop' : 'scatter', intervalMs: fall ? 1500 : 4000, speed: fall ? 160 : 40, maxAlive: fall ? 4 : 3, count: fall ? 0 : 3, radius: 22 }, children: [] } });
      ops.push({ op: 'setAppearance', nodeId: id, slotId: `${ent}.appearance`, preset: 'emoji:' + EMOJI[ent] });
      if (!x.entity) { // 모호한 "더 어렵게": 피할 것 추가 + 닿기 규칙
        ops.push({ op: 'addBehavior', parentId: null, node: { id: 'touch-bomb-new', kind: 'onTouch', args: { entity: 'bomb', effects: [{ do: 'loseLife' }, { do: 'removeOther' }] }, children: [] } });
        touchesAdded.add('loseLife');
      }
    } else if (x.kind === 'onTouch') {
      const eff = x.effect || 'loseLife';
      const amount = (plan.effect || []).find(f => f.entity === x.entity && f.do === 'addScore')?.amount ?? 1;
      const effects = eff === 'addScore' ? [{ do: 'addScore', amount }, { do: 'removeOther' }] : eff === 'loseLife' ? [{ do: 'loseLife' }, { do: 'removeOther' }] : [{ do: eff }];
      ops.push({ op: 'addBehavior', parentId: null, node: { id: `touch-${x.entity}-new`, kind: 'onTouch', args: { entity: x.entity, effects }, children: [] } });
      touchesAdded.add(eff);
    } else if (x.kind === 'loseWhen') {
      ops.push({ op: 'addBehavior', parentId: null, node: { id: `lose-${x.stat.toLowerCase()}-new`, kind: 'loseWhen', args: { stat: x.stat }, children: [] } });
    } else if (x.kind === 'winWhen') {
      ops.push({ op: 'addBehavior', parentId: null, node: { id: 'win-score-new', kind: 'winWhen', args: { stat: x.stat, value: x.value }, children: [] } });
    }
  }
  // 기존 규칙의 효과 값 변경(예: 사과 2점) = 같은 entity 닿기 규칙 교체
  for (const f of plan.effect || []) {
    if ((plan.add || []).some(x => x.kind === 'onTouch' && x.entity === f.entity)) continue;
    const t = project.program.nodes.find(n => n.kind === 'onTouch' && n.args.entity === f.entity);
    if (!t) continue;
    ops.push({ op: 'removeBehavior', nodeId: t.id });
    ops.push({ op: 'addBehavior', parentId: null, node: { id: `${t.id}-v2`, kind: 'onTouch', args: { entity: f.entity, effects: t.args.effects.map(x => (x.do === f.do ? { ...x, amount: f.amount } : x)) }, children: [] } });
  }
  // 목숨이 줄어드는 규칙을 넣었는데 목숨이 0이면 목숨을 준다(의미 검증상 필수)
  if (touchesAdded.has('loseLife') && stats && stats.args.lives === 0 && !livesSet) {
    ops.push({ op: 'setParameter', nodeId: stats.id, parameter: 'lives', value: 3 });
    ops.push({ op: 'setParameter', nodeId: stats.id, parameter: 'invincibleMs', value: 1000 });
  }
  if (touchesAdded.has('loseLife') && stats && stats.args.invincibleMs === 0 && livesSet) ops.push({ op: 'setParameter', nodeId: stats.id, parameter: 'invincibleMs', value: 1000 });
  return { status: 'patch', summary: '바꿨어요.', operations: ops };
}
