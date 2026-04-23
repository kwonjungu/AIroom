// PPTX 생성 전문 에이전트 파이프라인
//
// 단일 프롬프트로 한 번에 뽑는 대신 3단계로 나눠 품질 확보.
// 각 단계는 독립된 시스템 프롬프트·역할·제약을 가진 '에이전트'.
//
//   1) Strategy (전략) — 청중·목적·메시지 아크 설계
//   2) Writer   (작성) — 슬라이드 제목·본문·노트 생성
//   3) Reviewer (검수) — 중복·길이·일관성 검토 후 수정안 적용
//
// callGroq(body): ({ok,status,data}) — server.js의 callGroqWithFallback 주입

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

function getLengthSpec(k) { return LENGTH_SPEC[k] || LENGTH_SPEC.medium; }
function getToneSpec(k)   { return TONE_SPEC[k]   || TONE_SPEC.standard; }

// 참고자료 묶음: 총 글자 예산을 두고 균등 배분
function buildSourcesBlock(sources, totalBudget = 18000) {
    if (!Array.isArray(sources) || sources.length === 0) return '';
    const alive = sources.filter(s => s && s.text && s.text.trim());
    if (alive.length === 0) return '';
    const per = Math.floor(totalBudget / alive.length);
    return alive.map(s =>
        `--- 참고자료: ${s.name || '문서'} ---\n${(s.text || '').slice(0, per)}`
    ).join('\n\n');
}

// JSON 응답 파서 — AI가 가끔 앞뒤로 글을 붙이거나 codeblock로 감싸는 케이스 방어
function parseAiJson(raw) {
    const s = String(raw || '');
    // codeblock 제거
    let t = s.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
    // 첫 { 부터 마지막 } 까지 추출
    const first = t.indexOf('{');
    const last  = t.lastIndexOf('}');
    if (first >= 0 && last > first) t = t.slice(first, last + 1);
    return JSON.parse(t);
}

// ===== Stage 1: Strategy Agent =====
// 입력을 훑고 "발표의 뼈대(outline)"를 짠다. 슬라이드 본문은 아직 생성 X.
async function stageStrategy(ctx, callGroq) {
    const { content, title, audience, length, tone, sourcesBlock } = ctx;
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
- outline 개수: ${len.range}장 (청중·길이 고려하여 결정)
- 논리적 흐름: 도입 → 전개(2~3 층) → 결론/제안. 중복된 슬라이드 금지.
- 첫 슬라이드는 문제 제기/왜 이 주제인가로 시작.
- 마지막 슬라이드는 핵심 요약 또는 실행 제안. "감사합니다"는 자동 추가되므로 넣지 마세요.`;

    const user = [
        title ? `제목 힌트: ${title}` : '',
        audience ? `청중: ${audience}` : '',
        content ? `\n[사용자 입력]\n${content}` : '',
        sourcesBlock ? `\n\n[참고자료 발췌]\n${sourcesBlock}` : '',
    ].filter(Boolean).join('\n');

    const r = await callGroq({
        model: 'llama-3.3-70b-versatile',
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: user || '간단한 예시 발표 기획' }
        ],
        temperature: 0.3,
        max_tokens: 2048,
        response_format: { type: 'json_object' }
    });
    if (!r.ok) throw Object.assign(new Error('Strategy agent 실패'), { stage: 'strategy', apiStatus: r.status, apiData: r.data });
    const raw = r.data.choices?.[0]?.message?.content || '{}';
    return parseAiJson(raw);
}

// ===== Stage 2: Writer Agent =====
// outline을 받아 각 슬라이드의 bullets·notes를 실제 문장으로 채운다.
async function stageWriter(ctx, outline, callGroq) {
    const { audience, length, tone, sourcesBlock } = ctx;
    const len = getLengthSpec(length);
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
- 참고자료가 있으면 핵심 근거로 활용 (복붙 금지, 요약·재구성).
- notes: 발표자가 입으로 말할 보조 멘트 2~3문장. bullets와 다른 정보 추가.
${audience ? `- 청중: ${audience} — 용어·난이도 조절.` : ''}`;

    const outlineText = JSON.stringify(outline, null, 2);

    const r = await callGroq({
        model: 'llama-3.3-70b-versatile',
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `[확정 outline]\n${outlineText}${sourcesBlock ? `\n\n[참고자료]\n${sourcesBlock}` : ''}` }
        ],
        temperature: 0.45,
        max_tokens: length === 'long' ? 6144 : length === 'short' ? 2048 : 4096,
        response_format: { type: 'json_object' }
    });
    if (!r.ok) throw Object.assign(new Error('Writer agent 실패'), { stage: 'writer', apiStatus: r.status, apiData: r.data });
    const raw = r.data.choices?.[0]?.message?.content || '{}';
    return parseAiJson(raw);
}

