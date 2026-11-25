# AUDIT_LOCKS_R5 — 영역 ③ Storage 잠금 + ④ Firestore 잠금 재감사 (진행 중)

판정: (진행 중)

## 진행 기록
1. (세션 재개) 이번 감사에서 띄운 서버 없음. 듣고 있는 3000·3311 등은 이 감사가 띄운 것이 아니라 건드리지 않음.
2. 코드 확인: `lib/storage-token.js:48-58` bapClaimsFor until=min(expiresAt 또는 createdAt+30일, now+1h), 끝난 세션 null→401(`:68`). 제안 규칙 `:15-25` fresh()가 isBa·bapOk에 연결, bapBoss는 bapOk 경유. 게시 잠금본은 제안 전체 포함(문자열 비교 true), 루트 firestore.rules 는 fresh 없음(=firestore.publish.rules). storage.publish+lock.rules 는 storage.rules 와 주석 1줄(:49)만 다름.
3. Rules 시험 API(게시 아님) — 스크립트 scratchpad `r5/fs-r5b.js`(주체 19종×24동작+내용 검사, 50건씩 나눠 POST; 한 번에 보내면 400 too many test cases).
   - `publish/firestore.publish+lock.rules`: **413/413 통과**(ALLOW 기대 76, DENY 337), 문법 issue 0. 주체: 비로그인·ba(유효/지남/없음/문자열/=지금/지금+1)·cp·zz·bp/br m·b(유효/지남/없음/=지금/지금+1)·다른 학교 m2·br=x·ba+bp 혼합 만료. 동작: codocs sheets get/list/create, rows update/delete, presence create/delete, members get/update, bap_users·bap_config, 공개 식단 get/list(비로그인 포함 모두 허용), 식단 create/delete, 다른 학교 식단, 일지 get/create, 결재 update·삭제, 다른 컬렉션, 날짜·lunch 2000자·managerName 변경·approved 수정·bossName 없음·빈 title·presence name 30자, 쭘 회의 get.
   - 변이 대조: `&& fresh()` 제거 → 342/413(71건 실패), `<` → `<=` → 398/413(until=지금 15건 실패). 표가 until 검사와 경계를 실제로 가른다.
   - 중간 fetch failed 2회는 재시도로 해결(네트워크 일시 오류).
4. codocs.js 읽기(`public/lib/codocs.js:198-272,392-417`): signInCodocs 는 until 1분 넘게 남았을 때만 통과(`:220`), 받은 토큰 until 해석(`:204-209`), until-60s 타이머(`:243-256`), 일시 실패는 until 전까지 30초 간격·지나면 안내(무한 재시도 아님), 401 은 signOut·LOGIN 안내. 같은 uid('baekam-user')로 다시 로그인하므로 구독 유지는 SDK 동작상 타당(실브라우저 미확인).
   - **새 지적 후보(중요)**: 규칙 거절 처리 `onDenied`(`:271-273`)는 authState==='ok' 이면 `showRulesHelp`(`:299-330`) — "보안 규칙을 게시해야 합니다, 관리자 계정으로 GitHub main 의 firestore.rules 를 복사해 kwon 에 게시" 안내. 루트 firestore.rules 는 잠금이 없는 공개본(`firestore.rules:19-127` read/write true)이다. 잠금 게시 뒤 until 지난 출입증의 거절(PC 절전 뒤 깨어남, README 3-1 의 옛 탭)도 authState='ok' 상태라 이 안내로 간다 → 안내대로 하면 잠금 해제. until 검사가 새 거절 원인을 만든 회귀.
