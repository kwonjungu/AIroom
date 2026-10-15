// 계약제 교원 채용 표준의 출력물 '쪽' 모형. 인쇄용 HTML(exports.js)·한/글(hwpx.js)·Excel 이 이 모형 하나를 그린다.
// 서버(require)와 브라우저(window.RecruitmentContractSheets) 양쪽에서 읽는다. Node 전용 API 를 쓰지 않는다.
(function (root) {
'use strict';
// 원본: 계약제교원 채용 [지원12, 심사3] 프로그램(KHSDO). 시트 순서와 용지 방향을 그대로 따른다.
//   서약서(위원별, 세로) → 서류전형(위원별, 가로) → 서류전형 집계표(가로) → 면접(위원별, 세로)
//   → 수업실연(위원별, 세로) → 응모자별 평가 집계표(세로) → 교과목별 평가 집계표(세로)
// 원본과 다른 점(사용자 결정 2026-10-15):
//   · 지원자 칸은 12칸이 아니라 10칸 한 장. 11명부터 같은 표를 한 장씩 더 만든다(21명 = 3장).
//   · 심사위원은 3명 고정이 아니라 1~5명. 집계표는 지원자마다 위원 칸이, 응모자별 표는 위원 줄이 늘어난다.
//   · 면접·수업실연은 원본처럼 세로 3칸. 대상자가 더 있으면 장을 더한다.
//   · 응모자별 표는 한 장에 들어가는 만큼(위원 3명이면 원본처럼 3명, 5명이면 2명) 싣고 넘친 대상자는 다음 장으로.
// 모든 높이는 mm 로 모형에 적는다. HTML 은 그대로 tr 높이로, 한/글은 칸 최소 높이로 쓰고,
// fits() 가 같은 숫자로 A4 한 장 안에 드는지 계산한다(테스트가 위원 5명·지원자 100명까지 확인).

const A4 = { portrait: { width: 190, height: 277 }, landscape: { width: 277, height: 190 } };   // 여백 10mm 를 뺀 본문
const SLOTS = { document: 10, interview: 3, demo: 3 };
const H = { title: 12, metaLine: 5.5, metaGap: 2.5, caption: 6, blockGap: 3, note: 5, foot: 17 };
const dotDate = iso => { const [y, m, d] = iso.split('-').map(Number); return `${y}. ${m}. ${d}.`; };
const num = v => v === null || v === undefined || v === '' ? '' : String(Number(v));
const one = v => v === null || v === undefined ? '' : (Math.round(Number(v) * 10) / 10).toFixed(1);
const C = (v, k, cs = 1, rs = 1) => ({ v: v === null || v === undefined ? '' : String(v), k, cs, rs });
const chunk = (list, size) => { const out = []; for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size)); return out.length ? out : [[]]; };
const pad = (list, size) => [...list, ...Array(Math.max(0, size - list.length)).fill(null)];
const stageMax = (s, stage) => Math.round(s.rubrics[stage].reduce((a, c) => a + c.max, 0) * 10) / 10;
const threshold = (s, stage) => Math.round(stageMax(s, stage) * 0.4 * 100) / 100;
const reviewersOf = (s, stage) => s.reviewers.filter(v => v.stages.includes(stage));
const listOf = (s, stage) => stage === 'document' ? s.candidates : s.shortlist.map(id => s.candidates.find(c => c.id === id)).filter(Boolean);
const evRow = (s, stage, vid, cid) => s.evaluations[`${stage}:${vid}`]?.rows.find(x => x.candidateId === cid);
const baseOf = row => Object.values(row.scores).reduce((a, b) => a + (b || 0), 0);
const totalOf = row => !row ? '' : row.attendance === 'absent' ? '불참' : num(baseOf(row) + row.bonus);
const subtotalOf = row => !row ? '' : row.attendance === 'absent' ? '불참' : num(baseOf(row));
// 글 줄 수로 줄 높이를 잡는다(9pt ≈ 3.6mm/줄). 좁은 칸에서 줄이 접히지 않게 표 폭을 넉넉히 준다.
const lines = v => String(v ?? '').split('\n').length;
const tall = (base, ...texts) => Math.max(base, ...texts.map(t => 2.4 + lines(t) * 3.6));

