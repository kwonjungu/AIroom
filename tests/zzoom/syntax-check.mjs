// 쭘 화면 모듈이 모두 문법 오류 없이 읽히는지 확인(감사 R9 S1: 주석 한 줄로 draw.js 가 통째로 안 뜬 사고 재발 방지)
import { readdirSync, readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
const root = fileURLToPath(new URL('../../public/zzoom/', import.meta.url));
const files = [];
const walk = d => { for (const e of readdirSync(d, { withFileTypes: true })) { const p = join(d, e.name); if (e.isDirectory()) { if (e.name !== 'vendor') walk(p); } else if (p.endsWith('.js')) files.push(p); } };
walk(root);
const tmp = mkdtempSync(join(tmpdir(), 'zzsyn-'));
let bad = 0;
for (const f of files) {
  const t = join(tmp, 'x.mjs');
  writeFileSync(t, readFileSync(f, 'utf8'));
  const r = spawnSync(process.execPath, ['--check', t], { encoding: 'utf8' });
  if (r.status !== 0) { bad++; console.error('문법 오류:', f, (r.stderr || '').split('\n').find(l => /Error/.test(l))); }
}
rmSync(tmp, { recursive: true, force: true });
console.log(`문법 확인 ${files.length}개, 오류 ${bad}`);
process.exit(bad ? 1 : 0);
