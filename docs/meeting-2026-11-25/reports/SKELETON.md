# 보고서: 1.5단계 통합 뼈대

작성 2026-11-25, 통합 담당. 커밋·푸시 안 함. 다른 팀 파일(lib/zzoom, rules, convert, 두 SPA, 팀 모듈, tests/zzoom 기존 파일)은 읽기만 했다.

## 만든 파일

| 파일 | 내용 |
|---|---|
| `docs/meeting-2026-11-25/CONTRACTS.md` | 팀 약속: 모듈 모양, api 함수표, store 키·명령 이벤트 표, DOM 자리 id 나무, CSS 변수·접두사, 순수 함수 예외 2개, 라우팅, 팀별 소유·사용표, 서버와의 차이 |
| `public/zzoom/index.html` | 자리 id 35개 전부, Pretendard(jsDelivr v1.3.9), `app.js` 모듈 |
| `public/zzoom/app.js` | store, 라우팅(`/zzoom`, `#/m/<mid>`), 로그인 안내, health 확인, 팀 모듈 늦은 불러오기(없으면 「준비 중」), 역할에 따라 붙이고 떼기, Firestore 구독을 store 에, 옆칸 탭·배지·서랍, 모달·토스트, 상태 표시 |
| `public/zzoom/api.js` | 서버 경로·모양을 한 곳에. `ZzError`, 입장·resume·becomeHost(새 pt 교체)·refresh(50분 자동)·heartbeat(60초·visibilitychange·pagehide sendBeacon)·BroadcastChannel 탭 복제 감지, 회의 API 전부, convert+업로드(허가→Storage put 동시 3·재시도 2→commit), Firebase 앱 `'zzoom'` inMemory + DB `kwon` 구독 9종, Storage getBlob 그림 캐시 |
| `public/zzoom/zzoom.css` | DESIGN_BRIEF 변수 그대로 + 판서 색·간격·둥글기 변수, 자리 배치, 공통 부품, 768px 미만 서랍 |
| `public/zzoom/vendor/perfect-freehand-1.2.3.mjs` | npm 1.2.3 `dist/esm/index.mjs`(원본 sha256 `a02e221f…3d46c`) 앞에 MIT 고지 주석. 원본 코드 그대로, 끝의 sourceMappingURL 주석만 뺌(.map 없음) |
| `tests/zzoom/e2e_skeleton.py` | Python Playwright, 엣지(`channel='msedge'`)와 크로미움 둘 다 |

## 시험

`PORT=3297 node server.js`(Redis·Firebase 없음) 뒤 `python tests/zzoom/e2e_skeleton.py http://127.0.0.1:3297`

| 브라우저 | 결과 |
|---|---|
| 엣지 158.0.4370.33 | 통과 6 / 실패 0 / 콘솔 오류 0 |
| 크로미움 145.0.7632.6 | 통과 6 / 실패 0 / 콘솔 오류 0 |
| 합계 | 통과 12, 실패 0 |

시험 6가지: 토큰 없음 안내와 `/` 링크, 서버 설정 없음(실제 health `ok:false`) 목록 안내·요청 안 보냄, 같은 상태에서 회의 틀과 자리 id 35개, 설정 있음 흉내(health·meetings 가로챔)에서 목록 모듈, 회의 화면 조립과 viewer↔host 역할 바꿈·`is-pen`·옆칸 탭·배지·토스트·떼기, 600px 폭 서랍과 가로 넘침 없음. 콘솔 오류와 HTTP 400 이상 응답을 모두 셈.

마지막 실행 때는 디자인 팀 파일 11개가 이미 다 있어서 빈 모듈 대체는 0개였다(그래서 ctx 모양·모달 확인 부분은 이번엔 건너뜀. 팀 파일이 없을 때만 빈 모듈이 ctx 를 잡는다). 팀 파일이 고쳐지는 중이라 결과가 바뀔 수 있다.

## 디자인 팀이 알아야 할 것

