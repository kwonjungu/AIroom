**판정: PASS** (치명 0·중요 0. R2 의 F1 해결, 회귀 없음. 사소 F2~F5 와 N3·N4 는 그대로 남음. 급식일지 가입 구멍은 사용자 수용)

# 감사 라운드 3: 영역 ④ Firestore 잠금(codocs_*, bap_*)

수정 보고를 믿지 않고 `git diff server.js` 와 실측으로만 판단했습니다. 코드는 고치지 않았고 커밋, 게시, 실제 Firestore 쓰기도 하지 않았습니다.

R2 뒤 바뀐 곳은 `server.js:1609` 한 줄입니다.
```
rateLimit(10, 60 * 1000, req => isCopyNs() ? 'cip:' + (req.ip || '') : 's:' + req.headers['x-auth-token'])
```
`firestore_lock_proposal.rules` 는 R2 보고서보다 앞선 시각(06:50)에 마지막으로 바뀌어 R2 에서 시험한 판과 같고, `firestore.rules` 는 그대로입니다(`git diff --stat` 비어 있음).

## 미들웨어 순서 (isCopyNs() 판정 시점)
- `server.js:219-225`: `/api/copy/*` 를 `/api/*` 로 재작성하고 `req.isCopy = true`.
- `:229`: JSON 파서(jsonExceptZzoom).
- `:231`: `req.isCopy ? nsStore.run('copy', next) : next()`. 이 뒤에 오는 미들웨어와 라우트는 모두 copy 공간 안에서 돕니다.
- `:1608-1610`: 라우트 등록(`app.get`). `:231` 보다 뒤에 등록되므로 세션 한도의 idFn 이 불릴 때 `isCopyNs()` 가 맞게 판정됩니다. 실측 C1~C3 에서도 확인했습니다.
- 버킷 키는 `req.path + '|' + id`(`:125`)입니다. 카피본은 `/api/firebase-token|cip:<IP>`, IP 한도는 `/api/firebase-token|<IP>`, 실서비스는 `/api/firebase-token|s:<토큰>` 이라 접두사가 달라 서로 섞이지 않습니다. 실서비스에서 `X-Auth-Token` 을 `cip:...` 로 보내도 키가 `s:cip:...` 가 되어 겹치지 않습니다.
- `req.ip` 가 비어도 `'cip:'` 은 참 값이라 IP 로 돌아가지 않고 `cip:` 한 통에 모입니다. 다만 `trust proxy` 가 켜져 있어(`:10`) 실제로 `req.ip` 가 비는 일은 없습니다.

## 표 1: R2 지적 재검증

| 번호 | 판정 | 근거 |
|---|---|---|
| F1 카피본 세션 통 하나 | **해결** | `server.js:1609`. 실측 C1: 카피본 `copy-demo` 로 서로 다른 IP 5곳에서 4회씩 합쳐 20회 보냄 → **모두 200**. C4: 토큰 없이 IP 3곳에서 4회씩 → 모두 200. C2: 같은 IP 에서 12회 → 200×10, **11번째부터 429** |
| F2 카피본과 실서비스가 IP 120 통을 함께 씀 | 그대로(사소) | `:125` 키에 카피본 표시가 없음. 이번 수정의 대상이 아님. 세션 한도 통은 분리됨(C5: 카피본 세션 한도에 걸린 IP 에서 실서비스 출입증 200) |
| F3 한도 시험 없음 | **미반영**(사소) | `tests/` 에서 `firebase-token` 은 `tests/zzoom/redteam.test.js` 에만 있고, 429 를 확인하는 시험이 없음. F1 수정도 시험으로 묶이지 않음 |
| F4 FIX 보고 숫자 | 해당 없음 | 이번 라운드에는 새 FIX 보고가 없음(`FIX_FIRESTORE_R1.md` 뿐) |
| F5 rateLimits Map 정리 없음 | 그대로(사소) | `:119-131`. 카피본도 이제 IP 마다 칸이 하나 더 생김 |
| N2 ba 의 until 미확인 | 그대로(사소, 수용) | 제안 규칙 바뀌지 않음 |
| N3 확인을 Preview 에서만 | **미반영**(사소) | `reports/FIRESTORE_LOCK.md:83` 「확인(Preview)」 그대로 |
| N4 열어 둔 옛 탭 | **미반영**(사소) | 문구 추가 없음 |
| N5 미러 API 키 리퍼러 | 확인 필요, 그대로 | 콘솔을 볼 수 없음 |

