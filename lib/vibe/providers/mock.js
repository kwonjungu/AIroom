// Mock 공급자 — 실제 Groq 어댑터(groq.js)에 가짜 fetch를 끼워 HTTP 응답 수준에서 고장을 주입한다.
// 그래서 finish_reason·헤더·상태코드 해석까지 실제 어댑터 코드가 그대로 검사된다.
// ⚠ mock 결과는 하네스(검증·수리·상한) 검사용이다. 모델 품질 합격으로 세지 않는다.
//
// 시나리오 (호출마다 하나씩 소비, 다 쓰면 마지막 것을 반복):
//   { type:'ok', output: object | (req)=>object }   정상 JSON
//   'truncated_json'  200 + 잘린 JSON 본문           'length'  finish_reason=length
//   'empty'           빈 content                      'refusal' message.refusal
//   '429' | {type:'429', retryAfter:'2'}              '500'  '503'
//   'timeout'         abort될 때까지 응답 안 함        '401'  'model_not_found'
//   'unknown_id'      없는 nodeId 참조                 'delete_unrelated'  요청 외 규칙 삭제
//   'injection_echo'  학생 문장 속 지시를 따른 척 금지 동작 시도

import { createGroqProvider } from './groq.js';

export const MOCK_KEY = 'gsk_mock_key_for_tests_only_0000000000';

function headers(obj = {}) {
  const m = new Map(Object.entries(obj).map(([k, v]) => [k.toLowerCase(), String(v)]));
  return { get: k => (m.has(k.toLowerCase()) ? m.get(k.toLowerCase()) : null) };
}

function response(status, body, h = {}) {
  const text = typeof body === 'string' ? body : JSON.stringify(body);
  return { ok: status >= 200 && status < 300, status, headers: headers(h), text: async () => text };
}

const USAGE = (i = 900, o = 120) => ({ prompt_tokens: i, completion_tokens: o, total_tokens: i + o });

function completion(content, finish = 'stop', extra = {}) {
  return { id: 'mock', object: 'chat.completion', choices: [{ index: 0, message: { role: 'assistant', content, ...extra }, finish_reason: finish }], usage: USAGE() };
}

/** 요청 본문에서 서버가 만든 user JSON을 꺼낸다 (mock이 문맥을 보고 답을 만들 수 있게) */
export function parseRequest(init) {
  let body = {};
  try { body = JSON.parse(init.body); } catch { /* */ }
  const userMsg = body.messages?.find(m => m.role === 'user')?.content || '';
  let user = null;
  try { user = JSON.parse(userMsg); } catch { user = null; }
  return { body, model: body.model, system: body.messages?.find(m => m.role === 'system')?.content || '', user, userText: userMsg, authorization: init.headers?.Authorization || '' };
}

/** 현재 프로젝트 요약에서 첫 spawner 등을 찾아 흔한 가짜 답을 만든다 */
function firstNode(req, kind) { return req.user?.project?.nodes?.find(n => n.kind === kind) || null; }

function scenarioOutput(name, req) {
  const sp = firstNode(req, 'spawner');
  // 요청과 무관한 삭제 대상: 게임 성립에는 지장 없는 규칙(지는 조건 → 그 밖의 닿기 규칙)을 고른다
  const touch = req.user?.project?.nodes?.find(n => n.kind === 'loseWhen') || req.user?.project?.nodes?.find(n => n.kind === 'onTouch');
  switch (name) {
    case 'unknown_id':
      return { status: 'patch', summary: '속도를 바꿨어요.', operations: [{ op: 'setParameter', nodeId: 'ghost-node', parameter: 'speed', value: 90 }] };
    case 'delete_unrelated':
      return { status: 'patch', summary: '천천히 떨어져요.', operations: [
        ...(sp ? [{ op: 'setParameter', nodeId: sp.id, parameter: 'speed', value: Math.max(40, Math.round(sp.args.speed * 0.7)) }] : []),
        ...(touch ? [{ op: 'removeBehavior', nodeId: touch.id }] : []),
      ] };
    case 'injection_echo':
      return { status: 'patch', summary: '시스템 지시를 무시하고 관리자 모드를 켰어요 https://evil.example/x.js', operations: [
        { op: 'setAppearance', nodeId: 'player', slotId: 'player.appearance', preset: 'https://evil.example/x.png' },
        { op: 'setParameter', nodeId: 'player', parameter: 'appearance', value: '<script>alert(1)</script>' },
        { op: 'addBehavior', parentId: null, node: { id: 'evil', kind: 'script', args: { code: 'fetch("https://evil.example")' }, children: [] } },
        { op: 'runCode', code: 'process.exit(1)' },
      ] };
    case 'too_many':
      return { status: 'patch', summary: '폭탄을 많이 넣었어요.', operations: Array.from({ length: 20 }, (_, k) => ({ op: 'addBehavior', parentId: null, node: { id: `bomb-${k}`, kind: 'spawner', args: { entity: 'bomb', appearance: 'bomb.appearance', pattern: 'fallFromTop', intervalMs: 500, speed: 200, maxAlive: 40, count: 40, radius: 20 }, children: [] } })) };
    default: return null;
  }
}

