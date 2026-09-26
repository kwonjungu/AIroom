// 분산 요청 제한 — KV 기반. IP 단일 제한을 쓰지 않는다.
// 조직·학급·학생·프로젝트 단위 슬라이딩 윈도우(2버킷 근사)와 동시 실행 슬롯(lease TTL).
// 같은 학교 NAT의 학생 30명은 학생 버킷이 서로 달라 서로를 막지 않는다.

import crypto from 'node:crypto';
import { errors } from './errors.js';

/** 일반 API 기본 제한 (분당). env로 조정 가능 — createLimitRules 참조. */
export const DEFAULT_API_LIMITS = Object.freeze({
  org: { limit: 6000, windowMs: 60_000 },
  class: { limit: 1500, windowMs: 60_000 },
  student: { limit: 120, windowMs: 60_000 },
  projectWrite: { limit: 60, windowMs: 60_000 },
  // 초대 코드 실패만 센다(성공은 세지 않음). 같은 NAT 30명 정상 입장은 영향 없음.
  inviteFailure: { limit: 30, windowMs: 10 * 60_000 },
});

/** WP5 생성 하네스용 LLM 요청 제한 (분당) — §4.4: 학생 30명 × 2분 1회 ≈ 15 RPM + 버스트 */
export const DEFAULT_LLM_LIMITS = Object.freeze({
  org: { limit: 30, windowMs: 60_000 },
  class: { limit: 20, windowMs: 60_000 },
  student: { limit: 4, windowMs: 60_000 },
  project: { limit: 4, windowMs: 60_000 },
});

/** 동시 실행 슬롯 초기값 (§4.4) */
export const SLOT_DEFAULTS = Object.freeze({ orgLlm: 4, student: 1, project: 1, leaseMs: 45_000 });

/**
 * 슬라이딩 윈도우 제한기.
 * @param {ReturnType<import('../kv/index.js').createMemoryKv>} kv
 * @param {{ now?: () => number }} [opts]
 */
export function createRateLimiter(kv, opts = {}) {
  const now = opts.now || Date.now;

  /**
   * 여러 규칙을 한 번에 센다. 하나라도 넘으면 거부.
   * @param {{scope:string, id:string, limit:number, windowMs:number}[]} rules
   * @returns {Promise<{ok:true} | {ok:false, retryAfterMs:number, scope:string}>}
   */
  async function hit(rules) {
    const t = now();
    const results = await Promise.all(rules.map(r => hitOne(r, t)));
    const denied = results.filter(x => !x.ok);
    if (!denied.length) return { ok: true };
    const worst = denied.reduce((a, b) => (b.retryAfterMs > a.retryAfterMs ? b : a));
    return { ok: false, retryAfterMs: worst.retryAfterMs, scope: worst.scope };
  }

  async function hitOne({ scope, id, limit, windowMs }, t) {
    const idx = Math.floor(t / windowMs);
    const base = `rl:${scope}:${id}:${windowMs}:`;
    const [cur, prevRaw] = await Promise.all([
      kv.incrWithTtl(base + idx, windowMs * 2 + 1000),
      kv.get(base + (idx - 1)),
    ]);
    const prev = Number(prevRaw) || 0;
    const elapsed = t - idx * windowMs;
    const weight = 1 - elapsed / windowMs;
    const estimate = prev * weight + cur;
    if (estimate <= limit) return { ok: true };
    // 추정치가 limit 이하로 내려갈 때까지의 시간 (보수적으로 계산)
    let wait;
    if (cur > limit || prev <= 0) wait = windowMs - elapsed;
    else wait = Math.max(0, windowMs * (1 - (limit - cur) / prev) - elapsed);
    return { ok: false, scope, retryAfterMs: Math.max(100, Math.ceil(wait)) };
  }

  /** 실패 횟수만 세는 용도 — 현재 추정치만 조회 */
  async function peek({ scope, id, limit, windowMs }) {
    const t = now();
    const idx = Math.floor(t / windowMs);
    const base = `rl:${scope}:${id}:${windowMs}:`;
    const [cur, prev] = await Promise.all([kv.get(base + idx), kv.get(base + (idx - 1))]);
    const estimate = (Number(prev) || 0) * (1 - (t - idx * windowMs) / windowMs) + (Number(cur) || 0);
    return { over: estimate >= limit, retryAfterMs: Math.max(100, windowMs - (t - idx * windowMs)) };
  }

  return { hit, peek };
}

