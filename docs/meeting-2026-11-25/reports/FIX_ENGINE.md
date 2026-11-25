# 수정 보고: 엔진 감사(AUDIT_ENGINE_REPORT) 지적 01~16과 사소 항목, 비상 스위치, Groq, 부하 한도, 레드팀

상태: **완료** (2026-11-25 23시경, R1·R2 절은 2026-11-26 추가)
기준 커밋: c347538 (feat/meeting)

이 작업에서 커밋하지 않았다. 다만 작업 중에 다른 쪽에서 f5eb70b 「feat(zzoom): 회의진행 앱 프로토타입 화면·서버 수정, 백암이 탭 추가」(22:16)가 만들어졌다. 서버와 두 SPA, 규칙, 시험의 수정은 대부분 그 커밋 안에 들어갔다. 그 뒤에 고친 것은 아직 작업 트리에만 있다.
- 커밋되지 않은 파일: 변환기 7개 파일, vendor.test.mjs, public/zzoom/vendor/ 자체 호스팅 묶음(manifest.json 포함 297파일, 약 11MB), DESIGN.md K6
- 하지 않은 일: 푸시, 배포, Firebase나 Vercel 조작, 규칙 게시, 실서비스 쓰기, vercel.json 수정

## 1. 시험 숫자

| 묶음 | 수정 전(c347538 코드) | 수정 뒤 |
|---|---|---|
| 지적 시험 전체(api, units, convert, vendor, spa-storage) | 62개 중 19개 통과, 43개 실패 | `npm.cmd run test:zzoom` **64/64 통과**(D5 추가 1건 포함) |
| `npm.cmd test`(vibe 단위와 계약) | 통과 | 313/313과 11/11 통과 |
| redteam.test.js(고치지 않음) | todo 6건 뚫림 | pass 9, fail 0, todo 6건 **모두 ok**, skip 2(규칙 에뮬레이터) |
| `LOAD_STRICT=1 node --test tests/zzoom/load.test.js`(고치지 않음) | 30건 거짓 429로 실패 | **2/2 통과** |
| 다른 팀 쭘 시험(d1, d2, d4, draw, host), hub | 통과 | 3, 11, 7, 18, 11, 9 모두 통과 |
| Storage 규칙 시험(`npm.cmd run test:zzoom:rules`) | 실행 안 함 | R1에서 실행: 62 pass, todo 1 |

수정 전 숫자를 낸 실행 기록은 작업 중 scratchpad의 old-run.txt에 있다(저장소 밖).

## 2. 지적별 수정

| 지적 | 고친 곳 | 어떻게 | 시험 |
|---|---|---|---|
| 01 맞춤 토큰 수명 | lib/zzoom/routes.js `claimsFor`, issue | until을 「회의 만료」와 「지금+1시간」 중 이른 쪽으로 했다. 응답에 tokenUntil을 주고, 새로 고침하면 연장된다. 회의를 지운 뒤 늦게 올라온 업로드 파일은 purge가 치운다. | api 「지적01: 맞춤 토큰 until 은 1시간 안」, 「회의를 지운 뒤 늦게 올라온 업로드」 |
| 02 commit 검증 | routes.js commit, `webpSize`, gcp.js storage.head(Range GET) | 실제 WebP 머리 바이트를 읽어 쪽 크기를 확인한다. 원본은 MIME 목록으로 확인한다. | api 「지적02」 |
| 03 업로드 장부 | routes.js permit과 commit, purge.js | 장부를 먼저 쓰고, 정리는 같은 요청이 다시 와도 결과가 같다. 허가는 23시간 뒤 upload_expired가 된다. permit에 cid와 사람 키를 넣어 not_your_upload를 막는다. purge는 안건 문서가 있으면 파일을 지우지 않고 장부만 정리한다. | api 「지적03」 2건 |
| 04 지운 회의에 늦은 쓰기 | routes.js `guarded(mid, action, fn)` | 받아쓰기, 채팅, 손들기, heartbeat, 판서, 투표가 쓰기 전에 트랜잭션 안에서 회의가 살아 있는지와 그 동작이 허용되는지를 확인한다. 지우는 중에는 status를 deleting으로 둔다. | api 「지적04」 |
| 05 판서 장부 | keys.js `scReserve`, `scRelease`, `scDrop` Lua | 쪽마다 epoch 필드를 두었다. 옛 epoch에서 돌려주는 값은 무시하고, 0 밑으로 내려가지 않게 했다. 지우기는 트랜잭션으로 처리하고, 사람당 쪽 상한은 300이다. | api 「지적05」 2건, units Lua -3 |
| 06 투표 경쟁 | routes.js polls, keys.js vote Lua | 생성과 닫기를 트랜잭션으로 했다. 끝내기는 같은 요청이 다시 와도 결과가 같고 상태도 바로잡는다. 표는 사람 키로 장부에 적어 두 번째 표를 already_voted로 막는다. | api 「지적06」 |
| 07 시간 예산 | gcp.js `build(deadline)`과 `scoped`, purge.js, whisper.js | 모든 네트워크 호출이 남은 시간 안에서 끊긴다(직접 만든 AbortController 타이머). cron은 등록만 하고 기한을 확인한다. Whisper는 키를 돌아도 전체 50초 안에서 끝낸다. | api 「지적07」 3건 |
| 08 WebP 대신 PNG | convert/core.js `emitPage`, `checkWebpSupport`, index.js | PNG로 대신 저장하지 않고 WEBP_UNSUPPORTED로 멈춘다. 변환 시작 전에 미리 확인한다. | convert 「지적08」 |
| 09 형식표 불일치 | convert/contract.js와 lib/zzoom/contract.js, index.js `sourceOf`, storage.rules ORIGINAL_TYPES | 두 형식표를 같게 했다. 결과에 서버용 source {kind, ext, mime}을 따로 담는다(hwpx는 kind hwpx). 크기는 50MiB **미만**만 받아서, 정확히 50MiB는 변환기와 서버, 규칙 모두 거절한다. | convert 「지적09」 5건 |
| 10 취소와 시한, 캔버스 누수 | core.js `Ctx`(signal, race, onAbort, done), pdf/hwp/pptx/image.js | 사용자 취소와 6분 시한을 하나의 신호로 묶었다. 내려받기, 라이브러리 적재, 열기, 그리기를 ctx.race로 감싸서 끝나지 않는 작업을 기다리지 않는다. 쪽 캔버스와 썸네일 캔버스는 실패해도 비운다. 늦게 열린 PPTX는 열리는 즉시 해제한다. | convert 「지적10」 3건 |
| 11 CDN 코드 해시 | convert/vendor.js, public/zzoom/vendor/ | silurus 조각 91개와 pdf.js의 cmaps, standard_fonts, wasm, iccs를 같은 출처 고정본으로 옮겼다. npm 원본과 해시를 대조했다. manifest.json에 sha256을 적었고, 목록 밖의 파일이 있으면 시험이 실패한다. CDN에는 해시로 묶이는 단일 파일만 남겼다(rhwp, pdf.js 본체와 worker, 글꼴). | vendor 「지적11」 3건 |
| 12 백암이 출입증 수명 | lib/storage-token.js `claimsFor`, storage.rules ba와 demo | ba와 cp에 until(세션 만료와 1시간 중 이른 쪽)을 붙이고, 규칙이 그 값을 확인한다. | api 「지적12」, rules 시험(미실행) |
| 13 SPA 업로드 실패 무시 | index.html, public/index.html `ensureStorageAuth`, ttSubmitUpload | 출입증을 못 받으면 업로드하지 않고 오류를 낸다. 서버가 503 unconfigured이면 예전 방식으로 올린다. 이수증 보관이 실패하면 연수 기록을 확정하지 않는다. 로그아웃할 때 Firebase에서도 나간다. | spa-storage 「지적13」 |
| 14 REST 어댑터 | gcp.js, routes.js 오류 처리 | ABORTED가 나면 트랜잭션 전체를 다시 한다. 429와 503, UNAVAILABLE은 503 store_busy로, 저장소 오류는 502 store_failed로, Redis 장애는 503 redis_down으로 분류한다. 업무 오류는 다시 하지 않는다. | api와 units 「지적14」 4건 |
| 15 가짜 Redis | tests/zzoom/fakes | 태그 대신 Lua 본문을 fengari로 실제로 실행한다. 가짜 storage.head는 바이트를 정하지 않으면 undefined를 돌려준다. | units 「지적15」 |
| 16 카피본 경로 | 두 SPA `storagePathFor`와 호출부 7곳 | 카피본은 실제 저장 경로(copy/…)를 호출자가 받는다. | spa-storage 「지적16」 |
| 사소 | server.js `jsonExceptZzoom`, routes.js 시도 한도 | 10MB JSON 파서가 /api/zzoom을 건너뛴다. 시도 한도에 걸린 요청은 회의 전체 잠금 수에 넣지 않는다. 받아쓰기 쪽 크기 계산은 반올림하고 긴 변 한도로 자른다(아래 실측에서 찾음). | api 「사소」 2건 |

