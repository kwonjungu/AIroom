# 쭘 화면 약속 (CONTRACTS) — 디자인 1~5팀 공통

작성 2026-11-25, 통합 담당. 근거는 `DESIGN.md`(A-2·B-1·D·E·F·G·I·K), `DESIGN_BRIEF.md`, 서버 API `reports/S.md` 4절, 변환기 `reports/C.md`.
**이 문서가 팀 사이의 유일한 약속이다.** 여기 없는 것이 필요하면 고치지 말고 보고서에 「요청」으로 적는다(통합 담당이 넣는다).

파일 위치는 모두 `public/zzoom/`, 주소는 `/zzoom/<파일>`. ES 모듈, 빌드 없음.

---

## 0. 한눈에

```
index.html ─ app.js(통합) ─┬─ api.js   서버(/api/zzoom)·Firebase(앱 'zzoom', DB kwon)·업로드·heartbeat
                           ├─ store    상태 하나 + 이벤트 (app.js 안)
                           └─ 팀 모듈 mount(ctx) ─ list·join(1) viewer(2) draw·board(3) chat·hands·poll(4) host·upload·record(5)
```

- 팀 모듈은 **서로 import 하지 않는다.** 서로 할 말은 store 이벤트로 한다. 예외는 6절의 순수 함수 두 개뿐.
- 팀 모듈은 **fetch·Firebase 를 직접 부르지 않는다.** 전부 `ctx.api` 로.
- 팀 모듈은 자기 자리(DOM id) 안에만 그린다. 다른 자리 요소를 찾거나 고치지 않는다.
- 기기: 엣지·크롬 PC, 갤럭시탭 크롬(우선순위 순, 2026-11-25 사용자 결정으로 사파리보다 엣지 우선). Pointer Events.

---

## 1. 모듈 모양

```js
// 예: public/zzoom/viewer.js
export const css = 'viewer.css';           // 선택. 있으면 app.js 가 <link> 를 붙인다(없는 css 를 부르지 않게)
export function mount(ctx) {
  const root = ctx.el('zz-stage');         // 자기 자리
  const off = ctx.store.on('live', onLive); // 구독은 반드시 풀 것
  return { unmount() { off(); root.replaceChildren(); } };
}
```

| ctx | 모양 | 설명 |
|---|---|---|
| `ctx.api` | 2절 | 서버·Firebase 함수 모음(api.js 그대로) |
| `ctx.store` | 3절 | 상태 하나 + 이벤트 |
| `ctx.el(id)` | `(id) => HTMLElement` | 4절 자리 id 의 요소. 없으면 오류(오타를 바로 알게) |
| `ctx.t(문구, vars?)` | `('안건 {n}', {n:3}) => '안건 3'` | 문구 자리. 지금은 `{이름}` 치환만 한다(나중에 다국어 자리) |
| `ctx.assets(이름)` | `('icon-pen') => '/zzoom/assets/icon-pen.webp'` | 에셋 주소. 목록은 `ASSETS.md` |
| `ctx.modal(opts)` | `({title, body:Node, actions?:[{label, primary?, onClick}], onClose?}) => {el, close()}` | 공용 모달. `zz-modal-root` 에 app.js 가 만든다. 팀이 `zz-modal-root` 를 직접 만지지 않는다 |
| `ctx.toast(text, kind?)` | `kind: 'info'|'ok'|'warn'|'error'` | = `store.emit('toast', {text, kind})` |
| `ctx.mid` | 문자열 또는 `null` | 회의 화면이면 회의 id |

- `mount` 는 동기로 돌려준다(안에서 비동기를 해도 됨). `unmount` 는 타이머·구독·창 이벤트(`window`, `document`)를 전부 풀어야 한다. 라우트가 바뀌거나 역할이 바뀌면 app.js 가 부른다.
- 모듈 파일이 아직 없으면 app.js 는 그 자리에 「준비 중」만 두고 넘어간다(다른 모듈은 정상).
- 모듈이 던진 오류는 app.js 가 잡아 콘솔 경고 + 토스트로 알리고 다른 모듈은 계속 돈다.

### 언제 무엇이 붙나 (app.js)

