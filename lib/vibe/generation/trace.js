// 관측(§7) — 허용한 키만 남긴다. 학생 원문·이름·학교 정보·키는 절대 기록하지 않는다.
// projectRef는 서버 비밀로 HMAC한 비식별 참조.

import { hashRef } from '../auth/tokens.js';

export const TRACE_KEYS = Object.freeze([
  'event', 'requestId', 'jobId', 'projectRef', 'baseRevision', 'templateVersion', 'promptVersion', 'schemaVersion',
  'engineVersion', 'provider', 'model', 'attempt', 'tokenUsage', 'elapsedMs', 'validatorCodes', 'outcome',
  'path', 'errorKind', 'stage', 'responseFormat', 'truncated', 'estInputTokens', 'workerRef',
]);

const SAFE_STRING = /^[A-Za-z0-9_.:@/+-]{0,120}$/;

function clean(v, secrets) {
  if (v === null || v === undefined) return v;
  if (typeof v === 'number' || typeof v === 'boolean') return v;
  if (typeof v === 'string') {
    let s = v;
    for (const k of secrets) if (k && s.includes(k)) s = s.split(k).join('[redacted]');
    return SAFE_STRING.test(s) ? s : '[filtered]';
  }
  if (Array.isArray(v)) return v.slice(0, 20).map(x => clean(x, secrets));
  if (typeof v === 'object') {
    const o = {};
    for (const [k, x] of Object.entries(v)) if (/^[a-zA-Z]{1,20}$/.test(k)) o[k] = clean(x, secrets);
    return o;
  }
  return undefined;
}

/**
 * @param {(entry:object)=>void|null} log
 * @param {{ env?: object }} [o]
 */
export function createTracer(log, o = {}) {
  const env = o.env || {};
  const secrets = [env.GROQ_API_KEY, env.VIBE_GROQ_API_KEY, env.VIBE_SESSION_SECRET].filter(s => typeof s === 'string' && s.length >= 8);
  const refSecret = env.VIBE_SESSION_SECRET || 'vibe-trace-ref';
  function trace(entry) {
    if (!log) return;
    const out = { level: 'info', event: 'generation' };
    for (const k of TRACE_KEYS) if (entry[k] !== undefined) out[k] = clean(entry[k], secrets);
    if (entry.projectId) out.projectRef = hashRef(refSecret, entry.projectId);
    try { log(out); } catch { /* 로깅 실패가 생성을 막지 않는다 */ }
  }
  return { trace, projectRef: id => hashRef(refSecret, id) };
}
