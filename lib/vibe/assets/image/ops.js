// RGBA8 이미지 연산 — 순수 JS. 리사이즈(면적 평균, premultiplied alpha)와 테두리 연결 배경 키잉.

/**
 * 면적 평균 축소. 확대는 하지 않는다(요청 크기가 원본보다 크면 null).
 * 가로세로 비율을 유지하며 긴 변을 maxSide에 맞춘다.
 * @param {{width:number,height:number,data:Uint8Array}} src
 * @param {number} maxSide
 */
export function resizeToFit(src, maxSide) {
  const s = maxSide / Math.max(src.width, src.height);
  if (s >= 1) return null;
  const w = Math.max(1, Math.round(src.width * s)), h = Math.max(1, Math.round(src.height * s));
  return resizeArea(src, w, h);
}

export function resizeArea(src, w, h) {
  const { width: sw, height: sh, data: sd } = src;
  const out = new Uint8Array(w * h * 4);
  const fx = sw / w, fy = sh / h;
  for (let y = 0; y < h; y++) {
    const y0 = y * fy, y1 = y0 + fy;
    for (let x = 0; x < w; x++) {
      const x0 = x * fx, x1 = x0 + fx;
      let r = 0, g = 0, b = 0, a = 0, area = 0;
      for (let yy = Math.floor(y0); yy < Math.ceil(y1); yy++) {
        const wy = Math.min(y1, yy + 1) - Math.max(y0, yy);
        if (wy <= 0) continue;
        for (let xx = Math.floor(x0); xx < Math.ceil(x1); xx++) {
          const wx = Math.min(x1, xx + 1) - Math.max(x0, xx);
          if (wx <= 0) continue;
          const wgt = wx * wy, i = (yy * sw + xx) * 4, al = sd[i + 3] / 255;
          r += sd[i] * al * wgt; g += sd[i + 1] * al * wgt; b += sd[i + 2] * al * wgt; a += al * wgt; area += wgt;
        }
      }
      const o = (y * w + x) * 4;
      if (a > 0) { out[o] = Math.round(r / a); out[o + 1] = Math.round(g / a); out[o + 2] = Math.round(b / a); }
      out[o + 3] = Math.round((a / area) * 255);
    }
  }
  return { width: w, height: h, data: out };
}

/** 테두리 픽셀 목록 (시계 방향, 중복 없음) */
export function borderIndices(width, height) {
  const idx = [];
  for (let x = 0; x < width; x++) idx.push(x);
  for (let y = 1; y < height; y++) idx.push(y * width + width - 1);
  if (height > 1) for (let x = width - 2; x >= 0; x--) idx.push((height - 1) * width + x);
  if (width > 1) for (let y = height - 2; y >= 1; y--) idx.push(y * width);
  return idx;
}

const dist = (d, i, c) => Math.max(Math.abs(d[i * 4] - c[0]), Math.abs(d[i * 4 + 1] - c[1]), Math.abs(d[i * 4 + 2] - c[2]));

/**
 * 테두리의 지배적인 단색을 찾는다. 테두리의 minShare 이상이 한 색(허용 오차 tol)이어야 한다.
 * @returns {{color:number[], share:number}|null}
 */
export function dominantBorderColor(img, { tol = 24, minShare = 0.9 } = {}) {
  const border = borderIndices(img.width, img.height);
  const d = img.data;
  // 거친 양자화 히스토그램
  const hist = new Map();
  for (const i of border) {
    const k = ((d[i * 4] >> 4) << 8) | ((d[i * 4 + 1] >> 4) << 4) | (d[i * 4 + 2] >> 4);
    hist.set(k, (hist.get(k) || 0) + 1);
  }
  let bestK = 0, bestN = -1;
  for (const [k, n] of hist) if (n > bestN) { bestN = n; bestK = k; }
  const approx = [((bestK >> 8) & 15) * 16 + 8, ((bestK >> 4) & 15) * 16 + 8, (bestK & 15) * 16 + 8];
  // 근처 픽셀 평균으로 정밀화
  let r = 0, g = 0, b = 0, n = 0;
  for (const i of border) if (dist(d, i, approx) <= tol) { r += d[i * 4]; g += d[i * 4 + 1]; b += d[i * 4 + 2]; n++; }
  if (!n) return null;
  const color = [Math.round(r / n), Math.round(g / n), Math.round(b / n)];
  let hit = 0;
  for (const i of border) if (dist(d, i, color) <= tol) hit++;
  const share = hit / border.length;
  return share >= minShare ? { color, share } : null;
}

/**
 * 테두리에 연결된 배경 단색을 투명으로 만든다(크로마키·흰 배경 제거). 원본 불변.
 * 피사체 내부의 같은 색(테두리와 연결 안 된 영역)은 남긴다. 경계 1px은 부분 투명으로 부드럽게.
 * @returns {{image:object, keyed:number, color:number[]}|null}  배경 단색이 없으면 null
 */
export function keyOutBorder(img, { tol = 40, minShare = 0.9 } = {}) {
  const dom = dominantBorderColor(img, { tol: Math.min(tol, 28), minShare });
  if (!dom) return null;
  const { width: w, height: h } = img;
  const d = new Uint8Array(img.data);
  const bg = new Uint8Array(w * h);
  const stack = [];
  for (const i of borderIndices(w, h)) if (dist(d, i, dom.color) <= tol) { bg[i] = 1; stack.push(i); }
  while (stack.length) {
    const i = stack.pop();
    const x = i % w, y = (i - x) / w;
    const nb = [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, y > 0 ? i - w : -1, y < h - 1 ? i + w : -1];
    for (const j of nb) if (j >= 0 && !bg[j] && dist(d, j, dom.color) <= tol) { bg[j] = 1; stack.push(j); }
  }
  let keyed = 0;
  for (let i = 0; i < w * h; i++) if (bg[i]) { d[i * 4 + 3] = 0; keyed++; }
  // 가장자리 스필 완화: 배경에 닿은 피사체 픽셀은 알파를 조금 낮춘다
  for (let i = 0; i < w * h; i++) {
    if (bg[i]) continue;
    const x = i % w, y = (i - x) / w;
    const touch = (x > 0 && bg[i - 1]) || (x < w - 1 && bg[i + 1]) || (y > 0 && bg[i - w]) || (y < h - 1 && bg[i + w]);
    if (touch && dist(d, i, dom.color) <= tol * 2) d[i * 4 + 3] = Math.min(d[i * 4 + 3], 160);
  }
  return { image: { width: w, height: h, data: d }, keyed, color: dom.color };
}
