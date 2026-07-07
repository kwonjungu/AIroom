# CLAUDE.md — AIroom 프로젝트 컨텍스트

## 이 파일의 용도
Claude Code 대화를 이어갈 때 빠르게 맥락을 잡기 위한 메모. 특히 진행 중인 **겨울방학 근무 현황 자동화** 기능에 관한 정보.

---

## 바이브코딩 (public/vibecoding.html) — 2026-07 개편

독립 페이지(SPA 아님, 단일 사본). 코드모스 스타일 스토리 학습으로 개편됨:
- **스토리 레이어**: 캐릭터(터틀=🐢 토토, 픽셀=🤖 픽셀), 챕터(행성)별 모험 지도(`openMissionSelector`), 미션별 스토리 인트로 모달, 챕터 내 순차 잠금(`isUnlocked`)
- **수학 UI**: LED 격자 좌표 라벨(`renderPixelGrid`), 목표 미니뷰 상시 표시(`renderTargetMini`), 실시간 일치율(`updateMatchMeter`), 터틀 목표 고스트 오버레이(`drawGhost`), 미션별 수학 돋보기(`TURTLE_STORY`/`PIXEL_STORY`의 `math`)
- **프롬프트 협력**: 프롬프트 예시 칩(`renderChips`), AI 생성 DSL 한국어 풀이(`glossLine`/`addCodeMsg`), 소크라테스식 시스템 프롬프트(TURTLE_PROMPT/PIXEL_PROMPT)
- **게임화**: 별 1~3개(`saveStars`, localStorage `turtle_stars`/`pixel_stars`), 누적 별(`updateStarTotal`), 색종이(`confetti`)
- 스토리/수학 텍스트는 미션 id 키의 `TURTLE_STORY`/`PIXEL_STORY`/`MAZE_STORY` 객체에서 관리 — 미션 추가 시 여기도 추가
- **미로 모험 모드** (3번째 모드, 2026-07): 탐정 토토가 격자 미로 이동, 순차·반복·선택 학습. `MAZE_MISSIONS` 12개(map ASCII, par 기반 별 채점), 엔진 전제: G 도착 즉시 성공/빈 칸 PICK no-op. 시뮬레이션 테스트: `node _check/maze-sim-test.js`
- **에셋**: `public/assets/vibe/` — 캐릭터 SVG 7종(토토4+픽셀3, 손제작), AI 생성 PNG/JPG 20종(행성10·배경4·UI4·터틀스프라이트, Nano Banana 배치). 원본은 `gen/`(gitignore). 후처리: `node _check/postprocess.js`
- **온보딩**: 첫 접속 시 토토 6장면 행동형 투어(`startTour`), localStorage `vibe_onboarded`
- **미로/스튜디오 모드** (3·4번째 모드): 미로=순차·반복·선택 12미션, 스튜디오=자유 게임 창작. 테스트 스위트 6종: `_check/{check-vibe,grader-test,maze-sim-test,studio-parse-test,turtle-closure-test,maze-parse-robust-test}.js` — vibecoding 수정 시 전부 실행할 것
- **학습 진도**: 학생 식별(localStorage `vibe_student`) + 서버 `vibe-progress` 컬렉션(PATCH /api/vibe-progress/items/:id 업서트), 타이틀 화면에 교사 뷰(CSV)
- **환경변수**: 필수 = UPSTASH_REDIS_REST_URL/TOKEN, GROQ_API_KEY(AI 채팅). 선택 = GROQ_API_KEY_2~4(폴백), DATA_GO_KR_KEY(날씨), FIREBASE_* 6종
- 남은 에셋 희망사항: 효과음(성공/별 획득), 음소거 토글

---

## 프로젝트 개요

- **이름**: AIroom (한글명 "백암이 — 아이들을 위한 교무실")
- **소속**: 백암초등학교 (교직원 18명 — 본교 13명 + 수정분교 5명, `defaults/staff.json`)
- **배포**: GitHub → Vercel 자동 배포 (`https://a-iroom.vercel.app/`)
- **기반 스택**: Express + Upstash Redis + 단일 `index.html` SPA (434KB) + 공유 접근 코드 인증
- **데이터 저장**: Redis(서버리스용) + 로컬 개발 시 `data/` 디렉토리 파일

### ⚠️ 메인 SPA는 두 곳에 있고 둘 다 수정해야 함

**`index.html`(루트, ~464KB)와 `public/index.html`(~673KB)은 별도 파일이지만 둘 다 메인 SPA**임. Production(`a-iroom.vercel.app`)은 `public/index.html`을 서빙함 (Express의 `app.use(express.static('public'))`가 루트 `/`보다 먼저 매치하기 때문). 새 탭/기능을 루트 `index.html`에만 추가하면 **production 화면에는 안 보임**.

