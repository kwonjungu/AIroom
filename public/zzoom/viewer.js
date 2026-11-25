// 쭘 보기·따라가기 (디자인 2팀). 자리: #zz-agenda, #zz-follow-bar, #zz-stage(+#zz-layer-bg, #zz-stage-overlay), #zz-pagebar 안 내 칸.
// 약속: docs/meeting-2026-11-25/CONTRACTS.md (특히 3절 store, 4절 viewport 좌표식·손짓 나눔).
export const css = 'viewer.css';

export const BOARD_W = 1600, BOARD_H = 1000;
export const Z_MIN = 1, Z_MAX = 6;
const LIVE_BATCH_MS = 300;   // 진행자 live 묶음 간격
const PAGE_EMIT_MS = 250;    // 확대·이동이 멈춘 뒤 store page 를 낼 때까지
const TAP_MS = 300, SWIPE_PX = 60;

// ================= 순수 계산 (단위 시험 대상, DOM 없음) =================
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const num = (v, d) => (Number.isFinite(+v) ? +v : d);

/** 안건 쪽 크기(쪽 그림 px). sizes 는 [{w,h}] 또는 [[w,h]] 둘 다 받는다. 모르면 null. */
export function pageSize(agenda, page) {
  if (!agenda) return null;
  if (agenda.kind === 'board') return { w: BOARD_W, h: BOARD_H };
  const s = Array.isArray(agenda.sizes) ? agenda.sizes[page - 1] : null;
  if (!s) return null;
  const w = Array.isArray(s) ? s[0] : s.w, h = Array.isArray(s) ? s[1] : s.h;
  return w > 0 && h > 0 ? { w: +w, h: +h } : null;
}

/** 쪽 맞춤 배율(쪽 px → 화면 CSS px). pad 는 무대 가장자리 여백. */
export function fitScale(g) {
  const pad = g.pad ?? 16;
  const aw = Math.max(1, g.stageW - pad * 2), ah = Math.max(1, g.stageH - pad * 2);
  return Math.max(1e-6, Math.min(aw / g.pageW, ah / g.pageH));
}

/** 이 기기 비율에 맞춰 view 를 고친다: z 1~6, 쪽이 화면보다 작으면 가운데, 크면 가장자리 밖으로 못 나가게. */
export function clampView(v, g) {
  const z = clamp(num(v?.z, 1), Z_MIN, Z_MAX);
  const s = fitScale(g) * z;
  const dw = g.pageW * s, dh = g.pageH * s;
  const axis = (c, disp, stage) => {
    if (disp <= stage + 0.5) return 0.5;
    const half = stage / (2 * disp);
    return clamp(num(c, 0.5), half, 1 - half);
  };
  return { cx: axis(v?.cx, dw, g.stageW), cy: axis(v?.cy, dh, g.stageH), z };
}

/** view → 화면 배치. 약속 4절: 쪽 비율 (x,y) → 화면 CSS px = (ox + x*pageW*scale, oy + y*pageH*scale). */
export function layout(v, g) {
  const scale = fitScale(g) * v.z;
  return { scale, ox: g.stageW / 2 - v.cx * g.pageW * scale, oy: g.stageH / 2 - v.cy * g.pageH * scale };
}

export function screenToPage(sx, sy, v, g) {
  const L = layout(v, g);
  return { x: (sx - L.ox) / (g.pageW * L.scale), y: (sy - L.oy) / (g.pageH * L.scale) };
}

/** (sx,sy) 아래 쪽 점이 그 자리에 머물도록 배율을 z 로 바꾼다. */
export function zoomAt(v, g, sx, sy, z) {
  const p = screenToPage(sx, sy, v, g);
  return anchorView(g, p, sx, sy, z);
}

/** 쪽 점 p 가 화면 (sx,sy) 에 오도록 하는 view (손가락 두 개 확대에 씀). */
export function anchorView(g, p, sx, sy, z) {
  z = clamp(z, Z_MIN, Z_MAX);
  const scale = fitScale(g) * z;
  const ox = sx - p.x * g.pageW * scale, oy = sy - p.y * g.pageH * scale;
  return clampView({ cx: (g.stageW / 2 - ox) / (g.pageW * scale), cy: (g.stageH / 2 - oy) / (g.pageH * scale), z }, g);
}

export function panBy(v, g, dx, dy) {
  const s = fitScale(g) * v.z;
  return clampView({ cx: v.cx - dx / (g.pageW * s), cy: v.cy - dy / (g.pageH * s), z: v.z }, g);
}

export function roundView(v) {
  const r = (x, n) => Math.round(x * n) / n;
  return { cx: r(v.cx, 1e4), cy: r(v.cy, 1e4), z: r(v.z, 1e3) };
}

export function sameView(a, b, eps = 1e-3) {
  if (!a || !b) return a === b;
  return Math.abs(a.cx - b.cx) < eps && Math.abs(a.cy - b.cy) < eps && Math.abs(a.z - b.z) < eps;
}

/** 다음·이전 쪽(안건 경계를 넘어감). 없으면 null. */
export function stepPage(agenda, aid, page, dir) {
  const i = agenda.findIndex(a => a.aid === aid);
  if (i < 0) return null;
  const pages = Math.max(1, agenda[i].pages | 0);
  if (dir > 0) {
    if (page < pages) return { aid, page: page + 1 };
    return i + 1 < agenda.length ? { aid: agenda[i + 1].aid, page: 1 } : null;
  }
  if (page > 1) return { aid, page: page - 1 };
  return i > 0 ? { aid: agenda[i - 1].aid, page: Math.max(1, agenda[i - 1].pages | 0) } : null;
}

// ================= 화면 =================
function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (v === true) el.setAttribute(k, '');
    else el.setAttribute(k, v);
  }
  for (const k of kids.flat()) if (k != null && k !== false) el.append(k.nodeType ? k : document.createTextNode(String(k)));
  return el;
}

