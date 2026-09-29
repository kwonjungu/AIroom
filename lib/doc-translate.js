// 문서 번역 엔진 — 가정통신문 번역기(PDF·HWPX·HWP)의 서버 측 핵심.
// multicultural-board lib/groq-translate.ts 최신판(2026-09)의 파이프라인을 이식했다.
// 모델은 AIroom 기존 Groq 체인(GROQ_FALLBACK_MODELS) 그대로 쓰고, 엔진 내부만 바꿨다.
//
// 예전 방식과 달라진 점:
//   1) "[0] 문장" 번호 텍스트 → JSON 모드 {"items":[...]} → {"out":[...]}
//      번호 파싱은 모델이 줄을 합치거나 번호를 빼먹으면 조용히 원문으로 남았다.
//   2) 개수가 요청과 다르면 그 응답은 통째로 폐기하고 다음 모델로.
//      억지로 인덱스를 맞추면 엉뚱한 문장이 엉뚱한 자리에 들어간다.
//   3) 모델별 품질 게이트 — 합격률 80% 미만이면 다음 모델, 모두 미달이면 가장 나은 결과.
//      불합격 항목만 원문으로 메운다(한글 잔류·인트로·해설·길이 이상 등).
//   4) 배치를 개수(40)뿐 아니라 글자 수(3200)로도 자른다 — 긴 문단이 몰리면
//      출력이 max_tokens 에서 잘려 뒤쪽이 통째로 미번역되던 문제.
//   5) 출력 토큰 예산을 원문 글자 수에 맞춘다(비라틴 문자는 토큰이 크게 부풂).
//
// Express·Groq 에 직접 의존하지 않는다. 모델 호출은 callModel 로 주입받는다
// (테스트는 가짜 callModel 로, 서버는 callGroqWithFallback 으로).

const TQ = require('../public/lib/translate-quality.js');

const LANG_NAMES = {
    ko: 'Korean',
    en: 'English',
    zh: 'Chinese (Simplified)',
    vi: 'Vietnamese',
    km: 'Khmer (Cambodian)',
    ja: 'Japanese',
    ru: 'Russian',
    th: 'Thai',
    mn: 'Mongolian',
    uz: 'Uzbek',
    fil: 'Filipino',
    id: 'Indonesian',
    my: 'Burmese (Myanmar)',
    ar: 'Arabic',
    hi: 'Hindi',
};

const MAX_ITEMS = 40;
const MAX_CHARS = 3200;
const PASS_RATE = 0.8;
// 토큰을 많이 먹는 문자 체계 — 같은 뜻이라도 출력 토큰이 한국어 원문 글자 수의 몇 배가 된다.
// 크메르어 20문장 배치가 글자×3 예산에서 잘려 JSON 생성이 계속 실패했다(2026-09-29 실측).
const HEAVY_SCRIPT_LANGS = new Set(['km', 'my', 'th', 'hi', 'ar']);

function langName(code) {
    return LANG_NAMES[code] || code;
}

function buildSystemPrompt() {
    return `You are a professional translator for Korean elementary school newsletters (가정통신문/안내장) sent to multicultural families.
Rules:
- Translate faithfully and naturally for parents. Preserve meaning, tone, and length.
- Translate every item, including headers, footers, signatures, notes, checkbox items and form labels.
- Do NOT add explanations, notes, disclaimers, or "Here is the translation" prefixes.
- Do NOT wrap output in quotes or markdown.
- Preserve proper nouns, numbers, dates, times, phone numbers and URLs exactly.
- Preserve line breaks inside each item.
- If an item is already in the target language, return it unchanged.
- Output must be valid JSON.`;
}

function buildUserPrompt(chunk, fromName, toName) {
    return `Translate each string in the "items" array from ${fromName} to ${toName}.
Return a JSON object with ONE key "out" whose value is an array of EXACTLY ${chunk.length} translated strings, in the same order.

Example (Korean→English):
Input:  {"items": ["안녕하세요", "가정통신문"]}
Output: {"out": ["Hello", "School Newsletter"]}

Now translate:
${JSON.stringify({ items: chunk })}`;
}

// 기대 포맷: {"out":[...]} 또는 바로 배열.
// 파싱 실패·개수 부족(잘림/누락)이면 null. 개수 초과는 앞에서부터 자른다(예시를 덧붙이는 경우).
function parseTranslationResponse(raw, expectedLen) {
    if (!raw) return null;
    const text = String(raw).replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
    let json;
    try { json = JSON.parse(text); } catch (_e) {
        // 앞뒤에 군말이 붙은 경우 — 첫 { ~ 마지막 } 만 다시 시도
        const s = text.indexOf('{'), e = text.lastIndexOf('}');
        if (s === -1 || e <= s) return null;
        try { json = JSON.parse(text.slice(s, e + 1)); } catch (_e2) { return null; }
    }
    let arr = null;
    if (Array.isArray(json)) arr = json;
    else if (json && typeof json === 'object') {
        const c = json.out ?? json.translations ?? json.result;
        if (Array.isArray(c)) arr = c;
    }
    if (!arr || arr.length < expectedLen) return null;
    return arr.slice(0, expectedLen).map(x => String(x ?? ''));
}

