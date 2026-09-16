# 백암이 채용 관리 — Google 연결 설명서

## 지금 연결된 것과 남은 것

- 운영 계정: `kdhdhdbdbr@gmail.com`
- Google Cloud 프로젝트: `airoom-ebce3`
- 기본 폴더: [백암이 채용 지원 시스템](https://drive.google.com/drive/folders/1n5Aypzoy0PtdiJizgb5pWyLaHwNKmMPs)
- 폴더 링크는 웹에 연결되어 있습니다. 대화의 MCP 인증은 이 웹의 OAuth 인증과 별개입니다.
- OAuth 시작/콜백, 계정 확인, 암호화 토큰 저장, 갱신, Drive 접근 검사 코드를 제공합니다.
- **평가는 이 웹에서 실제로 진행합니다.** 위원 초대 링크, 채점, 제출, 집계, 확정, HTML/Excel/ZIP 출력이 모두 동작합니다. 가짜 점수나 흉내만 내는 화면이 아닙니다.
- 아직 없는 것은 **Google 연동뿐**입니다. Drive 는 확정된 결과 문서(HTML/Excel/ZIP)를 보관하는 용도로만 쓸 예정이고, 그 업로드는 아직 구현하지 않았습니다. OAuth 연결에 성공해도 Drive 에 파일이 자동으로 생기지는 않습니다.
- Google 스프레드시트를 복사해 위원이 시트에서 채점하던 설계는 **폐기했습니다.** 시트 관련 코드는 제거되었고 Sheets API 는 쓰지 않습니다.

## 1. Google API 활성화

CLI가 로그인된 운영 계정인지 확인합니다. 프로젝트 전역 설정은 바꾸지 않고 명시적으로 지정합니다.

```powershell
gcloud auth list
gcloud services enable drive.googleapis.com --project=airoom-ebce3
```

## 2. OAuth 앱 만들기

1. [Google Auth Platform](https://console.cloud.google.com/auth/overview?project=airoom-ebce3)을 운영 계정으로 엽니다.
2. 브랜딩: 앱 이름 `백암이 채용 관리`, 지원 이메일·개발자 연락처를 운영 계정으로 지정합니다.
3. 대상: 개인 Gmail 계정이므로 외부 사용자 앱으로 설정하고, 테스트 사용자에 운영 계정을 추가합니다.
4. 데이터 액세스: 현재 단일 운영 계정 개발 버전은 `https://www.googleapis.com/auth/drive` 권한을 사용합니다. 미리 지정된 보관 폴더를 확인하고 결과 문서를 올리기 위해서입니다. 운영 계정의 Drive에 폭넓은 접근이 가능한 권한이므로 승인 화면에서 확인하세요. Sheets 권한은 쓰지 않습니다.
5. [클라이언트](https://console.cloud.google.com/auth/clients?project=airoom-ebce3) → 클라이언트 만들기.
   `애플리케이션 유형`은 드롭다운입니다. 처음에 **데스크톱 앱**이 보이더라도 목록을 펼쳐 **웹 애플리케이션**을 고릅니다.
   목록이 펼쳐지지 않으면 2~4번(브랜딩·대상·데이터 액세스)이 아직 저장되지 않은 것입니다.
   이미 **데스크톱 앱**으로 만들었다면 로컬 테스트는 그대로 됩니다. Google 은 데스크톱 유형에 한해
   루프백 주소(`localhost`/`127.0.0.1`)의 포트와 경로를 자유롭게 허용합니다 (2026-09-16 실측).
   다만 배포 HTTPS 주소는 `redirect_uri_mismatch` 로 거부되므로, 배포용은 웹 애플리케이션으로 따로 만듭니다.
6. 승인된 리디렉션 URI에 아래를 정확하게 추가합니다. 로컬과 배포 주소를 모두 넣어두면 한 클라이언트로 양쪽을 씁니다.
   서버 측 OAuth이므로 JavaScript 원본은 현재 구현에 필수는 아닙니다.

```text
http://localhost:3100/api/recruitments/google/callback
https://a-iroom.vercel.app/api/recruitments/google/callback
```

7. 클라이언트 JSON을 다운로드합니다. 채팅, GitHub, 공개 폴더에 올리지 않습니다.

여러 학교 대상의 외부 서비스로 확장할 때는 Google Picker로 보관 폴더를 선택하고 `drive.file` 최소 범위로 전환하는 것을 권장합니다. `drive.file` 범위에 파일 ID만 제공해도 자동으로 권한이 부여되는 것은 아닙니다. 외부 앱 게시와 OAuth 검증 요구사항도 별도로 검토합니다.

## 3. 다운로드한 JSON으로 로컬 설정

프로젝트 폴더에서 실행합니다.

```powershell
npm ci
node scripts/setup-recruitment-google.js "C:\Users\사용자\Downloads\client_secret_....json"
npm start
```

설정 스크립트는 `.env`에 OAuth 클라이언트와 임의의 256비트 토큰 암호화 키를 저장합니다. 기존 다른 환경변수는 보존합니다. `.env`는 Git에서 제외됩니다. 출력에 비밀키를 표시하지 않습니다.

1. `http://localhost:3100/recruitment`를 엽니다.
2. 기존 백암이 **관리자 코드**로 로그인합니다.
3. `Google 계정 연결`을 누릅니다.
4. 운영 계정으로 승인합니다.
5. 웹으로 돌아오면 `Drive 접근 확인`을 누릅니다.

연결 상태의 ‘인증 정보 저장됨’은 저장된 갱신 토큰의 존재를 뜻합니다. 실제 사용 가능 여부는 접근 확인으로 검사합니다. OAuth 테스트 모드의 갱신 토큰은 Google 정책에 따라 만료될 수 있으며, 이 경우 다시 연결합니다.

## 3-1. 폐기된 시트 템플릿 (기록)

초기 설계는 `khwell@gmail.com` 소유의 심사표 스프레드시트 2종(10명·20명, 제목에 `Copyright © 2026 KHSDO`)을
운영 폴더로 복사해 위원이 시트에서 채점하는 방식이었습니다. 이 경로는 **쓰지 않기로 확정**되어
`templateIds`·`templateVerification` 설정과 시트 관련 코드를 모두 제거했습니다. 제3자 저작물 사용 허락,
수식 정비, 탭·셀 매핑 검증 문제도 함께 없어졌습니다. 평가는 웹에서 하고, Drive 는 결과 문서 보관에만 씁니다.

## 4. 현재 Drive 폴더 공유 설정

연결된 운영 계정 토큰으로 실측한 결과(2026-09-16), 폴더 소유자는 운영 계정이고 공유 권한은 다음과 같습니다.

```text
anyone  writer          <- 링크를 아는 누구나 편집·삭제 가능
user    owner   kdhdhdbdbr@gmail.com
```

`보기`가 아니라 **편집자**입니다. 확정된 결과 문서(지원자 명단과 평가 점수가 들어갑니다)를 보관할 위치이므로
링크가 유출되면 외부인이 결과 문서를 수정·삭제할 수 있습니다. `checkConnection()` 이 409 로 준비 검사를 중단하는 원인입니다.

결과 문서를 저장하기 전에 폴더의 일반 액세스를 제한됨으로 변경하고 필요한 관리자만 공유합니다. 이 코드는 기존 공유를 임의로 변경하지 않습니다. `checkConnection()`은 공개 또는 도메인 전체 공유를 발견하면 준비 검사를 중단합니다. 위원은 웹에서 초대 링크로 평가하므로 이 폴더를 위원에게 공유할 필요가 없습니다.

## 5. 배포 시

현재 GitHub 기능 브랜치용 코드이며 운영 배포는 별도입니다. 배포 도메인이 확정되면 콜백 URI를 추가하고 아래 값을 배포 환경변수에 등록합니다.

```text
RECRUITMENT_GOOGLE_CLIENT_ID
RECRUITMENT_GOOGLE_CLIENT_SECRET
RECRUITMENT_GOOGLE_REDIRECT_URI=https://실제도메인/api/recruitments/google/callback
RECRUITMENT_TOKEN_KEY
UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN
```

로컬 파일 저장은 단일 Node 프로세스 개발용입니다. Vercel에서는 기존 Redis를 재사용하고, Redis가 없으면 쓰기를 거부합니다. OAuth 토큰은 AES-256-GCM으로 암호화하여 별도 Redis 키 또는 로컬 파일에 저장합니다. 암호화 키를 바꾸면 기존 토큰을 복호화할 수 없으므로 다시 연결해야 합니다.

## MCP와 gcloud의 역할

- `gcloud`: 프로젝트·API 설정 도구. 웹 사용자의 OAuth 동의를 대신하지 않습니다.
- Google REST API: 서비스가 실제 파일을 생성·읽기·공유하는 경로.
- MCP: 추후 외부 에이전트가 업무 기능을 호출하게 하는 선택적 연결. 이 앱의 기본 동작에 필수는 아닙니다.

## 공식 문서

- [Workspace API 활성화](https://developers.google.com/workspace/guides/enable-apis)
- [웹 서버 OAuth](https://developers.google.com/identity/protocols/oauth2/web-server)
- [Drive 권한 범위](https://developers.google.com/workspace/drive/api/guides/api-specific-auth)
- [Google Picker](https://developers.google.com/workspace/drive/picker/guides/web-picker)
