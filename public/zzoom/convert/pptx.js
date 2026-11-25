// PPTX → 슬라이드 그림. @office-kit/pptx 로 읽고 @office-kit/pptx-preview 로 SVG(textLayout:'svg', foreignObject 없음)를 만든 뒤
// SVG 안에 Noto 글꼴을 심어 Image → canvas 로 래스터한다. 숨긴 슬라이드는 뺀다.
import { getVendor } from './vendor.js';
import { ConvertError, makeCanvas, emitPage, checkPageCount, fitScale, yieldToUi } from './core.js';
import { loadFonts, fontCssFor } from './fonts.js';

let modsP = null;

function loadKit(ctx) {
  if (!modsP) {
    modsP = (async () => {
      const v = getVendor().officeKit;
      ctx.progress('load', 0, 1, 'PPTX 변환기를 받는 중');
      try {
        const [pptx, preview] = await Promise.all([import(/* @vite-ignore */ v.pptx), import(/* @vite-ignore */ v.preview)]);
        return { pptx, preview };
      } catch (e) { throw new ConvertError('VENDOR_LOAD', e && e.message, e); }
    })();
    modsP.catch(() => { modsP = null; });
  }
  return modsP;
}

const SERIF = /(serif|batang|myeongjo|times|georgia|garamond|cambria|caladea|바탕|명조|궁서)/i;
const resolveFamily = (f) => (f && SERIF.test(f) && !/sans/i.test(f) ? 'Noto Serif KR' : 'Noto Sans KR');

let mctx = null;
function measureText(text, spec) {
  if (!mctx) mctx = document.createElement('canvas').getContext('2d');
  mctx.font = `${spec.italic ? 'italic ' : ''}${spec.bold ? 700 : 400} ${spec.sizePx}px "${spec.family}"`;
  const m = mctx.measureText(text);
  return {
    widthPx: m.width + (spec.letterSpacingPx || 0) * [...text].length,
    ascentPx: m.fontBoundingBoxAscent, descentPx: m.fontBoundingBoxDescent,
  };
}

function svgSize(svg) {
  const vb = svg.match(/<svg[^>]*?viewBox="\s*([\d.+-]+)[\s,]+([\d.+-]+)[\s,]+([\d.+-]+)[\s,]+([\d.+-]+)/);
  if (vb) return [parseFloat(vb[3]), parseFloat(vb[4])];
  const w = svg.match(/<svg[^>]*?\swidth="([\d.]+)/), h = svg.match(/<svg[^>]*?\sheight="([\d.]+)/);
  return w && h ? [parseFloat(w[1]), parseFloat(h[1])] : null;
}

async function svgToCanvas(svg, w, h, ctx) {
  const used = [];
  if (svg.includes('Noto Sans KR')) used.push('Noto Sans KR');
  if (svg.includes('Noto Serif KR')) used.push('Noto Serif KR');
  let s = svg.replace(/(<svg\b[^>]*>)/, `$1<style>${fontCssFor(used)}</style>`);
  // 파이어폭스는 width·height 가 없는 SVG 를 그림으로 못 그린다.
  s = s.replace(/<svg\b([^>]*)>/, (m, attrs) => {
    let a = attrs;
    a = /\swidth=/.test(a) ? a.replace(/\swidth="[^"]*"/, ` width="${w}"`) : a + ` width="${w}"`;
    a = /\sheight=/.test(a) ? a.replace(/\sheight="[^"]*"/, ` height="${h}"`) : a + ` height="${h}"`;
    return `<svg${a}>`;
  });
  const url = URL.createObjectURL(new Blob([s], { type: 'image/svg+xml;charset=utf-8' }));
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const cw = Math.round(w * fitScale(w, h)), ch = Math.round(h * fitScale(w, h));
    const canvas = makeCanvas(cw, ch);
    const g = canvas.getContext('2d');
    g.fillStyle = '#fff';
    g.fillRect(0, 0, cw, ch);
    g.drawImage(img, 0, 0, cw, ch);
    return canvas;
  } finally { URL.revokeObjectURL(url); }
}

export async function convertPptx(file, ctx, out) {
  await loadFonts(ctx);
  const { pptx, preview } = await loadKit(ctx);
  ctx.check();
  const bytes = new Uint8Array(await file.arrayBuffer());
  let pres, slides;
  try {
    pres = await pptx.loadPresentation(bytes);
    slides = pptx.getSlides(pres);
  } catch (e) { throw new ConvertError('PPTX_PARSE', e && e.message, e); }
  const visible = slides.filter((s) => !pptx.isSlideHidden(s));
  if (visible.length < slides.length) ctx.warn(`숨김 처리된 슬라이드 ${slides.length - visible.length}장은 뺐습니다.`);
  checkPageCount(visible.length);
  const n = visible.length;
  let sawExternal = false;
  for (let i = 0; i < n; i++) {
    ctx.check();
    ctx.progress('render', i, n, `${i + 1}/${n}쪽`);
    let canvas;
    try {
      const svg = preview.renderSlideToSvg(pres, visible[i], {
        textLayout: 'svg', measureText, resolveFamily, eastAsianFamily: 'Noto Sans KR',
      });
      if (/<foreignObject/.test(svg)) ctx.warn('일부 글자가 그림으로 바뀌지 않았을 수 있습니다.');
      if (!sawExternal && /(?:href|src)="https?:/.test(svg)) { sawExternal = true; ctx.warn('인터넷 주소로 연결된 그림은 넣지 못했습니다.'); }
      const sz = svgSize(svg);
      if (!sz) throw new Error('슬라이드 크기를 알 수 없음');
      canvas = await svgToCanvas(svg, sz[0], sz[1], ctx);
    } catch (e) {
      throw new ConvertError('PPTX_RENDER', `${i + 1}번 슬라이드: ${e && (e.message || e)}`, e);
    }
    await emitPage(canvas, out, ctx);
    await yieldToUi();
  }
  ctx.progress('render', n, n, '');
  ctx.warn('슬라이드의 움직임·전환·동영상은 들어가지 않습니다. 글꼴은 Noto 로 바뀌어 줄바꿈이 조금 다를 수 있습니다.');
}
