# 개인정보 점검 (PII_SWEEP)

점검일 2026-11-25. 대상 93개(git status 새·바뀐 파일 + origin/feat/meeting...HEAD 파일, package-lock 제외). 파일은 고치지 않았다.

## 긴급
없음. API 키(AIza, sk-, gsk_, ghp_, xox), BEGIN PRIVATE KEY, 서비스 계정 JSON 값은 한 건도 없다. `private_key`·`FIREBASE_SERVICE_ACCOUNT` 는 lib/storage-token.js, lib/zzoom/fb.js, gcp.js 에서 환경변수 이름과 필드 이름으로만 나온다(값 없음).

## 찾은 것
| 파일:줄 | 종류 | 권하는 바꿀 값 |
|---|---|---|
| docs/meeting-2026-11-25/briefs/AUDIT_ROUND.md:15 | PC 사용자 폴더 경로 | `<저장소>` 또는 상대 경로 |
| docs/meeting-2026-11-25/briefs/FIRESTORE_LOCK.md:13 | PC 사용자 폴더 경로 | 상동 |
| docs/meeting-2026-11-25/briefs/FIX_ENGINE.md:6 | PC 사용자 폴더 경로 | 상동 |
| docs/meeting-2026-11-25/briefs/REDTEAM_LOAD.md:4 | PC 사용자 폴더 경로 | 상동 |
| docs/meeting-2026-11-25/reports/D2.md:35 | 경로(스크린샷 임시폴더) | `<임시폴더>\d2shots\` |
| docs/meeting-2026-11-25/reports/D3.md:23 | 경로(스크린샷 임시폴더) | `<임시폴더>\d3shots\` |
| docs/meeting-2026-11-25/reports/D5.md:18 | 경로(스크린샷 임시폴더) | `<임시폴더>\d5shots\` |
| docs/meeting-2026-11-25/reports/LOAD.md:8 | 경로(임시폴더 사본) | `<임시폴더>` |
| docs/meeting-2026-11-25/reports/PPTX_BAKEOFF.md:7, :30 | 경로(작업 폴더) | `<작업폴더>\bake\` |
| index.html:1639, 1675, 1755, 5464 | 실제 교직원 이름(○○○) 입력 예시 | `예: 홍길동` |
| index.html:1717 | 실제 교직원 이름 4명(○○○, ○○○, ○○○, ○○○) | `예: 홍길동, 김철수, 이영희` |
| index.html:1731 | 실제 교직원 이름(○○○) | `예: 교감 홍길동` |
| public/index.html:1750, 1838, 1917, 5373 | 이름(○○○) 예시 | `예: 홍길동` |
| public/index.html:1880 | 이름 4명 | 위와 같음 |
| public/index.html:1894 | 이름(○○○) | 위와 같음 |
| public/lib/codocs.js:261 | 이름(○○○, 관리자 안내) | `관리자 계정` |
| public/lib/codocs.js:403 | 이름(○○○) 예시 | `예: 홍길동` |

참고: index.html 의 이름 예시 줄은 이번 변경분이 아니라 기존 내용일 가능성이 높다(파일이 수정 목록에 있어 점검 범위에 들었다). 공개 저장소이고 defaults/staff.json 자체에도 실명이 있으니 별도 판단이 필요하다.

## 문제 없음으로 본 것
- tests/zzoom/units.test.js:8 `sa@x.iam.gserviceaccount.com`: 시험용 가짜 주소.
- tests/zzoom/draw_e2e.py:132 `김○수`: 가운데 글자 가린 가짜 학생 이름.
- 전화번호(010-), 주민번호 꼴, 실제 이메일, 학생 실명: 없음.
- tests/zzoom/__pycache__/ (.pyc)는 .gitignore 에 안 걸려 있으니 커밋 전 제외하거나 ignore 에 추가 권장(개인정보는 아님).
