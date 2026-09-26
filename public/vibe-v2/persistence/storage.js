// 로컬 저장 어댑터 — IndexedDB(브라우저)와 메모리(테스트·IndexedDB 없는 환경)가 같은 모양이다.
// 인터페이스: get(key) → value|null, put(key, value), del(key), keys() → string[]  (모두 Promise)

/**
 * @param {{ quotaBytes?: number }} [opts]  quotaBytes를 넘기면 QuotaExceededError를 던진다(용량 부족 재현용)
 */
export function createMemoryStorage(opts = {}) {
  const data = new Map();
  const size = () => [...data.values()].reduce((n, v) => n + v.length, 0);
  return {
    kind: 'memory',
    async get(key) { const v = data.get(key); return v === undefined ? null : JSON.parse(v); },
    async put(key, value) {
      const s = JSON.stringify(value);
      if (opts.quotaBytes !== undefined && size() - (data.get(key)?.length || 0) + s.length > opts.quotaBytes) {
        const e = new Error('storage quota exceeded'); e.name = 'QuotaExceededError'; throw e;
      }
      data.set(key, s);
    },
    async del(key) { data.delete(key); },
    async keys() { return [...data.keys()]; },
  };
}

/**
 * @param {{ indexedDB?: IDBFactory, dbName?: string, storeName?: string }} [opts]
 */
export function createIndexedDbStorage(opts = {}) {
  const idb = opts.indexedDB || globalThis.indexedDB;
  if (!idb) throw new Error('IndexedDB unavailable');
  const dbName = opts.dbName || 'airoom-vibe2';
  const storeName = opts.storeName || 'projects';
  let dbp = null;
  const open = () => (dbp ||= new Promise((resolve, reject) => {
    const req = idb.open(dbName, 1);
    req.onupgradeneeded = () => { if (!req.result.objectStoreNames.contains(storeName)) req.result.createObjectStore(storeName); };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => { dbp = null; reject(req.error); };
    req.onblocked = () => { dbp = null; reject(new Error('IndexedDB blocked')); };
  }));
  const run = async (mode, fn) => {
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, mode);
      const st = tx.objectStore(storeName);
      let result;
      const req = fn(st);
      if (req) req.onsuccess = () => { result = req.result; };
      tx.oncomplete = () => resolve(result);
      tx.onerror = () => reject(tx.error || req?.error);
      tx.onabort = () => reject(tx.error || new Error('transaction aborted'));
    });
  };
  return {
    kind: 'indexeddb',
    async get(key) { const v = await run('readonly', st => st.get(key)); return v === undefined ? null : v; },
    async put(key, value) { await run('readwrite', st => st.put(value, key)); },
    async del(key) { await run('readwrite', st => st.delete(key)); },
    async keys() { return (await run('readonly', st => st.getAllKeys())).map(String); },
  };
}

/** 가능한 가장 좋은 저장소. IndexedDB가 없으면 메모리(새로고침 시 사라짐 — kind로 구분 가능) */
export function defaultStorage() {
  try { if (globalThis.indexedDB) return createIndexedDbStorage(); } catch { /* 사용 불가 */ }
  return createMemoryStorage();
}
