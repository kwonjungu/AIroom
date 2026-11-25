# 화면 영역 감사 R1 (영역 ②)

**FAIL** — 중요 3건(U02·U03·U09), 치명 0, 사소 11. 보안(XSS·비공개 투표·pt 노출·주관자 기능 숨김)은 막혀 있음.

## 지적
| 번호 | 심각도 | 파일:줄 | 문제 | 재현 | 고칠 방향 |
|---|---|---|---|---|---|
| U01 | 사소 | public/zzoom/api.js:203-211 | `refresh()` 가 응답 뒤 `S` 가 null 인지 보지 않는다. 갱신 요청 중에 `leave` 가 끝나면 `S.role` 에서 TypeError(경고만 남음) | 50분 갱신 요청 중 목록으로 이동 → 콘솔 「토큰 갱신 실패 TypeError」 | `if (!S || S.mid !== mid) return` 을 응답 뒤에 둔다 |
| U02 | 중요 | public/zzoom/app.js:299-306, 347-354 / api.js:179-196 | `go()` 는 `api.leave` 를 먼저 부르는데, 앞 회의의 `resume`/`join` 이 아직 진행 중이면 그 뒤에 `begin()` 이 끝나 `S`·heartbeat(60초)·Firebase 로그인이 살아남는다. seq 검사는 화면만 막고 api 상태는 못 막는다 | 회의 주소로 들어가 resume 응답이 오기 전에 로고(목록)를 누름 → 목록 화면인데 60초마다 `/heartbeat` 가 계속 나가고 접속자 명단에 남음 | api 에 세대 번호(또는 AbortSignal)를 두고 leave 뒤 끝난 begin 은 곧바로 정리, 또는 app 이 seq 불일치 때 `api.leave(mid)` 를 다시 부름 |
| U03 | 중요 | public/zzoom/draw.js:235, 311-314, 346-351, 515 | 쪽을 새로 구독한 직후 epoch 문서가 아직 안 왔을 때(`epochKnown:false`, 기본 0) 그린 선에 epoch 0 이 붙는다. 그 쪽이 한 번이라도 지워진 쪽(epoch≥1)이면 epoch 스냅숏이 도착하는 순간 `dropStale` 가 대기 중인 그 선을 말없이 버리고, 이미 보냈으면 서버 `stale_epoch` → 「쪽이 지워져서…」 토스트와 함께 버린다. `PAGE_LRU = 1` 이라 쪽을 넘길 때마다 이 창이 다시 열린다 | 주관자가 「쪽 지우기」 한 쪽(epoch 1)으로 넘기자마자(스냅숏 도착 전) 펜으로 씀 → 선이 잠깐 보였다가 사라짐 | `epochKnown` 이 false 면 펜 입력을 받지 않거나, 획의 epoch 를 보내기 직전(`flush`)에 `pages.get(pageKey).epoch` 로 정하고 `dropStale` 는 「epoch 를 안 뒤 시작한 획」에만 적용 |
| U04 | 사소 | public/zzoom/hands.js:312 | 손들기 뒤 1.5초 타이머를 기억하지 않아 unmount 뒤에도 `paint()` 가 돌고 `store.set('badges', {hands:n})` 로 떠난 뒤 배지를 되살린다. 빨리 두 번 누르면 첫 타이머가 두 번째 낙관 상태를 지움 | 손들기 누르고 1초 안에 목록으로 이동 → 다른 회의 들어가면 「손」 탭 배지가 옛 값 | 타이머를 모아 unmount 에서 `clearTimeout`, 새로 누를 때 앞 타이머 취소 |
| U05 | 사소 | public/zzoom/draw.js:425-429, 447-461 | unmount 뒤에도 진행 중인 `flush()`·`pumpDelete()` 의 finally 가 `flushSoon()`·`setTimeout` 을 다시 잡는다(`dead` 표시 없음). 자격을 잃고 다시 입장하면 옛 인스턴스가 새 자격으로 대기 선을 보냄 | 느린 연결에서 선 보내는 중 자격 오류(role null) → 재입장 | `dead` 플래그로 finally·타이머 콜백을 끊는다 |
| U06 | 사소 | public/zzoom/draw.js:683 / api.js:256 | heartbeat 가 성공할 때마다 `conn` 을 patch 하므로(값이 같아도 이벤트) 실패 선이 있으면 60초마다 `retryFailed()` 가 백오프·횟수를 0으로 되돌린다. CONTRACT/D3 보고의 「한 번 자동 재시도」와 다르고 영구 실패(예: 규칙 거절이 5xx 로 올 때)면 끝없이 1분마다 6번씩 다시 보냄 | 서버가 5xx 를 계속 줌 → 1분마다 6회 요청 반복 | `conn.server` 가 off→ok 로 바뀔 때만 재시도(prev 비교) |
| U07 | 사소 | public/zzoom/poll.js:104-110, 226 | 주관자 `pollTally` 응답이 강등(role 이벤트) 뒤에 도착하면 `hostTally` 를 다시 채워 참석자 화면에 비공개 투표 숫자가 reveal 전까지 남는다(`resultView` 가 역할을 보지 않음). 보는 사람은 방금까지 주관자였던 본인뿐이라 노출 범위는 작음 | 투표 칸 열린 채 주관 코드가 바뀌어 viewer 로 내려감, 그 순간 tally 요청 진행 중 | 응답 뒤 `isHost()` 재확인, `resultView` 에 host 여부를 넘겨 비주관자는 hostTally 무시 |
| U08 | 사소(확인 필요) | public/zzoom/api.js:436-441 + viewer.js:300-309 | `releaseImages(keep)` 는 아직 풀리지 않은 Promise 도 끝날 때 URL 을 지우고 캐시에서 뺀다. viewer 는 `c.url` 이 정해진 것만 keep 에 넣으므로, 받는 중인 다음 쪽·썸네일은 받자마자 revoke·캐시 삭제된다. 그림 요소에 src 를 넣은 직후라 대개 보이지만(확인 필요) api 캐시가 비어 같은 쪽을 다시 getBlob 한다(Storage 내려받기 과금) | 빠르게 쪽 넘김 → 같은 다음 쪽 그림을 반복 다운로드(네트워크 탭) | keep 을 URL 대신 경로(path)로 받거나, 진행 중 Promise 는 건드리지 않음 |
| U09 | 중요 | public/zzoom/record.js:357-369, 399-409 / app.js:303 | 녹음 중에 회의 밖으로 나가면(로고·목록 링크, 해시 이동이라 `beforeunload` 경고 없음) unmount 가 `stopLocal()` 뒤 곧바로 `queue.close()` 를 부른다. `mr.stop()` 의 `onstop` 은 비동기라 마지막 조각(최대 1분)은 닫힌 대기열에 들어가 보내지지 않고, 대기 중이던 조각도 버려진다. 서버에 `recording:false` 도 보내지 않아 모두에게 「녹음 중」이 계속 보인다 | 주관자 녹음 시작 40초 뒤 머리줄 로고 누름 → 그 40초 기록 없음, 참석자 화면 「● 녹음 중」 유지 | 녹음 중·대기열이 남았으면 나가기 전에 확인 창(해시 이동도 app 이 물어봄), 또는 unmount 에서 마지막 조각을 받은 뒤 보내기를 끝까지 하고 `setState('recording', false)` |
| U10 | 사소 | public/zzoom/host.js:277 | 화면 문구에 가운뎃점: `' · 지금 보는 안건'` (규칙 위반) | 안건 관리 창에서 진행 중 안건 줄 | 「지금 보는 안건」을 칩이나 괄호로 |
| U11 | 사소 | public/zzoom/api.js:40,230,328,359,361,381,387,403 / app.js:100,205,328-344 | 문체가 둘로 갈림: 팀 모듈은 「~어요」, 뼈대(api·app) 문구는 「~습니다」. 같은 화면 토스트에 섞여 나옴. api.js:381 은 내부 파일 이름(`p001.webp 올리기에 실패했습니다.`)을 사용자에게 보임 | 업로드 실패·연결 끊김 토스트 | 「~어요」 한 가지로, 파일 이름 대신 「n쪽 그림」 |
| U12 | 사소 | public/zzoom/assets/_src/manifest.json:12 외 / tests/zzoom/__pycache__/d5_e2e.cpython-313.pyc | 실제 사람 이름 grep(명부 18명) 결과: 소스·시험 .js/.py/.md 에는 없음. 다만 ① manifest 의 `source` 경로에 사용자 계정 폴더 이름(실명)이 남아 있고, `.gitignore` 라 배포는 안 되지만 로컬 `node server.js` 는 `/zzoom/assets/_src/manifest.json` 으로 그대로 서빙 ② 옛 d5_e2e 의 바이트코드 캐시에 실명(현재 .py 는 깨끗) | `curl http://127.0.0.1:3297/zzoom/assets/_src/manifest.json` | `_src` 를 public 밖으로 옮기거나 경로를 상대로, `__pycache__` 지우기 |
| U13 | 사소 | public/zzoom/api.js:156-165, 173-177 | `begin()` 이 자격 저장(`S`·sessionStorage) 뒤 Firebase 로그인을 기다리다 실패하면 heartbeat·갱신 예약·`role` 없이 반쯤 입장한 상태로 남는다. 입장 화면은 오류만 보이고 다시 누르면 새 `join` 으로 cid 가 하나 더 생김 | Firebase SDK 차단(gstatic 막힘)에서 「입장하기」 두 번 | 로그인 실패 때 `S=null`·`dropGrant`, 또는 같은 자격으로 로그인만 다시 시도 |
| U14 | 사소 | public/zzoom/zzoom.css:184-199 / hands.js:288-290 | 1024px 미만(갤럭시탭 세로 820)에서 옆칸을 열면 덮개가 쪽 막대의 ✋ 손들기 단추(`#zz-quick-hand`)를 가린다. 「손」 탭 안에는 손들기 단추가 없어 손 목록을 보면서는 손을 들 수 없음. d4 화면 시험이 820 에서 이 때문에 멈춘다(아래) | 820×1180, 옆칸 「손」 탭 열기 → ✋ 누르기 불가(`#zz-side-hands` 가 포인터를 가로챔) | 「손」 칸 머리에도 손들기 단추를 두거나 서랍 높이를 쪽 막대 위로 제한 |