두 SPA는 같은 내용이다. f5eb70b 기준으로 두 파일 모두 storagePathFor 9곳, storageClaimsOk 같은 수로 확인했다.

## 2-1. 추가 요청(D5): 끝낸 뒤 마지막 녹음 조각

- 문제: 회의를 끝내면 서버가 녹음 조각을 거절해 마지막 1분이 사라졌다.
- 수정(lib/zzoom/routes.js `allowTranscribe`, `LIMIT.transcribeGraceMs` = 2분): 끝난 지 2분 안이고 조각 시작 시각 `at`이 `endedAt`보다 앞이면 받는다. `at`이 없거나, 끝낸 뒤에 시작한 조각이거나, 2분이 지나면 409 state_ended다. Groq 응답을 기다린 뒤 쓰는 트랜잭션도 같은 규칙으로 다시 확인하며, 시각은 요청을 받은 때 기준이다. 지운 회의는 여전히 410이다.
- 시험: api 「D5: 회의를 끝낸 뒤 2분 동안은 끝내기 전에 시작한 녹음 조각을 받는다」. 수정 전에는 409로 실패했고, 수정 뒤 통과한다. redteam(9 pass, todo 6 ok)과 LOAD_STRICT(2/2)도 다시 통과했다.
- 운영 참고: f5eb70b로 프로토타입이 이미 운영에 올라갔다. 이 수정은 다음 배포에 들어간다. 화면(record.js)이 끝낸 뒤에도 대기열의 조각을 계속 보내는지는 UI 쪽에서 확인해야 한다.

## 3. 레드팀 todo 6건(redteam.test.js는 고치지 않음)

1. **host 토큰 until이 회의 만료까지 남아 회수할 수 없음.** until을 1시간 이하로 줄였다. 새로 고침할 때마다 host 회수 여부를 다시 확인한다. 결과는 ok.
2. **잠금 DoS(누구나 회의 주관 입장을 잠금).** 15분에 50회를 넘으면 잠시 잠그되, 그 IP와 그 사람이 처음 시도하는 「깨끗한 요청」은 잠금 중에도 받는다. 평생 200회를 넘으면 관리자가 풀 때까지 잠근다. 사람당 10분 5회, IP당 1시간 20회다. 결과는 ok.
3. **남의 uploadId로 commit.** permit에 적힌 cid나 사람 키가 맞지 않으면 not_your_upload를 낸다. 결과는 ok.
4. **재입장 중복 투표.** 표를 사람 키(X-Device-Id, 없으면 세션 토큰과 이름의 해시)로 장부에 적어 -2, 곧 already_voted를 낸다. 결과는 ok.
5. **쪽 상한 독점.** 한 사람이 한 쪽에 남길 수 있는 획을 300으로 제한했다(Lua -3). 결과는 ok.
6. **채팅 도배(이름과 IP를 바꾼 봇).** 버킷을 셋으로 나눴다. pt는 1초 1회, 사람 키는 'pp', 입장 60초 안의 세션은 'ns' 1회다. /join은 IP 분당 120회에 기기 분당 10회를 더했다. 결과는 ok.

