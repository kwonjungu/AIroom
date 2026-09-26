// 독립 기대 체크리스트 판정기 — 생성기(lib/vibe/generation)의 코드를 쓰지 않고 결과 프로젝트만 본다.
// "게임이 켜짐(runnable)"과 "학생이 요청한 게임(requestMet)"과 "요청 밖을 지킴(preserved)"을 따로 판정한다.

const EMOJI = {
  cat: '🐱', turtle: '🐢', robot: '🤖', fish: '🐟', rocket: '🚀', unicorn: '🦄',
  apple: '🍎', star: '⭐', candy: '🍬', coin: '🪙', meteor: '☄️', bomb: '💣', alien: '👾', gem: '💎', flower: '🌸',
};
const MAPS = {
  first: ['######', '#S..G#', '######'],
  whirl: ['########', '#S.....#', '######.#', '###G##.#', '###....#', '########'],
};

const nodes = p => p.program.nodes;
function find(p, at) {
  return nodes(p).find(n => n.kind === at.kind && (at.entity === undefined || n.args.entity === at.entity)) || null;
}
function slotOf(n) { return n ? (n.args.appearance ?? n.args.background ?? null) : null; }
function presetOf(p, slot) { return p.assets.find(a => a.slotId === slot)?.preset ?? null; }

/** 구조로 장르를 판정 (templateId 메타데이터에 의존하지 않음) */
export function detectGenre(p) {
  const ns = nodes(p);
  if (ns.some(n => n.kind === 'mazeMap')) return 'maze';
  const touches = ns.filter(n => n.kind === 'onTouch');
  const scoreTouch = touches.some(t => t.args.effects.some(e => e.do === 'addScore'));
  const lifeTouch = touches.some(t => t.args.effects.some(e => e.do === 'loseLife'));
  const win = ns.find(n => n.kind === 'winWhen');
  if (win?.args.stat === 'survivedSec' && lifeTouch) return 'avoid';
  const scatter = ns.some(n => n.kind === 'spawner' && n.args.pattern === 'scatter');
  const fall = ns.some(n => n.kind === 'spawner' && n.args.pattern === 'fallFromTop');
  if (scatter && scoreTouch) return 'collect';
  if (fall && scoreTouch) return 'catch';
  return null;
}

function checkParams(p, genre, params, fail) {
  const player = find(p, { kind: 'player' });
  for (const [k, v] of Object.entries(params)) {
    switch (k) {
      case 'hero': if (presetOf(p, slotOf(player)) !== 'emoji:' + EMOJI[v]) fail(`주인공 ${v} 아님`); break;
      case 'item': case 'hazard': case 'gem': {
        if (genre === 'collect' && k === 'hazard') { if (v === 'bomb' && !find(p, { kind: 'spawner', entity: 'bomb' })) fail('폭탄 없음'); break; }
        const sp = find(p, { kind: 'spawner', entity: v });
        if (!sp) fail(`${v} 나오는 규칙 없음`); else if (presetOf(p, slotOf(sp)) !== 'emoji:' + EMOJI[v]) fail(`${v} 모습 다름`);
        break;
      }
      case 'goal': if (find(p, { kind: 'winWhen' })?.args.value !== v) fail(`목표 ${v} 아님`); break;
      case 'surviveSec': { const w = find(p, { kind: 'winWhen' }); if (!(w?.args.stat === 'survivedSec' && w.args.value === v)) fail(`버티기 ${v}초 아님`); break; }
      case 'timeLimitSec': if (find(p, { kind: 'world' })?.args.timeLimitSec !== v) fail(`제한 시간 ${v} 아님`); break;
      case 'lives': if (find(p, { kind: 'stats' })?.args.lives !== v) fail(`목숨 ${v} 아님`); break;
      case 'gemCount': { const sp = nodes(p).find(n => n.kind === 'spawner' && n.args.pattern === 'scatter'); if (sp?.args.count !== v) fail(`보석 수 ${v} 아님`); break; }
      case 'map': if (JSON.stringify(find(p, { kind: 'mazeMap' })?.args.rows) !== JSON.stringify(MAPS[v])) fail(`지도 ${v} 아님`); break;
      default: fail(`알 수 없는 기대 ${k}`);
    }
  }
}

function checkChange(before, after, c, fail) {
  const a = find(after, c.at), b = find(before, c.at);
  if (!a) return fail(`${c.at.kind}${c.at.entity ? ':' + c.at.entity : ''} 없음`);
  const va = a.args[c.param], vb = b ? b.args[c.param] : undefined;
  if (c.dir === 'eq' && va !== c.value) fail(`${c.param}=${va} (기대 ${c.value})`);
  if (c.dir === 'inc' && !(Number(va) > Number(vb))) fail(`${c.param} ${vb}→${va} 증가 아님`);
  if (c.dir === 'dec' && !(Number(va) < Number(vb))) fail(`${c.param} ${vb}→${va} 감소 아님`);
}

function checkAppearance(after, x, fail) {
  const n = find(after, x.at);
  const pr = presetOf(after, slotOf(n));
  const ok = x.presets ? x.presets.includes(pr) : pr === x.preset;
  if (!ok) fail(`모습 ${pr} (기대 ${x.preset || x.presets.join('|')})`);
}

