**FAIL** — 감사 영역 ③ 기존 앱 Storage 잠금 (R1). — 중요 2건(S1·S2), 사소 5건. 규칙 자체와 서버 토큰 발급에는 이상이 없다.

감사 시점 2026-11-25 22:13. 대상 파일 수정 시각: index.html 22:04:05, public/index.html 22:04:06, lib/storage-token.js 22:04:02, storage.rules 22:05:16. 이 뒤에 고친 내용은 반영 안 됨.

범위: lib/storage-token.js, server.js /api/firebase-token, 두 SPA ensureStorageAuth·uploadToFirebase·deleteFromFirebase·initFirebase, storage.rules 기존 앱 블록(1~35줄), STORAGE_LOCK.md.

## 표 2 — 지적
| 번호 | 심각도 | 파일:줄 | 문제 | 실패 시나리오 | 고칠 방향 |
|---|---|---|---|---|---|
| S1 | 중요 | index.html:2276, public/index.html:2402 (ensureStorageAuth) · lib/storage-token.js:31-32 | `currentUser` 가 있으면 바로 true. until(발급+1시간)을 보지 않아 1시간 뒤 새 출입증을 받지 않는다. 맞춤 토큰 claim 은 ID 토큰 자동 갱신 뒤에도 그대로 남으므로(옛 until) 규칙이 계속 거절. storage-token.js:32 주석·STORAGE_LOCK 의 "화면은 until 이 지나면 새 출입증을 받는다"는 코드에 없음 | 아침에 백암이를 열어 둔 교사가 1시간 뒤 연수 이수증 PDF·배너·첨부 올리기 → storage/unauthorized, 새로 고침 전까지 모든 올리기·지우기 실패 | `getIdTokenResult()` 의 claims.until 이 지금+1분 이하면 `signOut()` 뒤 새 토큰 받기(업로드 실패 403 시 1회 재시도도) |
| S2 | 중요 | public/index.html:2415-2421·5696-5701, index.html:2289-2295·5787-5792 | ① ensureStorageAuth 가 실패해도(false) uploadToFirebase 는 그대로 put 한다(2417 결과를 안 봄). ② 연수 챙김이 ttSubmitUpload 는 업로드 예외를 console.warn 으로 삼키고 filePath='' 로 기록을 확정한다 | S1 상태(1시간 뒤)나 토큰 500에서 이수증 올리기 → 규칙 거절 → 화면엔 "저장됨", 이수증 원본 PDF 는 창고에 없음(조용한 원본 유실). 저장소 시험 `지적13 … 업로드하지 않고 오류`, `… 연수 기록을 확정하지 않는다` 가 실제로 실패 | 토큰 실패 시(503 미설정 제외) 업로드 전에 오류, tt 는 업로드 실패면 기록 저장 중단하고 오류 안내 |
| S3 | 사소 | 두 SPA uploadToFirebase(2420/2294) 와 호출자 7곳 | 카피본은 함수 안에서만 `copy/` 를 붙이고 호출자는 붙이기 전 경로(`banner/…` 등)를 filePath 로 저장한다. deleteFromFirebase 는 `copy/` 로 시작 안 하면 바로 return | /copy 에서 배너 바꾸기·첨부 지우기 → 창고 파일이 영영 안 지워져 copy/ 아래 쌓임(격리는 지켜짐). 시험 `지적16 … storagePathFor` 실패 | 경로 만드는 함수(storagePathFor)로 호출자가 실제 경로를 저장 |
| S4 | 사소 | storage.rules:31-35 | `{rest=**}` 가 0칸도 맞아 최상위 객체 이름이 정확히 `copy` 이면 cp 로 올릴 수 있다(Rules API 로 ALLOW 확인). ba 는 최상위 `zzoom` 이름 객체도 만들 수 있음(폴더가 아니라 무해) | cp 출입증으로 `/copy` 객체 create → 허용(실서비스 데이터 접근은 아님) | `match /{top}/{rest=**}` 에 `rest.size() > 0` 또는 copy 블록을 `/copy/{a}/{rest=**}` 로 |
| S5 | 사소 | 두 SPA initFirebase(2389-2393/2263-2267) | firebaseStorage 를 setPersistence(NONE) 완료 전에 채운다. 그 사이 업로드가 불리면 기본 LOCAL 로 로그인돼 IndexedDB(실서비스·카피본 공유 도메인)에 출입증이 남을 수 있다. 사람 클릭으로는 거의 불가능한 창 | 실서비스 탭에서 LOCAL 로 남은 ba 사용자가 /copy 탭에 복원 → 카피본 탭이 ba 로 동작(같은 사람 브라우저라 권한 상승은 아님) | setPersistence 를 기다린 뒤 firebaseStorage 대입. 카피본 탭에서 claim 종류(cp/ba) 확인 |
| S6 | 사소 | server.js:1606-1607 + 카피본 COPY_SESSION(457) | 카피본은 로그인이 없어 누구나 `/api/copy/firebase-token` 으로 cp 출입증을 받는다 → 외부인이 copy/ 아래 10MB 파일을 수에 제한 없이 올리고, 목록·읽기·지우기 가능. 예전(전체 공개)보다는 좁아져 회귀는 아님 | 외부인이 copy/ 에 파일 대량 업로드 → 저장 비용·남의 파일 배포 통로 | 설계 결정으로 남기되 copy/ 크기·형식(이미지·pdf) 제한, 주기 정리 고려 |
| S7 | 사소 | 두 SPA logout(2625/2525), server /api/auth/logout | 로그아웃이 Firebase signOut 없이 reload 로만 끊는다. Persistence NONE 이라 reload 로 지워지므로 실질 문제는 없고, 서버 세션 삭제 뒤에도 발급된 출입증은 until(≤1시간)까지 유효 | 출입증 탈취 시 최대 1시간 사용 | 그대로 둬도 됨(until 이 상한) |
| 확인 필요 | — | GitHub Pages 미러 | 코드상 미러에서 `/api/firebase-token` 은 index.html:2394-2396 래퍼로 `https://a-iroom.vercel.app/api/firebase-token` 으로 가고, server.js:202-211 CORS 가 Origin `https://kwonjungu.github.io`·헤더 X-Auth-Token·OPTIONS 204 를 허용해 통과한다. 다만 signInWithCustomToken 은 identitytoolkit 을 apiKey 로 부르므로, 브라우저 키에 HTTP 리퍼러 제한이 있고 github.io 가 빠져 있으면 미러 업로드만 막힌다(콘솔 확인 필요, 실서비스 요청 금지라 직접 못 봄) | | |