## 4. 부하 한도

`RATE = { joinIpPerMin:120, joinDevicePerMin:10, general:8, live:5, heartbeatPerMin:6, strokePerSec:3 }`
- live는 초당 5회, heartbeat는 분당 6회로 각자 버킷을 쓴다. 일반 버킷은 초당 8회다.
- 판서 묶음 하나(획 여러 개)는 요청 1회로 센다. api 시험에서 같은 순간 4요청이 [201, 201, 201, 429]로 나와 확인했다.
- 판서 속도는 처음에 더 낮았다. 묶지 않은 획을 0.4초 간격으로 보내는 부하 시험에서 거짓 429가 30건 나와 초당 3회로 올렸다.

## 5. 비상 스위치(ZZOOM_ENABLED)

- `ZZOOM_ENABLED=0`이면 /api/zzoom이 503 `{error:'zzoom_disabled', message:'쭘을 잠시 쉬고 있습니다.'}`를 돌려준다.
- health와 /maintenance/purge(cron)는 그대로 동작한다.
- /zzoom 페이지는 server.js에서 503과 함께 간단한 안내 HTML(`DISABLED_HTML`)을 낸다.
- 값이 없거나 0이 아니면 켜진 상태다.

## 6. Groq(DESIGN.md K6에 적음)

- 무료 한도는 키 하나에 분당 20회, 하루 2,000회, 시간당 소리 7,200초, 하루 28,800초다.
- 1분 조각 기준으로 1시간 회의는 60회와 3,600초를 쓴다. 따라서 키 하나로 동시 회의 2개까지 받는다.
- 429가 나면 다음 키로 넘긴다. 모든 키가 429면 `groq_busy`를 내고, `retryAfter`(가장 짧은 값)와 Retry-After 머리를 붙인다.
- 한 요청은 전체 50초, 키마다 최대 45초 안에서 끝낸다(lib/zzoom/whisper.js).

## 7. 실제 브라우저 변환 확인(Playwright Chromium, 저장소 밖 임시 파일)

로컬 정적 서버 http://127.0.0.1:3197로 public/을 서빙하고, /zzoom/convert/index.js의 convert를 불렀다. 시험 파일은 직접 만든 가짜 내용이며 학교 문서가 아니다.

| 파일 | 결과 |
|---|---|
| 벡터 PDF 1쪽 | 1545×2000 WebP 1쪽, 0.4초 |
| 스캔 PDF 2쪽 | 1414×2000 WebP 2쪽, 0.5초 |
| PNG 3000×1500 | 2000×1000 WebP, 0.2초 |
| PPTX 2장 | 2000×1500 WebP 2쪽, 1.3초. 같은 출처 vendor 요청 77건 |

- 모든 쪽이 RIFF…WEBPVP8X 머리를 가진 진짜 WebP였다. source {kind, ext, mime}도 바르게 나왔다.
- 외부 요청은 cdn.jsdelivr.net(해시로 묶인 pdf.js 본체와 worker, 글꼴)뿐이었다.
- 처음 실행에서 스캔 PDF가 2001px로 나왔다. 서버 한도는 2000px이라 commit에서 거절될 값이었다. 원인은 Math.ceil 올림이었고, 반올림한 뒤 긴 변 한도로 자르게 고쳐 2000px을 확인했다.
- HWP는 이번에 실측하지 않았다. 앞선 변환 보고(CONVERT_PERF.md)를 따른다.

## 8. 설계 결정(가장 안전한 쪽을 골랐고 이유를 적음)

- **평생 200회 잠금.** 운영자가 풀어야 하는 불편이 있다. 대신 무차별 대입의 총량을 확실히 묶는다. 일시 잠금 중에도 깨끗한 요청을 받는 예외가 정상 주관자의 입장을 지킨다.
- **새 입장 채팅 버킷(입장 60초 안 1초 1회).** 이름이나 IP를 바꿔 다시 들어와도 도배 속도가 늘지 않는다. 정상 사용자는 첫 1분만 조금 느리다.
- **판서 초당 3회.** 묶음 전송이 기본이라 충분하다. 묶지 않은 옛 클라이언트도 부하 시험에서 거짓 429가 나지 않는다.
- **가짜 head undefined.** 시험이 바이트를 정한 경우에만 WebP 크기를 확인한다. 실제 어댑터는 항상 바이트를 돌려주므로 운영에서는 늘 확인한다.
- **vendor 자체 호스팅 11MB.** 상대 경로로 서로를 부르는 묶음은 CDN 해시로 묶을 수 없어 같은 출처에 두었다. /copy 격리와 vercel.json에는 손대지 않았다.

## 9. 한계와 하지 않은 것

- Storage 규칙 에뮬레이터 시험은 처음에 돌리지 못했다. R1에서 돌려 62 pass와 todo 1을 얻었다(아래 R1 절).
- HWP 쪽 그리기는 rhwp의 동기 WASM 호출이라 한 쪽 도중에는 끊을 수 없다. 쪽 사이에서만 시한과 취소를 본다.
- Vercel 함수의 maxDuration은 정하지 않았다. vercel.json을 건드리지 말라는 지시 때문이다. 코드 쪽 예산(cron, Whisper 50초)으로 막는다.
- 쪽 파일마다 게시 메타데이터를 붙이는 안은 하지 않았다.

## 10. 사용자가 할 일

