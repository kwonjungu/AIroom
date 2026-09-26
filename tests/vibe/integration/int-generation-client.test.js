// 통합: 브라우저 GenerationClient(HTTP) + persistence + 실제 /api/vibe(WP7+WP5, mock 공급자) 종단.
// 로컬 편집 → 서버 동기화 → 생성 → 폴링 → apply(서버 반영 + 로컬 store 반영, undo 유지) → 재저장 없음.

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createMockProvider } from '../../../lib/vibe/providers/mock.js';
import { EXAMPLES } from '../../../lib/vibe/generation/examples.js';
import { createTemplateProject, instantiate } from '../../../public/vibe-v2/shared/templates/index.js';
import { createProjectStore } from '../../../public/vibe-v2/state/store.js';
import { createPersistence } from '../../../public/vibe-v2/persistence/index.js';
import { createMemoryStorage } from '../../../public/vibe-v2/persistence/storage.js';
import { createProjectApi } from '../../../public/vibe-v2/persistence/api-client.js';
import { connectVibeApi, createGenerationClient } from '../../../public/vibe-v2/services/generation-client.js';
import { startGenApp, GROQ_TEST_KEY } from './wp5-helpers.js';

const BOMB_OUTPUT = EXAMPLES.find(e => e.id === 'ex-rule-bomb').output;
const RULE_TEXT = '폭탄도 떨어지게 하고 폭탄에 닿으면 목숨이 줄게 해줘';
let seq = 0;
const rid = () => `cli-${Date.now().toString(36)}-${(seq++).toString(36).padStart(4, '0')}`;

/** 쿠키 저장소가 있는 fetch (브라우저의 same-origin 쿠키 흉내) */
function cookieFetch(origin) {
  const jar = new Map();
  return async (url, init = {}) => {
    const headers = { ...(init.headers || {}) };
    if (jar.size) headers.Cookie = [...jar].map(([k, v]) => `${k}=${v}`).join('; ');
    const res = await fetch(new URL(url, origin), { ...init, headers });
    for (const c of res.headers.getSetCookie?.() || []) {
      const [kv] = c.split(';'); const i = kv.indexOf('=');
      jar.set(kv.slice(0, i).trim(), kv.slice(i + 1));
    }
    return res;
  };
}

