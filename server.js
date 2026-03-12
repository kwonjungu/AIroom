const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const DATA_DIR = '/tmp'; // Vercel에서 유일하게 허용된 임시 공간

app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(process.cwd(), 'public')));

// 안전하게 JSON 읽기 함수
function readJSON(filename) {
    try {
        const tmpPath = path.join(DATA_DIR, filename);
        if (fs.existsSync(tmpPath)) {
            return JSON.parse(fs.readFileSync(tmpPath, 'utf-8'));
        }
        
        const defaultPath = path.join(process.cwd(), 'defaults', filename);
        if (fs.existsSync(defaultPath)) {
            return JSON.parse(fs.readFileSync(defaultPath, 'utf-8'));
        }
        return null;
    } catch (e) {
        return null;
    }
}

// 안전하게 JSON 쓰기 함수
function writeJSON(filename, data) {
    try {
        const filepath = path.join(DATA_DIR, filename);
        fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (e) {
        console.error('쓰기 실패:', e.message);
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

// 메인 페이지
app.get('/', (req, res) => {
    res.sendFile(path.join(process.cwd(), 'index.html'));
});

// Vercel용 내보내기 (중요: app.listen이 없어야 함)
module.exports = app;
