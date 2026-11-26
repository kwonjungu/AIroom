# 감사 R11 U3 — 화면 보기·펜 (2026-11-26)

대상: public/zzoom/viewer.js(loadCurrent 의 S.wantFor, 안건 갱신 때 want 비교), draw.js, viewer.css, tests/zzoom/syntax-check.mjs, tests/zzoom/prod_pen_check.py. 커밋 2ed51ee(R10 화면 낮음 고침)를 audit-r10/T3_VIEWER_PEN.md(T1~T4)에 맞대어 보았다.

확인 방법:
- 코드 읽기. 2ed51ee 의 diff 와 지금 파일을 보았다. draw.js·viewer.css 는 2ed51ee 이후 바뀌지 않았다.
- `npm run test:zzoom`: 150 통과, 「문법 확인 24개, 오류 0」.
- viewer.js 하네스(<임시폴더>/r11/scripts/h11.html·r11_viewer.py). R10 하네스를 고쳐 쪽 그림 요청과 썸네일 요청을 나누어 세고, 열쇠마다 실패를 지정할 수 있게 했다. 10가지 상황(W1~W10)을 돌렸다. 고치기 전 viewer.js(2ed51ee^)로도 같은 하네스를 돌려(r11_viewer_old.py), 하네스가 차이를 잡는지 확인했다.
- syntax-check.mjs 를 <임시폴더>/r11/fake 에 저장소 복사본과 같이 두고 돌렸다. 일부러 오류를 넣은 파일로도 돌렸다.
- **운영 요청은 최소로 했다**(Vercel 무료 한도 때문). GET 4번만 보냈다. viewer.js·draw.js·viewer.css·vendor/perfect-freehand-1.2.3.mjs 를 받았고 모두 200 이었다. 회의는 만들지도 지우지도 않았다. prod_pen_check.py 는 돌리지 않았다. 브라우저로 운영 주소를 열지도 않았다.

---

## 1. R10 지적이 고쳐졌나

| R10 | 판정 | 근거 |
|---|---|---|
| T1 받는 중이거나 받기 실패한 쪽은 ver 가 바뀌어도 다시 받지 않음 | **고쳐짐** | viewer.js:371 loadCurrent 첫머리에서 wantFor 를 비우고, 379 받기 시작할 때 `S.wantFor = key` 로 둔다. 1041 은 `want = S.imgFor \|\| S.wantFor` 와 imgKey 를 비교한다. 아래 표처럼 무한 다시 받기도, 빠진 다시 받기도 없었다 |
| T2 syntax-check 가 없는 이름 import 를 못 잡음 | **고쳐짐(index.html 인라인 스크립트는 덜)** | syntax-check.mjs:20-24 에서 app.js 말고 23개 모듈을 실제로 import 한다. 복사본 draw.js 4줄을 `{ getStrokeX as getStroke }` 로 바꾸니 「does not provide an export named 'getStrokeX'」, exit 1 로 잡았다. convert/index.js 에 없는 이름 NOPE 를 넣어도 exit 1 이었다. 원본 그대로는 exit 0 이었다. R10 이 같이 제안한 index.html 13줄 인라인 스크립트 검사는 들어가지 않았다(U3-2) |
| T3 터치 노트북에서 펜 모드 동안 마우스로 막대를 못 씀 | 안 고침(FIXES.md 「고치지 않은 것」) | 다시 지적하지 않는다 |
| T4 운영 펜 점검이 늘 exit 0 | **고쳐짐(세는 범위는 덜)** | prod_pen_check.py:26-29 에서 FAILS 를 모으고, 511-512 에서 실패 건수를 찍은 뒤 1건 이상이면 1 을 돌려준다. 판정 문자열만 따로 떼어 시험했다. 「사라짐: 0.7s (None=…)」는 실패로 세지 않았다. 「사라짐: Nones」와 「나타남 Nones」는 실패로 셌다. 괄호 속 「None=」 때문에 거짓 실패가 나지는 않는다. 다만 내 화면 쪽 실패는 세지 않는다(U3-3) |

### viewer.js 재현 결과(M = 쪽 그림 요청. 쪽 넘김 뒤 다음 쪽 미리 받기도 M 으로 셌다)

