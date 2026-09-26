# v2 E2E 흐름 (WP8) — run.js가 BASE_URL·OUT_DIR·CHROME 환경변수로 부른다. 마지막 줄에 결과 JSON 한 줄을 출력한다.
#
# 흐름
#   cards-goal       홈 → 그림 카드 → 별까지 가기 1번을 탭만으로 완료 (1~2학년)
#   cards-shape      도형 1번: 잘못된 순서 → 힌트 → 비우기 → 올바른 순서 → 완료
#   turtle-chips     거북이 정사각형: 명령 칩만 눌러 완료 + 새로고침 뒤 '이어서 만들기'로 원문 복구
#   pixel-drag       픽셀 가로줄: 빠른 드래그 한 번으로 5칸(보간) → 완료, 되돌리기 한 번에 5칸 모두 취소
#   pixel-tap        픽셀 점 하나: 손가락 탭으로 칠하기 → 완료
#   maze-if          미로 벽탐지: 코드 입력 → 완료, 오답은 충돌 줄 안내
#   layout-*         1366×768·1024×768·768×1024 에서 가로 넘침·작은 조작·콘솔 오류
#   dispose-100      학습 모드 생성→실행→dispose 100회 후 남은 타이머·rAF·리스너 0
#   studio-*         (건너뜀) WP3 공방 병렬 개발 중 — 구현되면 함수만 추가
#
# 홈 카탈로그에 학습 미션이 아직 연결되지 않은 빌드(app.js 통합 전)에서는 app.js 응답에
# getLearningCatalog 연결 두 줄을 끼워 넣고, 결과에 integrationShim=true 로 표시한다.

import json, os, sys, time, traceback

try:
    from playwright.sync_api import sync_playwright
except Exception as e:  # pragma: no cover
    print(json.dumps({"ok": False, "error": "playwright import failed: %s" % e}))
    sys.exit(0)

BASE = os.environ.get("BASE_URL", "http://127.0.0.1:3000")
OUT = os.environ.get("OUT_DIR", ".")
CHROME = os.environ.get("CHROME") or None
ONLY = [x for x in os.environ.get("E2E_ONLY", "").split(",") if x]
HEADED = os.environ.get("E2E_HEADED") == "1"
APP = BASE + "/vibe-v2/"

state = {"shim": False, "console": []}


def shim_route(route):
    resp = route.fetch()
    body = resp.text()
    if "learning/catalog.js" not in body:
        state["shim"] = True
        body = body.replace(
            "import { getCatalog } from './modes/cards/catalog.js';",
            "import { getCatalog } from './modes/cards/catalog.js';\nimport { getLearningCatalog } from './modes/learning/catalog.js';",
        ).replace(
            "catalog: getCatalog(prefs.get('cards.progress')),",
            "catalog: [...getCatalog(prefs.get('cards.progress')), ...getLearningCatalog(prefs.get('learning.progress'))],",
        )
    route.fulfill(status=200, body=body, headers={"content-type": "application/javascript; charset=utf-8", "cache-control": "no-store"})


def new_page(browser, vw=1366, vh=768, prefs=None, flow=""):
    ctx = browser.new_context(viewport={"width": vw, "height": vh}, device_scale_factor=1, has_touch=False, locale="ko-KR")
    init = "try{localStorage.setItem('vibe2_pref_learning.speed', JSON.stringify('fast'));localStorage.setItem('vibe2_pref_cards.speed', JSON.stringify('normal'));"
    for k, v in (prefs or {}).items():
        init += "localStorage.setItem(%s, %s);" % (json.dumps("vibe2_pref_" + k), json.dumps(json.dumps(v)))
    init += "}catch(e){}"
    ctx.add_init_script("if(!sessionStorage.getItem('e2e_init')){sessionStorage.setItem('e2e_init','1');%s}" % init)
    ctx.route("**/vibe-v2/app.js", shim_route)
    page = ctx.new_page()
    page.on("console", lambda m: state["console"].append({"flow": flow, "type": m.type, "text": m.text[:300]}) if m.type == "error" else None)
    page.on("pageerror", lambda e: state["console"].append({"flow": flow, "type": "pageerror", "text": str(e)[:300]}))
    return ctx, page


