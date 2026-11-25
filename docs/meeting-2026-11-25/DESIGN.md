# 쭘(ZZOOM) 설계서 v2

작성 2026-11-25 · 브랜치 `feat/meeting` · v1 감사(`AUDIT_REPORT.md`, 치명 3·중요 22) 반영 + 사용자 결정(`DECISIONS.md`) + 위임 판단(`DECISION_ANSWERS.md`) 반영.
각 절 끝의 `[감사 n]` 은 그 절이 해결하는 감사 지적 번호다.

## 0. 목표와 범위

같은 교실에 모인 교직원이 각자 기기로 안건 파일을 함께 보며 회의한다. 목소리는 직접 말하고, 쭘은 화면을 맞추고 판서·채팅·손들기·투표·녹음 기록을 모은다.

| 넣는 것 | 이번에 넣지 않는 것 |
|---|---|
| 회의·주관 코드, 안건 미리 올리기(PDF·이미지·HWP·HWPX·PPTX) | 음성·영상 송출(화상회의) |
| 진행자 따라가기, 펜 모드 판서(형광펜·펜·지우개), 화이트보드 | `/copy` 시연본, `/hub` 학교 공간, GitHub Pages 미러 [감사 1·24] |
| 채팅, 손들기, 찬반 투표 | 화자 구분 |
| 녹음 → 대화 기록(Groq Whisper), AI용 md 내보내기 | 구형 `.ppt` 자동 변환(PPTX·PDF 저장 안내) [감사 21] |
| 첫 열쇠 발급 + 10일 뒤 회의 기록 전부 삭제 | |

이름: 화면·카드 모두 「쭘」, 주소 `/zzoom`. 로고·아이콘은 코덱스 이미지 생성(PNG→WebP), SVG 금지.

---

## 1. 핵심 구조 (v1에서 바뀐 점)

```
브라우저 ──(읽기만)──> Firestore  zzoom_meetings/{mid}/...      맞춤 토큰 claim 검사
        ──(읽기만)──> Storage    zzoom/{mid}/...                 맞춤 토큰 claim 검사
        ──(쓰기 전부)─> 서버 /api/zzoom/*  ──firebase-admin──> Firestore·Storage
                                          └─ Redis: 코드 해시·참가 자격·원표·시도 장부·삭제 작업
        ──(직접 업로드)─> Storage zzoom/{mid}/up/{uploadId}/...   (host claim + 업로드 허가 경로만)
```

- **쓰기는 모두 서버가 한다.** 서버가 참가 자격·역할·회의 상태·진행권·크기 제한을 검사한 뒤 firebase-admin으로 쓴다. Firestore 규칙은 「쓰기 전부 거절」로 단순해진다. [감사 6·7·13·16]
- **원표는 Firestore에 두지 않는다.** Redis에만 두고, 서버가 집계 문서만 Firestore에 쓴다. [감사 3]
- **기준 저장소는 Firestore 하나.** 회의 정보·상태·안건·진행은 Firestore, Redis에는 비밀(코드 해시·참가 자격·원표·장부·작업 커서)만. 목록 API도 Firestore에서 읽는다. [감사 11]
- **무거운 파일만 브라우저가 Storage로 직접 올린다**(Vercel 요청 크기 한도 회피). 서버가 발급한 업로드 경로에만 쓸 수 있고, 서버가 확인한 뒤에야 안건으로 공개된다. [감사 12]

---

## 파트 A. 인증과 권한 (엔진팀 S — 서버)

### A-1. 역할

| 기능 | 관리자 | 주관자 | 참석자 |
|---|:-:|:-:|:-:|
| 회의 만들기·삭제, 주관 코드 정하기·바꾸기 | ○ | | |
| 안건 올리기·순서·지우기, 화이트보드 띄우기 | ○ | ○ | |
| 진행(쪽 넘기기)·회의 시작·끝내기 | 진행자 1명 | 진행자 1명 | |
| 투표 열기·닫기·결과 보이기, 손 내리기, 판서 잠금, 쪽 지우기, 녹음, AI용 md | ○ | ○ | |
| 입장, 따라가기·자유 보기, 펜 모드 판서, 채팅, 손들기, 투표 | ○ | ○ | ○ |

- 관리자(백암이 admin 세션)는 주관 코드 없이 host 자격을 받는다. [감사 24]
- **진행자는 한 번에 한 명**(`presenterCid` + `presenterEpoch`). 다른 주관자는 「진행 넘겨받기」로 epoch를 올려 가져간다. [감사 13]

### A-2. 참가 자격 (탭 단위)
1. `/zzoom` 은 백암이 토큰(`localStorage.airoom_auth_token`)으로 `POST /api/zzoom/:mid/join {name}` 을 부른다. 토큰이 없으면 「백암이에서 먼저 로그인」 + `/` 링크.
2. 서버가 탭마다 **참가 자격**을 만든다: `pt`(32바이트 난수), `cid`(서버가 만든 id). Redis `zz:pt:<sha256(pt)>` = `{mid, cid, name, role, grantVer, exp}`. 브라우저는 `sessionStorage` 에 둔다(탭마다 독립, 새로고침은 유지). [감사 5]
3. 서버가 Firebase 맞춤 토큰을 같이 준다: uid=`zz_<cid>`, claims `{zz:1, mid, role:'viewer'|'host', until}`. `until` = 그 회의 만료 시각(아래 A-4). 브라우저는 회의 전용 Firebase 앱(`'zzoom'`)을 `inMemoryPersistence` 로 열어 `signInWithCustomToken`. 다른 탭·다른 회의와 인증이 섞이지 않는다. [감사 5]
4. 쓰기 요청은 모두 헤더 `X-Zzoom-Pt` 를 보낸다. 서버는 해시로 찾아 mid·역할·`grantVer`·`exp`·회의 상태를 확인한다. **cid는 클라이언트가 정하지 못한다.**
5. 이름은 「함께 만드는 문서」 명부(`codocs_members`, 없으면 직접 입력)에서 고르고 `localStorage.airoom_ws_name` 공유. 학교 공용 코드라 실명 인증이 아님을 화면에 적지 않되, 투표 카드에 「한 탭 한 표, 의견 확인용」 표시. [감사 5]

