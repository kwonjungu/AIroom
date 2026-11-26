# 감사 R11 U2: 화면 앱 흐름 (2026-11-26)

대상: public/zzoom/api.js(heartbeat 실패 뒤 5초 재시도 retryBeat, asJson 의 conn ok), list.js(9b5039a), index.html, host.css, agenda.js, audit-r10/T2_APP.md 지적.
기준 커밋: 2ed51ee(HEAD, feat/meeting, origin 과 같음). 코드와 설정은 고치지 않았고 운영 회의도 만들거나 지우지 않았다.
Vercel 무료 한도 때문에 운영에는 정적 파일 GET 만 보냈다(해시 비교 23개, viewer.js 다시 받기 1번). 나머지는 로컬 코드와 가짜 시계·가짜 네트워크 재현으로 봤다.

- 운영 서빙 파일: zzoom 화면 파일 23개(api.js, list.js, index.html, host.css, agenda.js, app.js, viewer.js, draw.js, host.js, join.js, css 7개, board·chat·hands·poll·record·upload·onboard)의 sha256 이 모두 HEAD 와 같다. 처음 비교했을 때 viewer.js 만 b2dcd1f 판(wantFor 없음)이었다. 몇 분 뒤 다시 받으니 Last-Modified 05:29:08 GMT 의 새 파일이 왔고 HEAD 해시와 같아졌다(HEAD 커밋 05:27 UTC, 배포가 끝나기 전 잠깐 어긋난 것).
- `npm run test:zzoom` 150개 통과, 화면 모듈 문법 확인 24개 오류 0(로컬).
- 재현 스크립트: <임시폴더>/r11/u2/hb_sim.mjs. HEAD 의 api.js 를 그대로 복사하고 시험용 입구(입장, 같은 회의에서 begin 다시, leave)만 끝에 붙였다(api_sim.mjs). 가짜 시계, 가짜 fetch(online, offline 은 바로 실패, stall 은 응답 없이 20초 시간 제한까지 멈춤), 가짜 document 와 window 로 돌렸다. 결과는 hb_sim.out.txt 에 있다.

---

## 1. R10 T2 지적 확인

| 지적 | 판정 | 근거 |
|---|---|---|
| 2-1 듣기만 하는 참여자는 heartbeat 한 번 끊기면 띠가 최대 60초 남음 | 고쳐짐 | api.js:378-383. status 0 으로 실패하면 5초 뒤 beat 를 다시 한다. 재현 A3: 끊긴 채 120초가 지난 뒤 다시 이으면 5초 안에 conn 이 ok 로 돌아온다. A4: 이어진 뒤에는 5초 재시도가 멈추고 60초 주기만 남는다 |
| 2-5 api.js 옛 주석, 쓰이지 않는 timedOut | 안 고침(참고, 동작 영향 없음) | api.js:84, 87 그대로 |
| R9 S2-2 360px 상태 글 잘림 | FIXES.md 「고치지 않은 것」 | 다시 지적하지 않는다 |

list.js(9b5039a), index.html, host.css, agenda.js 는 R10 감사 기준(9b5039a) 뒤로 바뀌지 않았다(`git diff 9b5039a HEAD -- public/zzoom/` 에는 api.js, viewer.js 두 파일만 나온다). R10 에서 본 판정(9b5039a 초점 타이머 문제 없음)이 그대로다.

---

## 2. retryBeat 점검(가짜 네트워크 재현)

| 경우 | 결과 | 판정 |
|---|---|---|
| A. 오프라인 동안 계속 도는지 | 끊긴 동안 5초마다 1번씩 보낸다(60초에 12번). 60초 주기와 겹쳐도 재시도 타이머는 하나뿐이다(`if (!retryBeat)`) | 의도대로다. 오프라인이면 요청이 서버까지 가지 않아 Vercel 호출과 서버 쪽 부담이 없다. 기기 쪽 부담도 작은 실패 fetch 하나다. 숨긴 탭은 브라우저가 타이머를 늦춘다 |
| A'. 다시 이어진 뒤 | 5초 안에 ok, 그 뒤 5초 재시도 멈춤 | 정상 |
| B. 끊긴 중 회의를 나감(leave) | 남아 있던 재시도 타이머가 한 번 돌지만 `!S` 라 요청을 보내지 않는다. 120초 동안 0번이고, 남은 타이머도 0개다 | 정상. stopTimers 는 retryBeat 를 지우지 않지만 최대 5초 남았다가 아무 일 없이 끝난다 |
| C. 끊긴 중 다른 회의로 옮김 | 옛 회의로 가는 요청 0번, 새 회의만 5초마다 | 정상(beat 가 `S.mid !== mid` 면 바로 돌아간다) |
| D. 끊긴 중 나갔다가 5초 안에 같은 회의로 다시 들어감 | 30초에 12번 보낸다. 옛 closure 의 재시도 고리와 새 고리가 함께 돌아 5초에 2번이 된다(시각 0,4,5,9,10,…). 다시 이어지면 둘 다 멈춘다 | 낮음 2-1 |
| E. 끊긴 중 같은 회의에서 begin 다시(주관자 전환 becomeHost) | D 와 같이 30초에 12번 | 낮음 2-1 |
| F. 멈춘 연결(stall, 20초 시간 제한) | 재시도 고리(20초+5초)와 60초 주기가 따로 돌아 120초에 9번 보낸다. 탭이 다시 보이는 순간에는 heartbeat 2개가 동시에 떠 있었다 | 낮음 2-2 |

