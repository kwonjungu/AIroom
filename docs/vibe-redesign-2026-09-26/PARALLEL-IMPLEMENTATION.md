# Claude 병렬 구현 작업 지시서

대상: 사용자가 지정한 Claude OPUS 5.5 등 후속 구현 작업자. 모델명 자체를 코드·API ID로 하드코딩하지 않는다. 이 문서는 **계획 패킷**이며 아래 작업들이 이미 수행되었다는 의미가 아니다.

## 1. 착수 담당자가 먼저 할 일

1. `git status`, HEAD, production branch/commit, `CLAUDE.md`, 실제 존재하는 테스트를 확인한다. 이 계획의 조사 기준 HEAD는 `76b53b90c6656a0ba335afdc0e5d17b7f85270d5`다.
2. `public/vibecoding.html`의 미커밋 `_wireDropZone` 수정과 이후 사용자 변경을 식별·보존한다. 작업자를 시작하기 전에 사용자 변경을 포함한 기준 커밋/스냅샷을 만든다. 미커밋 변경은 새 worktree에 자동으로 따라오지 않는다.
3. 이 폴더 4개 문서를 읽고 학년·기기 요구를 확인한다. 저학년=카드 코딩, 나머지=3~6학년; 주 기기=태블릿·노트북·크롬북.
4. 기존 앱과 v2를 기능 플래그로 병행할 경로를 정한다. 공개 경로 `/vibecoding.html`은 유지하고 v2는 초기 preview에서만 노출한다.
5. 계약·진단 코드·mock 응답·폴더 경계를 WP0에서 확정한다. 이후 파트별 임의 계약 변경을 금지한다.

이 저장소의 `CLAUDE.md`에는 두 브랜치 동시 push 지침이 있으나 배포 구성이 바뀌었을 수 있다. 실제 Vercel production 설정과 사용자 배포 권한을 확인한 뒤 수행한다. 이번 계획 작성은 push·배포 승인이 아니다.

## 2. 제안 폴더와 파일 소유권

```text
public/vibecoding.html                  [통합 담당] 기존 진입점/어댑터
public/vibe-v2/
  app.js                               [통합 담당] 조립·라우팅·모드 생명주기
  styles/tokens.css                    [WP1] 타이포·간격·색·터치 토큰
  styles/layout.css                    [WP1] 반응형 레이아웃
  ui/                                 [WP1] 공통 셸·단계·대화·상태
  modes/cards/                        [WP2] 카드·별까지 가기·도형
  modes/studio/                       [WP3] 공방 프로젝트·무대·플레이 UI
  modes/learning/                     [WP8] 거북이·픽셀·미로 어댑터
  state/                              [WP0/통합 담당] 상태·revision·undo
  persistence/                        [WP0/통합 담당] IndexedDB·동기화
  assets/manifest.json                [WP6] 승인된 에셋 명세
shared/vibe/
  contracts/                          [WP0/통합 담당] Schema·버전·diagnostics
  compiler/                           [WP4] DSL/AST/IR·검증·블록 어댑터
  runtime/                            [WP4] 실행기·입력·충돌·스케줄러
  templates/                          [WP4, 콘텐츠는 WP8 제안] 검증된 장르
lib/vibe/
  router.js                           [통합 담당] 라우트 연결
  auth/                               [WP7] 학생·학급·교사 세션
  projects/                           [WP7] 소유권·저장·revision
  generation/                         [WP5] 오케스트레이터·검증·수리
  providers/groq.js                    [WP5] timeout·capability·usage
  assets/                             [WP6] 생성 어댑터·후처리·manifest
  jobs/                               [WP7] 영속 작업·큐·예산·취소
tests/vibe/{unit,integration,e2e,evals}/ [각 담당의 전용 하위 파일 + QA]
server.js / package*.json / vercel.json [통합 담당만 수정]
```

공유 브라우저 모듈을 어떤 정적 경로로 배포할지는 WP0에서 확정한다. 서버 전용 파일을 통째로 static 공개하지 않는다. 빌드 도입 시 해시 자산과 source map 정책도 함께 정한다. HTML에서 함수 문자열을 잘라 eval하는 검사보다 순수 모듈 import를 우선한다.

## 3. 병렬 실행 순서

```text
WP0: 기준 보존 → 상태/계약/테스트 틀 → 소유권 고정
  ├─ Wave A: WP1 공통 UI | WP4 컴파일러·엔진 | WP7 세션·저장·작업
  ├─ Wave B: WP2 카드·도형 | WP3 공방 UI | WP5 Groq 하네스
  └─ Wave C: WP6 에셋 | WP8 학습 콘텐츠 | QA·통합·실기기
종합 게이트 → 교실 파일럿 → 제한 배포 → 단계 확대
```

