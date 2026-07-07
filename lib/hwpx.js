// HWPX 문서 생성 엔진 (근무지외연수허가원용)
// 핵심: ZIP-level XML 치환 + <hp:tr> 행 복제/삭제 + mimetype STORED 보존
// 템플릿: AIroom/templates/permit-calendar-template.hwpx (조성균 교감 샘플 기반)
//   구조: 41조 기간표(4x5) + 근무상황일람표 달력(9x7) + 합계표(2x9) + 서명(2x1)
// 구 템플릿(permit-template.hwpx, 기간표만)은 fillMainTable과 함께 남겨둠 (레거시)

const JSZip = require('jszip');
const fs = require('fs');
const path = require('path');

const TEMPLATES_DIR = path.join(__dirname, '..', 'templates');
const _cache = new Map();

function loadTemplate(name) {
    if (!_cache.has(name)) {
        _cache.set(name, fs.readFileSync(path.join(TEMPLATES_DIR, name)));
    }
    return _cache.get(name);
}

function xmlEscape(text) {
    return String(text == null ? '' : text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

// XML 문자열 안에서 N번째 <hp:t>...</hp:t>의 내부 텍스트를 교체
function rewriteNthText(xml, n, newValue) {
    let i = 0;
    return xml.replace(/<hp:t>([^<]*)<\/hp:t>/g, (match) => {
        if (i++ === n) return `<hp:t>${xmlEscape(newValue)}</hp:t>`;
        return match;
    });
}

// XML 내 <hp:tr>...</hp:tr> 블록 모두 추출 (순서대로 반환)
function extractRowBlocks(tableInner) {
    const rows = [];
    let idx = 0;
    while (true) {
        const s = tableInner.indexOf('<hp:tr>', idx);
        if (s === -1) break;
        const e = tableInner.indexOf('</hp:tr>', s) + '</hp:tr>'.length;
        rows.push(tableInner.slice(s, e));
        idx = e;
    }
    return rows;
}

// 테이블 블록 내부 구조를 보존하면서 행만 교체.
// <hp:tbl OPEN><preamble(hp:sz/hp:pos/hp:outMargin/hp:inMargin)><hp:tr>...</hp:tr>...<hp:tr>...</hp:tr></hp:tbl>
// preamble을 떼어내고, 행만 교체한 뒤 preamble + 새 rows 재조립.
function splitTableParts(sectionXml, tblOpenRe) {
    const openMatch = sectionXml.match(tblOpenRe);
    if (!openMatch) return null;
    const tblStart = openMatch.index;
    const tblOpenEnd = tblStart + openMatch[0].length;
    const tblCloseIdx = sectionXml.indexOf('</hp:tbl>', tblOpenEnd);
    if (tblCloseIdx === -1) return null;
    const tblEnd = tblCloseIdx + '</hp:tbl>'.length;
    const tableInner = sectionXml.slice(tblOpenEnd, tblCloseIdx);
    const firstTrIdx = tableInner.indexOf('<hp:tr>');
    if (firstTrIdx === -1) return null;
    const preamble = tableInner.slice(0, firstTrIdx);
    const rowsBlock = tableInner.slice(firstTrIdx);
    const rows = extractRowBlocks(rowsBlock);
    return {
        before: sectionXml.slice(0, tblStart),
        openTag: openMatch[0],
        preamble,
        rows,
        afterClose: sectionXml.slice(tblEnd),
    };
}

// 행 XML에 대해 모든 <hp:cellAddr ... rowAddr="N"/>의 rowAddr를 newRowIdx로 재지정
// HWPX 레이아웃 엔진은 cellAddr의 (colAddr, rowAddr) 쌍이 테이블 내 유일해야 정상 동작.
// 같은 row template을 복제해서 삽입할 때 rowAddr 중복이 발생하므로 반드시 갱신.
function setRowAddr(rowXml, newRowIdx) {
    return rowXml.replace(/rowAddr="\d+"/g, `rowAddr="${newRowIdx}"`);
}

// 메인 기간표 동적 재구성: 41조·근무 기간 수에 맞게 행 추가/제거
// 템플릿 기본 구조(rowCnt=12): H1(0) / 41조 data(1..4) / 소계1(5) / H2(6) / 근무 data(7..10) / 소계2(11)
const MAX_41JO_PERIODS = 30;
const MAX_WORK_PERIODS = 30;

function fillMainTable(sectionXml, fortyOnePeriods, workPeriods) {
    const parts = splitTableParts(sectionXml, /<hp:tbl\b[^>]*?rowCnt="12"[^>]*?>/);
    if (!parts || parts.rows.length !== 12) return sectionXml;

    if (fortyOnePeriods.length > MAX_41JO_PERIODS || workPeriods.length > MAX_WORK_PERIODS) {
        throw new Error('기간 수가 지나치게 많습니다.');
    }

    const header1 = parts.rows[0];
    const data41Template = parts.rows[1];
    const subtotal1Template = parts.rows[5];
    const header2 = parts.rows[6];
    const dataWorkTemplate = parts.rows[7];
    const subtotal2Template = parts.rows[11];

    const sum41 = fortyOnePeriods.reduce((s, p) => s + (Number(p.days) || 0), 0);
    const sumWork = workPeriods.reduce((s, p) => s + (Number(p.days) || 0), 0);

    const makeDataRow = (tmpl, range, days, idx) => {
        let r = rewriteNthText(tmpl, 0, range == null ? '' : String(range));
        r = rewriteNthText(r, 1, days === '' || days == null ? '' : String(days));
        return setRowAddr(r, idx);
    };
    const makeSubtotal = (tmpl, total, idx) => {
        const r = rewriteNthText(tmpl, 1, String(total));
        return setRowAddr(r, idx);
    };

    const out = [];
    let idx = 0;
    out.push(setRowAddr(header1, idx++));

    // 41조 섹션: 기간이 0개라도 빈 행 1개는 유지 (레이아웃 보존)
    const count41 = Math.max(fortyOnePeriods.length, 1);
    for (let i = 0; i < count41; i++) {
        const p = fortyOnePeriods[i];
        out.push(makeDataRow(data41Template, p ? p.range : '', p ? p.days : '', idx++));
    }
    out.push(makeSubtotal(subtotal1Template, sum41, idx++));

    out.push(setRowAddr(header2, idx++));
    const countWork = Math.max(workPeriods.length, 1);
    for (let i = 0; i < countWork; i++) {
        const p = workPeriods[i];
        out.push(makeDataRow(dataWorkTemplate, p ? p.range : '', p ? p.days : '', idx++));
    }
    out.push(makeSubtotal(subtotal2Template, sumWork, idx++));

    const newRowCnt = out.length;
    const newOpenTag = parts.openTag.replace(/rowCnt="\d+"/, `rowCnt="${newRowCnt}"`);

    return parts.before + newOpenTag + parts.preamble + out.join('') + '</hp:tbl>' + parts.afterClose;
}

// ---- 달력(근무상황일람표) ----

// 행 XML을 <hp:tc> 셀 블록 배열로 분해 (앞뒤 여백 포함 재조립용)
function extractCellBlocks(rowXml) {
    const cells = [];
    let idx = 0;
    while (true) {
        const s = rowXml.indexOf('<hp:tc', idx);
        if (s === -1) break;
        const e = rowXml.indexOf('</hp:tc>', s) + '</hp:tc>'.length;
        cells.push({ start: s, end: e, xml: rowXml.slice(s, e) });
        idx = e;
    }
    return cells;
}

// 셀(tc) XML의 첫 번째 <hp:run>의 텍스트를 교체.
// 템플릿 셀은 <hp:run charPrIDRef="N"/> (빈 셀) 또는 <hp:run ...><hp:t>..</hp:t></hp:run> 형태.
function setTcText(tcXml, value) {
    const re = /<hp:run charPrIDRef="(\d+)"(?:\/>|>[\s\S]*?<\/hp:run>)/;
    return tcXml.replace(re, (m, cp) => {
        if (value == null || value === '') return `<hp:run charPrIDRef="${cp}"/>`;
        return `<hp:run charPrIDRef="${cp}"><hp:t>${xmlEscape(value)}</hp:t></hp:run>`;
    });
}

// 행 템플릿의 7개 셀 텍스트를 values로 채우고 rowAddr 재지정
function fillRowCells(rowTemplate, values, rowIdx) {
    const cells = extractCellBlocks(rowTemplate);
    let out = '';
    let cursor = 0;
    for (let i = 0; i < cells.length; i++) {
        out += rowTemplate.slice(cursor, cells[i].start);
        out += setTcText(cells[i].xml, values[i]);
        cursor = cells[i].end;
    }
    out += rowTemplate.slice(cursor);
    return setRowAddr(out, rowIdx);
}

function prevIsoDay(iso) {
    const [y, m, d] = iso.split('-').map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d));
    dt.setUTCDate(dt.getUTCDate() - 1);
    return dt.toISOString().slice(0, 10);
}
function isoWeekday(iso) {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0=일 ~ 6=토
}
function addIsoDays(iso, n) {
    const [y, m, d] = iso.split('-').map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d));
    dt.setUTCDate(dt.getUTCDate() + n);
    return dt.toISOString().slice(0, 10);
}

