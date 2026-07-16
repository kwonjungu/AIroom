# 저학년 카드 코딩 모드 — 설계 문서 (구현 착수용)

> 대상 파일: `public/vibecoding.html` (단일 사본, 약 4753줄, Blockly 기반 SPA)
> 목적: 저학년(1~2학년)용 **카드 코딩** 모드 2종을 추가한다. 기존 4모드(터틀/픽셀/미로/스튜디오)와 달리 **Blockly를 쓰지 않고** 그림 카드 레일을 새로 만든다.
> 이 문서는 **다중 에이전트 병렬 구현**을 전제로 작성됨. 작업 패키지(WP)별 계약(contract)·삽입 지점·함수 시그니처·콘텐츠·테스트를 확정한다.
> 작성: 2026-07-16 설계 세션 (구현은 다음 세션)

---

## 0. 확정된 제품 결정 (이번 설계 세션에서 사용자와 확정)

| 항목 | 결정 |
|---|---|
| 입력 방식 | **커스텀 그림카드 레일** (Blockly 미사용). 팔레트에서 카드를 하단 트랙에 드래그/탭 |
| 모드1 (목표 도착) | 상대방향 카드: `앞으로 / 왼쪽돌기 / 오른쪽돌기 / 반복 / 도착`. 캐릭터 시점 회전 → **미로 엔진 계열** |
| 모드2 (도형 겹치기) | 마름모·직사각형·삼각형·원을 **순서대로 겹쳐 찍어** 목표 그림 완성. 나중 카드가 앞을 덮음. 난이도별: **쉬움=순서 배열 / 어려움=도형 선택 배치** |
| 안내 | 토토 캐릭터 그림 + 한 줄 말풍선(+선택적 TTS 음성). **AI 채팅 없음** |
| 규모 | 모드별 **10~12미션**, 순차→반복(모드1)/난이도 상승(모드2) |
| 학년 | 1~2학년 전용 (읽기·타이핑 최소화) |
| **바이브코딩(AI 자연어→코드) 요소** | **전면 제외.** Groq/`sendChat`/프롬프트 경로 미사용. 카드 조작만으로 완결 |
| **에셋 정책** | 카드 아이콘·캐릭터·배경·UI는 **이미지 생성(PNG) 에셋**으로 톤 통일 → 프롬프트는 별도 파일 `LOWGRADE_ASSET_PROMPTS.md`에 수집. **코드로 만든 인라인 SVG는 최소화**(모드2 도형 렌더링만 예외 = 기능상 캔버스 필수) |

---

## 1. 기존 아키텍처 요약 (탐색으로 확인, 삽입 지점 근거)

- **단일 HTML 파일** + 인라인 CSS/JS. 프레임워크 없음(바닐라). Blockly 12 CDN + Google Font *Jua*.
- **3분할 레이아웃**: 좌(캔버스/보드 35%) · 중(Blockly 워크스페이스 35%) · 우(채팅 30%).
- 모드는 **명시적 객체 없이** `currentMode` 문자열 + 곳곳의 `if(currentMode===...)` 분기로 구현. 각 모드마다:
  미션 배열 · 챕터/스토리 · Blockly 블록/툴박스 · `workspaceToDSL` 분기 · DSL 파서/실행 엔진 · 채점 함수 · (선택) AI 프롬프트.
- **핵심 삽입 지점(줄번호는 대략치, 구현 시 앵커 문자열로 재확인)**:

