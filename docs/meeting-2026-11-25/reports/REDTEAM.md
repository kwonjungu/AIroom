판정: **서버 API는 주요 공격을 모두 막았다(123건 가운데 막힘 108). 뚫림 10건 중 쭘 쪽 높음 1건(회수한 주관자의 맞춤 토큰이 10일 동안 살아 있음), 중간 2건, 낮음 4건이다. 나머지 2건은 쭘 밖의 기존 Firestore 공개 규칙이다.**

# 쭘 레드팀 보고 (RT)

- 소유 파일: `tests/zzoom/redteam.test.js`(새로 만듦), 이 보고서. 다른 파일은 고치지 않았다.
- 대상: `lib/zzoom/routes.js`(21:31 판), `storage.rules`(21:13), `firestore.rules`(20:47), `server.js`의 `/api/firebase-token`·카피본 경로, `public/zzoom/*.js`(화면은 정적 점검만).
- 실제 Firebase·Redis·Groq·Vercel에는 요청하지 않았다. API는 가짜 fb·Redis와 실제 `createRouter`로 돌렸다. `server.js`는 Redis 없이(`VERCEL=1`), 즉석에서 만든 가짜 서비스 계정 키로 로컬에 띄웠다. 이때 `data/settings.json`은 숨기고 기본 코드 1234로 들어갔으며, 프로젝트 폴더 쓰기는 막아 두었다.
- 규칙은 Firebase Rules **시험 API**(`projects/airoom-ebce3:test`)로만 돌렸다. 게시는 하지 않았다.

## 시험 명령과 결과

```
RT_RULES=1 node --test tests/zzoom/redteam.test.js      # 규칙 시험 API 포함
node --test tests/zzoom/redteam.test.js                 # 규칙 빼고(기본, 네트워크 없음)
```

| 회차 | 시각 | 대상 판 | node:test 결과 | 공격 행 |
|---|---|---|---|---|
| 1차 | 21:50 | routes 21:31, storage.rules 21:13, firestore.rules 20:47 | tests 17, pass 11, fail 0, todo 6, skipped 0 | 123건(막힘 108, 뚫림 10, 참고 5) |
| 2차(최신 작업 트리) | 21:51 | 위와 같음(서버·규칙 파일은 그 사이 바뀌지 않음. 화면 js만 바뀜) | tests 17, pass 11, fail 0, todo 6, skipped 0 | 123건(막힘 108, 뚫림 10, 참고 5), 판정 1차와 같음 |

- 지금 뚫리는 것은 `{ todo }` 하위 시험으로 걸어 두었다. 그래서 실패해도 전체 결과는 깨지지 않고, 고치면 통과로 바뀐다(todo 6개 = 아래 뚫림 가운데 API에서 재현한 6건).
- 규칙 쪽 뚫림은 표에 적었다. 시험 단정에서는 "알려진 뚫림"(회수 토큰, vnd, 기존 공개 규칙)만 뺐다.
- 수정 전후 비교: 이 작업을 하는 동안 `lib/zzoom/*`과 두 규칙 파일이 바뀌지 않아 두 회차 결과가 같다. 다른 팀이 고친 뒤에는 같은 명령을 다시 돌리면 된다.

## 뚫림 (재현 단계)

