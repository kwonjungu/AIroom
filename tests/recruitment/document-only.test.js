'use strict';
// 서류전형만 하는 채용(stages = ['document']), 새 채용 화면 기본값·문구('채용 제목', 가점 기본 사용).
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const JSZip = require('jszip');
const ExcelJS = require('exceljs');
const d = require('../../lib/recruitment/domain');
const { provision } = require('../../lib/recruitment/providers/mock');
const { buildSample, buildContractSample } = require('../../lib/recruitment/sample');
const { exportResult } = require('../../lib/recruitment/exports');
const { printPages } = require('../../public/recruitment/sheets');
const { contractPages, fits } = require('../../public/recruitment/contract-sheets');
const { input, signatureFor } = require('./domain.test');

// 면접 칸(면접일·대상자 수·순위 기준)을 빼고 서류만으로 만든다.
function docOnlyInput(overrides = {}) {
    const base = input({ stages: ['document'], reviewers: [{ name: '위원1', position: '교사', stages: ['document'] }, { name: '위원2', position: '교사', stages: ['document'] }], ...overrides });
    delete base.interviewDate; delete base.shortlistLimit; delete base.rankingBasis;
    base.rubrics = { document: base.rubrics.document };
    return base;
}
// HWPX 안의 XML 이 모두 잘 짜였는지(saxes 로 끝까지 읽어 본다).
async function assertWellFormed(buffer) {
    const { SaxesParser } = require('saxes');
    const zip = await JSZip.loadAsync(buffer);
    const names = Object.keys(zip.files).filter(n => /\.(xml|hpf)$/.test(n));
    assert.ok(names.includes('Contents/section0.xml'));
    for (const name of names) {
        const parser = new SaxesParser({ xmlns: true }); let error = null;
        parser.on('error', e => { error = e; });
        parser.write(await zip.file(name).async('string')).close();
        assert.equal(error, null, `${name}: ${error?.message}`);
    }
    return zip;
}
const sectionText = async zip => (await Promise.all(Object.keys(zip.files).filter(n => /^Contents\/section\d+\.xml$/.test(n)).sort().map(n => zip.file(n).async('string')))).join('');

test('서류만: 면접일·면접대상자·순위 기준 없이 만들고 stages 를 저장한다', () => {
    const r = d.createRecruitment(docOnlyInput());
    assert.deepEqual(r.stages, ['document']); assert.equal(r.layout, undefined);
    assert.equal(r.interviewDate, null); assert.equal(r.rules.rankingBasis, 'document'); assert.equal(r.rules.shortlistLimit, null);
    assert.deepEqual(Object.keys(r.rubrics), ['document'], '면접 배점표를 요구·저장하지 않는다');
    assert.ok(d.documentOnly(r));
    assert.throws(() => d.createRecruitment(docOnlyInput({ reviewers: [{ name: '위원1', position: '교사', stages: ['document', 'interview'] }] })), /담당 전형/);
    assert.throws(() => d.createRecruitment(input({ stages: ['interview'] })), /전형 구성/);
    assert.throws(() => d.createRecruitment(input({ stages: 'document' })), /전형 구성/);
    // 전체 전형을 그대로 보내거나 안 보내면 예전과 같다(stages 를 저장하지 않음).
    for (const stages of [undefined, null, ['document', 'interview']]) {
        const full = d.createRecruitment(input({ stages }));
        assert.equal(full.stages, undefined); assert.equal(d.documentOnly(full), false); assert.equal(full.interviewDate, '2026-09-21');
    }
});

test('서류만: 서류 평가 → 전원 제출 → 대상자 선정 없이 확정, 순위 = 서류 평균', () => {
    const r = provision(d.createRecruitment(docOnlyInput({ candidates: [{ code: '001', name: '가' }, { code: '002', name: '나' }, { code: '003', name: '다' }] })));
    assert.throws(() => d.finalize(r), /모든 위원/);
    const [a, b] = r.reviewers;
    // 두 위원이 서로 다른 점수를 준다: 001 > 003 > 002.
    const rows = (fractions) => r.candidates.map((c, i) => ({ candidateId: c.id, attendance: 'present', scores: Object.fromEntries(r.rubrics.document.map(x => [x.id, x.max * fractions[i]])), bonus: 0, note: '' }));
    for (const [v, f] of [[a, [1, .5, .75]], [b, [1, .5, .5]]]) { d.signPledge(r, v.id, signatureFor(3)); d.saveEvaluation(r, v.id, 'document', rows(f)); d.submitEvaluation(r, v.id, 'document'); }
    assert.throws(() => d.selectShortlist(r, [r.candidates[0].id], '상위'), /면접대상자가 없습니다/);
    assert.throws(() => d.saveEvaluation(r, a.id, 'interview', []), /현재 진행 중인 전형/);
    d.finalize(r);
    assert.equal(r.status, 'finalized');
    const s = r.snapshot;
    assert.deepEqual(s.stages, ['document']); assert.equal(s.interviewDate, null);
    assert.deepEqual(s.results.map(x => [x.code, x.rank]), [['001', 1], ['003', 2], ['002', 3]]);
    for (const x of s.results) { assert.equal(x.total, x.document); assert.equal(x.interview, null); assert.equal(x.rankingScore, s.documentResults.find(y => y.candidateId === x.candidateId).score); }
    assert.equal(d.publicView(r, { role: 'admin', id: 'admin' }).finalResults.length, 3, '결과 화면: 지원자 전원');
});

