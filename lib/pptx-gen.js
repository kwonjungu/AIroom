// AI 프레젠테이션 PPTX 생성 (pptxgenjs)
// deck.slides[i].layout 에 따라 다른 비주얼로 렌더링
//   - bullets      (기본 목록)
//   - stat         (큰 숫자 + 설명)
//   - comparison   (좌·우 2열 비교)
//   - process      (화살표 연결 단계)
//   - chart        (막대·선·파이)
//   - quote        (인용문 강조)

const PptxGenJS = require('pptxgenjs');

const THEMES = {
    education: {
        name: '교육 블루 · 깔끔',
        primary:'2E5BFF', dark:'1E3A8A', accent:'FFB800',
        text:'1F2937', subtext:'6B7280',
        titleBg:'FFFFFF', titleBar:'left', closingBg:'1E3A8A',
        cardBg:'F8FAFF', cardBorder:'E5EAFF',
        font:'Malgun Gothic',
    },
    minimal: {
        name: '미니멀 · 모노톤',
        primary:'171717', dark:'000000', accent:'A3A3A3',
        text:'171717', subtext:'737373',
        titleBg:'FAFAFA', titleBar:'none', closingBg:'000000',
        cardBg:'F5F5F5', cardBorder:'E5E5E5',
        font:'Malgun Gothic',
    },
    dynamic: {
        name: '다이나믹 · 코랄',
        primary:'F43F5E', dark:'881337', accent:'F59E0B',
        text:'1F2937', subtext:'6B7280',
        titleBg:'FFF1F2', titleBar:'diagonal', closingBg:'881337',
        cardBg:'FFF5F6', cardBorder:'FECDD3',
        font:'Malgun Gothic',
    },
    nature: {
        name: '네이처 · 그린',
        primary:'059669', dark:'064E3B', accent:'D97706',
        text:'1F2937', subtext:'6B7280',
        titleBg:'ECFDF5', titleBar:'bottom', closingBg:'064E3B',
        cardBg:'F0FDF4', cardBorder:'BBF7D0',
        font:'Malgun Gothic',
    },
};

const LAYOUT = 'LAYOUT_WIDE'; // 16:9 → 13.33 x 7.5 인치

function txt(t){ return String(t==null?'':t).trim(); }

// ========== 공용: 슬라이드 상단 헤더 ==========
function addSlideHeader(slide, title, index, total, th){
    slide.background = { color:'FFFFFF' };
    slide.addShape('rect', { x:0, y:0, w:13.33, h:0.55, fill:{color:th.primary} });
    slide.addText(`${index} / ${total}`, {
        x:11.5, y:0.08, w:1.6, h:0.4,
        fontFace:th.font, fontSize:12, color:'FFFFFF', bold:true, align:'right', valign:'middle'
    });
    slide.addText(txt(title) || ' ', {
        x:0.6, y:0.8, w:12.1, h:0.9,
        fontFace:th.font, fontSize:26, bold:true, color:th.dark, valign:'middle'
    });
    slide.addShape('line', { x:0.6, y:1.78, w:1.0, h:0, line:{color:th.accent, width:3} });
}

function addSlideFooter(slide, th){
    slide.addText('백암이 · 아이들을 위한 교무실', {
        x:0.5, y:7.15, w:12.33, h:0.28,
        fontFace:th.font, fontSize:10, color:th.subtext, align:'center'
    });
}

// ========== 레이아웃: bullets (기본) ==========
// 텍스트가 콘텐츠 영역 내에서 수직 중앙으로 배치되도록 — 글자가 왼쪽 위에만 쳐지는 문제 해결
function renderBullets(slide, section, th){
    const bullets = (section.bullets||[]).map(txt).filter(Boolean);
    if (bullets.length === 0) return;
    const items = bullets.slice(0, 8).map(t => ({
        text: t, options: { bullet:{type:'bullet', code:'25A0'}, color:th.text }
    }));
    // bullet 수에 따라 fontSize 동적 조정 + 중앙 정렬
    const n = items.length;
    const fontSize = n <= 3 ? 22 : n <= 5 ? 20 : 17;
    const valign = n <= 3 ? 'middle' : 'top';
    slide.addText(items, {
        x:1.2, y:2.1, w:10.9, h:4.8,
        fontFace:th.font, fontSize, color:th.text,
        paraSpaceAfter:n <= 3 ? 16 : 10, valign
    });
}

