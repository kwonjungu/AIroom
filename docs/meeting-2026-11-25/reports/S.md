# 보고서: 엔진팀 S (서버)

작성 2026-11-25. 브랜치 `feat/meeting`. 커밋·푸시·배포는 하지 않았다.

## 1. 만든 파일과 고친 곳

| 파일 | 내용 |
|---|---|
| `lib/zzoom/routes.js` | `createRouter({redis, validateSession, fb, groq, now, isCopy, env, purgeBudgetMs, deletePurgeBudgetMs})`. DESIGN A-6 표의 API 전부와 `GET /polls/:pid/tally`, `GET /polls/:pid/mine`, `POST /meetings/:mid/unlock`, `GET /health` |
| `lib/zzoom/fb.js` | 저장 어댑터 인터페이스 정의와 `createFbFromEnv()`. env `FIREBASE_SERVICE_ACCOUNT`(JSON 또는 base64 JSON)가 있을 때만, 처음 쓸 때 `gcp.js` 를 읽는다. DB 는 `kwon`(`ZZOOM_FIRESTORE_DB` 로 바꿀 수 있음) |
| `lib/zzoom/gcp.js` | 실제 구현. 서비스 계정 JWT 서명으로 Firestore REST(get·commit·runQuery·트랜잭션)와 Storage JSON API(list·meta·delete), 맞춤 토큰 직접 서명 |
| `lib/zzoom/keys.js` | Redis 키(DESIGN B-5)와 Lua 두 개(`incrEx`: INCR+첫 EXPIRE, `vote`: 이전 선택 차감과 새 선택 증가를 한 번에) |
| `lib/zzoom/purge.js` | 정리 작업(H-1). 단계 커서 `zz:purge:stage:<mid>`, 50초 상한 |
| `lib/zzoom/whisper.js` | Groq `whisper-large-v3`. 키는 server.js `getGroqApiKeys()` 를 받아 401·403·429 면 다음 키 |
| `lib/zzoom/export-md.js` | AI용 md(G-2) |
| `lib/zzoom/util.js` | 오류·id·해시·KST 표기 |
| `tests/zzoom/fakes/fake-redis.js`, `fake-fb.js` | 메모리 가짜(Upstash 모양, fb 인터페이스) |
| `tests/zzoom/api.test.js` | 시험 15건(아래 3절) |
| `server.js` | 세 곳만: ① `COPY_BLOCKED` 에 `/^\/api\/zzoom(\/|$)/` ② static 앞 `app.get(['/zzoom','/zzoom/'])` 가 `public/zzoom/index.html` 을 보냄(파일이 없으면 404) ③ 채용 라우터 다음에 `app.use('/api/zzoom', createRouter({redis, validateSession, fb: createFbFromEnv(), groq: createWhisper({getKeys: getGroqApiKeys})}))`. 줄바꿈(CRLF) 유지 |
| `vercel.json` | `crons` 에 `/api/zzoom/maintenance/purge` `0 18 * * *` 추가만. rewrite 는 건드리지 않음 |
| `package.json` | `"test:zzoom": "node --test tests/zzoom/api.test.js"` 추가만. 의존성 추가 없음 |

## 2. firebase-admin 대신 REST로 한 이유 (DESIGN K1)

빈 폴더(scratch)에 `npm i firebase-admin` 으로 따로 깔아 쟀다. 저장소에는 설치하지 않았다.

| 항목 | 잰 값 |
|---|---|
| firebase-admin 버전 | 14.5.1 |
| `node_modules/firebase-admin` 자체 | 약 2.0MB |
| 의존 포함 `node_modules` 전체 | 61.4MB(파일 크기 합), 디스크 68MB |
| 파일 수 | 4,399개 |
| 첫 로드(app·firestore·storage·auth) | 1,365ms (Node 22.18) |

