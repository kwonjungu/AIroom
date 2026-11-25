'use strict';
// 녹음 조각 → Groq whisper-large-v3. 소리는 메모리에서 바로 보내고 버린다(저장하지 않음).
// 키는 server.js 의 getGroqApiKeys() 를 그대로 받아 순회한다(401·403·429 면 다음 키).
const MODEL = 'whisper-large-v3';
const EXT = { 'audio/webm': 'webm', 'audio/ogg': 'ogg', 'audio/mp4': 'm4a', 'audio/mpeg': 'mp3', 'audio/wav': 'wav', 'audio/x-wav': 'wav' };

// Groq 무료 한도(whisper-large-v3, 키 하나): 분당 20회 · 하루 2,000회 · 시간당 소리 7,200초 · 하루 28,800초.
// 1분 조각이면 1시간 회의 = 60회·3,600초 → 키 하나로 동시 회의 2개까지. 429 면 다음 키, 모두 429 면 가장 짧은 retry-after 를 돌려준다.
// budgetMs: 키를 여러 개 돌아도 이 시간 안에 끝낸다(Vercel 함수 시간 상한 안, 지적07). 키 하나는 min(45초, 남은 시간).
const parseRetryAfter = v => {
    if (v == null || v === '') return null;
    const n = Number(v);
    if (Number.isFinite(n)) return Math.max(0, n);
    const t = Date.parse(v);
    return Number.isFinite(t) ? Math.max(0, Math.ceil((t - Date.now()) / 1000)) : null;
};

function createWhisper({ getKeys, fetchImpl = fetch, budgetMs = 50000 }) {
    return {
        async transcribe({ buffer, mime, language = 'ko' }) {
            const keys = getKeys();
            if (!keys.length) return { ok: false, status: 503, error: 'Groq API 키가 없습니다.' };
            const type = String(mime).split(';')[0];
            const deadline = Date.now() + budgetMs;
            let last = { ok: false, status: 502, error: '받아쓰기 실패' };
            let retryAfter = null, all429 = true;
            for (const key of keys) {
                const left = deadline - Date.now();
                if (left <= 0) { last = { ok: false, status: 504, error: '받아쓰기 시간 상한' }; all429 = false; break; }
                const form = new FormData();
                form.append('file', new Blob([buffer], { type }), `chunk.${EXT[type] || 'webm'}`);
                form.append('model', MODEL);
                form.append('language', language);
                form.append('response_format', 'json');
                form.append('temperature', '0');
                const ac = new AbortController();
                const timer = setTimeout(() => ac.abort(new Error('timeout')), Math.max(1, Math.min(45000, left)));
                try {
                    const r = await fetchImpl('https://api.groq.com/openai/v1/audio/transcriptions', { method: 'POST', headers: { Authorization: 'Bearer ' + key }, body: form, signal: ac.signal });
                    const j = await r.json().catch(() => ({}));
                    if (r.ok) return { ok: true, text: String(j.text || '').trim() };
                    last = { ok: false, status: r.status, error: j?.error?.message || ('Groq ' + r.status) };
                    if (r.status === 429) {
                        const ra = parseRetryAfter(r.headers?.get?.('retry-after'));
                        if (ra != null) retryAfter = retryAfter == null ? ra : Math.min(retryAfter, ra);
                    } else all429 = false;
                    if (![401, 403, 429].includes(r.status)) return last;
                } catch (e) { last = { ok: false, status: 502, error: e.message }; all429 = false; }
                finally { clearTimeout(timer); }
            }
            if (all429 && last.status === 429) return { ...last, status: 429, ...(retryAfter != null ? { retryAfter } : {}) };
            return last;
        }
    };
}

module.exports = { createWhisper, MODEL, AUDIO_TYPES: Object.keys(EXT) };
