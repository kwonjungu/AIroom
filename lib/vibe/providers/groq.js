// Groq 어댑터 — fetch 기반(의존성 없음). 한 번 호출하면 정확히 한 번의 HTTP 요청만 보낸다.
// 재시도·수리·모델 폴백은 여기서 하지 않는다(오케스트레이터가 전체 시도 3회 상한 안에서 결정한다).
//
// ● 키는 하나만 쓴다: VIBE_GROQ_API_KEY 또는 GROQ_API_KEY. v1의 GROQ_API_KEY_2~4 연쇄 소모를 재현하지 않는다
//   (Groq 제한은 조직 단위라 같은 조직 키를 돌려도 처리량이 늘지 않고 한도 우회가 된다).
// ● 모델·시스템 프롬프트는 서버가 정한다. 이 함수는 학생 요청 본문을 직접 받지 않는다.
// ● 오류 메시지에 공급자 원문·키를 싣지 않는다. 짧은 분류 코드만 돌려준다.

import { capabilityOf, chooseResponseFormat, resolveModels } from './capabilities.js';

export const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';
export const DEFAULT_CALL_TIMEOUT_MS = 12_000;
const REASONING_RESERVE = 1536;       // reasoning 모델은 사고 토큰이 출력 한도를 먹으므로 여유를 더한다
const MAX_CONTENT_CHARS = 64 * 1024;  // 비정상적으로 긴 응답은 파싱하지 않는다

/**
 * 오류 분류. admin=true 는 학생 탓이 아닌 운영 설정 문제(키·모델·요청 형식).
 * format 계열(truncated/empty/invalid_json)만 수리 대상이다.
 */
export const ERROR_KINDS = Object.freeze({
  not_configured: { retryable: false, admin: true, format: false },
  auth: { retryable: false, admin: true, format: false },
  model_not_found: { retryable: false, admin: true, format: false },
  bad_request: { retryable: false, admin: true, format: false },
  request_too_large: { retryable: false, admin: true, format: false },
  rate_limited: { retryable: true, admin: false, format: false },
  server: { retryable: true, admin: false, format: false },
  timeout: { retryable: true, admin: false, format: false },
  network: { retryable: true, admin: false, format: false },
  aborted: { retryable: false, admin: false, format: false },
  refusal: { retryable: false, admin: false, format: false },
  truncated: { retryable: false, admin: false, format: true },
  empty: { retryable: false, admin: false, format: true },
  invalid_json: { retryable: false, admin: false, format: true },
});

/** "2m59.56s" · "7.66s" · "500ms" · "1h2m" → ms. 숫자만 있으면 초. */
export function parseDuration(v) {
  if (v === null || v === undefined || v === '') return null;
  const s = String(v).trim();
  if (/^\d+(\.\d+)?$/.test(s)) return Math.round(Number(s) * 1000);
  let ms = 0, matched = false;
  const re = /(\d+(?:\.\d+)?)(ms|h|m|s)/g;
  let m;
  while ((m = re.exec(s))) {
    matched = true;
    const n = Number(m[1]);
    ms += m[2] === 'h' ? n * 3_600_000 : m[2] === 'm' ? n * 60_000 : m[2] === 's' ? n * 1000 : n;
  }
  return matched ? Math.round(ms) : null;
}

function readRate(headers) {
  const h = name => (headers && typeof headers.get === 'function' ? headers.get(name) : null);
  const num = v => (v === null || v === undefined || v === '' || !Number.isFinite(Number(v)) ? null : Number(v));
  return {
    retryAfterMs: parseDuration(h('retry-after')),
    remainingRequests: num(h('x-ratelimit-remaining-requests')),
    remainingTokens: num(h('x-ratelimit-remaining-tokens')),
    resetRequestsMs: parseDuration(h('x-ratelimit-reset-requests')),
    resetTokensMs: parseDuration(h('x-ratelimit-reset-tokens')),
  };
}

function usageOf(data) {
  const u = data && data.usage;
  if (!u) return null;
  return {
    input: Number(u.prompt_tokens) || 0,
    output: Number(u.completion_tokens) || 0,
    reasoning: Number(u.completion_tokens_details?.reasoning_tokens) || 0,
    total: Number(u.total_tokens) || (Number(u.prompt_tokens) || 0) + (Number(u.completion_tokens) || 0),
  };
}

function safeCode(v) { return String(v || '').toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 40) || null; }

/** 코드블록 감싸기·앞뒤 공백을 걷어내고 JSON 객체 하나만 받는다. */
export function parseJsonObject(content) {
  let s = String(content).trim();
  const fence = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(s);
  if (fence) s = fence[1].trim();
  if (!s.startsWith('{') || !s.endsWith('}')) return null;
  try {
    const v = JSON.parse(s);
    return v && typeof v === 'object' && !Array.isArray(v) ? v : null;
  } catch { return null; }
}

/**
 * @param {{ env?: Record<string,string|undefined>, fetch?: typeof fetch, now?: () => number, endpoint?: string }} [o]
 */