기준(대략 60MB)을 넘고 콜드 스타트도 1.4초 늘어서 **가벼운 REST 구현(`gcp.js`)을 골랐다.** 의존성은 0개 늘었다. 실제 Google API 에는 한 번도 호출하지 않았으므로 `gcp.js` 는 아직 실서버 검증 전이다(5절).

## 3. 시험

| 명령 | 결과 |
|---|---|
| `npm run test:zzoom` | tests 15, pass 15, fail 0 (약 6초) |
| `npm test` (vibe unit + contracts) | unit: tests 313, pass 313, fail 0 / contracts: tests 11, pass 11, fail 0 |
| 로컬 `PORT=3291 node server.js` (Redis·Firebase 없음) | `/api/zzoom/health` 200 `{ok:false}`, `/api/zzoom/meetings` 503 `not_configured`, `/api/copy/zzoom/meetings` 403(COPY_BLOCKED), `/zzoom`·`/zzoom/` 404(`public/zzoom/index.html` 아직 없음), 서버 정상 기동 |

`tests/zzoom/rules.test.js` 는 R 팀 소유라 `test:zzoom` 에 넣지 않았다(에뮬레이터 필요).

api.test.js 가 다루는 실패·경계 (DESIGN 파트 J):
- **API 격리**: `/api/copy/zzoom/*` 는 fb·Redis·세션 호출 0회로 403. 비로그인 401, 일반 세션의 관리자 API 403, viewer 의 host API 6종 403, 다른 회의 자격 403(관리자 host 자격도), 엉터리 자격 401, 12시간 지난 자격 401, 첫 발급 + 10일 지난 회의 410, 설정 없으면 503. 맞춤 토큰 claim 이 `{zz:1, mid, role, until}` 그대로인지.
- **10일 만료**: 첫 발급 시각 기준이고 동시 입장 4명이어도 한 번만 정함.
- **주관 코드**: 틀린 코드 403과 남은 횟수, 탭 5회 뒤 맞는 코드도 429, 1시간 뒤 풀림, 같은 IP 동시 24번이면 정확히 20번만 확인(나머지 4번 429), IP 잠금 중 맞는 코드도 거절, 성공은 장부에서 되돌림, Redis 장애면 503. 회의 전체 50회 뒤 423 → 관리자 목록 `hostLocked:true` → 관리자 풀기 → 성공. 코드 바꾸면 옛 host 의 다음 쓰기 403 `host_revoked`, 재발급 토큰은 viewer, 관리자 host 는 영향 없음.
- **진행**: 시작 전 거절, 두 번 시작 409, 진행자 아닌 host 409, 옛 baseRev 409 + 최신 상태, 넘겨받기 뒤 옛 진행자 409, 같은 rev 로 동시 두 번이면 하나만 반영, view clamp, `force` 로 forceSeq+1, 끝난 뒤 거절.
- **판서(새 형식)**: tool·색(형광펜 3색·펜 3색 교차 금지)·w 범위·문자열 w·pts 길이(3의 배수, 6 미만, 4,500 초과)·범위 밖 좌표·음수 필압·null·옛 점 배열 형식·group 41자·part 21과 소수·없는 쪽·없는 안건·이상한 pageKey·epoch 없음. 정상 4,500개 저장, 서버가 cid·name·at·seq 부여(보낸 cid·name·seq 무시), 쪽별 seq, 소수 넷째 자리 반올림, 외곽선 저장 없음. 남의 선 지우기 403, 판서 잠금, 쪽 지우기 뒤 옛 epoch 409와 옛 선 정리, 쪽당 2,000·회의당 2만 상한과 거절 때 개수 되돌림, 1초 1회 제한.
- **채팅·손**: 501자·공백 거절, 사칭 cid 무시, 남의 글 지우기 403, 남의 손 내리기·모두 내리기는 host 만, host 도 남의 손은 못 올림, heartbeat 30초 counts, sendBeacon 본문 pt, 끝난 뒤 쓰기 409, 다시 열기 없음.
- **투표**: 원표가 Firestore·집계 응답 어디에도 없음, reveal 전 `tally:null`, 바꾸기, 내 선택만 조회, 참석자 집계 403, 마감과 동시 투표, 마감 뒤 409, 비공개 reveal 은 이름 없음, 공개 reveal 은 names, md 에 비공개 투표 이름 없음, 끝내기가 열린 투표를 닫음.
- **녹음**: ready 거절, viewer 403, 형식 415, 3MB 초과 413, 조각 번호 없음 400, Groq 에 넘긴 바이트·형식, 대화 기록 문서 필드, Storage 에 소리 없음, 녹음 끈 회의 거절.
- **업로드**: 형식·쪽 수·50MB·svg 거절, commit 위조(다른 회의, 없는 id, viewer), 쪽 수·크기 다름, 파일 빠짐(중간 실패), 형식 틀림, 크기 초과, 원본 크기·형식 다름, 허가 안 받은 파일, commit 재시도는 같은 결과로 중복 없음, 허가 1회용, 순서 바꾸기, 진행 중 안건 지우기 409, 지운 안건 그림 정리, commit 안 한 업로드 24시간 뒤 정리.
- **삭제**: 즉시 정리 뒤 Firestore·Storage·Redis 에 그 회의 흔적 0, 두 번째 삭제 404, 삭제 뒤 옛 자격 404, 동시 두 번 삭제, Storage 삭제가 중간에 실패하면 500 이지만 `deleting` 이라 쓰기는 바로 410이고 cron 이 이어서 끝냄, 되풀이 안전, cron 인증(없음·틀림 401, DELETE 405, 비밀 미설정 503), 시간 상한에 걸리면 대기열로 넘기고 다음 실행이 끝냄, 만료 회의는 관리자 목록에서 `deleting` 으로 바뀌고 cron 이 지움.