1. 서버를 먼저 배포한 뒤 storage.rules를 게시한다. ba와 cp에 until을 주는 서버가 먼저 나가야 백암이 업로드가 막히지 않는다. 게시 전에 `npm.cmd run test:zzoom:rules`를 돌릴 환경을 갖춘다.
2. Firestore 잠금 안(firestore_lock_proposal.rules)에 ba와 until 확인을 넣는다면, codocs `signInCodocs`가 until 전에 다시 서명하도록 함께 고쳐야 한다. 지금 codocs는 ba를 보지 않는다.
3. Vercel 환경 변수 `ZZOOM_ENABLED`는 평소에 비워 두거나 1로 둔다. 멈출 때만 0으로 바꾼다.
4. public/zzoom/api.js `uploadAgenda`는 uploadBytes 전에 `signInWithCustomToken(permit.token)`을 해야 한다(UI 팀). 토큰을 50분마다 새로 고치면 충분하다.
5. public/zzoom/vendor/ 묶음(297파일)과 변환기 수정은 아직 커밋되지 않았다. 검토한 뒤 커밋한다.

## R1. 서버 감사 1라운드(AUDIT_SERVER_R1) 중 엔진 몫 (2026-11-26)

맡은 범위는 N6과 부분 해결 07, 10, 15, 그리고 N5다. 사소 항목 가운데서는 N3, N4, N7, N8, N11만 맡았다. 다른 에이전트가 고치는 영역(join, people, chat, hands, polls, export, 안건, 업로드, 발표자)은 건드리지 않았고, N2는 조정자가 고쳤다. 지적마다 시험을 먼저 써서 수정 전 코드에서 실패하는 것을 확인했고, 고친 뒤 통과시켰다. 커밋은 하지 않았다.

| 지적 | 고친 곳 | 어떻게 | 시험 |
|---|---|---|---|
| N6 HWP 쪽 2000px 초과 | convert/core.js `fitCanvas`, hwp.js | rhwp가 그린 뒤 긴 변이 2000px을 넘으면, PDF처럼 반올림하고 자른 새 캔버스로 줄인다. 원래 캔버스는 비운다. | convert 「R1-N6」 |
| 07 부분: N8 토큰 발급 | lib/zzoom/gcp.js `accessToken(deadline)` | 토큰 발급도 남은 시간 안에서 끊는다(최대 15초). head도 같은 deadline을 쓴다. | units 「R1-N8」 |
| 10 부분: N11 적재 공유 | core.js `sharedLoader`, pdf.js, hwp.js, pptx.js, fonts.js | 라이브러리와 글꼴은 따로 만든 Ctx로 적재하고, 각 변환은 자기 ctx.race로 기다린다. 동시에 변환하다 하나를 취소해도 다른 하나는 계속된다. | convert 「R1-N11」 |
| 15 부분: N5 규칙 레드팀 | tests/zzoom/redteam.test.js 규칙 사례 3개 | 고친 사례는 셋이다. cp until 없는 쓰기는 DENY 사례를 새로 넣고 기존 사례에는 until을 붙였다. 허가 없는 uploadId와 %2F 이름은 DENY로 바꿨다. | `RT_RULES=1` redteam pass 11, fail 0, todo 6 |
| 15 부분: 에뮬레이터 | tests/zzoom/run-rules.js | Windows 따옴표 문제와 「설정 폴더 밖 규칙 파일」 거절을 고쳤다. 임시 폴더에 설정과 규칙 사본을 만들어 쓰고, 저장소 뿌리에 firebase.json은 두지 않았다. | `npm.cmd run test:zzoom:rules` 63건: pass 62, fail 0, todo 1 |
| N3 Redis 키 부활 | keys.js `KEEP_SEC`, scReserve, scRelease, scDrop, remember, routes.js 판서 seq | 판서 장부 sc와 scp, seq, 정리 목록 keys에 만료를 건다(11일). 삭제와 겹쳐 다시 만들어져도 영구히 남지 않는다. 투표 키는 맡은 범위 밖이다. | api 「R1-N3」 |
| N4 유예 조각 at 신뢰 | routes.js `graceCheck` | 끝난 뒤 받는 조각에 세 가지를 더 걸었다. 이미 받은 번호는 덮어쓰지 못한다(transcript_exists). 받은 조각 바로 뒤 번호만 받는다(앞 3개 안). 회의당 5개까지다. 응답을 기다린 뒤 쓰는 트랜잭션에서도 다시 확인한다. | api 「R1-N4」, 「D5」 |
| N7 쪽 4MiB | core.js `encodeWithin` | 쪽이 4MiB, 썸네일이 512KiB를 넘으면 품질을 0.7, 0.55, 0.4로 낮춰 다시 저장한다. 그래도 넘으면 PAGE_TOO_LARGE로 멈추고, 안내 문구를 함께 낸다. | convert 「R1-N7」 |
| N9 관리자 host pt | 고치지 않음 | 관리자 입장(join) 경로를 바꿔야 하는데, join은 다른 에이전트가 고치는 중이다. | 없음 |

에뮬레이터를 처음 돌렸을 때 두 건이 실패했다.
- **viewer 업로드 거절**: AGENDA_OPEN 설계에서 참석자도 올리게 바뀐 탓이다. 시험을 「viewer도 자기 up 출입증으로는 올림」과 「up 없는 출입증은 거절」로 바꿨다.
- **덮어쓰기 거절**: Storage 에뮬레이터는 있는 파일에 다시 올리기를 create로 평가한다. 실제 규칙 엔진은 이것을 update로 보고 거절한다(Rules API로 DENY 확인). 그래서 이 시험은 todo로 두었다. 업로드 규칙 담당이 `allow create`에 `resource == null`을 더하면 에뮬레이터에서도 막히니 제안한다. storage.rules는 다른 에이전트가 고치는 중이라 건드리지 않았다.

