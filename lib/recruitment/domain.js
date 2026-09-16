'use strict';
const { randomUUID } = require('node:crypto');

// 기관마다 심사 항목이 다르므로 배점표는 채용마다 저장한다. 아래는 새 채용을 만들 때
// 화면에 미리 채워지는 기본값일 뿐이고, 집계는 언제나 r.rubrics 를 본다.
const DEFAULT_RUBRICS = {
    document: [{ label: '학력', max: 6 }, { label: '자격증', max: 6 }, { label: '경력', max: 6 }, { label: '지속 근무', max: 6 }, { label: '자기소개서', max: 26 }],
    interview: [{ label: '인성', max: 10 }, { label: '교직관', max: 10 }, { label: '소양', max: 10 }, { label: '수업 이해', max: 10 }, { label: '학생 이해', max: 10 }]
};
const STAGES = Object.keys(DEFAULT_RUBRICS);
const MAX_CRITERIA = 12;
class DomainError extends Error { constructor(message, status = 400) { super(message); this.status = status; } }
function assert(ok, message, status = 400) { if (!ok) throw new DomainError(message, status); }
function text(v, label, max = 100) { assert(typeof v === 'string' && v.trim().length > 0 && v.trim().length <= max, `${label}: 1~${max}자 이내로 입력하세요.`); return v.trim(); }
function date(v) { assert(typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !isNaN(Date.parse(v)) && new Date(v).toISOString().slice(0, 10) === v, '날짜를 확인하세요.'); return v; }
function audit(r, actor, action, detail = '') { r.audit.push({ at: new Date().toISOString(), actor, action, detail }); }
function half(v, label, min, max) { assert(typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max && Number.isInteger(v * 2), `${label}: ${min}~${max}점, 0.5점 단위로 입력하세요.`); return v; }
// 점수는 항목 id 로 저장되므로 id 에 사용자 입력이 섞이면 안 된다. 순번으로 만든다.
function parseRubrics(input) {
    const rubrics = {};
    for (const stage of STAGES) {
        const given = input?.[stage];
        const items = Array.isArray(given) && given.length ? given : DEFAULT_RUBRICS[stage];
        const name = stage === 'document' ? '서류심사' : '면접심사';
        assert(items.length >= 1 && items.length <= MAX_CRITERIA, `${name} 평가 항목은 1~${MAX_CRITERIA}개입니다.`);
        rubrics[stage] = items.map((item, index) => {
            assert(item && typeof item === 'object', `${name} 평가 항목을 확인하세요.`);
            return { id: `c${index + 1}`, label: text(item.label, `${name} 항목 이름`, 40), max: half(item.max, `${name} ${item.label} 배점`, 0.5, 100) };
        });
        assert(new Set(rubrics[stage].map(v => v.label)).size === rubrics[stage].length, `${name} 항목 이름이 중복됩니다.`);
    }
    return rubrics;
}
function stageTotal(rubrics, stage) { return round(rubrics[stage].reduce((sum, item) => sum + item.max, 0)); }
function createRecruitment(input, actor = 'admin') {
    assert(input && typeof input === 'object', '설정이 필요합니다.');
    const school = text(input.school, '학교명'), title = text(input.title, '채용명'), field = text(input.field, '채용 분야');
    const documentDate = date(input.documentDate), interviewDate = date(input.interviewDate);
    assert(interviewDate >= documentDate, '면접일은 서류전형일 이후여야 합니다.');
    assert(Array.isArray(input.candidates) && input.candidates.length >= 1 && input.candidates.length <= 20, '지원자는 1~20명입니다.');
    const candidates = input.candidates.map(c => { assert(c && typeof c === 'object', '지원자 정보를 확인하세요.'); return { id: randomUUID(), code: text(c.code, '접수번호', 30), name: text(c.name, '지원자명', 50) }; });
    assert(new Set(candidates.map(c => c.code)).size === candidates.length, '접수번호는 중복될 수 없습니다.');
    assert(Array.isArray(input.reviewers) && input.reviewers.length >= 1 && input.reviewers.length <= 8, '위원은 1~8명, 전형별 최대 4명입니다.');
    const reviewers = input.reviewers.map(v => {
        assert(v && typeof v === 'object', '위원 정보를 확인하세요.');
        const email = text(v.email, '이메일', 254).toLowerCase();
        assert(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email), '위원 이메일 형식을 확인하세요.');
        assert(Array.isArray(v.stages) && v.stages.length > 0 && v.stages.every(s => STAGES.includes(s)) && new Set(v.stages).size === v.stages.length, '위원의 담당 전형을 선택하세요.');
        return { id: randomUUID(), name: text(v.name, '위원명', 50), position: text(v.position, '직위', 50), email, stages: v.stages };
    });
    assert(new Set(reviewers.map(v => v.email)).size === reviewers.length, '위원 이메일은 중복될 수 없습니다. 같은 위원에게 두 전형을 배정하세요.');
    for (const stage of STAGES) assert(reviewers.filter(v => v.stages.includes(stage)).length >= 1 && reviewers.filter(v => v.stages.includes(stage)).length <= 4, '각 전형에 1~4명의 위원을 배정하세요.');
    assert(['combined', 'interview'].includes(input.rankingBasis), '최종 순위 기준을 선택하세요.');
    assert(Number.isInteger(input.shortlistLimit) && input.shortlistLimit >= 1 && input.shortlistLimit <= Math.min(4, candidates.length), '면접대상자는 지원자 수 이내, 최대 4명입니다.');
    assert(typeof input.allowBonus === 'boolean', '가점 사용 여부를 선택하세요.');
    const rubrics = parseRubrics(input.rubrics);
    // 가점 문턱은 서류 총점의 40%. 배점표를 바꿔도 기준이 같이 움직이도록 절대값으로 두지 않는다.
    const bonusThreshold = round(Math.round(stageTotal(rubrics, 'document') * 0.4 * 2) / 2);
    const r = { id: randomUUID(), version: 1, createdAt: new Date().toISOString(), school, title, field, documentDate, interviewDate, candidates, reviewers, rubrics,
        rules: { rankingBasis: input.rankingBasis, shortlistLimit: input.shortlistLimit, allowBonus: input.allowBonus, bonusThreshold, tiePolicy: 'competition-rank-manual-review', precision: 1 },
        status: 'draft', provider: 'mock', link: null, evaluations: {}, shortlist: [], snapshot: null, audit: [] };
    audit(r, actor, '채용 생성'); return r;
}
function stageCandidates(r, stage) { return stage === 'document' ? r.candidates : r.candidates.filter(c => r.shortlist.includes(c.id)); }
function assigned(r, reviewerId, stage) { return r.reviewers.some(v => v.id === reviewerId && v.stages.includes(stage)); }
function key(stage, reviewerId) { return `${stage}:${reviewerId}`; }
function requireStage(r, stage) { assert(STAGES.includes(stage) && r.status === stage, '현재 진행 중인 전형에서만 평가할 수 있습니다.', 409); }
function validateRows(r, stage, rows, complete) {
    assert(Array.isArray(rows), '평가 내용을 확인하세요.');
    assert(rows.every(row => row && typeof row === 'object'), '평가 행을 확인하세요.');
    const candidates = stageCandidates(r, stage);
    assert(rows.length === candidates.length && new Set(rows.map(row => row.candidateId)).size === rows.length, '모든 대상자의 평가 행이 한 번씩 필요합니다.');
    return rows.map(row => {
        assert(candidates.some(c => c.id === row.candidateId), '평가 대상자가 아닙니다.');
        assert(['present', 'absent'].includes(row.attendance), '참석 상태를 선택하세요.');
        const note = typeof row.note === 'string' ? row.note.trim() : '';
        assert(note.length <= 1000, '평가 메모는 1,000자 이내입니다.');
        if (row.attendance === 'absent') { assert(!complete || note.length > 0, '불참 사유를 입력하세요.'); return { candidateId: row.candidateId, attendance: 'absent', scores: {}, bonus: 0, note }; }
        assert(row.scores && typeof row.scores === 'object', '점수를 입력하세요.');
        const scores = {};
        for (const criterion of r.rubrics[stage]) {
            const value = row.scores[criterion.id];
            if (value === null || value === undefined || value === '') { assert(!complete, `${criterion.label} 점수가 누락됐습니다.`); scores[criterion.id] = null; }
            else { assert(typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= criterion.max && Number.isInteger(value * 2), `${criterion.label}: 0~${criterion.max}점, 0.5점 단위로 입력하세요.`); scores[criterion.id] = value; }
        }
        const bonus = row.bonus ?? 0;
        assert([0, 2.5, 5].includes(bonus), '가점은 0, 2.5, 5점만 가능합니다.');
        assert(bonus === 0 || (stage === 'document' && r.rules.allowBonus), '이 전형에는 가점을 적용할 수 없습니다.');
        if (bonus > 0) { assert(note.length > 0, '가점 확인 근거를 메모에 입력하세요.'); if (complete) assert(Object.values(scores).reduce((a, b) => a + b, 0) >= r.rules.bonusThreshold, '기본 점수가 20점 이상일 때 가점을 적용할 수 있습니다.'); }
        return { candidateId: row.candidateId, attendance: 'present', scores, bonus, note };
    });
}
function saveEvaluation(r, reviewerId, stage, rows) {
    requireStage(r, stage); assert(assigned(r, reviewerId, stage), '담당 위원이 아닙니다.', 403);
    const k = key(stage, reviewerId); assert(!r.evaluations[k]?.submittedAt, '제출한 평가입니다. 관리자에게 재개방을 요청하세요.', 409);
    r.evaluations[k] = { reviewerId, stage, rows: validateRows(r, stage, rows, false), updatedAt: new Date().toISOString(), submittedAt: null };
    audit(r, reviewerId, '평가 임시 저장', stage); return r;
}
const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const SIGNATURE_MAX_BYTES = 60 * 1024;
// The image is re-encoded from the decoded bytes, so only the pixels survive. Anything smuggled
// into the original data URI (a second payload, a different MIME type) is dropped here.
function signPledge(r, reviewerId, image) {
    assert(r.status !== 'finalized', '확정된 채용에는 서명할 수 없습니다.', 409);
    const reviewer = r.reviewers.find(v => v.id === reviewerId); assert(reviewer, '위원을 찾을 수 없습니다.', 404);
    const match = /^data:image\/png;base64,([A-Za-z0-9+/]+={0,2})$/.exec(typeof image === 'string' ? image.trim() : '');
    assert(match, '서명을 다시 작성해 주세요.');
    let bytes; try { bytes = Buffer.from(match[1], 'base64'); } catch { bytes = null; }
    assert(bytes && bytes.length > 200, '서명이 비어 있습니다. 서명란에 직접 그려주세요.');
    assert(bytes.length <= SIGNATURE_MAX_BYTES, '서명 이미지가 너무 큽니다. 다시 작성해 주세요.', 413);
    assert(bytes.subarray(0, 8).equals(PNG_MAGIC), 'PNG 형식의 서명만 저장할 수 있습니다.');
    reviewer.pledge = { image: 'data:image/png;base64,' + bytes.toString('base64'), signedAt: new Date().toISOString() };
    audit(r, reviewerId, '청렴서약서 서명', reviewer.name); return r;
}
function signed(r, reviewerId) { return !!r.reviewers.find(v => v.id === reviewerId)?.pledge?.signedAt; }
function submitEvaluation(r, reviewerId, stage) {
    requireStage(r, stage); assert(assigned(r, reviewerId, stage), '담당 위원이 아닙니다.', 403);
    assert(signed(r, reviewerId), '청렴서약서에 서명한 뒤 평가를 제출할 수 있습니다.');
    const ev = r.evaluations[key(stage, reviewerId)]; assert(ev, '평가를 먼저 저장하세요.');
    if (ev.submittedAt) return r;
    ev.rows = validateRows(r, stage, ev.rows, true); ev.submittedAt = new Date().toISOString(); audit(r, reviewerId, '평가 제출', stage); return r;
}
function reopen(r, reviewerId, stage, reason) {
    requireStage(r, stage); const ev = r.evaluations[key(stage, reviewerId)]; assert(ev?.submittedAt, '제출된 평가만 재개방할 수 있습니다.');
    const detail = text(reason, '재개방 사유', 500); ev.submittedAt = null; audit(r, 'admin', '평가 재개방', `${reviewerId}: ${detail}`); return r;
}
function round(n) { return Math.round((n + Number.EPSILON) * 10) / 10; }
function totals(r, stage) {
    const reviewers = r.reviewers.filter(v => v.stages.includes(stage));
    const results = stageCandidates(r, stage).map(c => {
        const submitted = reviewers.map(v => r.evaluations[key(stage, v.id)]).filter(e => e?.submittedAt);
        const rows = submitted.map(e => e.rows.find(row => row.candidateId === c.id));
        const complete = submitted.length === reviewers.length;
        const allAbsent = complete && rows.every(row => row?.attendance === 'absent');
        const conflict = complete && rows.some(row => row?.attendance === 'absent') && !allAbsent;
        const score = !complete || allAbsent || conflict ? null : round(rows.reduce((sum, row) => sum + Object.values(row.scores).reduce((a, b) => a + b, 0) + row.bonus, 0) / reviewers.length);
        return { candidateId: c.id, code: c.code, name: c.name, score, complete, absent: allAbsent, conflict, submitted: submitted.length, required: reviewers.length, rank: null };
    });
    return rank(results, 'score');
}
function rank(rows, field) { return rows.map(row => ({ ...row, rank: row[field] === null ? null : 1 + rows.filter(other => other[field] !== null && other[field] > row[field]).length })).sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999) || a.code.localeCompare(b.code, 'ko')); }
function assertComplete(r, stage) { const result = totals(r, stage); assert(result.every(row => row.complete), '모든 위원의 평가 제출이 필요합니다.', 409); assert(result.every(row => !row.conflict), '위원 간 참석/불참 표시가 다릅니다. 재개방 후 확인하세요.', 409); return result; }
function selectShortlist(r, ids, reason) {
    requireStage(r, 'document'); const results = assertComplete(r, 'document');
    assert(Array.isArray(ids) && ids.length >= 1 && ids.length <= r.rules.shortlistLimit && new Set(ids).size === ids.length, '면접대상자 수와 중복 여부를 확인하세요.');
    assert(ids.every(id => results.some(c => c.candidateId === id && c.score !== null)), '불참자 또는 잘못된 지원자를 선택했습니다.');
    r.shortlistReason = text(reason, '면접대상자 선정 사유', 1000); r.shortlist = ids; r.status = 'interview'; audit(r, 'admin', '면접대상자 확정', r.shortlistReason); return r;
}
function finalResults(r) {
    const doc = totals(r, 'document');
    return rank(totals(r, 'interview').map(row => { const document = doc.find(c => c.candidateId === row.candidateId)?.score ?? null; const total = row.score === null || document === null ? null : round(document + row.score); return { ...row, document, interview: row.score, total, rankingScore: r.rules.rankingBasis === 'combined' ? total : row.score }; }), 'rankingScore');
}
function finalize(r) {
    if (r.status === 'finalized') return r;
    requireStage(r, 'interview'); assertComplete(r, 'document'); assertComplete(r, 'interview');
    const results = finalResults(r); assert(results.some(row => row.total !== null), '참석한 면접대상자가 없어 확정할 수 없습니다.');
    r.snapshot = { version: 1, finalizedAt: new Date().toISOString(), rules: structuredClone(r.rules), rubrics: structuredClone(r.rubrics), results, documentResults: totals(r, 'document'), evaluations: structuredClone(r.evaluations), candidates: structuredClone(r.candidates), reviewers: r.reviewers.map(({ inviteHash, inviteExpiresAt, ...v }) => v), school: r.school, title: r.title, field: r.field, documentDate: r.documentDate, interviewDate: r.interviewDate, shortlist: [...r.shortlist], shortlistReason: r.shortlistReason };
    r.status = 'finalized'; audit(r, 'admin', '결과 확정', '확정본 v1'); return r;
}
// 서명은 본인 필적이다. 위원에게는 남의 서명 이미지를 넘기지 않고 서명 여부와 시각만 알린다.
// 확정 스냅샷에도 위원 목록이 복제돼 있으므로 같은 규칙을 거기에도 적용해야 한다.
function redactSignatures(reviewers, actor) {
    for (const v of reviewers || []) { delete v.inviteHash; delete v.inviteExpiresAt;
        if (v.pledge && actor?.role === 'reviewer' && v.id !== actor.id) delete v.pledge.image; }
}
function publicView(r, actor) { const copy = structuredClone(r); redactSignatures(copy.reviewers, actor); redactSignatures(copy.snapshot?.reviewers, actor); return { ...copy, actor, rubrics: r.rubrics, documentResults: totals(r, 'document'), finalResults: r.snapshot?.results || finalResults(r) }; }
module.exports = { DomainError, assert, text, createRecruitment, DEFAULT_RUBRICS, parseRubrics, stageTotal, MAX_CRITERIA, saveEvaluation, submitEvaluation, signPledge, signed, reopen, selectShortlist, finalize, totals, finalResults, publicView, stageCandidates, audit };
