'use strict';
// 동시 접속(중복 로그인) 회귀 시험 — 감수 A 루프(docs/review-2026-11-10/A-동시접속-감수의견조사서.md).
// 한 채용에 위원 두 명(또는 관리자 두 명)이 동시에 들어와 있을 때, 한쪽 저장이 다른 쪽을 영구히 막으면 안 된다.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const express = require('express');
const { createRouter } = require('../../lib/recruitment/routes');
const { createStore } = require('../../lib/recruitment/store');
const { fullPicks } = require('./domain.test');

const payload = () => ({ school: '테스트학교', title: '동시 접속', field: '강사', documentDate: '2026-09-20', interviewDate: '2026-09-21', rankingBasis: 'combined', shortlistLimit: 1, allowBonus: false,
    candidates: [{ code: '001', name: '지원자가' }, { code: '002', name: '지원자나' }],
    reviewers: [{ name: '위원갑', position: '교사', email: 'a@example.com', stages: ['document', 'interview'] }, { name: '위원을', position: '교사', email: 'b@example.com', stages: ['document', 'interview'] }] });
const PNG = 'data:image/png;base64,' + Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(400, 9)]).toString('base64');
const rowsOf = (r, stage, score) => r.candidates.map(c => ({ candidateId: c.id, attendance: 'present', scores: Object.fromEntries(r.rubrics[stage].map(v => [v.id, score ?? v.max])), picks: fullPicks(r.rubrics[stage]), bonus: 0, note: '' }));

// 새 화면처럼 자기 채점표 시각(base)을 함께 보낸다.
const baseOf = (view, reviewerIndex, stage = 'document') => view.evaluations?.[`${stage}:${view.reviewers[reviewerIndex].id}`]?.updatedAt ?? null;

async function setup(t) {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'recruitment-concurrent-'));
    const app = express(); app.use('/api/recruitments', createRouter({ directory, validateSession: async token => (token === 'admin-1' || token === 'admin-2') ? { role: 'admin' } : null }));
    const server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
    t.after(async () => { await new Promise(resolve => server.close(resolve)); await fs.rm(directory, { recursive: true, force: true }); });
    const base = `http://127.0.0.1:${server.address().port}/api/recruitments`;
    async function request(url, method = 'GET', body, who = 'admin-1') {
        const headers = { 'Content-Type': 'application/json' };
        if (who.startsWith('admin')) headers['X-Auth-Token'] = who; else headers['X-Recruitment-Token'] = who;
        const res = await fetch(base + url, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
        return { res, json: await res.json() };
    }
    let r = (await request('', 'POST', payload())).json;
    const tokens = [];
    for (const v of r.reviewers) { const inv = await request(`/${r.id}/invites/${v.id}`, 'POST', { version: r.version }); r = inv.json.recruitment; tokens.push(inv.json.invitationPath.split('invite=')[1]); }
    r = (await request(`/${r.id}/provision`, 'POST', { version: r.version })).json;
    return { request, r, tokens, directory };
}

test('위원 두 명이 같은 채용을 동시에 열고 번갈아 저장·서명·제출해도 서로 막히지 않는다', async t => {
    const { request, r: start, tokens: [a, b] } = await setup(t);
    // 두 위원 모두 같은 버전의 화면을 들고 있다.
    const viewA = (await request(`/${start.id}`, 'GET', undefined, a)).json, viewB = (await request(`/${start.id}`, 'GET', undefined, b)).json;
    assert.equal(viewA.version, viewB.version);
    // 갑이 먼저 저장 → 을은 낡은 버전으로 저장. 예전에는 여기서 409 가 나고 을은 새로고침 전까지 계속 막혔다.
    const savedA = await request(`/${start.id}/evaluations/document/save`, 'POST', { version: viewA.version, base: baseOf(viewA, 0), rows: rowsOf(viewA, 'document') }, a);
    assert.equal(savedA.res.status, 200, savedA.json.error);
    const savedB = await request(`/${start.id}/evaluations/document/save`, 'POST', { version: viewB.version, base: baseOf(viewB, 1), rows: rowsOf(viewB, 'document', 1) }, b);
    assert.equal(savedB.res.status, 200, savedB.json.error);
    // 갑도 자기 화면의 (이제 낡은) 버전으로 서명·제출을 이어 간다.
    assert.equal((await request(`/${start.id}/pledge`, 'POST', { version: savedA.json.version, image: PNG }, a)).res.status, 200);
    assert.equal((await request(`/${start.id}/pledge`, 'POST', { version: savedB.json.version, image: PNG }, b)).res.status, 200);
    const subA = await request(`/${start.id}/evaluations/document/submit`, 'POST', { version: savedA.json.version, base: baseOf(savedA.json, 0) }, a);
    const subB = await request(`/${start.id}/evaluations/document/submit`, 'POST', { version: savedB.json.version, base: baseOf(savedB.json, 1) }, b);
    assert.equal(subA.res.status, 200, subA.json.error); assert.equal(subB.res.status, 200, subB.json.error);
    // 두 사람의 점수가 모두 남아 있고 서로 덮어쓰지 않았다.
    const final = (await request(`/${start.id}`)).json;
    const evA = final.evaluations[`document:${final.reviewers[0].id}`], evB = final.evaluations[`document:${final.reviewers[1].id}`];
    assert.ok(evA.submittedAt && evB.submittedAt);
    const judge = final.rubrics.document.find(i => !i.kind || i.kind === 'judge');
    assert.ok(judge, '강사 표준 서류에는 재량 점수 항목이 있다');
    assert.equal(evA.rows[0].scores[judge.id], judge.max, '갑의 점수가 그대로 남는다');
    assert.equal(evB.rows[0].scores[judge.id], 1, '을의 점수가 그대로 남는다');
    assert.ok(final.reviewers.every(v => v.pledge?.signedAt));
});

