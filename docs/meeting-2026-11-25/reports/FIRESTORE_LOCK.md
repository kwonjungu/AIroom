# FIRESTORE_LOCK 보고 — 급식일지(bap*)·함께 만드는 문서(codocs_*) 잠그기

브리프: `briefs/FIRESTORE_LOCK.md`. 커밋·푸시·규칙 게시 안 함. 실제 Firestore 에 쓰지 않음(규칙은 시험 API, 화면은 가짜 Firebase 모듈).

## 1. 분석

### 1-1. 지금 운영 규칙(`rules-backup/2026-11-25_firestore_kwon_live.rules`)과 저장소 `firestore.rules` 차이
- 운영본 = 저장소본에서 **쭘(zzoom_meetings) 블록만 빠진 것**. bap·codocs 블록은 글자까지 같다.
- 둘 다 bap·codocs 의 **읽기뿐 아니라 쓰기·지우기도 로그인 없이 열려 있다**(아래 표). 규칙 시험 API 로 같은 108건을 운영본에 돌리면 39/108 만 통과 — 실패 69건이 곧 새는 곳이다(3절).

### 1-2. 누가·어디서·무엇을
| 컬렉션 | 누가 쓰나(코드) | 읽기 | 쓰기 | 운영 규칙 | 판단 |
|---|---|---|---|---|---|
| `codocs_sheets`, `/rows`, `/presence` | `public/lib/codocs.js`(두 SPA 의 「함께 만드는 문서」 탭). 별도 Firebase 앱 `'codocs'`(모듈 SDK 10.12.0) | onSnapshot 목록 | 셀·행·시트·접속표시 | read/write/delete `if true`(형식만) | **새는 것**. 교내 PC IP·MAC 대장. 로그인 없는 REST 로 통째 읽고 지울 수 있음 |
| `codocs_members` | 같은 모듈(👥 학교 사용자) | 목록 | 일괄 저장 | `if true` | **새는 것**. 교직원 이름·직위·소속 |
| `bap*_journals`(백암·백봉·장평) | `public/bap/index.html`(로그인한 담당자·결재자 화면) | get·날짜 범위·status 쿼리 | 제출·결재 트랜잭션, 결재자 「서버 관리자」 삭제 | read `if true`, delete `if true` | **새는 것**. 담당자·결재자 이름, 서명 그림. 누구나 지울 수도 있음 |
| `bap*_menus` | 같은 페이지. 「월별 식단 입력하기」 화면은 **로그인 없이** 열림(조회+AI 파싱+저장), 담당자 일지 화면도 읽음 | 날짜 범위 | 저장·잔여 삭제 | read `if true`, write 날짜 형식만 | 읽기는 **의도된 공개**(식단은 가정에 알리는 정보, 조회 화면이 비로그인). 쓰기는 누구나 덮어쓸 수 있어 막아야 함 |
| `bap_users`, `bap_config` | **코드에서 더 안 씀**(계정·PIN 은 서버 `/api/bap/auth/*` + Redis 로 옮겨짐) | – | – | read `if true`, create 허용 | **새는 것**. 옛 비밀번호·PIN 해시가 남아 있을 수 있음 → 완전히 닫음 |

### 1-3. 카피본·미러·/posting
- `/copy`: 탭 목록(`defaults-copy/tabs.json`)에 codocs 가 있고 `/api/copy/firebase-config` 가 실제 설정을 주므로, **공개 시연본에서 실제 IP 대장·명부를 보고 고칠 수 있었다**(관리 모드 상시). 고침: codocs 가 카피본에서는 Firestore 에 붙지 않고 「시연 제외」 안내만 보인다. 규칙도 `cp` 출입증을 거절. bap 는 카피본에서 원래 막혀 있음(`COPY_BLOCKED` `/api/bap`) → `/api/copy/bap/firebase-token` 도 403.
- GitHub Pages 미러: SPA fetch 래퍼가 `/api/*` 를 vercel 로 보냄. CORS 가 `X-Auth-Token` 허용 → codocs 출입증 요청 그대로 동작(창고 출입증과 같은 경로).
- `/posting`: `firebase-config` 가 `{}` 라 원래 codocs 가 오류 문구로 끝났다. 이제 「시연 제외」 안내로 통일. Firestore 미접속.

