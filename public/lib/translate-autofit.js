// 번역 후 텍스트 확장 시 폰트 크기·줄간격 일괄 축소 캐스케이드
// multicultural-board의 visualWidth + p90 ratio 패턴 이식
// HWPX header.xml의 <hh:charPr height="..."> 와 <hh:paraPr><hh:lineSpacing value="..."/>
// 일괄 스케일. window.TranslateAutofit 으로 노출.
(function (global) {
    'use strict';

    // CJK 글자는 시각적으로 2칸, 비CJK는 1칸으로 계산 (공백 제외)
    // — 한국/중국/일본/한자 통합 판정
    function isCjk(code) {
        return (
            (code >= 0x3000 && code <= 0x303F) ||   // CJK 기호
            (code >= 0x3040 && code <= 0x30FF) ||   // 히라가나/가타카나
            (code >= 0x3400 && code <= 0x4DBF) ||   // CJK 확장A
            (code >= 0x4E00 && code <= 0x9FFF) ||   // CJK 통합 한자
            (code >= 0xAC00 && code <= 0xD7AF) ||   // 한글 음절
            (code >= 0xF900 && code <= 0xFAFF) ||   // CJK 호환 한자
            (code >= 0xFF00 && code <= 0xFFEF)      // 전각 기호
        );
    }

    function visualWidth(s) {
        if (!s) return 0;
        let w = 0;
        for (let i = 0; i < s.length; i++) {
            const c = s.charCodeAt(i);
            if (c === 0x20 || c === 0x09 || c === 0x0A || c === 0x0D) continue; // 공백 제외
            w += isCjk(c) ? 2 : 1;
        }
        return w;
    }

    // 번역 전후 페어에서 90백분위 확장비 계산
    // 너무 짧은 원문(<=2자)은 노이즈라 제외
    function p90Ratio(originals, translations) {
        const ratios = [];
        for (let i = 0; i < originals.length; i++) {
            const o = originals[i];
            const t = translations[i];
            if (!o || !t) continue;
            const ow = visualWidth(o);
            const tw = visualWidth(t);
            if (ow < 3) continue;
            ratios.push(tw / ow);
        }
        if (!ratios.length) return 1;
        ratios.sort(function (a, b) { return a - b; });
        const idx = Math.floor(ratios.length * 0.9);
        return ratios[Math.min(idx, ratios.length - 1)];
    }

    // ratio → 폰트 스케일 (multicultural-board 공식)
    //   sectionFontScale = max(0.55, (1/p90) * 0.85)
    //   - 늘어난 만큼 축소하되 15% 안전마진
    //   - 하한 55% (그 이하로 가면 가독성 무너짐)
    function fontScaleFromRatio(p90) {
        if (p90 <= 1.1) return 1; // 10% 이하 확장이면 손대지 않음
        return Math.max(0.55, (1 / p90) * 0.85);
    }

    // 줄간격 스케일 (폰트보다 덜 줄임)
    function lineSpacingScale(p90) {
        if (p90 <= 1.15) return 1;
        return Math.max(0.85, (1 / p90) * 0.92);
    }

    // ===== HWPX header.xml 변환 =====
    //
    // header.xml 안에는 다음 구조가 있다:
    //   <hh:refList><hh:charProperties itemCnt="N"><hh:charPr id="..." height="2400" ...> ...
    //   <hh:refList><hh:paraProperties itemCnt="N"><hh:paraPr id="..."> ... <hh:lineSpacing value="160" .../>
    //
    // height 단위: 1/100pt (예: 2400 = 24pt)
    // lineSpacing value: 단위는 type 속성에 따라 % (PERCENT) 또는 BETWEEN_LINES.
    //   대부분 PERCENT (예: 160 = 160%). 우리는 PERCENT만 손댐.

    function scaleHeaderXml(headerXml, p90) {
        if (!headerXml) return headerXml;
        const fontScale = fontScaleFromRatio(p90);
        const lineScale = lineSpacingScale(p90);
        if (fontScale === 1 && lineScale === 1) return headerXml;

        let out = headerXml;

        // (1) 모든 charPr.height 일괄 스케일
        if (fontScale < 1) {
            out = out.replace(/(<hh:charPr\b[^>]*\bheight=")(\d+)(")/g, function (_m, p, h, q) {
                const v = Math.max(700, Math.round(parseInt(h, 10) * fontScale));
                return p + v + q;
            });
        }

        // (2) PERCENT 타입 lineSpacing 스케일
        if (lineScale < 1) {
            out = out.replace(
                /<hh:lineSpacing\b([^>]*?)\btype="PERCENT"([^>]*?)\bvalue="(\d+)"([^>]*?)\/>/g,
                function (_m, a, b, v, c) {
                    const nv = Math.max(85, Math.round(parseInt(v, 10) * lineScale));
                    return '<hh:lineSpacing' + a + 'type="PERCENT"' + b + 'value="' + nv + '"' + c + '/>';
                }
            );
            // value-first 순서도 처리
            out = out.replace(
                /<hh:lineSpacing\b([^>]*?)\bvalue="(\d+)"([^>]*?)\btype="PERCENT"([^>]*?)\/>/g,
                function (_m, a, v, b, c, d) {
                    const nv = Math.max(85, Math.round(parseInt(v, 10) * lineScale));
                    return '<hh:lineSpacing' + a + 'value="' + nv + '"' + b + 'type="PERCENT"' + c + (d || '') + '/>';
                }
            );
        }

        return out;
    }

    // ===== 다국어 폰트 통일 =====
    //
    // header.xml의 <hh:fontfaces lang="HANGUL|LATIN|HANJA|JAPANESE|OTHER|SYMBOL|USER">
    //   <hh:font id="N" type="..." face="..."/> ...
    //
    // CJK 문자 깨짐 방지를 위해 모든 폰트의 face를 "함초롱바탕"으로 일괄 교체.
    // (multicultural-board 패턴 — 대부분 PC에 깔려 있고 한컴 기본 폰트)
    function unifyFontsHwpx(headerXml, fontFace) {
        if (!headerXml) return headerXml;
        const face = fontFace || '함초롱바탕';
        // <hh:font ... face="기존폰트" ... />  →  face="함초롱바탕"
        return headerXml.replace(/(<hh:font\b[^>]*\bface=")[^"]*(")/g, function (_m, p, q) {
            return p + face + q;
        });
    }

    global.TranslateAutofit = {
        visualWidth: visualWidth,
        p90Ratio: p90Ratio,
        fontScaleFromRatio: fontScaleFromRatio,
        lineSpacingScale: lineSpacingScale,
        scaleHeaderXml: scaleHeaderXml,
        unifyFontsHwpx: unifyFontsHwpx
    };
})(typeof window !== 'undefined' ? window : globalThis);
