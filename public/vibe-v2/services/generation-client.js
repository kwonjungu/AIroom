// 생성 클라이언트 선택 — 통합 담당 소유.
// /api/vibe/health가 ok면 서버(HTTP) GenerationClient, 아니면 mock으로 폴백한다. 두 클라이언트는 같은 모양이며
// 둘 다 apply(job)를 제공한다: 모드는 후보를 적용할 때 store.applyPatch를 직접 부르지 말고 generation.apply(job)를 쓴다.
//
//   HTTP 경로:  POST /generations → GET /generations/:id?after=cursor (폴링) → POST /generations/:id/cancel
//              → POST /projects/:remoteId/apply (서버가 보관한 후보만 반영, jobId 멱등)
//   서버 apply 뒤 같은 patch를 로컬 store에도 적용해 undo가 살아 있게 하고, persistence에 새 serverRevision을 알려
//   같은 내용을 다시 PUT하지 않게 한다(revision이 같으면 sync가 건너뛴다).

import { ApiClientError } from '../persistence/api-client.js';
import { createMockGenerationClient } from '../mocks/generation-mock.js';

const TERMINAL = ['ready', 'applied', 'cancelled', 'failed', 'timed_out', 'superseded'];
const ACTIVE = ['queued', 'planning', 'generating', 'validating', 'repairing'];

function abortError() { return Object.assign(new Error('aborted'), { name: 'AbortError' }); }

function sleep(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(abortError());
    const t = setTimeout(() => { signal?.removeEventListener?.('abort', onAbort); resolve(); }, ms);
    function onAbort() { clearTimeout(t); reject(abortError()); }
    signal?.addEventListener?.('abort', onAbort, { once: true });
  });
}

/** 실패를 Job 모양으로 — 모드 UI가 네트워크 오류와 생성 실패를 같은 경로로 보여 줄 수 있게 한다 */
function failedJob(req, err) {
  const status = err?.status;
  const code = err?.code || 'NETWORK';
  const msg = status === 429 ? 'AI 요청이 많아요. 잠시 뒤에 다시 해 보세요.'
    : status === 409 ? '작품이 방금 바뀌었어요. 다시 요청해 볼까?'
    : status === 0 || code === 'NETWORK' ? '인터넷 연결이 불안정해요. 지금 작품은 그대로예요.'
    : (err?.message && status >= 400 && status < 500) ? err.message
    : 'AI가 잠깐 바빠요. 블록으로 직접 바꿔 볼까?';
  const now = new Date().toISOString();
  return {
    jobId: null, projectId: req.projectId, baseRevision: req.baseRevision, requestId: req.requestId,
    status: 'failed', studentMessage: msg, candidate: null, attempts: 0, createdAt: now, updatedAt: now,
    diagnostics: [{ code, severity: 'error', nodeId: null, path: '', message: String(err?.message || code).slice(0, 200), studentHint: '' }],
  };
}

/**
 * 서버 GenerationClient.
 * @param {{
 *   store: ReturnType<import('../state/store.js').createProjectStore>,
 *   remote: () => Promise<{projectId:string, baseRevision:number}|null>,   // 서버에 동기화된 id·revision (없으면 null)
 *   onApplied?: (info:{projectId:string, revision:number}) => void,        // persistence.attachRemote 연결용
 *   fetch?: typeof fetch, base?: string,
 * }} o
 */