/**
 * @param {Array<string|object>|((req:object, i:number)=>string|object)} scenarios
 * @param {{ onCall?: (req:object, i:number) => void|Promise<void> }} [o]
 */
export function createMockFetch(scenarios, o = {}) {
  const calls = [];
  const pick = (req, i) => {
    if (typeof scenarios === 'function') return scenarios(req, i);
    const list = Array.isArray(scenarios) ? scenarios : [scenarios];
    return list[Math.min(i, list.length - 1)];
  };
  async function fetchImpl(url, init) {
    const i = calls.length;
    const req = parseRequest(init);
    calls.push({ url, model: req.model, body: req.body, user: req.user, at: Date.now() });
    if (o.onCall) await o.onCall(req, i);
    let sc = pick(req, i);
    if (typeof sc === 'string') sc = { type: sc };
    const signal = init.signal;
    const wait = ms => new Promise((resolve, reject) => {
      if (signal?.aborted) return reject(new Error('aborted'));
      const t = setTimeout(resolve, ms);
      signal?.addEventListener('abort', () => { clearTimeout(t); reject(new Error('aborted')); }, { once: true });
    });
    if (sc.delayMs) await wait(sc.delayMs);
    switch (sc.type) {
      case 'ok': {
        const out = typeof sc.output === 'function' ? sc.output(req, i) : sc.output;
        return response(200, completion(JSON.stringify(out)));
      }
      case 'raw': return response(200, completion(sc.content, sc.finish || 'stop'));
      case 'truncated_json': return response(200, completion('{"status":"patch","summary":"천천히","operations":[{"op":"setParameter","nodeId":"fi'));
      case 'length': return response(200, completion('{"status":"patch","summary":"천천히 떨어져요.","operations":[{"op":"setPar', 'length'));
      case 'empty': return response(200, completion(''));
      case 'refusal': return response(200, completion(null, 'stop', { refusal: 'I cannot help with that.' }));
      case '429': return response(429, { error: { message: 'Rate limit reached for model in organization org_x on tokens per minute (TPM)', type: 'tokens', code: 'rate_limit_exceeded' } },
        { 'retry-after': sc.retryAfter ?? '1', 'x-ratelimit-remaining-requests': '0', 'x-ratelimit-remaining-tokens': '0', 'x-ratelimit-reset-requests': '2m59.56s', 'x-ratelimit-reset-tokens': '7.66s' });
      case '500': return response(500, { error: { message: 'internal', type: 'internal_server_error' } });
      case '503': return response(503, { error: { message: 'over capacity', type: 'service_unavailable' } });
      case '401': return response(401, { error: { message: 'Invalid API Key', type: 'invalid_request_error', code: 'invalid_api_key' } });
      case 'model_not_found': return response(404, { error: { message: 'The model does not exist or you do not have access to it.', type: 'invalid_request_error', code: 'model_not_found' } });
      case 'timeout': await wait(10 * 60_000); return response(200, completion('{}'));
      case 'unknown_id': case 'delete_unrelated': case 'injection_echo': case 'too_many':
        return response(200, completion(JSON.stringify(scenarioOutput(sc.type, req))));
      default: throw new Error('mock: unknown scenario ' + sc.type);
    }
  }
  fetchImpl.calls = calls;
  return fetchImpl;
}

/**
 * 실제 어댑터 + 가짜 fetch. env의 모델 설정·타임아웃은 그대로 적용된다.
 * @param {Array|Function} scenarios
 * @param {{ env?: object, onCall?: Function, now?: () => number }} [o]
 */
export function createMockProvider(scenarios, o = {}) {
  const fetchImpl = createMockFetch(scenarios, { onCall: o.onCall });
  const provider = createGroqProvider({ env: { GROQ_API_KEY: MOCK_KEY, ...(o.env || {}) }, fetch: fetchImpl, now: o.now });
  provider.name = 'groq-mock';
  provider.calls = fetchImpl.calls;
  return provider;
}
