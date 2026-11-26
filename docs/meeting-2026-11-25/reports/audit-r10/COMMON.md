# 쭘 감사 R10(재감사 2회차, R9 고친 뒤) — 공통 지시 (2026-11-26)

저장소: 작업 폴더 AIroom (branch feat/meeting). 운영: https://a-iroom.vercel.app/zzoom
최근 커밋: `git log --oneline -6`. 특히 1fb66fb·9c3ff6d·da68d17(R9 고침), cdc369f(서울 이전).
앞선 감사: docs/meeting-2026-11-25/reports/audit-r7/(P1~P5, FIXES.md), audit-r8/(Q1~Q3), audit-r9/(S1~S3, FIXES.md).

## 이번에 바뀐 큰 것
- Vercel 함수 지역 icn1(서울). vercel.json 에 regions 만 넣음(rewrite 추가 아님). 이 서버는 백암이 전체(server.js)가 같이 쓴다.
- 쭘 전용 Firestore DB 'zzoom'(asia-northeast3) 새로 만듦. 규칙 firestore.zzoom.rules(쭘 블록만) 게시됨. 옛 회의는 DB 'kwon'에 남음.
  서버 lib/zzoom/fb.js·gcp.js 기본 DB, 화면 public/zzoom/api.js DB_NAME 이 'zzoom'. Storage 버킷은 그대로(미국).
- Redis(Upstash)는 아시아(연결 0.015초)라 그대로. 옛 kwon 의 쭘 회의는 이전 직후 모두 지웠다.

## 할 일
1. 내 파트의 R9 지적이 정말 고쳐졌는지(고쳐짐/덜/안), 고치면서 새로 생긴 문제.
2. 서울 이전으로 생길 수 있는 문제(DB 이름 불일치, 규칙 누락 경로, 정리 cron 이 옛 kwon 회의를 못 지움, 백암이 다른 기능 영향, 색인 필요 쿼리 등).
3. audit-r9/FIXES.md 끝 "고치지 않은 것"은 다시 지적하지 않는다(근거가 있으면 예외).

## 규칙
- 읽기 전용. 코드·설정 수정, commit/push, 운영 회의 만들기·지우기 금지. 결과는 지정 보고서 파일 하나에만(한국어).
- 문제마다 심각도(치명/높음/보통/낮음), 파일:줄, 구체적 재현 상황, 고칠 방향 한 줄. 추측은 "확인 못 함".
- 공개 저장소이므로 보고서에 실명·개인 PC 경로를 쓰지 않는다(<작업폴더>, <임시폴더>). 비밀값(키·토큰)을 읽거나 적지 않는다.
- 끝에 "결론: PASS(치명·높음 0)" 또는 "결론: FAIL" 한 줄.
