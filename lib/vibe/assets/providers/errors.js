// 공급자 오류 — retryable=false면 파이프라인이 재시도하지 않는다.
export class ProviderError extends Error {
  /** @param {string} code @param {{retryable?:boolean, message?:string}} [o] */
  constructor(code, o = {}) { super(o.message || code); this.code = code; this.retryable = o.retryable ?? true; }
}
