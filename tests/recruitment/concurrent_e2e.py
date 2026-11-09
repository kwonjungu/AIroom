# -*- coding: utf-8 -*-
"""동시 접속(중복 로그인) 화면 회귀 시험 — 감수 A 루프.

사용법:
    node tests/recruitment/e2e-server.js &     # 3199
    python tests/recruitment/concurrent_e2e.py

위원 두 명이 같은 채용을 각자 브라우저(따로 된 컨텍스트)로 열고 번갈아 임시 저장한다.
예전에는 두 번째 사람이 409 로 막히고 새로고침 전까지 모든 단추가 실패했다.
관리자 화면도 다른 관리자가 먼저 바꾼 뒤 단추를 누르면 최신 내용을 불러오고, 다시 누르면 통해야 한다.
"""
import json
import sys
sys.stdout.reconfigure(encoding='utf-8')  # Windows 기본 인코딩에서 출력이 멈추지 않게
import urllib.request
from playwright.sync_api import sync_playwright

BASE = "http://127.0.0.1:3199"
API = BASE + "/api/recruitments"
ok, fail = [], []


def call(path, method="GET", body=None):
    req = urllib.request.Request(API + path, method=method, data=None if body is None else json.dumps(body).encode(),
                                 headers={"Content-Type": "application/json", "X-Auth-Token": "sess-user"})
    with urllib.request.urlopen(req) as res:
        return json.loads(res.read())


def step(name, fn):
    try:
        fn(); ok.append(name); print("  OK   " + name, flush=True)
    except Exception as exc:
        fail.append((name, str(exc).split("\n")[0][:200])); print("  FAIL " + name + " -> " + str(exc).split("\n")[0][:200], flush=True)


r = call("", "POST", {"school": "테스트학교", "title": "동시 접속 화면", "field": "강사", "documentDate": "2026-09-20", "interviewDate": "2026-09-21",
                     "rankingBasis": "combined", "shortlistLimit": 1, "allowBonus": False,
                     "candidates": [{"code": "001", "name": "지원자가"}, {"code": "002", "name": "지원자나"}],
                     "reviewers": [{"name": "위원갑", "position": "교사", "email": "a@example.com", "stages": ["document", "interview"]},
                                   {"name": "위원을", "position": "교사", "email": "b@example.com", "stages": ["document", "interview"]}]})
links = []
for v in r["reviewers"]:
    inv = call(f"/{r['id']}/invites/{v['id']}", "POST", {"version": r["version"]}); r = inv["recruitment"]; links.append(BASE + inv["invitationPath"])
r = call(f"/{r['id']}/provision", "POST", {"version": r["version"]})
RID = r["id"]


def fill_first_inputs(page):
    # 재량 점수 칸(숫자 입력)이 있으면 하나 채워 '입력 중' 상태를 만든다. 고르기형이면 첫 단추를 누른다.
    score = page.locator("#score-form input.score:not([disabled])")
    if score.count():
        score.first.fill("1"); score.first.blur()
    else:
        page.locator("#score-form .opt, #score-form .chip").first.click()


def message(page):
    page.wait_for_selector("#message:not([hidden])", timeout=8000)
    return page.locator("#message").inner_text()


def press(page, locator):
    # 앞 안내가 6초 동안 남아 있으므로 누르기 전에 지워서 이번 누름의 안내만 읽는다.
    page.evaluate("document.getElementById('message').hidden = true")
    locator.click()
    return message(page)


