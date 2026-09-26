// HMAC 서명 토큰과 쿠키 유틸. 외부 의존성 없음.
// 토큰 = base64url(JSON payload) + '.' + base64url(HMAC-SHA256(secret, payload))

import crypto from 'node:crypto';

export const STUDENT_COOKIE = 'vibe2_s';
export const TEACHER_COOKIE = 'vibe2_t';
export const MIN_SECRET_CHARS = 32;

export function secretProblem(secret) {
  if (!secret) return 'VIBE_SESSION_SECRET이 설정되지 않았습니다.';
  if (String(secret).length < MIN_SECRET_CHARS) return `VIBE_SESSION_SECRET은 ${MIN_SECRET_CHARS}자 이상이어야 합니다.`;
  return null;
}

function mac(secret, data) { return crypto.createHmac('sha256', secret).update(data).digest('base64url'); }

export function signToken(secret, payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return body + '.' + mac(secret, body);
}

/** @returns {object|null} 서명·만료가 유효하면 payload */
export function verifyToken(secret, token, nowMs) {
  if (!secret || typeof token !== 'string' || token.length > 1024) return null;
  const dot = token.indexOf('.');
  if (dot <= 0) return null;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const want = mac(secret, body);
  const a = Buffer.from(sig);
  const b = Buffer.from(want);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  let p;
  try { p = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')); } catch { return null; }
  if (!p || typeof p !== 'object' || typeof p.exp !== 'number' || p.exp <= nowMs) return null;
  return p;
}

export function parseCookies(header) {
  const out = {};
  if (!header) return out;
  for (const part of String(header).split(';')) {
    const i = part.indexOf('=');
    if (i < 0) continue;
    const k = part.slice(0, i).trim();
    if (!k || k in out) continue;
    let v = part.slice(i + 1).trim();
    if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
    try { out[k] = decodeURIComponent(v); } catch { out[k] = v; }
  }
  return out;
}

/**
 * @param {{ maxAgeMs:number, secure:boolean, path?:string }} o
 */
export function serializeCookie(name, value, o) {
  const parts = [`${name}=${encodeURIComponent(value)}`, `Path=${o.path || '/api/vibe'}`, 'HttpOnly', 'SameSite=Lax'];
  parts.push(`Max-Age=${Math.max(0, Math.floor(o.maxAgeMs / 1000))}`);
  if (o.secure) parts.push('Secure');
  return parts.join('; ');
}

export function appendSetCookie(res, cookie) {
  const prev = res.getHeader('Set-Cookie');
  if (!prev) res.setHeader('Set-Cookie', [cookie]);
  else res.setHeader('Set-Cookie', [...(Array.isArray(prev) ? prev : [prev]), cookie]);
}

/** 로그용 비식별 참조 (HMAC 앞 10자). 원 studentId를 로그에 남기지 않는다. */
export function hashRef(secret, id) {
  if (!id) return null;
  return crypto.createHmac('sha256', secret || 'no-secret').update('ref:' + id).digest('hex').slice(0, 10);
}

export function randomId(prefix, bytes = 12) { return prefix + crypto.randomBytes(bytes).toString('base64url'); }

const INVITE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'; // 헷갈리는 0/O/1/I/L 제외
export function newInviteCode(len = 6) {
  const bytes = crypto.randomBytes(len);
  let s = '';
  for (let i = 0; i < len; i++) s += INVITE_ALPHABET[bytes[i] % INVITE_ALPHABET.length];
  return s;
}
export function normalizeInviteCode(code) {
  const s = String(code || '').toUpperCase().replace(/[\s-]/g, '');
  return /^[2-9A-HJKMNP-Z]{6}$/.test(s) ? s : null;
}
