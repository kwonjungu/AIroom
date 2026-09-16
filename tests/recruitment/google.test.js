'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { createGoogleAuth } = require('../../lib/recruitment/google-auth');
const { GoogleWorkspaceClient } = require('../../lib/recruitment/providers/google');
const config = require('../../lib/recruitment/config');

test('OAuth state, operator account, encrypted persistence and token refresh', async t => {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'recruitment-oauth-')); t.after(() => fs.rm(directory, { recursive: true, force: true }));
    const env = { RECRUITMENT_GOOGLE_CLIENT_ID: 'test-client', RECRUITMENT_GOOGLE_CLIENT_SECRET: 'test-secret', RECRUITMENT_GOOGLE_REDIRECT_URI: 'http://localhost:3100/api/recruitments/google/callback', RECRUITMENT_TOKEN_KEY: crypto.randomBytes(32).toString('hex') };
    let exchange = 0;
    const fetchImpl = async (url, options) => {
        if (url.includes('oauth2.googleapis.com')) { exchange++; const refresh = options.body.get('grant_type') === 'refresh_token'; return Response.json({ access_token: refresh ? 'refreshed-access' : 'first-access', ...(refresh ? {} : { refresh_token: 'private-refresh' }), expires_in: refresh ? 3600 : 0 }); }
        return Response.json({ user: { emailAddress: config.operatorEmail } });
    };
    const auth = createGoogleAuth({ directory, env, fetchImpl }); let cookie;
    const res = { set(name, value) { if (name === 'Set-Cookie') cookie = value; } };
    const url = new URL(auth.start(res)), originalCookie = cookie; assert.equal(url.searchParams.get('login_hint'), config.operatorEmail); assert.match(cookie, /HttpOnly/); assert.match(cookie, /SameSite=Lax/);
    await assert.rejects(auth.callback({ headers: { cookie: originalCookie }, query: { state: '0'.repeat(64), code: 'code' } }, res), /일치/); assert.equal(exchange, 0);
    await auth.callback({ headers: { cookie: originalCookie }, query: { state: url.searchParams.get('state'), code: 'code' } }, res);
    assert.match(cookie, /Max-Age=0/); const stored = await fs.readFile(path.join(directory, 'google-credentials.enc'), 'utf8'); assert.ok(!stored.includes('private-refresh')); assert.ok(!stored.includes('first-access'));
    assert.equal((await auth.status()).email, config.operatorEmail); assert.equal(await auth.getAccessToken(), 'refreshed-access'); assert.equal(exchange, 2); assert.equal(await auth.getAccessToken(), 'refreshed-access'); assert.equal(exchange, 2);
});
test('Google connection check rejects wrong operator and public folder without writing', async () => {
    let account = 'other@example.com'; let publicFolder = true; const methods = [];
    const client = new GoogleWorkspaceClient({ getAccessToken: async () => 'not-a-real-token', fetchImpl: async (url, options) => { methods.push(options.method || 'GET'); return Response.json(url.includes('about?') ? { user: { emailAddress: account } } : { id: config.folderId, name: '폴더', mimeType: 'application/vnd.google-apps.folder', capabilities: { canAddChildren: true }, permissions: publicFolder ? [{ type: 'anyone', role: 'reader' }] : [{ type: 'user', role: 'owner' }] }); } });
    await assert.rejects(client.checkConnection(), /운영 계정/); account = config.operatorEmail; await assert.rejects(client.checkConnection(), /공개/); publicFolder = false; assert.equal((await client.checkConnection()).email, config.operatorEmail); assert.ok(methods.every(v => v === 'GET'));
});
