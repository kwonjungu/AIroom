import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { validateApiError } from '../../../public/vibe-v2/shared/contracts/schemas.js';
import { startApp, client, projectDraft, speedPatch, newClass, joinedStudent } from './wp7-helpers.js';

const isApiError = (r, status, code) => {
  assert.equal(r.status, status, JSON.stringify(r.body));
  assert.deepEqual(validateApiError(r.body), [], 'ApiErrorSchema');
  if (code) assert.equal(r.body.error.code, code);
  assert.ok(r.body.error.requestId.length >= 8);
};

describe('WP7 세션·프로젝트·진도·작업 API', () => {
  let app, teacher, cls;
  before(async () => {
    app = await startApp();
    teacher = client(app.base, { staff: 'staff-A' });
    cls = await newClass(teacher);
  });
  after(() => app.close());

  test('세션: 초대 코드 입장 → HttpOnly·SameSite 쿠키, 실명 저장 없음, 연습 세션', async () => {
    const c = client(app.base);
    const r = await c.post('/session', { inviteCode: cls.inviteCode.toLowerCase(), displayName: '아주아주긴이름입니다열두자넘음' });
    assert.equal(r.status, 201);
    assert.match(r.body.studentId, /^s_/);
    assert.equal(r.body.classId, cls.classId);
    assert.equal([...r.body.displayName].length, 12);
    assert.equal(r.body.token, undefined, '토큰은 본문에 싣지 않는다');
    const sc = r.headers.getSetCookie().join('\n');
    assert.match(sc, /HttpOnly/); assert.match(sc, /SameSite=Lax/);
    // 재전송해도 같은 학생 (새로고침 멱등)
    const again = await c.post('/session', { inviteCode: cls.inviteCode });
    assert.equal(again.body.studentId, r.body.studentId);

    const p = client(app.base);
    const pr = await p.post('/session', { practice: true });
    assert.equal(pr.status, 201); assert.equal(pr.body.kind, 'practice'); assert.equal(pr.body.classId, null);

    isApiError(await client(app.base).post('/session', { inviteCode: 'ZZZZZZ' }), 404, 'NOT_FOUND');
    isApiError(await client(app.base).post('/session', { inviteCode: cls.inviteCode, name: '홍길동' }), 400, 'BAD_REQUEST');
  });

  test('OP01: 학생 A는 B의 프로젝트·진도·job을 읽거나 쓸 수 없고 목록에도 없다', async () => {
    const A = await joinedStudent(app.base, cls.inviteCode);
    const B = await joinedStudent(app.base, cls.inviteCode);
    const pb = (await B.post('/projects', projectDraft('B의 작품'))).body.project;
    assert.match(pb.id, /^p_/); assert.notEqual(pb.id, 'p_client_forged'); assert.equal(pb.revision, 0);
    await A.post('/projects', projectDraft('A의 작품'));

    isApiError(await A.get(`/projects/${pb.id}`), 404, 'NOT_FOUND');
    isApiError(await A.patch(`/projects/${pb.id}`, { baseRevision: 0, patch: speedPatch(0, 200) }), 404);
    isApiError(await A.put(`/projects/${pb.id}`, { baseRevision: 0, project: pb }), 404);
    isApiError(await A.get(`/projects/${pb.id}/snapshots`), 404);
    isApiError(await A.post(`/projects/${pb.id}/last-good`, { revision: 0 }), 404);
    const listA = (await A.get('/projects')).body.items;
    assert.equal(listA.length, 1); assert.equal(listA[0].title, 'A의 작품');

    // B의 job
    const { job } = await app.services.jobs.create({ ownerId: B.session.studentId, projectId: pb.id, baseRevision: 0, requestId: 'req-b-000001' });
    isApiError(await A.get(`/generations/${job.jobId}`), 404);
    isApiError(await A.post(`/generations/${job.jobId}/cancel`, {}), 404);
    isApiError(await A.post(`/projects/${pb.id}/apply`, { jobId: job.jobId, candidateHash: 'aaaaaaaaaaaaaaaa', baseRevision: 0 }), 404);
    assert.equal((await B.get(`/generations/${job.jobId}`)).status, 200);

    // 진도는 /progress/me 뿐 — 남의 진도 경로 자체가 없다
    await B.patch('/progress/me', { eventId: 'evt-b-0001', missionId: 'goal-1', missionVersion: '1', event: 'completed' });
    const pa = (await A.get('/progress/me')).body;
    assert.deepEqual(pa.missions, {});
    assert.equal((await A.get(`/progress/${B.session.studentId}`)).status, 404);

    // 비로그인
    isApiError(await client(app.base).get('/projects'), 401, 'UNAUTHENTICATED');
    // 위조 쿠키
    const f = client(app.base); f.jar.set('vibe2_s', A.jar.get('vibe2_s').replace(/.$/, c => (c === 'A' ? 'B' : 'A')));
    isApiError(await f.get('/projects'), 401);
  });

  test('OP02: 학생 토큰은 교사 경로 거부, 다른 교사는 남의 학급을 못 본다', async () => {
    const S = await joinedStudent(app.base, cls.inviteCode);
    isApiError(await S.get(`/teacher/classes/${cls.classId}/progress`), 403, 'FORBIDDEN');
    isApiError(await S.post('/teacher/classes', { name: 'x' }), 403);
    isApiError(await client(app.base).get(`/teacher/classes/${cls.classId}/progress`), 401);
    // 공유 헤더로는 통과 불가
    isApiError(await S.get(`/teacher/classes/${cls.classId}/progress`, { headers: { 'X-Vibe-Client': 'vibecoding' } }), 403);
    const other = client(app.base, { staff: 'staff-B' });
    isApiError(await other.get(`/teacher/classes/${cls.classId}/progress`), 404);
    const mine = await teacher.get(`/teacher/classes/${cls.classId}/progress`);
    assert.equal(mine.status, 200);
    assert.ok(mine.body.students.some(s => s.studentId === S.session.studentId));
    assert.equal((await teacher.get('/teacher/classes')).body.classes.length, 1);
  });

  test('OP04: 진도 이벤트 10회 재전송 → 1회 반영, 허용 외 필드 거부', async () => {
    const S = await joinedStudent(app.base, cls.inviteCode);
    const ev = { eventId: 'evt-000000001', missionId: 'goal-2', missionVersion: '1', event: 'attempted' };
    const rs = await Promise.all(Array.from({ length: 10 }, () => S.patch('/progress/me', ev)));
    assert.ok(rs.every(r => r.status === 200));
    assert.equal(rs.filter(r => r.body.applied).length, 1);
    assert.equal((await S.get('/progress/me')).body.missions['goal-2'].attempts, 1);
    isApiError(await S.patch('/progress/me', { ...ev, eventId: 'evt-000000002', stars: 3 }), 400);
    isApiError(await S.patch('/progress/me', { ...ev, eventId: 'evt-000000003', event: 'hacked' }), 400);
  });

  test('ST07: 두 탭 동시 PATCH → 하나 200, 하나 409(최신 revision 제공), 데이터 손실 0', async () => {
    const S = await joinedStudent(app.base, cls.inviteCode);
    const p = (await S.post('/projects', projectDraft())).body.project;
    const [r1, r2] = await Promise.all([
      S.patch(`/projects/${p.id}`, { baseRevision: 0, patch: speedPatch(0, 150) }),
      S.patch(`/projects/${p.id}`, { baseRevision: 0, patch: speedPatch(0, 250) }),
    ]);
    const ok = [r1, r2].filter(r => r.status === 200);
    const conflict = [r1, r2].filter(r => r.status === 409);
    assert.equal(ok.length, 1); assert.equal(conflict.length, 1);
    isApiError(conflict[0], 409, 'REVISION_CONFLICT');
    assert.equal(conflict[0].headers.get('x-vibe-revision'), '1');
    const cur = (await S.get(`/projects/${p.id}`)).body.project;
    assert.equal(cur.revision, 1);
    const winnerSpeed = ok[0].body.project.program.nodes.find(n => n.id === 'fish-fall').args.speed;
    assert.equal(cur.program.nodes.find(n => n.id === 'fish-fall').args.speed, winnerSpeed);
    // 패배한 탭은 최신 revision으로 다시 보내 두 변경 모두 보존
    const retry = await S.patch(`/projects/${p.id}`, { baseRevision: 1, patch: speedPatch(1, 333) });
    assert.equal(retry.status, 200); assert.equal(retry.body.revision, 2);

    // PUT 동시 교체도 같은 규칙
    const base = retry.body.project;
    const t1 = { ...base, title: '탭1' }; const t2 = { ...base, title: '탭2' };
    const puts = await Promise.all([S.put(`/projects/${p.id}`, { baseRevision: 2, project: t1 }), S.put(`/projects/${p.id}`, { baseRevision: 2, project: t2 })]);
    assert.deepEqual(puts.map(r => r.status).sort(), [200, 409]);
  });

  test('PUT: 검증 실패·모드 변경 거부, 클라이언트 revision 정렬, 스냅샷 20개·lastGood', async () => {
    const S = await joinedStudent(app.base, cls.inviteCode);
    const p = (await S.post('/projects', projectDraft())).body.project;
    const bad = structuredClone(p); bad.program.nodes[1].args.speed = 99999;
    isApiError(await S.put(`/projects/${p.id}`, { baseRevision: 0, project: bad }), 400);
    isApiError(await S.put(`/projects/${p.id}`, { baseRevision: 0, project: { ...p, mode: 'goal' } }), 400);
    const aligned = await S.put(`/projects/${p.id}`, { baseRevision: 0, project: { ...p, revision: 5, title: '5번' } });
    assert.equal(aligned.body.revision, 5, '클라이언트 store revision과 맞춘다');
    let rev = 5;
    for (let i = 0; i < 24; i++) {
      const r = await S.put(`/projects/${p.id}`, { baseRevision: rev, project: { ...p, title: `v${i}` } });
      assert.equal(r.status, 200); rev = r.body.revision;
    }
    const snaps = (await S.get(`/projects/${p.id}/snapshots`)).body;
    assert.equal(snaps.revisions.length, 20); assert.equal(snaps.revisions[0], rev);
    isApiError(await S.get(`/projects/${p.id}/snapshots/0`), 404);
    assert.equal((await S.post(`/projects/${p.id}/last-good`, { revision: rev - 3 })).status, 200);
    const lg = (await S.get(`/projects/${p.id}/last-good`)).body;
    assert.equal(lg.revision, rev - 3); assert.equal(lg.project.title, 'v20');
  });

  test('apply: 서버 후보만 적용, 10회 재전송(동시+순차) → 1회, 해시 불일치·취소 후 거부', async () => {
    const S = await joinedStudent(app.base, cls.inviteCode);
    const p = (await S.post('/projects', projectDraft())).body.project;
    const jobs = app.services.jobs;
    const { job } = await jobs.create({ ownerId: S.session.studentId, projectId: p.id, baseRevision: 0, requestId: 'req-apply-01' });
    await jobs.lease(job.jobId, 'w1', 30_000);
    for (const st of ['planning', 'generating', 'validating']) await jobs.transition(job.jobId, st, { workerId: 'w1' });
    const cand = { hash: 'abcdef0123456789', patch: speedPatch(0, 111), changes: ['fish-fall.speed: 120 → 111'] };
    await jobs.transition(job.jobId, 'ready', { workerId: 'w1', candidate: cand });

    isApiError(await S.post(`/projects/${p.id}/apply`, { jobId: job.jobId, candidateHash: 'ffffffffffffffff', baseRevision: 0 }), 400);
    // 클라이언트가 후보를 끼워 넣을 수 없다
    isApiError(await S.post(`/projects/${p.id}/apply`, { jobId: job.jobId, candidateHash: cand.hash, baseRevision: 0, patch: speedPatch(0, 5) }), 400);

    const body = { jobId: job.jobId, candidateHash: cand.hash, baseRevision: 0 };
    const conc = await Promise.all(Array.from({ length: 5 }, () => S.post(`/projects/${p.id}/apply`, body)));
    const seq = [];
    for (let i = 0; i < 5; i++) seq.push(await S.post(`/projects/${p.id}/apply`, body));
    const all = [...conc, ...seq];
    assert.ok(all.every(r => r.status === 200 || (r.status === 409 && r.body.error.retryable)), all.map(r => r.status).join(','));
    assert.equal(all.filter(r => r.status === 200 && r.body.alreadyApplied === false).length, 1);
    const cur = (await S.get(`/projects/${p.id}`)).body.project;
    assert.equal(cur.revision, 1, '한 번만 반영');
    assert.equal(cur.program.nodes.find(n => n.id === 'fish-fall').args.speed, 111);
    assert.equal((await jobs.get(job.jobId)).status, 'applied');
    const ev = (await S.get(`/generations/${job.jobId}?after=0`)).body;
    assert.deepEqual(ev.events.map(e => e.status), ['queued', 'planning', 'generating', 'validating', 'ready', 'applied']);
    assert.equal((await S.get(`/generations/${job.jobId}?after=${ev.cursor}`)).body.events.length, 0);

    // 취소 뒤 apply 불가, cancel 반복 안전
    const j2 = (await jobs.create({ ownerId: S.session.studentId, projectId: p.id, baseRevision: 1, requestId: 'req-apply-02' })).job;
    await jobs.lease(j2.jobId, 'w1', 30_000);
    await jobs.transition(j2.jobId, 'planning', { workerId: 'w1' });
    await jobs.transition(j2.jobId, 'ready', { workerId: 'w1', candidate: { ...cand, patch: speedPatch(1, 99) } });
    for (let i = 0; i < 3; i++) assert.equal((await S.post(`/generations/${j2.jobId}/cancel`, {})).body.job.status, 'cancelled');
    isApiError(await S.post(`/projects/${p.id}/apply`, { jobId: j2.jobId, candidateHash: cand.hash, baseRevision: 1 }), 400);
    assert.equal((await S.get(`/projects/${p.id}`)).body.project.revision, 1);
  });

  test('413: 128KB 초과 요청 거부 (Content-Length 사전 거부)', async () => {
    const S = await joinedStudent(app.base, cls.inviteCode);
    const big = JSON.stringify({ mode: 'studio', title: 'x', pad: 'a'.repeat(140 * 1024) });
    isApiError(await S.call('POST', '/projects', big), 413, 'TOO_LARGE');
  });

  test('CSRF: 다른 Origin의 상태 변경 요청 거부, 같은 Origin 허용', async () => {
    const S = await joinedStudent(app.base, cls.inviteCode);
    isApiError(await S.post('/projects', projectDraft(), { headers: { Origin: 'https://evil.example' } }), 403, 'FORBIDDEN');
    isApiError(await S.post('/projects', projectDraft(), { headers: { 'Sec-Fetch-Site': 'cross-site' } }), 403);
    const host = new URL(app.base).host;
    assert.equal((await S.post('/projects', projectDraft(), { headers: { Origin: `http://${host}` } })).status, 201);
  });

  test('로그에 학생 원문·이름·studentId가 남지 않는다', async () => {
    const S = await joinedStudent(app.base, cls.inviteCode, { displayName: '비밀이름' });
    await S.post('/projects', projectDraft('비밀제목'));
    const text = JSON.stringify(app.logs);
    assert.ok(app.logs.length > 0);
    assert.ok(!text.includes('비밀이름') && !text.includes('비밀제목'));
    assert.ok(!text.includes(S.session.studentId), 'raw studentId in logs');
    assert.ok(app.logs.some(l => l.studentRef && /^[a-f0-9]{10}$/.test(l.studentRef)));
  });
});

