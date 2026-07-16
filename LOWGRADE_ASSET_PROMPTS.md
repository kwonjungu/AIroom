# 저학년 카드 코딩 — 이미지 에셋 프롬프트 팩

> `public/vibecoding.html`의 **저학년 카드 코딩 2모드(goal/shape)** 전용 이미지 에셋 생성 프롬프트.
> 설계문서 `LOWGRADE_CARD_DESIGN.md`의 **에셋 정책**: 카드 아이콘·캐릭터·배경·UI는 이 프롬프트로 생성한 **PNG**로 톤 통일. **코드 인라인 SVG 최소화**(모드2 도형 렌더링만 캔버스 코드 예외).
> 기존 `ASSET_PROMPTS.md`(터틀/픽셀/미로)와 **같은 앱·같은 화풍**을 유지하되, 1~2학년용이라 **더 크고 둥글고 단순하게**.
> 작성: 2026-07-16

---

## 0. 공통 스타일 가이드 (모든 프롬프트 앞에 붙이기)

> **STYLE PREFIX (복사해서 맨 앞에 붙이기):**
> ```
> Flat vector illustration for a KINDERGARTEN / lower-grade children's
> coding app, extra thick soft rounded outlines, chunky simple shapes,
> cel shading with 2 tones, bright saturated friendly colors, big and
> clear silhouette readable at small size, cute toy-like feel,
> no text, no letters, no numbers, no watermark, clean centered composition
> ```
>
> **NEGATIVE:** `realistic, photo, 3d render, text, letters, numbers, watermark, scary, thin lines, complex details, cluttered, gradient mesh`

**저학년 모드 팔레트 (기존 앱 팔레트와 호환):**

| 용도 | HEX |
|---|---|
| 목표 도착 모드 청록 | `#00897B` → `#26C6DA` |
| 도형 겹치기 모드 주황 | `#F4511E` → `#FFB300` |
| 별·목표 옐로 | `#FFD166` |
| 카드 레일 배경 | `#EEF6F9` |
| 도형 6색 (STAMP color 팔레트와 일치) | 빨강 `#E53935` · 파랑 `#1E88E5` · 노랑 `#FDD835` · 초록 `#43A047` · 갈색 `#8D6E63` · 흰 `#FFFFFF` |

**일관성 팁:** ① 카드 아이콘 10여 종은 **한 시트로 한 번에** 뽑아 선 두께·채도 통일(“sticker sheet, same style, transparent background, grid layout”) ② 캐릭터 토토는 기존 `ASSET_PROMPTS.md` §1 정의를 레퍼런스로 재사용 ③ 배경 투명 필요 시 흰 배경 → 배경 제거 ④ 개당 100KB 이하로 압축(모바일).

---

## 1. 카드 아이콘 — 목표 도착 모드 (5종)

카드 앞면에 크게 얹는 아이콘. **글자 없이 픽토그램만**(라벨은 코드가 Jua 폰트로 따로 렌더). 규격 **256×256 투명 PNG**, 카드에서 96px로 표시.
공통: `single bold pictogram on a rounded card-friendly icon, transparent background, centered`.

| 파일명 | 프롬프트 핵심 | 카드 |
|---|---|---|
| `card-move.png` | `a chunky upward pointing arrow, mint-green (#43A047), thick white border, playful slight 3D tilt` | ⬆ 앞으로 |
| `card-turn-left.png` | `a curved rounded arrow turning to the LEFT (counter-clockwise), blue (#1E88E5), thick white border` | ↺ 왼쪽돌기 |
| `card-turn-right.png` | `a curved rounded arrow turning to the RIGHT (clockwise), blue (#1E88E5), thick white border` | ↻ 오른쪽돌기 |
| `card-repeat.png` | `two rounded arrows forming a friendly loop circle, orange (#FB8C00), thick white border, a small sparkle` | 🔁 반복 |
| `card-goal-star.png` | `a happy golden star (#FFD166) with a soft glow and tiny cheeks, sitting on a little pin/flag` | ⭐ 목표(안내용) |

## 2. 카드 아이콘 — 도형 겹치기 모드 (4종)

도형 카드용 **스티커풍** 도형 아이콘(실제 겹침 도형은 캔버스 코드가 그림 — 이건 카드 표지용). 규격 256×256 투명.
공통: `a cute sticker of a single geometric shape with a thick white border and soft drop shadow, glossy toy look, transparent background`.

| 파일명 | 프롬프트 핵심 | 카드 |
|---|---|---|
| `shape-rhombus.png` | `a bright blue (#1E88E5) rhombus / diamond shape` | 🔷 마름모 |
| `shape-rect.png` | `a warm brown (#8D6E63) rounded-corner rectangle standing upright` | ⬛ 네모 |
| `shape-tri.png` | `a red (#E53935) upward triangle` | 🔺 세모 |
| `shape-circle.png` | `a sunny yellow (#FDD835) circle` | ⭕ 동그라미 |

