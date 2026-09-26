// WP3 게임 공방: 변경 비교 요약 · AI 결과 적용 결정 · 실행 검증 · 입력 매핑 · 카탈로그 (DOM 없음)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { summarizeChange, oneLine } from '../../../public/vibe-v2/modes/studio/compare.js';
import {
  decideAiResult, applyCandidate, verifyProject, preflightEdit, aiStatusFor, keyToControl, isTypingTarget,
  endMessage, isLegacyOnly, newRequestId, AI_MESSAGES,
} from '../../../public/vibe-v2/modes/studio/flow.js';
import { addPresetOps, setValueOps } from '../../../public/vibe-v2/modes/studio/rules.js';
import { getStudioCatalog, makeStudioProject } from '../../../public/vibe-v2/modes/studio/catalog.js';
import { applyPatch } from '../../../public/vibe-v2/shared/contracts/patch-apply.js';
import { validateProject, validateJob } from '../../../public/vibe-v2/shared/contracts/schemas.js';
import { catchGame, legacyStudio } from '../../../public/vibe-v2/shared/contracts/fixtures.js';
import { createProjectStore } from '../../../public/vibe-v2/state/store.js';
import { createMockGenerationClient } from '../../../public/vibe-v2/mocks/generation-mock.js';

const speedPatch = (p, value = 84) => ({ schemaVersion: 1, baseRevision: p.revision, summary: '천천히', operations: [{ op: 'setParameter', nodeId: 'fish-fall', parameter: 'speed', value }], assetRequests: [] });
const readyJob = (p, patch, extra = {}) => ({
  jobId: 'j_test1', projectId: p.id, baseRevision: patch.baseRevision, requestId: 'r_test_0001', status: 'ready',
  studentMessage: '조금 더 천천히 떨어져요.', candidate: { hash: 'ab'.repeat(8), patch, changes: [] }, diagnostics: [], attempts: 1,
  createdAt: '2026-09-26T00:00:00.000Z', updatedAt: '2026-09-26T00:00:00.000Z', ...extra,
});
const req = p => ({ projectId: p.id, baseRevision: p.revision, requestId: 'r_test_0001' });

// ── 비교 요약 ──
test('비교: 속도만 바뀜 → 바뀔 것 "속도 120 → 84", 그대로인 것에 목표 점수·시간 규칙', () => {
  const p = catchGame();
  const q = applyPatch(p, speedPatch(p)).project;
  const s = summarizeChange(p, q, 'high');
  assert.deepEqual(s.changed, ['🐟 생선 떨어지는 속도: 120 → 84']);
  assert.deepEqual(s.added, []);
  assert.deepEqual(s.removed, []);
  assert.ok(s.kept.includes('🏁 점수 10이면 성공'), s.kept.join('|'));
  assert.ok(s.kept.includes('⌛ 시간이 끝나면 실패'));
  assert.ok(!s.kept.some(x => x.includes('떨어져요')), '바뀐 규칙은 그대로인 것에 없다');
  assert.equal(s.empty, false);
  assert.match(oneLine(s), /120 → 84.*적용할까요/);
});

test('비교(mid): 단계 이름 + 실제 수치 괄호', () => {
  const p = catchGame();
  const q = applyPatch(p, speedPatch(p)).project;
  assert.deepEqual(summarizeChange(p, q, 'mid').changed, ['🐟 생선 떨어지는 속도: 보통쯤 → 느리게쯤 (120→84)']);
});

test('비교: 규칙 추가·모습 변경', () => {
  const p = catchGame();
  const add = preflightEdit(p, addPresetOps(p, 'bomb')).preview;
  const s = summarizeChange(p, add, 'high');
  assert.ok(s.added.some(x => x.startsWith('💣 폭탄이')), s.added.join('|'));
  assert.ok(s.added.some(x => x.includes('목숨이 0이면 실패')));
  assert.ok(s.changed.some(x => x.startsWith('목숨')), s.changed.join('|'));
  assert.ok(!s.changed.some(x => x.includes('모습')), '새 규칙의 모습은 바뀔 것에 중복 표시하지 않음');
  const look = applyPatch(p, { schemaVersion: 1, baseRevision: 0, summary: 'x', operations: [{ op: 'setAppearance', nodeId: 'player', slotId: 'player.appearance', preset: 'emoji:🐶' }], assetRequests: [] }).project;
  assert.deepEqual(summarizeChange(p, look, 'high').changed, ['주인공 모습: 🐱 → 🐶']);
});

