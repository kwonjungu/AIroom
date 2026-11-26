# 쭘 운영 펜 점검 (https://a-iroom.vercel.app, 2026-11-26)
> 핵심 발견: elementFromPoint 가 판서 캔버스 대신 .zv-overlay 를 돌려줌. zzoom.css:107 `#zz-stage-overlay > * {pointer-events:auto}` 가 viewer.css:9 `.zv-overlay{pointer-events:none}` 를 이김(아이디 선택자). 실제 입력은 #zz-layer-temp 에 안 닿음. 합성 이벤트로만 그려짐.

# 실행 2026-11-26 10:22:03  https://a-iroom.vercel.app

## 너비 1280 (마우스)  10:22:04
1. 펜 단추 보임=True 라벨='펜으로 쓰기' 크기=(139, 44) 위치=(780, 619) (뷰포트 1280)
   펜 켠 뒤: 도구 ['형광펜', '펜', '지우개'] 색 3개 body.is-pen=True
2a. 실제 마우스(page.mouse) 끌기: 맨 위 요소=DIV#.zv-overlay, temp pointer-events=auto, .zv-overlay pointer-events=auto, temp 캔버스가 받은 포인터 이벤트 0개, 잉크 0->0, 일치율 0.00
2. [mouse] 내 화면 즉시: 잉크픽셀 0->980, 경로 일치율 1.00, 잉크 bbox [388, 304, 789, 345], 경로 bbox [389, 305, 789, 345]
3. [mouse] 둘째 기기 나타남 1.71s (손 뗀 시각 기준 약 2.4s 경과 측정), 경로 일치율 1.00
2. [pen] 내 화면 즉시: 잉크픽셀 980->2592, 경로 일치율 1.00, 잉크 bbox [387, 304, 790, 446], 경로 bbox [389, 405, 789, 445]
3. [pen] 둘째 기기 나타남 1.43s (손 뗀 시각 기준 약 2.1s 경과 측정), 경로 일치율 1.00
4. 새로고침 후 호스트 화면 잉크픽셀 2378 (이전 0→그린 뒤 위 값)
5. 형광펜 일치율 1.00, 펜(색2) 일치율 1.00
   펜(밴드 0.8) 둘째 기기 나타남 0.58s
   지우개 후 내 화면 밴드 잉크 637 (0 이면 지워짐)
   둘째 기기에서 사라짐: Nones (None=25초 안에 안 사라짐)
7. 보기 모드 끌기: stage touch-action=none, temp pointer-events=none, 문서 scrollY 0->0, 쪽 이동 [256, 150, 666, 500]->[256, 150, 666, 500], 잉크 변화 8025->8025(그려지면 안 됨)
   ctrl+휠 뒤 쪽 크기 666->144 (확대 단추/요소 1개)
   (줌 뒤) 펜 경로 일치율 1.00
8. 참여자 펜 단추 보임=True 라벨='펜으로 쓰기'
   참여자가 그림: 자기 화면 일치율 1.00; 호스트 화면에 나타남 1.43s; toast []
6. 빠른 10획 소요 6.4s; 직후 내 화면 밴드별 잉크: [True, True, True, True, True, True, True, True, True, True]
   12초 뒤 둘째 기기에서 보이는 획: 10/10 [True, True, True, True, True, True, True, True, True, True]
   그 사이 POST /strokes 5번, 상태 [201, 201, 201, 201, 201], 묶음 크기 [1, 2, 3, 3, 1]; toast []
   새로고침 뒤 호스트 화면 획: 10/10 [True, True, True, True, True, True, True, True, True, True]
   크기변경 900x650: 캔버스 900x421(css 900x421, dpr 1, 배율 x 1.00 y 1.00); 손 떼기 전 일치율 0.00, 뗀 뒤 0.00
   크기변경 1280x800: 캔버스 1040x571(css 1040x571, dpr 1, 배율 x 1.00 y 1.00); 손 떼기 전 일치율 0.00, 뗀 뒤 0.00
toast 기록: []
>=400 응답: []
콘솔/페이지 오류 2건: ['host reqfailed POST zzoom/mnxfpm0buz7wl/heartbeat net::ERR_ABORTED', 'host reqfailed POST zzoom/mnxfpm0buz7wl/heartbeat net::ERR_ABORTED']
획 저장·삭제 요청 12건(초,누가,메서드,상태,묶음크기): [(0.0, 'host', 'POST', 201, 1), (2.7, 'host', 'POST', 201, 1), (15.3, 'host', 'POST', 201, 1), (16.9, 'host', 'POST', 201, 1), (17.9, 'host', 'DELETE', 200, None), (46.3, 'host', 'POST', 201, 1), (47.7, 'part', 'POST', 201, 1), (50.2, 'host', 'POST', 201, 1), (51.9, 'host', 'POST', 201, 2), (54.0, 'host', 'POST', 201, 3), (55.8, 'host', 'POST', 201, 3), (57.6, 'host', 'POST', 201, 1)]

