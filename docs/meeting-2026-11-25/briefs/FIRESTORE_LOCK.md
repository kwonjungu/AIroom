# Firestore 잠그기: 급식일지(bap_*)·함께 만드는 문서(codocs_*)

레드팀(`reports/REDTEAM.md`)이 찾은 기존 문제: Firestore `kwon` 의 `bap_*`·`codocs_*` 가 규칙상 `read: if true` 라 로그인 없이 누구나 읽는다. codocs 에는 교내 PC IP 대장·교직원 명부가 있다. 사용자가 함께 처리하라고 했다(2026-11-25). Storage 는 이미 같은 방식으로 잠갔다: `STORAGE_LOCK.md`(서버 `GET /api/firebase-token` → 맞춤 토큰 claim `ba:1`/카피본 `cp:1`, 두 SPA `ensureStorageAuth()`).

## 먼저 분석 (보고서 1절)
- codocs(`public/lib/codocs.js`)와 bap(`/bap` 페이지, server.js `/api/bap/*`)이 Firestore 를 **누가·어디서·무엇을** 읽고 쓰는지 전부. bap 이 로그인 없이 보여야 하는 화면(예: 학생·학부모용 식단 보기)이 있는지 코드로 확인해 **의도된 공개**와 **새는 것**을 나눈다. 의도된 공개가 있으면 그 필드·문서만 공개로 남기는 안을 낸다.
- 카피본(`/copy`)·GitHub Pages 미러(`kwonjungu.github.io/AIroom/`)·`/posting` 에서의 동작.
- 지금 운영 규칙 원본: `docs/meeting-2026-11-25/rules-backup/2026-11-25_firestore_kwon_live.rules`(저장소 `firestore.rules` 와 다를 수 있다 — 차이를 적는다).

## 고칠 것
- codocs: 같은 Firebase 앱이면 SPA 의 출입증 로그인을 그대로 쓰고, 별도 앱이면 `/api/firebase-token` 으로 맞춤 토큰 로그인(persistence NONE). 토큰은 `window.CODOCS_HOST` 브리지 게터로 받는다. 로그인 실패 때 화면 안내.
- bap: 관리자·작성자 경로는 출입증(서버에 bap 전용 토큰 경로가 필요하면 `lib/storage-token.js` 를 넓히되 claim 은 최소로), 의도된 공개 읽기만 남긴다.
- 규칙: **`firestore.rules` 는 지금 다른 에이전트들이 고치는 중이라 직접 고치지 않는다.** 바꿀 codocs·bap 블록을 `docs/meeting-2026-11-25/firestore_lock_proposal.rules` 에 전체 블록 형태로 쓰고, 시험할 때는 현재 `firestore.rules` 의 해당 블록을 메모리에서 바꿔치기한 전체본으로 Firebase Rules 시험 API(게시 아님)를 돌린다. 예시 스크립트 `~\AppData\Local\Temp\claude\40f4efd3ccefd627\d4fabf86-90b2-4507-9d7e-f1f14b7b99e2\scratchpad\rules-api-test-example.js`. 비로그인·ba·cp·쭘 zz 토큰 각각 허용/거절 표.
- 두 SPA(`index.html`, `public/index.html`)는 다른 에이전트가 고치는 중이다. 바꿔야 하면 고치지 말고 정확한 바꿀 줄을 보고서 「요청」에. codocs.js·bap 페이지·server.js 의 bap 경로·`lib/storage-token.js` 는 네가 고친다(server.js 는 bap·firebase-token 부분만).

## 시험
- 로컬 서버 + Python Playwright **엣지**로 codocs 탭·bap 화면이 로그인 상태에서 열리는지(실제 Firestore 에 쓰지 말 것: 읽기만, 또는 가짜). 로그인 안 한 브라우저에서 Firestore REST 로 `codocs_*`·`bap_*` 읽기가 새 규칙에서 거절되는지는 Rules 시험 API 로.
- `node _check/codocs-test.mjs` 통과 유지.

## 보고
`reports/FIRESTORE_LOCK.md`: 분석 표, 바꾼 파일, 규칙 시험 표와 숫자, 게시 순서(코드 배포 → 확인 → 규칙 게시, 되돌리기), 요청. 커밋·푸시·게시 금지. 마지막 답변 10줄 이내.
