'use strict';
// 쭘 보안 규칙 시험(Firestore + Storage). 에뮬레이터가 있어야 돈다.
// 실행: firebase emulators:exec --config docs/meeting-2026-11-25/firebase.emulator.json --only firestore,storage --project demo-zzoom "node --test tests/zzoom/rules.test.js"
// 에뮬레이터(Java)·@firebase/rules-unit-testing 이 없으면 전부 skip 으로 끝난다.
const { test, before, after, beforeEach } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');

let rut = null;
try { rut = require('@firebase/rules-unit-testing'); } catch (_) { /* 미설치 */ }
const fsHost = process.env.FIRESTORE_EMULATOR_HOST;
const stHost = process.env.FIREBASE_STORAGE_EMULATOR_HOST;
const SKIP = !rut
  ? '@firebase/rules-unit-testing 미설치'
  : (!fsHost || !stHost ? '에뮬레이터 없음(FIRESTORE_EMULATOR_HOST·FIREBASE_STORAGE_EMULATOR_HOST 필요, Java 필요)' : false);

const ROOT = path.join(__dirname, '..', '..');
const HOUR = 3600 * 1000;
let env;

function split(h) { const [host, port] = h.split(':'); return { host, port: Number(port) }; }
const claims = (o = {}) => Object.assign({ zz: 1, mid: 'm1', role: 'viewer', until: Date.now() + HOUR }, o);
const as = (o) => {
  const c = claims(o);
  for (const k of Object.keys(c)) if (c[k] === undefined) delete c[k];
  return env.authenticatedContext('u_' + Math.random().toString(36).slice(2), c);
};
const db = (ctx) => ctx.firestore();
const bytes = (n) => Buffer.alloc(n, 1);

before(async () => {
  if (SKIP) return;
  env = await rut.initializeTestEnvironment({
    projectId: 'demo-zzoom',
    firestore: { rules: fs.readFileSync(path.join(ROOT, 'firestore.rules'), 'utf8'), ...split(fsHost) },
    storage: { rules: fs.readFileSync(path.join(ROOT, 'storage.rules'), 'utf8'), ...split(stHost) },
  });
});
after(async () => { if (env) await env.cleanup(); });
beforeEach(async () => {
  if (SKIP) return;
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const d = ctx.firestore();
    await d.doc('zzoom_meetings/m1').set({ title: 'a' });
    await d.doc('zzoom_meetings/m2').set({ title: 'b' });
    for (const sub of ['agenda', 'pages', 'strokes', 'hands', 'chat', 'polls', 'transcript', 'people']) {
      await d.doc(`zzoom_meetings/m1/${sub}/x1`).set({ pageKey: 'a_1', v: 1 });
    }
    await d.doc('codocs_sheets/s1').set({ title: 't', columns: [{ key: 'a' }] });
    await d.doc('codocs_sheets/s1/rows/r1').set({ cells: {} });
  });
});

const T = (name, fn) => test(name, { skip: SKIP }, fn);
const ok = (p) => rut.assertSucceeds(p);
const no = (p) => rut.assertFails(p);

// ── 읽기: 거절 ──
T('claim 없는 로그인 사용자는 회의 문서를 못 읽는다', () => no(db(env.authenticatedContext('u1')).doc('zzoom_meetings/m1').get()));
T('비로그인은 회의 문서를 못 읽는다', () => no(db(env.unauthenticatedContext()).doc('zzoom_meetings/m1').get()));
T('zz 가 1 이 아니면 거절', () => no(db(as({ zz: 0 })).doc('zzoom_meetings/m1').get()));
T('다른 mid 의 claim 은 거절', () => no(db(as({ mid: 'm2' })).doc('zzoom_meetings/m1').get()));
T('다른 mid 의 하위 컬렉션도 거절', () => no(db(as({ mid: 'm2' })).collection('zzoom_meetings/m1/chat').get()));
T('until 이 지났으면 거절', () => no(db(as({ until: Date.now() - 1000 })).doc('zzoom_meetings/m1').get()));
T('until 이 없으면 거절', () => no(db(as({ until: undefined })).doc('zzoom_meetings/m1').get()));
T('until 이 문자열이면 거절', () => no(db(as({ until: String(Date.now() + HOUR) })).doc('zzoom_meetings/m1').get()));
T('viewer 는 people 을 읽을 수 없다(get)', () => no(db(as()).doc('zzoom_meetings/m1/people/x1').get()));
T('viewer 는 people 을 list 할 수 없다', () => no(db(as()).collection('zzoom_meetings/m1/people').get()));
T('회의 문서 컬렉션 list 는 host 라도 거절', () => no(db(as({ role: 'host' })).collection('zzoom_meetings').get()));
T('알 수 없는 하위 컬렉션은 거절', () => no(db(as({ role: 'host' })).doc('zzoom_meetings/m1/secret/x1').get()));

