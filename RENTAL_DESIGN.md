# 교구 대여소 설계문 — `소규모 학교 연계 교구 대여소`

> **문서 성격**: 구현 착수용 설계 명세. 이 문서만 읽고 바로 코딩할 수 있게 작성함.
> **대상 레포**: `kwonjungu/AIroom` (로컬 클론 `C:\Users\user\work\AIroom`)
> **배포**: `https://a-iroom.vercel.app/` (Express on Vercel) + `https://kwonjungu.github.io/AIroom/` (정적 미러)
> **신규 URL**: `https://a-iroom.vercel.app/rental`
> **작성일**: 2026-08-27
>
> ### 🟢 초안 구현 완료 (2026-08-27)
> - **인증 없음(완전 개방판)** — 참여코드·학교 PIN·관리자 코드를 모두 뺐다. 누구나 올리고, 빌리고, 승인하고, 지운다.
>   신원(학교/이름/직)은 각인만 하고 서버가 검증하지 않는다. §4가 그 내용으로 교체됨.
> - **디자인은 Apple 언어** — `npx getdesign@latest add apple` 로 설치된 레포 루트 `DESIGN.md` 가 단일 출처.
>   §7.1의 색·타이포·라운드는 전부 그 토큰을 그대로 옮긴 것이다.
> - 구현 파일: `lib/rental.js` · `public/rental.html` · `defaults/rental-*.json` · `server.js` · `public/index.html`

---

## 0. 한 줄 요약

메인 SPA에 **`📦 교구 대여소` 탭**을 추가하되, 그 탭은 페이지를 그리지 않고 **`/rental` 로 즉시 이동**시킨다.
`/rental` 은 AIroom 로그인과 분리된 **독립 페이지**로, **학교 / 이름 / 직**만 적으면 누구나
교구를 **올리고 · 빌리고 · 반납**할 수 있고, 겹치는 신청은 **대기열(순번)** 로 자동 정리된다.

---

## 1. 요구사항 → 설계 대응표

| # | 사용자 요구 | 설계 결정 |
|---|---|---|
| 1 | 탭 하나 추가 | `DEFAULT_TABS`에 `type:'link'` 탭 신설 (§3.2) |
| 2 | `/rental` 로 도메인 따로 | `public/rental.html` + `app.get('/rental')` (§3.1) |
| 3 | 탭 클릭 시 자동 이동 | `<a href>` 로 렌더 → 클릭 즉시 이동, 중클릭 새 탭도 지원 (§3.3) |
| 4 | 학교·이름·직 쓰고 대여 | 신원 카드 = `{school, name, role}` localStorage 저장 (§4) |
| 5 | 올릴 때도 학교·이름·직 | 교구 문서에 `owner{school,name,role}` 각인 (§5.1) |
| 6 | 업로드·삭제 간결 | 3필드 + 사진(선택) 1화면 등록 / 삭제는 카드에서 바로 (§7.3) |
| 7 | 대여 신청 · 반납 신청 대기열 | 단일 `loan` 문서 + 7상태 상태기계 + FIFO 순번 (§6) |
| 8 | 소규모 학교 연계 | 교구마다 **보유교**, 참여 학교 목록 자동 축적 (§4.3) |
| 9 | UI는 디자인 시스템대로 | **Apple 토큰**(레포 루트 `DESIGN.md`), 모바일 우선 하단 탭바 (§7) |
| 10 | `bareun` 참고 | 물품/거래 2컬렉션 모델·수량 조절 UI·이모지 아이콘 계승, 저장소만 Redis로 교체 (§2.5) |
| 11 | 모두가 바로 이해 | 한 화면 한 행동, 상태 배지 7종 고정, 빈 화면마다 안내 문구 (§7.4) |

---

## 2. 기존 시스템 파악 (구현 전 반드시 인지)

### 2.1 실제로 서빙되는 파일

```
app.use(express.static(path.join(__dirname,'public')))   // server.js:216
```

- `/` 요청은 **`public/index.html`(11,165줄)** 이 응답한다. 루트의 `index.html`(6,851줄)은 `app.get('/')`(server.js:1507)에 남아 있지만 static 미들웨어가 먼저 처리하므로 **사실상 죽은 파일**이다.
- ⚠️ **탭 추가 작업은 `public/index.html` 에만 하면 된다.** 루트 `index.html`도 `DEFAULT_TABS`를 갖고 있어 헷갈리기 쉽다.

### 2.2 탭 시스템 (public/index.html)

| 줄 | 내용 |
|---|---|
| `1852` | `const DEFAULT_TABS=[...]` — 현재 14개, 마지막이 `winter-schedule` (order 13) |
| `2013` | `async function api(m,u,b,_retry=0)` — `X-Auth-Token` 헤더 붙이는 공통 fetch |
| `2204` | `function switchPage(p,btn)` — `.page` 전부 끄고 `#page-{id}` 켬 |
| `4525` | `async function initTabsConfig()` — **빌트인 탭이 저장본에 없으면 자동 추가 후 `POST /api/tabs`** |
| `4574` | `function renderTabs()` — 탭 버튼 HTML 생성 |

`initTabsConfig()`의 이 블록 덕분에 **DEFAULT_TABS에만 넣으면 기존 Redis 저장본에도 자동 반영**된다(맨 뒤 order로 붙음):

```js
DEFAULT_TABS.forEach(dt=>{ if(!tabsConfig.find(t=>t.id===dt.id)){ tabsConfig.push({...dt,order:tabsConfig.length}); needsSave=true; } });
```

### 2.3 데이터 계층 (server.js)

- `KV_KEYS` (파일명 → Redis 키 맵) · `readData(file)` / `writeData(file,data)`
- Redis 없으면 `data/` → `defaults/` 순으로 파일 폴백 (로컬 개발)
- `DATA_ROUTES`(server.js:424)는 **전체 덮어쓰기(POST)** 방식 → 대여소에는 **부적합**(§9.1 동시성)
- 인증: `requireAuth`(공유 접근코드 `1234`) / `requireAdmin`(`admin1234`)
- `/bap` 계열은 **자체 가입(PBKDF2)+Redis 세션**으로 메인 인증과 분리되어 있음 → 대여소도 같은 전략을 따른다.

