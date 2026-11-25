# 커밋 전 점검 (PRECOMMIT_SCAN)

범위: `git diff`(수정 67개 파일의 추가된 줄)와 새 파일 전체(문서·코드 18개, vendor 298개). 파일은 고치지 않았다.

## 1. 바꿀 것

| 파일:줄 | 종류 | 내용 | 제안(바꿀 문자열) |
|---|---|---|---|
| docs/meeting-2026-11-25/reports/D5.md:27 | 사용자 경로, 실명 | `C:\Users\(계정)\AppData\Local\Temp\claude\40f4efd3...\scratchpad...` | `(저장소 밖 임시 폴더, 경로 생략)` |
| docs/meeting-2026-11-25/reports/FIX_ENGINE.md:153 | 사용자 경로, 실명 | `사용자 홈 폴더(C:/Users/(계정))의 package.json` | `사용자 홈 폴더의 package.json` |
| docs/meeting-2026-11-25/reports/D3.md:23 | 임시 경로 | `~\AppData\Local\Temp\claude\40f4efd3ccefd627\d4fabf8...` (세션 ID 노출, 실명은 없음) | `저장소 밖 임시 폴더` |
| docs/meeting-2026-11-25/reports/AUDIT_UI_R1.md:37, AUDIT_FIRESTORE_R1.md:75, FIX_ENGINE.md:21 | 임시 폴더 언급 | scratchpad 폴더 이름만 나옴(경로 아님, 위험 낮음) | 그대로 두어도 됨 |

## 2. 커밋하면 안 되는 파일

| 파일 | 이유 | 제안 |
|---|---|---|
| firestore-debug.log (루트, 170KB, 새 파일) | 에뮬레이터 로그. .gitignore에 없음. 안에서 이름, 경로, 키는 찾지 못했다 | `git add` 제외, .gitignore에 `firestore-debug.log` 와 `*-debug.log` 추가 |

- 이미 무시되는 것: `tests/zzoom/__pycache__/`, `public/zzoom/assets/_src/`, `data/`, `data-copy/`, `node_modules/`. 새 파일 중 스크린샷(png, jpg), .env, zip, hwp 파일은 없다.

## 3. 이상 없음

- 이메일 주소: 새로 들어온 줄에 없음.
- 키와 토큰(AIza, sk-, gsk_, BEGIN PRIVATE, refresh_token, client_secret, ghp_): diff, 새 파일, vendor 모두 없음.
- defaults/staff.json의 직원 이름 17개 대조: 새로 들어온 줄 중 위 두 건(권○구, 경로 안)을 빼면 없음. 두 SPA와 codocs의 기존 예시 글은 제외했다.
- 학생 정보(학번, 생년월일, 주민번호, 전화번호 패턴): 없음.
- vendor(pdfjs-dist-6.5.438, silurus-ooxml-0.90.2, 11MB, 298개): 사용자 경로, 이름, 키가 없다. 두 폴더 모두 LICENSE 파일이 들어 있다. 3MB 넘는 파일은 없다.
