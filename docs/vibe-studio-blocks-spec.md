# 바이브코딩 스튜디오 모드 — 블록 체계 확장 설계서

> **목표**: `public/vibecoding.html`의 게임 만들기(스튜디오) 모드를 스크래치 3.0 / 엔트리 고급 모드 수준의
> 블록 체계로 확장하기 위한 설계 문서. 대상 학습자: 초등 3~6학년.
> 작성일: 2026-07-08 / 코드 기준: 현행 `parseStudioDSL` · `runStudioGame` · `STUDIO_TOOLBOX` (블록 16종)

---

## 0. 현행 시스템 요약 (설계의 전제)

| 항목 | 현행 |
|---|---|
| 무대 | 400×300 논리 좌표, 캔버스 스케일링(`studioScale`), 좌상단 (0,0) |
| 스프라이트 | `G.player` 1개(이모지) + `G.items[]`(이모지 배열). 일부 이모지는 PNG 스프라이트로 치환(`SPRITE_MAP`) |
| 변수 | `G.score` 1개 고정. 화면 좌상단에 "⭐ 점수" 상시 표시 |
| DSL | 대문자 명령 + 공백 구분 인자, 블록형은 `{ }`. 줄 단위 정규식 파서, **모르는 줄은 조용히 건너뜀** |
| 명령 15종 | PLAYER / SPAWN / SPAWN_RANDOM / BG / SAY / SCORE / ON_KEY / ON_TOUCH / ON_SCORE / EVERY / MOVE_X / MOVE_Y / MOVE_ALL / REMOVE / REPEAT / END_WIN / END_LOSE |
| 실행 모델 | `execStudioBody`가 **동기** 실행. 이벤트(ON_*)는 핸들러 등록, EVERY는 `setInterval`, 충돌은 rAF 루프(`studioLoop`)에서 새로 닿는 순간 에지 트리거 |
| 블록 | Blockly JSON 16종(`st_*`), 필드(field_number/field_dropdown/field_input) 기반 — **값 소켓(입력 플러그) 없음** |
| 왕복 변환 | `workspaceToDSL()`(블록→텍스트) ↔ `dslToWorkspace()`(텍스트→블록, `parseStudioDSL(text, true)` 경유) |
| 한국어 풀이 | `glossLine`(블록 풀이) / `reasonForLine`(사고 과정) — 줄 단위 정규식 |
| AI | Groq `llama-3.3-70b-versatile`, `STUDIO_PROMPT`(약 900 토큰) + SAFETY_RULES, max_tokens 1024 |
| 소리 | `playSfx(name, pitch)` WebAudio 합성 7종: click / run / success / star / fail / unlock / pop |
| 저장 | 스튜디오 DSL은 **서버·localStorage에 영속 저장 없음** (챗 세션 내 메모리뿐) → 하위 호환 부담 작음 |
| 테스트 | `_check/studio-parse-test.js` — HTML에서 `parseStudioDSL` 문자열 추출 → eval → 검증 |

---

## 1. 핵심 설계 결정 (요약)

| # | 결정 | 근거 |
|---|---|---|
| D1 | **SCORE를 일반 변수 `점수`의 특례로 흡수** — `SCORE n` ≡ `CHANGE 점수 n`, `ON_SCORE n` ≡ `ON_VAR 점수 >= n`(1회 발동). 구문·블록은 그대로 유지 | 기존 저장물·칩·프롬프트 예시 무수정. 엔진 내부는 `G.vars={점수:0}` 하나로 통일되어 코드 중복 제거 |
| D2 | **표현식은 "값 연산자 값" 3항 단일 연산으로 제한** — 우선순위·괄호·중첩 미지원. 복잡한 식은 변수를 거쳐 단계적으로 | 파서가 줄 단위 정규식으로 유지됨(토크나이저 불필요). 초등생 가독성·블록 1:1 대응·AI 출력 안정성 모두 유리. "긴 식 → 여러 SET" 자체가 분해적 사고 학습 |
| D3 | **값 소켓(입력 플러그) 미도입, 필드 기반 유지** — 값 자리는 "종류 드롭다운(숫자/변수/감지값/랜덤) + 입력칸" 복합 필드로 표현 | Blockly 값 블록 트리를 도입하면 왕복 변환·gloss·AI 프롬프트 전부 재설계 필요. 필드 방식은 DSL 한 줄 = 블록 한 개 원칙이 유지됨 |
| D4 | **다중 스프라이트는 "전역 스크립트 + 이름 있는 액터(P3)"** — 스크래치식 스프라이트별 워크스페이스는 채택 안 함 | 스프라이트별 스크립트는 워크스페이스 다중화·저장 포맷·AI 프롬프트·dslToWorkspace 전면 개조(공수 최대). 이름 있는 액터(`ACTOR 몬스터 👾 …` + `MOVE_OF 몬스터 …`)면 DSL 한 문서 유지로 90% 요구 충족 |
| D5 | **FOREVER = `EVERY 50` 슈가, WAIT = 연속 실행 분할(continuation) 스케줄링** — 엔진의 동기 실행 모델은 유지 | 엔진을 코루틴/비동기 VM으로 전면 개조하지 않고 두 블록을 도입하는 최소 경로. WAIT만 P2에서 exec 구조 개조(중규모) |
| D6 | **AI 프롬프트는 "카테고리 압축 레퍼런스" 정적 1개 유지** — 2단계 조회(요약→상세) 도입 안 함 | llama-3.3-70b가 못 본 문법은 절대 못 씀 → 전체 문법이 항상 컨텍스트에 있어야 함. 압축 표기로 P2까지 약 1,600토큰이면 충분(현행 대비 +700) |
| D7 | 카테고리 색은 **스크래치 3.0 관례 채택**(동작 파랑 · 이벤트 노랑 · 제어 주황 · 감지 하늘 · 연산 초록 · 변수 주홍) + 엔진 특화 "게임" 카테고리(자홍 330 유지) | 학교 현장에서 스크래치/엔트리를 병행 학습 → 색 전이 효과. 기존 색(반복 120 등)과 다르지만 저장물이 없어 시각 변화만 있음 |
| D8 | 리스트는 **P3 보류(도입 판단 유보)** | 이 엔진의 게임 문법(받기/피하기/모으기)에서 리스트 필요 사례가 희박. 초3~6 대상에서 변수+감지만으로 교육과정(SW교육 성취기준) 충족. 필요해지면 P3 명세 참고 |

---

## 2. 표현식·조건 문법 (D2·D3 상세)

### 2.1 값(Value)의 종류

```
값 ::= 정수                    (예: 5, -20)
     | 변수이름                 (예: 점수, 목숨, 속도)
     | 감지값                   (PLAYER_X | PLAYER_Y | TIMER | MOUSE_X | MOUSE_Y | COUNT 이모지 | DISTANCE 이모지)
     | RANDOM a b              (a~b 정수 난수, a·b는 정수만 — 중첩 금지)
```

- **변수 이름 규칙**: 한글/영문 시작, 공백 없음, 12자 이내. 예약어(명령어 대문자, RANDOM, 감지값 키워드) 금지.
  `점수`는 시스템 변수(D1). 파서는 "정수도 감지값도 아닌 토큰"을 변수로 취급하고, 실행 시 **미정의 변수는 0**.