// ========== 레이아웃: image-left / image-right ==========
// section.imageData (base64 dataURL) 또는 section.imageIndex (deck._images 참조)
function renderImageLayout(slide, section, th, side){
    const imgData = section.imageData;
    const imgArea = { x: side==='left' ? 0.6 : 7.2, y:2.1, w:5.5, h:4.8 };
    const textArea = { x: side==='left' ? 6.5 : 0.8, y:2.1, w:6.1, h:4.8 };

    if (imgData) {
        slide.addImage({
            data: imgData,
            x: imgArea.x, y: imgArea.y, w: imgArea.w, h: imgArea.h,
            sizing: { type:'contain', w: imgArea.w, h: imgArea.h }
        });
    } else {
        // 플레이스홀더 (사진 미제공 시)
        slide.addShape('roundRect', {
            x: imgArea.x, y: imgArea.y, w: imgArea.w, h: imgArea.h,
            fill:{color:th.cardBg}, line:{color:th.cardBorder, width:1}, rectRadius:0.15
        });
        slide.addText('📷 이미지\n(업로드 필요)', {
            x: imgArea.x, y: imgArea.y, w: imgArea.w, h: imgArea.h,
            fontFace:th.font, fontSize:16, color:th.subtext, align:'center', valign:'middle'
        });
    }

    const bullets = (section.bullets||[]).map(txt).filter(Boolean);
    if (bullets.length > 0) {
        const items = bullets.slice(0, 6).map(t => ({
            text: t, options: { bullet:{type:'bullet', code:'25A0'}, color:th.text }
        }));
        slide.addText(items, {
            x: textArea.x, y: textArea.y, w: textArea.w, h: textArea.h,
            fontFace:th.font, fontSize:16, color:th.text,
            paraSpaceAfter:10, valign:'middle'
        });
    } else if (section.body) {
        slide.addText(txt(section.body), {
            x: textArea.x, y: textArea.y, w: textArea.w, h: textArea.h,
            fontFace:th.font, fontSize:15, color:th.text, valign:'middle'
        });
    }
}

// ========== 레이아웃: image-full (전체 배경 + 오버레이 타이틀) ==========
function renderImageFull(slide, section, th){
    const imgData = section.imageData;
    if (imgData) {
        slide.addImage({ data: imgData, x:0, y:0.55, w:13.33, h:6.55 });
        // 반투명 어두운 오버레이
        slide.addShape('rect', {
            x:0, y:0.55, w:13.33, h:6.55,
            fill:{color:'000000', transparency:60}, line:{type:'none'}
        });
    } else {
        slide.addShape('rect', {
            x:0, y:0.55, w:13.33, h:6.55,
            fill:{color:th.dark}, line:{type:'none'}
        });
    }
    // 중앙 제목 오버레이
    const bullets = (section.bullets||[]).map(txt).filter(Boolean);
    slide.addText(bullets[0] || txt(section.title), {
        x:1.0, y:2.8, w:11.3, h:2.0,
        fontFace:th.font, fontSize:36, bold:true, color:'FFFFFF', align:'center', valign:'middle'
    });
    if (bullets.length > 1) {
        slide.addText(bullets.slice(1, 4).join('   ·   '), {
            x:1.0, y:4.9, w:11.3, h:0.8,
            fontFace:th.font, fontSize:16, color:'FFFFFF', align:'center', valign:'middle'
        });
    }
}

