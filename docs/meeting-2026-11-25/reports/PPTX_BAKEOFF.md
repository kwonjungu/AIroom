# PPTX 렌더러 비교 결과

시험일 2026-11-25. 최종 선택은 하지 않고 근거만 낸다. 시험 문서는 웜봇 29장 전체와 바이브코딩 앞 20장이고, 실제 학교 문서라 그림과 문서는 모두 저장소 밖 bake 폴더에만 있다.

## 시험 환경

- 작업 폴더: `~\AppData\Local\Temp\claude\4cda1ab0ca69f9b9\1f3148c4-5cb1-4211-ae9f-b90113f4c458\scratchpad\zzoom-convert\bake\`
- 방법: 로컬 정적 서버(파이썬, 포트 18463)와 Python Playwright 크로미움 145. 후보마다 같은 슬라이드를 긴 변 2000px PNG로 뽑았다. 시간은 슬라이드 한 장을 그리는 데 걸린 시간(문서 읽기 제외)이다.
- 기준 그림: 이 PC의 PowerPoint를 COM으로 열어 `Slide.Export(PNG, 2000, 1125)`로 49장 뽑았다. 시작할 때 PowerPoint가 떠 있지 않았음을 확인했고(`wasRunning=False`), 읽기 전용에 창 없이 열어 프레젠테이션만 Close한 뒤 우리가 띄운 인스턴스만 Quit했다. 한/글은 건드리지 않았다.
- 점수: 기준과 후보를 500px로 줄여 RGB 평균 절대 차이를 0에서 1 사이로 잰 값이다. 낮을수록 가깝다. 흰 배경이 많아 값이 전체적으로 낮게 나오므로 후보끼리 순서를 보는 참고용이다.
- 글꼴 조건이 후보마다 다르다. 기준 그림과 이 PC의 크로미움 후보들(2, 3, 4, 5번)은 Windows에 깔린 맑은 고딕 같은 글꼴을 쓴다. 1번 기준선만 운영 코드(`convert/pptx.js`)처럼 Noto Sans KR와 Noto Serif KR를 SVG에 심어서 그렸다. 글꼴이 없는 PC에서는 2, 3, 4, 5번의 줄바꿈과 모양이 달라질 수 있어 이 점수는 낙관적이다. 후보들에 같은 Noto 글꼴을 강제로 주는 시험은 하지 않았다.

## 후보 표

| 번호 | 패키지와 버전 | 라이선스 | 크기(압축 전 / gzip) | 슬라이드당 시간 | 점수 웜봇 / 바이브 | 눈에 띈 문제 |
|---|---|---|---|---|---|---|
| 1 | `@office-kit/pptx-preview` 0.23.0 + `pptx` 0.30.0 (운영 설정과 같음) | MIT | 번들 1.06MB / 294KB | 200ms / 204ms | 0.022 / 0.036 | 웜봇 1쪽 표지 제목 빠짐, 2쪽 글머리 글 빠짐, 3쪽 「picture (unknown, 212376)」 대체 글, 줄무늬 채움이 옅은 회색으로 나옴. 바이브코딩 쪽은 대체로 무난 |
| 2 | `@aiden0z/pptx-renderer` 1.4.0 (+ `modern-screenshot` 4.7.0으로 래스터) | Apache-2.0 | 2.40MB / 484KB (jszip과 echarts 포함) | 158ms / 200ms | 0.016 / 0.031 | 표지 제목과 도형은 기준과 거의 같다. 웜봇 3쪽에서 앱 아이콘 하나가 회색 자리표시 그림으로 나옴. 12쪽 점수가 가장 높음(0.056). 콘솔 경고 없음 |
| 3 | `@silurus/ooxml` 0.90.2 (canvas, WASM) | MIT | 4.30MB / 1.32MB (파일 67개, WASM 2.0MB 포함) | 51ms / 49ms | 0.013 / 0.031 | 가장 기준에 가까움. 제목 글자가 기준보다 굵게 보이는 정도. 문서 안 글꼴을 받는 `fonts` 옵션은 쓰지 않음. 경고 없음 |
| 4 | `pptxviewjs` 1.1.9 (canvas) | MIT | 번들 1.12MB / 332KB (jszip과 chart.js를 우리가 묶음) | 33ms / 32ms | 0.070 / 0.039 | 웜봇에서 무늬 채움이 빨간색으로 나오고 도형이 어긋남(표지 제목 띠, 학습목표 삼각형). 글머리 위치가 틀어지고 일부 그림이 안 나옴. 경고 1건(그림 경로 없음). 바이브코딩 쪽은 쓸 만함 |
| 5 | `pptx-browser` 4.1.5 (canvas) | MIT | 번들 333KB / 75KB | 34ms / 25ms | 0.102 / 0.069 | 패키지 자체 오류. `render.js`가 `defRPr` 변수를 선언하기 전에 써서(줄 600과 606) 단락이 있는 도형은 모두 `ReferenceError`로 건너뜀. 웜봇 85건, 바이브 60건 경고. 글이 전혀 안 나옴 |
| 5p | 같은 패키지에서 위 두 줄 순서만 고친 사본(참고용) | MIT | 같음 | 47ms / 33ms | 0.069 / 0.100 | 글은 나오지만 바이브코딩에서 글자가 거의 안 보이는 옅은 색으로 나오고, 웜봇은 그림 위치와 크기가 어긋남. 고쳐도 쓰기 어려움 |
| 6 | GenOffice `@genoffice/pptx-render` | Apache-2.0 | 해당 없음 | 돌리지 못함 | 없음 | 아래 설명 |
| 7 | OnlyOffice x2t WASM | AGPL-3.0 | x2t.zip 16.7MB(v9.3.2+4) 외 별도 필요 | 돌리지 못함 | 없음 | 아래 설명 |

문서별 평균 점수의 중앙값, 가장 나쁜 쪽, 슬라이드별 점수는 bake 폴더의 `stats_all.json`에 있다.

## 비교 시트

위치: `~\AppData\Local\Temp\claude\4cda1ab0ca69f9b9\1f3148c4-5cb1-4211-ae9f-b90113f4c458\scratchpad\zzoom-convert\bake\sheets\`

한 줄에 기준, 1번, 2번, 3번, 4번, 5번, 5p번 순으로 놓았고 칸 아래에 점수가 적혀 있다. 한 장에 5줄이다.

- 웜봇: `sheet_warmbot_01-05.jpg`(1쪽과 3쪽 포함), `sheet_warmbot_06-10.jpg`, `sheet_warmbot_11-15.jpg`, `sheet_warmbot_16-20.jpg`, `sheet_warmbot_21-25.jpg`, `sheet_warmbot_26-29.jpg`
- 바이브코딩: `sheet_vibe_01-05.jpg`, `sheet_vibe_06-10.jpg`, `sheet_vibe_11-15.jpg`, `sheet_vibe_16-20.jpg`

후보별 원본 PNG는 `bake\out\<후보>\<문서>_<번호>.png`, 기준은 `bake\ref\`이다. 시트 만드는 코드는 `sheet.py`, 후보별 그리기는 `harness.js`와 `run.py`이다.

## 돌리지 못한 후보와 이유

- 6번 GenOffice: `@genoffice/pptx-render`는 npm에 올라 있지 않다(404). 저장소(genspark-ai/genoffice, Apache-2.0)의 `packages/pptx-render`는 `private: true`인 작업공간 패키지이고 TypeScript 원본만 내보낸다. `@genoffice/pptx-engine`에 기대며, 설명대로 픽셀이 아니라 데이터 형태의 렌더 트리를 만들고 Konva 어댑터는 앱 쪽에 있다. 글자 배치는 opentype.js 글꼴 지표가 필요하다. 그래서 브라우저에서 단독으로 쓰는 묶음이 없어 넘겼다. 참고로 GenOffice를 바탕으로 한 제3자 패키지 `@bitclub.ai/opendesk-office` 0.3.9(Apache-2.0)가 있으나 압축을 풀면 82MB이고 이번 비교 범위 밖이라 시험하지 않았다.
- 7번 OnlyOffice x2t: 시험하지 않고 조사만 했다. x2t 변환기 본체는 AGPL-3.0이고(`@x2t/wasm` 래퍼는 MIT지만 x2t.js와 x2t.wasm은 따로 받아야 하며 AGPL), 받을 수 있는 빌드는 cryptpad/onlyoffice-x2t-wasm 릴리스의 `x2t.zip` 약 16.7MB이다. 래퍼 설명에 따르면 이 WASM만으로는 PDF 출력이 안 되고 OnlyOffice의 레이아웃 엔진(sdkjs와 web-apps)이 만든 그리기 정보가 필요하다. 이를 묶은 unestgroup/office-wasm-viewer(AGPL-3.0-or-later)도 sdkjs 묶음, 글꼴 묶음, 목 서버, iframe 연결이 필요해 쉽게 돌릴 수 있는 빌드는 아니었다. 브라우저에서 PPTX를 PDF로 바꾼 뒤 pdf.js로 그리는 경로는 이번에 만들지 않았다. AGPL이라 서비스에 넣으면 소스 공개 의무를 따져야 한다.

## 참고와 한계

- 포트 8765와 8791은 다른 작업의 서버가 쓰고 있어 건드리지 않고 18463을 썼다.
- 후보 2번의 래스터는 modern-screenshot으로 DOM을 그림으로 바꿨다. 이 방식이 쭘 변환에서 얼마나 안정적인지(글꼴 심기, 큰 문서)는 따로 보지 않았다.
- 슬라이드 80장짜리의 뒤쪽 60장, 애니메이션, 숨김 슬라이드 처리, 메모리 사용량은 시험하지 않았다.
- 3번 후보는 WASM 2MB와 파일 수십 개를 받아야 해 첫 로드가 가장 무겁다. 시간 측정에는 첫 로드가 들어 있지 않다.
