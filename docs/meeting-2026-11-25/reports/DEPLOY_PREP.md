# 운영 배포 준비 (2026-11-26) — 준비만 했고 게시·커밋·푸시·배포는 하지 않았다

## 1) 규칙
- 백업(읽기만): rules-backup/2026-11-26_firestore_kwon_live.rules, 2026-11-26_storage_live.rules. 11-25 백업과 글자 하나 다르지 않다(운영 변동 없음). Firestore 마지막 게시 2026-09-07, Storage 2026-03-13.
- 게시본(publish/): firestore.publish.rules, firestore.publish+lock.rules, storage.publish.rules. 덤으로 storage.publish+lock.rules(저장소 storage.rules 그대로)와 firebase 설정 3개.
- 운영 대비 diff: firestore.publish.rules = 29줄 추가, 삭제 0(쭘 블록 zzoom_meetings 뿐). firestore.publish+lock.rules = +110/-104(「담당자 계정」~쭘 앞을 lock 제안으로 교체). storage.publish.rules = 55줄 추가, 삭제 0.
- 문법(Rules 시험 API, 게시 아님): 세 게시본 모두 오류 0. 경고 2건(zzHost 안 쓰는 함수, 변수 이름 request)은 저장소 storage.rules 에도 같다. Firestore 쭘 7건 PASS, lock 포함 11건 PASS. 저장소 storage.rules 와 storage.publish+lock.rules 는 쭘 시험 PASS.
- 중요: storage.publish.rules 는 운영의 `allPaths allow read, write: if true` 가 남아 있어 쭘 파일이 누구에게나 열린다(OR 규칙). 시험에서 다른 회의 읽기·비로그인 읽기·쓰기가 FAIL(허용됨). 쭘 파일 보호는 잠금본(storage.publish+lock.rules)을 STORAGE_LOCK.md 순서(키 확인→코드 배포→게시)대로 게시해야 한다.

## 2) 게시 명령 초안
publish/README.md (백업→시험→게시→확인→되돌리기. firebase.publish.json·publish-lock.json·rollback.json 사용, 실행하지 않음).

## 3) Vercel
- 프로젝트 a-iroom(Express, Node 24.x, 리전 iad1, Fluid 켜짐). vercel.json 에 functions/maxDuration 설정이 없다.
- 프로젝트 기본 함수 제한 시간(defaultResourceConfig.functionDefaultTimeout) = 300초. 따라서 maxDuration 은 300초.
- 쭘 purge 예산 50초(lib/zzoom/routes.js purgeBudgetMs=50000, 삭제 요청 때 20초)는 300초 안에 든다.
- vercel.json crons 에 `/api/zzoom/maintenance/purge` (0 18 * * *, UTC) 가 이미 있고, 현재 운영 배포의 cron 목록에도 이 경로가 들어 있다. CRON_SECRET 은 production 에 있다(이름만 확인, 값 안 봄). FIREBASE_SERVICE_ACCOUNT 는 production·preview 에 있다.
- 주의: 프로젝트 production 브랜치가 `claude/school-admin-portal-APgza` 로 돼 있다. feat/meeting 을 배포하려면 production 브랜치(또는 배포 방식)를 확인할 것. 로컬 폴더는 vercel 에 링크돼 있지 않다(.vercel 없음).

## 2차 준비 (2026-11-26, 게시 1안) — 규칙 파일만 다시 만들었고 게시·커밋·푸시는 하지 않았다
- 백업(읽기만): rules-backup/2026-11-26_pre-publish_firestore_kwon_live.rules, ..._storage_live.rules. 아침 백업과 글자 하나 안 다르다(운영 변동 없음, Firestore 게시 2026-09-07, Storage 2026-03-13).
- publish/firestore.publish.rules: 운영 + 저장소 firestore.rules 의 쭘 블록 29줄(삭제·변경 0). codocs·bap 잠금 없음. 옛 파일은 firestore.publish.rules.old.
- publish/storage.publish+lock.rules: 저장소 storage.rules 그대로. 옛 파일과 다른 곳은 주석 1줄(참석자 업로드 설명)뿐. 옛 파일은 .old.
- 새 설정 publish/firebase.publish2.json(두 파일만, DB kwon). 게시·되돌리기 명령은 publish/README.md 맨 위.
- Rules 시험 API(게시 아님): 두 파일 문법 오류 0(경고 2건 zzHost 안 쓰는 함수·변수 이름 request, 저장소 원본과 같음). Firestore 쭘 10/10, Storage 21/21 통과(비로그인 읽기·목록·쓰기·삭제 거절, ba 허용·until 없으면 거절, cp 는 copy/ 만, zz 같은 회의 읽기만·목록·직접 쓰기 거절·업로드 출입증만 create).
- codocs·bap·그 밖 13개 경로 x 3종 출입증 x 5가지 동작 = 195건을 운영 규칙과 게시본에 같이 넣어 비교: 결과가 다른 것 0건.
- 주의: Storage 잠금본은 코드 배포 전에 게시하면 백암이 업로드가 멈춘다. 코드 배포 뒤에 게시한다.
