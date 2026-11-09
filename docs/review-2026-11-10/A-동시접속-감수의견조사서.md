# 감수 의견 조사서 A — 중복 로그인(동시 접속) 시 두 계정 모두 먹통

- 대상: 채용 관리 시스템(`/recruitment`, `/hub/s/<학교>/recruitment`, `/copy/recruitment`)
- 작성: 2026-11-10 · 수정 담당 Claude · 감수 판정은 별도 감수 에이전트
- 원칙: **본질은 그대로 둔다** — 채용 한 건을 한 덩어리(aggregate)로 저장하고 버전으로 동시 변경을 막는 설계, 권한 모델, 도메인 규칙(제출 잠금·확정 불변·서명 필수)은 바꾸지 않는다.

## 1. 현상
같은 채용에 두 사람이 동시에 들어와 있으면(위원 2명, 또는 학교 코드를 함께 쓰는 담당 교사 2명) 한 사람이 저장한 뒤부터
다른 사람의 임시 저장·서명·제출이 모두 "다른 사용자가 변경했습니다. 새로고침 후 다시 확인하세요."(409)로 막힌다.
막힌 사람이 새로고침해서 저장하면 이번엔 처음 사람이 막힌다. 번갈아 저장하는 실제 심사장에서는 **두 계정이 모두 먹통**처럼 보인다.

## 2. 조사 결과(근거)
| 번호 | 확인한 곳 | 내용 |
|---|---|---|
| A-1 | `server.js` `saveSession`/`validateSession`, `lib/hub/index.js` 세션 | 세션은 토큰마다 따로 저장된다. 새 로그인이 옛 세션을 지우는 코드는 없다 → **세션 충돌이 원인이 아니다** |
| A-2 | `lib/recruitment/store.js` `mutate` | 채용 한 건 전체가 버전 번호 하나를 공유한다. 요청의 `version` 이 저장본과 다르면 무조건 409 |
| A-3 | `lib/recruitment/routes.js` | 위원 자기 몫의 쓰기(`pledge`, `evaluations/:stage/save`, `submit`)도 같은 버전 검사를 받는다. 위원 갑의 저장이 위원 을의 버전을 낡게 만든다 |
| A-4 | `public/recruitment/app.js` `mutate`/`api` | 409 를 받아도 `state.current` 를 다시 불러오지 않는다. 화면은 계속 낡은 버전을 보내 **새로고침 전까지 모든 단추가 실패**한다. 새로고침하면 입력 중이던 점수를 잃는다(`beforeunload` 경고) |
| A-5 | Redis CAS 스크립트 | 두 저장 요청이 같은 순간 오면 둘 다 같은 버전을 읽고, 한쪽 CAS 가 실패해 409 가 된다(순간 경쟁) |

재현 시험: `tests/recruitment/concurrent-login.test.js` — 수정 전 5건 모두 실패 확인.

## 3. 감수 의견(수정 방침)
| 번호 | 의견 | 수정 내용 | 본질 영향 |
|---|---|---|---|
| O-1 | 위원 자기 몫 쓰기는 다른 사람 변경과 의미상 충돌하지 않는다 | 저장소 `mutate(id, version, fn, { rebase: true })` 추가: 버전이 달라도 **최신 저장본에 fn 을 다시 적용**하고 CAS 가 경합으로 실패하면 몇 번 다시 시도한다. 서명·임시 저장·제출 3개 경로에만 쓴다 | 버전 검사·CAS 는 그대로. 도메인 검사(제출 잠금, 확정 뒤 금지, 담당 위원 확인)는 최신 상태 기준으로 그대로 돈다 |
| O-2 | 최신 상태에 다시 적용할 때 초대 링크 재발급을 놓치면 안 된다 | rebase 로 다시 적용할 때마다 위원의 `inviteHash` 가 접속 토큰과 여전히 같은지 다시 확인. 다르면 401 | 권한 모델 강화(완화 아님) |
| O-3 | 관리자 결정(면접 대상 선정, 확정, 재개방, 링크 발급)은 낡은 화면을 근거로 덮어쓰면 안 된다 | 관리자 경로는 **엄격한 버전 검사 유지**. 대신 409 응답에 `currentVersion` 을 실어 보낸다 | 없음 |
| O-4 | 409 를 받은 화면이 스스로 회복해야 한다 | `app.js`: 409 이면 최신 채용을 다시 불러와 `state.current` 를 바꾼다. 입력 중(`state.dirty`)이면 화면을 다시 그리지 않아 입력값을 지키고, 아니면 다시 그린다. 안내: "다른 분이 먼저 저장해 최신 내용을 불러왔습니다. 확인 후 다시 눌러 주세요." | 없음 |
| O-5 | 로컬 파일 저장(개발용)도 같은 규칙 | 파일 저장소는 이미 직렬 큐가 있어 rebase 는 버전 비교만 건너뛴다 | 없음 |

