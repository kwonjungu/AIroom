"""WP2 카드 모드 브라우저 점검 (Python Playwright, Chromium headless).

사용: 로컬 서버를 띄운 뒤  python wp2_browser_check.py http://localhost:3917
- 1366x768, 768x1024, 1024x768 스크린샷 (도형·별까지 가기)
- SH05: 손잡이 드래그 20회 → 되돌리기 20회 → 미션 변경 후 카드 수·중복 id 확인
- SH08: 한 단계씩 실행 시 강조 카드 번호 = 캔버스 번호, 실행 후 dispose 누수 확인
- UI01/저학년 규격: 조작 최소 크기·본문 글자 크기 측정, DPR 2 백버퍼 확인
외부 API 호출 없음. 해상도별 흐름은 실제 앱(/vibe-v2/, WP1 셸)으로, SH05·SH06·SH08은 모드를 최소 셸에 직접 붙여 점검.
"""

import json
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE = (sys.argv[1] if len(sys.argv) > 1 else "http://localhost:3917").rstrip("/")
OUT = Path(__file__).resolve().parent
VIEWPORTS = [("1366x768", 1366, 768), ("768x1024", 768, 1024), ("1024x768", 1024, 768)]


def open_real(page, path_mission):
    """실제 앱: 홈 → 그림 카드로 시작 → (챕터 이동) → 지금 할 미션."""
    chapter_steps = {"goal": 0, "shape": 2}[path_mission]
    page.goto(BASE + "/vibe-v2/")
    page.click('.path-card[data-path="cards"]')
    page.wait_for_selector(".mission")
    for _ in range(chapter_steps):
        page.get_by_role("button", name="다음 ▶").click()
    page.click('.mission[data-status="current"]')
    page.wait_for_selector(".vc2c-dock .vc2c-runbar")
    page.wait_for_timeout(300)


def run_visible(page):
    """실행 버튼이 스크롤 없이 화면 안에 보이는가 + 무대 캔버스 크기"""
    return page.evaluate("""() => {
      const b = document.querySelector('.vc2c [data-action="run"]').getBoundingClientRect();
      const cv = [...document.querySelectorAll('canvas[data-canvas]')].map(c => Math.round(c.getBoundingClientRect().width) + 'x' + Math.round(c.getBoundingClientRect().height));
      const st = document.querySelector('.ws-stage').getBoundingClientRect();
      return { scrollY, docScroll: document.documentElement.scrollHeight > innerHeight, runTop: Math.round(b.top), runBottom: Math.round(b.bottom),
        runInView: b.top >= 0 && b.bottom <= innerHeight, canvases: cv, stagePane: Math.round(st.width) + 'x' + Math.round(st.height),
        layout: document.querySelector('[data-workspace]')?.dataset.layout };
    }""")


def mount_mission(page, mission_id, grade="low"):
    """셸 스텁 대신 최소 ShellApi로 모드를 직접 붙인다 (카탈로그의 임의 미션 열기)."""
    page.goto(BASE + "/vibe-v2/")
    page.evaluate("""async ([id, grade]) => {
      if (window.__m) window.__m.dispose();
      const { createMode } = await import('/vibe-v2/modes/cards/index.js');
      const { getCatalog } = await import('/vibe-v2/modes/cards/catalog.js');
      const { createProjectStore } = await import('/vibe-v2/state/store.js');
      document.getElementById('app').innerHTML = '<main style="padding:12px;max-width:1100px"><section id="st"></section><section id="ed"></section><aside id="as"></aside></main>';
      const m = getCatalog({ unlockAll: true }).flatMap(g => g.missions).find(x => x.id === id);
      const store = createProjectStore(m.makeProject());
      window.__says = [];
      const q = s => document.getElementById(s);
      const shell = { stageSlot: () => q('st'), editorSlot: () => q('ed'), assistSlot: () => q('as'),
        say: msg => { window.__says.push(msg.text); q('as').textContent = msg.text; }, setStep() {}, setAiStatus() {},
        dialog() { return { close() {} }; }, onBack() {} };
      window.__store = store;
      window.__m = createMode({ store, grade, shell, prefs: { get: () => null, set() {} }, mission: null });
      window.__m.enter(document.getElementById('app'));
    }""", [mission_id, grade])
    page.wait_for_selector(".vc2c-runbar")


