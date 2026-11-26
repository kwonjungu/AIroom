# 감사 R13 V1 — 서버와 api.js (0번 「오늘의 안건」)

대상: ab8da41 다음부터 HEAD(eb20c85)까지. 읽기 전용으로 보았고 코드는 고치지 않았다. 운영 서버에는 요청을 보내지 않았다.
담당 범위는 lib/zzoom/routes.js POST /:mid/presenter today 분기, tests/zzoom/api.test.js today 시험, public/zzoom/api.js present(TODAY)·putBlob, agenda.js 의 「이미 0번 발표자면 present 대신 cmd:nav」 길과 서버 /live 규칙(epoch·baseRev·state)이 맞는지다.

## 돌려 본 것(모두 로컬)

| 무엇 | 결과 | 기록 |
|---|---|---|
| `npm run test:zzoom` | 152개 통과, 문법 확인 24개 오류 0 | `<임시폴더>/r12/v1_test_zzoom.txt` |
| 덧붙인 서버 시험(가짜 저장소): 0번 발표, 0번 발표자 /live(화면 sendLive 와 같은 몸통), 다음 쪽, 10초 안 0번 다시(429), 다른 사람 0번, 옛 발표자 /live, aid 없는 /live, 발표 마치기, 쪽 epoch 문서 | 1개 통과 | `<임시폴더>/r12/v1_today_extra.test.js`, `v1_today_extra.txt` |
| putBlob 흉내(api.js 의 함수 본문을 그대로 떼어 가짜 업로드 작업에 붙임): 성공, 오류, 멈춤, 느리지만 움직임, 취소, 미리 취소, cancel 이 오류 알림을 바로 부르는 경우 | 모두 기대대로 끝났고 남은 타이머 0 | `<임시폴더>/r12/v1_putblob_sim.mjs`, `v1_putblob_sim.txt` |

## 맞게 된 것

**서버 today 분기(routes.js 551~589행)**
- 권한: `allow(m,'presenter')` 를 앞과 트랜잭션 안에서 두 번 본다. 끝난 회의는 허용표에서 409다.
- 회의 상태: 참석자는 앞(555행)과 트랜잭션 안에서, 주관자는 570행의 today 전용 확인으로 live 가 아니면 409 `state_*` 를 받는다. 시작 전 주관자 today 가 409 인 것도 덧붙인 시험으로 확인했다.
- rev·forceSeq·epoch: epoch 는 `max(presenter.epoch, live.epoch)+1` 로 다른 길과 같고, `live = {aid:null, page:1, view 기본, rev+1, epoch, forceSeq+1}` 이다. 2쪽·확대 상태에서 시작해도 1쪽·기본 보기로 돌아오는 것은 기존 시험이 확인한다.
- `aid` 를 같이 보내도 무시하고, `today:'yes'` 처럼 참이 아닌 값은 평소 길로 간다(시험 있음).
- 속도 제한: 참석자는 「발표하기」 「발표 가져오기」와 같은 `take` 칸을 쓴다(사람당 10초 1번). 상태 확인이 제한보다 먼저라 시작 전 요청이 제한 칸을 먹지 않는다. 같은 요청을 다시 보낼 때 쓰는 머리글(X-Zzoom-Idem)이 있어서, 연결 문제로 다시 보낸 요청이 429 로 보이는 일은 없다.
- 판서: 판서는 쪽마다 따로 있는 epoch(`pages/{pageKey}.epoch`)만 보고 발표자 epoch 는 보지 않는다. 0번 발표가 쪽 epoch 문서를 만들거나 올리지 않는 것을 시험으로 확인했다. 0번 발표 뒤에는 `live.full` 이 빠져서 「모두 전체 화면」이 꺼진다. 안건 발표(present(aid))와 같은 동작이다.
- 「발표 가져오기」(본문 없음)는 `{...m.live, epoch}` 만 바꾸므로 0번 상태와 forceSeq 를 그대로 둔다. 결정된 대로이고 시험도 있다.

**api.js present(TODAY)(670~682행)**
- `TODAY='_today'` 이면 본문이 `{today:true}` 이다. 응답의 presenter·live 를 store 에 먼저 넣으므로, 회의 문서 스냅숏이 오기 전에 /live 를 보내도 새 epoch 와 rev 로 나간다. epoch 가 새로 바뀌었으니 `acceptLive` 의 「같은 epoch 에서 rev 가 낮으면 버림」 규칙에 걸리지 않는다.

