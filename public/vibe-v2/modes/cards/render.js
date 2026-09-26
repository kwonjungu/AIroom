// 카드 모드 그리기 — 캔버스는 논리 좌표로만 그리고, 화면 크기·DPR 변환은 fitCanvas 한 곳에서 한다.
import { CANVAS, SIZE_PX, anchorXY, normalizeStamp, diffMask, GRID, SHAPE_NAMES, colorName } from './shape-score.js';

export const DPR_MAX = 2;
export const BG = '#FFF7ED';
const STROKE = 'rgba(0,0,0,.30)';

export function dpr() {
  const d = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
  return Math.min(DPR_MAX, Math.max(1, d));
}

/**
 * 캔버스의 CSS 크기와 백버퍼를 맞추고, 논리 좌표(logicalW×logicalH)로 그릴 수 있게 변환을 건다.
 * 유일한 화면·DPR 변환 지점.
 */
export function fitCanvas(canvas, cssW, cssH, logicalW, logicalH) {
  const r = dpr();
  const w = Math.max(1, Math.round(cssW * r)), h = Math.max(1, Math.round(cssH * r));
  if (canvas.width !== w) canvas.width = w;
  if (canvas.height !== h) canvas.height = h;
  canvas.style.width = cssW + 'px';
  canvas.style.height = cssH + 'px';
  const ctx = canvas.getContext('2d');
  ctx.setTransform(w / logicalW, 0, 0, h / logicalH, 0, 0);
  return ctx;
}

/** 화면 좌표(clientX/Y) → 논리 좌표 (포인터 선택용) */
export function toLogical(canvas, clientX, clientY, logicalW, logicalH) {
  const b = canvas.getBoundingClientRect();
  return { x: ((clientX - b.left) / b.width) * logicalW, y: ((clientY - b.top) / b.height) * logicalH };
}

function shapePath(ctx, s) {
  const { x, y } = anchorXY(s.anchor, CANVAS);
  const h = (SIZE_PX[s.size] || SIZE_PX.M) / 2;
  ctx.beginPath();
  if (s.shape === 'circle') ctx.arc(x, y, h, 0, Math.PI * 2);
  else if (s.shape === 'rect') ctx.rect(x - h, y - h, 2 * h, 2 * h);
  else if (s.shape === 'tri') { ctx.moveTo(x, y - h); ctx.lineTo(x + h, y + h); ctx.lineTo(x - h, y + h); ctx.closePath(); }
  else { ctx.moveTo(x, y - h); ctx.lineTo(x + h, y); ctx.lineTo(x, y + h); ctx.lineTo(x - h, y); ctx.closePath(); }
}

export function drawBackground(ctx, { grid = true } = {}) {
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, CANVAS, CANVAS);
  if (!grid) return;
  ctx.save();
  ctx.strokeStyle = 'rgba(141,110,99,.22)';
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 8]);
  for (const v of [120, 240]) {
    ctx.beginPath(); ctx.moveTo(v, 0); ctx.lineTo(v, CANVAS); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, v); ctx.lineTo(CANVAS, v); ctx.stroke();
  }
  ctx.restore();
}

/** 도형들을 순서대로 찍는다(나중 것이 위). badge: {stampIndex, label} 실행 중 번호 표시 */
export function drawStamps(ctx, stamps, { alpha = 1, badge = null } = {}) {
  const list = (stamps || []).map(normalizeStamp);
  ctx.save();
  ctx.globalAlpha = alpha;
  for (const s of list) {
    shapePath(ctx, s);
    ctx.fillStyle = s.color || '#FFFFFF';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = STROKE;
    ctx.stroke();
  }
  ctx.restore();
  if (badge && list[badge.stampIndex]) drawBadge(ctx, anchorXY(list[badge.stampIndex].anchor, CANVAS), badge.label);
}