def shot(page, name):
    p = os.path.join(OUT, name)
    page.screenshot(path=p, full_page=False)
    return os.path.basename(p)


def open_home(page):
    page.goto(APP, wait_until="networkidle")
    page.wait_for_selector(".home-main")


def open_path(page, path_id):
    page.click(".path-card[data-path='%s']" % path_id)
    page.wait_for_selector(".mission-grid")


def open_chapter(page, title_part):
    head = page.locator(".chap-title")
    if title_part in (head.inner_text() or ""):
        return
    page.get_by_role("button", name="챕터 목록").click()
    page.locator(".chap-list__btn", has_text=title_part).first.click()
    page.wait_for_function("t => document.querySelector('.chap-title')?.textContent.includes(t)", arg=title_part)


def open_mission(page, title):
    page.locator(".mission", has_text=title).first.click()
    page.wait_for_selector("[data-workspace]")


def wait_ok(page, sel, timeout=20000):
    page.wait_for_selector(sel, state="visible", timeout=timeout)


def say_text(page):
    return page.locator(".ws-say__text").inner_text()


# ── 흐름 ─────────────────────────────────────────
def flow_cards_goal(browser):
    ctx, page = new_page(browser, flow="cards-goal")
    try:
        open_home(page)
        open_path(page, "cards")
        open_chapter(page, "순차의 길")
        open_mission(page, "곧게 가기")
        for _ in range(2):
            page.click("[data-action='add'][data-kind='move']")
        page.click(".ws-dock [data-action='run']")
        wait_ok(page, ".vc2c-result.is-ok")
        return {"say": say_text(page), "screenshot": shot(page, "cards-goal-done.png"), "keyboardUsed": False}
    finally:
        ctx.close()


def flow_cards_shape(browser):
    ctx, page = new_page(browser, flow="cards-shape")
    try:
        open_home(page)
        open_path(page, "cards")
        open_chapter(page, "순서의 나라")
        open_mission(page, "집 짓기")
        page.click("[data-action='add'][data-tray='0']")  # 세모 먼저 (틀린 순서)
        page.click("[data-action='add'][data-tray='1']")
        page.click(".ws-dock [data-action='run']")
        wait_ok(page, ".vc2c-hint")
        hint = page.locator(".vc2c-hint").first.inner_text()
        page.click(".ws-dock [data-action='clear']")
        page.click("[data-action='add'][data-tray='1']")  # 네모 먼저
        page.click("[data-action='add'][data-tray='0']")
        page.click(".ws-dock [data-action='run']")
        wait_ok(page, ".vc2c-result.is-ok")
        return {"wrongHint": hint, "say": say_text(page), "screenshot": shot(page, "cards-shape-done.png")}
    finally:
        ctx.close()


LEARN_PREFS = {"grade": "mid", "learning.progress": {"unlockAll": True}}


def open_learning(page, chapter, title):
    open_home(page)
    open_path(page, "make")
    open_chapter(page, chapter)
    open_mission(page, title)
    page.wait_for_selector(".vl-ta")