| # | 공격 | 대상 | 기대 | 실제 | 심각도 |
|---|---|---|---|---|---|
| 1 | 주관 코드가 바뀐 뒤에도 이미 받은 host 맞춤 토큰 사용 | `issue()`·`/refresh`의 `until`, storage.rules `zzHost` | 회수 즉시, 늦어도 1시간 안에 끊김 | 토큰 claim `until` = 회의 만료(시험에서 남은 10.0일). 규칙 시험에서 `role:host, until:+9일` 토큰의 `create zzoom/<mid>/up/u9/p001.webp`가 **ALLOW** | 높음 |
| 2 | 로그인한 교직원 아무나 틀린 코드 50번으로 주관 입장 잠그기 | `POST /:mid/host` | 진짜 주관자는 입장 | 재입장으로 cid를 바꾸고 X-Forwarded-For로 IP를 바꿔 50번 넘김. 그 뒤 맞는 코드도 **423 host_locked** | 중간 |
| 3 | 한 사람이 다시 입장해 여러 표 | `POST /:mid/join` + `vote` | 1표 | 같은 사람이 재입장 5번에 5표가 인정됨(o2=5) | 중간 |
| 4 | 같은 회의의 다른 주관자 uploadId를 commit | `POST /:mid/uploads/:id/commit` | 허가받은 사람만 | 201 | 낮음 |
| 5 | 한 사람이 100초 동안 쪽 상한(2,000선)을 채움 | `POST /:mid/strokes` | 다른 사람 판서 가능 | 공격 2,000선, 피해자는 409 stroke_limit | 낮음 |
| 6 | 재입장 10번으로 "1초 1글" 우회 | `POST /:mid/chat` | 사람당 1초 1글 | 1초에 10글 | 낮음 |
| 7 | 주관자가 `application/vnd.wap.xhtml+xml` 파일 업로드 | storage.rules `contentType` | 거절 | ALLOW. `original.<ext>`로 commit하면 서버 `ORIGINAL_TYPES`(`application/vnd\..+`)도 통과한다. 화면은 `download` 속성으로 받기만 해서 지금은 실행되지 않는다 | 낮음 |
| 8 | 쭘 토큰으로 기존 앱 `codocs_sheets` 읽기 | firestore.rules(기존) | - | ALLOW(`read: if true`) | 높음(기존, 쭘 밖) |
| 9 | 비로그인으로 `bap_journals` 읽기 | firestore.rules(기존) | - | ALLOW(`read: if true`) | 높음(기존, 쭘 밖) |
| 10 | (1번과 같은 원인) 회수 토큰 유효기간 행 | createCustomToken | ≤1시간 | 10일 | (1에 포함) |

재현 단계 요약:
- **1번**: 주관자 A가 코드로 입장해 host 토큰을 받는다. 관리자가 `PATCH /meetings/:mid {hostCode}`로 코드를 바꾼다. API에서는 A의 pt가 `403 host_revoked`로 막힌다(막힘 확인). 하지만 A의 브라우저가 이미 `signInWithCustomToken`으로 받은 Firebase 세션에는 `role:host`, `until: 회의 만료` claim이 남아 있다. Firebase ID 토큰은 새로 고쳐도 맞춤 claim을 유지하므로, A는 회의가 끝날 때까지 Storage `zzoom/<mid>/up/<아무 id>/<파일>`에 create를 할 수 있다. 다만 commit은 서버가 막으므로 안건에는 오르지 않고, 50MB 미만 파일을 버킷에 쌓는 것만 된다.
- **2번**: `join`을 되풀이해 새 cid를 받고(cid당 5번), XFF를 바꿔 IP 장부(20/시간)를 우회한다. 회의 장부 50번에서 잠기는데, 잠금은 공격자와 진짜 주관자를 가리지 않는다. 관리자 해제(`/meetings/:mid/unlock`)와 관리자 입장(바로 host)으로만 풀린다. 대입 성공 확률 자체는 회의당 50/10^6 = 0.005%로 막혀 있다.
- **3번**: 공유 접근 코드라 사람 구분이 없고, cid는 "입장 1회"를 뜻한다. 그래서 같은 사람이 재입장하면 새 표가 생긴다.

## 결과 표 (2차 실행 그대로, 123행)

표 생성: `RT_TABLE_OUT=<파일> node --test tests/zzoom/redteam.test.js`

