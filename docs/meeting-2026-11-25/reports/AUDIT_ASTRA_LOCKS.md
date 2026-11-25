FAIL

# 영역 ③·④ 독립 감사 — 최종 판정

- 최종 판정: **FAIL — 치명 0, 중요 2건(AL01·AL02)**. Storage 주요 수정은 확인했지만 Firestore 만료·인증 전환 문제가 남았다.
- 대상: Storage 기존 앱 잠금, codocs_* / bap_* Firestore 잠금 및 게시 후보 규칙.
- 코드·로컬 시험을 근거로 판정한다. 앞선 감사·수정 보고는 재검증 목록으로만 사용한다.
- 급식일지 가입 시 담당자·결재자 자유 선택은 사용자 수용 사항이며 지적하지 않는다.
- 변경 허용 파일은 이 보고서 하나다. 코드 수정·커밋·배포·규칙 게시·실제 Firebase 쓰기는 하지 않는다.
- 시작: 2026-11-26. 검토·시험 결과를 순차 저장한다.

## 표 1 — 기존 지적 재검증

번호는 Storage(S)·Firestore(F) 보고서의 번호다. 원감사 01~15 중 이번 범위에 직접 해당하는 12·13을 재검증했다. 01~11·14·15의 쭘 서버·변환기 문제는 이번 범위 밖이며 해결로 판정하지 않는다.