def flow_turtle_chips(browser):
    ctx, page = new_page(browser, prefs=LEARN_PREFS, flow="turtle-chips")
    try:
        open_learning(page, "거북이 · 새싹 행성", "정사각형")
        for label in ["반복 4번", "앞으로 100", "오른쪽 90°"]:
            page.locator(".vl-chipbtn", has_text=label).first.click()
        src = page.input_value(".vl-ta")
        assert "REPEAT 4 {" in src and "FORWARD 100" in src and "RIGHT 90" in src, src
        page.click(".ws-dock [data-action='run']")
        wait_ok(page, ".vl-result.is-ok")
        s1 = shot(page, "turtle-square-done-1366.png")
        # 한 단계·처음으로 결정성: 3단계 진행 → 처음 → 다시 3단계, 강조 줄과 무대 그림이 같아야 한다
        def three_steps():
            page.click(".ws-dock [data-action='reset']")
            for _ in range(3):
                page.click(".ws-dock [data-action='step']")
            page.wait_for_timeout(250)
            return page.evaluate("""() => ({ line: document.querySelector('.vl-gutter .is-now')?.textContent,
                hud: document.querySelector('.vl-hud')?.textContent.replace(/\\s+/g, ' ').trim(),
                img: document.querySelector("canvas[data-cv='turtle']").toDataURL().length })""")
        a, b = three_steps(), three_steps()
        assert a == b and a["line"] == "2", (a, b)
        # 새로고침 복구: 자동 저장(편집 0.6초 + 저장 0.8초) 뒤 다시 열기
        page.wait_for_timeout(2500)
        page.reload(wait_until="networkidle")
        page.wait_for_selector(".home-continue")
        page.click(".home-continue .v2-btn--primary")
        page.wait_for_selector(".vl-ta")
        src2 = page.input_value(".vl-ta")
        assert src2.strip() == src.strip(), "복구 원문 불일치: %r vs %r" % (src2, src)
        return {"source": src, "restored": True, "stepResetDeterministic": a, "screenshot": s1}
    finally:
        ctx.close()


def canvas_cell_center(page, sel, x, y):
    # 캔버스 좌표 레이블 폭은 pixelLayout과 같다: label = clamp(22..34, size/(n+1))
    return page.evaluate("""([sel, x, y]) => {
        const cv = document.querySelector(sel); const r = cv.getBoundingClientRect();
        const n = Number(window.__e2e_n || 5);
        const size = r.width; const label = Math.max(22, Math.min(34, Math.floor(size / (n + 1))));
        const cell = Math.max(8, Math.floor((size - label) / n));
        return { x: r.left + label + cell * (x - 0.5), y: r.top + label + cell * (y - 0.5), cell };
    }""", [sel, x, y])


def flow_pixel_drag(browser):
    ctx, page = new_page(browser, prefs=LEARN_PREFS, flow="pixel-drag")
    try:
        open_learning(page, "픽셀 · 픽셀 마을", "가로줄")
        page.wait_for_timeout(300)
        a = canvas_cell_center(page, "canvas[data-cv='mine']", 1, 3)
        b = canvas_cell_center(page, "canvas[data-cv='mine']", 5, 3)
        page.mouse.move(a["x"], a["y"])
        page.mouse.down()
        page.mouse.move(b["x"], b["y"], steps=2)  # 빠른 손놀림: 중간 이벤트 2개뿐
        page.mouse.up()
        page.wait_for_timeout(200)
        src = page.input_value(".vl-ta")
        lines = [l for l in src.split("\n") if l.strip()]
        assert sorted(lines) == sorted(["LED_ON %d 3" % i for i in range(1, 6)]), src
        # 되돌리기 한 번 = 드래그 한 번 전체 취소
        page.click(".ws-dock [data-action='undo']")
        page.wait_for_timeout(100)
        undone = page.input_value(".vl-ta")
        page.click(".ws-dock [data-action='redo']")
        page.wait_for_timeout(100)
        page.click(".ws-dock [data-action='run']")
        wait_ok(page, ".vl-result.is-ok")
        return {"cellsPainted": len(lines), "moveEvents": 2, "undoOnceEmpties": undone.strip() == "", "screenshot": shot(page, "pixel-drag-done-1366.png")}
    finally:
        ctx.close()


