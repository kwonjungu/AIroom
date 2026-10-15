'use strict';
// 학교 공간(/hub): 관리자가 등록한 학교만, 학교 코드로, 자기 학교 데이터만. 관리자는 모든 학교를 연다.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const os = require('node:os'), fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const express = require('express');
const { mountHub } = require('../lib/hub');
const { createStore } = require('../lib/recruitment/store');
const { createLoginGuard } = require('../lib/login-guard');

function hashPassword(plain, salt) { salt = salt || crypto.randomBytes(16).toString('hex'); return { hash: crypto.pbkdf2Sync(plain, salt, 1000, 64, 'sha512').toString('hex'), salt }; }
function verifyPassword(plain, h, s) { return crypto.timingSafeEqual(Buffer.from(hashPassword(plain, s).hash, 'hex'), Buffer.from(h, 'hex')); }
const ADMIN = hashPassword('admin-secret');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hub-test-'));
const legacy = createStore({ directory: path.join(dir, 'legacy') });
const guard = createLoginGuard();
let base, server, hub;
const A = '7531234', B = '7539999';
const minimal = (title = '테스트 채용') => ({ school: '가', title, field: '방과후[컴퓨터]', documentDate: '2026-10-20', interviewDate: '2026-10-22', rankingBasis: 'combined', shortlistLimit: 1, allowBonus: false, preset: 'standard',
    candidates: [{ code: '001', name: '김' }], reviewers: [{ name: '위원', position: '교사', stages: ['document', 'interview'] }] });

before(async () => {
    const app = express(); app.use(express.json());
    const who = req => ({ ip: '9.9.9.9', device: req.get('x-device-id') });
    hub = mountHub(app, {
        redis: null, IS_VERCEL: false, dataDir: path.join(dir, 'hub'), getAuthCodes: async () => ({ adminHash: ADMIN.hash, adminSalt: ADMIN.salt }), verifyPassword, hashPassword,
        loginLockGate: async (req, res, next) => { const l = await guard.check(who(req)); return l.locked ? res.status(429).json({ error: 'locked' }) : next(); },
        loginFailed: async (req, res, msg) => { await guard.fail(who(req)); res.status(401).json({ error: msg }); },
        loginSucceeded: async req => guard.success(who(req)),
        prefixedRedis: r => r, legacyRecruitStore: legacy
    });
    app.get('/recruitment', async (req, res) => { const m = await hub.getFlag(hub.MIGRATED); if (m?.schoolId) return res.redirect(302, `/hub/s/${m.schoolId}/recruitment`); res.send('old'); });
    await new Promise(r => { server = app.listen(0, '127.0.0.1', r); });
    base = `http://127.0.0.1:${server.address().port}`;
});
after(() => server.close());

const call = async (p, { method = 'GET', body, token, device = 'device-test-0000000001' } = {}) => {
    const r = await fetch(base + p, { method, redirect: 'manual', headers: { 'Content-Type': 'application/json', 'X-Device-Id': device, ...(token ? { 'X-Hub-Token': token, 'X-Auth-Token': token } : {}) }, body: body ? JSON.stringify(body) : undefined });
    let data = null; try { data = await r.json(); } catch {} return { status: r.status, data, location: r.headers.get('location') };
};
let adminToken, aToken;

test('관리자: 백암이 관리자 코드로만 들어온다', async () => {
    assert.equal((await call('/api/hub/admin/login', { method: 'POST', body: { code: 'wrong' } })).status, 401);
    const r = await call('/api/hub/admin/login', { method: 'POST', body: { code: 'admin-secret' } });
    assert.equal(r.status, 200); adminToken = r.data.token;
    assert.equal((await call('/api/hub/admin/schools')).status, 401, '토큰 없으면 막힘');
});

test('관리자가 등록하지 않은 학교는 들어올 수 없다', async () => {
    const r = await call('/api/hub/login', { method: 'POST', body: { schoolId: A, code: 'whatever' } });
    assert.equal(r.status, 403); assert.match(r.data.error, /등록하지 않은 학교/);
});