**agenda.js 「이미 0번 발표자면 cmd:nav」(280~285행)와 서버 /live 규칙**
- cmd:nav 를 받으면 viewer 가 `setTarget` 과 `userChanged` 를 거쳐 `queueLive()` 를 부르고, `api.sendLive` 가 `baseRev = store live.rev`, `epoch = meeting.presenter.epoch` 로 보낸다. present(TODAY) 직후 store 에는 서버가 돌려준 `rev` 와 `epoch` 가 들어 있으므로 /live 의 세 가지 확인(presenter.cid 가 나, presenter.epoch 와 live.epoch 가 같은 값, rev 같음)을 모두 통과한다. 덧붙인 시험에서 200, `rev+1`, `epoch` 유지, forceSeq 그대로를 확인했다.
- 0번 상태(`live.aid` null)에서 /live 는 `same` 이 거짓이 되어 안건 문서를 읽고 쪽 수를 확인한다. 정상이다.
- 0번 동안 참석자 viewer 는 `S.live.aid` 가 없어 자유 보기(free)로 바뀌지 않는다(viewer.js 439·1094행). 그래서 force 없이 보낸 /live 로도 따라가는 사람은 모두 넘어온다. 「모두 같이 넘어간다」는 결정과 맞다.
- 다른 사람이 0번을 넘겨받으면 옛 발표자의 /live 는 409 `not_presenter` 를 받는다(시험 있음, 덧붙인 시험에서도 확인).

**putBlob(api.js 512~526행, ab8da41)**
- 끝나는 길 다섯 가지(완료, 오류, 멈춤, 취소, 미리 취소)에서 모두 `end` 를 한 번만 부르고, 타이머와 abort 듣기를 치운다(흉내에서 남은 타이머 0).
- 취소: 부르는 쪽이 `e.code==='aborted'` 면 바로 다시 던진다. SDK 의 `cancel()` 이 오류 알림을 바로 불러서 `storage/canceled` 가 먼저 오더라도, 다시 시도하는 고리 맨 위의 `signal.aborted` 확인이 `aborted` 로 끝낸다(흉내로 확인).
- 멈춤: 25초 동안 진행 알림이 없으면 끊고, 부르는 쪽이 3번까지 다시 한다. 느려도 진행 알림이 오면 끊지 않는다. SDK 가 속으로 다시 하는 시간(`maxUploadRetryTime` 20초)이 멈춤 기준(25초)보다 짧아서, 보통은 SDK 오류가 먼저 나고 그다음 다시 시도한다.

## 문제

### M1 (보통) 0번 발표자가 「발표하기」→「예」를 눌렀는데 아무도 넘어가지 않고 「모두가 이 자료로 넘어갔어요」만 뜰 수 있음
- 파일: public/zzoom/agenda.js 280~285행, public/zzoom/viewer.js 164·612·1080행
- 까닭: agenda.js 는 회의 문서(`presenter.cid === 나`, `live.aid` 없음)만 보고 「내가 발표자」라고 판단해 cmd:nav 만 보낸다. 그런데 viewer 의 `isPresenter()` 는 `P.lost` 가 참이면 거짓이 된다. `P.lost` 는 /live 가 409 `not_presenter` 를 받으면 켜지고, 발표자 cid 가 바뀔 때나 role 이 바뀔 때만 꺼진다(1075·1080행). 내가 안건 X 를 발표하며 화면을 움직이는 동안(/live 가 오가는 중) 0번 「발표하기」를 누르면, 서버는 epoch 를 올리고 늦게 도착한 옛 epoch /live 는 `not_presenter` 를 받는다. 그러면 발표자 cid 는 그대로 나인데 `P.lost` 가 켜진 채 남는다. 이 상태에서 cmd:nav 를 보내면 viewer 는 내 화면만 옮기고(`userChanged` 가 발표자가 아니라고 보고 /live 를 보내지 않음) 다른 사람은 0번에 남는다. 0번을 다시 눌러도 cid 가 같아서 `P.lost` 는 꺼지지 않는다.
- 재현(코드 따라가기와 서버 시험): 덧붙인 시험에서 옛 epoch 의 /live 가 `not_presenter` 를 받는 것을 확인했다. 브라우저에서 시간을 맞춰 재현하지는 못했다(확인 못 함). 학교 와이파이처럼 /live 가 몇 초 늦게 도착하면 일어날 수 있다. R12 이전에는 같은 상황에서 present(aid) 를 불러 서버가 모두를 옮겼기 때문에 드러나지 않았다.
- 고칠 방향(둘 중 하나): ① viewer 의 meeting 처리에서 발표자 cid 가 나이고 `presenter.epoch` 가 올라가면 `P.lost=false` 로 한다. ② agenda.js 의 cmd:nav 길을 viewer 가 실제로 진행을 보낼 수 있을 때로 한정하고, 그렇지 않으면 예전처럼 `api.present(mid, aid)` 로 간다.