| 공격 | 대상 | 기대 | 실제 | 판정 | 심각도 |
|---|---|---|---|---|---|
| pt 위조(임의 43자) | GET /:mid/polls/:pid/mine | 401 | 401 pt_invalid | 막힘 | - |
| pt 101자(길이 초과) | POST /:mid/chat | 401 | 401 pt_required | 막힘 | - |
| 다른 회의 pt | POST /:mid/chat | 403 | 403 pt_other_meeting | 막힘 | - |
| host 승격 전 옛 pt 재사용 | POST /:mid/chat | 401 | 401 pt_invalid | 막힘 | - |
| host 회수(코드 변경) 뒤 옛 host pt로 주관자 동작 | POST /:mid/boards | 403 host_revoked | 403 host_revoked | 막힘 | - |
| host 회수 뒤 옛 host pt로 남의 채팅 지우기 | DELETE /:mid/chat/:id | 403 | 403 not_owner | 막힘 | - |
| host 회수 뒤 /refresh로 host 토큰 재발급 | POST /:mid/refresh | viewer 토큰 | 200 role=viewer | 막힘 | - |
| host 회수 뒤에도 이미 받은 host 맞춤 토큰 유효기간 | createCustomToken claim until | 짧게(≤1시간) | until = 회의 만료(남은 10.0일) | 뚫림 | 높음 |
| 만료 pt(12시간 뒤) | POST /:mid/chat | 401 | 401 pt_invalid | 막힘 | - |
| 남의 선 지우기 | DELETE /:mid/strokes/:sid | 403 | 403 not_owner | 막힘 | - |
| cid 바꿔치기(본문 cid=피해자, 나감 표시) | POST /:mid/heartbeat | 피해자 문서 그대로 | 200, 피해자 left=undefined | 막힘 | - |
| 남의 채팅 지우기 | DELETE /:mid/chat/:id | 403 | 403 not_owner | 막힘 | - |
| 이름 20자 XSS(`<svg/onload=alert()>`) | join, people·chat 문서 | 저장 거절 또는 화면 textContent | 원문 그대로 저장됨 | 참고 | - |
| 채팅 줄바꿈으로 md 제목 주입 | GET /:mid/export.md | "## 투표 결과" 1줄 | 1줄 | 막힘 | - |
| 채팅 HTML이 md에 그대로 | GET /:mid/export.md | 이스케이프(선택) | HTML 원문 포함(md는 스크립트 실행 안 함) | 참고 | - |
| 화면 innerHTML에 이름·글을 이스케이프 없이 넣는 줄 | public/zzoom js 13개 | 0줄 | 0줄 | 막힘 | - |
| 같은 cid로 6번 틀리기 | POST /:mid/host | 6번째 429 | 403,403,403,403,403,429 | 막힘 | - |
| 같은 cid 동시 30번(시도 횟수 우회) | POST /:mid/host | 틀림 판정 ≤5 | 403×5, 429×25 | 막힘 | - |
| 재입장+XFF로 cid·IP 장부 우회 | POST /:mid/host | 회의 장부 50번에서 423 | IP 장부 우회 39회, 423 at≈51 | 막힘 | - |
| 회의당 대입 성공 확률 | 주관 코드 6자리 | ≤ 50/10^6 | 0.005% | 참고 | - |
| 로그인한 아무나 50번 틀려 주관 입장 잠그기(DoS) | POST /:mid/host | 진짜 주관자는 입장 | 423 host_locked | 뚫림 | 중간 |
| 코드 변경과 옛 코드 입장 동시(경쟁) | PATCH /meetings/:mid + POST /host | 변경 뒤 옛 코드 자격으로 주관 동작 0 | 옛 코드 입장 6건 중 주관 동작 0 | 막힘 | - |
| 참석자가 업로드 허가 받기 | POST /:mid/uploads | 403 | 403 host_only | 막힘 | - |
| 다른 회의 uploadId를 내 회의에 commit | POST .../commit | 404 | 404 upload_unknown | 막힘 | - |
| 같은 회의 다른 주관자의 uploadId commit | POST .../commit | 403 | 201 | 뚫림 | 낮음 |
| 경로 탈출 uploadId=`../../m2` | POST .../commit | 404 | 404 | 막힘 | - |
| 경로 탈출 uploadId=`..` | POST .../commit | 404 | 404 | 막힘 | - |
| 경로 탈출 uploadId=`u../x1234` | POST .../commit | 404 | 404 | 막힘 | - |
| uploadId 31자 | POST .../commit | 404 | 404 | 막힘 | - |
| 쪽 그림 형식 위조(text/html) | POST .../commit | 422 | 422 upload_invalid | 막힘 | - |
| 쪽 그림 크기 위조(5MB) | POST .../commit | 422 | 422 | 막힘 | - |
| 원본 크기 위조(허가 100B, 실제 40MB) | POST .../commit | 422 | 422 | 막힘 | - |
| 허가 밖 파일 끼워 넣기(evil.html) | POST .../commit | 422 | 422 | 막힘 | - |
| commit 때 쪽 수 부풀리기 | POST .../commit | 400 | 400 pages_mismatch | 막힘 | - |
| 같은 uploadId 동시 두 번 commit | POST .../commit | 안건 1개 | 201,200, 안건 1개 | 막힘 | - |
| 끝난 회의에 업로드 허가 | POST /:mid/uploads | 409 | 409 state_ended | 막힘 | - |
| 남의 선택 엿보기(mine + 남 cid 헤더) | GET .../mine | 내 선택(null)만 | 200 optionId=null | 막힘 | - |
| 참석자가 실시간 집계 보기 | GET .../tally | 403 | 403 host_only | 막힘 | - |
| 비공개 투표 공개 뒤 polls 문서에 이름·cid | Firestore polls/{pid} | 없음 | 없음(names=null) | 막힘 | - |
| 비공개 투표 이름이 AI용 md에 | GET /:mid/export.md | 없음 | 없음 | 막힘 | - |
| 응답 차이로 남의 표 추론 | POST .../vote | 같은 모양·값 | 둘 다 {changed,ok,optionId}, changed=true | 막힘 | - |
| 한 사람이 재입장 5번, 5표 더 | join + vote | 1표만 | 추가 5표 인정 | 뚫림 | 중간 |
| 같은 cid 동시 20표(선택 번갈아) | POST .../vote | 합계 1 | 합계 1 | 막힘 | - |
| 마감 뒤 투표 | POST .../vote | 409 | 409 poll_closed | 막힘 | - |
| 선 21개 한 번에 | POST /:mid/strokes | 400 | 400 bad_strokes | 막힘 | - |
| 점 4,503개 선 | POST /:mid/strokes | 400 | 400 bad_pts | 막힘 | - |
| 색 값 주입 | POST /:mid/strokes | 400 | 400 bad_color | 막힘 | - |
| 같은 1초에 판서 두 번 | POST /:mid/strokes | 둘째 429 | 429,429 | 막힘 | - |
| 동시 15명×5선으로 쪽 상한 넘기기(남은 자리 10) | POST /:mid/strokes | ≤2,000 | 추가 10, 장부 2000 | 막힘 | - |
| 한 사람이 100초 동안 쪽 상한 채우기 | POST /:mid/strokes | 다른 사람 판서 가능 | 공격 2000선, 피해자 409 | 뚫림 | 낮음 |
| 판서 잠금 중 참석자 판서 | POST /:mid/strokes | 403 | 403 pen_locked | 막힘 | - |
| 판서 잠금 중 내 선 지우기 | DELETE .../strokes/:sid | 403 | 403 pen_locked | 막힘 | - |
| 참석자가 판서 잠금 풀기 | POST /:mid/state | 403 | 403 host_only | 막힘 | - |
| 채팅 501자 | POST /:mid/chat | 400 | 400 bad_text | 막힘 | - |
| 같은 1초에 채팅 3개 | POST /:mid/chat | 1개만 201 | 201,429,429 | 막힘 | - |
| 재입장 10번으로 1초 1글 우회 | POST /:mid/chat | 사람당 1초 1글 | 1초에 10글 | 뚫림 | 낮음 |
| 끝난 회의에 채팅 | POST /:mid/chat | 409 | 409 state_ended | 막힘 | - |
| 끝난 회의에 판서 | POST /:mid/strokes | 409 | 409 | 막힘 | - |
| 끝난 회의에 손들기 | POST /:mid/hand | 409 | 409 | 막힘 | - |
| 끝난 회의에 화이트보드 | POST /:mid/boards | 409 | 409 | 막힘 | - |
| 끝난 회의에 채팅 지우기 | DELETE /:mid/chat/:id | 409 | 409 | 막힘 | - |
| 끝난 회의에 heartbeat(people 쓰기) | POST /:mid/heartbeat | 허용(접속 표시) | 200 | 참고 | - |
| purge 비밀 없음 | GET /maintenance/purge | 401 | 401 | 막힘 | - |
| purge 틀린 비밀(같은 길이) | 〃 | 401 | 401 | 막힘 | - |
| purge 틀린 비밀(다른 길이) | 〃 | 401 | 401 | 막힘 | - |
| purge `Bearer ` 없이 비밀만 | 〃 | 200 | 200 | 참고 | - |
| 카피본 경로로 purge | GET /api/copy/zzoom/maintenance/purge | 403 | 403 | 막힘 | - |
| CRON_SECRET 미설정 | GET /maintenance/purge | 503 | 503 | 막힘 | - |
| 비밀 앞자리·뒷자리 틀림 시간 차 | util.safeEqual | 차이 없음 | 318ns / 346ns(1차 측정) | 막힘 | - |
| 카피본 GET meetings / POST join / POST meetings / GET health | routes isCopy | 403 | 403 copy_blocked ×4 | 막힘 | - |
| 카피본 요청으로 맞춤 토큰 발급 횟수 | fb.createCustomToken | 0 | 0 | 막힘 | - |
| 비로그인 /api/firebase-token | server.js | 401 | 401 | 막힘 | - |
| 위조 세션 /api/firebase-token | server.js | 401 | 401 | 막힘 | - |
| 로그인 사용자 토큰 claim | GET /api/firebase-token | {ba:1}(zz 없음) | 200 {"ba":1} | 막힘 | - |
| 로그아웃한 세션으로 /api/firebase-token | server.js | 401 | 401 | 막힘 | - |
| 비로그인 /api/copy/firebase-token | server.js(카피본) | {cp:1}만 | 200 {"cp":1} | 막힘 | - |
| server.js 카피본 zzoom meetings / purge / join | COPY_BLOCKED | 403 | 403 ×3 | 막힘 | - |
| 쭘 viewer 토큰으로 기존 앱 Storage 읽기 | storage.rules | DENY | DENY | 막힘 | - |
| 쭘 host 토큰으로 기존 앱 Storage 쓰기 | storage.rules | DENY | DENY | 막힘 | - |
| 쭘 토큰으로 루트 파일 읽기 | storage.rules | DENY | DENY | 막힘 | - |
| ba 토큰으로 쭘 회의 파일 읽기 / 업로드 / vendor 읽기 | storage.rules | DENY | DENY ×3 | 막힘 | - |
| ba+zz 섞인 claim으로 vendor | storage.rules | DENY | DENY | 막힘 | - |
| cp 토큰으로 실서비스 읽기 / 쭘 읽기 | storage.rules | DENY | DENY ×2 | 막힘 | - |
| cp 토큰으로 copy/ 쓰기(설계상 허용) | storage.rules | ALLOW | ALLOW | 막힘 | - |
| 다른 회의 토큰으로 읽기 | storage.rules | DENY | DENY | 막힘 | - |
| until 1ms 전 읽기 | storage.rules | ALLOW | ALLOW | 막힘 | - |
| until 정각 읽기 | storage.rules | DENY | DENY | 막힘 | - |
| until 문자열 / until 없음 / zz=true(형 위조) | storage.rules | DENY | DENY ×3 | 막힘 | - |
| viewer 토큰으로 업로드 | storage.rules | DENY | DENY | 막힘 | - |
| host 토큰 업로드(허가 없는 uploadId도 됨) | storage.rules | ALLOW | ALLOW | 막힘(설계) | - |
| host 토큰 덮어쓰기 / 지우기 / up 밖 쓰기 | storage.rules | DENY | DENY ×3 | 막힘 | - |
| host 경로 탈출 `../../다른회의/` | storage.rules | DENY | DENY | 막힘 | - |
| host 인코딩 `%2F` 이름(같은 폴더 안의 한 낱말이라 commit이 거절) | storage.rules | ALLOW | ALLOW | 막힘 | - |
| host text/html, image/svg+xml 업로드 | storage.rules | DENY | DENY ×2 | 막힘 | - |
| host vnd.wap.xhtml+xml 업로드 | storage.rules | DENY | ALLOW | 뚫림 | 낮음 |
| host 50MB 업로드 | storage.rules | DENY | DENY | 막힘 | - |
| 회수된 주관자(host claim 남음, until 9일 뒤) 업로드 | storage.rules | DENY | ALLOW | 뚫림 | 높음 |
| 비로그인 쭘 읽기 | storage.rules | DENY | DENY | 막힘 | - |
| 쭘 토큰 같은 회의 문서 get | firestore.rules | ALLOW | ALLOW | 막힘 | - |
| 쭘 토큰 다른 회의 get / 회의 목록 list | firestore.rules | DENY | DENY ×2 | 막힘 | - |
| 쭘 viewer 접속자(people) 읽기 | firestore.rules | DENY | DENY | 막힘 | - |
| 쭘 host 채팅 쓰기 / 회의 문서 update(클라이언트 직접) | firestore.rules | DENY | DENY ×2 | 막힘 | - |
| 쭘 토큰 목록 밖 하위 컬렉션(votes) | firestore.rules | DENY | DENY | 막힘 | - |
| ba·cp 토큰 쭘 회의 get | firestore.rules | DENY | DENY ×2 | 막힘 | - |
| until 정각 get | firestore.rules | DENY | DENY | 막힘 | - |
| 쭘 토큰 기존 앱 codocs_sheets 읽기 | firestore.rules(기존) | DENY | ALLOW | 뚫림 | 높음(기존) |
| 비로그인 기존 앱 bap_journals 읽기 | firestore.rules(기존) | DENY | ALLOW | 뚫림 | 높음(기존) |

