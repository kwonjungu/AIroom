'use strict';
// 확정 스냅샷 -> HWPX(한/글) 공문서. 외부 프로그램·COM·네트워크 없이 zip+XML 을 직접 조립한다.
// 참조 구조: templates/permit-calendar-template.hwpx (한/글 13.0 이 저장한 실제 파일) 을 풀어
// header.xml / section0.xml / content.hpf 의 태그 순서와 속성을 그대로 따랐다.
const crypto = require('node:crypto');
const JSZip = require('jszip');
const { assert, stageTotal } = require('./domain');
const { statistics } = require('./exports');

// ── 단위 ──────────────────────────────────────────────────────────────────────
// 1mm = 283.465 HWPUNIT. A4 세로(210×297mm), 여백 15mm.
const MM = 283.465;
const PAGE = { width: 59528, height: 84188, margin: 4251 };
const BODY_WIDTH = PAGE.width - PAGE.margin * 2; // 51026
// 함정: hp:cellSz/@height 는 "최소값"으로 동작한다. 과대 추정하면 표가 거대한 빈 칸이 되고
// 첫 쪽이 통째로 비어버린다. 한 줄이 들어갈 최소값만 주고 한/글의 자동 확장에 맡긴다.
const CELL_MIN_HEIGHT = 1100;
const CELL_MARGIN = 141;
const SIGNATURE_WIDTH = Math.round(25 * MM); // 서명 그림 폭 약 25mm
const SIGNATURE_FALLBACK = { width: 240, height: 90 }; // 서명 캔버스 기본 비율
const PX_TO_HWPUNIT = 75; // 96dpi 기준 1px = 7200/96 HWPUNIT

