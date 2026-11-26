# 감사 R10 T1 서버·보안·서울 이전 (2026-11-26)

범위: R9 뒤 서버 쪽 바뀐 것(1fb66fb: lib/zzoom/fb.js DB 이름 고정, lib/recruitment/routes.js 정리 경로 GET 허용)과 lib/zzoom/*.js(같은 요청 표, keys.js, purge.js, gcp.js), firestore.zzoom.rules, vercel.json, audit-r9/S1_SERVER.md 지적.
방법: 코드 읽기. `git diff cdc369f HEAD -- lib server.js vercel.json firestore*.rules storage.rules` 로 보니 R9 뒤 서버 코드는 위 두 파일 3줄만 바뀌었다. 재현 스크립트는 <임시폴더>\r10\t1-recruit-get.js(채용 라우터를 따로 띄워 GET·HEAD·잘못된 키를 보냄)에 있다. 운영에는 인증 없는 읽기 요청만 보냈다. 저장소 파일은 고치지 않았다.
- `npm run test:zzoom` 150건 통과, `npm run test:recruitment` 119건 중 118건 통과·1건 건너뜀, 실패 0.
- 운영 응답(모두 `X-Vercel-Id: icn1::icn1::…`):
  - `GET /api/zzoom/health` → 200 `{"ok":true,"enabled":true,"firebase":true,"redis":true}`
  - `GET /api/recruitments/maintenance/purge`(키 없음) → **401** 「예약 작업 인증에 실패했습니다」(R9 때는 404였다)
  - `GET /api/zzoom/maintenance/purge`(키 없음) → 401 bad_cron_secret
- 운영 Firestore REST 에 인증 없이 목록 읽기를 보냈다. `databases/zzoom` 의 zzoom_meetings, 회의 하위 chat, 쭘과 상관없는 codocs_sheets 가 모두 403 PERMISSION_DENIED 였다. 그러니 zzoom DB 에 규칙이 게시돼 있고 기본으로 거절된다(시험 모드로 열려 있지 않다).

## R9 S1 지적 확인

| 지적 | 판정 | 근거 |
|---|---|---|
| S1-1 높음: 옛 kwon 회의가 안 지워짐 | **고쳐짐**(운영 작업, 남은 문서 수는 확인 못 함) | FIXES.md 에 따르면 이전 직후 kwon 의 쭘 회의 6개와 그림을 손으로 지웠다. fb.js 38 주석도 「옛 kwon 회의는 이전 때 모두 지움」으로 바로잡았다. kwon 을 읽을 권한이 없어서 0개인지 직접 세지는 못했다(인증 없는 목록 읽기는 403). Redis 대기열 zz:purge 에 옛 kwon mid 가 남아 있어도 purgeMeeting 은 zzoom 에서 빈 것을 지우고 대기열에서 뺄 뿐이라 해가 없다 |
| S1-2 보통: 채용 정리 cron 이 GET 이라 404 | **고쳐짐** | lib/recruitment/routes.js 119 가 `router.all`. 앞쪽의 `router.get('/:id')`(64)는 경로 조각 하나만 받으므로 `/maintenance/purge`(조각 둘)를 가로채지 않는다. 로컬 재현에서 키 없음 401, 맞는 키 GET 200·HEAD 200, 틀린 키 401이었다. 운영도 GET 이 401까지 들어간다. 다만 고친 뒤 첫 예약 실행(03:00 KST, 11-27)이 아직 오지 않아 실제 cron 성공은 **확인 못 함** |
| S1-3 낮음: DB 이름 서버·화면 따로, 규칙 배포 안내 | **덜 고쳐짐**(낮음) | DB 이름은 고쳐졌다. fb.js 38 이 `'zzoom'` 고정이고, gcp.js 45 기본값과 api.js 8 `DB_NAME` 도 같다. 저장소에 ZZOOM_FIRESTORE_DB 를 읽는 코드가 이제 없다. 규칙 쪽 절반은 그대로다. 아래 T1-3 |
| S1-4·S1-5 | 다시 지적 안 함 | FIXES.md 「고치지 않은 것」 |

## 이번에 바뀐 것의 안전성 — 정리 경로를 GET 으로 받기

- **비밀키 비교**: 쭘(routes.js 313-319)은 `U.safeEqual` 로 비교한다. 이 함수는 바이트 길이를 먼저 맞춰 보고 timingSafeEqual 을 부르므로(util.js 40-43) 어떤 값이 와도 401로 끝난다. 채용(routes.js 122-124)은 길이를 JS 글자 수로 비교한다. 그래서 아래 T1-1 같은 틈이 있지만, 인증이 뚫리는 것은 아니다.
- **크롤러·프리패치·링크 미리보기가 GET 을 불러도**: 두 경로 모두 비밀키를 확인하기 전에는 아무것도 읽거나 쓰지 않는다. 채용은 확인 뒤에야 googleAuth.status() 를 부르고, 쭘은 확인 뒤에야 runPurge 를 부른다. 키 없는 GET 은 401뿐이다. 쭘·채용 모두 `Cache-Control: no-store` 라 CDN 이 응답을 기억하지 않는다. Authorization 머리는 브라우저 프리패치나 크롤러가 붙이지 않는다. 맞는 키로 다시 불려도 두 정리 작업 모두 기한 지난 것만 지우므로, 되풀이해도 안전하다.
- **HEAD**: Express 는 HEAD 를 GET 처리기로 넘긴다. 쭘은 `['GET','POST']` 확인으로 HEAD 를 405로 막는다. 채용은 맞는 키가 있는 HEAD 도 정리를 돈다(로컬 200). 키가 있어야 하므로 문제는 아니다.
- **다른 진입 경로**: 시연본(/api/copy/recruitments/maintenance)은 server.js 238 COPY_BLOCKED 로 막혀 있다. 학교 공간(/api/hub/s/<id>/recruitments/maintenance/purge)도 같은 라우터라 경로는 있다. 그래도 같은 CRON_SECRET 이 있어야 하고, vercel.json cron 은 백암이 경로만 부른다.

## 서울 이전 영향(문제 없음)
- DB 이름은 서버(fb.js 38, gcp.js 45)와 화면(api.js 8·147) 모두 'zzoom' 이다.
- firestore.zzoom.rules 의 쭘 블록은 firestore.rules 의 쭘 블록과 글자 그대로 같다(블록을 뽑아 diff, 24줄 동일). 화면이 읽는 경로(회의 문서 get, 하위 7종 read, people 은 주관자만)를 덮는다. 나머지는 기본으로 거절되고, 운영 403 으로도 확인했다.
- vercel.json 은 regions `icn1` 과 cron 두 개, 외부 rewrite(/용천이)만 있다. server.js 로 가는 rewrite 는 없다(CLAUDE.md 금지 사항 지킴). 두 cron 이 같은 시각(18:00 UTC)이지만 서로 다른 저장소(Drive, Firestore)를 건드려 겹치지 않는다. 함수 제한 시간은 프로젝트 기본 300초라(DEPLOY_PREP.md) 쭘 정리 예산 50초가 안에 든다.
- 같은 요청 표(routes.js 120-158), keys.js, purge.js 는 R9 감사 뒤 바뀌지 않았다. R9 판단을 그대로 유지한다.
- 색인: 모든 쿼리가 필드 하나짜리라 새 DB 의 자동 색인으로 된다(R9 와 같음).

## 찾은 문제

### T1-1 낮음: 채용 정리 경로에 글자 수는 같고 바이트 수가 다른 키를 보내면 401 대신 500이 나고 서버 오류 기록이 남는다
- 위치: lib/recruitment/routes.js 123 `given.length === secret.length && timingSafeEqual(Buffer.from(given), Buffer.from(secret))`
- 재현(t1-recruit-get.js): CRON_SECRET='abc123' 으로 띄우고 `Authorization: Bearer abc12é` 를 보냈다. 결과는 **500** 「채용 작업 처리에 실패했습니다」였고, 서버 기록에 `[recruitment] Input buffers must have the same byte length` 가 남았다. 글자 수(6)는 같지만 UTF-8 바이트 수가 달라 timingSafeEqual 이 예외를 던진다. 기존 시험의 「길이가 다른 값」(api.test.js 131)은 ASCII 라 이 경우를 잡지 못한다.
- 영향: 인증은 뚫리지 않는다. 다만 누구나 그 경로에 500을 일으키고 오류 기록을 쌓을 수 있다. 크롤러는 Authorization 을 붙이지 않으므로 우연히 생기지는 않는다.
- 고칠 방향: 쭘 util.js `safeEqual` 처럼 Buffer 길이를 비교한다(또는 두 값을 sha256 한 뒤 비교).

### T1-2 낮음: 채용 정리 경로 시험이 POST 만 본다. 고친 것(GET)을 지키는 시험이 없다
- 위치: tests/recruitment/api.test.js 123 `fetch(url, { method: 'POST', … })`
- 내용: R9 S1-2 는 cron 이 GET 으로 부른다는 문제였다. 그런데 시험은 그대로 POST 만 보낸다. 누가 `router.all` 을 다시 `router.post` 로 되돌려도 118건이 모두 통과한다. 쭘 쪽 시험(api.test.js 620·677-709)은 GET 을 쓴다.
- 고칠 방향: 같은 시험에 GET(키 없음 401, 맞는 키 200)을 한 줄씩 더한다.

### T1-3 낮음(R9 S1-3 남은 절반): 규칙 시험은 kwon 합본만 올리고, zzoom 규칙 파일의 게시 안내는 따라 할 수 없다
- 위치: tests/zzoom/run-rules.js 17(`firestore.rules`, `storage.rules` 만 복사), tests/zzoom/rules.test.js 35(`firestore.rules` 를 읽음), firestore.zzoom.rules 2행 「firebase deploy --only firestore:zzoom (firebase.json 의 database 'zzoom')」. 저장소 뿌리에 firebase.json 이 없다.
- 내용: 운영 zzoom DB 에 실제로 걸리는 것은 firestore.zzoom.rules 인데, 에뮬레이터 시험은 이 파일을 올리지 않는다. 지금은 두 파일의 쭘 블록이 같아서 실제 차이는 없다. 하지만 한쪽만 고치면 시험이 통과해도 운영 규칙은 다를 수 있다. 게시 안내도 그대로 따라 하면 명령이 실패한다.
- 고칠 방향: rules.test.js 가 firestore.zzoom.rules 로도 쭘 시험을 한 번 더 돌리게 하고(또는 두 블록이 같은지 시험), 2행 안내를 「콘솔 → Firestore → DB zzoom → 규칙에 붙여 게시」로 바꾼다.

### T1-4 낮음: 설계 문서가 아직 쭘 DB 를 'kwon' 이라고 적는다
- 위치: docs/meeting-2026-11-25/DESIGN.md 110(「B-1. Firestore (DB `kwon` …)」)·153, CONTRACTS.md 13(「Firebase(앱 'zzoom', DB kwon)」)·156, reports/S.md 10(「DB 는 `kwon`(`ZZOOM_FIRESTORE_DB` 로 바꿀 수 있음)」)
- 상황: 다음 사람이 이 문서를 보고 콘솔에서 kwon 규칙을 고치거나, 없어진 환경 변수를 Vercel 에 넣을 수 있다. 환경 변수는 이제 코드가 읽지 않으므로 넣어도 해는 없다. 규칙을 kwon 에 게시하면 zzoom 에는 반영되지 않는다.
- 고칠 방향: 세 문서의 DB 이름을 'zzoom'(서울)으로 바꾸고, kwon 은 「2026-11-26 이전, 회의 모두 지움」이라고 적는다.

## 요약
치명 0, 높음 0, 보통 0, 낮음 4(T1-1~T1-4).
R9 S1 의 높음(S1-1)과 보통(S1-2)은 고쳐졌다. S1-1 은 운영 작업이라 남은 문서 0을 직접 세지는 못했고, S1-2 는 첫 예약 실행이 아직 오지 않았다. S1-3 은 DB 이름 쪽만 고쳐졌다. 정리 경로가 GET 을 받게 된 것은 안전하다. 두 경로 모두 비밀키 확인 전에는 아무것도 하지 않고 응답을 캐시하지 않으므로, 크롤러나 프리패치가 불러도 401로 끝난다. 남은 것은 채용 쪽 키 비교의 500(낮음)과 시험·문서의 빈틈이다.

결론: PASS(치명·높음 0)
