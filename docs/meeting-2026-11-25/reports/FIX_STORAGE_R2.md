## R2 사소 수정

대상: AUDIT_STORAGE_R2.md 새 사소 지적 N1·N2·N3. 두 SPA(index.html, public/index.html)를 같게 고쳤다. 커밋·푸시·배포는 하지 않았다.

| 번호 | 고친 곳 | 내용 |
|---|---|---|
| N1 | deleteFromFirebase | 출입증 받기가 실패하면 예외를 던지지 않고 토스트 「저장소 연결이 불안정해 첨부 파일은 지우지 못했습니다. 기록만 삭제합니다.」를 띄운 뒤 돌아간다. 호출한 확인 창은 기록 삭제를 이어 가 정상으로 닫힌다. 파일은 남을 수 있다 |
| N2 | ensureStorageAuth(force), uploadToFirebase | 업로드가 storage/unauthorized 또는 storage/unauthenticated 로 실패하면 출입증을 강제로 새로 받아 한 번만 다시 올린다. 다른 오류는 그대로 던진다 |
| N3 | STORAGE_LOCK.md | claim 의 until, 만료 시각 계산, 화면 재발급, 재시도, 실패 때 동작, storagePathFor, 급식 출입증을 적었다 |

확인: 두 SPA 의 창고 함수 diff 차이 0줄, npm test 결과는 아래 최종 보고 참고.

## R3 사소 수정

대상: AUDIT_STORAGE_R3.md 사소 N4~N7 과 STORAGE_LOCK.md 20·21줄 문서 오류(N3 부분). 두 SPA(index.html, public/index.html)를 같게 고쳤고 창고 함수 구간 diff 차이 0줄, 두 파일의 변경분 diff 도 같다. 쭘·server.js 는 건드리지 않았다. 커밋·푸시 없음.

| 번호 | 고친 곳 | 내용 |
|---|---|---|
| N4 | ensureStorageAuth | 진행 중인 약속이 비강제인데 강제 요청이 오면 그 약속이 끝난 뒤 강제로 새로 받는다(storageAuthForce 로 구분). 강제끼리는 합류 |
| N5 | deleteFromFirebase | 삭제가 storage/unauthorized·unauthenticated 면 출입증을 강제로 새로 받아 1회만 다시 지운다. 그래도 실패하면 안내 토스트. 이미 없는 파일(object-not-found)은 조용히 넘어감 |
| N6 | deleteFromFirebase(path,opt) | 안내는 사용자가 기록을 지울 때만. 배너 교체(2374)·일정 파일 교체(3201)는 `{silent:true}`. 모아받기 삭제는 `{state}` 를 공유해 출입증 한 번, 안내 한 번(실패하면 나머지 건너뜀) |
| N7 | tests/zzoom/spa-storage.test.js | N1·N2·N4·N5·N6 시험 5건 × 두 SPA 추가(가짜 오류에 .code 넣기) |
| 문서 | STORAGE_LOCK.md | 20줄 시험 설명 바로잡음, 21줄 `{ba:1,until}`·`{cp:1,until}` |

수정 전 확인: 수정 전 함수로 되돌린 복사본에서 N4·N5·N6 시험 6건(두 SPA) 실패, N1·N2 는 R2 에서 이미 고쳐져 통과.
결과: spa-storage·units 시험 통과, npm test 는 vibe unit 313/313, vibe contracts 11/11(실패 0).
