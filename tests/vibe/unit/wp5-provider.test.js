// WP5 Groq 어댑터 — 가짜 fetch로 HTTP 수준 고장을 주입한다. 실제 네트워크 호출 없음.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGroqProvider, parseDuration, parseJsonObject } from '../../../lib/vibe/providers/groq.js';
import { createMockProvider, createMockFetch } from '../../../lib/vibe/providers/mock.js';
import { capabilityOf, resolveModels, chooseResponseFormat, DEFAULT_MODELS } from '../../../lib/vibe/providers/capabilities.js';

const KEY = 'gsk_unit_secret_key_ABCDEFGHIJ';
const req = (o = {}) => ({ model: 'openai/gpt-oss-120b', system: 's', user: '{"student_request":"x"}', schema: { type: 'object' }, maxOutputTokens: 512, ...o });

test('정상 응답: JSON 객체·usage·finish_reason, 요청 본문에 서버 모델·형식', async () => {
  const p = createMockProvider([{ type: 'ok', output: { status: 'patch', summary: '요', operations: [] } }], { env: { GROQ_API_KEY: KEY } });
  const r = await p.complete(req());
  assert.equal(r.ok, true);
  assert.deepEqual(r.json.operations, []);
  assert.equal(r.usage.input, 900); assert.equal(r.usage.output, 120);
  const body = p.calls[0].body;
  assert.equal(body.model, 'openai/gpt-oss-120b');
  assert.equal(body.response_format.type, 'json_schema');
  assert.equal(body.response_format.json_schema.strict, true);
  assert.equal(body.reasoning_effort, 'low');
  assert.equal(body.max_completion_tokens, 512 + 1536, 'reasoning 모델은 여유 토큰을 더한다');
  assert.equal(body.messages.length, 2);
});

test('strict 미지원 모델은 json_object로 보낸다 (지원 안 하는 조합을 억지로 보내지 않음)', async () => {
  const p = createMockProvider([{ type: 'ok', output: { status: 'patch', summary: 'a', operations: [] } }], { env: { GROQ_API_KEY: KEY } });
  await p.complete(req({ model: 'llama-3.1-8b-instant' }));
  assert.deepEqual(p.calls[0].body.response_format, { type: 'json_object' });
  assert.equal(p.calls[0].body.reasoning_effort, undefined);
  assert.equal(chooseResponseFormat('openai/gpt-oss-20b', { VIBE_GROQ_STRUCTURED: 'json_object' }), 'json_object');
  assert.equal(capabilityOf('unknown/model').maxOutput, 4096);
});

test('AI01: 잘린 JSON · finish_reason=length · 빈 content · refusal 검출', async () => {
  for (const [sc, kind] of [['truncated_json', 'invalid_json'], ['length', 'truncated'], ['empty', 'empty'], ['refusal', 'refusal']]) {
    const r = await createMockProvider([sc], { env: { GROQ_API_KEY: KEY } }).complete(req());
    assert.equal(r.ok, false, sc); assert.equal(r.error.kind, kind, sc);
    assert.equal(r.error.format, ['invalid_json', 'truncated', 'empty'].includes(kind));
  }
  assert.equal(parseJsonObject('```json\n{"a":1}\n```').a, 1);
  assert.equal(parseJsonObject('[1]'), null);
  assert.equal(parseJsonObject('{"a":'), null);
});

test('429: Retry-After·잔여량 헤더를 읽고 재시도 가능 오류로 분류', async () => {
  const r = await createMockProvider([{ type: '429', retryAfter: '2' }], { env: { GROQ_API_KEY: KEY } }).complete(req());
  assert.equal(r.error.kind, 'rate_limited'); assert.equal(r.error.retryable, true); assert.equal(r.error.retryAfterMs, 2000);
  assert.equal(r.rate.remainingTokens, 0); assert.equal(r.rate.resetRequestsMs, 179560); assert.equal(r.rate.resetTokensMs, 7660);
  assert.equal(parseDuration('1h2m3s'), 3723000); assert.equal(parseDuration('500ms'), 500); assert.equal(parseDuration(null), null);
});