with sync_playwright() as p:
    browser = p.chromium.launch()
    ctx_a, ctx_b = browser.new_context(viewport={"width": 1180, "height": 820}), browser.new_context(viewport={"width": 1180, "height": 820})
    a, b = ctx_a.new_page(), ctx_b.new_page()
    a.goto(links[0]); b.goto(links[1])
    a.wait_for_selector("#score-form"); b.wait_for_selector("#score-form")

    def alternate():
        fill_first_inputs(a); fill_first_inputs(b)
        m = press(a, a.locator("#score-form button[type=submit]")); assert "임시 저장" in m, m
        m = press(b, b.locator("#score-form button[type=submit]")); assert "임시 저장" in m, "을 막힘: " + m
        fill_first_inputs(a)
        m = press(a, a.locator("#score-form button[type=submit]")); assert "임시 저장" in m, "갑 두 번째 막힘: " + m
    step("위원 두 명이 번갈아 임시 저장해도 둘 다 통과(새로고침 없음)", alternate)

    def both_saved():
        cur = call("/" + RID)
        assert all(f"document:{v['id']}" in cur["evaluations"] for v in cur["reviewers"]), list(cur["evaluations"].keys())
    step("두 위원의 저장이 모두 서버에 남음", both_saved)

    # 같은 위원이 두 기기(PC·태블릿)에서 같은 링크를 연다. 태블릿이 먼저 저장하면 PC 의 낡은 저장은 막히고 태블릿 점수를 보여 준다.
    ctx_pc = browser.new_context(viewport={"width": 1366, "height": 900}); pc = ctx_pc.new_page()
    ctx_tab = browser.new_context(viewport={"width": 820, "height": 1180}, has_touch=True); tab = ctx_tab.new_page()
    pc.goto(links[0]); tab.goto(links[0]); pc.wait_for_selector("#score-form"); tab.wait_for_selector("#score-form")

    def same_reviewer_two_devices():
        def first_score(page):
            return page.locator("#score-form tr[data-candidate]").first.locator("input.score").first
        first_score(tab).fill("2"); first_score(tab).blur()
        m = press(tab, tab.locator("#score-form button[type=submit]")); assert "임시 저장" in m, m
        first_score(pc).fill("1"); first_score(pc).blur()
        m = press(pc, pc.locator("#score-form button[type=submit]")); assert "다른 기기" in m, "PC 안내: " + m
        assert first_score(pc).input_value() == "2", "PC 화면이 태블릿 점수를 보여 줘야 함: " + first_score(pc).input_value()
        cur = call("/" + RID); judge = next(i for i in cur["rubrics"]["document"] if i.get("kind") in (None, "judge"))
        assert cur["evaluations"][f"document:{cur['reviewers'][0]['id']}"]["rows"][0]["scores"][judge["id"]] == 2
        first_score(pc).fill("3"); first_score(pc).blur()
        m = press(pc, pc.locator("#score-form button[type=submit]")); assert "임시 저장" in m, "확인 뒤 다시 저장: " + m
    step("같은 위원 두 기기: 낡은 기기 저장은 막고 최신 점수를 보여 준 뒤, 다시 저장하면 통함", same_reviewer_two_devices)

    # 관리자 두 명: 관리자 화면을 열어 둔 사이 다른 관리자가 링크를 재발급한다.
    ctx_m = browser.new_context(viewport={"width": 1180, "height": 820}); m = ctx_m.new_page()
    m.goto(BASE + "/recruitment"); m.evaluate("localStorage.setItem('airoom_auth_token','sess-user')"); m.goto(BASE + "/recruitment?id=" + RID)
    m.wait_for_selector("[data-action=invite]")

    def admin_recovers():
        cur = call("/" + RID); call(f"/{RID}/invites/{cur['reviewers'][0]['id']}", "POST", {"version": cur["version"]})  # 다른 관리자
        first = press(m, m.locator("[data-action=invite]").nth(1))
        assert "최신 내용을 불러왔습니다" in first, "첫 누름 안내: " + first
        second = press(m, m.locator("[data-action=invite]").nth(1))
        assert "발급" in second, "두 번째 누름: " + second
    step("관리자: 충돌 뒤 최신 내용을 불러오고 다시 누르면 통함", admin_recovers)
    browser.close()

print(f"\n통과 {len(ok)} · 실패 {len(fail)}")
sys.exit(1 if fail else 0)