독립 구현 작업자는 3~4개부터 시작한다. 통합 담당은 리뷰·계약 조정·merge를 전담한다. WP3는 가짜 생성 job으로, WP5는 headless runtime으로 개발할 수 있다. 서로의 파일에 직접 들어가 임시 해결하지 않는다.

worktree/브랜치 예: `vibe/wp1-shell`, `vibe/wp2-cards`, `vibe/wp4-runtime`. 공통 기준에서 분기하고 하나의 작업자만 한 worktree를 쓴다. shared schema 변경은 제안→통합 담당 승인→계약 버전 증가→관련 mock 갱신 순서다. 단일 HTML의 서로 다른 줄을 맡기는 방식은 임시 추출 단계에만 쓴다.

## 4. 작업 패킷

### WP0 — 통합 담당: 기반·계약·마이그레이션

입력: 현행 HTML, server.js, 사용자 수정, 이 문서.

산출물: baseline evidence, 작업별 worktree 기준, Project/Patch/Job/Asset JSON Schema, 단일 상태 저장소, revision/undo 계약, mock provider/runtime, v1 읽기 어댑터, 공통 npm 검사 명령, v2 preview 플래그.

완료 기준: 기존 6모드 진입 스모크; 사용자 드롭 수정 보존; 검증된 v1 예제를 읽고 원문 유지; 두 작업자가 공통 계약만으로 UI와 mock 서버를 연결; 동작 없는 stub을 성공 상태로 표시하지 않음.

금지: 프레임워크 전환과 모든 기능 재작성 동시 착수, 사용자 변경 덮어쓰기, production 인증 해제.

### WP1 — 공통 UI·단계·반응형

입력: 토큰·모드 어댑터·프로젝트 mock. 소유: styles와 ui.

작업: 학년별 셸; 큰 미션 카드; 현재 단계와 작업 상태 구분; 태블릿 세로/가로·1366×768 배치; IME·가상 키보드; 접근 가능한 dialog·focus; 터치 타깃·대비·reduced motion.

완료 기준: UI01~UI08 통과; 가로 본문 넘침 없음; 키보드로 주요 동선 완주; 태블릿에서 목표·실행·현재 카드가 접근 가능; 스크린샷과 실제 측정값 제출.

경계: 게임 규칙/서버/API 계약을 수정하지 않는다. `onRun`, `onPatchIntent`, `saveStatus` 같은 계약을 소비한다.

### WP2 — 저학년 카드·도형

입력: WP1 셸·WP0 상태·도형 mission schema. 소유: modes/cards 및 관련 검사.

작업: 눌러 추가, Pointer Events 드래그, 키보드 정렬, undo/redo, 한 장 실행; 레이어 의미·속성 패널; 목표 비교; 전경/의미 채점; 기존 12개 도형 과제 재검수; 별까지 가기 입력·오류 설명.

완료 기준: SH01~SH08; 빈 작품 0%; 동일 정답 100%; 드롭 20회에 이벤트 중복 없음; 카드 reorder/undo 후 다른 미션 데이터 오염 없음; 저학년 56px 조작.

경계: 채점 로직은 순수 함수. AI를 채점기로 쓰지 않는다. 학습 조건에 근거 없는 실패 횟수 감점을 추가하지 않는다.

### WP3 — 게임 공방 UX·프로젝트 편집

입력: WP0 저장·revision, WP4 runtime, WP5 mock job. 소유: modes/studio.

작업: 템플릿 갤러리, 만들기/해보기, 장르별 입력, 규칙 요약, AI 변경 비교, 적용/되돌리기, 저장·이어서 하기, 생성 취소/충돌/오프라인 상태, 작은 기기의 조작판.

완료 기준: 4개 장르 mock 프로젝트 플레이; 생성·수동 수정·AI 부분 수정의 왕복; 실패 후보가 기존 작품을 덮지 않음; 두 탭 충돌 보존; ST01~ST08.

경계: 모델을 직접 호출하거나 API 키를 UI에 넣지 않는다. 네트워크 오류를 성공 게임으로 치환하지 않는다.

### WP4 — 컴파일러·런타임·게임 템플릿

입력: 구 DSL·블록·장르 콘텐츠, shared schema. 소유: compiler/runtime/templates.

작업: 엄격 파서·diagnostics, DSL 읽기 어댑터, AST/블록 의미 왕복, 고정 tick, seed, 통합 scheduler, collision, resource budgets, dispose, 장르별 smoke replay, API 없는 자동 검증.

완료 기준: RT01~RT08; 같은 seed/input의 trace 동일; 오류 줄 누락 없이 진단; 점수·목숨·종료·재시작 검사; 장르별 대표 게임; 느린 렌더에서도 동일 규칙.

