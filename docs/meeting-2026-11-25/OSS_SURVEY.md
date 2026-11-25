# 쭘(ZZOOM) 오픈소스 조사 보고서

조사일 2026-11-25. 별 수·마지막 커밋(pushed_at)·라이선스는 `gh api repos/<owner>/<repo>`로 같은 날 확인한 값이다. 확인하지 못한 값은 「미확인」으로 적었다. 저장소 파일 수정과 패키지 설치는 하지 않았다.

## 바로 쓸 만한 것 3개

1. **perfect-freehand** (MIT, 별 5,826): 펜·형광펜 획을 부드러운 외곽선으로 바꿔 주는 순수 함수 라이브러리. 의존성 없는 ES 모듈이라 빌드 없이 CDN으로 넣어 판서 오버레이 품질을 바로 올릴 수 있다.
2. **pdf.js** (Apache-2.0, 별 54,185): 안건 PDF 렌더와 쪽 이동의 사실상 표준. 쪽 번호와 확대 값을 Firestore 문서 한 칸에 적어 따라가기를 만드는 데 그대로 쓴다. 판서 좌표는 쪽 크기로 나눈 0~1 값으로 저장한다.
3. **@rhwp/core** 계열(edwardkim/rhwp, MIT, 별 4,169, 마지막 커밋 2026-11-25): 이미 쓰는 HWP·HWPX 렌더러. 대안을 찾아봤으나 유지 상태와 기능 모두 이만한 것이 없어 계속 쓰는 쪽이 맞다. PPTX 쪽은 office-open-xml-viewer(MIT)가 시험해 볼 가치가 있다.

표기 규칙: 「복사 가능」은 MIT·Apache·BSD·ISC 계열이다. **GPL·AGPL은 코드 복사 금지(참고만)** 로 표시했다. LGPL은 링크 방식이 아니면 복사하지 않는다.

---

## 1. 진행자 따라가기형 문서·슬라이드 공동 보기

공통 판단: 이 분야는 완성품을 가져오기보다 방식만 참고하는 것이 맞다. 쭘은 Firestore 구독이 이미 있어서 「진행자가 현재 쪽·확대·스크롤 비율을 문서 한 칸에 쓰고, 참가자가 구독해 따라간다」로 충분하다. 별도 소켓 서버가 필요 없다.

| 후보 | 저장소 | 별 | 마지막 커밋 | 라이선스 | 스택 적합성 | 판단 |
|---|---|---|---|---|---|---|
| pdf.js | https://github.com/mozilla/pdf.js | 54,185 | 2026-11-25 | Apache-2.0 | 빌드 없이 ES 모듈 `pdfjs-dist`를 CDN으로 불러 쓸 수 있음. React 의존 없음. 워커 파일 별도 로드 필요 | **가져다 쓴다.** 렌더 담당. 따라가기 동기화는 직접 만든다 |
| reveal.js | https://github.com/hakimel/reveal.js | 72,626 | 2026-09-30 | MIT | 빌드 없이 쓰는 배포본 있음. 다만 슬라이드 HTML 전용이라 PDF·HWP 안건에는 맞지 않음. 저장소 `plugin` 폴더에는 highlight·markdown·math·notes·search·zoom만 있고 다중 접속(multiplex) 플러그인은 없음 | **참고만.** 슬라이드 상태(가로·세로 인덱스·조각 번호)를 JSON으로 주고받는 구조를 본다 |
| Slidev | https://github.com/slidevjs/slidev | 49,630 | 2026-11-05 | MIT | Vue와 Vite 빌드 전제. 쭘에는 부적합. 발표자 화면 동기화 방식의 세부는 미확인 | **쓰지 않는다.** 판서 라이브러리 drauu가 여기서 나왔다는 점만 의미 있음 |
| BigBlueButton | https://github.com/bigbluebutton/bigbluebutton | 9,291 | 2026-11-25 | LGPL-3.0 | 서버 전체가 Akka·Meteor 계열이라 이식 불가 | **참고만.** 5번 항목에서 다룸. 발표자가 쪽을 넘기면 전원이 따라가는 모델이 정확히 이 기능이다 |

## 2. 브라우저 PDF·이미지 위 판서·주석 오버레이

핵심 설계 메모: 좌표는 쪽(이미지) 크기로 나눈 0~1 정규화 값으로 저장하면 기기 화면 크기가 달라도 같은 자리에 겹친다. 획 하나를 `{점 배열, 색, 굵기, 형광펜 여부, 쪽 번호}` 한 건으로 Firestore에 올리고, 완성된 획만 보내면 쓰기 횟수를 줄일 수 있다(이 부분은 우리 설계 제안이며 후보 저장소에서 확인한 것이 아니다).