// ── XML 유틸 ──────────────────────────────────────────────────────────────────
// 지원자 이름·메모에 무엇이 올지 모른다. 모든 사용자 문자열은 여기를 통과한다.
// XML 1.0 이 금지한 제어문자까지 털어내야 파일이 아예 안 열리는 사고를 막는다.
const esc = value => String(value ?? '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const XML_DECL = '<?xml version="1.0" encoding="UTF-8" standalone="yes" ?>';
const NS = 'xmlns:ha="http://www.hancom.co.kr/hwpml/2011/app" xmlns:hp="http://www.hancom.co.kr/hwpml/2011/paragraph" xmlns:hp10="http://www.hancom.co.kr/hwpml/2016/paragraph" xmlns:hs="http://www.hancom.co.kr/hwpml/2011/section" xmlns:hc="http://www.hancom.co.kr/hwpml/2011/core" xmlns:hh="http://www.hancom.co.kr/hwpml/2011/head" xmlns:hhs="http://www.hancom.co.kr/hwpml/2011/history" xmlns:hm="http://www.hancom.co.kr/hwpml/2011/master-page" xmlns:hpf="http://www.hancom.co.kr/schema/2011/hpf" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:opf="http://www.idpf.org/2007/opf/" xmlns:ooxmlchart="http://www.hancom.co.kr/hwpml/2016/ooxmlchart" xmlns:hwpunitchar="http://www.hancom.co.kr/hwpml/2016/HwpUnitChar" xmlns:epub="http://www.idpf.org/2007/ops" xmlns:config="urn:oasis:names:tc:opendocument:xmlns:config:1.0"';

// ── header.xml 의 서식 목록 ────────────────────────────────────────────────────
const FONTS = ['함초롬바탕', '맑은 고딕'];
const FONT_LANGS = ['HANGUL', 'LATIN', 'HANJA', 'JAPANESE', 'OTHER', 'SYMBOL', 'USER'];
// borderFill: 1=테두리 없음(문단·글자용), 2=표 본문 셀, 3=표 머리 셀(회색)
const BORDER = { none: 1, cell: 2, head: 3 };
const CHAR = { body: 0, bold: 1, title: 2, heading: 3, cell: 4, cellHead: 5, note: 6, sign: 7 };
const PARA = { left: 0, center: 1, justify: 2, right: 3, indent: 4 };

const TYPE_INFO = '<hh:typeInfo familyType="FCAT_GOTHIC" weight="6" proportion="4" contrast="0" strokeVariation="1" armStyle="1" letterform="1" midline="1" xHeight="1"/>';
function charPrXml(id, { size, bold = false, color = '#000000', font = 0 }) {
    const ref = n => `hangul="${n}" latin="${n}" hanja="${n}" japanese="${n}" other="${n}" symbol="${n}" user="${n}"`;
    return `<hh:charPr id="${id}" height="${size}" textColor="${color}" shadeColor="none" useFontSpace="0" useKerning="0" symMark="NONE" borderFillIDRef="${BORDER.none}">`
        + `<hh:fontRef ${ref(font)}/><hh:ratio ${ref(100)}/><hh:spacing ${ref(0)}/><hh:relSz ${ref(100)}/><hh:offset ${ref(0)}/>`
        + (bold ? '<hh:bold/>' : '')
        + '<hh:underline type="NONE" shape="SOLID" color="#000000"/><hh:strikeout shape="NONE" color="#000000"/><hh:outline type="NONE"/><hh:shadow type="NONE" color="#B2B2B2" offsetX="10" offsetY="10"/></hh:charPr>';
}
function paraPrXml(id, horizontal, left = 0) {
    // 한/글이 저장한 파일과 같이 margin/lineSpacing 은 hp:switch 안에 둔다.
    const inner = `<hh:margin><hc:intent value="0" unit="HWPUNIT"/><hc:left value="${left}" unit="HWPUNIT"/><hc:right value="0" unit="HWPUNIT"/><hc:prev value="0" unit="HWPUNIT"/><hc:next value="0" unit="HWPUNIT"/></hh:margin><hh:lineSpacing type="PERCENT" value="160" unit="HWPUNIT"/>`;
    return `<hh:paraPr id="${id}" tabPrIDRef="0" condense="0" fontLineHeight="0" snapToGrid="1" suppressLineNumbers="0" checked="0" textDir="LTR">`
        + `<hh:align horizontal="${horizontal}" vertical="BASELINE"/><hh:heading type="NONE" idRef="0" level="0"/>`
        + '<hh:breakSetting breakLatinWord="KEEP_WORD" breakNonLatinWord="BREAK_WORD" widowOrphan="0" keepWithNext="0" keepLines="0" pageBreakBefore="0" lineWrap="BREAK"/><hh:autoSpacing eAsianEng="0" eAsianNum="0"/>'
        + `<hp:switch><hp:case hp:required-namespace="http://www.hancom.co.kr/hwpml/2016/HwpUnitChar">${inner}</hp:case><hp:default>${inner}</hp:default></hp:switch>`
        + `<hh:border borderFillIDRef="${BORDER.none}" offsetLeft="0" offsetRight="0" offsetTop="0" offsetBottom="0" connect="0" ignoreMargin="0"/></hh:paraPr>`;
}
function borderFillXml(id, { border = 'NONE', width = '0.12 mm', fill = null }) {
    const side = name => `<hh:${name} type="${border}" width="${width}" color="#000000"/>`;
    return `<hh:borderFill id="${id}" threeD="0" shadow="0" centerLine="NONE" breakCellSeparateLine="0">`
        + '<hh:slash type="NONE" Crooked="0" isCounter="0"/><hh:backSlash type="NONE" Crooked="0" isCounter="0"/>'
        + side('leftBorder') + side('rightBorder') + side('topBorder') + side('bottomBorder')
        + '<hh:diagonal type="SOLID" width="0.1 mm" color="#000000"/>'
        + (fill ? `<hc:fillBrush><hc:winBrush faceColor="${fill}" hatchColor="#000000" alpha="0"/></hc:fillBrush>` : '')
        + '</hh:borderFill>';
}
function headerXml() {
    const fontfaces = `<hh:fontfaces itemCnt="${FONT_LANGS.length}">`
        + FONT_LANGS.map(lang => `<hh:fontface lang="${lang}" fontCnt="${FONTS.length}">`
            + FONTS.map((face, i) => `<hh:font id="${i}" face="${esc(face)}" type="TTF" isEmbedded="0">${TYPE_INFO}</hh:font>`).join('')
            + '</hh:fontface>').join('') + '</hh:fontfaces>';
    const borderFills = [
        borderFillXml(BORDER.none, {}),
        borderFillXml(BORDER.cell, { border: 'SOLID' }),
        borderFillXml(BORDER.head, { border: 'SOLID', fill: '#EDEDED' })
    ];
    const charPrs = [
        charPrXml(CHAR.body, { size: 1000 }),
        charPrXml(CHAR.bold, { size: 1000, bold: true }),
        charPrXml(CHAR.title, { size: 1700, bold: true }),
        charPrXml(CHAR.heading, { size: 1200, bold: true }),
        charPrXml(CHAR.cell, { size: 900 }),
        charPrXml(CHAR.cellHead, { size: 900, bold: true }),
        charPrXml(CHAR.note, { size: 850, color: '#4A4A4A' }),
        charPrXml(CHAR.sign, { size: 1100 })
    ];
    const paraPrs = [
        paraPrXml(PARA.left, 'LEFT'), paraPrXml(PARA.center, 'CENTER'), paraPrXml(PARA.justify, 'JUSTIFY'),
        paraPrXml(PARA.right, 'RIGHT'), paraPrXml(PARA.indent, 'JUSTIFY', 1400)
    ];
    // refList 안의 순서는 스키마 순서다. 한/글이 저장한 파일과 똑같이 둔다.
    return XML_DECL + `<hh:head ${NS} version="1.5" secCnt="1">`
        + '<hh:beginNum page="1" footnote="1" endnote="1" pic="1" tbl="1" equation="1"/><hh:refList>'
        + fontfaces
        + `<hh:borderFills itemCnt="${borderFills.length}">${borderFills.join('')}</hh:borderFills>`
        + `<hh:charProperties itemCnt="${charPrs.length}">${charPrs.join('')}</hh:charProperties>`
        + '<hh:tabProperties itemCnt="1"><hh:tabPr id="0" autoTabLeft="0" autoTabRight="0"/></hh:tabProperties>'
        + '<hh:numberings itemCnt="1"><hh:numbering id="1" start="0"><hh:paraHead start="1" level="1" align="LEFT" useInstWidth="1" autoIndent="1" widthAdjust="0" textOffsetType="PERCENT" textOffset="50" numFormat="DIGIT" charPrIDRef="4294967295" checkable="0">^1.</hh:paraHead></hh:numbering></hh:numberings>'
        + `<hh:paraProperties itemCnt="${paraPrs.length}">${paraPrs.join('')}</hh:paraProperties>`
        + '<hh:styles itemCnt="1"><hh:style id="0" type="PARA" name="바탕글" engName="Normal" paraPrIDRef="0" charPrIDRef="0" nextStyleIDRef="0" langID="1042" lockForm="0"/></hh:styles>'
        + '</hh:refList><hh:compatibleDocument targetProgram="HWP201X"><hh:layoutCompatibility/></hh:compatibleDocument>'
        + '<hh:docOption><hh:linkinfo path="" pageInherit="0" footnoteInherit="0"/></hh:docOption><hh:trackchageConfig flags="0"/></hh:head>';
}

// ── 본문 조립기 ───────────────────────────────────────────────────────────────
// 문단에 hp:linesegarray(줄 배치 캐시)는 넣지 않는다. 내용과 어긋난 캐시는 한/글이
// "문서가 손상되었거나 변조되었을 가능성" 으로 판정하는데, 조립 시점에는 줄 수를 알 수 없다.
// 캐시가 없으면 한/글이 열면서 다시 계산한다.
function createBody() { return { parts: [], images: [], seq: 1000, id() { return this.seq++; } }; }
const runXml = (charPr, inner) => `<hp:run charPrIDRef="${charPr}">${inner}</hp:run>`;
const textXml = value => `<hp:t>${esc(value)}</hp:t>`;
function paraXml(runs, { paraPr = PARA.left, pageBreak = false } = {}) {
    return `<hp:p id="0" paraPrIDRef="${paraPr}" styleIDRef="0" pageBreak="${pageBreak ? 1 : 0}" columnBreak="0" merged="0">${runs}</hp:p>`;
}
function text(body, value, options = {}) {
    body.parts.push(paraXml(runXml(options.charPr ?? CHAR.body, textXml(value)), options));
}
function blank(body) { body.parts.push(paraXml(runXml(CHAR.body, '<hp:t/>'))); }

function cellXml({ value, col, row, width, head = false, align = 'CENTER' }) {
    const para = paraXml(runXml(head ? CHAR.cellHead : CHAR.cell, textXml(value)), { paraPr: align === 'LEFT' ? PARA.left : PARA.center });
    return `<hp:tc name="" header="${head && row === 0 ? 1 : 0}" hasMargin="0" protect="0" editable="0" dirty="0" borderFillIDRef="${head ? BORDER.head : BORDER.cell}">`
        + '<hp:subList id="" textDirection="HORIZONTAL" lineWrap="BREAK" vertAlign="CENTER" linkListIDRef="0" linkListNextIDRef="0" textWidth="0" textHeight="0" hasTextRef="0" hasNumRef="0">'
        + para + '</hp:subList>'
        + `<hp:cellAddr colAddr="${col}" rowAddr="${row}"/><hp:cellSpan colSpan="1" rowSpan="1"/>`
        + `<hp:cellSz width="${width}" height="${CELL_MIN_HEIGHT}"/>`
        + `<hp:cellMargin left="${CELL_MARGIN}" right="${CELL_MARGIN}" top="${CELL_MARGIN}" bottom="${CELL_MARGIN}"/></hp:tc>`;
}
function columnWidths(count, weights) {
    const w = weights && weights.length === count ? weights : Array.from({ length: count }, () => 1);
    const sum = w.reduce((a, b) => a + b, 0);
    const widths = w.map(v => Math.floor(BODY_WIDTH * v / sum));
    widths[widths.length - 1] += BODY_WIDTH - widths.reduce((a, b) => a + b, 0);
    return widths;
}
// matrix: [[{value, head?, align?}, ...], ...]. 셀 병합은 쓰지 않는다 — 표는 행 단위로만 쪽을 넘긴다.
// 함정: 한 셀에 한 쪽을 넘는 내용이 들어가면 넘친 부분이 그냥 잘린다(pageBreak 속성으로도 복구 불가).
// 그래서 긴 문장(선정 사유·평가 메모·서약 문구)은 표에 넣지 않고 최상위 문단으로 푼다.
function table(body, matrix, weights) {
    const colCnt = matrix[0].length;
    const widths = columnWidths(colCnt, weights);
    const rows = matrix.map((row, rowIndex) =>
        '<hp:tr>' + row.map((cell, colIndex) => cellXml({ ...cell, col: colIndex, row: rowIndex, width: widths[colIndex] })).join('') + '</hp:tr>').join('');
    // hp:sz / hp:pos / hp:outMargin / hp:inMargin 은 표 바로 안쪽에 반드시 있어야 한다.
    // 빠지면 한/글 레이아웃 엔진이 무한루프(CPU 100%)에 빠진다.
    const tbl = `<hp:tbl id="${body.id()}" zOrder="0" numberingType="TABLE" textWrap="TOP_AND_BOTTOM" textFlow="BOTH_SIDES" lock="0" dropcapstyle="None" pageBreak="TABLE" repeatHeader="1" rowCnt="${matrix.length}" colCnt="${colCnt}" cellSpacing="0" borderFillIDRef="${BORDER.cell}" noAdjust="0">`
        + `<hp:sz width="${BODY_WIDTH}" widthRelTo="ABSOLUTE" height="${CELL_MIN_HEIGHT * matrix.length}" heightRelTo="ABSOLUTE" protect="0"/>`
        + '<hp:pos treatAsChar="1" affectLSpacing="0" flowWithText="1" allowOverlap="0" holdAnchorAndSO="0" vertRelTo="PARA" horzRelTo="PARA" vertAlign="TOP" horzAlign="LEFT" vertOffset="0" horzOffset="0"/>'
        + '<hp:outMargin left="0" right="0" top="0" bottom="283"/><hp:inMargin left="141" right="141" top="141" bottom="141"/>'
        + rows + '</hp:tbl>';
    body.parts.push(paraXml(runXml(CHAR.cell, tbl + '<hp:t/>'), { paraPr: PARA.center }));
}

// ── 그림(서명) ────────────────────────────────────────────────────────────────
function pngSize(buffer) {
    // IHDR 이 있으면 실제 픽셀 크기를, 없으면 서명 캔버스 기본 비율을 쓴다.
    if (buffer.length >= 24 && buffer.toString('latin1', 12, 16) === 'IHDR') {
        const width = buffer.readUInt32BE(16), height = buffer.readUInt32BE(20);
        if (width > 0 && height > 0 && width <= 20000 && height <= 20000) return { width, height };
    }
    return SIGNATURE_FALLBACK;
}
function decodeSignature(image) {
    const match = /^data:image\/png;base64,([A-Za-z0-9+/]+={0,2})$/.exec(typeof image === 'string' ? image.trim() : '');
    if (!match) return null;
    const buffer = Buffer.from(match[1], 'base64');
    return buffer.length > 0 ? buffer : null;
}
// 그림은 BinData/imageN.png + content.hpf 의 <opf:item isEmbeded="1" hashkey="md5의 base64">
// + 본문 <hc:img binaryItemIDRef="imageN"> 세 곳이 맞아야 붙는다.
// header.xml 의 binDataList 는 필요 없다.
function pictureXml(body, buffer, targetWidth) {
    // 같은 서명이 채점표마다 다시 쓰인다. 같은 바이트면 BinData 항목 하나를 함께 참조한다.
    const hash = crypto.createHash('md5').update(buffer).digest('base64');
    let image = body.images.find(v => v.hash === hash);
    if (!image) {
        const name = `image${body.images.length + 1}`;
        image = { name, path: `BinData/${name}.png`, buffer, hash };
        body.images.push(image);
    }
    const name = image.name;
    const { width, height } = pngSize(buffer);
    const orgWidth = width * PX_TO_HWPUNIT, orgHeight = height * PX_TO_HWPUNIT;
    const curWidth = targetWidth, curHeight = Math.max(1, Math.round(targetWidth * orgHeight / orgWidth));
    const scale = (curWidth / orgWidth).toFixed(6);
    return `<hp:pic id="${body.id()}" zOrder="0" numberingType="PICTURE" textWrap="TOP_AND_BOTTOM" textFlow="BOTH_SIDES" lock="0" dropcapstyle="None" href="" groupLevel="0" instid="${body.id()}" reverse="0">`
        + '<hp:offset x="0" y="0"/>'
        + `<hp:orgSz width="${orgWidth}" height="${orgHeight}"/><hp:curSz width="${curWidth}" height="${curHeight}"/>`
        + '<hp:flip horizontal="0" vertical="0"/>'
        + `<hp:rotationInfo angle="0" centerX="${Math.round(curWidth / 2)}" centerY="${Math.round(curHeight / 2)}" rotateimage="1"/>`
        + `<hp:renderingInfo><hc:transMatrix e1="1" e2="0" e3="0" e4="0" e5="1" e6="0"/><hc:scaMatrix e1="${scale}" e2="0" e3="0" e4="0" e5="${scale}" e6="0"/><hc:rotMatrix e1="1" e2="0" e3="0" e4="0" e5="1" e6="0"/></hp:renderingInfo>`
        + `<hc:img binaryItemIDRef="${name}" bright="0" contrast="0" effect="REAL_PIC" alpha="0"/>`
        + `<hp:imgRect><hc:pt0 x="0" y="0"/><hc:pt1 x="${orgWidth}" y="0"/><hc:pt2 x="${orgWidth}" y="${orgHeight}"/><hc:pt3 x="0" y="${orgHeight}"/></hp:imgRect>`
        + `<hp:imgClip left="0" right="${orgWidth}" top="0" bottom="${orgHeight}"/>`
        + '<hp:inMargin left="0" right="0" top="0" bottom="0"/>'
        + `<hp:imgDim dimwidth="${orgWidth}" dimheight="${orgHeight}"/><hp:effects/>`
        + `<hp:sz width="${curWidth}" widthRelTo="ABSOLUTE" height="${curHeight}" heightRelTo="ABSOLUTE" protect="0"/>`
        + '<hp:pos treatAsChar="1" affectLSpacing="0" flowWithText="1" allowOverlap="0" holdAnchorAndSO="0" vertRelTo="PARA" horzRelTo="COLUMN" vertAlign="TOP" horzAlign="LEFT" vertOffset="0" horzOffset="0"/>'
        + '<hp:outMargin left="0" right="0" top="0" bottom="0"/></hp:pic>';
}
function signatureLine(body, reviewer, prefix) {
    const buffer = decodeSignature(reviewer.pledge?.image);
    const caption = `${prefix}성명: ${reviewer.name}　`;
    const runs = buffer
        ? runXml(CHAR.sign, textXml(caption)) + runXml(CHAR.sign, pictureXml(body, buffer, SIGNATURE_WIDTH) + '<hp:t/>')
        : runXml(CHAR.sign, textXml(`${caption}(서명 또는 인)`));
    body.parts.push(paraXml(runs, { paraPr: PARA.right }));
}

// ── 문서 내용 ─────────────────────────────────────────────────────────────────
const label = stage => stage === 'document' ? '서류심사' : '면접심사';
function rowTotal(row) { return row.attendance === 'absent' ? '불참' : Object.values(row.scores).reduce((a, b) => a + b, 0) + row.bonus; }
const korean = value => new Date(value).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
const koreanDate = value => new Date(value).toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul', year: 'numeric', month: 'long', day: 'numeric' });
// 문구는 인쇄용 HTML(exports.js printHtml)과 한 글자도 다르면 안 된다 — 같은 서약서의 다른 출력이다.
const PLEDGE_ITEMS = [
    '객관적이고 공정한 평가를 위하여 관련 업체 또는 개인위탁강사와의 이해관계를 확인하고, 이해충돌이 있는 경우 담당자에게 알리겠습니다.',
    '평가와 관련하여 금품·향응·편의를 수수하거나 제공받지 않으며, 이러한 상황이 발생하면 담당 부서에 통보하겠습니다.',
    '업무상 취득한 비밀을 준수하고 보안 관련 규정과 지침을 성실히 수행하겠습니다.',
    '평가와 관련하여 알게 된 업무상 비밀을 타인에게 누설하지 않겠습니다.'
];

function coverSection(body, s) {
    text(body, `${s.school} ${s.field} 채용 심사 결과`, { charPr: CHAR.title, paraPr: PARA.center });
    blank(body);
    const basis = s.rules.rankingBasis === 'combined' ? '서류 평균 + 면접 평균' : '면접 평균';
    const info = [
        ['채용명', s.title, '채용 분야', s.field],
        ['서류전형일', s.documentDate, '면접일', s.interviewDate],
        ['순위 기준', basis, '확정일', korean(s.finalizedAt)]
    ];
    table(body, info.map(row => row.map((value, i) => ({ value, head: i % 2 === 0, align: i % 2 === 0 ? 'CENTER' : 'LEFT' }))), [1, 2, 1, 2]);
    blank(body);
}
function statSection(body, s, stage, heading, notes) {
    text(body, heading, { charPr: CHAR.heading, paraPr: PARA.left });
    const stat = statistics(s, stage);
    // 첫 두 칸(접수번호·지원자)만 조금 넓게, 나머지는 균등.
    table(body, [stat.headers.map(value => ({ value, head: true })), ...stat.rows.map(row => row.map(value => ({ value })))],
        stat.headers.map((v, i) => i < 2 ? 1.6 : 1));
    // 긴 문장은 표 밖 최상위 문단으로. 셀 안에 넣으면 쪽을 넘길 때 잘린다.
    for (const line of notes) text(body, line, { charPr: CHAR.note, paraPr: PARA.justify });
    blank(body);
}
function scoreSheets(body, s, reviewer) {
    for (const stage of reviewer.stages) {
        const ev = s.evaluations[`${stage}:${reviewer.id}`];
        if (!ev) continue;
        const bonusColumn = stage === 'document' && s.rules.allowBonus;
        // 지원자 5명 단위로 표를 나눈다. A4 세로라 더 넣으면 가로 폭이 모자라 글자가 뭉갠다.
        for (let start = 0; start < ev.rows.length; start += 5) {
            const group = ev.rows.slice(start, start + 5);
            text(body, `${label(stage)} 채점표 · ${reviewer.name}`, { charPr: CHAR.heading, paraPr: PARA.left, pageBreak: true });
            text(body, `전형일: ${stage === 'document' ? s.documentDate : s.interviewDate}　대상 ${start + 1}~${start + group.length}명`, { charPr: CHAR.note });
            const headers = ['평가 항목', '최대 배점', ...group.map(row => {
                const c = s.candidates.find(v => v.id === row.candidateId);
                return c ? `${c.code} ${c.name}` : '—';
            })];
            const matrix = [headers.map(value => ({ value, head: true }))];
            for (const item of s.rubrics[stage]) {
                matrix.push([{ value: item.label, align: 'LEFT' }, { value: item.max },
                    ...group.map(row => ({ value: row.attendance === 'absent' ? '불참' : row.scores[item.id] }))]);
            }
            if (stage === 'document') matrix.push([{ value: '가점', align: 'LEFT' }, { value: bonusColumn ? 5 : '미사용' }, ...group.map(row => ({ value: row.bonus }))]);
            const max = stageTotal(s.rubrics, stage) + (bonusColumn ? 5 : 0);
            matrix.push([{ value: '합계', head: true, align: 'LEFT' }, { value: max, head: true }, ...group.map(row => ({ value: rowTotal(row), head: true }))]);
            table(body, matrix, headers.map((v, i) => i === 0 ? 2 : i === 1 ? 1 : 1.4));
            text(body, `채점자 직위: ${reviewer.position}`, { charPr: CHAR.sign, paraPr: PARA.right });
            signatureLine(body, reviewer, '채점자 ');
            // 평가 메모(최대 1,000자)도 표 밖으로 뺀다. 줄바꿈은 문단으로 쪼갠다.
            const noted = group.filter(row => row.note);
            if (noted.length) {
                blank(body);
                text(body, `${label(stage)} 평가 메모`, { charPr: CHAR.bold });
                for (const row of noted) {
                    const c = s.candidates.find(v => v.id === row.candidateId);
                    text(body, c ? `${c.code} ${c.name}` : '—', { charPr: CHAR.bold });
                    for (const line of String(row.note).split(/\r?\n/)) text(body, line, { charPr: CHAR.note, paraPr: PARA.justify });
                }
            }
        }
    }
}
function pledgeSection(body, s, reviewer) {
    text(body, '청렴서약서', { charPr: CHAR.title, paraPr: PARA.center, pageBreak: true });
    blank(body);
    text(body, `본인은 ${s.documentDate}부터 진행되는 ${s.school}의 ${s.field} 채용 심사를 실시함에 있어 다음 사항을 준수할 것을 서약합니다.`, { charPr: CHAR.body, paraPr: PARA.justify });
    blank(body);
    PLEDGE_ITEMS.forEach((item, i) => text(body, `${i + 1}. ${item}`, { charPr: CHAR.body, paraPr: PARA.indent }));
    blank(body);
    blank(body);
    const signedAt = reviewer.pledge?.signedAt;
    text(body, `날짜: ${signedAt ? koreanDate(signedAt) : '______년 ____월 ____일'}`, { charPr: CHAR.sign, paraPr: PARA.right });
    text(body, `직위: ${reviewer.position}`, { charPr: CHAR.sign, paraPr: PARA.right });
    signatureLine(body, reviewer, '');
    blank(body);
    text(body, `${s.school}장 귀하`, { charPr: CHAR.body, paraPr: PARA.center });
}

function sectionXml(body) {
    const secPr = '<hp:secPr id="" textDirection="HORIZONTAL" spaceColumns="1134" tabStop="8000" tabStopVal="4000" tabStopUnit="HWPUNIT" outlineShapeIDRef="1" memoShapeIDRef="0" textVerticalWidthHead="0" masterPageCnt="0">'
        + '<hp:grid lineGrid="0" charGrid="0" wonggojiFormat="0"/><hp:startNum pageStartsOn="BOTH" page="0" pic="0" tbl="0" equation="0"/>'
        + '<hp:visibility hideFirstHeader="0" hideFirstFooter="0" hideFirstMasterPage="0" border="SHOW_ALL" fill="SHOW_ALL" hideFirstPageNum="0" hideFirstEmptyLine="0" showLineNumber="0"/>'
        + '<hp:lineNumberShape restartType="0" countBy="0" distance="0" startNumber="0"/>'
        // A4 세로. 한/글이 저장한 실제 파일이 모두 landscape="WIDELY" + 210×297mm 이라 그대로 따랐다.
        + `<hp:pagePr landscape="WIDELY" width="${PAGE.width}" height="${PAGE.height}" gutterType="LEFT_ONLY"><hp:margin header="0" footer="0" gutter="0" left="${PAGE.margin}" right="${PAGE.margin}" top="${PAGE.margin}" bottom="${PAGE.margin}"/></hp:pagePr>`
        + '<hp:footNotePr><hp:autoNumFormat type="DIGIT" userChar="" prefixChar="" suffixChar=")" supscript="0"/><hp:noteLine length="-1" type="SOLID" width="0.12 mm" color="#000000"/><hp:noteSpacing betweenNotes="283" belowLine="567" aboveLine="850"/><hp:numbering type="CONTINUOUS" newNum="1"/><hp:placement place="EACH_COLUMN" beneathText="0"/></hp:footNotePr>'
        + '<hp:endNotePr><hp:autoNumFormat type="DIGIT" userChar="" prefixChar="" suffixChar=")" supscript="0"/><hp:noteLine length="14692344" type="SOLID" width="0.12 mm" color="#000000"/><hp:noteSpacing betweenNotes="0" belowLine="567" aboveLine="850"/><hp:numbering type="CONTINUOUS" newNum="1"/><hp:placement place="END_OF_DOCUMENT" beneathText="0"/></hp:endNotePr>'
        + '<hp:pageBorderFill type="BOTH" borderFillIDRef="1" textBorder="PAPER" headerInside="0" footerInside="0" fillArea="PAPER"><hp:offset left="1417" right="1417" top="1417" bottom="1417"/></hp:pageBorderFill>'
        + '<hp:pageBorderFill type="EVEN" borderFillIDRef="1" textBorder="PAPER" headerInside="0" footerInside="0" fillArea="PAPER"><hp:offset left="1417" right="1417" top="1417" bottom="1417"/></hp:pageBorderFill>'
        + '<hp:pageBorderFill type="ODD" borderFillIDRef="1" textBorder="PAPER" headerInside="0" footerInside="0" fillArea="PAPER"><hp:offset left="1417" right="1417" top="1417" bottom="1417"/></hp:pageBorderFill>'
        + '</hp:secPr><hp:ctrl><hp:colPr id="" type="NEWSPAPER" layout="LEFT" colCount="1" sameSz="1" sameGap="0"/></hp:ctrl>';
    // 구역 설정(secPr)은 첫 문단의 첫 run 안에 들어간다 — 한/글이 저장하는 형태 그대로.
    const first = body.parts.length
        ? body.parts[0].replace(/^(<hp:p[^>]*>)/, `$1${runXml(CHAR.body, secPr)}`)
        : paraXml(runXml(CHAR.body, secPr) + runXml(CHAR.body, '<hp:t/>'));
    return XML_DECL + `<hs:sec ${NS}>` + [first, ...body.parts.slice(1)].join('') + '</hs:sec>';
}
function contentHpf(body, s) {
    const items = ['<opf:item id="header" href="Contents/header.xml" media-type="application/xml"/>']
        .concat(body.images.map(image => `<opf:item id="${image.name}" href="${image.path}" media-type="image/png" isEmbeded="1" hashkey="${image.hash}"/>`))
        .concat('<opf:item id="section0" href="Contents/section0.xml" media-type="application/xml"/>');
    return XML_DECL + `<opf:package ${NS} version="" unique-identifier="" id="">`
        + `<opf:metadata><opf:title>${esc(`${s.school} ${s.field} 채용 심사 결과`)}</opf:title><opf:language>ko</opf:language>`
        + `<opf:meta name="CreatedDate" content="text">${esc(s.finalizedAt)}</opf:meta>`
        + `<opf:meta name="ModifiedDate" content="text">${esc(s.finalizedAt)}</opf:meta></opf:metadata>`
        + `<opf:manifest>${items.join('')}</opf:manifest>`
        + '<opf:spine><opf:itemref idref="header" linear="yes"/><opf:itemref idref="section0" linear="yes"/></opf:spine></opf:package>';
}
const VERSION_XML = XML_DECL + '<hv:HCFVersion xmlns:hv="http://www.hancom.co.kr/hwpml/2011/version" tagetApplication="WORDPROCESSOR" major="5" minor="1" micro="1" buildNumber="0" os="1" xmlVersion="1.5" application="Hancom Office Hangul" appVersion="13, 0, 0, 1408 WIN32LEWindows_10"/>';
const CONTAINER_XML = XML_DECL + '<ocf:container xmlns:ocf="urn:oasis:names:tc:opendocument:xmlns:container" xmlns:hpf="http://www.hancom.co.kr/schema/2011/hpf"><ocf:rootfiles><ocf:rootfile full-path="Contents/content.hpf" media-type="application/hwpml-package+xml"/></ocf:rootfiles></ocf:container>';
const MANIFEST_XML = XML_DECL + '<odf:manifest xmlns:odf="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0"/>';

async function buildHwpx(r) {
    assert(r?.snapshot, '결과 확정 후 다운로드할 수 있습니다.', 409);
    const s = r.snapshot;
    const body = createBody();
    coverSection(body, s);
    statSection(body, s, 'document', '1. 서류심사 집계표', [
        `서류 기본 ${stageTotal(s.rubrics, 'document')}점${s.rules.allowBonus ? ' + 확인된 가점 최대 5점' : ' · 가점 미사용'}. 전형 평균은 배정 위원 전원 제출 후 소수 첫째 자리에서 반올림합니다.`,
        `면접대상자 선정 사유: ${s.shortlistReason ?? '—'}`
    ]);
    statSection(body, s, 'interview', '2. 면접·최종 합산 통계표', [
        `면접 ${stageTotal(s.rubrics, 'interview')}점. 최종 순위 기준은 ${s.rules.rankingBasis === 'combined' ? '서류 평균과 면접 평균의 합' : '면접 평균'}이며, 동점은 공동순위(1, 2, 2, 4)로 처리합니다.`,
        '불참은 0점과 구분하여 순위에서 제외합니다. 이 표는 평가 순위이며, 동점자의 최종 선발은 기관의 확정된 기준에 따라 별도로 결정합니다.'
    ]);
    for (const reviewer of s.reviewers) scoreSheets(body, s, reviewer);
    for (const reviewer of s.reviewers) pledgeSection(body, s, reviewer);

    const zip = new JSZip();
    // mimetype 은 반드시 첫 항목이고 무압축(STORE)이어야 한다. 폴더 엔트리는 만들지 않는다.
    zip.file('mimetype', 'application/hwp+zip', { compression: 'STORE', createFolders: false });
    zip.file('version.xml', VERSION_XML, { createFolders: false });
    zip.file('META-INF/container.xml', CONTAINER_XML, { createFolders: false });
    zip.file('META-INF/manifest.xml', MANIFEST_XML, { createFolders: false });
    zip.file('Contents/content.hpf', contentHpf(body, s), { createFolders: false });
    zip.file('Contents/header.xml', headerXml(), { createFolders: false });
    zip.file('Contents/section0.xml', sectionXml(body), { createFolders: false });
    for (const image of body.images) zip.file(image.path, image.buffer, { createFolders: false });
    // JSZip 이 자동으로 만든 폴더 엔트리가 남아 있으면 한/글이 패키지를 거부한다.
    for (const name of Object.keys(zip.files)) if (zip.files[name].dir) zip.remove(name);
    return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', mimeType: 'application/hwp+zip' });
}
module.exports = { buildHwpx };