// 달력 셀 표시용 상태 라벨
const CAL_STATUS_LABELS = {
    '41조연수': '제41조',
    '오전근무/오후41조': '근무/41조',
    '토·일·공휴일': '',
    '토일공휴일': '',
    '주말공휴일': '',
};

// 방학 기간 + 일별 상태 → 주(일~토) 단위 달력 데이터.
// 반환: [ [ {iso, dateLabel, status} x7 ] x N주 ]
// - 달력 범위: (시작일-1)=방학식 ~ (종료일+1)=개학식. config 없으면 days의 min~max.
// - 주말은 상태 빈칸, 평일 공휴일은 '휴일', 방학식/개학식은 평일일 때만 라벨.
function buildCalendarWeeks(days, config) {
    days = days || {};
    let calStart, calEnd, banghakIso = null, gaehakIso = null;
    if (config && config.startDate && config.endDate) {
        banghakIso = prevIsoDay(config.startDate);
        gaehakIso = nextIsoDay(config.endDate);
        calStart = banghakIso;
        calEnd = gaehakIso;
    } else {
        const keys = Object.keys(days).sort();
        if (!keys.length) return [];
        calStart = keys[0];
        calEnd = keys[keys.length - 1];
    }

    const holidays = new Set(((config && config.holidays) || []).map(h => (h && h.date) || h));
    const gridStart = addIsoDays(calStart, -isoWeekday(calStart)); // 해당 주 일요일
    const gridEnd = addIsoDays(calEnd, 6 - isoWeekday(calEnd));    // 해당 주 토요일

    const weeks = [];
    let cur = gridStart;
    let week = [];
    while (cur <= gridEnd) {
        const wd = isoWeekday(cur);
        const inRange = (cur >= calStart && cur <= calEnd);
        const p = isoParts(cur);
        let status = '';
        if (inRange) {
            const isWeekend = (wd === 0 || wd === 6);
            if (cur === banghakIso) {
                status = isWeekend ? '' : '방학식';
            } else if (cur === gaehakIso) {
                status = isWeekend ? '' : '개학식';
            } else if (isWeekend) {
                status = '';
            } else if (holidays.has(cur)) {
                status = '휴일';
            } else {
                const v = days[cur] || '';
                status = (v in CAL_STATUS_LABELS) ? CAL_STATUS_LABELS[v] : v;
            }
        }
        week.push({
            iso: cur,
            dateLabel: inRange ? `${p.m}.${p.d}` : '',
            status,
        });
        if (wd === 6) { weeks.push(week); week = []; }
        cur = nextIsoDay(cur);
    }
    if (week.length) weeks.push(week);
    return weeks;
}