## 너비 820 (터치)  10:24:10
1. 펜 단추 보임=True 라벨='펜으로 쓰기' 크기=(139, 44) 위치=(660, 663) (뷰포트 820)
   펜 켠 뒤: 도구 ['형광펜', '펜', '지우개'] 색 3개 body.is-pen=True
2a. 실제 마우스(page.mouse) 끌기: 맨 위 요소=DIV#.zv-overlay, temp pointer-events=auto, .zv-overlay pointer-events=auto, temp 캔버스가 받은 포인터 이벤트 0개, 잉크 0->0, 일치율 0.00
2b. 실제 터치(CDP) 끌기: temp 가 받은 이벤트 0개, 일치율 0.00, scrollY 0
2. [touch] 내 화면 즉시: 잉크픽셀 0->1218, 경로 일치율 1.00, 잉크 bbox [176, 305, 643, 352], 경로 bbox [177, 305, 643, 352]
3. [touch] 둘째 기기 나타남 1.71s (손 뗀 시각 기준 약 2.3s 경과 측정), 경로 일치율 1.00
2. [pen] 내 화면 즉시: 잉크픽셀 1218->3326, 경로 일치율 1.00, 잉크 bbox [175, 305, 644, 469], 경로 bbox [177, 422, 643, 468]
3. [pen] 둘째 기기 나타남 1.48s (손 뗀 시각 기준 약 2.1s 경과 측정), 경로 일치율 1.00
4. 새로고침 후 호스트 화면 잉크픽셀 3102 (이전 0→그린 뒤 위 값)
5. 형광펜 일치율 1.00, 펜(색2) 일치율 1.00
   펜(밴드 0.8) 둘째 기기 나타남 0.58s
   지우개 후 내 화면 밴드 잉크 42 (0 이면 지워짐)
   둘째 기기에서 사라짐: Nones (None=25초 안에 안 사라짐)
7. 보기 모드 끌기: stage touch-action=none, temp pointer-events=none, 문서 scrollY 0->0, 쪽 이동 [22, 125, 776, 582]->[22, 125, 776, 582], 잉크 변화 10616->10616(그려지면 안 됨)
   ctrl+휠 뒤 쪽 크기 776->168 (확대 단추/요소 1개)
   (줌 뒤) 펜 경로 일치율 1.00
8. 참여자 펜 단추 보임=True 라벨='펜으로 쓰기'
   참여자가 그림: 자기 화면 일치율 1.00; 호스트 화면에 나타남 1.43s; toast []
6. 빠른 10획 소요 6.4s; 직후 내 화면 밴드별 잉크: [True, True, True, True, True, True, True, True, True, True]
   12초 뒤 둘째 기기에서 보이는 획: 10/10 [True, True, True, True, True, True, True, True, True, True]
   그 사이 POST /strokes 5번, 상태 [201, 201, 201, 201, 201], 묶음 크기 [1, 2, 2, 3, 2]; toast []
   새로고침 뒤 호스트 화면 획: 10/10 [True, True, True, True, True, True, True, True, True, True]
   크기변경 844x390: 캔버스 844x161(css 844x161, dpr 1, 배율 x 1.00 y 1.00); 손 떼기 전 일치율 0.00, 뗀 뒤 0.00
toast 기록: []
>=400 응답: []
콘솔/페이지 오류 2건: ['host reqfailed POST zzoom/mp44nk3budg6n/heartbeat net::ERR_ABORTED', 'host reqfailed POST zzoom/mp44nk3budg6n/heartbeat net::ERR_ABORTED']
획 저장·삭제 요청 12건(초,누가,메서드,상태,묶음크기): [(0.0, 'host', 'POST', 201, 1), (2.7, 'host', 'POST', 201, 1), (15.3, 'host', 'POST', 201, 1), (17.0, 'host', 'POST', 201, 1), (18.1, 'host', 'DELETE', 200, None), (46.6, 'host', 'POST', 201, 1), (48.1, 'part', 'POST', 201, 1), (50.5, 'host', 'POST', 201, 1), (52.1, 'host', 'POST', 201, 2), (54.0, 'host', 'POST', 201, 2), (55.8, 'host', 'POST', 201, 3), (57.9, 'host', 'POST', 201, 2)]

## 너비 390 (터치)  10:26:11
1. 펜 단추 보임=True 라벨='펜으로 쓰기' 크기=(131, 48) 위치=(238, 558) (뷰포트 390)
   펜 켠 뒤: 도구 ['형광펜', '펜', '지우개'] 색 3개 body.is-pen=True
