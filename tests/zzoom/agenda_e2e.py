# -*- coding: utf-8 -*-
"""AGENDA_OPEN 화면 시험(누구나 안건 올리기, 대기 화면 「오늘의 안건」, 발표하기). 서버·Firebase 없이 돈다.
    python tests/zzoom/agenda_e2e.py [스크린샷 폴더]
- public/ 를 정적 서버로 띄우고 진짜 index.html, app.js, viewer.js, agenda.js 로 조립한다.
- /zzoom/api.js 는 tests/zzoom/agenda_fake_api.js 로, 다른 팀 모듈은 빈 모듈로 바꿔 끼운다.
- 엣지(channel='msedge')와 크로미움, 창 1280x800, 820x1180, 390x844 에서 참석자(viewer)로 돈다.
- 그림 변환은 진짜 변환기(/zzoom/convert/)로 PNG 하나를 바꾼다."""
import os, sys, struct, zlib, threading, tempfile, functools, mimetypes, time
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from playwright.sync_api import sync_playwright, expect

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
PUBLIC = os.path.join(ROOT, 'public')
FAKE = open(os.path.join(os.path.dirname(__file__), 'agenda_fake_api.js'), encoding='utf-8').read()
args = [a for a in sys.argv[1:] if not a.startswith('--')]
SHOTS = args[0] if args else os.path.join(tempfile.gettempdir(), 'zzoom-agenda-shots')
os.makedirs(SHOTS, exist_ok=True)
REAL_MODS = {'viewer', 'agenda'}
band = None
MID = 'mabcdefghij12'
CONFIRM = '지금부터 화면이 전송됩니다'
BUSY = '지금 다른 분이 발표 중이에요.'

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

