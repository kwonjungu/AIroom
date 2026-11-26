# 감사 R10 T3 — 화면 보기·펜 재감사 (2026-11-26)

대상: public/zzoom/draw.js, viewer.js, viewer.css, tests/zzoom/prod_pen_check.py, tests/zzoom/syntax-check.mjs. 커밋 9c3ff6d·1fb66fb·da68d17 의 변경을 audit-r9/S3_VIEWER_PEN.md(S1~S5)에 맞대어 보았다.

확인 방법:
- 코드 읽기(세 커밋 diff 와 지금 파일).
- `npm run test:zzoom`: 150 통과, 「문법 확인 24개, 오류 0」.
- syntax-check.mjs 를 <임시폴더>/r10/fake 에 복사했다. 그 안에 cdc369f 의 draw.js(R9 S1 문법 오류판)를 넣어 돌렸다. 이름이 틀린 import 를 넣은 draw.js 로도 돌렸다.
- **운영 파일**: https://a-iroom.vercel.app/zzoom/ 의 화면 모듈 24개와 viewer.css·draw.css 를 받았다. 모두 200 이었다. 줄바꿈(CR)을 빼면 HEAD 와 해시가 같다. 받은 파일 모두 `node --check`(.mjs)를 통과했다. Chromium 에서 운영 주소로 draw.js·viewer.js·board.js·agenda.js·chat.js·hands.js·host.js·join.js·list.js·onboard.js·poll.js·record.js·upload.js·convert/*.js·api.js 를 `import()` 했다. 모두 성공했다(draw.js 내보내기 22개). 운영 draw.js 의 renderStroke 로 캔버스에 선을 그려 잉크 픽셀 885개를 확인했다. strokeOptions 는 펜 6.4, 형광펜 28.8 이다. https://a-iroom.vercel.app/zzoom 첫 화면에서 pageerror·콘솔 오류는 0건이었다(로그인 안내 화면까지만 봄).
- viewer.js 하네스(<임시폴더>/r10/scripts/h10.html·r10_viewer.py)에서 자료 없던 안건에 자료가 들어오는 경우를 재현했다. 성공, 실패, 받는 중 ver 바뀜을 각각 보았다.
- 캐시 열쇠 계산과 「열쇠에서 minPx 를 뺄 때 결과가 같은지」는 지금 draw.js 를 node 로 불러 확인했다(<임시폴더>/r10/scripts/bench10.mjs).
- viewer.css 는 운영 파일을 has_touch 켬·끔 두 가지로 띄워 계산된 스타일을 보았다(css_check.py).
- 운영 회의는 만들지도 지우지도 않았다. prod_pen_check.py 도 돌리지 않았다. 대신 작업 트리의 PEN_PROD_CHECK.md 에 남은 실행 기록(14:08, 14:12)을 읽었다.

---

## 1. R9 지적이 고쳐졌나

