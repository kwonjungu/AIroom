# 바이브코딩 이미지 에셋 설계 프롬프트 팩

`public/vibecoding.html`에 실제로 꽂을 수 있는 이미지 에셋 생성용 프롬프트 모음.
Midjourney / DALL-E / 이미지 생성 AI 어디에든 사용 가능 (영문 프롬프트가 품질이 좋아 영문 기준, 한글 설명 병기).

---

## 0. 공통 스타일 가이드 (모든 프롬프트 앞에 붙이기)

> **STYLE PREFIX (복사해서 모든 프롬프트 맨 앞에 붙이세요):**
>
> ```
> Flat vector illustration for a children's educational coding app,
> thick soft rounded outlines, cel shading with 2 tones, bright saturated
> friendly colors, simple geometric details, cute mascot style,
> no text, no letters, no watermark, clean composition
> ```
>
> **NEGATIVE (제외 키워드):** `realistic, photo, 3d render, text, letters, watermark, scary, complex details, gradient mesh`

**앱 팔레트 (프롬프트에 색을 지정할 때 사용):**

| 용도 | HEX |
|---|---|
| 메인 블루 (버튼·터틀 UI) | `#4A90D9` |
| 코랄 (강조·실패 위로) | `#FF6B6B` |
| 성공 그린 | `#51CF66` |
| 별·목표 옐로 | `#FFD166` |
| 우주 배경 네이비 | `#1a1a2e` → `#2d2b55` |
| 픽셀 모드 퍼플 | `#7C4DFF` |
| 터틀 모드 그린 | `#2E7D32` → `#43A047` |

**일관성 팁:** ① 캐릭터는 먼저 "캐릭터 시트" 1장을 뽑고, 이후 포즈는 그 이미지를 레퍼런스로 넣어 생성 ② 같은 시드/스타일 키워드 유지 ③ 배경 투명이 필요한 에셋은 흰 배경으로 뽑은 뒤 배경 제거.

---

## 1. 캐릭터 — 거북이 탐험가 '토토' (5포즈)

**공통 캐릭터 정의 (매 포즈 프롬프트에 포함):**
```
a cute baby sea turtle explorer mascot named Toto, bright green shell
(#51CF66) with soft hexagon pattern, tiny orange explorer backpack,
round goggles resting on forehead, big sparkling eyes, standing upright,
full body, front view, transparent background
```

| 파일명 | 포즈 프롬프트 (캐릭터 정의 뒤에 추가) | 쓰이는 곳 |
|---|---|---|
| `toto-hello.png` | `waving one flipper cheerfully, welcoming smile` | 스토리 모달 기본, 채팅 아바타 |
| `toto-think.png` | `flipper on chin, curious thinking expression, small floating gear icons around head` | 🧠 추론 카드 헤더 |
| `toto-success.png` | `jumping in the air with both flippers raised, ecstatic open-mouth smile, sparkles around` | 미션 성공 모달 |
| `toto-hint.png` | `holding up a glowing yellow lightbulb (#FFD166), encouraging wink` | 💡 힌트 메시지 |
| `toto-cheer.png` | `gentle warm smile, both flippers making a fighting cheer pose` | 실패 시 "거의 다 됐어요" |

**규격:** 1024×1024 생성 → 512×512 투명 PNG로 내보내기.

## 2. 캐릭터 — 로봇 '픽셀' (5포즈)

**공통 캐릭터 정의:**
```
a small friendly hovering robot mascot named Pixel, rounded square head
with a 5x5 LED matrix face showing simple pixel eyes, mint white body
with purple accents (#7C4DFF), stubby arms, tiny thruster flame below,
full body, front view, transparent background
```

| 파일명 | 포즈 (LED 표정으로 감정 표현!) | 쓰이는 곳 |
|---|---|---|
| `pixel-hello.png` | `LED face showing ^ ^ happy eyes, one arm waving` | 스토리 모달, 채팅 아바타 |
| `pixel-think.png` | `LED face showing a question mark pattern, arm on chin` | 🧠 추론 카드 |
| `pixel-success.png` | `LED face showing heart eyes, both arms up, confetti-free sparkles` | 미션 성공 |
| `pixel-hint.png` | `LED face showing a lightbulb pattern, projecting a small hologram` | 힌트 |
| `pixel-cheer.png` | `LED face showing determined eyes, fist pump pose` | 격려 |

## 3. 챕터 행성 아이콘 — 터틀 6종 + 픽셀 4종

**공통:** `a round planet icon floating in space, centered, simple bold shapes, transparent background` / 규격 512×512 → 256 사용.

| 파일명 | 프롬프트 핵심 | 챕터 |
|---|---|---|
| `planet-sprout.png` | `small green planet with a giant cute sprout on top, thin geometric line patterns forming squares on the surface` | 🌱 새싹 행성 (3-1) |
| `planet-crystal.png` | `blue ice planet with large triangular crystal shards jutting out, glowing edges` | 🔷 크리스탈 행성 (4학년) |
| `planet-puzzle.png` | `orange planet whose surface is made of interlocking puzzle pieces and quadrilateral tiles, one piece floating off` | 🧩 퍼즐 행성 (4-2) |
| `planet-mirror.png` | `pink-violet planet split vertically in half, left side full color, right side fading ghost outline, symmetrical` | 🪞 거울 행성 (5학년) |
| `planet-lava.png` | `dark volcanic planet with glowing red-orange lava cracks, a golden star rising above it` | 🌋 용암 행성 (도전) |
| `planet-rainbow.png` | `white planet with a rainbow ring like Saturn, colorful paint splashes on surface` | 🌈 무지개 행성 (자유) |
| `planet-village.png` | `dark planet with tiny cozy houses whose windows glow like LED dots in a grid pattern` | 🏘️ 픽셀 마을 (5×5) |
| `planet-neon.png` | `planet with an 8-bit pixel art neon city skyline, cyan and magenta glow` | 🌆 네온 도시 (8×8) |
| `planet-billboard.png` | `a giant glowing LED billboard screen floating in space showing a simple pixel heart, planet behind` | 🌌 은하 전광판 (16×16) |
| `planet-atelier.png` | `planet shaped like an artist palette with paint blobs, floating brush` | 🎨 자유 아틀리에 |