> **주의:** 카드 표지는 톤용 스티커지만, **모드2 무대에서 실제 겹쳐 찍히는 도형은 반드시 캔버스 코드(`drawShape`)** 로 그린다(색·앵커·순서가 동적이고 겹침 채점에 픽셀이 필요하기 때문). 이 스티커 PNG를 무대 스탬프로 쓰지 말 것.

## 3. 목표 도착 모드 — 무대 타일 & 캐릭터 (격자 보드)

미로형 격자(3×3~6×7). **셀 타일**은 이어 붙여도 자연스러운 톱다운(top-down) 뷰. 규격 **128×128 투명/불투명 PNG**(코드가 셀 크기로 스케일).

| 파일명 | 프롬프트 핵심 | 용도 |
|---|---|---|
| `tile-floor.png` | `top-down single square floor tile, soft teal (#26C6DA) rounded path stone, very light, subtle` | 바닥(`.`) |
| `tile-wall.png` | `top-down single square of a chunky rounded green bush / hedge block, cute, casting soft shadow` | 벽(`#`) |
| `tile-start.png` | `top-down square with a friendly rounded start pad / footprint mark, mint color` | 시작(`S`) |
| `tile-goal.png` | `top-down square with a big glowing golden star (#FFD166) target pad, sparkles` | 목표(`G`) |
| `rover-top.png` | `top-down view of a cute chunky little space rover robot seen from directly above, a bright glowing headlight at the FRONT pointing UP, two big rounded wheels on the sides, small antenna, teal-and-white body (#26C6DA), clearly asymmetric front-to-back so its facing is obvious when rotated, transparent background, game sprite` | **이동 캐릭터(신규, 확정)**. 엔진이 `ctx.rotate(heading)`로 회전 → 돌면 앞방향 바뀜. 128×128 |

## 4. 도형 겹치기 모드 — 무대·컨트롤 배경

| 파일명 | 프롬프트 핵심 | 규격 | 용도 |
|---|---|---|---|
| `shape-canvas-bg.png` | `a clean soft cream (#FFF8E1) square art board with a faint 3x3 grid of light dots, thin rounded frame, empty center, no text` | 512×512 | 도형 무대 배경(3×3 앵커 가이드) |
| `anchor-dot.png` | `a small soft translucent circle marker for a tappable position, orange (#FFB300) ring, transparent background` | 128×128 | 어려움 난이도 앵커 픽커 점 |
| `shape-target-frame.png` | `a small rounded photo-frame / picture frame with a little easel, warm orange, empty transparent center, cute` | 256×256 | 목표 미니뷰 액자 테두리 |

## 5. 캐릭터 안내(가이드 패널)

**모드별 안내 캐릭터를 통일**: goal 모드 = 우주 로버(무대에서 조종하는 그 캐릭터), shape 모드 = 기존 토토.

**5a. goal 모드 — 우주 로버 정면 포즈(신규).** §3 `rover-top.png`와 동일 로버의 **정면(front view)** 표정 버전. 공통 정의:
```
the same cute chunky space rover robot, FRONT view (not top-down),
a round friendly face-screen showing simple happy eyes, teal-and-white
body (#26C6DA), two big wheels, small antenna, transparent background
```
| 파일명 | 포즈(정의 뒤 추가) | 상태 |
|---|---|---|
| `rover-hello.png` | `face-screen showing ^ ^ happy eyes, one little arm/wheel waving, welcoming` | 미션 시작 안내 |
| `rover-hint.png`  | `face-screen showing a lightbulb, antenna glowing yellow (#FFD166)` | 💡힌트 |
| `rover-success.png` | `face-screen showing star eyes, headlight beaming, sparkles, hopping` | 성공 |

**5b. shape 모드 — 토토(기존 재사용).** 신규 없음.
| 파일명 | 상태 | 비고 |
|---|---|---|
| `toto-hello.png` | 미션 시작 안내 | **기존 재사용** |
| `toto-hint.png` | 💡힌트 | **기존 재사용** |
| `toto-success.png` | 성공 | **기존 재사용** |

> 신규는 로버 정면 3종만. 톱다운 `rover-top.png`(§3)와 같은 색·같은 얼굴로 시드/레퍼런스 통일.

## 6. 챕터 행성 아이콘 (신규 챕터 2종)

기존 챕터 행성과 동일 규격(512×512 → 256 사용), `a round planet icon floating in space, centered, simple bold shapes, transparent background`.

| 파일명 | 프롬프트 핵심 | 챕터 |
|---|---|---|
| `planet-path.png` | `a friendly green-teal planet with a winding dotted path spiraling around it and a golden star flag on top, top-down road feel` | 🎯 길따라 별 행성 (목표 도착) |
| `planet-shapes.png` | `a playful orange planet built from stacked overlapping geometric blocks — a rhombus, rectangle, triangle and circle piled like toy blocks` | 🔺 도형 나라 행성 (도형 겹치기) |