test('AI04: 401/없는 모델은 관리 오류(admin) — 학생 탓 아님, 재시도 안 함', async () => {
  for (const [sc, kind] of [['401', 'auth'], ['model_not_found', 'model_not_found']]) {
    const r = await createMockProvider([sc], { env: { GROQ_API_KEY: KEY } }).complete(req());
    assert.equal(r.error.kind, kind); assert.equal(r.error.admin, true); assert.equal(r.error.retryable, false);
  }
  const none = await createGroqProvider({ env: {}, fetch: async () => { throw new Error('should not be called'); } }).complete(req());
  assert.equal(none.error.kind, 'not_configured'); assert.equal(none.error.admin, true);
});

test('500/503은 server, 12초 대신 설정한 타임아웃에서 AbortController로 끊는다', async () => {
  assert.equal((await createMockProvider(['500'], { env: { GROQ_API_KEY: KEY } }).complete(req())).error.kind, 'server');
  const t0 = Date.now();
  const r = await createMockProvider(['timeout'], { env: { GROQ_API_KEY: KEY, VIBE_GROQ_TIMEOUT_MS: '60' } }).complete(req());
  assert.equal(r.error.kind, 'timeout');
  assert.ok(Date.now() - t0 < 2000);
  const r2 = await createMockProvider(['timeout'], { env: { GROQ_API_KEY: KEY } }).complete(req({ timeoutMs: 40 }));
  assert.equal(r2.error.kind, 'timeout', '호출별 timeoutMs(남은 deadline)가 더 짧으면 그것을 쓴다');
});

test('외부 취소 신호는 aborted', async () => {
  const ctrl = new AbortController();
  const p = createMockProvider(['timeout'], { env: { GROQ_API_KEY: KEY } });
  setTimeout(() => ctrl.abort(), 30);
  const r = await p.complete(req({ signal: ctrl.signal }));
  assert.equal(r.error.kind, 'aborted');
});

test('키 회전 금지: GROQ_API_KEY_2~4가 있어도 한 번의 complete는 한 번의 요청·한 개의 키만 쓴다', async () => {
  const auths = [];
  const f = createMockFetch(['401', '401', '401']);
  const wrapped = async (url, init) => { auths.push(init.headers.Authorization); return f(url, init); };
  const p = createGroqProvider({ env: { GROQ_API_KEY: KEY, GROQ_API_KEY_2: 'gsk_k2', GROQ_API_KEY_3: 'gsk_k3', GROQ_API_KEY_4: 'gsk_k4' }, fetch: wrapped });
  const r = await p.complete(req());
  assert.equal(r.error.kind, 'auth');
  assert.deepEqual(auths, ['Bearer ' + KEY]);
});

test('AI08: 오류 결과에 공급자 원문 메시지·키가 없다', async () => {
  for (const sc of ['401', '429', '500', 'model_not_found', 'truncated_json', 'refusal']) {
    const r = await createMockProvider([sc], { env: { GROQ_API_KEY: KEY } }).complete(req());
    const s = JSON.stringify(r);
    assert.ok(!s.includes(KEY), sc);
    assert.ok(!/Invalid API Key|organization|does not exist|cannot help/i.test(s), sc + ' 공급자 원문 노출');
  }
});

test('모델 ID는 env로만 정한다 — 기본값은 v1 server.js의 현재 모델', () => {
  assert.deepEqual(resolveModels({}), DEFAULT_MODELS);
  assert.deepEqual(resolveModels({ VIBE_GROQ_MODEL_PRIMARY: 'llama-3.3-70b-versatile', VIBE_GROQ_MODEL_LIGHT: 'llama-3.1-8b-instant' }), { primary: 'llama-3.3-70b-versatile', light: 'llama-3.1-8b-instant' });
  assert.equal(resolveModels({ VIBE_GROQ_MODEL_PRIMARY: 'bad model; rm -rf' }).primary, DEFAULT_MODELS.primary);
});
