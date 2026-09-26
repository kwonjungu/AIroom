// 게임 공방 판단 로직 (순수) — 실행 검증, AI 결과 적용 결정, 편집 사전 검사, 키 입력 매핑. WP3.
// DOM·store 없이 테스트할 수 있게 입력을 값으로만 받는다.

import { applyPatch } from '../../shared/contracts/patch-apply.js';
import { validateProject } from '../../shared/contracts/schemas.js';
import { checkStudioSemantics } from '../../shared/compiler/semantic.js';
import { simulate } from '../../shared/runtime/simulate.js';
import { summarizeChange } from './compare.js';

export const SMOKE_TICKS = 300;   // 5초 (입력 없음)

const errorsOf = ds => (ds || []).filter(d => d.severity === 'error');

/** legacySource만 있는(새 무대로 실행할 수 없는) 작품 */
export function isLegacyOnly(project) {
  const nodes = project?.program?.nodes || [];
  return nodes.some(n => n.kind === 'legacySource') && !nodes.some(n => n.kind === 'player');
}

/**
 * 실행 검증 (V1 구조 + V2 의미 + V4 짧은 결정적 시뮬레이션).
 * @returns {{ok:boolean, stage:'structure'|'semantic'|'simulate'|'legacy'|null, diagnostics:object[], hint:string, snapshot?:object}}
 */
export function verifyProject(project, { ticks = SMOKE_TICKS, seed = 1 } = {}) {
  const v = errorsOf(validateProject(project));
  if (v.length) return { ok: false, stage: 'structure', diagnostics: v, hint: v[0].studentHint || '작품 모양이 올바르지 않아요.' };
  if (isLegacyOnly(project)) return { ok: false, stage: 'legacy', diagnostics: [], hint: '예전 방식으로 만든 게임이라 새 무대에서는 실행할 수 없어요.' };
  const sem = errorsOf(checkStudioSemantics(project));
  if (sem.length) return { ok: false, stage: 'semantic', diagnostics: sem, hint: sem[0].studentHint || '게임 규칙이 서로 맞지 않아요.' };
  const r = simulate(project, { seed, ticks });
  const simErr = errorsOf(r.diagnostics);
  if (!r.finalSnapshot || r.finalSnapshot.state === 'halted' || simErr.length) {
    const d = simErr[0] || r.finalSnapshot?.diagnostics?.[0];
    return { ok: false, stage: 'simulate', diagnostics: simErr, hint: d?.studentHint || '게임을 돌려 보니 멈춰 버렸어요.', snapshot: r.finalSnapshot };
  }
  return { ok: true, stage: null, diagnostics: [], hint: '', snapshot: r.finalSnapshot };
}

/**
 * 수동 편집(규칙 카드) 사전 검사: 적용하면 규칙이 성립하는지 먼저 본다. 실패면 적용하지 않는다.
 * @returns {{ok:true, preview:object} | {ok:false, hint:string, diagnostics:object[]}}
 */
export function preflightEdit(project, operations, summary = '직접 바꿨어요.') {
  const patch = { schemaVersion: 1, baseRevision: project.revision, summary: summary.slice(0, 120), operations, assetRequests: [] };
  const r = applyPatch(project, patch);
  if (!r.ok) return { ok: false, hint: r.diagnostics[0]?.studentHint || '그 값으로는 바꿀 수 없어요.', diagnostics: r.diagnostics, patch };
  const sem = errorsOf(checkStudioSemantics(r.project));
  if (sem.length) return { ok: false, hint: sem[0].studentHint || '그렇게 바꾸면 게임 규칙이 맞지 않아요.', diagnostics: sem, patch };
  return { ok: true, preview: r.project, patch };
}

// ── AI 작업 ──

/** Job 상태 → 셸 AI 상태 표시 */
export function aiStatusFor(status) {
  switch (status) {
    case 'queued': case 'planning': return 'preparing';
    case 'generating': case 'repairing': return 'assembling';
    case 'validating': return 'checking';
    case 'ready': return 'done';
    case 'failed': case 'timed_out': return 'failed';
    default: return 'idle';     // cancelled·superseded·applied
  }
}

export const AI_MESSAGES = Object.freeze({
  conflict: '그 사이 작품이 바뀌었어요. 다시 요청해 볼까?',
  failed: 'AI가 이번엔 못 만들었어요. 지금 작품은 그대로예요.',
  timeout: '시간이 너무 오래 걸렸어요. 지금 작품은 그대로예요.',
  cancelled: '요청을 취소했어요. 지금 작품은 그대로예요.',
  superseded: '새 요청을 받아서 앞의 요청은 멈췄어요.',
  network: '인터넷 연결이 불안정해서 AI에게 못 물어봤어요. 지금 작품은 그대로예요.',
  invalid: '고친 게임이 제대로 안 돌아가서 적용하지 않았어요. 지금 작품은 그대로예요.',
  empty: 'AI가 바꿀 것을 찾지 못했어요. 조금 다르게 말해 볼까?',
  otherProject: '',
});

/**
 * AI 작업 결과를 어떻게 다룰지 결정한다. 적용은 절대 여기서 하지 않는다(비교 화면 → 학생 선택 → 적용).
 * @param {{job:object|null, error?:any, request:{projectId:string, baseRevision:number, requestId:string, cancelled?:boolean}|null,
 *          current:object, grade?:string}} a
 * @returns {{action:'compare'|'conflict'|'reject'|'failed'|'timeout'|'cancelled'|'superseded'|'network'|'ignore', message:string,
 *            preview?:object, summary?:object, patch?:object, diagnostics?:object[]}}
 */
