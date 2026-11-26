# 감사 R11 U1 서버·보안·서울 이전 (2026-11-26)

범위: R10 T1 지적의 고침(b2dcd1f). lib/recruitment/routes.js 정리 경로(바이트 비교, GET), tests/recruitment/api.test.js 새 시험, tests/zzoom/syntax-check.mjs 의 규칙 일치 확인과 firestore.zzoom.rules, vercel.json, lib/zzoom/*.js.
방법: 코드 읽기와 로컬 시험만 했다. Vercel 무료 한도 때문에 **운영(a-iroom.vercel.app)에는 요청을 한 번도 보내지 않았다.** 저장소 파일은 고치지 않았다. 바꿔 보는 시험(뮤턴트)은 저장소 파일을 <임시폴더>\r11 에 복사해서 그 복사본만 바꿨다.
- `git diff b2dcd1f HEAD` 로 보면 HEAD(2ed51ee)의 서버 쪽 변경은 없다. 바뀐 것은 tests/zzoom/syntax-check.mjs 와 prod_pen_check.py 뿐이다. `git diff cdc369f HEAD -- lib/zzoom server.js` 는 fb.js 1줄(R10 때 본 것)뿐이다. 그래서 lib/zzoom/*.js 는 R10 판단을 그대로 둔다.
- `npm run test:zzoom` 150건 통과, 문법 확인 24개 오류 0. `npm run test:recruitment` 119건 중 118건 통과·1건 건너뜀, 실패 0.

## R10 T1 지적 확인

| 지적 | 판정 | 근거 |
|---|---|---|
| T1-1 낮음: 채용 키 글자 수 비교로 500 | **코드는 고쳐짐, 시험은 덜**(아래 U1-1) | routes.js 123-124 가 Buffer 길이를 비교한다. <임시폴더>\r11\u1\probe.js 로 확인했다. 지금 코드는 `test-cron-secrét`(16글자·17바이트)와 `test-cron-secreé` 모두 401 이다. 옛 줄로 되돌린 복사본에서는 둘 다 500 이 나고 `Input buffers must have the same byte length` 가 기록됐다 |
| T1-2 낮음: 채용 정리 GET 시험 없음 | **고쳐짐** | api.test.js 134-136 에 GET 키 없음 401, 맞는 키 200 이 있다. 복사본에서 `router.all` 을 `router.post` 로 바꾸니 이 시험이 「GET 도 비밀키 없으면 401」에서 실패했다. 되돌림을 잡는다 |
| T1-3 낮음: 서울 규칙이 시험에서 빠짐 | **고쳐짐**(범위는 회의 블록만, 아래 U1-2) | syntax-check.mjs 25-26 이 두 파일의 `match /zzoom_meetings/{mid}` 블록을 뽑아 비교한다. 복사본에서 zzoom.rules 의 `'host'` 를 `'viewer'` 로 바꾸거나 하위 목록에 `'secrets'` 를 더하니 「쭘 블록이 다릅니다」로 실패했다. 게시 안내 2행도 따라 할 수 있는 절차(임시 firebase.json + `--only firestore`)로 바뀌었다. 실제로 게시해 보지는 않았다(확인 못 함) |
| T1-4 낮음: 문서에 DB kwon | **고쳐짐**(본 범위만) | b2dcd1f 에서 DESIGN.md·CONTRACTS.md 를 고쳤다. reports/S.md 같은 옛 보고서는 기록이라 따로 보지 않았다 |
| R9 S1-2 첫 예약 실행 성공 | **확인 못 함** | 고친 뒤 첫 cron(11-27 03:00 KST)이 아직 오지 않았다. 운영 기록은 이번에 보지 않았다 |

## 서울 이전 관련(문제 없음)
- DB 이름은 서버 fb.js 38(`databaseId: 'zzoom'` 고정), gcp.js 45 기본값, 화면 api.js 8 `DB_NAME` 모두 'zzoom' 이다. 환경 변수로 바꾸는 길은 없다.
- vercel.json 은 `regions: ["icn1"]`, cron 두 개(채용·쭘 정리, 둘 다 18:00 UTC), /용천이 외부 rewrite 네 개뿐이다. server.js 로 가는 rewrite 는 없다(CLAUDE.md 금지 사항을 지킴). 지역 설정은 백암이 전체 함수에 걸리지만 Redis 는 아시아에 있다. 백암이 기능 가운데 kwon Firestore 를 쓰는 화면(codocs, 급식)은 브라우저가 직접 붙으므로 함수 지역과 상관없다.
- 쭘 정리 경로(routes.js 313-318)는 그대로다. `['GET','POST']` 확인, `U.safeEqual`(util.js 40-43, 바이트 길이 먼저) 확인이 있다. 쭘이 꺼져 있어도 정리 경로만은 지나간다(117).
- 같은 요청 표, keys.js, purge.js, gcp.js 는 R9·R10 감사 뒤 바뀌지 않았다.

## 찾은 문제

### U1-1 낮음: T1-1 을 지키려고 넣은 시험 값이 실제로는 글자 수까지 달라서, 옛 버그를 되살려도 통과한다
- 위치: tests/recruitment/api.test.js 133 `call({ Authorization: 'Bearer test-cron-secré' })`
- 재현: 비밀키 `test-cron-secret` 은 16글자·16바이트다. 시험 값 `test-cron-secré` 는 15글자·16바이트다. 주석은 「글자 수는 같고 바이트 수가 다른 값」이라고 하지만 실제로는 바이트 수가 같고 글자 수가 다르다. 그래서 옛 코드(`given.length === secret.length`)에서도 글자 수가 달라 곧장 false 가 되고 401 이 난다. 복사본에서 123-124 를 옛 줄로 되돌리고 이 시험을 돌렸다. 결과는 pass 1, fail 0 이었다. T1-1 이 되살아나도 시험이 못 잡는다.
- 영향: 지금 코드는 맞다. 되돌림을 막는 장치만 비어 있다.
- 고칠 방향: 값을 `'Bearer test-cron-secrét'`(16글자·17바이트)처럼 글자 수가 같은 것으로 바꾼다. 옛 줄로 돌리면 500 이 나서 시험이 실패하는 것을 확인했다.

### U1-2 낮음: 규칙 일치 확인이 회의 블록 안쪽만 비교해서, 서울 규칙 파일의 블록 밖에 더한 줄은 잡지 못한다
- 위치: tests/zzoom/syntax-check.mjs 25-26(`block()` 이 `match /zzoom_meetings/{mid}` 의 중괄호 안만 자름)
- 재현 1: 복사본의 firestore.zzoom.rules 에서 회의 블록 바로 앞에 `match /{document=**} { allow read, write: if true; }` 를 넣었다. 결과는 「문법 확인 24개, 오류 0」이었다. 운영에 그대로 게시되면 zzoom DB 전체가 열린다. 에뮬레이터 규칙 시험(run-rules.js)은 firestore.rules 만 올리므로 이것도 못 잡는다.
- 재현 2: 두 파일 모두에서 `match /zzoom_meetings/{mid}` 줄 이름이 바뀌면(블록을 못 찾으면) 둘 다 같은 쓰레기 조각을 돌려줘 통과한다.
- 영향: 지금 파일은 블록 밖에 쭘 말고 아무것도 없다(파일 전체를 읽어 확인). 앞으로 고칠 때를 위한 빈틈이다.
- 고칠 방향: firestore.zzoom.rules 는 전체를 「머리 + 회의 블록 + 닫는 괄호」 틀과 비교하거나, 블록 밖에 `match ` 가 회의 블록 하나뿐인지 세고, 블록을 못 찾으면 실패로 둔다.

## 요약
치명 0, 높음 0, 보통 0, 낮음 2(U1-1, U1-2).
R10 T1 의 네 지적은 코드와 문서에서 모두 고쳐졌다. 채용 키 비교는 바이트 수로 바뀌어 500 이 더는 나지 않는다. GET 시험은 `router.post` 로 되돌리면 실패해서 되돌림을 잡는다. 서울 규칙 일치 확인은 회의 블록 안의 변경을 잡는다. 남은 것은 시험 쪽 빈틈 두 개다. T1-1 시험 값이 옛 버그를 재현하지 못하고, 규칙 확인은 블록 밖을 보지 않는다. 서울 이전으로 생긴 새 문제는 찾지 못했다. 운영 요청은 보내지 않았으므로 운영 상태(첫 cron 성공 등)는 확인 못 함이다.

결론: PASS(치명·높음 0)
