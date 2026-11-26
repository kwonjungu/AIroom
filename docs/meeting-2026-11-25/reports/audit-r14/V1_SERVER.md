# 감사 R14 V1 — 서버와 전송 규칙 (0번 「오늘의 안건」, R13 고침 확인)

대상: ab8da41 다음부터 HEAD(d6f81d2)까지. 이번에 특히 본 것은 R13 고침(d6f81d2)이다. 읽기 전용으로 보았고 코드는 고치지 않았다. 운영 서버에는 요청을 보내지 않았다.
담당 범위: lib/zzoom/routes.js POST /:mid/presenter today 분기, api.js present(TODAY)와 putBlob, 다시 올리기의 storage/unauthorized 처리(commit 이 파일을 정말 다시 확인하는지), viewer.js flushLive(force 조건, sentEp 로 not_presenter 거르기)와 meeting 처리(epoch 가 바뀌면 P.lost 풀기와 dropLive)가 서버 /live 규칙과 맞는지, 그리고 진짜로 발표자 자격을 빼앗긴 경우를 놓치지 않는지.

## 돌려 본 것(모두 로컬)

| 무엇 | 결과 | 기록 |
|---|---|---|
| `npm run test:zzoom` | 152개 통과, 문법 확인 24개 오류 0 | `<임시폴더>/r12/r14_v1_test_zzoom.txt` |
| viewer.js 재현: 진짜 index.html 과 viewer.js 를 tests/zzoom/d2_harness.js 에 붙이고, 가짜 sendLive 가 서버 /live 규칙(routes.js 629~634행: cid, presenter.epoch, live.epoch, baseRev)을 응답 시점 상태로 판정. 몸통의 baseRev·epoch 는 api.sendLive 처럼 store 에서 읽음. 시나리오 S1~S5 | 아래 표 | `<임시폴더>/r12/r14_v1_viewer_live.py`, `r14_v1_viewer_live.txt` |

재현 결과(크로미움, 페이지 오류 0):

| 시나리오 | 보낸 /live(안건, 쪽, force, epoch → 결과) | 뜻 |
|---|---|---|
| S1 a1 발표 중 /live 가 시간 초과로 끝나는 사이 내 0번 발표가 도착 | a1 2쪽 epoch1 → 시간 초과 / **a1 2쪽 force epoch2 → 통과**, 서버 live 는 a1 2쪽, forceSeq +1 | 0번이 옛 안건으로 덮이고 모두 끌려감(M1) |
| S2 옛 /live 가 가는 중 0번 도착, 이어 a2 로 넘김 | a1 2쪽 epoch1 → not_presenter, 그 뒤 보낸 것 없음. 서버 live 는 0번 그대로 | a2 로 넘긴 것이 사라짐(L1) |
| S3 다른 사람이 가져감, 회의 문서가 응답보다 늦게 옴 | a1 2쪽 epoch1 → not_presenter, 그 뒤 3쪽·4쪽은 보내지 않음 | 자격 잃음을 제대로 앎 |
| S4 다른 사람이 가져감, 회의 문서가 먼저 옴 | a1 2쪽 epoch1 → not_presenter, 그 뒤 보낸 것 없음 | 제대로 앎 |
| S5 내가 0번(epoch2) 뒤 곧바로 다른 사람이 가져감(epoch3), 화면은 epoch2 까지만 앎 | epoch1 → not_presenter(새 갈래, 자격 유지) / a1 3쪽 force epoch2 → not_presenter(이번엔 sentEp 가 같아 P.lost) / 4쪽은 안 보냄 | 한 번 더 보내 보고 제대로 앎 |

## 맞게 된 것

**서버 today 분기(routes.js 551~589행)**
- eb20c85 뒤로 lib/ 와 tests/ 는 바뀌지 않았다(R13 고침은 api.js·viewer.js 뿐). R13 V1 에서 확인한 권한(앞과 트랜잭션 안 두 번 `allow`), 회의 상태(참석자는 앞과 안, 주관자는 today 전용 확인으로 live 가 아니면 409), `epoch = max(presenter.epoch, live.epoch)+1`, `live = {aid:null, page:1, 기본 보기, rev+1, epoch, forceSeq+1}`, 사람당 10초 `take` 제한과 같은 요청 머리글, 판서 쪽 epoch 를 건드리지 않음, 「발표 가져오기」가 0번 상태를 그대로 둠은 그대로 유효하다. 시험 152개도 통과한다.

**api.js present(TODAY)(674~682행)와 sendLive(410~424행)**
- present 는 응답의 presenter·live 를 store 에 바로 넣고, 이것이 `meeting` 이벤트로 viewer 에 바로 간다. 그래서 viewer 의 `S.meeting.presenter.epoch`(sentEp 의 출처)와 sendLive 가 몸통에 싣는 store 의 `meeting.presenter.epoch` 는 같은 값이다. sentEp 는 flushLive 안에서 sendLive 를 부르기 직전(같은 동기 흐름)에 잡으므로 실제로 보낸 epoch 와 같다.

