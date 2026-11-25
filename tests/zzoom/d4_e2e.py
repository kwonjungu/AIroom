"""D4 화면 시험. 사용: python tests/zzoom/d4_e2e.py [스크린샷 폴더]
저장소 public/ 과 tests/zzoom/d4_harness.html 을 작은 서버로 서빙한다(서버·Firebase 없음)."""
import sys, os, threading, http.server, socketserver, time
from playwright.sync_api import sync_playwright

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SHOT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.environ.get('TEMP', '.'), 'd4shots')
os.makedirs(SHOT, exist_ok=True)


class H(http.server.SimpleHTTPRequestHandler):
    def translate_path(self, path):
        path = path.split('?')[0]
        if path == '/d4':
            return os.path.join(ROOT, 'tests', 'zzoom', 'd4_harness.html')
        return os.path.join(ROOT, 'public', path.lstrip('/').replace('/', os.sep))

    def log_message(self, *a):
        pass

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()


srv = socketserver.TCPServer(('127.0.0.1', 0), H)
PORT = srv.server_address[1]
threading.Thread(target=srv.serve_forever, daemon=True).start()
URL = f'http://127.0.0.1:{PORT}/d4'

passed = failed = 0


def check(name, cond, extra=''):
    global passed, failed
    if cond:
        passed += 1
    else:
        failed += 1
        print('FAIL', name, extra)


def setf(pg, key, val):
    pg.evaluate('([k,v])=>window.__store.set(k,v)', [key, val])


def calls(pg):
    return pg.evaluate('window.__calls')


