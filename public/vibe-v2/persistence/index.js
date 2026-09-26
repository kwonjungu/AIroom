// 클라이언트 저장 — 편집 후 800ms debounce 로컬 저장(IndexedDB), 탭 숨김·페이지 이탈 시 flush,
// 서버 동기화(revision 단위), 409 충돌 시 충돌 사본으로 두 결과 모두 보존(조용한 덮어쓰기 금지).
// 저장 상태는 store.setSaveState로만 표시한다: saving / savedLocal(이 기기) / savedClass(학급 서버) / error(저장 안 됨).

import { validateProject, CONTRACT_VERSION } from '../shared/contracts/schemas.js';
import { defaultStorage } from './storage.js';

export const EXPORT_FORMAT = 'airoom-vibe-project';
export const EXPORT_FORMAT_VERSION = 1;
export const MAX_IMPORT_CHARS = 512 * 1024;
const MAX_SYNC_RETRIES = 3;
const recordKey = id => `project:${id}`;
const clone = v => JSON.parse(JSON.stringify(v));

function randomSuffix() {
  const a = new Uint8Array(9);
  (globalThis.crypto?.getRandomValues ? globalThis.crypto.getRandomValues(a) : a.forEach((_, i) => { a[i] = Math.floor(Math.random() * 256); }));
  return [...a].map(b => 'abcdefghijklmnopqrstuvwxyz0123456789'[b % 36]).join('');
}

/** 저장된 로컬 기록 읽기 (새로고침·브라우저 재시작 후 복구, ST05) */
export async function readLocalProject(storage, id) {
  const rec = await storage.get(recordKey(id));
  if (!rec || !rec.project) return null;
  const errs = validateProject(rec.project).filter(d => d.severity === 'error');
  return errs.length ? null : rec;
}

/**
 * @param {{
 *   store: ReturnType<import('../state/store.js').createProjectStore>,
 *   api?: ReturnType<import('./api-client.js').createProjectApi> | null,
 *   storage?: ReturnType<import('./storage.js').createMemoryStorage>,
 *   debounceMs?: number,
 *   isOnline?: () => boolean,
 *   events?: EventTarget | null,     // window (online/pagehide)
 *   doc?: { visibilityState: string, addEventListener: Function, removeEventListener: Function } | null,
 *   timers?: { setTimeout: Function, clearTimeout: Function },
 *   onConflict?: (info: {originalId:string, serverRevision:number|null, copyId:string, copyTitle:string}) => void,
 *   onError?: (err: Error) => void,
 * }} o
 */