| R9 | 판정 | 근거 |
|---|---|---|
| S1 치명 draw.js 문법 오류 | **고쳐짐(운영 반영 확인)** | draw.js:365-368. 주석이 줄을 따로 쓴다. 운영 draw.js 는 HEAD 와 같고, Chromium 에서 운영 주소로 import 가 성공하며 선도 그려진다. syntax-check.mjs 는 cdc369f 판을 「SyntaxError: Unexpected end of input」, exit 1 로 잡는다(실측). draw.test.mjs 가 test:zzoom 에 들어갔다(package.json:16) |
| S2 짐작 epoch 반쪽 | 고쳐짐 | draw.js:431 저장에 성공하면 guessed 를 내린다. dropStale(365) 조건에 `!p.parts.some(x => x.id)` 가 더해졌다. 흐름을 따라가 보았다. ① 짐작 0 이 맞아 저장되면 guessed=false 가 되고, 같은 epoch 가 오면 남는다. ② 짐작이 틀리면 stale_epoch 로 진짜 값을 받아 다시 보낸다. ③ 대기 중에 epoch 가 오면 번호를 바꿔 보낸다. ④ 보내는 중이면 건드리지 않는다. 네 경우 모두 맞다. 한 선의 조각은 한 묶음에 같이 가므로 일부만 저장되는 일은 드물다. 그런 경우에도 이미 guessed 가 내려가 있어 번호를 다시 바꾸지 않는다 |
| S3 확대마다 모든 선 다시 계산 | 고쳐짐(PC). 휴대폰은 의도대로 줄어듦 | draw.js:96-100. 열쇠에서 minPx 를 빼도 strokeOptions 결과는 같다. pageW 4종 × 배율 0.05~4 × 펜·형광펜에서 다른 경우가 0이었다. 배율 1→3 사이 서로 다른 열쇠 수는 PC 화이트보드 15→1, PC A4 14→1 로 줄었다. 휴대폰은 화이트보드 26→14, A4 23→12, 슬라이드 32→16 이다. 휴대폰에서는 1.45~1.48배까지 최소 굵기가 실제로 쓰이므로 그 구간만 다시 계산한다. 기능상 피할 수 없는 몫이라 지적하지 않는다 |
| S4 터치 노트북에서 막대가 펜 선을 먹음 | 고쳐짐(CSS 방식), 대가 있음(T3) | viewer.css:188 `any-pointer: coarse`. has_touch 이면 `.zv-sb` pointer-events none·opacity .35, 아니면 auto(실측). 주 포인터가 마우스이고 터치도 있는 기기는 Chromium 에서 흉내 내지 못했다. 그래서 코드로만 판단했다 |
| S5 운영 지우개 거짓 통과 | 고쳐짐. 결과 집계는 없음(T4) | prod_pen_check.py:305-322. 지우기 전에 둘째 기기에서 펜 경로 일치율을 재고, 0.5 미만이면 사라짐을 기다리지 않고 「판정 못 함」을 적는다. 14:08·14:12 실행 기록에 「지우기 전 일치율 1.00」 다음 「사라짐 0.7s/0.8s」가 있다 |
| (da68d17) 자료 없던 안건에 자료가 들어오면 다시 받기 | 고쳐짐, 무한 다시 받기·깜빡임 없음 | viewer.js:1042. 재현 V1: 시작은 「자료 없음」. 자료가 들어오면 쪽 그림을 한 번만 받고 그린다(파란 바탕 확인). 같은 안건 목록을 10번 더 보내도 더 받지 않는다. 재현 V2: 그림 받기가 실패하면 「다시 불러오기」 상태에서 멈춘다. 조건이 `S.load === 'nofile'` 일 때만 참이라 되풀이하지 않는다(쪽 그림은 1번만 요청했다. 나머지 요청은 썸네일이다). 재현 V4: 자료가 다시 없어지면 「자료 없음」으로 돌아간다. 서버는 finalize 에서 파일을 확인한 뒤에 pages 를 넣으므로(routes.js:738-778) 「pages 는 있는데 그림이 아직 없음」은 생기지 않는다 |

---

## 2. 찾은 문제

치명·높음은 없다. 낮음 4건이다.

### T1. [낮음] 쪽 그림을 받는 중이거나 받기에 실패했을 때 ver 가 바뀌면 다시 받지 않는다(예전부터 있던 문제. da68d17 바로 옆이다)
- 위치: viewer.js:1040(`S.imgFor && S.imgFor !== imgKey(...)`), 378(받기 시작할 때 `S.imgFor = null`), 387(실패할 때 imgFor 는 null 그대로)
- 재현(하네스 r10_viewer.py):
  - V3: 자료가 들어와 ver2 를 받는 중(300ms)에 ver3 이 온다. 다시 받지 않는다. ver2 그림이 도착하면 `S.imgFor` 가 ver2 이고 render 는 ver3 열쇠와 비교한다. 그래서 **빈 흰 쪽, 「불러오는 중」 표시도 없음** 상태가 된다. 다음 안건 목록이 와야 고쳐진다.
  - V2b: 받기 실패(「다시 불러오기」)로 멈춘 뒤 ver3 이 와도 쪽 그림을 다시 받지 않는다. 썸네일만 ver3 으로 받는다. 손으로 「다시 불러오기」를 눌러야 한다.
