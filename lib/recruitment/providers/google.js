'use strict';
const config = require('../config');
const { assert } = require('../domain');

// Drive 전용 통합 경계. 평가는 웹에서 진행하므로 Sheets API 는 쓰지 않는다.
// Drive 는 운영 계정 연결 확인과 확정 결과 문서(HTML/XLSX/ZIP) 보관에만 쓴다.
// 서버 측 OAuth 액세스 토큰 제공자를 주입해 사용한다.
class GoogleWorkspaceClient {
    constructor({ getAccessToken, fetchImpl = fetch }) { this.getAccessToken = getAccessToken; this.fetch = fetchImpl; }
    async request(service, endpoint, options = {}) {
        assert(service === 'drive', '지원하지 않는 Google 서비스입니다.');
        const token = await this.getAccessToken(); assert(token, 'Google OAuth 연결이 필요합니다.', 503);
        const response = await this.fetch('https://www.googleapis.com/drive/v3/' + endpoint, { ...options, signal: AbortSignal.timeout(30000), headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...options.headers } });
        if (!response.ok) { const error = new Error(`Google ${service} API HTTP ${response.status}`); error.status = response.status; throw error; }
        return response.status === 204 ? null : response.json();
    }
    async checkConnection() {
        const about = await this.request('drive', 'about?fields=user(emailAddress)');
        assert(about.user?.emailAddress?.toLowerCase() === config.operatorEmail, '지정한 전체 운영 계정으로 Google에 연결하세요.', 403);
        const folder = await this.request('drive', `files/${config.folderId}?fields=id,name,mimeType,capabilities(canAddChildren),permissions(type,role)&supportsAllDrives=true`);
        assert(folder.mimeType === 'application/vnd.google-apps.folder' && folder.capabilities?.canAddChildren, '대상 폴더에 파일 생성 권한이 없습니다.', 403);
        assert(Array.isArray(folder.permissions), '폴더 공유 권한을 확인할 수 없습니다.', 403);
        assert(!folder.permissions.some(p => ['anyone', 'domain'].includes(p.type)), '평가 문서 저장 전에 상위 폴더의 공개·도메인 공유를 제한하세요.', 409);
        return { email: about.user.emailAddress, folder };
    }
    createFolder(name) { return this.request('drive', 'files?fields=id,name,webViewLink&supportsAllDrives=true', { method: 'POST', body: JSON.stringify({ name, mimeType: 'application/vnd.google-apps.folder', parents: [config.folderId] }) }); }
    shareWithReviewer(id, email) { return this.request('drive', `files/${encodeURIComponent(id)}/permissions?sendNotificationEmail=false&supportsAllDrives=true`, { method: 'POST', body: JSON.stringify({ type: 'user', role: 'writer', emailAddress: email }) }); }
}
module.exports = { GoogleWorkspaceClient };
