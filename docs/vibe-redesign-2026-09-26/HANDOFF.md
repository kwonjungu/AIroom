# 바이브코딩 v2 재설계 — 인계 문서 (클라우드 이어서 하기)

작성: 2026-09-26 · 저장소 `kwonjungu/AIroom` · 통합 브랜치 **`vibe/redesign`**

> 클라우드 세션에서 처음 할 말(복사해서 붙여넣기):
>
> `AIroom 저장소의 vibe/redesign 브랜치를 체크아웃하고 docs/vibe-redesign-2026-09-26/HANDOFF.md를 읽은 뒤 "다음 할 일" 1번부터 이어서 진행해. 너는 통합 담당이다.`

## 1. 한 줄 요약

계획서 4종(README·HARNESS-AND-CONTRACTS·PARALLEL-IMPLEMENTATION·ACCEPTANCE-AND-EVALS)에 따라 **WP0·WP1·WP2·WP4·WP5·WP6·WP7 완료·병합**, **WP3(게임 공방 화면)·WP8(거북이·픽셀·미로 이관+E2E)은 진행 중이던 것을 WIP 커밋**으로 남김. 사용자 핵심 요구: **저학년은 카드 코딩**(별까지 가기·도형 겹치기), 3~6학년은 말+블록 게임 공방, 주 기기 태블릿·노트북·크롬북.

## 2. 브랜치 상태

| 브랜치 | 상태 | 내용 |
|---|---|---|
| `vibe/redesign` | **통합 본선** | 아래 완료분 전부 병합 + app.js 통합·라우터 연결 |
| `vibe/wp3-studio` | WIP (미병합) | 게임 공방 UI: 만들기/해보기, 규칙 카드, AI 변경 비교·적용 |
| `vibe/wp8-learning` | WIP (미병합) | 거북이·픽셀·미로 엔진·미션 이관, E2E 러너 |
| `vibe/wp1-shell`, `wp2-cards`, `wp4-runtime`, `wp5-generation`, `wp6-assets`, `wp7-session` | 병합 완료 | 참고용 |

- 분기 기준: 원격 `claude/school-admin-portal-APgza`의 `532bf16` (production 브랜치). 기존 `public/vibecoding.html`(v1)은 사용자 `_wireDropZone` 수정 외 **변경 없음**.
- `vibe/redesign`은 production 브랜치에 병합·배포하지 않았다. **production push·배포는 사용자 승인 필요.**

## 3. 검사 현황 (vibe/redesign, 로컬 Node 24)

| 명령 | 결과 |
|---|---|
| `npm test` (unit+contracts) | 202 + 11 통과, 실패 0 (Node 22에서도) |
| `node --test "tests/vibe/integration/**/*.test.js"` | 48 통과 |
| `npm run eval:vibe:mock` | 35 통과 (AI01~AI08) |
| `node lib/vibe/assets/build-manifest.js --check` | manifest 194항목 일치 |

전부 mock·메모리 KV 기준. **실제 Groq·이미지 API·Upstash Redis·실기기는 미검증.**

## 4. 완료된 것 (무엇이 어디에)

구조·결정은 `WP0-DECISIONS.md`(계약 변경 이력 v1.0→v1.2 포함)가 단일 기준.