## 4. 배경 이미지 (3종)

| 파일명 | 프롬프트 | 규격 | 쓰이는 곳 |
|---|---|---|---|
| `bg-space.png` | `deep navy space background, gradient from #1a1a2e to #2d2b55, tiny white star dots, subtle purple nebula clouds, two small planets in far distance, empty center area for content, no text` | 1600×1000 | 스토리 인트로 모달 `.story-scene` |
| `bg-map.png` | `soft light blue adventure map background, paper texture feel, dotted trail paths connecting empty circular spots, tiny clouds and stars scattered, very light and unobtrusive` | 1600×1200 | 모험 지도 모달 `.modal-body` |
| `bg-canvas-stars.png` | `very dark navy (#1a1a2e) seamless tile with sparse faint stars, extremely subtle, suitable as canvas backdrop` | 512×512 타일 | 터틀 캔버스/픽셀 뷰 배경 |

## 5. UI 아이콘 세트 (투명 PNG 256×256)

| 파일명 | 프롬프트 핵심 | 대체 대상 |
|---|---|---|
| `ui-star-gold.png` | `single shiny golden star (#FFD166) with soft glow and tiny sparkle` | ⭐ (별점·누적 별) |
| `ui-star-gray.png` | `single flat gray star, slightly transparent, no glow` | 미획득 별 |
| `ui-lock.png` | `cute rounded padlock, gray-blue, small keyhole heart` | 🔒 잠긴 미션 |
| `ui-check-badge.png` | `round green (#51CF66) badge with white checkmark, ribbon tails at bottom` | ✅ 완료 표시 |
| `ui-target.png` | `archery target with an arrow, red and white rings` | 🎯 목표/일치율 |
| `ui-bulb.png` | `glowing lightbulb with rays, yellow #FFD166` | 💡 힌트 버튼 |
| `ui-brain.png` | `cute pastel brain with small gears, friendly` | 🧠 추론 카드 |
| `ui-trophy.png` | `golden trophy cup with a star on it` | 🏆 전체 완료 |

## 6. 터틀 캔버스 스프라이트 & 도장 에셋

**거북이 스프라이트 교체** (현재 `turtle-sprite.png` 6.4MB → 최적화 필수):
```
top-down view of the same cute turtle Toto seen from directly above,
head pointing UP, symmetrical, simple flat shell pattern,
transparent background, game sprite style
```
- 파일: `turtle-top.png`, **128×128** (코드가 36px로 회전시켜 그리므로 작아도 됨)

**도장(STAMP) 10종** — 현재 이모지 🌸⭐❤️🍀🦋🌙☀️🍎🐟🏠 대체. 공통: `sticker style with thick white border and slight drop shadow, transparent background`, 256×256:
`stamp-flower.png`(cherry blossom) / `stamp-star.png` / `stamp-heart.png` / `stamp-clover.png`(four-leaf) / `stamp-butterfly.png` / `stamp-moon.png`(crescent with face) / `stamp-sun.png`(smiling sun) / `stamp-apple.png` / `stamp-fish.png` / `stamp-house.png`(cozy tiny house)

## 7. 미션 노드 배지 프레임 (선택)

미션 39개 아이콘을 전부 그리는 대신, **프레임 3종**만 만들어 이모지 위에 겹치면 됨:
| 파일명 | 프롬프트 | 상태 |
|---|---|---|
| `frame-open.png` | `empty round badge frame, blue (#4A90D9) rim with subtle glow, transparent center` | 도전 가능 |
| `frame-done.png` | `round badge frame, green (#51CF66) rim with laurel leaves, transparent center` | 완료 |
| `frame-locked.png` | `round badge frame, flat gray rim with chain detail, transparent center` | 잠김 |

---

## 8. 파일 배치 & 코드 연결 지점

```
public/assets/vibe/
├── char/   toto-*.png, pixel-*.png      → .story-char, .chat 아바타, 추론 카드
├── planet/ planet-*.png                  → .chapter-emoji, 스토리 모달 상단
├── bg/     bg-space.png, bg-map.png      → .story-scene, .modal-body CSS background
├── ui/     ui-*.png, frame-*.png         → .star-total, .n-stars, .m-check, 잠금
└── stamp/  stamp-*.png, turtle-top.png   → drawStampAt(), drawTurtleSprite()
```

**연결 시 코드 수정 포인트** (에셋 준비되면 요청할 것):
1. `.story-char` — 이모지 → `<img>` 교체 (미션 모드별 `toto-hello`/`pixel-hello`)
2. `TURTLE_CHAPTERS`/`PIXEL_CHAPTERS`에 `img:` 필드 추가 → `.chapter-emoji`를 `<img>`로
3. `drawStampAt()` — 이모지 fillText → Image 캐시 후 drawImage
4. `drawTurtleSprite()` — `turtle-sprite.png` → `turtle-top.png` 경로 교체
5. 별/잠금/체크 — CSS `background-image` 또는 `<img>` 교체
6. **최적화 규칙:** 모든 PNG는 tinypng 등으로 압축, 개당 100KB 이하 (안전포스터처럼 5MB 파일 금지 — 모바일에서 느려짐)
