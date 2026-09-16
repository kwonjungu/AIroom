'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const config = require('./config');
const { assert } = require('./domain');

function createGoogleAuth({ redis, directory, env = process.env, fetchImpl = fetch }) {
    const file = path.join(directory, 'google-credentials.enc');
    const ready = () => !!(env.RECRUITMENT_GOOGLE_CLIENT_ID && env.RECRUITMENT_GOOGLE_CLIENT_SECRET && env.RECRUITMENT_GOOGLE_REDIRECT_URI && /^[a-f0-9]{64}$/i.test(env.RECRUITMENT_TOKEN_KEY || ''));
    function key() { assert(ready(), 'Google OAuth 설정이 필요합니다. docs/RECRUITMENT_GOOGLE_SETUP.md를 확인하세요.', 503); return Buffer.from(env.RECRUITMENT_TOKEN_KEY, 'hex'); }
    function encrypt(data) { const iv = crypto.randomBytes(12), cipher = crypto.createCipheriv('aes-256-gcm', key(), iv); const body = Buffer.concat([cipher.update(JSON.stringify(data), 'utf8'), cipher.final()]); return Buffer.concat([iv, cipher.getAuthTag(), body]).toString('base64url'); }
    function decrypt(data) { const b = Buffer.from(data, 'base64url'); assert(b.length >= 29, '인증 데이터가 올바르지 않습니다.', 401); const decipher = crypto.createDecipheriv('aes-256-gcm', key(), b.subarray(0, 12)); decipher.setAuthTag(b.subarray(12, 28)); return JSON.parse(Buffer.concat([decipher.update(b.subarray(28)), decipher.final()]).toString('utf8')); }
    async function read() { const raw = redis ? await redis.get('recruitment:google-credentials') : await fs.readFile(file, 'utf8').catch(e => { if (e.code === 'ENOENT') return null; throw e; }); return raw ? decrypt(raw) : null; }
    async function write(data) { const raw = encrypt(data); if (redis) await redis.set('recruitment:google-credentials', raw); else { assert(!env.VERCEL, '서버리스 환경에서는 Redis 연결이 필요합니다.', 503); await fs.mkdir(directory, { recursive: true }); const tmp = file + '.' + crypto.randomUUID() + '.tmp'; await fs.writeFile(tmp, raw, { mode: 0o600 }); await fs.rename(tmp, file); } }
    function cookie(res, value, maxAge) { const url = new URL(env.RECRUITMENT_GOOGLE_REDIRECT_URI); res.set('Set-Cookie', `recruitment_oauth=${value}; HttpOnly; SameSite=Lax; Path=/api/recruitments/google; Max-Age=${maxAge}${url.protocol === 'https:' ? '; Secure' : ''}`); }
    async function tokenRequest(values) {
        const response = await fetchImpl('https://oauth2.googleapis.com/token', { method: 'POST', signal: AbortSignal.timeout(20000), headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ client_id: env.RECRUITMENT_GOOGLE_CLIENT_ID, client_secret: env.RECRUITMENT_GOOGLE_CLIENT_SECRET, ...values }) });
        assert(response.ok, 'Google 토큰 발급에 실패했습니다. 다시 연결하세요.', 502); return response.json();
    }
    return {
        ready,
        async status() { if (!ready()) return { configured: false, connected: false }; const credentials = await read(); return { configured: true, connected: !!credentials?.refresh_token, email: credentials?.email || null }; },
        start(res) {
            key(); const redirect = new URL(env.RECRUITMENT_GOOGLE_REDIRECT_URI);
            assert(redirect.protocol === 'https:' || (redirect.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(redirect.hostname)), 'OAuth 콜백 주소는 HTTPS 또는 로컬호스트여야 합니다.', 503);
            const state = crypto.randomBytes(32).toString('hex'); cookie(res, encrypt({ state, expires: Date.now() + 10 * 60000 }), 600);
            // Existing templates/folder are preconfigured by ID. drive.file alone cannot access
            // these until selected in Google Picker. Single-operator testing uses drive scope.
            const params = new URLSearchParams({ client_id: env.RECRUITMENT_GOOGLE_CLIENT_ID, redirect_uri: env.RECRUITMENT_GOOGLE_REDIRECT_URI, response_type: 'code', scope: 'https://www.googleapis.com/auth/drive', access_type: 'offline', prompt: 'consent', login_hint: config.operatorEmail, state });
            return 'https://accounts.google.com/o/oauth2/v2/auth?' + params;
        },
        async callback(req, res) {
            key(); const value = (req.headers.cookie || '').split(';').map(s => s.trim()).find(s => s.startsWith('recruitment_oauth='))?.slice('recruitment_oauth='.length);
            assert(value, '인증 요청이 만료됐습니다. 연결 버튼부터 다시 시작하세요.', 401);
            let session; try { session = decrypt(value); } catch { assert(false, '인증 상태가 유효하지 않습니다.', 401); }
            const state = typeof req.query.state === 'string' ? req.query.state : '';
            assert(/^[a-f0-9]{64}$/.test(state) && session.expires > Date.now() && crypto.timingSafeEqual(Buffer.from(state), Buffer.from(session.state)), '인증 요청이 만료되었거나 일치하지 않습니다.', 401);
            cookie(res, '', 0); assert(!req.query.error && typeof req.query.code === 'string', 'Google 연결 승인이 취소되었습니다.');
            const credentials = await tokenRequest({ code: req.query.code, grant_type: 'authorization_code', redirect_uri: env.RECRUITMENT_GOOGLE_REDIRECT_URI });
            assert(credentials.access_token && credentials.refresh_token, '오프라인 연결 권한이 필요합니다. 다시 승인하세요.', 400);
            const aboutResponse = await fetchImpl('https://www.googleapis.com/drive/v3/about?fields=user(emailAddress)', { headers: { Authorization: `Bearer ${credentials.access_token}` }, signal: AbortSignal.timeout(20000) });
            assert(aboutResponse.ok, 'Drive API를 활성화하고 다시 연결하세요.', 502); const about = await aboutResponse.json();
            assert(about.user?.emailAddress?.toLowerCase() === config.operatorEmail, '지정 운영 계정으로만 연결할 수 있습니다.', 403);
            await write({ ...credentials, email: about.user.emailAddress, expires_at: Date.now() + credentials.expires_in * 1000 });
        },
        async getAccessToken() {
            const credentials = await read(); assert(credentials?.refresh_token, '운영 계정 Google 연결이 필요합니다.', 503);
            if (credentials.expires_at > Date.now() + 60000) return credentials.access_token;
            const refreshed = await tokenRequest({ refresh_token: credentials.refresh_token, grant_type: 'refresh_token' });
            await write({ ...credentials, ...refreshed, expires_at: Date.now() + refreshed.expires_in * 1000 }); return refreshed.access_token;
        }
    };
}
module.exports = { createGoogleAuth };
