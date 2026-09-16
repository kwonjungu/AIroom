'use strict';
const config = require('../config');
const { assert } = require('../domain');

// 확정된 채용 결과물(HTML/엑셀)을 운영자 Drive에 잠시 두었다가 보관 기한이 지나면 지운다.
// 개인정보가 담긴 평가 문서라 휴지통이 아니라 완전 삭제한다.
const FOLDER_MIME = 'application/vnd.google-apps.folder';
const RETENTION_DAYS = 7;
const UPLOAD_ENDPOINT = 'https://www.googleapis.com/upload/drive/v3/files';
const NAME_LIMIT = 120;
// '/'는 Drive에서 경로처럼 읽히고, 따옴표·백슬래시·제어문자는 검색 질의(q)를 깨뜨린다.
const UNSAFE_NAME = /[\\/:*?"'<>|\x00-\x1f]/g;

// q 안의 문자열 리터럴 이스케이프. 채용명에 따옴표가 있어도 질의가 어긋나지 않게 한다.
const quote = value => String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
// 폴더 이름의 날짜는 담당자가 화면에서 보는 한국 날짜여야 한다. ICU 의존 없이 +9시간으로 계산.
const kstDate = ms => new Date(ms + 9 * 3600 * 1000).toISOString().slice(0, 10);
const searchUrl = (q, fields, extra = '') => `files?q=${encodeURIComponent(q)}&fields=${encodeURIComponent(fields)}&pageSize=100&supportsAllDrives=true&includeItemsFromAllDrives=true${extra}`;

function finalizedMs(r) {
    const at = r?.snapshot?.finalizedAt || r?.finalizedAt;
    assert(typeof at === 'string' && !isNaN(Date.parse(at)), '확정된 채용만 보관할 수 있습니다.', 409);
    return Date.parse(at);
}

function archiveName(r) {
    assert(r && typeof r === 'object' && typeof r.id === 'string' && r.id.length > 0, '채용 정보를 확인하세요.');
    const stamp = `_${kstDate(finalizedMs(r))}_${r.id.slice(0, 8)}`;
    // 폴더를 구분하는 값은 뒤쪽 확정일·id다. 길이 제한은 제목 쪽에서 줄여 구분자를 살린다.
    const title = String(r.title ?? '').replace(UNSAFE_NAME, ' ').replace(/\s+/g, ' ').trim() || '제목없음';
    return `채용_${title.slice(0, NAME_LIMIT - stamp.length - 3)}${stamp}`;
}

async function findFolder(client, recruitmentId) {
    const q = `mimeType='${FOLDER_MIME}' and '${quote(config.folderId)}' in parents and trashed=false and appProperties has { key='recruitmentId' and value='${quote(recruitmentId)}' }`;
    const found = await client.request('drive', searchUrl(q, 'files(id,name,webViewLink,appProperties)'));
    return found?.files?.[0] || null;
}

async function findChild(client, folderId, name) {
    const q = `'${quote(folderId)}' in parents and name='${quote(name)}' and trashed=false`;
    const found = await client.request('drive', searchUrl(q, 'files(id,name,webViewLink)'));
    return found?.files?.[0] || null;
}

// client.request는 JSON 전용이라 바이너리 본문을 실을 수 없다. 토큰·fetch 구현은 client 것을 그대로 쓴다.
async function uploadMultipart(client, { fileId, metadata, buffer, mimeType }) {
    const token = await client.getAccessToken(); assert(token, 'Google OAuth 연결이 필요합니다.', 503);
    const boundary = `airoom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    const body = Buffer.concat([
        Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`, 'utf8'),
        Buffer.from(buffer),
        Buffer.from(`\r\n--${boundary}--\r\n`, 'utf8')
    ]);
    const target = `${UPLOAD_ENDPOINT}${fileId ? `/${encodeURIComponent(fileId)}` : ''}?uploadType=multipart&fields=id,name,webViewLink&supportsAllDrives=true`;
    // 엑셀 첨부는 수 MB까지 커질 수 있어 JSON 호출(30초)보다 넉넉한 제한을 둔다.
    const response = await client.fetch(target, { method: fileId ? 'PATCH' : 'POST', signal: AbortSignal.timeout(120000), headers: { Authorization: `Bearer ${token}`, 'Content-Type': `multipart/related; boundary=${boundary}` }, body });
    if (!response.ok) { const error = new Error(`Google drive upload HTTP ${response.status}`); error.status = response.status; throw error; }
    return response.json();
}

