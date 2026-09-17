'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const express = require('express');
const ExcelJS = require('exceljs');
const JSZip = require('jszip');
const { createRouter } = require('../../lib/recruitment/routes');
const { createStore } = require('../../lib/recruitment/store');
const d = require('../../lib/recruitment/domain');
const payload = () => ({ school: '테스트학교', title: '검증 <script>alert(1)</script>', field: '강사', documentDate: '2026-09-20', interviewDate: '2026-09-21', rankingBasis: 'combined', shortlistLimit: 1, allowBonus: false, candidates: [{ code: '001', name: '=1+1' }], reviewers: [{ name: '위원', position: '교사', email: 'reviewer@example.com', stages: ['document', 'interview'] }] });
test('HTTP journey: permissions, invitation rotation, versions, finalization, HTML/XLSX/ZIP', async t => {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'recruitment-test-'));
    const app = express(); app.use('/api/recruitments', createRouter({ directory, validateSession: async token => token === 'admin-test' ? { role: 'admin' } : token === 'user-test' ? { role: 'user' } : null }));
    const server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
    t.after(async () => { await new Promise(resolve => server.close(resolve)); await fs.rm(directory, { recursive: true, force: true }); });
    const base = `http://127.0.0.1:${server.address().port}/api/recruitments`;
    async function request(url, method = 'GET', body, who = 'admin') { const headers = { 'Content-Type': 'application/json' }; if (who === 'admin') headers['X-Auth-Token'] = 'admin-test'; else if (who === 'user') headers['X-Auth-Token'] = 'user-test'; else if (who) headers['X-Recruitment-Token'] = who; const res = await fetch(base + url, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) }); const json = res.headers.get('content-type')?.includes('application/json') ? await res.json() : null; return { res, json }; }
    assert.equal((await request('', 'GET', undefined, null)).res.status, 401);
    assert.equal((await request('', 'GET', undefined, 'bogus-token')).res.status, 401);
    // 백암이 접근 코드 세션(role 'user')도 채용 관리자로 인정한다.
    assert.equal((await request('', 'POST', payload(), 'user')).res.status, 201);
    let { json: r } = await request('', 'POST', payload()); assert.ok(r.id);
    let invite = await request(`/${r.id}/invites/${r.reviewers[0].id}`, 'POST', { version: r.version }); r = invite.json.recruitment; const oldToken = invite.json.invitationPath.split('invite=')[1];
    invite = await request(`/${r.id}/invites/${r.reviewers[0].id}`, 'POST', { version: r.version }); r = invite.json.recruitment; const token = invite.json.invitationPath.split('invite=')[1];
    assert.equal((await request(`/${r.id}`, 'GET', undefined, oldToken)).res.status, 401);
    const view = await request(`/${r.id}`, 'GET', undefined, token); assert.equal(view.json.actor.role, 'reviewer'); assert.ok(!JSON.stringify(view.json).includes('inviteHash'));
    const other = (await request('', 'POST', payload())).json; assert.equal((await request(`/${other.id}`, 'GET', undefined, token)).res.status, 401);
    r = (await request(`/${r.id}/provision`, 'POST', { version: r.version })).json; assert.equal(r.status, 'document'); assert.equal(r.link.spreadsheetUrl, null);
    assert.equal((await request(`/${r.id}/finalize`, 'POST', { version: r.version }, token)).res.status, 401);
    assert.equal((await request(`/${r.id}/finalize`, 'POST', { version: r.version })).res.status, 409);
    assert.equal((await request(`/${r.id}/provision`, 'POST', { version: 1 })).res.status, 409);
    // 서명 전에는 제출이 막힌다.
    {
        const rows = r.candidates.map(c => ({ candidateId: c.id, attendance: 'present', scores: Object.fromEntries(d.DEFAULT_RUBRICS.document.map((v, i) => ({ ...v, id: `c${i + 1}` })).map(v => [v.id, v.max])), bonus: 0, note: '' }));
        r = (await request(`/${r.id}/evaluations/document/save`, 'POST', { version: r.version, rows }, token)).json;
        const blocked = await request(`/${r.id}/evaluations/document/submit`, 'POST', { version: r.version }, token);
        assert.equal(blocked.res.status, 400); assert.match(blocked.json.error, /청렴서약서/);
    }
    const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(400, 9)]).toString('base64');
    assert.equal((await request(`/${r.id}/pledge`, 'POST', { version: r.version, image: 'data:image/svg+xml;base64,' + png }, token)).res.status, 400);
    r = (await request(`/${r.id}/pledge`, 'POST', { version: r.version, image: 'data:image/png;base64,' + png }, token)).json;
    assert.ok(r.reviewers[0].pledge.signedAt);
    for (const stage of ['document', 'interview']) {
        const rows = r.candidates.map(c => ({ candidateId: c.id, attendance: 'present', scores: Object.fromEntries(d.DEFAULT_RUBRICS[stage].map((v, i) => ({ ...v, id: `c${i + 1}` })).map(v => [v.id, v.max])), bonus: 0, note: '<img src=x onerror=alert(1)>' }));
        r = (await request(`/${r.id}/evaluations/${stage}/save`, 'POST', { version: r.version, rows }, token)).json;
        r = (await request(`/${r.id}/evaluations/${stage}/submit`, 'POST', { version: r.version }, token)).json;
        assert.equal((await request(`/${r.id}/evaluations/${stage}/save`, 'POST', { version: r.version, rows }, token)).res.status, 409);
        if (stage === 'document') r = (await request(`/${r.id}/shortlist`, 'POST', { version: r.version, candidateIds: [r.candidates[0].id], reason: '서류 상위 선정' })).json;
    }
    r = (await request(`/${r.id}/finalize`, 'POST', { version: r.version })).json; assert.equal(r.snapshot.results[0].total, 100);
    const htmlResult = await request(`/${r.id}/export/html`); const html = await htmlResult.res.text(); assert.match(html, /window.print/); assert.ok(!html.includes('<script>alert(1)</script>')); assert.ok(!html.includes('<img src=x')); assert.match(html, /면접·최종 합산 통계표/);
    const xlsxResult = await request(`/${r.id}/export/xlsx`); const workbook = new ExcelJS.Workbook(); await workbook.xlsx.load(Buffer.from(await xlsxResult.res.arrayBuffer())); assert.equal(workbook.worksheets.length, 7); assert.equal(workbook.getWorksheet('면접 최종 집계표').getCell('G2').value, 100); assert.equal(workbook.getWorksheet('면접 최종 집계표').getCell('B2').type, ExcelJS.ValueType.String);
    const hwpxResult = await request(`/${r.id}/export/hwpx`); assert.equal(hwpxResult.res.status, 200); assert.equal(hwpxResult.res.headers.get('content-type'), 'application/hwp+zip'); const hwpxBuffer = Buffer.from(await hwpxResult.res.arrayBuffer()); assert.equal(hwpxBuffer.subarray(0, 2).toString(), 'PK');
    const zipResult = await request(`/${r.id}/export/zip`); const zip = await JSZip.loadAsync(Buffer.from(await zipResult.res.arrayBuffer())); assert.equal(Object.keys(zip.files).length, 5); assert.ok(zip.file('채점표_서약서_인쇄용.html')); assert.ok(zip.file('평가통계_확정본.hwpx'));
    assert.equal((await request(`/${r.id}/export/html`, 'GET', undefined, token)).res.status, 401);
    assert.equal((await request(`/${r.id}/export/hwpx`, 'GET', undefined, token)).res.status, 401);
    const reloaded = await createStore({ directory }).get(r.id); assert.equal(reloaded.snapshot.results[0].total, 100);
});
test('the config endpoint never hands the operator address or folder id to the browser', async t => {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'recruitment-config-'));
    const app = express(); app.use('/api/recruitments', createRouter({ directory, validateSession: async token => token === 'admin-test' ? { role: 'admin' } : null }));
    const server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
    t.after(async () => { await new Promise(resolve => server.close(resolve)); await fs.rm(directory, { recursive: true, force: true }); });
    const res = await fetch(`http://127.0.0.1:${server.address().port}/api/recruitments/config`, { headers: { 'X-Auth-Token': 'admin-test' } });
    const body = await res.json(); const text = JSON.stringify(body);
    assert.ok(!text.includes('@'), `설정 응답에 메일 주소가 있다: ${text}`);
    assert.equal(body.operatorEmail, undefined);
    assert.equal(body.folderId, undefined);
    assert.deepEqual(Object.keys(body.google).sort(), ['configured', 'connected']);
});
test('a reviewer needs no email address', async t => {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'recruitment-noemail-'));
    t.after(() => fs.rm(directory, { recursive: true, force: true }));
    const body = payload(); delete body.reviewers[0].email;
    const r = d.createRecruitment(body);
    assert.equal(r.reviewers[0].email, null);
    assert.throws(() => d.createRecruitment({ ...payload(), reviewers: [{ name: '가', position: '교사', stages: ['document', 'interview'] }, { name: '가', position: '교사', stages: ['document'] }] }), /같은 이름·직위/);
});
test('deleting a recruitment needs the exact title, and an extra confirmation while unfinished', async t => {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'recruitment-delete-'));
    const app = express(); app.use('/api/recruitments', createRouter({ directory, validateSession: async token => token === 'admin-test' ? { role: 'admin' } : null }));
    const server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
    t.after(async () => { await new Promise(resolve => server.close(resolve)); await fs.rm(directory, { recursive: true, force: true }); });
    const base = `http://127.0.0.1:${server.address().port}/api/recruitments`;
    const send = (url, method, body, auth = true) => fetch(base + url, { method,
        headers: { 'Content-Type': 'application/json', ...(auth ? { 'X-Auth-Token': 'admin-test' } : {}) },
        body: body === undefined ? undefined : JSON.stringify(body) });
    const created = await (await send('', 'POST', payload())).json();

    assert.equal((await send(`/${created.id}`, 'DELETE', { confirmTitle: created.title, confirmUnfinished: true }, false)).status, 401);
    assert.equal((await send(`/${created.id}`, 'DELETE', {})).status, 400, '채용명 없이 지울 수 없다');
    assert.equal((await send(`/${created.id}`, 'DELETE', { confirmTitle: '다른 이름' })).status, 400);
    assert.equal((await send(`/${created.id}`, 'DELETE', { confirmTitle: created.title })).status, 409, '미확정이면 한 번 더 확인해야 한다');
    assert.equal((await send(`/${created.id}`, 'GET')).status, 200, '거부된 뒤에도 채용은 남아 있어야 한다');

    const gone = await send(`/${created.id}`, 'DELETE', { confirmTitle: created.title, confirmUnfinished: true });
    assert.equal(gone.status, 200);
    assert.equal((await gone.json()).deleted, true);
    assert.equal((await send(`/${created.id}`, 'GET')).status, 404);
    assert.equal((await send(`/${created.id}`, 'DELETE', { confirmTitle: created.title, confirmUnfinished: true })).status, 404);
    assert.equal((await (await send('', 'GET')).json()).items.length, 0);
});
test('the scheduled purge endpoint refuses without the shared secret', async t => {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'recruitment-cron-'));
    const app = express(); app.use('/api/recruitments', createRouter({ directory, validateSession: async () => null }));
    const server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
    const previous = process.env.CRON_SECRET;
    t.after(async () => { await new Promise(resolve => server.close(resolve)); await fs.rm(directory, { recursive: true, force: true });
        if (previous === undefined) delete process.env.CRON_SECRET; else process.env.CRON_SECRET = previous; });
    const url = `http://127.0.0.1:${server.address().port}/api/recruitments/maintenance/purge`;
    const call = headers => fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: '{}' });

    delete process.env.CRON_SECRET;
    assert.equal((await call({})).status, 503, '비밀키가 없으면 동작하지 않는다');
    process.env.CRON_SECRET = 'test-cron-secret';
    assert.equal((await call({})).status, 401);
    assert.equal((await call({ Authorization: 'Bearer wrong-secret-x' })).status, 401);
    // 길이가 다른 값도 timingSafeEqual 에서 던지지 않고 401 로 떨어져야 한다.
    assert.equal((await call({ Authorization: 'Bearer short' })).status, 401);
    const ok = await call({ Authorization: 'Bearer test-cron-secret' });
    assert.equal(ok.status, 200);
    assert.match((await ok.json()).skipped, /연결되지 않았습니다/, 'Google 미연결이면 건너뛴다');
});
test('local store serializes writers and rejects stale versions; serverless has no silent fallback', async t => {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'recruitment-cas-')); t.after(() => fs.rm(directory, { recursive: true, force: true })); const store = createStore({ directory }); const r = await store.create(d.createRecruitment(payload()));
    const results = await Promise.allSettled([store.mutate(r.id, 1, x => x), store.mutate(r.id, 1, x => x)]); assert.equal(results.filter(x => x.status === 'fulfilled').length, 1); assert.equal((await store.get(r.id)).version, 2);
    await assert.rejects(createStore({ directory, serverless: true }).get(r.id), /저장소/);
});
