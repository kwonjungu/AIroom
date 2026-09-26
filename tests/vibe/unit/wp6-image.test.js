// WP6 이미지 코덱·검사 (AS03): 매직 바이트 MIME, 크기 상한, 실제 alpha, 체커보드 가짜 투명, 빈 그림·잘림·중심, 키잉 후처리.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { sniffMime, readDimensions, decodePng, encodePng, CodecError } from '../../../lib/vibe/assets/image/codec.js';
import { resizeToFit, keyOutBorder } from '../../../lib/vibe/assets/image/ops.js';
import { inspectBytes, analyzePixels, detectCheckerboard } from '../../../lib/vibe/assets/inspect.js';
import { mockImages, pngBytes, hugePngHeader } from '../../../lib/vibe/assets/providers/mock.js';

const ASSET_DIR = new URL('../../../public/assets/vibe/', import.meta.url);
const SPRITE = { kind: 'sprite', transparent: true, width: 512, height: 512 };

test('PNG 왕복: RGBA·불투명 인코딩 → 디코딩이 픽셀 단위로 같다', () => {
  const img = mockImages.sprite(64);
  const back = decodePng(encodePng(img));
  assert.equal(back.width, 64);
  assert.deepEqual(Buffer.from(back.data), Buffer.from(img.data));
  const bg = mockImages.background(80, 45);
  const back2 = decodePng(encodePng(bg, { opaque: true }));
  assert.deepEqual(Buffer.from(back2.data), Buffer.from(bg.data));
  assert.equal(back2.hasAlphaChannel, false);
});

test('실제 승인 에셋 PNG 전부 디코딩 성공, 헤더 크기와 일치', () => {
  let n = 0;
  for (const f of fs.readdirSync(ASSET_DIR)) {
    const b = fs.readFileSync(new URL(f, ASSET_DIR));
    const dim = readDimensions(b);
    assert.ok(dim, f);
    if (f.endsWith('.png')) {
      const img = decodePng(b);
      assert.equal(img.width, dim.width, f);
      assert.equal(img.height, dim.height, f);
      n++;
    }
    if (f.endsWith('.jpg')) assert.equal(dim.mime, 'image/jpeg');
    if (f.endsWith('.svg')) assert.equal(dim.mime, 'image/svg+xml');
  }
  assert.ok(n >= 50);
});

test('sniffMime: 확장자·선언이 아니라 바이트로 판정', () => {
  assert.equal(sniffMime(pngBytes(mockImages.sprite(16))), 'image/png');
  assert.equal(sniffMime(new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0])), 'image/jpeg');
  assert.equal(sniffMime(new TextEncoder().encode('RIFF\0\0\0\0WEBPVP8 ')), 'image/webp');
  assert.equal(sniffMime(new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"></svg>')), 'image/svg+xml');
  assert.equal(sniffMime(new TextEncoder().encode('<!doctype html><html></html>')), null);
});

test('깨진 PNG: CRC 불일치·잘림·IHDR 폭탄을 구분해 거부', () => {
  const ok = Buffer.from(pngBytes(mockImages.sprite(32)));
  const bad = Buffer.from(ok); bad[40] ^= 0xff;
  assert.throws(() => decodePng(bad), e => e instanceof CodecError && e.code === 'DECODE_FAILED');
  assert.throws(() => decodePng(ok.subarray(0, ok.length - 20)), e => e.code === 'DECODE_FAILED');
  assert.equal(inspectBytes(hugePngHeader(), { expect: SPRITE }).codes[0], 'TOO_MANY_PIXELS'); // 해제 전에 거부
});

