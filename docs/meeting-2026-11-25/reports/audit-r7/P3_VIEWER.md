# R7 파트 3 — 화면 보기·발표 따라가기 감사 (2026-11-26)

대상: public/zzoom/viewer.js(1096줄), viewer.css, zzoom.css(body.zz-full), board.js. 관련해서 draw.js(viewport 받는 쪽), api.js(sendLive·request), lib/zzoom/routes.js(/live, /presenter, /presenter/end)도 읽었다.

확인 방법: 코드를 줄 단위로 읽었다. 그리고 실제 viewer.js·viewer.css·zzoom.css를 가짜 store·api로 띄워 Playwright Chromium 145에서 재현했다(스크래치 폴더의 v.py·v2.py·v3.py). 운영 회의는 만들지 않았다.

---

## 찾은 문제

### 1. [높음] 마우스로는 무대 위 단추가 눌리지 않는다: 큰 「이 자료 발표하기」, 「다시 불러오기」
- 위치: viewer.js:662-665 (onDown), 197 (bigPresent), 991-993 (오류 덮개의 다시 불러오기). 단추들은 #zz-stage-overlay 안에 있고, 이 덮개는 #zz-stage 안에 있다.
- 무엇이 틀렸나: 단추에서 일어난 pointerdown이 무대(elStage)까지 올라간다. 펜 모드가 아니고 왼쪽 단추이면 onDown이 `e.preventDefault()`와 `elStage.setPointerCapture(e.pointerId)`를 부른다. 포인터를 붙잡은 상태에서는 Chromium이 click을 붙잡은 대상(무대)에 보낸다. 그래서 단추의 onclick이 불리지 않는다.
- 재현(실측): 회의 중이고 다른 사람이 발표하는 자료를 보는 참석자 상태를 만들었다. 「이 자료 발표하기」를 마우스로 `page.click` 하면 `cmd:present` 이벤트가 0건이다. 같은 구조를 최소 페이지로 만들어도 마우스 클릭은 0회, 손가락 탭은 1회였다.
- 영향: PC(교실 컴퓨터·교무실 PC)에서 오늘 추가한 큰 단추가 아무 반응이 없다. 학교망에서 쪽 그림을 받지 못했을 때 나오는 「다시 불러오기」도 마우스로는 눌리지 않는다. 피하려면 다른 쪽으로 갔다가 돌아와야 한다. 펜(스타일러스)으로 누를 때도 같은지는 확인 못 함.
- 고칠 방향: onDown 맨 앞에서 `if (e.target.closest('button, a, [role="scrollbar"]')) return;`처럼 덮개 위 조작 요소는 건너뛴다. 아니면 덮개 단추에서 pointerdown의 stopPropagation을 한다.

### 2. [보통] 「모두 전체 화면」과 force 표시가 다시 보낼 때 빠진다
- 위치: viewer.js:575-580 (flushLive가 `P.force`와 `P.fullWant`를 보내기 전에 지움), 600-602 (연결 실패 뒤 다시 보내기), 591 (stale_rev 메아리 뒤 다시 보내기).
- 무엇이 틀렸나: `body.full`과 `body.force`는 처음 보낼 때 한 번만 실린다. 실패해서 다시 보낼 때는 `P.dirty = true`만 세우기 때문에 두 값이 빠진 몸통이 나간다.
- 재현(실측): 발표자가 「모두 전체 화면」을 누르고 첫 sendLive가 status 0(network)으로 실패하게 했다. 두 번째 요청은 `{"aid":"a1","page":1,"view":{…}}`였고 full과 force가 없었다. 발표자 화면은 `body.zz-full`이 켜진 채이고 단추도 「전체 화면 끝내기」로 바뀌었다. 그런데 서버 live.full은 그대로여서 참석자 화면은 꽉 차지 않는다. 안내 메시지도 나오지 않는다.
- 학교망: api.js request()는 3초 안에 바로 끊긴 연결만 다시 보낸다. 늦게 실패하거나 20초 시간 초과로 끝나면 이 경로를 탄다.
- 고칠 방향: 실패하면 `P.fullWant`와 `P.force`를 되돌려 놓는다. 예를 들어 catch에서 `if (body.full !== undefined && P.fullWant === undefined) P.fullWant = body.full; if (body.force) P.force = true;`를 넣는다.

