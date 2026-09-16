// 실제 화면(app.js/index.html)을 그대로 띄우되 인증만 가짜로 대체한 E2E 하네스.
const express = require('express');
const path = require('path');
const os = require('os');
const fs = require('fs');
const ROOT = path.resolve(__dirname, '../..');
const { createRouter } = require('../../lib/recruitment/routes');
const app = express();
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'recruit-e2e-'));
app.get(['/recruitment', '/recruitment/'], (req, res) => res.sendFile(path.join(ROOT, 'public', 'recruitment', 'index.html')));
app.use(express.static(path.join(ROOT, 'public')));
app.post('/api/auth/login', express.json(), (req, res) =>
    req.body.code === 'test-code' ? res.json({ success: true, token: 'sess-user', role: 'user' }) : res.status(401).json({ error: '잘못된 인증 코드입니다.' }));
app.use('/api/recruitments', createRouter({ directory: dir, validateSession: async t => t === 'sess-user' ? { role: 'user' } : null }));
app.listen(3199, '127.0.0.1', () => console.log('E2E 서버 준비 ' + dir));
