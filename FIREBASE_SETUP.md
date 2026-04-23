# Firebase / Firestore 세팅 가이드 (AIroom)

> 급식일지(`/bap/`)와 같이 Firebase Firestore를 사용하는 기능을 추가하거나 디버깅할 때 참조용.
> 실제로 2026-04-23에 `(default)` vs `kwon` 데이터베이스 이름 불일치로 반나절 태운 경험에서 정리.

---

## 0. 이 앱에서 Firestore를 쓰는 이유

- 기본 데이터 저장은 **Upstash Redis** (server.js의 `DATA_ROUTES` 패턴, `KV_KEYS` 매핑)
- Firestore는 **실시간 동기화가 필요한 기능** 또는 **문서 단위 원자 쓰기가 중요한 기능**에만 선택적으로 사용
- 현재 Firestore 사용처: `/bap/` (급식일지) — 여러 담당자가 동시에 편집할 수 있기 때문
- Firebase Storage도 함께 구성되어 있음 (이미지 업로드)

---

## 1. Firebase 프로젝트 정보

- **프로젝트 ID**: `airoom-ebce3`
- **플랜**: Blaze (종량제)
- **Firestore 데이터베이스 ID**: `kwon` ⚠️ (default 아님 — 아래 섹션 참고)
- **Firestore 위치**: Firebase 콘솔에서 확인
- **콘솔 링크**: https://console.firebase.google.com/project/airoom-ebce3/firestore

---

## 2. ⚠️ 가장 큰 함정: 데이터베이스 이름

### 증상

- JS SDK가 `unavailable` 에러와 함께 "client is offline" 판정
- Network 탭에 `firestore.googleapis.com/.../channel?...` 요청이 **200 OK로 끝나지만** 수백 ms만에 `TYPE=terminate` 로 끊기고 무한 재연결
- `getDoc` / `setDoc` 전부 실패
- 규칙 문제도 아님 (`permission-denied` 가 아닌 `unavailable`)

### 원인

Firestore JS SDK의 `getFirestore(app)` 은 **기본적으로 `(default)` DB를 찾는다**. 이 프로젝트의 Firestore DB 이름은 `kwon`이므로 반드시:

```js
const db = getFirestore(app, 'kwon');
//                         ^^^^^^^ 두 번째 인자 필수
```

### 확인 방법

1. Firebase 콘솔 → Firestore Database → 주소창 URL 확인
   ```
   .../firestore/databases/kwon/data
                           ^^^^ 이게 DB ID
   ```

2. REST로 직접 확인 (브라우저 콘솔에서):
   ```javascript
   fetch('https://firestore.googleapis.com/v1/projects/airoom-ebce3/databases/kwon/documents/bap_config/boss')
     .then(async r => console.log(r.status, await r.text()));
   ```
   - `(default)`로 물으면 404 + `"database does not exist"` → 이름 불일치
   - `kwon`으로 물으면 404 + `"not found"` (문서만) → 이름 맞음, 문서가 없을 뿐

### 만약 앞으로 다른 DB를 쓰게 된다면

- Firebase 콘솔에서 **"데이터베이스 추가"** 클릭 시 이름을 뭐로 줬는지 반드시 기록
- 코드도 동일한 이름으로 맞출 것

---

## 3. Firestore 보안 규칙 배포

### ⚠️ 규칙도 DB별로 따로 적용된다

- `firestore.rules` 파일은 **현재 보고 있는 DB의 규칙 탭**에 붙여넣어야 함
- 잘못해서 `(default)`의 규칙 탭에 붙여넣으면 `kwon` DB는 여전히 기본 규칙(전부 거부) 상태

### 배포 절차

1. Firebase 콘솔 → Firestore → **URL에 `/kwon/`이 있는지 확인**
2. **규칙** 탭 클릭
3. 로컬 저장소의 `firestore.rules` 내용 복사 → 붙여넣기
4. **게시** 클릭
5. 1~2분 대기

### 로컬 파일

`firestore.rules` — Git에 커밋되어 있음. 원본은 여기서 관리.

---

## 4. Vercel 환경 변수 체크리스트

Vercel 프로젝트 설정 → Environment Variables:

| 변수명 | 용도 | 예시 값 |
|---|---|---|
| `FIREBASE_API_KEY` | Firebase Web API Key | `AIzaSy...` |
| `FIREBASE_AUTH_DOMAIN` | Auth Domain | `airoom-ebce3.firebaseapp.com` |
| `FIREBASE_PROJECT_ID` | 프로젝트 ID | `airoom-ebce3` |
| `FIREBASE_STORAGE_BUCKET` | Storage 버킷 | `airoom-ebce3.firebasestorage.app` |
| `FIREBASE_MESSAGING_SENDER_ID` | FCM Sender ID | `183554951580` |
| `FIREBASE_APP_ID` | App ID | `1:183554951580:web:...` |

이 값들은 서버의 `/api/bap/config` 엔드포인트가 클라이언트에 전달.
**DB 이름(`kwon`)은 env로 관리하지 않음** — 클라이언트 코드에 하드코딩 (`getFirestore(app, 'kwon')`).

---

## 5. Google Cloud Console 설정 체크

### 필수 API 활성화

https://console.cloud.google.com/apis/library?project=airoom-ebce3