## 4. 판정 기준(감수 에이전트용)
1. 시험: `npm run test:recruitment` 전부 통과(새 시험 포함), `node --test tests/hub.test.js` 통과.
2. 위원 두 명이 같은 낡은 버전으로 번갈아 저장·서명·제출해도 모두 200, 두 사람 점수가 서로 덮이지 않음.
3. 재발급으로 막힌 링크, 제출 뒤 저장, 확정 뒤 서명은 여전히 거절(보안·도메인 규칙 후퇴 없음).
4. 관리자 경로는 여전히 버전 불일치 시 409 이며 응답에 `currentVersion` 이 있음.
5. 화면: 409 를 받은 뒤 같은 단추를 다시 누르면 성공(새로고침 불필요), 입력 중 점수는 지워지지 않음.
6. 바뀐 범위가 위 의견 밖으로 넓어지지 않았음(본질 유지).

## 5. 수정 기록
### 1차 수정(2026-11-10)
- `lib/recruitment/store.js` `mutate(id, version, fn, { rebase })` — O-1·O-5. 엄격 모드의 409 에 `currentVersion` 첨부(O-3). CAS 경합 시 rebase 는 최대 5회 다시 시도.
- `lib/recruitment/routes.js` — 서명·임시 저장·제출을 `reviewerMutate` 로(위원이면 rebase), 다시 적용할 때마다 `stillInvited` 로 링크 유효성 재확인(O-2). 오류 응답에 `currentVersion`.
- `public/recruitment/app.js` — `api()` 오류에 status·currentVersion, `mutate`·`issueInvite` 가 409 이면 `catchUp()`(O-4). 입력 보존은 위원 채점표가 입력 중일 때만, 관리자는 늘 다시 그림.
- 시험: `tests/recruitment/concurrent-login.test.js`(서버 5건), `tests/recruitment/concurrent_e2e.py`(실제 화면 3건, 하네스 `node tests/recruitment/e2e-server.js`).
- 결과: `npm run test:recruitment` 109 통과·1 건너뜀·0 실패, `node --test tests/hub.test.js` 9 통과, `e2e.py` 27/27, `concurrent_e2e.py` 3/3 (실제 서빙 페이지 `http://127.0.0.1:3199/recruitment`).

### 2차 수정(2026-11-10, 1회차 감수 FAIL 반영)
- 결함(같은 위원 두 기기 조용한 덮어쓰기): 화면이 위원 채점 저장·제출에 자기 평가의 `updatedAt` 을 `base` 로 함께 보낸다(`app.js` `mutate`).
  서버(`routes.js` `reviewerMutate`)는 최신 저장본의 내 평가 시각이 `base` 와 다르면 409 `code: own_conflict` 로 막는다. 화면은 이때 입력 중이어도 최신 내용(다른 기기 점수)을 다시 그려 보여 준다(`catchUp`).
  `base` 를 보내지 않는 옛 화면(브라우저에 남은 옛 app.js)은 rebase 없이 예전처럼 엄격한 버전 검사를 받는다. 서명은 방금 직접 그린 서명이 최신 의사라 base 없이 다시 적용(그 앞의 점수 저장은 base 검사를 받음).
- 권고 1: 관리자 화면이 409 뒤 다시 그릴 때 `state.dirty = false`.
- 권고 2: 엄격 모드 CAS 경합 409 에도 `currentVersion` 첨부(`store.js`).
- 권고 3: 1번 시험이 두 위원의 점수를 각각 단언하도록 고침(값이 없으면 실패).
- 시험 추가: 서버 '같은 위원 두 기기', '옛 화면(base 없음) 엄격 검사', 'CAS 경합 currentVersion' / 화면 `concurrent_e2e.py` '같은 위원 두 기기'.
- 결과: `npm run test:recruitment` 111 통과·1 건너뜀·0 실패, `hub.test.js` 9/9, `e2e.py` 27/27, `concurrent_e2e.py` 4/4 (`http://127.0.0.1:3199/recruitment`, 하네스 서버 재시작 후).
- 참고: 같은 시점에 B 루프(태블릿)가 `app.js` 에 지원자 바로가기(`cand-jump`, `jump` 동작, `syncScoreTotals` 상태 표시)와 `style.css` 를 바꿨다. A 판정 대상이 아니다.

