// PPTX → 슬라이드 그림. @silurus/ooxml(MIT, Rust WASM 파서 + canvas 그리기)의 PptxPresentation 을 메인 모드로 쓴다.
// 쪽마다 canvas 에 renderSlide 한 뒤 WebP 로 저장한다. 글꼴은 Noto Sans/Serif KR(OFL)을 fonts 옵션으로 심는다.
import { getVendor } from './vendor.js';
import { ConvertError, fetchVerified, blobModuleUrl, makeCanvas, emitPage, checkPageCount, yieldToUi, LIMITS } from './core.js';
import { loadFonts, fontBytes } from './fonts.js';

let libP = null;

// 문서가 부르는 글꼴 이름을 Noto 로 바꾼다. 이 PC 에 같은 이름의 글꼴이 있으면 그것이 우선이고(라이브러리 규칙), 없을 때만 쓰인다.
const SANS = ['맑은 고딕', 'Malgun Gothic', '나눔고딕', 'NanumGothic', '나눔스퀘어', '나눔바른고딕', '돋움', 'Dotum', '굴림', 'Gulim', '함초롬돋움', 'HCR Dotum',
  '휴먼엑스포', 'Pretendard', 'Apple SD Gothic Neo', 'Segoe UI', 'Arial', 'Calibri', 'Helvetica', 'Verdana', 'Tahoma', 'Noto Sans CJK KR', 'Source Han Sans K', 'Carlito'];
const SERIF = ['바탕', 'Batang', '바탕체', '명조', '함초롬바탕', 'HCR Batang', '나눔명조', 'NanumMyeongjo', '궁서', 'Gungsuh', 'Times New Roman', 'Cambria', 'Georgia', 'Garamond', 'Caladea', 'Noto Serif CJK KR'];
const SUBS = [...SANS.map((f) => ({ for: f, use: 'Noto Sans KR' })), ...SERIF.map((f) => ({ for: f, use: 'Noto Serif KR' }))];

function loadLib(ctx) {
  if (!libP) {
    libP = (async () => {
      const v = getVendor().silurus;
      ctx.progress('load', 0, 1, 'PPTX 변환기를 받는 중');
      const wasmBytes = await fetchVerified(v.wasm, v.wasmSha256, ctx);
      let lastErr = '', mod = null;
      for (const url of [].concat(v.entry)) {
        ctx.check();
        try {
          // 진입 파일은 해시를 확인한 뒤 같은 주소로 다시 불러 조각 파일이 상대 경로로 이어지게 한다.
          await fetchVerified(url, v.entrySha256, ctx);
          mod = await import(/* @vite-ignore */ url);
          break;
        } catch (e) {
          if (e instanceof ConvertError && e.code === 'ABORTED') throw e;
          lastErr = `${url} → ${e && (e.detail || e.message)}`;
        }
      }
      if (!mod) throw new ConvertError('VENDOR_LOAD', lastErr);
      return { mod, wasmUrl: blobModuleUrl(wasmBytes, 'application/wasm') };
    })();
    libP.catch(() => { libP = null; });
  }
  return libP;
}

function fontSources(mod) {
  const faces = fontBytes().map((b) => ({ family: b.family, weight: String(b.weight), data: b.bytes.slice().buffer }));
  return [mod.fontFiles({ faces, substitutions: SUBS })];
}

export async function convertPptx(file, ctx, out) {
  await loadFonts(ctx);
  const { mod, wasmUrl } = await loadLib(ctx);
  ctx.check();
  const bytes = await file.arrayBuffer();
  let pres;
  try {
    pres = await mod.PptxPresentation.load(bytes, { mode: 'main', wasmUrl, cjkFallback: 'kr', fonts: fontSources(mod) });
    try { await pres.waitUntilLayoutComplete(); } catch (_) { /* 배치 완료 대기가 없는 버전은 넘어간다 */ }
  } catch (e) { throw new ConvertError('PPTX_PARSE', e && e.message, e); }
  ctx.onAbort(() => { try { pres.destroy(); } catch (_) { /* 무시 */ } });
  try {
    const visible = [];
    for (let i = 0; i < pres.slideCount; i++) if (!pres.isHidden(i)) visible.push(i);
    if (visible.length < pres.slideCount) ctx.warn(`숨김 처리된 슬라이드 ${pres.slideCount - visible.length}장은 뺐습니다.`);
    checkPageCount(visible.length);
    const n = visible.length;
    const ratio = pres.slideHeight / pres.slideWidth;
    const w = LIMITS.longSide;
    for (let i = 0; i < n; i++) {
      ctx.check();
      ctx.progress('render', i, n, `${i + 1}/${n}쪽`);
      let canvas;
      try {
        // 긴 변이 2000px 이 되게 가로 기준(가로 슬라이드)·세로 기준(세로 슬라이드)을 나눈다.
        const cw = ratio <= 1 ? w : Math.max(1, Math.round(w / ratio));
        const ch = Math.max(1, Math.round(cw * ratio));
        canvas = makeCanvas(cw, ch);
        const g = canvas.getContext('2d');
        g.fillStyle = '#fff';
        g.fillRect(0, 0, cw, ch);
        await pres.renderSlide(canvas, visible[i], { width: cw });
      } catch (e) {
        if (ctx.signal?.aborted) throw new ConvertError('ABORTED');
        throw new ConvertError('PPTX_RENDER', `${i + 1}번 슬라이드: ${e && (e.message || e)}`, e);
      }
      await emitPage(canvas, out, ctx);
      await yieldToUi();
    }
    ctx.progress('render', n, n, '');
  } finally {
    try { pres.destroy(); } catch (_) { /* 이미 해제됨 */ }
  }
  ctx.warn('슬라이드의 움직임·전환·동영상은 들어가지 않습니다. 이 기기에 없는 글꼴은 Noto 로 바뀌어 줄바꿈이 조금 다를 수 있습니다.');
}
