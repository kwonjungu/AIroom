# 화면 영역 감사 R2 (영역 ②)

**PASS** — 치명 0, 중요 0. R1 중요 3건(U02, U03, U09)은 모두 고쳐졌고, 남은 것과 새로 찾은 것은 모두 사소(9건)다.

기준: 브리프 `AUDIT_UI.md`(N=2, 지난 지적과 바뀐 부분만), `AGENDA_OPEN.md`, `ANON.md`, `CONTRACTS.md`. R1 기준 시점은 커밋 f5eb70b(2026-11-25 22:16)이고, 바뀐 부분은 그 뒤 작업 사본(`git diff HEAD -- public/zzoom`, 25개 파일)과 새 파일 `agenda.js`, `agenda.css`를 봤다. 코드는 고치지 않았다. 커밋, 푸시, 배포, 실제 Firebase 쓰기도 하지 않았다.

## 1. R1 지적 다시 확인
| 번호 | R1 심각도 | 지금 | 근거 |
|---|---|---|---|
| U01 | 사소 | 해결 | api.js `refresh()` 가 응답 뒤와 로그인 뒤에 `if (!S \|\| S.mid !== mid) return` |
| U02 | 중요 | 해결(작은 잔여는 U15) | api.js 세대 번호 `gen`. `leave()` 가 올리고, `begin()` 이 로그인 앞뒤로 비교해서 다르면 `quietLeave`(나감 신호)와 자격 지우기를 한다. join, resume, becomeHost 모두 `myGen` 을 넘긴다 |
| U03 | 중요 | 해결 | draw.js:533 epoch 를 모르면 획 epoch 를 `null` 로 두고, `flush` 는 null 획을 기다린다. epoch 스냅숏이 오면 `resolveEpoch` 가 지금 값을 붙여 보낸다. `dropStale` 는 null 획을 버리지 않는다. 쪽을 넘겨도 결정되지 않은 획이 있는 쪽은 `lingering` 으로 계속 듣는다 |
| U04 | 사소 | **남음** | hands.js:55 1.5초 `setTimeout` 을 아직 기억하지 않는다(unmount 뒤 `paint`, 연타 때 앞 타이머가 뒤 낙관 상태를 지움) |
| U05 | 사소 | 해결 | draw.js `dead` 플래그. `flushSoon`, `flush`, `finally`, `pumpDelete` 가 멈춘다. draw_e2e U05 단언도 통과(아래) |
| U06 | 사소 | 해결 | api.js `spatch` 가 값이 같으면 이벤트를 내지 않고, draw.js:701 은 `prev.server !== 'ok'` 에서 `ok` 로 바뀔 때만 다시 보낸다(store 가 `prev` 를 넘김, app.js:16-17) |
| U07 | 사소 | 해결 | api.js `pollTally` 가 응답 뒤 `S.role !== 'host'` 이면 403 으로 버린다. d4 「강등 뒤 숫자 지움」 통과 |
| U08 | 사소 | 해결 | api.js `imgCache` 가 `{p, url}` 로 바뀌었고, `releaseImages` 는 아직 받는 중인 그림을 건드리지 않는다. keep 에 경로도 받는다 |
| U09 | 중요 | 해결 | app.js `go()` 가 `unmountAll()`(316줄)을 `api.leave` 보다 먼저 부른다. record.js `flushNow()` 는 그 안에서 마지막 조각을 끊어 대기열과 함께 `transcribe` 를 시작하고, 녹음하던 탭이면 `setState('recording', false)`(keepalive)를 보낸다. 요청이 leave 전에 이미 나가므로 해시 이동으로도 기록이 남는다. 탭 닫기(`pagehide`)는 최선 노력이다(transcribe 는 keepalive 가 아님). 서버도 녹음 켠 사람이 나가면 녹음을 내린다(ANON 보고) |
| U10 | 사소 | 해결 | host.js:284 가운뎃점 대신 「지금 보는 안건」 칩 |
| U11 | 사소 | 해결 | 화면에 보이는 api.js, app.js 문구가 「~어요」로 통일됐다. 남은 「~습니다」는 개발자용 콘솔과 오류(app.js:71, 92)와, 사용자가 지정한 확인 창 문구 「지금부터 화면이 전송됩니다」뿐이다. 내부 파일 이름 대신 「n쪽 그림」, 「원본 파일」을 쓴다 |
| U12 | 사소 | **반만 해결** | `tests/zzoom/__pycache__` 는 없어졌다. `public/zzoom/assets/_src/manifest.json` 의 `source` 경로에는 사용자 계정 폴더 이름이 아직 있고, 로컬 `node server.js` 가 그대로 준다(`/zzoom/assets/_src/manifest.json` 200 확인). .gitignore 라 배포되지는 않는다 |
| U13 | 사소 | 해결 | api.js:162-166 실시간 로그인이 실패하면 `S=null`, 타이머를 멈추고, 자격은 남긴다. 다시 누르면 `join()` 이 남은 자격으로 `resume` 을 먼저 시도한다(같은 cid) |
| U14 | 사소 | **820 해결, 390 남음** | zzoom.css:190, 193 옆칸 덮개가 쪽 막대 위에서 끝나 820 에서 ✋ 를 누를 수 있다(엣지, 크로미움 820 확인, `r2/d4/edge-820-hands-host.png`). 768px 미만 아래 서랍(zzoom.css:208, `bottom:0; height:55vh`)은 그대로 쪽 막대를 덮는다. 아래 「390 d4 시간 초과」 참고 |