const MAX_CALENDAR_WEEKS = 12;

// 달력 테이블(rowCnt=9, colCnt=7) 재구성.
// 템플릿 행: 0=요일헤더 / 1,2=첫 주(위쪽 굵은 테두리) / 3,4=중간 주 / 7,8=마지막 주(아래 굵은 테두리)
function fillCalendarTable(sectionXml, weeks) {
    const parts = splitTableParts(sectionXml, /<hp:tbl\b[^>]*?rowCnt="9"[^>]*?colCnt="7"[^>]*?>/);
    if (!parts || parts.rows.length !== 9) return sectionXml;
    if (!weeks || !weeks.length) return sectionXml; // 범위 불명 시 템플릿 그대로 두지 않도록 호출부에서 보장
    if (weeks.length > MAX_CALENDAR_WEEKS) throw new Error('달력 주 수가 지나치게 많습니다.');

    const headerRow = parts.rows[0];
    const firstDateTmpl = parts.rows[1];
    const firstStatusTmpl = parts.rows[2];
    const midDateTmpl = parts.rows[3];
    const midStatusTmpl = parts.rows[4];
    const lastStatusTmpl = parts.rows[8];

    const out = [];
    let idx = 0;
    out.push(setRowAddr(headerRow, idx++));
    for (let w = 0; w < weeks.length; w++) {
        const dates = weeks[w].map(d => d.dateLabel);
        const statuses = weeks[w].map(d => d.status);
        const dateTmpl = (w === 0) ? firstDateTmpl : midDateTmpl;
        const statusTmpl = (w === weeks.length - 1) ? lastStatusTmpl
            : (w === 0) ? firstStatusTmpl : midStatusTmpl;
        out.push(fillRowCells(dateTmpl, dates, idx++));
        out.push(fillRowCells(statusTmpl, statuses, idx++));
    }

    const newOpenTag = parts.openTag.replace(/rowCnt="\d+"/, `rowCnt="${out.length}"`);
    return parts.before + newOpenTag + parts.preamble + out.join('') + '</hp:tbl>' + parts.afterClose;
}

