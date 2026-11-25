# 보고서: 쭘 전체 익명화 (ANON)

브리프 `briefs/ANON.md`. 커밋·푸시·배포·규칙 게시·실제 Firebase 쓰기 안 함.

## 진행 상황
- [완료] 코드 읽기
- [완료] 서버 routes.js(join·host·refresh·people·heartbeat·chat·hands·polls·export·strokes name 제거), keys.js 투표 Lua 이름 저장 제거, export-md.js
- [완료] 사람 열쇠 = 백암이 세션 토큰 해시만(감사 R1 N1), 녹음 켠 사람 나가면 녹음 내림(D5 요청)
- [완료] 화면 api.js·join.js·chat.js·hands.js·poll.js·host.js(접속자)
- [진행 중] 시험 고치기
- [완료] api.test(76/76)·레드팀(9/9)·LOAD_STRICT(2/2)·d4 단위 고침. [진행 중] d1·d4·d5·draw 화면 시험 (세션 끊김 뒤 재개 2026-11-26)
- [완료] d1 화면(124/128, 실패 4는 list.js 「일반 사용자 관리 단추 없음」 — AGENDA_OPEN 결정 1로 누구나 회의 만들기라 기대값이 옛것, 익명과 무관), d4 화면 212/0
- [완료] host.test(presenceCounts 추가) 12/0, d5_e2e 기대값을 익명에 맞춤(접속자 수만, 「다른 분이 진행 중」). [진행 중] d5·draw 화면 시험 실행
- [완료] d5 화면 85/0 (엣지·크로미움)
- [완료] 감사 N9: 관리자 host 는 관리자 세션 만료까지만(adminUntil), refresh 때 같은 세션 재확인 아니면 viewer. 시험 추가. test:zzoom 80/0
- [완료] draw 화면 255/3 — 실패 3은 모두 「U05 unmount 뒤 보내지 않음」(draw.js 의 unmount 중 저장 대기, 엣지 820·크로미움 1280·820). 이번 작업은 draw.js 를 고치지 않았고(서버 선 문서의 name 만 뺌) 엣지 1280 에서는 통과해 타이밍 문제로 보임 → 3팀·U05 담당에게 요청
- [완료] CONTRACTS.md 익명에 맞게 고쳐 적음(join(mid), role·hands·chat·polls·people·strokes 모양, 명부 함수 없앰, 7절 익명 원칙)

## 바꾼 것
서버
- `lib/zzoom/routes.js`(내 몫만 작은 Edit): join 은 name 을 받지 않고(와도 버림) pt 기록·응답·people 문서에 이름 없음. host·refresh 응답에서 name 뺌. chat·hands·strokes·heartbeat(people) 문서에서 name 뺌. 투표는 늘 비공개(`anonymous:true`, `createdBy` 없음), reveal 은 항목별 수만(`names:null`). AI용 md 에 이름 없음.
- 사람 열쇠(감사 R1 N1): `personOf` = 서버가 확인한 백암이 세션 토큰 해시만. X-Device-Id·이름은 쓰지 않는다. 같은 세션은 몇 번 다시 들어와도 같은 사람.
- 녹음(D5 요청): `state recording` 이 `recordingBy`(켠 cid)를 회의 문서에 적는다. 그 사람이 leave heartbeat 를 보내거나, 30초 접속자 셈 때 그 사람 people 문서가 90초 넘게 끊겨 있으면 트랜잭션으로 `recording:false`. 끝내기·끄기는 `recordingBy:null`.
- 감사 N9: 관리자로 받은 host 는 pt 에 `adminUntil`(관리자 세션 만료)을 두고 토큰 until 도 그 시각을 넘지 않는다. 지나면 host 쓰기 403 `host_revoked`. `/refresh` 때 같은 세션 토큰으로 관리자 세션을 다시 확인하고 아니면 viewer 로 내리고 people role 도 viewer.
- `lib/zzoom/keys.js`: 투표 Lua 가 `@cid→이름` 을 더 이상 쓰지 않음. `lib/zzoom/export-md.js`: 채팅 줄 이름 없음, 투표는 「(비공개)」+수만.
- 규칙(firestore.rules·storage.rules): 쭘 블록은 클라이언트 쓰기가 전부 막혀 있고 name 검사가 없어 고칠 것 없음(게시도 안 함).

