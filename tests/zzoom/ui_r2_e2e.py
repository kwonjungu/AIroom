# -*- coding: utf-8 -*-
"""화면 감사 R2 고침 시험(FIX_UI_R2). 서버·Firebase 없이 돈다.
    python -B -X utf8 tests/zzoom/ui_r2_e2e.py [스크린샷 폴더] [--public=다른 public 폴더]
- 진짜 index.html, app.js, viewer.js, agenda.js, hands.js 로 조립하고 /zzoom/api.js 는 agenda_fake_api.js 로 바꾼다.
- 로그인 순서(U15)는 진짜 api.js 를 쓰고, Firebase 모듈(gstatic)과 /api 응답만 가짜로 끼운다.
- 엣지(channel='msedge')와 크로미움, 창 1280x800, 820x1180, 390x844.
- --public 으로 고치기 전 사본을 주면 같은 시험이 실패하는지 볼 수 있다."""
import os, sys, json, threading, tempfile, functools, mimetypes
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from playwright.sync_api import sync_playwright, expect

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
opt = {a.split('=', 1)[0][2:]: (a.split('=', 1) + [''])[1] for a in sys.argv[1:] if a.startswith('--')}
PUBLIC = os.path.abspath(opt.get('public') or os.path.join(ROOT, 'public'))
FAKE = open(os.path.join(os.path.dirname(__file__), 'agenda_fake_api.js'), encoding='utf-8').read()
args = [a for a in sys.argv[1:] if not a.startswith('--')]
SHOTS = args[0] if args else os.path.join(tempfile.gettempdir(), 'zzoom-ui-r2-shots')
os.makedirs(SHOTS, exist_ok=True)
REAL_MODS = {'viewer', 'agenda', 'hands'}
MID = 'mabcdefghij12'
STUB = "export function mount(ctx){ return { unmount(){} }; }"

mimetypes.add_type('text/javascript', '.js'); mimetypes.add_type('text/css', '.css'); mimetypes.add_type('image/webp', '.webp')

class Quiet(SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
    def guess_type(self, path):
        t, _ = mimetypes.guess_type(path)
        return t or 'application/octet-stream'

def serve():
    srv = ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Quiet, directory=PUBLIC))
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv, f'http://127.0.0.1:{srv.server_address[1]}'

FILES = tempfile.mkdtemp(prefix='zzoom-ui-r2-files-')
SECRET_FILE = '홍길동_개인 계획서.png'   # 사람 이름이 든 파일 이름(가상)
P_PNG = os.path.join(FILES, SECRET_FILE)
import struct, zlib
def png(w, h):
    raw = b''.join(b'\x00' + bytes((120, 160, 200)) * w for _ in range(h))
    def chunk(t, d): return struct.pack('>I', len(d)) + t + d + struct.pack('>I', zlib.crc32(t + d) & 0xffffffff)
    return b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 2, 0, 0, 0)) + chunk(b'IDAT', zlib.compress(raw)) + chunk(b'IEND', b'')
with open(P_PNG, 'wb') as f: f.write(png(300, 200))

# ---- 로그인 순서 시험(U15)용 가짜 Firebase 모듈 ----
FB_APP = "export const getApps=()=>[]; export const initializeApp=(c,n)=>({name:n});"
FB_AUTH = """
export const inMemoryPersistence = {};
const W = window.__fbAuth ||= { user: null, log: [] };
export function initializeAuth(){ return { currentUser: null }; }
export function getAuth(){ return { currentUser: null }; }
export async function signInWithCustomToken(auth, token){
  W.log.push('in:' + token);
  await new Promise(r => setTimeout(r, String(token).includes('-A') ? 1500 : 60));
  W.user = token; W.log.push('done:' + token); return { user: { uid: token } };
}
export async function signOut(){ W.user = null; W.log.push('out'); }
"""
FB_FS = """
export const getFirestore=()=>({}); export const collection=(...a)=>a; export const doc=(...a)=>a; export const query=(...a)=>a;
export const where=(...a)=>a; export const orderBy=(...a)=>a; export const limit=(...a)=>a;
export function onSnapshot(){ return () => {}; }
"""
FB_ST = "export const getStorage=()=>({}); export const ref=()=>({}); export async function uploadBytes(){} export async function getBlob(){ return new Blob(); }"

