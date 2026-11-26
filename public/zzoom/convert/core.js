import { pageCaps } from './contract.js';
// 변환 엔진 공통: 오류, 한도, 취소·시간 확인, 해시 확인 내려받기, WebP·썸네일.

export const LIMITS = Object.freeze({
  maxPages: 200,
  maxBytes: 50 * 1024 * 1024 - 1,   // 50MiB 미만(contract.js MAX_ORIGINAL_BYTES 와 같음)
  maxMs: 6 * 60 * 1000,
  longSide: 2000,
  thumbSide: 320,
  webpQuality: 0.85,
  thumbQuality: 0.8,
  // Storage 규칙과 같은 한도(storage.rules: 쪽 4MiB, 썸네일 512KiB 이하, R1-N7). 넘으면 품질을 낮춰 다시 저장한다.
  maxPageBytes: 4 * 1024 * 1024,
  maxThumbBytes: 512 * 1024,
  retryQualities: [0.7, 0.55, 0.4],
  maxImagePixels: 40_000_000,
});

export const ERROR_MESSAGES_KO = Object.freeze({
  UNSUPPORTED_TYPE: '지원하지 않는 파일 형식입니다. PDF, 한/글(HWP·HWPX), PPTX, 그림 파일을 올려 주세요.',
  PPT_LEGACY: '옛 PowerPoint(.ppt) 파일은 열 수 없습니다. PowerPoint에서 PPTX나 PDF로 저장해 올려 주세요.',
  HEIC_UNSUPPORTED: 'HEIC 사진은 이 브라우저에서 열 수 없습니다. JPG나 PNG로 바꿔 올려 주세요.',
  FILE_TOO_LARGE: '파일이 50MB를 넘습니다. 파일을 줄이거나 나눠서 올려 주세요.',
  TOO_MANY_PAGES: '쪽 수가 200쪽을 넘습니다. 200쪽 이하로 나눠서 올려 주세요.',
  IMAGE_TOO_LARGE: '그림이 너무 큽니다. 크기를 줄여서 올려 주세요.',
  TIMEOUT: '변환이 6분을 넘어 멈췄습니다. 쪽 수를 줄여 다시 올려 주세요.',
  ABORTED: '변환을 취소했습니다.',
  EMPTY_DOCUMENT: '쪽이 없는 문서입니다.',
  VENDOR_LOAD: '변환에 필요한 구성 요소를 받지 못했습니다. 네트워크를 확인하고 다시 시도해 주세요.',
  HASH_MISMATCH: '변환 구성 요소의 검증에 실패했습니다. 잠시 뒤 다시 시도해 주세요.',
  FONT_LOAD: '글꼴을 받지 못해 변환할 수 없습니다. 네트워크를 확인하고 다시 시도해 주세요.',
  HWP_PARSE: '한/글 파일을 읽지 못했습니다. 파일이 손상됐거나 지원하지 않는 형식일 수 있습니다. PDF로 저장해 올려 보세요.',
  HWP_PASSWORD: '암호가 걸린 한/글 파일입니다. 암호를 풀고 저장하거나 PDF로 저장해 올려 주세요.',
  HWP_RENDER: '한/글 문서를 그림으로 바꾸는 중 문제가 생겼습니다. PDF로 저장해 올려 보세요.',
  PDF_PARSE: 'PDF를 읽지 못했습니다. 파일이 손상됐을 수 있습니다.',
  PDF_PASSWORD: '암호가 걸린 PDF입니다. 암호를 풀고 다시 저장해 올려 주세요.',
  PDF_RENDER: 'PDF를 그림으로 바꾸는 중 문제가 생겼습니다.',
  PPTX_PARSE: 'PPTX 파일을 읽지 못했습니다. 파일이 손상됐을 수 있습니다. PDF로 저장해 올려 보세요.',
  PPTX_RENDER: '슬라이드를 그림으로 바꾸는 중 문제가 생겼습니다. PDF로 저장해 올려 보세요.',
  IMAGE_DECODE: '그림 파일을 열지 못했습니다.',
  ENCODE_FAIL: '그림을 WebP로 저장하지 못했습니다.',
  PAGE_TOO_LARGE: '쪽 그림이 너무 커서 올릴 수 없습니다(한 쪽 4MB, 쪽이 많으면 합계 200MB 안). 스캔 해상도를 낮추거나 쪽을 나눠 올려 주세요.',
  WEBP_UNSUPPORTED: '이 브라우저는 그림을 WebP로 저장하지 못해 변환할 수 없습니다. 크롬·엣지·사파리 최신판에서 다시 올려 주세요.',
  UNKNOWN: '변환 중 알 수 없는 문제가 생겼습니다.',
});

