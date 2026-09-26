// 후보 검증 파이프라인 — V1 형식 → V2 적용(사본)+의미 → V4 결정적 시뮬레이션 → V6 의도·보존.
// 원본 프로젝트는 절대 바꾸지 않는다(applyPatch는 순수 함수). 통과한 후보만 서버에 보관된다.

import crypto from 'node:crypto';
import { applyPatch, diffPrograms } from '../../../public/vibe-v2/shared/contracts/patch-apply.js';
import { validatePatchShape, diag, LIMITS } from '../../../public/vibe-v2/shared/contracts/schemas.js';
import { checkStudioSemantics } from '../../../public/vibe-v2/shared/compiler/semantic.js';
import { simulate } from '../../../public/vibe-v2/shared/runtime/simulate.js';
import { instantiate as instantiateTemplateFn, checkTemplateParams, TEMPLATES } from '../../../public/vibe-v2/shared/templates/index.js';
import { ALLOWED_PRESETS, nodeLabel, paramLabel, describeNode, entityName, josa, changeSentence } from './vocab.js';

export const VALIDATOR_VERSION = 'val-1';
export const SIM_SEED = 20260926;
export const SIM_TICKS = 600;

/** 수리하지 않는 실패(권한·금지 내용·미지원) — 즉시 중단 */
export const NON_REPAIRABLE = new Set([
  'FORBIDDEN_CONTENT', 'OPERATION_NOT_ALLOWED', 'PARAMETER_NOT_EDITABLE', 'NODE_KIND_NOT_ALLOWED', 'PRESET_NOT_ALLOWED',
  'TEMPLATE_MODE_MISMATCH', 'UNKNOWN_TEMPLATE', 'ASSET_REQUEST_NOT_ALLOWED', 'REVISION_CONFLICT', 'TOO_MANY_OPERATIONS',
  'MODEL_UNSUPPORTED', 'PROJECT_TOO_LARGE',
]);

