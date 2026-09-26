// 거북이·픽셀·미로 캔버스 그리기 (WP8). 좌표 변환은 여기 한 곳(DPR 포함)에서만 한다.
import { fitView, boundsOf, TURTLE_DEFAULTS } from './engines/turtle.js';
import { DELTA } from './engines/maze.js';

const ASSET = new URL('../../../assets/vibe/', import.meta.url).href;
const images = {};
function img(name, onload) {
  if (typeof Image !== 'function') return null;
  let im = images[name];
  if (!im) { im = new Image(); im.decoding = 'async'; im.src = ASSET + name; images[name] = im; }
  if (!im.complete && onload) im.addEventListener('load', onload, { once: true });
  return im.complete && im.naturalWidth ? im : null;
}

/** CSS 크기 w×h로 캔버스를 맞추고 DPR 변환을 건 2D 컨텍스트 */
export function fitCanvas(cv, w, h) {
  const dpr = Math.min(3, (typeof devicePixelRatio === 'number' && devicePixelRatio) || 1);
  w = Math.max(1, Math.floor(w)); h = Math.max(1, Math.floor(h));
  if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
  cv.style.width = w + 'px'; cv.style.height = h + 'px';
  const c = cv.getContext('2d');
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  return c;
}

// ── 거북이 ──
/** 목표·학생 전체 그림이 모두 들어오는 view (실행 중에 view가 흔들리지 않도록 전체 trace 기준) */
export function turtleView(W, H, targetSegs, studentSegs, studentCircles) {
  return fitView(boundsOf([...targetSegs, ...studentSegs], studentCircles), W, H);
}

/**
 * @param {CanvasRenderingContext2D} c
 * @param {{W:number,H:number, view:object, bg:string, ghost:object[]|null, scene:object, partial?:object|null, pose:{x,y,angle}, labels:boolean, redraw?:()=>void}} o
 */
export function drawTurtle(c, o) {
  const { W, H, view } = o;
  c.save();
  c.fillStyle = o.bg || TURTLE_DEFAULTS.bg; c.fillRect(0, 0, W, H);
  // 격자(50 단위) + 축
  const step = 50 * view.scale;
  if (step >= 8) {
    c.strokeStyle = 'rgba(255,255,255,0.07)'; c.lineWidth = 1;
    const o0 = view.toScreen(0, 0);
    for (let x = o0.x % step; x < W; x += step) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, H); c.stroke(); }
    for (let y = o0.y % step; y < H; y += step) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }
    c.strokeStyle = 'rgba(255,255,255,0.22)';
    c.beginPath(); c.moveTo(o0.x, 0); c.lineTo(o0.x, H); c.stroke();
    c.beginPath(); c.moveTo(0, o0.y); c.lineTo(W, o0.y); c.stroke();
  }
  c.lineCap = 'round'; c.lineJoin = 'round';
  // 목표 고스트(점선) — 학생 그림과 같은 view
  if (o.ghost) {
    c.setLineDash([8, 6]); c.strokeStyle = 'rgba(255,209,102,0.75)'; c.lineWidth = 3;
    for (const s of o.ghost) { const a = view.toScreen(s.x1, s.y1), b = view.toScreen(s.x2, s.y2); c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke(); }
    c.setLineDash([]);
  }
  const seg = (s, t = 1) => {
    const a = view.toScreen(s.x1, s.y1), b = view.toScreen(s.x1 + (s.x2 - s.x1) * t, s.y1 + (s.y2 - s.y1) * t);
    c.strokeStyle = s.color; c.lineWidth = Math.max(1.5, s.size * Math.max(0.6, view.scale));
    c.shadowColor = s.color; c.shadowBlur = 6;
    c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke();
    c.shadowBlur = 0;
    return { a, b };
  };
  const labels = [];
  for (const s of o.scene.segs) { const { a, b } = seg(s); if (o.labels) labels.push({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, t: String(Math.round(s.len)) }); }
  if (o.partial) seg(o.partial.seg, o.partial.t);
  for (const ci of o.scene.circles) { const p = view.toScreen(ci.x, ci.y); c.strokeStyle = ci.color; c.lineWidth = ci.size; c.beginPath(); c.arc(p.x, p.y, ci.r * view.scale, 0, Math.PI * 2); c.stroke(); }
  c.textAlign = 'center'; c.textBaseline = 'middle';
  for (const st of o.scene.stamps) { const p = view.toScreen(st.x, st.y); c.font = '28px "Segoe UI Emoji", sans-serif'; c.fillText(st.emoji, p.x, p.y); }
  for (const sy of o.scene.says) {
    const p = view.toScreen(sy.x, sy.y);
    c.font = 'bold 15px system-ui, sans-serif';
    const w = c.measureText(sy.text).width + 20;
    c.fillStyle = '#fff'; c.fillRect(p.x + 14, p.y - 48, w, 30);
    c.fillStyle = '#17202E'; c.fillText(sy.text, p.x + 14 + w / 2, p.y - 33);
  }
  if (labels.length && labels.length <= 40) {
    c.font = 'bold 14px system-ui, sans-serif';
    for (const l of labels) { c.fillStyle = 'rgba(0,0,0,.55)'; c.fillRect(l.x - 16, l.y - 10, 32, 20); c.fillStyle = '#fff'; c.fillText(l.t, l.x, l.y); }
  }
  // 거북이 + 방향 화살표(크게)
  const p = view.toScreen(o.pose.x, o.pose.y);
  const r = (o.pose.angle - 90) * Math.PI / 180;
  c.strokeStyle = '#FFD166'; c.fillStyle = '#FFD166'; c.lineWidth = 4;
  const tip = { x: p.x + Math.cos(r) * 46, y: p.y + Math.sin(r) * 46 };
  c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(tip.x, tip.y); c.stroke();
  c.beginPath();
  c.moveTo(tip.x + Math.cos(r) * 10, tip.y + Math.sin(r) * 10);
  c.lineTo(tip.x + Math.cos(r + 2.4) * 12, tip.y + Math.sin(r + 2.4) * 12);
  c.lineTo(tip.x + Math.cos(r - 2.4) * 12, tip.y + Math.sin(r - 2.4) * 12);
  c.closePath(); c.fill();
  const im = img('turtle-top.png', o.redraw);
  c.translate(p.x, p.y); c.rotate(o.pose.angle * Math.PI / 180);
  if (im) c.drawImage(im, -20, -20, 40, 40);
  else { c.fillStyle = '#00FF88'; c.beginPath(); c.moveTo(0, -14); c.lineTo(-10, 10); c.lineTo(10, 10); c.closePath(); c.fill(); }
  c.restore();
}