// 번역할 항목만 골라 개수·글자 수 상한으로 묶는다. 반환: [[{t, i}], ...]
function makeChunks(texts) {
    const chunks = [];
    let cur = [], chars = 0;
    texts.forEach((t, i) => {
        if (TQ.isUntranslatable(t)) return;
        if (cur.length >= MAX_ITEMS || (cur.length > 0 && chars + t.length > MAX_CHARS)) {
            chunks.push(cur); cur = []; chars = 0;
        }
        cur.push({ t, i });
        chars += t.length;
    });
    if (cur.length) chunks.push(cur);
    return chunks;
}

// 이 에러면 다음 모델로 넘어간다 (한도·미지원 모델·JSON 모드 미지원 400)
function isSkippable(status) {
    return status === 429 || status === 404 || status === 400 || status === 413 || status === 503;
}

// 한 청크 번역. 반환: { out: string[], model, validRate }
async function translateChunk(chunk, opts) {
    const { callModel, models, fromLang, toLang } = opts;
    const trace = opts.trace || [];
    const fromName = langName(fromLang), toName = langName(toLang);
    const chunkChars = chunk.reduce((s, t) => s + t.length, 0);
    const factor = HEAVY_SCRIPT_LANGS.has(toLang) ? 8 : 3;
    const maxTokens = Math.min(8000, Math.max(1500, chunkChars * factor));
    const messages = [
        { role: 'system', content: buildSystemPrompt() },
        { role: 'user', content: buildUserPrompt(chunk, fromName, toName) },
    ];
    const checkOpts = { targetLang: toLang };

    // gpt-oss 는 추론(reasoning) 토큰도 max_tokens 에 포함된다 — 추론이 길어지면 본문 JSON 이
    // 중간에 잘려 Groq 가 400 json_validate_failed 를 낸다(2026-09-29 프리뷰 실측). 추론을 낮게.
    let lastErr = null, sawQuota = false;
    const extraFor = model => (/gpt-oss/i.test(model) ? { reasoning_effort: 'low' } : {});

    // 한 번 호출. 반환: { parsed } | { skip:true, why } — 치명적 오류는 throw
    const attempt = async (model, jsonMode) => {
        const body = { messages, temperature: 0.1, max_tokens: maxTokens, ...extraFor(model) };
        if (jsonMode) body.response_format = { type: 'json_object' };
        const r = await callModel(model, body);
        if (!r || !r.ok) {
            const status = r ? r.status : 500;
            const err = (r && r.data && r.data.error) || {};
            const msg = (typeof err === 'string' ? err : err.message) || `번역 API ${status}`;
            lastErr = msg;
            // JSON 모드 검증 실패 — Groq 가 모델이 실제로 쓴 답을 failed_generation 에 돌려준다.
            // 그 안에 온전한 {"out":[..]} 가 있으면 살려 쓴다.
            if (err.failed_generation) {
                const salvaged = parseTranslationResponse(err.failed_generation, chunk.length);
                if (salvaged) return { parsed: salvaged, salvaged: true };
                return { skip: true, why: `${status} ${err.code || 'json_failed'}`, jsonFailed: true };
            }
            if (status === 429) sawQuota = true;
            if (isSkippable(status) || status >= 500) return { skip: true, why: String(status), jsonFailed: status === 400 };
            throw Object.assign(new Error(String(msg)), { status });
        }
        const content = r.data?.choices?.[0]?.message?.content || '';
        const parsed = parseTranslationResponse(content, chunk.length);
        if (!parsed) return { skip: true, why: 'misaligned' };
        return { parsed };
    };

    let best = null, bestRate = -1, bestModel = null;
    for (const model of models) {
        // JSON 모드 먼저, JSON 모드에서 400 이면 같은 모델을 일반 모드로 한 번 더
        let res = await attempt(model, true);
        trace.push(`${model} json:${res.skip ? res.why : res.salvaged ? 'salvaged' : 'ok'}`);
        if (res.skip && res.jsonFailed) {
            res = await attempt(model, false);
            trace.push(`${model} text:${res.skip ? res.why : 'ok'}`);
        }
        if (res.skip) {
            console.warn(`[doc-translate] ${model} 건너뜀 (${res.why})`);
            continue;
        }
        // 군더더기 정리 → 소량의 다른 문자 체계 오염 제거(예: 크메르어 속 한자 한 글자)
        const cleaned = res.parsed.map(t => TQ.scrubForeignScript(TQ.cleanTranslation(t), toLang));
        const { validRate, failures } = TQ.batchCheck(chunk, cleaned, checkOpts);
        if (validRate >= PASS_RATE) {
            for (const f of failures) {
                console.warn(`[doc-translate] #${f.idx} 원문 유지 (${f.reason}, ${model})`);
                cleaned[f.idx] = chunk[f.idx];
            }
            return { out: cleaned, model, validRate };
        }
        trace.push(`${model} rate:${Math.round(validRate * 100)}%`);
        console.warn(`[doc-translate] ${model} 합격률 ${Math.round(validRate * 100)}% — 다음 모델`);
        if (validRate > bestRate) { best = cleaned; bestRate = validRate; bestModel = model; }
    }

    if (best) {
        for (let i = 0; i < chunk.length; i++) {
            if (!TQ.validateTranslation(chunk[i], best[i], checkOpts).ok) best[i] = chunk[i];
        }
        return { out: best, model: bestModel, validRate: bestRate };
    }
    // 한도(429)가 아니라 형식 실패(잘림·JSON 실패·개수 불일치)였다면 호출부가 청크를 쪼개 다시 시도한다
    throw Object.assign(
        new Error(sawQuota ? '번역 한도 초과: 모든 모델 소진. 잠시 후 다시 시도하세요.' : `번역 실패: ${lastErr || '응답 형식 오류'}`),
        { status: sawQuota ? 429 : 502, splittable: !sawQuota && chunk.length > 1 });
}