test('서류만(강사 표준): 출력물은 서약서 → 서류 채점표 → 서류 집계표(최종 순위)까지, 면접 표 없음', async () => {
    const r = buildSample('standard', '방과후[컴퓨터]', { documentOnly: true });
    assert.equal(r.status, 'finalized'); assert.deepEqual(r.snapshot.stages, ['document']);
    assert.ok(r.reviewers.every(v => v.stages.join() === 'document'));
    const pages = printPages(r.snapshot);
    assert.deepEqual([...new Set(pages.map(p => p.type === 'pledge' ? 'pledge' : p.title))], ['pledge', '방과후[컴퓨터] 채용 서류심사 채점표', '방과후[컴퓨터] 채용 서류심사 집계 및 순위']);
    const sum = pages[pages.length - 1];
    assert.ok(sum.table.rows.some(row => row.cells[0]?.v === '최종 순위'));
    assert.match(sum.note, /서류전형만 실시/); assert.doesNotMatch(sum.note, /면접대상자/);
    const html = (await exportResult(r, 'html')).buffer.toString();
    assert.ok(!html.includes('면접 심사') && !html.includes('면접 심사 채점표'));
    const zip = await assertWellFormed((await exportResult(r, 'hwpx')).buffer);
    const xml = await sectionText(zip);
    assert.ok(xml.includes('서류심사 집계 및 순위') && !xml.includes('면접 심사'));
    const wb = new ExcelJS.Workbook(); await wb.xlsx.load((await exportResult(r, 'xlsx')).buffer);
    const names = wb.worksheets.map(ws => ws.name);
    assert.ok(names.includes('서류심사 집계 및 순위') && !names.some(n => n.includes('면접')), names.join(','));
    const setup = wb.getWorksheet('설정 및 집계 기준'), rows = []; setup.eachRow(row => rows.push([row.getCell(1).value, row.getCell(2).value]));
    const info = Object.fromEntries(rows);
    assert.equal(info['채용 제목'], r.title); assert.equal(info['전형 구성'], '서류전형만');
    assert.equal(info['면접일'], undefined); assert.equal(info['면접대상자 선정 사유'], undefined);
    assert.match(info['순위 기준'], /^서류 평균/);
});

test('서류만(계약제): 서약서 → 서류전형 → 서류 집계표 → 교과목별 집계표(서류만), 가산점 문턱도 서류만', async () => {
    const r = buildContractSample({ candidates: 12, reviewers: 3, documentOnly: true });
    assert.equal(r.status, 'finalized'); assert.deepEqual(r.snapshot.stages, ['document']);
    assert.deepEqual(Object.keys(r.rules.bonusByStage), ['document']); assert.equal(r.rules.bonusByStage.document.threshold, 12);
    const s = r.snapshot, pages = contractPages(s);
    const titles = [...new Set(pages.map(p => p.title))];
    assert.deepEqual(titles, ['임용심사위원 서약서', '계약제교원 채용 서류전형 평가표', '계약제교원 채용 서류전형 평가 집계표', '계약제교원 채용 [교과목별 평가 집계표]']);
    assert.equal(pages.filter(p => p.type !== 'pledge' && !fits(p)).length, 0);
    assert.equal(s.results.length, 12, '교과목별 집계: 지원자 전원');
    for (const x of s.results.filter(y => y.total !== null)) {
        const doc = s.documentResults.find(y => y.candidateId === x.candidateId);
        assert.equal(x.total, x.bonusExcluded ? doc.base : doc.score); assert.equal(x.interview, null);
        assert.equal(x.bonusExcluded, doc.base < 12, '40% 문턱은 서류 만점 30점의 40% = 12점');
    }
    const subjPage = pages.find(p => p.title.includes('교과목별'));
    assert.ok(!subjPage.notes.some(n => n.includes('어느 한 영역')), '서류만이면 세 영역 주석 대신 서류 기준 문구');
    assert.ok(subjPage.notes.some(n => n.includes('서류전형 평균')));
    assert.ok(contractPages(buildContractSample({ candidates: 3, reviewers: 1 }).snapshot).find(p => p.title.includes('교과목별')).notes.some(n => n.includes('어느 한 영역')), '전체 전형은 원본 주석 그대로');
    const subj = subjPage.blocks[0].table;
    assert.equal(subj.rows[1].cells.length, 2, '평가 점수 칸 = 서류(30) + 계');
    assert.match(subj.rows[1].cells[0].v, /^서류\(30\)/);
    const zip = await assertWellFormed((await exportResult(r, 'hwpx')).buffer);
    assert.ok(!(await sectionText(zip)).includes('면접 기준 및 평가표'));
    const html = (await exportResult(r, 'html')).buffer.toString();
    assert.ok(!html.includes('수업실연 기준') && !html.includes('응모자별 평가 집계표'));
    const wb = new ExcelJS.Workbook(); await wb.xlsx.load((await exportResult(r, 'xlsx')).buffer);
    assert.ok(!wb.worksheets.some(ws => /면접|수업실연|응모자별/.test(ws.name)), wb.worksheets.map(ws => ws.name).join(','));
});