## 볼 것별 정리
1. **보안**
   - XSS: 팀 모듈 11개에 `innerHTML`·`insertAdjacentHTML` 없음. 모두 `textContent`/`createTextNode`/`setAttribute`. `innerHTML` 은 app.js:223·343 두 곳뿐이고 상수 문자열. 이름·채팅·투표 질문·안건 제목·기록 글은 모두 글자 노드로 들어감. 이상 없음.
   - 비공개 투표: poll.js 는 `p.tally` 를 `revealed` 일 때만, 이름은 `revealed && anonymous===false` 일 때만 그림(poll.js:27-35). 내 선택은 `myVote` 결과만. 예외는 U07(강등 경합, 본인에게만).
   - 토큰·pt: pt 는 `X-Zzoom-Pt` 머리글(api.js:34)과 sendBeacon 본문(api.js:269)으로만 나감. URL·콘솔 로그에 없음(transcribe 쿼리는 n·at·aid·page 뿐). `window.__zzoom` 에 api 를 열어 두었지만 `S`(pt) 는 내보내지 않음.
   - 주관자 기능 숨김: `#zz-hostbar` 기본 `display:none`, `body.is-host.route-meeting` 때만 보임(zzoom.css:125-130). host·upload 는 `role==='host'` 때만 mount(app.js:378-387), board 띄우기·새 쪽·쪽 지우기·투표 만들기·손 내리기·채팅 남의 글 지우기도 각 모듈이 role 로 가림. 참석자 화면에서 주관자 단추가 보이는 경로 없음.
