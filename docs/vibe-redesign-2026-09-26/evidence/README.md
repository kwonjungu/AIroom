# 개편 전 조사 증거

2026-09-26의 배포 UI를 Chromium으로 관측했다. 여기에 있는 PNG는 새 디자인 시안이 아니다.

- `desktop-*`: 1440×900.
- `tablet-*`: 768×1024.
- `mobile-*`: 390×844, 보조 반응형 확인.
- `*-home.png`: 기존 시작 화면.
- `*-shape-map.png`, `*-studio-map.png`: 기존 도형/게임 공방 단계 지도.
- `*-shape-workspace.png`: 첫 도형 미션을 선택하고 시작한 화면.
- `browser-audit.json`: viewport, 현재 모드, 미션 수, 단계 요소 크기·글자 크기, 빈 도형 채점.
- `audit-current-ui.py`: 재현용 스크립트. Python Playwright/Chromium 필요.

재현은 `python docs/vibe-redesign-2026-09-26/evidence/audit-current-ui.py`로 한다. 배포가 바뀌면 결과도 바뀌며 기존 증거를 덮어쓰므로 과거 비교본은 별도로 보존한다.

API 학생 정보 읽기·쓰기와 실제 AI 생성은 차단했다. AI 설정 확인 GET만 mock 응답으로 대신했다. 학생 신원 없이 UI 함수로 모드·미션을 선택했다. 인증·서버 API·실제 생성 품질·실기기 터치의 테스트 결과로 해석하면 안 된다.

초기 소스 스냅샷:

| 대상 | SHA-256 |
|---|---|
| 로컬 public/vibecoding.html | cc41b1a116c1274a867303143bc9e9b4bb01b6e8b6ffadfee73f8c617d602a48 |
| 당시 HTTP로 받은 배포 HTML | 7f1008d671f7e7ef9f5e36ec571eb9f8a25eb24d31ca1314f458056e48fe69c7 |

로컬 미커밋 드롭 리스너 수정은 변경하지 않았다. 두 소스가 동일하지 않으므로 로컬 줄 번호와 배포 화면은 구분해서 인용한다. 네트워크/CDN·이미지 로딩 차이도 실제 기기에서 다시 확인해야 한다.
