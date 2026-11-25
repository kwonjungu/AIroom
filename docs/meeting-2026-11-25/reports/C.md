# 보고서 — 엔진팀 C (파일 변환)

## 만든 파일
`public/zzoom/convert/` : `index.js`(진입), `core.js`(오류·한도·해시 내려받기·WebP), `pdf.js`, `image.js`, `hwp.js`, `pptx.js`, `fonts.js`, `vendor.js`(주소·고정 버전·해시). worker 는 쓰지 않는다(경로 B). 확인 문서 `docs/meeting-2026-11-25/convert-check.md`.

## 시험 결과
실제 `convert()` 를 로컬 서버+Playwright 크로미움 145 에서 호출: HWP 2·HWPX 3·PPTX 2·PDF 1과 오류 입력 9건. 성공 6건(HWP 2, HWPX 3, PPTX 1) + PDF 3쪽, 한도 거절 2건(PPTX 80장, PDF 65쪽), 오류 코드 시험 전부 기대대로. 결과 그림을 눈으로 보고 판정(문서별 표는 convert-check.md). 문제 2가지: 활동지 HWP 의 좁은 표 열, 웜봇 PPTX 일부 도형 번짐과 대체 글. 이번에 고친 것: 구형 브라우저에서 암호 PDF 가 PDF_PARSE 로 나오던 문제(Math.sumPrecise 보충). 파이어폭스·사파리는 못 돌렸다.

## `convert()` 입출력
```js
import { convert, ConvertError, LIMITS, ERROR_MESSAGES_KO, detectKind } from '/zzoom/convert/index.js';
const r = await convert(file /* File */, { onProgress, signal });
```
- 입력: `File`(name 필요), `onProgress({phase:'load'|'render', done, total, ratio, message})`, `signal`(AbortSignal).
- 출력: `{ kind:'pdf'|'image'|'hwp'|'pptx', pages:[{blob, w, h, type}], thumbs:[Blob], warnings:[string] }`. 쪽 그림은 긴 변 2000px WebP 0.85(WebP 미지원 브라우저는 PNG, `type` 으로 구분), 썸네일은 320px. `pages` 와 `thumbs` 는 같은 순서.
- 한도: 60쪽, 50MB, 3분. 한 쪽씩 처리하고 canvas 를 바로 비운다. 실패하면 이미 만든 쪽은 버려진다.
- 지원 확장자: pdf, hwp, hwpx, pptx, png, jpg, jpeg, webp, gif, bmp, avif, heic·heif(브라우저가 열 수 있을 때).
- 실패는 `ConvertError`: `e.code`, `e.message`(한국어 안내, 화면에 그대로 써도 됨), `e.detail`(기술 설명, 로그용).

## 오류 코드
| code | 언제 |
|---|---|
| UNSUPPORTED_TYPE | 모르는 확장자 |
| PPT_LEGACY | 옛 .ppt·.pps |
| HEIC_UNSUPPORTED | HEIC 를 브라우저가 못 열 때 |
| FILE_TOO_LARGE | 50MB 초과 |
| TOO_MANY_PAGES | 60쪽 초과(detail 에 실제 쪽 수) |
| IMAGE_TOO_LARGE | 그림 4천만 화소 초과 |
| TIMEOUT | 3분 초과 |
| ABORTED | `signal` 취소(오류로 다룰 필요 없이 조용히 닫으면 됨) |
| EMPTY_DOCUMENT | 빈 파일·쪽 0 |
| VENDOR_LOAD | 외부 변환기 코드를 못 받음 |
| HASH_MISMATCH | 받은 파일 해시 불일치 |
| FONT_LOAD | 글꼴을 못 받음 |
| HWP_PARSE / HWP_PASSWORD / HWP_RENDER | 한/글 읽기 실패 / 암호 / 그리기 실패 |
| PDF_PARSE / PDF_PASSWORD / PDF_RENDER | PDF 읽기 실패 / 암호 / 그리기 실패 |
| PPTX_PARSE / PPTX_RENDER | PPTX 읽기 / 그리기 실패 |
| IMAGE_DECODE / ENCODE_FAIL | 그림 열기 / WebP 저장 실패 |
| UNKNOWN | 그 밖(detail 확인) |

## 정한 것
HWP 는 메인 스레드 canvas 경로(Worker 는 SVG 뿐이라 택하지 않음). Noto Sans/Serif KR(OFL) 웹폰트. WASM 은 jsDelivr 1순위·unpkg 2순위, sha256 검증. 버전은 rhwp 0.9.1, pdfjs-dist 6.5.438, office-kit pptx 0.30.0·preview 0.23.0, @fontsource 5.3.1.

## 요청(통합 담당)
- 외부 코드·글꼴을 받으므로 CSP 에 `cdn.jsdelivr.net`, `unpkg.com` 허용, `blob:` 모듈·worker 허용, `wasm-unsafe-eval` 필요.
- 3순위로 Firebase Storage `zzoom-vendor/` 에 같은 해시 파일을 올려 `ZZOOM_VENDOR_OVERRIDE` 또는 `vendor.js` 에 주소 추가.
- 업로드 화면은 `warnings` 를 보여 주고, HWP·PPTX 에는 「PDF 로 올리면 더 정확」 안내를 붙이길 권한다.
- `convert()` 는 브라우저 메인 스레드 전용(document 사용). 이 PC 한 크로미움에서만 시험했으므로 다른 브라우저 확인이 남았다.
