# AIroom — 백암이, 아이들을 위한 교무실

백암초등학교(33명 규모) 교직원용 내부 웹 도구 모음. 출석/복무·행정 문서 자동화·급식일지 등 일상 업무를 한 곳에 모아 둔 사내 유틸.

배포: https://a-iroom.vercel.app/

---

## 구성

이 레포는 한 개의 Express 서버가 여러 SPA를 서빙하는 형태.

| 경로 | 용도 | HTML |
|---|---|---|
| `/` | **AIroom 메인 SPA** — 탭 기반 교무실 대시보드 | `public/index.html` |
| `/bap` `/bap2` `/bap3` | **급식일지** (백암·백봉·장평 3개교, 데이터 완전 분리) | `public/bap/index.html` |
| `/sign` | 전자서명 열람 | `public/sign.html` |
| `/doc` | 문서 뷰어 | `public/doc.html` |
| `/admin` | 관리자 설정 페이지 | `public/admin.html` |
| `/vibecoding` | 바이브 코딩 전용 실습 페이지 | `public/vibecoding.html` |

세 개 급식일지 사이트(bap/bap2/bap3)는 **같은 HTML·서버 라이브러리를 공유**하고, Firestore 컬렉션·Redis 키 프리픽스만 `SCHOOL`에 따라 달리 하여 학교별로 완전 분리된다.

---

## 주요 기능

### 메인 SPA (`/`)
- **탭 시스템** — 커스텀 탭 추가 가능. 섹션 단위로 링크·문서·공지사항·체크리스트·연수 기록 등 관리.
- **겨울방학 근무 현황 자동화** — 드롭다운으로 매일의 근무 상태 입력 → **HWPX/DOCX "근무지 외 연수 허가원"** 자동 생성. 관리자는 색 포함 엑셀로 전체 현황을 받음. (`lib/hwpx.js`, `lib/docx-permit.js`, `lib/xlsx-export.js`)
- **AI 프리젠테이션 생성** — PPTX 자동 작성 에이전트. (`lib/pptx-agent.js`, `lib/pptx-gen.js`)
- **접근 코드 기반 인증** — 일반/관리자 2단계. 브루트포스 방어 포함.

### 급식일지 `/bap`
- **담당자(영양사/조리 담당)** 로그인 후 일별 급식일지 작성 → 부장에게 전자 결재 요청
- **결재자(부장)** 뷰:
  - 🟡 **결재 대기** 목록 + 원클릭 승인
  - 📅 **월별 현황** 달력 (결재완료/대기/작성중/미작성 색으로 표시)
  - 🍚 **식단표지 업로드** — HWPX/PDF를 업로드하면 AI가 날짜별 메뉴를 추출해 저장, 담당자의 일지 작성 화면에 자동 연동
  - 🗑️ **서버 관리자** — 결재 완료된 것까지 포함해 모든 일지를 임의 삭제(달력/나열식 뷰)
- **담당자 뷰에도 월별 현황 탭 공유** — 결재자 캘린더와 동일한 데이터를 열람 가능
- **HWPX/PDF 식단표 파싱**
  - PDF: pdfjs(`unpdf`) 좌표 기반 컬럼 빈잉
  - HWPX: `<hp:tbl>/<hp:tr>/<hp:tc>`의 `cellAddr`로 날짜행↔메뉴행 구조 매핑 (`lib/bap-menu-parse.js`)
  - 추출 텍스트를 Groq LLM으로 JSON 정제
  - **업로드 후 교사 검토/수정 모달** — 서버에 저장 전 날짜별 메뉴를 수동 편집하거나 자연어 검토 의견을 주면 LLM이 재파싱
  - 드래그 앤 드롭 업로드 지원

### 인증·데이터
- **AIroom 메인**: Express 세션 + Upstash Redis
- **급식일지**: 자체 사용자 가입(PBKDF2) + Redis 세션 + Firebase Firestore (학교별 컬렉션 분리)
- **Firestore 규칙**: `firestore.rules` — 일지 `create/update` 상태 전이는 규칙 수준에서 보증, `delete`는 운영자 서버 관리 기능으로 허용

---

## 기술 스택

