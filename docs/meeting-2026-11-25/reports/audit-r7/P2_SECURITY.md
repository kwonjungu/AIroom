# 감사 R7 파트 2: 보안과 규칙 (2026-11-26)

범위: firestore.rules(쭘 블록), storage.rules(쭘 경로), public/zzoom/api.js 의 직접 읽기(구독, getBlob), 맞춤 토큰 발급(lib/zzoom/keys.js, routes.js claimsFor, issue, refresh, uploads), public/zzoom/*.js 전체 XSS, 공개 저장소(git ls-files 492개 쭘 관련 파일)의 실명과 개인 경로, 키.
방식: 읽기 전용. 코드와 설정은 고치지 않았다. 규칙 실엔진 시험(Rules API)과 운영 콘솔 확인은 하지 않았다.

## 찾은 문제

### 1. [보통] 공개 저장소에 교직원 실명 6명이 커밋돼 있다 (PII_SWEEP.md)
- 파일:줄: `docs/meeting-2026-11-25/reports/PII_SWEEP.md:21-27`. 커밋 9549c90 에 들어 있고, origin/feat/meeting, origin/main, origin/claude/school-admin-portal-APgza 에 모두 올라가 있다. 저장소 공개 여부는 `gh repo view` 로 확인했고 PUBLIC 이다.
- 무엇이 틀렸나: 개인정보 점검 보고서가 고칠 대상을 표로 적으면서 「바꾸기 전 값」 칸에 실제 교직원 이름 6명(본교·분교 교사와 교감)을 그대로 옮겨 적었다. 점검 문서가 오히려 실명이 새는 곳이 됐다.
- 재현: GitHub 에서 kwonjungu/AIroom 의 feat/meeting 브랜치를 열고 이 파일 21~27줄을 본다. 로그인하지 않아도 실명 목록이 보인다.
- 참고: defaults/staff.json 과 두 SPA 에도 같은 이름이 이미 공개돼 있다. 그래서 새로 드러난 정보는 아니다. 다만 쭘 문서 묶음은 「익명(ANON)」을 약속했으므로 이 묶음 안에서는 지워야 맞다.
- 고칠 방향: 그 칸을 「실명 1명」「실명 4명」처럼 사람 수로만 적는다. 히스토리에서도 지울지는 사용자가 정한다.

### 2. [낮음] 공개 저장소에 사용자 실명이 든 Windows 경로가 있다 (EASY_UX_A.md)
- 파일:줄: `docs/meeting-2026-11-25/reports/EASY_UX_A.md:24`. 커밋 9549c90 이고 푸시됐다.
- 무엇이 틀렸나: 스크린샷 위치를 `C:\Users\<실명 계정>\AppData\Local\Temp\claude\...\scratchpad\easyA\shots\` 처럼 계정 폴더 이름(실명)까지 그대로 적었다. 다른 보고서들은 같은 자리를 `<임시폴더>` 로 바꿔 두었는데(PII_SWEEP 표 참고) 이 파일만 빠졌다.
- 재현: 공개 저장소에서 위 줄을 열면 PC 계정 이름(실명)과 사용자 폴더 구조가 보인다.
- 고칠 방향: `<임시폴더>\easyA\shots\` 로 바꾼다. 커밋 전 점검(PRECOMMIT_SCAN)의 경로 검사가 `C:\Users\` 를 백슬래시로 쓴 형태도 잡는지 함께 본다.
- 덧붙임: `briefs/AUDIT_ROUND.md:15` 에도 `~\AppData\Local\Temp\claude\<세션 id>\...` 경로가 있다. 실명은 없어 문제로 치지 않았다.

### 3. [보통] 「회의 지우기 누구나」의 사람당 상한(10분에 10개)은 다시 로그인하면 풀린다
- 파일:줄: `lib/zzoom/routes.js:343-355`(rate 키 `'del:' + personOf(req)`), `routes.js:131`(personOf = 백암이 세션 토큰의 해시).
- 무엇이 틀렸나: 상한을 세는 열쇠가 「사람」이 아니라 「로그인 세션」이다. 백암이 접근 코드는 모두가 함께 쓰므로 로그인하면 새 토큰이 얼마든지 나온다. IP 상한도 없다. 「누구나 지우기」는 사용자가 정한 것이라 지울 수 있다는 점 자체는 문제가 아니다. 문제는 사고를 막으려고 둔 상한이 실제로는 막지 못한다는 점이다.
- 재현: 로그인한 교직원 A 가 `GET /api/zzoom/meetings` 로 모든 회의 id 를 받는다. 10개를 지운다. 백암이에 다시 로그인해 새 X-Auth-Token 을 받는다. 다음 10개를 지운다. 이렇게 하면 몇 분 안에 진행 중인 회의까지 모두 지워진다. 지우기는 status 를 'deleting' 으로 바꾸고 바로 purge 하므로 되살릴 수 없다.
- 고칠 방향: IP 상한(예: 1시간 30개, 회의 만들기와 같은 방식)과 회의 전체 상한(예: 10분에 20개)을 더한다. 진행 중(live)인 회의는 만든 사람이나 관리자만 지우게 하는 방법도 있다.

## 확인했고 문제없는 것

- **Firestore 쭘 블록**(firestore.rules:170-193)
  - 회의 문서는 get 만 되고, list 와 모든 쓰기는 false 다.
  - 하위 컬렉션 읽기는 같은 mid 의 claim 이 있고 until 이 지나지 않았을 때만 된다. 7종(agenda, pages, strokes, hands, chat, polls, transcript)이 그렇다.
  - people 은 role host 만 읽는다. 클라이언트도 주관자일 때만 subscribePeople 을 붙인다(app.js:502-510).
  - api.js:564-573 의 구독 9개가 쓰는 경로는 모두 이 규칙 안에 든다. strokes 의 `where pageKey` 쿼리도 `{sub}/{id}` list 로 허용된다.
- **Storage**(storage.rules)
  - 기존 앱 블록이 `notZz(top)` 으로 zzoom/ 와 zzoom-vendor/ 를 빼므로, OR 로 합쳐져도 쭘 파일이 열리지 않는다.
  - 쭘 파일은 get 만 되고 list 와 write 는 false 다.
  - 업로드는 up claim, uploadId, 파일 이름 형식, 쪽 수, 크기, contentType 을 모두 맞춰야 create 된다. `resource == null` 이라 덮어쓸 수 없다.
  - 클라이언트는 getBlob 만 쓴다(api.js:582, 600). getDownloadURL 은 없다.
  - commit 때 서버가 목록, 크기, WebP 머리, 쪽 크기, 원본 MIME 을 다시 확인한다(routes.js:684-733).
- **맞춤 토큰**
  - claim 은 zz, mid, role, until, up* 이다. gcp.js:199 가 예약된 claim 이름을 거절한다.
  - until 은 회의 만료, 1시간 뒤, 관리자나 만든 사람의 세션 만료 가운데 가장 이른 시각이다(routes.js:217-220).
  - 업로드 출입증도 15분, pt 만료, 관리자 세션 만료로 자른다(628-629).
  - refresh 는 관리자나 만든 사람의 세션을 다시 확인하고, 아니면 viewer 로 내린다. 코드로 받은 host 는 grantVer 가 바뀌면 내려간다.
  - Redis 에는 pt 의 해시만 저장한다. 투표 원표와 코드 해시(PBKDF2 12만 회, safeEqual)는 Redis 에만 있다.
  - 공개 투표 문서(polls)에는 수만 싣고 이름이나 cid 별 선택은 싣지 않는다.
- **XSS**
  - public/zzoom/*.js 와 convert/*.js 를 모두 grep 했다. innerHTML 은 app.js:329 와 465 두 곳뿐이고, 둘 다 고정 아이콘 이름과 고정 문구다.
  - 각 모듈의 `h()` 는 자식을 textContent 나 TextNode 로 넣는다(agenda.js:77, chat.js:48, hands.js:4).
  - 사용자 입력이 href 나 src 로 가는 곳은 blob URL 뿐이다. 채팅에서 링크를 자동으로 만드는 기능은 없다.
  - 해시 라우트는 정규식 `[A-Za-z0-9_-]{4,64}` 로 거른다(app.js:416).
  - 원본 내려받기 파일 이름은 금지 문자를 걸러 낸다(api.js:462-466).
  - export.md 의 Content-Disposition 은 filename* 을 encodeURIComponent 로 감싼다.
- **키**
  - 쭘 관련 추적 파일 492개에서 AIza, BEGIN PRIVATE KEY, private_key 값, gsk_, ghp_, 토큰 값을 찾지 못했다.
  - 프로젝트 id(airoom-ebce3)는 클라이언트 설정으로 원래 공개되는 값이다.

## 확인 못 함

- 운영 콘솔에 게시된 규칙이 저장소 파일과 같은지는 확인하지 못했다.
  - 저장소 쪽은 맞췄다. `publish/firestore.publish.rules` 의 쭘 블록이 firestore.rules 와 같고, `publish/storage.publish+lock.rules` 가 storage.rules 와 글자까지 같다.
  - 그러나 `rules-backup/2026-11-26_*_live.rules` 에는 zzoom 이 0줄이다. 백업한 뒤에 게시했다는 기록은 찾지 못했다.
  - 운영 화면이 판서까지 동작한다는 다른 보고가 있어 게시됐을 가능성은 높다. 하지만 이 감사에서 직접 보지는 않았다.

## 쭘 범위 밖 참고 (판정에 넣지 않음)

- firestore.rules 의 codocs_sheets, codocs_members, bap_* 는 `allow read: if true` 이고 delete 도 `if true` 다. 공개된 apiKey 만 있으면 로그인 없이 지울 수 있다. 예전부터 있던 설계("Auth 없음")이고, 이번 게시 1안에서도 잠그지 않기로 정했다(publish/README.md).

결론: PASS(치명·높음 0)
