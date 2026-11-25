# AUDIT_ASTRA_LOCKS 수정 보고 (AL01~AL05)

- 시작 2026-11-26. 대상: AUDIT_ASTRA_LOCKS.md 의 중요 AL01·AL02, 사소 AL03·AL04·AL05.
- 순서: 시험 먼저 작성 → 수정 전 실패 확인 → 수정 → 통과 확인.
- 건드리지 않은 것: public/zzoom/, 루트 firestore.rules 본문. 커밋·규칙 게시 없음.

## 진행 기록
1. 감사 보고서와 대상 코드(lib/storage-token.js, server.js rateLimit, public/lib/codocs.js, public/bap/index.html, 두 SPA deleteFromFirebase, spa-storage.test.js)를 읽었다.
2. 시험을 먼저 썼다.
   - 새 파일 `tests/zzoom/astra-locks.test.js`(AL01·AL02·AL03, 16건).
   - `tests/zzoom/spa-storage.test.js`: AL04 시험 2건(두 SPA) 추가, AL05 이수증 시험을 고침(storagePathFor 원문 주입, upload 호출 1회·경로 단언).
3. 수정 전 실행(고치기 전 실패 확인):
   - `node --test tests/zzoom/astra-locks.test.js` → 16건 중 **pass 1 / fail 15**(통과 1건은 '게시 후보에 제안 블록 포함' — 원래 맞는 성질의 보조 확인).
   - `node --test tests/zzoom/spa-storage.test.js` → 23건 **pass 21 / fail 2**(AL04 두 SPA). AL05 고친 시험은 제품 코드가 원래 맞아 통과(감사도 제품 결함 아님으로 판정). 시험이 실제로 upload 까지 가는지는 아래 변이 확인으로 따로 본다.
4. 수정(중간 저장):
   - AL01 `lib/storage-token.js`: `bapClaimsFor(sess, now, sessionLifeMs)` 가 `until = min(만든 시각+30일 또는 expiresAt, now+1h)` 을 넣는다. 세션이 이미 끝났으면 발급 안 함(401 bap-session-expired). ba/cp 는 기존 until 유지. `server.js` 는 `makeBapHandler({ sessionLifeMs: BAP_SESSION_TTL*1000 })`.
   - AL01 규칙: 제안·게시 후보 두 파일에 `fresh()`(until is number && request.time.toMillis() < until) 추가, `isBa()`·`bapOk()` 에 연결(`bapBoss` 는 bapOk 를 거쳐 함께 적용). 루트 firestore.rules 는 건드리지 않음.
   - AL01 `public/lib/codocs.js`: currentUser 만으로 통과하지 않고 until 을 안다(토큰 claim 해석). until 1분 전 재로그인 예약(같은 uid 라 구독 유지), 일시 실패는 until 전까지 30초 간격 재시도, 401 이면 signOut 뒤 로그인 안내. 탭을 다시 열 때도 기한 확인.
   - AL02 `public/bap/index.html`: `makeBapAuth` 로 출입증 관리 분리 — 토큰 바뀜·로그아웃 시 signOut, 세대 번호로 늦은 응답 무효, 같은 토큰끼리만 합류, 로그인·로그아웃 직렬화, until 1분 전 재발급. `waitForBap` 은 실패 시 예외로 보호 작업 중단, 공개 식단 읽기(`fsGet/fsQuery` 의 식단 컬렉션, mgrLoadMenu·loadMenuList·muList)는 `waitForBapPublic`. `clearBapToken` 이 Firebase 인증도 버린다.
   - AL03 `server.js`: `rateLimit(limiterId, max, windowMs, idFn)` — 키는 `limiterId|ip(또는 세션)`. 호출 6곳 모두 고정 ID(auth-login, firebase-token:ip, firebase-token:session, bap-firebase-token:ip, bap-firebase-token:session, mail-login). 한도 숫자는 그대로.
   - AL04 두 SPA `deleteFromFirebase`: object-not-found 만 조용히(true), 인증 외 오류는 안내 1회(silent 면 생략)·`state.failed` 에 경로 기록·false 반환, 일괄 삭제의 다음 파일은 계속 지움. 두 파일 함수 원문 diff 없음.
   - AL05: 위 2 의 시험 수정. 변이 확인 — 시험에서 storagePathFor 주입만 빼면 두 SPA 이수증 시험 2건이 실패(pass21/fail2)해, 이제 실제 upload 호출까지 가는지 검사한다.
