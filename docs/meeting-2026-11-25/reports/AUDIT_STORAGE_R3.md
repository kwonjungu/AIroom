**PASS** — 감사 영역 ③ 기존 앱 Storage 잠금 (R3). 치명 0, 중요 0. R2 사소 N1·N2 해결, N3 부분. S4~S7 R2 판정 그대로. 새 사소 4건(N4~N7).

감사 시점 2026-11-26. 대상: index.html·public/index.html 작업본(HEAD f5eb70b 대비 각 +17/-4줄, 창고 함수 3개만), STORAGE_LOCK.md, storage.rules(06:34, R2 감사 뒤 변경 없음). FIX_STORAGE_R2.md 는 믿지 않고 코드·재현으로만 봤다.

## 표 1 — R2 지적 재검증
| 번호 | 판정 | 근거 |
|---|---|---|
| N1 삭제가 출입증 실패로 멈춤 | 해결 | index.html:2327-2333(public 2453-2459) ensureStorageAuth 를 try 로 감싸 실패면 토스트 후 return, 예외를 던지지 않는다. 재현 F: 토큰 500 → 반환 undefined, delete 0회, 토스트 1건. 호출자 8곳(2374·2396·3198·3201·5179·6261·7298·7982)은 뒤의 기록 삭제를 이어 감. 시험 없음 → N7 |
| N2 시계 늦음 → 마지막 몇 분 거절 | 해결 | 2316-2321: put 이 `storage/unauthorized`·`storage/unauthenticated`(Firebase 10.14.1 compat 오류 코드, 1024줄) 이면 `ensureStorageAuth(true)`(2288 `!force&&` 로 claim 검사 건너뜀) 뒤 put 한 번만 더. 재현 A: 1회 거절 뒤 성공(put 2, 토큰 1, signOut 1·signIn 1). 무한 재시도 없음(재현 B·B2: 계속 거절이면 put 정확히 2회 후 원래 오류 throw). 다른 오류는 삼키지 않음(재현 C quota·C2 code 없음: put 1, 토큰 요청 0, 원래 오류 그대로). 재발급 실패면 출입증 오류로 바뀌어 throw(재현 D, put 1) — 업로드는 중단되니 문제 없음. 503 legacy 면 한 번 더 올리고 원래 거절 오류 throw(D2). 남은 빈틈 N4·N5 |
| N3 문서 | 부분(사소) | STORAGE_LOCK.md:12-16 에 until·재발급·재시도·실패 동작·storagePathFor·급식 출입증 추가됨. 그러나 :20 「업로드 거절 뒤 한 번만 다시 시도하는지 본다(tests/zzoom/spa-storage.test.js)」 — 그런 시험이 없다(N7). :21 은 여전히 `{ba:1}`·`{cp:1}`(until 없음) |
| S4 cp 최상위 객체 `copy` | 미해결(사소) | storage.rules 변경 없음. Rules API `S4 cp 최상위 객체 copy` 여전히 ALLOW(유일한 불일치) |
| S5 setPersistence 전 대입 | 미해결(사소) | index.html:2264 대입이 2266 setPersistence 보다 먼저. 그대로 |
| S6 카피본 cp 누구나 | 미해결(사소, 설계) | server.js:1606 그대로 |
| S7 로그아웃 signOut 없음 | 미해결(사소, 둬도 됨) | 변화 없음 |

**두 SPA diff**: `diff <(sed -n 2250,2340p index.html) <(sed -n 2376,2466p public/index.html)` → 차이 0줄. 시험 `두 SPA 의 창고 함수 원문이 같다` 통과. 재현 A~G 도 두 파일 결과가 같다.