### A-3. 주관 코드
- **숫자 6자리**. PBKDF2 `{hash, salt}` 를 Redis `zz:code:<mid>` 에 보관. 응답에 절대 포함하지 않는다. [감사 10·11]
- 시도 장부는 **별도**: `zz:try:<mid>:<ip>` 와 `zz:try:<mid>:<cid>` 를 Redis `INCR`+`EXPIRE` 로 원자 증가. 참가 자격 5회·회의당 IP 20회 실패 → 1시간 잠금, **회의 전체 50회 실패면 주관 입장 잠금**(관리자가 목록에서 풀기). 일반 로그인 성공으로 초기화하지 않는다. Redis 장애면 host 발급 거절. [감사 10]
- 코드 바꾸기 → `grantVer` 증가 → 기존 host 자격은 다음 쓰기부터 거절(즉시). Firebase 읽기는 claim 만 보므로 이미 받은 viewer 토큰은 `until` 까지 읽기가 남는다. 이는 같은 학교 교직원의 읽기이고, 회의 삭제는 정리 작업이 즉시 실제 데이터를 지우므로 읽을 것이 남지 않는다(파트 H). (default) DB 접근 제어 문서 방식은 비용·DB 이전 대비 이득이 작아 쓰지 않는다. [감사 4·8]

### A-4. 10일 만료
- `firstKeyAt`: 그 회의에서 처음 참가 자격을 발급한 시각(서버시각, Firestore 회의 문서에 기록). 발급 전이면 `createdAt`.
- `expiresAt = (firstKeyAt || createdAt) + 10일`. 이 시각이 지나면 ① 서버는 모든 발급·쓰기를 거절 ② 규칙은 `request.time < claim.until` 로 읽기를 막는다 ③ 정리 작업이 물리 삭제(파트 H). **접근 차단은 정리 작업 성공과 무관하게 바로 일어난다.** [감사 23]
- 참가 자격 `exp` = min(발급 + 12시간, expiresAt). 12시간 지나면 다시 입장(백암이 세션 재확인).

### A-5. `/copy`·미러 차단 [감사 1·24]
- `COPY_BLOCKED` 에 `/^\/api\/zzoom(\/|$)/` 추가 + 라우터 첫 미들웨어에서 `req.isCopy` 면 403. 시험으로 운영 저장소 호출 0회 확인.
- GitHub Pages 미러·`/hub` 에서는 「a-iroom.vercel.app/zzoom 에서 열어 주세요」 안내만. URL에 토큰을 넣지 않는다.

### A-6. 서버 API (`lib/zzoom/routes.js`, `server.js` 에 `/api/zzoom` 로 mount)

| 메서드·경로 | 권한 | 하는 일 |
|---|---|---|
| `GET /meetings` | 백암이 로그인 | 목록(제목·일시·상태·안건 수·D-n). Firestore 읽기 |
| `POST /meetings` | admin | 만들기 `{title, startsAt, hostCode, allowRecording}` |
| `PATCH /meetings/:mid` | admin | 제목·일시·주관 코드 |
| `DELETE /meetings/:mid` | admin | 즉시 `deleting` + 그 자리에서 정리 작업 실행(남으면 대기열) |
| `POST /:mid/join` | 백암이 로그인 | 참가 자격 + 맞춤 토큰(viewer, admin이면 host) |
| `POST /:mid/host` | 참가 자격 + 주관 코드 | host로 승격(새 자격·새 토큰) |
| `POST /:mid/refresh` | 참가 자격 | 맞춤 토큰 재발급(재연결) |
| `POST /:mid/state` | host | 시작·끝내기·판서 잠금 |
| `POST /:mid/live` | 진행자 | 진행 상태(파트 D) |
| `POST /:mid/presenter` | host | 진행 넘겨받기 |
| `POST /:mid/uploads` | host | 업로드 허가 `{kind, pages, bytes}` → `uploadId`, 경로 |
| `POST /:mid/uploads/:uploadId/commit` | host | 서버가 Storage 객체 확인 후 안건 공개 |
| `PATCH /:mid/agenda/:aid` / `DELETE` | host | 제목·순서 / 지우기(진행 중 안건은 거절) |
| `POST /:mid/boards` | host | 화이트보드 만들기·쪽 추가 |
| `POST /:mid/strokes` / `DELETE /:mid/strokes/:sid` | 참가자 | 선 저장 / 내 선 지우기(host는 모두) |
| `POST /:mid/pages/:pageKey/clear` | host | 쪽 지우기(epoch 증가) |
| `POST /:mid/chat` / `DELETE /:mid/chat/:id` | 참가자 | 채팅 / 지우기(본인·host) |
| `POST /:mid/hand` | 참가자 | 손 올리기·내리기(host는 남의 손 내리기·모두 내리기) |
| `POST /:mid/heartbeat` | 참가자 | 접속 표시(60초) |
| `POST /:mid/polls` / `POST /:mid/polls/:pid/{close,reveal}` | host | 투표 |
| `POST /:mid/polls/:pid/vote` | 참가자 | 한 표(바꾸기 가능) |
| `POST /:mid/transcribe` | host | 녹음 조각(≤3MB) → Groq Whisper → 대화 기록 |
| `GET /:mid/export.md` | host | AI용 md |
| `GET /maintenance/purge` | `Authorization: Bearer CRON_SECRET` | 정리 작업(파트 H) |

