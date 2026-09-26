// POST /generations — 생성 시작. 조회(GET /generations/:id)·취소·apply는 WP7 라우트를 그대로 쓴다.
// 여기서는 GET /generations/:id 앞에 "멈춘 작업 이어받기" 훅만 건다(응답은 WP7이 한다 → 반드시 WP7보다 먼저 mount).
//
// 연결(통합 담당, lib/vibe/router.js):
//   const api = createVibeApi({ express, kv, validateStaffSession, env, instantiate });
//   router.use(createGenerationRoutes({ express, services: api.services, provider: createGroqProvider({ env }), env }));
//   router.use(api);

import { MODES, LIMITS } from '../../../public/vibe-v2/shared/contracts/schemas.js';
import { errors } from '../http/errors.js';
import { requestIdMiddleware, jsonBodyLimit, errorHandler } from '../http/middleware.js';
import { DEFAULT_LLM_LIMITS } from '../http/limits.js';
import { randomId } from '../auth/tokens.js';
import { runGenerationWorker, acquireJobSlots, releaseJobSlots, inputKey, supersedeKey, INPUT_TTL_MS, LEASE_MS } from './worker.js';
import { GEN_LIMITS } from './orchestrator.js';
import { createTracer } from './trace.js';

const BODY_KEYS = ['projectId', 'baseRevision', 'requestId', 'intentText', 'mode'];
const REQUEST_ID = /^[A-Za-z0-9_-]{8,64}$/;
const DAY = 86_400_000;

function llmRules(s, projectId, limits) {
  const rules = [{ scope: 'llmOrg', id: 'default', ...limits.org }];
  if (s.classId) rules.push({ scope: 'llmClass', id: s.classId, ...limits.class });
  rules.push({ scope: 'llmStudent', id: s.studentId, ...limits.student });
  rules.push({ scope: 'llmProject', id: `${s.studentId}:${projectId}`, ...limits.project });
  return rules;
}

/**
 * @param {{ express:typeof import('express'), services:{kv:object, jobs:object, projects:object, limiter:object, requireStudent:Function, originCheck:Function},
 *           provider:object, env?:object, now?:()=>number, log?:Function, limits?:Partial<typeof GEN_LIMITS>, llmLimits?:object, sleep?:Function }} deps
 */
