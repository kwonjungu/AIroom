**PASS** — 감사 영역 ③ 기존 앱 Storage 잠금 (R2). 치명 0, 중요 0. R1 중요 S1·S2 해결, S3 해결. 사소 미해결 4건(S4·S5·S6·S7, 모두 R1 판정 그대로) + 새 사소 3건.

감사 시점 2026-11-26. 대상 파일: index.html·public/index.html(커밋 f5eb70b, 작업본 차이 없음), lib/storage-token.js(작업본 수정, bap 확장), server.js(작업본 수정, `/api/bap/firebase-token` 추가), storage.rules(06:34 수정, 쭘 블록만), STORAGE_LOCK.md.

## 표 1 — R1 지적 재검증
| 번호 | 판정 | 근거 |
|---|---|---|
| S1 until 미확인 | 해결 | index.html:2275-2279 `storageClaimsOk` 가 종류(카피본 cp / 실서비스 ba)와 `until-Date.now()>60000` 을 본다. 2286-2291 `currentUser` 가 있어도 `getIdTokenResult().claims` 가 맞지 않으면 2292 새 토큰을 받고 2298 signOut 뒤 2299 다시 로그인. 서버 claim 은 storage-token.js:33-39(until=min(세션 만료, 지금+1시간)). 시험 `지적12 …이미 로그인돼 있어도 출입증 기한(until)이 지났거나 종류가 다르면 다시 받는다` ×2 통과(R1 에서 실패했던 시험). R1 이 권한 "403 시 1회 재시도"는 없음 → 새 지적 N2(시계 차이) 참고 |
| S2 출입증 없이 업로드 | 해결 | ① ensureStorageAuth 가 토큰 실패(503 unconfigured 제외)면 2295 에서 throw, uploadToFirebase 2312 의 `await` 가 그대로 전파해 put 하지 않는다. ② 연수 챙김이 5813-5819: 업로드 예외면 토스트 띄우고 `return`, 기록 확정(ttPatch 5823) 안 함. 시험 `지적13 …업로드하지 않고 오류`, `…503 이면 예전처럼 올린다`, `…연수 기록을 확정하지 않는다` ×2 통과 |
| S3 카피본 copy/ 경로 저장 | 해결 | 2306-2309 `storagePathFor`(이미 copy/ 면 다시 안 붙임, 멱등). 경로를 저장하는 호출자 7곳 모두 이 값을 저장: 2358 배너, 3113·3189 일정, 5101 항목, 5810 연수, 6223 이수증, 7838 모아받기. news(6357)는 경로를 저장하지 않고 URL 만 써서 해당 없음. 시험 `지적16` ×2 통과. 고치기 전에 카피본에 저장된 옛 기록(copy/ 없는 경로)은 여전히 안 지워짐(격리는 지켜짐, 사소) |
| S4 최상위 `copy` 객체 | 미해결(사소) | storage.rules:31-35 그대로. Rules API `S4 cp 최상위 객체 copy` create 가 ALLOW(유일한 불일치) |
| S5 setPersistence 전 firebaseStorage 대입 | 미해결(사소) | index.html:2264(대입)가 2266(setPersistence await)보다 먼저. 사람 클릭으로 닿기 어려운 창. 「확인 필요」: compat auth 가 setPersistence 와 signIn 을 내부 큐로 순서대로 처리하면 실제 문제 없음 |
| S6 카피본 cp 누구나 발급 | 미해결(사소, 설계) | server.js:1606-1607 그대로. copy/ 크기만 10MB 상한(storage.rules:34) |
| S7 로그아웃 signOut 없음 | 미해결(사소, 그대로 둬도 됨) | Persistence NONE + until 상한 |
| 미러 리퍼러 | 확인 필요(변화 없음) | 콘솔 API 키 리퍼러 제한은 실서비스 조회 금지라 못 봄 |

**두 SPA diff**: `diff <(sed -n 2250,2330p index.html) <(sed -n 2376,2456p public/index.html)` → 차이 0줄(initFirebase~deleteFromFirebase). 호출자 7곳의 storagePathFor 사용도 두 파일 같음(줄 번호만 다름). 시험 `두 SPA 의 창고 함수 원문이 같다` 통과.

