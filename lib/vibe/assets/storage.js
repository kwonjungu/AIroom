// 생성 에셋 저장소 추상화.
//
// 인터페이스 (전부 async):
//   put(bytes, meta)        → {assetId, sha256, url, bytes}   내용 주소(sha256) — 같은 바이트는 같은 assetId(중복 저장 없음)
//   get(assetId)            → {bytes, meta} | null
//   head(assetId)           → meta | null
//   setApproval(assetId, a) → meta | null     a = 'quarantine' | 'approved' | 'rejected'
// meta: {mime, width, height, kind, provider, model, promptVersion, styleVersion, license, provenance, approval, derivativeOf?, size?, createdAt}
//
// 구현: 메모리(테스트) · 로컬 파일(단일 서버 개발용).
// ⚠ Vercel 서버리스에서는 로컬 파일이 인스턴스 간 공유·보존되지 않는다. 운영에는 Object Storage/CDN 어댑터가 필요하며
//    createObjectStorage()는 인터페이스만 있다(미연결).

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export const ASSET_ID = /^ga_[a-f0-9]{32}$/;
export const APPROVALS = ['quarantine', 'approved', 'rejected'];
export const DEFAULT_URL_BASE = '/api/vibe/assets/files/';

const sha = b => crypto.createHash('sha256').update(b).digest('hex');
// 같은 바이트가 격리 원본으로 먼저 저장됐다가 검사 통과 후 결과물로 다시 들어오면(후처리 결과가 원본과 동일) 승인 메타로 올린다.
const promote = (prev, next) => next.approval === 'approved' && prev.approval !== 'approved';
const idOf = h => 'ga_' + h.slice(0, 32);

function checkMeta(meta) {
  if (!meta || typeof meta !== 'object') throw new Error('storage.put: meta required');
  if (!APPROVALS.includes(meta.approval || 'quarantine')) throw new Error('storage.put: bad approval');
}

export function createMemoryStorage({ urlBase = DEFAULT_URL_BASE, now = Date.now } = {}) {
  const items = new Map();
  return {
    kind: 'memory',
    async put(bytes, meta) {
      checkMeta(meta);
      const h = sha(bytes);
      const assetId = idOf(h);
      const fresh = { approval: 'quarantine', ...meta, sha256: h, bytes: bytes.length, createdAt: new Date(now()).toISOString() };
      const it = items.get(assetId);
      if (!it) items.set(assetId, { bytes: new Uint8Array(bytes), meta: fresh });
      else if (promote(it.meta, fresh)) it.meta = fresh;
      return { assetId, sha256: h, url: urlBase + assetId, bytes: bytes.length };
    },
    async get(assetId) { const it = ASSET_ID.test(assetId) ? items.get(assetId) : null; return it ? { bytes: it.bytes, meta: { ...it.meta } } : null; },
    async head(assetId) { const it = ASSET_ID.test(assetId) ? items.get(assetId) : null; return it ? { ...it.meta } : null; },
    async setApproval(assetId, approval) {
      if (!APPROVALS.includes(approval)) throw new Error('bad approval');
      const it = items.get(assetId); if (!it) return null;
      it.meta.approval = approval;
      return { ...it.meta };
    },
    _size() { return items.size; },
    /** 테스트 전용 */
    _metas() { return [...items.values()].map(it => ({ ...it.meta })); },
  };
}

/** @param {{ dir: string, urlBase?: string, now?: () => number }} o */
export function createLocalFileStorage({ dir, urlBase = DEFAULT_URL_BASE, now = Date.now }) {
  if (!dir) throw new Error('createLocalFileStorage: dir required');
  fs.mkdirSync(dir, { recursive: true });
  const bin = id => path.join(dir, id + '.bin');
  const js = id => path.join(dir, id + '.json');
  const readMeta = id => { try { return JSON.parse(fs.readFileSync(js(id), 'utf8')); } catch { return null; } };
  return {
    kind: 'file',
    async put(bytes, meta) {
      checkMeta(meta);
      const h = sha(bytes);
      const assetId = idOf(h);
      const fresh = { approval: 'quarantine', ...meta, sha256: h, bytes: bytes.length, createdAt: new Date(now()).toISOString() };
      const prev = readMeta(assetId);
      if (!prev) {
        fs.writeFileSync(bin(assetId), bytes);
        fs.writeFileSync(js(assetId), JSON.stringify(fresh));
      } else if (promote(prev, fresh)) fs.writeFileSync(js(assetId), JSON.stringify(fresh));
      return { assetId, sha256: h, url: urlBase + assetId, bytes: bytes.length };
    },
    async get(assetId) {
      if (!ASSET_ID.test(assetId)) return null;
      const meta = readMeta(assetId); if (!meta) return null;
      return { bytes: new Uint8Array(fs.readFileSync(bin(assetId))), meta };
    },
    async head(assetId) { return ASSET_ID.test(assetId) ? readMeta(assetId) : null; },
    async setApproval(assetId, approval) {
      if (!APPROVALS.includes(approval) || !ASSET_ID.test(assetId)) throw new Error('bad approval');
      const meta = readMeta(assetId); if (!meta) return null;
      meta.approval = approval;
      fs.writeFileSync(js(assetId), JSON.stringify(meta));
      return meta;
    },
  };
}

/**
 * Object Storage/CDN 어댑터 자리 — 미연결. 서명 업로드·다운로드 URL을 쓰는 구현을 넣을 곳.
 * 호출하면 오류를 던져 조용히 로컬에 저장되는 일을 막는다.
 */
export function createObjectStorage() {
  const nc = async () => { throw Object.assign(new Error('object storage not connected'), { code: 'STORAGE_NOT_CONNECTED' }); };
  return { kind: 'object-storage(unconnected)', put: nc, get: nc, head: nc, setApproval: nc };
}
