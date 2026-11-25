// 쭘 파일 변환 진입점. 브라우저(메인 스레드) 전용 ES 모듈.
//   import { convert, ConvertError } from '/zzoom/convert/index.js';
//   const r = await convert(file, { onProgress, signal });
//   → { kind: 'pdf'|'image'|'hwp'|'pptx'(렌더러), source:{kind,ext,mime}(서버 업로드 허가·원본 저장용, 지적09),
//       pages:[{blob,w,h,type:'image/webp'}], thumbs:[Blob], warnings:[string] }
// 실패는 ConvertError(code, message=한국어 안내, detail=기술 설명). 코드 표는 core.js 의 ERROR_MESSAGES_KO.
import { LIMITS, ConvertError, Ctx, ERROR_MESSAGES_KO, checkWebpSupport } from './core.js';
import { SOURCES, MAX_ORIGINAL_BYTES, FALLBACK_MIME } from './contract.js';

export { LIMITS, ConvertError, ERROR_MESSAGES_KO, SOURCES, MAX_ORIGINAL_BYTES };

const EXT = {
  pdf: 'pdf',
  hwp: 'hwp', hwpx: 'hwp',
  pptx: 'pptx',
  png: 'image', jpg: 'image', jpeg: 'image', webp: 'image', gif: 'image', bmp: 'image', avif: 'image',
  heic: 'image', heif: 'image',
};

/** 파일 형식을 정한다. 모르면 UNSUPPORTED_TYPE, 옛 .ppt 는 PPT_LEGACY 를 던진다. */
export function detectKind(file) {
  const name = (file.name || '').toLowerCase();
  const ext = name.includes('.') ? name.split('.').pop() : '';
  if (ext === 'ppt' || ext === 'pps') throw new ConvertError('PPT_LEGACY');
  const kind = EXT[ext];
  if (!kind) throw new ConvertError('UNSUPPORTED_TYPE', ext ? `.${ext}` : '확장자 없음');
  return kind;
}

/**
 * 서버에 보낼 원본 정보: 업로드 허가 kind·ext 와 원본 파일 contentType(형식표 contract.js, 서버와 같음).
 * 브라우저가 준 MIME 이 형식표에 있으면 그대로, 없으면 형식표의 기본 MIME(그것도 없으면 octet-stream).
 */
export function sourceOf(file) {
  const name = (file.name || '').toLowerCase();
  const ext = name.includes('.') ? name.split('.').pop() : '';
  const s = SOURCES[ext];
  if (!s) throw new ConvertError(ext === 'ppt' || ext === 'pps' ? 'PPT_LEGACY' : 'UNSUPPORTED_TYPE', ext ? `.${ext}` : '확장자 없음');
  const t = String(file.type || '').toLowerCase();
  return { kind: s.kind, ext, mime: s.mimes.includes(t) ? t : (s.mimes[0] || FALLBACK_MIME) };
}

/**
 * @param {File|Blob} file  Blob 이면 name 이 없으므로 File 을 쓸 것
 * @param {{onProgress?:(p:{phase:'load'|'render',done:number,total:number,ratio:number,message:string})=>void, signal?:AbortSignal}} [opts]
 */
export async function convert(file, opts = {}) {
  if (opts.signal?.aborted) throw new ConvertError('ABORTED');
  const kind = detectKind(file);
  const source = sourceOf(file);
  // 서버·Storage 규칙과 같은 경계: 50MiB **미만**만(정확히 50MiB 거절)
  if (file.size > MAX_ORIGINAL_BYTES) throw new ConvertError('FILE_TOO_LARGE', `${(file.size / 1048576).toFixed(1)}MB`);
  if (!file.size) throw new ConvertError('EMPTY_DOCUMENT', '빈 파일');
  await checkWebpSupport();   // 서버는 WebP 만 받는다 — 못 하는 브라우저는 시작 전에 멈춘다(지적08)
  const ctx = new Ctx(opts);
  const out = { kind, source, pages: [], thumbs: [], warnings: ctx.warnings };
  try {
    if (kind === 'pdf') await (await import('./pdf.js')).convertPdf(file, ctx, out);
    else if (kind === 'hwp') await (await import('./hwp.js')).convertHwp(file, ctx, out);
    else if (kind === 'pptx') await (await import('./pptx.js')).convertPptx(file, ctx, out);
    else await (await import('./image.js')).convertImage(file, ctx, out);
  } catch (e) {
    out.pages.length = 0; out.thumbs.length = 0; // 이미 만든 쪽은 버린다
    ctx.done();
    if (e instanceof ConvertError) throw e;
    if (ctx.signal.aborted) { try { ctx.check(); } catch (x) { throw x; } }
    throw new ConvertError('UNKNOWN', e && (e.message || e), e);
  }
  try { ctx.check(); } finally { ctx.done(); }
  return out;
}
