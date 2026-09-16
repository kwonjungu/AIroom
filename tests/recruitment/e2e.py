# -*- coding: utf-8 -*-
"""실제 브라우저로 채용 관리 전체 흐름을 구동한다.

사용법:
    node tests/recruitment/e2e-server.js &     # 인증만 가짜인 하네스 서버 (3199)
    python tests/recruitment/e2e.py

로그인 -> 배점 편집 -> 지원자 자동 연번 -> 채용 생성 -> 위원 링크 발급 ->
위원 서명/채점/제출 -> 면접대상자 확정 -> 결과 확정 -> Excel/인쇄용 HTML 까지 훑는다.
node --test 로는 잡히지 않는 화면 결함(점수 유실, 배점 반영 누락)을 여기서 잡는다.
"""
import re
import sys
from playwright.sync_api import sync_playwright, expect

BASE = "http://127.0.0.1:3199"
ok, fail = [], []


def step(name, fn):
    try:
        fn()
        ok.append(name)
        print("  OK   " + name, flush=True)
    except Exception as exc:
        msg = str(exc).split("\n")[0][:200]
        fail.append((name, msg))
        print("  FAIL " + name + " -> " + msg, flush=True)


with sync_playwright() as pw:
    browser = pw.chromium.launch()
    ctx = browser.new_context(viewport={"width": 1440, "height": 1000})
    page = ctx.new_page()
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))

    page.goto(BASE + "/recruitment")
    step("로그인 화면 노출", lambda: expect(page.locator("#login-form")).to_be_visible(timeout=8000))
    step("백암이 접근 코드 문구", lambda: expect(page.locator("#login-form .field").first).to_contain_text("백암이 접근 코드"))

    def wrong():
        page.fill("#login-form input[name=code]", "nope")
        page.click("#login-form button.primary")
        expect(page.locator("#message")).to_contain_text("잘못된", timeout=6000)

    step("잘못된 코드 거부", wrong)

    def login():
        page.fill("#login-form input[name=code]", "test-code")
        page.click("#login-form button.primary")
        expect(page.get_by_role("button", name="+ 새 채용")).to_be_visible(timeout=8000)

    step("접근 코드 로그인", login)

    def open_form():
        page.get_by_role("button", name="+ 새 채용").click()
        expect(page.locator("#create-form")).to_be_visible(timeout=6000)

    step("새 채용 폼 열기", open_form)
    step("배점 편집기 노출", lambda: expect(page.locator("#rubric-document .rubric-row")).to_have_count(5))
    step("배점 합계 표시", lambda: expect(page.locator('[data-total="document"]')).to_contain_text("총 50점"))

    def rubric_edit():
        page.click('[data-action="add-criterion"][data-stage="document"]')
        expect(page.locator("#rubric-document .rubric-row")).to_have_count(6)
        row = page.locator("#rubric-document .rubric-row").nth(5)
        row.locator("[name=label]").fill("연수 이수")
        row.locator("[name=max]").fill("4")
        expect(page.locator('[data-total="document"]')).to_contain_text("총 54점")
        page.locator("#rubric-document .rubric-row").nth(4).locator('[data-action="remove-criterion"]').click()
        expect(page.locator('[data-total="document"]')).to_contain_text("총 28점")

    step("항목 추가·삭제·합계 자동계산", rubric_edit)

    def candidates():
        page.fill("[name=candidateCount]", "4")
        expect(page.locator(".candidate-row")).to_have_count(4)
        codes = page.locator(".candidate-code").all_inner_texts()
        assert codes == ["001", "002", "003", "004"], codes
        for i, name in enumerate(["김한결", "이서윤", "박도현", "최민아"]):
            page.locator("[name=candidate-name]").nth(i).fill(name)
        page.fill("[name=candidateCount]", "3")
        expect(page.locator(".candidate-row")).to_have_count(3)
        kept = [v.input_value() for v in page.locator("[name=candidate-name]").all()]
        assert kept == ["김한결", "이서윤", "박도현"], kept

    step("인원수 변경 시 연번 자동부여·이름 보존", candidates)

    def fill_rest():
        page.fill("[name=school]", "백암초등학교")
        page.fill("[name=title]", "2026 기초학력 협력강사 채용")
        page.fill("[name=field]", "기초학력 협력강사")
        page.fill("[name=shortlistLimit]", "2")
        page.fill("[name=documentDate]", "2026-09-21")
        page.fill("[name=interviewDate]", "2026-09-25")
        page.locator("[name=reviewer-name]").fill("권준구")
        page.locator("[name=reviewer-position]").fill("교감")
        page.locator("[name=reviewer-email]").fill("a@example.com")
        page.click('[data-action="add-reviewer"]')
        page.locator("[name=reviewer-name]").nth(1).fill("오세라")
        page.locator("[name=reviewer-position]").nth(1).fill("교사")
        page.locator("[name=reviewer-email]").nth(1).fill("b@example.com")

    step("학교·위원 입력", fill_rest)

    def create():
        page.click("#create-form button.primary")
        expect(page.get_by_text("채용 설정을 저장했습니다.")).to_be_visible(timeout=10000)

    step("채용 생성", create)

    def provision():
        page.get_by_role("button", name="평가 시작하기").click()
        expect(page.get_by_text("평가를 시작했습니다", exact=False)).to_be_visible(timeout=10000)

    step("평가 시작하기", provision)

    links = []

    def invite_all():
        page.once("dialog", lambda d: d.accept())
        page.get_by_role("button", name="위원 전체 링크 발급").click()
        expect(page.locator("#invite-list")).to_be_visible(timeout=10000)
        text = page.locator("#invite-list").input_value()
        found = re.findall(r"https?://\S+#invite=[a-f0-9]{64}", text)
        assert len(found) == 2, text
        links.extend(found)
        expect(page.get_by_role("button", name="전체 링크 복사")).to_be_visible()
        assert page.locator('[data-action="copy-one"]').count() == 2

    step("위원 전체 링크 발급·목록 노출", invite_all)

    def reviewer_flow(idx, sign):
        rp = ctx.new_page()
        rp.on("pageerror", lambda e: errors.append("reviewer: " + str(e)))
        rp.on("console", lambda m: errors.append("reviewer console.%s: %s" % (m.type, m.text)) if m.type == "error" else None)
        rp.goto(links[idx])
        rp.wait_for_timeout(1200)
        rp.get_by_role("button", name="평가 진행").click()
        rp.wait_for_timeout(600)
        if sign:
            expect(rp.locator("#sign-pad")).to_be_visible(timeout=8000)
            rp.locator("#sign-pad").scroll_into_view_if_needed()
            rp.wait_for_timeout(300)
            box = rp.locator("#sign-pad").bounding_box()
            cy = box["y"] + box["height"] / 2
            assert 0 < cy < 1000, "서명란 중심이 뷰포트 밖: %s" % box
            rp.mouse.move(box["x"] + 40, cy)
            rp.mouse.down()
            for dx in range(0, 200, 12):
                rp.mouse.move(box["x"] + 40 + dx, cy - (dx % 40))
            rp.mouse.up()
            rp.get_by_role("button", name="서명 저장").click()
            rp.wait_for_timeout(2000)
            expect(rp.locator("#message")).to_contain_text("서명을 저장했습니다", timeout=8000)
            expect(rp.get_by_text("서명 완료", exact=False).first).to_be_visible(timeout=8000)
        cells = rp.locator("#score-form .score").all()
        assert len(cells) > 0, "점수 입력칸 없음"
        for i, cell in enumerate(cells):
            limit = float(cell.get_attribute("max"))
            value = min(3 + (i % 3), limit)
            cell.fill(str(int(value) if value == int(value) else value))
        btn = rp.get_by_role("button", name="저장 후 평가 제출")
        rp.once("dialog", lambda d: d.accept())
        btn.first.click()
        rp.wait_for_timeout(2500)
        expect(rp.locator("#message")).to_contain_text("평가 제출이 완료되었습니다", timeout=10000)
        rp.close()

    step("위원1 서명·서류채점·제출", lambda: reviewer_flow(0, True))
    step("위원2 서명·서류채점·제출", lambda: reviewer_flow(1, True))

    def shortlist():
        page.reload()
        page.wait_for_timeout(1500)
        page.get_by_role("button", name="통계·결과").click()
        expect(page.locator("#shortlist-form")).to_be_visible(timeout=8000)
        boxes = page.locator("#shortlist-form input[name=candidateId]")
        boxes.nth(0).check()
        boxes.nth(1).check()
        page.fill("#shortlist-form [name=reason]", "서류 상위 2명 선정")
        page.once("dialog", lambda d: d.accept())
        page.click("#shortlist-form button.primary")
        expect(page.get_by_text("면접 평가를 시작합니다", exact=False)).to_be_visible(timeout=10000)

    step("서류 통계 확인·면접대상자 확정", shortlist)
    step("위원1 면접채점·제출", lambda: reviewer_flow(0, False))
    step("위원2 면접채점·제출", lambda: reviewer_flow(1, False))

    def finalize():
        page.reload()
        page.wait_for_timeout(1500)
        page.get_by_role("button", name="통계·결과").click()
        page.once("dialog", lambda d: d.accept())
        page.get_by_role("button", name="결과 확정 · 출력본 준비").click()
        expect(page.get_by_text("확정본 v1", exact=False)).to_be_visible(timeout=12000)

    step("결과 확정", finalize)

    def download_xlsx():
        page.get_by_role("button", name="문서 출력").click()
        with page.expect_download(timeout=20000) as d:
            page.locator('[data-action="download"][data-format="xlsx"]').click()
        assert d.value.suggested_filename.endswith(".xlsx"), d.value.suggested_filename

    step("Excel 다운로드", download_xlsx)

    def print_html():
        with ctx.expect_page(timeout=20000) as popup:
            page.locator('[data-action="download"][data-format="html"]').click()
        p2 = popup.value
        p2.wait_for_load_state("load")
        p2.wait_for_selector("section.page", timeout=15000)
        p2.wait_for_timeout(500)
        body = p2.content()
        count = p2.locator("img.sign-image").count()
        assert count == 2, "서약서 서명 이미지 %d개" % count
        assert "연수 이수" in body, "사용자 정의 항목 미반영"
        p2.close()

    step("인쇄용 HTML에 서명·사용자 배점 반영", print_html)
    browser.close()

print("\n통과 %d / 실패 %d" % (len(ok), len(fail)))
real = [e for e in errors if "favicon" not in e]
if real:
    print("브라우저 오류 %d건:" % len(real))
    for e in real[:8]:
        print("  - " + e[:180])
for n, e in fail:
    print("실패: %s -> %s" % (n, e))
sys.exit(1 if fail or real else 0)