- **RANDOM은 값 자리 전용**이며 인자는 정수 리터럴만: `SET 속도 RANDOM 3 8` (O) / `SET x RANDOM 점수 10` (X → 파싱 실패 줄 → 건너뜀).

### 2.2 식(Expression) — SET 우변 전용

```
식 ::= 값
     | 값 연산자 값             연산자 ::= + | - | * | /
```

- 연산은 **한 줄에 딱 하나**. `SET x 점수 + 1` (O), `SET x 1 + 2 * 3` (X).
- `/`는 몫을 **소수점 버림(정수화)**, 0으로 나누면 결과 0 (게임이 죽지 않게).
- 결과는 -9999~9999로 클램프 (폭주 방지).
- 근거: 우선순위 지원 시 (a) 토크나이저+재귀하강 파서 필요 (b) 블록으로 표현하려면 값 소켓 트리 필요 (c) 아이가 `2+3*4`를 블록으로 읽기 어려움. 엔트리 고급도 실질적으로 이항 연산 블록의 중첩인데, 우리는 중첩 대신 **"중간 변수에 담아 두 줄로"**를 공식 패턴으로 가르친다. 이는 수학 교과의 '식을 순서대로 계산하기'와도 정합.

### 2.3 조건(Condition)

```
조건 ::= 값 비교 값              비교 ::= = | != | < | > | <= | >=
       | TOUCHING 이모지         (주인공이 그 이모지에 닿아 있는가 — 상태값)
       | TOUCHING_EDGE           (주인공이 가장자리에 닿아 있는가)
       | KEY_DOWN 키             (그 키가 눌려 있는 상태인가)
       | 조건 AND 조건 | 조건 OR 조건 | NOT 조건     ← P3 (원자 조건 2개까지만 결합)
```

- P1~P2에서는 **원자 조건 1개**만 허용. AND/OR가 필요하면 IF 중첩으로 (이것도 교육적으로 유효).

### 2.4 Blockly 표현 (값 소켓 없이)

값 자리는 **[종류 드롭다운 + 보조 필드]** 복합으로 렌더:

```
[숫자 ▾][ 5 ]     [변수 ▾][ 목숨 ]     [감지 ▾][PLAYER_X ▾]     [랜덤 ▾][1]~[10]
```

- 구현: 커스텀 필드 대신 **드롭다운 변경 시 블록 모양을 갈아끼우는 mutator** 또는 단순하게 "값 종류별 4개 블록 변형" 중 후자를 권장(P1). mutator는 P2 리팩터링 후보.
- 왕복 변환: 필드값 → 토큰 문자열 조립(`workspaceToDSL`) / 토큰 → 종류 판별 후 필드 세팅(`dslToWorkspace`). 판별 규칙: `/^-?\d+$/`→숫자, `RANDOM`→랜덤, 감지값 키워드→감지, 나머지→변수.

---

## 3. 카테고리별 블록 명세

표 열: ① 블록 이름(초등 눈높이) ② DSL 문법 ③ 동작 정의(엣지케이스) ④ 스크래치(S)/엔트리(E) 대응 ⑤ 난이도 ⑥ 단계

> `값`·`조건`은 2장의 문법. **[기존]** 표시는 현행 블록(구문 불변).
> 색상: Blockly hue 값. 스크래치 3.0 관례 매핑(D7).

### 3.1 🚗 동작 (Motion, 파랑 hue 210) — 8블록

| ① 블록 이름 | ② DSL | ③ 동작 정의 | ④ 대응 | ⑤ 난이도 | ⑥ 단계 |
|---|---|---|---|---|---|
| x로 n만큼 움직이기 **[기존]** | `MOVE_X 값` | 주인공 x += 값, 12~388 클램프(EDGE_MODE stop 시). 주인공 없으면 no-op. **P1부터 값 자리에 변수 허용** | S: x좌표를 n만큼 바꾸기 / E: 이동 방향으로 움직이기 | 하(값 확장은 중) | 기존/P1 |
| y로 n만큼 움직이기 **[기존]** | `MOVE_Y 값` | 위와 동일, y 12~288 클램프 | S: y좌표를 n만큼 바꾸기 | 하 | 기존/P1 |
| x n, y n 위치로 가기 | `GOTO 값 값` | 주인공을 그 좌표로 순간 이동. 범위 밖 좌표는 클램프. 주인공 없으면 no-op | S: x,y로 이동하기 / E: x,y 위치로 이동하기 | 하 | P2 |
| 아무 데나 가기 | `GOTO_RANDOM` | x∈20~380, y∈20~280 균등 난수로 이동 | S: 무작위 위치로 이동하기 | 하 | P2 |
| n ms 동안 x n, y n으로 미끄러지기 | `GLIDE x y ms` | 트윈 등록(`G.tweens`), studioLoop에서 선형 보간. 진행 중 새 GLIDE 오면 기존 트윈 취소 후 교체. ms 100~5000 클램프 | S: n초 동안 x,y로 이동하기 | 중 | P2 |
| 이모지 모두 x n, y n만큼 이동 **[기존]** | `MOVE_ALL 이모지 dx dy` | 그 이모지 아이템 전부 이동. 화면 밖(y>320) 자동 소멸(현행 유지) | S: (스프라이트 복수 이동, 직접 대응 없음) | 하 | 기존 |
| 이모지가 주인공을 쫓아오게 하기 | `CHASE 이모지 속도` | `G.chasers`에 등록 → 매 프레임 그 이모지 전부가 주인공 방향으로 속도(px/프레임, 1~10 클램프)만큼 이동. 같은 이모지 재등록 시 속도 갱신. 주인공 없으면 정지 | S: ~쪽 보기+움직이기 조합 / E: ~쪽 바라보기 | 중 | P2 |
| 가장자리 규칙 정하기 (막힘/통과) | `EDGE_MODE stop\|wrap` | stop(기본): 현행 클램프. wrap: 왼쪽으로 나가면 오른쪽에서 등장(x만 wrap, y는 항상 클램프 — 낙하 게임 보호) | S: 벽에 닿으면 튕기기(유사) | 중 | P2 |

> 회전·방향(direction)은 **도입하지 않음** — 스프라이트가 이모지/PNG라 회전 렌더 품질이 낮고, 이 엔진 장르(받기·피하기·모으기)에서 수요 없음. 스크래치 대응표에서 '~도 돌기' 계열은 의도적 제외.

### 3.2 🎭 형태 (Looks, 보라 hue 260) — 7블록