## 2. 새 지적(바뀐 부분)
| 번호 | 심각도 | 파일:줄 | 문제 | 재현 | 고칠 방향 |
|---|---|---|---|---|---|
| U15 | 사소 | public/zzoom/api.js:156-172 | U02 수정의 남은 틈. 회의 A 의 `begin()` 이 실시간 로그인을 기다리는 사이 나가서 곧바로 회의 B 에 들어가면, A 의 늦은 `signInWithCustomToken` 이 B 의 로그인 뒤에 끝날 수 있다. 그러면 Firebase 사용자가 A 의 것으로 바뀌고, 이어서 171줄 `fbSignOut()` 이 B 의 로그인까지 끊는다. B 구독은 permission-denied 와 「다시 입장해 주세요」 토스트를 낸다 | 느린 연결에서 회의 A 로 들어감, 1초 안에 로고를 누름, 곧바로 회의 B 로 들어감(코드 읽기로 찾았고 시험은 없음) | 로그인도 세대 순서로 묶는다(`fbSignIn` 을 체인으로 줄 세우고 늦게 끝난 옛 세대는 지금 세대 토큰으로 다시 로그인). 또는 옛 세대일 때 `fbSignOut` 대신 `S` 가 있으면 `S` 의 토큰으로 다시 로그인 |
| U16 | 사소 | public/zzoom/agenda.js:134-136, 386 | 「오늘의 안건」을 손으로 연 사람(`S.open`)은 다른 사람이 「발표하기」를 눌러도(forceSeq 증가) 패널이 그대로 무대를 덮는다. 아래 화면은 발표자 쪽으로 따라가지만 보이지 않는다. 「무조건 발표자가 가져간다」는 결정과 어긋난다. 닫기 한 번이면 보이고, 자동으로 펼쳐진 경우는 작은 단추로 바뀌므로 사소로 봤다 | 진행 중, 누군가 발표 중일 때 「오늘의 안건」 단추로 패널을 연다. 다른 사람이 발표하기를 누른다. 쪽 번호는 바뀌는데 패널이 그대로 있다(`r2/probe/edge_820_force_while_open.png`, 엣지, 크로미움 세 크기 모두 같음) | live 를 받을 때 `forceSeq` 가 커지면 `S.open=false; S.dismissed=true` |
| U17 | 사소 | public/zzoom/app.js:313-320 / agenda.js:305, 222 | 화면을 옮겨도(해시 이동) 열린 모달을 닫지 않는다. ① agenda 가 unmount 되면 올리기 작업은 끊기지만 「자료 올리기」 창은 진행 막대가 멈춘 채 남는다 ② 「발표하기」 확인 창도 남아서 다른 회의에서 「예」를 누르면 옛 mid 로 `present` 를 불러 「참가 자격이 없어요」 토스트가 뜬다. 해는 없지만 어색하다 | 자료 변환 중이나 확인 창이 열린 채 로고를 누른다 | `go()` 에서 `#zz-modal-root` 를 비우거나 열린 모달의 `close()` 를 부른다. agenda unmount 에서 자기 모달을 닫는다 |
| U18 | 사소 | public/zzoom/app.js:170 / agenda.js:225 | 확인 창은 첫 단추에 초점을 준다. 「발표하기」 확인 창에서는 그 단추가 「예」라서, 창이 뜨자마자 Enter 나 Space 를 누르면 화면이 바로 전송된다. 문구와 단추 순서는 브리프와 같다 | 발표하기를 누르고 곧바로 Enter → present 호출(초점 `예` 확인) | 확인 창만 「아니오」에 초점을 주거나 본문에 초점을 둔다 |
| U19 | 사소(참고) | public/zzoom/agenda.js:251 / api.js:452, 584 | 익명화 범위 밖의 틈. 안건 제목을 파일 이름으로 미리 채우고, 원본 이름(`originalName`)을 저장해 「원본 받기」로 그대로 내려준다. 파일 이름에 사람 이름이 들어 있으면(예: 「○○○_계획서.hwp」) 올린 사람이 드러날 수 있다 | 사람 이름이 든 파일로 안건 추가 | 올리기 창에 「파일 이름도 모두에게 보여요」 한 줄을 넣거나, 원본 이름을 저장하지 않고 안건 제목과 확장자로 받기 이름을 만든다(사용자 판단) |

