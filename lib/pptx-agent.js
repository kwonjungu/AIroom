// PPTX 생성 전문 에이전트 파이프라인
//
//   1) Strategy  — 청중·목적·메시지 아크·slide outline 설계
//   2) Writer    — outline의 각 슬라이드에 bullets·notes 작성 (+ 출처 인용)
//   3) Reviewer  — 중복·길이·일관성 검토 후 수정안 적용 (medium/long만)
//   *) regenerateSlide — 한 슬라이드만 재작성 (유저 피드백 반영)
//
// callGroq(body) → { ok, status, data } — server.js의 callGroqWithFallback 주입

const LENGTH_SPEC = {
    short:  { range: '4~5',   bulletsPerSlide: '2~3', charsPerBullet: '15자',  reviewer: false },
    medium: { range: '7~8',   bulletsPerSlide: '3~5', charsPerBullet: '25자',  reviewer: true },
    long:   { range: '12~15', bulletsPerSlide: '4~6', charsPerBullet: '35자 (2줄 허용)', reviewer: true },
};
const TONE_SPEC = {
    brief:    '가장 짧고 핵심만. 문장 대신 키워드·명사구 위주.',
    standard: '표준 발표 톤. 한 줄 완결 문장.',
    detailed: '상세·서술형. 각 bullet은 완결 문장. 배경·이유·근거를 자연스럽게 연결. 발표자 노트 풍부하게.',
};

const getLengthSpec = k => LENGTH_SPEC[k] || LENGTH_SPEC.medium;
const getToneSpec   = k => TONE_SPEC[k]   || TONE_SPEC.standard;

// 참고자료 묶음: 소스별 균등 예산 + 출처 인용용 숫자 태그 부여
function buildSourcesBlock(sources, totalBudget = 18000) {
    if (!Array.isArray(sources) || sources.length === 0) return '';
    const alive = sources.filter(s => s && s.text && s.text.trim());
    if (alive.length === 0) return '';
    const per = Math.floor(totalBudget / alive.length);
    return alive.map((s, i) =>
        `--- [자료${i + 1}: ${s.name || '문서'}] ---\n${(s.text || '').slice(0, per)}`
    ).join('\n\n');
}

// 이전 deck을 "스타일 샘플"로 주입 — 메모리 기능
function buildStyleReferenceBlock(referenceDecks) {
    if (!Array.isArray(referenceDecks) || referenceDecks.length === 0) return '';
    return '\n[참고: 사용자가 선호한 이전 발표 스타일 — 구조·톤만 참고, 내용은 복붙 금지]\n' +
        referenceDecks.map((d, i) => {
            const titles = (d.slides || []).slice(0, 6).map(s => `- ${s.title}`).join('\n');
            return `(스타일 ${i + 1}) 제목: ${d.title || ''}\n${titles}`;
        }).join('\n\n');
}

// JSON 파서 — codeblock·앞뒤 텍스트 방어
function parseAiJson(raw) {
    const s = String(raw || '');
    let t = s.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
    const first = t.indexOf('{');
    const last  = t.lastIndexOf('}');
    if (first >= 0 && last > first) t = t.slice(first, last + 1);
    return JSON.parse(t);
}

// Strategy 응답 표준화: AI가 outline 대신 slides/sections로 주거나
// outline을 object가 아닌 문자열 배열로 주는 케이스를 모두 정규화
function normalizeOutline(obj) {
    if (!obj || typeof obj !== 'object') obj = {};
    let items = obj.outline || obj.slides || obj.sections || obj.items || [];
    if (!Array.isArray(items)) items = [];
    items = items.map((it, i) => {
        if (typeof it === 'string') return { n: i + 1, title: it, focus: '', contentHints: [] };
        return {
            n: it.n || i + 1,
            title: it.title || it.name || it.heading || `슬라이드 ${i + 1}`,
            focus: it.focus || it.goal || it.purpose || it.description || '',
            contentHints: Array.isArray(it.contentHints) ? it.contentHints
                        : Array.isArray(it.bullets) ? it.bullets
                        : Array.isArray(it.points) ? it.points
                        : [],
        };
    });
    return {
        title: obj.title || '',
        subtitle: obj.subtitle || '',
        audienceProfile: obj.audienceProfile || obj.audience || '',
        coreMessage: obj.coreMessage || obj.message || '',
        outline: items,
    };
}

