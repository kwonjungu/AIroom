'use strict';
// 개인정보(성명) 동의서 내려받기와 이름 익명화(가운데 글자 0).
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const express = require('express');
const JSZip = require('jszip');
const { createRouter } = require('../../lib/recruitment/routes');
const d = require('../../lib/recruitment/domain');

test('maskName: 가운데 글자를 모두 0으로, 이미 바꾼 이름은 그대로', () => {
    assert.equal(d.maskName('권준구'), '권0구');
    assert.equal(d.maskName('남궁민수'), '남00수');
    assert.equal(d.maskName('김수'), '김0');
    assert.equal(d.maskName('이'), '이');
    assert.equal(d.maskName('권0구'), '권0구');
});

async function setup(t) {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'recruitment-consent-'));
    const app = express(); app.use('/api/recruitments', createRouter({ directory, validateSession: async token => token === 'admin-test' ? { role: 'admin' } : null }));
    const server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
    t.after(async () => { await new Promise(resolve => server.close(resolve)); await fs.rm(directory, { recursive: true, force: true }); });
    const base = `http://127.0.0.1:${server.address().port}/api/recruitments`;
    const call = async (url, method = 'GET', body, who = 'admin') => {
        const headers = { 'Content-Type': 'application/json' }; if (who === 'admin') headers['X-Auth-Token'] = 'admin-test'; else if (who) headers['X-Recruitment-Token'] = who;
        const res = await fetch(base + url, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
        const type = res.headers.get('content-type') || '';
        return { res, json: type.includes('json') ? await res.json() : null, buffer: type.includes('json') ? null : Buffer.from(await res.arrayBuffer()) };
    };
    const payload = { school: '테스트학교', title: '협력강사 채용', field: '강사', documentDate: '2026-09-20', interviewDate: '2026-09-21', rankingBasis: 'combined', shortlistLimit: 1, allowBonus: false,
        candidates: [{ code: '001', name: '권준구' }, { code: '002', name: '남궁민수' }], reviewers: [{ name: '홍길동', position: '교사', email: 'r@example.com', stages: ['document', 'interview'] }] };
    const r = (await call('', 'POST', payload)).json;
    return { call, r, directory };
}

test('동의서: 관리자만 한/글 파일을 받고, 학교와 채용 제목이 채워진다', async t => {
    const { call, r } = await setup(t);
    const blank = await call('/consent/hwpx'); assert.equal(blank.res.status, 200); assert.equal(blank.res.headers.get('content-type'), 'application/hwp+zip');
    const filled = await call(`/${r.id}/consent/hwpx`); assert.equal(filled.res.status, 200);
    const zip = await JSZip.loadAsync(filled.buffer);
    assert.equal(Object.keys(zip.files)[0], 'mimetype');
    const xml = await zip.file('Contents/section0.xml').async('string');
    for (const word of ['개인정보 수집 및 이용 동의서(지원자용)', '개인정보 수집 및 이용 동의서(평가위원용)', '테스트학교', '협력강사 채용', '동의를 거부할 권리와 불이익', '홍0동']) assert.ok(xml.includes(word), word);
    assert.equal((await call('/consent/hwpx', 'GET', undefined, null)).res.status, 401);
});

test('익명화: 한 사람만, 전원, 처리 이력과 확정 문서까지 바뀌고 위원 링크는 그대로 통한다', async t => {
    const { call, r: start } = await setup(t);
    const inv = (await call(`/${start.id}/invites/${start.reviewers[0].id}`, 'POST', { version: start.version })).json; let r = inv.recruitment;
    const token = inv.invitationPath.split('invite=')[1];
    r = (await call(`/${r.id}/anonymize`, 'POST', { version: r.version, ids: [r.candidates[0].id] })).json;
    assert.deepEqual(r.candidates.map(c => c.name), ['권0구', '남궁민수']); assert.equal(r.reviewers[0].name, '홍길동');
    assert.equal((await call(`/${r.id}/anonymize`, 'POST', { version: r.version, ids: ['nobody'] })).res.status, 404);
    r = (await call(`/${r.id}/anonymize`, 'POST', { version: r.version })).json;
    assert.deepEqual([...r.candidates, ...r.reviewers].map(p => p.name), ['권0구', '남00수', '홍0동']);
    assert.ok(!JSON.stringify(r).match(/권준구|남궁민수|홍길동/), '처리 이력(링크 발급 기록 등)에도 원래 이름이 남지 않는다');
    const again = await call(`/${r.id}/anonymize`, 'POST', { version: r.version }); assert.equal(again.res.status, 400);
    assert.equal((await call(`/${r.id}`, 'GET', undefined, token)).res.status, 200, '익명화해도 위원 링크는 그대로');
    assert.equal((await call(`/${r.id}/anonymize`, 'POST', { version: r.version }, token)).res.status, 401);
});

