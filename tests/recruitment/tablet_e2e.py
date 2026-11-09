# -*- coding: utf-8 -*-
"""태블릿 채점 화면 시험 — 감수 B 루프(docs/review-2026-11-10/B-태블릿채점-감수의견조사서.md).

사용법:
    node tests/recruitment/e2e-server.js &        # 3199
    python tests/recruitment/tablet_e2e.py [--shots 폴더]

두 심사표(강사 표준·계약제 표준)의 모든 전형 채점표를 태블릿 크기(세로·가로)에서 열어
① 페이지·채점표가 옆으로 넘치는지(가로 스크롤) ② 손가락 누름 칸이 44px 이상인지 ③ 실제로 눌러 저장되는지 잰다.
--shots 를 주면 크기별 화면 사진을 남긴다.
"""
import json
import os
import sys
import urllib.request
from playwright.sync_api import sync_playwright

BASE = "http://127.0.0.1:3199"
API = BASE + "/api/recruitments"
VIEWPORTS = [("태블릿 세로 768", 768, 1024), ("태블릿 세로 820", 820, 1180), ("태블릿 가로 1024", 1024, 768), ("태블릿 가로 1180", 1180, 820), ("태블릿 가로 1366", 1366, 1024)]
SHOTS = sys.argv[sys.argv.index("--shots") + 1] if "--shots" in sys.argv else None
ok, fail = [], []
PNG = "data:image/png;base64," + __import__("base64").b64encode(bytes([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]) + bytes([9]) * 400).decode()


def call(path, method="GET", body=None, token=None):
    headers = {"Content-Type": "application/json"}
    if token: headers["X-Recruitment-Token"] = token
    else: headers["X-Auth-Token"] = "sess-user"
    req = urllib.request.Request(API + path, method=method, data=None if body is None else json.dumps(body).encode(), headers=headers)
    with urllib.request.urlopen(req) as res:
        return json.loads(res.read())


def full_rows(r, stage):
    rows = []
    for c in r["candidates"]:
        picks = {}
        for item in r["rubrics"][stage]:
            k = item.get("kind")
            if k in ("pick", "scale"): picks[item["id"]] = 0
            elif k == "sum": picks[item["id"]] = [0] * len(item["options"])
        rows.append({"candidateId": c["id"], "attendance": "present", "scores": {i["id"]: i["max"] for i in r["rubrics"][stage] if not i.get("kind") or i.get("kind") == "judge"}, "picks": picks, "bonus": 0, "note": ""})
    return rows


def setup(preset):
    stages = ["document", "interview", "demo"] if preset == "contract-teacher" else ["document", "interview"]
    body = {"school": "테스트학교", "title": f"태블릿 {preset}", "field": "강사", "documentDate": "2026-09-20", "interviewDate": "2026-09-21",
            "rankingBasis": "combined", "shortlistLimit": 3, "allowBonus": True, "preset": preset,
            "candidates": [{"code": f"{i:03d}", "name": f"지원자{i}"} for i in range(1, 21)],  # 20명: 바로가기 줄이 두 줄로 넘어가는 경우까지
            "reviewers": [{"name": "서류위원", "position": "교감", "stages": ["document"]}, {"name": "면접위원", "position": "교사", "stages": stages[1:]}]}
    if preset == "contract-teacher": body.update({"recruitType": "기간제", "subject": "국어"})
    r = call("", "POST", body)
    toks = []
    for v in r["reviewers"]:
        inv = call(f"/{r['id']}/invites/{v['id']}", "POST", {"version": r["version"]}); r = inv["recruitment"]; toks.append(inv["invitationPath"])
    r = call(f"/{r['id']}/provision", "POST", {"version": r["version"]})
    return r, toks, stages


def advance(r, doc_path):
    tok = doc_path.split("invite=")[1]
    r = call(f"/{r['id']}", token=tok)  # 화면에서 눌러 저장한 뒤라 최신 상태와 내 채점표 시각(base)을 다시 읽는다
    base = (r["evaluations"].get(f"document:{r['actor']['id']}") or {}).get("updatedAt")
    r = call(f"/{r['id']}/evaluations/document/save", "POST", {"version": r["version"], "base": base, "rows": full_rows(r, "document")}, tok)
    r = call(f"/{r['id']}/pledge", "POST", {"version": r["version"], "image": PNG}, tok)
    r = call(f"/{r['id']}/evaluations/document/submit", "POST", {"version": r["version"], "base": r["evaluations"][f"document:{r['actor']['id']}"]["updatedAt"]}, tok)
    return call(f"/{r['id']}/shortlist", "POST", {"version": r["version"], "candidateIds": [c["id"] for c in r["candidates"][:3]], "reason": "상위 선정"})


