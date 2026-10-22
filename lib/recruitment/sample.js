'use strict';
// 샘플 심사표: 고른 심사표(프리셋)로 가상의 채용을 만들어 끝까지 채점·확정한 뒤 출력물만 돌려준다.
// 저장소에는 아무것도 남기지 않는다. 채용을 만들기 전에 '이 심사표가 어떻게 인쇄되는지'를 보여 주는 용도다.
// 이름·직위는 원본 구글 시트 예시(일강사…, 가나다…)를 따른다. 서명 이미지는 넣지 않아 '(서명 또는 인)' 빈칸으로 나간다.
const domain = require('./domain');
const { presetById } = require('./presets');
const { provision } = require('./providers/mock');

const NAMES = ['일강사', '이강사', '삼강사', '사강사', '오강사'];
const REVIEWERS = [['가나다', '교사'], ['나다라', '교감'], ['다라마', '학부모위원']];

// 지원자·위원마다 조금씩 다른 점수. 같은 입력이면 늘 같은 출력이 나오도록 난수를 쓰지 않는다.
function sampleRow(r, stage, c, ci, vi) {
    const scores = {}, picks = {};
    for (const item of r.rubrics[stage]) {
        if (item.kind === 'pick') { picks[item.id] = (ci + vi) % item.options.length; continue; }
        if (item.kind === 'sum') { picks[item.id] = item.options.map((o, i) => o.unit ? 1 + ((ci + i) % 4) : (ci + vi + i) % 2); continue; }
        scores[item.id] = Math.max(0, Math.round(item.max * (0.9 - ci * 0.08 - vi * 0.03)));
    }
    return { candidateId: c.id, attendance: 'present', scores, picks, bonus: 0, note: '' };
}

// ── 계약제 교원 채용 표준 샘플 ────────────────────────────────────────────────
// 가상 이름: 성 × 이름 조합으로 겹치지 않게 만든다(지원자 100명까지).
const SURNAMES = ['김', '이', '박', '최', '정', '강', '조', '윤', '장', '임'];
const GIVEN = ['하늘', '서연', '민준', '지우', '도윤', '하은', '시우', '수아', '예준', '지민'];
const POSITIONS = ['교감', '교사', '교사', '교사', '교사'];
// 같은 입력이면 늘 같은 점수(난수 대신 간단한 해시).
const mix = (...xs) => xs.reduce((h, x) => (h * 31 + x + 7) % 9973, 17);
function contractRow(r, stage, c, ci, vi, absent) {
    if (absent) return { candidateId: c.id, attendance: 'absent', scores: {}, picks: {}, bonus: 0, note: '면접·서류 미제출로 불참 처리(샘플)' };
    const picks = {};
    r.rubrics[stage].forEach((item, k) => {
        const h = mix(ci, vi, k, stage.length);
        // 앞 순번 지원자일수록 높은 점수 쪽으로 기울여 순위가 고르게 나뉘게 한다.
        const lean = Math.min(item.options.length - 1, Math.floor((h % 3) + (ci % 7) / 3));
        if (item.kind === 'pick') picks[item.id] = item.options.length === 1 ? (h % 5 === 0 ? -1 : 0) : Math.min(item.options.length - 1, lean);
        else if (item.kind === 'scale') picks[item.id] = Math.min(item.options.length - 1, lean);
    });
    return { candidateId: c.id, attendance: 'present', scores: {}, picks, bonus: 0, note: '' };
}
// candidates·reviewers 수를 바꿔 극한값(지원자 100명·위원 5명)까지 시험할 수 있다. 저장소에는 남기지 않는다.
// documentOnly: 서류전형만 하는 채용 샘플(면접·수업실연 없이 서류로 확정).
function buildContractSample({ candidates = 12, reviewers = 3, school = '○○초등학교', recruitType = '기간제교사', subject = '담임', shortlist = 4, documentOnly = false, rubrics } = {}) {
    domain.assert(candidates >= 1 && candidates <= 100 && reviewers >= 1 && reviewers <= 5, '샘플 인원을 확인하세요.');
    const field = `${recruitType}(${subject})`;
    const r = domain.createRecruitment({
        school, title: `2026학년도 ${field} 채용(샘플)`, field, recruitType, subject,
        documentDate: '2026-10-20', interviewDate: '2026-10-22', rankingBasis: 'combined', shortlistLimit: Math.min(10, shortlist, candidates), allowBonus: true,
        preset: 'contract-teacher', ...(documentOnly ? { stages: ['document'] } : {}), ...(rubrics ? { rubrics } : {}),
        candidates: Array.from({ length: candidates }, (x, i) => ({ code: `${subject}${String(i + 1).padStart(2, '0')}`, name: SURNAMES[i % 10] + GIVEN[Math.floor(i / 10) % 10] })),
        reviewers: Array.from({ length: reviewers }, (x, i) => ({ name: `${SURNAMES[(i + 3) % 10]}심사${'가나다라마'[i]}`, position: POSITIONS[i], stages: documentOnly ? ['document'] : ['document', 'interview', 'demo'] }))
    });
    provision(r);
    const at = new Date().toISOString();
    r.reviewers.forEach(v => { v.pledge = { signedAt: at }; });
    // 서류: 마지막 지원자는 위원 전원 불참 처리. 둘째 지원자는 1,2,4호 가점(3점), 다섯째는 3,5호(1.5점).
    const absentAt = candidates >= 3 ? candidates - 1 : -1;
    for (const stage of r.stages) {
        if (stage === 'interview') {
            const ranked = domain.totals(r, 'document').filter(x => x.score !== null).sort((a, b) => a.rank - b.rank || a.code.localeCompare(b.code));
            domain.selectShortlist(r, ranked.slice(0, r.rules.shortlistLimit).map(x => x.candidateId), `서류 상위 ${r.rules.shortlistLimit}명 선정(샘플)`);
        }
        r.reviewers.filter(v => v.stages.includes(stage)).forEach((v, vi) => {
            const list = domain.stageCandidates(r, stage);
            const rows = list.map(c => contractRow(r, stage, c, r.candidates.indexOf(c), vi, stage === 'document' && r.candidates.indexOf(c) === absentAt));
            const rule = domain.bonusRule(r, stage);
            const give = (i, k, why) => { const row = rows[i]; if (!row || row.attendance === 'absent') return; row.bonus = rule.values[k]; row.note = why; };
            if (stage === 'document') { give(1, 1, '국가유공자 1호 증빙 확인(샘플)'); give(4, 2, '국가유공자 3호 증빙 확인(샘플)'); }
            else give(0, 2, '국가유공자 3호 증빙 확인(샘플)');
            // 문턱(40%) 미만인 줄은 가점을 붙일 수 없으므로 샘플에서도 뺀다.
            for (const row of rows) if (row.bonus) { const probe = domain.saveEvaluation(structuredClone(r), v.id, stage, [row, ...rows.filter(x => x !== row)]).evaluations[`${stage}:${v.id}`].rows[0]; if (Object.values(probe.scores).reduce((a, b) => a + b, 0) < rule.threshold) { row.bonus = 0; row.note = ''; } }
            domain.saveEvaluation(r, v.id, stage, rows);
            domain.submitEvaluation(r, v.id, stage);
        });
    }
    return domain.finalize(r);
}

