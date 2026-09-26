// WP7 라우트 팩토리 — 통합 담당이 lib/vibe/router.js에서 `router.use(createVibeApi({...}))`로 연결한다.
//
//   import { createVibeApi, createKvFromEnv } from './api.js';
//   router.use(createVibeApi({ express, kv: createKvFromEnv({ redis }), validateStaffSession, env: process.env }));
//
// 필요한 env: VIBE_SESSION_SECRET(32자 이상, 없으면 세션 발급만 거부)
// 선택 env : VIBE_ALLOWED_ORIGINS(쉼표 구분), VIBE_COOKIE_SECURE('1'|'0'), VIBE_COOKIE_PATH(기본 /api/vibe)

import { createAuth } from './auth/index.js';
import { hashRef, secretProblem } from './auth/tokens.js';
import { createMemoryKv, createUpstashKv } from './kv/index.js';
import { errorHandler, jsonBodyLimit, requestIdMiddleware, accessLog } from './http/middleware.js';
import { createRateLimiter, apiRules, DEFAULT_API_LIMITS } from './http/limits.js';
import { errors } from './http/errors.js';
import { createProjectStore } from './projects/store.js';
import { createProgressStore } from './projects/progress.js';
import { mountProjectRoutes } from './projects/routes.js';
import { createJobStore } from './jobs/store.js';
import { mountJobRoutes } from './jobs/routes.js';

/**
 * Redis 인스턴스가 있으면 Upstash KV, 없으면 메모리 KV(로컬 파일 모드 — 단일 프로세스 전용).
 * @param {{ redis?: object|null }} o
 */
export function createKvFromEnv({ redis } = {}) {
  return redis ? createUpstashKv(redis) : createMemoryKv();
}

/**
 * @param {{
 *   express: typeof import('express'),
 *   kv: object,
 *   validateStaffSession: (token:string) => Promise<object|null>,
 *   env?: Record<string,string|undefined>,
 *   now?: () => number,
 *   log?: (entry:object) => void,
 *   limits?: Partial<typeof DEFAULT_API_LIMITS>,
 *   authOptions?: object,
 *   instantiate?: Function,
 *   routes?: { generationsRead?: boolean },
 * }} deps
 * @returns {import('express').Router & { services: object }}
 */
export function createVibeApi(deps) {
  const { express, kv } = deps;
  if (!express || !kv || typeof deps.validateStaffSession !== 'function') throw new Error('createVibeApi: express, kv, validateStaffSession are required');
  const env = deps.env || {};
  const now = deps.now || Date.now;
  const log = deps.log || null;
  const limits = { ...DEFAULT_API_LIMITS, ...(deps.limits || {}) };

  const problem = secretProblem(env.VIBE_SESSION_SECRET);
  if (problem) log?.({ level: 'warn', event: 'config', message: problem + ' 학생 세션 발급이 거부됩니다.' });

  const limiter = createRateLimiter(kv, { now });
  const projects = createProjectStore({ kv, now });
  const progress = createProgressStore({ kv, now });
  const jobs = createJobStore(kv, { now });
  const auth = createAuth({ kv, env, now, limiter, validateStaffSession: deps.validateStaffSession, options: deps.authOptions, limits });

  const limitStudent = async (req, res, next) => {
    const s = res.locals.student;
    const r = await limiter.hit(apiRules({ classId: s.classId, studentId: s.studentId }, limits));
    if (!r.ok) return next(errors.rateLimited(r.retryAfterMs));
    next();
  };
  const limitProjectWrite = async (req, res, next) => {
    // 학생 id를 함께 키로 써서, 남의 프로젝트 id로 그 버킷을 소진시키는 공격을 막는다
    const id = `${res.locals.student.studentId}:${String(req.params.id).slice(0, 48)}`;
    const r = await limiter.hit([{ scope: 'projectWrite', id, ...limits.projectWrite }]);
    if (!r.ok) return next(errors.rateLimited(r.retryAfterMs));
    next();
  };

  const router = express.Router();
  router.use(requestIdMiddleware());
  router.use(accessLog(log, id => hashRef(env.VIBE_SESSION_SECRET, id)));
  router.use((req, res, next) => { res.setHeader('Cache-Control', 'no-store'); next(); });
  router.use(jsonBodyLimit(express));
  router.use(auth.originCheck);

  auth.mount(router, { progress });
  mountProjectRoutes(router, { projects, progress, jobs, requireStudent: auth.requireStudent, limitStudent, limitProjectWrite, instantiate: deps.instantiate, now });
  if (deps.routes?.generationsRead !== false) mountJobRoutes(router, { jobs, requireStudent: auth.requireStudent, limitStudent });

  router.use(errorHandler(log));

  // WP5 등 다른 모듈이 같은 저장소를 쓰도록 노출
  router.services = { kv, jobs, projects, progress, limiter, requireStudent: auth.requireStudent, originCheck: auth.originCheck };
  return router;
}