| 화면 | 언제 | 붙는 모듈 |
|---|---|---|
| `/zzoom` 목록 | 로그인 토큰 있음 | `list.js` |
| `/zzoom#/m/<mid>` 회의 | 화면 틀을 만든 직후 | `join.js` (입장 전 이름 고르기, 입장 뒤 머리줄 내 이름·「주관 코드 넣기」) |
| 〃 | 입장 성공(`role` 이벤트 첫 값) | `viewer.js`, `draw.js`, `board.js`, `chat.js`, `hands.js`, `poll.js`, `record.js` |
| 〃 | `role.role === 'host'` 일 때만 | `host.js`, `upload.js` (viewer 로 내려가면 unmount) |
| 로그인 토큰 없음 | | 모듈 없음. app.js 가 「백암이에서 먼저 로그인해 주세요」 + `/` 링크 |
| 서버 설정 없음(`health.ok === false`) | | 화면 틀은 그대로, app.js 가 안내 띠 `zz-notice`. **`list.js`·`join.js` 를 붙이지 않는다**(입장·목록 요청이 나가지 않게). 목록 자리에는 app.js 가 빈 화면 안내 |

`record.js` 는 모두에게 붙는다: 참석자는 「● 녹음 중」 표시와 `zz-side-log`(대화 기록 보기)만, 주관자는 ⏺ 버튼(`zz-hostbar-record`)까지.

---

## 2. `api.js` 함수 목록

`import * as api from '/zzoom/api.js'` (팀은 `ctx.api` 로 쓴다). 모든 함수는 Promise. 실패는 **`ZzError`** 를 던진다.

```js
class ZzError extends Error { status; code; message; extra }  // 서버 {error, message, ...} 그대로
// status 0 + code 'network' = 연결 끊김, code 'login_required' = 백암이 토큰 없음/만료
```
`message` 는 한국어라 화면에 그대로 써도 된다. 409 `stale_rev`·`not_presenter` 의 `extra.live`, 409 `stale_epoch` 의 `extra.epoch` 처럼 추가 값은 `e.extra` 에.

### 2-1. 백암이·목록 (회의 밖)

| 함수 | 서버 | 돌려줌 |
|---|---|---|
| `authToken()` | — | `localStorage.airoom_auth_token` 또는 `null` (동기) |
| `health()` | `GET /health` | `{ok, firebase, redis}` (실패해도 던지지 않고 `{ok:false}`) |
| `listMeetings()` | `GET /meetings` | `{meetings:[{id,title,startsAt,status,agendaCount,expiresAt,daysLeft,allowRecording,hostLocked?}], isAdmin}` |
| `createMeeting({title, startsAt, hostCode, allowRecording})` | `POST /meetings` | `{meeting}` |
| `updateMeeting(mid, {title?, startsAt?, allowRecording?, hostCode?})` | `PATCH /meetings/:mid` | `{meeting, codeChanged}` |
| `deleteMeeting(mid)` | `DELETE /meetings/:mid` | `{deleted, queued}` |
| `unlockHost(mid)` | `POST /meetings/:mid/unlock` | `{ok}` |
| `staffNames()` | `GET /api/staff` | `['이름', …]` (실패하면 `[]`). 입장 이름 고르기용 |
| `rememberedName()` / `rememberName(n)` | — | `localStorage.airoom_ws_name` 읽기·쓰기 (동기) |

### 2-2. 입장·자격 (회의 안)

| 함수 | 하는 일 |
|---|---|
| `join(mid, name)` | `POST /:mid/join` → 참가 자격 저장(`sessionStorage['zzoom_pt:'+mid]`) → Firebase 앱 `'zzoom'`(inMemory) `signInWithCustomToken` → 토큰 갱신 예약 → heartbeat 시작 → store `role`·`meeting` 설정. 돌려줌 `{cid, name, role, meeting}` |
| `resume(mid)` | 새로고침 때. 저장된 자격으로 `/refresh` → 로그인 → 위와 같이 시작. 자격이 없거나 401·403·404 이면 `null`(그러면 join 화면) |
| `becomeHost(mid, code)` | `POST /:mid/host` → **새 pt 로 바꿔 저장**, 새 토큰으로 다시 로그인, store `role` 갱신. 틀리면 `ZzError` 403 `wrong_code`(`extra.left`), 429, 423 |
| `refresh(mid)` | `POST /:mid/refresh` → 새 토큰으로 로그인. **토큰 발급 50분 뒤 자동**(맞춤 토큰 1시간). 코드가 바뀐 host 는 여기서 viewer 로 내려가고 store `role` 이 바뀐다 |
| `leave(mid)` | 구독·heartbeat·타이머 정리, Firebase 로그아웃. 자격은 남긴다(새로고침 대비) |
| `session(mid)` | 지금 자격 `{cid, name, role, exp, until}` 또는 `null` (동기) |

