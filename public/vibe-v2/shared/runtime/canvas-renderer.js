// 게임 공방 캔버스 렌더러 (WP4) — 브라우저 전용. 전달받은 canvas 하나만 다룬다(다른 DOM 접근 없음).
// RuntimeSnapshot(순수 데이터)을 그리기만 하고 게임 규칙에는 관여하지 않는다.
// 논리 좌표 800×600을 가용 CSS 크기 안에 letterbox로 맞추고, backing store는 DPR 상한(dprMax)을 둔다.
// 렌더 transform과 포인터 역변환(toLogical)은 같은 행렬 하나에서 계산한다.

import { STUDIO_WORLD } from '../contracts/nodes.js';

const W = STUDIO_WORLD.width, H = STUDIO_WORLD.height;

/** 기본 배경 preset → 색 (이미지 manifest가 없을 때) */
export const BACKGROUND_COLORS = Object.freeze({
  'bg-sky': '#BFE6FF', 'bg-space': '#141B3A', 'bg-meadow': '#CDEFB8', 'bg-ruins': '#E9DDC4',
});
const LETTERBOX = '#0E1116';
const WALL = '#5D4E3C', GOAL = '#FFD54F';

/**
 * 슬롯 → 그릴 것. 프로젝트 assets와 (선택) url 맵으로 만든다.
 * 두 번째 인자는 평평한 맵 {assetId|preset: url}(예: swap.js mergeResolverMap 결과)이거나
 * WP6 manifest.json 전체({schemaVersion, urls:{...}, entries})여도 된다 — 후자면 urls를 쓴다.
 * @returns {(slotId:string|null) => (string|{src:string}|null)}
 */
export function createAssetResolver(assets = [], manifestOrUrls = {}) {
  const bySlot = new Map(assets.map(a => [a.slotId, a]));
  const m = manifestOrUrls || {};
  const manifest = m.urls && typeof m.urls === 'object' && !Array.isArray(m.urls) ? m.urls : m;
  return slotId => {
    const a = bySlot.get(slotId);
    if (!a) return null;
    if (a.assetId && manifest[a.assetId]) return { src: manifest[a.assetId] };
    if (a.preset && manifest[a.preset]) return { src: manifest[a.preset] };
    return a.preset || null;
  };
}

/** 이미지 원본 비율을 유지해 size×size 상자 안에 들어가는 크기 (크기를 모르면 정사각형) */
export function containBox(img, size) {
  const iw = img.naturalWidth || img.width || 0, ih = img.naturalHeight || img.height || 0;
  if (!(iw > 0 && ih > 0)) return { w: size, h: size };
  const k = size / Math.max(iw, ih);
  return { w: iw * k, h: ih * k };
}

function hashColor(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return `hsl(${h % 360} 70% 60%)`;
}

/**
 * @param {HTMLCanvasElement} canvas
 * @param {{dprMax?:number, devicePixelRatio?:number, loadImage?:(src:string, done:(ok:boolean)=>void)=>any, hud?:boolean}} [opts]
 */