// ── 평가 기준 줄(원본 A·B·C열) ─────────────────────────────────────────────────
// 원본 서류전형 표의 줄을 항목에서 만든다. 각 줄: { head(첫 줄만), headSpan, view, points, value(row) }.
function documentLines(s) {
    const items = s.rubrics.document, out = [];
    let n = 0;
    items.forEach((c, i) => {
        if (!c.join) n++;
        // 원본 A열 칸은 뒤따르는 join 항목 줄까지 덮는다.
        let span = rowsOf(c);
        for (let j = i + 1; j < items.length && items[j].join; j++) span += rowsOf(items[j]);
        const head = c.join ? null : { text: c.head || `${n}. ${c.label}`, span };
        if (c.kind === 'pick') {
            const shown = Math.max(c.options.length, c.print?.rows || 0);
            for (let k = 0; k < shown; k++) {
                const o = c.options[k];
                out.push({ c, head: k === 0 ? head : null, view: o ? o.label : '', points: o ? num(o.points) : '', viewSpan: 1,
                    merge: c.print?.merge ? (k === 0 ? shown : 0) : 1,
                    value: row => {
                        const pick = row.picks?.[c.id];
                        if (c.print?.merge) return pick === undefined || pick === null ? num(row.scores[c.id]) : num(pick === -1 ? 0 : c.options[pick].points);
                        if (pick === -1) return k === 0 ? '0' : '';
                        return pick === k ? num(o.points) : '';
                    } });
            }
            return;
        }
        // 원본에서 점수 목록(드롭다운)으로 매기는 줄은 B:C 를 합쳐 준거 글을 적는다.
        out.push({ c, head, view: c.guide || c.label, points: null, viewSpan: 2, merge: 1, value: row => num(row.scores[c.id]) });
    });
    return out;
}
function rowsOf(c) { return c.kind === 'pick' ? Math.max(c.options.length, c.print?.rows || 0) : 1; }
const bonusHead = (s, stage, no) => `${no}. 채용시험 가점 여부${stage === 'document' ? `\n${num(threshold(s, stage))}점(40%)이상 득점자` : ''}`;
const bonusText = (s, stage) => s.rules.bonusByStage?.[stage]?.text ?? ({ document: '국가유공자법 29조1항\n1,2,4호(3점), 3,5호(1.5점)', interview: '국가유공자법 29조1항[1,2,4호(4점), 3,5호(2점)]', demo: '국가유공자법 29조1항[1,2,4호(3점), 3,5호(1.5점)]' })[stage];
const bonusValue = row => !row || row.attendance === 'absent' ? '' : row.bonus ? num(row.bonus) : '';
const noteLines = (s, stage) => (s.contract?.notes?.[stage] || []).map(v => s.rubrics[stage] ? v.replace('{t}', num(threshold(s, stage))) : v);

// ── 머리(원본 1~4행) ───────────────────────────────────────────────────────────
// area: 영역 칸(노랑). signers: 오른쪽 서명 줄. fair: '하기와 같이 공정하게 평가함.'
function head(s, { title, orient, signers, role, area = true, fair = true, date }) {
    // 서명 줄: 원본은 위원 3명을 세로 세 줄로 쌓는다. 가로 쪽에 4~5명이면 두 열로 나눠 표 자리를 지킨다.
    const signerCols = orient === 'landscape' && signers.length > 3 ? 2 : 1;
    return { type: 'sheet', orient, title, area: area ? s.field : null, fair, role, signers, signerCols, date: dotDate(date), school: s.school, blocks: [], notes: [] };
}
// 머리 줄 수: 서명 줄 + ('하기와 같이 공정하게 평가함.' 문구가 있으면) 한 줄.
function metaLines(p) {
    const signerRows = Math.max(1, Math.ceil(p.signers.length / p.signerCols));
    return { signerRows, ownLine: !!p.fair };
}
function metaHeight(p) { const m = metaLines(p); return H.title + (m.signerRows + (m.ownLine ? 1 : 0)) * H.metaLine + H.metaGap; }
function tableHeight(t) { return t.rows.reduce((a, r) => a + r.h, 0); }
function pageHeight(p) {
    if (p.type === 'pledge') return 0;
    return metaHeight(p) + p.blocks.reduce((a, b) => a + (b.caption ? H.caption : 0) + tableHeight(b.table) + H.blockGap, 0) + p.notes.length * H.note + H.foot;
}
// 한/글은 표마다 문단 한 줄 몫의 여백을 더한다(실측 2~3mm). 모형은 그만큼 여유를 두고 자른다.
const SLACK = 6;
const fits = p => pageHeight(p) <= A4[p.orient].height - SLACK + 0.01;

