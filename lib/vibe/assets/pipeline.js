// 에셋 생성 파이프라인 (§6.2·§6.3) — queued → generating → validating → processing → ready / failed·cancelled·timed_out.
//
// 서버리스 원칙: POST 응답 뒤 메모리 Promise로 일을 계속하지 않는다. 모든 진행은 영속 job + lease 아래의
// step(jobId)으로만 일어난다. step은 (a) 학생의 GET 폴링(제한된 polling), (b) 작업자 drain(cron/큐), (c) 공급자 webhook이 부른다.
//
// 멱등:
//   요청 키   = 사용자 + 프로젝트 + 슬롯 + genKey          → 같은 요청 중복 POST = 같은 job
//   genKey    = 사용자 + brief 내용 hash + 공급자 + 모델 + 스타일 버전 → 결과 캐시·생성 잠금(중복 청구 방지)
//   webhook   = 공급자 + eventId nx                           → 중복 webhook 무시
// 비용: 유료 호출 직전에 예산 예약 → 결과 후 정산 / 호출 전 실패는 해제. 초과면 유료 호출만 막고 placeholder 유지.

import crypto from 'node:crypto';
import { validateAssetBrief } from '../../../public/vibe-v2/shared/contracts/schemas.js';
import { createAssetJobStore, AssetJobError } from './jobs.js';
import { buildPrompt, briefContentHash, sanitizeSubject } from './style.js';
import { matchBrief, buildIndex } from './match.js';
import { inspectBytes, analyzePixels } from './inspect.js';
import { keyOutBorder, resizeToFit } from './image/ops.js';
import { encodePng } from './image/codec.js';
import { ProviderError } from './providers/errors.js';
import { BUDGET } from './catalog.js';

export const PIPELINE_DEFAULTS = Object.freeze({
  jobDeadlineMs: 180_000,      // 요청 전체 기한
  stepTimeoutMs: 25_000,       // 공급자 호출 1회 상한 (함수 시간 제한 안쪽)
  maxAttempts: 3,              // 최초 1 + 재시도 2
  leaseMs: 40_000,
  genLockMs: 60_000,
  derivativeSizes: [128, 256, 512],
});

const STUDENT_MESSAGES = {
  queued: '그림을 만들 준비 중이에요. 그동안 지금 모습으로 놀 수 있어요.',
  generating: '그림을 그리는 중이에요. 게임은 계속할 수 있어요.',
  validating: '그림을 확인하는 중이에요.',
  processing: '그림을 게임에 맞게 다듬는 중이에요.',
  ready: '새 그림이 준비됐어요!',
  reused: '이미 있는 그림을 찾았어요!',
  failed: '이번에는 그림을 못 만들었어요. 지금 모습 그대로 쓸게요.',
  quota: '오늘은 새 그림을 더 만들 수 없어요. 지금 모습 그대로 쓸게요.',
  unavailable: '지금은 새 그림을 만들 수 없어요. 지금 모습 그대로 쓸게요.',
  unsafe: '그 그림은 만들 수 없어요. 다른 걸로 바꿔 볼까?',
  timed_out: '그림이 너무 오래 걸려서 멈췄어요. 지금 모습 그대로 쓸게요.',
};

// 검사 코드 중 다시 그려 보면 나아질 수 있는 것 (재시도 대상)
const RETRYABLE_CODES = new Set(['BLANK_IMAGE', 'FAKE_TRANSPARENCY_CHECKERBOARD', 'CHECKERBOARD_BACKGROUND', 'ALPHA_MISSING', 'CROPPED_AT_EDGE',
  'OFF_CENTER', 'ASPECT_MISMATCH', 'DECODE_FAILED', 'MIME_MISMATCH', 'MIME_UNKNOWN', 'MIME_NOT_ALLOWED', 'FILE_TOO_LARGE', 'TOO_MANY_PIXELS',
  'EMPTY_FILE', 'DIMENSIONS_UNKNOWN', 'TOO_SMALL', 'ALPHA_UNVERIFIABLE', 'UNSUPPORTED_PNG', 'OVER_BUDGET']);