(같은 결과가 이어지는 행은 묶어서 적었다. 실행할 때 나오는 원래 표는 123행이다.)

## 확인한 것과 한계
- **XSS**: 서버는 이름과 채팅을 원문 그대로 저장한다(이름은 20자로 자르지만 `<svg/onload=alert()>`가 딱 20자라 그대로 들어간다). 화면 `public/zzoom/*.js`(21:45~21:50 판)는 모두 `h()`에서 `createTextNode`나 `textContent`로 넣는다. innerHTML은 `app.js` 2곳뿐인데 둘 다 고정 문자열이다. 그래서 지금은 막혀 있다. 화면이 아직 바뀌는 중이라 끝난 뒤 다시 봐야 한다.
- **md 내보내기**: `oneLine`이 줄바꿈을 접어서 제목 주입은 안 된다. HTML 원문은 남는데, md 뷰어가 HTML을 그리면 위험할 수 있다(낮음).
- **XFF**: 로컬은 `trust proxy: true`라서 `X-Forwarded-For`를 위조할 수 있다(IP 장부 우회 39회 성공). 실제 Vercel에서도 위조되는지는 확인하지 않았다(배포 요청 금지). 위조된다면 입장 속도 제한(IP 분당 20)과 주관 코드 IP 장부가 사실상 없는 셈이다. 그래도 회의 장부 50번은 남는다.
- **타이밍**: 비공개 투표의 `vote`와`mine` 응답은 남의 표에 따라 달라지는 분기가 없다(코드와 응답 모양으로 확인). 가짜 저장소라 응답 시간 측정은 의미가 없어 하지 않았다. cron 비밀은 `timingSafeEqual`을 써서 길이만 샌다.
- 규칙 시험 API는 사용자의 firebase-tools 로그인 토큰을 쓴다. `RT_RULES=1`이 없으면 skip한다.