- **heartbeat**(api.js 가 혼자 한다): 60초마다 `POST /:mid/heartbeat`, 탭이 다시 보이면(`visibilitychange`) 바로 한 번, `pagehide` 에 `sendBeacon` 으로 `{pt, leaving:true}`. 응답 `counts` 는 store `meeting.counts` 와 별도로 `store.set('counts', …)`.
- **탭 복제 감지(K3)**: `join`·`resume` 은 시작 전에 `BroadcastChannel('zzoom')` 로 같은 `cid` 를 쓰는 탭이 살아 있는지 묻는다(300ms). 있으면 저장된 자격을 버리고 새로 `join` 한다(이름은 그대로). 팀은 신경 쓰지 않아도 된다.
- 자격 오류(401 `pt_*`, 403 `pt_other_meeting`)가 회의 API 에서 나오면 api.js 가 자격을 지우고 store `role` 을 `null` 로 → app.js 가 다시 입장 화면을 띄운다. 410 `meeting_gone` 은 store `meeting` 을 `{gone:true}` 로.

### 2-3. 회의 API (모두 `X-Zzoom-Pt` 자동, 첫 인자 `mid`)

| 함수 | 서버 | 쓰는 팀 |
|---|---|---|
| `setState(mid, action, value?)` action `'start'|'end'|'penLock'|'recording'` | `POST /:mid/state` | 5(시작·끝·녹음), 3(판서 잠금 단추는 5의 막대에) |
| `takePresenter(mid)` | `POST /:mid/presenter` | 5 |
| `sendLive(mid, {aid, page, view, force?})` | `POST /:mid/live` | 2(진행자 화면), 5(「모두 내 화면으로」는 `cmd:force` 로 2에 부탁) |
| `startUpload(mid, {kind, pages, bytes, ext?})` | `POST /:mid/uploads` | (보통은 아래 `uploadAgenda` 하나로 충분) |
| `commitUpload(mid, uploadId, {title, pages, sizes, originalName?})` | `POST …/commit` | 〃 |
| `convertFile(file, {onProgress, signal})` | `convert/index.js` 의 `convert()` 를 늦게 불러 부름 | 5 |
| `uploadAgenda(mid, {file, converted, title, onProgress, signal})` | 허가 → Storage 직접 put(동시 3, 실패 쪽 2번 재시도) → commit | 5 |
| `updateAgenda(mid, aid, {title?, index?})` / `deleteAgenda(mid, aid)` | `PATCH`·`DELETE /:mid/agenda/:aid` | 5 |
| `createBoard(mid, bg?)` / `addBoardPage(mid, aid)` | `POST /:mid/boards` | 3 |
| `saveStrokes(mid, strokes[])` (1~20개) | `POST /:mid/strokes` | 3 |
| `deleteStroke(mid, sid)` | `DELETE /:mid/strokes/:sid` | 3 |
| `clearPage(mid, pageKey)` | `POST /:mid/pages/:pageKey/clear` | 3 |
| `sendChat(mid, text, ref?)` / `deleteChat(mid, id)` | `POST`·`DELETE /:mid/chat` | 4 |
| `setHand(mid, up)` / `lowerHand(mid, cid)` / `lowerAllHands(mid)` | `POST /:mid/hand` | 4 |
| `createPoll(mid, {q, options?, anonymous?})` | `POST /:mid/polls` | 4 |
| `vote(mid, pid, optionId)` / `myVote(mid, pid)` | `POST …/vote` / `GET …/mine` | 4 |
| `pollTally(mid, pid)` / `closePoll(mid, pid)` / `revealPoll(mid, pid)` | `GET …/tally` / `POST …/close` / `POST …/reveal` | 4 |
| `transcribe(mid, blob, {n, at, aid, page})` | `POST /:mid/transcribe?n=&at=&aid=&page=` (본문 = 소리 그대로) | 5 |
| `exportMd(mid)` | `GET /:mid/export.md` → 파일 받기까지 한다 | 5 |

`acceptLive(live)`: store `live` 에 넣는 유일한 길. 같은 epoch 에서 rev 가 더 낮은(늦게 온 옛) 값은 버리고 `false`, 바뀐 것이 없으면 이벤트도 내지 않는다. Firestore 스냅숏·`sendLive` 응답·409 `extra.live` 가 모두 이것을 거친다. 팀은 store `live` 를 직접 `set` 하지 않는다.