| 기능 | 위치(대략) | 비고 |
|---|---|---|
| 모드 탭 버튼 | 486~489 | `data-mode`, `confirmSwitchMode(mode,this)` |
| 타이틀 화면 모드 카드 | 660~684 | `enterMode('mode')` |
| `switchMode(mode,btn)` | 921~985 | 헤더/컨트롤/뷰 토글 + 툴박스 스왑 + 리셋 + `openMissionSelector` |
| Blockly 블록 정의 | 2425~ | `Blockly.defineBlocksWithJsonArray` |
| 툴박스 정의 | 2514~ | `TURTLE_TOOLBOX` 등 |
| `workspaceToDSL()` | 2564~ | 블록트리→DSL 텍스트 |
| `runCode()` 디스패처 | 2884~ | 모드별 실행 분기 |
| 미션 배열 | 3418~ (`TURTLE_MISSIONS`), 3711~ (`MAZE_MISSIONS`) | |
| 챕터/스토리 | 3635~ (`TURTLE_CHAPTERS`/`TURTLE_STORY`) | |
| `getMissions/getChapters/getCompleted` | 3935~3957 | 모드 분기 |
| 진도 저장 (localStorage) | 3940~3948 | `*_completed`, `*_stars` |
| `openMissionSelector`/`renderWorldMap`/`selectMission` | 3994 / 4001 / 4188 | 월드맵 |
| `enterMode` / `syncFromServer` | 4719 / 4742 | 학생 식별·서버 진도 |
| 미로 엔진 (재사용 대상) | 1546~2050 | `mazeState`, `parseMazeDSL`, `executeCommands`, `renderMazeBoard`, `runMaze`, `checkMazeMission` |
| 픽셀 일치율 (재사용 참고) | `updateMatchMeter`, `renderPixelGrid` | 도형 겹침 채점의 참고 모델 |
| 효과음 | `playSfx(name)` | WebAudio 합성 7종 |

---

## 2. 새 모드 식별자 & 명칭

| 모드 | `currentMode` id | 탭/카드 명칭 | 헤더 그라디언트 |
|---|---|---|---|
| 목표 도착 | `'goal'` | 🎯 별까지 가기 | `linear-gradient(135deg,#00897B,#26C6DA)` (청록) |
| 도형 겹치기 | `'shape'` | 🔺 도형 겹치기 | `linear-gradient(135deg,#F4511E,#FFB300)` (주황) |

두 모드는 `isLowgrade = (mode==='goal'||mode==='shape')`로 함께 분기(레이아웃 전환 공통).

---

## 3. 공유 서브시스템 — 카드 레일 (Card Rail)

두 모드가 공유하는 **신규 UI**. Blockly를 대체한다. 카드는 최종적으로 DSL 텍스트를 생성하여 기존 실행/채점 파이프라인과 접속한다.

### 3.1 레이아웃 전환

`currentMode`가 `goal`/`shape`일 때:
- **Blockly 패널 숨김** (`.blockly-panel` → `hidden`), `workspace.updateToolbox` **호출 안 함**.
- **우측 채팅 패널 → 가이드 패널**(WP4)로 교체.
- **무대(좌측)** 확대 + **하단 카드 레일**(팔레트+트랙) 표시.

DOM 골격(신규):
```
#lowgradeStage           // 무대 래퍼 (goal/shape 공통 컨테이너)
  #goalStage   (hidden)  // 미로형 격자 보드 (모드1)
  #shapeStage  (hidden)  // 도형 캔버스 + 목표 미니뷰 (모드2)
#cardRail                // 하단 레일 (공통)
  #cardTrack             // 배치된 카드들(실행 순서)
  #cardPalette           // 소스 카드 팔레트
  #cardRailBtns          // ▶실행 / ↺비우기 / ⏪한장 빼기
#guidePanel              // 우측 캐릭터 안내 (WP4)
```

### 3.2 데이터 모델 (계약 — 모든 에이전트 공유)

```js
// 팔레트 카드 정의 (모드별로 config 배열 제공)
// { type, icon, label, color, hasCount?:bool, isContainer?:bool }

// 트랙에 배치된 카드 인스턴스
// 단순 카드:   { type:'move' }
// 카운트 카드: { type:'repeat', count:2, body:[ ...카드 인스턴스 ] }   // 컨테이너
// 도형 카드:   { type:'stamp', shape:'rhombus', anchor:5, color:'#E53935' }

let cardTrack = [];        // 최상위 트랙 (배열)
let cardPaletteCfg = [];   // 현재 모드의 팔레트 정의
```

### 3.3 API (WP1이 구현, 시그니처 고정)

```js
function initCardRail(paletteCfg, opts)   // 모드 진입 시 팔레트/트랙 초기화. opts:{allowRepeat, maxCards}
function renderCardPalette()              // #cardPalette 그림
function renderCardTrack()                // #cardTrack 그림 (중첩 body 재귀 렌더)
function cardTrackToDSL()                 // cardTrack → DSL 텍스트 (아래 문법). 모드별 매핑 테이블 사용
function resetCardTrack()                 // 트랙 비우기
// 상호작용: 팔레트→트랙 드래그(HTML5 DnD)+포인터/터치 폴백, 탭하면 트랙 끝에 추가,
//           트랙 카드 탭=삭제 / 드래그=순서 이동, repeat 내부 드롭존 + 카운트 스테퍼(−/＋)
```

