# 감사 R15 DPR_A: PPTX 화면 배율 고침(HEAD a5d02de)

- 대상: `public/zzoom/convert/pptx.js` renderSlide 의 `dpr: 1`, `public/zzoom/convert/core.js` emitPage 의 긴 변 2000px 안전망
- 방식: 읽기 전용. 코드 수정, commit, push 없음. 운영 서버에는 요청하지 않음. 재현은 로컬 정적 서버(127.0.0.1)와 Edge(Playwright)로 함.
- 재현 자료: `<임시폴더>\dpr\audit\` (audit_dpr.py, audit_quality.py, audit_quality2.py, run.log, run_quality.log, audit_result.json, 비교 그림)
  - 참고 스크립트 dpr_check.py 는 `public\__f` 에 파일을 복사하므로 쓰지 않았다. 같은 일을 하되 `/__f/` 를 입력 폴더에서 바로 내보내는 audit_dpr.py 로 대신했다(작업 폴더에 쓰기 없음).

## 1. 확인한 것

### ① silurus 렌더러가 dpr 을 쓰는 방식
- `presentation-Cti32_db.js:1141` renderSlide 는 `s = r.dpr ?? v()` 로 정하고, v() 는 `window.devicePixelRatio`(`vertical-vert-feature-ru96Mg5B.js:1773`)다. 그래서 dpr 을 넘기지 않으면 화면 배율 1.25와 1.5에서 캔버스가 2500px, 3000px 이 된다. 이번 신고 원인과 맞다.
- 실제 그리기는 `slide-pull-client-D2ZoyzhO.js:5216`. `d = round(width)`, `f = round(slideHeight * width / slideWidth)`, 캔버스 크기는 `Ke(d*dpr, f*dpr)`(`plot-area-frame-BSqoSYxZ.js:1638`, 한 변 32767px·넓이 16.7M 화소를 넘을 때만 줄임)이고, 그 뒤 `ctx.scale(dpr, dpr)` 을 건다. dpr:1 이면 캔버스는 정확히 `cw × round(cw × 비율)` 이고, 비율은 pptx.js:76-77 의 계산과 같은 식이다. 가로·세로 비율은 그대로 유지된다.
- dpr 은 글자에는 영향이 없다. 글자는 벡터로 그리고, 쪽 크기 2000px 를 기준으로 선명하다(`crop_text_dpr1.png`, 8pt 까지 읽힘). 그림은 dpr 배 해상도로 디코드·축소한다(`wo(..., h, ...)`, `xi(..., h, ...)`). 그래서 dpr:1 이면 그림이 쪽 화소 크기로 바로 줄어든다. 영향은 아래 B-1 에 적었다.

### ② 안전망
- `core.js:229-235`: `k = 2000 / 긴 변`, 각 변을 `max(1, min(2000, round(변 × k)))` 로 계산한다. 긴 변은 언제나 정확히 2000이고, 짧은 변은 1보다 작아지지 않는다.
- 시험(dpr 1.5 문맥에서 emitPage 직접 호출, 12가지): 2500×1406 → 2000×1125, 3000×1688 → 2000×1125, 1688×3000 → 1125×2000, 2001×2001 → 2000×2000, 8000×3 → 2000×1, 3×8000 → 1×2000, 4001×1 → 2000×1. 모두 디코드 크기가 알려 준 w·h 와 같았다. 썸네일은 320 이하였고, 원래 캔버스는 0×0 으로 해제됐다.
- 해제 순서: 새 캔버스에 그린 다음 원래 캔버스를 비우고, 인코딩과 썸네일 뒤 finally 에서 새 캔버스를 비운다. 순서는 맞다. 다만 안전망 블록 자체가 try 밖에 있다(B-2).
- 바이트 한도: 줄인 뒤에 `encodeWithin` 을 거치므로 쪽 4MiB와 썸네일 512KiB 확인, 품질을 낮춰 다시 저장하는 단계가 그대로 적용된다.

### ③ 다른 변환기
- pdf.js: 캔버스 크기는 앱이 `round(viewport)` 를 2000으로 잘라 정한다(`pdf.js:64`). pdf.js 의 devicePixelRatio 사용(`OutputScale`)은 뷰어 쪽 코드여서 `page.render` 에는 쓰이지 않는다. 실측에서 배율 1, 1.25, 1.5, 2 모두 1413×2000이었다.
- hwp.js(rhwp): `fitScale` 로 크기를 지정하고 `fitCanvas` 로 한 번 더 자른다. 실측 1414×2000(HWP 22쪽, HWPX 1쪽)이 배율 4가지에서 모두 같았다.
- image.js: 원본 크기만 쓰고 확대하지 않는다. 실측 1280×720(PNG, JPG)이 배율 4가지에서 같았다.
- 쪽을 만드는 길은 `emitPage` 하나뿐이다(`out.pages.push` 는 core.js:247 에만 있다). 그래서 안전망이 모든 변환기에 걸린다. board.js:106 과 viewer.js:317 의 devicePixelRatio 는 화면 표시용이라 올리기와 관계없다.
- PPTX(dpr:1): 배율 1, 1.25, 1.5, 2 모두 2000×1125, 썸네일 320×180이었다. 쪽 바이트도 배율과 관계없이 같았다(14,440B).

### ④ 서버 commit 확인과 맞는지
- 클라이언트 `api.js:580/736` 은 `p.w, p.h` 를 보낸다. 이 값은 안전망을 거친 캔버스 크기이고, 인코딩한 WebP 크기와 같다.
- 서버 `routes.js:732`(정수, 1 이상 2000 이하), `routes.js:765-769`(WebP 머리 크기가 commit 값과 같은지, 썸네일 320 이하인지)를 확인했다. 실측 결과 260개(쪽과 썸네일, 안전망 시험 포함)를 서버의 `webpSize` 로 그대로 파싱해 보니 불일치 0, 한도 초과 0이었다.
- `npm run test:zzoom`: 152개 통과, 문법 확인 24개 오류 0.

## 2. 문제

치명과 높음은 없다.

### B-1 [보통] dpr:1 이면 고해상도 그림이 든 슬라이드에서 그림 축소 품질이 떨어진다(물결 무늬)
- 파일:줄: `public/zzoom/convert/pptx.js:82`. 렌더러 쪽은 `slide-pull-client-D2ZoyzhO.js:5216`(그림 디코드 목표가 dpr 배).
- 재현: `<임시폴더>\dpr\audit\audit_quality.py`. 3000×2000 고주파 그림(세로 줄무늬와 작은 글자)을 6.5인치 폭으로 넣은 PPTX 를 dpr:1 로 그린 결과와, dpr:2 로 그려 2000px 로 줄인 결과를 비교했다. 기준은 원본을 LANCZOS 로 줄인 그림이다.
  - 그림 영역의 기준과의 평균 차: dpr:1 은 33.5, dpr:2 뒤 축소는 16.0
  - `pic_compare_dpr1_dpr2down_lanczos.png`(왼쪽부터 dpr1, dpr2 축소, 기준): dpr:1 쪽에 굵은 물결(모아레) 띠가 생기고, 그림 안의 작은 글자가 덜 읽힌다. 글자 상자의 차는 작다(3.6, 맨눈으로는 같음).
- 성격: 이번 커밋이 새로 만든 저하는 아니다. 배율 100% PC 는 고치기 전에도 같은 결과였고, 125%와 150% PC 는 고치기 전에 올리기 자체가 실패했다. 다만 스캔 문서나 사진을 넣은 슬라이드는 배율 높은 PC 의 옛 결과(거절되기 전 캔버스)보다 흐리거나 줄무늬가 생길 수 있다.
- 고칠 방향(선택): `renderSlide(canvas, i, { width: cw, dpr: 2 })` 로 4000×2250(9M 화소, Ke 제한 안)을 그린 뒤 `fitCanvas` 로 2000에 맞춘다. 메모리와 시간이 약 4배 들어서 200쪽 6분 시한과 저사양 노트북을 함께 재 봐야 한다. 절충안은 dpr 을 고정값 1.5 나 2로 두되, 배율에서 받지 않고 상수로 쓰는 것이다. 지금처럼 dpr:1 을 유지한다면 고칠 필요는 없고, 알려진 한계로 기록만 해 둔다.

### B-2 [낮음] 안전망 블록이 try/finally 밖에 있어 실패하면 캔버스가 풀리지 않는다
- 파일:줄: `public/zzoom/convert/core.js:229-235`(try 는 238부터 시작)
- 재현(코드 읽기): 큰 캔버스에서 메모리가 모자라 `makeCanvas` 나 `getContext`, `drawImage` 가 예외를 던지면, 들어온 `canvas` 를 해제하는 finally(`core.js:252-254`)에 닿지 않는다. 호출하는 쪽(pptx.js:89, pdf.js:77, hwp.js:70, image.js:24)도 emitPage 예외 때 캔버스를 비우지 않는다. 함수 머리 주석 "성공·실패와 관계없이 두 캔버스를 비운다"(core.js:225)와 다르다. 또 `c2` 를 만든 뒤 drawImage 에서 실패하면 c2 도 남는다.
- 고칠 방향: 안전망을 try 안으로 옮기고, finally 에서 원래 캔버스와 c2 를 모두 비운다. 또는 `canvas = fitCanvas(canvas)` 한 줄로 바꾸되, 이 부분도 try 안에서 하고 finally 에서 처리한다.

### B-3 [낮음] 세로 슬라이드 비율에 따라 PPTX 가 2001px 로 그려진 뒤 안전망에서 한 번 더 축소된다(작게 흐려짐)
- 파일:줄: `public/zzoom/convert/pptx.js:76-77`
- 재현: `cw = round(2000/비율)`, `ch = round(cw × 비율)` 에서 비율 1.016(세로가 조금 긴 슬라이드)이면 cw=1969, ch=2001이 된다. 렌더러도 같은 식(`f = round(slideHeight × cw / slideWidth)`)으로 2001px 캔버스를 만든다. 그러면 안전망이 1968×2000으로 다시 그리며 1px 남짓 보간된다. 거절은 없다(안전망 덕분).
- 고칠 방향: 세로 슬라이드는 `cw = Math.floor(2000 / ratio)` 로 바꿔 렌더 결과가 처음부터 2000 이하가 되게 한다.

### B-4 [낮음] 고친 내용을 지키는 시험이 없다
- 파일:줄: `tests/zzoom/convert.test.mjs`(emitPage 시험은 2000×1400 이하만, 108-119줄 부근)
- 재현: `grep -n "dpr\|2001\|3000" tests/zzoom/convert.test.mjs` 하면 해당 시험이 없다. pptx.js 에서 `dpr: 1` 을 지우거나 안전망을 지워도 `npm run test:zzoom` 152개는 그대로 통과한다.
- 고칠 방향: (a) emitPage 에 3000×1688, 2001×1, 8000×3 캔버스를 넣고 `out.pages[0].w/h` 가 2000 이하인지, 비율이 맞는지, 원래 캔버스가 0×0 인지 확인하는 시험. (b) pptx.js 소스에 `dpr: 1`(또는 고정 상수)이 있는지 확인하는 정적 시험. (c) `audit_dpr.py` 와 같은 device_scale_factor 1.25, 1.5 브라우저 시험을 e2e 에 추가.

### 참고(문제 아님)
- `core.js:183 fitCanvas` 와 안전망은 같은 일을 하는 코드다. B-2 를 고칠 때 하나로 합치면 좋다.
- pptx.js:79-80 에서 흰 바탕을 채워도 렌더러가 캔버스 크기를 다시 정하면서(`e.width = m.width`) 지워진다. 이 동작은 이번 커밋 전부터 있었다. 실측 세 슬라이드와 그림 슬라이드 모두 투명 화소는 0개였다(배경을 렌더러가 칠함).

## 3. 실측 요약(run.log)

| 배율 | PPTX | PDF | HWP | HWPX | PNG·JPG |
|---|---|---|---|---|---|
| 1 | 2000×1125 | 1413×2000 | 1414×2000 | 1414×2000 | 1280×720 |
| 1.25 | 2000×1125 | 1413×2000 | 1414×2000 | 1414×2000 | 1280×720 |
| 1.5 | 2000×1125 | 1413×2000 | 1414×2000 | 1414×2000 | 1280×720 |
| 2 | 2000×1125 | 1413×2000 | 1414×2000 | 1414×2000 | 1280×720 |

결론: PASS(치명·높음 0)
