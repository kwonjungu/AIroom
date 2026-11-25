# 2단계: 디자인 5팀 공통 지시

`TEAM_COMMON.md` 를 따른다. 먼저 읽을 것: `CONTRACTS.md`(모듈 모양·api·store·DOM 자리 — **이 약속대로만 쓴다**), `DESIGN_BRIEF.md`(색·글꼴·간격·44px 터치·말투), 레포 `DESIGN.md`(Apple 계열), `DESIGN.md` 의 자기 파트, `ASSETS.md`(아이콘은 `public/zzoom/assets/*.webp` 만, SVG·이모지·아이콘 폰트 금지).

## 공통 규칙
- **자기 팀 소유 파일만** 만든다(아래 표). `api.js`·`store`·`index.html`·`app.js`·`zzoom.css` 를 바꿔야 하면 고치지 말고 보고서 「요청」에 적는다.
- CSS 는 자기 접두사만(`.zl-` `.zv-` `.zd-` `.zs-` `.zh-`). 색은 `--zz-*` 변수만.
- 기기: 엣지·크롬 PC, 갤럭시탭 크롬(사용자: 사파리는 안 해도 됨, 엣지 우선). Pointer Events. 768px 미만은 옆칸이 아래 서랍. `prefers-reduced-motion` 존중.
- 버튼·안내 문구는 짧은 존댓말, 가운뎃점·화살표 나열 금지.
- 서버·Firebase 없이 시험할 수 있게 **가짜 api/store**(`tests/zzoom/fakes/fake-api.js` 가 뼈대에 있으면 그것, 없으면 자기 시험 파일 안에)로 단위 시험과 화면 시험(Python Playwright, **엣지(`channel='msedge'`)와 크로미움 둘 다**, 창 크기 1280×800 과 820×1180 두 가지, 스크린샷을 저장소 밖 scratch 에 저장해 **직접 눈으로 본다**)을 한다.
- 커밋·푸시·배포 금지. 실제 Firebase 쓰기 금지.
- 끝나면 `reports/D<번호>.md`: 만든 파일, 시험 명령과 결과 숫자, 스크린샷 경로, 요청. 마지막 답변 10줄 이내.

## 팀별
| 팀 | 소유 파일 | 할 일 (DESIGN 파트) |
|---|---|---|
| D1 목록·입장·브랜드 | `public/zzoom/list.js`, `join.js`, `list.css` | 회의 목록(관리자: 만들기·주관 코드·수정·삭제·잠금 풀기·D-n 뒤 삭제 표시), 입장(이름: codocs 명부 또는 직접, `localStorage.airoom_ws_name`), 로그인 안내, 빈 화면 그림(`empty-list`, `hero-join`), 로고. 파트 A·H·I |
| D2 보기·따라가기 | `viewer.js`, `viewer.css` | 무대(쪽 그림 표시, 이동·확대: 한 손가락·마우스 끌기, 두 손가락·휠), 쪽 맞춤, 안건·쪽 넘기기, 따라가기/자유 보기 띠 「진행자 화면으로 돌아가기」, forceSeq, 현재·다음 쪽만 미리 받기, 요청 번호로 늦은 렌더 취소, 진행자는 300ms 묶어 live 보내기·409 처리. 파트 D |
| D3 판서·화이트보드 | `draw.js`, `board.js`, `draw.css` (`vendor/perfect-freehand-1.2.3.mjs` 는 뼈대가 넣어 둠) | 펜 모드 토글, 형광펜·펜·지우개·색, perfect-freehand 프리셋표·`renderStroke` 하나, 임시 canvas, coalesced events, 필압, 낙관적 표시와 실패 시 흐리게+다시 보내기, epoch, 1,500점 나누기, 판서 잠금, 화이트보드 바탕(흰·모눈·줄)과 쪽 추가. 파트 E·K5 |
| D4 채팅·손·투표 | `chat.js`, `hands.js`, `poll.js`, `side.css` | 옆칸 탭, 채팅(낙관적 표시, 1초 1글, 500자, 「지금 쪽 붙이기」 누르면 이동, 안 읽은 수, 본인·주관자 지우기), 손들기·주관자 손 내리기, 투표(열기·투표·바꾸기·마감·결과 보이기, 비공개는 개인 선택 안 보임, 공개는 이름 공개 안내, 「한 탭 한 표」). 파트 F |
| D5 주관자·업로드·녹음·md | `host.js`, `upload.js`, `record.js`, `host.css` | 주관 코드 입력, 시작·끝내기·진행 넘겨받기·모두 내 화면으로·판서 잠금·쪽 지우기·화이트보드 띄우기, 안건 올리기(convert() 진행 표시·취소·오류 문구, PPTX 는 「PDF로 저장해 올리면 가장 정확해요」 안내 없이 그대로 — 새 변환기가 충분히 정확함), 순서 바꾸기·지우기, 녹음(고지 확인, 1분 조각, ● 녹음 중, 재시도 대기열), 「AI용 기록 받기」, 접속자(연결 확인 중/나감). 파트 C-5·D·G·H |