describe('OP03: 같은 IP 학생 30명 동시 시작', () => {
  let app;
  before(async () => { app = await startApp(); });
  after(() => app.close());

  test('서로 차단하지 않고, 데이터가 섞이지 않는다', async () => {
    const teacher = client(app.base, { staff: 'staff-A' });
    const cls = await newClass(teacher);
    const students = await Promise.all(Array.from({ length: 30 }, (_, i) => joinedStudent(app.base, cls.inviteCode, { ip: '198.51.100.1', displayName: `학생${i}` })));
    assert.equal(new Set(students.map(s => s.session.studentId)).size, 30);
    const created = await Promise.all(students.map((s, i) => s.post('/projects', projectDraft(`작품-${i}`))));
    assert.ok(created.every(r => r.status === 201), created.map(r => r.status).join(','));
    const patched = await Promise.all(students.map((s, i) => s.patch(`/projects/${created[i].body.project.id}`, { baseRevision: 0, patch: speedPatch(0, 100 + i) })));
    assert.ok(patched.every(r => r.status === 200));
    const prog = await Promise.all(students.map((s, i) => s.patch('/progress/me', { eventId: `evt-op03-${String(i).padStart(4, '0')}`, missionId: 'goal-1', missionVersion: '1', event: 'completed' })));
    assert.ok(prog.every(r => r.status === 200 && r.body.applied));
    const lists = await Promise.all(students.map(s => s.get('/projects')));
    lists.forEach((l, i) => {
      assert.equal(l.status, 200);
      assert.deepEqual(l.body.items.map(x => x.title), [`작품-${i}`]);
    });
    const got = await Promise.all(students.map((s, i) => s.get(`/projects/${created[i].body.project.id}`)));
    got.forEach((g, i) => assert.equal(g.body.project.program.nodes.find(n => n.id === 'fish-fall').args.speed, 100 + i));
    const tp = (await teacher.get(`/teacher/classes/${cls.classId}/progress`)).body;
    assert.equal(tp.students.length, 30);
    assert.ok(tp.students.every(s => s.missions['goal-1'].completed));
  });

  test('학생 한 명이 제한을 넘어도 같은 IP의 다른 학생은 계속 쓴다 (429 + retryAfterMs)', async () => {
    const app2 = await startApp({ limits: { student: { limit: 5, windowMs: 60_000 } } });
    try {
      const teacher = client(app2.base, { staff: 'staff-A' });
      const cls = await newClass(teacher);
      const noisy = await joinedStudent(app2.base, cls.inviteCode, { ip: '198.51.100.9' });
      const calm = await joinedStudent(app2.base, cls.inviteCode, { ip: '198.51.100.9' });
      const rs = [];
      for (let i = 0; i < 8; i++) rs.push(await noisy.get('/projects'));
      const limited = rs.filter(r => r.status === 429);
      assert.ok(limited.length >= 2);
      isApiError(limited[0], 429, 'RATE_LIMITED');
      assert.ok(limited[0].body.error.retryAfterMs > 0);
      assert.ok(limited[0].headers.get('retry-after'));
      assert.equal((await calm.get('/projects')).status, 200);
    } finally { await app2.close(); }
  });
});

describe('설정 오류·전역 파서', () => {
  test('VIBE_SESSION_SECRET 없으면 서버는 뜨지만 세션 발급 거부 + 명확한 관리 오류', async () => {
    const app = await startApp({ env: {} });
    try {
      const r = await client(app.base).post('/session', { practice: true });
      isApiError(r, 500, 'INTERNAL');
      assert.match(r.body.error.message, /VIBE_SESSION_SECRET/);
      assert.equal(r.body.error.retryable, false);
      isApiError(await client(app.base).get('/projects'), 401);
      assert.ok(app.logs.some(l => l.event === 'config'));
    } finally { await app.close(); }
  });

  test('server.js 전역 express.json(10MB)이 먼저 파싱해도 128KB 초과는 413', async () => {
    const app = await startApp({ preParse: true });
    try {
      const S = client(app.base);
      await S.post('/session', { practice: true });
      const big = JSON.stringify({ mode: 'studio', title: 'x', pad: 'a'.repeat(140 * 1024) });
      isApiError(await S.call('POST', '/projects', big), 413);
      assert.equal((await S.post('/projects', projectDraft())).status, 201);
    } finally { await app.close(); }
  });
});
