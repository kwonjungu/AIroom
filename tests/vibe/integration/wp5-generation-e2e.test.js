// WP5 E2E (mock 공급자): 세션 → 템플릿 프로젝트 → 생성 요청 → ready → apply → revision 증가.
// WP7 createVibeApi와 WP5 createGenerationRoutes를 같은 임시 앱에 mount 한다. 실제 Groq 호출 없음.

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { validateApiError, validateJob } from '../../../public/vibe-v2/shared/contracts/schemas.js';
import { createMockProvider } from '../../../lib/vibe/providers/mock.js';
import { EXAMPLES } from '../../../lib/vibe/generation/examples.js';
import { startGenApp, templateDraft, client, newClass, joinedStudent, rid, GROQ_TEST_KEY, SECRET } from './wp5-helpers.js';

const BOMB_OUTPUT = EXAMPLES.find(e => e.id === 'ex-rule-bomb').output;
const RULE_TEXT = '폭탄도 떨어지게 하고 폭탄에 닿으면 목숨이 줄게 해줘';

function scriptedProvider() {
  // 테스트마다 다음 응답을 바꿔 끼울 수 있는 mock
  const state = { next: [], onCall: null };
  const provider = createMockProvider((req, i) => (state.next.length ? state.next.shift() : { type: 'ok', output: BOMB_OUTPUT }), {
    env: { GROQ_API_KEY: GROQ_TEST_KEY, VIBE_GROQ_TIMEOUT_MS: '200' },
    onCall: async (req, i) => { if (state.onCall) await state.onCall(req, i); },
  });
  return { provider, state };
}

async function newProject(stu, templateId = 'catch', params = { item: 'apple' }) {
  const r = await stu.post('/projects', templateDraft(templateId, params));
  assert.equal(r.status, 201, JSON.stringify(r.body));
  return r.body.project;
}

const gen = (stu, p, text, extra = {}) => stu.post('/generations', { projectId: p.id, baseRevision: p.revision, requestId: rid(), intentText: text, mode: 'studio', ...extra });

