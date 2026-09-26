// 공통 오류 형식 {error:{code,message,retryable,retryAfterMs,requestId}} (ApiErrorSchema).
// message는 행동 가능한 한 문장. 학생 원문·이름을 절대 넣지 않는다.

import { API_ERROR_CODES } from '../../../public/vibe-v2/shared/contracts/schemas.js';

const RETRYABLE = new Set(['RATE_LIMITED', 'QUOTA_EXCEEDED', 'PROVIDER_UNAVAILABLE', 'INTERNAL', 'REVISION_CONFLICT']);

export class ApiError extends Error {
  /**
   * @param {keyof typeof API_ERROR_CODES} code
   * @param {string} message
   * @param {{ retryAfterMs?: number|null, retryable?: boolean, headers?: Record<string,string> }} [o]
   */
  constructor(code, message, o = {}) {
    super(message);
    if (!(code in API_ERROR_CODES)) throw new Error('unknown api error code ' + code);
    this.code = code;
    this.status = API_ERROR_CODES[code];
    this.retryAfterMs = o.retryAfterMs ?? null;
    this.retryable = o.retryable ?? RETRYABLE.has(code);
    this.headers = o.headers || {};
  }
}

export const errors = {
  badRequest: (m = '요청 형식이 올바르지 않아요.') => new ApiError('BAD_REQUEST', m),
  unauthenticated: (m = '먼저 입장해 주세요.') => new ApiError('UNAUTHENTICATED', m),
  forbidden: (m = '이 기능을 쓸 권한이 없어요.') => new ApiError('FORBIDDEN', m),
  notFound: (m = '찾을 수 없어요.') => new ApiError('NOT_FOUND', m),
  conflict: (latestRevision, m = '그 사이에 작품이 바뀌었어요. 최신 작품을 불러와 주세요.') =>
    new ApiError('REVISION_CONFLICT', m, { retryable: false, headers: latestRevision === null || latestRevision === undefined ? {} : { 'X-Vibe-Revision': String(latestRevision) } }),
  tooLarge: (m = '보낸 내용이 너무 커요.') => new ApiError('TOO_LARGE', m, { retryable: false }),
  rateLimited: (retryAfterMs, m = '요청이 많아요. 잠시 후 다시 해 보세요.') => new ApiError('RATE_LIMITED', m, { retryAfterMs }),
  internal: (m = '서버에 문제가 생겼어요. 잠시 후 다시 해 보세요.') => new ApiError('INTERNAL', m),
};

export function errorBody(err, requestId) {
  return {
    error: {
      code: err.code,
      message: String(err.message || err.code).slice(0, 200),
      retryable: Boolean(err.retryable),
      retryAfterMs: err.retryAfterMs === null || err.retryAfterMs === undefined ? null : Math.max(0, Math.ceil(err.retryAfterMs)),
      requestId: String(requestId || '').slice(0, 64),
    },
  };
}

export function sendError(res, err) {
  const requestId = res.locals?.requestId || '';
  for (const [h, v] of Object.entries(err.headers || {})) res.setHeader(h, v);
  if (err.retryAfterMs) res.setHeader('Retry-After', String(Math.max(1, Math.ceil(err.retryAfterMs / 1000))));
  res.status(err.status).json(errorBody(err, requestId));
}
