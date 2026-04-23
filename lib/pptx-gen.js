// AI 프레젠테이션 PPTX 생성 (pptxgenjs 기반)
// 입력: { title, subtitle?, slides:[{title, bullets:[], notes?}], footer?, theme? }
// 출력: Buffer (Vercel 서버리스에서 스트림 응답용)

const PptxGenJS = require('pptxgenjs');

// ===== 테마 팔레트 =====
// 사용자가 UI에서 테마를 고르면 해당 색상 세트로 렌더링됨.
const THEMES = {
    education: {
        name: '교육 블루 · 깔끔',
        primary:  '2E5BFF',  // 타이틀/포인트 파랑
        dark:     '1E3A8A',  // 제목 진파랑
        accent:   'FFB800',  // 노랑 포인트 라인
        text:     '1F2937',  // 본문 텍스트
        subtext:  '6B7280',  // 부제/부가정보
        titleBg:  'FFFFFF',  // 타이틀 슬라이드 배경
        titleBar: 'left',    // 좌측 세로 바
        closingBg:'1E3A8A',  // 감사합니다 슬라이드 배경
        font:     'Malgun Gothic',
    },
    minimal: {
        name: '미니멀 · 모노톤',
        primary:  '171717',
        dark:     '000000',
        accent:   'A3A3A3',
        text:     '171717',
        subtext:  '737373',
        titleBg:  'FAFAFA',
        titleBar: 'none',
        closingBg:'000000',
        font:     'Malgun Gothic',
    },
    dynamic: {
        name: '다이나믹 · 코랄',
        primary:  'F43F5E',
        dark:     '881337',
        accent:   'F59E0B',
        text:     '1F2937',
        subtext:  '6B7280',
        titleBg:  'FFF1F2',
        titleBar: 'diagonal',
        closingBg:'881337',
        font:     'Malgun Gothic',
    },
    nature: {
        name: '네이처 · 그린',
        primary:  '059669',
        dark:     '064E3B',
        accent:   'D97706',
        text:     '1F2937',
        subtext:  '6B7280',
        titleBg:  'ECFDF5',
        titleBar: 'bottom',
        closingBg:'064E3B',
        font:     'Malgun Gothic',
    },
};

const LAYOUT = 'LAYOUT_WIDE'; // 16:9

function sanitizeText(t) {
    return String(t == null ? '' : t).trim();
}

function addTitleBar(slide, th) {
    if (th.titleBar === 'left') {
        slide.addShape('rect', { x: 0, y: 0, w: 1.2, h: 7.5, fill: { color: th.primary } });
    } else if (th.titleBar === 'diagonal') {
        slide.addShape('rect', { x: 0, y: 0, w: 13.33, h: 0.6, fill: { color: th.primary } });
        slide.addShape('rect', { x: 0, y: 6.9, w: 13.33, h: 0.6, fill: { color: th.accent } });
    } else if (th.titleBar === 'bottom') {
        slide.addShape('rect', { x: 0, y: 7.1, w: 13.33, h: 0.4, fill: { color: th.primary } });
    }
    // 'none' 은 아무것도 안 그림
}

function buildTitleSlide(pptx, deck, th) {
    const slide = pptx.addSlide();
    slide.background = { color: th.titleBg };
    addTitleBar(slide, th);

    slide.addText(sanitizeText(deck.title) || '제목 없음', {
        x: th.titleBar === 'left' ? 1.6 : 1.0, y: 2.2, w: 11.0, h: 1.6,
        fontFace: th.font, fontSize: 40, bold: true, color: th.dark, valign: 'middle'
    });
    if (deck.subtitle) {
        slide.addText(sanitizeText(deck.subtitle), {
            x: th.titleBar === 'left' ? 1.6 : 1.0, y: 3.9, w: 11.0, h: 0.8,
            fontFace: th.font, fontSize: 20, color: th.subtext, valign: 'middle'
        });
    }
    const today = new Date();
    const dateStr = `${today.getFullYear()}. ${today.getMonth()+1}. ${today.getDate()}.`;
    slide.addText(dateStr, {
        x: th.titleBar === 'left' ? 1.6 : 1.0, y: 6.3, w: 5.0, h: 0.4,
        fontFace: th.font, fontSize: 14, color: th.subtext
    });
    if (deck.footer) {
        slide.addText(sanitizeText(deck.footer), {
            x: 7.0, y: 6.3, w: 5.5, h: 0.4,
            fontFace: th.font, fontSize: 14, color: th.subtext, align: 'right'
        });
    }
}