def cards_state(page):
    return page.evaluate("""() => {
      const ids = [...document.querySelectorAll('.vc2c-editor [data-action="select"]')].map(b => b.dataset.id);
      return { count: ids.length, unique: new Set(ids).size, ids };
    }""")


def drag(page, src, dst):
    # 끌기 자동 스크롤은 없다 → 출발·도착이 둘 다 화면에 보이도록 먼저 스크롤
    page.evaluate("""([a, b]) => { const r1 = a.getBoundingClientRect(), r2 = b.getBoundingClientRect();
      const mid = (Math.min(r1.top, r2.top) + Math.max(r1.bottom, r2.bottom)) / 2; scrollBy(0, mid - innerHeight / 2); }""",
                  [src.element_handle(), dst.element_handle()])
    a = src.bounding_box()
    b = dst.bounding_box()
    page.mouse.move(a["x"] + a["width"] / 2, a["y"] + a["height"] / 2)
    page.mouse.down()
    for k in range(1, 9):
        page.mouse.move(a["x"] + (b["x"] + b["width"] / 2 - a["x"]) * k / 8, a["y"] + (b["y"] + b["height"] / 2 - a["y"]) * k / 8)
    page.mouse.up()


def sizes(page):
    return page.evaluate("""() => {
      const els = [...document.querySelectorAll('.vc2c button:not([disabled]), .vc2c .vc2c-grip')];
      const vis = els.filter(e => e.offsetParent !== null);
      const small = vis.map(e => { const r = e.getBoundingClientRect(); return { t: (e.textContent || e.className).trim().slice(0, 20), w: Math.round(r.width), h: Math.round(r.height) }; })
        .filter(x => x.w < 56 || x.h < 56);
      const body = parseFloat(getComputedStyle(document.querySelector('.vc2c-desc') || document.body).fontSize);
      const gaps = [...document.querySelectorAll('.vc2c-runbar, .vc2c-palette, .vc2c-tools')].map(e => getComputedStyle(e).columnGap);
      return { controls: vis.length, under56: small, bodyPx: body, gaps, hScroll: document.documentElement.scrollWidth > document.documentElement.clientWidth };
    }""")


