# 감사 R9 S1 서버·보안·서울 이전 (2026-11-26)

범위: 커밋 cdc369f 기준 lib/zzoom/routes.js(같은 요청 표 미들웨어, 자료 바꾸기 뒷정리, 회의 지우기, 정리 cron), keys.js, purge.js, fb.js, gcp.js, firestore.zzoom.rules, vercel.json(regions)이 server.js 의 다른 기능에 주는 영향, R8 Q1 지적.
방법: 코드를 읽었다. 재현 스크립트는 <임시폴더>\r9\s1-repro.js 에 두고 tests/zzoom/fakes 로 돌렸다. 운영에는 읽기 전용 GET 만 보냈다(/api/zzoom/health, /api/health, 정리 경로의 인증 실패 응답). 저장소 파일은 고치지 않았다.
- `node --test tests/zzoom/api.test.js` 69건 통과.
- 운영 응답 머리 `X-Vercel-Id: icn1::icn1::…` 로 함수가 서울에서 도는 것을 확인했다. /api/zzoom/health 는 `{"ok":true,"firebase":true,"redis":true}` 를 돌려준다.

## R8 Q1 지적 확인

| 지적 | 판정 | 근거 |
|---|---|---|
| Q1-1 높음: 운영 Upstash 에서 저장해 둔 응답이 다시 나오지 않음 | **고쳐짐** | routes.js 131·135 가 `U.parseJson(await rawRedis.get(rk))` 로 읽는다. 처리 중 표시도 `{p:시각}` JSON 이라 객체로 읽혀도 `prev.p` 로 판정된다. 가짜 Redis get 도 이제 운영처럼 JSON 을 객체로 돌려준다(fake-redis.js 113). api.test.js 마지막 시험이 「다시 보내면 처음 응답 그대로」를 본다 |
| Q1-2 보통: 넘겨받기 12초가 화면 제한보다 짧고 원자 연산이 아님 | **고쳐짐** | 넘겨받는 시간이 보통 25초, DELETE 50초, 받아쓰기 70초다(routes.js 129). 화면 제한(api.js 63·128·451: 20·45·60초)보다 길다. 넘겨받기는 IDEM_TAKE Lua 비교 후 바꾸기다(routes.js 70·141). 비교 값 `JSON.stringify(prev)` 는 처음 적은 `JSON.stringify({p:now()})` 와 글자 그대로 같다(키 하나, 정수). 재현: 25초 넘은 표시에 같은 표 두 요청을 동시에 보냄 → 둘 다 201, 채팅은 1개만 생김(하나는 넘겨받고 다른 하나는 기억한 응답을 받음). 남은 틈: 앞 요청이 정말로 25초 넘게 돌면 여전히 두 번 처리된다. 이건 설계상 경계라 지적하지 않는다 |
| Q1-3 보통: 자료 바꾸기 뒷정리가 길고, 실패하면 옛 선이 하나도 안 지워짐 | **대부분 고쳐짐** | 쪽 읽기를 Promise.all 로 한꺼번에 하고(routes.js 803), epoch 트랜잭션이 실패하면 옛 방식(aid 로 찾아 500개 지우기)으로 넘어간다(809·819-821). 바로 지우는 예산도 8초에서 4초로 줄었다. 남은 것은 아래 S1-4(낮음) |
| Q1-4 낮음: 보내기마다 Redis 왕복 둘 | 덜 고쳐짐(낮음) | /live·/heartbeat 는 표 없이 보낸다(api.js 373·403). 판서 등 다른 보내기는 그대로이고, `.catch(()=>{}).then(()=>json(body))` 에 뒤쪽 catch 가 없는 것도 그대로다(routes.js 153-154). Redis 가 가까운 아시아에 있어 실제 비용은 작다 |
| Q1-5 낮음: 전체 지우기 상한을 같은 회의 반복으로 다 씀 | 안 고쳐짐(낮음) | routes.js 385-387 그대로. 낮음이라 덧붙이기만 한다 |
| Q1-6 낮음: scReserve 장부 조금 틀어짐 | 그대로 둠 | R8 에서도 「그대로 둬도 된다」고 했다 |
| Q1-7 낮음: 미들웨어가 로그인 앞에 있고 pt·맞춤 토큰을 2분 저장 | 안 고쳐짐(낮음) | routes.js 122-158 위치와 저장 내용이 그대로다. 위험은 R8 판단과 같다 |

