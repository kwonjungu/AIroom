// 3~6학년 학습 모드 — 거북이(turtle) · 픽셀(pixel) · 미로(maze). WP8.
// ModeInstance 계약(interfaces.js): enter / pause / resume / dispose.
//
// 원칙
//  - 작품 = legacySource{language, source} 원문 하나. 바꿀 때는 항상 store.replaceProgram (편집 멈춤 0.6초 = 되돌리기 한 번).
//  - 편집은 텍스트 DSL + 명령 칩(누르면 줄 추가). Blockly는 이번 범위 밖(외부 CDN 차단 대비가 필요해 후속).
//  - 실행은 엔진이 먼저 trace를 다 만들고(순수·결정적), 재생기(player.js)가 한 단계씩 보여 준다.
//    한 단계·천천히·일시정지·처음으로가 모두 trace 인덱스만 바꾸므로 결과가 항상 같다.
//  - 리스너는 AbortController 하나, 타이머는 Set, rAF는 하나 — dispose에서 전부 해제.

import { parseTurtle, runTurtle, sceneAt, headingName, normAngle } from './engines/turtle.js';
import { parsePixel, runPixel, runEvent, createGridCursor, PIXEL_DEFAULT_COLOR } from './engines/pixel.js';
import { parseMaze, runMaze, mazeStateAt, DIR_NAMES, TURN_LEFT, TURN_RIGHT } from './engines/maze.js';
import { sourceOf, programFor, LANGUAGE, diagLine, hasErrors } from './engines/common.js';
import { gradeMission } from './grade.js';
import { findLearningMission, nextLearningMission, makeLearningProject, markLearningDone } from './catalog.js';
import { createPlayer, SPEEDS } from './player.js';
import { createStroke, cellAt, paintToSource } from './paint.js';
import { fitCanvas, drawTurtle, turtleView, drawPixel, pixelLayout, drawMaze, mazeLayout } from './render.js';
import { TURTLE_CHIPS } from './missions/turtle.js';
import { PIXEL_CHIPS, PIXEL_COLORS } from './missions/pixel.js';
import { MAZE_CHIPS } from './missions/maze.js';

const CSS_ID = 'vl-learning-css';
const CHIPS = { turtle: TURTLE_CHIPS, pixel: PIXEL_CHIPS, maze: MAZE_CHIPS };
const MODE_NAME = { turtle: '거북이', pixel: '픽셀', maze: '미로' };
const COMMIT_MS = 600;
const side = name => (String(name).endsWith('쪽') ? name : name + '쪽');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function injectCss() {
  if (typeof document === 'undefined' || document.getElementById(CSS_ID)) return;
  const link = document.createElement('link');
  link.id = CSS_ID; link.rel = 'stylesheet';
  link.href = new URL('./learning.css', import.meta.url).href;
  document.head.append(link);
}