// 청크가 형식 문제로 통째 실패하면 반으로 나눠 재귀 번역 (한도 초과는 쪼개도 소용없어 그대로 던짐)
async function translateChunkOrSplit(chunk, opts) {
    try {
        return await translateChunk(chunk, opts);
    } catch (e) {
        if (!e.splittable) throw e;
        const mid = Math.ceil(chunk.length / 2);
        opts.trace.push(`split ${chunk.length}→${mid}+${chunk.length - mid}`);
        console.warn(`[doc-translate] 청크 ${chunk.length}개 실패 → 반으로 나눠 재시도`);
        const a = await translateChunkOrSplit(chunk.slice(0, mid), opts);
        const b = await translateChunkOrSplit(chunk.slice(mid), opts);
        const n = chunk.length;
        return {
            out: a.out.concat(b.out),
            model: a.model,
            validRate: (a.validRate * mid + b.validRate * (n - mid)) / n,
            models: (a.models || [a.model]).concat(b.models || [b.model]),
        };
    }
}

/**
 * 세그먼트 배열 번역. 입력 순서 그대로 같은 길이의 배열을 돌려준다.
 * 번역 불필요(숫자·URL 등)나 검증 불합격 항목은 원문 그대로.
 *
 * @param {string[]} texts
 * @param {{toLang:string, fromLang?:string, models:string[], callModel:(model:string, body:object)=>Promise<{ok:boolean,status:number,data:any}>}} opts
 * @returns {Promise<{translations:string[], stats:{chunks:number, models:string[], validRate:number, translated:number, kept:number}}>}
 */
async function translateSegments(texts, opts) {
    const fromLang = opts.fromLang || 'ko';
    const toLang = opts.toLang;
    if (!toLang) throw new Error('toLang 이 필요합니다');
    const models = (opts.models || []).filter((m, i, a) => m && a.indexOf(m) === i);
    if (!models.length) throw new Error('models 가 비어 있습니다');

    const src = texts.map(t => String(t ?? ''));
    const out = src.slice();
    const chunks = makeChunks(src);
    const usedModels = [];
    const trace = [];
    let weighted = 0, total = 0;

    for (const chunk of chunks) {
        const texts2 = chunk.map(x => x.t);
        const r = await translateChunkOrSplit(texts2, { callModel: opts.callModel, models, fromLang, toLang, trace });
        chunk.forEach(({ i }, j) => { out[i] = r.out[j] ?? src[i]; });
        for (const m of (r.models || [r.model])) if (usedModels.indexOf(m) === -1) usedModels.push(m);
        weighted += r.validRate * texts2.length;
        total += texts2.length;
    }

    const translated = out.filter((t, i) => t !== src[i]).length;
    return {
        translations: out,
        stats: {
            chunks: chunks.length,
            models: usedModels,
            validRate: total ? weighted / total : 1,
            translated,
            kept: src.length - translated,
            trace,
        },
    };
}

module.exports = {
    translateSegments,
    parseTranslationResponse,
    makeChunks,
    buildSystemPrompt,
    buildUserPrompt,
    langName,
    LANG_NAMES,
    MAX_ITEMS,
    MAX_CHARS,
};