---

## 7. 파일 배치 & 코드 연결 지점

**실제 관행 = 평면 구조**(하위폴더 없음, prefix로 구분). 모두 `public/assets/vibe/`에 직접 배치:
```
public/assets/vibe/   (기존 tile-*, planet-*, ui-*, sp-* 와 동일 평면)
  card-move / card-turn-left / card-turn-right / card-repeat / card-goal-star  (goal 카드아이콘)
  shape-rhombus / shape-rect / shape-tri / shape-circle                        (도형 카드아이콘)
  tile-floor / tile-wall / tile-start / tile-goal                              (goal 무대 타일; 기존 tile-rock/gem/portal 옆)
  rover-top                                                                    (goal 이동 로버, 회전 스프라이트)
  shape-canvas-bg / anchor-dot / shape-target-frame                            (shape 무대)
  rover-hello / rover-hint / rover-success                                     (goal 가이드; shape는 기존 toto-* 재사용)
  planet-path / planet-shapes                                                  (챕터 행성; 기존 planet-* 옆)
```
> **네임스페이스 주의**: 기존 `card-turtle/pixel/maze/studio.jpg`는 타이틀 화면 **모드 카드**임. 신규 `card-move` 등은 **코딩 카드 아이콘**으로 의미가 다름(파일명 충돌 없음). 헷갈리면 코딩카드를 `cc-*`로 리네임 가능.
> **생성→후처리 흐름**: 배치는 `gen/`에 원본 저장 → `postprocess8.js`가 배경 키잉·리사이즈 후 위 평면 경로로 출력(기존 `postprocess7.js` `keyOutBorder` 재사용).

**연결 시 코드 수정 포인트(에셋 준비되면):**
1. 카드 팔레트 config의 `icon:'⬆'`(이모지) → `img:'/assets/vibe/card/card-move.png'`로 교체, `renderCardPalette/renderCardTrack`이 `img`면 `<img>` 렌더.
2. `renderGoalStage()` — 셀 배경을 `tile-*.png`로(현재 미로는 색+이모지). 캐릭터는 `walker-top.png` 회전 drawImage.
3. `renderShapeCanvas()` 배경 = `shape-canvas-bg.png`, 목표 미니뷰 = `shape-target-frame.png`. **도형 자체는 캔버스 코드 유지.**
4. `GOAL_CHAPTERS`/`SHAPE_CHAPTERS`에 `img:` 필드 추가 → 월드맵 `.chapter-emoji`를 `<img>`로.
5. **최적화:** 모든 PNG tinypng 압축, 개당 100KB 이하.

**우선순위:** ①카드 아이콘 9종(§1·§2) = 가장 먼저(모드 정체성) → ②goal 타일 5종(§3) → ③shape 무대 3종(§4) → ④챕터 행성 2종(§6). 캐릭터는 기존 재사용이라 신규 거의 없음.

---

## 8. 생성 완료 상태 (2026-07-16)

**22종 전부 생성·검증 완료** → `public/assets/vibe/`에 배치(평면). 임시 응답 JSON은 삭제, 원본은 `gen/`(gitignore, 1024²).

- **생성 스크립트**: `_check/gen-assets8.js`(22종 1차) · `gen-assets8b.js`(검수 후 재생성 10종, 크로마초록+품질수정) · `gen-assets8c.js`(2차 재검수 후 3종). 모델 `gemini-2.5-flash-image` 배치.
- **후처리**: `_check/postprocess8.js` — **모서리 색 기준 플러드필 키잉**(흰/남색/올리브 배경 모두 대응, 크로마 #00FF00 고정 아님) + 트림 + 리사이즈. 타일은 cover 정사각, canvas-bg는 불투명.
- **디프린지**: 다크 배경용 `planet-shapes`·`shape-tri`의 밝은 1px 프린지 제거(montage8.js 검증).
- **검증**: `_check/montage8.js` → light/dark/goalgrid/shapestage 몽타주로 프린지·타일링·문맥 확인. 3회 검수 에이전트 통과.
- ⚠️ **제출 함정(재현 시)**: Windows PowerShell 5.1은 `[Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12` 강제 필요(안 하면 "connection closed"). 인증 헤더 `x-goog-api-key`. `dump`로 본문 → `Invoke-RestMethod` 제출 → `Invoke-WebRequest` 폴링(응답 파일 저장) → node `save`로 추출.
- ⚠️ **모델 특성**: 순수 단색 배경을 잘 못 그림(크로마 요청해도 올리브 그라디언트) → 순수 크로마 의존 말고 **모서리 플러드필 키잉**이 정답. 초록 화살표(card-move)처럼 배경색과 가까운 피사체는 배경색을 피할 것.
- **재생성 방법**: 프롬프트 수정 후 `node _check/gen-assets8X.js dump` → PowerShell 제출/폴링 → `node ... save` → `node _check/postprocess8.js`.