이번 실행에서 고친 것: Redis 가 죽었을 때 속도 제한 단계에서 500이 나던 것을 503 `redis_down` 으로 바꿨다(`rate()`).

## 4. API 요청·응답 모양 (통합 담당 `api.js` 용)

경로는 모두 `/api/zzoom` 아래. 본문은 JSON(녹음만 소리 그대로). 오류는 항상 `{error: 코드, message: 한국어, ...추가}`.
- 헤더 `X-Auth-Token`: 백암이 세션(`localStorage.airoom_auth_token`).
- 헤더 `X-Zzoom-Pt`: 참가 자격(`sessionStorage` 에 둔 `pt`).

**참가 자격이 필요한 모든 경로의 공통 오류**: 401 `pt_required`·`pt_invalid`·`pt_expired`(다시 `/join`), 403 `pt_other_meeting`, 404 `not_found`(삭제된 회의), 410 `meeting_gone`(deleting·10일 지남), 403 `host_only`·`host_revoked`(host 경로), 409 `state_<ready|live|ended>`(허용표 D-4), 429 `rate_limited`(자격당 초당 5회, 선·채팅 1초 1회), 503 `redis_down`·`not_configured`.

| 메서드·경로 | 헤더 | 본문 | 성공 응답 | 주요 오류 |
|---|---|---|---|---|
| `GET /health` | 없음 | | 200 `{ok, firebase, redis}` | |
| `GET /meetings` | Auth | | 200 `{meetings:[{id,title,startsAt,status,agendaCount,expiresAt,daysLeft,allowRecording,hostLocked?(관리자만)}], isAdmin}` startsAt 내림차순. 만료 회의는 관리자에게만 `status:'deleting'` 으로 보임 | 401 `login_required` |
| `POST /meetings` | Auth(admin) | `{title(≤80), startsAt(ms 또는 날짜 문자열), hostCode:'6자리', allowRecording?=true}` | 201 `{meeting: 목록 항목 모양}` | 403 `admin_only`, 400 `bad_title`·`bad_startsAt`·`bad_code` |
| `PATCH /meetings/:mid` | Auth(admin) | `{title?, startsAt?, allowRecording?, hostCode?}` | 200 `{meeting, codeChanged}` | 404, 410 |
| `DELETE /meetings/:mid` | Auth(admin) | | 200 `{deleted:true, queued:false}` 또는 `{deleted:false, queued:true}`(남은 것은 cron) | 404 |
| `POST /meetings/:mid/unlock` | Auth(admin) | | 200 `{ok:true}` 주관 코드 시도 장부 전부 풀기 | |
| `POST /:mid/join` | Auth | `{name(≤20)}` | 200 `{pt, cid, name, role:'viewer'|'host'(관리자), exp, until, token(맞춤 토큰), meeting}` | 401, 400 `bad_name`, 410, 429(IP 분당 20회) |
| `POST /:mid/host` | Pt | `{code:'6자리'}` | 200 join 과 같은 모양(**새 pt**, 옛 pt 폐기). 이미 host 면 새 pt 만 | 403 `wrong_code` `{left}`, 429 `too_many_attempts`, 423 `host_locked`, 503 `redis_down`·`no_code` |
| `POST /:mid/refresh` | Pt | | 200 `{token, role, cid, name, exp, until, meeting}` 코드가 바뀐 host 는 여기서 viewer 로 내려감 | |
| `POST /:mid/state` | Pt(host) | `{action:'start'|'end'|'penLock'|'recording', value?}` | 200 `{meeting}` start 는 presenter 가 없으면 부른 사람이 진행자, `live` 를 첫 안건 1쪽으로. end 는 녹음 멈춤 + 열린 투표 닫기 | 409 `state_*`, 403 `recording_off`, 400 `bad_action` |
| `POST /:mid/presenter` | Pt(host) | | 200 `{presenter:{cid,name,epoch}, live}` epoch+1 | |
| `POST /:mid/live` | Pt(host, 진행자) | `{aid, page, view:{cx,cy,z}, baseRev, epoch, force?}` | 200 `{live:{aid,page,view,rev,epoch,forceSeq,at}}` view 는 0~1, z 1~6 으로 clamp | 409 `not_presenter`·`stale_rev` `{live, presenter}`(최신으로 맞출 것), 400 `bad_aid`·`bad_page`·`bad_rev` |
| `POST /:mid/uploads` | Pt(host) | `{kind:'pdf'|'image'|'hwp'|'hwpx'|'pptx', pages(1~60), bytes(<50MB), ext?(image 일 때 png·jpg·jpeg·webp)}` | 201 `{uploadId, path:'zzoom/<mid>/up/<uploadId>/', files:{pages:['p001.webp'…], thumbs:['t001.webp'…], original:'original.<ext>'}, limits:{pageBytes:4MB, thumbBytes:512KB, originalBytes}, expiresAt}` | 400 `bad_kind`·`bad_pages`·`bad_ext`, 413 `too_large`, 409 `agenda_full`(30개) |
| `POST /:mid/uploads/:uploadId/commit` | Pt(host) | `{title, pages, sizes:[[w,h]…] 또는 [{w,h}…](각 ≤2000), originalName?}` | 201 `{aid, agenda}` 재시도면 200 `{aid, agenda, already:true}`. 원본은 선택(올렸으면 크기 일치 필수) | 404 `upload_unknown`, 400 `pages_mismatch`·`bad_sizes`, 422 `upload_invalid`(빠진 파일·webp 아님·크기 초과·허가 밖 파일) |
| `PATCH /:mid/agenda/:aid` | Pt(host) | `{title?, index?}` | 200 `{agendaOrder, agenda}` | 404 |
| `DELETE /:mid/agenda/:aid` | Pt(host) | | 200 `{ok:true}` | 409 `agenda_live` |
| `POST /:mid/boards` | Pt(host) | `{bg?:'white'|'grid'|'lines'}` 또는 `{action:'addPage', aid}` | 만들기 201 `{aid, agenda, live}`(진행자가 띄우면 진행도 이동) / 쪽 추가 200 `{aid, pages}` | 409 `board_full`·`agenda_full` |
| `POST /:mid/strokes` | Pt | `{pageKey:'<aid>_<n>', epoch, tool:'pen'|'hl', color, w, pts:[x,y,p,…], group?, part?}` 또는 `{strokes:[위 모양 최대 20개]}` | 201 `{strokes:[{id, seq, pageKey}], at}` 서버가 `at`·`seq`(쪽별)·`cid`·`name` 부여 | 400 `bad_tool`·`bad_color`·`bad_width`·`bad_pts`·`bad_epoch`·`bad_group`·`bad_part`·`bad_pageKey`, 409 `stale_epoch` `{pageKey, epoch}`·`stroke_limit`, 403 `pen_locked` |
| `DELETE /:mid/strokes/:sid` | Pt | | 200 `{ok:true}` 내 선만(host 는 모두) | 403 `not_owner`·`pen_locked`, 404 |
| `POST /:mid/pages/:pageKey/clear` | Pt(host) | | 200 `{pageKey, epoch}` | 400 `bad_pageKey` |
| `POST /:mid/chat` | Pt | `{text(1~500), ref?:{aid, page}}` | 201 `{id, at}` id 는 시간 순으로 정렬됨 | 400 `bad_text`·`bad_ref` |
| `DELETE /:mid/chat/:id` | Pt | | 200 `{ok:true}` 본인·host | 403 `not_owner` |
| `POST /:mid/hand` | Pt | `{up:true|false}` / host: `{up:false, cid}`·`{all:true}` | 200 `{up}` / `{up:false, cid}` / `{lowered:n}` | 403 `host_only`, 400 `bad_hand` |
| `POST /:mid/heartbeat` | Pt 또는 본문 `{pt}`(sendBeacon) | `{leaving?}` | 200 `{ok:true, counts:{people,hands,peak,at}|null}` | |
| `POST /:mid/polls` | Pt(host) | `{q(≤200), options?(2~6, 기본 찬성·반대·보류), anonymous?=true}` | 201 `{pid, poll}` 선택지 id 는 `o1…` | 400 `bad_question`·`bad_options`, 409 `poll_open` |
| `POST /:mid/polls/:pid/vote` | Pt | `{optionId}` | 200 `{ok, optionId, changed}` | 400 `bad_option`, 409 `poll_closed` |
| `GET /:mid/polls/:pid/mine` | Pt | | 200 `{optionId|null}` 내 것만 | |
| `GET /:mid/polls/:pid/tally` | Pt(host) | | 200 `{status:'open'|'closed', tally:{o1:n…}, total}` 개인 선택 없음 | |
| `POST /:mid/polls/:pid/close` | Pt(host) | | 200 `{status:'closed'}` | |
| `POST /:mid/polls/:pid/reveal` | Pt(host) | | 200 `{poll}` 마감도 같이. Firestore 에 tally(공개 투표면 names) 기록 | |
| `POST /:mid/transcribe?n=조각번호&at=시작ms&aid=&page=` | Pt(host) | 소리 그대로, `Content-Type: audio/webm|ogg|mp4|mpeg|wav` (≤3MB) | 201 `{id:'t0000n', n, text}` 같은 n 재전송은 덮어씀 | 415 `bad_audio`, 413, 400 `bad_n`·`empty_audio`, 403 `recording_off`, 429 `groq_busy`, 502 `groq_failed`, 503 `no_groq` |
| `GET /:mid/export.md` | Pt(host) | | 200 `text/markdown`, `Content-Disposition` 에 `쭘_<제목>_<날짜>.md` | |
| `GET`·`POST /maintenance/purge` | `Authorization: Bearer <CRON_SECRET>` | | 200 `{expired, meetingsDone, meetingsLeft, uploads, oldStrokes, timedOut}` | 401 `bad_cron_secret`, 503 `no_cron_secret` |

