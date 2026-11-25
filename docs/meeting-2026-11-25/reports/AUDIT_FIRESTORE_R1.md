**판정: PASS** (치명 0·중요 0, 사소 6. bap 가입 구멍은 사용자 수용)

# 감사 라운드 1: 영역 ④ Firestore 잠금(codocs_*, bap_*)

독립 감사. 작업 보고(`reports/FIRESTORE_LOCK.md`)는 믿지 않고 코드를 직접 읽었고, Rules 시험 API와 가짜 Redis 서버로 다시 돌렸습니다. 코드는 고치지 않았고 커밋·게시·실제 Firestore 쓰기도 하지 않았습니다.

## 표 1: 볼 것 ①~⑤ 재검증

| 번호 | 판정 | 근거 |
|---|---|---|
| ① 비로그인 읽기 차단, 정상 경로 유지 | 해결 | 제안 블록을 현재 `firestore.rules` 의 「담당자 계정」(460자)부터 「쭘 회의」(6465자) 앞까지 메모리에서 바꿔 넣고 독립 시험 185건을 돌림 → **183/185**. 실패 2건은 codocs 접속표시 **삭제**(ba)뿐인데, 운영 원본도 똑같이 실패하는 기존 문제(새 지적 N1). 운영 원본에 같은 185건을 돌리면 74/185(나머지가 지금 새는 곳). 아래 표 참고 |
| ② bap 가입 구멍 | **재현됨, 사용자 수용** | `server.js:1756-1778` `/api/bap/auth/signup` 에는 인증이 없고 횟수 제한도 없음. role=boss 를 그대로 받음. 가짜 Redis로 재현: 가입하면 200이 오고, `/api/bap/firebase-token` 에서 200과 claim `{"bp":"bap","br":"b"}` 를 받음(서명 검증 true). 이 claim이면 제안 규칙에서 그 학교 일지를 모두 읽고 결재하고 지울 수 있음. 사용자가 「원래 설계」라고 정해 지적으로 세지 않음 |
| ② 학교 넘나들기 | 막힘 | bap2 세션에 `X-Bap-School: bap` 또는 `?school=bap` 를 붙이면 401(`server.js:1737-1738`). 규칙에서도 bap2 토큰으로 bap 일지·식단을 쓰면 거절 |
| ③ /copy | 회귀 없음 | `codocs.js:352` 의 `window.IS_COPY` 확인으로 Firestore 에 붙지 않음. `/api/copy/bap/firebase-token` 은 403(COPY_BLOCKED `server.js:233`). `/api/copy/firebase-token` 은 누구에게나 cp 를 주지만(재현: 200, `{cp:1}`), 규칙에서 cp 는 공개 식단 읽기 말고는 모두 거절 |
| ③ /posting | 회귀 없음 | `codocs.js:352` 의 pathname 확인. `/api/posting/firebase-config` 는 `{}` (`server.js:2463`) |
| ③ GitHub Pages 미러 | 코드상 동작, 실측은 확인 필요 | 두 SPA 의 fetch 래퍼(`index.html:2414-2416`, `public/index.html:2545-2547`)가 codocs 의 `/api/firebase-token` 도 vercel 로 보냄. CORS 는 X-Auth-Token 을 허용(`server.js:209`). bap 페이지는 원래 미러에서 안 됨(래퍼가 없고 CORS 에 X-Bap-* 가 없음, 기존 상태). 사소 N5 참고 |
| ④ 게시 순서·되돌리기 | 대체로 안전, 보완 2건 | 코드 배포 뒤에도 규칙이 열려 있으면 동작은 그대로임(503이면 비로그인으로 진행, `codocs.js:205`, bap `ensureAuth` 는 false 를 돌려줌). 되돌리기는 운영 원본을 다시 게시하면 됨(운영본 = 현재본에서 쭘 블록만 뺀 것, diff 로 확인). 보완: 사소 N3, N4 |
| ⑤ 시험 실행 | 아래 숫자 | `_check/codocs-test.mjs` 는 이 PC에 없음(`_check/` 는 mail-proxy-test.js 뿐, .gitignore 16행, 바탕화면·문서 폴더 검색과 git 이력에도 없음) → 돌리지 못함 |

### 규칙 허용/거절 표 (제안 병합본, Rules 시험 API, 게시 아님)

