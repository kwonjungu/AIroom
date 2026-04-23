# 급식일지(/bap) Firestore offline 오류 디버깅 기록

## 현재 증상

- 페이지: `https://a-iroom.vercel.app/bap/`
- 에러: `접속 오류: Failed to get document because the client is offline.`
- 발생 시점: 담당자 로그인 → 이름 입력 후 `fsGet('bap_users', name)` 호출 시

## 확인된 상태 (OK인 것)

- **Firebase config** `/api/bap/config` 응답 정상:
  ```json
  {
    "apiKey": "AIzaSyCPYEclVGbKTT3y9eCyQjWj2eubJM3X_Ac",
    "authDomain": "airoom-ebce3.firebaseapp.com",
    "projectId": "airoom-ebce3",
    "storageBucket": "airoom-ebce3.firebasestorage.app",
    "messagingSenderId": "183554951580",
    "appId": "1:183554951580:web:b8b60df43dfd2924dde059"
  }
  ```
- **SDK 로딩**: `console.log('bap ready:', !!window.__bap)` → `true`
- **Firebase 프로젝트**: `airoom-ebce3` (Blaze 플랜)
- **Firestore Database**: 프로덕션 모드로 생성됨
- **Firestore 규칙**: `firestore.rules` 내용 그대로 게시 완료 (오늘 16:17)
- **브라우저**: 시크릿 창에서도 동일 에러 재현됨 (확장 프로그램 원인 아님)

## 시도했지만 해결 안 된 것

- 하드 리프레시 (Ctrl+Shift+R)
- 시크릿 창 접속
- Firestore 규칙 재게시

## 집에서 재개할 체크포인트 (우선순위 순)

### 🔹 체크포인트 1: Firestore가 "Native 모드"인지 확인

Firebase 콘솔 → Firestore Database → 상단에 뜨는 표시 확인.  
`Native 모드`가 아니라 `Datastore 모드`면 Firebase JS SDK v10이 연결 못 함.

→ Datastore 모드라면 프로젝트를 새로 만들거나, 멀티 데이터베이스로 Native 모드 DB 추가해야 함.

### 🔹 체크포인트 2: Cloud Firestore API 활성화 여부

```
https://console.cloud.google.com/apis/library/firestore.googleapis.com?project=airoom-ebce3
```
"사용 설정" 버튼이 보이면 → 활성화 안 됨. 클릭해서 활성화.
이미 활성화됐다면 "관리" 버튼이 보임.

### 🔹 체크포인트 3: API 키 제한 확인

```
https://console.cloud.google.com/apis/credentials?project=airoom-ebce3
```
Browser API 키(`AIzaSyCPYEclVGbKTT3y9eCyQjWj2eubJM3X_Ac`) 클릭 → 확인:

1. **애플리케이션 제한사항**
   - "HTTP 리퍼러" 설정돼 있으면 → `https://a-iroom.vercel.app/*` 가 허용 목록에 있어야 함
   - 설정이 "없음"이면 패스
   
2. **API 제한사항**
   - "키 제한"이면 → 허용 API 목록에 **Cloud Firestore API**, **Identity Toolkit API** 있는지 확인
   - "키 제한 없음"이면 패스

### 🔹 체크포인트 4: Network 탭으로 실제 요청 확인

F12 → Network → 필터 `googleapis` → 새로고침 + 로그인 시도

예상 요청:
- `firestore.googleapis.com/google.firestore.v1.Firestore/Listen/channel?...`
- 상태코드 또는 실패 원인 기록할 것

### 🔹 체크포인트 5: Firestore 명시적 `enableNetwork()` 호출 테스트

Console에 붙여넣기:
```javascript
import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js').then(m => {
  m.enableNetwork(window.__bap.db).then(() => console.log('network enabled')).catch(e => console.error('enable failed:', e));
});
```
실패 메시지 기록.

### 🔹 체크포인트 6: 직접 호출로 에러 코드 확인

```javascript
(async () => {
  try {
    const r = await window.__bap.getDoc(window.__bap.doc(window.__bap.db, 'bap_config', 'boss'));
    console.log('SUCCESS. exists:', r.exists());
  } catch (e) {
    console.error('FAILED. code:', e.code, '| name:', e.name, '| message:', e.message);
  }
})();
```
`e.code` 값 기록:
- `permission-denied` → 규칙 문제
- `unavailable` → 네트워크 문제
- `failed-precondition` → Datastore 모드 등

## 의심 순위

1. **Firestore가 Datastore 모드로 생성됨** (가장 유력) — 프로덕션 모드 선택했지만 기존 GCP 프로젝트 설정이 Datastore였을 가능성
2. API 키 제한에 Cloud Firestore API 미포함
3. Vercel 엣지 네트워크의 지역과 Firestore 위치가 안 맞아 일시적 오프라인 판정
4. 브라우저 보안 설정 (Privacy·TPU, 쿠키 완전 차단 등)

## 해결 후 업데이트할 곳

- 이 파일을 삭제
- CLAUDE.md 의 후속 개선 섹션에 교훈 반영 여부 판단
