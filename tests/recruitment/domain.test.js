'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const d = require('../../lib/recruitment/domain');
const { provision } = require('../../lib/recruitment/providers/mock');
function input(overrides = {}) { return { school: '테스트학교', title: '테스트 채용', field: '협력강사', documentDate: '2026-09-20', interviewDate: '2026-09-21', rankingBasis: 'combined', shortlistLimit: 2, allowBonus: false, candidates: [{ code: '001', name: '동명이인' }, { code: '002', name: '동명이인' }], reviewers: [{ name: '위원1', position: '교사', email: 'one@example.com', stages: ['document', 'interview'] }, { name: '위원2', position: '교사', email: 'two@example.com', stages: ['document', 'interview'] }], rubrics: JUDGE_RUBRICS, ...overrides }; }
// 기존 검사는 '위원이 점수를 직접 넣는' 규칙을 본다. 프리셋의 pick·sum 항목은 점수를 서버가 계산하므로
// 여기서는 같은 항목·배점을 전부 재량(judge) 항목으로 바꿔 쓴다. pick·sum 은 아래 '심사관점' 검사가 본다.
const JUDGE_RUBRICS = Object.fromEntries(Object.entries(d.DEFAULT_RUBRICS).map(([stage, items]) => [stage, items.map(({ label, max }) => ({ label, max, kind: 'judge' }))]));
// 프리셋 그대로 만점을 받는 심사관점 선택. pick 은 가장 높은 줄, sum 은 배점까지 채운다.
function fullPicks(rubrics) {
    const picks = {};
    for (const c of rubrics) {
        if (c.kind === 'pick') picks[c.id] = c.options.reduce((best, o, i) => o.points > c.options[best].points ? i : best, 0);
        if (c.kind === 'sum') { let left = c.max; picks[c.id] = c.options.map(o => { const n = Math.min(o.unit ? 99 : 1, Math.ceil(left / o.points)); left = Math.max(0, left - n * o.points); return n; }); }
    }
    return picks;
}
function rows(r, stage, fraction = 1) { return d.stageCandidates(r, stage).map(c => ({ candidateId: c.id, attendance: 'present', scores: Object.fromEntries(r.rubrics[stage].map(x => [x.id, x.max * fraction])), picks: fullPicks(r.rubrics[stage]), bonus: 0, note: '' })); }
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
test('preset viewpoints: the server scores from the picked 심사관점, not from what the screen sends', () => {
    const r = signAll(provision(d.createRecruitment(input({ rubrics: undefined })))), v = r.reviewers[0];
    const [edu, cert, career] = r.rubrics.document;
    assert.deepEqual([edu.kind, cert.kind, career.kind, r.rubrics.document[3].kind], ['pick', 'sum', 'sum', 'judge']);
    // guide 는 원본 표기 그대로 다시 써진다 — 화면·문서가 같은 글을 보여 준다.
    assert.match(edu.guide, /^채용 관련 전공 대학원 졸업\(6점\)/);
    const data = rows(r, 'document');
    // 4년제 관련 전공(5점) · 초등+채용 관련 자격증 5건 = 8 → 상한 6 · 경력 4년 = 4
    data[0].picks = { c1: 1, c2: [1, 0, 0, 5], c3: [4] }; data[0].scores = { c1: 6, c2: 6, c3: 6, c4: 3, c5: 20 };
    data[1].picks = { c1: -1, c2: [0, 0, 0, 0], c3: [0] };
    d.saveEvaluation(r, v.id, 'document', data);
    const saved = r.evaluations[`document:${v.id}`].rows;
    assert.deepEqual([saved[0].scores.c1, saved[0].scores.c2, saved[0].scores.c3], [5, 6, 4]);
    assert.deepEqual([saved[1].scores.c1, saved[1].scores.c2, saved[1].scores.c3], [0, 0, 0]);
    assert.deepEqual(saved[0].picks.c2, [1, 0, 0, 5]);
    // 고르지 않은 pick 은 '아직 안 넣음'이라 제출을 막는다. 해당 없음(-1)은 0점으로 통과한다.
    const blank = rows(r, 'document'); blank[0].picks = { ...blank[0].picks, c1: null };
    d.saveEvaluation(r, v.id, 'document', blank); assert.throws(() => d.submitEvaluation(r, v.id, 'document'), /심사관점을 고르지/);
    for (const bad of [{ c1: 6 }, { c2: [1, 0, 0] }, { c2: [2, 0, 0, 0] }, { c3: [1.5] }]) {
        const x = rows(r, 'document'); x[0].picks = { ...x[0].picks, ...bad };
        assert.throws(() => d.saveEvaluation(r, v.id, 'document', x), /심사관점을 다시|0 또는 1|0~99/);
    }
});
test('rubric viewpoints are validated: kind, option points within the item max, no duplicates', () => {
    const doc = items => input({ rubrics: { document: items } });
    assert.throws(() => d.createRecruitment(doc([{ label: '가', max: 3, kind: 'rank' }])), /채점 방식/);
    assert.throws(() => d.createRecruitment(doc([{ label: '가', max: 3, kind: 'pick', options: [] }])), /1~12줄/);
    assert.throws(() => d.createRecruitment(doc([{ label: '가', max: 3, kind: 'pick', options: [{ label: 'a', points: 4 }] }])), /0.5~3점/);
    assert.throws(() => d.createRecruitment(doc([{ label: '가', max: 3, kind: 'sum', options: [{ label: 'a', points: 1 }, { label: 'a', points: 2 }] }])), /중복/);
    // kind 가 없던 옛 채용 항목은 재량 점수로 읽는다.
    assert.equal(d.createRecruitment(doc([{ label: '가', max: 3 }])).rubrics.document[0].kind, 'judge');
});
module.exports = { input, rows, fullPicks, submitAll, signAll, SIGNATURE, signatureFor };
