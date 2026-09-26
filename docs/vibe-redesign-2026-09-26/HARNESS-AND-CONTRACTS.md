# AI·게임·에셋 하네스 및 공유 계약

이 문서의 인터페이스·상한·모델 설정은 **신규 구현 목표**다. 현재 코드에 이미 존재하는 기능으로 해석하지 않는다. 숫자는 초기 안전·성능 예산이며 벤치마크로 조정한다.

## 1. 전체 실행 구조

```text
학생: 말 / 그림 선택 / 블록 수정
          ↓
프로젝트 저장소: 최신 revision + 안정적인 nodeId + 실행 가능한 마지막 버전
          ↓
요청 분류: 단순 속성 변경 / 템플릿 조합 / 규칙 추가 / 설명 / 지원 밖 요청
          ↓
서버 정책: 학생 범위 인증 → 사용량 예약 → 해당 기능의 계약·예시만 제공
          ↓
Groq: 구조화된 의도 또는 패치 제안
          ↓
Schema → 의미·권한 검증 → 컴파일 → 결정적 시뮬레이션
          ↓
격리된 브라우저 미리보기에서 입력·첫 프레임·오류 확인
          ↓
revision 일치 시 적용 / 실패 시 제한된 수리 / 기존 버전 유지
          ↓
아이가 해보기 → 바꾸기 → 저장하기

별도 작업: 에셋 요청 → 영속 큐 → 이미지·소리 공급자 → 검사 → 저장 → 대체
```

핵심은 모델에게 정답 코드를 한 번에 기대하지 않고, 적은 변경을 만들게 한 뒤 도구로 검증하는 것이다. 추론 속도와 게임 품질, 렌더링 FPS를 각각 측정한다. Groq를 사용한다는 사실만으로 낮은 품질을 단정하지 않는다.

## 2. 공유 데이터 모델

### 2.1 프로젝트와 단일 상태 원본

```ts
type Mode = 'goal' | 'shape' | 'turtle' | 'pixel' | 'maze' | 'studio';
type Project = {
  schemaVersion: 2;
  id: string;
  revision: number;
  mode: Mode;
  title: string;
  templateId: string | null;
  engineVersion: string;
  capabilityVersion: string;
  program: Program;           // 형식화된 노드, 임의 JS 문자열 아님
  assets: AssetRef[];
  learning: { missionId: string | null; missionVersion: string | null };
  createdAt: string;
  updatedAt: string;
};
type Program = { nodes: ProgramNode[]; entrypoints: string[] };
type ProgramNode = {
  id: string;                 // 코드 편집과 AI 수정 간 유지
  kind: string;               // 실제 계약에서는 노드별 discriminated union
  args: Record<string, unknown>;
  children: string[];
};
type Diagnostic = {
  code: string;
  severity: 'error' | 'warning';
  nodeId: string | null;
  path: string;
  message: string;
  studentHint: string;
};
```

위 타입은 개념 요약이다. 구현 시 `kind:string`/`Record` 그대로 모든 값을 허용하지 않는다. WP0에서 노드별 JSON Schema를 확정하고 `additionalProperties:false`, 필수 필드, 값 범위, 재귀 깊이, 총 크기를 강제한다. 사용자·학급 소유권은 서버 DB의 별도 메타데이터이며 클라이언트 Project 본문을 권한 근거로 삼지 않는다.

블록·텍스트·그림 카드·자연어는 같은 프로젝트의 서로 다른 편집기다. **현재 블록을 반영한 AST**가 생성 요청의 원본이다. 대화 기록만으로 현재 작품을 재구성하지 않는다. AST→블록→AST 의미 동등성 검사를 제공하고 의미 없는 UI 좌표는 비교에서 제외한다.

기존 DSL은 읽기 어댑터로 유지한다. 옛 DSL의 관대한 파싱 결과에는 경고를 붙이고 원문을 보존한다. 새 AI 출력은 엄격하게 검사하며 잘못된 줄을 조용히 지우지 않는다. v1 진도와 작품을 v2로 옮길 때 원본 백업·migrationVersion·복구 경로를 둔다.

### 2.2 정형 변경 명령