export function createRenderer(canvas, opts = {}) {
  const dprMax = opts.dprMax ?? 2;
  const ctx = canvas.getContext('2d');
  const images = new Map(); // src -> {img, status:'loading'|'ok'|'error'}
  let T = { a: 1, e: 0, f: 0, scale: 1, ox: 0, oy: 0, dpr: 1, cssW: W, cssH: H };

  const loadImage = opts.loadImage || ((src, done) => {
    const Img = globalThis.Image;
    if (!Img) { done(false); return null; }
    const img = new Img();
    img.onload = () => done(true);
    img.onerror = () => done(false);
    img.src = src;
    return img;
  });

  function measure() {
    const rect = canvas.getBoundingClientRect();
    const cssW = rect.width || W, cssH = rect.height || H;
    const dpr = Math.max(1, Math.min(dprMax, opts.devicePixelRatio ?? globalThis.devicePixelRatio ?? 1));
    const scale = Math.min(cssW / W, cssH / H);
    const ox = (cssW - W * scale) / 2, oy = (cssH - H * scale) / 2;
    // 논리 → backing store 픽셀: [a 0 0 a e f]
    T = { a: dpr * scale, e: dpr * ox, f: dpr * oy, scale, ox, oy, dpr, cssW, cssH, left: rect.left || 0, top: rect.top || 0 };
    const bw = Math.max(1, Math.round(cssW * dpr)), bh = Math.max(1, Math.round(cssH * dpr));
    if (canvas.width !== bw) canvas.width = bw;
    if (canvas.height !== bh) canvas.height = bh;
    return T;
  }

  function image(src) {
    let rec = images.get(src);
    if (!rec) {
      rec = { img: null, status: 'loading' };
      images.set(src, rec);
      rec.img = loadImage(src, ok => { rec.status = ok ? 'ok' : 'error'; });
    }
    return rec;
  }

  function placeholder(x, y, r, key) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = hashColor(key || '?');
    ctx.fill();
  }

  function drawSprite(look, x, y, r, key) {
    if (typeof look === 'string' && look.startsWith('emoji:')) {
      ctx.font = `${Math.round(r * 1.8)}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(look.slice(6), x, y + r * 0.08);
      return;
    }
    const src = look && typeof look === 'object' ? look.src : null;
    if (src) {
      const rec = image(src);
      if (rec.status === 'ok' && rec.img) {
        // 비율 유지(contain): 충돌 원(r)은 그대로, 그림만 r*2 상자 안에 맞춘다
        const { w, h } = containBox(rec.img, r * 2);
        ctx.drawImage(rec.img, x - w / 2, y - h / 2, w, h);
        return;
      }
    }
    placeholder(x, y, r, key); // 로딩 중·실패·모르는 preset
  }

  function drawBackground(look) {
    let color = '#1A1A2E';
    if (typeof look === 'string') {
      if (look.startsWith('color:')) color = look.slice(6);
      else if (BACKGROUND_COLORS[look]) color = BACKGROUND_COLORS[look];
    }
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, W, H);
    if (look && typeof look === 'object' && look.src) {
      const rec = image(look.src);
      if (rec.status === 'ok' && rec.img) ctx.drawImage(rec.img, 0, 0, W, H);
    }
  }

  function drawMaze(m) {
    for (let r = 0; r < m.nrows; r++) {
      for (let c = 0; c < m.cols; c++) {
        const ch = m.rows[r][c];
        if (ch === '#' || ch === undefined) { ctx.fillStyle = WALL; ctx.fillRect(m.ox + c * m.cell, m.oy + r * m.cell, m.cell, m.cell); }
        else if (ch === 'G') { ctx.fillStyle = GOAL; ctx.fillRect(m.ox + c * m.cell + 4, m.oy + r * m.cell + 4, m.cell - 8, m.cell - 8); }
      }
    }
  }

  function drawHud(s) {
    ctx.font = 'bold 28px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = 'rgba(0,0,0,.45)';
    ctx.fillRect(8, 8, 300, 44);
    ctx.fillStyle = '#FFFFFF';
    let t = `⭐ ${s.score}`;
    if (s.livesEnabled) t += `   ❤️ ${s.lives}`;
    if (s.timeLeftMs !== null && s.timeLeftMs !== undefined) t += `   ⏱ ${Math.ceil(s.timeLeftMs / 1000)}`;
    ctx.fillText(t, 18, 16);
  }

  return {
    /** @param {object} snapshot RuntimeSnapshot  @param {(slot:string)=>any} [resolve] */
    render(snapshot, resolve = () => null) {
      const t = measure();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = LETTERBOX;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.setTransform(t.a, 0, 0, t.a, t.e, t.f);
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, W, H);
      ctx.clip();
      drawBackground(resolve(snapshot.background));
      if (snapshot.maze) drawMaze(snapshot.maze);
      for (const e of snapshot.entities) {
        const blink = e.id === 'player' && snapshot.invincible && ((snapshot.tick >> 3) & 1);
        ctx.globalAlpha = blink ? 0.35 : 1;
        drawSprite(resolve(e.slot), e.x, e.y, e.r, e.entity);
      }
      ctx.globalAlpha = 1;
      if (opts.hud !== false) drawHud(snapshot);
      ctx.restore();
      return t;
    },
    /** 화면(client) 좌표 → 논리 좌표. 렌더와 같은 행렬의 역변환 */
    toLogical(clientX, clientY) {
      const t = measure();
      const bx = (clientX - t.left) * t.dpr, by = (clientY - t.top) * t.dpr;
      const x = (bx - t.e) / t.a, y = (by - t.f) / t.a;
      return { x, y, inside: x >= 0 && x <= W && y >= 0 && y <= H };
    },
    getTransform() { return { ...T }; },
    imageStatus(src) { return images.get(src)?.status ?? null; },
    dispose() { images.clear(); },
  };
}