const sha = s => crypto.createHash('sha256').update(s).digest('hex');

/**
 * @param {{
 *   kv: object, storage: object, manifest: object,
 *   provider?: object|null, budget?: object|null, now?: () => number,
 *   log?: (e:object)=>void, limits?: Partial<typeof PIPELINE_DEFAULTS>, refOf?: (id:string)=>string,
 * }} deps
 */
export function createAssetPipeline(deps) {
  const { kv, storage, manifest } = deps;
  if (!kv || !storage || !manifest) throw new Error('createAssetPipeline: kv, storage, manifest required');
  const provider = deps.provider || null;
  const budget = deps.budget || null;
  const now = deps.now || Date.now;
  const L = { ...PIPELINE_DEFAULTS, ...(deps.limits || {}) };
  const log = deps.log || null;
  const refOf = deps.refOf || (id => sha('ref:' + id).slice(0, 10));
  const jobs = createAssetJobStore(kv, { now });
  const index = buildIndex(manifest);

  function trace(env, outcome, extra = {}) {
    log?.({
      level: 'info', event: 'asset', jobId: env.job.jobId, projectRef: refOf(env.job.projectId), baseRevision: env.job.baseRevision,
      provider: env.job.provider, model: env.job.model, promptVersion: env.job.promptVersion, styleVersion: env.job.styleVersion,
      attempt: env.job.attempts, validatorCodes: env.job.codes, outcome, elapsedMs: now() - Date.parse(env.job.createdAt), ...extra,
    });
  }

  // ─────────────────────────── 제출 ───────────────────────────

  /**
   * @param {{ owner:{studentId:string, classId?:string|null, displayName?:string}, projectId:string, revision:number, slotId:string,
   *           brief:object, requestedFrom:{assetId:string|null, preset:string|null} }} p
   * @returns {Promise<{created:boolean, job:object}>}
   */
  async function submit(p) {
    const errs = validateAssetBrief(p.brief);
    if (errs.length) throw Object.assign(new Error('brief invalid'), { code: 'BAD_BRIEF', details: errs.slice(0, 3) });
    const brief = p.brief;
    const san = sanitizeSubject(brief.subject, { studentNames: [p.owner.displayName].filter(Boolean) });
    const match = matchBrief({ kind: brief.kind, subject: san.ok ? san.text : '' }, manifest, { index });
    const styleVersion = `${brief.stylePack}`;
    const providerId = provider ? provider.id : 'none';
    const model = provider ? provider.model : 'none';
    const briefHash = briefContentHash(brief, san.ok ? san.text : brief.subject);
    const genKey = sha([p.owner.studentId, briefHash, providerId, model, styleVersion].join('|')).slice(0, 40);
    const requestKey = sha([p.projectId, p.slotId, genKey].join('|')).slice(0, 40);

    const job = {
      projectId: p.projectId, slotId: p.slotId, baseRevision: p.revision, kind: brief.kind,
      requestedFrom: { assetId: p.requestedFrom?.assetId ?? null, preset: p.requestedFrom?.preset ?? null },
      placeholder: match.placeholder, source: null, provider: providerId, model, styleVersion: null, promptVersion: null,
      candidate: null, studentMessage: STUDENT_MESSAGES.queued, deadlineAt: new Date(now() + L.jobDeadlineMs).toISOString(), maxAttempts: L.maxAttempts,
    };
    const priv = { genKey, briefHash, brief, subject: san.ok ? san.text : null };
    const r = await jobs.createOrGet({ ownerId: p.owner.studentId, classId: p.owner.classId ?? null, requestKey, job, priv });
    if (!r.created) return { created: false, job: r.job };
    const jobId = r.job.jobId;

    // 1) 기존 승인 에셋 재사용 (생성하지 않음)
    // 효과음은 생성하지 않는다(합성 8종 중 가장 가까운 것, 없으면 'pop')
    if (match.decision === 'reuse' || brief.kind === 'sfx') {
      const preset = brief.kind === 'sfx' ? (match.preset || match.placeholder) : match.preset;
      if (preset) {
        const env = await jobs.transition(jobId, 'ready', { force: true, job: { source: 'catalog', candidate: { assetId: null, preset, url: null }, studentMessage: STUDENT_MESSAGES.reused } });
        trace(env, 'reused');
        return { created: true, job: env.job };
      }
      const env = await fail(jobId, 'NO_MATCHING_SOUND', STUDENT_MESSAGES.failed, { force: true });
      return { created: true, job: env.job };
    }
    // 2) 프롬프트 정제 실패 (부적절·빈 요청)
    if (!san.ok) {
      const env = await fail(jobId, san.code, san.code === 'UNSAFE_SUBJECT' ? STUDENT_MESSAGES.unsafe : STUDENT_MESSAGES.failed, { force: true });
      return { created: true, job: env.job };
    }
    // 3) 공급자 없음 → placeholder로 계속 (AS01)
    if (!provider) {
      const env = await fail(jobId, 'PROVIDER_UNAVAILABLE', STUDENT_MESSAGES.unavailable, { force: true });
      return { created: true, job: env.job };
    }
    // 4) 같은 내용을 이미 만든 적 있으면 캐시 (청구 없음)
    const cached = await kv.get(`assetgen:${genKey}`);
    if (cached) {
      const env = await jobs.transition(jobId, 'ready', { force: true, job: { source: 'cache', candidate: cached.candidate, styleVersion: cached.styleVersion, promptVersion: cached.promptVersion, studentMessage: STUDENT_MESSAGES.ready } });
      trace(env, 'cache');
      return { created: true, job: env.job };
    }
    const built = buildPrompt(brief, { capabilities: provider.capabilities, studentNames: [p.owner.displayName].filter(Boolean) });
    if (!built.ok) {
      const env = await fail(jobId, built.code, STUDENT_MESSAGES.failed, { force: true });
      return { created: true, job: env.job };
    }
    const env = await jobs.patch(jobId, {
      force: true,
      job: { styleVersion: built.styleVersion, promptVersion: built.promptVersion },
      priv: { prompt: built.prompt, negative: built.negative, chromaKey: built.chromaKey, wantsAlpha: built.wantsAlpha },
    });
    return { created: true, job: env.job };
  }

  async function fail(jobId, code, message, o = {}) {
    const env = await jobs.transition(jobId, 'failed', { ...o, job: { codes: [code], studentMessage: message } });
    trace(env, 'failed', { code });
    return env;
  }

  // ─────────────────────────── 진행 ───────────────────────────

  /**
   * 작업을 한 단계(가능하면 끝까지) 진행한다. lease를 못 잡으면 아무것도 하지 않는다.
   * @returns {Promise<object|null>} 최신 job (없으면 null)
   */
  async function step(jobId, workerId = 'w_' + crypto.randomBytes(6).toString('hex')) {
    let env = await jobs.envelope(jobId);
    if (!env) return null;
    if (jobs.terminal(env.job.status)) return env.job;
    const l = await jobs.lease(jobId, workerId, L.leaseMs);
    if (!l.ok) return env.job;
    env = l.env;
    try {
      for (let guard = 0; guard < 8; guard++) {
        env = await jobs.envelope(jobId);
        if (!env || jobs.terminal(env.job.status)) break;
        if (now() > Date.parse(env.job.deadlineAt)) { env = await timeOut(env, workerId); break; }
        const s = env.job.status;
        let progressed;
        if (s === 'queued') progressed = await runQueued(env, workerId);
        else if (s === 'generating') progressed = await runGenerating(env, workerId);
        else if (s === 'validating' || s === 'processing') progressed = await runValidate(env, workerId);
        if (!progressed) break;
      }
    } catch (err) {
      if (!(err instanceof AssetJobError && ['ILLEGAL_TRANSITION', 'LEASE_HELD', 'STATE_CHANGED'].includes(err.kind))) throw err;
      // 도중에 취소됨·다른 worker 인수 → 조용히 종료
    } finally {
      await jobs.release(jobId, workerId);
    }
    return (await jobs.envelope(jobId))?.job ?? null;
  }

  async function timeOut(env, workerId) {
    const e = await jobs.transition(env.job.jobId, 'timed_out', { workerId, job: { studentMessage: STUDENT_MESSAGES.timed_out, codes: [...env.job.codes, 'DEADLINE'].slice(-6) } });
    await settleOrRelease(env);
    await releaseGenLock(env);
    trace(e, 'timed_out');
    return e;
  }

  async function runQueued(env, workerId) {
    const { jobId } = env.job;
    const cached = await kv.get(`assetgen:${env.priv.genKey}`);
    if (cached) {
      const e = await jobs.transition(jobId, 'ready', { workerId, job: { source: 'cache', candidate: cached.candidate, studentMessage: STUDENT_MESSAGES.ready } });
      trace(e, 'cache');
      return false;
    }
    if (!provider) { await fail(jobId, 'PROVIDER_UNAVAILABLE', STUDENT_MESSAGES.unavailable, { workerId }); return false; }
    if (env.job.attempts >= env.job.maxAttempts) { await fail(jobId, 'MAX_ATTEMPTS', STUDENT_MESSAGES.failed, { workerId }); await releaseGenLock(env); return false; }
    // 같은 내용을 다른 작업이 그리는 중이면 기다린다(동시 중복 청구 방지)
    const lockKey = `assetgenlock:${env.priv.genKey}`;
    const holder = await kv.get(lockKey);
    if (holder && holder.jobId !== jobId) return false;
    if (!holder && !(await kv.set(lockKey, { jobId }, { nx: true, ttlMs: L.genLockMs }))) return false;

    const attempt = env.job.attempts + 1;
    const cost = provider.estimateCost(env.priv.brief) || 0;
    let reservationId = null;
    if (budget && (provider.live || cost > 0)) {
      reservationId = `${jobId}:${attempt}`;
      let r;
      try { r = await budget.reserve({ reservationId, classId: env.classId, studentId: env.ownerId, amount: cost }); } catch (e) {
        if (e?.code !== 'BUSY') throw e;
        await releaseGenLock(env);
        return false; // 예산 키 경합 — 다음 step에서 다시
      }
      if (!r.ok) {
        await releaseGenLock(env);
        await fail(jobId, 'QUOTA_EXCEEDED', STUDENT_MESSAGES.quota, { workerId });
        return false;
      }
    }
    await jobs.transition(jobId, 'generating', {
      workerId,
      job: { attempts: attempt, studentMessage: STUDENT_MESSAGES.generating },
      priv: { reservationId, callStartedAt: now(), providerJobId: null, rawAssetId: null, callMade: false },
    });
    const e = await jobs.envelope(jobId);
    return callProvider(e, workerId, () => provider.generate(requestOf(e), { signal: timeoutSignal(e) }));
  }

  function requestOf(env) {
    const { brief } = env.priv;
    const cap = provider.capabilities.maxSide || 1024;
    const s = Math.min(1, cap / Math.max(brief.dimensions.width, brief.dimensions.height));
    return {
      prompt: env.priv.prompt, negative: env.priv.negative, chromaKey: env.priv.chromaKey,
      width: Math.round(brief.dimensions.width * s), height: Math.round(brief.dimensions.height * s),
      jobRef: env.job.jobId,
    };
  }

  function timeoutSignal(env) {
    const left = Math.max(1, Math.min(L.stepTimeoutMs, Date.parse(env.job.deadlineAt) - now()));
    return AbortSignal.timeout(left);
  }

  async function runGenerating(env, workerId) {
    if (env.priv.rawAssetId) { await jobs.transition(env.job.jobId, 'validating', { workerId }); return true; }
    if (env.priv.providerJobId && provider?.poll) {
      return callProvider(env, workerId, () => provider.poll(env.priv.providerJobId, { signal: timeoutSignal(env) }));
    }
    if (env.priv.providerJobId) return false; // webhook 대기
    // 호출 결과 없이 lease가 끊긴 작업(작업자 사망) — 청구됐을 수 있으니 정산 후 재시도
    await settleOrRelease(env);
    await jobs.transition(env.job.jobId, 'queued', { workerId, job: { codes: [...env.job.codes, 'WORKER_LOST'].slice(-6) } });
    return true;
  }

  async function callProvider(env, workerId, call) {
    const { jobId } = env.job;
    let result;
    try {
      await jobs.patch(jobId, { workerId, priv: { callMade: true } });
      result = await call();
    } catch (err) {
      const code = err instanceof ProviderError ? err.code : 'PROVIDER_ERROR';
      const retryable = err instanceof ProviderError ? err.retryable : true;
      const cur = await jobs.envelope(jobId);
      // 네트워크 전·인증 실패는 청구 없음, 타임아웃·5xx는 청구됐을 수 있어 추정 비용으로 정산(보수적)
      if (['TIMEOUT', 'PROVIDER_5XX', 'ABORTED'].includes(code)) await settle(cur, provider.estimateCost(cur.priv.brief) || 0);
      else await releaseReservation(cur);
      if (retryable && cur.job.attempts < cur.job.maxAttempts) {
        await jobs.transition(jobId, 'queued', { workerId, job: { codes: [...cur.job.codes, code].slice(-6) } });
        trace(cur, 'retry', { code });
        return true;
      }
      await releaseGenLock(cur);
      await fail(jobId, code === 'PROVIDER_DOWN' || code === 'PROVIDER_AUTH' ? 'PROVIDER_UNAVAILABLE' : code, STUDENT_MESSAGES.failed, { workerId });
      return false;
    }
    if (result.status === 'pending') {
      await jobs.patch(jobId, { workerId, priv: { providerJobId: result.providerJobId } });
      await jobs.mapProviderJob(provider.id, result.providerJobId, jobId);
      return false;
    }
    return acceptResult(jobId, result, { workerId });
  }

  /** 공급자 결과(바이트) 수령 → 격리 저장 → validating. 취소·종결된 작업이면 캐시에만 보관 */
  async function acceptResult(jobId, result, o) {
    const cur = await jobs.envelope(jobId);
    if (result.status === 'failed') {
      await releaseReservation(cur);
      if (cur.job.attempts < cur.job.maxAttempts && !jobs.terminal(cur.job.status)) {
        await jobs.transition(jobId, 'queued', { ...o, job: { codes: [...cur.job.codes, result.code || 'PROVIDER_ERROR'].slice(-6) } });
        return true;
      }
      if (!jobs.terminal(cur.job.status)) await fail(jobId, result.code || 'PROVIDER_ERROR', STUDENT_MESSAGES.failed, o);
      return false;
    }
    await settle(cur, result.costMicroUsd ?? provider?.estimateCost(cur.priv.brief) ?? 0);
    const bytes = result.bytes instanceof Uint8Array ? result.bytes : new Uint8Array(result.bytes || []);
    if (bytes.length > 16 * 1024 * 1024) { // 저장 전에 명백한 초대형은 버림
      if (!jobs.terminal(cur.job.status)) await validationFailed(cur, ['FILE_TOO_LARGE'], o);
      return false;
    }
    const raw = bytes.length ? await storage.put(bytes, rawMeta(cur, result)) : null;
    if (jobs.terminal(cur.job.status)) { // 늦게 도착: 작품에는 반영하지 않고 검사 후 캐시에만 보관
      if (raw) await finishFromRaw(cur, raw.assetId, { archiveOnly: true });
      return false;
    }
    await jobs.transition(jobId, 'validating', { ...o, job: { studentMessage: STUDENT_MESSAGES.validating }, priv: { rawAssetId: raw?.assetId ?? null, declaredMime: result.declaredMime ?? null } });
    return true;
  }

  function rawMeta(env, result) {
    return {
      approval: 'quarantine', kind: env.job.kind, provider: env.job.provider, model: env.job.model,
      promptVersion: env.job.promptVersion, styleVersion: env.job.styleVersion, declaredMime: result.declaredMime ?? null,
    };
  }

  async function runValidate(env, workerId) {
    return finishFromRaw(env, env.priv.rawAssetId, { workerId });
  }

  /**
   * 검사·후처리·저장. archiveOnly면 작업 상태는 건드리지 않고 결과만 캐시.
   */
  async function finishFromRaw(env, rawAssetId, o = {}) {
    const { jobId } = env.job;
    const brief = env.priv.brief;
    const raw = rawAssetId ? await storage.get(rawAssetId) : null;
    if (!raw) { if (!o.archiveOnly) await validationFailed(env, ['EMPTY_FILE'], o); return false; }
    const wantsAlpha = !!env.priv.wantsAlpha;
    const insp = inspectBytes(raw.bytes, { declaredMime: env.priv.declaredMime ?? raw.meta.declaredMime, expect: { kind: brief.kind, transparent: wantsAlpha, width: brief.dimensions.width, height: brief.dimensions.height } });
    let image = insp.image;
    let codes = insp.codes.slice();
    const notes = insp.warnings.slice();
    // 투명이 필요한데 단색 배경(크로마·흰 배경)이면 검증된 키잉 후처리
    if (codes.length === 1 && codes[0] === 'ALPHA_MISSING_KEYABLE' && image) {
      const keyed = keyOutBorder(image);
      if (keyed) {
        const again = analyzePixels(keyed.image, { kind: brief.kind, transparent: true });
        codes = again.codes.map(c => (c === 'ALPHA_MISSING_KEYABLE' ? 'ALPHA_MISSING' : c));
        image = keyed.image;
        notes.push('KEYED_BACKGROUND');
      } else codes = ['ALPHA_MISSING'];
    }
    if (codes.length) {
      await rejectRaw(rawAssetId);
      if (!o.archiveOnly) await validationFailed(env, codes, o);
      return false;
    }
    if (!o.archiveOnly) await jobs.transition(jobId, 'processing', { workerId: o.workerId, force: o.force, job: { studentMessage: STUDENT_MESSAGES.processing } });

    const processed = await processImage(env, raw, insp, image, notes);
    if (!processed.ok) {
      await rejectRaw(rawAssetId);
      if (!o.archiveOnly) await validationFailed(env, processed.codes, o);
      return false;
    }
    const candidate = processed.candidate;
    await kv.set(`assetgen:${env.priv.genKey}`, { candidate, styleVersion: env.job.styleVersion, promptVersion: env.job.promptVersion }, { ttlMs: 30 * 86_400_000 });
    await releaseGenLock(env);
    if (o.archiveOnly) { log?.({ level: 'info', event: 'asset', jobId, outcome: 'archived-late' }); return false; }
    const e = await jobs.transition(jobId, 'ready', { workerId: o.workerId, force: o.force, job: { source: 'provider', candidate, codes: notes.slice(0, 6), studentMessage: STUDENT_MESSAGES.ready } });
    trace(e, 'ready');
    return false;
  }

  async function processImage(env, raw, insp, image, notes) {
    const brief = env.priv.brief;
    const kind = brief.kind === 'card' ? 'card' : brief.kind === 'background' ? 'background' : 'sprite';
    const cap = BUDGET[kind];
    const meta = base => ({
      approval: 'approved', kind: brief.kind, provider: env.job.provider, model: env.job.model, promptVersion: env.job.promptVersion,
      styleVersion: env.job.styleVersion, license: '생성 에셋 — AIroom 수업용', provenance: { type: 'ai', label: `AI 생성(${env.job.provider}/${env.job.model})`, jobRef: env.job.jobId, rawAssetId: raw.meta.sha256 ? 'ga_' + raw.meta.sha256.slice(0, 32) : null }, ...base,
    });
    if (!image) {
      // JPEG/WebP(불투명 배경만 여기 도달): 픽셀 디코딩·재압축 불가 → 예산 안이면 원본 그대로 승인
      if (raw.bytes.length > cap.maxBytes) return { ok: false, codes: ['OVER_BUDGET'] };
      const put = await storage.put(raw.bytes, meta({ mime: insp.mime, width: insp.width, height: insp.height }));
      notes.push('NO_DERIVATIVES_NON_PNG');
      return { ok: true, candidate: { assetId: put.assetId, preset: null, url: put.url, mime: insp.mime, width: insp.width, height: insp.height, bytes: put.bytes, sha256: put.sha256, derivatives: [] } };
    }
    // 요청 크기에 맞춤(축소만) → 주 이미지
    const target = Math.max(brief.dimensions.width, brief.dimensions.height);
    const main = resizeToFit(image, target) || image;
    const opaque = !env.priv.wantsAlpha;
    const derivatives = [];
    for (const size of L.derivativeSizes) {
      if (size >= Math.max(main.width, main.height)) continue;
      const d = resizeToFit(main, size);
      const png = encodePng(d, { opaque });
      if (png.length > cap.maxBytes) { notes.push('DERIVATIVE_OVER_BUDGET_' + size); continue; }
      const put = await storage.put(new Uint8Array(png), meta({ mime: 'image/png', width: d.width, height: d.height, size, derivativeOf: 'main' }));
      derivatives.push({ size, assetId: put.assetId, url: put.url, width: d.width, height: d.height, bytes: put.bytes, sha256: put.sha256 });
    }
    const mainPng = encodePng(main, { opaque });
    const mainImg = main;
    if (mainPng.length > cap.maxBytes) {
      // 주 이미지가 예산 초과 → 예산 안의 가장 큰 파생본을 주 이미지로
      const fit = derivatives.filter(d => d.bytes <= cap.maxBytes).sort((a, b) => b.size - a.size)[0];
      if (!fit) return { ok: false, codes: ['OVER_BUDGET'] };
      notes.push('MAIN_DOWNSIZED_FOR_BUDGET');
      return { ok: true, candidate: { assetId: fit.assetId, preset: null, url: fit.url, mime: 'image/png', width: fit.width, height: fit.height, bytes: fit.bytes, sha256: fit.sha256, derivatives } };
    }
    if (mainPng.length > cap.targetBytes) notes.push('OVER_TARGET_BYTES');
    const put = await storage.put(new Uint8Array(mainPng), meta({ mime: 'image/png', width: mainImg.width, height: mainImg.height }));
    return { ok: true, candidate: { assetId: put.assetId, preset: null, url: put.url, mime: 'image/png', width: mainImg.width, height: mainImg.height, bytes: put.bytes, sha256: put.sha256, derivatives } };
  }

  async function validationFailed(env, codes, o) {
    const cur = await jobs.envelope(env.job.jobId);
    const allCodes = [...cur.job.codes, ...codes].slice(-6);
    const retry = codes.every(c => RETRYABLE_CODES.has(c)) && cur.job.attempts < cur.job.maxAttempts;
    if (retry) {
      await jobs.transition(cur.job.jobId, 'queued', { workerId: o.workerId, force: o.force, job: { codes: allCodes }, priv: { rawAssetId: null, providerJobId: null } });
      trace(cur, 'retry', { code: codes[0] });
      return;
    }
    await releaseGenLock(cur);
    const e = await jobs.transition(cur.job.jobId, 'failed', { workerId: o.workerId, force: o.force, job: { codes: allCodes, studentMessage: STUDENT_MESSAGES.failed } });
    trace(e, 'failed', { code: codes[0] });
  }

  /** 검사에 떨어진 원본만 rejected로. 같은 바이트가 이미 승인돼 있으면 건드리지 않는다(내용 주소 저장) */
  async function rejectRaw(id) {
    const m = await storage.head(id);
    if (m && m.approval === 'quarantine') await storage.setApproval(id, 'rejected');
  }

  // ── 비용·잠금 ──
  async function settle(env, amount) {
    if (budget && env?.priv?.reservationId) await budget.settle(env.priv.reservationId, amount);
  }
  async function releaseReservation(env) {
    if (budget && env?.priv?.reservationId) await budget.release(env.priv.reservationId);
  }
  async function settleOrRelease(env) {
    if (!env?.priv?.reservationId) return;
    if (env.priv.callMade) await settle(env, provider?.estimateCost(env.priv.brief) || 0);
    else await releaseReservation(env);
  }
  async function releaseGenLock(env) {
    const k = `assetgenlock:${env.priv.genKey}`;
    const h = await kv.get(k);
    if (h && h.jobId === env.job.jobId) await kv.del(k);
  }

  // ─────────────────────────── 조회·취소·webhook·drain ───────────────────────────

  async function get(jobId, owner) { return jobs.get(jobId, { ownerId: owner?.studentId }); }

  async function cancel(jobId, owner) {
    const r = await jobs.cancel(jobId, { ownerId: owner?.studentId });
    if (r.ok && r.env) {
      const env = r.env;
      await settleOrRelease(env);
      await releaseGenLock(env);
      trace(env, 'cancelled');
    }
    return r;
  }

  /**
   * 공급자 webhook. 서명 검증은 라우트가 먼저 한다. eventId로 중복 무시.
   * @returns {Promise<{ok:boolean, duplicate?:boolean, jobId?:string}>}
   */
  async function handleWebhook(body) {
    if (!provider?.parseWebhook) return { ok: false, reason: 'NO_WEBHOOK' };
    const ev = provider.parseWebhook(body);
    const first = await kv.set(`assetwh:${provider.id}:${String(ev.eventId).slice(0, 120)}`, { at: now() }, { nx: true, ttlMs: 7 * 86_400_000 });
    if (!first) return { ok: true, duplicate: true };
    const env = await jobs.byProviderJob(provider.id, ev.providerJobId);
    if (!env) return { ok: true, unknown: true };
    if (env.job.status !== 'generating' || env.priv.rawAssetId) {
      if (jobs.terminal(env.job.status) && ev.result.status === 'done') await acceptResult(env.job.jobId, ev.result, { force: true });
      return { ok: true, jobId: env.job.jobId, ignored: true };
    }
    await acceptResult(env.job.jobId, ev.result, { force: true });
    await step(env.job.jobId, 'webhook:' + String(ev.eventId).slice(0, 40));
    return { ok: true, jobId: env.job.jobId };
  }

  /** 작업자 루프 1회: 회수 가능한 작업을 최대 max개 진행 (cron/큐에서 호출) */
  async function drain({ workerId = 'drain_' + crypto.randomBytes(4).toString('hex'), max = 5 } = {}) {
    const ids = await jobs.reclaimable({ limit: max * 2 });
    const done = [];
    for (const id of ids.slice(0, max)) done.push(await step(id, workerId));
    return done.filter(Boolean).map(j => ({ jobId: j.jobId, status: j.status }));
  }

  /** 학생에게 보낼 공개 view */
  function view(env) {
    const j = env.job;
    return {
      jobId: j.jobId, projectId: j.projectId, slotId: j.slotId, baseRevision: j.baseRevision, kind: j.kind, status: j.status,
      source: j.source, attempts: j.attempts, maxAttempts: j.maxAttempts, codes: j.codes, studentMessage: j.studentMessage,
      placeholder: j.placeholder, requestedFrom: j.requestedFrom, candidate: j.candidate, provider: j.provider, model: j.model,
      styleVersion: j.styleVersion, promptVersion: j.promptVersion, deadlineAt: j.deadlineAt, createdAt: j.createdAt, updatedAt: j.updatedAt,
      events: env.events.map(e => ({ seq: e.seq, status: e.status, at: e.at })),
    };
  }

  return { submit, step, get, cancel, handleWebhook, drain, view, jobs, limits: L, provider };
}