## 2. 바꾼 파일
- `public/lib/codocs.js`
  - `firebase-auth.js`(10.12.0) 추가. `boot()` 에서 `signInCodocs()`: `HOST().authToken`(기존 `window.CODOCS_HOST` 게터)으로 `GET /api/firebase-token` → `signInWithCustomToken`, `inMemoryPersistence`. codocs 는 SPA compat 앱과 **다른 Firebase 앱**이라 따로 로그인한다(SPA 수정 불필요).
  - 서버 키 없음(503)이면 예전처럼 비로그인 진행(규칙 게시 전 과도기). 401·실패면 🔒 「다시 로그인」 안내 + 새로고침 단추.
  - permission-denied: 출입증이 있으면 기존 규칙 게시 안내(`showRulesHelp`), 없으면 로그인 안내(`onDenied`).
  - `window.IS_COPY` 또는 `/posting` 이면 Firestore 에 붙지 않고 「시연에서 제외」 안내.
- `public/bap/index.html`
  - `firebase-auth.js` 추가, `window.__bap.ensureAuth(bapToken)`: `GET /api/bap/firebase-token`(X-Bap-Token·X-Bap-School) → 맞춤 토큰 로그인(메모리). 토큰이 바뀌면 다시 받고, 토큰이 없으면 signOut.
  - `waitForBap()` 이 초기화 뒤 출입증까지 확인. `fsGet/fsSet/fsUpdate/fsQuery` 도 먼저 `waitForBap()`.
  - 식단 저장(`muUpload` 시작, `mrSave`)은 bap 로그인이 없으면 안내 후 멈춤(조회는 그대로 비로그인). 화면 설명 한 줄 추가.
  - 제출·결재·삭제·다운로드 실패 문구를 `fsDeniedMsg()` 로(권한 오류면 「다시 로그인」 안내).
- `lib/storage-token.js`: `bapClaimsFor(sess)` → `{uid:'bap-<학교>-<m|b>', claims:{bp:학교, br:'m'|'b'}}`, `makeBapHandler()`. ba/cp 는 넣지 않음(최소 claim). 기존 `claimsFor`·`makeHandler` 손대지 않음(작업 중 다른 에이전트가 `until` 을 넣은 것 확인, 충돌 없음).
- `server.js`(bap 부분만): `GET /api/bap/firebase-token` = `rateLimit(30/분)` + `bapAuth` + `makeBapHandler()`. `/api/bap/auth/me` 바로 아래.
- `docs/meeting-2026-11-25/firestore_lock_proposal.rules`: `firestore.rules` 의 「담당자 계정」~「쭘 회의」 직전을 통째로 바꿀 블록.
  - codocs_* 전부: `ba==1` 만(형식 검사는 그대로).
  - `bap_users`, `bap_config`: 전부 거절.
  - `bap*_menus`: 읽기 공개, 쓰기·지우기는 그 학교 bp + 날짜 id + `lunch` 문자열 2000자 미만.
  - `bap*_journals`: 읽기·제출·재제출은 그 학교 bp, 결재(→approved)·삭제는 결재자(br=b)만, approved 는 수정 불가(기존 유지), 담당자 이름 바꾸기 불가(기존 유지).

## 3. 시험

### 3-1. 규칙(Firebase Rules 시험 API `projects/airoom-ebce3:test`, 게시 아님)
메모리에서 현재 `firestore.rules` 의 bap·codocs 블록을 제안 블록으로 바꾼 전체본으로 실행. 스크립트: scratch `fslock/rules-test.js`.
- **제안: 108/108 통과.** 운영 원본으로 같은 108건: 39/108(실패 69 = 지금 새는 곳, 쭘 2건은 운영본에 쭘 블록이 없어서).

