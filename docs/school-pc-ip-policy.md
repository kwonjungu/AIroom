# 교내 PC에서 IP를 자동으로 가져오게 하는 방법 (정보 담당 선생님용)

「함께 만드는 문서 → IP 대장」에서 **아무 조작 없이 그 PC의 IP가 채워지게** 하려면
브라우저 정책 하나만 열어주면 됩니다. 아래 내용을 그대로 적용하시면 됩니다.

---

## 왜 기본값으로는 안 되나

크롬·엣지는 2020년부터 웹페이지가 내부 IP(192.168.x.x)를 읽는 것을 막습니다.
광고 추적에 쓰이던 수법이라 브라우저가 주소를 `abcd-1234.local` 같은 가짜 이름으로 바꿔 버립니다.
버그가 아니라 의도된 차단이라, 웹페이지 코드로는 우회할 방법이 없습니다.

다만 **관리자가 "이 사이트는 허용" 이라고 지정하면 원래대로 알려줍니다.**
그 지정이 아래 정책입니다.

---

## 적용할 정책

정책 이름: `WebRtcLocalIpsAllowedUrls`
허용할 주소: `https://a-iroom.vercel.app`, `https://kwonjungu.github.io`

### 방법 A — 레지스트리 (PC 몇 대만, 가장 빠름)

아래를 메모장에 붙여넣고 `ip대장허용.reg` 로 저장한 뒤 더블클릭 → 예 → **크롬 완전히 종료 후 재실행**.

```reg
Windows Registry Editor Version 5.00

[HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Google\Chrome\WebRtcLocalIpsAllowedUrls]
"1"="https://a-iroom.vercel.app"
"2"="https://kwonjungu.github.io"

[HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Microsoft\Edge\WebRtcLocalIpsAllowedUrls]
"1"="https://a-iroom.vercel.app"
"2"="https://kwonjungu.github.io"
```

> 관리자 권한이 필요합니다. 엣지를 안 쓰면 아래 블록은 지워도 됩니다.

### 방법 B — 그룹 정책(GPO), 학교 전체에 배포할 때

1. 크롬 관리 템플릿(ADMX) 설치 — `chrome.admx`, `chrome.adml`
2. 컴퓨터 구성 → 관리 템플릿 → Google Chrome
3. **"로컬 IP 주소를 노출할 수 있는 URL"**(WebRtcLocalIpsAllowedUrls) → 사용 → 위 두 주소 추가

### 방법 C — Google 관리 콘솔 (학교 계정으로 크롬 관리 중이면)

기기 → Chrome → 설정 → 사용자 및 브라우저 → `WebRtcLocalIpsAllowedUrls` 검색 → 위 두 주소 입력

---

## 적용 후 어떻게 되나

IP 대장에서 **🔍 내 IP 확인**을 누르면 **누르는 즉시 IP 칸이 채워집니다.**
사용자는 장소·기기 종류만 적고 `➕ 행 추가`를 누르면 끝입니다.

### 확인 방법

크롬 주소창에 `chrome://policy` → `WebRtcLocalIpsAllowedUrls` 항목이 보이면 적용된 것입니다.
안 보이면 크롬을 완전히 종료(작업 관리자에서 프로세스까지)했다가 다시 켜 보세요.

---

## 정책을 못 쓰는 경우

정책 적용이 어려우면 지금처럼 **명령 한 줄**로 하시면 됩니다. 창을 긁을 필요는 없습니다.

1. 모달의 **명령 복사** 클릭 (`cmd /c "ipconfig /all | clip"` 가 복사됩니다)
2. **⊞Win+R** → **Ctrl+V** → Enter (검은 창이 잠깐 떴다 사라짐)
3. 모달의 상자에 **Ctrl+V**

이 방법은 IP뿐 아니라 **서브넷 마스크·게이트웨이·MAC 주소까지** 한 번에 채워집니다.
정책을 적용해도 브라우저가 알려주는 건 IP 하나뿐이라, MAC까지 적는 대장이라면
오히려 이 방법이 낫습니다.