// ========== 레이아웃: stat (핵심 숫자) ==========
function renderStat(slide, section, th){
    const stat = section.stat || {};
    const number = txt(stat.number) || '—';
    const unit = txt(stat.unit);
    const label = txt(stat.label);
    const detail = txt(section.statDetail || section.detail);

    // 좌측: 거대 숫자 + 단위
    slide.addText([
        { text: number, options: { fontSize:130, bold:true, color:th.primary } },
        { text: unit, options: { fontSize:50, bold:true, color:th.accent } },
    ], {
        x:0.8, y:2.2, w:6.0, h:3.2,
        fontFace:th.font, valign:'middle', align:'left'
    });
    // 좌측 하단 레이블
    if (label) slide.addText(label, {
        x:0.8, y:5.3, w:6.0, h:1.0,
        fontFace:th.font, fontSize:20, color:th.text, bold:true, valign:'top'
    });

    // 우측 카드
    slide.addShape('roundRect', {
        x:7.3, y:2.3, w:5.4, h:4.4,
        fill:{color:th.cardBg}, line:{color:th.cardBorder, width:1}, rectRadius:0.15
    });
    if (detail) slide.addText(detail, {
        x:7.6, y:2.5, w:4.8, h:4.0,
        fontFace:th.font, fontSize:14, color:th.text, valign:'top',
        paraSpaceAfter:6
    });
    // bullets가 추가 설명으로 있으면 작은 리스트로
    const extras = (section.bullets||[]).map(txt).filter(Boolean);
    if (extras.length > 0 && !detail){
        const items = extras.slice(0,5).map(t => ({
            text: t, options: { bullet:{type:'bullet', code:'25A0'}, color:th.text }
        }));
        slide.addText(items, {
            x:7.6, y:2.5, w:4.8, h:4.0,
            fontFace:th.font, fontSize:14, color:th.text, valign:'top', paraSpaceAfter:6
        });
    }
}

// ========== 레이아웃: comparison (좌·우 비교) ==========
function renderComparison(slide, section, th){
    const c = section.comparison || {};
    const left = { title: txt(c.leftTitle)||'A', points: (c.leftPoints||[]).map(txt).filter(Boolean) };
    const right = { title: txt(c.rightTitle)||'B', points: (c.rightPoints||[]).map(txt).filter(Boolean) };

    const col = (x, data, accent) => {
        slide.addShape('roundRect', {
            x, y:2.1, w:5.8, h:4.8,
            fill:{color:th.cardBg}, line:{color:accent, width:2}, rectRadius:0.15
        });
        slide.addText(data.title, {
            x:x+0.2, y:2.25, w:5.4, h:0.7,
            fontFace:th.font, fontSize:18, bold:true, color:accent, valign:'middle'
        });
        slide.addShape('line', {
            x:x+0.25, y:2.95, w:5.3, h:0,
            line:{color:accent, width:1, dashType:'dash'}
        });
        const items = data.points.slice(0,6).map(t => ({
            text: t, options: { bullet:{type:'bullet', code:'25A0'}, color:th.text }
        }));
        slide.addText(items, {
            x:x+0.3, y:3.1, w:5.2, h:3.6,
            fontFace:th.font, fontSize:14, color:th.text, paraSpaceAfter:8, valign:'top'
        });
    };
    col(0.6, left, th.subtext);
    col(6.9, right, th.primary);

    // 중앙 VS
    slide.addText('VS', {
        x:6.4, y:4.2, w:0.5, h:0.6,
        fontFace:th.font, fontSize:14, bold:true, color:th.accent, align:'center', valign:'middle'
    });
}

