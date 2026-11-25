# 쭘 파일 변환 확인 (엔진팀 C)

시험일 2026-11-25. 크로미움 145(Playwright), 로컬 정적 서버, 실제 `convert()` 를 메인 스레드에서 호출. 시험 문서는 실제 학교 문서라 저장소에 넣지 않았고 결과 그림도 저장소 밖에 있다. 한/글 프로그램은 쓰지 않았다(원본과의 비교는 쪽 번호 꼬리표와 눈 판정만).

## 1. 문서별 결과 (최종 `convert()`)

| 문서 | 형식 | 쪽 수 | 경로 | 시간 | 용량 | 판정 | 문제 |
|---|---|---|---|---|---|---|---|
| 재난대피훈련 계획 (HWP) | hwp | 22 (원본 꼬리표 22) | rhwp 메인 canvas | 9.3초(첫 실행, 변환기 받기 포함) | 2.7MB | 통과 | 글자 잘림·표 어긋남 없음 |
| 활동지 업데이트 설계서 (HWP) | hwp | 6 | 같음 | 1.2초 | 0.5MB | 조건부 | 표 열이 매우 좁아 글자가 세로로 쪼개짐. 원본 표도 좁은 열일 가능성이 있으나 한/글 비교를 못 해 확정 못 함 |
| 재난대피훈련 계획 (HWPX) | hwp | 22 | 같음 | 4.8초 | 2.7MB | 통과 | HWP판과 같은 그림 크기 |
| 35-36차시 교재 (HWPX) | hwp | 12 | 같음 | 2.4초 | 1.3MB | 통과 | 삽화·색 띠·표 정상 |
| 프로그램 운영 결과 보고서 (HWPX) | hwp | 2 | 같음 | 0.7초 | 0.2MB | 통과 | 사진 4장·표 정상 |
| 웜봇 수업 (PPTX) | pptx | 29 | office-kit SVG→canvas | 6.7초 | 1.2MB | 조건부 | 표지 도형 일부 회색으로 번짐, 3쪽에 「picture (unknown…」 대체 글이 보임, 글꼴이 Noto 로 바뀌어 줄바꿈이 조금 다름 |
| 바이브코딩 심화연수 (PPTX) | pptx | 80 | - | 0.3초 | - | 한도 거절 | 60쪽 초과라 `TOO_MANY_PAGES` (의도된 동작) |
| 시험 PDF 3쪽 | pdf | 3 | pdf.js | 0.7초 | 0.15MB | 통과 | 한글·영문·도형 정상 |

PPTX 두 번째 문서는 80장이라 한도 시험으로 썼다. 변환 가능한 PPTX 는 웜봇 한 건이다.

## 2. 오류 경로 시험

| 입력 | 결과 코드 |
|---|---|
| PDF 65쪽 | TOO_MANY_PAGES (65쪽, 0.2초) |
| 암호 PDF | PDF_PASSWORD (고침 전에는 Math.sumPrecise 오류로 PDF_PARSE 였음) |
| 깨진 PDF | PDF_PARSE |
| 가짜 .hwp(2바이트)·깨진 .hwp | HWP_PARSE |
| PNG(투명)·JPG 큰 그림·WebP | 통과, 긴 변 2000px 이하 WebP |
| 변환 중 2.5초에 취소 | ABORTED |

## 3. 0단계 실험 (HWP 세 경로)

같은 HWPX 22쪽/2쪽 문서, 이 PC 크로미움 기준.

| 경로 | 22쪽 | 2쪽 | 결과 |
|---|---|---|---|
| A Worker + OffscreenCanvas measureText + renderPageSvg → 메인 래스터 | 7.3초 | 1.5초 | 그림은 같다. Worker 안에서는 `renderPageToCanvas` 가 OffscreenCanvas 를 못 받아(HTMLCanvasElement 전용) SVG 뿐이다. 글꼴 적재 0.2초 별도 |
| B 메인 `renderPageToCanvas` 한 쪽씩 양보 | 7.6초 | 1.0초 | 통과. 웹폰트가 canvas 에 그대로 쓰임 |
| C 메인 `renderPageSvg` → Image → canvas | 6.1초 | 0.7초 | 속도는 가장 빠르나 SVG 를 Image 로 그릴 때 웹폰트가 안 먹어 글꼴을 SVG 안에 심어야 하고(심으면 9.3초) 다른 브라우저에서 불안 |

시간 차는 세 경로가 서로 20% 안팎이라 결정 요인이 아니다. 쪽 수는 세 경로 모두 같다.

## 4. 고른 경로와 이유

- **HWP·HWPX: B.** 웹폰트(Noto)가 canvas 에 바로 쓰이고, 한 쪽씩 처리해 메모리가 낮고(힙 약 98MB), 취소·시간 제한을 쪽마다 확인할 수 있다. Worker(A)는 어차피 SVG 만 쓸 수 있고, C 는 글꼴 심기가 필요하다.
- **PPTX: office-kit 0.30.0 + pptx-preview 0.23.0** 이 `textLayout:'svg'` 로 되어 foreignObject 없이 래스터된다. 대체 라이브러리는 시험하지 않았다(되기 때문).
- **PDF: pdfjs-dist 6.5.438** 본체·worker 해시 고정. 구형 브라우저용으로 `Math.sumPrecise` 를 앞에 붙인다.
- **WASM 배포원:** `rhwp_bg.wasm` 27,882,066바이트, sha256 `e2e56dfd…c9abc1`. jsDelivr 는 `application/wasm`, CORS `*`, br 8.46MB, 0.33초. unpkg 는 같은 헤더, gzip 10.5MB, 2.65초. 1순위 jsDelivr, 2순위 unpkg, 해시가 다르면 다음 주소로 넘어가고 모두 틀리면 HASH_MISMATCH. 글꼴은 Noto Sans/Serif KR(OFL)이며 함초롬체는 재배포 조건이 불확실해 쓰지 않았다.

## 5. 한계

- 글꼴이 Noto 로 바뀌므로 원본과 줄바꿈이 조금 다를 수 있다(`warnings` 에 안내가 들어간다). 중요한 문서는 PDF 로 올리게 안내한다.
- 첫 HWP 변환은 WASM(8~10MB 전송)을 받느라 몇 초 더 걸린다.
- 활동지 설계서(HWP)의 좁은 표는 원본 확인이 필요하다.
- 이 시험은 크로미움 한 종류에서만 했다. 파이어폭스·사파리는 못 돌렸다.
