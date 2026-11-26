// 쭘 변환 엔진(public/zzoom/convert) 시험 — 브라우저 API 는 최소한으로 흉내 낸다. 실제 변환은 Playwright 로 따로 확인.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

// 캔버스 흉내: toBlob 이 돌려줄 형식을 시험마다 정한다
let encodeAs = 'image/webp';
let sizeFor = null;   // (품질, 캔버스) → 만들 blob 바이트 수(시험용)
globalThis.document = {
  createElement(tag) {
    assert.equal(tag, 'canvas');
    return {
      width: 0, height: 0,
      getContext: () => ({ drawImage() {}, fillRect() {}, set imageSmoothingQuality(_) {} }),
      toBlob(cb, type, q) { setTimeout(() => cb(encodeAs === null ? null : new Blob([sizeFor ? new Uint8Array(sizeFor(q, this)) : 'x'], { type: encodeAs === 'same' ? type : encodeAs })), 0); },
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

test('R1-N7: 쪽 WebP 가 4MiB 를 넘으면 품질을 낮춰 다시 저장하고, 끝내 넘으면 분명히 멈춘다', async () => {
  const { emitPage, Ctx, ConvertError, LIMITS } = await import('../../public/zzoom/convert/core.js');
  encodeAs = 'same';
  const qs = [];
  sizeFor = (q, c) => { if (c.width > 400) { qs.push(q); return q > 0.6 ? 5 * 1024 * 1024 : 3 * 1024 * 1024; } return 1000; };
  const out = { pages: [], thumbs: [] };
  await emitPage(canvas(2000, 1400), out, new Ctx());
  assert.equal(out.pages.length, 1);
  assert.ok(out.pages[0].blob.size <= LIMITS.maxPageBytes, '4MiB 이하');
  assert.ok(qs.length >= 2 && qs[qs.length - 1] < qs[0], '품질을 낮춰 다시 저장');
  sizeFor = (q, c) => c.width > 400 ? 6 * 1024 * 1024 : 1000;
  const c = canvas(2000, 1400);
  await assert.rejects(emitPage(c, { pages: [], thumbs: [] }, new Ctx()), (e) => e instanceof ConvertError && e.code === 'PAGE_TOO_LARGE');
  assert.equal(c.width, 0);
  sizeFor = null;
});

test('R1-N6: HWP 쪽 캔버스도 긴 변 2000px 을 넘지 않게 줄인다(PDF 와 같은 반올림·자르기)', async () => {
  const { fitCanvas } = await import('../../public/zzoom/convert/core.js');
  const big = canvas(2001, 1415);
  const f = fitCanvas(big);
  assert.ok(Math.max(f.width, f.height) <= 2000, `${f.width}x${f.height}`);
  assert.equal(f.width, 2000); assert.equal(f.height, 1414);
  assert.equal(big.width, 0, '원래 캔버스는 비운다');
  const ok = canvas(1414, 2000);
  assert.equal(fitCanvas(ok), ok, '한도 안이면 그대로');
  const src = fs.readFileSync(new URL('../../public/zzoom/convert/hwp.js', import.meta.url), 'utf8');
  assert.match(src, /fitCanvas\(/, 'hwp.js 가 그린 뒤 fitCanvas 로 줄인다');
});

test('R1-N11: 라이브러리 적재는 처음 변환의 취소에 묶이지 않는다(동시 변환 중 하나를 취소해도 다른 하나는 계속)', async () => {
  const { sharedLoader, Ctx } = await import('../../public/zzoom/convert/core.js');
  let release; const gate = new Promise((r) => { release = r; });
  let seen = null;
  const load = sharedLoader(async (lctx) => { seen = lctx; await gate; return 'LIB'; });
  const ac = new AbortController();
  const c1 = new Ctx({ signal: ac.signal }), c2 = new Ctx();
  const p1 = load(c1), p2 = load(c2);
  ac.abort();
  await assert.rejects(p1, (e) => e.code === 'ABORTED');
  assert.equal(seen.signal.aborted, false, '적재 신호는 첫 변환의 취소와 따로');
  release();
  assert.equal(await p2, 'LIB');
  assert.equal(await load(new Ctx()), 'LIB', '한 번 받은 것은 다시 쓴다');
  for (const f of ['pdf.js', 'hwp.js', 'pptx.js']) {
    const src = fs.readFileSync(new URL('../../public/zzoom/convert/' + f, import.meta.url), 'utf8');
    assert.match(src, /sharedLoader\(/, f + ' 가 sharedLoader 로 적재한다');
  }
});

test('R2-M2: 쪽이 많으면 변환기도 서버 허가와 같은 파일당 상한(합계 200MiB)으로 저장한다', async () => {
  const { emitPage, Ctx, checkPageCount } = await import('../../public/zzoom/convert/core.js');
  const client = await import('../../public/zzoom/convert/contract.js');
  const server = require('../../lib/zzoom/contract.js');
  for (const n of [1, 37, 120, 200]) assert.deepEqual(client.pageCaps(n), server.pageCaps(n), '형식표처럼 두 쪽 계산이 같다');
  encodeAs = 'same';
  const ctx = new Ctx();
  checkPageCount(200, ctx);
  assert.equal(ctx.caps.page, 1048576);
  const seen = [];
  sizeFor = (q, c) => { if (c.width > 400) { seen.push(q); return q > 0.5 ? 1.5 * 1048576 : 900 * 1024; } return 1000; };
  const out = { pages: [], thumbs: [] };
  await emitPage(canvas(2000, 1400), out, ctx);
  assert.ok(out.pages[0].blob.size <= 1048576 && seen.length > 1, '1MiB 안으로 다시 저장');
  sizeFor = null;
});

// 화면 배율(125%·150%) 노트북에서 PPTX 쪽이 2000px 을 넘던 문제(2026-11-26 사용자 신고, 감사 R15)
test('PPTX 는 화면 배율과 상관없이 dpr 1 로 그리고, emitPage 는 긴 변 한도 안전망을 가진다', () => {
  const pptx = fs.readFileSync(new URL('../../public/zzoom/convert/pptx.js', import.meta.url), 'utf8');
  assert.match(pptx, /renderSlide\([^)]*dpr:\s*1\b/, 'renderSlide 에 dpr: 1');
  const core = fs.readFileSync(new URL('../../public/zzoom/convert/core.js', import.meta.url), 'utf8');
  const body = core.slice(core.indexOf('export async function emitPage'), core.indexOf('export function checkPageCount'));
  assert.ok(body.includes('LIMITS.longSide') && body.includes('if (src) freeCanvas(src)'), 'emitPage 안전망과 해제');
});
