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

// field: 화면 '채용 분야' 칸에 적은 영역. 비어 있으면 '○○ 강사'로 둔다.
function buildSample(presetId, field = '') {
    const preset = presetById(presetId);
    domain.assert(preset, '심사표를 다시 고르세요.', 404);
    const area = String(field || '').trim().slice(0, 100) || preset.field || '○○ 강사';
    const r = domain.createRecruitment({
        school: '○○초등학교', title: `${area} 채용(샘플)`, field: area,
        documentDate: '2026-03-24', interviewDate: '2026-03-26', rankingBasis: 'combined', shortlistLimit: 3, allowBonus: true,
        preset: preset.id, rubrics: preset.rubrics,
        candidates: NAMES.map((name, i) => ({ code: String(i + 1).padStart(3, '0'), name })),
        reviewers: REVIEWERS.map(([name, position]) => ({ name, position, stages: ['document', 'interview'] }))
    });
    provision(r);
    const at = new Date().toISOString();
    r.reviewers.forEach(v => { v.pledge = { signedAt: at }; });
    for (const stage of ['document', 'interview']) {
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
module.exports = { buildSample };