모든 쓰기는 회의 상태 허용표(파트 D-4)를 먼저 확인한다. 요청 속도 제한: 참가 자격당 초당 5회(선·채팅은 따로 1초 1회).

---

## 파트 B. 데이터와 보안 규칙 (엔진팀 R — 규칙)

### B-1. Firestore (DB `kwon`, 컬렉션 접두 `zzoom_`)

| 경로 | 내용 | 누가 씀 |
|---|---|---|
| `zzoom_meetings/{mid}` | `{title, startsAt, status, createdAt, firstKeyAt, expiresAt, endedAt, agendaOrder:[aid], live, presenter:{cid,name,epoch}, penLock, pollId, recording, counts:{people, hands}}` | 서버 |
| `.../agenda/{aid}` | `{title, kind:'pdf'|'image'|'hwp'|'hwpx'|'pptx'|'board', pages, sizes:[[w,h]], bg?, ver, original?:{path,name,bytes}, createdBy}` | 서버 |
| `.../pages/{pageKey}` | `{epoch}` (pageKey=`<aid>_<n>`) | 서버 |
| `.../strokes/{sid}` | `{pageKey, epoch, tool, color, w, pts:[...], cid, name, at, seq}` | 서버 |
| `.../hands/{cid}` | `{name, at}` (손 든 사람만 문서가 있음) | 서버 |
| `.../people/{cid}` | `{name, role, seenAt}` | 서버(주관자만 구독) |
| `.../chat/{id}` | `{cid, name, text, ref?:{aid,page}, at}` | 서버 |
| `.../polls/{pid}` | `{q, options:[{id,label}], anonymous, status, revealed, tally:{id:n}, total, names?:{id:[이름]}}` | 서버 |
| `.../transcript/{n}` | `{at, text, aid, page}` | 서버 |

- 참석자는 `people` 를 구독하지 않는다. 접속자 수·손 수는 서버가 `counts` 에 30초 묶어서 쓴다. [감사 22]
- 비공개 투표: 개인별 선택은 **주관자·관리자도 못 본다**(서버만 앎, md 내보내기에도 숫자만). `tally` 는 `revealed` 전에는 서버가 쓰지 않는다(주관자는 `GET` 으로 숫자만). 공개 투표는 만들 때 「결과 보이기 때 이름이 공개됩니다」를 표시하고, 결과 보이기 때 `names` 를 쓴다. [감사 3]

### B-2. Firestore 규칙 (회의 부분)
```
match /zzoom_meetings/{mid} {
  function ok() { return request.auth != null && request.auth.token.zz == 1
                  && request.auth.token.mid == mid && request.time.toMillis() < request.auth.token.until; }
  function host() { return ok() && request.auth.token.role == 'host'; }
  allow get: if ok();
  allow list, write: if false;
  match /{sub}/{id} {
    allow read: if ok() && (sub != 'people' || host());
    allow write: if false;
  }
}
```
### B-3. Storage 규칙 (`zzoom/` 부분)
```
match /zzoom/{mid}/{rest=**} {
  allow read: if (같은 ok());
  allow write: if false;
}
match /zzoom/{mid}/up/{uploadId}/{file} {
  allow create: if host() && request.resource.size < 52428800
                && request.resource.contentType.matches('image/webp|application/pdf|application/octet-stream|application/vnd.*|application/haansoft.*|image/(png|jpeg)');
}
```
- 화면은 `getBlob()` → object URL 로만 그린다. `getDownloadURL()`(영구 공유 주소)은 쓰지 않는다. 버킷 CORS 설정 필요. [감사 8]
- Storage 규칙은 Firestore `kwon` 을 읽을 수 없으므로 claim 만 본다. [감사 8]

### B-4. 규칙 게시 절차 [감사 9]
1. 사용자가 콘솔에서 지금 운영 중인 Firestore(`kwon`)·Storage 규칙 전체를 복사해 준다(구현 0단계).
2. 기존 규칙 + 회의 부분을 합친 **전체본**을 `firestore.rules`·`storage.rules` 에 두고, 겹치는 넓은 `allow` 가 `zzoom_`·`zzoom/` 에 닿지 않는지 확인한다. 기존 codocs·급식 규칙은 그대로.
3. 에뮬레이터에서 기존 동작 + 회의 규칙 시험 → 사용자가 게시. 게시 전 규칙은 `docs/meeting-2026-11-25/rules-backup/` 에 날짜별로 남긴다.
4. codocs 의 규칙 도움말(`showRulesHelp`)이 옛 전체본을 다시 게시하게 만들지 않도록, 그 도움말이 읽는 `firestore.rules` 에 회의 부분이 들어 있는지 확인한다.

