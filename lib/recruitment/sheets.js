'use strict';
// 확정본 출력물의 '쪽' 모형. 인쇄용 HTML(exports.js)과 한/글(hwpx.js)이 이 모형 하나를 각자 그린다.
// 원본 구글 시트 심사표(KHSDO)의 쪽 구성을 그대로 따른다. 전부 A4 세로.
// 순서: 청렴서약서(위원별) → 서류심사 채점표(위원별) → 서류심사 집계표 → 면접 채점표(위원별) → 면접 집계·합산 및 순위.
// 표의 행은 원본처럼 '구분 | 심사관점' 한 줄씩이고, 위원이 고른 심사관점 줄에 점수가 찍힌다.
//
// 표 모형: { cols: [폭 비율...], rows: [{ cells: [{ v, k, cs, rs }], cls }] }
//   k(칸 종류): h=머리(회색·굵게) stage=전형(회색) gubun·view=구분·심사관점(왼쪽 작은 글)
//               n=숫자 nb=굵은 숫자 cand=강사 이름 who=집계표 평가자 이름 blank=빈칸
//   cls: sum=합계 줄(머리 칸 회색) rank=순위 줄(값 칸 연노랑)
// 셀 병합은 HTML 과 같은 규칙(cs=colspan, rs=rowspan, 덮인 칸은 목록에 없음)이다.

// 옛 채용(pledgeItems 없음)에 쓰던 서약 문구.
const OLD_PLEDGE = ['객관적이고 공정한 평가를 위하여 관련 업체 또는 개인위탁강사와의 이해관계를 확인하고, 이해충돌이 있는 경우 담당자에게 알리겠습니다.', '평가와 관련하여 금품·향응·편의를 수수하거나 제공받지 않으며, 이러한 상황이 발생하면 담당 부서에 통보하겠습니다.', '업무상 취득한 비밀을 준수하고 보안 관련 규정과 지침을 성실히 수행하겠습니다.', '평가와 관련하여 알게 된 업무상 비밀을 타인에게 누설하지 않겠습니다.'];
const SLOTS = { document: 10, interview: 4 };   // 원본 채점표의 강사 칸 수. 사람이 적으면 빈 칸으로 남긴다.
const SUMMARY_COLUMNS = 40;                      // 원본 집계표: 강사 10명 × 위원 4명 = 40칸이 한 쪽
const LEAD_COLS = [5.5, 17, 19.5];               // 전형 | 구분 | 심사관점 (본문 폭 %)
const dotDate = iso => { const [y, m, d] = iso.split('-').map(Number); return `${y}. ${m}. ${d}.`; };
const longDate = iso => { const [y, m, d] = iso.split('-').map(Number); return `${y}년 ${m}월 ${d}일`; };
const stageDate = (s, stage) => stage === 'document' ? s.documentDate : s.interviewDate;
const num = v => v === null || v === undefined || v === '' ? '' : String(Number(v));
const one = v => v === null || v === undefined ? '' : Number(v).toFixed(1);   // 원본 평균 표기 '41.0'
const rankText = v => v === null || v === undefined ? '' : String(v);
function chunk(list, size) { const out = []; for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size)); return out.length ? out : [[]]; }
const C = (v, k, cs = 1, rs = 1) => ({ v: v === null || v === undefined ? '' : String(v), k, cs, rs });
const stageList = (s, stage) => stage === 'document' ? s.candidates : s.candidates.filter(c => s.shortlist.includes(c.id));

