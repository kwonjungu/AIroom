// 영속 생성 작업 저장소 — Vercel 다중 인스턴스에서도 한 job을 한 worker만 처리하도록 lease를 CAS로 관리한다.
//
// 키:
//   job:{jobId}                   봉투 {revision, job(JobSchema), ownerId, classId, lease, applyLock, appliedRevision, events, nextSeq}
//   jobreq:{ownerId}:{requestId}  jobId  (생성 멱등, nx)
//   jobs:active                   zset(score=생성시각, member=jobId) — 비종결 작업. claimNext/회수 대상
//
// 상태 전이는 JOB_TRANSITIONS만 허용. 'applied'는 apply 경로(beginApply/finishApply)로만 도달한다.

import { JOB_TRANSITIONS, JOB_TERMINAL, validateJob } from '../../../public/vibe-v2/shared/contracts/schemas.js';
import { randomId } from '../auth/tokens.js';

const JOB_TTL_MS = 24 * 3_600_000;
const MAX_EVENTS = 100;
const CAS_TRIES = 8;
const REQUEST_ID = /^[A-Za-z0-9_-]{8,64}$/;

export class JobError extends Error {
  /** @param {'NOT_FOUND'|'ILLEGAL_TRANSITION'|'LEASE_HELD'|'NOT_LEASED'|'APPLYING'|'NOT_READY'|'INVALID'|'BUSY'} kind */
  constructor(kind, message) { super(message || kind); this.kind = kind; }
}

const clone = v => JSON.parse(JSON.stringify(v));

/**
 * @param {object} kv
 * @param {{ now?: () => number }} [opts]
 */
