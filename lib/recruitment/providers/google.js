'use strict';
const config = require('../config');
const { assert } = require('../domain');

// This is a callable integration seam, NOT enabled in routes.js.
// Supply a server-side OAuth access-token provider after connecting the operator account.
class GoogleWorkspaceClient {
    constructor({ getAccessToken, fetchImpl = fetch }) { this.getAccessToken = getAccessToken; this.fetch = fetchImpl; }
    async request(service, endpoint, options = {}) {
        assert(['drive', 'sheets'].includes(service), '지원하지 않는 Google 서비스입니다.');
        const base = service === 'drive' ? 'https://www.googleapis.com/drive/v3/' : 'https://sheets.googleapis.com/v4/';
        const token = await this.getAccessToken(); assert(token, 'Google OAuth 연결이 필요합니다.', 503);
        const response = await this.fetch(base + endpoint, { ...options, signal: AbortSignal.timeout(30000), headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...options.headers } });
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
    copyTemplate(capacity, folderId, name) { assert([10, 20].includes(capacity), '잘못된 템플릿입니다.'); return this.request('drive', `files/${config.templateIds[capacity]}/copy?fields=id,name,webViewLink&supportsAllDrives=true`, { method: 'POST', body: JSON.stringify({ name, parents: [folderId] }) }); }
    readMetadata(id) { return this.request('sheets', `spreadsheets/${encodeURIComponent(id)}?fields=spreadsheetId,sheets.properties,namedRanges`); }
    writeValues(id, data) { return this.request('sheets', `spreadsheets/${encodeURIComponent(id)}/values:batchUpdate`, { method: 'POST', body: JSON.stringify({ valueInputOption: 'RAW', data }) }); }
    clearValues(id, ranges) { return this.request('sheets', `spreadsheets/${encodeURIComponent(id)}/values:batchClear`, { method: 'POST', body: JSON.stringify({ ranges }) }); }
    batchUpdate(id, requests) { return this.request('sheets', `spreadsheets/${encodeURIComponent(id)}:batchUpdate`, { method: 'POST', body: JSON.stringify({ requests }) }); }
    shareWithReviewer(id, email) { return this.request('drive', `files/${encodeURIComponent(id)}/permissions?sendNotificationEmail=false&supportsAllDrives=true`, { method: 'POST', body: JSON.stringify({ type: 'user', role: 'writer', emailAddress: email }) }); }
}
function templatePlan(r, metadata) {
    const capacity = r.candidates.length <= 10 ? 10 : 20;
    const names = new Set(metadata.sheets.map(s => s.properties.title));
    for (const name of ['시작 필수입력', '서류심사 자동 집계표', '면접 자동 집계표', ...Array.from({ length: 4 }, (_, i) => `서류심사(${i + 1})`), ...Array.from({ length: 4 }, (_, i) => `면접(${i + 1})`)]) assert(names.has(name), `템플릿의 ${name} 탭이 없습니다.`);
    const doc = r.reviewers.filter(v => v.stages.includes('document')), interview = r.reviewers.filter(v => v.stages.includes('interview'));
    const values = [
        { range: "'시작 필수입력'!C5", values: [[r.school]] },
        { range: "'시작 필수입력'!C20:C39", values: Array.from({ length: 20 }, (_, i) => [r.candidates[i] ? `${r.candidates[i].code} ${r.candidates[i].name}` : '']) },
        { range: "'시작 필수입력'!H21:J22", values: [r.documentDate, r.interviewDate].map(d => d.split('-').map(Number)) },
        { range: "'시작 필수입력'!H26", values: [[r.field]] }
    ];
    for (const [people, firstRow] of [[doc, 8], [interview, 13]]) for (let i = 0; i < 4; i++) {
        values.push({ range: `'시작 필수입력'!D${firstRow + i}`, values: [[people[i]?.position || '']] });
        values.push({ range: `'시작 필수입력'!F${firstRow + i}`, values: [[people[i]?.name || '']] });
    }
    return { capacity, values, clearRanges: ["'시작 필수입력'!E20:E23", ...Array.from({ length: 4 }, (_, i) => `'서류심사(${i + 1})'!D8:${capacity === 10 ? 'M' : 'W'}19`), ...Array.from({ length: 4 }, (_, i) => `'면접(${i + 1})'!D8:G12`)],
        activationRequirements: ['가점/순위/동점 수식 정비 사본 등록', '탭 및 셀 매핑 검증', '위원별 보호 범위 설정', '접수번호 기반 점수 가져오기 구현', '제출 시 시트 잠금·재읽기·스냅샷 구현', '외부 작업 체크포인트·중복 방지 구현'] };
}
module.exports = { GoogleWorkspaceClient, templatePlan };
