// 근무지외연수허가원 HTML 버전 (미리보기/프린트용)
// 레이아웃은 HWPX 달력 템플릿(permit-calendar-template.hwpx)과 동일:
// 41조 기간표 + 근무상황일람표 달력(반응형) + 합계표
const { buildPeriods, buildCalendarWeeks, applyFortyOneInfo, summarize, formatApplyDate } = require('./hwpx');

function escapeHtml(s){
    return String(s==null?'':s)
        .replace(/&/g,'&amp;')
        .replace(/</g,'&lt;')
        .replace(/>/g,'&gt;')
        .replace(/"/g,'&quot;');
}

function generatePermitHtml(data){
    const name = data.name || '';
    const school = data.school || '백암초등학교';
    const applyDate = data.applyDate || formatApplyDate(new Date());
    const position = data.position || '교사';

    const fortyOnePeriods = data.fortyOnePeriods
        || applyFortyOneInfo(buildPeriods(data.days, '41조연수'), data.fortyOneInfo);
    const summary = data.summary || summarize(data.days, data.config);
    const weeks = buildCalendarWeeks(data.days, data.config);

    const sum41 = fortyOnePeriods.reduce((s,p)=>s+(Number(p.days)||0),0);

    const periodRow = (p)=>`
        <tr>
            <td>${escapeHtml(p.range||'')}</td>
            <td>${p.days===''||p.days==null?'':escapeHtml(String(p.days))}</td>
            <td>${escapeHtml(p.content||'')}</td>
            <td>${escapeHtml(p.place||'')}</td>
            <td>${escapeHtml(p.note||'')}</td>
        </tr>`;
    const fortyOneRows = (fortyOnePeriods.length?fortyOnePeriods:[{range:'',days:''}]).map(periodRow).join('');

    const calRows = weeks.map(w =>
        `<tr class="cal-date">${w.map(d=>`<td>${escapeHtml(d.dateLabel)}</td>`).join('')}</tr>`
        + `<tr class="cal-status">${w.map(d=>`<td>${escapeHtml(d.status)}</td>`).join('')}</tr>`
    ).join('');

    return `<!DOCTYPE html>
<html lang="ko"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>근무지 외 연수 허가원 - ${escapeHtml(name)}</title>
<style>
body{font-family:'맑은 고딕','Malgun Gothic',sans-serif;padding:30px;max-width:900px;margin:0 auto;color:#000;}
h1{text-align:center;font-size:28px;font-weight:800;margin-bottom:20px;letter-spacing:4px;}
h2{text-align:center;font-size:18px;margin-top:30px;}
.intro{line-height:1.8;margin:20px 0;}
table{width:100%;border-collapse:collapse;margin:16px 0;}
th,td{border:1px solid #333;padding:8px;text-align:center;font-size:13px;}
th{background:#d6d6d6;font-weight:700;}
.subtotal td{background:#f0f0f0;font-weight:700;}
.summary th{background:#e0eed1;}
.calendar{table-layout:fixed;}
.calendar th{background:#e8eaed;}
.calendar th:first-child,.calendar td:first-child,
.calendar th:last-child,.calendar td:last-child{background:#f3f3f3;}
.calendar th:first-child,.calendar th:last-child{background:#d6d6d6;}
.cal-date td{font-weight:700;padding:4px 2px;background:#fafafa;}
.cal-status td{height:34px;padding:4px 2px;font-size:12px;}
.signature{text-align:center;margin-top:40px;line-height:2;}
.signature .date{font-size:16px;}
.signature .name{font-size:16px;margin:8px 0;}
.signature .dest{font-size:18px;font-weight:700;margin-top:20px;}
@media (max-width:600px){ body{padding:12px;} th,td{padding:4px 2px;font-size:11px;} .cal-status td{font-size:10px;} }
@media print { body { padding: 10mm; } }
</style></head><body>
<h1>근무지 외 연수 허가원</h1>
<div class="intro">교육공무원법 제41조 및 공무원 복무규정 등의 법규에 의거 다음과 같이 연수원을 제출하오니 허가하여 주시기 바랍니다.</div>
<table>
<thead><tr><th>연수기간<br>41조연수</th><th>일수</th><th>연수 내용</th><th>연수 장소</th><th>비고(연락처)</th></tr></thead>
<tbody>${fortyOneRows}<tr class="subtotal"><td>계</td><td>${sum41}</td><td colspan="3"></td></tr></tbody>
</table>

<h2>휴가중 교원 근무상황일람표</h2>
<table class="calendar">
<thead><tr><th>일</th><th>월</th><th>화</th><th>수</th><th>목</th><th>금</th><th>토</th></tr></thead>
<tbody>${calRows||'<tr><td colspan="7">방학 기간이 설정되지 않았습니다.</td></tr>'}</tbody>
</table>

<table class="summary">
<thead><tr><th>근무</th><th>출장</th><th>출장연수</th><th>41조연수</th><th>연가</th><th>기타</th><th>근무/41조</th><th>토·일·공휴일</th><th>합계</th></tr></thead>
<tbody><tr>
<td>(${summary.work||0})일</td>
<td>(${summary.business||0})일</td>
<td>(${summary.businessTraining||0})일</td>
<td>(${summary.fortyOne||0})일</td>
<td>(${summary.leave||0})일</td>
<td>(${summary.other||0})일</td>
<td>(${summary.workForty||0})일</td>
<td>(${summary.weekendHoliday||0})일</td>
<td>(${summary.total||0})일</td>
</tr></tbody>
</table>

<div class="signature">
    <div class="date">${escapeHtml(applyDate)}</div>
    <div class="name">직 ${escapeHtml(position)}  성명 ${escapeHtml(name)} (인)</div>
    <div class="dest">${escapeHtml(school)}장 귀하</div>
</div>
<div style="text-align:center;margin-top:20px;">
    <button onclick="window.print()" style="padding:10px 20px;font-size:14px;cursor:pointer;">🖨️ 인쇄</button>
</div>
</body></html>`;
}

module.exports = { generatePermitHtml };