범용 JSON Patch로 임의 경로를 수정하게 하지 않고 서버에서 허용한 도메인 작업만 받는다.

```json
{
  "schemaVersion": 1,
  "baseRevision": 7,
  "summary": "생선이 조금 더 천천히 떨어져요.",
  "operations": [
    {
      "op": "setParameter",
      "nodeId": "fish-fall",
      "parameter": "speed",
      "value": 90
    }
  ],
  "assetRequests": []
}
```

서버 계약은 `setParameter`, `addBehavior`, `removeBehavior`, `setAppearance`, `instantiateTemplate`의 union으로 시작한다. 각 작업의 필수 키·타입을 별도로 제한한다. 예의 speed는 새 엔진의 논리 px/초이며 구 엔진의 프레임당 이동량과 직접 섞지 않는다. `fish-fall`은 실제 요청에 제공한 기존 ID여야 한다.

한 응답의 최대 작업 수 12개. 모르는 ID, 다른 프로젝트 ID, 금지 파라미터, 원치 않은 규칙 삭제, 범위 밖 수치, 에셋 URL 직접 삽입은 거절한다. 초기 생성은 검증된 템플릿에 대한 인스턴스화로 시작한다. 복잡한 변경은 현재 초안을 보존하며 두 작업으로 나눠 설명한다.

`baseRevision`이 최신과 다르면 자동 덮어쓰기 금지. 수동 블록 수정이 일어나면 revision이 증가하고 진행 중 AI 요청은 취소하거나 결과를 충돌 상태로 보관한다. 서버에서는 `409 REVISION_CONFLICT`를 반환한다. 원자적 CAS 또는 트랜잭션으로 revision을 검사·기록한다.

## 3. 프로젝트·세션 API 계약

### 3.1 권장 신규 경로

| 경로 | 요청 핵심 | 응답·정책 |
|---|---|---|
| `POST /api/vibe/session` | 학급 초대 코드 또는 연습 저장 요청 | 짧은 수명의 학생 범위 세션. 쿠키는 HttpOnly/Secure, CSRF/Origin 정책 명시 |
| `GET /api/vibe/projects` | 페이지 커서 | 현재 세션 소유 프로젝트만 |
| `POST /api/vibe/projects` | 템플릿·제목·스키마 버전 | 생성 ID/revision. 클라이언트 ownerId 무시 |
| `GET /api/vibe/projects/:id` | 없음 | 소유권/학급 공유 권한 검사 |
| `PATCH /api/vibe/projects/:id` | baseRevision, 검증된 변경 | 새 revision 또는 409 |
| `POST /api/vibe/generations` | projectId, baseRevision, requestId, intentText, mode | 202 + jobId. 모델·토큰·시스템 프롬프트는 받지 않음 |
| `GET /api/vibe/generations/:jobId` | 이후 이벤트 cursor 선택 | 상태·학생용 문구·후보 patch·진단. 소유권 검사 |
| `POST /api/vibe/generations/:jobId/cancel` | requestId | 반복 호출 안전. 취소 뒤 결과 적용 불가 |
| `POST /api/vibe/projects/:id/apply` | jobId, candidateHash, baseRevision | 서버가 보유한 후보만 적용. 클라이언트 후보 재주입 금지 |
| `POST /api/vibe/assets` | projectId, revision, slotId, assetBrief | 202 + jobId, 같은 작업 중복 비용 방지 |
| `GET /api/vibe/assets/:jobId` | 없음 | 준비/검사/완료/실패, 승인된 assetId |
| `GET /api/vibe/progress/me` | 없음 | 내 학습 진도 |
| `PATCH /api/vibe/progress/me` | eventId, missionId/version, 완료 이벤트 | 중복 반영 방지, 서버 허용 필드만 |
| `GET /api/vibe/teacher/classes/:id/progress` | 교사 세션 | 담당 학급만, 학생 토큰 거부 |

공통 실패 응답: `{error:{code,message,retryable,retryAfterMs,requestId}}`. 400 입력, 401 인증, 403 권한, 404 접근 가능한 대상 없음, 409 버전 충돌, 413 크기, 429 할당량, 503 공급자 일시 장애를 구분한다. 학생 메시지는 행동 가능한 한 문장이고 상세는 교사 진단 코드로 분리한다.

