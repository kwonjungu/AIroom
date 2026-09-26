// 미로 격자 공용 유틸 (WP4) — 의미 검증·런타임·템플릿이 같은 배치 계산을 쓴다. DOM 없음.
// mazeMap.rows: '#' 벽, '.' 길, 'S' 출발, 'G' 도착. 격자는 논리 800×600 안에 가운데 정렬로 맞춘다.

import { STUDIO_WORLD } from '../contracts/nodes.js';

/**
 * @param {string[]} rows
 * @returns {{rows:string[], cols:number, nrows:number, cell:number, ox:number, oy:number,
 *   start:{c:number,r:number}|null, goal:{c:number,r:number}|null, starts:number, goals:number, ragged:boolean}}
 */
export function mazeLayout(rows) {
  const nrows = rows.length;
  const cols = rows.reduce((m, r) => Math.max(m, r.length), 0);
  const ragged = rows.some(r => r.length !== cols);
  const cell = Math.min(STUDIO_WORLD.width / cols, STUDIO_WORLD.height / nrows);
  const ox = (STUDIO_WORLD.width - cols * cell) / 2;
  const oy = (STUDIO_WORLD.height - nrows * cell) / 2;
  let start = null, goal = null, starts = 0, goals = 0;
  rows.forEach((row, r) => {
    for (let c = 0; c < row.length; c++) {
      if (row[c] === 'S') { starts++; if (!start) start = { c, r }; }
      if (row[c] === 'G') { goals++; if (!goal) goal = { c, r }; }
    }
  });
  return { rows, cols, nrows, cell, ox, oy, start, goal, starts, goals, ragged };
}

/** 칸 (c,r)이 벽인가. 격자 밖·짧은 행의 빈 자리도 벽으로 본다. */
export function isWall(L, c, r) {
  if (r < 0 || r >= L.nrows || c < 0 || c >= L.cols) return true;
  const ch = L.rows[r][c];
  return ch === undefined || ch === '#';
}

export function cellCenter(L, c, r) {
  return { x: L.ox + (c + 0.5) * L.cell, y: L.oy + (r + 0.5) * L.cell };
}

export function cellAt(L, x, y) {
  return { c: Math.floor((x - L.ox) / L.cell), r: Math.floor((y - L.oy) / L.cell) };
}

/** 원(x,y,r)이 어떤 벽 칸과 겹치는가 (원-AABB). */
export function circleHitsWall(L, x, y, rad) {
  const c0 = Math.floor((x - rad - L.ox) / L.cell), c1 = Math.floor((x + rad - L.ox) / L.cell);
  const r0 = Math.floor((y - rad - L.oy) / L.cell), r1 = Math.floor((y + rad - L.oy) / L.cell);
  const rr = rad * rad;
  for (let r = r0; r <= r1; r++) {
    for (let c = c0; c <= c1; c++) {
      if (!isWall(L, c, r)) continue;
      const left = L.ox + c * L.cell, top = L.oy + r * L.cell;
      const nx = Math.max(left, Math.min(x, left + L.cell));
      const ny = Math.max(top, Math.min(y, top + L.cell));
      const dx = x - nx, dy = y - ny;
      if (dx * dx + dy * dy < rr) return true;
    }
  }
  return false;
}

/**
 * S→G 최단 경로 (BFS, 4방향). movement='horizontal'이면 같은 행 좌우 이동만.
 * @returns {{c:number,r:number}[]|null} 출발·도착 포함 칸 목록
 */
export function mazePath(L, movement = 'fourWay') {
  if (!L.start || !L.goal || L.ragged) return null;
  const dirs = movement === 'horizontal' ? [[1, 0], [-1, 0]] : [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const key = (c, r) => r * L.cols + c;
  const prev = new Map([[key(L.start.c, L.start.r), null]]);
  const q = [L.start];
  for (let qi = 0; qi < q.length; qi++) {
    const cur = q[qi];
    if (cur.c === L.goal.c && cur.r === L.goal.r) {
      const path = [];
      for (let k = key(cur.c, cur.r); k !== null; k = prev.get(k)) path.push({ c: k % L.cols, r: Math.floor(k / L.cols) });
      return path.reverse();
    }
    for (const [dc, dr] of dirs) {
      const c = cur.c + dc, r = cur.r + dr;
      if (isWall(L, c, r) || prev.has(key(c, r))) continue;
      prev.set(key(c, r), key(cur.c, cur.r));
      q.push({ c, r });
    }
  }
  return null;
}

/** 열린 칸(벽·S·G 제외) 목록 — scatter 배치용. 행 우선 순서로 결정적. */
export function openCells(L) {
  const out = [];
  for (let r = 0; r < L.nrows; r++) for (let c = 0; c < L.cols; c++) if (L.rows[r][c] === '.') out.push({ c, r });
  return out;
}