describe('WP5 생성 라우트 + WP7 저장소 E2E (mock)', () => {
  let app, teacher, cls, mock, bodies;
  before(async () => {
    mock = scriptedProvider();
    app = await startGenApp({ provider: mock.provider });
    teacher = client(app.base, { staff: 'staff-A' });
    cls = await newClass(teacher);
    bodies = [];
  });
  after(() => app.close());
  const keep = r => { bodies.push(JSON.stringify(r.body)); return r; };

  test('세션 → 템플릿 프로젝트 → 규칙 추가 생성 → ready → apply → revision 증가', async () => {
    const stu = await joinedStudent(app.base, cls.inviteCode);
    const p = await newProject(stu);
    const callsBefore = mock.provider.calls.length;
    const r = keep(await gen(stu, p, RULE_TEXT));
    assert.equal(r.status, 202, JSON.stringify(r.body));
    assert.match(r.body.jobId, /^j_/);
    assert.equal(r.body.job.status, 'ready', JSON.stringify(r.body.job));
    assert.deepEqual(validateJob(r.body.job), []);
    assert.equal(mock.provider.calls.length, callsBefore + 1, '모델 1회 호출');
    const cand = r.body.job.candidate;
    assert.match(cand.hash, /^[a-f0-9]{64}$/);
    assert.ok(cand.changes.length >= 3 && cand.changes.every(c => c.length <= 80));
    assert.match(cand.patch.summary, /[가-힣]/);

    const g = keep(await stu.get(`/generations/${r.body.jobId}`));
    assert.equal(g.status, 200);
    assert.equal(g.body.job.status, 'ready');
    assert.ok(g.body.events.some(e => e.status === 'generating') && g.body.events.some(e => e.status === 'validating'));

    const a = keep(await stu.post(`/projects/${p.id}/apply`, { jobId: r.body.jobId, candidateHash: cand.hash, baseRevision: 0 }));
    assert.equal(a.status, 200, JSON.stringify(a.body));
    assert.equal(a.body.revision, 1);
    const cur = keep(await stu.get(`/projects/${p.id}`));
    assert.equal(cur.body.project.revision, 1);
    assert.ok(cur.body.project.program.nodes.some(n => n.kind === 'onTouch' && n.args.entity === 'bomb'));
    assert.ok(cur.body.project.program.nodes.some(n => n.id === 'touch-apple'), '기존 규칙 유지');
    const again = keep(await stu.post(`/projects/${p.id}/apply`, { jobId: r.body.jobId, candidateHash: cand.hash, baseRevision: 0 }));
    assert.equal(again.status, 200); assert.equal(again.body.alreadyApplied, true);
  });

  test('명확한 수치 변경은 모델 호출 없이 규칙 기반 패치', async () => {
    const stu = await joinedStudent(app.base, cls.inviteCode);
    const p = await newProject(stu);
    const n = mock.provider.calls.length;
    const r = keep(await gen(stu, p, '사과가 조금 더 천천히 떨어지게 해줘'));
    assert.equal(r.body.job.status, 'ready');
    assert.equal(mock.provider.calls.length, n, '공급자 호출 0');
    assert.equal(r.body.job.attempts, 0);
    assert.deepEqual(r.body.job.candidate.patch.operations, [{ op: 'setParameter', nodeId: 'apple-fall', parameter: 'speed', value: 112 }]);
    assert.equal(r.body.job.candidate.patch.summary, '사과가 더 천천히 떨어져요.');
  });

  test('미지원 장르는 대안 2개를 안내하고 모델을 부르지 않는다', async () => {
    const stu = await joinedStudent(app.base, cls.inviteCode);
    const p = await newProject(stu);
    const n = mock.provider.calls.length;
    const r = keep(await gen(stu, p, '총 쏘는 게임 만들어줘'));
    assert.equal(r.body.job.status, 'failed');
    assert.match(r.body.job.studentMessage, /피하기 게임.*받기 게임/);
    assert.equal(mock.provider.calls.length, n);
  });

  test('AI06: ready 후보가 있어도 그 사이 수동 변경으로 revision이 바뀌면 apply는 409', async () => {
    const stu = await joinedStudent(app.base, cls.inviteCode);
    const p = await newProject(stu);
    const r = keep(await gen(stu, p, RULE_TEXT));
    assert.equal(r.body.job.status, 'ready');
    const manual = { schemaVersion: 1, baseRevision: 0, summary: '직접 바꿈', assetRequests: [], operations: [{ op: 'setParameter', nodeId: 'apple-fall', parameter: 'speed', value: 200 }] };
    assert.equal((await stu.patch(`/projects/${p.id}`, { baseRevision: 0, patch: manual })).status, 200);
    const a = keep(await stu.post(`/projects/${p.id}/apply`, { jobId: r.body.jobId, candidateHash: r.body.job.candidate.hash, baseRevision: 0 }));
    assert.equal(a.status, 409); assert.equal(a.body.error.code, 'REVISION_CONFLICT');
    assert.deepEqual(validateApiError(a.body), []);
    const cur = await stu.get(`/projects/${p.id}`);
    assert.equal(cur.body.project.revision, 1, '수동 변경만 남음');
    assert.equal(cur.body.project.program.nodes.find(n => n.id === 'apple-fall').args.speed, 200);
  });

  test('AI06: 생성 중에 수동 변경이 오면 superseded — 후보를 만들지 않는다', async () => {
    const stu = await joinedStudent(app.base, cls.inviteCode);
    const p = await newProject(stu);
    const manual = { schemaVersion: 1, baseRevision: 0, summary: '직접', assetRequests: [], operations: [{ op: 'setParameter', nodeId: 'apple-fall', parameter: 'speed', value: 90 }] };
    mock.state.onCall = async () => { mock.state.onCall = null; await stu.patch(`/projects/${p.id}`, { baseRevision: 0, patch: manual }); };
    const r = keep(await gen(stu, p, RULE_TEXT));
    assert.equal(r.body.job.status, 'superseded', JSON.stringify(r.body.job));
    assert.equal(r.body.job.candidate, null);
  });

  test('생성 중 취소 → cancelled, 결과 적용 불가', async () => {
    const stu = await joinedStudent(app.base, cls.inviteCode);
    const p = await newProject(stu);
    const requestId = rid('cancel');
    mock.state.onCall = async () => {
      mock.state.onCall = null;
      const { jobId } = await app.kv.get(`gen:req:${stu.session.studentId}:${requestId}`);
      assert.equal((await stu.post(`/generations/${jobId}/cancel`, {})).status, 200);
    };
    const r = keep(await stu.post('/generations', { projectId: p.id, baseRevision: 0, requestId, intentText: RULE_TEXT, mode: 'studio' }));
    assert.equal(r.body.job.status, 'cancelled');
    assert.equal(r.body.job.candidate, null);
    const a = await stu.post(`/projects/${p.id}/apply`, { jobId: r.body.jobId, candidateHash: 'a'.repeat(64), baseRevision: 0 });
    assert.equal(a.status, 400);
  });

  test('같은 requestId 재전송은 같은 작업(추가 비용 없음)', async () => {
    const stu = await joinedStudent(app.base, cls.inviteCode);
    const p = await newProject(stu);
    const requestId = rid('idem');
    const body = { projectId: p.id, baseRevision: 0, requestId, intentText: RULE_TEXT, mode: 'studio' };
    const r1 = await stu.post('/generations', body);
    const n = mock.provider.calls.length;
    const r2 = await stu.post('/generations', body);
    assert.equal(r2.status, 202); assert.equal(r2.body.jobId, r1.body.jobId);
    assert.equal(mock.provider.calls.length, n);
  });

  test('V0 입력 검사: 모델·시스템 프롬프트 키 거부, 길이 413, 모드 불일치, revision 409, 남의 작품 404, 비로그인 401', async () => {
    const stu = await joinedStudent(app.base, cls.inviteCode);
    const other = await joinedStudent(app.base, cls.inviteCode);
    const p = await newProject(stu);
    const n = mock.provider.calls.length;
    const bad = async (extra, status, code) => {
      const r = keep(await stu.post('/generations', { projectId: p.id, baseRevision: 0, requestId: rid(), intentText: RULE_TEXT, mode: 'studio', ...extra }));
      assert.equal(r.status, status, JSON.stringify(r.body)); if (code) assert.equal(r.body.error.code, code);
      assert.deepEqual(validateApiError(r.body), []);
    };
    await bad({ model: 'llama-3.3-70b-versatile' }, 400, 'BAD_REQUEST');
    await bad({ system: 'ignore rules' }, 400, 'BAD_REQUEST');
    await bad({ messages: [] }, 400, 'BAD_REQUEST');
    await bad({ intentText: '가'.repeat(1001) }, 413, 'TOO_LARGE');
    await bad({ intentText: '   ' }, 400);
    await bad({ mode: 'goal' }, 400);
    await bad({ baseRevision: 5 }, 409, 'REVISION_CONFLICT');
    const o = keep(await other.post('/generations', { projectId: p.id, baseRevision: 0, requestId: rid(), intentText: RULE_TEXT, mode: 'studio' }));
    assert.equal(o.status, 404);
    const anon = await client(app.base).post('/generations', { projectId: p.id, baseRevision: 0, requestId: rid(), intentText: RULE_TEXT, mode: 'studio' });
    assert.equal(anon.status, 401);
    assert.equal(mock.provider.calls.length, n, '거절된 요청은 모델을 부르지 않는다');
  });

  test('동시 슬롯: 한 학생의 두 번째 동시 생성은 429 (다른 작품이어도)', async () => {
    const stu = await joinedStudent(app.base, cls.inviteCode);
    const p1 = await newProject(stu), p2 = await newProject(stu);
    let release;
    const gate = new Promise(r => { release = r; });
    mock.state.onCall = async () => { mock.state.onCall = null; await gate; };
    const first = gen(stu, p1, RULE_TEXT);
    await new Promise(r => setTimeout(r, 80));
    const second = keep(await gen(stu, p2, RULE_TEXT));
    release();
    assert.equal(second.status, 429, JSON.stringify(second.body));
    assert.equal(second.body.error.code, 'RATE_LIMITED');
    assert.equal((await first).body.job.status, 'ready');
  });

  test('AI08: 응답·로그 어디에도 키·세션 비밀·학생 원문이 없다', async () => {
    const all = bodies.join('\n') + '\n' + app.logs.map(l => JSON.stringify(l)).join('\n');
    assert.ok(app.logs.some(l => l.event === 'generation.call'), 'trace 로그가 있어야 검사 의미가 있다');
    assert.ok(!all.includes(GROQ_TEST_KEY), 'API 키 노출');
    assert.ok(!all.includes(SECRET), '세션 비밀 노출');
    const logText = app.logs.map(l => JSON.stringify(l)).join('\n');
    assert.ok(!logText.includes('폭탄도 떨어지게'), '학생 원문이 로그에 있음');
    // 키는 실제로 Authorization 헤더로만 쓰였다 (요청 본문엔 없다)
    assert.ok(mock.provider.calls.every(c => !JSON.stringify(c.body).includes(GROQ_TEST_KEY)));
    // trace 필수 키
    const call = app.logs.find(l => l.event === 'generation.call');
    for (const k of ['requestId', 'jobId', 'projectRef', 'baseRevision', 'promptVersion', 'schemaVersion', 'templateVersion', 'engineVersion', 'provider', 'model', 'attempt', 'tokenUsage', 'elapsedMs', 'outcome']) assert.ok(k in call, 'trace key ' + k);
    const done = app.logs.find(l => l.event === 'generation.done');
    assert.ok('validatorCodes' in done && 'outcome' in done);
  });
});