// ── 픽셀 ──
/** 격자 배치: 좌표 레이블 칸(label) + n×n 칸 */
export function pixelLayout(size, n) {
  const label = Math.max(22, Math.min(34, Math.floor(size / (n + 1))));
  const cell = Math.max(8, Math.floor((size - label) / n));
  return { ox: label, oy: label, cell, n, w: label + cell * n, h: label + cell * n };
}

/**
 * @param {{grid:(string|null)[][], L:object, labels?:boolean, hot?:{x:number,y:number}|null, pending?:Set<string>, pendingColor?:string, target?:boolean, dim?:boolean}} o
 */
export function drawPixel(c, o) {
  const { L, grid } = o;
  c.save();
  c.fillStyle = '#FFFFFF'; c.fillRect(0, 0, L.w, L.h);
  if (o.labels !== false) {
    c.fillStyle = '#17202E'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.font = `bold ${Math.max(12, Math.min(18, L.ox - 8))}px system-ui, sans-serif`;
    for (let i = 0; i < L.n; i++) {
      c.fillText(String(i + 1), L.ox + L.cell * (i + 0.5), L.oy / 2);
      c.fillText(String(i + 1), L.ox / 2, L.oy + L.cell * (i + 0.5));
    }
  }
  c.fillStyle = '#16162C'; c.fillRect(L.ox, L.oy, L.cell * L.n, L.cell * L.n);
  const gap = L.cell >= 16 ? 2 : 1;
  for (let y = 0; y < L.n; y++) for (let x = 0; x < L.n; x++) {
    let v = grid[y]?.[x] || null;
    if (!v && o.pending?.has(x + ',' + y)) v = o.pendingColor;
    if (o.target) v = v ? '#FFD166' : null;
    const px = L.ox + x * L.cell + gap, py = L.oy + y * L.cell + gap, s = L.cell - gap * 2;
    c.fillStyle = v || '#2A2A40';
    c.fillRect(px, py, s, s);
    if (o.pending?.has(x + ',' + y) && o.pendingColor === null) { c.strokeStyle = '#FF5252'; c.lineWidth = 2; c.strokeRect(px + 2, py + 2, s - 4, s - 4); }
  }
  if (o.hot) {
    c.strokeStyle = '#FFFFFF'; c.lineWidth = 3;
    c.strokeRect(L.ox + o.hot.x * L.cell + 1.5, L.oy + o.hot.y * L.cell + 1.5, L.cell - 3, L.cell - 3);
  }
  c.restore();
}