## 찾은 문제

### S1-1 높음: 옛 DB 'kwon' 에 남은 회의는 영영 지워지지 않는다. 이미 정리 대기열에 있던 회의도 「다 지움」으로 처리되고 빠진다 (10일 삭제 약속 위반)
- 위치: lib/zzoom/fb.js 38, gcp.js 45(기본 DB 'zzoom'), purge.js 78(`fb.query(MEETINGS, expiresAt < 지금)`), purge.js 36-64(purgeMeeting), routes.js 313-320(cron 은 fb 하나만 넘김)
- 무엇이 틀렸나: 서버가 닿는 Firestore 는 이제 'zzoom' 하나뿐이다. 정리 cron 은 기한 지난 회의를 'zzoom' 에서만 찾으므로 kwon 의 회의는 대기열에 들어가지 않는다. 이전부터 대기열(zz:purge, Redis 공용)에 있던 kwon 회의는 purgeMeeting 이 'zzoom' 에서 하위 컬렉션을 훑는다. 비어 있으니 성공으로 보고 `hdel(K.purge, mid)` 를 한다. 그러면 kwon 의 회의 문서, 채팅, 받아쓰기, 사람, 투표, 판서가 그대로 남는다. Storage(같은 버킷)의 `zzoom/<mid>/` 쪽 그림과 원본도 대기열에 없던 회의는 남는다. fb.js 38 주석의 「옛 회의는 kwon 에 남아 10일 뒤 지워짐」은 코드에 그런 길이 없어서 사실이 아니다. DESIGN.md 16행의 「첫 열쇠 발급 + 10일 뒤 회의 기록 전부 삭제」와 화면의 「보관 기한(10일)」 안내와도 어긋난다. 이제 관리자가 회의 목록을 열어도 kwon 회의는 보이지 않으므로 손으로 지울 길도 없다.
- 재현(스크립트로 확인, s1-repro.js 2단계): 가짜 fb 두 개(zzoom, kwon)를 만든다. kwon 에 기한 지난 회의와 chat·transcript 문서를 넣고 그 mid 를 zz:purge 에 넣는다. 그다음 `runPurge({fb: zzoom})` 를 부른다. 결과는 `meetingsDone:1` 이고 대기열에서 빠진다. kwon 의 회의 문서와 받아쓰기 문서는 **그대로 남는다**. 대기열에 넣지 않은 kwon 회의는 `expired:0` 이라 아예 손대지 않는다.
- 실제 상황: 이전 전에 kwon 에서 연 협의회의 받아쓰기(교사 발언 원문)와 채팅이 10일이 지나도 kwon 에 남는다. kwon 에 회의가 실제로 몇 개 남았는지는 **확인 못 함**(운영 저장소를 읽지 않음). 커밋 메시지가 「옛 회의는 kwon 에 남음」이라고 적고 있다.
- 고칠 방향: 한 번만 도는 이관 정리 경로를 둔다(createGcp({databaseId:'kwon'}) 로 runPurge 의 회의 정리 부분을 kwon 에도 돌리고, kwon 에 회의가 0개가 될 때까지 cron 에 붙여 둠). 또는 남은 kwon 회의를 지금 손으로 지우고 fb.js 주석을 바로잡는다. 이관이 끝나기 전까지 purgeMeeting 이 「회의 문서가 없으면 성공」으로 대기열을 비우지 않게 한다.

### S1-2 보통(서울 이전과 무관, 이전부터): 채용 정리 cron 이 한 번도 돌지 않는다. Vercel cron 은 GET 으로 부르는데 경로는 POST 만 받는다
- 위치: vercel.json crons `/api/recruitments/maintenance/purge`, lib/recruitment/routes.js 118 `router.post('/maintenance/purge', …)`
- 재현: 운영에 `GET /api/recruitments/maintenance/purge` → **404**. 반면 쭘 경로는 `router.all` 이라 GET 이 401 bad_cron_secret 까지 들어간다(정상). Vercel Cron 은 운영 주소에 HTTP GET 을 보낸다.
- 영향: 채용 Drive 보관 폴더의 보관 기한 지난 삭제가 cron 으로는 일어나지 않는다(누가 「보관」을 눌러야 그때 같이 지워짐). regions 변경과는 상관없고, 이번 담당 범위(백암이 cron 영향) 확인 중에 찾았다.
- 고칠 방향: 채용 정리 경로도 GET 을 받게 한다(`router.all` 이나 `router.get` 추가, 인증은 같은 CRON_SECRET).