export function createGenerationRoutes(deps) {
  const { express, services, provider } = deps;
  if (!express || !services || !provider) throw new Error('createGenerationRoutes: express, services, provider are required');
  const { kv, jobs, projects, limiter, requireStudent, originCheck } = services;
  const env = deps.env || {};
  const now = deps.now || Date.now;
  const limits = { ...GEN_LIMITS, ...(deps.limits || {}) };
  const llmLimits = { ...DEFAULT_LLM_LIMITS, ...(deps.llmLimits || {}) };
  const inline = env.VIBE_GEN_INLINE !== '0';
  const tracer = createTracer(deps.log || null, { env });
  const router = express.Router();
  const noStore = (req, res, next) => { res.setHeader('Cache-Control', 'no-store'); next(); };
  const worker = (jobId) => runGenerationWorker({ services, provider, workerId: randomId('w_', 8), jobId, env, now, log: deps.log, limits, sleep: deps.sleep });

  router.post('/generations', requestIdMiddleware(), noStore, jsonBodyLimit(express), originCheck, requireStudent, async (req, res) => {
    const body = req.body;
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw errors.badRequest();
    // 모델·시스템 프롬프트·토큰 수 같은 키는 받지 않는다(서버 소유)
    if (!Object.keys(body).every(k => BODY_KEYS.includes(k)) || !BODY_KEYS.every(k => k in body)) throw errors.badRequest('요청 형식이 올바르지 않아요.');
    const { projectId, baseRevision, requestId, intentText, mode } = body;
    if (typeof projectId !== 'string' || !Number.isInteger(baseRevision) || baseRevision < 0 || typeof requestId !== 'string' || !REQUEST_ID.test(requestId)
      || typeof intentText !== 'string' || typeof mode !== 'string' || !MODES.includes(mode)) throw errors.badRequest();
    const text = intentText.trim();
    if (!text) throw errors.badRequest('어떻게 바꾸고 싶은지 적어 줘.');
    if ([...text].length > LIMITS.intentTextChars) throw errors.tooLarge(`요청은 ${LIMITS.intentTextChars}자까지 쓸 수 있어요.`);

    const s = res.locals.student;
    const got = await projects.getOwned(s, projectId);
    if (!got) throw errors.notFound('작품을 찾을 수 없어요.');
    const project = got.envelope.project;
    if (mode !== project.mode) throw errors.badRequest('작품 모드가 맞지 않아요.');
    if (mode !== 'studio') throw errors.badRequest('말로 바꾸기는 지금은 게임 공방에서만 할 수 있어요.');

    // 같은 requestId 재전송 → 기존 작업 (새 비용 없음)
    const reqKey = `gen:req:${s.studentId}:${requestId}`;
    const prior = await kv.get(reqKey);
    if (prior) {
      const job = await jobs.get(prior.jobId, { ownerId: s.studentId });
      if (job) return res.status(202).json({ jobId: job.jobId, job, pollAfterMs: pollAfter(job) });
    }
    if (got.envelope.revision !== baseRevision) throw errors.conflict(got.envelope.revision);

    const rl = await limiter.hit(llmRules(s, project.id, llmLimits));
    if (!rl.ok) throw errors.rateLimited(rl.retryAfterMs, 'AI 요청이 많아요. 잠시 뒤에 다시 해 보세요.');

    // 같은 작품의 이전 요청은 대체(superseded) — 작업자는 다음 확인 지점에서 멈추고, 슬롯은 바로 풀어 준다
    const activeKey = `gen:active:${project.id}`;
    const active = await kv.get(activeKey);
    if (active?.jobId) await supersede(active.jobId);

    const slotToken = randomId('s_', 9);
    const slots = await acquireJobSlots(kv, { token: slotToken, studentId: s.studentId, projectId: project.id, now });
    if (!slots.ok) throw errors.rateLimited(slots.retryAfterMs, slots.scope === 'orgLlm' ? 'AI가 지금 바빠요. 잠시 뒤에 다시 해 보세요.' : '앞의 요청이 끝나면 다시 해 보세요.');

    let created;
    try {
      created = await jobs.create({ ownerId: s.studentId, classId: s.classId ?? null, projectId: project.id, baseRevision, requestId, studentMessage: '요청을 받았어요. 살펴보는 중이에요.' });
    } catch (e) { await slots.release(); throw e; }
    if (!created.created) {
      await slots.release();
      return res.status(202).json({ jobId: created.job.jobId, job: created.job, pollAfterMs: pollAfter(created.job) });
    }
    const jobId = created.job.jobId;
    const t = now();
    await kv.set(inputKey(jobId), {
      ownerId: s.studentId, classId: s.classId ?? null, projectId: project.id, baseRevision, requestId, mode,
      intentText: text, slotToken, createdAt: t, deadlineAt: t + limits.deadlineMs, callsUsed: 0,
    }, { ttlMs: INPUT_TTL_MS });
    await kv.set(reqKey, { jobId }, { ttlMs: DAY });
    await kv.set(activeKey, { jobId }, { ttlMs: INPUT_TTL_MS });
    tracer.trace({ event: 'generation.accepted', requestId, jobId, projectId: project.id, baseRevision, engineVersion: project.engineVersion, provider: provider.name });

    if (inline) {
      // Vercel 요청 수명 안에서 deadline(40초)까지 동기 실행. 함수가 먼저 끊기면 lease가 만료되고 다음 GET이 이어받는다.
      try { await worker(jobId); } catch (e) {
        deps.log?.({ level: 'error', event: 'generation.worker_error', requestId, jobId, message: String(e?.message || e).slice(0, 200) });
      }
    }
    const job = await jobs.get(jobId);
    res.status(202).json({ jobId, job, pollAfterMs: pollAfter(job) });
  });

  // 폴링 재개 훅: lease가 만료된 미완료 작업이면 여기서 이어서 처리한 뒤 WP7 GET으로 넘긴다.
  router.get('/generations/:id', requireStudent, async (req, res, next) => {
    try {
      const job = await jobs.get(req.params.id, { ownerId: res.locals.student.studentId });
      if (job && !['ready', 'applied', 'cancelled', 'failed', 'timed_out', 'superseded'].includes(job.status)) {
        const envl = await jobs.envelope(job.jobId);
        const live = envl?.lease && envl.lease.expiresAt > now();
        if (!live && await kv.get(inputKey(job.jobId))) await worker(job.jobId);
      }
    } catch (e) {
      deps.log?.({ level: 'error', event: 'generation.resume_error', jobId: String(req.params.id).slice(0, 48), message: String(e?.message || e).slice(0, 200) });
    }
    next();
  });

  router.use(errorHandler(deps.log || null));

  async function supersede(oldJobId) {
    const job = await jobs.get(oldJobId);
    if (!job || ['ready', 'applied', 'cancelled', 'failed', 'timed_out', 'superseded'].includes(job.status)) {
      if (job?.status === 'ready') { try { await jobs.transition(oldJobId, 'superseded', {}); } catch { /* 적용 중일 수 있음 */ } }
      return;
    }
    await kv.set(supersedeKey(oldJobId), { at: now() }, { ttlMs: INPUT_TTL_MS });
    const envl = await jobs.envelope(oldJobId);
    if (!(envl?.lease && envl.lease.expiresAt > now())) { try { await jobs.transition(oldJobId, 'superseded', { studentMessage: '새 요청으로 바뀌었어요.' }); } catch { /* 경쟁 */ } }
    const input = await kv.get(inputKey(oldJobId));
    if (input?.slotToken) await releaseJobSlots(kv, { token: input.slotToken, studentId: input.ownerId, projectId: input.projectId });
  }

  router.leaseMs = LEASE_MS;
  return router;
}

function pollAfter(job) {
  return job && ['queued', 'planning', 'generating', 'validating', 'repairing'].includes(job.status) ? 1000 : null;
}

