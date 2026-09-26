// Gemini 이미지 공급자 어댑터 — 초안. ⚠ 실제 API로 한 번도 호출하지 않았다(키·예산 미승인). 테스트는 가짜 fetch로 요청 모양만 확인.
//
// 기존 경험(CLAUDE.md 바이브코딩 에셋 절): Nano Banana(gemini-2.5-flash-image) 배치로 v1 에셋 1~8차를 만들었다.
//  - 헤더 `x-goog-api-key` (키를 URL 쿼리에 넣지 않는다 → 로그 유출 방지)
//  - 이 개발 PC에서는 node fetch가 TLS로 막혀 PowerShell Invoke-RestMethod로 우회했다(Tls12 강제).
//    서버(Vercel)에서는 문제가 보고되지 않았으나 미확인. 로컬 실측이 필요하면 같은 우회가 필요할 수 있다.
//  - 이 모델은 alpha 투명 PNG를 내지 못한다 → capabilities.transparent=false. 파이프라인이 크로마 배경을 요청하고 키잉한다.
//  - 응답은 inlineData(base64)만 받는다. fileData.fileUri 같은 원격 URL은 따라가지 않는다(SSRF 방지).
//
// 단가: gemini-2.5-flash-image 출력 이미지 1장 ≈ 1290 토큰 × $30/1M ≈ $0.039 (공개 가격 기준 추정 — 운영 전 재확인 필요).

import { ProviderError } from './errors.js';

const DEFAULT_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta';
const DEFAULT_MODEL = 'gemini-2.5-flash-image';
const MAX_RESPONSE_BYTES = 12 * 1024 * 1024; // base64 오버헤드 포함 응답 상한

/**
 * @param {{ apiKey: string, model?: string, fetch?: typeof fetch, endpoint?: string, costPerImageMicroUsd?: number }} o
 */
export function createGeminiProvider(o) {
  if (!o || !o.apiKey) throw new Error('createGeminiProvider: apiKey required');
  const model = o.model || DEFAULT_MODEL;
  if (!/^[a-z0-9.-]{3,60}$/.test(model)) throw new Error('bad model id');
  const endpoint = o.endpoint || DEFAULT_ENDPOINT;
  if (!/^https:\/\/generativelanguage\.googleapis\.com\//.test(endpoint + '/')) throw new Error('endpoint must be generativelanguage.googleapis.com');
  const doFetch = o.fetch || globalThis.fetch;
  const cost = o.costPerImageMicroUsd ?? 39_000;

  return {
    id: 'gemini', model, live: true,
    capabilities: { transparent: false, seed: false, referenceImages: true, maxSide: 1024, async: false, webhook: false, costPerImageMicroUsd: cost },
    estimateCost() { return cost; },

    /** 요청 본문 (테스트에서 모양 확인용으로 공개) */
    buildRequest(req) {
      const aspect = req.width === req.height ? '1:1' : req.width * 9 === req.height * 16 ? '16:9' : req.width * 3 === req.height * 4 ? '4:3' : '1:1';
      return {
        url: `${endpoint}/models/${encodeURIComponent(model)}:generateContent`,
        init: {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-goog-api-key': o.apiKey },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: req.prompt }] }],
            generationConfig: { responseModalities: ['IMAGE'], imageConfig: { aspectRatio: aspect } },
          }),
          redirect: 'error',
        },
      };
    },

    async generate(req, { signal } = {}) {
      const { url, init } = this.buildRequest(req);
      let res;
      try { res = await doFetch(url, { ...init, signal }); } catch (e) {
        if (signal?.aborted) throw new ProviderError('TIMEOUT');
        throw new ProviderError('NETWORK', { message: String(e?.code || e?.message || e).slice(0, 80) });
      }
      const len = Number(res.headers?.get?.('content-length'));
      if (Number.isFinite(len) && len > MAX_RESPONSE_BYTES) throw new ProviderError('RESPONSE_TOO_LARGE', { retryable: false });
      const text = await res.text();
      if (text.length > MAX_RESPONSE_BYTES) throw new ProviderError('RESPONSE_TOO_LARGE', { retryable: false });
      if (res.status === 429) throw new ProviderError('PROVIDER_RATE_LIMITED', { retryable: true });
      if (res.status === 401 || res.status === 403) throw new ProviderError('PROVIDER_AUTH', { retryable: false });
      if (res.status >= 500) throw new ProviderError('PROVIDER_5XX', { retryable: true });
      if (!res.ok) throw new ProviderError('PROVIDER_4XX', { retryable: false });
      let json;
      try { json = JSON.parse(text); } catch { throw new ProviderError('BAD_RESPONSE'); }
      const parts = json?.candidates?.[0]?.content?.parts || [];
      if (json?.promptFeedback?.blockReason || json?.candidates?.[0]?.finishReason === 'SAFETY') throw new ProviderError('SAFETY_BLOCKED', { retryable: false });
      if (parts.some(p => p.fileData)) throw new ProviderError('REMOTE_URL_REFUSED', { retryable: false });
      const img = parts.find(p => p.inlineData?.data);
      if (!img) throw new ProviderError('NO_IMAGE', { retryable: true });
      const bytes = new Uint8Array(Buffer.from(img.inlineData.data, 'base64'));
      return { status: 'done', bytes, declaredMime: img.inlineData.mimeType || null, costMicroUsd: cost };
    },
  };
}