맞춤 토큰 claim: uid `zz_<cid>`, `{zz:1, mid, role:'viewer'|'host', until:<회의 만료 ms 숫자>}` (R 팀 규칙과 맞음). 토큰 수명은 1시간이라 브라우저는 그 전에 `/refresh` 를 불러야 한다.

## 5. 정한 것 (묻지 않고 안전한 쪽으로)

- 투표·손 상태 허용: 손·투표·녹음·진행은 `live` 에서만, `ready` 에서는 안건·판서·채팅·상태·진행권만(D-4). 투표 원표는 Redis 해시 `zz:vote:<mid>:<pid>` 에만 있고, 집계 응답에도 개인 선택을 넣지 않았다.
- 코드로 받은 host 는 코드가 바뀌면 그 요청부터 viewer 로 취급(`host_revoked`), `/refresh` 때 자격 자체를 viewer 로 내린다.
- heartbeat(K2): 요청이 `counts.at` 30초 지난 것을 보면 people(90초 안)·hands 를 세고 트랜잭션 안에서 다시 확인해 한 요청만 쓴다.
- 업로드 commit: 쪽·썸네일 webp 필수, 원본은 선택(올렸다면 크기 일치와 형식 확인), 허가 밖 파일이 있으면 거절.
- `DELETE /meetings/:mid` 는 그 자리에서 20초까지 정리하고 남으면 대기열. Storage 가 실패하면 500 을 주지만 이미 `deleting` 이라 접근은 막힌다.
- Storage 버킷은 env `FIREBASE_STORAGE_BUCKET`(기존 변수), 없으면 `<project>.appspot.com`.

