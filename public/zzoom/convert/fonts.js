// Noto Sans KR · Noto Serif KR 웹폰트 적재(한 번만). HWP 는 canvas 글꼴로, PPTX 는 SVG 안에 심어 쓴다.
import { getVendor } from './vendor.js';
import { fetchVerified, ConvertError } from './core.js';

let loading = null;
const bytesByFile = []; // {family, weight, bytes}

export function loadFonts(ctx) {
  if (!loading) {
    loading = (async () => {
      const v = getVendor();
      try {
        const got = await Promise.all(v.fonts.map(async (f) => ({
          f, bytes: await fetchVerified(f.urls, f.sha256, ctx, 'FONT_LOAD'),
        })));
        for (const { f, bytes } of got) {
          const face = new FontFace(f.family, bytes.slice().buffer, { weight: String(f.weight) });
          await face.load();
          document.fonts.add(face);
          bytesByFile.push({ family: f.family, weight: f.weight, bytes });
        }
      } catch (e) {
        throw e instanceof ConvertError ? (e.code === 'ABORTED' ? e : new ConvertError('FONT_LOAD', e.detail || e.message, e)) : new ConvertError('FONT_LOAD', e && e.message, e);
      }
    })();
    loading.catch(() => { loading = null; }); // 실패하면 다음 변환에서 다시 시도
  }
  return loading;
}

const cssCache = new Map();
function b64(bytes) {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

/** SVG 안에 넣을 @font-face CSS. families 는 쓰는 글꼴 이름 배열. */
export function fontCssFor(families) {
  let css = '';
  for (const fam of families) {
    if (!cssCache.has(fam)) {
      cssCache.set(fam, bytesByFile.filter((b) => b.family === fam)
        .map((b) => `@font-face{font-family:'${b.family}';font-weight:${b.weight};src:url(data:font/woff2;base64,${b64(b.bytes)}) format('woff2');}`).join(''));
    }
    css += cssCache.get(fam);
  }
  return css;
}

/** 적재된 글꼴 바이트 목록(PPTX 변환기의 fonts 옵션용). */
export function fontBytes() { return bytesByFile; }