def flow_pixel_tap(browser):
    ctx, page = new_page(browser, prefs=LEARN_PREFS, flow="pixel-tap")
    try:
        open_learning(page, "픽셀 · 픽셀 마을", "점 하나")
        page.wait_for_timeout(300)
        c = canvas_cell_center(page, "canvas[data-cv='mine']", 3, 3)
        page.mouse.click(c["x"], c["y"])
        page.wait_for_timeout(150)
        src = page.input_value(".vl-ta").strip()
        assert src == "LED_ON 3 3", src
        page.click(".ws-dock [data-action='run']")
        wait_ok(page, ".vl-result.is-ok")
        return {"source": src, "cellPx": c["cell"]}
    finally:
        ctx.close()


def flow_maze_if(browser):
    ctx, page = new_page(browser, prefs=LEARN_PREFS, flow="maze-if")
    try:
        open_learning(page, "미로 · 선택의 유적", "벽탐지")
        page.fill(".vl-ta", "MOVE\nMOVE\nMOVE\nMOVE")
        page.click(".ws-dock [data-action='run']")
        page.wait_for_function("() => /부딪혔어/.test(document.querySelector('.ws-say__text')?.textContent || '')", timeout=20000)
        bump = say_text(page)
        # 충돌한 줄이 편집기에서 오류 색으로 강조된다
        bump_line = page.evaluate("() => document.querySelector('.vl-gutter .is-now')?.textContent")
        assert bump_line == "4", bump_line
        page.fill(".vl-ta", "REPEAT 7 {\nIF WALL {\nTURN_RIGHT\n} ELSE {\nMOVE\n}\n}")
        page.click(".ws-dock [data-action='run']")
        wait_ok(page, ".vl-result.is-ok")
        return {"bumpHint": bump, "screenshot": shot(page, "maze-if-done-1366.png")}
    finally:
        ctx.close()


SMALL_JS = """() => {
  const out = []; const seen = new Set();
  const ws = document.querySelector('[data-workspace]');
  const low = (ws || document.querySelector('.v2-home'))?.dataset.grade === 'low';
  const min = low ? 56 : 48;
  const els = document.querySelectorAll('button, [role=button], a[href], input, select, textarea, summary');
  for (const el of els) {
    if (el.closest('[hidden]') || el.classList.contains('v2-skip')) continue;
    const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || cs.display === 'none') continue;
    const r = el.getBoundingClientRect(); if (r.width < 1 || r.height < 1) continue;
    if (el.closest('.v2-visually-hidden, .vc2c-sr, .vl-sr')) continue;
    if (r.width < min - 0.5 || r.height < min - 0.5) {
      const key = (el.className || el.tagName) + '|' + (el.textContent || '').trim().slice(0, 20);
      if (seen.has(key)) continue; seen.add(key);
      out.push({ tag: el.tagName.toLowerCase(), cls: String(el.className).slice(0, 60), text: (el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 30), w: Math.round(r.width), h: Math.round(r.height) });
    }
  }
  const de = document.documentElement;
  return { min, low, overflowX: Math.max(0, de.scrollWidth - de.clientWidth), small: out };
}"""


def measure(page):
    return page.evaluate(SMALL_JS)