### B-5. Redis 키
`zz:code:<mid>`(해시), `zz:pt:<hash>`(참가 자격), `zz:try:*`(시도 장부), `zz:vote:<mid>:<pid>`(hash cid→선택), `zz:up:<uploadId>`(업로드 허가, 24시간), `zz:purge`(정리 대기열·커서), `zz:rl:*`(속도 제한).

---

## 파트 C. 변환 엔진 (엔진팀 C — 변환)

주관자 브라우저가 파일을 쪽마다 WebP로 바꾼다. 참석자는 그림만 받는다.

### C-1. 출력과 한도
`convert(file, {onProgress, signal}) → {kind, pages:[{blob, w, h}], thumbs:[blob], warnings:[]}`
- 긴 변 **2000px**, WebP 0.85. 썸네일 긴 변 320px. 쪽 수 60, 원본 50MB, 쪽당 픽셀 2000×2000, 전체 처리 3분 상한. [감사 20]
- **한 쪽씩 순서대로** 그리고 곧바로 WebP로 바꾼 뒤 canvas·ImageBitmap을 해제한다. 원해상도 쪽을 동시에 두 장 이상 메모리에 두지 않는다. 미리보기는 썸네일만. [감사 20]
- 취소(`signal`)하면 Worker를 바로 끝낸다.

### C-2. 형식별

| 형식 | 엔진(고정 버전) | 경로 |
|---|---|---|
| PDF | `pdfjs-dist` 정확한 버전 고정(본체·worker 같은 버전) | `page.render` → OffscreenCanvas(Worker) |
| 이미지 | 브라우저 | `createImageBitmap` → 축소. HEIC는 안내 |
| HWP·HWPX | `@rhwp/core@0.9.1` | 0단계 실험으로 경로 확정(C-3) |
| PPTX | `@office-kit/pptx` + `@office-kit/pptx-preview`(호환 버전 쌍 고정) | `loadPresentation(bytes)` → `getSlides()` → SVG(`textLayout:'svg'`) → 래스터. foreignObject·외부 리소스 확인 [감사 18] |
| PPT | 없음 | 「PowerPoint에서 PPTX나 PDF로 저장해 올려 주세요」 |

### C-3. rhwp 경로 (0단계 실험으로 확정) [감사 17·19]
- `renderPageToCanvas` 는 `HtmlCanvasElement` 를 받는다. Worker에서는 못 쓴다고 보고 세 경로를 실험한다.
  1. Worker: `FontFace` 로드 → `self.fonts.add` → OffscreenCanvas `measureText` 로 `globalThis.measureTextWidth` → `renderPageSvg(n)` → 메인 스레드에서 SVG 래스터화
  2. 메인 스레드: `renderPageToCanvas` 한 쪽씩 + 쪽 사이 `await` 양보(진행률 표시)
  3. 메인 스레드: `renderPageSvg` → `Image` → canvas
- 기준(쪽 수 일치·글자 잘림·표·그림 누락·시간·메모리)을 통과한 경로만 쓴다.
- WASM 배포원: npm 0.9.1 의 JS·WASM 쌍을 jsDelivr·unpkg 에서 각각 받아 크기·해시·Content-Type·CORS·학교망 속도를 재서 정한다. 둘 다 안 되면 Firebase Storage `zzoom-vendor/` (공개 읽기, 쓰기 금지)에 해시 고정본.
- 글꼴: 웹폰트 라이선스를 확인한다. 함초롬체 재배포가 불확실하면 Noto Serif KR·Noto Sans KR(OFL)로 대체하고 `measureTextWidth` 가 같은 글꼴을 쓰게 한다. 글꼴 로드 실패는 변환 실패로 다룬다(조용히 넘어가지 않음).

### C-4. 0단계 변환 실험 문서 (로컬 전용, 업로드·커밋 금지)
HWP 2(재난대피훈련 계획, 활동지 업데이트 설계서), HWPX 3(재난대피훈련 계획, 35~36차시 교재, 결과보고서(사진)), PPTX 2(바이브코딩 심화연수, 웜봇) + 경계 문서(60쪽 넘는 PDF, 손상 파일, 암호 HWP). 한/글·PowerPoint에서 뽑은 PDF와 나란히 비교해 `convert-check.md` 에 표로.

### C-5. 업로드 흐름 [감사 12]
1. 변환 → 썸네일 미리보기 → 「이대로 올리기」
2. `POST /uploads` → `uploadId`, 경로 `zzoom/{mid}/up/{uploadId}/`
3. 브라우저가 `p001.webp…`, `t001.webp…`, `original.<ext>` 를 직접 업로드(동시 3개, 실패 쪽만 재시도)
4. `POST /uploads/:uploadId/commit {title, pages, sizes}` → 서버가 객체 수·크기·형식 확인 → `agenda/{aid}` 문서 생성 + `agendaOrder` 에 추가(트랜잭션). 확인 실패면 거절.
5. commit 안 된 업로드는 24시간 뒤 정리.
- 안건 교체는 새 안건으로 올리고 옛 것을 지운다(옛 판서는 옮기지 않음). 진행 중 안건은 지울 수 없다.

---

## 파트 D. 진행 따라가기 (디자인팀 2 + 엔진팀 S)

