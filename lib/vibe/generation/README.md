# WP5 생성·검증·수리 하네스 (`lib/vibe/generation`, `lib/vibe/providers`)

학생이 "사과가 조금 더 천천히 떨어지게"라고 말하면 서버가 **정형 변경(Patch)** 후보를 만들어
검증·시뮬레이션한 뒤 job에 보관한다. LLM은 코드를 쓰지 않고, 허용된 op 목록 안에서 작은 변경만 낸다.
적용은 WP7 `POST /projects/:id/apply`가 서버 보관 후보만 revision CAS로 반영한다.

## 흐름

```
POST /generations ─ V0(세션·소유권·크기·revision·요청 제한·동시 슬롯) ─ job 생성(queued, WP7 store)
   └ 작업자(lease) ─ planning: 분류(classify.js)
        ├ direct    : 명확한 수치·모습 → 규칙 기반 패치 (모델 호출 0)
        ├ template  : 새 게임 + 장르 분명 → instantiateTemplate + params (모델 호출 0)
        ├ unsupported/at_limit/invalid : 대안 2개 등 정직한 안내 (모델 호출 0)
        └ llm_plan / llm_rule : generating → validating → (repairing → validating) — 주 모델
      검증(validate.js): V1 PatchSchema+금지 내용 → V2 applyPatch(사본)+checkStudioSemantics
                         → V4 simulate(seed 고정, 600 tick, 장르 smoke 입력) → V6 의도·보존(diffPrograms)
      → ready(후보 hash = sha256(canonical patch), 학생용 changes·한 문장 summary) / failed / timed_out
```

상한(`GEN_LIMITS`): 공급자 시도 **전체 3회**(생성 1 + 수리 1 + 일시 오류 재시도 1), 총 deadline 40초,
개별 호출 12초(남은 deadline이 더 짧으면 그만큼), 남은 시간이 `minCallMs+reserveMs`(4초)보다 적으면 새 호출 금지,
Retry-After가 5초를 넘거나 deadline을 넘기면 기다리지 않고 "잠시 뒤" 안내. 같은 실패 반복 시 중단.
관리 오류(401/403/모델 없음/키 없음)·권한(금지 op·preset·URL)·예산·미지원은 수리하지 않는다.
재개된 작업자는 `callsUsed`(호출 전에 선기록)를 이어 세므로 재개해도 3회를 넘지 않는다.

## 연결 (통합 담당 — `lib/vibe/router.js`)

```js
import { createGenerationRoutes, createGroqProvider } from './generation/index.js';
import { instantiate } from '../../public/vibe-v2/shared/templates/index.js';

const api = createVibeApi({ express, kv, validateStaffSession, env, instantiate }); // ← instantiate 필수(템플릿 후보 apply)
router.use(createGenerationRoutes({ express, services: api.services, provider: createGroqProvider({ env }), env }));
router.use(api);   // WP5가 먼저: GET /generations/:id 재개 훅이 WP7 응답보다 앞서야 한다
```

- 제공 라우트: `POST /generations` (응답 202 `{jobId, job, pollAfterMs}`)
- `GET /generations/:id` 앞 훅: lease가 만료된 미완료 작업이면 이어서 처리한 뒤 `next()` → 응답은 WP7.
- 조회·취소·apply는 WP7 라우트를 그대로 쓴다(중복 구현 없음).

### env

| 이름 | 필수 | 뜻 |
|---|---|---|
| `GROQ_API_KEY` (또는 `VIBE_GROQ_API_KEY`) | 생성 시 | **키 하나만** 쓴다. `GROQ_API_KEY_2~4`는 읽지 않는다(조직 한도 우회 금지) |
| `VIBE_GROQ_MODEL_PRIMARY` / `_LIGHT` | 선택 | 기본 `openai/gpt-oss-120b` / `openai/gpt-oss-20b` (v1 server.js 현재값) |
| `VIBE_GROQ_STRUCTURED` | 선택 | `json_object`면 strict json_schema 대신 JSON 모드 강제 |
| `VIBE_GROQ_TIMEOUT_MS` | 선택 | 개별 호출 상한(기본 12000, 최대 60000) |
| `VIBE_GEN_INLINE` | 선택 | `0`이면 POST는 queued만 만들고 폴링/작업자가 처리 (기본 1 = 동기 실행) |
| `VIBE_GEN_LIGHT_FOR_SIMPLE` | 선택 | `1`이면 단순 수정에 경량 모델 (평가로 검증 전까지 끔) |
| `VIBE_LLM_DAILY_TOKEN_BUDGET` | 선택 | 조직 일별 토큰 예산(기본 2,000,000). 호출 전 예약·후 정산 |
| `VIBE_SESSION_SECRET` | WP7 | trace의 projectRef HMAC에도 쓴다 |