const FORBIDDEN_RE = /(https?:|\/\/|data:|javascript:|file:|<\s*\/?\s*script|<\s*img|onerror\s*=|\beval\s*\(|\bfetch\s*\(|import\s*\()/i;
const KNOWN_OPS = new Set(['setParameter', 'addBehavior', 'removeBehavior', 'setAppearance', 'instantiateTemplate']);

/** 키 정렬 JSON (후보 hash용) */
export function canonicalJson(v) {
  if (Array.isArray(v)) return '[' + v.map(canonicalJson).join(',') + ']';
  if (v && typeof v === 'object') return '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + canonicalJson(v[k])).join(',') + '}';
  return JSON.stringify(v);
}
export function patchHash(patch) { return crypto.createHash('sha256').update(canonicalJson(patch)).digest('hex'); }

function strings(v, out = []) {
  if (typeof v === 'string') out.push(v);
  else if (Array.isArray(v)) v.forEach(x => strings(x, out));
  else if (v && typeof v === 'object') Object.values(v).forEach(x => strings(x, out));
  return out;
}

/** V1: 형식 + 금지 내용 + 허용 op */
function stageV1(patch, { allowTemplate }) {
  const d = [];
  if (!patch || typeof patch !== 'object') return [diag('PATCH_SCHEMA_INVALID', { message: 'not an object' })];
  const ops = Array.isArray(patch.operations) ? patch.operations : [];
  if (ops.length > LIMITS.patchOperations) d.push(diag('TOO_MANY_OPERATIONS', { message: `${ops.length} > ${LIMITS.patchOperations}`, studentHint: '한 번에 너무 많이 바꾸려고 했어요. 나눠서 말해 줘.' }));
  ops.forEach((op, i) => {
    if (!op || !KNOWN_OPS.has(op.op)) d.push(diag('OPERATION_NOT_ALLOWED', { path: `$.operations[${i}].op`, message: String(op?.op).slice(0, 40) }));
    else if (op.op === 'instantiateTemplate' && !allowTemplate) d.push(diag('OPERATION_NOT_ALLOWED', { path: `$.operations[${i}]`, message: 'instantiateTemplate would replace the current game', studentHint: '지금 게임을 통째로 바꾸지는 않아요.' }));
    if (op?.op === 'setAppearance' && typeof op.preset === 'string' && !ALLOWED_PRESETS.has(op.preset)) d.push(diag('PRESET_NOT_ALLOWED', { nodeId: op.nodeId ?? null, path: `$.operations[${i}].preset`, message: 'preset not in allow-list', studentHint: '준비된 그림 중에서만 고를 수 있어요.' }));
  });
  if (strings(patch.operations).some(s => FORBIDDEN_RE.test(s))) d.push(diag('FORBIDDEN_CONTENT', { path: '$.operations', message: 'url/script-like text in operations', studentHint: '링크나 코드는 작품에 넣을 수 없어요.' }));
  if (Array.isArray(patch.assetRequests) && patch.assetRequests.length) d.push(diag('ASSET_REQUEST_NOT_ALLOWED', { path: '$.assetRequests' }));
  if (d.some(x => NON_REPAIRABLE.has(x.code))) return d;
  d.push(...validatePatchShape(patch));
  for (const [i, op] of ops.entries()) {
    if (op?.op === 'instantiateTemplate') for (const x of checkTemplateParams(op.templateId, op.params)) d.push({ ...x, path: `$.operations[${i}]` + x.path.slice(1) });
  }
  return d;
}

const errorsOf = ds => ds.filter(x => x.severity === 'error');
const codeKey = x => `${x.code}|${x.nodeId}`;

/** 장르별 smoke 입력: 좌우 왕복(가로 이동) 또는 사방 순회 */
export function smokeInputs(project) {
  const player = project.program.nodes.find(n => n.kind === 'player');
  const script = [];
  const dirs = player?.args.movement === 'fourWay' ? ['right', 'down', 'left', 'up'] : ['left', 'right'];
  let prev = null;
  for (let t = 0, k = 0; t < SIM_TICKS; t += 45, k++) {
    const c = dirs[k % dirs.length];
    if (prev) script.push({ tick: t, control: prev, pressed: false });
    script.push({ tick: t, control: c, pressed: true });
    prev = c;
  }
  return script;
}

function runSim(project) {
  return simulate(project, { seed: SIM_SEED, ticks: SIM_TICKS, inputScript: smokeInputs(project) });
}

/** V4: 결정적 시뮬레이션. 기존 작품보다 나빠진 것만 실패로 본다. */
function stageV4(before, next) {
  const d = [];
  const b = before.program.nodes.some(n => n.kind === 'player') ? runSim(before) : null;
  const a = runSim(next);
  if (!a.finalSnapshot) return { diagnostics: [diag('SIM_FAILED', { message: 'no snapshot', studentHint: '게임을 실행하지 못했어요.' })], sim: null };
  const aErr = errorsOf(a.diagnostics).filter(x => !(b && errorsOf(b.diagnostics).some(y => codeKey(y) === codeKey(x))));
  for (const x of aErr) d.push({ ...x, code: x.code.startsWith('SIM_') ? x.code : 'SIM_' + x.code.slice(0, 36) });
  const halted = a.trace.find(e => e.type === 'halt');
  if (halted && !(b && b.trace.some(e => e.type === 'halt'))) d.push(diag('SIM_HALTED', { message: `runtime halted: ${halted.code}`, studentHint: '게임이 너무 복잡해져서 멈췄어요.' }));
  const endAt = a.trace.find(e => e.type === 'win' || e.type === 'lose');
  const bEnd = b && b.trace.find(e => e.type === 'win' || e.type === 'lose');
  if (endAt && endAt.tick <= 30 && !(bEnd && bEnd.tick <= 30)) d.push(diag('SIM_ENDS_IMMEDIATELY', { message: `${endAt.type} at tick ${endAt.tick}`, studentHint: '시작하자마자 게임이 끝나요.' }));
  const spawners = next.program.nodes.filter(n => n.kind === 'spawner' && n.args.intervalMs <= 9000);
  const spawned = new Set(a.trace.filter(e => e.type === 'spawn').map(e => e.entity));
  const spawnedBefore = b ? new Set(b.trace.filter(e => e.type === 'spawn').map(e => e.entity)) : new Set();
  const endedEarly = !!endAt && endAt.tick < SIM_TICKS - 1;
  for (const s of spawners) {
    const isNew = !before.program.nodes.some(n => n.id === s.id);
    const neverRefills = s.args.count === 0 && s.args.refill === false;
    if (!spawned.has(s.args.entity) && !neverRefills && !endedEarly && (isNew || spawnedBefore.has(s.args.entity))) {
      d.push(diag('SIM_NOTHING_SPAWNS', { nodeId: s.id, message: `${s.args.entity} never spawned in ${SIM_TICKS} ticks`, studentHint: `${entityName(s.args.entity)}이(가) 나오지 않아요.` }));
    }
  }
  const s = a.finalSnapshot;
  return { diagnostics: d, sim: { state: s.state, tick: s.tick, score: s.score, lives: s.lives, events: a.trace.length } };
}

const GOAL_KINDS = new Set(['winWhen', 'loseWhen']);

/** V6: 의도·보존 invariant (요청과 무관한 삭제·에셋 변경·목표 변경, 요청한 변경 미반영) */
function stageV6(before, next, patch, expect) {
  const d = [];
  const diff = diffPrograms(before, next);
  const byIdB = new Map(before.program.nodes.map(n => [n.id, n]));
  const byIdA = new Map(next.program.nodes.map(n => [n.id, n]));
  const templateOp = patch.operations.some(o => o.op === 'instantiateTemplate');
  const hadGame = before.program.nodes.some(n => n.kind === 'player');
  if (templateOp && hadGame && !expect.allowTemplate) d.push(diag('INVARIANT_TEMPLATE_REPLACE', { message: 'template would replace existing game', studentHint: '지금 게임을 통째로 바꾸지는 않아요.' }));
  if (templateOp) {
    if (expect.genre) {
      const tid = patch.operations.find(o => o.op === 'instantiateTemplate').templateId;
      if (tid !== expect.genre) d.push(diag('INTENT_GENRE_MISMATCH', { message: `${tid} != ${expect.genre}`, studentHint: `'${TEMPLATES[expect.genre]?.title}'을(를) 만들어야 해요.` }));
    }
    return { diagnostics: d, diff };
  }
  // 같은 종류·같은 대상의 노드로 바꿔 끼운 것은 삭제가 아니라 수정이다(예: 사과 점수 1→2 = onTouch 교체)
  const replaced = id => {
    const n = byIdB.get(id);
    return ['onTouch', 'spawner'].includes(n.kind) && diff.added.some(a => byIdA.get(a).kind === n.kind && byIdA.get(a).args.entity === n.args.entity);
  };
  for (const id of diff.removed) {
    const n = byIdB.get(id);
    if (replaced(id)) continue;
    if (['player', 'world'].includes(n.kind)) d.push(diag('INVARIANT_CORE_REMOVED', { nodeId: id, message: `${n.kind} removed`, studentHint: '주인공이나 무대는 지울 수 없어요.' }));
    else if (!expect.allowRemove) d.push(diag('INVARIANT_UNREQUESTED_REMOVE', { nodeId: id, message: `${n.kind} ${id} removed without request`, studentHint: `'${describeNode(n)}' 규칙은 그대로 둬야 해요.` }));
  }
  if (!expect.allowGoal) {
    const goalTouched = diff.removed.some(id => GOAL_KINDS.has(byIdB.get(id).kind)) || diff.added.some(id => GOAL_KINDS.has(byIdA.get(id).kind))
      || diff.changed.some(c => GOAL_KINDS.has(byIdB.get(c.nodeId)?.kind) || (byIdB.get(c.nodeId)?.kind === 'world' && c.parameter === 'timeLimitSec'));
    if (goalTouched) d.push(diag('INVARIANT_GOAL_CHANGED', { message: 'win/lose/time changed without request', studentHint: '이기고 지는 규칙은 그대로 둬야 해요.' }));
  }
  if (!expect.allowAssets) {
    const aB = new Map(before.assets.map(a => [a.slotId, a])), aA = new Map(next.assets.map(a => [a.slotId, a]));
    for (const [slot, a] of aB) {
      const x = aA.get(slot);
      if (!x || x.preset !== a.preset || x.assetId !== a.assetId) { d.push(diag('INVARIANT_ASSET_CHANGED', { path: `$.assets.${slot}`, message: `asset ${slot} changed without request`, studentHint: '모습은 그대로 둬야 해요.' })); break; }
    }
  }
  for (const k of expect.keepParams || []) {
    if (diff.changed.some(c => c.nodeId === k.nodeId && c.parameter === k.param)) d.push(diag('INVARIANT_KEEP_VIOLATED', { nodeId: k.nodeId, path: `$.${k.nodeId}.${k.param}`, message: `${k.param} should stay`, studentHint: '그대로 두라고 한 값이 바뀌었어요.' }));
  }
  for (const tg of expect.targets || []) {
    const ch = diff.changed.find(c => c.nodeId === tg.nodeId && c.parameter === tg.param);
    const ok = ch && (tg.direction === 'set' ? (tg.value === undefined || ch.after === tg.value)
      : tg.direction === 'increase' ? Number(ch.after) > Number(ch.before)
        : tg.direction === 'decrease' ? Number(ch.after) < Number(ch.before) : true);
    if (!ok) d.push(diag('INTENT_NOT_MET', { nodeId: tg.nodeId, path: `$.${tg.nodeId}.${tg.param}`, message: `expected ${tg.param} ${tg.direction}${tg.value !== undefined ? ' ' + tg.value : ''}`, studentHint: '요청한 변화가 반영되지 않았어요.' }));
  }
  return { diagnostics: d, diff };
}

function fmt(v) {
  if (Array.isArray(v)) return `${v.length}줄`;
  if (typeof v === 'boolean') return v ? '켜기' : '끄기';
  return v === undefined || v === null ? '없음' : String(v);
}

/** 학생용 변경 요약 ("사과 속도 120→84"), 최대 20개·80자 */
export function studentChanges(before, next, diff, patch) {
  const byIdB = new Map(before.program.nodes.map(n => [n.id, n]));
  const byIdA = new Map(next.program.nodes.map(n => [n.id, n]));
  const out = [];
  const tpl = patch.operations.find(o => o.op === 'instantiateTemplate');
  if (tpl) out.push(`새 게임: ${TEMPLATES[tpl.templateId]?.title || tpl.templateId}`);
  else {
    for (const c of diff.changed) {
      if (c.parameter === '(children)' || c.parameter === 'appearance' || c.parameter === 'background') continue;
      const n = byIdB.get(c.nodeId);
      const who = ['stats', 'world', 'winWhen', 'loseWhen'].includes(n.kind) ? '' : nodeLabel(n) + ' ';
      out.push(`${who}${paramLabel(n.kind, c.parameter)} ${fmt(c.before)}→${fmt(c.after)}`);
    }
    for (const id of diff.added) out.push(`새 규칙: ${describeNode(byIdA.get(id))}`);
    for (const id of diff.removed) out.push(`뺀 규칙: ${describeNode(byIdB.get(id))}`);
    const aB = new Map(before.assets.map(a => [a.slotId, a]));
    for (const a of next.assets) {
      const p = aB.get(a.slotId);
      if (p && p.preset !== a.preset) out.push(`${slotLabel(a.slotId, byIdA)} 모습 ${presetText(p.preset)}→${presetText(a.preset)}`);
      else if (!p && !diff.added.some(id => byIdA.get(id)?.args?.appearance === a.slotId)) out.push(`${slotLabel(a.slotId, byIdA)} 모습 ${presetText(a.preset)}`);
    }
  }
  return out.slice(0, 20).map(s => s.slice(0, 80));
}

function presetText(p) { return String(p || '').replace(/^emoji:/, '').replace(/^bg-/, '배경 '); }
function slotLabel(slot, byId) {
  for (const n of byId.values()) if (n.args?.appearance === slot || n.args?.background === slot) return nodeLabel(n);
  return slot;
}

/** 학생용 한 문장 요약 — 서버가 만든다(모델 summary는 표시하지 않는다: 인젝션 문장 노출 방지). */
export function studentSummary(changes, patch, before, diff) {
  const tpl = patch.operations.find(o => o.op === 'instantiateTemplate');
  if (tpl) return `${josa(TEMPLATES[tpl.templateId]?.title || '새 게임', '을를')} 만들었어요.`;
  if (!changes.length) return '작품을 바꿨어요.';
  const byIdB = new Map(before.program.nodes.map(n => [n.id, n]));
  const byIdA = new Map(patch.operations.filter(o => o.op === 'addBehavior').map(o => [o.node.id, o.node]));
  const addedTouch = diff.added.map(id => byIdA.get(id)).find(n => n?.kind === 'onTouch') || byIdA.get(diff.added[0]);
  const first = diff.changed.find(c => byIdB.has(c.nodeId) && !['(children)', 'appearance', 'background'].includes(c.parameter));
  let s;
  if (addedTouch) s = `새 규칙 '${describeNode(addedTouch)}'을 넣었어요.`;
  else if (first) s = changeSentence(byIdB.get(first.nodeId), first.parameter, first.before, first.after);
  else if (diff.removed.length) s = `'${describeNode(byIdB.get(diff.removed[0]))}' 규칙을 뺐어요.`;
  else s = `모습을 바꿨어요: ${changes[0]}`;
  if (changes.length > 1) s = `${changes.length}가지를 바꿨어요 — ${s}`;
  return s.slice(0, 120);
}

/**
 * @param {{ project:object, patch:object, expect:object, instantiate?:Function, now?:string }} p
 * @returns {{ ok:boolean, stage:string|null, diagnostics:object[], warnings:object[], codes:string[], repairable:boolean,
 *             candidate?:{hash:string, patch:object, changes:string[]}, next?:object, sim?:object }}
 */
export function validateCandidate({ project, patch, expect = {}, instantiate = instantiateTemplateFn, now }) {
  const failed = (stage, ds) => {
    const errs = errorsOf(ds).slice(0, 20);
    return { ok: false, stage, diagnostics: errs, warnings: [], codes: [...new Set(errs.map(x => x.code))], repairable: !errs.some(x => NON_REPAIRABLE.has(x.code)) };
  };
  const v1 = errorsOf(stageV1(patch, expect));
  if (v1.length) return failed('V1', v1);

  const applied = applyPatch(project, { ...patch, baseRevision: project.revision }, { instantiate, now });
  if (!applied.ok) return failed('V2', applied.diagnostics);
  const next = applied.project;
  const semB = errorsOf(checkStudioSemantics(project));
  const semA = checkStudioSemantics(next);
  const newSem = errorsOf(semA).filter(x => !semB.some(y => codeKey(y) === codeKey(x)));
  if (newSem.length) return failed('V2', newSem);

  const v4 = stageV4(project, next);
  if (errorsOf(v4.diagnostics).length) return failed('V4', v4.diagnostics);

  const v6 = stageV6(project, next, patch, expect);
  if (errorsOf(v6.diagnostics).length) return failed('V6', v6.diagnostics);

  const changes = studentChanges(project, next, v6.diff, patch);
  const finalPatch = { ...patch, baseRevision: project.revision, summary: studentSummary(changes, patch, project, v6.diff) };
  return {
    ok: true, stage: null, diagnostics: [], codes: [], repairable: false,
    warnings: semA.filter(x => x.severity === 'warning').slice(0, 20),
    candidate: { hash: patchHash(finalPatch), patch: finalPatch, changes },
    next, sim: v4.sim,
  };
}