export function createGroqProvider(o = {}) {
  const env = o.env || {};
  const fetchImpl = o.fetch || globalThis.fetch;
  const now = o.now || Date.now;
  const endpoint = o.endpoint || GROQ_ENDPOINT;
  const apiKey = String(env.VIBE_GROQ_API_KEY || env.GROQ_API_KEY || '').trim();
  const models = resolveModels(env);
  const defaultTimeout = Number(env.VIBE_GROQ_TIMEOUT_MS) > 0 ? Math.min(Number(env.VIBE_GROQ_TIMEOUT_MS), 60_000) : DEFAULT_CALL_TIMEOUT_MS;

  function fail(kind, extra = {}) {
    const k = ERROR_KINDS[kind];
    return { ok: false, error: { kind, retryable: k.retryable, admin: k.admin, format: k.format, retryAfterMs: extra.retryAfterMs ?? null, httpStatus: extra.httpStatus ?? null, code: extra.code ?? null }, usage: extra.usage ?? null, model: extra.model ?? null, elapsedMs: extra.elapsedMs ?? 0, rate: extra.rate ?? null, finishReason: extra.finishReason ?? null };
  }

  /**
   * 한 번의 chat completion.
   * @param {{ model:string, system:string, user:string, schema?:object, schemaName?:string,
   *           maxOutputTokens:number, timeoutMs?:number, signal?:AbortSignal, temperature?:number }} req
   */
  async function complete(req) {
    const started = now();
    const model = req.model;
    const base = { model };
    if (!apiKey) return fail('not_configured', base);
    if (typeof fetchImpl !== 'function') return fail('not_configured', base);
    const cap = capabilityOf(model);
    const fmt = req.schema ? chooseResponseFormat(model, env) : 'json_object';
    const maxOut = Math.max(64, Math.min(cap.maxOutput, Math.floor(req.maxOutputTokens) + (cap.reasoning ? REASONING_RESERVE : 0)));
    const body = {
      model,
      messages: [{ role: 'system', content: req.system }, { role: 'user', content: req.user }],
      temperature: req.temperature ?? 0.2,
      max_completion_tokens: maxOut,
      stream: false,
      response_format: fmt === 'json_object'
        ? { type: 'json_object' }
        : { type: 'json_schema', json_schema: { name: req.schemaName || 'patch', schema: req.schema, strict: fmt === 'json_schema_strict' } },
    };
    if (cap.reasoning) { body.reasoning_effort = 'low'; body.include_reasoning = false; }

    const timeoutMs = Math.max(1, Math.min(req.timeoutMs ?? defaultTimeout, defaultTimeout));
    const ctrl = new AbortController();
    let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; ctrl.abort(); }, timeoutMs);
    const onOuterAbort = () => ctrl.abort();
    if (req.signal) { if (req.signal.aborted) ctrl.abort(); else req.signal.addEventListener('abort', onOuterAbort, { once: true }); }

    let res, text;
    try {
      res = await fetchImpl(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + apiKey },
        body: JSON.stringify(body),
        signal: ctrl.signal,
      });
      text = await res.text();
    } catch {
      const elapsedMs = now() - started;
      if (timedOut) return fail('timeout', { ...base, elapsedMs });
      if (req.signal?.aborted) return fail('aborted', { ...base, elapsedMs });
      return fail('network', { ...base, elapsedMs });
    } finally {
      clearTimeout(timer);
      req.signal?.removeEventListener?.('abort', onOuterAbort);
    }

    const elapsedMs = now() - started;
    const rate = readRate(res.headers);
    let data = null;
    try { data = JSON.parse(text); } catch { data = null; }
    const usage = usageOf(data);
    const meta = { ...base, elapsedMs, rate, usage, httpStatus: res.status };

    if (!res.ok) {
      const code = safeCode(data?.error?.code || data?.error?.type);
      if (res.status === 401 || res.status === 403) return fail('auth', { ...meta, code });
      if (res.status === 404 || code === 'model_not_found' || code === 'model_decommissioned') return fail('model_not_found', { ...meta, code });
      if (res.status === 429) return fail('rate_limited', { ...meta, code, retryAfterMs: rate.retryAfterMs ?? rate.resetRequestsMs ?? rate.resetTokensMs ?? null });
      if (res.status === 413) return fail('request_too_large', { ...meta, code });
      if (res.status === 400 && code === 'json_validate_failed') return fail('invalid_json', { ...meta, code });
      if (res.status >= 500 || res.status === 498) return fail('server', { ...meta, code, retryAfterMs: rate.retryAfterMs });
      return fail('bad_request', { ...meta, code });
    }

    const choice = data?.choices?.[0];
    if (!choice) return fail('server', { ...meta, code: 'no_choices' });
    const msg = choice.message || {};
    const finishReason = choice.finish_reason || null;
    const m2 = { ...meta, finishReason };
    if (msg.refusal) return fail('refusal', m2);
    if (finishReason === 'content_filter') return fail('refusal', m2);
    if (finishReason === 'length') return fail('truncated', m2);
    const content = typeof msg.content === 'string' ? msg.content : '';
    if (!content.trim()) return fail('empty', m2);
    if (content.length > MAX_CONTENT_CHARS) return fail('truncated', m2);
    const json = parseJsonObject(content);
    if (!json) return fail('invalid_json', m2);
    return { ok: true, json, finishReason, usage, model, elapsedMs, rate, responseFormat: fmt };
  }

  return {
    name: 'groq',
    models,
    configured: !!apiKey,
    capability: capabilityOf,
    complete,
  };
}