// ── 읽기: 허용 ──
T('같은 mid viewer 는 회의 문서를 읽는다', () => ok(db(as()).doc('zzoom_meetings/m1').get()));
for (const sub of ['agenda', 'pages', 'strokes', 'hands', 'chat', 'polls', 'transcript']) {
  T(`viewer 는 ${sub} 를 get·list 한다`, async () => {
    const d = db(as());
    await ok(d.doc(`zzoom_meetings/m1/${sub}/x1`).get());
    await ok(d.collection(`zzoom_meetings/m1/${sub}`).get());
  });
}
T('strokes 조건 쿼리(where pageKey)가 된다', () => ok(db(as()).collection('zzoom_meetings/m1/strokes').where('pageKey', '==', 'a_1').get()));
T('host 는 people 을 get·list 한다', async () => {
  const d = db(as({ role: 'host' }));
  await ok(d.doc('zzoom_meetings/m1/people/x1').get());
  await ok(d.collection('zzoom_meetings/m1/people').get());
});

// ── 쓰기: 모두 거절(host 포함) ──
for (const role of ['viewer', 'host']) {
  T(`${role}: 회의 문서 생성·수정·삭제 거절`, async () => {
    const d = db(as({ role }));
    await no(d.doc('zzoom_meetings/m1').set({ title: 'x' }));
    await no(d.doc('zzoom_meetings/m1').update({ title: 'x' }));
    await no(d.doc('zzoom_meetings/m1').delete());
    await no(d.doc('zzoom_meetings/m9').set({ title: 'x' }));
  });
  for (const sub of ['agenda', 'pages', 'strokes', 'hands', 'chat', 'polls', 'transcript', 'people']) {
    T(`${role}: ${sub} 쓰기·삭제 거절`, async () => {
      const d = db(as({ role }));
      await no(d.doc(`zzoom_meetings/m1/${sub}/n1`).set({ v: 1 }));
      await no(d.doc(`zzoom_meetings/m1/${sub}/x1`).update({ v: 2 }));
      await no(d.doc(`zzoom_meetings/m1/${sub}/x1`).delete());
    });
  }
}

// ── 기존 규칙 유지 ──
T('기존 codocs 시트·행 읽기 계속 허용(비로그인)', async () => {
  const d = db(env.unauthenticatedContext());
  await ok(d.doc('codocs_sheets/s1').get());
  await ok(d.collection('codocs_sheets/s1/rows').get());
});
T('기존 codocs 행 쓰기 규칙 유지', async () => {
  const d = db(env.unauthenticatedContext());
  await ok(d.doc('codocs_sheets/s1/rows/r2').set({ cells: { a: 1 } }));
  await no(d.doc('codocs_sheets/s1/rows/r3').set({ cells: 'x' }));
});
T('규칙에 없는 컬렉션은 기본 거절', () => no(db(env.unauthenticatedContext()).doc('whatever/x').get()));

