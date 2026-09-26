// 에셋 생성 비용 한도 — 일/학급/조직 예산을 유료 호출 전에 "예약"하고 결과에 따라 "정산"·"해제"한다.
// LLM 제한(WP7 limits.js)과 별개다. 무료 공급자(mock, live=false & 단가 0)는 예산을 쓰지 않는다.
//
// 키 (KV, casJson 원자 갱신):
//   assetbudget:{scope}:{id}:{YYYY-MM-DD}  {revision, reserved:{rid:amount}, spent, count}
//   assetres:{rid}                         {revision, state:'reserved'|'settled'|'released', amount, keys:[...]}  ← 같은 예약 재시도 멱등
// 금액 단위: micro USD (1 USD = 1,000,000).

const DAY_TTL_MS = 3 * 86_400_000;
const CAS_TRIES = 40; // 한 학급 30명이 동시에 예약해도 버틸 만큼

export const DEFAULT_BUDGET = Object.freeze({
  orgDailyMicroUsd: 2_000_000,     // 조직 하루 $2
  classDailyMicroUsd: 500_000,     // 학급 하루 $0.5 (≈ 12장)
  studentDailyCount: 6,            // 학생 하루 유료 생성 6장
});

export function budgetFromEnv(env = {}) {
  const num = (v, d) => (v !== undefined && v !== '' && Number.isFinite(Number(v)) && Number(v) >= 0 ? Number(v) : d);
  return {
    orgDailyMicroUsd: Math.round(num(env.VIBE_ASSET_DAILY_USD_ORG, DEFAULT_BUDGET.orgDailyMicroUsd / 1e6) * 1e6),
    classDailyMicroUsd: Math.round(num(env.VIBE_ASSET_DAILY_USD_CLASS, DEFAULT_BUDGET.classDailyMicroUsd / 1e6) * 1e6),
    studentDailyCount: Math.round(num(env.VIBE_ASSET_DAILY_PER_STUDENT, DEFAULT_BUDGET.studentDailyCount)),
  };
}

/**
 * @param {object} kv  WP7 KV
 * @param {{ now?: () => number, limits?: Partial<typeof DEFAULT_BUDGET> }} [o]
 */
