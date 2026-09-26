import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createProjectStore } from '../../../public/vibe-v2/state/store.js';
import { catchGame } from '../../../public/vibe-v2/shared/contracts/fixtures.js';
import { createPersistence, exportProject, importProject, readLocalProject } from '../../../public/vibe-v2/persistence/index.js';
import { createMemoryStorage } from '../../../public/vibe-v2/persistence/storage.js';
import { ApiClientError } from '../../../public/vibe-v2/persistence/api-client.js';

function fakeTimers() {
  let t = 0; let seq = 0; const q = new Map();
  return {
    setTimeout(fn, ms) { const id = ++seq; q.set(id, { at: t + ms, fn }); return id; },
    clearTimeout(id) { q.delete(id); },
    async advance(ms) {
      t += ms;
      for (const [id, x] of [...q].sort((a, b) => a[1].at - b[1].at)) if (x.at <= t) { q.delete(id); x.fn(); }
      await new Promise(r => setImmediate(r)); await new Promise(r => setImmediate(r));
    },
    pending: () => q.size,
  };
}

/** 서버 규칙(revision CAS, 409 + 최신 revision)을 흉내 내는 가짜 API */
function fakeApi() {
  const db = new Map(); let n = 0; const calls = [];
  const err = (status, code, rev) => new ApiClientError(status, { error: { code, message: code, retryable: false, retryAfterMs: null, requestId: 'r_test0001' } }, { get: h => (h === 'x-vibe-revision' && rev !== undefined ? String(rev) : null) });
  return {
    db, calls, offline: false, failNext: 0,
    async createProject(p) {
      calls.push(['create', p.title]);
      if (this.offline) throw new ApiClientError(0, null, null);
      const id = `p_srv${++n}xx`; const project = { ...structuredClone(p), id, revision: 0 };
      db.set(id, project); return { project };
    },
    async putProject(id, { baseRevision, project }) {
      calls.push(['put', id, baseRevision, project.revision]);
      if (this.offline) throw new ApiClientError(0, null, null);
      if (this.failNext > 0) { this.failNext--; throw err(503, 'PROVIDER_UNAVAILABLE'); }
      const cur = db.get(id);
      if (cur.revision !== baseRevision) throw err(409, 'REVISION_CONFLICT', cur.revision);
      const next = { ...structuredClone(project), id, revision: Math.max(baseRevision + 1, project.revision) };
      db.set(id, next); return { project: next };
    },
  };
}

function setup(o = {}) {
  const store = createProjectStore(catchGame());
  const timers = fakeTimers();
  const storage = o.storage || createMemoryStorage();
  const states = [];
  store.subscribe((ev, st) => { if (ev.type === 'saveState') states.push(st.saveState); });
  const api = o.api === undefined ? fakeApi() : o.api;
  const doc = new EventTarget(); doc.visibilityState = 'visible';
  const win = new EventTarget();
  let online = true;
  const conflicts = [];
  const p = createPersistence({ store, api, storage, timers, doc, events: win, isOnline: () => online, onConflict: c => conflicts.push(c) });
  return { store, timers, storage, states, api, doc, win, p, conflicts, setOnline: v => { online = v; } };
}
const speed = (store, v) => store.applyPatch({ schemaVersion: 1, baseRevision: store.getProject().revision, summary: 's', assetRequests: [], operations: [{ op: 'setParameter', nodeId: 'fish-fall', parameter: 'speed', value: v }] });

test('debounce: 연속 편집은 800ms 뒤 한 번만 저장, 학급 저장 성공 시 savedClass', async () => {
  const { store, timers, storage, states, api, p } = setup();
  await p.ready();
  speed(store, 100); await timers.advance(300);
  speed(store, 110); await timers.advance(300);
  speed(store, 120); await timers.advance(799);
  assert.equal(api.calls.length, 0, '아직 저장 전');
  await timers.advance(1); await p.flush();
  assert.deepEqual(api.calls.map(c => c[0]), ['create', 'put']);
  assert.equal(states.at(-1), 'savedClass');
  const rec = await readLocalProject(storage, store.getProject().id);
  assert.equal(rec.project.revision, 3);
  assert.equal(rec.serverRevision, 3, '서버 revision이 로컬 store revision과 정렬');
});

