// 픽셀 손가락 칠하기 (WP8) — 순수 함수. 포인터 좌표 → 칸, 빠른 드래그 사이 칸 보간, 칠한 칸 → DSL 줄.
// 터치 이동이 빨라 pointermove 사이에 칸을 건너뛰어도 브레젠험 선으로 사이 칸을 채운다(누락 0).
// 같은 드래그 안에서 이미 칠한 칸은 다시 넣지 않는다(중복 0). 드래그 한 번 = store 변경 한 번 = 되돌리기 한 번.

/**
 * @param {number} px @param {number} py  격자 요소 기준 CSS px
 * @param {{ox:number, oy:number, cell:number, n:number}} L  첫 칸의 왼쪽 위와 칸 크기
 * @returns {{x:number, y:number}|null} 0부터
 */
export function cellAt(px, py, L) {
  const x = Math.floor((px - L.ox) / L.cell), y = Math.floor((py - L.oy) / L.cell);
  if (x < 0 || y < 0 || x >= L.n || y >= L.n) return null;
  return { x, y };
}

/** a→b 사이 칸(양 끝 포함), 4-연결이 아니어도 대각선 이동 허용 */
export function cellsBetween(a, b) {
  const out = [];
  let x0 = a.x, y0 = a.y;
  const x1 = b.x, y1 = b.y;
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  for (let guard = 0; guard < 1000; guard++) {
    out.push({ x: x0, y: y0 });
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x0 += sx; }
    if (e2 <= dx) { err += dx; y0 += sy; }
  }
  return out;
}

/** 드래그 스트로크: 점을 받을 때마다 새로 칠할 칸만 돌려준다 */
export function createStroke() {
  const seen = new Set();
  const cells = [];
  let last = null;
  return {
    add(cell) {
      if (!cell) { return []; }
      const path = last ? cellsBetween(last, cell) : [cell];
      last = cell;
      const fresh = [];
      for (const c of path) { const k = c.x + ',' + c.y; if (!seen.has(k)) { seen.add(k); cells.push(c); fresh.push(c); } }
      return fresh;
    },
    /** 격자 밖으로 나갔다 들어오면 사이를 잇지 않는다 */
    lift() { last = null; },
    get cells() { return cells.slice(); },
  };
}

/**
 * 칠한 칸을 원문 끝에 덧붙인다. 이미 같은 상태인 칸은 건너뛴다.
 * @param {string} source
 * @param {{x:number,y:number}[]} cells 0부터
 * @param {'paint'|'erase'} mode
 * @param {string} color '#RRGGBB'
 * @param {(string|null)[][]} grid 현재 실행 결과 격자
 * @param {string} defaultColor LED_ON 색
 * @returns {{source:string, lines:string[]}}
 */
export function paintToSource(source, cells, mode, color, grid, defaultColor) {
  const lines = [];
  for (const c of cells) {
    const cur = grid[c.y]?.[c.x] ?? null;
    if (mode === 'erase') { if (cur) lines.push(`LED_OFF ${c.x + 1} ${c.y + 1}`); continue; }
    if (cur && String(cur).toUpperCase() === String(color).toUpperCase()) continue;
    lines.push(String(color).toUpperCase() === String(defaultColor).toUpperCase() ? `LED_ON ${c.x + 1} ${c.y + 1}` : `LED_COLOR ${c.x + 1} ${c.y + 1} ${color}`);
  }
  if (!lines.length) return { source, lines };
  const base = String(source ?? '');
  const sep = !base.trim() ? '' : base.endsWith('\n') ? '' : '\n';
  return { source: (base.trim() ? base : '') + sep + lines.join('\n'), lines };
}