export class ConvertError extends Error {
  constructor(code, detail, cause) {
    super(ERROR_MESSAGES_KO[code] || code);
    this.name = 'ConvertError';
    this.code = code;
    this.detail = detail ? String(detail) : '';
    if (cause) this.cause = cause;
  }
}

/**
 * 한 번의 변환에 딸린 상태. 취소·시간 제한·진행률·경고를 모은다.
 * 사용자 취소(opts.signal)와 6분 시한을 **하나의 AbortController** 로 묶어 ctx.signal 로 내보낸다(지적10).
 * 내려받기(fetch)·pdf.js 로딩 등은 이 신호를 받아 시한이 지나면 실제로 끊긴다.
 */
export class Ctx {
  constructor({ onProgress, signal, maxMs = LIMITS.maxMs } = {}) {
    this.onProgress = onProgress;
    this.userSignal = signal;
    this.deadline = Date.now() + maxMs;
    this.warnings = [];
    this.cleanups = [];
    this._abortHooks = [];
    this._reason = null;
    this._ac = new AbortController();
    this.signal = this._ac.signal;
    const stop = (code) => {
      if (this._ac.signal.aborted) return;
      this._reason = code;
      this._ac.abort(new ConvertError(code));
      this._abortHooks.forEach((f) => { try { f(); } catch (_) { /* 무시 */ } });
    };
    this._stop = stop;
    if (signal) {
      if (signal.aborted) stop('ABORTED');
      else signal.addEventListener('abort', () => stop('ABORTED'), { once: true });
    }
    this._timer = setTimeout(() => stop('TIMEOUT'), Math.max(1, maxMs));
    this._timer?.unref?.();
  }
  /** 취소·시한 때 바로 부를 함수(예: pdf.js 로딩 작업 파괴). */
  onAbort(fn) { this._abortHooks.push(fn); if (this.signal.aborted) { try { fn(); } catch (_) { /* 무시 */ } } }
  /** 끝난 변환의 시한 타이머를 정리한다. */
  done() { clearTimeout(this._timer); }
  /** 지금 멈춰야 하면 ABORTED/TIMEOUT 을 던진다. */
  check() {
    if (!this.signal.aborted && Date.now() > this.deadline) this._stop('TIMEOUT');
    if (this.signal.aborted) throw new ConvertError(this._reason || 'ABORTED');
  }
  /** 끝나지 않을 수 있는 작업(라이브러리 호출)을 취소·시한과 경주시킨다. 진 작업은 기다리지 않는다. */
  race(promise) {
    this.check();
    return new Promise((resolve, reject) => {
      const onAbort = () => reject(new ConvertError(this._reason || 'ABORTED'));
      this.signal.addEventListener('abort', onAbort, { once: true });
      Promise.resolve(promise).then(
        (v) => { this.signal.removeEventListener('abort', onAbort); resolve(v); },
        (e) => { this.signal.removeEventListener('abort', onAbort); reject(this.signal.aborted ? new ConvertError(this._reason || 'ABORTED') : e); },
      );
    });
  }
  warn(msg) { if (!this.warnings.includes(msg)) this.warnings.push(msg); }
  progress(phase, done, total, message) {
    if (!this.onProgress) return;
    try { this.onProgress({ phase, done, total, ratio: total ? done / total : 0, message: message || '' }); } catch (_) { /* 화면 쪽 오류는 변환과 무관 */ }
  }
}