function buildContentSlide(pptx, section, index, total, th) {
    const slide = pptx.addSlide();
    slide.background = { color: 'FFFFFF' };
    // 상단 얇은 띠
    slide.addShape('rect', { x: 0, y: 0, w: 13.33, h: 0.55, fill: { color: th.primary } });
    // 페이지 번호
    slide.addText(`${index} / ${total}`, {
        x: 11.5, y: 0.08, w: 1.6, h: 0.4,
        fontFace: th.font, fontSize: 12, color: 'FFFFFF', bold: true, align: 'right', valign: 'middle'
    });
    // 슬라이드 제목
    slide.addText(sanitizeText(section.title) || ' ', {
        x: 0.6, y: 0.8, w: 12.1, h: 0.9,
        fontFace: th.font, fontSize: 28, bold: true, color: th.dark, valign: 'middle'
    });
    // 제목 아래 액센트 라인
    slide.addShape('line', { x: 0.6, y: 1.8, w: 1.0, h: 0, line: { color: th.accent, width: 3 } });

    const bullets = Array.isArray(section.bullets) ? section.bullets : [];
    const cleanBullets = bullets.map(sanitizeText).filter(Boolean);
    if (cleanBullets.length > 0) {
        const items = cleanBullets.slice(0, 8).map(t => ({
            text: t, options: { bullet: { type: 'bullet', code: '25A0' }, color: th.text }
        }));
        slide.addText(items, {
            x: 0.8, y: 2.1, w: 11.7, h: 4.6,
            fontFace: th.font, fontSize: 18, color: th.text,
            paraSpaceAfter: 10, valign: 'top'
        });
    } else if (section.body) {
        slide.addText(sanitizeText(section.body), {
            x: 0.8, y: 2.1, w: 11.7, h: 4.6,
            fontFace: th.font, fontSize: 18, color: th.text, valign: 'top'
        });
    }

    if (section.notes) slide.addNotes(sanitizeText(section.notes));

    slide.addText('백암이 · 아이들을 위한 교무실', {
        x: 0.5, y: 7.1, w: 12.33, h: 0.3,
        fontFace: th.font, fontSize: 10, color: th.subtext, align: 'center'
    });
}

function buildClosingSlide(pptx, deck, th) {
    const slide = pptx.addSlide();
    slide.background = { color: th.closingBg };
    slide.addText('감사합니다', {
        x: 0.5, y: 2.8, w: 12.33, h: 1.5,
        fontFace: th.font, fontSize: 60, bold: true, color: 'FFFFFF', align: 'center', valign: 'middle'
    });
    if (deck.footer) {
        slide.addText(sanitizeText(deck.footer), {
            x: 0.5, y: 4.5, w: 12.33, h: 0.6,
            fontFace: th.font, fontSize: 18, color: 'FFFFFF', align: 'center', valign: 'middle'
        });
    }
    slide.addText('Q & A', {
        x: 0.5, y: 5.3, w: 12.33, h: 0.6,
        fontFace: th.font, fontSize: 18, color: th.accent, align: 'center', valign: 'middle'
    });
}

async function generatePptx(deck, themeKey) {
    const th = THEMES[themeKey] || THEMES.education;
    const pptx = new PptxGenJS();
    pptx.layout = LAYOUT;
    pptx.title = sanitizeText(deck.title) || 'AI 프레젠테이션';
    pptx.author = 'AIroom';
    pptx.company = deck.footer || '백암초등학교';

    const slides = Array.isArray(deck.slides) ? deck.slides : [];

    buildTitleSlide(pptx, deck, th);
    slides.forEach((s, i) => buildContentSlide(pptx, s, i + 1, slides.length, th));
    if (slides.length > 0) buildClosingSlide(pptx, deck, th);

    return await pptx.write({ outputType: 'nodebuffer' });
}

module.exports = { generatePptx, THEMES };