**R1 뒤 숫자**
- `npm.cmd run test:zzoom` 79/79
- `npm.cmd test` 313과 11 모두 통과
- redteam: pass 9, todo 6 모두 ok (`RT_RULES=1`이면 pass 11)
- `LOAD_STRICT=1` load 2/2
- 다른 팀 쭘 시험(d1 3, d2 11, d4 7, draw 18, host 12) 모두 통과
- 규칙 에뮬레이터 62 pass, todo 1

로컬 Chromium에서 PDF 두 개, PNG, PPTX를 다시 변환해 보았다. sharedLoader로 바꾼 뒤에도 모두 WebP 2000px 안으로 나왔다.

**알릴 일(내 실수)**: 규칙 시험 도구를 임시 폴더에 설치하려 했다. 그런데 그 폴더에 package.json이 없어서 npm이 위로 올라가 사용자 홈 폴더의 package.json에 설치했다. 그 결과 그 파일과 package-lock.json에 `@firebase/rules-unit-testing`과 `firebase` 의존성이 더해졌거나 바뀌었다(수정 시각 11-25 22:40). 지금 규칙 에뮬레이터 시험은 바로 이 설치를 써서 돌아간다. 필요 없으면 그 두 줄을 지우고 `npm.cmd install`을 다시 하면 된다. 원래 내용의 사본은 없다. 저장소(AIroom)의 package.json은 바뀌지 않았다.

## R2. 서버 감사 2라운드(AUDIT_SERVER_R2, FAIL) 수정 (2026-11-26)

지적마다 시험을 먼저 써서 수정 전 코드에서 실패하는 것을 확인했고, 고친 뒤 통과시켰다. 커밋과 규칙 게시는 하지 않았다.

| 지적 | 고친 곳 | 어떻게 | 시험 |
|---|---|---|---|
| M1 붙인 자료를 cron이 지움(중요) | lib/zzoom/purge.js `uploadInUse` | 정리 작업은 지금까지 안건 a&lt;uploadId&gt;만 확인했다. 이제 회의의 안건 목록에서 base가 이 업로드 폴더인 안건도 찾는다(회의당 30개 이하). 찾으면 파일을 지키고 장부만 지운다. 새 안건 경로와 같은 보호다. | api 「R2-M1」 (수정 전 파일 4개가 0개) |
| M2 확정 전 허가 개수(중요) | keys.js `LUA.upOpen`과 `K.upOpen`, routes.js 업로드 허가와 commit 정리, purge 키 목록 | 확정 전이고 출입증(1시간)이 살아 있는 허가를 원자적으로 센다. 사람당 3개, 회의당 20개이고 주관자도 같다. 넘으면 429 upload_busy다. commit이 끝나면 자리를 비우고, 출입증이 끝난 허가는 세지 않는다. | api 「R2-M2」 사람·회의 상한, redteam 「확정 안 한 업로드 허가 쌓기」 |
| M2 허가당 바이트 | contract.js(서버·변환기 같은 값) `pageCaps`, 출입증 claim `upPageMax`·`upThumbMax`, storage.rules upPage, commit 검사, 변환기 `checkPageCount(n, ctx)` | 허가 하나의 상한은 원본 50MiB 미만, 쪽 그림 합계 200MiB, 썸네일 합계 20MiB다. 파일당 상한은 이 합계를 쪽 수로 나눈 값이다(50쪽까지 4MiB, 200쪽이면 1MiB). 같은 값을 다섯 곳이 쓴다. 서버 응답 limits, 규칙, commit, 변환기, 위조 시험이다. 변환기는 그 상한까지 품질을 낮춰 다시 저장한다. | api 「R2-M2 허가 하나로…」, convert 「R2-M2」, rules 「출입증의 파일당 상한」 |
| M3 녹음 꺼짐에도 받아쓰기 | routes.js `recordingOn` | 끝난 뒤 유예 조각이 아니면, 녹음 표시가 켜져 있고 켠 사람(recordingBy)이 보낼 때만 받는다. 아니면 409 recording_not_on이다. 응답을 기다린 뒤 쓰는 트랜잭션에서도 다시 확인한다. | api 「R2-M3」 |
| M4 관리자 로그아웃 뒤 남은 탭 | routes.js pt(), issue(), join, refresh | 관리자로 들어온 host의 pt 기록에 그 백암이 세션 토큰(stok)을 두고, 요청마다 validateSession으로 다시 본다. 세션이 없거나 관리자가 아니면 viewer로 취급한다. 주관 동작은 403 host_revoked, 업로드 출입증은 viewer가 된다. | api 「R2-M4」 |
| M5 만든 사람 다시 로그인 | public/zzoom/api.js `deviceId()`와 요청 머리 X-Device-Id | 백암이 로그인은 공용 코드라 계정 id가 없다. 다시 로그인한 같은 사람을 알아볼 방법은 기기 id뿐이다. 그래서 쭘 화면도 백암이 로그인 화면과 같은 `baekam_device_id`를 보낸다. 서버는 이미 만든 사람 열쇠에 기기 해시를 넣고 있었다. | api 「R2-M5」 |
| M5 관리자 100개 상한 | routes.js POST /meetings | 살아 있는 회의 100개 상한은 교직원에게만 건다. | api 「R2-M5」 |
| M6 두 회의 안건을 같은 사람으로 이음 | routes.js `ownHash` | 해시에 회의 id를 섞었다. 이전 형식 문서도 주인으로 알아보고, 안건 개수 세기도 isOwner를 쓴다. | api 「R2-M6」 |
| M7 옛 주석 | routes.js | 「기기·세션+이름」을 「백암이 로그인 세션의 사람 열쇠」로 고쳤다. | 없음 |
| N3 남은 부분 | routes.js closePoll, reveal | 투표 키를 다시 만드는 hset 뒤에 같은 만료(11일)를 건다. | api 「R2-N3」 |
| 레드팀 채팅 도배 todo | routes.js 채팅 | 공용 코드라 로그인을 새로 만들어 10번 들어올 수 있다. 막 들어온(1분 안) 자격은 회의 전체가 1초 1글을 나눠 쓰고, 1분이 지난 참석자는 이 묶음 밖이다. | redteam 「채팅 도배」 todo가 이제 ok |