| 이전 번호 | 판정 | 코드·시험 근거 |
|---|---|---|
| 원12 / S-S1: 창고 권한 만료 | 해결(Storage 한정) | `lib/storage-token.js:34` until=min(세션 만료,now+1h), `storage.rules:17` 시간 검사, `index.html:2276` / `public/index.html:2402` 재발급. units 지적12·SPA 지적12 시험 통과. Firestore는 AL01 |
| 원13 / S-S2: 업로드 실패 뒤 기록 확정 | 해결 | `index.html:2318,5855` / public `:2444,5764` 토큰 오류 전파·파일 실패 시 return. 독립 재현: 실제 upload1/ttPatch0/오류 안내1(두 SPA). 기존 시험 결함은 AL05 |
| S-S3: copy 실제 경로 저장 | 해결 | `index.html:2312,2400,3155,3231,5143,5852,6265,7880` 및 public 대응 호출자가 storagePathFor 사용. 지적16 시험 통과. 옛 접두사 없는 기록은 소급 정리하지 않음 |
| S-S4: 최상위 객체 copy | 미해결·사소 | `storage.rules:32` v2 재귀 와일드카드가 0개 경로도 매칭하여 cp가 이름이 정확히 copy인 객체에도 접근 가능. 실서비스 하위 경로 누출은 아님. 이번 엔진 시험 없음 |
| S-S5: persistence 전 Storage 공개 | 확인 필요·사소 | `index.html:2264,2266` / public `:2390,2392` 순서는 그대로. SDK 내부 직렬화를 검증하지 않아 LOCAL 저장이 실제 발생한다고 단정하지 않음 |
| S-S6: 공개 copy 출입증 | 설계상 유지 | `server.js:70,1608`, `storage-token.js:38`. cp는 공개 발급, copy 경로·개별 10MiB 미만 제한. 총량·정리는 별도 문제 |
| S-S7: 로그아웃 signOut 없음 | 잔존·사소 | `index.html:2587` / public `:2687`는 reload. 탭 메모리는 지우지만 발급된 Storage 권한은 until까지, 최대 1시간 잔존. 즉시 회수는 아님 |
| S-R2 N1 / R3 N1: 토큰 실패가 삭제 UI 중단 | 해결 | `index.html:2341` / public `:2467` try/catch. N1 시험: 삭제0/안내1/예외 없이 반환 |
| S-R2 N2 / R3 N2: 시계 오차·업로드 재시도 | 해결 | `index.html:2320` / public `:2446` 인증 오류만 강제 재발급·1회 재시도. N2 시험: 계속 거절도 put2, quota는 put1 |
| S-R2·R3 N3: 문서 | 해결(대상 문구) | `STORAGE_LOCK.md:13,20,21`에 until·업로드/삭제 재시도·강제 요청 반영. 과거 Rules 통과 숫자는 이번 실측이 아님 |
| S-R3 N4: force 합류 | 해결 | `index.html:2287` / public `:2413` 비강제 완료 뒤 강제 발급. N4 시험: 비강제+강제 요청1, 강제끼리 요청1 |
| S-R3 N5: 삭제 인증 오류 삼킴 | 해결(인증 오류 한정) | `index.html:2353` / public `:2479` 인증 오류 재발급·1회 재시도·재실패 안내. N5 시험 통과. 다른 오류는 AL04 |
| S-R3 N6: 교체·일괄 안내 | 해결 | `index.html:2403,3230` silent, `:8012` 공유 state(public `:2528,3440,7831`). N6 시험: 3건 삭제 토큰 실패 시 요청·안내 각각1 |
| S-R3 N7: 회귀 시험 없음 | 해결, 별도 결함 있음 | `tests/zzoom/spa-storage.test.js:123` 이후 실제 .code를 넣은 재시도·force·삭제 시험 추가. 관련30/30 통과. AL05 |
| F-N1: presence 삭제 | 해결(코드) | 제안 `:119,121,122` read/delete/create·update 분리. 삭제에서 request.resource를 참조하지 않으며 ba 외 claim을 허용하는 겹치는 블록 없음 |
| F-N2: ba until 미확인 | **미해결·중요로 재판정** | 제안 `:13`, 게시/firestore.publish+lock.rules `:28`, codocs `:201`. 이전 보고서의 ‘사소·수용’은 이번 사용자의 수용 지시가 아님. AL01 |
| F-N3: Preview만 사전 확인 | 부분·사소 | `reports/FIRESTORE_LOCK.md:83`는 여전히 Preview. 게시/README `:47`의 게시 후 확인은 운영·미러의 게시 전 토큰 교환 확인을 대체하지 못함 |
| F-N4: 열어 둔 옛 탭 | 미해결·사소 | 게시/README `:32` 이후에 옛 탭 새로고침·전환 공지 없음. 인증 코드 없는 탭은 잠금 직후 거절될 수 있음 |
| F-N5: 미러 API 키 제한 | 확인 필요 | `server.js:202`의 X-Auth-Token CORS와 미러 fetch 경로는 코드상 연결. 실제 API 키 리퍼러 제한·Firebase 로그인은 확인하지 않음 |
| F-N6→F1→G1: NAT·copy 세션 한도 | 해결(정규 경로) | `server.js:1608` IP120→requireAuth→실서비스 세션10, copy는 `:1611` 생략. 로컬에서 copy120회200/121번째429, 실서비스 세션11번째429. 경로 변형은 AL03 |
| F-F2: copy·실서비스 IP 통 공유 | 미해결·사소 | `server.js:125,221` rewrite 뒤 같은 path/IP. copy120회 뒤 같은 IP 실서비스429 재현 |
| F-F3: 한도 회귀 시험 없음 | 미해결·사소 | 기존 `redteam.test.js:496`은 인증·claim 위주. npm test·test:zzoom에는 두 토큰 라우트 한도/경로 변형 시험 없음. 이번 별도 재현으로 확인 |
| F-F4: npm test 11건 표기 | 보고 숫자 오류 유지 | FIX_FIRESTORE_R1의 숫자와 달리 이번 실제 결과 unit313+contracts11=324 |
| F-F5: rateLimits 정리 없음 | 미해결·사소 | `server.js:119,127`에서 사용하지 않는 만료 키 삭제 없음. 세션·IP·경로 변형마다 항목 증가. 서버 인스턴스 간 공유 한도도 아님 |

## 표 2 — 새 지적 및 심각도 재판정