export function mount(ctx) {
  const { api, store } = ctx;
  const t = ctx.t || (s => s);
  const mid = ctx.mid;
  const elAgenda = ctx.el('zz-agenda');
  const elBar = ctx.el('zz-follow-bar');
  const elStage = ctx.el('zz-stage');
  const cvBg = ctx.el('zz-layer-bg');
  const elOverlay = ctx.el('zz-stage-overlay');
  const elPagebar = ctx.el('zz-pagebar');
  const otherCanvases = ['zz-layer-ink', 'zz-layer-temp'].map(id => { try { return ctx.el(id); } catch { return null; } }).filter(Boolean);
  const g2d = cvBg.getContext('2d');

  const offs = [];          // 풀 것들
  const timers = new Set();
  const later = (fn, ms) => { const id = setTimeout(() => { timers.delete(id); fn(); }, ms); timers.add(id); return id; };
  const cancel = id => { if (id) { clearTimeout(id); timers.delete(id); } };
  const listen = (target, type, fn, opt) => { target.addEventListener(type, fn, opt); offs.push(() => target.removeEventListener(type, fn, opt)); };
  let dead = false;

  // ---- 상태 ----
  const S = {
    agenda: store.get('agenda') || [],
    live: store.get('live') || null,
    role: store.get('role') || null,
    meeting: store.get('meeting') || null,
    tool: store.get('tool') || { mode: 'view' },
    aid: null, page: 1,
    view: { cx: 0.5, cy: 0.5, z: 1 },
    follow: 'follow',
    lastForce: null,          // 처음 본 live 의 forceSeq (옛 force 는 재생하지 않음)
    stageW: 0, stageH: 0, dpr: 1,
    natural: null,            // 쪽 그림의 실제 크기(sizes 가 없을 때)
    img: null, imgFor: null,  // 지금 그리는 그림과 그 키
    load: 'idle',             // idle | loading | ok | error | none
    loadSeq: 0,
    lastPageOf: new Map(),    // 안건마다 마지막 본 쪽
    boardPaint: undefined,    // board.js 의 paintBoardBackground (undefined=아직, null=없음)
  };
  const P = { timer: null, inflight: false, dirty: false, force: false, lastSent: null, lost: false, fails: 0 };
  const cache = new Map();    // key → {url, img, promise} (지금 쪽과 다음 쪽만)
  const thumbUrls = new Map(); // key → url (지금 안건 썸네일)

  const findA = aid => S.agenda.find(a => a.aid === aid) || null;
  const idxA = aid => S.agenda.findIndex(a => a.aid === aid);
  const curA = () => findA(S.aid);
  const pagesOf = a => Math.max(1, (a?.pages | 0) || 1);
  const pageKey = () => (S.aid ? `${S.aid}_${S.page}` : null);
  const imgKey = (a, p) => `${a.aid}:${a.ver ?? 0}:${p}`;
  const isPresenter = () => {
    const r = S.role;
    if (!r || r.role !== 'host' || P.lost) return false;
    const pc = S.meeting?.presenter?.cid;
    return pc ? pc === r.cid : !!r.presenter;
  };
  const meetingLive = () => S.meeting?.status === 'live';
  const geo = () => {
    const sz = pageSize(curA(), S.page) || S.natural || { w: BOARD_W, h: BOARD_H };
    return { stageW: S.stageW || 1, stageH: S.stageH || 1, pageW: sz.w, pageH: sz.h, pad: S.stageW < 600 ? 8 : 16 };
  };

  // ---- 내 DOM ----
  elStage.classList.add('zv-stage');
  elStage.setAttribute('aria-label', t('문서 화면'));
  const agendaBox = h('div', { class: 'zv-agenda' });
  elAgenda.replaceChildren(agendaBox);
  const barBox = h('div', { class: 'zv-follow' });
  elBar.replaceChildren();
  const ovBox = h('div', { class: 'zv-overlay' });
  elOverlay.replaceChildren(ovBox);

  // 쪽 막대: 다른 팀 칸(#zz-board-actions, #zz-quick-hand)은 그대로 두고 맨 앞에 내 칸만 넣는다.
  const btnList = h('button', { type: 'button', class: 'zz-btn ghost zv-only-narrow zv-list-btn', 'aria-expanded': 'false', onclick: toggleDrawer }, t('안건'));
  const btnPrev = h('button', { type: 'button', class: 'zz-btn zv-step', onclick: () => step(-1), 'aria-label': t('이전 쪽') }, t('이전'));
  const btnNext = h('button', { type: 'button', class: 'zz-btn zv-step', onclick: () => step(1), 'aria-label': t('다음 쪽') }, t('다음'));
  const pageNo = h('span', { class: 'zv-pageno zz-num', 'aria-live': 'polite' });
  const btnFit = h('button', { type: 'button', class: 'zz-btn ghost zv-fit', onclick: fitPage }, t('쪽 맞춤'));
  const zoomNo = h('span', { class: 'zv-zoom zz-num', 'aria-hidden': 'true' });
  const pager = h('div', { class: 'zv-pager' }, btnList, btnPrev, pageNo, btnNext, btnFit, zoomNo);
  elPagebar.prepend(pager);

  // ================= 그리기 =================
  let rafId = 0;
  let lastVp = null;
  function requestRender() {
    if (rafId || dead) return;
    rafId = requestAnimationFrame(() => { rafId = 0; render(); });
  }
  function cssVar(name, d) {
    try { return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || d; } catch { return d; }
  }
  function render() {
    if (dead) return;
    const g = geo();
    S.view = clampView(S.view, g);
    const L = layout(S.view, g);
    const { dpr } = S;
    g2d.setTransform(1, 0, 0, 1, 0, 0);
    g2d.clearRect(0, 0, cvBg.width, cvBg.height);
    const a = curA();
    if (a) {
      g2d.setTransform(dpr, 0, 0, dpr, 0, 0);
      const rect = { x: L.ox, y: L.oy, w: g.pageW * L.scale, h: g.pageH * L.scale };
      if (a.kind === 'board') {
        paintBoard(rect, a.bg || 'white');
      } else {
        g2d.fillStyle = cssVar('--zz-surface', '#ffffff');
        g2d.fillRect(rect.x, rect.y, rect.w, rect.h);
        if (S.img && S.imgFor === imgKey(a, S.page)) {
          g2d.imageSmoothingEnabled = true;
          g2d.imageSmoothingQuality = 'high';
          g2d.drawImage(S.img, rect.x, rect.y, rect.w, rect.h);
        }
      }
    }
    emitViewport(g, L);
    paintPager();
  }
  function paintBoard(rect, bg) {
    if (typeof S.boardPaint === 'function') {
      try { S.boardPaint(g2d, rect, bg); return; } catch (e) { console.warn('[viewer] paintBoardBackground', e); }
    }
    g2d.fillStyle = '#ffffff';
    g2d.fillRect(rect.x, rect.y, rect.w, rect.h);
    if (S.boardPaint === undefined) {
      S.boardPaint = null; // 한 번만 부른다
      import(new URL('./board.js', import.meta.url).href)
        .then(m => { if (typeof m.paintBoardBackground === 'function') { S.boardPaint = m.paintBoardBackground; requestRender(); } })
        .catch(() => { /* 없으면 흰 바탕 */ });
    }
  }
  function emitViewport(g, L) {
    const vp = {
      aid: S.aid, page: S.page, pageKey: pageKey(), pageW: g.pageW, pageH: g.pageH,
      scale: L.scale, ox: L.ox, oy: L.oy, dpr: S.dpr, stageW: S.stageW, stageH: S.stageH,
    };
    const same = lastVp && Object.keys(vp).every(k => (typeof vp[k] === 'number' ? Math.abs(vp[k] - lastVp[k]) < 1e-6 : vp[k] === lastVp[k]));
    if (same) return;
    lastVp = vp;
    store.set('viewport', vp);
  }

  // ---- 무대 크기 ----
  function measure() {
    const w = elStage.clientWidth, hgt = elStage.clientHeight;
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    if (w === S.stageW && hgt === S.stageH && dpr === S.dpr) return;
    S.stageW = w; S.stageH = hgt; S.dpr = dpr;
    const pw = Math.max(1, Math.round(w * dpr)), ph = Math.max(1, Math.round(hgt * dpr));
    for (const c of [cvBg, ...otherCanvases]) if (c.width !== pw || c.height !== ph) { c.width = pw; c.height = ph; }
    lastVp = null; // 3팀이 다시 그리게 viewport 를 꼭 낸다
    render();
  }
  if (typeof ResizeObserver === 'function') {
    const ro = new ResizeObserver(() => measure());
    ro.observe(elStage);
    offs.push(() => ro.disconnect());
  }
  listen(window, 'resize', measure);

  // ================= 쪽 그림 받기 =================
  // 요청 번호(loadSeq)로 늦게 온 옛 결과는 버린다. 캐시는 지금 쪽과 다음 쪽만 둔다.
  function fetchImage(a, p) {
    const key = imgKey(a, p);
    let c = cache.get(key);
    if (c) return c.promise;
    c = { url: null, img: null, promise: null };
    c.promise = Promise.resolve(api.pageImageUrl(a, p)).then(url => {
      if (!url) throw Object.assign(new Error('no_image'), { code: 'no_image' });
      c.url = url;
      return new Promise((res, rej) => {
        const im = new Image();
        im.decoding = 'async';
        im.onload = () => { c.img = im; res(im); };
        im.onerror = () => rej(Object.assign(new Error('decode'), { code: 'decode' }));
        im.src = url;
      });
    });
    c.promise.catch(() => { if (cache.get(key) === c) cache.delete(key); });
    cache.set(key, c);
    return c.promise;
  }
  function nextTarget() {
    const n = stepPage(S.agenda, S.aid, S.page, 1);
    if (!n) return null;
    const a = findA(n.aid);
    return a && a.kind !== 'board' ? { a, p: n.page } : null;
  }
  function trimCache() {
    const a = curA();
    const keep = new Set();
    if (a && a.kind !== 'board') keep.add(imgKey(a, S.page));
    const n = nextTarget();
    if (n) keep.add(imgKey(n.a, n.p));
    for (const k of [...cache.keys()]) if (!keep.has(k)) cache.delete(k);
    const urls = [...cache.values()].map(c => c.url).filter(Boolean).concat([...thumbUrls.values()]);
    try { api.releaseImages(urls); } catch { /* 없어도 됨 */ }
  }
  function loadCurrent() {
    const a = curA();
    const seq = ++S.loadSeq;
    S.natural = null;
    if (!a) { S.load = 'none'; S.img = null; S.imgFor = null; paintOverlay(); requestRender(); return; }
    if (a.kind === 'board') { S.load = 'ok'; S.img = null; S.imgFor = null; trimCache(); paintOverlay(); requestRender(); return; }
    const key = imgKey(a, S.page);
    if (S.imgFor === key && S.img) { S.load = 'ok'; paintOverlay(); requestRender(); return; }
    const c = cache.get(key);
    if (c?.img) { setImg(c.img, key); trimCache(); prefetchNext(); return; }
    S.load = 'loading'; S.img = null; S.imgFor = null;
    paintOverlay(); requestRender();
    fetchImage(a, S.page).then(im => {
      if (dead || seq !== S.loadSeq) return; // 늦은 결과 버림
      setImg(im, key);
      trimCache();
      prefetchNext();
    }, e => {
      if (dead || seq !== S.loadSeq) return;
      S.load = 'error';
      console.warn('[viewer] 쪽 그림', e?.code || e?.message || e);
      paintOverlay(); requestRender();
    });
  }
  function setImg(im, key) {
    S.img = im; S.imgFor = key; S.load = 'ok';
    if (!pageSize(curA(), S.page)) S.natural = { w: im.naturalWidth || BOARD_W, h: im.naturalHeight || BOARD_H };
    paintOverlay(); requestRender();
  }
  function prefetchNext() {
    const n = nextTarget();
    if (n) fetchImage(n.a, n.p).catch(() => {});
  }

  // ================= 쪽 이동 =================
  let pageEmitTimer = null;
  function emitPage(now) {
    cancel(pageEmitTimer); pageEmitTimer = null;
    const send = () => { if (!dead) store.set('page', { aid: S.aid, page: S.page, pageKey: pageKey(), view: roundView(S.view) }); };
    if (now) send(); else pageEmitTimer = later(send, PAGE_EMIT_MS);
  }
  /** 쪽과 view 를 정한다. 쪽이 바뀌면 그림을 새로 받는다. */
  function setTarget(aid, page, view) {
    const a = findA(aid) || S.agenda[0] || null;
    const p = a ? clamp(page | 0 || 1, 1, pagesOf(a)) : 1;
    const changed = (a?.aid || null) !== S.aid || p !== S.page;
    S.aid = a?.aid || null; S.page = p;
    if (a) S.lastPageOf.set(a.aid, p);
    if (view) S.view = { cx: num(view.cx, 0.5), cy: num(view.cy, 0.5), z: num(view.z, 1) };
    if (changed) {
      const agendaChanged = !lastAgendaAid || lastAgendaAid !== S.aid;
      loadCurrent();
      if (agendaChanged) renderAgenda(); else markAgenda();
      flashPageNo();
      emitPage(true);
    } else {
      emitPage(false);
    }
    paintPager();
    requestRender();
  }
  /** 사용자가 직접 바꿈: 진행자면 live 로 보내고, 참석자면 자유 보기로. */
  function userChanged() {
    if (isPresenter()) { queueLive(); return; }
    if (S.live?.aid && S.follow !== 'free') setFollow('free');
  }
  function userGo(aid, page) {
    const a = findA(aid);
    if (!a) return;
    const same = a.aid === S.aid && page === S.page;
    setTarget(a.aid, page, same ? S.view : { cx: 0.5, cy: 0.5, z: 1 });
    userChanged();
  }
  function step(dir) {
    const n = stepPage(S.agenda, S.aid, S.page, dir);
    if (n) userGo(n.aid, n.page);
  }
  function fitPage() {
    if (sameView(S.view, { cx: 0.5, cy: 0.5, z: 1 })) return;
    S.view = { cx: 0.5, cy: 0.5, z: 1 };
    requestRender(); emitPage(false); userChanged();
  }
  function setView(v) {
    const before = S.view;
    S.view = clampView(v, geo());
    if (sameView(before, S.view, 1e-5)) return false;
    requestRender(); emitPage(false); userChanged();
    return true;
  }

  // ================= 따라가기 =================
  function setFollow(mode) {
    if (S.follow === mode) return;
    S.follow = mode;
    store.set('follow', mode);
    paintBar(); paintOverlay();
  }
  function applyLive(live) {
    if (!live?.aid || !findA(live.aid)) return;
    setTarget(live.aid, live.page || 1, live.view || { cx: 0.5, cy: 0.5, z: 1 });
  }
  function onLive(live) {
    S.live = live || null;
    if (live && S.lastForce === null) S.lastForce = live.forceSeq || 0;
    if (!live) { paintBar(); paintOverlay(); markAgenda(); return; }
    if (isPresenter()) { presenterIncoming(live); markAgenda(); return; }
    const fs = live.forceSeq || 0;
    if (fs > S.lastForce) { S.lastForce = fs; if (S.follow !== 'follow') setFollow('follow'); }
    if (S.follow === 'follow') applyLive(live);
    paintBar(); paintOverlay(); markAgenda();
  }
  function backToPresenter() {
    setFollow('follow');
    if (S.live) applyLive(S.live);
  }

  // ---- 진행자: 300ms 묶어 보내기, 409 처리 ----
  function liveMatchesSent(live) {
    const s = P.lastSent;
    return !!s && live.aid === s.aid && live.page === s.page && sameView(live.view, s.view, 2e-3);
  }
  function presenterIncoming(live) {
    // 내가 보낸 것의 메아리면 그대로, 남(서버 시작·화이트보드 띄우기)이 바꾼 것이면 보내는 중이 아닐 때 맞춘다.
    if (liveMatchesSent(live)) return;
    if (P.inflight || P.timer) return; // 보내고 나서 서버 답(성공 또는 409 최신)으로 맞춘다
    if (live.aid !== S.aid || live.page !== S.page || !sameView(live.view, S.view, 2e-3)) applyLive(live);
  }
  function queueLive(force) {
    if (!isPresenter() || !meetingLive()) return;
    if (force) P.force = true;
    P.dirty = true;
    if (!P.timer) P.timer = later(() => { P.timer = null; flushLive(); }, force ? 0 : LIVE_BATCH_MS);
  }
  function dropLive() {
    cancel(P.timer); P.timer = null; P.dirty = false; P.force = false;
  }
  function flushLive() {
    if (dead) return;
    if (!isPresenter() || !meetingLive() || !S.aid) { dropLive(); return; }
    if (P.inflight) { P.dirty = true; return; }
    if (!P.dirty && !P.force) return;
    const force = P.force;
    P.force = false; P.dirty = false; P.inflight = true;
    const body = { aid: S.aid, page: S.page, view: roundView(S.view) };
    if (force) body.force = true;
    P.lastSent = body;
    Promise.resolve().then(() => api.sendLive(mid, body)).then(res => {
      P.fails = 0;
      const l = res?.live;
      if (l && S.lastForce !== null) S.lastForce = Math.max(S.lastForce, l.forceSeq || 0);
    }, e => {
      if (dead) return;
      const code = e?.code;
      if (e?.status === 409 && code === 'stale_rev') {
        const l = e.extra?.live;
        // 서버 최신이 내가 보낸 것과 같으면(메아리 순서 꼬임) 내 화면을 다시 보내고, 아니면 최신으로 맞춘다.
        if (l && liveMatchesSent(l)) { P.dirty = true; }
        else { dropLive(); if (l) applyLive(l); }
      } else if (e?.status === 409 && code === 'not_presenter') {
        dropLive();
        P.lost = true; // 역할·회의 문서가 바뀌면 다시 판단
        if (e.extra?.live) { S.live = e.extra.live; setFollow('follow'); applyLive(e.extra.live); }
        paintBar(); paintOverlay();
      } else if (e?.status === 409 || e?.status === 403 || e?.status === 410) {
        dropLive(); // 회의 상태가 바뀜(끝남 등). 화면은 store 로 따라온다
      } else if (++P.fails <= 3) {
        P.dirty = true; // 연결 문제: 조금 뒤 다시
        cancel(P.timer); P.timer = later(() => { P.timer = null; flushLive(); }, 800 * P.fails);
      } else {
        P.fails = 0;
        ctx.toast?.(t('진행 화면을 보내지 못했어요. 연결을 확인해 주세요.'), 'warn');
      }
    }).finally(() => {
      P.inflight = false;
      if (dead) return;
      if ((P.dirty || P.force) && !P.timer) P.timer = later(() => { P.timer = null; flushLive(); }, P.force ? 0 : LIVE_BATCH_MS);
    });
  }
  let wasPresenter = isPresenter();
  function rolesChanged() {
    const now = isPresenter();
    if (now === wasPresenter) { paintBar(); paintOverlay(); return; }
    wasPresenter = now;
    dropLive();
    setFollow('follow');
    if (S.live?.aid) applyLive(S.live); // 넘겨받을 때도, 내려갈 때도 지금 진행 화면에서 시작
    paintBar(); paintOverlay(); markAgenda();
  }

  // ================= 손짓 =================
  const ptrs = new Map();   // pointerId → {x, y, type}
  let gest = null;          // {kind:'pan', x, y, sx, sy, t, type, moved} | {kind:'pinch', p, z0, d0}
  let lastTap = null;
  const local = e => { const r = elStage.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  const penMode = () => S.tool?.mode === 'pen';
  const touchCount = () => [...ptrs.values()].filter(p => p.type === 'touch').length;
  function startPan(id) {
    const p = ptrs.get(id);
    gest = { kind: 'pan', id, x: p.x, y: p.y, sx: p.x, sy: p.y, t: performance.now(), type: p.type, moved: false };
  }
  function startPinch() {
    const [a, b] = [...ptrs.values()];
    const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    gest = { kind: 'pinch', p: screenToPage(mx, my, S.view, geo()), z0: S.view.z, d0: Math.max(10, Math.hypot(a.x - b.x, a.y - b.y)) };
    lastTap = null;
  }
  function onDown(e) {
    if (!curA()) return;
    const pos = local(e);
    if (penMode()) {
      // 펜 모드: 한 손가락은 3팀 몫. 손가락 두 개 이상(또는 마우스 가운데 단추)만 내가 받는다.
      if (e.pointerType === 'touch') {
        ptrs.set(e.pointerId, { ...pos, type: 'touch' });
        if (touchCount() >= 2 && gest?.kind !== 'pinch') {
          for (const [id, p] of ptrs) if (p.type !== 'touch') ptrs.delete(id);
          store.emit('gesture', 'multi');
          startPinch();
        }
      } else if (e.pointerType === 'mouse' && e.button === 1) {
        e.preventDefault();
        ptrs.set(e.pointerId, { ...pos, type: 'mouse' });
        try { elStage.setPointerCapture(e.pointerId); } catch { /* 없음 */ }
        startPan(e.pointerId);
      }
      return;
    }
    if (e.pointerType === 'mouse' && e.button !== 0 && e.button !== 1) return;
    e.preventDefault();
    ptrs.set(e.pointerId, { ...pos, type: e.pointerType });
    try { elStage.setPointerCapture(e.pointerId); } catch { /* 없음 */ }
    if (ptrs.size === 1) startPan(e.pointerId);
    else if (ptrs.size === 2) startPinch();
  }
  function onMove(e) {
    const p = ptrs.get(e.pointerId);
    if (!p) return;
    const pos = local(e);
    p.x = pos.x; p.y = pos.y;
    if (!gest) return;
    if (gest.kind === 'pan' && gest.id === e.pointerId) {
      const dx = pos.x - gest.x, dy = pos.y - gest.y;
      gest.x = pos.x; gest.y = pos.y;
      if (Math.hypot(pos.x - gest.sx, pos.y - gest.sy) > 6) gest.moved = true;
      if (dx || dy) setView(panBy(S.view, geo(), dx, dy));
    } else if (gest.kind === 'pinch' && ptrs.size >= 2) {
      const [a, b] = [...ptrs.values()];
      const d = Math.max(10, Math.hypot(a.x - b.x, a.y - b.y));
      setView(anchorView(geo(), gest.p, (a.x + b.x) / 2, (a.y + b.y) / 2, gest.z0 * d / gest.d0));
    }
  }
  function onUp(e) {
    if (!ptrs.has(e.pointerId)) return;
    const p = ptrs.get(e.pointerId);
    ptrs.delete(e.pointerId);
    if (!gest) return;
    if (gest.kind === 'pinch') {
      if (ptrs.size >= 2) startPinch();
      else if (ptrs.size === 1 && !penMode()) startPan([...ptrs.keys()][0]);
      else gest = null;
      return;
    }
    if (gest.kind === 'pan' && gest.id === e.pointerId) {
      const g0 = gest;
      gest = null;
      if (e.type === 'pointercancel') return;
      const dt = performance.now() - g0.t, dx = p.x - g0.sx, dy = p.y - g0.sy;
      // 쪽 맞춤 상태에서 빠르게 옆으로 밀면 쪽 넘기기(손가락·펜)
      if (g0.type !== 'mouse' && S.view.z <= 1.01 && dt < 600 && Math.abs(dx) > SWIPE_PX && Math.abs(dx) > Math.abs(dy) * 1.5) {
        step(dx < 0 ? 1 : -1);
        lastTap = null;
        return;
      }
      if (!g0.moved && dt < TAP_MS) {
        const now = performance.now();
        if (lastTap && now - lastTap.t < TAP_MS && Math.hypot(p.x - lastTap.x, p.y - lastTap.y) < 30) {
          lastTap = null;
          if (S.view.z > 1.05) fitPage(); else setView(zoomAt(S.view, geo(), p.x, p.y, 2.5));
        } else lastTap = { t: now, x: p.x, y: p.y };
      }
    }
  }
  function onWheel(e) {
    if (!curA()) return;
    e.preventDefault();
    const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1;
    const k = e.ctrlKey ? 0.01 : 0.0015; // ctrl+휠 = 터치패드 오므리기
    const pos = local(e);
    setView(zoomAt(S.view, geo(), pos.x, pos.y, S.view.z * Math.exp(-e.deltaY * unit * k)));
  }
  listen(elStage, 'pointerdown', onDown);
  listen(elStage, 'pointermove', onMove);
  listen(elStage, 'pointerup', onUp);
  listen(elStage, 'pointercancel', onUp);
  listen(elStage, 'wheel', onWheel, { passive: false });
  listen(elStage, 'contextmenu', e => { if (!penMode()) e.preventDefault(); });

  // ---- 자판 ----
  listen(document, 'keydown', e => {
    if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return;
    const tg = e.target;
    if (tg && (tg.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(tg.tagName) || tg.closest?.('[role="dialog"], .zz-modal'))) return;
    if (!curA()) return;
    const k = e.key;
    if (k === 'ArrowRight' || k === 'PageDown') { step(1); e.preventDefault(); }
    else if (k === 'ArrowLeft' || k === 'PageUp') { step(-1); e.preventDefault(); }
    else if (k === '0') { fitPage(); }
    else if (k === '+' || k === '=') { setView(zoomAt(S.view, geo(), S.stageW / 2, S.stageH / 2, S.view.z * 1.25)); }
    else if (k === '-') { setView(zoomAt(S.view, geo(), S.stageW / 2, S.stageH / 2, S.view.z / 1.25)); }
    else if (k === 'Escape' && elAgenda.hasAttribute('data-open')) { closeDrawer(); }
  });

  // ================= 안건 목록 =================
  let lastAgendaAid = null;
  let thumbIO = null;
  function agendaNo(aid) { return idxA(aid) + 1; }
  function renderAgenda() {
    lastAgendaAid = S.aid;
    thumbIO?.disconnect();
    thumbIO = typeof IntersectionObserver === 'function'
      ? new IntersectionObserver(ents => { for (const en of ents) if (en.isIntersecting) { thumbIO.unobserve(en.target); loadThumb(en.target); } }, { root: elAgenda, rootMargin: '200px' })
      : null;
    // 지금 안건이 아닌 썸네일은 놓아 준다
    for (const k of [...thumbUrls.keys()]) if (!S.aid || !k.startsWith(S.aid + ':')) thumbUrls.delete(k);

    const head = h('div', { class: 'zv-agenda-head' },
      h('h2', null, t('안건')),
      h('span', { class: 'zv-agenda-count zz-num' }, S.agenda.length ? String(S.agenda.length) : ''),
      h('button', { type: 'button', class: 'zz-btn ghost zv-only-narrow zv-close', onclick: closeDrawer }, t('닫기')));
    if (!S.agenda.length) {
      agendaBox.replaceChildren(head, h('div', { class: 'zz-empty zv-agenda-empty' },
        h('img', { src: ctx.assets('empty-agenda'), alt: '' }), h('p', null, t('아직 올린 안건이 없어요'))));
      markAgenda();
      return;
    }
    const list = h('ol', { class: 'zv-agenda-list' });
    S.agenda.forEach((a, i) => {
      const cur = a.aid === S.aid;
      const meta = a.kind === 'board' ? t('화이트보드 {n}쪽', { n: pagesOf(a) }) : t('{n}쪽', { n: pagesOf(a) });
      const item = h('button', { type: 'button', class: 'zv-agenda-item', 'data-aid': a.aid, onclick: () => { userGo(a.aid, S.lastPageOf.get(a.aid) || 1); maybeCloseDrawer(); } },
        h('span', { class: 'zv-agenda-no zz-num' }, String(i + 1)),
        h('span', { class: 'zv-agenda-text' },
          h('span', { class: 'zv-agenda-title' }, a.title || t('안건 {n}', { n: i + 1 })),
          h('span', { class: 'zv-agenda-meta' }, meta)),
        h('span', { class: 'zz-chip live zv-live-chip', hidden: true }, h('span', { class: 'zz-live-dot' }), t('진행')));
      const li = h('li', { class: 'zv-agenda-li' }, item);
      if (cur) {
        li.append(renderThumbs(a));
        if (a.original?.path) li.append(h('button', { type: 'button', class: 'zz-btn ghost zv-orig', onclick: () => downloadOriginal(a) }, t('원본 받기')));
      }
      list.append(li);
    });
    agendaBox.replaceChildren(head, list);
    markAgenda();
  }
  function renderThumbs(a) {
    const box = h('div', { class: 'zv-thumbs' + (a.kind === 'board' ? ' is-board' : '') });
    const n = pagesOf(a);
    for (let p = 1; p <= n; p++) {
      const sz = pageSize(a, p);
      const ratio = sz ? `${sz.w} / ${sz.h}` : '3 / 4';
      const fig = h('span', { class: 'zv-thumb-fig', style: `aspect-ratio:${ratio}` });
      const b = h('button', { type: 'button', class: 'zv-thumb', 'data-page': String(p), 'aria-label': t('{n}쪽', { n: p }), onclick: () => { userGo(a.aid, p); maybeCloseDrawer(); } },
        fig, h('span', { class: 'zv-thumb-no zz-num' }, String(p)));
      if (a.kind !== 'board') {
        const k = imgKey(a, p);
        if (thumbUrls.has(k)) fig.append(h('img', { src: thumbUrls.get(k), alt: '' }));
        else if (thumbIO) { b.dataset.aid = a.aid; thumbIO.observe(b); }
        else loadThumb(b, a);
      }
      box.append(b);
    }
    return box;
  }
  function loadThumb(btn, a0) {
    const a = a0 || findA(btn.dataset.aid);
    const p = +btn.dataset.page;
    if (!a) return;
    const k = imgKey(a, p);
    Promise.resolve(api.pageImageUrl(a, p, { thumb: true })).then(url => {
      if (dead || !url || a.aid !== S.aid) return;
      thumbUrls.set(k, url);
      const fig = btn.querySelector('.zv-thumb-fig');
      if (fig && !fig.firstChild) fig.append(h('img', { src: url, alt: '' }));
    }).catch(() => { /* 썸네일 없으면 번호만 */ });
  }
  function markAgenda() {
    if (!agendaBox.isConnected) return;
    for (const b of agendaBox.querySelectorAll('.zv-agenda-item')) {
      const cur = b.dataset.aid === S.aid;
      b.classList.toggle('is-current', cur);
      if (cur) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current');
      const chip = b.querySelector('.zv-live-chip');
      if (chip) chip.hidden = !(S.live?.aid === b.dataset.aid && meetingLive());
    }
    for (const b of agendaBox.querySelectorAll('.zv-thumb')) {
      const p = +b.dataset.page;
      const cur = p === S.page;
      b.classList.toggle('is-current', cur);
      if (cur) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
      b.classList.toggle('is-live', meetingLive() && S.live?.aid === S.aid && S.live?.page === p);
    }
    const curThumb = agendaBox.querySelector('.zv-thumb.is-current');
    if (curThumb && elAgenda.scrollHeight > elAgenda.clientHeight) {
      const r = curThumb.getBoundingClientRect(), box = elAgenda.getBoundingClientRect();
      if (r.top < box.top || r.bottom > box.bottom) elAgenda.scrollTop += (r.top - box.top) - (box.height - r.height) / 2;
    }
  }
  async function downloadOriginal(a) {
    try {
      const blob = await api.originalBlob(a);
      if (!blob) { ctx.toast?.(t('원본 파일이 없어요.'), 'info'); return; }
      const url = URL.createObjectURL(blob);
      const link = h('a', { href: url, download: a.original?.name || a.title || 'original' });
      document.body.append(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 30000);
    } catch (e) {
      ctx.toast?.(e?.message || t('원본을 받지 못했어요.'), 'error');
    }
  }
  // 좁은 화면: #zz-agenda 에 data-open 을 붙이면 왼쪽 덮개로 열린다(zzoom.css).
  const narrow = () => window.matchMedia?.('(max-width: 767.98px)').matches;
  function toggleDrawer() { if (elAgenda.hasAttribute('data-open')) closeDrawer(); else openDrawer(); }
  function openDrawer() { elAgenda.setAttribute('data-open', ''); btnList.setAttribute('aria-expanded', 'true'); markAgenda(); }
  function closeDrawer() { elAgenda.removeAttribute('data-open'); btnList.setAttribute('aria-expanded', 'false'); }
  function maybeCloseDrawer() { if (narrow()) closeDrawer(); }
  listen(elStage, 'pointerdown', () => { if (elAgenda.hasAttribute('data-open')) closeDrawer(); });

  // ================= 띠·덮개·쪽 막대 =================
  function paintBar() {
    const show = S.follow === 'free' && !!S.live?.aid && !!findA(S.live.aid) && !isPresenter();
    if (!show) { if (elBar.firstChild) elBar.replaceChildren(); return; }
    const label = t('진행자 화면으로 돌아가기 (안건{n} {p}쪽)', { n: agendaNo(S.live.aid), p: S.live.page || 1 });
    barBox.replaceChildren(
      h('span', { class: 'zv-follow-text' }, t('자유 보기 중이에요')),
      h('button', { type: 'button', class: 'zz-btn primary zv-follow-btn', onclick: backToPresenter },
        h('img', { class: 'zz-icon', src: ctx.assets('icon-follow'), alt: '' }), h('span', null, label)));
    if (barBox.parentNode !== elBar) elBar.replaceChildren(barBox);
  }
  let flashTimer = null;
  function flashPageNo() {
    const pn = ovBox.querySelector('.zv-ov-page');
    if (!pn) return;
    pn.classList.add('is-on');
    cancel(flashTimer);
    flashTimer = later(() => pn.classList.remove('is-on'), 1200);
  }
  function paintOverlay() {
    const a = curA();
    const kids = [];
    if (!S.agenda.length || !a) {
      kids.push(h('div', { class: 'zz-empty zv-ov-empty' },
        h('img', { src: ctx.assets('empty-agenda'), alt: '' }),
        h('p', null, isHostRole() ? t('안건을 올리면 여기에 보여요') : t('아직 올린 안건이 없어요'))));
    } else {
      if (S.load === 'loading') kids.push(h('div', { class: 'zv-ov-loading', role: 'status' }, h('span', { class: 'zv-spin', 'aria-hidden': 'true' }), t('불러오는 중')));
      if (S.load === 'error') kids.push(h('div', { class: 'zv-ov-error', role: 'alert' },
        h('p', null, t('쪽 그림을 불러오지 못했어요')),
        h('button', { type: 'button', class: 'zz-btn', onclick: () => { const c = cache.get(imgKey(a, S.page)); if (c) cache.delete(imgKey(a, S.page)); loadCurrent(); } }, t('다시 불러오기'))));
      const state = isPresenter() && meetingLive()
        ? h('span', { class: 'zz-chip zv-ov-state is-presenter' }, h('span', { class: 'zz-live-dot' }), t('내가 진행 중이에요'))
        : (S.follow === 'follow' && S.live?.aid && meetingLive())
          ? h('span', { class: 'zz-chip zv-ov-state' }, t('진행자 화면을 따라가는 중'))
          : null;
      if (state) kids.push(state);
      kids.push(h('span', { class: 'zz-chip zv-ov-page zz-num', 'aria-hidden': 'true' }, `${S.page} / ${pagesOf(a)}`));
    }
    ovBox.replaceChildren(...kids);
  }
  const isHostRole = () => S.role?.role === 'host';
  function paintPager() {
    const a = curA();
    const n = a ? pagesOf(a) : 0;
    const txt = a ? `${S.page} / ${n}` : '0 / 0';
    if (pageNo.textContent !== txt) { pageNo.textContent = txt; pageNo.setAttribute('aria-label', a ? t('{n}쪽 중 {p}쪽', { n, p: S.page }) : t('안건 없음')); }
    btnPrev.disabled = !stepPage(S.agenda, S.aid, S.page, -1);
    btnNext.disabled = !stepPage(S.agenda, S.aid, S.page, 1);
    btnFit.disabled = !a;
    const z = Math.round(S.view.z * 100);
    const zt = a && z > 100 ? `${z}%` : '';
    if (zoomNo.textContent !== zt) zoomNo.textContent = zt;
    btnFit.setAttribute('aria-pressed', String(!!a && z <= 100));
  }

  // ================= store 구독 =================
  offs.push(store.on('agenda', list => {
    S.agenda = Array.isArray(list) ? list : [];
    const a = curA();
    if (!a) {
      // 보던 안건이 지워졌거나 처음 받음: 진행 중이면 진행 화면, 아니면 첫 안건
      if (S.live?.aid && findA(S.live.aid) && (S.follow === 'follow' || !S.aid)) applyLive(S.live);
      else setTarget(S.agenda[0]?.aid || null, 1, { cx: 0.5, cy: 0.5, z: 1 });
    } else if (S.page > pagesOf(a)) setTarget(a.aid, pagesOf(a), S.view);
    else {
      // 같은 쪽인데 ver 가 바뀌었으면 다시 받기
      if (a.kind !== 'board' && S.imgFor && S.imgFor !== imgKey(a, S.page)) loadCurrent();
      if (S.follow === 'follow' && S.live?.aid && !isPresenter() && (S.live.aid !== S.aid || S.live.page !== S.page) && findA(S.live.aid)) applyLive(S.live);
    }
    renderAgenda(); paintBar(); paintOverlay(); requestRender();
  }));
  offs.push(store.on('live', l => onLive(l)));
  offs.push(store.on('role', r => { S.role = r || null; P.lost = false; rolesChanged(); }));
  offs.push(store.on('meeting', m => {
    if (!m || m.gone) return;
    const prevPc = S.meeting?.presenter?.cid, prevSt = S.meeting?.status;
    S.meeting = m;
    if (m.presenter?.cid !== prevPc) P.lost = false;
    if (prevSt !== m.status && m.status !== 'live') dropLive();
    rolesChanged(); markAgenda();
  }));
  offs.push(store.on('tool', tl => {
    S.tool = tl || { mode: 'view' };
    elStage.classList.toggle('zv-pen', penMode());
    if (penMode() && gest?.kind === 'pan' && ptrs.get(gest.id)?.type !== 'mouse') { gest = null; ptrs.clear(); }
  }));
  offs.push(store.on('cmd:nav', d => {
    if (!d?.aid || !findA(d.aid)) return;
    setTarget(d.aid, d.page || 1, { cx: 0.5, cy: 0.5, z: 1 });
    userChanged();
    if (!isPresenter() && S.live?.aid) setFollow('free');
  }));
  offs.push(store.on('cmd:force', () => {
    if (isPresenter()) queueLive(true);
  }));
  offs.push(store.on('cmd:follow', () => backToPresenter()));
  offs.push(store.on('cmd:redraw', () => { lastVp = null; requestRender(); }));

  // ================= 시작 =================
  store.set('follow', S.follow);
  if (S.live) S.lastForce = S.live.forceSeq || 0;
  const start = S.live?.aid && findA(S.live.aid) ? S.live : null;
  if (start) setTarget(start.aid, start.page || 1, start.view);
  else setTarget(S.agenda[0]?.aid || null, 1, { cx: 0.5, cy: 0.5, z: 1 });
  renderAgenda();
  paintBar(); paintOverlay();
  measure();
  elStage.classList.toggle('zv-pen', penMode());

  return {
    unmount() {
      dead = true;
      for (const off of offs.splice(0)) { try { off(); } catch { /* 계속 */ } }
      for (const id of timers) clearTimeout(id);
      timers.clear();
      if (rafId) cancelAnimationFrame(rafId);
      thumbIO?.disconnect();
      pager.remove();
      agendaBox.remove();
      elAgenda.removeAttribute('data-open');
      elBar.replaceChildren();
      elOverlay.replaceChildren();
      elStage.classList.remove('zv-stage', 'zv-pen');
      g2d.setTransform(1, 0, 0, 1, 0, 0);
      g2d.clearRect(0, 0, cvBg.width, cvBg.height);
      cache.clear(); thumbUrls.clear();
      try { api.releaseImages([]); } catch { /* 없어도 됨 */ }
    },
  };
}
