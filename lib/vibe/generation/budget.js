// 호출 전 예약 / 호출 후 정산 — 일별 토큰 예산(조직 전체)과 공급자 냉각(429·잔여량 헤더) 공유.
// 둘 다 KV에 두어 Vercel 다중 인스턴스에서 같은 값을 본다.

const DAY_MS = 86_400_000;
export const DEFAULT_DAILY_TOKENS = 2_000_000;

export function createBudget(kv, { env = {}, now = Date.now } = {}) {
  const daily = Number(env.VIBE_LLM_DAILY_TOKEN_BUDGET) > 0 ? Number(env.VIBE_LLM_DAILY_TOKEN_BUDGET) : DEFAULT_DAILY_TOKENS;
  const dayKey = () => `gen:usage:${new Date(now()).toISOString().slice(0, 10)}`;

  async function mutate(fn) {
    const key = dayKey();
    for (let i = 0; i < 8; i++) {
      const cur = await kv.get(key);
      const base = cur || { revision: 0, reserved: 0, used: 0, calls: 0 };
      const next = fn({ ...base });
      if (next === null) return { ok: false, state: base };
      next.revision = base.revision + 1;
      const r = await kv.casJson(key, cur ? cur.revision : null, next, { ttlMs: 2 * DAY_MS });
      if (r.ok) return { ok: true, state: next };
    }
    return { ok: false, state: null, contention: true };
  }

  /** @returns {Promise<{ok:boolean, remaining?:number}>} */
  async function reserve(tokens) {
    const r = await mutate(s => (s.used + s.reserved + tokens > daily ? null : { ...s, reserved: s.reserved + tokens, calls: s.calls + 1 }));
    return r.ok ? { ok: true, remaining: daily - r.state.used - r.state.reserved } : { ok: false, contention: !!r.contention };
  }

  async function settle(reservedTokens, actualTokens) {
    await mutate(s => ({ ...s, reserved: Math.max(0, s.reserved - reservedTokens), used: s.used + Math.max(0, actualTokens || 0) }));
  }

  async function usage() { return (await kv.get(dayKey())) || { reserved: 0, used: 0, calls: 0 }; }

  // ── 공급자 냉각: 429 Retry-After·잔여 토큰 부족 시 모든 인스턴스가 새 호출을 멈춘다 ──
  async function cooldownUntil() { const c = await kv.get('gen:cooldown'); return c && c.until > now() ? c.until : 0; }
  async function setCooldown(ms) {
    if (!(ms > 0)) return;
    const until = now() + Math.min(ms, 10 * 60_000);
    const cur = await kv.get('gen:cooldown');
    if (cur && cur.until >= until) return;
    await kv.set('gen:cooldown', { until }, { ttlMs: until - now() + 1000 });
  }

  return { reserve, settle, usage, cooldownUntil, setCooldown, daily };
}
