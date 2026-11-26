# R13 고친 것 (2026-11-26) — R13 은 두 파트 모두 PASS(치명·높음 0), 보통·낮음을 고침

- V1 M1: 같은 사람이 새로 발표(epoch 바뀜)하면 viewer 의 P.lost 를 풀고, 보내던 중의 옛 epoch /live 가 not_presenter 로 와도 발표자 자격을 잃지 않는다(viewer.js meeting 처리, flushLive sentEp).
- V1 L2: 내 발표 epoch 가 바뀌면 밀린 /live 를 버린다(dropLive).
- V1 L1 / V2 M2: live.aid 가 없을 때(0번)에서 자료로 보내는 /live 는 force — 패널이 닫히고 모두 따라감.
- V1 L3: 올리기 재시도에서 storage/unauthorized(덮어쓰기 금지)는 앞 시도가 저장된 것으로 보고 넘어감. 마무리(commit)가 파일을 다시 확인.
- V2 M1: 발표자도 live 를 받으면 띠를 다시 그림(0번 → 자료 띠 바뀜).
- V2 L1: 0번 발표 중 「다음 ›」은 깔린 자료의 지금 쪽(1쪽)부터.
- 그대로 둔 것: V1 L4(시험 추가, 감사 시험 파일에 개인 경로가 있어 그대로 옮기지 않음), V2 L2(왼쪽 쪽 목록은 쪽 넘기기로 봄, 결정대로).