## 6. 남은 일

- `gcp.js` 는 실제 Google API 로 한 번도 돌려 보지 않았다. 서비스 계정 키를 받으면 Preview 에서 만들기·입장·업로드 commit·삭제를 실제로 확인해야 한다(특히 트랜잭션 재시도와 `runQuery` 결과 모양).
- 새 Firebase 프로젝트의 기본 버킷은 `<project>.firebasestorage.app` 일 수 있다. Vercel 의 `FIREBASE_STORAGE_BUCKET` 값이 맞는지 확인 필요.
- 참가 자격 키 `zz:pt:<hash>` 는 회의 삭제 때 지우지 않는다(회의 문서가 없으면 404 로 막히고 12시간 안에 저절로 사라짐).
- Groq Whisper 무료 한도(K6)는 확인하지 못했다. 429 면 `groq_busy` 로 돌려주므로 브라우저가 대기열로 재시도해야 한다.
- E2E(브라우저 3창)는 화면이 생긴 뒤 통합 단계에서.

## 7. 요청

- **통합 담당(Claude)**: Vercel 환경변수 `FIREBASE_SERVICE_ACCOUNT`(서비스 계정 JSON 또는 base64), `CRON_SECRET` 이 있어야 한다. 없으면 `/api/zzoom/*` 가 503(health 만 200).
- **통합 담당**: `api.js` 에서 맞춤 토큰 1시간 만료 전 `/refresh`, `/host` 성공 뒤 새 `pt` 로 바꿔 저장, 409 `stale_rev`·`not_presenter` 응답의 `live` 로 화면 맞추기, `stale_epoch` 응답의 `epoch` 로 쪽 다시 그리기.
- **통합 담당**: `server.js` 의 `/api/firebase-token` 줄(lib/storage-token)은 내 변경이 아니다. 내 변경은 1절의 세 곳뿐이다.
- **R 팀**: Storage 업로드 규칙이 `p001.webp`·`t001.webp`(image/webp)와 `original.<ext>` 를 받게 돼 있는지 맞춰 보기. 서버는 원본 형식으로 `application/pdf|octet-stream|vnd.*|haansoft*|x-hwp|image/(png|jpeg|webp)` 를 받는다(`application/x-hwp` 가 규칙에 없으면 그 원본은 업로드 단계에서 막힘).
