// 실제 Groq 평가 러너 (npm run eval:vibe:live) — AI09.
//
// ⚠ 기본 실행 금지 가드: 아래가 모두 있어야 실제 호출을 한다. 하나라도 없으면 아무 호출 없이 종료 코드 2.
//   VIBE_EVAL_LIVE=1
//   VIBE_EVAL_BUDGET_USD=<양수>                 이 금액(추정)에 닿으면 남은 과제를 건너뛴다
//   VIBE_EVAL_PRICE_IN_PER_MTOK / _OUT_PER_MTOK  실제 요금표(USD/백만 토큰) — 없으면 예산을 지킬 수 없으므로 거부
//   GROQ_API_KEY (또는 VIBE_GROQ_API_KEY)
// 선택: VIBE_EVAL_MAX_TASKS(기본 40, 상한 360) · VIBE_EVAL_REPS(기본 1, 최대 3) · VIBE_EVAL_SPLIT(dev|holdout|all, 기본 dev)
//       VIBE_GROQ_MODEL_PRIMARY / _LIGHT (비교할 모델 설정)
//
// --dry-run : 네트워크 없이 mock 공급자(참조 답안 oracle)로 러너 전체를 검증한다. 결과는 모델 품질이 아니다.
//
// 결과: tests/vibe/evals/results/<시각>-<모드>.json / .md — 분자/분모, 토큰 평균·p95, 지연 p50/p95, 추정 비용.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runPipeline } from '../../../lib/vibe/generation/orchestrator.js';
import { applyPatch } from '../../../public/vibe-v2/shared/contracts/patch-apply.js';
import { createTemplateProject, instantiate } from '../../../public/vibe-v2/shared/templates/index.js';
import { createGroqProvider } from '../../../lib/vibe/providers/groq.js';
import { createMockProvider } from '../../../lib/vibe/providers/mock.js';
import { TASKS, DEV, HOLDOUT } from './corpus/tasks.js';
import { UNSUPPORTED } from './corpus/robustness.js';
import { evaluateChecklist } from './checklist.js';
import { referenceOutput } from './reference.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const HARD_MAX_TASKS = 360;

export function emptyStudioProject() {
  const t = '2026-09-26T00:00:00.000Z';
  return { schemaVersion: 2, id: 'p_eval_empty', revision: 0, mode: 'studio', title: '새 작품', templateId: null, engineVersion: 'studio-2', capabilityVersion: '1', program: { nodes: [], entrypoints: [] }, assets: [], learning: { missionId: null, missionVersion: null }, createdAt: t, updatedAt: t };
}

export function baseProject(task) {
  if (!task.base) return emptyStudioProject();
  const r = createTemplateProject(task.base.templateId, task.base.params, { id: 'p_eval_' + task.base.templateId, now: '2026-09-26T00:00:00.000Z' });
  if (!r.ok) throw new Error('corpus base invalid: ' + task.id);
  return r.project;
}

function pct(arr, q) {
  if (!arr.length) return null;
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.max(0, Math.ceil(q * s.length) - 1))];
}
const frac = (n, d) => ({ n, d, rate: d ? Math.round((n / d) * 1000) / 10 : null });

/**
 * @param {{ tasks:object[], makeProvider:(task:object)=>object, reps?:number, budgetUsd?:number, prices?:{inPerM:number, outPerM:number},
 *           maxTasks?:number, now?:()=>number, label?:string, unsupported?:object[] }} o
 */
export async function runEval(o) {
  const reps = Math.max(1, Math.min(3, o.reps || 1));
  const maxTasks = Math.min(HARD_MAX_TASKS, o.maxTasks ?? 40);
  const tasks = o.tasks.slice(0, maxTasks);
  const now = o.now || Date.now;
  const prices = o.prices || { inPerM: 0, outPerM: 0 };
  const rows = [];
  let costUsd = 0, skipped = 0;

  for (const task of tasks) {
    for (let rep = 1; rep <= reps; rep++) {
      if (o.budgetUsd !== undefined && costUsd >= o.budgetUsd) { skipped++; continue; }
      const before = baseProject(task);
      const provider = o.makeProvider(task, before);
      const t0 = now();
      const r = await runPipeline({ project: before, intentText: task.text, provider, deadlineAt: t0 + 40_000, now });
      const elapsedMs = now() - t0;
      let after = null;
      if (r.outcome === 'ready') {
        const a = applyPatch(before, { ...r.candidate.patch, baseRevision: before.revision }, { instantiate });
        after = a.ok ? a.project : null;
      }
      const ck = evaluateChecklist(task, before, after);
      const tokIn = r.calls.reduce((s, c) => s + (c.usage?.input || 0), 0);
      const tokOut = r.calls.reduce((s, c) => s + (c.usage?.output || 0), 0);
      const cost = (tokIn * prices.inPerM + tokOut * prices.outPerM) / 1e6;
      costUsd += cost;
      rows.push({
        id: task.id, split: task.split, genre: task.genre, type: task.type, rep, path: r.path, outcome: r.outcome,
        attempts: r.attempts, repaired: r.calls.some(c => c.repair), firstCandidateOk: r.outcome === 'ready' && !r.calls.some(c => c.repair) && r.calls.filter(c => c.ok).length <= 1,
        requestMet: ck.requestMet, preserved: ck.preserved, requestFailures: ck.requestFailures, preserveFailures: ck.preserveFailures,
        tokens: { input: tokIn, output: tokOut }, costUsd: cost, elapsedMs, validatorCodes: r.validatorCodes,
      });
    }
  }

  const unsup = [];
  for (const u of o.unsupported || []) {
    const before = u.base ? baseProject({ base: u.base }) : emptyStudioProject();
    const provider = o.makeProvider(null, before);
    const r = await runPipeline({ project: before, intentText: u.text, provider, deadlineAt: now() + 40_000, now });
    unsup.push({ id: u.id, outcome: r.outcome, calls: r.calls.length, honest: r.outcome !== 'ready' && /대신/.test(r.studentMessage) });
  }

  return summarize(rows, { label: o.label || 'eval', reps, costUsd, skipped, unsupported: unsup, budgetUsd: o.budgetUsd ?? null });
}