### 3차 손질(2026-11-10, 2회차 PASS 권고 반영)
- `own_conflict` 안내 문구에 "이 기기에서 입력하던 내용은 반영되지 않았고, 먼저 저장된 내용을 불러왔습니다"를 더함(`routes.js`). 동작 변화 없음.

## 6. 감수 판정 기록
(감수 에이전트 판정을 회차별로 적음. 2회 연속 통과 시 종료)

### 1회차 감수 — FAIL (2026-11-10, 감수 에이전트)
대상: `git diff` 의 `lib/recruitment/store.js`·`routes.js`·`public/recruitment/app.js` 와 새 시험 2개. `style.css` 변경(B 루프)은 판정에서 뺐다.
- 기준 1: 통과. `npm run test:recruitment` 109 통과·1 건너뜀·0 실패(110건), `node --test tests/hub.test.js` 9/9, `node --test tests/recruitment/concurrent-login.test.js` 16/16(domain.test 11건을 함께 불러와 16건).
- 기준 2: 통과. 시험 12·13과 별도 탐침(임시 폴더 서버)으로 확인했다. 갑과 을이 같은 v0으로 저장하면 둘 다 200이고 갑 6점, 을 1점이 따로 남는다. 동시 요청 2건도 둘 다 반영됐다(version +2).
- 기준 3: 통과. 시험 14에서 재발급으로 막힌 링크는 401, 제출 뒤 저장은 409, 확정 뒤 서명은 409로 거절된다. `stillInvited` 가 다시 적용할 때마다 최신 상태의 `inviteHash` 와 만료를 다시 본다.
- 기준 4: 통과. 탐침으로 낡은 버전을 보내 보니 shortlist, invites, reopen 모두 409였고 응답에 `currentVersion:8` 이 붙어 있었다. version 이 없으면 409("현재 버전이 필요합니다")로 예전과 같다.
- 기준 5: 통과. `python tests/recruitment/concurrent_e2e.py` 를 `http://127.0.0.1:3199/recruitment` 에서 돌려 3/3이 나왔다. `e2e.py` 는 27/27이지만 종료 코드가 1이다. 원인은 위원 화면의 `GET /api/hub/migrated` 404 4건으로, 이 요청은 바뀌지 않은 `public/recruitment/index.html:6` 이 보내고 시험 서버에는 hub 라우트가 없어서 난다. 이번 변경과는 관계없다.
- 기준 6: **실패**. rebase 가 '다른 사람의 변경'뿐 아니라 **같은 위원 자신의 다른 기기 변경**까지 덮는다. 그래서 버전으로 동시 변경을 막던 본질이 같은 위원 범위에서는 사라졌다.
- 결함(FAIL 사유):
  1. `lib/recruitment/routes.js:64-66`(`reviewerMutate`)과 `lib/recruitment/store.js:41-44`(`rebase`): 같은 위원 링크를 두 기기(PC와 태블릿)에서 열어 둔 경우를 막지 못한다. 태블릿에서 최신 버전으로 저장한 점수(2점)가, 낡은 화면을 든 PC가 나중에 보낸 임시 저장(1점)에 **알림 없이 덮인다**. 예전에는 이 경우 409로 막혔다. 화면의 `submit-evaluation`(app.js:764)은 저장 뒤 바로 제출하므로, 낡은 기기에서 제출을 누르면 옛 점수가 그대로 제출되어 잠긴다. 서명 단추(app.js:750)도 먼저 임시 저장을 하므로 같은 일이 생긴다.
     재현: 위원 갑 토큰으로 v0에서 저장한 뒤, 최신 버전으로 점수 2를 저장(200)한다. 다시 v0으로 점수 1을 저장하면 200이 나고, 최종 점수는 1이 된다.
     고칠 방향(본질 유지): rebase 는 '내 몫이 내가 본 뒤로 바뀌지 않았을 때'만 허용한다. 예를 들어 화면이 자기 평가의 `updatedAt`(또는 자기 몫 버전)을 함께 보내고, 최신 저장본의 같은 값과 다르면 409(`currentVersion` 포함)를 낸다. 시험에 '같은 위원 두 기기' 사례를 추가한다.
