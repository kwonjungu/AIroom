const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;
const DATA_DIR = path.join(__dirname, 'data');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Helper: read JSON file
function readJSON(filename) {
    const filepath = path.join(DATA_DIR, filename);
    if (!fs.existsSync(filepath)) return null;
    return JSON.parse(fs.readFileSync(filepath, 'utf-8'));
}

// Helper: write JSON file
function writeJSON(filename, data) {
    const filepath = path.join(DATA_DIR, filename);
    fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf-8');
}

// Initialize default data if not exists
function initDefaults() {
    if (!readJSON('links.json')) {
        writeJSON('links.json', require('./defaults/links.json'));
    }
    if (!readJSON('categories.json')) {
        writeJSON('categories.json', require('./defaults/categories.json'));
    }
    if (!readJSON('trainings.json')) {
        writeJSON('trainings.json', require('./defaults/trainings.json'));
    }
    if (!readJSON('staff.json')) {
        writeJSON('staff.json', require('./defaults/staff.json'));
    }
    if (!readJSON('training-records.json')) {
        writeJSON('training-records.json', {});
    }
}

// ===== API Routes =====

// Links
app.get('/api/links', (req, res) => {
    res.json(readJSON('links.json') || []);
});

app.post('/api/links', (req, res) => {
    writeJSON('links.json', req.body);
    res.json({ success: true });
});

// Categories
app.get('/api/categories', (req, res) => {
    res.json(readJSON('categories.json') || []);
});

app.post('/api/categories', (req, res) => {
    writeJSON('categories.json', req.body);
    res.json({ success: true });
});

// Trainings
app.get('/api/trainings', (req, res) => {
    res.json(readJSON('trainings.json') || []);
});

app.post('/api/trainings', (req, res) => {
    writeJSON('trainings.json', req.body);
    res.json({ success: true });
});

// Staff
app.get('/api/staff', (req, res) => {
    res.json(readJSON('staff.json') || []);
});

app.post('/api/staff', (req, res) => {
    writeJSON('staff.json', req.body);
    res.json({ success: true });
});

// Training Records (completion status per staff per training)
app.get('/api/training-records', (req, res) => {
    res.json(readJSON('training-records.json') || {});
});

app.post('/api/training-records', (req, res) => {
    writeJSON('training-records.json', req.body);
    res.json({ success: true });
});

// Single record update: PATCH /api/training-records/:trainingId/:staffId
app.patch('/api/training-records/:trainingId/:staffId', (req, res) => {
    const records = readJSON('training-records.json') || {};
    const { trainingId, staffId } = req.params;
    if (!records[trainingId]) records[trainingId] = {};
    records[trainingId][staffId] = req.body;
    writeJSON('training-records.json', records);
    res.json({ success: true });
});

// Export all data
app.get('/api/export', (req, res) => {
    const data = {
        links: readJSON('links.json'),
        categories: readJSON('categories.json'),
        trainings: readJSON('trainings.json'),
        staff: readJSON('staff.json'),
        trainingRecords: readJSON('training-records.json'),
        exportedAt: new Date().toISOString()
    };
    res.json(data);
});

// Import all data
app.post('/api/import', (req, res) => {
    const { links, categories, trainings, staff, trainingRecords } = req.body;
    if (links) writeJSON('links.json', links);
    if (categories) writeJSON('categories.json', categories);
    if (trainings) writeJSON('trainings.json', trainings);
    if (staff) writeJSON('staff.json', staff);
    if (trainingRecords) writeJSON('training-records.json', trainingRecords);
    res.json({ success: true });
});

// Initialize and start
initDefaults();

app.listen(PORT, () => {
    console.log(`백암초 온라인 교무실 서버 실행 중: http://localhost:${PORT}`);
});