`uploadAgenda` 세부:
- `converted` = `convertFile()` 결과 `{kind, pages:[{blob,w,h,type}], thumbs:[Blob], warnings}`. 쪽·썸네일이 `image/webp` 가 아니면(WebP 못 만드는 브라우저) `ZzError(0,'webp_unsupported')`.
- 서버 `kind` 는 파일 확장자로 정한다: `pdf·hwp·hwpx·pptx` 그대로, 그림은 `image` + `ext`(png·jpg·jpeg·webp). 그 밖의 그림(gif·bmp·avif·heic)은 쪽 그림만 올리고 원본은 올리지 않는다.
- 원본 형식: pdf `application/pdf`, pptx `application/vnd.openxmlformats-officedocument.presentationml.presentation`, hwp·hwpx `application/octet-stream`, 그림은 그 그림 형식.
- `onProgress({phase:'upload'|'commit', done, total})`. `signal` 로 취소하면 commit 하지 않는다(올린 조각은 서버가 24시간 뒤 정리).
- 돌려줌 `{aid, agenda}`.

### 2-4. 실시간 구독 (Firestore `kwon`, 컬렉션 `zzoom_meetings/{mid}/…`)

모두 `(…, cb) => unsubscribe` (동기로 해제 함수를 돌려줌). Firebase 로그인 전이면 로그인 뒤 자동으로 붙는다.
**app.js 가 이미 store 에 넣어 주는 것**(팀은 store 를 들으면 됨): meeting, agenda, hands, chat, polls, transcript, people(host 만).
팀이 직접 부르는 것은 쪽 단위 두 가지뿐:

| 함수 | 콜백 값 | 쓰는 팀 |
|---|---|---|
| `subscribeStrokes(mid, pageKey, cb)` | `cb([{id, pageKey, aid, page, epoch, tool, color, w, pts, cid, name, at, seq, group?, part?}])` 그 쪽 전체, **seq 오름차순**. epoch 는 걸러 주지 않는다(받는 쪽이 현재 epoch 만 그림) | 3 |
| `subscribePageEpoch(mid, pageKey, cb)` | `cb(epoch 숫자, 문서 없으면 0)` | 3 |

store 로 오지 않는 낮은 단계 구독(필요할 때만): `subscribeMeeting`, `subscribeAgenda`, `subscribeHands`, `subscribeChat`(최근 200), `subscribePolls`, `subscribeTranscript`, `subscribePeople`.

### 2-5. 그림(Storage)

| 함수 | 설명 |
|---|---|
| `pageImageUrl(agenda, page, {thumb?})` | `${agenda.base}/p001.webp`(썸네일 `t001.webp`)를 `getBlob()` → object URL. 같은 것은 캐시. `kind:'board'` 면 `null` |
| `releaseImages(keep?)` | 캐시 object URL 해제. `keep` = 남길 URL 배열 |
| `originalBlob(agenda)` | 「원본 받기」용 Blob(`agenda.original` 없으면 `null`) |
| `downloadOriginal(agenda)` | 위 Blob 을 원래 파일 이름으로 내려받기까지 함. 돌려줌 `true/false` |

`getDownloadURL()` 은 쓰지 않는다(B-3). 받는 중 새 쪽으로 바뀌면 받는 쪽(2팀)이 요청 번호를 비교해 옛 결과를 버린다.

---

## 3. `store`

```js
store.get(key)            // 지금 값
store.set(key, value)     // 값 바꾸고 key 이벤트 (같은 값이어도 냄)
store.patch(key, partial) // 객체 값에 합쳐 넣고 key 이벤트
store.on(key, fn)         // fn(value, prev). 해제 함수를 돌려줌. 붙이는 순간 한 번 부르지 않는다 → 필요하면 get 먼저
store.emit(name, data)    // 값 없는 명령 이벤트(cmd:*, toast, gesture)
```

