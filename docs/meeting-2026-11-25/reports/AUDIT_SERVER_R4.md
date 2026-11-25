판정: **FAIL** — 치명 0, 중요 1(Q1, R3 P3 수정이 만든 회귀). R3 지적 P1~P6 가운데 해결 5, 부분 1(P3).

# 감사 라운드 4 — 영역 ① 서버·규칙 (2026-11-26)

범위는 `lib/zzoom/*`, server.js 쭘 줄(210·226-236·312-318·2399-2404), `firestore.rules`(166-193)·`storage.rules`(36-86) 쭘 블록, `public/zzoom/convert/*`, CONTRACTS.md 다. public/zzoom 화면은 범위 밖이다. 다만 서버 계약을 화면이 쓰는지는 api.js 를 grep 으로만 봤다.
기준은 브랜치 feat/meeting 의 커밋 전 작업 트리(2026-11-26)이고, 줄 번호도 이 트리 기준이다. FIX_ENGINE.md R3 절은 참고만 했다. 판정은 코드와 직접 실행으로만 했다.
코드 수정, 커밋, 배포, 규칙 게시는 하지 않았다. 재현 스크립트는 저장소 밖 `%TEMP%\zzaudit4\repro4.js` 에 있다(출력은 repro4.out). R3 재현은 `%TEMP%\zzaudit3\repro3.js` 로 다시 돌렸다(repro3-rerun.out).

## 표 1. R3 지적 재검증

| 번호 | 판정 | 근거 |
|---|---|---|
| P1 녹음 마지막 조각 409 | 해결(사소 Q3·Q4 남음) | `recordingOn`(routes.js:1150-1158)은 끈 사람(`recordingOffBy`)이 90초 안에 보낸 조각을 'tail' 로 받는다. 처리 중에 꺼진 경우는 since 를 비교해 'on' 으로 본다. `tailCheck`(1174-1178)는 덮어쓰기와 건너뛴 번호를 막고, 끌 때마다 3개까지만 받는다. 끄는 경로 세 곳(state recording, end 449, `recordingOffIf` 1027-1032)이 모두 offAt·offBy 를 남긴다. repro3 다시 돌린 결과 [R1] 201, [R2] 201(저장됨)이다. repro4 결과: T1 꼬리 3개 201, 4번째 429. T2 91초 뒤 409. T5 이미 받은 번호 409 transcript_exists, 건너뛴 번호 409. |
| P2 입장 직후 채팅 1/30 | 해결 | 입장 1분 묶음 대신 회의 물통을 쓴다(`LUA.bucket` keys.js:94-103, routes.js:981). repro3 [C] 는 같은 순간, 0.2초 간격, 1초 간격, 10초 분산 모두 **30/30** 이다. repro4 C1(봇 40개가 초마다 동시에): 초별 201 이 30, 15, 15 … 다. C2 사람당 1초 1글(201, 429, 201). 물통 열쇠는 purge.js:48 에서 지운다. |
| P3 업로드 허가 자리 서비스 거부 | 부분(새 회귀 Q1, 남은 Q2) | 취소 경로(routes.js:630-640)가 생겼다. repro4 U1: 남 403 not_yours, 다른 주관자 403, 본인 200, 두 번째 404, 장부 남음, 취소 뒤 commit 404. U2: 허가 3개 뒤 429, 하나 취소하면 201. 주관자는 회의 칸 밖이다(keys.js:105-124, U5 주관자 201). 수명은 15분이다(routes.js:19). 그러나 ① 취소가 동시 허가 상한을 없앴다(Q1). ② 참석자 거부는 15분마다 다시 채워 계속할 수 있다(Q2). ③ 화면 api.js 는 아직 DELETE 를 부르지 않는다(api.js:360-370 에 함수가 없고, 451·585 는 startUpload 만 한다). 그래서 실패 3번이면 15분 막히는 일이 지금 화면에서는 그대로다(repro3 [U4] 201, 201, 201, 429, 범위 밖이라 확인 필요). |
| P4 기기 id 로 만든 사람 인정 | 해결 | `ownerKeys`(routes.js:130-133)는 세션 토큰 해시만 본다. repro3 [D]: 같은 기기로 다시 로그인하면 403, 다른 세션과 같은 기기 id 로 코드 바꾸기·삭제를 하면 403, 목록에 mine false. repro4 K2: X-Device-Id 에 creator 해시를 넣어도 viewer 다. |
| P5 정리 순서 | 해결 | commit `cleanup`(routes.js:647-650)은 upOpen 을 먼저 hdel 한다. |
| P6 옛 주석과 상수 | 해결 | storage.rules:49 주석을 고쳤다. `LIMIT`(routes.js:23-33)에 pageBytes 와 thumbBytes 가 없다(624 의 응답 limits 는 pageCaps 값이다). |

## 새 기능 검증

