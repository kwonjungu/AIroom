// HWP·HWPX → 쪽 그림. @rhwp/core 의 renderPageToCanvas 를 메인 스레드에서 한 쪽씩 쓴다(0단계 실험 경로 2).
// Worker 에서는 rhwp 가 HTMLCanvasElement 만 받아 쓸 수 없고, SVG 경로는 그림 안에서 웹폰트를 못 써서 택하지 않았다.
import { getVendor } from './vendor.js';
import { ConvertError, fetchVerified, blobModuleUrl, makeCanvas, freeCanvas, emitPage, checkPageCount, fitScale, yieldToUi, sharedLoader, fitCanvas } from './core.js';
import { loadFonts } from './fonts.js';


// 적재는 여러 변환이 나눠 쓰고, 한 변환의 취소에 묶이지 않는다(R1-N11)
const loadRhwp = sharedLoader(async (ctx) => {
    {
      const v = getVendor().rhwp;
      ctx.progress('load', 0, 1, '한/글 변환기를 받는 중');
      const [js, wasm] = await Promise.all([
        fetchVerified(v.js, v.jsSha256, ctx),
        fetchVerified(v.wasm, v.wasmSha256, ctx),
      ]);
      // 글자 폭 측정 함수는 WASM 시작 전에 있어야 한다. 글꼴이 적재된 뒤의 같은 canvas 글꼴 규칙을 쓴다.
      let mctx = null, last = '';
      globalThis.measureTextWidth = (font, text) => {
        if (!mctx) mctx = document.createElement('canvas').getContext('2d');
        if (font !== last) { mctx.font = font; last = font; }
        return mctx.measureText(text).width;
      };
      const url = blobModuleUrl(js);
      try {
        const mod = await ctx.race(import(/* @vite-ignore */ url));
        await ctx.race(mod.default({ module_or_path: wasm }));
        return mod;
      } finally { URL.revokeObjectURL(url); }
    }
});

function openError(e) {
  const msg = String((e && (e.message || e)) || '');
  if (/password|passwd|encrypt|암호|DRM|protected/i.test(msg)) return new ConvertError('HWP_PASSWORD', msg, e);
  return new ConvertError('HWP_PARSE', msg, e);
}

export async function convertHwp(file, ctx, out) {
  await loadFonts(ctx);
  const rhwp = await loadRhwp(ctx);
  ctx.check();
  const bytes = new Uint8Array(await file.arrayBuffer());
  let doc;
  try { doc = new rhwp.HwpDocument(bytes); } catch (e) { throw openError(e); }
  try {
    const n = doc.pageCount();
    checkPageCount(n, ctx);
    for (let i = 0; i < n; i++) {
      ctx.check();
      ctx.progress('render', i, n, `${i + 1}/${n}쪽`);
      let canvas;
      try {
        const info = JSON.parse(doc.getPageInfo(i));
        canvas = makeCanvas(1, 1);
        doc.renderPageToCanvas(i, canvas, fitScale(info.width, info.height));
        // rhwp 는 쪽 바깥 가장자리를 투명으로 둔다. WebP 에서 검게 나오지 않게 흰 바탕을 뒤에 깐다.
        const g = canvas.getContext('2d');
        g.globalCompositeOperation = 'destination-over';
        g.fillStyle = '#fff';
        g.fillRect(0, 0, canvas.width, canvas.height);
        g.globalCompositeOperation = 'source-over';
        // rhwp 가 크기를 정하므로 올림으로 2001px 이 나올 수 있다 — PDF 처럼 긴 변 2000px 안으로 줄인다(R1-N6)
        canvas = fitCanvas(canvas);
      } catch (e) {
        if (canvas) freeCanvas(canvas);   // 실패한 쪽 캔버스도 비운다(지적10)
        // rhwp 의 쪽 그리기는 동기 WASM 호출이라 도중에 끊을 수 없다 — 쪽 사이에서만 시한·취소를 본다.
        throw new ConvertError('HWP_RENDER', `${i + 1}쪽: ${e && (e.message || e)}`, e);
      }
      await emitPage(canvas, out, ctx);
      await yieldToUi();
    }
    ctx.progress('render', n, n, '');
  } finally {
    try { doc.free(); } catch (_) { /* 이미 해제됨 */ }
  }
  ctx.warn('한/글 문서는 글꼴이 달라 원본과 줄바꿈이 조금 다를 수 있습니다. 중요한 문서는 PDF로 저장해 올리면 더 정확합니다.');
}