### 2-1. 낮음: 같은 회의에서 heartbeat 를 다시 시작하면 옛 재시도 고리가 함께 돌아 오프라인 동안 두 배로 보냄
- 파일:줄: api.js:382(retryBeat 가 startHeartbeat 의 closure 변수), api.js:386, api.js:352-357(stopTimers 가 retryBeat 를 모름), api.js:375(beat 는 mid 만 비교하고 같은 회의의 새 S 도 받아들임)
- 재현: 회의 안에서 heartbeat 가 끊겨 재시도가 걸린 채로 5초 안에 같은 회의에서 begin 이 다시 돈다(목록에 갔다가 같은 회의로 resume, 또는 주관 코드를 넣어 becomeHost). 그 뒤 다시 끊기면 옛 고리와 새 고리가 각각 5초마다 보낸다. hb_sim D, E 에서 30초에 12번이 나왔다. resume 과 becomeHost 는 서버 요청이 성공해야 하므로, 그사이 잠깐 이어졌다가 바로 다시 끊겨야 생긴다. 흔한 경우는 아니다.
- 영향: 오프라인 동안은 요청이 서버까지 가지 않아 거의 해가 없다. 멈춘 연결(요청은 닿는데 응답이 안 옴)이면 같은 pt 로 1분에 최대 8번쯤이 되어, 서버 제한 heartbeatPerMin 6(routes.js:53, 1126, pt 해시마다)에 걸려 429 가 날 수 있다. 429 는 status 0 이 아니라 재시도도 하지 않고 conn 도 ok 로 바꾸지 않는다. 그래서 띠가 다음 주기(최대 60초)까지 남을 수 있다(실제 기기로는 확인 못 함).
- 고칠 방향: retryBeat 를 S.timers.retry 에 두고 stopTimers 에서 clearTimeout 하거나, beat 가 시작할 때 잡은 pt(또는 세대 번호)가 지금 S.pt 와 같을 때만 보내게 한다.

### 2-2. 낮음: heartbeat 가 이미 나가 있는지 보지 않아 재시도·주기·탭 다시 보임이 겹치면 동시에 둘이 나감
- 파일:줄: api.js:373-386(beat 에 보내는 중 표시가 없음)
- 재현: 응답 없이 멈추는 연결에서 60초 주기 beat 가 떠 있는 동안 탭을 다시 보면 heartbeat 2개가 동시에 떠 있다(hb_sim F). 이 겹침(주기와 탭 다시 보임)은 R10 전부터 있었다. retryBeat 가 겹칠 거리를 하나 더 만들었다. 멈춘 연결 120초에 9번(재시도 고리 25초 간격과 60초 주기가 따로 돈다).
- 영향: heartbeat 는 사람 기록을 덮어쓸 뿐이라 결과는 같다. 다만 멈춘 연결에서는 서버까지 닿는 요청과 함수 호출이 늘고, 2-1 과 같이 6회 제한에 가까워진다.
- 고칠 방향: beat 에 `inflight` 표시를 두어 보내는 중이면 건너뛰고, 재시도가 걸려 있는 동안에는 주기 beat 가 재시도를 대신하게 한다.

### 2-3. 참고: 주석과 FIXES 표는 「5초 뒤 한 번 더」인데 실제로는 이어질 때까지 5초마다 계속 함
- api.js:381 주석, audit-r9/FIXES.md 32줄. 동작은 오히려 바람직하다(오래 끊겼다가 이어져도 5초 안에 띠가 내려감). 글만 바로잡으면 된다.

---

## 3. asJson 의 conn ok
- api.js:110 은 R10 에서 본 그대로다. 재시도 성공은 beat 안의 `spatch('conn', {server:'ok'})`(377)로 ok 가 된다. asJson 성공 처리와 겹쳐도 spatch 가 같은 값이면 이벤트를 내지 않아(24-29) 띠가 깜빡이지 않는다.
- 재시도는 status 0(fetch 실패, 20초 시간 제한)일 때만 건다. 401·403·410 은 onGrantError 가 S 를 지우거나 회의 끝 처리를 하므로 재시도 고리가 이어지지 않는다(B 와 같은 길).
- 확인 못 함: Vercel 무료 한도를 넘겨 운영이 4xx·5xx 나 HTML 오류 쪽을 줄 때의 화면 표시. 그런 응답은 status 0 이 아니라 off 도 재시도도 생기지 않는다. 화면은 요청마다 「서버 오류(…)」만 보일 것으로 보이지만 운영에서 재현하지 않았다.

## 4. 서울 이전과 관련해 내 파트에서 본 것
- 화면 DB 이름 api.js:8 'zzoom' 은 R10 과 같다. 구독과 쿼리 부분은 바뀌지 않아 새 규칙 경로나 색인 필요가 생기지 않았다.
- heartbeat 재시도는 서버 지역과 상관없다. 6회 제한 버킷은 Redis(아시아) 그대로다.

---

결론: PASS(치명·높음 0)