### 2.4 GitHub Pages 미러의 제약 ★

`kwonjungu.github.io/AIroom/` 은 **정적 호스팅**이라 Express가 없다. 거기서 `/rental` 은 404다.
→ **링크 탭의 href는 상대경로가 아니라 절대 URL `https://a-iroom.vercel.app/rental` 로 고정**한다.

### 2.5 `bareun` 레포에서 가져올 것 / 버릴 것

`bareun` = "체육관 물품 관리". `index.html` 단일 파일 React(CDN+Babel) + Firebase Firestore.

| 가져옴 | 버림 |
|---|---|
| `equipments` + `transactions` 2-컬렉션 분리 모델 | Firebase Firestore 직결 (규칙으로 권한 못 막음) |
| 수량 `−/＋` 스테퍼, 다중 선택 후 일괄 처리 | 익명 로그인(`signInAnonymously`) |
| 이모지/사진 겸용 썸네일(`imageUrl`이 `http`면 img, 아니면 이모지) | 관리자 비번을 Firestore 평문 저장(`config/admin.password`) |
| `isQuantityTracked` (수량 관리 on/off) | Babel standalone 런타임 컴파일 |
| 3단계 흐름(선택 → 수량 → 완료)과 성공 토스트 | 학년/반 기반 대여자 (여긴 학교/이름/직) |

---

## 3. URL · 탭 연결 설계

### 3.1 라우트

`server.js` — `app.get('/admin')`(1502) 바로 위에 추가:

```js
// 교구 대여소 (독립 페이지, 메인 접근코드와 분리)
app.get(['/rental', '/rental/'], (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'rental.html'));
});
```

- `express.static` 때문에 `/rental.html` 로도 열린다 → `rental.html` 최상단 스크립트에서
  `if(location.pathname.endsWith('/rental.html')) history.replaceState(null,'','/rental');` 로 주소만 정리.

### 3.2 탭 정의

`public/index.html:1852` `DEFAULT_TABS` 배열 끝에 추가:

```js
{id:'rental',title:'교구 대여소',icon:'📦',type:'link',order:14,
 href:'https://a-iroom.vercel.app/rental'}
```

- `type:'link'` 는 신규 타입. `renderTabs()`의 삭제버튼 조건이 `type==='custom'` 이므로 **✕ 버튼이 안 붙는다**(의도된 동작).
- `defaults/tabs.json` 에도 동일 항목을 추가해 두면 신규 배포 환경에서도 순서가 유지된다.

### 3.3 렌더 & 클릭 처리

`renderTabs()`(4574) 내부 버튼 생성부를 분기:

```js
if(tab.type==='link'){
    html+=`<a class="main-tab tab-link" href="${tab.href}" rel="noopener">${tab.icon} ${esc(tab.title)} <span class="tab-link-arrow">↗</span></a>`;
}else{
    html+=`<button class="main-tab${isActive?' active':''}" onclick="switchPage('${tab.id}',this)">${tab.icon} ${esc(tab.title)}</button>`;
}
```

- `<a>` 로 두는 이유: 클릭 = 자동 이동(요구사항), 중클릭/Ctrl+클릭 = 새 탭, 키보드 포커스·스크린리더 대응이 공짜.
- CSS: `.main-tab.tab-link{ text-decoration:none; display:inline-flex; align-items:center; gap:4px; }`

`switchPage()`(2204) **맨 첫 줄에 가드** — 링크 탭 id가 실수로 들어오면 화면이 백지가 되는 사고 방지:

```js
function switchPage(p,btn){
    const t=tabsConfig.find(x=>x.id===p);
    if(t&&t.type==='link'){ location.href=t.href; return; }   // ← 추가
    ...
}
```

- `activeTabId` 에는 절대 `'rental'` 이 들어가지 않게 한다(링크 탭은 active 상태를 갖지 않음).

---

## 4. 사용자 · 권한 모델

### 4.1 신원(Identity) — 계정 없음

```js
localStorage.rental_identity = {school:"백암초등학교", name:"권준구", role:"교사", savedAt:"2026-08-27T..."}
```

- 최초 진입 시 **신원 카드 1장**만 채우면 끝. 이후 모든 신청/등록에 자동 각인.
- `role` 은 드롭다운 + 직접입력: `교사 / 교감 / 교장 / 교육실무사 / 늘봄·돌봄 / 영양(교)사 / 행정실 / 기타`
- 상단 배지 `백암초 · 권준구 · 교사 [바꾸기]` 로 항상 노출 → 남의 PC에서 잘못 신청하는 사고 예방.

### 4.2 권한 — 초안은 **완전 개방**

비밀번호가 하나도 없다. 화면에 보이는 모든 행동을 누구나 할 수 있다.

| 행동 | 누가 | 비고 |
|---|---|---|
| 목록 열람 · 대여 신청 · 반납 신청 · 취소 | 누구나 | 신원 미입력 시 신원 카드가 먼저 뜸 |
| 교구 올리기 · 수정 · 삭제 | 누구나 | UI에서는 **내 학교가 보유교일 때만** 수정/삭제 버튼을 그린다 (서버는 막지 않음) |
| 승인 · 반려 · 반납 확인 · 강제 반납 | 누구나 | 현황 탭에서 바로 처리 |
| CSV 내려받기 | 누구나 | 푸터 링크 |

- 남는 안전장치는 세 가지뿐이다: ① 모든 행동에 **신원이 각인**되고 ② `rental-audit` 에 **감사 로그**가 쌓이며 ③ 되돌릴 수 있는 전이(`return-cancel`, 취소)를 갖춰 뒀다.
- 위험을 받아들인 이유: 타 학교 교직원에게 코드 배포·분실 대응을 시키는 순간 "그냥 전화하지"가 되어 시스템이 죽는다.
- **나중에 잠그고 싶다면**: `lib/rental.js` 최상단에 `requireCode` 미들웨어 하나를 추가해 쓰기 라우트에만 걸면 된다. 데이터 모델은 그대로여도 된다(설계상 코드 검증은 라우트 진입점에만 있음).

