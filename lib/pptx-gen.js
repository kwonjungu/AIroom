// AI 프레젠테이션 PPTX 생성 (pptxgenjs 기반)
// 입력: { title, subtitle?, slides:[{title, bullets:[], notes?}], footer? }
// 출력: Buffer (Vercel 서버리스에서 스트림 응답용)

const PptxGenJS = require('pptxgenjs');

// 깔끔한 학교·교육용 테마 (블루+화이트)
const THEME = {
    primary:  '2E5BFF',  // 메인 파랑
    dark:     '1E3A8A',  // 제목용 진파랑
    accent:   'FFB800',  // 포인트 노랑
    text:     '1F2937',  // 본문 텍스트
    subtext:  '6B7280',  // 부제/부가 정보
    light:    'F3F4F6',  // 섹션 구분 연한 배경
};

// 슬라이드 규격 16:9 와이드 (기본)
const LAYOUT = 'LAYOUT_WIDE';

function sanitizeText(t) {
    return String(t == null ? '' : t).trim();
}

function buildTitleSlide(pptx, deck) {
    const slide = pptx.addSlide();
    slide.background = { color: 'FFFFFF' };
    // 좌측 파랑 블록
    slide.addShape('rect', { x: 0, y: 0, w: 1.2, h: 7.5, fill: { color: THEME.primary } });
    // 타이틀
    slide.addText(sanitizeText(deck.title) || '제목 없음', {
        x: 1.6, y: 2.2, w: 11.0, h: 1.6,
        fontFace: 'Malgun Gothic', fontSize: 40, bold: true, color: THEME.dark, valign: 'middle'
    });
    // 서브타이틀
    if (deck.subtitle) {
        slide.addText(sanitizeText(deck.subtitle), {
            x: 1.6, y: 3.9, w: 11.0, h: 0.8,
            fontFace: 'Malgun Gothic', fontSize: 20, color: THEME.subtext, valign: 'middle'
        });
    }
    // 날짜 / 푸터
    const today = new Date();
    const dateStr = `${today.getFullYear()}. ${today.getMonth()+1}. ${today.getDate()}.`;
    slide.addText(dateStr, {
        x: 1.6, y: 6.3, w: 5.0, h: 0.4,
        fontFace: 'Malgun Gothic', fontSize: 14, color: THEME.subtext
    });
    if (deck.footer) {
        slide.addText(sanitizeText(deck.footer), {
            x: 7.0, y: 6.3, w: 5.5, h: 0.4,
            fontFace: 'Malgun Gothic', fontSize: 14, color: THEME.subtext, align: 'right'
        });
    }
}

function buildContentSlide(pptx, section, index, total) {
    const slide = pptx.addSlide();
    slide.background = { color: 'FFFFFF' };
    // 상단 파랑 띠
    slide.addShape('rect', { x: 0, y: 0, w: 13.33, h: 0.55, fill: { color: THEME.primary } });
    // 페이지 번호 (우상단)
    slide.addText(`${index} / ${total}`, {
        x: 11.5, y: 0.08, w: 1.6, h: 0.4,
        fontFace: 'Malgun Gothic', fontSize: 12, color: 'FFFFFF', bold: true, align: 'right', valign: 'middle'
    });
    // 슬라이드 제목
    slide.addText(sanitizeText(section.title) || ' ', {
        x: 0.6, y: 0.8, w: 12.1, h: 0.9,
        fontFace: 'Malgun Gothic', fontSize: 28, bold: true, color: THEME.dark, valign: 'middle'
    });
    // 제목 아래 액센트 라인
    slide.addShape('line', { x: 0.6, y: 1.8, w: 1.0, h: 0, line: { color: THEME.accent, width: 3 } });

    // 본문 불릿
    const bullets = Array.isArray(section.bullets) ? section.bullets : [];
    const cleanBullets = bullets.map(sanitizeText).filter(Boolean);
    if (cleanBullets.length > 0) {
        const items = cleanBullets.slice(0, 8).map(t => ({
            text: t, options: { bullet: { type: 'bullet', code: '25A0' }, color: THEME.text }
        }));
        slide.addText(items, {
            x: 0.8, y: 2.1, w: 11.7, h: 4.6,
            fontFace: 'Malgun Gothic', fontSize: 18, color: THEME.text,
            paraSpaceAfter: 10, valign: 'top'
        });
    } else if (section.body) {
        slide.addText(sanitizeText(section.body), {
            x: 0.8, y: 2.1, w: 11.7, h: 4.6,
            fontFace: 'Malgun Gothic', fontSize: 18, color: THEME.text, valign: 'top'
        });
    }

    // 발표자 노트 (있을 경우)
    if (section.notes) slide.addNotes(sanitizeText(section.notes));

    // 푸터
    slide.addText('백암이 · 아이들을 위한 교무실', {
        x: 0.5, y: 7.1, w: 12.33, h: 0.3,
        fontFace: 'Malgun Gothic', fontSize: 10, color: THEME.subtext, align: 'center'
    });
}

function buildClosingSlide(pptx, deck) {
    const slide = pptx.addSlide();
    slide.background = { color: THEME.dark };
    slide.addText('감사합니다', {
        x: 0.5, y: 2.8, w: 12.33, h: 1.5,
        fontFace: 'Malgun Gothic', fontSize: 60, bold: true, color: 'FFFFFF', align: 'center', valign: 'middle'
    });
    if (deck.footer) {
        slide.addText(sanitizeText(deck.footer), {
            x: 0.5, y: 4.5, w: 12.33, h: 0.6,
            fontFace: 'Malgun Gothic', fontSize: 18, color: 'FFFFFF', align: 'center', valign: 'middle'
        });
    }
    slide.addText('Q & A', {
        x: 0.5, y: 5.3, w: 12.33, h: 0.6,
        fontFace: 'Malgun Gothic', fontSize: 18, color: THEME.accent, align: 'center', valign: 'middle'
    });
}

// 메인: deck → Buffer
async function generatePptx(deck) {
    const pptx = new PptxGenJS();
    pptx.layout = LAYOUT;
    pptx.title = sanitizeText(deck.title) || 'AI 프레젠테이션';
    pptx.author = 'AIroom';
    pptx.company = deck.footer || '백암초등학교';

    const slides = Array.isArray(deck.slides) ? deck.slides : [];

    buildTitleSlide(pptx, deck);
    const total = slides.length;
    slides.forEach((s, i) => buildContentSlide(pptx, s, i + 1, total));
    if (total > 0) buildClosingSlide(pptx, deck);

    return await pptx.write({ outputType: 'nodebuffer' });
}

module.exports = { generatePptx };
