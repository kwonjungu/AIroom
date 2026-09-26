// WP6 공급자 어댑터(가짜 fetch — 실제 네트워크 호출 없음)·env 게이트·저장소·예산 멱등.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import { createGeminiProvider } from '../../../lib/vibe/assets/providers/gemini.js';
import { createProviderFromEnv } from '../../../lib/vibe/assets/providers/index.js';
import { ProviderError } from '../../../lib/vibe/assets/providers/errors.js';
import { mockImages, pngBytes } from '../../../lib/vibe/assets/providers/mock.js';
import { createMemoryStorage, createLocalFileStorage, createObjectStorage } from '../../../lib/vibe/assets/storage.js';
import { createAssetBudget } from '../../../lib/vibe/assets/budget.js';
import { createMemoryKv } from '../../../lib/vibe/kv/index.js';

function fakeFetch(respond) {
  const calls = [];
  const f = async (url, init) => { calls.push({ url, init }); return respond(url, init); };
  f.calls = calls;
  return f;
}
const res = (status, body, headers = {}) => ({ status, ok: status >= 200 && status < 300, headers: { get: k => headers[k.toLowerCase()] ?? null }, text: async () => (typeof body === 'string' ? body : JSON.stringify(body)) });
const req = { prompt: 'PROMPT', width: 512, height: 512, jobRef: 'aj_x' };

