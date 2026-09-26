// 저학년 카드 코딩 모드 — 별까지 가기(goal) · 도형 겹치기(shape).
// ModeInstance 계약(interfaces.js): enter / pause / resume / dispose.
//
// 원칙
//  - 프로젝트는 ctx.store.replaceProgram / applyPatch 로만 바꾼다. 카드 id(c1, r2, s3)는 한 번 주면 바꾸지 않는다.
//  - DOM 리스너는 모두 AbortController 하나에 묶고, 지속 요소(stageEl/editorEl)에 위임으로 한 번만 단다.
//    렌더는 내용만 갈아 끼우므로 리스너가 누적되지 않는다(v1 _wireDropZone 누적 버그 재발 방지).
//  - 누르면 추가가 기본. 드래그는 손잡이(⠿)에서만 시작하는 보조 수단.
//  - 실패는 모달 없이, 해당 카드 아래 한 줄 힌트 + ctx.shell.say.

import { scoreShape, stampsFromProgram, SHAPE_NAMES, SIZE_NAMES, ANCHOR_NAMES, COLORS, colorName, CANVAS } from './shape-score.js';
import { simulateGoal, parseMap, CARD_NAMES } from './goal-sim.js';
import * as ops from './program-ops.js';
import { findMission, makeMissionProject, markDone, nextMission } from './catalog.js';
import { GOAL_FREE_MISSION } from './missions/goal.js';
import { SHAPE_PALETTE } from './missions/shape.js';
import { fitCanvas, drawBackground, drawStamps, drawDiff, drawGoalBoard, stampSvg, stampName, CELL } from './render.js';

const CSS_ID = 'vc2-cards-css';
const MAX_CARDS = { goal: 20, shape: 12 };
const SPEED_MS = { slow: 1000, normal: 520 };
const GOAL_ICONS = { move: '⬆', turnLeft: '↺', turnRight: '↻', repeat: '🔁' };
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function injectCss() {
  if (typeof document === 'undefined' || document.getElementById(CSS_ID)) return;
  const link = document.createElement('link');
  link.id = CSS_ID; link.rel = 'stylesheet';
  link.href = new URL('./cards.css', import.meta.url).href;
  document.head.append(link);
}