| ① 블록 이름 | ② DSL | ③ 동작 정의 | ④ 대응 | ⑤ 난이도 | ⑥ 단계 |
|---|---|---|---|---|---|
| 말하기 💬 **[기존]** | `SAY 텍스트` | 말풍선 2초. 텍스트에 `{`·`}` 포함 불가(파서 정규화 제약 — 현행 동일) | S: ~말하기 / E: ~말하기 | 하 | 기존 |
| n초 동안 말하기 | `SAY_FOR 텍스트 초` | `sayUntil = now + 초*1000`. 초 0.5~10 클램프. 텍스트 마지막 토큰을 초로 해석(맨 끝 숫자 필수) | S: n초 동안 말하기 | 하 | P2 |
| 모습 바꾸기 | `SET_EMOJI 이모지` | 주인공 이모지 교체(모든 이모지 허용, SPRITE_MAP에 있으면 PNG). ON_TOUCH 매칭에는 영향 없음(주인공은 매칭 대상 아님) | S: 모양 바꾸기 / E: 모양 바꾸기 | 하 | P2 |
| 크기 n%로 하기 | `SET_SIZE n` | 주인공 그리기 배율 n%(50~300 클램프). **충돌 반경도 배율 적용**(24 × n/100) — 명시 정의 | S: 크기를 n%로 정하기 | 중 | P2 |
| 보이기 | `SHOW` | 주인공 표시 on | S: 보이기 | 하 | P2 |
| 숨기기 | `HIDE` | 주인공 표시 off. **숨긴 동안 충돌(ON_TOUCH) 미발동**, 키 이동은 동작(스크래치와 동일 판단) | S: 숨기기 | 하 | P2 |
| 배경 바꾸기 **[기존]** | `BG #hex \| 이름` | 현행 유지. 카테고리만 배치→형태로 재분류 | S: 배경 바꾸기 | 하 | 기존 |

### 3.3 🔊 소리 (Sound, 자주 hue 300) — 2블록

| ① 블록 이름 | ② DSL | ③ 동작 정의 | ④ 대응 | ⑤ 난이도 | ⑥ 단계 |
|---|---|---|---|---|---|
| 소리 내기 | `PLAY_SOUND 이름` | `playSfx(이름)` 호출. 이름: pop/click/success/fail/star/unlock/run + **신규 합성 3종 coin(동전 띠링)/jump(점프 뿅)/boom(폭발 둥)**. 모르는 이름 no-op. 음소거 시 무음(현행 정책) | S: 소리 재생하기 / E: 소리 재생하기 | 하 | P2 (P1로 앞당기기 쉬움) |
| 음표 연주하기 | `PLAY_NOTE 계이름 박` | 계이름: 도레미파솔라시도2 (C4~C5 8음), 박: 0.25~2. `playSfx`의 `tone()` 헬퍼 재사용해 삼각파 1음. 연속 호출은 겹쳐 울림(스케줄 큐 없음 — 단순화) | S: n번 음을 n박자로 연주하기 | 중 | P2 |

### 3.4 ⚡ 이벤트 (Events, 노랑 hue 45) — 10블록

| ① 블록 이름 | ② DSL | ③ 동작 정의 | ④ 대응 | ⑤ 난이도 | ⑥ 단계 |
|---|---|---|---|---|---|
| 시작하면 | `ON_START { }` | 본문을 게임 시작 시 1회 실행. **의미상 슈가**(현행 최상위 나열과 동일)지만, "이벤트 아래에 명령을 끼운다"는 스크래치 멘탈모델 형성용. 여러 개 허용(순서대로) | S: 🚩 클릭했을 때 / E: 시작하기 버튼 클릭했을 때 | 하 | P1 |
| ~키를 누르면 **[기존]** | `ON_KEY UP\|DOWN\|LEFT\|RIGHT\|SPACE { }` | keydown 에지 트리거(OS 키 반복 포함). **SPACE 추가**(P2): 점프·발사용. 입력창 포커스 중 무시(현행) | S: ~키를 눌렀을 때 | 하(SPACE는 하) | 기존/P2 |
| ~에 닿으면 **[기존]** | `ON_TOUCH 이모지 { }` | 주인공-아이템 거리<24(크기 배율 반영) 새로 닿는 순간. 본문에서 REMOVE 시 그 아이템 제거 | S: ~에 닿았는가(이벤트화) / E: ~에 닿았을 때 | 하 | 기존 |
| 점수가 n점이 되면 **[기존·특례]** | `ON_SCORE n { }` | `점수 >= n` 최초 도달 1회 발동(fired 래치, 현행 유지). 내부적으로 ON_VAR의 특례(D1) | E: 점수 관련 없음(변수 감시 유사) | 하 | 기존 |
| 변수가 ~하면 | `ON_VAR 이름 비교 값 { }` | 변수 변경 시마다(`SET/CHANGE/SCORE` 직후) 조건 검사. **거짓→참 전이 순간 발동, 다시 거짓이 되면 재장전**(ON_SCORE의 1회성과 다름 — 표로 명시 교육). 예: `ON_VAR 목숨 <= 0 { END_LOSE }` | E: 변수 감시(대응 근사) / S: 없음(관찰자) | 중 | P1 |
| n ms마다 반복 **[기존]** | `EVERY ms { }` | setInterval, 최소 50ms. 게임 종료 시 전체 해제(현행) | S: 무한반복+기다리기 / E: 계속 반복+기다리기 | 하 | 기존 |
| 무대를 클릭하면 | `ON_CLICK { }` | 캔버스 pointerdown 시 발동. 클릭 좌표는 MOUSE_X/MOUSE_Y로 읽음. 모바일 터치 포함 | S: 무대를 클릭했을 때 | 중 | P2 |
| 가장자리에 닿으면 | `ON_EDGE { }` | 주인공이 경계 클램프에 걸리는 순간(에지 트리거, 떨어졌다 다시 닿으면 재발동). EDGE_MODE wrap 중엔 x wrap 시 미발동·y 경계만 | S: 벽에 닿았는가(조건)를 이벤트화 | 중 | P2 |
| 타이머가 n초 되면 | `ON_TIMER n { }` | `TIMER >= n` 최초 1회(래치). RESET_TIMER 후 재장전. "30초 생존" 게임의 핵심 블록 | S: 타이머>n 감시 관용구 | 하 | P2 |
| ~신호를 받으면 | `ON_MESSAGE 이름 { }` | BROADCAST 발생 시마다 실행(횟수 제한 없음). 이름: 한글 12자, 공백 불가. 미정의 신호 수신 등록은 무해(영원히 대기) | S: ~신호를 받았을 때 / E: ~신호를 받았을 때 | 하 | P3 |

### 3.5 🔁 제어 (Control, 주황 hue 35) — 8블록

| ① 블록 이름 | ② DSL | ③ 동작 정의 | ④ 대응 | ⑤ 난이도 | ⑥ 단계 |
|---|---|---|---|---|---|
| n번 반복 **[기존]** | `REPEAT n { }` | 동기 n회, 상한 100(현행). 중첩 허용 | S: n번 반복하기 | 하 | 기존 |
| 만약 ~라면 | `IF 조건 { }` | 조건 참이면 본문 1회 실행. 실행 시점에 평가(이벤트 본문 안에서 주로 사용). 최상위에 쓰면 시작 시 1회 평가 | S: 만약 ~라면 / E: 만약 ~라면 | 중 | P1 |
| 만약 ~라면 / 아니면 | `IF 조건 { } ELSE { }` | 위와 동일 + 거짓이면 ELSE 본문. Blockly는 별도 블록(st_if / st_if_else) — mutator 미사용(단순성) | S: 만약~라면/아니면 | 중 | P1 |
| ~가 될 때까지 반복 | `REPEAT_UNTIL 조건 { }` | 조건이 참이 될 때까지 동기 반복. **안전 상한 1,000회** 초과 시 중단 + 챗 경고("반복이 끝나지 않아서 멈췄어"). P1에서는 본문에 WAIT 불가(파서가 아닌 실행기에서 무시) | S: ~까지 반복하기 / E: ~인 동안 반복하기(부정 관계) | 중 | P1 |
| 계속 반복 | `FOREVER { }` | 파싱 시 `{type:'EVERY', ms:50, forever:true}`로 변환(D5). 왕복 변환은 forever 플래그로 FOREVER 블록 복원. **동기 무한 루프 아님**을 문서·프롬프트에 명시(본문이 50ms마다 1회 실행) | S: 무한 반복하기 / E: 계속 반복하기 | 하 | P1 |
| n ms 기다리기 | `WAIT ms` | 본문 실행을 그 지점에서 중단하고 나머지를 setTimeout으로 이어 실행(continuation 분할, §6.3). ms 50~10000 클램프. 게임 종료 시 예약 취소. EVERY 본문 안에서는 다음 tick과 겹칠 수 있음 → 문서화 | S: n초 기다리기 / E: n초 기다리기 | **상** | P2 |
| ~가 될 때까지 기다리기 | `WAIT_UNTIL 조건` | 100ms 간격 폴링으로 조건 충족 시 나머지 이어 실행. WAIT 기반 구현 | S: ~까지 기다리기 | 중 | P3 |
| 멈추기 | `STOP` | 모든 EVERY/FOREVER 타이머·CHASE·트윈 정지(게임 오버 아님 — 화면과 키 입력은 유지). "보스전 전에 낙하 멈추기" 용도 | S: 멈추기(모두) | 하 | P2 |