| 대상 | 비로그인 | ba | ba(until 지남) | cp | zz | bp 담당 | bp 결재 | bp2 담당 | br 이상값 |
|---|---|---|---|---|---|---|---|---|---|
| codocs 시트 목록, 행 읽기/쓰기, 명부 목록, 시트 삭제 | 거절 | 허용 | 허용 | 거절 | 거절 | 거절 | 거절 | 거절 | 거절 |
| codocs 접속표시 삭제 | 거절 | **거절**(N1) | **거절** | 거절 | 거절 | 거절 | 거절 | 거절 | 거절 |
| bap_users 읽기, bap_config 생성 | 거절 | 거절 | 거절 | 거절 | 거절 | 거절 | 거절 | 거절 | 거절 |
| 식단 읽기·목록(의도된 공개) | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 | 허용 |
| 식단(bap) 쓰기·지우기 | 거절 | 거절 | 거절 | 거절 | 거절 | 허용 | 허용 | 거절 | 거절 |
| 일지(bap) 목록·제출 | 거절 | 거절 | 거절 | 거절 | 거절 | 허용 | 허용 | 거절 | 거절 |
| 일지(bap2) 읽기 | 거절 | 거절 | 거절 | 거절 | 거절 | 거절 | 거절 | 허용 | 거절 |
| 일지 결재(submitted → approved) | 거절 | 거절 | 거절 | 거절 | 거절 | 거절 | 허용 | 거절 | 거절 |
| 일지 삭제 | 거절 | 거절 | 거절 | 거절 | 거절 | 거절 | 허용 | 거절 | 거절 |
| 기타 컬렉션 `foo/x` | 거절 | 거절 | 거절 | 거절 | 거절 | 거절 | 거절 | 거절 | 거절 |
| 쭘 회의 하위 읽기(회귀) | 거절 | 거절 | 거절 | 거절 | 허용 | 거절 | 거절 | 거절 | 거절 |

경계 시험 14건은 모두 기대대로 나옴:
- 거절: 식단 id 가 날짜 형식 아님, `lunch` 없음, `lunch` 2000자, 담당자 이름 바꿔 재제출, approved 일지 수정, approved 로 직접 생성, bap3 결재자의 bap 일지 삭제, 시트 columns 0개, 명부 이름 30자, 일지 하위경로, 쭘 회의 문서 목록
- 허용: 이름이 같은 재제출, 결재자의 approved 일지 삭제(기존과 같음), bp+ba 섞인 토큰의 codocs 읽기

화면 쪽 쓰기 모양도 규칙과 맞음:
- 식단은 `{lunch, parsedAt, uploadedBy}` 를 merge 로 저장(`bap/index.html:2518`)
- 제출은 `tx.set` 으로 status submitted, managerName 을 넣음(`:1597-1620`)
- 결재는 `tx.update` 로 status approved, bossName 을 넣음(`:2097-2109`)
- `runTransaction` 과 직접 `deleteDoc` 을 부르는 곳(`:1574`, `:1858`, `:2095`, `:2503`)은 모두 그 앞에서 `waitForBap()` 을 부름

## 표 2: 새 지적

