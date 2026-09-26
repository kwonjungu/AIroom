// WP5 통합 테스트 공용 — WP7 createVibeApi + WP5 생성 라우트를 임시 express 앱에 함께 mount (mock 공급자, 메모리 KV).

import express from 'express';
import { createVibeApi } from '../../../lib/vibe/api.js';
import { createMemoryKv } from '../../../lib/vibe/kv/index.js';
import { createGenerationRoutes } from '../../../lib/vibe/generation/routes.js';
import { instantiate, createTemplateProject } from '../../../public/vibe-v2/shared/templates/index.js';
import { SECRET, STAFF_TOKENS, client, newClass, joinedStudent } from './wp7-helpers.js';

export { client, newClass, joinedStudent, SECRET };
export const GROQ_TEST_KEY = 'gsk_TESTSECRET_do_not_leak_9f8e7d6c5b4a';

/**
 * @param {{ provider:object, env?:object, clock?:{t:number}, genEnv?:object, limits?:object }} o
 */
export async function startGenApp(o) {
  const clock = o.clock || { t: Date.parse('2026-09-26T09:00:00Z') };
  const now = () => clock.t;
  const kv = createMemoryKv({ now });
  const logs = [];
  const log = e => logs.push(e);
  const env = { VIBE_SESSION_SECRET: SECRET, GROQ_API_KEY: GROQ_TEST_KEY, ...(o.env || {}) };
  const api = createVibeApi({ express, kv, now, env, validateStaffSession: async t => STAFF_TOKENS[t] || null, log, instantiate });
  const gen = createGenerationRoutes({ express, services: api.services, provider: o.provider, env: { ...env, ...(o.genEnv || {}) }, now, log, limits: o.limits, sleep: async () => {} });
  const app = express();
  app.set('trust proxy', true);
  const router = express.Router();
  router.use(gen);   // WP5 먼저 (GET /generations/:id 재개 훅이 WP7 응답보다 앞서야 한다)
  router.use(api);   // WP7
  app.use('/api/vibe', router);
  const server = await new Promise(r => { const s = app.listen(0, '127.0.0.1', () => r(s)); });
  const base = `http://127.0.0.1:${server.address().port}/api/vibe`;
  return { base, kv, clock, logs, env, services: api.services, close: () => new Promise(r => server.close(r)) };
}

export function templateDraft(templateId = 'catch', params = { item: 'apple' }) {
  const p = createTemplateProject(templateId, params).project;
  return { mode: p.mode, title: p.title, templateId: p.templateId, program: p.program, assets: p.assets, learning: p.learning };
}

let seq = 0;
export const rid = (p = 'req') => `${p}-${Date.now().toString(36)}-${(seq++).toString(36).padStart(4, '0')}`;