// ===== Stage 1: Strategy Agent =====
async function stageStrategy(ctx, callGroq) {
    const { content, title, audience, length, sourcesBlock, styleReferenceBlock } = ctx;
    const len = getLengthSpec(length);
    const systemPrompt = `당신은 교육·교사용 발표 자료의 '전략 기획자' 에이전트입니다.
역할: 발표의 청중·목적·핵심 메시지를 먼저 확정하고, 슬라이드별 요지(outline)만 짜세요.
슬라이드 본문·bullet 문구는 여기서 쓰지 않습니다. 다음 단계(Writer)에서 작성합니다.

반드시 아래 JSON만 반환 (설명/코드블럭 금지):
{
  "title": "발표 대제목 (25자 이내)",
  "subtitle": "부제목 (40자 이내, 비워도 됨)",
  "audienceProfile": "청중 한 줄 묘사 (누구에게 무엇을 전달하는가)",
  "coreMessage": "발표 전체를 관통하는 한 문장 메시지",
  "outline": [
    { "n": 1, "title": "슬라이드 제목 후보 (20자 이내)", "focus": "이 슬라이드의 목적 한 줄", "contentHints": ["다룰 포인트 키워드 몇 개"] }
  ]
}

제약:
- outline 개수: ${len.range}장
- 논리적 흐름: 도입 → 전개(2~3 층) → 결론/제안. 중복된 슬라이드 금지.
- 첫 슬라이드는 문제 제기/왜 이 주제인가로 시작.
- 마지막 슬라이드는 핵심 요약 또는 실행 제안. "감사합니다"는 자동 추가되므로 넣지 마세요.`;

    const user = [
        title ? `제목 힌트: ${title}` : '',
        audience ? `청중: ${audience}` : '',
        content ? `\n[사용자 입력]\n${content}` : '',
        sourcesBlock ? `\n\n[참고자료 발췌]\n${sourcesBlock}` : '',
        styleReferenceBlock || '',
    ].filter(Boolean).join('\n');

    const r = await callGroq({
        model: 'llama-3.3-70b-versatile',
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: user || '간단한 예시 발표 기획' }
        ],
        temperature: 0.3, max_tokens: 2048,
        response_format: { type: 'json_object' }
    });
    if (!r.ok) throw Object.assign(new Error('Strategy agent 실패'), { stage: 'strategy', apiStatus: r.status, apiData: r.data });
    const parsed = parseAiJson(r.data.choices?.[0]?.message?.content || '{}');
    const normalized = normalizeOutline(parsed);
    if (normalized.outline.length === 0) {
        console.warn('[pptx-agent] Strategy 결과에 outline 비어있음, 원본:', JSON.stringify(parsed).slice(0, 500));
        throw Object.assign(new Error('AI가 개요를 비워서 반환했습니다. 내용을 조금 더 구체적으로 적어 다시 시도해주세요.'), { stage: 'strategy' });
    }
    return normalized;
}