5. Rules 시험 API(게시 아님, `firestore.publish+lock.rules` 전체, 22건): **22/22 통과**. until 지난·없는·문자열·=지금 출입증 거절(codocs 읽기·쓰기·presence 삭제·members, bap 일지 읽기·제출·삭제, 식단 쓰기·지우기), 유효 출입증 허용, 식단 비로그인 읽기 공개 유지, 다른 학교·cp 거절.
   대조: 같은 시험을 `&& fresh()` 만 뺀 규칙에 돌리면 10/22(만료 관련 12건 FAIL) — 시험이 until 검사를 실제로 가른다.
   방법: node 의 fetch 는 이 PC 에서 ECONNRESET 이라 node 로 요청 본문을 만들고 PowerShell Invoke-RestMethod 로 POST(CLAUDE.md 의 우회 방식). 접근 토큰은 쓰고 바로 지웠다.
6. publish/README.md 에 「3-1) until 검사 — 정상 탭이 끊기지 않는 순서」 추가(코드 배포 → until 확인 → 옛 탭 새로고침 공지 → 잠금본 게시, 실수로 먼저 게시했을 때 대응).
7. 수정 뒤 시험(최종 숫자):
   - `npm.cmd test`: unit **313/313** + contracts **11/11** = **324/324**, fail·cancelled·skipped 0, 종료 0.
   - `node --test tests/zzoom/spa-storage.test.js`: **23/23**(기존 21 + AL04 2).
   - `node --test tests/zzoom/astra-locks.test.js`: **16/16**(수정 전 1/16). package.json `test:zzoom` 에 이 파일을 더했다.
   - `npm.cmd run test:zzoom`: **129/129**, fail·cancelled 0.
   - 회귀 참고: `node --test tests/hub.test.js tests/login-guard.test.js tests/zzoom/redteam.test.js` 32건 pass25·fail0·skipped2·todo5(원래 건너뛰는 시험).
   - 문법: codocs.js(.mjs 복사본 `node --check`), bap 페이지 두 script, 두 SPA deleteFromFirebase 모두 이상 없음. CLAUDE.md 의 `_check/codocs-test.mjs` 는 저장소에 없어 실행하지 못했다.
8. 서빙 페이지 확인: Redis·Firebase 키를 비운 로컬 서버 `http://127.0.0.1:3197`(시험 뒤 종료).
   - `/bap/`·`/lib/codocs.js`·`/` 가 고친 코드(makeBapAuth·waitForBapPublic, scheduleCodocsRefresh, failNoticed)를 서빙.
   - `/api/firebase-token` 같은 IP 120회(401) 뒤 121번째부터 `/api/firebase-token/`·`/API/firebase-token`·`/api/FIREBASE-token`·`/api/firebase-TOKEN` 모두 **429**(수정 전 감사 재현은 200).
   - 실제 Firebase 로그인·Firestore 쓰기는 하지 않았다(키 없음·실데이터 금지). bap·codocs 인증 흐름은 VM 시험으로만 확인.
9. 남은 것(범위 밖·사소): 로그아웃해도 다른 탭·기기에 이미 받은 출입증은 until(최대 1시간)까지 유효(즉시 회수 아님). copy·실서비스 IP 통 공유(F-F2)와 rateLimits 만료 키 정리(F-F5)는 그대로. 루트 firestore.rules 는 바꾸지 않았으므로 게시 전 README 3-1 순서를 따라야 한다.
- 커밋·푸시·규칙 게시 없음. public/zzoom, firestore.rules 변경 없음(이번 작업 기준).

## 결론
AL01·AL02(중요), AL03·AL04·AL05(사소) 모두 시험을 먼저 써서 수정 전 실패를 확인한 뒤 고쳤고, 고친 뒤 위 시험과 Rules 시험 API 22/22 로 확인했다. 독립 재감사가 필요하다.
