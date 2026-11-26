# 쭘 회의 전체 감사 R7 — 공통 지시 (2026-11-26)

저장소: <작업폴더> (branch feat/meeting). 운영: https://a-iroom.vercel.app/zzoom
쭘 = 교직원 회의 앱. 서버 lib/zzoom/*.js (Express, server.js 안에 붙음, Vercel iad1), 클라이언트 public/zzoom/*.js (ES 모듈, 빌드 없음),
Firestore DB `kwon`(nam5), Storage, 규칙 firestore.rules / storage.rules. 계약 문서 docs/meeting-2026-11-25/ 아래 md.

## 규칙
- **읽기 전용 감사.** 코드·설정 파일을 고치지 않는다. git commit/push 금지. 운영 회의를 만들거나 지우지 않는다.
- 결과는 지정된 보고서 파일 하나에만 쓴다(한국어).
- 찾은 문제마다: 심각도(치명/높음/보통/낮음), 파일:줄, 무엇이 틀렸는지, **구체적 재현 상황**(입력·상태 → 잘못된 결과), 고칠 방향 한 줄.
- 추측은 "확인 못 함"으로 표시. 실제 코드 줄을 읽고 근거를 댄다. 스타일 취향·이름 짓기 지적은 빼고 동작 버그·보안·데이터 손실·사용자가 막히는 문제만.
- 사용 환경: 학교 와이파이가 불안정(구글·vercel 연결 약 10% 끊김/멈춤). PC·패드·휴대폰(터치·펜). 이 환경에서 막히는 경로도 본다.
- 최근 바뀐 것(2026-11-26, git log -8 와 git diff 3ea8b8e~3..HEAD 참고): 전체 화면(live.full), 큰 「이 자료 발표하기」, 회의 지우기 누구나(rate 10/600s),
  확대 스크롤 막대, 펜 SEND_GAP 350ms, LIVE_BATCH 120ms + 서버 live 10/s, live 같은 쪽이면 안건 문서 안 읽음, 따라가기 glideTo(140ms),
  api.js 재시도/시간제한, 부트 감시(index.html), 펜 덮개 pointer-events 수정, epoch 짐작.
- 보고서 끝에 "결론: PASS(치명·높음 0)" 또는 "결론: FAIL" 한 줄.
- 한/글은 쓰지 않는다. hwp.quit() 금지.
