# 감사 R9 S3 — 화면 보기·펜 재감사 (2026-11-26)

대상: public/zzoom/viewer.js·viewer.css, public/zzoom/draw.js, tests/zzoom/prod_pen_check.py. 커밋 cdc369f 의 이 파일들 변경과 R8 Q3 지적 N1~N9 를 맞대어 보았다.

확인 방법:
- 코드 읽기(cdc369f diff 와 현재 파일).
- R8 재현 하네스(<임시폴더>/r8q3/h.html·r.py)를 현재 viewer.js 로 다시 돌렸다. `.za-mini` DOM 을 먼저 넣는 변형(<임시폴더>/r9/h2.html·r9.py)을 더했다.
- draw.js 를 node 와 Chromium 으로 불러 보았다. 운영(https://a-iroom.vercel.app/zzoom/draw.js)에서 받은 파일로도 같은 시험을 했다. 회의를 열지 않고 모듈 import 만 했다.
- 문법 오류 한 줄만 고친 사본(<임시폴더>/r9/draw_fixed.mjs)으로 strokeOptions 와 캐시 열쇠를 계산했다(<임시폴더>/r9/bench.mjs).
- 운영 회의는 만들지 않았다.

---

## 1. R8 지적이 고쳐졌나

| R8 | 판정 | 근거 |
|---|---|---|
| N1 fitPage 에 cancelGlide 없음 | 고쳐짐 | viewer.js:449. 재현 S2·S2b: 미끄러지는 중에 「쪽 전체 보기」나 키 0 을 누르면 `{cx:.5,cy:.5,z:1}`, follow free |
| N2 펜 최소 2.2px 이 적용 안 됨 | 코드로는 고쳐짐. **draw.js 가 안 떠서 효과 없음**(S1). 고친 뒤에도 새 문제 있음(S3) | draw.js:96. 고친 사본으로 계산하면 휴대폰 화면 굵기가 A4 2.17, 슬라이드 2.19, 화이트보드 2.21px, PC 화이트보드 2.66px(그대로) |
| N3 큰 발표 단추가 안건 단추와 겹침 | 고쳐짐 | viewer.js:485 가 `.za-mini` DOM 을 직접 본다. 재현: viewer 가 붙기 전에 `.za-mini` 가 있어도 is-below-mini 가 붙는다. `.za-mini` 가 없어진 뒤 다음 applyFull 에서는 빠진다 |
| N4 /live 멈춤 최대 19초 | 고쳐짐 | api.js:403 `retry:false, idem:false`. 최악이 6초로 줄었다 |
| N5 펜 모드 PC 에서 스크롤 막대를 못 씀 | 고쳐짐, 부작용 있음(S4) | viewer.css:188 `@media (pointer: coarse)` |
| N6 미끄러지는 중 탭하면 중간 배율에서 멈춤 | 고쳐짐 | viewer.js:520-521 finishGlide. 재현 S3·S3b: 탭과 펜 누름 모두 `z=3`(발표자 값), follow 'follow' 그대로 |
| N7 저장된 짐작 선이 쪽 지우기 뒤에 남음 | **고치다가 draw.js 전체가 깨짐**(S1) | draw.js:362 |
| N8 운영 점검 지우개 판정 거짓 통과 | 안 고쳐짐 | cdc369f 는 prod_pen_check.py 를 건드리지 않았다. 마지막 변경은 744475c. 303-304 줄에서 dt 가 None 이어도 그대로 진행하고, 지우기 전 기준값도 없다 |
| N9 3번 실패 뒤 full 을 잃음 | 안 고쳐짐(낮음) | viewer.js:617-619 이 그대로다. 다만 N4 가 고쳐져 한 번 실패하는 데 걸리는 시간이 6초로 줄었다. 다시 지적하지 않는다 |

---

## 2. 찾은 문제

### S1. [치명] draw.js 문법 오류로 펜 모듈이 아예 뜨지 않는다(운영 반영됨)
- 위치: draw.js:362 (dropStale, cdc369f 에서 바뀜)
  ```js
  if (p.pageKey === en.key && p.guessed && (p.status === 'queued' || p.status === 'failed')) {   // 이미 저장된 선은 번호를 바꾸지 않는다(감사 R8 N7) p.epoch = en.epoch; p.guessed = false; for (const x of p.parts) x.body.epoch = en.epoch; continue; }
  ```
  주석 `//` 이 줄 끝까지 먹어서, 그 뒤의 몸통과 닫는 `}` 까지 주석이 되었다. 중괄호 하나가 닫히지 않는다.
- 실측:
  - `node --check`(.mjs 사본): `SyntaxError: Unexpected end of input` (748줄).
  - Chromium 에서 `import('/zzoom/draw.js')`: 로컬 파일과 **운영 파일** 모두 `SyntaxError: Unexpected end of input`.
  - 운영에서 받은 draw.js 는 줄바꿈 문자(CR)만 빼면 저장소 파일과 같다. 362줄에 같은 주석이 있다. 운영이 이미 cdc369f 를 서빙하고 있다.
  - `node --test tests/zzoom/draw.test.mjs`: 1개 실패(불러오기 단계). 이 시험은 `npm run test:zzoom` 목록(package.json:16)에 없다. 그래서 커밋 전 시험에서 걸리지 않았다.
- 영향: app.js loadModule(83-101줄)이 3번 다시 받은 뒤 null 을 돌려주고, 도구 막대 자리에 「준비 중」만 남는다. 그러면 운영의 모든 회의에서 다음이 안 된다.
  - 펜·형광펜·지우개·쪽 지우기
  - **이미 그린 판서 보기.** 판서 구독과 그리기는 draw.js 만 한다.

  회의 판서 기능 전체가 멈춘 상태다. R8 N2(펜 굵기)와 N7 고침도 그래서 효과가 없다.
- 고칠 방향: 주석을 줄 끝으로 옮기거나 몸통을 다음 줄로 내린다. draw.test.mjs 와 `node --check`(.mjs)를 test:zzoom 에 넣는다. 배포 뒤에는 운영 회의 화면에서 펜으로 실제로 그어 본다.

### S2. [보통] N7 고침 자체가 반쪽이다(S1 을 고친 뒤 남는 문제)
- 위치: draw.js:362, 저장 성공 처리(416-419 줄 부근)
- 무엇이 틀렸나: 조건을 queued·failed 로 좁힌 것은 맞다. 그러나 R8 이 같이 제안한 「저장에 성공하면 `p.guessed=false`」는 들어가지 않았다. 그래서 saved+guessed 인 선은 이 줄을 지나 다음 줄 `p.epoch < en.epoch` 에서 버려진다. 짐작한 epoch 0 이 맞았으면 버려도 무해하다. 서버 선이 구독으로 오기 때문이다. 그러나 「parts 일부만 저장됨」(여러 조각 선의 일부가 failed)이면 queued·failed 쪽으로 가서 이미 저장된 조각의 body.epoch 까지 바뀐다. 다음에 다시 보낼 때 저장된 조각은 id 가 있어 건너뛰는지 확인 못 함.
- 재현: 코드 근거만 있다. S1 때문에 실행해 볼 수 없었다.
- 고칠 방향: 조건에 `!p.parts.some(x => x.id)` 를 더한다. 저장에 성공하면 guessed 를 내린다(R8 N7 제안 그대로).

### S3. [낮음] 펜 최소 굵기 캐시 열쇠가 확대할 때마다 바뀌어, 모든 선의 외곽선을 다시 계산한다(PC 포함)
- 위치: draw.js:96-98
- 무엇이 틀렸나: 캐시 열쇠에 `m${minPx}` 를 **최소값이 실제로 쓰이는지와 상관없이** 넣는다. minPx 는 2.2/scale 을 0.25 단위로 둥근 값이다. 그래서 확대·축소·부드럽게 따라가기(glideTo 는 0.14초 동안 매 프레임 scale 이 바뀐다)·창 크기 바꾸기마다 열쇠가 바뀐다. 그때마다 화면의 모든 선을 getStroke 로 다시 계산한다. 예전 열쇠는 쪽 크기만 담아 확대해도 다시 계산하지 않았다.
- 실측(node, 고친 사본):
  - 배율 1에서 3까지 확대할 때 서로 다른 minPx 개수는 휴대폰 화이트보드 26개, PC 화이트보드 15개.
  - PC 에서는 minPx(5.25) 가 펜 굵기(6.4) 보다 작아 결과가 똑같은데도 다시 계산한다.
  - 120점 선 300개를 getStroke 하는 데 PC node 기준 36ms 가 걸린다. 휴대폰은 몇 배 느릴 것으로 보이나 확인 못 함.
- 영향: 판서가 많은 쪽에서 두 손가락 확대나 따라가기 미끄러짐이 끊길 수 있다. 캐시(6000개)도 빨리 밀려난다.
- 고칠 방향: `minPx > w·pageW` 일 때만 열쇠에 minPx 를 넣는다. 아니면 확대 제스처 동안에는 옛 path 를 쓰고, 멈춘 뒤 한 번만 다시 계산한다.

### S4. [낮음] 터치 화면 노트북·전자칠판(주 포인터가 마우스)에서는 펜 모드 가장자리 선을 다시 스크롤 막대가 먹는다(N5 고침의 부작용)
- 위치: viewer.css:188 (`@media (pointer: coarse)`), viewer.js:658 (`.zv-sb` 면 무대가 잡지 않음)
- 무엇이 틀렸나: `pointer` 미디어는 **주 포인터** 하나만 본다. 펜·터치가 있어도 터치패드나 마우스가 붙은 Surface 형 노트북, 교실 터치 PC 는 `fine` 이다. 여기서 확대한 채로 펜을 쓰면 오른쪽·아래 가장자리 14px 에서 시작한 펜 선이 막대 끌기로 바뀐다. R7 P3-6 이 그대로 돌아온다. 실기기 확인은 못 했다(Chromium 은 fine 으로만 띄움).
- 고칠 방향: R8 제안대로 막대 pointerdown 에서 `e.pointerType` 으로 가른다. mouse 만 막대로 받고, pen·touch 는 막대를 통과시켜 펜 캔버스로 넘긴다. CSS 로 갈라야 한다면 최소한 `any-pointer: coarse` 를 쓴다.

### S5. [보통, 시험 결함 — R8 N8 그대로] 운영 점검 지우개 판정이 선이 안 와도 「사라짐」으로 나온다
- 위치: tests/zzoom/prod_pen_check.py:303-304, 313-317. bandp1(310)도 여전히 쓰이지 않는다.
- 재현: R8 N8 과 같다. 이번에는 S1 때문에 **운영에서 둘째 기기에 선이 아예 그려지지 않는다.** 이 시험을 지금 돌리면 「나타남 None」 뒤에 「사라짐 0.x초」가 나와 지우개는 통과로 보일 가능성이 크다(실행은 안 함, 확인 못 함). 운영 점검이 S1 같은 사고를 놓치게 만드는 결함이다.
- 고칠 방향: dt 가 None 이면 「판정 불가·실패」로 끝낸다. 지우기 전 둘째 기기 cover 를 재서 0.8 이상일 때만 「지우기 전 대비 0.2배 미만」으로 판정한다.

### 그 밖에 본 것(문제없음)
- **cancelGlide·finishGlide·glideTarget**: 끝까지 간 미끄러짐에서 glideTarget 을 null 로 지운다(527줄). 그래서 그 뒤 탭에서 finishGlide 가 옛 목표로 되돌리지 않는다. setTarget·setView·fitPage 는 cancelGlide(멈춤만), onDown 은 finishGlide(목표로 맞춤)로 나뉘어 있다. 휠·다음 쪽(S6·S7)은 그대로 동작한다. onDown 의 finishGlide 는 내가 끌기를 시작할 때도 먼저 발표자 자리로 맞춘 다음 끌기를 시작한다. 이것은 의도한 동작으로 본다.
- **is-below-mini**: ui:wait 처리(1071)와 applyFull 의 DOM 판단(485)이 함께 있다. agenda.js 는 emit 을 한 다음에 DOM 을 바꾸지만(152 다음 157), ui:wait 처리는 mode 값으로 판단하므로 순서가 꼬이지 않는다. 쪽 막대의 「오늘의 안건 보기」 판단(waitShown)은 viewer 가 늦게 붙으면 여전히 'off' 로 시작한다. 예전부터 있던 낮은 문제라 다시 지적하지 않는다.
- **renderStroke minPx 범위**: 형광펜은 0.5 그대로이고, 지우개 판정(hitStroke)은 굵기를 쓰지 않는다. 그리는 중인 임시 선(301)과 저장된 선(284·291)이 같은 scale 을 넘기므로, 손을 뗀 순간 굵기가 튀지 않는다.
- **서울 이전 관련**: viewer.js·draw.js·prod_pen_check.py 에는 DB 이름이나 지역을 직접 쓴 곳이 없다. 모두 api.js 를 거친다. prod_pen_check.py 는 /api/zzoom 만 쓴다. 이 파트에서 DB 이름 불일치 문제는 찾지 못했다(api.js DB_NAME 은 다른 파트 몫).

---

## 요약
| 번호 | 심각도 | 내용 |
|---|---|---|
| S1 | **치명** | draw.js:362 주석이 몸통과 `}` 를 삼켜 문법 오류. 운영에서 펜 모듈이 안 뜬다(판서 보기·그리기·지우기 전부). draw.test.mjs 가 test:zzoom 에 없어 못 걸렀다(실측) |
| S2 | 보통 | N7 고침이 반쪽. 저장 성공 때 guessed 를 안 내리고, 일부만 저장된 선의 조각 epoch 도 바꿀 수 있다 |
| S3 | 낮음 | minPx 캐시 열쇠 때문에 확대·미끄러짐마다 모든 선을 다시 계산(PC 포함, 실측 계산) |
| S4 | 낮음 | pointer:coarse 판단이라 터치 노트북·전자칠판에서 펜 가장자리 선을 막대가 다시 먹는다 |
| S5 | 보통(시험) | R8 N8 안 고침. 지금 운영 상태(S1)에서는 지우개 거짓 통과가 특히 위험하다 |

R8 N1·N3·N4·N6 은 고쳐졌다(재현으로 확인). N2·N7 은 S1 때문에 운영에서 효과가 없다. N5 는 고쳐졌으나 부작용 S4 가 있다. N8 은 안 고쳐졌고, N9 는 낮음이라 그대로 둔다.

결론: FAIL