- **WP0 계약·상태** `public/vibe-v2/shared/contracts/*`, `state/store.js`: Project/Patch/Job/AssetBrief/ApiError 스키마, 순수 `applyPatch`(원본 불변·revision 충돌 거부), undo/redo·lastGood.
- **WP1 셸** `public/vibe-v2/ui/*`, `styles/*`: 두 시작 경로, 큰 미션 카드, 단계 ①~⑤, 반응형(3열/2열/세로/탭), IME 안전 입력, 접근 가능 dialog, 저장 상태 배지.
- **WP2 저학년 카드** `public/vibe-v2/modes/cards/*`: 별까지 가기 12 + 도형 14 미션, 공정 채점(빈 작품 0%), 먼저/나중에 찍기, 비교 보기 3종, 56px 조작, 하단 고정 실행 영역.
- **WP4 엔진** `public/vibe-v2/shared/{runtime,compiler,templates}/*`: 결정적 60Hz 런타임, 받기·피하기·모으기·미로 템플릿, 의미 검증, 구 DSL 엄격 파서, 캔버스 렌더러.
- **WP5 AI 생성** `lib/vibe/{generation,providers}/*`: 규칙 경로(모델 호출 없음) + Groq 경로, 검증·시뮬레이션 후에만 후보, 호출 ≤3·40초, corpus 120+40 (`tests/vibe/evals/`).
- **WP6 에셋** `lib/vibe/assets/*`, `public/vibe-v2/assets/{manifest.json,swap.js,sfx.js}`: 기존 에셋 우선 매칭, 생성 파이프라인(mock), 파일 검사, 슬롯 변경 시 덮어쓰기 금지.
- **WP7 세션·저장** `lib/vibe/{api.js,kv,http,auth,projects,jobs}/*`, `public/vibe-v2/persistence/*`: 학급/연습 세션(HttpOnly 쿠키), 소유권, revision CAS, 분산 제한, 영속 job·lease, IndexedDB 자동 저장·충돌 사본.
- **통합** `public/vibe-v2/app.js`, `lib/vibe/router.js`, `server.js`의 `/api/vibe` 마운트.

### 실행 방법

```bash
npm install
PORT=3000 node server.js                    # /vibe-v2/ 미리보기 (클라이언트만: 카드 모드·로컬 저장 동작)
VIBE_V2_API=1 VIBE_SESSION_SECRET=<32자+> PORT=3000 node server.js   # /api/vibe/* 활성 (메모리 KV)
```

- `/api/vibe/*`는 `VIBE_V2_API=1`일 때만 켜진다. Vercel에서 Redis 없으면 503(메모리 KV 금지).
- Groq: `GROQ_API_KEY` 하나만 사용. 기본 모델 `openai/gpt-oss-120b`/`gpt-oss-20b`(env `VIBE_GROQ_MODEL_PRIMARY/_LIGHT`).
- 에셋 공급자 기본 `none`. 켜려면 `VIBE_ASSET_PROVIDER`, `VIBE_ASSET_LIVE=1`, 키, 예산 env (WP6 README/보고 참조).
- ⚠ Windows Git Bash에서 curl `-d`에 한글을 넣으면 깨진다 — 한글 요청은 Node fetch 스크립트로 시험할 것.

## 5. 다음 할 일 (순서대로)