// ===== Stage 3: Reviewer Agent (선택) =====
// 중복 문구·너무 긴 bullet·노트 누락 등을 검수하고 고친 최종안 반환.
async function stageReviewer(ctx, deck, callGroq) {
    const { length } = ctx;
    const len = getLengthSpec(length);
    const systemPrompt = `당신은 발표 자료를 검수하는 '편집자' 에이전트입니다.
받은 deck JSON을 검토하여 다음 문제를 고치고 동일한 JSON 스키마로 반환하세요:
- bullets가 너무 길거나(한 줄 기준 ${len.charsPerBullet} 초과) 너무 짧은 경우 조정
- 슬라이드 간 중복·반복되는 포인트 통합 또는 제거
- 발표자 노트(notes)가 비어있거나 bullets와 동일하면 보강
- 제목(title) 중 모호한 것 더 구체화
- 전체 스토리 아크 일관성 체크

반드시 동일한 JSON 스키마만 반환. 슬라이드 개수와 순서는 유지하세요.
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
        // 리뷰어 실패는 치명적이지 않음 — 전 단계 deck 반환
        console.warn('[pptx-agent] reviewer 실패, 이전 deck 사용:', r.status);
        return deck;
    }
    const raw = r.data.choices?.[0]?.message?.content || '{}';
    try { return parseAiJson(raw); } catch (e) { return deck; }
}

// 공개 API: 전체 파이프라인 실행
// ctx: { content, title, audience, length, tone, sources, footer }
// callGroq: async (body) => { ok, status, data }
async function generateDeck(ctx, callGroq) {
    if (!callGroq || typeof callGroq !== 'function') {
        throw new Error('callGroq 함수가 필요합니다 (DI)');
    }
    const sourcesBlock = buildSourcesBlock(ctx.sources, 18000);
    const enrichedCtx = { ...ctx, sourcesBlock };

    // Stage 1: 전략
    const outline = await stageStrategy(enrichedCtx, callGroq);

    // Stage 2: 작성
    let deck = await stageWriter(enrichedCtx, outline, callGroq);

    // deck 기본값 보정
    deck.title = deck.title || outline.title || ctx.title || 'AI 프레젠테이션';
    deck.subtitle = deck.subtitle || outline.subtitle || ctx.audience || '';
    deck.footer = ctx.footer || '';

    // Stage 3: 검수 (길이에 따라 스킵)
    if (getLengthSpec(ctx.length).reviewer) {
        deck = await stageReviewer(enrichedCtx, deck, callGroq);
        // 검수 결과에서 제목이 지워질 수 있으므로 복구
        deck.title = deck.title || outline.title || ctx.title || 'AI 프레젠테이션';
        deck.footer = ctx.footer || '';
    }

    // 슬라이드 최소 보장
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

module.exports = {
    generateDeck,
    stageStrategy,
    stageWriter,
    stageReviewer,
    buildSourcesBlock,
    parseAiJson,
    LENGTH_SPEC,
    TONE_SPEC,
};