| 키 | 값 | 누가 씀 | 누가 들음 |
|---|---|---|---|
| `meeting` | 회의 문서(B-1) + `id`, 또는 `{gone:true}` | app(구독) | 전부 |
| `agenda` | `[{aid, title, kind, pages, sizes:[{w,h}], bg?, base?, original?, ver, boardNo?}]` **agendaOrder 순서** | app(구독) | 2·3·5 |
| `live` | `meeting.live` 그대로(`{aid,page,view:{cx,cy,z},rev,epoch,forceSeq,at}` 또는 `null`) | app(구독) | 2, 4(쪽 붙이기 기준), 5 |
| `role` | `{role:'viewer'|'host', cid, name, presenter:boolean}` 또는 `null`(입장 전·자격 잃음) | api·app | 전부 |
| `follow` | `'follow'` \| `'free'` | 2 | 2, 4·5(표시) |
| `page` | 내가 보는 쪽 `{aid, page, pageKey, view:{cx,cy,z}}` | 2 | 3, 4(쪽 붙이기), 5(녹음 위치) |
| `viewport` | `{aid, page, pageKey, pageW, pageH, scale, ox, oy, dpr, stageW, stageH}` | 2 | 3 |
| `tool` | `{mode:'view'|'pen', tool:'pen'|'hl'|'eraser', color, w}` | 3 | 2(펜 모드면 한 손가락 이동 끔) |
| `hands` | `[{cid, name, at}]` at·cid 순 | app(구독) | 4, 5 |
| `chat` | `[{id, cid, name, text, ref, at}]` 시간 순, 최근 200 | app(구독) | 4 |
| `polls` | `[{pid, q, options, anonymous, status, revealed, tally, total, names}]` 만든 순 | app(구독) | 4, 5 |
| `transcript` | `[{id, n, at, text, aid, page}]` n 순 | app(구독) | 5 |
| `people` | `[{cid, name, role, seenAt, left?}]` (host 만 채워짐) | app(구독) | 5 |
| `counts` | `{people, hands, peak, at}` | api(heartbeat) | 5, app |
| `conn` | `{server:'ok'|'off'|'not_configured', firebase:'off'|'connecting'|'ok'}` | api·app | app(머리줄 표시), 누구나 |
| `badges` | `{chat?, poll?, hands?, log?}` 숫자 | 4·5(자기 탭 것만) | app(옆칸 탭 숫자) |
| `side` | `{open:boolean, tab:'chat'|'poll'|'hands'|'log'}` | app, 누구나(탭 열기) | app, 4·5 |

명령 이벤트(`store.emit`):

| 이름 | 데이터 | 보내는 쪽 → 받는 쪽 |
|---|---|---|
| `toast` | `{text, kind}` | 누구나 → app |
| `cmd:nav` | `{aid, page}` | 4(채팅 쪽 붙이기 누름)·5(안건 관리) → 2: 그 쪽으로 가고 자유 보기 |
| `cmd:force` | — | 5 → 2: 진행자가 지금 화면을 `sendLive(…, force:true)` |
| `cmd:follow` | — | 누구나 → 2: 진행자 따라가기로 돌아가기 |
| `gesture` | `'multi'` | 2 → 3: 두 손가락 시작. 그리던 획은 버린다 |
| `cmd:redraw` | — | 누구나 → 2·3: 다시 그리기(창 크기 바뀜 등은 2가 알아서 함) |

---

## 4. DOM 자리 id

`index.html` 에 처음부터 다 있다(목록 화면에서는 회의 자리가 `hidden`). 팀은 **자기 자리 안**만 바꾼다.

