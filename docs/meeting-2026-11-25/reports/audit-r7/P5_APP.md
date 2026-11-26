# 감사 R7 파트 5 — 앱 흐름·화면 (2026-11-26)

대상: public/zzoom/index.html, app.js, api.js, list.js, join.js, agenda.js/agenda.css, host.js, upload.js, chat.js, poll.js, hands.js, record.js, onboard.js
(서버 동작 근거는 lib/zzoom/routes.js 를 함께 읽었다. 코드는 고치지 않았다. 운영 회의는 만들거나 지우지 않았다.)
390px 점검은 실제 CSS(zzoom.css·host.css·viewer.css·agenda.css·list.css)를 붙인 시험 화면을 Playwright(Chromium, 390×844·360×844)로 띄워 잰 값이다. Pretendard 대신 맑은 고딕으로 그려져 글자 폭이 몇 px 다를 수 있다.

---

## 높음

### H1. 토큰 갱신이 한 번 실패하면 다시 하지 않음, 60분 뒤 실시간 화면이 통째로 멈춤
- 파일:줄: public/zzoom/api.js:239-244(scheduleRefresh), 287-300(refresh), 548(live 재구독); 서버 lib/zzoom/routes.js:18(TOKEN_LIFE 1시간), 219(claim until), firestore.rules:175-176
- 무엇이 틀렸나: 50분 타이머가 refresh 를 한 번 부르고, 실패하면 `console.warn` 만 남긴다. scheduleRefresh 는 성공 경로(297줄)에서만 다시 걸리므로 그 뒤 갱신은 다시 일어나지 않는다. Firestore 규칙은 claim `until`(발급 뒤 1시간)이 지나면 읽기를 거절한다. live() 는 permission-denied 를 받으면 같은 토큰으로 최대 30초 간격 재구독만 되풀이하므로 회복하지 못한다. heartbeat(서버 pt)는 살아 있어 재입장으로 넘어가지도 않는다.
- 재현: 입장 뒤 50분째 POST /refresh 가 학교망에서 20초 시간 초과(조기 실패가 아니라 재전송도 없음)되거나, signInWithCustomToken 4번이 모두 멈춘다. 60분이 되면 회의 문서·안건·채팅·손·투표 구독이 모두 permission-denied 로 끝나고, 화면은 발표자를 따라가지 않으며 「연결이 잠깐 끊겼어요. 다시 잇는 중이에요」 띠만 계속 뜬다. 새로 고침해야 돌아온다. 교직원 회의가 1시간 안팎이라 실제로 부딪힐 수 있다.
- 고칠 방향: refresh 실패 시 짧은 간격(예: 15초, 30초, 60초)으로 다시 걸고, live() 가 permission-denied 를 받으면 refresh 를 한 번 당겨 부른다.

---

## 보통

### M1. POST 「곧바로 실패」 재전송이 서버에서 이미 처리된 일을 다시 함
- 파일:줄: api.js:72-85(request, `early = !timedOut && Date.now()-t0 < 3000` 이면 POST 도 최대 3번)
- 무엇이 틀렸나: fetch 가 3초 안에 실패해도 요청이 이미 서버에 닿아 처리됐을 수 있다(보낸 뒤 응답 전 연결 끊김, 와이파이 재연결로 인한 소켓 리셋). 서버에는 멱등 열쇠가 없다(routes.js 301·779·986·1085·396·506).
- 경로별 재현과 결과:
  - 채팅(chat.js:152 → routes.js:986): 서버가 글을 쓰고 응답이 끊김 → 300ms 뒤 재전송. 같은 초 칸이면 429 가 나오고, 다음 초 칸(1초 고정 창)이면 **같은 글이 모두에게 두 번** 올라간다. chat.js mergeMessages 는 임시 글 하나만 서버 글과 짝지으므로 두 번째 글은 그대로 보인다.
  - 안건 추가(agenda.js:294 → routes.js:779): 같은 제목의 빈 안건이 두 개 생기고, 사람당 10개 한도를 하나 더 먹는다.
  - 회의 만들기(list.js:247 → routes.js:301): 서버 처리가 3초 안에 끝나면 같은 회의가 두 개 생기고 세션당 10분 5개 한도도 두 번 깎인다(서버가 회의 1000개를 읽으므로 대개 3초를 넘겨 재전송 안 될 가능성이 크다. 확인 못 함).
  - 담당자 비밀번호(join.js:212 → api.js:282 → routes.js:422): 서버가 성공하면서 옛 pt 를 지운다. 재전송은 옛 pt 로 가서 401 pt_invalid → onGrantError(api.js:324) 가 자격을 지우고 **입장 화면으로 내쫓는다**. 맞는 번호를 넣었는데 「참가 자격이 없거나 만료됐습니다」가 뜬다. 시도 횟수도 한 번 더 센다.
  - 투표 만들기(poll.js:94): 두 번째가 409 poll_open → 「열린 투표를 먼저 닫으세요」 오류. 투표는 열렸는데 담당자 화면은 만들기 칸에 그대로 남는다.
  - 발표하기(agenda.js:251, 참석자): 두 번째가 take 1회 제한(routes.js:512)에 걸려 429 → 발표는 시작됐는데 「요청이 너무 잦습니다」 경고가 뜬다.
  - 회의 시작·끝내기(host.js:111·226): 두 번째가 409 state_live 또는 state_ended → 성공했는데 오류 알림이 뜬다.
  - 입장(join): cid 가 하나 더 생겨 people 에 유령 참석자가 5분 남는다(낮음).