계획 기본 상한: intentText 1,000자, API JSON 128KB, 프로젝트 압축 전 256KB, AST 300노드. 모델 입력 예산과 별개다. 업로드 이미지는 별도 서명 업로드 경로를 쓰고 JSON에 base64로 섞지 않는다.

공통 경로 `/api/ai/chat`은 다른 AIroom 기능에 사용되므로 일괄 삭제하지 않는다. 학생 바이브코딩부터 신규 경로로 이전하고, 기존 공개 헤더 경로는 기능 플래그 및 마이그레이션 후 차단한다. 일반 진도 컬렉션 별칭 GET/PATCH/DELETE도 우회 경로가 되지 않게 함께 점검한다.

### 3.2 저장과 오프라인

- 편집 후 800ms debounce로 IndexedDB에 저장, 명시적 저장·탭 비활성화 시 flush 시도. 저장 실패·용량 부족은 조용히 무시하지 않는다.
- 서버 동기화는 revision 단위. `저장 중 / 이 기기에 저장됨 / 학급에 저장됨 / 저장 안 됨`을 구분한다.
- 네트워크 단절에는 기존 프로젝트·템플릿·카드 활동이 동작한다. AI 생성은 로컬 큐의 요청 초안만 보존하고 복구 시 비용 발생 재전송 여부를 명확히 한다.
- 서버 기준 작품 스냅샷 최소 최근 20개를 초기 기본값으로 제안. 실제 보존 수·기간은 예산과 학교 정책에 따라 설정. `마지막 정상 버전`은 별도 포인터다.
- 두 탭·두 기기의 같은 프로젝트 수정은 충돌 사본을 만들어 두 결과를 보존한다. 서버 시각 last-write-wins로 작품을 소실시키지 않는다.
- 서비스 워커를 도입하면 `/vibecoding` 범위의 공개 정적 자산만 캐시한다. 교무실 API·학생 개인정보·인증 응답을 공용 캐시에 넣지 않는다. 기존 페이지 범위 한계가 있으면 새 `/vibecoding/` 경로에서 시작한다.
- 파일 내보내기/가져오기는 버전 있는 JSON, 크기·스키마 검증. 외부 JavaScript 실행 없이 프로젝트를 복구한다.

## 4. Groq 모델 라우팅과 생성 정책

### 4.1 모델 선택은 평가 결과로 확정

현재 구현은 `llama-3.3-70b-versatile`→`llama-3.1-8b-instant` 폴백이다. 유지 모델과 구조화 출력 지원 후보를 **동일 과제·같은 토큰 예산·같은 검증기**로 비교한다. Groq가 노출하는 현재 모델·계정 권한을 실제 배포에서 확인하고 모델 ID를 설정 파일로 관리한다.