test('옛 채용(stages 없음)은 전체 전형 그대로', () => {
    const old = d.createRecruitment(input()); delete old.stages;
    assert.deepEqual(d.stagesOf(old), ['document', 'interview']); assert.equal(d.documentOnly(old), false);
    const contract = buildContractSample({ candidates: 2, reviewers: 1 });
    assert.deepEqual(contract.stages, ['document', 'interview', 'demo']); assert.equal(d.documentOnly(contract), false);
});

test('새 채용 화면: 가점 기본 사용, 전형 구성 선택, 사용자 문구는 채용 제목', () => {
    const root = path.join(__dirname, '../../public/recruitment');
    const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
    assert.match(app, /<select name="allowBonus"><option value="false">미사용<\/option><option value="true" selected>사용<\/option>/);
    assert.match(app, /<select name="stagePlan"><option value="full">서류 \+ 면접<\/option><option value="document">서류만<\/option>/);
    assert.match(app, /form\.elements\.allowBonus\.value = 'true'/, '예시 채우기도 가점 사용');
    for (const file of ['app.js', 'privacy.html', 'manual/admin.html', 'manual/reviewer.html', 'manual/manager.html', 'manual/index.html', 'index.html'])
        assert.ok(!fs.readFileSync(path.join(root, file), 'utf8').includes('채용명'), `${file} 에 '채용명'이 남아 있다`);
});

test('HTTP: 서류만 채용 생성 → 위원 제출 → 바로 확정 → 출력, 샘플 ?stages=document, 삭제 문구는 채용 제목', async t => {
    const os = require('node:os'), express = require('express');
    const { createRouter } = require('../../lib/recruitment/routes');
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'recruitment-doc-only-'));
    const app = express(); app.use('/api/recruitments', createRouter({ directory, validateSession: async token => token === 'admin-test' ? { role: 'admin' } : null }));
    const server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
    t.after(async () => { await new Promise(resolve => server.close(resolve)); fs.rmSync(directory, { recursive: true, force: true }); });
    const base = `http://127.0.0.1:${server.address().port}/api/recruitments`;
    const call = async (url, method = 'GET', body, token) => { const res = await fetch(base + url, { method, headers: { 'Content-Type': 'application/json', ...(token ? { 'X-Recruitment-Token': token } : { 'X-Auth-Token': 'admin-test' }) }, body: body && JSON.stringify(body) }); const type = res.headers.get('content-type') || ''; return { res, json: type.includes('json') ? await res.json() : null, text: type.includes('html') ? await res.text() : null }; };
    let r = (await call('', 'POST', docOnlyInput({ reviewers: [{ name: '위원1', position: '교사', stages: ['document'] }] }))).json;
    assert.deepEqual(r.stages, ['document']);
    r = (await call(`/${r.id}/provision`, 'POST', { version: r.version })).json;
    const invite = (await call(`/${r.id}/invites/${r.reviewers[0].id}`, 'POST', { version: r.version })).json; r = invite.recruitment;
    const token = invite.invitationPath.split('invite=')[1];
    r = (await call(`/${r.id}/pledge`, 'POST', { version: r.version, image: signatureFor(7) }, token)).json;
    const rows = r.candidates.map(c => ({ candidateId: c.id, attendance: 'present', scores: Object.fromEntries(r.rubrics.document.map(x => [x.id, x.max])), bonus: 0, note: '' }));
    r = (await call(`/${r.id}/evaluations/document/save`, 'POST', { version: r.version, rows }, token)).json;
    r = (await call(`/${r.id}/evaluations/document/submit`, 'POST', { version: r.version }, token)).json;
    assert.equal((await call(`/${r.id}/shortlist`, 'POST', { version: r.version, candidateIds: [r.candidates[0].id], reason: 'x' })).res.status, 409);
    r = (await call(`/${r.id}/finalize`, 'POST', { version: r.version })).json;
    assert.equal(r.status, 'finalized'); assert.equal(r.finalResults.length, 2);
    const html = (await call(`/${r.id}/export/html`)).text;
    assert.ok(html.includes('서류심사 집계 및 순위') && !html.includes('면접 심사'));
    const sample = (await call('/sample/contract-teacher/html?field=&stages=document')).text;
    assert.ok(sample.includes('교과목별 평가 집계표') && !sample.includes('면접 기준 및 평가표'));
    assert.ok((await call('/sample/contract-teacher/html?field=')).text.includes('면접 기준 및 평가표'), '기본 샘플은 전체 전형');
    const del = await call(`/${r.id}`, 'DELETE', {});
    assert.equal(del.res.status, 400); assert.match(del.json.error, /채용 제목/);
});
