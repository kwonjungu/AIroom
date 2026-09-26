// v2 조립·라우팅·모드 생명주기 — 통합 담당 소유.
// 화면: 홈(ui/shell.mountHome) → 작업 화면(ui/shell.mountWorkspace + modes/*/createMode).

import { mountHome, mountWorkspace } from './ui/shell.js';
import { createProjectStore } from './state/store.js';
import { createMockGenerationClient } from './mocks/generation-mock.js';
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
let active = null; // { mode, shell }

function grade() { return prefs.get('grade') || 'low'; }

function disposeActive() {
  if (!active) return;
  try { active.mode?.dispose(); } catch (e) { console.error(e); }
  try { active.shell?.destroy(); } catch (e) { console.error(e); }
  active = null;
  root.replaceChildren();
}

function showHome() {
  disposeActive();
  mountHome(root, {
    grade: grade(),
    onGrade: g => { prefs.set('grade', g); showHome(); },
    // 경로·미션 선택 → 프로젝트 생성은 각 모드의 미션 카탈로그가 담당할 때까지 fixture로 연결
    onStart: projectFactory => openProject(projectFactory()),
    fixtures,
  });
}

async function openProject(project) {
  disposeActive();
  const store = createProjectStore(project);
  const shell = mountWorkspace(root, { grade: grade(), title: project.title, onBack: showHome });
  const { createMode } = await MODE_LOADERS[project.mode]();
  const mode = createMode({ store, grade: grade(), shell, generation: createMockGenerationClient(), prefs, mission: null });
  active = { mode, shell };
  mode.enter(shell.stageSlot().closest('[data-workspace]') || root);
}

document.addEventListener('visibilitychange', () => {
  if (!active?.mode) return;
  document.hidden ? active.mode.pause() : active.mode.resume();
});

showHome();