async function archiveResults(client, recruitment, files) {
    assert(client && typeof client.request === 'function' && typeof client.getAccessToken === 'function' && typeof client.fetch === 'function', 'Google 연결 클라이언트가 필요합니다.', 503);
    assert(Array.isArray(files) && files.length > 0, '보관할 파일이 없습니다.');
    for (const file of files) {
        assert(file && typeof file.name === 'string' && file.name.trim().length > 0, '보관 파일 이름을 확인하세요.');
        assert(Buffer.isBuffer(file.buffer) || file.buffer instanceof Uint8Array, '보관 파일 내용을 확인하세요.');
        assert(typeof file.mimeType === 'string' && file.mimeType.length > 0, '보관 파일 형식을 확인하세요.');
    }
    const name = archiveName(recruitment);
    const purgeAfterOf = () => new Date(finalizedMs(recruitment) + RETENTION_DAYS * 86400000).toISOString();

    // 재출력·재시도로 여러 번 불려도 폴더는 하나여야 한다. 이름이 아니라 appProperties로 찾는 이유는
    // 담당자가 Drive에서 폴더 이름을 바꿔도 같은 채용으로 계속 인식되어야 하기 때문이다.
    let folder = await findFolder(client, recruitment.id);
    if (!folder) folder = await client.request('drive', 'files?fields=id,name,webViewLink,appProperties&supportsAllDrives=true', { method: 'POST', body: JSON.stringify({ name, mimeType: FOLDER_MIME, parents: [config.folderId], appProperties: { recruitmentId: recruitment.id, purgeAfter: purgeAfterOf() } }) });
    // 보관 시계는 확정 시각에서 시작한다. 다시 보관했다고 기한이 미뤄지면 안 되므로 기존 값을 그대로 쓴다.
    const purgeAfter = folder.appProperties?.purgeAfter || purgeAfterOf();

    const saved = [];
    for (const file of files) {
        const existing = await findChild(client, folder.id, file.name);
        // 같은 이름으로 새로 만들면 Drive는 동명 파일을 허용해 사본이 쌓인다. 내용만 교체한다.
        const result = await uploadMultipart(client, { fileId: existing?.id, metadata: existing ? { name: file.name } : { name: file.name, parents: [folder.id] }, buffer: file.buffer, mimeType: file.mimeType });
        saved.push({ id: result.id, name: result.name, webViewLink: result.webViewLink || null });
    }
    return { folderId: folder.id, folderUrl: folder.webViewLink || `https://drive.google.com/drive/folders/${folder.id}`, purgeAfter, files: saved };
}

async function purgeExpired(client, now = Date.now()) {
    assert(client && typeof client.request === 'function', 'Google 연결 클라이언트가 필요합니다.', 503);
    const deleted = [], failed = []; let checked = 0, pageToken = null;
    do {
        const q = `mimeType='${FOLDER_MIME}' and '${quote(config.folderId)}' in parents and trashed=false`;
        const page = await client.request('drive', searchUrl(q, 'nextPageToken,files(id,name,appProperties)', pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''));
        for (const folder of page?.files || []) {
            // 상위 폴더는 다른 용도와 함께 쓰므로, 보관 기한이 적힌 우리 폴더만 대상으로 삼는다.
            const at = Date.parse(folder.appProperties?.purgeAfter ?? '');
            if (isNaN(at)) continue;
            checked++;
            if (at > now) continue;
            // 휴지통이 아니라 완전 삭제. 평가 문서가 휴지통에 30일 남는 것도 보관 기한 위반이다.
            try { await client.request('drive', `files/${encodeURIComponent(folder.id)}?supportsAllDrives=true`, { method: 'DELETE' }); deleted.push({ id: folder.id, name: folder.name }); }
            // 권한·일시 오류로 한 폴더가 안 지워져도 나머지는 기한을 넘기면 안 되므로 계속 진행한다.
            catch (error) { failed.push({ id: folder.id, name: folder.name, reason: error.message }); }
        }
        pageToken = page?.nextPageToken || null;
    } while (pageToken);
    return { deleted, failed, checked };
}

module.exports = { archiveName, archiveResults, purgeExpired, RETENTION_DAYS };