## 표 2 — 새 지적
| 번호 | 심각도 | 파일:줄 | 문제 | 실패 시나리오 | 고칠 방향 |
|---|---|---|---|---|---|
| N4 | 사소 | index.html:2285(public 2411) | `force` 는 새 약속을 만들 때만 본다. 비강제 호출이 진행 중이면 `ensureStorageAuth(true)` 가 그 약속에 합류해 재발급 없이 'ok' 를 받는다 | 재현 E: `a=ensureStorageAuth(); b=ensureStorageAuth(true)` → `a===b`, 토큰 요청 0. 시계 늦은 PC 에서 첨부 여러 개를 연달아 올리거나 삭제와 겹치면 재시도도 옛 출입증으로 가서 거절 → 업로드 실패 안내(무한 반복은 아님) | force 이고 진행 중 약속이 비강제면 그 뒤에 이어 강제 발급(`storageAuthPromise.then(()=>ensureStorageAuth(true))`) 또는 force 전용 약속 따로 |
| N5 | 사소 | index.html:2334(public 2460) | N2 재시도는 업로드만. 삭제는 `delete()` 거절을 catch 로 조용히 삼킨다 | 재현 G: delete 가 storage/unauthorized → 반환 정상, 토스트 0. 시계 늦은 PC 의 마지막 몇 분에 지운 항목은 파일만 창고에 남고 아무 안내 없음 | 업로드와 같이 unauthorized 면 force 재발급 뒤 1회 재시도 |
| N6 | 사소 | index.html:2331 + 호출자 2374·3201·7982 | ① 토스트 「기록만 삭제합니다」가 교체 맥락(배너 바꾸기 2374, 일정 파일 바꾸기 3201)에도 뜬다. 이때 뒤따르는 업로드도 같은 이유로 실패해 안내가 두 번. ② 모아받기 삭제 7982 는 제출 파일 수만큼 토큰 요청·토스트 | 재현 F2: 3건 연속 삭제·토큰 500 → 토큰 요청 3, 같은 토스트 3. 제출 40건이면 rateLimit(30/분, server.js:1606) 에 걸리고 토스트 40개 | 문구를 「첨부 파일은 지우지 못했습니다」로 줄이고, 일괄 삭제는 출입증을 한 번 받고 실패면 한 번만 안내 |
| N7 | 사소 | tests/zzoom/spa-storage.test.js:53 | N1·N2 를 지키는 시험이 없다. 가짜 put 은 `new Error('storage/unauthorized')`(`.code` 없음)라 재시도 경로를 타지 않고, 삭제 실패 시험도 없다. STORAGE_LOCK.md:20 은 시험이 있다고 적음 | 누가 재시도 조건이나 삭제 try 를 지워도 시험 20건이 그대로 통과 | 위 재현 A·B·C·F 를 시험으로 옮기기(가짜 오류에 `.code` 넣기) |

## 실행한 명령과 결과
- `npm test` → vibe unit **313/313**, vibe contracts **11/11**(실패 0).
- `node --test tests/zzoom/spa-storage.test.js tests/zzoom/units.test.js` → **20/20 통과**.
- 재현 `node repro.js <저장소>`(스크래치패드 audit_storage_r3/repro.js, 시험 파일의 extract 로 두 SPA 함수 원문을 vm 에서 가짜 firebase·fetch 로 실행) → 두 파일 모두 A~G 결과 같음:
  A 성공(put 2·토큰 1) / B·B2 put 2 후 원래 오류 / C·C2 put 1·토큰 0 원래 오류 / D 출입증 오류(put 1) / D2 put 2 후 거절 오류 / E 합류·토큰 0 / F 토스트 1·삭제 0 / F2 토큰 3·토스트 3 / G 조용히 반환.
- `node rt_storage_r2.js $(npm root -g)/firebase-tools storage.rules`(Rules 시험 API, 게시 아님) → **371/372 통과**, 실패 1 = S4.

## Rules 시험 API 표(R2 와 같은 372건, 결과 같음)
| 출입증 | 실서비스 7폴더 get·create·delete | copy/ 아래 | 루트 파일 create | 목록 banner | 쭘 읽기·업로드·vendor |
|---|---|---|---|---|---|
| 비로그인 | 거절 | 거절 | 거절 | 거절 | 거절 |
| ba `{ba:1,until:+1h}` | 허용 | 허용 | 허용 | 허용 | 거절 |
| ba 만료 `until:now-1` | 거절 | 거절 | 거절 | 거절 | — |
| cp `{cp:1,until:+1h}` | 거절 | 허용 | 거절 | 거절 | 거절 |
| zz host `{zz,mid,role,until}` | 거절 | 거절 | 거절 | 거절 | — |
| zz+up(viewer) | 거절 | 거절 | 거절 | 거절 | — |
| bp(m)·bp(b) | 거절 | 거절 | 거절 | 거절 | 거절 |

경계: until=now 거절·now+1 허용, 10MB 거절·10MB-1 허용, ba+up(zz 없음) 쭘 업로드 거절, zz+up 의 copy/ 아래 업로드 거절. 불일치 1건 = S4.
