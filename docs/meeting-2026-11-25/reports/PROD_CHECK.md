# 배포 뒤 운영 확인 스크립트 (PROD_CHECK)

파일: `tests/zzoom/prod_check.py` (Python Playwright, 엣지 msedge, 1280x800 과 390 폭 각각 한 번)

## 쓰는 법
```
set ZZ_CODE=<접근 코드>        (화면·로그에 출력하지 않음)
python tests/zzoom/prod_check.py [기준주소=http://127.0.0.1:3000] [스크린샷 폴더=%TEMP%\zz_prod_shots]
```
종료 코드: 모두 통과 0, 실패 있음 1, 코드 없음 2. 마지막에 단계별 통과표를 출력한다.

## 단계
1. 백암이 로그인(API) 후 /zzoom 목록
2. 회의 만들기(제목 「[시험] 자동 점검 <시각>」, 주관 코드는 무작위 6자리, 출력 안 함)
3. 입장하기(입력 칸 0개, 「이름」 글 없음 확인)
4. 대기 화면 「오늘의 안건」
5. 주관자 확인과 회의 시작. 일반 코드면 「주관 코드 넣기」, 관리자 코드면 이미 주관자. 「발표하기」는 회의가 live 일 때만 눌려서 요청 흐름에 없던 이 단계를 끼웠다.
6. 제목만 안건 추가
7. PDF 올리기(스크립트가 2쪽짜리를 만듦. 쪽 넘김 확인에 2쪽 필요) 후 「2쪽」 표시
8. 발표하기: 확인 창 본문 정확히 「지금부터 화면이 전송됩니다」, 「아니오」면 발표 표시 수 불변, 「예」면 「내가 진행 중이에요」와 1 / 2
9. 두 번째 컨텍스트(별도 로그인 세션, device id 다름)로 같은 회의 입장, 1 / 2 에서 시작해 발표자가 「다음 쪽」 누르면 2 / 2 로 따라옴
10. 채팅 1건: 받은 쪽에 이름 칸 없음, 보낸 쪽은 「나」만
11. 정리(finally): 만든 회의(id 로만) 삭제 후 새로 고침 반복으로 목록에서 사라짐 확인(45초). 만든 회의가 없으면 아무것도 지우지 않음.

스크린샷: 단계마다 `%TEMP%\zz_prod_shots\<pc1280|m390>_NN_단계.png`

선택자는 `list.js`(.zl-new, #zl-f-title, #zl-f-code, .zl-card[data-mid], .zl-enter, .zl-del), `join.js`(#zz-join .zl-go, .zl-host-btn, #zl-hostcode), `agenda.js`(.za-add, #za-add-title, .za-item, .za-upload, .za-present, .za-confirm, .za-chip-live), `viewer.js`(.zv-pageno, .zv-ov-state.is-presenter, 다음 쪽), `chat.js`(#zz-side-chat, .zs-msg, .zs-name), `host.js`(.zl-host-chip, 「회의 시작」)에서 읽어 맞췄다.

## 로컬 시험 결과와 막힌 곳
`PORT=3311 node server.js`(Firebase·Redis 없음)로 돌렸다. `/api/zzoom/health` 가 `firebase:false, redis:false` 이고 `/api/zzoom/*` 가 503 이라 **1단계에서 막힌다**(앱이 설정 없음 안내만 띄우고 목록의 「회의 만들기」를 그리지 않음). 이후 단계는 건너뜀 처리되고, 정리 단계는 만든 회의가 없어 통과했다(try/finally 동작 확인). 로그인 API, msedge 기동, 두 폭 반복, 스크린샷 저장, 통과표 출력은 동작을 확인했다.

**2~10단계는 한 번도 실행하지 못했다.** 선택자는 코드를 읽어 맞춘 것이라 실서버에서 처음 돌릴 때 어긋날 수 있다. 특히 확인이 필요한 곳은 다음과 같다.
- 390 폭의 옆칸 열기(`#zz-side-toggle`)와 「회의 시작」 단추 위치(더 보기 안으로 들어갈 수 있음, 처리는 해 둠)
- PDF 변환(pdf.js, 브라우저에서 WebP 생성)과 Storage 올리기
- 실시간 따라가기는 클라이언트 Firebase SDK 연결이 필요해서 가짜 fb·Redis 로도 로컬에서 시험할 수 없다. 에뮬레이터(java·firebase CLI 는 있음)에 클라이언트를 붙이려면 앱의 Firebase 설정을 바꿔야 해서 이번에는 하지 않았다.

권장: 운영 주소 첫 실행 때 `--headed` 가 아닌 화면 확인용으로 스크린샷을 먼저 본다. 시험 회의가 남으면 제목이 「[시험] 자동 점검 …」 인 것만 직접 지운다.
