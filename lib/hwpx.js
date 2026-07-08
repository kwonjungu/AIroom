// HWPX 문서 생성 엔진 (근무지외연수허가원용)
// 핵심: ZIP-level XML 치환 + <hp:tr> 행 복제/삭제 + mimetype STORED 보존
// 템플릿: AIroom/templates/permit-calendar-template.hwpx (조성균 교감 샘플 기반)
//   구조: 41조 기간표(4x5) + 근무상황일람표 달력(9x7) + 합계표(2x9) + 서명(2x1)
// 구 템플릿(permit-template.hwpx, 기간표만)은 fillMainTable과 함께 남겨둠 (레거시)

const JSZip = require('jszip');
const zlib = require('zlib');
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
// charPrOverride 지정 시 글자모양(색)도 교체.
function setTcText(tcXml, value, charPrOverride) {
    const re = /<hp:run charPrIDRef="(\d+)"(?:\/>|>[\s\S]*?<\/hp:run>)/;
    return tcXml.replace(re, (m, cp) => {
        const cpr = charPrOverride || cp;
        if (value == null || value === '') return `<hp:run charPrIDRef="${cpr}"/>`;
        return `<hp:run charPrIDRef="${cpr}"><hp:t>${xmlEscape(value)}</hp:t></hp:run>`;
    });
}