| 기능 | 판정 | 근거(repro4) |
|---|---|---|
| `POST /:mid/presenter/end` | 맞음 | [E] 시작 전 409 state_ready. 남 403 not_presenter. 본인 200: presenter `{cid:null, epoch:3}`, live.aid null, rev 1→2, epoch 2→3, forceSeq 0→1. 2초 안 연속 429. 옛 발표자 /live 409 not_presenter. 발표자가 없을 때 주관자 200 changed:false. 남이 발표 중일 때 주관자 200 true. 코드가 바뀌어 강등된 주관자 403. 끝난 회의 409 state_ended(routes.js:534-553). |
| 만든 사람 바로 주관 | 맞음(사소 Q6) | [K] 같은 세션으로 입장하면 host. 다른 세션이 같은 기기 id 로 오면 viewer. 세션이 없으면 401. 로그아웃 뒤 주관 동작 403 host_revoked, refresh 는 viewer, 코드 없이 /host 하면 403 wrong_code(pt() 189-193, refresh 415-419). |
| `DELETE /:mid/uploads/:uploadId` | 본인 확인은 맞음, 부작용 Q1 | 위 P3 줄과 같다. |
| 허가·업로드 토큰 15분 | 맞음 | `upUntil`(routes.js:613)과 Lua 수명이 같다. [U5] 15분 뒤 칸이 풀린다. |
| 주관자 회의 상한 제외 | 맞음 | `'|h'` 표시(keys.js:113·120). [U5] 봇 20칸이어도 주관자 201. |
| 채팅 사람 1/s, 회의 15/s, 버스트 30 | 맞음(사소 Q5) | C1과 C2. 레드팀 채팅 도배 시험도 통과한다. |
| 녹음 끈 뒤 90초, 꼬리 3개 | 맞음(사소 Q3·Q4) | T1·T2·T5. |

## 표 2. 새 지적

| 번호 | 심각도 | 파일:줄 | 문제 | 실패 시나리오(입력 → 잘못된 결과) | 고칠 방향 |
|---|---|---|---|---|---|
| Q1 | 중요 | routes.js:599·607·630-640, keys.js:105-124 | 취소하면 upOpen 자리를 곧바로 돌려준다. 그런데 그 허가의 업로드 출입증은 15분 동안 살아 있다. 규칙은 Redis 를 볼 수 없다. 그래서 「사람 3개, 회의 20개」 상한이 **동시에 살아 있는 출입증 수**를 더는 묶지 못한다. 출입증 하나로 원본 50MiB 미만과 쪽·썸네일 220MiB, 모두 약 270MiB 를 쓸 수 있다. 주관자는 허가 속도 한도(599)도 받지 않는다. 회의를 만든 사람은 누구나 주관자가 된다(381). 그래서 공용 코드로 로그인한 교직원 누구나 상한 없이 출입증을 받을 수 있다. R2 M2 가 세운 바이트 상한이 사실상 사라졌다. | [U3] 주관자가 허가와 취소를 120번 되풀이했다(31초) → 살아 있는 출입증 **120개**, 쓸 수 있는 양 **약 31.6GiB**. 일반 한도(초당 8)만 걸리므로 15분이면 3천 개가 넘는다. [U4] 참석자 1명이 분당 10번 한도 안에서 15분 동안 되풀이했다 → 출입증 **120개(약 31.6GiB)** 가 동시에 살아 있다. R3 설계에서는 동시 3개, 약 0.8GiB 였다. 세션을 여러 개 만들면 그만큼 곱해진다. 지운 파일은 24시간 뒤 cron 이 지운다. | 취소해도 「발급 수」 몫은 출입증 수명(15분) 동안 남긴다. 예를 들어 upOpen 과 따로 사람당 15분에 6개, 회의당 15분에 40개처럼 발급 창을 둔다. 주관자에게도 허가 속도 한도를 건다. 아니면 Storage 규칙이 `firestore.exists()` 로 서버가 쓴 허가 문서를 보게 하고, 취소 때 그 문서를 지워 출입증을 실제로 끊는다. 「허가와 취소를 되풀이한 출입증 수」 레드팀 시험을 더한다. |
| Q2 | 사소 | keys.js:105-124, routes.js:607 | 주관자는 빠졌다. 하지만 세션 7개로 회의 20칸을 채우고, 15분이 지나 풀릴 때마다 다시 채우면 참석자 업로드는 계속 막힌다. | [U5] 0, 15, 30, 45분 모두 봇 20칸, 참석자 **429**, 주관자 201. | 회의 칸을 사람 수에 비례하게 하거나, 한 사람(세션)당 15분 발급 수를 묶는다(Q1 과 함께). |
| Q3 | 사소 | routes.js:1174-1178·1199·1204-1210 | 꼬리 개수(3개)는 Groq 를 부르기 **전에** 센다. Groq 429 나 502 로 같은 조각을 다시 보내도 한 개로 센다. | [T3] 끈 뒤 n3 가 groq_busy 429 를 두 번 받고 세 번째에 201 → 이어지는 n4 는 **429 rate_limited**(마지막 조각을 잃음). | 저장이 성공한 뒤에 세거나(트랜잭션 뒤 incr), 조각 번호별로 한 번만 센다(SET NX `tail:<offAt>:<n>`). |
| Q4 | 사소 | routes.js:1150-1158 | 꼬리 조각은 at(조각 시작 시각)을 보지 않는다. R2 M3 와 R3 P1 이 권한 「at < 꺼진 시각」 조건이 빠졌다. | [T4] 끈 뒤 30초, 60초, 89초에 시작한 조각(at > offAt) 3개가 모두 **201** 이다. 참석자는 녹음이 꺼졌다고 보는데 끈 뒤 소리가 녹취로 남는다(주관자만 할 수 있다). | tail 에서 `at0 !== null && at0 < m.recordingOffAt` 을 요구한다. 화면은 조각의 시작 시각을 이미 보낸다. |
| Q5 | 사소 | routes.js:981 | 주관자도 회의 물통을 같이 쓴다. 공용 코드로 만든 봇이 퍼부으면 주관자 공지도 막힌다. | [C1] 봇 40개가 초마다 보내고 주관자가 그 뒤에 보내면 10초 동안 **0/10**. 순서가 섞이면 대략 15/41 이다. | 주관자는 물통을 건너뛰거나 따로 몇 칸을 남긴다. |
| Q6 | 사소 | routes.js:214-216·381-382 | 관리자 host 토큰은 세션 만료로 until 을 자른다(N9). 만든 사람 host 토큰은 자르지 않는다. 같은 패턴의 다른 경로다. | [K] 만든 사람 토큰 role host, until 은 입장 뒤 60분이다. 로그아웃해도 그 토큰으로 `people` 읽기(firestore.rules:188-190, host claim)를 최대 1시간 할 수 있다. 서버 주관 동작은 곧바로 403 이다. | 만든 사람 host 도 세션 만료(있으면)로 until 을 자른다. 코드 host 와 같은 1시간 허용으로 받아들인다면 DECISIONS 에 적는다. |
| Q7 | 사소(R3 남음) | routes.js:1152 | 주관자가 새로 고침해 cid 가 바뀌면, 녹음 표시는 켜져 있는데 새 cid 조각이 거절된다. | repro3 [R3] 새 cid 조각 **409 recording_not_on**. | 같은 사람 열쇠(person)면 recordingBy 를 넘겨받게 하거나, 화면이 다시 켜게 안내한다. |

