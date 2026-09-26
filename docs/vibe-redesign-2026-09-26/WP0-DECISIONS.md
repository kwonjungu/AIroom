# WP0 확정 사항 (통합 담당)

작성: 2026-09-26 · 브랜치 `vibe/redesign` · 기준 커밋 `aff1a46` (원격 `532bf16` + 사용자 `_wireDropZone` 수정 + 계획서)

모든 작업자는 이 문서와 `public/vibe-v2/shared/contracts/*`를 **고정 계약**으로 취급한다. 바꾸고 싶으면 통합 담당에게 제안하고, 승인되면 `CONTRACT_VERSION`을 올린다.

## 1. 기준선

- 로컬 체크아웃은 원격보다 62커밋 뒤였다. `public/vibecoding.html`은 원격과 동일했으므로 원격 최신(`532bf16`)에서 분기하고 사용자 수정만 얹었다.
- `vibe/redesign`은 upstream을 추적하지 않는다. **push·배포는 사용자 승인 전 금지.**
- 기존 `public/vibecoding.html`은 v1으로 그대로 둔다. v2는 별도 경로로 개발한다.

## 2. 경로·모듈 형식

| 계획서 경로 | 실제 경로 | 이유 |
|---|---|---|
| `shared/vibe/*` | `public/vibe-v2/shared/*` | Vercel CDN이 `public/`을 정적 서빙하고, Node도 같은 파일을 ESM으로 import할 수 있다. server.js 정적 설정·vercel.json 수정 불필요(CLAUDE.md: rewrite 금지) |
| `public/vibe-v2/*` | 동일 | v2 preview: `/vibe-v2/` (공개 링크 없음, `noindex`) |
| `lib/vibe/*` | 동일, **ESM** (`lib/vibe/package.json` type:module) | server.js(CJS)는 `/api/vibe`에서 `import()`로 지연 로드 |
| `tests/vibe/*` | 동일, ESM, `node:test` | 추가 의존성 없음 |

- 브라우저 모듈: 빌드 없음, 네이티브 ES modules, JSDoc 타입. 외부 의존성 추가 금지(추가 필요 시 통합 담당 승인).
- `public/vibe-v2/shared/`에는 **서버 비밀·키·서버 전용 로직을 두지 않는다**(전부 공개된다).
- 서버 API는 `VIBE_V2_API=1` 환경변수일 때만 활성. 기본 404.

## 3. 계약 파일

| 파일 | 내용 |
|---|---|
| `shared/contracts/validate.js` | 의존성 없는 JSON Schema 부분 구현 (모르는 키워드는 예외) |
| `shared/contracts/nodes.js` | 모드별 노드 kind·args 스키마, `EDITABLE_PARAMS`, `SINGLETON_KINDS`, 논리 좌표 800×600 |
| `shared/contracts/schemas.js` | Project / Patch / Job / AssetBrief / Diagnostic / ApiError, `LIMITS`, `validateProject` |
| `shared/contracts/patch-apply.js` | `applyPatch`(순수, 원본 불변, 실패 시 기존 유지), `diffPrograms` |
| `shared/contracts/interfaces.js` | 모드 생명주기, ShellApi, GenerationClient, GameRuntime (JSDoc) |
| `shared/contracts/fixtures.js` | 받기 게임·별까지 가기·반복·집 짓기·구 공방 예제 |
| `state/store.js` | 단일 상태 원본: revision, undo/redo(50), lastGood, saveState |
| `mocks/generation-mock.js` | GenerationClient mock: success / invalid / timeout / providerDown / slow |

### 노드 설계 요지

- **공방(studio-2)**: `world`, `player`, `spawner`, `onTouch`, `stats`, `winWhen`, `loseWhen`, `mazeMap`. 네 장르(받기·피하기·모으기·미로)를 이 조합으로 표현한다. 속도는 px/초.
- **별까지 가기(goal)**: `move`, `turnLeft`, `turnRight`, `repeat{times}`(children).
- **도형 겹치기(shape)**: `stamp{shape,anchor 1~9,color,size S/M/L}`. **배열 순서 = 찍는 순서 = 나중 것이 위.**
- **거북이·픽셀·미로·옛 공방 작품**: `legacySource{language, source}` — 원문 보존, 기존 엔진 어댑터로 실행.
- 노드 ID는 `^[a-z][a-z0-9_-]{0,39}$`. AI·블록·카드 편집 사이에서 유지된다.

### 저장소 규칙

- 모든 변경은 `store.applyPatch` 또는 `store.replaceProgram`을 거친다. 모드가 프로젝트 객체를 직접 수정하지 않는다.
- undo/redo도 revision을 올린다 → 진행 중 AI 요청의 `baseRevision`이 자동으로 무효가 된다(AI06).
- 실행 검증 통과 시 `markRunnable(revision)` → `마지막으로 잘 된 작품` 복구 지점.

## 4. 명령

```
npm test                     # unit + contracts
npm run test:vibe:unit
npm run test:vibe:contracts
npm run test:vibe:integration
```

`test:vibe:e2e`, `eval:vibe:*`는 해당 WP가 만든다. 존재하지 않는 명령을 통과했다고 보고하지 않는다.

## 5. 작업자 공통 규칙

- worktree에서 자기 소유 경로만 수정. `server.js`, `package*.json`, `vercel.json`, `public/vibecoding.html`, `shared/contracts/*`, `state/*`는 통합 담당만.
- 새 테스트는 `tests/vibe/<unit|integration|contracts>/<wp>-*.test.js` 파일명으로 추가(충돌 방지).
- 보고: 변경 파일, 실행한 명령과 결과(통과/실패 수), mock/실제 구분, 남은 제약.

## 6. 계약 변경 이력

### v1.1.0 (2026-09-26, WP4·WP7 제안 반영)
- `spawner.refill`(boolean, 선택, 기본 true) 추가 — 보충 없는 고정 배치 표현. scatter의 `speed`는 "8방향 표류 후 벽 반사, 0=정지"로 확정.
- `winWhen.value`는 `reachedExit`에서 무시(0 권장).
- `ApiError.error.details`(선택): `latestRevision`, `diagnostics`만 허용. 오류 코드 `JOB_NOT_APPLICABLE`(409) 추가.
- `opts.instantiate`가 `{diagnostics}`를 돌려주면 applyPatch가 그 진단을 그대로 전달.
- RuntimeSnapshot 선택 확장: `timeLeftMs`, `invincible`, `livesEnabled`, `background`, `maze`.
- 런타임 해석 규칙(WP4 확정): onTouch 효과는 enter 때만, 동시 종료 우선순위 livesZero > win > timeUp, `timeUp` 규칙 없이 timeLimitSec만 있으면 제한 없음(경고), 미로는 S 칸에서 시작.
- 교사 식별: 현 교사 세션에 개인 id가 없어 담당 학급은 학급 생성 브라우저의 서명 쿠키(`vibe2_t`)로 구분 — 사용자 결정 대기.

### v1.2.0 (WP5 제안)
- Patch `setParameter.value`에 boolean 허용 (`spawner.refill` 수정 가능).
- 라우터 mount 순서: 생성 라우트(WP5) → WP7 api → 에셋(WP6). `createVibeApi`에 WP4 `instantiate` 주입.
- 기본 Groq 모델은 v1 실제 동작과 같은 `openai/gpt-oss-120b`/`gpt-oss-20b` (llama-3.x는 2026-09 목록에서 사라졌다는 v1 주석). env `VIBE_GROQ_MODEL_PRIMARY/_LIGHT`로 교체. 키는 `GROQ_API_KEY` 하나만 사용(키 회전 안 함).