공식 문서상 strict 구조화 출력은 일부 모델만 지원하고 다른 모델의 JSON Object 모드와 보장이 다르다. 제공 형식·스트리밍·도구 호출 조합을 capability matrix로 관리한다. 지원하지 않는 조합을 억지로 전송하지 않는다. [Groq 공식 근거](https://console.groq.com/docs/structured-outputs)

| 요청 | 처리 | 모델 역할 |
|---|---|---|
| 색·숫자·선택 카드의 명확한 변경 | 신뢰할 수 있는 UI 명령으로 직접 패치 | 호출 없음 |
| 간단한 자연어 해석 | 제한된 enum/수치 의도 추출 | 검증 통과한 경량 설정 |
| 새 게임 초안 | 장르 템플릿 선택 + 규칙 파라미터 조립 | 코드 전체 대신 계획 출력 |
| 규칙 추가·수리 | 관련 AST와 계약, 최소 예시만 제공 | 품질 통과한 주 모델 |
| 힌트 | 목표·현재 오차와 학년 프리셋 제공 | 짧은 설명. 정답 노출 수준 구분 |
| 미지원 장르 | 가능한 가장 가까운 대안 2개 | 구현됐다고 꾸미지 않음 |

학교에서 이용 가능한 모델이 구조화 출력을 지원하지 않으면 JSON 모드+서버 검증으로 동작시킨다. JSON 형식이 올바르더라도 의미·플레이 가능성은 별도 검증한다.

### 4.2 입력 묶음과 출력 예산

요청 입력은 `학생 의도 + 최신 프로젝트 요약/관련 AST + 적용 가능한 명령 schema + 검증된 예시 최대 2개 + 실패 진단`이다. 전체 대화·전체 엔진 코드를 매번 전송하지 않는다. 최근 대화는 의미 확인용이고 저장된 AST가 진실이다.

초기 예산:

| 처리 | 입력 목표 | 출력 상한 | 제한 |
|---|---|---|---|
| 힌트 | 1,500토큰 이하 | 256~512 | 한 문장 + 선택 2개 |
| 단순 패치 | 3,000 이하 | 1,024 | 작업 1~4개 |
| 템플릿 생성/규칙 추가 | 6,000 이하 | 2,048 | 작업 12개 이하 |
| 수리 | 원 요청 요약 + 실패 위치 중심 | 1,024~2,048 | 동일 실패 반복 시 중단 |

모델별 reasoning 토큰·출력 제한 의미가 다르면 어댑터에서 조정한다. `finish_reason=length`, 빈 content, refusal, 잘린 JSON을 반드시 검사한다. 실패 결과를 “완성”으로 적용하지 않는다. 본문 속 `NEXT:` 같은 자유 텍스트 제어 신호를 JSON 필드로 교체한다. 학생에게 모델의 내부 사고 과정을 요구하거나 표시하지 않고 짧은 변경 이유만 보여준다.

### 4.3 bounded repair와 시간 예산

작업 상태:

```text
queued → planning → generating → validating → ready → applied
                       ↘ repairing → validating
어느 실행 상태에서나 → cancelled / failed / timed_out / superseded
```

기본 1회 생성 + 최대 1회 수리, 공급자 일시 오류 재시도 1회를 포함해 **전체 공급자 시도 최대 3회**, 비용과 시간 한도 안에서만 실행한다. 복잡한 요청을 두 작업으로 나누는 것은 새 사용자 행동과 새 예산이다. 모델·키·수리 루프가 각각 별도 최대치를 가져 호출 횟수가 곱해지는 설계를 금지한다.

초기 총 deadline 40초, 개별 호출 timeout 12초, 나머지는 대기·검사·수리용. 남은 시간이 부족하면 새 호출을 시작하지 않는다. 실제 공급자 p95를 측정해 조정한다. 학생에게는 0.2초 이내 대기 상태, 2초 이내 임시 템플릿·현재 작품을 표시하는 것을 목표로 한다. 이는 AI 응답이 2초 이내라는 보장이 아니다.

수리 입력: 실패 코드, nodeId, 기대 타입/범위, 관련 노드, 유지해야 할 규칙. 실패가 형식·컴파일이면 수리 후보, 권한·예산·미지원 기능이면 즉시 중단. 수리도 기존 프로젝트의 사본에만 수행한다. 검증 실패 시 기존 정상 버전 유지 + 템플릿/블록 편집으로 계속하기.

스트리밍은 학생에게 작업 상태를 전송하는 데 우선 사용한다. 모델이 지원하지 않는 strict JSON 스트리밍을 전제로 짜지 않고 완성된 응답만 파싱한다. 전송 끊김 때 jobId로 재접속·조회한다.

### 4.4 동시 수업과 비용

요청 제한은 IP만으로 하지 않는다. 조직 공급량 + 학교 + 학급 + 학생 + 프로젝트 단위로 분산 토큰 버킷/슬라이딩 윈도우를 적용한다. 같은 학교 NAT의 30명이 서로를 차단하지 않게 한다.

동시 학생 30명, 학생당 2분에 1회 요청이면 기본 15 RPM. 평균 수리율 20%, 호출당 입출력 합계 4,000토큰을 가정하면 약 18 RPM·72,000 TPM의 계획 수요다. 한꺼번에 누르는 시작 버스트 30건은 별도로 큐 처리한다. **계정의 실제 할당량으로 재계산**하고 처리량이 모자라면 템플릿/로컬 편집으로 자연스럽게 전환한다.

Groq 제한은 조직 단위이므로 같은 조직의 키 여러 개를 순환한다고 처리량이 늘지 않는다. `Retry-After`, 요청·토큰 잔여량을 반영하고 429 때 모든 키를 연쇄 소모하지 않는다. [공식 제한 근거](https://console.groq.com/docs/rate-limits)

동시 실행 초기값: 조직 LLM 4, 학생 1, 같은 프로젝트 1. 학급별 공정 큐로 한 반이 전체를 독점하지 않게 한다. 일별 금액 한도·요청당 비용 상한을 서버에서 설정하고 호출 전 예약, 후 실제 usage 정산. 공급자 비용/취소 과금 여부는 어댑터별 기록한다. 임계치 알림은 70/90/100%이며 초과 시 유료 호출만 중단하고 기존 활동은 유지한다.

공유 캐시는 학생 텍스트가 아닌 공개 템플릿·계약·승인된 에셋 중심으로 구성한다. 학생의 생성 결과 캐시는 해당 소유권 범위로 제한하고 프로젝트 revision·모델·프롬프트·계약 버전을 키에 넣는다.

## 5. 실행 검증과 게임 엔진

### 5.1 검증 계층

| 층 | 검사 | 실패 처리 |
|---|---|---|
| V0 입력 | 세션·소유권·크기·비용·revision | 모델 호출 전 거절 |
| V1 구조 | 스키마, 알려진 노드/작업, 데이터 깊이 | 진단 생성 |
| V2 의미 | ID 참조, 정의된 변수, 필수 조작·종료·재시작, 수치 단위, 금지 효과 | 최소 수정 또는 지원 범위 안내 |
| V3 컴파일 | AST → 실행 IR, 블록 왕복, 금지 명령 없음 | 후보 폐기 |
| V4 결정적 시뮬레이션 | seed 고정, 600 tick, 입력 replay, 충돌·점수·목숨·종료 | 재현 가능한 trace로 수리 |
| V5 브라우저 | 첫 프레임, 입력, pause/resume, 런타임 오류, 렌더 시간 | 적용 차단·복구 |
| V6 의도 | 요청한 변경 반영, 기존 규칙 유지 | 승인 전 비교 |

모든 게임의 재미·도달 가능성을 완전 증명할 수 있다고 주장하지 않는다. 정형 템플릿은 장르별 테스트를 제공하고 자유 규칙은 제한된 시뮬레이션 통과와 실제 학생 플레이를 구분한다. 서버의 의미 검증과 클라이언트 미리보기 결과를 혼동하지 않는다. 학급 공유·내보내기에는 서버 검증된 스냅샷만 사용한다.

### 5.2 게임 실행기 계약

```ts
interface GameRuntime {
  load(program: Program, assets: AssetManifest, seed: number): Diagnostic[];
  input(event: NormalizedInput): void;
  step(dtMs: number): RuntimeSnapshot;
  pause(): void;
  resume(): void;
  reset(seed: number): void;
  dispose(): void;
}
```

`NormalizedInput`은 키·터치·포인터를 공통 방향/행동 상태로 바꾼다. `RuntimeSnapshot`은 위치·점수·목숨·상태·진단이며 DOM 노드를 포함하지 않는다. 런타임 코어는 Node 시뮬레이터와 브라우저에서 같은 버전을 쓴다.

- 고정 60Hz 시뮬레이션 + rAF 렌더, 느린 기기는 30fps 렌더 가능. dt 누적 최대 100ms, catch-up 최대 5회. 느려졌다고 이동량·점수 규칙이 달라지지 않게 한다.
- `EVERY`, `WAIT` 등은 단일 가상 시계 스케줄러로 관리. 이벤트별 `setInterval`을 무제한 추가하지 않는다. 탭 숨김·모드 전환 때 일시정지, 복귀 시 밀린 생성 폭탄 방지.
- 위치·속도·크기를 논리 좌표로 유지. 기존 400×300 게임은 버전 어댑터로 보존. 새 엔진은 초기 800×600을 기본으로 하고 렌더러만 가용 화면에 맞춰 조정.
- backing store는 DPR 상한 2, 작은 기기는 1~1.5. 렌더 크기와 포인터 역변환을 같은 transform에서 계산.
- 충돌체는 원/AABB를 명시. 스프라이트 투명 여백과 독립. 빠른 물체는 substep/swept 검사로 관통을 방지.
- 충돌 enter/stay/exit 구분, 수집 제거와 점수 증가는 같은 tick에서 한 번만. 피해 무적 시간과 우선순위는 템플릿의 명시 규칙.
- 키보드 keydown 반복 빈도 대신 눌림 상태로 연속 이동. 입력창·contenteditable에는 게임 단축키 비활성. 방향판 pointerup/cancel/blur에서 해제.
- 시작/플레이/일시정지/성공/실패 상태 전이를 단일 FSM으로 관리. 재시작은 seed·변수·이벤트·타이머·오디오를 모두 초기화.

초기 상한: 활성 엔티티 80개, 파티클 30개, 이벤트 핸들러 32개, 중첩 깊이 8, tick당 명령 2,000개, 실행 작업 시간 4ms. 이 수치는 기기 평가 후 낮추거나 높일 수 있다. 초과를 조용히 잘라내지 않고 안전 일시정지 + 마지막 정상 버전 안내. Worker를 쓰면 watchdog heartbeat와 강제 종료·재생성이 가능해야 한다.

### 5.3 격리와 신뢰 경계

기본안은 화이트리스트 IR 인터프리터이며 `eval`, `new Function`, 임의 import·fetch·DOM 접근을 허용하지 않는다. 실행 무대는 별도 Worker 또는 격리된 iframe에서 동작한다. iframe이 필요하면 `sandbox="allow-scripts"`를 기본으로 하되 불필요한 same-origin/top-navigation/popups 권한을 추가하지 않는다.

메시지는 버전·크기·nonce·schema와 `event.source`를 검사한다. opaque origin의 메시지에 origin 문자열만으로 신뢰를 부여하지 않는다. 에셋은 검증된 manifest에서만 로드하고 세션 토큰·학생 데이터·서버 키를 실행 영역에 주지 않는다. CSP와 리소스 정책을 배포 테스트에 포함한다.

미래에 임의 사용자 코드를 지원한다면 별도의 보안 설계·실행 서비스가 필요하다. 현재의 안전한 DSL 실행기를 임의 코드 샌드박스로 설명하지 않는다.

## 6. 에셋 자동 생성 파이프라인

### 6.1 역할 분리

Groq는 학생 의도·게임 규칙·에셋 설명의 구조화에 사용한다. 이미지·소리 생성은 해당 기능이 있는 별도 공급자 어댑터로 분리한다. 특정 공급자를 이미 연결했다고 가정하지 않는다. 현재 `public/assets/vibe`의 승인된 에셋을 먼저 재사용하고 부족한 슬롯만 생성한다.

버튼·진행 단계·도형·격자·화살표처럼 정확해야 하는 UI는 CSS/SVG/Canvas로 그린다. 생성 이미지에 글자·수학적 정답 도형을 맡기지 않는다. 생성 대상은 캐릭터, 배경, 카드 일러스트, 효과음이다.

### 6.2 AssetBrief와 처리

```json
{
  "schemaVersion": 1,
  "projectId": "p_demo",
  "baseRevision": 8,
  "slotId": "player.appearance",
  "kind": "sprite",
  "subject": "파란 목도리를 한 고양이",
  "stylePack": "toto-world-v1",
  "dimensions": {"width": 512, "height": 512},
  "transparent": true,
  "pose": "front-idle",
  "paletteId": "warm-adventure",
  "textInImage": false
}
```

서버가 작성한 스타일 템플릿 + 정제된 subject로 공급자 프롬프트를 구성한다. 참조 이미지와 seed 지원은 공급자 capability로 확인한다. 실명·학교·학생 번호·사진을 프롬프트에 넣지 않는다. 기존 캐릭터 재사용과 새 스타일 생성의 권리·출처 메타데이터를 기록한다.

상태: `queued → generating → validating → processing → ready`, 실패/취소/기한초과 별도. job은 영속 저장, 작업자는 lease/heartbeat로 소유한다. 재시도 최대 2회와 별도 비용 한도. idempotency key는 사용자 범위+brief hash+공급자+모델+스타일 버전이다.

생성 후 MIME·실제 파일 시그니처·픽셀 수·파일 크기·투명도·빈 그림·잘림·캐릭터 중심·유해 콘텐츠·출처 정책을 검사한다. alpha가 필요하나 미지원이면 검증된 후처리 또는 기존 대체 그림으로 실패 처리한다. 체커보드 배경을 투명으로 오인하지 않는다.

완료 파일을 Object Storage/CDN에 올리고 assetId, sha256, 공급자, 모델, promptVersion, dimensions, license/provenance, 승인 상태를 저장한다. 서명 업로드·다운로드를 쓰며 임의 원격 URL 다운로드는 SSRF allowlist·크기·시간 제한을 통과해야 한다.

배경은 텍스트 없는 16:9/4:3 안전영역, 캐릭터는 중심 anchor와 safe padding, 런타임에는 WebP/PNG 또는 지원 포맷으로 128/256/512 파생본을 제공한다. 효과음은 0.2~1초, 자동 큰 소리 재생 금지, 사용자 제스처 후 오디오 시작.

초기 전달 예산: 스프라이트 파생본 개당 100KB 목표·200KB 상한, 배경 300KB 목표·500KB 상한, 소리 100KB 이하. 초과 파일은 재압축/낮은 해상도 파생본으로 처리한다. 픽셀 수·압축 후 시각 품질과 함께 검수한다.

이미지 완료를 기다리며 게임을 멈추지 않는다. placeholder로 바로 실행하고, 게임을 일시정지하거나 다음 시작 시 외형만 교체한다. collider·점수·규칙을 에셋 이미지 크기에 맞춰 암묵적으로 변경하지 않는다. 그 사이 slotId가 바뀌었거나 요청이 취소됐다면 새 에셋은 보관만 하고 현재 작품에 자동 덮어쓰지 않는다.

### 6.3 Vercel 운영 방식

`POST` 응답 후 프로세스 메모리의 Promise나 setTimeout만으로 작업을 계속하는 구조는 금지한다. 영속 job 저장 + 큐/지원되는 워크플로 + 제한된 작업자 실행을 사용한다. 초기 후보는 현재 Redis와 호환되는 영속 큐 또는 관리형 워크플로이며 WP0에서 실제 요금제·재시도·지연 실행 조건을 확인한다.

작은 생성도 총 deadline을 갖고, 긴 이미지 작업은 공급자 webhook 서명 검증 또는 제한된 polling으로 완료 처리한다. Vercel의 함수 제한은 요금제·런타임에 따라 다르므로 고정 초를 가정하지 않는다. [Vercel 공식 근거](https://vercel.com/docs/functions/limitations)

## 7. 관측과 사고 복구

필수 trace 키: requestId, jobId, projectId의 비식별 참조, baseRevision, templateVersion, promptVersion, schemaVersion, engineVersion, provider/model, attempt, tokenUsage, elapsedMs, validatorCodes, outcome. 학생 원문·이름·학교 정보를 기본 로그에 남기지 않는다. 데이터 수집 최소화·보존·삭제 설정은 교사/운영 관리에 둔다.

대시보드: 첫 생성 유효율, 최종 실행율, 부분 수정 유지율, 수리율, 429, timeout, 평균/p95 지연, 작업당 토큰·추정 비용, 크래시·저장 실패·에셋 실패율. 모델 응답 성공과 실제 플레이 성공을 별도 시계열로 분리한다.

회로 차단기: 특정 공급자가 연속 실패하면 짧은 냉각 시간 후 제한된 probe. 다른 공급자 전환이 허용되지 않았으면 임의 유료 공급자를 추가하지 않는다. 콘텐츠·프롬프트·엔진 버전을 feature flag로 되돌릴 수 있게 한다. 데이터 스키마는 최소 한 버전 이전을 읽을 수 있도록 유지한다.

서버 검증을 통과한 마지막 정상 버전, 학생 로컬 작업, 실패 후보를 별도로 보관한다. 실패 보고에 requestId만 복사하면 담당자가 개인정보 없이 단계별 원인을 볼 수 있어야 한다.
