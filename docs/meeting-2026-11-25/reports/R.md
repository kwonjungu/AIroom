# 보고서 — 엔진팀 R (보안 규칙)

## 만든 파일
- `firestore.rules` : 맨 아래 쭘 블록만 추가(+28줄, 기존 줄 변경 없음, git diff 확인)
- `storage.rules` (새) : `zzoom/`, `zzoom/.../up/`, `zzoom-vendor/` 부분만. 맨 위에 「전체본 합친 뒤 게시」 주석
- `tests/zzoom/rules.test.js` (새) : 54건(Firestore 읽기 거절·허용, 모든 쓰기 거절, 기존 codocs 유지, Storage 업로드 크기·형식·권한)
- `docs/meeting-2026-11-25/RULES_NOTES.md`, `firebase.emulator.json`(에뮬레이터 설정, 시험 실행용), `rules-backup/`(빈 폴더)

## 시험 결과
- 실제로 규칙 시험을 **돌리지 못했다.** 이 PC 에 Java 가 없어 에뮬레이터를 못 띄운다. `@firebase/rules-unit-testing` 도 미설치.
- `node --test tests/zzoom/rules.test.js` : tests 54, pass 0, fail 0, **skipped 54**. `node --check` 문법 통과. 규칙 파일 중괄호 균형만 직접 확인(0).
- 오프라인 문법 검사는 방법이 없었다. `firebase deploy --dry-run` 은 프로젝트 API 를 호출해 인증 오류로 멈췄고(실제 게시 아님), 규칙 컴파일은 에뮬레이터(Java) 또는 서버에서만 된다. 즉 규칙 **문법 검증은 아직 안 됨**. `request.auth.token.get(..)`, `is number` 사용은 공식 문법이지만 에뮬레이터로 확인해야 한다.

## 정한 것
- claim 이 없을 때 오류가 아니라 거절되도록 `token.get(키, 기본값)` 을 썼다.
- 하위 컬렉션은 이름 목록(agenda·pages·strokes·hands·chat·polls·transcript)만 열고 people 은 host 만. 그 밖 이름은 거절.
- Storage contentType 정규식의 `vnd.*` 를 `vnd\..*` 로 이스케이프했다.
- 에뮬레이터 시험은 기본 DB 로(규칙 동일).

## 확인한 것
- 저장소 `firestore.rules` 에는 와일드카드 match 가 없어 `zzoom_meetings` 에 닿는 기존 규칙이 없다. 운영 콘솔 규칙과 운영 Storage 규칙은 확인 불가(0단계 전체본 필요).

## 남은 일
- Java 설치 후 에뮬레이터 시험 실행 및 실패 수정.
- 0단계 전체본 받아 합치기, 백업, 게시, CORS(RULES_NOTES.md 3절).

## 요청
- package.json devDependencies: `@firebase/rules-unit-testing@^3` (v3 은 `firebase@^10` 을 peer 로 요구), `firebase@^10`(이미 클라이언트용으로 있으면 그 버전과 맞출 것). `firebase-tools` 는 전역 14.12 사용.
- 통합 담당: `server.js` 가 맞춤 토큰에 claim `zz:1, mid, role, until(ms 숫자)` 를 정확히 이 이름·타입으로 넣어야 한다(`until` 이 문자열이면 거절). 맞춤 토큰 발급은 `createCustomToken(uid, claims)`.
- 통합 담당: `.gitignore` 가 수정된 상태로 보이는데 내 변경이 아니다.