**중첩 허용 범위**: 모든 `{ }` 블록은 상호 중첩 허용, 단 ①이벤트 블록(ON_*, EVERY, FOREVER)은 **다른 블록 안에 중첩 금지**(파서가 만나면 해당 줄 건너뜀 — 등록 시점 혼란 방지, 스크래치도 햇 블록은 최상위 전용) ②중첩 깊이 8 제한(파서 가드).

### 3.6 👀 감지 (Sensing, 하늘 hue 190) — 11블록

| ① 블록 이름 | ② DSL | ③ 동작 정의 | ④ 대응 | ⑤ 난이도 | ⑥ 단계 |
|---|---|---|---|---|---|
| ~에 닿아 있는가 (조건) | `TOUCHING 이모지` | 주인공-해당 이모지 아이템 거리<24 (상태 판정 — ON_TOUCH의 에지와 다름). 주인공 없으면 거짓 | S: ~에 닿았는가 / E: ~에 닿았는가 | 중 | P1 |
| 가장자리에 닿아 있는가 (조건) | `TOUCHING_EDGE` | 주인공이 경계 클램프 위치에 있는가 | S: 벽에 닿았는가 | 하 | P2 |
| ~키가 눌려 있는가 (조건) | `KEY_DOWN 키` | keydown/keyup으로 유지하는 `G.keysDown` 집합 조회. 무대 아래 터치 버튼도 pointerdown/up으로 동일 반영. 창 포커스 잃으면 전체 해제(stuck 방지) | S: ~키를 눌렀는가 / E: ~키가 눌러져 있는가 | 중 | P2 |
| 주인공 x (값) | `PLAYER_X` | 주인공 x 좌표(정수 반올림). 주인공 없으면 0 | S: x좌표 / E: x좌푯값 | 하 | P1 |
| 주인공 y (값) | `PLAYER_Y` | 위와 동일 | S: y좌표 | 하 | P1 |
| 타이머 (값) | `TIMER` | 게임 시작 후 경과 초(소수 1자리 → 비교 시 그대로). `G.startTime` 기준 | S: 타이머 / E: 초시계 값 | 하 | P2 |
| 타이머 초기화 | `RESET_TIMER` | `G.startTime = now`. ON_TIMER 래치도 재장전 | S: 타이머 초기화 / E: 초시계 초기화 | 하 | P2 |
| 마우스 x (값) | `MOUSE_X` | 캔버스 픽셀 → 논리 좌표(÷studioScale) 변환, 0~400 클램프. 무대 밖이면 마지막 값 유지. 터치는 마지막 터치 지점 | S: 마우스의 x좌표 | 중 | P2 |
| 마우스 y (값) | `MOUSE_Y` | 위와 동일(0~300) | S: 마우스의 y좌표 | 중 | P2 |
| ~까지 거리 (값) | `DISTANCE 이모지` | 주인공에서 **가장 가까운** 그 이모지 아이템까지 거리(정수). 없으면 9999 | S: ~까지의 거리 | 중 | P2 |
| ~개수 (값) | `COUNT 이모지` | 살아 있는 그 이모지 아이템 수. "COUNT 💎 = 0이면 승리" 패턴용 | E: (오브젝트 수 유사) | 하 | P2 |

### 3.7 ➗ 연산 (Operators, 초록 hue 120) — 6블록

| ① 블록 이름 | ② DSL | ③ 동작 정의 | ④ 대응 | ⑤ 난이도 | ⑥ 단계 |
|---|---|---|---|---|---|
| 계산 (값) | `값 +\|-\|*\|/ 값` | 3항 단일 연산(§2.2). ÷0→0, 나눗셈 버림, 결과 ±9999 클램프 | S: ○+○ 등 4종 / E: 사칙연산 | 중 | P1 |
| n부터 m 사이 랜덤 (값) | `RANDOM a b` | a~b 정수 균등 난수. a>b면 자동 교환. 리터럴 전용(§2.1) | S: n부터 m 사이의 난수 / E: 무작위 수 | 하 | P1 |
| 비교 (조건) | `값 =\|!=\|<\|>\|<=\|>= 값` | 수 비교. 드롭다운 6종 | S: =, <, > / E: 비교 6종 | 중 | P1 |
| 그리고 / 또는 (조건) | `조건 AND\|OR 조건` | 원자 조건 2개 결합까지만(중첩 금지) | S: 그리고/또는 | 중 | P3 |
| ~가 아니다 (조건) | `NOT 조건` | 원자 조건 부정 | S: ~가 아니다 | 하 | P3 |
| 나머지 (값) | `값 % 값` | 나머지 연산(계산 블록 드롭다운에 추가). ÷0→0. 6학년 배수 판별 연계("점수 % 2 = 0이면 짝수") | S: 나머지 / E: 나머지 | 하 | P3 |

### 3.8 📦 변수 (Variables, 주홍 hue 30) — 6블록 (+리스트 4블록 보류)

| ① 블록 이름 | ② DSL | ③ 동작 정의 | ④ 대응 | ⑤ 난이도 | ⑥ 단계 |
|---|---|---|---|---|---|
| 변수 ~를 …로 정하기 | `SET 이름 식` | `G.vars[이름] = 평가값`. 이름 규칙 §2.1. 최초 SET이 곧 생성(별도 '변수 만들기' 절차 없음 — 텍스트 DSL 친화). 변수 개수 상한 10개(초과분 무시+경고) | S: ~를 …로 정하기 / E: ~를 …로 정하기 | 중 | P1 |
| 변수 ~를 n만큼 바꾸기 | `CHANGE 이름 값` | `G.vars[이름] += 값`(미정의면 0에서 시작). 변경 후 ON_VAR/ON_SCORE 검사 | S: ~를 n만큼 바꾸기 / E: ~에 n만큼 더하기 | 하 | P1 |
| 변수 ~보이기 | `SHOW_VAR 이름` | 좌상단 모니터에 `이름: 값` 추가(점수 아래 세로 나열, 최대 4개 표시). `점수`는 기본 표시(현행 유지) | S: 변수 보이기 | 하 | P1 |
| 변수 ~숨기기 | `HIDE_VAR 이름` | 모니터에서 제거. `HIDE_VAR 점수`도 허용(점수 없는 게임) | S: 변수 숨기기 | 하 | P1 |
| 변수값 (값) | (식 안에서 이름 사용) | `SET x 목숨 + 1`, `IF 목숨 < 1 {…}` — 별도 명령 아닌 문법 요소. Blockly에선 값 종류 드롭다운의 '변수' | S: (변수 라운드 블록) | 중(파서) | P1 |
| 점수 n 올리기 **[기존·특례]** | `SCORE n` | ≡ `CHANGE 점수 n`(D1). 블록·구문·gloss 전부 현행 유지 | E: 점수(속성) 없음 — 변수 관용구 | 하 | 기존 |