// ========== 레이아웃: process (단계 흐름) ==========
function renderProcess(slide, section, th){
    const steps = Array.isArray(section.process) ? section.process.slice(0,5) : [];
    if (steps.length === 0) return renderBullets(slide, section, th);
    const count = steps.length;
    const totalW = 12.0;
    const stepW = totalW / count;
    const arrowW = 0.3;
    const cellW = stepW - arrowW;
    const startX = 0.7;
    const y = 2.8;
    const h = 3.0;

    steps.forEach((s, i) => {
        const x = startX + i * stepW;
        slide.addShape('roundRect', {
            x, y, w: cellW, h, fill:{color:th.cardBg}, line:{color:th.primary, width:1}, rectRadius:0.12
        });
        // 번호 원
        slide.addShape('ellipse', {
            x: x + cellW/2 - 0.28, y: y - 0.25, w:0.56, h:0.56,
            fill:{color:th.primary}, line:{color:th.primary}
        });
        slide.addText(String(s.step || (i+1)), {
            x: x + cellW/2 - 0.28, y: y - 0.25, w:0.56, h:0.56,
            fontFace:th.font, fontSize:18, bold:true, color:'FFFFFF', align:'center', valign:'middle'
        });
        slide.addText(txt(s.title), {
            x: x + 0.1, y: y + 0.45, w: cellW - 0.2, h: 0.7,
            fontFace:th.font, fontSize:14, bold:true, color:th.dark, align:'center', valign:'top'
        });
        slide.addText(txt(s.desc), {
            x: x + 0.15, y: y + 1.2, w: cellW - 0.3, h: h - 1.4,
            fontFace:th.font, fontSize:11, color:th.text, align:'center', valign:'top'
        });
        // 화살표
        if (i < count - 1) {
            slide.addShape('rightArrow', {
                x: x + cellW, y: y + h/2 - 0.15, w: arrowW, h: 0.3,
                fill:{color:th.accent}, line:{color:th.accent}
            });
        }
    });
}

// ========== 레이아웃: chart ==========
function renderChart(slide, section, th, pptx){
    const c = section.chart || {};
    const type = (c.type||'bar').toLowerCase();
    const labels = Array.isArray(c.labels) ? c.labels : [];
    const series = Array.isArray(c.series) ? c.series : [];
    if (labels.length === 0 || series.length === 0) return renderBullets(slide, section, th);

    const chartData = series.map(s => ({
        name: s.name || 'Series',
        labels,
        values: Array.isArray(s.values) ? s.values : []
    }));

    const chartTypeMap = {
        bar: pptx.ChartType.bar,
        column: pptx.ChartType.bar,
        line: pptx.ChartType.line,
        pie: pptx.ChartType.pie,
        doughnut: pptx.ChartType.doughnut,
    };
    const chartType = chartTypeMap[type] || pptx.ChartType.bar;
    const colors = [th.primary, th.accent, th.dark, th.subtext, '22D3EE', 'A855F7'];

    slide.addChart(chartType, chartData, {
        x:0.8, y:2.1, w:11.7, h:4.6,
        chartColors: colors,
        barDir: type === 'bar' ? 'col' : 'bar',
        showLegend: series.length > 1,
        legendPos: 'b',
        catAxisLabelFontFace: th.font, catAxisLabelFontSize: 11,
        valAxisLabelFontFace: th.font, valAxisLabelFontSize: 10,
        dataLabelFontFace: th.font, dataLabelFontSize: 10,
        showValue: true,
    });
}

// ========== 레이아웃: quote ==========
function renderQuote(slide, section, th){
    const quote = txt(section.quote) || ((section.bullets||[])[0] ? `"${section.bullets[0]}"` : '');
    const attr = txt(section.quoteAttr);
    // 큰 따옴표 장식
    slide.addText('"', {
        x:0.6, y:2.1, w:1.5, h:2.0,
        fontFace:th.font, fontSize:160, bold:true, color:th.accent, valign:'middle'
    });
    slide.addText(quote, {
        x:1.8, y:2.6, w:10.8, h:3.0,
        fontFace:th.font, fontSize:28, italic:true, color:th.dark, valign:'middle', paraSpaceAfter:10
    });
    if (attr) slide.addText(attr, {
        x:1.8, y:5.8, w:10.8, h:0.6,
        fontFace:th.font, fontSize:16, color:th.subtext, align:'right', valign:'middle'
    });
}

// ========== 라우터 ==========
function buildContentSlide(pptx, section, index, total, th, images){
    const slide = pptx.addSlide();

    // imageIndex → deck의 업로드된 images 배열에서 dataURL 해결
    if (typeof section.imageIndex === 'number' && images && images[section.imageIndex]) {
        section = { ...section, imageData: images[section.imageIndex] };
    }

    addSlideHeader(slide, section.title, index, total, th);
    const layout = String(section.layout || 'bullets').toLowerCase();
    switch (layout){
        case 'stat':        renderStat(slide, section, th); break;
        case 'comparison':  renderComparison(slide, section, th); break;
        case 'process':     renderProcess(slide, section, th); break;
        case 'chart':       renderChart(slide, section, th, pptx); break;
        case 'quote':       renderQuote(slide, section, th); break;
        case 'image-left':
        case 'imageleft':   renderImageLayout(slide, section, th, 'left'); break;
        case 'image-right':
        case 'imageright':  renderImageLayout(slide, section, th, 'right'); break;
        case 'image-full':
        case 'imagefull':   renderImageFull(slide, section, th); break;
        case 'bullets':
        default:            renderBullets(slide, section, th);
    }
    if (section.notes) slide.addNotes(txt(section.notes));
    addSlideFooter(slide, th);
}

