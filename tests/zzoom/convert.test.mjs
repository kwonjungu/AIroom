// 쭘 변환 엔진(public/zzoom/convert) 시험 — 브라우저 API 는 최소한으로 흉내 낸다. 실제 변환은 Playwright 로 따로 확인.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

// 캔버스 흉내: toBlob 이 돌려줄 형식을 시험마다 정한다
let encodeAs = 'image/webp';
globalThis.document = {
  createElement(tag) {
    assert.equal(tag, 'canvas');
    return {
      width: 0, height: 0,
      getContext: () => ({ drawImage() {}, fillRect() {}, set imageSmoothingQuality(_) {} }),
      toBlob(cb, type) { setTimeout(() => cb(encodeAs === null ? null : new Blob(['x'], { type: encodeAs === 'same' ? type : encodeAs })), 0); },
    };
  },
};
const canvas = (w = 100, h = 50) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };

test('지적08: WebP 로 저장하지 못하는 브라우저는 PNG 를 내지 않고 분명히 멈춘다', async () => {
  const { emitPage, Ctx, ConvertError } = await import('../../public/zzoom/convert/core.js');
  encodeAs = 'image/png';
  const out = { pages: [], thumbs: [] };
  const c = canvas();
  await assert.rejects(emitPage(c, out, new Ctx()), (e) => e instanceof ConvertError && e.code === 'WEBP_UNSUPPORTED');
  assert.equal(out.pages.length, 0);
  assert.equal(c.width, 0, '실패해도 캔버스를 비운다');
  const { checkWebpSupport } = await import('../../public/zzoom/convert/core.js');
  await assert.rejects(checkWebpSupport(), (e) => e.code === 'WEBP_UNSUPPORTED', '변환 시작 전에 확인');
  encodeAs = 'same';
  await checkWebpSupport();
});

test('지적10: 인코딩 실패(null)에도 쪽 캔버스와 썸네일 캔버스를 비운다', async () => {
  const { emitPage, Ctx } = await import('../../public/zzoom/convert/core.js');
  encodeAs = null;
  const c = canvas();
  await assert.rejects(emitPage(c, { pages: [], thumbs: [] }, new Ctx()));
  assert.equal(c.width, 0);
  encodeAs = 'same';
});

test('지적10: 6분 시한이 지나면 끝나지 않는 내려받기도 끊긴다', async () => {
  const { Ctx, fetchVerified } = await import('../../public/zzoom/convert/core.js');
  const realFetch = globalThis.fetch;
  globalThis.fetch = (url, init) => new Promise((_, rej) => init?.signal?.addEventListener('abort', () => rej(new DOMException('abort', 'AbortError'))));
  try {
    const ctx = new Ctx({ maxMs: 150 });
    const r = await Promise.race([fetchVerified(['https://cdn.example/x.js'], null, ctx).then(() => 'OK', (e) => e.code), new Promise((res) => setTimeout(() => res('HANG'), 3000))]);
    assert.equal(r, 'TIMEOUT');
    assert.equal(ctx.signal.aborted, true, '시한이 변환 전체의 취소 신호로 이어진다');
  } finally { globalThis.fetch = realFetch; }
});

test('지적10: 사용자 취소도 같은 신호로 이어지고, race 는 끝나지 않는 작업을 기다리지 않는다', async () => {
  const { Ctx } = await import('../../public/zzoom/convert/core.js');
  const ac = new AbortController();
  const ctx = new Ctx({ signal: ac.signal });
  let destroyed = false;
  ctx.onAbort(() => { destroyed = true; });
  const p = ctx.race(new Promise(() => {}));
  ac.abort();
  await assert.rejects(p, (e) => e.code === 'ABORTED');
  assert.equal(destroyed, true);
});

test('지적09: 변환기 형식표와 서버 형식표는 같다', async () => {
  const client = await import('../../public/zzoom/convert/contract.js');
  const server = require('../../lib/zzoom/contract.js');
  assert.deepEqual(JSON.parse(JSON.stringify(client.SOURCES)), JSON.parse(JSON.stringify(server.SOURCES)));
  assert.equal(client.MAX_ORIGINAL_BYTES, server.MAX_ORIGINAL_BYTES);
  assert.equal(server.MAX_ORIGINAL_BYTES, require('../../lib/zzoom/routes').LIMIT.originalBytes);
});

test('지적09: 변환 결과는 서버에 보낼 원본 종류·확장자·MIME 을 따로 준다', async () => {
  const { sourceOf, detectKind } = await import('../../public/zzoom/convert/index.js');
  assert.equal(detectKind({ name: 'a.hwpx' }), 'hwp', '렌더러 종류');
  assert.deepEqual(sourceOf({ name: '계획.HWPX', type: '' }), { kind: 'hwpx', ext: 'hwpx', mime: 'application/hwp+zip' });
  assert.deepEqual(sourceOf({ name: 'a.jpeg', type: 'image/jpeg' }), { kind: 'image', ext: 'jpeg', mime: 'image/jpeg' });
  assert.deepEqual(sourceOf({ name: 'a.gif', type: '' }), { kind: 'image', ext: 'gif', mime: 'image/gif' });
  assert.equal(sourceOf({ name: 'a.hwp', type: 'application/x-hwp' }).kind, 'hwp');
});

test('지적09: 정확히 50MiB 는 변환기도 거절한다(서버와 같은 경계)', async () => {
  const { convert } = await import('../../public/zzoom/convert/index.js');
  const realFetch = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error('네트워크 금지'); };
  try {
    await assert.rejects(convert({ name: 'a.pdf', size: 50 * 1024 * 1024 }), (e) => e.code === 'FILE_TOO_LARGE');
  } finally { globalThis.fetch = realFetch; }
});

test('지적09: Storage 규칙의 원본 형식 목록은 형식표 MIME 을 모두 받는다', async () => {
  const { SOURCES } = require('../../lib/zzoom/contract.js');
  const rules = fs.readFileSync(new URL('../../storage.rules', import.meta.url), 'utf8');
  const m = /ORIGINAL_TYPES[\s\S]*?matches\('([^']+)'\)/.exec(rules);
  assert.ok(m, 'storage.rules 에 ORIGINAL_TYPES 표시가 있는 matches');
  const re = new RegExp('^(?:' + m[1] + ')$');
  for (const s of Object.values(SOURCES)) for (const t of s.mimes) assert.ok(re.test(t), t);
  assert.ok(re.test('application/octet-stream'));
  assert.ok(!re.test('text/html')); assert.ok(!re.test('image/svg+xml'));
});
