// 학습 진도 — 학생별 키(prog:{sid}) 하나, revision CAS, eventId 멱등.
// 허용 필드: {eventId, missionId, missionVersion, event:'completed'|'attempted'|'explained'} 외에는 거부한다.

export const PROGRESS_EVENTS = ['completed', 'attempted', 'explained'];
const EVENT_ID = /^[A-Za-z0-9_-]{8,64}$/;
const MISSION_ID = /^[a-z0-9][a-z0-9_.-]{0,39}$/;
const MISSION_VERSION = /^[A-Za-z0-9_.-]{1,20}$/;
const RECENT_EVENTS = 500;
const MAX_MISSIONS = 300;
const TTL_MS = 180 * 86_400_000;

export class ProgressError extends Error {
  constructor(kind, message) { super(message); this.kind = kind; }
}

export function parseProgressEvent(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
  const keys = Object.keys(body);
  const allowed = ['eventId', 'missionId', 'missionVersion', 'event'];
  if (keys.length !== allowed.length || !keys.every(k => allowed.includes(k))) return null;
  const { eventId, missionId, missionVersion, event } = body;
  if (typeof eventId !== 'string' || !EVENT_ID.test(eventId)) return null;
  if (typeof missionId !== 'string' || !MISSION_ID.test(missionId)) return null;
  if (typeof missionVersion !== 'string' || !MISSION_VERSION.test(missionVersion)) return null;
  if (!PROGRESS_EVENTS.includes(event)) return null;
  return { eventId, missionId, missionVersion, event };
}

/** @param {{kv:object, now:()=>number}} deps */
export function createProgressStore({ kv, now }) {
  const empty = () => ({ revision: 0, missions: {}, recentEvents: [], updatedAt: null });
  const key = sid => `prog:${sid}`;

  async function read(sid) {
    const env = (await kv.get(key(sid))) || empty();
    return { missions: env.missions, updatedAt: env.updatedAt };
  }

  /** @returns {Promise<{applied:boolean, progress:{missions:object, updatedAt:string|null}}>} */
  async function record(sid, ev) {
    for (let attempt = 0; attempt < 8; attempt++) {
      const cur = await kv.get(key(sid));
      const env = cur || empty();
      if (env.recentEvents.includes(ev.eventId)) {
        return { applied: false, progress: { missions: env.missions, updatedAt: env.updatedAt } };
      }
      const t = new Date(now()).toISOString();
      const missions = { ...env.missions };
      const m = missions[ev.missionId]
        ? { ...missions[ev.missionId] }
        : { missionVersion: ev.missionVersion, completed: false, attempts: 0, explained: false, completedAt: null, updatedAt: t };
      if (!missions[ev.missionId] && Object.keys(missions).length >= MAX_MISSIONS) throw new ProgressError('LIMIT', '진도 기록이 너무 많아요.');
      m.missionVersion = ev.missionVersion;
      if (ev.event === 'attempted') m.attempts = Math.min(100000, m.attempts + 1);
      if (ev.event === 'completed') { if (!m.completed) m.completedAt = t; m.completed = true; }
      if (ev.event === 'explained') m.explained = true;
      m.updatedAt = t;
      missions[ev.missionId] = m;
      const next = {
        revision: env.revision + 1,
        missions,
        recentEvents: [...env.recentEvents, ev.eventId].slice(-RECENT_EVENTS),
        updatedAt: t,
      };
      const r = await kv.casJson(key(sid), cur ? env.revision : null, next, { ttlMs: TTL_MS });
      if (r.ok) return { applied: true, progress: { missions, updatedAt: t } };
      // 동시 기록 경합 → 다시 읽고 재시도 (상한 있음)
      await new Promise(res => setTimeout(res, 5 + Math.random() * 20));
    }
    throw new ProgressError('BUSY', '잠시 후 다시 해 보세요.');
  }

  return { read, record };
}
