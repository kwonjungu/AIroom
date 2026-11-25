# D1 화면 시험. 실행: python tests/zzoom/d1_e2e.py [스크린샷 폴더]
# 가짜 api·store 로 list.js·join.js 만 시험한다(d1_harness.js 가 app.js 대신 들어감).
import sys, os, mimetypes
from playwright.sync_api import sync_playwright
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
PUB = os.path.join(ROOT, 'public')
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.environ.get('TEMP', '.'), 'd1shots')
os.makedirs(OUT, exist_ok=True)
HARNESS = open(os.path.join(os.path.dirname(__file__), 'd1_harness.js'), encoding='utf-8').read()
BASE = 'http://zz.test'
fails = []
passes = [0]


def ok(c, msg):
    if c:
        passes[0] += 1
    else:
        fails.append(msg)
        print('FAIL', msg)


def handler(route, req):
    p = req.url[len(BASE):].split('?')[0]
    if not p.startswith('/zzoom/'):
        return route.abort()
    if p == '/zzoom/app.js':
        return route.fulfill(status=200, content_type='text/javascript', body=HARNESS)
    f = os.path.join(PUB, p.lstrip('/').replace('/', os.sep))
    if not os.path.isfile(f):
        return route.fulfill(status=404, body='')
    ct = mimetypes.guess_type(f)[0] or 'application/octet-stream'
    if f.endswith('.js'):
        ct = 'text/javascript'
    route.fulfill(status=200, content_type=ct, body=open(f, 'rb').read())


def calls_of(pg, name):
    return [c for c in pg.evaluate('window.__calls') if isinstance(c, list) and c[0] == name]


