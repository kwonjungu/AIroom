// /projects · /projects/:id(/apply|/last-good|/snapshots) · /progress/me 라우트.

import { applyPatch } from '../../../public/vibe-v2/shared/contracts/patch-apply.js';
import { ApiError, errors } from '../http/errors.js';
import { ProjectError } from './store.js';
import { parseProgressEvent, ProgressError } from './progress.js';
import { JobError } from '../jobs/store.js';
import { randomId } from '../auth/tokens.js';

const INT = v => Number.isInteger(v) && v >= 0 && v <= 1e9;

function mapProjectError(err) {
  if (!(err instanceof ProjectError)) return err;
  if (err.kind === 'INVALID') return errors.badRequest(`작품이 규칙에 맞지 않아요 (${err.message}).`);
  if (err.kind === 'LIMIT') return errors.forbidden(err.message);
  if (err.kind === 'RETRY') return errors.internal();
  return errors.badRequest(err.message);
}

/**
 * @param {import('express').Router} router
 * @param {{ projects:ReturnType<import('./store.js').createProjectStore>, progress:ReturnType<import('./progress.js').createProgressStore>,
 *           jobs:ReturnType<import('../jobs/store.js').createJobStore>, requireStudent:Function, limitStudent:Function, limitProjectWrite:Function,
 *           instantiate?:Function, now:()=>number }} d
 */