test('gemini 초안: 키는 헤더(x-goog-api-key)로만, 이미지 전용 응답, 고정 호스트', async () => {
  const png = pngBytes(mockImages.sprite(64));
  const f = fakeFetch(() => res(200, { candidates: [{ content: { parts: [{ inlineData: { mimeType: 'image/png', data: Buffer.from(png).toString('base64') } }] } }] }));
  const g = createGeminiProvider({ apiKey: 'KEY-123', fetch: f });
  assert.equal(g.live, true);
  assert.equal(g.capabilities.transparent, false);
  const out = await g.generate(req);
  assert.equal(out.status, 'done');
  assert.deepEqual(Buffer.from(out.bytes), Buffer.from(png));
  assert.equal(f.calls.length, 1);
  const { url, init } = f.calls[0];
  assert.equal(url, 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent');
  assert.ok(!url.includes('KEY-123'));
  assert.equal(init.headers['x-goog-api-key'], 'KEY-123');
  assert.equal(init.redirect, 'error');
  const body = JSON.parse(init.body);
  assert.deepEqual(body.generationConfig.responseModalities, ['IMAGE']);
  assert.equal(body.contents[0].parts[0].text, 'PROMPT');
  assert.throws(() => createGeminiProvider({ apiKey: 'k', endpoint: 'https://evil.example/v1' }), /endpoint/);
});

test('gemini 초안: 원격 URL 응답 거부(SSRF), 429 재시도 / 401 재시도 안 함, 안전 차단, 이미지 없음', async () => {
  const cases = [
    [res(200, { candidates: [{ content: { parts: [{ fileData: { fileUri: 'http://169.254.169.254/x' } }] } }] }), 'REMOTE_URL_REFUSED', false],
    [res(429, {}), 'PROVIDER_RATE_LIMITED', true],
    [res(401, {}), 'PROVIDER_AUTH', false],
    [res(503, {}), 'PROVIDER_5XX', true],
    [res(200, { promptFeedback: { blockReason: 'SAFETY' } }), 'SAFETY_BLOCKED', false],
    [res(200, { candidates: [{ content: { parts: [{ text: 'no image' }] } }] }), 'NO_IMAGE', true],
    [res(200, 'x', { 'content-length': String(50 * 1024 * 1024) }), 'RESPONSE_TOO_LARGE', false],
  ];
  for (const [r, code, retryable] of cases) {
    const g = createGeminiProvider({ apiKey: 'k', fetch: fakeFetch(() => r) });
    await assert.rejects(g.generate(req), e => e instanceof ProviderError && e.code === code && e.retryable === retryable, code);
  }
});

test('env 게이트: 유료 공급자는 VIBE_ASSET_LIVE=1 + 키가 모두 있어야 켜진다', () => {
  assert.equal(createProviderFromEnv({}).provider, null);
  assert.equal(createProviderFromEnv({ VIBE_ASSET_PROVIDER: 'gemini', GEMINI_API_KEY: 'k' }).provider, null);
  assert.equal(createProviderFromEnv({ VIBE_ASSET_PROVIDER: 'gemini', VIBE_ASSET_LIVE: '1' }).provider, null);
  const on = createProviderFromEnv({ VIBE_ASSET_PROVIDER: 'gemini', VIBE_ASSET_LIVE: '1', VIBE_GEMINI_API_KEY: 'k' }, { fetch: async () => { throw new Error('no network in tests'); } });
  assert.equal(on.provider.id, 'gemini');
  assert.equal(createProviderFromEnv({ VIBE_ASSET_PROVIDER: 'mock' }).provider.id, 'mock');
  assert.equal(createProviderFromEnv({ VIBE_ASSET_PROVIDER: 'dalle' }).provider, null);
});

test('저장소: 내용 주소(같은 바이트 = 같은 id), 승인 상태, 경로 조작 거부, 로컬 파일, Object Storage는 미연결 오류', async () => {
  const bytes = pngBytes(mockImages.sprite(32));
  for (const s of [createMemoryStorage(), createLocalFileStorage({ dir: fs.mkdtempSync(path.join(os.tmpdir(), 'wp6-')) })]) {
    const a = await s.put(bytes, { mime: 'image/png', approval: 'quarantine' });
    const b = await s.put(bytes, { mime: 'image/png', approval: 'quarantine' });
    assert.equal(a.assetId, b.assetId);
    assert.match(a.assetId, /^ga_[a-f0-9]{32}$/);
    assert.equal((await s.head(a.assetId)).approval, 'quarantine');
    await s.put(bytes, { mime: 'image/png', approval: 'approved', provider: 'mock' });   // 승격
    assert.equal((await s.head(a.assetId)).approval, 'approved');
    assert.deepEqual(Buffer.from((await s.get(a.assetId)).bytes), Buffer.from(bytes));
    assert.equal(await s.get('../../etc/passwd'), null);
    assert.equal(await s.head('ga_' + 'z'.repeat(32)), null);
  }
  await assert.rejects(createObjectStorage().put(bytes, {}), e => e.code === 'STORAGE_NOT_CONNECTED');
});

test('예산: 같은 예약 id 재시도는 중복 차감 없음, 정산·해제 반복 안전, 동시 예약도 한도 지킴', async () => {
  const kv = createMemoryKv();
  const b = createAssetBudget(kv, { limits: { classDailyMicroUsd: 100, orgDailyMicroUsd: 1000, studentDailyCount: 100 } });
  assert.equal((await b.reserve({ reservationId: 'r1', classId: 'c1', studentId: 's1', amount: 40 })).ok, true);
  assert.equal((await b.reserve({ reservationId: 'r1', classId: 'c1', studentId: 's1', amount: 40 })).repeated, true);
  assert.equal((await b.usage({ classId: 'c1' })).classMicroUsd, 40);
  await b.settle('r1', 30); await b.settle('r1', 30);
  assert.equal((await b.usage({ classId: 'c1' })).classMicroUsd, 30);
  const rs = await Promise.all(Array.from({ length: 10 }, (_, i) => b.reserve({ reservationId: 'p' + i, classId: 'c1', studentId: 's' + i, amount: 20 })));
  assert.equal(rs.filter(r => r.ok).length, 3);                 // 30 + 3×20 = 90 ≤ 100
  assert.ok(rs.filter(r => !r.ok).every(r => r.scope === 'class'));
  for (let i = 0; i < 10; i++) await b.release('p' + i);
  await b.release('p0');
  assert.equal((await b.usage({ classId: 'c1' })).classMicroUsd, 30);
});
