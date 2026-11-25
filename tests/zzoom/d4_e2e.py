"""D4 화면 시험. 사용: python tests/zzoom/d4_e2e.py [스크린샷 폴더]
저장소 public/ 과 tests/zzoom/d4_harness.html 을 작은 서버로 서빙한다(서버·Firebase 없음)."""
import sys, os, threading, http.server, socketserver, time
from playwright.sync_api import sync_playwright

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SHOT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.environ.get('TEMP', '.'), 'd4shots')
os.makedirs(SHOT, exist_ok=True)


class H(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        self.path = self.path.split('?')[0]      # 쿼리(?role=host)가 있어도 같은 파일을 준다(파이썬 3.13 대응)
        return super().do_GET()

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
    check(f'{tag} 익명: 남의 글에 이름·표시 없음', '김가' not in pg.locator('#zz-side-chat').inner_text() and pg.locator('.zs-msg .zs-name').count() == 0)
    pg.locator('.zs-ref').first.click()
    ev = pg.evaluate('window.__events')
    check(f'{tag} 쪽 붙인 글 누르면 cmd:nav', bool(ev) and ev[-1][0] == 'cmd:nav' and ev[-1][1]['page'] == 2, str(ev))
    # 쉬운 화면(B10): 입력 칸 아래 확인 칸 「보고 있는 쪽도 함께 보내기 (2번 안건 3쪽)」
    check(f'{tag} 쪽 보내기 칸은 입력 칸 아래', pg.evaluate("document.querySelector('.zs-input').getBoundingClientRect().bottom <= document.querySelector('.zs-attach-row').getBoundingClientRect().top"))
    check(f'{tag} 쪽 보내기 문구', pg.locator('.zs-attach-row').inner_text().strip() == '보고 있는 쪽도 함께 보내기 (2번 안건 3쪽)', pg.locator('.zs-attach-row').inner_text())
    check(f'{tag} 붙인 쪽 보기 문구', pg.locator('.zs-msg .zs-ref').first.inner_text().strip() == '1번 안건 2쪽 보기', pg.locator('.zs-msg .zs-ref').first.inner_text())
    pg.locator('.zs-attach-row').click()
    check(f'{tag} 쪽 붙이기 켜짐', pg.locator('.zs-attach').is_checked())
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
    check(f'{tag} 익명: 내 글만 「나」', pg.locator('.zs-msg.mine .zs-name').inner_text() == '나' and pg.locator('.zs-msg:not(.mine) .zs-name').count() == 0)
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
    # 768px 미만에서는 아래 서랍이 쪽 막대의 ✋ 를 덮으므로 「손」 칸 안 손들기 단추로 든다(감사 U14)
    hand_sel = '#zz-side-hands .zs-hands-raise' if size[0] < 768 else '#zz-quick-hand button'
    check(f'{tag} 칸 안에도 손들기 단추', pg.locator('#zz-side-hands .zs-hands-raise').count() == 1)
    pg.click(hand_sel)
    check(f'{tag} 손들기 낙관적', pg.locator('#zz-quick-hand button').get_attribute('aria-pressed') == 'true' and pg.locator('#zz-side-hands .zs-hands-raise').get_attribute('aria-pressed') == 'true')
    check(f'{tag} setHand true', any(x[0] == 'setHand' and x[1] is True for x in calls(pg)))
    setf(pg, 'hands', [{'cid': 'x', 'name': '이나', 'at': 20}, {'cid': 'me', 'name': '나', 'at': 10}])
    rows = pg.locator('.zs-hand-row')
    check(f'{tag} 손 순서', rows.count() == 2 and '나' in rows.nth(0).inner_text() and '나' not in rows.nth(1).inner_text())
    check(f'{tag} 익명: 손에 이름 없음, 순서 번호만', '이나' not in pg.locator('#zz-side-hands').inner_text() and '2번째로 든 손' in rows.nth(1).inner_text() and '첫 번째로 든 손' in rows.nth(0).inner_text() and '2명' in pg.locator('.zs-hands-head').inner_text())
    check(f'{tag} 참석자는 내리기 없음', pg.locator('.zs-hand-row button').count() == 0)
    check(f'{tag} 손 배지', pg.evaluate('window.__store.get("badges").hands') == 2)
    pg.screenshot(path=os.path.join(SHOT, f'{tag}-hands-viewer.png'))
    open_('?role=host')
    setf(pg, 'side', {'open': True, 'tab': 'hands'})
    setf(pg, 'hands', [{'cid': 'x', 'name': '이나', 'at': 20}, {'cid': 'y', 'name': '박다', 'at': 30}])
    check(f'{tag} 익명: 주관자에게도 이름 없음', '이나' not in pg.locator('#zz-side-hands').inner_text() and '박다' not in pg.locator('#zz-side-hands').inner_text())
    pg.click('text=맨 앞 손 내리기')
    check(f'{tag} 맨 앞 손 내리기 = 가장 먼저 든 손', any(x[0] == 'lowerHand' and x[1] == 'x' for x in calls(pg)))
    pg.click('text=모두 내리기')
    check(f'{tag} 모두 내리기', any(x[0] == 'lowerAllHands' for x in calls(pg)))
    pg.screenshot(path=os.path.join(SHOT, f'{tag}-hands-host.png'))
    open_('?status=ready')
    if size[0] < 768: setf(pg, 'side', {'open': True, 'tab': 'hands'})
    check(f'{tag} ready 손들기 안내 글', '회의 시작 뒤 손들기' in pg.locator('#zz-quick-hand button').inner_text() and '회의가 시작되면 손을 들 수 있어요' in pg.locator('#zz-side-hands .zs-hands-raise').inner_text())
    pg.click(hand_sel)
    check(f'{tag} ready 에서는 손 안 보냄', not any(x[0] == 'setHand' for x in calls(pg)))
    check(f'{tag} ready 누르면 안내', any('회의가 시작되면' in t[0] for t in pg.evaluate('window.__toasts || []')))

    # 3) 투표, 비공개 유출 검사
    SECRET = '비밀이름김가'
    open_()
    setf(pg, 'side', {'open': True, 'tab': 'poll'})
    poll = {'pid': 'p1', 'q': '점심 메뉴?', 'options': [{'id': 'o1', 'label': '찬성'}, {'id': 'o2', 'label': '반대'}, {'id': 'o3', 'label': '보류'}],
            'anonymous': True, 'status': 'open', 'revealed': False, 'tally': {'o1': 9, 'o2': 9, 'o3': 9}, 'total': 27, 'names': {'o1': [SECRET]}}
    setf(pg, 'polls', [poll])
    html = pg.locator('#zz-side-poll').inner_html()
    check(f'{tag} 고르는 법 「하나를 눌러 골라 주세요.」', '하나를 눌러 골라 주세요.' in pg.locator('#zz-side-poll').inner_text())
    check(f'{tag} 옆칸이 투표면 알림 없음', not any('새 투표' in t[0] for t in pg.evaluate('window.__toasts || []')))
    check(f'{tag} 비공개 reveal 전 이름·숫자 없음', SECRET not in html and '9표' not in html and 'zs-bar' not in html)
    pg.locator('.zs-opt', has_text='반대').click()
    check(f'{tag} 투표 호출', any(x[0] == 'vote' and x[1] == 'p1' and x[2] == 'o2' for x in calls(pg)))
    check(f'{tag} 내 선택 표시', pg.locator('.zs-opt.picked').count() == 1 and '내 선택' in pg.locator('.zs-opt.picked').inner_text())
    pg.locator('.zs-opt', has_text='찬성').click()
    check(f'{tag} 바꾸기', pg.locator('.zs-opt.picked').inner_text().startswith('찬성'))
    FINE = '한 사람이 하나만 고를 수 있어요. 누가 무엇을 골랐는지는 아무도 몰라요.'
    check(f'{tag} 참석자 카드 고르는 법 문구', pg.locator('.zs-pollcard .zs-fine', has_text=FINE).count() == 1)
    check(f'{tag} 고른 뒤 안내', '골랐어요. 다른 항목을 누르면 바꿀 수 있어요.' in pg.locator('#zz-side-poll').inner_text() and '하나를 눌러 골라 주세요.' not in pg.locator('#zz-side-poll').inner_text())
    check(f'{tag} 비공개 투표 칩 없음', '비공개 투표' not in pg.locator('#zz-side-poll').inner_text())
    fine = pg.locator('.zs-fine').first
    check(f'{tag} 문구는 15px 이상', float(fine.evaluate('e=>getComputedStyle(e).fontSize')[:-2]) >= 15)
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
    # 익명(ANON): 옛 공개 투표 문서가 와도 공개 안내·이름 없음
    setf(pg, 'polls', [dict(poll, anonymous=False)])
    check(f'{tag} 공개 투표 안내 없음', '이름이 함께 공개' not in pg.locator('#zz-side-poll').inner_text() and '공개 투표' not in pg.locator('#zz-side-poll').inner_text().replace('비공개 투표', ''))
    setf(pg, 'polls', [dict(poll, anonymous=False, revealed=True, status='closed')])
    check(f'{tag} 옛 공개 문서 reveal 뒤에도 이름 없음', SECRET not in pg.locator('#zz-side-poll').inner_html())
    open_()
    setf(pg, 'side', {'open': True, 'tab': 'poll'})
    check(f'{tag} 빈 투표 안내', '지금 열린 투표가 없어요. 투표가 열리면 알려 드려요.' in pg.locator('#zz-side-poll').inner_text())
    setf(pg, 'side', {'open': True, 'tab': 'chat'})
    setf(pg, 'polls', [dict(poll, pid='p9')])
    ts = pg.evaluate('window.__toasts || []')
    check(f'{tag} 새 투표 알림', any(t[0] == '새 투표가 열렸어요. 「채팅과 투표」에서 골라 주세요.' for t in ts), str(ts))
    check(f'{tag} 새 투표 배지', pg.evaluate('window.__store.get("badges").poll') == 1)
    # 담당자
    open_('?role=host')
    setf(pg, 'side', {'open': True, 'tab': 'poll'})
    check(f'{tag} 투표 없음 만들기 단추', pg.locator('.zs-newpoll').count() == 1)
    pg.click('.zs-newpoll')
    pg.fill('input[aria-label="질문"]', '안건 통과?')
    check(f'{tag} 기본 고를 것 3', pg.locator('.zs-optrow').count() == 3)
    check(f'{tag} 질문 라벨 보임', pg.locator('label[for="zs-newpoll-q"]').is_visible())
    mini = pg.locator('.zs-optrow .zs-mini').first
    check(f'{tag} 「빼기」 한 줄', mini.evaluate('e=>e.getBoundingClientRect().height') < 60 and mini.inner_text().strip() == '빼기')
    check(f'{tag} 고를 것 더하기', pg.locator('#zz-side-poll button', has_text='고를 것 더하기').count() == 1)
    check(f'{tag} 공개·비공개 고르기 없음', pg.locator('#zs-anon').count() == 0 and '아무도 볼 수 없어요' in pg.locator('#zz-side-poll').inner_text())
    pg.screenshot(path=os.path.join(SHOT, f'{tag}-poll-create.png'))
    pg.click('text=투표 시작하기')
    cp = [x for x in calls(pg) if x[0] == 'createPoll']
    check(f'{tag} createPoll', bool(cp) and cp[0][1]['q'] == '안건 통과?' and 'anonymous' not in cp[0][1] and cp[0][1]['options'] == ['찬성', '반대', '보류'], str(cp))
    setf(pg, 'polls', [poll])
    pg.wait_for_function('window.__calls.some(c=>c[0]=="pollTally")', timeout=5000)
    pg.wait_for_selector('.zs-bar')
    check(f'{tag} 주관자 실시간 숫자', pg.locator('.zs-bar').count() == 3)
    check(f'{tag} 담당자 카드 고르는 법 문구', pg.locator('.zs-pollcard .zs-fine', has_text=FINE).count() == 1)
    check(f'{tag} 주관자도 이름 없음', SECRET not in pg.locator('#zz-side-poll').inner_html())
    pg.screenshot(path=os.path.join(SHOT, f'{tag}-poll-host.png'))
    pg.click('text=투표 끝내기')
    check(f'{tag} closePoll', any(x[0] == 'closePoll' for x in calls(pg)))
    pg.click('text=결과 모두에게 보여 주기')
    check(f'{tag} revealPoll', any(x[0] == 'revealPoll' for x in calls(pg)))
    setf(pg, 'role', {'role': 'viewer', 'cid': 'me', 'presenter': False})
    check(f'{tag} 강등 뒤 숫자 지움', 'zs-bar' not in pg.locator('#zz-side-poll').inner_html())

    # 4) 언마운트
    pg.evaluate('Object.values(window.__mods).forEach(m=>m.unmount())')
    check(f'{tag} unmount 뒤 비어 있음', pg.locator('#zz-side-chat').inner_html() == '' and pg.locator('#zz-quick-hand').inner_html() == '')
    check(f'{tag} 콘솔 오류 0', not errs, str(errs))
    cx.close()


with sync_playwright() as p:
    for label, kw in (('edge', {'channel': 'msedge'}), ('chromium', {})):
        b = p.chromium.launch(**kw)
        for size in ((1280, 800), (820, 1180), (390, 844)):
            run(b, label, size)
        b.close()
srv.shutdown()
print(f'통과 {passed} 실패 {failed} 스크린샷 {SHOT}')
sys.exit(1 if failed else 0)