- 멱등이라 괜찮은 것: 업로드 commit(routes.js:668-670 already), transcribe(조각 n 으로 덮어씀), 투표하기, 손들기(이미 있으면 그대로), 회의 지우기, heartbeat.
- 고칠 방향: 쓰는 POST(chat·agenda·meetings·polls)에 브라우저가 만든 요청 id(`X-Req-Id`)를 붙이고 서버가 60초 동안 같은 응답을 돌려주게 하거나, 조기 재전송을 GET·멱등 경로로만 줄인다. /host 는 재전송을 끄거나 서버가 직전 발급 결과를 잠깐 기억하게 한다.

### M2. 담당자 비밀번호가 맞았는데 실시간 로그인이 실패하면 「입장한 듯 보이지만 아무것도 안 되는」 상태
- 파일:줄: api.js:211-223(begin), 280-285(becomeHost), 318-319(mcall)
- 무엇이 틀렸나: begin 이 S 를 새 pt 로 바꾼 뒤 fbSignIn 이 실패하면 `S = null` 로 만들지만 store 의 role(이전 viewer)은 그대로 둔다. 서버는 이미 옛 pt 를 지웠다. 이후 모든 mcall 이 서버에 가기 전에 pt_required 를 던지고, 이 오류는 onGrantError 를 거치지 않아 입장 화면으로도 가지 않는다. heartbeat 도 멈춰 5분 뒤 「나감」이 된다.
- 재현: 메뉴 → 「회의 담당자로 들어가기」 → 맞는 번호 → 서버 200 → signInWithCustomToken 이 8초씩 4번 멈춤. 「실시간 연결에 실패했어요」가 뜬 뒤 화면은 그대로인데 채팅·손들기·발표하기가 모두 「참가 자격이 없어요. 다시 입장해 주세요」로 막힌다. 새 pt 는 sessionStorage 에 저장돼 있어 새로 고침하면 돌아오지만 사용자는 그걸 알 수 없다.
- 고칠 방향: begin 실패 시 `sset('role', null)` 로 입장 화면을 띄우거나(저장된 자격으로 resume 재시도), becomeHost 실패 뒤 곧바로 resume(mid) 을 한 번 부른다.

### M3. 20초 시간 제한이 서버가 원래 오래 걸리는 요청보다 짧음
- 파일:줄: api.js:63(REQ_TIMEOUT_MS 20000), 74(시간 초과는 재전송 안 함)
  - 받아쓰기: routes.js:1205 이후 Whisper 호출 제한이 최대 45초(whisper 타이머 `Math.min(45000, left)`). Groq 가 20~45초 걸리면 서버는 글을 저장하는데 브라우저는 20초에 끊고 실패로 본다. record.js:12 대기열이 5·15·30초 뒤 3번 다시 보내 Groq 를 3번 더 부르고, 녹음을 끈 뒤 받는 조각 한도(routes.js:1203 3개, 1223 5개)를 재시도가 먹어 진짜 마지막 조각이 429 로 막힐 수 있다. 화면에는 「실패(직접 다시 보내기)」가 남는다.
  - 회의 지우기: routes.js:353 이 정리를 최대 20초(deletePurgeBudgetMs) 돌린 뒤 답한다. 판서가 많은 회의는 응답이 20초를 넘겨 list.js:314 에 「연결이 끊겼어요」가 뜨는데 실제로는 지우는 중이다. 다시 누르면 사람당 10분 10개 한도가 하나 더 깎인다.
