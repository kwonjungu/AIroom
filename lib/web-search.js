// 웹검색 어댑터 (PPTX 생성 시 최신 정보 보강용)
// 기본: Tavily API (무료 1000회/월, TAVILY_API_KEY 필요)
//   https://tavily.com/ 에서 키 발급 → Vercel 환경변수 TAVILY_API_KEY 설정
// 키가 없으면 빈 결과 반환 (파이프라인은 계속 진행).

async function searchWeb(query, opts = {}) {
    const apiKey = process.env.TAVILY_API_KEY;
    const max = Math.min(opts.maxResults || 5, 10);

    if (!apiKey) {
        return {
            ok: false,
            reason: 'no_key',
            message: 'TAVILY_API_KEY 미설정 — 웹검색 생략됨',
            results: [],
            answer: '',
        };
    }
    try {
        const resp = await fetch('https://api.tavily.com/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                api_key: apiKey,
                query,
                search_depth: opts.deep ? 'advanced' : 'basic',
                include_answer: true,
                include_raw_content: false,
                max_results: max,
            }),
        });
        if (!resp.ok) {
            const errText = await resp.text().catch(() => '');
            return { ok: false, reason: 'upstream_error', message: `${resp.status} ${errText}`, results: [], answer: '' };
        }
        const data = await resp.json();
        return {
            ok: true,
            query,
            answer: data.answer || '',
            results: (data.results || []).slice(0, max).map(r => ({
                title: r.title || '',
                url: r.url || '',
                content: r.content || '',
                score: r.score || 0,
            })),
        };
    } catch (e) {
        return { ok: false, reason: 'fetch_error', message: e.message, results: [], answer: '' };
    }
}

// 검색 결과를 PPTX 파이프라인의 "source" 형태로 포맷
//   [{name, text}] — buildSourcesBlock 이 그대로 먹을 수 있음
function webSearchToSources(result) {
    if (!result || !result.ok || result.results.length === 0) return [];
    const header = result.answer
        ? `[AI 요약] ${result.answer}\n\n`
        : '';
    const body = result.results.map((r, i) =>
        `[${i + 1}] ${r.title}\n   ${r.content}\n   (출처: ${r.url})`
    ).join('\n\n');
    return [{
        name: `웹검색: "${result.query}"`,
        text: header + body,
    }];
}

module.exports = { searchWeb, webSearchToSources };