// ── 미로 ──
export function mazeLayout(W, H, rows, cols) {
  const cell = Math.max(28, Math.min(96, Math.floor(Math.min(W / cols, H / rows))));
  return { cell, w: cell * cols, h: cell * rows };
}

const DIR_ANGLE = { up: -Math.PI / 2, right: 0, down: Math.PI / 2, left: Math.PI };

/**
 * @param {{mission:object, L:object, pos:{r,c,dir}, collected:Set<string>, trail:{r,c}[], blocked:{r,c}|null, preview:{r,c}[]|null, redraw?:()=>void}} o
 */
export function drawMaze(c, o) {
  const { L } = o;
  const map = o.mission.map;
  c.save();
  c.fillStyle = '#0F1B2D'; c.fillRect(0, 0, L.w, L.h);
  c.textAlign = 'center'; c.textBaseline = 'middle';
  for (let r = 0; r < map.length; r++) for (let col = 0; col < map[r].length; col++) {
    const ch = map[r][col], x = col * L.cell, y = r * L.cell;
    c.fillStyle = ch === '#' ? '#3B4A63' : '#F4EFE3';
    c.fillRect(x + 1, y + 1, L.cell - 2, L.cell - 2);
    if (ch === '#') { c.fillStyle = '#2B374B'; c.fillRect(x + 4, y + L.cell / 2, L.cell - 8, 3); }
    c.font = `${Math.floor(L.cell * 0.55)}px "Segoe UI Emoji", sans-serif`;
    if (ch === 'G') c.fillText('⭐', x + L.cell / 2, y + L.cell / 2);
    if (ch === 'D' && !o.collected.has(r + ',' + col)) c.fillText('💎', x + L.cell / 2, y + L.cell / 2);
    if (ch === 'S') { c.fillStyle = '#B23C0B'; c.font = `bold ${Math.max(10, Math.floor(L.cell * 0.22))}px system-ui`; c.fillText('출발', x + L.cell / 2, y + L.cell * 0.13); }
  }
  const center = p => ({ x: (p.c + 0.5) * L.cell, y: (p.r + 0.5) * L.cell });
  if (o.preview && o.preview.length > 1) {
    c.setLineDash([6, 6]); c.strokeStyle = 'rgba(11,87,208,.8)'; c.lineWidth = 4;
    c.beginPath(); o.preview.forEach((p, i) => { const q = center(p); i ? c.lineTo(q.x, q.y) : c.moveTo(q.x, q.y); }); c.stroke();
    c.setLineDash([]);
  }
  if (o.trail.length > 1) {
    c.strokeStyle = 'rgba(178,60,11,.55)'; c.lineWidth = Math.max(4, L.cell * 0.12);
    c.beginPath(); o.trail.forEach((p, i) => { const q = center(p); i ? c.lineTo(q.x, q.y) : c.moveTo(q.x, q.y); }); c.stroke();
  }
  if (o.blocked) {
    const x = o.blocked.c * L.cell, y = o.blocked.r * L.cell;
    c.strokeStyle = '#FF3B30'; c.lineWidth = 5;
    c.strokeRect(x + 3, y + 3, L.cell - 6, L.cell - 6);
    c.beginPath(); c.moveTo(x + 10, y + 10); c.lineTo(x + L.cell - 10, y + L.cell - 10); c.moveTo(x + L.cell - 10, y + 10); c.lineTo(x + 10, y + L.cell - 10); c.stroke();
  }
  // 토토 + 보는 방향(큰 화살표)
  const q = center(o.pos);
  const a = DIR_ANGLE[o.pos.dir];
  const [dr, dc] = DELTA[o.pos.dir];
  c.fillStyle = 'rgba(255,209,102,.9)';
  c.beginPath();
  const fx = q.x + dc * L.cell * 0.46, fy = q.y + dr * L.cell * 0.46;
  c.moveTo(fx + Math.cos(a) * 10, fy + Math.sin(a) * 10);
  c.lineTo(fx + Math.cos(a + 2.3) * 14, fy + Math.sin(a + 2.3) * 14);
  c.lineTo(fx + Math.cos(a - 2.3) * 14, fy + Math.sin(a - 2.3) * 14);
  c.closePath(); c.fill();
  const im = img('toto-hello.svg', o.redraw);
  const s = L.cell * 0.78;
  if (im) c.drawImage(im, q.x - s / 2, q.y - s / 2, s, s);
  else { c.fillStyle = '#2E7D32'; c.beginPath(); c.arc(q.x, q.y, s / 2.4, 0, Math.PI * 2); c.fill(); }
  c.restore();
}
