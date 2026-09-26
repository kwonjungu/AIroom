// 생성 이미지 검사 (§6.2) — 선언된 MIME을 믿지 않고 매직 바이트·실제 픽셀로 판정한다.
//
// inspectBytes(bytes, opts)  : 파일 수준 (크기·형식·선언 불일치·픽셀 수·비율) + PNG면 픽셀 분석
// analyzePixels(img, expect) : 투명도(실제 alpha)·체커보드 가짜 투명·빈 그림·잘림·중심 anchor
//
// 결과 codes(오류)가 하나라도 있으면 ok:false. warnings는 기록만 한다.
// PNG 외 형식(JPEG/WebP)은 픽셀을 디코딩하지 않는다 → 투명이 필요한 슬롯이면 ALPHA_UNVERIFIABLE로 거부.

import { sniffMime, readDimensions, decodePng, CodecError } from './image/codec.js';
import { borderIndices, dominantBorderColor } from './image/ops.js';

export const INSPECT_LIMITS = Object.freeze({
  maxInputBytes: 4 * 1024 * 1024,     // 공급자 원본 상한
  maxPixels: 1536 * 1536,             // 디코딩 폭탄 방지 (IHDR 단계에서 거부)
  minSide: 64,
  aspectTolerance: 0.04,
});

export const ALLOWED_MIME = Object.freeze(['image/png', 'image/webp', 'image/jpeg']);

/**
 * @param {Uint8Array} bytes
 * @param {{ declaredMime?: string|null, expect?: {kind?:string, transparent?:boolean, width?:number, height?:number}, limits?: Partial<typeof INSPECT_LIMITS> }} [opts]
 */
export function inspectBytes(bytes, opts = {}) {
  const L = { ...INSPECT_LIMITS, ...(opts.limits || {}) };
  const expect = opts.expect || {};
  const res = { ok: false, codes: [], warnings: [], mime: null, width: null, height: null, bytes: bytes?.length ?? 0, image: null, metrics: null };
  const fail = code => { res.codes.push(code); return res; };

  if (!bytes || !bytes.length) return fail('EMPTY_FILE');
  if (bytes.length > L.maxInputBytes) return fail('FILE_TOO_LARGE');
  const mime = sniffMime(bytes);
  res.mime = mime;
  if (!mime) return fail('MIME_UNKNOWN');
  if (!ALLOWED_MIME.includes(mime)) return fail('MIME_NOT_ALLOWED');       // SVG·GIF 거부 (스크립트·애니메이션)
  const declared = normalizeMime(opts.declaredMime);
  if (declared && declared !== mime) return fail('MIME_MISMATCH');
  const dim = readDimensions(bytes);
  if (!dim || !dim.width || !dim.height) return fail('DIMENSIONS_UNKNOWN');
  res.width = dim.width; res.height = dim.height;
  if (dim.width * dim.height > L.maxPixels) return fail('TOO_MANY_PIXELS');
  if (Math.min(dim.width, dim.height) < L.minSide) return fail('TOO_SMALL');
  if (expect.width && expect.height) {
    const want = expect.width / expect.height, got = dim.width / dim.height;
    if (Math.abs(got - want) / want > L.aspectTolerance) res.codes.push('ASPECT_MISMATCH');
  }

  if (mime !== 'image/png') {
    if (expect.transparent) res.codes.push('ALPHA_UNVERIFIABLE');
    else res.warnings.push('PIXELS_NOT_CHECKED');
    res.ok = res.codes.length === 0;
    return res;
  }

  let img;
  try { img = decodePng(bytes, { maxPixels: L.maxPixels }); } catch (e) {
    return fail(e instanceof CodecError ? e.code : 'DECODE_FAILED');
  }
  res.image = img;
  const a = analyzePixels(img, expect);
  res.metrics = a.metrics;
  res.codes.push(...a.codes);
  res.warnings.push(...a.warnings);
  res.ok = res.codes.length === 0;
  return res;
}

export function normalizeMime(m) {
  if (!m) return null;
  const s = String(m).split(';')[0].trim().toLowerCase();
  return s === 'image/jpg' ? 'image/jpeg' : s;
}

/**
 * 실제 alpha 기반 픽셀 분석.
 * @param {{width:number,height:number,data:Uint8Array}} img
 * @param {{kind?:string, transparent?:boolean}} expect
 */
