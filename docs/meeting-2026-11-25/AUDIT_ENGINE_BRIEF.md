# 엔진 단계 감사 지시 (아스트라, 2026-11-25 밤)

너는 독립 감사자다. **`docs/meeting-2026-11-25/AUDIT_ENGINE_REPORT.md` 하나만 만든다.** 다른 파일은 절대 고치지 않는다. 커밋·푸시·배포·Firebase/Vercel 호출 금지. 실제 서비스에 요청을 보내지 않는다.

## 지금까지 (커밋 69f5d39, 브랜치 feat/meeting)
쭘(ZZOOM)은 백암이(AIroom) 안의 같은 교실·각자 기기 회의 도구다. 설계 `DESIGN.md` v2(파트 K 포함), 사용자 결정 `DECISIONS.md`, 1차·2차 감사 `AUDIT_REPORT.md`·`DECISION_ANSWERS.md`.

| 영역 | 상태 | 근거 |
|---|---|---|
| 서버 S `lib/zzoom/*`, `server.js` 3곳, `vercel.json` cron | 완료. firebase-admin 대신 서비스 계정 JWT + REST(`gcp.js`) | `reports/S.md`, `npm run test:zzoom` 15/15, 기존 `npm test` 통과 |
| 규칙 R `firestore.rules` 쭘 블록, `storage.rules` | 작성. 에뮬레이터(Java 없음)는 못 돌림. Storage 규칙은 Firebase Rules 시험 API(게시 아님)로 16/16 | `reports/R.md`, `RULES_NOTES.md`, `STORAGE_LOCK.md` |
| 변환 C `public/zzoom/convert/*` | 완료. HWP·HWPX 5/6 통과(1 조건부), PPTX 1 조건부(도형 번짐·표지 제목 빠짐), PDF 통과, 60쪽 한도 | `reports/C.md`, `convert-check.md` |
| 에셋 | WebP 16종 | `ASSETS.md` |
| 별도: 창고 잠금 | 운영 Storage 가 2026-03-13부터 공개 읽기·쓰기였다. `lib/storage-token.js` + `GET /api/firebase-token` + 두 SPA `ensureStorageAuth()` + `storage.rules`(ba/cp claim). 아직 게시 전 | `STORAGE_LOCK.md` |
| 실제 키 확인 | 서비스 계정 키로 맞춤 토큰 교환 200, Firestore(kwon) 읽기 성공 | 이 세션 |
| 진행 중 | PPTX 렌더러 비교(`briefs/PPTX_BAKEOFF.md`), 화면 단계(1.5: api.js·CONTRACTS.md·뼈대)는 아직 | |

## 감사할 것 (심각도: 치명·중요·사소)
1. **보안**: 참가 자격(pt)·맞춤 토큰 claim·만료(until)·역할 상승 경로, `/copy` 차단, 비공개 투표 원표 노출, 주관 코드 무차별 대입, cron 비밀, 업로드 허가·commit 위조. `firestore.rules`·`storage.rules` 가 서버 동작과 맞는지(서버가 쓰는 경로를 규칙이 막거나, 규칙이 서버보다 넓은 곳).
2. **창고 잠금 변경**: `lib/storage-token.js`, `server.js` 의 `/api/firebase-token`, 두 SPA(`index.html`, `public/index.html`) 의 `ensureStorageAuth`·`setPersistence(NONE)`, `storage.rules` 기존 앱 블록. 기존 기능(배너·연수 챙김이 PDF·일정 첨부·전자서명 등 `uploadToFirebase` 쓰는 곳)이 규칙 게시 뒤 깨질 경로, 카피본이 실서비스 파일에 닿는 경로, GitHub Pages 미러(`kwonjungu.github.io/AIroom/`)에서의 동작.
3. **정확성**: 진행 트랜잭션(epoch·baseRev·forceSeq), 판서 검증, 투표 Lua, 10일 만료와 정리 작업(중복 실행·중간 실패), Redis 장애 시 동작.
4. **Vercel 서버리스 제약**: 함수 시간·크기, 콜드 스타트, 4.5MB 본문 한도(녹음 조각), cron 한 번 50초 상한.
5. **변환**: 메모리 해제, 취소, 한도, CDN·WASM 해시 고정, WebP 미지원 브라우저(사파리)에서 PNG 가 나오면 서버 commit 이 거절하는지.
6. **시험의 빈틈**: 시험이 실제로 증명하지 못하는 것(가짜 fb·Redis 와 실제 REST 의 차이 등).
7. 다음 단계(화면 1.5·디자인 5팀) 전에 고쳐야 할 것과 나중에 해도 되는 것을 나눠라.

## 보고서 형식
- 맨 위 판정 한 줄: 「화면 단계로 가도 됨 / 먼저 고칠 것 있음」.
- 표: 번호·심각도·파일:줄·문제·실패 시나리오(구체적 입력 → 잘못된 결과)·고칠 방향. 추측이면 「확인 필요」라고 쓴다.
- 코드를 실제로 읽고 줄 번호를 단다. 시험을 직접 돌렸으면 명령과 결과 숫자 그대로.
- 한국어, 짧게.
