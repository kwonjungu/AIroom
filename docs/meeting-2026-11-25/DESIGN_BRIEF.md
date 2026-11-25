# 쭘 디자인 기준 (디자인 1~5팀 공통)

바탕은 레포 `DESIGN.md`(Apple 계열: 여백 넉넉, 얇은 구분선, 큰 제목, 그림자 거의 없음). 그 위에 쭘 고유 색을 얹는다.
**Zoom 의 파란색(#0B5CFF·#2D8CFF)과 카메라 로고는 쓰지 않는다.**

## 색 (CSS 변수, `zzoom.css` 에 정의 — 팀은 변수만 쓴다)
| 변수 | 값 | 쓰임 |
|---|---|---|
| `--zz-accent` | `#FF6B3D` (귤색) | 주요 버튼, 진행자 표시, 녹음 외 강조 |
| `--zz-accent-ink` | `#C2410C` | 귤색 위 글자·눌린 상태 |
| `--zz-accent-soft` | `#FFF1EB` | 선택된 항목 배경 |
| `--zz-ink` | `#1d1d1f` | 본문 |
| `--zz-muted` | `#6e6e73` | 보조 글자 |
| `--zz-line` | `#e0e0e0` | 구분선 |
| `--zz-canvas` | `#f5f5f7` | 화면 바탕 |
| `--zz-surface` | `#ffffff` | 카드·옆칸 |
| `--zz-stage` | `#2a2a2c` | 문서가 놓이는 무대(어두운 바탕) |
| `--zz-live` | `#E5484D` | 「● 진행 중」「● 녹음 중」 |
| `--zz-ok` | `#30A46C` | 찬성·연결됨 |
| `--zz-warn` | `#F5A524` | 연결 확인 중 |
| 판서 색 | 형광펜 `#FFE14D` `#9BE15D` `#FF8AD8` (불투명도 0.35) / 펜 `#E5484D` `#2F6FEB` `#1d1d1f` | |

## 글꼴·크기
- `Pretendard, -apple-system, "Apple SD Gothic Neo", "Malgun Gothic", sans-serif` (Pretendard 는 CDN, OFL)
- 제목 28/600, 소제목 20/600, 본문 16/400, 보조 13/400. 숫자(쪽 번호·집계)는 `font-variant-numeric: tabular-nums`.

## 간격·모양
- 간격 4의 배수(4·8·12·16·24·32). 카드 둥글기 14px, 버튼 10px, 칩 999px.
- 누를 수 있는 것은 **최소 44×44px**(태블릿 손가락). 도구 막대 아이콘 28px 그림 + 44px 터치 영역.
- 그림자: 떠 있는 막대·카드만 `0 4px 16px rgba(0,0,0,.08)`.
- 움직임 150~200ms, `prefers-reduced-motion` 이면 끈다.

## 아이콘·그림
- `public/zzoom/assets/` 의 WebP 만 쓴다(목록 `ASSETS.md`). SVG·아이콘 폰트·이모지 대체 금지.
- `<img src alt="">` + 옆에 글자 라벨(아이콘만 있는 버튼 금지, 좁은 화면은 `aria-label`).

## 말투
- 버튼과 안내는 짧은 존댓말: 「입장하기」「진행자 화면으로 돌아가기」「펜 모드」.
- 가운뎃점(·) 나열·화살표 대신 조사로 풀어 쓴다.