def flow_layout(browser, vw, vh):
    tag = "%dx%d" % (vw, vh)
    screens = []
    shots = []
    # 1~2학년 홈·카드
    ctx, page = new_page(browser, vw, vh, flow="layout-" + tag)
    try:
        open_home(page)
        screens.append(dict(screen="home-low", **measure(page)))
        open_path(page, "cards"); open_chapter(page, "순차의 길"); open_mission(page, "곧게 가기")
        page.wait_for_timeout(300)
        screens.append(dict(screen="cards-goal", **measure(page)))
    finally:
        ctx.close()
    # 3~6학년 학습 모드
    for chapter, title, name in [("거북이 · 새싹 행성", "정사각형", "turtle"), ("픽셀 · 네온 도시", "테두리 8×8", "pixel"), ("미로 · 선택의 유적", "벽탐지", "maze")]:
        ctx, page = new_page(browser, vw, vh, prefs=LEARN_PREFS, flow="layout-" + tag)
        try:
            open_learning(page, chapter, title)
            page.wait_for_timeout(400)
            screens.append(dict(screen=name, **measure(page)))
            shots.append(shot(page, "%s-%s.png" % (name, tag)))
        finally:
            ctx.close()
    overflow = [s for s in screens if s["overflowX"] > 0]
    small_learning = [s for s in screens if s["screen"] in ("turtle", "pixel", "maze") and s["small"]]
    small_other = [s for s in screens if s["screen"] not in ("turtle", "pixel", "maze") and s["small"]]
    res = {"viewport": tag, "screens": screens, "screenshots": shots,
           "overflowScreens": [s["screen"] for s in overflow],
           "smallControlsLearning": sum(len(s["small"]) for s in small_learning),
           "smallControlsOther": sum(len(s["small"]) for s in small_other)}
    errs = []
    if overflow:
        errs.append("가로 넘침: " + ", ".join("%s(%dpx)" % (s["screen"], s["overflowX"]) for s in overflow))
    if small_learning or small_other:
        errs.append("작은 조작: " + "; ".join("%s: %s" % (s["screen"], ", ".join("%s'%s' %dx%d" % (x["tag"], x["text"], x["w"], x["h"]) for x in s["small"][:6])) for s in small_learning + small_other))
    if errs:
        raise AssertionError(" / ".join(errs) + " ::" + json.dumps(res, ensure_ascii=False)[:200])
    return res


DISPOSE_JS = """async () => {
  const { createMode } = await import('/vibe-v2/modes/learning/index.js');
  const { createProjectStore } = await import('/vibe-v2/state/store.js');
  const { makeLearningProject, findLearningMission } = await import('/vibe-v2/modes/learning/catalog.js');
  const T = new Set(), R = new Set(); let L = 0, RO = 0;
  const o = { st: window.setTimeout, ct: window.clearTimeout, ra: window.requestAnimationFrame, ca: window.cancelAnimationFrame, ae: EventTarget.prototype.addEventListener, re: EventTarget.prototype.removeEventListener, RO: window.ResizeObserver };
  window.setTimeout = (fn, ms, ...a) => { const id = o.st.call(window, (...x) => { T.delete(id); fn(...x); }, ms, ...a); T.add(id); return id; };
  window.clearTimeout = id => { T.delete(id); o.ct.call(window, id); };
  window.requestAnimationFrame = fn => { const id = o.ra.call(window, t => { R.delete(id); fn(t); }); R.add(id); return id; };
  window.cancelAnimationFrame = id => { R.delete(id); o.ca.call(window, id); };
  const live = new WeakMap();
  EventTarget.prototype.addEventListener = function (type, fn, opts) {
    const sig = opts && typeof opts === 'object' ? opts.signal : null;
    if (!(sig && sig.aborted) && !(opts && opts.once)) { L++; if (sig) o.ae.call(sig, 'abort', () => { L--; }, { once: true }); }
    return o.ae.call(this, type, fn, opts);
  };
  EventTarget.prototype.removeEventListener = function (type, fn, opts) { return o.re.call(this, type, fn, opts); };
  window.ResizeObserver = class extends o.RO { constructor(cb) { super(cb); RO++; this.__on = true; } disconnect() { if (this.__on) { RO--; this.__on = false; } super.disconnect(); } };
  const host = document.createElement('div'); document.body.append(host);
  const slot = () => { const d = document.createElement('div'); host.append(d); return d; };
  const stage = slot(), editor = slot(), assist = slot(), dock = slot();
  const shell = { stageSlot: () => stage, editorSlot: () => editor, assistSlot: () => assist, dockSlot: () => dock, say() {}, setStep() {}, setAiStatus() {}, getLayout: () => ({ layout: 'two', fit: 'viewport' }), showPane() {}, dialog() { return { close() {} }; }, onBack() {} };
  const prefs = { get: () => null, set() {} };
  const ids = ['turtle-17', 'pixel-11', 'maze-10'];
  let maxTimers = 0;
  try {
    for (let k = 0; k < 100; k++) {
      const m = findLearningMission(ids[k % 3]);
      const store = createProjectStore(makeLearningProject(m.mode, m, { source: m.answers[0] }));
      const mode = createMode({ store, grade: 'mid', shell, prefs, mission: null });
      mode.enter(host);
      dock.querySelector('[data-action=run]').click();
      if (k % 2) await new Promise(r => o.st.call(window, r, 5));
      maxTimers = Math.max(maxTimers, T.size);
      mode.dispose();
    }
    await new Promise(r => o.st.call(window, r, 50));
  } finally {
    Object.assign(window, { setTimeout: o.st, clearTimeout: o.ct, requestAnimationFrame: o.ra, cancelAnimationFrame: o.ca, ResizeObserver: o.RO });
    EventTarget.prototype.addEventListener = o.ae; EventTarget.prototype.removeEventListener = o.re;
  }
  const left = { timers: T.size, raf: R.size, listeners: L, resizeObservers: RO, domLeft: stage.childElementCount + editor.childElementCount + assist.childElementCount + dock.childElementCount };
  host.remove();
  return { cycles: 100, maxTimersDuringRun: maxTimers, left };
}"""