### L1 (낮음) 0번에서 cmd:nav 로 넘어갈 때 forceSeq 가 오르지 않아 다른 사람 화면을 비우는 동작(yield)이 없음
- 파일: public/zzoom/agenda.js 281행, public/zzoom/app.js 385행
- 까닭: present(aid) 는 forceSeq 를 올리고, app.js 는 그것을 보고 남의 화면에서 `yieldToPresenter()` 를 불러 열린 창과 손으로 연 안건 패널을 닫는다. cmd:nav 길은 force 없이 /live 를 보내므로 forceSeq 가 그대로다. 그래서 0번 동안 「오늘의 안건 보기」로 패널을 손으로 연 사람(S.open 참)이나 창을 열어 둔 사람은 자료가 바뀌어도 패널이나 창이 덮인 채 남는다. 따라가는 쪽 무대는 넘어간다.
- 재현: 코드로 따라가 보았다(서버 시험에서 force 없는 /live 는 forceSeq 가 그대로인 것을 확인). 화면에서는 확인 못 함.
- 고칠 방향: 그 길에서 `cmd:nav` 다음에 `store.emit('cmd:force')` 를 보내 `queueLive(true)` 가 forceSeq 를 올리게 한다. live.aid 가 있으므로 agenda.js 의 「0번 다시 펼치기」 조건(`!l?.aid`)에는 걸리지 않는다.

### L2 (낮음) 다시 보내려고 기다리던 /live 가 0번 발표 직후 나가면 모두가 0번에서 옛 안건으로 끌려감
- 파일: public/zzoom/viewer.js 573~575·616~627행
- 까닭: 연결 문제로 /live 가 실패하면 0.8~2.4초 뒤 다시 보낸다(P.dirty). 그 사이에 present(TODAY) 가 성공하면 `presenterIncoming` 은 `P.inflight` 나 `P.timer` 가 있으면 화면을 맞추지 않고 넘긴다. 이어서 다시 보내는 /live 는 store 의 새 epoch 와 rev 를 읽기 때문에 서버를 통과하고, 0번을 옛 안건으로 덮어쓴다. present(aid) 길에서도 원래 있던 경합이다.
- 재현: 코드로 따라가 보기만 했다(확인 못 함).
- 고칠 방향: viewer 가 내 `presenter.epoch` 가 바뀐 것을 보면 `dropLive()` 로 기다리던 진행을 버린다. 또는 present() 가 성공한 뒤 cmd 하나로 viewer 의 대기열을 비운다.

### L3 (낮음) 멈춤으로 끊고 다시 올릴 때, 이미 서버에 저장된 파일이면 storage.rules 의 「덮어쓰기 금지」에 걸려 실패로 끝남
- 파일: public/zzoom/api.js 516~522·562·719행, storage.rules 83행(`allow create: if resource == null ...`, 읽기 규칙 없음)
- 까닭: 마지막 조각이 서버에 저장됐는데 응답이 늦거나 끊기면, SDK 오류(20초)나 멈춤(25초) 뒤 같은 경로에 새로 올린다. 규칙이 덮어쓰기를 막으므로 `storage/unauthorized` 가 3번 나고 「…을 올리지 못했어요」로 끝난다. 데이터가 깨지지는 않으며 사용자가 다시 올리면 된다. 예전 uploadBytes 길에도 있던 문제인데, 이번 고침으로 끊고 다시 올리는 일이 잦아져 학교 와이파이에서 더 자주 볼 수 있다.
- 재현: 규칙과 코드를 읽어 따라가 보았다. 에뮬레이터로는 돌려 보지 못했다(확인 못 함).
- 고칠 방향: 두 번째 시도부터 `storage/unauthorized` 가 나면 「이미 올라감」으로 보고 넘긴다. commit 이 목록과 크기(`fb.storage.list`·`head`)로 파일이 있는지 다시 확인하므로, 정말 빠진 파일이면 그때 실패한다.

### L4 (낮음) today 시험이 빠뜨린 것
- 파일: tests/zzoom/api.test.js 1715행
- 다음 세 가지는 기존 시험에 없다(덧붙인 시험으로는 확인했다). ① 0번 발표자 본인의 /live(새 epoch·baseRev)가 통과하고 forceSeq 를 그대로 두는 것. ② 주관자가 회의 중에 0번을 발표하면 속도 제한 없이 통과하는 것. ③ 0번 뒤 `live.full` 이 꺼지는 것.
- 고칠 방향: `<임시폴더>/r12/v1_today_extra.test.js` 의 앞쪽 단계를 시험에 옮긴다.

## 결론

치명 0, 높음 0, 보통 1(M1), 낮음 4(L1~L4). 서버 today 분기의 권한, 회의 상태, rev·forceSeq·epoch 와 판서 epoch 분리는 계약(CONTRACTS 2-3)과 맞는다. 「이미 0번 발표자면 cmd:nav」 길도 정상일 때는 서버 /live 규칙과 맞는다. 다만 화면 쪽 viewer 의 발표자 판단(`P.lost`)과 어긋나면 진행이 조용히 빠지는 경우가 있다(M1).

결론: PASS(치명·높음 0)