export function createPersistence(o) {
  const store = o.store;
  const api = o.api || null;
  const storage = o.storage || defaultStorage();
  const debounceMs = o.debounceMs ?? 800;
  const isOnline = o.isOnline || (() => globalThis.navigator?.onLine !== false);
  const timers = o.timers || { setTimeout: (...a) => globalThis.setTimeout(...a), clearTimeout: (...a) => globalThis.clearTimeout(...a) };
  const events = o.events === undefined ? (typeof window !== 'undefined' ? window : null) : o.events;
  const doc = o.doc === undefined ? (typeof document !== 'undefined' ? document : null) : o.doc;

  let meta = { remoteId: null, serverRevision: null };
  let timer = null;
  let chain = Promise.resolve();
  let dirty = false;
  let retries = 0;
  let disposed = false;
  let ready = null;
  let resolving = false;

  async function loadMeta() {
    const rec = await storage.get(recordKey(store.getProject().id)).catch(() => null);
    if (rec) meta = { remoteId: rec.remoteId ?? null, serverRevision: rec.serverRevision ?? null };
  }

  /** 서버에서 불러온 프로젝트로 시작하는 경우 호출 — remoteId·serverRevision을 알려 준다 */
  function attachRemote(remoteId, serverRevision) { meta = { remoteId, serverRevision }; }

  function schedule() {
    dirty = true;
    retries = 0;
    if (timer) timers.clearTimeout(timer);
    timer = timers.setTimeout(() => { timer = null; flush(); }, debounceMs);
  }

  function flush() {
    if (timer) { timers.clearTimeout(timer); timer = null; }
    chain = chain.then(() => (ready || Promise.resolve())).then(saveNow, saveNow);
    return chain;
  }

  async function writeLocal(project) {
    await storage.put(recordKey(project.id), {
      format: 1, project, remoteId: meta.remoteId, serverRevision: meta.serverRevision, dirty, savedAt: new Date().toISOString(),
    });
  }

  async function saveNow() {
    if (disposed) return { ok: false, reason: 'disposed' };
    const project = clone(store.getProject());
    store.setSaveState('saving');
    try {
      await writeLocal(project);
    } catch (err) {
      store.setSaveState('error'); // 조용히 넘기지 않는다
      o.onError?.(err);
      return { ok: false, reason: err?.name === 'QuotaExceededError' ? 'quota' : 'storage', error: err };
    }
    if (!api || !isOnline()) {
      store.setSaveState('savedLocal');
      return { ok: true, where: 'local' };
    }
    return sync(project);
  }

  async function sync(project) {
    try {
      if (!meta.remoteId) {
        const created = (await api.createProject(project)).project;
        meta = { remoteId: created.id, serverRevision: created.revision };
      }
      if (meta.serverRevision !== project.revision) {
        const r = await api.putProject(meta.remoteId, { baseRevision: meta.serverRevision, project });
        meta.serverRevision = r.project.revision;
      }
      dirty = false;
      retries = 0;
      await writeLocal(project).catch(() => {});
      // 저장하는 동안 새 편집이 있었으면 그 저장이 예약돼 있으므로 상태는 그쪽이 갱신한다
      store.setSaveState(store.getProject().revision === project.revision ? 'savedClass' : 'unsaved');
      return { ok: true, where: 'class' };
    } catch (err) {
      if (err?.status === 409 && !resolving) return resolveConflict(project, err);
      if (err?.status === 409) { store.setSaveState('error'); o.onError?.(err); return { ok: false, reason: 'conflict' }; }
      if (err?.status === 400 || err?.status === 413 || err?.status === 401 || err?.status === 403 || err?.status === 404) {
        store.setSaveState('savedLocal'); // 이 기기에는 안전하게 있음. 서버 저장만 안 됨
        o.onError?.(err);
        return { ok: true, where: 'local', serverError: err };
      }
      // 네트워크·429·5xx: 로컬엔 있음. 제한된 횟수만 재시도
      store.setSaveState('savedLocal');
      if (retries < MAX_SYNC_RETRIES && !disposed) {
        retries += 1;
        const wait = Math.min(30_000, err?.retryAfterMs || 1000 * 2 ** retries);
        if (timer) timers.clearTimeout(timer);
        timer = timers.setTimeout(() => { timer = null; flush(); }, wait);
      }
      return { ok: true, where: 'local', serverError: err };
    }
  }

  /** 다른 탭·기기가 먼저 저장함 → 서버 원본은 그대로 두고, 내 작업은 새 사본으로 보존 */
  async function resolveConflict(project, err) {
    resolving = true;
    try { return await resolveConflictInner(project, err); } finally { resolving = false; }
  }
  async function resolveConflictInner(project, err) {
    const originalId = meta.remoteId;
    const copyTitle = `${project.title} (내 사본)`.slice(0, 40);
    const copyLocal = { ...clone(project), title: copyTitle };
    // 원래 id의 로컬 기록은 내 작업 그대로 두되 충돌 표시 (서버 최신본은 다시 열면 서버에서 받는다)
    await storage.put(recordKey(project.id) + ':conflict', { format: 1, project, remoteId: originalId, serverRevision: err.latestRevision, conflictAt: new Date().toISOString() }).catch(() => {});
    let copyId;
    try {
      const created = (await api.createProject(copyLocal)).project;
      copyId = created.id;
      meta = { remoteId: created.id, serverRevision: created.revision };
    } catch {
      copyId = 'p_local_' + randomSuffix();
      meta = { remoteId: null, serverRevision: null };
    }
    const copy = { ...copyLocal, id: copyId };
    const loaded = store.load(copy);
    if (!loaded.ok) { store.setSaveState('error'); return { ok: false, reason: 'conflict-copy-invalid' }; }
    dirty = true;
    o.onConflict?.({ originalId, serverRevision: err.latestRevision, copyId, copyTitle });
    // 사본 저장(로컬 + 가능하면 서버)을 한 번만 이어서 수행
    const r = await saveNow();
    return { ...r, conflict: true, copyId };
  }

  const onChange = ev => { if (ev?.type === 'changed') schedule(); };
  const onHidden = () => { if (!doc || doc.visibilityState === 'hidden') { if (dirty || timer) flush(); } };
  const onPageHide = () => { if (dirty || timer) flush(); };
  const onOnline = () => { if (dirty) { retries = 0; flush(); } };

  const unsubscribe = store.subscribe(onChange);
  doc?.addEventListener('visibilitychange', onHidden);
  events?.addEventListener('pagehide', onPageHide);
  events?.addEventListener('online', onOnline);
  ready = loadMeta();

  return {
    ready: () => ready,
    flush,
    /** 진행 중인 저장이 끝날 때까지 기다린다(새 저장을 시작하지 않음) */
    idle: () => chain,
    attachRemote,
    getMeta: () => ({ ...meta, dirty }),
    dispose() {
      disposed = true;
      if (timer) timers.clearTimeout(timer);
      unsubscribe();
      doc?.removeEventListener('visibilitychange', onHidden);
      events?.removeEventListener('pagehide', onPageHide);
      events?.removeEventListener('online', onOnline);
    },
  };
}

// ── 내보내기 / 가져오기 (버전 있는 JSON, 외부 코드 실행 없음) ──

export function exportProject(project) {
  return JSON.stringify({
    format: EXPORT_FORMAT, formatVersion: EXPORT_FORMAT_VERSION, contractVersion: CONTRACT_VERSION,
    exportedAt: new Date().toISOString(), project,
  }, null, 2);
}

/**
 * @param {string} text
 * @returns {{ok:true, project:object, diagnostics:object[]} | {ok:false, reason:string, diagnostics?:object[]}}
 */
export function importProject(text) {
  if (typeof text !== 'string') return { ok: false, reason: 'not-text' };
  if (text.length > MAX_IMPORT_CHARS) return { ok: false, reason: 'too-large' };
  let data;
  try { data = JSON.parse(text); } catch { return { ok: false, reason: 'not-json' }; }
  if (!data || data.format !== EXPORT_FORMAT) return { ok: false, reason: 'unknown-format' };
  if (data.formatVersion !== EXPORT_FORMAT_VERSION) return { ok: false, reason: 'unsupported-version' };
  const diagnostics = validateProject(data.project);
  if (diagnostics.some(d => d.severity === 'error')) return { ok: false, reason: 'invalid-project', diagnostics };
  // 가져온 작품은 새 로컬 작품이 된다(기존 작품 덮어쓰기 방지). 서버 id는 동기화 때 발급된다.
  const project = { ...clone(data.project), id: 'p_import_' + randomSuffix() };
  return { ok: true, project, diagnostics: validateProject(project) };
}
