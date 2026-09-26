// /api/vibe/* 라우터 — 통합 담당 소유. 각 WP 모듈(auth/projects/generation/assets/jobs)의 라우트를 여기서만 연결한다.
// server.js가 VIBE_V2_API=1 일 때 지연 import 한다.

import { CONTRACT_VERSION } from '../../public/vibe-v2/shared/contracts/schemas.js';

/** @param {typeof import('express')} express */
export function createVibeRouter(express) {
  const router = express.Router();

  router.get('/health', (req, res) => {
    res.json({ ok: true, contractVersion: CONTRACT_VERSION, modules: [] });
  });

  // WP7: router.use(sessionRoutes) … / WP5: generation / WP6: assets — 통합 시 연결

  router.use((req, res) => {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'unknown vibe route', retryable: false, retryAfterMs: null, requestId: String(req.get('x-request-id') || '') } });
  });
  return router;
}
