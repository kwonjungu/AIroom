// 변경 비교 요약 (순수) — AI 적용 전 "바뀔 것 / 그대로인 것" 화면의 문장을 만든다. WP3.
// 기준은 diffPrograms(노드 args) + assets 차이. 문장은 rules.js의 학생 언어를 그대로 쓴다.

import { diffPrograms } from '../../shared/contracts/patch-apply.js';
import { ruleSentence, lineOf, paramLabel, describeValue, entityName, emojiOf } from './rules.js';

/**
 * @param {object} before  현재 프로젝트
 * @param {object} after   변경 후보 적용 결과 (적용 전 미리보기)
 * @param {'low'|'mid'|'high'} [grade]
 * @returns {{changed:string[], added:string[], removed:string[], kept:string[], keptMore:number, empty:boolean}}
 */
export function summarizeChange(before, after, grade = 'mid') {
  const g = grade === 'high' ? 'high' : 'mid';
  const d = diffPrograms(before, after);
  const nb = new Map(before.program.nodes.map(n => [n.id, n]));
  const na = new Map(after.program.nodes.map(n => [n.id, n]));
  const touched = new Set([...d.added, ...d.removed]);
  const changed = [];

  for (const c of d.changed) {
    if (c.parameter === '(children)' || c.parameter === 'appearance' || c.parameter === 'background') continue;
    touched.add(c.nodeId);
    const node = nb.get(c.nodeId);
    const who = subjectOf(node, before);
    const label = paramLabel(node, c.parameter);
    const from = describeValue(node, c.parameter, c.before, g);
    const to = describeValue(na.get(c.nodeId), c.parameter, c.after, g);
    let text = `${who}${label}: ${from} → ${to}`;
    // mid에서도 실제 수치를 괄호로 보여 준다 (단계 이름만 같고 수치가 다른 경우)
    if (g !== 'high' && typeof c.before === 'number' && typeof c.after === 'number') text += ` (${c.before}→${c.after})`;
    changed.push(text);
  }

  // 모습(assets) 차이
  const ab = new Map((before.assets || []).map(a => [a.slotId, a]));
  for (const a of after.assets || []) {
    const old = ab.get(a.slotId);
    if (!old || old.preset === a.preset) continue;
    const owner = after.program.nodes.find(n => n.args?.appearance === a.slotId || n.args?.background === a.slotId);
    if (owner && d.added.includes(owner.id)) continue;           // 새 규칙의 모습은 "더해질 것"에 포함
    if (owner) touched.add(owner.id);
    changed.push(`${owner ? subjectOf(owner, before) : ''}모습: ${show(old.preset)} → ${show(a.preset)}`);
  }

  const added = d.added.map(id => sentence(na.get(id), after, g)).filter(Boolean);
  const removed = d.removed.map(id => sentence(nb.get(id), before, g)).filter(Boolean);

  // 그대로인 것: 이기기·지기·목숨처럼 학생이 "사라지면 안 되는" 규칙부터 보여 준다
  const keptAll = before.program.nodes
    .filter(n => !touched.has(n.id))
    .sort((x, y) => (KEEP_ORDER[x.kind] ?? 9) - (KEEP_ORDER[y.kind] ?? 9))
    .map(n => sentence(n, before, g))
    .filter(Boolean);
  const KEEP_MAX = 4;
  return {
    changed, added, removed,
    kept: keptAll.slice(0, KEEP_MAX),
    keptMore: Math.max(0, keptAll.length - KEEP_MAX),
    empty: !changed.length && !added.length && !removed.length,
  };
}

const KEEP_ORDER = { winWhen: 0, loseWhen: 1, stats: 2, onTouch: 3, spawner: 4, player: 5, mazeMap: 6, world: 7 };

function show(preset) {
  if (!preset) return '없음';
  return preset.startsWith('emoji:') ? preset.slice(6) : preset;
}

function sentence(node, project, g) {
  if (!node) return null;
  return lineOf(ruleSentence(node, project, g));
}

function subjectOf(node, project) {
  if (!node) return '';
  if (node.kind === 'spawner') return `${emojiOf(project, node.args.appearance) || ''} ${entityName(node.args.entity)} `.trimStart();
  if (node.kind === 'player') return '주인공 ';
  return '';
}

/** 비교 요약 → 한 줄 (셸 say용, 한 문장) */
export function oneLine(summary) {
  if (summary.empty) return '바뀌는 것이 없어요.';
  const first = summary.changed[0] || (summary.added[0] ? '더해질 것: ' + summary.added[0] : '빠질 것: ' + summary.removed[0]);
  const more = summary.changed.length + summary.added.length + summary.removed.length - 1;
  return `${first}${more > 0 ? ` 외 ${more}가지` : ''} — 적용할까요?`;
}
