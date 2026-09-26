// WP1 공통 셸 진입점. app.js가 이 두 함수만 부른다.
//   mountHome(root, { grade, onGrade(g), onStart(projectFactory), fixtures, catalog?, recent? })
//   mountWorkspace(root, { grade, title, onBack, mode? }) → ShellApi & { destroy() }
// 모드가 쓸 수 있는 도구: ./text-input.js(createTextInput), ./status.js(createStateView), ./prefs.js(isMuted 등)

export { mountHome } from './home.js';
export { mountWorkspace } from './workspace.js';
export { createTextInput } from './text-input.js';
export { createStateView, createSaveBadge, describeSaveState } from './status.js';
export { isMuted, isReducedMotion, PREFS_EVENT } from './prefs.js';
