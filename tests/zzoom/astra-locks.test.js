'use strict';
// AUDIT_ASTRA_LOCKS AL01~AL03 회귀 시험.
// AL01: Firestore 출입증(ba·bp/br)에 until(세션 만료와 지금+1시간 중 이른 것), 규칙이 until 을 본다, codocs 가 만료 1분 전에 다시 받는다.
// AL02: 급식일지 인증 전환(이전 인증 버리기·늦은 응답 무효·다른 토큰 합류 금지·실패 시 보호 작업 중단).
// AL03: rateLimit 키가 라우트별 고정 ID 라 경로 대소문자·끝 슬래시로 우회되지 않는다.
// HTML·JS 원문에서 함수를 잘라 vm 에서 가짜 Firebase·fetch 로 돌린다(spa-storage.test.js 와 같은 방식).
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');

const ROOT = path.join(__dirname, '..', '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');

function extract(src, name) {
    const m = new RegExp(`(?:async\\s+)?function\\s+${name}\\s*\\(`).exec(src);
    if (!m) return null;
    let i = src.indexOf('{', m.index + m[0].length - 1);
    const stack = ['{']; i++;
    while (i < src.length && stack.length) {
        const c = src[i], n = src[i + 1];
        const top = stack[stack.length - 1];
        if (top === "'" || top === '"') { if (c === '\\') i++; else if (c === top) stack.pop(); }
        else if (top === '`') {
            if (c === '\\') i++;
            else if (c === '`') stack.pop();
            else if (c === '$' && n === '{') { stack.push('${'); i++; }
        } else if (top === '//') { if (c === '\n') stack.pop(); }
        else if (top === '/*') { if (c === '*' && n === '/') { stack.pop(); i++; } }
        else {
            if (c === '/' && n === '/') { stack.push('//'); i++; }
            else if (c === '/' && n === '*') { stack.push('/*'); i++; }
            else if (c === "'" || c === '"' || c === '`') stack.push(c);
            else if (c === '{' || c === '${') stack.push('{');
            else if (c === '}') stack.pop();
        }
        i++;
    }
    return src.slice(m.index, i);
}
const need = (src, name) => { const s = extract(src, name); assert.ok(s, name + ' 함수가 없다'); return s; };

const b64u = o => Buffer.from(JSON.stringify(o)).toString('base64url');
const fakeJwt = claims => `${b64u({ alg: 'RS256' })}.${b64u({ uid: 'u', claims })}.sig`;
const tick = () => new Promise(r => setImmediate(r));

// ================================================================ AL01 서버 출입증
const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048, privateKeyEncoding: { type: 'pkcs8', format: 'pem' }, publicKeyEncoding: { type: 'spki', format: 'pem' } });
const SA_JSON = JSON.stringify({ client_email: 'sa@x.iam.gserviceaccount.com', private_key: privateKey });
function runHandler(h, req) {
    return new Promise(resolve => {
        const res = { statusCode: 200, set() { return res; }, status(c) { res.statusCode = c; return res; }, json(b) { resolve({ status: res.statusCode, body: b }); } };
        h(req, res);
    });
}
const payloadOf = t => JSON.parse(Buffer.from(t.split('.')[1], 'base64url').toString('utf8'));

test('AL01: 급식일지 출입증(bp/br)에 until = min(세션 만료, 지금+1시간)', () => {
    const st = require('../../lib/storage-token');
    const now = 1_800_000_000_000;
    const DAY = 86400000;
    // 세션이 곧 끝난다(30일 중 29일 23시 50분 지남) → until 은 세션 만료
    const a = st.bapClaimsFor({ role: 'manager', school: 'bap', createdAt: now - 30 * DAY + 10 * 60000 }, now, 30 * DAY);
    assert.equal(a.claims.until, now + 10 * 60000);
    assert.equal(a.claims.bp, 'bap'); assert.equal(a.claims.br, 'm');
    // 세션이 넉넉하면 지금+1시간
    const b = st.bapClaimsFor({ role: 'boss', school: 'bap2', createdAt: now - 60000 }, now, 30 * DAY);
    assert.equal(b.claims.until, now + 3600000);
    // 만든 시각이 없는 옛 세션도 1시간 상한
    const c = st.bapClaimsFor({ role: 'boss', school: 'bap3' }, now, 30 * DAY);
    assert.equal(c.claims.until, now + 3600000);
    // 이미 끝난 세션은 발급하지 않는다
    assert.equal(st.bapClaimsFor({ role: 'boss', school: 'bap', createdAt: now - 31 * DAY }, now, 30 * DAY), null);
});

