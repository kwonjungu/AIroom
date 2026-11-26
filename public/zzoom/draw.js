// 쭘 판서 (디자인 3팀) — 설계 DESIGN.md 파트 E·K5, 약속 CONTRACTS.md 3·4·6절.
// 자리: #zz-layer-ink(굳은 선), #zz-layer-temp(그리는 중), #zz-toolbar(도구 막대).
// 좌표: 쪽 비율 (x,y) → 화면 CSS px = ox + x*pageW*scale, oy + y*pageH*scale, canvas px 는 거기에 dpr.
import { getStroke } from './vendor/perfect-freehand-1.2.3.mjs';

export const css = 'draw.css';

// ---------- 프리셋표(이 파일 한 곳) ----------
// size(px) = w × 쪽 너비. 문서에는 tool 이름과 w 만 저장한다.
export const PRESETS = {
  pen: { w: 0.004, thinning: 0.5, smoothing: 0.5, streamline: 0.5, alpha: 1, op: 'source-over' },
  hl: { w: 0.018, thinning: 0, smoothing: 0.5, streamline: 0.6, alpha: 0.35, op: 'multiply' },
};
// 서버가 받는 색 6개(routes.js PALETTE)와 CSS 변수 이름
export const COLORS = {
  hl: [
    { hex: '#FFE14D', v: '--zz-hl-yellow', label: '노랑' },
    { hex: '#9BE15D', v: '--zz-hl-green', label: '연두' },
    { hex: '#FF8AD8', v: '--zz-hl-pink', label: '분홍' },
  ],
  pen: [
    { hex: '#E5484D', v: '--zz-pen-red', label: '빨강' },
    { hex: '#2F6FEB', v: '--zz-pen-blue', label: '파랑' },
    { hex: '#1d1d1f', v: '--zz-pen-black', label: '검정' },
  ],
};
export const MAX_PTS = 1500;          // 한 문서 최대 점 수(넘으면 group·part 로 나눔)
export const MAX_PARTS = 21;          // 서버 part 0~20
export const ERASE_R = 12;            // 지우개 반경(CSS px)
const SEND_GAP = 350;                 // 획 저장 0.35초 1회(서버 초당 3회 한도 안, 2026-11-26 지연 줄이기 A)
const DEL_GAP = 260;                  // 지우기 요청 간격(서버 초당 5회 한도 아래)
const FAIL_ALPHA = 0.3;               // 저장 실패 선 흐리게
// 쪽 구독은 지금 쪽 하나만. 최근 3쪽 유지(LRU)와 캐시는 api.js 가 한 곳에서 맡는다(briefs/COST.md 3).
export const PAGE_LRU = 1;
// 429·연결 실패는 지수 백오프로 다시 보냄. tries 번 실패하면 흐리게 + 「다시 보내기」. (시험에서 값을 줄일 수 있게 객체로)
export const RETRY = { tries: 6, base: 1000, max: 16000 };
export const backoff = n => Math.min(RETRY.max, RETRY.base * 2 ** Math.max(0, n - 1)); // 1·2·4·8·16초

// ---------- 순수 함수(DOM·store 를 만지지 않음) ----------
const r4 = v => Math.round(v * 10000) / 10000;
const r2 = v => Math.round(v * 100) / 100;
const clamp01 = v => (v < 0 ? 0 : v > 1 ? 1 : v);