**DnD 규칙(저학년 UX)**: ①팔레트 카드 **탭 = 트랙 끝에 추가**(드래그 필수 아님) ②트랙 카드 **길게 눌러 드래그 = 순서 이동** ③트랙 카드 **탭 = 제거**(확인 팝 없이, 되돌리기 ⏪ 버튼 제공) ④`repeat` 카드는 내부에 **점선 드롭존** + 상단 **−/＋ 카운트**(1~5). 반복 중첩은 1단계까지만 허용.

### 3.4 DSL 문법 (계약)

**모드1 (goal)** — 미로 호환:
```
MOVE
TURN_LEFT
TURN_RIGHT
REPEAT n {
  ...body...
}
```
카드→DSL 매핑: `move→MOVE`, `turnL→TURN_LEFT`, `turnR→TURN_RIGHT`, `repeat n {body}→REPEAT n { ... }`.
※ '도착(goal)' 카드는 넣지 않음 — G칸 도달 즉시 성공(미로 엔진 전제 재사용). 팔레트의 ⭐는 "목표" 안내용 비활성 칩으로만 표시.

**모드2 (shape)** — 신규:
```
STAMP <shape> <anchor> <color>
```
- `shape` ∈ `rhombus|rect|tri|circle`
- `anchor` ∈ `1..9` (무대를 3×3 앵커로 분할, 5=중앙)
- `color` ∈ 팔레트 HEX (예: `#E53935 #1E88E5 #FDD835 #43A047 #8D6E63 #FFFFFF`)
- **반복 없음**(순차 개념에 집중). 한 줄=한 카드=한 도장.

### 3.5 CSS 토큰 (기존 `:root` 확장, WP0가 추가)
```css
--card-w:72px; --card-h:96px; --card-radius:14px;
--rail-bg:#EEF6F9; --rail-slot:#ffffff; --rail-border:#B3C7D6;
--card-shadow:0 4px 0 rgba(0,0,0,.18),0 6px 12px rgba(0,0,0,.2);
```
카드는 큰 아이콘(48px)+짧은 한글 라벨(Jua). 색상 채도 높게, 터치 타깃 ≥64px.

---

## 4. 모드1 — 목표 도착 (goal)

### 4.1 엔진 전략: 미로 엔진 재사용
기존 미로(1546~2050)에서 **보석/PICK/IF WALL을 뺀 축약본**. 재사용 방식 2안 중 택1(WP2가 결정, 권장 A):
- **A(권장)**: 미로 파서/실행/렌더를 그대로 쓰되 goal용 얇은 래퍼. `mazeState` 스키마 재사용(gems 빈 Set). `parseMazeDSL`은 `MOVE/TURN_LEFT/TURN_RIGHT/REPEAT`만 나오므로 그대로 동작. 렌더만 `renderGoalStage`로 저학년 톤(큰 셀, 별 목표) 커스터마이즈.
- B: `parseGoalDSL/executeGoal/renderGoalStage`를 독립 구현(중복↑, 충돌↓).

### 4.2 격자 맵 표기 (미로와 동일 ASCII)
`#`=벽, `S`=시작, `G`=목표(⭐), `.`=바닥. 시작 방향 `startDir` 필드로 지정(기본 `'up'`).

**캐릭터(확정)**: 터틀 재사용 안 함 → **신규 "우주 로버"**. 톱다운 스프라이트, **헤드라이트=앞쪽**으로 비대칭이라 회전 시 방향이 분명히 읽힘. 엔진은 단일 스프라이트를 `ctx.rotate(heading)`로 그려 **돌면 모습이 바뀜**(4방향 개별 프레임은 선택). 에셋: `rover-top.png`(`LOWGRADE_ASSET_PROMPTS.md` §3).

### 4.3 콘텐츠 — `GOAL_MISSIONS` (10~12개, 난이도 램프)