test('비교: 아무 변화 없음 → empty', () => {
  const p = catchGame();
  const s = summarizeChange(p, p);
  assert.equal(s.empty, true);
  assert.equal(oneLine(s), '바뀌는 것이 없어요.');
});

// ── AI 결과 결정 ──
test('AI 결정: 정상 후보 → compare(미리보기·요약), 적용은 하지 않음', () => {
  const p = catchGame();
  const d = decideAiResult({ job: readyJob(p, speedPatch(p)), request: req(p), current: p, grade: 'high' });
  assert.equal(d.action, 'compare');
  assert.equal(d.preview.program.nodes.find(n => n.id === 'fish-fall').args.speed, 84);
  assert.equal(p.program.nodes.find(n => n.id === 'fish-fall').args.speed, 120, '현재 작품은 그대로');
  assert.deepEqual(d.summary.changed, ['🐟 생선 떨어지는 속도: 120 → 84']);
});

test('AI 결정: revision 불일치 → conflict (적용 0)', () => {
  const p = catchGame();
  const job = readyJob(p, speedPatch(p));
  const moved = { ...p, revision: 1 };
  const d = decideAiResult({ job, request: req(p), current: moved });
  assert.equal(d.action, 'conflict');
  assert.equal(d.message, AI_MESSAGES.conflict);
  assert.equal(d.preview, undefined);
});

test('AI 결정: 취소된 요청·다른 작품·다른 requestId·AbortError → ignore', () => {
  const p = catchGame();
  const job = readyJob(p, speedPatch(p));
  assert.equal(decideAiResult({ job, request: { ...req(p), cancelled: true }, current: p }).action, 'ignore');
  assert.equal(decideAiResult({ job, request: null, current: p }).action, 'ignore');
  const other = { ...p, id: 'p_other_project' };
  assert.equal(decideAiResult({ job, request: req(p), current: other }).action, 'ignore');
  assert.equal(decideAiResult({ job: { ...job, requestId: 'r_someone_else' }, request: req(p), current: p }).action, 'ignore');
  assert.equal(decideAiResult({ error: Object.assign(new Error('x'), { name: 'AbortError' }), request: req(p), current: p }).action, 'ignore');
});

test('AI 결정: 실패·timeout·취소·superseded·네트워크 오류는 성공으로 치환하지 않는다', () => {
  const p = catchGame();
  const base = readyJob(p, speedPatch(p));
  const cases = {
    failed: { status: 'failed', candidate: null, studentMessage: 'AI가 잠깐 바빠요.' },
    timeout: { status: 'timed_out', candidate: null },
    cancelled: { status: 'cancelled', candidate: null },
    superseded: { status: 'superseded', candidate: null },
  };
  for (const [action, extra] of Object.entries(cases)) {
    const d = decideAiResult({ job: { ...base, ...extra }, request: req(p), current: p });
    assert.equal(d.action, action);
    assert.equal(d.preview, undefined);
  }
  assert.equal(decideAiResult({ job: { ...base, ...cases.failed }, request: req(p), current: p }).message, 'AI가 잠깐 바빠요.');
  assert.equal(decideAiResult({ error: new TypeError('Failed to fetch'), request: req(p), current: p }).action, 'network');
  assert.equal(decideAiResult({ job: null, request: req(p), current: p }).action, 'network');
  assert.equal(decideAiResult({ job: { ...base, status: 'generating' }, request: req(p), current: p }).action, 'network', '종결 전 상태로 끝나면 실패');
});

test('AI 결정: 모르는 노드·범위 밖 값·규칙이 깨지는 후보 → reject', () => {
  const p = catchGame();
  const bad = { ...speedPatch(p), operations: [{ op: 'setParameter', nodeId: 'does-not-exist', parameter: 'speed', value: 1 }] };
  assert.equal(decideAiResult({ job: readyJob(p, bad), request: req(p), current: p }).action, 'reject');
  const range = speedPatch(p, 9999);
  assert.equal(decideAiResult({ job: readyJob(p, range), request: req(p), current: p }).action, 'reject');
  // 스키마는 맞지만 의미 오류: 유일한 점수 물건 삭제
  const sem = { ...speedPatch(p), operations: [{ op: 'removeBehavior', nodeId: 'fish-fall' }, { op: 'removeBehavior', nodeId: 'touch-fish' }] };
  const d = decideAiResult({ job: readyJob(p, sem), request: req(p), current: p });
  assert.equal(d.action, 'reject');
  assert.ok(d.diagnostics.some(x => x.code === 'SCORE_UNREACHABLE'));
  // 후보 없음
  assert.equal(decideAiResult({ job: { ...readyJob(p, speedPatch(p)), candidate: null }, request: req(p), current: p }).action, 'reject');
});

