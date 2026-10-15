'use strict';
// 계약제 교원 채용 표준: 원본(계약제교원 채용 [지원12, 심사3] 프로그램) 기준·배점과 쪽 나눔 규칙을 지키는지 본다.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const JSZip = require('jszip');
const domain = require('../../lib/recruitment/domain');
const { presetById } = require('../../lib/recruitment/presets');
const { buildContractSample, buildSample } = require('../../lib/recruitment/sample');
const { exportResult } = require('../../lib/recruitment/exports');
const { contractPages, fits, pageHeight } = require('../../public/recruitment/contract-sheets');

const count = (pages, title) => pages.filter(p => p.title === title).length;
const T = { doc: '계약제교원 채용 서류전형 평가표', sum: '계약제교원 채용 서류전형 평가 집계표', int: '계약제교원 채용 면접 기준 및 평가표',
    demo: '계약제교원 채용 수업실연 기준 및 평가표', app: '계약제교원 채용 [응모자별 평가 집계표]', subj: '계약제교원 채용 [교과목별 평가 집계표]' };

test('원본 배점 그대로: 서류 30 · 면접 40 · 수업실연 30 = 100, 가점은 전형별 목록', () => {
    const p = presetById('contract-teacher');
    assert.equal(p.name, '계약제 교원 채용 표준');
    const total = stage => p.rubrics[stage].reduce((a, c) => a + c.max, 0);
    assert.deepEqual([total('document'), total('interview'), total('demo')], [30, 40, 30]);
    assert.deepEqual(p.rubrics.document[1].options.map(o => o.points), [6, 5, 2], '학위: 석사 6 · 학사 5 · 없음 2');
    assert.deepEqual(p.rubrics.document[4].options.map(o => o.points), [6, 4, 2, 0], '기타(전임교): 원본 R열 목록');
    assert.deepEqual(p.bonus.interview.options.map(o => o.points), [4, 2]);
    const r = buildContractSample({ candidates: 3, reviewers: 1 });
    assert.deepEqual(Object.fromEntries(Object.entries(r.rules.bonusByStage).map(([k, v]) => [k, v.threshold])), { document: 12, interview: 16, demo: 12 }, '40% 문턱 = 12·16·12점');
});

test('세 전형을 차례로: 수업실연은 면접과 같은 단계에서 채점하고, 계 = 서류 + 면접 + 수업실연', () => {
    const r = buildContractSample({ candidates: 12, reviewers: 3 });
    assert.equal(r.status, 'finalized');
    for (const row of r.snapshot.results.filter(x => !x.bonusExcluded)) assert.equal(row.total, Math.round((row.document + row.interview + row.demo) * 10) / 10);
    assert.equal(r.snapshot.results.length, 4, '면접 대상자 4명');
});

test('점수 칩(scale)은 목록 밖 값을 받지 않고, 가점도 전형 목록에서만', () => {
    const r = buildContractSample({ candidates: 3, reviewers: 1 });
    const fresh = domain.createRecruitment({ school: 'ㄱ초', title: 't', field: '기간제교사(담임)', recruitType: '기간제교사', subject: '담임', documentDate: '2026-10-20', interviewDate: '2026-10-22',
        rankingBasis: 'combined', shortlistLimit: 1, allowBonus: true, preset: 'contract-teacher', candidates: [{ code: '담임01', name: '가' }], reviewers: [{ name: '위원', position: '교사', stages: ['document', 'interview', 'demo'] }] });
    fresh.status = 'document';
    const v = fresh.reviewers[0].id, c = fresh.candidates[0].id;
    const picks = Object.fromEntries(fresh.rubrics.document.map(x => [x.id, x.kind === 'pick' ? 0 : 0]));
    assert.throws(() => domain.saveEvaluation(fresh, v, 'document', [{ candidateId: c, attendance: 'present', picks: { ...picks, c6: 99 }, bonus: 0, note: '' }]), /점수를 다시/);
    assert.throws(() => domain.saveEvaluation(fresh, v, 'document', [{ candidateId: c, attendance: 'present', picks, bonus: 2.5, note: '근거' }]), /3·1.5/);
    domain.saveEvaluation(fresh, v, 'document', [{ candidateId: c, attendance: 'present', picks, bonus: 1.5, note: '근거' }]);
    assert.ok(r);
});

