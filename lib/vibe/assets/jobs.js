// 에셋 생성 작업 저장소 — WP7 jobs/store.js와 같은 KV·CAS·lease 방식. 상태는 ASSET_JOB_STATES(계약)만 쓴다.
//
// 키:
//   assetjob:{jobId}                     봉투 {revision, job, priv, lease, events, nextSeq}
//   assetreq:{ownerId}:{requestKey}      {revision, jobId}  요청 멱등(같은 사용자·프로젝트·슬롯·내용·공급자·모델·스타일)
//   assetjobs:active                     zset — 비종결 작업(작업자 회수 대상)
//   assetpj:{provider}:{providerJobId}   jobId  (webhook → job 역참조)
//
// job(공개, 학생에게 보이는 값): 프롬프트·학생 원문 없음.

import { ASSET_JOB_STATES } from '../../../public/vibe-v2/shared/contracts/schemas.js';
import { randomId } from '../auth/tokens.js';

export const ASSET_TERMINAL = ['ready', 'failed', 'cancelled', 'timed_out'];
export const ASSET_TRANSITIONS = Object.freeze({
  queued: ['generating', 'ready', 'failed', 'cancelled', 'timed_out'],          // ready: 카탈로그 재사용·캐시 적중
  generating: ['generating', 'validating', 'queued', 'failed', 'cancelled', 'timed_out'], // queued: 재시도 대기
  validating: ['processing', 'queued', 'failed', 'cancelled', 'timed_out'],
  processing: ['ready', 'queued', 'failed', 'cancelled', 'timed_out'],
});
for (const s of Object.keys(ASSET_TRANSITIONS)) if (!ASSET_JOB_STATES.includes(s)) throw new Error('state not in contract: ' + s);

const JOB_TTL_MS = 24 * 3_600_000;
const MAX_EVENTS = 50;
const CAS_TRIES = 8;
export const ASSET_JOB_ID = /^aj_[A-Za-z0-9_-]{8,40}$/;

export class AssetJobError extends Error {
  constructor(kind, message) { super(message || kind); this.kind = kind; }
}
const clone = v => JSON.parse(JSON.stringify(v));