/**
 * 동시 실행 슬롯 — zset(멤버=토큰, 점수=만료시각)으로 lease를 관리한다.
 * 프로세스가 죽어도 leaseMs 뒤에 자동 회수된다.
 * @param {object} kv
 * @param {{ scope:string, id:string, limit:number, leaseMs?:number, token?:string, now?:()=>number }} o
 * @returns {Promise<{ok:true, token:string, expiresAt:number} | {ok:false, retryAfterMs:number}>}
 */
export async function acquireSlot(kv, o) {
  const now = (o.now || Date.now)();
  const leaseMs = o.leaseMs || SLOT_DEFAULTS.leaseMs;
  const token = o.token || 's_' + crypto.randomBytes(9).toString('base64url');
  const ok = await kv.zAcquire(slotKey(o.scope, o.id), token, o.limit, now, now + leaseMs);
  if (ok) return { ok: true, token, expiresAt: now + leaseMs };
  return { ok: false, retryAfterMs: 1000 };
}

/** @param {{scope:string, id:string, token:string}} o */
export async function releaseSlot(kv, o) {
  await kv.zrem(slotKey(o.scope, o.id), o.token);
  return true;
}

/** lease 연장 (긴 생성 중 heartbeat) */
export async function extendSlot(kv, o) {
  const now = (o.now || Date.now)();
  return kv.zExtend(slotKey(o.scope, o.id), o.token, now + (o.leaseMs || SLOT_DEFAULTS.leaseMs));
}

function slotKey(scope, id) { return `slot:${scope}:${id}`; }

/**
 * 생성 1건에 필요한 슬롯(프로젝트 → 학생 → 조직 LLM 순, 좁은 것부터)을 모두 잡는다.
 * 하나라도 실패하면 잡은 것을 풀고 ok:false. 같은 token을 모든 슬롯에 쓴다.
 * @param {object} kv
 * @param {{ studentId:string, projectId:string, orgId?:string, limits?:Partial<typeof SLOT_DEFAULTS>, now?:()=>number }} o
 */
export async function acquireGenerationSlots(kv, o) {
  const lim = { ...SLOT_DEFAULTS, ...(o.limits || {}) };
  const token = 's_' + crypto.randomBytes(9).toString('base64url');
  const plan = [
    { scope: 'project', id: o.projectId, limit: lim.project },
    { scope: 'student', id: o.studentId, limit: lim.student },
    { scope: 'orgLlm', id: o.orgId || 'default', limit: lim.orgLlm },
  ];
  const held = [];
  for (const p of plan) {
    const r = await acquireSlot(kv, { ...p, token, leaseMs: lim.leaseMs, now: o.now });
    if (!r.ok) {
      for (const h of held) await releaseSlot(kv, { ...h, token });
      return { ok: false, retryAfterMs: r.retryAfterMs, scope: p.scope };
    }
    held.push(p);
  }
  return {
    ok: true, token,
    release: async () => { for (const h of held) await releaseSlot(kv, { ...h, token }); },
    extend: async () => { for (const h of held) await extendSlot(kv, { ...h, token, leaseMs: lim.leaseMs, now: o.now }); },
  };
}

/** 요청 제한 규칙 생성기 — 학생 세션 문맥 기반 */
export function apiRules(ctx, limits = DEFAULT_API_LIMITS) {
  const rules = [{ scope: 'org', id: 'default', ...limits.org }];
  if (ctx.classId) rules.push({ scope: 'class', id: ctx.classId, ...limits.class });
  if (ctx.studentId) rules.push({ scope: 'student', id: ctx.studentId, ...limits.student });
  if (ctx.projectId && ctx.write) rules.push({ scope: 'projectWrite', id: ctx.projectId, ...limits.projectWrite });
  return rules;
}

/** Express 미들웨어: 학생 세션이 붙은 뒤 사용. 429 + retryAfterMs */
export function studentRateLimit(limiter, limits = DEFAULT_API_LIMITS) {
  return async (req, res, next) => {
    const s = res.locals.student;
    if (!s) return next();
    const write = !['GET', 'HEAD', 'OPTIONS'].includes(req.method);
    const r = await limiter.hit(apiRules({ classId: s.classId, studentId: s.studentId, projectId: req.params?.id, write }, limits));
    if (!r.ok) return next(errors.rateLimited(r.retryAfterMs));
    next();
  };
}