### D-1. 진행 상태
`live: {aid, page, view:{cx, cy, z}, rev, epoch, forceSeq, at}`
- `cx, cy` = 쪽 비율(0~1) 기준 화면 중심, `z` = 「쪽 맞춤」 대비 배율(1~6). 기기마다 비율에 맞춰 clamp. [감사 14]
- 진행자는 300ms 묶어 `POST /live {aid, page, view, baseRev, epoch}`. 서버는 트랜잭션으로 `epoch` 가 현재와 같고 `baseRev == rev` 일 때만 반영하고 `rev+1`. 아니면 409 + 최신 상태(진행자 화면은 최신으로 맞춤). [감사 13]
- 진행권을 잃거나 회의가 끝나면 묶음 타이머를 버린다.

### D-2. 따라가기·자유 보기
- 기본 따라가기. 참석자가 직접 넘기거나 확대하면 자유 보기 + 「진행자 화면으로 돌아가기 (안건3 5쪽)」 띠.
- 「모두 내 화면으로」 = `forceSeq+1`. 참석자는 `lastForceSeq` 보다 클 때만 한 번 따라간다. 늦게 들어오거나 재접속하면 최신 `live` 로 시작하고 옛 force는 재생하지 않는다. [감사 14]
- 쪽 그림을 받는 중 새 상태가 오면 이전 렌더를 취소(요청 번호 비교). 현재 쪽과 다음 쪽만 미리 받는다. [감사 14·22]

### D-3. 접속 표시 [감사 15]
- 탭마다 60초 `POST /heartbeat`(서버는 `seenAt` 만 갱신). 탭이 다시 보이면(`visibilitychange`) 바로 한 번.
- 90초 넘게 없으면 주관자 화면에 「연결 확인 중」, 5분이면 「나감」. 창 닫을 때 `sendBeacon` 으로 나감(최선 노력).

### D-4. 회의 상태와 허용표 [감사 7]

| 상태 | 안건 올리기 | 진행·판서·채팅·손·투표 | 읽기 |
|---|:-:|:-:|:-:|
| `ready` | ○ | 판서·채팅만(미리 의견) | ○ |
| `live` | ○ | ○ | ○ |
| `ended` | | | ○(다시 보기) |
| `deleting`·만료 | | | |

끝내기는 서버가 열린 투표를 함께 닫고 녹음을 멈춘다. 다시 열기 없음.

---

## 파트 E. 판서와 화이트보드 (디자인팀 3 + 엔진팀 S)

- **보기 모드**(기본): 한 손가락·마우스 끌기 = 이동, 두 손가락·휠 = 확대. 그려지지 않는다.
- **✏️ 펜 모드**: 형광펜(노랑·연두·분홍, 반투명, 굵게), 펜(빨강·파랑·검정), 지우개(내 선). 펜 모드에서도 두 손가락은 이동·확대. 기기별, 쪽 넘겨도 유지. host가 「판서 잠금」 켜면 host만.
- **획 엔진: perfect-freehand 1.2.3**(MIT, 의존성 없는 ES 모듈, steveruizok/perfect-freehand). `getStroke(points, options)` 가 입력 점을 부드러운 외곽선 다각형으로 바꿔 주고, 이것을 `Path2D` 로 **한 번에 채워** 그린다.
  - 파일은 CDN 대신 `public/zzoom/vendor/perfect-freehand-1.2.3.mjs` 로 넣는다(학교망에서 CDN이 막혀도 판서가 되게). 맨 위에 MIT 저작권 고지를 그대로 둔다.
  - **저장하는 것은 외곽선이 아니라 입력 점**이다: `pts:[x,y,p, x,y,p, …]`(x·y는 쪽 비율 0~1 소수 넷째 자리, p는 필압 0~1 소수 둘째 자리). 외곽선은 받는 쪽이 매번 계산한다. 그래야 데이터가 작고, 기기 크기와 확대 배율이 달라도 같은 모양이 나온다.
  - 도구 설정은 문서에 숫자로 넣지 않고 **프리셋 이름**(`tool:'pen'|'hl'`)과 `w`(쪽 너비 비율 굵기)만 저장한다. 프리셋표는 `draw.js` 한 곳에 둔다.

    | 프리셋 | size(px) = w × 쪽 너비 | thinning | smoothing | streamline | 그리기 |
    |---|---|---|---|---|---|
    | `pen` | w 기본 0.004 | 0.5 | 0.5 | 0.5 | 불투명 채움 |
    | `hl` 형광펜 | w 기본 0.018 | 0(굵기 일정) | 0.5 | 0.6 | `globalAlpha 0.35` + `multiply` 로 한 획을 한 번에 채움(획 안에서 겹쳐 진해지지 않음) |

  - 필압: `pointerType==='pen'` 이면 `e.pressure` 를 쓰고 `simulatePressure:false`, 마우스·손가락이면 `p=0.5` 로 두고 `simulatePressure:true`. `getCoalescedEvents()` 로 빠른 획의 점을 놓치지 않는다.
  - 내 화면 그리기와 남의 선 그리기는 **같은 함수** `renderStroke(ctx, stroke, pageW, pageH)` 하나로 한다(모양이 어긋나지 않게).
  - 그리는 중에는 맨 위 「임시 canvas」에만 매 프레임(rAF) 다시 그리고, 손을 떼면 쪽 canvas에 굳힌다. 남의 선이 오면 쪽 canvas에 `seq` 순서로 더 그린다. 쪽을 다시 그릴 때는 바탕 그림 → 선 순서대로 다시 그린다.
  - 지우개(내 선): 외곽선이 아니라 입력 점까지의 거리로 맞힌다(손가락 굵기 고려 반경 12px).