- 재현: 1분 조각 받아쓰기가 25초 걸린 날, 또는 판서 수천 개인 회의를 지울 때.
- 고칠 방향: request 에 경로별 시간 제한(transcribe 60초, DELETE meetings 35초)을 두거나, 서버 지우기 예산을 15초로 줄이고 나머지는 queued 로 답한다.

### M4. 부트 감시가 느린 망에서 멀쩡해질 페이지를 다시 읽고, 세 번째에는 닫을 수 없는 안내 상자를 남김
- 파일:줄: public/zzoom/index.html:15-25, app.js:1
- 무엇이 틀렸나:
  1. `__zzBoot` 은 app.js 본문이 돌 때 서야 하는데, 모듈은 import 한 api.js 까지 다 받은 뒤에 돌고, 앞의 zzoom.css 도 다 받아야 실행된다. 학교망에서 첫 연결이 느리면 10초 안에 못 끝나 진행 중이던 받기를 버리고 다시 읽는다(최대 2번).
  2. 세 번째 읽기에서도 10초를 넘기면 안내 상자(z-index 9999, 화면 아래 16px 띄움, 닫기 단추 없음)를 붙인다. 그 뒤 11~15초에 app.js 가 정상으로 떠도 상자를 지우는 코드가 없다. 상자는 화면 아래쪽을 덮어 쪽 막대(손들기·다음 쪽), 담당자 막대(회의 끝내기)를 가린다.
  3. 카운터는 `load` 이벤트 3초 뒤에만 지운다. 그림 하나가 멈춰 load 가 오지 않으면 카운터가 남아 같은 탭에서 다음에 들어올 때는 다시 읽기 기회가 줄어든다(낮음).
- 재현: 연결이 느린 패드에서 쭘을 연다 → 10초, 20초에 두 번 새로 고침 → 세 번째에 12초 만에 화면이 뜸 → 화면은 정상인데 아래에 「인터넷 연결이 불안정해…」 상자가 계속 떠서 손들기·회의 끝내기를 누를 수 없음.
- 고칠 방향: app.js 첫 줄에서 `__zzBoot` 을 세울 때 `[role=alert]` 부트 상자를 지우고(또는 상자에 닫기 단추), 다시 읽기 전에 `performance.getEntriesByName('/zzoom/app.js')` 같은 진행 신호를 보고 받는 중이면 기다린다. 기준을 15초로 늘리는 것도 방법이다.

---

## 낮음

