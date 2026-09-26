// 이미지 공급자 어댑터 인터페이스 + env 기반 선택.
//
// Provider {
//   id: string, model: string,
//   live: boolean                       — true면 실제 유료 API (비용 예약 대상)
//   capabilities: {
//     transparent: boolean               — 실제 alpha 채널 출력 가능
//     seed: boolean, referenceImages: boolean,
//     maxSide: number,                   — 최대 변 길이(px)
//     async: boolean, webhook: boolean,  — pending → poll / webhook 완료
//     costPerImageMicroUsd: number,      — 1장 추정 단가 (1 USD = 1e6)
//   },
//   estimateCost(brief) → microUsd
//   generate(req, {signal}) → Promise<Result>
//   poll?(providerJobId, {signal}) → Promise<Result>
//   parseWebhook?(body) → {eventId, providerJobId, result: Result}
// }
// req    = { prompt, negative, width, height, seed?, chromaKey?, jobRef }   (학생 원문·이름 없음)
// Result = { status:'done', bytes:Uint8Array, declaredMime:string, costMicroUsd?:number }
//        | { status:'pending', providerJobId:string }
// 실패는 ProviderError를 던진다. retryable=false면 재시도하지 않는다.

import { createMockProvider } from './mock.js';
import { createGeminiProvider } from './gemini.js';

export { ProviderError } from './errors.js';

/**
 * env로 공급자 선택. 실제 유료 공급자는 명시적 opt-in(VIBE_ASSET_LIVE=1) + 키가 모두 있어야 켜진다.
 *   VIBE_ASSET_PROVIDER = '' | 'none' | 'mock' | 'gemini'
 *   VIBE_ASSET_LIVE     = '1'  (gemini 유료 호출 허용)
 *   VIBE_GEMINI_API_KEY 또는 GEMINI_API_KEY
 *   VIBE_GEMINI_IMAGE_MODEL (기본 gemini-2.5-flash-image)
 * @returns {{provider: object|null, reason: string}}
 */
export function createProviderFromEnv(env = {}, deps = {}) {
  const name = String(env.VIBE_ASSET_PROVIDER || '').trim().toLowerCase();
  if (!name || name === 'none') return { provider: null, reason: 'VIBE_ASSET_PROVIDER 미설정 — 생성 비활성(기존 에셋·placeholder만)' };
  if (name === 'mock') return { provider: createMockProvider({ scenario: env.VIBE_ASSET_MOCK_SCENARIO || 'ok' }), reason: 'mock' };
  if (name === 'gemini') {
    const apiKey = env.VIBE_GEMINI_API_KEY || env.GEMINI_API_KEY || '';
    if (env.VIBE_ASSET_LIVE !== '1') return { provider: null, reason: 'gemini: VIBE_ASSET_LIVE=1 미설정 — 유료 호출 비활성' };
    if (!apiKey) return { provider: null, reason: 'gemini: API 키 없음 — 비활성' };
    return { provider: createGeminiProvider({ apiKey, model: env.VIBE_GEMINI_IMAGE_MODEL, fetch: deps.fetch }), reason: 'gemini(live)' };
  }
  return { provider: null, reason: `알 수 없는 공급자 ${name} — 비활성` };
}

export { createMockProvider, createGeminiProvider };
