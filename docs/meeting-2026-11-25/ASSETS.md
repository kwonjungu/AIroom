# 쭘 에셋 목록 (코덱스 이미지 생성 → WebP)

공통 스타일(모든 프롬프트 앞에 붙임):
> Flat 3D-ish soft icon, rounded friendly shapes, main color tangerine orange #FF6B3D with warm cream #FFF1EB and charcoal #1d1d1f accents, subtle soft shading, no text, no letters, centered, generous padding, transparent background, consistent stroke-free style, 1024x1024.

| 파일 | 크기(WebP) | 무엇 | 프롬프트 요지 |
|---|---|---|---|
| `logo.webp` | 512 | 쭘 로고 마크 | two overlapping rounded speech bubbles forming a playful "zz" rhythm, like people gathering around a shared page; NOT a camera, NOT blue |
| `icon-pen.webp` | 128 | 펜 | a chunky marker pen tilted 45° |
| `icon-highlighter.webp` | 128 | 형광펜 | a wide highlighter with translucent yellow stroke |
| `icon-eraser.webp` | 128 | 지우개 | a rounded block eraser |
| `icon-hand.webp` | 128 | 손들기 | a raised open hand, friendly |
| `icon-poll.webp` | 128 | 투표 | a ballot card with three horizontal bars |
| `icon-chat.webp` | 128 | 채팅 | a single rounded speech bubble with three dots |
| `icon-board.webp` | 128 | 화이트보드 | a small easel whiteboard with a doodle |
| `icon-record.webp` | 128 | 녹음 | a round microphone with a small red dot |
| `icon-follow.webp` | 128 | 진행자 따라가기 | a page with a curved arrow returning to it |
| `icon-upload.webp` | 128 | 안건 올리기 | a document with an upward arrow |
| `icon-export.webp` | 128 | AI용 기록 받기 | a document with a small sparkle |
| `icon-people.webp` | 128 | 접속자 | three rounded people silhouettes |
| `empty-list.webp` | 640 | 회의 없음 빈 화면 | a calm empty meeting table with a coffee cup, cream background shapes |
| `empty-agenda.webp` | 640 | 안건 없음 | a stack of blank pages waiting, small plant |
| `hero-join.webp` | 960 | 입장 화면 | several tablets around a table all showing the same orange page, top-down, cozy |

생성: 원본 PNG 는 `public/zzoom/assets/_src/`(gitignore), 투명 배경 확인 → `sharp` 또는 `cwebp` 로 위 크기 WebP(품질 85).