export function decideAiResult({ job, error, request, current, grade = 'mid' }) {
  if (!request || request.cancelled) return { action: 'ignore', message: '' };
  if (!current || request.projectId !== current.id) return { action: 'ignore', message: AI_MESSAGES.otherProject };
  if (error) {
    if (error.name === 'AbortError') return { action: 'ignore', message: '' };
    return { action: 'network', message: AI_MESSAGES.network };
  }
  if (!job) return { action: 'network', message: AI_MESSAGES.network };
  if (job.projectId !== current.id || job.requestId !== request.requestId) return { action: 'ignore', message: '' };
  switch (job.status) {
    case 'failed': return { action: 'failed', message: job.studentMessage || AI_MESSAGES.failed, diagnostics: job.diagnostics || [] };
    case 'timed_out': return { action: 'timeout', message: AI_MESSAGES.timeout };
    case 'cancelled': return { action: 'cancelled', message: AI_MESSAGES.cancelled };
    case 'superseded': return { action: 'superseded', message: AI_MESSAGES.superseded };
    case 'ready': break;
    default: return { action: 'network', message: AI_MESSAGES.network };   // 종결되지 않은 상태로 끝남 → 성공으로 치지 않는다
  }
  const patch = job.candidate?.patch;
  if (!patch) return { action: 'reject', message: AI_MESSAGES.invalid };
  if (patch.baseRevision !== current.revision || job.baseRevision !== current.revision) return { action: 'conflict', message: AI_MESSAGES.conflict };
  const r = applyPatch(current, patch);
  if (!r.ok) {
    const conflict = r.diagnostics.some(d => d.code === 'REVISION_CONFLICT');
    return conflict ? { action: 'conflict', message: AI_MESSAGES.conflict } : { action: 'reject', message: AI_MESSAGES.invalid, diagnostics: r.diagnostics };
  }
  const v = verifyProject(r.project);
  if (!v.ok) return { action: 'reject', message: AI_MESSAGES.invalid, diagnostics: v.diagnostics };
  const summary = summarizeChange(current, r.project, grade);
  if (summary.empty) return { action: 'reject', message: AI_MESSAGES.empty };
  return { action: 'compare', message: job.studentMessage || '', preview: r.project, summary, patch };
}

/**
 * 비교 화면에서 "적용"을 눌렀을 때. store.applyPatch만 쓴다(revision이 달라졌으면 store가 거부).
 * @param {{applyPatch:Function, getProject:Function}} store
 * @returns {{ok:true, revision:number} | {ok:false, conflict:boolean, message:string}}
 */
export function applyCandidate(store, patch) {
  const before = store.getProject();
  if (!patch || patch.baseRevision !== before.revision) return { ok: false, conflict: true, message: AI_MESSAGES.conflict };
  const r = store.applyPatch(patch, { source: 'ai' });
  if (!r.ok) {
    const conflict = r.diagnostics.some(d => d.code === 'REVISION_CONFLICT');
    return { ok: false, conflict, message: conflict ? AI_MESSAGES.conflict : AI_MESSAGES.invalid };
  }
  return { ok: true, revision: store.getProject().revision };
}

// ── 입력 ──

const KEY_CONTROLS = {
  ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down',
  KeyA: 'left', KeyD: 'right', KeyW: 'up', KeyS: 'down',
};
const KEY_FALLBACK = { a: 'left', d: 'right', w: 'up', s: 'down', A: 'left', D: 'right', W: 'up', S: 'down', Left: 'left', Right: 'right', Up: 'up', Down: 'down' };

/** 키 이벤트 → control (없으면 null). 한글 자판에서도 물리 키(code) 기준으로 동작한다. */
export function keyToControl(e) {
  if (!e || e.ctrlKey || e.metaKey || e.altKey) return null;
  return KEY_CONTROLS[e.code] || KEY_FALLBACK[e.key] || null;
}

/** 글을 쓰는 중인 요소면 게임 키를 쓰지 않는다 */
export function isTypingTarget(el) {
  if (!el) return false;
  const tag = String(el.tagName || '').toUpperCase();
  if (tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (tag === 'INPUT') return true;   // range 포함: 슬라이더의 방향키를 빼앗지 않는다
  if (el.isContentEditable) return true;
  const ce = el.getAttribute?.('contenteditable');
  return ce === '' || ce === 'true';
}

/** 게임 결과 → 학생 문구 */
export function endMessage(snapshot) {
  if (!snapshot) return { title: '', text: '' };
  const lastEnd = [...(snapshot.events || [])].reverse().find(e => e.type === 'win' || e.type === 'lose');
  if (snapshot.state === 'won') {
    if (lastEnd?.reason === 'survivedSec') return { title: '🎉 성공!', text: '끝까지 버텼어요!' };
    if (lastEnd?.reason === 'reachedExit') return { title: '🎉 성공!', text: '도착했어요!' };
    return { title: '🎉 성공!', text: `점수 ${snapshot.score}` };
  }
  if (snapshot.state === 'lost') {
    const why = lastEnd?.reason === 'timeUp' ? '시간이 끝났어요.' : lastEnd?.reason === 'livesZero' ? '목숨을 다 썼어요.' : '아쉽게 졌어요.';
    return { title: '다시 해 볼까?', text: `${why} 점수 ${snapshot.score}` };
  }
  if (snapshot.state === 'halted') {
    const d = snapshot.diagnostics?.[snapshot.diagnostics.length - 1];
    return { title: '게임을 잠깐 멈췄어요', text: d?.studentHint || '규칙이 너무 많은 일을 해서 멈췄어요.' };
  }
  return { title: '', text: '' };
}

let reqSeq = 0;
/** 요청 id (JobSchema requestId) */
export function newRequestId() {
  reqSeq = (reqSeq + 1) % 1e6;
  return `r_${Date.now().toString(36)}${reqSeq.toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}