test('applyCandidate: store revision이 바뀌었으면 거부하고 작품 유지', () => {
  const store = createProjectStore(catchGame());
  const patch = speedPatch(store.getProject());
  // 그 사이 수동 변경
  store.applyPatch({ schemaVersion: 1, baseRevision: 0, summary: '목표', operations: [{ op: 'setParameter', nodeId: 'win', parameter: 'value', value: 15 }], assetRequests: [] });
  const before = JSON.stringify(store.getProject());
  const r = applyCandidate(store, patch);
  assert.equal(r.ok, false);
  assert.equal(r.conflict, true);
  assert.equal(r.message, AI_MESSAGES.conflict);
  assert.equal(JSON.stringify(store.getProject()), before);
});

test('applyCandidate: 정상 적용 → revision+1, undo 한 번이면 이전 내용', () => {
  const store = createProjectStore(catchGame());
  const r = applyCandidate(store, speedPatch(store.getProject()));
  assert.equal(r.ok, true);
  assert.equal(r.revision, 1);
  assert.equal(store.getProject().program.nodes.find(n => n.id === 'fish-fall').args.speed, 84);
  store.undo();
  assert.equal(store.getProject().program.nodes.find(n => n.id === 'fish-fall').args.speed, 120);
  assert.equal(store.getProject().revision, 2);
});

test('ST02 순수: 수동 변경 뒤 AI 변경 → 수동 변경 보존 (mock success)', async () => {
  const store = createProjectStore(catchGame());
  const manual = preflightEdit(store.getProject(), setValueOps(store.getProject(), 'win', 'value', 15));
  assert.ok(store.applyPatch(manual.patch, { source: 'ui' }).ok);
  const gen = createMockGenerationClient({ delayMs: 1 });
  const cur = store.getProject();
  const request = { projectId: cur.id, baseRevision: cur.revision, requestId: newRequestId() };
  const job0 = await gen.start({ ...request, intentText: '생선이 조금 더 천천히 떨어지게', mode: 'studio', project: cur });
  const job = await gen.watch(job0.jobId, null, { intervalMs: 2 });
  assert.deepEqual(validateJob(job), []);
  const d = decideAiResult({ job, request, current: store.getProject(), grade: 'high' });
  assert.equal(d.action, 'compare');
  assert.ok(d.summary.kept.includes('🏁 점수 15이면 성공'));
  assert.ok(applyCandidate(store, d.patch).ok);
  const p = store.getProject();
  assert.equal(p.program.nodes.find(n => n.id === 'win').args.value, 15, '수동 변경 보존');
  assert.equal(p.program.nodes.find(n => n.id === 'fish-fall').args.speed, 84);
});

test('mock invalid / providerDown / timeout → 적용 0', async () => {
  for (const scenario of ['invalid', 'providerDown', 'timeout']) {
    const store = createProjectStore(catchGame());
    const before = JSON.stringify(store.getProject());
    const gen = createMockGenerationClient({ scenario, delayMs: 1 });
    const cur = store.getProject();
    const request = { projectId: cur.id, baseRevision: cur.revision, requestId: newRequestId() };
    const job0 = await gen.start({ ...request, intentText: '천천히', mode: 'studio', project: cur });
    const job = await gen.watch(job0.jobId, null, { intervalMs: 2 });
    const d = decideAiResult({ job, request, current: store.getProject() });
    assert.notEqual(d.action, 'compare', scenario);
    assert.equal(d.preview, undefined);
    assert.equal(JSON.stringify(store.getProject()), before, scenario);
  }
});

test('aiStatusFor: 작업 상태 → 셸 AI 상태', () => {
  assert.equal(aiStatusFor('queued'), 'preparing');
  assert.equal(aiStatusFor('planning'), 'preparing');
  assert.equal(aiStatusFor('generating'), 'assembling');
  assert.equal(aiStatusFor('repairing'), 'assembling');
  assert.equal(aiStatusFor('validating'), 'checking');
  assert.equal(aiStatusFor('ready'), 'done');
  assert.equal(aiStatusFor('failed'), 'failed');
  assert.equal(aiStatusFor('timed_out'), 'failed');
  assert.equal(aiStatusFor('cancelled'), 'idle');
  assert.equal(aiStatusFor('superseded'), 'idle');
});