```
body.zz  (.is-host 주관자, .is-presenter 진행자, .is-pen 펜 모드, .route-list / .route-meeting)
├ header#zz-header ............ app
│  ├ #zz-brand ................ app (logo + 「쭘」, 누르면 목록)
│  ├ #zz-meeting-title ........ app (회의 제목)
│  ├ #zz-status ............... app (● 진행 중 / ● 녹음 중 / 연결 상태)
│  └ #zz-header-actions ....... 1 join.js (내 이름, 「주관 코드 넣기」)
├ #zz-notice .................. app (서버 설정 없음·연결 끊김 띠)
├ #zz-gate .................... app (로그인 안내)
├ main#zz-list ................ 1 list.js (목록 화면 전체)
├ main#zz-meeting
│  ├ aside#zz-agenda .......... 2 viewer.js (안건 목록·쪽 썸네일)
│  ├ section#zz-center
│  │  ├ #zz-follow-bar ........ 2 (「진행자 화면으로 돌아가기 (안건3 5쪽)」 띠)
│  │  ├ #zz-stage ............. 2 (이동·확대 손짓은 여기서, 크기도 2가 잼)
│  │  │  ├ canvas#zz-layer-bg ... 2 (쪽 그림, 화이트보드 바탕)
│  │  │  ├ canvas#zz-layer-ink .. 3 (굳은 선)
│  │  │  ├ canvas#zz-layer-temp . 3 (그리는 중인 선, 맨 위)
│  │  │  └ #zz-stage-overlay ..... 2 (불러오는 중·쪽 번호·빈 안건 그림)
│  │  ├ #zz-toolbar ........... 3 draw.js (보기/펜 모드, 형광펜·펜·지우개, 색)
│  │  └ #zz-pagebar ........... 2 (이전·다음·쪽 n/m·맞춤)
│  │     ├ #zz-board-actions .. 3 board.js (화이트보드일 때 「+ 새 쪽」)
│  │     └ #zz-quick-hand ..... 4 hands.js (✋ 손들기 단추)
│  └ aside#zz-side ............ app (접기·펴기, 768px 미만은 아래 서랍)
│     ├ #zz-side-tabs ......... app (채팅·투표·손·기록 탭 + badges)
│     ├ #zz-side-chat ......... 4 chat.js
│     ├ #zz-side-poll ......... 4 poll.js
│     ├ #zz-side-hands ........ 4 hands.js
│     └ #zz-side-log .......... 5 record.js (대화 기록)
├ footer#zz-hostbar ........... app (주관자만 보임)
│  ├ #zz-hostbar-main ......... 5 host.js (시작·끝내기, 진행 넘겨받기, 모두 내 화면으로, 판서 잠금, 접속자, AI용 기록 받기, 안건 관리)
│  ├ #zz-hostbar-upload ....... 5 upload.js (안건 올리기)
│  ├ #zz-hostbar-board ........ 3 board.js (화이트보드 띄우기)
│  └ #zz-hostbar-record ....... 5 record.js (⏺ 녹음)
├ #zz-join .................... 1 join.js (입장 전 이름 고르기, 덮개)
├ #zz-modal-root .............. app (ctx.modal 전용)
└ #zz-toast ................... app (ctx.toast 전용)
```

- 쪽 좌표: 세 canvas 는 2팀이 `#zz-stage` 크기 × dpr 로 맞추고 `viewport` 를 낸다. 쪽 비율 좌표 `(x,y)`(0~1) → 화면 CSS px 은 `ox + x*pageW*scale`, `oy + y*pageH*scale`. canvas 픽셀은 거기에 `dpr` 을 곱한다. 3팀은 이 식만 쓴다.
- 손짓 나눔(E): `#zz-stage` 의 포인터 이벤트는 2팀이 받는다. 보기 모드면 2가 한 손가락 이동, 펜 모드면 2는 **두 손가락 이상일 때만** 이동·확대하고 시작할 때 `gesture` 를 낸다. 3팀은 펜 모드일 때만 `#zz-layer-temp` 에서 한 손가락을 받아 그리고, 2팀 손짓과 겹치지 않게 `e.stopPropagation()` 하지 않는다(2가 포인터 수를 세야 함). 휠 확대는 언제나 2.
- `#zz-layer-temp` 는 기본 `pointer-events:none`, `body.is-pen` 일 때만 `auto`(zzoom.css 가 정함). `body.is-pen` 은 app 이 `tool.mode` 를 보고 붙인다.
- 화이트보드 바탕(흰·모눈·줄)은 2팀이 `#zz-layer-bg` 에 그리되 그리는 함수는 3팀 `board.js` 의 `paintBoardBackground` 를 쓴다(6절).
- **1024px 미만**(갤럭시탭 세로 820 포함): 무대가 폭 전부를 쓴다. `#zz-agenda` 는 왼쪽 덮개(`data-open` 이 붙으면 열림), `#zz-side` 는 오른쪽 덮개이고 처음엔 닫힘. 768~1023px 에서는 머리줄 app 단추 `#zz-agenda-toggle`(「안건 목록」)이 `data-open` 을 켜고 끈다.
- **768px 미만**: 안건 덮개는 2팀 쪽 막대 「안건」 단추로 연다. `#zz-side` 는 아래 서랍(탭 줄만 보이게 닫힌 채 시작, 열면 55vh). `#zz-pagebar` 는 두 줄(윗줄 2팀 쪽 넘기기, 아랫줄 `#zz-board-actions`·`#zz-quick-hand`). 머리줄 상태는 진행·녹음 칩만.
- `#zz-toolbar` 는 따라가기 띠 아래에 뜬다(app 이 띠 높이를 `--zz-follow-h` 로 넣음). 팀 CSS 는 자기 자리 안 배치만 바꾼다.

---

## 5. CSS