// ===== Stage 2: Writer Agent =====
// outline 각 슬라이드의 bullets·notes 작성 + 레이아웃 선택 + 출처 표기
async function stageWriter(ctx, outline, callGroq) {
    const { audience, length, tone, sourcesBlock, sources } = ctx;
    const len = getLengthSpec(length);
    const hasSources = Array.isArray(sources) && sources.length > 0;
    const sourceCitationRule = hasSources
        ? `- 참고자료 근거가 있는 문장 끝에 [자료N] 태그 (예: "30% 경감 [자료1]")`
        : '';

    const systemPrompt = `당신은 발표 원고를 쓰는 '작가' 에이전트입니다.
outline의 각 슬라이드에 대해 (a) 가장 어울리는 레이아웃을 선택하고 (b) 그 레이아웃에 맞는 필드를 채웁니다.

슬라이드 레이아웃 6종 — 내용 성격에 맞게 적극 활용하여 같은 형식만 반복하지 마세요:

1) "bullets"    — 일반 목록 (기본). 여러 항목 나열할 때.
2) "stat"       — 핵심 숫자 1개 강조. "XX% 증가" 같은 임팩트 있는 통계.
   필드: stat:{ number:"93", unit:"%", label:"한국어 발화량 증가" }, statDetail:"배경 설명 1~3문장"
3) "comparison" — 두 대상 좌우 비교. "기존 vs 도입 후", "문제 vs 해결" 등.
   필드: comparison:{ leftTitle, leftPoints:["...","..."], rightTitle, rightPoints:["...","..."] }
4) "process"    — 순서·단계 (3~5단계). "1→2→3" 같은 흐름.
   필드: process:[{step:"1", title:"문제 발견", desc:"사용자 인터뷰"}, ...]
5) "chart"      — 정량 데이터 (막대/선/파이). 실제 숫자 있을 때만.
   필드: chart:{ type:"bar"|"line"|"pie", labels:["A","B","C"], series:[{name:"참여율", values:[40,65,93]}] }
6) "quote"      — 짧은 인용문 강조. 핵심 메시지·감상평·학생 발화 등.
   필드: quote:"\\"한 줄 인용\\"", quoteAttr:"— 출처"
7) "image-left"  — 좌측 이미지 + 우측 텍스트. 사용자가 업로드한 사진을 활용할 때.
   필드: imageIndex:N (업로드된 이미지의 0부터 시작하는 번호), bullets:[...]
8) "image-right" — 우측 이미지 + 좌측 텍스트. 위와 대칭.
   필드: imageIndex:N, bullets:[...]
9) "image-full"  — 이미지가 전체 배경 + 중앙 텍스트 오버레이 (강렬한 도입 슬라이드에 추천).
   필드: imageIndex:N, bullets:["핵심 한 줄", "부가 한 줄"]

반드시 아래 JSON만 반환 (설명/코드블럭 금지):
{
  "title": "(outline의 title)",
  "subtitle": "(outline의 subtitle)",
  "slides": [
    {
      "title":"슬라이드 제목",
      "layout":"bullets|stat|comparison|process|chart|quote|image-left|image-right|image-full",
      "bullets":["...","..."],
      "stat":{...}, "statDetail":"...",
      "comparison":{...},
      "process":[...],
      "chart":{...},
      "quote":"...", "quoteAttr":"...",
      "imageIndex":0,
      "notes":"발표자 노트 2~3문장"
    }
  ]
}

작성 원칙:
- outline 순서·개수 그대로 유지 (추가/삭제 금지)
- 슬라이드마다 layout 최소 1개 지정. 변화를 줘라 — bullets만 반복 금지.
  * 숫자 강조 가능하면 stat
  * 비교 구도면 comparison
  * 단계 있으면 process
  * 실측 데이터면 chart (추측 수치 쓰지 말고 자료에서 실제 수치만)
  * 인상적 한 줄이면 quote
  * 나머지는 bullets
- 모든 슬라이드에 bullets 필드는 기본 포함 (렌더 실패 시 폴백용)
- bullets 개수: ${len.bulletsPerSlide}, 한 줄당 ${len.charsPerBullet} 이내
- 톤: ${getToneSpec(tone)}
- notes: 2~3문장 발표자 멘트 (bullets와 다른 내용 보강)
${sourceCitationRule}
${ctx.imageCount > 0 ? `- 사용자가 업로드한 이미지 ${ctx.imageCount}개가 있습니다. 적절한 슬라이드(보통 도입·사례·결과 슬라이드)에 image-left/image-right/image-full 레이아웃으로 배치하고 imageIndex를 0~${ctx.imageCount-1} 사이에서 지정하세요. 모든 이미지를 반드시 사용할 필요는 없으며, 내용과 어울릴 때만 씁니다.` : ''}
${audience ? `- 청중: ${audience} — 용어·난이도 조절` : ''}`;

    const r = await callGroq({
        model: 'llama-3.3-70b-versatile',
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `[확정 outline]\n${JSON.stringify(outline, null, 2)}${sourcesBlock ? `\n\n[참고자료]\n${sourcesBlock}` : ''}` }
        ],
        temperature: 0.45,
        max_tokens: length === 'long' ? 6144 : length === 'short' ? 2048 : 4096,
        response_format: { type: 'json_object' }
    });
    if (!r.ok) throw Object.assign(new Error('Writer agent 실패'), { stage: 'writer', apiStatus: r.status, apiData: r.data });
    return parseAiJson(r.data.choices?.[0]?.message?.content || '{}');
}

// ===== Stage 3: Reviewer Agent =====
async function stageReviewer(ctx, deck, callGroq) {
    const { length } = ctx;
    const len = getLengthSpec(length);
    const systemPrompt = `당신은 발표 자료를 검수하는 '편집자' 에이전트입니다.
받은 deck JSON을 검토해 다음을 고치고 동일 스키마로 반환:
- 레이아웃 다양성 확보: bullets만 반복되면 일부를 stat/comparison/process/quote로 전환
  (레이아웃별 필드(stat/comparison/process/chart/quote)를 적절히 보강)
- bullets가 너무 길거나(${len.charsPerBullet} 초과) 짧으면 조정
- 슬라이드 간 중복·반복 포인트 통합/제거
- 발표자 노트(notes)가 비어있거나 bullets와 동일하면 보강
- 제목(title)이 모호하면 구체화

반드시 동일한 JSON 스키마만 반환. 슬라이드 개수와 순서는 유지.
설명·코드블럭·추가 텍스트 금지.`;

    const r = await callGroq({
        model: 'llama-3.3-70b-versatile',
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `[검수 대상 deck]\n${JSON.stringify(deck, null, 2)}` }
        ],
        temperature: 0.25,
        max_tokens: length === 'long' ? 6144 : 4096,
        response_format: { type: 'json_object' }
    });
    if (!r.ok) {
        console.warn('[pptx-agent] reviewer 실패, 이전 deck 사용:', r.status);
        return deck;
    }
    try { return parseAiJson(r.data.choices?.[0]?.message?.content || '{}'); }
    catch (e) { return deck; }
}