- **런타임**: Node.js / Express 5
- **저장소**: Upstash Redis (서버리스) + Firebase Firestore (급식일지 전용)
- **프론트**: 단일 HTML + vanilla JS + TailwindCSS(CDN)
- **문서 생성**: `jszip`, `docx`, `pptxgenjs`, `exceljs`
- **PDF 파싱**: `unpdf` (Vercel 서버리스 친화 pdfjs 래퍼)
- **AI**: Groq API (`llama-3.3-70b-versatile` 중심, 폴백 체인)
- **배포**: Vercel (`vercel.json`이 모든 요청을 `server.js`로 rewrite)

---

## 디렉토리 구조

```
AIroom/
├── server.js              # Express 서버 (auth + CRUD + API + file export)
├── index.html             # AIroom 메인 SPA (434KB)
├── public/
│   ├── admin.html         # 관리자 설정 페이지
│   ├── doc.html           # 문서 뷰어
│   ├── sign.html          # 전자서명 열람
│   ├── vibecoding.html    # 바이브 코딩 실습
│   └── bap/
│       └── index.html     # 급식일지 SPA (bap/bap2/bap3 공용)
├── lib/                   # 서버 사이드 모듈
│   ├── hwpx.js            # HWPX 문서 생성 (근무지외연수허가원)
│   ├── docx-permit.js     # DOCX 폴백
│   ├── html-permit.js     # HTML 미리보기/인쇄
│   ├── xlsx-export.js     # 색 포함 엑셀 export
│   ├── pptx-agent.js      # AI 프리젠테이션 에이전트
│   ├── pptx-gen.js        # PPTX 생성 엔진
│   ├── bap-menu-parse.js  # 급식 식단표 HWPX/PDF 파싱 + Groq 정제
│   └── web-search.js      # 웹 검색 유틸
├── templates/             # HWPX 템플릿
│   └── permit-template.hwpx
├── defaults/              # 초기 데이터 JSON (staff/schedules/tabs/...)
├── firestore.rules        # Firestore 보안 규칙 (급식일지)
├── vercel.json            # Vercel 라우팅
├── package.json
├── CLAUDE.md              # Claude Code 컨텍스트 메모
└── FIREBASE_SETUP.md      # Firebase 초기 설정 절차
```

---

## 개발·배포

### 로컬 실행
```bash
npm install
npm start           # node server.js
```
기본 포트는 `process.env.PORT || 3000`.

### 환경 변수 (Vercel / 로컬)
| 키 | 용도 |
|---|---|
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis |
| `FIREBASE_API_KEY` 외 `FIREBASE_*` | 급식일지 Firestore 클라이언트 config |
| `GROQ_API_KEYS` (콤마 구분 가능) | Groq LLM 키 (폴백 체인) |
| `DEFAULT_ACCESS_CODE`, `DEFAULT_ADMIN_CODE` | AIroom 메인 초기 비밀번호 |

### Firebase 설정
`FIREBASE_SETUP.md` 참고. 요지:
1. Firebase 프로젝트 생성(Blaze 권장)
2. Firestore Native 모드 활성화
3. `firestore.rules` 게시
4. Cloud Firestore API + Identity Toolkit API 활성화
5. 위의 `FIREBASE_*` env를 Vercel에 등록

### 배포
Vercel에 GitHub push → 자동 배포. `vercel.json`은 정적 파일을 그대로 서빙하고 그 외 모든 요청을 `server.js`로 라우팅.

---

## 내부 문서

- **`CLAUDE.md`** — Claude Code와 이어서 작업할 때 빠르게 맥락을 잡기 위한 메모. 진행 중인 큰 기능(겨울방학 근무 현황 자동화 등)의 설계 결정과 함정이 정리돼 있음.
- **`FIREBASE_SETUP.md`** — Firestore/Firebase 초기 세팅 절차.
- **`BAP_DEBUG.md`** — 급식일지 Firestore 연결 이슈 디버깅 체크포인트.
- **`SECURITY_REPORT.md`** — 보안 검토 보고.

---

## 라이선스

내부 도구로 특정 학교 환경에 맞춰 개발된 프로젝트. 외부 배포·재사용 전에 학교 담당자와 협의 필요.
