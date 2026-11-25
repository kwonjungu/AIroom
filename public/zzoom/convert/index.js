// 쭘 파일 변환 진입점. 브라우저(메인 스레드) 전용 ES 모듈.
//   import { convert, ConvertError } from '/zzoom/convert/index.js';
//   const r = await convert(file, { onProgress, signal });
//   → { kind: 'pdf'|'image'|'hwp'|'pptx', pages:[{blob,w,h,type}], thumbs:[Blob], warnings:[string] }
// 실패는 ConvertError(code, message=한국어 안내, detail=기술 설명). 코드 표는 core.js 의 ERROR_MESSAGES_KO.
import { LIMITS, ConvertError, Ctx, ERROR_MESSAGES_KO } from './core.js';

export { LIMITS, ConvertError, ERROR_MESSAGES_KO };

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
 * @param {File|Blob} file  Blob 이면 name 이 없으므로 File 을 쓸 것
 * @param {{onProgress?:(p:{phase:'load'|'render',done:number,total:number,ratio:number,message:string})=>void, signal?:AbortSignal}} [opts]
 */
export async function convert(file, opts = {}) {
  if (opts.signal?.aborted) throw new ConvertError('ABORTED');
  const kind = detectKind(file);
  if (file.size > LIMITS.maxBytes) throw new ConvertError('FILE_TOO_LARGE', `${(file.size / 1048576).toFixed(1)}MB`);
  if (!file.size) throw new ConvertError('EMPTY_DOCUMENT', '빈 파일');
  const ctx = new Ctx(opts);
  const out = { kind, pages: [], thumbs: [], warnings: ctx.warnings };
  try {
    if (kind === 'pdf') await (await import('./pdf.js')).convertPdf(file, ctx, out);
    else if (kind === 'hwp') await (await import('./hwp.js')).convertHwp(file, ctx, out);
    else if (kind === 'pptx') await (await import('./pptx.js')).convertPptx(file, ctx, out);
    else await (await import('./image.js')).convertImage(file, ctx, out);
  } catch (e) {
    out.pages.length = 0; out.thumbs.length = 0; // 이미 만든 쪽은 버린다
    if (e instanceof ConvertError) throw e;
    throw new ConvertError(ctx.signal?.aborted ? 'ABORTED' : 'UNKNOWN', e && (e.message || e), e);
  }
  ctx.check();
  return out;
}
