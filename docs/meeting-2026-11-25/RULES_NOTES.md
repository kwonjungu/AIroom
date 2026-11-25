# 쭘 보안 규칙 노트 (엔진팀 R)

## 1. 규칙 내용
- `firestore.rules` 맨 아래 `zzoom_meetings/{mid}` 블록을 추가했다. 기존 규칙은 바꾸지 않았다(diff는 추가 28줄뿐).
- 조건 `zzOk()`: 로그인 + claim `zz==1` + `mid` 가 문서 경로와 같음 + `until`(숫자, ms) > 지금.
  claim 이 없으면 `get('키', 기본값)` 으로 기본값을 비교해 거절된다(오류로 죽지 않음).
- 회의 문서: `get` 만 허용. 회의 컬렉션 `list`, 모든 `create/update/delete` 는 거절.
- 하위 컬렉션(`agenda pages strokes hands chat polls transcript`): `zzOk()` 이면 `get`·`list` 허용(`allow read`). 쿼리는 `.../{sub}` 경로 아래에서 실행되므로 이 규칙이 쿼리 전체를 덮는다(`where`·`orderBy` 가능). `people` 은 `host` 만. 목록에 없는 하위 컬렉션 이름은 거절. 모든 클라이언트 쓰기 거절(서버 Admin SDK 는 규칙을 우회).
- 컬렉션 그룹 쿼리(`collectionGroup('strokes')`)는 규칙이 `/{path=**}/strokes/{id}` 를 따로 열어 주지 않으므로 거절된다(의도).
- `storage.rules`(새 파일): `zzoom/{mid}/**` 읽기는 같은 `zzOk`, 쓰기 거절. 업로드 경로 `zzoom/{mid}/up/{uploadId}/{file}` 는 host 의 `create` 만, 50MB 미만, contentType `image/webp|image/png|image/jpeg|application/pdf|application/octet-stream|application/vnd.*|application/haansoft.*`. 덮어쓰기·삭제 불가. `zzoom-vendor/**` 는 읽기·쓰기 모두 거절(서버만).
- 주의: Storage `matches` 는 전체 일치다. DESIGN B-3 의 `application/vnd.*` 를 `application/vnd\..*` 로 바꿨다(점 이스케이프).
- 주의: DB 이름 `kwon` 은 규칙 파일이 아니라 콘솔 주소와 클라이언트 `getFirestore(app,'kwon')` 에서 정한다. 규칙은 DB 마다 따로 게시한다.

## 2. 기존 넓은 규칙이 zzoom 에 닿는가
- 현재 `firestore.rules` 에는 `match /{document=**}` 같은 와일드카드가 **없다**. 기존 match 는 `bap_users bap_config bap_menus bap2_menus bap3_menus bap_journals bap2_journals bap3_journals codocs_members codocs_sheets(+rows, presence)` 로 컬렉션 이름이 고정이라 `zzoom_meetings` 에 닿지 않는다. 그 밖의 경로는 기본 거절.
- 단, 이것은 저장소의 `firestore.rules` 기준이다. **운영 콘솔 규칙이 이 파일과 같은지는 확인하지 못했다.** 0단계에서 받은 전체본으로 다시 확인할 것(넓은 `allow read, write: if true` 가 있으면 zzoom 도 열린다).
- Storage 는 저장소에 규칙 파일이 없어 운영 규칙을 모른다. 넓은 `match /{allPaths=**}` 가 있는지 0단계 전체본에서 확인해야 한다.
- codocs 도움말 `showRulesHelp()` 는 public 레포의 `firestore.rules` raw 를 읽는다. 이제 이 파일에 쭘 블록이 들어 있어 도움말로 옛 전체본을 다시 게시해도 쭘 규칙은 유지된다(`feat/meeting` 이 main 에 합쳐진 뒤).

## 3. 0단계 사용자 작업
1. **백업**: 콘솔에서 지금 운영 규칙 전체를 복사해 `docs/meeting-2026-11-25/rules-backup/firestore-kwon-2026-11-25.rules`, `storage-2026-11-25.rules` 로 저장(날짜는 게시 당일).
   - Firestore(kwon): `https://console.firebase.google.com/project/airoom-ebce3/firestore/databases/kwon/security/rules`
   - Storage: `https://console.firebase.google.com/project/airoom-ebce3/storage/rules` (버킷 화면의 「규칙」 탭)
2. 복사한 전체본을 Claude 에게 준다. Claude 가 기존 규칙 + 쭘 블록을 합쳐 `firestore.rules`·`storage.rules` 전체본을 만든다(`storage.rules` 는 지금은 쭘 부분만 있다. 그대로 게시하면 기존 Storage 경로가 막히니 **합치기 전에는 게시 금지**).
3. 에뮬레이터 시험이 통과한 뒤에 사용자가 콘솔에서 게시한다.
4. **Storage CORS**(`getBlob()` 에 필요). 버킷 이름은 콘솔 Storage 화면 맨 위 `gs://...` 에서 확인(`BUCKET`). `cors.json`:
```json
[{"origin":["https://a-iroom.vercel.app","https://a-iroom-git-feat-meeting-<계정>.vercel.app"],"method":["GET"],"maxAgeSeconds":3600}]
```
   Preview 도메인은 배포마다 다르니 실제 Preview 주소(또는 `https://*.vercel.app` 은 와일드카드가 안 되므로 주소를 하나씩)를 넣는다. 명령:
```
gcloud storage buckets update gs://BUCKET --cors-file=cors.json
# 또는
gsutil cors set cors.json gs://BUCKET
gsutil cors get gs://BUCKET
```
   GET 만 허용한다(업로드는 서버가 서명·업로드 허가를 따로 처리).
5. **Java 설치 뒤 시험**(Java 11+ 필요, 이 PC 에는 없음). 저장소에서:
```
npm i -D @firebase/rules-unit-testing firebase
firebase emulators:exec --config docs/meeting-2026-11-25/firebase.emulator.json --only firestore,storage --project demo-zzoom "node --test tests/zzoom/rules.test.js"
```
   에뮬레이터 없이 `node --test tests/zzoom/rules.test.js` 만 돌리면 54건이 모두 skip 으로 끝난다.
- 에뮬레이터는 DB 이름 `kwon` 대신 기본 DB 로 시험한다(규칙 내용은 같다).