2. **약속 위반**: 팀 모듈의 직접 fetch·Firebase 호출 없음(grep). 팀 사이 import 는 viewer→board(`paintBoardBackground`, 늦은 import)·draw→vendor 뿐(허용). 남의 자리 id 를 찾는 코드 없음. store 쓰기도 표 대로(viewer: follow·page·viewport, draw: tool, 4·5팀: badges). D3 가 요청한 `subscribePageStrokes`·쪽 LRU 는 api 에 없고 SKELETON.md:78 에 「비용 줄이기 취소 지시」로 적혀 있어 결정 사항으로 봄(쪽 넘길 때마다 그 쪽 선 전체 다시 읽기, LOAD.md 4번).
3. **정확성**: U01·U02·U03·U05·U06·U08·U09·U13. 그 밖에 viewer 의 늦은 그림 버림(loadSeq)·진행자 300ms 묶음·409 처리, chat·poll·list 의 seq/alive 확인, app 의 mountSeq 는 읽어 보니 맞음.
4. **기기**: 아래 시험. 1024px 미만 덮개 배치(zzoom.css 22:09 수정)는 실제 app.js 조립(d5)에서 엣지·크로미움 820·390 모두 막대 단추가 보이고 겹침 없음을 스크린샷으로 확인(`auditui2/d5/edge_820_01b_live.png`, `chromium_390_01b_live.png`). 첫 실행 때 엣지 820 에서 「더 보기」가 안 보여 4건 실패했으나 host.css(22:15 수정, 진행 중) 뒤 다시 돌리니 통과.
5. **문구**: U10·U11. 실제 사람 이름은 U12 의 두 곳 말고 없음.