- 선 1개 = `strokes` 문서 1개. 획을 시작할 때 `pageKey`·`epoch` 를 고정(획 중 쪽이 바뀌어도 원래 쪽에 저장). 점 간격 1px 미만은 건너뛰고, 최대 1,500점(넘으면 `group`·`part` 로 나눔). 화면 DPR·확대를 역변환해 저장. [감사 16]
- 그리는 동안은 내 화면에만, 손 떼면 `POST /strokes {pageKey, epoch, tool, color, w, pts, group?, part?}`. 서버가 `at`(서버시각)·`seq`(쪽별 증가) 부여, `pts` 길이가 3의 배수이고 4,500개 이하인지, 값이 범위 안인지, `tool` 이 프리셋인지, `color` 가 DESIGN_BRIEF 판서 색 6개 중 하나인지 검사. 그리는 순서는 `seq` 순. [감사 16]
- 쪽 지우기 = `pages/{pageKey}.epoch+1`. 화면은 현재 epoch 선만 그린다. 서버는 옛 epoch 선 저장을 거절하고 옛 선은 정리 작업이 지운다. [감사 16]
- 쪽당 선 2,000개·회의당 2만 개 상한.
- **화이트보드**: host 「화이트보드 띄우기」 → `agenda` 에 `kind:'board'`, `bg:'white'|'grid'|'lines'`, 그림 파일 없이 화면이 바탕을 그림(크기 1600×1000 비율). 「+ 새 쪽」으로 쪽 추가. 띄우면 진행도 그 판으로 이동.

---

## 파트 F. 채팅·손들기·투표 (디자인팀 4 + 엔진팀 S)

### F-1. 채팅
- 오른쪽 접이식 칸, 안 읽은 수. 500자, 참가 자격당 1초 1글. 처음 들어오면 최근 200개.
- 「지금 쪽 붙이기」 → `ref:{aid,page}` → 누르면 그 쪽으로(자유 보기).
- 지우기: 본인·host. `ended` 뒤 쓰기 잠금.

### F-2. 손들기 [감사 15]
- `POST /hand {up}` → 서버가 `hands/{cid}` 를 만들거나 지움(`at` 서버시각). 정렬: `at`, 같으면 `cid`.
- host 화면: 손 든 순서, 「내리기」, 「모두 내리기」(서버가 그 시각 이전 손만 지움).

### F-3. 투표 [감사 3]
- host가 질문 + 선택지(기본 찬성·반대·보류, 최대 6) + 공개/비공개. 기본 **비공개**, 결과 **숨김**.
- 한 표: `POST /vote {optionId}` → 서버가 Redis `zz:vote` 에서 이전 선택 차감·새 선택 증가(Lua 한 번), 마감 여부 확인.
- 집계: host는 `GET /polls/:pid/tally` 로 실시간 숫자. 참석자는 「결과 보이기」 뒤 서버가 `tally`(공개 투표면 `names` 포함) 를 Firestore에 쓸 때 본다.
- 투표 카드에 「한 탭 한 표, 의견 확인용」.

---

## 파트 G. 녹음과 AI용 md (디자인팀 5 + 엔진팀 S)

### G-1. 녹음
- 관리자가 회의를 만들 때 「녹음 허용」 칸(**기본 켬**, 끄면 ⏺ 버튼이 안 보임). host 화면에만 ⏺. 처음 시작 때 「참석자에게 녹음을 알렸나요?」 확인. 모두에게 「● 녹음 중」(`recording:true`).
- `MediaRecorder`(webm/opus, 사파리는 mp4) 60초 조각 → `POST /transcribe`(multipart, ≤3MB) → 서버가 Groq `whisper-large-v3`(language ko) → `transcript/{n}` `{at, text, aid, page}`(조각 시작 때의 진행 위치).
- 소리 파일은 서버에 저장하지 않는다(메모리에서 바로 전송 후 버림). 실패 조각은 브라우저가 3회 재시도, 그래도 실패면 「n번째 1분 기록 실패」 표시.
- 화면 안내: 「학생 개인정보는 말하지 마세요. 소리는 글로 바꾸려고 외부 서비스(Groq)로 보냅니다.」

### G-2. AI용 md (`GET /export.md`, host·admin)
```
# <회의 제목> (<YYYY-MM-DD HH:mm>)
## 회의 정보    진행 시간, 참석 인원(최대 동시 접속)
## 안건         1. 제목 (n쪽) …
## 대화 기록    [15:12 · 안건2 5쪽] …(시간 순)
## 채팅         [15:14] 이름: …
## 투표 결과    질문 / 찬성 n · 반대 n · 보류 n (공개 투표면 이름)
## AI에게 부탁할 일 (예시)
```
서버가 누를 때마다 만들고 저장하지 않는다. 파일명 `쭘_<제목>_<날짜>.md`.

---

## 파트 H. 정리·삭제·비용 (엔진팀 S)

