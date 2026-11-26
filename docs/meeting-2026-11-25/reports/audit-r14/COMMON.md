# 쭘 감사 R14 — 0번 「오늘의 안건」 기능 (2026-11-26)

저장소: 작업 폴더 AIroom. 감사 대상: ab8da41 다음부터 HEAD 까지(0번 기능 + R12·R13 고침, audit-r12/FIXES.md, audit-r13/FIXES.md). 특히 R13 고침이 새 문제를 만들지 않았는지.
설계: docs/meeting-2026-11-25/reports/audit-r7/P5_APP.md 93~118행. 계약: CONTRACTS.md 2-3.
요구: 안건 목록 맨 위 0번은 늘 「오늘의 안건」 정리 화면이고 누구나(회의 중) 모두에게 발표할 수 있다. 실제 안건은 1번부터 「안건이름 (발표하기)」. 「발표 가져오기」는 0번 상태를 그대로 둔다(결정됨).

## 할 일
- 서버 POST /:mid/presenter today:true(권한, 회의 상태, rev·forceSeq·epoch, 같은 요청 표·속도 제한과의 관계, 판서 epoch 영향), 화면 agenda.js·viewer.js·app.js·api.js 흐름(0번 ↔ 안건 발표 전환, 발표 마치기, 다른 사람이 0번 발표, 다시 펼쳐지기, 새로 들어온 사람, 주관자 전환), ab8da41 putBlob(취소·멈춤 감지·재시도·타이머 정리).
- 재현은 로컬만: npm run test:zzoom, tests/zzoom/*_e2e.py(가짜 API), 가짜 저장소. 결과물은 C:\Users\권준구\AppData\Local\Temp\claude\40f4efd3ccefd627\d4fabf86-90b2-4507-9d7e-f1f14b7b99e2\scratchpad\r12 에.

## 규칙
- 읽기 전용. 코드 수정·commit·push 금지. **운영(a-iroom.vercel.app)에 요청 보내지 말 것(Vercel 무료 한도).**
- 문제마다 심각도(치명/높음/보통/낮음), 파일:줄, 재현, 고칠 방향. 추측은 "확인 못 함".
- 보고서에 실명·개인 PC 경로 금지(<작업폴더>, <임시폴더>). 비밀값 읽거나 적지 않기.
- 끝에 "결론: PASS(치명·높음 0)" 또는 "결론: FAIL".
- 결정됨(바꾸지 말 것): 0번 발표 중 쪽 넘기기·화살표·모두 전체 화면은 모두 같이 넘어간다. 이름 누르기만 확인 창.