// 41조 기간표(rowCnt=4, colCnt=5) 재구성.
// 템플릿 행: 0=헤더 / 1,2=데이터(연수기간·일수·내용·장소·비고) / 3=계
function fill41Table(sectionXml, fortyOnePeriods) {
    const parts = splitTableParts(sectionXml, /<hp:tbl\b[^>]*?rowCnt="4"[^>]*?colCnt="5"[^>]*?>/);
    if (!parts || parts.rows.length !== 4) return sectionXml;
    if (fortyOnePeriods.length > MAX_41JO_PERIODS) throw new Error('기간 수가 지나치게 많습니다.');

    const header = parts.rows[0];
    const dataTmpl = parts.rows[1];
    const subtotalTmpl = parts.rows[3];
    const sum41 = fortyOnePeriods.reduce((s, p) => s + (Number(p.days) || 0), 0);

    const out = [];
    let idx = 0;
    out.push(setRowAddr(header, idx++));
    const count = Math.max(fortyOnePeriods.length, 1);
    for (let i = 0; i < count; i++) {
        const p = fortyOnePeriods[i];
        const values = p
            ? [p.range || '', p.days == null ? '' : String(p.days), p.content || '', p.place || '', p.note || '']
            : ['', '', '', '', ''];
        out.push(fillRowCells(dataTmpl, values, idx++));
    }
    // 계 행: 셀 3개 (계 / 합계일수 / 병합 빈칸)
    out.push(fillRowCells(subtotalTmpl, ['계', String(sum41), ''], idx++));

    const newOpenTag = parts.openTag.replace(/rowCnt="\d+"/, `rowCnt="${out.length}"`);
    return parts.before + newOpenTag + parts.preamble + out.join('') + '</hp:tbl>' + parts.afterClose;
}

// Table 3 (rowCnt="2", colCnt="9") 합계 숫자 9개 치환
// summary: { work, business, businessTraining, fortyOne, leave, other, workForty, weekendHoliday, total }
function rewriteSummary(sectionXml, summary) {
    if (!summary) return sectionXml;
    const parts = splitTableParts(sectionXml, /<hp:tbl\b[^>]*?rowCnt="2"[^>]*?colCnt="9"[^>]*?>/);
    if (!parts || parts.rows.length !== 2) return sectionXml;

    const values = [
        summary.work,
        summary.business,
        summary.businessTraining,
        summary.fortyOne,
        summary.leave,
        summary.other,
        summary.workForty,
        summary.weekendHoliday,
        summary.total,
    ];
    let newRow1 = parts.rows[1];
    for (let i = 0; i < 9; i++) {
        const v = Number(values[i] || 0);
        newRow1 = rewriteNthText(newRow1, i, `(${v})일`);
    }

    // preamble + 원본 헤더 행(row 0) + 새 값 행(row 1) + </hp:tbl>
    return parts.before + parts.openTag + parts.preamble + parts.rows[0] + newRow1 + '</hp:tbl>' + parts.afterClose;
}

// HWPX 스펙: 아래 파일들은 STORED(비압축) 유지 필수/권장
//   mimetype: 필수
//   version.xml: 원본 관례상 stored
//   Preview/PrvImage.png: PNG은 이미 압축되어 stored 사용
const STORED_FILES = new Set(['mimetype', 'version.xml', 'Preview/PrvImage.png']);

