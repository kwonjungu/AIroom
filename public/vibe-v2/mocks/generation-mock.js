// mock 생성 클라이언트 — GenerationClient와 같은 모양. WP3·WP1이 서버·Groq 없이 개발·테스트할 때 사용.
// 시나리오는 실제 실패 유형(HARNESS §4.3, AI01~AI06)을 흉내 낸다. mock 성공은 모델 합격이 아니다.

import { applyPatch } from '../shared/contracts/patch-apply.js';

/**
 * @param {{ scenario?: 'success'|'invalid'|'timeout'|'providerDown'|'slow', delayMs?: number,
 *           plan?: (req) => object|null }} [opts]
 *   plan: 요청 → Patch를 돌려주는 함수. 기본은 "천천히/빨리" 키워드로 첫 spawner 속도를 바꾸는 규칙.
 */
export function createMockGenerationClient(opts = {}) {
  const jobs = new Map();
  const delayMs = opts.delayMs ?? 300;
  let seq = 0;
  const now = () => new Date().toISOString();

  function defaultPlan(req) {
    const spawner = req.project.program.nodes.find(n => n.kind === 'spawner');
    if (!spawner) return null;
    const slower = /천천|느리/.test(req.intentText);
    const faster = /빨리|빠르/.test(req.intentText);
    if (!slower && !faster) return null;
    const value = Math.max(20, Math.min(600, Math.round(spawner.args.speed * (slower ? 0.7 : 1.4))));
    return { schemaVersion: 1, baseRevision: req.baseRevision, summary: slower ? '조금 더 천천히 떨어져요.' : '조금 더 빨리 떨어져요.', operations: [{ op: 'setParameter', nodeId: spawner.id, parameter: 'speed', value }], assetRequests: [] };
  }

  function update(job, patch) { Object.assign(job, patch, { updatedAt: now() }); }

  async function run(job, req) {
    const wait = ms => new Promise(r => setTimeout(r, ms));
    const alive = () => !['cancelled', 'superseded'].includes(job.status);
    update(job, { status: 'planning', studentMessage: '무엇을 바꿀지 생각하는 중…' });
    await wait(delayMs); if (!alive()) return;
    if (opts.scenario === 'providerDown') { update(job, { status: 'failed', attempts: 2, studentMessage: 'AI가 잠깐 바빠요. 블록으로 직접 바꿔 볼까?', diagnostics: [diagOf('PROVIDER_UNAVAILABLE')] }); return; }
    update(job, { status: 'generating', attempts: 1, studentMessage: '게임을 고치는 중…' });
    await wait(opts.scenario === 'slow' ? delayMs * 10 : delayMs); if (!alive()) return;
    if (opts.scenario === 'timeout') { update(job, { status: 'timed_out', studentMessage: '시간이 너무 오래 걸렸어요. 지금 작품은 그대로예요.' }); return; }
    update(job, { status: 'validating', studentMessage: '제대로 되는지 검사하는 중…' });
    await wait(delayMs); if (!alive()) return;
    const patch = opts.scenario === 'invalid'
      ? { schemaVersion: 1, baseRevision: req.baseRevision, summary: '잘못된 변경', operations: [{ op: 'setParameter', nodeId: 'does-not-exist', parameter: 'speed', value: 1 }], assetRequests: [] }
      : (opts.plan || defaultPlan)(req);
    if (!patch) { update(job, { status: 'failed', studentMessage: '아직 그 변경은 못 해요. "더 천천히"처럼 말해 볼까?', diagnostics: [diagOf('UNSUPPORTED_REQUEST')] }); return; }
    const r = applyPatch(req.project, patch);
    if (!r.ok) { update(job, { status: 'failed', attempts: 2, studentMessage: '고친 게임이 제대로 안 돌아가서 적용하지 않았어요.', diagnostics: r.diagnostics }); return; }
    update(job, { status: 'ready', studentMessage: patch.summary, candidate: { hash: fakeHash(JSON.stringify(patch)), patch, changes: r.changes } });
  }

  function diagOf(code) { return { code, severity: 'error', nodeId: null, path: '', message: code, studentHint: '' }; }
  function fakeHash(s) { let h = 0x811c9dc5; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0; return (h.toString(16).padStart(8, '0')).repeat(2); }

  return {
    async start(req) {
      const job = { jobId: `j_mock${++seq}`, projectId: req.projectId, baseRevision: req.baseRevision, requestId: req.requestId, status: 'queued', studentMessage: '준비 중…', candidate: null, diagnostics: [], attempts: 0, createdAt: now(), updatedAt: now() };
      // 같은 프로젝트의 진행 중 작업은 superseded
      for (const j of jobs.values()) if (j.projectId === req.projectId && !['ready', 'applied', 'cancelled', 'failed', 'timed_out', 'superseded'].includes(j.status)) update(j, { status: 'superseded' });
      jobs.set(job.jobId, job);
      run(job, JSON.parse(JSON.stringify(req)));
      return { ...job };
    },
    async get(jobId) { const j = jobs.get(jobId); if (!j) throw Object.assign(new Error('NOT_FOUND'), { code: 'NOT_FOUND' }); return JSON.parse(JSON.stringify(j)); },
    async cancel(jobId) { const j = jobs.get(jobId); if (j && !['applied', 'failed', 'timed_out', 'superseded', 'cancelled'].includes(j.status)) update(j, { status: 'cancelled', studentMessage: '취소했어요.' }); return j ? { ...j } : null; },
    async watch(jobId, onUpdate, o = {}) {
      const interval = o.intervalMs ?? 100;
      let last = '';
      for (;;) {
        if (o.signal?.aborted) throw Object.assign(new Error('aborted'), { name: 'AbortError' });
        const j = await this.get(jobId);
        const sig = j.status + j.updatedAt;
        if (sig !== last) { last = sig; onUpdate?.(j); }
        if (['ready', 'applied', 'cancelled', 'failed', 'timed_out', 'superseded'].includes(j.status)) return j;
        await new Promise(r => setTimeout(r, interval));
      }
    },
  };
}
