'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const config = require('../../lib/recruitment/config');
const { GoogleWorkspaceClient } = require('../../lib/recruitment/providers/google');
const { archiveName, archiveResults, purgeExpired } = require('../../lib/recruitment/providers/drive-archive');

const FOLDER_MIME = 'application/vnd.google-apps.folder';
const RECRUITMENT = { id: '9f1c2d3e-aaaa-bbbb-cccc-0123456789ab', title: '2026학년도 영어회화 강사 채용', snapshot: { finalizedAt: '2026-09-10T02:00:00.000Z' } };
const PURGE_AFTER = '2026-09-17T02:00:00.000Z';
const resultFiles = (mark = 'v1') => [
    { name: '집계표.html', buffer: Buffer.from(`<html>${mark}</html>`, 'utf8'), mimeType: 'text/html' },
    { name: '집계표.xlsx', buffer: Buffer.from(`xlsx-${mark}`, 'utf8'), mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
];

// 가짜 Drive. 실제 API는 호출하지 않고 q의 parents/name/appProperties 조건만 최소 해석한다.
function fakeDrive({ items = [], failDelete = new Set() } = {}) {
    const calls = { create: 0, upload: 0, update: 0, list: 0 };
    let seq = 0;
    const unquote = v => v === undefined ? undefined : v.replace(/\\(.)/g, '$1');
    const parentOf = q => unquote((/'([^']*)' in parents/.exec(q) || [])[1]);
    const nameOf = q => unquote((/name='((?:[^'\\]|\\.)*)'/.exec(q) || [])[1]);
    const recruitmentOf = q => unquote((/key='recruitmentId' and value='((?:[^'\\]|\\.)*)'/.exec(q) || [])[1]);
    const meta = ({ content, ...rest }) => rest;
    const fetchImpl = async (raw, options = {}) => {
        const url = new URL(raw);
        const method = options.method || 'GET';
        if (url.pathname.startsWith('/upload/drive/v3/files')) {
            assert.equal(url.searchParams.get('uploadType'), 'multipart');
            assert.match(options.headers['Content-Type'], /^multipart\/related; boundary=/);
            const boundary = /boundary=(.+)$/.exec(options.headers['Content-Type'])[1];
            const parts = Buffer.from(options.body).toString('utf8').split(`--${boundary}`).slice(1, -1);
            const metadata = JSON.parse(parts[0].slice(parts[0].indexOf('\r\n\r\n') + 4));
            const content = parts[1].slice(parts[1].indexOf('\r\n\r\n') + 4, -2);
            const id = url.pathname.slice('/upload/drive/v3/files/'.length);
            if (method === 'PATCH' && id) {
                const found = items.find(v => v.id === decodeURIComponent(id));
                if (!found) return new Response('not found', { status: 404 });
                calls.update++; found.content = content; found.name = metadata.name || found.name;
                return Response.json({ id: found.id, name: found.name, webViewLink: found.webViewLink });
            }
            calls.upload++;
            const created = { id: `file-${++seq}`, name: metadata.name, parents: metadata.parents, mimeType: 'application/octet-stream', webViewLink: `https://drive.example/file-${seq}`, content };
            items.push(created);
            return Response.json({ id: created.id, name: created.name, webViewLink: created.webViewLink });
        }
        if (url.pathname === '/drive/v3/files' && method === 'POST') {
            const body = JSON.parse(options.body);
            calls.create++;
            const created = { id: `folder-${++seq}`, name: body.name, mimeType: body.mimeType, parents: body.parents, appProperties: body.appProperties, webViewLink: `https://drive.example/folder-${seq}` };
            items.push(created);
            return Response.json(meta(created));
        }
        if (url.pathname === '/drive/v3/files' && method === 'GET') {
            calls.list++;
            const q = url.searchParams.get('q');
            const parent = parentOf(q), name = nameOf(q), recruitmentId = recruitmentOf(q);
            let list = items.filter(v => !v.trashed);
            if (parent) list = list.filter(v => (v.parents || []).includes(parent));
            if (q.includes(`mimeType='${FOLDER_MIME}'`)) list = list.filter(v => v.mimeType === FOLDER_MIME);
            if (name) list = list.filter(v => v.name === name);
            if (recruitmentId) list = list.filter(v => v.appProperties?.recruitmentId === recruitmentId);
            return Response.json({ files: list.map(meta) });
        }
        if (url.pathname.startsWith('/drive/v3/files/') && method === 'DELETE') {
            const id = decodeURIComponent(url.pathname.slice('/drive/v3/files/'.length));
            if (failDelete.has(id)) return new Response('forbidden', { status: 403 });
            const index = items.findIndex(v => v.id === id);
            if (index < 0) return new Response('not found', { status: 404 });
            items.splice(index, 1);
            return new Response(null, { status: 204 });
        }
        throw new Error(`가짜 Drive가 모르는 호출: ${method} ${raw}`);
    };
    return { items, calls, client: new GoogleWorkspaceClient({ getAccessToken: async () => 'test-token', fetchImpl }) };
}
const folder = (name, purgeAfter, id) => ({ id, name, mimeType: FOLDER_MIME, parents: [config.folderId], appProperties: { recruitmentId: id, purgeAfter }, webViewLink: `https://drive.example/${id}` });

