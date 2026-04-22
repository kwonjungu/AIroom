# CLAUDE.md — AIroom 프로젝트 컨텍스트

## 이 파일의 용도
Claude Code 대화를 이어갈 때 빠르게 맥락을 잡기 위한 메모. 특히 진행 중인 **겨울방학 근무 현황 자동화** 기능에 관한 정보.

---

## 프로젝트 개요

- **이름**: AIroom (한글명 "백암이 — 아이들을 위한 교무실")
- **소속**: 백암초등학교 (33명 규모)
- **배포**: GitHub → Vercel 자동 배포 (`https://a-iroom.vercel.app/`)
- **기반 스택**: Express + Upstash Redis + 단일 `index.html` SPA (434KB) + 공유 접근 코드 인증
- **데이터 저장**: Redis(서버리스용) + 로컬 개발 시 `data/` 디렉토리 파일

### 핵심 파일 구조
```
AIroom/
├── server.js              # Express 서버 (인증 + CRUD + 파일 export)
├── index.html             # 메인 SPA (434KB, 탭 기반 UI)
├── public/                # 독립 페이지 (sign, doc, admin, vibecoding)
├── defaults/              # 초기 데이터 JSON들 (staff, schedules, tabs, ...)
├── lib/                   # ★ 서버 사이드 모듈 (신규 추가)
│   ├── hwpx.js            # HWPX 문서 생성 엔진 (근무지외연수허가원)
│   ├── xlsx-export.js     # 관리자용 엑셀 export (색 포함)
│   └── docx-permit.js     # DOCX 폴백 (MS Word용)
├── templates/             # ★ HWPX 템플릿 (신규)
│   └── permit-template.hwpx
└── package.json           # 의존성: express, redis, jszip, exceljs, docx
```

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

### ✅ Phase 2 — Redis 스키마 + API 라우트
- `defaults/winter-schedule.json` 초기값
- server.js에 라우트 7개 추가

### ✅ Phase 4 — 엑셀 export (`lib/xlsx-export.js`)
- `exceljs` 기반
- 셀 배경색 + 반일 혼합은 `pattern: 'lightUp'` 줄무늬
- 주말/공휴일 자동 회색 처리

### ⏳ Phase 3 — index.html 탭 UI (**진행 중, 미완료**)
- 아직 index.html은 **수정하지 않음**
- 필요한 작업:
  1. `DEFAULT_TABS` 배열 (line 1673 근처)에 `{id:'winter-schedule', title:'방학근무', icon:'🏫', type:'builtin', order:14}` 추가
  2. `<div class="page" id="page-winter-schedule">` 컨테이너를 page 영역(line 826 근처, scanner 다음)에 삽입
  3. `renderWinterSchedule()` + `saveWinterSchedule()` 함수 추가 (line 2006 근처 기존 패턴 참조)
  4. `init()` (line 1956)에 `api('GET','/api/winter-schedule')` 호출 추가
  5. `admin-mode` 클래스로 보이는 "방학 세팅하기" 버튼 (기존 staff 에디터 패턴 참조, line 3489 근처)
  6. 드롭다운 그리드 UI — 행=교직원, 열=날짜, 각 셀이 드롭다운 + 색 적용

### ⏳ Phase 5 — 배포 검증 (미완료)
- Vercel Preview에서 HWPX/엑셀 다운로드 실제 작동 확인

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
2. `AIroom/lib/hwpx.js`에서 행 추가 로직 (`fillMainTable`) 상태 확인
3. 사용자에게 `test-output-v2.hwpx`가 한글에서 열리는지 재확인
4. 열리면 → **Phase 3 (index.html 탭 UI) 착수**. 편집 전 index.html에서 아래 앵커 확인:
   - `const DEFAULT_TABS` 정의 위치
   - `<div class="page" id="page-scanner">` 다음에 삽입 위치
   - `function switchPage` 구현
   - `function toggleAdmin`
5. 탭 UI 완성 후 → Vercel Preview URL에서 로그인해서 실제 API 동작 확인 (Phase 5)

---

## 세션 히스토리 요약

1. 기획 단계: 기술 스택 확정 (Vercel 제약 → jszip/exceljs 순수 JS, Python/Java 스킬 불가)
2. Phase 0: HWPX 템플릿 분석, 색 팔레트 식별, 4개 테이블 구조 파악
3. Phase 1: `lib/hwpx.js` 구현. 수많은 버그 수정 (timezone, mimetype, STORED 파일, directory entries, preamble 보존)
4. Phase 2: API 라우트 추가
5. Phase 4: `lib/xlsx-export.js` — 한 번에 성공
6. 폴백: `lib/docx-permit.js` DOCX 생성 (한글에서 HWPX 안 열릴 때 대안)
7. 현재: HWPX 행 추가 검증 중, UI는 아직 착수 전