### H-1. 정리 작업 [감사 23]
- 대상: `expiresAt` 지난 회의, `DELETE` 한 회의, commit 안 된 24시간 지난 업로드, 옛 epoch 선.
- 순서: ① 회의 `status:'deleting'`(새 쓰기 거절) ② Storage `zzoom/{mid}/` 를 페이지 단위로 삭제 ③ 하위 컬렉션 9종을 500개씩 삭제 ④ Redis `zz:*:<mid>` 삭제 ⑤ 회의 문서 삭제. 커서를 `zz:purge` 에 저장해 다음 실행이 이어서 한다. 한 번 실행 50초 상한.
- vercel cron 하루 1번(UTC 18:00, `GET` + Bearer `CRON_SECRET`, 비밀 없으면 거절). 관리자가 목록을 열 때도 기한 지난 회의를 한 번 더 확인해 대기열에 넣는다. Preview에서는 cron이 안 돌므로 수동 호출로 시험.

### H-2. 비용 (교직원 30명, 1시간, 안건 4개 40쪽 — 추정)
- Firestore 읽기: 진행 300회×30명 ≈ 9,000, 선·채팅·손 ≈ 6,000, counts 120×30 ≈ 3,600, 초기 ≈ 3,000 → **약 2만 회**. 쓰기 ≈ 3,000(heartbeat는 Firestore `people` 1,800 포함).
- Storage: 쪽 그림 40×200KB=8MB + 썸네일 + 원본(최대 4×50MB). 전송 ≈ 30×8MB=240MB + 원본 요청분.
- Vercel 호출 ≈ 4,000/시간(heartbeat 1,800 + 쓰기). Upstash 명령 ≈ 2만.
- **2026-02-03부터 Storage는 Blaze 요금제 필요**, `kwon`(이름 붙은 DB)의 무료 한도 적용은 불확실 → 0단계에서 사용자에게 결제 상태 확인, 예산 알림 설정 권고. 첫 시범 회의 뒤 콘솔 수치로 다시 잰다. [감사 22]

---

## 파트 I. 화면 (디자인팀 1~5, 공통은 Claude)

파일 소유(같은 파일을 두 팀이 고치지 않는다):

| 소유 | 파일 |
|---|---|
| Claude(통합) | `public/zzoom/index.html`, `app.js`(조립·라우팅), `zzoom.css`(토큰·공통), `api.js`(서버·Firebase 연결) |
| 엔진팀 C | `public/zzoom/convert/*` |
| 디자인 1 — 목록·입장·브랜드 | `list.js`, `join.js`, `list.css`, `assets/`(코덱스 이미지 생성) |
| 디자인 2 — 보기·따라가기 | `viewer.js`, `viewer.css` |
| 디자인 3 — 판서·화이트보드 | `draw.js`, `board.js`, `draw.css`, `vendor/perfect-freehand-1.2.3.mjs` |
| 디자인 4 — 채팅·손·투표 | `chat.js`, `hands.js`, `poll.js`, `side.css` |
| 디자인 5 — 주관자·업로드·녹음·md | `host.js`, `upload.js`, `record.js`, `host.css` |

- 모듈 사이 약속은 `docs/meeting-2026-11-25/CONTRACTS.md`(엔진 단계에서 Claude가 작성: `api.js` 함수, 상태 이벤트, DOM 자리 id, CSS 변수).
- 디자인 기준은 레포 `DESIGN.md`(Apple 계열) + `docs/meeting-2026-11-25/DESIGN_BRIEF.md`(쭘 색·글꼴·간격·아이콘 크기).
- 기기: 크롬·엣지(PC), 아이패드 사파리, 갤럭시탭 크롬. Pointer Events. 화면 폭 768px 미만이면 옆칸은 아래 서랍.
- 메인 바로가기 카드: 두 SPA(`index.html`, `public/index.html`) 모두. `/copy`·`/posting` 에서는 숨김. vercel.json rewrite 추가 금지, `/zzoom` 은 server.js 라우트로(`/recruitment` 와 같은 방식). [감사 24]

---

## 파트 J. 시험 (각 팀 + Claude) [감사 25]

| 영역 | 실패·경계 상황 | 도구 |
|---|---|---|
| API 격리 | 비로그인·`/api/copy/zzoom`·viewer의 host 요청·다른 회의 자격·만료 자격 | `node --test tests/zzoom/api.test.js`(메모리 Redis + firebase-admin 가짜) |
| 주관 코드 | 잠금·원자 증가·코드 변경 뒤 옛 host 거절 | 같음 |
| 규칙 | claim 없음·다른 mid·만료 until·people 읽기(viewer)·모든 쓰기 거절·기존 codocs 동작 | Firebase 에뮬레이터 + `@firebase/rules-unit-testing` (`tests/zzoom/rules.test.js`) |
| 투표 | 원표 비노출, 바꾸기·마감 동시, 숨긴 결과 | api.test |
| 진행 | 진행자 2명, 넘겨받기, 역순 응답, 끊긴 뒤 옛 쓰기, forceSeq | api.test + E2E |
| 판서 | 지우기 중 획, 획 중 쪽 이동, 확대·DPR·회전 | 단위(좌표) + E2E |
| 업로드 | 중간 실패·취소·새로고침·commit 위조 | api.test + E2E |
| 변환 | C-4 문서 + 경계 문서, 글꼴 없음, CDN 차단 | 로컬 Playwright + 눈 확인, `convert-check.md` |
| 삭제 | 중복 실행·중간 실패·만료 직후 접근 | api.test |
| 화면 E2E | 독립 BrowserContext 3개(주관자 1·참석자 2): 입장·따라가기·자유 보기 복귀·판서·화이트보드·채팅·손·투표·끝내기 잠금 | Python Playwright `tests/zzoom/e2e.py` |
| 실기 | Preview에서 PC 1 + 태블릿 1, 녹음 1분 | 확인 URL 보고 |