// Contents/*.xml 파일들에 치환 적용 + 원본 압축 방식 보존 + 디렉토리 엔트리 제거
async function substituteHwpx(templateBuffer, replacements, xmlTransform) {
    const zip = await JSZip.loadAsync(templateBuffer);

    // 모든 파일을 순회하며 재작성 (원본 압축 방식 유지)
    // createFolders: false — parent 디렉토리 엔트리 auto-add 차단
    const allFiles = Object.keys(zip.files).slice(); // snapshot
    for (const filename of allFiles) {
        if (zip.files[filename].dir) continue;
        const isXml = filename.startsWith('Contents/') && filename.endsWith('.xml');
        const forceStore = STORED_FILES.has(filename);

        if (isXml) {
            let text = await zip.file(filename).async('string');
            for (const [pattern, value] of (replacements || [])) {
                if (pattern instanceof RegExp) {
                    text = text.replace(pattern, value);
                } else {
                    text = text.split(pattern).join(value);
                }
            }
            if (xmlTransform && filename === 'Contents/section0.xml') {
                text = xmlTransform(text);
            }
            zip.file(filename, text, {
                compression: forceStore ? 'STORE' : 'DEFLATE',
                createFolders: false
            });
        } else if (forceStore) {
            const bytes = await zip.file(filename).async('uint8array');
            zip.file(filename, bytes, {
                compression: 'STORE',
                createFolders: false
            });
        }
    }

    // 최종 단계에서 모든 디렉토리 엔트리 제거 (JSZip이 내부적으로 자동 추가한 것 포함)
    for (const name of Object.keys(zip.files)) {
        if (zip.files[name].dir) {
            zip.remove(name);
        }
    }

    return zip.generateAsync({
        type: 'nodebuffer',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 }
    });
}

// ---- 도메인 헬퍼 ----

function formatApplyDate(date) {
    // 템플릿 원본 형식 "YYYY년  M월  D일" (이중 공백 유지)
    const y = date.getFullYear();
    const m = date.getMonth() + 1;
    const d = date.getDate();
    return `${y}년  ${m}월  ${d}일`;
}

// ISO 날짜 문자열을 순수 문자열 연산으로 다룬다 (Date 객체/timezone 회피)
function nextIsoDay(iso) {
    const [y, m, d] = iso.split('-').map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d));
    dt.setUTCDate(dt.getUTCDate() + 1);
    const yy = dt.getUTCFullYear();
    const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(dt.getUTCDate()).padStart(2, '0');
    return `${yy}-${mm}-${dd}`;
}
function isoParts(iso) {
    const [y, m, d] = iso.split('-').map(Number);
    return { y, m, d };
}

// 하루 단위 상태(스케줄) → 연속 구간(periods) 변환
// days: { "YYYY-MM-DD": "41조연수"|"근무"|... }
// 대상 상태 하나에 대해 연속 구간 배열 반환
// 반환: [{ range: "1.5 ~ 1.9", days: 5, startIso, endIso }, ...]
function buildPeriods(days, targetStatus) {
    const entries = Object.entries(days || {})
        .filter(([, v]) => v === targetStatus)
        .map(([k]) => k)
        .sort();

    const periods = [];
    let cur = null;
    for (const iso of entries) {
        if (!cur) {
            cur = { startIso: iso, endIso: iso, count: 1 };
        } else if (nextIsoDay(cur.endIso) === iso) {
            cur.endIso = iso;
            cur.count++;
        } else {
            periods.push(cur);
            cur = { startIso: iso, endIso: iso, count: 1 };
        }
    }
    if (cur) periods.push(cur);

    return periods.map(p => {
        const s = isoParts(p.startIso);
        const e = isoParts(p.endIso);
        const sameDay = p.startIso === p.endIso;
        return {
            range: sameDay ? `${s.m}.${s.d}` : `${s.m}.${s.d} ~ ${e.m}.${e.d}`,
            days: p.count,
            startIso: p.startIso,
            endIso: p.endIso,
        };
    });
}

