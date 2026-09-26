// WP6 에셋 라우트 팩토리 — 통합 담당이 lib/vibe/router.js에서 WP7 API 뒤에 연결한다:
//
//   const api = createVibeApi({...});
//   router.use(api);
//   router.use(createAssetRoutes({ express, services: api.services, env }));   // provider·storage 생략 시 env로 결정
//
// 경로 (마운트 기준 /api/vibe):
//   POST /assets                  {projectId, revision, slotId, assetBrief}  → 202 {job, proposal}
//   GET  /assets/:jobId           → 200 {job, proposal}   (제한된 polling: 조회 때 작업을 한 단계 진행)
//   POST /assets/:jobId/cancel    → 200 {job}
//   GET  /assets/files/:assetId   → 승인된 생성 이미지 (content-addressed, immutable)
//   POST /assets/webhook/:provider  공급자 완료 통지 (HMAC 서명 필수, eventId 멱등)
//   POST /assets/worker/drain     작업자 1회 진행 (cron용, 공유 비밀 필수)
//
// env:
//   VIBE_ASSET_PROVIDER=none|mock|gemini, VIBE_ASSET_LIVE=1, VIBE_GEMINI_API_KEY|GEMINI_API_KEY, VIBE_GEMINI_IMAGE_MODEL
//   VIBE_ASSET_DIR (로컬 파일 저장 폴더; 없으면 메모리), VIBE_ASSET_URL_BASE (기본 /api/vibe/assets/files/)
//   VIBE_ASSET_DAILY_USD_ORG / _CLASS, VIBE_ASSET_DAILY_PER_STUDENT
//   VIBE_ASSET_WEBHOOK_SECRET (없으면 webhook 거부), VIBE_ASSET_WORKER_SECRET (없으면 drain 거부)
//   VIBE_ASSET_STEP_ON_POLL=0 이면 GET이 작업을 진행하지 않는다(작업자 전용 운영)

import fs from 'node:fs';
import crypto from 'node:crypto';
import { errors, ApiError } from '../http/errors.js';
import { errorHandler, jsonBodyLimit, requestIdMiddleware } from '../http/middleware.js';
import { validateAssetBrief } from '../../../public/vibe-v2/shared/contracts/schemas.js';
import { checkApplicable, slotLook } from '../../../public/vibe-v2/assets/swap.js';
import { createAssetPipeline } from './pipeline.js';
import { createProviderFromEnv } from './providers/index.js';
import { createMemoryStorage, createLocalFileStorage, ASSET_ID, DEFAULT_URL_BASE } from './storage.js';
import { createAssetBudget, budgetFromEnv } from './budget.js';
import { ASSET_JOB_ID } from './jobs.js';

export const MANIFEST_URL = new URL('../../../public/vibe-v2/assets/manifest.json', import.meta.url);
export function loadManifest() { return JSON.parse(fs.readFileSync(MANIFEST_URL, 'utf8')); }

const SLOT_ID = /^[a-z][a-z0-9_.-]{0,47}$/;

/**
 * @param {{
 *   express: typeof import('express'),
 *   services: { kv:object, projects:object, limiter:object, requireStudent:Function, originCheck:Function },
 *   provider?: object|null,   // undefined = env로 결정, null = 생성 끔
 *   storage?: object, env?: object, now?: () => number, log?: (e:object)=>void,
 *   manifest?: object, budget?: object|null, pipelineLimits?: object,
 * }} deps
 * @returns {import('express').Router & { pipeline: object, providerReason: string }}
 */