- 실제로 생기는 때: 발표자가 「자료 바꾸기」를 한 순간에 막 들어온 참석자, 또는 학교망에서 첫 받기가 실패한 뒤 자료가 바뀐 경우. 드물다.
- 고칠 방향: loadCurrent 에서 「지금 받으려는 열쇠」(예: S.want = key)를 기록한다. 안건 목록이 오면 `S.want !== imgKey(a, S.page)` 로 비교한다. 그러면 1040·1042 두 줄이 하나로 합쳐진다.

### T2. [낮음, 시험] syntax-check.mjs 는 문법 오류만 잡는다. import 이름 오류 같은 「연결 단계」 오류는 못 잡는다
- 위치: tests/zzoom/syntax-check.mjs:13-17(`node --check` 만 쓴다)
- 재현: 복사본 draw.js 첫 줄을 `import { getStrokeX as getStroke } ...` 로 바꿨다. syntax-check 는 「오류 0」, exit 0 이었다. 같은 파일을 node 로 import 하면 「does not provide an export named 'getStrokeX'」로 실패한다. 브라우저에서도 똑같이 모듈이 안 뜨고, app.js loadModule 이 「준비 중」만 남긴다. R9 S1 과 결과가 같은 사고다. draw.js 는 draw.test.mjs 가 import 하므로 잡힌다. viewer.js·agenda.js·host.js 등 나머지는 아무 시험도 import 하지 않는다. zzoom/index.html 13줄의 인라인 스크립트(첫 화면 실패 때 다시 읽기)도 검사 대상이 아니다.
- 확인: app.js 를 뺀 화면 모듈 15개를 node 로 그냥 import 해 보았다. DOM 이 없어도 모두 성공했다. 그래서 검사에 import 를 더해도 거짓 실패는 나지 않는다.
- 고칠 방향: syntax-check 에서 app.js(바로 부팅함) 말고는 `import(pathToFileURL(f))` 까지 해 본다. index.html 인라인 스크립트는 뽑아서 `node --check` 한다.

### T3. [낮음] any-pointer 로 바꾼 대가: 터치 노트북에서 마우스·터치패드로 일하는 사람은 펜 모드 동안 막대로 움직이지 못한다
- 위치: viewer.css:188, viewer.js:658(막대는 무대가 잡지 않음), 733-740(휠은 확대만 함)
- 내용: R9 S4 를 CSS 로 막았다. 그래서 터치 화면이 붙은 노트북·전자칠판 PC 에서는 펜을 켜면 막대가 마우스에도 꺼진다. 확대한 채 판서하며 옆으로 옮기려면 남는 방법이 두 가지다. 마우스 가운데 단추 끌기(viewer.js:670)나 화면 두 손가락이다. 터치패드 두 손가락 쓸기는 wheel 로 들어와 확대·축소가 된다. R8 N5 가 고치려던 상황이 이 기기들에서 되돌아온 셈이다. 펜 선을 먹는 것보다는 덜 나쁘다. 실기기로는 확인 못 함.
- 고칠 방향: R9 제안대로 막대 pointerdown 에서 `e.pointerType === 'mouse'` 이면 막대로 받는다. pen·touch 면 막대가 받지 않고 펜 캔버스로 넘긴다(elementsFromPoint 로 아래 캔버스에 넘기거나, 펜 모드에서는 막대를 캔버스 아래에 둔다). 그러면 CSS 의 pointer-events:none 이 필요 없다.

