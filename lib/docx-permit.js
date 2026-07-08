// 근무지 외 연수 허가원 DOCX 생성 (HWPX 실패 시 폴백)
// 레이아웃은 HWPX 템플릿과 논리적으로 동일하지만 워드 네이티브로 재작성

const {
    Document, Packer, Paragraph, TextRun, AlignmentType,
    Table, TableRow, TableCell, WidthType, BorderStyle, HeightRule,
    PageOrientation, convertMillimetersToTwip
} = require('docx');
const { buildPeriods, buildCalendarWeeks, summarize, formatApplyDate } = require('./hwpx');

function p(text, opts = {}) {
    return new Paragraph({
        alignment: opts.align || AlignmentType.LEFT,
        children: [
            new TextRun({
                text: String(text == null ? '' : text),
                bold: !!opts.bold,
                size: opts.size || 22, // 11pt default (docx uses half-points)
                font: 'Batang',
            })
        ]
    });
}

function cell(text, opts = {}) {
    const align = opts.align || AlignmentType.CENTER;
    return new TableCell({
        width: opts.widthTwip ? { size: opts.widthTwip, type: WidthType.DXA } : undefined,
        shading: opts.fill ? { type: 'clear', color: 'auto', fill: opts.fill } : undefined,
        verticalAlign: 'center',
        children: [p(text, { align, bold: opts.bold, size: opts.size || 20 })]
    });
}

// 주어진 값 배열 + 열 너비 배열로 TableRow 생성
function rowOf(texts, widths, rowOpts = {}) {
    return new TableRow({
        height: rowOpts.heightTwip ? { value: rowOpts.heightTwip, rule: HeightRule.ATLEAST } : undefined,
        children: texts.map((t, i) => cell(typeof t === 'string' ? t : t.text, {
            widthTwip: widths[i],
            bold: rowOpts.bold || (typeof t === 'object' && t.bold),
            fill: rowOpts.fill || (typeof t === 'object' && t.fill),
            size: rowOpts.size || (typeof t === 'object' && t.size),
        }))
    });
}

const TABLE_BORDERS = {
    top: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
    bottom: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
    left: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
    right: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
    insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
    insideVertical: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
};

// A4 세로 여백 20mm × 2 = 170mm 본문폭 = 9639 twip. 컬럼 비율로 분할.
// 연수기간(41조연수):24% | 일수:8% | 연수내용:28% | 연수장소:21% | 비고:19%
const PERIOD_COL_WIDTHS = [2313, 771, 2699, 2024, 1832]; // 합 9639

function buildPeriodTable(fortyOnePeriods, sum41) {
    const rows = [];
    const W = PERIOD_COL_WIDTHS;
    const ROW_H = 540; // 행 높이 twip (약 9.5mm)

    rows.push(rowOf(
        ['연수기간 (41조연수)', '일수', '연  수   내  용', '연 수 장 소', '비고(연락처)'],
        W, { bold: true, fill: 'D6D6D6', heightTwip: ROW_H }
    ));
    const periodsForOutput41 = fortyOnePeriods.length > 0 ? fortyOnePeriods : [{ range: '', days: '' }];
    for (const pr of periodsForOutput41) {
        rows.push(rowOf(
            [pr.range || '', pr.days === '' ? '' : String(pr.days), pr.content || '', pr.place || '', pr.note || ''],
            W, { heightTwip: ROW_H }
        ));
    }
    rows.push(rowOf(
        ['계', String(sum41), '', '', ''],
        W, { bold: true, fill: 'F0F0F0', heightTwip: ROW_H }
    ));

    return new Table({
        width: { size: 9639, type: WidthType.DXA },
        columnWidths: W,
        borders: TABLE_BORDERS,
        rows
    });
}

