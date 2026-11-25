# 창고(Storage) 잠그기 — 2026-11-25

## 문제
운영 Storage 규칙이 2026-03-13부터 `allow read: if true` 였다. 로그인 없이 누구나 폴더 목록을 보고(연수 이수증 PDF 등) 10MB까지 올릴 수 있었다.

## 고친 것
- `lib/storage-token.js` + `server.js` `GET /api/firebase-token`(requireAuth): 백암이 로그인 세션이면 Firebase 맞춤 토큰을 준다. 실서비스 claim `ba:1`, 카피본(`/api/copy/...`) claim `cp:1`. 키는 env `FIREBASE_SERVICE_ACCOUNT`(쭘과 같은 값), 없으면 503 → 화면은 예전처럼 동작.
- 두 SPA: `firebase-auth-compat` 추가, `ensureStorageAuth()` 가 업로드·삭제 전에 토큰으로 로그인. 출입증은 탭 메모리에만(Persistence NONE — 실서비스와 카피본이 같은 도메인).
- `storage.rules`: 쭘 밖 경로는 `ba` 만, 카피본 `cp` 는 `copy/` 아래만. 크기 10MB 상한 유지, 지우기 허용(예전엔 지우기가 규칙 오류로 늘 실패했다).
- 이미 화면·데이터에 저장된 다운로드 주소(`?alt=media&token=`)는 규칙을 거치지 않으므로 기존 배너·첨부 링크는 그대로 열린다.

## 확인
- 규칙: Firebase Rules 시험 API(`projects.test`, 게시 아님)로 15건 15 통과 — 비로그인 읽기·목록·쓰기 거절, 백암이 읽기·쓰기·지우기, 10MB 초과 거절, 카피본은 copy/ 만, 쭘 출입증으로 실서비스 거절, 쭘 같은 회의 읽기·만료 거절.
- 서버: 비로그인 401, 키 없음 503, 가짜 키로 user→`{ba:1}`, copy→`{cp:1}`, 서명 검증 통과.
- 화면: 로컬 `/`, `/copy` 에서 스크립트 오류 0.
- 실제 Firebase 로그인→업로드는 서비스 계정 키가 있어야 확인 가능(아직 못 함).

## 게시 순서 (순서가 바뀌면 업로드가 멈춘다)
1. Firebase 콘솔 → Authentication → 「시작하기」(맞춤 토큰 로그인에 필요, 제공업체는 켜지 않아도 됨).
2. 콘솔 → 프로젝트 설정 → 서비스 계정 → 새 비공개 키 → Vercel 환경변수 `FIREBASE_SERVICE_ACCOUNT` 에 JSON 통째로.
3. 코드 배포 → Preview 에서 로그인 후 배너나 연수 챙김이 PDF 올리기가 되는지 확인(이때는 규칙이 아직 열려 있어 무조건 됨, 콘솔 네트워크에서 `/api/firebase-token` 200 확인).
4. `storage.rules` 게시 → 같은 업로드 다시 확인, 로그아웃 창에서 창고 주소 직접 요청이 403 인지 확인.
되돌리기: `rules-backup/2026-11-25_storage_live.rules` 재게시.