def run(browser, label, size):
    cx = browser.new_context(viewport={'width': size[0], 'height': size[1]})
    pg = cx.new_page()
    errs = []
    pg.on('response', lambda r: errs.append('404 ' + r.url) if r.status >= 400 and 'favicon' not in r.url else None)
    pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' and 'Failed to load resource' not in m.text else None)
    pg.on('pageerror', lambda e: errs.append(str(e)))
    tag = f'{label}-{size[0]}'

    def open_(q=''):
        pg.goto(URL + q)
        pg.wait_for_function('window.__ready===true')

    # 1) 채팅
    open_()
    now = int(time.time() * 1000)
    setf(pg, 'chat', [{'id': 'c1', 'cid': 'o', 'name': '김가', 'text': '안녕하세요', 'ref': {'aid': 'a1', 'page': 2}, 'at': now - 9000}])
    check(f'{tag} 채팅 표시', pg.locator('.zs-msg').count() == 1)
    check(f'{tag} 남의 글은 지우기 없음', pg.locator('.zs-msg .zs-del').count() == 0)
    pg.locator('.zs-ref').click()
    ev = pg.evaluate('window.__events')
    check(f'{tag} 쪽 붙인 글 누르면 cmd:nav', bool(ev) and ev[-1][0] == 'cmd:nav' and ev[-1][1]['page'] == 2, str(ev))
    pg.locator('.zs-attach').click()
    check(f'{tag} 쪽 붙이기 켜짐', pg.locator('.zs-attach').get_attribute('aria-pressed') == 'true')
    pg.fill('.zs-input', '내 글')
    pg.click('.zs-send')
    check(f'{tag} 낙관적 표시', pg.locator('.zs-msg.mine').count() == 1)
    c = [x for x in calls(pg) if x[0] == 'sendChat']
    check(f'{tag} sendChat 본문과 ref', len(c) == 1 and c[0][1] == '내 글' and c[0][2] == {'aid': 'a2', 'page': 3}, str(c))
    pg.fill('.zs-input', '또 글')
    pg.click('.zs-send')
    check(f'{tag} 1초 안 재전송 막힘', len([x for x in calls(pg) if x[0] == 'sendChat']) == 1)
    check(f'{tag} 막힘 안내', pg.locator('.zs-hint').inner_text() != '')
    now = int(time.time() * 1000)
    setf(pg, 'chat', [{'id': 'c1', 'cid': 'o', 'name': '김가', 'text': '안녕하세요', 'at': now - 5000},
                      {'id': 's1', 'cid': 'me', 'name': '나', 'text': '내 글', 'ref': {'aid': 'a2', 'page': 3}, 'at': now}])
    check(f'{tag} 중복 없음', pg.locator('.zs-msg').count() == 2, str(pg.locator('.zs-msg').count()))
    check(f'{tag} 내 글 지우기 있음', pg.locator('.zs-msg.mine .zs-del').count() == 1)
    pg.locator('.zs-msg.mine .zs-del').click()
    check(f'{tag} deleteChat', any(x[0] == 'deleteChat' and x[1] == 's1' for x in calls(pg)))
    pg.fill('.zs-input', 'ㄱ' * 600)
    check(f'{tag} 500자 제한', len(pg.input_value('.zs-input')) == 500)
    pg.fill('.zs-input', '')
    time.sleep(1.1)
    pg.evaluate('window.__fail.sendChat="요청이 너무 잦습니다"')
    pg.fill('.zs-input', '실패할 글')
    pg.click('.zs-send')
    pg.wait_for_selector('.zs-msg.failed')
    check(f'{tag} 실패 표시', pg.locator('.zs-fail button').count() == 2)
    pg.evaluate('window.__fail.sendChat=null')
    time.sleep(1.1)
    pg.locator('.zs-fail button', has_text='다시 보내기').click()
    pg.wait_for_function('document.querySelectorAll(".zs-msg.failed").length===0')
    check(f'{tag} 다시 보내기 성공', True)
    # 안 읽은 수
    setf(pg, 'side', {'open': True, 'tab': 'poll'})
    base = pg.evaluate('window.__store.get("chat")')
    now = int(time.time() * 1000)
    setf(pg, 'chat', base + [{'id': 'n1', 'cid': 'o', 'name': '이나', 'text': 'x', 'at': now + 1},
                             {'id': 'n2', 'cid': 'o', 'name': '이나', 'text': 'y', 'at': now + 2},
                             {'id': 'n3', 'cid': 'me', 'name': '나', 'text': 'z', 'at': now + 3}])
    bd = pg.evaluate('window.__store.get("badges")')
    check(f'{tag} 안 읽은 수 2(내 글 제외)', bd.get('chat') == 2, str(bd))
    setf(pg, 'side', {'open': True, 'tab': 'chat'})
    check(f'{tag} 탭 열면 0', pg.evaluate('window.__store.get("badges").chat') is None)
    pg.screenshot(path=os.path.join(SHOT, f'{tag}-chat.png'))
    setf(pg, 'meeting', {'status': 'ended'})
    check(f'{tag} ended 잠금', pg.locator('.zs-input').is_disabled())

    # 2) 손
    open_()
    setf(pg, 'side', {'open': True, 'tab': 'hands'})
    pg.click('#zz-quick-hand button')
    check(f'{tag} 손들기 낙관적', pg.locator('#zz-quick-hand button').get_attribute('aria-pressed') == 'true')
    check(f'{tag} setHand true', any(x[0] == 'setHand' and x[1] is True for x in calls(pg)))
    setf(pg, 'hands', [{'cid': 'x', 'name': '이나', 'at': 20}, {'cid': 'me', 'name': '나', 'at': 10}])
    rows = pg.locator('.zs-hand-row')
    check(f'{tag} 손 순서', rows.count() == 2 and '나' in rows.nth(0).inner_text())
    check(f'{tag} 참석자는 내리기 없음', pg.locator('.zs-hand-row button').count() == 0)
    check(f'{tag} 손 배지', pg.evaluate('window.__store.get("badges").hands') == 2)
    pg.screenshot(path=os.path.join(SHOT, f'{tag}-hands-viewer.png'))
    open_('?role=host')
    setf(pg, 'side', {'open': True, 'tab': 'hands'})
    setf(pg, 'hands', [{'cid': 'x', 'name': '이나', 'at': 20}, {'cid': 'y', 'name': '박다', 'at': 30}])
    pg.locator('.zs-hand-row button').first.click()
    check(f'{tag} 주관자 내리기', any(x[0] == 'lowerHand' and x[1] == 'x' for x in calls(pg)))
    pg.click('text=모두 내리기')
    check(f'{tag} 모두 내리기', any(x[0] == 'lowerAllHands' for x in calls(pg)))
    pg.screenshot(path=os.path.join(SHOT, f'{tag}-hands-host.png'))
    open_('?status=ready')
    pg.click('#zz-quick-hand button')
    check(f'{tag} ready 에서는 손 안 보냄', not any(x[0] == 'setHand' for x in calls(pg)))

    # 3) 투표, 비공개 유출 검사
    SECRET = '비밀이름김가'
    open_()
    setf(pg, 'side', {'open': True, 'tab': 'poll'})
    poll = {'pid': 'p1', 'q': '점심 메뉴?', 'options': [{'id': 'o1', 'label': '찬성'}, {'id': 'o2', 'label': '반대'}, {'id': 'o3', 'label': '보류'}],
            'anonymous': True, 'status': 'open', 'revealed': False, 'tally': {'o1': 9, 'o2': 9, 'o3': 9}, 'total': 27, 'names': {'o1': [SECRET]}}
    setf(pg, 'polls', [poll])
    html = pg.locator('#zz-side-poll').inner_html()
    check(f'{tag} 비공개 reveal 전 이름·숫자 없음', SECRET not in html and '9표' not in html and 'zs-bar' not in html)
    pg.locator('.zs-opt', has_text='반대').click()
    check(f'{tag} 투표 호출', any(x[0] == 'vote' and x[1] == 'p1' and x[2] == 'o2' for x in calls(pg)))
    check(f'{tag} 내 선택 표시', pg.locator('.zs-opt.picked').count() == 1 and '내 선택' in pg.locator('.zs-opt.picked').inner_text())
    pg.locator('.zs-opt', has_text='찬성').click()
    check(f'{tag} 바꾸기', pg.locator('.zs-opt.picked').inner_text().startswith('찬성'))
    check(f'{tag} 참석자 카드 한 탭 한 표 문구', pg.locator('.zs-pollcard .zs-fine', has_text='한 탭 한 표, 의견 확인용').count() == 1)
    fine = pg.locator('.zs-fine').first
    check(f'{tag} 문구는 muted 13px', fine.evaluate('e=>getComputedStyle(e).fontSize') == '13px' and fine.evaluate('e=>getComputedStyle(e).color') == pg.evaluate("getComputedStyle(document.documentElement).getPropertyValue('--zz-muted')").strip() or fine.evaluate('e=>getComputedStyle(e).color') == 'rgb(110, 110, 115)')
    side = pg.evaluate('(()=>{const r=document.getElementById("zz-side").getBoundingClientRect();return [r.left,r.right,innerWidth]})()')
    check(f'{tag} 옆칸이 오른쪽 끝에 붙음', abs(side[1] - side[2]) < 1, str(side))
    pg.screenshot(path=os.path.join(SHOT, f'{tag}-poll-viewer.png'))
    poll2 = dict(poll, status='closed')
    setf(pg, 'polls', [poll2])
    html = pg.locator('#zz-side-poll').inner_html()
    check(f'{tag} 마감 후에도 reveal 전엔 숨김', SECRET not in html and '9표' not in html)
    check(f'{tag} 마감 후 투표 불가', pg.locator('.zs-opt.votable').count() == 0)
    setf(pg, 'polls', [dict(poll2, revealed=True)])
    html = pg.locator('#zz-side-poll').inner_html()
    check(f'{tag} 비공개 reveal 뒤에도 이름 없음', SECRET not in html and '9표' in html)
    pg.screenshot(path=os.path.join(SHOT, f'{tag}-poll-revealed.png'))
    setf(pg, 'polls', [dict(poll, anonymous=False)])
    check(f'{tag} 공개 투표 안내', '이름이 함께 공개' in pg.locator('#zz-side-poll').inner_text())
    check(f'{tag} 공개도 reveal 전 이름 없음', SECRET not in pg.locator('#zz-side-poll').inner_html())
    setf(pg, 'polls', [dict(poll, anonymous=False, revealed=True, status='closed')])
    check(f'{tag} 공개 reveal 뒤 이름 보임', SECRET in pg.locator('#zz-side-poll').inner_html())
    # 주관자
    open_('?role=host')
    setf(pg, 'side', {'open': True, 'tab': 'poll'})
    check(f'{tag} 투표 없음 만들기 단추', pg.locator('.zs-newpoll').count() == 1)
    pg.click('.zs-newpoll')
    pg.fill('input[aria-label="질문"]', '안건 통과?')
    check(f'{tag} 기본 선택지 3', pg.locator('.zs-optrow').count() == 3)
    check(f'{tag} 기본 비공개', pg.locator('#zs-anon').is_checked())
    pg.screenshot(path=os.path.join(SHOT, f'{tag}-poll-create.png'))
    pg.click('text=투표 열기')
    cp = [x for x in calls(pg) if x[0] == 'createPoll']
    check(f'{tag} createPoll', bool(cp) and cp[0][1]['q'] == '안건 통과?' and cp[0][1]['anonymous'] is True and cp[0][1]['options'] == ['찬성', '반대', '보류'], str(cp))
    setf(pg, 'polls', [poll])
    pg.wait_for_function('window.__calls.some(c=>c[0]=="pollTally")', timeout=5000)
    pg.wait_for_selector('.zs-bar')
    check(f'{tag} 주관자 실시간 숫자', pg.locator('.zs-bar').count() == 3)
    check(f'{tag} 주관자 카드 한 탭 한 표 문구', pg.locator('.zs-pollcard .zs-fine', has_text='한 탭 한 표, 의견 확인용').count() == 1)
    check(f'{tag} 주관자도 이름 없음', SECRET not in pg.locator('#zz-side-poll').inner_html())
    pg.screenshot(path=os.path.join(SHOT, f'{tag}-poll-host.png'))
    pg.click('text=마감하기')
    check(f'{tag} closePoll', any(x[0] == 'closePoll' for x in calls(pg)))
    pg.click('text=결과 보이기')
    check(f'{tag} revealPoll', any(x[0] == 'revealPoll' for x in calls(pg)))
    setf(pg, 'role', {'role': 'viewer', 'cid': 'me', 'name': '나', 'presenter': False})
    check(f'{tag} 강등 뒤 숫자 지움', 'zs-bar' not in pg.locator('#zz-side-poll').inner_html())

    # 4) 언마운트
    pg.evaluate('Object.values(window.__mods).forEach(m=>m.unmount())')
    check(f'{tag} unmount 뒤 비어 있음', pg.locator('#zz-side-chat').inner_html() == '' and pg.locator('#zz-quick-hand').inner_html() == '')
    check(f'{tag} 콘솔 오류 0', not errs, str(errs))
    cx.close()


with sync_playwright() as p:
    for label, kw in (('edge', {'channel': 'msedge'}), ('chromium', {})):
        b = p.chromium.launch(**kw)
        for size in ((1280, 800), (820, 1180)):
            run(b, label, size)
        b.close()
srv.shutdown()
print(f'통과 {passed} 실패 {failed} 스크린샷 {SHOT}')
sys.exit(1 if failed else 0)
