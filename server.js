const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const IS_VERCEL = !!process.env.VERCEL;
const LOCAL_DATA_DIR = path.join(__dirname, 'data');
const HAS_KV = !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);

app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ===== Vercel KV (Redis) =====
let kv = null;
if (HAS_KV) {
    try { kv = require('@vercel/kv').kv; } catch (e) { console.warn('KV 로드 실패:', e.message); }
}

// KV 키 이름 (파일명 → KV 키)
const KV_KEYS = {
    'links.json': 'links',
    'categories.json': 'categories',
    'trainings.json': 'trainings',
    'staff.json': 'staff',
    'training-records.json': 'training-records',
    'sections.json': 'sections'
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
    // Vercel + KV 연결 시: KV에서 읽기
    if (kv && key) {
        try {
            const data = await kv.get(key);
            if (data !== null && data !== undefined) return data;
            // KV 비어있으면 defaults에서 초기 데이터 로드 후 KV에 저장
            const defaults = readFile(filename);
            if (defaults) { await kv.set(key, defaults); return defaults; }
            return null;
        } catch (e) {
            console.error('KV 읽기 실패:', e.message);
            return readFile(filename);
        }
    }
    // 로컬: 파일에서 읽기
    return readFile(filename);
}

async function writeData(filename, data) {
    const key = KV_KEYS[filename];
    // Vercel + KV 연결 시: KV에 저장
    if (kv && key) {
        try { await kv.set(key, data); } catch (e) { console.error('KV 쓰기 실패:', e.message); }
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
    { path: 'sections', file: 'sections.json', fallback: [] }
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
        const [links, categories, sections, trainings, staff, trainingRecords] = await Promise.all([
            readData('links.json'), readData('categories.json'), readData('sections.json'),
            readData('trainings.json'), readData('staff.json'), readData('training-records.json')
        ]);
        res.json({ links, categories, sections, trainings, staff, trainingRecords, exportedAt: new Date().toISOString() });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Import (전체 데이터 가져오기)
app.post('/api/import', async (req, res) => {
    try {
        const { links, categories, sections, trainings, staff, trainingRecords } = req.body;
        const writes = [];
        if (links) writes.push(writeData('links.json', links));
        if (categories) writes.push(writeData('categories.json', categories));
        if (sections) writes.push(writeData('sections.json', sections));
        if (trainings) writes.push(writeData('trainings.json', trainings));
        if (staff) writes.push(writeData('staff.json', staff));
        if (trainingRecords) writes.push(writeData('training-records.json', trainingRecords));
        await Promise.all(writes);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// 메인 페이지
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Vercel용 내보내기 (중요: app.listen이 없어야 함)
module.exports = app;
