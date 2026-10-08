'use strict';
const ExcelJS = require('exceljs');
const JSZip = require('jszip');
const { stageTotal } = require('./domain');
const { printPages } = require('./sheets');
// 배점표는 채용마다 다르므로 확정 스냅샷의 rubrics 만 본다. 총점도 거기서 계산한다.
const rubric = (s, stage) => s.rubrics[stage];
const total = (s, stage) => stageTotal(s.rubrics, stage);
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const label = stage => stage === 'document' ? '서류심사' : '면접심사';
const display = value => value === null || value === undefined ? '—' : value;
function rowTotal(row) { return row.attendance === 'absent' ? '불참' : Object.values(row.scores).reduce((a, b) => a + b, 0) + row.bonus; }
function scoreFor(s, stage, reviewerId, candidateId) { const ev = s.evaluations[`${stage}:${reviewerId}`]; if (!ev?.submittedAt) return '미제출'; const row = ev.rows.find(v => v.candidateId === candidateId); return row ? rowTotal(row) : '—'; }
function statistics(s, stage) {
    const reviewers = s.reviewers.filter(v => v.stages.includes(stage));
    if (stage === 'document') return { headers: ['접수번호', '지원자', ...reviewers.map(v => `${v.name} 점수`), '제출/배정', '서류 평균', '서류 순위', '상태'], rows: s.documentResults.map(c => [c.code, c.name, ...reviewers.map(v => scoreFor(s, stage, v.id, c.candidateId)), `${c.submitted}/${c.required}`, display(c.score), display(c.rank), c.absent ? '불참' : '평가 완료']) };
    return { headers: ['접수번호', '지원자', '서류 평균', ...reviewers.map(v => `${v.name} 면접`), '제출/배정', '면접 평균', '합산 점수', '순위 기준 점수', '최종 순위', '상태'], rows: s.results.map(c => [c.code, c.name, display(c.document), ...reviewers.map(v => scoreFor(s, stage, v.id, c.candidateId)), `${c.submitted}/${c.required}`, display(c.interview), display(c.total), display(c.rankingScore), display(c.rank), c.absent ? '불참·순위 제외' : '평가 완료']) };
}
// ── 인쇄용 HTML: sheets.js 의 쪽 모형을 그린다. 한/글(hwpx.js)도 같은 모형을 쓴다. 전부 A4 세로. ──
const br = v => escape(v).replace(/\n/g, '<br>');
// 서명 이미지는 signPledge 가 PNG 바이트로 다시 인코딩한 것이라 src 에 다른 내용이 실리지 않는다.
function signMark(v) { return v.pledge?.image ? `<img class="sign-inline" src="${v.pledge.image}" alt="${escape(v.name)} 서명">` : '<span class="sign-blank">(서명 또는 인)</span>'; }
const TH = new Set(['h', 'stage', 'cand', 'who']);
function htmlTable(t, cls) {
    const span = c => `${c.cs > 1 ? ` colspan="${c.cs}"` : ''}${c.rs > 1 ? ` rowspan="${c.rs}"` : ''}`;
    const cell = c => TH.has(c.k) ? `<th class="${c.k}"${span(c)}>${br(c.v)}</th>` : `<td class="${c.k}"${span(c)}>${br(c.v)}</td>`;
    const head = t.rows.filter(r => r.head), body = t.rows.filter(r => !r.head);
    const tr = r => `<tr${r.cls ? ` class="${r.cls}"` : ''}>${r.cells.map(cell).join('')}</tr>`;
    return `<table class="grid ${cls}"><colgroup>${t.cols.map(w => `<col style="width:${w.toFixed(3)}%">`).join('')}</colgroup><thead>${head.map(tr).join('')}</thead><tbody>${body.map(tr).join('')}</tbody></table>`;
}
function htmlPage(p) {
    if (p.type === 'pledge') {
        const v = p.reviewer;
        return `<section class="page"><div class="pledge"><h2>청 렴 서 약 서(평가위원용)</h2><p class="lead">${escape(p.lead)}</p><ol>${p.items.map(x => `<li>${escape(x)}</li>`).join('')}</ol><p class="date">${p.date}</p><p class="signer">서약자　직위: ${escape(v.position)}　　성명: ${escape(v.name)}　${signMark(v)}</p><p class="to">${escape(p.school)} 장 귀하</p></div></section>`;
    }
    const signers = p.signers.map(v => `<div>채점자　직위: ${escape(v.position)}　성명: ${escape(v.name)}　${signMark(v)}</div>`).join('');
    return `<section class="page"><div class="title">${escape(p.title)}</div><div class="meta"><div class="area"><span class="area-tag">영역</span>${escape(p.field)}</div><div class="signers">${signers}</div></div>${htmlTable(p.table, `${p.tight ? 'tight' : ''} ${p.roomy ? 'roomy' : ''}`)}${p.note ? `<p class="note">${escape(p.note)}</p>` : ''}<div class="foot"><p>${p.date}</p><p>${escape(p.school)}</p></div></section>`;
}
function printHtml(r) {
    const s = r.snapshot;
    return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="no-referrer"><title>${escape(s.title)} · 확정본</title><style>
    *{box-sizing:border-box}body{font-family:Arial,'Malgun Gothic','Apple SD Gothic Neo',sans-serif;color:#000;background:#e8eaed;margin:0;font-size:10pt;line-height:1.35}
    .toolbar{padding:12px 18px;background:#fff;position:sticky;top:0;z-index:2;border-bottom:1px solid #ccc;display:flex;flex-wrap:wrap;gap:10px 16px;align-items:center}.toolbar button{font:inherit;background:#0066cc;color:#fff;border:0;padding:9px 18px;border-radius:6px;cursor:pointer}.toolbar .hint{font-size:13px;color:#354650}
    /* 보이는 모양 = 인쇄 모양: A4 세로 한 장 */
    .page{background:#fff;width:210mm;min-height:297mm;margin:20px auto;padding:12mm 10mm;box-shadow:0 1px 6px rgba(0,0,0,.2);break-after:page}
    .page:last-child{break-after:auto}
    .title{border:2px solid #000;background:#ffff00;text-align:center;font-size:15pt;font-weight:700;padding:6px 4px;letter-spacing:.5px}
    .meta{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin:6px 0 10px;font-size:9.5pt}
    .area{display:flex;align-items:center;gap:6px}.area-tag{border:1px solid #000;background:#ffff00;padding:1px 10px}
    .signers{text-align:right}.signers div{line-height:26px;white-space:nowrap}
    .sign-inline{height:24px;max-width:90px;vertical-align:middle;object-fit:contain}.sign-blank{font-size:7.5pt}
    table.grid{width:100%;border-collapse:collapse;table-layout:fixed;border:2px solid #000}
    .grid th,.grid td{border:1px solid #000;padding:3px 4px;vertical-align:middle;word-break:keep-all;overflow-wrap:anywhere}
    .grid th{background:#d9d9d9;font-weight:700;text-align:center}
    .grid td.gubun,.grid td.view{font-size:8pt;text-align:left;line-height:1.3}
    .grid td.n,.grid td.nb,.grid td.blank{text-align:center;font-variant-numeric:tabular-nums}.grid td.nb{font-weight:700}
    .grid th.cand{font-weight:400;font-size:8pt;padding:3px 1px;word-break:break-all}
    .grid tbody tr{height:28px}.grid tr.sum{height:30px}.grid tr.rank td{background:#fff2cc}
    .grid.tight td.n,.grid.tight th.who{font-size:6.5pt;padding:1px 0;letter-spacing:-.3px}.grid.tight th.who{font-weight:400;word-break:break-all;line-height:1.1}.grid.tight tbody tr{height:24px}.grid.tight td.gubun,.grid.tight td.view{font-size:7.5pt}
    .grid.roomy td.gubun,.grid.roomy td.view{font-size:10pt;line-height:1.45}.grid.roomy tbody tr{height:78px}.grid.roomy tr.sum{height:40px}.grid.roomy td.n,.grid.roomy td.nb{font-size:11pt;font-weight:700}.grid.roomy.tight td.n{font-size:9pt}.grid.roomy th.cand{font-size:10pt}
    .note{font-size:8pt;margin:6px 0 0;color:#333}
    .foot{text-align:center;margin-top:14px;font-size:11pt}.foot p{margin:4px 0}
    .pledge{border:1px solid #000;min-height:265mm;padding:12mm 12mm 10mm;font-size:11pt;line-height:2}
    .pledge h2{text-align:center;font-size:15pt;margin:0 0 14mm;letter-spacing:2px}.pledge .lead{margin:0 0 8mm}
    .pledge ol{padding-left:1.4em;margin:0}.pledge li{margin:0 0 6mm}
    .pledge .date{text-align:center;margin:16mm 0 6mm}.pledge .signer{text-align:right;margin:0 0 14mm}.pledge .to{font-weight:700;font-size:12pt}
    @page{size:A4 portrait;margin:0}
    @media print{body{background:#fff}.toolbar{display:none}.page{margin:0;box-shadow:none}a{color:inherit}}
    @media screen and (max-width:900px){.page{width:auto;min-height:0;margin:10px 6px;padding:14px}.pledge{min-height:0}}
    </style></head><body><div class="toolbar"><button onclick="window.print()">인쇄 / PDF로 저장</button><span class="hint">A4 세로로 한 장씩 인쇄됩니다. 인쇄 창에서 배율은 ‘기본값’, 여백은 ‘없음’ 또는 ‘기본값’으로 두세요.</span></div>${printPages(s).map(htmlPage).join('')}</body></html>`;
}
// 위원이 고른 심사관점을 글로. 재량 항목·불참·옛 채용은 빈칸.
function picked(item, row) {
    const pick = row.picks?.[item.id];
    if (row.attendance === 'absent' || pick === undefined || pick === null) return '';
    if (item.kind === 'pick') return pick === -1 ? '해당 없음' : `${item.options[pick].label}(${item.options[pick].points}점)`;
    const chosen = item.options.map((o, i) => pick[i] ? (o.unit ? `${o.label} ${pick[i]}${o.unit}` : o.label) : null).filter(Boolean);
    return chosen.length ? chosen.join(', ') : '해당 없음';
}
async function workbook(r) {
    const s = r.snapshot, wb = new ExcelJS.Workbook(); wb.creator = '백암이'; wb.created = new Date(s.finalizedAt);
    function sheet(name, headers, rows) {
        const ws = wb.addWorksheet(name, { views: [{ state: 'frozen', ySplit: 1 }], pageSetup: { paperSize: 9, orientation: 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 0 } });
        ws.addRow(headers); rows.forEach(row => ws.addRow(row)); ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }; ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF164C7B' } };
        ws.columns.forEach((col, i) => { col.width = i < 2 ? 18 : 20; }); ws.eachRow(row => { row.alignment = { vertical: 'middle', wrapText: true }; row.height = 30; }); ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: headers.length } }; return ws;
    }
    sheet('설정 및 집계 기준', ['항목', '값'], [['학교', s.school], ['채용명', s.title], ['분야', s.field], ['서류전형일', s.documentDate], ['면접일', s.interviewDate], ['확정일시', s.finalizedAt], ['순위 기준', s.rules.rankingBasis === 'combined' ? '서류 평균 + 면접 평균' : '면접 평균'], ['평균', '배정 위원 전원 제출, 전형별 소수 첫째 자리 반올림'], ['합산', '표시된 서류 평균 + 표시된 면접 평균'], ['동점', '공동순위 1,2,2,4 / 합격 자동 결정 없음'], ['불참', '점수·순위 제외 / 위원 간 불참 표시 일치 필수'], ['가점', s.rules.allowBonus ? '기본 20점 이상, 확인 근거 필수, 0/2.5/5점' : '미사용'], ['면접대상자 선정 사유', s.shortlistReason]]);
    for (const stage of ['document', 'interview']) { const stat = statistics(s, stage); sheet(stage === 'document' ? '서류심사 집계표' : '면접 최종 집계표', stat.headers, stat.rows); }
    for (const stage of ['document', 'interview']) sheet(stage === 'document' ? '서류 배점표' : '면접 배점표', ['항목', '배점'],
        [...rubric(s, stage).map(item => [item.label, item.max]), ['합계', total(s, stage)]]);
    sheet('평가위원 및 서약', ['위원', '직위', '담당 전형', '청렴서약서 서명', '서명 일시'],
        s.reviewers.map(v => [v.name, v.position, v.stages.map(label).join(' · '), v.pledge?.signedAt ? '서명 완료' : '미서명',
            v.pledge?.signedAt ? new Date(v.pledge.signedAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }) : '—']));
    const details = [];
    for (const ev of Object.values(s.evaluations)) for (const row of ev.rows) {
        const c = s.candidates.find(c => c.id === row.candidateId), v = s.reviewers.find(v => v.id === ev.reviewerId);
        for (const item of rubric(s, ev.stage)) details.push([label(ev.stage), c.code, c.name, v.name, v.position, item.label, item.max, row.attendance === 'absent' ? '불참' : row.scores[item.id], picked(item, row), '', row.note, ev.submittedAt]);
        details.push([label(ev.stage), c.code, c.name, v.name, v.position, '합계 (가점 포함)', '', rowTotal(row), '', row.bonus, row.note, ev.submittedAt]);
    }
    sheet('위원별 평가 상세', ['전형', '접수번호', '지원자', '위원', '직위', '항목', '최대 배점', '점수', '고른 심사관점', '가점', '메모', '제출 시각'], details);
    return Buffer.from(await wb.xlsx.writeBuffer());
}
async function exportResult(r, format) {
    if (format === 'html') return { type: 'text/html; charset=utf-8', buffer: Buffer.from(printHtml(r)) };
    if (format === 'hwpx') return { type: 'application/hwp+zip', buffer: await require('./hwpx').buildHwpx(r) };
    const xlsx = await workbook(r);
    if (format === 'xlsx') return { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer: xlsx };
    const hwpx = await require('./hwpx').buildHwpx(r);
    const zip = new JSZip(); zip.file('평가통계_확정본.xlsx', xlsx); zip.file('평가통계_확정본.hwpx', hwpx); zip.file('채점표_서약서_인쇄용.html', printHtml(r)); zip.file('확정데이터.json', JSON.stringify(r.snapshot, null, 2)); zip.file('읽어주세요.txt', 'HTML 파일을 브라우저에서 열고 인쇄 / PDF로 저장 버튼을 누르세요.\nGoogle 미연결 상태에서 생성한 로컬 결과 묶음입니다.\n서약서 문구는 기관 확인 후 사용하며 자필 서명은 별도입니다.');
    return { type: 'application/zip', buffer: await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' }) };
}
module.exports = { exportResult, printHtml, workbook, statistics, escape };