test('AS03 inspect: MIME 위조·HTML·대용량·빈 파일 거부', () => {
  const png = pngBytes(mockImages.sprite(256));
  assert.deepEqual(inspectBytes(png, { declaredMime: 'image/jpeg', expect: SPRITE }).codes, ['MIME_MISMATCH']);
  assert.deepEqual(inspectBytes(new TextEncoder().encode('<html><script>x</script></html>'.padEnd(64)), { declaredMime: 'image/png' }).codes, ['MIME_UNKNOWN']);
  assert.deepEqual(inspectBytes(new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300"></svg>')).codes, ['MIME_NOT_ALLOWED']);
  const big = new Uint8Array(5 * 1024 * 1024); big.set(png.subarray(0, 8));
  assert.deepEqual(inspectBytes(big).codes, ['FILE_TOO_LARGE']);
  assert.deepEqual(inspectBytes(new Uint8Array(0)).codes, ['EMPTY_FILE']);
  const r = inspectBytes(png, { declaredMime: 'image/png', expect: SPRITE });
  assert.equal(r.ok, true, r.codes.join());
  assert.equal(r.metrics.hasRealAlpha, true);
});

test('AS03 투명도: 실제 alpha 검사 — 체커보드 가짜 투명·불투명 잡음 배경 거부, 단색 배경은 키잉 대상', () => {
  const cb = inspectBytes(pngBytes(mockImages.checkerboard(256), { opaque: true }), { expect: SPRITE });
  assert.ok(cb.codes.includes('FAKE_TRANSPARENCY_CHECKERBOARD'), cb.codes.join());
  assert.equal(detectCheckerboard(mockImages.checkerboard(256, 8)), true);
  assert.equal(detectCheckerboard(mockImages.sprite(256)), false);
  assert.equal(detectCheckerboard(mockImages.background(512, 288)), false);

  const noisy = inspectBytes(pngBytes(mockImages.noisyOpaque(256), { opaque: true }), { expect: SPRITE });
  assert.deepEqual(noisy.codes, ['ALPHA_MISSING']);

  const green = inspectBytes(pngBytes(mockImages.sprite(256, { bg: [0, 255, 0, 255] }), { opaque: true }), { expect: SPRITE });
  assert.deepEqual(green.codes, ['ALPHA_MISSING_KEYABLE']);
  const keyed = keyOutBorder(green.image);
  assert.ok(keyed && keyed.keyed > 256 * 256 * 0.5);
  assert.equal(keyed.image.data[3], 0);                                   // 모서리 투명
  assert.equal(keyed.image.data[(128 * 256 + 128) * 4 + 3], 255);         // 가운데 피사체 유지
  assert.deepEqual(analyzePixels(keyed.image, SPRITE).codes, []);
  // 체커보드는 두 색이라 키잉하지 않는다
  assert.equal(keyOutBorder(mockImages.checkerboard(256)), null);
});

test('AS03 빈 그림·잘림·중심 anchor', () => {
  const empty = { width: 128, height: 128, data: new Uint8Array(128 * 128 * 4) }; // 전부 투명
  assert.deepEqual(inspectBytes(pngBytes(empty), { expect: SPRITE }).codes, ['BLANK_IMAGE']);
  const flat = { width: 128, height: 128, data: new Uint8Array(128 * 128 * 4).fill(200) };
  assert.ok(inspectBytes(pngBytes(flat, { opaque: true }), { expect: { kind: 'background', transparent: false } }).codes.includes('BLANK_IMAGE'));
  assert.ok(inspectBytes(pngBytes(mockImages.sprite(256, { r: 0.7 })), { expect: SPRITE }).codes.includes('CROPPED_AT_EDGE'));
  assert.ok(inspectBytes(pngBytes(mockImages.sprite(256, { cx: 0.2, cy: 0.2, r: 0.15 })), { expect: SPRITE }).codes.includes('OFF_CENTER'));
  // 비율: 정사각 요청에 16:9 이미지
  assert.ok(inspectBytes(pngBytes(mockImages.background(512, 288), { opaque: true }), { expect: { ...SPRITE, transparent: false } }).codes.includes('ASPECT_MISMATCH'));
});

test('JPEG: 투명이 필요한 슬롯이면 검증 불가로 거부, 배경이면 헤더 검사만 통과', () => {
  const jpg = fs.readFileSync(new URL('bg-stage-space.jpg', ASSET_DIR));
  assert.deepEqual(inspectBytes(jpg, { expect: SPRITE }).codes.slice(-1), ['ALPHA_UNVERIFIABLE']);
  const r = inspectBytes(jpg, { declaredMime: 'image/jpg', expect: { kind: 'background', transparent: false } });
  assert.equal(r.ok, true, r.codes.join());
  assert.deepEqual(r.warnings, ['PIXELS_NOT_CHECKED']);
});

test('리사이즈: 축소만, 비율 유지, premultiplied로 투명 가장자리 색 번짐 없음', () => {
  const img = mockImages.sprite(256);
  const d = resizeToFit(img, 128);
  assert.equal(d.width, 128); assert.equal(d.height, 128);
  assert.equal(resizeToFit(img, 512), null);
  assert.equal(d.data[3], 0);
  const bg = resizeToFit(mockImages.background(512, 288), 256);
  assert.deepEqual([bg.width, bg.height], [256, 144]);
});