### 3. [보통] 부드럽게 따라가기(glideTo)가 끝날 때 내가 방금 한 조작을 덮어쓴다
- 위치: viewer.js:511-522 (glideTo). 애니메이션을 취소하는 곳은 applyLive(530)와 unmount뿐이다. userGo(436), setTarget(410), setView(452), fitPage(447), cmd:nav(1045)는 tween을 멈추지 않는다.
- 무엇이 틀렸나: 0.14초 애니메이션이 도는 동안 사용자가 쪽을 넘기거나 확대·이동해도, 다음 프레임의 tick이 `S.view`를 발표자 view로 다시 덮는다. 마지막에는 `S.view = to`와 `emitPage(false)`로 그 값을 확정한다.
- 재현(실측):
  - (가) 따라가는 중에 발표자 live가 z=3으로 바뀌었다. 곧바로 「다음 ›」을 누르면 2쪽이 쪽 맞춤이 아니라 `view {cx:.3, cy:.3, z:3}`(발표자의 1쪽 확대 상태)로 열린다. store page도 그 값으로 나간다.
  - (나) 애니메이션 중에 휠로 확대했다. follow는 free로 바뀌었는데 최종 view는 발표자 값(z=2, cx=.5)이었다. 내 휠 조작이 사라졌다.
  - 스크롤 막대 끌기와 두 손가락 확대도 같은 함수(setView)를 거치므로 똑같이 덮어써진다.
- 영향: 손으로 넘기거나 확대한 직후 화면이 엉뚱한 배율로 튄다. 발표자가 쪽마다 확대해서 설명하는 회의에서 자주 겹칠 수 있다. 발표자 본인 쪽에서도 409 stale_rev 뒤 applyLive가 돌면 같은 충돌이 생길 수 있다(빈도 낮음).
- 고칠 방향: `stopGlide()` 함수를 만들어 setTarget과 setView 맨 앞(사용자 경로)에서 부른다. 아니면 tick 안에서 `S.follow !== 'follow' || S.aid/page가 바뀜`이면 멈추게 한다.

### 4. [보통] 발표를 따라 보는 모두에게 큰 「이 자료 발표하기」가 늘 떠 있어 자료 아래쪽을 가린다
- 위치: viewer.js:478, viewer.css:165-171 (bottom 32px, 높이 56px, 그림자 있음).
- 무엇이 틀렸나: 이 단추가 숨는 조건은 "내가 이 자료의 발표자"일 때와 펜 모드일 때뿐이다. 그래서 다른 사람 발표를 따라가는 참석자는 회의 내내 무대 아래 가운데에 이 단추를 본다. 발표자가 켠 「모두 전체 화면」 안에서도 마찬가지다(body.zz-full이 이 단추를 숨기지 않는다).
- 재현(실측): 회의 중이고 presenter가 다른 사람이며 live.aid가 지금 보는 자료와 같은 참석자 상태에서 bigPresent.hidden이 false였다.
- 영향: 슬라이드 아래 글이나 표가 가린다. 휴대폰에서 실수로 누르면 발표 넘겨받기 확인 창이 뜬다(확인 창이 있어 실제로 넘어가지는 않는다).
- 고칠 방향: 발표자가 있고 `S.follow === 'follow'`이며 `S.live.aid === a.aid`이면 숨긴다. 즉 남이 발표 중인 자료를 따라 볼 때는 숨기고, 발표자가 없거나 내가 다른 자료를 보고 있을 때만 띄운다. 전체 화면에서도 숨긴다.

### 5. [보통] 연결이 멈추면 발표 화면 보내기가 최대 20초 동안 막힌다
- 위치: viewer.js:573 (`if (P.inflight) { P.dirty = true; return; }`), api.js:63·81 (REQ_TIMEOUT_MS 20000).
- 무엇이 틀렸나: live는 가장 마지막 값만 의미가 있다. 그런데 요청 하나가 멈추면 inflight가 20초 동안 풀리지 않는다. 그동안 발표자가 쪽을 넘겨도 아무것도 보내지 않는다. 시간 초과 뒤 재시도가 3번 다 실패하면 안내 메시지 하나만 띄우고 P.dirty를 지운다(604-605). 그러면 발표자가 다시 움직이기 전까지 지금 화면을 보내지 않는다.
- 재현(코드 근거): 학교망에서 vercel 요청이 멈추면(약 10%) 발표자가 쪽을 넘겨도 참석자는 최대 20초 동안 이전 쪽을 본다. 이 동안 발표자 띠는 "모두가 내 화면을 봐요"로 남는다. 실제 멈춤 빈도는 확인 못 함.
- 고칠 방향: /live 요청에만 짧은 시간 제한(예: 4초)을 두고, 끊기면 최신 view로 다시 보낸다. baseRev가 맞지 않으면 409 메아리 처리로 이미 맞춰진다. 재시도를 다 실패한 뒤에도 P.dirty는 남겨 두고 조금 뒤 다시 보낸다.

### 6. [낮음] 펜 모드에서 스크롤 막대가 무대 오른쪽과 아래 가장자리 입력을 가져간다
- 위치: viewer.css:178-181, 186 (터치 기기에서 22px, z-index 5), viewer.js:247-258, 276 (펜 모드여도 막대를 보임).
- 무엇이 틀렸나: 막대가 #zz-layer-temp(펜 캔버스) 위에 있다. 확대한 상태에서 오른쪽이나 아래 끝 14~22px에서 획을 시작하면 그리기 대신 화면이 한 화면만큼 이동한다. 참석자이면 자유 보기로 바뀐다.
- 재현(코드 근거): 패드에서 펜 모드로 확대한 뒤 오른쪽 끝에서 아래로 획을 그으면 획이 그려지지 않고 막대 빈 곳을 누른 것으로 처리된다.
- 고칠 방향: 펜 모드에서는 막대를 얇게 하고 `pointer-events: none`으로 두어 위치만 보여 준다. 아니면 막대에서 펜(pointerType 'pen') 입력은 받지 않는다.

