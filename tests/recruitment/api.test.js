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
    const zipResult = await request(`/${r.id}/export/zip`); const zip = await JSZip.loadAsync(Buffer.from(await zipResult.res.arrayBuffer())); assert.equal(Object.keys(zip.files).length, 4); assert.ok(zip.file('채점표_서약서_인쇄용.html'));
    assert.equal((await request(`/${r.id}/export/html`, 'GET', undefined, token)).res.status, 401);
    const reloaded = await createStore({ directory }).get(r.id); assert.equal(reloaded.snapshot.results[0].total, 100);
});
test('local store serializes writers and rejects stale versions; serverless has no silent fallback', async t => {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'recruitment-cas-')); t.after(() => fs.rm(directory, { recursive: true, force: true })); const store = createStore({ directory }); const r = await store.create(d.createRecruitment(payload()));
    const results = await Promise.allSettled([store.mutate(r.id, 1, x => x), store.mutate(r.id, 1, x => x)]); assert.equal(results.filter(x => x.status === 'fulfilled').length, 1); assert.equal((await store.get(r.id)).version, 2);
    await assert.rejects(createStore({ directory, serverless: true }).get(r.id), /저장소/);
});