| id | 제목 | 개념 | 맵 (위→아래 행) | startDir | 정답(요지) | par |
|---|---|---|---|---|---|---|
| 1 | 곧게 가기 | 순차 | `#G#` / `#.#` / `#S#` | up | MOVE×2 | 2 |
| 2 | 조금 더 | 순차 | `#G#`/`#.#`/`#.#`/`#S#` | up | MOVE×3 | 3 |
| 3 | 오른쪽으로 | 회전 | `#..G` / `#..#` / `S...`(하단행) | up | MOVE, TURN_RIGHT, MOVE×2 | 4 |
| 4 | 왼쪽으로 | 회전 | (거울형 L) | up | MOVE, TURN_LEFT, MOVE×2 | 4 |
| 5 | 계단 1 | 순차+회전 | 지그재그 | up | 6~7장 | 6 |
| 6 | 계단 2 | 순차+회전 | 더 긴 지그재그 | up | 8~9장 | 8 |
| 7 | 똑같이 세 번 | **반복 도입** | 일자 6칸 | up | REPEAT 3 { MOVE MOVE } 또는 MOVE×6 | 2(반복) |
| 8 | 네모 돌기 | 반복+회전 | 정사각 순환 경로 | up | REPEAT 4 { MOVE TURN_RIGHT } 변형 | 소 |
| 9 | 긴 복도 반복 | 반복 | 일자 8칸 | up | REPEAT n { MOVE } | 소 |
| 10 | 반복+꺾기 | 반복+회전 | 계단형 | up | REPEAT k { MOVE TURN } | 소 |
| 11 | 도전 미로 | 종합 | 6×6 미로 | up | 반복 최적화 | 소 |
| 12 | 자유 도전 | 종합 | 6×7 미로 | up | — | 소 |

> 맵 3~12는 콘텐츠 에이전트가 위 규격으로 확정 생성(각 맵은 **해가 존재하고** par는 최적 카드 수). 생성 후 반드시 시뮬 테스트(WP6)로 "정답 존재+par 달성" 검증.

### 4.4 채점 — `checkGoalMission(reached, cardCount)`
- `reached`(G칸 도달) 실패 시 재도전 안내.
- 성공 시 별: `cards ≤ par`→⭐⭐⭐, `≤ par+2`→⭐⭐, 그 외 ⭐. (미로 par 채점 재사용)
- 저장: `goal_completed`, `goal_stars`.

### 4.5 팔레트 config (goal)
```js
const GOAL_PALETTE = [
  {type:'move',  icon:'⬆', label:'앞으로',    color:'#43A047'},
  {type:'turnL', icon:'↺', label:'왼쪽돌기',  color:'#1E88E5'},
  {type:'turnR', icon:'↻', label:'오른쪽돌기',color:'#1E88E5'},
  {type:'repeat',icon:'🔁',label:'반복',      color:'#FB8C00', hasCount:true, isContainer:true},
];
// initCardRail(GOAL_PALETTE, {allowRepeat:true, maxCards:20})
// 미션 1~6은 repeat 카드 숨김(옵션으로 필터), 7부터 노출.
```

---

## 5. 모드2 — 도형 겹치기 (shape)

### 5.1 엔진: 도형 스탬프 캔버스 (신규)
무대 = 정사각 캔버스(예 360×360), 3×3 앵커(anchor 1~9, 셀 중심 좌표). 실행하면 STAMP 목록을 **순서대로** 캔버스에 그림 → 나중 도형이 앞을 덮음.

도형 그리기 헬퍼(WP3):
```js
function drawShape(ctx, shape, anchor, color, size)  // rhombus/rect/tri/circle
function anchorXY(anchor, canvasSize)                // 1..9 → {x,y}
function renderShapeCanvas(stampList, ctx)           // 순서대로 draw
function renderShapeTarget()                         // 목표 미니뷰 (상시 표시, 픽셀모드 renderTargetMini 참고)
```

### 5.2 난이도 2종
- **쉬움(easy)**: 미션이 카드 세트를 **정해서 제공**(shape+anchor+color 고정). 팔레트=그 카드들(섞인 순서). 학생은 **순서만** 배열. → 순차구조 순수 집중.
- **어려움(hard)**: 팔레트=도형 4종(rhombus/rect/tri/circle). 카드를 트랙에 놓으면 **앵커(3×3 탭)+색(스와치)** 선택 미니 컨트롤 표시. 학생이 도형·위치·색·순서 모두 구성.

### 5.3 콘텐츠 — `SHAPE_MISSIONS` (10~12개)
각 미션은 **정답 스탬프 시퀀스** `target`을 가진다. 예시:

