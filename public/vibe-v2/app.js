// v2 조립·라우팅·모드 생명주기 — 통합 담당 소유.
// 화면: 홈(ui/shell.mountHome) → 작업 화면(ui/shell.mountWorkspace + modes/*/createMode).
// 저장: persistence(IndexedDB, 800ms debounce). /api/vibe가 켜진 배포면 학생(연습) 세션을 잡고 서버에도 동기화한다.
// 생성: services/generation-client — 서버가 켜져 있으면 HTTP, 아니면 mock. 모드는 후보 적용에 generation.apply(job)를 쓴다.

import { mountHome, mountWorkspace } from './ui/shell.js';
import { createProjectStore } from './state/store.js';
import { createPersistence, readLocalProject } from './persistence/index.js';
import { defaultStorage } from './persistence/storage.js';
import { createProjectApi } from './persistence/api-client.js';
import { connectVibeApi, createGenerationClient } from './services/generation-client.js';
import { instantiate } from './shared/templates/index.js';
import { getCatalog } from './modes/cards/catalog.js';
import { getLearningCatalog } from './modes/learning/catalog.js';
import { getStudioCatalog } from './modes/studio/catalog.js';
import * as fixtures from './shared/contracts/fixtures.js';

const MODE_LOADERS = {
  goal: () => import('./modes/cards/index.js'),
  shape: () => import('./modes/cards/index.js'),
  studio: () => import('./modes/studio/index.js'),
  turtle: () => import('./modes/learning/index.js'),
  pixel: () => import('./modes/learning/index.js'),
  maze: () => import('./modes/learning/index.js'),
};

const prefs = {
  get(k) { try { return JSON.parse(localStorage.getItem('vibe2_pref_' + k)); } catch { return null; } },
  set(k, v) { try { localStorage.setItem('vibe2_pref_' + k, JSON.stringify(v)); } catch { /* 저장 불가 환경 */ } },
};

const root = document.getElementById('app');
const storage = defaultStorage();
let active = null; // { mode, shell, persistence, unsubscribe }
let openSeq = 0;

function grade() { return prefs.get('grade') || 'low'; }

async function disposeActive() {
  if (!active) return;
  const a = active; active = null;
  try { a.mode?.dispose(); } catch (e) { console.error(e); }
  try { await a.persistence?.flush(); } catch (e) { console.error(e); }   // 떠나기 전 마지막 편집 저장
  try { a.persistence?.dispose(); } catch (e) { console.error(e); }
  try { a.unsubscribe?.(); } catch (e) { console.error(e); }
  try { a.shell?.destroy(); } catch (e) { console.error(e); }
  root.replaceChildren();
}

async function recentProjects() {
  try {
    const keys = (await storage.keys()).filter(k => k.startsWith('project:'));
    const recs = (await Promise.all(keys.map(k => readLocalProject(storage, k.slice('project:'.length))))).filter(Boolean);
    return recs
      .sort((a, b) => String(b.project.updatedAt).localeCompare(String(a.project.updatedAt)))
      .slice(0, 6)
      .map(r => ({ title: r.project.title, saveState: 'savedLocal', updatedAt: r.project.updatedAt, open: () => openProject(r.project) }));
  } catch (e) {
    console.error(e);
    return [];
  }
}

async function showHome() {
  await disposeActive();
  const seq = ++openSeq;
  const recent = await recentProjects();
  if (seq !== openSeq) return;
  mountHome(root, {
    grade: grade(),
    onGrade: g => { prefs.set('grade', g); showHome(); },
    onStart: projectFactory => openProject(projectFactory()),
    fixtures,
    catalog: [...getCatalog(prefs.get('cards.progress')), ...getStudioCatalog(), ...getLearningCatalog(prefs.get('learning.progress'))],
    recent,
  });
}

/** @param {{saveNow?: boolean}} [opts] saveNow: 편집 전이라도 바로 저장 (옛 게임 변환처럼 새로 생긴 작품을 잃지 않게) */
async function openProject(project, opts = {}) {
  await disposeActive();
  const seq = ++openSeq;
  // 같은 id의 로컬 저장본이 더 최신이면 그것을 연다 (미션 다시 열기·새로고침 복구)
  const saved = await readLocalProject(storage, project.id).catch(() => null);
  if (seq !== openSeq) return;
  const start = saved && saved.project.revision >= project.revision ? saved.project : project;

  const conn = await connectVibeApi();
  if (seq !== openSeq) return;
  const store = createProjectStore(start, { instantiate });
  const shell = mountWorkspace(root, { grade: grade(), title: start.title, mode: start.mode, onBack: showHome });
  const persistence = createPersistence({ store, api: conn.ok ? createProjectApi() : null, storage, onError: e => console.error(e) });
  const unsubscribe = store.subscribe((ev, st) => shell.setSaveState?.(st.saveState));
  // 저장본에서 열었으면 "저장 안 됨"이 아니라 실제 위치로 표시 (학급 서버와 revision이 같으면 학급, 아니면 이 기기)
  if (saved && start === saved.project) {
    store.setSaveState(saved.remoteId && saved.serverRevision === start.revision && !saved.dirty ? 'savedClass' : 'savedLocal');
  }
  shell.onSaveAction?.(() => persistence.flush());
  active = { shell, persistence, unsubscribe, mode: null };

  const { createMode } = await MODE_LOADERS[start.mode]();
  if (seq !== openSeq) return;
  const mode = createMode({
    store, grade: grade(), shell, prefs, mission: null,
    generation: createGenerationClient({ conn, store, persistence }),
    save: () => persistence.flush(),   // 도크 💾 저장 버튼 (자동 저장과 같은 경로, 즉시 실행)
    openProject,              // 다음 미션 등 다른 프로젝트로 이동 (셸 제목·저장 대상까지 새로 연결)
    goHome: showHome,
  });
  active.mode = mode;
  if (opts.saveNow && !saved) persistence.flush();
  mode.enter(shell.stageSlot().closest('[data-workspace]') || root);
}

document.addEventListener('visibilitychange', () => {
  if (!active?.mode) return;
  document.hidden ? active.mode.pause() : active.mode.resume();
});

showHome();