| 후보 | 저장소 | 별 | 마지막 커밋 | 라이선스 | 스택 적합성 | 판단 |
|---|---|---|---|---|---|---|
| perfect-freehand | https://github.com/steveruizok/perfect-freehand | 5,826 | 2026-04-13 | MIT | 의존성 없는 함수 하나. 점 배열을 넣으면 외곽선 점을 돌려줌. 필압 지원. 빌드 불필요 | **가져다 쓴다.** 펜 획 그리기 |
| drauu | https://github.com/made-in-common/drauu | 1,526 | 2026-11-25 | MIT | 바닐라 JS, SVG 기반, 헤드리스, 되돌리기·다시하기 포함. 소스 TS이나 npm 배포본은 ES 모듈 | **가져다 쓰거나 참고.** SVG라서 확대해도 선명하고 직렬화가 쉬움. 형광펜 투명도 처리는 직접 확인 필요 |
| signature_pad | https://github.com/szimek/signature_pad | 12,081 | 2026-11-24 | MIT | 바닐라 TS, 캔버스, 배포본 단일 파일. 쪽별 다중 획 관리와 형광펜은 없음 | **참고만.** 부드러운 곡선 보간과 포인터 처리 코드를 본다 |
| Submitty/pdf-annotate.js | https://github.com/Submitty/pdf-annotate.js | 297 | 2026-02-28 | MIT | pdf.js 위에 SVG 주석 층을 얹는 구조(StoreAdapter 패턴으로 저장소 교체 가능). 오래된 설계라 번들러 가정이 있음 | **참고만.** 주석 저장 어댑터 구조는 Firestore 연결에 참고할 만함 |
| InkLayer Core | https://github.com/inklayer-dev/inklayer-core | 0 | 2026-10-10 | MIT | 프레임워크 무관(헤드리스) PDF 상호작용 엔진. 별이 0이고 새 프로젝트라 검증 부족 | **지켜만 본다.** 현재는 도입 근거가 약함 |
| pdfjs-annotation-extension | https://github.com/Laomai-codefee/pdfjs-annotation-extension | 330 | 2026-09-01 | Apache-2.0 | 저장소가 「폐기·InkLayer로 이어짐」으로 표시됨 | **쓰지 않는다** |

## 3. 가벼운 화이트보드

쭘의 요구는 펜·도형 수준이라, 큰 라이브러리보다 위 2번의 perfect-freehand나 drauu로 직접 만든 SVG·캔버스 보드가 더 가볍다. 아래는 더 많은 기능이 필요할 때의 대안이다.

| 후보 | 저장소 | 별 | 마지막 커밋 | 라이선스 | 스택 적합성 | 판단 |
|---|---|---|---|---|---|---|
| Konva | https://github.com/konvajs/konva | 15,011 | 2026-11-23 | MIT (LICENSE 파일 직접 확인; API 표기는 Other) | 바닐라 사용 가능, 캔버스 객체 모델, 단일 파일 배포본(약 수백 KB, 정확한 크기는 미확인) | **필요하면 가져다 쓴다.** 도형·텍스트·이동·확대가 필요한 보드 |
| Fabric.js | https://github.com/fabricjs/fabric.js | 31,566 | 2026-11-24 | MIT | 바닐라, 기능 풍부, 크기가 큼(정확한 크기는 미확인) | **참고만.** 쭘에는 과함 |
| Excalidraw | https://github.com/excalidraw/excalidraw | 136,282 | 2026-11-25 | MIT | React 컴포넌트 전제라 빌드 없는 구조에 맞지 않음. 저장소 `excalidraw-app/data`에 firebase.ts·FileManager.ts·tabSync.ts가 있어 Firebase 협업 저장 구조를 참고할 수 있음 | **참고만.** 화면 코드는 쓰지 않고 실시간 협업 데이터 처리 방식만 본다 |
| tldraw | https://github.com/tldraw/tldraw | 51,584 | 2026-11-25 | tldraw 자체 라이선스(LICENSE 파일에서 확인, OSI 오픈소스 아님) | React 전제, 상용은 별도 라이선스 조건 | **쓰지 않는다** |
| WBO (whitebophir) | https://github.com/lovasoa/whitebophir | 2,693 | 2026-11-24 | **AGPL-3.0** | 서버 포함 화이트보드. 구조는 단순함 | **코드 복사 금지, 참고만.** 도구별 메시지 형식(획 한 건 단위 전송) 구조만 본다 |

## 4. HWP·HWPX, PPTX 브라우저 렌더

### HWP·HWPX

