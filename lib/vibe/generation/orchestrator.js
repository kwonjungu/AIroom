// 생성 오케스트레이터 — 요청 분류 → (필요할 때만) 모델 호출 → 검증 → 제한된 수리.
// job store와 분리된 순수 파이프라인이다(eval 러너가 그대로 쓴다). 상태 기록·취소 확인은 콜백으로 주입한다.
//
// 상한(§4.3): 전체 공급자 시도 최대 3회(생성 1 + 수리 1 + 일시 오류 재시도 1), 총 deadline 40초,
// 개별 호출 12초, 남은 시간이 부족하면 새 호출을 시작하지 않는다. 같은 실패가 반복되면 중단한다.
// 권한·예산·미지원·관리 오류는 수리하지 않는다. 모델·키·수리 루프가 각각 최대치를 곱하는 구조를 만들지 않는다.

import { diag, PATCH_SCHEMA_VERSION, CONTRACT_VERSION } from '../../../public/vibe-v2/shared/contracts/schemas.js';
import { classifyIntent } from './classify.js';
import { buildContext, OUTPUT_BUDGET, PROMPT_VERSION } from './context.js';
import { buildOutputSchema, normalizeModelOutput, LLM_OUTPUT_VERSION } from './llm-schema.js';
import { validateCandidate, VALIDATOR_VERSION } from './validate.js';

export const GEN_LIMITS = Object.freeze({
  deadlineMs: 40_000,
  callTimeoutMs: 12_000,
  minCallMs: 3_000,        // 이보다 남은 시간이 적으면 새 호출 금지
  reserveMs: 1_000,        // 검증·기록용으로 남겨 둘 시간
  maxCalls: 3,
  maxRepairs: 1,
  maxTransientRetries: 1,
  maxRetryWaitMs: 5_000,   // Retry-After가 이보다 길면 기다리지 않고 실패(학생에게 잠시 뒤 안내)
});

export const VERSIONS = Object.freeze({
  promptVersion: PROMPT_VERSION,
  schemaVersion: `patch-${PATCH_SCHEMA_VERSION}/${LLM_OUTPUT_VERSION}/${VALIDATOR_VERSION}`,
  templateVersion: `templates@${CONTRACT_VERSION}`,
});

export const MESSAGES = Object.freeze({
  keep: '지금 작품은 그대로예요.',
  busy: 'AI가 지금 바빠요. 잠시 뒤에 다시 해 볼까? 지금 작품은 그대로예요.',
  admin: 'AI 도우미 설정에 문제가 있어요. 선생님께 알려 주세요. (내 잘못이 아니에요)',
  timeout: '시간이 너무 오래 걸려서 멈췄어요. 지금 작품은 그대로예요.',
  invalid: '이번에는 잘 안 됐어요. 조금 다르게 말해 볼까? 지금 작품은 그대로예요.',
  superseded: '작품이 바뀌어서 이 요청은 멈췄어요. 다시 말해 줄래?',
  unsupportedModel: '이 게임에서는 아직 그렇게 바꿀 수 없어요. 속도·목표·모습을 바꿔 볼까?',
  quota: '오늘 쓸 수 있는 AI 사용량을 다 썼어요. 블록으로 직접 바꿔 볼까?',
});

const ADMIN_CODE = { not_configured: 'PROVIDER_NOT_CONFIGURED', auth: 'PROVIDER_AUTH', model_not_found: 'PROVIDER_MODEL_NOT_FOUND', bad_request: 'PROVIDER_REQUEST_REJECTED', request_too_large: 'PROVIDER_REQUEST_TOO_LARGE' };

export class StopSignal extends Error { constructor(outcome) { super(outcome); this.outcome = outcome; } }

const clip = (s, n = 120) => String(s).slice(0, n);