- 권고(PASS를 막지 않음):
  - `public/recruitment/app.js` `catchUp`: 관리자 화면에서 409를 받으면 다시 그리므로 면접 대상 선정 사유 같은 입력이 지워지는데, `state.dirty` 는 true로 남는다. 그래서 다음 이동 때 '저장하지 않은 입력' 경고가 헛되이 뜬다. 다시 그릴 때 `state.dirty = false` 로 돌리거나, 관리자 입력도 지켜 두는 방안을 검토한다.
  - `store.js` 의 엄격 모드에서 Redis CAS 가 경합으로 실패하면 "동시 변경" 409에 `currentVersion` 이 빠진다. 화면은 catchUp 으로 회복하므로 동작에는 문제가 없지만, 기준 4의 응답 모양과 맞춰 두면 좋다.
  - `concurrent-login.test.js` 1번 시험의 마지막 단언(`?? 1, 1`)은 값이 없어도 통과한다. 갑의 점수(최대점)가 그대로 남았는지도 함께 단언하면 '서로 덮이지 않음'을 더 분명히 증명할 수 있다.

### 2회차 감수 — PASS (2026-11-10, 감수 에이전트)
대상: `git diff` 의 `lib/recruitment/store.js`·`routes.js`·`public/recruitment/app.js`(A 부분)와 시험 2개. `style.css` 와 app.js 의 `cand-jump`·`jump`·`syncScoreTotals` 상태 표시(B 루프)는 판정에서 뺐고, A 코드와 겹치는 곳만 봤다(`jump` 는 `run()` 앞에서 따로 처리돼 mutate·catchUp 과 섞이지 않는다).
- 기준 1: 통과. `npm run test:recruitment` 111 통과·1 건너뜀·0 실패(112건), `node --test tests/hub.test.js` 9/9, `node --test tests/recruitment/concurrent-login.test.js` 18/18(domain.test 11건 포함, 새 시험 7건).
- 기준 2: 통과. 시험 12·13. 1번 시험이 이제 갑(최대점)과 을(1점)을 각각 단언한다(64·65줄). 별도 탐침(임시 폴더 서버)에서도 을이 v0으로 저장한 뒤 갑이 자기 base 로 저장하면 200이었다.
- 기준 3: 통과. 시험 14와 탐침. 재발급된 링크는 base 를 보내도 401, version 이 없으면 409, 제출 뒤 저장·확정 뒤 서명은 409.
- 기준 4: 통과. 탐침에서 낡은 버전 shortlist 가 409 `currentVersion:9`. 엄격 모드 CAS 경합도 이제 `work()` 에서 `currentVersion` 을 붙인다(store.js, 시험 18).
- 기준 5: 통과. `python tests/recruitment/concurrent_e2e.py` 4/4(`http://127.0.0.1:3199/recruitment`), 새 '같은 위원 두 기기' 화면 사례 포함. `e2e.py` 27/27, 종료 코드 1은 1회차와 같은 `/api/hub/migrated` 404 4건(시험 서버에 hub 라우트 없음, 이번 변경과 무관).
- 기준 6: 통과. 1회차 결함이 고쳐졌다. `reviewerMutate` 가 최신 저장본의 내 평가 `updatedAt` 과 화면의 `base` 를 비교해 다르면 409 `own_conflict` 를 내고, base 를 안 보내는 옛 화면은 rebase 없이 엄격 검사를 받는다. 탐침 결과:
  두 기기 모두 첫 저장(base null)이면 둘째가 409 `own_conflict`(currentVersion 포함), 같은 base 로 동시에 두 기기 저장하면 하나만 200이고 다른 하나는 409 `own_conflict`(조용한 덮어쓰기 없음), 낡은 base 로 제출하면 409 `own_conflict`, base 없는 낡은 제출은 409(엄격). 화면의 제출 단추(저장 뒤 제출)와 서명 단추(먼저 임시 저장)는 저장 응답으로 갱신된 base 를 쓰므로 정상 흐름이 막히지 않는다. 서명만 base 없이 rebase 하는 것은 서명이 점수를 바꾸지 않아 본질에 어긋나지 않는다. 관리자 경로·권한 모델·도메인 규칙은 바뀌지 않았고, 학교 공간·카피본은 같은 `createRouter` 를 쓰므로 같은 동작을 받는다.