// 행 템플릿의 셀 텍스트를 values로 채우고 rowAddr 재지정.
// opts.charPr[i]: 셀별 글자모양 override (null이면 템플릿 유지)
// opts.names[i]: 셀 name 속성 override — 행 복제 시 원본(파일 b)의 고유 명명 규칙 유지용
function fillRowCells(rowTemplate, values, rowIdx, opts) {
    const charPr = (opts && opts.charPr) || [];
    const names = (opts && opts.names) || [];
    const cells = extractCellBlocks(rowTemplate);
    let out = '';
    let cursor = 0;
    for (let i = 0; i < cells.length; i++) {
        out += rowTemplate.slice(cursor, cells[i].start);
        let tc = setTcText(cells[i].xml, values[i], charPr[i] || null);
        if (names[i] != null) tc = tc.replace(/^<hp:tc name="[^"]*"/, `<hp:tc name="${names[i]}"`);
        out += tc;
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
        let kind = 'normal'; // normal | ceremony(방학식·개학식, 파랑) | holiday(평일 공휴일, 빨강)
        if (inRange) {
            const isWeekend = (wd === 0 || wd === 6);
            if (cur === banghakIso) {
                status = isWeekend ? '' : '방학식';
                if (!isWeekend) kind = 'ceremony';
            } else if (cur === gaehakIso) {
                status = isWeekend ? '' : '개학식';
                if (!isWeekend) kind = 'ceremony';
            } else if (isWeekend) {
                status = '';
            } else if (holidays.has(cur)) {
                status = '휴일';
                kind = 'holiday';
            } else {
                const v = days[cur] || '';
                status = (v in CAL_STATUS_LABELS) ? CAL_STATUS_LABELS[v] : v;
            }
        }
        week.push({
            iso: cur,
            dateLabel: inRange ? `${p.m}.${p.d}` : '',
            status,
            kind,
            trailing: cur > calEnd, // 개학식 이후 범위 밖 (원본 문서는 이 날짜 셀을 검정 스타일로 둠)
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
        const week = weeks[w];
        const dates = week.map(d => d.dateLabel);
        const statuses = week.map(d => d.status);
        // 평일 열(1~5)은 글자색 명시 지정 (템플릿 행의 잔여 색 제거):
        //   공휴일 날짜/휴일=빨강(36/37), 방학식·개학식=파랑(32/34), 일반=검정(20/21).
        // 주말 열(0,6)은 템플릿 열 스타일 유지.
        const dateCp = week.map((d, c) => (c === 0 || c === 6) ? (d.trailing ? '20' : null)
            : d.kind === 'holiday' ? '36' : d.kind === 'ceremony' ? '32' : '20');
        const statusCp = week.map((d, c) => (c === 0 || c === 6) ? null
            : d.kind === 'holiday' ? '37' : d.kind === 'ceremony' ? '34' : '21');
        // 셀 name: 원본 명명 규칙(날짜행 aN / 상태행 bN, N=주*7+열+1) 유지 — 복제로 인한 중복 방지
        const dateNames = week.map((_, c) => `a${w * 7 + c + 1}`);
        const statusNames = week.map((_, c) => `b${w * 7 + c + 1}`);
        const dateTmpl = (w === 0) ? firstDateTmpl : midDateTmpl;
        const statusTmpl = (w === weeks.length - 1) ? lastStatusTmpl
            : (w === 0) ? firstStatusTmpl : midStatusTmpl;
        out.push(fillRowCells(dateTmpl, dates, idx++, { charPr: dateCp, names: dateNames }));
        out.push(fillRowCells(statusTmpl, statuses, idx++, { charPr: statusCp, names: statusNames }));
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

// ---- ZIP 라이터 (한글 컨테이너 재현) ----
// JSZip generateAsync는 한글이 쓰는 것과 다른 컨테이너 메타데이터(version 2.0/1.0,
// flag 0x0000, 현재 시각 타임스탬프)를 기록한다. 한글의 문서 검사에 걸리지 않도록
// 원본 hwpx와 동일한 값(madeby 11/23, need 2.0, deflate flag 0x0004,
// 고정 타임스탬프 1980-01-01, extattr 0x81800020)으로 직접 기록한다.

const CRC_TABLE = (() => {
    const t = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
        t[n] = c;
    }
    return t;
})();
function crc32(buf) {
    let c = 0xFFFFFFFF;
    for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
}

const ZIP_VERSION_MADEBY = (11 << 8) | 23; // 한글 원본과 동일
const ZIP_VERSION_NEEDED = 20;
const ZIP_DOS_DATE = (0 << 9) | (1 << 5) | 1; // 1980-01-01 (한글은 고정 타임스탬프 사용)
const ZIP_DOS_TIME = 0;
const ZIP_EXT_ATTR = 0x81800020;

// entries: [{ name, data: Buffer, store: bool }] — 배열 순서대로 기록
function buildHwpxZip(entries) {
    const localParts = [];
    const centralParts = [];
    let offset = 0;
    for (const e of entries) {
        const nameBuf = Buffer.from(e.name, 'ascii');
        const crc = crc32(e.data);
        const comp = e.store ? e.data : zlib.deflateRawSync(e.data, { level: 6 });
        const method = e.store ? 0 : 8;
        const flags = e.store ? 0x0000 : 0x0004; // 한글: deflate 엔트리에 fast hint 플래그

        const lh = Buffer.alloc(30);
        lh.writeUInt32LE(0x04034b50, 0);
        lh.writeUInt16LE(ZIP_VERSION_NEEDED, 4);
        lh.writeUInt16LE(flags, 6);
        lh.writeUInt16LE(method, 8);
        lh.writeUInt16LE(ZIP_DOS_TIME, 10);
        lh.writeUInt16LE(ZIP_DOS_DATE, 12);
        lh.writeUInt32LE(crc, 14);
        lh.writeUInt32LE(comp.length, 18);
        lh.writeUInt32LE(e.data.length, 22);
        lh.writeUInt16LE(nameBuf.length, 26);
        lh.writeUInt16LE(0, 28);
        localParts.push(lh, nameBuf, comp);

        const ch = Buffer.alloc(46);
        ch.writeUInt32LE(0x02014b50, 0);
        ch.writeUInt16LE(ZIP_VERSION_MADEBY, 4);
        ch.writeUInt16LE(ZIP_VERSION_NEEDED, 6);
        ch.writeUInt16LE(flags, 8);
        ch.writeUInt16LE(method, 10);
        ch.writeUInt16LE(ZIP_DOS_TIME, 12);
        ch.writeUInt16LE(ZIP_DOS_DATE, 14);
        ch.writeUInt32LE(crc, 16);
        ch.writeUInt32LE(comp.length, 20);
        ch.writeUInt32LE(e.data.length, 24);
        ch.writeUInt16LE(nameBuf.length, 28);
        // extra/comment/disk/internal attr = 0
        ch.writeUInt32LE(ZIP_EXT_ATTR, 38);
        ch.writeUInt32LE(offset, 42);
        centralParts.push(ch, nameBuf);
        offset += 30 + nameBuf.length + comp.length;
    }
    const central = Buffer.concat(centralParts);
    const eocd = Buffer.alloc(22);
    eocd.writeUInt32LE(0x06054b50, 0);
    eocd.writeUInt16LE(entries.length, 8);
    eocd.writeUInt16LE(entries.length, 10);
    eocd.writeUInt32LE(central.length, 12);
    eocd.writeUInt32LE(offset, 16);
    return Buffer.concat([...localParts, central, eocd]);
}

// Contents/*.xml 파일들에 치환 적용 + 원본 엔트리 순서/압축 방식 보존
async function substituteHwpx(templateBuffer, replacements, xmlTransform) {
    const zip = await JSZip.loadAsync(templateBuffer);

    const entries = [];
    for (const filename of Object.keys(zip.files)) {
        const f = zip.files[filename];
        if (f.dir) continue;
        const isXml = filename.startsWith('Contents/') && filename.endsWith('.xml');
        let data;
        if (isXml) {
            let text = await f.async('string');
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
            data = Buffer.from(text, 'utf8');
        } else {
            data = Buffer.from(await f.async('uint8array'));
        }
        entries.push({ name: filename, data, store: STORED_FILES.has(filename) });
    }
    return buildHwpxZip(entries);
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

// 메인: 허가원 HWPX 생성 (달력 템플릿 기반)
// 연수내용/장소/비고 칸은 비워 두고 사용자가 한글에서 직접 입력한다
// (fortyOnePeriods override에 content/place/note가 있으면 그대로 채움).
// data: {
//   name: "권준구",
//   school: "백암초등학교",
//   position: "교사" (optional),
//   applyDate: "2026년  1월  5일" (optional, default=오늘),
//   days: { "2026-01-05": "41조연수", ... },
//   config: { startDate, endDate, holidays },   // 달력 범위 + 주말·공휴일 자동 집계용
//   fortyOnePeriods, summary                    // 직접 지정 시 자동계산 우선 override
// }
async function generatePermit(data) {
    const template = loadTemplate('permit-calendar-template.hwpx');

    const name = data.name || '';
    const school = data.school || '백암초등학교';
    const position = data.position || '교사';
    const applyDate = data.applyDate || formatApplyDate(new Date());

    const fortyOnePeriods = data.fortyOnePeriods || buildPeriods(data.days, '41조연수');
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