**규칙**: SPA 변경 시 **반드시 두 파일 모두 수정**. 두 파일은 구조가 비슷하지만 다름 (`public/`이 더 크고 `pick()` fallback, `tdistDocs`, mobile auto-scroll 등 추가 코드를 가짐). DEFAULT_TABS·상태변수·Promise.all·switchPage·toggleAdmin·page HTML·CSS·함수 — 모두 양쪽 동일 적용. 비슷한 사고가 반복되어 추가됨. 이전 커밋도 같은 패턴 (`e44e056 fix(news): public/index.html에도 동일 수정 적용`).

마찬가지로 `defaults/*.json` 신규 파일은 `defaults-posting/*.json`에도 같이 만들어야 함 (데모 모드 `/posting`용). `server.js` `DATA_ROUTES`, `ARRAY_COLLECTIONS`, `POSTING_DATA` 세 곳에 등록 누락 주의.

### 핵심 파일 구조
```
AIroom/
├── server.js              # Express 서버 (인증 + CRUD + 파일 export)
├── index.html             # 메인 SPA (루트, ~464KB) — public/index.html과 동기화 필요!
├── public/
│   ├── index.html         # ★ Production이 실제로 서빙하는 SPA (~673KB)
│   └── ...                # 독립 페이지 (sign, doc, admin, vibecoding, bap)
├── defaults/              # 초기 데이터 JSON들 (staff, schedules, tabs, ...)
├── defaults-posting/      # /posting 데모용 익명화 사본 (defaults/와 같은 파일 구조 유지)
├── lib/                   # ★ 서버 사이드 모듈 (신규 추가)
│   ├── hwpx.js            # HWPX 문서 생성 엔진 (근무지외연수허가원)
│   ├── xlsx-export.js     # 관리자용 엑셀 export (색 포함)
│   └── docx-permit.js     # DOCX 폴백 (MS Word용)
├── templates/             # ★ HWPX 템플릿 (신규)
│   └── permit-template.hwpx
└── package.json           # 의존성: express, redis, jszip, exceljs, docx
```

### 새 데이터 컬렉션 추가할 때 (체크리스트)
1. `defaults/<name>.json` 생성
2. `defaults-posting/<name>.json` 생성 (익명/빈 데이터)
3. `server.js` **네 곳** 모두에 등록 — 하나라도 빠지면 production에서 묵묵히 실패:
   - `KV_KEYS` (line ~334) — **누락 시 PATCH가 success 반환하지만 Redis에 안 쓰여 데이터 사라짐** (Vercel은 파일도 안 씀). 이 버그를 한 번 겪었음, 절대 빠뜨리지 말 것.
   - `DATA_ROUTES` (line ~425) — GET/POST 자동 등록
   - `ARRAY_COLLECTIONS` (line ~507) — PATCH/DELETE per-item 라우트
   - `POSTING_DATA` (line ~1896) — /posting 데모 모드
4. 프런트는 두 SPA 파일(`index.html` + `public/index.html`) 모두에 동일 적용

---

## 진행 중인 기능: 겨울방학 근무 현황 자동화

### 목표
1. 교직원이 웹 UI에서 방학 기간 중 매일의 근무 상태(근무/연가/출장/41조연수 등)를 드롭다운으로 선택
2. 자동으로 HWPX(한글) 또는 DOCX(Word)로 "근무지 외 연수 허가원" 생성·다운로드
3. 관리자는 전체 현황을 **색 포함된 엑셀**로 받음

### 확정된 설계 결정
- **UI 위치**: 메인 `index.html` SPA에 **새 탭 추가** (독립 페이지 아님)
- **관리자 기능**: 기존 `관리 버튼(body.admin-mode)` 토글 패턴 재사용 → "방학 세팅하기" 버튼. **기존 entries 전부 삭제되므로 강한 경고 후 실행**
- **본인 식별**: 이름 입력 → `staff.json`과 매칭 → LocalStorage 캐시. 다른 PC에서도 같은 이름 입력하면 Redis에서 복구 가능 (이름 = 복구 키, 비밀번호 없음)
- **공휴일**: `date.nager.at/api/v3/PublicHolidays/{year}/KR` 프록시 (키 불필요)
- **반일 혼합 코드**: `오전근무/오후41조` 하나만
- **드롭다운 메뉴**: 근무 / 출장 / 출장연수(별도) / 41조연수 / 연가 / 기타 / 오전근무·오후41조 / 토·일·공휴일(자동)

