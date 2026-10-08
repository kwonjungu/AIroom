'use strict';
// 확정 스냅샷 -> HWPX(한/글) 공문서. 외부 프로그램·COM·네트워크 없이 zip+XML 을 직접 조립한다.
// 참조 구조: templates/permit-calendar-template.hwpx (한/글 13.0 이 저장한 실제 파일) 을 풀어
// header.xml / section0.xml / content.hpf 의 태그 순서와 속성을 그대로 따랐다.
// 쪽 구성은 인쇄용 HTML 과 같은 모형(sheets.js)을 쓴다 — 원본 구글 시트 심사표처럼 전부 A4 세로 한 구역.
// 구역 설정은 Contents/section0.xml 첫 문단의 secPr 이 들고 있다.
const crypto = require('node:crypto');
const JSZip = require('jszip');
const { assert } = require('./domain');
const { printPages } = require('./sheets');

// ── 단위 ──────────────────────────────────────────────────────────────────────
// 1mm = 283.465 HWPUNIT. A4 세로(210×297mm), 좌우 여백 10mm·위아래 12mm(인쇄용 HTML 과 같은 본문 폭).
const MM = 283.465;
// hp:pagePr/@landscape 는 한컴 공식 모델(hancom-io/hwpx-owpml-model)의
// PAGELANDSCAPETYPE { PLT_WIDELY=0, PLT_NARROWLY } 다. 한/글이 저장한 세로 문서는 전부
// landscape="WIDELY" + 59528×84188. (가로가 필요해지면: NARROWLY 플래그만 바꾸고 치수는 그대로 —
// 2026-09-17 실기 판별. 치수까지 맞바꾸면 두 번 회전이 되어 도로 세로가 된다.)
const PAGE = { landscape: 'WIDELY', paperWidth: 59528, paperHeight: 84188, width: 59528, marginX: Math.round(10 * MM), marginY: Math.round(12 * MM) };
const bodyWidth = page => page.width - page.marginX * 2;
// 함정: hp:cellSz/@height 는 "최소값"으로 동작한다. 과대 추정하면 표가 거대한 빈 칸이 되고
// 첫 쪽이 통째로 비어버린다. 한 줄이 들어갈 최소값만 주고 한/글의 자동 확장에 맡긴다.
const CELL_MIN_HEIGHT = 1100;
const CELL_MARGIN = 141;
const SIGNATURE_WIDTH = Math.round(25 * MM); // 서약서 서명 그림 폭 약 25mm
const SHEET_SIGNATURE_WIDTH = Math.round(16 * MM); // 채점표 머리 서명은 작게
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
// borderFill: 1=테두리 없음, 2=표 본문 셀, 3=머리 셀(회색), 4=제목 띠(노랑), 5=순위 줄(연노랑), 6=노랑 칸(테두리 없음 옆에 쓰는 '영역')
const BORDER = { none: 1, cell: 2, head: 3, title: 4, rank: 5, tag: 6 };
const CHAR = { body: 0, bold: 1, title: 2, note: 3, cell: 4, cellBold: 5, small: 6, tiny: 7, roomy: 8, roomyNum: 9, sign: 10, foot: 11 };
const PARA = { left: 0, center: 1, justify: 2, right: 3, indent: 4 };

