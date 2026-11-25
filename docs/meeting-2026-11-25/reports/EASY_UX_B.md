# EASY_UX 팀 B (무대, 안건, 발표) 보고

지시서: `briefs/EASY_UX_BUILD.md`, 장면 B5~B9. 커밋, 푸시, 배포는 하지 않았다.

## 체크포인트 완료 (2026-11-26)
- 반쯤 바꾼 화면은 없다. 발표하기, 발표 마치기, 대기 화면 「오늘의 안건」, 자료 올리기(허가 취소 포함)가 모두 동작한다.
- `node --check`: api.js, viewer.js, agenda.js, draw.js, board.js, agenda_fake_api.js 모두 통과.
- `agenda_e2e.py` 엣지 1280: 13/13 통과(스크린샷 `%TEMP%/zz_easy_b/ag_edge/`).
- `easy_b_api_e2e.py`(진짜 api.js, 엣지와 크로미움): 22/22 통과.
- `npm run test:zzoom`: 129/129 통과.
- 운영 배포는 사용자가 한다(이 팀은 배포하지 않음).

## 고친 파일
- `api.js`: `presenterEnd(mid)` 덧붙임(`POST /:mid/presenter/end`, store meeting·live 를 바로 맞춤). 업로드 허가 취소 `cancelUpload(mid, uploadId)` 덧붙임(`DELETE /:mid/uploads/:uploadId`). `uploadOne`·`uploadToAgenda` 는 허가를 받은 뒤를 try/catch 로 감싸 쪽 올리기 실패, 취소(창 닫기), commit 실패 때 허가를 바로 돌려준다(404 는 조용히). 함수 안 줄 감싸기 외에 기존 동작은 그대로.
- `viewer.js`·`viewer.css`: 무대 위 「지금 상태」 띠(`#zz-follow-bar` 안 `.zv-band`, `data-state` = ready·idle·follow·free·presenting·ended). 높이 48px 이상, 글자 16px. 「발표 마치기」(발표자 본인 바로, 담당자가 남의 발표를 마칠 때 확인 창). 옛 칩 `.zv-ov-state` 없앰. 낱말 바꾸기(쪽 목록, 쪽 전체 보기, ‹ 이전, 다음 ›, 발표 중, 칠판, 자료를 불러오지 못했어요, 내 화면을 보내지 못했어요). 왼쪽 칸 머리에 「+ 안건 추가」.
- `agenda.js`·`agenda.css`: 줄마다 단추 하나(회의 중 「발표하기」, 자료 없는 내 안건 「자료 올리기」) + 「고치기」 펼침 메뉴(자료 바꾸기, 이름 바꾸기, 지우기 두 번 누르기). 시작 전에는 「발표하기」를 그리지 않고 부제로 알림. 「닫기」를 「자료 화면 보기」로, 접힌 단추 「오늘의 안건 펼치기」(48px, 무대 왼쪽 위). 빈 화면에 「첫 안건 올리기」. 파일 고르기와 진행 글(%) 낱말 바꾸기. 띠 단추와 잇는 `cmd:agenda-open`, 띠에 알리는 `ui:wait`.
- `draw.js`·`draw.css`: 「보기 / 펜 모드」 둘을 단추 하나 「펜으로 쓰기 / 펜 끄기」로. 막대를 무대 오른쪽 아래(쪽 막대 바로 위)로 옮겨 띠와 「오늘의 안건 펼치기」를 가리지 않게. 시작 전(참석자), 판서 잠금, 끝난 회의에는 단추를 숨김. 「이 쪽 글씨 모두 지우기」, 「지금은 회의 담당자만 쓸 수 있어요」.
- `board.js`·`draw.css`: 「빈 칠판 띄우기」, 휴대폰에서도 글자 보이게(그림만 단추 규칙 삭제).

## 시험
- 새 `tests/zzoom/easy_b_api_e2e.py`(진짜 api.js): 허가 취소 4경우 × 2함수, presenterEnd 2경우. 엣지·크로미움 22/22 통과.
- `agenda_e2e.py`: 새 낱말 반영 + 띠 6상태, 발표 마치기(발표자, 담당자 확인 창), 고치기 메뉴, 글자 없는 단추 0. 전체 회차 74/74 통과.
- `agenda_fake_api.js`: presenterEnd, cancelUpload 덧붙임.
- `d2_e2e.py`, `draw_e2e.py`, `ui_r2_e2e.py`, `prod_check.py`: 새 낱말과 띠에 맞춰 단언만 고쳤다(`.zv-ov-state` 를 `.zv-band.is-presenting` 으로, 「펜 모드」를 「펜으로 쓰기」로, 「쪽 지우기」를 「이 쪽 글씨 모두 지우기」로, 「추가」를 「안건 추가하기」로, 칠판 단추는 글자가 보이는지 확인). 체크포인트 뒤 전체 회차(엣지와 크로미움, 1280, 820, 390) 결과:
  - `agenda_e2e.py` 74/74, `ui_r2_e2e.py` 66/66, `d2_e2e.py` 82/82, `draw_e2e.py` 268/268 통과.
  - 처음 함께 돌렸을 때 d2 크로미움의 「300ms 묶음 보내기 횟수」가 브라우저 4개를 동시에 띄운 부하로 2번 틀렸고, 혼자 다시 돌리니 통과했다(보내기 코드는 고치지 않음).
  - draw_e2e 의 `name='모두 지우기'` 가 새 단추 「이 쪽 글씨 모두 지우기」까지 잡아 `exact=True` 를 붙였다.
  - 390 화면 눈으로 확인: 띠, 휴대폰 너비 「발표 마치기」, 쪽 막대 한 줄(`%TEMP%/zz_easy_b/ag/chromium_390_8b_presenting_band.png`).

## 다른 팀에 요청
- A(`app.js`): 머리줄 「내가 발표 중」 칩이 `role.presenter` 를 보는데, 진짜 api.js 는 이 값을 늘 false 로 둔다. 참석자가 「발표하기」로 발표해도 칩이 안 뜬다. `meeting.presenter.cid === role.cid` 로 판단해 주세요(띠는 이미 이렇게 판단함).
- A(`index.html`): `#zz-agenda-toggle` 글자 「안건 목록」을 「쪽 목록」으로 바꿔 주세요. 왼쪽 칸 제목과 휴대폰 쪽 막대 단추를 「쪽 목록」으로 맞췄다. 가운데 「오늘의 안건」과 구별하려는 것이다.
- A(`zzoom.css`): `#zz-toolbar` 자리는 draw.css 에서 `#zz-center > #zz-toolbar` 로 오른쪽 아래로 옮겼다. 자리 규칙을 zzoom.css 로 옮기려면 같은 값을 넣어 주세요.
- C(`host.js`): 「발표 가져오기」는 그대로 두고, 담당자가 발표를 끝낼 길은 무대 띠 「발표 마치기」에 있다. 막대에 따로 만들 필요 없다.

## 남은 것(다음 배포)
- 820 화면 장면별 스크린샷 눈으로 더 보기.
- 채팅의 「1번 안건 3쪽 보기」를 눌렀을 때 「발표 화면으로 돌아왔어요」 같은 안내는 C 의 채팅 문구와 맞춰 보기.
