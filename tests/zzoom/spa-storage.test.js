'use strict';
// 지적12·13·16: 두 SPA(index.html, public/index.html)의 창고(Storage) 출입증·업로드 함수.
// HTML 에서 함수 원문을 잘라 vm 에서 가짜 firebase·fetch 로 돌린다. 두 파일의 함수 원문이 같은지도 본다.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.join(__dirname, '..', '..');
const FILES = ['index.html', 'public/index.html'].map(f => [f, fs.readFileSync(path.join(ROOT, f), 'utf8')]);

// 함수 원문 자르기: 문자열·템플릿·주석 안의 중괄호는 세지 않는다
function extract(src, name) {
    const m = new RegExp(`(?:async\\s+)?function\\s+${name}\\s*\\(`).exec(src);
    if (!m) return null;
    let i = src.indexOf('{', m.index + m[0].length - 1);
    // 매개변수 기본값 안의 { 는 없다고 본다
    const stack = ['{']; i++;
    const tpl = [];
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
            else if (c === '{') stack.push('{');
            else if (c === '}') stack.pop();
        }
        i++;
    }
    void tpl;
    return src.slice(m.index, i);
}
const NAMES = ['storageClaimsOk', 'ensureStorageAuth', 'storagePathFor', 'uploadToFirebase', 'deleteFromFirebase'];

function sandbox(src, { claims = null, tokenStatus = 200, tokenBody = { token: 'T' }, isCopy = false, putFails = false, putErrs = [], delErrs = [] } = {}) {
    const log = { fetch: [], put: [], putTries: 0, delTries: 0, signIn: [], signOut: 0, toast: [], patch: [] };
    let user = claims ? { getIdTokenResult: async () => ({ claims }) } : null;
    const auth = {
        get currentUser() { return user; },
        async signInWithCustomToken(t) { log.signIn.push(t); user = { getIdTokenResult: async () => ({ claims: { ba: 1, until: Date.now() + 3600000 } }) }; },
        async signOut() { log.signOut++; user = null; }
    };
    const ref = p => ({ child: c => ref(c), async put(f) { log.putTries++; if (putErrs.length) throw Object.assign(new Error('x'), { code: putErrs.shift() }); if (putFails) throw new Error('storage/unauthorized'); log.put.push(p); }, async getDownloadURL() { return 'https://dl/' + p; }, async delete() { log.delTries++; if (delErrs.length) throw Object.assign(new Error('x'), { code: delErrs.shift() }); log.put.push('del:' + p); }, _p: p });
    const ctx = {
        console, Date, Promise, Error, JSON, String, Object, Array, Math, setTimeout,
        window: { IS_COPY: isCopy },
        firebase: { auth: () => auth },
        firebaseStorage: { ref: () => ({ child: c => ref(c) }) },
        authToken: 'sess',
        fetch: async (u, o) => { log.fetch.push(u); return { ok: tokenStatus === 200, status: tokenStatus, json: async () => tokenBody }; },
        showToast: (m, k) => log.toast.push([k, m]),
        log
    };
    vm.createContext(ctx);
    const code = NAMES.map(n => extract(src, n)).filter(Boolean).join('\n') + '\nlet storageAuthPromise=null;';
    vm.runInContext(code, ctx);
    return ctx;
}

