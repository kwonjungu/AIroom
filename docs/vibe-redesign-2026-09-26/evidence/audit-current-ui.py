"""Read-only UI audit. Blocks API writes and student-data reads.

Run with Python Playwright installed. Screenshots are the existing product,
not proposed v2 designs. No student identity or provider credentials are used.
"""

import json
from pathlib import Path
from playwright.sync_api import sync_playwright

OUTPUT = Path(__file__).resolve().parent
URL = "https://a-iroom.vercel.app/vibecoding.html"


def guard_api(route):
    if route.request.method == "GET" and route.request.url.endswith("/api/ai/status"):
        route.fulfill(status=200, content_type="application/json", body='{"hasServerKey":true}')
    else:
        route.abort()


def audit():
    rows = []
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        for label, width, height in [
            ("desktop", 1440, 900),
            ("tablet", 768, 1024),
            ("mobile", 390, 844),
        ]:
            page = browser.new_page(viewport={"width": width, "height": height}, device_scale_factor=1)
            page.add_init_script("localStorage.setItem('vibe_onboarded','1')")
            page.route("**/api/**", guard_api)
            page.goto(URL, wait_until="domcontentloaded", timeout=45000)
            page.wait_for_function("typeof switchMode === 'function'", timeout=30000)
            page.screenshot(path=str(OUTPUT / f"{label}-home.png"), full_page=True)
            for mode in ["shape", "studio"]:
                page.evaluate("""m => {
                    document.getElementById('titleScreen').classList.add('hidden');
                    switchMode(m, document.querySelector('.mode-tab[data-mode="'+m+'"]'));
                    openMissionSelector();
                }""", mode)
                page.wait_for_timeout(500)
                row = page.evaluate("""() => ({
                    mode:currentMode, missions:getMissions().length,
                    bodyWidth:document.body.scrollWidth, viewport:innerWidth,
                    nodes:[...document.querySelectorAll('.sn-circle,.sn-title,.stage-track')]
                        .slice(0,3).map(e=>({class:e.className,
                        w:Math.round(e.getBoundingClientRect().width),
                        h:Math.round(e.getBoundingClientRect().height),
                        font:getComputedStyle(e).fontSize}))
                })""")
                assert row["mode"] == mode, "Mode entry failed; do not mislabel screenshot"
                row["viewportName"] = label
                page.screenshot(path=str(OUTPUT / f"{label}-{mode}-map.png"), full_page=True)
                if mode == "shape":
                    page.evaluate("""() => {
                        selectMission(getMissions()[0]);
                        startMissionPlay();
                    }""")
                    page.wait_for_timeout(300)
                    page.screenshot(path=str(OUTPUT / f"{label}-shape-workspace.png"), full_page=True)
                    row["emptyVsFirstTarget"] = page.evaluate(
                        "()=>compareShapeCanvas([],getMissions()[0].target)"
                    )
                rows.append(row)
            page.close()
        browser.close()
    report = {
        "source": URL,
        "method": "Existing production UI; programmatic mode/mission selection; no student identity; all API calls blocked except mocked AI status. Not an authenticated backend or live model test.",
        "results": rows,
    }
    (OUTPUT / "browser-audit.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(json.dumps({"rows": len(rows), "shapeEmptyScores": [r["emptyVsFirstTarget"] for r in rows if "emptyVsFirstTarget" in r]}))


if __name__ == "__main__":
    audit()