## 고칠 방향 (코드는 고치지 않음)
1. **(높음) host 토큰 수명**: host 맞춤 토큰의 `until`을 `min(expiresAt, now+1시간)`으로 줄이고, 화면이 `/refresh`로 다시 받게 한다. 코드가 바뀌면 `/refresh`가 이미 viewer를 주므로 길어야 1시간 안에 끊긴다. viewer 토큰은 지금처럼 회의 만료까지 두어도 된다(읽기뿐). 이것만으로 막히지 않는 것도 있다. 이미 로그인한 Firebase 세션은 ID 토큰을 새로 고칠 때 claim이 유지되므로, `until` 자체를 짧게 하는 것이 핵심이다.
2. **(중간) 주관 잠금 DoS**: 회의 장부 잠금을 "틀린 사람만" 막도록 바꾼다. 예를 들어 50번을 넘으면 잠그되 관리자에게 알림을 보내거나, 장부 기준을 cid가 아니라 백암이 세션 토큰 해시로 센다. 지금은 세션이 공유 코드 하나라 구분이 어렵다. 최소한 화면에 "관리자 해제 필요"를 크게 띄우고, 관리자 목록의 `hostLocked` 표시를 확인한다.
3. **(중간) 중복 투표**: 투표 원표 키를 cid 대신 "기기 id(X-Device-Id)+세션 토큰 해시"로 묶는다. 또는 `join` 때 같은 기기에 같은 cid를 다시 내준다(cid 재사용). 공유 코드 구조상 완전히 막을 수는 없다는 점을 설계서 F-3에 적어 둔다.
4. **(낮음) commit 소유자**: commit에서 `permit.cid === g.cid`를 확인한다.
5. **(낮음) 쪽 상한 독점과 채팅 도배**: 사람(pt 또는 cid)당 쪽별 상한(예: 300선)을 둔다. 속도 제한은 pt 단위에 더해 회의 단위 상한(예: 채팅 회의 전체 초당 10)을 둔다.
6. **(낮음) 원본 형식**: Storage와 서버의 `application/vnd.*`를 실제로 쓰는 것(`vnd.openxmlformats-officedocument.presentationml.presentation`, `vnd.hancom.*` 등)만 남기도록 좁힌다.
7. **(기존·쭘 밖) Firestore**: `bap_*`와`codocs_*`가 `read: if true`(쓰기도 대부분 열림)다. 쭘과 상관없이 누구나 읽고 쓸 수 있으니 ba 토큰 기반으로 잠그는 별도 작업이 필요하다.

## 요청
- 엔진 S(서버, `lib/zzoom/routes.js`): 위 1·2·3·4·5. 고친 뒤 `node --test tests/zzoom/redteam.test.js`를 돌리면 todo 6개 가운데 고친 것이 통과로 바뀐다.
- 엔진 R(규칙): 위 1(규칙 쪽에서는 짧은 `until` 전제 확인)과 6. 고친 뒤 `RT_RULES=1 node --test tests/zzoom/redteam.test.js`를 돌린다.
- 통합 담당: 실제 Vercel에서 `X-Forwarded-For` 위조가 되는지 미리보기 배포에서 한 번 확인해 달라(`/api/zzoom/:mid/join`을 같은 기기에서 XFF만 바꿔 21번 보내 429가 나는지).
- 화면 팀: 이름과 채팅은 지금처럼 `textContent`로만 넣는다. 「원본 받기」는 `download` 속성을 유지하고 blob URL을 새 탭에서 열지 않는다.