### 4.3 학교 등록

`rental-schools` 에 3개교(백암·백봉·장평)를 미리 넣어 두었다. 신원 입력의 학교 칸은 `<datalist>` 로
**기존 학교 자동완성 + 새 학교 직접입력**을 동시에 지원하고, 처음 보는 학교는 `POST /api/rental/schools` 로 조용히 추가되어 다음 사람에게도 보인다.

---

## 5. 데이터 모델

### 5.1 `rental-items` (교구 마스터) — 배열

```jsonc
{
  "id": "it_1756...",               // 'it_' + Date.now() + 2자리 랜덤
  "name": "빔프로젝터(엡손 EB-970)",
  "category": "시청각",             // 시청각/체육/과학/미술/음악/정보/행사/기타
  "emoji": "📽️",                    // 사진 없을 때 썸네일
  "hasPhoto": true,                  // true면 /api/rental/items/:id/photo 사용
  "total": 2,                        // 총 수량
  "trackQty": true,                  // false면 수량 개념 없이 1건씩 (bareun의 isQuantityTracked)
  "owner": {"school":"백암초등학교","name":"권준구","role":"교사"},
  "place": "본관 2층 시청각실",       // 수령 장소
  "note": "삼각대·HDMI 케이블 포함. 램프 예열 5분 필요.",
  "maxDays": 14,                     // 기본 최대 대여일수 (0=무제한)
  "autoApprove": false,              // true면 재고 있고 순번 1번일 때 즉시 승인
  "active": true,                    // false = 목록에서 숨김(삭제 대신)
  "createdAt": "ISO", "updatedAt": "ISO"
}
```

### 5.2 `rental-loans` (신청 = 대여 = 반납, 한 문서로 끝) — 배열

```jsonc
{
  "id": "ln_1756...",
  "seq": 1043,                       // 서버 발급 전역 증가 번호 = 대기열 정렬 키
  "itemId": "it_...",
  "qty": 1,
  "borrower": {"school":"백봉초등학교","name":"김민정","role":"교사"},
  "contact": "010-0000-0000",        // 선택
  "wantFrom": "2026-09-01",          // 사용 시작 희망일 (YYYY-MM-DD 문자열 고정)
  "wantTo":   "2026-09-05",          // 반납 예정일
  "method": "방문",                  // 방문 / 순회차량 / 택배 / 협의
  "memo": "3학년 과학 수업용",
  "status": "requested",             // §6.1
  "readyAt": null,                   // 대기열에서 내 차례가 된 시각 (§6.6)
  "history": [
    {"at":"ISO","status":"requested","by":"백봉초·김민정","note":""}
  ],
  "createdAt":"ISO", "updatedAt":"ISO",
  "decidedAt":null, "decidedBy":null,
  "pickedUpAt":null, "returnRequestedAt":null, "returnedAt":null,
  "rejectReason": null
}
```

### 5.3 `rental-schools`

```jsonc
[{"id":"sc_baekam","name":"백암초등학교","short":"백암초","pinHash":"...","pinSalt":"...",
  "contact":"권준구 교사","pending":false,"createdAt":"ISO"}]
```

### 5.4 `rental-settings`

```jsonc
{
  "title": "소규모 학교 연계 교구 대여소",
  "notice": "택배 발송은 금요일 오전에 모아서 보냅니다.",
  "joinHash":"...","joinSalt":"...",     // 참여코드 (초기값 'school')
  "adminHash":"...","adminSalt":"...",   // 관리자 코드 (초기값 'rental1234')
  "seq": 1043,                            // 전역 순번 카운터
  "categories": ["시청각","체육","과학","미술","음악","정보","행사","기타"],
  "roles": ["교사","교감","교장","교육실무사","늘봄·돌봄","영양(교)사","행정실","기타"],
  "defaultMaxDays": 14,
  "updatedAt": "ISO"
}
```

### 5.5 `rental-audit` — 최근 500건 링버퍼

`{at, actor:"백봉초·김민정·교사", action:"loan.approve", target:"ln_...", detail:"수량 1"}`

### 5.6 Redis 등록 (server.js `KV_KEYS`에 추가)

```js
'rental-items.json':    'rental-items',
'rental-loans.json':    'rental-loans',
'rental-schools.json':  'rental-schools',
'rental-settings.json': 'rental-settings',
'rental-audit.json':    'rental-audit'
```

\+ `defaults/rental-items.json`(`[]`), `rental-loans.json`(`[]`), `rental-schools.json`(`[]`), `rental-settings.json`(위 기본값), `rental-audit.json`(`[]`) 생성.

### 5.7 사진 저장 ★ (items JSON에 절대 넣지 말 것)

- 클라이언트에서 **긴 변 800px, JPEG q0.72 로 리사이즈** → dataURL 이 **150KB 초과면 거부**.
- 저장: Redis **개별 키** `rental-photo:{itemId}` (문자열 dataURL). `KV_KEYS` 를 타지 않으므로 얇은 헬퍼 2개를 `lib/rental.js` 에 둔다.
- 조회: `GET /api/rental/items/:id/photo` → base64 디코드 후 `Content-Type: image/jpeg`, `Cache-Control: public, max-age=604800` 로 바이너리 응답.
- Redis 미연결(로컬)에서는 `data/rental-photos/{id}.jpg` 파일로 폴백.
- 사진은 **선택 사항**. 없으면 이모지 썸네일 — 이게 기본 경로다.

---

## 6. 상태 기계 · 대기열 (이 시스템의 핵심)

### 6.1 7개 상태