// 입력 점(평평한 배열)을 쪽 px 점 [[x,y,p]…] 로
function toPagePts(pts, pageW, pageH) {
  const out = [];
  for (let i = 0; i + 2 < pts.length; i += 3) out.push([pts[i] * pageW, pts[i + 1] * pageH, pts[i + 2]]);
  return out;
}
// 마우스·손가락은 p=0.5 로만 저장한다 → 모두 0.5 면 필압 흉내
export function simulatesPressure(pts) {
  for (let i = 2; i < pts.length; i += 3) if (pts[i] !== 0.5) return false;
  return true;
}
// perfect-freehand 옵션
export function strokeOptions(stroke, pageW, last = true, minPx = 0.5) {
  const pr = PRESETS[stroke.tool] || PRESETS.pen;
  return {
    // minPx 는 쪽 px 단위 최소 굵기. 화면에서 펜이 2.2px 아래로 가늘어지지 않게 그리는 쪽이 정한다(감사 R7 P4·R8 N2). 저장값(w)은 그대로.
    size: Math.max(stroke.tool === 'hl' ? 0.5 : minPx, (stroke.w || pr.w) * pageW),
    thinning: pr.thinning, smoothing: pr.smoothing, streamline: pr.streamline,
    simulatePressure: simulatesPressure(stroke.pts), last,
  };
}
// 외곽선 다각형 → Path2D (이차 곡선으로 매끈하게)
export function outlineToPath(outline) {
  const path = new Path2D();
  const n = outline.length;
  if (n < 3) return path;
  path.moveTo(outline[0][0], outline[0][1]);
  for (let i = 0; i < n; i++) {
    const a = outline[i], b = outline[(i + 1) % n];
    path.quadraticCurveTo(a[0], a[1], (a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
  }
  path.closePath();
  return path;
}
const pathCache = new Map(); // key → Path2D (쪽 px 좌표라 확대·이동과 무관)
function cachedPath(key, make) {
  if (!key) return make();
  let p = pathCache.get(key);
  if (!p) {
    p = make();
    pathCache.set(key, p);
    if (pathCache.size > 6000) pathCache.delete(pathCache.keys().next().value);
  }
  return p;
}
// 내 선·남의 선 모두 이것 하나로 그린다. ctx 는 「쪽 px → canvas px」 변환이 걸려 있어야 한다.
// opts: {alpha(배수), cacheKey, last}
export function renderStroke(ctx2d, stroke, pageW, pageH, opts = {}) {
  if (!stroke || !Array.isArray(stroke.pts) || stroke.pts.length < 3) return;
  const pr = PRESETS[stroke.tool] || PRESETS.pen;
  const last = opts.last !== false;
  // 화면 배율(scale)을 알면 화면에서 최소 2.2px 가 되도록 쪽 px 최소 굵기를 정한다. 캐시 열쇠에 넣으려 조금 둥글린다.
  const minPx = opts.scale > 0 ? Math.max(0.5, Math.round((2.2 / opts.scale) * 4) / 4) : 0.5;
  const key = opts.cacheKey ? `${opts.cacheKey}@${pageW}x${pageH}m${minPx}` : null;
  const path = cachedPath(key, () => outlineToPath(getStroke(toPagePts(stroke.pts, pageW, pageH), strokeOptions(stroke, pageW, last, minPx))));
  ctx2d.save();
  ctx2d.globalAlpha = pr.alpha * (opts.alpha ?? 1);
  ctx2d.globalCompositeOperation = pr.op;
  ctx2d.fillStyle = stroke.color || '#1d1d1f';
  ctx2d.fill(path); // 한 획을 한 번에 채움(형광펜이 획 안에서 겹쳐 진해지지 않음)
  ctx2d.restore();
}
// 화면 CSS px → 쪽 비율
export function toPage(vp, sx, sy) {
  return [(sx - vp.ox) / (vp.pageW * vp.scale), (sy - vp.oy) / (vp.pageH * vp.scale)];
}
// 쪽 비율 → 화면 CSS px
export function toScreen(vp, x, y) {
  return [vp.ox + x * vp.pageW * vp.scale, vp.oy + y * vp.pageH * vp.scale];
}
// ctx 에 「쪽 px → canvas px」 변환을 건다
export function applyViewport(ctx2d, vp) {
  const k = vp.dpr * vp.scale;
  ctx2d.setTransform(k, 0, 0, k, vp.dpr * vp.ox, vp.dpr * vp.oy);
}
// 저장용 숫자로 다듬기(x·y 넷째 자리, p 둘째 자리, 0~1)
export function quantize(x, y, p) {
  return [r4(clamp01(x)), r4(clamp01(y)), r2(clamp01(p))];
}
// 1,500점 넘으면 나눔. 다음 조각은 앞 조각 끝점을 겹쳐 시작(따로 그려도 이어짐). 21조각 넘는 점은 버림.
export function splitPts(pts, max = MAX_PTS) {
  const n = pts.length / 3;
  if (n <= max) return [pts.slice()];
  const parts = [];
  let start = 0;
  while (start < n - 1 && parts.length < MAX_PARTS) {
    const end = Math.min(n, start + max);
    parts.push(pts.slice(start * 3, end * 3));
    if (end >= n) break;
    start = end - 1;
  }
  return parts;
}
// 같은 group 의 조각을 part 순서로 이어 한 선으로(겹친 첫 점은 뺌). 결과는 첫 조각의 seq 순.
export function mergeGroups(strokes) {
  const out = [], groups = new Map();
  for (const s of strokes) {
    if (!s.group) { out.push({ ...s, ids: [s.id] }); continue; }
    const k = (s.cid || '') + '|' + s.group;
    let g = groups.get(k);
    if (!g) { g = { ...s, parts: [] }; groups.set(k, g); out.push(g); }
    g.parts.push(s);
  }
  for (let i = 0; i < out.length; i++) {
    const g = out[i];
    if (!g.parts) continue;
    g.parts.sort((a, b) => (a.part || 0) - (b.part || 0));
    const pts = [];
    g.parts.forEach((p, j) => { pts.push(...(j && p.part === g.parts[j - 1].part + 1 ? p.pts.slice(3) : p.pts)); });
    out[i] = { ...g.parts[0], pts, ids: g.parts.map(p => p.id) };
  }
  return out;
}
// 점에서 선분까지 거리²
function segDist2(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy;
  let t = L ? ((px - ax) * dx + (py - ay) * dy) / L : 0;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  const x = ax + t * dx - px, y = ay + t * dy - py;
  return x * x + y * y;
}
// 지우개 맞힘: 입력 점(과 그 사이 선분)까지 화면 거리 ≤ 반경 + 선 반 굵기
export function hitStroke(stroke, vp, sx, sy, r = ERASE_R) {
  const pts = stroke.pts, k = vp.pageW * vp.scale;
  const half = ((stroke.w || PRESETS[stroke.tool]?.w || 0.004) * k) / 2;
  const R = r + half, R2 = R * R;
  let [ax, ay] = toScreen(vp, pts[0], pts[1]);
  if (pts.length === 3) return (ax - sx) ** 2 + (ay - sy) ** 2 <= R2;
  for (let i = 3; i + 2 < pts.length; i += 3) {
    const [bx, by] = toScreen(vp, pts[i], pts[i + 1]);
    if (segDist2(sx, sy, ax, ay, bx, by) <= R2) return true;
    ax = bx; ay = by;
  }
  return false;
}
// 판서 구독 약속: subscribePageStrokes(pageKey, cb) → cb(선 배열: 현재 epoch 만, seq 순).
// 저장 방식(선 1개=문서 1개 / 쪽마다 묶음 문서)과 상관없이 draw.js 는 이 모양만 쓴다.
// api.js 에 아직 없으면 옛 함수 두 개(subscribeStrokes + subscribePageEpoch)로 같은 모양을 만든다.
export function pageStrokesSource(api, mid) {
  if (typeof api.subscribePageStrokes === 'function') {
    return (pageKey, cb) => (api.subscribePageStrokes.length >= 3 ? api.subscribePageStrokes(mid, pageKey, cb) : api.subscribePageStrokes(pageKey, cb));
  }
  return (pageKey, cb) => {
    let list = null, ep = null;
    const emit = () => { if (list && ep !== null) cb(list.filter(s => (s.epoch || 0) === ep).sort((a, b) => a.seq - b.seq)); };
    const u1 = api.subscribeStrokes(mid, pageKey, l => { list = Array.isArray(l) ? l : []; emit(); });
    const u2 = api.subscribePageEpoch(mid, pageKey, e => { ep = Number(e) || 0; emit(); });
    return () => { try { u1?.(); } finally { u2?.(); } };
  };
}
const rid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

// ---------- 화면 모듈 ----------
export function mount(ctx) {
  const { api, store, t } = ctx;
  const mid = ctx.mid;
  const ink = ctx.el('zz-layer-ink');
  const temp = ctx.el('zz-layer-temp');
  const bar = ctx.el('zz-toolbar');
  const ictx = ink.getContext('2d');
  const tctx = temp.getContext('2d');
  const offs = [];
  const on = (target, type, fn, o) => { target.addEventListener(type, fn, o); offs.push(() => target.removeEventListener(type, fn, o)); };

  // 도구 상태(기기별, 쪽 넘겨도 유지). 모드는 이 기기의 store 에, 도구·색은 localStorage 에도.
  const saved = (() => { try { return JSON.parse(localStorage.getItem('zzoom_tool') || 'null'); } catch { return null; } })();
  const prev = store.get('tool');
  let tool = {
    mode: prev?.mode === 'pen' ? 'pen' : 'view',
    tool: prev?.tool || saved?.tool || 'hl',
    color: prev?.color || saved?.color || null,
    w: prev?.w || null,
    last: { hl: saved?.last?.hl || COLORS.hl[0].hex, pen: saved?.last?.pen || COLORS.pen[0].hex },
  };
  if (!['pen', 'hl', 'eraser'].includes(tool.tool)) tool.tool = 'hl';
  function fixColor() {
    if (tool.tool === 'eraser') return;
    const ok = COLORS[tool.tool].some(c => c.hex === tool.color);
    if (!ok) tool.color = tool.last[tool.tool];
    tool.w = PRESETS[tool.tool].w;
  }
  fixColor();
  function publishTool() {
    store.set('tool', { mode: tool.mode, tool: tool.tool, color: tool.tool === 'eraser' ? null : tool.color, w: tool.tool === 'eraser' ? null : tool.w });
    try { localStorage.setItem('zzoom_tool', JSON.stringify({ tool: tool.tool, color: tool.color, last: tool.last })); } catch { /* 저장 못 해도 됨 */ }
  }

  // ---------- 상태 ----------
  let vp = store.get('viewport') || null;
  let pageKey = vp?.pageKey || store.get('page')?.pageKey || null;
  // 쪽별 구독 묶음. 최근 본 PAGE_LRU 쪽은 끊지 않고 둔다(다시 와도 선 2,000개를 새로 읽지 않게).
  // {key, strokes(구독 그대로, seq 순), epoch, epochKnown, hidden(지우는 중 숨긴 id), unsubS, unsubE}
  const pages = new Map();
  const lingering = new Map();          // 떠났지만 epoch 를 기다리는 내 선이 있어 아직 듣는 쪽
  const unresolved = key => pending.some(p => p.pageKey === key && p.epoch === null);
  const subscribePageStrokes = pageStrokesSource(api, mid);
  const blank = key => ({ key, strokes: [], epoch: 0, epochKnown: false, hidden: new Set(), unsubS: null, unsubE: null });
  let cur = blank(null);
  const pending = [];                   // 내가 그린 선 {lid, pageKey, epoch, stroke, parts:[{body, id?}], status:'queued'|'sending'|'saved'|'failed'}
  let drawing = null;                   // 그리는 중 {pointerId, vp, pageKey, epoch, pts:[], lastSx, lastSy}
  let erasing = null;                   // 지우는 중 {pointerId}
  let penSeen = false;                  // 펜을 한 번이라도 쓰면 손바닥(터치)은 그리지 않음
  let raf = 0, inkDirty = false, tempDirty = false;
  let sendTimer = 0, lastSend = 0, sending = false;
  let streak = 0, holdUntil = 0;
  let dead = false;                     // unmount 뒤에는 늦게 끝난 요청이 타이머를 다시 잡지 않게        // 연속 실패 수, 다음 보내기 가능 시각(백오프)
  const delQueue = []; let delTimer = 0, lastDel = 0;
  let eraserAt = null;                  // 지우개 동그라미 위치

  const role = () => store.get('role');
  const meeting = () => store.get('meeting') || {};
  const isHost = () => role()?.role === 'host';
  const locked = () => !!meeting().penLock && !isHost();
  const statusOk = () => { const s = meeting().status; return !s || s === 'ready' || s === 'live'; };
  const canDraw = () => !!role() && statusOk() && !locked();

  // ---------- 그리기 ----------
  function schedule(inkToo = true) {
    if (inkToo) inkDirty = true; else tempDirty = true;
    if (!raf) raf = requestAnimationFrame(frame);
  }
  function frame() {
    raf = 0;
    if (inkDirty) { inkDirty = false; paintInk(); }
    if (tempDirty) { tempDirty = false; paintTemp(); }
  }
  function visibleStrokes() {
    const ids = new Set();
    for (const p of pending) for (const part of p.parts) if (part.id) ids.add(part.id);
    const list = cur.strokes.filter(s => !cur.hidden.has(s.id));
    return { merged: mergeGroups(list), ids };
  }
  function paintInk() {
    ictx.setTransform(1, 0, 0, 1, 0, 0);
    ictx.clearRect(0, 0, ink.width, ink.height);
    if (!vp || !pageKey || vp.pageKey !== pageKey) return;
    applyViewport(ictx, vp);
    const { merged, ids } = visibleStrokes();
    const shownByServer = new Set();
    for (const s of merged) {
      renderStroke(ictx, s, vp.pageW, vp.pageH, { cacheKey: s.ids.join(','), scale: vp.scale });
      for (const id of s.ids) shownByServer.add(id);
    }
    // 내 선(아직 구독에 안 온 것)은 위에. 실패한 선은 흐리게.
    for (const p of pending) {
      if (p.pageKey !== pageKey || (p.epoch !== null && p.epoch !== cur.epoch) || p.erased) continue;
      if (p.parts.length && p.parts.every(x => x.id && shownByServer.has(x.id))) continue;
      renderStroke(ictx, p.stroke, vp.pageW, vp.pageH, { cacheKey: 'l' + p.lid, alpha: p.status === 'failed' ? FAIL_ALPHA : 1, scale: vp.scale });
    }
    void ids;
  }
  function paintTemp() {
    tctx.setTransform(1, 0, 0, 1, 0, 0);
    tctx.clearRect(0, 0, temp.width, temp.height);
    if (drawing && drawing.pts.length >= 3) {
      const v = drawing.vp;
      applyViewport(tctx, v);
      renderStroke(tctx, { tool: drawing.tool, color: drawing.color, w: drawing.w, pts: drawing.pts }, v.pageW, v.pageH, { last: false, scale: v.scale });
    }
    if (eraserAt && vp) {
      tctx.setTransform(vp.dpr, 0, 0, vp.dpr, 0, 0);
      tctx.beginPath();
      tctx.arc(eraserAt[0], eraserAt[1], ERASE_R, 0, Math.PI * 2);
      tctx.lineWidth = 1.5; tctx.strokeStyle = 'rgba(29,29,31,.7)'; tctx.fillStyle = 'rgba(255,255,255,.35)';
      tctx.fill(); tctx.stroke();
    }
  }

  // ---------- 쪽 구독 ----------
  // 선은 subscribePageStrokes(현재 epoch 만), epoch 는 새 선에 붙일 값과 옛 대기 선 정리에만 쓴다.
  function subscribePage(key) {
    const en = blank(key);
    if (!mid) return en;
    en.unsubE = api.subscribePageEpoch(mid, key, e => {
      en.epoch = Number(e) || 0; en.epochKnown = true;
      dropStale(en);
      resolveEpoch(en);
      if (lingering.get(key) === en && !unresolved(key)) { lingering.delete(key); closePage(en); }
      if (en === cur) schedule();
    });
    en.unsubS = subscribePageStrokes(key, list => {
      en.strokes = Array.isArray(list) ? list : [];
      const have = new Set(en.strokes.map(s => s.id));
      for (const id of [...en.hidden]) if (!have.has(id)) en.hidden.delete(id);
      // 서버에 다 도착한 내 선은 대기 목록에서 뺀다
      for (let i = pending.length - 1; i >= 0; i--) {
        const p = pending[i];
        if (p.status === 'saved' && p.pageKey === key && p.parts.every(x => have.has(x.id))) pending.splice(i, 1);
      }
      if (en === cur) schedule();
    });
    return en;
  }
  function closePage(en) { try { en.unsubS?.(); } catch { /* 무시 */ } try { en.unsubE?.(); } catch { /* 무시 */ } }
  function setPage(key) {
    if (key && key === pageKey && pages.has(key)) return;
    cancelDrawing();
    pageKey = key || null;
    if (!pageKey) { cur = blank(null); schedule(); return; }
    let en = pages.get(pageKey);
    if (!en && lingering.has(pageKey)) { en = lingering.get(pageKey); lingering.delete(pageKey); pages.set(pageKey, en); }
    if (en) pages.delete(pageKey); else en = subscribePage(pageKey);
    pages.set(pageKey, en);                        // Map 끝 = 가장 최근
    cur = en;
    while (pages.size > PAGE_LRU) {                // 가장 오래 안 본 쪽부터 끊음
      const [k, old] = pages.entries().next().value;
      pages.delete(k);
      if (unresolved(k)) lingering.set(k, old);     // epoch 를 기다리는 내 선이 있으면 그때까지 듣는다
      else closePage(old);
    }
    schedule();
  }
  // 쪽이 지워져 epoch 가 오르면 옛 epoch 로 기다리는 내 선은 버린다
  function dropStale(en = cur) {
    if (!en.epochKnown) return;
    for (let i = pending.length - 1; i >= 0; i--) {
      const p = pending[i];
      // 짐작한 epoch(0)로 기다리는 선은 버리지 않는다 — 서버 값을 받아 다시 보낸다(감사 R7 P4)
      if (p.pageKey === en.key && p.guessed && (p.status === 'queued' || p.status === 'failed')) {   // 이미 저장된 선은 번호를 바꾸지 않는다(감사 R8 N7) p.epoch = en.epoch; p.guessed = false; for (const x of p.parts) x.body.epoch = en.epoch; continue; }
      if (p.pageKey === en.key && p.epoch !== null && p.epoch < en.epoch && p.status !== 'sending') pending.splice(i, 1);
    }
    renderBar();
  }

  // ---------- 저장(낙관적 표시, 1초 1회, 20개 묶음) ----------
  function queueStroke(d) {
    const pts = d.pts;
    if (pts.length === 3) pts.push(r4(Math.min(1, pts[0] + 0.0001)), pts[1], pts[2]); // 점 하나 = 아주 짧은 선
    const chunks = splitPts(pts);
    const group = chunks.length > 1 ? rid() : undefined;
    const stroke = { tool: d.tool, color: d.color, w: d.w, pts: chunks.length > 1 ? [].concat(...chunks.map((c, i) => (i ? c.slice(3) : c))) : pts };
    const p = {
      lid: rid(), pageKey: d.pageKey, epoch: d.epoch, stroke, status: 'queued',
      parts: chunks.map((c, i) => ({ body: { pageKey: d.pageKey, epoch: d.epoch, tool: d.tool, color: d.color, w: d.w, pts: c, ...(group ? { group, part: i } : {}) } })),
    };
    pending.push(p);
    schedule();
    flushSoon();
    // 쪽 epoch 구독이 늦으면(학교망에서 실시간 연결이 멈춤) 선이 영영 안 간다. 4초 뒤에도 모르면 0 으로 짐작해 보내고,
    // 서버가 stale_epoch 로 진짜 값을 알려 주면 그 값으로 다시 보낸다(flush 의 guessed 처리).
    if (p.epoch === null) setTimeout(() => {
      if (dead || p.epoch !== null || !pending.includes(p)) return;
      p.epoch = 0; p.guessed = true; for (const x of p.parts) x.body.epoch = 0;
      flushSoon();
    }, 4000);
  }
  // epoch 를 모를 때 그린 선(epoch null)에 그 쪽 epoch 를 정한다(그 epoch 가 지금 값이므로 버리지 않는다)
  function resolveEpoch(en) {
    let n = 0;
    for (const p of pending) {
      if (p.pageKey !== en.key || p.epoch !== null) continue;
      p.epoch = en.epoch; for (const x of p.parts) x.body.epoch = en.epoch; n++;
    }
    if (n) flushSoon();
  }
  function flushSoon() {
    if (dead || sendTimer || sending) return;
    // 1초 1회(서버 한도). 대기열은 그동안 모여 다음 묶음(최대 20개)으로 간다.
    const wait = Math.max(0, lastSend + SEND_GAP - Date.now(), holdUntil - Date.now());
    sendTimer = setTimeout(() => { sendTimer = 0; flush(); }, wait);
  }
  async function flush() {
    if (dead || sending) return;
    const batch = [];
    for (const p of pending) {
      if (p.status !== 'queued' || p.epoch === null) continue;   // epoch 를 모르면 기다림
      const need = p.parts.filter(x => !x.id);
      if (batch.length + need.length > 20 && batch.length) break;
      for (const part of need) batch.push({ p, part });
      p.status = 'sending';
      if (batch.length >= 20) break;
    }
    if (!batch.length) return;
    sending = true; lastSend = Date.now();
    try {
      const res = await api.saveStrokes(mid, batch.map(b => b.part.body));
      streak = 0; holdUntil = 0;
      const got = res?.strokes || [];
      batch.forEach((b, i) => { if (got[i]?.id) b.part.id = got[i].id; });
      for (const p of new Set(batch.map(b => b.p))) {
        p.status = p.parts.every(x => x.id) ? 'saved' : 'queued';
        if (p.erased && p.status === 'saved') for (const x of p.parts) enqueueDelete(x.id);
      }
    } catch (e) {
      const ps = [...new Set(batch.map(b => b.p))];
      const code = e?.code, status = e?.status;
      if (code === 'stale_epoch') {
        // 지워진 쪽에 그린 선은 버리고 나머지는 다시 보냄
        const k = e.extra?.pageKey, ep = Number(e.extra?.epoch);
        let dropped = 0;
        for (const p of ps) {
          if (p.pageKey === k && p.guessed && Number.isFinite(ep)) {   // 짐작한 epoch 였으면 진짜 값으로 다시
            p.epoch = ep; p.guessed = false; for (const x of p.parts) x.body.epoch = ep; p.status = 'queued';
          } else if (p.pageKey === k && !(p.epoch === ep)) { remove(p); dropped++; }
          else p.status = 'queued';
        }
        const en = pages.get(k); if (en && Number.isFinite(ep)) { en.epoch = ep; en.epochKnown = true; }
        if (dropped) ctx.toast(t('쪽이 지워져서 그 선은 저장하지 않았어요'), 'warn');
      } else if (code === 'pen_locked') {
        ps.forEach(remove);
        ctx.toast(t('지금은 회의 담당자만 쓸 수 있어요'), 'warn');
      } else if (status === 429 || status === 0 || status >= 500 || !status) {
        // 한도·연결 끊김·서버 오류: 화면에는 그대로 두고 백오프 뒤 다시. 여러 번 실패한 것만 흐리게.
        streak++; holdUntil = Date.now() + backoff(streak);
        ps.forEach(p => { p.tries = (p.tries || 0) + 1; p.status = p.tries >= RETRY.tries ? 'failed' : 'queued'; });
      } else if (status === 400 || code === 'stroke_limit' || (status === 409 && String(code || '').startsWith('state_')) || status === 410) {
        ps.forEach(remove);
        ctx.toast(e?.message || t('선을 저장하지 못했어요'), 'error');
      } else {
        // 그 밖의 거절(403 등): 다시 보내도 안 됨
        ps.forEach(remove);
        ctx.toast(e?.message || t('선을 저장하지 못했어요'), 'error');
      }
    } finally {
      sending = false;
      if (dead) return;
      renderBar(); schedule();
      if (pending.some(p => p.status === 'queued')) flushSoon();
    }
  }
  function remove(p) { const i = pending.indexOf(p); if (i >= 0) pending.splice(i, 1); }
  function retryFailed() {
    for (const p of pending) if (p.status === 'failed') { p.status = 'queued'; p.tries = 0; }
    streak = 0; holdUntil = 0;
    renderBar(); schedule(); flushSoon();
  }

  // ---------- 지우개 ----------
  function enqueueDelete(id) {
    if (!id || delQueue.includes(id)) return;
    delQueue.push(id);
    pumpDelete();
  }
  function pumpDelete() {
    if (dead || delTimer || !delQueue.length) return;
    const wait = Math.max(0, lastDel + DEL_GAP - Date.now());
    delTimer = setTimeout(async () => {
      delTimer = 0;
      const id = delQueue.shift();
      if (!id) return;
      lastDel = Date.now();
      try { await api.deleteStroke(mid, id); }
      catch (e) {
        if (e?.status !== 404) {
          for (const en of pages.values()) en.hidden.delete(id);
          schedule();
          ctx.toast(e?.message || t('선을 지우지 못했어요'), 'error');
        }
      }
      pumpDelete();
    }, wait);
  }
  function eraseAt(sx, sy) {
    if (!vp || vp.pageKey !== pageKey) return;
    const me = role()?.cid, host = isHost();
    let changed = false;
    // 서버 선(조각은 한 선으로)
    for (const s of mergeGroups(cur.strokes.filter(s => !cur.hidden.has(s.id)))) {
      if (!host && s.cid !== me) continue;
      if (!hitStroke(s, vp, sx, sy)) continue;
      for (const id of s.ids) { cur.hidden.add(id); enqueueDelete(id); }
      changed = true;
    }
    // 아직 구독에 안 온 내 선
    for (const p of [...pending]) {
      if (p.pageKey !== pageKey || p.erased || !hitStroke(p.stroke, vp, sx, sy)) continue;
      changed = true;
      if (p.status === 'queued' || p.status === 'failed') { remove(p); continue; }
      p.erased = true;
      for (const x of p.parts) if (x.id) { cur.hidden.add(x.id); enqueueDelete(x.id); }
    }
    if (changed) { schedule(); renderBar(); }
  }

  // ---------- 포인터 ----------
  function localXY(e) {
    const r = temp.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top];
  }
  function addPoint(e) {
    const [sx, sy] = localXY(e);
    if (drawing.pts.length && Math.hypot(sx - drawing.lastSx, sy - drawing.lastSy) < 1) return; // 1px 미만 건너뜀
    const [x, y] = toPage(drawing.vp, sx, sy);
    const p = e.pointerType === 'pen' ? Math.max(0.05, e.pressure || 0.5) : 0.5;
    drawing.pts.push(...quantize(x, y, p));
    drawing.lastSx = sx; drawing.lastSy = sy;
  }
  function onDown(e) {
    if (tool.mode !== 'pen') return;
    if (e.pointerType === 'pen') penSeen = true;
    if (e.pointerType === 'touch' && penSeen) return;   // 손바닥 무시
    if (e.button > 0 && e.pointerType === 'mouse') return;
    if (drawing || erasing) { cancelDrawing(); return; } // 두 번째 손가락 = 2팀 손짓
    if (!e.isPrimary) return;
    if (!canDraw()) { if (locked()) ctx.toast(t('지금은 회의 담당자만 쓸 수 있어요'), 'warn'); return; }
    if (!vp || !pageKey || vp.pageKey !== pageKey) return;
    try { temp.setPointerCapture(e.pointerId); } catch { /* 없어도 됨 */ }
    if (tool.tool === 'eraser') {
      erasing = { pointerId: e.pointerId };
      const [sx, sy] = localXY(e);
      eraserAt = [sx, sy]; eraseAt(sx, sy); schedule(false);
      return;
    }
    // 획을 시작할 때 쪽·epoch·화면 배율을 고정(획 중 쪽이 바뀌어도 원래 쪽에 저장)
    drawing = { pointerId: e.pointerId, vp: { ...vp }, pageKey, epoch: cur.epochKnown ? cur.epoch : null, tool: tool.tool, color: tool.color, w: tool.w, pts: [], lastSx: 0, lastSy: 0 };
    addPoint(e);
    schedule(false);
  }
  function onMove(e) {
    if (erasing && e.pointerId === erasing.pointerId) {
      const evs = e.getCoalescedEvents?.() || [e];
      for (const ev of (evs.length ? evs : [e])) { const [sx, sy] = localXY(ev); eraseAt(sx, sy); }
      eraserAt = localXY(e); schedule(false);
      return;
    }
    if (!drawing || e.pointerId !== drawing.pointerId) {
      if (tool.mode === 'pen' && tool.tool === 'eraser' && e.pointerType === 'mouse') { eraserAt = localXY(e); schedule(false); }
      return;
    }
    const evs = e.getCoalescedEvents?.() || [];
    for (const ev of (evs.length ? evs : [e])) addPoint(ev);
    schedule(false);
  }
  function onUp(e) {
    if (erasing && e.pointerId === erasing.pointerId) {
      erasing = null;
      if (e.pointerType !== 'mouse') eraserAt = null;
      schedule(false);
      return;
    }
    if (!drawing || e.pointerId !== drawing.pointerId) return;
    if (e.type === 'pointerup') addPoint(e);
    const d = drawing; drawing = null;
    schedule(false);
    if (e.type === 'pointercancel' || d.pts.length < 3) return;
    queueStroke(d);
  }
  function onLeave(e) { if (e.pointerType === 'mouse' && !erasing) { eraserAt = null; schedule(false); } }
  function cancelDrawing() {
    if (!drawing && !erasing) return;
    drawing = null; erasing = null; eraserAt = null;
    schedule(false);
  }
  on(temp, 'pointerdown', onDown);
  on(temp, 'pointermove', onMove);
  on(temp, 'pointerup', onUp);
  on(temp, 'pointercancel', onUp);
  on(temp, 'pointerleave', onLeave);
  on(temp, 'contextmenu', e => { if (tool.mode === 'pen') e.preventDefault(); });

  // ---------- 도구 막대 ----------
  const icon = (name) => { const i = document.createElement('img'); i.className = 'zz-icon'; i.src = ctx.assets(name); i.alt = ''; return i; };
  const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
  const wrap = el('div', 'zd-bar');
  wrap.setAttribute('role', 'toolbar');
  wrap.setAttribute('aria-label', t('판서 도구'));

  // EASY_UX B5: 「보기 / 펜 모드」 둘 대신 단추 하나. 누르면 펜 도구가 펼쳐지고 글자가 「펜 끄기」로 바뀐다.
  const btnPen = el('button', 'zd-pen-toggle');
  btnPen.type = 'button';
  const penLabel = el('span', 'zd-pen-label', t('펜으로 쓰기'));
  btnPen.append(icon('icon-pen'), penLabel);

  const tools = el('div', 'zd-tools');
  const toolBtns = {};
  for (const [k, label, ic] of [['hl', '형광펜', 'icon-highlighter'], ['pen', '펜', 'icon-pen'], ['eraser', '지우개', 'icon-eraser']]) {
    const b = el('button', 'zd-tool'); b.type = 'button'; b.dataset.tool = k;
    b.append(icon(ic), el('span', 'zd-tool-label', t(label)));
    b.addEventListener('click', () => { tool.tool = k; fixColor(); publishTool(); renderBar(); });
    toolBtns[k] = b; tools.append(b);
  }
  const colors = el('div', 'zd-colors');
  const clearBtn = el('button', 'zd-clear', null); clearBtn.type = 'button';
  clearBtn.append(el('span', 'zd-clear-mark'), el('span', 'zd-tool-label', t('이 쪽 글씨 모두 지우기')));
  const retry = el('div', 'zd-retry'); retry.setAttribute('role', 'status');
  const retryText = el('span', 'zd-retry-text');
  const retryBtn = el('button', 'zd-retry-btn', t('다시 보내기')); retryBtn.type = 'button';
  retry.append(retryText, retryBtn);
  const note = el('span', 'zd-note'); note.setAttribute('role', 'status');
  wrap.append(btnPen, tools, colors, clearBtn, retry, note);
  bar.replaceChildren(wrap);
  // 막대가 무대(#zz-center) 너비를 넘지 않게: 좁으면 줄바꿈 대신 가로로 밀어 봄. 다른 자리는 크기만 읽는다.
  const center = bar.offsetParent || bar.parentElement;
  const fit = () => { const w = center?.clientWidth || 0; if (w) wrap.style.setProperty('--zd-bar-max', Math.max(120, w - 24) + 'px'); };
  const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(fit) : null;
  if (ro && center) { ro.observe(center); offs.push(() => ro.disconnect()); }
  fit();

  btnPen.addEventListener('click', () => setMode(tool.mode === 'pen' ? 'view' : 'pen'));
  // 무대 오른쪽 아래, 쪽 막대 바로 위에 둔다(위쪽 「지금 상태」 띠와 왼쪽 위 「오늘의 안건 펼치기」를 가리지 않게).
  // 자리 #zz-toolbar 의 아래 여백만 쪽 막대 높이로 맞춘다(쪽 막대 크기는 읽기만).
  const pagebar = document.getElementById('zz-pagebar');
  const below = () => { bar.style.setProperty('--zd-below', ((pagebar && pagebar.offsetHeight) || 0) + 'px'); };
  const ro2 = typeof ResizeObserver === 'function' && pagebar ? new ResizeObserver(below) : null;
  if (ro2) { ro2.observe(pagebar); offs.push(() => ro2.disconnect()); }
  below();
  retryBtn.addEventListener('click', retryFailed);
  clearBtn.addEventListener('click', confirmClear);

  function setMode(m) {
    if (m === 'pen' && !canDraw()) {
      ctx.toast(locked() ? t('지금은 회의 담당자만 쓸 수 있어요') : t('지금은 판서할 수 없어요'), 'warn');
      return;
    }
    tool.mode = m;
    if (m === 'view') cancelDrawing();
    eraserAt = null; schedule(false);
    publishTool(); renderBar();
  }
  function renderBar() {
    const pen = tool.mode === 'pen';
    btnPen.setAttribute('aria-pressed', String(pen));
    penLabel.textContent = pen ? t('펜 끄기') : t('펜으로 쓰기');
    // 회의 시작 전(담당자는 미리 쓸 수 있음)과 판서 잠금, 끝난 회의에는 단추를 숨긴다
    const st = meeting().status;
    btnPen.hidden = !canDraw() || (st === 'ready' && !isHost());
    tools.hidden = !pen;
    for (const [k, b] of Object.entries(toolBtns)) b.setAttribute('aria-pressed', String(tool.tool === k));
    // 색
    colors.hidden = !pen || tool.tool === 'eraser';
    if (!colors.hidden) {
      colors.replaceChildren(...COLORS[tool.tool].map(c => {
        const b = el('button', 'zd-swatch'); b.type = 'button';
        b.setAttribute('aria-label', t(c.label)); b.title = t(c.label);
        b.setAttribute('aria-pressed', String(tool.color === c.hex));
        const dot = el('span', 'zd-dot' + (tool.tool === 'hl' ? ' is-hl' : '')); dot.style.background = `var(${c.v})`;
        b.append(dot);
        b.addEventListener('click', () => { tool.color = c.hex; tool.last[tool.tool] = c.hex; publishTool(); renderBar(); });
        return b;
      }));
    }
    clearBtn.hidden = !(pen && isHost() && pageKey && statusOk());
    const failed = pending.filter(p => p.status === 'failed').length;
    retry.hidden = !failed;
    retryText.textContent = t('선 {n}개를 보내지 못했어요', { n: failed });
    const s = meeting().status;
    note.hidden = !(locked() || s === 'ended');
    note.textContent = s === 'ended' ? t('끝난 회의라 판서할 수 없어요') : t('지금은 회의 담당자만 쓸 수 있어요');
    wrap.hidden = btnPen.hidden && note.hidden && retry.hidden;
    wrap.classList.toggle('is-pen', pen);
  }
  function confirmClear() {
    if (!pageKey) return;
    const key = pageKey;
    const body = el('p', 'zd-modal-text', t('이 쪽에 그린 선을 모두 지울까요? 모든 사람 화면에서 지워져요.'));
    const m = ctx.modal({
      title: t('이 쪽 글씨 모두 지우기'), body,
      actions: [
        { label: t('취소'), onClick: () => m.close() },
        { label: t('모두 지우기'), primary: true, onClick: async () => {
          m.close();
          try {
            const r = await api.clearPage(mid, key);
            const en = pages.get(key); if (en && Number.isFinite(Number(r?.epoch))) { en.epoch = Number(r.epoch); en.epochKnown = true; dropStale(en); schedule(); }
            ctx.toast(t('쪽을 지웠어요'), 'ok');
          } catch (e) { ctx.toast(e?.message || t('쪽을 지우지 못했어요'), 'error'); }
        } },
      ],
    });
  }

  // ---------- store 구독 ----------
  offs.push(store.on('viewport', v => {
    vp = v || null;
    if (vp?.pageKey && vp.pageKey !== pageKey) setPage(vp.pageKey);
    schedule(); schedule(false);
  }));
  offs.push(store.on('page', p => { if (p?.pageKey && p.pageKey !== pageKey) setPage(p.pageKey); renderBar(); }));
  offs.push(store.on('gesture', () => cancelDrawing()));          // 두 손가락 시작: 그리던 획 버림
  offs.push(store.on('cmd:redraw', () => { schedule(); schedule(false); }));
  const onRule = () => {
    if (tool.mode === 'pen' && !canDraw()) {
      tool.mode = 'view'; cancelDrawing(); publishTool();
      if (locked()) ctx.toast(t('지금은 회의 담당자만 쓸 수 있어요'), 'warn');
    }
    renderBar();
  };
  offs.push(store.on('meeting', onRule));
  offs.push(store.on('role', onRule));
  // 연결이 돌아오면 실패한 선을 한 번 다시 보냄
  offs.push(store.on('conn', (c, prev) => {
    if (c?.server === 'ok' && prev?.server && prev.server !== 'ok' && pending.some(p => p.status === 'failed')) retryFailed();
  }));

  publishTool();
  if (pageKey) setPage(pageKey); else schedule();
  renderBar();

  return {
    unmount() {
      offs.splice(0).forEach(f => { try { f(); } catch { /* 무시 */ } });
      dead = true;
      for (const en of pages.values()) closePage(en);
      for (const en of lingering.values()) closePage(en);
      lingering.clear();
      pages.clear();
      clearTimeout(sendTimer); clearTimeout(delTimer);
      if (raf) cancelAnimationFrame(raf);
      tctx.setTransform(1, 0, 0, 1, 0, 0); tctx.clearRect(0, 0, temp.width, temp.height);
      ictx.setTransform(1, 0, 0, 1, 0, 0); ictx.clearRect(0, 0, ink.width, ink.height);
      bar.replaceChildren();
    },
  };
}
