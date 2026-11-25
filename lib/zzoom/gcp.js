'use strict';
// fb 어댑터 실제 구현: firebase-admin 없이 서비스 계정 JWT 서명 + Firestore·Storage REST.
// (firebase-admin 14.5.1 은 의존 포함 61.4MB·파일 4,399개·첫 로드 1.4초라 가볍게 직접 구현했다 — reports/S.md)
const crypto = require('node:crypto');

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const SCOPES = 'https://www.googleapis.com/auth/datastore https://www.googleapis.com/auth/devstorage.read_write';
const CUSTOM_AUD = 'https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit';
// 맞춤 토큰 claim 으로 쓸 수 없는 이름
const RESERVED = new Set(['acr', 'amr', 'at_hash', 'aud', 'auth_time', 'azp', 'cnf', 'c_hash', 'exp', 'iat', 'iss', 'jti', 'nbf', 'nonce', 'firebase']);

const b64u = b => Buffer.from(b).toString('base64url');
function signJwt(payload, privateKey) {
    const head = b64u(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
    const body = b64u(JSON.stringify(payload));
    const sig = crypto.sign('RSA-SHA256', Buffer.from(`${head}.${body}`), privateKey);
    return `${head}.${body}.${b64u(sig)}`;
}

// ---- Firestore 값 변환 ----
function enc(v) {
    if (v === null || v === undefined) return { nullValue: null };
    if (typeof v === 'boolean') return { booleanValue: v };
    if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
    if (typeof v === 'string') return { stringValue: v };
    if (Array.isArray(v)) return { arrayValue: v.length ? { values: v.map(enc) } : {} };
    if (typeof v === 'object') return { mapValue: { fields: encFields(v) } };
    throw new Error('지원하지 않는 값: ' + typeof v);
}
function encFields(o) { const f = {}; for (const [k, v] of Object.entries(o)) if (v !== undefined) f[k] = enc(v); return f; }
function dec(v) {
    if ('nullValue' in v) return null;
    if ('booleanValue' in v) return v.booleanValue;
    if ('integerValue' in v) return Number(v.integerValue);
    if ('doubleValue' in v) return Number(v.doubleValue);
    if ('stringValue' in v) return v.stringValue;
    if ('timestampValue' in v) return Date.parse(v.timestampValue);
    if ('arrayValue' in v) return (v.arrayValue.values || []).map(dec);
    if ('mapValue' in v) return decFields(v.mapValue.fields || {});
    return null;
}
function decFields(f) { const o = {}; for (const [k, v] of Object.entries(f || {})) o[k] = dec(v); return o; }
const OPS = { '==': 'EQUAL', '<': 'LESS_THAN', '<=': 'LESS_THAN_OR_EQUAL', '>': 'GREATER_THAN', '>=': 'GREATER_THAN_OR_EQUAL' };

function createGcp({ serviceAccount: sa, databaseId = 'kwon', bucket, fetchImpl = fetch, now = Date.now }) {
    if (!sa?.client_email || !sa?.private_key || !sa?.project_id) throw Object.assign(new Error('서비스 계정 JSON 에 client_email·private_key·project_id 가 필요합니다.'), { status: 503, code: 'firebase_config' });
    const root = `projects/${sa.project_id}/databases/${databaseId}/documents`;
    const FS = `https://firestore.googleapis.com/v1/${root}`;
    const GCS = `https://storage.googleapis.com/storage/v1/b/${encodeURIComponent(bucket)}/o`;
    let cached = null;

    async function accessToken() {
        if (cached && cached.exp > now() + 60000) return cached.token;
        const iat = Math.floor(now() / 1000);
        const assertion = signJwt({ iss: sa.client_email, scope: SCOPES, aud: TOKEN_URL, iat, exp: iat + 3600 }, sa.private_key);
        const r = await fetchImpl(TOKEN_URL, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }), signal: AbortSignal.timeout(15000) });
        const j = await r.json().catch(() => ({}));
        if (!r.ok || !j.access_token) throw Object.assign(new Error('Google 서비스 계정 토큰 발급 실패: ' + (j.error_description || j.error || r.status)), { status: 503, code: 'firebase_auth' });
        cached = { token: j.access_token, exp: now() + (j.expires_in || 3600) * 1000 };
        return cached.token;
    }
    // 시간 상한(deadline)이 있으면 남은 시간이 지나면 진행 중 호출도 끊는다(지적07). 기본은 호출당 20초.
    // 끊기 타이머(AbortSignal.timeout 은 unref 라 기다리는 동안 프로세스가 먼저 끝날 수 있어 직접 만든다)
    const timer = ms => { const ac = new AbortController(); const id = setTimeout(() => ac.abort(new Error('timeout')), Math.max(1, ms)); return { signal: ac.signal, clear: () => clearTimeout(id) }; };
    const deadlineError = () => Object.assign(new Error('Google API 시간 상한을 넘었습니다.'), { status: 503, code: 'deadline' });
    async function call(method, url, body, okStatuses = [], deadline = Infinity) {
        const left = deadline - now();
        if (left <= 0) throw deadlineError();
        const headers = { Authorization: 'Bearer ' + await accessToken() };
        if (body !== undefined) headers['Content-Type'] = 'application/json';
        const limited = left < 20000;
        let r;
        const t = timer(Math.min(20000, left));
        try { r = await fetchImpl(url, { method, headers, body: body === undefined ? undefined : JSON.stringify(body), signal: t.signal }); }
        catch (e) {
            if (limited || deadline - now() <= 0) throw deadlineError();
            throw Object.assign(new Error('Google API 연결 실패: ' + (e?.message || e)), { status: 503, code: 'unavailable' });
        } finally { t.clear(); }
        if (okStatuses.includes(r.status)) return { status: r.status, json: null };
        const text = await r.text();
        let json = {};
        try { json = text ? JSON.parse(text) : {}; } catch { json = {}; }
        if (!r.ok) {
            const st = json?.error?.status || '';
            const e = new Error(`Google API ${method} ${r.status} ${json?.error?.message || ''}`.trim());
            // 404 없음 · 409/ABORTED 충돌(재시도) · 429/503/UNAVAILABLE 일시 장애(503) · 그 밖 502
            e.status = r.status === 404 ? 404 : r.status === 409 || st === 'ABORTED' ? 409
                : (r.status === 429 || r.status === 503 || st === 'UNAVAILABLE' || st === 'RESOURCE_EXHAUSTED') ? 503 : 502;
            e.code = r.status === 404 || st === 'NOT_FOUND' ? 'not_found' : st === 'ABORTED' ? 'aborted' : st === 'ALREADY_EXISTS' ? 'exists'
                : e.status === 503 ? 'unavailable' : 'gcp_error';
            throw e;
        }
        return { status: r.status, json };
    }
    function build(deadline) {
        const C = (m, u, b, ok = []) => call(m, u, b, ok, deadline);
        const docUrl = p => `${FS}/${p.split('/').map(encodeURIComponent).join('/')}`;
        const name = p => `${root}/${p}`;
        const idOf = n => n.slice(n.lastIndexOf('/') + 1);
        function writeOf(o) {
            if (o.op === 'delete') return { delete: name(o.path) };
            const w = { update: { name: name(o.path), fields: encFields(o.data) } };
            if (o.op === 'update') { w.updateMask = { fieldPaths: Object.keys(o.data) }; w.currentDocument = { exists: true }; }
            return w;
        }

        async function get(p, transaction) {
            try {
                const { json } = await C('GET', docUrl(p) + (transaction ? `?transaction=${encodeURIComponent(transaction)}` : ''));
                return decFields(json.fields);
            } catch (e) { if (e.code === 'not_found') return null; throw e; }
        }
        async function batch(ops) {
            if (!ops.length) return;
            if (ops.length > 500) throw new Error('batch 는 500개까지');
            await C('POST', `${FS}:commit`, { writes: ops.map(writeOf) });
        }
        async function query(coll, { where = [], orderBy, limit } = {}) {
            const cut = coll.lastIndexOf('/');
            const parent = cut < 0 ? FS : `${FS}/${coll.slice(0, cut).split('/').map(encodeURIComponent).join('/')}`;
            const sq = { from: [{ collectionId: coll.slice(cut + 1) }] };
            const filters = where.map(([field, op, value]) => ({ fieldFilter: { field: { fieldPath: field }, op: OPS[op], value: enc(value) } }));
            if (filters.length === 1) sq.where = filters[0];
            else if (filters.length > 1) sq.where = { compositeFilter: { op: 'AND', filters } };
            if (orderBy) sq.orderBy = [{ field: { fieldPath: orderBy[0] }, direction: orderBy[1] === 'desc' ? 'DESCENDING' : 'ASCENDING' }];
            if (limit) sq.limit = limit;
            const { json } = await C('POST', `${parent}:runQuery`, { structuredQuery: sq });
            return (json || []).filter(x => x.document).map(x => ({ id: idOf(x.document.name), data: decFields(x.document.fields) }));
        }

        return {
            scoped: d => build(Math.min(deadline, d)),
            get: p => get(p),
            set: (p, data) => batch([{ op: 'set', path: p, data }]),
            update: (p, data) => batch([{ op: 'update', path: p, data }]),
            delete: p => batch([{ op: 'delete', path: p }]),
            batch,
            query,
            async list(coll, { pageSize = 300, pageToken } = {}) {
                const q = new URLSearchParams({ pageSize: String(pageSize) });
                if (pageToken) q.set('pageToken', pageToken);
                const { json } = await C('GET', `${docUrl(coll)}?${q}`);
                return { docs: (json.documents || []).map(d => ({ id: idOf(d.name), data: decFields(d.fields) })), next: json.nextPageToken || null };
            },
            async runTransaction(fn) {
                for (let attempt = 0; ; attempt++) {
                    const { json } = await C('POST', `${FS}:beginTransaction`, {});
                    const t = json.transaction, writes = [];
                    const tx = {
                        get: p => get(p, t),
                        set: (p, data) => writes.push({ op: 'set', path: p, data }),
                        update: (p, data) => writes.push({ op: 'update', path: p, data }),
                        delete: p => writes.push({ op: 'delete', path: p })
                    };
                    let out;
                    try { out = await fn(tx); }
                    catch (e) {
                        await C('POST', `${FS}:rollback`, { transaction: t }).catch(() => {});
                        // 트랜잭션 안 읽기가 잠금 충돌(ABORTED)이면 처음부터 다시(지적14). 업무 오류는 그대로 올린다.
                        if (e.code === 'aborted' && attempt < 4) { await new Promise(r => setTimeout(r, 30 * (attempt + 1))); continue; }
                        throw e;
                    }
                    try { await C('POST', `${FS}:commit`, { writes: writes.map(writeOf), transaction: t }); return out; }
                    catch (e) { if (e.code !== 'aborted' || attempt >= 4) throw e; }
                }
            },
            storage: {
                async list(prefix, { pageToken, max = 500 } = {}) {
                    const q = new URLSearchParams({ prefix, maxResults: String(max), fields: 'items(name,size,contentType,timeCreated),nextPageToken' });
                    if (pageToken) q.set('pageToken', pageToken);
                    const { json } = await C('GET', `${GCS}?${q}`);
                    return { items: (json.items || []).map(i => ({ name: i.name, size: Number(i.size), contentType: i.contentType || '', timeCreated: Date.parse(i.timeCreated) })), next: json.nextPageToken || null };
                },
                async meta(n) {
                    try { const { json: i } = await C('GET', `${GCS}/${encodeURIComponent(n)}?fields=name,size,contentType,timeCreated`); return { name: i.name, size: Number(i.size), contentType: i.contentType || '', timeCreated: Date.parse(i.timeCreated) }; }
                    catch (e) { if (e.code === 'not_found') return null; throw e; }
                },
                async remove(n) { await C('DELETE', `${GCS}/${encodeURIComponent(n)}`, undefined, [404]); },
                // 파일 앞 len 바이트(WebP 머리 확인용, 지적02). 없으면 null
                async head(n, len = 30) {
                    const left = deadline - now();
                    if (left <= 0) throw deadlineError();
                    const t = timer(Math.min(20000, left));
                    const r = await fetchImpl(`${GCS}/${encodeURIComponent(n)}?alt=media`, { headers: { Authorization: 'Bearer ' + await accessToken(), Range: `bytes=0-${len - 1}` }, signal: t.signal })
                        .catch(e => { throw Object.assign(new Error('Google API 연결 실패: ' + (e?.message || e)), { status: 503, code: 'unavailable' }); })
                        .finally(() => t.clear());
                    if (r.status === 404) return null;
                    if (!r.ok) throw Object.assign(new Error(`Google API GET ${r.status} (파일 머리)`), { status: r.status === 503 || r.status === 429 ? 503 : 502, code: 'gcp_error' });
                    return Buffer.from(await r.arrayBuffer()).subarray(0, len);
                }
            },
            async createCustomToken(uid, claims = {}) {
                for (const k of Object.keys(claims)) if (RESERVED.has(k)) throw new Error('예약된 claim: ' + k);
                const iat = Math.floor(now() / 1000);
                return signJwt({ iss: sa.client_email, sub: sa.client_email, aud: CUSTOM_AUD, iat, exp: iat + 3600, uid, claims }, sa.private_key);
            }
        };
    }
    return build(Infinity);
}

module.exports = { createGcp, signJwt, enc, dec, encFields, decFields };