// ── Storage ──
const up = (ctx, p, n, type) => ctx.storage().ref(p).put(bytes(n), { contentType: type });
const UP = 'zzoom/m1/up/u1/file.pdf';
T('storage: viewer 업로드 거절', () => no(up(as(), UP, 10, 'application/pdf')));
T('storage: claim 없음 업로드 거절', () => no(up(env.authenticatedContext('u1'), UP, 10, 'application/pdf')));
T('storage: 다른 mid host 업로드 거절', () => no(up(as({ role: 'host', mid: 'm2' }), UP, 10, 'application/pdf')));
T('storage: until 지난 host 업로드 거절', () => no(up(as({ role: 'host', until: Date.now() - 1000 }), UP, 10, 'application/pdf')));
T('storage: host PDF 업로드 허용', () => ok(up(as({ role: 'host' }), UP, 1024, 'application/pdf')));
T('storage: host PNG·WEBP·hwpx·pptx 형식 허용', async () => {
  const h = as({ role: 'host' });
  await ok(up(h, 'zzoom/m1/up/u2/a.png', 100, 'image/png'));
  await ok(up(h, 'zzoom/m1/up/u3/a.webp', 100, 'image/webp'));
  await ok(up(h, 'zzoom/m1/up/u4/a.hwpx', 100, 'application/haansofthwpx'));
  await ok(up(h, 'zzoom/m1/up/u5/a.pptx', 100, 'application/vnd.openxmlformats-officedocument.presentationml.presentation'));
});
T('storage: host 50MB 이상 거절', () => no(up(as({ role: 'host' }), UP, 52428800, 'application/pdf')));
T('storage: host 형식 위반(text/html) 거절', () => no(up(as({ role: 'host' }), 'zzoom/m1/up/u6/a.html', 100, 'text/html')));
T('storage: host 가 up 밖 경로에 쓰기 거절', () => no(up(as({ role: 'host' }), 'zzoom/m1/pages/a.pdf', 100, 'application/pdf')));
T('storage: zzoom-vendor 는 읽기·쓰기 모두 거절', async () => {
  const h = as({ role: 'host' });
  await no(up(h, 'zzoom-vendor/a.js', 10, 'application/octet-stream'));
  await no(h.storage().ref('zzoom-vendor/a.js').getMetadata());
  await no(up(env.unauthenticatedContext(), 'zzoom-vendor/a.js', 10, 'application/octet-stream'));
});
T('storage: 회의 파일 읽기는 같은 mid claim 만', async () => {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await ctx.storage().ref('zzoom/m1/pages/p1.webp').put(bytes(10), { contentType: 'image/webp' });
  });
  await ok(as().storage().ref('zzoom/m1/pages/p1.webp').getMetadata());
  await no(as({ mid: 'm2' }).storage().ref('zzoom/m1/pages/p1.webp').getMetadata());
  await no(env.unauthenticatedContext().storage().ref('zzoom/m1/pages/p1.webp').getMetadata());
});

// 기존 앱 Storage 경로가 그대로 열려 있는지(운영 2026-03-13 규칙과 같은 동작)
T('storage: 기존 경로(training-tracker 등) 읽기·쓰기 그대로', async () => {
  const anon = env.unauthenticatedContext();
  await ok(up(anon, 'training-tracker/s1/a.pdf', 10, 'application/pdf'));
  await ok(anon.storage().ref('training-tracker/s1/a.pdf').getMetadata());
  await ok(up(anon, 'copy/x/y.png', 10, 'image/png'));
  await ok(up(anon, 'root-file.png', 10, 'image/png'));
  await ok(anon.storage().ref('root-file.png').getMetadata());
  await no(up(anon, 'training-tracker/big.bin', 11 * 1024 * 1024, 'application/octet-stream'));
});
T('storage: 비로그인은 zzoom 경로를 넓은 규칙으로도 못 읽고 못 쓴다', async () => {
  const anon = env.unauthenticatedContext();
  await no(up(anon, 'zzoom/m1/pages/p9.webp', 10, 'image/webp'));
  await no(up(anon, 'zzoom/m1/up/u1/p1.webp', 10, 'image/webp'));
  await no(anon.storage().ref('zzoom/m1/pages/p1.webp').getMetadata());
});
