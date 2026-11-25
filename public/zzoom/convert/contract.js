// 원본 파일 형식표 — 서버(lib/zzoom/contract.js)와 **같은 내용**이어야 한다(tests/zzoom/convert.test.mjs 가 비교).
// 확장자 → { kind: 서버 안건 종류, mimes: 받는 MIME(첫째가 기본값) }. 어느 확장자든 application/octet-stream 도 받는다.
export const SOURCES = Object.freeze({
  pdf: { kind: 'pdf', mimes: ['application/pdf'] },
  hwp: { kind: 'hwp', mimes: ['application/x-hwp', 'application/haansofthwp', 'application/vnd.hancom.hwp'] },
  hwpx: { kind: 'hwpx', mimes: ['application/hwp+zip', 'application/haansofthwpx', 'application/vnd.hancom.hwpx'] },
  pptx: { kind: 'pptx', mimes: ['application/vnd.openxmlformats-officedocument.presentationml.presentation'] },
  png: { kind: 'image', mimes: ['image/png'] },
  jpg: { kind: 'image', mimes: ['image/jpeg'] },
  jpeg: { kind: 'image', mimes: ['image/jpeg'] },
  webp: { kind: 'image', mimes: ['image/webp'] },
  gif: { kind: 'image', mimes: ['image/gif'] },
  bmp: { kind: 'image', mimes: ['image/bmp'] },
  avif: { kind: 'image', mimes: ['image/avif'] },
  heic: { kind: 'image', mimes: ['image/heic'] },
  heif: { kind: 'image', mimes: ['image/heif'] },
});
// 원본은 50MiB **미만**(정확히 50MiB 는 거절).
export const MAX_ORIGINAL_BYTES = 50 * 1024 * 1024 - 1;
export const FALLBACK_MIME = 'application/octet-stream';