// ── 1. 서약서(위원별, 세로) ────────────────────────────────────────────────────
function pledgePage(s, v) {
    const year = s.documentDate.slice(0, 4);
    return { type: 'pledge', orient: 'portrait', reviewer: v, school: s.school, date: dotDate(s.documentDate),
        title: '임용심사위원 서약서',
        lead: `본인은 ${year} 학년도 ${s.school}  『기간제교원』 ${(s.pledgeItems || [])[0] || ''}` };
}

// ── 2. 서류전형 평가표(위원별, 가로, 10명씩) ─────────────────────────────────────
function documentSheet(s, v, group, rankAll) {
    const L = documentLines(s), slots = pad(group, SLOTS.document);
    const val = (c, fn) => c ? fn(evRow(s, 'document', v.id, c.id), c) : '';
    const rows = [
        { head: true, h: 7, cells: [C('평가 기준', 'h', 2, 2), C('', 'h'), C('응모자별 평가 점수', 'h', SLOTS.document)] },
        { head: true, h: 7, cells: [C('배점', 'h'), ...slots.map(c => C(c ? c.name : '', 'cand'))] }
    ];
    for (const ln of L) {
        const cells = [];
        if (ln.head) cells.push(C(ln.head.text, 'gubun', 1, ln.head.span));
        cells.push(C(ln.view, 'view', ln.viewSpan));
        if (ln.viewSpan === 1) cells.push(C(ln.points, 'n'));
        if (ln.merge) for (const c of slots) cells.push(C(val(c, row => row && row.attendance !== 'absent' ? ln.value(row) : ''), 'n', 1, ln.merge));
        rows.push({ h: tall(6.6, ln.view, ln.head && ln.head.span === 1 ? ln.head.text : ''), cells });
    }
    // 원본 A열 칸이 여러 줄을 덮을 때 그 글이 들어갈 높이를 확보한다.
    fitHeads(rows, 2);
    rows.push({ cls: 'sum', h: 7.5, cells: [C('소계', 'h', 3), ...slots.map(c => C(val(c, row => subtotalOf(row)), 'nb'))] });
    rows.push({ h: tall(7.5, bonusHead(s, 'document', 6), bonusText(s, 'document')), cells: [C(bonusHead(s, 'document', 6), 'gubun'), C(bonusText(s, 'document'), 'view', 2), ...slots.map(c => C(val(c, row => bonusValue(row)), 'n'))] });
    rows.push({ cls: 'sum', h: 7.5, cells: [C('합계', 'h', 3), ...slots.map(c => C(val(c, row => totalOf(row)), 'nb'))] });
    const p = head(s, { title: '계약제교원 채용 서류전형 평가표', orient: 'landscape', role: '서류전형 위원', signers: [v], date: s.documentDate });
    p.blocks.push({ table: { cols: [22.6, 16.8, 6.4, ...slots.map(() => 9)], rows } });
    p.notes = noteLines(s, 'document');
    return p;
}
// rowspan 칸(평가 기준 글)이 덮는 줄 높이의 합이 글 높이보다 낮으면 첫 줄을 늘린다.
function fitHeads(rows, start) {
    rows.forEach((row, i) => {
        if (i < start) return;
        const cell = row.cells[0];
        if (!cell || cell.k !== 'gubun' || cell.rs < 2) return;
        const need = 2.4 + lines(cell.v) * 3.6, have = rows.slice(i, i + cell.rs).reduce((a, r) => a + r.h, 0);
        if (need > have) row.h += need - have;
    });
}