- 결함: 없음.
- 권고:
  - `own_conflict` 를 받은 낡은 기기는 화면을 최신 내용으로 다시 그리므로 그 기기에서 입력 중이던 점수가 지워진다(의도된 설계, 조용한 덮어쓰기보다는 낫다). 안내 문구에 "이 기기에서 입력하던 내용은 반영되지 않았습니다"를 덧붙이면 위원이 덜 헷갈린다.
  - 관리자가 위원 저장 경로를 낡은 버전으로 부르면 403이 아니라 409가 먼저 난다(엄격 버전 검사가 fn 보다 앞섬). 동작상 문제는 없다.

### 3회차 감수 — PASS (2026-11-10, 감수 에이전트)
대상: `git diff` 의 `lib/recruitment/store.js`·`routes.js`·`public/recruitment/app.js`(A 부분)와 시험 2개, 3차 손질(안내 문구). 앞선 판정에 기대지 않고 처음부터 다시 봤다. `style.css` 와 app.js 의 `cand-jump`·`jumpTo`·`stickyTop`·`markCurrentJump`·스크롤 리스너(B 루프)는 판정에서 뺐고, A 동작과 겹치는지만 봤다(`jump` 는 `run()` 앞에서 따로 끝나고, 스크롤 리스너와 `--jump-top` 은 화면 표시만 바꿔 mutate·catchUp·state 를 건드리지 않는다).
- 기준 1: 통과. `npm run test:recruitment` 111 통과·1 건너뜀·0 실패(112건), `node --test tests/hub.test.js` 9/9, `node --test tests/recruitment/concurrent-login.test.js` 18/18.
- 기준 2: 통과. 실제 서빙 중인 시험 서버(`http://127.0.0.1:3199/api/recruitments`)에 직접 탐침했다. 갑과 을이 같은 낡은 버전으로 저장하면 200·200, 낡은 버전으로 서명 200·200, 제출 200·200. 최종 점수는 갑 재량 항목 6·26(최대점), 을 1·1로 서로 덮이지 않았다.
- 기준 3: 통과. 같은 탐침에서 재발급된 옛 링크의 서명·저장은 401, 제출 뒤 저장은 409("제출한 평가입니다"), version 없는 저장은 409. 확정 뒤 서명은 서류전형 채용을 끝까지 확정한 뒤 낡은 버전과 최신 버전 모두로 보내 봤고 둘 다 409("확정된 채용에는 서명할 수 없습니다")였다. 관리자가 위원 경로로 서명하면 403.
- 기준 4: 통과. 낡은 버전의 shortlist·reopen 이 모두 409 이고 응답에 `currentVersion:10` 이 있었다. 엄격 모드 CAS 경합에도 `currentVersion` 이 붙는다(store.js `work()`, 시험 18).
- 기준 5: 통과. `python tests/recruitment/concurrent_e2e.py` 4/4(`http://127.0.0.1:3199/recruitment`), `e2e.py` 27/27. e2e 의 브라우저 404 4건은 앞 회차와 같은 `/api/hub/migrated`(시험 서버에 hub 라우트 없음)로 이번 변경과 관계없다.
- 기준 6: 통과. 같은 위원의 낡은 기기가 낡은 base 로 저장하면 409 `code: own_conflict`, `currentVersion` 포함이고, 3차 손질 문구("이 기기에서 입력하던 내용은 반영되지 않았고, 먼저 저장된 내용을 불러왔습니다")가 실제 응답에 나온다. base 없는 옛 화면의 낡은 저장은 엄격 409. 관리자 경로는 `mutate`(rebase 없음) 그대로이고, 권한 모델은 `stillInvited` 로 오히려 강화됐다. 도메인 규칙(제출 잠금, 확정 불변, 서명 필수)은 `fn` 이 최신 저장본 위에서 돌아 그대로 지켜진다. 학교 공간과 카피본은 같은 `createRouter` 를 쓰고 `prefixedRedis` 가 `eval` 을 접두사와 함께 넘기므로 rebase·CAS 가 같은 방식으로 동작한다.
- 결함: 없음.
- 권고:
  - `concurrent-login.test.js` 81줄 시험 제목에 '확정 뒤 서명은 여전히 거절'이 있지만 본문에는 그 단언이 없다. 이번에는 탐침으로 확인했으니, 시험에도 확정 뒤 서명 409 단언을 넣으면 제목과 내용이 맞는다.
