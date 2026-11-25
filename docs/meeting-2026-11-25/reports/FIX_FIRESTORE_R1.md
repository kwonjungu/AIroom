# FIX_FIRESTORE_R1 (감사 N1·N6 수정)

## N1 접속표시 삭제
- `firestore_lock_proposal.rules` 의 codocs presence 를 `allow delete: if isBa();` 와 `allow create, update: if isBa() && name 문자열·30자 미만` 으로 나눔. 삭제는 기존 문서만 보고 판정하며 request.resource 를 쓰지 않음. 범위는 그대로 로그인한 ba 토큰만.
- `firestore.rules` 본문은 건드리지 않음. 게시 안 함.
- 시험: 현재 firestore.rules 의 「담당자 계정」부터 「쭘 회의」 앞까지를 제안 블록으로 메모리에서 바꿔 감사 R1 의 독립 185건(Rules 시험 API)을 다시 돌림. 결과 185/185 통과(R1 에서는 183/185). 접속표시 삭제는 ba 허용, 비로그인·cp·zz·bp·만료는 거절 유지.

## N6 토큰 한도
- `server.js` 의 `rateLimit` 에 셈 기준 함수(idFn) 선택 인자 추가.
- `/api/firebase-token`, `/api/bap/firebase-token`: IP 분당 30 에서 120 으로 올리고, 인증 뒤에 세션 토큰당 분당 10 한도를 추가(기존에는 세션 단위 한도 없음).

## 검증
- `node --check server.js` 통과, `npm test` 11건 통과(실패 0).
- 커밋·푸시·게시 안 함.
