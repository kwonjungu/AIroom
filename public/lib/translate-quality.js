// 번역 품질 검증/정리 — multicultural-board lib/translation-quality.ts 최신판 이식 (2026-09)
// 의존성 없음. 브라우저는 window.TranslateQuality, 서버(Node)는 require()로 같은 파일을 쓴다.
// → 검증 규칙의 단일 기준. 서버 엔진(lib/doc-translate.js)과 화면이 같은 판정을 내린다.
//
// 실패 예시들:
//   "Here is the translation: xxx"   ← 인트로 붙임
//   "번역: xxx"                       ← 한국어 인트로
//   "```json\n{...}"                 ← JSON 프래그먼트 누수
//   "" 또는 공백                      ← 빈 답
//   원문 그대로                       ← 미번역
//   "Note: this may not be accurate"  ← 해설 첨부
//   원문의 10배 길이                  ← 할루시네이션
//   "HI, 선생님"                      ← 부분 번역(한글 잔류)
(function (global) {
    'use strict';

    // 번역물 맨 앞에 자주 붙는 메타 표현 (LLM 유도 실패 시)
    const INTRO_PATTERNS = [
        /^here (is|are)( the)? translations?[\s:：\-,]/i,
        /^the translation (is|of|for)[\s:：\-,]/i,
        /^translated (text|output|version)[\s:：\-,]/i,
        /^translation[\s:：\-,]/i,
        /^sure[!,.]?\s+(here|this)/i,
        /^번역(?:문)?[\s:：\-,]/,
        /^翻译[\s:：\-,]/,
        /^翻訳[\s:：\-,]/,
        /^перевод[\s:：\-,]/i,
        /^ترجمة[\s:：\-,]/
    ];

    // 번역에 들어가면 안 되는 해설/메타 문구
    const COMMENTARY_TAGS = [
        /\bnote\s*[:：]/i,
        /\bnote that\b/i,
        /\bplease note\b/i,
        /\(translation\)/i,
        /\(translated\)/i,
        /\[.*?translat\w*.*?\]/i,
        /\*\*.*?translation.*?\*\*/i
    ];

    // 번역 불필요 항목 (사전 필터) — 숫자/날짜/URL/이메일/순수 구두점/1글자
    function isUntranslatable(text) {
        if (!text) return true;
        const s = String(text).trim();
        if (!s) return true;
        if (s.length < 2) return true;
        if (/^[\d\s,.\-/:()+%±~]+$/.test(s)) return true;
        if (/^https?:\/\/\S+$/i.test(s)) return true;
        if (/^[\w.+-]+@[\w-]+\.[\w.-]+$/i.test(s)) return true;
        if (/^[\s.,!?;:'"\-—–()\[\]{}·•※○●□■◆◇▶▷→]+$/.test(s)) return true;
        return false;
    }

    // 단건 검증.
    // 반환: { ok, valid, reason } — ok 와 valid 는 같은 값(옛 호출부 호환용 이름 둘).
    // opts.targetLang 을 주면 비한국어 번역의 한글 잔류(부분 번역)도 잡는다.
    function validateTranslation(original, translated, opts) {
        opts = opts || {};
        const orig = String(original == null ? '' : original).trim();
        const tr = String(translated == null ? '' : translated).trim();
        const fail = function (reason) { return { ok: false, valid: false, reason: reason }; };

        if (!tr) return fail('empty');

        // 원문 그대로 — 숫자·URL 처럼 원래 번역이 필요 없는 것만 허용
        if (orig && tr === orig) {
            if (opts.allowSameAsSource || isUntranslatable(orig)) return { ok: true, valid: true, reason: 'untranslatable' };
            return fail('same_as_source');
        }

        // JSON / 마크다운 프래그먼트
        if (tr.indexOf('```') !== -1) return fail('json_leftover');
        if (/^[{[]/.test(tr) && /["'][\w_-]+["']\s*:/.test(tr) && tr.length > 20) return fail('looks_like_json');

        if (INTRO_PATTERNS.some(function (re) { return re.test(tr); })) return fail('template_intro');
        if (COMMENTARY_TAGS.some(function (re) { return re.test(tr); })) return fail('added_commentary');

        // 길이 비율 — 짧은 원문(< 5자)은 제목/단어라 건너뜀
        if (orig.length >= 5) {
            const ratio = tr.length / orig.length;
            if (ratio < 0.15) return fail('too_short');
            if (ratio > 8) return fail('too_long');
        }

        // 같은 글자 반복 (모델 붕괴)
        if (tr.length > 10 && /^(.)\1{5,}$/.test(tr.slice(0, 20))) return fail('repeated_char');

        // 부분 번역 — 비한국어 번역에 한글이 상당량 남음.
        // 사람 이름 등 고유명사 한두 글자는 허용: 2자 이상 + 비율 30% 초과일 때만 실패.
        if (opts.targetLang && opts.targetLang !== 'ko') {
            const hangul = (tr.match(/[가-힣]/g) || []).length;
            const visible = tr.replace(/\s/g, '').length;
            if (hangul >= 2 && visible > 0 && hangul / visible > 0.3) return fail('hangul_residue');
        }

        return { ok: true, valid: true, reason: '' };
    }

    // 배치 검사 — { validRate, failures:[{idx, reason}] }
    function batchCheck(originals, translations, opts) {
        if (!originals || !originals.length) return { validRate: 1, failures: [] };
        const failures = [];
        let pass = 0;
        for (let i = 0; i < originals.length; i++) {
            const r = validateTranslation(originals[i], translations[i], opts);
            if (r.ok) pass++;
            else failures.push({ idx: i, reason: r.reason });
        }
        return { validRate: pass / originals.length, failures: failures };
    }

    // 배치 합격률(숫자) — 옛 호출부 호환
    function batchValidity(originals, translations, opts) {
        return batchCheck(originals, translations, opts).validRate;
    }

    // 군더더기 제거 (번역은 살리고 인트로/볼드/감싼 따옴표/괄호 해설만 뺀다)
    function cleanTranslation(text) {
        let out = String(text == null ? '' : text).trim();

        // 코드 펜스 벗기기
        out = out.replace(/^```[a-z]*\n?/i, '').replace(/\n?```\s*$/, '').trim();

        // 앞 인트로 제거
        for (const re of INTRO_PATTERNS) {
            const m = out.match(re);
            if (m && m.index === 0) out = out.slice(m[0].length).trimStart();
        }
        // "**번역:**" 같은 앞머리 볼드 라벨
        out = out.replace(/^\*\*.{1,30}?\*\*\s*/m, '').trim();
        // 뒤 괄호 해설 ("(translation)" 등)
        out = out.replace(/\s*\([^)]*translat\w*[^)]*\)\s*$/i, '').trim();
        // 전체를 감싼 따옴표 — 중간에 같은 따옴표가 없을 때만 벗긴다
        if (out.length >= 2) {
            const first = out[0], last = out[out.length - 1];
            const pairs = { '"': '"', "'": "'", '“': '”', '‘': '’' };
            if (pairs[first] && pairs[first] === last) {
                const inner = out.slice(1, -1);
                if (inner.indexOf(first) === -1 && inner.indexOf(last) === -1) out = inner.trim();
            }
        }
        return out;
    }

    const api = {
        validateTranslation: validateTranslation,
        cleanTranslation: cleanTranslation,
        batchCheck: batchCheck,
        batchValidity: batchValidity,
        isUntranslatable: isUntranslatable
    };
    global.TranslateQuality = api;
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