**리스트(P3 보류, D8)** — 도입이 결정되면: `LIST_ADD 이름 값`(끝에 추가) / `LIST_ITEM 이름 i`(값, 범위 밖 0) / `LIST_LENGTH 이름`(값) / `LIST_CLEAR 이름`. 표시 모니터 없음(챗으로 확인). 스크래치 대응: 리스트 5종의 축약. **권장: 도입하지 않음** — 대상 학년에서 리스트가 필요한 게임 기획이 나오면 그때 재론.

### 3.9 🛠 나만의 블록 (My Blocks, 분홍 hue 345) — 3블록

| ① 블록 이름 | ② DSL | ③ 동작 정의 | ④ 대응 | ⑤ 난이도 | ⑥ 단계 |
|---|---|---|---|---|---|
| 나만의 블록 ~ 만들기 | `DEF 이름 { }` | 터틀/픽셀 모드의 `resolveCalls` 재사용(치환 방식, 재귀 깊이 8). 이벤트 블록은 DEF 안에 금지(§3.5 규칙) | S: 나만의 블록 / E: 함수 만들기 | 하 | P3 |
| 나만의 블록 ~ 쓰기 | `CALL 이름` | 정의 본문으로 치환. 미정의 CALL은 no-op(현행 터틀과 동일) | S: (정의 호출) | 하 | P3 |
| 매개변수 붙이기 | `DEF 이름 인자 { }` / `CALL 이름 값` | 본문 안에서 인자 이름이 지역 값으로 치환. 1개 인자만(단순화). **보류 후보** — DEF 자체 사용률 본 뒤 결정 | S: 입력값이 있는 블록 / E: 매개변수 함수 | 상 | P3(보류) |

### 3.10 🎮 게임 (엔진 특화, 자홍 hue 330) — 7블록

| ① 블록 이름 | ② DSL | ③ 동작 정의 | ④ 대응 | ⑤ 난이도 | ⑥ 단계 |
|---|---|---|---|---|---|
| 주인공 놓기 **[기존]** | `PLAYER 이모지 x y` | 현행 유지. 재호출 시 교체 | (스크래치의 스프라이트 개념을 명령화) | 하 | 기존 |
| 아이템 놓기 **[기존]** | `SPAWN 이모지 x y` | 현행 유지 | 〃 | 하 | 기존 |
| 하늘에서 떨어뜨리기 **[기존]** | `SPAWN_RANDOM 이모지` | 현행 유지(x 20~380 난수, y −10) | 〃 | 하 | 기존 |
| 닿은 아이템 없애기 **[기존]** | `REMOVE` | ON_TOUCH 본문 전용(밖에서는 no-op — 현행) | S: 숨기기 유사 | 하 | 기존 |
| ~모두 없애기 | `REMOVE_ALL 이모지` | 그 이모지 아이템 전부 `_dead` 처리. "폭탄 청소" 아이템 구현용 | — | 하 | P2 |
| 게임 끝(승/패) **[기존]** | `END_WIN` / `END_LOSE` | 현행 유지 | — | 하 | 기존 |
| ~신호 보내기 | `BROADCAST 이름` | 등록된 ON_MESSAGE 본문 전부 즉시 실행(동기, 재귀 깊이 8 가드 — BROADCAST가 자기 신호를 다시 쏘는 무한루프 방지) | S: ~신호 보내기 / E: 신호 보내기 | 하 | P3 |

### 블록 수 집계

| 카테고리 | 기존 | 신규 | 계 |
|---|---|---|---|
| 동작 | 3 (MOVE_X/Y, MOVE_ALL) | 5 | 8 |
| 형태 | 2 (SAY, BG) | 5 | 7 |
| 소리 | 0 | 2 | 2 |
| 이벤트 | 4 (ON_KEY/TOUCH/SCORE, EVERY) | 6 | 10 |
| 제어 | 1 (REPEAT) | 7 | 8 |
| 감지 | 0 | 11 | 11 |
| 연산 | 0 | 6 | 6 |
| 변수 | 1 (SCORE) | 5 | 6 |
| 나만의 블록 | 0 | 3 | 3 |
| 게임 | 5 (PLAYER, SPAWN, SPAWN_RANDOM, REMOVE, END) | 2 | 7 |
| **합계** | **16** | **52** | **68** (+리스트 4 보류) |

단계별: **P1 = 기존 16 + 신규 17 = 33블록** / P2 = +24 = 57블록 / P3 = +11 = 68블록.

---

## 4. 핵심 설계 과제 상세

### 4.1 변수 시스템 (D1)

- 상태: `G.vars = { 점수: 0 }`, `G.varMonitors = ['점수']`(표시 목록), `G.varHandlers = []`(ON_VAR).
- `G.score` 필드 제거 → 모든 접근을 `G.vars['점수']`로. `SCORE n` 실행부는 `CHANGE 점수 n`과 같은 코드 경로.
- `checkScoreHandlers()` → `checkVarHandlers()`로 일반화:
  - ON_SCORE 핸들러: `{var:'점수', op:'>=', value:n, once:true, fired:false}` — **1회성 유지(하위 호환)**.
  - ON_VAR 핸들러: `{var, op, value, once:false, armed:true}` — 거짓→참 에지 트리거 + 재장전.
- 모니터 렌더: `drawStudio()`에서 `varMonitors` 순회, 점수(⭐ 접두)만 특별 스타일 유지하고 나머지는 `이름: 값` 소형 배지.
- 실패 모드: 변수명 오타 → 새 변수 0으로 생성됨(스크래치와 동일한 함정). 완화책: 실행 시작 시 "읽기만 하고 한 번도 SET/CHANGE 안 된 변수" 감지 → 챗 힌트 1줄.

### 4.2 표현식 (D2·D3) — §2 참조. 파서 구현 스케치

```js
// 값 하나: 토큰 배열을 소비
function parseValue(toks){ // {kind:'num'|'var'|'sense'|'random', ...}
  if(/^-?\d+$/.test(toks[0])) return {kind:'num', v:+toks.shift()};
  if(toks[0]==='RANDOM')      return {kind:'random', a:+toks[1], b:+toks[2]}; // 리터럴 검증
  if(SENSE_KEYWORDS[toks[0]]) return parseSense(toks); // PLAYER_X 등, COUNT/DISTANCE는 이모지 1개 더 소비
  return {kind:'var', name:toks.shift()};              // 나머지는 변수
}
// 식: 값 [연산자 값]?  /  조건: TOUCHING·KEY_DOWN·TOUCHING_EDGE 또는 값 비교 값
```

