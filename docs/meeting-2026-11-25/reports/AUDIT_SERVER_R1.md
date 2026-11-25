판정: **FAIL** — 치명 0, 중요 2(새 지적 N1·N2), 확인 필요 중요 1(N6). 지적 01~16 가운데 이번 범위는 해결 9, 부분 3, 범위 밖 4(12는 서버 쪽만 확인).

# 감사 라운드 1 — 영역 ① 서버·규칙 (2026-11-25)

범위: `lib/zzoom/*`, server.js 쭘 줄(225-235·311-316·2393-2398), `firestore.rules`(166-193)·`storage.rules` 쭘 블록, `public/zzoom/convert/*`, FIX_ENGINE·REDTEAM·LOAD.
기준: 운영 f5eb70b + 커밋 전 작업 트리. 감사하는 동안에도 routes.js 가 바뀌었다. 회의 만들기 개방은 바뀐 뒤 상태로 봤다. **업로드·안건 라우트와 storage.rules 업로드 블록은 AGENDA_OPEN 때문에 「변경 중」이라 이번 판정에서 빼고 관찰만 적었다.** 줄 번호는 감사 시점 작업 트리 기준이라 조금 밀릴 수 있다. 코드 수정·커밋·배포·게시는 하지 않았다. 재현 스크립트는 모두 `%TEMP%\zzaudit\`(저장소 밖)에 있다.

## 표 1. 지적 01~16 재검증

| 번호 | 판정 | 근거 |
|---|---|---|
| 01 회수된 host 권한 | 해결 | claim until = min(회의 만료, 지금+1h)(routes.js claimsFor 169-171). refresh 가 grantVer 를 다시 확인한다. Storage 쓰기는 up claim 토큰만 된다(storage.rules:59-78). Rules API 29/29, api 「지적01」 2건(옛 코드에서 실패). 남은 것: 관리자 입장 host 는 회수되지 않는다(N9, 사소). |
| 02 업로드와 허가 결합 | 해결(변경 중) | 규칙이 이름·쪽 수·크기·형식·uploadId·mid 를 확인한다(Rules API 업로드 19건 기대대로). list 는 금지되고, commit 이 WebP 머리와 쪽 크기를 확인한다(webpSize 72-83). 업로드 라우트가 지금 바뀌는 중이라 다음 라운드에 다시 본다. |
| 03 commit 뒤 장부 실패 | 해결 | 장부를 먼저 쓰고, commit 재시도가 cleanup 을 다시 한다. cron 은 안건이 있으면 파일을 지킨다(purge.js runPurge 업로드 절). api 「지적03」 2건이 옛 코드에서 실패한다. |
| 04 삭제 뒤 늦은 쓰기 | 해결 | `guarded`(183-190)가 같은 트랜잭션에서 회의 상태를 확인한다. 받아쓰기·채팅·손·heartbeat·판서·투표·join·host 가 모두 쓴다. 남은 것: Redis 키 재생성(N3, 사소). |
| 05 판서 epoch·장부 | 해결 | scReserve/scRelease/scDrop Lua(keys.js), 저장 트랜잭션 안에서 epoch 확인, 지우기도 트랜잭션. api 「지적05」 2건이 옛 코드에서 실패한다. |
| 06 투표 경쟁·종료 | 해결 | 투표 생성은 guarded 안에서 열린 투표를 확인한다. 끝내기를 다시 보내면 closePoll 로 복구한다. api 「지적06」이 옛 코드에서 실패한다. |
| 07 cron·네트워크 예산 | 부분 | scoped deadline 과 호출별 타이머(gcp.js call), cron 200건 상한, Whisper 50초는 들어갔다. 그러나 `accessToken()` 은 deadline 밖에서 고정 15초를 쓴다(gcp.js:50-56, N8). Vercel maxDuration 미설정은 확인 필요. |
| 08 PNG 대체 | 해결 | checkWebpSupport 와 emitPage 가 WEBP_UNSUPPORTED 로 멈춘다(core.js 161-199). convert 시험 통과. |
| 09 형식표 | 해결 | 서버와 변환기의 contract.js 가 같고, source{kind,ext,mime}, 50MiB 미만 경계가 맞는다. 규칙은 ext 와 MIME 의 짝을 보지 않고 commit 이 거른다(사소). |
| 10 취소·시한·해제 | 부분 | Ctx 가 사용자 취소와 6분 시한을 한 신호로 묶었고(core.js 51-101), race 와 finally 로 해제한다. HWP 동기 WASM 은 쪽 사이에서만 끊긴다(한계로 명시됨). 적재 promise 공유 문제가 남았다(N11, 사소). |
| 11 해시 고정 | 해결 | CDN 파일은 해시를 확인한 바이트를 blob 으로 실행한다(pdf.js 14-30). silurus 와 pdf 보조 파일은 같은 출처 고정본과 manifest 로 묶였다. PPTX 진입 파일은 확인한 뒤 같은 주소를 다시 import 하지만(pptx.js:25-29) 같은 출처라 받아들일 만하다. |
| 12 ba 수명 | 범위 밖(서버 쪽만 확인) | storage-token.js claimsFor 가 until 을 붙이고, 규칙이 until 을 확인한다(Rules API: until 없음·지남·문자열 모두 거절). SPA 쪽은 다른 감사자가 본다. |
| 13 SPA 업로드 실패 | 범위 밖 | 다른 감사자. |
| 14 REST 재시도·오류 | 해결 | runTransaction 이 읽기와 commit 의 ABORTED 를 재시도하고(gcp.js), 오류를 분류한다(routes.js 963-973). guardRedis 는 503 을 낸다. api·units 「지적14」가 옛 코드에서 실패한다. |
| 15 시험 빈틈 | 부분 | 가짜 Redis 가 Lua 본문을 fengari 로 실행한다(units 「지적15」). 그러나 규칙 에뮬레이터 시험은 여전히 돌지 않았고, `RT_RULES=1` 레드팀은 옛 기대값 3개 때문에 **fail 1** 이다(N5). 이번 감사에서 Rules API 로 직접 44건(Storage 29, Firestore 15)을 확인했다. |
| 16 카피본 경로 | 범위 밖 | 다른 감사자. |

## 표 2. 새 지적

| 번호 | 심각도 | 파일:줄 | 문제 | 실패 시나리오(입력 → 잘못된 결과) | 고칠 방향 |
|---|---|---|---|---|---|
| N1 | 중요 | routes.js:119-122(personOf), 924(vote), keys.js vote Lua. 채팅(754)과 판서 사람 상한(739)도 같은 열쇠를 쓴다 | 「사람 열쇠」가 클라이언트가 정하는 `X-Device-Id` 이고, 없으면 토큰과 **이름**이다. 재입장 중복 투표 막기(RT-4 수정)가 헤더만 바꾸면 풀린다. 레드팀 시험은 같은 토큰·같은 이름만 시험한다(redteam.test.js:347-352). | 같은 로그인으로 `X-Device-Id: fake0..4` 를 바꿔 5번 join 하고 vote → **5표 모두 200, tally o2=5**. 기기 id 없이 이름만 바꿔 3번 → **3표 200**(repro1.js). 사람당 판서 300선과 채팅 사람 버킷도 같은 방법으로 풀린다. | 사람 열쇠를 서버가 아는 값(백암이 세션 토큰 해시)으로만 만들고, 세션마다 그 회의 입장 수를 제한한다. 공유 접근 코드라 완전한 1인 1표는 불가능하므로 화면과 설계서에 「기명 투표가 아니면 1인 1표를 보장하지 않음」을 적는다. FIX_ENGINE §3-4 의 「결과 ok」 문구도 고친다. |
| N2 | 중요 | routes.js:271-286(POST /meetings, login), 254(listAll 1000) | 회의 만들기를 모든 교직원에게 열었는데 속도와 개수 상한이 없다. 매번 PBKDF2 120,000회를 동기로 돌리고(실측 39ms) Redis 키와 Firestore 문서를 만든다. 목록은 1,000개에서 잘린다. | 일반 세션으로 40번 연속 만들기 → **40개 모두 201**(repro1.js). 스크립트나 두 번 누르기가 쌓여 1,000개를 넘으면 id 순으로 뒤에 있는 진짜 회의가 목록에서 사라진다. 만들 때마다 이벤트 루프가 40ms 멈춘다. | 세션·IP·기기별 생성 속도 제한(예: 시간당 10), 만든 사람당 살아 있는 회의 수 상한, 목록 정렬과 쪽 나누기. PBKDF2 는 비동기(crypto.pbkdf2)로 바꾼다. |
| N3 | 사소 | routes.js:739-748(scReserve·hincrby), 840 부근(poll hset·remember), keys.js remember | 삭제와 겹친 요청이 지워진 Redis 키를 TTL 없이 다시 만든다. | pt() 통과 → purge redis 단계가 zz:sc/scp/seq/keys 삭제 → 그 요청이 키를 다시 만듦 → guarded 가 410 을 내도 키는 영구히 남는다. | 다시 만들어질 수 있는 키에 EXPIRE(회의 만료+1일)를 함께 걸거나 Lua 안에서 TTL 을 정한다. |
| N4 | 사소 | routes.js:968-976(allowTranscribe·at0) | 끝낸 뒤 유예 판정이 주관자가 보낸 `at` 값을 그대로 믿는다. | 끝낸 지 2분 안에 `at=endedAt-1` 로 아무 소리 조각을 보내면 **201**. 주관자만 할 수 있어 영향은 작다. | 끝내기 직전까지 받은 조각 번호(n) 다음 것만 받는 식으로 좁힌다. |
| N5 | 사소 | tests/zzoom/redteam.test.js:549,556,561 | 규칙 레드팀 기대값이 옛 규칙 기준이다. RT_RULES=1 이면 fail 1. 실패한 세 건(cp until 없음, 허가 없는 uploadId, %2F 이름)은 모두 지금 규칙이 더 안전하게 DENY 하는 경우다. | 규칙 시험을 켠 CI → 안전해진 결과 때문에 빨간불 → 결국 꺼 두게 된다. FIX_ENGINE 의 「redteam pass 9, skip 2」는 이 시험을 돌리지 않은 숫자다. | 세 기대값을 DENY 로 바꾸고 cp 사례에 until 을 넣는다. |
| N6 | 중요(확인 필요) | public/zzoom/convert/hwp.js:56-60 | HWP 쪽 캔버스 크기를 rhwp 가 정하고 2000px 자르기가 없다. PDF(pdf.js:68)에는 반올림과 자르기가 있다. | rhwp 가 올림하면 긴 변이 2001px → commit 이 `bad_sizes`/422 로 거절 → HWP 안건 전체가 실패한다. 실제 HWP 표본으로 잰 적이 없다(FIX §7). | 그린 뒤 긴 변이 2000 을 넘으면 줄여 복사하거나 배율을 조금 낮춘다. 실제 HWP 로 확인한다. |
| N7 | 사소 | core.js emitPage(176-199) | 쪽 WebP 가 4MiB 이하인지 변환기가 보지 않는다. | 잡음 많은 스캔 → 4MiB 초과 → Storage 규칙이 거절(storage.rules:67)하고 화면에는 원인 모를 실패로 보인다. | 4MiB 를 넘으면 품질을 낮춰 다시 저장한다. |
| N8 | 사소 | lib/zzoom/gcp.js:50-56 | 접근 토큰 발급이 deadline 밖에서 고정 15초를 쓴다. | 콜드 스타트 cron 이 예산 막바지에 토큰을 받으면 최대 15초 넘친다. | accessToken 에도 남은 시간 타이머를 쓴다. |
| N9 | 사소 | routes.js:150-154·348 | 관리자로 입장한 host(via 'admin')는 코드 변경으로 회수되지 않고, 관리자 세션이 끝나도 pt 가 12시간 남는다. | 관리자가 로그아웃해도 그 탭의 pt 로 주관 동작이 된다. | pt 를 확인할 때 sess 로 백암이 세션이 살아 있는지 다시 본다. |
| N11 | 사소 | convert/pdf.js:14-30, pptx.js:16-40 | 라이브러리 적재 promise 가 처음 변환의 ctx(취소 신호)에 묶인 채 공유된다. | 두 파일을 동시에 변환하다 첫째를 취소하면 둘째도 ABORTED. | 적재는 ctx 없이 하고, 각 변환은 자기 ctx.race 로 기다린다. |

다음 라운드 확인(변경 중이라 판정 제외):
1. 업로드 허가 개수 상한이 없다. 주관자 하나가 허가 60개를 연속으로 받았고(모두 201), 허가 하나는 최대 약 949MiB 를 24시간 동안 남길 수 있다(repro1.js). 참석자에게 열리면 영향이 커진다.
2. 업로드 출입증 role 과 storage.rules `upToken`(zzHost)의 짝. 지금 상태로는 참석자 업로드가 규칙에서 거절된다. 반대로 role 을 host 로 주면 참석자가 people 을 읽게 된다.

## 실행한 명령과 결과

| 명령 | 결과 |
|---|---|
| `npm.cmd run test:zzoom` | tests 64, pass 64, fail 0, skipped 0 |
| `node --test tests/zzoom/redteam.test.js` | tests 17, pass 9, fail 0, skipped 2, todo 6(모두 ok) |
| `RT_RULES=1 node --test tests/zzoom/redteam.test.js` | tests 17, pass 10, **fail 1**(N5), todo 6 |
| `LOAD_STRICT=1 node --test tests/zzoom/load.test.js` | tests 2, pass 2, fail 0 |
| 지금 시험(api·units)을 c347538 코드에 | tests 42, pass 12, fail 30(지적 시험이 옛 코드에서 실패함을 확인) |
| Rules 시험 API storage.rules(`rules-storage.js`) | 29/29 기대대로 |
| Rules 시험 API firestore.rules 쭘 블록(`rules-fs.js`) | 15/15 기대대로 |
| `node repro1.js`(가짜 fb·Redis + 실제 createRouter) | 기기 id 를 바꾼 재투표 5/5 인정, 이름을 바꾼 재투표 3/3 인정, 업로드 허가 60/60, 일반 교직원 회의 만들기 40/40, 끝낸 뒤 at 을 조작한 조각 201 |

## 진행 기록 (찾을 때마다 적은 원문)
- 실행: `npm.cmd run test:zzoom` → tests 64, pass 64, fail 0, skipped 0.
- 관찰(후보): 투표 `already_voted`·채팅 사람 버킷·판서 사람 상한이 기대는 `personOf`(routes.js:119-122)는 클라이언트가 마음대로 정하는 `X-Device-Id` 값이다. 재입장할 때 다른 값을 넣으면 새 사람이 된다 → 재현 예정.
- 실행: `node --test tests/zzoom/redteam.test.js` → tests 17, pass 9, fail 0, skipped 2(RT_RULES), todo 6(모두 ok). `LOAD_STRICT=1 node --test tests/zzoom/load.test.js` → tests 2, pass 2, fail 0.
- 재현 1(저장소 밖 `%TEMP%\zzaudit\repro1.js`, 가짜 fb·Redis + 실제 createRouter, 회의 만들기 개방 변경 중인 작업 트리 기준):
  - 같은 교직원이 `X-Device-Id` 만 바꿔 5번 재입장 → **5표 모두 200**, tally o2=5. 기기 id 없이 이름만 바꿔 3번 → **3표 200**. (레드팀 RT-4 시험은 같은 토큰·같은 이름만 시험해 이 경로를 못 본다: redteam.test.js:347-352)
  - 주관자 한 명이 업로드 허가 60개 연속 → **60개 모두 201**(허가 개수 상한 없음). 허가 하나가 쓸 수 있는 Storage 최대 약 949MiB(쪽 200×4MiB + 썸네일 200×512KiB + 원본 50MiB), 24시간 정리까지 남는다.
  - 일반 교직원 세션으로 회의 만들기 40번 → **40개 모두 201**(속도·개수 상한 없음, 매번 PBKDF2 120,000회 동기 계산).
  - 끝낸 회의에 `at=endedAt-1` 로 조각 → 201 (유예 2분 안, 주관자만 — 사소).
- 조정자 안내 반영: 회의 만들기 개방(canManage, routes.js:126-133·256-306)은 바뀐 뒤 상태로 본다. **업로드·안건 라우트(routes.js 업로드·안건 절)와 storage.rules 업로드 블록은 「변경 중」(briefs/AGENDA_OPEN.md)** — 이번 라운드에서는 관찰만 적고 판정은 다음 라운드로 넘긴다(위 업로드 허가 개수 재현 포함).
- Rules 시험 API(게시 없음, `%TEMP%\zzaudit\rules-storage.js`·`rules-fs.js`):
  - storage.rules 현 작업 트리: **29/29 기대대로**(업로드 p/t 이름·쪽 수·크기·형식, uploadId·mid 교차, 덮어쓰기·삭제·list 거절, ba/cp until 없음·지남·문자열 거절, zz 토큰의 기존 경로·루트 거절). 원본은 ext 와 MIME 짝을 규칙이 보지 않아(pdf 이름 + image/png 허용, storage.rules:74) commit(routes.js okMime)이 거른다 — 사소.
  - firestore.rules 쭘 블록: **15/15 기대대로**(다른 회의·만료·비로그인·ba 거절, viewer people 거절·host people list 허용, 쓰기 전부 거절, 모르는 하위·3단 경로 거절). list 시험은 path 에 문서 id 자리를 넣어야 판정된다(처음 컬렉션 경로로 넣은 2건은 내 시험 오류).
- 시험이 수정 전 코드에서 실패하는지: c347538 의 lib·server.js 를 `git archive` 로 저장소 밖(`%TEMP%\zzaudit\old`)에 풀고 지금 시험(api·units)을 돌림 → **tests 42, pass 12, fail 30**. 지적01·02·03×2·04·05×2·06·07×3·09·12·14×3·15, D5, 사소 2건 시험이 모두 옛 코드에서 실패 → 실패 경우를 실제로 재현하는 시험이다.
- 확인: 회의 만들기 개방 뒤 `POST /meetings` 에 속도·개수 상한 없음(routes.js:256-271). PBKDF2 1회 실측 39ms(동기, 이벤트 루프 막음). 목록은 `listAll(MEETINGS, 1000)`(routes.js:232 부근)이라 회의가 1,000개를 넘으면 진짜 회의가 목록에서 빠진다.
- 확인: 업로드 출입증은 `claimsFor(mid, m, 'host', {up…})`(routes.js:473 부근)로 role 을 'host' 로 고정한다. 지금은 주관자만 받으니 문제없지만, AGENDA_OPEN 으로 참석자도 올리게 되면 **참석자가 host claim 토큰을 받아 people(주관자만 읽기, firestore.rules:189)을 읽게 된다** → 다음 라운드 확인 항목.
- 확인(사소): 삭제와 겹친 판서·투표 요청이 Redis 키를 TTL 없이 다시 만들 수 있다. pt() 통과 → purge redis 단계가 zz:sc/scp/seq/keys 삭제 → 그 요청의 scReserve·hincrby·remember·closePoll 이 키 재생성(routes.js:681,688,840, keys.js remember) → guarded 410 뒤에도 키는 남음(만료 없음). 영향은 Redis 찌꺼기뿐.
- 확인 필요(중요 가능): HWP 쪽 캔버스 크기를 rhwp `renderPageToCanvas`(hwp.js:58-60)가 정하고 2000px 자르기가 없다. PDF 는 반올림·자르기(pdf.js:68)를 넣었다. rhwp 가 올림하면 2001px → commit `bad_sizes`/422 로 안건 전체가 막힌다. 실제 HWP 표본으로 확인되지 않음(FIX_ENGINE §7, CONVERT_PERF).
- 확인 필요(사소): 변환기는 쪽 WebP 가 4MiB 이하인지 보지 않는다(core.js emitPage). 넘으면 Storage 규칙(storage.rules:67)에서 업로드가 거절돼 이유 없는 실패로 보인다.
