# -*- coding: utf-8 -*-
"""EASY_UX 팀 A(입구와 뼈대) 화면 시험. 서버·Firebase 없이 돈다.
    python tests/zzoom/easy_a_e2e.py [스크린샷 폴더]
- public/ 를 정적 서버로 띄우고 진짜 index.html, app.js, list.js, join.js, onboard.js 와 다른 팀 진짜 모듈로 조립한다.
- /zzoom/api.js 는 agenda_fake_api.js 위에 목록·입장 흉내를 더한 가짜(아래 WRAP)로 바꿔 끼운다.
- 엣지(channel='msedge')와 크로미움, 창 1280x800, 820x1180, 390x844.
- 장면: B1 로그인 안내, B2 목록과 만들기, B3 입장, B4 머리줄과 메뉴, B13 글자·단추 크기와 대비, 첫 입장 안내(참석자·담당자)."""
import os, sys, threading, tempfile, functools, mimetypes, json
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from playwright.sync_api import sync_playwright, expect

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
PUBLIC = os.path.join(ROOT, 'public')
BASE_FAKE = open(os.path.join(os.path.dirname(__file__), 'agenda_fake_api.js'), encoding='utf-8').read()
args = [a for a in sys.argv[1:] if not a.startswith('--')]
SHOTS = args[0] if args else os.path.join(tempfile.gettempdir(), 'zzoom-easy-a-shots')
os.makedirs(SHOTS, exist_ok=True)
MID = 'mabcdefghij12'

WRAP = r"""
export * from '/zzoom/__base.js';
import * as B from '/zzoom/__base.js';
const P = new URLSearchParams(location.search);
const F = window.__fake;
const now = Date.now(), d = 86400000;
if (P.get('rec') === '0') F.meeting.allowRecording = false;
const LIST = P.get('list') || 'some';
export async function listMeetings() {
  F.calls.push({ name: 'listMeetings', args: [] });
  if (LIST === 'empty') return { meetings: [], isAdmin: false };
  return { isAdmin: false, meetings: [
    { id: 'mabcdefghij12', title: '11월 교직원 협의회', startsAt: now + 3600000, status: F.meeting.status, agendaCount: 2, daysLeft: 9, allowRecording: true, mine: true },
    { id: 'mzzzzzzzzzz01', title: '2학년 학년 협의', startsAt: now + 2 * d, status: 'ready', agendaCount: 0, daysLeft: 10, allowRecording: false },
    { id: 'myyyyyyyyyy02', title: '10월 교육과정 협의', startsAt: now - 8 * d, status: 'ended', agendaCount: 6, daysLeft: 2, allowRecording: true }
  ] };
}
let joined = P.get('join') !== '0';
export async function resume(mid) { if (!joined) return null; return B.resume(mid); }
export async function join(mid) { F.calls.push({ name: 'join', args: [mid] }); joined = true; return B.resume(mid); }
export async function createMeeting(b) { F.calls.push({ name: 'createMeeting', args: [b] }); return { meeting: { id: 'mabcdefghij12', title: b.title, startsAt: b.startsAt, status: 'ready', mine: true } }; }
"""

mimetypes.add_type('text/javascript', '.js'); mimetypes.add_type('text/javascript', '.mjs')
mimetypes.add_type('text/css', '.css'); mimetypes.add_type('image/webp', '.webp'); mimetypes.add_type('application/wasm', '.wasm')


class Quiet(SimpleHTTPRequestHandler):
    def log_message(self, *a): pass

    def guess_type(self, path):
        t, _ = mimetypes.guess_type(path)
        return t or 'application/octet-stream'


def serve():
    srv = ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Quiet, directory=PUBLIC))
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv, f'http://127.0.0.1:{srv.server_address[1]}'


