// 게임 공방(studio) 모드 — WP3. ModeInstance 계약(interfaces.js): enter / pause / resume / dispose.
//
// 화면
//  - 무대(stageSlot): 만들기/해보기 전환, 캔버스(WP4 createRenderer + createGameRuntime), 방향판(56px), 크게 보기, 결과 화면
//  - 편집(editorSlot): 규칙 카드(학년별 값 단계/수치) · 규칙 더하기/빼기 · 모습 바꾸기 · 실행 검사 · 새 게임 · 옛 게임
//  - 도움(assistSlot): AI로 바꾸기 — IME 안전 입력, 작품에 연결된 예시, 진행 상태, 적용 전 비교, 되돌리기
//  - 고정 영역(dockSlot): 해보기/멈추기 · 처음부터 · 되돌리기 · 저장
// 원칙
//  - 프로젝트는 store.applyPatch 로만 바꾼다(수동 편집도 revision이 오른다). 수동 편집은 사전 검사(preflight) 후 적용.
//  - AI 결과는 바로 적용하지 않는다: 검증 → 비교 화면 → 학생이 "적용" → store.applyPatch(baseRevision 일치할 때만).
//  - 실패·시간 초과·취소·네트워크 오류는 성공으로 바꾸지 않고, 지금 작품을 그대로 둔 채 다음 행동을 안내한다.
//  - 모든 리스너는 AbortController 하나, rAF·요청·runtime은 dispose에서 전부 해제.

import { createGameRuntime } from '../../shared/runtime/game-runtime.js';
import { createRenderer, createAssetResolver } from '../../shared/runtime/canvas-renderer.js';
import { legacyToProject } from '../../shared/compiler/legacy-dsl.js';
import { TEMPLATES } from '../../shared/templates/index.js';
import { createMockGenerationClient } from '../../mocks/generation-mock.js';
import { createTextInput } from '../../ui/text-input.js';
import {
  summarizeRules, lineOf, ruleSentence, setValueOps, removeRuleOps, setLookOps, addPresetOps, availablePresets,
  exampleChips, controlsLine,
} from './rules.js';
import {
  verifyProject, preflightEdit, decideAiResult, applyCandidate, aiStatusFor, keyToControl, isTypingTarget,
  endMessage, isLegacyOnly, newRequestId, AI_MESSAGES,
} from './flow.js';
import { oneLine } from './compare.js';
import { makeStudioProject, STUDIO_TEMPLATE_ORDER } from './catalog.js';

const CSS_ID = 'vc2-studio-css';
const SMOOTH_PREF = 'studio.smooth';
const PAD_PREF = 'studio.pad';
const STAT_CAP = 20000;

function injectCss() {
  if (typeof document === 'undefined' || document.getElementById(CSS_ID)) return;
  const link = document.createElement('link');
  link.id = CSS_ID; link.rel = 'stylesheet';
  link.href = new URL('./studio.css', import.meta.url).href;
  document.head.append(link);
}

/** 작은 DOM 도우미 (텍스트는 항상 textContent) */
function el(tag, attrs, ...kids) {
  const e = document.createElement(tag);
  if (attrs) for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') e.className = v;
    else if (k === 'dataset') Object.assign(e.dataset, v);
    else if (v === true) e.setAttribute(k, '');
    else e.setAttribute(k, String(v));
  }
  for (const c of kids.flat(3)) if (c != null && c !== false) e.append(c instanceof Node ? c : document.createTextNode(String(c)));
  return e;
}
const btn = (label, attrs = {}) => el('button', { type: 'button', class: 'v2-btn', ...attrs }, label);

/** 개발·검수용 훅: ?studioMock=invalid|providerDown|timeout|slow|success&studioMockDelay=ms, ?studioDebug=1 */
function devHooks() {
  try {
    const q = new URLSearchParams(globalThis.location?.search || '');
    const scenario = q.get('studioMock');
    const delay = Number(q.get('studioMockDelay'));
    return {
      mock: scenario ? { scenario: scenario === 'success' ? undefined : scenario, delayMs: Number.isFinite(delay) && delay > 0 ? delay : undefined } : null,
      debug: q.get('studioDebug') === '1',
    };
  } catch { return { mock: null, debug: false }; }
}

const firstLine = t => String(t ?? '').trim().split(/(?<=[.!?])\s/)[0];

const percentile = (arr, p) => {
  if (!arr.length) return null;
  const s = [...arr].sort((a, b) => a - b);
  return Math.round(s[Math.min(s.length - 1, Math.floor(p / 100 * s.length))] * 100) / 100;
};

