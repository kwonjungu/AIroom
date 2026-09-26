// /api/vibe/* 라우터 — 통합 담당 소유. 각 WP 모듈(auth/projects/generation/assets/jobs)의 라우트를 여기서만 연결한다.
// server.js가 VIBE_V2_API=1 일 때 지연 import 한다.

import { CONTRACT_VERSION } from '../../public/vibe-v2/shared/contracts/schemas.js';
import { createVibeApi, createKvFromEnv } from './api.js';

/**
 * @param {typeof import('express')} express
 * @param {{ redis?: object|null, validateStaffSession: (token:string)=>Promise<object|null>, env?: object }} deps
 */
export function createVibeRouter(express, deps) {
  const router = express.Router();
  const env = deps.env || process.env;
  // 메모리 KV는 단일 프로세스에서만 정확하다. 서버리스(다중 인스턴스)에서 Redis 없이 열지 않는다.
  const kvUnsafe = !deps.redis && !!env.VERCEL;

  router.get('/health', (req, res) => {
    res.json({ ok: !kvUnsafe, contractVersion: CONTRACT_VERSION, storage: deps.redis ? 'redis' : 'memory', modules: ['session', 'projects', 'progress', 'jobs'] });
  });

  if (kvUnsafe) {
    router.use((req, res) => res.status(503).json({ error: { code: 'PROVIDER_UNAVAILABLE', message: 'vibe v2 storage not configured', retryable: false, retryAfterMs: null, requestId: '' } }));
    return router;
  }

  // WP7: 세션·프로젝트·진도·작업 조회/취소·apply
  router.use(createVibeApi({ express, kv: createKvFromEnv({ redis: deps.redis }), validateStaffSession: deps.validateStaffSession, env }));
  // WP5: generation / WP6: assets — 통합 시 연결

  router.use((req, res) => {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'unknown vibe route', retryable: false, retryAfterMs: null, requestId: String(req.get('x-request-id') || '') } });
  });
  return router;
}
