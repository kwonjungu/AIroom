// HWPX 문서 생성 엔진 (근무지외연수허가원용)
// 핵심: ZIP-level XML 치환 + <hp:tr> 행 복제/삭제 + mimetype STORED 보존
// 템플릿: AIroom/templates/permit-template.hwpx (김민정 교사 샘플 기반)

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
// rows[1]을 41조 데이터 템플릿, rows[10]을 근무 데이터 템플릿으로 복제 사용
const MAX_41JO_PERIODS = 30; // 겨울방학 최대 기간 수 상한 (방어적)
const MAX_WORK_PERIODS = 30;

function fillMainTable(sectionXml, fortyOnePeriods, workPeriods) {
    const parts = splitTableParts(sectionXml, /<hp:tbl\b[^>]*?rowCnt="14"[^>]*?>/);
    if (!parts || parts.rows.length !== 14) return sectionXml;

    if (fortyOnePeriods.length > MAX_41JO_PERIODS || workPeriods.length > MAX_WORK_PERIODS) {
        throw new Error('기간 수가 지나치게 많습니다.');
    }

    const header1 = parts.rows[0];
    const data41Template = parts.rows[1];
    const subtotal1Template = parts.rows[8];
    const header2 = parts.rows[9];
    const dataWorkTemplate = parts.rows[10];
    const subtotal2Template = parts.rows[13];

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

// 스케줄 days 객체 → 9개 합계 집계
function summarize(days) {
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
    s.total = s.work + s.business + s.businessTraining + s.fortyOne
        + s.leave + s.other + s.workForty + s.weekendHoliday;
    return s;
}

// 메인: 허가원 HWPX 생성
// data: {
//   name: "권준구",
//   school: "백암초등학교",
//   applyDate: "2026년  1월  5일" (optional, default=오늘),
//   days: { "2026-01-05": "41조연수", ... },   // OR 직접 periods/summary 제공
//   fortyOnePeriods, workPeriods, summary    // days 없을 때 직접 계산된 값 사용
// }
async function generatePermit(data) {
    const template = loadTemplate('permit-template.hwpx');

    const name = data.name || '';
    const school = data.school || '백암초등학교';
    const applyDate = data.applyDate || formatApplyDate(new Date());

    // days 기반 자동 집계. 명시된 값이 있으면 그것 우선.
    const fortyOnePeriods = data.fortyOnePeriods
        || buildPeriods(data.days, '41조연수');
    const workPeriods = data.workPeriods
        || buildPeriods(data.days, '근무').concat(buildPeriods(data.days, '오전근무/오후41조'));
    const summary = data.summary || summarize(data.days);

    // 단순 텍스트 치환 (전역)
    const replacements = [
        ['김민정', name],
        ['2025년  12월  31일', applyDate],
        ['<hp:t>백암초등학교</hp:t>', `<hp:t>${xmlEscape(school)}</hp:t>`],
    ];

    // XML 구조 변경: 기존 14행 유지한 채로 기간 채움 + 합계 치환
    const xmlTransform = (xml) => {
        let out = fillMainTable(xml, fortyOnePeriods, workPeriods);
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
    summarize,
    rewriteNthText,
    fillMainTable,
    rewriteSummary,
    MAX_41JO_PERIODS,
    MAX_WORK_PERIODS,
};