| 상황 | 지금 코드 | 고치기 전 코드 |
|---|---|---|
| W1 ver2 를 받는 중(300ms)에 ver3 도착 | ver3 을 받아 그림(파란 바탕). M: 2:1, 3:1, 3:2(미리 받기) | 빈 쪽. ver3 1쪽을 받지 않음 |
| W2a·b 받기 실패 뒤 같은 안건 목록 10번 | 「다시 불러오기」에 머묾. M 1번(되풀이 없음) | 같음 |
| W2c 실패 뒤 ver3 도착 | ver3 을 받아 그림 | 「다시 불러오기」에 멈춤 |
| W3 계속 실패하는 중에 ver 3·4·5 가 각각 두 번씩 옴 | ver 마다 정확히 1번씩 받음(M 4번). 무한 되풀이 없음 | M 1번에서 멈춤 |
| W4 받는 중에 같은 ver 10번, 받은 뒤에 또 10번 | M 1번(+미리 받기 1번) | — |
| W5 받는 중에 진행자를 따라 2쪽으로 넘김, 이어 같은 안건 목록 | 2쪽을 그림. 쪽 표시 「2 / 3」. 남는 요청 없음 | — |
| W6 1쪽 실패, 2쪽으로 갔다가 1쪽으로 돌아옴, 같은 목록 5번 | 돌아오면 1쪽을 다시 받아 그림(실패한 캐시는 지워져 있음). 그 뒤로 더 받지 않음 | — |
| W7 1·2쪽 모두 실패한 뒤 ver3 도착 | 2쪽 ver3 을 받아 그림 | 「다시 불러오기」에 멈춤 |
| W8 받은 뒤 ver3, 같은 목록 5번 | 1번만 다시 받음 | — |
| W10 실패 뒤 「다시 불러오기」 단추 | 받아서 그림 | 같음 |

페이지 오류는 0건이었다. wantFor 가 남는 경로도 따라가 보았다. 받기에 성공하면 wantFor 가 key 로 남지만 imgFor 가 앞서므로 결과가 같다. 판·자료 없음·안건 없음으로 가는 길은 첫머리(371)에서 wantFor 를 비운다. 캐시가 맞는 길(377)은 setImg 가 imgFor 를 채운다. 그래서 「옛 wantFor 때문에 쓸데없이 다시 받기」는 생기지 않는다.

### 운영 파일
운영 viewer.js·draw.js·viewer.css·perfect-freehand 를 받아 줄바꿈(CR)을 뺀 뒤 해시를 비교했다. 네 파일 모두 HEAD 와 같았다(운영 viewer.js 에도 wantFor 가 있다). 받은 viewer.js·draw.js 는 `node --check` 를 통과했다. 받은 폴더에서 node 로 import 하니 draw.js 의 내보내기가 22개였고 viewer.js 의 mount 는 function 이었다. 모듈로 읽힌다는 뜻이다. 한도 때문에 나머지 20개 모듈은 운영에서 받지 않았다. 확인 못 함. 저장소 쪽에서는 24개 모두 syntax-check 를 통과했다.

---

## 2. 찾은 문제

치명·높음은 없다. 낮음 3건과 참고 1건이다.