test('AL01: 급식일지·백암이 출입증 발급 응답의 서명 토큰 claim 에 until 이 들어 있다', async () => {
    const st = require('../../lib/storage-token');
    const env = { FIREBASE_SERVICE_ACCOUNT: SA_JSON };
    const r = await runHandler(st.makeBapHandler({ env }), { bapSession: { role: 'manager', school: 'bap', createdAt: Date.now() }, bapSchool: 'bap' });
    assert.equal(r.status, 200);
    const [h, p, s] = r.body.token.split('.');
    assert.ok(crypto.verify('RSA-SHA256', Buffer.from(h + '.' + p), publicKey, Buffer.from(s, 'base64url')));
    const pl = payloadOf(r.body.token);
    assert.equal(typeof pl.claims.until, 'number');
    assert.ok(pl.claims.until > Date.now() && pl.claims.until <= Date.now() + 3600000);
    const r2 = await runHandler(st.makeHandler({ isCopy: () => false, env }), { session: { role: 'user', expiresAt: Date.now() + 5 * 60000 } });
    const u2 = payloadOf(r2.body.token).claims.until;
    assert.ok(u2 <= Date.now() + 5 * 60000 && u2 > Date.now(), 'ba until 은 세션 만료를 넘지 않는다');
});

// ================================================================ AL01 규칙 본문
for (const f of ['docs/meeting-2026-11-25/firestore_lock_proposal.rules', 'docs/meeting-2026-11-25/publish/firestore.publish+lock.rules']) {
    test(`AL01 ${f}: isBa·bapOk 가 until(ms) > request.time 을 검사한다`, () => {
        const src = read(f);
        for (const fn of ['isBa', 'bapOk']) {
            const m = new RegExp(`function ${fn}\\([^)]*\\)\\s*\\{([\\s\\S]*?)\\n\\s*\\}`).exec(src);
            assert.ok(m, fn);
            assert.match(m[1], /fresh\(\)|request\.time\.toMillis\(\)\s*<\s*request\.auth\.token\.get\('until'/, fn + ' 에 until 검사');
        }
        const fresh = /function fresh\(\)\s*\{([\s\S]*?)\n\s*\}/.exec(src);
        assert.ok(fresh, 'fresh()');
        assert.match(fresh[1], /request\.auth\.token\.get\('until', 0\) is number/);
        assert.match(fresh[1], /request\.time\.toMillis\(\) < request\.auth\.token\.get\('until', 0\)/);
    });
}
test('AL01: 게시 후보에 제안 블록이 그대로 들어 있다', () => {
    const prop = read('docs/meeting-2026-11-25/firestore_lock_proposal.rules');
    const pub = read('docs/meeting-2026-11-25/publish/firestore.publish+lock.rules');
    assert.ok(pub.replace(/\r\n/g, '\n').includes(prop.replace(/\r\n/g, '\n').trim()), '제안 전체 포함');
});

// ================================================================ AL01 codocs 만료 전 재로그인
function codocsSandbox({ user = null, tokenStatus = 200, until = () => Date.now() + 3600000, hostToken = 'sess' } = {}) {
    const src = read('public/lib/codocs.js');
    const log = { fetch: 0, signIn: [], signOut: 0, timers: [], help: [] };
    let cur = user;
    const auth = { get currentUser() { return cur; } };
    const ctx = {
        console, Date, Promise, Error, JSON, Number, String, Object, Math, Buffer,
        atob: s => Buffer.from(s, 'base64').toString('binary'),
        HOST: () => ({ authToken: hostToken }),
        getAuth: () => auth, setPersistence: async () => {}, inMemoryPersistence: {},
        signInWithCustomToken: async (a, t) => { log.signIn.push(t); cur = { uid: 'baekam-user' }; },
        signOut: async () => { log.signOut++; cur = null; },
        fetch: async () => { log.fetch++; return { ok: tokenStatus === 200, status: tokenStatus, json: async () => ({ token: fakeJwt({ ba: 1, until: until() }) }) }; },
        setTimeout: (fn, ms) => { log.timers.push({ fn, ms }); return log.timers.length; }, clearTimeout: () => {},
        showAuthHelp: k => log.help.push(k),
        log
    };
    vm.createContext(ctx);
    const names = ['codocsTokenUntil', 'codocsAuthHeaders', 'signInCodocs', 'scheduleCodocsRefresh'];
    const code = names.map(n => need(src, n)).join('\n')
        + "\nlet authState='none', codocsAuthUntil=0, codocsRefreshTimer=null; const CODOCS_REFRESH_MARGIN=60000;";
    vm.runInContext(code, ctx);
    return ctx;
}

test('AL01 codocs: 이미 로그인돼 있어도 until 을 모르거나 지났으면 새 출입증을 받는다', async () => {
    const c = codocsSandbox({ user: { uid: 'baekam-user' } });
    await vm.runInContext('signInCodocs({})', c);
    assert.equal(c.log.fetch, 1, 'currentUser 만으로 통과시키지 않는다');
    assert.equal(c.log.signIn.length, 1);
    assert.equal(vm.runInContext('authState', c), 'ok');
});

test('AL01 codocs: until 1분 전에 다시 로그인하도록 예약하고, 예약이 돌면 새 토큰으로 바꾼다', async () => {
    const T0 = Date.now();
    const c = codocsSandbox({ until: () => T0 + 10 * 60000 });
    await vm.runInContext('signInCodocs({})', c);
    assert.equal(c.log.timers.length, 1);
    const ms = c.log.timers[0].ms;
    assert.ok(ms <= 9 * 60000 && ms > 9 * 60000 - 5000, '만료 1분 전: ' + ms);
    // 아직 유효할 때 다시 불려도 새로 받지 않는다
    await vm.runInContext('signInCodocs({})', c);
    assert.equal(c.log.fetch, 1);
    // 예약 실행 = 만료 1분 전 → 새 출입증
    vm.runInContext('codocsAuthUntil = Date.now() + 30000', c);
    await c.log.timers[0].fn(); await tick();
    assert.equal(c.log.fetch, 2, '만료 직전 재발급');
    assert.equal(c.log.signIn.length, 2);
    assert.equal(c.log.signOut, 0, '갱신 중 로그아웃하지 않아 구독이 끊기지 않는다');
});

test('AL01 codocs: 갱신 때 서버 세션이 끝났으면(401) Firebase 인증을 버리고 로그인 안내', async () => {
    const c = codocsSandbox();
    await vm.runInContext('signInCodocs({})', c);
    c.fetch = async () => ({ ok: false, status: 401, json: async () => ({}) });
    vm.runInContext('fetch = this.fetch; codocsAuthUntil = Date.now() + 30000', c);
    await c.log.timers[0].fn(); await tick();
    assert.equal(c.log.signOut, 1);
    assert.deepEqual(c.log.help, ['LOGIN']);
});

// ================================================================ AL02 급식일지 인증 전환
function bapSandbox({ responses = {} } = {}) {
    const src = read('public/bap/index.html');
    const log = { fetch: [], signIn: [], signOut: 0, writes: [] };
    let cur = null;
    const auth = { get currentUser() { return cur; } };
    // responses[token] = { status, delay(Promise) }
    const ctx = {
        console, Date, Promise, Error, JSON, Number, String, Object, Math, Buffer,
        atob: s => Buffer.from(s, 'base64').toString('binary'),
        localStorage: { _v: {}, getItem(k) { return this._v[k] ?? null; }, setItem(k, v) { this._v[k] = String(v); }, removeItem(k) { delete this._v[k]; } },
        TOKEN_KEY: 'bap_token', MENU_COLL: 'bap_menus', SCHOOL: { key: 'bap' },
        document: { addEventListener() {} }, setTimeout,
        log
    };
    const deps = {
        fetch: async (u, o) => {
            const t = o.headers['X-Bap-Token'];
            log.fetch.push(t);
            const r = responses[t] || { status: 200 };
            if (r.gate) await r.gate;
            return { ok: r.status === 200, status: r.status, json: async () => ({ token: fakeJwt({ bp: 'bap', br: t, until: r.until || Date.now() + 3600000 }) }) };
        },
        signInWithCustomToken: async (a, tok) => { const who = payloadOf(tok).claims.br; log.signIn.push(who); cur = { who }; },
        signOut: async () => { log.signOut++; cur = null; },
        school: () => 'bap'
    };
    ctx.deps = deps;
    vm.createContext(ctx);
    const names = ['bapTokenUntil', 'makeBapAuth', 'getBapToken', 'setBapToken', 'clearBapToken', 'waitForBapInit', 'waitForBap', 'waitForBapPublic', 'fsSet', 'fsGet', 'db'];
    vm.runInContext(names.map(n => need(src, n)).join('\n'), ctx);
    vm.runInContext(`window = { __bap: { ensureAuth: makeBapAuth({ get currentUser(){ return auth.currentUser; } }, deps),
        db: {}, doc: (d, c, id) => c + '/' + id,
        setDoc: async (ref) => { log.writes.push([ref, auth.currentUser && auth.currentUser.who]); },
        getDoc: async (ref) => { log.writes.push(['get:' + ref, auth.currentUser && auth.currentUser.who]); return { exists: () => false }; } } };`, Object.assign(ctx, { auth }));
    return ctx;
}
const run = (c, s) => vm.runInContext(s, c);

test('AL02: 로그아웃(clearBapToken)하면 이전 Firebase 인증을 signOut 한다', async () => {
    const c = bapSandbox();
    run(c, 'setBapToken("b")');
    await run(c, 'waitForBap()');
    assert.equal(c.auth.currentUser.who, 'b');
    run(c, 'clearBapToken()'); await tick(); await tick();
    assert.equal(c.log.signOut, 1);
    assert.equal(c.auth.currentUser, null);
});

test('AL02: 담당자로 바꾼 뒤 출입증 발급이 실패하면 결재자 인증으로 쓰지 않고 작업을 멈춘다', async () => {
    const c = bapSandbox({ responses: { m: { status: 500 } } });
    run(c, 'setBapToken("b")');
    await run(c, 'waitForBap()');
    run(c, 'setBapToken("m")');
    await assert.rejects(run(c, 'fsSet("bap_journals", "2026-11-26", {status:"submitted"})'));
    assert.equal(c.log.writes.length, 0, '쓰기 시도 없음');
    assert.equal(c.auth.currentUser, null, '결재자 인증을 버렸다');
    // 공개 식단 읽기는 계속 된다(비로그인으로)
    await run(c, 'fsGet("bap_menus", "2026-11-26")');
    assert.equal(JSON.stringify(c.log.writes), JSON.stringify([['get:bap_menus/2026-11-26', null]]));
});

test('AL02: 발급 중 로그아웃하면 늦게 온 응답이 인증을 되살리지 않는다', async () => {
    let open; const gate = new Promise(r => { open = r; });
    const c = bapSandbox({ responses: { b: { status: 200, gate } } });
    run(c, 'setBapToken("b")');
    const p = run(c, 'window.__bap.ensureAuth("b")');
    await tick();
    const q = run(c, 'window.__bap.ensureAuth("")');
    open(); const r = await p; await q; await tick();
    assert.equal(r, false, '늦은 응답은 무효');
    assert.equal(c.auth.currentUser, null, 'boss 인증이 살아나지 않는다');
    assert.deepEqual(c.log.signIn, []);
});

test('AL02: 다른 토큰은 진행 중인 요청에 합류하지 않고 따로 받는다', async () => {
    let open; const gate = new Promise(r => { open = r; });
    const c = bapSandbox({ responses: { b: { status: 200, gate } } });
    const pb = run(c, 'window.__bap.ensureAuth("b")');
    await tick();
    const pm = run(c, 'window.__bap.ensureAuth("m")');
    open();
    const [rb, rm] = await Promise.all([pb, pm]);
    assert.deepEqual(c.log.fetch, ['b', 'm']);
    assert.equal(rb, false, '앞선 요청은 뒤의 요청에 밀려 무효');
    assert.equal(rm, true);
    assert.equal(c.auth.currentUser.who, 'm', '마지막 토큰의 인증');
    // 같은 토큰은 합류
    const c2 = bapSandbox();
    await Promise.all([run(c2, 'window.__bap.ensureAuth("m")'), run(c2, 'window.__bap.ensureAuth("m")')]);
    assert.equal(c2.log.fetch.length, 1);
});

test('AL02: until 1분 전이면 같은 토큰이라도 새로 받는다(그 사이 기존 인증은 유지)', async () => {
    const c = bapSandbox({ responses: { m: { status: 200, until: Date.now() + 30000 } } });
    assert.equal(await run(c, 'window.__bap.ensureAuth("m")'), true);
    assert.equal(await run(c, 'window.__bap.ensureAuth("m")'), true);
    assert.equal(c.log.fetch.length, 2, '만료가 가까워 다시 받음');
    assert.equal(c.log.signOut, 0);
});

// ================================================================ AL03 rateLimit 고정 ID
function serverRateLimit() {
    const src = read('server.js');
    const ctx = { Date, Map, rateLimits: new Map() };
    vm.createContext(ctx);
    vm.runInContext(need(src, 'rateLimit'), ctx);
    return { src, rateLimit: ctx.rateLimit };
}

test('AL03: 같은 limiter 는 경로 대소문자·끝 슬래시가 달라도 한 통을 쓴다', async () => {
    const express = require('express');
    const { rateLimit } = serverRateLimit();
    const app = express();
    app.get('/api/firebase-token', rateLimit('firebase-token:ip', 3, 60000), (req, res) => res.json({ ok: 1 }));
    app.get('/api/bap/firebase-token', rateLimit('bap-token:ip', 3, 60000), (req, res) => res.json({ ok: 1 }));
    const srv = app.listen(0, '127.0.0.1');
    await new Promise(r => srv.once('listening', r));
    try {
        const base = `http://127.0.0.1:${srv.address().port}`;
        const codes = [];
        for (const p of ['/api/firebase-token', '/api/firebase-token/', '/API/firebase-token', '/api/FIREBASE-token', '/api/firebase-TOKEN'])
            codes.push((await fetch(base + p)).status);
        assert.deepEqual(codes, [200, 200, 200, 429, 429]);
        assert.equal((await fetch(base + '/api/bap/firebase-token')).status, 200, '다른 limiter 는 따로 센다');
    } finally { await new Promise(r => srv.close(r)); }
});

test('AL03: server.js 의 rateLimit 호출은 모두 고정 ID 문자열로 시작하고 ID 가 겹치지 않는다', () => {
    const { src } = serverRateLimit();
    const calls = [...src.matchAll(/\brateLimit\(([^)]*)/g)].filter(m => !/function\s+rateLimit/.test(src.slice(m.index - 10, m.index + 9)));
    assert.ok(calls.length >= 6, '호출 ' + calls.length);
    const ids = calls.map(m => { const id = /^\s*'([a-z0-9:-]+)'\s*,/.exec(m[1]); assert.ok(id, '고정 ID 없음: rateLimit(' + m[1]); return id[1]; });
    assert.equal(new Set(ids).size, ids.length, '중복 ID: ' + ids);
    assert.doesNotMatch(need(src, 'rateLimit'), /req\.path/, 'req.path 를 키로 쓰지 않는다');
});

test('AL03: 세션 기준 limiter 와 IP 기준 limiter 는 서로 다른 통', () => {
    const { rateLimit } = serverRateLimit();
    const ip = rateLimit('t:ip', 2, 60000);
    const ss = rateLimit('t:session', 2, 60000, req => 's:' + req.tok);
    const out = [];
    const go = (mw, req) => mw(req, { status: c => ({ json: () => out.push(c) }) }, () => out.push(200));
    for (let i = 0; i < 3; i++) go(ip, { ip: '1.1.1.1', tok: 'a' });
    for (let i = 0; i < 2; i++) go(ss, { ip: '1.1.1.1', tok: 'a' });
    assert.deepEqual(out, [200, 200, 429, 200, 200]);
});
