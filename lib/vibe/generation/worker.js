// lease 기반 생성 작업자 — 한 job은 lease를 가진 worker 하나만 처리한다(WP7 job store의 CAS lease).
// 입력(학생 문장 등)은 job 봉투가 아닌 gen:input:{jobId}에 짧은 TTL로 두고, 종결되면 지운다.
// 작업자가 죽으면 lease(15초)가 만료되고, 다음 폴링(GET) 또는 runGenerationWorker 호출이 이어받는다.
// 이어받은 작업자도 이미 쓴 공급자 호출 수(callsUsed, 호출 전에 선기록)를 이어서 센다 → 재개해도 총 3회를 넘지 않는다.

import { JOB_TRANSITIONS, JOB_TERMINAL, diag } from '../../../public/vibe-v2/shared/contracts/schemas.js';
import { acquireSlot, releaseSlot, extendSlot, SLOT_DEFAULTS } from '../http/limits.js';
import { JobError } from '../jobs/store.js';
import { runPipeline, StopSignal, GEN_LIMITS, MESSAGES } from './orchestrator.js';
import { createBudget } from './budget.js';
import { createTracer } from './trace.js';

export const INPUT_TTL_MS = 2 * 3_600_000;
export const LEASE_MS = 15_000;
export const inputKey = id => `gen:input:${id}`;
export const supersedeKey = id => `gen:supersede:${id}`;

const isTerminal = s => JOB_TERMINAL.includes(s);

/** 비종결 상태 사이의 최단 합법 경로 (재개 시 현재 상태가 파이프라인 기대와 다를 수 있다) */
export function legalPath(from, to) {
  if (from === to) return [];
  const q = [[from]];
  const seen = new Set([from]);
  while (q.length) {
    const path = q.shift();
    const last = path[path.length - 1];
    for (const n of JOB_TRANSITIONS[last] || []) {
      if (seen.has(n)) continue;
      if (n === to) return path.slice(1).concat(n);
      if (isTerminal(n) || n === 'ready') continue;
      seen.add(n); q.push(path.concat(n));
    }
  }
  return null;
}

function slotPlan(o) {
  return [
    { scope: 'project', id: o.projectId, limit: SLOT_DEFAULTS.project },
    { scope: 'student', id: o.studentId, limit: SLOT_DEFAULTS.student },
    { scope: 'orgLlm', id: o.orgId || 'default', limit: o.orgLimit || SLOT_DEFAULTS.orgLlm },
  ];
}

/**
 * 같은 token으로 프로젝트·학생·조직 슬롯을 잡는다(zAcquire가 같은 멤버면 재진입 허용 → 재개한 작업자가 이어 쓸 수 있다).
 * @returns {Promise<{ok:true, release:Function, extend:Function} | {ok:false, retryAfterMs:number, scope:string}>}
 */
export async function acquireJobSlots(kv, o) {
  const held = [];
  for (const p of slotPlan(o)) {
    const r = await acquireSlot(kv, { ...p, token: o.token, leaseMs: o.leaseMs || SLOT_DEFAULTS.leaseMs, now: o.now });
    if (!r.ok) {
      for (const h of held) await releaseSlot(kv, { ...h, token: o.token });
      return { ok: false, retryAfterMs: r.retryAfterMs, scope: p.scope };
    }
    held.push(p);
  }
  return {
    ok: true,
    release: async () => { for (const h of held) await releaseSlot(kv, { ...h, token: o.token }); },
    extend: async () => { for (const h of held) await extendSlot(kv, { ...h, token: o.token, leaseMs: o.leaseMs || SLOT_DEFAULTS.leaseMs, now: o.now }); },
  };
}

export async function releaseJobSlots(kv, o) {
  for (const p of slotPlan(o)) await releaseSlot(kv, { ...p, token: o.token });
}

/**
 * @param {{ services:{kv:object, jobs:object, projects:object}, provider:object, workerId:string, jobId?:string|null,
 *           env?:object, now?:()=>number, log?:Function, limits?:object, sleep?:Function, watchMs?:number }} o
 * @returns {Promise<{status:'processed'|'idle'|'skipped'|'busy', jobId?:string, outcome?:string, reason?:string}>}
 */