/** UI 가 막히지 않게 한 번 양보한다. 백그라운드 탭에서 setTimeout 이 1초로 늦춰지는 것을 피하려고 MessageChannel 을 쓴다. */
export function yieldToUi() {
  return new Promise((resolve) => {
    const ch = new MessageChannel();
    ch.port1.onmessage = () => { ch.port1.close(); resolve(); };
    ch.port2.postMessage(0);
  });
}

export async function sha256Hex(bytes) {
  const d = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * 주소 목록을 차례로 받아 해시가 맞는 첫 파일을 돌려준다.
 * 해시가 틀리면 다음 주소를 시도하고, 전부 틀리면 HASH_MISMATCH, 전부 못 받으면 failCode.
 */
export async function fetchVerified(urls, sha256, ctx, failCode = 'VENDOR_LOAD') {
  let mismatch = false, lastErr = '';
  for (const url of [].concat(urls)) {
    ctx?.check();
    try {
      const res = await fetch(url, { signal: ctx?.signal, credentials: 'omit' });
      if (!res.ok) { lastErr = `${url} → ${res.status}`; continue; }
      const bytes = new Uint8Array(await res.arrayBuffer());
      if (sha256 && (await sha256Hex(bytes)) !== sha256) { mismatch = true; lastErr = `${url} 해시 불일치`; continue; }
      return bytes;
    } catch (e) {
      if (ctx?.signal?.aborted) { ctx.check(); throw new ConvertError('ABORTED'); }
      lastErr = `${url} → ${e && e.message}`;
    }
  }
  throw new ConvertError(mismatch ? 'HASH_MISMATCH' : failCode, lastErr);
}

export function blobModuleUrl(bytes, type = 'text/javascript') {
  return URL.createObjectURL(new Blob([bytes], { type }));
}

export function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

export function freeCanvas(c) { c.width = 0; c.height = 0; }

function toBlob(canvas, type, q) {
  return new Promise((resolve) => canvas.toBlob(resolve, type, q));
}

/** WebP 로 저장하되 maxBytes 를 넘으면 품질을 낮춰 다시 저장한다. 끝내 넘으면 PAGE_TOO_LARGE(R1-N7). */
async function encodeWithin(canvas, q0, maxBytes, ctx) {
  for (const q of [q0, ...LIMITS.retryQualities.filter((x) => x < q0)]) {
    ctx?.check?.();
    const b = await toBlob(canvas, 'image/webp', q);
    if (!b) throw new ConvertError('ENCODE_FAIL');
    if (b.type !== 'image/webp') throw new ConvertError('WEBP_UNSUPPORTED', b.type);
    if (b.size <= maxBytes) return b;
  }
  throw new ConvertError('PAGE_TOO_LARGE', `${canvas.width}×${canvas.height}`);
}

/**
 * 그린 캔버스의 긴 변이 LIMITS.longSide 를 넘으면 반올림·자르기로 줄인 새 캔버스를 돌려주고 원래 것은 비운다(R1-N6).
 * rhwp 처럼 크기를 라이브러리가 정하는 경로에서 2001px 이 나와 서버가 거절하는 일을 막는다. 한도 안이면 그대로 돌려준다.
 */
export function fitCanvas(c) {
  const L = LIMITS.longSide;
  if (c.width <= L && c.height <= L) return c;
  const s = L / Math.max(c.width, c.height);
  const w = Math.max(1, Math.min(L, Math.round(c.width * s))), h = Math.max(1, Math.min(L, Math.round(c.height * s)));
  const o = makeCanvas(w, h);
  const g = o.getContext('2d');
  g.imageSmoothingQuality = 'high';
  g.drawImage(c, 0, 0, w, h);
  freeCanvas(c);
  return o;
}

/**
 * 라이브러리 적재를 여러 변환이 나눠 쓰게 한다(R1-N11). 적재는 어떤 변환의 취소에도 묶이지 않는 자기 Ctx(6분 시한)로 하고,
 * 각 변환은 자기 ctx.race 로 기다린다. 실패하면 다음 변환이 다시 시도한다.
 */
export function sharedLoader(fn) {
  let p = null;
  return (ctx) => {
    if (!p) {
      const lctx = new Ctx({ onProgress: ctx?.onProgress });
      p = Promise.resolve().then(() => fn(lctx)).finally(() => lctx.done());
      p.catch(() => { p = null; });
    }
    return ctx ? ctx.race(p) : p;
  };
}

/** 이 브라우저가 WebP 로 저장할 수 있는지 변환 전에 확인한다(못 하면 WEBP_UNSUPPORTED). 서버는 WebP 만 받는다(지적08). */
let webpOk = null;
export async function checkWebpSupport() {
  if (webpOk) return;
  const c = makeCanvas(2, 2);
  try {
    const b = await toBlob(c, 'image/webp', 0.8);
    if (!b || b.type !== 'image/webp') throw new ConvertError('WEBP_UNSUPPORTED', b ? b.type : 'null');
    webpOk = true;
  } finally { freeCanvas(c); }
}

/**
 * 쪽 캔버스를 WebP 와 썸네일로 바꿔 out 에 넣는다. 성공·실패와 관계없이 두 캔버스를 비운다(지적10).
 * WebP 가 아닌 결과(PNG 로 대신 저장하는 브라우저)는 서버가 받지 않으므로 WEBP_UNSUPPORTED 로 멈춘다(지적08).
 */
export async function emitPage(canvas, out, ctx) {
  let t = null, src = null;
  try {
    // 마지막 안전망: 어떤 변환기든 긴 변이 한도를 넘으면 줄여서 낸다(서버 bad_sizes 방지). 실패해도 finally 가 둘 다 비운다(감사 R15 L1)
    if (Math.max(canvas.width, canvas.height) > LIMITS.longSide) {
      const k = LIMITS.longSide / Math.max(canvas.width, canvas.height);
      src = canvas;
      canvas = makeCanvas(Math.max(1, Math.min(LIMITS.longSide, Math.round(src.width * k))), Math.max(1, Math.min(LIMITS.longSide, Math.round(src.height * k))));
      const g2 = canvas.getContext('2d'); g2.imageSmoothingQuality = 'high'; g2.drawImage(src, 0, 0, canvas.width, canvas.height);
      freeCanvas(src); src = null;
    }
    const w = canvas.width, h = canvas.height;
    const blob = await encodeWithin(canvas, LIMITS.webpQuality, Math.min(LIMITS.maxPageBytes, ctx?.caps?.page ?? Infinity), ctx);
    const s = Math.min(1, LIMITS.thumbSide / Math.max(w, h));
    t = makeCanvas(Math.max(1, Math.round(w * s)), Math.max(1, Math.round(h * s)));
    const tc = t.getContext('2d');
    tc.imageSmoothingQuality = 'high';
    tc.drawImage(canvas, 0, 0, t.width, t.height);
    const thumb = await encodeWithin(t, LIMITS.thumbQuality, Math.min(LIMITS.maxThumbBytes, ctx?.caps?.thumb ?? Infinity), ctx);
    ctx?.check?.();
    out.pages.push({ blob, w, h, type: 'image/webp' });
    out.thumbs.push(thumb);
  } finally {
    if (t) freeCanvas(t);
    if (src) freeCanvas(src);
    freeCanvas(canvas);
  }
}

export function checkPageCount(n, ctx) {
  if (!n) throw new ConvertError('EMPTY_DOCUMENT');
  if (n > LIMITS.maxPages) throw new ConvertError('TOO_MANY_PAGES', `${n}쪽`);
  if (ctx) ctx.caps = pageCaps(n);   // 쪽 수에 따른 파일당 상한 — 서버 업로드 허가·Storage 규칙과 같은 값(감사 R2 M2)
}

/** 긴 변이 LIMITS.longSide 가 되는 배율. */
export function fitScale(w, h) { return LIMITS.longSide / Math.max(w, h); }
