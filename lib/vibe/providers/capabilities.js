// 모델 capability matrix — 모델 ID는 코드가 아닌 설정(env)으로 고르고, 지원하지 않는 조합은 보내지 않는다.
//
// 근거: Groq 공식 문서(structured outputs / models / rate limits)와 v1 server.js 주석(2026-09: 라마 계열 폐기 확인).
// ⚠ 이 표는 "문서 기준 초기값"이다. 배포 전에 실제 계정의 GET /openai/v1/models 로 존재 여부를 확인하고
//   live 평가(tests/vibe/evals/live.js)로 품질을 확정한다. 표에 없는 모델은 보수적 기본값(JSON object, 출력 4k)을 쓴다.

/**
 * @typedef {{
 *   jsonSchema: false | 'strict' | 'best_effort',  // response_format json_schema 지원 수준
 *   jsonObject: boolean,                             // response_format json_object 지원
 *   maxOutput: number,                               // max_completion_tokens 상한
 *   reasoning: boolean,                              // reasoning 토큰을 출력 한도에서 소모하는 모델
 *   status: 'documented' | 'reported_decommissioned' | 'unknown',
 * }} ModelCapability
 */

/** @type {Record<string, ModelCapability>} */
export const MODEL_CAPABILITIES = Object.freeze({
  'openai/gpt-oss-120b': { jsonSchema: 'strict', jsonObject: true, maxOutput: 65536, reasoning: true, status: 'documented' },
  'openai/gpt-oss-20b': { jsonSchema: 'strict', jsonObject: true, maxOutput: 65536, reasoning: true, status: 'documented' },
  'moonshotai/kimi-k2-instruct-0905': { jsonSchema: 'best_effort', jsonObject: true, maxOutput: 16384, reasoning: false, status: 'documented' },
  'meta-llama/llama-4-scout-17b-16e-instruct': { jsonSchema: 'best_effort', jsonObject: true, maxOutput: 8192, reasoning: false, status: 'documented' },
  'meta-llama/llama-4-maverick-17b-128e-instruct': { jsonSchema: 'best_effort', jsonObject: true, maxOutput: 8192, reasoning: false, status: 'documented' },
  // v1(server.js) 주석: 2026-09 /v1/models 에서 사라짐. 설정으로 지정하면 동작은 시도하되 404면 관리 오류로 보고한다.
  'llama-3.3-70b-versatile': { jsonSchema: false, jsonObject: true, maxOutput: 32768, reasoning: false, status: 'reported_decommissioned' },
  'llama-3.1-8b-instant': { jsonSchema: false, jsonObject: true, maxOutput: 131072, reasoning: false, status: 'reported_decommissioned' },
});

const UNKNOWN = Object.freeze({ jsonSchema: false, jsonObject: true, maxOutput: 4096, reasoning: false, status: 'unknown' });

/** @returns {ModelCapability} */
export function capabilityOf(model) {
  return MODEL_CAPABILITIES[model] || UNKNOWN;
}

/**
 * 기본 모델 = v1 server.js 의 GROQ_FALLBACK_MODELS 현재값(gpt-oss-120b → 20b).
 * 과업 지시서에는 llama-3.3-70b / 3.1-8b 로 적혀 있었으나 v1 코드 주석이 두 모델의 폐기를 기록하고 있어
 * 실제 v1 동작과 같은 값을 기본으로 둔다(보고서 참조). env로 언제든 바꿀 수 있다.
 */
export const DEFAULT_MODELS = Object.freeze({ primary: 'openai/gpt-oss-120b', light: 'openai/gpt-oss-20b' });

const MODEL_ID = /^[A-Za-z0-9][A-Za-z0-9._/-]{1,79}$/;

/** env → {primary, light}. 형식이 이상한 값은 무시(기본값). 학생 요청 본문에서는 절대 받지 않는다. */
export function resolveModels(env = {}) {
  const pick = (v, d) => (typeof v === 'string' && MODEL_ID.test(v.trim()) ? v.trim() : d);
  return {
    primary: pick(env.VIBE_GROQ_MODEL_PRIMARY, DEFAULT_MODELS.primary),
    light: pick(env.VIBE_GROQ_MODEL_LIGHT, DEFAULT_MODELS.light),
  };
}

/**
 * 요청 형식 결정: strict 지원 모델이면 json_schema(strict), 아니면 json_object. env VIBE_GROQ_STRUCTURED=json_object 로 강제 가능.
 * @returns {'json_schema_strict'|'json_schema'|'json_object'}
 */
export function chooseResponseFormat(model, env = {}) {
  const cap = capabilityOf(model);
  if (env.VIBE_GROQ_STRUCTURED === 'json_object') return 'json_object';
  if (cap.jsonSchema === 'strict') return 'json_schema_strict';
  if (cap.jsonSchema === 'best_effort' && env.VIBE_GROQ_STRUCTURED === 'json_schema') return 'json_schema';
  return 'json_object';
}