- Cloud Firestore API
- Identity Toolkit API (로그인용)
- Cloud Storage for Firebase API (Storage 쓴다면)
- Firebase Installations API

### API 키 제한사항

https://console.cloud.google.com/apis/credentials?project=airoom-ebce3

- **애플리케이션 제한사항**: "HTTP 리퍼러" 쓴다면 허용 목록에:
  - `https://a-iroom.vercel.app/*`
  - `https://*.vercel.app/*` (Preview 배포 지원)
  - `http://localhost:*` (로컬 개발)
- **API 제한사항**: "키 제한"이면 허용 API에 위 "필수 API" 전부 포함

---

## 6. 디버깅 체크포인트 (문제 생겼을 때 순서대로)

### 체크포인트 1: 에러 코드 분류

브라우저 콘솔에 붙여넣고 `e.code` 값 확인:

```javascript
(async () => {
  try {
    const r = await window.__bap.getDoc(window.__bap.doc(window.__bap.db, 'bap_config', 'boss'));
    console.log('SUCCESS. exists:', r.exists());
  } catch (e) {
    console.error('code:', e.code, '| name:', e.name, '| msg:', e.message);
  }
})();
```

### 체크포인트 2: 코드 → 원인 매핑

| e.code | 의미 | 조치 |
|---|---|---|
| `unavailable` | SDK가 서버 연결/스트림 유지 실패 | DB 이름 확인 → API 활성화 → 키 제한 → 네트워크 |
| `permission-denied` | 규칙이 거부 | `firestore.rules` 확인, **해당 DB**에 규칙 게시됐는지 확인 |
| `failed-precondition` | DB가 Datastore 모드 | 프로젝트 재생성 또는 Native DB 추가 |
| `not-found` | 문서 없음 | 정상 동작. `exists()` false 반환 |
| `unauthenticated` | 인증 필요 | Auth 토큰 확인 (Firestore Auth 쓰는 경우) |

### 체크포인트 3: REST로 DB 존재 확인

```javascript
fetch('https://firestore.googleapis.com/v1/projects/airoom-ebce3/databases/kwon/documents/bap_config/boss')
  .then(async r => { console.log('STATUS:', r.status); console.log('BODY:', await r.text()); });
```

- `200` + JSON → DB/문서 정상
- `404` + `"not found"` (문서만) → DB 정상, 문서 없음 (정상)
- `404` + `"Database ... does not exist"` → **DB 이름 틀림**
- `403` + `"API not enabled"` → Cloud Firestore API 비활성
- `403` + `"API key not valid"` → API 키 제한

### 체크포인트 4: Network 탭 보기

F12 → Network → 필터 `firestore`

- `channel?...` 요청이 **200인데 수백 ms마다 `TYPE=terminate` 로 끊기고 재연결** → 스트림 레벨 거부 (주로 DB 이름 불일치)
- `403` → API 레이어 차단
- 요청 자체 없음 → SDK 초기화 실패. 콘솔 에러 확인

### 체크포인트 5: App Check 강제 적용 여부

https://console.firebase.google.com/project/airoom-ebce3/appcheck

- **Cloud Firestore** 행이 `Enforced` 면 → reCAPTCHA 토큰 없이는 차단됨
- 내부용 앱이면 `Unenforced`로 두는 게 편함

### 체크포인트 6: Firestore 모드 확인

- **Native 모드** ✅ (JS SDK v10이 쓰는 모드)
- **Datastore 모드** ❌ — JS SDK v10이 못 붙음. 새 프로젝트 또는 멀티 DB 필요

---

## 7. 관련 파일

| 파일 | 역할 |
|---|---|
| `public/bap/index.html` | 급식일지 클라이언트 (Firestore 초기화 포함) |
| `server.js` | `/api/bap/config` 엔드포인트 — 환경변수 → 클라이언트 전달 |
| `lib/bap-menu-parse.js` | Groq API로 식단표 PDF 파싱 |
| `firestore.rules` | Firestore 보안 규칙 (현재 `kwon` DB에 게시) |

---

## 8. 기록해 둘 교훈

1. **네임드 DB(`(default)` 아닌 것) 사용 시 `getFirestore(app, 'DB_ID')` 필수**. 빠뜨리면 `unavailable`로 나옴 (offline 판정) → 원인 찾기 힘듦.
2. **`unavailable`은 "네트워크 없음"이 아니다.** 스트림 핸드셰이크는 성공해도 서버가 스트림 프레임을 거부하면 이 에러가 뜸. Network 탭 **Status 컬럼**만 보지 말고 **스트림 지속 시간** 도 보자.
3. **규칙은 DB별로 별도**. 여러 DB 쓰는 프로젝트면 각각 배포 확인.
4. **REST 테스트가 WebChannel 디버깅보다 빠르다.** `fetch('https://firestore.googleapis.com/v1/projects/.../databases/.../documents/...')` 한 줄이면 원인 80%가 좁혀짐.
5. **에러 메시지의 "해결책 링크"를 무작정 따라가지 말 것.** `(default) does not exist` 에러가 제시하는 `console.cloud.google.com/datastore/setup` 링크를 따라가면 **Datastore 모드**로 만들게 돼서 Firestore SDK가 아예 못 쓰게 됨. 항상 Firebase 콘솔의 Firestore 탭에서 Native 모드로 만들 것.