- 공통 변수·초기화·단추 기본형은 `zzoom.css`(app). 값은 `DESIGN_BRIEF.md` 그대로: `--zz-accent` `--zz-accent-ink` `--zz-accent-soft` `--zz-ink` `--zz-muted` `--zz-line` `--zz-canvas` `--zz-surface` `--zz-stage` `--zz-live` `--zz-ok` `--zz-warn`, 판서 색 `--zz-hl-yellow` `--zz-hl-green` `--zz-hl-pink` `--zz-pen-red` `--zz-pen-blue` `--zz-pen-black`, 간격 `--zz-s1`(4)…`--zz-s8`(32), 둥글기 `--zz-r-card`(14) `--zz-r-btn`(10) `--zz-r-chip`(999), 그림자 `--zz-shadow`, 움직임 `--zz-dur`(160ms), 글꼴 `--zz-font`, 터치 최소 `--zz-touch`(44px).
- 공통 부품(누구나 써도 됨, 고치지는 않음): `.zz-btn`, `.zz-btn.primary`, `.zz-btn.ghost`, `.zz-btn.danger`, `.zz-icon`(28px 그림), `.zz-chip`, `.zz-card`, `.zz-empty`(빈 화면 그림+글), `.zz-live-dot`, `.zz-sr`(화면 낭독기 전용 글), `.zz-num`(tabular-nums).
- 팀 CSS 파일과 접두사(다른 접두사 클래스를 고치지 않는다):

  | 팀 | 파일 | 접두사 |
  |---|---|---|
  | 1 | `list.css` | `.zl-` |
  | 2 | `viewer.css` | `.zv-` |
  | 3 | `draw.css` | `.zd-` |
  | 4 | `side.css` | `.zs-` |
  | 5 | `host.css` | `.zh-` |
- 자리 id(`#zz-…`) 의 크기·위치는 zzoom.css 가 정한다. 팀은 자리 **안쪽** 만 꾸민다. 꼭 바꿔야 하면 요청.
- `prefers-reduced-motion` 이면 움직임을 끈다(zzoom.css 가 `--zz-dur:0ms`).
- 아이콘은 `<img class="zz-icon" src="${ctx.assets('icon-pen')}" alt="">` + 글자 라벨. SVG·이모지 아이콘 금지.

---

## 6. 팀 사이 예외(순수 함수 import)

| 내보내는 곳 | 이름 | 쓰는 곳 |
|---|---|---|
| `board.js` (3) | `export function paintBoardBackground(ctx2d, {x, y, w, h}, bg)` — 화면 px 사각형에 흰 바탕·모눈·줄 | `viewer.js` (2) |
| `draw.js` (3) | `export function renderStroke(ctx2d, stroke, pageW, pageH)` (E) — 3팀 안에서만 써도 되고 2팀이 썸네일에 쓸 수 있음 | 3, (2 선택) |

이 둘은 DOM·store 를 만지지 않는다. 파일이 아직 없으면 쓰는 쪽은 `import()` 실패를 잡아 흰 바탕으로 그린다.

---

## 7. 라우팅·입장

- `/zzoom` = 목록, `/zzoom#/m/<mid>` = 회의. 다른 해시는 목록으로. 링크는 `<a href="#/m/${id}">`.
- 로그인 토큰(`localStorage.airoom_auth_token`) 없음 → `#zz-gate`: 「백암이에서 먼저 로그인해 주세요」 + `<a href="/">백암이로 가기</a>`. 서버 401 `login_required` 도 같음.
- 회의 화면 순서(app.js): ① 틀 보이기 + `join.js` 붙이기 ② `health()` 가 ok 아니면 안내 띠만 두고 끝 ③ `api.resume(mid)` 성공 → 바로 입장 상태 ④ 아니면 `#zz-join` 이 보이고 join.js 가 `api.join(mid, name)` 을 부름 ⑤ store `role` 이 처음 값이 되면 나머지 모듈을 붙임.
- 이름: join.js 가 `api.staffNames()` 목록 + 직접 입력, 기본값 `api.rememberedName()`. 입장 뒤 `api.rememberName()`.
- 주관 코드: join.js 의 「주관 코드 넣기」 → `ctx.modal` 로 6자리 → `api.becomeHost`. 성공하면 store `role.role = 'host'` → app 이 host.js·upload.js 를 붙인다.

---

## 8. 팀별 소유 파일과 쓰는 것

