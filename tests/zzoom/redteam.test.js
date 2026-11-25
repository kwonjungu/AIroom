'use strict';
// 쭘 레드팀 시험 (briefs/REDTEAM_LOAD.md RT 절). 공격자 입장에서 실제로 뚫어 본다.
// 실행: node --test tests/zzoom/redteam.test.js
//   규칙 시험(Firebase Rules 시험 API, 게시 아님)까지: RT_RULES=1 node --test tests/zzoom/redteam.test.js
// 각 시험은 "안전한 결과"를 단정한다. 지금 뚫리는 것은 { todo } 로 표시해 실패해도 전체를 깨지 않는다(고치면 통과로 바뀐다).
// 실제 Firebase·Redis·Groq 에는 쓰지 않는다(가짜 fb·Redis, 로컬 server.js 는 Redis 없이·가짜 서비스 계정 키로).
const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const crypto = require('node:crypto');
const express = require('express');
const { createRouter } = require('../../lib/zzoom/routes');
const { createFakeRedis } = require('./fakes/fake-redis');
const { createFakeFb } = require('./fakes/fake-fb');

const ROOT = path.join(__dirname, '..', '..');
const DAY = 86400000;
const TOKENS = { admin: 'admin-t', user: 'user-t', user2: 'user2-t' };

// ---- 결과 표 ----
const ROWS = [];
// blocked: true=막힘, false=뚫림, null=참고(설계상 허용·정보)
function rec(attack, target, expect, actual, blocked, sev) { ROWS.push({ attack, target, expect, actual, verdict: blocked === null ? '참고' : blocked ? '막힘' : '뚫림', sev: blocked === false ? sev : '-' }); }
after(() => {
    const out = ['| 공격 | 대상 | 기대 | 실제 | 판정 | 심각도 |', '|---|---|---|---|---|---|',
        ...ROWS.map(r => `| ${r.attack} | ${r.target} | ${r.expect} | ${String(r.actual).replace(/\|/g, '/')} | ${r.verdict} | ${r.sev} |`)];
    const f = process.env.RT_TABLE_OUT;
    if (f) fs.writeFileSync(f, out.join('\n') + '\n', 'utf8');
    console.log('\n' + out.join('\n'));
    console.log(`\n레드팀 합계: ${ROWS.length}건, 막힘 ${ROWS.filter(r => r.verdict === '막힘').length}, 뚫림 ${ROWS.filter(r => r.verdict === '뚫림').length}`);
});

// ---- 가짜 저장소 + 실제 createRouter ----
async function setup(opts = {}) {
    const clock = { t: Date.parse('2026-11-25T00:00:00Z') };
    const now = () => clock.t;
    const redis = createFakeRedis({ now });
    const fb = createFakeFb({ now });
    const groq = { async transcribe() { return { ok: true, text: '말' }; } };
    // 'user-t#라벨' 은 같은 계정의 서로 다른 로그인 세션(ANON: 사람 = 세션 토큰 해시)
    const validateSession = async t => { const b = String(t || '').split('#')[0]; return b === TOKENS.admin ? { role: 'admin' } : (b === TOKENS.user || b === TOKENS.user2) ? { role: 'user' } : null; };
    const app = express();
    app.set('trust proxy', true);   // server.js 와 같다
    app.use((req, res, next) => { if (req.url.startsWith('/api/copy/')) { req.url = '/api/' + req.url.slice('/api/copy/'.length); req.isCopy = true; } next(); });
    app.use('/api/zzoom', createRouter({ redis, validateSession, fb, groq, now, env: { CRON_SECRET: 'cron-secret-value-0123456789' }, ...(opts.router || {}) }));
    const server = app.listen(0, '127.0.0.1');
    await new Promise(r => server.once('listening', r));
    const base = `http://127.0.0.1:${server.address().port}`;
    let ipSeq = 0;
    async function call(method, url, { body, auth, pt, ip, headers = {}, tick = 1001, raw, type } = {}) {
        clock.t += tick;
        const h = { ...headers };
        if (auth) h['X-Auth-Token'] = TOKENS[auth] || auth;
        if (pt) h['X-Zzoom-Pt'] = pt;
        if (ip) h['X-Forwarded-For'] = ip;
        let b;
        if (raw) { b = raw; h['Content-Type'] = type || 'audio/webm'; }
        else if (body !== undefined) { b = JSON.stringify(body); h['Content-Type'] = 'application/json'; }
        const res = await fetch(base + (url.startsWith('/api') ? url : '/api/zzoom' + url), { method, headers: h, body: b });
        const text = await res.text();
        let json = null; try { json = JSON.parse(text); } catch { /* md */ }
        return { status: res.status, json, text };
    }
    async function createMeeting(extra = {}) {
        const r = await call('POST', '/meetings', { auth: 'admin', body: { title: '학년 협의회', startsAt: '2026-11-26T06:00:00Z', hostCode: '123456', ...extra } });
        assert.equal(r.status, 201, r.text);
        return r.json.meeting.id;
    }
    // 익명(ANON): 서버는 이름을 버린다. name 은 시험용 사람 표시 — 같은 name = 같은 로그인 세션(다시 들어온 같은 사람)
    async function join(mid, name = '참석자', auth = 'user') {
        const r = await call('POST', `/${mid}/join`, { auth: (TOKENS[auth] || auth) + '#' + encodeURIComponent(name), body: { name }, ip: `10.9.${Math.floor(ipSeq / 200)}.${ipSeq++ % 200}` });
        assert.equal(r.status, 200, r.text);
        return r.json;
    }
    async function asHost(mid, name = '주관자') {
        const v = await join(mid, name);
        const r = await call('POST', `/${mid}/host`, { pt: v.pt, body: { code: '123456' }, ip: '10.200.0.' + (ipSeq++ % 200) });
        assert.equal(r.status, 200, r.text);
        return r.json;
    }
    async function board(mid, host) {
        const r = await call('POST', `/${mid}/boards`, { pt: host.pt, body: { bg: 'grid' } });
        assert.equal(r.status, 201, r.text);
        return r.json.aid;
    }
    const close = () => new Promise(r => server.close(r));
    return { clock, redis, fb, call, createMeeting, join, asHost, board, close };
}
const stroke = (pageKey, extra = {}) => ({ pageKey, epoch: 0, tool: 'pen', color: '#E5484D', w: 0.004, pts: [0.1, 0.1, 0.5, 0.2, 0.2, 0.5], ...extra });
const claimsOf = tok => JSON.parse(Buffer.from(tok.split('.')[1], 'base64url').toString()).claims;