// ── 3. 서류전형 집계표(가로, 10명씩 × 위원 칸) ───────────────────────────────────
function documentSummary(s, group) {
    const R = reviewersOf(s, 'document'), L = documentLines(s), slots = pad(group, SLOTS.document);
    const res = c => s.documentResults.find(x => x.candidateId === c.id);
    const each = (c, fn, k = 'n', rs = 1) => R.map(v => C(c ? fn(evRow(s, 'document', v.id, c.id)) : '', k, 1, rs));
    // 위원 전원이 불참으로 적은 지원자는 위원 칸(약 4mm)마다 '불참'을 쓰지 않고 칸을 합쳐 한 번만 쓴다.
    const sumCells = (c, fn) => c && res(c)?.absent ? [C('불참', 'nb', R.length)] : each(c, fn);
    // 위원 이름은 좁은 칸에 세로로(원본 9행처럼 높은 줄).
    const whoH = Math.max(7, 2 + Math.max(...R.map(v => [...v.name].length)) * 2.6);
    const rows = [
        { head: true, h: 6, cells: [C('평가 기준', 'h', 2, 3), C('', 'h', 1, 2), C('응모자별 평가 점수 집계', 'h', SLOTS.document * R.length)] },
        { head: true, h: 6, cells: slots.map(c => C(c ? c.name : '', 'cand', R.length)) },
        { head: true, h: whoH, cells: [C('배점', 'h'), ...slots.flatMap(c => R.map(v => C(c ? [...v.name].join('\n') : '', 'who')))] }
    ];
    for (const ln of L) {
        const cells = [];
        if (ln.head) cells.push(C(ln.head.text, 'gubun', 1, ln.head.span));
        cells.push(C(ln.view, 'view', ln.viewSpan));
        if (ln.viewSpan === 1) cells.push(C(ln.points, 'n'));
        if (ln.merge) for (const c of slots) cells.push(...each(c, row => row && row.attendance !== 'absent' ? ln.value(row) : '', 'n', ln.merge));
        rows.push({ h: tall(5, ln.view, ln.head && ln.head.span === 1 ? ln.head.text : ''), cells });
    }
    fitHeads(rows, 3);
    const per = (label, fn, cls = 'sum') => ({ cls, h: 5.8, cells: [C(label, 'h', 3), ...slots.map(c => C(c ? fn(c) : '', 'nb', R.length))] });
    rows.push({ cls: 'sum', h: 5.8, cells: [C('소계', 'h', 3), ...slots.flatMap(c => sumCells(c, row => subtotalOf(row)))] });
    rows.push({ h: tall(5.8, bonusHead(s, 'document', 6), bonusText(s, 'document')), cells: [C(bonusHead(s, 'document', 6), 'gubun'), C(bonusText(s, 'document'), 'view', 2), ...slots.flatMap(c => each(c, row => bonusValue(row)))] });
    rows.push({ cls: 'sum', h: 5.8, cells: [C('합계', 'h', 3), ...slots.flatMap(c => sumCells(c, row => totalOf(row)))] });
    rows.push(per('평균', c => res(c)?.absent ? '불참' : one(res(c)?.score)));
    rows.push(per('서류 전형 순위', c => res(c)?.absent ? '불참' : res(c)?.rank ?? '', 'sum rank'));
    // 원본 집계표에는 '하기와 같이 공정하게 평가함.' 문구가 없다.
    const p = head(s, { title: '계약제교원 채용 서류전형 평가 집계표', orient: 'landscape', role: '서류전형 위원', signers: R, fair: false, date: s.documentDate });
    // 앞 세 칸(평가 기준·배점) 폭은 원본 비율, 나머지를 위원 칸이 나눠 쓴다.
    const lead = [17, 14, 3.2], rest = 100 - lead.reduce((a, b) => a + b, 0);
    p.blocks.push({ table: { tight: true, cols: [...lead, ...slots.flatMap(() => R.map(() => rest / (SLOTS.document * R.length)))], rows } });
    return p;
}