export function createAssetRoutes(deps) {
  const { express, services } = deps;
  if (!express || !services?.kv || !services?.projects || typeof services.requireStudent !== 'function') {
    throw new Error('createAssetRoutes: express and WP7 services (kv, projects, requireStudent) are required');
  }
  const env = deps.env || {};
  const now = deps.now || Date.now;
  const log = deps.log || null;
  const manifest = deps.manifest || loadManifest();
  const urlBase = env.VIBE_ASSET_URL_BASE || DEFAULT_URL_BASE;
  const storage = deps.storage || (env.VIBE_ASSET_DIR ? createLocalFileStorage({ dir: env.VIBE_ASSET_DIR, urlBase, now }) : createMemoryStorage({ urlBase, now }));

  let provider, providerReason;
  if (deps.provider !== undefined) { provider = deps.provider; providerReason = provider ? 'injected:' + provider.id : 'disabled'; }
  else ({ provider, reason: providerReason } = createProviderFromEnv(env));
  // 서버리스 다중 인스턴스에서 메모리·로컬 파일 저장은 결과가 사라진다 → 유료 생성은 막는다
  if (provider?.live && env.VERCEL && storage.kind !== 'object-storage') {
    provider = null;
    providerReason = 'Vercel에서 Object Storage 미연결 — 유료 생성 비활성';
  }
  if (log) log({ level: 'info', event: 'config', message: 'asset provider: ' + providerReason });

  const budget = deps.budget !== undefined ? deps.budget : createAssetBudget(services.kv, { now, limits: budgetFromEnv(env) });
  const pipeline = createAssetPipeline({ kv: services.kv, storage, manifest, provider, budget, now, log, limits: deps.pipelineLimits });
  const stepOnPoll = env.VIBE_ASSET_STEP_ON_POLL !== '0';

  const limitStudent = async (req, res, next) => {
    const s = res.locals.student;
    const r = await services.limiter.hit([
      { scope: 'org', id: 'default', limit: 6000, windowMs: 60_000 },
      { scope: 'assetStudent', id: s.studentId, limit: 60, windowMs: 60_000 },       // 폴링 포함
    ]);
    if (!r.ok) return next(errors.rateLimited(r.retryAfterMs));
    next();
  };
  const limitCreate = async (req, res, next) => {
    const s = res.locals.student;
    const rules = [{ scope: 'assetCreate', id: s.studentId, limit: 6, windowMs: 60_000 }];
    if (s.classId) rules.push({ scope: 'assetCreateClass', id: s.classId, limit: 60, windowMs: 60_000 });
    const r = await services.limiter.hit(rules);
    if (!r.ok) return next(errors.rateLimited(r.retryAfterMs, '그림 요청이 많아요. 잠시 후 다시 해 보세요.'));
    next();
  };
  const originCheck = services.originCheck || ((req, res, next) => next());

  const router = express.Router();
  router.use((req, res, next) => (res.locals.requestId ? next() : requestIdMiddleware()(req, res, next)));
  router.use('/assets', (req, res, next) => { res.setHeader('Cache-Control', 'no-store'); next(); });

  // ── 파일 (승인된 것만) ── 인증 없이 제공: id가 내용 hash라 추측 불가, 학생 정보 없음
  router.get('/assets/files/:assetId', async (req, res) => {
    const id = String(req.params.assetId);
    if (!ASSET_ID.test(id)) throw errors.notFound();
    const got = await storage.get(id);
    if (!got || got.meta.approval !== 'approved') throw errors.notFound();
    if (!['image/png', 'image/webp', 'image/jpeg'].includes(got.meta.mime)) throw errors.notFound();
    res.setHeader('Content-Type', got.meta.mime);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', "default-src 'none'");
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('ETag', '"' + got.meta.sha256 + '"');
    res.end(Buffer.from(got.bytes));
  });

  router.use('/assets', jsonBodyLimit(express));

  // ── webhook ──
  router.post('/assets/webhook/:provider', async (req, res) => {
    const secret = env.VIBE_ASSET_WEBHOOK_SECRET;
    if (!secret || !provider || req.params.provider !== provider.id) throw errors.notFound();
    const sig = String(req.get('x-vibe-signature') || '');
    const expect = 'sha256=' + crypto.createHmac('sha256', secret).update(JSON.stringify(req.body ?? null)).digest('hex');
    if (!safeEqual(sig, expect)) throw errors.forbidden('서명이 올바르지 않아요.');
    let r;
    try { r = await pipeline.handleWebhook(req.body); } catch (e) { if (e?.code === 'BAD_WEBHOOK') throw errors.badRequest(); throw e; }
    res.json({ ok: true, duplicate: !!r.duplicate });
  });

  // ── 작업자 ──
  router.post('/assets/worker/drain', async (req, res) => {
    const secret = env.VIBE_ASSET_WORKER_SECRET;
    if (!secret) throw errors.notFound();
    if (!safeEqual(String(req.get('x-vibe-worker-secret') || ''), secret)) throw errors.forbidden();
    const max = Math.min(10, Math.max(1, Number(req.body?.max) || 5));
    res.json({ processed: await pipeline.drain({ max }) });
  });

  // ── 학생 ──
  router.post('/assets', originCheck, services.requireStudent, limitStudent, limitCreate, async (req, res) => {
    const s = res.locals.student;
    const b = req.body || {};
    const { projectId, revision, slotId, assetBrief } = b;
    if (typeof projectId !== 'string' || !Number.isInteger(revision) || typeof slotId !== 'string' || !SLOT_ID.test(slotId)) throw errors.badRequest();
    const briefErrs = validateAssetBrief(assetBrief);
    if (briefErrs.length) throw errors.badRequest('그림 요청 형식이 올바르지 않아요.');
    if (assetBrief.projectId !== projectId || assetBrief.slotId !== slotId || assetBrief.baseRevision !== revision) throw errors.badRequest('그림 요청 정보가 서로 맞지 않아요.');
    const got = await services.projects.getOwned(s, projectId);
    if (!got) throw errors.notFound('작품을 찾을 수 없어요.');
    const project = got.envelope.project;
    if (project.revision !== revision) {
      throw new ApiError('REVISION_CONFLICT', '그 사이에 작품이 바뀌었어요. 최신 작품에서 다시 요청해 주세요.', { retryable: false, headers: { 'X-Vibe-Revision': String(project.revision) } });
    }
    const requestedFrom = slotLook(project.assets, slotId);
    if (!requestedFrom) throw errors.badRequest('작품에 없는 모습 칸이에요.');
    let r;
    try {
      r = await pipeline.submit({ owner: s, projectId, revision, slotId, brief: assetBrief, requestedFrom });
    } catch (e) {
      if (e?.code === 'BAD_BRIEF') throw errors.badRequest('그림 요청 형식이 올바르지 않아요.');
      throw e;
    }
    const env2 = await pipeline.get(r.job.jobId, s);
    res.status(202).json({ created: r.created, job: pipeline.view(env2), proposal: proposalOf(env2.job, project) });
  });

  router.get('/assets/:jobId', services.requireStudent, limitStudent, async (req, res) => {
    const s = res.locals.student;
    const id = String(req.params.jobId);
    if (!ASSET_JOB_ID.test(id)) throw errors.notFound('요청을 찾을 수 없어요.');
    let env2 = await pipeline.get(id, s);
    if (!env2) throw errors.notFound('요청을 찾을 수 없어요.');
    if (stepOnPoll && !pipeline.jobs.terminal(env2.job.status)) {
      await pipeline.step(id, 'poll:' + res.locals.requestId);
      env2 = await pipeline.get(id, s);
    }
    const got = await services.projects.getOwned(s, env2.job.projectId);
    res.json({ job: pipeline.view(env2), proposal: proposalOf(env2.job, got ? got.envelope.project : null) });
  });

  router.post('/assets/:jobId/cancel', originCheck, services.requireStudent, limitStudent, async (req, res) => {
    const s = res.locals.student;
    const id = String(req.params.jobId);
    if (!ASSET_JOB_ID.test(id)) throw errors.notFound('요청을 찾을 수 없어요.');
    const r = await pipeline.cancel(id, s);
    if (!r.ok) throw errors.notFound('요청을 찾을 수 없어요.');
    const env2 = await pipeline.get(id, s);
    res.json({ job: pipeline.view(env2) });
  });

  router.use('/assets', errorHandler(log));

  router.pipeline = pipeline;
  router.providerReason = providerReason;
  router.storage = storage;
  return router;
}

/**
 * 서버 쪽 후보 제안 — 자동 덮어쓰기는 하지 않는다. 클라이언트가 planSwap으로 다시 확인 후 store에 반영.
 * @returns {{applicable:boolean, reason:string, assetRef?:object}}
 */
export function proposalOf(job, project) {
  if (!project) return { applicable: false, reason: 'PROJECT_GONE' };
  const arrived = { status: job.status, slotId: job.slotId, cancelled: job.status === 'cancelled', requestedFrom: job.requestedFrom, candidate: job.candidate };
  const chk = checkApplicable(arrived, project.assets);
  if (!chk.applicable) return { applicable: false, reason: chk.reason };
  const cur = slotLook(project.assets, job.slotId);
  const c = job.candidate;
  return {
    applicable: true, reason: 'OK', projectRevision: project.revision,
    assetRef: c.assetId ? { slotId: job.slotId, assetId: c.assetId, preset: cur.preset } : { slotId: job.slotId, assetId: null, preset: c.preset },
  };
}

function safeEqual(a, b) {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}