경계: public DOM, 서버 키, DB 접근 없음. 현재 문법에 없는 새 동작을 템플릿에서 몰래 가정하지 않는다. IR 변경은 통합 담당과 schema 버전을 함께 수정한다.

### WP5 — Groq 생성·수리 하네스

입력: contracts, runtime 검사 API, jobs mock, 평가 corpus. 소유: generation/provider.

작업: 요청 분류·문맥 구성·모델 capability·구조화 패치·검증·bounded repair·timeout·취소·관측·품질 폴백·예산; provider 오류 mock; 최소 120개 평가 과제.

완료 기준: AI01~AI09; 전체 시도 상한 3회; 무검증 적용 0; JSON 잘림·429·401·늦은 응답 처리; 고정 holdout의 실제 결과 표; 토큰·지연·비용 분리 보고.

경계: 키 회전으로 조직 할당량 회피 금지. 시스템 프롬프트·모델을 학생에게서 받지 않는다. 스키마 통과율만으로 게임 품질을 보고하지 않는다.

### WP6 — 자동 에셋 생성

입력: 기존 assets 목록, AssetBrief·manifest 계약, queue API. 소유: asset modules/manifest.

작업: 기존 그림 재사용 매핑, 스타일 팩, 공급자 adapter+mock, 멱등성·취소·비용, 이미지 검사·투명도·파생본·CDN, placeholder 교체, 소리·음소거.

완료 기준: AS01~AS06; 공급자 장애에도 게임 플레이; 같은 job 중복 청구 예방; 실패 시 placeholder; 늦은 에셋이 다른 슬롯을 덮지 않음; 출처·승인 상태 기록.

경계: 이미지를 UI 버튼 글자·정답 기하 판정에 사용하지 않는다. 실제 API 호출은 사용 가능한 키와 정해진 테스트 예산으로만 한다. 키가 없으면 mock 구현 결과와 미검증 목록을 구분한다.

### WP7 — 학생 범위·저장·분산 작업

입력: 기존 인증·Redis·저장 로직, 신규 계약. 소유: auth/projects/jobs.

작업: 학급 세션, 학생/교사 소유권, revision CAS, idempotency, distributed limiter, budget reservation, durable job lease, 취소·재시도·event cursor, 진도 마이그레이션, 로그 최소화.

완료 기준: OP01~OP08; 타 학생 읽기/쓰기 0; 같은 학교 IP 30명 처리; 프로세스 재시작 이후 job 복구; 중복 apply 1회; 타 AIroom 라우트 회귀 없음.

경계: 공유 secret 헤더를 인증으로 승격하지 않는다. Redis 전체 컬렉션 병합으로 프로젝트 대량 저장을 새로 만들지 말고 프로젝트/작업 키 단위 설계 및 크기 제한을 적용한다.

### WP8 — 교육 콘텐츠·통합 QA

입력: 기존 missions/story·새 셸·평가 기준. 소유: learning 어댑터, 콘텐츠 파일, E2E/평가 fixture.

작업: 거북이·픽셀·미로 핵심 흐름; 학년별 문구; 단계/힌트 검수; 기존 미션 정답 replay; 접근성·실기기·30명 시나리오; 교육자 확인용 체크리스트.

완료 기준: 각 모드 대표 미션 이상 실제 실행, 모든 이관 미션의 자동 정답 검증, 알려진 오답 거부, API 장애 수업 시나리오, 성공/실패·빈 상태 스크린샷.

경계: 독립 QA는 다른 작업자의 동일 구현을 정답으로 베껴 테스트하지 않는다. 기대 결과를 규칙·교육 의도로부터 작성한다.

## 5. 공통 에이전트 지시문

아래 문장을 각 작업자의 지시 첫머리에 붙이고 `[WP 번호]`만 바꾼다.

> 당신은 AIroom 바이브코딩 재설계의 [WP 번호] 담당이다. docs/vibe-redesign-2026-09-26의 문서와 현재 저장소 지침을 먼저 읽어라. 이번 작업 범위와 소유 파일만 구현하고 사용자 미커밋 변경을 보존하라. 저학년은 카드 코딩, 나머지는 3~6학년이며 주 기기는 태블릿·노트북·크롬북이다. 이미 있는 엔진·콘텐츠·데이터는 어댑터로 보존하라. 공통 schema/API를 임의 변경하지 말고 필요 시 변경 제안과 영향 범위를 통합 담당에게 전달하라. mock 성공과 실제 API·실기기 검증을 구분하라. 테스트 없는 완료 주장, 무한 재시도, 유료 호출 예산 미지정, source 전체 재작성, production push를 하지 마라. 변경 이유·테스트 명령/결과·화면 증거·남은 제약을 제출하라.