# 보이는 단추 중 높이가 기준보다 낮은 것, 보이는 글자 중 15px 보다 작은 것(쪽 번호 그림 등 다른 팀 자리는 범위로 거른다)
MEASURE = r"""(args) => {
  const [scope, minH] = args;
  const roots = scope.map(s => document.querySelector(s)).filter(Boolean);
  const vis = e => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && !e.closest('[hidden]'); };
  const small = [], tiny = [];
  for (const root of roots) {
    for (const b of root.querySelectorAll('button, a.zz-btn, .zz-btn')) {
      if (!vis(b)) continue;
      const r = b.getBoundingClientRect();
      if (r.height < minH - 0.5) small.push((b.textContent || b.className).trim().slice(0, 20) + ':' + Math.round(r.height));
      if (!(b.textContent || '').trim() && !b.getAttribute('aria-label')) small.push('글자 없음:' + b.className);
    }
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    while (w.nextNode()) {
      const t = w.currentNode; if (!t.nodeValue.trim()) continue;
      const e = t.parentElement; if (!vis(e)) continue;
      const fs = parseFloat(getComputedStyle(e).fontSize);
      if (fs < 14.5) tiny.push(t.nodeValue.trim().slice(0, 16) + ':' + fs);
    }
  }
  return { small, tiny };
}"""

CONTRAST = r"""(sel) => {
  const lum = c => { const m = c.match(/\d+(\.\d+)?/g).map(Number); const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(m[0]) + 0.7152 * f(m[1]) + 0.0722 * f(m[2]); };
  const e = document.querySelector(sel); if (!e) return null;
  const cs = getComputedStyle(e);
  let bg = cs.backgroundColor, p = e;
  while (/rgba\(0, 0, 0, 0\)|transparent/.test(bg) && p.parentElement) { p = p.parentElement; bg = getComputedStyle(p).backgroundColor; }
  if (/rgba\(0, 0, 0, 0\)|transparent/.test(bg)) bg = 'rgb(255,255,255)';
  const a = lum(cs.color), b = lum(bg);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}"""


