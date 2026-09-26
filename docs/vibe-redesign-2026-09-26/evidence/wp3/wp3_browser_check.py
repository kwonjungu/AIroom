"""WP3 게임 공방 브라우저 점검 (Python Playwright + 설치된 Chrome, headless).

사용: PORT=4833 node server.js  →  python wp3_browser_check.py http://localhost:4833 [--quick]
- 실제 /vibe-v2/ 앱(홈 → 공방 → 작업 화면)으로 ST01~ST06 + 옛 게임 열기
- AI는 mock(generation-mock). 실패 시나리오는 모드 개발 훅 ?studioMock=<scenario> 로 주입. mock 성공은 모델 합격이 아니다.
- 1366x768 / 1024x768(터치) / 768x1024(터치) 스크린샷, 48px 미만 조작·가로 넘침·콘솔 오류 측정
- 60초 플레이 중 rAF 간격 p50/p95 (모드 내부 기록 + 페이지 독립 rAF 기록)
외부 API 호출 없음. 결과: browser-check.json
"""

import json
import sys
import time
from pathlib import Path
from playwright.sync_api import sync_playwright

ARGS = [a for a in sys.argv[1:] if not a.startswith("--")]
QUICK = "--quick" in sys.argv
BASE = (ARGS[0] if ARGS else "http://localhost:4833").rstrip("/") + "/vibe-v2/"
OUT = Path(__file__).resolve().parent
CHROME = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
VIEWS = [("1366x768", 1366, 768, False), ("1024x768", 1024, 768, True), ("768x1024", 768, 1024, True)]
results = {"base": BASE, "when": time.strftime("%Y-%m-%d %H:%M:%S"), "scenarios": {}, "views": {}, "console": []}


def new_page(browser, w=1366, h=768, touch=False, query="", grade="mid"):
    ctx = browser.new_context(viewport={"width": w, "height": h}, has_touch=touch, device_scale_factor=1)
    pg = ctx.new_page()
    logs = []

    def on_console(m):
        if m.type in ("error", "warning"):
            url = (m.location or {}).get("url", "")
            if "favicon" in url:
                return  # 앱 index.html에 아이콘이 없어서 나는 404 (WP3 범위 밖, 통합 요청으로 보고)
            logs.append(f"{m.type}: {m.text} @ {url}")

    pg.on("console", on_console)
    pg.on("pageerror", lambda e: logs.append(f"pageerror: {e}"))
    pg.goto(BASE + "?studioDebug=1" + query)
    pg.evaluate("g => { localStorage.clear(); localStorage.setItem('vibe2_pref_grade', JSON.stringify(g)); }", grade)
    pg.evaluate("() => new Promise(r => { const q = indexedDB.deleteDatabase('airoom-vibe2'); q.onsuccess = q.onerror = q.onblocked = () => r(); })")
    pg.reload()
    return ctx, pg, logs


def open_catch(pg):
    pg.get_by_role("button", name="말과 블록으로 만들기").first.click()
    pg.get_by_role("button", name="생선 받기 만들기 시작").click()
    pg.wait_for_selector(".st-rule")


def open_genre(pg, genre):
    """작업 화면 안 '새 게임 만들기'로 다른 장르 작품을 연다 (catalog 연결 전에도 앱 안에서 가능한 경로)."""
    if not pg.locator(".st-new").count():
        open_catch(pg)
    if genre == "fixture-catch":
        return
    show_editor(pg)
    det = pg.locator("details.st-new")
    if not det.get_attribute("open") is not None:
        pg.locator("details.st-new > summary").click()
    pg.locator(f"[data-new={genre}]").click()
    pg.wait_for_function("g => document.querySelector('.ws-title')?.textContent && window.__vibeStudio?.store.getProject().templateId === g", arg=genre)
    pg.wait_for_selector(".st-rule")


def show_editor(pg):
    tab = pg.locator(".ws-tab[data-pane=editor]")
    if tab.is_visible() and tab.get_attribute("aria-selected") != "true":
        tab.click()