// ================================================================ 참가 자격
test('RT 참가 자격: 위조·다른 회의·만료·재사용·host 회수·cid 바꿔치기', async t => {
    const h = await setup(); t.after(h.close);
    const mid = await h.createMeeting(), mid2 = await h.createMeeting();
    const host = await h.asHost(mid);
    const v = await h.join(mid, '참석자A');
    const other = await h.join(mid2, '다른회의');

    let r = await h.call('GET', `/${mid}/polls/pxxxxxxx/mine`, { pt: crypto.randomBytes(32).toString('base64url') });
    rec('pt 위조(임의 43자)', 'GET /:mid/polls/:pid/mine', '401', `${r.status} ${r.json?.error}`, r.status === 401, '높음');
    assert.equal(r.status, 401);

    r = await h.call('POST', `/${mid}/chat`, { pt: 'A'.repeat(101), body: { text: 'x' } });
    rec('pt 101자(길이 초과)', 'POST /:mid/chat', '401', `${r.status} ${r.json?.error}`, r.status === 401, '낮음');
    assert.equal(r.status, 401);

    r = await h.call('POST', `/${mid}/chat`, { pt: other.pt, body: { text: '다른 회의 자격으로' } });
    rec('다른 회의 pt', 'POST /:mid/chat', '403', `${r.status} ${r.json?.error}`, r.status === 403, '높음');
    assert.equal(r.status, 403);

    // host 승격 뒤 옛 viewer pt 재사용
    const v2 = await h.join(mid, '승격자');
    const up = await h.call('POST', `/${mid}/host`, { pt: v2.pt, body: { code: '123456' }, ip: '10.50.0.1' });
    assert.equal(up.status, 200);
    r = await h.call('POST', `/${mid}/chat`, { pt: v2.pt, body: { text: '옛 pt' } });
    rec('host 승격 전 옛 pt 재사용', 'POST /:mid/chat', '401', `${r.status} ${r.json?.error}`, r.status === 401, '중간');
    assert.equal(r.status, 401);

    // host 회수: 관리자가 코드를 바꾸면 코드로 받은 host pt 는 주관자 동작 거절
    assert.equal((await h.call('PATCH', `/meetings/${mid}`, { auth: 'admin', body: { hostCode: '654321' } })).status, 200);
    r = await h.call('POST', `/${mid}/boards`, { pt: host.pt, body: {} });
    rec('host 회수(코드 변경) 뒤 옛 host pt 로 주관자 동작', 'POST /:mid/boards', '403 host_revoked', `${r.status} ${r.json?.error}`, r.status === 403, '높음');
    assert.equal(r.status, 403);
    const c = await h.call('POST', `/${mid}/chat`, { pt: v.pt, body: { text: '참석자 글' } });
    r = await h.call('DELETE', `/${mid}/chat/${c.json.id}`, { pt: host.pt });
    rec('host 회수 뒤 옛 host pt 로 남의 채팅 지우기', 'DELETE /:mid/chat/:id', '403', `${r.status} ${r.json?.error}`, r.status === 403, '중간');
    assert.equal(r.status, 403);
    r = await h.call('POST', `/${mid}/refresh`, { pt: host.pt });
    const refreshed = r.json?.token ? claimsOf(r.json.token).role : null;
    rec('host 회수 뒤 /refresh 로 host 토큰 재발급', 'POST /:mid/refresh', 'viewer 토큰', `${r.status} role=${refreshed}`, refreshed === 'viewer', '높음');
    assert.equal(refreshed, 'viewer');
    // 이미 받아 둔 host 맞춤 토큰의 until: 회수해도 토큰은 살아 있다(규칙은 claim 만 본다)
    const hostTok = h.fb.calls.tokens.filter(x => x.claims.role === 'host' && x.uid === 'zz_' + host.cid).pop();
    const hostLeft = hostTok ? (hostTok.claims.until - h.clock.t) / DAY : 0;
    rec('host 회수 뒤에도 이미 받은 host 맞춤 토큰 유효기간', 'createCustomToken claim until', '짧게(≤1시간)', `until = 회의 만료(남은 ${hostLeft.toFixed(1)}일)`, hostLeft <= 1 / 24, '높음');
    await t.test('host 토큰 until 이 회의 만료까지(회수 불가)', { todo: '뚫림: 규칙은 until 만 봐서 회수된 주관자도 Storage 업로드 가능' }, () => assert.ok(hostLeft <= 1 / 24));

    // 만료 pt (12시간)
    h.clock.t += 12 * 3600000 + 5000;
    r = await h.call('POST', `/${mid}/chat`, { pt: v.pt, body: { text: '만료 뒤' } });
    rec('만료 pt(12시간 뒤)', 'POST /:mid/chat', '401', `${r.status} ${r.json?.error}`, r.status === 401, '높음');
    assert.equal(r.status, 401);

    // cid 바꿔치기: 본문 cid 는 무시되고 남의 손·선·글은 못 건드린다
    const a = await h.join(mid, '공격자'), b = await h.join(mid, '피해자');
    const aid = await h.board(mid, await h.join(mid, '관리자', 'admin'));
    const sb = await h.call('POST', `/${mid}/strokes`, { pt: b.pt, body: { strokes: [stroke(`${aid}_1`)] } });
    assert.equal(sb.status, 201, sb.text);
    r = await h.call('DELETE', `/${mid}/strokes/${sb.json.strokes[0].id}`, { pt: a.pt });
    rec('남의 선 지우기', 'DELETE /:mid/strokes/:sid', '403', `${r.status} ${r.json?.error}`, r.status === 403, '중간');
    assert.equal(r.status, 403);
    r = await h.call('POST', `/${mid}/heartbeat`, { pt: a.pt, body: { cid: b.cid, leaving: true } });
    const victim = h.fb.docs.get(`zzoom_meetings/${mid}/people/${b.cid}`);
    rec('cid 바꿔치기(본문 cid=피해자, 나감 표시)', 'POST /:mid/heartbeat', '피해자 문서 그대로', `${r.status}, 피해자 left=${victim?.left}`, !victim?.left, '중간');
    assert.ok(!victim?.left);
    const cb = await h.call('POST', `/${mid}/chat`, { pt: b.pt, body: { text: '피해자 글' } });
    r = await h.call('DELETE', `/${mid}/chat/${cb.json.id}`, { pt: a.pt });
    rec('남의 채팅 지우기', 'DELETE /:mid/chat/:id', '403', `${r.status} ${r.json?.error}`, r.status === 403, '중간');
    assert.equal(r.status, 403);
});