MEASURE = """() => {
  const doc = document.scrollingElement, wrap = document.querySelector('.score-wrap'), form = document.querySelector('#score-form');
  const vw = window.innerWidth;
  const targets = [...form.querySelectorAll('.chip, .opt, input.score, textarea.score-note, .sum-pick label, button')].filter(e => e.offsetParent);
  const small = targets.filter(e => { const b = e.getBoundingClientRect(); return b.height < 44; }).length;
  const outside = targets.filter(e => { const b = e.getBoundingClientRect(); return b.right > vw + 1; }).length;
  return { pageOverflow: doc.scrollWidth - vw, wrapOverflow: wrap ? wrap.scrollWidth - wrap.clientWidth : 0, small, outside, total: targets.length };
}"""


with sync_playwright() as p:
    browser = p.chromium.launch()
    for preset in ["standard", "contract-teacher"]:
        r, toks, stages = setup(preset)
        plan = [("document", toks[0])] + [(s, toks[1]) for s in stages[1:]]
        for stage, path in plan:
            if stage != "document" and r["shortlist"] == []: r = advance(r, toks[0])  # 서류를 다 잰 뒤에 면접 대상을 정한다
            for label, w, h in VIEWPORTS:
                name = f"{preset} {stage} {label}"
                ctx = browser.new_context(viewport={"width": w, "height": h}, has_touch=True, is_mobile=False)
                page = ctx.new_page(); page.goto(BASE + path); page.wait_for_selector("#score-form")
                sw = page.locator(f".stage-switch button[data-stage={stage}]")
                if sw.count(): sw.click(); page.wait_for_selector(f"#score-form[data-stage={stage}]")
                m = page.evaluate(MEASURE)
                if SHOTS:
                    os.makedirs(SHOTS, exist_ok=True)
                    page.locator("#score-form").screenshot(path=os.path.join(SHOTS, f"{preset}-{stage}-{w}x{h}.png"))
                locked = page.locator("#score-form input:not([disabled])").count() == 0

                def check(m=m):
                    assert m["pageOverflow"] <= 0, f"페이지가 {m['pageOverflow']}px 옆으로 넘침"
                    assert m["wrapOverflow"] <= 0, f"채점표가 {m['wrapOverflow']}px 옆으로 넘침(좌우로 밀어야 함)"
                    assert m["outside"] == 0, f"화면 밖 누름 칸 {m['outside']}개"
                    assert m["small"] == 0, f"44px 미만 누름 칸 {m['small']}/{m['total']}개"
                step_name = f"{name} — 옆 넘침 없음·누름 칸 44px"
                try: check(); ok.append(step_name); print("  OK   " + step_name + f"  {m}", flush=True)
                except AssertionError as e: fail.append((step_name, str(e))); print("  FAIL " + step_name + " -> " + str(e), flush=True)

                if not locked and label == "태블릿 세로 768":
                    def tap_and_save():
                        first = page.locator("#score-form tr[data-candidate]").first
                        for chips in first.locator(".chips.scale, .opt-list").all():
                            chips.locator(".chip, .opt").first.tap()
                        score = first.locator("input.score")
                        for i in range(score.count()): score.nth(i).fill("1"); score.nth(i).blur()
                        page.evaluate("document.getElementById('message').hidden = true")
                        page.locator("#score-form button[type=submit]").tap()
                        page.wait_for_selector("#message:not([hidden])"); assert "임시 저장" in page.locator("#message").inner_text()
                        total = first.locator(".row-total").inner_text(); assert "점" in total, total
                    sn = f"{name} — 눌러서 채점·임시 저장"
                    try: tap_and_save(); ok.append(sn); print("  OK   " + sn, flush=True)
                    except Exception as e: fail.append((sn, str(e).split(chr(10))[0][:200])); print("  FAIL " + sn + " -> " + str(e).split(chr(10))[0][:200], flush=True)
                def settle(pg, sel):
                    # 부드러운 이동이 멈출 때까지 기다린다(먼 거리는 0.7초보다 오래 걸린다).
                    pg.wait_for_timeout(300); prev = None
                    for _ in range(40):
                        cur = pg.evaluate("s => Math.round(document.querySelector(s).getBoundingClientRect().top)", sel)
                        if cur == prev: break
                        prev = cur; pg.wait_for_timeout(200)

                def jump_check(pg):
                    bar = pg.locator(".cand-jump")
                    assert bar.is_visible(), "바로가기 줄이 보이지 않음"
                    n = bar.locator(".jump").count(); targets = sorted({n // 2, max(0, n - 3)})
                    for i in targets:
                        target = bar.locator(".jump").nth(i); tid = target.get_attribute("data-id"); sel = f'#score-form tr[data-candidate="{tid}"]'
                        target.tap(); settle(pg, sel)
                        top = pg.evaluate("s => document.querySelector(s).getBoundingClientRect().top", sel)
                        barb = pg.evaluate("() => document.querySelector('.cand-jump').getBoundingClientRect().bottom")
                        at_end = pg.evaluate("() => Math.ceil(scrollY + innerHeight) >= document.scrollingElement.scrollHeight - 2")
                        assert top >= barb - 1, f"{i + 1}번째 지원자 카드 머리({top:.0f}px)가 바로가기 줄(아래 끝 {barb:.0f}px) 밑에 가려짐"
                        assert top <= barb + 40 or at_end, f"{i + 1}번째 지원자 카드가 줄 바로 아래에 오지 않음({top:.0f}px, 줄 아래 끝 {barb:.0f}px)"
                        if not at_end:
                            cur = pg.evaluate("() => document.querySelector('.cand-jump [aria-current=true]')?.dataset.id")
                            assert cur == tid, f"지금 보는 지원자 표시가 어긋남({cur} != {tid})"
                    states = pg.evaluate("() => [...document.querySelectorAll('.cand-jump .jump')].map(b => b.dataset.state)")
                    assert all(states), f"상태 표시 없는 단추: {states}"
                    return n, pg.evaluate("() => document.querySelector('.cand-jump').offsetHeight")

                sn = f"{name} — 지원자 바로가기 이동(카드 머리 안 가림)·현재 표시·상태"
                try: n, h_bar = jump_check(page); ok.append(sn); print("  OK   " + sn + f"  단추 {n}개 · 줄 높이 {h_bar}px", flush=True)
                except Exception as e: fail.append((sn, str(e).split(chr(10))[0][:200])); print("  FAIL " + sn + " -> " + str(e).split(chr(10))[0][:200], flush=True)
                if label in ("태블릿 세로 768", "태블릿 가로 1180"):
                    # 카피본처럼 화면 맨 위에 붙은 띠(시연 바)가 있어도 줄이 그 밑에 깔리지 않아야 한다.
                    cctx = browser.new_context(viewport={"width": w, "height": h}, has_touch=True)
                    cctx.add_init_script("""document.addEventListener('DOMContentLoaded', () => { const b = document.createElement('div'); b.id = 'fake-copy-bar'; b.style.cssText = 'position:sticky;top:0;z-index:99999;padding:6px 14px;background:#2D3748;color:#fff;font:13px/1.5 system-ui'; b.textContent = '시연용 카피본 띠(시험)'; document.body.insertBefore(b, document.body.firstChild); });""")
                    cp = cctx.new_page(); cp.goto(BASE + path); cp.wait_for_selector("#score-form")
                    if cp.locator(f".stage-switch button[data-stage={stage}]").count(): cp.locator(f".stage-switch button[data-stage={stage}]").click(); cp.wait_for_selector(f"#score-form[data-stage={stage}]")
                    sn = f"{name} — 위에 붙은 시연 띠가 있어도 바로가기 줄·카드가 가리지 않음"
                    def copy_check():
                        jump_check(cp)
                        band = cp.evaluate("() => document.getElementById('fake-copy-bar').getBoundingClientRect().bottom")
                        bar_top = cp.evaluate("() => document.querySelector('.cand-jump').getBoundingClientRect().top")
                        assert bar_top >= band - 1, f"바로가기 줄({bar_top:.0f}px)이 시연 띠(아래 끝 {band:.0f}px) 밑에 깔림"
                    try: copy_check(); ok.append(sn); print("  OK   " + sn, flush=True)
                    except Exception as e: fail.append((sn, str(e).split(chr(10))[0][:200])); print("  FAIL " + sn + " -> " + str(e).split(chr(10))[0][:200], flush=True)
                    cctx.close()
                ctx.close()
    browser.close()

print(f"\n통과 {len(ok)} · 실패 {len(fail)}")
sys.exit(1 if fail else 0)
