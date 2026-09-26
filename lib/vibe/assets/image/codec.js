// 순수 JS 이미지 코덱 (의존성 없음, zlib는 Node 내장).
// - sniffMime: 매직 바이트로 실제 형식 판정 (선언된 Content-Type을 믿지 않는다)
// - readDimensions: PNG/JPEG/WebP/GIF/SVG 헤더에서 픽셀 크기만 읽는다 (디코딩 없음)
// - decodePng: PNG → RGBA8 (비인터레이스, 비트 깊이 1/2/4/8/16, 색 형식 0/2/3/4/6, tRNS 지원)
// - encodePng: RGBA8 → PNG (행별 필터 선택 + deflate)
// JPEG/WebP 픽셀 디코딩은 하지 않는다 → 투명도·빈 그림 검사는 PNG에만 적용된다.

import zlib from 'node:zlib';

export class CodecError extends Error {
  /** @param {string} code  DECODE_FAILED | UNSUPPORTED_PNG | TOO_MANY_PIXELS | ... */
  constructor(code, message) { super(message || code); this.code = code; }
}

const PNG_SIG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

/** @param {Uint8Array} b @returns {'image/png'|'image/jpeg'|'image/webp'|'image/gif'|'image/svg+xml'|null} */
export function sniffMime(b) {
  if (!b || b.length < 12) return null;
  if (PNG_SIG.every((v, i) => b[i] === v)) return 'image/png';
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  if (ascii(b, 0, 4) === 'RIFF' && ascii(b, 8, 4) === 'WEBP') return 'image/webp';
  if (ascii(b, 0, 6) === 'GIF87a' || ascii(b, 0, 6) === 'GIF89a') return 'image/gif';
  const head = ascii(b, 0, Math.min(b.length, 512)).replace(/^﻿/, '').trimStart().toLowerCase();
  if (head.startsWith('<svg') || (head.startsWith('<?xml') && head.includes('<svg'))) return 'image/svg+xml';
  return null;
}

function ascii(b, off, len) {
  let s = '';
  for (let i = off; i < off + len && i < b.length; i++) s += String.fromCharCode(b[i]);
  return s;
}
const u32 = (b, o) => ((b[o] << 24) >>> 0) + (b[o + 1] << 16) + (b[o + 2] << 8) + b[o + 3];
const u16 = (b, o) => (b[o] << 8) | b[o + 1];
const u16le = (b, o) => b[o] | (b[o + 1] << 8);
const u24le = (b, o) => b[o] | (b[o + 1] << 8) | (b[o + 2] << 16);

/**
 * 헤더만 읽어 크기를 돌려준다. 모르면 null.
 * @returns {{width:number, height:number, mime:string}|null}
 */
