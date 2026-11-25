'use strict';
// 쭘 보안 규칙 시험 실행기(지적15). 에뮬레이터(Firebase CLI + Java)로 tests/zzoom/rules.test.js 를 돌린다.
// 돌리지 못하면 skip 으로 통과처럼 보이지 않게 **실패(종료 코드 1)** 로 끝낸다(ZZOOM_REQUIRE_RULES=1).
// 필요: npm i -D @firebase/rules-unit-testing, firebase-tools(전역 또는 npx), Java 11+.
// 실행: npm run test:zzoom:rules
const { spawnSync } = require('node:child_process');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..');
try { require.resolve('@firebase/rules-unit-testing', { paths: [ROOT] }); }
catch { console.error('규칙 시험을 돌리지 못했습니다: @firebase/rules-unit-testing 이 없습니다(npm i -D @firebase/rules-unit-testing).'); process.exit(1); }

const cfg = path.join(__dirname, 'firebase.emulator.json');
const inner = 'node --test tests/zzoom/rules.test.js';
const r = spawnSync('firebase', ['emulators:exec', '--config', cfg, '--only', 'firestore,storage', '--project', 'demo-zzoom', inner], {
    cwd: ROOT, stdio: 'inherit', shell: true, env: { ...process.env, ZZOOM_REQUIRE_RULES: '1' }
});
if (r.error || r.status === null) { console.error('규칙 시험을 돌리지 못했습니다(firebase CLI 또는 Java 확인):', r.error?.message || 'signal'); process.exit(1); }
process.exit(r.status);