test('10명 한 장: 1~10명 1장, 11명 2장, 21명 3장(위원마다) — 집계표도 같은 규칙', () => {
    for (const [n, sheets] of [[1, 1], [10, 1], [11, 2], [20, 2], [21, 3]]) {
        const pages = contractPages(buildContractSample({ candidates: n, reviewers: 2 }).snapshot);
        assert.equal(count(pages, T.doc), sheets * 2, `${n}명 서류전형 평가표`);
        assert.equal(count(pages, T.sum), sheets, `${n}명 집계표`);
    }
});

test('용지 방향: 서류전형·집계표는 가로, 나머지는 세로', () => {
    const pages = contractPages(buildContractSample({ candidates: 12, reviewers: 3 }).snapshot);
    for (const p of pages) assert.equal(p.orient, [T.doc, T.sum].includes(p.title) ? 'landscape' : 'portrait', p.title);
});

test('위원 1~5명: 집계표 칸·응모자별 줄이 위원 수만큼, 극한값(지원자 100명 · 위원 5명)까지 모든 쪽이 A4 안', () => {
    for (const m of [1, 2, 3, 4, 5]) for (const n of [1, 9, 10, 11, 60, 100]) {
        const s = buildContractSample({ candidates: n, reviewers: m }).snapshot, pages = contractPages(s);
        const over = pages.filter(p => p.type !== 'pledge' && !fits(p));
        assert.equal(over.length, 0, `${n}명·${m}위원 넘침: ${over.map(p => `${p.title} ${pageHeight(p).toFixed(1)}mm`).join(', ')}`);
        const sum = pages.find(p => p.title === T.sum);
        assert.equal(sum.blocks[0].table.cols.length, 3 + 10 * m, '집계표 칸 = 평가 기준 3칸 + 10명 × 위원');
        const block = pages.find(p => p.title === T.app).blocks[0];
        assert.equal(block.table.rows.length, 2 + m + 2, '응모자별 표 = 머리 2줄 + 위원 줄 + 합계·평균');
    }
});

test('응모자별 표는 넘치면 다음 장으로: 위원 3명은 원본처럼 한 장에 3명, 5명이면 2명', () => {
    const per = m => contractPages(buildContractSample({ candidates: 12, reviewers: m }).snapshot).filter(p => p.title === T.app).map(p => p.blocks.length);
    assert.deepEqual(per(3), [3, 1]);
    assert.deepEqual(per(5), [2, 2]);
});

test("한 영역이라도 40% 미만이면 가산점을 빼고 계를 낸다", () => {
    const r = buildContractSample({ candidates: 4, reviewers: 1, shortlist: 1 });
    const s = structuredClone(r.snapshot);
    // 면접 기본 점수를 문턱(16점) 아래로 낮춘 상황을 흉내 낸다.
    const x = s.results[0];
    const recomputed = (() => { const t = { ...r, ...s, rules: s.rules, layout: 'contract', stages: s.stages, rubrics: s.rubrics, evaluations: s.evaluations, shortlist: s.shortlist, candidates: s.candidates, reviewers: s.reviewers };
        for (const ev of Object.values(t.evaluations)) if (ev.stage === 'interview') for (const row of ev.rows) { for (const k of Object.keys(row.scores)) row.scores[k] = 2; row.bonus = 2; }
        return domain.finalResults(t).find(y => y.candidateId === x.candidateId); })();
    assert.equal(recomputed.bonusExcluded, true);
    assert.ok(recomputed.total < recomputed.document + recomputed.interview + recomputed.demo, '가점을 뺀 평균으로 더한다');
});