| 코드 | 화면 문구 | 물건 위치 | 배지색 |
|---|---|---|---|
| `requested` | `대기 중 · N번째` / (내 차례면) `승인 대기` | 보유교 | 앰버 |
| `approved` | `승인됨 · 아직 안 가져감` | 보유교 | 파랑(옅음) |
| `out` | `대여 중 · ~9/5까지` | 빌린 사람 | 파랑 |
| `return_requested` | `반납 확인 대기` | 이동 중 | 보라 |
| `returned` | `반납 완료` | 보유교 | 초록 |
| `rejected` | `반려됨` (+사유) | 보유교 | 회색 |
| `canceled` | `취소함` | 보유교 | 회색 |

### 6.2 전이표

| 전이 | 트리거 | 권한 | 조건 |
|---|---|---|---|
| — → `requested` | 대여 신청 | 참여자 | `wantFrom ≤ wantTo`, `qty ≥ 1`, 기간 ≤ `maxDays` |
| `requested` → `approved` | 승인 | 보유교 PIN / 관리자 | 가용수량 ≥ qty |
| `requested` → `approved` | **자동 승인** | 시스템 | `item.autoApprove && 순번 1번 && 가용 ≥ qty` |
| `requested` → `rejected` | 반려(사유 필수) | 보유교 PIN | — |
| `requested` → `canceled` | 취소 | 신청자 본인 | — |
| `approved` → `out` | 수령 확인 | 신청자 or 보유교 | — |
| `approved` → `canceled` | 취소 | 신청자/보유교 | 아직 수령 전 |
| `out` → `return_requested` | **반납 신청** | 신청자 | — |
| `return_requested` → `out` | 반납 취소 | 신청자 | 잘못 눌렀을 때 되돌리기 |
| `return_requested` → `returned` | 반납 확인 | 보유교 PIN | 여기서 **재고 복귀** |
| `out`/`return_requested` → `returned` | 강제 반납 | 관리자 | 분실·장기연체 정리용 |

> ⚠️ **`return_requested` 는 아직 재고가 아니다.** 물건이 실제로 손에 들어와야 `returned`.
> 이걸 재고로 계산하면 이중 대여가 발생한다.

### 6.3 가용 수량

```js
const OCCUPYING = ['approved','out','return_requested'];
function availableOf(item, loans){
  const used = loans.filter(l=>l.itemId===item.id && OCCUPYING.includes(l.status))
                    .reduce((s,l)=>s+l.qty,0);
  return Math.max(0, item.total - used);
}
```

### 6.4 대기열 = FIFO(`seq` 오름차순)

```js
function queueOf(itemId, loans){
  return loans.filter(l=>l.itemId===itemId && l.status==='requested')
              .sort((a,b)=>a.seq-b.seq);          // 순번 = seq, 표시는 index+1
}
```

- **머리부터 처리(head-of-line 유지)**: 1번이 5개를 원하는데 2개뿐이면, 3번(2개 희망)을 새치기시키지 않는다.
  대신 보유교/관리자가 **"먼저 승인"** 버튼으로 수동 추월할 수 있고, 이때 감사로그에 `queue.override` 로 남는다.
  (이유: 소규모 학교끼리 쓰는 시스템에서 "내 순번이 왜 밀렸지?"가 가장 큰 불신 요인이다.)
- **부분 승인**: 5개 신청 · 2개 가용 → 승인 모달에서 수량을 2로 낮춰 승인 가능.
  이때 원 신청은 `approved(qty=2)` 가 되고, **잔여 3개짜리 신청이 자동 분할 생성**된다(`seq = 원seq - 0.5`) → 대기열 맨 앞을 지킴.

### 6.5 예상 가능일(ETA) 계산 — 클라이언트 순수 함수

```js
function computeEtas(item, loans, today){
  let free = availableOf(item, loans);
  const releases = loans.filter(l=>l.itemId===item.id && OCCUPYING.includes(l.status))
                        .map(l=>({date:l.wantTo, qty:l.qty}))
                        .sort((a,b)=>a.date.localeCompare(b.date));
  const out = {};
  for(const l of queueOf(item.id, loans)){
    let cursor = today;
    while(free < l.qty && releases.length){
      const r = releases.shift();
      free += r.qty;
      if(r.date > cursor) cursor = r.date;
    }
    if(free < l.qty){ out[l.id] = null; continue; }   // 재고 자체가 부족 → '미정'
    free -= l.qty;
    out[l.id] = cursor;                                // "9/6쯤부터 가능"
    releases.push({date:l.wantTo, qty:l.qty});
    releases.sort((a,b)=>a.date.localeCompare(b.date));
  }
  return out;
}
```

- 날짜는 **`'YYYY-MM-DD'` 문자열 비교**로만 다룬다(`localeCompare`). `new Date()` 파싱은 타임존 함정 — 기존 `CLAUDE.md`에 이미 기록된 사고 유형이다.

### 6.6 자동 승계(내 차례 알림)

`return-confirm` 성공 시 서버가 그 자리에서:

1. 재고 재계산 → 2. 해당 교구 대기열 1번이 `qty` 를 채울 수 있으면 `loan.readyAt = now` 기록
3. 클라이언트는 15초 폴링(또는 창 포커스 시 재조회)에서 `readyAt && status==='requested'` 인 내 신청을 찾아
   상단에 **`🔔 내 차례예요! 빔프로젝터, 지금 승인 요청 중입니다`** 배너 표시.

- 푸시/문자/카톡 알림은 **범위 밖**(§13).

### 6.7 연체

`status ∈ {approved,out}` 이고 `wantTo < 오늘` → 빨강 `연체 N일` 배지. 현황 탭 최상단 "연체 중" 섹션에 모아 보여준다.

---

## 7. UI 설계

### 7.1 디자인 토큰 — **Apple** (출처: 레포 루트 `DESIGN.md`)

`npx getdesign@latest add apple` 로 설치된 `DESIGN.md` 가 단일 출처다. `rental.html` 의 `:root` 는 그 값을 그대로 옮겼다.

