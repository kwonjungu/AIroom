const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const IS_VERCEL = !!process.env.VERCEL;
const LOCAL_DATA_DIR = path.join(__dirname, 'data');
// Upstash 직접 or Vercel 마켓플레이스(KV_REST_API_*) 둘 다 지원
const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
const HAS_REDIS = !!(REDIS_URL && REDIS_TOKEN);

app.use(express.json({ limit: '10mb' }));
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
    'collections.json': 'collections'
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
async function readData(filename) {
    const key = KV_KEYS[filename];
    // Upstash Redis 연결 시: Redis에서 읽기
    if (redis && key) {
        try {
            const data = await redis.get(key);
            if (data !== null && data !== undefined) return data;
            // Redis 비어있으면 defaults에서 초기 데이터 로드 후 Redis에 저장
            const defaults = readFile(filename);
            if (defaults) { await redis.set(key, JSON.stringify(defaults)); return defaults; }
            return null;
        } catch (e) {
            console.error('Redis 읽기 실패:', e.message);
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
            await redis.set(key, JSON.stringify(data));
        } catch (e) {
            console.error('Redis 쓰기 실패:', e.message);
            // Vercel에서 Redis 실패 시 에러 전파
            if (IS_VERCEL) throw new Error('Redis 쓰기 실패: ' + e.message);
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
    { path: 'collections', file: 'collections.json', fallback: [] }
];

DATA_ROUTES.forEach(({ path: p, file, fallback }) => {
    app.get(`/api/${p}`, async (req, res) => {
        try { res.json(await readData(file) || fallback); }
        catch (e) { res.json(fallback); }
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
        const [links, categories, sections, trainings, staff, trainingRecords, schedules, tabs, settings, news, collections] = await Promise.all([
            readData('links.json'), readData('categories.json'), readData('sections.json'),
            readData('trainings.json'), readData('staff.json'), readData('training-records.json'),
            readData('schedules.json'), readData('tabs.json'), readData('settings.json'), readData('news.json'),
            readData('collections.json')
        ]);
        res.json({ links, categories, sections, trainings, staff, trainingRecords, schedules, tabs, settings, news, collections, exportedAt: new Date().toISOString() });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Import (전체 데이터 가져오기)
app.post('/api/import', async (req, res) => {
    try {
        const { links, categories, sections, trainings, staff, trainingRecords, schedules, tabs, settings, news, collections } = req.body;
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

// 메인 페이지
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Vercel용 내보내기 (중요: app.listen이 없어야 함)
module.exports = app;