/** @param {import('../../shared/contracts/interfaces.js').ModeContext} ctx */
export function createMode(ctx) {
  const { store, shell } = ctx;
  const prefs = ctx.prefs || { get: () => null, set: () => {} };
  const grade = ctx.grade === 'high' ? 'high' : ctx.grade === 'low' ? 'low' : 'mid';
  const ac = new AbortController();
  const on = (el, type, fn, opts = {}) => el.addEventListener(type, fn, { ...opts, signal: ac.signal });
  const timers = new Set();
  let rafDraw = 0, rafTween = 0, ro = null, unsub = null, entered = false, disposed = false;
  let stageEl, editorEl, assistEl, dockEl, stagePane;
  let hudEl, toolsEl, canvasWrap, eventsEl, resultEl, codeTa, gutterEl, lineHl, diagEl, chipsEl, liveEl;
  const reduceMotion = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  const mode = store.getProject().mode;
  const lang = LANGUAGE[mode];
  let mission = findLearningMission(store.getProject().learning.missionId);

  const ui = {
    speed: ['slow', 'normal', 'fast'].includes(prefs.get('learning.speed')) ? prefs.get('learning.speed') : 'normal',
    ghost: prefs.get('learning.ghost') !== false,
    preview: !!prefs.get('learning.preview'),
    bigTarget: !!prefs.get('learning.bigTarget'),
    paint: 'paint',
    color: PIXEL_DEFAULT_COLOR,
    run: null,          // {trace, cursor?, kind:'main'|'event', diagnostics}
    result: null,       // gradeMission 결과
    diags: [],          // 현재 원문 파싱 진단
    showHint: false,
    hot: null,          // 픽셀: 가리키는 칸
    stroke: null,       // 픽셀: 드래그 중 {pointerId, s, pending:Set}
    tween: null,        // 거북이: {seg, t}
    lastPixelRun: null, // 버튼 이벤트용
  };
  const player = createPlayer({
    length: 0,
    delayOf: i => stepDelay(i),
    schedule: (fn, ms) => later(fn, ms),
    cancel: id => { clearTimeout(id); timers.delete(id); },
    onStep: i => onPlayerStep(i),
    onDone: () => finishRun(),
  });

  // ── 원문 ──
  const source = () => sourceOf(store.getProject());
  let draft = null;       // 편집 중이지만 아직 store에 안 넣은 원문
  let commitTimer = 0;
  const current = () => (draft ?? source());
  function commitDraft() {
    if (commitTimer) { clearTimeout(commitTimer); timers.delete(commitTimer); commitTimer = 0; }
    if (draft === null) return true;
    const text = draft; draft = null;
    if (text === source()) return true;
    const r = store.replaceProgram(programFor(lang, text), { source: 'learning' });
    if (!r.ok) { say(r.diagnostics?.[0]?.studentHint || '저장할 수 없어요.', 'warn'); return false; }
    return true;
  }
  function setSource(text, what) {
    draft = null;
    if (commitTimer) { clearTimeout(commitTimer); timers.delete(commitTimer); commitTimer = 0; }
    const r = store.replaceProgram(programFor(lang, text), { source: 'learning-ui' });
    if (!r.ok) { say(r.diagnostics?.[0]?.studentHint || '바꿀 수 없어요.', 'warn'); return false; }
    if (what) announce(what);
    return true;
  }

  // ── 문구 ──
  function oneSentence(text) {
    const parts = String(text ?? '').trim().split(/(?<=[.!?])\s+/).filter(Boolean);
    if (parts.length < 2) return parts[0] || '';
    return parts.map((x, i) => (i < parts.length - 1 ? x.replace(/[.!?]+$/, '') : x)).join(' — ');
  }
  function say(text, tone = 'info', actions) { try { shell.say({ text: oneSentence(text), tone, actions }); } catch { /* 셸 없음 */ } }
  function announce(text) { if (liveEl) liveEl.textContent = text; }
  const narrow = () => shell.getLayout?.()?.layout === 'tabs';
  function showPane(k) { try { shell.showPane?.(k); } catch { /* 기본 셸 */ } }

  // ── 타이머 ──
  function later(fn, ms) { const t = setTimeout(() => { timers.delete(t); if (!disposed) fn(); }, ms); timers.add(t); return t; }
  function stepDelay(i) {
    const base = SPEEDS[ui.speed] * (reduceMotion ? 1.3 : 1);
    const s = ui.run?.trace?.steps?.[i];
    if (mode === 'pixel' && s?.ms) return Math.max(s.ms, ui.speed === 'fast' ? s.ms / 2 : s.ms);
    if (mode === 'turtle' && s && !s.seg && !s.turn) return Math.min(base, 120); // 펜·색 바꾸기는 짧게
    return base;
  }

  // ── 파싱·실행 ──
  function parse(text) {
    if (mode === 'turtle') return parseTurtle(text);
    if (mode === 'pixel') return parsePixel(text);
    return parseMaze(text);
  }
  function buildTrace(commands) {
    if (mode === 'turtle') return runTurtle(commands);
    if (mode === 'pixel') return runPixel(commands, { size: mission?.gridSize || 5, color: ui.color });
    return runMaze(commands, mission || { map: ['#####', '#S..#', '#####'], startDir: 'right' });
  }

  function startRun({ stepOnly = false } = {}) {
    if (ui.run && !player.done) {
      if (stepOnly) { player.step(); renderDock(); return; }
      if (!player.playing) { player.play(); renderDock(); }
      return;
    }
    commitDraft();
    const text = source();
    const p = parse(text);
    ui.diags = p.diagnostics;
    ui.result = null; ui.showHint = false;
    renderDiagnostics();
    if (hasErrors(p.diagnostics)) {
      const d = p.diagnostics.find(x => x.severity === 'error');
      highlightLine(diagLine(d), 'error');
      say(d.studentHint, 'hint');
      if (narrow()) showPane('editor');
      renderStage(); renderDock();
      return;
    }
    const trace = buildTrace(p.commands);
    if (hasErrors(trace.diagnostics)) { say(trace.diagnostics[0].studentHint, 'hint'); renderStage(); return; }
    ui.run = { trace, kind: 'main', cursor: mode === 'pixel' ? createGridCursor(trace) : null };
    if (mode === 'pixel') ui.lastPixelRun = trace;
    shell.setStep?.('try');
    if (narrow()) showPane('stage');
    player.load(trace.steps.length);
    if (!trace.steps.length) { finishRun(); return; }
    if (stepOnly) player.step(); else player.play();
    renderDock();
  }

  function onPlayerStep(i) {
    if (disposed) return;
    const s = ui.run?.trace.steps[i];
    highlightLine(s ? s.line : null, 'run');
    if (mode === 'turtle' && s?.seg && !reduceMotion && player.playing) startTween(s.seg, Math.min(stepDelay(i) * 0.8, 500));
    else { stopTween(); }
    renderHud(); scheduleDraw(); renderDock();
  }

  function finishRun() {
    if (disposed || !ui.run) return;
    renderDock();
    if (ui.run.kind === 'event') { renderStage(); return; }
    const text = source();
    if (!mission) {
      ui.result = { complete: false, free: true, hint: '실행 끝! 명령을 바꿔서 다시 해 봐.' };
      say(ui.result.hint, 'info'); renderStage(); return;
    }
    const r = gradeMission(mode, mission, text);
    ui.result = r;
    if (r.complete) succeed(r);
    else {
      const bumpLine = r.detail?.bump?.line;
      if (bumpLine) highlightLine(bumpLine, 'error');
      say(r.hint, 'hint');
    }
    renderStage(); renderAssist();
  }

  function succeed(r) {
    const p = store.getProject();
    store.markRunnable(p.revision);
    if (mission) prefs.set('learning.progress', markLearningDone(prefs.get('learning.progress'), mission.id));
    const nxt = mission && nextLearningMission(mission.id);
    shell.setStep?.('save');
    say(r.hint || mission.success, 'success', nxt ? [{ label: '다음 미션 ▶', onClick: () => goMission(nxt) }] : []);
  }
  function goMission(m) {
    const proj = makeLearningProject(m.mode, m);
    if (typeof ctx.openProject === 'function') { ctx.openProject(proj); return; }
    const r = store.load(proj);
    if (!r.ok) say('다음 미션을 열 수 없어요.', 'warn');
  }

  function togglePause() {
    if (!ui.run || player.done) return;
    if (player.playing) player.pause(); else player.play();
    renderDock();
  }
  function resetRun() {
    player.load(0);
    stopTween();
    ui.run = null; ui.result = null;
    highlightLine(null);
    renderHud(); renderStage(); renderDock();
  }

  function pressEvent(which) {
    const base = ui.run?.kind === 'main' && player.done ? ui.run.trace : ui.lastPixelRun;
    if (!base) { say('먼저 ▶ 실행을 눌러 버튼 할 일을 준비해요.', 'hint'); return; }
    const size = mission?.gridSize || 5;
    const tr = runEvent(base, which, { size, color: ui.color });
    if (!tr) { say(`버튼 ${which === 'SHAKE' ? '흔들기' : which}에 정해 둔 일이 없어요.`, 'hint'); return; }
    ui.lastPixelRun = tr;
    ui.run = { trace: tr, kind: 'event', cursor: createGridCursor(tr) };
    player.load(tr.steps.length);
    if (tr.steps.length) player.play();
    renderDock();
  }

  // ── 거북이 트윈(선이 그려지는 모습) ──
  function startTween(seg, ms) {
    stopTween();
    const t0 = performance.now();
    ui.tween = { seg, t: 0 };
    const tick = now => {
      rafTween = 0;
      if (disposed || !ui.tween) return;
      ui.tween.t = Math.min(1, (now - t0) / Math.max(1, ms));
      drawNow();
      if (ui.tween && ui.tween.t < 1) rafTween = requestAnimationFrame(tick);
      else ui.tween = null;
    };
    rafTween = requestAnimationFrame(tick);
  }
  function stopTween() { if (rafTween) cancelAnimationFrame(rafTween); rafTween = 0; ui.tween = null; }

  // ── 렌더 ──
  function scheduleDraw() {
    if (rafDraw || disposed) return;
    rafDraw = requestAnimationFrame(() => { rafDraw = 0; drawNow(); });
  }

  /** 무대 패널의 실제 가용 크기 (WP2 cards와 같은 방식: viewport 배치는 패널 아래 끝까지) */
  function available(area) {
    const pane = stagePane || stageEl;
    const cs = getComputedStyle(pane);
    const W = Math.max(220, Math.floor(pane.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)));
    const vh = (typeof visualViewport !== 'undefined' && visualViewport?.height) || innerHeight;
    const dockH = dockEl?.parentElement?.getBoundingClientRect().height || 0;
    const fit = shell.getLayout?.()?.fit;
    let below = 0;
    for (let el = area?.nextElementSibling; el; el = el.nextElementSibling) if (!el.hidden) below += el.getBoundingClientRect().height + 8;
    let H;
    if (fit === 'viewport' && area) H = pane.getBoundingClientRect().bottom - parseFloat(cs.paddingBottom) - area.getBoundingClientRect().top - below - 6;
    else {
      const layout = shell.getLayout?.()?.layout;
      H = (vh - dockH) * (layout === 'tabs' ? 0.6 : layout === 'stack' ? 0.45 : 0.55);
    }
    return { W, H: Math.max(220, Math.floor(H)) };
  }

  function drawNow() {
    if (disposed || !canvasWrap) return;
    const { W, H } = available(canvasWrap);
    if (mode === 'turtle') drawTurtleStage(W, H);
    else if (mode === 'pixel') drawPixelStage(W, H);
    else drawMazeStage(W, H);
  }

  // 거북이
  let targetSegsCache = null;
  function targetSegs() {
    if (targetSegsCache) return targetSegsCache;
    if (!mission?.target) return (targetSegsCache = []);
    const t = runTurtle(parseTurtle(mission.target).commands);
    targetSegsCache = t.steps.filter(s => s.seg).map(s => s.seg);
    return targetSegsCache;
  }
  function turtlePose() {
    const r = ui.run;
    if (!r || player.index < 0) return { scene: { segs: [], circles: [], stamps: [], says: [] }, pose: { x: 0, y: 0, angle: 0 }, step: null };
    const i = player.index;
    const scene = sceneAt(r.trace, ui.tween ? i - 1 : i);
    const s = r.trace.steps[i];
    return { scene, pose: ui.tween ? { x: s.from.x + (s.to.x - s.from.x) * ui.tween.t, y: s.from.y + (s.to.y - s.from.y) * ui.tween.t, angle: s.to.angle } : s.to, step: s };
  }
  function drawTurtleStage(W, H) {
    const cv = canvasWrap.querySelector('canvas[data-cv="turtle"]'); if (!cv) return;
    const w = Math.min(W, 900), h = Math.min(H, Math.max(260, Math.round(w * 0.75)));
    const c = fitCanvas(cv, w, h);
    const all = ui.run ? ui.run.trace.steps : [];
    const view = turtleView(w, h, ui.ghost ? targetSegs() : [], all.filter(s => s.seg).map(s => s.seg), all.filter(s => s.circle).map(s => s.circle));
    const { scene, pose } = turtlePose();
    drawTurtle(c, { W: w, H: h, view, bg: ui.run?.trace.bg, ghost: ui.ghost && mission?.target ? targetSegs() : null, scene, partial: ui.tween, pose, labels: true, redraw: scheduleDraw });
    const fitNote = canvasWrap.querySelector('[data-fitnote]');
    if (fitNote) fitNote.hidden = !view.fitted;
    cv.setAttribute('aria-label', `거북이 무대: 거북이는 ${side(headingName(pose.angle))}(${normAngle(pose.angle)}도)을 보고 있어요. 선 ${scene.segs.length}개.`);
  }

  // 픽셀
  function pixelGridNow() {
    const n = mission?.gridSize || 5;
    if (ui.run) {
      const g = ui.run.cursor.seek(player.index);
      return g;
    }
    // 실행 전에는 원문 결과(칠하기 결과 포함)를 바로 보여 준다
    const p = parsePixel(current());
    if (hasErrors(p.diagnostics)) return Array.from({ length: n }, () => Array(n).fill(null));
    return runPixel(p.commands, { size: n, color: ui.color }).grid;
  }
  let pixelL = null;
  function drawPixelStage(W, H) {
    const n = mission?.gridSize || 5;
    const cvMine = canvasWrap.querySelector('canvas[data-cv="mine"]');
    const cvTarget = canvasWrap.querySelector('canvas[data-cv="target"]');
    const hasTarget = !!mission?.targetGrid;
    const capH = H - 34;
    let mine, tgt;
    if (!hasTarget) { mine = Math.min(W, capH, 640); tgt = 0; }
    else if (ui.bigTarget) {
      const half = Math.floor((W - 16) / 2);
      if (half >= 200) { mine = tgt = Math.min(half, capH, 560); } else { mine = tgt = Math.min(W, Math.floor(capH / 2) - 20); }
    } else {
      tgt = Math.max(110, Math.min(170, Math.floor(W * 0.24)));
      mine = Math.min(W - tgt - 16, capH, 640);
      if (mine < 220) { mine = Math.min(W, capH); } // 좁으면 목표를 위에 작게, 내 격자를 아래에 크게
    }
    canvasWrap.classList.toggle('is-stacked', hasTarget && ui.bigTarget && Math.floor((W - 16) / 2) < 200);
    pixelL = pixelLayout(mine, n);
    const c = fitCanvas(cvMine, pixelL.w, pixelL.h);
    const pend = ui.stroke?.pending;
    drawPixel(c, { grid: pixelGridNow(), L: pixelL, hot: ui.hot, pending: pend, pendingColor: ui.paint === 'erase' ? null : ui.color });
    if (cvTarget && hasTarget) {
      const tl = pixelLayout(tgt, n);
      drawPixel(fitCanvas(cvTarget, tl.w, tl.h), { grid: mission.targetGrid, L: tl, target: true, labels: tgt >= 140 });
    }
  }

  // 미로
  function mazePreview() {
    if (!ui.preview || ui.run) return null;
    const p = parseMaze(current());
    if (hasErrors(p.diagnostics)) return null;
    const tr = runMaze(p.commands, mission);
    return mazeStateAt(mission, tr, tr.steps.length - 1).trail;
  }
  function mazeNow() {
    const tr = ui.run?.trace;
    return mazeStateAt(mission, tr || { steps: [] }, tr ? player.index : -1);
  }
  function drawMazeStage(W, H) {
    const cv = canvasWrap.querySelector('canvas[data-cv="maze"]'); if (!cv || !mission) return;
    const rows = mission.map.length, cols = Math.max(...mission.map.map(r => r.length));
    const L = mazeLayout(Math.min(W, 900), H, rows, cols);
    const c = fitCanvas(cv, L.w, L.h);
    const st = mazeNow();
    drawMaze(c, { mission, L, pos: st, collected: st.collected, trail: st.trail, blocked: player.done ? st.blocked : null, preview: mazePreview(), redraw: scheduleDraw });
    cv.setAttribute('aria-label', `미로: 토토는 ${st.r + 1}번째 줄 ${st.c + 1}번째 칸에서 ${side(DIR_NAMES[st.dir])}을 보고 있어요.`);
  }

  // HUD (큰 상태 표시)
  function renderHud() {
    if (!hudEl) return;
    const cur = ui.run && player.index >= 0 ? ui.run.trace.steps[player.index] : null;
    const lineTxt = cur ? `<span class="vl-chip-now">지금 ${cur.line}번째 줄${cur.loops?.length ? ` · 반복 ${cur.loops.at(-1).iter}/${cur.loops.at(-1).count}` : ''}</span>` : '';
    if (mode === 'turtle') {
      const { pose, step } = turtlePose();
      const deg = normAngle(pose.angle);
      const turn = step?.turn ? `${step.turn > 0 ? '오른쪽' : '왼쪽'}으로 ${Math.abs(step.turn)}° 돌았어` : step?.seg ? `앞으로 ${Math.round(step.seg.len)}만큼 그렸어` : '';
      hudEl.innerHTML = `<div class="vl-compass" aria-hidden="true"><span style="transform:rotate(${deg}deg)">⬆</span></div>
        <div class="vl-hudtext"><b class="vl-big">${grade === 'high' ? `방향 ${deg}°` : `${side(headingName(deg))}을 봐요`}</b>
        <span>${grade === 'high' ? side(headingName(deg)) : `${deg}°`}${turn ? ' · ' + esc(turn) : ''}</span>${lineTxt}</div>`;
    } else if (mode === 'pixel') {
      const hot = ui.hot ? `(x:${ui.hot.x + 1}, y:${ui.hot.y + 1})` : '칸을 가리키면 좌표가 보여요';
      hudEl.innerHTML = `<div class="vl-hudtext"><b class="vl-big">${esc(hot)}</b><span>x는 오른쪽(→), y는 아래(↓)로 커져요</span>${lineTxt}</div>`;
    } else {
      const st = mission ? mazeNow() : null;
      if (!st) { hudEl.innerHTML = ''; return; }
      const left = DIR_NAMES[TURN_LEFT[st.dir]], right = DIR_NAMES[TURN_RIGHT[st.dir]];
      const gems = mission.map.join('').split('D').length - 1;
      hudEl.innerHTML = `<div class="vl-hudtext"><b class="vl-big">토토가 보는 쪽: ${DIR_NAMES[st.dir]}</b>
        <span>↺ 왼쪽으로 돌면 ${left} · ↻ 오른쪽으로 돌면 ${right}${gems ? ` · 💎 ${st.collected.size}/${gems}` : ''}</span>${lineTxt}</div>`;
    }
  }

  function toolsHtml() {
    if (mode === 'turtle') {
      return mission?.target ? `<button type="button" class="vl-btn" data-action="ghost" aria-pressed="${ui.ghost}">👻 목표 점선 ${ui.ghost ? '끄기' : '켜기'}</button>` : '';
    }
    if (mode === 'maze') return `<button type="button" class="vl-btn" data-action="preview" aria-pressed="${ui.preview}">👣 길 미리 보기 ${ui.preview ? '끄기' : '켜기'}</button>`;
    const colors = PIXEL_COLORS.map(c => `<button type="button" class="vl-color" data-action="color" data-val="${c.hex}" aria-pressed="${ui.color === c.hex}" title="${c.name}">
      <span class="vl-swatch" style="background:${c.hex}"></span><span>${c.name}</span></button>`).join('');
    return `${mission?.targetGrid ? `<button type="button" class="vl-btn" data-action="bigTarget" aria-pressed="${ui.bigTarget}">🔍 목표 ${ui.bigTarget ? '작게' : '크게'}</button>` : ''}
      <span class="vl-seg" role="group" aria-label="손가락으로">
        <button type="button" class="vl-btn" data-action="paint" data-val="paint" aria-pressed="${ui.paint === 'paint'}">🖌️ 칠하기</button>
        <button type="button" class="vl-btn" data-action="paint" data-val="erase" aria-pressed="${ui.paint === 'erase'}">🧽 지우기</button>
      </span>
      <details class="vl-colors"><summary class="vl-btn"><span class="vl-swatch" style="background:${ui.color}"></span> 색: ${esc(PIXEL_COLORS.find(c => c.hex === ui.color)?.name || '빨강')}</summary><div class="vl-colorgrid">${colors}</div></details>`;
  }

  function renderStage() {
    if (!stageEl) return;
    // 내용이 같으면 다시 그리지 않는다(누르던 버튼 유지). 바뀌면 초점을 같은 버튼으로 되돌린다.
    const th = toolsHtml();
    if (toolsEl.dataset.html !== th) {
      const k = focusKey(toolsEl);
      toolsEl.innerHTML = th; toolsEl.dataset.html = th;
      restoreFocus(k, toolsEl);
    }
    // 픽셀 버튼 이벤트
    const h = mode === 'pixel' ? (ui.lastPixelRun?.handlers || {}) : {};
    const evs = ['A', 'B', 'SHAKE'].filter(x => h[x]);
    eventsEl.hidden = !evs.length;
    const eh = evs.map(x => `<button type="button" class="vl-btn vl-evt" data-action="event" data-val="${x}">${x === 'SHAKE' ? '📳 흔들기' : x === 'A' ? '🅰 버튼 A' : '🅱 버튼 B'}</button>`).join('');
    if (eventsEl.dataset.html !== eh) { eventsEl.innerHTML = eh; eventsEl.dataset.html = eh; }
    const r = ui.result;
    resultEl.hidden = !(r && (r.complete || r.free));
    resultEl.className = `vl-result ${r?.complete ? 'is-ok' : 'is-try'}`;
    resultEl.innerHTML = r && (r.complete || r.free) ? `<span aria-hidden="true">${r.complete ? '🎉' : '💡'}</span> <span>${esc(r.complete ? (mission?.success || r.hint) : r.hint)}</span>${r.detail?.shortCode ? ' <b class="vl-badge">✂️ 짧은 코드</b>' : ''}` : '';
    renderHud();
    scheduleDraw();
  }

  function renderAssist() {
    if (!assistEl) return;
    const m = mission;
    const r = ui.result;
    const teacher = r && !r.free ? `<details class="vl-teacher"><summary>선생님 보기</summary><p>점수 ${r.score} · 완료 ${r.complete ? '예' : '아니오'}${r.detail?.sim !== undefined ? ` · 모양 유사도 ${Math.round(r.detail.sim * 100)}% · 길이 ${Math.round(r.detail.lengthRatio * 100)}% · 색 ${Math.round(r.detail.colorScore * 100)}%` : ''}${r.detail?.blocks !== undefined ? ` · 블록 ${r.detail.blocks}/${r.detail.par}` : ''}${r.detail?.missing ? ` · 모자란 칸 ${r.detail.missing.length} · 더 켜진 칸 ${r.detail.extra.length}` : ''}</p></details>` : '';
    assistEl.innerHTML = m ? `<section class="vl-assist">
        <h2 class="vl-h2"><span aria-hidden="true">${esc(m.icon)}</span> ${esc(m.title)}</h2>
        <p class="vl-desc">${esc(m.description)}</p>
        <p class="vl-story">${esc(m.story)}</p>
        ${ui.showHint ? `<p class="vl-hint" role="status">💡 ${esc(m.hint)}</p>` : '<button type="button" class="vl-btn" data-action="hint">💡 힌트 보기</button>'}
        ${r?.complete ? `<p class="vl-tip"><b>오늘의 정리</b> ${esc(m.tip)}</p>` : ''}
        ${teacher}</section>`
      : `<section class="vl-assist"><h2 class="vl-h2">${MODE_NAME[mode]} 연습</h2><p class="vl-desc">명령을 마음껏 써 보고 실행해 봐요.</p></section>`;
  }

  // 실행 영역은 버튼을 한 번 만들고 글자·disabled만 바꾼다. 편집기 blur(버튼 mousedown) 때 통째로 다시 그리면
  // 누르던 버튼이 사라져 click이 없어진다(E2E maze-if에서 발견한 결함).
  function renderDock() {
    if (!dockEl) return;
    if (!dockEl.firstChild) {
      dockEl.innerHTML = `<div class="vl-runbar" role="toolbar" aria-label="실행">
        <button type="button" class="vl-btn vl-primary" data-action="run">▶ 실행</button>
        <button type="button" class="vl-btn" data-action="step">한 단계</button>
        <button type="button" class="vl-btn" data-action="pause">⏸ 멈춤</button>
        <button type="button" class="vl-btn" data-action="reset">⟲ 처음</button>
        <button type="button" class="vl-btn" data-action="speed"></button>
        <button type="button" class="vl-btn" data-action="undo">↶ 되돌리기</button>
        <button type="button" class="vl-btn" data-action="redo" aria-label="다시하기">↷ 다시</button>
      </div>`;
    }
    const B = a => dockEl.querySelector(`[data-action="${a}"]`);
    const st = store.getState();
    const running = !!ui.run && player.playing;
    const paused = !!ui.run && !player.playing && !player.done && player.index >= 0;
    const next = { slow: 'normal', normal: 'fast', fast: 'slow' }[ui.speed];
    const speedName = { slow: '🐢 천천히', normal: '🚶 보통', fast: '🐇 빠르게' }[ui.speed];
    const set = (el, text, disabled) => {
      if (text !== null && el.textContent !== text) el.textContent = text;
      if (el.disabled !== disabled) el.disabled = disabled;
    };
    set(B('run'), paused ? '▶ 계속' : '▶ 실행', false);
    set(B('pause'), null, !running);
    set(B('reset'), null, !ui.run);
    const sp = B('speed');
    set(sp, speedName, false);
    sp.dataset.val = next;
    sp.setAttribute('aria-label', `빠르기 바꾸기 (지금 ${speedName.slice(2).trim()})`);
    set(B('undo'), null, !(st.canUndo || draft !== null));
    set(B('redo'), null, !st.canRedo);
    // 초점이 있던 버튼이 비활성으로 바뀌면 실행 버튼으로 옮긴다(초점 분실 방지)
    const a = document.activeElement;
    if (a && dockEl.contains(a) && a.disabled) B('run').focus({ preventScroll: true });
  }

  function focusKey(host) {
    const a = document.activeElement;
    if (!a || !host || !host.contains(a)) return null;
    return { action: a.dataset.action, val: a.dataset.val };
  }
  function restoreFocus(k, host) {
    if (!k || !k.action) return;
    const sel = `[data-action="${CSS.escape(k.action)}"]` + (k.val ? `[data-val="${CSS.escape(k.val)}"]` : '');
    let el = host.querySelector(sel);
    if (!el && k.action === 'speed') el = host.querySelector('[data-action="speed"]');
    if (el && !el.disabled) el.focus({ preventScroll: true });
    else if (host === dockEl) host.querySelector('[data-action="run"]')?.focus({ preventScroll: true });
  }

  // ── 코드 편집기 ──
  const LH = 30; // 줄 높이(px) — 강조 띠와 맞춘다
  function renderGutter() {
    if (!gutterEl) return;
    const n = Math.max(1, current().split('\n').length);
    const errLines = new Set(ui.diags.filter(d => d.severity === 'error').map(diagLine));
    let html = '';
    for (let i = 1; i <= n; i++) html += `<span class="${errLines.has(i) ? 'is-err' : ''}${hlLine === i ? ' is-now' : ''}">${errLines.has(i) ? '⚠' : ''}${i}</span>`;
    gutterEl.innerHTML = html;
    gutterEl.scrollTop = codeTa.scrollTop;
  }
  function renderDiagnostics() {
    if (!diagEl) return;
    const list = ui.diags.slice(0, 4);
    diagEl.hidden = !list.length;
    diagEl.innerHTML = list.map(d => `<li class="${d.severity === 'error' ? 'is-err' : 'is-warn'}"><button type="button" class="vl-linkbtn" data-action="goto" data-val="${diagLine(d) || 1}">${esc(d.studentHint || d.message)}</button></li>`).join('');
    renderGutter();
  }
  let hlLine = null, hlKind = null;
  function highlightLine(line, kind = 'run') {
    hlLine = line || null; hlKind = kind;
    if (!lineHl) return;
    if (!hlLine) { lineHl.hidden = true; renderGutter(); return; }
    lineHl.hidden = false;
    lineHl.dataset.kind = kind;
    positionHighlight();
    // 강조 줄이 보이도록 스크롤
    const top = (hlLine - 1) * LH;
    if (top < codeTa.scrollTop || top + LH > codeTa.scrollTop + codeTa.clientHeight) codeTa.scrollTop = Math.max(0, top - codeTa.clientHeight / 3);
    positionHighlight();
    renderGutter();
  }
  function positionHighlight() {
    if (!lineHl || !hlLine) return;
    const pad = parseFloat(getComputedStyle(codeTa).paddingTop) || 0;
    lineHl.style.transform = `translateY(${pad + (hlLine - 1) * LH - codeTa.scrollTop}px)`;
    lineHl.hidden = (hlLine - 1) * LH - codeTa.scrollTop < -LH || (hlLine - 1) * LH - codeTa.scrollTop > codeTa.clientHeight;
  }
  function gotoLine(n) {
    const lines = codeTa.value.split('\n');
    let pos = 0; for (let i = 0; i < n - 1 && i < lines.length; i++) pos += lines[i].length + 1;
    codeTa.focus(); codeTa.setSelectionRange(pos, pos + (lines[n - 1]?.length || 0));
    highlightLine(n, 'error');
  }

  let parseTimer = 0;
  let caretPos = null; // 칩을 누르면 편집기 초점이 사라지므로 마지막 커서 자리를 기억한다
  function onCodeInput() {
    if (ui.run) { player.load(0); ui.run = null; stopTween(); ui.result = null; highlightLine(null); renderStage(); } // 편집하면 실행을 멈춘다
    draft = codeTa.value;
    if (commitTimer) { clearTimeout(commitTimer); timers.delete(commitTimer); }
    commitTimer = later(() => { commitTimer = 0; commitDraft(); }, COMMIT_MS);
    if (parseTimer) { clearTimeout(parseTimer); timers.delete(parseTimer); }
    parseTimer = later(() => { parseTimer = 0; ui.diags = parse(current()).diagnostics; renderDiagnostics(); if (mode !== 'turtle') scheduleDraw(); }, 200);
    renderGutter(); renderDock();
  }

  function insertCode(chip) {
    const ta = codeTa;
    const v = ta.value;
    const at = document.activeElement === ta ? ta.selectionEnd : Math.min(caretPos ?? v.length, v.length);
    const lineEnd = v.indexOf('\n', at) === -1 ? v.length : v.indexOf('\n', at);
    const before = v.slice(0, lineEnd), after = v.slice(lineEnd);
    const needNl = before.length && !before.endsWith('\n');
    const insert = (needNl ? '\n' : '') + chip.code;
    ta.value = before + insert + after;
    const caret = before.length + (needNl ? 1 : 0) + (chip.caret ?? chip.code.length);
    onCodeInput();
    commitDraft(); // 칩 한 번 = 되돌리기 한 번
    caretPos = caret;
    try { ta.focus({ preventScroll: true }); ta.setSelectionRange(caret, caret); } catch { /* 포커스 불가 */ }
    announce(`${chip.label} 줄을 넣었어요`);
  }

  // ── 픽셀 칠하기 ──
  function pointerCell(e) {
    const cv = e.currentTarget;
    if (!pixelL) return null;
    const rect = cv.getBoundingClientRect();
    return cellAt(e.clientX - rect.left, e.clientY - rect.top, pixelL);
  }
  function onPixelDown(e) {
    if (mode !== 'pixel' || (e.pointerType === 'mouse' && e.button !== 0)) return;
    const cell = pointerCell(e); if (!cell) return;
    e.preventDefault();
    if (ui.run) resetRun();
    commitDraft();
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* 합성 이벤트 */ }
    const s = createStroke();
    ui.stroke = { pointerId: e.pointerId, s, pending: new Set() };
    for (const c of s.add(cell)) ui.stroke.pending.add(c.x + ',' + c.y);
    ui.hot = cell; renderHud(); scheduleDraw();
  }
  function onPixelMove(e) {
    if (mode !== 'pixel') return;
    const st = ui.stroke;
    if (!st || e.pointerId !== st.pointerId) {
      const cell = pointerCell(e);
      if ((cell?.x !== ui.hot?.x) || (cell?.y !== ui.hot?.y)) { ui.hot = cell; renderHud(); scheduleDraw(); }
      return;
    }
    const evs = typeof e.getCoalescedEvents === 'function' ? e.getCoalescedEvents() : [];
    for (const ev of (evs.length ? evs : [e])) {
      const rect = e.currentTarget.getBoundingClientRect();
      const cell = pixelL ? cellAt(ev.clientX - rect.left, ev.clientY - rect.top, pixelL) : null;
      if (!cell) { st.s.lift(); continue; }
      for (const c of st.s.add(cell)) st.pending.add(c.x + ',' + c.y);
      ui.hot = cell;
    }
    renderHud(); scheduleDraw();
  }
  function onPixelUp(e, cancelled) {
    const st = ui.stroke;
    if (!st || e.pointerId !== st.pointerId) return;
    ui.stroke = null;
    try { e.currentTarget.releasePointerCapture?.(e.pointerId); } catch { /* 이미 해제 */ }
    if (cancelled) { announce('칠하기를 취소했어요'); scheduleDraw(); return; } // pointercancel: 아무것도 바꾸지 않음
    const n = mission?.gridSize || 5;
    const p = parsePixel(source());
    const grid = hasErrors(p.diagnostics) ? Array.from({ length: n }, () => Array(n).fill(null)) : runPixel(p.commands, { size: n, color: ui.color }).grid;
    const out = paintToSource(source(), st.s.cells, ui.paint, ui.color, grid, ui.color);
    if (out.lines.length) {
      setSource(out.source, `${out.lines.length}칸을 ${ui.paint === 'erase' ? '지웠어요' : '칠했어요'} — 코드에 ${out.lines.length}줄이 생겼어요`);
      say(`${out.lines.length}칸을 ${ui.paint === 'erase' ? '지웠어' : '칠했어'} — 코드에 줄이 생겼으니 ▶ 실행으로 확인해 봐.`, 'info');
    }
    scheduleDraw();
  }

  // ── 이벤트 위임 ──
  function onClick(e) {
    const b = e.target.closest('[data-action]');
    if (!b || b.disabled) return;
    const a = b.dataset.action;
    switch (a) {
      case 'run': startRun(); break;
      case 'step': startRun({ stepOnly: true }); break;
      case 'pause': togglePause(); break;
      case 'reset': resetRun(); break;
      case 'speed': ui.speed = b.dataset.val; prefs.set('learning.speed', ui.speed); player.retime(); renderDock(); break;
      case 'undo':
        if (draft !== null && draft !== source()) { draft = null; codeTa.value = source(); onSourceChanged(); break; }
        resetRunQuiet(); store.undo(); break;
      case 'redo': resetRunQuiet(); store.redo(); break;
      case 'ghost': ui.ghost = !ui.ghost; prefs.set('learning.ghost', ui.ghost); renderStage(); break;
      case 'preview': ui.preview = !ui.preview; prefs.set('learning.preview', ui.preview); renderStage(); break;
      case 'bigTarget': ui.bigTarget = !ui.bigTarget; prefs.set('learning.bigTarget', ui.bigTarget); renderStage(); break;
      case 'paint': ui.paint = b.dataset.val; renderStage(); break;
      case 'color': ui.color = b.dataset.val; b.closest('details')?.removeAttribute('open'); renderStage(); break;
      case 'event': pressEvent(b.dataset.val); break;
      case 'hint': ui.showHint = true; renderAssist(); assistEl.querySelector('.vl-hint')?.setAttribute('tabindex', '-1'); break;
      case 'chip': insertCode(CHIPS[mode][Number(b.dataset.val)]); break;
      case 'goto': gotoLine(Number(b.dataset.val)); break;
      default: break;
    }
  }
  function resetRunQuiet() { if (ui.run) { player.load(0); ui.run = null; stopTween(); ui.result = null; highlightLine(null); } }

  function onSourceChanged() {
    const text = source();
    if (draft === null && codeTa && codeTa.value !== text) {
      const pos = Math.min(codeTa.selectionStart ?? text.length, text.length);
      codeTa.value = text;
      try { if (document.activeElement === codeTa) codeTa.setSelectionRange(pos, pos); } catch { /* 없음 */ }
    }
    ui.diags = parse(current()).diagnostics;
    renderDiagnostics(); renderStage(); renderDock();
  }

  function onStore(ev) {
    if (disposed) return;
    if (ev.type === 'loaded') { // 다른 미션 로드(openProject가 없는 환경)
      resetRunQuiet();
      mission = findLearningMission(store.getProject().learning.missionId);
      targetSegsCache = null;
      codeTa.value = source(); draft = null;
      renderAll();
      return;
    }
    if (ev.type !== 'changed') { if (ev.type === 'saveState' || ev.type === 'lastGood') return; renderDock(); return; }
    if (ev.source !== 'learning') resetRunQuiet();
    if (ev.source !== 'learning' || draft === null) onSourceChanged(); else renderDock();
    shell.setStep?.('change');
  }

  function renderAll() {
    renderDiagnostics(); renderStage(); renderAssist(); renderDock();
    shell.setStep?.('make');
    if (mission) say(mission.story, 'info');
    else say(`${MODE_NAME[mode]} 명령을 써서 실행해 봐.`, 'info');
  }

  function buildDom(stageSlot, editorSlot, assistSlot) {
    const low = grade === 'low';
    stageEl = document.createElement('div');
    stageEl.className = `vl vl-stage${low ? ' is-low' : ''}`;
    stageEl.dataset.learningMode = mode;
    const head = mission ? `<div class="vl-mission"><span class="vl-micon" aria-hidden="true">${esc(mission.icon)}</span><p class="vl-desc">${esc(mission.description)}</p></div>` : '';
    const canvases = mode === 'turtle'
      ? '<canvas data-cv="turtle" role="img" aria-label="거북이 무대"></canvas><p class="vl-fitnote" data-fitnote hidden>그림이 커서 화면에 맞게 줄여 보여 줘요</p>'
      : mode === 'pixel'
        ? `${mission?.targetGrid ? '<figure class="vl-fig"><figcaption>목표</figcaption><canvas data-cv="target" role="img" aria-label="목표 그림"></canvas></figure>' : ''}<figure class="vl-fig"><figcaption>내 전광판 — 손가락으로 칠해요</figcaption><canvas data-cv="mine" class="vl-paintable" role="img" aria-label="내 전광판 격자"></canvas></figure>`
        : '<canvas data-cv="maze" role="img" aria-label="미로"></canvas>';
    stageEl.innerHTML = `${head}<div class="vl-hud" data-hud aria-live="off"></div><div class="vl-tools" data-tools></div>
      <div class="vl-canvases" data-canvas>${canvases}</div><div class="vl-events" data-events hidden></div><div class="vl-result" data-result role="status" hidden></div>`;
    hudEl = stageEl.querySelector('[data-hud]');
    toolsEl = stageEl.querySelector('[data-tools]');
    canvasWrap = stageEl.querySelector('[data-canvas]');
    eventsEl = stageEl.querySelector('[data-events]');
    resultEl = stageEl.querySelector('[data-result]');

    editorEl = document.createElement('div');
    editorEl.className = `vl vl-editor${low ? ' is-low' : ''}`;
    editorEl.dataset.learningMode = mode;
    const taId = 'vl-code-' + Math.random().toString(36).slice(2, 7);
    editorEl.innerHTML = `<div class="vl-codehead"><label for="${taId}" class="vl-label">${grade === 'high' ? '코드' : '명령 쓰기'} <small>(한 줄에 명령 하나)</small></label></div>
      <div class="vl-code"><div class="vl-gutter" aria-hidden="true"></div><div class="vl-codebox"><div class="vl-linehl" hidden aria-hidden="true"></div>
      <textarea id="${taId}" class="vl-ta" wrap="off" spellcheck="false" autocapitalize="characters" autocomplete="off" autocorrect="off" aria-describedby="${taId}-d"></textarea></div></div>
      <ul class="vl-diags" id="${taId}-d" hidden></ul>
      <p class="vl-label">명령 카드 — 누르면 줄이 들어가요</p>
      <div class="vl-chips">${CHIPS[mode].map((c, i) => `<button type="button" class="vl-btn vl-chipbtn" data-action="chip" data-val="${i}"><span>${esc(c.label)}</span><code>${esc(c.code.split('\n')[0])}</code></button>`).join('')}</div>
      <p class="vl-sr" aria-live="polite"></p>`;
    codeTa = editorEl.querySelector('textarea');
    gutterEl = editorEl.querySelector('.vl-gutter');
    lineHl = editorEl.querySelector('.vl-linehl');
    diagEl = editorEl.querySelector('.vl-diags');
    chipsEl = editorEl.querySelector('.vl-chips');
    liveEl = editorEl.querySelector('.vl-sr');
    codeTa.value = source();

    assistEl = document.createElement('div');
    assistEl.className = `vl vl-assistwrap${low ? ' is-low' : ''}`;

    stageSlot.append(stageEl);
    editorSlot.append(editorEl);
    assistSlot?.append(assistEl);
    if (typeof shell.dockSlot === 'function') {
      dockEl = document.createElement('div');
      dockEl.className = `vl vl-dock${low ? ' is-low' : ''}`;
      shell.dockSlot().append(dockEl);
    } else {
      dockEl = document.createElement('div');
      dockEl.className = 'vl vl-dock';
      editorEl.append(dockEl);
    }
  }

  return {
    enter(root) {
      if (entered) throw new Error('learning mode: enter twice');
      entered = true;
      injectCss();
      const stageSlot = shell.stageSlot?.() || root;
      const editorSlot = shell.editorSlot?.() || root;
      const assistSlot = shell.assistSlot?.() || null;
      stagePane = shell.stageSlot ? stageSlot : null;
      buildDom(stageSlot, editorSlot, assistSlot);
      for (const el of [stageEl, editorEl, assistEl, dockEl]) on(el, 'click', onClick);
      on(codeTa, 'input', onCodeInput);
      for (const t of ['keyup', 'click', 'select', 'input']) on(codeTa, t, () => { caretPos = codeTa.selectionEnd; });
      on(codeTa, 'blur', () => commitDraft());
      on(codeTa, 'scroll', () => { gutterEl.scrollTop = codeTa.scrollTop; positionHighlight(); });
      // Tab은 초점 이동 그대로 둔다(키보드 함정 방지). Ctrl+Enter = 실행.
      on(codeTa, 'keydown', e => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); startRun(); } });
      if (mode === 'pixel') {
        const cv = canvasWrap.querySelector('canvas[data-cv="mine"]');
        on(cv, 'pointerdown', onPixelDown);
        on(cv, 'pointermove', onPixelMove);
        on(cv, 'pointerup', e => onPixelUp(e, false));
        on(cv, 'pointercancel', e => onPixelUp(e, true));
        on(cv, 'pointerleave', () => { if (!ui.stroke && ui.hot) { ui.hot = null; renderHud(); scheduleDraw(); } });
      }
      if (typeof ResizeObserver === 'function') { ro = new ResizeObserver(() => scheduleDraw()); ro.observe(stagePane || stageEl); }
      on(window, 'resize', scheduleDraw);
      unsub = store.subscribe(onStore);
      ui.diags = parse(source()).diagnostics;
      renderAll();
    },
    pause() { if (player.playing) { player.pause(); renderDock(); } },
    resume() { renderDock(); scheduleDraw(); },
    dispose() {
      if (disposed) return;
      try { commitDraft(); } catch { /* 저장 불가 */ }
      disposed = true;
      player.dispose();
      for (const t of timers) clearTimeout(t);
      timers.clear();
      if (rafDraw) cancelAnimationFrame(rafDraw);
      if (rafTween) cancelAnimationFrame(rafTween);
      rafDraw = rafTween = 0;
      ac.abort();
      ro?.disconnect(); ro = null;
      unsub?.(); unsub = null;
      ui.run = null; ui.stroke = null;
      stageEl?.remove(); editorEl?.remove(); assistEl?.remove(); dockEl?.remove();
      stageEl = editorEl = assistEl = dockEl = stagePane = null;
      hudEl = toolsEl = canvasWrap = eventsEl = resultEl = codeTa = gutterEl = lineHl = diagEl = chipsEl = liveEl = null;
    },
    /** 점검용(계약 밖) */
    _debug() { return { timers: timers.size, raf: (rafDraw ? 1 : 0) + (rafTween ? 1 : 0), playerPending: player.pending, disposed, aborted: ac.signal.aborted, run: !!ui.run, index: player.index, done: player.done, result: ui.result }; },
  };
}
