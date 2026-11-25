판정: **FAIL** — 치명 0, 중요 2(새 지적 M1·M2). R1 지적 10건 가운데 해결 7, 부분 2(N3·N9), 미해결 0. R1 「다음 라운드 확인」 2건 가운데 1건 미해결(M2로 올림).

# 감사 라운드 2 — 영역 ① 서버·규칙 (2026-11-26)

범위: `lib/zzoom/*`, server.js 쭘 줄(225-235·311-316·2393-2398), `firestore.rules` 쭘 블록(166-194), `storage.rules`(37-87), `public/zzoom/convert/*`.
기준: 브랜치 feat/meeting, 커밋 f5eb70b + 커밋 전 작업 트리(2026-11-26). 줄 번호는 이 작업 트리 기준이다. 수정 보고(FIX_ENGINE·ANON·AGENDA_OPEN)는 참고만 했고 판정은 코드와 직접 실행으로 했다. 코드 수정·커밋·배포·규칙 게시는 하지 않았다. 재현 스크립트는 저장소 밖 `%TEMP%\zzaudit2\`에 있다.

## 표 1. R1 지적 재검증

| 번호 | 판정 | 근거 |
|---|---|---|
| N1 사람 열쇠 | 해결 | `personOf` 가 서버가 확인한 백암이 세션 토큰의 해시다(routes.js:124). `X-Device-Id`·이름은 쓰지 않는다. 재현 [F]: 같은 세션이 기기 id 를 바꿔 4번 들어와 투표하면 **1표만 인정**된다. [E]: 다시 들어와 발표하기를 눌러도 429. 남은 것은 새로 로그인하면 새 사람이 된다는 점이다(M6, 사소). |
| N2 회의 만들기 남용 | 해결 | 세션당 10분 5개, IP당 1시간 30개, 살아 있는 회의 100개 상한(routes.js:279-285). 남은 것: `pbkdf2Sync` 동기 계산(93-95), 그리고 100개 상한이 관리자에게도 걸린다(M5, 사소). |
| N3 Redis 키 재생성 | 부분 | 판서 Lua 3개에 `KEEP`(keys.js:27-28, 88·110·129), `seq` 에 expire(routes.js:838), `remember` 에 expire(keys.js:136)가 들어갔다. 그러나 `closePoll` 의 `hset`(routes.js:237)과 reveal 의 `hset`(1058)은 삭제와 겹치면 투표 키를 만료 없이 다시 만든다. |
| N4 끝낸 뒤 at 조작 | 해결 | `graceCheck`(routes.js:1077-1082)는 받은 조각을 덮어쓰지 않고, 앞 3개 안에 받은 조각이 있어야 다음 번호를 받는다. 유예 조각은 회의당 5개까지다(1099-1100). 트랜잭션 안에서 다시 확인한다(1117). |
| N5 RT_RULES 옛 기대값 | 해결 | `RT_RULES=1` 레드팀 결과는 pass 11, fail 0, skipped 0. |
| N6 HWP 2001px | 해결(코드) | `fitCanvas`(core.js:183-195)가 긴 변을 2000 안으로 줄이고, hwp.js:64 에서 부른다. 실제 HWP 표본으로 잰 기록은 이번에도 없다(확인 필요, 사소). |
| N7 쪽 WebP 4MiB | 해결 | `encodeWithin`(core.js:167-177)이 품질을 0.85, 0.7, 0.55, 0.4 순서로 낮춰 다시 저장하고, 끝내 넘으면 `PAGE_TOO_LARGE` 를 낸다. 썸네일도 512KiB 로 같다(237). |
| N8 accessToken 15초 | 해결 | `accessToken(deadline)`(gcp.js:53-67)이 남은 시간 타이머를 쓴다. `call` 이 deadline 을 넘긴다(75). |
| N9 관리자 host 회수 | 부분 | 관리자 host 의 pt 와 출입증이 세션 만료 시각(`adminUntil`)을 넘지 않는다(routes.js:165, 193-196, 359, 553-554). refresh 는 세션을 다시 확인한다(407-415). 그러나 **로그아웃(세션 삭제)** 은 pt() 가 보지 않는다. 재현 [D]: 관리자 세션을 지운 뒤에도 그 pt 로 penLock 200, 업로드 허가 201 이 나온다(refresh 만 viewer 로 내린다). 세션 수명이 24시간(server.js:30)이라 남는 시간은 최대 pt 수명 12시간이다(M4). |
| N11 적재 promise 공유 | 해결 | `sharedLoader`(core.js:199-209)는 자기 Ctx 로 적재하고, 각 변환은 자기 `ctx.race` 로 기다린다. pdf.js:13, pptx.js:15, hwp.js:9, fonts.js:8 이 모두 이 방식을 쓴다. |
| 지적07 | 해결(확인 필요) | N8 이 고쳐졌다. vercel.json 에 `maxDuration` 이 없다. purge 50초 예산이 프로젝트 기본 함수 시간 안에 드는지는 Vercel 설정에서 확인해야 한다. |
| 지적10 | 해결 | N11 이 해결됐다. HWP 동기 WASM 은 쪽 사이에서만 끊기는데, 이 한계는 hwp.js:67 에 적혀 있다. |
| 지적15 | 해결 | `node tests/zzoom/run-rules.js` 에뮬레이터 63/63, `RT_RULES=1` fail 0. |
| R1 다음 라운드 1(업로드 허가 개수) | 미해결 | M2 로 올린다. |
| R1 다음 라운드 2(업로드 출입증 role) | 해결 | 출입증 role 은 실제 role(`g.role`, 코드 회수와 관리자 만료가 반영된 값)이다(routes.js:560). storage.rules 업로드 블록은 role 을 보지 않고 up claim 과 uploadId 만 본다(61-64, 79-82). 참석자 출입증은 viewer 라서 people 을 읽지 못한다(firestore.rules people 은 zzHost). |

## 표 2. 새 지적

| 번호 | 심각도 | 파일:줄 | 문제 | 실패 시나리오(입력 → 잘못된 결과) | 고칠 방향 |
|---|---|---|---|---|---|
| M1 | 중요 | purge.js:94, routes.js:577-580·644-661 | 정리 작업은 안건 `a<uploadId>` 가 있는지만 보고 업로드 파일을 지킨다. AGENDA_OPEN 의 「기존 안건에 자료 붙이기·바꾸기」 경로는 안건 id 가 `permit.aid` 라서 이 확인에 걸리지 않는다. 지적03 이 **이 경로에서 다시 생겼다**. | 제목만 있는 안건에 자료 2쪽을 붙인다. commit 은 201 인데 뒤따르는 장부 정리(`hdel`)가 실패한다(Redis 순간 장애, 또는 함수가 transaction 과 cleanup 사이에 끊김). 그러면 24시간 뒤 cron 이 `uploads:1, uploadsKept:0` 으로 **파일 4개를 모두 지운다**. 안건 문서는 여전히 그 `base` 와 `pages:2` 를 가리켜 자료가 깨진다(재현 [A]). 같은 조건에서 새 안건 경로는 `uploadsKept:1` 로 파일을 지킨다([A2]). api 시험은 새 안건 경로만 본다(api.test.js:820). | 장부 값에 붙일 안건 id 를 같이 적거나(`<mid>/<uploadId>` → `{at, aid}`), cron 이 `K.up` 허가의 aid 를 읽는다. 그다음 그 안건의 `base === zzoom/<mid>/up/<uploadId>` 인지로 지킬지 정한다. 붙이기 경로에 hdel 실패 시험을 더한다. |
| M2 | 중요 | routes.js:529-569(특히 543-546), storage.rules:61-82 | 아직 commit 하지 않은 업로드 허가 개수에 상한이 없다. 참석자는 자기 안건 aid 로 허가를 받으면 1인 10개 상한(ownedCount)을 거치지 않고, 분당 10개 속도 한도만 받는다. 주관자는 속도 한도도 없다(일반 8/s 만). 허가 하나로 1시간 동안 약 950MiB(쪽 200×4MiB, 썸네일 200×512KiB, 원본 50MiB)를 쓸 수 있다. 회의 만들기가 열려 있어 어느 교직원이나 자기 회의의 주관자가 될 수 있다([B2] 201). | 참석자가 6초 간격으로 60번 요청하면 **60/60 허가**(시간당 600개, 이론상 약 570GB)를 받는다. 주관자는 0.15초 간격 60번에 **60/60** 이다(재현 [B]). 남은 파일은 하루 한 번, 50초 예산의 cron 만 지우므로 쌓이는 속도를 따라가지 못한다. 실제로 쓸 수 있는 양은 공격자의 회선 속도가 묶는다. | 사람별·회의별로 「열려 있는(commit 안 된) 허가」 수 상한을 둔다(예: 사람 3, 회의 20). 허가를 낼 때 1인 10개 상한 계산에 열린 허가를 포함하고, 주관자에게도 시간당 상한을 둔다. 쓰다 만 허가는 commit 이 없으면 1시간 뒤 정리 대상으로 앞당긴다. |
| M3 | 사소 | routes.js:1083-1088 | 받아쓰기는 `m.recording` 을 보지 않는다. 녹음 자동 끄기(heartbeat 967-975, 끝내기 446)는 표시만 내리고, 서버는 계속 받는다. | 녹음 표시가 꺼진(recording=false) live 회의에서 주관자가 조각을 보내면 **201** 이 나와 녹취가 저장된다(재현 [C]). 정상 화면은 표시가 꺼지면 멈추지만(record.js:255), 고친 화면은 참석자가 「녹음 안 함」으로 보는 동안에도 받아쓸 수 있다. 주관자만 할 수 있고, 녹취는 참석자가 읽을 수 있는 컬렉션에 남는다. | 유예 조각이 아니면 `m.recording && m.recordingBy === g.cid` 일 때만 받는다. 꺼진 뒤 도착한 조각은 at 이 꺼진 시각보다 앞일 때만 받는다. |
| M4 | 사소 | routes.js:160-169 | N9 의 남은 부분이다. 관리자 host 는 세션 만료 시각까지만 쓸 수 있지만, 로그아웃해서 세션이 지워진 경우는 pt() 가 알아채지 못한다. | 공용 PC 에서 관리자가 로그아웃한 뒤 남은 탭의 pt 로 주관 동작과 업로드 허가가 된다. 최대 12시간이다(재현 [D]). | `g.via==='admin'` 인 host 동작에서는 `validateSession(X-Auth-Token)` 을 다시 보고, 해시가 `g.sess` 와 같은지도 확인한다(refresh 407-415 와 같은 방식). |
| M5 | 사소 | routes.js:130-134·284-285 | (1) 만든 사람 확인이 세션 토큰 해시에 기댄다. 쭘 화면은 `X-Device-Id` 를 보내지 않는다(public/zzoom/api.js:38-43). 그래서 만든 사람이 다시 로그인하면 자기 회의를 고치거나 지울 수 없다. (2) 「살아 있는 회의 100개」 상한이 관리자에게도 걸린다. | (1) 회의를 만든 교사가 다음 날 다시 로그인하면 `manager_only` 403 이 나온다. (2) 교직원 여럿(또는 세션 여럿)이 100개를 채우면 관리자도 새 회의를 못 만들고, 지워야만 풀린다. | (1) 백암이 계정 식별자(세션 안의 사용자 id)의 해시로 만든 사람을 적는다. (2) 관리자는 상한에서 빼거나 만든 사람별 상한(예: 10개)으로 바꾼다. |
| M6 | 사소 | routes.js:124·177, keys.js:38-50 | 사람 구분은 「로그인 세션」 단위다. 다른 브라우저에서 다시 로그인하면 새 사람이 되어 1표를 더 낼 수 있다. 안건 `ownerHash` 는 같은 세션이면 회의가 달라도 같은 값이라서, 참석자끼리 「두 회의의 안건을 같은 사람이 올렸다」는 것을 이을 수 있다(익명성). | 같은 교사가 로그인 두 번 → 두 표. 회의 A·B 의 agenda 문서에서 ownerHash 가 같은 안건을 찾을 수 있다. | 화면과 설계서에 「1인 1표는 로그인 세션 기준」이라고 적는다. ownerHash 에 회의 id 를 섞는다(`own:<mid>:<person>`). |
| M7 | 사소 | routes.js:176·587 | 주석이 옛 설명(「기기·세션+이름」)이다. 지금은 세션 해시만 쓴다. | 다음 수정자가 이름이나 기기 id 를 다시 열쇠로 넣을 수 있다. | 주석을 고친다. |

## 규칙 대조(storage.rules·firestore.rules)

- **storage.rules 업로드 블록**(61-82): Rules 시험 API(게시 없음)로 **25/25 기대대로** 나왔다(`rules-storage3.js null`). 결과는 다음과 같다.
  - 참석자 up 출입증은 자기 uploadId 의 쪽 그림·썸네일·원본을 쓸 수 있다(ALLOW).
  - 다음은 모두 DENY 다: 남의 uploadId, 다른 회의, 허가보다 많은 쪽(p003), p000, 4MiB·512KiB 초과, 원본 크기 다름, 다른 확장자, text/html 원본, png 형식 쪽, 덮어쓰기(update), 지우기, 목록, until 지남, until 없음, up 없는 회의 출입증, 하위 폴더, 회의 폴더 바로 아래, ba 출입증.
  - 같은 회의 출입증은 다른 업로드 폴더의 파일 하나를 읽을 수 있다(get ALLOW, R1 과 같음).
- `resource == null`(81): 시험 API 는 기존 객체를 `resource: null` 로 명시해야 판정한다(빼면 「Null value error」 로 ALLOW 4건이 실패한다). 기존 객체를 넣으면 create 는 DENY 다. 실엔진에서 새 파일의 `resource` 는 null 이므로 문제는 아니다. 에뮬레이터 시험(63/63)도 업로드 ALLOW 를 통과한다.
- **firestore.rules 쭘 블록**은 HEAD 와 같다(git diff 없음). R1 스크립트를 다시 돌려 **15/15 통과**. name 검사는 없다. people 은 zzHost 만 읽는다.
- 서버 쓰기 경로와 맞춰 봤다. 출입증의 `until` 은 다음 가운데 가장 이른 값이다: 회의 만료, 지금+1h, 관리자 세션 만료(routes.js:195), pt 만료(554). 쪽과 썸네일 이름 규칙(562)은 upPage 정규식(66)과 같다. 원본 이름 `original.<ext>` 는 upOriginal(73)과 같다.

## 익명화(ANON) 확인

- 서버 응답과 저장 문서에 name 필드가 없다. join 은 body.name 을 버린다(routes.js:341). 다음 문서도 name 을 싣지 않는다: people(361·397·967), chat(914), hands(946), strokes(853), polls(1006·1061 names:null), agenda(673·698·791), presenter(442·490), md 내보내기(export-md.js:31·36).
- R1 이전에 만든 문서에 남은 name 은 /refresh 의 `{...cur, role}`(418)이 그대로 둔다. 운영에 옛 회의가 없다면 영향은 없다(사소, 확인 필요).
- Redis pt 기록에도 이름이 없다(202). 투표 장부의 `@이름` 필드는 더 이상 쓰지 않는다. `readVoteHash` 의 names 읽기(keys.js:147)는 쓰이지 않는 옛 코드다.

## AGENDA_OPEN 권한 확인(코드와 재현)

- 안건 추가, 자료 올리기, 발표하기는 ended 와 deleting 에서 모두 409 또는 410 이다(ALLOW.ended 는 빈 집합, routes.js:35). 재현 [G]: 끝난 회의에서 안건 추가·업로드·발표하기·안건 지우기·제목 고치기가 모두 **409** 다.
- 남의 안건 제목 고치기·지우기·자료 바꾸기는 editOnly(180)를 거친다. 트랜잭션 안에서 다시 확인한다(654·726·749). 순서 바꾸기는 주관자만 한다(725).
- 회의 30개·사람 10개 상한은 트랜잭션 안에서 확인한다(680-681·700-701). 단 업로드 허가는 이 상한 밖이다(M2).
- 발표하기: 참석자는 live 일 때만, 사람(세션)당 10초에 1번이다(469-472). 주관자는 제한이 없다. 재현 [E]: 같은 세션이 다시 들어와 누르면 429.

## 실행한 명령과 결과

| 명령 | 결과 |
|---|---|
| `npm.cmd run test:zzoom` | tests 81, pass 81, fail 0, skipped 0 |
| `npm.cmd test` | unit tests 313, pass 313, fail 0 / contracts tests 11, pass 11, fail 0 |
| `node --test tests/zzoom/redteam.test.js` | tests 17, pass 9, fail 0, skipped 2, todo 6 |
| `RT_RULES=1 node --test tests/zzoom/redteam.test.js` | tests 17, pass 11, fail 0, skipped 0, todo 6 |
| `LOAD_STRICT=1 node --test tests/zzoom/load.test.js` | tests 2, pass 2, fail 0 |
| `node tests/zzoom/run-rules.js`(에뮬레이터) | tests 63, pass 63, fail 0 |
| Rules 시험 API storage.rules 업로드 블록(`%TEMP%\zzaudit2\rules-storage3.js null`) | 25/25 기대대로 |
| Rules 시험 API firestore.rules(`%TEMP%\zzaudit\rules-fs.js`, R1 스크립트) | 15/15 통과 |
| `node %TEMP%\zzaudit2\repro2.js <저장소>`(가짜 fb·Redis + 실제 createRouter) | 아래 [A]~[G] |

재현 결과(repro2.js):
- [A] 붙이기 commit 201, 장부 hdel 실패, 25시간 뒤 runPurge → `uploads:1, uploadsKept:0`, 파일 4개에서 0개로 줄었다. 안건 문서는 base 와 pages:2 를 그대로 가리킨다(M1).
- [A2] 새 안건 경로, 같은 조건 → `uploadsKept:1`, 파일 2개가 남는다(대조군).
- [B] 참석자 허가 60/60(6분), 주관자 허가 60/60(9초). [B2] 일반 교직원 회의 만들기 201(M2).
- [C] recording=false 상태 live 회의에서 transcribe 201(M3).
- [D] 관리자 세션 삭제 뒤 penLock 200, 업로드 허가 201, refresh 는 role viewer(M4).
- [E] 발표하기 200, 다시 들어와 10초 안에 또 누르면 429 rate_limited.
- [F] 같은 세션이 기기 id 를 바꿔 4번 투표 → 1표만 인정(N1 해결).
- [G] 끝난 회의에서 안건 추가·업로드·발표하기·지우기·고치기가 모두 409.
