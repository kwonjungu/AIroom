// 단일 상태 원본 — 프로젝트 revision·undo/redo·마지막 정상 버전·저장 상태.
// UI·모드·생성 결과는 모두 이 저장소를 통해서만 프로젝트를 바꾼다. DOM 의존 없음.

import { applyPatch } from '../shared/contracts/patch-apply.js';
import { validateProject, LIMITS } from '../shared/contracts/schemas.js';

export const SAVE_STATES = ['idle', 'saving', 'savedLocal', 'savedClass', 'unsaved', 'error'];

const clone = v => JSON.parse(JSON.stringify(v));

/**
 * @param {object} project 초기 프로젝트 (validateProject 통과해야 함)
 * @param {{ instantiate?: Function, now?: () => string }} [opts]
 */
export function createProjectStore(project, opts = {}) {
  const errs = validateProject(project).filter(d => d.severity === 'error');
  if (errs.length) throw Object.assign(new Error('invalid initial project'), { diagnostics: errs });

  let current = clone(project);
  let lastGood = clone(project);        // 마지막으로 실행 검증을 통과한 버전 (markRunnable로 갱신)
  const undo = [];                      // 이전 프로젝트 스냅샷
  const redo = [];
  let saveState = 'idle';
  const listeners = new Set();
  const now = opts.now || (() => new Date().toISOString());

  function emit(event) { for (const fn of listeners) { try { fn(event, api.getState()); } catch (e) { console.error(e); } } }
  function pushUndo(p) { undo.push(p); if (undo.length > LIMITS.undoDepth) undo.shift(); redo.length = 0; }

  const api = {
    getState() {
      return { project: current, lastGood, saveState, canUndo: undo.length > 0, canRedo: redo.length > 0 };
    },
    getProject() { return current; },
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },

    /**
     * 정형 변경 적용. baseRevision 불일치·검증 실패면 아무것도 바뀌지 않는다.
     * @param {object} patch PatchSchema
     * @param {{ source?: 'ui'|'ai'|'blocks'|'cards' }} [meta]
     */
    applyPatch(patch, meta = {}) {
      const r = applyPatch(current, patch, { now: now(), instantiate: opts.instantiate });
      if (!r.ok) { emit({ type: 'patchRejected', diagnostics: r.diagnostics, source: meta.source }); return r; }
      pushUndo(current);
      current = r.project;
      saveState = 'unsaved';
      emit({ type: 'changed', changes: r.changes, source: meta.source, revision: current.revision });
      return r;
    },

    /**
     * 편집기(카드·블록)가 프로그램 전체를 재구성할 때 사용. 검증 후 revision을 1 올린다.
     * @param {{nodes:object[], entrypoints:string[]}} program
     */
    replaceProgram(program, meta = {}) {
      const next = clone(current);
      next.program = clone(program);
      next.revision = current.revision + 1;
      next.updatedAt = now();
      const diags = validateProject(next);
      if (diags.some(d => d.severity === 'error')) { emit({ type: 'patchRejected', diagnostics: diags, source: meta.source }); return { ok: false, diagnostics: diags }; }
      pushUndo(current);
      current = next;
      saveState = 'unsaved';
      emit({ type: 'changed', changes: ['program'], source: meta.source, revision: current.revision });
      return { ok: true, project: current, diagnostics: diags };
    },

    setTitle(title) {
      const t = String(title).trim().slice(0, 40);
      if (!t) return false;
      pushUndo(current);
      current = { ...clone(current), title: t, revision: current.revision + 1, updatedAt: now() };
      saveState = 'unsaved';
      emit({ type: 'changed', changes: ['title'], revision: current.revision });
      return true;
    },

    // undo/redo는 내용을 되돌리되 revision은 계속 증가시킨다 → 진행 중 AI 요청의 baseRevision이 자동 무효화된다.
    undo() {
      if (!undo.length) return false;
      const prev = undo.pop();
      redo.push(current);
      current = { ...clone(prev), revision: current.revision + 1, updatedAt: now() };
      saveState = 'unsaved';
      emit({ type: 'changed', changes: ['undo'], revision: current.revision });
      return true;
    },
    redo() {
      if (!redo.length) return false;
      const nxt = redo.pop();
      undo.push(current);
      current = { ...clone(nxt), revision: current.revision + 1, updatedAt: now() };
      saveState = 'unsaved';
      emit({ type: 'changed', changes: ['redo'], revision: current.revision });
      return true;
    },

    /** 실행 검증(V4/V5) 통과 시 호출 — '마지막으로 잘 된 작품' 포인터 */
    markRunnable(revision) {
      if (revision !== current.revision) return false;
      lastGood = clone(current);
      emit({ type: 'lastGood', revision });
      return true;
    },
    restoreLastGood() {
      pushUndo(current);
      current = { ...clone(lastGood), revision: current.revision + 1, updatedAt: now() };
      saveState = 'unsaved';
      emit({ type: 'changed', changes: ['restoreLastGood'], revision: current.revision });
    },

    setSaveState(s) {
      if (!SAVE_STATES.includes(s)) throw new Error('bad save state ' + s);
      saveState = s;
      emit({ type: 'saveState', saveState: s });
    },

    /** 서버/다른 탭에서 받은 최신본으로 교체 (충돌 해결 후). undo 이력은 비운다. */
    load(project) {
      const d = validateProject(project).filter(x => x.severity === 'error');
      if (d.length) return { ok: false, diagnostics: d };
      current = clone(project); undo.length = 0; redo.length = 0;
      emit({ type: 'loaded', revision: current.revision });
      return { ok: true };
    },
  };
  return api;
}
