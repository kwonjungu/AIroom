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
// 업로드 허가 하나로 쓸 수 있는 쪽 그림·썸네일 파일당 상한(감사 R2 M2). 쪽 그림 합계 200MiB, 썸네일 합계 20MiB 를 넘지 않게
// 쪽 수로 나누고, 파일 하나 상한(4MiB·512KiB)을 넘지 않는다. 서버가 출입증 claim(upPageMax·upThumbMax)으로 싣고 규칙이 확인한다.
// 그래서 허가 하나 = 원본 50MiB 미만 + 쪽 200MiB + 썸네일 20MiB 이하. 변환기도 같은 값으로 저장 크기를 맞춘다.
export const PAGE_BUDGET = 200 * 1024 * 1024, THUMB_BUDGET = 20 * 1024 * 1024;
export const pageCaps = (pages) => {
  const n = Math.max(1, Math.floor(Number(pages) || 1));
  return { page: Math.min(4 * 1024 * 1024, Math.floor(PAGE_BUDGET / n)), thumb: Math.min(512 * 1024, Math.floor(THUMB_BUDGET / n)) };
};