## 확인된 것(이상 없음)
- **두 SPA 동일**: initFirebase~deleteFromFirebase(index.html 2250-2305 ↔ public/index.html 2376-2431) diff 0줄. firebase-auth-compat 10.14.1 두 곳(1025/1030).
- **서버 토큰**(가짜 RSA 키로 makeHandler 직접 호출): user→uid baekam-user `{ba:1,until:지금+60분}`, admin→baekam-admin `{ba:1}`, 세션 10분 남음→until 10분, 카피본→baekam-copy `{cp:1}`, 서명 검증 통과, exp-iat 3600, Cache-Control no-store, 키 없음 503. bap 출입증(bp/br)에는 ba/cp 없음(storage-token.js:50).
- **/copy 격리**: 카피본 요청은 server.js:230 nsStore 로 isCopyNs() → cp 만. 실서비스 요청이 cp 를 받거나 카피본이 ba 를 받는 경로 없음. 규칙에서 cp 는 copy/ 아래만(S4 최상위 이름 `copy` 한 개 예외).
- **로그아웃**: reload + Persistence NONE 로 메모리 출입증 사라짐. 세션 만료는 until=min(세션 만료, 1시간) 로 규칙이 막음.
- **업로드 폴더 7곳**: banner, schedules, sections, training-tracker, certs, news, collections — 모두 ba 올리기·받기·지우기 허용, 비로그인·cp(실서비스 경로) 거절, cp 의 copy/ 아래 올리기·지우기 허용, 만료 ba 거절.

## 실행한 명령과 결과
- Rules 시험 API(게시 아님): `node rt_storage_r1.js $(npm root -g)/firebase-tools storage.rules` (스크립트: 스크래치패드 audit_storage/rt_storage_r1.js) → **103/104 통과**. 7폴더×11경우(77) + 경계 27건(until 없음·문자열·=now 거절, 10MB 정확히 거절·10MB-1 허용, 목록, Copy/copyx 거절, zzoom·zzoom-vendor 거절, 쭘·급식 토큰 거절 등). 유일한 불일치는 S4(`copy` 최상위 객체 cp create 허용).
- 서버 토큰 재현: `node tok.js lib/storage-token.js` → 위 "서버 토큰" 결과.
- `node --test tests/zzoom/spa-storage.test.js tests/zzoom/units.test.js` → **19개 중 10 통과, 9 실패**. 실패: 지적13(업로드 중단·이수증 기록 확정) ×2 SPA, 지적12(until 지난 출입증 재발급) ×2, 지적16(storagePathFor 없음) ×2, 두 SPA 창고 함수 원문 같음(storageClaimsOk 없음). 시험은 고친 동작을 기대하는데 코드에는 아직 없다 → S1·S2·S3 의 근거.
- `diff <(sed -n 2250,2305p index.html) <(sed -n 2376,2431p public/index.html)` → 차이 없음.
- npm test 전체·test:zzoom 전체는 범위 밖이라 돌리지 않음.
