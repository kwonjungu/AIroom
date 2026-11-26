# 감사 R12 V1 — 서버와 api.js (2026-11-26)

담당: lib/zzoom/routes.js `POST /:mid/presenter` today 분기, tests/zzoom/api.test.js 새 시험이 정말 잡는지, public/zzoom/api.js `present(TODAY)` 와 `putBlob`(ab8da41).
대상: HEAD 9439b62, 바로 앞 ab8da41. 읽기 전용으로 했다(저장소 파일은 고치지 않았고 git status 도 깨끗하다). 운영 서버에는 요청을 보내지 않았다.
재현물: `<임시폴더>/r12/` (mut/mut.js 변이 시험, mut/mut-result.txt, repro-rate.txt, putblob-sim.mjs, putblob-sim.txt)

## 1. 한 일

1. `npm run test:zzoom` 를 돌렸다. 152개 모두 통과했고 문법 확인 24개에 오류 0이다.
2. 작업 폴더의 lib/zzoom, tests/zzoom 를 임시 폴더에 복사했다. 그런 다음 today 분기를 13가지로 일부러 망가뜨려 새 시험(`0번 오늘의 안건 발표…`)만 돌렸다(변이 시험).
3. 같은 복사본에 재현 시험을 하나 더 붙여 0번 다음의 흐름을 서버에서 확인했다. 확인한 흐름은 0번에서 안건 발표로 가기, `/live` 로 0번에서 안건으로 가기, 0번 상태에서 발표 마치기다.
4. api.js 의 `putBlob` 원문을 그대로 떼어 가짜 업로드 작업(task)으로 6가지 경우를 돌려 보았다. 경우마다 타이머가 남는지도 함께 보았다.

## 2. 서버 today 분기 (routes.js 550~590)

| 항목 | 확인 결과 |
|---|---|
| 권한 | 참석자 누구나 쓸 수 있다. 주관자가 아니면 트랜잭션 앞(555~557)과 안(569)에서 `live` 인지 본다. 주관자는 572줄 `if (today) check(m.status === 'live')` 로 막힌다. 시작 전에는 참석자와 주관자 모두 409 `state_ready`, 끝난 뒤에는 409 `state_ended` 이고, 실패하면 아무것도 바뀌지 않는다. |
| aid 무시 | 560줄 `today \|\| …` 때문에 aid 를 같이 보내도 안건을 읽지 않는다. 자료 없는 안건(`pages:0`)과 함께 보내도 `agenda_empty` 로 떨어지지 않는다. |
| rev·forceSeq·epoch | `epoch = max(presenter.epoch, live.epoch)+1` 이 발표자와 live 에 같이 들어간다. rev+1, forceSeq+1, page 1, view 가운데로 둔다. 옛 발표자의 `/live` 는 409 `not_presenter` 다. |
| 속도 제한 | 일반 발표하기와 같은 `tk` 칸(사람당 10초 1번)을 같이 쓴다. 주관자는 이 칸 밖이다. 계약(CONTRACTS 2-3 121줄)과 같다. |
| 「발표 가져오기」 | 본문 `{}` 이면 `{...m.live, epoch}` 만 바뀐다. aid null 과 forceSeq 는 그대로 두므로 결정 사항과 맞다. |
| `today:'yes'` 같은 참이 아닌 값 | 평소 가져오기 길로 간다(`=== true`). |
| 판서 epoch | 영향 없다. 판서는 `pages/{pageKey}.epoch`(쪽 지우기 때만 오름)와 `penLock` 만 보고, 발표자 epoch 는 보지 않는다(routes.js 960~970, 1041~1050). |
| `full`(전체 화면) | today 의 patch 에는 `full` 이 없어서 0번으로 가면 전체 화면이 풀린다. 안건 발표(aid) 길도 같으니 일관된 동작이다. |
| 0번에서 안건으로 | 0번 발표자는 epoch 가 그대로이므로 `/live`(aid, force) 로 곧바로 안건에 갈 수 있다(재현 200). 발표 마치기도 0번 상태에서 200 이고 epoch, rev, forceSeq 가 오른다. |

