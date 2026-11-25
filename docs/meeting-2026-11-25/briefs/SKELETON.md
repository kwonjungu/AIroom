# 1.5단계: 통합 뼈대 (화면 공통)

`TEAM_COMMON.md` 를 따른다. 설계 `DESIGN.md`(특히 A-2·B-1·D·E·F·G·I·K), 디자인 기준 `DESIGN_BRIEF.md`, 서버 API 표 `reports/S.md` 4절, 변환기 `reports/C.md`.
**지금 다른 에이전트가 `lib/zzoom/*`, `*.rules`, `public/zzoom/convert/*`, 두 SPA, `tests/zzoom/*` 를 고치는 중이다. 이 파일들은 읽기만 하고 절대 고치지 않는다.** API 가 바뀔 수 있으니 `routes.js` 를 직접 읽어 맞추고, 바뀌면 나중에 맞출 수 있게 `api.js` 한 곳에만 경로·모양을 모은다.

## 소유 파일 (이것만)
- `docs/meeting-2026-11-25/CONTRACTS.md` — **가장 먼저** 쓴다. 다 쓰면 즉시 `SendMessage(to:"main")` 으로 「CONTRACTS 완료」를 알린다(디자인 5팀이 이걸 보고 바로 시작한다). 그다음 나머지를 만든다.
- `public/zzoom/index.html`, `app.js`, `api.js`, `zzoom.css`, `public/zzoom/vendor/perfect-freehand-1.2.3.mjs`(npm 1.2.3 원본, MIT 고지 그대로; 디자인 3팀 소유지만 뼈대에서 미리 넣어 둔다)
- `tests/zzoom/e2e_skeleton.py`(빈 화면 조립 확인용)

## CONTRACTS.md 에 정할 것 (디자인 5팀이 서로 안 부딪히게)
1. 모듈 모양: 각 화면 모듈은 `export function mount(ctx)` → `{ unmount() }`. `ctx = { api, store, el(slotId), t(문구), assets(이름) }`.
2. `api.js` 함수 목록: 백암이 토큰 읽기, 회의 목록·만들기·수정·삭제, join/host/refresh(맞춤 토큰 1시간 전 갱신, host 뒤 새 pt 교체), 모든 회의 API, 업로드(허가→Storage put→commit, convert() 호출 포함), heartbeat(60초·visibilitychange·pagehide sendBeacon), BroadcastChannel 탭 복제 감지(K3), Firebase 앱 `'zzoom'` inMemory 인증과 Firestore(DB `kwon`) 구독 함수(meeting, agenda, pages, strokes(쪽별), hands, chat(최근 200), polls, transcript, people(host 만)). 오류는 서버 `{error,message}` 를 `ZzError` 로.
3. `store`: 상태 하나 + 이벤트(`meeting`, `agenda`, `live`, `role`, `follow`(따라가기/자유), `page`(내가 보는 aid·page·view), `tool`(보기/펜·도구·색), `hands`, `chat`, `polls`, `transcript`, `people`, `toast`). 누가 쓰고 누가 듣는지 표.
4. DOM 자리 id 표(헤더, 안건 목록, 무대 canvas 층(바탕/선/임시), 도구 막대, 옆칸 탭(채팅·투표·손·기록), 주관자 막대, 모달 자리, 토스트). 768px 미만 옆칸은 아래 서랍.
5. CSS 변수는 DESIGN_BRIEF 그대로 `zzoom.css` 에. 팀 CSS 는 자기 접두사(`.zl-` 목록, `.zv-` 보기, `.zd-` 판서, `.zs-` 옆칸, `.zh-` 주관자)만.
6. 라우팅: `/zzoom`(목록) · `/zzoom#/m/<mid>`(회의). 로그인 토큰 없으면 「백암이에서 먼저 로그인」 + `/` 링크.
7. 팀별 소유 파일(DESIGN 파트 I 표)과 각 팀이 api/store 에서 쓰는 것.

## 뼈대 끝 기준
- `node server.js` 로컬 실행 뒤 `/zzoom` 이 열리고 빈 목록 화면과 회의 화면 틀(자리 id 전부)이 오류 없이 조립된다(`tests/zzoom/e2e_skeleton.py`, Python Playwright, 콘솔 오류 0). Firebase 없이도 화면 틀은 떠야 한다(서버 503 이면 안내).
- 보고 `reports/SKELETON.md`: 만든 파일, 시험 결과 숫자, 디자인 팀이 알아야 할 것. 마지막 답변 10줄 이내.
