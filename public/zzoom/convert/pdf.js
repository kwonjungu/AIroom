// PDF → 쪽 그림. pdfjs-dist(본체·worker 같은 버전, 해시 고정) 로 한 쪽씩 canvas 에 그린다.
import { getVendor } from './vendor.js';
import { ConvertError, fetchVerified, blobModuleUrl, makeCanvas, emitPage, checkPageCount, fitScale, yieldToUi } from './core.js';

let libP = null;

// 구형 브라우저(Chrome 148 미만 등)에는 Math.sumPrecise 가 없어 pdf.js 가 암호·일부 PDF 에서 멈춘다.
// 해시를 확인한 본체·worker 바이트 앞에 같은 정의를 붙여 둘 다에서 쓰게 한다.
const POLY = new TextEncoder().encode(
  'if(!Math.sumPrecise){Math.sumPrecise=function(it){let s=0,c=0;for(const x of it){const t=s+x;c+=Math.abs(s)>=Math.abs(x)?(s-t)+x:(x-t)+s;s=t}return s+c}}\n');
const withPoly = (bytes) => { const o = new Uint8Array(POLY.length + bytes.length); o.set(POLY); o.set(bytes, POLY.length); return o; };

function loadPdfjs(ctx) {
  if (!libP) {
    libP = (async () => {
      const v = getVendor().pdfjs;
      ctx.progress('load', 0, 1, 'PDF 변환기를 받는 중');
      const [lib, worker] = await Promise.all([
        fetchVerified(v.lib, v.libSha256, ctx),
        fetchVerified(v.worker, v.workerSha256, ctx),
      ]);
      const url = blobModuleUrl(withPoly(lib));
      let mod;
      try { mod = await import(/* @vite-ignore */ url); } finally { URL.revokeObjectURL(url); }
      // worker 는 해시를 확인한 바이트로 만든 blob 주소를 쓴다(주소가 바뀔 일이 없는 한 번 적재).
      mod.GlobalWorkerOptions.workerSrc = blobModuleUrl(withPoly(worker));
      return mod;
    })();
    libP.catch(() => { libP = null; });
  }
  return libP;
}

function openError(e) {
  const n = e && e.name;
  if (n === 'PasswordException') return new ConvertError('PDF_PASSWORD', e.message, e);
  return new ConvertError('PDF_PARSE', e && e.message, e);
}

export async function convertPdf(file, ctx, out) {
  const pdfjs = await loadPdfjs(ctx);
  ctx.check();
  const base = getVendor().pdfjs.base;
  const data = new Uint8Array(await file.arrayBuffer());
  const task = pdfjs.getDocument({
    data,
    cMapUrl: base + 'cmaps/', cMapPacked: true,
    standardFontDataUrl: base + 'standard_fonts/',
    wasmUrl: base + 'wasm/',
    isEvalSupported: false,
  });
  ctx.onAbort(() => { task.destroy().catch(() => {}); });
  let pdf;
  try { pdf = await task.promise; } catch (e) { if (ctx.signal?.aborted) throw new ConvertError('ABORTED'); throw openError(e); }
  try {
    const n = pdf.numPages;
    checkPageCount(n);
    for (let i = 1; i <= n; i++) {
      ctx.check();
      ctx.progress('render', i - 1, n, `${i}/${n}쪽`);
      let page, canvas;
      try {
        page = await pdf.getPage(i);
        const base1 = page.getViewport({ scale: 1 });
        const viewport = page.getViewport({ scale: fitScale(base1.width, base1.height) });
        canvas = makeCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
        const g = canvas.getContext('2d');
        g.fillStyle = '#fff';
        g.fillRect(0, 0, canvas.width, canvas.height);
        const rt = page.render({ canvasContext: g, canvas, viewport, background: '#ffffff' });
        ctx.onAbort(() => { try { rt.cancel(); } catch (_) { /* 이미 끝남 */ } });
        await rt.promise;
      } catch (e) {
        if (ctx.signal?.aborted) throw new ConvertError('ABORTED');
        if (e instanceof ConvertError) throw e;
        throw new ConvertError('PDF_RENDER', `${i}쪽: ${e && e.message}`, e);
      } finally { try { page && page.cleanup(); } catch (_) { /* 무시 */ } }
      await emitPage(canvas, out, ctx);
      await yieldToUi();
    }
    ctx.progress('render', n, n, '');
  } finally {
    try { await task.destroy(); } catch (_) { /* 무시 */ }
  }
}