## 표 2 — 새 지적
| 번호 | 심각도 | 파일:줄 | 문제 | 실패 시나리오 | 고칠 방향 |
|---|---|---|---|---|---|
| N1 | 사소 | index.html:2320(public 2446) + 호출자 2383·3185·3188·5166·6248·7285·7969 | ensureStorageAuth 가 이제 throw 하는데 deleteFromFirebase 는 try 밖에서 `await` 한다. 확인 모달 동작(5165·7284 `_pendingConfirmAction`, 6872 에서 await·catch 없이 호출)은 예외가 나면 그 자리에서 멈춘다 | 토큰 발급 500(서명 실패)이나 순간 네트워크 오류 때 파일 달린 항목 지우기 → 아무 안내 없이 모달이 그대로, 항목도 안 지워짐(unhandled rejection). 세션 만료(401)면 어차피 API 도 실패하므로 실제 빈도는 낮음 | deleteFromFirebase 안에서 ensureStorageAuth 도 try 로 감싸 파일 지우기 실패는 넘기고 기록 지우기는 진행(파일 잔여는 감수) |
| N2 | 사소 | index.html:2278(public 2404) | until(서버 시각 ms)을 브라우저 `Date.now()` 와 비교한다. 브라우저 시계가 1분 넘게 늦으면 화면은 아직 유효하다고 보는데 규칙(storage.rules:18, 서버 request.time)은 이미 거절. 실패 시 재발급 후 1회 재시도도 없음 | 시계가 5분 늦은 교실 PC → 매 출입증의 마지막 약 4분 동안 올리기·지우기가 storage/unauthorized(새로 고침 없이도 몇 분 뒤 저절로 풀림) | claim 의 `iat`(서버 시각)과 `until` 차이로 남은 시간을 계산하거나, put 이 unauthorized 면 출입증 새로 받아 1회 재시도 |
| N3 | 사소 | STORAGE_LOCK.md:13-14·18-22 | 문서가 R1 이후 동작과 안 맞음: claim 이 `{ba:1}`·`{cp:1}` 로만 적혀 until 이 없고, 화면 재발급·업로드 실패 시 중단(지적12·13)·storagePathFor(지적16)·급식 출입증(같은 서비스 계정 키를 씀)이 빠짐. 시험 건수 15건도 옛 숫자 | 게시 담당자가 문서만 보고 확인하면 until 만료 시험을 빠뜨림 | 확인 절에 「1시간 뒤 다시 올리기」 항목과 until 추가 |

## 새로 본 것(이상 없음)
- **storage-token.js bap 확장**(43-68줄): `bapClaimsFor` 는 claim `{bp, br}` 만, ba/cp/zz 없음. 학교는 bap·bap2·bap3 집합만, 역할 boss→b·manager→m 외는 null → 403. `makeBapHandler` 는 server.js:1809 에서 `bapAuth` 뒤에만 붙음. 급식 화면은 public/bap/index.html:753 inMemoryPersistence 라 SPA 탭과 Firebase 로그인 상태가 섞이지 않음. Rules API 로 bp(m)·bp(b) 토큰은 7폴더·copy/·루트·쭘 전부 DENY.
- **storage.rules 쭘 블록 변경**(upToken 이 zzHost→zzOk+up 문자열 비어 있지 않음, create 에 `resource == null`): 모두 `/zzoom/{mid}/up/…` 안이라 기존 앱 블록(1-35줄, 커밋 69f5d39 와 바이트 동일)에 영향 없음. ba 에 up·mid claim 을 붙여도 zz 가 없어 쭘 업로드 DENY, zz+up 토큰은 copy/ 아래 업로드 DENY.
- **서버 /api/firebase-token**(server.js:1606-1607): rateLimit 30/분 + requireAuth, 카피본은 isCopyNs() 로 cp. 변경 없음. 시험 `지적12: 백암이 창고 출입증에는 until…` 통과.

## Rules 시험 API 결과 표(게시 아님, 372건 중 371 통과)
7폴더(banner·schedules·sections·training-tracker·certs·news·collections) × get·create·delete, 실서비스 경로와 copy/ 경로 각각.

| 출입증 | 실서비스 7폴더 | copy/ 아래 | 루트 파일 create | 목록 banner | 쭘 읽기·업로드·vendor |
|---|---|---|---|---|---|
| 비로그인 | 거절 | 거절 | 거절 | 거절 | 거절 |
| ba `{ba:1,until:+1h}` | 허용 | 허용 | 허용 | 허용 | 거절 |
| ba 만료 `until:now-1` | 거절 | 거절 | 거절 | 거절 | — |
| cp `{cp:1,until:+1h}` | 거절 | 허용 | 거절 | 거절 | 거절 |
| zz host `{zz,mid,role,until}` | 거절 | 거절 | 거절 | 거절 | — |
| zz+up(viewer, up:u1) | 거절 | 거절 | 거절 | 거절 | — |
| bp(m)·bp(b) 급식 | 거절 | 거절 | 거절 | 거절 | 거절 |

경계: until=now 거절, until=now+1 허용, 10MB 정확히 거절·10MB-1 허용, ba+up(zz 없음) 쭘 업로드 거절. 불일치 1건 = S4(cp 로 최상위 객체 `copy` create 허용).

## 실행한 명령과 결과
- `npm test` → vibe unit **313/313 통과**, vibe contracts **11/11 통과**(실패 0).
- `node --test tests/zzoom/spa-storage.test.js tests/zzoom/units.test.js` → **20/20 통과**(R1 때 19개 중 9 실패였던 지적12·13·16·두 SPA 원문 시험 모두 통과).
- `node rt_storage_r2.js $(npm root -g)/firebase-tools storage.rules`(스크래치패드 audit_storage/rt_storage_r2.js, 100건씩 나눠 Rules 시험 API 호출) → **371/372 통과**, 실패 1 = S4.
- `diff` 두 SPA 창고 함수 → 차이 0줄.