### S1-3 낮음: 서버 DB 이름은 환경 변수로 바뀌는데 화면 DB 이름은 코드에 박혀 있다. 규칙 파일의 배포 안내는 저장소에서 따라 할 수 없다
- 위치: fb.js 38 `env.ZZOOM_FIRESTORE_DB || 'zzoom'`, public/zzoom/api.js 8 `DB_NAME = 'zzoom'`, firestore.zzoom.rules 2행 「firebase deploy --only firestore:zzoom (firebase.json 의 database 'zzoom')」
- 내용: 운영에 ZZOOM_FIRESTORE_DB 가 (예전 값 'kwon' 같은 것으로) 남아 있으면 서버는 kwon 에 쓰고 화면은 zzoom 을 읽는다. 그러면 회의 화면이 비고 「지워진 회의」로 보인다. 운영 환경 변수 값은 **확인 못 함**(비밀값이 아니지만 Vercel 설정을 열지 않음). health 는 ok 다. 저장소 뿌리에 firebase.json 이 없어 규칙 파일이 말하는 배포 명령은 그대로 돌릴 수 없다. 규칙 시험(run-rules.js, rules.test.js)은 firestore.rules(kwon 합본)만 올린다. 지금은 두 파일의 쭘 블록이 글자 그대로 같다(diff 로 확인). 그래서 실제 차이는 없고, 앞으로 한쪽만 고치면 시험이 놓친다.
- 고칠 방향: /health 에 서버가 쓰는 DB 이름을 넣고 화면이 다르면 경고한다(또는 환경 변수를 없애고 상수 하나로 둔다). 규칙 시험이 firestore.zzoom.rules 도 올리게 하고, 배포 안내를 콘솔 게시 방식으로 바로잡는다.

### S1-4 낮음: 자료 바꾸기 뒷정리에서 scDrop·purgePages 예약이 실패하면 옛 그림 지우기도 건너뛴다
- 위치: routes.js 811-823(바깥 try 하나)
- 내용: epoch 트랜잭션이 성공한 뒤 `Promise.all(scDrop…)` 이나 `hset(K.purgePages)` 가 Redis 오류로 실패하면 바깥 catch 로 빠진다. 그러면 removeOldStrokes 와 removePrefix(옛 쪽 그림)를 건너뛴다. epoch 가 이미 올라가 옛 선은 화면에 안 보인다. 하지만 purgePages 예약이 빠지면 옛 선 문서는 회의를 지울 때까지 남는다. 옛 쪽 그림도 회의 삭제 때까지 Storage 에 남는다. 회의 삭제 때 둘 다 지워지므로 낮음이다. purgePages 예약이 트랜잭션 뒤에 있는 것도 그대로다(함수가 중간에 끊기면 예약이 빠짐).
- 고칠 방향: removePrefix 를 따로 try 로 감싸고, purgePages 예약을 트랜잭션 앞으로 옮긴다.

### S1-5 낮음: 서버는 서울로 왔지만 Storage 버킷은 미국이라, 서버의 Storage 호출은 오히려 멀어졌다
- 위치: routes.js 733(업로드 확정 list), 748-760(쪽·썸네일 머리 확인, 16개씩 병렬 → 200쪽이면 400개, 25번 왕복), purge.js 11-21(removePrefix, 10개씩 병렬)
- 내용: 예전 미국 함수에서는 가까웠던 Storage 왕복이 이제 태평양을 건넌다. 큰 PDF 업로드 확정과 회의 지우기(서버 예산 20초)가 전보다 느려질 수 있다. 지우기는 끝나지 않으면 `queued` 로 넘기고 cron 이 이어 받으므로 데이터 문제는 없다. 확정은 화면 제한 20초를 넘기면 같은 요청 표의 409 대기로 이어진다. 실제 걸리는 시간은 **확인 못 함**(운영에서 업로드를 하지 않음).
- 고칠 방향: 200쪽 업로드 확정과 회의 지우기 시간을 운영에서 한 번 재 본다. 길면 머리 확인 병렬 수를 늘리거나 버킷도 아시아로 옮기는 것을 정한다.