| 팀 | 파일(이것만) | api | store 씀 | store 들음 | 자리 |
|---|---|---|---|---|---|
| 통합 | `index.html` `app.js` `api.js` `zzoom.css` | — | meeting agenda live role hands chat polls transcript people counts conn side | badges toast tool(→`.is-pen`) | 헤더·notice·gate·side 틀·hostbar 틀·modal·toast |
| 1 목록·입장·브랜드 | `list.js` `join.js` `list.css` `assets/` | listMeetings createMeeting updateMeeting deleteMeeting unlockHost health staffNames rememberedName rememberName join resume becomeHost | — | role meeting | `zz-list` `zz-join` `zz-header-actions` |
| 2 보기·따라가기 | `viewer.js` `viewer.css` | sendLive pageImageUrl releaseImages originalBlob | follow page viewport | meeting agenda live role tool cmd:nav cmd:force cmd:follow cmd:redraw | `zz-agenda` `zz-follow-bar` `zz-stage` `zz-layer-bg` `zz-stage-overlay` `zz-pagebar` |
| 3 판서·화이트보드 | `draw.js` `board.js` `draw.css` `vendor/perfect-freehand-1.2.3.mjs` | saveStrokes deleteStroke clearPage subscribeStrokes subscribePageEpoch createBoard addBoardPage | tool | page viewport role meeting(penLock) agenda gesture | `zz-layer-ink` `zz-layer-temp` `zz-toolbar` `zz-board-actions` `zz-hostbar-board` |
| 4 채팅·손·투표 | `chat.js` `hands.js` `poll.js` `side.css` | sendChat deleteChat setHand lowerHand lowerAllHands createPoll vote myVote pollTally closePoll revealPoll | badges(chat·poll·hands) side | chat hands polls role page live meeting | `zz-side-chat` `zz-side-poll` `zz-side-hands` `zz-quick-hand` |
| 5 주관자·업로드·녹음·md | `host.js` `upload.js` `record.js` `host.css` | setState takePresenter convertFile uploadAgenda updateAgenda deleteAgenda transcribe exportMd originalBlob | badges(log) | meeting role people counts agenda live page polls hands transcript | `zz-hostbar-main` `zz-hostbar-upload` `zz-hostbar-record` `zz-side-log` |

- 판서 잠금 단추는 5팀(host.js) 막대에 두고 `setState(mid,'penLock',v)`. 3팀은 `meeting.penLock && role.role!=='host'` 이면 펜 모드를 막고 안내.
- 쪽 지우기 단추는 3팀(draw.js 도구 막대, host 에게만 보임).
- 「원본 받기」는 5팀 안건 관리에서 `originalBlob`. 2팀 안건 목록에 넣고 싶으면 써도 된다(같은 함수).
- 접속자 수는 누구나 `counts`/`meeting.counts` 로 표시 가능, 이름 목록(`people`)은 5팀만.

---

## 9. 서버·변환기와의 차이 (알아 둘 것)

- 회의 상태별 허용(D-4): `ready` 에서 손·투표·진행·녹음은 409. 화면에서 미리 막고, 그래도 409 면 `e.message` 토스트.
- 쪽 수 한도 200(변환기·서버 같음), 안건 30개, 원본 50MB 미만, 쪽 그림 4MB·썸네일 512KB.
- 변환 결과 `kind` 는 hwp·hwpx 를 모두 `'hwp'` 로 줄 수 있다 → 서버 kind 는 `uploadAgenda` 가 확장자로 다시 정한다(팀은 신경 쓸 필요 없음).
- 판서 색은 서버가 6개만 받는다(형광펜 `#FFE14D #9BE15D #FF8AD8`, 펜 `#E5484D #2F6FEB #1d1d1f`), `w` 는 0.001~0.05, 획 저장은 1초 1회(여러 획은 `saveStrokes` 에 묶어 보냄).
- 채팅 1초 1글, 500자.
- 비공개 투표는 reveal 전 `tally:null`. 주관자 실시간 숫자는 `pollTally` 를 몇 초마다 부른다(권장 3초, 투표 칸이 보일 때만).
- 화면에 `getDownloadURL` 을 쓰지 않는다.

## 10. 시험

- 각 팀은 자기 모듈 단위 시험을 `tests/zzoom/` 에 **새 파일**로(기존 파일 고치지 않음): 예 `tests/zzoom/draw.test.mjs`.
- 뼈대 조립 시험: `python tests/zzoom/e2e_skeleton.py http://127.0.0.1:<포트>` — 아직 없는 팀 파일은 시험이 빈 모듈로 바꿔 끼워 조립만 본다. 팀 파일이 생기면 그 파일을 그대로 쓴다(그때도 콘솔 오류 0 이어야 함).