### U3-1. [낮음, 시험] syntax-check 의 import 단계는 Node 버전과 「브라우저 전용 전역」에 기대어, 거짓 실패가 날 수 있다
- 위치: tests/zzoom/syntax-check.mjs:20-24. 루트 package.json 에 "type" 이 없다.
- 내용:
  - ① public/zzoom/*.js 는 CommonJS 자리에 있는 ESM 이다. Node 22 의 모듈 자동 판별로만 읽힌다(test:zzoom 에서 MODULE_TYPELESS_PACKAGE_JSON 경고가 보인다). 자동 판별이 없는 옛 Node 20 에서는 모든 모듈이 「불러오기 실패」로 나올 것으로 보인다. 확인 못 함. 앞쪽 `--check` 단계는 .mjs 로 복사해 이 문제를 피하는데, import 단계는 그러지 않는다. 저장소가 Node 22 를 기준으로 하므로 당장의 문제는 아니다.
  - ② 모듈 맨 위에서 브라우저 전역을 쓰면 브라우저에서는 멀쩡해도 node 에서는 실패한다. 복사본 viewer.js 끝에 `const q = matchMedia('(x)');` 한 줄을 붙여 보았다. 「matchMedia is not defined」, exit 1 이었다. 지금 모듈 23개는 맨 위에서 window·document 를 쓰지 않는다(app.js 는 빠져 있다. convert/hwp.js 의 globalThis.measureTextWidth 는 함수 안에 있다). 그래서 지금은 거짓 실패가 없다.
- 시험 환경 오염: 없다. syntax-check 는 `node --test` 와 따로 `&&` 뒤에서 자기 프로세스로 돈다. 모듈을 불러온 뒤에는 규칙 파일만 읽고 process.exit 으로 끝난다. 남은 타이머가 끝을 막지도 않는다.
- 고칠 방향: 오류 문구에 「브라우저 전용 전역이면 모듈 맨 위가 아니라 함수 안에서 쓰라」를 붙이거나, import 할 때 window·matchMedia 같은 최소 대역을 둔다. Node 22 이상이 필요하다는 것도 적어 둔다.

### U3-2. [낮음, 시험] index.html 인라인 스크립트(첫 화면 실패 때 다시 읽기)는 여전히 아무 검사도 받지 않는다
- 위치: public/zzoom/index.html:13 이하, syntax-check.mjs(.js 만 모은다)
- 재현: 코드 확인. walk 는 `.js` 로 끝나는 파일만 모은다. R10 T2 의 제안 가운데 이 절반이 들어가지 않았고, FIXES.md 에도 따로 적혀 있지 않다.
- 영향: 이 스크립트에 문법 오류가 생겨도 app.js 는 그대로 뜬다. 그러면 학교망에서 첫 받기가 끊겼을 때 다시 읽기 안내만 사라진다. 피해는 작다.
- 고칠 방향: index.html 에서 `<script>` 본문(type 없는 것)을 뽑아 `node --check` 를 한 번 돌린다.

### U3-3. [낮음, 시험] prod_pen_check 의 실패 집계가 「둘째 기기·예외」만 세고, 내 화면 쪽 실패는 통과로 둔다
- 위치: tests/zzoom/prod_pen_check.py:28(판정 문자열). 세지 않는 줄은 266(내 화면 즉시 일치율), 289(새로고침 뒤 잉크), 316(지우개 뒤 내 화면 일치율), 338(콘솔·페이지 오류 n건), 424·436(빠른 10획 x/10)이다.
- 재현(판정식만 떼어 시험): 「지우개 후 내 화면 펜 경로 일치율 0.85」, 「12초 뒤 둘째 기기에서 보이는 획: 6/10」, 「새로고침 뒤 호스트 화면 획: 4/10」, 「콘솔/페이지 오류 3건」, 「잉크픽셀 0->0, 일치율 0.00」은 모두 통과로 셌다.
- 영향: R9 S1 같은 「모듈이 통째로 안 뜸」은 펜 단추가 없어 248 의 !! 로 잡힌다. 그러나 「지우개가 내 화면에서 안 지움」이나 「빠른 획 일부가 사라짐」은 exit 0 이다. 사람이 기록을 읽어야 안다.
- 고칠 방향: 문자열을 찾는 대신 판정하는 자리에서 직접 FAILS 에 넣는다(cover<0.5, r_after≥0.2, sum(have)<10, errs>0 등).

### 참고. 안건 제목만 바꿔도 ver 가 올라 보던 쪽 그림을 다시 받는다(예전부터 있던 설계)
- 위치: lib/zzoom/routes.js:884(제목을 바꾸면 ver+1), viewer.js:160(imgKey 에 ver 가 들어감)
- 내용: 그림은 그대로인데 열쇠가 바뀌므로 다시 받는다(W8 과 같은 길). wantFor 가 생긴 뒤로는 받는 중에 제목이 바뀌어도 처음부터 다시 받는다. 학교망에서 제목을 여러 번 고치면 그만큼 다시 받지만, 한 번에 한 번씩이고 되풀이되지는 않는다. 지적이 아니라 참고로 적는다.

### 그 밖에 본 것
- **서울 이전**: viewer.js·draw.js·viewer.css·prod_pen_check.py·syntax-check.mjs 에는 DB 이름이나 지역을 직접 쓴 곳이 없다(api.js·/api/zzoom 을 거친다). syntax-check 의 규칙 블록 비교(firestore.rules 와 firestore.zzoom.rules)는 지금 같다(오류 0). 이 파트에서 이전 때문에 생긴 문제는 찾지 못했다.
- draw.js·viewer.css 는 R10 이후 바뀌지 않았고, R10 에서 본 결과(S1~S5 고쳐짐)가 그대로다.
- R9 N9, FIXES.md 「고치지 않은 것」(T3-T3 포함)은 다시 지적하지 않는다.

---

## 요약
| 번호 | 심각도 | 내용 |
|---|---|---|
| U3-1 | 낮음(시험) | syntax-check import 단계는 Node 22 판별과 「맨 위에서 브라우저 전역 안 씀」에 기댄다. 거짓 실패가 날 수 있다(재현함). 시험 환경 오염은 없다 |
| U3-2 | 낮음(시험) | index.html 인라인 스크립트는 여전히 검사 밖이다(R10 T2 의 남은 절반) |
| U3-3 | 낮음(시험) | 운영 펜 점검이 내 화면 쪽 실패(지우개, 빠른 획 x/10, 콘솔 오류)를 세지 않는다 |
| 참고 | — | 제목만 바꿔도 쪽 그림을 다시 받는다(예전부터 있던 설계) |

R10 T1 은 고쳐졌다. 쪽 넘김, ver 바뀜, 실패, 같은 쪽 반복 갱신 10가지 상황에서 무한 다시 받기도 빠진 다시 받기도 없었고, 고치기 전 코드와의 차이도 재현했다. T2·T4 는 고쳐졌지만 남은 몫이 있다(U3-1~3). 운영 viewer.js·draw.js·viewer.css 는 HEAD 와 같고, 모듈로 읽힌다.

결론: PASS(치명·높음 0)