> **진행 기록 (2026-09-26 클라우드 세션)**
> - WP3·WP8 WIP 브랜치(`vibe/wp3-studio`, `vibe/wp8-learning`)가 원격에 없어 로컬 PC에서 push 대기 중.
> - 1번의 WIP 무관 부분 완료: `public/vibe-v2/services/generation-client.js` — `connectVibeApi()`(health→세션 확보, 없으면 연습 세션 발급) +
>   HTTP GenerationClient(start/get?after=/watch/cancel/**apply**) + mock 폴백(`withLocalApply`). app.js 연결:
>   서버가 켜져 있으면 persistence에 `createProjectApi()`를 붙여 학급 서버 동기화, store에 `instantiate` 주입.
>   **모드는 후보 적용 시 `ctx.generation.apply(job)`를 쓴다** (서버 apply → 같은 patch를 로컬 store에 적용해 undo 유지 → `attachRemote`로 재PUT 방지).
>   요청 뒤 직접 편집이 있으면 apply는 `{ok:false, reason:'conflict'}`. 테스트: `tests/vibe/integration/int-generation-client.test.js`.
> - 브라우저 확인(1366×768): API 켠 서버에서 카드 미션 편집 → `POST /projects 201 → PUT 200`, 배지 "학급에 저장됨". API 끈 서버는 health 404 → 로컬 저장.
> - Node 22 호환: `lib/vibe/assets/pipeline.js`의 `AbortSignal.timeout`이 이벤트 루프를 붙잡지 않아 WP6 테스트 13개가 cancelled(`npm test` exit 1)
>   → 일반 타이머 + 해제로 교체. Vercel 기본 런타임이 Node 22일 수 있어 코드 쪽을 고쳤다.

1. **WP3 마무리**: `vibe/wp3-studio` WIP를 확인·완성(아래 §7 원 지시문 기준) → `vibe/redesign`에 병합. 병합 시 통합 작업:
   - `app.js`에서 `modes/studio/catalog.js`의 `getStudioCatalog()`를 홈 catalog에 합치기.
   - `createMockGenerationClient()` 대신, `/api/vibe/health`가 ok면 **HTTP GenerationClient**(POST /generations, GET /generations/:id?after=, POST cancel, POST /projects/:id/apply)를 쓰고 아니면 mock으로 폴백하는 클라이언트를 `public/vibe-v2/services/`에 작성. persistence의 `attachRemote`로 서버 동기화 연결.
2. **WP8 마무리**: `vibe/wp8-learning` WIP 완성(§7 원 지시문) → 병합, `modes/learning/catalog.js` 홈 연결, `npm run test:vibe:e2e` 실행 결과 기록.
3. **최종 통합 검증**: 생성→수정→실행→저장→재접속을 실제 브라우저로(ACCEPTANCE §2 UI/SH/ST/OP). 1366×768·1024×768·768×1024 스크린샷, 가로 넘침·터치 크기·콘솔 오류.
4. **사용자 승인 필요 항목** (§6) 처리 후 preview 배포 → 선정 학급 파일럿(ACCEPTANCE §5·§6).

## 6. 사용자 결정·승인 대기

- [ ] **Groq live 평가 예산·키** → `VIBE_EVAL_LIVE=1 VIBE_EVAL_BUDGET_USD=… npm run eval:vibe:live`
- [ ] **Vercel 함수 maxDuration ≥45초** (AI 경로). `vercel.json`에 rewrite 넣지 말 것(CLAUDE.md 사고 이력) — 대시보드 설정 권장.
- [ ] **운영 env**: `VIBE_V2_API`, `VIBE_SESSION_SECRET`, Upstash(기존) — 실제 Upstash에서 Lua CAS·lease·슬롯 동시성 검증 필요.
- [ ] **교사 식별**: 현 교사 세션은 공유 접근 코드라 개인 id가 없음 → 담당 학급을 학급 만든 브라우저 쿠키로 구분 중. 교사 개인 로그인 도입 여부.
- [ ] **에셋 출처**: 커밋 `be4c360`의 27종이 커밋 메시지상 "상용 에셋" — 실제 출처·권리 확인(manifest에는 AI 생성 + 재확인 메모).
- [ ] **이미지 생성**: Object Storage 연결·Gemini 단가 확인·실제 호출 예산.
- [ ] **production 반영 방식**: v2를 `/vibe-v2/` preview로 둘지, `/vibecoding.html` 교체 시점.

## 7. 알려진 제약

- 실기기(iPad·Android·크롬북) 터치·가상 키보드·IME 미검증. 드래그 중 자동 스크롤 없음.
- 1024×768 2열에서 도형 비교 그림 225px(목표 범위 하한 근처).
- 배경 이미지는 800×600로 늘려 그림(4:3 아니면 왜곡).
- WP5 holdout: 규칙 분류기를 전체 corpus 보며 다듬어 규칙 경로 holdout은 오염 — 새 holdout 권장.
- Blockly 블록 편집은 v2에 아직 없음(학습 모드는 텍스트 DSL + 명령 칩).
- 원 작업 지시문(WP1~WP8)은 `PARALLEL-IMPLEMENTATION.md` §4·§5와 이 세션 기록 기준. WP3/WP8 지시 요지: WP3=ST01~ST08 충족(템플릿 4장르 플레이, 규칙 카드 직접 편집, AI 변경 비교 후 적용·undo, simulate로 markRunnable, 옛 게임 읽기, 작은 기기 탭·dockSlot), WP8=거북이·픽셀·미로 순수 엔진·채점·미션 전부 정답 replay/오답 거부, 모드 UI, `tests/vibe/e2e/run.js`.