function buildTitleSlide(pptx, deck, th){
    const slide = pptx.addSlide();
    slide.background = { color: th.titleBg };
    if (th.titleBar === 'left') {
        slide.addShape('rect', { x:0, y:0, w:1.2, h:7.5, fill:{color:th.primary} });
    } else if (th.titleBar === 'diagonal') {
        slide.addShape('rect', { x:0, y:0, w:13.33, h:0.6, fill:{color:th.primary} });
        slide.addShape('rect', { x:0, y:6.9, w:13.33, h:0.6, fill:{color:th.accent} });
    } else if (th.titleBar === 'bottom') {
        slide.addShape('rect', { x:0, y:7.1, w:13.33, h:0.4, fill:{color:th.primary} });
    }
    const leftPad = th.titleBar === 'left' ? 1.6 : 1.0;
    slide.addText(txt(deck.title) || '제목 없음', {
        x:leftPad, y:2.2, w:11.0, h:1.6,
        fontFace:th.font, fontSize:40, bold:true, color:th.dark, valign:'middle'
    });
    if (deck.subtitle) slide.addText(txt(deck.subtitle), {
        x:leftPad, y:3.9, w:11.0, h:0.8,
        fontFace:th.font, fontSize:20, color:th.subtext, valign:'middle'
    });
    const d = new Date();
    slide.addText(`${d.getFullYear()}. ${d.getMonth()+1}. ${d.getDate()}.`, {
        x:leftPad, y:6.3, w:5.0, h:0.4,
        fontFace:th.font, fontSize:14, color:th.subtext
    });
    if (deck.footer) slide.addText(txt(deck.footer), {
        x:7.0, y:6.3, w:5.5, h:0.4,
        fontFace:th.font, fontSize:14, color:th.subtext, align:'right'
    });
}

function buildClosingSlide(pptx, deck, th){
    const slide = pptx.addSlide();
    slide.background = { color: th.closingBg };
    slide.addText('감사합니다', {
        x:0.5, y:2.8, w:12.33, h:1.5,
        fontFace:th.font, fontSize:60, bold:true, color:'FFFFFF', align:'center', valign:'middle'
    });
    if (deck.footer) slide.addText(txt(deck.footer), {
        x:0.5, y:4.5, w:12.33, h:0.6,
        fontFace:th.font, fontSize:18, color:'FFFFFF', align:'center', valign:'middle'
    });
    slide.addText('Q & A', {
        x:0.5, y:5.3, w:12.33, h:0.6,
        fontFace:th.font, fontSize:18, color:th.accent, align:'center', valign:'middle'
    });
}

async function generatePptx(deck, themeKey){
    const th = THEMES[themeKey] || THEMES.education;
    const pptx = new PptxGenJS();
    pptx.layout = LAYOUT;
    pptx.title = txt(deck.title) || 'AI 프레젠테이션';
    pptx.author = 'AIroom';
    pptx.company = deck.footer || '백암초등학교';

    // 사용자 업로드 이미지 (base64 dataURL 배열)
    const images = Array.isArray(deck.images) ? deck.images : [];

    const slides = Array.isArray(deck.slides) ? deck.slides : [];
    buildTitleSlide(pptx, deck, th);
    slides.forEach((s, i) => buildContentSlide(pptx, s, i+1, slides.length, th, images));
    if (slides.length > 0) buildClosingSlide(pptx, deck, th);

    return await pptx.write({ outputType:'nodebuffer' });
}

module.exports = { generatePptx, THEMES };