- 팀 CSS 는 모듈에서 `export const css = 'viewer.css'` 로 알린다. app.js 가 HEAD 로 `text/css` 인지 본 뒤에만 붙인다(없는 css 로 콘솔 오류가 나던 것을 막음, 시험 중 실제로 host.css·viewer.css 가 아직 없을 때 났음).
- 서버 설정이 없으면 `list.js`·`join.js` 를 붙이지 않는다. 팀 모듈 안에서 health 를 다시 볼 필요 없다.
- 입장 전 `#zz-join` 은 app 이 보이고 숨긴다. join.js 는 `api.join` 만 부르면 되고 그 뒤 store `role` 로 나머지가 붙는다.
- 진행 상태 보내기 `api.sendLive` 는 baseRev·epoch 를 store 에서 알아서 채우고 409 면 `live` 를 최신으로 바꿔 둔다.
- 좁은 화면 안건 목록은 2팀이 `#zz-agenda` 에 `data-open` 을 붙이면 왼쪽 덮개로 열린다.
- 시험·디버그용으로 `window.__zzoom = {store, api}` 를 열어 두었다. 화면 기능에서는 쓰지 않는다.

## 정한 것

- 로컬 static 은 없는 파일에 404 + `text/html` 을 준다. 그래서 css 는 HEAD 로 형식까지 본다.
- Firebase SDK 는 codocs 와 같은 gstatic 10.12.0 을 늦게 불러온다(입장할 때만). 그래서 목록·틀 화면은 Firebase 없이 뜬다.
- 획 구독은 복합 색인을 피하려고 `pageKey ==` 하나로 묻고 seq 정렬은 브라우저에서 한다.
- `uploadAgenda` 는 서버 kind 를 확장자로 다시 정한다(변환기는 hwpx 도 'hwp' 로 줌). gif·bmp·avif·heic 은 쪽 그림만 올리고 원본은 뺀다. hwp·hwpx 원본은 `application/octet-stream`.

## 남은 일

- 실제 Firebase(맞춤 토큰 로그인, onSnapshot, getBlob, uploadBytes)는 서비스 계정이 없어 한 번도 돌리지 못했다. 3단계 통합에서 Preview 로 확인해야 한다.
- 탭 복제 감지(K3), heartbeat sendBeacon, 토큰 50분 갱신은 코드만 있고 실제 서버로 시험하지 않았다.
- 없는 css 를 HEAD 로 확인할 때 그 HEAD 404 자체가 콘솔에 남는지는 이번 실행에서 확인하지 못했다(그때는 팀 css 가 다 있었음).

## 요청

- 통합 단계(Claude): C 팀 요청대로 CSP 를 쓸 경우 `www.gstatic.com`(Firebase SDK), `cdn.jsdelivr.net`(Pretendard·변환기), `unpkg.com`, `firebasestorage.googleapis.com`·`firestore.googleapis.com`·`identitytoolkit.googleapis.com`·`securetoken.googleapis.com` 를 허용해야 한다. 지금 server.js 에는 CSP 가 없다.

---

## 덧붙임: D2 요청 4건 반영 (2026-11-25, 진행 중 저장)

| # | 요청 | 고친 곳 |
|---|---|---|
| 1 | 도구 막대가 따라가기 띠를 가림 | `app.js` 가 `#zz-follow-bar` 높이를 ResizeObserver·MutationObserver 로 재서 `#zz-center` 의 `--zz-follow-h` 에 넣고, `zzoom.css` 가 `#zz-toolbar` top 을 `띠 높이 + 12px` 로 |
| 2 | 820px 에서 무대 240px | `zzoom.css` 1024px 미만: 그리드 한 칸(무대 폭 전부), `#zz-agenda` 는 왼쪽 덮개(`data-open`), `#zz-side` 는 오른쪽 덮개(닫으면 밖으로). 768~1023px 에는 머리줄에 app 소유 「안건 목록」 단추 `#zz-agenda-toggle`(768 미만은 2팀 쪽 막대 「안건」 단추). 넓은 화면에서 좁아지면 덮개를 닫음 |
| 3 | live 되감기 | `api.acceptLive(next)`: 같은 epoch 에서 rev 가 더 낮으면 버리고, 같으면 이벤트도 안 냄. Firestore 스냅숏(app.js), `sendLive` 성공 응답, 409 `extra.live` 셋 다 이 함수로만 store 에 넣음 |
| 4 | 좁은 화면 서랍이 처음 열림 | 처음 상태를 1024px 미만이면 닫힘으로(768 미만은 탭 줄만 보이는 아래 서랍) |