| 역할 | 토큰 | 값 |
|---|---|---|
| 유일한 액션 색 | `primary` | `#0066cc` |
| 포커스 링 | `primary-focus` | `#0071e3` |
| 다크 타일 위 링크 | `primary-on-dark` | `#2997ff` |
| 본문 | `ink` | `#1d1d1f` |
| 캔버스 | `canvas` / `canvas-parchment` | `#ffffff` / `#f5f5f7` |
| 다크 타일 | `surface-tile-1/3` | `#272729` / `#252527` |
| 글로벌 내비 | `surface-black` | `#000000` |
| 헤어라인 | `hairline` / `divider-soft` | `#e0e0e0` / `#f0f0f0` |

- **타이포**: SF Pro Display(헤드라인) / SF Pro Text(본문). 본문은 **17px / 400 / 1.47 / -0.374px** — 16px가 아니다.
  헤드라인 `display-lg` 40px/600, 서브내비 타이틀 `tagline` 21px/600.
  한글 폴백은 `Pretendard → Apple SD Gothic Neo → Malgun Gothic`.
- **라운드**: 유틸 버튼 `sm` 8px, Pearl 버튼 `md` 11px, 카드 `lg` 18px, **주 CTA·검색창·칩은 전부 `pill`**.
- **그림자는 딱 하나** — `rgba(0,0,0,.22) 3px 5px 30px 0`, 교구 사진에만 건다. 카드·버튼·글자에는 절대 안 건다.
- **깊이는 면 전환으로** 만든다: 밝은 타일 ↔ `surface-tile-1` 다크 타일. 연체 섹션이 다크 타일인 이유가 이것.
- 누르는 느낌은 전부 `transform: scale(.95)` 하나로 통일.
- 상태색만 Apple 팔레트에 없어서 **Apple 시스템 컬러에서 파생**했다(주황 대기 / 보라 승인 / 파랑 대여중 / 인디고 반납확인대기 / 초록 완료 / 빨강 연체). 배경은 12~14% 틴트, 글자는 진한 톤 — 대비 4.5:1 확보.
- 다크모드는 **하지 않는다**(DESIGN.md도 라이트 지배 시스템으로 문서화되어 있음).
- 아이콘은 SF Symbols 문자 + 이모지. 교구 썸네일은 이모지 또는 사진.

### 7.2 화면 구성 — 모바일 우선, 하단 고정 탭 4개

```
┌────────────────────────────────────────┐
│ 📦 소규모 학교 연계 교구 대여소          │  ← 헤더(고정)
│ 백암초 · 권준구 · 교사        [바꾸기]  │
├────────────────────────────────────────┤
│ 🔔 내 차례예요! 빔프로젝터 → 승인 요청중 │  ← 조건부 배너
├────────────────────────────────────────┤
│                                        │
│              (본문 영역)                │
│                                        │
├────────────────────────────────────────┤
│  📦 둘러보기 │ 🙋 내 대여 │ ➕ 올리기 │ 🧾 현황 │
└────────────────────────────────────────┘
```

데스크톱(≥768px)에서는 하단 탭바 → 상단 가로 탭, 카드 그리드 2~3열.

### 7.3 화면별 상세

**① 📦 둘러보기 (기본)**

```
[검색 🔎 교구 이름]      [전체▾][시청각][체육][과학]…
[ ] 지금 바로 빌릴 수 있는 것만 보기

┌───────────────────────────────────────┐
│ 📽️  빔프로젝터 (엡손 EB-970)           │
│     백암초 · 본관 2층 시청각실           │
│     ● 2개 중 1개 가능        [대여 신청] │
├───────────────────────────────────────┤
│ 🔬  현미경 세트                         │
│     백봉초 · 과학실                      │
│     ● 대기 2명 · 9/8쯤 가능   [대기 걸기] │
└───────────────────────────────────────┘
```

- 카드 한 장에 **보유교 · 상태 · 가능 시점**이 다 보인다. 상세 페이지 없이 **카드 → 신청 모달** 2탭이면 끝.
- 버튼 문구가 상황에 따라 바뀐다: `대여 신청`(즉시 가능) / `대기 걸기`(대기 발생) — 결과를 오해하지 않게.
- 내 학교가 보유교인 카드에는 `[수정] [삭제]` 가 함께 보인다(삭제는 §8.2의 409 규칙 적용).

**② 신청 모달 (한 화면, 스크롤 없이)**

```
빔프로젝터 대여 신청
수량   [－] 1 [＋]  (가능 1개)
언제부터 [2026-09-01]  언제까지 [2026-09-05]   ※ 최대 14일
받는 방법 (•)직접 방문  ( )순회차량  ( )택배  ( )협의
쓸 곳(선택) [3학년 과학 수업]
연락처(선택) [010-...]
────────────────────────────────
신청자: 백봉초 · 김민정 · 교사
[취소]            [신청하기 →]
```

제출 직후 **결과 카드**: `대기 2번째로 등록했어요. 9/8쯤 차례가 올 것 같아요.`
또는 `신청했어요. 백암초 담당자가 승인하면 알려드릴게요.`

**③ 🙋 내 대여** — 내 신원(학교+이름)으로 필터

```
[진행 중]
📽️ 빔프로젝터   대여 중 · 9/5까지        [반납 신청]
🔬 현미경 세트   대기 중 · 2번째          [취소]
🎹 키보드       승인됨 · 아직 안 가져감   [수령했어요][취소]
[지난 기록]  반납 완료 3건 ▾
```

- 버튼은 카드당 **최대 2개**. 상태별로 가능한 행동만 노출(불가능한 버튼은 아예 안 그림).

**④ ➕ 올리기 — 등록 화면 = 한 장 폼**

```
무엇을 올리나요?  [빔프로젝터(엡손 EB-970)]
분류 [시청각▾]     아이콘 [📽️] 💡빠른 이모지 📦📽️🔬⚽🎹🎨💻
사진 (선택) [📷 사진 고르기]        ← 자동 축소, 없으면 이모지 사용
수량 [－] 2 [＋]   □ 수량 관리 안 함(1건씩 대여)
어디서 받나요 [본관 2층 시청각실]
최대 며칠 [14]     □ 신청 오면 자동 승인
알아둘 점 [삼각대·HDMI 케이블 포함]
────────────────────────────────
올리는 사람: 백암초 · 권준구 · 교사
                      [교구 올리기]
```

