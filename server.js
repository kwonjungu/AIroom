const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const IS_VERCEL = !!process.env.VERCEL;
const LOCAL_DATA_DIR = path.join(__dirname, 'data');
const TMP_DIR = '/tmp';

app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// 안전하게 JSON 읽기: Vercel=/tmp→data→defaults, 로컬=data→defaults
function readJSON(filename) {
    try {
        if (IS_VERCEL) {
            const tmpPath = path.join(TMP_DIR, filename);
            if (fs.existsSync(tmpPath)) return JSON.parse(fs.readFileSync(tmpPath, 'utf-8'));
        }
        const dataPath = path.join(LOCAL_DATA_DIR, filename);
        if (fs.existsSync(dataPath)) return JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
        const defaultPath = path.join(__dirname, 'defaults', filename);
        if (fs.existsSync(defaultPath)) return JSON.parse(fs.readFileSync(defaultPath, 'utf-8'));
        return null;
    } catch (e) { return null; }
}

// 안전하게 JSON 쓰기: 로컬=data/, Vercel=/tmp
function writeJSON(filename, data) {
    const json = JSON.stringify(data, null, 2);
    if (IS_VERCEL) {
        try { fs.writeFileSync(path.join(TMP_DIR, filename), json, 'utf-8'); } catch (e) { console.error('쓰기 실패:', e.message); }
    } else {
        try {
            if (!fs.existsSync(LOCAL_DATA_DIR)) fs.mkdirSync(LOCAL_DATA_DIR, { recursive: true });
            fs.writeFileSync(path.join(LOCAL_DATA_DIR, filename), json, 'utf-8');
        } catch (e) { console.error('쓰기 실패:', e.message); }
    }
}

// API 라우트들
app.get('/api/links', (req, res) => res.json(readJSON('links.json') || []));
app.post('/api/links', (req, res) => { writeJSON('links.json', req.body); res.json({ success: true }); });

app.get('/api/categories', (req, res) => res.json(readJSON('categories.json') || []));
app.post('/api/categories', (req, res) => { writeJSON('categories.json', req.body); res.json({ success: true }); });

app.get('/api/trainings', (req, res) => res.json(readJSON('trainings.json') || []));
app.post('/api/trainings', (req, res) => { writeJSON('trainings.json', req.body); res.json({ success: true }); });

app.get('/api/staff', (req, res) => res.json(readJSON('staff.json') || []));
app.post('/api/staff', (req, res) => { writeJSON('staff.json', req.body); res.json({ success: true }); });

app.get('/api/training-records', (req, res) => res.json(readJSON('training-records.json') || {}));
app.post('/api/training-records', (req, res) => { writeJSON('training-records.json', req.body); res.json({ success: true }); });

app.get('/api/sections', (req, res) => res.json(readJSON('sections.json') || []));
app.post('/api/sections', (req, res) => { writeJSON('sections.json', req.body); res.json({ success: true }); });

// Training record patch
app.patch('/api/training-records/:trainingId/:staffId', (req, res) => {
    const records = readJSON('training-records.json') || {};
    const { trainingId, staffId } = req.params;
    if (!records[trainingId]) records[trainingId] = {};
    records[trainingId][staffId] = req.body;
    writeJSON('training-records.json', records);
    res.json({ success: true });
});

// Export
app.get('/api/export', (req, res) => {
    res.json({
        links: readJSON('links.json'),
        categories: readJSON('categories.json'),
        sections: readJSON('sections.json'),
        trainings: readJSON('trainings.json'),
        staff: readJSON('staff.json'),
        trainingRecords: readJSON('training-records.json'),
        exportedAt: new Date().toISOString()
    });
});

// Import
app.post('/api/import', (req, res) => {
    const { links, categories, sections, trainings, staff, trainingRecords } = req.body;
    if (links) writeJSON('links.json', links);
    if (categories) writeJSON('categories.json', categories);
    if (sections) writeJSON('sections.json', sections);
    if (trainings) writeJSON('trainings.json', trainings);
    if (staff) writeJSON('staff.json', staff);
    if (trainingRecords) writeJSON('training-records.json', trainingRecords);
    res.json({ success: true });
});

// 메인 페이지
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Vercel용 내보내기 (중요: app.listen이 없어야 함)
module.exports = app;
