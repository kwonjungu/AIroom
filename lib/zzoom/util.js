'use strict';
// 쭘 서버 공통 도구: 오류, id, 해시, Redis 값 읽기, 시간 표기
const crypto = require('node:crypto');

class ZzError extends Error {
    constructor(status, code, message, extra) { super(message || code); this.status = status; this.code = code; this.extra = extra; }
}
const fail = (status, code, message, extra) => { throw new ZzError(status, code, message, extra); };
const check = (cond, status, code, message, extra) => { if (!cond) fail(status, code, message, extra); };

const sha256 = s => crypto.createHash('sha256').update(String(s)).digest('hex');
const rand = n => crypto.randomBytes(n).toString('base64url');
// 회의 id: m + 소문자·숫자 12자 (경로 'meetings'·'maintenance' 와 절대 겹치지 않게 형식 고정)
const ALNUM = 'abcdefghijklmnopqrstuvwxyz0123456789';
function alnum(n) { const b = crypto.randomBytes(n); let s = ''; for (let i = 0; i < n; i++) s += ALNUM[b[i] % 36]; return s; }
const newMid = () => 'm' + alnum(12);
const newId = p => p + alnum(14);
const MID_RE = /^m[a-z0-9]{12}$/;
const ID_RE = /^[a-z][a-z0-9]{6,20}$/;

// Upstash 는 JSON 문자열을 자동으로 객체로 돌려준다. 문자열이 와도 같게 처리.
function parseJson(v) {
    if (v == null) return null;
    if (typeof v === 'string') { try { return JSON.parse(v); } catch { return null; } }
    return v;
}
const str = (v, max) => (typeof v === 'string' ? v.trim() : '').slice(0, max);
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const isNum = v => typeof v === 'number' && Number.isFinite(v);

// 한국 시각 표기
function kst(ms, withDate = true) {
    const d = new Date(ms + 9 * 3600000);
    const p = n => String(n).padStart(2, '0');
    const hm = `${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
    return withDate ? `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())} ${hm}` : hm;
}
const kstDate = ms => kst(ms).slice(0, 10);

function safeEqual(a, b) {
    const x = Buffer.from(String(a)), y = Buffer.from(String(b));
    return x.length === y.length && crypto.timingSafeEqual(x, y);
}

module.exports = { ZzError, fail, check, sha256, rand, newMid, newId, MID_RE, ID_RE, parseJson, str, clamp, isNum, kst, kstDate, safeEqual };