export async function runGenerationWorker(o) {
  const { services, provider, workerId } = o;
  const { kv, jobs, projects } = services;
  const env = o.env || {};
  const now = o.now || Date.now;
  const L = { ...GEN_LIMITS, ...(o.limits || {}) };
  const tracer = createTracer(o.log || null, { env });

  // 1) lease
  let jobId = o.jobId || null;
  let lease;
  if (jobId) {
    lease = await jobs.lease(jobId, workerId, LEASE_MS);
    if (!lease.ok) return { status: 'skipped', jobId, reason: lease.reason };
  } else {
    for (const id of await jobs.reclaimable({ limit: 20 })) {
      if (!(await kv.get(inputKey(id)))) continue; // 생성 작업만
      const r = await jobs.lease(id, workerId, LEASE_MS);
      if (r.ok) { jobId = id; lease = r; break; }
    }
    if (!jobId) return { status: 'idle' };
  }

  const input = await kv.get(inputKey(jobId));
  let status = lease.job.status;
  const finish = async (to, extra = {}) => {
    try {
      const path = legalPath(status, to);
      if (!path) return;
      for (const step of path) {
        const job = await jobs.transition(jobId, step, { workerId, ...(step === to ? extra : {}) });
        status = job.status;
      }
    } catch (e) {
      if (!(e instanceof JobError)) throw e;
    }
  };
  if (!input) {
    await finish('failed', { diagnostics: [diag('GENERATION_INPUT_MISSING', { studentHint: MESSAGES.invalid })], studentMessage: MESSAGES.invalid });
    await jobs.release(jobId, workerId);
    return { status: 'processed', jobId, outcome: 'failed' };
  }

  const ids = { requestId: input.requestId, jobId, projectId: input.projectId };
  if (now() >= input.deadlineAt) {
    await finish('timed_out', { studentMessage: MESSAGES.timeout, diagnostics: [diag('DEADLINE_EXCEEDED', { studentHint: MESSAGES.timeout })] });
    tracer.trace({ ...ids, event: 'generation.done', outcome: 'timed_out', baseRevision: input.baseRevision, workerRef: tracer.projectRef(workerId) });
    await releaseJobSlots(kv, { token: input.slotToken, studentId: input.ownerId, projectId: input.projectId });
    await cleanup();
    return { status: 'processed', jobId, outcome: status };
  }

  const slots = await acquireJobSlots(kv, { token: input.slotToken, studentId: input.ownerId, projectId: input.projectId, now });
  if (!slots.ok) { await jobs.release(jobId, workerId); return { status: 'busy', jobId, reason: slots.scope }; }

  const student = { studentId: input.ownerId };
  const ctrl = new AbortController();
  let watcher = null;
  try {
    const got = await projects.getOwned(student, input.projectId);
    if (!got) {
      await finish('failed', { studentMessage: '작품을 찾을 수 없어요.', diagnostics: [diag('PROJECT_NOT_FOUND', { studentHint: '작품을 찾을 수 없어요.' })] });
      return { status: 'processed', jobId, outcome: status };
    }
    const project = got.envelope.project;

    const checkpoint = async () => {
      const job = await jobs.get(jobId);
      if (!job) return 'cancelled';
      status = job.status;
      if (isTerminal(job.status)) return job.status;
      if (await kv.get(supersedeKey(jobId))) { await finish('superseded', { studentMessage: MESSAGES.superseded }); return 'superseded'; }
      const cur = await projects.getOwned(student, input.projectId);
      if (!cur || cur.envelope.revision !== input.baseRevision) { await finish('superseded', { studentMessage: MESSAGES.superseded }); return 'superseded'; }
      const hb = await jobs.heartbeat(jobId, workerId, LEASE_MS);
      if (!hb.ok) return 'superseded'; // lease를 잃음 — 다른 작업자가 이어받았으므로 여기서 멈춘다(기록하지 않음)
      await slots.extend();
      return null;
    };
    const setState = async (to, extra) => {
      if (status === to) return;
      const path = legalPath(status, to);
      if (!path) return;
      try {
        for (const step of path) { const job = await jobs.transition(jobId, step, { workerId, ...(extra || {}) }); status = job.status; }
      } catch (e) {
        if (e instanceof JobError && (e.kind === 'ILLEGAL_TRANSITION' || e.kind === 'LEASE_HELD')) {
          const job = await jobs.get(jobId);
          throw new StopSignal(job && isTerminal(job.status) ? job.status : 'superseded');
        }
        throw e;
      }
    };
    // 호출 중 취소를 1초 간격으로 확인해 진행 중인 HTTP 요청을 끊는다
    watcher = setInterval(async () => {
      try { const j = await jobs.get(jobId); if (!j || isTerminal(j.status) || await kv.get(supersedeKey(jobId))) ctrl.abort(); } catch { /* 다음 주기 */ }
    }, o.watchMs || 1000);
    watcher.unref?.();

    const result = await runPipeline({
      project, intentText: input.intentText, provider, deadlineAt: input.deadlineAt, now, sleep: o.sleep,
      setState, checkpoint, callSignal: () => ctrl.signal,
      beforeCall: async n => { input.callsUsed = n; await kv.set(inputKey(jobId), input, { ttlMs: INPUT_TTL_MS }); },
      budget: createBudget(kv, { env, now }), trace: tracer.trace, limits: L, priorCalls: input.callsUsed || 0, env, ids,
    });

    const extra = { studentMessage: result.studentMessage || undefined, diagnostics: result.diagnostics, attempts: Math.min(3, result.attempts) };
    if (result.outcome === 'ready') await finish('ready', { ...extra, candidate: result.candidate });
    else if (result.outcome === 'failed' || result.outcome === 'timed_out') await finish(result.outcome, extra);
    else if (result.outcome === 'superseded' && !isTerminal(status)) await finish('superseded', { studentMessage: MESSAGES.superseded });
    return { status: 'processed', jobId, outcome: status };
  } finally {
    if (watcher) clearInterval(watcher);
    await slots.release();
    await cleanup();
  }

  async function cleanup() {
    const job = await jobs.get(jobId);
    if (job && (isTerminal(job.status) || job.status === 'ready')) {
      await kv.del(inputKey(jobId)); // 학생 문장은 결과가 나오면 바로 지운다
      await kv.del(supersedeKey(jobId));
    }
    await jobs.release(jobId, workerId);
  }
}
