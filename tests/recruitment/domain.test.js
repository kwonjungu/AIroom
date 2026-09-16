'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const d = require('../../lib/recruitment/domain');
const { provision } = require('../../lib/recruitment/providers/mock');
function input(overrides = {}) { return { school: '테스트학교', title: '테스트 채용', field: '협력강사', documentDate: '2026-09-20', interviewDate: '2026-09-21', rankingBasis: 'combined', shortlistLimit: 2, allowBonus: false, candidates: [{ code: '001', name: '동명이인' }, { code: '002', name: '동명이인' }], reviewers: [{ name: '위원1', position: '교사', email: 'one@example.com', stages: ['document', 'interview'] }, { name: '위원2', position: '교사', email: 'two@example.com', stages: ['document', 'interview'] }], ...overrides }; }
function rows(r, stage, fraction = 1) { return d.stageCandidates(r, stage).map(c => ({ candidateId: c.id, attendance: 'present', scores: Object.fromEntries(d.DEFAULT_RUBRICS[stage].map((v, i) => ({ ...v, id: `c${i + 1}` })).map(x => [x.id, x.max * fraction])), bonus: 0, note: '' })); }
// 위원마다 다른 바이트를 써야 '남의 서명이 새는지'를 실제로 구분할 수 있다.
const signatureFor = seed => 'data:image/png;base64,' + Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(400, seed)]).toString('base64');
const SIGNATURE = signatureFor(9);
function signAll(r) { r.reviewers.forEach((v, i) => { if (!v.pledge) d.signPledge(r, v.id, signatureFor(i + 20)); }); return r; }
function submitAll(r, stage) { signAll(r); for (const v of r.reviewers.filter(v => v.stages.includes(stage))) { d.saveEvaluation(r, v.id, stage, rows(r, stage)); d.submitEvaluation(r, v.id, stage); } return r; }
test('validates duplicate codes, dates, reviewer assignments and capacity', () => {
    assert.throws(() => d.createRecruitment(input({ candidates: [{ code: '1', name: '가' }, { code: '1', name: '나' }] })), /중복/);
    assert.throws(() => d.createRecruitment(input({ documentDate: '2026-02-30' })), /날짜/);
    assert.throws(() => d.createRecruitment(input({ shortlistLimit: 5 })), /최대 4명/);
    assert.throws(() => d.createRecruitment(input({ reviewers: [{ name: '가', position: '교사', email: 'x@e.com', stages: ['document'] }] })), /각 전형/);
    // 사용자 확정 사양(2026-09-17): 평가위원 최대 5명. 5명은 되고 6명은 거부.
    const five = Array.from({ length: 5 }, (_, i) => ({ name: '위원' + i, position: '교사', stages: ['document', 'interview'] }));
    assert.equal(d.createRecruitment(input({ reviewers: five })).reviewers.length, 5);
    assert.throws(() => d.createRecruitment(input({ reviewers: [...five, { name: '위원6', position: '교사', stages: ['document'] }] })), /1~5명/);
});
test('unsubmitted reviewers never reduce an average to zero; duplicate names retain identity', () => {
    const r = provision(d.createRecruitment(input())); const v = r.reviewers[0];
    signAll(r); d.saveEvaluation(r, v.id, 'document', rows(r, 'document')); d.submitEvaluation(r, v.id, 'document');
    assert.equal(d.totals(r, 'document')[0].score, null); assert.equal(d.totals(r, 'document')[0].submitted, 1);
    assert.throws(() => d.selectShortlist(r, [r.candidates[0].id], '상위'), /모든 위원/);
    const v2 = r.reviewers[1]; signAll(r); d.saveEvaluation(r, v2.id, 'document', rows(r, 'document', .5)); d.submitEvaluation(r, v2.id, 'document');
    assert.deepEqual(d.totals(r, 'document').map(v => v.score), [37.5, 37.5]); assert.deepEqual(d.totals(r, 'document').map(v => v.rank), [1, 1]);
    assert.notEqual(r.candidates[0].id, r.candidates[1].id);
});
test('null and zero differ; finite scores, caps, bonus threshold and reasons enforced', () => {
    const r = signAll(provision(d.createRecruitment(input({ allowBonus: true })))), v = r.reviewers[0]; const draft = rows(r, 'document'); draft[0].scores.c1 = null;
    d.saveEvaluation(r, v.id, 'document', draft); assert.throws(() => d.submitEvaluation(r, v.id, 'document'), /누락/);
    draft[0].scores.c1 = 7; assert.throws(() => d.saveEvaluation(r, v.id, 'document', draft), /0~6/);
    draft[0].scores.c1 = Infinity; assert.throws(() => d.saveEvaluation(r, v.id, 'document', draft), /0~6/);
    const low = rows(r, 'document', 0); low[0].bonus = 5; low[0].note = '확인'; d.saveEvaluation(r, v.id, 'document', low); assert.throws(() => d.submitEvaluation(r, v.id, 'document'), /20점/);
    const zero = rows(r, 'document', 0); d.saveEvaluation(r, v.id, 'document', zero); d.submitEvaluation(r, v.id, 'document'); assert.ok(r.evaluations[`document:${v.id}`].submittedAt);
});
test('absence disagreement blocks transition; all-absent is excluded', () => {
    const r = signAll(provision(d.createRecruitment(input())));
    r.reviewers.forEach((v, i) => { const data = rows(r, 'document'); if (i === 0) data[0] = { candidateId: r.candidates[0].id, attendance: 'absent', note: '미참석' }; d.saveEvaluation(r, v.id, 'document', data); d.submitEvaluation(r, v.id, 'document'); });
    assert.ok(d.totals(r, 'document').find(c => c.code === '001').conflict);
    assert.throws(() => d.selectShortlist(r, [r.candidates[1].id], '확인'), /참석\/불참/);
    d.reopen(r, r.reviewers[1].id, 'document', '출석 확인'); const data = rows(r, 'document'); data[0] = { candidateId: r.candidates[0].id, attendance: 'absent', note: '확인' }; d.saveEvaluation(r, r.reviewers[1].id, 'document', data); d.submitEvaluation(r, r.reviewers[1].id, 'document');
    assert.equal(d.totals(r, 'document').find(c => c.code === '001').rank, null);
    assert.throws(() => d.selectShortlist(r, [r.candidates[0].id], '불참자'), /불참자/);
});
test('submission locks, reopen requires reason, final snapshot is immutable and rank uses configured basis', () => {
    const r = provision(d.createRecruitment(input())); submitAll(r, 'document');
    assert.throws(() => d.saveEvaluation(r, r.reviewers[0].id, 'document', rows(r, 'document')), /제출한 평가/);
    assert.throws(() => d.reopen(r, r.reviewers[0].id, 'document', ''), /재개방 사유/);
    d.selectShortlist(r, r.candidates.map(c => c.id), '동점자 모두 면접'); assert.throws(() => d.reopen(r, r.reviewers[0].id, 'document', '변경'), /현재 진행/);
    submitAll(r, 'interview'); d.finalize(r); const snapshot = JSON.stringify(r.snapshot); d.finalize(r); assert.equal(JSON.stringify(r.snapshot), snapshot);
    assert.equal(r.snapshot.results[0].total, 100); assert.equal(r.snapshot.results[0].rank, 1); assert.equal(r.snapshot.results[1].rank, 1);
    assert.throws(() => d.reopen(r, r.reviewers[0].id, 'interview', '변경'), /현재 진행/);
});
test('combined rank differs from interview rank when configured', () => {
    const r = signAll(provision(d.createRecruitment(input())));
    for (const v of r.reviewers) { const data = rows(r, 'document'); data[1].scores.c5 = 0; d.saveEvaluation(r, v.id, 'document', data); d.submitEvaluation(r, v.id, 'document'); }
    d.selectShortlist(r, r.candidates.map(c => c.id), '2명 모두 선정');
    for (const v of r.reviewers) { const data = rows(r, 'interview'); data[0].scores.c1 = 5; d.saveEvaluation(r, v.id, 'interview', data); d.submitEvaluation(r, v.id, 'interview'); }
    assert.equal(d.finalResults(r)[0].code, '001'); r.rules.rankingBasis = 'interview'; assert.equal(d.finalResults(r)[0].code, '002');
});

