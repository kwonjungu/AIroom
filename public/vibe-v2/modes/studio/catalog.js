// 게임 공방 템플릿 카탈로그 — 홈(WP1)이 소비한다. DOM 없음. WP2 modes/cards/catalog.js 와 같은 모양.
//
// getStudioCatalog() → [{id, title, mode:'studio', missions:[{id, title, icon, status:'open', makeProject, description, controls, genre}]}]
//   공방은 순서 학습이 아니라 작품 갤러리이므로 잠금이 없다(모두 'open').
//   makeProject()는 부를 때마다 새 id의 작품을 만든다(같은 템플릿을 여러 번 시작해도 서로 덮어쓰지 않음).

import { TEMPLATES, createTemplateProject } from '../../shared/templates/index.js';

export const STUDIO_TEMPLATE_ORDER = ['catch', 'avoid', 'collect', 'maze'];

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

/** 새 작품 id (ProjectSchema: ^p_[A-Za-z0-9_-]{4,40}$) */
export function newStudioProjectId(templateId) {
  return `p_${templateId}_${uid()}`.slice(0, 42);
}

/**
 * 템플릿으로 새 작품 한 벌. 실패하면 예외(템플릿은 테스트로 보증되므로 실패는 버그).
 * @param {string} templateId
 * @param {object} [params]
 */
export function makeStudioProject(templateId, params = {}, meta = {}) {
  const r = createTemplateProject(templateId, params, { id: meta.id || newStudioProjectId(templateId), title: meta.title, now: meta.now });
  if (!r.ok) throw Object.assign(new Error('template failed: ' + templateId), { diagnostics: r.diagnostics });
  return r.project;
}

export function getStudioCatalog() {
  return [{
    id: 'studio-templates',
    title: '게임 공방',
    mode: 'studio',
    missions: STUDIO_TEMPLATE_ORDER.map(id => {
      const t = TEMPLATES[id];
      return {
        id: 'studio-' + id,
        templateId: id,
        title: t.title,
        icon: t.icon,
        genre: t.genre,
        description: t.description,
        controls: t.controls,
        status: 'open',
        makeProject: () => makeStudioProject(id),
      };
    }),
  }];
}