| 번호 | 심각도 | 파일:줄 | 문제·실패 시나리오 | 고칠 방향 |
|---|---|---|---|---|
| AL01 | **중요** | 제안 `:13,16`; 게시/firestore.publish+lock.rules `:28,31`; `lib/storage-token.js:45,50`; `public/lib/codocs.js:175,201`; `server.js:1696,1845` | **Firestore 권한에 서버 세션 만료 상한이 없다.** ba.until은 규칙이 무시하고 bap는 bp/br만 발급한다. 서버 세션 만료 직전 Firebase 인증 취득→세션/until 경과→여전히 유효한 Firebase 인증의 ba 또는 bp/br로 문서 읽기·쓰기·삭제 조건이 참이다. codocs는 currentUser만 있으면 재검증도 안 한다. VM: until=1 사용자→토큰 요청0/authState=ok. bap 로그아웃도 Redis 세션만 삭제. **만료 JWT 자체가 통과한다는 주장이 아니라 서버 세션 수명과 Firebase 권한 수명이 연결되지 않는다는 지적** | ba·bap 모두 검증된 세션 만료/짧은 until 발급·규칙 검사. codocs 구독·bap 작업의 만료 전 갱신을 함께 구현. 즉시 회수가 필요하면 사용자/세션별 권한 버전 또는 서버 경로 사용. 규칙만 먼저 바꿔 정상 탭을 끊지 말 것 |
| AL02 | **중요** | `public/bap/index.html:755,760,764,767,1356,1751,2634,1059` | **인증 전환 실패 뒤 이전 권한으로 작업한다.** 결재자 로그인→로그아웃(Firebase signOut 없음)→담당자 로그인→출입증 API500/401/429→ensureAuth=false를 waitForBap이 무시→이전 결재자 Firebase 사용자로 update 수행. 원문+가짜 SDK: `newToken=manager-session,http=500,writeIdentity=[boss]`. 진행 중 발급 사이 ensureAuth('') 호출 후 늦은 응답이 boss 인증을 되살리는 경합도 재현. 자유 가입과 별개인 현재 세션·실행 권한 불일치 | 토큰 변경·로그아웃에서 이전 인증 폐기, 요청 세대 번호로 늦은 응답 무효화. 다른 token은 같은 promise에 합류시키지 말 것. 보호된 작업은 인증 실패 시 중단하고 공개 식단 읽기만 분리 |
| AL03 | 사소 | `server.js:125,1608,1814` | **경로 표기로 한도 우회.** Express는 대소문자·끝 슬래시를 허용하지만 키는 원래 req.path. 동일 세션/IP 정규 경로11번째429 뒤 `/api/firebase-token/`, `/API/firebase-token`, `/api/FIREBASE-token`, `/api/firebase-TOKEN`은 모두200. 인증 우회는 아니나 서명 발급 남용 방지 수치가 실제 상한이 아님. 같은 rateLimit의 bap에도 적용 | 라우트별 고정 limiter ID·namespace 사용, IP/세션 키 분리, 경로 변형 회귀 시험. 전역 상한이 필요하면 공유 저장소 |
| AL04 | 사소 | `index.html:2354` / `public/index.html:2480` | **삭제의 비인증 오류를 모두 조용히 삼킨다.** 최초 delete에 storage/retry-limit-exceeded 주입→시도1/안내0/정상 반환(두 SPA). 호출자는 기록을 지워 파일만 남길 수 있음. object-not-found와 네트워크 실패가 같은 처리 | object-not-found만 조용히 종료. 나머지는 state/silent 정책에 맞게 안내·실패 상태 기록 |
| AL05 | 사소 | `tests/zzoom/spa-storage.test.js:109,112,118` | **이수증 실패 시험이 가짜 upload에 도달하지 않는다.** VM에 storagePathFor가 없어 먼저 ReferenceError가 나도 통과(실행 로그). 독립 보완 재현에서 helper를 제공하면 실제 upload1/ttPatch0/안내1이라 현재 제품 코드의 실패는 아님 | helper 주입 및 upload 호출 횟수 assert. bap 인증 전환·취소/Firestore 만료/토큰 한도도 별도 시험 유지 |

## 규칙·게시 후보 대조 — 엔진 실측 아님