describe('HTTP GenerationClient 종단 (mock 공급자)', () => {
  let app, origin;
  before(async () => {
    const provider = createMockProvider(() => ({ type: 'ok', output: BOMB_OUTPUT }), { env: { GROQ_API_KEY: GROQ_TEST_KEY, VIBE_GROQ_TIMEOUT_MS: '200' } });
    app = await startGenApp({ provider });
    origin = app.base.replace(/\/api\/vibe$/, '');
  });
  after(() => app.close());

  async function workspace(f) {
    const project = createTemplateProject('catch', { item: 'apple' }).project;
    const store = createProjectStore(project, { instantiate });
    const persistence = createPersistence({ store, api: createProjectApi({ fetch: f }), storage: createMemoryStorage(), debounceMs: 5, doc: null, events: null, isOnline: () => true });
    const generation = createGenerationClient({ conn: { ok: true }, store, persistence, fetch: f });
    return { store, persistence, generation, localId: project.id };
  }

  async function session(f) {
    const r = await f('/api/vibe/session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ practice: true }) });
    assert.equal(r.status, 201);
  }

  test('동기화 → 생성 → watch → apply: 서버·로컬 revision 일치, undo 가능, 로컬 id 유지', async () => {
    const f = cookieFetch(origin);
    await session(f);
    const w = await workspace(f);
    assert.equal(w.generation.kind, 'http');
    const p = w.store.getProject();
    const job = await w.generation.start({ projectId: p.id, baseRevision: p.revision, requestId: rid(), intentText: RULE_TEXT, mode: 'studio', project: p });
    assert.ok(job.jobId, JSON.stringify(job));
    const seen = [];
    const done = await w.generation.watch(job.jobId, j => seen.push(j.status), { intervalMs: 5 });
    assert.equal(done.status, 'ready', JSON.stringify(done));
    assert.ok(done.candidate?.hash);

    const meta0 = w.persistence.getMeta();
    const a = await w.generation.apply(done);
    assert.equal(a.ok, true, JSON.stringify(a));
    const local = w.store.getProject();
    assert.equal(local.id, w.localId, '로컬 id 유지');
    assert.ok(local.program.nodes.some(n => n.kind === 'onTouch' && n.args.entity === 'bomb'));
    assert.equal(w.persistence.getMeta().serverRevision, local.revision, '서버 revision과 일치 → 재PUT 불필요');
    assert.equal(w.persistence.getMeta().remoteId, meta0.remoteId);
    await w.persistence.idle();
    const server = await createProjectApi({ fetch: f }).getProject(meta0.remoteId);
    assert.equal(server.project.revision, local.revision);
    assert.equal(w.store.getState().canUndo, true, 'AI 변경도 되돌리기 가능');

    const again = await w.generation.apply(done);
    assert.equal(again.ok, false, '이미 적용된 후보는 로컬 revision이 달라 다시 적용하지 않는다');
    w.persistence.dispose();
  });

  test('요청 뒤 직접 고치면 apply는 conflict — 내 편집이 보존된다', async () => {
    const f = cookieFetch(origin);
    await session(f);
    const w = await workspace(f);
    const p = w.store.getProject();
    const job = await w.generation.start({ projectId: p.id, baseRevision: p.revision, requestId: rid(), intentText: RULE_TEXT, mode: 'studio', project: p });
    const done = await w.generation.watch(job.jobId, null, { intervalMs: 5 });
    assert.equal(done.status, 'ready');
    w.store.setTitle('내가 바꾼 제목');
    const r = await w.generation.apply(done);
    assert.equal(r.ok, false);
    assert.equal(r.reason, 'conflict');
    assert.equal(w.store.getProject().title, '내가 바꾼 제목');
    assert.ok(!w.store.getProject().program.nodes.some(n => n.args?.entity === 'bomb'));
    w.persistence.dispose();
  });

  test('서버 오류는 예외가 아니라 failed Job으로 돌아온다 (세션 없음 → 401)', async () => {
    const f = cookieFetch(origin); // 세션 없이
    const w = await workspace(f);
    const p = w.store.getProject();
    const job = await w.generation.start({ projectId: p.id, baseRevision: p.revision, requestId: rid(), intentText: RULE_TEXT, mode: 'studio', project: p });
    assert.equal(job.status, 'failed');
    assert.match(job.studentMessage, /[가-힣]/);
    assert.equal(w.store.getProject().revision, p.revision, '작품 그대로');
    w.persistence.dispose();
  });

  test('connectVibeApi: health 없음 → ok:false, mock 폴백', async () => {
    const f = cookieFetch(origin);
    const conn = await connectVibeApi({ fetch: f, fresh: true });
    assert.equal(conn.ok, false, 'startGenApp에는 /health가 없다 → 404');
    const store = createProjectStore(createTemplateProject('catch', { item: 'apple' }).project, { instantiate });
    const g = createGenerationClient({ conn, store, persistence: null });
    assert.equal(g.kind, 'mock');
    const p = store.getProject();
    const job = await g.start({ projectId: p.id, baseRevision: p.revision, requestId: rid(), intentText: '사과가 더 천천히 떨어지게', mode: 'studio', project: p });
    const done = await g.watch(job.jobId, null, { intervalMs: 5 });
    assert.equal(done.status, 'ready');
    const a = await g.apply(done);
    assert.equal(a.ok, true);
    assert.equal(store.getProject().revision, p.revision + 1);
  });

  test('connectVibeApi: health ok → 연습 세션 자동 발급', async () => {
    const f = cookieFetch(origin);
    const fake = async (url, init) => (String(url).endsWith('/health') ? new Response(JSON.stringify({ ok: true }), { status: 200 }) : f(url, init));
    const conn = await connectVibeApi({ fetch: fake, fresh: true });
    assert.equal(conn.ok, true, JSON.stringify(conn));
    assert.equal(conn.session.kind, 'practice');
    const again = await connectVibeApi({ fetch: fake, fresh: true });
    assert.equal(again.session.studentId, conn.session.studentId, '쿠키가 있으면 기존 세션 재사용');
  });
});