export function mountProjectRoutes(router, d) {
  const { projects, progress, jobs, requireStudent, limitStudent, limitProjectWrite } = d;
  const guard = [requireStudent, limitStudent];

  async function owned(res, id) {
    const got = await projects.getOwned(res.locals.student, id);
    if (!got) throw errors.notFound('작품을 찾을 수 없어요.');
    return got;
  }

  router.get('/projects', ...guard, async (req, res) => {
    const cursor = req.query.cursor === undefined ? 0 : Number(req.query.cursor);
    const limit = req.query.limit === undefined ? 20 : Number(req.query.limit);
    if (!Number.isInteger(cursor) || cursor < 0 || !Number.isInteger(limit)) throw errors.badRequest();
    res.json(await projects.list(res.locals.student, { cursor, limit }));
  });

  router.post('/projects', ...guard, async (req, res) => {
    const body = req.body ?? {};
    // {project:{...}} 또는 초안 필드 직접. 클라이언트 id·ownerId·revision은 무시된다.
    const draft = body.project && typeof body.project === 'object' ? body.project : body;
    try {
      const project = await projects.create(res.locals.student, draft);
      res.status(201).json({ project });
    } catch (e) { throw mapProjectError(e); }
  });

  router.get('/projects/:id', ...guard, async (req, res) => {
    const { envelope } = await owned(res, req.params.id);
    res.setHeader('X-Vibe-Revision', String(envelope.revision));
    res.json({ project: envelope.project });
  });

  // 정형 변경 적용 — 서버에서 applyPatch로 검증·적용, revision CAS
  router.patch('/projects/:id', ...guard, limitProjectWrite, async (req, res) => {
    const body = req.body ?? {};
    if (!INT(body.baseRevision) || !body.patch || typeof body.patch !== 'object') throw errors.badRequest();
    const { envelope, meta } = await owned(res, req.params.id);
    if (envelope.revision !== body.baseRevision) throw errors.conflict(envelope.revision);
    if (body.patch.baseRevision !== undefined && body.patch.baseRevision !== body.baseRevision) throw errors.badRequest('patch.baseRevision이 맞지 않아요.');
    const patch = { ...body.patch, baseRevision: body.baseRevision };
    const r = applyPatch(envelope.project, patch, { now: projects.iso(), instantiate: d.instantiate });
    if (!r.ok) {
      const code = r.diagnostics[0]?.code || 'PATCH_INVALID';
      if (code === 'REVISION_CONFLICT') throw errors.conflict(envelope.revision);
      throw errors.badRequest(`변경을 적용할 수 없어요 (${code}).`);
    }
    const w = await writeOrConflict(meta, envelope, r.project);
    res.json({ project: w, revision: w.revision, changes: r.changes });
  });

  // 전체 교체 — 카드/블록 편집기
  router.put('/projects/:id', ...guard, limitProjectWrite, async (req, res) => {
    const body = req.body ?? {};
    if (!INT(body.baseRevision) || !body.project || typeof body.project !== 'object') throw errors.badRequest();
    const { envelope, meta } = await owned(res, req.params.id);
    if (envelope.revision !== body.baseRevision) throw errors.conflict(envelope.revision);
    let next;
    try { next = projects.buildReplacement(envelope.project, body.project, body.baseRevision); } catch (e) { throw mapProjectError(e); }
    const w = await writeOrConflict(meta, envelope, next);
    res.json({ project: w, revision: w.revision });
  });

  async function writeOrConflict(meta, envelope, next, extra) {
    let r;
    try { r = await projects.write(meta, envelope, next, extra); } catch (e) { throw mapProjectError(e); }
    if (!r.ok) throw errors.conflict(r.current?.revision ?? null);
    return r.project;
  }

  router.get('/projects/:id/snapshots', ...guard, async (req, res) => {
    const { envelope } = await owned(res, req.params.id);
    const lg = await projects.getLastGood(envelope.project.id);
    res.json({ revisions: await projects.snapshots(envelope.project.id), lastGoodRevision: lg?.revision ?? null });
  });

  router.get('/projects/:id/snapshots/:rev', ...guard, async (req, res) => {
    const { envelope } = await owned(res, req.params.id);
    const rev = Number(req.params.rev);
    if (!INT(rev)) throw errors.badRequest();
    const p = await projects.snapshot(envelope.project.id, rev);
    if (!p) throw errors.notFound('그 버전은 더 이상 보관하지 않아요.');
    res.json({ project: p });
  });

  router.post('/projects/:id/last-good', ...guard, limitProjectWrite, async (req, res) => {
    const body = req.body ?? {};
    if (!INT(body.revision) || Object.keys(body).length !== 1) throw errors.badRequest();
    const { envelope, meta } = await owned(res, req.params.id);
    const r = await projects.setLastGood(meta, envelope, body.revision);
    if (!r) throw errors.notFound('그 버전은 더 이상 보관하지 않아요.');
    res.json({ lastGoodRevision: r.revision });
  });

  router.get('/projects/:id/last-good', ...guard, async (req, res) => {
    const { envelope } = await owned(res, req.params.id);
    const lg = await projects.getLastGood(envelope.project.id);
    if (!lg) throw errors.notFound('아직 잘 된 버전이 없어요.');
    res.json({ revision: lg.revision, project: lg.project });
  });

  // 생성 후보 적용 — 서버가 보관한 후보만. 같은 jobId 재전송은 1회만 반영.
  router.post('/projects/:id/apply', ...guard, limitProjectWrite, async (req, res) => {
    const body = req.body ?? {};
    const { jobId, candidateHash, baseRevision } = body;
    if (typeof jobId !== 'string' || typeof candidateHash !== 'string' || !INT(baseRevision) || Object.keys(body).length !== 3) throw errors.badRequest();
    const sid = res.locals.student.studentId;
    const { envelope: pEnv, meta } = await owned(res, req.params.id);
    let jEnv = await jobs.envelope(jobId);
    if (!jEnv || jEnv.ownerId !== sid || jEnv.job.projectId !== pEnv.project.id) throw errors.notFound('요청을 찾을 수 없어요.');

    const done = async (projectEnv, already) => res.json({
      project: projectEnv.project, revision: projectEnv.revision, appliedRevision: projectEnv.applied?.[jobId] ?? jEnv.appliedRevision, alreadyApplied: already,
    });

    // 이미 반영됨(재전송·크래시 후 재시도) → 멱등 성공
    if (pEnv.applied?.[jobId] !== undefined) {
      if (jEnv.job.status !== 'applied') { try { await jobs.finishApply(jobId, null, pEnv.applied[jobId]); } catch { /* 이미 종결 */ } }
      return done(pEnv, true);
    }
    if (jEnv.job.status === 'applied') return done(pEnv, true);
    if (jEnv.job.status !== 'ready') throw errors.badRequest(`지금은 적용할 수 없는 요청이에요 (${jEnv.job.status}).`);
    const cand = jEnv.job.candidate;
    if (!cand || cand.hash !== candidateHash) throw errors.badRequest('후보가 서버에 있는 것과 달라요.');
    if (baseRevision !== jEnv.job.baseRevision || pEnv.revision !== baseRevision) throw errors.conflict(pEnv.revision);

    const token = randomId('a_');
    try { await jobs.beginApply(jobId, sid, token); } catch (e) {
      if (e instanceof JobError && e.kind === 'APPLYING') {
        // 동시 재전송: 먼저 온 요청이 끝날 때까지 짧게(상한 있음) 기다린 뒤 결과를 돌려준다
        for (let i = 0; i < 20; i++) {
          await new Promise(r => setTimeout(r, 50));
          jEnv = await jobs.envelope(jobId);
          if (jEnv?.job.status === 'applied') {
            const again = await projects.getOwned(res.locals.student, req.params.id);
            return done(again.envelope, true);
          }
          if (!jEnv?.applyLock) break;
        }
        throw new ApiError('REVISION_CONFLICT', '적용 중이에요. 잠시 후 다시 확인해 주세요.', { retryable: true, retryAfterMs: 500 });
      }
      if (e instanceof JobError && e.kind === 'NOT_READY') {
        // 먼저 온 동일 요청이 방금 끝냈다면 멱등 성공
        const again = await projects.getOwned(res.locals.student, req.params.id);
        if (again?.envelope.applied?.[jobId] !== undefined) return done(again.envelope, true);
        throw errors.badRequest(`지금은 적용할 수 없는 요청이에요 (${e.message}).`);
      }
      throw e;
    }

    const patch = { ...cand.patch, baseRevision };
    const r = applyPatch(pEnv.project, patch, { now: projects.iso(), instantiate: d.instantiate });
    if (!r.ok) {
      await jobs.abortApply(jobId, token);
      throw errors.badRequest(`후보를 적용할 수 없어요 (${r.diagnostics[0]?.code || 'PATCH_INVALID'}).`);
    }
    let w;
    try { w = await projects.write(meta, pEnv, r.project, { appliedJobId: jobId }); } catch (e) { await jobs.abortApply(jobId, token); throw mapProjectError(e); }
    if (!w.ok) {
      await jobs.abortApply(jobId, token);
      if (w.current?.applied?.[jobId] !== undefined) return done(w.current, true);
      throw errors.conflict(w.current?.revision ?? null);
    }
    jEnv = await jobs.finishApply(jobId, token, w.project.revision);
    res.json({ project: w.project, revision: w.project.revision, appliedRevision: w.project.revision, changes: r.changes, alreadyApplied: false });
  });

  // 진도
  router.get('/progress/me', ...guard, async (req, res) => {
    res.json(await progress.read(res.locals.student.studentId));
  });

  router.patch('/progress/me', ...guard, async (req, res) => {
    const ev = parseProgressEvent(req.body);
    if (!ev) throw errors.badRequest('진도 이벤트 형식이 올바르지 않아요.');
    try {
      res.json(await progress.record(res.locals.student.studentId, ev));
    } catch (e) {
      if (e instanceof ProgressError) throw e.kind === 'LIMIT' ? errors.forbidden(e.message) : errors.internal(e.message);
      throw e;
    }
  });
}