## 3. 새 시험이 정말 잡는가 (변이 시험)

| 변이 | 결과 |
|---|---|
| M1 today 의 live 확인 줄을 지움(주관자가 시작 전에 0번) | 잡힘 |
| M2 forceSeq 를 안 올림 | 잡힘 |
| M3 `today === true` 를 참 같은 값 아무거나로 바꿈 | 잡힘 |
| M4 live.aid 를 지우지 않고 남김 | 잡힘 |
| M5 aid 를 무시하지 않음 | 잡힘 |
| M6 rev 를 안 올림 | 잡힘 |
| M7 live.epoch 를 옛 값으로 둠 | 잡힘 |
| M8 today 에서 참석자 속도 제한을 뺌 | 잡힘 |
| M9 view 를 가운데로 돌리지 않음 | **놓침** |
| M10 page 를 1로 돌리지 않음 | **놓침** |
| M11 today 분기를 통째로 끔 | 잡힘 |
| M12 발표자를 부른 사람으로 바꾸지 않음 | 잡힘 |
| M13 주관자만 시작 전 0번을 허용 | 잡힘 |

13개 가운데 11개를 잡았다. 놓친 두 개는 시험이 회의 시작 바로 뒤(page 1, view 가운데)에서 0번을 부르기 때문이다. 이 상태에서는 초기화를 하든 안 하든 값이 같아 시험이 차이를 볼 수 없다. 아래 L1 에 적었다.

## 4. api.js

### present(TODAY) (api.js 672~682)
`aid === TODAY` 이면 본문이 `{today:true}` 가 되고 page 는 무시한다. 응답의 presenter 와 live 를 store 에 먼저 넣고 `acceptLive` 를 거친다. epoch 가 오르므로 옛 live 는 받지 않는다. agenda.js 는 `api.TODAY || TODAY` 로 같은 값 `'_today'` 를 보낸다. 실제 aid 는 밑줄로 시작하지 않으므로 겹치지 않는다. 가짜 API(agenda_fake_api.js)도 서버와 같은 모양으로 바뀌었다. 문제는 찾지 못했다.

### putBlob (ab8da41, api.js 512~525)
가짜 작업으로 돌린 결과(멈춤 기준을 300ms 로 줄여서 돌림)는 아래와 같다. 여섯 경우 모두 끝난 뒤 남은 타이머는 0이다.

| 경우 | 결과 |
|---|---|
| A 정상 | 성공 |
| B 진행이 멈춤 | `stalled` 로 실패, `cancel` 1번 |
| C 천천히 진행(멈춤 기준 안에서 계속 진행) | 끊지 않고 성공 |
| D 올리는 중 취소 | 바로 `aborted`, `cancel` 1번 |
| E 시작 전에 이미 취소됨 | 바로 `aborted` |
| F SDK 오류 | 그 오류 코드로 실패 |

- `cancel()` 뒤에 SDK 가 늦게 내는 `storage/canceled` 오류는 `done` 표시 때문에 무시된다. 그래서 두 번 끝나지 않는다.
- 부르는 쪽(put, 559~564줄과 714~719줄)은 `aborted` 이면 다시 하지 않고 곧장 던지고, 그 밖의 오류는 3번까지 다시 한다. 바깥 catch 가 허가 자리를 돌려준다.
- SDK 안의 다시 하기는 20초(`maxUploadRetryTime`)이고 우리 멈춤 기준은 25초라 SDK 오류가 먼저 온다. 두 기준이 서로 맞다.

## 5. 문제

### 치명·높음
없음.

### 보통
없음.

### 낮음

**L1. 새 시험이 page·view 초기화를 보지 못한다** — tests/zzoom/api.test.js 1715~1762
- 재현: 변이 M9(view 를 남김)과 M10(page 를 남김)이 시험을 통과한다(mut-result.txt).
- 고칠 방향: 0번을 부르기 전에 발표자가 `/live` 로 2쪽 넘김과 view `{cx:.2, cy:.3, z:2}` 를 보내게 한다(`h.board(mid, A, 2)` 로 2쪽짜리 판서를 만들면 된다). 그 뒤 0번 결과가 page 1, view 가운데인지 본다.