| 대상 | 비로그인 | ba(백암이) | cp(카피본) | zz(쭘) | bap 담당(bp=bap,m) | bap 결재(b) | 다른 학교 bap2 |
|---|---|---|---|---|---|---|---|
| codocs 시트·행·명부·접속표시 읽기/목록 | 거절 | 허용 | 거절 | 거절 | 거절 | – | – |
| codocs 행 쓰기·지우기, 명부 쓰기 | 거절 | 허용 | 거절 | 거절 | 거절 | – | – |
| bap_users·bap_config 읽기 | 거절 | 거절 | – | – | – | 거절 | – |
| 식단 읽기/목록 | 허용 | 허용 | 허용 | 허용 | 허용 | – | (자기 학교 허용) |
| 식단 쓰기·지우기 | 거절 | 거절 | 거절 | 거절 | 허용 | 허용 | 거절 |
| 일지 읽기·목록·제출 | 거절 | 거절 | 거절 | 거절 | 허용 | 허용 | 거절 |
| 일지 결재(→approved) | – | – | – | – | 거절 | 허용 | – |
| 일지 삭제 | 거절 | – | – | – | 거절 | 허용 | – |
| approved 일지 수정 | – | – | – | – | – | 거절 | – |
| 쭘 회의(회귀) | – | 거절 | – | 같은 회의 허용·목록 거절 | 거절 | – | – |
그 밖: codocs 시트 형식 오류 거절, 식단 날짜 아닌 id 거절, 담당자 이름 바꾸기 거절, 기타 컬렉션 거절.

### 3-2. 서버 출입증(가짜 RSA 키, scratch `fslock/token-test.js`)
11/12 — 담당자·결재자·레거시(학교 없음) claim, 모르는 역할·학교 null, 발급 200, claim `{bp,br}` 만(ba/cp 없음), 서명 검증, 키 없음 503, 역할 이상 403 통과. 실패 1건은 내 시험의 기대값 문제: 다른 에이전트가 창고 토큰 `claimsFor` 에 `until` 을 넣어서 옛 기대값과 달라짐(내 코드 문제 아님).

### 3-3. 화면(로컬 서버 + Python Playwright Edge, scratch `fslock/e2e.py`) — 21/21 통과
- 서버는 가짜 서비스 계정 키로 띄웠다(출입증은 진짜 서명 경로를 탄다). `gstatic.com/firebasejs/10.12.0/*` 를 가짜 모듈(`fslock/fake-fb.js`, 규칙 흉내: codocs 는 ba, 일지는 bp, 식단 공개)로 바꿔 **실제 Firestore 미접속**.
- 서버 직접: 비로그인 `/api/firebase-token` 401, `/api/bap/firebase-token` 401, `/api/copy/bap/firebase-token` 403.
- codocs(`/`): 출입증 요청에 X-Auth-Token, 서버 토큰 claim ba=1, persistence NONE, 시트 보임, 권한 안내 없음. 출입증 401 → 「다시 로그인」 안내 + Firestore 안 읽음. 503 → 비로그인 진행(가짜 규칙이 막으면 규칙 게시 안내).
- `/copy`, `/posting`: codocs 「시연에서 제외」, Firestore 안 읽음.
- `/bap/`: 담당자 세션 → 출입증 요청(X-Bap-Token·X-Bap-School) → claim `{bp:'bap',br:'m'}` → 일지 읽힘. 토큰 지우면 signOut, 식단 조회는 됨, 일지는 「다시 로그인」 안내. 비로그인 식단 저장은 막고 안내. 스크립트 오류 0(SPA·bap).
- 이 시험이 bap 화면의 실제 버그 하나를 잡았다(내가 넣은 안내문에 줄바꿈이 문자 그대로 들어가 스크립트 전체가 깨짐) → 고친 뒤 통과. bap 두 스크립트 `node --check` 통과.

### 3-4. 못 돌린 것·우회
- `node _check/codocs-test.mjs`: **파일이 이 PC 에 없다**(`_check/` 는 .gitignore, 바탕화면·문서 폴더 검색해도 없음). 돌리지 못함. 대신 3-3 에서 codocs 탭이 열리고 시트가 그려지는 것까지 확인.
- 로컬 서버: 다른 에이전트가 고치는 중인 `lib/zzoom/routes.js:676` 구문 오류로 `node server.js` 가 안 떠서, 시험 때만 `node -r fslock/stub-zzoom.js server.js`(쭘 라우터가 깨져 있으면 빈 라우터로 대체)로 띄웠다. 저장소 파일은 안 건드림.
- 실제 Firebase 로그인(진짜 서비스 계정 키 → signInWithCustomToken → 규칙 통과)은 키가 있어야 확인 가능. 게시 순서 2단계에서 확인.