/** @param {import('../../shared/contracts/interfaces.js').ModeContext} ctx */
export function createMode(ctx) {
  const { store, shell } = ctx;
  const prefs = ctx.prefs || { get: () => null, set: () => {} };
  const ac = new AbortController();
  const on = (el, type, fn, opts = {}) => el.addEventListener(type, fn, { ...opts, signal: ac.signal });
  const timers = new Set();
  let rafId = 0, ro = null, unsub = null, entered = false, disposed = false;
  let stageEl = null, editorEl = null, editorInner = null, liveEl = null;
  const reduceMotion = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  const ui = {
    selectedId: null,
    view: ['side', 'overlay', 'diff'].includes(prefs.get('cards.view')) ? prefs.get('cards.view') : 'side',
    speed: prefs.get('cards.speed') === 'slow' ? 'slow' : 'normal',
    teacher: !!prefs.get('cards.teacher'),
    run: null,          // {kind, steps, i, paused, done, trace?}
    hint: null,         // {nodeId|null, text}
    result: null,       // {complete, percent, text, differences}
    draft: null,        // {id, args}  속성 패널 초안
    drag: null,
    boardSize: 360,
  };
  let mission = null, mode = 'shape', idCounter = 0;

  // ── 상태 읽기 ──
  const project = () => store.getProject();
  const program = () => project().program;
  function syncMission() {
    const p = project();
    mode = p.mode;
    mission = findMission(p.learning.missionId) || (mode === 'goal' ? GOAL_FREE_MISSION : null);
    idCounter = Math.max(idCounter, ops.maxIdNumber(p.program));
  }
  const newId = prefix => prefix + (++idCounter);
  const editable = () => (mode === 'shape' ? mission?.editable || ['shape', 'anchor', 'color', 'size'] : []);
  const shapePaletteKind = () => (mode !== 'shape' ? null : mission ? mission.palette : 'shapes');
  const fixedPlaced = () => mode === 'shape' && mission?.palette === 'fixed' && mission?.cardsPlaced;
  const canRemove = () => !fixedPlaced();

  // ── 프로그램 변경(항상 store 경유) ──
  function commit(next, what) {
    if (!next) return false;
    const r = store.replaceProgram(next, { source: 'cards' });
    if (!r.ok) { say(r.diagnostics?.[0]?.studentHint || '그렇게는 놓을 수 없어.', 'warn'); return false; }
    if (what) announce(what);
    return true;
  }
  function insertionPoint() {
    const p = program();
    const sel = ui.selectedId && ops.getNode(p, ui.selectedId);
    if (!sel) return { parentId: null, index: undefined };
    if (sel.kind === 'repeat') return { parentId: sel.id, index: undefined };
    const parentId = ops.parentOf(p, sel.id);
    if (parentId === undefined) return { parentId: null, index: undefined };
    return { parentId, index: ops.listOf(p, parentId).indexOf(sel.id) + 1 };
  }
  function addCard(spec, at) {
    const p = program();
    if (ops.countNodes(p) >= MAX_CARDS[mode]) { hintAt(null, `카드는 ${MAX_CARDS[mode]}장까지 놓을 수 있어.`); return; }
    const node = mode === 'shape'
      ? { id: newId('s'), kind: 'stamp', args: { ...spec }, children: [] }
      : { id: newId(spec === 'repeat' ? 'r' : 'c'), kind: spec, args: spec === 'repeat' ? { times: 2 } : {}, children: [] };
    let { parentId, index } = at || insertionPoint();
    if (node.kind === 'repeat' && parentId !== null) { // 반복 안에 반복은 넣지 않는다 → 그 반복 카드 뒤
      const outer = parentId; parentId = null; index = p.entrypoints.indexOf(outer) + 1;
    }
    if (commit(ops.insertNode(p, node, parentId, index), `${cardName(node)} 카드를 놓았어`)) {
      ui.selectedId = node.id;
      if (mode === 'shape' && shapePaletteKind() === 'shapes') openDraft(node.id);
      render();
    }
  }
  function moveCard(id, delta) {
    const next = ops.moveNode(program(), id, delta);
    if (!next) return;
    const n = ops.getNode(program(), id);
    commit(next, `${cardName(n)} 카드를 ${delta < 0 ? '먼저' : '나중에'} ${mode === 'shape' ? '찍게' : '하게'} 옮겼어`);
  }
  function removeCard(id) {
    if (!canRemove()) return;
    const n = ops.getNode(program(), id); if (!n) return;
    if (ui.selectedId === id) ui.selectedId = null;
    if (ui.draft?.id === id) ui.draft = null;
    commit(ops.removeNode(program(), id), `${cardName(n)} 카드를 뺐어. 되돌리기로 다시 가져올 수 있어`);
  }
  function clearAll() {
    if (!program().nodes.length) return;
    ui.selectedId = null; ui.draft = null;
    const next = fixedPlaced() ? null : ops.emptyProgram();
    if (!next) return;
    commit(next, '카드를 모두 비웠어. 되돌리기를 누르면 돌아와');
  }
  function setRepeatTimes(id, delta) {
    const n = ops.getNode(program(), id); if (!n) return;
    const times = Math.max(2, Math.min(9, n.args.times + delta));
    if (times === n.args.times) return;
    patch([{ op: 'setParameter', nodeId: id, parameter: 'times', value: times }], `반복 ${times}번`);
  }
  function patch(operations, summary) {
    const r = store.applyPatch({ schemaVersion: 1, baseRevision: project().revision, summary: summary.slice(0, 120), operations, assetRequests: [] }, { source: 'cards' });
    if (!r.ok) say(r.diagnostics?.[0]?.studentHint || '바꿀 수 없어.', 'warn');
    return r.ok;
  }

  // ── 속성 패널(도형) ──
  function openDraft(id) {
    const n = ops.getNode(program(), id);
    if (!n || n.kind !== 'stamp' || !editable().length) { ui.draft = null; return; }
    ui.draft = { id, args: { ...n.args } };
  }
  function commitDraft() {
    const d = ui.draft; if (!d) return;
    const n = ops.getNode(program(), d.id);
    ui.draft = null;
    if (!n) return render();
    const opsList = Object.keys(d.args).filter(k => d.args[k] !== n.args[k] && editable().includes(k))
      .map(k => ({ op: 'setParameter', nodeId: d.id, parameter: k, value: d.args[k] }));
    if (opsList.length) patch(opsList, `${d.id} 바꾸기`);
    else render();
  }
  function cancelDraft() { ui.draft = null; render(); }

  // ── 선택 ──
  function select(id, { openPanel = true } = {}) {
    if (ui.draft && ui.draft.id !== id) commitDraft(); // 다른 카드를 누르면 지금 초안을 저장(초안 유지)
    ui.selectedId = ui.selectedId === id && !openPanel ? null : id;
    if (openPanel && mode === 'shape' && editable().length && ui.selectedId) openDraft(id);
    render();
  }

  // ── 문구 ──
  function say(text, tone = 'info', actions) { try { shell.say({ text, tone, actions }); } catch { /* 셸 없음 */ } }
  function announce(text) { if (liveEl) liveEl.textContent = text; }
  function hintAt(nodeId, text) { ui.hint = { nodeId, text }; say(text, 'hint'); render(); }
  function cardName(n) {
    if (!n) return '';
    if (n.kind === 'stamp') return stampName(n.args);
    if (n.kind === 'repeat') return `반복 ${n.args.times}번`;
    return CARD_NAMES[n.kind];
  }
  const labelOf = id => ops.orderedCards(program()).find(x => x.node.id === id)?.label || '';

  // ── 실행 ──
  let runTimer = 0;
  function later(fn, ms) { const t = setTimeout(() => { timers.delete(t); if (!disposed) fn(); }, ms); timers.add(t); return t; }
  function stopTimer() { if (runTimer) { clearTimeout(runTimer); timers.delete(runTimer); runTimer = 0; } }
  function clearAllTimers() { stopTimer(); for (const t of timers) clearTimeout(t); timers.clear(); }

  function buildRun() {
    if (mode === 'shape') {
      const stamps = stampsFromProgram(program());
      return { kind: 'shape', steps: stamps.map((n, i) => ({ nodeId: n.id, label: String(i + 1), index: i })), i: -1, paused: false, done: false };
    }
    const trace = simulateGoal(mission, program());
    return { kind: 'goal', steps: trace.steps, trace, i: -1, paused: false, done: false };
  }
  function startRun({ stepOnly = false } = {}) {
    if (ui.draft) commitDraft();
    if (ui.run && !ui.run.done) {
      if (stepOnly) { ui.run.paused = true; stopTimer(); advance(); return; }
      if (ui.run.paused) { ui.run.paused = false; render(); tick(); }
      return;
    }
    ui.hint = null; ui.result = null;
    ui.run = buildRun();
    shell.setStep?.('try');
    if (!ui.run.steps.length) { ui.run.done = true; finishRun(); return; }
    ui.run.paused = stepOnly;
    advance();
  }
  function advance() {
    const r = ui.run; if (!r || r.done) return;
    r.i++;
    if (r.i >= r.steps.length - 1) { r.i = r.steps.length - 1; r.done = true; }
    render();
    if (r.done) { finishRun(); return; }
    if (!r.paused) tick();
  }
  function tick() {
    stopTimer();
    runTimer = later(() => { runTimer = 0; advance(); }, reduceMotion ? Math.max(SPEED_MS[ui.speed], 700) : SPEED_MS[ui.speed]);
  }
  function togglePause() {
    const r = ui.run; if (!r || r.done) return;
    r.paused = !r.paused;
    if (r.paused) stopTimer(); else tick();
    render();
  }
  function resetRun() { stopTimer(); ui.run = null; ui.result = null; ui.hint = null; render(); }

  function finishRun() {
    stopTimer();
    const p = project();
    if (mode === 'shape') {
      if (!mission) { ui.result = { complete: false, text: '멋진 그림이야!', free: true }; render(); return; }
      const res = scoreShape(stampsFromProgram(p.program), mission);
      ui.result = { ...res, text: res.studentHint };
      if (res.complete) succeed();
      else {
        const d = res.differences[0];
        hintAt(d?.nodeId ?? null, res.studentHint);
      }
      return;
    }
    const t = ui.run.trace;
    ui.result = { complete: t.result === 'goal', text: t.explanation.text, trace: t };
    if (t.result === 'goal' && mission?.id) succeed();
    else if (t.result === 'goal') { say(t.explanation.text, 'success'); render(); }
    else hintAt(t.explanation.nodeId, t.explanation.text);
  }
  function succeed() {
    const p = project();
    store.markRunnable(p.revision);
    const prog = markDone(prefs.get('cards.progress'), mission.id);
    prefs.set('cards.progress', prog);
    const nxt = nextMission(mission.id);
    say(mission.success, 'success', nxt ? [{ label: '다음 미션', onClick: () => goMission(nxt) }] : []);
    shell.setStep?.('save');
    render();
  }
  function goMission(m) {
    const mm = m.map ? 'goal' : 'shape';
    const r = store.load(makeMissionProject(mm, m));
    if (!r.ok) say('다음 미션을 열 수 없어.', 'warn');
  }

  // ── 렌더 ──
  function render() {
    if (disposed || !stageEl) return;
    renderStage();
    renderEditor();
  }
  function scheduleDraw() {
    if (rafId || disposed) return;
    rafId = requestAnimationFrame(() => { rafId = 0; drawCanvases(); });
  }

  function currentHighlight() {
    const r = ui.run;
    if (!r || r.i < 0) return null;
    const s = r.steps[r.i];
    return s ? { nodeId: s.nodeId, parentId: s.repeatId || null, label: s.label, step: s } : null;
  }

  function renderStage() {
    const m = mission;
    const low = ctx.grade === 'low';
    const res = ui.result;
    const head = `<div class="vc2c-mission"><span class="vc2c-micon" aria-hidden="true">${esc(m?.icon || (mode === 'goal' ? '⭐' : '🎨'))}</span>
      <div><h2 class="vc2c-title">${esc(m?.title || project().title)}</h2><p class="vc2c-desc">${esc(m?.description || '카드를 눌러 마음대로 만들어 봐.')}</p></div></div>`;
    const demo = mode === 'shape' && m?.conceptDemo ? `<div class="vc2c-demo" role="note">
        <figure><canvas data-demo="0" aria-label="${esc(m.target.map(stampName).join(' 다음 '))} 순서로 찍은 그림"></canvas><figcaption>${esc(m.target.map(s => SHAPE_NAMES[s.shape]).join(' → '))}</figcaption></figure>
        <figure><canvas data-demo="1" aria-label="${esc([...m.target].reverse().map(stampName).join(' 다음 '))} 순서로 찍은 그림"></canvas><figcaption>${esc([...m.target].reverse().map(s => SHAPE_NAMES[s.shape]).join(' → '))}</figcaption></figure>
        <p><b>나중에 찍은 도형이 위를 덮어요.</b> ${esc(m.story)}</p></div>` : '';
    let body = '';
    if (mode === 'shape') {
      const views = [['side', '나란히'], ['overlay', '겹쳐 보기'], ['diff', '다른 부분']];
      const bar = m ? `<div class="vc2c-viewbar" role="group" aria-label="비교 방법">${views.map(([v, t]) =>
        `<button type="button" class="vc2c-btn vc2c-seg" data-action="view" data-view="${v}" aria-pressed="${ui.view === v}">${t}</button>`).join('')}</div>` : '';
      const view = m ? ui.view : 'mine';
      const figs = view === 'side'
        ? `<figure class="vc2c-fig"><figcaption>만들 그림</figcaption><canvas data-canvas="target" role="img" aria-label="만들 그림: ${esc(m.target.map(stampName).join(', '))}"></canvas></figure>
           <figure class="vc2c-fig"><figcaption>내가 만든 그림</figcaption><canvas data-canvas="mine" role="img" aria-label="내가 만든 그림"></canvas></figure>`
        : view === 'mine'
          ? `<figure class="vc2c-fig"><figcaption>내가 만든 그림</figcaption><canvas data-canvas="mine" role="img" aria-label="내가 만든 그림"></canvas></figure>`
          : `<figure class="vc2c-fig"><figcaption>${view === 'overlay' ? '내 그림 + 만들 그림(흐리게)' : '내 그림에서 다른 부분'}</figcaption><canvas data-canvas="${view}" role="img" aria-label="${view === 'overlay' ? '겹쳐 보기' : '다른 부분 보기'}"></canvas></figure>`;
      const legend = view === 'diff' ? '<p class="vc2c-legend"><span class="vc2c-hatch" aria-hidden="true"></span> 빗금 = 만들 그림과 다른 부분</p>' : '';
      body = `${bar}<div class="vc2c-canvases" data-view="${view}">${figs}</div>${legend}`;
    } else {
      body = `<div class="vc2c-boardwrap"><canvas data-canvas="board" role="img" aria-label="별까지 가는 길 지도"></canvas></div>`;
    }
    // 실패는 카드 아래 힌트 한 줄로만 알린다(모달·큰 상자 없음). 성공·자유 작품만 결과 상자.
    const resultBox = res && (res.complete || res.free) ? `<div class="vc2c-result ${res.complete ? 'is-ok' : 'is-try'}" role="status">
        <span aria-hidden="true">${res.complete ? '🎉' : '💡'}</span> <span>${esc(res.complete ? (mission?.success || res.text) : res.text)}</span>
        ${res.complete && mission && nextMission(mission.id) ? '<button type="button" class="vc2c-btn vc2c-primary" data-action="next">다음 미션 ▶</button>' : ''}
      </div>` : '';
    const teacher = mode === 'shape' && m ? `<details class="vc2c-teacher" ${ui.teacher ? 'open' : ''}><summary data-action="teacher">선생님 보기</summary>
        <p>일치율 ${res && 'percent' in res ? res.percent + '%' : '(실행 후 표시)'} · 차이 ${res?.differences?.length ?? '-'}개 · 학습 개념: ${esc(m.concept)}</p>
        ${res?.differences?.length ? `<ul>${res.differences.map(d => `<li>${esc(d.kind)} — 목표 ${d.targetIndex ?? '-'}번 / 카드 ${esc(d.nodeId ?? '-')}</li>`).join('')}</ul>` : ''}
      </details>` : '';
    stageEl.className = `vc2c vc2c-stage${low ? ' is-low' : ''}`;
    stageEl.innerHTML = head + demo + body + resultBox + teacher;
    scheduleDraw();
  }

  function cardHtml(entry, hl) {
    const n = entry.node;
    const sel = ui.selectedId === n.id;
    const running = hl && (hl.nodeId === n.id || hl.parentId === n.id);
    const shownArgs = ui.draft?.id === n.id ? ui.draft.args : n.args;
    let face, name, sub = '';
    if (n.kind === 'stamp') {
      face = stampSvg(shownArgs, { px: 44 });
      name = stampName(shownArgs);
      if (editable().some(k => k === 'anchor' || k === 'size') || shapePaletteKind() === 'shapes') sub = `${ANCHOR_NAMES[shownArgs.anchor]} · ${SIZE_NAMES[shownArgs.size]}`;
    } else {
      face = `<span class="vc2c-gicon" aria-hidden="true">${GOAL_ICONS[n.kind]}</span>`;
      name = n.kind === 'repeat' ? `반복 ${n.args.times}번` : CARD_NAMES[n.kind];
    }
    const aria = `${entry.label}번 카드, ${name}${sub ? ', ' + sub : ''}${sel ? ', 선택됨' : ''}`;
    const hint = ui.hint && ui.hint.nodeId === n.id ? `<p class="vc2c-hint" role="status">💡 ${esc(ui.hint.text)}</p>` : '';
    let body = '';
    if (n.kind === 'repeat') {
      const kids = ops.orderedCards(program()).filter(x => x.parentId === n.id);
      body = `<div class="vc2c-repeat">
          <div class="vc2c-times"><button type="button" class="vc2c-btn vc2c-mini" data-action="times" data-id="${n.id}" data-delta="-1" aria-label="반복 횟수 줄이기">−</button>
          <span>${n.args.times}번</span>
          <button type="button" class="vc2c-btn vc2c-mini" data-action="times" data-id="${n.id}" data-delta="1" aria-label="반복 횟수 늘리기">+</button></div>
          <ol class="vc2c-track vc2c-body" data-list="${n.id}" aria-label="반복 안 카드">${kids.map(k => cardHtml(k, hl)).join('') || '<li class="vc2c-empty">반복 카드를 누른 뒤 아래 카드를 누르면 여기에 들어가</li>'}</ol>
        </div>`;
    }
    return `<li class="vc2c-card${sel ? ' is-selected' : ''}${running ? ' is-running' : ''}${n.kind === 'repeat' ? ' is-repeat' : ''}" data-id="${n.id}">
        <div class="vc2c-cardrow">
          <button type="button" class="vc2c-cardbtn" data-action="select" data-id="${n.id}" aria-pressed="${sel}" aria-label="${esc(aria)}">
            <span class="vc2c-num" aria-hidden="true">${entry.label}</span>${face}<span class="vc2c-cardname">${esc(name)}${sub ? `<small>${esc(sub)}</small>` : ''}</span>
          </button>
          <span class="vc2c-grip" data-grip="track" data-id="${n.id}" aria-hidden="true" title="끌어서 옮기기">⠿</span>
        </div>${body}${hint}</li>`;
  }

  function trayHtml() {
    if (mode === 'goal') {
      const kinds = ['move', 'turnLeft', 'turnRight', ...(mission?.allowRepeat ? ['repeat'] : [])];
      return kinds.map(k => `<div class="vc2c-pal"><button type="button" class="vc2c-btn vc2c-palbtn" data-action="add" data-kind="${k}">
          <span class="vc2c-gicon" aria-hidden="true">${GOAL_ICONS[k]}</span><span>${k === 'repeat' ? '반복' : CARD_NAMES[k]}</span></button>
          <span class="vc2c-grip" data-grip="palette" data-kind="${k}" aria-hidden="true" title="끌어서 놓기">⠿</span></div>`).join('');
    }
    const kind = shapePaletteKind();
    if (kind === 'fixed' && mission.cardsPlaced) return '<p class="vc2c-note">카드를 눌러서 바꿔 봐.</p>';
    const list = kind === 'fixed' ? mission.cards : SHAPE_PALETTE;
    const used = kind === 'fixed' ? usedTray() : [];
    return list.map((a, i) => {
      const off = used[i];
      const label = kind === 'fixed' ? stampName(a) : SHAPE_NAMES[a.shape];
      return `<div class="vc2c-pal${off ? ' is-used' : ''}"><button type="button" class="vc2c-btn vc2c-palbtn" data-action="add" data-tray="${i}" ${off ? 'disabled aria-disabled="true"' : ''} aria-label="${esc(label)} 카드 ${off ? '(이미 놓음)' : '놓기'}">
          ${stampSvg(a, { px: 44, sized: kind === 'fixed' })}<span>${esc(label)}</span>${off ? '<small>놓았어 ✓</small>' : ''}</button>
          ${off ? '' : `<span class="vc2c-grip" data-grip="palette" data-tray="${i}" aria-hidden="true" title="끌어서 놓기">⠿</span>`}</div>`;
    }).join('');
  }
  /** 고정 카드 상자: 각 카드가 이미 줄에 놓였는지 (같은 속성 카드끼리 개수로 짝) */
  function usedTray() {
    const placed = stampsFromProgram(program()).map(n => JSON.stringify([n.args.shape, n.args.anchor, n.args.color, n.args.size]));
    return mission.cards.map(a => {
      const k = JSON.stringify([a.shape, a.anchor, a.color, a.size]);
      const j = placed.indexOf(k);
      if (j >= 0) { placed.splice(j, 1); return true; }
      return false;
    });
  }

  function toolsHtml() {
    const id = ui.selectedId;
    const n = id && ops.getNode(program(), id);
    if (!n) return '';
    const parentId = ops.parentOf(program(), id);
    const list = ops.listOf(program(), parentId);
    const i = list.indexOf(id);
    const w = mode === 'shape' ? ['◀ 먼저 찍기', '나중에 찍기 ▶'] : ['◀ 먼저 하기', '나중에 하기 ▶'];
    return `<div class="vc2c-tools" role="toolbar" aria-label="${esc(labelOf(id))}번 카드 옮기기">
        <span class="vc2c-toolname">${esc(labelOf(id))}번 ${esc(cardName(ui.draft?.id === id ? { ...n, args: ui.draft.args } : n))}</span>
        <button type="button" class="vc2c-btn" data-action="move" data-delta="-1" ${i <= 0 ? 'disabled' : ''}>${w[0]}</button>
        <button type="button" class="vc2c-btn" data-action="move" data-delta="1" ${i >= list.length - 1 ? 'disabled' : ''}>${w[1]}</button>
        ${mode === 'shape' && editable().length && !ui.draft ? '<button type="button" class="vc2c-btn" data-action="edit">바꾸기</button>' : ''}
        ${canRemove() ? '<button type="button" class="vc2c-btn vc2c-danger" data-action="remove">빼기</button>' : ''}
        <button type="button" class="vc2c-btn vc2c-ghostbtn" data-action="deselect">닫기</button>
      </div>`;
  }

  function panelHtml() {
    const d = ui.draft; if (!d) return '';
    const ed = editable();
    const a = d.args;
    const part = [];
    if (ed.includes('shape')) part.push(`<fieldset><legend>모양</legend><div class="vc2c-opts">${Object.keys(SHAPE_NAMES).map(s =>
      `<button type="button" class="vc2c-opt" data-action="draft" data-key="shape" data-val="${s}" aria-pressed="${a.shape === s}">${stampSvg({ ...a, shape: s }, { px: 40, sized: false })}<span>${SHAPE_NAMES[s]}</span>${a.shape === s ? '<b class="vc2c-check" aria-hidden="true">✓</b>' : ''}</button>`).join('')}</div></fieldset>`);
    if (ed.includes('color')) part.push(`<fieldset><legend>색</legend><div class="vc2c-opts">${COLORS.map(c =>
      `<button type="button" class="vc2c-opt vc2c-color" data-action="draft" data-key="color" data-val="${c.hex}" aria-pressed="${a.color.toUpperCase() === c.hex}"><span class="vc2c-swatch" style="background:${c.hex}"></span><span>${c.name}</span>${a.color.toUpperCase() === c.hex ? '<b class="vc2c-check" aria-hidden="true">✓</b>' : ''}</button>`).join('')}</div></fieldset>`);
    if (ed.includes('size')) part.push(`<fieldset><legend>크기</legend><div class="vc2c-opts">${['S', 'M', 'L'].map(s =>
      `<button type="button" class="vc2c-opt vc2c-size" data-action="draft" data-key="size" data-val="${s}" aria-pressed="${a.size === s}">${stampSvg({ ...a, size: s }, { px: 56 })}<span>${SIZE_NAMES[s]}</span>${a.size === s ? '<b class="vc2c-check" aria-hidden="true">✓</b>' : ''}</button>`).join('')}</div></fieldset>`);
    if (ed.includes('anchor')) part.push(`<fieldset><legend>자리</legend><div class="vc2c-grid9">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(k =>
      `<button type="button" class="vc2c-opt vc2c-cell" data-action="draft" data-key="anchor" data-val="${k}" aria-pressed="${a.anchor === k}"><span>${ANCHOR_NAMES[k]}</span>${a.anchor === k ? '<b class="vc2c-check" aria-hidden="true">✓</b>' : ''}</button>`).join('')}</div></fieldset>`);
    return `<section class="vc2c-panel" aria-label="${esc(labelOf(d.id))}번 카드 바꾸기">
        <div class="vc2c-panelhead"><b>${esc(labelOf(d.id))}번 카드 바꾸기</b> <span>${esc(stampName(a))}</span></div>
        ${part.join('')}
        <div class="vc2c-panelfoot"><button type="button" class="vc2c-btn vc2c-primary" data-action="draft-done">완료</button>
        <button type="button" class="vc2c-btn" data-action="draft-cancel">취소</button></div>
      </section>`;
  }

  function runbarHtml() {
    const r = ui.run;
    const running = r && !r.done && !r.paused;
    const st = store.getState();
    return `<div class="vc2c-runbar" role="toolbar" aria-label="실행">
        <button type="button" class="vc2c-btn vc2c-primary vc2c-run" data-action="run">${r && !r.done && r.paused ? '▶ 계속' : '▶ 실행'}</button>
        <button type="button" class="vc2c-btn" data-action="step">한 단계씩</button>
        <button type="button" class="vc2c-btn" data-action="pause" ${running ? '' : 'disabled'}>⏸ 멈추기</button>
        <button type="button" class="vc2c-btn" data-action="reset" ${r ? '' : 'disabled'}>⟲ 처음으로</button>
        <span class="vc2c-seggroup" role="group" aria-label="빠르기">
          <button type="button" class="vc2c-btn vc2c-seg" data-action="speed" data-speed="slow" aria-pressed="${ui.speed === 'slow'}">천천히</button>
          <button type="button" class="vc2c-btn vc2c-seg" data-action="speed" data-speed="normal" aria-pressed="${ui.speed === 'normal'}">보통</button>
        </span>
        <button type="button" class="vc2c-btn" data-action="undo" ${st.canUndo ? '' : 'disabled'}>↶ 되돌리기</button>
        <button type="button" class="vc2c-btn" data-action="redo" ${st.canRedo ? '' : 'disabled'}>↷ 다시하기</button>
        ${fixedPlaced() ? '' : `<button type="button" class="vc2c-btn vc2c-danger" data-action="clear" ${program().nodes.length ? '' : 'disabled'}>전체 비우기</button>`}
      </div>`;
  }

  function renderEditor() {
    const hl = currentHighlight();
    const top = ops.orderedCards(program()).filter(x => x.parentId === null);
    const total = program().nodes.length;
    const low = ctx.grade === 'low';
    const focusKey = focusSnapshot();
    const orderHead = mode === 'shape'
      ? `<div class="vc2c-trackhead"><span>먼저 찍기</span><span class="vc2c-count">카드 ${total}장</span><span>나중에 찍기 (위에 보여요)</span></div>`
      : `<div class="vc2c-trackhead"><span>먼저 하기</span><span class="vc2c-count">카드 ${total}장</span><span>나중에 하기</span></div>`;
    const endHint = ui.hint && ui.hint.nodeId === null ? `<p class="vc2c-hint" role="status">💡 ${esc(ui.hint.text)}</p>` : '';
    editorEl.className = `vc2c vc2c-editor${low ? ' is-low' : ''}${ui.run && !ui.run.done ? ' is-running' : ''}`;
    editorInner.innerHTML = `
      ${orderHead}
      <ol class="vc2c-track" data-list="root" aria-label="카드 줄 (${total}장)">
        ${top.map(e => cardHtml(e, hl)).join('')}
        <li class="vc2c-endslot"><button type="button" class="vc2c-btn vc2c-ghostbtn" data-action="deselect" ${ui.selectedId ? '' : 'disabled'}>${top.length ? '맨 끝에 넣기' : '여기에 카드가 놓여요'}</button></li>
      </ol>
      ${endHint}
      ${toolsHtml()}
      ${panelHtml()}
      <div class="vc2c-palette" aria-label="카드 상자">${trayHtml()}</div>
      ${runbarHtml()}`;
    restoreFocus(focusKey);
  }

  function focusSnapshot() {
    const a = document.activeElement;
    if (!a || !editorEl.contains(a)) return null;
    return { action: a.dataset.action, id: a.dataset.id, delta: a.dataset.delta, key: a.dataset.key, val: a.dataset.val, kind: a.dataset.kind, tray: a.dataset.tray, speed: a.dataset.speed };
  }
  function restoreFocus(k) {
    if (!k) return;
    const sel = Object.entries(k).filter(([, v]) => v !== undefined).map(([key, v]) => `[data-${key}="${CSS.escape(v)}"]`).join('');
    let el = sel && editorEl.querySelector(sel);
    if ((!el || el.disabled) && k.action === 'select' && ui.selectedId) el = editorEl.querySelector(`[data-action="select"][data-id="${CSS.escape(ui.selectedId)}"]`);
    if (el && !el.disabled) el.focus({ preventScroll: false });
  }

  // ── 캔버스 ──
  function stageWidth() { return Math.max(200, Math.floor(stageEl.clientWidth || 360)); }
  function canvasCap() { return Math.max(200, Math.min(380, Math.floor((typeof innerHeight === 'number' ? innerHeight : 800) * 0.5))); }

  function shownStamps() {
    const p = program();
    let nodes = stampsFromProgram(p);
    if (ui.draft) nodes = nodes.map(n => (n.id === ui.draft.id ? { ...n, args: ui.draft.args } : n));
    const r = ui.run;
    if (r && r.kind === 'shape' && !(r.done && r.i === r.steps.length - 1)) nodes = nodes.slice(0, r.i + 1);
    return nodes;
  }

  function drawCanvases() {
    if (disposed || !stageEl) return;
    const W = stageWidth(), cap = canvasCap();
    if (mode === 'shape') {
      const view = mission ? ui.view : 'mine';
      const side = view === 'side';
      const stacked = side && W < 2 * 200 + 16;
      const size = side ? Math.min(cap, stacked ? W : Math.floor((W - 16) / 2)) : Math.min(Math.max(cap, 280), W);
      stageEl.querySelector('.vc2c-canvases')?.classList.toggle('is-stacked', stacked);
      const r = ui.run;
      const badge = r && r.kind === 'shape' && r.i >= 0 ? { stampIndex: r.i, label: r.steps[r.i].label } : null;
      const mine = shownStamps();
      for (const cv of stageEl.querySelectorAll('canvas[data-canvas]')) {
        const ctx2 = fitCanvas(cv, size, size, CANVAS, CANVAS);
        const kind = cv.dataset.canvas;
        drawBackground(ctx2);
        if (kind === 'target') drawStamps(ctx2, mission.target);
        else if (kind === 'mine') drawStamps(ctx2, mine, { badge });
        else if (kind === 'overlay') { drawStamps(ctx2, mine, { badge }); drawStamps(ctx2, mission.target, { alpha: 0.35 }); }
        else if (kind === 'diff') drawDiff(ctx2, mine, mission.target);
      }
      stageEl.querySelectorAll('canvas[data-demo]').forEach(cv => {
        const s = Math.min(120, Math.floor(W / 3));
        const c2 = fitCanvas(cv, s, s, CANVAS, CANVAS);
        drawBackground(c2, { grid: false });
        drawStamps(c2, cv.dataset.demo === '0' ? mission.target : [...mission.target].reverse());
      });
      return;
    }
    const cv = stageEl.querySelector('canvas[data-canvas="board"]'); if (!cv) return;
    const map = parseMap(mission);
    const cell = Math.max(40, Math.min(96, Math.floor(Math.min(W / map.width, (cap + 80) / map.height))));
    const c2 = fitCanvas(cv, cell * map.width, cell * map.height, map.width * CELL, map.height * CELL);
    const r = ui.run;
    const start = { r: map.start.r, c: map.start.c, dir: map.startDir };
    let pos = start, blocked = null, badge = null, trail = [], ghost = null;
    if (r && r.i >= 0) {
      const s = r.steps[r.i];
      pos = { r: s.r, c: s.c, dir: s.dir };
      badge = s.label;
      if (s.event === 'bump' && r.done) blocked = s.blocked;
      trail = r.steps.slice(0, r.i).filter(x => x.event === 'moved').map(x => ({ r: x.r, c: x.c }));
    } else if (ui.selectedId) {
      // 이동 예고: 선택한 카드까지 실행하면 로버가 어디에 있을지 흐리게
      const t = simulateGoal(mission, program());
      const k = t.steps.findIndex(x => x.nodeId === ui.selectedId);
      if (k >= 0) ghost = { r: t.steps[k].r, c: t.steps[k].c, dir: t.steps[k].dir };
    }
    drawGoalBoard(c2, map, { pos, ghost, blocked, trail, badge });
    cv.setAttribute('aria-label', `별까지 가는 길 지도. 로버는 ${pos.r + 1}번째 줄 ${pos.c + 1}번째 칸에 있어요.`);
  }

  // ── 이벤트(위임, 한 번만 등록) ──
  function onEditorClick(e) {
    const b = e.target.closest('[data-action]');
    if (!b || !editorEl.contains(b) || b.disabled) return;
    if (ui.drag?.moved) return;
    const a = b.dataset.action;
    const running = ui.run && !ui.run.done;
    const editing = ['add', 'move', 'remove', 'clear', 'times', 'draft', 'draft-done', 'edit', 'undo', 'redo'];
    if (running && editing.includes(a)) { stopTimer(); ui.run = null; } // 편집하면 실행을 멈춘다
    switch (a) {
      case 'add': {
        if (b.dataset.kind) addCard(b.dataset.kind);
        else {
          const i = Number(b.dataset.tray);
          const list = shapePaletteKind() === 'fixed' ? mission.cards : SHAPE_PALETTE;
          if (list[i]) addCard(list[i]);
        }
        break;
      }
      case 'select': select(b.dataset.id); break;
      case 'deselect': if (ui.draft) commitDraft(); ui.selectedId = null; render(); break;
      case 'move': if (ui.selectedId) moveCard(ui.selectedId, Number(b.dataset.delta)); break;
      case 'remove': if (ui.selectedId) removeCard(ui.selectedId); break;
      case 'edit': if (ui.selectedId) { openDraft(ui.selectedId); render(); } break;
      case 'times': setRepeatTimes(b.dataset.id, Number(b.dataset.delta)); break;
      case 'draft': {
        if (!ui.draft) break;
        const k = b.dataset.key;
        ui.draft.args[k] = k === 'anchor' ? Number(b.dataset.val) : b.dataset.val;
        render();
        break;
      }
      case 'draft-done': commitDraft(); break;
      case 'draft-cancel': cancelDraft(); break;
      case 'run': startRun(); break;
      case 'step': startRun({ stepOnly: true }); break;
      case 'pause': togglePause(); break;
      case 'reset': resetRun(); break;
      case 'speed': ui.speed = b.dataset.speed; prefs.set('cards.speed', ui.speed); render(); break;
      case 'undo': ui.draft = null; store.undo(); break;
      case 'redo': ui.draft = null; store.redo(); break;
      case 'clear': clearAll(); break;
      default: break;
    }
  }
  function onEditorKey(e) {
    const b = e.target.closest('[data-action="select"]');
    if (!b) return;
    const id = b.dataset.id;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      ui.selectedId = id;
      moveCard(id, e.key === 'ArrowLeft' ? -1 : 1);
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      removeCard(id);
    } else if (e.key === 'Escape') {
      if (ui.draft) cancelDraft(); else { ui.selectedId = null; render(); }
    }
  }
  function onStageClick(e) {
    const b = e.target.closest('[data-action]');
    if (!b || !stageEl.contains(b)) return;
    if (b.dataset.action === 'view') { ui.view = b.dataset.view; prefs.set('cards.view', ui.view); renderStage(); }
    else if (b.dataset.action === 'next') { const nx = mission && nextMission(mission.id); if (nx) goMission(nx); }
    else if (b.dataset.action === 'teacher') {
      // <details>가 열리고 닫힌 뒤의 상태를 기억
      later(() => { const d = stageEl?.querySelector('.vc2c-teacher'); if (d) { ui.teacher = d.open; prefs.set('cards.teacher', ui.teacher); } }, 0);
    }
  }

  // ── 포인터 드래그(보조): 손잡이 ⠿ 에서만 시작 ──
  function onPointerDown(e) {
    const g = e.target.closest('[data-grip]');
    if (!g || !editorEl.contains(g) || (e.pointerType === 'mouse' && e.button !== 0)) return;
    if (ui.run && !ui.run.done) return;
    e.preventDefault();
    try { g.setPointerCapture(e.pointerId); } catch { /* 합성 이벤트 */ }
    ui.drag = { pointerId: e.pointerId, grip: g, source: g.dataset.grip, id: g.dataset.id, kind: g.dataset.kind, tray: g.dataset.tray, x0: e.clientX, y0: e.clientY, moved: false, ghost: null, target: null };
  }
  function onPointerMove(e) {
    const d = ui.drag;
    if (!d || e.pointerId !== d.pointerId) return;
    if (!d.moved && Math.hypot(e.clientX - d.x0, e.clientY - d.y0) < 8) return;
    if (!d.moved) {
      d.moved = true;
      d.ghost = document.createElement('div');
      d.ghost.className = 'vc2c-dragghost';
      d.ghost.setAttribute('aria-hidden', 'true');
      const src = d.grip.closest('.vc2c-card, .vc2c-pal');
      d.ghost.innerHTML = src?.querySelector('svg, .vc2c-gicon')?.outerHTML || '⠿';
      editorEl.append(d.ghost);
      editorEl.classList.add('is-dragging');
    }
    d.ghost.style.transform = `translate(${e.clientX - 28}px, ${e.clientY - 28}px)`;
    d.target = dropTarget(e.clientX, e.clientY);
    for (const m of editorEl.querySelectorAll('.vc2c-dropmark')) m.remove();
    if (d.target) {
      const mark = document.createElement('li'); mark.className = 'vc2c-dropmark'; mark.setAttribute('aria-hidden', 'true');
      const kids = [...d.target.list.children].filter(c => c.classList.contains('vc2c-card'));
      const ref = kids[d.target.index] || d.target.list.querySelector(':scope > .vc2c-endslot, :scope > .vc2c-empty');
      d.target.list.insertBefore(mark, ref || null);
    }
  }
  function dropTarget(x, y) {
    const el = document.elementFromPoint(x, y);
    const list = el && el.closest('.vc2c-track');
    if (!list || !editorEl.contains(list)) return null;
    const parentId = list.dataset.list === 'root' ? null : list.dataset.list;
    const kids = [...list.children].filter(c => c.classList.contains('vc2c-card'));
    let index = kids.length;
    for (let i = 0; i < kids.length; i++) {
      const b = kids[i].querySelector(':scope > .vc2c-cardrow').getBoundingClientRect();
      const before = list.classList.contains('vc2c-body') || b.width < 1 ? y < b.top + b.height / 2 : (y < b.bottom && x < b.left + b.width / 2) || y < b.top;
      if (before) { index = i; break; }
    }
    return { list, parentId, index };
  }
  function endDrag(e, cancelled) {
    const d = ui.drag;
    if (!d || (e && e.pointerId !== d.pointerId)) return;
    for (const m of editorEl.querySelectorAll('.vc2c-dropmark')) m.remove();
    d.ghost?.remove();
    editorEl.classList.remove('is-dragging');
    try { d.grip.releasePointerCapture?.(d.pointerId); } catch { /* 이미 해제 */ }
    if (cancelled) { ui.drag = null; announce('옮기기를 취소했어'); return; } // pointercancel: 아무것도 바꾸지 않고 복구
    if (!d.moved) { // 손잡이를 톡 누른 것 = 보통 누르기와 같게
      ui.drag = null;
      if (d.source === 'palette') { if (d.kind) addCard(d.kind); else { const list = shapePaletteKind() === 'fixed' ? mission.cards : SHAPE_PALETTE; if (list[+d.tray]) addCard(list[+d.tray]); } }
      else select(d.id);
      return;
    }
    const t = d.target;
    later(() => { if (ui.drag === d) ui.drag = null; }, 0); // 드래그 직후 click 무시 (새 드래그는 건드리지 않음)
    if (!t) return;
    if (d.source === 'palette') {
      const spec = d.kind || (shapePaletteKind() === 'fixed' ? mission.cards : SHAPE_PALETTE)[+d.tray];
      if (spec) addCard(spec, { parentId: t.parentId, index: t.index });
    } else {
      const next = ops.moveNodeTo(program(), d.id, t.parentId, t.index);
      if (next) { ui.selectedId = d.id; commit(next, `${labelOf(d.id)}번 카드를 옮겼어`); }
      else announce('거기에는 놓을 수 없어');
    }
  }

  // ── store 구독 ──
  function onStore(ev) {
    if (disposed) return;
    if (ev.type === 'loaded') { // 미션 바꿈: 이전 미션 상태를 모두 버린다
      stopTimer();
      Object.assign(ui, { selectedId: null, run: null, hint: null, result: null, draft: null });
      idCounter = 0;
      syncMission();
      shell.setStep?.('make');
      if (mission) say(mission.story || mission.description, 'info');
      render();
      return;
    }
    if (ev.type !== 'changed') { if (ev.type === 'lastGood') return; render(); return; }
    idCounter = Math.max(idCounter, ops.maxIdNumber(program()));
    if (ui.run) { stopTimer(); ui.run = null; }
    ui.hint = null; ui.result = null;
    if (ui.selectedId && !ops.getNode(program(), ui.selectedId)) ui.selectedId = null;
    if (ui.draft && !ops.getNode(program(), ui.draft.id)) ui.draft = null;
    shell.setStep?.('change');
    render();
  }

  return {
    enter(root) {
      if (entered) throw new Error('cards mode: enter twice');
      entered = true;
      injectCss();
      syncMission();
      const stageSlot = shell.stageSlot?.() || root;
      const editorSlot = shell.editorSlot?.() || root;
      stageEl = document.createElement('div');
      editorEl = document.createElement('div');
      stageEl.dataset.cardsMode = mode;
      editorEl.dataset.cardsMode = mode;
      editorInner = document.createElement('div');
      liveEl = document.createElement('p');
      liveEl.className = 'vc2c-sr'; liveEl.setAttribute('aria-live', 'polite');
      editorEl.append(editorInner, liveEl);
      stageSlot.append(stageEl);
      editorSlot.append(editorEl);
      on(editorEl, 'click', onEditorClick);
      on(editorEl, 'keydown', onEditorKey);
      on(editorEl, 'pointerdown', onPointerDown);
      on(editorEl, 'pointermove', onPointerMove);
      on(editorEl, 'pointerup', e => endDrag(e, false));
      on(editorEl, 'pointercancel', e => endDrag(e, true));
      on(editorEl, 'lostpointercapture', e => { if (ui.drag && !ui.drag.moved) return; if (ui.drag && e.pointerId === ui.drag.pointerId && ui.drag.ghost?.isConnected) endDrag(e, true); });
      on(stageEl, 'click', onStageClick);
      if (typeof ResizeObserver === 'function') { ro = new ResizeObserver(() => scheduleDraw()); ro.observe(stageEl); }
      else on(window, 'resize', scheduleDraw);
      unsub = store.subscribe(onStore);
      shell.setStep?.('make');
      if (mission) say(mission.story || mission.description, 'info');
      render();
    },
    pause() {
      if (ui.run && !ui.run.done && !ui.run.paused) { ui.run.paused = true; stopTimer(); render(); }
    },
    resume() { render(); },
    dispose() {
      if (disposed) return;
      disposed = true;
      clearAllTimers();
      if (rafId) cancelAnimationFrame(rafId);
      rafId = 0;
      ac.abort();
      ro?.disconnect(); ro = null;
      unsub?.(); unsub = null;
      ui.drag?.ghost?.remove();
      ui.drag = null; ui.run = null;
      stageEl?.remove(); editorEl?.remove();
      stageEl = editorEl = editorInner = liveEl = null;
    },
    /** 테스트·점검용 (계약 밖): 현재 리소스 수 */
    _debug() { return { timers: timers.size, raf: rafId, disposed, listenersAborted: ac.signal.aborted, ui: { ...ui, drag: !!ui.drag } }; },
  };
}