| 대상 | 코드 판정 |
|---|---|
| Storage 기존 7폴더: banner·schedules·sections·training-tracker·certs·news·collections | `storage.rules:17,32`: 살아 있는 ba는 읽기·목록·삭제, create/update는 10MiB **미만**. 비로그인·cp(실서비스)·bp·zz 거절. until 없음/문자열/=now 거절 |
| copy·쭘 분리 | cp는 copy 아래(S4 예외), ba는 copy도 허용. `:25`에서 zzoom·zzoom-vendor 제외. `:28` 루트 파일 규칙은 이름이 zzoom인 객체를 허용하나 zzoom/ 하위 파일을 열지 않음 |
| codocs_members·sheets·rows·presence | 제안 `:84,97,109,118`: ba만. cp·bp·zz·비로그인 거절. title/name/scope/columns/cells 형식·상한 유지, presence 삭제에 request.resource 불필요. until은 무시(AL01). 사람별 editPolicy는 UI 정책 |
| bap_users·bap_config | 제안 `:30,33` 모두 차단. bap2/3 별도 옛 계정 경로도 허용 match 없음 |
| bap*_menus | 제안 `:40`: 읽기·목록 공개. 쓰기는 동일 학교 bp+br=m/b, 날짜 형식·lunch 문자열2000자 미만. delete도 인증·날짜 필요. uploadedBy도 공개 읽기에 남음 |
| bap*_journals | 제안 `:54`: 같은 학교 bp/br만 읽기. create는 submitted+비어 있지 않은 managerName, 재제출은 managerName 유지. submitted→approved는 boss만, approved update는 거절. **boss의 approved 삭제는 허용**(`:79`, UI `bap/index.html:574`와 일치). 가입 자유 선택은 지적 제외 |
| 게시/firestore.publish+lock.rules | 제안 전체 포함 문자열 비교 통과, 공개 catch-all 없음. kwon 설정은 firebase.publish-lock.json:2, codocs:187·bap:749와 일치. AL01도 그대로 포함 |
| 게시/storage.publish+lock.rules | 현재 storage.rules와 **실행 코드 동일**(주석·공백 제외 비교). 바이트 동일은 아님: `:49`의 쭘 설명 한 줄 차이. 기존 앱 블록 동일 |
| 게시/firestore.publish.rules / storage.publish.rules | 전자는 루트 firestore.rules와 diff 없음, 기존 앱 잠금 미적용. 후자 `:4` 공개 catch-all이 기존·쭘 파일 익명 읽기와 10MiB 미만 쓰기를 허용. **둘은 잠금 결과물이 아님.** README `:16,32,45`에 경고·별도 잠금 설정 안내가 있어 숨은 새 결함으로 중복 계산하지 않음 |
| 게시 설정·rollback | firebase.publish.json은 비잠금, firebase.publish-lock.json은 두 +lock 파일, firebase.rollback.json은11-26백업 참조. 파일 존재 확인. rollback은 공개 규칙도 복원하므로 잠금 유지가 아님. 명령 미실행 |

Storage의 기존 다운로드 URL(?token=)을 폐기하는 변경은 아니다. 링크를 가진 사람의 접근까지 이번 규칙 잠금으로 차단했다고 해석하면 안 된다(`storage.rules:14`, `STORAGE_LOCK.md:10`).

## 실행한 명령·숫자·재현 출력

| 명령/방법 | 이번 결과 |
|---|---|
| `npm test` 최초 시도 | PowerShell npm.ps1 실행 정책으로 미실행. 정책 변경 없이 npm.cmd 사용 |
| `npm.cmd test` | **unit313/313 + contracts11/11 = 324/324**, fail/cancelled/skipped0, 종료0 |
| `npm.cmd run test:zzoom` 1차 | **100건 pass99 fail1**, cancelled/skipped0, 종료1 |
| 같은 명령 2차(실패 상세 수집) | **100건 pass96 fail4**, cancelled/skipped0. `api.test.js:651` 재삭제 redis 예상0/실제1; `:1473` 허가 예상20/실제23; `:1513` 녹음 응답 예상409/실제201; `:1538` 관리 응답 예상200/실제403. 쭘 서버 실패로, 이번 두 잠금의 성공 근거로 사용하지 않음 |
| `node --test tests/zzoom/spa-storage.test.js tests/zzoom/units.test.js` | **30/30**, fail/cancelled/skipped0. 이수증 시험은 AL05의 ReferenceError 로그로 별도 보완 재현 |
| PowerShell here-string을 `node` 표준입력으로 전달: SPA 원문 VM | initFirebase·storageClaimsOk·ensureStorageAuth·storagePathFor·uploadToFirebase·deleteFromFirebase·ttSubmitUpload **7개 원문 차이0**. TT 보완: 각 upload1/patch0/toast1. 네트워크 삭제 실패: 각 delete1/toast0 |
| 같은 방식: bap·codocs 원문 함수+가짜 Auth/Firestore | `BAP_SWITCH_FAIL result=false,currentUser=boss,signOut=0,fetches=2`; `BAP_FAILED_AUTH_STILL_WRITES newToken=manager-session,http=500,writeIdentity=[boss]`; `BAP_LOGOUT_RACE currentUser=boss,authedFor=boss-session`; `CODOCS_EXPIRED_USER tokenRequests=0,authState=ok`; bap claim=`{bp:bap,br:b}`, until없음 |
| 같은 방식: server.js 함수·라우트 등록문 추출+Express 로컬 포트·가짜 Redis/RSA | RS256 검증, exp-iat3600, ba/cp/bp 분리, Cache-Control no-store 확인. 만료·위조세션401. 실서비스A 200×10→429×2/B200/A다른IP429. copy200×120→429/같은IP실서비스429. bap manager200×10→429×2, boss bp/br, 다른학교401/이상역할403/비로그인401. 경로변형4개 모두200. 로컬 서버 종료 |
| Rules API POST 접근 | source=현 storage.rules, 10초timeout. **fetch failed / EACCES**, 엔진 시험 **0건**. 인증정보 전송 없음 |
| `git diff --no-index`·문자열 비교 | Storage 잠금본 주석1줄 차이, Firestore 비잠금본=루트, Firestore 잠금본에 제안 전체 포함 |