## 4. 게시 순서(바뀌면 일지·codocs 가 멈춘다)
0. 전제: STORAGE_LOCK 의 1·2단계(Authentication 「시작하기」, Vercel `FIREBASE_SERVICE_ACCOUNT`)가 끝나 있어야 한다. 키가 없으면 출입증이 503 이고 화면은 비로그인으로 동작하므로, **키 없이 규칙을 게시하면 codocs·일지가 전부 막힌다.**
1. 코드 배포(codocs.js, bap/index.html, server.js, lib/storage-token.js). 지금 규칙이 열려 있어 배포만으로는 아무것도 안 막힌다.
2. 확인(Preview): 백암이 로그인 → 함께 만드는 문서 탭, 네트워크에 `/api/firebase-token` 200·`signInWithCustomToken` 성공. `/bap/` 담당자 로그인 → 일지 목록, `/api/bap/firebase-token` 200. `/copy` → codocs 「시연 제외」.
3. 규칙 게시: 현재 `firestore.rules`(쭘 블록 포함)에서 「담당자 계정」~「쭘 회의」 직전을 `firestore_lock_proposal.rules` 로 바꾼 전체를 콘솔 `.../firestore/databases/kwon/security/rules` 에 게시.
4. 게시 뒤 확인: 로그아웃 창에서 `https://firestore.googleapis.com/v1/projects/airoom-ebce3/databases/kwon/documents/codocs_sheets` → 403, `.../bap_journals` → 403, `.../bap_menus` → 200. 로그인 화면은 2번과 같이 동작.
- 되돌리기: `rules-backup/2026-11-25_firestore_kwon_live.rules` 재게시(쭘이 이미 운영이면 쭘 블록을 붙인 판으로). 코드는 규칙이 열려 있어도 동작하므로 코드 되돌리기는 필요 없음.

## 5. 남은 위험·정한 것
- **bap 가입이 열려 있다**: `/api/bap/auth/signup` 은 누구나 담당자·결재자 계정을 만들 수 있다. 그러면 bap 출입증도 받는다. 이번 잠금은 「로그인 없이 REST 로 긁기·지우기」를 막는 것이고, 가입 제한(학교 코드나 관리자 승인)은 별도 일. 결재자 가입이 열려 있으면 결재·삭제 권한도 열린다 — **가장 먼저 다룰 남은 구멍**.
- `/api/bap/parse-menu`·`revise-menu` 는 비로그인으로 Groq 를 부른다(비용). Firestore 와 무관해 그대로 둠.
- 제안 규칙은 ba 의 `until` 을 보지 않는다. codocs 는 탭을 오래 열어 두는 실시간 화면이라, until(최대 1시간)을 보게 하면 한 시간 뒤 구독이 끊긴다. 출입증은 탭 메모리(inMemory)라 창을 닫으면 사라진다. until 을 넣으려면 codocs 가 만료 전에 새 출입증을 받는 코드가 먼저 필요.
- 식단 문서의 `uploadedBy`(결재자 이름)는 공개 읽기에 남는다. 감추려면 화면에서 이 필드를 빼야 한다.
- codocs 의 시트별 editPolicy·관리 모드 구분은 여전히 화면에서만 지킨다(공유 접근 코드라 사람 구분이 없음). 규칙은 「백암이 로그인했는가」까지만.

## 6. 요청
- 두 SPA 담당: **바꿀 줄 없음.** codocs 는 기존 `CODOCS_HOST.authToken` 게터만 쓴다. (선택) 로그아웃 시 페이지를 새로고침하지 않는다면 `window.codocsClose()` 뒤 새로고침을 권함 — codocs 출입증이 탭 메모리에 남는다.
- zzoom 담당: `lib/zzoom/routes.js:676` 구문 오류로 서버가 안 뜬다.
- 통합 담당: `firestore.rules` 정리할 때 3절 블록 교체를 반영하고 4절 순서로 게시. `_check/codocs-test.mjs` 원본이 있는 PC 에서 한 번 돌려 주기.