## 3. 바뀐 부분 확인(이상 없음)
- **대기 화면 「오늘의 안건」**(agenda.js, agenda.css): 준비 상태와 진행 화면이 빈 동안은 크게, 누군가 발표하면 작은 단추로 바뀐다. 번호와 제목, 쪽 수, 「자료 없음」, 「내 안건」, 「발표 중」이 보인다. 올린 사람 표시는 없다. 사용자 값(제목, 파일 이름)은 모두 `textContent` 로 넣는다(`innerHTML` 없음). 남의 안건에는 고치기 단추가 없다. 서버 권한은 다른 감사자 몫이다.
- **안건 추가와 자료 올리기**: 제목만 만들 수도 있고 파일을 함께 올릴 수도 있다. 미리 검사는 형식, 빈 파일, 50MB, 30개, 내 10개다. 변환과 올리기 모두 진행과 취소가 있고 미리 보기 뒤에 올린다. 업로드는 api.js `attachAgendaFile` 만 쓴다(직접 fetch 없음).
- **터치하면 이동**: `cmd:nav` 만 보낸다. 발표자가 아니면 자유 보기가 되고 `sendLive` 를 부르지 않는다(시험 확인).
- **「발표하기」 확인 창**: 본문은 정확히 「지금부터 화면이 전송됩니다」, 단추는 「예」와 「아니오」다. 다른 사람이 발표 중이면 같은 창 위에 「지금 다른 분이 발표 중이에요.」 한 줄이 더해진다. 「아니오」나 Esc 를 누르면 `present` 를 부르지 않는다(직접 시험, 호출 0). 준비 상태에서는 단추가 꺼져 있다.
- **모두가 따라감**: 자유 보기 중인 참석자에게 forceSeq 가 커진 live 가 오면 `follow` 로 돌아와 그 쪽으로 간다. 직접 시험에서 세 크기와 두 브라우저 모두 `['follow', aaaaaaa1 4쪽]` 이었다. viewer.js 는 발표자를 역할이 아니라 `meeting.presenter.cid` 로 판단한다. 자료 없는 안건은 그리지 않고 live 도 보내지 않는다.
- **익명화**: join.js 는 이름 칸 없이 「입장하기」와 「익명으로 참여해요. 이름은 저장되지 않아요.」만 보인다. 머리줄은 「익명 참여」다. 채팅은 내 글만 「나」다. 손은 「n명」, 「n번째 손」, 내 손 「나」, 주관자는 「하나 내리기」와 「모두 내리기」다. 접속자는 수만 보인다. 투표는 늘 비공개이고 이름이 없다. host 상태 글은 「다른 분이 진행 중」이다. `public/zzoom` 에는 `airoom_ws_name`, `staffNames`, `rememberName` 이 주석 말고는 없다(grep). 화면 코드에서 사람 `name` 을 읽는 곳도 없다.
- **회의 만들기 누구나**(list.js): 「회의 만들기」는 모두에게 보이고, 수정, 삭제, 잠금 풀기는 `isAdmin || m.mine` 일 때만 보인다. d1 132/0.
- **host.js**: 접속자 수(`presenceCounts`)와 안건 창 「안건 추가」(`cmd:agenda-add` 로 agenda.js 창을 위에 띄움)가 있다. 「자료 없음」을 보인다.
- **문구**: `public/zzoom` 화면 문자열에 가운뎃점과 화살표가 없다(파이썬으로 따옴표 안만 검사).
- **44px**: 직접 잰 결과 엣지와 크로미움 1280, 820, 390 모두 대기 화면 단추, 작은 「오늘의 안건」 단추, 발표 확인 창, 안건 추가 창 단추와 입력이 44px 미만인 것이 0개다. 가로 넘침은 0이고, 작은 단추는 쪽 막대와 겹치지 않는다.

