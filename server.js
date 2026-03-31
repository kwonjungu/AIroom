const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const IS_VERCEL = !!process.env.VERCEL;
const LOCAL_DATA_DIR = path.join(__dirname, 'data');
// Upstash 직접 or Vercel 마켓플레이스(KV_REST_API_*) 둘 다 지원
// .env 파일 로드 (있으면)
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
    fs.readFileSync(envPath, 'utf-8').split('\n').forEach(line => {
        const m = line.match(/^([^#=]+)=(.*)$/);
        if (m && !process.env[m[1].trim()]) process.env[m[1].trim()] = m[2].trim();
    });
}

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
const HAS_REDIS = !!(REDIS_URL && REDIS_TOKEN);

app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ===== Upstash Redis =====
let redis = null;
if (HAS_REDIS) {
    try {
        const { Redis } = require('@upstash/redis');
        redis = new Redis({ url: REDIS_URL, token: REDIS_TOKEN });
    } catch (e) { console.warn('Redis 로드 실패:', e.message); }
}

// KV 키 이름 (파일명 → KV 키)
const KV_KEYS = {
    'links.json': 'links',
    'categories.json': 'categories',
    'trainings.json': 'trainings',
    'staff.json': 'staff',
    'training-records.json': 'training-records',
    'sections.json': 'sections',
    'schedules.json': 'schedules',
    'tabs.json': 'tabs',
    'settings.json': 'settings',
    'news.json': 'news',
    'collections.json': 'collections',
    'esign-docs.json': 'esign-docs',
    'tdist-docs.json': 'tdist-docs'
};

// ===== 파일 기반 읽기/쓰기 (로컬 개발용) =====
function readFile(filename) {
    try {
        const dataPath = path.join(LOCAL_DATA_DIR, filename);
        if (fs.existsSync(dataPath)) return JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
        const defaultPath = path.join(__dirname, 'defaults', filename);
        if (fs.existsSync(defaultPath)) return JSON.parse(fs.readFileSync(defaultPath, 'utf-8'));
        return null;
    } catch (e) { return null; }
}

function writeFile(filename, data) {
    try {
        if (!fs.existsSync(LOCAL_DATA_DIR)) fs.mkdirSync(LOCAL_DATA_DIR, { recursive: true });
        fs.writeFileSync(path.join(LOCAL_DATA_DIR, filename), JSON.stringify(data, null, 2), 'utf-8');
    } catch (e) { console.error('파일 쓰기 실패:', e.message); }
}

// ===== 통합 읽기/쓰기 (KV 우선 → 파일 폴백) =====
async function redisRetry(fn, retries = 2) {
    for (let i = 0; i <= retries; i++) {
        try { return await fn(); }
        catch (e) {
            console.error(`Redis 시도 ${i+1}/${retries+1} 실패:`, e.message);
            if (i === retries) throw e;
            await new Promise(r => setTimeout(r, 500 * (i + 1)));
        }
    }
}

async function readData(filename) {
    const key = KV_KEYS[filename];
    // Upstash Redis 연결 시: Redis에서 읽기
    if (redis && key) {
        try {
            const data = await redisRetry(() => redis.get(key));
            if (data !== null && data !== undefined) return data;
            // Redis 비어있으면 defaults에서 초기 데이터 로드 후 Redis에 저장
            const defaults = readFile(filename);
            if (defaults) { await redis.set(key, JSON.stringify(defaults)); return defaults; }
            return null;
        } catch (e) {
            console.error('Redis 읽기 최종 실패 ('+key+'):', e.message);
            return readFile(filename);
        }
    }
    // 로컬: 파일에서 읽기
    return readFile(filename);
}

async function writeData(filename, data) {
    const key = KV_KEYS[filename];
    // Upstash Redis 연결 시: Redis에 저장
    if (redis && key) {
        try {
            await redisRetry(() => redis.set(key, JSON.stringify(data)));
        } catch (e) {
            console.error('Redis 쓰기 최종 실패 ('+key+'):', e.message);
            // Vercel에서 Redis 실패 시 에러 전파
            if (IS_VERCEL) throw new Error('데이터 저장 실패 - 잠시 후 다시 시도해주세요');
        }
    }
    // 로컬이면 파일에도 저장
    if (!IS_VERCEL) writeFile(filename, data);
}

// ===== API 라우트 =====
// 각 데이터 타입: GET(읽기), POST(전체 저장)
const DATA_ROUTES = [
    { path: 'links', file: 'links.json', fallback: [] },
    { path: 'categories', file: 'categories.json', fallback: [] },
    { path: 'trainings', file: 'trainings.json', fallback: [] },
    { path: 'staff', file: 'staff.json', fallback: [] },
    { path: 'training-records', file: 'training-records.json', fallback: {} },
    { path: 'sections', file: 'sections.json', fallback: [] },
    { path: 'schedules', file: 'schedules.json', fallback: [] },
    { path: 'tabs', file: 'tabs.json', fallback: [] },
    { path: 'settings', file: 'settings.json', fallback: {} },
    { path: 'news', file: 'news.json', fallback: [] },
    { path: 'collections', file: 'collections.json', fallback: [] },
    { path: 'esign-docs', file: 'esign-docs.json', fallback: [] },
    { path: 'tdist-docs', file: 'tdist-docs.json', fallback: [] }
];

DATA_ROUTES.forEach(({ path: p, file, fallback }) => {
    app.get(`/api/${p}`, async (req, res) => {
        try {
            const data = await readData(file);
            res.json(data !== null && data !== undefined ? data : fallback);
        }
        catch (e) {
            console.error('GET /api/'+p+' 실패:', e.message);
            res.status(500).json({ error: '데이터 로딩 실패', _fallback: true });
        }
    });
    app.post(`/api/${p}`, async (req, res) => {
        try { await writeData(file, req.body); res.json({ success: true }); }
        catch (e) { res.status(500).json({ error: e.message }); }
    });
});

// Training record PATCH (개별 교직원 기록 수정)
app.patch('/api/training-records/:trainingId/:staffId', async (req, res) => {
    try {
        const records = await readData('training-records.json') || {};
        const { trainingId, staffId } = req.params;
        if (!records[trainingId]) records[trainingId] = {};
        records[trainingId][staffId] = req.body;
        await writeData('training-records.json', records);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Export (전체 데이터 내보내기)
app.get('/api/export', async (req, res) => {
    try {
        const [links, categories, sections, trainings, staff, trainingRecords, schedules, tabs, settings, news, collections, esignDocs, tdistDocs] = await Promise.all([
            readData('links.json'), readData('categories.json'), readData('sections.json'),
            readData('trainings.json'), readData('staff.json'), readData('training-records.json'),
            readData('schedules.json'), readData('tabs.json'), readData('settings.json'), readData('news.json'),
            readData('collections.json'), readData('esign-docs.json'), readData('tdist-docs.json')
        ]);
        res.json({ links, categories, sections, trainings, staff, trainingRecords, schedules, tabs, settings, news, collections, esignDocs, tdistDocs, exportedAt: new Date().toISOString() });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Import (전체 데이터 가져오기)
app.post('/api/import', async (req, res) => {
    try {
        const { links, categories, sections, trainings, staff, trainingRecords, schedules, tabs, settings, news, collections, esignDocs, tdistDocs } = req.body;
        const writes = [];
        if (links) writes.push(writeData('links.json', links));
        if (categories) writes.push(writeData('categories.json', categories));
        if (sections) writes.push(writeData('sections.json', sections));
        if (trainings) writes.push(writeData('trainings.json', trainings));
        if (staff) writes.push(writeData('staff.json', staff));
        if (trainingRecords) writes.push(writeData('training-records.json', trainingRecords));
        if (schedules) writes.push(writeData('schedules.json', schedules));
        if (tabs) writes.push(writeData('tabs.json', tabs));
        if (settings) writes.push(writeData('settings.json', settings));
        if (news) writes.push(writeData('news.json', news));
        if (collections) writes.push(writeData('collections.json', collections));
        if (esignDocs) writes.push(writeData('esign-docs.json', esignDocs));
        if (tdistDocs) writes.push(writeData('tdist-docs.json', tdistDocs));
        await Promise.all(writes);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Health check
app.get('/api/health', async (req, res) => {
    const status = { server: true, redis: false, timestamp: new Date().toISOString() };
    if (redis) {
        try { await redis.ping(); status.redis = true; } catch (e) { status.redis = false; }
    }
    res.json(status);
});

// Firebase config (환경변수에서 클라이언트로 전달)
app.get('/api/firebase-config', (req, res) => {
    const cfg = {
        apiKey: process.env.FIREBASE_API_KEY,
        authDomain: process.env.FIREBASE_AUTH_DOMAIN,
        projectId: process.env.FIREBASE_PROJECT_ID,
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.FIREBASE_APP_ID
    };
    if (!cfg.apiKey) return res.json({});
    res.json(cfg);
});

// ===== Firebase Storage 다운로드 프록시 (CORS 우회) =====
const https = require('https');
app.get('/api/proxy-download', (req, res) => {
    const url = req.query.url;
    console.log('[proxy] 요청 URL:', url);
    if (!url) return res.status(400).json({ error: 'url 파라미터 필요' });
    // Firebase Storage URL만 허용
    if (!url.includes('firebasestorage.googleapis.com') && !url.includes('storage.googleapis.com')) {
        return res.status(403).json({ error: '허용되지 않는 URL' });
    }
    https.get(url, (proxyRes) => {
        console.log('[proxy] 응답 상태:', proxyRes.statusCode);
        if (proxyRes.statusCode !== 200) {
            return res.status(proxyRes.statusCode).json({ error: '원본 다운로드 실패: ' + proxyRes.statusCode });
        }
        res.setHeader('Content-Type', proxyRes.headers['content-type'] || 'application/octet-stream');
        if (proxyRes.headers['content-length']) res.setHeader('Content-Length', proxyRes.headers['content-length']);
        proxyRes.pipe(res);
    }).on('error', (e) => {
        console.error('[proxy] 에러:', e.message);
        res.status(500).json({ error: e.message });
    });
});

// ===== 전자서명 공개 서명 페이지 =====
// 문서 데이터 조회 (토큰 기반)
app.get('/api/esign-public/:token', async (req, res) => {
    try {
        const docs = await readData('esign-docs.json') || [];
        const doc = docs.find(d => d.token === req.params.token);
        if (!doc) return res.status(404).json({ error: '문서를 찾을 수 없습니다.' });
        if (doc.status === 'closed') return res.status(410).json({ error: '마감된 문서입니다.' });
        if (doc.deadline && new Date(doc.deadline + 'T23:59:59') < new Date()) return res.status(410).json({ error: '마감 기한이 지났습니다.' });
        // 제출 데이터는 제외하고 문서 구조만 반환
        const { submissions, password, ...publicDoc } = doc;
        res.json(publicDoc);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// 학부모 서명 제출
app.post('/api/esign-public/:token/submit', async (req, res) => {
    try {
        const docs = await readData('esign-docs.json') || [];
        const doc = docs.find(d => d.token === req.params.token);
        if (!doc) return res.status(404).json({ error: '문서를 찾을 수 없습니다.' });
        if (doc.status === 'closed') return res.status(410).json({ error: '마감된 문서입니다.' });
        if (doc.deadline && new Date(doc.deadline + 'T23:59:59') < new Date()) return res.status(410).json({ error: '마감 기한이 지났습니다.' });
        if (!doc.submissions) doc.submissions = [];
        const sub = {
            id: 'sub_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
            ...req.body,
            submittedAt: new Date().toISOString()
        };
        doc.submissions.push(sub);
        await writeData('esign-docs.json', docs);
        res.json({ success: true, message: '제출 완료' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// 공개 서명 페이지 HTML 서빙
app.get('/sign/:token', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'sign.html'));
});

// ===== 교사 배포 문서 공개 API =====
// 문서 데이터 조회 (토큰 기반 - PDF + 필드 구조)
app.get('/api/tdist-public/:token', async (req, res) => {
    try {
        const docs = await readData('tdist-docs.json') || [];
        const doc = docs.find(d => d.token === req.params.token);
        if (!doc) return res.status(404).json({ error: '문서를 찾을 수 없습니다.' });
        if (doc.status === 'closed') return res.status(410).json({ error: '마감된 문서입니다.' });
        if (doc.deadline && new Date(doc.deadline + 'T23:59:59') < new Date()) return res.status(410).json({ error: '마감 기한이 지났습니다.' });
        // 제출 데이터, 비밀번호 제외하고 반환
        const { submissions, password, ...publicDoc } = doc;
        res.json(publicDoc);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// 학부모 문서 제출 (JSON body max 10mb - 서명 이미지 포함)
app.post('/api/tdist-public/:token/submit', async (req, res) => {
    try {
        const docs = await readData('tdist-docs.json') || [];
        const doc = docs.find(d => d.token === req.params.token);
        if (!doc) return res.status(404).json({ error: '문서를 찾을 수 없습니다.' });
        if (doc.status === 'closed') return res.status(410).json({ error: '마감된 문서입니다.' });
        if (doc.deadline && new Date(doc.deadline + 'T23:59:59') < new Date()) return res.status(410).json({ error: '마감 기한이 지났습니다.' });
        if (!doc.submissions) doc.submissions = [];
        const sub = {
            id: 'sub_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
            ...req.body,
            submittedAt: new Date().toISOString()
        };
        doc.submissions.push(sub);
        await writeData('tdist-docs.json', docs);
        res.json({ success: true, message: '제출 완료' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// 비밀번호 검증 후 제출 목록 조회
app.post('/api/tdist-subs/:docId', async (req, res) => {
    try {
        const docs = await readData('tdist-docs.json') || [];
        const doc = docs.find(d => d.id === req.params.docId);
        if (!doc) return res.status(404).json({ error: '문서를 찾을 수 없습니다.' });
        if (doc.password && doc.password !== req.body.password) {
            return res.status(403).json({ error: '비밀번호가 올바르지 않습니다.' });
        }
        res.json({ submissions: doc.submissions || [], fields: doc.fields || [], title: doc.title, pdfData: doc.pdfData || null, pdfPages: doc.pdfPages || [] });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// 교사 배포 공개 페이지 HTML 서빙
app.get('/doc/:token', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'doc.html'));
});

// ===== AI 프록시 (Groq API) =====
// 환경변수에 키가 있으면 서버 키 우선 사용, 없으면 클라이언트 키 사용
app.get('/api/ai/status', (req, res) => {
    res.json({ hasServerKey: !!process.env.GROQ_API_KEY });
});

app.post('/api/ai/chat', async (req, res) => {
    const apiKey = process.env.GROQ_API_KEY || req.headers['x-ai-key'];
    if (!apiKey) return res.status(400).json({ error: 'API 키가 필요합니다.' });
    try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
            body: JSON.stringify(req.body)
        });
        const data = await response.json();
        if (!response.ok) return res.status(response.status).json(data);
        res.json(data);
    } catch (e) {
        res.status(500).json({ error: 'AI API 호출 실패: ' + e.message });
    }
});

// ===== 가정통신문 번역 API (Groq) =====
app.post('/api/translate', async (req, res) => {
    const apiKey = process.env.GROQ_API_KEY || req.headers['x-ai-key'];
    if (!apiKey) return res.status(400).json({ error: 'API 키가 설정되지 않았습니다.' });
    const { blocks, targetLang } = req.body;
    if (!blocks || !blocks.length || !targetLang) return res.status(400).json({ error: 'blocks와 targetLang이 필요합니다.' });

    const langNames = { en:'English', zh:'Chinese (Simplified)', vi:'Vietnamese', km:'Khmer (Cambodian)', ja:'Japanese', ru:'Russian' };
    const langName = langNames[targetLang] || targetLang;

    // 블록 텍스트를 번호 매겨서 하나의 프롬프트로 보냄
    const numbered = blocks.map((b, i) => `[${i}] ${b.text}`).join('\n');
    const systemPrompt = `You are a professional translator for school newsletters (가정통신문). Translate the following numbered text blocks from Korean to ${langName}. Return ONLY the translations in the same numbered format [0], [1], etc. Keep the exact same numbering. Do not add any explanation. Preserve line breaks within each block. If a block contains only numbers, dates, or proper nouns that don't need translation, return them as-is.`;

    try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
            body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: numbered }
                ],
                temperature: 0.2,
                max_tokens: 4096
            })
        });
        const data = await response.json();
        if (!response.ok) return res.status(response.status).json(data);

        const content = data.choices?.[0]?.message?.content || '';
        // 번호별로 파싱
        const translations = {};
        const lines = content.split('\n');
        let currentIdx = -1;
        let currentText = '';
        for (const line of lines) {
            const m = line.match(/^\[(\d+)\]\s*(.*)/);
            if (m) {
                if (currentIdx >= 0) translations[currentIdx] = currentText.trim();
                currentIdx = parseInt(m[1]);
                currentText = m[2];
            } else if (currentIdx >= 0) {
                currentText += '\n' + line;
            }
        }
        if (currentIdx >= 0) translations[currentIdx] = currentText.trim();

        const result = blocks.map((b, i) => ({
            ...b,
            translated: translations[i] || b.text
        }));
        res.json({ translations: result });
    } catch (e) {
        res.status(500).json({ error: '번역 API 호출 실패: ' + e.message });
    }
});

// 메인 페이지
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// 로컬 개발용: app.listen
if (!IS_VERCEL) {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`서버 실행 중: http://localhost:${PORT}`);
        console.log(`Redis 연결: ${HAS_REDIS ? '활성' : '비활성 (파일 모드)'}`);
    });
}

// Vercel용 내보내기
module.exports = app;