### 데이터 스키마 (Redis `winter-schedule`)
```json
{
  "config": {
    "startDate": "2026-01-05",
    "endDate": "2026-02-13",
    "holidays": [{"date":"2026-01-01","name":"신정"}],
    "setAt": "ISO timestamp"
  },
  "entries": {
    "s3": {
      "staffId": "s3",
      "name": "권준구",
      "school": "백암초등학교",
      "days": { "2026-01-05": "41조연수", "2026-01-06": "근무", ... },
      "fortyOnePeriods": [ // optional override (없으면 days에서 자동 계산)
        { "range": "1.5 ~ 1.9", "days": 5, "content": "...", "place": "자택", "note": "010-..." }
      ],
      "workPeriods": [...],
      "summary": {...}, // optional
      "updatedAt": "..."
    }
  }
}
```

### 신규 서버 라우트 (`server.js`)
- `GET  /api/winter-schedule` — 전체 데이터
- `POST /api/winter-schedule` — 전체 덮어쓰기 (기존 DATA_ROUTES 자동 등록)
- `PATCH /api/winter-schedule/entries/:staffId` — 개별 교직원 항목 저장
- `POST /api/winter-schedule/setup` — **관리자** 방학 기간 세팅 (entries 전부 삭제함!)
- `GET  /api/winter-schedule/holidays?year=N` — date.nager.at 프록시
- `GET  /api/winter-schedule/permit/:staffId` — **기본 DOCX** 다운로드. `?format=hwpx`로 HWPX 옵션
- `GET  /api/winter-schedule/xlsx` — **관리자** 전체 현황 엑셀 다운로드

---

## 완료 상태

### ✅ Phase 0 — HWPX 템플릿 구조 분석
- 메인 기간표: `<hp:tbl rowCnt="14" colCnt="5">`, 14행 중 41조데이터(7) + 근무데이터(3) + 헤더2 + 소계2 구성
- 합계 테이블: `<hp:tbl rowCnt="2" colCnt="9">`, 9개 카테고리 count
- 색 팔레트는 `<hh:borderFill>`의 `<hc:winBrush faceColor="#HEX" hatchStyle="HORIZONTAL?"/>`로 인코딩

### ✅ Phase 1 — HWPX 생성 엔진 (`lib/hwpx.js`)
- `generatePermit(data)` — 허가원 HWPX Buffer 반환
- `buildPeriods(days, status)` — 날짜 객체 → 연속 구간 배열 (timezone 안전, UTC 파싱)
- `summarize(days)` — 9개 카테고리 집계
- `substituteHwpx(buf, replacements, xmlTransform)` — 저수준 zip-level 치환

### ✅ 2026-07-08 — 허가원에 반응형 달력(근무상황일람표) 추가
- 새 템플릿 `templates/permit-calendar-template.hwpx` (조성균 교감 수기 편집본 기반).
  구조: 41조 기간표(4×5, 내용/장소/비고 포함) + **근무상황일람표 달력(9×7)** + 합계표(2×9) + 서명(2×1).
  구 템플릿(permit-template.hwpx)과 `fillMainTable`은 레거시로 남겨둠 (근무 기간표는 달력으로 대체됨).
- `buildCalendarWeeks(days, config)` — 방학 기간에 맞춰 주 수가 변하는 반응형 달력 데이터.
  범위 = (시작일-1)=방학식 ~ (종료일+1)=개학식, 일~토 주 단위. 주말 빈칸, 평일 공휴일 '휴일',
  방학식/개학식은 평일일 때만 라벨. 상태 표기: '41조연수'→'제41조', '오전근무/오후41조'→'근무/41조'.
- `fillCalendarTable` — 주 단위 행 복제 (첫 주/중간 주/마지막 주 테두리 스타일 각각 다른 행 템플릿 사용, rowAddr 재번호).
- `fill41Table` — 41조 기간표 재구성. 연수내용/장소/비고 컬럼 채움.
- `entry.fortyOneInfo = {content, place, note}` — UI 입력(41조 연수 정보 바, `wsSetFortyOneInfo`)이
  자동 계산된 모든 41조 기간에 공통 적용됨. HWPX/DOCX/HTML 3종 모두 반영.
- 검증: `node _check/test-calendar-permit.js` — 조성균 샘플과 텍스트 완전 일치 확인.

### ✅ Phase 2 — Redis 스키마 + API 라우트
- `defaults/winter-schedule.json` 초기값
- server.js에 라우트 7개 추가

### ✅ Phase 4 — 엑셀 export (`lib/xlsx-export.js`)
- `exceljs` 기반
- 셀 배경색 + 반일 혼합은 `pattern: 'lightUp'` 줄무늬
- 주말/공휴일 자동 회색 처리