통합 담당 지시:

> 기능 수보다 학생이 작업을 끝낼 수 있는지 우선하라. WP0 계약을 먼저 고정한 뒤 독립 작업자를 병렬 배정하라. shared 파일은 직접 관리하고 의존 순서대로 통합하라. 새 UI만 보지 말고 생성→수정→실행→저장→재접속을 실제로 검사하라. 실패하면 해당 패킷으로 돌려보내고 완료 수치를 꾸미지 마라. 별도 승인 없는 production 배포를 하지 마라.

## 6. PR·인계 형식

각 PR은 다음을 포함한다.

1. 학생에게 생기는 변화와 구체적인 전후 행동.
2. 변경한 소유 파일·계약 버전·추가 의존성·데이터 이관 여부.
3. 실행한 검사 명령과 성공/실패/미실행. API mock과 실호출 구분.
4. 1366×768·768×1024·1024×768의 화면 또는 해당 비UI trace.
5. 장애/취소/되돌리기 결과와 알려진 한계.
6. 플래그·롤백 방법, 다음 작업자가 알아야 할 계약.

통합 순서: contracts/state → runtime/auth/jobs → shell → cards/studio/generation → assets/learning → QA. merge conflict는 소유자와 통합 담당이 해결하고 다른 에이전트가 대량 정리 커밋을 만들지 않는다. 개별 PR 통과 후 최종 브랜치에서 한 번 전체 핵심 경로를 다시 검증한다.

## 7. 상세 백로그

| 번호 | 우선 | 담당 | 작업 | 완료 조건 |
|---|---|---|---|---|
| B01 | P0 | WP0 | 배포/로컬 기준 정리 | hash·커밋·사용자 diff 보존 |
| B02 | P0 | WP0 | 계약·상태·revision | mock 양방향 소비 |
| B03 | P0 | WP0 | 테스트 명령 복구 | npm test가 실제 검사 |
| B04 | P0 | WP1 | 큰 미션 카드 | 글자·조작 목표 충족 |
| B05 | P0 | WP1 | 태블릿/크롬북 셸 | 주요 동선 잘림 0 |
| B06 | P1 | WP1 | 포커스·IME·모션 | 키보드·터치 모두 완료 |
| B07 | P0 | WP2 | 드롭/탭/정렬 | 중복·잘못된 리스트 쓰기 0 |
| B08 | P0 | WP2 | 도형 목표 비교 | 확대·고스트·차이 보기 |
| B09 | P0 | WP2 | 도형 채점 | 빈 작품 0 및 의미 오답 거부 |
| B10 | P1 | WP2 | 저학년 안내 | 한 번에 한 행동, 56px |
| B11 | P0 | WP4 | 엄격 파싱 | 미지원 줄 diagnostic |
| B12 | P0 | WP4 | AST/블록 왕복 | 의미·nodeId 보존 |
| B13 | P1 | WP4 | 시계·충돌·입력 | 결정적 replay |
| B14 | P0 | WP4 | 자원 상한/정지 | 무한/폭주 시 UI 복구 |
| B15 | P0 | WP3 | 작품 저장·복구 | 새로고침/오프라인 보존 |
| B16 | P1 | WP3 | 공방 템플릿/플레이 | 세 장르 + 미로 어댑터 |
| B17 | P0 | WP3 | 변경 비교·undo | 변경 외 규칙 보존 |
| B18 | P0 | WP5 | 서버 소유 프롬프트 | 학생 모델 지정 차단 |
| B19 | P0 | WP5 | 구조화 패치/검증 | 잘림·형식 오류 적용 0 |
| B20 | P0 | WP5 | bounded repair | 총 3회/40초 예산 |
| B21 | P1 | WP5 | 모델 비교 | holdout 실제 결과 |
| B22 | P0 | WP7 | 소유권·teacher role | 교차 학생 접근 거부 |
| B23 | P0 | WP7 | 분산 제한·큐 | NAT 30명 공정 처리 |
| B24 | P0 | WP7 | 멱등성/CAS | 중복 apply/저장 충돌 복구 |
| B25 | P1 | WP6 | 에셋 adapter | mock/실제 공급자 구분 |
| B26 | P1 | WP6 | 검증·파생본 | 투명도·크기·권리 메타 |
| B27 | P1 | WP6 | 비동기 교체 | 게임 규칙·충돌 불변 |
| B28 | P1 | WP8 | 모드 콘텐츠 이관 | 대표·전체 정답 replay |
| B29 | P0 | QA | 통합/실기기/접근성 | 필수 시나리오 통과 |
| B30 | P0 | 통합 | 파일럿/rollback | 수업 확인·이전 버전 복귀 |