// ── 4·5. 면접 / 수업실연 평가표(위원별, 세로, 3명씩) ──────────────────────────────
function oralSheet(s, stage, v, group, ranks) {
    const items = s.rubrics[stage], slots = pad(group, SLOTS[stage]);
    const val = (c, fn) => c ? fn(evRow(s, stage, v.id, c.id), c) : '';
    const rows = [
        { head: true, h: 10.6, cells: [C('평가 기준', 'h', 2, 2), C('배점', 'h', 1, 2), C('강사별 평가표', 'h', SLOTS[stage])] },
        { head: true, h: 10.6, cells: slots.map(c => C(c ? c.name : '', 'cand')) },
        ...items.map((c, i) => ({ h: tall(15.9, c.guide || c.label), cells: [C(i + 1, 'n'), C(c.guide || c.label, 'view'), C(num(c.max), 'n'), ...slots.map(x => C(val(x, row => row && row.attendance !== 'absent' ? num(row.scores[c.id]) : ''), 'nb'))] })),
        { cls: 'sum', h: 15.9, cells: [C('소계', 'h', 2), C(num(stageMax(s, stage)), 'nb'), ...slots.map(x => C(val(x, row => subtotalOf(row)), 'nb'))] },
        { h: 15.9, cells: [C(items.length + 1, 'n'), C(`채용시험 가점 여부\n${bonusText(s, stage)}`, 'view', 2), ...slots.map(x => C(val(x, row => bonusValue(row)), 'nb'))] },
        { cls: 'sum', h: 15.9, cells: [C('합 계', 'h', 3), ...slots.map(x => C(val(x, row => totalOf(row)), 'nb'))] },
        { cls: 'sum rank', h: 15.9, cells: [C('강사 순위', 'h', 3), ...slots.map(x => C(x ? ranks.get(x.id) ?? '' : '', 'nb'))] }
    ];
    const p = head(s, { title: stage === 'interview' ? '계약제교원 채용 면접 기준 및 평가표' : '계약제교원 채용 수업실연 기준 및 평가표', orient: 'portrait', role: stage === 'interview' ? '면접위원' : '수업심사위원', signers: [v], date: s.interviewDate });
    p.blocks.push({ table: { roomy: true, cols: [5.6, 39.8, 6.2, ...slots.map(() => 14)], rows } });
    p.notes = noteLines(s, stage);
    return p;
}
// 위원 한 사람 기준 강사 순위(원본: 그 위원 표 안의 RANK). 장이 나뉘어도 대상자 전체에서 매긴다.
function reviewerRanks(s, stage, v) {
    const list = listOf(s, stage).map(c => { const t = totalOf(evRow(s, stage, v.id, c.id)); return { id: c.id, t: t === '' || t === '불참' ? null : Number(t) }; });
    return new Map(list.map(x => [x.id, x.t === null ? '' : 1 + list.filter(o => o.t !== null && o.t > x.t).length]));
}

// ── 6. 응모자별 평가 집계표(세로, 대상자 블록 = 위원 수만큼 줄) ─────────────────────
const stageHead = (s, stage) => ({ document: '서류', interview: '면접', demo: '수업실연' })[stage] + `(${num(stageMax(s, stage))})\n+가산점`;
function applicantBlock(s, c) {
    const R = s.reviewers, stages = s.stages;
    const cellOf = (v, stage) => { if (!v.stages.includes(stage)) return ''; const t = totalOf(evRow(s, stage, v.id, c.id)); return t; };
    const vals = R.map(v => { const row = stages.map(stage => cellOf(v, stage)); const nums = row.filter(x => x !== '' && x !== '불참').map(Number); return [...row, nums.length ? num(nums.reduce((a, b) => a + b, 0)) : '']; });
    const col = k => vals.map(r => r[k]).filter(x => x !== '' && x !== '불참').map(Number);
    const sum = k => col(k).length ? num(Math.round(col(k).reduce((a, b) => a + b, 0) * 10) / 10) : '';
    const avg = k => col(k).length ? one(col(k).reduce((a, b) => a + b, 0) / col(k).length) : '';
    const rowH = 8.5, total = stages.length + 1;
    const rows = [
        { head: true, h: 7.5, cells: [C('과목', 'h', 1, 2), C('심사위원 성명', 'h', 1, 2), C('평 가 점 수', 'h', total)] },
        { head: true, h: 10.6, cells: [...stages.map(stage => C(stageHead(s, stage), 'h')), C(`계(${num(stages.reduce((a, st) => a + stageMax(s, st), 0))})\n+가산점`, 'h')] },
        ...R.map((v, i) => ({ h: rowH, cells: [...(i === 0 ? [C(s.contract.subject, 'stage', 1, R.length + 2)] : []), C(v.name, 'cand'), ...vals[i].map(x => C(x, 'n'))] })),
        { cls: 'sum', h: rowH, cells: [C('합계', 'h'), ...Array.from({ length: total }, (x, k) => C(sum(k), 'nb'))] },
        { cls: 'sum', h: rowH, cells: [C('평균', 'h'), ...Array.from({ length: total }, (x, k) => C(avg(k), 'nb'))] }
    ];
    return { caption: `관리번호: ${c.code}　　성명: ${c.name}`, table: { cols: [9, 20, ...Array(total).fill(71 / total)], rows } };
}
// 블록을 쪽에 담는다: 들어가는 만큼 싣고 넘치면 새 장(위원 수가 늘면 한 장에 드는 대상자가 줄어든다).
function packBlocks(make, blocks) {
    const pages = [];
    let page = make();
    for (const b of blocks) {
        page.blocks.push(b);
        if (!fits(page) && page.blocks.length > 1) { page.blocks.pop(); pages.push(page); page = make(); page.blocks.push(b); }
    }
    pages.push(page);
    return pages;
}
function applicantPages(s) {
    const lead = s.reviewers[0];
    const make = () => { const p = head(s, { title: '계약제교원 채용 [응모자별 평가 집계표]', orient: 'portrait', role: '집계 담당자', signers: [lead], fair: false, date: s.interviewDate }); p.notes = noteLines(s, 'final'); return p; };
    return packBlocks(make, listOf(s, 'interview').map(c => applicantBlock(s, c)));
}

