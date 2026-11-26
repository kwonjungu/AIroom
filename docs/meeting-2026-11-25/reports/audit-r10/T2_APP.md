# 감사 R10 T2: 화면 앱 흐름 (2026-11-26)

대상: public/zzoom/api.js(asJson 성공 때 conn off에서 ok 로 바꾸는 고침), index.html, host.css, list.js(감사 중 들어온 9b5039a 포함), agenda.js, audit-r9/S2_APP.md 지적.
기준 커밋: 9b5039a(HEAD, feat/meeting). 코드와 설정은 고치지 않았고 운영 회의도 만들거나 지우지 않았다.

- 운영 서빙 파일: api.js, index.html, host.css, list.js, agenda.js, app.js, draw.js, viewer.js, viewer.css, host.js, zzoom.css, join.js 12개 모두 sha256 이 HEAD(9b5039a)와 같다. list.js 는 9b5039a 를 푸시한 직후(약 1분) 운영이 아직 옛 파일(Last-Modified 05:11:34 GMT, 바뀐 줄 없음)을 주다가, Production 배포(05:12:48Z)가 끝난 뒤 새 파일로 바뀐 것을 확인했다.
- 운영 `/api/zzoom/health` 응답은 `{"ok":true,"enabled":true,"firebase":true,"redis":true}`, `X-Vercel-Id` 는 `icn1::icn1` 이다(서울에서 처리).
- `npm run test:zzoom` 150개 통과, 화면 모듈 문법 확인 24개 오류 0.
- conn 전환 재현: api.js 를 그대로 복사해 가짜 store 와 fetch 로 돌린 스크립트(<임시폴더>/r10/t2/conn_sim.mjs). health 실패로 off, 다른 요청 성공으로 ok, 그 뒤 일반 요청 실패는 off 로 바꾸지 않음을 확인했다.

---

## 1. R9 S2 지적 확인

| 지적 | 판정 | 근거 |
|---|---|---|
| 2-1 heartbeat 한 번 실패로 끊김 띠가 최대 60초 남음 | 덜 고쳐짐(아래 2-1) | api.js:110 에서 asJson 이 성공한 응답을 받을 때 server 가 off 면 ok 로 바꾼다. 판서, 채팅, 발표처럼 요청을 보내는 사람은 다음 요청이 성공하는 즉시 띠가 내려간다. 하지만 듣기만 하는 참여자는 서버 요청이 heartbeat 뿐이라 예전처럼 최대 60초 남는다 |
| 2-2 360px 이하 상태 글 잘림 | 고치지 않은 것(FIXES.md) | host.css 는 바뀌지 않았다. 다시 지적하지 않는다 |
| 2-3 DB 이름이 서버(환경 변수)와 화면(고정)에서 따로 | 고쳐짐 | lib/zzoom/fb.js:38 이 `databaseId: 'zzoom'` 으로 고정됐다. gcp.js:45 기본값도 'zzoom', 화면 api.js:8·149 `getFirestore(app, 'zzoom')` 와 같다 |
| 2-4 옛 kwon 회의가 안내 없이 사라짐 | 해당 없어짐 | FIXES.md 에 따르면 이전 직후 kwon 의 쭘 회의를 모두 지웠다. 목록에서 사라질 회의가 남아 있지 않다. 운영 kwon 을 직접 읽어 보지는 않았다(확인 못 함) |
| 2-5 api.js 옛 주석, 쓰이지 않는 timedOut | 안 고침(참고) | api.js:84 `timedOut` 이 그대로 쓰이지 않고, api.js:87 주석은 여전히 「서버가 12초(받아쓰기 70초)」다. 동작 영향은 없다 |

---

## 2. asJson 고침 점검(띠 깜빡임과 엇갈림)

conn.server 를 off 로 만드는 곳은 heartbeat 실패(api.js:378, status 0 일 때)와 health 실패(api.js:123) 두 곳뿐이다. ok 로 되돌리는 곳은 heartbeat 성공(377), health 성공(120), 그리고 새로 넣은 asJson 성공(110)이다. 띠는 app.js:262-277 이 server off 가 2.5초 이어질 때만 띄우고, 상태가 바뀔 때마다 타이머를 지운다.

확인한 경우와 결과:
- **live 실패와 엇갈림**: sendLive(api.js:403)는 실패해도 conn 을 건드리지 않는다(mcall 에서 onGrantError 만 탄다). 그래서 live 가 실패하고 다른 요청이 성공하는 엇갈림이 생겨도 off 와 ok 사이를 오가지 않는다. 깜빡임은 생기지 않는다.
- **heartbeat 실패 바로 뒤 다른 요청 성공**: off 가 된 뒤 2.5초 안에 다른 요청이 성공하면 ok 로 돌아가고 띠 타이머가 지워져 띠가 아예 뜨지 않는다. 의도한 동작이다. off 로 바꾸는 일은 heartbeat 주기(60초)와 탭이 다시 보일 때만 생기므로, 띠가 몇 초 간격으로 떴다 꺼졌다 하는 일은 없다.
- **앞서 보낸 요청이 늦게 성공하는 경우**: 끊기기 전에 보낸 요청이 heartbeat 실패 뒤에 응답을 받아 ok 로 바꿀 수 있다. 응답이 실제로 도착했다는 것은 그 순간 서버와 연결되어 있다는 뜻이라 틀린 표시가 아니다.
- **응답은 성공했는데 실제 연결은 끊긴 경우**: 쭘 API 는 모두 `Cache-Control: no-store`(routes.js:114)라 브라우저 캐시가 성공 응답을 대신 주는 일은 없다. 서비스 워커도 없다. 실시간(Firestore)이 끊긴 경우는 conn.firebase 가 따로 띠를 띄우고(app.js:266-267), asJson 은 server 만 바꾸므로 그 띠를 내리지 않는다.
- **not_configured**: asJson 은 off 일 때만 ok 로 바꾸므로 503 not_configured 상태를 덮지 않는다.
- **판서 다시 보내기**: draw.js:731-733 은 server 가 ok 가 아니던 상태에서 ok 로 바뀌면 실패한 선을 다시 보낸다. 이제 다른 요청(예: 다른 선 저장)이 성공하는 순간에도 이 자리가 불린다. retryFailed(draw.js:472)는 'failed' 인 선만 'queued' 로 돌리므로 보내는 중인 선을 겹쳐 보내지 않는다. 오히려 다시 보내는 시점이 빨라졌다.