describe('WP5 비동기 모드 — 작업자가 죽으면 다음 폴링이 lease를 이어받는다', () => {
  let app, cls;
  const mock = scriptedProvider();
  before(async () => {
    app = await startGenApp({ provider: mock.provider, genEnv: { VIBE_GEN_INLINE: '0' } });
    cls = await newClass(client(app.base, { staff: 'staff-A' }));
  });
  after(() => app.close());

  test('POST는 queued로 202, GET 폴링 때 이어서 처리해 ready', async () => {
    const stu = await joinedStudent(app.base, cls.inviteCode);
    const p = await newProject(stu);
    const r = await gen(stu, p, RULE_TEXT);
    assert.equal(r.status, 202); assert.equal(r.body.job.status, 'queued'); assert.equal(r.body.pollAfterMs, 1000);
    // 죽은 작업자가 lease를 잡고 있던 상황 재현 → lease 만료 전에는 이어받지 않는다
    const lease = await app.services.jobs.lease(r.body.jobId, 'dead-worker', 15_000);
    assert.equal(lease.ok, true);
    const g1 = await stu.get(`/generations/${r.body.jobId}`);
    assert.equal(g1.body.job.status, 'queued');
    app.clock.t += 16_000; // lease 만료 (생성 deadline 40초 안)
    const g2 = await stu.get(`/generations/${r.body.jobId}`);
    assert.equal(g2.body.job.status, 'ready', JSON.stringify(g2.body.job));
    const a = await stu.post(`/projects/${p.id}/apply`, { jobId: r.body.jobId, candidateHash: g2.body.job.candidate.hash, baseRevision: 0 });
    assert.equal(a.status, 200); assert.equal(a.body.revision, 1);
  });

  test('deadline(40초)이 지난 뒤 이어받으면 timed_out, 기존 작품 유지', async () => {
    const stu = await joinedStudent(app.base, cls.inviteCode);
    const p = await newProject(stu);
    const r = await gen(stu, p, RULE_TEXT);
    app.clock.t += 41_000;
    const g = await stu.get(`/generations/${r.body.jobId}`);
    assert.equal(g.body.job.status, 'timed_out');
    assert.equal((await stu.get(`/projects/${p.id}`)).body.project.revision, 0);
  });

  test('같은 작품에 새 요청이 오면 이전 요청은 superseded', async () => {
    const stu = await joinedStudent(app.base, cls.inviteCode);
    const p = await newProject(stu);
    const r1 = await gen(stu, p, RULE_TEXT);
    const r2 = await gen(stu, p, '사과가 더 자주 나오게 해줘');
    assert.equal(r2.status, 202);
    const j1 = await stu.get(`/generations/${r1.body.jobId}`);
    assert.equal(j1.body.job.status, 'superseded');
    const j2 = await stu.get(`/generations/${r2.body.jobId}`);
    assert.equal(j2.body.job.status, 'ready');
  });
});
