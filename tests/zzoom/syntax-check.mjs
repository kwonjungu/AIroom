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
// 서울 DB 규칙(firestore.zzoom.rules)의 쭘 블록이 firestore.rules(규칙 시험이 읽는 쪽)와 같은지(감사 R10 T1-3)
const block = f => { const t = readFileSync(fileURLToPath(new URL('../../' + f, import.meta.url)), 'utf8').split(String.fromCharCode(13)).join(''); const i = t.indexOf('match /zzoom_meetings/{mid}'); let d = 0, j = t.indexOf('{', i + 'match /zzoom_meetings/{mid}'.length); for (; j < t.length; j++) { if (t[j] === '{') d++; else if (t[j] === '}' && --d === 0) break; } return t.slice(i, j + 1); };
if (block('firestore.rules') !== block('firestore.zzoom.rules')) { bad++; console.error('firestore.zzoom.rules 의 쭘 블록이 firestore.rules 와 다릅니다'); }
console.log(`문법 확인 ${files.length}개, 오류 ${bad}`);
process.exit(bad ? 1 : 0);