### 2-1. 낮음: 듣기만 하는 참여자에게는 고침이 닿지 않아, 한 번 끊기면 띠가 최대 60초 남음(R9 S2-1 남은 부분)
- 파일:줄: api.js:110(asJson 성공 때만 ok), api.js:373-378(heartbeat `retry:false`, status 0 이면 off), api.js:11(HEARTBEAT_MS 60000), app.js:265·276
- 무엇이 남았나: 참여자 화면은 안건, 판서, 발표 상태를 Firestore 구독으로 받는다. 서버(HTTP)로 보내는 것은 60초 heartbeat 와 50분 토큰 갱신뿐이다. Firestore 스냅샷을 받아도 conn.server 는 바뀌지 않는다. 그래서 펜을 쓰지 않고 보기만 하는 사람은 heartbeat 한 번이 끊김 때문에 실패하면, 다음 heartbeat(60초 뒤) 또는 탭이 다시 보일 때까지 「연결이 잠깐 끊겼어요. 다시 잇는 중이에요.」가 남는다. 그동안 발표 화면은 Firestore 로 잘 따라오고 있어서, 화면은 멀쩡한데 띠만 떠 있는 상태가 된다.
- 재현: 회의에 참여자로 들어가 아무것도 누르지 않는다. heartbeat 가 나가는 순간에 와이파이가 1초 끊겼다가 바로 이어진다. 발표자가 쪽을 넘기면 그대로 따라오는데, 위쪽 띠는 최대 1분 동안 남는다. (conn_sim.mjs 로 health 와 heartbeat 만 off 를 만들고 일반 요청 성공만 ok 로 바꾸는 흐름까지 확인했다. 실제 기기에서 와이파이를 끊어 보지는 않았다.)
- 고칠 방향: heartbeat 가 status 0 으로 실패하면 3~5초 뒤 beat 를 한 번 더 예약하거나, Firestore 스냅샷을 받을 때(api.js:573) server 가 off 이면 health() 를 한 번 불러 확인한다.

---

## 3. list.js 9b5039a(회의 만들기 창 초점)

- 바뀐 줄: list.js:258 `setTimeout(() => { if (!form.contains(document.activeElement)) title.focus(); }, 30);`
- 판정: 문제 없음. `form` 은 같은 함수 안에서 먼저 만들어지고(list.js:211) 모달에 붙은 뒤 타이머가 돈다. 비밀번호 칸, 일시 칸, 「번호 자동으로 만들기」 단추는 모두 form 안이라, 30ms 안에 그 칸을 누르거나 입력을 시작한 사람의 초점을 더는 빼앗지 않는다. 창이 30ms 안에 닫혀도 떨어진 입력 칸에 focus 를 주는 것은 아무 일도 하지 않는다.
- 참고: app.js:196-197 의 openModal 이 이미 0ms 뒤 창의 첫 입력 칸(제목)에 초점을 준다. 그래서 고친 뒤에는 list.js 의 30ms 타이머가 거의 늘 「제목이 이미 초점을 가짐」을 보고 아무것도 하지 않는다. 남겨 두어도 해는 없다. openModal 의 0ms 타이머에는 같은 확인이 없지만, 0ms 안에 사람이나 자동 점검이 입력을 시작할 수는 없어 문제가 되지 않는다.
- 운영 반영: 위에 적은 대로 Production 배포 뒤 운영 list.js 해시가 HEAD 와 같아졌다(바뀐 줄이 들어 있음을 직접 확인).

---

## 4. 서울 이전과 관련해 내 파트에서 본 것
- DB 이름: 서버(fb.js:38, gcp.js:45)와 화면(api.js:8·149)이 모두 'zzoom' 으로 고정되어 어긋날 길이 없어졌다.
- 화면이 읽는 Firestore 경로와 쿼리(strokes `where pageKey ==`, chat `orderBy at` + limit)는 R9 에서 본 그대로다. api.js 의 구독 부분은 cdc369f 이후 바뀌지 않아 규칙 누락이나 복합 색인 필요가 새로 생기지 않았다.
- health 응답에 `enabled` 가 새로 보이지만 api.js:116-121 은 ok, firebase, redis 만 읽어 영향이 없다.
- index.html, host.css, agenda.js 는 744475c 뒤로 바뀌지 않았다. list.js 는 9b5039a 한 줄만 바뀌었다.

---

결론: PASS(치명·높음 0)