### L1. 휴대폰 너비에서 막대 단추가 잘림(가로 스크롤 뒤에 숨음)
- 파일:줄: host.css(.zh-status white-space:nowrap; flex:none, 599px 규칙), zzoom.css:135-139(#zz-hostbar overflow-x:auto), viewer.css:68-73(.zv-pager 스크롤 막대 숨김)
- 잰 값(Chromium, 맑은 고딕):
  - 담당자 막대, 상태 글 「다른 분이 발표 중이에요」: 390px 에서 scrollWidth 403/390(단추는 보이고 오른쪽 여백만 넘침), **360px 에서 「회의 끝내기」 오른쪽 27px 가 화면 밖**(288~387px).
  - 쪽 막대 윗줄: 390px 에서 「전체 화면」 단추가 300~393px 로 19px 잘림, 360px 에서 49px 잘림. 스크롤 막대가 숨겨져 있어 밀어야 한다는 걸 알기 어렵다.
  - 머리줄·「지금 상태」 띠·「오늘의 안건」 줄 단추(발표하기·고치기)는 390px 에서 넘치지 않았다. 띠가 두 줄이 되어 120px, 쪽 막대가 109px 를 써서 무대 높이는 447px 이다.
- 고칠 방향: 600px 미만에서 상태 글을 「발표 중」처럼 줄이거나 말줄임(min-width:0; overflow:hidden; text-overflow:ellipsis), 쪽 막대 「전체 화면」은 480px 미만에서 「전체」로 줄인다.

### L2. 누구나 지우기 확인 창이 회의 중인 회의와 남의 회의를 구분하지 않음
- 파일:줄: list.js:178, 293-320
- 확인: 확인 창은 있고(「회의 지우기」·「취소」, 첫 초점은 취소, 바깥 누르기와 Esc 는 닫기) 확인 없이 지워지는 경로는 없다. 다만 「회의 중」 카드에도 같은 창이 떠서, 다른 선생님들이 들어가 있는 회의를 한 번 더 누르면 바로 지운다(되돌릴 수 없음). 사용자 결정(누구나 지우기)이라 버그는 아니다.
- 고칠 방향: `m.status === 'live'` 이거나 `!m.mine` 이면 「지금 N명이 회의 중이에요」 같은 줄을 하나 더 넣거나 회의 제목을 따라 쓰게 한다.

### L3. 채팅 임시 글 짝짓기가 기기 시계에 기댐
- 파일:줄: chat.js:40(`m.at >= p.at - 10000`, p.at 은 기기 시계, m.at 은 서버 시계)
- 재현: 기기 시계가 10초 넘게 빠른 패드에서 글을 보내면 보낸 뒤 10초 동안 내 글이 두 번 보인다(서버 글과 「보낸」 임시 글). 보내기에 실패해 「다시 보내기」를 누르면, 서버에 이미 있는 글을 알아보지 못해 한 번 더 올라간다.
- 고칠 방향: 서버 응답의 id 가 있으면 id 로만 짝짓고, 실패한 글은 시간 비교 없이 cid·text 로 짝짓는다.

---

## 특히 볼 것: 점검 결과 요약
| 항목 | 결과 |
|---|---|
| POST 재시도 중복(회의 만들기, 안건 추가, 채팅) | 중복 가능(M1). 채팅과 안건이 가장 쉽게 생기고, 담당자 비밀번호는 내쫓기까지 한다 |
| 부트 감시가 멀쩡한 페이지를 새로 고침 | 받는 중인 페이지를 10초에 다시 읽고, 세 번째에는 안 지워지는 상자가 남는다(M4) |
| live 재구독 백오프가 화면을 떠난 뒤에도 도는지 | 돌지 않음(PASS). go()·onRole(null) 이 unwire 로 stop 을 부르고, stop 이 타이머를 지우며, 콜백마다 `stopped` 를 본다(api.js:532-558, app.js:399-403·427·490). 다만 토큰이 만료되면 같은 화면 안에서 영영 실패만 되풀이한다(H1) |
| 확인 없이 남의 회의가 지워지는 UI | 없음(확인 창 있음). 회의 중 표시만 없다(L2) |
| 390px 단추 가림 | 360px 에서 「회의 끝내기」, 390px 에서 「전체 화면」이 일부 잘림(L1) |

---

## 다음 기능 설계 메모: 「0번 오늘의 안건」 줄

요구: 안건 목록 맨 위 0번은 늘 「오늘의 안건」 정리 화면이고 모두에게 발표할 수 있다. 실제 안건은 1번부터, 각 줄은 「안건이름(발표하기)」.

지금 구조: 「오늘의 안건」 대기 화면은 `live.aid == null` 일 때 저절로 펼쳐진다(agenda.js waitMode). 실제 안건 번호는 이미 1부터다(agenda.js:197 `i + 1`, viewer.js:780 `i + 1`, agendaNo). 그런데 「모두를 0번으로 데려오기」는 발표 마치기(presenterEnd, 발표자를 비움)밖에 없고, 발표자를 둔 채 aid 를 null 로 보내는 길은 없다.

바꿀 곳(파일:함수):
1. **서버 lib/zzoom/routes.js `POST /:mid/presenter`(506-541)**: `b.today === true`(또는 `aid: '_today'`)를 받는다. live 일 때만 허용하고, `patch = { presenter: { cid, epoch }, live: { aid: null, page: 1, view: {cx:.5,cy:.5,z:1}, rev: rev+1, epoch, forceSeq: forceSeq+1, at } }` 로 둔다. 지금 aid 없는 분기(538줄 `{...m.live, epoch}`)는 화면을 옮기지 않으므로 그대로 두고 새 분기를 더한다. `POST /live`(563)는 aid 가 꼭 필요하므로 손대지 않는다(0번 발표자는 live 를 보내지 않는다). CONTRACTS.md 2절에 이 몸체를 적는다.
2. **api.js `present(mid, aid, page)`(612)**: `present(mid, TODAY)`, 즉 `aid === '_today'` 이면 `{ today: true }` 를 보낸다. 나머지(store 미리 맞추기, acceptLive)는 그대로 둔다. `export const TODAY = '_today'` 를 둔다.
3. **app.js `wireMeeting` 회의 구독(379-392)**: `yieldToPresenter()` 조건이 `l?.aid` 를 요구한다. `(l?.aid || l)` 로 바꿔 aid 가 null 이어도 forceSeq 가 올라가면 다른 사람의 창을 닫고 접게 한다.
4. **agenda.js**
   - `waitMode`: 그대로 두어도 aid null 이면 'full' 이다. 다만 사용자가 「자료 화면 보기」로 닫아 `dismissed` 가 참이면 다시 펼쳐지지 않는다. `render()`(147줄 부근)에 `S.lastForce` 를 두고 `live.forceSeq` 가 올라갔고 `!live.aid` 이면 `S.dismissed = false; S.open = false` 로 한다.
   - `panel()`(164): 목록 `<ol>` 맨 앞에 0번 줄을 넣는 `rowToday(liveOn, l)` 를 더한다. 번호 「0」, 이름 「오늘의 안건」, 회의 중이고 내가 0번 발표자가 아니면 「발표하기」 단추를 둔다. 내가 0번 발표자인지는 `meeting.presenter.cid === role.cid && !l?.aid` 다. 지우기·고치기는 두지 않는다.
   - `row()`(193): 「안건이름(발표하기)」 모양은 `za-main` 의 이름 옆에 `za-present` 를 붙이는 것으로 맞춘다(지금은 줄 오른쪽 `za-actions`). 이름 버튼(나만 보기)과 발표하기 버튼은 따로 둔다. 390px 에서는 지금처럼 이름 아래 줄로 내려간다(agenda.css 767px 규칙).
   - `askPresent(a)`(241): `a === TODAY` 를 받아 `api.present(mid, api.TODAY)` 를 부른다. 확인 창 글(confirmLines)은 그대로 쓴다. 성공 뒤 `S.open=false; S.dismissed=true` 는 0번일 때 하지 않는다(발표자도 0번 화면을 본다).
   - `cmd:present`(417): `aid === '_today'` 를 받는다.
5. **viewer.js**
   - `bandState()`(872): `isPresenter()` 이고 `!S.live?.aid` 이면 새 상태 'today' 로 둔다(「내가 오늘의 안건을 보여 주는 중이에요」, 단추 「발표 마치기」). 참석자는 presenter 가 있고 aid 가 null 이면 「모두 오늘의 안건을 보고 있어요」로, 지금의 'idle'(발표자 없음)과 나눈다. `paintBar()` 에 문구를 더한다.
   - `renderAgenda()`(751): 왼쪽 「쪽 목록」 맨 위에 0번 「오늘의 안건」 항목을 두고, 누르면 `store.emit('cmd:agenda-open')`.
   - `flushLive()`(570): `!S.aid` 이면 이미 보내지 않으므로 그대로 둔다. `stepPage`(86)는 1번 첫 쪽에서 「이전」을 누르면 null 이다. 0번으로 가게 하려면 null 일 때 `cmd:agenda-open` 을 낸다(선택).
   - `applyFull()`(469): 0번 발표 중에는 「이 자료 발표하기」 큰 단추가 뜨지 않는지 본다(지금 조건 `a && !noFile(a)` 라 S.aid 가 남아 있으면 뜰 수 있다). 0번 발표 중이면 숨긴다.
6. **host.js `sync()`(232)**: 「다른 분이 발표 중이에요」는 그대로 둔다. 「발표 가져오기」(askTake → takePresenter)는 aid 를 보내지 않아 0번 상태가 유지된다. 의도와 맞는지 사용자 확인이 필요하다.
7. **chat.js refLabel, record.js 장소 표시**: aid null 은 이미 붙이지 않으므로 바꿀 것이 없다.
8. 시험: agenda.js `waitMode`·`confirmLines` 단위 시험에 0번 경우를 더하고, 서버 시험에 `today:true`(live 아님 409, forceSeq 증가, presenter 유지)를 더한다.

선택 과제: 0번 화면의 스크롤을 발표자와 맞추려면 `live.view.cy` 를 「오늘의 안건」 목록 스크롤 비율로 다시 쓸 수 있다. 그러려면 서버 /live 가 aid null 을 받아야 한다(2단계로 미룬다).

---

결론: FAIL