## 4. 390 폭 d4 시간 초과는 제품 결함인가
**제품 동작이 맞다(U14 의 390 부분).** d4_e2e 를 저장소 밖 사본으로 390×844 에서 돌리면 `#zz-quick-hand button` 클릭이 「`#zz-side-hands` … intercepts pointer events」로 시간 초과가 난다. 시험 틀만의 문제인지 보려고 진짜 app.js, viewer.js, agenda.js, hands.js 를 조립해 옆칸 「손」 탭을 열고 ✋ 단추 가운데의 맨 위 요소를 쟀다.

| 브라우저 | 1280 | 820 | 390 |
|---|---|---|---|
| 엣지 | 누를 수 있음 | 누를 수 있음 | **가려짐**(맨 위 `#zz-side-hands`) |
| 크로미움 | 누를 수 있음 | 누를 수 있음 | **가려짐** |

768px 미만에서는 아래 서랍이 화면 아래 55vh 를 덮는데, 그 안에 쪽 막대(✋ 포함)가 들어간다. 「손」 칸 안에는 손들기 단추가 없다(`raiseInPanel: false`). 그래서 휴대폰에서는 손 목록을 보면서 손을 들 수 없고 서랍을 먼저 닫아야 한다(`r2/probe/edge_390_hands_open.png`). 심각도는 R1 과 같은 사소다. 고칠 방향은 「손」 칸 머리에도 손들기 단추를 두는 것이다(820 에도 도움이 된다). d4_e2e 크기 목록에 390 을 다시 넣을 수 있다.

## 5. 문구와 실제 이름(저장소 grep, 명부 33명)
- `public/zzoom`, `tests/zzoom`, `lib/zzoom` 에서 걸린 것은 `assets/_src/manifest.json`(U12)뿐이다.
- 화면 범위 밖 참고: `docs/meeting-2026-11-25/reports/PII_SWEEP.md:20-27` 이 「찾은 실명」을 표에 그대로 적어 두었다(교직원 실명 여러 명). `reports/D5.md:27` 과 `reports/FIX_ENGINE.md:153` 에는 사용자 계정 폴더 이름이 든 경로가 있다. 문서가 공개 저장소로 커밋되면 실명이 나가므로, 이름을 가리거나(김○수) 줄 번호만 남길 것을 권한다.