def run(pw, label, kw):
    b = pw.chromium.launch(**kw)
    for (w, h) in [(1280, 800), (820, 1180)]:
        tag = f'{label}-{w}'
        cb = b.new_context(viewport={'width': w, 'height': h})
        cb.route('**/*', lambda r, rq: handler(r, rq) if rq.url.startswith(BASE) else r.abort())
        errs = []

        def mk(scen, hash_='#/'):
            pg = cb.new_page()
            pg.on('pageerror', lambda e: errs.append(str(e)))
            pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' and 'Failed to load resource' not in m.text else None)
            pg.goto(f'{BASE}/zzoom/index.html?s={scen}{hash_}')
            pg.wait_for_function('window.__ready === true')
            pg.wait_for_timeout(250)
            return pg

        pg = mk('admin')
        ok(pg.locator('.zl-card').count() == 3, f'{tag} 카드 3')
        ok(pg.locator('.zl-card').first.get_attribute('data-mid') == 'a2', f'{tag} 진행 중 먼저')
        ok(pg.locator('.zl-unlock').count() == 1, f'{tag} 잠금 풀기 1')
        ok('2일 뒤' in pg.inner_text('.zl-card >> nth=0'), f'{tag} D-n 문구')
        pg.screenshot(path=os.path.join(OUT, f'{tag}-list-admin.png'))
        ok(pg.evaluate('document.documentElement.scrollWidth <= window.innerWidth'), f'{tag} 가로 넘침 없음')
        small = pg.evaluate("[...document.querySelectorAll('#zz-list .zz-btn')].filter(b=>{const r=b.getBoundingClientRect();return r.height<43.5||r.width<43.5}).length")
        ok(small == 0, f'{tag} 44px 미만 단추 {small}')
        pg.click('.zl-new')
        pg.wait_for_selector('.zl-form')
        pg.click('.zl-form button[type=submit]')
        ok('제목' in pg.inner_text('.zl-form-error'), f'{tag} 빈 제목 오류')
        pg.fill('#zl-f-title', '새 회의')
        pg.fill('#zl-f-code', '12a34b56')
        ok(pg.input_value('#zl-f-code') == '123456', f'{tag} 코드 숫자만')
        pg.screenshot(path=os.path.join(OUT, f'{tag}-form.png'))
        pg.click('.zl-form button[type=submit]')
        pg.wait_for_timeout(300)
        ok(any(c[1]['hostCode'] == '123456' for c in calls_of(pg, 'create')), f'{tag} createMeeting 호출')
        ok(pg.locator('.zl-card').count() == 4 and pg.locator('.zz-modal').count() == 1, f'{tag} 생성 뒤 목록 4, 만든 뒤 안내 창')
        ok('123456' in pg.inner_text('.zz-modal') and pg.locator('.zl-done-go').count() == 1, f'{tag} 만든 뒤 담당자 비밀번호와 지금 회의 열기')
        pg.screenshot(path=os.path.join(OUT, f'{tag}-done.png'))
        pg.click('.zl-done-back')
        ok(pg.locator('.zz-modal').count() == 0, f'{tag} 목록으로 닫힘')
        a3 = pg.locator('.zl-card[data-mid="a3"] .zl-enter')
        ok(a3.inner_text().strip() == '기록 보기' and 'primary' not in (a3.get_attribute('class') or ''), f'{tag} 끝난 회의는 테두리 기록 보기')
        ok(pg.locator('.zl-card[data-mid="a2"] .zl-enter').inner_text().strip() == '회의 들어가기', f'{tag} 회의 들어가기')
        ok('회의 중' in pg.inner_text('.zl-card[data-mid="a2"]') and '시작 전' in pg.inner_text('.zl-card[data-mid="a1"]'), f'{tag} 상태 낱말')
        ok('지워져요' not in pg.inner_text('.zl-card[data-mid="a1"]'), f'{tag} 9일 남은 회의는 남은 날 안 보임')
        ok(pg.locator('.zl-refresh').count() == 0, f'{tag} 새로 고침 단추 없음')
        pg.click('.zl-unlock')
        pg.wait_for_timeout(250)
        ok(pg.locator('.zl-unlock').count() == 0, f'{tag} 잠금 풀림')
        pg.locator('.zl-edit').nth(1).click()
        pg.wait_for_selector('.zl-form')
        pg.fill('#zl-f-title', '제목 바꿈')
        pg.click('.zl-form button[type=submit]')
        pg.wait_for_timeout(250)
        up = calls_of(pg, 'update')
        ok(len(up) == 1 and 'hostCode' not in up[0][2] and up[0][2].get('title') == '제목 바꿈', f'{tag} 수정은 바뀐 것만 {up}')
        n0 = pg.locator('.zl-card').count()
        pg.locator('.zl-del').first.click()
        pg.wait_for_selector('.zz-modal .danger')
        pg.screenshot(path=os.path.join(OUT, f'{tag}-delete.png'))
        pg.click('.zz-modal .danger')
        pg.wait_for_timeout(300)
        ok(pg.locator('.zl-card').count() == n0 - 1, f'{tag} 삭제됨')
        pg.click('.zl-new')
        ok(pg.locator('.zz-modal').count() == 1, f'{tag} 모달 열림')
        pg.evaluate('window.__mods.forEach(m=>m.unmount())')
        ok(pg.locator('.zz-modal').count() == 0 and pg.locator('#zz-list').inner_html() == '', f'{tag} unmount 정리')
        pg.close()

        pg = mk('user')
        # 새 규칙(2026-11-25): 누구나 회의 만들기, 수정·삭제는 내가 만든 회의(mine)나 관리자만
        ok(pg.locator('.zl-new').count() == 1, f'{tag} 일반 사용자도 회의 만들기')
        mine = pg.locator('.zl-card[data-mid="a1"]')
        ok(pg.locator('.zl-edit').count() == 1 and pg.locator('.zl-del').count() == 1 and mine.locator('.zl-edit').count() == 1, f'{tag} 남의 회의는 관리 단추 없음, 내 회의만 있음')
        ok(pg.locator('.zl-enter').count() == 3, f'{tag} 입장 링크')
        ok(pg.locator('.zl-enter').first.get_attribute('href') == '#/m/a2', f'{tag} 링크 해시')
        # 만든 뒤 지금 회의 열기: 회의로 가며 바로 들어가기 표시만 남긴다(번호는 저장 안 함)
        pg.click('.zl-new'); pg.fill('#zl-f-title', '바로 열 회의'); pg.click('.zl-dice')
        code = pg.input_value('#zl-f-code')
        pg.click('.zl-form button[type=submit]'); pg.wait_for_selector('.zl-done-go')
        pg.click('.zl-done-go'); pg.wait_for_timeout(150)
        st = pg.evaluate("[location.hash, sessionStorage.getItem('zz_autojoin'), sessionStorage.getItem('zz_peek:n3'), JSON.stringify(sessionStorage), JSON.stringify(localStorage)]")
        ok(st[0] == '#/m/n3' and st[1] == 'n3' and '바로 열 회의' in (st[2] or ''), f'{tag} 지금 회의 열기 {st[:3]}')
        ok(len(code) == 6 and code not in st[3] and code not in st[4], f'{tag} 비밀번호 저장 안 함')
        pg.close()

        pg = mk('empty')
        ok(pg.locator('.zl-empty-img').count() == 1, f'{tag} 빈 그림')
        ok(pg.evaluate("document.querySelector('.zl-empty-img').naturalWidth") > 0, f'{tag} 빈 그림 로드')
        pg.screenshot(path=os.path.join(OUT, f'{tag}-empty.png'))
        pg.close()

        pg = mk('neterr')
        ok('연결이 끊겼어요' in pg.inner_text('.zl-error'), f'{tag} 연결 오류 문구')
        pg.screenshot(path=os.path.join(OUT, f'{tag}-error.png'))
        pg.close()

        pg = mk('createfail')
        pg.click('.zl-new')
        pg.fill('#zl-f-title', 'x')
        pg.fill('#zl-f-code', '111111')
        pg.click('.zl-form button[type=submit]')
        pg.wait_for_timeout(250)
        ok(pg.locator('.zz-modal').count() == 1 and '6자리' in pg.inner_text('.zl-form-error'), f'{tag} 실패 시 모달 유지')
        pg.close()

        pg = mk('join', '#/m/a1')
        pg.evaluate("localStorage.setItem('airoom_ws_name', '옛이름')")
        ok(pg.locator('#zl-name').count() == 0 and pg.locator('.zl-name-chip').count() == 0, f'{tag} 이름 칸·명부 칩 없음(익명)')
        ok('익명으로 참여해요. 이름은 저장되지 않아요.' in pg.inner_text('#zz-join'), f'{tag} 익명 안내 문구')
        ok(pg.inner_text('.zl-join-title') == '12월 교직원 회의' and pg.inner_text('.zl-go').strip() == '회의 들어가기', f'{tag} 입장 덮개 제목과 단추')
        pg.screenshot(path=os.path.join(OUT, f'{tag}-join.png'))
        pg.click('.zl-go')
        pg.wait_for_timeout(300)
        ok(calls_of(pg, 'join') == [['join', 'a1']], f'{tag} join(mid) 만, 이름 안 보냄 {calls_of(pg, "join")}')
        ok(pg.evaluate("localStorage.getItem('airoom_ws_name')") == '옛이름', f'{tag} airoom_ws_name 안 씀')
        ok(pg.locator('#zz-join').is_hidden(), f'{tag} 덮개 닫힘')
        ok('익명 참여' not in pg.inner_text('#zz-header-actions') and '옛이름' not in pg.inner_text('#zz-header-actions') and pg.locator('.zl-host-btn').count() == 0 and pg.locator('.zl-more').inner_text().strip() == '메뉴', f'{tag} 머리줄은 메뉴 하나')
        pg.screenshot(path=os.path.join(OUT, f'{tag}-joined.png'))
        pg.click('.zl-more')
        ok(pg.locator('.zl-menu .zl-menu-item').count() == 3 and pg.locator('.zl-menu-item').first.inner_text() == '회의 담당자로 들어가기', f'{tag} 메뉴 항목')
        pg.screenshot(path=os.path.join(OUT, f'{tag}-menu.png'))
        pg.keyboard.press('Escape')
        ok(pg.locator('.zl-menu').count() == 0, f'{tag} Esc 로 메뉴 닫힘')
        pg.click('.zl-more')
        pg.click('.zl-host-btn')
        ok('회의 담당자로 들어가기' in pg.inner_text('.zz-modal h2') and '담당자 비밀번호' in pg.inner_text('.zz-modal'), f'{tag} 담당자 창 낱말')
        pg.fill('#zl-hostcode', '000000')
        pg.click('.zl-form button[type=submit]')
        pg.wait_for_timeout(200)
        ok('4번 더' in pg.inner_text('.zl-form-error'), f'{tag} 틀린 코드 안내')
        pg.screenshot(path=os.path.join(OUT, f'{tag}-hostcode.png'))
        pg.fill('#zl-hostcode', '123456')
        pg.click('.zl-form button[type=submit]')
        pg.wait_for_timeout(250)
        ok(pg.locator('.zz-modal').count() == 0 and pg.locator('.zl-host-chip').count() == 1 and pg.inner_text('.zl-host-chip') == '회의 담당', f'{tag} 담당자 전환')
        pg.click('.zl-more')
        ok(pg.locator('.zl-host-btn').count() == 0 and pg.locator('.zl-menu-item').count() == 2, f'{tag} 담당자 메뉴에는 비밀번호 항목 없음')
        pg.close()

        # 지금 회의 열기로 오면 기다리지 않고 바로 들어간다
        pg = mk('join', '#/m/a1')
        pg.evaluate("sessionStorage.setItem('zz_autojoin', 'a1')")
        pg.reload(); pg.wait_for_function('window.__ready === true'); pg.wait_for_timeout(300)
        ok(calls_of(pg, 'join') == [['join', 'a1']] and pg.locator('#zz-join').is_hidden(), f'{tag} 바로 들어가기')
        ok(pg.evaluate("sessionStorage.getItem('zz_autojoin')") is None, f'{tag} 바로 들어가기 표시는 한 번만')
        pg.close()

        pg = mk('joinfail', '#/m/a1')
        pg.click('.zl-go')
        pg.wait_for_timeout(250)
        ok('연결이 끊겼어요' in pg.inner_text('.zl-form-error') and pg.locator('.zl-go').is_enabled(), f'{tag} 입장 실패 복구')
        pg.close()

        ok(not errs, f'{tag} 콘솔 오류 {errs[:3]}')
        cb.close()
    b.close()


with sync_playwright() as pw:
    run(pw, 'edge', {'channel': 'msedge'})
    run(pw, 'chromium', {})
print(f'통과 {passes[0]} / 실패 {len(fails)}  스크린샷 {OUT}')
sys.exit(1 if fails else 0)
