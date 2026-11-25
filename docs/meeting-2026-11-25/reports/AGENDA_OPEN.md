# 보고서: 누구나 안건 설정하기 + 대기 화면 「오늘의 안건」 + 발표하기

브리프 `briefs/AGENDA_OPEN.md`(추가 결정 4와 5, 확인 창 문구, 익명 정정 포함). 커밋, 푸시, 배포, 규칙 게시, 실제 Firebase 쓰기는 하지 않았습니다. 규칙 표는 Rules 시험 API(게시 없음)로만 돌렸습니다.

## 진행 상황
- [끝] 서버 routes.js, storage.rules, CONTRACTS.md
- [끝] api.js 새 함수, viewer.js 최소 수정, app.js 모듈 붙이기, host.js 「안건 추가」
- [끝] agenda.js와 agenda.css 화면
- [끝] 시험 전부 통과(아래 표)
- [끝] 추가 지시 2건: 업로드 경로 덮어쓰기 막기(`resource == null`), 업로드 출입증 until 을 참가 자격과 관리자 세션 만료로 자르기

## 만든 파일과 고친 파일
| 파일 | 내용 |
|---|---|
| `lib/zzoom/routes.js` | `POST /:mid/agenda`(제목만 안건), `GET /:mid/agenda/mine`, 업로드 허가와 확정을 참석자에게 열기(`aid` 를 주면 있는 안건에 자료 붙이기와 바꾸기), 고치기와 지우기는 올린 사람이나 주관자, 순서는 주관자만, 한 사람 10개, `POST /:mid/presenter` 를 참석자에게 열기(live 일 때만, 10초 1번, `aid` 를 주면 그 안건으로 모두 끌어옴), `/live` 는 발표자 확인만. 안건 문서와 발표자에 이름 없음(`ownerCid`, `ownerHash` 만). 업로드 출입증 until 은 1시간, 회의 만료, 참가 자격 만료, 관리자 host 면 관리자 세션 만료 가운데 가장 이른 값 |
| `storage.rules` | 업로드 출입증은 role 을 보지 않고 `up == uploadId` 만 봄(참석자도 자기 허가 경로에만 올림). create 에 `resource == null` 을 더해 같은 경로 덮어쓰기 거절 |
| `public/zzoom/agenda.js`, `agenda.css` (새 파일) | 대기 화면 「오늘의 안건」(`#zz-wait`, 접두어 `.za-`): 번호, 제목, 쪽수나 「자료 없음」, 「내 안건」, 「발표 중」, 안건 추가, 자료 올리기와 바꾸기, 이름 바꾸기, 지우기(두 번 눌러 확인), 안건을 누르면 1쪽으로 이동, 발표하기 확인 창 |
| `public/zzoom/api.js` (덧붙이기만) | `createAgenda`, `myAgenda`, `present`, `attachAgendaFile` |
| `public/zzoom/viewer.js` (최소) | 발표자 판정에서 host 조건을 뺌, 자료 없는 안건은 그리지 않고 안내 |
| `public/zzoom/app.js` (새 줄만) | agenda 모듈 등록과 `#zz-wait` 자리 |
| `public/zzoom/host.js` | 안건 창에 「안건 추가」 단추(`cmd:agenda-add`), 0쪽 표시 |
| `docs/meeting-2026-11-25/CONTRACTS.md` | 2-3 표에 새 함수 4개, 2-3-1 안건 문서 모양과 권한, 8 표에 안건 열기 줄 |
| 시험 | `tests/zzoom/api.test.js` 새 시험 6건과 바뀐 권한에 맞춘 단언, `redteam.test.js` 참석자 업로드 줄과 규칙 표 5줄, `rules.test.js` 덮어쓰기 todo 를 보통 시험으로, `agenda_fake_api.js` 와 `agenda_e2e.py`(새 파일) |

## 시험 결과(2026-11-26)
| 명령 | 결과 |
|---|---|
| `npm run test:zzoom` | 81 통과, 0 실패 |
| `node tests/zzoom/run-rules.js` (에뮬레이터) | 63 통과, 0 실패, todo 0(덮어쓰기 거절이 todo 에서 통과로 바뀜) |
| `node --test tests/zzoom/redteam.test.js` | 9 통과, 0 실패(나머지는 RT_RULES 없이 건너뜀) |
| `RT_RULES=1 node --test tests/zzoom/redteam.test.js` (Rules 시험 API, 게시 없음) | 11 통과, 0 실패, todo 6(기존 낮음과 기존 앱 항목) |
| `LOAD_STRICT=1 node --test tests/zzoom/load.test.js` | 2 통과, issues 0 |
| `python tests/zzoom/agenda_e2e.py` | 엣지와 크로미움, 1280x800, 820x1180, 390x844 여섯 경우 54 통과, 0 실패, 콘솔 오류 0 |

화면 시험 항목: 대기 화면과 이름 없음, 준비 상태 발표하기 꺼짐, 참석자 안건 추가와 PNG 변환 올리기, 제목만 안건 뒤 자료 올리기, 안건 누르면 내 화면만 이동, 확인 창 본문 「지금부터 화면이 전송됩니다」와 「예」「아니오」(아니오는 present 부르지 않음), 다른 분 발표 중이면 한 창에 「지금 다른 분이 발표 중이에요.」, 예를 누르면 발표자가 되고 대기 화면이 작아짐, 남이 발표 중일 때 누르면 자유 보기. 스크린샷은 눈으로 보았고, 1280 화면에서 패널 안쪽 여백이 없던 것(`--zz-s5` 없는 토큰)을 고쳤습니다.

Storage 규칙 표(Rules 시험 API, 참석자 업로드 출입증)
| 경우 | 기대 | 결과 |
|---|---|---|
| 자기 uploadId 경로에 쪽 그림 create | 허용 | 허용 |
| 다른 uploadId 경로 | 거절 | 거절 |
| 덮어쓰기(update) | 거절 | 거절 |
| 지우기 | 거절 | 거절 |
| up 밖 경로 | 거절 | 거절 |
| 있는 파일에 다시 create(시험 API 에 있는 파일을 주고 따로 확인) | 거절 | 거절 |

## 결정한 것
- 업로드 화면은 upload.js 를 고치지 않고 agenda.js 안에 짧은 변환, 미리 보기, 올리기 흐름을 두었습니다.
- `attachAgendaFile` 은 `uploadOne` 을 본떠 `aid` 를 넘기는 사본입니다(기존 줄을 고치지 말라는 조건 때문).
- 참석자 발표하기는 회의가 live 일 때만 됩니다. 주관자는 언제든 되찾습니다.
- 자료를 바꾸면 그 안건의 판서 문서는 지우지만, Redis 판서 수 세기는 기존 안건 지우기와 같이 그대로 둡니다.
- Rules 시험 API 는 create 때 「있는 파일 없음」을 따로 알려 줘야 `resource == null` 이 맞게 평가돼서, redteam 의 `rulesTest` 가 storage create 줄에 `resource: null` 을 넣게 했습니다.

## 요청
- 5팀: upload.js 와 agenda.js 의 올리기 흐름을 하나로 합치면 좋겠습니다.
- 통합 담당: api.js 의 `uploadToAgenda` 와 `uploadOne` 을 합쳐 주세요. CONTRACTS.md 2-3, 2-3-1, 8 에 덧붙인 내용을 확인해 주세요.
- 익명화 담당: 투표 `createdBy` 는 손대지 않았습니다.

## 남은 일
- 없음(위 요청만).
