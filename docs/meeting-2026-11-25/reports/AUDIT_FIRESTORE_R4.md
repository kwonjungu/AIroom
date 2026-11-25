**판정: PASS** (치명 0·중요 0. R3 의 G1 해결, 회귀 없음. 사소 F2·F3·F5 와 N3·N4 는 그대로. 급식일지 가입 구멍은 사용자 수용)

# 감사 라운드 4: 영역 ④ Firestore 잠금(codocs_*, bap_*)

수정 설명을 믿지 않고 `git diff server.js` 와 로컬 실측으로 판단했습니다. 코드는 고치지 않았고 커밋, 규칙 게시, 실제 Firestore 쓰기도 하지 않았습니다.

## 바뀐 곳 (server.js:1607-1612)
```
app.get('/api/firebase-token', rateLimit(120, 60 * 1000), requireAuth,
    (() => { const perSession = rateLimit(10, 60 * 1000, req => 's:' + req.headers['x-auth-token']);
        return (req, res, next) => isCopyNs() ? next() : perSession(req, res, next); })(),
    require('./lib/storage-token').makeHandler({ isCopy: () => isCopyNs() }));
```
`firestore_lock_proposal.rules`(06:50)와 `firestore.rules`(11-25 20:47)는 R3 때와 같은 시각이고 `git diff --stat firestore.rules` 는 비어 있습니다.

## 미들웨어 순서와 클로저
- `server.js:219-225` 에서 `/api/copy/*` 를 `/api/*` 로 바꾸고 `req.isCopy = true`, `:229` JSON 파서, `:231` 에서 `nsStore.run('copy', next)`. 라우트(`:1608`)는 그 뒤에 등록되므로 감싼 함수 안의 `isCopyNs()`(`:459`)는 요청마다 맞게 판정됩니다. 판정은 요청 처리 중 동기로 불려 AsyncLocalStorage 문맥이 끊기지 않습니다.
- 즉시 실행 함수는 등록할 때 한 번만 돌아 `perSession` 통(`rateLimits` Map 의 `/api/firebase-token|s:<토큰>`)을 하나 만들고, 반환한 함수가 요청마다 카피본이면 `next()`, 아니면 `perSession`. 요청마다 새 rateLimit 을 만들지 않으므로 세션 한도가 초기화되는 일이 없습니다(실측 R1 에서 11번째 429).
- 순서는 IP 120(`rateLimit` 기본 키 `경로|IP`, `:120-137`) → `requireAuth` → 세션 10(실서비스만) → 출입증 발급. 실서비스에서 `X-Auth-Token: copy-demo` 를 보내도 `requireAuth` 가 먼저 401 을 돌려주고(K6), 카피본 분기는 `isCopyNs()` 로만 정해지므로 헤더로 세션 한도를 건너뛸 수 없습니다.
- 카피본 출입증은 여전히 `cp:1`(K1), 실서비스는 `ba:1`(K7). `makeHandler`(`lib/storage-token.js:70-80`) 는 바뀌지 않았습니다.
- 급식일지 `/api/bap/firebase-token`(`:1814-1816`)은 이번 수정에 닿지 않았고 IP 120 → bapAuth → 세션 10 그대로.

## 표 1: R3 지적 재검증

| 번호 | 판정 | 근거 |
|---|---|---|
| G1 한 학교 IP 에서 /copy 10명 넘으면 429 | **해결** | `server.js:1611`. K1 카피본 같은 IP 25회 → 200x25. K2 같은 IP 125회 → 200x120, **121번째부터 429**. K3 토큰 없이 25회, K4 토큰 25종 → 모두 200 |
| F2 카피본과 실서비스가 IP 120 통을 함께 씀 | 그대로(사소) | `:125` 키에 카피본 표시 없음. K5: 카피본으로 IP 120 을 다 쓴 IP 에서 실서비스 출입증 → 429. 이제 카피본이 세션 10 없이 IP 120 만 쓰므로 한 학교에서 /copy 연수 중 같은 분에 실서비스 사용자가 120 을 나눠 씀. 1분 창이고 출입증은 1시간짜리라 실제로 120 에 닿기는 어려움 |
| F3 한도 시험 없음 | **미반영**(사소) | `tests/` 에 `/api/firebase-token` 429 시험 없음(`tests/zzoom/redteam.test.js:494-528` 는 401·claim 만) |
| F5 rateLimits Map 정리 없음 | 그대로(사소) | `:119-137`. 카피본은 이제 세션 칸이 안 생겨 오히려 줄어듦 |
| N2 ba 의 until 미확인 | 그대로(사소, 수용) | 제안 규칙 바뀌지 않음 |
| N3 확인을 Preview 에서만 | 미반영(사소) | `reports/FIRESTORE_LOCK.md:83` |
| N4 열어 둔 옛 탭 | 미반영(사소) | 문구 추가 없음 |
| N5 미러 API 키 리퍼러 | 확인 필요, 그대로 | 콘솔을 볼 수 없음 |