export function readDimensions(b) {
  const mime = sniffMime(b);
  try {
    if (mime === 'image/png') {
      if (ascii(b, 12, 4) !== 'IHDR') return null;
      return { width: u32(b, 16), height: u32(b, 20), mime };
    }
    if (mime === 'image/gif') return { width: u16le(b, 6), height: u16le(b, 8), mime };
    if (mime === 'image/jpeg') {
      let o = 2;
      while (o + 9 < b.length) {
        if (b[o] !== 0xff) { o++; continue; }
        const m = b[o + 1];
        if (m === 0xd8 || m === 0x01 || (m >= 0xd0 && m <= 0xd7)) { o += 2; continue; }
        const len = u16(b, o + 2);
        // SOF0..SOF15 (DHT C4, JPG C8, DAC CC 제외)
        if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) {
          return { width: u16(b, o + 7), height: u16(b, o + 5), mime };
        }
        o += 2 + len;
      }
      return null;
    }
    if (mime === 'image/webp') {
      const chunk = ascii(b, 12, 4);
      if (chunk === 'VP8X') return { width: 1 + u24le(b, 24), height: 1 + u24le(b, 27), mime, alphaFlag: !!(b[20] & 0x10) };
      if (chunk === 'VP8L') {
        const bits = b[21] | (b[22] << 8) | (b[23] << 16) | (b[24] << 24);
        return { width: 1 + (bits & 0x3fff), height: 1 + ((bits >>> 14) & 0x3fff), mime };
      }
      if (chunk === 'VP8 ') return { width: u16le(b, 26) & 0x3fff, height: u16le(b, 28) & 0x3fff, mime };
      return null;
    }
    if (mime === 'image/svg+xml') {
      const s = Buffer.from(b.subarray(0, Math.min(b.length, 4096))).toString('utf8');
      const tag = (s.match(/<svg\b[^>]*>/i) || [''])[0];
      const w = tag.match(/\bwidth\s*=\s*["']\s*([\d.]+)\s*(px)?\s*["']/i);
      const h = tag.match(/\bheight\s*=\s*["']\s*([\d.]+)\s*(px)?\s*["']/i);
      if (w && h) return { width: Math.round(+w[1]), height: Math.round(+h[1]), mime };
      const vb = tag.match(/\bviewBox\s*=\s*["']\s*[-\d.]+[\s,]+[-\d.]+[\s,]+([\d.]+)[\s,]+([\d.]+)\s*["']/i);
      if (vb) return { width: Math.round(+vb[1]), height: Math.round(+vb[2]), mime, fromViewBox: true };
      return null;
    }
  } catch { return null; }
  return null;
}

// ── CRC32 ──
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
export function crc32(buf, start = 0, end = buf.length) {
  let c = 0xffffffff;
  for (let i = start; i < end; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

const CHANNELS = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 };

/**
 * @param {Uint8Array} b
 * @param {{ maxPixels?: number }} [opts]
 * @returns {{width:number, height:number, data:Uint8Array, hasAlphaChannel:boolean, colorType:number, bitDepth:number}}
 */
export function decodePng(b, opts = {}) {
  const maxPixels = opts.maxPixels ?? 4_194_304;
  if (sniffMime(b) !== 'image/png') throw new CodecError('DECODE_FAILED', 'not a png');
  let o = 8;
  let ihdr = null, palette = null, trns = null, ended = false;
  const idat = [];
  while (o + 8 <= b.length) {
    const len = u32(b, o);
    const type = ascii(b, o + 4, 4);
    if (o + 12 + len > b.length) throw new CodecError('DECODE_FAILED', 'truncated chunk ' + type);
    const crc = u32(b, o + 8 + len);
    if (crc32(b, o + 4, o + 8 + len) !== crc) throw new CodecError('DECODE_FAILED', 'crc mismatch ' + type);
    const data = b.subarray(o + 8, o + 8 + len);
    if (type === 'IHDR') {
      ihdr = { width: u32(data, 0), height: u32(data, 4), bitDepth: data[8], colorType: data[9], compression: data[10], filter: data[11], interlace: data[12] };
    } else if (type === 'PLTE') palette = data;
    else if (type === 'tRNS') trns = data;
    else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') { ended = true; break; }
    o += 12 + len;
  }
  if (!ihdr) throw new CodecError('DECODE_FAILED', 'no IHDR');
  if (!ended) throw new CodecError('DECODE_FAILED', 'no IEND (truncated)');
  if (!idat.length) throw new CodecError('DECODE_FAILED', 'no IDAT');
  const { width, height, bitDepth, colorType, interlace } = ihdr;
  if (!width || !height) throw new CodecError('DECODE_FAILED', 'zero size');
  if (width * height > maxPixels) throw new CodecError('TOO_MANY_PIXELS', `${width}x${height}`);
  if (interlace !== 0) throw new CodecError('UNSUPPORTED_PNG', 'interlaced png not supported');
  const ch = CHANNELS[colorType];
  if (!ch) throw new CodecError('DECODE_FAILED', 'bad color type');
  if (![1, 2, 4, 8, 16].includes(bitDepth)) throw new CodecError('DECODE_FAILED', 'bad bit depth');
  if (colorType === 3 && !palette) throw new CodecError('DECODE_FAILED', 'missing palette');

  const bpp = Math.max(1, (ch * bitDepth) >> 3);           // 필터용 바이트/픽셀
  const stride = Math.ceil((width * ch * bitDepth) / 8);
  const expected = (stride + 1) * height;
  let raw;
  try {
    raw = zlib.inflateSync(Buffer.concat(idat.map(d => Buffer.from(d.buffer, d.byteOffset, d.byteLength))), { maxOutputLength: expected + 1024 });
  } catch (e) { throw new CodecError('DECODE_FAILED', 'inflate: ' + (e.code || e.message)); }
  if (raw.length < expected) throw new CodecError('DECODE_FAILED', 'short image data');

  // 필터 해제
  const cur = new Uint8Array(stride), prev = new Uint8Array(stride);
  const out = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++) {
    const f = raw[y * (stride + 1)];
    const row = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let i = 0; i < stride; i++) {
      const a = i >= bpp ? cur[i - bpp] : 0, up = prev[i], c = i >= bpp ? prev[i - bpp] : 0;
      let v = row[i];
      switch (f) {
        case 0: break;
        case 1: v += a; break;
        case 2: v += up; break;
        case 3: v += (a + up) >> 1; break;
        case 4: { const p = a + up - c, pa = Math.abs(p - a), pb = Math.abs(p - up), pc = Math.abs(p - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? up : c; break; }
        default: throw new CodecError('DECODE_FAILED', 'bad filter ' + f);
      }
      cur[i] = v & 0xff;
    }
    unpackRow(cur, y, width, ch, bitDepth, colorType, palette, trns, out);
    prev.set(cur);
  }
  return { width, height, data: out, hasAlphaChannel: colorType === 4 || colorType === 6 || !!trns, colorType, bitDepth };
}

function unpackRow(row, y, width, ch, depth, ct, palette, trns, out) {
  const sample = (idx) => { // idx = 샘플 번호
    if (depth === 8) return row[idx];
    if (depth === 16) return row[idx * 2]; // 상위 바이트
    const perByte = 8 / depth, byte = row[Math.floor(idx / perByte)];
    const shift = 8 - depth * ((idx % perByte) + 1);
    return (byte >> shift) & ((1 << depth) - 1);
  };
  const sample16 = idx => (row[idx * 2] << 8) | row[idx * 2 + 1];
  const scale = depth < 8 ? 255 / ((1 << depth) - 1) : 1;
  for (let x = 0; x < width; x++) {
    const o = (y * width + x) * 4;
    let r, g, bl, a = 255;
    if (ct === 3) {
      const i = sample(x);
      r = palette[i * 3] ?? 0; g = palette[i * 3 + 1] ?? 0; bl = palette[i * 3 + 2] ?? 0;
      a = trns && i < trns.length ? trns[i] : 255;
    } else if (ct === 0) {
      const v = sample(x);
      r = g = bl = Math.round(v * scale);
      if (trns) {
        const tv = (trns[0] << 8) | trns[1];
        const raw = depth === 16 ? sample16(x) : v;
        if (raw === tv) a = 0;
      }
    } else if (ct === 4) {
      r = g = bl = sample(x * 2); a = sample(x * 2 + 1);
    } else if (ct === 2) {
      r = sample(x * 3); g = sample(x * 3 + 1); bl = sample(x * 3 + 2);
      if (trns) {
        const tr = (trns[0] << 8) | trns[1], tg = (trns[2] << 8) | trns[3], tb = (trns[4] << 8) | trns[5];
        const rr = depth === 16 ? sample16(x * 3) : r, gg = depth === 16 ? sample16(x * 3 + 1) : g, bb = depth === 16 ? sample16(x * 3 + 2) : bl;
        if (rr === tr && gg === tg && bb === tb) a = 0;
      }
    } else { // 6
      r = sample(x * 4); g = sample(x * 4 + 1); bl = sample(x * 4 + 2); a = sample(x * 4 + 3);
    }
    out[o] = r; out[o + 1] = g; out[o + 2] = bl; out[o + 3] = a;
  }
}

function chunk(type, data) {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 'ascii');
  Buffer.from(data.buffer, data.byteOffset, data.byteLength).copy(out, 8);
  out.writeUInt32BE(crc32(out, 4, 8 + data.length), 8 + data.length);
  return out;
}

/**
 * RGBA8 → PNG. opaque:true면 알파 채널을 빼고 RGB로 저장한다(용량 절약).
 * @param {{width:number, height:number, data:Uint8Array}} img
 * @param {{ opaque?: boolean, level?: number }} [opts]
 */
export function encodePng(img, opts = {}) {
  const { width, height, data } = img;
  const ch = opts.opaque ? 3 : 4;
  const stride = width * ch;
  const raw = Buffer.alloc((stride + 1) * height);
  const prev = new Uint8Array(stride), cur = new Uint8Array(stride), cand = new Uint8Array(stride);
  const best = new Uint8Array(stride);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) for (let c = 0; c < ch; c++) cur[x * ch + c] = data[(y * width + x) * 4 + c];
    let bestF = 0, bestScore = Infinity;
    for (let f = 0; f < 5; f++) {
      let score = 0;
      for (let i = 0; i < stride; i++) {
        const a = i >= ch ? cur[i - ch] : 0, up = prev[i], c = i >= ch ? prev[i - ch] : 0;
        let p;
        switch (f) {
          case 0: p = 0; break;
          case 1: p = a; break;
          case 2: p = up; break;
          case 3: p = (a + up) >> 1; break;
          default: { const q = a + up - c, pa = Math.abs(q - a), pb = Math.abs(q - up), pc = Math.abs(q - c); p = pa <= pb && pa <= pc ? a : pb <= pc ? up : c; }
        }
        const v = (cur[i] - p) & 0xff;
        cand[i] = v;
        score += v < 128 ? v : 256 - v;
      }
      if (score < bestScore) { bestScore = score; bestF = f; best.set(cand); }
    }
    raw[y * (stride + 1)] = bestF;
    raw.set(best, y * (stride + 1) + 1);
    prev.set(cur);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = opts.opaque ? 2 : 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from(PNG_SIG),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: opts.level ?? 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}