// ── 실행 검증 ──
test('verifyProject: 템플릿 통과, 옛 작품은 legacy, 의미 오류·자원 초과는 실패', () => {
  assert.equal(verifyProject(catchGame()).ok, true);
  const leg = verifyProject(legacyStudio());
  assert.equal(leg.ok, false);
  assert.equal(leg.stage, 'legacy');
  assert.equal(isLegacyOnly(legacyStudio()), true);
  assert.equal(isLegacyOnly(catchGame()), false);
  const p = catchGame();
  const broken = JSON.parse(JSON.stringify(p));
  broken.program.nodes.find(n => n.id === 'world').args.timeLimitSec = 0;   // timeUp 규칙인데 제한 시간 없음
  const v = verifyProject(broken);
  assert.equal(v.ok, false);
  assert.equal(v.stage, 'semantic');
  assert.match(v.hint, /제한 시간/);
});

// ── 입력 ──
test('keyToControl: 방향키·WASD(한글 자판 포함), 조합키 무시', () => {
  assert.equal(keyToControl({ code: 'ArrowLeft', key: 'ArrowLeft' }), 'left');
  assert.equal(keyToControl({ code: 'KeyD', key: 'ㅇ' }), 'right', '한글 자판에서도 물리 키');
  assert.equal(keyToControl({ code: 'KeyW', key: 'w' }), 'up');
  assert.equal(keyToControl({ code: 'KeyS', key: 's' }), 'down');
  assert.equal(keyToControl({ code: '', key: 'Left' }), 'left');
  assert.equal(keyToControl({ code: 'KeyA', key: 'a', ctrlKey: true }), null);
  assert.equal(keyToControl({ code: 'Space', key: ' ' }), null);
  assert.equal(keyToControl(null), null);
});

test('isTypingTarget: 입력창·슬라이더·contenteditable에서는 게임 키 비활성', () => {
  assert.equal(isTypingTarget({ tagName: 'TEXTAREA' }), true);
  assert.equal(isTypingTarget({ tagName: 'input' }), true);
  assert.equal(isTypingTarget({ tagName: 'SELECT' }), true);
  assert.equal(isTypingTarget({ tagName: 'DIV', isContentEditable: true }), true);
  assert.equal(isTypingTarget({ tagName: 'DIV', getAttribute: () => 'true' }), true);
  assert.equal(isTypingTarget({ tagName: 'BUTTON', getAttribute: () => null }), false);
  assert.equal(isTypingTarget(null), false);
});

test('endMessage', () => {
  assert.equal(endMessage({ state: 'won', score: 10, events: [] }).title, '🎉 성공!');
  assert.equal(endMessage({ state: 'won', score: 0, events: [{ type: 'win', reason: 'survivedSec' }] }).text, '끝까지 버텼어요!');
  assert.equal(endMessage({ state: 'won', score: 0, events: [{ type: 'win', reason: 'reachedExit' }] }).text, '도착했어요!');
  assert.match(endMessage({ state: 'lost', score: 3, events: [{ type: 'lose', reason: 'timeUp' }] }).text, /시간이 끝났어요/);
  assert.match(endMessage({ state: 'lost', score: 0, events: [{ type: 'lose', reason: 'livesZero' }] }).text, /목숨/);
  assert.match(endMessage({ state: 'halted', score: 0, events: [], diagnostics: [{ studentHint: '물건이 너무 많이 생겨서 게임을 잠깐 멈췄어요.' }] }).text, /물건/);
});

// ── 카탈로그 ──
test('getStudioCatalog: 네 장르, 잠금 없음, 부를 때마다 새 id, 계약·실행 검증 통과', () => {
  const cat = getStudioCatalog();
  assert.equal(cat.length, 1);
  assert.equal(cat[0].mode, 'studio');
  assert.deepEqual(cat[0].missions.map(m => m.templateId), ['catch', 'avoid', 'collect', 'maze']);
  for (const m of cat[0].missions) {
    assert.equal(m.status, 'open');
    const a = m.makeProject(), b = m.makeProject();
    assert.notEqual(a.id, b.id);
    assert.deepEqual(validateProject(a).filter(d => d.severity === 'error'), []);
    assert.equal(verifyProject(a).ok, true, m.id);
    assert.doesNotThrow(() => createProjectStore(a));
  }
  assert.throws(() => makeStudioProject('nope'));
});

test('newRequestId: JobSchema requestId 길이(8~64)·중복 없음', () => {
  const ids = new Set(Array.from({ length: 200 }, newRequestId));
  assert.equal(ids.size, 200);
  for (const id of ids) assert.ok(id.length >= 8 && id.length <= 64);
});