**시험을 고친 곳(약해지지 않음)**
- api 「지적09 형식표」와 redteam 업로드 위조 사례는 같은 사람이 허가를 계속 받으므로, 허가 사이에 출입증 시간(1시간)을 흘려보낸다.
- 받아쓰기 시험들은 회의를 시작한 뒤 녹음을 켠다.
- rules 시험은 덮어쓰기와 겹치지 않게 다른 uploadId 폴더를 쓴다.
- 기존 시험의 기대값은 하나도 바꾸지 않았다.

**한계와 판단**
- **M5의 기기 id**: 브라우저 저장소의 값이라 다른 브라우저나 기기, 또는 저장소를 지운 뒤에는 만든 사람으로 알아보지 못한다. 그때는 관리자가 고친다. 기기 id는 그 기기의 무작위 값이라 남이 알기 어렵지만, 알아내면 흉내 낼 수 있다(관리 권한만, 회의 참가 권한과는 별개).
- **M4의 stok**: 관리자 host의 pt 기록에 세션 토큰을 둔다. 세션 자체가 이미 같은 Redis의 `session:<토큰>` 열쇠에 있어 새로 드러나는 값은 아니다. 관리자 host 요청마다 세션을 한 번 더 읽는다.
- **M6**: 1인 1표와 안건 주인은 「백암이 로그인 세션」 단위다. 다른 브라우저로 다시 로그인하면 새 사람이 된다. 화면과 설계서 문구는 UI 담당이 맞춰야 한다.
- **M2**: 상한에 걸린 허가는 commit하거나 1시간이 지나야 자리가 난다. 실패한 commit(422)도 자리를 비우지 않는다. 비우면 「올리고 실패하고 다시 받기」로 상한을 우회할 수 있어서다.
- **storage.rules**: 쪽과 썸네일 크기 줄 하나를 바꿨다(옛 출입증은 claim이 없어 기존 상한만 쓴다). 게시는 사용자가 서버 배포 뒤에 한다.

**R2 뒤 숫자(모두 timeout을 걸고 실행)**
- `npm.cmd run test:zzoom` 100/100
- `npm.cmd test` 313과 11
- redteam pass 9, todo 6 모두 ok. `RT_RULES=1`이면 pass 11, fail 0, todo 6
- `LOAD_STRICT=1` load 2/2
- `node tests/zzoom/run-rules.js` 에뮬레이터 64/64
- 로컬 Chromium에서 PDF 두 개, PNG, PPTX 변환이 모두 성공했다.


## R3 수정(서버 감사 R3, R2 회귀 4건과 사소 2건)

기준은 `reports/AUDIT_SERVER_R3.md` 와 재현 `repro3.js` 다. 화면(public/zzoom)은 다른 에이전트가 고치는 중이라 손대지 않았다. 서버(lib/zzoom, storage.rules 주석)와 시험만 고쳤다. 커밋은 하지 않았다.

**먼저 실패를 확인했다.** 새 시험 다섯 개(R3-P1, R3-P2, R3-P3, R3-P4와 바뀐 R2-M5)를 R2 코드로 되돌린 사본에 돌려 다섯 개 모두 실패하는 것을 봤다. 실제 값은 P1 409, P2 30명 가운데 1명, P3 취소 경로 404, P4 200이었다. 고친 뒤 다섯 개 모두 통과한다.

| 지적 | 고친 곳 | 고친 내용 | 시험 |
|---|---|---|---|
| P1 녹음 마지막 조각 409 | routes.js `recordingOn`, `tailCheck`, state `recording` 과 `end`, `recordingOffIf` | 녹음을 끌 때 `recordingOffAt` 과 `recordingOffBy`(켜 두었던 사람)를 남긴다. 그 사람이 끈 뒤 90초 안에 보내는 조각은 받는다. 이미 받은 번호는 덮어쓰지 않고(409 `transcript_exists`), 받은 조각 바로 뒤 번호(앞 3개 안)만 받으며, 한 번 끌 때마다 3개까지다. 받아쓰기를 기다리는 사이에 꺼졌으면(끈 시각이 요청을 받은 시각 뒤) 켜져 있던 것으로 보고 저장한다. 나가기와 90초 끊김으로 녹음이 내려갈 때도 같은 값을 남기므로 나가기 직전 조각도 받는다. | api 「R3-P1」, 「R2-M3」 |
| P2 입장 직후 채팅 1/30 | routes.js 채팅, keys.js `LUA.bucket`, `K.chatBucket` | 「막 들어온 자격은 회의 전체가 초당 1글」 묶음을 없앴다. 사람당 초당 1글은 그대로 두고, 회의 전체는 물통 방식(초당 15칸 채움, 30칸까지 모음)으로 묶는다. 30명이 한꺼번에 인사해도 모두 올라가고, 오래 퍼붓는 도배는 초당 15글로 막힌다. 물통 열쇠는 60초 만료이고 회의 삭제 때 함께 지운다. | api 「R3-P2」, redteam 「채팅 도배」(40봇: 첫 순간 30 이하, 1초 뒤 15 이하), load LD-2 입장 직후 인사 |
| P3 업로드 허가 자리 서비스 거부 | routes.js 허가와 새 `DELETE /:mid/uploads/:uploadId`, keys.js `LUA.upOpen` | 본인 허가만 취소하는 경로를 더했다(남이면 403 `not_yours`). 허가 자리를 돌려주고 허가 기록을 지운다. 장부는 남겨 정리 작업이 올라간 파일을 지운다. 확정 전 허가 수명과 업로드 출입증은 15분이다. 주관자 허가는 회의 20칸에 넣지도 세지도 않고 사람 3칸만 받는다. | api 「R3-P3」(세션 8개로 회의 칸을 채워도 주관자는 바로, 다른 사람은 15분 뒤 올림), 「R2-M2」 |
| P4 기기 id 로 만든 사람 인정 | routes.js `ownerKeys` | 만든 사람은 같은 로그인 세션 토큰으로만 알아본다. 기기 id 는 보지 않는다(옛 회의에 남은 기기 열쇠도 이제 맞지 않는다). 관리자는 그대로다. | api 「R3-P4」, 「R2-M5」(다시 로그인하면 같은 기기여도 403) |
| P5 정리 순서 | routes.js commit `cleanup` | 허가 자리(upOpen)부터 지운다. | 기존 commit 시험 |
| P6 옛 주석과 상수 | storage.rules 주석, routes.js `LIMIT` | 업로드 폴더 주석을 「허가를 받은 주관자나 참석자」로 고쳤다. 쓰지 않는 `LIMIT.pageBytes` 와 `thumbBytes` 를 지웠다(쪽 상한은 contract.js `pageCaps`). | 없음 |

