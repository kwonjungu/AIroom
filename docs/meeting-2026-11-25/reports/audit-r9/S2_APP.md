# 감사 R9 S2: 화면 앱 흐름 (2026-11-26)

대상: public/zzoom/api.js(request 의 retry·idem 옵션, waits 루프, 큰 본문 대기 간격, keepalive 재시도, live·heartbeat 의 retry:false·idem:false, becomeHost 의 gen 확인, DB_NAME), index.html, host.css, list.js, agenda.js, R8 Q2 지적.
기준 커밋: cdc369f. 운영(https://a-iroom.vercel.app/zzoom)의 api.js·host.css·index.html·list.js·agenda.js 는 sha256 이 HEAD 와 같아 커밋한 그대로 서빙되고 있다. 운영 `/api/zzoom/health` 응답은 `{"ok":true,"firebase":true,"redis":true}` 이다.
코드와 설정은 고치지 않았고 운영 회의도 만들거나 지우지 않았다. `npm run test:zzoom` 132개 통과.
막대 너비 측정: zzoom.css 와 host.css 를 그대로 붙인 시험 화면을 만들고, host.js 의 단추 마크업을 따라 Playwright(Chromium)로 쟀다. Pretendard 는 CDN 에서 불러왔고 맑은 고딕으로도 한 번 더 쟀는데 두 결과가 같았다. 측정 스크립트와 그림은 <임시폴더>/r9/s2/ 에 있다.

---

## 1. R8 Q2 지적 확인

| 지적 | 판정 | 근거 |
|---|---|---|
| N1 keepalive 보내기(회의 시작·끝, 판서 잠금, 녹음)를 다시 보내지 않음 | 고쳐짐 | api.js:96 에서 `!keepalive` 조건이 빠져 setState 도 300ms, 1s 간격으로 3번 보낸다. 같은 요청 표가 붙어 있어 두 번 반영되지 않는다. 탭을 닫을 때 다시 보내지 못하는 것은 최선 노력이라 문제없다 |
| N2 주관자 전환 중 나가도 되살아남 | 고쳐짐 | api.js:305 `if (e?.code === 'aborted' \|\| myGen !== gen) throw e;`. /host 응답 전에 나간 경우는 begin 첫 줄이 quietLeave 하고 aborted 를 던진다. 실시간 로그인 중에 나간 경우는 begin 의 fbSignIn 실패 뒤 catch 가 gen 차이를 보고 되살리지 않는다. catch 로 되살린 뒤 3초 안에 나가는 경우는 leave 가 S 와 타이머를 정리한다 |
| N3 「처리 중」 넘겨받기 기준이 화면 시간 제한보다 짧음 | 고쳐짐(화면 쪽) | 서버 staleMs 는 기본 25초, DELETE 50초, 받아쓰기 70초다(routes.js:129). 화면 시간 제한은 20초, 45초, 60초(api.js:63·128·451)로 모두 서버 기준보다 짧다. 서버 처리 자체가 25초를 넘는 경우는 S1 몫이다 |
| N4 /live 가 다시 여러 번 보내져 발표 화면이 막힘 | 고쳐짐 | sendLive 는 `retry:false, idem:false` 로 한 번만 보내고 6초에 끊는다(api.js:403). 다시 보내기는 viewer.js:612-615 가 최신 몸체로 800ms×횟수 간격으로 한다. 옛 몸체를 다시 보내는 일이 없어졌다 |
| N5 휴대폰 담당자 막대(390px 다섯 줄, 401~448px 「회의 끝내기」 잘림) | 덜 고쳐짐(host.css 는 744475c 뒤로 바뀌지 않음). 아래 2-2 참고 | 401~448px 에서 「회의 끝내기」 잘림은 이번 측정으로 재현되지 않았다. 360px 이하의 상태 글 잘림은 그대로 남아 있다 |
| N6 받아쓰기 조각을 1.5초마다 다시 올림 | 고쳐짐 | 본문이 100KB 를 넘으면 6초 간격으로 묻는다(api.js:91, Blob.size). 받아쓰기는 60초에 끊긴 뒤 서버가 70초에 넘겨받을 때까지 2번 안팎만 다시 올린다 |
| N7 모든 보내기에 Redis 왕복 두 번 | 일부 고쳐짐 | /live 와 /heartbeat 는 표를 붙이지 않는다. /strokes 등 나머지 경로는 그대로인데, 이것은 서버 비용 문제라 S1 몫이다 |
| L3 부트 감시 카운터와 sessionStorage 예외 | 안 고침 | index.html 은 바뀌지 않았다(index.html:18·19·35). 낮음이고 R7 M4-3 의 연장이라 다시 따지지 않는다 |
| L4 늦게 끝난 refresh 실패가 새 자격의 타이머를 20초로 바꿈 | 안 고침 | api.js:252 그대로다. 해는 갱신 한 번 더 하는 것뿐이다(낮음) |

---

## 2. 새로 생긴 문제와 남은 문제

### 2-1. 낮음: heartbeat 재시도를 없앤 뒤, 한 번만 끊겨도 「연결이 잠깐 끊겼어요」 띠가 최대 60초 남음(회귀)
- 파일:줄: api.js:373(`retry: false`), api.js:376(`e.status === 0` 이면 `conn.server='off'`), app.js:265·276(server off 가 2.5초 이어지면 띠를 띄움)
- 무엇이 바뀌었나: 고치기 전에는 heartbeat 한 번이 0.3초, 1초 뒤 다시 보내 학교망의 짧은 끊김을 넘겼다. 지금은 한 번 실패(또는 20초 멈춤)하면 바로 `server: 'off'` 가 된다. `server: 'ok'` 로 되돌리는 곳은 heartbeat 와 health 뿐이다. 그래서 다른 요청(판서, 채팅, 발표)이 잘 되고 있어도 다음 heartbeat(60초 뒤) 또는 탭이 다시 보일 때까지 띠가 남는다. draw.js:725 의 실패한 선 자동 재전송도 이 off에서 ok로 바뀌는 순간에 걸려 있어, 그만큼 늦게 다시 보낸다.
- 재현: 회의 중 와이파이가 1초 끊긴 순간 1분 주기 heartbeat 가 나간다. 바로 다시 이어져도 화면 위쪽에 「연결이 잠깐 끊겼어요. 다시 잇는 중이에요.」가 최대 1분 동안 떠 있다.
- 고칠 방향: heartbeat 가 status 0 으로 실패하면 3~5초 뒤 한 번 더 beat 를 예약한다. 아니면 mcall 이 성공할 때마다 `spatch('conn',{server:'ok'})` 를 한다(spatch 는 값이 같으면 이벤트를 내지 않으므로 비용이 없다).

### 2-2. 낮음: 휴대폰 담당자 막대, 360px 이하에서 상태 글이 막대(64px) 밖으로 넘쳐 잘림(R8 N5 남은 부분)
- 파일:줄: host.css:124-127(400px 이하 `.zh-status{white-space:normal; flex:1 1 0; min-width:0}`), host.css:14(`.zh-spacer{flex:1 1 auto}`), zzoom.css:135-138(막대 높이 64px, overflow-x:auto)
- 잰 값(상태 글이 「다른 분이 발표 중이에요」이고 회의 중일 때. 참여 인원 글은 1023px 이하에서 숨겨진다):

| 너비 | 상태 칸 폭과 높이 | 줄 수 | 막대 scrollWidth | 「회의 끝내기」 오른쪽 끝 |
|---|---|---|---|---|
| 320 | 41px, 188px | 10 | 320 | 304 (보임) |
| 360 | 61px, 75px | 4 | 360 | 344 (보임) |
| 390 | 76px, 56px | 3 | 390 | 374 (보임) |
| 400 | 81px, 56px | 3 | 400 | 384 (보임) |
| 401 | 156px, 48px | 1 | 403 | 387 (보임, 오른쪽 안쪽 여백만 2px 넘침) |
| 412 | 156px, 48px | 1 | 412 | 396 (보임) |
| 430 | 156px, 48px | 1 | 430 | 414 (보임) |
| 448 | 156px, 48px | 1 | 448 | 432 (보임) |

  - 360px: 4줄, 75px 로 64px 막대를 넘어 첫 줄 위쪽과 끝 줄 아래쪽이 잘린다(그림 p360.png 에서 「다른 분」 윗부분이 잘린 것을 확인했다). 「내가 발표 중이에요」는 3줄 56px 라 들어간다.
  - 390px: 3줄(「다른 분이/발표 중이/에요」)로 막대 안에 들어간다. R8 이 적은 「다섯 줄」은 이번 측정에서 재현되지 않았다.
  - 401~448px: 「회의 끝내기」가 모두 화면 안에 있다. R8 이 적은 scrollWidth 449/401 은 재현되지 않았다. host.css 가 그때와 같으므로 R8 시험 화면의 마크업 차이로 보이지만, 무엇이 달랐는지는 확인 못 함.
  - 시작 전(「시작 전이에요」와 「회의 시작하기」) 상태는 320~412px 에서 모두 넘침 없이 들어간다.
  - 여전히 거슬리는 점: 400px 이하에서는 빈칸(.zh-spacer)이 상태 칸과 같은 폭(390px 에서 76px)을 가져간다. 그 탓에 상태 글이 쓸데없이 여러 줄로 쪼개진다.
- 재현: 360px 안드로이드(갤럭시 S 시리즈 기본 크기)에서 담당자로 들어가고 다른 사람이 발표를 시작하면, 막대 왼쪽 상태 글 위아래가 잘려 보인다.
- 고칠 방향: 599px 이하에서 `.zh-spacer{flex-grow:0}` 로 두고, `.zh-status{flex:1 1 auto; white-space:nowrap; overflow:hidden; text-overflow:ellipsis}` 로 한 줄 말줄임을 쓴다.
- 단서: 실제 휴대폰에서 Pretendard 를 받지 못해 기기 기본 글꼴로 그려지면 글자 폭이 달라질 수 있다. 실제 기기에서는 확인 못 함.

### 2-3. 낮음: 서버 DB 이름은 환경변수로 바꿀 수 있는데 화면은 'zzoom' 으로 고정
- 파일:줄: lib/zzoom/fb.js:38(`env.ZZOOM_FIRESTORE_DB || 'zzoom'`), api.js:8(`DB_NAME = 'zzoom'`)
- 무엇이 틀렸나: 지금 운영 값은 둘 다 'zzoom' 이어서 문제가 없다. 운영에 ZZOOM_FIRESTORE_DB 가 들어 있는지는 확인 못 함(비밀값을 읽지 않았다). 앞으로 누군가 이 환경변수로 DB 를 바꾸면, 서버는 새 DB 에 쓰고 화면은 'zzoom' 을 구독한다. 그러면 안건, 채팅, 판서가 하나도 안 보이는데도 오류가 나지 않는다(문서가 없을 뿐 권한 거절이 아니기 때문이다).
- 고칠 방향: `/api/zzoom/health` 나 join 응답에 databaseId 를 실어 화면이 그 값을 쓰게 한다. 아니면 환경변수를 없애고 한 곳의 상수로 둔다.

### 2-4. 낮음: 서울 이전 뒤 옛 회의(kwon)가 목록에서 아무 안내 없이 사라짐
- 파일:줄: lib/zzoom/routes.js:323-340(목록은 'zzoom' DB 만 읽음), routes.js:187(loadMeeting 이 404 not_found)
- 무엇이 바뀌었나: 이전 전에 만든 회의는 목록에 보이지 않는다. 옛 링크(#/m/<id>)로 들어가면 「회의가 없습니다」가 나온다. 운영 kwon 에 실제로 쓰던 회의가 남아 있는지는 확인 못 함. 시험 회의뿐이라면 영향이 없다. 옛 회의의 Storage 파일과 Redis 키를 어떻게 정리하는지는 S1 몫이다.
- 고칠 방향: 실제 회의가 남아 있다면 목록 위에 「11월 26일 전에 만든 회의는 옮겨지지 않았어요」 같은 한 줄 안내를 둔다. 아니면 옮기는 스크립트를 쓴다.

### 2-5. 참고(동작 영향 없음): 주석이 옛 값
- api.js:87 주석에 「서버가 12초(받아쓰기 70초)」가 남아 있다. 지금 서버 기준은 25초이고 DELETE 는 50초다. api.js:84 의 `timedOut` 변수도 여전히 쓰이지 않는다.

---

## 3. 확인했고 문제없던 것
- request 옵션: `retry:false` 이면 tries 가 1이 되고, `idem:false` 이면 표 헤더가 없어 409 in_progress 대기 루프에도 들어가지 않는다(api.js:88 이 헤더가 있을 때만 기다림). 두 옵션을 쓰는 곳은 heartbeat 와 live 뿐이다.
- waits 루프: `a--` 와 `waits < 50` 덕분에 기다리는 동안 재시도 횟수가 줄지 않고, 오래 걸려도 작은 본문은 75초, 큰 본문은 300초에서 끝난다. 실제로는 서버가 25초 또는 70초에 넘겨받으므로 그 전에 끝난다. 다시 묻는 fetch 마다 새 AbortController 와 시간 제한을 둔다.
- keepalive 재시도: setState 본문은 수십 바이트라 keepalive 64KB 한도에 닿지 않는다.
- 서울 DB 와 규칙: 화면이 읽는 경로는 회의 문서 get(onSnapshot)과 하위 컬렉션 agenda, pages, strokes, hands, chat, polls, transcript, 그리고 주관자만 읽는 people 이다(api.js:597-605). 이 경로가 firestore.zzoom.rules 에 모두 있다. 쿼리는 strokes `where pageKey ==` 와 chat `orderBy at` 에 limit 를 붙인 것뿐이라 단일 필드 자동 색인으로 된다. 복합 색인은 필요 없다.
- Storage 규칙(storage.rules:50-)은 Firestore 를 참조하지 않고 토큰 claim 만 본다. 그래서 DB 를 바꿔도 그림을 받는 데 영향이 없다(다중 DB 에서는 규칙이 기본 DB 만 참조할 수 있다는 제약을 피함).
- list.js, agenda.js, index.html 은 R8 뒤로 바뀌지 않았다. 목록 만들기, 고치기, 지우기, 잠금 풀기와 안건 만들기, 바꾸기, 지우기는 모두 같은 요청 표가 붙은 POST/PATCH/DELETE 라 다시 보내도 두 번 반영되지 않는다.
- becomeHost 에서 begin 이 성공한 뒤 나가는 경우: leave 가 gen 을 올리고 S 와 타이머를 정리하며 로그아웃한다. 되살아날 길이 없다.

---

결론: PASS(치명·높음 0)
