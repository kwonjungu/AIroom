# 규칙 게시 초안 (2026-11-26) — 실행하지 말 것, 게시는 사람이 한다

프로젝트 airoom-ebce3, Firestore 데이터베이스 `kwon`, Storage 버킷 airoom-ebce3.firebasestorage.app.
운영 규칙 읽은 시각 2026-11-26: Firestore 마지막 게시 2026-09-07, Storage 마지막 게시 2026-03-13(둘 다 11-25 백업과 글자 하나 안 다름).

## 이번 게시(1안, 2026-11-26 2차 준비) — 이것만 쓴다
결정: Firestore 는 운영 규칙에 쭘(zzoom_meetings) 블록만 끼운 것(codocs·bap 잠금 안 넣음), Storage 는 저장소 storage.rules 전체(기존 앱 잠금 + 쭘).
| 파일 | 내용 |
|---|---|
| firestore.publish.rules | 운영(2026-11-26 pre-publish 백업) + 저장소 firestore.rules 의 쭘 블록 29줄. 운영 줄 삭제·변경 0 |
| storage.publish+lock.rules | 저장소 storage.rules 그대로(옛 파일은 .old 로 보존) |
| firebase.publish2.json | 위 두 파일만 가리키는 설정(Firestore DB kwon, Storage 기본 버킷) |
| ../rules-backup/2026-11-26_pre-publish_*.rules | 게시 직전 운영 규칙 백업(아침 백업과 글자 같음) |

게시(사람이 실행. storage 는 STORAGE_LOCK.md 순서대로 코드 배포 뒤에):
```
cd <저장소 폴더>\docs\meeting-2026-11-25\publish
npx firebase-tools deploy --only firestore:kwon,storage --project airoom-ebce3 --config firebase.publish2.json
```
되돌리기(둘 다 pre-publish 백업 = 지금 운영 그대로. firebase.rollback.json 의 2026-11-26 백업과 내용이 같다):
```
npx firebase-tools deploy --only firestore:kwon,storage --project airoom-ebce3 --config firebase.rollback.json
```
아래 「파일」 이하는 1차 준비(잠금 포함 여러 안) 기록이다. firestore.publish+lock.rules·firebase.publish*.json 의 옛 안은 이번에 쓰지 않는다.

## 파일
| 파일 | 내용 |
|---|---|
| ../rules-backup/2026-11-26_firestore_kwon_live.rules, ..._storage_live.rules | 운영 규칙 백업(읽기만 해서 저장) |
| firestore.publish.rules | 운영 + 쭘 블록(zzoom_meetings) 29줄 추가. 다른 줄 변화 없음 |
| firestore.publish+lock.rules | 위 + firestore_lock_proposal.rules 로 「담당자 계정」~쭘 앞을 교체(급식일지·codocs 잠금) |
| storage.publish.rules | 운영 그대로 + 쭘 규칙 55줄 추가. 기존 공개 규칙이 남아 있다(아래 경고) |
| storage.publish+lock.rules | 저장소 storage.rules 그대로(기존 앱 잠금 + 쭘). 잠금 게시본 |
| firebase.publish.json / firebase.publish-lock.json / firebase.rollback.json | 게시·잠금 게시·되돌리기용 firebase 설정(이 폴더에서 실행) |

## 경고: storage.publish.rules 는 쭘 파일을 보호하지 못한다
운영 Storage 에 `match /{allPaths=**} { allow read: if true; allow write: if true ... }` 가 있다. 규칙은 OR 라서 쭘 블록이 막아도 이 공개 규칙이 zzoom/ 을 연다.
Rules 시험 결과: 쭘 같은 회의 읽기만 PASS, 다른 회의 읽기·비로그인 읽기·비로그인 쓰기는 모두 허용돼 FAIL. 쭘 파일을 지키려면 `storage.publish+lock.rules` 를 써야 하고,
그러려면 STORAGE_LOCK.md 의 순서(서비스 계정 키 FIREBASE_SERVICE_ACCOUNT 확인 → 코드 배포 → 규칙 게시)를 먼저 지켜야 한다(안 지키면 백암이 업로드가 멈춘다).
FIREBASE_SERVICE_ACCOUNT 는 Vercel production·preview 에 이미 있다(이름만 확인).

## 1) 백업(게시 직전에 한 번 더, 날짜를 바꿔 새 이름으로)
```
cd <저장소 폴더>
node <scratch>\fetch.js <firebase-tools 경로> <저장 폴더>      # 운영 규칙 읽기 전용 저장(Rules API releases.get)
```
또는 콘솔 Firestore(kwon) 규칙·Storage 규칙 탭 내용을 복사해 `rules-backup/2026-11-26_*.rules` 와 비교. 이미 있는 백업은 덮어쓰지 않는다.