### 7. [낮음] 전체 화면을 따라 보던 참석자가 확대하거나 넘기면 손짓 도중에 전체 화면이 풀린다
- 위치: viewer.js:467 (`sharedFull() && S.follow === 'follow'`), 434 (userChanged가 free로 바꿈).
- 무엇이 틀렸나: 두 손가락 확대, 두 번 탭, 밀어 넘기기의 첫 움직임에서 free로 바뀌고 body.zz-full이 꺼진다. 그러면 머리줄과 옆칸이 다시 나타나고 무대 크기가 손짓 도중에 바뀐다. 손가락 아래 자료가 튀어 보인다.
- 고칠 방향: 의도한 동작이라면 손짓이 끝난 뒤(pointerup)에 풀거나, 공유 전체 화면은 자유 보기에서도 유지하고 「발표 화면으로 돌아가기」를 쪽 막대에 둔다.

### 8. [낮음] 움직이는 동안 판서 층이 바탕보다 한 프레임 늦다
- 위치: viewer.js:233 (rAF 안에서 viewport를 store에 냄), draw.js:258-260 (받은 뒤 새 rAF를 요청함).
- 무엇이 틀렸나: 바탕은 이번 프레임에 그리고 판서는 다음 프레임에 그린다. glideTo가 0.14초 동안 매 프레임 viewport를 바꾸고 이동·확대할 때도 마찬가지라서, 움직이는 동안 판서가 약 16ms 늦게 따라온다. 멈추면 바로 맞춰지므로 좌표 자체(ox·oy·scale, 약속 4절 식)는 맞다.
- 고칠 방향: 필요하면 draw.js가 viewport를 받았을 때 그 자리에서 바로 그리게 한다.

---

## 문제없음으로 확인한 것
- **스크롤 막대 계산**: paintScroll의 `half = stage/(2·disp)`와 clampView의 axis가 같은 식이다. 손잡이를 맨 아래까지 끌었을 때(실측) 손잡이 아래끝은 막대 끝(577.995/578)이었고, 쪽 아래끝(oy+h=491)은 무대 높이(491)와 같았다. 표시 조건(disp > stage+1)과 clamp 조건(+0.5)은 1px 안쪽 차이뿐이다. 보드는 1600×1000 크기로 막대가 나오고, 자료 없음·안건 없음일 때는 막대를 숨긴다. 손잡이 끌기는 setPointerCapture를 쓰고 `touch-action: none`도 있다. pointerdown에서 stopPropagation을 해서 무대 손짓과 겹치지 않는다.
- **live 보내기 빈도**: 다음 보내기는 응답이 온 뒤 120ms가 지나야 예약된다. 실측(rtt 50ms, 휠 40번)에서 14건을 보냈고 가장 짧은 간격은 140ms(약 7/s)였다. 서버 한도 10/s 안이다. 0ms 경로는 force(전체 화면, cmd:force)일 때뿐이다.
- **발표자 본인 메아리**: api.acceptLive가 같은 epoch에서 rev가 더 낮은 스냅숏을 버린다(api.js:386). 그래서 늦게 온 옛 live가 발표자 화면을 되돌리지 않는다. 같은 값이면 liveMatchesSent로 걸러진다.
- **전체 화면 해제**: /presenter/end와 「발표하기」(aid를 줄 때)는 live를 새로 만들어 full을 지운다. 그래서 발표를 마치거나 넘기면 모두 풀린다. 발표자가 바뀌면 rolesChanged가 FS.mine을 지우고 실제 브라우저 전체 화면도 나간다. 회의가 끝나면 meetingLive가 false가 되어 풀린다. Esc로 브라우저 전체 화면을 나가면 fullscreenchange에서 꽉 찬 화면도 함께 끈다. 모달(z 60)은 전체 화면(z 50) 위에 뜨고, 쪽 막대와 펜 막대는 남는다.
- **정리(unmount)**: offs(store 구독, window·document 이벤트, ResizeObserver), timers, rAF·tween, IntersectionObserver, 쪽 막대·큰 단추·스크롤 막대 DOM, body.zz-full, 실제 전체 화면, 캐시를 모두 푼다. 비동기 결과는 `dead` 표시와 loadSeq로 버린다. 누수는 찾지 못했다.
- **board.js**: 바탕 그리기는 ctx에 상태를 남기지 않는다(save/restore). 「+ 새 쪽」은 store page의 aid로 판단하는데, viewer가 쪽이 바뀔 때 page를 바로 낸다(emitPage(true)).

결론: FAIL
