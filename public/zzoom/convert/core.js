// 변환 엔진 공통: 오류, 한도, 취소·시간 확인, 해시 확인 내려받기, WebP·썸네일.

export const LIMITS = Object.freeze({
  maxPages: 60,
  maxBytes: 50 * 1024 * 1024,
  maxMs: 3 * 60 * 1000,
  longSide: 2000,
  thumbSide: 320,
  webpQuality: 0.85,
  thumbQuality: 0.8,
  maxImagePixels: 40_000_000,
});

export const ERROR_MESSAGES_KO = Object.freeze({
  UNSUPPORTED_TYPE: '지원하지 않는 파일 형식입니다. PDF, 한/글(HWP·HWPX), PPTX, 그림 파일을 올려 주세요.',
  PPT_LEGACY: '옛 PowerPoint(.ppt) 파일은 열 수 없습니다. PowerPoint에서 PPTX나 PDF로 저장해 올려 주세요.',
  HEIC_UNSUPPORTED: 'HEIC 사진은 이 브라우저에서 열 수 없습니다. JPG나 PNG로 바꿔 올려 주세요.',
  FILE_TOO_LARGE: '파일이 50MB를 넘습니다. 파일을 줄이거나 나눠서 올려 주세요.',
  TOO_MANY_PAGES: '쪽 수가 60쪽을 넘습니다. 60쪽 이하로 나눠서 올려 주세요.',
  IMAGE_TOO_LARGE: '그림이 너무 큽니다. 크기를 줄여서 올려 주세요.',
  TIMEOUT: '변환이 3분을 넘어 멈췄습니다. 쪽 수를 줄여 다시 올려 주세요.',
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

/** 한 번의 변환에 딸린 상태. 취소·시간 제한·진행률·경고를 모은다. */
export class Ctx {
  constructor({ onProgress, signal } = {}) {
    this.onProgress = onProgress;
    this.signal = signal;
    this.deadline = Date.now() + LIMITS.maxMs;
    this.warnings = [];
    this.cleanups = [];
    this._abortHooks = [];
    if (signal) signal.addEventListener('abort', () => this._abortHooks.forEach((f) => { try { f(); } catch (_) { /* 무시 */ } }));
  }
  /** 취소될 때 바로 부를 함수(예: pdf.js 로딩 작업 파괴). */
  onAbort(fn) { this._abortHooks.push(fn); if (this.signal?.aborted) fn(); }
  check() {
    if (this.signal?.aborted) throw new ConvertError('ABORTED');
    if (Date.now() > this.deadline) throw new ConvertError('TIMEOUT');
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
      if (ctx?.signal?.aborted) throw new ConvertError('ABORTED');
      lastErr = `${url} → ${e && e.message}`;
    }
  }
  throw new ConvertError(mismatch ? 'HASH_MISMATCH' : failCode, lastErr);
}

export function blobModuleUrl(bytes) {
  return URL.createObjectURL(new Blob([bytes], { type: 'text/javascript' }));
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

/**
 * 쪽 캔버스를 WebP 와 썸네일로 바꿔 out 에 넣고 캔버스를 비운다.
 * 일부 브라우저는 WebP 인코딩을 못해 PNG 를 돌려준다. 그때는 type 이 image/png 로 남고 경고를 한 번 낸다.
 */
export async function emitPage(canvas, out, ctx) {
  const w = canvas.width, h = canvas.height;
  const blob = await toBlob(canvas, 'image/webp', LIMITS.webpQuality);
  if (!blob) throw new ConvertError('ENCODE_FAIL');
  if (blob.type !== 'image/webp') ctx.warn('이 브라우저는 WebP 저장을 지원하지 않아 PNG 로 저장했습니다. 용량이 커질 수 있습니다.');
  const s = Math.min(1, LIMITS.thumbSide / Math.max(w, h));
  const t = makeCanvas(Math.max(1, Math.round(w * s)), Math.max(1, Math.round(h * s)));
  const tc = t.getContext('2d');
  tc.imageSmoothingQuality = 'high';
  tc.drawImage(canvas, 0, 0, t.width, t.height);
  const thumb = await toBlob(t, 'image/webp', LIMITS.thumbQuality);
  freeCanvas(t);
  freeCanvas(canvas);
  if (!thumb) throw new ConvertError('ENCODE_FAIL');
  out.pages.push({ blob, w, h, type: blob.type });
  out.thumbs.push(thumb);
}

export function checkPageCount(n) {
  if (!n) throw new ConvertError('EMPTY_DOCUMENT');
  if (n > LIMITS.maxPages) throw new ConvertError('TOO_MANY_PAGES', `${n}쪽`);
}

/** 긴 변이 LIMITS.longSide 가 되는 배율. */
export function fitScale(w, h) { return LIMITS.longSide / Math.max(w, h); }