- 기존 줄 정규식들은 그대로 두고, `SET/CHANGE/IF/REPEAT_UNTIL/ON_VAR/MOVE_X/MOVE_Y/GOTO` 등의 인자 부분만 이 토큰 파서로 넘긴다. `{ }` 정규화(전처리)도 현행 유지.
- 평가기 `evalStudioExpr(node, G)` / `evalStudioCond(node, G)` 신규 — 순수 함수로 만들어 `_check` 테스트에서 추출 가능하게 **단일 function 선언으로 작성**(테스트 추출 방식이 문자열 슬라이스임).

### 4.3 제어 구조 (D5)

- **IF/ELSE**: `execStudioBody`에 `else if(c.type==='IF'){ if(evalStudioCond(c.cond,G)) exec(c.body) else if(c.elseBody) exec(c.elseBody) }` — 동기라 간단.
- **REPEAT_UNTIL**: 동기 while + 1,000회 가드. 가드 발동 시 `addChatMsg('system', …)` 1회.
- **FOREVER**: 파서 슈가 → EVERY 50 (+`forever` 플래그로 왕복 복원). REPEAT와 달리 본문이 즉시 연속 실행되지 않음을 gloss에 명시("50ms마다 한 번씩 계속").
- **WAIT (P2, 유일한 상급 공사)**: `execStudioBody(body, ctxItem)`를 `execStudioBody(body, ctxItem, startIdx)`로 확장 —
  WAIT를 만나면 `setTimeout(()=> execStudioBody(body, ctxItem, i+1), ms)` 예약 후 return. 예약 id를 `studioTimers`에 등록해 게임 정지 시 일괄 취소.
  중첩 블록(REPEAT 안의 WAIT)은 "남은 반복 횟수"도 함께 캡처해야 하므로, REPEAT 실행을 인덱스 기반 재진입 형태로 리팩터링(콜스택 대신 명시적 continuation 객체). 이 리팩터링 범위 때문에 P2 배치.
- **기존 REPEAT/EVERY와의 정합성**: REPEAT=동기 즉시 n회(화면엔 최종 상태만 보임 — 배치용), EVERY/FOREVER=시간 흐름 반복(움직임용), WAIT=한 흐름 안의 정지. 이 3분류를 팔레트 도움말·프롬프트에 동일 문구로 기술.

### 4.4 감지 — §3.6. 엔진 추가 상태

`G.keysDown`(Set), `G.startTime`, `G.mouse={x,y}`, `G.tweens[]`, `G.chasers[]`, `G.edgeTouching`(에지 트리거용 이전 상태). 모두 `initStudioGame`에서 초기화, `stopStudioGame`에서 타이머류 해제.

### 4.5 다중 스프라이트 (D4)

- **1단계(현행~P2)**: 주인공 1 + 이모지 그룹(items). MOVE_ALL/CHASE/COUNT/DISTANCE가 "이모지 = 그룹 이름" 역할 — 사실상 클래스 단위 제어. 대부분의 초등 게임(받기·피하기·모으기·추격)이 이 모델로 표현됨.
- **2단계(P3) — 이름 있는 액터**: `ACTOR 이름 이모지 x y`로 개별 개체 생성, `MOVE_OF 이름 dx dy`, `GOTO_OF 이름 x y`, `SAY_OF 이름 텍스트`, `ON_TOUCH_ACTOR 이름 { }`. items와 별도 배열 `G.actors{}`. 액터는 자동 낙하 소멸 없음.
- **채택하지 않는 안 — 스프라이트별 스크립트(스크래치 모델)**: 워크스페이스 다중화(스프라이트 선택 패널), DSL을 스프라이트 섹션으로 분할, dslToWorkspace/AI 프롬프트/글로스 전면 개편, "현재 어떤 스프라이트의 코드인가" 컨텍스트 혼란(스크래치 최다 초보 오류). 텍스트 DSL 한 장 = 게임 전체라는 현재 모델의 최대 장점(AI가 전체를 재출력하는 패턴)과 충돌 → **기각**.

### 4.6 메시지 방송 (P3)

`BROADCAST 이름` / `ON_MESSAGE 이름 { }` — scoreHandlers와 같은 등록 구조(`G.msgHandlers`), 발동은 즉시 동기 실행 + 재귀 깊이 가드 8. "보스 등장", "레벨 2 시작" 같은 장면 전환 교육에 사용. 스크래치의 '방송하고 기다리기'는 미도입(동기 실행이라 사실상 동일 효과).

### 4.7 블록 팔레트 UX

1. **색**: 스크래치 관례(D7 표). 기존 블록 색 변경은 시각 변화뿐(저장물 없음).
2. **카테고리 수 10개 대응**:
   - Blockly 카테고리 트리는 기본 접힘. **P1 기본 노출은 6개**(게임·이벤트·동작·제어·연산·변수), 감지·형태·소리·나만의블록은 헤더의 "🔬 고급 블록" 토글로 표시(localStorage `studio_adv`). 미션(만들기 카드)별로 권장 카테고리만 자동 펼침.
   - **자주 쓰는 블록** 최상단 카테고리(⭐ 즐겨찾기): PLAYER, ON_KEY, MOVE_X, EVERY+SPAWN_RANDOM, ON_TOUCH+SCORE+REMOVE, END — "게임 뼈대 6종"을 한 곳에. 초등 저학년 동선 단축.
   - **검색**: Blockly 내장 toolbox search 플러그인 대신, 상단에 간단한 필터 입력(블록 message0 한국어 부분일치 → 임시 '검색 결과' 카테고리 렌더). P2.
3. **툴박스 정의**: `STUDIO_TOOLBOX`를 P단계 플래그로 조립하는 함수 `buildStudioToolbox(advanced)`로 변경.
4. **블록 도움말**: 각 블록 `tooltip`에 §3의 "동작 정의" 요약 1문장 필수 기입(현행 블록은 tooltip 없음 — 이번에 일괄 추가).

### 4.8 AI 챗봇(STUDIO_PROMPT) 연동 (D6)

- **구조**: 현행 단일 프롬프트 유지하되 명령어 목록을 "카테고리 압축표"로 재편.

```
[문법 요약 — 프롬프트 내 표기 예]
값 = 정수 | 변수이름 | PLAYER_X/PLAYER_Y/TIMER/MOUSE_X/MOUSE_Y | COUNT 이모지 | DISTANCE 이모지 | RANDOM a b
조건 = 값 (=|!=|<|>|<=|>=) 값 | TOUCHING 이모지 | TOUCHING_EDGE | KEY_DOWN 키
게임: PLAYER e x y / SPAWN e x y / SPAWN_RANDOM e / REMOVE / REMOVE_ALL e / END_WIN / END_LOSE
동작: MOVE_X 값 / MOVE_Y 값 / GOTO 값 값 / GOTO_RANDOM / GLIDE x y ms / MOVE_ALL e dx dy / CHASE e 속도 / EDGE_MODE stop|wrap
이벤트: ON_START{} / ON_KEY 키{} / ON_TOUCH e{} / ON_SCORE n{} / ON_VAR 이름 비교 값{} / EVERY ms{} / ON_CLICK{} / ON_EDGE{} / ON_TIMER n{}
제어: REPEAT n{} / IF 조건{} [ELSE{}] / REPEAT_UNTIL 조건{} / FOREVER{} / WAIT ms / STOP
변수: SET 이름 식 / CHANGE 이름 값 / SHOW_VAR·HIDE_VAR 이름 / SCORE n(=CHANGE 점수 n)
형태·소리: SAY t / SAY_FOR t 초 / SET_EMOJI e / SET_SIZE n / SHOW / HIDE / BG … / PLAY_SOUND 이름 / PLAY_NOTE 계이름 박
```