**함께 넣은 서버 기능(화면 결정 반영, CONTRACTS.md 2-3과 2-3-1에 적음)**
- 발표 마치기 `POST /:mid/presenter/end`: 지금 발표자 본인이나 주관자만 쓸 수 있다. `presenter.cid` 를 비우고, `live.aid` 를 비워 모두 대기 화면으로 돌린다. 이때 epoch, rev, forceSeq 를 올린다. 회의가 live 일 때만 되고, 사람당 2초에 1번이다. 시험은 api 「발표 마치기」다(시작 전과 끝난 뒤 409, 남 403, 옛 발표자의 /live 409, 연속 429).
- 만든 사람 바로 주관: 회의를 만든 사람이 같은 로그인 세션으로 들어오면 주관 코드 없이 주관자 pt 를 받는다(`via:'creator'`). 그 세션이 끝나면 주관 동작은 403 `host_revoked` 가 되고, refresh 도 viewer 로 내린다. 다른 로그인은 같은 기기 id 를 보내도 viewer 다. 시험은 api 「만든 사람(같은 로그인 세션)」이다. 두 시험 모두 고치기 전에 실패하는 것을 확인했다(404, viewer).

**시험을 고친 곳**
- R2-M2: 주관자 허가 3개가 회의 칸에 들지 않으므로 참석자만 20개를 센다. 수명이 지나는 시간은 15분으로 바꿨다.
- R2-M3: 끈 뒤 90초 안의 이어지는 조각은 이제 받으므로, 91초 뒤에 거절되는지 본다.
- R2-M5: 같은 기기 다른 로그인은 403 이다. 화면이 기기 id 를 보내는지 보던 줄은 지웠다.
- redteam 채팅 도배: todo 를 실제 검사로 바꿨다. 봇 40개로 회의 상한을 확인한다.
- load LD-2: 30명이 1초마다 한 글씩 10초 동안 쓰는 장면은 회의 전체 초당 30글이라, 요청받은 회의 상한(초당 15)과 맞지 않는다. 그래서 간격을 2.2초와 2.25초로 바꿨다(회의 전체 초당 약 13.6글). 같은 1초 안 두 번째 글이 429 인지 보는 검사는 그대로다. 입장 5초 뒤 30명이 같은 순간 인사하는 장면을 더했다(30명 모두 201 이어야 함).

**한계와 판단**
- P4: 다시 로그인하거나 다른 브라우저로 들어온 만든 사람은 만든 사람으로 보지 않는다. 그 사람은 회의 주관 코드를 넣어 주관자가 된다. 회의 고치기, 지우기, 잠금 풀기는 같은 로그인 세션이거나 관리자만 할 수 있다. 화면 `api.js` 는 아직 X-Device-Id 를 보낸다. 서버는 입장 속도 제한에만 쓰므로 그대로 둬도 된다. 지울지는 화면 담당이 정하면 된다.
- P2: 회의 전체 물통은 모든 참석자가 나눠 쓴다. 공용 코드로 로그인을 여러 개 만든 사람이 계속 퍼부으면 다른 사람의 채팅도 잠깐씩 429 가 된다. 이때 서버는 다른 기능을 막지 않고 채팅만 초당 15글로 묶는다.
- P3: 취소하면 자리는 바로 나지만 그 허가의 출입증은 15분까지 살아 있다. 그동안 올린 파일은 장부에 남아 정리 작업이 지운다. 취소와 다시 받기를 되풀이하는 것은 참석자 안건 추가 속도 한도(분당)로 묶인다.
- P1: record.js 는 고치지 않아도 된다. 화면 순서(멈춤, 끄기, 마지막 조각)를 서버가 받아 준다.
- 「발표 마치기」를 쓰는 화면 함수 이름과 단추는 화면 담당이 붙인다.

**R3 뒤 숫자(모두 timeout을 걸고 실행)**
- `npm.cmd run test:zzoom` 106/106
- `npm.cmd test` 313과 11
- `RT_RULES=1` redteam pass 11, fail 0, todo 5(채팅 도배 todo 는 실제 검사로 바뀌었다)
- `LOAD_STRICT=1` load 2/2
- `node tests/zzoom/run-rules.js` 에뮬레이터 64/64


## R4 수정(서버 감사 R4)

기준은 `reports/AUDIT_SERVER_R4.md` 와 재현 `repro4.js` 다. 번호는 조정자 지시 순서(Q1~Q6)를 따른다. 감사 보고서의 Q4(꼬리 at)는 Q3에, 감사 Q5(주관자 채팅)는 Q4에, 감사 Q6(만든 사람 토큰)은 Q5에, 감사 Q7(재입장 녹음)은 Q6에 해당한다. 서버와 시험만 고쳤다. 화면 api.js 의 취소 호출은 화면 팀이 붙인다. 커밋은 하지 않았다.

