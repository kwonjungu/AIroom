// v2 E2E 러너 (WP8) — `npm run test:vibe:e2e`
//
// 1) server.js를 빈 포트로 자식 프로세스로 띄운다(끝나면 그 PID만 종료).
// 2) Python Playwright(flows.py)가 설치된 Chrome으로 핵심 흐름을 돈다(외부 네트워크 불필요).
// 3) 결과 JSON을 docs/vibe-redesign-2026-09-26/evidence/wp8/e2e-result.json 에 쓴다.
// 환경변수: E2E_CHROME(Chrome 경로), E2E_PYTHON(python 실행 파일), E2E_ONLY(쉼표로 흐름 id 제한), E2E_HEADED=1
// 공방(WP3)은 병렬 개발 중이라 flows.py의 FLOWS 목록에 skip으로만 올라가 있다 — 구현되면 함수만 추가하면 된다.

import { spawn, execFileSync } from 'node:child_process';
import { createServer } from 'node:net';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../..');
const outDir = path.join(root, 'docs/vibe-redesign-2026-09-26/evidence/wp8');
const chrome = process.env.E2E_CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const python = process.env.E2E_PYTHON || 'python';

function freePort() {
  return new Promise((res, rej) => {
    const s = createServer();
    s.unref();
    s.on('error', rej);
    s.listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => res(port)); });
  });
}

async function waitHttp(url, ms) {
  const end = Date.now() + ms;
  let last = null;
  while (Date.now() < end) {
    try { const r = await fetch(url); if (r.ok) return true; last = r.status; } catch (e) { last = e.message; }
    await new Promise(r => setTimeout(r, 250));
  }
  throw new Error(`server not ready: ${url} (${last})`);
}

function gitSha() {
  try { return execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(); } catch { return null; }
}

async function main() {
  mkdirSync(outDir, { recursive: true });
  if (!existsSync(chrome)) console.warn(`[e2e] Chrome 없음: ${chrome} — Playwright 기본 chromium을 시도합니다`);
  const port = await freePort();
  const base = `http://127.0.0.1:${port}`;
  const server = spawn(process.execPath, ['server.js'], {
    cwd: root,
    env: { ...process.env, PORT: String(port), VERCEL: '' },
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });
  let serverLog = '';
  server.stdout.on('data', d => { serverLog += d; });
  server.stderr.on('data', d => { serverLog += d; });
  const stopServer = () => { if (server.exitCode === null && !server.killed) { try { process.kill(server.pid); } catch { /* 이미 종료 */ } } };
  process.on('exit', stopServer);
  process.on('SIGINT', () => { stopServer(); process.exit(130); });

  let result;
  try {
    await waitHttp(base + '/vibe-v2/', 20000);
    const started = new Date().toISOString();
    const stdout = await new Promise((res, rej) => {
      const py = spawn(python, [path.join(here, 'flows.py')], {
        cwd: root,
        env: { ...process.env, BASE_URL: base, OUT_DIR: outDir, CHROME: existsSync(chrome) ? chrome : '', PYTHONIOENCODING: 'utf-8' },
        stdio: ['ignore', 'pipe', 'inherit'],
        windowsHide: true,
      });
      let out = '';
      py.stdout.on('data', d => { out += d; });
      py.on('error', rej);
      py.on('close', code => (out.trim() ? res(out) : rej(new Error('flows.py exited ' + code + ' without output'))));
    });
    const json = JSON.parse(stdout.trim().split('\n').filter(l => l.startsWith('{')).pop());
    result = { ...json, meta: { ...json.meta, build: gitSha(), started, finished: new Date().toISOString(), base, node: process.version, chrome } };
  } catch (e) {
    result = { ok: false, error: String(e && e.stack || e), serverLog: serverLog.slice(-2000) };
  } finally {
    stopServer();
  }
  writeFileSync(path.join(outDir, 'e2e-result.json'), JSON.stringify(result, null, 2));
  const s = result.summary || {};
  console.log(`[e2e] 통과 ${s.passed ?? 0} · 실패 ${s.failed ?? 0} · 건너뜀 ${s.skipped ?? 0} → ${path.relative(root, path.join(outDir, 'e2e-result.json'))}`);
  for (const f of result.flows || []) console.log(`  ${f.status === 'passed' ? '✔' : f.status === 'skipped' ? '○' : '✖'} ${f.id}${f.error ? ' — ' + String(f.error).split('\n')[0] : ''}`);
  if (result.error) console.error(result.error);
  process.exitCode = result.ok ? 0 : 1;
}

main();
