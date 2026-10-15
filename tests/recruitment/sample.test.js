'use strict';
// 샘플 심사표: 원본 시트의 모든 영역 프리셋으로 가상 채용을 끝까지 돌려 출력물이 나오는지 본다.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { PRESETS, presetById } = require('../../lib/recruitment/presets');
const { buildSample } = require('../../lib/recruitment/sample');
const { exportResult } = require('../../lib/recruitment/exports');

test('강사 채용 표준과 계약제 교원 채용 표준 둘을 두고, 영역은 비워 둔다(사람이 직접 적는다)', () => {
    assert.deepEqual(PRESETS.map(p => p.id), ['standard', 'contract-teacher']);
    assert.deepEqual(PRESETS.map(p => p.name), ['강사 채용 표준', '계약제 교원 채용 표준']);
    assert.equal(PRESETS[0].id, 'standard'); assert.equal(PRESETS[0].field, '');
    assert.equal(presetById('basic-literacy'), PRESETS[0], '예전 영역 id 는 표준 심사표로 연다');
});
test('샘플은 화면에 적은 영역으로 확정까지 가고 HTML·한/글로 나온다', async () => {
    for (const area of ['문화예술강사[국악]', '']) {
        const r = buildSample('standard', area), name = area || '○○ 강사';
        assert.equal(r.status, 'finalized'); assert.equal(r.field, name);
        assert.equal(r.snapshot.results.filter(x => x.total !== null).length, 3, '면접대상자 3명');
        const html = (await exportResult(r, 'html')).buffer.toString();
        assert.ok(html.includes(`${name} 채용 서류심사 집계표`) && html.includes('일강사'));
        assert.ok(html.includes('(서명 또는 인)'), '샘플은 서명 이미지 없이 빈칸');
    }
    const hwpx = await exportResult(buildSample('standard', '돌봄 강사[생활체육]'), 'hwpx');
    assert.ok(hwpx.buffer.length > 1000);
});
test('없는 심사표는 거부한다', () => { assert.throws(() => buildSample('nope'), /심사표/); });
test('강사 채용 표준: 집계표 용지를 고른다 — 세로는 원본 40칸, 가로는 위원 수와 상관없이 10명씩', () => {
    const { summaryPages, printPages } = require('../../public/recruitment/sheets');
    const domain = require('../../lib/recruitment/domain');
    const make = summaryOrient => domain.createRecruitment({ school: 'ㄱ초', title: 't', field: '방과후[컴퓨터]', documentDate: '2026-10-20', interviewDate: '2026-10-22', rankingBasis: 'combined', shortlistLimit: 4, allowBonus: false, preset: 'standard', summaryOrient,
        candidates: Array.from({ length: 20 }, (x, i) => ({ code: String(i + 1).padStart(3, '0'), name: '지원' + i })), reviewers: Array.from({ length: 5 }, (x, i) => ({ name: '위원' + i, position: '교사', stages: ['document', 'interview'] })) });
    const snap = r => ({ ...r, documentResults: domain.totals(r, 'document'), results: [] });
    const port = summaryPages(snap(make()), 'document'), land = summaryPages(snap(make('landscape')), 'document');
    assert.deepEqual(port.map(p => p.orient), ['portrait', 'portrait', 'portrait'], '세로: 위원 5명이면 8·8·4명');
    assert.deepEqual(land.map(p => p.orient), ['landscape', 'landscape'], '가로: 10·10명');
    assert.ok(printPages(snap(make('landscape'))).filter(p => p.orient === 'landscape').every(p => /집계표|집계 합산/.test(p.title)), '가로는 집계표만');
});
