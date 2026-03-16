const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const IS_VERCEL = !!process.env.VERCEL;
const LOCAL_DATA_DIR = path.join(__dirname, 'data');
const UPLOAD_DIR = path.join(__dirname, 'data', 'uploads');
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

// ===== 파일 업로드/다운로드 (자료 집계용) =====
// Redis가 있으면 KV에 base64로 영구 저장, 없으면 로컬 디스크에 저장
const ACTUAL_UPLOAD_DIR = IS_VERCEL ? '/tmp/uploads' : UPLOAD_DIR;

// KV 기반 파일 저장/읽기
async function saveFileToKV(fileId, fileName, base64Data, fileSize) {
    if (!redis) return false;
    try {
        await redis.set('file:' + fileId, JSON.stringify({ fileName, data: base64Data, size: fileSize }));
        return true;
    } catch (e) { console.error('KV 파일 저장 실패:', e.message); return false; }
}

async function getFileFromKV(fileId) {
    if (!redis) return null;
    try {
        const raw = await redis.get('file:' + fileId);
        if (!raw) return null;
        return typeof raw === 'string' ? JSON.parse(raw) : raw;
    } catch (e) { return null; }
}

// 업로드 API (JSON base64 방식 — Vercel + 로컬 모두 호환)
app.post('/api/upload', express.json({ limit: '10mb' }), async (req, res) => {
    try {
        const { fileName, fileData } = req.body;
        if (!fileName || !fileData) return res.status(400).json({ error: '파일 데이터 없음' });
        const unique = Date.now() + '_' + Math.random().toString(36).slice(2, 8);
        const fileId = unique + '_' + fileName;
        const base64Data = fileData.replace(/^data:[^;]+;base64,/, '');
        const buf = Buffer.from(base64Data, 'base64');
        const fileSize = buf.length;

        // Redis(KV)에 영구 저장 시도
        const savedToKV = await saveFileToKV(fileId, fileName, base64Data, fileSize);

        // 로컬 디스크에도 저장 (로컬 개발 or KV 실패 시 폴백용)
        if (!savedToKV || !IS_VERCEL) {
            try {
                if (!fs.existsSync(ACTUAL_UPLOAD_DIR)) fs.mkdirSync(ACTUAL_UPLOAD_DIR, { recursive: true });
                fs.writeFileSync(path.join(ACTUAL_UPLOAD_DIR, fileId), buf);
            } catch (e) {
                if (!savedToKV) return res.status(500).json({ error: '파일 저장 실패' });
            }
        }

        res.json({
            success: true,
            fileId,
            fileName,
            fileSize,
            downloadUrl: '/api/download/' + encodeURIComponent(fileId)
        });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// 다운로드 API (KV 우선 → 디스크 폴백)
app.get('/api/download/:fileId', async (req, res) => {
    const fileId = decodeURIComponent(req.params.fileId);
    if (fileId.includes('..') || fileId.includes('/')) return res.status(400).json({ error: '잘못된 파일 ID' });

    // 1. KV에서 조회
    const kvFile = await getFileFromKV(fileId);
    if (kvFile) {
        const buf = Buffer.from(kvFile.data, 'base64');
        const name = kvFile.fileName || fileId;
        res.setHeader('Content-Disposition', 'attachment; filename="' + encodeURIComponent(name) + '"');
        res.setHeader('Content-Type', 'application/octet-stream');
        res.setHeader('Content-Length', buf.length);
        return res.end(buf);
    }

    // 2. 디스크에서 조회 (로컬 폴백)
    const filePath = path.join(ACTUAL_UPLOAD_DIR, fileId);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: '파일 없음' });
    const parts = fileId.split('_');
    const originalName = parts.length > 2 ? parts.slice(2).join('_') : fileId;
    res.download(filePath, originalName);
});

// 메인 페이지
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Vercel용 내보내기 (중요: app.listen이 없어야 함)
module.exports = app;