def png(w, h):
    raw = b''.join(b'\x00' + b''.join(bytes(((x * 255 // w), (y * 255 // h), 160)) for x in range(w)) for y in range(h))
    def chunk(t, d): return struct.pack('>I', len(d)) + t + d + struct.pack('>I', zlib.crc32(t + d) & 0xffffffff)
    return b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 2, 0, 0, 0)) + chunk(b'IDAT', zlib.compress(raw)) + chunk(b'IEND', b'')

FILES = tempfile.mkdtemp(prefix='zzoom-agenda-files-')
P_PNG = os.path.join(FILES, '행사 안내 그림.png')
with open(P_PNG, 'wb') as f: f.write(png(400, 300))

STUB = "export function mount(ctx){ return { unmount(){} }; }"

def run(pw, label, launch_kw, base, size):
    ok, fail, errors = [], [], []
    w, h = size
    tag = f'{label}_{w}'
    def step(name, fn):
        try: fn(); ok.append(name); print(f'  OK   [{tag}] {name}', flush=True)
        except Exception as e: fail.append(name); print(f'  FAIL [{tag}] {name} -> {str(e)[:500]}', flush=True)
    b = pw.chromium.launch(**launch_kw)
    print(f'[{tag}] 브라우저 {b.version}', flush=True)
    ctx = b.new_context(viewport={'width': w, 'height': h}, locale='ko-KR')
    ctx.add_init_script("try{localStorage.setItem('airoom_auth_token','fake-token')}catch(e){}")
    ctx.route('**/zzoom/api.js*', lambda r: r.fulfill(status=200, content_type='text/javascript; charset=utf-8', body=FAKE))
    def other(route):
        name = route.request.url.split('/zzoom/')[-1].split('?')[0][:-3]
        if name in REAL_MODS or name == 'app': route.fallback()
        else: route.fulfill(status=200, content_type='text/javascript; charset=utf-8', body=STUB)
    ctx.route(lambda u: '/zzoom/' in u and u.split('?')[0].endswith('.js') and '/convert/' not in u and '/vendor/' not in u and 'api.js' not in u, other)
    pg = ctx.new_page()
    pg.on('console', lambda m: errors.append(f'console: {m.text}') if m.type == 'error' else None)
    pg.on('pageerror', lambda e: errors.append(f'pageerror: {e}'))
    pg.goto(f'{base}/zzoom/index.html?role=viewer&status=ready#/m/{MID}')

    wait = pg.locator('#zz-wait')
    modal = lambda: pg.locator('#zz-modal-root .zz-modal')
    item = lambda aid: pg.locator(f'#zz-wait .za-item[data-aid="{aid}"]')
    calls = lambda n: pg.evaluate("n => window.__fake.calls.filter(c => c.name === n).map(c => c.args)", n)
    store = lambda k: pg.evaluate("k => window.__zzoom.store.get(k)", k)
    def shot(name):
        pg.wait_for_timeout(300)
        pg.screenshot(path=os.path.join(SHOTS, f'{tag}_{name}.png'))
    def open_panel():
        if 'is-mini' in (wait.get_attribute('class') or ''):
            wait.locator('.za-mini').click()
        expect(wait.locator('.za-panel')).to_be_visible(timeout=5000)
    def finish_upload(expect_pages='1쪽', aid=None):
        go = modal().get_by_role('button', name='이대로 올리기')
        expect(go).to_be_visible(timeout=20000)
        shot('preview')
        go.click()
        expect(modal()).to_have_count(0, timeout=15000)

    def s1():
        expect(wait.locator('.za-panel')).to_be_visible(timeout=10000)
        assert 'is-full' in wait.get_attribute('class')
        expect(wait.locator('.za-title')).to_contain_text('오늘의 안건')
        expect(wait.locator('.za-item')).to_have_count(2)
        expect(item('aaaaaaa1').locator('.za-meta')).to_contain_text('4쪽')
        expect(item('bbbbbbb2').locator('.za-meta')).to_contain_text('자료 없음')
        txt = wait.inner_text()
        assert '올린 사람' not in txt and '선생님' not in txt, '사람 이름 관련 문구가 보임'
        assert wait.locator('.za-chip-mine').count() == 0, '남의 안건에 내 안건 표시'
        assert item('aaaaaaa1').locator('.za-upload, .za-del, .za-rename').count() == 0, '남의 안건에 고치기 단추'
        # 패널이 화면 안에 들어오는지
        r = wait.locator('.za-panel').bounding_box()
        assert r['x'] >= 0 and r['x'] + r['width'] <= w + 1, f'패널이 가로로 넘침 {r}'
        # EASY_UX: 무대 위 「지금 상태」 띠
        expect(pg.locator('.zv-band')).to_have_attribute('data-state', 'ready', timeout=5000)
        expect(pg.locator('.zv-band-title')).to_have_text('회의 시작 전이에요')
        shot('1_wait_ready')
    step('준비 상태에 대기 화면 「오늘의 안건」, 쪽수와 자료 없음 표시, 이름 없음, 남의 안건 고치기 단추 없음', s1)

    def s2():
        expect(item('aaaaaaa1').locator('.za-present')).to_have_count(0)
        expect(wait.locator('.za-sub').last).to_contain_text('「발표하기」 단추가 생겨요')
    step('준비 상태에서는 발표하기 단추를 그리지 않고 이유를 글로 알림', s2)

    def s3():
        wait.locator('.za-add').click()
        expect(modal()).to_be_visible()
        modal().locator('#za-add-title').fill('그림 자료 안건')
        modal().locator('#za-add-file').set_input_files(P_PNG)
        expect(modal().locator('.za-file-name')).to_contain_text('자료 1개를 골랐어요')
        assert '행사 안내' not in modal().inner_text(), '원본 파일 이름이 보임(익명, U19)'
        shot('2_add_modal')
        modal().get_by_role('button', name='안건 추가하기', exact=True).click()
        finish_upload()
        expect(item('nnnnnnn3').locator('.za-meta')).to_contain_text('1쪽', timeout=8000)
        expect(item('nnnnnnn3').locator('.za-chip-mine')).to_have_text('내 안건')
        assert calls('createAgenda') == [['그림 자료 안건']], calls('createAgenda')
        at = calls('attachAgendaFile')
        assert len(at) == 1 and at[0][0] == 'nnnnnnn3' and at[0][1]['pages'] == 1, at
        shot('3_added_with_file')
    step('참석자가 「안건 추가」로 제목과 PNG 를 올리면 변환, 올리기 뒤 1쪽과 「내 안건」 표시', s3)

    def s4():
        wait.locator('.za-add').click()
        modal().locator('#za-add-title').fill('제목만 안건')
        modal().get_by_role('button', name='안건 추가하기', exact=True).click()
        expect(modal()).to_have_count(0, timeout=5000)
        expect(item('nnnnnnn4').locator('.za-meta')).to_contain_text('자료 없음')
        expect(item('nnnnnnn4').locator('.za-chip-mine')).to_be_visible()
        assert item('nnnnnnn4').locator('.za-present').count() == 0
        with pg.expect_file_chooser() as fc:
            item('nnnnnnn4').locator('.za-upload').click()
        fc.value.set_files(P_PNG)
        finish_upload()
        expect(item('nnnnnnn4').locator('.za-meta')).to_contain_text('1쪽', timeout=8000)
        # 줄에는 단추 하나(자료가 생기면 회의 전에는 「고치기」만), 자료 바꾸기는 「고치기」 안
        expect(item('nnnnnnn4').locator('.za-actions .za-upload')).to_have_count(0)
        item('nnnnnnn4').locator('.za-edit').click()
        menu = item('nnnnnnn4').locator('.za-edit-menu')
        expect(menu.locator('.za-upload')).to_have_text('자료 바꾸기')
        names = [x.strip() for x in menu.locator('button').all_inner_texts()]
        assert names == ['자료 바꾸기', '이름 바꾸기', '지우기'], names
        shot('3b_edit_menu')
        item('nnnnnnn4').locator('.za-edit').click()
        expect(menu).to_have_count(0)
    step('제목만 안건 추가 뒤 「자료 올리기」로 파일을 붙임', s4)

    def s5():
        n0 = len(calls('sendLive'))
        item('aaaaaaa1').locator('.za-main').click()
        expect(wait.locator('.za-panel')).to_have_count(0, timeout=5000)
        pg.wait_for_function("() => window.__zzoom.store.get('page')?.aid === 'aaaaaaa1'", timeout=5000)
        assert store('page')['page'] == 1
        assert len(calls('sendLive')) == n0, '발표자가 아닌데 sendLive 를 부름'
        shot('4_after_tap_ready')
    step('안건을 누르면 그 안건 1쪽으로 이동(내 화면만, sendLive 없음)', s5)

    def s6():
        pg.evaluate("() => window.__fake.setMeeting({ status: 'live' })")
        open_panel()
        p = item('aaaaaaa1').locator('.za-present')
        expect(p).to_be_enabled(timeout=5000)
        p.click()
        expect(modal()).to_have_count(1)
        expect(modal().locator('.za-confirm p')).to_have_count(1)
        assert modal().locator('.za-confirm-main').inner_text().strip() == CONFIRM, modal().locator('.za-confirm').inner_text()
        names = [x.strip() for x in modal().locator('.zz-modal-actions button').all_inner_texts()]
        assert names == ['예', '아니오'], names
        shot('5_confirm')
        modal().get_by_role('button', name='아니오').click()
        expect(modal()).to_have_count(0)
        pg.wait_for_timeout(300)
        assert calls('present') == [], calls('present')
        assert pg.evaluate("() => window.__fake.meeting.presenter") is None
    step('발표하기 확인 창: 본문 「지금부터 화면이 전송됩니다」, 단추 「예」「아니오」, 아니오는 아무 일도 없음', s6)

    def s6b():
        b = pg.locator('.zv-band')
        expect(b).to_have_attribute('data-state', 'idle', timeout=5000)
        expect(pg.locator('.zv-band-title')).to_have_text('아직 발표하는 분이 없어요')
        expect(b.locator('.zv-band-agenda')).to_have_count(0)   # 「오늘의 안건」이 이미 펼쳐져 있으면 단추 없음
        wait.locator('.za-close').click()
        expect(wait).to_have_class('za-wait is-mini', timeout=5000)
        expect(wait.locator('.za-mini')).to_contain_text('오늘의 안건 펼치기')
        expect(b.locator('.zv-band-agenda')).to_have_text('오늘의 안건 보기')
        shot('5b_idle_band')
        b.locator('.zv-band-agenda').click()
        expect(wait.locator('.za-panel')).to_be_visible(timeout=5000)
        expect(b.locator('.zv-band-agenda')).to_have_count(0)
    step('회의 중 발표하는 사람이 없으면 띠 「아직 발표하는 분이 없어요」, 접으면 「오늘의 안건 보기」로 다시 펼침', s6b)

    def s7():
        pg.evaluate("""() => window.__fake.setMeeting({ presenter: { cid: 'c-other', epoch: 1 },
            live: { aid: 'aaaaaaa1', page: 2, view: { cx: .5, cy: .5, z: 1 }, rev: 1, epoch: 1, forceSeq: 1, at: Date.now() } })""")
        expect(wait).to_have_class('za-wait is-mini', timeout=5000)
        shot('6_mini_other_presenting')
        open_panel()
        expect(item('aaaaaaa1').locator('.za-chip-live')).to_be_visible()
        item('nnnnnnn3').locator('.za-present').click()
        expect(modal()).to_have_count(1)
        ps = [x.strip() for x in modal().locator('.za-confirm p').all_inner_texts()]
        assert ps == [BUSY, CONFIRM], ps
        assert '선생님' not in modal().inner_text()
        shot('7_confirm_busy')
        modal().get_by_role('button', name='예').click()
        expect(modal()).to_have_count(0, timeout=5000)
        assert calls('present') == [['nnnnnnn3']], calls('present')
        assert pg.evaluate("() => window.__fake.meeting.presenter.cid") == 'c-me'
        expect(wait).to_have_class('za-wait is-mini', timeout=5000)
        pg.wait_for_function("() => window.__zzoom.store.get('page')?.aid === 'nnnnnnn3'", timeout=5000)
        shot('8_presenting')
    step('다른 분이 발표 중이면 한 창에 「지금 다른 분이 발표 중이에요.」를 더하고, 예를 누르면 내가 발표자, 내 화면이 그 안건으로', s7)

    def s7b():
        b = pg.locator('.zv-band')
        expect(b).to_have_attribute('data-state', 'presenting', timeout=5000)
        expect(pg.locator('.zv-band-title')).to_have_text('내가 발표 중이에요')
        expect(b).to_contain_text('3번 안건 1쪽')
        end = b.locator('.zv-end-btn')
        expect(end).to_have_text('발표 마치기')
        # 띠가 무대 위에 있고 판서 막대 자리와 겹치지 않음(무대 위쪽 = 띠 아래)
        bb, sb = b.bounding_box(), pg.locator('#zz-stage').bounding_box()
        assert bb['y'] + bb['height'] <= sb['y'] + 1, (bb, sb)
        assert bb['height'] >= 47, bb
        shot('8b_presenting_band')
        end.click()
        expect(b).to_have_attribute('data-state', 'idle', timeout=5000)
        assert calls('presenterEnd') == [[]], calls('presenterEnd')
        assert pg.evaluate("() => window.__fake.meeting.presenter.cid") is None
        expect(wait).to_have_class('za-wait is-full', timeout=5000)   # 모두 「오늘의 안건」 대기 화면
        shot('8c_after_end')
    step('내가 발표 중이면 띠 「내가 발표 중이에요」와 「발표 마치기」, 누르면 presenterEnd 뒤 모두 대기 화면', s7b)

    def s8():
        pg.evaluate("""() => window.__fake.setMeeting({ presenter: { cid: 'c-other', epoch: 5 },
            live: { aid: 'aaaaaaa1', page: 1, view: { cx: .5, cy: .5, z: 1 }, rev: 9, epoch: 5, forceSeq: 5, at: Date.now() } })""")
        pg.wait_for_function("() => window.__zzoom.store.get('page')?.aid === 'aaaaaaa1'", timeout=5000)
        b = pg.locator('.zv-band')
        expect(b).to_have_attribute('data-state', 'follow', timeout=5000)
        expect(pg.locator('.zv-band-title')).to_have_text('모두의 화면을 따라가는 중이에요')
        expect(b).to_contain_text('1번 안건 1쪽')
        expect(b.locator('.zv-end-btn')).to_have_count(0)   # 참석자에게는 남의 발표를 마치는 단추 없음
        shot('8d_follow_band')
        n0 = len(calls('sendLive'))
        open_panel()
        item('nnnnnnn4').locator('.za-main').click()
        pg.wait_for_function("() => window.__zzoom.store.get('page')?.aid === 'nnnnnnn4'", timeout=5000)
        assert store('follow') == 'free', store('follow')
        pg.wait_for_timeout(400)
        assert len(calls('sendLive')) == n0, '발표자가 아닌데 sendLive 를 부름'
        b = pg.locator('.zv-band')
        expect(b).to_have_attribute('data-state', 'free', timeout=5000)
        expect(pg.locator('.zv-band-title')).to_have_text('내 화면으로 보는 중이에요')
        expect(b).to_contain_text('다른 분들은 1번 안건 1쪽을 보고 있어요')
        shot('9_free_view')
        b.locator('.zv-follow-btn').click()
        expect(b).to_have_attribute('data-state', 'follow', timeout=5000)
        pg.wait_for_function("() => window.__zzoom.store.get('page')?.aid === 'aaaaaaa1'", timeout=5000)
        assert store('follow') == 'follow'
    step('남이 발표 중일 때 안건을 누르면 내 화면만 이동, 띠 「내 화면으로 보는 중이에요」, 「발표 화면으로 돌아가기」로 복귀', s8)

    def s9():
        # 글자 없는 단추 없음(띠, 대기 화면, 쪽 막대)
        empty = pg.evaluate("""() => [...document.querySelectorAll('#zz-follow-bar button, #zz-wait button, .zv-pager button')]
            .filter(b => b.offsetParent && !b.innerText.trim()).map(b => b.className)""")
        assert not empty, empty
        pg.evaluate("() => window.__fake.setMeeting({ status: 'ended' })")
        expect(pg.locator('.zv-band')).to_have_attribute('data-state', 'ended', timeout=5000)
        expect(pg.locator('.zv-band')).to_contain_text('자료와 채팅과 녹음 기록을 다시 볼 수 있어요')
        expect(wait).to_be_hidden()
        shot('10_ended')
    step('글자 없는 단추 0, 끝난 회의는 띠 「끝난 회의예요」', s9)

    if w == 1280:
        hp = ctx.new_page()
        hp.on('pageerror', lambda e: errors.append(f'pageerror(host): {e}'))
        hp.goto(f'{base}/zzoom/index.html?role=host&status=live#/m/{MID}')
        def h1():
            hp.evaluate("""() => window.__fake.setMeeting({ presenter: { cid: 'c-other', epoch: 2 },
                live: { aid: 'aaaaaaa1', page: 2, view: { cx: .5, cy: .5, z: 1 }, rev: 3, epoch: 2, forceSeq: 1, at: Date.now() } })""")
            b = hp.locator('.zv-band')
            expect(b).to_have_attribute('data-state', 'follow', timeout=8000)
            end = b.locator('.zv-end-btn')
            expect(end).to_have_text('발표 마치기')
            end.click()
            m = hp.locator('#zz-modal-root .zz-modal')
            expect(m).to_contain_text('지금 발표하는 분의 발표를 마칠까요?')
            hp.wait_for_timeout(100)
            assert hp.evaluate("() => document.activeElement?.innerText") == '취소', '첫 초점이 취소가 아님'
            hp.screenshot(path=os.path.join(SHOTS, f'{tag}_11_host_end_confirm.png'))
            m.get_by_role('button', name='발표 마치기').click()
            expect(b).to_have_attribute('data-state', 'idle', timeout=5000)
            assert hp.evaluate("() => window.__fake.calls.filter(c => c.name === 'presenterEnd').length") == 1
        step('담당자는 다른 분 발표 중에도 「발표 마치기」, 확인 창을 거쳐 presenterEnd', h1)
        hp.close()

    real_err = [e for e in errors if 'favicon' not in e]
    step('콘솔·페이지 오류 0', lambda: (_ for _ in ()).throw(AssertionError('\n'.join(real_err[:8]))) if real_err else None)
    b.close()
    return ok, fail

def main():
    srv, base = serve()
    total_ok = total_fail = 0
    with sync_playwright() as pw:
        for label, kw in [('edge', {'channel': 'msedge'}), ('chromium', {})]:
            for size in [(1280, 800), (820, 1180), (390, 844)]:
                if os.environ.get('AG_ONLY') and os.environ['AG_ONLY'] != f'{label}:{size[0]}': continue
                try:
                    ok, fail = run(pw, label, kw, base, size)
                except Exception as e:
                    print(f'[{label}] 실행 실패: {e}', flush=True); ok, fail = [], ['launch']
                total_ok += len(ok); total_fail += len(fail)
    srv.shutdown()
    print(f'\n합계: 통과 {total_ok}, 실패 {total_fail}  스크린샷 {SHOTS}', flush=True)
    sys.exit(1 if total_fail else 0)

if __name__ == '__main__':
    main()