**viewer.js sentEp 로 not_presenter 거르기(597·612~613행)**
- 새 갈래는 「보낸 뒤 회의 문서의 epoch 가 바뀌었고, 바뀐 문서로도 내가 발표자」일 때만 탄다. 다른 사람이 가져가 회의 문서가 이미 왔으면 cid 가 달라 `isPresenter()` 가 거짓이라 원래 갈래(P.lost)로 간다(S4). 회의 문서가 아직 안 왔으면 epoch 가 그대로라 원래 갈래로 간다(S3). 내가 다시 발표한 직후 다른 사람이 가져간 경우는 첫 거절을 넘기지만, 다음 /live 가 새 epoch 로 거절되면서 sentEp 가 같아 P.lost 가 켜진다(S5). 진짜로 자격을 잃은 경우를 놓치지는 않는다. 늦어도 한 번 더 보내 본 뒤 안다.

**viewer.js meeting 처리(1082~1088행)**
- 발표자 cid 가 같고 epoch 만 바뀌면 `P.lost=false` 와 `dropLive()`. R13 M1(0번 발표 뒤 자격 판단이 꺼진 채 남음)과 L2(기다리던 진행이 0번을 덮음, 타이머로 기다리던 것) 는 이 줄로 막힌다. 다른 사람의 epoch 변화에도 dropLive 가 불리지만, 그때는 내가 발표자가 아니라 버릴 것이 없다.

**viewer.js force 조건(591행)**
- `S.live.aid` 가 없을 때(0번) 나가는 /live 는 force 다. 서버는 force 면 forceSeq 를 올리고(634행), 다른 화면은 forceSeq 증가로 자유 보기에서도 따라오며 app.js 가 남의 창을 닫는다. 0번에서 자료로 갈 때 모두 같이 넘어간다는 결정과 맞는다. 0번 발표자가 아니면 flushLive 맨 앞에서 걸러지므로, 발표자가 없는 「발표 마치기」 뒤 화면에서는 이 조건이 쓰이지 않는다.

**putBlob 다시 올리기와 commit(api.js 563·720행, routes.js 736~782행)**
- 두 번째 시도부터 `storage/unauthorized` 면 성공으로 보고 넘긴다. 규칙(storage.rules 의 `allow create: if resource == null && ...`)상 첫 시도에서 이미 저장된 파일이면 이 오류가 난다. 이어지는 파일 조각만 올라가다 끊긴 경우에는 파일이 만들어지지 않으므로 다시 올리기가 정상으로 된다.
- commit 은 실제로 다시 확인한다. 쪽 그림 pNNN·작은 그림 tNNN 은 Storage 목록으로 하나도 빠짐없이 있는지, 형식이 webp 인지, 크기가 상한 안인지 보고(738~752행), 실제 어댑터(gcp.js head)로 앞 30바이트를 읽어 WebP 머리와 쪽 크기가 commit 값과 같은지도 본다(754~770행). 빠졌으면 422 `upload_invalid` 로 실패한다. 그러므로 쪽 그림을 「올라갔다」고 잘못 넘겨도 안건이 깨진 채 만들어지지는 않는다. 원본만은 아래 L2 처럼 다르다.

## 문제

### M1 (보통) /live 가 연결 문제로 실패한 사이 0번을 발표하면, 다시 보내기가 새 epoch 로 나가서 모두를 0번에서 옛 안건으로 force 로 끌고 감
- 파일: public/zzoom/viewer.js 621~623행(연결 문제 다시 보내기), 591행(force 조건), 1085행(epoch 바뀜 처리)
- 까닭: R13 의 epoch 바뀜 처리는 그 순간 타이머로 기다리던 진행만 버린다(dropLive). 이미 날아가던 /live 가 그 뒤 시간 초과·연결 끊김·429·5xx 로 끝나면 오류 처리가 `P.dirty=true` 로 다시 보내기를 예약한다. 다시 보낼 때 몸통은 지금 store 의 새 epoch 와 새 rev 를 쓰므로 서버 /live 규칙을 모두 통과한다. 0번 발표자의 `S.aid` 는 밑에 깔린 옛 안건(applyLive 가 aid 없는 live 를 무시)이고, `S.live.aid` 가 없으니 force 까지 붙는다. 결과로 모두의 0번 화면이 옛 안건으로 바뀌고 자유 보기 중인 사람도 끌려간다. sentEp 는 not_presenter 갈래에서만 보고, 다시 보내기 갈래에서는 보지 않는다. R13 L2 가 막으려던 것과 같은 결과가 이 길로는 남아 있다.
- 재현: S1(가짜 서버). `a1 2쪽 epoch1 → 시간 초과` 뒤 `a1 2쪽 force epoch2 baseRev2 → 통과`, 서버 live 가 `aid a1, page 2, forceSeq 4`. sendLive 는 6초 시간 제한(api.js 417행)이라, 학교 와이파이에서 안건을 넘기고 몇 초 안에 0번 「발표하기」를 누르면 일어날 수 있다. 실제 브라우저와 서버로 시간을 맞춰 보지는 못했다(확인 못 함).
- 고칠 방향: 오류 처리 맨 앞에서 `S.meeting?.presenter?.epoch !== sentEp` 이면 다시 보내지 않고 끝낸다(stale_rev 갈래 포함). 보낸 뒤 내가 새로 발표했다면 그 요청은 옛 발표의 것이다.

