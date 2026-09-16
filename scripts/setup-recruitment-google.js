'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const source = process.argv[2];
if (!source) { console.error('사용법: node scripts/setup-recruitment-google.js "다운로드한 OAuth JSON 경로" [http://localhost:3100]'); process.exit(1); }
try {
    const parsed = JSON.parse(fs.readFileSync(path.resolve(source), 'utf8'));
    // web = 웹 애플리케이션, installed = 데스크톱 앱.
    // 데스크톱 앱은 콘솔에 'http://localhost' 하나만 등록되지만, Google 은 이 유형에 한해
    // 루프백 주소의 포트와 경로를 자유롭게 허용한다 (2026-09-16 authorize 엔드포인트로 실측).
    // 대신 HTTPS 배포 주소는 redirect_uri_mismatch 로 거부되므로 로컬 전용이다.
    const kind = parsed.web ? 'web' : parsed.installed ? 'installed' : null;
    const client = parsed[kind];
    if (!client?.client_id || !client?.client_secret) throw new Error('웹 애플리케이션 또는 데스크톱 앱 유형의 OAuth 클라이언트 JSON이 필요합니다.');
    const origin = new URL(process.argv[3] || 'http://localhost:3100');
    if (origin.pathname !== '/' || origin.search || origin.hash || origin.username || origin.password) throw new Error('경로 없는 웹 주소를 입력하세요.');
    if (origin.protocol !== 'https:' && !(origin.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(origin.hostname))) throw new Error('HTTPS 또는 로컬호스트 주소만 사용할 수 있습니다.');
    const redirect = origin.origin + '/api/recruitments/google/callback';
    const loopback = origin.protocol === 'http:';
    if (kind === 'installed' && !loopback) throw new Error('데스크톱 앱 클라이언트는 로컬호스트에서만 쓸 수 있습니다. 배포 주소는 웹 애플리케이션 클라이언트를 만드세요.');
    if (kind === 'web' && !client.redirect_uris?.includes(redirect)) throw new Error('OAuth 클라이언트에 다음 리디렉션 URI를 등록하고 JSON을 다시 받으세요: ' + redirect);
    const target = path.join(root, '.env');
    const original = fs.existsSync(target) ? fs.readFileSync(target, 'utf8') : '';
    const priorKey = original.match(/^RECRUITMENT_TOKEN_KEY=([a-f0-9]{64})\s*$/im)?.[1];
    const values = { RECRUITMENT_GOOGLE_CLIENT_ID: client.client_id, RECRUITMENT_GOOGLE_CLIENT_SECRET: client.client_secret, RECRUITMENT_GOOGLE_REDIRECT_URI: redirect, RECRUITMENT_TOKEN_KEY: priorKey || crypto.randomBytes(32).toString('hex') };
    if (origin.protocol === 'http:') values.PORT = origin.port || '80';
    let output = original;
    for (const [key, value] of Object.entries(values)) {
        if (/[\r\n]/.test(value)) throw new Error('설정 값에 허용되지 않은 줄바꿈이 있습니다.');
        const pattern = new RegExp('^' + key + '=.*$', 'm'); output = pattern.test(output) ? output.replace(pattern, () => key + '=' + value) : output.replace(/\s*$/, '') + '\n' + key + '=' + value + '\n';
    }
    const temp = target + '.tmp'; fs.writeFileSync(temp, output, { mode: 0o600 }); fs.renameSync(temp, target);
    console.log(`로컬 .env 설정 완료 (클라이언트 유형: ${kind === 'web' ? '웹 애플리케이션' : '데스크톱 앱 · 로컬 전용'}). 비밀키는 화면에 출력하지 않았습니다.`);
    if (kind === 'installed') console.log('배포 도메인에서 쓰려면 웹 애플리케이션 클라이언트를 따로 만들어야 합니다.');
    console.log('npm start 실행 후 ' + origin.origin + '/recruitment 에서 관리자 로그인 → Google 계정 연결을 누르세요.');
} catch (e) { console.error('설정 실패: ' + e.message); process.exit(1); }