test('archive folder name is sanitized, dated in KST and capped at 120 characters', () => {
    assert.equal(archiveName(RECRUITMENT), `채용_2026학년도 영어회화 강사 채용_2026-09-10_9f1c2d3e`);
    assert.equal(archiveName({ ...RECRUITMENT, title: '방과후 "영어/회화" : 강사*' }), '채용_방과후 영어 회화 강사_2026-09-10_9f1c2d3e');
    // 확정 15:30 UTC는 한국시간으로 다음 날이다. 담당자가 보는 날짜와 어긋나면 폴더를 못 찾는다.
    assert.equal(archiveName({ ...RECRUITMENT, snapshot: { finalizedAt: '2026-09-16T15:30:00.000Z' } }).includes('2026-09-17'), true);
    const long = archiveName({ ...RECRUITMENT, title: '가'.repeat(200) });
    assert.equal(long.length <= 120, true);
    assert.equal(long.endsWith('_2026-09-10_9f1c2d3e'), true);
    assert.throws(() => archiveName({ id: 'x', title: '제목' }), /확정된 채용/);
});

test('archiving twice reuses the folder and replaces same-named files instead of duplicating', async () => {
    const drive = fakeDrive();
    const first = await archiveResults(drive.client, RECRUITMENT, resultFiles('v1'));
    assert.equal(first.purgeAfter, PURGE_AFTER);
    assert.equal(first.folderUrl, 'https://drive.example/folder-1');
    assert.deepEqual(first.files.map(v => v.name), ['집계표.html', '집계표.xlsx']);
    const created = drive.items.find(v => v.mimeType === FOLDER_MIME);
    assert.equal(created.name, archiveName(RECRUITMENT));
    assert.deepEqual(created.appProperties, { recruitmentId: RECRUITMENT.id, purgeAfter: PURGE_AFTER });
    assert.deepEqual(created.parents, [config.folderId]);

    const second = await archiveResults(drive.client, RECRUITMENT, resultFiles('v2'));
    assert.equal(second.folderId, first.folderId);
    assert.equal(second.purgeAfter, PURGE_AFTER);
    assert.equal(drive.calls.create, 1);
    assert.equal(drive.items.filter(v => v.mimeType === FOLDER_MIME).length, 1);
    assert.equal(drive.items.filter(v => v.mimeType !== FOLDER_MIME).length, 2);
    assert.equal(drive.calls.upload, 2);
    assert.equal(drive.calls.update, 2);
    assert.deepEqual(second.files.map(v => v.id), first.files.map(v => v.id));
    assert.equal(drive.items.find(v => v.name === '집계표.html').content, '<html>v2</html>');
});

test('purgeExpired removes only folders past their retention stamp', async () => {
    const drive = fakeDrive({ items: [
        folder('만료', '2026-09-17T02:00:00.000Z', 'old'),
        folder('유효', '2026-09-30T02:00:00.000Z', 'fresh'),
        { id: 'outside', name: '남의 폴더', mimeType: FOLDER_MIME, parents: [config.folderId] }
    ] });
    const result = await purgeExpired(drive.client, Date.parse('2026-09-20T00:00:00.000Z'));
    assert.deepEqual(result.deleted, [{ id: 'old', name: '만료' }]);
    assert.deepEqual(result.failed, []);
    assert.equal(result.checked, 2);
    assert.deepEqual(drive.items.map(v => v.id), ['fresh', 'outside']);
});

test('a failed deletion is collected without stopping the remaining purges', async () => {
    const drive = fakeDrive({ items: [
        folder('만료1', '2026-09-17T02:00:00.000Z', 'locked'),
        folder('만료2', '2026-09-18T02:00:00.000Z', 'ok1'),
        folder('만료3', '2026-09-19T02:00:00.000Z', 'ok2')
    ], failDelete: new Set(['locked']) });
    const result = await purgeExpired(drive.client, Date.parse('2026-09-25T00:00:00.000Z'));
    assert.deepEqual(result.deleted.map(v => v.id), ['ok1', 'ok2']);
    assert.equal(result.checked, 3);
    assert.equal(result.failed.length, 1);
    assert.equal(result.failed[0].id, 'locked');
    assert.match(result.failed[0].reason, /403/);
    assert.deepEqual(drive.items.map(v => v.id), ['locked']);
});