/** 새로 생겨야 한다: 조건에 맞는 노드 수가 전보다 늘어야 한다(원래 있던 같은 규칙은 인정하지 않음) */
function checkAdd(before, after, x, fail) {
  const match = n => n.kind === x.kind
    && (x.entity === undefined || n.args.entity === x.entity)
    && (x.effect === undefined || n.args.effects?.some(e => e.do === x.effect))
    && (x.stat === undefined || n.args.stat === x.stat)
    && (x.value === undefined || n.args.value === x.value);
  if (!(nodes(after).filter(match).length > nodes(before).filter(match).length)) {
    fail(`추가 안 됨: ${x.kind}${x.entity ? ':' + x.entity : ''}${x.effect ? ':' + x.effect : ''}${x.stat ? ':' + x.stat : ''}`);
  }
}

function checkEffect(after, x, fail) {
  const t = nodes(after).find(n => n.kind === 'onTouch' && n.args.entity === x.entity && n.args.effects.some(e => e.do === x.do && (x.amount === undefined || e.amount === x.amount)));
  if (!t) fail(`${x.entity} 효과 ${x.do}${x.amount !== undefined ? ' ' + x.amount : ''} 없음`);
}

function requestChecks(before, after, e, fail) {
  (e.change || []).forEach(c => checkChange(before, after, c, fail));
  (e.appearance || []).forEach(x => checkAppearance(after, x, fail));
  (e.add || []).forEach(x => checkAdd(before, after, x, fail));
  (e.effect || []).forEach(x => checkEffect(after, x, fail));
}

/**
 * @param {object} task    corpus 과제
 * @param {object} before  기준 프로젝트
 * @param {object|null} after  적용 결과 (실패면 null)
 * @returns {{requestMet:boolean, preserved:boolean, requestFailures:string[], preserveFailures:string[]}}
 */
export function evaluateChecklist(task, before, after) {
  const e = task.expect;
  const rf = [], pf = [];
  if (!after) return { requestMet: false, preserved: true, requestFailures: ['후보 없음'], preserveFailures: [] };
  if (e.template) {
    const g = detectGenre(after);
    if (g !== e.template) rf.push(`장르 ${g} (기대 ${e.template})`);
    else checkParams(after, g, e.params || {}, m => rf.push(m));
    return { requestMet: rf.length === 0, preserved: true, requestFailures: rf, preserveFailures: pf };
  }
  requestChecks(before, after, e, m => rf.push(m));
  if (e.anyOf) {
    const okAny = e.anyOf.some(alt => { const f = []; requestChecks(before, after, alt, m => f.push(m)); return f.length === 0; });
    if (!okAny) rf.push('모호한 요청: 어떤 해석도 충족 안 됨');
  }

  const keep = new Set(e.keep || []);
  const changedParams = new Set((e.change || []).map(c => `${c.at.kind}:${c.at.entity || ''}:${c.param}`));
  if (keep.has('rules')) {
    for (const n of nodes(before).filter(x => x.kind === 'spawner' || x.kind === 'onTouch')) {
      const still = nodes(after).find(m => m.kind === n.kind && m.args.entity === n.args.entity);
      if (!still) pf.push(`규칙 사라짐: ${n.kind}:${n.args.entity}`);
      else if (n.kind === 'onTouch' && !(e.effect || []).some(x => x.entity === n.args.entity)
        && JSON.stringify(still.args.effects.map(x => x.do).sort()) !== JSON.stringify(n.args.effects.map(x => x.do).sort())) pf.push(`규칙 바뀜: ${n.id}`);
    }
  }
  if (keep.has('assets')) {
    for (const a of before.assets) {
      const now = after.assets.find(x => x.slotId === a.slotId);
      if (!now || now.preset !== a.preset) pf.push(`모습 바뀜: ${a.slotId}`);
    }
  }
  for (const slot of e.keepSlots || []) if (presetOf(after, slot) !== presetOf(before, slot)) pf.push(`모습 바뀜: ${slot}`);
  if (keep.has('goal')) {
    const sig = p => JSON.stringify(nodes(p).filter(n => n.kind === 'winWhen' || n.kind === 'loseWhen').map(n => `${n.kind}:${n.args.stat}:${changedParams.has(`${n.kind}::value`) ? '*' : n.args.value ?? ''}`).sort());
    if (sig(before) !== sig(after)) pf.push('이기기·지기 규칙 바뀜');
    const wb = find(before, { kind: 'world' })?.args.timeLimitSec, wa = find(after, { kind: 'world' })?.args.timeLimitSec;
    if (!changedParams.has('world::timeLimitSec') && wb !== wa) pf.push(`제한 시간 바뀜 ${wb}→${wa}`);
  }
  for (const k of e.keepParams || []) {
    const b = find(before, k.at), a = find(after, k.at);
    if (!a || JSON.stringify(a.args[k.param]) !== JSON.stringify(b?.args[k.param])) pf.push(`유지해야 할 값 바뀜: ${k.at.kind}.${k.param}`);
  }
  return { requestMet: rf.length === 0, preserved: pf.length === 0, requestFailures: rf, preserveFailures: pf };
}
