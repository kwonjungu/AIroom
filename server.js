const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();

// Vercel은 파일 쓰기를 막아두었기 때문에, 
// 데이터가 저장되지 않더라도 에러로 멈추지 않게 방어 코드를 넣었습니다.
const DATA_DIR = '/tmp'; // Vercel에서 유일하게 허용된 임시 쓰기 공간

app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Helper: 데이터 읽기 (파일이 없으면 기본 설정값 사용)
function readJSON(filename) {
    try {
        const filepath = path.join(DATA_DIR, filename);
        if (fs.existsSync(filepath)) {
            return JSON.parse(fs.readFileSync(filepath, 'utf-8'));
        }
        // 기본값 로드 (GitHub에 올린 defaults 폴더 기준)
        return require(`./defaults/${filename}`);
    } catch (e) {
        try {
            return require(`./defaults/${filename}`);
        } catch (err) {
            return null;
        }
    }
}

// Helper: 데이터 쓰기 (Vercel 임시 폴더에 저장 시도)
function writeJSON(filename, data) {
    try {
        const filepath = path.join(DATA_DIR, filename);
        fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (e) {
        console.error('파일 저장 실패(서버리스 환경):', e.message);
    }
}

// ===== API Routes =====
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
app.post('/api/sections', (req, res) => { writeJSON('