## 규칙 대조

- storage.rules 쭘 블록은 R3 뒤 주석 한 줄만 바뀌었다(49). Rules 시험 API(게시 없음, `%TEMP%\zzaudit3\rules-storage-r3.js`)로 **34/34** 기대대로 나왔다. upPageMax·upThumbMax 경계, 원본 50MiB, p201, 덮어쓰기와 지우기 금지가 들어 있다.
- firestore.rules 쭘 블록은 HEAD 와 같다. Rules 시험 API(`%TEMP%\zzaudit\rules-fs.js`)로 **15/15** 통과했다.
- 규칙은 Redis 허가 취소를 알 수 없다(Q1 의 뿌리). 출입증을 끊는 곳은 claim until 하나뿐이다.
- 한도 일치: 서버 contract.js 와 변환기 contract.js 의 SOURCES·MAX_ORIGINAL_BYTES·pageCaps 가 글자 그대로 같다(export, freeze 만 다르다). core.js:6·8·251 도 같다.
- 에뮬레이터 `node tests/zzoom/run-rules.js` 는 64/64 다.

## 실행한 명령과 결과(모두 timeout 600초)

| 명령 | 결과 |
|---|---|
| `npm.cmd run test:zzoom` | tests 106, pass 106, fail 0 |
| `npm.cmd test` | 313/313, 11/11 |
| `RT_RULES=1 node --test tests/zzoom/redteam.test.js` | tests 16, pass 11, fail 0, todo 5 |
| `LOAD_STRICT=1 node --test tests/zzoom/load.test.js` | tests 2, pass 2 |
| `node tests/zzoom/run-rules.js` | tests 64, pass 64 |
| Rules 시험 API storage / firestore | 34/34, 15/15 |
| `node %TEMP%\zzaudit3\repro3.js <저장소>` | R1 201, R2 201 저장, R3 409(Q7), C 모두 30/30, U4 201·201·201·429, U6 주관자 201·다른 교사 429, D 모두 403, M5 101/101, M6 다름 |
| `node %TEMP%\zzaudit4\repro4.js <저장소>` | 위 표의 [E]·[K]·[U1]~[U5]·[T1]~[T5]·[C1]·[C2] |

시험 수는 모두 통과다. 그런데 Q1 「허가와 취소를 되풀이해 살아 있는 출입증 쌓기」와 Q3·Q4 를 보는 시험은 없다. 띄운 서버는 모두 스크립트 안에서 닫았다. 남은 프로세스는 없다.