// ── 7. 교과목별 평가 집계표(세로, 대상자 한 줄씩) ─────────────────────────────────
function subjectPages(s) {
    const list = listOf(s, 'interview'), res = c => s.results.find(x => x.candidateId === c.id), stages = s.stages;
    const show = (x, stage) => { if (!x) return ''; const r = s[stage === 'document' ? 'documentResults' : stage === 'interview' ? 'results' : 'demoResults']?.find(y => y.candidateId === x.candidateId); if (!r) return ''; if (r.absent) return '불참'; return one(x.bonusExcluded ? r.base : r.score); };
    const make = () => { const p = head(s, { title: '계약제교원 채용 [교과목별 평가 집계표]', orient: 'portrait', role: '집계 담당자', signers: [s.reviewers[0]], area: false, fair: false, date: s.interviewDate }); p.notes = noteLines(s, 'final'); return p; };
    const headRows = [
        { head: true, h: 7.9, cells: [C('과목', 'h', 1, 2), C('관리\n번호', 'h', 1, 2), C('응모자 성명', 'h', 1, 2), C('평 가 점 수', 'h', stages.length + 1), C('순위', 'h', 1, 2)] },
        { head: true, h: 13.2, cells: [...stages.map(stage => C(stageHead(s, stage), 'h')), C(`계(${num(stages.reduce((a, st) => a + stageMax(s, st), 0))})\n+가산점`, 'h')] }
    ];
    // 한 장에 드는 줄 수를 계산해 나눈다.
    const probe = make(); probe.blocks.push({ table: { rows: headRows } });
    const perPage = Math.max(1, Math.floor((A4.portrait.height - pageHeight(probe) - 6) / 10.6));
    return chunk(list, perPage).map(group => {
        const p = make();
        const rows = group.map((c, i) => { const x = res(c); return { h: 10.6, cells: [...(i === 0 ? [C(s.contract.subject, 'stage', 1, group.length)] : []), C(c.code, 'n'), C(c.name, 'cand'), ...stages.map(stage => C(show(x, stage), 'n')), C(x?.absent ? '불참' : one(x?.total), 'nb'), C(x?.rank ?? '', 'nb')] }; });
        const excluded = group.filter(c => res(c)?.bonusExcluded);
        if (excluded.length) p.notes = [...p.notes, `가산점 제외(한 영역 40% 미만): ${excluded.map(c => `${c.code} ${c.name}`).join(', ')} — 점수 칸은 가산점을 뺀 평균입니다.`];
        p.blocks.push({ table: { cols: [6.4, 10.1, 12.6, ...stages.map(() => 12.4), 13.5, 11.4], rows: [...headRows, ...rows] } });
        return p;
    });
}

function contractPages(s) {
    const docR = reviewersOf(s, 'document');
    const docGroups = chunk(s.candidates, SLOTS.document);
    return [
        ...s.reviewers.map(v => pledgePage(s, v)),
        ...docR.flatMap(v => docGroups.map(g => documentSheet(s, v, g))),
        ...docGroups.map(g => documentSummary(s, g)),
        ...['interview', 'demo'].filter(st => s.stages.includes(st)).flatMap(stage => reviewersOf(s, stage).flatMap(v => { const ranks = reviewerRanks(s, stage, v); return chunk(listOf(s, stage), SLOTS[stage]).map(g => oralSheet(s, stage, v, g, ranks)); })),
        ...applicantPages(s),
        ...subjectPages(s)
    ];
}
const api = { contractPages, pageHeight, fits, metaLines, A4, SLOTS };
if (typeof module === 'object' && module.exports) module.exports = api; else root.RecruitmentContractSheets = api;
})(typeof window !== 'undefined' ? window : globalThis);