test('익명화: 확정본(snapshot) 안의 이름도 바뀐다', () => {
    const r = { candidates: [{ id: 'c1', name: '권준구' }], reviewers: [{ id: 'v1', name: '홍길동', inviteToken: 'x', pledge: { image: 'data:홍길동' } }], audit: [], snapshot: { candidates: [{ id: 'c1', name: '권준구' }], results: [{ candidateId: 'c1', name: '권준구' }], reviewers: [{ id: 'v1', name: '홍길동' }] } };
    d.anonymizeNames(r, null);
    assert.equal(r.snapshot.results[0].name, '권0구'); assert.equal(r.snapshot.reviewers[0].name, '홍0동');
    assert.equal(r.reviewers[0].pledge.image, 'data:홍길동', '서명 그림은 건드리지 않는다');
});

test('익명화: 비슷한 다른 이름과 심사 항목 글은 그대로 둔다', () => {
    const r = { candidates: [{ id: 'c1', name: '이수' }, { id: 'c2', name: '이수진' }], reviewers: [], audit: [{ detail: '이수, 이수진 면접 대상' }],
        shortlistReason: '이수진과 이수를 고름', evaluations: { 'document:v1': { rows: [{ candidateId: 'c1', note: '이수 서류 확인, 이수진과 비교' }] } },
        rubrics: { document: [{ label: '연수 이수 실적' }] }, snapshot: { rubrics: { document: [{ label: '연수 이수 실적' }] }, candidates: [{ id: 'c1', name: '이수' }, { id: 'c2', name: '이수진' }], results: [{ candidateId: 'c1', name: '이수' }, { candidateId: 'c2', name: '이수진' }], school: '이수초' } };
    d.anonymizeNames(r, ['c1']);
    assert.deepEqual(r.candidates.map(c => c.name), ['이0', '이수진']);
    assert.deepEqual(r.snapshot.results.map(c => c.name), ['이0', '이수진']);
    assert.equal(r.snapshot.rubrics.document[0].label, '연수 이수 실적');
    assert.equal(r.snapshot.school, '이수초');
    assert.equal(r.audit[0].detail, '이0, 이수진 면접 대상');
    assert.equal(r.shortlistReason, '이수진과 이0를 고름');
    assert.equal(r.evaluations['document:v1'].rows[0].note, '이0 서류 확인, 이수진과 비교');
});

test('예전(원문 저장 전) 링크: 새로 발급해도 예전 링크가 계속 열린다', async t => {
    const { call, r: start, directory } = await setup(t);
    const { hash } = require('../../lib/recruitment/routes');
    const { createStore } = require('../../lib/recruitment/store');
    // 예전 방식으로 발급된 상태를 흉내 낸다: 해시와 만료일만 있고 원문은 없다(만료일은 이미 지남).
    const old = 'a'.repeat(64);
    await createStore({ directory }).mutate(start.id, start.version, r => { Object.assign(r.reviewers[0], { inviteHash: hash(old), inviteExpiresAt: '2026-01-01T00:00:00.000Z' }); return r; });
    assert.equal((await call(`/${start.id}`, 'GET', undefined, old)).res.status, 200, '예전 링크는 만료 없이 열린다');
    let r = (await call(`/${start.id}`)).json; assert.equal(r.reviewers[0].invitePath, undefined, '원문이 없으니 화면에 보여 줄 링크는 없다');
    const inv = (await call(`/${r.id}/invites/${r.reviewers[0].id}`, 'POST', { version: r.version })).json; const fresh = inv.invitationPath.split('invite=')[1];
    assert.equal((await call(`/${r.id}`, 'GET', undefined, old)).res.status, 200, '새로 받아도 예전 링크는 그대로');
    assert.equal((await call(`/${r.id}`, 'GET', undefined, fresh)).res.status, 200);
    const view = (await call(`/${r.id}`, 'GET', undefined, fresh)).json;
    assert.ok(!JSON.stringify(view).includes('legacyInviteHashes') && !JSON.stringify(view).includes(hash(old)));
});

test('익명화: 메모가 바뀐 채점표는 updatedAt 이 새로 찍혀, 열려 있던 옛 화면이 실명으로 덮어쓰지 못한다', () => {
    const r = { candidates: [{ id: 'c1', name: '권준구' }], reviewers: [], audit: [], evaluations: { 'document:v1': { updatedAt: '2026-01-01T00:00:00.000Z', rows: [{ candidateId: 'c1', note: '권준구 확인' }] }, 'document:v2': { updatedAt: '2026-01-01T00:00:00.000Z', rows: [{ candidateId: 'c1', note: '' }] } } };
    d.anonymizeNames(r, null);
    assert.notEqual(r.evaluations['document:v1'].updatedAt, '2026-01-01T00:00:00.000Z');
    assert.equal(r.evaluations['document:v2'].updatedAt, '2026-01-01T00:00:00.000Z', '바뀌지 않은 채점표는 그대로');
});