function group(rows, key) {
  const out = {};
  for (const r of rows) (out[r[key]] ||= []).push(r);
  return Object.fromEntries(Object.entries(out).map(([k, rs]) => [k, metrics(rs)]));
}

function metrics(rows) {
  const d = rows.length;
  const llm = rows.filter(r => r.path.startsWith('llm'));
  const tok = rows.map(r => r.tokens.input + r.tokens.output);
  const lat = rows.map(r => r.elapsedMs);
  return {
    firstCandidateRunnable: frac(rows.filter(r => r.firstCandidateOk).length, d),
    finalRunnable: frac(rows.filter(r => r.outcome === 'ready').length, d),
    repairRate: frac(llm.filter(r => r.repaired).length, llm.length),
    requestMet: frac(rows.filter(r => r.requestMet).length, d),
    preserved: frac(rows.filter(r => r.outcome === 'ready' && r.preserved).length, rows.filter(r => r.outcome === 'ready').length),
    tokens: { mean: d ? Math.round(tok.reduce((a, b) => a + b, 0) / d) : null, p95: pct(tok, 0.95) },
    latencyMs: { p50: pct(lat, 0.5), p95: pct(lat, 0.95) },
  };
}

function summarize(rows, meta) {
  return {
    meta: { ...meta, runs: rows.length, generatedAt: new Date().toISOString() },
    overall: metrics(rows),
    byPath: group(rows, 'path'),
    bySplit: group(rows, 'split'),
    byGenre: group(rows, 'genre'),
    byType: group(rows, 'type'),
    unsupported: { honest: frac(meta.unsupported.filter(u => u.honest).length, meta.unsupported.length), providerCalls: meta.unsupported.reduce((s, u) => s + u.calls, 0) },
    failures: rows.filter(r => !r.requestMet || !r.preserved).map(r => ({ id: r.id, rep: r.rep, path: r.path, outcome: r.outcome, request: r.requestFailures, preserve: r.preserveFailures, codes: r.validatorCodes })),
    rows,
  };
}

const f = x => (x.d ? `${x.n}/${x.d} (${x.rate}%)` : '-');
export function toMarkdown(s) {
  const m = s.overall;
  const lines = [
    `# 바이브 생성 평가 — ${s.meta.label}`, '',
    `- 실행: ${s.meta.runs}회 (반복 ${s.meta.reps}) · 예산 ${s.meta.budgetUsd ?? '-'} USD · 추정 비용 ${s.meta.costUsd.toFixed(4)} USD · 예산으로 건너뜀 ${s.meta.skipped}`,
    `- 생성 시각: ${s.meta.generatedAt}`, '',
    '| 지표 | 값 |', '|---|---|',
    `| 첫 후보 실행 가능 | ${f(m.firstCandidateRunnable)} |`,
    `| 최종 실행 가능 | ${f(m.finalRunnable)} |`,
    `| 수리율(모델 경로) | ${f(m.repairRate)} |`,
    `| 요청 충족 | ${f(m.requestMet)} |`,
    `| 수정 보존(준비된 후보 중) | ${f(m.preserved)} |`,
    `| 토큰 평균 / p95 | ${m.tokens.mean} / ${m.tokens.p95} |`,
    `| 지연 p50 / p95 (ms) | ${m.latencyMs.p50} / ${m.latencyMs.p95} |`,
    `| 미지원 정직 안내 | ${f(s.unsupported.honest)} (공급자 호출 ${s.unsupported.providerCalls}) |`, '',
    '## 경로별', '', '| 경로 | 최종 실행 | 요청 충족 | 보존 | 지연 p50/p95 |', '|---|---|---|---|---|',
    ...Object.entries(s.byPath).map(([k, v]) => `| ${k} | ${f(v.finalRunnable)} | ${f(v.requestMet)} | ${f(v.preserved)} | ${v.latencyMs.p50}/${v.latencyMs.p95} |`), '',
    '## 분할별', '', '| 분할 | 최종 실행 | 요청 충족 | 보존 |', '|---|---|---|---|',
    ...Object.entries(s.bySplit).map(([k, v]) => `| ${k} | ${f(v.finalRunnable)} | ${f(v.requestMet)} | ${f(v.preserved)} |`), '',
    '## 실패 목록', '',
    ...(s.failures.length ? s.failures.map(x => `- ${x.id}#${x.rep} [${x.path}/${x.outcome}] ${[...x.request, ...x.preserve].join('; ')} ${x.codes.length ? '(' + x.codes.join(',') + ')' : ''}`) : ['- 없음']),
  ];
  return lines.join('\n') + '\n';
}

