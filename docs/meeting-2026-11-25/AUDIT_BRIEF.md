# 감사 지시서 — 회의 시스템 설계서

대상: `docs/meeting-2026-11-25/DESIGN.md`
역할: 설계 감사자. **파일을 고치지 말고** 보고서만 낸다. 저장소 코드는 읽어도 된다.

## 맥락
- 앱: 백암이(AIroom). Express(`server.js`) + Upstash Redis + Vercel 서버리스. Firestore(프로젝트 airoom-ebce3, DB명 `kwon`)와 Firebase Storage를 이미 씀(`public/lib/codocs.js`, `firestore.rules`).
- 로그인: 학교 공용 접근 코드 → 세션 토큰(`X-Auth-Token`, localStorage `airoom_auth_token`). 세션에는 role(user/admin)만 있고 이름은 없음.
- 사용자 요구: 같은 교실에서 각자 기기로, 미리 올린 안건 파일(PDF·이미지·HWP·HWPX·PPT)을 함께 보며 회의. 사전에 코드를 정하면 주관 실무자가 안건을 올림. 진행자 화면 따라가기, 형광펜·그리기, 손들기·찬반 투표. 교직원 전체가 백암이 로그인으로 입장. 한/글·PPT는 자동 변환.
- 변환 후보: `@rhwp/core` 0.9.1(MIT, WASM 27.9MB, `new HwpDocument(bytes)`, `renderPageToCanvas`, `globalThis.measureTextWidth` 필수), `@office-kit/pptx-preview`(MIT, 슬라이드 SVG).

## 보아야 할 것
1. 요구사항 누락·오해(위 요구와 설계 대조)
2. 보안: Firestore/Storage 규칙 초안의 구멍, 맞춤 토큰 설계, 주관 코드, 권한 상승 경로
3. 실시간 동기화 정확성: 경쟁 상태, 재연결, 주관자 두 명, 늦게 들어온 사람, 회의 끝난 뒤
4. 변환기 실현 가능성: rhwp·pptx 브라우저 렌더, Worker 에서 canvas/measureTextWidth 가능 여부(OffscreenCanvas), 글꼴, CDN 크기 제한, 메모리
5. Vercel·Firebase 제약과 비용(호출 수, 쓰기 수, 저장·전송량, 요금제)
6. 기존 코드·규칙과 충돌(두 SPA 규칙, 카피본 /copy, /hub, CLAUDE.md 함정)
7. 구현 단계·시험 계획이 충분히 구체적인지, 빠진 단계
8. 더 단순한 대안이 있으면 제시

## 보고 형식
`docs/meeting-2026-11-25/AUDIT_REPORT.md` 에 쓴다(이 파일 하나만 만든다).
- 맨 위 한 줄 판정: 「그대로 진행 / 수정 후 진행 / 다시 설계」
- 지적마다: 번호, 심각도(치명·중요·사소), 설계서 위치(파트·절), 문제, 구체적 고칠 방법, 근거(코드 경로·문서)
- 확인하지 못하고 추정한 것은 「추정」이라고 표시
- 한국어로 쓴다
