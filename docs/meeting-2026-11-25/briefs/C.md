너는 쭘(ZZOOM) 회의 시스템의 **엔진팀 C(파일 변환)**다. 먼저 `C:\Users\권준구\Desktop\AIroom\docs\meeting-2026-11-25\TEAM_COMMON.md` 를 읽고 그대로 따른다. 설계 기준은 같은 폴더 `DESIGN.md` v2 파트 C(C-1~C-4)와 K.

## 소유 파일
- `public/zzoom/convert/` 아래 전부(새): `index.js`(공통 `convert(file,{onProgress,signal})`), `pdf.js`, `image.js`, `hwp.js`, `pptx.js`, `worker.js`(쓰는 경우), `vendor.js`(CDN 주소·고정 버전·해시를 한 곳에)
- `docs/meeting-2026-11-25/convert-check.md` (새)
- 실험용 하네스·결과 그림은 저장소 밖 `C:\Users\권준구\AppData\Local\Temp\claude\4cda1ab0ca69f9b9\1f3148c4-5cb1-4211-ae9f-b90113f4c458\scratchpad\zzoom-convert\` 에만(시험 문서는 그 안 `docs\` 에 이미 복사돼 있다: HWP 2, HWPX 3, PPTX 2). npm 패키지를 받아 볼 때도 이 폴더에(`npm pack` 또는 별도 폴더 `npm i`), 저장소 node_modules 에 넣지 않는다.

## 할 일
1. **0단계 실험 먼저**(DESIGN C-3): `@rhwp/core@0.9.1` 로 세 경로(① Worker+OffscreenCanvas measureText+renderPageSvg→메인 래스터 ② 메인 renderPageToCanvas 한 쪽씩 양보 ③ 메인 renderPageSvg→Image→canvas)를 로컬 정적 서버 + Python Playwright(크로미움, 이 PC에 있음)로 돌려 쪽 수·시간·결과 그림을 비교한다. README 의 `globalThis.measureTextWidth` 필수. 글꼴은 라이선스를 확인해 함초롬체 재배포가 확실하지 않으면 Noto Serif KR·Noto Sans KR(OFL) 웹폰트로.
2. PPTX: `@office-kit/pptx` + `@office-kit/pptx-preview` 호환 버전 쌍을 고정해 `loadPresentation`→`getSlides`→SVG(`textLayout:'svg'`)→canvas 래스터가 되는지, foreignObject·외부 리소스로 래스터가 깨지지 않는지 본다. 안 되면 `@aiden0z/pptx-renderer` 를 같은 기준으로 시험.
3. PDF(`pdfjs-dist` 정확한 버전 고정, 본체·worker 같은 버전)와 이미지 경로는 설계대로.
4. WASM 배포원: jsDelivr·unpkg 에서 `rhwp_bg.wasm` 실제 응답(크기·sha256·Content-Type·CORS 헤더·받는 시간)을 재서 `vendor.js` 에 고른 주소와 해시를 적는다.
5. 출력 규칙(C-1): 긴 변 2000px WebP 0.85, 썸네일 320px, 60쪽·50MB·3분 상한, 한 쪽씩 처리하고 canvas/bitmap 해제, `signal` 로 취소. `.ppt` 는 안내 오류(`code:'PPT_LEGACY'`). 실패는 `code` 가 있는 오류로(`HWP_RENDER`, `FONT_LOAD`, `TOO_MANY_PAGES` 등).
6. 결과 그림을 직접 열어 눈으로 보고(쪽 수 일치·글자 잘림·표 어긋남·그림 누락), 한/글 원본과 비교가 필요하면 이 PC의 한/글로 PDF를 뽑지 말고 결과 그림만 판정한다(한/글 자동화 금지). `convert-check.md` 에 문서별 표(형식·쪽 수·경로·시간·판정·문제)와 최종 고른 경로·이유.

보고서 `docs/meeting-2026-11-25/reports/C.md`: `convert()` 의 정확한 입출력·오류 코드 표(통합 담당이 업로드 화면에서 쓴다). 마지막 답변은 요약 10줄 이내.
