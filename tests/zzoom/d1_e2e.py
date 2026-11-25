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
        ok(pg.locator('.zl-card').count() == 4 and pg.locator('.zz-modal').count() == 0, f'{tag} 생성 뒤 목록 4, 모달 닫힘')
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
        ok(pg.locator('.zl-new').count() == 0 and pg.locator('.zl-edit').count() == 0 and pg.locator('.zl-del').count() == 0, f'{tag} 일반 사용자 관리 단추 없음')
        ok(pg.locator('.zl-enter').count() == 3, f'{tag} 입장 링크')
        ok(pg.locator('.zl-enter').first.get_attribute('href') == '#/m/a2', f'{tag} 링크 해시')
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
        ok(pg.locator('.zl-name-chip').count() == 4, f'{tag} 이름 칩 4')
        pg.fill('#zl-name', '사가')
        pg.wait_for_timeout(100)
        ok(pg.locator('.zl-name-chip').count() == 1, f'{tag} 이름 걸러짐')
        pg.fill('#zl-name', '')
        pg.click('.zl-go')
        ok('이름' in pg.inner_text('.zl-form-error'), f'{tag} 빈 이름 오류')
        pg.screenshot(path=os.path.join(OUT, f'{tag}-join.png'))
        pg.click('.zl-name-chip >> nth=0')
        pg.click('.zl-go')
        pg.wait_for_timeout(300)
        ok(pg.evaluate("localStorage.getItem('airoom_ws_name')") == '교사가', f'{tag} 이름 기억')
        ok(pg.locator('#zz-join').is_hidden(), f'{tag} 덮개 닫힘')
        ok('교사가' in pg.inner_text('#zz-header-actions') and pg.locator('.zl-host-btn').count() == 1, f'{tag} 머리줄')
        pg.click('.zl-host-btn')
        pg.fill('#zl-hostcode', '000000')
        pg.click('.zl-form button[type=submit]')
        pg.wait_for_timeout(200)
        ok('4번 더' in pg.inner_text('.zl-form-error'), f'{tag} 틀린 코드 안내')
        pg.screenshot(path=os.path.join(OUT, f'{tag}-hostcode.png'))
        pg.fill('#zl-hostcode', '123456')
        pg.click('.zl-form button[type=submit]')
        pg.wait_for_timeout(250)
        ok(pg.locator('.zz-modal').count() == 0 and pg.locator('.zl-host-chip').count() == 1, f'{tag} 주관자 전환')
        pg.close()

        pg = mk('joinfail', '#/m/a1')
        pg.click('.zl-name-chip >> nth=0')
        pg.click('.zl-go')
        pg.wait_for_timeout(250)
        ok('연결이 끊겼어요' in pg.inner_text('.zl-form-error') and pg.locator('.zl-go').is_enabled(), f'{tag} 입장 실패 복구')
        pg.close()

        pg = mk('nonames', '#/m/a1')
        ok(pg.locator('.zl-names').is_hidden(), f'{tag} 명부 없으면 칩 숨김')
        pg.fill('#zl-name', '교사마')
        pg.click('.zl-go')
        pg.wait_for_timeout(250)
        ok(any(c[2] == '교사마' for c in calls_of(pg, 'join')), f'{tag} 직접 입력 입장')
        pg.close()

        ok(not errs, f'{tag} 콘솔 오류 {errs[:3]}')
        cb.close()
    b.close()


with sync_playwright() as pw:
    run(pw, 'edge', {'channel': 'msedge'})
    run(pw, 'chromium', {})
print(f'통과 {passes[0]} / 실패 {len(fails)}  스크린샷 {OUT}')
sys.exit(1 if fails else 0)
