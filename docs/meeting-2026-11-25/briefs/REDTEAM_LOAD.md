# 레드팀·부하 시험 지시

`TEAM_COMMON.md` 를 따른다. 지금 다른 에이전트가 `lib/zzoom/*`, `*.rules`, `public/zzoom/convert/*`, 두 SPA, `tests/zzoom/api.test.js` 를 고치는 중이다. **이 파일들은 고치지 않는다.** 네가 만드는 파일은 아래 소유 파일뿐이다. 시험은 지금 한 번 돌리고, 끝나기 전에 최신 작업 트리로 **한 번 더** 돌려서 두 결과를 모두 적는다(수정 전후 비교).
실제 Firebase·Redis·Groq·Vercel 에 요청하지 않는다(가짜 `tests/zzoom/fakes/*` 와 로컬 서버만). 단 규칙은 Firebase Rules 시험 API(게시 아님)를 써도 된다: 예시 `~\AppData\Local\Temp\claude\40f4efd3ccefd627\d4fabf86-90b2-4507-9d7e-f1f14b7b99e2\scratchpad\rules-api-test-example.js`.

## RT. 레드팀 (소유: `tests/zzoom/redteam.test.js`, `reports/REDTEAM.md`)
공격자 입장에서 **실제로 뚫어 본다.** 막혔으면 막혔다는 증거(응답 코드), 뚫렸으면 재현 단계.
- 참가 자격: pt 위조·재사용·다른 회의 pt·만료 pt·host 회수 뒤 옛 pt, cid 바꿔치기, 이름에 스크립트(XSS, 서버 저장 뒤 md 내보내기·채팅에서)
- 주관 코드: 무차별 대입(IP·기기·회의 장부), 동시 요청으로 시도 횟수 우회, 코드 변경 경쟁
- 맞춤 토큰: 쭘 토큰으로 기존 앱 Storage·Firestore 접근, ba 토큰으로 쭘 접근, cp(카피본) 토큰으로 실서비스, until 경계
- `/api/copy/zzoom`, `/api/copy/firebase-token` 으로 실서비스 권한 얻기
- 업로드: 허가 없이 Storage 쓰기, 남의 uploadId commit, 경로 탈출(`../`), 형식·크기 위조, 같은 uploadId 두 번 commit
- 투표: 비공개 투표 개인 선택 알아내기(타이밍·응답 차이 포함), 한 사람 여러 표
- 판서·채팅: 상한 우회, 남의 선·글 지우기, 판서 잠금 우회, 끝난 회의에 쓰기
- cron: 비밀 없이 purge, 타이밍 공격
- `/api/firebase-token`: 비로그인, 로그아웃 세션, 카피본
결과 표: 공격·대상·기대·실제·판정(막힘/뚫림)·심각도.

## LD. 30명 부하 시험 (소유: `tests/zzoom/load.test.js`, `reports/LOAD.md`)
교직원 30명 회의 1시간을 압축해 흉내 낸다(가짜 fb·Redis + 실제 `createRouter`, 시계 조작 가능).
- 30명 동시 입장, 60초 heartbeat, 진행자 쪽 넘기기 300ms 묶음, 동시에 판서 20명(쪽당 상한 근처까지), 채팅 폭주(1초 1글 규칙), 투표 30명 동시 투표·바꾸기·마감 경쟁, 손들기 동시, 진행 넘겨받기 경쟁.
- 확인: 잘못된 429(정상 사용자가 막힘), 잃어버린 쓰기, 순서 뒤바뀜(seq), 집계 불일치(tally·counts·people), 예외·500.
- 측정: 요청 수/초, 가짜 fb 쓰기·읽기 횟수(실제 Firestore 비용 추정: 읽기·쓰기 단가는 공식 문서 기준으로 적고 출처 URL), 서버 처리 시간 분포.
- 화면 쪽 비용 추정: 참석자 30명이 구독하는 문서 수 × 변경 횟수로 1시간 Firestore 읽기 추정.

## 보고
각 보고서 맨 위 한 줄 판정, 표, 명령과 숫자 그대로, 고칠 방향(코드는 고치지 않음). 마지막 답변 10줄 이내.