// 근무상황일람표 달력 (7열 균등, 주마다 날짜행 + 상태행)
function buildCalendarTable(weeks) {
    const perCol = Math.floor(9639 / 7);
    const W = Array(7).fill(perCol);
    W[6] = 9639 - perCol * 6;

    const rows = [
        rowOf(['일', '월', '화', '수', '목', '금', '토'], W,
            { bold: true, fill: 'D6D6D6', heightTwip: 400 }),
    ];
    for (const week of weeks) {
        rows.push(rowOf(week.map(d => ({ text: d.dateLabel, bold: true })), W,
            { heightTwip: 360, fill: 'FAFAFA', size: 18 }));
        rows.push(rowOf(week.map(d => d.status), W, { heightTwip: 620, size: 18 }));
    }
    return new Table({
        width: { size: 9639, type: WidthType.DXA },
        columnWidths: W,
        borders: TABLE_BORDERS,
        rows
    });
}

function buildSummaryTable(summary) {
    const labels = ['근무', '출장', '출장연수', '41조연수', '연가', '기타', '근무/41조', '토·일·공휴일', '합계'];
    const values = [
        summary.work, summary.business, summary.businessTraining, summary.fortyOne,
        summary.leave, summary.other, summary.workForty, summary.weekendHoliday, summary.total
    ];
    // 9열 균등 분할, 총 9639 twip
    const perCol = Math.floor(9639 / 9);
    const W = Array(9).fill(perCol);
    W[8] = 9639 - perCol * 8; // 누적 오차 보정
    return new Table({
        width: { size: 9639, type: WidthType.DXA },
        columnWidths: W,
        borders: TABLE_BORDERS,
        rows: [
            rowOf(labels.map(l => ({ text: l })), W, { bold: true, fill: 'E0EED1', heightTwip: 540 }),
            rowOf(values.map(v => `(${v || 0})일`), W, { heightTwip: 540 }),
        ]
    });
}

async function generatePermitDocx(data) {
    const name = data.name || '';
    const school = data.school || '백암초등학교';
    const applyDate = data.applyDate || formatApplyDate(new Date());
    const position = data.position || '교사';

    const fortyOnePeriods = data.fortyOnePeriods || buildPeriods(data.days, '41조연수');
    const summary = data.summary || summarize(data.days, data.config);
    const weeks = buildCalendarWeeks(data.days, data.config);

    const sum41 = fortyOnePeriods.reduce((s, x) => s + (Number(x.days) || 0), 0);

    const doc = new Document({
        creator: 'AIroom',
        title: `근무지 외 연수 허가원 - ${name}`,
        styles: {
            default: {
                document: { run: { font: 'Batang', size: 22 } }
            }
        },
        sections: [{
            properties: {
                page: {
                    size: { orientation: PageOrientation.PORTRAIT },
                    margin: {
                        top: convertMillimetersToTwip(20),
                        bottom: convertMillimetersToTwip(20),
                        left: convertMillimetersToTwip(20),
                        right: convertMillimetersToTwip(20)
                    }
                }
            },
            children: [
                p('근무지 외 연수 허가원', { align: AlignmentType.CENTER, bold: true, size: 40 }),
                p(''),
                p('교육공무원법 제41조 및 공무원 복무규정 등의 법규에 의거 다음과 같이 연수원을 제출하오니 허가하여 주시기 바랍니다.'),
                p(''),
                buildPeriodTable(fortyOnePeriods, sum41),
                p(''),
                p('휴가중 교원 근무상황일람표', { align: AlignmentType.CENTER, bold: true, size: 26 }),
                p(''),
                buildCalendarTable(weeks),
                p(''),
                buildSummaryTable(summary),
                p(''),
                p(''),
                p(applyDate, { align: AlignmentType.CENTER, size: 24 }),
                p(`직  ${position}    성명  ${name}  (인)`, { align: AlignmentType.CENTER, size: 24 }),
                p(''),
                p(`${school}장 귀하`, { align: AlignmentType.CENTER, bold: true, size: 26 }),
            ]
        }]
    });

    return await Packer.toBuffer(doc);
}

module.exports = {
    generatePermitDocx,
};