## 서울 이전 영향 확인(문제없음)
- **DB 이름**: 서버 기본값(fb.js 38, gcp.js 45)과 화면(api.js 8, `getFirestore(app, DB_NAME)` 147)이 둘 다 'zzoom' 이다. 맞춤 토큰은 프로젝트 단위라 DB 와 상관없다.
- **규칙과 화면 읽기 경로**: 화면이 읽는 것은 회의 문서 get(onSnapshot doc)과 agenda·hands·chat·polls·transcript·strokes 목록, pages/<쪽> get, people 목록(주관자)이다(api.js 592-605). firestore.zzoom.rules 가 이 경로를 모두 덮는다(회의 문서 get, 하위 7종 read, people 은 host). 회의 문서 list 와 모든 쓰기는 막는다. 그 밖의 경로는 규칙이 없어 기본으로 거절된다. Storage 규칙은 Firestore 를 참조하지 않으므로 DB 이전과 상관없다.
- **색인**: 서버 쿼리(purge.js 78 `expiresAt <`, 126 `pageKey ==`, routes.js 820·914 `aid ==`, 1139 `seenAt >=`)와 화면 쿼리(chat `orderBy at desc + limit`, strokes `pageKey ==`)는 모두 필드 하나짜리라 새 DB 의 자동 단일 필드 색인으로 된다. 복합 색인이 필요한 쿼리는 없다.
- **백암이 다른 기능**: server.js 는 Firestore 를 서버에서 쓰지 않는다(급식일지는 맞춤 토큰만 발급하고 읽기·쓰기는 브라우저가 kwon 에 직접 함). 서버에서 Firestore REST 를 쓰는 곳은 lib/zzoom/gcp.js 하나뿐이다. 그래서 kwon 관련 서버 지연이 늘어나지 않는다. Redis(Upstash, 백암이 공용)는 아시아라 오히려 가까워졌다. NEIS·apis.data.go.kr 도 가까워졌다. Groq(미국)는 호출마다 왕복이 조금 늘지만 기능에는 영향이 없다.
- **cron**: regions 는 cron 일정과 인증에 영향이 없다. 쭘 정리 경로는 GET 을 받고 CRON_SECRET 을 확인한다(운영에서 401 응답 확인). 채용 쪽 문제는 S1-2 다.
- **외부 rewrite**(/용천이 → yongcheon.vercel.app): 엣지에서 처리되므로 함수 지역과 상관없다. vercel.json 에 server.js 로 가는 rewrite 는 없다(CLAUDE.md 금지 사항 지킴).
- **같은 요청 표 세부**: 넘겨받은 뒤 앞 요청이 늦게 끝나면 res.json 이 결과를 덮어쓸 뿐 키를 지우지 않는다(saved=true). 4xx 결과도 120초 기억하지만, 화면은 네트워크가 끊길 때만 같은 표로 다시 보내므로 문제없다. JSON 해석 실패(400)는 미들웨어 앞에서 끝나 기록이 남지 않는다. 가짜 Redis 의 Lua SET 은 `EX` 인자를 무시한다(fake-redis.js luaCall). 그래서 시험에서는 넘겨받은 표시가 만료되지 않지만, 운영 Redis 는 `SET … EX 120` 을 그대로 따른다. 시험의 작은 틈일 뿐 운영 문제는 아니다.

## 요약
치명 0, 높음 1(S1-1), 보통 1(S1-2, 서울 이전과 무관한 이전부터의 문제), 낮음 3(S1-3~S1-5).
R8 Q1 의 높음(Q1-1)과 보통 둘(Q1-2, Q1-3)은 고쳐졌다(Q1-3 은 일부 남음). 새 높음은 서울 이전으로 생긴 것이다. 정리 cron 이 새 DB 만 보므로 옛 kwon 회의의 받아쓰기·채팅이 10일이 지나도 지워지지 않는다. 이미 대기열에 있던 회의는 「다 지움」으로 대기열에서 빠진다.

결론: FAIL