### ✅ Phase 3 — index.html 탭 UI (**기본 완성, 실사용 검증 필요**)
- DEFAULT_TABS[13]에 `winter-schedule` 탭 등록
- 본인 이름 입력(LocalStorage) → 해당 행만 편집 가능, 다른 교직원은 색으로 표시만
- 드롭다운 8종 상태 (근무/출장/출장연수/41조/연가/기타/오전근무·오후41조/빈칸)
- 주말/공휴일 자동 회색 + 편집 불가
- 800ms 디바운스 자동 저장 (PATCH 엔드포인트)
- 허가원 출력 **3종**: DOCX / HWPX / HTML (인쇄 미리보기)
- 관리자 버튼: "방학 세팅하기" (공휴일 API 자동 조회 + 기존 entries 삭제 경고) + "전체 엑셀"

### 주요 함수 (index.html 내)
- `renderWinterSchedule()` — 그리드 전체 다시 그림
- `wsSetCell(iso, value)` — 셀 변경 → 디바운스 저장
- `wsDownloadPermit(format)` — docx/hwpx/html 선택
- `wsSetupVacation()` — 관리자, 방학 세팅
- `wsSaveIdentity()` / `wsChangeName()` — 본인 식별
- `WS_STATUSES` 배열 — 드롭다운/색 정의

### ⏳ Phase 5 — 배포 검증 + 후속 작업 (남은 것)
- [ ] Vercel Preview 배포 후 실제 로그인하여 탭 동작 확인
- [ ] "방학 세팅하기"로 기간 세팅 → 다른 교직원 계정(또는 새 브라우저)에서 본인 이름 입력 → 색 선택 → 저장됨 확인
- [ ] 허가원 3종 다운로드 각각 동작 확인 (한글/Word/크롬 브라우저 열기)
- [ ] 관리자 전체 엑셀 다운로드 확인
- [ ] 행 추가 대량 케이스 (8+5) 한글에서 실제 열림 확인 (로컬 test-output-v2.hwpx로는 확인됨)
- [ ] UI 세부 다듬기: 연수내용/장소/비고 입력 필드 (현재 API 스키마엔 있지만 UI 미노출), 모바일 대응, 반일 혼합 UX 개선
- [ ] 권한 제한 실제 검증: "이름 입력"만으로 다른 교직원 데이터 덮어쓰기 가능한 문제 (접근 코드가 공유라 현재 의도된 설계)

---

## ⚠️ 결정적인 기술 함정 (반드시 읽기)

### HWPX 생성 시 주의사항 (실제로 겪은 버그들)

1. **mimetype은 STORED 압축** (Compression 0, 비압축) 필수. JSZip의 `generateAsync({compression:'DEFLATE'})`가 모든 파일에 적용되므로 명시적으로 오버라이드:
   ```js
   zip.file('mimetype', content, { compression: 'STORE' });
   ```

2. **원본에서 STORED였던 파일은 그대로 유지**해야 한글 viewer가 안 깨짐. `version.xml`, `Preview/PrvImage.png`가 해당:
   ```js
   const STORED_FILES = new Set(['mimetype', 'version.xml', 'Preview/PrvImage.png']);
   ```

3. **디렉토리 엔트리 (`Contents/`, `Preview/`) 금지**. JSZip이 `zip.file()` 호출 시 parent 폴더를 자동 생성하므로:
   ```js
   zip.file(name, content, { createFolders: false });
   // 그리고 generate 직전에
   for (const n of Object.keys(zip.files)) if (zip.files[n].dir) zip.remove(n);
   ```

4. **테이블 재구성 시 preamble 보존 필수**. `<hp:tbl>` 바로 안쪽의 `<hp:sz>`, `<hp:pos>`, `<hp:outMargin>`, `<hp:inMargin>`을 날리면 **한글 레이아웃 엔진이 무한루프** (CPU 100%) 상태가 됨. `splitTableParts()`가 이 preamble을 보존.

5. **행 복제 시 `rowAddr` 재번호 필수**. 같은 row 템플릿을 복제하면 모든 셀이 동일한 `<hp:cellAddr rowAddr="1"/>`를 가져서 충돌. `setRowAddr(xml, newIdx)`로 갱신.

6. **네임스페이스 후처리(`fix_namespaces.py`)는 불필요**. 우리는 기존 템플릿의 텍스트만 치환하므로 `ns0:` 같은 자동 프리픽스가 생기지 않음.