// ===== 한 슬라이드만 재생성 =====
// deck 전체 맥락을 참조하면서 slideIndex 슬라이드만 새로 씀.
async function regenerateSlide(ctx, deck, slideIndex, callGroq, userHint) {
    const { length, tone, audience, sourcesBlock, sources } = ctx;
    const len = getLengthSpec(length);
    const hasSources = Array.isArray(sources) && sources.length > 0;

    if (!deck || !Array.isArray(deck.slides) || slideIndex < 0 || slideIndex >= deck.slides.length) {
        throw new Error('슬라이드 인덱스가 잘못되었습니다.');
    }
    const target = deck.slides[slideIndex];
    const context = {
        title: deck.title,
        totalSlides: deck.slides.length,
        currentIndex: slideIndex + 1,
        prevTitle: slideIndex > 0 ? deck.slides[slideIndex - 1].title : null,
        nextTitle: slideIndex < deck.slides.length - 1 ? deck.slides[slideIndex + 1].title : null,
        currentSlide: target,
    };

    const systemPrompt = `당신은 발표 원고 '부분 개선' 에이전트입니다.
deck의 한 슬라이드(${slideIndex + 1}번)만 다시 씁니다. 앞뒤 슬라이드와 겹치지 않도록, 전체 흐름에 어울리게.

반환 JSON (동일 스키마, 한 슬라이드만):
{ "title": "...", "bullets": ["...", "..."], "notes": "..." }

원칙:
- 이전 슬라이드 제목: "${context.prevTitle || '(없음)'}"
- 다음 슬라이드 제목: "${context.nextTitle || '(없음)'}" — 이것과 중복 금지
- bullets 개수: ${len.bulletsPerSlide}, 한 줄당 ${len.charsPerBullet}
- 톤: ${getToneSpec(tone)}
${hasSources ? '- 참고자료 근거는 [자료N] 태그로 표기' : ''}
${audience ? `- 청중: ${audience}` : ''}

설명·코드블럭 금지. JSON 한 개만 반환.`;

    const userMsg = [
        `[전체 발표 제목] ${deck.title}`,
        `[현재 슬라이드 ${context.currentIndex}/${context.totalSlides}]\n${JSON.stringify(target, null, 2)}`,
        userHint ? `[사용자 요청] ${userHint}` : '',
        sourcesBlock ? `\n[참고자료]\n${sourcesBlock}` : '',
    ].filter(Boolean).join('\n\n');

    const r = await callGroq({
        model: 'llama-3.3-70b-versatile',
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMsg }
        ],
        temperature: 0.6, max_tokens: 1500,
        response_format: { type: 'json_object' }
    });
    if (!r.ok) throw Object.assign(new Error('슬라이드 재생성 실패'), { stage: 'regen', apiStatus: r.status, apiData: r.data });
    const updated = parseAiJson(r.data.choices?.[0]?.message?.content || '{}');
    // 방어: 누락 필드는 원본 유지
    return {
        title: updated.title || target.title,
        bullets: Array.isArray(updated.bullets) ? updated.bullets : target.bullets,
        notes: updated.notes || target.notes,
    };
}

// ===== 웹검색 통합 =====
// ctx.webSearch === true 이고 TAVILY_API_KEY가 있으면, Stage 1 전에
// 사용자 입력에서 검색 쿼리를 뽑아 Tavily 호출 → sources에 추가.
async function maybeAugmentWithWebSearch(ctx) {
    if (!ctx.webSearch) return ctx;
    try {
        const { searchWeb, webSearchToSources } = require('./web-search');
        // 검색 쿼리: title이 있으면 우선, 없으면 content 앞 200자
        const query = String(ctx.title || '').trim()
            || String(ctx.content || '').trim().slice(0, 200);
        if (!query) return ctx;
        const result = await searchWeb(query, { maxResults: 5 });
        if (!result.ok || result.results.length === 0) {
            ctx._webSearchStatus = result.reason || 'no_results';
            return ctx;
        }
        const webSources = webSearchToSources(result);
        ctx.sources = [...(ctx.sources || []), ...webSources];
        ctx._webSearchStatus = 'ok';
        ctx._webSearchQuery = query;
    } catch (e) {
        console.warn('[pptx-agent] 웹검색 실패:', e.message);
        ctx._webSearchStatus = 'error';
    }
    return ctx;
}