## 6. 직접 실행한 명령과 결과(2026-11-26, 스크린샷은 저장소 밖 scratchpad `r2/`)
| 명령 | 결과 |
|---|---|
| `node --test tests/zzoom/d1.unit.test.mjs` | 3 / 0 |
| `node --test tests/zzoom/d2.unit.test.mjs` | 11 / 0 |
| `node --test tests/zzoom/draw.test.mjs` | 18 / 0 |
| `node --test tests/zzoom/d4.unit.test.mjs` | 7 / 0 |
| `node --test tests/zzoom/host.test.mjs` | 12 / 0 |
| `npm run test:zzoom` | 81 / 0(todo 0, skip 0) |
| `python -X utf8 tests/zzoom/d1_e2e.py` | 통과 132 / 실패 0 |
| `python -X utf8 tests/zzoom/d2_e2e.py` | 통과 82 / 실패 0(엣지, 크로미움 1280, 820, 390 덮개) |
| `python -X utf8 tests/zzoom/d4_e2e.py` | 통과 212 / 실패 0(1280, 820) |
| `python -X utf8 tests/zzoom/d5_e2e.py` | 통과 85 / 실패 0(진짜 app.js, 크로미움 390 포함) |
| `python -X utf8 tests/zzoom/draw_e2e.py` | 통과 263 / 실패 0(U05 단언 포함) |
| `python -X utf8 tests/zzoom/agenda_e2e.py` | 통과 54 / 실패 0(엣지, 크로미움 × 1280, 820, 390, 콘솔 오류 0) |
| d4_e2e 사본, 390×844 | 손들기 클릭 시간 초과(4절) |
| 직접 만든 탐침 `probe_agenda.py`(진짜 app, viewer, agenda) | 44px 미만 0, 가로 넘침 0, Esc 뒤 present 0, 첫 초점 「예」(U18), 손으로 연 패널은 force 뒤에도 덮음(U16), 자유 보기는 force 로 따라감 |
| 직접 만든 탐침 `probe_hand.py`(진짜 hands 포함) | 390 에서 ✋ 가려짐(4절) |
| `PORT=3297 node server.js` 뒤 `python tests/zzoom/e2e_skeleton.py` | 통과 12 / 실패 0. 서버는 확인 뒤 껐다 |

눈으로 본 스크린샷: `agenda/edge_1280_3_added_with_file.png`(1280 패널, 내 안건, 고치기 단추), `agenda/edge_390_3_added_with_file.png`(390 줄바꿈과 단추 들여쓰기 정상), `agenda/edge_390_7_confirm_busy.png`(창 하나에 두 줄, 예와 아니오), `agenda/edge_820_6_mini_other_presenting.png`(작은 단추, 「진행자 화면을 따라가는 중」), `agenda/edge_390_8_presenting.png`, `agenda/chromium_390_9_free_view.png`(「진행자 화면으로 돌아가기」 띠), `probe/edge_820_force_while_open.png`(U16), `probe/edge_390_hands_open.png`(4절), `d4/edge-820-hands-host.png`(820 ✋ 보임), `d5/chromium_390_03_agenda.png`. 겹침은 토스트(z 70)가 잠깐 단추를 덮는 것뿐이다(R1 과 같음, 3.5초 뒤 사라짐).

## 7. 시험의 빈틈
- agenda.js 의 순수 함수(`waitMode`, `confirmLines`, `precheckFile`)를 다루는 단위 시험이 없다. agenda_e2e 만 있다.
- agenda_e2e 는 「손으로 연 패널 + 새 발표」(U16)와 「자유 보기 뒤 새 forceSeq 로 끌려옴」을 다루지 않는다. 끌려옴은 이번에 직접 확인했다.
- U15(입장 겹침 중 로그인 순서), U17(화면 이동 뒤 남는 모달)을 다루는 시험이 없다.
- d4 와 draw 시험은 390 을 돌리지 않는다. 390 에서 진짜 app 으로 옆칸을 여는 시험은 d5(빈 hands 모듈)뿐이다.
- 실제 Firebase(업로드 전용 출입증으로 로그인을 바꾸는 동안의 구독, `getBlob`)는 이번에도 돌리지 못했다.