test('동시에 날아온 위원 저장 요청이 모두 반영된다(같은 순간 경쟁)', async t => {
    const { request, r, tokens: [a, b] } = await setup(t);
    const results = await Promise.all([
        request(`/${r.id}/evaluations/document/save`, 'POST', { version: r.version, base: null, rows: rowsOf(r, 'document') }, a),
        request(`/${r.id}/evaluations/document/save`, 'POST', { version: r.version, base: null, rows: rowsOf(r, 'document') }, b)
    ]);
    results.forEach(x => assert.equal(x.res.status, 200, x.json.error));
    const final = (await request(`/${r.id}`)).json;
    assert.ok(final.reviewers.every(v => final.evaluations[`document:${v.id}`]));
    assert.equal(final.version, r.version + 2);
});

test('최신 상태 기준 검사는 그대로다: 재발급으로 막힌 링크, 제출 뒤 저장은 여전히 거절', async t => {
    const { request, r: start, tokens: [a, b] } = await setup(t);
    // 관리자가 을의 링크를 다시 발급하면 을의 옛 링크는 낡은 버전을 들고 있어도 들어오지 못한다.
    const re = await request(`/${start.id}/invites/${start.reviewers[1].id}`, 'POST', { version: start.version });
    assert.equal(re.res.status, 200);
    assert.equal((await request(`/${start.id}/evaluations/document/save`, 'POST', { version: start.version, base: null, rows: rowsOf(start, 'document') }, b)).res.status, 401);
    // 제출한 평가는 다시 저장할 수 없다(최신 base 로 보내도 409).
    let r = (await request(`/${start.id}/evaluations/document/save`, 'POST', { version: start.version, base: null, rows: rowsOf(start, 'document') }, a)).json;
    r = (await request(`/${start.id}/pledge`, 'POST', { version: r.version, image: PNG }, a)).json;
    r = (await request(`/${start.id}/evaluations/document/submit`, 'POST', { version: r.version, base: baseOf(r, 0) }, a)).json;
    const again = await request(`/${start.id}/evaluations/document/save`, 'POST', { version: start.version, base: baseOf(r, 0), rows: rowsOf(start, 'document') }, a);
    assert.equal(again.res.status, 409); assert.match(again.json.error, /제출한 평가/);
});