// ===== 공개 오케스트레이션 =====
// 전체 파이프라인 (이전 버전과 동일)
async function generateDeck(ctx, callGroq) {
    if (!callGroq || typeof callGroq !== 'function') throw new Error('callGroq 함수가 필요합니다');
    const sourcesBlock = buildSourcesBlock(ctx.sources, 18000);
    const styleReferenceBlock = buildStyleReferenceBlock(ctx.referenceDecks);
    const enriched = { ...ctx, sourcesBlock, styleReferenceBlock };

    const outline = await stageStrategy(enriched, callGroq);
    let deck = await stageWriter(enriched, outline, callGroq);

    deck.title = deck.title || outline.title || ctx.title || 'AI 프레젠테이션';
    deck.subtitle = deck.subtitle || outline.subtitle || '';
    deck.footer = ctx.footer || '';

    if (getLengthSpec(ctx.length).reviewer) {
        deck = await stageReviewer(enriched, deck, callGroq);
        deck.title = deck.title || outline.title || ctx.title || 'AI 프레젠테이션';
        deck.footer = ctx.footer || '';
    }
    if (!Array.isArray(deck.slides) || deck.slides.length === 0) {
        throw new Error('Writer 결과에 슬라이드가 없습니다.');
    }
    deck._meta = {
        pipeline: getLengthSpec(ctx.length).reviewer ? 'strategy→writer→reviewer' : 'strategy→writer',
        outlineSlideCount: outline.outline?.length || null,
        finalSlideCount: deck.slides.length,
    };
    return deck;
}

// Outline만 생성 (미리보기용) + 웹검색 선택적 포함
async function generateOutlineOnly(ctx, callGroq) {
    if (!callGroq || typeof callGroq !== 'function') throw new Error('callGroq 함수가 필요합니다');
    ctx = await maybeAugmentWithWebSearch(ctx);
    const sourcesBlock = buildSourcesBlock(ctx.sources, 18000);
    const styleReferenceBlock = buildStyleReferenceBlock(ctx.referenceDecks);
    const result = await stageStrategy({ ...ctx, sourcesBlock, styleReferenceBlock }, callGroq);
    // 웹검색 상태 전달
    if (ctx._webSearchStatus) result._webSearchStatus = ctx._webSearchStatus;
    if (ctx._webSearchQuery) result._webSearchQuery = ctx._webSearchQuery;
    return result;
}

// outline → deck 완성 (Writer + 조건부 Reviewer)
async function buildDeckFromOutline(ctx, outline, callGroq) {
    if (!callGroq || typeof callGroq !== 'function') throw new Error('callGroq 함수가 필요합니다');
    outline = normalizeOutline(outline); // 프론트에서 편집한 outline도 한번 정규화
    if (outline.outline.length === 0) {
        throw Object.assign(new Error('outline이 비어있습니다. 개요 생성을 다시 해주세요.'), { stage: 'build' });
    }
    const sourcesBlock = buildSourcesBlock(ctx.sources, 18000);
    const enriched = { ...ctx, sourcesBlock };

    let deck = await stageWriter(enriched, outline, callGroq);
    deck.title = deck.title || outline.title || ctx.title || 'AI 프레젠테이션';
    deck.subtitle = deck.subtitle || outline.subtitle || '';
    deck.footer = ctx.footer || '';

    if (getLengthSpec(ctx.length).reviewer) {
        deck = await stageReviewer(enriched, deck, callGroq);
        deck.title = deck.title || outline.title || ctx.title || 'AI 프레젠테이션';
        deck.footer = ctx.footer || '';
    }
    if (!Array.isArray(deck.slides) || deck.slides.length === 0) {
        throw new Error('Writer 결과에 슬라이드가 없습니다.');
    }
    deck._meta = {
        pipeline: getLengthSpec(ctx.length).reviewer ? 'writer→reviewer' : 'writer',
        outlineSlideCount: outline.outline?.length || null,
        finalSlideCount: deck.slides.length,
    };
    return deck;
}

module.exports = {
    generateDeck,
    generateOutlineOnly,
    buildDeckFromOutline,
    regenerateSlide,
    stageStrategy,
    stageWriter,
    stageReviewer,
    buildSourcesBlock,
    buildStyleReferenceBlock,
    normalizeOutline,
    parseAiJson,
    LENGTH_SPEC,
    TONE_SPEC,
};