- 필수는 **이름 · 수량 · 보유 장소** 3개뿐. 나머지는 전부 선택.

**⑤ 🧾 현황(대기열)** — 연계의 투명성을 담당하는 화면

```
🔴 연체 중 (1)
   🎹 키보드 · 백봉초 김민정 · 3일 지남         [연락처 보기]

📽️ 빔프로젝터 (백암초 · 2개)
   ▸ 지금: 백봉초 김민정 1개 (~9/5)
   ▸ 1번 대기: 장평초 이수현 1개 (9/6~9/9)  [승인][반려]  ← 보유교에게만
   ▸ 2번 대기: 백봉초 박지훈 2개 (미정)
```

- 승인/반려 버튼은 **내 학교가 보유교일 때만** 노출되고, 누르면 **학교 PIN 모달**(1회 입력 후 30분 기억).

**⑥ 관리자** — 현황 탭 하단 `🔒 운영 관리` → 관리자 코드 → 학교/코드/공지/강제반납/CSV.

### 7.4 문구 원칙 (요구 #11 "모두가 바로 이해")

- 버튼은 **동사 한 개**: `대여 신청` `반납 신청` `승인` `반려` `취소` `교구 올리기`.
- 시스템 용어 금지: `트랜잭션`·`큐`·`pending` → `대기열`·`대기 중`·`N번째`.
- 빈 화면마다 다음 행동을 적는다: `아직 올라온 교구가 없어요. ➕ 올리기에서 첫 교구를 올려보세요.`
- 파괴적 행동은 **무엇이 사라지는지 이름을 적어 확인**: `'빔프로젝터'를 목록에서 지울까요? 지난 대여 기록은 남습니다.`
- 성공은 토스트 2.5초(`bareun` 방식), 실패는 붉은 인라인 문구로 **입력 필드 옆**에.

### 7.5 접근성

- 모든 상태를 **색 + 글자**로 이중 표기(색각 이상 대응). 배지는 `● 대여 중` 처럼 도형+텍스트.
- `<a>`/`<button>` 시맨틱 유지, 모달은 `role="dialog" aria-modal="true"` + 포커스 트랩 + ESC 닫기.
- 최소 글자 16px, 대비 4.5:1 이상. 클레이 `#D97757` 위 흰 글자는 대비가 모자라므로 **채워진 버튼 배경은 `#BE5F42`** 를 쓴다.

---

## 8. API 명세 (`/api/rental/*`)

구현 위치: **`lib/rental.js` 새 모듈** — `server.js` 비대화를 막는다.

```js
// server.js (라우트 등록부 근처)
require('./lib/rental')(app, { readData, writeData, redis, IS_VERCEL,
                               hashPassword, verifyPassword, generateToken });
```

### 8.1 공통 규약

- **인증 헤더 없음.** 초안은 완전 개방이라 `X-Rental-Token` / `pin` / 관리자 토큰을 쓰지 않는다.
  아래 표의 "권한" 열은 **전부 '누구나'** 로 읽으면 된다(열은 나중에 잠글 때를 위해 남겨 둠).
- 모든 쓰기 요청 body 에 `actor: {school, name, role}` 를 넣는다. 감사 로그에만 쓰이고 검증은 하지 않는다.
- 모든 쓰기 응답은 `{ok:true, items?, loans?}` — **바뀐 컬렉션 전체를 돌려준다**(재조회 왕복 절감).
- 에러 포맷 `{error:"사람이 읽는 한국어 문장"}` — 프론트는 이걸 그대로 토스트에 노출.
- 미구현(잠글 때 추가): `POST /enter`, `POST /admin/login`, `/admin/schools`, `/admin/settings`, `/admin/audit`.
  현재는 `POST /api/rental/schools`(학교 추가)와 `GET /api/rental/export.csv`(이력)만 공개되어 있다.

### 8.2 엔드포인트

| 메서드 | 경로 | 권한 | 설명 |
|---|---|---|---|
| GET | `/api/rental/config` | 공개 | 제목/공지/학교목록(이름만)/분류/직 목록. **해시는 절대 반환 금지** |
| POST | `/api/rental/enter` | 공개 | `{code}` → `{token}` (Redis `rental-session:{t}`, TTL 30d) |
| GET | `/api/rental/state` | 참여자 | `{items, loans, schools, rev, serverDate}` — 진행 중 전부 + 완료건 최근 90일 |
| POST | `/api/rental/items` | 참여자 | 교구 등록. 사진은 `photoDataUrl` 별도 필드 |
| PATCH | `/api/rental/items/:id` | 학교 PIN | 이름/수량/장소/메모/이모지/사진/`active` 수정 |
| DELETE | `/api/rental/items/:id` | 학교 PIN | 진행 중 대여 있으면 `409 '아직 대여 중인 건이 있어 지울 수 없어요. 먼저 반납을 확인해 주세요.'` |
| GET | `/api/rental/items/:id/photo` | 공개 | JPEG 바이너리, 7일 캐시 |
| POST | `/api/rental/loans` | 참여자 | 대여 신청 → `seq` 발급, `autoApprove` 조건이면 즉시 `approved` |
| POST | `/api/rental/loans/:id/cancel` | 신청자 | `requested`/`approved` 에서만 |
| POST | `/api/rental/loans/:id/approve` | 학교 PIN | `{qty?}` 부분 승인, `{override:true}` 순번 추월 |
| POST | `/api/rental/loans/:id/reject` | 학교 PIN | `{reason}` 필수 |
| POST | `/api/rental/loans/:id/pickup` | 신청자/보유교 | `approved → out` |
| POST | `/api/rental/loans/:id/return-request` | 신청자 | `out → return_requested` |
| POST | `/api/rental/loans/:id/return-cancel` | 신청자 | 되돌리기 |
| POST | `/api/rental/loans/:id/return-confirm` | 학교 PIN | `→ returned`, 재고 복귀 + 다음 차례 `readyAt` 기록 |
| POST | `/api/rental/loans/:id/force-return` | 관리자 | 분실/장기연체 정리 |
| POST | `/api/rental/admin/login` | 공개 | `{code}` → 관리자 토큰(TTL 12h) |
| GET/POST/DELETE | `/api/rental/admin/schools` | 관리자 | 학교 등록·PIN 재설정·승인 |
| POST | `/api/rental/admin/settings` | 관리자 | 제목/공지/참여코드·관리자코드 변경/분류 |
| GET | `/api/rental/admin/audit` | 관리자 | 최근 500건 |
| GET | `/api/rental/admin/export.csv` | 관리자 | 대여 이력 CSV(UTF-8 **BOM 포함** — 엑셀 한글 깨짐 방지) |