/**
 * @param {{
 *   project:object, intentText:string, provider:object, deadlineAt:number,
 *   now?:()=>number, sleep?:(ms:number)=>Promise<void>,
 *   setState?:(status:string, extra?:object)=>Promise<void>,   // 비종결 상태 기록
 *   checkpoint?:()=>Promise<string|null>,                      // 'cancelled'|'superseded'|null
 *   beforeCall?:(n:number)=>Promise<void>,                     // 호출 직전(시도 수 선기록 등)
 *   callSignal?:()=>AbortSignal|undefined,
 *   budget?:{reserve:Function, settle:Function, cooldownUntil:Function, setCooldown:Function}|null,
 *   trace?:(e:object)=>void, limits?:Partial<typeof GEN_LIMITS>, priorCalls?:number, env?:object,
 *   ids?:{requestId?:string, jobId?:string, projectId?:string},
 * }} p
 * @returns {Promise<{outcome:'ready'|'failed'|'timed_out'|'cancelled'|'superseded', candidate?:object, diagnostics:object[],
 *   studentMessage:string, attempts:number, path:string, calls:object[], validatorCodes:string[], retryAfterMs?:number|null, adminError?:string}>}
 */
export async function runPipeline(p) {
  const L = { ...GEN_LIMITS, ...(p.limits || {}) };
  const now = p.now || Date.now;
  const sleep = p.sleep || (ms => new Promise(r => setTimeout(r, ms)));
  const setState = p.setState || (async () => {});
  const checkpoint = p.checkpoint || (async () => null);
  const trace = p.trace || (() => {});
  const { project, provider } = p;
  const started = now();
  const calls = [];
  const validatorCodes = [];
  let attempts = p.priorCalls || 0;
  const common = { ...VERSIONS, ...p.ids, baseRevision: project.revision, engineVersion: project.engineVersion, provider: provider?.name };

  const done = (outcome, o = {}) => {
    const r = { outcome, diagnostics: (o.diagnostics || []).slice(0, 20), studentMessage: clip(o.studentMessage || ''), attempts, path: cls?.kind || 'none', calls, validatorCodes: [...new Set(validatorCodes)], candidate: o.candidate, retryAfterMs: o.retryAfterMs ?? null, adminError: o.adminError };
    trace({ ...common, event: 'generation.done', path: r.path, attempt: attempts, outcome, validatorCodes: r.validatorCodes, elapsedMs: now() - started, errorKind: o.errorKind });
    return r;
  };
  const stopIfNeeded = async () => { const s = await checkpoint(); if (s) throw new StopSignal(s); };

  let cls = null;
  try {
    await stopIfNeeded();
    await setState('planning');
    cls = classifyIntent({ text: p.intentText, project });
    trace({ ...common, event: 'generation.classified', path: cls.kind });

    if (cls.kind === 'invalid' || cls.kind === 'unsupported' || cls.kind === 'at_limit') {
      return done('failed', { studentMessage: cls.studentMessage, diagnostics: [diag(cls.code, { severity: 'error', message: cls.kind, studentHint: clip(cls.studentMessage) })] });
    }

    if (cls.kind === 'direct' || cls.kind === 'template') {
      const operations = cls.kind === 'direct' ? cls.operations : [{ op: 'instantiateTemplate', templateId: cls.templateId, params: cls.params }];
      const patch = { schemaVersion: PATCH_SCHEMA_VERSION, baseRevision: project.revision, summary: '규칙 기반 변경', operations, assetRequests: [] };
      const v = validateCandidate({ project, patch, expect: cls.expect });
      validatorCodes.push(...v.codes);
      trace({ ...common, event: 'generation.validated', path: cls.kind, stage: v.stage, validatorCodes: v.codes, outcome: v.ok ? 'pass' : 'fail' });
      if (!v.ok) return done('failed', { diagnostics: v.diagnostics, studentMessage: v.diagnostics[0]?.studentHint || MESSAGES.invalid });
      await stopIfNeeded();
      let msg = v.candidate.patch.summary;
      if (cls.kind === 'template' && cls.adjusted?.length) msg = clip(`${msg} ${cls.adjusted[0].studentHint}`.trim());
      return done('ready', { candidate: v.candidate, studentMessage: msg, diagnostics: v.warnings });
    }

    return await llmLoop();
  } catch (e) {
    if (e instanceof StopSignal) return done(e.outcome, { studentMessage: e.outcome === 'superseded' ? MESSAGES.superseded : '요청을 취소했어요.' });
    throw e;
  }

  async function llmLoop() {
    const task = cls.kind === 'llm_plan' ? 'plan' : 'rule';
    const useLight = cls.budget === 'simple' && p.env?.VIBE_GEN_LIGHT_FOR_SIMPLE === '1';
    const model = useLight ? provider.models.light : provider.models.primary;
    const schema = buildOutputSchema({ task });
    let repairs = 0, transient = 0, repairCtx = null, lastFingerprint = null, lastTransientKind = null;
    await setState('generating');

    for (;;) {
      await stopIfNeeded();
      if (attempts >= L.maxCalls) return done('failed', { studentMessage: MESSAGES.invalid, diagnostics: [diag('ATTEMPTS_EXHAUSTED', { message: `${attempts} calls`, studentHint: MESSAGES.invalid })] });
      let remaining = p.deadlineAt - now();
      if (remaining < L.minCallMs + L.reserveMs) return done('timed_out', { studentMessage: MESSAGES.timeout, diagnostics: [diag('DEADLINE_EXCEEDED', { message: `remaining ${remaining}ms`, studentHint: MESSAGES.timeout })] });

      // 조직 공유 냉각(429 Retry-After 등)
      if (p.budget) {
        const until = await p.budget.cooldownUntil();
        const wait = until ? until - now() : 0;
        if (wait > 0) {
          if (wait > L.maxRetryWaitMs || now() + wait + L.minCallMs + L.reserveMs > p.deadlineAt) {
            return done('failed', { studentMessage: MESSAGES.busy, retryAfterMs: wait, errorKind: 'cooldown', diagnostics: [diag('PROVIDER_UNAVAILABLE', { message: `cooldown ${wait}ms`, studentHint: MESSAGES.busy })] });
          }
          await sleep(wait);
          await stopIfNeeded();
          remaining = p.deadlineAt - now();
        }
      }

      const ctx = buildContext({ project, intentText: p.intentText, classification: cls, task, repair: repairCtx, budget: cls.budget });
      const maxOut = repairCtx ? OUTPUT_BUDGET.repair : OUTPUT_BUDGET[cls.budget || 'simple'];
      const reserveTokens = ctx.estInputTokens + maxOut;
      if (p.budget) {
        const r = await p.budget.reserve(reserveTokens);
        if (!r.ok) return done('failed', { studentMessage: MESSAGES.quota, errorKind: 'quota', diagnostics: [diag('QUOTA_EXCEEDED', { message: 'daily token budget', studentHint: MESSAGES.quota })] });
      }
      attempts++;
      if (p.beforeCall) await p.beforeCall(attempts);
      const timeoutMs = Math.max(1, Math.min(L.callTimeoutMs, remaining - L.reserveMs));
      const res = await provider.complete({ model, system: ctx.system, user: ctx.user, schema, schemaName: task === 'plan' ? 'game_plan' : 'game_patch', maxOutputTokens: maxOut, timeoutMs, signal: p.callSignal?.() });
      if (p.budget) await p.budget.settle(reserveTokens, res.usage?.total ?? (res.ok ? reserveTokens : 0));
      const call = { attempt: attempts, model, ok: res.ok, kind: res.ok ? 'ok' : res.error.kind, usage: res.usage, elapsedMs: res.elapsedMs, repair: !!repairCtx, estInputTokens: ctx.estInputTokens };
      calls.push(call);
      trace({ ...common, event: 'generation.call', path: cls.kind, model, attempt: attempts, tokenUsage: res.usage, elapsedMs: res.elapsedMs, outcome: call.kind, errorKind: res.ok ? undefined : res.error.kind, responseFormat: res.responseFormat, truncated: ctx.truncated, estInputTokens: ctx.estInputTokens });

      // 잔여량 헤더: 다음 호출에 필요한 토큰보다 적으면 조직 냉각을 건다
      if (p.budget && res.rate && res.rate.remainingTokens !== null && res.rate.remainingTokens < reserveTokens && res.rate.resetTokensMs) await p.budget.setCooldown(res.rate.resetTokensMs);

      if (!res.ok) {
        const e = res.error;
        if (e.admin) {
          const code = ADMIN_CODE[e.kind] || 'PROVIDER_CONFIG';
          return done('failed', { studentMessage: MESSAGES.admin, adminError: code, errorKind: e.kind, diagnostics: [diag(code, { message: `provider ${e.kind}${e.httpStatus ? ' ' + e.httpStatus : ''}`, studentHint: MESSAGES.admin })] });
        }
        if (e.kind === 'aborted') { await stopIfNeeded(); return done('failed', { studentMessage: MESSAGES.invalid, errorKind: 'aborted' }); }
        if (e.kind === 'refusal') return done('failed', { studentMessage: MESSAGES.unsupportedModel, errorKind: 'refusal', diagnostics: [diag('MODEL_REFUSED', { studentHint: MESSAGES.unsupportedModel })] });
        if (e.retryable) {
          if (e.kind === 'rate_limited' && p.budget) await p.budget.setCooldown(e.retryAfterMs ?? 1000);
          const wait = e.retryAfterMs ?? 500;
          const tooLate = now() + wait + L.minCallMs + L.reserveMs > p.deadlineAt;
          if (transient >= L.maxTransientRetries || lastTransientKind === e.kind && transient > 0 || wait > L.maxRetryWaitMs || tooLate) {
            const out = e.kind === 'timeout' && tooLate ? 'timed_out' : 'failed';
            return done(out, { studentMessage: out === 'timed_out' ? MESSAGES.timeout : MESSAGES.busy, retryAfterMs: e.retryAfterMs, errorKind: e.kind, diagnostics: [diag(out === 'timed_out' ? 'DEADLINE_EXCEEDED' : 'PROVIDER_UNAVAILABLE', { message: `provider ${e.kind}`, studentHint: MESSAGES.busy })] });
          }
          transient++; lastTransientKind = e.kind;
          await sleep(wait);
          continue;
        }
        // 형식 실패(잘림·length·빈 응답·JSON 아님) → 수리 후보. 적용하지 않는다.
        const d = diag('MODEL_OUTPUT_' + e.kind.toUpperCase(), { message: `model output ${e.kind}${e.finishReason ? ' finish=' + e.finishReason : ''}`, studentHint: MESSAGES.invalid });
        validatorCodes.push(d.code);
        await setState('validating');
        const fp = d.code;
        if (repairs >= L.maxRepairs || fp === lastFingerprint) return done('failed', { studentMessage: MESSAGES.invalid, errorKind: e.kind, diagnostics: [d] });
        repairs++; lastFingerprint = fp; repairCtx = { diagnostics: [d] };
        await setState('repairing');
        continue;
      }

      await setState('validating');
      const norm = normalizeModelOutput(res.json, project.revision);
      if (norm.kind === 'unsupported') return done('failed', { studentMessage: MESSAGES.unsupportedModel, diagnostics: [diag('MODEL_UNSUPPORTED', { studentHint: MESSAGES.unsupportedModel })] });
      let v;
      if (norm.kind === 'malformed') v = { ok: false, stage: 'V1', codes: ['PATCH_SCHEMA_INVALID'], repairable: true, diagnostics: [diag('PATCH_SCHEMA_INVALID', { message: norm.reason })] };
      else v = validateCandidate({ project, patch: norm.patch, expect: task === 'plan' ? { ...cls.expect, allowTemplate: true } : cls.expect });
      validatorCodes.push(...v.codes);
      trace({ ...common, event: 'generation.validated', path: cls.kind, attempt: attempts, stage: v.stage, validatorCodes: v.codes, outcome: v.ok ? 'pass' : 'fail' });
      if (v.ok) {
        await stopIfNeeded();
        return done('ready', { candidate: v.candidate, studentMessage: v.candidate.patch.summary, diagnostics: v.warnings });
      }
      const hint = v.diagnostics.find(x => x.studentHint)?.studentHint;
      if (!v.repairable) return done('failed', { studentMessage: clip(hint ? `${hint} ${MESSAGES.keep}` : MESSAGES.invalid), diagnostics: v.diagnostics });
      const fp = [...v.codes].sort().join(',');
      if (repairs >= L.maxRepairs) return done('failed', { studentMessage: clip(hint ? `${hint} ${MESSAGES.keep}` : MESSAGES.invalid), diagnostics: v.diagnostics });
      if (fp === lastFingerprint) return done('failed', { studentMessage: MESSAGES.invalid, diagnostics: [diag('REPAIR_SAME_FAILURE', { message: fp.slice(0, 200), studentHint: MESSAGES.invalid }), ...v.diagnostics].slice(0, 20) });
      repairs++; lastFingerprint = fp; repairCtx = { diagnostics: v.diagnostics };
      await setState('repairing');
    }
  }
}