test('같은 위원이 두 기기에서 같은 링크를 열어 두면, 낡은 기기의 저장·제출이 최신 점수를 조용히 덮어쓰지 않는다', async t => {
    const { request, r: start, tokens: [a] } = await setup(t);
    const pc = (await request(`/${start.id}`, 'GET', undefined, a)).json, tablet = (await request(`/${start.id}`, 'GET', undefined, a)).json;
    const judge = start.rubrics.document.find(i => !i.kind || i.kind === 'judge');
    const saved = await request(`/${start.id}/evaluations/document/save`, 'POST', { version: tablet.version, base: baseOf(tablet, 0), rows: rowsOf(tablet, 'document', 2) }, a);
    assert.equal(saved.res.status, 200);
    // PC 화면은 태블릿 저장 전의 상태(base=null)를 들고 있다.
    const stale = await request(`/${start.id}/evaluations/document/save`, 'POST', { version: pc.version, base: baseOf(pc, 0), rows: rowsOf(pc, 'document', 1) }, a);
    assert.equal(stale.res.status, 409); assert.equal(stale.json.code, 'own_conflict'); assert.ok(Number.isInteger(stale.json.currentVersion));
    const staleSubmit = await request(`/${start.id}/evaluations/document/submit`, 'POST', { version: pc.version, base: baseOf(pc, 0) }, a);
    assert.equal(staleSubmit.res.status, 409); assert.equal(staleSubmit.json.code, 'own_conflict');
    const now = (await request(`/${start.id}`)).json;
    assert.equal(now.evaluations[`document:${now.reviewers[0].id}`].rows[0].scores[judge.id], 2, '태블릿 점수가 남는다');
    // 최신 내용을 불러온 뒤(base 갱신) 다시 저장하면 통한다.
    const fresh = (await request(`/${start.id}`, 'GET', undefined, a)).json;
    assert.equal((await request(`/${start.id}/evaluations/document/save`, 'POST', { version: fresh.version, base: baseOf(fresh, 0), rows: rowsOf(fresh, 'document', 1) }, a)).res.status, 200);
});

test('base 를 보내지 않는 옛 화면은 예전처럼 엄격한 버전 검사를 받는다', async t => {
    const { request, r, tokens: [a, b] } = await setup(t);
    assert.equal((await request(`/${r.id}/evaluations/document/save`, 'POST', { version: r.version, rows: rowsOf(r, 'document') }, a)).res.status, 200);
    const old = await request(`/${r.id}/evaluations/document/save`, 'POST', { version: r.version, rows: rowsOf(r, 'document') }, b);
    assert.equal(old.res.status, 409); assert.ok(Number.isInteger(old.json.currentVersion));
});

test('관리자 결정(면접 대상 선정 등)은 여전히 버전이 맞아야 한다 — 낡은 화면으로 덮어쓰지 않는다', async t => {
    const { request, r } = await setup(t);
    const stale = r.version;
    await request(`/${r.id}/invites/${r.reviewers[0].id}`, 'POST', { version: r.version }, 'admin-2'); // 다른 관리자가 먼저 작업
    const res = await request(`/${r.id}/provision`, 'POST', { version: stale }, 'admin-1');
    assert.equal(res.res.status, 409);
    assert.ok(Number.isInteger(res.json.currentVersion), '충돌 응답에 최신 버전을 알려 주어 화면이 스스로 다시 불러올 수 있어야 한다');
});

test('저장소: rebase 는 CAS 경합에서 다시 시도하고, 기본 mutate 는 버전이 다르면 거절한다', async () => {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'recruitment-store-'));
    try {
        const store = createStore({ directory });
        const r = await store.create({ id: '00000000-0000-4000-8000-000000000001', version: 1, createdAt: new Date().toISOString(), n: 0 });
        await assert.rejects(store.mutate(r.id, 99, x => x), /다른 사용자가 변경/);
        const out = await Promise.all([1, 2, 3].map(() => store.mutate(r.id, 1, x => { x.n++; return x; }, { rebase: true })));
        assert.equal(Math.max(...out.map(x => x.version)), 4);
        assert.equal((await store.get(r.id)).n, 3);
        // Redis CAS 경합 흉내: 첫 CAS 는 실패(0)하고 두 번째에 성공해야 한다.
        let stored = JSON.stringify({ ...r, version: 1, n: 0 }), casCalls = 0;
        const fake = { get: async () => stored, eval: async (script, keys, args) => { casCalls++; if (casCalls === 1) { const cur = JSON.parse(stored); cur.version++; stored = JSON.stringify(cur); return 0; } if (JSON.parse(stored).version !== Number(args[0])) return 0; stored = args[1]; return 1; } };
        const redisStore = createStore({ redis: fake, directory });
        const done = await redisStore.mutate(r.id, 1, x => { x.n = 7; return x; }, { rebase: true });
        assert.equal(done.n, 7); assert.equal(casCalls, 2);
        await assert.rejects(createStore({ redis: { get: async () => stored, eval: async () => 0 }, directory }).mutate(r.id, JSON.parse(stored).version, x => x, { rebase: true }), /동시 변경/);
        // 엄격 모드의 CAS 경합도 최신 버전을 알려 준다(화면이 스스로 다시 불러오도록).
        await assert.rejects(createStore({ redis: { get: async () => stored, eval: async () => 0 }, directory }).mutate(r.id, JSON.parse(stored).version, x => x), e => e.status === 409 && e.currentVersion === JSON.parse(stored).version);
    } finally { await fs.rm(directory, { recursive: true, force: true }); }
});