def show_assist(pg):
    tab = pg.locator(".ws-tab[data-pane=assist]")
    if tab.is_visible() and tab.get_attribute("aria-selected") != "true":
        tab.click()


def show_stage(pg):
    tab = pg.locator(".ws-tab[data-pane=stage]")
    if tab.is_visible() and tab.get_attribute("aria-selected") != "true":
        tab.click()


def dbg(pg):
    return pg.evaluate("__vibeStudio.debug()")


def proj(pg):
    return pg.evaluate("__vibeStudio.store.getProject()")


def node(p, nid):
    return next((n for n in p["program"]["nodes"] if n["id"] == nid), None)


def ask_ai(pg, text=None, chip=None):
    show_assist(pg)
    if chip:
        pg.locator(f".st-chip[data-chip='{chip}']").click()
    else:
        pg.locator(".st-ai textarea").fill(text)
    pg.get_by_role("button", name="AI에게 부탁하기").click()


def measure(pg):
    return pg.evaluate("""() => {
      const de = document.documentElement;
      const small = [];
      for (const el of document.querySelectorAll('.v2 button, .v2 [role=tab], .v2 input, .v2 textarea, .v2 summary, .v2 select')) {
        if (el.closest('[hidden]') || el.classList.contains('v2-skip')) continue;
        const r = el.getBoundingClientRect();
        if (!r.width || !r.height) continue;
        if (getComputedStyle(el).visibility === 'hidden') continue;
        if (r.width < 47.5 || r.height < 47.5) small.push(`${(el.getAttribute('aria-label') || el.textContent || el.tagName).trim().slice(0, 18)} ${Math.round(r.width)}x${Math.round(r.height)}`);
      }
      const over = [];
      for (const el of document.querySelectorAll('.v2 *')) {
        if (el.closest('[hidden]')) continue;
        const r = el.getBoundingClientRect();
        if (r.width && r.right > de.clientWidth + 1) over.push(String(el.className || el.tagName).slice(0, 40));
      }
      const ws = document.querySelector('[data-workspace]');
      const cv = document.querySelector('.st-canvas')?.getBoundingClientRect();
      const ed = document.querySelector('.ws-editor:not([hidden]), .ws-assist:not([hidden])')?.getBoundingClientRect();
      const pad = document.querySelector('.st-pad:not([hidden])')?.getBoundingClientRect();
      const overlapPadEditor = !!(pad && ed && pad.right > ed.left && pad.left < ed.right && pad.bottom > ed.top && pad.top < ed.bottom);
      return {
        layout: ws?.dataset.layout, fit: ws?.dataset.fit,
        overflowX: de.scrollWidth > de.clientWidth, overflowEls: [...new Set(over)].slice(0, 5),
        smallCount: small.length, small: small.slice(0, 10),
        canvas: cv ? `${Math.round(cv.width)}x${Math.round(cv.height)}` : null,
        padVisible: !!pad, padOverlapsEditor: overlapPadEditor,
        dockButtons: [...document.querySelectorAll('.st-dock button')].map(b => b.textContent.trim()),
        bodyFont: getComputedStyle(document.querySelector('.st-rule__text') || document.body).fontSize,
      };
    }""")


def check(name, ok, **info):
    results["scenarios"][name] = {"pass": bool(ok), **info}
    print(("PASS " if ok else "FAIL ") + name, json.dumps(info, ensure_ascii=False)[:400])