test('학교 등록 → 학교 코드로 로그인 → 자기 학교 채용만', async () => {
    assert.equal((await call('/api/hub/admin/schools', { method: 'POST', token: adminToken, body: { id: A, name: '가나초등학교', code: 'GANA2026' } })).status, 201);
    assert.equal((await call('/api/hub/admin/schools', { method: 'POST', token: adminToken, body: { id: B, name: '다라초등학교', code: 'DARA2026' } })).status, 201);
    assert.equal((await call('/api/hub/login', { method: 'POST', body: { schoolId: A, code: 'DARA2026' } })).status, 401, '다른 학교 코드는 안 됨');
    const ok = await call('/api/hub/login', { method: 'POST', body: { schoolId: A, code: 'GANA2026' } });
    assert.equal(ok.status, 200); aToken = ok.data.token; assert.equal(ok.data.school.name, '가나초등학교');
    const created = await call(`/api/hub/s/${A}/recruitments`, { method: 'POST', token: aToken, body: minimal('가나 채용') });
    assert.equal(created.status, 201);
    assert.equal((await call(`/api/hub/s/${A}/recruitments`, { token: aToken })).data.items.length, 1);
    assert.equal((await call(`/api/hub/s/${B}/recruitments`, { token: aToken })).status, 401, '다른 학교 공간은 못 연다');
    // 위원 초대 링크는 학교 공간 주소로 나간다
    await call(`/api/hub/s/${A}/recruitments/${created.data.id}/provision`, { method: 'POST', token: aToken, body: { version: created.data.version } });
    const cur = (await call(`/api/hub/s/${A}/recruitments/${created.data.id}`, { token: aToken })).data;
    const inv = await call(`/api/hub/s/${A}/recruitments/${cur.id}/invites/${cur.reviewers[0].id}`, { method: 'POST', token: aToken, body: { version: cur.version } });
    assert.match(inv.data.invitationPath, new RegExp(`^/hub/s/${A}/recruitment\\?id=`));
});

test('관리자는 모든 학교 데이터를 열고 대신 작업한다', async () => {
    const list = (await call('/api/hub/admin/schools', { token: adminToken })).data.items;
    assert.deepEqual(list.map(s => [s.name, s.recruitments]), [['가나초등학교', 1], ['다라초등학교', 0]]);
    assert.equal((await call(`/api/hub/s/${B}/recruitments`, { method: 'POST', token: adminToken, body: minimal('관리자가 만든 채용') })).status, 201);
    assert.equal((await call(`/api/hub/s/${A}/recruitments`, { token: adminToken })).data.items.length, 1);
});

test('코드 바꾸기: 이전 코드는 바로 막힌다', async () => {
    await call(`/api/hub/admin/schools/${A}/code`, { method: 'POST', token: adminToken, body: { code: 'NEWCODE9' } });
    assert.equal((await call('/api/hub/login', { method: 'POST', body: { schoolId: A, code: 'GANA2026' }, device: 'device-test-0000000002' })).status, 401);
    assert.equal((await call('/api/hub/login', { method: 'POST', body: { schoolId: A, code: 'NEWCODE9' }, device: 'device-test-0000000002' })).status, 200);
});

test('정지한 학교: 학교 사람·로그인 모두 막히고 관리자만 연다', async () => {
    await call(`/api/hub/admin/schools/${A}/active`, { method: 'POST', token: adminToken, body: { active: false } });
    assert.equal((await call(`/api/hub/s/${A}/recruitments`, { token: aToken })).status, 403);
    assert.match((await call('/api/hub/login', { method: 'POST', body: { schoolId: A, code: 'NEWCODE9' } })).data.error, /멈춘/);
    assert.equal((await call(`/api/hub/s/${A}/recruitments`, { token: adminToken })).status, 200);
    await call(`/api/hub/admin/schools/${A}/active`, { method: 'POST', token: adminToken, body: { active: true } });
});

test('백암이 채용 옮기기: 복사하고 /recruitment 는 그 학교 공간으로 보낸다', async () => {
    const { createRecruitment } = require('../lib/recruitment/domain');
    await legacy.create(createRecruitment(minimal('백암이에 있던 채용')));
    assert.equal((await call('/recruitment')).status, 200, '옮기기 전에는 그대로');
    const r = await call('/api/hub/admin/migrate-baekam', { method: 'POST', token: adminToken, body: { schoolId: B } });
    assert.deepEqual(r.data, { copied: 1, skipped: 0 });
    assert.equal((await call('/api/hub/admin/migrate-baekam', { method: 'POST', token: adminToken, body: { schoolId: B } })).data.skipped, 1, '다시 해도 겹치지 않음');
    const go = await call('/recruitment'); assert.equal(go.status, 302); assert.equal(go.location, `/hub/s/${B}/recruitment`);
    assert.equal((await legacy.list()).length, 1, '원본은 남는다');
});

test('학교 삭제: 이름 확인, 데이터까지 지우기 선택', async () => {
    assert.equal((await call(`/api/hub/admin/schools/${B}`, { method: 'DELETE', token: adminToken, body: { confirmName: '틀린이름' } })).status, 400);
    const r = await call(`/api/hub/admin/schools/${B}`, { method: 'DELETE', token: adminToken, body: { confirmName: '다라초등학교', purge: true } });
    assert.equal(r.data.purged, 2);
    assert.equal((await call(`/api/hub/s/${B}/recruitments`, { token: adminToken })).status, 404);
});

test('학교 코드 10번 틀리면 그 기기는 금지(백암이와 같은 잠금)', async () => {
    const dev = 'device-test-brute-00001';
    for (let i = 0; i < 10; i++) await call('/api/hub/login', { method: 'POST', body: { schoolId: A, code: 'x' + i }, device: dev });
    assert.equal((await call('/api/hub/login', { method: 'POST', body: { schoolId: A, code: 'NEWCODE9' }, device: dev })).status, 429);
});