### L1 (낮음) 옛 /live 가 가는 중 0번을 발표하고 곧바로 안건을 넘기면, 옛 요청의 not_presenter 가 새로 넘긴 것을 버림
- 파일: public/zzoom/viewer.js 612~613행
- 까닭: 새 갈래가 `dropLive()` 를 부른다. 그런데 epoch 가 바뀐 순간 1085행에서 이미 옛 대기분은 버렸으므로, 이때 남아 있는 `P.dirty` 는 새 발표 뒤에 생긴 진행이다(보내는 중이라 flushLive 가 `P.dirty=true` 만 해 둔 것). 이것을 버리면 0번 발표자 화면은 a2 로 갔는데 다른 사람은 0번에 남고, agenda.js 는 「모두가 이 자료로 넘어갔어요.」를 띄운다(281~283행). 자격은 그대로라 다음 손놀림부터는 정상이다.
- 재현: S2. `a1 2쪽 epoch1 → not_presenter` 뒤 a2 1쪽은 보내지 않았고 서버 live 는 0번 그대로. 옛 요청이 0번 발표 요청과 확인 창을 거치는 동안 내내 걸려 있어야 해서 S1 보다 드물다.
- 고칠 방향: 새 갈래에서는 dropLive 를 부르지 않는다(finally 가 남은 dirty 를 다시 보낸다).

### L2 (낮음) 원본 파일은 commit 이 다시 확인하지 않아, 두 번째 시도의 unauthorized 가 진짜 거절이면 원본 없이 안건이 만들어짐
- 파일: public/zzoom/api.js 563·720행, lib/zzoom/routes.js 772~779행
- 까닭: commit 은 원본 `original.<확장자>` 가 있으면 크기와 형식을 보고, 없으면 `original:null` 로 그냥 넘어간다(원본은 선택). 그래서 원본에 대해서만은 「마무리 단계가 파일을 다시 확인」(api.js 주석)이 맞지 않는다. 덮어쓰기 금지가 아닌 다른 까닭으로 규칙이 두 번 거절하면, 예전에는 「원본 파일을 올리지 못했어요」로 끝났는데 이제는 조용히 원본 없는 안건이 되어 「원본 받기」가 사라진다. 지금 규칙과 화면 값(크기 = 허가 바이트, 형식 = 서버가 준 목록, 출입증 만료는 시도 전 30초 여유로 따로 확인)을 대 보면 그런 거절이 날 길은 찾지 못했다. 앞으로 규칙이나 형식 목록이 어긋나면 드러날 수 있다(확인 못 함).
- 고칠 방향: 원본 일에서는 unauthorized 를 넘긴 경우를 기억해 두고, commit 응답의 `agenda.original` 이 없으면 실패로 알린다. 또는 원본만 이 넘기기를 하지 않는다.

### L3 (낮음) R13 고침 두 가지(sentEp 갈래, 다시 올리기 unauthorized 넘기기)를 지키는 시험이 없음
- 파일: tests/zzoom/(eb20c85 뒤로 바뀐 시험 없음)
- 위 S1~S5 와 같은 viewer 시험, putBlob 흉내에 「첫 시도 오류 뒤 unauthorized」 경우를 넣은 시험이 없다. 이번 M1·L1 이 시험 없이 지나간 까닭이다.
- 고칠 방향: `<임시폴더>/r12/r14_v1_viewer_live.py` 의 S1~S5 를 tests/zzoom 의 화면 시험으로 옮기고(경로 인자만 바꾸면 된다), R13 의 putBlob 흉내에 위 경우를 더한다.

### 참고(문제로 세지 않음, 확인 못 함) 늦게 온 옛 회의 문서가 store 를 되돌릴 때
- app.js 380행은 Firestore 회의 문서를 그대로 store 에 넣는다. present 응답보다 먼저 만들어진 옛 문서가 학교망 지연으로 더 늦게 도착하면, store 의 epoch 와 live 가 잠깐 옛 값으로 돌아간다. 그사이 보낸 /live 는 옛 epoch 로 거절되고 sentEp 도 같아서 P.lost 가 켜지지만, 곧 새 문서가 오면 1085행이 다시 푼다. present(aid) 때부터 있던 짧은 흔들림이고 결국 맞춰진다. 실제로 이 순서가 생기는지는 보지 못했다.

## 결론

치명 0, 높음 0, 보통 1(M1), 낮음 3(L1~L3). 서버 today 분기는 R13 뒤 바뀌지 않았고 계약과 맞는다. R13 의 sentEp 갈래는 진짜로 자격을 빼앗긴 경우(S3·S4·S5)를 놓치지 않는다. 다만 보내던 /live 가 연결 문제로 실패하는 길에서는 epoch 를 보지 않아, 0번이 옛 안건으로 덮일 수 있다(M1). 다시 올리기의 unauthorized 넘기기는 쪽 그림에 대해서는 commit 이 실제로 다시 확인해 안전하고, 원본만 확인이 없다(L2).

결론: PASS(치명·높음 0)
