# 화면 영역 감사 (라운드 N) — 영역 ②

`AUDIT_ROUND.md` 의 태도·꼼꼼함·보고 형식을 그대로 따른다. 다만 **범위는 화면 모듈만**이다(서버·규칙은 다른 감사자).
보고 파일: `docs/meeting-2026-11-25/reports/AUDIT_UI_R<N>.md` 하나. 코드는 고치지 않는다. 커밋·푸시·배포·실제 Firebase 쓰기 금지.

## 범위
`public/zzoom/` 의 `index.html`, `app.js`, `api.js`, `zzoom.css`, `list.js`, `join.js`, `viewer.js`, `draw.js`, `board.js`, `chat.js`, `hands.js`, `poll.js`, (있으면) `host.js`, `upload.js`, `record.js` 와 각 css. 약속은 `CONTRACTS.md`, 설계 `DESIGN.md`, 팀 보고 `reports/D*.md`·`SKELETON.md`.
지금 뼈대 담당이 `zzoom.css`·`api.js`·`app.js` 를, D5 가 `host.js`·`upload.js`·`record.js` 를 마무리 중이다. 그 파일은 읽을 시점의 상태로 감사하고 「진행 중」이라 적는다.

## 볼 것
1. **보안**: XSS(innerHTML 에 서버·사용자 값), 비공개 투표 노출(화면·DOM·콘솔·store 어디에도 남의 선택), 토큰·pt 가 URL·로그에 새는지, 주관자 기능이 참석자 화면에서 열리는지(서버가 막더라도 화면이 숨기는지).
2. **약속 위반**: CONTRACTS 와 다른 api·store 사용, 팀 사이 금지된 import, 직접 fetch.
3. **정확성**: 구독 해제 누락(메모리·과금 누수), unmount 뒤 콜백, 늦은 응답이 새 상태를 덮음, 판서 대기열 쪽·epoch 꼬임, 재시도 무한 루프.
4. **기기**: 엣지·크로미움 1280×800, 820×1180, 390 폭. 직접 Python Playwright(`channel='msedge'` 와 기본)로 로컬 `node server.js` 와 팀 하네스(`tests/zzoom/*_harness*`, `*_e2e.py`)를 돌리고 스크린샷을 저장소 밖에 저장해 눈으로 본다. 44px 터치, 겹침, 잘림.
5. **문구**: 짧은 존댓말, 가운뎃점·화살표 나열 없음, 실제 사람 이름 없음(저장소 전체 시험 파일 포함 grep).
6. 각 팀 단위 시험·e2e 를 직접 다시 돌려 숫자를 적는다.

맨 위 한 줄 판정 PASS(치명·중요 0) / FAIL. 표: 번호·심각도·파일:줄·문제·재현·고칠 방향. 2회차부터는 **지난 지적과 바뀐 부분만** 다시 본다.
