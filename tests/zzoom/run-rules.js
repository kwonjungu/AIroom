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

// firebase CLI 는 설정 파일 폴더 밖의 규칙 파일을 거절한다. 저장소 뿌리에 firebase.json 을 두면 배포 설정과 섞이므로
// 임시 폴더에 설정과 규칙 사본을 만들어 쓴다(시험은 rules.test.js 가 저장소의 규칙 파일을 직접 읽어 에뮬레이터에 올린다).
const fs = require('node:fs'), os = require('node:os');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'zzoom-rules-'));
for (const f of ['firestore.rules', 'storage.rules']) fs.copyFileSync(path.join(ROOT, f), path.join(TMP, f));
const base = JSON.parse(fs.readFileSync(path.join(__dirname, 'firebase.emulator.json'), 'utf8'));
base.firestore.rules = 'firestore.rules'; base.storage.rules = 'storage.rules';
const cfg = path.join(TMP, 'firebase.json');
fs.writeFileSync(cfg, JSON.stringify(base));
// shell:true(Windows) 에서는 따옴표로 묶어야 --test 가 firebase 옵션으로 읽히지 않는다
const inner = '"node --test tests/zzoom/rules.test.js"';
const r = spawnSync('firebase', ['emulators:exec', '--config', cfg, '--only', 'firestore,storage', '--project', 'demo-zzoom', inner], {
    cwd: ROOT, stdio: 'inherit', shell: true, env: { ...process.env, ZZOOM_REQUIRE_RULES: '1' }
});
if (r.error || r.status === null) { console.error('규칙 시험을 돌리지 못했습니다(firebase CLI 또는 Java 확인):', r.error?.message || 'signal'); process.exit(1); }
process.exit(r.status);
