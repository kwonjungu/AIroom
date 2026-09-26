// ST07 종단: 실제 WP7 API + 클라이언트 persistence 두 개(두 탭)가 같은 프로젝트를 동시에 저장
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { startApp, client } from './wp7-helpers.js';
import { createProjectStore } from '../../../public/vibe-v2/state/store.js';
import { catchGame } from '../../../public/vibe-v2/shared/contracts/fixtures.js';
import { createPersistence } from '../../../public/vibe-v2/persistence/index.js';
import { createMemoryStorage } from '../../../public/vibe-v2/persistence/storage.js';
import { createProjectApi } from '../../../public/vibe-v2/persistence/api-client.js';

test('ST07: 두 탭 동시 편집 → 하나는 저장, 다른 하나는 충돌 사본, 조용한 덮어쓰기 0', async () => {
  const app = await startApp();
  try {
    const s = client(app.base);
    assert.equal((await s.post('/session', { practice: true })).status, 201);
    const cookie = [...s.jar].map(([k, v]) => `${k}=${v}`).join('; ');
    const f = (url, init) => fetch(new URL(url, app.base.replace(/\/api\/vibe$/, '')), { ...init, headers: { ...(init.headers || {}), Cookie: cookie } });
    const api = createProjectApi({ fetch: f, base: '/api/vibe' });
    const server = (await api.createProject(catchGame())).project;

    const tabs = [0, 1].map(() => {
      const store = createProjectStore(server);
      const conflicts = [];
      const p = createPersistence({ store, api, storage: createMemoryStorage(), debounceMs: 5, doc: null, events: null, isOnline: () => true, onConflict: c => conflicts.push(c) });
      p.attachRemote(server.id, server.revision);
      return { store, p, conflicts };
    });
    const edit = (t, v) => t.store.applyPatch({ schemaVersion: 1, baseRevision: t.store.getProject().revision, summary: 's', assetRequests: [], operations: [{ op: 'setParameter', nodeId: 'fish-fall', parameter: 'speed', value: v }] });
    edit(tabs[0], 150); edit(tabs[1], 250);
    await Promise.all(tabs.map(t => t.p.flush()));

    const total = tabs[0].conflicts.length + tabs[1].conflicts.length;
    assert.equal(total, 1, '정확히 한 탭만 충돌 사본');
    const list = (await api.listProjects()).items;
    assert.equal(list.length, 2, '원본 + 사본');
    const speeds = [];
    for (const it of list) speeds.push((await api.getProject(it.id)).project.program.nodes.find(n => n.id === 'fish-fall').args.speed);
    assert.deepEqual(speeds.sort(), [150, 250], '두 결과 모두 서버에 보존');
    for (const t of tabs) assert.equal(t.store.getState().saveState, 'savedClass');
    tabs.forEach(t => t.p.dispose());
  } finally { await app.close(); }
});