def run(pw, label, launch_kw, base, size):
    ok, fail, errors = [], [], []
    w, h = size
    tag = f'{label}_{w}'
    compact = w < 1024
    def step(name, fn):
        try: fn(); ok.append(name); print(f'  OK   [{tag}] {name}', flush=True)
        except Exception as e: fail.append(name); print(f'  FAIL [{tag}] {name} -> {str(e)[:400]}', flush=True)
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
    pg.goto(f'{base}/zzoom/index.html?role=viewer&status=live#/m/{MID}')

    wait = pg.locator('#zz-wait')
    backs = pg.locator('#zz-modal-root .zz-modal-back')
    modal = lambda: pg.locator('#zz-modal-root .zz-modal')
    item = lambda aid: pg.locator(f'#zz-wait .za-item[data-aid="{aid}"]')
    calls = lambda n: pg.evaluate("n => window.__fake.calls.filter(c => c.name === n).map(c => c.args)", n)
    store = lambda k: pg.evaluate("k => window.__zzoom.store.get(k)", k)
    force = [1]
    def present_by(cid, aid='aaaaaaa1', page=2):
        force[0] += 1
        pg.evaluate("""([cid, aid, page, fs]) => window.__fake.setMeeting({ presenter: { cid, epoch: fs },
            live: { aid, page, view: { cx: .5, cy: .5, z: 1 }, rev: fs, epoch: fs, forceSeq: fs, at: Date.now() } })""", [cid, aid, page, force[0]])
    def shot(name):
        pg.wait_for_timeout(250)
        pg.screenshot(path=os.path.join(SHOTS, f'{tag}_{name}.png'))
    def open_panel():
        if 'is-mini' in (wait.get_attribute('class') or ''):
            wait.locator('.za-mini').click()
        expect(wait.locator('.za-panel')).to_be_visible(timeout=5000)
    def open_side(tab):
        pg.evaluate("t => window.__zzoom.store.set('side', { open: true, tab: t })", tab)

    # 시작: 다른 분(c-other)이 이미 발표 중
    expect(wait).to_be_attached(timeout=10000)
    present_by('c-other')
    expect(wait).to_have_class('za-wait is-mini', timeout=8000)

    def u16_panel():
        open_panel()
        shot('u16_1_panel_open')
        present_by('c-third', 'aaaaaaa1', 3)
        expect(wait.locator('.za-panel')).to_have_count(0, timeout=3000)
        expect(wait).to_have_class('za-wait is-mini')
        pg.wait_for_function("() => { const p = window.__zzoom.store.get('page'); return p && p.aid === 'aaaaaaa1' && p.page === 3; }", timeout=5000)
        shot('u16_2_after_takeover')
    step('U16 손으로 연 「오늘의 안건」은 다른 분이 발표를 시작하면 닫히고 발표 쪽이 보임', u16_panel)

    def u16_same_presenter_force():
        open_panel()
        present_by('c-third', 'aaaaaaa1', 4)   # 같은 발표자가 다시 「발표하기」(forceSeq 증가)
        expect(wait.locator('.za-panel')).to_have_count(0, timeout=3000)
    step('U16 같은 발표자가 새로 발표해도(forceSeq 증가) 손으로 연 패널이 닫힘', u16_same_presenter_force)

    def u16_modals():
        open_panel()
        wait.locator('.za-add').click()
        expect(modal()).to_have_count(1)
        modal().locator('#za-add-title').fill('입력 중인 안건')
        if compact: open_side('chat')
        present_by('c-other', 'aaaaaaa1', 1)
        # 입력 중인 창은 닫지 않고 접는다
        expect(backs).to_have_count(1, timeout=3000)
        expect(backs.first).to_have_class('zz-modal-back is-min')
        expect(modal()).to_be_hidden()
        chip = pg.locator('.zz-modal-chip')
        expect(chip).to_be_visible()
        expect(wait.locator('.za-panel')).to_have_count(0)
        if compact:
            assert store('side')['open'] is False, store('side')
        cb = chip.bounding_box()
        assert cb['height'] >= 44 and cb['x'] >= 0 and cb['x'] + cb['width'] <= w + 1, cb
        # 접힌 창이 무대를 막지 않음: 무대 가운데 맨 위 요소가 창 덮개가 아님
        top = pg.evaluate("() => { const s = document.getElementById('zz-stage').getBoundingClientRect(); const e = document.elementFromPoint(s.left + s.width / 2, s.top + s.height / 2); return e && e.closest('.zz-modal-back') ? 'modal' : 'stage'; }")
        assert top == 'stage', top
        shot('u16_3_folded_modal')
        chip.click()
        expect(modal()).to_be_visible()
        assert modal().locator('#za-add-title').input_value() == '입력 중인 안건'
        shot('u16_4_restored')
        modal().get_by_role('button', name='취소').click()
        expect(backs).to_have_count(0)
    step('U16 열린 창: 입력 중인 「안건 추가」는 접혀 입력값을 지키고, 서랍은 닫히고, 다시 열면 그대로', u16_modals)

    def u16_close_plain():
        open_panel()
        wait.locator('.za-add').click()          # 빈 안건 추가 창
        expect(modal()).to_have_count(1)
        pg.keyboard.press('Escape')
        expect(backs).to_have_count(0)
        open_panel()
        item('aaaaaaa1').locator('.za-present').click()   # 발표 확인 창
        expect(modal()).to_have_count(1)
        present_by('c-other', 'aaaaaaa1', 2)
        expect(backs).to_have_count(0, timeout=3000)
        assert calls('present') == [], calls('present')
    step('U16 입력이 없는 창(발표 확인 창)은 다른 분이 발표하면 그냥 닫힘', u16_close_plain)

    def u18_focus():
        open_panel()
        item('aaaaaaa1').locator('.za-present').click()
        expect(modal()).to_have_count(1)
        pg.wait_for_function("() => document.activeElement && document.activeElement.closest('.zz-modal')", timeout=3000)
        f = pg.evaluate("() => document.activeElement.textContent.trim()")
        assert f == '아니오', f
        assert modal().locator('.za-confirm-main').inner_text().strip() == '지금부터 화면이 전송됩니다'
        assert modal().locator('.za-confirm-busy').inner_text().strip() == '지금 다른 분이 발표 중이에요.'
        names = [x.strip() for x in modal().locator('.zz-modal-actions button').all_inner_texts()]
        assert names == ['예', '아니오'], names
        shot('u18_confirm_focus')
        pg.keyboard.press('Enter')
        expect(backs).to_have_count(0, timeout=3000)
        pg.wait_for_timeout(300)
        assert calls('present') == [], calls('present')
    step('U18 발표 확인 창 첫 초점은 「아니오」, 곧바로 Enter 를 눌러도 전송 안 됨(문구 그대로)', u18_focus)

    def u19_names():
        open_panel()
        wait.locator('.za-add').click()
        modal().locator('#za-add-file').set_input_files(P_PNG)
        expect(modal().locator('.za-file-name')).to_contain_text('그림')
        txt = modal().inner_text()
        assert '홍길동' not in txt and '계획서' not in txt, txt
        assert modal().locator('#za-add-title').input_value() == '', '파일 이름으로 제목을 채움'
        modal().locator('#za-add-title').fill('익명 시험 안건')
        modal().get_by_role('button', name='안건 추가하기', exact=True).click()
        go = modal().get_by_role('button', name='이대로 올리기')
        expect(go).to_be_visible(timeout=20000)
        assert '홍길동' not in pg.locator('#zz-modal-root').inner_text()
        shot('u19_upload_no_name')
        go.click()
        expect(backs).to_have_count(0, timeout=15000)
        open_panel()
        assert '홍길동' not in wait.inner_text() and '계획서' not in wait.inner_text()
        pg.keyboard.press('Escape')
    step('U19 원본 파일 이름이 화면에 보이지 않음(안건 추가, 올리기 창, 목록), 제목을 파일 이름으로 채우지 않음', u19_names)

    def u14_hands():
        open_side('hands')
        btn = pg.locator('#zz-side-hands .zs-hands-raise')
        expect(btn).to_be_visible(timeout=5000)
        pg.evaluate("() => document.querySelectorAll('.zz-toast-item').forEach(e => e.remove())")   # 잠깐 뜨는 알림(3.5초)은 빼고 잰다
        pg.wait_for_timeout(400)   # 서랍 여는 움직임이 끝날 때까지
        top = pg.evaluate("""() => { const b = document.querySelector('#zz-side-hands .zs-hands-raise').getBoundingClientRect();
            const e = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2); return !!(e && e.closest('.zs-hands-raise')); }""")
        assert top, '칸 안 손들기 단추가 가려짐'
        bb = btn.bounding_box()
        assert bb['height'] >= 44, bb
        btn.click()
        expect(btn).to_have_attribute('aria-pressed', 'true')
        pg.wait_for_function("() => window.__fake.calls.some(c => c.name === 'setHand' && c.args[0] === true)", timeout=3000)
        q = pg.locator('#zz-quick-hand .zs-hand-btn')
        assert q.get_attribute('aria-pressed') == 'true', '쪽 막대 단추와 상태가 다름'
        shot('u14_hands_open')
    step('U14 「손」 칸을 열어도 칸 안 손들기 단추로 손을 들 수 있음(가려지지 않음, 44px)', u14_hands)

    def u04_timer():
        btn = pg.locator('#zz-side-hands .zs-hands-raise')
        # 서버도 내 손을 반영한 상태에서 시작
        pg.evaluate("() => window.__fake.setHands([{ cid: window.__fake.me, at: 1 }])")
        pg.wait_for_timeout(1700)   # 앞 시험의 타이머를 흘려보냄
        expect(btn).to_have_attribute('aria-pressed', 'true')
        btn.click()                  # 내림(want false) → 1.5초 타이머 1
        pg.wait_for_timeout(200)
        pg.evaluate("() => window.__fake.setHands([{ cid: window.__fake.me, at: 1 }])")   # 서버가 아직 못 따라옴
        btn.click()                  # 다시 듦(want true)
        pg.wait_for_timeout(100)
        btn.click()                  # 또 내림(want false) → 이 낙관 상태가 앞 타이머에 지워지면 안 됨
        pg.wait_for_timeout(1300)    # 첫 타이머(1.5초)는 지났고 마지막 타이머는 아직
        assert btn.get_attribute('aria-pressed') == 'false', '앞 타이머가 마지막 낙관 상태를 지움'
        pg.evaluate("() => window.__fake.setHands([])")
        pg.wait_for_timeout(1700)
        assert btn.get_attribute('aria-pressed') == 'false'
    step('U04 손들기 연타 때 앞 타이머가 뒤 낙관 상태를 지우지 않음', u04_timer)

    def u17_route():
        pg.evaluate("() => window.__zzoom.store.set('side', { open: false, tab: 'chat' })")
        open_panel()
        item('aaaaaaa1').locator('.za-present').click()
        expect(modal()).to_have_count(1)
        pg.evaluate("() => { location.hash = '#/'; }")
        expect(backs).to_have_count(0, timeout=3000)
        shot('u17_list_no_modal')
        pg.evaluate(f"() => {{ location.hash = '#/m/{MID}'; }}")
        expect(wait).to_be_attached(timeout=8000)
        pg.wait_for_timeout(500)
        assert backs.count() == 0
        assert calls('present') == []
    step('U17 화면을 옮기면 열린 창(발표 확인 창)이 남지 않음', u17_route)

    real_err = [e for e in errors if 'favicon' not in e]
    step('콘솔·페이지 오류 0', lambda: (_ for _ in ()).throw(AssertionError('\n'.join(real_err[:8]))) if real_err else None)
    ctx.close()

    # ---- U15: 진짜 api.js, 회의 둘을 빠르게 오감 ----
    def u15():
        c2 = b.new_context(viewport={'width': w, 'height': h}, locale='ko-KR')
        c2.add_init_script("try{localStorage.setItem('airoom_auth_token','fake-token')}catch(e){}")
        js = lambda body: (lambda r: r.fulfill(status=200, content_type='text/javascript; charset=utf-8', body=body))
        c2.route('https://www.gstatic.com/firebasejs/**/firebase-app.js', js(FB_APP))
        c2.route('https://www.gstatic.com/firebasejs/**/firebase-auth.js', js(FB_AUTH))
        c2.route('https://www.gstatic.com/firebasejs/**/firebase-firestore.js', js(FB_FS))
        c2.route('https://www.gstatic.com/firebasejs/**/firebase-storage.js', js(FB_ST))
        reqs = []
        def apis(route):
            u = route.request.url.split('?')[0]
            path = u.split('/api/', 1)[1]
            if path == 'firebase-config': d = {'apiKey': 'fake', 'projectId': 'fake'}
            elif path == 'zzoom/health': d = {'ok': True, 'firebase': True, 'redis': True}
            elif path.endswith('/join') or path.endswith('/refresh'):
                mid = path.split('/')[1]
                tail = mid[-1]
                d = {'pt': 'pt-' + mid, 'cid': 'cid-' + tail, 'role': 'viewer', 'exp': 9999999999999, 'until': 9999999999999,
                     'token': 'tok-' + tail, 'meeting': {'title': '회의 ' + tail, 'status': 'live'}}
            else: d = {}
            reqs.append(route.request.method + ' ' + path)
            route.fulfill(status=200, content_type='application/json', body=json.dumps(d))
        c2.route('**/api/**', apis)
        c2.route(lambda u: '/zzoom/' in u and u.split('?')[0].endswith('.js') and '/convert/' not in u and '/vendor/' not in u and 'api.js' not in u and 'app.js' not in u,
                 lambda r: r.fulfill(status=200, content_type='text/javascript; charset=utf-8', body=STUB))
        p2 = c2.new_page()
        errs2 = []
        p2.on('pageerror', lambda e: errs2.append(str(e)))
        p2.goto(f'{base}/zzoom/index.html#/m/meetingxx-A')
        p2.wait_for_function("() => window.__zzoom && !document.getElementById('zz-join').hidden", timeout=8000)
        # 회의 A 입장(실시간 로그인이 느림) → 곧바로 회의 B 로 옮겨 입장
        p2.evaluate("() => { window.__joinA = window.__zzoom.api.join('meetingxx-A').then(() => 'ok', e => e.code || String(e)); }")
        p2.wait_for_timeout(250)
        p2.evaluate("() => { location.hash = '#/m/meetingxx-B'; }")
        p2.wait_for_function("() => !document.getElementById('zz-join').hidden && location.hash.endsWith('-B')", timeout=8000)
        p2.evaluate("() => window.__zzoom.api.join('meetingxx-B')")
        ra = p2.evaluate("() => window.__joinA")
        p2.wait_for_timeout(2200)    # A 의 늦은 로그인이 끝날 때까지
        st = p2.evaluate("() => ({ user: window.__fbAuth.user, log: window.__fbAuth.log, conn: window.__zzoom.store.get('conn'), role: window.__zzoom.store.get('role'), s: window.__zzoom.api.session('meetingxx-B') })")
        p2.screenshot(path=os.path.join(SHOTS, f'{tag}_u15_after.png'))
        c2.close()
        st['reqs'] = reqs
        assert ra == 'aborted' or ra is None, ra
        assert st['user'] == 'tok-B', st
        assert st['conn']['firebase'] == 'ok', st
        assert st['role'] and st['role']['cid'] == 'cid-B', st
        assert st['s'] and st['s']['cid'] == 'cid-B', st
        assert not errs2, errs2
    step('U15 회의 A 입장 중 곧바로 회의 B 로 가도 B 의 실시간 로그인이 남음(늦은 A 로그인 무시)', u15)
    b.close()
    return ok, fail

def main():
    srv, base = serve()
    total_ok = total_fail = 0
    with sync_playwright() as pw:
        for label, kw in [('edge', {'channel': 'msedge'}), ('chromium', {})]:
            for size in [(1280, 800), (820, 1180), (390, 844)]:
                if os.environ.get('R2_ONLY') and os.environ['R2_ONLY'] != f'{label}:{size[0]}': continue
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