| 후보 | 저장소 | 별 | 마지막 커밋 | 라이선스 | 스택 적합성 | 판단 |
|---|---|---|---|---|---|---|
| rhwp (@rhwp/core 0.9.1) | https://github.com/edwardkim/rhwp | 4,169 | 2026-11-25 | MIT | Rust+WASM, npm 배포, HWP 5.0·HWPX·HML, 표·수식·이미지·차트 렌더. WASM 파일 로드로 빌드 없이 사용 가능 | **계속 쓴다** (현재 채택본) |
| hwp.js | https://github.com/hahnlee/hwp.js | 1,306 | 2025-01-10 | Apache-2.0 | 순수 JS 뷰어·파서. 마지막 커밋이 약 2년 가까이 전이라 사실상 유지보수 중단 | **쓰지 않는다.** 예비 참고만 |
| openhwp | https://github.com/openhwp/openhwp | 92 | 2025-12-12 | MIT | 라이브러리·뷰어·에디터를 겨냥한 프로젝트. 렌더 완성도는 미확인 | **지켜만 본다** |
| ohah/hwpjs | https://github.com/ohah/hwpjs | 159 | 2026-11-22 | MIT | 최근 활발. 구조와 렌더 품질은 미확인 | **지켜만 본다.** rhwp에서 문제가 생기면 비교 대상 |

### PPTX

| 후보 | 저장소 | 별 | 마지막 커밋 | 라이선스 | 스택 적합성 | 판단 |
|---|---|---|---|---|---|---|
| @aiden0z/pptx-renderer | https://github.com/aiden0z/pptx-renderer | 146 | 2026-10-18 | Apache-2.0 | npm 1.4.0. 이미 검토 대상 | **현 후보 유지** |
| @office-kit/pptx | https://github.com/office-kit/pptx | 39 | 2026-11-21 | MIT | npm 0.23.0, 브라우저·Node 겸용 단일 ESM. 읽기·수정·쓰기용으로 보이며 뷰어 렌더 성격은 미확인 | **참고만.** 토큰 치환 용도에 맞음 |
| office-open-xml-viewer | https://github.com/yukiyokotani/office-open-xml-viewer | 885 | 2026-11-24 | MIT (README 배지 기준. API의 SPDX 값은 직접 확인하지 않음) | Rust→WASM 파서와 캔버스 렌더, 읽기 전용 뷰어. PPTX·DOCX·XLSX 지원. 저장소가 AI로 작성되었다고 밝힘. 프레임워크 무관 헤드리스 엔진 제공 | **시험해 볼 만하다.** 별이 가장 많고 최근 활동도 있음. 쭘 안건 파일 몇 종으로 렌더 비교를 권함 |
| pptx-preview (501351981) | https://github.com/501351981/pptx-preview | 138 | 2025-10-17 | LICENSE 문구: npm 패키지는 자유 사용, 소스는 개인 학습용(코드 복사 금지) | 소스 라이선스가 오픈소스 정의가 아님 | **쓰지 않는다** (소스 복사 불가, 참고도 비권장) |
| PPTXjs | https://github.com/meshesha/PPTXjs | 279 | 2026-11-19 | MIT | jQuery 의존, 구형 설계 | **쓰지 않는다** |

DOCX가 필요해지면 docxjs(VolodymyrBaydalka/docxjs, 별 2,162, 2026-11-24, Apache-2.0)가 대안이다. 다만 쭘 안건 범위에 들어가는지는 확인하지 않았다.

## 5. 투표·손들기·채팅이 있는 오픈소스 회의 앱

| 후보 | 저장소 | 별 | 마지막 커밋 | 라이선스 | 스택 적합성 | 판단 |
|---|---|---|---|---|---|---|
| BigBlueButton | https://github.com/bigbluebutton/bigbluebutton | 9,291 | 2026-11-25 | LGPL-3.0 | 서버 `akka-bbb-apps/.../core/apps` 아래에 polls·chat·groupchats·whiteboard·presentation·users·timer 등 모듈이 분리돼 있음. 수업용 회의 기능 구성이 쭘과 가장 비슷함 | **참고만.** 투표 종류·결과 공개 방식·손들기 상태를 사용자 상태에 넣는 방식을 읽어 본다. 코드는 복사하지 않는다 |
| Jitsi Meet | https://github.com/jitsi/jitsi-meet | 30,286 | 2026-11-24 | Apache-2.0 | React·Redux. 손들기·채팅·투표가 있으나 구조가 무거움 | **참고만** (복사 가능한 라이선스지만 React 전제) |
| Apache OpenMeetings | https://github.com/apache/openmeetings | 690 | 2026-11-24 | Apache-2.0 (LICENSE 파일에서 확인) | Java 서버. 화이트보드·투표·손들기 포함 전통적 회의 도구 | **참고만.** 투표 데이터 모델 비교용 |
| LiveKit | https://github.com/livekit/livekit | 22,386 | 2026-11-25 | Apache-2.0 | 화상 인프라(SFU). 투표·손들기 앱이 아님. 쭘은 영상이 목적이 아니므로 해당 없음 | **쓰지 않는다** |

