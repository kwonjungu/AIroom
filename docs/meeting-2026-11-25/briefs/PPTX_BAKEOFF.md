# PPTX 렌더러 비교 (이음오피스처럼 브라우저 안에서 그리기)

목표: 쭘 주관자 브라우저에서 PPTX 를 쪽 그림(WebP)으로 바꿀 때, 지금 쓰는 `@office-kit/pptx-preview` 보다 원본에 가까운 오픈소스를 고른다. 결과 그림을 사람이 비교할 수 있게 만드는 것이 일이다. 최종 선택은 하지 말고 근거만 낸다.

## 지킬 것
- `docs/meeting-2026-11-25/TEAM_COMMON.md` 공통 지시를 따른다. 저장소 파일은 고치지 않는다(이 비교는 저장소 밖에서만).
- 작업 폴더: `~\AppData\Local\Temp\claude\4cda1ab0ca69f9b9\1f3148c4-5cb1-4211-ae9f-b90113f4c458\scratchpad\zzoom-convert\bake\` (새로). 패키지는 여기에 `npm i`. 시험 문서는 같은 상위 폴더 `docs\` 의 PPTX 2개(웜봇 29장, 바이브코딩 80장 — 80장짜리는 앞 20장만). 실제 학교 문서라 밖으로 보내거나 저장소에 넣지 않는다. 결과 그림도 bake 폴더에만.
- 기준 그림(정답): 이 PC 의 PowerPoint 가 있으면 COM 으로 열어 `Slide.Export(path,'PNG',2000,1125)` 로 뽑는다. **PowerPoint 가 이미 떠 있었으면 `Quit()` 절대 금지**, 연 프레젠테이션만 `Close()`. 처음부터 안 떠 있었을 때만 끝에 Quit. 읽기 전용·창 없이(`WithWindow=0`). PowerPoint 가 없으면 기준 없이 진행하고 그렇다고 적는다.

## 후보 (각각 정확한 버전·라이선스·번들 크기 기록)
1. 현재: `@office-kit/pptx-preview` (convert/pptx.js 와 같은 설정) — 비교 기준선
2. `@aiden0z/pptx-renderer` (HTML/SVG DOM 출력 → 래스터 방법도 시험: SVG 직렬화 또는 modern-screenshot 류)
3. `@silurus/ooxml` (canvas, WASM)
4. `pptxviewjs` (canvas)
5. `pptx-browser` (canvas)
6. GenOffice `@genoffice/pptx-render` — 이음오피스의 바탕(genspark-ai/genoffice, Apache-2.0). 브라우저에서 단독으로 쓸 수 있는 형태인지 먼저 확인, 안 되면 이유만 적고 넘어간다(30분 넘게 붙잡지 말 것)
7. OnlyOffice x2t WASM(PPTX→PDF→pdf.js) — 라이선스(AGPL 여부)와 내려받는 크기만 조사하고, 쉽게 돌릴 수 있는 빌드가 있으면 시험

## 방법
- 로컬 정적 서버 + Python Playwright 크로미움으로 후보마다 같은 슬라이드를 긴 변 2000px PNG 로 뽑는다. 슬라이드당 시간, 오류, 콘솔 경고 기록.
- 비교 시트: 슬라이드마다 한 줄에 [기준 | 후보1 | 후보2 …] 를 작게 붙인 JPG (`sheet_<문서>_<번호범위>.jpg`, 한 장에 4~6줄). 웜봇 1·3쪽은 반드시 포함(현재 렌더러에서 표지 제목 빠짐·회색 도형·「picture (unknown」 대체 글 문제가 난 쪽).
- 기준이 있으면 후보별 픽셀 차이 점수(예: 축소 후 평균 절대 차이)도 참고로 낸다.

## 보고
`docs/meeting-2026-11-25/reports/PPTX_BAKEOFF.md` (이 파일만 저장소에 쓴다): 후보 표(버전·라이선스·크기·시간·점수·눈에 띈 문제), 비교 시트 경로, 돌리지 못한 후보와 이유. 마지막 답변 10줄 이내.
