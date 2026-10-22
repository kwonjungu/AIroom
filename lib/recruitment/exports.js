'use strict';
const ExcelJS = require('exceljs');
const JSZip = require('jszip');
const { stageTotal } = require('./domain');
const { printPages, summaryPages, documentOnly } = require('./sheets');
const { contractPages, metaLines: contractMetaLines } = require('../../public/recruitment/contract-sheets');
// 배점표는 채용마다 다르므로 확정 스냅샷의 rubrics 만 본다. 총점도 거기서 계산한다.
const rubric = (s, stage) => s.rubrics[stage];
const total = (s, stage) => stageTotal(s.rubrics, stage);
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const label = stage => ({ document: '서류심사', interview: '면접심사', demo: '수업실연' })[stage];
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
    return `<section class="page${p.orient === 'landscape' ? ' land' : ''}"><div class="title">${escape(p.title)}</div><div class="meta"><div class="area"><span class="area-tag">영역</span>${escape(p.field)}</div><div class="signers">${signers}</div></div>${htmlTable(p.table, `${p.tight ? 'tight' : ''} ${p.roomy ? 'roomy' : ''}`)}${p.note ? `<p class="note">${escape(p.note)}</p>` : ''}<div class="foot"><p>${p.date}</p><p>${escape(p.school)}</p></div></section>`;
}
// ── 계약제 교원 채용 표준: 인쇄용 HTML. contract-sheets.js 의 쪽 모형을 그대로 그린다. ──
// 쪽마다 용지 방향이 다르다(서약서·면접·수업실연·응모자별·교과목별 = 세로, 서류전형·집계표 = 가로).
// CSS named page(@page port / @page land)로 한 파일 안에서 방향을 바꿔 인쇄한다. 줄 높이는 모형의 mm 그대로.
function contractTable(t) {
    const span = c => `${c.cs > 1 ? ` colspan="${c.cs}"` : ''}${c.rs > 1 ? ` rowspan="${c.rs}"` : ''}`;
    const cell = c => TH.has(c.k) ? `<th class="${c.k}"${span(c)}>${br(c.v)}</th>` : `<td class="${c.k}"${span(c)}>${br(c.v)}</td>`;
    return `<table class="cgrid${t.tight ? ' tight' : ''}${t.roomy ? ' roomy' : ''}"><colgroup>${t.cols.map(w => `<col style="width:${(w / t.cols.reduce((a, b) => a + b, 0) * 100).toFixed(3)}%">`).join('')}</colgroup>`
        + `<tbody>${t.rows.map(r => `<tr${r.cls ? ` class="${r.cls}"` : ''} style="height:${r.h}mm">${r.cells.map(cell).join('')}</tr>`).join('')}</tbody></table>`;
}
function contractMeta(p) {
    const lay = contractMetaLines(p), rows = [];
    const signer = v => v ? `${escape(p.role)} 직위: ${escape(v.position)}　성명: ${escape(v.name)}　${signMark(v)}` : '';
    for (let i = 0; i < lay.signerRows; i++) {
        const left = i === 0 && p.area !== null ? `<span class="area-tag">영역</span>${escape(p.area)}` : '';
        rows.push(`<div class="mrow"><div class="ml">${left}</div>${Array.from({ length: p.signerCols }, (x, k) => `<div class="mr">${signer(p.signers[i * p.signerCols + k])}</div>`).join('')}</div>`);
    }
    if (lay.ownLine) rows.push(`<div class="mrow"><div class="ml"></div><div class="mr">하기와 같이 공정하게 평가함.</div></div>`);
    return `<div class="cmeta">${rows.join('')}</div>`;
}
function contractHtmlPage(p) {
    const orient = p.orient === 'landscape' ? 'land' : 'port';
    if (p.type === 'pledge') {
        const v = p.reviewer;
        return `<section class="page ${orient} cpledge"><h2>${escape(p.title)}</h2><p class="lead">${escape(p.lead)}</p><p class="date">${escape(p.date)}</p>`
            + `<div class="who"><p>소속:　${escape(p.school)}</p><p>직위:　${escape(v.position)}</p><p>성명:　${escape(v.name)}　${signMark(v)}</p></div><p class="to">${escape(p.school)}장　　귀하</p></section>`;
    }
    return `<section class="page ${orient}"><div class="ctitle">${escape(p.title)}</div>${contractMeta(p)}`
        + p.blocks.map(b => `${b.caption ? `<div class="caption">${escape(b.caption)}</div>` : ''}${contractTable(b.table)}`).join('')
        + p.notes.map(n => `<p class="cnote">${escape(n)}</p>`).join('')
        + `<div class="cfoot"><p>${escape(p.date)}</p><p>${escape(p.school)}</p></div></section>`;
}
function contractPrintHtml(s) {
    return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="no-referrer"><title>${escape(s.title)} · 확정본</title><style>
    *{box-sizing:border-box}body{font-family:'Malgun Gothic','Apple SD Gothic Neo',Arial,sans-serif;color:#000;background:#e8eaed;margin:0;font-size:9.5pt;line-height:1.25}
    .toolbar{padding:12px 18px;background:#fff;position:sticky;top:0;z-index:2;border-bottom:1px solid #ccc;display:flex;flex-wrap:wrap;gap:10px 16px;align-items:center}.toolbar button{font:inherit;background:#0066cc;color:#fff;border:0;padding:9px 18px;border-radius:6px;cursor:pointer}.toolbar .hint{font-size:13px;color:#354650}
    @page port{size:A4 portrait;margin:0}@page land{size:A4 landscape;margin:0}
    .page{background:#fff;margin:20px auto;padding:10mm;box-shadow:0 1px 6px rgba(0,0,0,.2);overflow:hidden;break-after:page}
    .page:last-child{break-after:auto}.page.port{page:port;width:210mm;height:297mm}.page.land{page:land;width:297mm;height:210mm}
    .ctitle{border:2px solid #000;background:#ffff00;text-align:center;font-size:16pt;font-weight:700;height:10mm;line-height:9.4mm;margin-bottom:2mm}
    .cmeta{margin-bottom:2.5mm}.mrow{display:flex;height:5.5mm;align-items:center;gap:4mm}.ml{flex:1 1 auto;white-space:nowrap}.mr{flex:0 0 auto;text-align:right;white-space:nowrap}
    .area-tag{display:inline-block;border:1px solid #000;background:#ffff00;padding:0 4mm;margin-right:2mm}
    .sign-inline{height:5mm;max-width:20mm;vertical-align:middle;object-fit:contain}.sign-blank{font-size:8pt}
    .caption{text-align:right;height:6mm;line-height:6mm}
    table.cgrid{width:100%;border-collapse:collapse;table-layout:fixed;border:1.5px solid #000;margin-bottom:3mm}
    .cgrid th,.cgrid td{border:1px solid #000;padding:0 1mm;vertical-align:middle;text-align:center;word-break:keep-all;overflow:hidden}
    .cgrid th{background:#d9d9d9;font-weight:700}.cgrid th.cand{font-weight:400}.cgrid th.stage{background:#efefef}
    .cgrid td.gubun,.cgrid td.view{text-align:left;font-size:8pt;line-height:1.2}.cgrid td.nb{font-weight:700}.cgrid tr.rank td{background:#fff2cc}
    .cgrid.tight th.who{font-size:6pt;font-weight:400;line-height:1.05;padding:0}.cgrid.tight td.n,.cgrid.tight td.nb{font-size:6.5pt;padding:0;letter-spacing:-.3px}.cgrid.tight th.cand{font-size:8pt}
    .cgrid.roomy td.view{font-size:10pt}.cgrid.roomy td.nb,.cgrid.roomy td.n{font-size:11pt}.cgrid.roomy th.cand{font-size:10pt}
    .cnote{margin:0;height:5mm;line-height:5mm;font-size:9pt;white-space:nowrap}
    .cfoot{text-align:center;font-size:13pt;margin-top:4mm}.cfoot p{margin:0;height:6mm;line-height:6mm}
    .cpledge{padding:25mm 18mm}.cpledge h2{text-align:center;font-size:20pt;font-weight:400;margin:10mm 0 18mm}.cpledge .lead{font-size:13pt;line-height:2;text-align:justify;margin:0 0 35mm}
    .cpledge .date{text-align:center;font-size:13pt;margin:0 0 25mm}.cpledge .who{margin-left:55mm;font-size:13pt}.cpledge .who p{margin:0 0 6mm}.cpledge .to{text-align:center;font-size:20pt;margin-top:22mm}
    @media print{body{background:#fff}.toolbar{display:none}.page{margin:0;box-shadow:none}}
    @media screen and (max-width:900px){.page{transform-origin:top left}}
    </style></head><body><div class="toolbar"><button onclick="window.print()">인쇄 / PDF로 저장</button><span class="hint">쪽마다 A4 세로·가로가 정해져 있습니다. 인쇄 창에서 배율은 ‘기본값’, 여백은 ‘없음’으로 두세요.</span></div>${contractPages(s).map(contractHtmlPage).join('')}</body></html>`;
}
function printHtml(r) {
    const s = r.snapshot;
    if (s.layout === 'contract') return contractPrintHtml(s);
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
    @page{size:A4 portrait;margin:0}@page land{size:A4 landscape;margin:0}
    /* 집계표를 가로로 고른 채용: 그 쪽만 A4 가로. 위원 서명 줄은 두 열로. */
    .page.land{page:land;width:297mm;min-height:210mm}.page.land .signers{display:grid;grid-template-columns:repeat(2,auto);column-gap:8mm}
    @media print{body{background:#fff}.toolbar{display:none}.page{margin:0;box-shadow:none}a{color:inherit}}
    @media screen and (max-width:900px){.page{width:auto;min-height:0;margin:10px 6px;padding:14px}.pledge{min-height:0}}
    </style></head><body><div class="toolbar"><button onclick="window.print()">인쇄 / PDF로 저장</button><span class="hint">A4 한 장씩 인쇄됩니다(집계표를 가로로 고른 채용은 그 쪽만 가로). 인쇄 창에서 배율은 ‘기본값’, 여백은 ‘없음’으로 두세요.</span></div>${printPages(s).map(htmlPage).join('')}</body></html>`;
}
// 위원이 고른 심사관점을 글로. 재량 항목·불참·옛 채용은 빈칸.
function picked(item, row) {
    const pick = row.picks?.[item.id];
    if (row.attendance === 'absent' || pick === undefined || pick === null) return '';
    if (item.kind === 'pick') return pick === -1 ? '해당 없음' : `${item.options[pick].label}(${item.options[pick].points}점)`;
    const chosen = item.options.map((o, i) => pick[i] ? (o.unit ? `${o.label} ${pick[i]}${o.unit}` : o.label) : null).filter(Boolean);
    return chosen.length ? chosen.join(', ') : '해당 없음';
}
// 인쇄본 집계표(심사관점 줄 × 지원자·위원 칸)를 시트에 그대로 옮긴다. 쪽이 여럿이면 한 줄 띄고 이어 붙인다.
// 표 모형은 덮인 칸을 목록에서 빼므로, 차지한 칸을 표시해 가며 다음 빈 칸에 놓는다.
function gridSheet(wb, name, pages, orientation = 'portrait') {
    const ws = wb.addWorksheet(name, { pageSetup: { paperSize: 9, orientation, fitToPage: true, fitToWidth: 1, fitToHeight: 0 } });
    const border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    const grey = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } }, yellow = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF2CC' } };
    let top = 1, width = 0;
    for (const p of pages) {
        ws.getCell(top, 1).value = p.title; ws.getCell(top, 1).font = { bold: true, size: 13 };
        ws.getCell(top + 1, 1).value = `영역: ${p.field}　평가자: ${p.signers.map(v => `${v.position} ${v.name}`).join(', ')}　${p.date}`;
        const start = top + 3, taken = new Set();
        p.table.rows.forEach((row, ri) => {
            let col = 1;
            for (const c of row.cells) {
                while (taken.has(`${ri},${col}`)) col++;
                for (let y = 0; y < c.rs; y++) for (let x = 0; x < c.cs; x++) taken.add(`${ri + y},${col + x}`);
                const cell = ws.getCell(start + ri, col), n = c.v !== '' && /^-?\d+(\.\d+)?$/.test(c.v) ? Number(c.v) : c.v;
                cell.value = n;
                if (c.cs > 1 || c.rs > 1) ws.mergeCells(start + ri, col, start + ri + c.rs - 1, col + c.cs - 1);
                for (let y = 0; y < c.rs; y++) for (let x = 0; x < c.cs; x++) ws.getCell(start + ri + y, col + x).border = border;
                const head = ['h', 'stage', 'cand', 'who'].includes(c.k);
                cell.alignment = { vertical: 'middle', horizontal: c.k === 'gubun' || c.k === 'view' ? 'left' : 'center', wrapText: true };
                if (head || c.k === 'nb') cell.font = { bold: head || c.k === 'nb' };
                if (c.k === 'h' || c.k === 'stage') cell.fill = grey; else if (row.cls?.includes('rank') && !head) cell.fill = yellow;
                width = Math.max(width, col + c.cs - 1); col += c.cs;
            }
        });
        if (p.note) ws.getCell(start + p.table.rows.length, 1).value = p.note;
        top = start + p.table.rows.length + 3;
    }
    ws.getColumn(1).width = 6; ws.getColumn(2).width = 22; ws.getColumn(3).width = 26;
    for (let i = 4; i <= width; i++) ws.getColumn(i).width = 8;
    return ws;
}
async function workbook(r) {
    const s = r.snapshot, wb = new ExcelJS.Workbook(); wb.creator = '백암이'; wb.created = new Date(s.finalizedAt);
    function sheet(name, headers, rows) {
        const ws = wb.addWorksheet(name, { views: [{ state: 'frozen', ySplit: 1 }], pageSetup: { paperSize: 9, orientation: 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 0 } });
        ws.addRow(headers); rows.forEach(row => ws.addRow(row)); ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }; ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF164C7B' } };
        ws.columns.forEach((col, i) => { col.width = i < 2 ? 18 : 20; }); ws.eachRow(row => { row.alignment = { vertical: 'middle', wrapText: true }; row.height = 30; }); ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: headers.length } }; return ws;
    }
    // 서류전형만 하는 채용은 면접일·면접대상자가 없고 순위 = 서류 평균이다.
    const only = documentOnly(s), contract = s.layout === 'contract';
    const stageNames = (s.stages || ['document', 'interview']).map(label).join(' → ');
    const basis = only ? `서류 평균${s.rules.allowBonus ? '(가점 포함)' : ''}` : contract ? (s.rules.rankingBasis === 'combined' ? '서류 + 면접 + 수업실연 평균' : '면접 + 수업실연 평균') : s.rules.rankingBasis === 'combined' ? '서류 평균 + 면접 평균' : '면접 평균';
    const sum = only ? '서류 평균만(면접 없음)' : contract ? '표시된 서류 평균 + 면접 평균 + 수업실연 평균' : '표시된 서류 평균 + 표시된 면접 평균';
    const by = s.rules.bonusByStage;
    const bonusRule = by ? `전형마다 만점의 40% 이상 득점자, 확인 근거 필수 · ${Object.entries(by).map(([st, b]) => `${label(st)} ${b.options.map(o => o.points).join('/')}점(${b.threshold}점 이상)`).join(' · ')}${only ? '' : ' · 한 영역이라도 40% 미만이면 가산점 제외'}`
        : s.rules.allowBonus ? `서류 기본 ${s.rules.bonusThreshold}점(만점의 40%) 이상, 확인 근거 필수, 0~${s.rules.bonusMax ?? 5}점 0.5점 간격` : '미사용';
    sheet('설정 및 집계 기준', ['항목', '값'], [['학교', s.school], ['채용 제목', s.title], ['분야', s.field], ['전형 구성', only ? '서류전형만' : stageNames], ['서류전형일', s.documentDate], ...(only ? [] : [[contract ? '면접·수업실연일' : '면접일', s.interviewDate]]), ['확정일시', s.finalizedAt], ['순위 기준', basis], ['평균', '배정 위원 전원 제출, 전형별 소수 첫째 자리 반올림'], ['합산', sum], ['동점', '공동순위 1,2,2,4 / 합격 자동 결정 없음'], ['불참', '점수·순위 제외 / 위원 간 불참 표시 일치 필수'], ['가점', bonusRule], ...(only ? [] : [['면접대상자 선정 사유', s.shortlistReason]])]);
    // 집계표는 인쇄본과 같은 심사관점 줄 단위. 지원자별 한 줄 요약은 통계 시트로 따로 둔다.
    if (s.layout === 'contract') {
        // 계약제: 인쇄본과 같은 집계 쪽을 원본 용지 방향 그대로 시트에 옮긴다(서류 집계 = 가로, 응모자별·교과목별 = 세로).
        // 표 모형이 블록 여러 개(응모자별)이면 블록마다 쪽 하나로 펼친다.
        const pages = contractPages(s).filter(p => p.type === 'sheet');
        const flat = title => pages.filter(p => p.title === title).flatMap(p => p.blocks.map(b => ({ title: p.title + (b.caption ? ` — ${b.caption}` : ''), field: p.area ?? s.field, signers: p.signers, date: p.date, table: b.table, note: p.notes.join(' ') })));
        gridSheet(wb, '서류전형 집계표', flat('계약제교원 채용 서류전형 평가 집계표'), 'landscape');
        if (!only) gridSheet(wb, '응모자별 평가 집계표', flat('계약제교원 채용 [응모자별 평가 집계표]'));
        gridSheet(wb, '교과목별 평가 집계표', flat('계약제교원 채용 [교과목별 평가 집계표]'));
        sheet('서류전형 통계', statistics(s, 'document').headers, statistics(s, 'document').rows);
        if (only) sheet('최종 통계', ['관리번호', '응모자', '서류 평균', '계', '가산점 제외', '순위'],
            s.results.map(c => [c.code, c.name, display(c.document), display(c.total), c.bonusExcluded ? '제외' : '', display(c.rank)]));
        else sheet('최종 통계', ['관리번호', '응모자', '서류 평균', '면접 평균', '수업실연 평균', '계', '가산점 제외', '순위'],
            s.results.map(c => [c.code, c.name, display(c.document), display(c.interview), display(c.demo), display(c.total), c.bonusExcluded ? '제외' : '', display(c.rank)]));
        for (const stage of s.stages) sheet(`${label(stage)} 배점표`, ['항목', '배점'], [...rubric(s, stage).map(item => [item.label, item.max]), ['합계', total(s, stage)]]);
    } else {
    const sumOrient = s.rules.summaryOrient === 'landscape' ? 'landscape' : 'portrait';
    const stages = only ? ['document'] : ['document', 'interview'];
    gridSheet(wb, only ? '서류심사 집계 및 순위' : '서류심사 집계표', summaryPages(s, 'document', { fit: true }), sumOrient);
    if (!only) gridSheet(wb, '면접 집계·합산 및 순위', summaryPages(s, 'interview', { fit: true }), sumOrient);
    for (const stage of stages) { const stat = statistics(s, stage); sheet(stage === 'document' ? (only ? '서류심사 최종 통계' : '서류심사 통계') : '면접 최종 통계', stat.headers, stat.rows); }
    for (const stage of stages) sheet(stage === 'document' ? '서류 배점표' : '면접 배점표', ['항목', '배점'],
        [...rubric(s, stage).map(item => [item.label, item.max]), ['합계', total(s, stage)]]);
    }
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
