'use strict';
// 계약제 서류 '전공/부전공 여부': 담당자가 원본 B8:B10 처럼 자격증 줄(최대 3줄)과 배점을 골라 만든다.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const JSZip = require('jszip');
const ExcelJS = require('exceljs');
const d = require('../../lib/recruitment/domain');
const { presetById, CHOICES } = require('../../lib/recruitment/presets');
const { buildContractSample, buildSample } = require('../../lib/recruitment/sample');
const { exportResult } = require('../../lib/recruitment/exports');
const { contractPages } = require('../../public/recruitment/contract-sheets');

const preset = presetById('contract-teacher');
// 프리셋 서류 항목을 복사하고 첫 항목(전공/부전공)의 줄만 바꾼다.
const withLicense = options => ({ ...preset.rubrics, document: preset.rubrics.document.map((c, i) => i === 0 ? { ...c, options } : c) });
const create = (options, extra = {}) => d.createRecruitment({ school: 'ㄱ초', title: 't', field: '기간제교사(담임)', recruitType: '기간제교사', subject: '담임', documentDate: '2026-10-20', interviewDate: '2026-10-22',
    rankingBasis: 'combined', shortlistLimit: 1, allowBonus: false, preset: 'contract-teacher', candidates: [{ code: '담임01', name: '가' }], reviewers: [{ name: '위원', position: '교사', stages: ['document', 'interview', 'demo'] }],
    rubrics: withLicense(options), ...extra });
const THREE = [{ label: '초등 교원자격증', points: 6 }, { label: '특수(초등)교원자격증', points: 4 }, { label: '보건 교원자격증', points: 0 }];

test('목록·기본값은 원본 그대로: 자격증 9종(O열 순서) · 배점 6~0 · 3줄 · 상한 6, 기본 1줄 초등 6점', () => {
    assert.deepEqual(CHOICES.license.labels, ['초등 교원자격증', '중등 교원자격증', '특수 교원자격증', '특수(초등)교원자격증', '특수(중등)교원자격증', '보건 교원자격증', '영양 교원자격증', '사서 교원자격증', '전문상담 교원자격증']);
    assert.deepEqual(CHOICES.license.points, [6, 5, 4, 3, 2, 1, 0]);
    assert.equal(CHOICES.license.rows, 3); assert.equal(CHOICES.license.max, 6);
    assert.deepEqual(preset.choices.license, CHOICES.license, '화면은 /config 프리셋으로 목록을 받는다');
    const item = preset.rubrics.document[0];
    assert.deepEqual([item.label, item.choose, item.kind, item.max, item.print.rows], ['전공/부전공 여부', 'license', 'pick', 6, 3]);
    assert.deepEqual(item.options, [{ label: '초등 교원자격증', points: 6 }]);
    const r = d.createRecruitment({ school: 'ㄱ초', title: 't', field: 'f', recruitType: '기간제교사', subject: '담임', documentDate: '2026-10-20', interviewDate: '2026-10-22', rankingBasis: 'combined', shortlistLimit: 1, allowBonus: false, preset: 'contract-teacher',
        candidates: [{ code: '담임01', name: '가' }], reviewers: [{ name: '위원', position: '교사', stages: ['document', 'interview', 'demo'] }] });
    assert.deepEqual(r.rubrics.document[0].options, [{ label: '초등 교원자격증', points: 6 }]); assert.equal(r.rubrics.document[0].choose, 'license');
});

test('담당자가 고른 줄로 저장하고, 목록 밖 이름·배점·줄 수·중복·상한 변경은 서버가 거부한다', () => {
    const r = create(THREE);
    const c = r.rubrics.document[0];
    assert.deepEqual(c.options, THREE); assert.equal(c.max, 6); assert.equal(c.guide, '초등 교원자격증(6점)\n특수(초등)교원자격증(4점)\n보건 교원자격증(0점)');
    assert.throws(() => create([{ label: '고등 교원자격증', points: 6 }]), /목록에 있는 이름/);
    assert.throws(() => create([{ label: '초등 교원자격증', points: 7 }]), /6·5·4·3·2·1·0/);
    assert.throws(() => create([{ label: '초등 교원자격증', points: 2.5 }]), /6·5·4·3·2·1·0/);
    assert.throws(() => create([...THREE, { label: '사서 교원자격증', points: 1 }]), /1~3줄/);
    assert.throws(() => create([]), /1~3줄/);
    assert.throws(() => create([{ label: '초등 교원자격증', points: 6 }, { label: '초등 교원자격증', points: 5 }]), /두 번/);
    const rub = withLicense(THREE); rub.document[0] = { ...rub.document[0], max: 5 };
    assert.throws(() => create(THREE, { rubrics: rub }), /6점으로 고정/);
    const bad = withLicense(THREE); bad.document[0] = { ...bad.document[0], choose: 'nope' };
    assert.throws(() => create(THREE, { rubrics: bad }), /줄 고르기/);
});