export function createJobStore(kv, opts = {}) {
  const now = opts.now || Date.now;
  const iso = () => new Date(now()).toISOString();
  const key = id => `job:${id}`;
  const isTerminal = s => JOB_TERMINAL.includes(s);
  const leaseLive = env => !!(env.lease && env.lease.expiresAt > now());

  async function envelope(jobId) {
    if (typeof jobId !== 'string' || !/^j_[A-Za-z0-9_-]{4,40}$/.test(jobId)) return null;
    return kv.get(key(jobId));
  }

  /** 봉투를 CAS로 갱신. mutate(env)는 변경된 env를 돌려주거나(같은 객체 가능) JobError를 던진다. null이면 변경 없음. */
  async function update(jobId, mutate) {
    for (let i = 0; i < CAS_TRIES; i++) {
      const cur = await envelope(jobId);
      if (!cur) throw new JobError('NOT_FOUND');
      const draft = clone(cur);
      const next = mutate(draft);
      if (next === null) return cur;
      next.revision = cur.revision + 1;
      next.job.updatedAt = iso();
      const errs = validateJob(next.job);
      if (errs.length) throw new JobError('INVALID', errs[0].path + ' ' + errs[0].message);
      const r = await kv.casJson(key(jobId), cur.revision, next, { ttlMs: JOB_TTL_MS });
      if (r.ok) {
        if (isTerminal(next.job.status) && !isTerminal(cur.job.status)) await kv.zrem('jobs:active', jobId);
        return next;
      }
      await new Promise(res => setTimeout(res, 2 + Math.random() * 10));
    }
    throw new JobError('BUSY', 'job update contention');
  }

  function pushEvent(env, status, message) {
    env.events.push({ seq: env.nextSeq, status, studentMessage: message ?? env.job.studentMessage, at: iso() });
    env.nextSeq += 1;
    if (env.events.length > MAX_EVENTS) env.events = env.events.slice(-MAX_EVENTS);
  }

  /**
   * 생성 — (ownerId, requestId)로 멱등. 같은 requestId 재전송이면 기존 job을 돌려준다.
   * @param {{ ownerId:string, classId?:string|null, projectId:string, baseRevision:number, requestId:string, studentMessage?:string }} p
   * @returns {Promise<{created:boolean, job:object}>}
   */
  async function create(p) {
    if (!REQUEST_ID.test(String(p.requestId || ''))) throw new JobError('INVALID', 'requestId');
    const jobId = randomId('j_', 12);
    const reqKey = `jobreq:${p.ownerId}:${p.requestId}`;
    const won = await kv.set(reqKey, { jobId }, { nx: true, ttlMs: JOB_TTL_MS });
    if (!won) {
      const prev = await kv.get(reqKey);
      const env = prev ? await envelope(prev.jobId) : null;
      if (env) return { created: false, job: env.job };
      throw new JobError('BUSY', 'job being created');
    }
    const t = iso();
    const job = {
      jobId, projectId: p.projectId, baseRevision: p.baseRevision, requestId: p.requestId, status: 'queued',
      studentMessage: (p.studentMessage || '요청을 받았어요.').slice(0, 120), candidate: null, diagnostics: [], attempts: 0,
      createdAt: t, updatedAt: t,
    };
    const errs = validateJob(job);
    if (errs.length) { await kv.del(reqKey); throw new JobError('INVALID', errs[0].path + ' ' + errs[0].message); }
    const env = {
      revision: 0, job, ownerId: p.ownerId, classId: p.classId ?? null, lease: null, applyLock: null,
      appliedRevision: null, events: [], nextSeq: 1,
    };
    pushEvent(env, 'queued');
    const r = await kv.casJson(key(jobId), null, env, { ttlMs: JOB_TTL_MS });
    if (!r.ok) throw new JobError('BUSY', 'id collision');
    await kv.zadd('jobs:active', now(), jobId);
    return { created: true, job };
  }

  /** 소유자 검사 포함 조회. 남의 것이면 null (존재 여부 숨김) */
  async function get(jobId, { ownerId } = {}) {
    const env = await envelope(jobId);
    if (!env) return null;
    if (ownerId !== undefined && env.ownerId !== ownerId) return null;
    return env.job;
  }

  /** 이벤트 cursor 조회 — after 이후 이벤트만 */
  async function events(jobId, { ownerId, after = 0 } = {}) {
    const env = await envelope(jobId);
    if (!env || (ownerId !== undefined && env.ownerId !== ownerId)) return null;
    const list = env.events.filter(e => e.seq > after);
    return { job: env.job, events: list, cursor: env.nextSeq - 1 };
  }

  /**
   * 상태 전이 (worker용). lease가 살아 있으면 lease 보유 worker만 전이할 수 있다.
   * @param {string} jobId
   * @param {string} to
   * @param {{ workerId?:string, candidate?:object, diagnostics?:object[], studentMessage?:string, attempts?:number }} [o]
   */
  async function transition(jobId, to, o = {}) {
    if (to === 'applied') throw new JobError('ILLEGAL_TRANSITION', 'applied is reachable only through apply');
    const env = await update(jobId, e => {
      const from = e.job.status;
      if (!(JOB_TRANSITIONS[from] || []).includes(to)) throw new JobError('ILLEGAL_TRANSITION', `${from} → ${to}`);
      if (leaseLive(e) && e.lease.workerId !== o.workerId) throw new JobError('LEASE_HELD');
      if (to === 'ready') {
        if (!o.candidate) throw new JobError('INVALID', 'ready requires candidate');
        e.job.candidate = o.candidate;
      } else if (o.candidate !== undefined) throw new JobError('INVALID', 'candidate only on ready');
      if (o.diagnostics) e.job.diagnostics = o.diagnostics.slice(0, 20);
      if (o.studentMessage) e.job.studentMessage = String(o.studentMessage).slice(0, 120);
      if (o.attempts !== undefined) e.job.attempts = o.attempts;
      e.job.status = to;
      if (isTerminal(to)) e.lease = null;
      pushEvent(e, to);
      return e;
    });
    return env.job;
  }

  /** lease 획득. 만료된 lease는 다른 worker가 인수할 수 있다. */
  async function lease(jobId, workerId, ttlMs) {
    try {
      const env = await update(jobId, e => {
        if (isTerminal(e.job.status)) throw new JobError('NOT_READY', 'terminal');
        if (e.job.status === 'ready') throw new JobError('NOT_READY', 'ready jobs need no worker');
        if (leaseLive(e) && e.lease.workerId !== workerId) throw new JobError('LEASE_HELD');
        e.lease = { workerId, expiresAt: now() + ttlMs };
        return e;
      });
      return { ok: true, job: env.job, lease: env.lease };
    } catch (err) {
      if (err instanceof JobError && ['LEASE_HELD', 'NOT_READY'].includes(err.kind)) return { ok: false, reason: err.kind };
      throw err;
    }
  }

  async function heartbeat(jobId, workerId, ttlMs) {
    try {
      const env = await update(jobId, e => {
        if (!e.lease || e.lease.workerId !== workerId) throw new JobError('NOT_LEASED');
        if (isTerminal(e.job.status)) throw new JobError('NOT_READY', 'terminal');
        e.lease.expiresAt = now() + ttlMs;
        return e;
      });
      return { ok: true, lease: env.lease };
    } catch (err) {
      if (err instanceof JobError && ['NOT_LEASED', 'NOT_READY'].includes(err.kind)) return { ok: false, reason: err.kind };
      throw err;
    }
  }

  async function release(jobId, workerId) {
    await update(jobId, e => {
      if (!e.lease || e.lease.workerId !== workerId) return null;
      e.lease = null;
      return e;
    });
    return true;
  }

  /** lease가 없거나 만료된 비종결 작업 id (회수 대상). 오래된 것부터. */
  async function reclaimable({ limit = 50 } = {}) {
    const ids = await kv.zrange('jobs:active', 0, limit - 1);
    const out = [];
    for (const id of ids) {
      const env = await envelope(id);
      if (!env) { await kv.zrem('jobs:active', id); continue; }
      if (isTerminal(env.job.status)) { await kv.zrem('jobs:active', id); continue; }
      if (env.job.status === 'ready') continue;
      if (!leaseLive(env)) out.push(id);
    }
    return out;
  }

  /** 다음 처리할 작업을 하나 lease한다(만료 lease 회수 포함). 없으면 null */
  async function claimNext(workerId, ttlMs, { limit = 50 } = {}) {
    for (const id of await reclaimable({ limit })) {
      const r = await lease(id, workerId, ttlMs);
      if (r.ok) return r;
    }
    return null;
  }

  /** 반복 안전 취소. 종결 상태면 그대로 돌려준다. apply 진행 중이면 {ok:false, reason:'APPLYING'} */
  async function cancel(jobId, { ownerId } = {}) {
    const cur = await envelope(jobId);
    if (!cur || (ownerId !== undefined && cur.ownerId !== ownerId)) return { ok: false, reason: 'NOT_FOUND' };
    try {
      const env = await update(jobId, e => {
        if (isTerminal(e.job.status)) return null;
        if (e.applyLock && e.applyLock.expiresAt > now()) throw new JobError('APPLYING');
        e.job.status = 'cancelled';
        e.job.studentMessage = '요청을 취소했어요.';
        e.lease = null;
        pushEvent(e, 'cancelled');
        return e;
      });
      return { ok: true, job: env.job };
    } catch (err) {
      if (err instanceof JobError && err.kind === 'APPLYING') return { ok: false, reason: 'APPLYING' };
      throw err;
    }
  }

  // ── apply 지원 (projects/routes.js가 사용) ──

  /** ready 상태에서 적용 잠금을 건다. 이 잠금이 살아 있는 동안 cancel은 거부된다. */
  async function beginApply(jobId, ownerId, token, ttlMs = 10_000) {
    return update(jobId, e => {
      if (e.ownerId !== ownerId) throw new JobError('NOT_FOUND');
      if (e.job.status !== 'ready') throw new JobError('NOT_READY', e.job.status);
      if (e.applyLock && e.applyLock.expiresAt > now() && e.applyLock.token !== token) throw new JobError('APPLYING');
      e.applyLock = { token, expiresAt: now() + ttlMs };
      return e;
    });
  }

  async function finishApply(jobId, token, appliedRevision) {
    return update(jobId, e => {
      if (e.job.status === 'applied') return null;
      if (e.applyLock && e.applyLock.token !== token && e.applyLock.expiresAt > now()) throw new JobError('APPLYING');
      if (!(JOB_TRANSITIONS[e.job.status] || []).includes('applied')) throw new JobError('ILLEGAL_TRANSITION', `${e.job.status} → applied`);
      e.job.status = 'applied';
      e.job.studentMessage = '작품에 적용했어요.';
      e.applyLock = null;
      e.appliedRevision = appliedRevision;
      e.lease = null;
      pushEvent(e, 'applied');
      return e;
    });
  }

  async function abortApply(jobId, token) {
    return update(jobId, e => {
      if (!e.applyLock || e.applyLock.token !== token) return null;
      e.applyLock = null;
      return e;
    });
  }

  return {
    create, get, events, transition, lease, heartbeat, release, reclaimable, claimNext, cancel,
    beginApply, finishApply, abortApply, envelope,
  };
}
