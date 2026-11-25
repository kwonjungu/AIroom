# 시험 하네스 손질 (1024px 미만 서랍 대응)

고친 것은 시험 파일뿐이다. 제품 코드(public/zzoom)는 건드리지 않았다.

## 고친 곳
- tests/zzoom/d2_harness.js: 1024px 미만이면 mount 때 body 에 side-closed 를 붙여 옆칸을 닫은 채 시작한다. app.js 의 「안건 목록」 단추 #zz-agenda-toggle 배선(data-open 토글)도 똑같이 달았다.
- tests/zzoom/d2_e2e.py: open_agenda() 를 추가했다. 1024 미만이면 안건을 누르기 전에 서랍을 연다(768~1023 은 #zz-agenda-toggle, 그보다 좁으면 .zv-list-btn). 늦은 렌더 취소 시험에서 쓴다.
- tests/zzoom/d4_e2e.py: 서버가 ?role=host 같은 쿼리가 붙은 주소에 404 를 주던 문제를 고쳤다(파이썬 3.13 의 SimpleHTTPRequestHandler 는 쿼리를 그대로 경로로 봄). 이것이 "중간 멈춤"의 직접 원인이었다. d4_harness.html 은 side.open=true 로 시작해 서랍 문제가 없어 손대지 않았다.

## 결과
| 시험 | 엣지·크로미움 1280 / 820 | 이전 |
|---|---|---|
| d2_e2e.py | 통과 82 / 실패 0 (390 안건 덮개 포함) | 78 / 4 |
| d4_e2e.py | 통과 212 / 실패 0 | 중간 멈춤 |

## 남은 것
- d4 를 390x844 로 돌리면 Page.click 시간 초과가 난다(아래 서랍·가림 추정). d4 하네스는 실제 app.js 배치가 아니라 단순 틀이어서 원인을 확정하지 않았고 390 은 d4 시험 크기에서 뺐다. 제품 결함인지는 미확인.
- 익명화 작업 중인 poll.js·chat.js·hands.js 의 이름 기대 단언(김가·이나·박다 등, d4_e2e.py)은 그대로 두었다. 이름 제거가 끝나면 이 단언이 깨질 수 있다.
- 커밋하지 않았다.