for (const [file, src] of FILES) {
    test(`지적13 ${file}: 출입증을 못 받으면 업로드하지 않고 오류를 낸다`, async () => {
        const c = sandbox(src, { tokenStatus: 500, tokenBody: { error: 'x' } });
        await assert.rejects(vm.runInContext('uploadToFirebase({}, "banner/a.png")', c));
        assert.deepEqual(c.log.put, [], '규칙에 막힐 업로드를 시도하지 않음');
    });
    test(`지적13 ${file}: 서버 키가 아직 없으면(503 unconfigured) 예전처럼 올린다`, async () => {
        const c = sandbox(src, { tokenStatus: 503, tokenBody: { error: 'storage-token-unconfigured' } });
        const url = await vm.runInContext('uploadToFirebase({}, "banner/a.png")', c);
        assert.match(url, /banner\/a\.png/);
    });
    test(`지적12 ${file}: 이미 로그인돼 있어도 출입증 기한(until)이 지났거나 종류가 다르면 다시 받는다`, async () => {
        const c = sandbox(src, { claims: { ba: 1, until: Date.now() - 1000 } });
        await vm.runInContext('ensureStorageAuth()', c);
        assert.equal(c.log.signIn.length, 1, '새 출입증');
        const d = sandbox(src, { claims: { ba: 1, until: Date.now() + 3600000 }, isCopy: true });
        await vm.runInContext('ensureStorageAuth()', d);
        assert.equal(d.log.signIn.length, 1, '카피본 탭에 실서비스 출입증이 있으면 바꾼다');
        const e = sandbox(src, { claims: { ba: 1, until: Date.now() + 3600000 } });
        await vm.runInContext('ensureStorageAuth()', e);
        assert.equal(e.log.signIn.length, 0, '유효하면 그대로');
    });
    test(`지적16 ${file}: 카피본 업로드는 실제 저장 경로(copy/…)를 호출자가 알 수 있다`, async () => {
        const c = sandbox(src, { isCopy: true });
        assert.equal(vm.runInContext('storagePathFor("banner/a.png")', c), 'copy/banner/a.png');
        assert.equal(vm.runInContext('storagePathFor("copy/banner/a.png")', c), 'copy/banner/a.png', '두 번 붙이지 않음');
        await vm.runInContext('uploadToFirebase({}, storagePathFor("banner/a.png"))', c);
        assert.deepEqual(c.log.put, ['copy/banner/a.png']);
        // 경로를 저장하는 호출자는 모두 storagePathFor 로 만든 경로를 저장한다
        for (const pat of [/const storagePath=`banner\//, /const storagePath='schedules\//, /const storagePath=`sections\//, /const storagePath=`certs\//, /const storagePath='collections\//, /filePath=`training-tracker\//]) {
            assert.doesNotMatch(src, pat, String(pat));
        }
    });
    test(`지적13 ${file}: 이수증 파일 보관이 실패하면 연수 기록을 확정하지 않는다`, async () => {
        const body = extract(src, 'ttSubmitUpload');
        assert.ok(body, 'ttSubmitUpload');
        // AL05: storagePathFor 도 원문을 넣어, 실제로 uploadToFirebase 호출까지 가서 실패하는지 센다
        const log = { patch: 0, toast: [], upload: [] };
        const ctx = {
            console, Date, Map, Set, Promise, Error, String, Object, Array, JSON,
            window: { IS_COPY: false },
            ttUp: { busy: false, staffId: 's1', sel: new Set(['c1']), mode: 'single', file: { name: 'a.pdf' }, certNo: '1', date: '2026-11-25' },
            clAllStaff: () => [{ id: 's1', name: '김교사' }], ttCfg: () => ({ columns: [{ id: 'c1', name: '항목' }] }),
            ttNorm: s => s, ttMyName: () => '', ttRenderUpload() {}, ttOpenUpload() {},
            firebaseStorage: {}, uploadToFirebase: async (f, p) => { log.upload.push(p); throw new Error('창고 출입증을 받지 못했습니다'); },
            ttPatch: async () => { log.patch++; }, showToast: (m, k) => log.toast.push([k, m]),
            document: { getElementById: () => ({ insertAdjacentHTML() {} }) }
        };
        vm.createContext(ctx);
        vm.runInContext(extract(src, 'storagePathFor') + '\n' + body, ctx);
        await vm.runInContext('ttSubmitUpload()', ctx);
        assert.equal(log.upload.length, 1, '실제 업로드 호출까지 갔다(앞에서 ReferenceError 로 끝나지 않음)');
        assert.match(log.upload[0], /^training-tracker\/s1\/\d+_/);
        assert.equal(log.patch, 0, '기록 저장 안 함');
        assert.ok(log.toast.some(([k]) => k === 'error'), '오류 안내');
        assert.equal(ctx.ttUp.busy, false, '다시 시도할 수 있게 풀림');
    });

    // R3 사소 N1·N2·N4·N5·N6: 가짜 오류에는 실제 Firebase 처럼 .code 를 넣는다
    const OKC = () => ({ ba: 1, until: Date.now() + 3600000 });
    test(`N2 ${file}: 업로드가 unauthorized 면 출입증을 강제로 새로 받아 한 번만 다시 올린다`, async () => {
        const c = sandbox(src, { claims: OKC(), putErrs: ['storage/unauthorized'] });
        const url = await vm.runInContext('uploadToFirebase({}, "banner/a.png")', c);
        assert.match(url, /banner\/a\.png/);
        assert.equal(c.log.putTries, 2);
        assert.equal(c.log.fetch.length, 1, '강제 재발급');
        const d = sandbox(src, { claims: OKC(), putErrs: ['storage/unauthenticated', 'storage/unauthenticated', 'storage/unauthenticated'] });
        await assert.rejects(vm.runInContext('uploadToFirebase({}, "banner/a.png")', d), e => e.code === 'storage/unauthenticated');
        assert.equal(d.log.putTries, 2, '무한 재시도 없음');
        const q = sandbox(src, { claims: OKC(), putErrs: ['storage/quota-exceeded'] });
        await assert.rejects(vm.runInContext('uploadToFirebase({}, "banner/a.png")', q), e => e.code === 'storage/quota-exceeded');
        assert.equal(q.log.putTries, 1);
        assert.equal(q.log.fetch.length, 0, '다른 오류는 재발급하지 않음');
    });
    test(`N4 ${file}: 강제 재발급은 진행 중인 비강제 요청에 합류하지 않고 새로 받는다`, async () => {
        const c = sandbox(src, { claims: OKC() });
        const r = await vm.runInContext('Promise.all([ensureStorageAuth(), ensureStorageAuth(true)])', c);
        assert.deepEqual([...r], ['ok', 'ok']);
        assert.equal(c.log.fetch.length, 1, '강제 요청은 토큰을 새로 받는다');
        assert.equal(c.log.signIn.length, 1);
        // 강제끼리는 합류
        const d = sandbox(src, { claims: OKC() });
        await vm.runInContext('Promise.all([ensureStorageAuth(true), ensureStorageAuth(true)])', d);
        assert.equal(d.log.fetch.length, 1);
    });
    test(`N1 ${file}: 출입증을 못 받아도 삭제는 예외 없이 안내만 한다`, async () => {
        const c = sandbox(src, { tokenStatus: 500, tokenBody: { error: 'x' } });
        await vm.runInContext('deleteFromFirebase("banner/a.png")', c);
        assert.equal(c.log.delTries, 0);
        assert.equal(c.log.toast.length, 1);
    });
    test(`N5 ${file}: 삭제가 unauthorized 면 출입증을 새로 받아 한 번 다시 지우고, 그래도 실패하면 안내한다`, async () => {
        const c = sandbox(src, { claims: OKC(), delErrs: ['storage/unauthorized'] });
        await vm.runInContext('deleteFromFirebase("banner/a.png")', c);
        assert.equal(c.log.delTries, 2);
        assert.equal(c.log.fetch.length, 1);
        assert.deepEqual(c.log.put, ['del:banner/a.png']);
        assert.equal(c.log.toast.length, 0);
        const d = sandbox(src, { claims: OKC(), delErrs: ['storage/unauthorized', 'storage/unauthorized', 'storage/unauthorized'] });
        await vm.runInContext('deleteFromFirebase("banner/a.png")', d);
        assert.equal(d.log.delTries, 2, '무한 재시도 없음');
        assert.equal(d.log.toast.length, 1, '안내');
        const n = sandbox(src, { claims: OKC(), delErrs: ['storage/object-not-found'] });
        await vm.runInContext('deleteFromFirebase("banner/a.png")', n);
        assert.equal(n.log.delTries, 1);
        assert.equal(n.log.toast.length, 0, '이미 없는 파일은 조용히');
    });
    test(`AL04 ${file}: 삭제의 비인증 오류는 안내하고 실패를 기록한다(object-not-found 만 조용히)`, async () => {
        const c = sandbox(src, { claims: OKC(), delErrs: ['storage/retry-limit-exceeded'] });
        const r = await vm.runInContext('deleteFromFirebase("banner/a.png")', c);
        assert.equal(c.log.delTries, 1, '인증 오류가 아니면 재발급·재시도 안 함');
        assert.equal(c.log.fetch.length, 0);
        assert.equal(c.log.toast.length, 1, '안내');
        assert.equal(c.log.toast[0][0], 'error');
        assert.equal(r, false, '실패를 호출자에게 알린다');
        const s = sandbox(src, { claims: OKC(), delErrs: ['storage/unknown'] });
        await vm.runInContext('deleteFromFirebase("banner/a.png", {silent:true})', s);
        assert.equal(s.log.toast.length, 0, 'silent 는 안내 안 함');
        // 일괄 삭제: 안내는 한 번, 나머지 파일 삭제는 계속, 실패 경로를 state 에 남긴다
        const b = sandbox(src, { claims: OKC(), delErrs: ['storage/retry-limit-exceeded', 'storage/retry-limit-exceeded'] });
        const st = await vm.runInContext('(async()=>{const st={};for(const p of ["a","b","c"])await deleteFromFirebase("collections/"+p,{state:st});return st;})()', b);
        assert.equal(b.log.delTries, 3, '다음 파일도 지운다');
        assert.equal(b.log.toast.length, 1, '안내 한 번');
        assert.deepEqual([...st.failed], ['collections/a', 'collections/b']);
        const n = sandbox(src, { claims: OKC(), delErrs: ['storage/object-not-found'] });
        const rn = await vm.runInContext('deleteFromFirebase("banner/a.png")', n);
        assert.equal(n.log.toast.length, 0, '이미 없는 파일은 조용히');
        assert.equal(rn, true);
    });
    test(`N6 ${file}: 교체 때는 안내하지 않고, 일괄 삭제는 출입증·안내를 한 번만 한다`, async () => {
        const c = sandbox(src, { tokenStatus: 500, tokenBody: { error: 'x' } });
        await vm.runInContext('deleteFromFirebase("banner/a.png", {silent:true})', c);
        assert.equal(c.log.toast.length, 0);
        const d = sandbox(src, { tokenStatus: 500, tokenBody: { error: 'x' } });
        await vm.runInContext('(async()=>{const st={};for(const p of ["a","b","c"])await deleteFromFirebase("collections/"+p,{state:st});})()', d);
        assert.equal(d.log.fetch.length, 1, '출입증 요청 한 번');
        assert.equal(d.log.toast.length, 1, '안내 한 번');
        const e = sandbox(src, { claims: OKC() });
        await vm.runInContext('(async()=>{const st={};for(const p of ["a","b","c"])await deleteFromFirebase("collections/"+p,{state:st});})()', e);
        assert.equal(e.log.delTries, 3);
    });
}

test('두 SPA 의 창고 함수 원문이 같다', () => {
    for (const n of [...NAMES, 'ttSubmitUpload']) {
        const [a, b] = FILES.map(([, s]) => extract(s, n));
        assert.ok(a && b, n + ' 없음');
        assert.equal(a, b, n);
    }
});