export function analyzePixels(img, expect = {}) {
  const { width: w, height: h, data: d } = img;
  const n = w * h;
  const codes = [], warnings = [];
  let opaque = 0, minA = 255, sx = 0, sy = 0, sa = 0;
  let minX = w, minY = h, maxX = -1, maxY = -1;
  let lumSum = 0, lumSq = 0, lumN = 0;
  // 큰 이미지는 격자 표본 (최대 약 26만 픽셀)
  const step = n > 262_144 ? 2 : 1;
  for (let y = 0; y < h; y += step) {
    for (let x = 0; x < w; x += step) {
      const i = (y * w + x) * 4, al = d[i + 3];
      if (al < minA) minA = al;
      if (al >= 128) {
        opaque++;
        if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y;
        const L = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
        lumSum += L; lumSq += L * L; lumN++;
      }
      sx += x * al; sy += y * al; sa += al;
    }
  }
  const sampled = Math.ceil(h / step) * Math.ceil(w / step);
  const opaqueRatio = opaque / sampled;
  const lumStd = lumN ? Math.sqrt(Math.max(0, lumSq / lumN - (lumSum / lumN) ** 2)) : 0;
  const border = borderIndices(w, h);
  let borderOpaque = 0;
  for (const i of border) if (d[i * 4 + 3] >= 128) borderOpaque++;
  const borderOpaqueRatio = border.length ? borderOpaque / border.length : 0;
  const hasRealAlpha = minA < 250;
  const checkerboard = detectCheckerboard(img);
  const centroid = sa ? { x: sx / sa / w, y: sy / sa / h } : null;
  const bbox = maxX >= 0 ? { x: minX / w, y: minY / h, w: (maxX - minX + 1) / w, h: (maxY - minY + 1) / h } : null;
  const metrics = {
    opaqueRatio: round(opaqueRatio), borderOpaqueRatio: round(borderOpaqueRatio), lumStd: round(lumStd),
    hasRealAlpha, checkerboard, centroid: centroid && { x: round(centroid.x), y: round(centroid.y) },
    bbox: bbox && { x: round(bbox.x), y: round(bbox.y), w: round(bbox.w), h: round(bbox.h) },
  };

  if (lumN === 0 || opaqueRatio < 0.01) codes.push('BLANK_IMAGE');
  else if (lumStd < 3) codes.push('BLANK_IMAGE');                 // 단색 채움

  if (expect.transparent) {
    if (checkerboard) codes.push('FAKE_TRANSPARENCY_CHECKERBOARD');
    else if (!hasRealAlpha) {
      // 배경이 단색이면 후처리(키잉) 대상, 아니면 실패
      codes.push(dominantBorderColor(img) ? 'ALPHA_MISSING_KEYABLE' : 'ALPHA_MISSING');
    } else if (!codes.includes('BLANK_IMAGE')) {
      if (borderOpaqueRatio > 0.08) codes.push('CROPPED_AT_EDGE');
      if (centroid && (Math.abs(centroid.x - 0.5) > 0.2 || Math.abs(centroid.y - 0.5) > 0.2)) codes.push('OFF_CENTER');
      if (bbox && Math.max(bbox.w, bbox.h) < 0.25) warnings.push('SUBJECT_TOO_SMALL');
    }
  } else if (checkerboard) {
    codes.push('CHECKERBOARD_BACKGROUND');
  }
  return { codes, warnings, metrics };
}

const round = v => Math.round(v * 1000) / 1000;

/**
 * 체커보드(투명 표시용 격자 무늬를 그림으로 그려 넣은 가짜 투명) 감지.
 * 테두리 네 변 중 2변 이상에서: 거의 무채색 + 밝기 두 무리 + 같은 길이의 교대 run.
 */
export function detectCheckerboard(img) {
  const { width: w, height: h, data: d } = img;
  const sides = [
    Array.from({ length: w }, (_, x) => x),
    Array.from({ length: w }, (_, x) => (h - 1) * w + x),
    Array.from({ length: h }, (_, y) => y * w),
    Array.from({ length: h }, (_, y) => y * w + w - 1),
  ];
  // 안쪽 한 줄도 본다(1px 테두리선 대비)
  const inset = Math.min(3, Math.floor(Math.min(w, h) / 8));
  if (inset > 0) {
    sides.push(Array.from({ length: w }, (_, x) => inset * w + x));
    sides.push(Array.from({ length: h }, (_, y) => y * w + inset));
  }
  let hits = 0;
  for (const side of sides) if (sideIsChecker(d, side)) hits++;
  return hits >= 2;
}

function sideIsChecker(d, side) {
  const lum = [];
  for (const i of side) {
    const r = d[i * 4], g = d[i * 4 + 1], b = d[i * 4 + 2], a = d[i * 4 + 3];
    if (a < 250) return false;                                        // 실제 투명이 있으면 체커보드 아님
    if (Math.max(r, g, b) - Math.min(r, g, b) > 14) continue;         // 유채색은 건너뜀
    lum.push((r + g + b) / 3);
  }
  if (lum.length < side.length * 0.8 || lum.length < 16) return false;
  const lo = Math.min(...lum), hi = Math.max(...lum);
  if (hi - lo < 10) return false;
  const mid = (lo + hi) / 2;
  const cls = lum.map(v => (v > mid ? 1 : 0));
  const ones = cls.reduce((s, v) => s + v, 0);
  if (ones < cls.length * 0.2 || ones > cls.length * 0.8) return false;
  const runs = [];
  let cur = cls[0], len = 0;
  for (const c of cls) { if (c === cur) len++; else { runs.push(len); cur = c; len = 1; } }
  runs.push(len);
  const inner = runs.slice(1, -1);
  if (inner.length < 4) return false;
  const mean = inner.reduce((s, v) => s + v, 0) / inner.length;
  if (mean < 2 || mean > 128) return false;
  const sd = Math.sqrt(inner.reduce((s, v) => s + (v - mean) ** 2, 0) / inner.length);
  return sd / mean < 0.25;
}