```js
// 쉬움 예: '집' (직사각 몸통 위에 삼각 지붕) — 순서 바꾸면 지붕이 몸통에 가림
{ id:1, title:'집 짓기', level:'1학년', difficulty:'easy',
  target:[ {shape:'rect', anchor:5, color:'#8D6E63'},
           {shape:'tri',  anchor:2, color:'#E53935'} ],
  // cards = target을 섞어 제공 (같은 세트, 순서만 다름)
}
// 쉬움 예: '눈사람' 큰원(아래)→작은원(위)…(size는 anchor로 대체하거나 target에 size 필드 추가)
// 어려움 예: 목표 그림만 제시, 팔레트에서 도형 골라 재현
```

**규격 결정(WP3 확정 필요)**: 도형 크기 차이가 필요하면 `target` 원소에 `size:'L'|'M'|'S'` 추가하고 `drawShape`가 size 반영. 앵커만으로 표현 가능한 미션 우선 설계.

미션 램프: 1~4 쉬움(도형 2~3장, 순서 배열) → 5~8 쉬움(3~4장, 겹침이 결과를 크게 바꾸는 그림) → 9~12 어려움(도형 선택 배치).

### 5.4 채점 — `checkShapeMission()` via `compareShapeCanvas(studentList,targetList)`
- 두 시퀀스를 **오프스크린 캔버스**에 각각 렌더 → **다운샘플 픽셀 비교**(예 40×40 격자, 셀 대표색 일치율). 픽셀모드 `updateMatchMeter` 개념 재사용.
- `match% ≥ 98`(쉬움, 사실상 완전일치) / `≥ 92`(어려움, 근사 허용) → 성공.
- 별: 시도 횟수/실행 횟수 기반(예 1회 성공 ⭐⭐⭐). 저장: `shape_completed`, `shape_stars`.
- **실시간 일치율 미터**(선택): 실행 시 match% 표시로 피드백.

### 5.5 팔레트 config (shape)
```js
// easy: 미션.cards 를 그대로 팔레트로 (재배열 전용, 각 카드에 shape/anchor/color 박혀 있음)
// hard:
const SHAPE_PALETTE = [
  {type:'stamp', shape:'rhombus', icon:'🔷', label:'마름모', color:'#1E88E5'},
  {type:'stamp', shape:'rect',    icon:'⬛', label:'네모',   color:'#8D6E63'},
  {type:'stamp', shape:'tri',     icon:'🔺', label:'세모',   color:'#E53935'},
  {type:'stamp', shape:'circle',  icon:'⭕', label:'동그라미',color:'#FDD835'},
];
// hard 카드는 트랙에서 앵커(3×3)·색 편집 컨트롤 노출
```

---

## 6. 가이드 패널 (캐릭터, WP4)

- 우측 채팅 패널 자리에 `#guidePanel`: 토토 그림(`toto-hello.svg`/`toto-success.svg` 스왑) + **한 줄 말풍선** + `💡힌트` 버튼.
- 미션별 안내/힌트 텍스트: `GOAL_STORY`/`SHAPE_STORY`(미션 id 키 객체, 기존 `*_STORY` 패턴). 필드: `{ intro, hint }`(수학돋보기 `math`는 선택).
- **바이브코딩(AI 자연어→코드) 요소 전면 제외**: `sendChat`/Groq 호출 경로 이 모드에서 완전 비활성. 안내는 **미션에 하드코딩된 정적 한 줄**만(AI 생성 아님).
- 캐릭터는 **생성 PNG**(토토 포즈, `LOWGRADE_ASSET_PROMPTS.md`) 스왑. 코드 SVG 미사용.
- **선택 TTS**: `speechSynthesis`로 한국어 음성 재생(`lang='ko-KR'`), 헤더 🔊 토글과 연동(`vibe_muted` 존중). 비지원 브라우저는 조용히 무시.

---

## 7. 통합·영속·월드맵 (WP5)