def main():
    report = {"base": BASE, "screens": [], "checks": {}, "console": []}
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        for label, w, h in VIEWPORTS:
            ctx = browser.new_context(viewport={"width": w, "height": h}, device_scale_factor=1)
            page = ctx.new_page()
            page.on("console", lambda m: m.type == "error" and report["console"].append(m.text))
            page.on("pageerror", lambda e: report["console"].append(str(e)))

            # 별까지 가기(실제 앱): 홈 → 미션 1 → 카드 탭 → 한 단계 → 실행
            open_real(page, "goal")
            pre = run_visible(page)
            page.wait_for_timeout(250); page.screenshot(path=str(OUT / f"goal-open-{label}.png"))
            page.click('.vc2c [data-action="add"][data-kind="move"]')
            page.click('.vc2c [data-action="add"][data-kind="move"]')
            page.click('.vc2c [data-action="step"]')
            page.wait_for_timeout(250); page.screenshot(path=str(OUT / f"goal-step-{label}.png"))
            page.click('.vc2c [data-action="run"]')
            page.wait_for_selector(".ws-say__actions button", timeout=5000)
            page.wait_for_timeout(250); page.screenshot(path=str(OUT / f"goal-done-{label}.png"))
            goal_next = page.inner_text(".ws-say__actions")
            goal_sizes = sizes(page)
            # 셸의 "다음 미션" → 미션 2가 열린다
            page.click(".ws-say__actions button")
            page.wait_for_timeout(600)
            next_title = page.inner_text(".ws-title")

            # 도형(실제 앱): 집 짓기 — 카드 상자 순서대로(세모→네모) 누르면 틀림 → 힌트 → 고쳐서 성공
            open_real(page, "shape")
            page.click('.vc2c [data-action="add"][data-tray="0"]')
            page.click('.vc2c [data-action="add"][data-tray="1"]')
            page.click('.vc2c [data-action="run"]')
            page.wait_for_selector(".vc2c-editor .vc2c-hint", timeout=5000)
            shape_run = run_visible(page)
            hint = page.inner_text(".vc2c-editor .vc2c-hint")
            say_hint = page.inner_text(".ws-say__text")
            page.wait_for_timeout(250); page.screenshot(path=str(OUT / f"shape-hint-{label}.png"))
            if page.evaluate("() => !document.querySelector('.ws-stage').hidden"):
                page.click('.vc2c-stage [data-action="view"][data-view="diff"]')
                page.wait_for_timeout(200)
                page.wait_for_timeout(250); page.screenshot(path=str(OUT / f"shape-diffview-{label}.png"))
                page.click('.vc2c-stage [data-action="view"][data-view="side"]')
            page.click('.vc2c [data-action="select"][data-id="s2"]')
            page.click('.vc2c [data-action="move"][data-delta="-1"]')
            page.click('.vc2c [data-action="run"]')
            page.wait_for_selector(".ws-say__actions button", timeout=5000)
            page.wait_for_timeout(250); page.screenshot(path=str(OUT / f"shape-success-{label}.png"))
            report["screens"].append({"viewport": label, "goalOpen": pre, "goalNextAction": goal_next, "afterNextTitle": next_title,
                                      "goalSizes": goal_sizes, "shapeAfterRun": shape_run, "shapeHint": hint, "shellSay": say_hint,
                                      "shapeSizes": sizes(page)})
            ctx.close()

        # ── SH05: 드래그 20회·undo 20회·미션 변경 ──
        ctx = browser.new_context(viewport={"width": 1366, "height": 768})
        page = ctx.new_page()
        page.on("pageerror", lambda e: report["console"].append(str(e)))
        mount_mission(page, "goal-1")
        before = cards_state(page)
        drops = 0
        for _ in range(20):
            grip = page.locator('.vc2c-palette [data-grip="palette"][data-kind="move"]')
            end = page.locator('.vc2c-track[data-list="root"] > .vc2c-endslot')
            drag(page, grip, end)
            drops += 1
        after_drops = cards_state(page)
        undos = 0
        for _ in range(20):
            btn = page.locator('.vc2c-editor [data-action="undo"]')
            if btn.is_disabled():
                break
            btn.click()
            undos += 1
        after_undo = cards_state(page)
        # 한 번 누르면 정확히 한 장 (리스너 누적 없음)
        page.click('.vc2c-palette [data-action="add"][data-kind="turnLeft"]')
        after_tap = cards_state(page)
        # 드래그 재정렬: 마지막 카드를 맨 앞으로
        last = page.locator('.vc2c-track[data-list="root"] > .vc2c-card').last.locator(".vc2c-grip").first
        first = page.locator('.vc2c-track[data-list="root"] > .vc2c-card').first.locator(".vc2c-cardbtn").first
        drag(page, last, first)
        after_reorder = cards_state(page)
        # 미션 변경: 홈으로 → 도형
        mount_mission(page, "shape-9")
        after_switch = cards_state(page)
        leftovers = page.evaluate("() => document.querySelectorAll('.vc2c-dragghost, .vc2c-dropmark').length")
        report["checks"]["SH05"] = {
            "start": before["count"], "drops": drops, "afterDrops": after_drops["count"], "uniqueAfterDrops": after_drops["unique"],
            "undos": undos, "afterUndo": after_undo["count"], "afterOneTap": after_tap["count"],
            "reorderFirstId": after_reorder["ids"][0] if after_reorder["ids"] else None, "reorderCount": after_reorder["count"],
            "afterMissionSwitch": after_switch, "leftoverDragUi": leftovers,
        }

        # ── SH08: 한 단계씩 — 강조 카드 번호 = 무대 번호 ──
        mount_mission(page, "goal-7")
        page.click('.vc2c [data-action="add"][data-kind="repeat"]')
        page.click('.vc2c [data-action="add"][data-kind="move"]')
        page.click('.vc2c [data-action="add"][data-kind="move"]')
        steps = []
        for _ in range(3):
            page.click('.vc2c-editor [data-action="step"]')
            steps.append(page.evaluate("""() => [...document.querySelectorAll('.vc2c-card.is-running > .vc2c-cardrow .vc2c-num')].map(e => e.textContent)"""))
        page.click('.vc2c-editor [data-action="reset"]')
        running_after_reset = page.evaluate("() => document.querySelectorAll('.vc2c-card.is-running').length")
        page.click('.vc2c-editor [data-action="run"]')
        page.evaluate("() => window.__m.dispose()")  # 실행 중 나가기 → dispose
        page.wait_for_timeout(1500)
        report["checks"]["SH08"] = {"highlightPerStep": steps, "runningAfterReset": running_after_reset,
                                    "vc2cNodesAfterDispose": page.evaluate("() => document.querySelectorAll('.vc2c').length"),
                                    "cssLinks": page.evaluate("() => document.querySelectorAll('#vc2-cards-css').length")}
        ctx.close()

        # ── SH06: 손가락 탭만으로 추가→속성→정렬→실행 (셸 없이 모드를 직접 붙여 임의 미션을 연다) ──
        ctx = browser.new_context(viewport={"width": 1024, "height": 768}, has_touch=True)
        page = ctx.new_page()
        page.on("pageerror", lambda e: report["console"].append(str(e)))
        mount_mission(page, "shape-9")
        page.tap('[data-action="select"][data-id="s1"]')
        page.tap('[data-action="draft"][data-key="color"][data-val="#8D6E63"]')
        page.tap('[data-action="draft-done"]')
        page.tap('[data-action="select"][data-id="s2"]')
        page.tap('[data-action="draft"][data-key="color"][data-val="#E53935"]')
        page.screenshot(path=str(OUT / "shape9-panel-1024x768.png"), full_page=True)
        page.tap('[data-action="draft-done"]')
        page.tap('[data-action="run"]')
        page.wait_for_selector(".vc2c-result.is-ok", timeout=5000)
        sh06 = page.evaluate("() => ({ program: window.__store.getProject().program.nodes.map(n => n.args.color), says: window.__says.slice(-1) })")
        # 자유 도형(12번): 탭으로 도형 추가 → 모양·색·크기·자리 여러 개 바꾸고 완료 → undo 한 번에 되돌아감
        mount_mission(page, "shape-12")
        page.tap('[data-action="add"][data-tray="0"]')
        page.tap('[data-action="draft"][data-key="color"][data-val="#43A047"]')
        page.tap('[data-action="draft"][data-key="size"][data-val="S"]')
        page.tap('[data-action="draft"][data-key="anchor"][data-val="8"]')
        page.screenshot(path=str(OUT / "shape12-panel-1024x768.png"), full_page=True)
        page.tap('[data-action="draft-done"]')
        page.tap('[data-action="add"][data-tray="3"]')
        page.tap('[data-action="draft-cancel"]')
        page.tap('[data-action="select"][data-id="s2"]')
        page.tap('[data-action="draft-cancel"]')
        page.tap('[data-action="move"][data-delta="-1"]')
        sh06b = page.evaluate("() => window.__store.getProject().program")
        page.tap('[data-action="undo"]')
        page.tap('[data-action="undo"]')
        sh06c = page.evaluate("() => window.__store.getProject().program.nodes.map(n => n.args)")
        dbg = page.evaluate("() => { window.__m.dispose(); const d = window.__m._debug(); return { timers: d.timers, raf: d.raf, aborted: d.listenersAborted, nodes: document.querySelectorAll('.vc2c').length }; }")
        report["checks"]["SH06"] = {"shape9Colors": sh06["program"], "lastSay": sh06["says"],
                                    "shape12Order": sh06b["entrypoints"], "shape12AfterTwoUndo": sh06c, "disposeLeak": dbg}
        ctx.close()

        # ── DPR 2 ──
        ctx = browser.new_context(viewport={"width": 1024, "height": 768}, device_scale_factor=2)
        page = ctx.new_page()
        open_real(page, "shape")
        report["checks"]["SH07_dpr2"] = page.evaluate("""() => [...document.querySelectorAll('canvas[data-canvas]')].map(c => ({ css: c.getBoundingClientRect().width, buf: c.width }))""")
        page.screenshot(path=str(OUT / "shape-dpr2-1024x768.png"))
        ctx.close()
        browser.close()

    (OUT / "browser-check.json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print("saved", OUT / "browser-check.json")


if __name__ == "__main__":
    main()