## 제안 규칙 표 재확인
규칙 파일이 R3 이후 바뀌지 않아 R2 합본(`fsaudit2/merged_r2.rules`)에 R2 시험 310건을 Rules 시험 API 로 다시 돌렸습니다: **310/310**. R1·R2 표는 그대로 유효합니다.

## 표 2: 새 지적
없음. (참고: 카피본 출입증은 cp claim 이라 공개 식단 읽기 말고는 할 수 있는 게 없어, 카피본 한도는 남용 방지일 뿐 보안 경계가 아닙니다.)

## 실행한 명령과 결과
저장소 `server.js`(cmp 로 같음 확인)와 `lib/` 를 scratchpad `fsaudit2/srv` 에 복사해 `node server.js`(PORT 3917, Redis 환경변수 없음, 가짜 서비스 계정)를 띄우고 `node fsaudit2/probe4.js` 를 돌렸습니다. 끝난 뒤 서버(node, PID 37540)를 직접 종료했고 3917 포트가 닫힌 것을 확인했습니다.

| 시험 | 결과 |
|---|---|
| K1 카피본 같은 IP 25회(copy-demo) | 200x25, claim `{cp:1,until}` |
| K2 카피본 같은 IP 125회 | 200x120, 429x5(121~125) |
| K3 카피본 토큰 없음 같은 IP 25회 | 200x25 |
| K4 카피본 토큰 25종 같은 IP | 200x25 |
| K5 K2 로 막힌 IP 에서 실서비스 출입증 | 429(F2, 같은 IP 통) |
| K6 실서비스에 `X-Auth-Token: copy-demo` 12회 | 401x12 |
| K7 실서비스 출입증 claim | 200, `{ba:1,until}` |
| R1 실서비스 세션 A 12회 / 같은 IP 세션 B / 세션 A 다른 IP | 200x10, 429x2 / 200 / 429 |
| R2 한 IP 세션 12개 x10 → 121번째 | 200x120 → 429 |
| R3 비로그인 한 IP 125회 | 401x120, 429x5 |
| B `/api/bap/firebase-token` 한 IP 122회 | 401x120, 429x2 |
| `node fsaudit2/bap-limit.js <repo>`(가짜 Redis) | bap 세션 A 12회 200x10·429x2, 세션 B 200, 비로그인 401 |
| L1 `/api/auth/login` 12회 | 200x10, 429x2 |
| L2 `/api/mail/login` 62회 | 200x60, 429x2 |
| L3 로그인 막힌 IP 에서 출입증 | 200 |
| `node fsaudit2/rt2.js <firebase-tools> fsaudit2/merged_r2.rules`(Rules 시험 API, 게시 아님) | **310/310**(첫 시도는 `fetch failed`, 다시 돌려 통과) |
| `npm test` | test:vibe:unit **tests 313, pass 313, fail 0**. test:vibe:contracts **tests 11, pass 11, fail 0** |
| `npm run test:zzoom` | **tests 100, pass 100, fail 0** |

저장소에서 새로 생기거나 바뀐 파일은 이 보고서 하나뿐입니다. 임시 파일은 scratchpad `fsaudit2/`(probe4.js, srv4.log, npmtest4.txt, zzoom4.txt)에 있습니다.
