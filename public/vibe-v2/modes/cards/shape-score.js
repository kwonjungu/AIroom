// 도형 겹치기 채점기 — 순수 함수(DOM 없음). 브라우저·Node 공용.
//
// 좌표: 논리 캔버스 360×360, 3×3 위치 칸(anchor 1~9, 5=가운데), 크기 L/M/S = 150/112/74.
// 그림: stamp 배열 순서 = 찍는 순서 = 나중 것이 위.
//
// 채점 원칙 (README §6.3)
//  1) 픽셀: 각 도형을 해석적으로(점-도형 포함 판정) 120×120 표본에 래스터화한다. 안티앨리어싱이 없으므로
//     같은 그림은 항상 같은 표본을 만든다. 배경은 세지 않는다 — 분모는 "목표 ∪ 학생" 전경 표본 수.
//  2) 의미: 필요한 도형(모양·색·위치·크기)이 모두 있는지, 필요 없는 도형이 없는지, 미션이 정한 앞뒤 관계를
//     지켰는지 따로 본다. 픽셀만으로 정답을 정하지 않는다.
//  3) 완료 = 의미 차이 0 && 픽셀 일치율 ≥ accept.minPercent(기본 100). 빈 작품은 0%·완료 불가.
//  4) 동등 정답: 같은 그림이 나오는 다른 순서(안 겹치는 도형 교환, 같은 색끼리 겹친 도형 교환)는 인정한다.
//     단 accept.orderMatters 에 적힌 쌍은 그림이 같아도 순서를 지켜야 한다(가려진 도형 구분).

export const CANVAS = 360;
export const GRID = 120;
export const SIZE_PX = Object.freeze({ L: 150, M: 112, S: 74 });

export const SHAPE_NAMES = Object.freeze({ circle: '동그라미', rect: '네모', tri: '세모', rhombus: '마름모' });
export const SIZE_NAMES = Object.freeze({ S: '작게', M: '중간', L: '크게' });
const SIZE_ADJ = { S: '작은', M: '중간', L: '큰' };
export const ANCHOR_NAMES = Object.freeze({
  1: '왼쪽 위', 2: '위', 3: '오른쪽 위',
  4: '왼쪽', 5: '가운데', 6: '오른쪽',
  7: '왼쪽 아래', 8: '아래', 9: '오른쪽 아래',
});
/** 학생에게 보여 주는 색 이름 (팔레트) */
export const COLORS = Object.freeze([
  { hex: '#E53935', name: '빨강' },
  { hex: '#FB8C00', name: '주황' },
  { hex: '#FDD835', name: '노랑' },
  { hex: '#43A047', name: '초록' },
  { hex: '#1E88E5', name: '파랑' },
  { hex: '#8D6E63', name: '갈색' },
  { hex: '#90A4AE', name: '회색' },
  { hex: '#FFFFFF', name: '흰색' },
]);

export function colorName(hex) {
  const h = String(hex || '').toUpperCase();
  return COLORS.find(c => c.hex === h)?.name || '다른 색';
}

export function anchorXY(anchor, size = CANVAS) {
  const a = Math.max(1, Math.min(9, Math.trunc(anchor) || 5));
  const step = size / 3;
  return { x: step * ((a - 1) % 3) + step / 2, y: step * Math.floor((a - 1) / 3) + step / 2 };
}

/** 논리 좌표 (px,py)가 도형 안인가 — 해석적 판정 */
export function insideStamp(s, px, py) {
  const { x, y } = anchorXY(s.anchor);
  const h = (SIZE_PX[s.size] || SIZE_PX.M) / 2;
  const dx = px - x, dy = py - y;
  switch (s.shape) {
    case 'circle': return dx * dx + dy * dy <= h * h;
    case 'rect': return Math.abs(dx) <= h && Math.abs(dy) <= h;
    case 'tri': { const t = py - (y - h); return t >= 0 && t <= 2 * h && Math.abs(dx) <= t / 2; }
    case 'rhombus': return Math.abs(dx) + Math.abs(dy) <= h;
    default: return false;
  }
}

/** node({id,args}) 또는 args 객체를 {id, shape, anchor, color, size}로 */
export function normalizeStamp(item, i) {
  const a = item && item.args ? item.args : item || {};
  return {
    id: item && item.args ? item.id : (item && item.id) || null,
    index: i,
    shape: a.shape, anchor: a.anchor, size: a.size,
    color: String(a.color || '').toUpperCase(),
  };
}

/** 프로젝트 program → 찍는 순서대로 stamp 노드 배열 */
export function stampsFromProgram(program) {
  const byId = new Map((program?.nodes || []).map(n => [n.id, n]));
  return (program?.entrypoints || []).map(id => byId.get(id)).filter(n => n && n.kind === 'stamp');
}

/**
 * 표본마다 맨 위 도형의 번호(-1 = 배경).
 * @returns {Int16Array} 길이 grid*grid
 */