재현은 `spa-storage.test.js`의 extract로 **현재 원문**을 잘라 VM에서 실행했다. 서버 재현도 실제 rateLimit·validateSession·requireAuth·resolveSchool·bapSessionGet·bapAuth와 두 라우트 등록문을 사용했다. 외부 저장소/실제 계정 대신 메모리 세션·가짜 RSA를 주입했으며, 전체 운영 서버를 실행했다는 뜻은 아니다. AL02의 update는 가짜 SDK에서 어떤 인증으로 호출되는지 확인한 결과이고 실제 Firestore 승인 결과는 규칙 코드로 판정했다.

감사 중 작업본 변동이 관찰됐다(storage.rules 주석 변경 및 이 보고서의 진행 초안 생성·갱신). 두 test:zzoom 결과 차이를 동일 스냅샷의 비결정성으로 단정하지 않는다. 08:25 KST 검토본 SHA-256 앞16자리: storage-token `fe94c590b748d09e`, server `729ba9dadb85f9eb`, index `cb3c386cc3341e02`, public/index `e0f65d353d3c43f2`, codocs `2824dbb049ab7c6b`, bap `e7ce6c39b166bd12`, storage.rules `b1a906cf42bed12b`, 제안 `3715ad122198669a`.

이 감사에서 직접 쓴 파일은 이 보고서뿐이다. 코드 수정·커밋·배포·규칙 게시·실제 Firebase 쓰기는 하지 않았다. **AL01·AL02가 남아 있어 합산 판정은 FAIL**이다.

## 기존 진행 기록(보존; 최종 판정·결과는 위 표 기준)

1. 감사 지침을 읽고 보고서를 먼저 생성했다. 코드 대조와 테스트 수집을 시작한다.

### 중간 저장 1 — 코드 확인 / 정규 시험

- `npm.cmd test`: unit tests 313 / pass 313 / fail 0 / skipped 0, contracts tests 11 / pass 11 / fail 0 / skipped 0. 종료 코드 0. 잠금 전용 시험이 아님.
- Storage `until` 검사는 `storage.rules:16–22`, 발급 상한은 `lib/storage-token.js:34–39`에서 확인했다.
- Firestore 제안 `isBa`·`bapOk`는 만료·세션 유효성을 확인하지 않는다(`firestore_lock_proposal.rules:13–18`). bap claim 자체에도 만료가 없다(`lib/storage-token.js:45–50`). 이전 감사의 “사소·수용” 평가는 인용하지 않고 독립 재검증 중이다. 사용자 수용 범위는 가입 시 역할 선택뿐이다.
- `public/bap/index.html:755–772`는 로그인 요청이 진행 중일 때 다른 토큰 요청도 같은 Promise에 합류하며, 실패하면 이전 Firebase 인증을 지우지 않는다. 로그아웃과 발급 완료의 경합을 재현할 예정이다.
- `server.js:125`의 횟수 제한 키는 정규화되지 않은 `req.path`. Express 실제 라우팅과 대조할 예정이다.
- 게시용 잠금본과 공개 유지본이 모두 존재한다. `firebase.publish.json`은 공개 유지본을, `firebase.publish-lock.json`은 잠금본을 지정한다. 운영 상태를 읽거나 게시하지 않았다.

### 중간 저장 2 — 독립 재현 결과