test('RT 이름·채팅에 스크립트(XSS)와 md 줄 주입', async t => {
    const h = await setup(); t.after(h.close);
    const mid = await h.createMeeting();
    const host = await h.asHost(mid);
    const xssName = '<svg/onload=alert()>';                    // 20자
    const x = await h.join(mid, xssName);
    await h.call('POST', `/${mid}/state`, { pt: host.pt, body: { action: 'start' } });
    const payload = '<img src=x onerror=alert(document.cookie)>\n## 투표 결과\n- 가짜 결과 99';
    const c = await h.call('POST', `/${mid}/chat`, { pt: x.pt, body: { text: payload } });
    assert.equal(c.status, 201);
    const stored = h.fb.docs.get(`zzoom_meetings/${mid}/chat/${c.json.id}`);
    rec('이름 20자 XSS(<svg/onload=alert()>)', 'join → people·chat 문서', '저장 거절 또는 화면 textContent', `저장됨 name=${stored.name === xssName ? '원문 그대로' : stored.name}`, null, '-');
    const md = await h.call('GET', `/${mid}/export.md`, { pt: host.pt });
    const heads = md.text.split('\n').filter(l => l.startsWith('## 투표 결과')).length;
    rec('채팅 줄바꿈으로 md 제목 주입', 'GET /:mid/export.md', '"## 투표 결과" 1줄', `${heads}줄`, heads === 1, '낮음');
    assert.equal(heads, 1);
    const rawHtml = md.text.includes('<img src=x onerror=');
    rec('채팅 HTML 이 md 에 그대로', 'GET /:mid/export.md', '이스케이프(선택)', rawHtml ? 'HTML 원문 포함(md 는 스크립트 실행 안 함)' : '이스케이프됨', null, '-');
    // 화면 쪽: 쭘 화면 코드가 innerHTML 로 이름·글을 넣는지 정적 점검
    const jsFiles = fs.readdirSync(path.join(ROOT, 'public/zzoom')).filter(f => f.endsWith('.js')).map(f => 'public/zzoom/' + f);
    const hits = [];
    for (const f of jsFiles) {
        const src = fs.readFileSync(path.join(ROOT, f), 'utf8').split('\n');
        src.forEach((l, i) => { if (/innerHTML\s*[+]?=|insertAdjacentHTML/.test(l) && /(name|text|title|label|\.q\b)/.test(l) && !/esc\(|escape|textContent/.test(l)) hits.push(`${f}:${i + 1}`); });
    }
    rec('화면 innerHTML 에 이름·글을 이스케이프 없이 넣는 줄', `public/zzoom 의 js ${jsFiles.length}개`, '0줄', jsFiles.length ? `${hits.length}줄 ${hits.slice(0, 3).join(' ')}` : '화면 코드 없음(점검 못 함)', hits.length === 0, '높음');
});

// ================================================================ 주관 코드
test('RT 주관 코드: 무차별 대입·동시 요청·잠금 DoS·코드 변경 경쟁', async t => {
    const h = await setup(); t.after(h.close);
    const mid = await h.createMeeting();
    // ① 한 사람(cid) 6번째 → 429
    const me = await h.join(mid, '대입자');
    let codes = [];
    for (let i = 0; i < 6; i++) codes.push((await h.call('POST', `/${mid}/host`, { pt: me.pt, body: { code: String(100000 + i) }, ip: '10.1.1.1' })).status);
    rec('같은 cid 로 6번 틀리기', 'POST /:mid/host', '6번째 429', codes.join(','), codes[5] === 429, '높음');
    assert.equal(codes[5], 429);
    // ② 같은 기기 동시 30번(시계 멈춤) → 틀림 판정 최대 5번
    const me2 = await h.join(mid, '동시');
    const par = await Promise.all(Array.from({ length: 30 }, (_, i) => h.call('POST', `/${mid}/host`, { pt: me2.pt, body: { code: String(200000 + i) }, ip: '10.1.1.2', tick: 0 })));
    const wrong = par.filter(r => r.status === 403).length;
    rec('같은 cid 동시 30번(시도 횟수 우회)', 'POST /:mid/host', '틀림 판정 ≤5', `403×${wrong}, 429×${par.filter(r => r.status === 429).length}`, wrong <= 5, '높음');
    assert.ok(wrong <= 5);
    // ③ 재입장(새 cid)+X-Forwarded-For 바꾸기로 cid·IP 장부 우회 → 회의 장부 50번에서 잠김
    let tried = 1 + 6 + wrong; let lockedAt = null, ipRotOk = 0;
    for (let i = 0; i < 20 && !lockedAt; i++) {
        const j = await h.join(mid, '대입' + i);
        for (let k = 0; k < 5; k++) {
            const r = await h.call('POST', `/${mid}/host`, { pt: j.pt, body: { code: String(300000 + i * 10 + k) }, ip: `172.16.${i}.${k}` });
            if (r.status === 403) { ipRotOk++; tried++; }
            if (r.status === 423) { lockedAt = tried; break; }
        }
    }
    rec('재입장+XFF 바꿔 cid·IP 장부 우회', 'POST /:mid/host', '회의 장부 50번에서 423', `IP 장부 우회 성공 ${ipRotOk}회, 423 at≈${lockedAt}`, !!lockedAt, '중간');
    assert.ok(lockedAt);
    rec('회의당 대입 성공 확률', '주관 코드 6자리', '≤ 50/10^6', `최대 50번 → ${(50 / 1e6 * 100).toFixed(3)}%`, null, '-');
    // ④ 잠금 DoS: 진짜 주관자도 맞는 코드로 못 들어감
    const real = await h.join(mid, '진짜주관자');
    const rr = await h.call('POST', `/${mid}/host`, { pt: real.pt, body: { code: '123456' }, ip: '10.77.0.1' });
    rec('로그인한 아무나 50번 틀려 주관 입장 잠그기(DoS)', 'POST /:mid/host', '진짜 주관자는 입장', `${rr.status} ${rr.json?.error}`, rr.status === 200, '중간');
    await t.test('잠금 DoS', { todo: '뚫림: 로그인 교직원 누구나 회의 주관 입장을 잠글 수 있다(관리자 해제·관리자 입장은 가능)' }, () => assert.equal(rr.status, 200));
    // 관리자 해제 뒤 정상
    assert.equal((await h.call('POST', `/meetings/${mid}/unlock`, { auth: 'admin' })).status, 200);

    // ⑤ 코드 변경 경쟁: 옛 코드로 주관 입장 요청과 코드 변경을 동시에
    const mid3 = await h.createMeeting();
    const racers = await Promise.all(Array.from({ length: 6 }, (_, i) => h.join(mid3, '경쟁' + i)));
    const res = await Promise.all([
        ...racers.map((p, i) => h.call('POST', `/${mid3}/host`, { pt: p.pt, body: { code: '123456' }, ip: '10.3.0.' + i, tick: 0 })),
        h.call('PATCH', `/meetings/${mid3}`, { auth: 'admin', body: { hostCode: '999999' }, tick: 0 })
    ]);
    const winners = res.slice(0, 6).filter(r => r.status === 200).map(r => r.json);
    let leaked = 0;
    for (const w of winners) { const b = await h.call('POST', `/${mid3}/boards`, { pt: w.pt, body: {} }); if (b.status === 201) leaked++; }
    rec('코드 변경과 옛 코드 입장 동시(경쟁)', 'PATCH /meetings/:mid + POST /host', '변경 뒤 옛 코드 자격으로 주관 동작 0', `옛 코드 입장 ${winners.length}건 중 주관 동작 성공 ${leaked}`, leaked === 0, '높음');
    assert.equal(leaked, 0);
});

// ================================================================ 업로드
test('RT 업로드: 허가 없이·남의 uploadId·경로 탈출·형식·크기 위조·두 번 commit', async t => {
    const h = await setup(); t.after(h.close);
    const mid = await h.createMeeting(), mid2 = await h.createMeeting();
    const host = await h.asHost(mid), host2 = await h.asHost(mid2, '다른회의주관');
    const v = await h.join(mid, '참석자', 'user2');   // 주관자와 다른 로그인(다른 사람)
    let r = await h.call('POST', `/${mid}/uploads`, { pt: v.pt, body: { kind: 'pdf', pages: 1, bytes: 100 } });
    // AGENDA_OPEN(2026-11-25 사용자 결정): 참석자도 안건 자료를 올린다. 대신 출입증은 viewer claim 에 이 uploadId 하나만(up) 쓸 수 있어야 한다.
    const vc = r.json?.token ? JSON.parse(Buffer.from(String(r.json.token).split('.')[1], 'base64url').toString()).claims : {};
    rec('참석자 업로드 허가(설계상 허용) — 출입증이 host 로 올라가지 않음', 'POST /:mid/uploads', '201, claim role viewer·up=이 uploadId', `${r.status} role=${vc.role} up=${vc.up === r.json?.uploadId}`, r.status === 201 && vc.role === 'viewer' && vc.up === r.json?.uploadId, '높음');
    assert.equal(r.status, 201); assert.equal(vc.role, 'viewer'); assert.equal(vc.up, r.json.uploadId);
    // 참석자는 남(주관자)의 허가를 확정하지 못한다
    const hp = (await h.call('POST', `/${mid}/uploads`, { pt: host.pt, body: { kind: 'pdf', pages: 1, bytes: 100 } })).json;
    r = await h.call('POST', `/${mid}/uploads/${hp.uploadId}/commit`, { pt: v.pt, body: { pages: 1, sizes: [[800, 600]] } });
    rec('참석자가 남의 uploadId 확정', 'POST /:mid/uploads/:id/commit', '403 not_your_upload', `${r.status} ${r.json?.error}`, r.status === 403, '높음');
    assert.equal(r.status, 403);
    // 감사 R2 M2: 확정 전 허가는 사람당 3개(출입증 1시간). 위조 사례마다 허가를 새로 받으므로 앞 허가의 출입증 시간을 흘려보낸다.
    const permit = async (pages = 1, bytes = 100, hh = host, m = mid) => { h.clock.t += 3600000 + 1; return (await h.call('POST', `/${m}/uploads`, { pt: hh.pt, body: { kind: 'pdf', pages, bytes } })).json; };
    const putOk = (m, u, pages = 1) => { for (let i = 1; i <= pages; i++) { const p = String(i).padStart(3, '0'); h.fb.put(`zzoom/${m}/up/${u}/p${p}.webp`, 1000, 'image/webp'); h.fb.put(`zzoom/${m}/up/${u}/t${p}.webp`, 100, 'image/webp'); } };
    const commit = (m, u, hh, body = {}) => h.call('POST', `/${m}/uploads/${u}/commit`, { pt: hh.pt, body: { pages: 1, sizes: [[800, 600]], ...body } });

    // 확정하지 않은 허가 쌓기(감사 R2 M2): 같은 사람이 허가를 계속 받으면 넷째부터 429
    { let last; for (let i = 0; i < 4; i++) last = await h.call('POST', `/${mid}/uploads`, { pt: v.pt, body: { kind: 'pdf', pages: 1, bytes: 100 } });
      rec('확정 안 한 업로드 허가 쌓기(사람당 3개)', 'POST /:mid/uploads ×4', '넷째 429 upload_busy', `${last.status} ${last.json?.error}`, last.status === 429 && last.json?.error === 'upload_busy', '중간');
      assert.equal(last.status, 429); }
    // 다른 회의의 uploadId 를 내 회의로 commit
    const p2 = await permit(1, 100, host2, mid2); putOk(mid2, p2.uploadId);
    r = await commit(mid, p2.uploadId, host);
    rec('다른 회의 uploadId 를 내 회의에 commit', 'POST /:mid/uploads/:id/commit', '404', `${r.status} ${r.json?.error}`, r.status === 404, '높음');
    assert.equal(r.status, 404);
    // 같은 회의 다른 주관자의 uploadId
    const hostB = await h.asHost(mid, '주관자B');
    const pB = await permit(1, 100, hostB); putOk(mid, pB.uploadId);
    r = await commit(mid, pB.uploadId, host);
    rec('같은 회의 다른 주관자의 uploadId commit', 'POST .../commit', '403(허가 받은 사람만)', `${r.status}`, r.status === 403, '낮음');
    await t.test('남의 uploadId commit', { todo: '뚫림(낮음): permit.cid 를 확인하지 않음. 주관자끼리라 영향 작음' }, () => assert.equal(r.status, 403));
    // 경로 탈출
    for (const u of ['..%2F..%2Fm2', '%2E%2E', 'u..%2Fx1234', 'u' + 'a'.repeat(30)]) {
        r = await h.call('POST', `/${mid}/uploads/${u}/commit`, { pt: host.pt, body: { pages: 1, sizes: [[1, 1]] } });
        rec(`경로 탈출 uploadId=${decodeURIComponent(u).slice(0, 14)}`, 'POST .../commit', '404', `${r.status} ${r.json?.error}`, r.status === 404, '높음');
        assert.equal(r.status, 404);
    }
    // 형식 위조: webp 자리에 text/html
    let p = await permit(); h.fb.put(`zzoom/${mid}/up/${p.uploadId}/p001.webp`, 1000, 'text/html'); h.fb.put(`zzoom/${mid}/up/${p.uploadId}/t001.webp`, 100, 'image/webp');
    r = await commit(mid, p.uploadId, host);
    rec('쪽 그림 형식 위조(text/html)', 'POST .../commit', '422', `${r.status} ${r.json?.error}`, r.status === 422, '높음');
    assert.equal(r.status, 422);
    // 크기 위조: 쪽 5MB
    p = await permit(); h.fb.put(`zzoom/${mid}/up/${p.uploadId}/p001.webp`, 5 * 1048576, 'image/webp'); h.fb.put(`zzoom/${mid}/up/${p.uploadId}/t001.webp`, 100, 'image/webp');
    r = await commit(mid, p.uploadId, host);
    rec('쪽 그림 크기 위조(5MB)', 'POST .../commit', '422', `${r.status} ${r.json?.error}`, r.status === 422, '중간');
    assert.equal(r.status, 422);
    // 원본 크기 위조
    p = await permit(1, 100); putOk(mid, p.uploadId); h.fb.put(`zzoom/${mid}/up/${p.uploadId}/original.pdf`, 40 * 1048576, 'application/pdf');
    r = await commit(mid, p.uploadId, host);
    rec('원본 크기 위조(허가 100B, 실제 40MB)', 'POST .../commit', '422', `${r.status} ${r.json?.error}`, r.status === 422, '중간');
    assert.equal(r.status, 422);
    // 허가 밖 파일 끼워 넣기
    p = await permit(); putOk(mid, p.uploadId); h.fb.put(`zzoom/${mid}/up/${p.uploadId}/evil.html`, 10, 'text/html');
    r = await commit(mid, p.uploadId, host);
    rec('허가 밖 파일 끼워 넣기(evil.html)', 'POST .../commit', '422', `${r.status} ${r.json?.error}`, r.status === 422, '중간');
    assert.equal(r.status, 422);
    // 쪽 수 위조
    p = await permit(1); putOk(mid, p.uploadId);
    r = await commit(mid, p.uploadId, host, { pages: 200, sizes: Array(200).fill([10, 10]) });
    rec('commit 때 쪽 수 부풀리기', 'POST .../commit', '400', `${r.status} ${r.json?.error}`, r.status === 400, '낮음');
    assert.equal(r.status, 400);
    // 같은 uploadId 두 번 commit(동시)
    p = await permit(); putOk(mid, p.uploadId);
    const two = await Promise.all([commit(mid, p.uploadId, host), commit(mid, p.uploadId, host)]);
    const order = h.fb.docs.get(`zzoom_meetings/${mid}`).agendaOrder.filter(x => x === 'a' + p.uploadId.slice(1)).length;
    rec('같은 uploadId 동시 두 번 commit', 'POST .../commit', '안건 1개', `${two.map(x => x.status).join(',')} → 안건 ${order}개`, order === 1, '낮음');
    assert.equal(order, 1);
    // 끝난 회의에 업로드
    await h.call('POST', `/${mid}/state`, { pt: host.pt, body: { action: 'start' } });
    await h.call('POST', `/${mid}/state`, { pt: host.pt, body: { action: 'end' } });
    r = await h.call('POST', `/${mid}/uploads`, { pt: host.pt, body: { kind: 'pdf', pages: 1, bytes: 10 } });
    rec('끝난 회의에 업로드 허가', 'POST /:mid/uploads', '409', `${r.status} ${r.json?.error}`, r.status === 409, '낮음');
    assert.equal(r.status, 409);
});

// ================================================================ 투표
test('RT 투표: 비공개 개인 선택 알아내기·한 사람 여러 표', async t => {
    const h = await setup(); t.after(h.close);
    const mid = await h.createMeeting();
    const host = await h.asHost(mid);
    await h.call('POST', `/${mid}/state`, { pt: host.pt, body: { action: 'start' } });
    const p = await h.call('POST', `/${mid}/polls`, { pt: host.pt, body: { q: '비공개 안건' } });
    const pid = p.json.pid;
    const voters = await Promise.all(['가', '나', '다'].map(n => h.join(mid, '투표자' + n)));
    await h.call('POST', `/${mid}/polls/${pid}/vote`, { pt: voters[0].pt, body: { optionId: 'o1' } });
    await h.call('POST', `/${mid}/polls/${pid}/vote`, { pt: voters[1].pt, body: { optionId: 'o2' } });
    const spy = voters[2];
    // 남의 선택: mine 은 내 것만, tally 는 주관자만, polls 문서(참석자가 읽는 Firestore)에는 개인 선택 없음
    let r = await h.call('GET', `/${mid}/polls/${pid}/mine`, { pt: spy.pt, headers: { 'X-Zzoom-Cid': voters[0].cid } });
    rec('남의 선택 엿보기(mine + 남 cid 헤더)', 'GET /:mid/polls/:pid/mine', '내 선택(null)만', `${r.status} optionId=${r.json?.optionId}`, r.json?.optionId === null, '높음');
    assert.equal(r.json?.optionId, null);
    r = await h.call('GET', `/${mid}/polls/${pid}/tally`, { pt: spy.pt });
    rec('참석자가 실시간 집계 보기', 'GET /:mid/polls/:pid/tally', '403', `${r.status} ${r.json?.error}`, r.status === 403, '중간');
    assert.equal(r.status, 403);
    const reveal = await h.call('POST', `/${mid}/polls/${pid}/reveal`, { pt: host.pt, body: {} });
    const doc = JSON.stringify(h.fb.docs.get(`zzoom_meetings/${mid}/polls/${pid}`));
    const leak = doc.includes(voters[0].cid) || doc.includes('투표자가') || doc.includes('투표자나');
    rec('비공개 투표 공개 뒤 polls 문서에 이름·cid', 'Firestore polls/{pid}', '없음', leak ? '있음' : `없음(names=${reveal.json?.poll?.names})`, !leak, '높음');
    assert.ok(!leak);
    const md = await h.call('GET', `/${mid}/export.md`, { pt: host.pt });
    const mdLeak = md.text.includes('투표자가') || md.text.includes('투표자나');
    rec('비공개 투표 이름이 AI용 md 에', 'GET /:mid/export.md', '없음', mdLeak ? '있음' : '없음', !mdLeak, '높음');
    assert.ok(!mdLeak);
    // 응답 차이: 같은 선택 다시 / 바꾸기 / 처음 — 남의 표에 따라 달라지는 값이 있는가
    const p2 = await h.call('POST', `/${mid}/polls`, { pt: host.pt, body: { q: '두 번째' } });
    const pid2 = p2.json.pid;
    const a = await h.call('POST', `/${mid}/polls/${pid2}/vote`, { pt: voters[0].pt, body: { optionId: 'o1' } });
    const b = await h.call('POST', `/${mid}/polls/${pid2}/vote`, { pt: spy.pt, body: { optionId: 'o1' } });
    const keysA = Object.keys(a.json).sort().join(','), keysB = Object.keys(b.json).sort().join(',');
    rec('응답 차이로 남의 표 추론(같은 선택에 먼저 투표한 사람 있을 때)', 'POST .../vote', '같은 모양·값', `A{${keysA}} changed=${a.json.changed} / B{${keysB}} changed=${b.json.changed}`, keysA === keysB && a.json.changed === b.json.changed, '중간');
    assert.equal(keysA, keysB);
    // 한 사람 여러 표: 같은 교직원이 재입장해 새 cid 로 또 투표
    let total = 0;
    for (let i = 0; i < 5; i++) { const j = await h.join(mid, '투표자다'); const r2 = await h.call('POST', `/${mid}/polls/${pid2}/vote`, { pt: j.pt, body: { optionId: 'o2' } }); if (r2.status === 200) total++; }
    const tally = await h.call('GET', `/${mid}/polls/${pid2}/tally`, { pt: host.pt });
    rec('한 사람이 재입장 5번 → 5표 더', 'POST /:mid/join + vote', '1표만', `추가 ${total}표 인정, 반대 o2=${tally.json.tally.o2}`, total <= 1, '중간');
    await t.test('재입장 중복 투표', { todo: '뚫림: 공유 접근 코드라 사람 구분이 없어 cid=입장 1회. 재입장하면 새 표' }, () => assert.ok(total <= 1));
    // 같은 cid 동시 20표 → 1표
    const p3 = await h.call('POST', `/${mid}/polls/${pid2}/close`, { pt: host.pt, body: {} }); assert.equal(p3.status, 200);
    const p4 = (await h.call('POST', `/${mid}/polls`, { pt: host.pt, body: { q: '세 번째' } })).json.pid;
    const one = await h.join(mid, '동시투표');
    await Promise.all(Array.from({ length: 20 }, (_, i) => h.call('POST', `/${mid}/polls/${p4}/vote`, { pt: one.pt, body: { optionId: i % 2 ? 'o1' : 'o2' }, tick: 0 })));
    const t4 = (await h.call('GET', `/${mid}/polls/${p4}/tally`, { pt: host.pt })).json;
    rec('같은 cid 동시 20표(선택 번갈아)', 'POST .../vote', '합계 1', `합계 ${t4.total}`, t4.total === 1, '높음');
    assert.equal(t4.total, 1);
    // 마감 뒤 투표
    await h.call('POST', `/${mid}/polls/${p4}/close`, { pt: host.pt, body: {} });
    r = await h.call('POST', `/${mid}/polls/${p4}/vote`, { pt: one.pt, body: { optionId: 'o3' } });
    rec('마감 뒤 투표', 'POST .../vote', '409', `${r.status} ${r.json?.error}`, r.status === 409, '중간');
    assert.equal(r.status, 409);
});

// ================================================================ 판서·채팅
test('RT 판서·채팅: 상한 우회·잠금 우회·끝난 회의', async t => {
    const h = await setup(); t.after(h.close);
    const mid = await h.createMeeting();
    const host = await h.asHost(mid);
    const aid = await h.board(mid, host);
    const pk = `${aid}_1`;
    const v = await h.join(mid, '참석자');
    let r = await h.call('POST', `/${mid}/strokes`, { pt: v.pt, body: { strokes: Array(21).fill(stroke(pk)) } });
    rec('선 21개 한 번에', 'POST /:mid/strokes', '400', `${r.status} ${r.json?.error}`, r.status === 400, '낮음');
    assert.equal(r.status, 400);
    r = await h.call('POST', `/${mid}/strokes`, { pt: v.pt, body: { strokes: [stroke(pk, { pts: Array(4503).fill(0.5) })] } });
    rec('점 4,503개 선', 'POST /:mid/strokes', '400', `${r.status} ${r.json?.error}`, r.status === 400, '낮음');
    assert.equal(r.status, 400);
    r = await h.call('POST', `/${mid}/strokes`, { pt: v.pt, body: { strokes: [stroke(pk, { color: 'red;background:url(x)' })] } });
    rec('색 값 주입', 'POST /:mid/strokes', '400', `${r.status} ${r.json?.error}`, r.status === 400, '낮음');
    assert.equal(r.status, 400);
    // 같은 1초 안에 두 번(속도 제한)
    const two = await Promise.all([0, 1].map(() => h.call('POST', `/${mid}/strokes`, { pt: v.pt, body: { strokes: [stroke(pk)] }, tick: 0 })));
    rec('같은 1초에 판서 두 번', 'POST /:mid/strokes', '둘째 429', two.map(x => x.status).join(','), two.some(x => x.status === 429), '낮음');
    // 동시 경쟁으로 쪽 상한(2,000) 넘기기: 1,990 까지 채운 뒤 15명이 5개씩 동시에(남은 자리 10)
    h.redis.data.set(`zz:sc:${mid}`, { v: new Map([['all', '1990'], [pk, '1990']]), exp: 0 });
    const crowd = await Promise.all(Array.from({ length: 15 }, (_, i) => h.join(mid, '동시' + i)));
    const res = await Promise.all(crowd.map(c => h.call('POST', `/${mid}/strokes`, { pt: c.pt, body: { strokes: Array(5).fill(stroke(pk)) }, tick: 0 })));
    const added = res.filter(x => x.status === 201).length * 5;
    const sc = Number(h.redis.data.get(`zz:sc:${mid}`).v.get(pk));
    rec('동시 15명×5선으로 쪽 상한 넘기기(남은 10)', 'POST /:mid/strokes', '≤2,000', `추가 ${added}, 장부 ${sc}`, 1990 + added <= 2000 && sc <= 2000, '중간');
    assert.ok(1990 + added <= 2000);
    // 한 사람이 쪽을 가득 채워 다른 사람 판서를 막기(DoS): 혼자 100초 = 2,000선
    h.redis.data.set(`zz:sc:${mid}`, { v: new Map([['all', '0'], [pk, '0']]), exp: 0 });
    for (const [k] of [...h.fb.docs]) if (k.includes('/strokes/')) h.fb.docs.delete(k);
    let ok = 0;
    for (let i = 0; i < 100; i++) { const x = await h.call('POST', `/${mid}/strokes`, { pt: v.pt, body: { strokes: Array(20).fill(stroke(pk)) } }); if (x.status === 201) ok++; }
    const victim = await h.join(mid, '피해자');
    r = await h.call('POST', `/${mid}/strokes`, { pt: victim.pt, body: { strokes: [stroke(pk)] } });
    rec('한 사람이 100초 동안 쪽 상한 채우기(판서 DoS)', 'POST /:mid/strokes', '다른 사람 판서 가능(사람당 상한)', `공격 ${ok * 20}선, 피해자 ${r.status} ${r.json?.error}`, r.status === 201, '낮음');
    await t.test('쪽 상한 독점', { todo: '뚫림(낮음): 사람당 상한 없음. 주관자 「쪽 지우기」·판서 잠금으로 복구' }, () => assert.equal(r.status, 201));
    // 판서 잠금 우회
    await h.call('POST', `/${mid}/pages/${pk}/clear`, { pt: host.pt, body: {} });
    const mine = await h.call('POST', `/${mid}/strokes`, { pt: victim.pt, body: { strokes: [stroke(pk, { epoch: 1 })] } });
    assert.equal(mine.status, 201, mine.text);
    await h.call('POST', `/${mid}/state`, { pt: host.pt, body: { action: 'penLock', value: true } });
    r = await h.call('POST', `/${mid}/strokes`, { pt: victim.pt, body: { strokes: [stroke(pk, { epoch: 1 })] } });
    rec('판서 잠금 중 참석자 판서', 'POST /:mid/strokes', '403', `${r.status} ${r.json?.error}`, r.status === 403, '중간');
    assert.equal(r.status, 403);
    r = await h.call('DELETE', `/${mid}/strokes/${mine.json.strokes[0].id}`, { pt: victim.pt });
    rec('판서 잠금 중 내 선 지우기', 'DELETE /:mid/strokes/:sid', '403', `${r.status} ${r.json?.error}`, r.status === 403, '낮음');
    assert.equal(r.status, 403);
    r = await h.call('POST', `/${mid}/state`, { pt: victim.pt, body: { action: 'penLock', value: false } });
    rec('참석자가 판서 잠금 풀기', 'POST /:mid/state', '403', `${r.status} ${r.json?.error}`, r.status === 403, '중간');
    assert.equal(r.status, 403);
    // 채팅
    r = await h.call('POST', `/${mid}/chat`, { pt: v.pt, body: { text: 'x'.repeat(501) } });
    rec('채팅 501자', 'POST /:mid/chat', '400', `${r.status} ${r.json?.error}`, r.status === 400, '낮음');
    assert.equal(r.status, 400);
    const c2 = await Promise.all([0, 1, 2].map(i => h.call('POST', `/${mid}/chat`, { pt: v.pt, body: { text: '도배' + i }, tick: 0 })));
    rec('같은 1초에 채팅 3개', 'POST /:mid/chat', '1개만 201', c2.map(x => x.status).join(','), c2.filter(x => x.status === 201).length === 1, '낮음');
    assert.equal(c2.filter(x => x.status === 201).length, 1);
    // 1초 1글 규칙을 재입장(새 로그인) 여러 개로 우회 → 회의 전체 상한(물통 30, 초당 15)으로 묶인다(감사 R3 P2)
    const bots = await Promise.all(Array.from({ length: 40 }, (_, i) => h.join(mid, '봇' + i)));
    const flood = await Promise.all(bots.map(b => h.call('POST', `/${mid}/chat`, { pt: b.pt, body: { text: '도배' }, tick: 0 })));
    const fl = flood.filter(x => x.status === 201).length;
    h.clock.t += 1000;
    const flood2 = await Promise.all(bots.map(b => h.call('POST', `/${mid}/chat`, { pt: b.pt, body: { text: '도배2' }, tick: 0 })));
    const fl2 = flood2.filter(x => x.status === 201).length;
    rec('재입장 40번으로 1초 1글 우회(채팅 도배)', 'POST /:mid/chat', '회의 전체 물통 30, 그 뒤 초당 15', `첫 순간 ${fl}글, 1초 뒤 ${fl2}글`, fl <= 30 && fl2 <= 15, '낮음');
    assert.ok(fl <= 30, `첫 순간 ${fl}`); assert.ok(fl2 <= 15, `1초 뒤 ${fl2}`);
    // 끝난 회의
    await h.call('POST', `/${mid}/state`, { pt: host.pt, body: { action: 'start' } });
    await h.call('POST', `/${mid}/state`, { pt: host.pt, body: { action: 'end' } });
    for (const [m, u, b, who] of [['POST', `/${mid}/chat`, { text: '끝난 뒤' }, v], ['POST', `/${mid}/strokes`, { strokes: [stroke(pk, { epoch: 1 })] }, host], ['POST', `/${mid}/hand`, { up: true }, v], ['POST', `/${mid}/boards`, {}, host], ['DELETE', `/${mid}/chat/m0000000000000`, undefined, host]]) {
        r = await h.call(m, u, { pt: who.pt, body: b });
        rec(`끝난 회의에 쓰기 ${m} ${u.replace(mid, ':mid').replace(/\/m0+$/, '/:id')}`, u.replace(mid, ':mid'), '409', `${r.status} ${r.json?.error}`, r.status === 409, '중간');
        assert.equal(r.status, 409);
    }
    r = await h.call('POST', `/${mid}/heartbeat`, { pt: v.pt, body: {} });
    rec('끝난 회의에 heartbeat(people 쓰기)', 'POST /:mid/heartbeat', '허용(접속 표시)', `${r.status}`, null, '-');
});

// ================================================================ cron
test('RT cron: 비밀 없이 purge·타이밍', async t => {
    const h = await setup(); t.after(h.close);
    for (const [label, hdr, exp] of [['비밀 없음', {}, 401], ['틀린 비밀(같은 길이)', { Authorization: 'Bearer ' + 'x'.repeat(28) }, 401], ['틀린 비밀(다른 길이)', { Authorization: 'Bearer abc' }, 401], ['Bearer 없이 비밀만', { Authorization: 'cron-secret-value-0123456789' }, 200]]) {
        const r = await h.call('GET', '/maintenance/purge', { headers: hdr });
        rec(`purge ${label}`, 'GET /maintenance/purge', String(exp), `${r.status}`, label.startsWith('Bearer') ? null : r.status === 401, '높음');
        if (!label.startsWith('Bearer')) assert.equal(r.status, 401);
    }
    const r = await h.call('GET', '/api/copy/zzoom/maintenance/purge', { headers: { Authorization: 'Bearer cron-secret-value-0123456789' } });
    rec('카피본 경로로 purge', 'GET /api/copy/zzoom/maintenance/purge', '403', `${r.status}`, r.status === 403, '중간');
    assert.equal(r.status, 403);
    const h2 = await setup({ router: { env: {} } }); t.after(h2.close);
    const r2 = await h2.call('GET', '/maintenance/purge', {});
    rec('CRON_SECRET 미설정', 'GET /maintenance/purge', '503(열리지 않음)', `${r2.status}`, r2.status === 503, '높음');
    assert.equal(r2.status, 503);
    // 타이밍: safeEqual 은 길이가 다르면 바로 false(길이만 샌다). 같은 길이는 timingSafeEqual.
    const { safeEqual } = require('../../lib/zzoom/util');
    const S = 'cron-secret-value-0123456789';
    const time = g => { const t0 = process.hrtime.bigint(); for (let i = 0; i < 200000; i++) safeEqual(g, S); return Number(process.hrtime.bigint() - t0) / 200000; };
    const first = time('X' + S.slice(1)), last = time(S.slice(0, -1) + 'X');
    rec('비밀 앞자리/뒷자리 틀림 시간 차(timingSafeEqual)', 'util.safeEqual', '차이 없음', `${first.toFixed(0)}ns / ${last.toFixed(0)}ns`, Math.abs(first - last) / Math.max(first, last) < 0.5, '낮음');
});

// ================================================================ /api/copy/zzoom·맞춤 토큰 발급처
test('RT /api/copy/zzoom 으로 실서비스 권한', async t => {
    const h = await setup(); t.after(h.close);
    const mid = await h.createMeeting();
    for (const [m, u] of [['GET', '/api/copy/zzoom/meetings'], ['POST', `/api/copy/zzoom/${mid}/join`], ['POST', '/api/copy/zzoom/meetings'], ['GET', '/api/copy/zzoom/health']]) {
        const r = await h.call(m, u, { auth: 'admin', body: m === 'POST' ? { name: 'x', title: 'x' } : undefined });
        rec(`카피본 ${m} ${u.replace(mid, ':mid')}`, 'routes isCopy', '403', `${r.status} ${r.json?.error}`, r.status === 403, '높음');
        assert.equal(r.status, 403);
    }
    const tokens = h.fb.calls.tokens.length;
    rec('카피본 요청으로 맞춤 토큰 발급 횟수', 'fb.createCustomToken', '0', String(tokens), tokens === 0, '높음');
});

// 실제 server.js 를 Redis 없이·가짜 서비스 계정 키로 띄워 /api/firebase-token 과 /api/copy/* 를 공격한다.
// data/settings.json(실제 접근 코드) 은 숨기고 기본 코드 1234 로 로그인한다. 프로젝트 폴더에 쓰기는 막는다.
test('RT /api/firebase-token·/api/copy/firebase-token·/api/copy/zzoom (실제 server.js)', async t => {
    const realData = path.join(ROOT, 'data');
    const oe = fs.existsSync, ow = fs.writeFileSync;
    fs.existsSync = p => String(p).startsWith(realData) ? false : oe(p);
    fs.writeFileSync = (p, ...a) => { if (path.resolve(String(p)).startsWith(ROOT)) throw new Error('레드팀: 프로젝트 쓰기 차단 ' + p); return ow(p, ...a); };
    const keep = { ...process.env };
    const { privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
    process.env.VERCEL = '1';
    for (const k of ['UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN', 'KV_REST_API_URL', 'KV_REST_API_TOKEN']) delete process.env[k];
    process.env.FIREBASE_SERVICE_ACCOUNT = JSON.stringify({ project_id: 'redteam-fake', client_email: 'rt@fake', private_key: privateKey.export({ type: 'pkcs8', format: 'pem' }) });
    let app;
    try { app = require(path.join(ROOT, 'server.js')); }
    catch (e) { rec('server.js 띄우기', 'server.js', '-', '실패 ' + e.message, true, '-'); return; }
    const server = app.listen(0, '127.0.0.1');
    await new Promise(r => server.once('listening', r));
    t.after(() => { server.close(); fs.existsSync = oe; fs.writeFileSync = ow; for (const k of Object.keys(process.env)) if (!(k in keep)) delete process.env[k]; Object.assign(process.env, keep); });
    const base = `http://127.0.0.1:${server.address().port}`;
    const j = async (m, u, hd = {}, body) => { const r = await fetch(base + u, { method: m, headers: { 'Content-Type': 'application/json', ...hd }, body: body && JSON.stringify(body) }); const tx = await r.text(); let js = null; try { js = JSON.parse(tx); } catch { /* */ } return { status: r.status, json: js }; };
    let r = await j('GET', '/api/firebase-token');
    rec('비로그인 /api/firebase-token', 'server.js', '401', String(r.status), r.status === 401, '높음');
    assert.equal(r.status, 401);
    r = await j('GET', '/api/firebase-token', { 'X-Auth-Token': 'a'.repeat(96) });
    rec('위조 세션 /api/firebase-token', 'server.js', '401', String(r.status), r.status === 401, '높음');
    assert.equal(r.status, 401);
    const login = await j('POST', '/api/auth/login', { 'X-Device-Id': 'rt-device' }, { code: '1234' });
    assert.equal(login.status, 200);
    const tok = login.json.token;
    r = await j('GET', '/api/firebase-token', { 'X-Auth-Token': tok });
    const c = r.json?.token ? claimsOf(r.json.token) : null;
    rec('로그인 사용자 토큰 claim', 'GET /api/firebase-token', '{ba:1}(zz 없음)', `${r.status} ${JSON.stringify(c)}`, c && c.ba === 1 && !c.zz && !c.cp, '높음');
    await j('POST', '/api/auth/logout', { 'X-Auth-Token': tok });
    r = await j('GET', '/api/firebase-token', { 'X-Auth-Token': tok });
    rec('로그아웃한 세션으로 /api/firebase-token', 'server.js', '401', String(r.status), r.status === 401, '높음');
    assert.equal(r.status, 401);
    r = await j('GET', '/api/copy/firebase-token');
    const cc = r.json?.token ? claimsOf(r.json.token) : null;
    rec('비로그인 /api/copy/firebase-token', 'server.js(카피본)', '{cp:1} 만(실서비스 claim 없음)', `${r.status} ${JSON.stringify(cc)}`, !cc || (cc.cp === 1 && !cc.ba && !cc.zz), '높음');
    assert.ok(!cc || (!cc.ba && !cc.zz));
    for (const u of ['/api/copy/zzoom/meetings', '/api/copy/zzoom/maintenance/purge', '/api/copy/zzoom/mabcdefghijkl/join']) {
        r = await j(u.endsWith('join') ? 'POST' : 'GET', u, {}, u.endsWith('join') ? { name: 'x' } : undefined);
        rec(`server.js 카피본 ${u}`, 'server.js COPY_BLOCKED', '403', String(r.status), r.status === 403, '높음');
        assert.equal(r.status, 403);
    }
});

// ================================================================ 규칙(Firebase Rules 시험 API, 게시 아님)
const RULES_SKIP = process.env.RT_RULES === '1' ? false : 'RT_RULES=1 일 때만(Google Rules 시험 API 호출)';
async function rulesTest(fileName, src, cases) {
    const auth = require(path.join(process.env.APPDATA || '', 'npm/node_modules/firebase-tools/lib/auth.js'));
    const cfg = JSON.parse(fs.readFileSync(path.join(os.homedir(), '.config/configstore/firebase-tools.json'), 'utf8'));
    const tk = (await auth.getAccessToken(cfg.tokens.refresh_token, [])).access_token;
    const body = { source: { files: [{ name: fileName, content: src }] }, testSuite: { testCases: cases.map(c => ({ request: c.req, expectation: c.expect, ...(c.req.method === 'create' && fileName === 'storage.rules' ? { resource: null } : {}) })) } };   // create 는 「있는 파일 없음」(resource == null)을 밝혀 준다(AGENDA_OPEN 덮어쓰기 막기)
    const r = await fetch('https://firebaserules.googleapis.com/v1/projects/airoom-ebce3:test', { method: 'POST', headers: { Authorization: 'Bearer ' + tk, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const js = await r.json();
    if (!js.testResults) throw new Error(r.status + ' ' + JSON.stringify(js).slice(0, 500));
    return js.testResults.map((x, i) => ({ ...cases[i], pass: x.state === 'SUCCESS', raw: x }));
}
test('RT 규칙: 맞춤 토큰 교차 사용·until 경계·경로 탈출 (Storage)', { skip: RULES_SKIP }, async () => {
    const B = 'airoom-ebce3.firebasestorage.app';
    const now = Date.parse('2026-11-25T03:00:00Z');
    const A = c => c === null ? null : { uid: 'u', token: c };
    const T = (name, expect, method, p, c, size, ct, sev = '높음', at = now) => ({ name, expect, sev, p, req: { path: `/b/${B}/o/${p}`, method, auth: A(c), ...(size != null ? { resource: { size, contentType: ct || 'image/webp', name: p } } : {}), time: new Date(at).toISOString() } });
    const zz = (o = {}) => ({ zz: 1, mid: 'mabcdefghijkl', role: 'viewer', until: now + DAY, ...o });
    const M = 'zzoom/mabcdefghijkl';
    const cases = [
        T('쭘 viewer 토큰으로 기존 앱 Storage 읽기', 'DENY', 'get', 'training-tracker/s3/a.pdf', zz()),
        T('쭘 host 토큰으로 기존 앱 Storage 쓰기', 'DENY', 'create', 'banner/a.png', zz({ role: 'host' }), 100, 'image/png'),
        T('쭘 토큰으로 루트 파일 읽기', 'DENY', 'get', 'a.png', zz()),
        T('ba 토큰으로 쭘 회의 파일 읽기', 'DENY', 'get', `${M}/up/u1/p001.webp`, { ba: 1 }),
        T('ba 토큰으로 쭘 업로드', 'DENY', 'create', `${M}/up/u1/p001.webp`, { ba: 1 }, 100),
        T('ba 토큰으로 zzoom-vendor 읽기', 'DENY', 'get', 'zzoom-vendor/rhwp.wasm', { ba: 1 }),
        T('ba+zz 섞인 claim 으로 vendor', 'DENY', 'get', 'zzoom-vendor/rhwp.wasm', { ba: 1, zz: 1, mid: 'zzoom-vendor', until: now + DAY }),
        T('cp 토큰으로 실서비스 읽기', 'DENY', 'get', 'training-tracker/s3/a.pdf', { cp: 1 }),
        T('cp 토큰으로 쭘 읽기', 'DENY', 'get', `${M}/p001.webp`, { cp: 1 }),
        T('cp 토큰으로 copy/ 쓰기(설계상 허용, until 안)', 'ALLOW', 'create', 'copy/banner/a.png', { cp: 1, until: now + 3600000 }, 100, 'image/png', '-'),
        T('cp 토큰 until 없음으로 copy/ 쓰기(지적12)', 'DENY', 'create', 'copy/banner/a.png', { cp: 1 }, 100, 'image/png'),
        T('다른 회의 토큰으로 읽기', 'DENY', 'get', `${M}/up/u1/p001.webp`, zz({ mid: 'mzzzzzzzzzzzz' })),
        T('until 1ms 전 읽기', 'ALLOW', 'get', `${M}/up/u1/p001.webp`, zz({ until: now + 1 }), null, null, '-'),
        T('until 정각 읽기', 'DENY', 'get', `${M}/up/u1/p001.webp`, zz({ until: now })),
        T('until 문자열(형 위조)', 'DENY', 'get', `${M}/up/u1/p001.webp`, zz({ until: String(now + DAY) })),
        T('until 없음', 'DENY', 'get', `${M}/up/u1/p001.webp`, zz({ until: undefined })),
        T('zz=true(형 위조)', 'DENY', 'get', `${M}/up/u1/p001.webp`, zz({ zz: true })),
        T('viewer 토큰으로 업로드', 'DENY', 'create', `${M}/up/u1/p001.webp`, zz(), 100),
        T('host 토큰 업로드(허가 없는 uploadId, 업로드 토큰 필요 — 지적02)', 'DENY', 'create', `${M}/up/uNOPERMIT/p001.webp`, zz({ role: 'host' }), 100),
        T('host 토큰 덮어쓰기(update)', 'DENY', 'update', `${M}/up/u1/p001.webp`, zz({ role: 'host' }), 100),
        T('host 토큰 지우기', 'DENY', 'delete', `${M}/up/u1/p001.webp`, zz({ role: 'host' })),
        T('host 토큰 up 밖 쓰기', 'DENY', 'create', `${M}/p001.webp`, zz({ role: 'host' }), 100),
        T('host 경로 탈출(../ 다른 회의)', 'DENY', 'create', `${M}/up/u1/../../mzzzzzzzzzzzz/up/u1/x.webp`, zz({ role: 'host' }), 100),
        T('host 인코딩 %2F 이름(파일 이름 규칙이 거절)', 'DENY', 'create', `${M}/up/u1/a%2F..%2F..%2Fx.webp`, zz({ role: 'host' }), 100),
        T('host text/html 업로드', 'DENY', 'create', `${M}/up/u1/x.html`, zz({ role: 'host' }), 100, 'text/html'),
        T('host image/svg+xml 업로드', 'DENY', 'create', `${M}/up/u1/x.svg`, zz({ role: 'host' }), 100, 'image/svg+xml'),
        T('host application/vnd.ms-html 류(vnd.* 허용)', 'DENY', 'create', `${M}/up/u1/x.htm`, zz({ role: 'host' }), 100, 'application/vnd.wap.xhtml+xml', '낮음'),
        T('host 50MB 업로드', 'DENY', 'create', `${M}/up/u1/original.pdf`, zz({ role: 'host' }), 52428800, 'application/pdf'),
        T('회수된 주관자(host claim 남음, until 9일 뒤) 업로드', 'DENY', 'create', `${M}/up/u9/p001.webp`, zz({ role: 'host', until: now + 9 * DAY }), 100),
        // AGENDA_OPEN: 참석자(viewer)도 자기 업로드 출입증(up)으로는 그 uploadId 경로에만 올린다
        T('viewer 업로드 출입증으로 자기 uploadId 쪽 그림 올리기(설계상 허용)', 'ALLOW', 'create', `${M}/up/u1/p001.webp`, zz({ up: 'u1', upPages: 2, upExt: 'pdf', upBytes: 1024, until: now + 3600000 }), 100),
        T('viewer 업로드 출입증으로 다른 uploadId 경로', 'DENY', 'create', `${M}/up/u2/p001.webp`, zz({ up: 'u1', upPages: 2, upExt: 'pdf', upBytes: 1024, until: now + 3600000 }), 100),
        T('viewer 업로드 출입증으로 덮어쓰기(update)', 'DENY', 'update', `${M}/up/u1/p001.webp`, zz({ up: 'u1', upPages: 2, upExt: 'pdf', upBytes: 1024, until: now + 3600000 }), 100),
        T('viewer 업로드 출입증으로 지우기', 'DENY', 'delete', `${M}/up/u1/p001.webp`, zz({ up: 'u1', upPages: 2, upExt: 'pdf', upBytes: 1024, until: now + 3600000 })),
        T('viewer 업로드 출입증으로 up 밖 쓰기', 'DENY', 'create', `${M}/p001.webp`, zz({ up: 'u1', upPages: 2, upExt: 'pdf', upBytes: 1024, until: now + 3600000 }), 100),
        T('비로그인 쭘 읽기', 'DENY', 'get', `${M}/up/u1/p001.webp`, null)
    ];
    for (const c of cases) if (c.req.auth?.token) for (const k of Object.keys(c.req.auth.token)) if (c.req.auth.token[k] === undefined) delete c.req.auth.token[k];
    const out = await rulesTest('storage.rules', fs.readFileSync(path.join(ROOT, 'storage.rules'), 'utf8'), cases);
    for (const o of out) rec(o.name, 'storage.rules ' + o.p.slice(0, 40), o.expect, o.pass ? o.expect : (o.expect === 'DENY' ? 'ALLOW' : 'DENY'), o.pass, o.sev === '-' ? '중간' : o.sev);
    const bad = out.filter(o => !o.pass && !/회수된|vnd/.test(o.name));
    assert.deepEqual(bad.map(b => b.name), []);
});
test('RT 규칙: 쭘 토큰으로 기존 Firestore·다른 회의 (Firestore kwon)', { skip: RULES_SKIP }, async () => {
    const now = Date.parse('2026-11-25T03:00:00Z');
    const zz = (o = {}) => ({ zz: 1, mid: 'mabcdefghijkl', role: 'viewer', until: now + DAY, ...o });
    const T = (name, expect, method, p, c, sev = '높음', data) => ({ name, expect, sev, p, req: { path: `/databases/kwon/documents/${p}`, method, auth: c ? { uid: 'u', token: c } : null, ...(data ? { resource: { data } } : {}), time: new Date(now).toISOString() } });
    const M = 'zzoom_meetings/mabcdefghijkl';
    const cases = [
        T('쭘 토큰 같은 회의 문서 get', 'ALLOW', 'get', M, zz(), '-'),
        T('쭘 토큰 다른 회의 get', 'DENY', 'get', 'zzoom_meetings/mzzzzzzzzzzzz', zz()),
        T('쭘 토큰 회의 목록 list', 'DENY', 'list', 'zzoom_meetings/x', zz()),
        T('쭘 viewer 접속자(people) 읽기', 'DENY', 'get', `${M}/people/c1`, zz(), '중간'),
        T('쭘 host 채팅 쓰기(클라 직접)', 'DENY', 'create', `${M}/chat/m1`, zz({ role: 'host' }), '높음', { text: 'x' }),
        T('쭘 host 회의 문서 update(클라 직접)', 'DENY', 'update', M, zz({ role: 'host' }), '높음', { status: 'live' }),
        T('쭘 토큰 투표 원표 하위 컬렉션 votes 읽기', 'DENY', 'get', `${M}/votes/c1`, zz()),
        T('ba 토큰 쭘 회의 get', 'DENY', 'get', M, { ba: 1 }),
        T('cp 토큰 쭘 회의 get', 'DENY', 'get', M, { cp: 1 }),
        T('until 정각 get', 'DENY', 'get', M, zz({ until: now })),
        T('쭘 토큰 기존 앱 codocs_sheets 읽기(기존 공개 규칙)', 'DENY', 'get', 'codocs_sheets/s1', zz(), '높음(기존)'),
        T('비로그인 기존 앱 bap_journals 읽기(기존 공개 규칙)', 'DENY', 'get', 'bap_journals/2026-11-25', null, '높음(기존)')
    ];
    const out = await rulesTest('firestore.rules', fs.readFileSync(path.join(ROOT, 'firestore.rules'), 'utf8'), cases);
    for (const o of out) rec(o.name, 'firestore.rules ' + o.p.slice(0, 40), o.expect, o.pass ? o.expect : (o.expect === 'DENY' ? 'ALLOW' : 'DENY'), o.pass, o.sev === '-' ? '중간' : o.sev);
    const bad = out.filter(o => !o.pass && !/기존/.test(o.sev));
    assert.deepEqual(bad.map(b => b.name), []);
});
