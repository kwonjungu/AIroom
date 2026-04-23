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
    return parseAiJson(r.data.choices?.[0]?.message?.content || '{}');
}

// ===== Stage 2: Writer Agent =====
// outline 각 슬라이드의 bullets·notes 작성 + 참고자료 출처 표기
async function stageWriter(ctx, outline, callGroq) {
    const { audience, length, tone, sourcesBlock, sources } = ctx;
    const len = getLengthSpec(length);
    const hasSources = Array.isArray(sources) && sources.length > 0;
    const sourceCitationRule = hasSources
        ? `- 참고자료를 근거로 쓴 bullet·노트는 끝에 [자료N] 태그를 붙이세요. 예: "AI 활용은 교사 업무 30% 경감 [자료1]"`
        : '';

    const systemPrompt = `당신은 발표 원고를 쓰는 '작가' 에이전트입니다.
전 단계(전략 기획자)가 짜준 outline을 받아 각 슬라이드의 본문(bullets)과 발표자 노트(notes)를 씁니다.

반드시 아래 JSON만 반환 (설명/코드블럭 금지):
{
  "title": "(outline의 title 그대로)",
  "subtitle": "(outline의 subtitle)",
  "slides": [
    { "title": "슬라이드 제목", "bullets": ["...", "..."], "notes": "발표자 노트 2~3문장" }
  ]
}

작성 원칙:
- outline의 순서·개수 그대로 유지 (마음대로 추가/삭제 금지).
- bullets 개수: ${len.bulletsPerSlide}, 한 줄당 ${len.charsPerBullet} 이내.
- 톤: ${getToneSpec(tone)}
- notes: 발표자가 입으로 말할 보조 멘트 2~3문장. bullets에 없는 배경·이유·사례 보강.
${sourceCitationRule}
${audience ? `- 청중: ${audience} — 용어·난이도 조절.` : ''}`;

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
- bullets가 너무 길거나(${len.charsPerBullet} 초과) 짧은 경우 조정
- 슬라이드 간 중복·반복 포인트 통합/제거
- 발표자 노트(notes)가 비어있거나 bullets와 동일하면 보강
- 제목(title)이 모호하면 구체화
- 전체 스토리 아크 일관성 체크

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

// Outline만 생성 (미리보기용)
async function generateOutlineOnly(ctx, callGroq) {
    if (!callGroq || typeof callGroq !== 'function') throw new Error('callGroq 함수가 필요합니다');
    const sourcesBlock = buildSourcesBlock(ctx.sources, 18000);
    const styleReferenceBlock = buildStyleReferenceBlock(ctx.referenceDecks);
    return await stageStrategy({ ...ctx, sourcesBlock, styleReferenceBlock }, callGroq);
}

// outline → deck 완성 (Writer + 조건부 Reviewer)
async function buildDeckFromOutline(ctx, outline, callGroq) {
    if (!callGroq || typeof callGroq !== 'function') throw new Error('callGroq 함수가 필요합니다');
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
    parseAiJson,
    LENGTH_SPEC,
    TONE_SPEC,
};