def flow_dispose(browser):
    ctx, page = new_page(browser, flow="dispose-100")
    try:
        page.goto(APP, wait_until="networkidle")
        r = page.evaluate(DISPOSE_JS)
        left = r["left"]
        assert all(v == 0 for v in left.values()), "잔여 자원: %s" % left
        return r
    finally:
        ctx.close()


FLOWS = [
    ("cards-goal", flow_cards_goal),
    ("cards-shape", flow_cards_shape),
    ("turtle-chips", flow_turtle_chips),
    ("pixel-drag", flow_pixel_drag),
    ("pixel-tap", flow_pixel_tap),
    ("maze-if", flow_maze_if),
    ("layout-1366x768", lambda b: flow_layout(b, 1366, 768)),
    ("layout-1024x768", lambda b: flow_layout(b, 1024, 768)),
    ("layout-768x1024", lambda b: flow_layout(b, 768, 1024)),
    ("dispose-100", flow_dispose),
    ("studio-template", None),  # WP3 병렬 개발 중 — 구현 후 추가
]


def main():
    results = []
    with sync_playwright() as p:
        kw = {"headless": not HEADED}
        if CHROME:
            kw["executable_path"] = CHROME
        browser = p.chromium.launch(**kw)
        try:
            for fid, fn in FLOWS:
                if ONLY and fid not in ONLY:
                    continue
                if fn is None:
                    results.append({"id": fid, "status": "skipped", "reason": "WP3 공방 병렬 개발 중 (E2E 제외)"})
                    continue
                t0 = time.time()
                before = len(state["console"])
                try:
                    data = fn(browser)
                    errs = state["console"][before:]
                    status = "passed"
                    err = None
                    if errs:
                        status, err = "failed", "콘솔 오류 %d건: %s" % (len(errs), errs[0]["text"])
                    results.append({"id": fid, "status": status, "ms": int((time.time() - t0) * 1000), "data": data, "error": err, "consoleErrors": errs})
                except Exception as e:
                    results.append({"id": fid, "status": "failed", "ms": int((time.time() - t0) * 1000), "error": "%s: %s" % (type(e).__name__, str(e)[:1500]), "trace": traceback.format_exc()[-1500:], "consoleErrors": state["console"][before:]})
        finally:
            browser.close()
    summary = {k: sum(1 for r in results if r["status"] == k) for k in ("passed", "failed", "skipped")}
    out = {"ok": summary["failed"] == 0, "summary": summary, "flows": results,
           "consoleErrorsTotal": len(state["console"]),
           "meta": {"integrationShim": state["shim"], "note": "integrationShim=true 이면 app.js에 학습 카탈로그가 아직 연결되지 않아 E2E가 응답에 두 줄을 끼워 넣었다"}}
    print(json.dumps(out, ensure_ascii=False))


if __name__ == "__main__":
    main()
