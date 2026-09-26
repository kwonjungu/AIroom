// GET /generations/:id?after=N · POST /generations/:id/cancel — 작업 조회·취소(소유권 검사).
// POST /generations(생성 시작)는 WP5가 만든다. 이 파일은 job store 위의 읽기·취소만 담당한다.

import { errors, ApiError } from '../http/errors.js';

export function mountJobRoutes(router, { jobs, requireStudent, limitStudent }) {
  router.get('/generations/:id', requireStudent, limitStudent, async (req, res) => {
    const after = req.query.after === undefined ? 0 : Number(req.query.after);
    if (!Number.isInteger(after) || after < 0) throw errors.badRequest();
    const r = await jobs.events(req.params.id, { ownerId: res.locals.student.studentId, after });
    if (!r) throw errors.notFound('요청을 찾을 수 없어요.');
    res.json(r);
  });

  router.post('/generations/:id/cancel', requireStudent, limitStudent, async (req, res) => {
    const r = await jobs.cancel(req.params.id, { ownerId: res.locals.student.studentId });
    if (!r.ok && r.reason === 'NOT_FOUND') throw errors.notFound('요청을 찾을 수 없어요.');
    if (!r.ok && r.reason === 'APPLYING') throw new ApiError('REVISION_CONFLICT', '이미 작품에 적용하는 중이에요.', { retryable: false });
    res.json({ job: r.job });
  });
}