export function createAssetJobStore(kv, { now = Date.now } = {}) {
  const iso = () => new Date(now()).toISOString();
  const key = id => `assetjob:${id}`;
  const terminal = s => ASSET_TERMINAL.includes(s);
  const leaseLive = env => !!(env.lease && env.lease.expiresAt > now());

  async function envelope(jobId) {
    if (typeof jobId !== 'string' || !ASSET_JOB_ID.test(jobId)) return null;
    return kv.get(key(jobId));
  }

  async function update(jobId, mutate) {
    for (let i = 0; i < CAS_TRIES; i++) {
      const cur = await envelope(jobId);
      if (!cur) throw new AssetJobError('NOT_FOUND');
      const next = mutate(clone(cur));
      if (next === null) return cur;
      next.revision = cur.revision + 1;
      next.job.updatedAt = iso();
      const r = await kv.casJson(key(jobId), cur.revision, next, { ttlMs: JOB_TTL_MS });
      if (r.ok) {
        if (terminal(next.job.status) && !terminal(cur.job.status)) await kv.zrem('assetjobs:active', jobId);
        return next;
      }
      await new Promise(res => setTimeout(res, 2 + Math.random() * 8));
    }
    throw new AssetJobError('BUSY');
  }

  function pushEvent(env, status) {
    env.events.push({ seq: env.nextSeq, status, at: iso(), codes: env.job.codes.slice(0, 5) });
    env.nextSeq += 1;
    if (env.events.length > MAX_EVENTS) env.events = env.events.slice(-MAX_EVENTS);
  }

  /**
   * 요청 멱등 생성. 같은 requestKey의 작업이 진행 중이거나 ready면 그것을 돌려준다.
   * 실패·취소·기한초과로 끝난 작업이면 새 작업을 만든다(학생이 다시 시도).
   * @param {{ ownerId, classId, requestKey, job: object, priv: object }} p  job = 공개 필드 초기값
   */
  async function createOrGet(p) {
    const reqKey = `assetreq:${p.ownerId}:${p.requestKey}`;
    for (let i = 0; i < CAS_TRIES; i++) {
      const cur = await kv.get(reqKey);
      if (cur) {
        const env = await envelope(cur.jobId);
        if (env && !['failed', 'cancelled', 'timed_out'].includes(env.job.status)) return { created: false, job: env.job, env };
      }
      const jobId = randomId('aj_', 12);
      const t = iso();
      const job = { ...p.job, jobId, status: 'queued', attempts: 0, codes: [], createdAt: t, updatedAt: t };
      const env = { revision: 0, job, ownerId: p.ownerId, classId: p.classId ?? null, priv: p.priv || {}, lease: null, events: [], nextSeq: 1 };
      pushEvent(env, 'queued');
      // 요청 키를 먼저 잡는다(CAS) → 동시에 같은 요청 10개가 와도 job 1개
      const won = await kv.casJson(reqKey, cur ? cur.revision : null, { revision: (cur?.revision ?? -1) + 1, jobId }, { ttlMs: JOB_TTL_MS });
      if (!won.ok) { await new Promise(res => setTimeout(res, 2 + Math.random() * 8)); continue; }
      const r = await kv.casJson(key(jobId), null, env, { ttlMs: JOB_TTL_MS });
      if (!r.ok) throw new AssetJobError('BUSY', 'id collision');
      await kv.zadd('assetjobs:active', now(), jobId);
      return { created: true, job, env };
    }
    // 경쟁에서 진 요청: 이긴 쪽 job이 생길 때까지 잠깐 재조회
    for (let i = 0; i < 20; i++) {
      const cur = await kv.get(reqKey);
      const env = cur ? await envelope(cur.jobId) : null;
      if (env) return { created: false, job: env.job, env };
      await new Promise(res => setTimeout(res, 5));
    }
    throw new AssetJobError('BUSY', 'job being created');
  }

  async function get(jobId, { ownerId } = {}) {
    const env = await envelope(jobId);
    if (!env || (ownerId !== undefined && env.ownerId !== ownerId)) return null;
    return env;
  }

  /**
   * 상태 전이. lease가 살아 있으면 보유 worker만. patch(job, priv)로 필드 갱신.
   * @param {{ workerId?: string, job?: object, priv?: object, force?: boolean }} o  force: webhook 등 lease 무시(상태 조건은 유지)
   */
  async function transition(jobId, to, o = {}) {
    return update(jobId, e => {
      const from = e.job.status;
      if (!(ASSET_TRANSITIONS[from] || []).includes(to)) throw new AssetJobError('ILLEGAL_TRANSITION', `${from} → ${to}`);
      if (!o.force && leaseLive(e) && e.lease.workerId !== o.workerId) throw new AssetJobError('LEASE_HELD');
      Object.assign(e.job, o.job || {});
      Object.assign(e.priv, o.priv || {});
      e.job.status = to;
      if (terminal(to)) e.lease = null;
      pushEvent(e, to);
      return e;
    });
  }

  /** 상태를 바꾸지 않고 비공개/공개 필드만 갱신 (lease 보유자 또는 force) */
  async function patch(jobId, o = {}) {
    return update(jobId, e => {
      if (o.expectStatus && e.job.status !== o.expectStatus) throw new AssetJobError('STATE_CHANGED', e.job.status);
      if (!o.force && leaseLive(e) && e.lease.workerId !== o.workerId) throw new AssetJobError('LEASE_HELD');
      Object.assign(e.job, o.job || {});
      Object.assign(e.priv, o.priv || {});
      return e;
    });
  }

  async function lease(jobId, workerId, ttlMs) {
    try {
      const env = await update(jobId, e => {
        if (terminal(e.job.status)) throw new AssetJobError('TERMINAL');
        if (leaseLive(e) && e.lease.workerId !== workerId) throw new AssetJobError('LEASE_HELD');
        e.lease = { workerId, expiresAt: now() + ttlMs };
        return e;
      });
      return { ok: true, env };
    } catch (err) {
      if (err instanceof AssetJobError && ['LEASE_HELD', 'TERMINAL'].includes(err.kind)) return { ok: false, reason: err.kind };
      throw err;
    }
  }

  async function release(jobId, workerId) {
    try {
      await update(jobId, e => {
        if (!e.lease || e.lease.workerId !== workerId) return null;
        e.lease = null;
        return e;
      });
    } catch (err) { if (!(err instanceof AssetJobError && err.kind === 'NOT_FOUND')) throw err; }
  }

  async function cancel(jobId, { ownerId } = {}) {
    const cur = await envelope(jobId);
    if (!cur || (ownerId !== undefined && cur.ownerId !== ownerId)) return { ok: false, reason: 'NOT_FOUND' };
    const env = await update(jobId, e => {
      if (terminal(e.job.status)) return null;
      e.job.status = 'cancelled';
      e.job.studentMessage = '그림 만들기를 멈췄어요. 지금 모습 그대로 써요.';
      e.lease = null;
      pushEvent(e, 'cancelled');
      return e;
    });
    return { ok: true, env };
  }

  /** 회수 대상: lease 없거나 만료된 비종결 작업 (오래된 것부터) */
  async function reclaimable({ limit = 20 } = {}) {
    const ids = await kv.zrange('assetjobs:active', 0, limit - 1);
    const out = [];
    for (const id of ids) {
      const env = await envelope(id);
      if (!env || terminal(env.job.status)) { await kv.zrem('assetjobs:active', id); continue; }
      if (!leaseLive(env)) out.push(id);
    }
    return out;
  }

  async function mapProviderJob(provider, providerJobId, jobId) {
    await kv.set(`assetpj:${provider}:${providerJobId}`, { jobId }, { ttlMs: JOB_TTL_MS });
  }
  async function byProviderJob(provider, providerJobId) {
    const r = await kv.get(`assetpj:${provider}:${String(providerJobId).slice(0, 120)}`);
    return r ? envelope(r.jobId) : null;
  }

  return { createOrGet, get, transition, patch, lease, release, cancel, reclaimable, mapProviderJob, byProviderJob, envelope, terminal };
}