// 같은 바탕에 괄호만 다른 연속된 관점('… 졸업(4년제)', '… 졸업(2년제)')은 원본처럼 한 줄로 묶는다:
// '채용 관련 전공 대학 졸업 / (4년제 5점, 2년제 4점)'. 채점은 선택지마다 따로 하고, 인쇄 줄만 합친다.
function viewGroups(c) {
    const split = o => { const m = /^(.*\S)\s*\(([^()]+)\)$/.exec(o.label); return m ? { base: m[1], tag: m[2] } : null; };
    const groups = [];
    c.options.forEach((o, i) => {
        const part = split(o), prev = groups[groups.length - 1];
        if (part && prev?.base === part.base) { prev.idx.push(i); prev.tags.push(`${part.tag} ${o.points}점`); return; }
        groups.push({ base: part ? part.base : null, idx: [i], tags: part ? [`${part.tag} ${o.points}점`] : [], label: o.label, points: o.points });
    });
    return groups.map(g => ({ idx: g.idx, view: g.idx.length > 1 ? `${g.base}\n(${g.tags.join(', ')})` : `${g.label}\n(${g.points}점)` }));
}
// 원본 '구분' 칸 표기: '1. 강사 자격 기준 … (최대 6점)', 면접은 '1. 인성 (10점)', 관점이 따로 없으면 번호와 이름만.
function sheetRows(s, stage) {
    const rows = [], items = s.rubrics[stage];
    items.forEach((c, n) => {
        const picked = c.kind === 'pick' || c.kind === 'sum';
        const head = !picked && !c.guide ? `${n + 1}. ${c.label}` : stage === 'document' ? `${n + 1}. ${c.label}\n(최대 ${c.max}점)` : `${n + 1}. ${c.label} (${c.max}점)`;
        if (picked) { const groups = viewGroups(c); groups.forEach((g, k) => rows.push({ c, idx: g.idx, first: k === 0, span: groups.length, head, view: g.view })); }
        else rows.push({ c, idx: null, first: true, span: 1, head, view: c.guide || `최대 ${c.max}점` });
    });
    if (stage === 'document' && s.rules.allowBonus) {
        // 옛 채용에는 가점 문구가 없다. 점수만 한 줄로 적는다.
        const view = s.rules.bonusOptions ? s.rules.bonusOptions.map(o => `${o.label}(${o.points}점)`).join('\n') : '확인된 가점 대상자\n(5점 또는 2.5점)';
        rows.push({ bonus: true, first: true, span: 1, head: `${items.length + 1}. ${s.rules.bonusLabel || '가점'}`, view });
    }
    return rows;
}
// 합산 항목은 배점에서 자르므로, 인쇄할 때도 위에서부터 배점이 찰 때까지만 줄에 나눠 싣는다. 줄의 합 = 항목 점수.
function allocate(c, pick) { let left = c.max; return c.options.map((o, i) => { const v = Math.min(o.points * pick[i], left); left -= v; return v; }); }
// 위원 한 사람이 지원자 한 사람에게 매긴 값을 해당 심사관점 줄에 놓는다. 고르지 않은 줄은 빈칸.
function cellValue(row, sr) {
    if (!row || row.attendance === 'absent') return '';
    if (sr.bonus) return row.bonus ? num(row.bonus) : '';
    const c = sr.c;
    if (sr.idx === null) return num(row.scores[c.id]);
    const pick = row.picks?.[c.id];
    if (pick === undefined || pick === null) return sr.first ? num(row.scores[c.id]) : '';
    if (c.kind === 'pick') return sr.idx.includes(pick) ? num(c.options[pick].points) : '';
    const share = allocate(c, pick), v = sr.idx.reduce((sum, i) => sum + share[i], 0);
    return v || sr.idx.some(i => pick[i]) ? num(v) : '';
}
const evRow = (s, stage, reviewerId, candidateId) => s.evaluations[`${stage}:${reviewerId}`]?.rows.find(x => x.candidateId === candidateId);
const totalOf = row => !row ? '' : row.attendance === 'absent' ? '불참' : num(Object.values(row.scores).reduce((a, b) => a + b, 0) + row.bonus);
// 본문 줄: 전형 칸(전체 병합) + 구분(관점 수만큼 병합) + 심사관점 + 값 칸들
function bodyRows(s, stage, rows, fill) {
    return rows.map((sr, k) => ({ cells: [
        ...(k === 0 ? [C(stage === 'document' ? '서류' : '면접', 'stage', 1, rows.length)] : []),
        ...(sr.first ? [C(sr.head, 'gubun', 1, sr.span)] : []),
        C(sr.view, 'view'), ...fill(sr)
    ] }));
}
function scorePages(s, stage, reviewer) {
    const list = stageList(s, stage), rows = sheetRows(s, stage);
    const size = Math.max(SLOTS[stage], Math.min(10, list.length));
    const totals = list.map(c => totalOf(evRow(s, stage, reviewer.id, c.id)));
    const scored = totals.map(t => t === '' || t === '불참' ? null : Number(t));
    return chunk(list, size).map(group => {
        const slots = [...group, ...Array(size - group.length).fill(null)];
        const value = (c, fn) => c ? fn(c) : C('', 'blank');
        const table = {
            cols: [...LEAD_COLS, ...slots.map(() => (100 - 42) / size)],
            rows: [
                { head: true, cells: [C('전형', 'h'), C('구분', 'h'), C('심사관점', 'h', 1, 2), C('강사별 심사표', 'h', size)] },
                { head: true, cells: [C('방법', 'h'), C('(배점)', 'h'), ...slots.map(c => C(c ? c.name : '', 'cand'))] },
                ...bodyRows(s, stage, rows, sr => slots.map(c => value(c, x => C(cellValue(evRow(s, stage, reviewer.id, x.id), sr), 'n')))),
                { cls: 'sum', cells: [C('총 계', 'h', 3), ...slots.map(c => value(c, x => C(totalOf(evRow(s, stage, reviewer.id, x.id)), 'nb')))] },
                ...(stage === 'interview' ? [{ cls: 'sum rank', cells: [C('강사 순위', 'h', 3), ...slots.map(c => value(c, x => {
                    const mine = scored[list.indexOf(x)];
                    return C(mine === null ? '' : 1 + scored.filter(o => o !== null && o > mine).length, 'nb');
                }))] }] : [])
            ]
        };
        return { type: 'sheet', title: `${s.field} 채용 ${stage === 'document' ? '서류심사' : '면접 심사'} 채점표`, field: s.field, signers: [reviewer], table, roomy: stage === 'interview', note: '', date: dotDate(stageDate(s, stage)), school: s.school };
    });
}
// 집계표: 지원자마다 위원 칸을 나란히 두고, 아래에 총계·평균·순위. 원본처럼 한 쪽 40칸까지.
function summaryPages(s, stage) {
    const reviewers = s.reviewers.filter(v => v.stages.includes(stage)), R = reviewers.length;
    const results = stage === 'document' ? s.documentResults : s.results;
    const list = stageList(s, stage).map(c => ({ c, res: results.find(x => x.candidateId === c.id) }));
    const size = Math.max(1, Math.min(SLOTS[stage], Math.floor(SUMMARY_COLUMNS / R)));
    const rows = sheetRows(s, stage);
    const basis = s.rules.rankingBasis === 'combined' ? '서류 평균 + 면접 평균' : '면접 평균';
    return chunk(list, size).map(group => {
        const slots = [...group, ...Array(size - group.length).fill(null)];
        const each = (x, fn) => reviewers.map(v => x ? fn(v) : C('', 'blank'));
        const absent = x => x.res?.absent ? '불참' : null;
        const per = (label, fn, cls = 'sum') => ({ cls, cells: [C(label, 'h', 3), ...slots.map(x => x ? C(fn(x), 'nb', R) : C('', 'blank', R))] });
        const table = {
            cols: [...LEAD_COLS, ...slots.flatMap(() => reviewers.map(() => (100 - 42) / (size * R)))],
            rows: [
                { head: true, cells: [C('전형\n방법', 'h', 1, 3), C('구분\n(배점)', 'h', 1, 3), C('심사관점', 'h', 1, 2), C('강사별 심사표', 'h', size * R)] },
                { head: true, cells: slots.map(x => C(x ? x.c.name : '', 'cand', R)) },
                { head: true, cells: [C('평가자', 'h'), ...slots.flatMap(x => reviewers.map(v => C(x ? v.name : '', 'who')))] },
                ...bodyRows(s, stage, rows, sr => slots.flatMap(x => each(x, v => C(cellValue(evRow(s, stage, v.id, x.c.id), sr), 'n')))),
                { cls: 'sum', cells: [C(stage === 'document' ? '총 계' : '소 계', 'h', 3), ...slots.flatMap(x => each(x, v => C(totalOf(evRow(s, stage, v.id, x.c.id)), 'n')))] },
                ...(stage === 'document'
                    ? [per('평 균', x => absent(x) ?? one(x.res?.score)), per('서류 심사 순위', x => absent(x) ?? rankText(x.res?.rank), 'sum rank')]
                    : [per('평 균', x => absent(x) ?? one(x.res?.interview)), per('서류전형 계', x => one(x.res?.document)), per('총 계', x => absent(x) ?? one(x.res?.total)), per('강사 순위', x => absent(x) ?? rankText(x.res?.rank), 'sum rank')])
            ]
        };
        const note = stage === 'document'
            ? `평균은 배정 위원 전원 제출 후 소수 첫째 자리 반올림 · 동점은 공동순위 · 면접대상자 선정 사유: ${s.shortlistReason ?? ''}`
            : `강사 순위 기준: ${basis} · 동점은 공동순위이며 최종 선발은 기관 기준에 따라 별도로 결정합니다.`;
        return { type: 'sheet', title: `${s.field} 채용 ${stage === 'document' ? '서류심사 집계표' : '면접 심사 집계 합산 및 순위'}`, field: s.field, signers: reviewers, table, tight: true, roomy: stage === 'interview', note, date: dotDate(stageDate(s, stage)), school: s.school };
    });
}
function pledgePageModel(s, reviewer) {
    const date = longDate(reviewer.stages.includes('document') ? s.documentDate : s.interviewDate);
    return { type: 'pledge', reviewer, date, school: s.school, items: s.pledgeItems || OLD_PLEDGE,
        lead: `본인은 ${date} ${s.school}의 ${s.field} 채용 심사를 실시함에 있어 「부패 없는 투명한 사회」 구현 등을 위하여 다음 사항을 준수할 것을 서약합니다.` };
}
function printPages(s) {
    const of = stage => s.reviewers.filter(v => v.stages.includes(stage));
    return [
        ...s.reviewers.map(v => pledgePageModel(s, v)),
        ...of('document').flatMap(v => scorePages(s, 'document', v)), ...summaryPages(s, 'document'),
        ...of('interview').flatMap(v => scorePages(s, 'interview', v)), ...summaryPages(s, 'interview')
    ];
}
module.exports = { printPages, sheetRows, cellValue };