## 실행 모델 — Vercel 요청 수명 대응

`POST` 응답 뒤 프로세스 메모리의 Promise로 작업을 계속하지 않는다. 선택한 방식:

1. **기본(inline)**: POST 처리 안에서 deadline(40초) 내 동기 실행 후 202 + 결과 job을 돌려준다.
   단순 수정·템플릿은 모델 호출이 없어 수십 ms에 끝난다.
2. **중단 복구**: job은 WP7 job store(KV)에 영속, 실행은 `lease`(15초, 확인 지점마다 heartbeat) 기반
   `runGenerationWorker`. 함수가 플랫폼 제한으로 끊기면 lease가 만료되고, **다음 `GET /generations/:id` 폴링**이
   같은 job을 이어받는다(입력은 `gen:input:{jobId}`, TTL 2시간, 결과가 나오면 삭제). deadline이 지났으면 `timed_out`.
3. `VIBE_GEN_INLINE=0`: POST는 큐잉만, 폴링이 처리. 크론·별도 워커가 생기면 `runGenerationWorker({services, provider, workerId})`
   (jobId 없이)로 회수 대상 생성 작업을 처리할 수 있다.

한계(정직하게):
- 함수 최대 실행 시간이 45초 미만이면 모델 경로(최악 40초)는 inline에서 끊길 수 있다 → vercel 함수 `maxDuration` ≥ 45초 설정 필요(통합 담당, 변경 제안).
  끊겨도 작업·작품은 안전하며 다음 폴링이 이어받는다. 다만 이어받은 폴링 GET도 남은 deadline만큼 오래 걸릴 수 있다.
- 폴링이 없으면(학생이 창을 닫음) job은 lease 만료 뒤 아무도 처리하지 않고 TTL로 사라진다. 비용은 발생하지 않는다.
- 호출 중 취소는 1초 간격 감시로 HTTP 요청을 끊는다. 이미 공급자에 도달한 요청의 과금 여부는 공급자 정책에 따른다.
- 메모리 KV는 단일 프로세스 전용(WP7과 같음). 실제 Upstash에서의 CAS·lease는 WP7 Lua 경로를 그대로 쓴다(미검증 표시 참조).

## 관측(§7)

`trace.js`가 허용 키만 기록한다: requestId, jobId, projectRef(HMAC), baseRevision, templateVersion, promptVersion,
schemaVersion, engineVersion, provider/model, attempt, tokenUsage, elapsedMs, validatorCodes, outcome, path, errorKind.
학생 원문·이름·키는 기록하지 않는다(자유 문자열은 `[filtered]`, 키 문자열은 `[redacted]`).

## 파일

| 파일 | 역할 |
|---|---|
| `providers/groq.js` | fetch 어댑터: 12초 AbortController, length·빈 content·refusal·잘린 JSON 검출, 429 Retry-After·잔여량 헤더, 401/404 관리 오류, usage |
| `providers/capabilities.js` | 모델 capability matrix(json_schema strict / json_object / 최대 출력 / reasoning) |
| `providers/mock.js` | 실제 어댑터 + 가짜 fetch 시나리오(정상/잘림/length/빈/429/500/timeout/401/없는 모델/없는 ID/요청 외 삭제/인젝션) |
| `generation/classify.js` · `vocab.js` | 요청 분류·규칙 기반 패치·한국어 어휘표 |
| `generation/context.js` · `examples.js` | 모델 입력 묶음(예산 1.5k/3k/6k, 절단), 서버 시스템 프롬프트, 검증된 예시 |
| `generation/llm-schema.js` | 모델 출력 strict 스키마(계약 노드 스키마에서 자동 변환)·정규화 |
| `generation/validate.js` | V1·V2·V4·V6, 후보 hash, 학생용 changes·summary |
| `generation/orchestrator.js` | 순수 파이프라인(`runPipeline`) — eval 러너도 사용 |
| `generation/worker.js` · `routes.js` · `budget.js` · `trace.js` | lease 작업자, 라우트, 예산·냉각, 관측 |

## 테스트

```
node --test "tests/vibe/unit/wp5-*.test.js"                  # 어댑터·분류·문맥·검증
node --test "tests/vibe/integration/wp5-*.test.js"           # WP7+WP5 E2E (mock)
npm run eval:vibe:mock                                        # AI01~AI08 + corpus 무결성 + live 러너 dry-run
node tests/vibe/evals/live.js --dry-run                       # oracle mock으로 러너 전체 실행 (모델 품질 아님)
npm run eval:vibe:live                                        # 실제 Groq — 가드 env 없으면 호출 없이 종료(코드 2)
```