// field: 화면 '채용 분야' 칸에 적은 영역. 비어 있으면 '○○ 강사'로 둔다.
function buildSample(presetId, field = '', { documentOnly = false } = {}) {
    const preset = presetById(presetId);
    domain.assert(preset, '심사표를 다시 고르세요.', 404);
    if (preset.layout === 'contract') {
        // 화면에서 '기간제교사(담임)'처럼 적었으면 그대로 나눠 쓴다.
        const m = /^(.+?)\((.+)\)$/.exec(String(field || '').trim());
        return buildContractSample({ ...(m ? { recruitType: m[1], subject: m[2] } : {}), documentOnly });
    }
    const area = String(field || '').trim().slice(0, 100) || preset.field || '○○ 강사';
    const r = domain.createRecruitment({
        school: '○○초등학교', title: `${area} 채용(샘플)`, field: area,
        documentDate: '2026-03-24', interviewDate: '2026-03-26', rankingBasis: 'combined', shortlistLimit: 3, allowBonus: true,
        preset: preset.id, rubrics: preset.rubrics, ...(documentOnly ? { stages: ['document'] } : {}),
        candidates: NAMES.map((name, i) => ({ code: String(i + 1).padStart(3, '0'), name })),
        reviewers: REVIEWERS.map(([name, position]) => ({ name, position, stages: documentOnly ? ['document'] : ['document', 'interview'] }))
    });
    provision(r);
    const at = new Date().toISOString();
    r.reviewers.forEach(v => { v.pledge = { signedAt: at }; });
    for (const stage of domain.stagesOf(r)) {
        if (stage === 'interview') {
            const ranked = domain.totals(r, 'document').filter(x => x.score !== null).sort((a, b) => a.rank - b.rank);
            domain.selectShortlist(r, ranked.slice(0, 3).map(x => x.candidateId), '서류심사 상위 3명(샘플)');
        }
        r.reviewers.forEach((v, vi) => {
            const rows = domain.stageCandidates(r, stage).map((c, ci) => sampleRow(r, stage, c, r.candidates.indexOf(c), vi));
            // 가점 줄이 어떻게 찍히는지 보이도록 둘째 지원자에게 2.5점(원본 3·5호)을 준다.
            if (stage === 'document' && rows[1]) { rows[1].bonus = r.rules.bonusOptions[1].points; rows[1].note = '보훈대상 확인서 확인(샘플)'; }
            domain.saveEvaluation(r, v.id, stage, rows);
            domain.submitEvaluation(r, v.id, stage);
        });
    }
    return domain.finalize(r);
}
module.exports = { buildSample, buildContractSample };
