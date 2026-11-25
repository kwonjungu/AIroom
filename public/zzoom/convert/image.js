// 그림 파일 → 한 쪽. 브라우저 디코더(createImageBitmap)를 쓴다. 확대는 하지 않는다.
import { LIMITS, ConvertError, makeCanvas, emitPage } from './core.js';

export async function convertImage(file, ctx, out) {
  const name = (file.name || '').toLowerCase();
  if (/\.(heic|heif)$/.test(name) || /heic|heif/.test(file.type || '')) {
    // 사파리 등 디코더가 있으면 그대로 시도하고, 못 열면 안내한다.
    try { await createImageBitmap(file).then((b) => b.close()); } catch (e) { throw new ConvertError('HEIC_UNSUPPORTED', e && e.message, e); }
  }
  let bmp;
  try { bmp = await ctx.race(createImageBitmap(file)); } catch (e) { if (e instanceof ConvertError) throw e; throw new ConvertError('IMAGE_DECODE', e && e.message, e); }
  try {
    if (bmp.width * bmp.height > LIMITS.maxImagePixels) throw new ConvertError('IMAGE_TOO_LARGE', `${bmp.width}×${bmp.height}`);
    const s = Math.min(1, LIMITS.longSide / Math.max(bmp.width, bmp.height));
    const w = Math.max(1, Math.round(bmp.width * s)), h = Math.max(1, Math.round(bmp.height * s));
    const canvas = makeCanvas(w, h);
    const g = canvas.getContext('2d');
    g.fillStyle = '#fff';
    g.fillRect(0, 0, w, h);
    g.imageSmoothingQuality = 'high';
    g.drawImage(bmp, 0, 0, w, h);
    if (/\.gif$/.test(name)) ctx.warn('움직이는 GIF 는 첫 장면만 올라갑니다.');
    ctx.progress('render', 0, 1, '');
    await emitPage(canvas, out, ctx);
    ctx.progress('render', 1, 1, '');
  } finally { bmp.close(); }
}
