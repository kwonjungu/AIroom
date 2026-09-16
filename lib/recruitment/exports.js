'use strict';
const ExcelJS = require('exceljs');
const JSZip = require('jszip');
const { stageTotal } = require('./domain');
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
const table = (headers, rows) => `<table><thead><tr>${headers.map(h => `<th scope="col">${escape(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(row => `<tr>${row.map((v, i) => i === 0 ? `<th scope="row">${escape(v)}</th>` : `<td>${escape(v)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
function signedOn(reviewer) { return reviewer.pledge?.signedAt ? new Date(reviewer.pledge.signedAt).toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul', year: 'numeric', month: 'long', day: 'numeric' }) : null; }
// The stored image is re-encoded PNG bytes from signPledge, so the src carries no other payload.
function signatureBlock(reviewer) {
    const on = signedOn(reviewer);
    const mark = reviewer.pledge?.image
        ? `<img class="sign-image" src="${reviewer.pledge.image}" alt="${escape(reviewer.name)} 서명">`
        : '<span class="sign-blank">(서명 또는 인)</span>';
    // 시스템 출처 문구는 넣지 않는다. 종이 서약서와 같은 모양이 공문서로 쓰기 좋다.
    return `날짜: ${on ? escape(on) : '______년 ____월 ____일'}<br>직위: ${escape(reviewer.position)}<br>성명: ${escape(reviewer.name)}　${mark}`;
}
function printHtml(r) {
    const s = r.snapshot, basis = s.rules.rankingBasis === 'combined' ? '서류 평균 + 면접 평균' : '면접 평균';
    const header = title => `<header><p>${escape(s.school)} · ${escape(s.field)}</p><h1>${escape(title)}</h1><p>${escape(s.title)} · 확정본 v${s.version}</p></header>`;
    const footer = `<footer>확정 시각 ${escape(new Date(s.finalizedAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }))} (한국시간) · 백암이 채용 관리</footer>`;
    const sections = [];
    for (const stage of ['document', 'interview']) {
        const stat = statistics(s, stage);
        sections.push(`<section class="page landscape">${header(stage === 'document' ? '서류심사 집계표' : '면접·최종 합산 통계표')}<div class="rule">최종 순위 기준: <strong>${escape(basis)}</strong> · 동점은 공동순위 (1, 2, 2, 4)<br>전형 평균은 배정 위원 전원 제출 후 계산, 소수 첫째 자리 반올림. 합산은 표시된 두 전형 평균의 합.<br>서류 기본 ${total(s, 'document')}점${s.rules.allowBonus ? ' + 확인된 가점 최대 5점' : ' · 가점 미사용'} / 면접 ${total(s, 'interview')}점. 불참은 0점과 구분하고 순위에서 제외.</div>${table(stat.headers, stat.rows)}<p class="note">${stage === 'document' ? `면접대상자 선정 사유: ${escape(s.shortlistReason)}` : '이 표는 평가 순위이며, 동점자의 최종 선발은 기관의 확정된 기준에 따라 별도로 결정합니다.'}</p>${footer}</section>`);
    }
    for (const reviewer of s.reviewers) {
        sections.push(`<section class="page pledge">${header('청렴서약서 (평가위원용)')}<p>본인은 ${escape(s.documentDate)}부터 진행되는 ${escape(s.school)}의 ${escape(s.field)} 채용 심사를 실시함에 있어 다음 사항을 준수할 것을 서약합니다.</p><ol><li>객관적이고 공정한 평가를 위하여 관련 업체 또는 개인위탁강사와의 이해관계를 확인하고, 이해충돌이 있는 경우 담당자에게 알리겠습니다.</li><li>평가와 관련하여 금품·향응·편의를 수수하거나 제공받지 않으며, 이러한 상황이 발생하면 담당 부서에 통보하겠습니다.</li><li>업무상 취득한 비밀을 준수하고 보안 관련 규정과 지침을 성실히 수행하겠습니다.</li><li>평가와 관련하여 알게 된 업무상 비밀을 타인에게 누설하지 않겠습니다.</li></ol><p class="note">원본 서약서의 핵심 항목을 반영한 출력 초안입니다. 기관의 확정 문구를 확인한 뒤 사용하세요.</p><div class="signature">${signatureBlock(reviewer)}<br><br>${escape(s.school)}장 귀하</div>${footer}</section>`);
        for (const stage of reviewer.stages) {
            const ev = s.evaluations[`${stage}:${reviewer.id}`];
            for (let start = 0; start < ev.rows.length; start += 5) {
                const group = ev.rows.slice(start, start + 5);
                const headers = ['평가 항목', '최대 배점', ...group.map(row => { const c = s.candidates.find(v => v.id === row.candidateId); return `${c.code} ${c.name}`; })];
                const rows = rubric(s, stage).map(item => [item.label, item.max, ...group.map(row => row.attendance === 'absent' ? '불참' : row.scores[item.id])]);
                if (stage === 'document') rows.push(['가점', s.rules.allowBonus ? 5 : '미사용', ...group.map(row => row.bonus)]);
                rows.push(['합계', total(s, stage) + (stage === 'document' && s.rules.allowBonus ? 5 : 0), ...group.map(rowTotal)]);
                sections.push(`<section class="page">${header(`${label(stage)} 채점표`)}<p>채점자 직위: ${escape(reviewer.position)}　성명: ${escape(reviewer.name)}　${reviewer.pledge?.image ? `<img class="sign-inline" src="${reviewer.pledge.image}" alt="${escape(reviewer.name)} 서명">` : '(서명 또는 인)'}</p><p>전형일: ${escape(stage === 'document' ? s.documentDate : s.interviewDate)} · 대상 ${start + 1}~${start + group.length}명</p>${table(headers, rows)}<p class="note">서류 자격증 점수는 자격증 항목 합계로 최대 6점입니다. 가점은 별도 근거 확인 후 적용합니다.</p>${footer}</section>`);
                if (group.some(row => row.note)) sections.push(`<section class="page">${header(`${label(stage)} 평가 메모 · ${reviewer.name}`)}${group.filter(row => row.note).map(row => { const c = s.candidates.find(v => v.id === row.candidateId); return `<h2>${escape(c.code)} ${escape(c.name)}</h2><p style="white-space:pre-wrap;overflow-wrap:anywhere">${escape(row.note)}</p>`; }).join('')}${footer}</section>`);
            }
        }
    }
    return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="no-referrer"><title>${escape(s.title)} · 확정본</title><style>
    *{box-sizing:border-box}body{font-family:'Malgun Gothic','Apple SD Gothic Neo',sans-serif;color:#17232b;background:#eceff1;margin:0;font-size:11pt;line-height:1.65}.toolbar{padding:18px;background:#fff;position:sticky;top:0;border-bottom:1px solid #ccc}.toolbar button{font:inherit;background:#0066cc;color:#fff;border:0;padding:9px 18px;border-radius:6px}.page{background:#fff;max-width:1120px;margin:24px auto;padding:36px;break-after:page}.page:last-child{break-after:auto}header{border-bottom:2px solid #17232b;margin-bottom:22px;padding-bottom:12px}h1{font-size:22pt;margin:6px 0}p{margin:8px 0}.rule,.note{font-size:10pt;color:#354650;margin:15px 0}table{width:100%;border-collapse:collapse;font-size:10pt;table-layout:fixed}th,td{border:1px solid #aab4bd;padding:9px 6px;text-align:center;overflow-wrap:anywhere;white-space:pre-wrap}thead{display:table-header-group}th{background:#f0f3f5}tr{break-inside:avoid}footer{font-size:9pt;color:#64727c;margin-top:28px;border-top:1px solid #ccc;padding-top:10px}.sign-image{display:inline-block;vertical-align:middle;height:52px;max-width:230px;object-fit:contain}.sign-inline{vertical-align:middle;height:34px;max-width:150px;object-fit:contain}.sign-blank{color:#5a6a74}.pledge{max-width:850px}.pledge li{margin:24px 0}.signature{text-align:right;margin:40px 0}.toolbar span{margin-left:15px;font-size:14px}@page{size:A4 landscape;margin:12mm}@media print{body{background:white}.toolbar{display:none}.page{padding:0;margin:0;max-width:none;min-height:0}.pledge{padding:0 30mm}a{color:inherit}}@media(max-width:700px){.page{padding:16px;margin:12px 0}table{font-size:9pt}.toolbar span{display:block;margin:10px 0 0}}
    </style></head><body><div class="toolbar"><button onclick="window.print()">인쇄 / PDF로 저장</button><span>인쇄 대상에서 ‘PDF로 저장’을 선택하세요. 실제 자필 서명은 별도입니다.</span></div>${sections.join('')}</body></html>`;
}
async function workbook(r) {
    const s = r.snapshot, wb = new ExcelJS.Workbook(); wb.creator = '백암이'; wb.created = new Date(s.finalizedAt);
    function sheet(name, headers, rows) {
        const ws = wb.addWorksheet(name, { views: [{ state: 'frozen', ySplit: 1 }], pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 } });
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
        for (const item of rubric(s, ev.stage)) details.push([label(ev.stage), c.code, c.name, v.name, v.position, item.label, item.max, row.attendance === 'absent' ? '불참' : row.scores[item.id], '', row.note, ev.submittedAt]);
        details.push([label(ev.stage), c.code, c.name, v.name, v.position, '합계 (가점 포함)', '', rowTotal(row), row.bonus, row.note, ev.submittedAt]);
    }
    sheet('위원별 평가 상세', ['전형', '접수번호', '지원자', '위원', '직위', '항목', '최대 배점', '점수', '가점', '메모', '제출 시각'], details);
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