### T4. [낮음, 시험] prod_pen_check.py 는 「실패로 셈」이라고 적지만 실제로 세지 않는다
- 위치: tests/zzoom/prod_pen_check.py:321(`note('... (실패로 셈)')`), 509(`return 0`)
- 내용: 지우개 판정 불가, 둘째 기기 25초 안에 안 나타남(271), 펜 단추 없음(246) 모두 note 한 줄로만 남는다. main 은 항상 0 을 돌려준다. 사람이 PEN_PROD_CHECK.md 를 읽어야 실패를 안다. 거짓 「통과」는 이제 없다. 그러나 배포 뒤 자동 점검으로 돌리면 S1 같은 사고가 나도 exit 0 이다.
- 고칠 방향: 실패 목록(self.fails)을 모아 끝에 「실패 n건」을 적는다. 1건 이상이면 exit 1 로 끝낸다.

### 그 밖에 본 것(문제없음 또는 다시 지적하지 않음)
- **운영 모듈**: 위 「확인 방법」대로 운영 파일 전부가 HEAD 와 같고, 문법 오류가 없으며, 모듈로 읽힌다. 작업 트리의 list.js 는 줄바꿈만 다르다(내용 해시가 같다).
- **renderStroke used 판단**: 형광펜은 늘 used=false 다(형광펜은 최소 굵기 0.5 고정이라 맞다). `stroke.w || pr.w` 는 strokeOptions 와 같은 식이다. 묶음 선(mergeGroups)도 s.w 를 그대로 쓴다. 그리는 중인 임시 선은 cacheKey 가 없어 영향이 없다.
- **dropStale 와 「보내는 중」**: 보내는 중(sending)이면서 짐작인 선은 첫 조건도 둘째 조건도 건너뛴다. 결과는 저장 성공 처리나 stale_epoch 처리가 정리한다. 맞다.
- **21조각 선**: splitPts 는 21조각까지 만들고, flush 는 한 선의 조각을 다 실어 21개 묶음을 보낼 수 있다. 서버 한도는 20(routes.js:28, 964)이라 400 이 나고 그 선이 버려진다. 한 획이 약 3만 점일 때만 생기는 일이라 실사용에서는 생기지 않는다고 보았다. 참고로만 적는다.
- **서울 이전**: draw.js·viewer.js·viewer.css·prod_pen_check.py 에는 DB 이름이나 지역을 직접 쓴 곳이 없다. 모두 api.js·/api/zzoom 을 거친다. 이 파트에서 이전 때문에 생긴 문제는 찾지 못했다. 다만 da68d17 이 고친 「발표 신호가 자료보다 먼저 옴」은 지연이 줄어든 탓에 순서가 바뀐 것으로, 이전 때문에 드러난 문제다. 고쳐졌다.
- R9 N9(3번 실패 뒤 full 을 잃음)와 FIXES.md 「고치지 않은 것」은 다시 지적하지 않는다.

---

## 요약
| 번호 | 심각도 | 내용 |
|---|---|---|
| T1 | 낮음 | 받는 중이거나 받기 실패 상태에서 ver 가 바뀌면 다시 받지 않는다. 빈 쪽이나 「다시 불러오기」에 멈춘다(예전부터 있던 문제, 재현함) |
| T2 | 낮음(시험) | syntax-check 는 import 이름 오류를 못 잡는다(재현함). 나머지 화면 모듈은 어떤 시험도 import 하지 않는다 |
| T3 | 낮음 | any-pointer 때문에 터치 노트북의 마우스·터치패드 사용자가 펜 모드에서 막대를 못 쓴다 |
| T4 | 낮음(시험) | 운영 점검이 「실패로 셈」이라고 적지만 exit 는 늘 0 이다 |

R9 S1(치명)은 고쳐졌고 운영에도 반영됐다. 운영 파일 24개가 문법 오류 없이 모듈로 읽힌다. S2·S3·S5 와 da68d17 도 고쳐졌다. S4 는 고쳐졌지만 대가(T3)가 있다.

결론: PASS(치명·높음 0)