- **토큰 예산**: 현행 STUDIO_PROMPT ≈ 900토큰. 압축표 + 규칙 보강 + 예시 1개 추가(변수 사용 게임)로 **P1 ≈ 1,300, P2 ≈ 1,700토큰** 추정. Groq llama-3.3-70b 128k 컨텍스트에서 전혀 문제없고, 응답 품질상 "전부 나열"이 "요약+상세 2단계"보다 안전(모델이 못 본 문법은 못 쓰고, 2단계 조회는 왕복 지연+구현 복잡).
- **프롬프트 규칙 추가분**:
  1. "새 문법(값/조건)은 한 줄에 연산 1개만. 괄호 금지."
  2. "게임 전체 재출력 원칙 유지, 단 20줄 이내"(현행 12줄 → 상향).
  3. 예시 게임에 목숨 변수 패턴 1개 포함: `SET 목숨 3` / `ON_TOUCH 💣 { CHANGE 목숨 -1 / REMOVE }` / `ON_VAR 목숨 <= 0 { END_LOSE }` / `SHOW_VAR 목숨`.
  4. NEXT 제안 규칙에 "새로 배울 블록 1개를 섞어 제안" 추가(팔레트 확장 자연 노출).
- **점진 활성화**: 프롬프트도 P단계에 맞춰 3개 상수(STUDIO_PROMPT_P1/P2/P3)가 아니라 **하나의 문자열을 배포 시점에 갱신**(단순성 — 이 파일은 어차피 단일 HTML).

### 4.9 하위 호환·마이그레이션

| 자산 | 위험 | 대응 |
|---|---|---|
| 기존 DSL 구문 15종 | 없음 — 전부 불변(SCORE/ON_SCORE 특례 유지) | 파서는 **정규식 추가만** 하고 기존 정규식 삭제·변경 금지. `studio-parse-test.js` 기존 케이스가 회귀 가드 |
| 저장물 | 서버·localStorage에 스튜디오 DSL 영속 저장 없음 | 조치 불필요. (향후 저장 기능 도입 시 DSL 버전 헤더 `// v2` 권장) |
| 예시 칩(STUDIO_CHIPS/STUDIO_STORY) | 자연어 문장이라 무영향 | P1 배포 시 변수 관련 칩 추가: "목숨 3개를 만들어 줘", "폭탄에 닿으면 목숨이 줄게 해 줘" |
| 미션 힌트(STUDIO_PROJECTS.hint) | 무영향 | 카드 4번(나만의 게임)에 변수 안내 한 줄 추가 검토 |
| Blockly 블록 타입명 | 기존 `st_*` 16종 유지, 신규는 `st2_*` 접두 불필요 — 같은 `st_` 이어 씀 | 카테고리 색만 변경(시각) |
| 구버전 캐시 페이지 | 구파서가 신문법 DSL을 받으면 해당 줄 무시(현행 '모르는 줄 건너뜀' 동작) → 게임이 어설프게 돌 수 있음 | AI 프롬프트와 파서를 **같은 배포에 동시 반영**(단일 HTML이라 자동 충족). 캐시 대책은 기존 배포 체계 그대로 |
| glossLine/reasonForLine | 신규 명령이 gloss 미등록이면 조립 애니메이션에서 조용히 생략(현행 fallback) | 신규 블록마다 gloss·reason 한 줄씩 필수 추가 — §5 체크리스트에 포함 |

---

## 5. 단계별 구현 로드맵

### P1 — 변수·연산·제어 핵심 (즉시 구현 권장)

**신규 17블록**: SET / CHANGE / SHOW_VAR / HIDE_VAR / 변수값 / ON_VAR / ON_START / IF / IF-ELSE / REPEAT_UNTIL / FOREVER / 계산 / RANDOM / 비교 / TOUCHING / PLAYER_X / PLAYER_Y
(합계 노출 33블록 — 기존 16 포함. 목숨 시스템·랜덤 난이도·조건 규칙이 열림 = 학습 효과 최대인 최소 집합)

| 작업 | 파일 · 함수 |
|---|---|
| 토큰 파서·평가기 신설 | `public/vibecoding.html`: `parseStudioValue` / `parseStudioCond` / `evalStudioExpr` / `evalStudioCond` (테스트 추출 가능한 단일 함수로) |
| 파서 확장 | `parseStudioDSL`: SET/CHANGE/SHOW_VAR/HIDE_VAR/ON_VAR/ON_START/IF/ELSE/REPEAT_UNTIL/FOREVER 정규식 추가, MOVE_X/MOVE_Y 인자를 값으로 확장, 이벤트 블록 중첩 금지 가드 |
| 엔진 확장 | `execStudioBody`(IF/REPEAT_UNTIL/SET/CHANGE 분기), `initStudioGame`(`G.vars/varMonitors/varHandlers`), `checkScoreHandlers`→`checkVarHandlers` 일반화, `drawStudio`(변수 모니터 렌더), `studioEnd`(점수 표기는 `G.vars.점수`) |
| 블록 정의 | `Blockly.defineBlocksWithJsonArray`: st_set/st_change/st_show_var/st_hide_var/st_on_var/st_on_start/st_if/st_if_else/st_repeat_until/st_forever + 값 종류 변형 블록. 전 블록 tooltip |
| 툴박스 | `STUDIO_TOOLBOX` → `buildStudioToolbox()`: 카테고리 10종·스크래치 색·⭐즐겨찾기, 고급 토글 |
| 왕복 변환 | `workspaceToDSL`(신규 st_* 직렬화 + 값 필드 조립), `dslToWorkspace`(신규 case + 값 토큰→필드 분해, FOREVER 복원) |
| 한국어 풀이 | `glossLine` / `reasonForLine`: 신규 구문 각 1줄 (예: `SET 목숨 3` → "변수 '목숨'을 3으로 정하기") |
| AI 프롬프트 | `STUDIO_PROMPT` 압축표 개편 + 목숨 예시 게임 + 칩 2개 추가(`STUDIO_CHIPS`/`STUDIO_STORY`) |
| 테스트 | `_check/studio-parse-test.js` 확장(신문법 20케이스) + **신규 `_check/studio-eval-test.js`**(evalStudioExpr/Cond: ÷0, 클램프, 미정의 변수 0, RANDOM 범위) |

**위험**: ①REPEAT_UNTIL 무한루프(가드 1,000회 + 경고로 완화) ②변수명 오타로 조용한 0(시작 시 미할당 변수 힌트) ③값 필드 확장이 기존 MOVE_X 블록 XML과 충돌 — 기존 field_number를 유지한 채 **신규 변형 블록을 병행**하는 방식으로 회피.

### P2 — 감지·형태·소리·동작·WAIT