### 8.3 검증 규칙(서버에서 반드시)

- `name` 1~60자, `qty` 1~999 정수, `total` 1~999
- `wantFrom/wantTo` 정규식 `^\d{4}-\d{2}-\d{2}$`, `wantFrom ≤ wantTo`, 기간 ≤ `item.maxDays`(0이면 무제한)
- `borrower.school/name` 1~30자 필수, `role` 1~20자
- 사진 dataURL ≤ 200,000자 & `data:image/jpeg;base64,` 또는 `data:image/png;base64,` 접두만 허용
- **모든 문자열은 저장 전 `trim()`**, 출력은 프론트에서 `esc()` (기존 `public/index.html` 의 `esc()` 이식)

---

## 9. 서버 구현 지침 (`lib/rental.js`)

### 9.1 동시성 락 ★ 필수

Redis 전체-JSON read-modify-write 구조라 **두 학교가 동시에 승인하면 한쪽 기록이 통째로 사라진다.**

```js
async function withLock(fn){
  if(!redis) return fn();                       // 로컬 파일 모드는 단일 프로세스
  const token = generateToken().slice(0,16);
  for(let i=0;i<25;i++){
    const got = await redis.set('rental:lock', token, {nx:true, ex:5});
    if(got){
      try { return await fn(); }
      finally { const cur = await redis.get('rental:lock'); if(cur===token) await redis.del('rental:lock'); }
    }
    await new Promise(r=>setTimeout(r,120));    // 최대 약 3초 대기
  }
  throw new Error('다른 사람이 동시에 처리 중이에요. 잠시 후 다시 눌러 주세요.');
}
```

**모든 쓰기 라우트를 `withLock` 으로 감싼다.** 읽기(`/state`)는 감싸지 않는다.

### 9.2 재고 재검증

승인 시점에 **클라이언트가 계산한 가용수량을 믿지 않는다.** 락 안에서 `availableOf()` 를 다시 계산해
부족하면 `409 '방금 다른 학교가 먼저 가져갔어요. 대기열 순번은 그대로 유지됩니다.'`

### 9.3 순번 발급

`rental-settings.seq` 를 락 안에서 `+1` 하고 같이 저장. (Redis `INCR` 은 `KV_KEYS` 경로와 어긋나므로 쓰지 않음.)

### 9.4 보관 정책

`rental-loans` 는 무한 증가한다. 쓰기마다
`returned/rejected/canceled` 이면서 `updatedAt` 이 **2년 초과**인 건을 배열에서 제거한다(그 전에 CSV로 내보내라는 안내를 관리자 화면에 상시 노출).

### 9.5 감사 로그

모든 상태 전이 후 `rental-audit` 에 push, 500건 초과 시 앞에서 자름.

---

## 10. 파일 변경 목록 (구현 체크리스트)

### 신규

| 파일 | 내용 |
|---|---|
| `public/rental.html` | 대여소 SPA 전체 (단일 파일, Tailwind CDN + vanilla JS. **React/Babel 쓰지 않음** — AIroom 나머지와 일관되고 CDN Babel은 초기 렌더가 느리다) |
| `lib/rental.js` | 라우트 + 락 + 상태기계 + 사진 저장 (`module.exports = (app, deps) => {...}`) |
| `defaults/rental-items.json` / `-loans.json` / `-schools.json` / `-settings.json` / `-audit.json` | 초기값 |

### 수정

| 파일 | 위치 | 변경 |
|---|---|---|
| `server.js` | `KV_KEYS` 블록 | 대여소 키 5개 추가 |
| `server.js` | `app.get('/admin')` 위(1502) | `app.get(['/rental','/rental/'])` |
| `server.js` | 라우트 등록부 | `require('./lib/rental')(app, {...})` |
| `public/index.html` | `1852` `DEFAULT_TABS` | `{id:'rental',type:'link',href:'https://a-iroom.vercel.app/rental',...}` |
| `public/index.html` | `2204` `switchPage` | 링크 탭 가드 1줄 |
| `public/index.html` | `4574` `renderTabs` | `type==='link'` → `<a>` 분기 |
| `public/index.html` | CSS 블록 | `.main-tab.tab-link` 스타일 |
| `defaults/tabs.json` | 배열 끝 | 동일 탭 항목 |
| `README.md` | 경로 표 | `/rental` 행 추가 |
| `CLAUDE.md` | — | 대여소 섹션 + 함정 이관 |

### 단계 (초안 진행 상황)

- ✅ **P0** `lib/rental.js` + defaults 5종 + KV_KEYS + `/rental` 라우트 + `GET /state`
- ✅ **P1** 신원 카드 · 둘러보기 · 교구 올리기(사진 리사이즈 포함) · 수정 · 삭제
- ✅ **P2** 대여 신청 · 대기열 · 승인/반려 · 부분 승인 분할 · 수령 · 반납 신청/확인 · ETA · 내 차례 배너
- ✅ **P3** 현황 탭 · 연체 · 강제 반납 · CSV 내려받기
- ✅ **P4-a** 메인 SPA 링크 탭 연결 (`DEFAULT_TABS` / `renderTabs` / `switchPage` / CSS / `defaults/tabs.json`)
- ⏳ **P4-b 남은 일** — Vercel 배포 후 실제 확인, GH Pages에서 탭 클릭 확인, 모바일 실기기(아이폰 사파리) 확인,
  Upstash Redis 환경에서의 락 동작 확인(로컬은 파일 모드라 락이 no-op으로 지나감)