### DOCX 생성 시 주의사항
- `docx` 라이브러리에서 표 열 너비는 **twip 절대값 사용**, 퍼센트 사용하면 너무 좁게 렌더됨
- A4 세로 여백 20mm 기준 본문폭 = **9639 twip** (170mm)

### 행 추가/제거 (현재 구현 상태)
- `lib/hwpx.js::fillMainTable` 이 동적 행 복제 구현
- 41조 템플릿 = `rows[1]`, 근무 템플릿 = `rows[10]`, 소계 템플릿 = `rows[8]`, `rows[13]`
- `rowAddr` 재번호 + `rowCnt` 갱신
- **검증 중**: 사용자가 8행+5행 스트레스 테스트로 열어봐야 확정 (최종 메시지 시점에 테스트 중이었음)

---

## 테스트 방법 (로컬)

```bash
cd AIroom
npm install
node test-permit.js       # HWPX 생성 테스트 → test-output-v2.hwpx
node test-xlsx.js         # 엑셀 생성 테스트 → test-schedule.xlsx
node test-docx.js         # DOCX 생성 테스트 → test-permit-v2.docx
node test-roundtrip.js    # 수정 없이 재압축 (zip baseline)
node test-minimal.js      # 이름만 치환 (최소 수정)
```

테스트 파일들은 `.gitignore`에 등록되어 있어 커밋 안 됨. Windows에서 파일 열어둔 상태로 재생성하면 `EBUSY`.

---

## 기존 AIroom 구조 (탐색 중 파악한 것)

### 탭 시스템
- `DEFAULT_TABS` 배열 (line 1673 근처) + `tabsConfig` (서버 동기화)
- 각 탭: `{id, title, icon, type:'builtin'|'custom', order, sections}`
- 커스텀 탭 ID: `'tab_' + Date.now()`
- 빌트인 탭은 `<div class="page" id="page-{tabId}">` 정적 HTML
- 페이지 전환: `switchPage(tabId, button)` (line 1993)

### 인증
- `requireAuth` / `requireAdmin` 미들웨어
- 세션 토큰 → `localStorage.airoom_auth_token`
- 접근코드 기본값 `1234` (user), `admin1234` (admin)
- 실패 시 브루트포스 방어 (점진적 잠금)

### API 호출 패턴 (프론트)
```js
async function api(method, endpoint, body) {
    const headers = { 'Content-Type': 'application/json' };
    if (authToken) headers['X-Auth-Token'] = authToken;
    const r = await fetch(endpoint, { method, headers, body: body ? JSON.stringify(body) : null });
    return r.json();
}
```

### `admin-mode` 패턴
- `toggleAdmin()` (line 2648) — body에 `admin-mode` class 추가/제거
- CSS로 `.admin-mode .add-section-btn { display: block; }` 같은 셀렉터로 UI 토글

---

## 다음 세션에서 바로 시작하기

1. 이 CLAUDE.md 먼저 읽기
2. Vercel Preview URL(자동 생성됨) 또는 프로덕션에 머지 후 `https://a-iroom.vercel.app/` 접속
3. 로그인 → "방학근무" 탭 클릭
4. 관리 모드 켜서 "방학 세팅하기" 실행 → 기간/공휴일 설정
5. 일반 사용자 역할로 본인 이름 입력 → 드롭다운 색 선택 → 자동 저장 확인
6. 허가원 3종 다운로드 테스트 (DOCX: Word에서 열림, HWPX: 한글에서 열림, HTML: 브라우저 새 창)
7. 문제 있으면 CLAUDE.md의 "⚠️ 결정적인 기술 함정" 참고 (이미 해결한 버그들)

### 우선순위 높은 개선
- 연수내용/연수장소/비고(연락처) 입력 UI 추가 (API 스키마엔 이미 있음)
- 허가원 다운로드 전 summary 미리보기 모달
- 대량 기간 (>15개) 시 HWPX 렌더 테스트

---

## 세션 히스토리 요약

1. 기획 단계: 기술 스택 확정 (Vercel 제약 → jszip/exceljs 순수 JS, Python/Java 스킬 불가)
2. Phase 0: HWPX 템플릿 분석, 색 팔레트 식별, 4개 테이블 구조 파악
3. Phase 1: `lib/hwpx.js` 구현. 수많은 버그 수정 (timezone, mimetype, STORED 파일, directory entries, preamble 보존)
4. Phase 2: API 라우트 추가
5. Phase 4: `lib/xlsx-export.js` — 한 번에 성공
6. 폴백: `lib/docx-permit.js` DOCX 생성 (한글에서 HWPX 안 열릴 때 대안)
7. 현재: HWPX 행 추가 검증 중, UI는 아직 착수 전