**L2. 참석자가 0번을 발표하고 10초 안에 안건 「발표하기」를 누르면 429가 난다** — routes.js 557(`tk` 칸 같이 씀), agenda.js 277
- 재현: repro-rate.txt 에 있다. 참석자가 `today:true` 로 200을 받은 바로 뒤 `{aid}` 를 보내면 429 `rate_limited` 다. 화면은 「요청이 너무 잦습니다…」 경고만 띄우고, 몇 초 뒤 다시 누르면 된다. 안건에서 안건으로 넘어갈 때도 원래 같은 제한이 있었으니 계약대로의 동작이다. 다만 「0번으로 모으고 곧바로 1번 발표」는 자주 나올 흐름이다.
- 고칠 방향(선택): ① agenda.js 에서 내가 이미 발표자이면 `present` 대신 `sendLive(aid, page 1, force)` 로 옮긴다. 서버 `/live` 는 0번 발표자도 받는다(재현 200). ② 또는 서버가 지금 발표자 본인의 재호출은 `tk` 칸에서 뺀다.

**L3. 실패한 그림 하나가 있어도 나머지 일꾼이 계속 올린다** — api.js 567~568(uploadOne), 같은 꼴 uploadToAgenda
- 내용: 일꾼 하나가 `upload_failed` 로 던지면 `Promise.all` 은 바로 실패한다. 그런데 나머지 두 일꾼은 남은 job 을 계속 가져가 올린다. 그러는 동안 finally 는 보통 토큰으로 되돌리고 다음 업로드도 시작될 수 있다. 그 일꾼들의 올리기는 Storage 규칙에 막혀 실패할 뿐이라 데이터는 깨지지 않는다. 대신 대역폭이 들고 콘솔이 지저분해지며, 그 동안 putBlob 타이머가 최대 25초 남는다. ab8da41 전부터 있던 구조다.
- 재현: 코드 읽기로만 확인했다(브라우저에서는 확인 못 함).
- 고칠 방향: 실패하면 공유 AbortController 를 끊거나 `next = jobs.length` 로 막아 나머지 일꾼을 멈춘다.

**L4. 멈춤으로 끊은 순간에 서버 쪽 저장이 이미 끝났다면 다시 하기가 거절될 수 있다** — api.js 518, Storage 규칙(같은 경로 덮어쓰기 거절)
- 내용: 마지막 조각의 응답만 늦는 드문 경우를 말한다. 저장은 끝났는데 응답이 늦어 끊고 다시 하면 `resource == null` 규칙에 걸려 3번 모두 실패하고 `upload_failed` 가 난다. 사용자는 처음부터 다시 올리면 된다. 예전 `uploadBytes` 에도 있던 위험이다.
- 재현: 확인 못 함(SDK 와 규칙 동작을 바탕으로 한 추론).
- 고칠 방향: 다시 하기 전에 `getMetadata` 로 이미 있는지 보고, 크기가 같으면 성공으로 친다.

**L5. 멈춤 감지는 SDK 진행 알림을 믿는다** — api.js 523
- 내용: 큰 원본(최대 50MB)은 조각이 커진다. 조각 안에서도 진행 알림이 오면 문제가 없다. 이 동작은 Firebase SDK 를 CDN 에서 불러오기 때문에 이 PC 에서 확인하지 못했다. 알림이 조각이 끝날 때만 온다면 느린 망에서 정상 업로드를 25초마다 끊을 수 있다.
- 재현: 확인 못 함.
- 고칠 방향: 학교 와이파이처럼 느린 망에서 원본 큰 파일(20MB 이상)로 한 번 올려 보아 `state_changed` 간격을 기록한다.

## 6. 계약과 맞는가
CONTRACTS.md 2-3 121줄(`present(mid, TODAY)`)의 몸체, 응답, 409/429 조건, 「0번 발표자는 /live 를 보내지 않는다」는 서버 동작과 맞는다. P5_APP.md 설계 1·2항(서버, api.js)도 그대로 들어갔다.

결론: PASS(치명·높음 0)
