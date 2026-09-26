"""서버 API를 켠 v2 — 저장·생성의 네트워크 고장 검사 (ST05·UI08·ST04 서버 경로).

사용: VIBE_V2_API=1 VIBE_SESSION_SECRET=<32자+> PORT=3102 node server.js
      python network_check.py http://127.0.0.1:3102
항목: 정상 동기화(학급) → 서버 500(이 기기) → 오프라인 편집·AI 요청(작품 그대로) → 복구(online 이벤트로 학급 동기화)
      → AI 429(안내) → 새로고침 재접속(같은 서버 작품에 PUT, 새 작품 POST 없음). 결과: network-check.json
"""
import json, sys, re
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE = (sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:3102").rstrip("/") + "/vibe-v2/?studioDebug=1"
OUT = Path(__file__).resolve().parent
res, api, errs = {}, [], []


def badge(pg):
    return pg.locator(".v2-savebadge").inner_text().replace("\n", " ").strip()


def kind(p, k):
    return next(n for n in p["program"]["nodes"] if n["kind"] == k)


def proj(pg):
    return pg.evaluate("__vibeStudio.store.getProject()")


def win_click(pg, label):
    tab = pg.locator(".ws-tab[data-pane=editor]")
    if tab.is_visible() and tab.get_attribute("aria-selected") != "true":
        tab.click()
    wid = kind(proj(pg), "winWhen")["id"]
    pg.locator(".st-rule[data-node=%s] button" % wid, has_text=label).first.click()


def ask(pg, text):
    tab = pg.locator(".ws-tab[data-pane=assist]")
    if tab.is_visible() and tab.get_attribute("aria-selected") != "true":
        tab.click()
    pg.locator(".st-ai textarea").fill(text)
    pg.get_by_role("button", name="AI에게 부탁하기").click()


def wait_badge(pg, text, ms=8000):
    pg.wait_for_function("t => document.querySelector('.v2-savebadge')?.innerText.includes(t)", arg=text, timeout=ms)


def check(name, ok, **info):
    res[name] = {"pass": bool(ok), **info}
    print(("PASS " if ok else "FAIL ") + name, json.dumps(info, ensure_ascii=False)[:300])


with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={"width": 1366, "height": 768}, locale="ko-KR")
    pg = ctx.new_page()
    pg.on("response", lambda r: api.append("%s %s %d" % (r.request.method, re.sub(r"[pj]_[\w-]+", ":id", r.url.split("/api/vibe")[1].split("?")[0]), r.status)) if "/api/vibe" in r.url else None)
    pg.on("console", lambda m: errs.append(m.text[:200]) if m.type == "error" and "Failed to load resource" not in m.text else None)
    pg.on("pageerror", lambda e: errs.append(str(e)[:200]))
    pg.goto(BASE, wait_until="networkidle")
    pg.evaluate("localStorage.setItem('vibe2_pref_grade', JSON.stringify('mid'))")
    pg.reload(wait_until="networkidle")
    pg.click(".path-card[data-path='make']")
    pg.get_by_role("button", name="받기 게임 만들기 시작").click()
    pg.wait_for_selector(".st-rule")

    win_click(pg, "15점")
    wait_badge(pg, "학급에 저장됨")
    check("정상: 편집 → 학급 서버 저장", True, badge=badge(pg))

    # 서버 500 → 이 기기에만 (거짓 '학급' 표시 금지)
    pg.route("**/api/vibe/projects/**", lambda r: r.fulfill(status=500, content_type="application/json", body='{"error":{"code":"INTERNAL","message":"x","retryable":true,"retryAfterMs":null,"requestId":""}}'))
    win_click(pg, "20점")
    wait_badge(pg, "이 기기에 저장됨")
    check("서버 500: 편집은 이 기기에 저장, 학급 저장으로 표시하지 않음", "학급" not in badge(pg), badge=badge(pg))
    pg.unroute("**/api/vibe/projects/**")

    # 오프라인: 편집 + AI 요청
    ctx.set_offline(True)
    pg.evaluate("window.dispatchEvent(new Event('offline'))")
    win_click(pg, "15점")
    wait_badge(pg, "이 기기에 저장됨")
    before = proj(pg)
    ask(pg, "조금 더 천천히 떨어지게 해줘")
    pg.wait_for_selector(".st-note[data-tone=warn]:not([hidden])", state="attached", timeout=15000)
    note = pg.locator(".st-note").inner_text().replace("\n", " / ")
    after = proj(pg)
    check("오프라인: AI 요청 실패 안내, 작품 그대로", before == after and "인터넷" in note, note=note[:120], badge=badge(pg))

    # 복구 → online 이벤트로 학급 동기화
    ctx.set_offline(False)
    pg.evaluate("window.dispatchEvent(new Event('online'))")
    wait_badge(pg, "학급에 저장됨", 12000)
    check("복구: online 이벤트로 밀린 저장이 학급 서버에 반영", True, badge=badge(pg))

    # AI 429
    pg.route("**/api/vibe/generations", lambda r: r.fulfill(status=429, content_type="application/json", body='{"error":{"code":"RATE_LIMITED","message":"AI 요청이 많아요. 잠시 뒤에 다시 해 보세요.","retryable":true,"retryAfterMs":5000,"requestId":""}}'))
    before = proj(pg)
    ask(pg, "조금 더 천천히 떨어지게 해줘")
    pg.wait_for_selector(".st-note[data-tone=warn]:not([hidden])", state="attached", timeout=15000)
    note = pg.locator(".st-note").inner_text().replace("\n", " / ")
    check("AI 429: 기다리라는 안내, 작품 그대로", proj(pg) == before and "많아요" in note, note=note[:120])
    pg.unroute("**/api/vibe/generations")

    # AI 정상(서버 규칙 경로) → 적용
    ask(pg, "조금 더 천천히 떨어지게 해줘")
    pg.wait_for_selector(".st-compare:not([hidden])", timeout=20000)
    pg.locator("[data-cmp=apply]").click()
    pg.wait_for_function("() => __vibeStudio.store.getProject().program.nodes.find(n => n.kind === 'spawner').args.speed < 140", timeout=10000)
    wait_badge(pg, "학급에 저장됨")
    rev = proj(pg)["revision"]
    pid = proj(pg)["id"]
    check("AI 서버 경로: 비교 → 적용 → 학급 저장", True, revision=rev)

    # 재접속: 새로고침 → 이어서 만들기 → 편집 → 같은 서버 작품에 PUT (POST 새로 만들기 없음)
    n_post = sum(1 for a in api if a.startswith("POST /projects "))
    pg.reload(wait_until="networkidle")
    pg.get_by_role("button", name="이어서 만들기").click()
    pg.wait_for_selector(".st-rule")
    reopened = proj(pg)
    b0 = badge(pg)
    win_click(pg, "20점")
    wait_badge(pg, "학급에 저장됨")
    n_post2 = sum(1 for a in api if a.startswith("POST /projects "))
    check("재접속: 같은 작품·같은 서버 id로 이어서 저장", reopened["id"] == pid and reopened["revision"] == rev and n_post2 == n_post and "학급" in b0,
          reopenBadge=b0, posts=[n_post, n_post2])
    pg.screenshot(path=str(OUT / "network-reconnected-1366x768.png"))
    b.close()

res["_api"] = api
res["_consoleErrors"] = errs
(OUT / "network-check.json").write_text(json.dumps(res, ensure_ascii=False, indent=2), encoding="utf-8")
fails = [k for k, v in res.items() if not k.startswith("_") and not v["pass"]]
print("console errors:", errs)
sys.exit(1 if fails or errs else 0)