## 2) 게시 전 시험(게시 아님)
Rules 시험 API `POST https://firebaserules.googleapis.com/v1/projects/airoom-ebce3:test` — 문법 오류 0(경고 2: zzHost 안 쓰는 함수, 변수 이름 request; 저장소 storage.rules 도 같은 경고).

## 3) 게시 (Firestore 만 먼저 권장 — 쭘 읽기 규칙이라 기존 화면에 영향 없음)
```
cd <저장소 폴더>\docs\meeting-2026-11-25\publish
npx firebase-tools deploy --only firestore:kwon --project airoom-ebce3 --config firebase.publish.json
```
Firestore 잠금까지 하려면(코드 배포 뒤, FIRESTORE_LOCK.md 순서대로) `firestore.publish+lock.rules` 를 쓰는 설정:
```
npx firebase-tools deploy --only firestore:kwon --project airoom-ebce3 --config firebase.publish-lock.json
```
Storage(잠금본, 코드 배포 뒤):
```
npx firebase-tools deploy --only storage --project airoom-ebce3 --config firebase.publish-lock.json
```
(firebase.publish.json 의 storage 는 공개 규칙+쭘이라 권장하지 않음.)

## 3-1) Firestore 잠금본의 until 검사(AL01) — 정상 탭이 끊기지 않는 순서
잠금본(`firestore.publish+lock.rules`)의 `isBa()`·`bapOk()` 는 출입증 claim `until`(ms, 세션 만료와 발급+1시간 중 이른 것)이
지금보다 뒤일 때만 연다(`fresh()`). until 이 없는 옛 출입증은 거절되므로 **반드시 아래 순서**로 한다.
1. **코드 먼저 배포**(server.js·lib/storage-token.js·public/lib/codocs.js·public/bap/index.html). 새 출입증에는 until 이 들어가고,
   화면은 until 1분 전에 새 출입증으로 다시 로그인한다. 지금 운영 규칙은 until 을 보지 않으므로 이 단계에서는 아무것도 끊기지 않는다.
2. 배포본에서 확인: 백암이 로그인 뒤 `GET /api/firebase-token`, 급식일지 로그인 뒤 `GET /api/bap/firebase-token` 응답 토큰의
   가운데 부분(base64url)을 풀어 `claims.until` 이 숫자인지 본다(토큰 값은 어디에도 옮겨 적지 않는다).
3. **배포 전부터 열려 있던 탭을 닫거나 새로고침**하게 공지한다(또는 다음 날 아침까지 기다린다). 옛 코드 탭은 until 없는 출입증을 들고 있고,
   Firebase 는 ID 토큰을 갱신해도 claim 을 그대로 유지하므로 잠금본 게시 뒤 그 탭은 `permission-denied` 가 된다(새로고침하면 회복).
4. 그다음 잠금본 게시(위 3)의 `firebase.publish-lock.json` 명령).
- 규칙이 실수로 코드보다 먼저 게시되면: 옛 코드 탭과 옛 서버가 발급한 출입증은 거절된다. 되돌리기(5)로 복원하거나 코드 배포를 마친 뒤 새로고침하면 된다.
- 게시 전 확인: Rules 시험 API 로 until 지난 출입증 거절·유효 출입증 허용(FIX_ASTRA_LOCKS.md 22/22) — 게시가 아니다.
- 로그아웃은 Redis 세션을 지우고 화면의 Firebase 인증도 signOut 한다. 다른 기기·탭에 남은 출입증은 until(최대 1시간)까지 유효할 수 있다(즉시 회수 아님).

## 4) 게시 후 확인
- 읽기 전용으로 운영 규칙 다시 받아 게시본과 글자 비교(`diff`).
- 로그아웃 창에서 Storage 직접 주소(`https://firebasestorage.googleapis.com/v0/b/airoom-ebce3.firebasestorage.app/o?prefix=training-tracker`)가 403 인지(잠금본 게시 뒤).
- 백암이 로그인 → 배너·연수 챙김이 PDF 올리기·지우기, 급식일지 로그인·저장, 함께 만드는 문서 열기.
- 쭘 회의 하나 만들어 입장·쪽 그림 보기·안건 자료 올리기.

## 5) 되돌리기
```
cd <저장소 폴더>\docs\meeting-2026-11-25\publish
npx firebase-tools deploy --only firestore:kwon --project airoom-ebce3 --config firebase.rollback.json
npx firebase-tools deploy --only storage --project airoom-ebce3 --config firebase.rollback.json
```
(둘 다 2026-11-26 백업 = 지금 운영 그대로로 복원. 또는 콘솔 규칙 탭의 「기록」에서 이전 게시본 복원.)