def run(pw, label, launch_kw, base, size):
    ok, fail, errors = [], [], []
    w, h = size
    tag = f'{label}_{w}'
    narrow = w < 768
    min_h = 48 if narrow else 44

    def step(name, fn):
        try:
            fn(); ok.append(name); print(f'  OK   [{tag}] {name}', flush=True)
        except Exception as e:
            fail.append(name); print(f'  FAIL [{tag}] {name} -> {str(e)[:600]}', flush=True)

    b = pw.chromium.launch(**launch_kw)
    print(f'[{tag}] 브라우저 {b.version}', flush=True)

    def new_page(q='', hash_='#/', token=True, onboarded=None):
        ctx = b.new_context(viewport={'width': w, 'height': h}, locale='ko-KR')
        if token:
            ctx.add_init_script("try{localStorage.setItem('airoom_auth_token','fake-token')}catch(e){}")
        if onboarded is not None:
            ctx.add_init_script("try{localStorage.setItem('zz_onboarded_v1', %s)}catch(e){}" % json.dumps(onboarded))
        ctx.route('**/zzoom/__base.js*', lambda r: r.fulfill(status=200, content_type='text/javascript; charset=utf-8', body=BASE_FAKE))
        ctx.route('**/zzoom/api.js*', lambda r: r.fulfill(status=200, content_type='text/javascript; charset=utf-8', body=WRAP))
        pg = ctx.new_page()
        pg.on('pageerror', lambda e: errors.append(f'pageerror: {e}'))
        pg.on('console', lambda m: errors.append(f'console: {m.text}') if m.type == 'error' and 'Failed to load resource' not in m.text else None)
        pg.goto(f'{base}/zzoom/index.html?{q}{hash_}')
        return ctx, pg

    def shot(pg, name):
        pg.screenshot(path=os.path.join(SHOTS, f'{tag}-{name}.png'))

    def no_hscroll(pg):
        assert pg.evaluate('document.documentElement.scrollWidth <= window.innerWidth + 1'), '가로 넘침'

    def measure(pg, scope):
        m = pg.evaluate(MEASURE, [scope, min_h])
        assert not m['small'], f'작은 단추 {m["small"][:6]}'
        assert not m['tiny'], f'작은 글자 {m["tiny"][:6]}'

    # ---------- B1 로그인 안내 ----------
    def gate():
        ctx = b.new_context(viewport={'width': w, 'height': h}, locale='ko-KR')
        # 진짜 api.js 의 authToken 만 보면 되므로 가짜에 토큰 없음을 흉내
        ctx.route('**/zzoom/__base.js*', lambda r: r.fulfill(status=200, content_type='text/javascript; charset=utf-8', body=BASE_FAKE.replace("export function authToken() { return 'fake-token'; }", "export function authToken() { return null; }")))
        ctx.route('**/zzoom/api.js*', lambda r: r.fulfill(status=200, content_type='text/javascript; charset=utf-8', body=WRAP))
        pg = ctx.new_page(); pg.goto(f'{base}/zzoom/index.html#/')
        expect(pg.locator('#zz-gate')).to_be_visible()
        expect(pg.locator('#zz-gate')).to_contain_text('「회의진행 앱」 탭을 다시 눌러 주세요')
        assert pg.locator('#zz-gate a[href="/"]').inner_text().strip() == '백암이로 가기'
        assert pg.locator('#zz-brand').inner_text().strip() in ('쭘 회의', ''), pg.locator('#zz-brand').inner_text()
        shot(pg, 'b1-gate'); measure(pg, ['#zz-gate']); no_hscroll(pg)
        ctx.close()
    step('B1 로그인 안내 문구와 백암이로 가기', gate)

    # ---------- B2 목록과 만들기 ----------
    def listing():
        ctx, pg = new_page('list=some&join=0')
        pg.wait_for_selector('.zl-card')
        cards = pg.locator('.zl-card')
        assert cards.count() == 3
        assert cards.first.get_attribute('data-mid') == MID or 'live' not in pg.inner_text('.zl-card >> nth=0')
        assert pg.locator('.zl-card[data-mid="myyyyyyyyyy02"] .zl-enter').inner_text().strip() == '기록 보기'
        assert pg.locator('.zl-card[data-mid="mzzzzzzzzzz01"] .zl-enter').inner_text().strip() == '회의 들어가기'
        assert pg.locator('.zl-card').last.get_attribute('data-mid') == 'myyyyyyyyyy02', '끝난 회의가 맨 아래가 아님'
        txt = pg.inner_text('#zz-list')
        for bad in ['입장하기', '주관', '준비 중', '삭제돼요', '새로 고침']:
            assert bad not in txt, f'옛 낱말 {bad}'
        assert '2일 뒤 지워져요' in txt and '9일' not in txt and '10일' not in txt, '남은 날은 2일 이하만'
        assert '녹음 없는 회의' in txt
        shot(pg, 'b2-list'); measure(pg, ['#zz-list', '#zz-header']); no_hscroll(pg)
        r = pg.evaluate(CONTRAST, '.zl-enter.primary')
        assert r and r >= 4.5, f'주 단추 대비 {r}'
        pg.click('.zl-new')
        pg.wait_for_selector('.zl-form')
        mt = pg.inner_text('.zz-modal')
        for want in ['담당자 비밀번호 (숫자 6자리)', '만든 분은 따로 넣지 않아도 돼요', '번호 자동으로 만들기', '회의 중 녹음을 쓸 수 있게 해요', '취소', '회의 만들기']:
            assert want in mt, f'만들기 창에 {want} 없음'
        assert '주관' not in mt
        shot(pg, 'b2-create'); measure(pg, ['#zz-modal-root'])
        pg.fill('#zl-f-title', '12월 교직원 회의')
        pg.click('.zl-dice')
        code = pg.input_value('#zl-f-code')
        assert len(code) == 6 and code.isdigit()
        pg.click('.zl-form button[type=submit]')
        pg.wait_for_selector('.zl-done-go')
        assert code in pg.inner_text('.zz-modal'), '만든 뒤 번호가 안 보임'
        shot(pg, 'b2-done'); measure(pg, ['#zz-modal-root'])
        pg.click('.zl-done-go')
        # 바로 들어가기: 입장 덮개를 거치지 않고 회의 화면이 열린다(만든 분은 서버가 담당자로 들인다)
        pg.wait_for_function("location.hash === '#/m/%s'" % MID)
        pg.wait_for_function("window.__fake && window.__fake.calls.some(c => c.name === 'join')", timeout=5000)
        expect(pg.locator('#zz-join')).to_be_hidden(timeout=5000)
        calls = pg.evaluate('window.__fake.calls.map(c => c.name)')
        assert 'join' in calls, calls
        store = pg.evaluate('JSON.stringify(sessionStorage) + JSON.stringify(localStorage)')
        assert code not in store, '비밀번호가 브라우저에 저장됨'
        ctx.close()
    step('B2 목록 낱말, 끝난 회의 기록 보기, 만들기 창, 만든 뒤 지금 회의 열기', listing)

    def empty():
        ctx, pg = new_page('list=empty')
        pg.wait_for_selector('.zl-empty')
        assert pg.locator('.zl-empty .zz-btn.primary').inner_text().strip() == '첫 회의 만들기'
        assert pg.locator('.zl-new.primary').count() == 0, '빈 화면에 주 단추가 둘'
        shot(pg, 'b2-empty'); measure(pg, ['#zz-list']); no_hscroll(pg)
        ctx.close()
    step('B2 빈 목록: 주 단추 하나 「첫 회의 만들기」', empty)

    # ---------- B3 입장 ----------
    def joining():
        ctx, pg = new_page('join=0&role=viewer&status=ready', f'#/m/{MID}')
        expect(pg.locator('#zz-join .zl-go')).to_be_visible()
        expect(pg.locator('.zl-join-title')).to_have_text('11월 교직원 협의회', timeout=5000)
        assert pg.locator('.zl-go').inner_text().strip() == '회의 들어가기'
        assert '익명으로 참여해요. 이름은 저장되지 않아요.' in pg.inner_text('#zz-join')
        assert pg.locator('.zl-join-sub').count() == 1 and '회의' in pg.inner_text('.zl-join-sub'), '일시 줄 없음'
        assert pg.locator('#zz-side-toggle').is_hidden(), '입장 전에 채팅 단추가 보임'
        assert pg.inner_text('#zz-header-actions').strip() == ''
        shot(pg, 'b3-join'); measure(pg, ['#zz-join', '#zz-header']); no_hscroll(pg)
        pg.click('.zl-go')
        expect(pg.locator('#zz-join')).to_be_hidden()
        ctx.close()
    step('B3 입장: 회의 제목과 일시, 회의 들어가기, 입장 전 채팅 단추 없음', joining)

    # ---------- B4 머리줄 + 첫 입장 안내(참석자) ----------
    def header_viewer():
        ctx, pg = new_page('join=0&role=viewer&status=ready', f'#/m/{MID}')
        pg.click('#zz-join .zl-go')
        expect(pg.locator('#zz-join')).to_be_hidden()
        # 첫 입장 안내 3장
        expect(pg.locator('.zl-ob-card')).to_be_visible(timeout=5000)
        assert pg.inner_text('.zl-ob-step') == '1/3'
        assert pg.inner_text('.zl-ob-title') == '가운데가 모두 함께 보는 화면이에요'
        assert pg.locator('#zl-ob-again').is_checked()
        assert pg.evaluate("document.activeElement && document.activeElement.classList.contains('zl-ob-next')"), '첫 초점이 「다음」이 아님'
        assert pg.locator('.zl-ob-ring').count() >= 1
        shot(pg, 'ob-1'); measure(pg, ['.zl-ob'])
        pg.click('.zl-ob-next')
        assert pg.inner_text('.zl-ob-step') == '2/3' and '안건' in pg.inner_text('.zl-ob-title')
        shot(pg, 'ob-2')
        pg.click('.zl-ob-next')
        assert pg.inner_text('.zl-ob-step') == '3/3' and '손들기' in pg.inner_text('.zl-ob-title')
        assert pg.inner_text('.zl-ob-next') == '시작하기'
        rings = pg.locator('.zl-ob-ring').count()
        assert rings >= 2, f'손들기와 채팅 두 곳을 가리켜야 함 {rings}'
        shot(pg, 'ob-3')
        # 카드가 화면 안에 있다
        bb = pg.locator('.zl-ob-card').bounding_box()
        assert bb['x'] >= 0 and bb['y'] >= 0 and bb['x'] + bb['width'] <= w + 1 and bb['y'] + bb['height'] <= h + 1, bb
        pg.click('.zl-ob-next')
        expect(pg.locator('.zl-ob')).to_have_count(0)
        assert pg.evaluate("localStorage.getItem('zz_onboarded_v1')") == 'viewer'
        # 머리줄: 회의 상태 칩 하나, 익명 칩·주관 단추 없음, 「메뉴」
        st = pg.inner_text('#zz-status')
        assert ('시작 전' in st) or narrow, st
        hdr = pg.inner_text('#zz-header')
        for bad in ['익명 참여', '주관', '옆칸', '실시간 끊김', '진행']:
            assert bad not in hdr, f'머리줄에 {bad}'
        assert pg.locator('.zl-more').inner_text().strip() == '메뉴'
        if narrow:
            assert pg.locator('#zz-side-toggle').is_hidden(), '휴대폰에서 머리줄 채팅 단추가 보임(아래 탭이 대신함)'
            tabs = pg.inner_text('#zz-side-tabs')
            assert '채팅' in tabs and '투표' in tabs
        else:
            expect(pg.locator('#zz-side-toggle')).to_be_visible()
            assert '채팅과 투표' in pg.inner_text('#zz-side-toggle')
        assert '손 든 사람' in pg.inner_text('#zz-side-tabs') or pg.locator('#zz-tab-hands').count() == 1
        title = pg.locator('#zz-meeting-title').bounding_box()
        assert title and title['width'] >= (90 if narrow else 200), f'회의 제목 자리가 좁음 {title}'
        shot(pg, 'b4-header'); measure(pg, ['#zz-header']); no_hscroll(pg)
        # 메뉴
        pg.click('.zl-more')
        items = pg.locator('.zl-menu-item').all_inner_texts()
        assert items == ['회의 담당자로 들어가기', '회의 목록으로 나가기', '처음 안내 다시 보기'], items
        shot(pg, 'b4-menu'); measure(pg, ['#zz-header'])
        pg.click('.zl-menu-tour')
        expect(pg.locator('.zl-ob-card')).to_be_visible()
        assert pg.inner_text('.zl-ob-step') == '1/3'
        # 다른 분이 발표를 시작하면 안내가 닫힌다
        pg.evaluate("window.__zzoom.store.emit('cmd:yield', {})")
        expect(pg.locator('.zl-ob')).to_have_count(0)
        # 담당자 창
        pg.click('.zl-more'); pg.click('.zl-host-btn')
        mt = pg.inner_text('.zz-modal')
        assert '회의 담당자로 들어가기' in mt and '담당자 비밀번호' in mt and '회의를 만든 분에게 받은 숫자 6자리예요.' in mt
        shot(pg, 'b4-hostcode'); measure(pg, ['#zz-modal-root'])
        pg.keyboard.press('Escape')
        # 배지: 새 글 2 + 새 투표 1
        pg.evaluate("window.__zzoom.store.set('badges', {chat: 2, poll: 1})")
        if not narrow:
            expect(pg.locator('#zz-side-toggle .zz-badge')).to_have_text('3')
        # 연결 끊김: 칩이 아니라 안내 띠
        pg.evaluate("window.__zzoom.store.patch('conn', {firebase: 'ok'})")
        pg.evaluate("window.__zzoom.store.patch('conn', {firebase: 'off'})")
        expect(pg.locator('#zz-notice')).to_have_text('연결이 잠깐 끊겼어요. 다시 잇는 중이에요.', timeout=5000)
        assert '끊김' not in pg.inner_text('#zz-status')
        shot(pg, 'b4-conn')
        pg.evaluate("window.__zzoom.store.patch('conn', {firebase: 'ok'})")
        expect(pg.locator('#zz-notice')).to_be_hidden()
        # 회의 중 + 내가 발표 중
        pg.evaluate("window.__fake.setMeeting({status: 'live', presenter: {cid: window.__fake.me, epoch: 1}})")
        expect(pg.locator('#zz-status')).to_contain_text('회의 중')
        if not narrow:
            expect(pg.locator('#zz-status')).to_contain_text('내가 발표 중')
        shot(pg, 'b4-live-me')
        # 다시 들어오면 안내가 다시 뜨지 않는다
        pg.reload()
        pg.wait_for_timeout(1800)
        assert pg.locator('.zl-ob').count() == 0, '다시 보지 않기를 켰는데 또 뜸'
        ctx.close()
    step('B4 머리줄, 메뉴, 배지, 연결 띠, 첫 입장 안내 3장(참석자)', header_viewer)

    def rec_tab():
        ctx, pg = new_page('role=viewer&status=ready&rec=0', f'#/m/{MID}', onboarded='viewer')
        pg.wait_for_function("!!window.__zzoom && !!window.__zzoom.store.get('role') && !!window.__zzoom.store.get('meeting')")
        pg.wait_for_timeout(300)
        assert pg.locator('#zz-tab-log').is_hidden(), '녹음 없는 회의인데 참석자에게 녹음 기록 탭'
        ctx.close()
        ctx, pg = new_page('role=host&status=ready&rec=0', f'#/m/{MID}', onboarded='viewer,host')
        pg.wait_for_function("!!window.__zzoom && !!window.__zzoom.store.get('meeting')")
        pg.wait_for_timeout(300)
        assert pg.locator('#zz-tab-log').is_visible(), '담당자에게는 녹음 기록 탭이 보여야 함'
        assert pg.inner_text('.zl-host-chip') == '회의 담당' or narrow
        ctx.close()
    step('B10 녹음 기록 탭: 녹음 없는 회의의 참석자에게는 숨김', rec_tab)

    # ---------- 담당자 안내 ----------
    def host_tour():
        ctx, pg = new_page('role=host&status=ready', f'#/m/{MID}')
        expect(pg.locator('.zl-ob-card')).to_be_visible(timeout=5000)
        pg.click('.zl-ob-next'); pg.click('.zl-ob-next')
        assert pg.inner_text('.zl-ob-step') == '3/3'
        assert pg.inner_text('.zl-ob-title') == '회의 담당자는 아래 막대를 써요'
        shot(pg, 'ob-host')
        pg.uncheck('#zl-ob-again')
        pg.click('.zl-ob-skip')
        expect(pg.locator('.zl-ob')).to_have_count(0)
        assert pg.evaluate("localStorage.getItem('zz_onboarded_v1')") in (None, ''), '다시 보지 않기를 껐는데 기억함'
        ctx.close()
        # 참석자 안내를 이미 본 분이 담당자가 되면 담당자 장 하나만
        ctx, pg = new_page('role=host&status=ready', f'#/m/{MID}', onboarded='viewer')
        expect(pg.locator('.zl-ob-card')).to_be_visible(timeout=5000)
        assert pg.inner_text('.zl-ob-step') == '1/1' and '담당자' in pg.inner_text('.zl-ob-title')
        pg.keyboard.press('Escape')
        expect(pg.locator('.zl-ob')).to_have_count(0)
        assert set(pg.evaluate("localStorage.getItem('zz_onboarded_v1')").split(',')) == {'viewer', 'host'}
        ctx.close()
    step('담당자 첫 입장 안내(1, 2, 담당자 장), 다시 보지 않기 끔, 담당자 장만', host_tour)

    def ended():
        ctx, pg = new_page('role=viewer&status=ended', f'#/m/{MID}')
        pg.wait_for_function("!!window.__zzoom && !!window.__zzoom.store.get('meeting')")
        pg.wait_for_timeout(1500)
        assert pg.locator('.zl-ob').count() == 0, '끝난 회의에서 첫 안내가 뜸'
        expect(pg.locator('#zz-status')).to_contain_text('끝난 회의') if not narrow else None
        ctx.close()
    step('끝난 회의에서는 첫 안내 없음', ended)

    b.close()
    for e in errors: print(f'  콘솔 [{tag}] {e}')
    if errors: fail.append(f'콘솔 오류 {len(errors)}건')
    return ok, fail


if __name__ == '__main__':
    srv, base = serve()
    total_ok = total_fail = 0
    try:
        with sync_playwright() as pw:
            quick = '--quick' in sys.argv   # 엣지 1280 하나만
            for label, kw in ([('edge', {'channel': 'msedge'})] if quick else [('edge', {'channel': 'msedge'}), ('chromium', {})]):
                for size in ([(1280, 800)] if quick else [(1280, 800), (820, 1180), (390, 844)]):
                    o, f = run(pw, label, kw, base, size)
                    total_ok += len(o); total_fail += len(f)
    finally:
        srv.shutdown()
    print(f'통과 {total_ok} / 실패 {total_fail}  스크린샷 {SHOTS}')
    sys.exit(1 if total_fail else 0)