def run(p):
    browser = p.chromium.launch(executable_path=CHROME)

    # ── ST01: 네 장르 템플릿 → 플레이 → 재시작 ──
    ctx, pg, logs = new_page(browser)
    st01 = {}
    for genre in ["fixture-catch", "catch", "avoid", "collect", "maze"]:
        open_genre(pg, genre)
        pg.locator("[data-dock=play]").click()
        pg.wait_for_selector(".st-overlay:not([hidden]) >> text=시작하기")
        pg.screenshot(path=str(OUT / f"st01-{genre}-ready-1366x768.png"))
        keys = ["ArrowLeft"] if genre in ("fixture-catch", "catch", "avoid") else ["ArrowRight", "ArrowDown"]
        pg.keyboard.down(keys[0])  # 첫 조작이 곧 시작
        pg.wait_for_timeout(700)
        for k in keys[1:]:
            pg.keyboard.down(k)
        pg.wait_for_timeout(700)
        for k in keys:
            pg.keyboard.up(k)
        d1 = dbg(pg)
        pg.screenshot(path=str(OUT / f"st01-{genre}-play-1366x768.png"))
        pg.locator("[data-dock=restart]").click()
        pg.wait_for_timeout(250)
        d2 = dbg(pg)
        st01[genre] = {"tickAfterPlay": d1["runtime"]["tick"], "stateAfterPlay": d1["runtime"]["state"], "tickAfterRestart": d2["runtime"]["tick"], "running": d2["running"], "held": d1["held"]}
        pg.locator("[data-dock=play]").click()   # 멈추기
        pg.locator("[data-phase-btn=make]").click()
    ok01 = all(v["tickAfterPlay"] > 30 and v["tickAfterRestart"] < v["tickAfterPlay"] and v["running"] for v in st01.values())
    # 피하기: 가만히 두면 결과 화면(대개 실패, seed에 따라 버티기 성공) → 1클릭 다시 하기
    open_genre(pg, "avoid")
    pg.locator("[data-dock=play]").click()
    pg.locator(".st-overlay [data-act=start]").click()
    pg.wait_for_selector(".st-overlay[data-tone=end]:not([hidden])", timeout=60000)
    pg.screenshot(path=str(OUT / "st01-avoid-end-1366x768.png"))
    end_text = pg.locator(".st-overlay__box").inner_text()
    pg.locator(".st-overlay [data-act=again]").click()
    pg.wait_for_timeout(400)
    again = dbg(pg)
    check("ST01 네 장르 플레이·재시작·결과 화면", ok01 and again["running"] and "다시" in end_text,
          genres=st01, endScreen=end_text.replace("\n", " / "), afterAgain={"running": again["running"], "tick": again["runtime"]["tick"]})
    results["console"] += logs
    ctx.close()

    # ── ST02: 수동 변경 → AI 변경 → 수동 변경 보존, 적용 전 비교, 되돌리기 ──
    ctx, pg, logs = new_page(browser)
    open_catch(pg)
    show_editor(pg)
    pg.locator(".st-rule[data-node=win] button", has_text="15점").click()
    r1 = proj(pg)["revision"]
    ask_ai(pg, chip="생선이 조금 더 천천히 떨어지게")
    busy = dbg(pg)["aiBusy"]
    # 생성 중에도 플레이 가능
    pg.locator("[data-dock=play]").click()
    pg.keyboard.down("ArrowRight"); pg.wait_for_timeout(300); pg.keyboard.up("ArrowRight")
    playing_during_ai = dbg(pg)["runtime"]["tick"] > 0
    pg.wait_for_selector(".st-compare:not([hidden])", timeout=15000)
    before_apply = proj(pg)
    cmp_text = pg.locator(".st-compare").inner_text()
    pg.screenshot(path=str(OUT / "st02-compare-1366x768.png"))
    pg.locator("[data-cmp=apply]").click()
    after = proj(pg)
    pg.screenshot(path=str(OUT / "st02-applied-1366x768.png"))
    ok = (node(before_apply, "fish-fall")["args"]["speed"] == 120 and node(after, "fish-fall")["args"]["speed"] == 84
          and node(after, "win")["args"]["value"] == 15 and "바뀔 것" in cmp_text and "그대로인 것" in cmp_text and "점수 15이면 성공" in cmp_text)
    pg.get_by_role("button", name="바꾸기 전으로").click()
    undone = proj(pg)
    ok_undo = node(undone, "fish-fall")["args"]["speed"] == 120 and node(undone, "win")["args"]["value"] == 15
    check("ST02 수동 변경 보존 + 적용 전 비교 + 한 번에 되돌리기", ok and ok_undo and busy and playing_during_ai,
          revisionAfterManual=r1, compare=cmp_text.replace("\n", " / ")[:300], speed=[120, node(after, "fish-fall")["args"]["speed"], node(undone, "fish-fall")["args"]["speed"]],
          goalKept=node(after, "win")["args"]["value"], aiBusyAfterSubmit=busy, playDuringAi=playing_during_ai)
    # ST05: 새로고침 뒤 복구 (자동 저장 800ms)
    pg.wait_for_timeout(1500)
    saved_rev = proj(pg)["revision"]
    pg.goto(BASE + "?studioDebug=1")
    pg.get_by_role("button", name="이어서 만들기").click()
    pg.wait_for_selector(".st-rule")
    rp = proj(pg)
    pg.screenshot(path=str(OUT / "st05-reopened-1366x768.png"))
    badge = pg.locator(".v2-savebadge").inner_text()
    check("ST05 새로고침 후 로컬 저장 복구", rp["revision"] == saved_rev and node(rp, "win")["args"]["value"] == 15,
          savedRevision=saved_rev, reopenedRevision=rp["revision"], goal=node(rp, "win")["args"]["value"], badge=badge.strip())
    results["console"] += logs
    ctx.close()

    # ── ST02b(AI06): 생성 중 수동 변경 → revision 불일치 → 적용 0 ──
    ctx, pg, logs = new_page(browser, query="&studioMock=slow&studioMockDelay=200")
    open_catch(pg)
    ask_ai(pg, text="생선이 조금 더 천천히 떨어지게")
    pg.wait_for_timeout(500)
    show_editor(pg)
    pg.locator(".st-rule[data-node=win] button", has_text="20점").click()
    pg.wait_for_selector(".st-note[data-tone=warn]:not([hidden])", state="attached", timeout=15000)
    show_assist(pg)
    note = pg.locator(".st-note").inner_text()
    pp = proj(pg)
    pg.screenshot(path=str(OUT / "st02b-conflict-1366x768.png"))
    check("ST02b 생성 중 수동 변경 → 충돌 안내, AI 결과 적용 0", "그 사이 작품이 바뀌었어요" in note and node(pp, "fish-fall")["args"]["speed"] == 120 and node(pp, "win")["args"]["value"] == 20,
          note=note.replace("\n", " / "), speed=node(pp, "fish-fall")["args"]["speed"], goal=node(pp, "win")["args"]["value"])
    results["console"] += logs
    ctx.close()

    # ── ST03: 폭탄 추가 → 생선 속도만 변경 → 나머지 유지 ──
    ctx, pg, logs = new_page(browser)
    open_catch(pg)
    show_editor(pg)
    pg.locator("[data-add=bomb]").click()
    with_bomb = proj(pg)
    ask_ai(pg, chip="생선이 조금 더 천천히 떨어지게")
    pg.wait_for_selector(".st-compare:not([hidden])", timeout=15000)
    cmp_text = pg.locator(".st-compare").inner_text()
    pg.locator("[data-cmp=apply]").click()
    fin = proj(pg)
    same = lambda nid: node(fin, nid) == node(with_bomb, nid)
    ok = (all(same(n) for n in ["bomb-fall", "touch-bomb", "stats", "lose-lives", "win", "lose", "player", "world", "touch-fish"])
          and node(fin, "fish-fall")["args"]["speed"] == 84 and fin["assets"] == with_bomb["assets"])
    show_stage(pg)
    pg.locator("[data-dock=play]").click()
    pg.locator(".st-overlay [data-act=start]").click()
    pg.wait_for_timeout(2500)
    pg.screenshot(path=str(OUT / "st03-bomb-play-1366x768.png"))
    check("ST03 규칙 추가 후 속도만 변경 — 나머지 규칙·에셋·목표 유지", ok, compare=cmp_text.replace("\n", " / ")[:300],
          nodes=[n["id"] for n in fin["program"]["nodes"]], fishSpeed=node(fin, "fish-fall")["args"]["speed"], lives=node(fin, "stats")["args"]["lives"])
    results["console"] += logs
    ctx.close()

    # ── ST04: invalid / providerDown / timeout → 기존 유지 + 1클릭 재플레이 ──
    st04 = {}
    for sc in ["invalid", "providerDown", "timeout"]:
        ctx, pg, logs = new_page(browser, query=f"&studioMock={sc}&studioMockDelay=100")
        open_catch(pg)
        before = proj(pg)
        ask_ai(pg, text="생선이 조금 더 천천히 떨어지게")
        pg.wait_for_selector(".st-note[data-tone=warn]:not([hidden])", state="attached", timeout=15000)
        note = pg.locator(".st-note").inner_text()
        ai_badge = pg.locator(".ws-ai").inner_text() if pg.locator(".ws-ai").is_visible() else ""
        pg.screenshot(path=str(OUT / f"st04-{sc}-1366x768.png"))
        after = proj(pg)
        show_stage(pg)
        pg.locator("[data-dock=play]").click()
        pg.locator(".st-overlay [data-act=start]").click()
        pg.wait_for_timeout(500)
        st04[sc] = {"note": note.replace("\n", " / "), "aiBadge": ai_badge.strip(), "unchanged": before == after, "replay": dbg(pg)["running"], "compareShown": dbg(pg)["compare"]}
        results["console"] += logs
        ctx.close()
    check("ST04 실패 응답·검증 오류 → 기존 작품 유지, 1클릭 재플레이", all(v["unchanged"] and v["replay"] and not v["compareShown"] and "성공" not in v["note"] for v in st04.values()), cases=st04)

    # ── ST06: 생성 중 다른 작품 이동/뒤로가기 → 다른 작품에 적용 0 ──
    ctx, pg, logs = new_page(browser, query="&studioMock=slow&studioMockDelay=300")
    first_spawner = lambda p: next(n for n in p["program"]["nodes"] if n["kind"] == "spawner")
    open_catch(pg)
    a0 = proj(pg)
    ask_ai(pg, text="생선이 조금 더 천천히 떨어지게")
    pg.wait_for_timeout(400)
    show_editor(pg)
    pg.locator("details.st-new > summary").click()
    pg.locator("[data-new=catch]").click()          # 요청 도중 다른 작품(B)으로 이동
    pg.wait_for_function("id => window.__vibeStudio && window.__vibeStudio.store.getProject().id !== id", arg=a0["id"])
    b0 = proj(pg)
    pg.wait_for_timeout(5000)                         # mock slow: A의 결과가 늦게 도착할 시간
    b1 = proj(pg)
    ai_busy_b = dbg(pg)["aiBusy"]
    # 뒤로가기 경로: B를 한 번 고쳐 저장 → 요청 → 돌아가기 → 늦은 결과 도착 시간 → 이어서 만들기로 B 다시 열기
    pg.locator(".st-rule[data-node=win] button", has_text="15점").click()
    pg.wait_for_timeout(1200)
    b_saved = proj(pg)
    ask_ai(pg, text="사과가 조금 더 천천히 떨어지게")
    pg.wait_for_timeout(400)
    pg.evaluate("window.__keepDbg = __vibeStudio.debug")
    pg.get_by_role("button", name="돌아가기").click()
    pg.wait_for_timeout(5000)
    leak = pg.evaluate("__keepDbg()")
    if pg.get_by_role("button", name="← 처음 화면").count():
        pg.get_by_role("button", name="← 처음 화면").click()
    pg.get_by_role("button", name="이어서 만들기").click()
    pg.wait_for_selector(".st-rule")
    b2 = proj(pg)
    pg.screenshot(path=str(OUT / "st06-after-back-1366x768.png"))
    # A도 다시 열어 늦은 결과가 적용되지 않았는지
    pg.get_by_role("button", name="돌아가기").click()
    pg.get_by_role("button", name="말과 블록으로 만들기").first.click()
    pg.get_by_role("button", name="생선 받기 만들기 시작").click()
    pg.wait_for_selector(".st-rule")
    a1 = proj(pg)
    ok = (b1["revision"] == b0["revision"] == 0 and first_spawner(b1) == first_spawner(b0) and not ai_busy_b
          and b2["id"] == b0["id"] and b2["revision"] == b_saved["revision"] and first_spawner(b2) == first_spawner(b0)
          and a1["id"] == a0["id"] and a1["revision"] == a0["revision"] and first_spawner(a1) == first_spawner(a0)
          and leak["disposed"] and leak["raf"] == 0 and leak["listenersAborted"] and not leak["aiBusy"] and leak["runtime"] is None)
    check("ST06 생성 중 작품 이동·뒤로가기 → 다른 작품 적용 0", ok and not [l for l in logs if "error" in l],
          projectA=a0["id"], revA=[a0["revision"], a1["revision"]], projectB=b0["id"], revB=[b0["revision"], b1["revision"], b_saved["revision"], b2["revision"]],
          spawnerSpeedB=[first_spawner(b0)["args"]["speed"], first_spawner(b2)["args"]["speed"]], aiBusyInB=ai_busy_b, disposedMode={k: leak[k] for k in ["disposed", "raf", "listenersAborted", "aiBusy", "runtime"]}, console=logs)
    results["console"] += logs
    ctx.close()

    # ── 옛 게임 열기 ──
    ctx, pg, logs = new_page(browser)
    pg.get_by_role("button", name="말과 블록으로 만들기").first.click()
    pg.get_by_role("button", name="옛 게임 열기").click()
    pg.wait_for_selector(".st-legacy")
    leg = pg.locator(".st-legacy").inner_text()
    play_disabled = pg.locator("[data-dock=play]").is_disabled()
    pg.screenshot(path=str(OUT / "legacy-open-1366x768.png"))
    check("옛 게임 — 원문 보존·읽기 전용·조용히 버리지 않음", "원문" in leg and "SPRITE" in leg and play_disabled, text=leg.replace("\n", " / ")[:300])
    results["console"] += logs
    ctx.close()

    # ── 5~6학년(high): 수치 슬라이더 편집, 슬라이더 방향키는 게임에 들어가지 않음 ──
    ctx, pg, logs = new_page(browser, grade="high")
    open_catch(pg)
    pg.locator("[data-dock=play]").click()
    pg.locator(".st-overlay [data-act=start]").click()
    pg.wait_for_timeout(300)
    show_editor(pg)
    rng = pg.locator(".st-rule[data-node=fish-fall] input[type=range]").first
    rng.focus()
    pg.keyboard.press("ArrowLeft")
    pg.wait_for_timeout(200)
    hp = proj(pg)
    held_after = dbg(pg)["held"]
    texts = pg.locator(".st-rule__text").all_inner_texts()
    pg.screenshot(path=str(OUT / "high-grade-sliders-1366x768.png"))
    m_high = measure(pg)
    check("5~6학년 수치 편집 (슬라이더·키보드), 입력 중 게임 키 비활성", node(hp, "fish-fall")["args"]["speed"] in (110, 90) and held_after == [] and hp["revision"] == 1 and m_high["smallCount"] == 0,
          speed=node(hp, "fish-fall")["args"]["speed"], revision=hp["revision"], texts=texts[:3], small=m_high["small"])
    results["console"] += logs
    ctx.close()

    # ── 화면 크기별: 스크린샷·조작 크기·가로 넘침 ──
    for name, w, h, touch in VIEWS:
        ctx, pg, logs = new_page(browser, w, h, touch)
        open_catch(pg)
        pg.wait_for_timeout(300)
        m_make = measure(pg)
        pg.screenshot(path=str(OUT / f"view-make-{name}.png"))
        pg.locator("[data-dock=play]").click()
        pg.locator(".st-overlay [data-act=start]").click()
        pg.wait_for_timeout(800)
        m_play = measure(pg)
        pg.screenshot(path=str(OUT / f"view-play-{name}.png"))
        # 터치 방향판: 누르고 떼면 이동이 멈춘다 (고착 없음)
        pad_ok = None
        if touch and pg.locator(".st-pad:not([hidden]) [data-control=left]").count():
            b = pg.locator(".st-pad [data-control=left]").bounding_box()
            pg.mouse.move(b["x"] + b["width"] / 2, b["y"] + b["height"] / 2)
            pg.mouse.down(); pg.wait_for_timeout(300)
            held = dbg(pg)["held"]
            pg.mouse.up(); pg.wait_for_timeout(100)
            pad_ok = held == ["left"] and dbg(pg)["held"] == []
        pg.locator("[data-dock=play]").click()   # 멈추기
        show_editor(pg)
        pg.locator("[data-add=bomb]").click()
        ask_ai(pg, chip="생선이 조금 더 천천히 떨어지게")
        pg.wait_for_selector(".st-compare:not([hidden])", timeout=15000)
        pg.locator(".st-compare").scroll_into_view_if_needed()
        m_ai = measure(pg)
        pg.screenshot(path=str(OUT / f"view-compare-{name}.png"))
        results["views"][name] = {"make": m_make, "play": m_play, "compare": m_ai, "padPressRelease": pad_ok, "console": logs[:]}
        results["console"] += logs
        ctx.close()
        print(name, json.dumps(results["views"][name], ensure_ascii=False)[:500])

    # ── 60초 플레이 rAF 간격 ──
    secs = 15 if QUICK else 60
    ctx, pg, logs = new_page(browser)
    open_catch(pg)
    show_editor(pg)
    pg.locator(".st-rule[data-node=win] button", has_text="30점").click()   # 60초 동안 끝나지 않게 목표를 높인다
    pg.locator("[data-dock=play]").click()
    pg.locator(".st-overlay [data-act=start]").click()
    pg.evaluate("__vibeStudio.resetStats()")
    pg.evaluate("""() => { window.__raf = []; let last = 0; const f = t => { if (last) window.__raf.push(t - last); last = t; if (window.__raf.length < 20000) requestAnimationFrame(f); }; requestAnimationFrame(f); }""")
    t0 = time.time()
    k = 0
    while time.time() - t0 < secs - 1:        # 사람처럼 좌우로 움직인다 (제한 시간 60초 직전까지)
        key = "ArrowLeft" if k % 2 else "ArrowRight"
        pg.keyboard.down(key); pg.wait_for_timeout(700); pg.keyboard.up(key)
        k += 1
    d = dbg(pg)
    page_raf = pg.evaluate("""() => { const s = [...window.__raf].sort((a, b) => a - b); const q = p => Math.round(s[Math.min(s.length - 1, Math.floor(p / 100 * s.length))] * 100) / 100; return { n: s.length, p50: q(50), p95: q(95), p99: q(99), max: Math.round(s[s.length - 1] * 10) / 10, over20ms: s.filter(x => x > 20).length }; }""")
    results["perf"] = {"seconds": secs, "mode": d["frames"], "pageRaf": page_raf, "endState": d["runtime"]["state"], "tick": d["runtime"]["tick"],
                       "note": "headless Chrome, 1366x768, DPR1, 데스크톱 PC. 실제 저사양 크롬북 측정을 대체하지 않는다."}
    print("perf", json.dumps(results["perf"], ensure_ascii=False))
    results["console"] += logs
    ctx.close()
    browser.close()


with sync_playwright() as p:
    run(p)

results["consoleErrorCount"] = len([c for c in results["console"] if c.startswith(("error", "pageerror"))])
results["allPass"] = all(s["pass"] for s in results["scenarios"].values())
(OUT / "browser-check.json").write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8")
print("allPass", results["allPass"], "consoleErrors", results["consoleErrorCount"], "consoleAll", len(results["console"]))