test('출력물: HWPX 는 방향이 바뀔 때마다 구역을 나누고(세로·가로·세로), HTML 은 쪽마다 방향 지정', async () => {
    const r = buildContractSample({ candidates: 11, reviewers: 4 });
    const zip = await JSZip.loadAsync((await exportResult(r, 'hwpx')).buffer);
    const sections = Object.keys(zip.files).filter(n => /^Contents\/section\d+\.xml$/.test(n)).sort();
    assert.equal(sections.length, 3);
    const flags = await Promise.all(sections.map(async n => /landscape="(\w+)"/.exec(await zip.file(n).async('string'))[1]));
    assert.deepEqual(flags, ['WIDELY', 'NARROWLY', 'WIDELY']);
    const html = (await exportResult(r, 'html')).buffer.toString();
    assert.equal((html.match(/class="page land"/g) || []).length, 8 + 2, '서류전형 4위원×2장 + 집계표 2장');
    assert.ok(html.includes('임용심사위원 서약서') && html.includes('『기간제교원』'));
    assert.ok((await exportResult(r, 'xlsx')).buffer.length > 1000);
});

test('면접 대상자는 최대 10명(강사 채용 표준은 4명): 10명이면 위원마다 면접·수업실연 표 4장, 저작권 표기 없음', async () => {
    const r = buildContractSample({ candidates: 60, reviewers: 5, shortlist: 10 });
    assert.equal(r.snapshot.shortlist.length, 10);
    const pages = contractPages(r.snapshot);
    assert.equal(count(pages, T.int), 5 * 4); assert.equal(count(pages, T.demo), 5 * 4);
    assert.equal(pages.filter(p => p.type !== 'pledge' && !fits(p)).length, 0);
    assert.equal(r.snapshot.results.length, 10);
    assert.ok(!(await exportResult(r, 'html')).buffer.toString().includes('KHSDO'), '저작권 표기 줄 없음');
    assert.throws(() => domain.createRecruitment({ school: 'ㄱ', title: 't', field: 'f', recruitType: '기간제교사', subject: '담임', documentDate: '2026-10-20', interviewDate: '2026-10-22', rankingBasis: 'combined', shortlistLimit: 11, allowBonus: false, preset: 'contract-teacher',
        candidates: Array.from({ length: 12 }, (x, i) => ({ code: String(i), name: 'n' + i })), reviewers: [{ name: 'a', position: 'b', stages: ['document', 'interview', 'demo'] }] }), /최대 10명/);
});

test('샘플 버튼: 계약제 표준을 고르면 원본과 같은 지원자 12명 · 위원 3명 예시로 확정까지 간다', () => {
    const r = buildSample('contract-teacher', '시간강사(영어)');
    assert.equal(r.status, 'finalized'); assert.equal(r.field, '시간강사(영어)');
    assert.equal(r.candidates.length, 12); assert.equal(r.reviewers.length, 3);
    assert.equal(r.candidates[0].code, '영어01', '관리번호 = 과목 + 순번(원본 C열)');
});

test('강사 채용 표준(기존)은 그대로 두 전형이고 지원자 20명 상한도 그대로', () => {
    const r = buildSample('standard', '방과후[컴퓨터]');
    assert.equal(r.stages, undefined); assert.equal(r.layout, undefined);
    assert.throws(() => domain.createRecruitment({ school: 'ㄱ', title: 't', field: 'f', documentDate: '2026-10-20', interviewDate: '2026-10-22', rankingBasis: 'combined', shortlistLimit: 1, allowBonus: false,
        candidates: Array.from({ length: 21 }, (x, i) => ({ code: String(i), name: 'n' + i })), reviewers: [{ name: 'a', position: 'b', stages: ['document', 'interview'] }] }), /1~20명/);
});