2a. 실제 마우스(page.mouse) 끌기: 맨 위 요소=DIV#.zv-overlay, temp pointer-events=auto, .zv-overlay pointer-events=auto, temp 캔버스가 받은 포인터 이벤트 0개, 잉크 0->0, 일치율 0.00
2b. 실제 터치(CDP) 끌기: temp 가 받은 이벤트 0개, 일치율 0.00, scrollY 0
2. [touch] 내 화면 즉시: 잉크픽셀 0->395, 경로 일치율 1.00, 잉크 bbox [82, 356, 305, 379], 경로 bbox [82, 357, 306, 379]
3. [touch] 둘째 기기 나타남 1.68s (손 뗀 시각 기준 약 2.3s 경과 측정), 경로 일치율 1.00
2. [pen] 내 화면 즉시: 잉크픽셀 395->985, 경로 일치율 1.00, 잉크 bbox [81, 356, 306, 435], 경로 bbox [82, 413, 306, 435]
3. [pen] 둘째 기기 나타남 1.67s (손 뗀 시각 기준 약 2.3s 경과 측정), 경로 일치율 1.00
4. 새로고침 후 호스트 화면 잉크픽셀 892 (이전 0→그린 뒤 위 값)
5. 형광펜 일치율 1.00, 펜(색2) 일치율 1.00
   펜(밴드 0.8) 둘째 기기 나타남 0.85s
   지우개 후 내 화면 밴드 잉크 203 (0 이면 지워짐)
   둘째 기기에서 사라짐: Nones (None=25초 안에 안 사라짐)
7. 보기 모드 끌기: stage touch-action=none, temp pointer-events=none, 문서 scrollY 0->0, 쪽 이동 [8, 270, 372, 280]->[8, 270, 372, 280], 잉크 변화 2783->2783(그려지면 안 됨)
   ctrl+휠 뒤 쪽 크기 372->80 (확대 단추/요소 1개)
   (줌 뒤) 펜 경로 일치율 1.00
8. 참여자 펜 단추 보임=True 라벨='펜으로 쓰기'
   참여자가 그림: 자기 화면 일치율 1.00; 호스트 화면에 나타남 1.36s; toast []
6. 빠른 10획 소요 6.4s; 직후 내 화면 밴드별 잉크: [True, True, True, True, True, True, True, True, True, True]
   12초 뒤 둘째 기기에서 보이는 획: 10/10 [True, True, True, True, True, True, True, True, True, True]
   그 사이 POST /strokes 5번, 상태 [201, 201, 201, 201, 201], 묶음 크기 [1, 2, 3, 3, 1]; toast []
   새로고침 뒤 호스트 화면 획: 10/10 [True, True, True, True, True, True, True, True, True, True]
   크기변경 844x390: 캔버스 844x161(css 844x161, dpr 1, 배율 x 1.00 y 1.00); 손 떼기 전 일치율 0.00, 뗀 뒤 0.00
toast 기록: []
>=400 응답: []
콘솔/페이지 오류 2건: ['host reqfailed POST zzoom/m97qnw3vdur3n/heartbeat net::ERR_ABORTED', 'host reqfailed POST zzoom/m97qnw3vdur3n/heartbeat net::ERR_ABORTED']
획 저장·삭제 요청 12건(초,누가,메서드,상태,묶음크기): [(0.0, 'host', 'POST', 201, 1), (3.0, 'host', 'POST', 201, 1), (15.9, 'host', 'POST', 201, 1), (17.7, 'host', 'POST', 201, 1), (18.9, 'host', 'DELETE', 200, None), (47.0, 'host', 'POST', 201, 1), (48.5, 'part', 'POST', 201, 1), (50.9, 'host', 'POST', 201, 1), (52.6, 'host', 'POST', 201, 2), (54.7, 'host', 'POST', 201, 3), (56.5, 'host', 'POST', 201, 3), (58.1, 'host', 'POST', 201, 1)]
정리: 회의 mnxfpm0buz7wl 삭제 -> 200
정리: 회의 mp44nk3budg6n 삭제 -> 200
정리: 회의 m97qnw3vdur3n 삭제 -> 200

## 요약 (2026-11-26)
1. [치명] 실제 입력(page.mouse, CDP 터치)은 판서 캔버스 #zz-layer-temp 에 한 번도 안 닿는다. 1280/820/390 모두 temp 가 받은 포인터 이벤트 0개, 잉크 0. 원인: zzoom.css:107 `#zz-stage-overlay > *{pointer-events:auto}` (id 선택자)가 viewer.css:9 `.zv-overlay{pointer-events:none}` 을 이겨 전면 덮개가 캔버스 위에서 입력을 가로챔(elementFromPoint 맨 위=DIV.zv-overlay, computed pointer-events=auto). 합성 PointerEvent 를 캔버스에 직접 보내면 정상.
2. 합성 입력 기준 나머지는 정상: 경로 일치율 1.00(1280/820/390, 줌 뒤 포함), 둘째 기기 반영 1.4~1.7s, 새로고침 뒤 유지, 참여자 펜 가능(1.4s), 빠른 10획 10/10 저장(POST 5번 전부 201), >=400 응답 0, 토스트 0.
3. 터치 폭(820/390)에서 발표자 본인 무대에 「아직 자료가 없는 안건이에요」 안내가 새로고침 전까지 남음(참여자 화면은 정상). 원인 미확정.
4. 지우개: DELETE 200 확인, 단 밴드 겹침 때문에 사라짐 판정은 불확실. 크기 변경 후 정렬은 실제 마우스가 막혀 측정 못 함(캔버스 배율은 1.00으로 일치).
5. 펜 단추: 보임, 「펜으로 쓰기」 라벨, 139x44(390 폭 131x48), 켜면 형광펜/펜/지우개+색 3개. 발견성은 양호.
