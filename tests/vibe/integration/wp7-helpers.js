// WP7 통합 테스트 공용 — 메모리 KV + 임시 express 앱(임의 포트). 실제 학생 데이터·Redis 사용 안 함.

import express from 'express';
import { createVibeApi } from '../../../lib/vibe/api.js';
import { createMemoryKv } from '../../../lib/vibe/kv/index.js';
import { catchGame } from '../../../public/vibe-v2/shared/contracts/fixtures.js';

export const SECRET = 'test-secret-0123456789abcdefghijklmnop';
export const STAFF_TOKENS = { 'staff-A': { role: 'user' }, 'staff-B': { role: 'user' } };

/**
 * @param {{ env?: object, limits?: object, preParse?: boolean, clock?: {t:number} }} [o]
 */
export async function startApp(o = {}) {
  const clock = o.clock || { t: Date.parse('2026-09-26T09:00:00Z') };
  const now = () => clock.t;
  const kv = createMemoryKv({ now });
  const logs = [];
  const api = createVibeApi({
    express, kv, now,
    env: o.env || { VIBE_SESSION_SECRET: SECRET },
    validateStaffSession: async t => STAFF_TOKENS[t] || null,
    limits: o.limits,
    log: e => logs.push(e),
  });
  const app = express();
  app.set('trust proxy', true);
  if (o.preParse) app.use(express.json({ limit: '10mb' })); // server.js 전역 파서 재현
  app.use('/api/vibe', api);
  const server = await new Promise(r => { const s = app.listen(0, '127.0.0.1', () => r(s)); });
  const base = `http://127.0.0.1:${server.address().port}/api/vibe`;
  return { base, kv, clock, logs, services: api.services, close: () => new Promise(r => server.close(r)) };
}

/** 쿠키 저장 클라이언트 (한 브라우저 = 한 학생) */
export function client(base, { staff = null, ip = '203.0.113.7' } = {}) {
  const jar = new Map();
  async function call(method, path, body, extra = {}) {
    const headers = { 'X-Forwarded-For': ip, ...(extra.headers || {}) };
    if (jar.size) headers.Cookie = [...jar].map(([k, v]) => `${k}=${v}`).join('; ');
    if (staff) headers['X-Auth-Token'] = staff;
    let payload;
    if (body !== undefined) { headers['Content-Type'] = 'application/json'; payload = typeof body === 'string' ? body : JSON.stringify(body); }
    const res = await fetch(base + path, { method, headers, body: payload });
    for (const c of res.headers.getSetCookie()) {
      const [pair] = c.split(';');
      const i = pair.indexOf('=');
      const k = pair.slice(0, i); const v = pair.slice(i + 1);
      if (/Max-Age=0/.test(c)) jar.delete(k); else jar.set(k, v);
    }
    const text = await res.text();
    let json = null; try { json = JSON.parse(text); } catch { /* 비JSON */ }
    return { status: res.status, body: json, headers: res.headers };
  }
  return {
    jar, call,
    get: (p, e) => call('GET', p, undefined, e),
    post: (p, b, e) => call('POST', p, b ?? {}, e),
    patch: (p, b, e) => call('PATCH', p, b, e),
    put: (p, b, e) => call('PUT', p, b, e),
  };
}

export function projectDraft(title = '생선 받기') {
  const g = catchGame();
  return { mode: g.mode, title, templateId: g.templateId, program: g.program, assets: g.assets, learning: g.learning, id: 'p_client_forged', ownerId: 's_forged', revision: 99 };
}

export const speedPatch = (base, speed) => ({
  schemaVersion: 1, baseRevision: base, summary: '속도 변경', assetRequests: [],
  operations: [{ op: 'setParameter', nodeId: 'fish-fall', parameter: 'speed', value: speed }],
});

export async function newClass(teacher, name = '3-2') {
  const r = await teacher.post('/teacher/classes', { name });
  if (r.status !== 201) throw new Error('class create failed ' + r.status + JSON.stringify(r.body));
  return r.body;
}

export async function joinedStudent(base, inviteCode, opts = {}) {
  const c = client(base, opts);
  const r = await c.post('/session', { inviteCode, displayName: opts.displayName });
  if (r.status !== 201) throw new Error('join failed ' + r.status + JSON.stringify(r.body));
  c.session = r.body;
  return c;
}