/** @param {import('../../shared/contracts/interfaces.js').ModeContext & {openProject?:Function, goHome?:Function, save?:Function}} ctx */
export function createMode(ctx) {
  const { store, shell } = ctx;
  const grade = ctx.grade === 'high' ? 'high' : 'mid';
  const prefs = ctx.prefs || { get: () => null, set: () => {} };
  const hooks = devHooks();
  const generation = hooks.mock ? createMockGenerationClient(hooks.mock) : ctx.generation;
  const ac = new AbortController();
  const on = (t, type, fn, o = {}) => t.addEventListener(type, fn, { ...o, signal: ac.signal });
  const coarse = typeof matchMedia === 'function' && (matchMedia('(any-pointer: coarse)').matches || (navigator.maxTouchPoints || 0) > 0);

  let entered = false, disposed = false, unsub = null, ro = null;
  let runtime = null, renderer = null, resolver = null, snap = null;
  let rafId = 0, lastT = 0, frameNo = 0;
  const held = new Set();
  const stats = { intervals: [], work: [] };

  const ui = {
    phase: 'make',          // 'make' | 'play'
    started: false,         // 해보기에서 첫 조작/시작 버튼을 눌렀는지
    running: false,         // rAF로 step 중인지
    ended: null,            // 'won'|'lost'|'halted'
    big: false,             // 크게 보기
    pad: prefs.get(PAD_PREF) ?? coarse,
    smooth: !!prefs.get(SMOOTH_PREF),
    openLook: null,         // 모습 고르기가 열린 nodeId
    verify: { ok: true, hint: '' },
    editHint: null,         // {nodeId|null, text}
  };
  const ai = {
    req: null,              // 진행 중 요청 {projectId, baseRevision, requestId, jobId, abort, cancelled, text}
    compare: null,          // {patch, summary, baseRevision, text}
    note: null,             // {tone, text, actions:[{label, run}]}
    appliedRevision: null,  // AI 적용 직후 revision (바꾸기 전으로 버튼)
    lastText: '',
  };

  // DOM refs
  let stageEl, toolbarEl, canvasWrap, canvas, overlayEl, padEl, editorEl, assistEl, dockEl, liveEl;
  let segMake, segPlay, bigBtn, padBtn;
  let aiInput, aiChips, aiStatusEl, aiCompareEl, aiNoteEl;
  let dockPlay, dockRestart, dockUndo, dockSave;

  const project = () => store.getProject();
  const legacyOnly = () => isLegacyOnly(project());
  // 셸 안내는 한 번에 한 문장 (자세한 내용은 편집·도움 영역에 따로 보인다)
  const say = (text, tone = 'info', actions) => { try { shell.say?.({ text: firstLine(text), tone, actions }); } catch (e) { console.error(e); } };
  const announce = text => { if (liveEl) { liveEl.textContent = ''; liveEl.textContent = text; } };
  const layout = () => { try { return shell.getLayout?.() || null; } catch { return null; } };
  const showPane = k => { const l = layout(); if (l && l.layout !== 'three') shell.showPane?.(k); };

  // ── 실행기 ───────────────────────────────────────────
  function loadRuntime() {
    releaseAll();
    runtime?.dispose();
    runtime = null; snap = null;
    const p = project();
    resolver = createAssetResolver(p.assets, {});
    if (legacyOnly()) return;
    runtime = createGameRuntime();
    runtime.load(p.program, p.assets, (Math.random() * 2 ** 31) >>> 0);
    snap = runtime.snapshot();
  }

  function frame(t) {
    rafId = 0;
    if (disposed || !renderer) return;
    const t0 = performance.now();
    if (lastT) {
      const iv = t - lastT;
      if (ui.running && stats.intervals.length < STAT_CAP) stats.intervals.push(iv);
    }
    const dt = lastT ? t - lastT : 0;
    lastT = t;
    frameNo++;
    if (ui.running && runtime) {
      snap = runtime.step(dt);
      if (snap.state !== 'playing' && snap.state !== 'ready') onGameEnd(snap);
    }
    // 부드럽게 실행: 규칙(60Hz 고정 step)은 그대로, 그리기만 30fps
    const draw = !ui.smooth || !ui.running || frameNo % 2 === 0;
    if (draw && snap) renderer.render(snap, resolver);
    else if (draw && !snap) clearCanvas();
    if (ui.running && stats.work.length < STAT_CAP) stats.work.push(performance.now() - t0);
    if (ui.running) rafId = requestAnimationFrame(frame);
  }
  function requestDraw() { if (!rafId && !disposed) rafId = requestAnimationFrame(frame); }
  function clearCanvas() {
    const c = canvas?.getContext('2d'); if (!c) return;
    c.setTransform(1, 0, 0, 1, 0, 0); c.fillStyle = '#0E1116'; c.fillRect(0, 0, canvas.width, canvas.height);
  }

  function startGame() {
    if (!runtime || legacyOnly()) return;
    if (ui.ended) { runtime.reset((Math.random() * 2 ** 31) >>> 0); ui.ended = null; }
    ui.started = true; ui.running = true; lastT = 0;
    runtime.resume();
    renderOverlay(); renderDock();
    requestDraw();
    // 게임을 시작한 뒤에는 키보드가 바로 먹도록 무대에 초점 (버튼이 사라지면서 초점이 body로 빠지는 것 방지)
    if (document.activeElement === document.body || !document.activeElement || overlayEl?.contains(document.activeElement)) canvasWrap?.focus({ preventScroll: true });
  }
  function pauseGame(reason) {
    if (!ui.running) return;
    ui.running = false;
    releaseAll();
    runtime?.pause();
    if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
    renderOverlay(); renderDock();
    if (reason) announce(reason);
  }
  function restartGame(autostart = true) {
    if (!runtime) return;
    ui.ended = null;
    releaseAll();
    runtime.reset((Math.random() * 2 ** 31) >>> 0);
    snap = runtime.snapshot();
    ui.running = false; ui.started = false;
    if (autostart) startGame(); else { renderOverlay(); renderDock(); requestDraw(); }
  }
  function onGameEnd(s) {
    ui.running = false;
    ui.ended = s.state;
    releaseAll();
    const m = endMessage(s);
    announce(`${m.title} ${m.text}`);
    renderOverlay(); renderDock();
    if (s.state === 'halted') say(m.text, 'warn', [{ label: '마지막으로 잘 된 작품 열기', onClick: restoreLastGood }]);
  }

  function setPhase(phase) {
    if (phase === 'play' && legacyOnly()) { say('예전 게임은 새 무대에서 실행할 수 없어요.', 'warn'); return; }
    if (ui.phase === phase) { if (phase === 'play') showPane('stage'); return; }
    ui.phase = phase;
    if (phase === 'make') {
      pauseGame();
      if (runtime) { runtime.reset(); snap = runtime.snapshot(); }
      ui.started = false; ui.ended = null;
      if (ui.big) setBig(false);
    } else {
      ui.started = false; ui.ended = null;
      if (runtime) { runtime.reset((Math.random() * 2 ** 31) >>> 0); snap = runtime.snapshot(); }
      showPane('stage');
      shell.setStep?.('try');
      say(controlsLine(project()) || '방향키나 방향 버튼으로 움직여요.', 'info');  // 첫 문장(조작법)만 셸에, 전체는 무대 위 시작 안내에
    }
    stageEl.dataset.phase = phase;
    renderToolbar(); renderOverlay(); renderPad(); renderDock();
    requestDraw();
  }

  // ── 입력 ─────────────────────────────────────────────
  function press(control, pressed) {
    if (!runtime) return;
    if (pressed) {
      if (ui.phase !== 'play' || ui.ended) return;
      if (!ui.started) startGame();
      else if (!ui.running) return;            // 멈춤 중에는 입력 무시
      held.add(control);
    } else held.delete(control);
    runtime.input({ control, pressed });
  }
  function releaseAll() {
    for (const c of held) runtime?.input({ control: c, pressed: false });
    held.clear();
    runtime?.releaseAll?.();
    padEl?.querySelectorAll('[data-held]').forEach(b => b.removeAttribute('data-held'));
  }
  function modalOpen() { return !!document.querySelector('[aria-modal="true"]'); }

  function onKeyDown(e) {
    if (e.key === 'Escape' && ui.big) { setBig(false); e.preventDefault(); return; }
    const c = keyToControl(e);
    if (!c || ui.phase !== 'play' || isTypingTarget(e.target) || modalOpen()) return;
    e.preventDefault();                          // 방향키로 문서가 스크롤되지 않게
    if (e.repeat) return;                        // 눌림 상태로 이동 (반복 keydown 무시)
    press(c, true);
  }
  function onKeyUp(e) {
    const c = keyToControl(e) || ({ ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down', KeyA: 'left', KeyD: 'right', KeyW: 'up', KeyS: 'down' })[e.code];
    if (c && held.has(c)) press(c, false);
  }
  function onPadDown(e) {
    const b = e.target.closest?.('[data-control]'); if (!b) return;
    e.preventDefault();
    try { b.setPointerCapture(e.pointerId); } catch { /* 가상 포인터 */ }
    b.dataset.held = '';
    press(b.dataset.control, true);
  }
  function onPadUp(e) {
    const b = e.target.closest?.('[data-control]'); if (!b) return;
    b.removeAttribute('data-held');
    press(b.dataset.control, false);
  }

  // ── 편집 ─────────────────────────────────────────────
  function edit(operations, summary, nodeId = null) {
    const cur = project();
    const pf = preflightEdit(cur, operations, summary);
    if (!pf.ok) {
      ui.editHint = { nodeId, text: pf.hint };
      renderEditor();
      say(pf.hint, 'warn');
      return false;
    }
    const r = store.applyPatch(pf.patch, { source: 'ui' });
    if (!r.ok) {
      ui.editHint = { nodeId, text: r.diagnostics?.[0]?.studentHint || '바꿀 수 없어요.' };
      renderEditor();
      return false;
    }
    announce(summary);
    return true;
  }

  function restoreLastGood() {
    store.restoreLastGood();
    say('마지막으로 잘 된 작품으로 돌아왔어요.', 'success');
  }
  function undo() {
    if (!store.getState().canUndo) return;
    store.undo();
    announce('한 번 되돌렸어요');
  }

  // ── AI ───────────────────────────────────────────────
  async function submitAi(text) {
    if (disposed || ai.req) return;
    const cur = project();
    if (legacyOnly()) { setNote('warn', '예전 게임은 먼저 새 무대로 옮겨야 AI로 바꿀 수 있어요.'); return; }
    if (!generation) { setNote('warn', AI_MESSAGES.network); return; }
    const request = { projectId: cur.id, baseRevision: cur.revision, requestId: newRequestId(), jobId: null, abort: new AbortController(), cancelled: false, text };
    ai.req = request; ai.compare = null; ai.note = null; ai.lastText = text; ai.appliedRevision = null;
    aiInput.setBusy(true);
    shell.setAiStatus?.('preparing');
    renderAi(); setStatusText('AI에게 부탁했어요. 그동안 게임을 해 봐도 돼요.');
    let job = null, error = null;
    try {
      const j0 = await generation.start({ projectId: cur.id, baseRevision: cur.revision, intentText: text, mode: 'studio', requestId: request.requestId, project: cur });
      request.jobId = j0?.jobId || null;
      if (disposed || request !== ai.req) { cancelJob(request); return; }
      job = await generation.watch(request.jobId, j => {
        if (disposed || request !== ai.req) return;
        shell.setAiStatus?.(aiStatusFor(j.status));
        if (j.studentMessage) setStatusText(j.studentMessage);
      }, { signal: request.abort.signal, intervalMs: 150 });
    } catch (e) { error = e; }
    if (disposed || request !== ai.req) return;
    ai.req = null;
    aiInput.setBusy(false);
    handleDecision(decideAiResult({ job, error, request, current: project(), grade }), request);
  }

  function handleDecision(d, request) {
    setStatusText('');
    switch (d.action) {
      case 'ignore':
        shell.setAiStatus?.('idle');
        break;
      case 'compare':
        ai.compare = { patch: d.patch, summary: d.summary, baseRevision: d.patch.baseRevision, text: request.text, message: d.message };
        shell.setAiStatus?.('done');
        showPane('assist');
        say(oneLine(d.summary), 'info');
        break;
      case 'conflict':
        shell.setAiStatus?.('idle');
        setNote('warn', d.message, [{ label: '다시 요청하기', run: () => submitAi(request.text) }]);
        say(d.message, 'warn');
        break;
      case 'cancelled': case 'superseded':
        shell.setAiStatus?.('idle');
        setNote('info', d.message);
        break;
      default: // failed · timeout · network · reject
        shell.setAiStatus?.('failed');
        setNote('warn', d.message, [
          { label: '다시 부탁하기', run: () => submitAi(request.text) },
          { label: '직접 규칙 바꾸기', run: () => { showPane('editor'); editorEl.querySelector('.st-rule button, .st-rule input')?.focus(); } },
        ]);
        say(firstLine(d.message), 'warn');
    }
    renderAi();
  }

  function cancelJob(request) {
    if (!request) return;
    request.cancelled = true;
    try { request.abort.abort(); } catch { /* 이미 */ }
    if (request.jobId) Promise.resolve().then(() => generation?.cancel(request.jobId, request.requestId)).catch(() => {});
  }
  function cancelAi() {
    const r = ai.req; if (!r) return;
    ai.req = null;
    cancelJob(r);
    aiInput?.setBusy(false);
    shell.setAiStatus?.('idle');
    setNote('info', AI_MESSAGES.cancelled);
    renderAi();
  }
  function applyAi() {
    const c = ai.compare; if (!c) return;
    const r = applyCandidate(store, c.patch);
    ai.compare = null;
    if (!r.ok) {
      setNote('warn', r.message, r.conflict ? [{ label: '다시 요청하기', run: () => submitAi(c.text) }] : []);
      shell.setAiStatus?.('idle');
      say(r.message, 'warn');
      renderAi();
      return;
    }
    ai.appliedRevision = r.revision;
    shell.setAiStatus?.('idle');
    setNote('success', '바꿨어요. 해보기로 확인해 봐요.', [{ label: '바꾸기 전으로', run: undoAi }, { label: '▶ 해보기', run: () => setPhase('play') }]);
    renderAi();
  }
  function declineAi() {
    ai.compare = null;
    shell.setAiStatus?.('idle');
    setNote('info', '바꾸지 않았어요. 지금 작품 그대로예요.');
    renderAi();
  }
  function undoAi() {
    if (ai.appliedRevision !== project().revision) return;
    store.undo();
    ai.appliedRevision = null;
    setNote('info', 'AI가 바꾸기 전으로 돌아왔어요.');
    renderAi();
  }
  function setNote(tone, text, actions = []) { ai.note = { tone, text, actions }; renderAi(); }
  function setStatusText(t) { if (aiStatusEl) aiStatusEl.textContent = t; }

  // ── store 구독 ───────────────────────────────────────
  function onStore(ev) {
    if (disposed) return;
    if (ev.type === 'saveState') { renderDock(); return; }
    if (ev.type === 'lastGood') return;
    if (ev.type === 'patchRejected') return;
    if (ev.type !== 'changed' && ev.type !== 'loaded') return;
    // 작품이 바뀌었다: 실행기를 새 규칙으로, 해보기는 처음 상태로
    const wasPlay = ui.phase === 'play';
    pauseGame();
    loadRuntime();
    ui.started = false; ui.ended = null;
    ui.editHint = null;
    // 비교 화면이 떠 있는데 작품이 바뀌면 그 후보는 더 이상 적용할 수 없다
    if (ai.compare && ai.compare.baseRevision !== project().revision) {
      const text = ai.compare.text;
      ai.compare = null;
      shell.setAiStatus?.('idle');
      setNote('warn', AI_MESSAGES.conflict, [{ label: '다시 요청하기', run: () => submitAi(text) }]);
    }
    runVerify(ev);
    if (ev.source === 'ui' || ev.source === 'ai') shell.setStep?.('change');
    if (wasPlay && !legacyOnly()) say('바뀐 게임이에요 — 시작하기를 눌러 다시 해 봐요.', 'info');
    renderAll();
  }

  function runVerify(ev) {
    const p = project();
    if (legacyOnly()) { ui.verify = { ok: false, legacy: true, hint: '예전 게임은 새 무대로 옮기면 실행할 수 있어요.' }; return; }
    const v = verifyProject(p);
    ui.verify = { ok: v.ok, hint: v.hint };
    if (v.ok) store.markRunnable(p.revision);
    else if (ev) say(v.hint || '게임이 제대로 안 돌아가요.', 'warn', [{ label: '마지막으로 잘 된 작품 열기', onClick: restoreLastGood }]);
  }

  // ── 렌더: 무대 ───────────────────────────────────────
  function buildStage(slot) {
    segMake = btn('✏️ 만들기', { class: 'v2-seg__btn st-seg__btn', 'data-phase-btn': 'make' });
    segPlay = btn('▶ 해보기', { class: 'v2-seg__btn st-seg__btn', 'data-phase-btn': 'play' });
    padBtn = btn('🎮 방향 버튼', { class: 'v2-btn st-toolbtn', 'aria-pressed': 'false', title: '화면에 방향 버튼 보이기' });
    bigBtn = btn('⤢ 크게 보기', { class: 'v2-btn st-toolbtn', 'aria-pressed': 'false' });
    toolbarEl = el('div', { class: 'st-toolbar' },
      el('div', { class: 'v2-seg st-seg', role: 'group', 'aria-label': '만들기 또는 해보기' }, segMake, segPlay),
      el('div', { class: 'st-toolbar__right' }, padBtn, bigBtn));
    canvas = el('canvas', { class: 'st-canvas', role: 'img', 'aria-label': '게임 무대' });
    overlayEl = el('div', { class: 'st-overlay', hidden: true });
    canvasWrap = el('div', { class: 'st-canvaswrap', tabindex: '-1' }, canvas, overlayEl);
    padEl = el('div', { class: 'st-pad', role: 'group', 'aria-label': '방향 버튼', hidden: true });
    stageEl = el('div', { class: 'st-stage', 'data-phase': 'make' }, toolbarEl, canvasWrap, padEl);
    slot.append(stageEl);

    on(segMake, 'click', () => setPhase('make'));
    on(segPlay, 'click', () => setPhase('play'));
    on(bigBtn, 'click', () => setBig(!ui.big));
    on(padBtn, 'click', () => { ui.pad = !ui.pad; prefs.set(PAD_PREF, ui.pad); renderPad(); renderToolbar(); });
    on(overlayEl, 'click', e => { const b = e.target.closest('[data-act]'); if (b) overlayAct(b.dataset.act); });
    on(padEl, 'pointerdown', onPadDown);
    on(padEl, 'pointerup', onPadUp);
    on(padEl, 'pointercancel', onPadUp);
    on(padEl, 'lostpointercapture', onPadUp);
    on(padEl, 'contextmenu', e => e.preventDefault());
    renderer = createRenderer(canvas, { dprMax: ui.smooth ? 1 : 2 });
    if (typeof ResizeObserver === 'function') { ro = new ResizeObserver(() => requestDraw()); ro.observe(canvasWrap); }
    else on(window, 'resize', requestDraw);
  }

  function setBig(b) {
    ui.big = b;
    stageEl.dataset.big = String(b);
    document.documentElement.classList.toggle('st-big-open', b);
    renderToolbar();
    requestDraw();
    if (b) bigBtn.focus();
  }

  function renderToolbar() {
    if (!toolbarEl) return;
    segMake.setAttribute('aria-pressed', String(ui.phase === 'make'));
    segPlay.setAttribute('aria-pressed', String(ui.phase === 'play'));
    segPlay.disabled = legacyOnly();
    padBtn.setAttribute('aria-pressed', String(!!ui.pad));
    padBtn.hidden = ui.phase !== 'play';
    bigBtn.setAttribute('aria-pressed', String(ui.big));
    bigBtn.textContent = ui.big ? '✕ 작게 보기' : '⤢ 크게 보기';
  }

  function renderPad() {
    if (!padEl) return;
    const player = project().program.nodes.find(n => n.kind === 'player');
    const four = player?.args.movement === 'fourWay';
    const show = ui.phase === 'play' && !!ui.pad && !!runtime;
    padEl.hidden = !show;
    padEl.dataset.layout = four ? 'four' : 'two';
    const want = four ? ['left', 'up', 'down', 'right'] : ['left', 'right'];
    const have = [...padEl.children].map(b => b.dataset.control);
    if (JSON.stringify(have) === JSON.stringify(want)) return;
    const LABEL = { left: ['◀', '왼쪽'], right: ['▶', '오른쪽'], up: ['▲', '위'], down: ['▼', '아래'] };
    padEl.replaceChildren(...want.map(c => el('button', { type: 'button', class: 'st-padbtn', 'data-control': c, 'aria-label': LABEL[c][1] }, LABEL[c][0])));
  }

  function overlayAct(act) {
    if (act === 'start') startGame();
    else if (act === 'resume') { if (runtime) { ui.running = true; lastT = 0; runtime.resume(); renderOverlay(); renderDock(); requestDraw(); canvasWrap.focus({ preventScroll: true }); } }
    else if (act === 'again') restartGame(true);
    else if (act === 'make') setPhase('make');
    else if (act === 'play') setPhase('play');
    else if (act === 'lastGood') restoreLastGood();
    else if (act === 'legacy') { showPane('editor'); editorEl.querySelector('.st-legacy button')?.focus(); }
  }

  function renderOverlay() {
    if (!overlayEl) return;
    const box = (title, text, actions, tone = 'info') => {
      overlayEl.hidden = false;
      overlayEl.dataset.tone = tone;
      overlayEl.replaceChildren(el('div', { class: 'st-overlay__box', role: tone === 'end' ? 'status' : null },
        title ? el('p', { class: 'st-overlay__title' }, title) : null,
        text ? el('p', { class: 'st-overlay__text' }, text) : null,
        actions.length ? el('div', { class: 'v2-btnrow st-overlay__btns' }, actions.map(([label, act, primary]) =>
          btn(label, { class: 'v2-btn' + (primary ? ' v2-btn--primary' : ''), 'data-act': act }))) : null));
    };
    if (legacyOnly()) return box('예전에 만든 게임이에요', '새 무대에서는 바로 실행할 수 없어요. 옮길 수 있는 규칙을 편집 영역에서 확인해 봐요.', [['옮길 수 있는 규칙 보기', 'legacy', true]]);
    if (!runtime) { overlayEl.hidden = true; return; }
    if (ui.phase === 'make') return box(null, null, [['▶ 해보기', 'play', true]], 'ghost');
    if (ui.ended) {
      const m = endMessage(snap);
      const acts = [['↺ 다시 하기', 'again', true], ['✏️ 만들기로', 'make']];
      if (ui.ended === 'halted') acts.push(['마지막으로 잘 된 작품 열기', 'lastGood']);
      return box(m.title, m.text, acts, 'end');
    }
    if (!ui.started) return box('준비됐나요?', controlsLine(project()), [['시작하기', 'start', true]]);
    if (!ui.running) return box('잠깐 멈췄어요', '계속하려면 아래 버튼을 눌러요.', [['▶ 계속하기', 'resume', true], ['↺ 처음부터', 'again']]);
    overlayEl.hidden = true;
  }

  // ── 렌더: 편집 ───────────────────────────────────────
  function focusKeyOf(node) { return node?.closest?.('[data-fk]')?.dataset.fk || null; }
  function restoreFocus(key) {
    if (!key) return;
    const t = editorEl.querySelector(`[data-fk="${CSS.escape(key)}"]`);
    if (t) t.focus({ preventScroll: true });
  }

  function renderEditor() {
    if (!editorEl) return;
    const fk = editorEl.contains(document.activeElement) ? focusKeyOf(document.activeElement) : null;
    const p = project();
    const parts = [];
    parts.push(el('div', { class: 'st-edhead' },
      el('h2', { class: 'st-h2' }, '게임 규칙'),
      el('p', { class: 'v2-hint' }, grade === 'high' ? '값을 바꾸면 바로 게임에 들어가요. 수치를 직접 정할 수 있어요.' : '버튼을 눌러 바꾸면 바로 게임에 들어가요.')));

    if (legacyOnly()) parts.push(legacySection(p));
    else {
      const cards = summarizeRules(p, grade);
      parts.push(el('ol', { class: 'st-rules' }, cards.map(c => ruleCard(c, p))));
      if (ui.editHint && !ui.editHint.nodeId) parts.push(el('p', { class: 'st-edithint', role: 'alert' }, '⚠️ ' + ui.editHint.text));
      const presets = availablePresets(p);
      if (presets.length) {
        parts.push(el('section', { class: 'st-section', 'aria-labelledby': 'st-add-h' },
          el('h3', { class: 'st-h3', id: 'st-add-h' }, '규칙 더하기'),
          el('div', { class: 'st-addlist' }, presets.map(pr => btn(`${pr.icon} ${pr.label}`, { class: 'v2-btn st-addbtn', 'data-fk': 'add:' + pr.id, 'data-add': pr.id })))));
      }
      parts.push(verifySection());
      const legacyNode = p.program.nodes.find(n => n.kind === 'legacySource');
      if (legacyNode) parts.push(el('details', { class: 'st-section st-legacysrc' }, el('summary', null, '📜 예전 코드 원문 보기'), el('pre', { class: 'st-pre' }, legacyNode.args.source)));
    }
    parts.push(el('details', { class: 'st-section st-new' },
      el('summary', { 'data-fk': 'new' }, '🆕 새 게임 만들기'),
      el('p', { class: 'v2-hint' }, '지금 작품은 저장되고, 새 작품이 열려요.'),
      el('div', { class: 'st-newlist' }, STUDIO_TEMPLATE_ORDER.map(id => btn(`${TEMPLATES[id].icon} ${TEMPLATES[id].title}`, { class: 'v2-btn st-newbtn', 'data-new': id, 'data-fk': 'new:' + id })))));
    parts.push(el('details', { class: 'st-section st-settings' },
      el('summary', { 'data-fk': 'settings' }, '⚙️ 실행 설정'),
      el('div', { class: 'v2-seg', role: 'group', 'aria-label': '실행 방식' },
        btn('보통으로 실행', { class: 'v2-seg__btn', 'aria-pressed': String(!ui.smooth), 'data-smooth': '0', 'data-fk': 'smooth:0' }),
        btn('부드럽게 실행', { class: 'v2-seg__btn', 'aria-pressed': String(ui.smooth), 'data-smooth': '1', 'data-fk': 'smooth:1' })),
      el('p', { class: 'v2-hint' }, '느린 기기에서는 "부드럽게 실행"을 골라요. 그림만 덜 그리고 게임 규칙·속도는 그대로예요.')));
    const openDetails = [...editorEl.querySelectorAll('details[open]')].map(d => d.className);
    editorEl.replaceChildren(...parts, liveEl);
    for (const cls of openDetails) editorEl.querySelector(`details.${cls.split(' ').join('.')}`)?.setAttribute('open', '');
    restoreFocus(fk);
  }

  function ruleCard(c, p) {
    const node = p.program.nodes.find(n => n.id === c.nodeId);
    const head = el('div', { class: 'st-rule__head' },
      el('p', { class: 'st-rule__text' }, lineOf(c)),
      el('div', { class: 'st-rule__tools' },
        c.look ? btn('모습 바꾸기', { class: 'v2-btn v2-btn--small st-lookbtn', 'aria-expanded': String(ui.openLook === c.nodeId), 'data-look': c.nodeId, 'data-fk': 'look:' + c.nodeId }) : null,
        c.removable ? btn('빼기', { class: 'v2-btn v2-btn--small st-rmbtn', 'data-remove': c.nodeId, 'data-fk': 'rm:' + c.nodeId, 'aria-label': `규칙 빼기: ${c.text}` }) : null));
    const ctls = c.controls.map(ctl => controlEl(node, ctl));
    const looks = c.look && ui.openLook === c.nodeId
      ? el('div', { class: 'st-looks', role: 'group', 'aria-label': '모습 고르기' }, c.look.choices.map(e =>
        el('button', { type: 'button', class: 'st-lookopt', 'aria-pressed': String(e === c.look.current), 'data-lookset': c.nodeId, 'data-emoji': e, 'data-fk': `lk:${c.nodeId}:${e}`, 'aria-label': `모습 ${e}` }, e)))
      : null;
    const hint = ui.editHint?.nodeId === c.nodeId ? el('p', { class: 'st-edithint', role: 'alert' }, '⚠️ ' + ui.editHint.text) : null;
    return el('li', { class: 'st-rule', 'data-kind': c.kind, 'data-node': c.nodeId }, head, ctls.length ? el('div', { class: 'st-rule__ctls' }, ctls) : null, looks, hint);
  }

  function controlEl(node, ctl) {
    const key = `${node.id}.${ctl.param}`;
    const labelId = 'st-l-' + key.replace(/[^a-z0-9]/gi, '_');
    const label = el('span', { class: 'st-ctl__label', id: labelId }, ctl.label);
    if (ctl.kind === 'steps' || ctl.kind === 'choice') {
      const same = v => JSON.stringify(v) === JSON.stringify(ctl.value);
      return el('div', { class: 'st-ctl' }, label,
        el('div', { class: 'v2-seg st-steps', role: 'group', 'aria-labelledby': labelId },
          ctl.options.map((o, i) => btn(o.label, { class: 'v2-seg__btn', 'aria-pressed': String(same(o.value)), 'data-set': key, 'data-idx': i, 'data-fk': `${key}:${i}` }))),
        ctl.kind === 'steps' && !ctl.options.some(o => same(o.value)) ? el('span', { class: 'v2-hint' }, `지금: ${ctl.display}`) : null);
    }
    // range (high)
    const out = el('output', { class: 'st-ctl__value', for: labelId + '-r' }, ctl.display);
    const range = el('input', { type: 'range', class: 'st-range', id: labelId + '-r', min: ctl.min, max: ctl.max, step: ctl.step, value: ctl.value, 'aria-labelledby': labelId, 'data-range': key, 'data-fk': key + ':r' });
    return el('div', { class: 'st-ctl st-ctl--range' }, label,
      el('div', { class: 'st-rangerow' },
        btn('−', { class: 'v2-btn st-stepbtn', 'data-bump': key, 'data-dir': '-1', 'aria-label': `${ctl.label} 줄이기`, 'data-fk': key + ':-' }),
        range,
        btn('+', { class: 'v2-btn st-stepbtn', 'data-bump': key, 'data-dir': '1', 'aria-label': `${ctl.label} 늘리기`, 'data-fk': key + ':+' }),
        out));
  }

  function controlByKey(key) {
    const [nodeId, param] = key.split('.');
    const card = summarizeRules(project(), grade).find(c => c.nodeId === nodeId);
    return { nodeId, param, ctl: card?.controls.find(c => c.param === param) };
  }

  function onEditorClick(e) {
    const t = e.target.closest('button'); if (!t || !editorEl.contains(t)) return;
    const d = t.dataset;
    if (d.set) {
      const { nodeId, param, ctl } = controlByKey(d.set);
      const opt = ctl?.options[+d.idx]; if (!opt) return;
      edit(setValueOps(project(), nodeId, param, opt.value), `${ctl.label}: ${opt.label}`, nodeId);
    } else if (d.bump) {
      const { nodeId, param, ctl } = controlByKey(d.bump); if (!ctl) return;
      const v = Math.max(ctl.min, Math.min(ctl.max, ctl.value + Number(d.dir) * ctl.step));
      if (v !== ctl.value) edit(setValueOps(project(), nodeId, param, v), `${ctl.label}: ${v}`, nodeId);
    } else if (d.look) {
      ui.openLook = ui.openLook === d.look ? null : d.look;
      renderEditor();
    } else if (d.lookset) {
      ui.openLook = null;
      edit(setLookOps(project(), d.lookset, d.emoji), `모습을 ${d.emoji}로 바꿨어요`, d.lookset);
    } else if (d.remove) {
      const n = project().program.nodes.find(x => x.id === d.remove);
      const s = n ? lineOf(ruleSentence(n, project(), grade)) : '';
      if (edit(removeRuleOps(project(), d.remove), '규칙을 뺐어요', d.remove)) say(`뺐어요: ${s} (되돌리기로 다시 가져올 수 있어요)`, 'info');
    } else if (d.add) {
      if (edit(addPresetOps(project(), d.add), '규칙을 더했어요')) say('새 규칙을 더했어요 — 해보기로 확인해 봐요.', 'success');
    } else if (d.new) {
      openNew(d.new);
    } else if (d.smooth !== undefined) {
      setSmooth(d.smooth === '1');
    } else if (d.convert) {
      convertLegacy();
    } else if (d.lastgood) {
      restoreLastGood();
    }
  }
  function onEditorChange(e) {
    const r = e.target.closest?.('[data-range]'); if (!r) return;
    const { nodeId, param, ctl } = controlByKey(r.dataset.range); if (!ctl) return;
    const v = Number(r.value);
    if (v !== ctl.value) edit(setValueOps(project(), nodeId, param, v), `${ctl.label}: ${v}`, nodeId);
  }
  function onEditorInput(e) {
    const r = e.target.closest?.('[data-range]'); if (!r) return;
    const out = r.parentElement.querySelector('output');
    const { ctl } = controlByKey(r.dataset.range);
    if (out && ctl) out.textContent = ctl.unit === 'ms' ? `${Math.round(Number(r.value) / 100) / 10}초` : `${r.value}${ctl.unit === 'px/초' ? '' : ctl.unit || ''}`;
  }

  function verifySection() {
    const v = ui.verify;
    if (v.ok) return el('p', { class: 'st-verify', 'data-ok': 'true', role: 'status' }, '✅ 실행 검사 통과 — 5초 동안 미리 돌려 봤어요.');
    return el('div', { class: 'st-verify', 'data-ok': 'false', role: 'alert' },
      el('p', null, '⚠️ ' + (v.hint || '게임이 제대로 안 돌아가요.')),
      v.legacy ? null : btn('마지막으로 잘 된 작품 열기', { class: 'v2-btn', 'data-lastgood': '1', 'data-fk': 'lastgood' }));
  }

  function setSmooth(b) {
    ui.smooth = b;
    prefs.set(SMOOTH_PREF, b);
    renderer?.dispose();
    renderer = createRenderer(canvas, { dprMax: b ? 1 : 2 });
    renderEditor();
    requestDraw();
    say(b ? '부드럽게 실행으로 바꿨어요(게임 규칙은 그대로예요).' : '보통으로 실행해요.', 'info');
  }

  function openNew(templateId) {
    if (typeof ctx.openProject !== 'function') { say('새 게임은 처음 화면에서 만들 수 있어요.', 'info'); return; }
    let p;
    try { p = makeStudioProject(templateId); } catch (e) { console.error(e); say('그 게임 틀을 열지 못했어요.', 'warn'); return; }
    ctx.openProject(p);
  }

  // 옛 게임 ─ 변환 가능한 부분을 보여 주고, 원문은 항상 보존한다
  let legacyCache = null;
  function legacyInfo(p) {
    const src = p.program.nodes.find(n => n.kind === 'legacySource')?.args.source || '';
    if (legacyCache?.src === src) return legacyCache.info;
    const info = legacyToProject(src, { title: (p.title + ' (새 무대)').slice(0, 40) });
    legacyCache = { src, info };
    return info;
  }
  function legacySection(p) {
    const src = p.program.nodes.find(n => n.kind === 'legacySource')?.args.source || '';
    const info = legacyInfo(p);
    const ok = info.converted && !info.diagnostics.some(d => d.severity === 'error') && verifyProject(info.project).ok;
    const hints = [...new Set(info.diagnostics.filter(d => d.severity === 'warning' && d.studentHint && !['LEGACY_SOURCE_KEPT'].includes(d.code)).map(d => d.studentHint))].slice(0, 4);
    return el('section', { class: 'st-section st-legacy', 'aria-labelledby': 'st-leg-h' },
      el('h3', { class: 'st-h3', id: 'st-leg-h' }, '📜 예전에 만든 게임이에요'),
      el('p', null, '원래 코드는 지우지 않고 그대로 보관해요. 이 화면에서는 읽기만 할 수 있어요.'),
      ok ? el('div', null,
        el('p', { class: 'st-h4' }, '새 무대로 옮길 수 있는 규칙'),
        el('ul', { class: 'st-list' }, summarizeRules(info.project, grade).filter(c => c.kind !== 'legacySource').map(c => el('li', null, lineOf(c)))),
        hints.length ? el('ul', { class: 'st-list st-list--muted' }, hints.map(t => el('li', null, t))) : null,
        btn('새 무대 작품으로 옮기기 (원본은 그대로)', { class: 'v2-btn v2-btn--primary', 'data-convert': '1', 'data-fk': 'convert' }))
        : el('p', { class: 'st-verify', 'data-ok': 'false' }, '⚠️ 새 무대로 옮길 수 있는 규칙을 찾지 못했어요. 원문은 그대로 보관돼요. 아래 "새 게임 만들기"로 비슷한 게임을 만들어 볼 수 있어요.'),
      el('details', { class: 'st-legacysrc', open: true }, el('summary', null, '원문 코드 (읽기 전용)'), el('pre', { class: 'st-pre', tabindex: '0' }, src)));
  }
  function convertLegacy() {
    const info = legacyInfo(project());
    if (!info.converted || typeof ctx.openProject !== 'function') return;
    ctx.openProject(info.project);
  }

  // ── 렌더: AI ─────────────────────────────────────────
  function buildAssist(slot) {
    aiInput = createTextInput({
      label: '어떻게 바꾸고 싶어요?',
      placeholder: '예) 생선이 조금 더 천천히 떨어지게',
      submitLabel: 'AI에게 부탁하기',
      cancelLabel: '그만하기',
      maxLength: 300,
      onSubmit: text => { submitAi(text); },
      onCancel: cancelAi,
    });
    aiChips = el('div', { class: 'st-chips', role: 'group', 'aria-label': '이렇게 말해 볼 수 있어요' });
    aiStatusEl = el('p', { class: 'st-ai__status', role: 'status', 'aria-live': 'polite' });
    aiCompareEl = el('section', { class: 'st-compare', hidden: true, 'aria-labelledby': 'st-cmp-h', tabindex: '-1' });
    aiNoteEl = el('div', { class: 'st-note', hidden: true });
    assistEl = el('div', { class: 'st-ai' },
      el('h2', { class: 'st-h2' }, '🤖 AI로 바꾸기'),
      el('p', { class: 'v2-hint' }, '한 번에 한 가지씩 말해 봐요. 바꾸기 전에 무엇이 바뀌는지 먼저 보여 줄게요.'),
      aiChips, aiInput.el, aiStatusEl, aiCompareEl, aiNoteEl);
    slot.append(assistEl);
    on(aiChips, 'click', e => {
      const b = e.target.closest('[data-chip]'); if (!b) return;
      aiInput.value = b.dataset.chip;
      aiInput.focus();
    });
    on(aiCompareEl, 'click', e => {
      const b = e.target.closest('[data-cmp]'); if (!b) return;
      if (b.dataset.cmp === 'apply') applyAi(); else declineAi();
    });
    on(aiNoteEl, 'click', e => {
      const b = e.target.closest('[data-note]'); if (!b) return;
      ai.note?.actions?.[+b.dataset.note]?.run();
    });
  }

  function renderAi() {
    if (!assistEl) return;
    const chips = exampleChips(project());
    const have = [...aiChips.children].map(c => c.dataset.chip);
    if (JSON.stringify(have) !== JSON.stringify(chips)) {
      aiChips.replaceChildren(...chips.map(t => btn(t, { class: 'v2-btn v2-btn--small st-chip', 'data-chip': t })));
    }
    aiChips.hidden = !chips.length || legacyOnly();
    const c = ai.compare;
    if (c) {
      const s = c.summary;
      const list = (title, items, cls) => items.length ? [el('h4', { class: 'st-h4' }, title), el('ul', { class: 'st-list ' + cls }, items.map(t => el('li', null, t)))] : [];
      aiCompareEl.hidden = false;
      aiCompareEl.replaceChildren(
        el('h3', { class: 'st-h3', id: 'st-cmp-h' }, 'AI가 이렇게 바꾸려고 해요'),
        c.message ? el('p', { class: 'v2-hint' }, `“${c.text}” → ${c.message}`) : null,
        ...list('바뀔 것', s.changed, 'st-list--changed'),
        ...list('더해질 것', s.added, 'st-list--added'),
        ...list('빠질 것', s.removed, 'st-list--removed'),
        ...list('그대로인 것', s.kept.concat(s.keptMore ? [`… 그 밖에 ${s.keptMore}가지`] : []), 'st-list--kept'),
        el('div', { class: 'v2-btnrow st-compare__btns' },
          btn('적용하기', { class: 'v2-btn v2-btn--primary', 'data-cmp': 'apply' }),
          btn('안 할래', { class: 'v2-btn', 'data-cmp': 'decline' })));
      if (!aiCompareEl.contains(document.activeElement) && !assistEl.querySelector('textarea:focus')) {
        aiCompareEl.focus({ preventScroll: false });
        aiCompareEl.querySelector('.st-compare__btns')?.scrollIntoView({ block: 'nearest' });   // 적용/안 할래가 고정 영역에 가리지 않게
      }
    } else {
      aiCompareEl.hidden = true;
      aiCompareEl.replaceChildren();
    }
    const n = ai.note;
    if (n && !c) {
      aiNoteEl.hidden = false;
      aiNoteEl.dataset.tone = n.tone;
      aiNoteEl.setAttribute('role', n.tone === 'warn' ? 'alert' : 'status');
      aiNoteEl.replaceChildren(el('p', null, (n.tone === 'warn' ? '⚠️ ' : n.tone === 'success' ? '✅ ' : '💬 ') + n.text),
        n.actions?.length ? el('div', { class: 'v2-btnrow' }, n.actions.map((a, i) => btn(a.label, { class: 'v2-btn v2-btn--small', 'data-note': i }))) : null);
    } else { aiNoteEl.hidden = true; aiNoteEl.replaceChildren(); }
    // "바꾸기 전으로"는 AI 적용 직후 상태일 때만
    if (n?.tone === 'success' && ai.appliedRevision !== project().revision) { ai.note = null; aiNoteEl.hidden = true; }
  }

  // ── 렌더: 고정 영역 ──────────────────────────────────
  function buildDock() {
    const slot = shell.dockSlot?.();
    if (!slot) return;
    dockPlay = btn('▶ 해보기', { class: 'v2-btn v2-btn--primary st-dockbtn', 'data-dock': 'play' });
    dockRestart = btn('↺ 처음부터', { class: 'v2-btn st-dockbtn', 'data-dock': 'restart' });
    dockUndo = btn('↶ 되돌리기', { class: 'v2-btn st-dockbtn', 'data-dock': 'undo' });
    dockSave = typeof ctx.save === 'function'
      ? btn('💾 저장', { class: 'v2-btn st-dockbtn', 'data-dock': 'save' })
      : el('span', { class: 'st-savechip', role: 'status' });
    dockEl = el('div', { class: 'st-dock' }, dockPlay, dockRestart, dockUndo, dockSave);
    slot.append(dockEl);
    on(dockEl, 'click', e => {
      const b = e.target.closest('[data-dock]'); if (!b) return;
      const a = b.dataset.dock;
      if (a === 'play') {
        if (ui.phase !== 'play') setPhase('play');
        else if (ui.running) pauseGame('멈췄어요');
        else if (ui.ended) restartGame(true);
        else if (ui.started) overlayAct('resume');
        else startGame();
      } else if (a === 'restart') { if (ui.phase !== 'play') setPhase('play'); restartGame(true); }
      else if (a === 'undo') undo();
      else if (a === 'save') Promise.resolve(ctx.save()).catch(err => { console.error(err); say('저장하지 못했어요 — 작품은 화면에 그대로 있어요.', 'warn'); });
    });
  }

  function renderDock() {
    if (!dockEl) return;
    const legacy = legacyOnly();
    let label = '▶ 해보기';
    if (ui.phase === 'play') label = ui.running ? '⏸ 멈추기' : ui.ended ? '↺ 다시 하기' : ui.started ? '▶ 계속하기' : '▶ 시작하기';
    dockPlay.textContent = label;
    dockPlay.disabled = legacy;
    dockRestart.disabled = legacy;
    dockUndo.disabled = !store.getState().canUndo;
    if (!(dockSave instanceof HTMLButtonElement)) {
      const s = store.getState().saveState;
      dockSave.textContent = s === 'savedLocal' || s === 'savedClass' ? '💾 저장됨' : s === 'saving' ? '💾 저장 중' : s === 'error' ? '⚠️ 저장 안 됨' : '💾 자동 저장';
    }
  }

  function renderAll() {
    renderToolbar(); renderOverlay(); renderPad(); renderEditor(); renderAi(); renderDock();
    requestDraw();
  }

  // ── 생명주기 ─────────────────────────────────────────
  const api = {
    enter(root) {
      if (entered) throw new Error('studio mode: enter twice');
      entered = true;
      injectCss();
      const stageSlot = shell.stageSlot?.() || root;
      const editorSlot = shell.editorSlot?.() || root;
      const assistSlot = shell.assistSlot?.() || root;
      liveEl = el('p', { class: 'v2-visually-hidden', 'aria-live': 'polite' });
      buildStage(stageSlot);
      editorEl = el('div', { class: 'st-editor' });
      editorSlot.append(editorEl);
      on(editorEl, 'click', onEditorClick);
      on(editorEl, 'change', onEditorChange);
      on(editorEl, 'input', onEditorInput);
      buildAssist(assistSlot);
      buildDock();
      on(window, 'keydown', onKeyDown);
      on(window, 'keyup', onKeyUp);
      on(window, 'blur', releaseAll);
      on(document, 'visibilitychange', () => { if (document.hidden) { releaseAll(); pauseGame(); } });
      unsub = store.subscribe(onStore);
      loadRuntime();
      runVerify(null);
      shell.setStep?.('try');
      say(legacyOnly() ? '예전에 만든 게임이에요 — 옮길 수 있는 규칙을 확인해 봐요.' : '먼저 ▶ 해보기로 게임을 해 보고, 규칙을 바꿔 봐요.', 'info');
      renderAll();
      if (hooks.debug) globalThis.__vibeStudio = { debug: api._debug, resetStats: api._resetStats, store };
    },
    pause() { pauseGame(); releaseAll(); },
    resume() { renderOverlay(); requestDraw(); },   // 자동으로 다시 달리지 않는다: "계속하기"로 이어서
    dispose() {
      if (disposed) return;
      disposed = true;
      if (ai.req) { const r = ai.req; ai.req = null; cancelJob(r); }   // 다른 작품으로 가도 결과가 적용되지 않게
      try { shell.setAiStatus?.('idle'); } catch { /* 셸이 먼저 닫힘 */ }
      if (rafId) cancelAnimationFrame(rafId);
      rafId = 0;
      releaseAll();
      runtime?.dispose(); runtime = null;
      renderer?.dispose(); renderer = null;
      ac.abort();
      ro?.disconnect(); ro = null;
      unsub?.(); unsub = null;
      aiInput?.destroy();
      document.documentElement.classList.remove('st-big-open');
      stageEl?.remove(); editorEl?.remove(); assistEl?.remove(); dockEl?.remove();
      stageEl = editorEl = assistEl = dockEl = canvas = null;
      if (hooks.debug && globalThis.__vibeStudio?.store === store) delete globalThis.__vibeStudio;
    },
    /** 테스트·점검용 (계약 밖) */
    _debug() {
      return {
        disposed, raf: rafId, phase: ui.phase, running: ui.running, started: ui.started, ended: ui.ended,
        aiBusy: !!ai.req, compare: !!ai.compare, listenersAborted: ac.signal.aborted, held: [...held],
        runtime: runtime?.debugStats?.() || null, verify: { ...ui.verify }, smooth: ui.smooth,
        frames: {
          n: stats.intervals.length,
          intervalP50: percentile(stats.intervals, 50), intervalP95: percentile(stats.intervals, 95), intervalMax: stats.intervals.length ? Math.max(...stats.intervals) : null,
          workP50: percentile(stats.work, 50), workP95: percentile(stats.work, 95),
        },
      };
    },
    _resetStats() { stats.intervals.length = 0; stats.work.length = 0; },
  };
  return api;
}