- `switchMode`에 `isGoal/isShape/isLowgrade` 분기: 레이아웃 토글(Blockly/채팅 숨김, 레일/가이드 표시), 툴박스 스왑 **건너뜀**, `initCardRail(모드팔레트)` + 무대 초기화 호출.
- `runCode()` 분기: `if(isLowgrade){ const dsl=cardTrackToDSL(); goal→runGoal(dsl); shape→runShape(dsl); }` (Blockly `workspaceToDSL` 미사용).
- `getMissions/getChapters/getCompleted/saveStars`에 `goal`/`shape` 분기 추가.
- `openMissionSelector/renderWorldMap/selectMission`이 새 모드 미션/챕터를 렌더하도록 확장(월드맵 노드·잠금 `isUnlocked` 재사용).
- **챕터/스토리**: `GOAL_CHAPTERS`/`SHAPE_CHAPTERS`(행성 1~2개), `GOAL_STORY`/`SHAPE_STORY`.
- **에셋(정책 갱신)**: **모드2 도형 렌더링만 캔버스 코드**(기능 필수). 그 외 카드 아이콘·캐릭터·배경·별/잠금/체크·앵커 픽커 배경 등은 **생성 PNG 에셋**으로 톤 통일 — 프롬프트는 `LOWGRADE_ASSET_PROMPTS.md`에 수집. **코드 인라인 SVG는 최소화**(불가피할 때만). 카드 팔레트 config의 `icon` 필드는 잠정 이모지로 두되, 에셋 준비 시 `img` 경로로 교체(터틀 `drawStampAt` 이모지→Image 교체 패턴 재사용).
- **서버 진도**: `vibe-progress` 컬렉션에 `goal`/`shape` 모드 id 반영(클라 저장 키와 서버 동기화 지점 `syncFromServer`).
- **타이틀 화면**: 저학년 카드 2개를 별도 섹션("저학년 카드코딩")으로 묶어 노출 권장.

---

## 8. 테스트 (WP6) — 기존 `_check/` 스위트에 추가

기존 규칙: **vibecoding 수정 시 6종 스위트 전부 실행**. 신규 추가:
- `_check/goal-sim-test.js` — 각 `GOAL_MISSIONS` 맵에 대해 정답 DSL이 G 도달 + par 달성하는지 시뮬(미로 시뮬 재사용).
- `_check/shape-sim-test.js` — 각 `SHAPE_MISSIONS`의 target 시퀀스를 렌더→같은 시퀀스 재현 시 match%≥임계 확인, 순서 섞으면 실패 확인(겹침 민감도 회귀).
- `_check/cardrail-dsl-test.js` — 카드트랙(중첩 repeat 포함)→`cardTrackToDSL` 문법 정확성.
- 회귀: `check-vibe / grader-test / maze-sim-test / studio-parse-test / turtle-closure-test / maze-parse-robust-test` 전부 통과 유지.

---

## 9. 다중 에이전트 오케스트레이션 계획

### 9.1 단일 파일 충돌 방지 전략 — 센티넬 구역
`public/vibecoding.html`은 monolith라 병렬 편집이 충돌한다. 해결:

1. **WP0(단일 에이전트, 선행)**이 파일에 **센티넬 주석 블록**을 삽입한다. 이후 모든 에이전트는 **자기 센티넬 사이만** 편집한다.
   ```html
   <!-- ===== LOWGRADE:DOM ===== -->        ...   <!-- ===== /LOWGRADE:DOM ===== -->
   /* ===== LOWGRADE:CSS ===== */           ...   /* ===== /LOWGRADE:CSS ===== */
   /* ===== CARDRAIL:JS ===== */            ...   /* ===== /CARDRAIL:JS ===== */
   /* ===== GOAL:JS ===== */                ...   /* ===== /GOAL:JS ===== */
   /* ===== SHAPE:JS ===== */               ...   /* ===== /SHAPE:JS ===== */
   /* ===== GUIDE:JS ===== */               ...   /* ===== /GUIDE:JS ===== */
   /* ===== LOWGRADE:CONTENT ===== */       ...   /* ===== /LOWGRADE:CONTENT ===== */
   ```
   또한 WP0는 **기존 함수의 분기 훅**(switchMode/runCode/getMissions/getChapters/getCompleted/saveStars/openMissionSelector)에 `// LOWGRADE-HOOK` 최소 스텁을 심고, 두 모드가 **빈 화면이라도 선택·전환**되게 만든다(로드 에러 0).
2. 병렬 WP는 각자 구역만 `Edit`. **worktree 격리는 불필요**(구역이 겹치지 않으므로) — 대신 **순차 파이프라인**으로 돌려 파일 상태를 안전하게 누적하는 것을 권장(각 에이전트가 직전 결과 위에서 자기 구역 편집).

### 9.2 작업 패키지 & 의존성