같이 고친 것(스크린샷 보고 찾음): 390px 에서 머리줄 칩이 두 줄로 꺾임 → 칩 `nowrap`, 768 미만은 진행·녹음 칩만 남김. 390px 에서 쪽 막대 칸이 좁아 「다음」이 2팀 칸 안에서 밀려 안 보임 → 768 미만 쪽 막대를 두 줄(윗줄 쪽 넘기기, 아랫줄 새 쪽과 손들기)로.

시험(진짜 app.js + 팀 모듈 11개 전부, health 만 흉내, scratch `layout_real.py`): 엣지 158·크로미움 145 × 1280·820·390 = 6가지, **통과 68 / 실패 0**, 콘솔 오류 0. 항목: 옆칸 처음 상태, 1024 미만 무대 폭 95% 이상, 가로 넘침 없음, 「다음」 단추가 화면 안, 쪽 막대 단추끼리 안 겹침, 자유 보기 띠와 도구 막대 안 겹침, 돌아가기 단추 보임, 옆칸 단추, 안건 덮개 열림, acceptLive(옛 rev 무시·새 rev 반영·새 epoch 반영). 스크린샷(직접 봄): scratch `skelshots\{edge,chromium}_{1280,820,390}_{1_follow,2_free,3_side,4_agenda}.png`.

`python tests/zzoom/e2e_skeleton.py http://127.0.0.1:3297` 다시 돌림(팀 파일 11개 진짜로 조립): 엣지 158 통과 6 / 실패 0, 크로미움 145 통과 6 / 실패 0, 콘솔 오류 0, 합계 **12 / 0**.

CONTRACTS.md 도 고침: 4절 1024px·768px 배치와 `--zz-follow-h`, 2-3절 `acceptLive`(팀이 store `live` 를 직접 set 하지 않음).

### 2팀에 알림(요청)
- 768~1023px 의 안건 덮개는 머리줄 app 단추가 연다. 2팀 「안건」 단추(`.zv-only-narrow`)는 지금처럼 768 미만에서만 보이면 된다. 둘 다 `data-open` 만 쓰므로 바깥 누르기·Esc 닫기는 그대로 동작한다.
- api.js 캐시·LRU 는 비용 줄이기 취소 지시에 따라 하지 않았다.

---

## 덧붙임 2: 화면 감사 R1 통합 몫 (진행 중 저장)

| 지적 | 고친 곳 | 어떻게 |
|---|---|---|
| U02 중요 | `api.js` begin·join·resume·becomeHost·leave | 세대 번호 `gen`. `leave` 가 올리고, 입장 도중 세대가 바뀌면 늦게 끝난 begin 은 S·heartbeat·갱신 예약을 남기지 않고 그 자격으로 「나감」 sendBeacon, Firebase 로그아웃, `aborted` 를 던진다(app.js 는 seq 가 달라 무시) |
| U14 사소 | `zzoom.css` | 1024px 미만 오른쪽 덮개 아래끝을 쪽 막대 위(주관자면 + 주관자 막대)로. ✋ 손들기·쪽 넘기기가 옆칸을 연 채로도 눌린다 |
| U07 사소(store 쪽) | `api.js` pollTally | 응답이 온 뒤 내 자격이 host 가 아니면 숫자 대신 403 `host_only` 를 던진다. poll.js 쪽 `resultView` 역할 확인은 4팀 몫 |
| FIX_ENGINE 10-4 | `api.js` uploadAgenda | 허가 응답의 업로드 전용 출입증 `permit.token` 으로 `signInWithCustomToken` 한 뒤 `uploadBytes`. 끝나면(성공·실패·취소 모두) 보통 토큰으로 돌아감: 업로드 중 50분 갱신이 오면 그 토큰을 보류했다가 쓰고, 없으면 `/refresh`. 출입증 `tokenUntil` 30초 전이면 「다시 올려 주세요」. 업로드는 한 번에 하나씩 줄 세움(로그인이 앱 하나를 같이 쓰므로). 원본은 서버 형식표대로 모든 확장자를 올리고 형식은 `permit.originalTypes` 를 따름 |
| U01 사소 | `api.js` refresh | 응답 뒤 S 가 없거나 다른 회의면 그냥 끝 |
| U06 사소(api 쪽) | `api.js` spatch | `conn` 등은 값이 실제로 바뀔 때만 이벤트. 60초마다 같은 `server:'ok'` 로 draw.js 재시도가 다시 도는 일이 없어짐(draw.js 의 prev 비교는 3팀 몫) |
| U08 사소 | `api.js` 그림 캐시 | 받는 중인 그림은 releaseImages 가 건드리지 않음. keep 에 URL 또는 Storage 경로 둘 다 받음 |
| U11 사소 | `api.js`·`app.js`·`index.html` | 뼈대 문구를 「~어요」로. 업로드 실패에 파일 이름 대신 「n쪽 그림」「n쪽 미리보기」「원본 파일」 |
| U13 사소 | `api.js` begin·join | 실시간 로그인 실패면 S·타이머를 비우고 자격은 남김. 다시 「입장하기」를 누르면 같은 자격으로 resume 부터(cid 가 늘지 않음) |