**먼저 실패를 확인했다.** 새 시험 다섯 개(R4-Q1, Q2, Q3과 Q6, Q4, Q5)를 R3 코드에 돌려 다섯 개 모두 실패하는 것을 봤다. 주관자 발급 31개, 참석자 429, 재입장 녹음 409, 주관자 채팅 429, 토큰 until 이 세션 만료를 넘음이었다. 고친 뒤 다섯 개 모두 통과한다.

| 지적 | 고친 곳 | 고친 내용 | 시험 |
|---|---|---|---|
| Q1 취소한 출입증이 쌓임 | routes.js 허가 발급 | 발급한 수 자체를 시간당으로 묶는다(취소한 것도 센다). 사람당 12개, 주관자는 사람당 30개, 회의 전체 참석자 몫 60개다. 주관자는 회의 몫에 들지 않는다. 동시에 살아 있는 출입증은 사람당 시간당 12개(약 3.2GiB), 회의 참석자 전체 60개 안이다. | api 「R4-Q1」 |
| Q2 세션 7개로 참석자 업로드 막기 | routes.js `LIMIT.openUploadsMeeting` | 회의 미확정 칸을 60으로 늘렸다. 세션 7개가 3칸씩 채워도 21칸이라 다른 참석자가 올린다. 칸 60은 시간당 발급 60과 같아서 총량은 Q1 이 묶는다. | api 「R4-Q2」 |
| Q3 녹음 꼬리 | routes.js `recordingOn`, `tailCheck`, 받아쓰기 뒤 셈 | 꼬리 개수는 저장에 성공한 뒤에 센다. 그래서 같은 번호의 Groq 429나 502 재시도는 세지 않는다(덮어쓰기를 막으므로 번호마다 한 번). 꼬리 조각은 시작 시각(at)이 끈 시각보다 앞일 때만 받는다. at 이 없으면 거절한다. | api 「R4-Q3과 Q6」, 「R3-P1」 |
| Q4 주관자 공지가 막힘 | routes.js 채팅 | 주관자 채팅은 회의 물통을 건너뛴다. 주관자도 사람당 1초 1글 한도는 받는다. | api 「R4-Q4」 |
| Q5 만든 사람 토큰 until | routes.js `issue`, `pt()`, `/refresh`, 업로드 출입증 | 만든 사람 host 의 토큰과 업로드 출입증 until 을 그 로그인 세션 만료(있으면)로 자른다. 세션이 끝나면 주관 동작은 403 이다. `/refresh` 는 세션과 만든 사람 여부를 다시 보고, 만료가 바뀌었으면 맞춘다. | api 「R4-Q5」 |
| Q6 재입장 녹음자 409 | routes.js `recordingOn`, state `recording` | 녹음을 켤 때 켠 사람의 사람 열쇠(`recordingPerson`, 같은 로그인 세션)를 남긴다. 새로 고침해 cid 가 바뀌어도 같은 사람이면 이어 받는다. 받는 트랜잭션에서 `recordingBy` 를 새 cid 로 넘긴다. 그래서 옛 cid 가 끊겼다고 heartbeat 가 녹음을 내리지 않는다. 꼬리 조각도 같은 사람이면 받는다. | api 「R4-Q3과 Q6」 |

**storage.rules 에서 허가 문서 확인(보고만).** 규칙이 `firestore.get` 으로 허가 문서를 보게 하면 취소한 출입증을 바로 막을 수 있다. 그러나 세 가지가 필요하다. 허가를 Redis 말고 Firestore 문서로도 써야 한다. 쪽마다 한 번씩 읽으므로 200쪽 업로드면 읽기 약 400번과 지연이 붙는다. 그리고 Storage 규칙이 Firestore 를 읽도록 Firebase 콘솔에서 권한을 줘야 한다. 마지막 것은 Firebase 조작이라 이번에 하지 않았다. 지금은 Q1 의 발급 총량으로 묶는다. 필요하면 사용자가 권한을 준 뒤 다음 수정에서 넣는다.

**시험을 고친 곳**
- R2-M2: 회의 칸이 60이라 세션 21개로 채운다. 61번째는 `upload_busy` 나 시간당 발급 `rate_limited` 다.
- R3-P1: 꼬리 조각은 끄기 전 시각을 at 으로 보낸다(화면이 조각 시작 시각을 보내는 것과 같다).
- R3-P3: 칸 60과 시간당 발급 60이 같아서, 다른 사람은 15분이 아니라 다음 한 시간 칸에서 다시 올린다. 주관자는 회의 칸이 차도 바로 올린다.

**한계와 판단**
- 공용 코드로 세션을 5개 넘게 만들면 회의 참석자 몫(시간당 60개)을 다 쓸 수 있다. 그러면 그 시간 동안 다른 참석자 업로드는 429 다. 주관자는 회의 몫 밖이라 올릴 수 있다. 세션을 사람 단위로 묶을 수 없는 한 이 정도가 단순한 쪽의 한계다.
- 만든 사람 세션에 만료 값이 없으면 토큰은 코드 host 와 같은 1시간이다. 서버 주관 동작은 로그아웃 즉시 막힌다.
- Q6 의 「같은 녹음 세션」은 같은 로그인 세션이다. 다른 브라우저로 다시 로그인한 주관자는 녹음을 다시 켠다.

**R4 뒤 숫자(모두 timeout을 걸고 실행)**
- `npm.cmd run test:zzoom` 113/113(중간 한 번 AL04 두 개가 실패했다. 다른 에이전트가 index.html 을 고치는 중이었고 다시 돌리니 통과했다)
- `npm.cmd test` 313과 11
- `RT_RULES=1` redteam pass 11, fail 0, todo 5
- `LOAD_STRICT=1` load 2/2
- `node tests/zzoom/run-rules.js` 에뮬레이터 64/64