`package.json` 에 `test:zzoom` 추가. 시험 결과·라이브러리 버전·브라우저 버전을 `docs/meeting-2026-11-25/TEST_LOG.md` 에.

---

## 구현 단계

| 단계 | 누가 | 내용 | 끝 기준 |
|---|---|---|---|
| 0 | Claude + 사용자 | 운영 규칙 전체본·결제 상태·서비스 계정 키(사용자) 확보 | 자료 확보 |
| 1 엔진 | 팀 S·R·C **병렬** | S: `lib/zzoom/*` 서버·Redis·firebase-admin·정리 작업·녹음 / R: 규칙 전체본·에뮬레이터 시험 / C: 변환 실험 → `convert/*` | 각 팀 시험 통과, `convert-check.md` |
| 1.5 | Claude | `api.js`·`CONTRACTS.md`·`DESIGN_BRIEF.md`·`index.html`·`app.js`·`zzoom.css` 뼈대 | 빈 화면 조립 |
| 2 디자인 | 팀 1~5 **병렬** | 파트 I 소유 파일 | 팀별 화면 + 단위 시험 |
| 3 | Claude | 통합, E2E 3창 | E2E 통과 |
| 4 | 아스트라 | 구현 감사 | 보고서 |
| 5 | Claude | 감사 반영, Preview 실기 확인 | 확인 URL |
| 6 | 사용자 | 규칙 게시·운영 배포 승인 | |

에이전트 배정: 엔진 S·R·C와 디자인 1~5는 서브에이전트(단순 구현은 sonnet, 설계 판단이 섞인 S·R은 opus), 에셋 이미지는 코덱스. 서브에이전트 공통 금지: 소유 파일 밖 수정, 커밋·푸시, `hwp.quit()`, 실제 학교 문서 업로드.

---

## 파트 K. Opus 독립 감사 (v2, 2026-11-25)

아스트라 2차 판단 10건 가운데 4(읽기 즉시 회수)·9(코드 강도)·10(녹음 기본값)은 위 본문처럼 Claude가 다르게 정했다. 이유는 각 절에 적었다. 아래는 v2 자체에 대한 감사와 반영.

| # | 심각도 | 위치 | 문제 | 반영 |
|---|---|---|---|---|
| K1 | 중요 | 1·A-6 | `firebase-admin` 은 설치 크기가 커서 Vercel 함수 한도(250MB)·콜드 스타트를 압박할 수 있다(미측정). | 1단계에서 `npm i firebase-admin` 뒤 함수 크기를 잰다. 넘치면 서비스 계정 JWT로 맞춤 토큰을 직접 서명하고 Firestore·Storage REST를 쓰는 가벼운 `lib/zzoom/gcp.js` 로 바꾼다(`lib/recruitment/google-auth.js` 참고). |
| K2 | 중요 | D-3·B-1 | 서버리스라 「30초마다 counts 쓰기」를 돌릴 타이머가 없다. | heartbeat 처리 중 `counts.at` 이 30초 넘었으면 그 요청이 `people` 를 세어 갱신(트랜잭션으로 한 요청만). |
| K3 | 중요 | A-2 | 「탭 복제」는 `sessionStorage` 를 복사해 두 탭이 같은 참가 자격을 쓴다. | 탭마다 `BroadcastChannel` 로 같은 `cid` 가 이미 살아 있으면 새 탭은 `/join` 을 다시 부른다. |
| K4 | 중요 | B-3 | `getBlob()` 은 버킷 CORS 설정이 없으면 실패한다. 이 설정은 콘솔이 아니라 `gsutil`/`gcloud` 로 한다. | 0단계 사용자 작업에 넣는다(명령을 Claude가 준비). |
| K5 | 중요 | E | 선 저장이 서버를 거치므로 콜드 스타트 때 1~2초 늦을 수 있다. | 내 화면에는 바로 그리고(낙관적 표시), 저장 실패 때만 흐리게 + 다시 보내기. 같은 이유로 채팅도 낙관적 표시. |
| K6 | 사소 | G-1 | Groq Whisper 무료 한도(분당·일일 오디오 초)는 확인하지 않았다. | 1단계에서 실제 한도를 확인하고, 막히면 조각을 대기열에 두고 순서대로 재시도. 기존 `GROQ_API_KEY_2~4` 순회 재사용. |
| K7 | 사소 | I | `/zzoom`(슬래시 없음)은 `public/zzoom/` 디렉터리 때문에 static이 301로 넘긴다. | `/recruitment` 처럼 static 앞에 `app.get(['/zzoom','/zzoom/'])` 를 둔다. |
| K8 | 사소 | J | Firebase 에뮬레이터는 Java가 필요하다(이 PC 미확인). | 없으면 규칙 시험은 Preview용 별도 Firebase 프로젝트가 아니라 에뮬레이터 설치(사용자 확인 뒤)로. 우선 규칙 문법 검사만이라도 1단계에 넣는다. |

**판정: 이대로 진행.** 0단계 사용자 자료(서비스 계정 키, 운영 규칙 전체본, 결제 상태, 버킷 CORS)는 1단계 코드 작업과 동시에 받는다. 코드와 단위 시험은 가짜 Firebase로 먼저 만든다.
