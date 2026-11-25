'use strict';
// 녹음 조각 → Groq whisper-large-v3. 소리는 메모리에서 바로 보내고 버린다(저장하지 않음).
// 키는 server.js 의 getGroqApiKeys() 를 그대로 받아 순회한다(401·403·429 면 다음 키).
const MODEL = 'whisper-large-v3';
const EXT = { 'audio/webm': 'webm', 'audio/ogg': 'ogg', 'audio/mp4': 'm4a', 'audio/mpeg': 'mp3', 'audio/wav': 'wav', 'audio/x-wav': 'wav' };

function createWhisper({ getKeys, fetchImpl = fetch }) {
    return {
        async transcribe({ buffer, mime, language = 'ko' }) {
            const keys = getKeys();
            if (!keys.length) return { ok: false, status: 503, error: 'Groq API 키가 없습니다.' };
            const type = String(mime).split(';')[0];
            let last = { ok: false, status: 502, error: '받아쓰기 실패' };
            for (const key of keys) {
                const form = new FormData();
                form.append('file', new Blob([buffer], { type }), `chunk.${EXT[type] || 'webm'}`);
                form.append('model', MODEL);
                form.append('language', language);
                form.append('response_format', 'json');
                form.append('temperature', '0');
                try {
                    const r = await fetchImpl('https://api.groq.com/openai/v1/audio/transcriptions', { method: 'POST', headers: { Authorization: 'Bearer ' + key }, body: form, signal: AbortSignal.timeout(45000) });
                    const j = await r.json().catch(() => ({}));
                    if (r.ok) return { ok: true, text: String(j.text || '').trim() };
                    last = { ok: false, status: r.status, error: j?.error?.message || ('Groq ' + r.status) };
                    if (![401, 403, 429].includes(r.status)) return last;
                } catch (e) { last = { ok: false, status: 502, error: e.message }; }
            }
            return last;
        }
    };
}

module.exports = { createWhisper, MODEL, AUDIO_TYPES: Object.keys(EXT) };