export function rasterize(stamps, grid = GRID) {
  const list = (stamps || []).map(normalizeStamp);
  const out = new Int16Array(grid * grid).fill(-1);
  const cell = CANVAS / grid;
  for (let gy = 0; gy < grid; gy++) {
    const py = (gy + 0.5) * cell;
    for (let gx = 0; gx < grid; gx++) {
      const px = (gx + 0.5) * cell;
      for (let k = list.length - 1; k >= 0; k--) {
        if (insideStamp(list[k], px, py)) { out[gy * grid + gx] = k; break; }
      }
    }
  }
  return out;
}

/** 표본별 색(없으면 null) */
export function colorRaster(stamps, grid = GRID) {
  const list = (stamps || []).map(normalizeStamp);
  const idx = rasterize(list, grid);
  return Array.from(idx, k => (k < 0 ? null : list[k].color));
}

/** 두 그림이 다른 표본 표시 (다른 부분 보기용). true = 다름 */
export function diffMask(studentStamps, targetStamps, grid = GRID) {
  const a = colorRaster(studentStamps, grid), b = colorRaster(targetStamps, grid);
  return a.map((c, i) => c !== b[i]);
}

/** 전경 합집합 기준 색 일치율 (0~100 정수, 내림) */
export function pixelPercent(studentStamps, targetStamps, grid = GRID) {
  const a = colorRaster(studentStamps, grid), b = colorRaster(targetStamps, grid);
  let union = 0, same = 0;
  for (let i = 0; i < a.length; i++) {
    if (a[i] === null && b[i] === null) continue;
    union++;
    if (a[i] !== null && a[i] === b[i]) same++;
  }
  return union === 0 ? 0 : Math.floor((same * 100) / union);
}

/** 두 도형이 겹치는 표본에서 색이 다른가 (순서를 바꾸면 그림이 바뀔 수 있는 쌍) */
export function overlapsWithDifferentColor(s1, s2, grid = GRID) {
  const a = normalizeStamp(s1, 0), b = normalizeStamp(s2, 1);
  if (a.color === b.color) return false;
  const cell = CANVAS / grid;
  for (let gy = 0; gy < grid; gy++) for (let gx = 0; gx < grid; gx++) {
    const px = (gx + 0.5) * cell, py = (gy + 0.5) * cell;
    if (insideStamp(a, px, py) && insideStamp(b, px, py)) return true;
  }
  return false;
}

/** 목표에서 i번째 도형을 빼도 그림이 같으면(완전히 가려짐) true */
export function isHiddenInTarget(target, i, grid = GRID) {
  const full = colorRaster(target, grid);
  const without = colorRaster(target.filter((_, k) => k !== i), grid);
  return full.every((c, k) => c === without[k]);
}

// ── 학생 문구 ──
function hasBatchim(word) {
  const ch = String(word).trim().slice(-1);
  const code = ch.charCodeAt(0) - 0xac00;
  if (code < 0 || code > 11171) return false;
  return code % 28 !== 0;
}
export const josa = {
  eunneun: w => w + (hasBatchim(w) ? '은' : '는'),
  eulreul: w => w + (hasBatchim(w) ? '을' : '를'),
  iga: w => w + (hasBatchim(w) ? '이' : '가'),
  euro: w => { const ch = String(w).slice(-1); const c = ch.charCodeAt(0) - 0xac00; const b = c >= 0 && c <= 11171 ? c % 28 : 0; return w + (b === 0 || b === 8 ? '로' : '으로'); },
};

/** 목표 도형 하나를 부르는 말: 같은 색·모양이 둘 이상이면 크기나 위치를 붙인다 */
export function targetLabel(target, i) {
  const list = target.map(normalizeStamp);
  const s = list[i];
  const base = `${colorName(s.color)} ${SHAPE_NAMES[s.shape] || '도형'}`;
  const twins = list.filter(t => t.shape === s.shape && t.color === s.color);
  if (twins.length < 2) return base;
  if (twins.filter(t => t.size === s.size).length === 1) return `${SIZE_ADJ[s.size]} ${base}`;
  return `${ANCHOR_NAMES[s.anchor]} ${base}`;
}

function stampLabel(s) { return `${colorName(s.color)} ${SHAPE_NAMES[s.shape] || '도형'}`; }

function genericHint(d, target, studentList) {
  const T = i => targetLabel(target, i);
  const t = target[d.targetIndex] ? normalizeStamp(target[d.targetIndex]) : null;
  switch (d.kind) {
    case 'missing': return `${josa.iga(T(d.targetIndex))} 아직 없어. 카드를 넣어 볼까?`;
    case 'color': return `이 ${SHAPE_NAMES[t.shape]} 색을 ${josa.euro(colorName(t.color))} 바꿔 볼까?`;
    case 'anchor': return `이 ${josa.eulreul(SHAPE_NAMES[t.shape])} '${ANCHOR_NAMES[t.anchor]}' 칸으로 옮겨 볼까?`;
    case 'size': return `이 ${SHAPE_NAMES[t.shape]} 크기를 '${SIZE_NAMES[t.size]}'${josa.euro(SIZE_NAMES[t.size]).slice(SIZE_NAMES[t.size].length)} 바꿔 볼까?`;
    case 'order': return `${josa.eunneun(T(d.beforeIndex))} 잘 놓았어. ${josa.eulreul(T(d.targetIndex))} 나중에 찍어 볼까?`;
    case 'extra': {
      const s = (d.nodeId != null && studentList.find(x => x.id === d.nodeId)) || studentList[d.studentIndex];
      return `${s ? stampLabel(s) + ' ' : ''}카드는 없어도 돼. 빼 볼까?`;
    }
    default: return '목표 그림과 내 그림을 나란히 놓고 다른 곳을 찾아볼까?';
  }
}

