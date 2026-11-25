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
// until = min(세션 만료, 지금+1시간): Firebase 로그인 상태는 브라우저에 오래 남으므로, 로그아웃·세션 만료 뒤에도
// 옛 claim 으로 창고를 쓰지 못하게 규칙이 until 을 본다(지적12). 화면은 until 이 지나면 새 출입증을 받는다.
const TOKEN_LIFE = 3600000;
function claimsFor(session, isCopy, now = Date.now()) {
    const cap = now + TOKEN_LIFE;
    const exp = Number(session && session.expiresAt);
    const until = Number.isFinite(exp) && exp > 0 ? Math.min(exp, cap) : cap;
    if (isCopy) return { uid: 'baekam-copy', claims: { cp: 1, until } };
    return { uid: session && session.role === 'admin' ? 'baekam-admin' : 'baekam-user', claims: { ba: 1, until } };
}

// 급식일지(/bap) 세션 → Firestore 출입증. claim 은 학교(bp)·역할(br: m 담당자 / b 결재자)과 until.
// firestore.rules 의 bap*_journals·bap*_menus 쓰기가 이 claim 을 본다. ba/cp 는 넣지 않는다(창고·codocs 와 분리).
// until = min(세션 만료, 지금+1시간)(AL01): 세션 만료는 만든 시각 + 세션 수명(server.js BAP_SESSION_TTL, 30일).
// 세션이 끝났거나 로그아웃한 뒤에도 Firebase 로그인이 남아 있을 수 있으므로 규칙이 until 을 본다.
const BAP_SCHOOLS = new Set(['bap', 'bap2', 'bap3']);
const BAP_SESSION_LIFE = 30 * 86400000;
function bapClaimsFor(sess, now = Date.now(), sessionLifeMs = BAP_SESSION_LIFE) {
    if (!sess || !BAP_SCHOOLS.has(sess.school || 'bap')) return null;
    const school = sess.school || 'bap';
    const br = sess.role === 'boss' ? 'b' : sess.role === 'manager' ? 'm' : null;
    if (!br) return null;
    const cap = now + TOKEN_LIFE;
    const created = Number(sess.createdAt);
    const exp = Number.isFinite(Number(sess.expiresAt)) && Number(sess.expiresAt) > 0 ? Number(sess.expiresAt)
        : Number.isFinite(created) && created > 0 ? created + sessionLifeMs : cap;
    if (exp <= now) return null;
    return { uid: `bap-${school}-${br}`, claims: { bp: school, br, until: Math.min(exp, cap) } };
}

// bapAuth 뒤에 붙인다(req.bapSession·req.bapSchool 이 채워져 있어야 함).
function makeBapHandler({ env = process.env, sessionLifeMs = BAP_SESSION_LIFE } = {}) {
    return (req, res) => {
        const sa = loadServiceAccount(env);
        if (!sa) return res.status(503).json({ error: 'storage-token-unconfigured' });
        const sess = Object.assign({}, req.bapSession, { school: req.bapSchool || (req.bapSession && req.bapSession.school) });
        const c = bapClaimsFor(sess, Date.now(), sessionLifeMs);
        if (!c) return res.status(sess && (sess.role === 'boss' || sess.role === 'manager') ? 401 : 403)
            .json({ error: sess && (sess.role === 'boss' || sess.role === 'manager') ? 'bap-session-expired' : 'bap-role-unknown' });
        try {
            res.set('Cache-Control', 'no-store');
            res.json({ token: signCustomToken(sa, c.uid, c.claims) });
        } catch (e) {
            res.status(500).json({ error: 'storage-token-failed' });
        }
    };
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

module.exports = { loadServiceAccount, signCustomToken, claimsFor, makeHandler, bapClaimsFor, makeBapHandler, CUSTOM_AUD };