test('a reviewer never receives another reviewer signature, not even inside the final snapshot', () => {
    const r = signAll(provision(d.createRecruitment(input())));
    submitAll(r, 'document');
    d.selectShortlist(r, r.candidates.map(c => c.id), '전원 면접');
    submitAll(r, 'interview'); d.finalize(r);
    const me = r.reviewers[0], other = r.reviewers[1];
    const mine = d.publicView(r, { role: 'reviewer', id: me.id });
    const find = (list, id) => list.find(v => v.id === id);
    assert.ok(find(mine.reviewers, me.id).pledge.image, '본인 서명은 보여야 한다');
    assert.equal(find(mine.reviewers, other.id).pledge.image, undefined);
    assert.ok(find(mine.reviewers, other.id).pledge.signedAt, '서명 여부와 시각은 공유한다');
    assert.equal(find(mine.snapshot.reviewers, other.id).pledge.image, undefined);
    assert.ok(!JSON.stringify(mine).includes(other.pledge.image));
    const admin = d.publicView(r, { role: 'admin', id: 'admin' });
    assert.ok(find(admin.reviewers, other.id).pledge.image, '관리자는 전부 본다');
    assert.ok(find(admin.snapshot.reviewers, other.id).pledge.image);
});
test('rubrics are stored per recruitment and drive validation, totals and the bonus threshold', () => {
    const custom = { document: [{ label: '학력', max: 10 }, { label: '연수 이수', max: 5 }], interview: [{ label: '수업 실연', max: 30 }] };
    const r = d.createRecruitment(input({ rubrics: custom, allowBonus: true }));
    assert.deepEqual(r.rubrics.document.map(v => v.id), ['c1', 'c2']);
    assert.equal(d.stageTotal(r.rubrics, 'document'), 15);
    assert.equal(r.rules.bonusThreshold, 6, '가점 문턱은 서류 총점의 40%');
    assert.throws(() => d.createRecruitment(input({ rubrics: { document: [{ label: '가', max: 3 }, { label: '가', max: 3 }] } })), /중복/);
    assert.throws(() => d.createRecruitment(input({ rubrics: { document: [{ label: '가', max: 3.3 }] } })), /0.5점 단위/);
    assert.throws(() => d.createRecruitment(input({ rubrics: { document: Array.from({ length: 13 }, (v, i) => ({ label: '항목' + i, max: 1 })) } })), /1~12개/);
    const v = r.reviewers[0]; d.signPledge(r, v.id, SIGNATURE); provision(r);
    const rows = r.candidates.map(c => ({ candidateId: c.id, attendance: 'present', scores: { c1: 10, c2: 5 }, bonus: 0, note: '' }));
    d.saveEvaluation(r, v.id, 'document', rows);
    assert.throws(() => d.saveEvaluation(r, v.id, 'document', r.candidates.map(c => ({ candidateId: c.id, attendance: 'present', scores: { c1: 11, c2: 5 }, bonus: 0, note: '' }))), /0~10/);
});
module.exports = { input, rows, submitAll, signAll, SIGNATURE, signatureFor };
