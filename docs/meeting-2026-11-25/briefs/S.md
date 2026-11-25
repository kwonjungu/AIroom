너는 쭘(ZZOOM) 회의 시스템의 **엔진팀 S(서버)**다. 먼저 `~\Desktop\AIroom\docs\meeting-2026-11-25\TEAM_COMMON.md` 를 읽고 그대로 따른다. 설계 기준은 같은 폴더 `DESIGN.md` v2(파트 A·B-1·B-5·C-5·D·E·F·G·H·K)다.

## 소유 파일 (이것만 만들고 고친다)
- `lib/zzoom/**` (새로)
- `tests/zzoom/api.test.js` 와 `tests/zzoom/fakes/**`
- `server.js` — 아래 세 곳만: ① `COPY_BLOCKED` 에 `/^\/api\/zzoom(\/|$)/` 추가 ② static 앞에 `app.get(['/zzoom','/zzoom/'])` 로 `public/zzoom/index.html` 보내기(`/recruitment` 방식, 파일이 아직 없으면 404 그대로) ③ `/api/zzoom` 라우터 mount(기존 `requireAuth`·세션·redis·`callGroq` 류를 주입)
- `vercel.json` — `crons` 에 `/api/zzoom/maintenance/purge` 하루 1번(UTC 18:00) 추가만. rewrite 추가 금지
- `package.json`·`package-lock.json` — 의존성·`test:zzoom` 스크립트 추가만

## 만들 것
1. `lib/zzoom/routes.js` `createRouter({redis, validateSession, fb, groq, now, isCopy})` — DESIGN A-6 표의 모든 API. 첫 미들웨어에서 `req.isCopy` 면 403.
2. 저장 어댑터 `fb` 인터페이스(Firestore 문서 get/set/update/delete/트랜잭션/쿼리, Storage 목록·삭제·메타, `createCustomToken(uid, claims)`)를 정의하고 ① 실제 구현(env `FIREBASE_SERVICE_ACCOUNT` JSON 이 있을 때만 지연 로드, DB `kwon`) ② 메모리 가짜(시험용). DESIGN K1: `firebase-admin` 을 설치해 `node_modules/firebase-admin` 과 의존 크기를 재고, 크면(대략 60MB 넘으면) 서비스 계정 JWT 서명 + REST 로 가볍게 구현한다. 어느 쪽을 골랐는지와 잰 숫자를 보고.
3. 참가 자격(A-2), 주관 코드(A-3: 숫자 6자리, PBKDF2 {hash,salt}, 시도 장부 INCR 원자, 회의 전체 50회 잠금과 관리자 풀기), 10일 만료(A-4), 진행 트랜잭션(D-1 epoch·baseRev·forceSeq), 접속 heartbeat와 counts 갱신(K2), 판서(E: epoch, seq, 상한), 채팅(F-1), 손(F-2), 투표(F-3: 원표 Redis Lua, 비공개는 누구도 개인 선택 못 봄, 공개는 reveal 때 names), 업로드 허가·commit 검증(C-5), 녹음 조각 → Groq whisper-large-v3(G-1, 소리 저장 안 함, 기존 Groq 키 순회 재사용; 시험은 가짜), AI용 md(G-2), 정리 작업(H-1: deleting, 커서, 50초 상한, Bearer CRON_SECRET, DELETE 때 즉시 실행).
4. Redis 는 기존 서버가 쓰는 Upstash 클라이언트 모양(`get/set/del/incr/expire/eval` 등)에 맞춘다. 시험용 메모리 가짜를 `tests/zzoom/fakes/` 에.
5. `tests/zzoom/api.test.js`(node --test): DESIGN 파트 J 의 API 격리·주관 코드·투표·진행·업로드·삭제 행을 실패 경우 위주로. `npm run test:zzoom` 로 돌게. 기존 `npm test`(vibe) 가 계속 통과하는지도 확인.

## 다른 팀
- 규칙팀 R 은 `firestore.rules`·`storage.rules`, 변환팀 C 는 `public/zzoom/convert/*` 를 맡는다. 건드리지 않는다.
- 브라우저 쪽 `api.js` 는 통합 담당(Claude)이 네 API 로 만든다. 보고서에 **API 요청·응답 모양 표**(경로, 헤더 `X-Auth-Token`/`X-Zzoom-Pt`, 본문, 응답, 오류 코드)를 꼭 넣어라.

보고서: `docs/meeting-2026-11-25/reports/S.md`. 마지막 답변은 보고서 요약 10줄 이내.

## 추가 지시 (판서 형식 변경)
판서 저장 형식이 바뀌었다(DESIGN.md 파트 E 갱신, 판서 엔진 perfect-freehand 1.2.3). `POST /:mid/strokes` 검증을 이렇게 맞춰라:
- 본문 `{pageKey, epoch, tool, color, w, pts, group?, part?}`
- `tool` ∈ {'pen','hl'}, `color` ∈ {'#FFE14D','#9BE15D','#FF8AD8','#E5484D','#2F6FEB','#1d1d1f'}(hl 은 앞 3개, pen 은 뒤 3개만)
- `w` 숫자 0.001~0.05(쪽 너비 비율)
- `pts` = 숫자 배열 [x,y,p,...]: 길이 3의 배수, 6~4500, x·y 0~1, p 0~1. 저장은 그대로(외곽선 저장 안 함)
- `group`(문자열 ≤40)·`part`(0~20 정수) 선택
- 서버가 `at`·`seq`(쪽별 증가)·`cid`·`name` 부여, 옛 epoch 거절, 쪽당 2,000·회의당 2만 상한은 그대로.
보고서 API 표에도 반영해라.