## 제안 규칙 표 재확인
R2 이후 `firestore_lock_proposal.rules` 와 `firestore.rules` 가 바뀌지 않았습니다. R2 의 합본(`fsaudit2/merged_r2.rules`)에 R2 시험 310건을 Rules 시험 API 로 다시 돌려 **310/310** 이 나왔습니다. R2 의 presence 표와 R1 전체 표는 그대로 유효합니다.

## 표 2: 새 지적

| 번호 | 심각도 | 파일:줄 | 문제 | 실패 시나리오 | 고칠 방향 |
|---|---|---|---|---|---|
| G1 | 사소 | `server.js:1609` | 카피본 세션 한도가 IP 분당 10이 되어, 학교 하나(공인 IP 하나)에서 연수생 여럿이 /copy 로 처음 출입증을 받으면 10명 넘는 사람은 1분 동안 429. 실서비스는 같은 상황에서 세션별이라 막히지 않음 | 한 학교 연수실 15명이 같은 분에 /copy 에서 사진 업로드 → 11번째부터 「창고 출입증을 받지 못했습니다(429)」. 1분 뒤 다시 하면 됨. 수정 전(R1, IP 30)보다 좁아졌지만 R2 의 「전체 10」보다는 훨씬 나음 | 카피본은 세션 한도를 건너뛰고 IP 120 만 두거나(idFn 이 `null` 을 돌려주면 IP 로 돌아가 IP 120 통과 겹치므로, 별도로 `next()` 로 넘기는 분기), 카피본 IP 한도를 30 정도로 둠 |

참고(지적 아님): 카피본 출입증은 cp claim 이라 공개 식단 읽기 말고는 할 수 있는 게 없습니다(R1 표). 그래서 카피본 한도는 남용 방지일 뿐 보안 경계가 아닙니다.

## 실행한 명령과 결과

저장소 `server.js`(cmp 로 같음 확인)와 `lib/zzoom/routes.js` 를 scratchpad `fsaudit2/srv` 사본에 복사해 `node server.js`(PORT 3917, Redis 환경변수 없음, 가짜 서비스 계정)를 90초 timeout 으로 띄우고 `node fsaudit2/probe3.js` 를 돌렸습니다. 시험 뒤 서버를 끝냈습니다.

| 시험 | 결과 |
|---|---|
| C1 카피본 `copy-demo`, 다른 IP 5곳 × 4회(합 20) | 모두 200 |
| C2 카피본 같은 IP 12회 | 200×10, 429×2(11~12번째) |
| C3 카피본 같은 IP, 토큰 12종 | 200×10, 429×2(IP 기준으로 셈) |
| C4 카피본 토큰 없음, IP 3곳 × 4회 | 모두 200 |
| C5 C2 로 막힌 IP 에서 실서비스 출입증 | 200 |
| R1 실서비스 세션 A 12회 / 같은 IP 세션 B / 세션 A 다른 IP | 200×10 그리고 429×2 / 200 / 429(세션 한도 회귀 없음) |
| R2 한 IP 에서 세션 12개 × 10회 → 121번째 | 200×120 → 429(IP 120 회귀 없음) |
| R3 비로그인 한 IP 125회 | 401×120, 429×5 |
| B `/api/bap/firebase-token` 한 IP 122회 | 401×120, 429×2 |
| `node fsaudit2/bap-limit.js <repo>`(가짜 Redis) | bap 세션 A 12회: 200×10, 429×2. 세션 B 200. 비로그인 401 |
| L1 `/api/auth/login` 맞는 코드 12회 | 200×10, 429×2 |
| L2 `/api/mail/login` 맞는 비밀번호 62회 | 200×60, 429×2 |
| L3 로그인 막힌 IP 에서 출입증 | 200(경로별 통 분리 유지) |
| `node fsaudit2/rt2.js <firebase-tools> fsaudit2/merged_r2.rules`(Rules 시험 API, 게시 아님) | **310/310** |
| `npm test` | test:vibe:unit **tests 313, pass 313, fail 0**. test:vibe:contracts **tests 11, pass 11, fail 0** |

저장소에 새로 생기거나 바뀐 파일은 이 보고서 하나뿐입니다. 임시 파일은 모두 scratchpad `fsaudit2/` 에 있습니다.
