// 결정적 시뮬레이터 — 하네스 V4 층. 같은 project·seed·inputScript면 trace가 완전히 같다.
// Node(서버 검증)와 브라우저(미리보기 검사)에서 같은 런타임 코드를 쓴다.

import { createGameRuntime, CONTROLS } from './game-runtime.js';
import { diag } from '../contracts/schemas.js';

/** trace에 남길 중요 이벤트 (pause/resume/touch 등 잡음은 제외) */
export const TRACE_EVENTS = new Set(['start', 'spawn', 'collect', 'hit', 'shielded', 'remove', 'miss', 'win', 'lose', 'halt']);

export const SIM_MAX_TICKS = 60 * 60 * 10; // 10분

/**
 * @param {object} project   Project (studio 모드)
 * @param {{seed?:number, ticks?:number, inputScript?:{tick:number, control:string, pressed:boolean}[],
 *          limits?:object, stopOnEnd?:boolean}} [opts]
 *   inputScript의 tick T 입력은 T번째 tick이 끝난 직후(= T+1번째 tick 처리 전)에 적용된다. tick 0 = 시작 전.
 * @returns {{finalSnapshot:object, trace:object[], diagnostics:object[]}}
 */
export function simulate(project, opts = {}) {
  const seed = (opts.seed ?? 1) >>> 0;
  const ticks = opts.ticks ?? 600;
  const script = opts.inputScript || [];
  const diagnostics = [];

  if (!Number.isInteger(ticks) || ticks < 0 || ticks > SIM_MAX_TICKS) {
    diagnostics.push(diag('SIM_BAD_TICKS', { message: `ticks ${ticks} not in 0..${SIM_MAX_TICKS}` }));
    return { finalSnapshot: null, trace: [], diagnostics };
  }
  const byTick = new Map();
  script.forEach((ev, i) => {
    const ok = ev && Number.isInteger(ev.tick) && ev.tick >= 0 && CONTROLS.includes(ev.control) && typeof ev.pressed === 'boolean';
    if (!ok) { diagnostics.push(diag('SIM_BAD_INPUT', { path: `$.inputScript[${i}]`, message: JSON.stringify(ev).slice(0, 120) })); return; }
    if (!byTick.has(ev.tick)) byTick.set(ev.tick, []);
    byTick.get(ev.tick).push(ev);
  });

  const rt = createGameRuntime({ limits: opts.limits });
  const trace = [];
  const collect = snap => { for (const e of snap.events) if (TRACE_EVENTS.has(e.type)) trace.push(e); };
  try {
    diagnostics.push(...rt.load(project.program ?? project, project.assets ?? [], seed));
    let snap = rt.snapshot();
    const stopOnEnd = opts.stopOnEnd !== false;
    for (let t = 0; t < ticks; t++) {
      for (const ev of byTick.get(t) || []) rt.input({ control: ev.control, pressed: ev.pressed });
      snap = rt.stepTicks(1);
      collect(snap);
      if (stopOnEnd && snap.state !== 'playing') break;
    }
    if (ticks === 0) { snap = rt.stepTicks(0); collect(snap); }
    const finalSnapshot = snap;
    for (const d of finalSnapshot.diagnostics) if (!diagnostics.some(x => x.code === d.code && x.path === d.path)) diagnostics.push(d);
    return { finalSnapshot, trace, diagnostics };
  } finally {
    rt.dispose();
  }
}

/**
 * 폐루프 자동 조작으로 inputScript를 기록한다 (장르별 smoke replay·데모용).
 * policy(snapshot) → {left,right,up,down} 중 누를 방향. 바뀐 것만 inputScript에 남긴다.
 * 기록한 inputScript를 simulate에 넣으면 같은 seed에서 같은 결과가 재현된다.
 * @returns {{inputScript:object[], result:{finalSnapshot:object, trace:object[], diagnostics:object[]}}}
 */
export function recordInputs(project, { seed = 1, ticks = 600, policy, limits } = {}) {
  const rt = createGameRuntime({ limits });
  const inputScript = [];
  const trace = [];
  const held = { left: false, right: false, up: false, down: false, action: false };
  try {
    const diagnostics = rt.load(project.program ?? project, project.assets ?? [], seed >>> 0);
    let snap = rt.snapshot();
    for (let t = 0; t < ticks; t++) {
      const want = policy(snap) || {};
      for (const c of CONTROLS) {
        const p = !!want[c];
        if (p !== held[c]) { held[c] = p; inputScript.push({ tick: t, control: c, pressed: p }); rt.input({ control: c, pressed: p }); }
      }
      snap = rt.stepTicks(1);
      for (const e of snap.events) if (TRACE_EVENTS.has(e.type)) trace.push(e);
      if (snap.state !== 'playing') break;
    }
    return { inputScript, result: { finalSnapshot: snap, trace, diagnostics } };
  } finally {
    rt.dispose();
  }
}

/** trace 요약 (테스트·수리 프롬프트용): 종류별 개수와 종료 상태 */
export function summarizeTrace(result) {
  const counts = {};
  for (const e of result.trace) counts[e.type] = (counts[e.type] || 0) + 1;
  const s = result.finalSnapshot;
  return { state: s ? s.state : null, tick: s ? s.tick : 0, score: s ? s.score : 0, lives: s ? s.lives : 0, counts };
}