- `npm.cmd run test:zzoom`: tests 106 / pass 106 / fail 0 / skipped 0, 종료 코드 0.
- Rules 시험 API `POST https://firebaserules.googleapis.com/v1/projects/airoom-ebce3:test`: `fetch failed; EACCES`. 요청은 로컬 네트워크 단계에서 차단됐다. 규칙 실엔진 시험 0건이며, 이전 보고서의 372건·310건은 이번 통과 숫자로 사용하지 않는다.
- **A2(중요) 횟수 제한 우회 확정:** server.js의 실제 rateLimit·인증·라우트 등록 원문을 VM에서 Express에 연결, 세션/Redis는 메모리 가짜, RSA 키는 일회성 합성값. 정상 경로 11회 = 200×10 + 429×1. 같은 세션·IP로 `/API/FIREBASE-TOKEN` 11회와 `/api/firebase-token/` 11회도 각각 200×10 + 429×1. 급식 경로의 대소문자 변경도 동일. `req.path`별 별도 버킷과 Express 기본 대소문자 무시·끝 슬래시 허용이 충돌한다.
- 비로그인 정상 경로 121회 = 401×120 + 429×1, 대문자 경로로 바꾸면 다시 401(한도 우회). copy 정상 경로 121회 = 200×120 + 429×1, `/api/copy/FIREBASE-TOKEN`은 다시 200. copy가 사용한 IP 통을 실서비스도 공유함(429).
- 정상 보호: 비로그인·copy-demo를 실서비스에 사용·다른 학교 세션은 401, 미지원 bap 역할과 `/api/copy/bap/firebase-token`은 403. 발급 ba/cp/bp 토큰은 합성 공개키로 서명 검증 성공, claim 분리 확인.
- 독립 라우트 재현 서버는 127.0.0.1:61644에서만 실행했고 finally에서 연결과 서버를 닫음(`LOCAL_SERVER_CLOSED true`). 운영 server.js 전체를 실행하지 않았으며 .env·실제 Firebase·실제 Redis에 접근하지 않았다.
- Storage 잠금 게시본은 원본과 실행 규칙이 같다. 단, :49 주석 1줄은 다르므로 README의 “그대로”를 바이트 동일로 해석하면 안 된다. Firestore 잠금 게시본에는 제안 블록이 그대로 포함된다.
- JEV는 실행 권한 거부로 사용할 수 없었다. `jev doctor`도 `Access is denied`. 외부 판단에 코드를 맡기지 않고 주 모델이 직접 판단한다.

### 중간 저장 3 — 클라이언트 경합 / 시험 유효성

- **A3(중요) 급식 인증 문맥 혼선 재현:** HTML의 `ensureAuth`, `clearBapToken`, `waitForBap`, `fsSet` 원문을 VM에서 가짜 Firebase·fetch로 실행했다.
  - B0: 결재자 로그인 뒤 `clearBapToken()` → Firebase user=boss, signOut=0.
  - B1: boss 인증 보유 → manager 토큰 발급 401 → `fsSet`의 가짜 저장 호출 actor=boss, signOut=0. 인증 실패가 쓰기를 중단시키지 않는다.
  - B2: 최초 boss 발급 응답 지연 → `ensureAuth('')` → 늦은 응답 완료 → Firebase user=boss로 복귀, signOut=0.
  - B3: boss·manager 동시 인증 → fetch는 boss 1회뿐, 두 호출 모두 true, 최종 user=boss.
  - B4: 발급 후 서버 세션이 무효가 되어도 같은 토큰의 `ensureAuth`는 true를 반환하며 재확인하지 않는다.
- codocs C1: ready=true·세션 토큰 없음·기존 Firebase 사용자 until=1 → boot=true / authState=ok / fetch=0. 이는 클라이언트 재검증 부재의 재현이며 실제 Firestore 접근 시험은 아니다.
- Storage S1: 양 SPA 모두 삭제 첫 시도에 `storage/retry-limit-exceeded` → delete 1회 / toast 0 / 정상 반환. 비인증 오류를 전부 삼켜 파일 잔존을 알리지 않는 사소 문제가 남는다(`index.html:2354`, `public/index.html:2480`).
- 두 SPA 함수 원문 비교: storageClaimsOk·ensureStorageAuth·storagePathFor·uploadToFirebase·deleteFromFirebase·ttSubmitUpload **6/6 동일**.
- 기존 SPA 시험 21건을 메모리 내 변이 코드(강제 요청 대기 분기만 제거)에 실행: **19 통과 / 2 실패**. 실패는 두 SPA N4 시험. 따라서 이 시험은 해당 수정이 없으면 실제로 실패한다. 파일은 고치지 않았다.