화면
- `api.js`: `join(mid)`(name 인자 없앰), 자격·role 에서 name 뺌, `subscribeHands` 이름 없음, `staffNames`·`rememberedName`·`rememberName` 없앰(airoom_ws_name 안 읽고 안 씀).
- `join.js`: 이름 칸·명부 칩 없이 「입장하기」 하나 + 「익명으로 참여해요. 이름은 저장되지 않아요.」, 머리줄 「익명 참여」. `list.css` 에 두 줄 추가.
- `chat.js`: 내 글만 「나」, 남의 글은 표시 없음. 지우기는 본인·주관자 그대로.
- `hands.js`: 「손 든 사람 n명」, 「1번째 손」 순서 번호만, 내 손만 「나」. 주관자는 「하나 내리기(가장 먼저 든 손)」·「모두 내리기」.
- `poll.js`: 공개·비공개 고르기와 이름 표시 없앰, 「누가 무엇을 골랐는지는 아무도 볼 수 없어요」.
- `host.js`(접속자만): 이름 목록 대신 「접속 중 n명」·「연결 확인 중 n명」(`presenceCounts` 추가). 상태 글 「다른 분이 진행 중」 한 줄.
- `draw.js`: 선 그리기에 name 을 쓰지 않아 고칠 것 없음.

## 시험(실제 결과)
- `npm run test:zzoom`: 80 통과 / 0 실패. 새 시험: ANON 이름 grep(서버 응답 JSON·가짜 Firestore·가짜 Redis·md 에 입력 이름 0, Firestore 문서 name 칸 0), RT-4(같은 세션이 기기 id·이름 바꿔 5번 재입장 → 1표, 다른 세션은 따로 1표), D5 녹음 내리기, N9 관리자 host 만료·refresh.
- 시험 틀 변경: api·redteam·load 시험의 가짜 세션을 `user-t#라벨`(라벨마다 다른 로그인 세션)로. 옛 「이름만 다르면 다른 사람」 가정을 고침.
- 레드팀 `redteam.test.js`: 9/0 (todo 6, 「재입장 중복 투표」 todo 는 이제 막힘)
- 부하 `LOAD_STRICT=1 load.test.js`: 2/0, issues 0·soft 0 (공개 투표 검사는 「이름 0·비공개」로 바꿈)
- 단위: d1 3/0, d2 11/0, d4 7/0, draw 18/0, host 12/0
- 화면(Python Playwright 엣지·크로미움): d1 124/4(실패는 list.js 일반 사용자 「회의 만들기」 단추 — AGENDA_OPEN 결정 1 로 바뀐 기대값, 익명과 무관), d4 212/0, d5 85/0, draw 255/3(U05, 위 참고). 스크린샷 직접 봄: 입장 화면, 머리줄, 채팅 「나」, 손 「n번째 손」, 접속자 수 창.

## 요청
- 1팀(list): d1_e2e 의 「일반 사용자 관리 단추 없음」 기대값을 누구나 회의 만들기에 맞게.
- 3팀: draw_e2e U05 가 엣지 820·크로미움에서 실패(draw.js 미변경).
- 업로드 출입증(`/uploads`, 다른 에이전트 몫) until 은 min(1시간, 회의 만료)이라 관리자 세션 만료(N9)를 보지 않는다. 필요하면 `claimsFor(..., g.adminUntil)` 처럼 맞출 것.
- `meeting.recordingBy`(cid) 가 회의 문서에 새로 생김. 이름이 아니라 cid 라 익명 원칙과 맞음.
- [완료] 조정 요청 처리(아래 「덧붙임」)

## 덧붙임(조정 요청, 2026-11-26)
- d1: 「일반 사용자 관리 단추 없음」을 새 규칙으로 고침. 일반 사용자도 「회의 만들기」 단추가 있고, 수정·삭제는 내가 만든 회의(`mine`)에만 있다(가짜 목록 `user` 장면에서 a1 을 mine 으로). `d1_harness.js`·`d1_e2e.py`. 결과 d1 화면 **132 통과 / 0 실패**(시험 항목이 늘어 124 → 132).
- draw U05: **시험 타이밍 문제였고 draw.js 결함은 아니다.** 시험은 선을 그리기 전에 보낸 수를 센 뒤 바로 unmount 했는데, draw.js 는 앞 보내기가 1050ms(SEND_GAP) 넘게 지났으면 손을 떼는 즉시 보낸다. 엣지 1280 은 앞 단계(지우개 뒤 600ms)와 가까워 기다리는 중이었고, 다른 크기·크로미움은 1초가 지나 즉시 보내져 수가 하나 늘었다. 기다리는 동안 unmount 하면 `dead`·`clearTimeout(sendTimer)` 로 보내지 않는 동작은 맞다.
  - 고침(`draw_e2e.py`만): 먼저 한 획을 보내 간격을 건 뒤, 그 안에 두 번째 획을 그리고 「아직 안 보냄」을 확인한 다음 unmount 한다. 결과 draw 화면 **263 통과 / 0 실패**(엣지·크로미움 모든 크기).