손대지 않음: list.js, lib/zzoom/routes.js(조정 담당이 고치는 중), 팀 모듈과 팀 시험.

### R1 결과 (끝)

- 덧붙여 D5 요청: `setState` 에 fetch `keepalive: true`(request 에 keepalive 선택지). 탭을 닫는 순간의 녹음 멈춤 알림도 나간다.
- `CONTRACTS.md` 갱신: uploadAgenda(업로드 출입증 로그인·차례 처리), releaseImages(keep 에 경로, 받는 중 그림 제외), pollTally(host_only), setState(keepalive).
- 고친 방식은 기존 줄 수정 위주. 새로 생긴 것은 api.js 안의 내부 함수(`quietLeave`, `uploadOne`)와 변수(`gen`, `uploading`, `uploadChain`)뿐이고 내보내는 함수 이름·인자는 그대로다.

| 시험 | 결과 |
|---|---|
| `node --check` api.js·app.js | 통과 |
| R1 전용 시험(가짜 서버·가짜 Firebase SDK, 엣지 158·크로미움 145): U02 입장 직후 나가기, U13 로그인 실패 뒤 재입장, 업로드 출입증으로 모든 uploadBytes·끝나고 보통 토큰 복귀·hwpx 원본 형식, U07 강등 뒤 집계 거절, 콘솔 오류 | 26 / 0 |
| `layout_real.py` 1280·820·390 두 브라우저 + U14(820 에서 옆칸 연 채 손들기 단추가 elementFromPoint 로 맞는지) | 70 / 0 |
| `tests/zzoom/e2e_skeleton.py` | 12 / 0, 콘솔 오류 0 |

스크린샷 `edge_820_3_side.png` 로 옆칸이 쪽 막대 위에서 끝나 「손들기」가 보이는 것을 눈으로 확인했다(390 좁은 화면은 아래 서랍이라 원래 겹치지 않음).

#### 요청(다른 팀 몫, 손대지 않음)
- d2·draw·d4 시험 하네스: 1024px 미만에서는 옆칸이 처음에 닫혀 있고(`body.side-closed`) 안건 목록은 덮개(`#zz-agenda[data-open]`, 768~1023 은 `#zz-agenda-toggle`)다. 옆칸 단추를 누르거나 덮개를 연 뒤 찾도록 각 팀이 고쳐 주세요.
- 4팀 poll.js: 결과 보기도 `role` 이 host 일 때만(U07 화면 쪽). 3팀 draw.js: `conn` 이전 값과 비교(U06 화면 쪽). U03·U04·U05·U09·U10·U12 는 각 팀 몫.
- `tests/zzoom/d5_fake_api.js` 는 바뀐 인자가 없어 그대로 써도 된다. 업로드 출입증 흐름을 흉내 내려면 `startUpload` 응답에 `token`·`tokenUntil`·`originalTypes` 를 넣으면 된다.
- 커밋하지 않았다.