### 로컬 검증 결과 (2026-08-27, 파일 모드)

`node server.js` + API 시나리오 11종 통과:
등록 → 신청 → 승인 → 수령 → 2개 신청 → **재고 부족 409** → **부분 승인 후 잔여분 seq 1001.5로 대기열 선두 유지** →
반납 신청 → 반납 확인 시 **다음 차례 `readyAt` 자동 부여** → 대여 중 삭제 409 차단 → `/state` 정상.
CSV는 BOM 포함으로 한글 정상. `/rental` 200. `rental.html` 스크립트 문법 검사 통과.

---

## 11. ⚠️ 함정 (이 레포에서 이미 데인 것 포함)

1. **수정 대상은 `public/index.html`.** 루트 `index.html` 은 static 미들웨어에 가려 서빙되지 않는다.
2. **GitHub Pages에는 서버가 없다.** 링크 탭 href는 절대 URL. 상대경로면 미러에서 404.
3. **`return_requested` 를 재고로 계산하지 말 것.** 이중 대여의 원인.
4. **락 없이 전체 JSON 저장 금지.** 동시 승인 시 대여 기록이 통째로 날아간다.
5. **사진 dataURL을 `rental-items` 배열에 넣지 말 것.** Upstash 요청 크기 초과로 목록 저장 전체가 실패한다. 반드시 별도 키.
6. **날짜는 문자열 비교만.** `new Date('2026-09-01')` 은 UTC 파싱 → 한국 기준 하루 밀림(기존 `lib/hwpx.js` 에서 겪은 버그와 같은 유형).
7. **Vercel은 서버리스** — 인메모리 변수는 요청 간 유지되지 않는다. 세션·순번·락 전부 Redis.
8. **`switchPage()` 에 없는 페이지 id를 넘기면 본문이 백지**가 된다(모든 `.page` 를 끄고 켤 대상이 없음). 링크 탭 가드 필수.
9. **초안은 완전 개방이다.** 링크를 아는 사람은 누구나 승인·삭제까지 할 수 있다. 외부에 URL을 뿌리기 전에 §4.2의 잠금 방법을 먼저 적용할 것.
10. **CSV는 UTF-8 BOM** 없이 내보내면 엑셀에서 한글이 깨진다.
11. `tabsConfig` 는 이미 Redis에 저장돼 있어 새 탭은 **맨 뒤 order** 로 붙는다. 위치를 옮기려면 관리 모드의 ◀▶ 버튼을 쓴다.
12. 한글 IME 조합 중 `input` 이벤트로 검증하면 글자가 튄다 → 검색은 `compositionend` + 디바운스 250ms.

---

## 12. 테스트 시나리오 (P4 검증표)

| # | 시나리오 | 기대 |
|---|---|---|
| 1 | 백암초가 빔프로젝터 2개 등록 | 둘러보기에 `2개 중 2개 가능` |
| 2 | 백봉초 1개 신청 → 백암초 승인 → 수령 | `1개 중 1개 가능`, 백봉초 화면 `대여 중` |
| 3 | 장평초 2개 신청 | `대기 1번째`, ETA = 백봉초 `wantTo` |
| 4 | 백봉초 반납 신청 → 백암초 확인 | 재고 2 복귀, 장평초에 `🔔 내 차례` 배너 |
| 5 | 두 브라우저에서 **동시에 승인** | 한쪽만 성공, 다른 쪽은 안내 문구. 기록 유실 0 |
| 6 | 5개 신청 · 2개 가용 → 부분 승인 2 | `approved(2)` + 잔여 3짜리 신청이 대기열 **맨 앞** 유지 |
| 7 | `wantTo` 지난 대여 | 빨강 `연체 N일`, 현황 탭 최상단 |
| 8 | 대여 중인 교구 삭제 시도 | 409 + 안내 문구, 목록 그대로 |
| 9 | 참여코드 변경 후 기존 사용자 | 재입력 요구, 데이터 정상 |
| 10 | GH Pages에서 탭 클릭 | vercel `/rental` 로 이동 |
| 11 | 아이폰 사파리 375px | 하단 탭바 안 겹침, 버튼 48px 이상, 사진 촬영 업로드 동작 |
| 12 | Redis 끊김 | `/state` 는 파일 폴백, 쓰기는 `저장 실패 — 잠시 후 다시` 안내(무음 실패 금지) |

---

## 13. 범위 밖 (지금은 안 함)

- 카카오/문자/이메일 알림 → 화면 배너 + 현황 탭으로 대체
- 예약 캘린더 뷰(월간 그리드) → 2차
- 교구 QR 라벨 스캔 대여 → 2차 (단, `item.id` 는 QR 인코딩 가능한 형태로 이미 설계됨)
- 파손·분실 신고 워크플로 → 지금은 `history` 메모로 갈음
- AIroom 메인 로그인과의 SSO → 의도적으로 분리(타 학교 사람이 백암초 접근코드를 알 필요가 없다)
- 다크 모드

---

## 14. 다음 모델에게

1. 이 문서 → `CLAUDE.md`(Redis/HWPX 함정) → `public/index.html:1852~` 순으로 읽는다.
2. **P0을 먼저 배포해 `/rental` 이 빈 화면이라도 뜨는지 확인**한 뒤 UI를 붙인다(Vercel 라우팅이 첫 관문).
3. 커밋 메시지에 **AI 공동작성자 표기는 넣지 않는다.**
4. `public/rental.html` 은 단일 파일로 커지므로, 섹션 주석(`// ===== 대기열 =====`)을 기존 `index.html` 스타일 그대로 유지한다.
