'use strict';
// 저장 어댑터(fb) — 쭘 서버가 Firestore·Storage·맞춤 토큰에 닿는 유일한 길.
// 실제 구현은 lib/zzoom/gcp.js(서비스 계정 JWT + REST), 시험은 tests/zzoom/fakes/fake-fb.js.
//
// 문서 경로는 'zzoom_meetings/<mid>' · 'zzoom_meetings/<mid>/chat/<id>' 처럼 슬래시로 쓴다.
// 문서 값: null·불리언·숫자·문자열·배열·객체. 배열 안에 배열은 Firestore 가 받지 않으므로 쓰지 않는다.
//
// interface Fb {
//   get(path)                       → 데이터 | null
//   set(path, data)                 → 통째로 쓰기(없으면 만듦)
//   update(path, patch)             → 최상위 필드만 병합. 문서가 없으면 오류(code 'not_found')
//   delete(path)                    → 없어도 성공
//   list(collPath, {pageSize, pageToken}) → {docs:[{id,data}], next}   (id 순)
//   query(collPath, {where:[[필드, '=='|'<'|'<='|'>'|'>=', 값]], orderBy:[필드,'asc'|'desc'], limit}) → [{id,data}]
//   batch(ops)                      → ops: [{op:'set'|'update'|'delete', path, data}] (최대 500, 원자)
//   runTransaction(async tx => ...) → tx.get(path), tx.set/update/delete(path, data). 읽기를 쓰기보다 먼저.
//   storage.list(prefix, {pageToken, max}) → {items:[{name,size,contentType,timeCreated}], next}
//   storage.meta(name)              → {name,size,contentType,timeCreated} | null
//   storage.remove(name)            → 없어도 성공
//   storage.head(name, len)         → 파일 앞 len 바이트(Buffer) | null   (WebP 머리 확인, 지적02)
//   scoped(deadline)                → 같은 모양의 어댑터. deadline(ms 시각)이 지나면 진행 중 호출도 끊고 code 'deadline'(지적07)
//   createCustomToken(uid, claims)  → 문자열(Firebase 맞춤 토큰)
// }

// env FIREBASE_SERVICE_ACCOUNT(JSON 또는 base64 JSON)가 있을 때만 실제 구현을 처음 쓸 때 읽는다. 없으면 null.
function createFbFromEnv(env = process.env) {
    const raw = env.FIREBASE_SERVICE_ACCOUNT;
    if (!raw) return null;
    let impl = null;
    const load = () => {
        if (impl) return impl;
        let sa;
        try { sa = JSON.parse(raw.trim().startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8')); }
        catch { throw Object.assign(new Error('FIREBASE_SERVICE_ACCOUNT 를 읽을 수 없습니다.'), { status: 503, code: 'firebase_config' }); }
        const { createGcp } = require('./gcp');
        impl = createGcp({
            serviceAccount: sa,
            databaseId: env.ZZOOM_FIRESTORE_DB || 'kwon',
            bucket: env.FIREBASE_STORAGE_BUCKET || `${sa.project_id}.appspot.com`
        });
        return impl;
    };
    const call = name => (...a) => load()[name](...a);
    return {
        get: call('get'), set: call('set'), update: call('update'), delete: call('delete'),
        list: call('list'), query: call('query'), batch: call('batch'), runTransaction: call('runTransaction'),
        createCustomToken: call('createCustomToken'),
        scoped: d => load().scoped(d),
        storage: {
            list: (...a) => load().storage.list(...a),
            meta: (...a) => load().storage.meta(...a),
            remove: (...a) => load().storage.remove(...a),
            head: (...a) => load().storage.head(...a)
        }
    };
}

module.exports = { createFbFromEnv };
