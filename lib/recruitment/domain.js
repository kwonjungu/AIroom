'use strict';
const { randomUUID } = require('node:crypto');

// 기관마다 심사 항목이 다르므로 배점표는 채용마다 저장한다. 기본값은 강사 유형별 프리셋(presets.js)의
// 첫 번째이고, 화면에 미리 채워질 뿐이다. 집계는 언제나 r.rubrics 를 본다.
const { DEFAULT_PRESET, BONUS, presetById } = require('./presets');
const DEFAULT_RUBRICS = DEFAULT_PRESET.rubrics;
// scale: 원본 드롭다운처럼 정해진 점수 목록(칩) 중 하나를 고른다. 계약제 표준 양식에서 쓴다.
const KINDS = ['judge', 'pick', 'sum', 'scale'];
const MAX_OPTIONS = 12;
// 전형은 채용마다 다르다. 옛 채용·표준 심사표는 서류·면접 둘, 계약제 표준 양식은 수업실연까지 셋.
const STAGES = Object.keys(DEFAULT_RUBRICS);
const STAGE_NAMES = { document: '서류심사', interview: '면접심사', demo: '수업실연' };
const stagesOf = r => r.stages || STAGES;
// 수업실연은 면접과 같은 날 같은 대상자로 치른다. 진행 상태는 'interview' 하나로 같이 간다.
const statusOf = stage => stage === 'demo' ? 'interview' : stage;
const MAX_CRITERIA = 12;
const MAX_CANDIDATES = { standard: 20, contract: 100 };
const MAX_SHORTLIST = { standard: 4, contract: 10 };
class DomainError extends Error { constructor(message, status = 400) { super(message); this.status = status; } }
function assert(ok, message, status = 400) { if (!ok) throw new DomainError(message, status); }
function text(v, label, max = 100) { assert(typeof v === 'string' && v.trim().length > 0 && v.trim().length <= max, `${label}: 1~${max}자 이내로 입력하세요.`); return v.trim(); }
function date(v) { assert(typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !isNaN(Date.parse(v)) && new Date(v).toISOString().slice(0, 10) === v, '날짜를 확인하세요.'); return v; }
function audit(r, actor, action, detail = '') { r.audit.push({ at: new Date().toISOString(), actor, action, detail }); }
function half(v, label, min, max) { assert(typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max && Number.isInteger(v * 2), `${label}: ${min}~${max}점, 0.5점 단위로 입력하세요.`); return v; }
// 점수는 항목 id 로 저장되므로 id 에 사용자 입력이 섞이면 안 된다. 순번으로 만든다.
// pick·sum 항목은 심사관점 줄(options)이 곧 채점 근거다. guide 는 그 줄을 원본 표기('…(6점)')로
// 다시 써 둔다 — 화면·문서 어디서 guide 를 읽어도 위원이 고른 기준과 같은 글이 보이게.
function optionText(o) { return `${o.label}(${o.points}점)`; }
function parseOptions(item, name, max, kind) {
    assert(Array.isArray(item.options) && item.options.length >= 1 && item.options.length <= MAX_OPTIONS, `${name} 심사관점은 1~${MAX_OPTIONS}줄입니다.`);
    // scale 칩은 숫자만 있어도 된다(원본 드롭다운 6·5·4…). 0점 칩도 있다.
    if (kind === 'scale') {
        const options = item.options.map(o => {
            assert(o && typeof o === 'object', `${name} 점수 목록을 확인하세요.`);
            const label = o.label === undefined || o.label === null || String(o.label).trim() === '' ? '' : text(o.label, `${name} 칩 이름`, 20);
            return { label, points: half(o.points, `${name} 점수`, 0, max) };
        });
        assert(new Set(options.map(o => o.points)).size === options.length, `${name} 점수가 중복됩니다.`);
        return options;
    }
    const options = item.options.map(o => {
        assert(o && typeof o === 'object', `${name} 심사관점을 확인하세요.`);
        const unit = o.unit === undefined || o.unit === null || o.unit === '' ? null : text(o.unit, `${name} 단위`, 4);
        return { label: text(o.label, `${name} 심사관점`, 60), points: half(o.points, `${name} ${o.label} 점수`, 0.5, max), ...(unit ? { unit } : {}) };
    });
    assert(new Set(options.map(o => o.label)).size === options.length, `${name} 심사관점이 중복됩니다.`);
    return options;
}
// 인쇄 모양(원본 '평가 기준' A열 글·칸 병합). 채점에는 쓰지 않으므로 형식만 거른다.
function parsePrint(item, name) {
    const out = {};
    if (item.head !== undefined && item.head !== null && String(item.head).trim() !== '') out.head = text(item.head, `${name} 평가 기준 글`, 200);
    if (item.join === true) out.join = true;
    if (item.print && typeof item.print === 'object') {
        const p = {};
        if (item.print.merge === true) p.merge = true;
        if (Number.isInteger(item.print.rows) && item.print.rows >= 1 && item.print.rows <= MAX_OPTIONS) p.rows = item.print.rows;
        if (Object.keys(p).length) out.print = p;
    }
    return out;
}
function parseRubrics(input, stages = STAGES, defaults = DEFAULT_RUBRICS) {
    const rubrics = {};
    for (const stage of stages) {
        const given = input?.[stage];
        const items = Array.isArray(given) && given.length ? given : defaults[stage];
        const name = STAGE_NAMES[stage];
        assert(items.length >= 1 && items.length <= MAX_CRITERIA, `${name} 평가 항목은 1~${MAX_CRITERIA}개입니다.`);
        rubrics[stage] = items.map((item, index) => {
            assert(item && typeof item === 'object', `${name} 평가 항목을 확인하세요.`);
            const label = text(item.label, `${name} 항목 이름`, 40), max = half(item.max, `${name} ${item.label} 배점`, 0.5, 100);
            // kind 가 없던 옛 채용은 전부 위원 재량 점수였다.
            const kind = item.kind === undefined || item.kind === null ? 'judge' : item.kind;
            assert(KINDS.includes(kind), `${name} ${label} 채점 방식을 확인하세요.`);
            const look = parsePrint(item, `${name} ${label}`);
            const guide = item.guide === undefined || item.guide === null || String(item.guide).trim() === '' ? '' : text(item.guide, `${name} ${label} 채점 기준`, 1000);
            if (kind === 'scale') {
                const options = parseOptions(item, `${name} ${label}`, max, kind);
                assert(Math.max(...options.map(o => o.points)) === max, `${name} ${label}: 가장 높은 점수가 배점과 같아야 합니다.`);
                return { id: `c${index + 1}`, label, max, kind, options, guide, ...look };
            }
            if (kind !== 'judge') {
                const options = parseOptions(item, `${name} ${label}`, max, kind);
                return { id: `c${index + 1}`, label, max, kind, options, guide: options.map(optionText).join('\n'), ...look };
            }
            return { id: `c${index + 1}`, label, max, kind, guide, ...look };
        });
        assert(new Set(rubrics[stage].map(v => v.label)).size === rubrics[stage].length, `${name} 항목 이름이 중복됩니다.`);
    }
    return rubrics;
}
// 위원이 고른 심사관점(pick)을 점수로 바꾼다. 서버가 계산하므로 화면이 보낸 점수는 믿지 않는다.
//   pick: 고른 줄 번호, -1 = 해당 없음(0점), null = 아직 안 고름
//   sum : 줄마다 개수(단위 없는 줄은 0/1). 합계는 배점에서 자른다.
function pickScore(criterion, pick) {
    if (pick === null || pick === undefined) return null;
    if (criterion.kind === 'pick') return pick === -1 ? 0 : criterion.options[pick].points;
    if (criterion.kind === 'scale') return criterion.options[pick].points;
    return Math.min(criterion.max, round(criterion.options.reduce((sum, o, i) => sum + o.points * pick[i], 0)));
}
function parsePick(criterion, value) {
    if (value === null || value === undefined || value === '') return null;
    if (criterion.kind === 'pick') {
        assert(Number.isInteger(value) && value >= -1 && value < criterion.options.length, `${criterion.label}: 심사관점을 다시 고르세요.`);
        return value;
    }
    if (criterion.kind === 'scale') {
        assert(Number.isInteger(value) && value >= 0 && value < criterion.options.length, `${criterion.label}: 점수를 다시 고르세요.`);
        return value;
    }
    assert(Array.isArray(value) && value.length === criterion.options.length, `${criterion.label}: 심사관점을 다시 고르세요.`);
    return value.map((n, i) => {
        const most = criterion.options[i].unit ? 99 : 1;
        assert(Number.isInteger(n) && n >= 0 && n <= most, `${criterion.label}: ${criterion.options[i].label} ${criterion.options[i].unit ? `0~99${criterion.options[i].unit}` : '0 또는 1'}로 넣으세요.`);
        return n;
    });
}
function stageTotal(rubrics, stage) { return round(rubrics[stage].reduce((sum, item) => sum + item.max, 0)); }
function createRecruitment(input, actor = 'admin') {
    assert(input && typeof input === 'object', '설정이 필요합니다.');
    // 어느 심사표에서 시작했는지. 계약제 표준 양식은 전형·가점·인쇄 모양이 다르다(layout 'contract').
    const preset = input.preset === undefined || input.preset === null || input.preset === '' ? null : presetById(input.preset);
    assert(input.preset === undefined || input.preset === null || input.preset === '' || preset, '심사표를 다시 고르세요.');
    const layout = preset?.layout === 'contract' ? 'contract' : 'standard';
    const stages = layout === 'contract' ? [...preset.stages] : STAGES;
    const school = text(input.school, '학교명'), title = text(input.title, '채용명'), field = text(input.field, '채용 분야');
    const documentDate = date(input.documentDate), interviewDate = date(input.interviewDate);
    assert(interviewDate >= documentDate, '면접일은 서류전형일 이후여야 합니다.');
    const most = MAX_CANDIDATES[layout];
    assert(Array.isArray(input.candidates) && input.candidates.length >= 1 && input.candidates.length <= most, `지원자는 1~${most}명입니다.`);
    const candidates = input.candidates.map(c => { assert(c && typeof c === 'object', '지원자 정보를 확인하세요.'); return { id: randomUUID(), code: text(c.code, '접수번호', 30), name: text(c.name, '지원자명', 50) }; });
    assert(new Set(candidates.map(c => c.code)).size === candidates.length, '접수번호는 중복될 수 없습니다.');
    assert(Array.isArray(input.reviewers) && input.reviewers.length >= 1 && input.reviewers.length <= 5, '평가위원은 1~5명입니다.');
    const reviewers = input.reviewers.map(v => {
        assert(v && typeof v === 'object', '위원 정보를 확인하세요.');
        // 위원은 초대 링크로 접속한다. 메일을 자동 발송하지 않으므로 주소는 받지 않는다.
        // 옛 데이터와 외부 호출 호환을 위해 값이 오면 형식만 확인하고 없으면 null 로 둔다.
        const email = v.email === undefined || v.email === null || v.email === '' ? null : text(v.email, '이메일', 254).toLowerCase();
        assert(email === null || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email), '위원 이메일 형식을 확인하세요.');
        assert(Array.isArray(v.stages) && v.stages.length > 0 && v.stages.every(s => stages.includes(s)) && new Set(v.stages).size === v.stages.length, '위원의 담당 전형을 선택하세요.');
        return { id: randomUUID(), name: text(v.name, '위원명', 50), position: text(v.position, '직위', 50), email, stages: v.stages };
    });
    const emails = reviewers.map(v => v.email).filter(Boolean);
    assert(new Set(emails).size === emails.length, '위원 이메일은 중복될 수 없습니다. 같은 위원에게 두 전형을 배정하세요.');
    assert(new Set(reviewers.map(v => `${v.name}|${v.position}`)).size === reviewers.length, '같은 이름·직위의 위원이 둘 있습니다. 한 줄에서 두 전형을 모두 선택하세요.');
    for (const stage of stages) assert(reviewers.filter(v => v.stages.includes(stage)).length >= 1 && reviewers.filter(v => v.stages.includes(stage)).length <= 5, '각 전형에 1~5명의 위원을 배정하세요.');
    assert(['combined', 'interview'].includes(input.rankingBasis), '최종 순위 기준을 선택하세요.');
    // 면접대상자 상한: 강사 채용 표준 4명, 계약제 교원 채용 표준 10명(사용자 결정 2026-10-15).
    const shortMost = MAX_SHORTLIST[layout];
    assert(Number.isInteger(input.shortlistLimit) && input.shortlistLimit >= 1 && input.shortlistLimit <= Math.min(shortMost, candidates.length), `면접대상자는 지원자 수 이내, 최대 ${shortMost}명입니다.`);
    assert(typeof input.allowBonus === 'boolean', '가점 사용 여부를 선택하세요.');
    const rubrics = layout === 'contract' ? parseRubrics(input.rubrics, stages, preset.rubrics) : parseRubrics(input.rubrics);
    // 그 심사표의 서약서 문구를 채용에 붙여 둔다. 프리셋을 나중에 고쳐도 이 채용의 서약 문구는 그대로다.
    const pledgeItems = [...(preset || DEFAULT_PRESET).pledge];
    // 항목별 준거로 담기 어려운 공통 지침(자격 요건, 결격 사유, 배점 해석 등)을 위원에게 함께 보여준다.
    const guidance = input.guidance === undefined || input.guidance === null || String(input.guidance).trim() === ''
        ? '' : text(input.guidance, '심사 참고자료', 3000);
    // 가점 문턱은 서류 만점의 40%(원본 시트 '40% 이상 득점자'). 배점표를 바꿔도 같이 움직이도록 만점에서 계산한다.
    // 문턱은 반올림하지 않는다. 0.5 단위로 내리면 40% 미만 득점자에게 가점이 붙는다.
    const bonusThreshold = Math.round(stageTotal(rubrics, 'document') * 0.4 * 100) / 100;
    // 계약제: 전형마다 가점 목록과 40% 문턱이 따로 있다(서류 3/1.5·면접 4/2·수업실연 3/1.5).
    const bonusByStage = layout === 'contract' && input.allowBonus ? Object.fromEntries(stages.map(stage => [stage, {
        text: preset.bonus[stage].text, options: preset.bonus[stage].options.map(o => ({ ...o })),
        max: Math.max(...preset.bonus[stage].options.map(o => o.points)),
        threshold: Math.round(stageTotal(rubrics, stage) * 0.4 * 100) / 100 }])) : null;
    const contract = layout === 'contract' ? {
        recruitType: text(input.recruitType, '채용영역', 20), subject: text(input.subject, '세부 영역(과목)', 20),
        notes: preset.notes } : null;
    const r = { id: randomUUID(), version: 1, createdAt: new Date().toISOString(), school, title, field, documentDate, interviewDate, candidates, reviewers, rubrics, guidance, preset: preset ? { id: preset.id, name: preset.name } : null, pledgeItems,
        ...(layout === 'contract' ? { layout, stages, contract } : {}),
        // 집계표 용지: 강사 채용 표준은 채용을 만들 때 고른다(세로 = 원본 40칸, 가로 = 10명 단위). 계약제는 원본대로 가로 고정.
        rules: { rankingBasis: input.rankingBasis, shortlistLimit: input.shortlistLimit, allowBonus: input.allowBonus, bonusThreshold,
            summaryOrient: layout === 'contract' || input.summaryOrient === 'landscape' ? 'landscape' : 'portrait', ...(input.allowBonus && !bonusByStage ? { bonusLabel: BONUS.label, bonusMax: BONUS.max, bonusOptions: BONUS.options.map(o => ({ ...o })) } : {}), ...(bonusByStage ? { bonusByStage } : {}), tiePolicy: 'competition-rank-manual-review', precision: 1 },
        status: 'draft', provider: 'mock', link: null, evaluations: {}, shortlist: [], snapshot: null, audit: [] };
    audit(r, actor, '채용 생성'); return r;
}
function stageCandidates(r, stage) { return stage === 'document' ? r.candidates : r.candidates.filter(c => r.shortlist.includes(c.id)); }
function assigned(r, reviewerId, stage) { return r.reviewers.some(v => v.id === reviewerId && v.stages.includes(stage)); }
function key(stage, reviewerId) { return `${stage}:${reviewerId}`; }
function requireStage(r, stage) { assert(stagesOf(r).includes(stage) && r.status === statusOf(stage), '현재 진행 중인 전형에서만 평가할 수 있습니다.', 409); }
// 이 전형에 붙일 수 있는 가점. 계약제는 전형마다 목록이 정해져 있고, 표준 심사표는 서류에만 0~5점 0.5점 간격.
function bonusRule(r, stage) {
    if (!r.rules.allowBonus) return null;
    const by = r.rules.bonusByStage;
    if (by) return by[stage] ? { values: [0, ...by[stage].options.map(o => o.points)], max: by[stage].max, threshold: by[stage].threshold, threshold40: true } : null;
    return stage === 'document' ? { half: true, max: r.rules.bonusMax ?? 5, threshold: r.rules.bonusThreshold } : null;
}
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
        const scores = {}, picks = {};
        const given = row.scores && typeof row.scores === 'object' ? row.scores : {};
        const chosen = row.picks && typeof row.picks === 'object' ? row.picks : {};
        for (const criterion of r.rubrics[stage]) {
            if (criterion.kind === 'pick' || criterion.kind === 'sum' || criterion.kind === 'scale') {
                picks[criterion.id] = parsePick(criterion, chosen[criterion.id]);
                scores[criterion.id] = pickScore(criterion, picks[criterion.id]);
                assert(!complete || scores[criterion.id] !== null, `${criterion.label} 심사관점을 고르지 않았습니다.`);
                continue;
            }
            const value = given[criterion.id];
            if (value === null || value === undefined || value === '') { assert(!complete, `${criterion.label} 점수가 누락됐습니다.`); scores[criterion.id] = null; }
            else { assert(typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= criterion.max && Number.isInteger(value * 2), `${criterion.label}: 0~${criterion.max}점, 0.5점 단위로 입력하세요.`); scores[criterion.id] = value; }
        }
        const bonus = row.bonus ?? 0;
        const rule = bonusRule(r, stage);
        assert(typeof bonus === 'number' && Number.isFinite(bonus), '가점을 다시 고르세요.');
        assert(bonus === 0 || rule, '이 전형에는 가점을 적용할 수 없습니다.');
        // 표준 심사표: 원본 시트처럼 0~5점을 0.5점 간격. 계약제: 원본 드롭다운 목록(예: 3·1.5·0)에서만.
        if (rule?.half) assert(bonus >= 0 && bonus <= rule.max && Number.isInteger(bonus * 2), `가점은 0~${rule.max}점, 0.5점 간격으로 고르세요.`);
        if (rule?.values) assert(rule.values.includes(bonus), `가점은 ${rule.values.join('·')}점 중에서 고르세요.`);
        if (bonus > 0) { assert(note.length > 0, '가점 확인 근거를 메모에 입력하세요.'); if (complete) assert(Object.values(scores).reduce((a, b) => a + b, 0) >= rule.threshold, `기본 점수가 ${rule.threshold}점(${STAGE_NAMES[stage]} 만점의 40%) 이상일 때 가점을 적용할 수 있습니다.`); }
        return { candidateId: row.candidateId, attendance: 'present', scores, ...(Object.keys(picks).length ? { picks } : {}), bonus, note };
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
        const base = score === null ? null : round(rows.reduce((sum, row) => sum + Object.values(row.scores).reduce((a, b) => a + b, 0), 0) / reviewers.length);
        return { candidateId: c.id, code: c.code, name: c.name, score, base, complete, absent: allAbsent, conflict, submitted: submitted.length, required: reviewers.length, rank: null };
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
    if (r.layout === 'contract') return contractResults(r);
    const doc = totals(r, 'document');
    return rank(totals(r, 'interview').map(row => { const document = doc.find(c => c.candidateId === row.candidateId)?.score ?? null; const total = row.score === null || document === null ? null : round(document + row.score); return { ...row, document, interview: row.score, total, rankingScore: r.rules.rankingBasis === 'combined' ? total : row.score }; }), 'rankingScore');
}
// 계약제: 계 = 서류 평균 + 면접 평균 + 수업실연 평균(교과목별 평가 집계표). 원본 주석
// '어느 한 영역이라도 40% 미만이면 가산점 대상에서 제외' — 한 전형이라도 가점 뺀 평균이 그 전형 만점의 40% 미만이면
// 세 전형 모두 가점을 빼고 더한다. 순위 기준이 '면접 평균'이면 면접 + 수업실연으로 매긴다.
function contractResults(r) {
    const by = Object.fromEntries(stagesOf(r).map(stage => [stage, totals(r, stage)]));
    const min = stage => Math.round(stageTotal(r.rubrics, stage) * 0.4 * 100) / 100;
    return rank(by.interview.map(row => {
        const of = stage => by[stage].find(c => c.candidateId === row.candidateId) || null;
        const parts = stagesOf(r).map(stage => ({ stage, res: of(stage) }));
        const ready = parts.every(p => p.res && p.res.score !== null);
        const bonusExcluded = ready && !!r.rules.bonusByStage && parts.some(p => p.res.base < min(p.stage));
        const pick = p => bonusExcluded ? p.res.base : p.res.score;
        const total = ready ? round(parts.reduce((sum, p) => sum + pick(p), 0)) : null;
        const oral = ready ? round(parts.filter(p => p.stage !== 'document').reduce((sum, p) => sum + pick(p), 0)) : null;
        const absent = parts.some(p => p.res?.absent);
        return { ...row, document: of('document')?.score ?? null, interview: row.score, demo: of('demo')?.score ?? null, total, bonusExcluded, absent,
            complete: parts.every(p => p.res?.complete), conflict: parts.some(p => p.res?.conflict),
            rankingScore: r.rules.rankingBasis === 'combined' ? total : oral };
    }), 'rankingScore');
}
function finalize(r) {
    if (r.status === 'finalized') return r;
    requireStage(r, 'interview'); for (const stage of stagesOf(r)) assertComplete(r, stage);
    const results = finalResults(r); assert(results.some(row => row.total !== null), '참석한 면접대상자가 없어 확정할 수 없습니다.');
    r.snapshot = { version: 1, finalizedAt: new Date().toISOString(), rules: structuredClone(r.rules), rubrics: structuredClone(r.rubrics), guidance: r.guidance || '', pledgeItems: r.pledgeItems ? [...r.pledgeItems] : null, results, documentResults: totals(r, 'document'), evaluations: structuredClone(r.evaluations), candidates: structuredClone(r.candidates), reviewers: r.reviewers.map(({ inviteHash, inviteExpiresAt, ...v }) => v), school: r.school, title: r.title, field: r.field, documentDate: r.documentDate, interviewDate: r.interviewDate, shortlist: [...r.shortlist], shortlistReason: r.shortlistReason,
        ...(r.layout === 'contract' ? { layout: r.layout, stages: [...r.stages], contract: structuredClone(r.contract), demoResults: totals(r, 'demo') } : {}) };
    r.status = 'finalized'; audit(r, 'admin', '결과 확정', '확정본 v1'); return r;
}
// 서명은 본인 필적이다. 위원에게는 남의 서명 이미지를 넘기지 않고 서명 여부와 시각만 알린다.
// 확정 스냅샷에도 위원 목록이 복제돼 있으므로 같은 규칙을 거기에도 적용해야 한다.
function redactSignatures(reviewers, actor) {
    for (const v of reviewers || []) { delete v.inviteHash; delete v.inviteExpiresAt;
        if (v.pledge && actor?.role === 'reviewer' && v.id !== actor.id) delete v.pledge.image; }
}
function publicView(r, actor) { const copy = structuredClone(r); redactSignatures(copy.reviewers, actor); redactSignatures(copy.snapshot?.reviewers, actor); return { ...copy, actor, rubrics: r.rubrics, documentResults: totals(r, 'document'), finalResults: r.snapshot?.results || finalResults(r) }; }
module.exports = { DomainError, assert, text, createRecruitment, DEFAULT_RUBRICS, parseRubrics, pickScore, optionText, stageTotal, MAX_CRITERIA, STAGE_NAMES, stagesOf, bonusRule, saveEvaluation, submitEvaluation, signPledge, signed, reopen, selectShortlist, finalize, totals, finalResults, publicView, stageCandidates, audit };
