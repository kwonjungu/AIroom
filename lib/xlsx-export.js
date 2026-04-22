// 전체 일정표 엑셀 생성 (색 포함)
// 관리자가 /api/winter-schedule/xlsx 호출 시 사용

const ExcelJS = require('exceljs');

// 상태별 색 팔레트 — 대비 확실히 구분되는 색
const STATUS_COLORS = {
    '근무':           { bg: 'FF0080C0' },                     // 파랑
    '출장':           { bg: 'FFFFA0A0' },                     // 연빨강
    '출장연수':       { bg: 'FFB22222' },                     // 진빨강 (출장과 구분)
    '41조연수':       { bg: 'FF228B22' },                     // 진초록
    '연가':           { bg: 'FFFFD700' },                     // 금색
    '기타':           { bg: 'FFFFA500' },                     // 주황
    '오전근무/오후41조': { bg: 'FF0080C0', pattern: 'lightUp', fg: 'FF228B22' }, // 파랑+초록 줄무늬
    '토·일·공휴일':    { bg: 'FFD9D9D9' },                     // 회색
};

function getFill(status) {
    const cfg = STATUS_COLORS[status];
    if (!cfg) return null;
    if (cfg.pattern) {
        return {
            type: 'pattern',
            pattern: cfg.pattern,
            fgColor: { argb: cfg.fg },
            bgColor: { argb: cfg.bg }
        };
    }
    return {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: cfg.bg }
    };
}

// 날짜 배열 생성 (start부터 end까지 하루 단위, YYYY-MM-DD)
function dateRange(startIso, endIso) {
    const out = [];
    if (!startIso || !endIso) return out;
    const [ys, ms, ds] = startIso.split('-').map(Number);
    const [ye, me, de] = endIso.split('-').map(Number);
    const cur = new Date(Date.UTC(ys, ms - 1, ds));
    const end = new Date(Date.UTC(ye, me - 1, de));
    while (cur.getTime() <= end.getTime()) {
        const y = cur.getUTCFullYear();
        const m = String(cur.getUTCMonth() + 1).padStart(2, '0');
        const d = String(cur.getUTCDate()).padStart(2, '0');
        out.push(`${y}-${m}-${d}`);
        cur.setUTCDate(cur.getUTCDate() + 1);
    }
    return out;
}

function weekdayKor(iso) {
    const [y, m, d] = iso.split('-').map(Number);
    const wd = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0=Sun
    return ['일','월','화','수','목','금','토'][wd];
}

async function buildScheduleXlsx(ws, staff) {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'AIroom';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('겨울방학근무현황', {
        views: [{ state: 'frozen', xSplit: 3, ySplit: 2 }]
    });

    const config = (ws && ws.config) || {};
    const entries = (ws && ws.entries) || {};
    const holidays = new Set((config.holidays || []).map(h => h.date || h));
    const dates = dateRange(config.startDate, config.endDate);

    // Header row 1: 번호 | 이름 | 직위 | 날짜들
    const r1 = ['번호', '이름', '직위', ...dates.map(d => {
        const [y, m, dd] = d.split('-');
        return `${parseInt(m,10)}/${parseInt(dd,10)}`;
    })];
    sheet.addRow(r1);
    // Header row 2: (blank) (blank) (blank) | 요일
    const r2 = ['', '', '', ...dates.map(d => weekdayKor(d))];
    sheet.addRow(r2);

    // 열 너비
    sheet.getColumn(1).width = 5;
    sheet.getColumn(2).width = 10;
    sheet.getColumn(3).width = 14;
    for (let c = 4; c <= 3 + dates.length; c++) {
        sheet.getColumn(c).width = 5;
    }

    // 헤더 스타일
    [1, 2].forEach(rowIdx => {
        const row = sheet.getRow(rowIdx);
        row.alignment = { horizontal: 'center', vertical: 'middle' };
        row.font = { bold: true };
        row.eachCell((cell) => {
            cell.fill = {
                type: 'pattern', pattern: 'solid',
                fgColor: { argb: 'FFE0EED1' }
            };
            cell.border = {
                top: { style: 'thin' }, bottom: { style: 'thin' },
                left: { style: 'thin' }, right: { style: 'thin' }
            };
        });
    });

    // 주말/공휴일 열에 기본 회색
    dates.forEach((iso, i) => {
        const col = 4 + i;
        const wd = weekdayKor(iso);
        const isHoliday = holidays.has(iso);
        if (wd === '토' || wd === '일' || isHoliday) {
            for (let r = 1; r <= 2; r++) {
                sheet.getRow(r).getCell(col).fill = {
                    type: 'pattern', pattern: 'solid',
                    fgColor: { argb: 'FFD9D9D9' }
                };
            }
        }
    });

    // 스태프 행
    const sortedStaff = (staff || []).slice().sort((a, b) => (a.no || 0) - (b.no || 0));
    for (const s of sortedStaff) {
        const entry = entries[s.id] || {};
        const days = entry.days || {};
        const row = sheet.addRow([
            s.no || '',
            s.name || '',
            s.position || '',
            ...dates.map(iso => {
                const status = days[iso];
                const wd = weekdayKor(iso);
                if (!status && (wd === '토' || wd === '일' || holidays.has(iso))) {
                    return ''; // 주말/공휴일 자동
                }
                return status ? shortLabel(status) : '';
            })
        ]);
        row.alignment = { horizontal: 'center', vertical: 'middle' };
        row.font = { size: 9 };

        dates.forEach((iso, i) => {
            const col = 4 + i;
            const cell = row.getCell(col);
            const wd = weekdayKor(iso);
            const isHoliday = holidays.has(iso);
            const status = days[iso] || ((wd === '토' || wd === '일' || isHoliday) ? '토·일·공휴일' : null);
            const fill = status ? getFill(status) : null;
            if (fill) cell.fill = fill;
            cell.border = {
                top: { style: 'hair' }, bottom: { style: 'hair' },
                left: { style: 'hair' }, right: { style: 'hair' }
            };
        });
        // Index columns border
        for (let c = 1; c <= 3; c++) {
            row.getCell(c).border = {
                top: { style: 'thin' }, bottom: { style: 'thin' },
                left: { style: 'thin' }, right: { style: 'thin' }
            };
        }
    }

    return await workbook.xlsx.writeBuffer();
}

// 드롭다운 상태 → 엑셀 셀에 표기할 짧은 레이블
function shortLabel(status) {
    const map = {
        '근무': '근무',
        '출장': '출장',
        '출장연수': '출연',
        '41조연수': '41조',
        '연가': '연가',
        '기타': '기타',
        '오전근무/오후41조': '근/41',
        '토·일·공휴일': '',
    };
    return map[status] || status;
}

module.exports = {
    buildScheduleXlsx,
    STATUS_COLORS,
    dateRange,
    weekdayKor,
};