데이터 구조 메모는 직접 코드를 열어 확인한 것이 아니고 폴더 구성에서 읽은 것이다. 실제로 베끼기 전에 BBB의 `polls` 폴더를 열어 상태 필드를 확인해야 한다.

## 6. 브라우저 녹음 조각 전송 + Whisper 전사

쭘은 서버가 Vercel 서버리스이므로 「브라우저 `MediaRecorder`로 수 초~수십 초 조각을 올린다 → 서버리스 함수가 외부 전사 API로 넘긴다」가 가장 단순하다. 아래 후보는 이 흐름의 직접 부품이 아니라 방식 참고용이다.

| 후보 | 저장소 | 별 | 마지막 커밋 | 라이선스 | 스택 적합성 | 판단 |
|---|---|---|---|---|---|---|
| transformers.js | https://github.com/huggingface/transformers.js | 16,456 | 2026-11-25 | Apache-2.0 | 브라우저에서 Whisper 직접 실행. ESM CDN 사용 가능. 모델 내려받기 용량이 큼(정확한 크기는 미확인) | **가져다 쓸 수 있음(선택).** 서버 비용 없이 기기 안에서 전사하는 옵션 |
| transformers.js-examples | https://github.com/huggingface/transformers.js-examples | 2,121 | 2026-02-17 | Apache-2.0 | `realtime-whisper-webgpu`, `whisper-word-timestamps` 폴더 확인됨. WebGPU 필요 | **참고.** 실시간 조각 처리 예제 |
| whisper.cpp | https://github.com/ggml-org/whisper.cpp | 55,508 | 2026-11-25 | MIT | `examples/stream.wasm`·`whisper.wasm` 폴더 확인됨. 브라우저 WASM 전사 | **참고.** 조각 단위 입력과 이어 붙이기 방식 |
| whisper-web | https://github.com/xenova/whisper-web | 3,344 | 2024-10-01 | 라이선스 표기 없음(none) | 마지막 커밋 2024-10 | **쓰지 않는다.** 라이선스가 없어 복사 불가. 방식만 참고 |
| faster-whisper | https://github.com/SYSTRAN/faster-whisper | 27,006 | 2026-11-23 | MIT | Python 서버용 엔진. Vercel 함수에는 부적합 | **쓰지 않는다** (자체 서버를 둘 때만) |
| WhisperLive | https://github.com/collabora/WhisperLive | 4,362 | 2026-11-24 | MIT | 웹소켓 스트리밍 전사 서버(Python) | **참고만.** 서버리스와 맞지 않음 |
| whisper_streaming | https://github.com/ufal/whisper_streaming | 3,678 | 2025-11-12 | MIT | 오디오 조각을 이어 확정 문장을 내는 로직이 핵심 | **참고만.** 조각 경계에서 문장이 끊기는 문제를 푸는 방식 |
| vad (ricky0123) | https://github.com/ricky0123/vad | 2,082 | 2026-09-12 | ISC (LICENSE 파일에서 확인) | 브라우저 음성 구간 감지(Silero). 조각을 말 끊김 지점에서 자르는 용도 | **선택적으로 쓴다.** 무음 구간을 올리지 않아 비용을 줄임 |

---

## 라이선스 점검 요약

- 복사해도 되는 쪽: perfect-freehand·drauu·signature_pad·Konva·Fabric·pdf.js·rhwp 등 MIT·Apache 계열(원 저작권 고지는 유지).
- **GPL·AGPL 계열은 이번 조사에서 WBO(AGPL-3.0) 한 건**이다. **코드 복사 금지, 참고만.**
- LGPL: BigBlueButton. 서버 전체를 가져올 일이 없으므로 참고만.
- 소스 사용 제한이 있는 것: pptx-preview(501351981), tldraw 자체 라이선스. 쓰지 않는다.
- 라이선스 표기가 없는 것: whisper-web. 쓰지 않는다.

## 확인하지 못한 것(미확인)

- Slidev의 발표자 동기화 구현 방식, reveal.js의 다중 접속 기능 현황.
- 각 라이브러리의 번들 크기(KB), openhwp·ohah/hwpjs·office-open-xml-viewer의 실제 렌더 품질.
- BBB 투표 데이터 필드의 실제 구조.
- 우리 안건 파일(HWP·PPTX) 샘플 렌더 결과. 도입 전에 실제 파일로 비교해야 한다.
