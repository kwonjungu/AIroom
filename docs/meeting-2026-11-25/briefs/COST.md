# 거의 무료로: Firestore 사용량 줄이기 (최대 20명)

> **취소(2026-11-25 사용자 결정):** 블레이즈 요금제이고 kwon 은 무료 DB 라 평소 회의는 무료, 판서 많은 날도 회의당 수십 원이라 손대지 않는다. 이 지시는 하지 않는다.

사용자 결정(2026-11-25): 최대 20명, 거의 무료 수준. `kwon` DB 는 이 프로젝트의 **무료 DB(freeTier=true, nam5)** 다(API 로 확인). 무료 한도는 하루 읽기 5만·쓰기 2만·삭제 2만이고 다른 앱(codocs·bap)도 같이 쓴다.
**목표: 20명·1시간·판서 많은 회의 1회가 읽기 2.5만·쓰기 3천·(10일 뒤) 삭제 1천 안쪽.** `reports/LOAD.md` 측정(30명 1시간 읽기 22.6만, 그중 쪽 다시 읽기 12.3만·선 구독 6만)을 기준으로 줄인다.

## 할 것
1. **선 묶음 문서**: `strokes/{sid}` 한 문서 한 선 대신 `pages/{pageKey}/chunks/{n}` = `{epoch, strokes:[{id,seq,cid,name,tool,color,w,pts,at,group?,part?}…]}`. 문서 하나에 선 최대 150개 또는 약 800KB(문서 1MB 한도 여유)에서 다음 n. 서버 `POST /strokes`(묶음 최대 20)는 트랜잭션으로 마지막 chunk 에 덧붙이고, 지우기(`DELETE /strokes/:sid`)는 해당 chunk 배열에서 빼고, 쪽 지우기는 epoch+1 뒤 옛 chunk 정리. seq·상한(쪽 2,000, 사람당 쪽 300, 회의 2만) 그대로. 정리 작업(purge)·md 내보내기·지적 수정 내용과 맞출 것.
2. **규칙**: `firestore.rules` 쭘 블록에서 `strokes` 대신 `pages/{pageKey}/chunks/{n}` 읽기 허용(쓰기는 서버만). Rules 시험 API(게시 아님)로 확인.
3. **api.js**: 판서 구독은 `subscribePageStrokes(pageKey, cb)` 하나로, cb 에는 **선 배열(현재 epoch 만, seq 순)** 을 넘긴다(저장 방식이 바뀌어도 D3 화면은 그대로). Firebase 앱 `'zzoom'` 의 Firestore 를 `persistentLocalCache` 로 열어 30분 안 다시 구독은 바뀐 문서만 과금되게. 최근 3쪽 구독은 LRU 로 유지(지금 D3 에 요청한 것과 같은 효과 — api.js 에서 한 곳으로).
4. **보내는 횟수**: 진행자 `live` 는 쪽·안건이 바뀔 때 바로, 확대·이동(view)은 끝난 뒤 400ms 묶어 최대 1초 1회. heartbeat 의 `counts` 갱신은 바뀐 값이 있을 때만, 최소 60초 간격. people 문서는 heartbeat 마다 쓰지 말고 상태가 바뀔 때(입장·나감·90초/5분 경계)만.
5. **측정**: `tests/zzoom/load.test.js` 와 같은 방식(이 파일은 고치지 말고 새 `tests/zzoom/cost.test.js`)으로 **20명 1시간** 시나리오를 돌려 서버 쓰기·삭제 수와 화면 읽기 추정(구독자 수 × 바뀐 문서 수 + 처음 읽기, 캐시 효과는 따로 표시)을 표로. 목표를 넘으면 무엇이 넘는지와 더 줄일 방법.
6. 설계서 `DESIGN.md` B-1·E·H-2 에 바뀐 저장 방식과 새 추정을 적는다.

## 지킬 것
`TEAM_COMMON.md`. 커밋·푸시·배포·규칙 게시 금지. 실제 Firestore 에 쓰지 않는다. 두 SPA 는 건드리지 않는다. 화면 팀 파일(`draw.js` 등)은 고치지 말고, 필요한 변경은 보고서 「요청」으로.
보고 `reports/COST.md`: 바꾼 것, 20명 1시간 숫자(전·후), 무료 한도 대비 %, 시험 결과 숫자. 마지막 답변 10줄 이내.