const PRIORITY = ['missing', 'color', 'anchor', 'size', 'order', 'extra'];
const ATTRS = ['color', 'anchor', 'size'];

/**
 * @param {Array} studentStamps  stamp 노드({id,args}) 또는 args 배열, 찍는 순서대로
 * @param {{target:Array, accept?:{orderMatters?:number[][], requireHidden?:boolean, minPercent?:number}, feedback?:Record<string,string>, success?:string}} mission
 * @returns {{percent:number, complete:boolean, differences:{kind:string,nodeId:string|null,targetIndex:number|null}[], studentHint:string}}
 */
export function scoreShape(studentStamps, mission) {
  const target = (mission?.target || []).map(normalizeStamp);
  const student = (studentStamps || []).map(normalizeStamp);
  const accept = { orderMatters: [], requireHidden: true, minPercent: 100, ...(mission?.accept || {}) };

  if (!student.length) {
    return { percent: 0, complete: false, differences: target.map((_, i) => ({ kind: 'missing', nodeId: null, targetIndex: i })),
      studentHint: mission?.feedback?.empty || '카드를 눌러 첫 도형을 찍어 볼까?' };
  }

  const percent = pixelPercent(student, target);
  const pairT = new Array(target.length).fill(-1);   // target i → student j
  const usedS = new Array(student.length).fill(false);
  const same = (a, b) => a.shape === b.shape && a.color === b.color && a.anchor === b.anchor && a.size === b.size;

  // 1) 완전히 같은 카드끼리 짝
  target.forEach((t, i) => {
    const j = student.findIndex((s, k) => !usedS[k] && same(s, t));
    if (j >= 0) { pairT[i] = j; usedS[j] = true; }
  });
  // 2) 모양이 같은 카드와 짝 → 속성 차이
  const differences = [];
  target.forEach((t, i) => {
    if (pairT[i] >= 0) return;
    let best = -1, bestCost = Infinity;
    student.forEach((s, k) => {
      if (usedS[k] || s.shape !== t.shape) return;
      const cost = ATTRS.filter(a => s[a] !== t[a]).length * 100 + Math.abs(k - i);
      if (cost < bestCost) { bestCost = cost; best = k; }
    });
    if (best >= 0) {
      pairT[i] = best; usedS[best] = true;
      for (const a of ATTRS) if (student[best][a] !== t[a]) differences.push({ kind: a, nodeId: student[best].id, targetIndex: i, studentIndex: best });
    }
  });
  // 3) 빠진 도형
  target.forEach((t, i) => {
    if (pairT[i] >= 0) return;
    if (!accept.requireHidden && isHiddenInTarget(target, i)) return;
    differences.push({ kind: 'missing', nodeId: null, targetIndex: i });
  });
  // 4) 필요 없는 도형
  student.forEach((s, k) => { if (!usedS[k]) differences.push({ kind: 'extra', nodeId: s.id, targetIndex: null, studentIndex: k }); });

  // 5) 앞뒤 관계: 미션이 정한 쌍 → 그림이 다를 때는 색이 다른 채 겹치는 쌍에서 원인 찾기
  const orderSeen = new Set();
  const checkPair = (a, b) => {
    if (pairT[a] < 0 || pairT[b] < 0 || orderSeen.has(b)) return;
    if (pairT[a] > pairT[b]) {
      orderSeen.add(b);
      differences.push({ kind: 'order', nodeId: student[pairT[b]].id, targetIndex: b, beforeIndex: a, studentIndex: pairT[b] });
    }
  };
  for (const [a, b] of accept.orderMatters) checkPair(a, b);
  if (percent < 100) {
    for (let a = 0; a < target.length; a++) for (let b = a + 1; b < target.length; b++) {
      if (overlapsWithDifferentColor(target[a], target[b])) checkPair(a, b);
    }
  }

  differences.sort((x, y) => PRIORITY.indexOf(x.kind) - PRIORITY.indexOf(y.kind));
  const complete = differences.length === 0 && percent >= accept.minPercent;

  let studentHint;
  if (complete) studentHint = mission?.success || '목표 그림과 똑같아! 완성!';
  else if (differences.length) {
    const d = differences[0];
    studentHint = mission?.feedback?.[`${d.kind}:${d.targetIndex}`] || mission?.feedback?.[d.kind] || genericHint(d, target, student);
  } else studentHint = '거의 다 됐어! 목표 그림과 겹쳐 보며 다른 곳을 찾아볼까?';

  return {
    percent,
    complete,
    differences: differences.map(({ kind, nodeId, targetIndex }) => ({ kind, nodeId: nodeId ?? null, targetIndex: targetIndex ?? null })),
    studentHint,
  };
}
