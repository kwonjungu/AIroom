# 바이브 코딩 (vibecoding.html) UI/UX 디자인 검토 보고서

- **대상**: `public/vibecoding.html` (단일 파일 SPA, 3,901줄 / 약 265KB, https://a-iroom.vercel.app/vibecoding.html)
- **사용자층**: 초등 3~6학년 (코드모스 스타일 스토리 학습 도구)
- **검토일**: 2026-07-08
- **범위**: CSS 전체 + 타이틀 화면 / 통합 월드맵(`renderWorldMap`) / 미션 3패널 화면 / 스토리 인트로·피드백 모달 / 온보딩 투어 + `public/assets/vibe/` 에셋 인벤토리

---

# 1. 현황 보고서

## 1.1 디자인 시스템 개요

| 항목 | 현황 |
|---|---|
| 색상 토큰 | `:root` CSS 변수 — primary `#4A90D9`, accent `#FF6B6B`, success `#51CF66`, bg `#F0F4F8`, text `#2D3748` 등 12종 |
| 모드별 테마 | 헤더 그라데이션으로 세계관 구분: 터틀(초록 `#2E7D32→#43A047`), 픽셀(보라 `#7C4DFF→#E040FB`), 미로(남색·청록 `#3949AB→#00BCD4`), 스튜디오(핑크·주황 `#E91E63→#FF9800`) |
| 타이포 | 본문: Segoe UI/Apple SD Gothic Neo/Malgun Gothic. 디스플레이: **Jua**(Google Fonts) — 제목·버튼·배지·지도 라벨 등 약 25개 셀렉터에 일괄 적용 ("디자인 마감" 섹션). 본문 가독성과 아동용 감성을 분리한 좋은 구조 |
| 모션 | 모달 팝(`modalpop`), 카드 순차 등장(`cardin`), 별 팡팡(`starpop`), 진행선 그리기(`segdraw`), 캐릭터 부유(`floaty`), 색종이(`cfall`) 등 목적이 분명한 마이크로 인터랙션 다수 |
| 접근성 | `:focus-visible` 노란 아웃라인, `touch-action:manipulation`, 모바일에서 버튼 `min-height:44px` 보장 — 기본기는 갖춤 |
| 사운드 | **전무** — `Audio`/효과음 코드 자체가 없음 (CLAUDE.md에도 희망사항으로 기록됨) |

## 1.2 화면별 현황

### ① 타이틀 화면 (`.title-screen`)
- **레이아웃**: 전체 화면 고정(z-index 2000), `title-hero.jpg` 배경 + 상하 어둡게 하는 그라데이션 오버레이 → 로고(캐치프레이즈 + 대제목 + 누적 별 배지) → 모드 카드 4장 그리드(`auto-fit minmax(230px,270px)`) → 우하단 "👩‍🏫 선생님" 링크.
- **에셋**: `title-hero.jpg`(272KB), 카드 4장(`card-turtle/pixel/maze/studio.jpg`, 각 65~85KB), `ui-star.png`. 카드마다 모드 테마색 그라데이션 버튼.
- **모션**: 로고 낙하 등장 + 카드 4장 0.15s 간격 순차 등장 — 게임 타이틀다운 첫인상.

### ② 통합 월드맵 (`renderWorldMap`, `#missionModal`)
- **구조**: 모달이 아니라 사실상 전체 화면(`#missionModal .modal`을 100%로 재정의, `bg-map.jpg` 배경). 상단 `stage-intro`(현재 챕터 스토리) → **가로 스크롤 트랙**(`stage-scroll`, 고정 높이 262px, 우주 느낌 CSS 그라데이션) → 하단 스크롤 힌트 텍스트.
- **트랙 내용**: 슬롯 배열 = [챕터 관문(`ch-gate`, 행성 PNG + 금테 원형) → 스테이지 노드(`stage-node`, 번호+이모지 원형, 별 3개) ...] × 챕터 + 최종 트로피(`stage-goal`). 사인파(`py=138+34sin`)로 물결치는 길, SVG 베지어 경로 2겹(흰 밑선 + 진행선: 완료 초록 실선/미완료 점선), 방금 깬 구간은 선이 그려지는 모션 + 캐릭터(`map-char` SVG)가 다음 노드로 걸어가는 연출.
- **챕터 구분 장치**: ① 행성 관문 썸네일 ② `ch-zone` 색 띠(흰/노랑 `rgba ….045/.06`) ③ 관문 아래 이름+진행 수(`3/6`). 잠금 시 회색+자물쇠, 클리어 시 초록 테두리+체크.
- **에셋**: 터틀 행성 6종·픽셀 행성 4종(`planet-*.png`), `ui-star/lock/check/trophy.png`, 캐릭터 SVG. **미로·스튜디오 챕터는 행성 이미지가 없어 이모지(🐾🔁🚪🏆/🎮)로 폴백**.

### ③ 미션 화면 (3패널)
- **레이아웃**: 헤더(타이틀 + 레벨/미션/별 배지 + 지도·처음·도움말·돌아가기 버튼 + 모드 탭 4개) 아래 [캔버스 35% | Blockly 35% | AI 채팅 나머지] 가로 3패널. 1024px 이하에서는 캔버스 42dvh 상단 고정 + 아래 [🧩 블록 | 💬 토토] 탭 전환 (가로 태블릿은 좌 캔버스/우 탭 2열) — 초등 교실 태블릿을 실제로 고려한 재구성.
- **캔버스 패널**: 모드별 4개 뷰 전환. 터틀(어두운 `#1a1a2e` 캔버스 + 좌표 상태 배지 + 목표/겹쳐보기/속도/시연), 픽셀(micro:bit 프레임 LED 격자 + A/B 버튼 + 흔들기 + 색 팔레트 + 목표 미니뷰/일치율), 미로(`bg-maze.jpg` 배경 + 돌벽 `tile-rock`/포탈 `tile-portal`/보석 `tile-gem` 타일 + 토토 SVG 이동 + 진행 점), 스튜디오(게임 캔버스 + D-패드, `sp-*`/`it-*` 스프라이트와 `bg-canvas-*`/`bg-stage-*` 배경 사용).
- **채팅 패널**: 사용자/AI/시스템/성공 말풍선 + 수학 돋보기 카드(보라) + 추론 카드(노랑) + 코드 카드(다크) + 프롬프트 예시 칩(`□` 빈칸 채우기 방식) — 색으로 메시지 종류를 구분하는 체계가 잘 잡혀 있음.

### ④ 스토리 인트로 모달 (`.story-modal`)
- 상단 우주 장면(`bg-space.jpg` + 텍스트 별 ✦✧ + 캐릭터 SVG 96px 부유) → 챕터 라벨(노랑) + 미션 제목 → 흰 말풍선(꼬리 있음) 스토리 → "모험 시작! 🚀" 주황 그라데이션 버튼. 폭 460px.

### ⑤ 피드백 모달 (`.feedback-modal`)
- 캐릭터 SVG 110px(성공: toto/pixel-success, 실패: toto-cheer/pixel-think) + **이모지 텍스트 별** ⭐ 3개(획득 별 순차 팡팡, 미획득 회색) + 제목/본문 + [다시 도전 | 🗺️ 지도로 가기]. 성공 시 별도 색종이 이모지 26개 낙하. 성공 후 흐름은 반드시 지도로 복귀(별 채워지는 모션 확인) — 게임 루프 설계가 명확.

### ⑥ 온보딩 투어 (`startTour`, `.tour-layer`)
- 스포트라이트(`box-shadow 9999px` 컷아웃) + 토토 말풍선(84px SVG + 텍스트 + 단계 라벨 + 다음/건너뛰기). 6단계 중 3단계가 **행동형**(직접 ▶실행/칩/지도 클릭해야 진행, 대기 문구 깜빡임 + 완료 시 칭찬 말풍선) — 초등 온보딩으로 매우 적절한 패턴. 모바일에서는 대상 패널을 자동으로 펼침.

### ⑦ 기타 모달
- 학생 식별(학교 검색 자동완성 + 학년/반/번호 — 이름 미수집 안내), 교사 현황판(LMS 카드 + 표 + CSV). 교사용은 표 중심의 사무적 스타일로 아동 화면과 의도적으로 분리됨.

## 1.3 에셋 인벤토리 (`public/assets/vibe/`, 서빙본 55개 + `gen/` 원본 47개)

> `gen/`은 AI 생성 원본(각 0.8~1.8MB, gitignore) — 배포 대상 아님. 아래는 서빙본 기준.

| 분류 | 파일 | 용도 (추정 포함) | 크기 |
|---|---|---|---|
| 타이틀 | `title-hero.jpg` | 타이틀 배경 히어로 | **272KB (최대)** |
| 모드 카드 | `card-turtle/pixel/maze/studio.jpg` | 타이틀 모드 선택 카드 4장 | 65~85KB |
| 배경 | `bg-map.jpg` | 월드맵 화면 배경 | 38KB |
| 배경 | `bg-space.jpg` | 스토리 인트로 상단 장면 | 24KB |
| 배경 | `bg-maze.jpg` | 미로 뷰 배경 | 39KB |
| 배경 | `bg-canvas.jpg` / `-chalk/-ocean/-purple.jpg` | 스튜디오 게임 배경(BG 명령) | 8~20KB |
| 배경 | `bg-stage-meadow/-space.jpg` | 스튜디오 그림 배경(초원/달나라) | 21KB |
| 챕터 관문 | `planet-sprout/crystal/puzzle/mirror/lava/rainbow.png` | 터틀 챕터 행성 6종 | 15~33KB |
| 챕터 관문 | `planet-village/neon/billboard/atelier.png` | 픽셀 챕터 행성 4종 | 19~35KB |
| UI 아이콘 | `ui-star/lock/check/trophy.png` | 별·잠금·완료·트로피 | 13~17KB |
| 캐릭터(수제 SVG) | `toto-hello/think/success/cheer.svg` | 토토 표정 4종 (투어·지도·피드백) | 2.6~2.9KB |
| 캐릭터(수제 SVG) | `pixel-hello/think/success.svg` | 픽셀 표정 3종 (**cheer 없음**) | 2.1~2.4KB |
| 스프라이트 | `turtle-top.png` | 터틀 캔버스 거북이(탑뷰) | 12KB |
| 스프라이트 | `sp-cat/fish/robot/rocket/turtle/unicorn.png` | 스튜디오 주인공 6종 | 8~12KB |
| 아이템 | `it-apple/star/gem/candy/coin/flower/bomb/alien.png` | 스튜디오 아이템 8종 | 7~9KB |
| 미로 타일 | `tile-rock/portal/gem.png` | 벽/도착 포탈/보석 | 10~11KB |
| **없음** | (효과음/BGM) | — | — |
| **없음** | (미로·스튜디오 챕터 관문 이미지) | 현재 이모지 폴백 | — |
| **없음** | (파비콘/앱 아이콘) | `<head>`에 icon 링크 없음 | — |

---

# 2. 검토 보고서 (문제점)

> 심각도: **상**(학습·사용에 직접 지장) / **중**(완성도·일관성 저하) / **하**(폴리싱)

## 2.1 타이틀 화면

| 심각도 | 문제 |
|---|---|
| 중 | **`title-hero.jpg` 272KB가 단일 최대 에셋** — 저사양 교실 태블릿·느린 학교망에서 첫 화면 LCP를 지연. 1280px 폭 재인코딩(webp)이면 100KB 이하 가능 |
| 중 | 모드 카드가 `div onclick` — **키보드(Tab/Enter) 접근 불가**. 카드 내부 `.mc-go` 버튼과 카드 전체 클릭이 중복 바인딩이라 스크린리더에서 혼란 |
| 중 | 카드 설명 `.mc-desc` **12.5px** — 초3 기준 작음. 카드 안 텍스트 위계(이름 17px ↔ 설명 12.5px) 격차도 큼 |
| 하 | "👩‍🏫 선생님" 링크가 `rgba(255,255,255,.55)` 12px — 교사도 처음엔 못 찾음. 의도적 은닉이라면 OK, 아니라면 반투명 필 버튼 권장 |
| 하 | 누적 별 배지(`title-star`)가 로고 밑에 붙어 있어 4개 카드와의 시각적 연결(어느 모드에서 몇 개?)이 없음 |

## 2.2 통합 월드맵

| 심각도 | 문제 |
|---|---|
| **상** | **챕터 구분 가시성 부족**: `ch-zone` 색 띠가 `rgba(255,255,255,.045)` / `rgba(255,209,102,.06)` — 어두운 트랙 위에서 사실상 식별 불가. 초등학생에게 "에피소드가 바뀌었다"는 신호가 관문 하나뿐이며, 가로 스크롤 중 관문을 지나치면 현재 챕터를 알 수 없음. 띠 불투명도 상향 + 챕터별 배경 색조 변화 + 구간 경계 장식(깃발·아치) 필요 |
| **상** | **미로·스튜디오 챕터 관문이 이모지 폴백**(🐾🔁🚪🏆) — 터틀·픽셀은 행성 일러스트인데 3·4번째 모드만 이모지라 세계관 몰입이 끊기고 품질 차이가 바로 보임 (`MAZE_CHAPTERS`/`STUDIO_CHAPTERS`에 `img` 필드 없음) |
| 중 | **가로 스크롤 발견성**: 하단 12px 회색 힌트 텍스트뿐. 저학년은 텍스트 안내를 잘 읽지 않음 — 트랙 우측 가장자리 페이드 + 화살표 애니메이션 등 비언어적 힌트 필요. 스크롤바(12px)도 터치 태블릿에선 안 보임 |
| 중 | 잠긴 노드/관문 클릭 시 **흔들림만 있고 소리·말풍선 등 이유 설명이 노드 자체엔 없음**(관문은 intro 문구 교체가 있으나 스크롤 위치상 화면 밖일 수 있음) |
| 중 | `stage-node`(104px)·`ch-gate`가 `div onclick` — 키보드 접근 불가, `aria-disabled`/`role` 없음 |
| 중 | 트랙 고정 높이 262px — 세로가 긴 태블릿(portrait)에서 화면의 1/4만 사용하고 위아래가 빈 지도 배경. 지도가 "화면"이라기보다 "띠"로 보임 |
| 하 | 별 미획득 표시가 회색 별(grayscale)인데 완료-1성 노드와 미완료 노드의 차이가 첫눈에 약함 (완료 뱃지 `ui-check`가 보완하긴 함) |
| 하 | `stage-intro` 스토리 문구가 관문 클릭 시 교체되지만 애니메이션이 없어 바뀐 것을 알아차리기 어려움 |

## 2.3 미션 화면 (3패널)

| 심각도 | 문제 |
|---|---|
| **상** | **데스크톱 터치 타깃**: `.hdr-btn` 11px/6×12px 패딩, `.tab-btn` 12px — 데스크톱 규격 그대로. 교실의 "큰 화면 + 터치" 전자칠판이나 1025px 이상 태블릿에서는 모바일 미디어쿼리(44px 보장)가 안 걸려 저학년이 누르기 어려움 |
| **상** | 헤더 우측 버튼 4개(지도/처음으로/도움말/돌아가기)가 **같은 스타일·같은 크기로 나열** — 핵심 동선인 "🗺️ 모험 지도"의 시각적 위계가 없음. 또 "🏠 처음으로"와 "← 돌아가기"는 초등학생에게 구분이 모호(하나는 타이틀, 하나는 AIroom 이탈) |
| 중 | 캔버스 패널 헤더에 컨트롤이 최대 7개(탭 전환+겹쳐보기+속도+시연+실행+초기화+저장) — 좁은 폭(35%)에서 `flex-wrap`으로 2줄로 꺾이며 ▶실행(가장 중요)이 파묻힘. ▶실행만 크기·위치를 분리 권장 |
| 중 | `confirm()`/`alert()` 네이티브 다이얼로그 사용(모드 전환·나가기·학생정보 검증·기록 삭제) — 앱 전체의 아동용 스타일과 단절, 브라우저 기본 한국어 버튼("확인/취소")은 저학년에게 불친절 |
| 중 | 채팅의 정보 카드 종류가 5가지(수학 돋보기·추론·코드·시스템·AI) — 색 구분은 좋으나 **아이콘·제목 스타일이 제각각**(🔍/💡/이모지 접두사)이라 카드 체계로 인지되기 어려움 |
| 중 | 미로 뷰 `--maze-cell` 48px(1200px 이하 40px)인데 8열 맵 + 패딩이면 좁은 캔버스 패널(35%, min 280px)에서 **수평 오버플로** 가능 — 셀 크기를 컨테이너 기준 계산으로 |
| 하 | DSL 미리보기(`dsl-preview`) 10px 모노스페이스 — 아동이 읽는 용도라면 너무 작고, 교사 디버그용이라면 기본 숨김이 나음 |
| 하 | 픽셀 모드 micro:bit 프레임(#333)과 미로 돌벽 등 다크 계열은 좋으나, 터틀 캔버스는 순수 `#1a1a2e` 단색 — 다른 모드 대비 배경 연출이 빈약 |

## 2.4 스토리 인트로 / 피드백 모달

| 심각도 | 문제 |
|---|---|
| 중 | **피드백 별이 텍스트 이모지 ⭐** — 지도·헤더·타이틀은 `ui-star.png`인데 가장 보상감이 커야 할 피드백 모달만 OS 기본 이모지(플랫폼별 모양 상이). 아이콘 일관성 깨짐의 대표 사례 |
| 중 | 실패 시 캐릭터가 `toto-cheer`(응원) vs 픽셀은 `pixel-think`(생각) — **모드 간 감정 톤 불일치**. 또 "실망/아차" 계열 표정이 없어 실패 연출 폭이 좁음 |
| 중 | 스토리 모달 하단 안내문 11px — 저학년 가독성 밖. 말풍선 본문(15px)과의 위계 차이는 필요하나 13px은 확보 권장 |
| 하 | 스토리 장면의 별이 텍스트 문자(✦✧) 고정 배치 — `bg-space.jpg`와 겹쳐 싸 보임. 배경 이미지에 이미 별이 있다면 제거하거나 반짝임 애니메이션으로 |
| 하 | 인트로 모달 상단 장면이 4개 모드 공통 `bg-space.jpg` — 미로(유적)·스튜디오(공방) 세계관과 안 맞음 |

## 2.5 온보딩 투어

| 심각도 | 문제 |
|---|---|
| 중 | 투어가 **터틀 모드 전용** — 다른 모드에서 ❓도움말을 누르면 만들던 블록이 있어도 터틀로 강제 전환(`startTour`가 `confirmSwitchMode`가 아닌 `switchMode`를 직접 호출하여 확인 없이 워크스페이스 소실) |
| 하 | 스포트라이트 컷아웃이 사각형뿐 — 원형 버튼(▶실행)도 사각 하이라이트. 시선 유도용 손가락/화살표 포인터 없음 |
| 하 | `건너뛰기`가 12px 밑줄 텍스트 — 실수로 누를 일은 없지만 발견도 어려움 (의도적일 수 있음) |

## 2.6 전반 (모든 화면 공통)

| 심각도 | 문제 |
|---|---|
| **상** | **효과음 전무** — 성공/별 획득/잠금 해제/버튼 클릭 등 게임화 보상 루프의 절반(청각)이 비어 있음. 초등 대상 게임형 학습에서 체감 완성도를 가장 크게 좌우하는 결핍 (음소거 토글 필수) |
| 중 | 파비콘/터치 아이콘 없음 — 태블릿 홈 화면 추가·탭 식별 불가 |
| 중 | 저대비 텍스트 다수: `--text-light` #718096(4.5:1 경계), `.stage-hint` 12px, `.chapter-sub` 13px, 11px 이하 텍스트가 10곳 이상 — 초등 저학년 최소 13~14px 권장 |
| 하 | 다크(맵·캔버스·미로) ↔ 라이트(패널·모달) 전환이 잦은데 중간 톤 규칙이 없어 화면마다 배경 처리 방식이 다름 |

## 2.7 CSS 코드 품질 (간단히)

- **미사용 레거시 블록**: `.mission-grid`, `.mission-card`(+`.m-level/.m-title/.m-desc/.m-check`), `.chapter-block/.chapter-head/.chapter-emoji/.chapter-name/.chapter-sub/.chapter-prog`, `.node-path`, `.mission-node`(+하위), `.node-link` — 구(舊) 챕터 리스트 UI 잔재로 현재 `renderWorldMap`은 `stage-*`/`ch-*`만 사용. 약 40줄 데드 코드 (445행 Jua 적용 목록과 468행 done 스타일에도 잔재 참조).
- **모순 규칙**: 177행 `#missionModal .modal-body{background:...bg-map.jpg}` 를 184행 `background:transparent!important` 가 즉시 무효화 — 한쪽 삭제 필요.
- **매직넘버**: `renderWorldMap`의 `GAP=136, PADX=110, H=262`, `py=138+34sin(i*1.15+0.6)` 와 CSS의 `.stage-track{height:262px}` 가 JS/CSS에 이중 정의. z-index 산발(10/1000/2000/2500/2600/3000) — 토큰화 권장.
- **중복 셀렉터**: `.title-logo h1` 이 364·367행에 분리 선언, `#missionModal .modal-body` 2회. `!important` 4곳(대부분 재정의 회피 목적이라 구조 정리로 제거 가능).
- 전반적으로는 주석 구획·변수 활용이 잘 되어 있는 편이며 심각한 품질 문제는 아님.

---

# 3. 에셋 추가 계획서

## 3.1 스타일 가이드 (공통)

기존 에셋 톤: **밝은 채도의 카툰/토이 렌더 스타일**(planet-*, card-*, sp-*, it-*는 Nano Banana 생성 — 부드러운 입체감, 진한 외곽 없음, 어두운 남색 우주 배경과 대비되는 선명한 원색), 캐릭터는 **단순한 플랫 SVG**(토토·픽셀). 신규 에셋 원칙:

- 팔레트: 우주 남색 `#1a1a2e~#2d2b55` 배경 위에서 잘 뜨는 골드 `#FFD166`, 초록 `#51CF66`, 주황 `#FF9800`, 하늘 `#00E5FF`
- 포맷: 아이콘·스프라이트 = 투명 PNG 512×512 원본 → 서빙 시 다운스케일(≤20KB), 배경 = JPG/WebP 1536×864(≤40KB), 효과음 = mp3 44.1kHz mono(≤30KB, 0.3~1.5초)
- 후처리: 기존 파이프라인 `node _check/postprocess.js` 재사용, 원본은 `gen/`에 보관
- AI 이미지 프롬프트 공통 접미사(영어): `..., cute cartoon style for children's educational game, soft 3D toy render, vibrant colors, simple shapes, no text, no watermark, isolated on transparent background` (배경물은 `wide background illustration, no characters` 로 교체)

## 3.2 부족 에셋 목록 + 우선순위

### 🥇 1차 — 필수 (보상 루프·일관성 완성)

| # | 에셋 | 용도 | 규격 | AI 프롬프트 초안 (영어) |
|---|---|---|---|---|
| 1 | 효과음 8종: `sfx-click, sfx-run, sfx-success, sfx-star(×3 pitch), sfx-fail-soft, sfx-unlock, sfx-pop, sfx-gem` | 버튼/실행/미션 성공/별 획득/실패(부드럽게)/챕터 해제/말풍선/보석 줍기 | mp3, 0.2~1.5s, ≤30KB, 음소거 토글과 함께 도입 | (오디오 생성) `short cheerful chime for kids game mission success, bright marimba and bells, 1 second` / `soft gentle "try again" tone, no harsh buzzer, friendly, 0.5 second` / `sparkling star pickup sound, ascending glissando, 0.4 second` |
| 2 | 미로 챕터 관문 4종: `gate-steps, gate-loop, gate-door, gate-badge` (또는 planet-* 네이밍 통일) | `MAZE_CHAPTERS` 이모지 폴백 대체 (순차/반복/선택/시험) | PNG 투명 512², 서빙 96² ≤20KB — 기존 planet 시리즈와 동일 구도(구체+상징물) | `ancient stone ruin gate floating in space, small glowing footprints carved on it, cute cartoon style...` / `...spiral loop symbol glowing on ruin gate...` / `...two mysterious doors with fog...` / `...golden detective badge trophy gate...` |
| 3 | 스튜디오 관문 1종: `planet-studio` | `STUDIO_CHAPTERS` 🎮 폴백 대체 | 위와 동일 | `colorful game workshop planet with joystick and paint brush, floating gears and stars, cute cartoon style...` |
| 4 | 피드백 별 = 기존 `ui-star.png` 재사용 (신규 제작 불필요, 코드 교체만) + 회색 별 상태용 `ui-star-empty.png` | 피드백 모달 이모지 ⭐ 제거, 지도 회색 필터 대체 | PNG 투명 256², ≤10KB | `single gray empty star outline icon, soft 3D toy render, cute cartoon style...` |
| 5 | 파비콘/터치 아이콘: `favicon-32.png, apple-touch-icon-180.png` | 탭·홈 화면 식별 | 토토 얼굴 크롭 (기존 toto SVG 활용 가능, 생성 불필요할 수 있음) | `cute green turtle face icon, simple flat design, app icon style, centered` |
| 6 | `title-hero.jpg` 경량판 | 272KB → ≤100KB (재인코딩, 신규 생성 불필요) | WebP 1600×900 | — |

### 🥈 2차 — 향상 (몰입도·가시성)

| # | 에셋 | 용도 | 규격 | AI 프롬프트 초안 (영어) |
|---|---|---|---|---|
| 7 | 캐릭터 표정 추가: `toto-oops.svg`, `pixel-oops.svg`, `pixel-cheer.svg` | 실패 피드백 감정 톤 통일(2.4절), 픽셀 표정 세트 완성 | 기존 수제 SVG와 동일 스타일(손제작 권장, ≤3KB) | (SVG 손제작 — AI 생성 시) `cute flat vector turtle character with surprised "oops" expression, hand on cheek, simple shapes, matching a children's coding mascot` |
| 8 | 챕터 경계 장식: `flag-chapter.png` (색 변형 CSS로) | 월드맵 `ch-zone` 보강 — 구간 시작에 깃발/아치 | PNG 투명 256×384 ≤15KB | `cute triangular pennant flag on wooden pole, fluttering, cartoon game map checkpoint style...` |
| 9 | 스토리 인트로 모드별 배경 3종: `bg-story-ruin.jpg`(미로), `bg-story-studio.jpg`(스튜디오), `bg-story-city.jpg`(픽셀 — 선택) | 공통 `bg-space.jpg` 탈피 | JPG/WebP 920×480 ≤35KB | `ancient glowing ruins interior with fog and treasure light, wide background for children's game story scene, cartoon style, no characters` / `cozy game maker workshop with screens and toy blocks, warm lights...` |
| 10 | 지도 스크롤 힌트: `arrow-scroll.png` 또는 CSS 화살표 (에셋 없이 가능) | 가로 스크롤 발견성(2.2절) | PNG 투명 128² 또는 순수 CSS | `chunky rounded arrow pointing right, glowing soft yellow, cartoon game UI style...` |
| 11 | 터틀 캔버스 배경: `bg-canvas-turtle.jpg`(은은한 격자+별) | 순수 단색 캔버스 연출 보강 (그리기 방해 없도록 명도 낮게) | JPG 1024×768 ≤25KB | `very dark navy blue background with faint grid lines and tiny stars, subtle, for drawing canvas, minimal` |
| 12 | 트로피 연출: `ui-trophy-glow.png` 또는 기존 트로피 + CSS 글로우 | 전체 클리어 보상 강화 | PNG 투명 256² | `golden trophy with sparkling rays and confetti, cute cartoon style...` |

### 🥉 3차 — 폴리싱

| # | 에셋 | 용도 | 규격 | AI 프롬프트 초안 (영어) |
|---|---|---|---|---|
| 13 | BGM 2종: 월드맵용(잔잔), 미션용(집중) — 루프, 볼륨 낮게, 음소거 기본 제공 | 분위기 | mp3 loop 30~60s ≤400KB | `gentle playful chiptune background music loop for kids space adventure map, calm, 8-bit with soft pads` |
| 14 | 커스텀 커서/터치 리플: `cursor-star.png` 또는 CSS 리플 | 저학년 클릭 피드백 | 32² PNG 또는 CSS | — |
| 15 | 잠금 해제 연출: `fx-unlock-burst.png` 스프라이트시트(또는 CSS 파티클) | 챕터 관문 열릴 때 | 512×512 4~6프레임 | `radial burst of golden sparkles and small stars, animation frames, cartoon style, transparent background` |
| 16 | 미로 타일 확장: `tile-key.png, tile-trap.png` (신규 미션용 예비) | 미로 콘텐츠 확장 대비 | PNG 투명 256² ≤12KB | `cute golden key floating with sparkle, top-down game tile, cartoon style...` |
| 17 | 계절/이벤트 타이틀 변형 (겨울·여름 히어로) | 학기 운영 재미 | WebP 1600×900 | `same space adventure title scene but with winter snow and santa hat on turtle character...` |

## 3.3 단계별 도입 로드맵

| 단계 | 목표 | 항목 | 코드 변경 포인트 |
|---|---|---|---|
| **1차 (필수)** — 1회 작업 | 보상 루프(청각) 완성 + 4개 모드 관문 일관성 + 기본 위생 | #1~#6 | ① 공용 `playSfx(name)` + 헤더 🔊 음소거 토글(localStorage) ② `MAZE_CHAPTERS`/`STUDIO_CHAPTERS`에 `img` 필드 추가 ③ `showFeedback` 별을 `ui-star.png`로 교체 ④ `<head>` favicon 링크 ⑤ title-hero 교체 |
| **2차 (향상)** | 세계관 몰입 + 지도 가시성 | #7~#12 | ① `showFeedback` 실패 캐릭터 oops로 통일 ② `renderWorldMap` ch-zone 불투명도 상향 + 깃발 삽입 ③ `selectMission`의 story-scene 배경을 모드별 분기 ④ 스크롤 페이드/화살표 |
| **3차 (폴리싱)** | 감성 완성 | #13~#17 | BGM 토글(효과음 토글과 분리), 파티클, 이벤트 스킨 |

> **비-에셋 병행 권장**(2장 연계): 데스크톱에도 주요 버튼 44px 보장, `confirm/alert` → 커스텀 모달, 레거시 CSS 40줄 삭제, 11px 텍스트 13px+ 상향, 카드/노드 키보드 접근(`role="button" tabindex`), 투어 진입 시 블록 소실 확인창.

---

*작성: Claude Code 디자인 검토 · 2026-07-08*