export function writeResults(summary, outDir, name) {
  fs.mkdirSync(outDir, { recursive: true });
  const base = path.join(outDir, name);
  fs.writeFileSync(base + '.json', JSON.stringify(summary, null, 2));
  fs.writeFileSync(base + '.md', toMarkdown(summary));
  return { json: base + '.json', md: base + '.md' };
}

/** 가드 검사 — 실제 호출 조건. 문제 목록(빈 배열이면 통과) */
export function liveGuard(env) {
  const p = [];
  if (env.VIBE_EVAL_LIVE !== '1') p.push('VIBE_EVAL_LIVE=1 이 필요합니다.');
  if (!(Number(env.VIBE_EVAL_BUDGET_USD) > 0)) p.push('VIBE_EVAL_BUDGET_USD(양수)가 필요합니다.');
  if (!(Number(env.VIBE_EVAL_PRICE_IN_PER_MTOK) >= 0 && env.VIBE_EVAL_PRICE_IN_PER_MTOK !== undefined && env.VIBE_EVAL_PRICE_IN_PER_MTOK !== '')) p.push('VIBE_EVAL_PRICE_IN_PER_MTOK(요금표)가 필요합니다.');
  if (!(Number(env.VIBE_EVAL_PRICE_OUT_PER_MTOK) >= 0 && env.VIBE_EVAL_PRICE_OUT_PER_MTOK !== undefined && env.VIBE_EVAL_PRICE_OUT_PER_MTOK !== '')) p.push('VIBE_EVAL_PRICE_OUT_PER_MTOK(요금표)가 필요합니다.');
  if (!(env.GROQ_API_KEY || env.VIBE_GROQ_API_KEY)) p.push('GROQ_API_KEY가 필요합니다.');
  const max = Number(env.VIBE_EVAL_MAX_TASKS || 40);
  if (!(max > 0 && max <= HARD_MAX_TASKS)) p.push(`VIBE_EVAL_MAX_TASKS는 1~${HARD_MAX_TASKS}.`);
  return p;
}

/** dry-run용 공급자: 과제마다 참조 답안을 돌려주는 mock (네트워크 없음) */
export function oracleProviderFactory() {
  return (task, before) => createMockProvider([{ type: 'ok', output: () => (task ? referenceOutput(task, before) : { status: 'unsupported', summary: '못 해요', operations: [] }) }]);
}

function pickTasks(split) {
  return split === 'holdout' ? HOLDOUT : split === 'all' ? TASKS : DEV;
}

async function main(argv, env) {
  const dry = argv.includes('--dry-run');
  const outDir = path.join(HERE, 'results');
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  if (dry) {
    const s = await runEval({ tasks: TASKS, makeProvider: oracleProviderFactory(), maxTasks: HARD_MAX_TASKS, label: 'dry-run(oracle mock) — 모델 품질 아님', unsupported: UNSUPPORTED });
    const files = writeResults(s, outDir, `${stamp}-dry-run`);
    console.log(toMarkdown(s));
    console.log('저장:', files.json);
    return 0;
  }
  const problems = liveGuard(env);
  if (problems.length) {
    console.error('eval:vibe:live 는 기본 실행이 금지돼 있습니다. 실제 호출 없이 종료합니다.\n- ' + problems.join('\n- '));
    return 2;
  }
  const provider = createGroqProvider({ env });
  const s = await runEval({
    tasks: pickTasks(env.VIBE_EVAL_SPLIT || 'dev'),
    makeProvider: () => provider,
    reps: Number(env.VIBE_EVAL_REPS || 1),
    maxTasks: Number(env.VIBE_EVAL_MAX_TASKS || 40),
    budgetUsd: Number(env.VIBE_EVAL_BUDGET_USD),
    prices: { inPerM: Number(env.VIBE_EVAL_PRICE_IN_PER_MTOK), outPerM: Number(env.VIBE_EVAL_PRICE_OUT_PER_MTOK) },
    label: `live ${provider.models.primary}`,
    unsupported: UNSUPPORTED,
  });
  const files = writeResults(s, outDir, `${stamp}-live`);
  console.log(toMarkdown(s));
  console.log('저장:', files.json);
  return 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2), process.env).then(code => { process.exitCode = code; }, e => { console.error(e); process.exitCode = 1; });
}
