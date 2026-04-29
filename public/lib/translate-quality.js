// 번역 품질 검증/정리 — multicultural-board 패턴 이식
// 의존성 없음. window.TranslateQuality 네임스페이스로 노출.
(function (global) {
    'use strict';

    // 인트로 누수("Here is the translation:" 등) — 다국어
    const INTRO_RE = /^\s*(here\s+is|here'?s|the\s+translation|translation|번역|译文|翻译|перевод|traduction|traducción|traduzione)\s*[:：\-—]?\s*/i;

    // 마크다운 코드블록/볼드/인라인코드/큐트
    const CODE_FENCE_RE = /^```[\s\S]*?```$/m;
    const JSON_LEAK_RE = /^\s*\{[\s\S]*"(?:items|out|translations?)"\s*:\s*\[/i;
    const NOTE_RE = /\b(note|참고|caveat|disclaimer)\s*[:：]/i;
    const PAREN_NOTE_RE = /\((?:translation|translated|note)\)/i;

    function looksLikeIntro(s) {
        return INTRO_RE.test(s);
    }

    function hasCodeFence(s) {
        return CODE_FENCE_RE.test(s);
    }

    function hasJsonLeak(s) {
        return JSON_LEAK_RE.test(s);
    }

    function hasRepeatedChar(s, n) {
        n = n || 6;
        const re = new RegExp('(.)\\1{' + (n - 1) + ',}');
        return re.test(s);
    }

    function lenRatio(orig, trans) {
        if (!orig || !orig.length) return 1;
        return trans.length / orig.length;
    }

    // 정리: 인트로/볼드/감싼따옴표/괄호해설 제거
    function cleanTranslation(text) {
        if (!text) return '';
        let s = String(text);

        // 코드 펜스 제거 (내용만 남김)
        s = s.replace(/^```[a-z]*\n?/i, '').replace(/\n?```\s*$/, '');

        // JSON 누수 — {"out":[...]} 형식이면 첫 문자열 추출 시도
        const jsonMatch = s.match(/"(?:out|translation|translated)"\s*:\s*"((?:[^"\\]|\\.)*)"/i);
        if (jsonMatch) s = jsonMatch[1].replace(/\\"/g, '"').replace(/\\n/g, '\n');

        // 인트로 제거
        s = s.replace(INTRO_RE, '');

        // 볼드/이탤릭 마크다운
        s = s.replace(/\*\*(.+?)\*\*/g, '$1').replace(/\*(.+?)\*/g, '$1');

        // 감싼 따옴표 (전체가 따옴표로 묶인 경우만)
        const wrapped = s.match(/^["'“”‘’](.*)["'“”‘’]$/s);
        if (wrapped) s = wrapped[1];

        // (translation) 류 괄호 해설 제거
        s = s.replace(/\s*\((?:translation|translated|역|tr\.?)\)\s*/gi, ' ');

        return s.trim();
    }

    // 단건 검증: 합리적인 번역인지 판정
    // 반환: { ok: boolean, reason: string }
    function validateTranslation(original, translated, opts) {
        opts = opts || {};
        const minRatio = opts.minRatio || 0.15;
        const maxRatio = opts.maxRatio || 8.0;

        if (translated == null) return { ok: false, reason: 'null' };
        const t = String(translated);
        if (!t.trim()) return { ok: false, reason: 'empty' };

        const o = String(original || '');

        // 원문 동일 — 단, 숫자/URL/고유명사처럼 번역 불필요한 경우는 OK
        if (o.trim() === t.trim()) {
            if (isUntranslatable(o)) return { ok: true, reason: 'untranslatable' };
            // 영문 입력에 영문 출력 같은 경우는 fromLang=toLang일 때 정상.
            // 호출자가 fromLang/toLang을 검사하므로 여기서는 동일성만 경고로.
            if (o.length > 5) return { ok: false, reason: 'identical' };
            return { ok: true, reason: 'short-identical' };
        }

        if (hasCodeFence(t)) return { ok: false, reason: 'code-fence' };
        if (hasJsonLeak(t)) return { ok: false, reason: 'json-leak' };
        if (NOTE_RE.test(t)) return { ok: false, reason: 'note-leak' };
        if (PAREN_NOTE_RE.test(t)) return { ok: false, reason: 'paren-note' };
        if (hasRepeatedChar(t, 6)) return { ok: false, reason: 'repeat' };
        if (looksLikeIntro(t)) return { ok: false, reason: 'intro' };

        const r = lenRatio(o, t);
        if (r < minRatio) return { ok: false, reason: 'too-short' };
        if (r > maxRatio) return { ok: false, reason: 'too-long' };

        return { ok: true, reason: '' };
    }

    // 번역 불필요 항목 (사전 필터)
    // 숫자/URL/이메일/전화/순수 구두점/매우 짧은 영숫자
    function isUntranslatable(text) {
        if (!text) return true;
        const s = String(text).trim();
        if (!s) return true;
        if (s.length < 2) return true;
        if (/^[\d\s,.\-/:()+]+$/.test(s)) return true; // 숫자/날짜
        if (/^https?:\/\/\S+$/i.test(s)) return true; // URL
        if (/^[\w.+-]+@[\w-]+\.[\w.-]+$/i.test(s)) return true; // 이메일
        if (/^[\s.,!?;:'"\-—–()\[\]{}]+$/.test(s)) return true; // 순수 구두점
        return false;
    }

    // 배치 합격률
    function batchValidity(originals, translations, opts) {
        if (!originals || !originals.length) return 1;
        let pass = 0;
        for (let i = 0; i < originals.length; i++) {
            const r = validateTranslation(originals[i], translations[i], opts);
            if (r.ok) pass++;
        }
        return pass / originals.length;
    }

    global.TranslateQuality = {
        validateTranslation: validateTranslation,
        cleanTranslation: cleanTranslation,
        batchValidity: batchValidity,
        isUntranslatable: isUntranslatable
    };
})(typeof window !== 'undefined' ? window : globalThis);