```
WP0 (scaffold·contracts)         [선행, 단독]
  ├─ WP1 (Card Rail 공유 UI)      [WP0]
  │     ├─ WP2 (goal 엔진+콘텐츠)  [WP0,WP1, 미로엔진 참조]
  │     └─ WP3 (shape 엔진+콘텐츠) [WP0,WP1]
  ├─ WP4 (가이드 패널)            [WP0]  ← WP1과 병렬 가능
  └─ WP5 (통합·월드맵·영속)        [WP1..WP4]
        └─ WP6 (테스트 스위트)      [WP2,WP3,WP5]
```
병렬 가능 조합: (WP1 ∥ WP4) → (WP2 ∥ WP3) → WP5 → WP6.
단, 모두 같은 파일이므로 **실제 실행은 파이프라인(순차)로 직렬화**하고, 각 단계는 자기 센티넬 구역만 편집. 콘텐츠 생성(미션 표)은 엔진과 독립이라 별도 병렬 에이전트가 **JSON 산출물**로 뽑아 WP2/WP3에 주입 가능.

### 9.3 다음 세션 실행용 Workflow 스켈레톤(초안, 이번 세션엔 실행 안 함)

```js
export const meta = {
  name: 'lowgrade-card-modes',
  description: '저학년 카드 코딩 2모드(goal/shape)를 vibecoding.html에 구현',
  phases: [
    { title:'Scaffold' }, { title:'Rail&Guide' }, { title:'Engines' },
    { title:'Integrate' }, { title:'Test' },
  ],
}
const FILE = 'public/vibecoding.html'
phase('Scaffold')
await agent(`WP0: ${FILE}에 LOWGRADE 센티넬 구역 + 모드 등록 스텁(탭/카드/switchMode/runCode 훅) 삽입. 두 모드가 빈 화면으로 전환되며 콘솔 에러 0. 설계문서 LOWGRADE_CARD_DESIGN.md §9.1 준수.`)
phase('Rail&Guide')
await agent('WP1: 카드레일 서브시스템 구현(§3). initCardRail/renderCardPalette/renderCardTrack/cardTrackToDSL, DnD+터치+탭, repeat 중첩+카운트. CARDRAIL:JS/LOWGRADE:CSS 구역만 편집.')
await agent('WP4: 가이드 패널 구현(§6). GUIDE:JS 구역만.')
phase('Engines')
await agent('WP2: goal 엔진(미로 재사용)+GOAL_MISSIONS 10~12(§4). GOAL:JS 구역만.')
await agent('WP3: shape 스탬프 엔진+SHAPE_MISSIONS 10~12(§5). SHAPE:JS 구역만.')
phase('Integrate')
await agent('WP5: switchMode/runCode/getMissions/getChapters/getCompleted/saveStars/월드맵/서버진도 분기 통합(§7).')
phase('Test')
await agent('WP6: goal-sim/shape-sim/cardrail-dsl 테스트 작성+기존 6종 회귀 실행(§8). 실패 시 원인 리포트.')
```
> 실제로는 각 `agent()`에 `schema`로 "편집한 구역/추가 함수/미해결 이슈"를 구조화 반환받아 다음 단계에 전달하고, 콘텐츠(미션 표)는 별도 `agent`가 JSON으로 산출해 WP2/WP3에 주입한다.

---

## 10. 미해결/확정 필요 (구현 착수 전 5분 결정거리)

1. **shape 도형 크기**: 앵커만으로 충분한가, `size` 필드 필요한가 → WP3가 미션 스케치하며 확정.
2. ~~goal 캐릭터 스프라이트~~ → **확정: 신규 우주 로버(회전 톱다운)**. `rover-top.png`.
3. **타이틀 화면 배치**: 기존 4모드와 한 줄 vs "저학년 카드코딩" 별도 섹션(권장).
4. **콤비 규칙 정밀도**: 현재 설계는 "순서대로 겹쳐 찍기(나중이 덮음)"로 충분. 보드게임 콤비의 추가 규칙(예: 특정 도형만 위로) 반영 원하면 웹 조사 후 미션에 반영.
5. **반복 상한**: goal REPEAT 1~5로 잠정. 저학년 인지부하 보고 조정.

---

*이 문서는 설계 전용 세션 산출물이다. 구현·테스트는 §9 Workflow로 다음 세션에서 진행한다.*