test('위원은 그 줄 중 하나 또는 해당 없음(0점)을 고른다', () => {
    const r = create(THREE); r.status = 'document';
    const v = r.reviewers[0].id, cid = r.candidates[0].id;
    const picks = Object.fromEntries(r.rubrics.document.map(x => [x.id, 0]));
    const score = pick => { d.saveEvaluation(r, v, 'document', [{ candidateId: cid, attendance: 'present', picks: { ...picks, c1: pick }, bonus: 0, note: '' }]); return r.evaluations[`document:${v}`].rows[0].scores.c1; };
    assert.equal(score(1), 4); assert.equal(score(2), 0); assert.equal(score(-1), 0); assert.equal(score(0), 6);
    assert.throws(() => score(3), /심사관점을 다시/);
});

test('출력물: 고른 자격증 이름·배점이 원본 B8:B10 · C8:C10 칸에 찍힌다(인쇄 HTML·HWPX·Excel)', async () => {
    const r = buildContractSample({ candidates: 3, reviewers: 2, rubrics: withLicense(THREE.slice(0, 2)) });
    const s = r.snapshot;
    const sheet = contractPages(s).find(p => p.title === '계약제교원 채용 서류전형 평가표').blocks[0].table;
    const body = sheet.rows.slice(2, 5);
    assert.equal(body[0].cells[0].v, preset.rubrics.document[0].head); assert.equal(body[0].cells[0].rs, 3, '평가 기준 칸이 세 줄을 덮는다');
    const viewAndPoints = row => { const i = row.cells.findIndex(c => c.k === 'view'); return [row.cells[i].v, row.cells[i + 1].v]; };
    assert.deepEqual(body.map(viewAndPoints),[['초등 교원자격증', '6'], ['특수(초등)교원자격증', '4'], ['', '']], '셋째 줄은 빈 줄(원본 rows 3)');
    const html = (await exportResult(r, 'html')).buffer.toString();
    assert.ok(html.includes('특수(초등)교원자격증'));
    const zip = await JSZip.loadAsync((await exportResult(r, 'hwpx')).buffer);
    const xml = (await Promise.all(Object.keys(zip.files).filter(n => /^Contents\/section\d+\.xml$/.test(n)).map(n => zip.file(n).async('string')))).join('');
    assert.ok(xml.includes('특수(초등)교원자격증'));
    const { SaxesParser } = require('saxes');
    for (const n of Object.keys(zip.files).filter(n => /\.(xml|hpf)$/.test(n))) { const p = new SaxesParser({ xmlns: true }); let err = null; p.on('error', e => { err = e; }); p.write(await zip.file(n).async('string')).close(); assert.equal(err, null, n); }
    const wb = new ExcelJS.Workbook(); await wb.xlsx.load((await exportResult(r, 'xlsx')).buffer);
    const values = []; wb.getWorksheet('서류전형 집계표').eachRow(row => row.eachCell(c => values.push(c.value)));
    assert.ok(values.includes('특수(초등)교원자격증') && values.includes('초등 교원자격증'));
    // 샘플 심사표는 프리셋 기본(초등 6점 한 줄)으로 나온다.
    const sample = (await exportResult(buildSample('contract-teacher', ''), 'html')).buffer.toString();
    assert.ok(sample.includes('초등 교원자격증') && !sample.includes('특수(초등)교원자격증'));
});

test('이미 저장된 채용(choose 없는 옛 rubrics)은 그대로 읽힌다', () => {
    const r = buildContractSample({ candidates: 2, reviewers: 1 });
    const old = structuredClone(r.rubrics); delete old.document[0].choose;
    assert.equal(d.parseRubrics(old, ['document'], preset.rubrics).document[0].choose, undefined);
});

test('화면: 계약제 서류 편집기의 이 항목만 줄 고르기 UI(이름·배점 드롭다운 3줄, 중복 막기)', () => {
    const app = fs.readFileSync(path.join(__dirname, '../../public/recruitment/app.js'), 'utf8');
    assert.match(app, /if \(item\.choose && choiceOf\(item\.choose\)\) return choiceRow\(item\);/);
    assert.match(app, /name="choice-label"/); assert.match(app, /name="choice-points"/);
    assert.match(app, /function syncChoiceRow/);
});