**신규 24블록**: GOTO / GOTO_RANDOM / GLIDE / CHASE / EDGE_MODE / SAY_FOR / SET_EMOJI / SET_SIZE / SHOW / HIDE / PLAY_SOUND / PLAY_NOTE / ON_KEY SPACE / ON_CLICK / ON_EDGE / ON_TIMER / WAIT / STOP / TOUCHING_EDGE / KEY_DOWN / TIMER / RESET_TIMER / MOUSE_X·Y / DISTANCE / COUNT / REMOVE_ALL

| 작업 | 파일 · 함수 |
|---|---|
| 입력 상태 | keydown/keyup 리스너 확장(`G.keysDown`, SPACE 매핑, blur 시 해제), 캔버스 pointermove/down(`G.mouse`, ON_CLICK), 무대 터치 버튼 pointerdown/up 연동 |
| 프레임 루프 | `studioLoop`: 트윈(GLIDE)·추격(CHASE)·가장자리 에지(ON_EDGE)·타이머(ON_TIMER) 처리 |
| WAIT 리팩터링 | `execStudioBody`를 인덱스 재진입형으로 개조(continuation), 예약 취소를 `stopStudioGame`에 연결 — **P2 최대 공수** |
| 소리 | `playSfx`에 coin/jump/boom 3종 합성 추가, `PLAY_NOTE`용 주파수표(C4~C5) |
| 형태 | `drawStudio`: size 배율·hide·say_for, 충돌 반경 배율(`studioLoop`) |
| 팔레트 | 고급 카테고리 토글 활성(감지·형태·소리 노출), 블록 검색 필터 |
| 나머지 | 파서/블록/왕복/gloss/프롬프트/테스트 — P1과 동일 패턴. `studio-eval-test.js`에 감지값 모킹 케이스 추가 |

**위험**: ①WAIT×EVERY 재진입 중복 실행(EVERY 본문에 WAIT 시 tick 겹침 — 문서화+본문당 대기 중 재진입 skip 플래그) ②KEY_DOWN stuck 키(blur 해제로 완화) ③모바일에서 MOUSE_X/Y 의미(마지막 터치 지점으로 정의).

### P3 — 다중 스프라이트(액터)·신호·나만의 블록·연산 확장

**신규 11블록**: ACTOR류(ACTOR/MOVE_OF/GOTO_OF/SAY_OF/ON_TOUCH_ACTOR — 게임·동작 카테고리에 편입) / BROADCAST / ON_MESSAGE / DEF / CALL / AND·OR / NOT / %(계산 드롭다운) / WAIT_UNTIL. 리스트 4블록은 **보류 상태로 재검토**.

| 작업 | 파일 · 함수 |
|---|---|
| 액터 | `G.actors{}` 신설, `studioLoop` 충돌 검사에 액터 포함, `drawStudio` 렌더 |
| 신호 | `G.msgHandlers`, BROADCAST 동기 실행 + 깊이 가드 |
| 나만의 블록 | `resolveCalls` 재사용(스튜디오 파서에 DEF/CALL 연결 — `parseStudioDSL`이 현재 유일하게 resolveCalls를 안 씀), forBlocks 분기 |
| 조건 결합 | `parseStudioCond`에 AND/OR/NOT(원자 2개 제한) |
| 프롬프트 | 압축표 갱신 + 액터 예시(움직이는 보스) |
| 테스트 | 파스·실행 케이스 + BROADCAST 재귀 가드 테스트 |

**위험**: ①액터 vs 아이템 개념 혼동(팔레트 설명·프롬프트에서 "이름을 붙인 특별한 등장인물"로 일관 서술) ②DEF 매개변수는 공수 대비 효용 낮음 — 사용 데이터 보고 결정.

---

## 6. 부록

### 6.1 P1 목표 예시 게임 (설계 검증용 — 프롬프트 예시로도 사용)

```
PLAYER 🐢 200 260
BG #0d3b66
SET 목숨 3
SHOW_VAR 목숨
ON_KEY LEFT { MOVE_X -20 }
ON_KEY RIGHT { MOVE_X 20 }
EVERY 800 { SPAWN_RANDOM 🍎 }
EVERY 2000 { SPAWN_RANDOM 💣 }
EVERY 100 { MOVE_ALL 🍎 0 5
MOVE_ALL 💣 0 7 }
ON_TOUCH 🍎 { SCORE 1
REMOVE }
ON_TOUCH 💣 { CHANGE 목숨 -1
REMOVE
IF 목숨 <= 1 { SAY 위험해! }
}
ON_VAR 목숨 <= 0 { END_LOSE }
ON_SCORE 15 { END_WIN }
```

이 한 편이 P1 신기능 전부(변수 생성·변경·표시·감시, IF, 비교)를 기존 문법과 섞어 사용한다.
`_check/studio-parse-test.js`의 P1 대표 케이스로 채택할 것.

### 6.2 gloss 추가분 문안 표본

| DSL | glossLine | reasonForLine |
|---|---|---|
| `SET 목숨 3` | 변수 '목숨'을 3으로 정하기 | 기억해 둘 숫자(목숨)가 필요하니까 |
| `CHANGE 목숨 -1` | 변수 '목숨'을 -1만큼 바꾸기 | 폭탄을 맞으면 목숨이 줄어야 하니까 |
| `ON_VAR 목숨 <= 0` | ┌ '목숨'이 0 이하가 되면 | 목숨이 다 닳는 순간 규칙이 발동해야 하니까 |
| `IF 점수 >= 10` | ┌ 만약 점수가 10 이상이면 | 조건에 따라 다르게 움직여야 하니까 |
| `REPEAT_UNTIL 점수 >= 5` | ┌ 점수가 5 이상이 될 때까지 반복 | 조건이 이뤄질 때까지 계속해야 하니까 |
| `FOREVER` | ┌ 계속 반복 (50ms마다) | 게임 내내 이어져야 하는 동작이니까 |
| `PLAY_SOUND coin` | 동전 소리 내기 🔊 | 아이템을 먹으면 신나는 소리가 나야 하니까 |

### 6.3 WAIT continuation 개조 요지 (P2)

```
execStudioBody(body, ctxItem, start=0):
  for i in start..body.length-1:
    c = body[i]
    if c.type == 'WAIT':
      id = setTimeout(() => execStudioBody(body, ctxItem, i+1), c.ms)
      studioTimers.push(id)   // stopStudioGame이 일괄 취소
      return
    if c.type == 'REPEAT':
      // 남은 횟수를 담은 continuation으로 재작성:
      // REPEAT은 [본문×n] 전개 대신 {remain:n}을 진행 상태로 갖는 재진입 함수로
    ...
```

REPEAT 내부 WAIT까지 지원하려면 REPEAT을 전개(현행 for 루프) 대신 재진입 카운터로 바꿔야 함 — P2에서 REPEAT 실행부만 국소 리팩터링(파서·블록은 무변).

### 6.4 카테고리 색 이행표

| 카테고리 | 현행 hue | 신규 hue (스크래치 관례) |
|---|---|---|
| 배치 → 게임 | 20 | 330 (기존 '규칙' 색 승계) |
| 조작 → 이벤트 | 180 | 45 |
| 동작(타이머 포함) | 160 | 210 |
| 규칙 → 게임/변수로 분해 | 330 | 330 / 30 |
| 반복 → 제어 | 120 | 35 |
| (신규) 감지/연산/형태/소리/나만의블록 | — | 190 / 120 / 260 / 300 / 345 |