test('flush: 탭 숨김·pagehide 때 대기 중인 저장을 즉시 수행', async () => {
  const { store, timers, api, doc, win, p } = setup();
  await p.ready();
  speed(store, 100);
  doc.visibilityState = 'hidden'; doc.dispatchEvent(new Event('visibilitychange'));
  await p.flush();
  assert.equal(api.calls.length, 2);
  assert.equal(timers.pending(), 0, '디바운스 타이머 취소');
  speed(store, 130);
  win.dispatchEvent(new Event('pagehide'));
  await p.flush();
  assert.equal(api.calls.at(-1)[0], 'put');
});

test('오프라인: 로컬에만 저장하고 savedLocal, 온라인 복귀 시 서버 동기화', async () => {
  const { store, timers, states, api, win, p, setOnline } = setup();
  await p.ready();
  setOnline(false);
  speed(store, 100); await timers.advance(800); await p.flush();
  assert.equal(states.at(-1), 'savedLocal');
  assert.equal(api.calls.length, 0);
  setOnline(true); win.dispatchEvent(new Event('online')); await p.flush();
  assert.equal(states.at(-1), 'savedClass');
});

test('서버 일시 장애: savedLocal + 제한된 재시도(무한 재시도 없음)', async () => {
  const api = fakeApi(); api.failNext = 100;
  const { store, timers, states, p } = setup({ api });
  await p.ready();
  speed(store, 100); await timers.advance(800); await p.flush();
  assert.equal(states.at(-1), 'savedLocal');
  for (let i = 0; i < 10; i++) { await timers.advance(60_000); await p.idle(); }
  const puts = api.calls.filter(c => c[0] === 'put').length;
  assert.equal(puts, 4, '처음 1회 + 재시도 3회');
  assert.equal(timers.pending(), 0);
});

test('저장 실패·용량 부족은 error로 정직하게 표시', async () => {
  const { store, timers, states, p } = setup({ storage: createMemoryStorage({ quotaBytes: 100 }) });
  await p.ready();
  speed(store, 100); await timers.advance(800);
  const r = await p.flush();
  assert.equal(r.ok, false); assert.equal(r.reason, 'quota');
  assert.equal(states.at(-1), 'error');
});

test('409 충돌: 다른 탭 결과는 서버에 그대로, 내 작업은 충돌 사본으로 보존', async () => {
  const { store, timers, storage, api, p, conflicts } = setup();
  await p.ready();
  speed(store, 100); await timers.advance(800); await p.flush();
  const originalId = p.getMeta().remoteId;
  // 다른 탭이 먼저 저장
  const other = structuredClone(api.db.get(originalId));
  other.title = '다른 탭'; other.revision += 1; api.db.set(originalId, other);

  speed(store, 222); await timers.advance(800); await p.flush();
  assert.equal(conflicts.length, 1);
  assert.equal(api.db.get(originalId).title, '다른 탭', '서버 원본 덮어쓰기 없음');
  const copyId = conflicts[0].copyId;
  assert.notEqual(copyId, originalId);
  assert.equal(store.getProject().id, copyId);
  assert.match(store.getProject().title, /내 사본/);
  const copy = api.db.get(copyId);
  assert.equal(copy.program.nodes.find(n => n.id === 'fish-fall').args.speed, 222, '내 편집 보존');
  assert.ok(await readLocalProject(storage, copyId));
  assert.ok((await storage.keys()).some(k => k.endsWith(':conflict')));
});

test('내보내기/가져오기: 버전 있는 JSON, 스키마 검증, 새 로컬 id', () => {
  const g = catchGame();
  const text = exportProject(g);
  const r = importProject(text);
  assert.equal(r.ok, true); assert.notEqual(r.project.id, g.id); assert.match(r.project.id, /^p_import_/);
  assert.equal(importProject('{"format":"x"}').reason, 'unknown-format');
  assert.equal(importProject('not json').reason, 'not-json');
  const bad = JSON.parse(text); bad.project.program.nodes.push({ id: 'evil', kind: 'script', args: { code: 'alert(1)' }, children: [] });
  assert.equal(importProject(JSON.stringify(bad)).reason, 'invalid-project');
  const v2 = JSON.parse(text); v2.formatVersion = 2;
  assert.equal(importProject(JSON.stringify(v2)).reason, 'unsupported-version');
  assert.equal(importProject('x'.repeat(600 * 1024)).reason, 'too-large');
});