export function drawBadge(ctx, { x, y }, label, { r = 22 } = {}) {
  ctx.save();
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = '#1A237E'; ctx.fill();
  ctx.lineWidth = 4; ctx.strokeStyle = '#FFFFFF'; ctx.stroke();
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `bold ${label.length > 2 ? 18 : 24}px system-ui, sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(label, x, y + 1);
  ctx.restore();
}

let hatch = null;
function hatchPattern(ctx) {
  if (hatch) return ctx.createPattern(hatch, 'repeat');
  const c = document.createElement('canvas'); c.width = c.height = 12;
  const g = c.getContext('2d');
  g.fillStyle = 'rgba(216,27,96,.35)'; g.fillRect(0, 0, 12, 12);
  g.strokeStyle = '#AD1457'; g.lineWidth = 3;
  g.beginPath(); g.moveTo(-3, 3); g.lineTo(3, -3); g.moveTo(0, 12); g.lineTo(12, 0); g.moveTo(9, 15); g.lineTo(15, 9); g.stroke();
  hatch = c;
  return ctx.createPattern(hatch, 'repeat');
}

/** 다른 부분: 내 그림 위에 차이 표본을 빗금(색+무늬)으로 덮는다. 다른 칸 수를 돌려준다 */
export function drawDiff(ctx, student, target) {
  drawBackground(ctx);
  drawStamps(ctx, student);
  const mask = diffMask(student, target, GRID);
  const cell = CANVAS / GRID;
  ctx.save();
  ctx.beginPath();
  let n = 0;
  mask.forEach((d, i) => { if (d) { n++; ctx.rect((i % GRID) * cell, Math.floor(i / GRID) * cell, cell + 0.5, cell + 0.5); } });
  ctx.fillStyle = hatchPattern(ctx);
  ctx.fill();
  ctx.restore();
  return n;
}

// ── 카드 아이콘(SVG) ──
const ICON_HALF = { L: 44, M: 33, S: 22 };
export function stampSvg(args, { px = 44, sized = true, title = '' } = {}) {
  const h = sized ? ICON_HALF[args.size] || 33 : 40;
  const c = 50;
  const fill = args.color || '#FFFFFF';
  const stroke = String(fill).toUpperCase() === '#FFFFFF' ? '#757575' : 'rgba(0,0,0,.35)';
  let shape;
  if (args.shape === 'circle') shape = `<circle cx="${c}" cy="${c}" r="${h}"/>`;
  else if (args.shape === 'rect') shape = `<rect x="${c - h}" y="${c - h}" width="${2 * h}" height="${2 * h}"/>`;
  else if (args.shape === 'tri') shape = `<polygon points="${c},${c - h} ${c + h},${c + h} ${c - h},${c + h}"/>`;
  else shape = `<polygon points="${c},${c - h} ${c + h},${c} ${c},${c + h} ${c - h},${c}"/>`;
  return `<svg class="vc2c-svg" viewBox="0 0 100 100" width="${px}" height="${px}" aria-hidden="true" focusable="false"><g fill="${fill}" stroke="${stroke}" stroke-width="4">${shape}</g>${title ? `<title>${title}</title>` : ''}</svg>`;
}

export function stampName(args) { return `${colorName(args.color)} ${SHAPE_NAMES[args.shape] || '도형'}`; }

// ── 별까지 가기 보드 ──
export const CELL = 100;
const DIR_ANGLE = { up: -Math.PI / 2, right: 0, down: Math.PI / 2, left: Math.PI };

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}

function star(ctx, cx, cy, r) {
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
    ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    const b = a + Math.PI / 5;
    ctx.lineTo(cx + Math.cos(b) * r * 0.45, cy + Math.sin(b) * r * 0.45);
  }
  ctx.closePath();
  ctx.fillStyle = '#FFD166'; ctx.fill();
  ctx.lineWidth = 4; ctx.strokeStyle = '#E09F00'; ctx.stroke();
}

function rover(ctx, r, c, dir, { ghost = false } = {}) {
  const x = c * CELL + CELL / 2, y = r * CELL + CELL / 2;
  ctx.save();
  ctx.translate(x, y); ctx.rotate(DIR_ANGLE[dir] + Math.PI / 2);
  ctx.globalAlpha = ghost ? 0.4 : 1;
  roundRect(ctx, -30, -30, 60, 60, 14);
  ctx.fillStyle = '#26A69A'; ctx.fill();
  ctx.lineWidth = 4; ctx.strokeStyle = '#00695C'; ctx.stroke();
  // 앞(보는 방향)을 뚜렷하게: 노란 화살표
  ctx.beginPath(); ctx.moveTo(0, -46); ctx.lineTo(18, -20); ctx.lineTo(-18, -20); ctx.closePath();
  ctx.fillStyle = '#FFD166'; ctx.fill(); ctx.strokeStyle = '#8D6E00'; ctx.lineWidth = 3; ctx.stroke();
  ctx.beginPath(); ctx.arc(-12, 4, 6, 0, Math.PI * 2); ctx.arc(12, 4, 6, 0, Math.PI * 2);
  ctx.fillStyle = '#FFFFFF'; ctx.fill();
  ctx.restore();
}

/**
 * @param {{rows:string[][], width:number, height:number}} map  parseMap 결과
 * @param {{pos:{r,c,dir}, ghost?:{r,c,dir}|null, blocked?:{r,c}|null, trail?:{r,c}[], badge?:string|null}} view
 */
export function drawGoalBoard(ctx, map, view) {
  const W = map.width * CELL, H = map.height * CELL;
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#E0F2F1'; ctx.fillRect(0, 0, W, H);
  for (let r = 0; r < map.height; r++) for (let c = 0; c < map.width; c++) {
    const ch = (map.rows[r] && map.rows[r][c]) || '#';
    const x = c * CELL, y = r * CELL;
    if (ch === '#') {
      ctx.fillStyle = '#2E7D32'; roundRect(ctx, x + 3, y + 3, CELL - 6, CELL - 6, 14); ctx.fill();
      ctx.fillStyle = '#43A047'; roundRect(ctx, x + 12, y + 10, CELL - 24, CELL - 26, 12); ctx.fill();
    } else {
      ctx.fillStyle = '#B2EBF2'; roundRect(ctx, x + 3, y + 3, CELL - 6, CELL - 6, 14); ctx.fill();
      ctx.lineWidth = 3; ctx.strokeStyle = '#80DEEA'; ctx.stroke();
      if (ch === 'S') { ctx.fillStyle = 'rgba(0,137,123,.22)'; ctx.beginPath(); ctx.arc(x + CELL / 2, y + CELL / 2, 34, 0, Math.PI * 2); ctx.fill(); }
      if (ch === 'G') star(ctx, x + CELL / 2, y + CELL / 2, 32);
    }
  }
  if (view.trail?.length) {
    ctx.save(); ctx.fillStyle = 'rgba(0,105,92,.35)';
    for (const t of view.trail) { ctx.beginPath(); ctx.arc(t.c * CELL + CELL / 2, t.r * CELL + CELL / 2, 9, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
  }
  if (view.blocked) {
    const { r, c } = view.blocked;
    const x = Math.max(0, Math.min(map.width - 1, c)) * CELL + CELL / 2, y = Math.max(0, Math.min(map.height - 1, r)) * CELL + CELL / 2;
    ctx.save(); ctx.strokeStyle = '#C62828'; ctx.lineWidth = 12; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x - 26, y - 26); ctx.lineTo(x + 26, y + 26); ctx.moveTo(x + 26, y - 26); ctx.lineTo(x - 26, y + 26); ctx.stroke();
    ctx.restore();
  }
  if (view.ghost) rover(ctx, view.ghost.r, view.ghost.c, view.ghost.dir, { ghost: true });
  rover(ctx, view.pos.r, view.pos.c, view.pos.dir);
  if (view.badge) drawBadge(ctx, { x: view.pos.c * CELL + CELL - 22, y: view.pos.r * CELL + 22 }, view.badge, { r: 20 });
}
