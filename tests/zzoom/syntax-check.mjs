// 쭘 화면 모듈이 모두 문법 오류 없이 읽히는지 확인(감사 R9 S1: 주석 한 줄로 draw.js 가 통째로 안 뜬 사고 재발 방지)
import { readdirSync, readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
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
// 실제로 불러와 본다 — 없는 이름을 import 하는 오류도 모듈이 통째로 안 뜨게 만든다(감사 R10 T3-T2). app.js 는 불러오면 바로 시작해서 뺀다
for (const f of files) {
  if (f.endsWith('app.js') && !f.includes('convert')) continue;
  try { await import(pathToFileURL(f).href); } catch (e) { bad++; console.error('불러오기 실패:', f, e.message); }
}
// 서울 DB 규칙(firestore.zzoom.rules)의 쭘 블록이 firestore.rules(규칙 시험이 읽는 쪽)와 같은지(감사 R10 T1-3)
const block = f => { const t = readFileSync(fileURLToPath(new URL('../../' + f, import.meta.url)), 'utf8').split(String.fromCharCode(13)).join(''); const i = t.indexOf('match /zzoom_meetings/{mid}'); let d = 0, j = t.indexOf('{', i + 'match /zzoom_meetings/{mid}'.length); for (; j < t.length; j++) { if (t[j] === '{') d++; else if (t[j] === '}' && --d === 0) break; } return t.slice(i, j + 1); };
// 서울 규칙 파일은 쭘 블록 말고 아무것도 열지 않아야 한다 — 블록을 못 찾거나 블록 밖에 allow 가 있으면 실패(감사 R11 U1-2)
{ const z = readFileSync(fileURLToPath(new URL('../../firestore.zzoom.rules', import.meta.url)), 'utf8').split(String.fromCharCode(13)).join('');
  const blk = block('firestore.zzoom.rules');
  if (!blk.includes('allow')) { bad++; console.error('firestore.zzoom.rules 에서 쭘 블록을 못 찾음'); }
  else if (z.replace(blk, '').split(String.fromCharCode(10)).some(x => !x.trim().startsWith('//') && x.includes('allow '))) { bad++; console.error('firestore.zzoom.rules 의 쭘 블록 밖에 allow 가 있습니다'); } }
if (block('firestore.rules') !== block('firestore.zzoom.rules')) { bad++; console.error('firestore.zzoom.rules 의 쭘 블록이 firestore.rules 와 다릅니다'); }
console.log(`문법 확인 ${files.length}개, 오류 ${bad}`);
process.exit(bad ? 1 : 0);