// 스케줄 days 객체 → 9개 합계 집계.
// config.startDate/endDate/holidays가 주어지면 주말·법정공휴일은 자동으로 집계
// (사용자 드롭다운에서 토·일·공휴일은 선택 불가 → days에 없으므로 여기서 보강)
function summarize(days, config) {
    const s = {
        work: 0, business: 0, businessTraining: 0, fortyOne: 0,
        leave: 0, other: 0, workForty: 0, weekendHoliday: 0, total: 0,
    };
    const map = {
        '근무': 'work',
        '출장': 'business',
        '출장연수': 'businessTraining',
        '41조연수': 'fortyOne',
        '연가': 'leave',
        '기타': 'other',
        '오전근무/오후41조': 'workForty',
        '토·일·공휴일': 'weekendHoliday',
        '토일공휴일': 'weekendHoliday',
        '주말공휴일': 'weekendHoliday',
    };
    for (const v of Object.values(days || {})) {
        const key = map[v];
        if (key) s[key]++;
    }

    // 방학 기간 범위 내에서 주말/공휴일 자동 집계 (days에 명시 없어도)
    if (config && config.startDate && config.endDate) {
        const holidays = new Set((config.holidays || []).map(h => (h && h.date) || h));
        const [ys, ms, ds] = config.startDate.split('-').map(Number);
        const [ye, me, de] = config.endDate.split('-').map(Number);
        const cur = new Date(Date.UTC(ys, ms - 1, ds));
        const end = new Date(Date.UTC(ye, me - 1, de));
        while (cur.getTime() <= end.getTime()) {
            const y = cur.getUTCFullYear();
            const m = String(cur.getUTCMonth() + 1).padStart(2, '0');
            const d = String(cur.getUTCDate()).padStart(2, '0');
            const iso = `${y}-${m}-${d}`;
            const wd = cur.getUTCDay();
            const isWeekend = (wd === 0 || wd === 6);
            const isHoliday = holidays.has(iso);
            // 사용자 입력값이 없는 주말/공휴일만 자동 카운트
            if ((isWeekend || isHoliday) && !(days && days[iso])) {
                s.weekendHoliday++;
            }
            cur.setUTCDate(cur.getUTCDate() + 1);
        }
    }

    s.total = s.work + s.business + s.businessTraining + s.fortyOne
        + s.leave + s.other + s.workForty + s.weekendHoliday;
    return s;
}

// 41조 자동 계산 기간에 연수내용/장소/비고 공통값 채우기
// info: { content, place, note } — 교직원이 UI에서 입력한 공통 정보
function applyFortyOneInfo(periods, info) {
    if (!info) return periods;
    return periods.map(p => ({
        ...p,
        content: p.content || info.content || '',
        place: p.place || info.place || '',
        note: p.note || info.note || '',
    }));
}

// 메인: 허가원 HWPX 생성 (달력 템플릿 기반)
// data: {
//   name: "권준구",
//   school: "백암초등학교",
//   position: "교사" (optional),
//   applyDate: "2026년  1월  5일" (optional, default=오늘),
//   days: { "2026-01-05": "41조연수", ... },
//   config: { startDate, endDate, holidays },   // 달력 범위 + 주말·공휴일 자동 집계용
//   fortyOneInfo: { content, place, note },     // 41조 공통 연수내용/장소/연락처 (optional)
//   fortyOnePeriods, summary                    // 직접 지정 시 자동계산 우선 override
// }
async function generatePermit(data) {
    const template = loadTemplate('permit-calendar-template.hwpx');

    const name = data.name || '';
    const school = data.school || '백암초등학교';
    const position = data.position || '교사';
    const applyDate = data.applyDate || formatApplyDate(new Date());

    const fortyOnePeriods = data.fortyOnePeriods
        || applyFortyOneInfo(buildPeriods(data.days, '41조연수'), data.fortyOneInfo);
    const summary = data.summary || summarize(data.days, data.config);
    const weeks = buildCalendarWeeks(data.days, data.config);

    // 템플릿(조성균 교감 샘플 기반) 샘플값 → 사용자값 치환 (hp:t 단위로 안전하게)
    const replacements = [
        ['<hp:t>직  교감  성명  조성균  (인)</hp:t>',
            `<hp:t>직  ${xmlEscape(position)}  성명  ${xmlEscape(name)}  (인)</hp:t>`],
        ['<hp:t>2026년  7월  20일</hp:t>', `<hp:t>${xmlEscape(applyDate)}</hp:t>`],
        ['<hp:t>백암초등학교</hp:t>', `<hp:t>${xmlEscape(school)}</hp:t>`],
    ];

    const xmlTransform = (xml) => {
        let out = fill41Table(xml, fortyOnePeriods);
        out = fillCalendarTable(out, weeks);
        out = rewriteSummary(out, summary);
        return out;
    };

    return await substituteHwpx(template, replacements, xmlTransform);
}

module.exports = {
    substituteHwpx,
    generatePermit,
    loadTemplate,
    xmlEscape,
    formatApplyDate,
    buildPeriods,
    buildCalendarWeeks,
    applyFortyOneInfo,
    summarize,
    rewriteNthText,
    fillMainTable,
    fill41Table,
    fillCalendarTable,
    rewriteSummary,
    MAX_41JO_PERIODS,
    MAX_WORK_PERIODS,
    MAX_CALENDAR_WEEKS,
};