export function createAssetBudget(kv, o = {}) {
  const now = o.now || Date.now;
  const lim = { ...DEFAULT_BUDGET, ...(o.limits || {}) };
  const day = () => new Date(now()).toISOString().slice(0, 10);

  async function cas(key, mutate, init) {
    for (let i = 0; i < CAS_TRIES; i++) {
      const cur = await kv.get(key);
      const base = cur || { revision: 0, ...init };
      const draft = JSON.parse(JSON.stringify(base));
      const next = mutate(draft);
      if (next === null) return { ok: true, value: base, unchanged: true };
      if (next && next.denied) return { ok: false, value: base, denied: true };
      next.revision = base.revision + 1;
      const r = await kv.casJson(key, cur ? cur.revision : null, next, { ttlMs: DAY_TTL_MS });
      if (r.ok) return { ok: true, value: next };
      await new Promise(res => setTimeout(res, 2 + Math.random() * (4 + i * 2)));
    }
    throw Object.assign(new Error('budget contention'), { code: 'BUSY' });
  }

  function plan({ classId, studentId, amount }) {
    const d = day();
    const out = [{ key: `assetbudget:org:default:${d}`, cap: lim.orgDailyMicroUsd, scope: 'org', amount, count: 0 }];
    if (classId) out.push({ key: `assetbudget:class:${classId}:${d}`, cap: lim.classDailyMicroUsd, scope: 'class', amount, count: 0 });
    if (studentId) out.push({ key: `assetbudget:student:${studentId}:${d}`, cap: null, countCap: lim.studentDailyCount, scope: 'student', amount, count: 1 });
    return out;
  }

  /**
   * 예약. 같은 rid 재호출은 이전 결과를 돌려준다(중복 청구 없음).
   * @returns {Promise<{ok:true, reservationId:string} | {ok:false, scope:string}>}
   */
  async function reserve({ reservationId, classId, studentId, amount }) {
    const resKey = `assetres:${reservationId}`;
    const prev = await kv.get(resKey);
    if (prev) return prev.state === 'released' ? { ok: false, scope: 'released' } : { ok: true, reservationId, repeated: true };
    const steps = plan({ classId, studentId, amount });
    const held = [];
    for (const s of steps) {
      const r = await cas(s.key, b => {
        if (b.reserved[reservationId] !== undefined) return null;
        const used = b.spent + Object.values(b.reserved).reduce((x, y) => x + y, 0);
        if (s.cap !== null && s.cap !== undefined && used + s.amount > s.cap) return { denied: true };
        if (s.countCap !== undefined && b.count + s.count > s.countCap) return { denied: true };
        b.reserved[reservationId] = s.amount;
        b.count += s.count;
        return b;
      }, { reserved: {}, spent: 0, count: 0 });
      if (!r.ok) {
        for (const h of held) await undo(h, reservationId);
        return { ok: false, scope: s.scope };
      }
      held.push(s);
    }
    const saved = await kv.casJson(resKey, null, { revision: 0, state: 'reserved', amount, keys: held.map(h => ({ key: h.key, count: h.count })) }, { ttlMs: DAY_TTL_MS });
    if (!saved.ok) { for (const h of held) await undo(h, reservationId); return { ok: true, reservationId, repeated: true }; }
    return { ok: true, reservationId };
  }

  async function undo(step, rid) {
    await cas(step.key, b => {
      if (b.reserved[rid] === undefined) return null;
      delete b.reserved[rid];
      b.count = Math.max(0, b.count - (step.count || 0));
      return b;
    }, { reserved: {}, spent: 0, count: 0 });
  }

  /** 실제 비용으로 정산(예약 → spent). 반복 호출 안전. */
  async function settle(reservationId, actualMicroUsd) {
    const resKey = `assetres:${reservationId}`;
    const rec = await kv.get(resKey);
    if (!rec || rec.state !== 'reserved') return { ok: true, unchanged: true };
    const r = await kv.casJson(resKey, rec.revision, { ...rec, revision: rec.revision + 1, state: 'settled', actual: actualMicroUsd }, { ttlMs: DAY_TTL_MS });
    if (!r.ok) return { ok: true, unchanged: true };
    for (const k of rec.keys) {
      await cas(k.key, b => {
        if (b.reserved[reservationId] === undefined) return null;
        delete b.reserved[reservationId];
        b.spent += actualMicroUsd;
        return b;
      }, { reserved: {}, spent: 0, count: 0 });
    }
    return { ok: true };
  }

  /** 호출 전 실패 등으로 비용이 생기지 않았을 때 예약 해제(학생 횟수도 되돌림). 반복 호출 안전. */
  async function release(reservationId) {
    const resKey = `assetres:${reservationId}`;
    const rec = await kv.get(resKey);
    if (!rec || rec.state !== 'reserved') return { ok: true, unchanged: true };
    const r = await kv.casJson(resKey, rec.revision, { ...rec, revision: rec.revision + 1, state: 'released' }, { ttlMs: DAY_TTL_MS });
    if (!r.ok) return { ok: true, unchanged: true };
    for (const k of rec.keys) await undo(k, reservationId);
    return { ok: true };
  }

  async function usage({ classId } = {}) {
    const d = day();
    const org = await kv.get(`assetbudget:org:default:${d}`);
    const cls = classId ? await kv.get(`assetbudget:class:${classId}:${d}`) : null;
    const sum = b => (b ? b.spent + Object.values(b.reserved).reduce((x, y) => x + y, 0) : 0);
    return { day: d, orgMicroUsd: sum(org), classMicroUsd: sum(cls), limits: lim };
  }

  return { reserve, settle, release, usage, limits: lim };
}