## 진행 중 파일
`zzoom.css`·`api.js`·`app.js`(뼈대), `host.js`·`upload.js`·`record.js`·`host.css`(D5) 는 감사 중에도 바뀌었다(host.js 22:12, host.css 22:15). 이 보고는 22:20 무렵 읽은 상태 기준이다.

## 실행한 명령과 결과 (2026-11-25 22:10~22:30, 저장소 밖 scratchpad `auditui`·`auditui2`·`auditui3`)
| 명령 | 결과 |
|---|---|
| `node --test tests/zzoom/d1.unit.test.mjs` | 통과 3 / 실패 0 |
| `node --test tests/zzoom/d2.unit.test.mjs` | 통과 11 / 실패 0 |
| `node --test tests/zzoom/draw.test.mjs` | 통과 18 / 실패 0 |
| `node --test tests/zzoom/d4.unit.test.mjs` | 통과 7 / 실패 0 |
| `node --test tests/zzoom/host.test.mjs` | 통과 11 / 실패 0 |
| `python -X utf8 tests/zzoom/d1_e2e.py <dir>` | 통과 136 / 실패 0 |
| `python -X utf8 tests/zzoom/d2_e2e.py <dir>` (두 번) | 통과 78 / 실패 4 — 엣지·크로미움 820 의 「늦은 렌더 버림」「밀어 쪽 넘기기」. 원인은 시험: 1024px 미만에서 `#zz-agenda` 가 화면 밖 덮개가 됐는데(zzoom.css 22:09) 시험이 덮개를 열지 않고 안건 단추를 누름(「element is outside of the viewport」). 화면 결함 아님, 시험 갱신 필요 |
| `python -X utf8 tests/zzoom/draw_e2e.py <dir>` | 통과 149 / 실패 2 — 엣지·크로미움 820 에서 예외로 중단. 시험 틀(app.js 없음)은 옆칸을 열린 채 두는데 새 배치에서 옆칸이 무대를 덮어 클릭이 막힘(`#zz-side-chat … intercepts pointer events`, 스크린샷 `auditui/draw/msedge-820x1180-error.png`). 시험 갱신 필요 |
| `python -X utf8 tests/zzoom/d4_e2e.py <dir>` (두 번) | 엣지 1280 뒤 엣지 820 에서 예외로 중단(합계 출력 없음). 옆칸 「손」을 연 채 ✋ 단추를 누르는데 덮개가 가림 → U14 |
| `python -X utf8 tests/zzoom/d5_e2e.py <dir>` (진짜 app.js 조립) | 1회차 통과 71 / 실패 4(엣지 820 「더 보기」 안 보임, host.css 수정 전), 2회차 **통과 75 / 실패 0** |
| `PORT=3297 node server.js` 뒤 `python tests/zzoom/e2e_skeleton.py http://127.0.0.1:3297` | 통과 12 / 실패 0, 콘솔 오류 0, 빈 모듈 대체 0 |

눈으로 본 스크린샷: `auditui2/d5/edge_820_01b_live.png`(820 주관자 막대 5칸, 겹침 없음), `auditui/d5/chromium_390_01b_live.png`(390 서랍 탭과 막대, 토스트가 탭 글자를 잠깐 덮음), `auditui/d5/edge_1280_01b_live.png`, `auditui/d2/edge_390_stage.png`, `auditui/d1/chromium-820-list-admin.png`, `auditui/draw/msedge-820x1180-error.png`.

## 시험의 빈틈
- draw_e2e 가짜 api 는 epoch 를 5ms 뒤 바로 줘서 U03(epoch 모르는 동안 그린 선)을 재현하지 못함. 늦게(예: 500ms) 주는 경우를 더할 것.
- record 의 「녹음 중 회의 밖으로 이동」(U09), app 의 「resume 중 목록으로 이동」(U02)을 다루는 시험이 없음.
- d2·d4·draw 시험 틀이 1024px 미만 덮개 배치를 모름(옆칸을 닫거나 안건 덮개를 열고 눌러야 함). 진짜 app.js 로 820 을 보는 시험은 d5 뿐이고 d5 는 viewer·draw 를 빈 모듈로 끼움.
- 실제 Firebase(onSnapshot·getBlob·uploadBytes·맞춤 토큰)는 이번에도 돌리지 못함(서비스 계정 없음). U08 은 「확인 필요」.