| 번호 | 심각도 | 파일:줄 | 문제 | 실패 시나리오 | 고칠 방향 |
|---|---|---|---|---|---|
| N1 | 사소(기존) | `firestore_lock_proposal.rules` 접속표시 블록 / `firestore.rules:160-162`, `codocs.js:339` | `request.resource == null` 로 삭제를 허용하려 하지만, 삭제 요청에서는 `request.resource` 가 정의되지 않아 오류가 나고 거절됨. 시험 API 메시지: "Property resource is undefined on object". 운영 원본도 같음 | 창을 닫을 때 접속표시 삭제가 늘 실패함(`catch` 로 삼킴) → presence 문서가 쌓임 | `allow delete: if isBa();` 와 `allow create, update: if isBa() && request.resource.data.name ...` 로 나눔 |
| N2 | 사소 | 제안 `isBa()` | Storage 는 `until` 을 보지만 Firestore 제안은 보지 않음. 시험에서 until 이 지난 ba 도 허용됨 | SPA 에서 로그아웃하고 새로고침하지 않은 탭에는 codocs 출입증이 남아 계속 읽고 쓸 수 있음(탭을 닫으면 사라짐) | 보고서 5절대로 지금은 수용 가능. 만료 전에 출입증을 새로 받는 코드가 생기면 until 을 넣음. 로그아웃 때 `codocsClose()` 를 부르고 새로고침하도록 SPA 담당에 요청 |
| N3 | 사소 | `reports/FIRESTORE_LOCK.md` 4절 2단계 | 확인을 「Preview」에서 하라고 적혀 있지만, 규칙은 Preview 와 Production 이 함께 씀. Production 에 `FIREBASE_SERVICE_ACCOUNT` 가 빠져 있으면 Preview 확인을 통과해도 규칙을 게시하는 순간 운영 codocs·일지가 막힘 | Preview 에만 키를 넣은 상태 → 확인 통과 → 게시 → 운영 화면에 403 | 2단계를 **운영 주소(a-iroom.vercel.app)와 미러에서** `/api/firebase-token`·`/api/bap/firebase-token` 이 200 으로 오는지까지 확인하도록 고침 |
| N4 | 사소 | 게시 순서 | 코드 배포 전부터 열려 있던 codocs·bap 탭(실시간 화면이라 오래 열려 있음)은 옛 코드라 로그인하지 않은 상태임. 규칙을 게시하면 그 탭은 바로 권한 오류가 남 | 아침에 열어 둔 IP 대장 탭이 게시 순간 「규칙 게시 안내」 화면으로 바뀜 | 게시는 배포 뒤 하루 지나 근무 시간 밖에 하고, 「새로고침하세요」 공지를 함께 냄 |
| N5 | 사소(확인 필요) | `codocs.js:207-210`, 미러 | 미러(github.io)에서 codocs 가 `signInWithCustomToken`(identitytoolkit)을 부름. 브라우저 API 키에 HTTP 리퍼러 제한이 있으면 미러에서만 실패할 수 있음. 콘솔 설정을 볼 수 없어 확인하지 못함 | 미러 codocs 에 「출입 확인에 실패」 표시 | 3단계 게시 전에 미러에서 codocs 탭을 한 번 열어 봄(창고 잠금이 미러에서 되면 같은 결과) |
| N6 | 사소 | `server.js:1606`, `:1809` `rateLimit(30/분, path\|ip)` | 학교 PC 는 공인 IP 하나를 나눠 씀(NAT). 창고 출입증과 codocs 출입증이 같은 `/api/firebase-token` 통에서 분당 30회를 함께 씀 | 출근 시간에 교직원 30명 넘게 동시에 접속 → 429 → codocs 「출입 확인에 실패」 | 이 경로만 한도를 높이거나(예: 120) 세션 토큰 기준으로 셈 |

참고(지적 아님):
- 식단 `uploadedBy`(결재자 이름)는 공개 읽기에 남음.
- 비로그인 식단 업로드 화면은 이제 저장할 때 로그인이 필요함(`bap/index.html:2337`, `:2498`). 계정 없는 영양사가 올리던 흐름이었다면 쓰는 방식이 바뀜.
- `/api/bap/parse-menu`·`revise-menu` 는 여전히 로그인 없이 Groq 를 부름(Firestore 와 무관).

## 실행한 명령과 결과

| 명령 | 결과 |
|---|---|
| `node fsaudit/rt.js <firebase-tools> fsaudit/merged.rules` (독립 185건, 시험 API) | 183/185 (실패 2 = N1) |
| 같은 시험을 운영 원본 `rules-backup/2026-11-25_firestore_kwon_live.rules` 에 | 74/185 |
| `node fsaudit/mini.js` (삭제 때 request.resource 확인) | FAILURE "Property resource is undefined on object" |
| `node fsaudit/signup-repro.js <repo>` (server.js 실제 라우트, 가짜 Redis, VERCEL=1 이라 파일 쓰기 없음, 가짜 RSA 키) | 가입 200 → 출입증 200 `{bp,br:b}`. 학교 바꿔치기 401. 비로그인 401·401. 카피본 bap 403, 카피본 토큰 `{cp:1}` |
| `npm test` | tests 313, pass 313, fail 0 |
| `node tests/zzoom/run-rules.js` (쭘 규칙 회귀, 에뮬레이터) | storage 11/11, firestore 63/63 |
| `node --check` bap 인라인 스크립트 2개, `public/lib/codocs.js` | 통과 |
| `node _check/codocs-test.mjs` | 파일 없음. 실행하지 못함 |

임시 파일은 모두 scratchpad `fsaudit/` 에 있습니다. `tests/zzoom/run-rules.js` 를 돌릴 때 에뮬레이터가 저장소 루트의 `firestore-debug.log`(추적하지 않는 파일)를 갱신했습니다.
