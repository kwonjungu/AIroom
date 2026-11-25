'use strict';
// 백암이 로그인 → Firebase Storage 출입증(맞춤 토큰).
// storage.rules 는 이 토큰의 claim 만 본다: ba==1(실서비스, 쭘 밖 모든 경로) / cp==1(시연용 카피본, copy/ 아래만).
// 키: env FIREBASE_SERVICE_ACCOUNT(서비스 계정 JSON, 쭘과 같은 값). 없으면 503 → 화면은 예전처럼 비로그인으로 동작.
const crypto = require('node:crypto');

const CUSTOM_AUD = 'https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit';
const b64u = v => Buffer.from(v).toString('base64url');

function loadServiceAccount(env = process.env) {
    const raw = env.FIREBASE_SERVICE_ACCOUNT;
    if (!raw) return null;
    try {
        const sa = JSON.parse(raw.trim().startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8'));
        if (!sa.client_email || !sa.private_key) return null;
        sa.private_key = sa.private_key.replace(/\\n/g, '\n');
        return sa;
    } catch (e) { return null; }
}

// Firebase 맞춤 토큰(RS256, 최대 1시간). 클라이언트가 signInWithCustomToken 으로 바꿔 쓴다.
function signCustomToken(sa, uid, claims, nowSec = Math.floor(Date.now() / 1000)) {
    const payload = { iss: sa.client_email, sub: sa.client_email, aud: CUSTOM_AUD, iat: nowSec, exp: nowSec + 3600, uid, claims };
    const head = b64u(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
    const body = b64u(JSON.stringify(payload));
    const sig = crypto.sign('RSA-SHA256', Buffer.from(`${head}.${body}`), sa.private_key);
    return `${head}.${body}.${b64u(sig)}`;
}

// 세션 → (uid, claims). 공유 접근 코드라 사람별 구분은 없고 역할만 나눈다.
function claimsFor(session, isCopy) {
    if (isCopy) return { uid: 'baekam-copy', claims: { cp: 1 } };
    return { uid: session && session.role === 'admin' ? 'baekam-admin' : 'baekam-user', claims: { ba: 1 } };
}

function makeHandler({ isCopy, env = process.env }) {
    return (req, res) => {
        const sa = loadServiceAccount(env);
        if (!sa) return res.status(503).json({ error: 'storage-token-unconfigured' });
        const { uid, claims } = claimsFor(req.session, isCopy());
        try {
            res.set('Cache-Control', 'no-store');
            res.json({ token: signCustomToken(sa, uid, claims) });
        } catch (e) {
            res.status(500).json({ error: 'storage-token-failed' });
        }
    };
}

module.exports = { loadServiceAccount, signCustomToken, claimsFor, makeHandler, CUSTOM_AUD };
