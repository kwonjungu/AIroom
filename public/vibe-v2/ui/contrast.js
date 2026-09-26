// WCAG 2.x 상대 휘도·대비 계산 (순수 함수). 토큰 검사 테스트와 런타임 보정에 함께 쓴다.

/** '#RGB' | '#RRGGBB' → [r,g,b] 0~255 */
export function parseHex(hex) {
  let h = String(hex).trim().replace(/^#/, '');
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  if (!/^[0-9a-fA-F]{6}$/.test(h)) throw new Error('bad hex color: ' + hex);
  return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16));
}

export function relativeLuminance(hex) {
  const [r, g, b] = parseHex(hex).map(v => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** 대비 비율 (1~21) */
export function contrastRatio(a, b) {
  const la = relativeLuminance(a), lb = relativeLuminance(b);
  const [hi, lo] = la >= lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/** tokens.css 문자열에서 `--c-이름: #hex` 선언을 첫 번째 값 기준으로 추출 */
export function extractColorTokens(cssText) {
  const out = {};
  const re = /--(c-[a-z0-9-]+)\s*:\s*(#[0-9a-fA-F]{3,6})\b/g;
  let m;
  while ((m = re.exec(cssText))) if (!(m[1] in out)) out[m[1]] = m[2];
  return out;
}