const TYPE_INFO = '<hh:typeInfo familyType="FCAT_GOTHIC" weight="6" proportion="4" contrast="0" strokeVariation="1" armStyle="1" letterform="1" midline="1" xHeight="1"/>';
function charPrXml(id, { size, bold = false, color = '#000000', font = 0, ratio = 100 }) {
    const ref = n => `hangul="${n}" latin="${n}" hanja="${n}" japanese="${n}" other="${n}" symbol="${n}" user="${n}"`;
    return `<hh:charPr id="${id}" height="${size}" textColor="${color}" shadeColor="none" useFontSpace="0" useKerning="0" symMark="NONE" borderFillIDRef="${BORDER.none}">`
        + `<hh:fontRef ${ref(font)}/><hh:ratio ${ref(ratio)}/><hh:spacing ${ref(0)}/><hh:relSz ${ref(100)}/><hh:offset ${ref(0)}/>`
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
function headerXml(sectionCount) {
    const fontfaces = `<hh:fontfaces itemCnt="${FONT_LANGS.length}">`
        + FONT_LANGS.map(lang => `<hh:fontface lang="${lang}" fontCnt="${FONTS.length}">`
            + FONTS.map((face, i) => `<hh:font id="${i}" face="${esc(face)}" type="TTF" isEmbedded="0">${TYPE_INFO}</hh:font>`).join('')
            + '</hh:fontface>').join('') + '</hh:fontfaces>';
    const borderFills = [
        borderFillXml(BORDER.none, {}),
        borderFillXml(BORDER.cell, { border: 'SOLID' }),
        borderFillXml(BORDER.head, { border: 'SOLID', fill: '#D9D9D9' }),
        borderFillXml(BORDER.title, { border: 'SOLID', width: '0.4 mm', fill: '#FFFF00' }),
        borderFillXml(BORDER.rank, { border: 'SOLID', fill: '#FFF2CC' }),
        borderFillXml(BORDER.tag, { border: 'SOLID', fill: '#FFFF00' })
    ];
    // 글자 크기는 인쇄용 HTML 과 맞춘다: 표 9.5pt, 구분·관점 8pt, 집계표 6.5pt, 면접표 10~11pt, 제목 15pt.
    const charPrs = [
        charPrXml(CHAR.body, { size: 1100 }),
        charPrXml(CHAR.bold, { size: 1200, bold: true }),
        charPrXml(CHAR.title, { size: 1500, bold: true }),
        charPrXml(CHAR.note, { size: 800, color: '#333333' }),
        charPrXml(CHAR.cell, { size: 950 }),
        charPrXml(CHAR.cellBold, { size: 950, bold: true }),
        charPrXml(CHAR.small, { size: 800 }),
        // 집계표는 한 칸이 약 2.6mm 다. 두 자리 점수가 잘리지 않게 장평을 75%로 좁힌다.
        charPrXml(CHAR.tiny, { size: 600, ratio: 70 }),
        charPrXml(CHAR.roomy, { size: 1000 }),
        charPrXml(CHAR.roomyNum, { size: 1100, bold: true }),
        charPrXml(CHAR.sign, { size: 950 }),
        charPrXml(CHAR.foot, { size: 1100 })
    ];
    const paraPrs = [
        paraPrXml(PARA.left, 'LEFT'), paraPrXml(PARA.center, 'CENTER'), paraPrXml(PARA.justify, 'JUSTIFY'),
        paraPrXml(PARA.right, 'RIGHT'), paraPrXml(PARA.indent, 'JUSTIFY', 1400)
    ];
    // refList 안의 순서는 스키마 순서다. 한/글이 저장한 파일과 똑같이 둔다.
    // secCnt 는 구역 수 — Contents/sectionN.xml 개수와 맞아야 한다.
    return XML_DECL + `<hh:head ${NS} version="1.5" secCnt="${sectionCount}">`
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
// doc: 구역들이 함께 쓰는 것(그림 목록·개체 id 일련번호). 같은 서명이 다른 구역에 다시 나와도
// BinData 항목은 하나여야 하고, hp:tbl/hp:pic 의 id 는 문서 전체에서 겹치면 안 된다.
function createDoc() {
    const doc = { images: [], seq: 1000 };
    doc.id = () => doc.seq++;
    return doc;
}
// body: 구역 하나. parts 는 그 구역의 문단들, page 는 그 구역의 용지 설정.
function createBody(doc, page) {
    return { parts: [], images: doc.images, id: doc.id, page, width: bodyWidth(page) };
}
const runXml = (charPr, inner) => `<hp:run charPrIDRef="${charPr}">${inner}</hp:run>`;
const textXml = value => `<hp:t>${esc(value)}</hp:t>`;
function paraXml(runs, { paraPr = PARA.left, pageBreak = false } = {}) {
    return `<hp:p id="0" paraPrIDRef="${paraPr}" styleIDRef="0" pageBreak="${pageBreak ? 1 : 0}" columnBreak="0" merged="0">${runs}</hp:p>`;
}
function text(body, value, options = {}) {
    body.parts.push(paraXml(runXml(options.charPr ?? CHAR.body, textXml(value)), options));
}
function blank(body) { body.parts.push(paraXml(runXml(CHAR.body, '<hp:t/>'))); }

// 셀 하나. paras 는 이미 만든 문단 XML(서명 그림 등), 없으면 value 를 줄마다 문단으로 나눈다.
function cellXml({ value = '', paras = null, col, row, width, height, colSpan = 1, rowSpan = 1, border = BORDER.cell, charPr = CHAR.cell, align = 'CENTER', margin = CELL_MARGIN, marginLeft = margin, header = false }) {
    const paraPr = align === 'LEFT' ? PARA.left : align === 'RIGHT' ? PARA.right : PARA.center;
    const body = paras ?? String(value).split('\n').map(line => paraXml(runXml(charPr, textXml(line)), { paraPr })).join('');
    return `<hp:tc name="" header="${header ? 1 : 0}" hasMargin="1" protect="0" editable="0" dirty="0" borderFillIDRef="${border}">`
        + '<hp:subList id="" textDirection="HORIZONTAL" lineWrap="BREAK" vertAlign="CENTER" linkListIDRef="0" linkListNextIDRef="0" textWidth="0" textHeight="0" hasTextRef="0" hasNumRef="0">'
        + body + '</hp:subList>'
        + `<hp:cellAddr colAddr="${col}" rowAddr="${row}"/><hp:cellSpan colSpan="${colSpan}" rowSpan="${rowSpan}"/>`
        + `<hp:cellSz width="${width}" height="${height}"/>`
        + `<hp:cellMargin left="${marginLeft}" right="${margin}" top="${CELL_MARGIN}" bottom="${CELL_MARGIN}"/></hp:tc>`;
}
function columnWidths(total, count, weights) {
    const w = weights && weights.length === count ? weights : Array.from({ length: count }, () => 1);
    const sum = w.reduce((a, b) => a + b, 0);
    const widths = w.map(v => Math.floor(total * v / sum));
    widths[widths.length - 1] += total - widths.reduce((a, b) => a + b, 0);
    return widths;
}
// rows: [{ cells: [{ col?, colSpan, rowSpan, ...cellXml 인자 }], height }]. 병합은 HTML 과 같은 규칙 —
// 위에서 rowSpan 으로 덮인 칸은 아래 줄 목록에 없고, 칸 주소(colAddr)는 비어 있는 다음 칸으로 정한다.
// 함정: 한 셀에 한 쪽을 넘는 내용이 들어가면 넘친 부분이 그냥 잘린다(pageBreak 속성으로도 복구 불가).
function gridTable(body, rows, weights, { border = BORDER.cell, pageBreak = false, outBottom = 283, inMargin = 141 } = {}) {
    const colCnt = weights.length, widths = columnWidths(body.width, colCnt, weights);
    const taken = rows.map(() => new Array(colCnt).fill(false));
    const xml = rows.map((row, r) => {
        let col = 0;
        return '<hp:tr>' + row.cells.map(cell => {
            while (col < colCnt && taken[r][col]) col++;
            const colSpan = cell.colSpan || 1, rowSpan = cell.rowSpan || 1, at = col;
            for (let y = r; y < Math.min(rows.length, r + rowSpan); y++) for (let x = at; x < at + colSpan; x++) taken[y][x] = true;
            col += colSpan;
            const width = widths.slice(at, at + colSpan).reduce((a, b) => a + b, 0);
            const height = rows.slice(r, r + rowSpan).reduce((a, x) => a + (x.height || CELL_MIN_HEIGHT), 0);
            // 함정(실기 확인 2026-10-08): 폭 3mm 안팎의 좁은 칸에서는 한/글의 가운데 정렬이 글자를 오른쪽으로 밀어
            // 두 자리 숫자의 뒷자리가 칸 밖으로 잘린다. 그런 칸은 왼쪽 정렬 + 계산한 왼쪽 여백으로 가운데에 둔다.
            const manual = cell.centerText ? { align: 'LEFT', margin: 0, marginLeft: Math.max(0, Math.round((width - String(cell.value).length * cell.centerText) / 2)) } : {};
            return cellXml({ ...cell, ...manual, col: at, row: r, width, height, colSpan, rowSpan });
        }).join('') + '</hp:tr>';
    }).join('');
    const total = rows.reduce((a, x) => a + (x.height || CELL_MIN_HEIGHT), 0);
    // hp:sz / hp:pos / hp:outMargin / hp:inMargin 은 표 바로 안쪽에 반드시 있어야 한다.
    // 빠지면 한/글 레이아웃 엔진이 무한루프(CPU 100%)에 빠진다.
    const tbl = `<hp:tbl id="${body.id()}" zOrder="0" numberingType="TABLE" textWrap="TOP_AND_BOTTOM" textFlow="BOTH_SIDES" lock="0" dropcapstyle="None" pageBreak="CELL" repeatHeader="1" rowCnt="${rows.length}" colCnt="${colCnt}" cellSpacing="0" borderFillIDRef="${border}" noAdjust="0">`
        + `<hp:sz width="${body.width}" widthRelTo="ABSOLUTE" height="${total}" heightRelTo="ABSOLUTE" protect="0"/>`
        + '<hp:pos treatAsChar="1" affectLSpacing="0" flowWithText="1" allowOverlap="0" holdAnchorAndSO="0" vertRelTo="PARA" horzRelTo="PARA" vertAlign="TOP" horzAlign="LEFT" vertOffset="0" horzOffset="0"/>'
        + `<hp:outMargin left="0" right="0" top="0" bottom="${outBottom}"/><hp:inMargin left="${inMargin}" right="${inMargin}" top="141" bottom="141"/>`
        + xml + '</hp:tbl>';
    body.parts.push(paraXml(runXml(CHAR.cell, tbl + '<hp:t/>'), { paraPr: PARA.center, pageBreak }));
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
function signatureRuns(body, reviewer, caption, width, charPr = CHAR.sign) {
    const buffer = decodeSignature(reviewer.pledge?.image);
    return buffer
        ? runXml(charPr, textXml(caption)) + runXml(charPr, pictureXml(body, buffer, width) + '<hp:t/>')
        : runXml(charPr, textXml(`${caption}(서명 또는 인)`));
}

// ── 문서 내용: sheets.js 의 쪽 모형을 한/글 표로 ───────────────────────────────
// 칸 종류(k) → 글자·테두리·정렬. 인쇄용 HTML 의 CSS 와 같은 뜻이다.
function cellStyle(cell, page, cls) {
    const head = ['h', 'stage', 'cand', 'who'].includes(cell.k);
    let charPr = CHAR.cell, align = 'CENTER';
    if (cell.k === 'h' || cell.k === 'stage') charPr = CHAR.cellBold;
    if (cell.k === 'gubun' || cell.k === 'view') { align = 'LEFT'; charPr = page.roomy && !page.tight ? CHAR.roomy : CHAR.small; }
    if (cell.k === 'cand') charPr = page.roomy ? CHAR.roomy : CHAR.small;
    // 평가자 이름도 좁은 칸이다. 한/글은 좁은 칸에서 한글 이름을 글자 단위로 넘기지 않으므로,
    // 아래 sheetPage 에서 한 글자씩 줄을 나눠 넣는다(원본과 같은 세로 쓰기 모양).
    if (cell.k === 'who') charPr = CHAR.tiny;
    if (cell.k === 'n' || cell.k === 'nb' || cell.k === 'blank') charPr = page.tight ? (cell.k === 'nb' && !page.roomy ? CHAR.cellBold : cell.k === 'nb' ? CHAR.roomyNum : page.roomy ? CHAR.cell : CHAR.tiny) : page.roomy ? CHAR.roomyNum : cell.k === 'nb' ? CHAR.cellBold : CHAR.cell;
    const border = head ? BORDER.head : /rank/.test(cls || '') ? BORDER.rank : BORDER.cell;
    const narrow = page.tight && cell.cs === 1 && (cell.k === 'n' || cell.k === 'blank');
    // 숫자 한 자 폭(HWPUNIT) = 글자 크기 × 장평 × 0.55. 좁은 칸 가운데 맞춤에 쓴다(gridTable 참고).
    const digit = { [CHAR.tiny]: Math.round(600 * 0.7 * 0.55), [CHAR.cell]: Math.round(950 * 0.55) }[charPr] || Math.round(1000 * 0.55);
    return { charPr, align, border, margin: page.tight && !['gubun', 'view', 'h', 'stage'].includes(cell.k) ? 0 : CELL_MARGIN, ...(narrow ? { centerText: digit } : {}) };
}
// 줄 높이(최솟값). HTML 의 tr 높이와 맞춘다: 28px≈7.4mm, 집계 24px, 면접 78px.
function rowHeight(row, page) {
    const mm = row.head ? 6 : /sum/.test(row.cls || '') ? (page.roomy && !page.tight ? 10.5 : 8) : page.roomy ? (page.tight ? 20 : 20.6) : page.tight ? 6.3 : 7.4;
    return Math.round(mm * MM);
}
function sheetPage(body, page, first) {
    // 제목 띠: 노란 칸 하나짜리 표. 쪽마다 새 쪽에서 시작한다(문서 첫 쪽만 빼고).
    gridTable(body, [{ height: Math.round(10 * MM), cells: [{ value: page.title, charPr: CHAR.title, border: BORDER.title }] }], [1], { border: BORDER.title, pageBreak: !first, outBottom: 0 });
    // 영역 | 분야 | 채점자(서명). 테두리 없는 한 줄 표로 왼쪽·오른쪽을 한 줄에 둔다.
    // 영역 | 분야 | 채점자(서명). 테두리 없는 표로 왼쪽·오른쪽을 한 줄에 두고, 위원이 여럿이면 줄을 더한다
    // ('영역' 노란 칸이 위원 수만큼 늘어나지 않게).
    const signer = v => ({ paras: paraXml(signatureRuns(body, v, `채점자　직위: ${v.position}　성명: ${v.name}　`, SHEET_SIGNATURE_WIDTH), { paraPr: PARA.right }), border: BORDER.none });
    gridTable(body, page.signers.map((v, i) => ({ height: Math.round(7 * MM), cells: i === 0
        ? [{ value: '영역', border: BORDER.tag, charPr: CHAR.cell }, { value: page.field, border: BORDER.none, charPr: CHAR.cell, align: 'LEFT' }, signer(v)]
        : [{ value: '', colSpan: 2, border: BORDER.none }, signer(v)] })), [7, 33, 60], { border: BORDER.none });
    const rows = page.table.rows.map(row => ({ height: rowHeight(row, page), cells: row.cells.map(cell => ({ value: cell.k === 'who' && !page.roomy ? [...cell.v].join('\n') : cell.v, colSpan: cell.cs, rowSpan: cell.rs, header: !!row.head, ...cellStyle(cell, page, row.cls) })) }));
    // 집계표(40칸)는 칸이 2.6mm 라 표 안쪽 여백까지 0으로 둔다. 남기면 두 자리 점수의 뒷자리가 잘린다.
    gridTable(body, rows, page.table.cols, { inMargin: page.tight ? 0 : 141 });
    if (page.note) text(body, page.note, { charPr: CHAR.note, paraPr: PARA.left });
    blank(body);
    text(body, page.date, { charPr: CHAR.foot, paraPr: PARA.center });
    text(body, page.school, { charPr: CHAR.foot, paraPr: PARA.center });
}
// 청렴서약서: 원본처럼 쪽 전체를 두르는 테두리 칸 하나에 담는다. 칸 최소 높이는 본문 높이보다 작게 —
// 한 쪽을 넘는 칸은 잘리므로(위 함정) 넘치지 않을 만큼만 준다.
function pledgePage(body, page, first) {
    const v = page.reviewer, para = (charPr, value, paraPr = PARA.justify) => paraXml(runXml(charPr, textXml(value)), { paraPr });
    const empty = paraXml(runXml(CHAR.body, '<hp:t/>'));
    const paras = [
        para(CHAR.title, '청 렴 서 약 서(평가위원용)', PARA.center), empty, empty,
        para(CHAR.body, page.lead), empty,
        ...page.items.flatMap((item, i) => [para(CHAR.body, `${i + 1}. ${item}`, PARA.indent), empty]),
        empty, para(CHAR.body, page.date, PARA.center), empty,
        paraXml(signatureRuns(body, v, `서약자　직위: ${v.position}　　성명: ${v.name}　`, SIGNATURE_WIDTH, CHAR.body), { paraPr: PARA.right }),
        empty, empty, para(CHAR.bold, `${page.school} 장 귀하`, PARA.left)
    ].join('');
    const height = Math.round(255 * MM);
    gridTable(body, [{ height, cells: [{ paras, margin: Math.round(10 * MM) }] }], [1], { pageBreak: !first, outBottom: 0 });
}

function sectionXml(body) {
    const page = body.page;
    const secPr = '<hp:secPr id="" textDirection="HORIZONTAL" spaceColumns="1134" tabStop="8000" tabStopVal="4000" tabStopUnit="HWPUNIT" outlineShapeIDRef="1" memoShapeIDRef="0" textVerticalWidthHead="0" masterPageCnt="0">'
        + '<hp:grid lineGrid="0" charGrid="0" wonggojiFormat="0"/><hp:startNum pageStartsOn="BOTH" page="0" pic="0" tbl="0" equation="0"/>'
        + '<hp:visibility hideFirstHeader="0" hideFirstFooter="0" hideFirstMasterPage="0" border="SHOW_ALL" fill="SHOW_ALL" hideFirstPageNum="0" hideFirstEmptyLine="0" showLineNumber="0"/>'
        + '<hp:lineNumberShape restartType="0" countBy="0" distance="0" startNumber="0"/>'
        // width/height 는 방향과 무관하게 세로 기준 고정값. 회전은 landscape 플래그가 담당한다.
        + `<hp:pagePr landscape="${page.landscape}" width="${page.paperWidth}" height="${page.paperHeight}" gutterType="LEFT_ONLY"><hp:margin header="0" footer="0" gutter="0" left="${page.marginX}" right="${page.marginX}" top="${page.marginY}" bottom="${page.marginY}"/></hp:pagePr>`
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
// 구역이 여럿이면 Contents/sectionN.xml 을 manifest 와 spine 양쪽에 "구역 순서대로" 올려야 한다.
// spine 순서가 곧 문서에서의 구역 순서다. container.xml/manifest.xml 은 손댈 것이 없다.
function contentHpf(doc, s, sectionCount) {
    const sections = Array.from({ length: sectionCount }, (v, i) => `section${i}`);
    const items = ['<opf:item id="header" href="Contents/header.xml" media-type="application/xml"/>']
        .concat(doc.images.map(image => `<opf:item id="${image.name}" href="${image.path}" media-type="image/png" isEmbeded="1" hashkey="${image.hash}"/>`))
        .concat(sections.map(id => `<opf:item id="${id}" href="Contents/${id}.xml" media-type="application/xml"/>`));
    const spine = ['header', ...sections].map(id => `<opf:itemref idref="${id}" linear="yes"/>`);
    return XML_DECL + `<opf:package ${NS} version="" unique-identifier="" id="">`
        + `<opf:metadata><opf:title>${esc(`${s.school} ${s.field} 채용 심사 결과`)}</opf:title><opf:language>ko</opf:language>`
        + `<opf:meta name="CreatedDate" content="text">${esc(s.finalizedAt)}</opf:meta>`
        + `<opf:meta name="ModifiedDate" content="text">${esc(s.finalizedAt)}</opf:meta></opf:metadata>`
        + `<opf:manifest>${items.join('')}</opf:manifest>`
        + `<opf:spine>${spine.join('')}</opf:spine></opf:package>`;
}
const VERSION_XML = XML_DECL + '<hv:HCFVersion xmlns:hv="http://www.hancom.co.kr/hwpml/2011/version" tagetApplication="WORDPROCESSOR" major="5" minor="1" micro="1" buildNumber="0" os="1" xmlVersion="1.5" application="Hancom Office Hangul" appVersion="13, 0, 0, 1408 WIN32LEWindows_10"/>';
const CONTAINER_XML = XML_DECL + '<ocf:container xmlns:ocf="urn:oasis:names:tc:opendocument:xmlns:container" xmlns:hpf="http://www.hancom.co.kr/schema/2011/hpf"><ocf:rootfiles><ocf:rootfile full-path="Contents/content.hpf" media-type="application/hwpml-package+xml"/></ocf:rootfiles></ocf:container>';
const MANIFEST_XML = XML_DECL + '<odf:manifest xmlns:odf="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0"/>';

async function buildHwpx(r) {
    assert(r?.snapshot, '결과 확정 후 다운로드할 수 있습니다.', 409);
    const s = r.snapshot;
    const doc = createDoc();
    // 한 구역(A4 세로)에 원본 순서대로 쪽을 잇는다: 서약서 → 서류 채점표 → 서류 집계 → 면접 채점표 → 면접 집계.
    const body = createBody(doc, PAGE);
    printPages(s).forEach((page, i) => (page.type === 'pledge' ? pledgePage : sheetPage)(body, page, i === 0));
    const sections = [body];

    const zip = new JSZip();
    // mimetype 은 반드시 첫 항목이고 무압축(STORE)이어야 한다. 폴더 엔트리는 만들지 않는다.
    zip.file('mimetype', 'application/hwp+zip', { compression: 'STORE', createFolders: false });
    zip.file('version.xml', VERSION_XML, { createFolders: false });
    zip.file('META-INF/container.xml', CONTAINER_XML, { createFolders: false });
    zip.file('META-INF/manifest.xml', MANIFEST_XML, { createFolders: false });
    zip.file('Contents/content.hpf', contentHpf(doc, s, sections.length), { createFolders: false });
    zip.file('Contents/header.xml', headerXml(sections.length), { createFolders: false });
    sections.forEach((section, i) => zip.file(`Contents/section${i}.xml`, sectionXml(section), { createFolders: false }));
    for (const image of doc.images) zip.file(image.path, image.buffer, { createFolders: false });
    // JSZip 이 자동으로 만든 폴더 엔트리가 남아 있으면 한/글이 패키지를 거부한다.
    for (const name of Object.keys(zip.files)) if (zip.files[name].dir) zip.remove(name);
    return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', mimeType: 'application/hwp+zip' });
}
module.exports = { buildHwpx };
