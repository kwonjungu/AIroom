# -*- coding: utf-8 -*-
"""학교 공간(/hub) 브라우저 E2E. 실제 server.js 를 띄운 뒤 돌린다.
    PORT=3195 node server.js &   (로컬 기본 관리자 코드 admin1234)
    python tests/hub_e2e.py http://127.0.0.1:3195 admin1234 [캡처폴더]
관리자 로그인 → NEIS 에서 학교 찾아 등록 → 학교 로그인 → 학교 공간 → 채용 만들기 → 위원 링크(학교 공간 주소) → 미등록 학교 차단."""
import re, sys, pathlib
from playwright.sync_api import sync_playwright, expect
BASE, ADMIN = sys.argv[1], sys.argv[2]
SHOT = pathlib.Path(sys.argv[3]) if len(sys.argv) > 3 else None
if SHOT: SHOT.mkdir(parents=True, exist_ok=True)
ok, fail = [], []
def step(name, fn):
    try: fn(); ok.append(name); print('  OK  ', name, flush=True)
    except Exception as e: fail.append(name); print('  FAIL', name, '->', str(e)[:1200], flush=True)
def snap(pg, name):
    # 설명서에 넣기 좋게 본문(#app)만 찍는다. 본문이 없으면 화면 전체.
    if SHOT:
        el = pg.locator('#app')
        (el if el.count() else pg).screenshot(path=str(SHOT / f'h-{name}.png'))

with sync_playwright() as pw:
    b = pw.chromium.launch()
    ctx = b.new_context(viewport={'width': 1280, 'height': 860}, locale='ko-KR'); pg = ctx.new_page()
    pg.on('dialog', lambda d: d.accept())
    code = {}
    def admin_login():
        pg.goto(BASE + '/hub/admin'); pg.fill('#admin-login [name=code]', ADMIN); snap(pg, '01-admin-login')
        pg.locator('#admin-login button').click(); expect(pg.get_by_role('heading', name='학교 공간 관리')).to_be_visible(timeout=15000)
    step('관리자 로그인(백암이 관리자 코드)', admin_login)
    def register():
        pg.fill('#find [name=q]', '백암초등학교'); pg.locator('#find button').click()
        expect(pg.locator('#found button').first).to_be_visible(timeout=20000)
        pg.locator('#found button', has_text='백암초등학교').first.click()
        pg.locator('#gen').click(); code['v'] = pg.locator('#register [name=code]').input_value(); snap(pg, '02-admin-register')
        pg.locator('#register button.primary').click(); expect(pg.locator('tr[data-id]')).to_have_count(1, timeout=15000); snap(pg, '03-admin-list')
    step('NEIS 에서 학교 찾아 등록·코드 발급', register)
    sid = pg.locator('tr[data-id]').first.get_attribute('data-id') if pg.locator('tr[data-id]').count() else ''
    def school_login():
        c2 = b.new_context(viewport={'width': 1280, 'height': 860}, locale='ko-KR'); p2 = c2.new_page(); p2.on('dialog', lambda d: d.accept())
        p2.goto(BASE + '/hub'); p2.fill('#q', '백암초등학교'); p2.locator('#search-form button').click()
        expect(p2.locator('#results button:not([disabled])').first).to_be_visible(timeout=20000); snap(p2, '04-login-search')
        p2.locator('#results button:not([disabled])', has_text='백암초등학교').first.click()
        p2.fill('#code-form [name=code]', 'WRONG-CODE'); p2.locator('#code-form button').click(); expect(p2.locator('#err')).to_contain_text('맞지 않습니다', timeout=10000)
        p2.fill('#code-form [name=code]', code['v']); snap(p2, '05-login-code'); p2.locator('#code-form button').click()
        expect(p2.get_by_role('heading', name='백암초등학교')).to_be_visible(timeout=15000); snap(p2, '06-school-home')
        p2.locator('a.tool', has_text='채용 관리').click()
        p2.wait_for_url(re.compile(r'/recruitment'), timeout=15000)
        try: expect(p2.get_by_role('button', name='+ 새 채용')).to_be_visible(timeout=15000)
        except Exception: snap(p2, '06b-recruit-fail'); print('    화면:', p2.url, p2.locator('#app').inner_text()[:200].replace(chr(10), ' | ')); raise
        p2.get_by_role('button', name='+ 새 채용').click(); p2.select_option('#create-form [name=preset]', 'contract-teacher')
        p2.locator('[data-action=fill-example]').click(); p2.get_by_role('button', name='채용 생성').click()
        try: expect(p2.locator('[data-action=provision]').first).to_be_visible(timeout=15000)
        except Exception: print('    알림:', p2.locator('#message').inner_text(), '| invalid:', p2.evaluate("()=>[...document.querySelectorAll('#create-form :invalid')].map(e=>e.name)")); raise
        assert re.search(rf'/hub/s/{sid}/recruitment\?id=', p2.url), p2.url
        p2.locator('[data-action=provision]').first.click(); p2.locator('[data-action=invite-all]').click()
        expect(p2.locator('#invite-list')).to_be_visible(timeout=15000); snap(p2, '07-school-recruit')
        link = re.findall(r'https?://\S+', p2.locator('#invite-list').input_value())[0]
        assert f'/hub/s/{sid}/recruitment?id=' in link, link
        c3 = b.new_context(viewport={'width': 390, 'height': 844}, locale='ko-KR'); p3 = c3.new_page(); p3.goto(link)
        expect(p3.locator('#sign-pad')).to_be_visible(timeout=15000); snap(p3, '08-reviewer-link'); c3.close(); c2.close()
    step('학교 코드 로그인 → 학교 공간 → 채용 → 위원 링크', school_login)
    def unregistered():
        c4 = b.new_context(); p4 = c4.new_page(); p4.goto(BASE + '/hub'); p4.fill('#q', '서울대치초등학교'); p4.locator('#search-form button').click()
        expect(p4.locator('#results li').first).to_be_visible(timeout=20000)
        if p4.locator('#results button').count(): expect(p4.locator('#results button').first).to_be_disabled(); expect(p4.locator('#results')).to_contain_text('미등록')
        c4.close()
    step('미등록 학교는 고를 수 없음', unregistered)
    def admin_open():
        pg.reload(); expect(pg.locator('tr[data-id]')).to_contain_text('채용 1건', timeout=15000)
        with ctx.expect_page() as pop: pg.locator('tr[data-id] a.primary').first.click()
        p5 = pop.value; expect(p5.locator('.card').first).to_be_visible(timeout=15000); p5.close()
    step('관리자: 학교 데이터 집계·학교 채용 열기', admin_open)
    def migrate():
        pg.locator('#migrate button').click(); expect(pg.locator('#message')).to_contain_text('옮김', timeout=15000)
        pg.goto(BASE + '/recruitment'); assert f'/hub/s/{sid}/recruitment' in pg.url, pg.url
    step('백암이 채용 옮기기 → /recruitment 가 학교 공간으로', migrate)
    b.close()
print(f'\n통과 {len(ok)} / 실패 {len(fail)}'); sys.exit(1 if fail else 0)