export function createHttpGenerationClient(o) {
  const f = o.fetch || globalThis.fetch.bind(globalThis);
  const base = o.base || '/api/vibe';
  const cursors = new Map();   // jobId → 마지막으로 받은 이벤트 seq
  const remoteOf = new Map();  // jobId → 서버 projectId

  async function call(method, path, body, signal) {
    let res;
    try {
      res = await f(base + path, {
        method, credentials: 'same-origin', signal,
        headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch (e) {
      if (e?.name === 'AbortError') throw e;
      throw new ApiClientError(0, null, null);
    }
    let json = null;
    try { json = await res.json(); } catch { /* 빈 본문 */ }
    if (!res.ok) throw new ApiClientError(res.status, json, res.headers);
    return json;
  }

  async function get(jobId, opts = {}) {
    const after = cursors.get(jobId) || 0;
    const r = await call('GET', `/generations/${encodeURIComponent(jobId)}?after=${after}`, undefined, opts.signal);
    if (Number.isInteger(r.cursor)) cursors.set(jobId, r.cursor);
    return { ...r.job, events: r.events || [] };
  }

  return {
    kind: 'http',

    async start(req) {
      let target;
      try { target = await o.remote(); } catch (e) { return failedJob(req, e); }
      if (!target) return failedJob(req, Object.assign(new Error('not synced'), { status: 0, code: 'NETWORK' }));
      try {
        const r = await call('POST', '/generations', {
          projectId: target.projectId, baseRevision: target.baseRevision,
          requestId: req.requestId, intentText: req.intentText, mode: req.mode,
        });
        remoteOf.set(r.jobId, target.projectId);
        return r.job;
      } catch (e) { return failedJob(req, e); }
    },

    get,

    async cancel(jobId) {
      if (!jobId) return null;
      try { return (await call('POST', `/generations/${encodeURIComponent(jobId)}/cancel`, {})).job; } catch (e) {
        if (e?.status === 404) return null;
        throw e;
      }
    },

    async watch(jobId, onUpdate, opts = {}) {
      let last = '';
      let failures = 0;
      for (;;) {
        if (opts.signal?.aborted) throw abortError();
        let j;
        try {
          j = await get(jobId, opts);
          failures = 0;
        } catch (e) {
          if (e?.name === 'AbortError') throw e;
          // 잠깐 끊김은 몇 번 기다려 본다. 계속 실패하면 실패 Job으로 끝낸다(작품은 그대로).
          if (++failures > 4 || (e?.status >= 400 && e?.status < 500 && e?.status !== 429)) {
            const fj = failedJob({ projectId: remoteOf.get(jobId) || null, baseRevision: null, requestId: null }, e);
            onUpdate?.(fj);
            return fj;
          }
          await sleep(Math.min(8000, e?.retryAfterMs || 1000 * 2 ** failures), opts.signal);
          continue;
        }
        const sig = j.status + j.updatedAt;
        if (sig !== last) { last = sig; onUpdate?.(j); }
        if (TERMINAL.includes(j.status)) return j;
        await sleep(opts.intervalMs ?? (ACTIVE.includes(j.status) ? 1000 : 1500), opts.signal);
      }
    },

    /**
     * 준비된 후보를 작품에 반영. 서버가 먼저 반영(검증·멱등) → 로컬 store에도 같은 patch 적용.
     * @returns {Promise<{ok:true, project:object} | {ok:false, reason:string, error?:Error, diagnostics?:object[]}>}
     */
    async apply(job) {
      if (!job?.candidate?.patch || job.status !== 'ready') return { ok: false, reason: 'not-ready' };
      // 요청 뒤에 직접 고친 게 있으면 후보는 옛 작품 기준이다 → 적용하지 않는다(내 편집 보존)
      if (o.store.getProject().revision !== job.baseRevision) return { ok: false, reason: 'conflict' };
      const projectId = remoteOf.get(job.jobId) || job.projectId;
      let r;
      try {
        r = await call('POST', `/projects/${encodeURIComponent(projectId)}/apply`, { jobId: job.jobId, candidateHash: job.candidate.hash, baseRevision: job.baseRevision });
      } catch (e) {
        return { ok: false, reason: e?.status === 409 ? 'conflict' : 'server', error: e };
      }
      // 같은 patch를 로컬에도 적용(undo 유지). 결과가 서버와 어긋나면 서버 작품을 원본으로 불러온다.
      const lr = o.store.getProject().revision === job.baseRevision
        ? o.store.applyPatch({ ...job.candidate.patch, baseRevision: job.baseRevision }, { source: 'ai' })
        : { ok: false };
      if (!lr.ok || lr.project.revision !== r.revision) {
        // 서버 id와 로컬 id는 다르다(서버가 새로 발급) → 로컬 저장 키가 바뀌지 않게 로컬 id를 유지
        const loaded = o.store.load({ ...r.project, id: o.store.getProject().id });
        if (!loaded?.ok) return { ok: false, reason: 'local', diagnostics: loaded?.diagnostics || lr.diagnostics };
      }
      o.onApplied?.({ projectId, revision: r.revision });
      return { ok: true, project: o.store.getProject(), alreadyApplied: !!r.alreadyApplied };
    },
  };
}

/** mock에 apply(job)를 붙인다 — 로컬 store에만 적용 */
export function withLocalApply(client, store) {
  return {
    kind: 'mock',
    start: req => client.start(req),
    get: (id, opts) => client.get(id, opts),
    cancel: (id, rid) => client.cancel(id, rid),
    watch: (id, cb, opts) => client.watch(id, cb, opts),
    async apply(job) {
      if (!job?.candidate?.patch || job.status !== 'ready') return { ok: false, reason: 'not-ready' };
      const r = store.applyPatch({ ...job.candidate.patch, baseRevision: job.baseRevision }, { source: 'ai' });
      return r.ok ? { ok: true, project: r.project } : { ok: false, reason: r.diagnostics?.[0]?.code === 'REVISION_CONFLICT' ? 'conflict' : 'local', diagnostics: r.diagnostics };
    },
  };
}

// ── 서버 연결 확인 (페이지당 1회) ──

let connection = null;

/**
 * /api/vibe/health가 ok면 학생 세션(없으면 연습 세션)을 확보한다.
 * @param {{ fetch?: typeof fetch, base?: string, timeoutMs?: number }} [opts]
 * @returns {Promise<{ok:true, health:object, session:object} | {ok:false, reason:string}>}
 */
export function connectVibeApi(opts = {}) {
  if (connection && !opts.fresh) return connection;
  const f = opts.fetch || globalThis.fetch?.bind(globalThis);
  const base = opts.base || '/api/vibe';
  connection = (async () => {
    if (!f) return { ok: false, reason: 'no-fetch' };
    const ctl = typeof AbortController === 'function' ? new AbortController() : null;
    const t = ctl ? setTimeout(() => ctl.abort(), opts.timeoutMs ?? 2500) : null;
    try {
      const h = await f(base + '/health', { credentials: 'same-origin', signal: ctl?.signal });
      if (!h.ok) return { ok: false, reason: 'health-' + h.status };
      const health = await h.json();
      if (!health?.ok) return { ok: false, reason: 'health-not-ok' };
      let s = await f(base + '/session/me', { credentials: 'same-origin', signal: ctl?.signal });
      if (s.status === 401) {
        s = await f(base + '/session', {
          method: 'POST', credentials: 'same-origin', signal: ctl?.signal,
          headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ practice: true }),
        });
      }
      if (!s.ok) return { ok: false, reason: 'session-' + s.status };
      return { ok: true, health, session: await s.json() };
    } catch (e) {
      return { ok: false, reason: e?.name === 'AbortError' ? 'timeout' : 'network' };
    } finally { if (t) clearTimeout(t); }
  })();
  return connection;
}

/**
 * 작업 화면 하나에 쓸 GenerationClient. 서버가 켜져 있고 LLM이 설정돼 있으면 HTTP, 아니면 mock.
 * @param {{ conn: {ok:boolean, health?:object}|null, store:object, persistence:object, fetch?:typeof fetch, base?:string, mock?:object }} o
 */
export function createGenerationClient(o) {
  if (o.conn?.ok && o.persistence) {
    return createHttpGenerationClient({
      store: o.store, fetch: o.fetch, base: o.base,
      async remote() {
        await o.persistence.flush();                      // 최신 편집을 서버에 먼저 반영
        const m = o.persistence.getMeta();
        if (!m.remoteId || m.serverRevision === null || m.dirty) return null;
        return { projectId: m.remoteId, baseRevision: m.serverRevision };
      },
      onApplied: ({ projectId, revision }) => {
        o.persistence.attachRemote(projectId, revision);
        o.persistence.flush();                            // 로컬 기록 갱신 (revision이 같으므로 서버 PUT은 건너뜀)
      },
    });
  }
  return withLocalApply(o.mock || createMockGenerationClient(), o.store);
}
