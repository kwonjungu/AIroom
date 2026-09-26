// 서버 프로젝트 API 클라이언트 — 학생 세션 쿠키(HttpOnly)를 브라우저가 자동으로 붙인다. 공유 헤더 없음.

export class ApiClientError extends Error {
  constructor(status, body, headers) {
    const e = body?.error || {};
    super(e.message || `HTTP ${status}`);
    this.status = status;
    this.code = e.code || (status === 0 ? 'NETWORK' : 'UNKNOWN');
    this.retryable = status === 0 ? true : Boolean(e.retryable);
    this.retryAfterMs = e.retryAfterMs ?? null;
    this.requestId = e.requestId || null;
    const rev = headers?.get?.('x-vibe-revision');
    this.latestRevision = rev === null || rev === undefined ? null : Number(rev);
  }
}

/**
 * @param {{ fetch?: typeof fetch, base?: string }} [opts]
 */
export function createProjectApi(opts = {}) {
  const f = opts.fetch || globalThis.fetch.bind(globalThis);
  const base = opts.base || '/api/vibe';
  async function call(method, path, body) {
    let res;
    try {
      res = await f(base + path, {
        method, credentials: 'same-origin',
        headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch { throw new ApiClientError(0, null, null); }
    let json = null;
    try { json = await res.json(); } catch { /* 빈 본문 */ }
    if (!res.ok) throw new ApiClientError(res.status, json, res.headers);
    return json;
  }
  return {
    startSession: (body) => call('POST', '/session', body),
    createProject: project => call('POST', '/projects', { project }),
    getProject: id => call('GET', `/projects/${encodeURIComponent(id)}`),
    putProject: (id, { baseRevision, project }) => call('PUT', `/projects/${encodeURIComponent(id)}`, { baseRevision, project }),
    listProjects: (cursor = 0) => call('GET', `/projects?cursor=${cursor}`),
    markLastGood: (id, revision) => call('POST', `/projects/${encodeURIComponent(id)}/last-good`, { revision }),
  };
}
