# -*- coding: utf-8 -*-
"""디자인 5팀(주관자·업로드·녹음·md) 화면 시험. 서버·Firebase 없이 돈다.
    python tests/zzoom/d5_e2e.py [스크린샷 폴더] [--real]
- public/ 를 이 스크립트 안의 정적 서버로 띄우고, 진짜 index.html·app.js 로 조립한다.
- /zzoom/api.js 는 tests/zzoom/d5_fake_api.js 로 바꿔 끼운다.
- 다른 팀 모듈은 빈 모듈로 바꿔 끼운다(--real 이면 진짜 파일로 조립만 보고 콘솔 오류 수를 알린다).
- 엣지(channel='msedge')와 크로미움, 창 1280x800·820x1180 네 가지로 돈다. 마이크는 가짜 장치.
- 그림 변환은 진짜 변환기(/zzoom/convert/)로 PNG 하나를 바꿔 본다."""
import os, sys, json, struct, zlib, threading, tempfile, functools, mimetypes, time
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from playwright.sync_api import sync_playwright, expect

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
PUBLIC = os.path.join(ROOT, 'public')
FAKE = open(os.path.join(os.path.dirname(__file__), 'd5_fake_api.js'), encoding='utf-8').read()
args = [a for a in sys.argv[1:] if not a.startswith('--')]
REAL = '--real' in sys.argv
SHOTS = args[0] if args else os.path.join(tempfile.gettempdir(), 'zzoom-d5-shots')
os.makedirs(SHOTS, exist_ok=True)
MINE = {'host', 'upload', 'record'}
OTHERS = ['list', 'join', 'viewer', 'draw', 'board', 'chat', 'hands', 'poll']
MID = 'mabcdefghij12'

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

FILES = tempfile.mkdtemp(prefix='zzoom-d5-files-')
def fpath(name, data):
    p = os.path.join(FILES, name)
    with open(p, 'wb') as f: f.write(data)
    return p
P_PNG = fpath('운영 계획 표.png', png(400, 300))
P_SLOW = fpath('slow-문서.pdf', b'%PDF-1.4 fake')
P_BROKEN = fpath('broken.pdf', b'%PDF-1.4 fake')
P_PPT = fpath('옛날발표.ppt', b'fake')

def stub(name):
    return "export function mount(ctx){ return { unmount(){} }; }"

def calls(pg, name):
    return pg.evaluate("n => window.__fake.calls.filter(c => c.name === n).map(c => c.args)", name)

def run(pw, label, launch_kw, base, size):
    ok, fail, errors = [], [], []
    w, h = size
    tag = f'{label}_{w}'
    def step(name, fn):
        try: fn(); ok.append(name); print(f'  OK   [{tag}] {name}', flush=True)
        except Exception as e: fail.append(name); print(f'  FAIL [{tag}] {name} -> {str(e)[:500]}', flush=True)
    b = pw.chromium.launch(args=['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'], **launch_kw)
    print(f'[{tag}] 브라우저 {b.version}', flush=True)

    def new_page(role='host', status='ready', rec='0'):
        ctx = b.new_context(viewport={'width': w, 'height': h}, locale='ko-KR', accept_downloads=True)
        try: ctx.grant_permissions(['microphone'])
        except Exception: pass
        ctx.add_init_script("try{localStorage.setItem('airoom_auth_token','fake-token')}catch(e){}")
        ctx.route('**/zzoom/api.js*', lambda r: r.fulfill(status=200, content_type='text/javascript; charset=utf-8', body=FAKE))
        if not REAL:
            def other(route):
                name = route.request.url.split('/zzoom/')[-1].split('?')[0][:-3]
                if name in OTHERS: route.fulfill(status=200, content_type='text/javascript; charset=utf-8', body=stub(name))
                else: route.fallback()
            ctx.route(lambda u: '/zzoom/' in u and u.split('?')[0].endswith('.js') and '/convert/' not in u and '/vendor/' not in u, other)
        pg = ctx.new_page()
        pg.on('console', lambda m: errors.append(f'console: {m.text}') if m.type == 'error' else None)
        pg.on('pageerror', lambda e: errors.append(f'pageerror: {e}'))
        pg.goto(f'{base}/zzoom/index.html?role={role}&status={status}&rec={rec}#/m/{MID}')
        return ctx, pg

    def shot(pg, name):
        pg.wait_for_timeout(250)
        pg.screenshot(path=os.path.join(SHOTS, f'{tag}_{name}.png'))

    ctx, pg = new_page()
    btn = lambda text: pg.locator(f'#zz-hostbar-main button[aria-label^="{text}"], #zz-hostbar-main button:not([aria-label]):has-text("{text}")')
    modal = lambda: pg.locator('#zz-modal-root .zz-modal')
    narrow = w < 1024
    def tool(text):
        # 1024px 미만은 「더 보기」 창 안에서 누른다
        if narrow:
            btn('더 보기').click()
            modal().locator('.zh-more-item', has_text=text).click()
        else:
            btn(text).click()
    def fits():
        # 5팀 자리의 보이는 단추가 화면 밖으로 잘리지 않는지
        out = pg.evaluate("""() => [...document.querySelectorAll('#zz-hostbar-main button, #zz-hostbar-upload button, #zz-hostbar-record button, #zz-hostbar-record .zh-rec-time')]
            .filter(b => b.offsetParent).map(b => [b.getAttribute('aria-label') || b.textContent.trim(), Math.round(b.getBoundingClientRect().right)])
            .filter(x => x[1] > innerWidth)""")
        assert not out, f'화면 밖으로 잘린 단추 {out}'

    def ready_bar():
        expect(btn('회의 시작')).to_be_visible(timeout=8000)
        expect(pg.locator('#zz-hostbar-upload button', has_text='안건 올리기')).to_be_visible()
        expect(pg.locator('#zz-hostbar-record button', has_text='녹음 시작')).to_be_disabled()
        expect(btn('접속자 3명')).to_be_attached()   # 접속 중 2 + 연결 확인 중 1
        if narrow: expect(btn('더 보기')).to_be_visible()
        else: expect(btn('접속자 3명')).to_be_visible()
        fits()
        expect(btn('회의 끝내기')).to_be_hidden()
        assert pg.locator('link[href="/zzoom/host.css"]').count() == 1, 'host.css 가 한 번만 붙어야 함'
        # 44px 터치
        small = pg.evaluate("""[...document.querySelectorAll('#zz-hostbar button')].filter(b=>b.offsetParent).map(b=>b.getBoundingClientRect()).filter(r=>r.height<44||r.width<44).length""")
        assert small == 0, f'44px 보다 작은 단추 {small}개'
        shot(pg, '01_ready')
    step('시작 전 막대(회의 시작·안건 올리기·녹음 막힘·접속자 수·44px)', ready_bar)

    def start():
        btn('회의 시작').click()
        expect(btn('회의 끝내기')).to_be_visible()
        assert calls(pg, 'setState')[-1][0] == 'start', calls(pg, 'setState')
        expect(btn('모두 내 화면으로')).to_be_visible()
        expect(pg.locator('.zh-status')).to_have_text('내가 진행 중')
        pg.evaluate("() => { window.__forced = 0; window.__fake.store.on('cmd:force', () => { window.__forced++; }); }")
        btn('모두 내 화면으로').click()
        assert pg.evaluate('window.__forced') == 1, pg.evaluate('window.__forced')
        expect(pg.locator('#zz-hostbar-record button', has_text='녹음 시작')).to_be_enabled()
        fits()
        shot(pg, '01b_live')
    step('회의 시작 → 끝내기·모두 내 화면으로(cmd:force)', start)

    def take():
        pg.evaluate("window.__fake.setMeeting({presenter:{cid:'c9',name:'최교감',epoch:5}})")
        expect(pg.locator('.zh-status')).to_have_text('최교감 님이 진행 중')
        expect(btn('모두 내 화면으로')).to_be_hidden()
        btn('진행 넘겨받기').click()
        expect(btn('진행 넘겨받기')).to_be_hidden()
        assert len(calls(pg, 'takePresenter')) == 1
        expect(btn('모두 내 화면으로')).to_be_visible()
    step('다른 진행자 → 진행 넘겨받기', take)

    def lock():
        tool('판서 잠금')
        expect(btn('판서 잠금 풀기')).to_have_attribute('aria-pressed', 'true')
        assert calls(pg, 'setState')[-1] == ['penLock', True]
        if narrow:
            btn('더 보기').click()
            expect(modal().locator('.zh-more-item', has_text='판서 잠금 풀기')).to_have_attribute('aria-pressed', 'true')
            shot(pg, '02a_more')
            modal().locator('.zh-more-item', has_text='판서 잠금 풀기').click()
        else:
            btn('판서 잠금 풀기').click()
        expect(btn('판서 잠금')).to_have_attribute('aria-pressed', 'false')
        assert calls(pg, 'setState')[-1] == ['penLock', False]
    step('판서 잠금 켜고 끄기', lock)

    def people():
        tool('접속자')
        expect(modal()).to_contain_text('연결 확인 중')
        expect(modal().locator('.zh-person')).to_have_count(4)
        states = modal().locator('.zh-person-state').all_inner_texts()
        assert states == ['접속 중', '접속 중', '연결 확인 중', '나감'], states
        shot(pg, '02_people')
        modal().locator('button', has_text='닫기').click()
        expect(modal()).to_have_count(0)
    step('접속자 창(접속 중·연결 확인 중·나감)', people)

    def export():
        tool('AI용 기록 받기')
        expect(pg.locator('#zz-toast')).to_contain_text('AI용 기록 파일을 받았어요')
        assert len(calls(pg, 'exportMd')) == 1
    step('AI용 기록 받기(exportMd)', export)

    def agenda():
        tool('안건 관리')
        items = modal().locator('.zh-agenda-item')
        expect(items).to_have_count(2)
        # 진행 중 안건(첫째)은 지우기 막힘
        expect(items.nth(0).locator('button', has_text='지우기')).to_be_disabled()
        shot(pg, '03_agenda')
        inp = items.nth(1).locator('input')
        inp.fill('학교 행사 일정(수정)'); inp.press('Enter')
        pg.wait_for_function("window.__fake.calls.some(c=>c.name==='updateAgenda'&&c.args[1].title)")
        assert calls(pg, 'updateAgenda')[-1] == ['bbbbbbb2', {'title': '학교 행사 일정(수정)'}], calls(pg, 'updateAgenda')
        items.nth(0).locator('button', has_text='아래로').click()
        pg.wait_for_function("window.__fake.calls.some(c=>c.name==='updateAgenda'&&c.args[1].index===1)")
        expect(items.nth(0).locator('input')).to_have_value('학교 행사 일정(수정)')
        # 지우기는 두 번 눌러야
        d = items.nth(0).locator('button', has_text='지우기')
        d.click()
        expect(items.nth(0).locator('button', has_text='정말 지우기')).to_be_visible()
        assert len(calls(pg, 'deleteAgenda')) == 0, '한 번 눌렀는데 지움'
        items.nth(0).locator('button', has_text='정말 지우기').click()
        expect(items).to_have_count(1)
        assert calls(pg, 'deleteAgenda') == [['bbbbbbb2']], calls(pg, 'deleteAgenda')
        # 원본 받기
        with pg.expect_download() as dl:
            items.nth(0).locator('button', has_text='원본 받기').click()
        assert dl.value.suggested_filename == '교육과정.pdf', dl.value.suggested_filename
        # 보기 → cmd:nav, 창 닫힘
        pg.evaluate("() => { window.__nav = null; window.__fake.store.on('cmd:nav', d => { window.__nav = d; }); }")
        items.nth(0).locator('button', has_text='보기').click()
        assert pg.evaluate('window.__nav') == {'aid': 'aaaaaaa1', 'page': 1}, pg.evaluate('window.__nav')
        expect(modal()).to_have_count(0)
    step('안건 관리(이름·순서·두 번 눌러 지우기·원본 받기·보기)', agenda)

    upload_input = pg.locator('#zz-hostbar-upload input[type=file]')
    def upload_png():
        n0 = pg.evaluate('window.__fake.agenda.length')
        pg.evaluate("window.__fake.uploadDelay=120")
        upload_input.set_input_files(P_PNG)
        expect(modal()).to_contain_text('이대로 올리기', timeout=30000)
        expect(modal().locator('.zh-thumb img')).to_have_count(1)
        expect(modal().locator('#zh-up-title')).to_have_value('운영 계획 표')
        assert pg.evaluate("document.querySelector('.zh-thumb img').naturalWidth") > 0, '썸네일이 안 그려짐'
        shot(pg, '04_upload_preview')
        modal().locator('#zh-up-title').fill('운영 계획 그림')
        modal().locator('button', has_text='이대로 올리기').click()
        expect(modal().locator('.zh-progress-text')).to_contain_text('올리는 중')
        shot(pg, '05_upload_progress')
        expect(pg.locator('#zz-toast')).to_contain_text('「운영 계획 그림」 안건을 올렸어요', timeout=15000)
        expect(modal()).to_have_count(0)
        up = calls(pg, 'uploadAgenda')[-1][0]
        assert up['title'] == '운영 계획 그림' and up['pages'] == 1 and up['types'] == ['image/webp'], up
        assert pg.evaluate('window.__fake.agenda.length') == n0 + 1
        expect(pg.locator('#zz-hostbar-upload button')).to_be_enabled()
    step('PNG 진짜 변환 → 미리보기 → 이대로 올리기 → 진행 → 완료', upload_png)

    def upload_cancel():
        upload_input.set_input_files(P_SLOW)
        expect(modal().locator('.zh-progress-text')).to_contain_text('쪽 그림으로 바꾸는 중', timeout=5000)
        shot(pg, '06_convert_progress')
        expect(pg.locator('#zz-hostbar-upload button')).to_be_disabled()
        modal().locator('button', has_text='취소').click()
        expect(modal()).to_have_count(0)
        pg.wait_for_function('window.__fake.aborted === 1', timeout=3000)
        expect(pg.locator('#zz-hostbar-upload button')).to_be_enabled()
        # 업로드 중 취소
        pg.evaluate("window.__fake.uploadDelay=400")
        upload_input.set_input_files(P_PNG)
        modal().locator('button', has_text='이대로 올리기').click(timeout=30000)
        expect(modal().locator('.zh-progress-text')).to_contain_text('올리는 중')
        n = pg.evaluate('window.__fake.agenda.length')
        modal().locator('button', has_text='취소').click()
        expect(modal()).to_have_count(0)
        pg.wait_for_timeout(1500)
        assert pg.evaluate('window.__fake.agenda.length') == n, '취소했는데 안건이 생김'
    step('변환 중 취소·업로드 중 취소(signal)', upload_cancel)

    def upload_errors():
        upload_input.set_input_files(P_BROKEN)
        expect(modal().locator('.zh-error')).to_contain_text('PDF 파일을 읽지 못했어요')
        shot(pg, '07_convert_error')
        modal().locator('button', has_text='닫기').click()
        expect(modal()).to_have_count(0)
        # 업로드 실패 → 다시 올리기
        pg.evaluate("window.__fake.uploadDelay=20; window.__fake.uploadFail=true")
        upload_input.set_input_files(P_PNG)
        modal().locator('button', has_text='이대로 올리기').click(timeout=30000)
        expect(modal().locator('.zh-error')).to_contain_text('쪽 그림을 올리지 못했어요')
        pg.evaluate("window.__fake.uploadFail=false")
        modal().locator('button', has_text='다시 올리기').click()
        modal().locator('button', has_text='이대로 올리기').click()
        expect(modal()).to_have_count(0, timeout=15000)
        expect(pg.locator('#zz-toast')).to_contain_text('「운영 계획 표」 안건을 올렸어요')
        # .ppt 는 창 없이 안내
        upload_input.set_input_files(P_PPT)
        expect(pg.locator('#zz-toast')).to_contain_text('PPTX 나 PDF 로 저장해')
        expect(modal()).to_have_count(0)
    step('변환 오류 문구·업로드 실패 뒤 다시 올리기·.ppt 안내', upload_errors)

    def record():
        pg.evaluate("""async () => { const m = await import('/zzoom/record.js'); m.config.chunkMs = 2000; m.config.retryDelays.splice(0, 3, 300, 300, 300); }""")
        pg.evaluate("window.__fake.store.set('side',{open:true,tab:'log'})")
        expect(pg.locator('#zz-side-log')).to_contain_text('아직 대화 기록이 없어요')
        pg.locator('#zz-hostbar-record button', has_text='녹음 시작').click()
        expect(modal()).to_contain_text('참석자에게 녹음을 알렸나요?')
        expect(modal()).to_contain_text('Groq')
        shot(pg, '08_record_notice')
        modal().locator('button', has_text='알렸어요, 녹음 시작').click()
        expect(pg.locator('#zz-hostbar-record button', has_text='녹음 멈추기')).to_be_visible(timeout=8000)
        assert calls(pg, 'setState')[-1] == ['recording', True]
        expect(pg.locator('.zh-rec-banner')).to_be_visible()
        expect(pg.locator('.zh-rec-time')).to_contain_text('●')
        # 첫 조각
        expect(pg.locator('.zh-log-item')).to_have_count(1, timeout=10000)
        t = calls(pg, 'transcribe')[0][0]
        assert t['size'] > 0 and t['type'] in ('audio/webm', 'audio/ogg', 'audio/mp4') and t['n'] == 0 and t['aid'], t
        expect(pg.locator('.zh-log-item').first).to_contain_text('안건1 1쪽')
        # 연결 오류 2번 → 대기열에서 다시 보내 성공
        pg.evaluate('window.__fake.transcribeFail = 2')
        expect(pg.locator('.zh-log-item')).to_have_count(2, timeout=12000)
        assert len([c for c in calls(pg, 'transcribe') if c[0]['n'] == 1]) == 3
        # 고칠 수 없는 오류 → 실패 표시와 다시 보내기
        pg.evaluate('window.__fake.transcribeFatal = true')
        expect(pg.locator('.zh-q.is-failed')).to_contain_text('3번째 1분 기록 실패', timeout=12000)
        shot(pg, '09_record_log')
        pg.evaluate('window.__fake.transcribeFatal = false')
        pg.locator('.zh-q.is-failed button', has_text='다시 보내기').first.click()
        expect(pg.locator('.zh-log-item')).to_have_count(3, timeout=8000)
        # 멈추기
        pg.locator('#zz-hostbar-record button', has_text='녹음 멈추기').click()
        expect(pg.locator('#zz-hostbar-record button', has_text='녹음 시작')).to_be_visible()
        assert calls(pg, 'setState')[-1] == ['recording', False]
        expect(pg.locator('.zh-rec-banner')).to_be_hidden()
        # 기록 위치 누르면 그 쪽으로
        pg.evaluate("() => { window.__nav = null; window.__fake.store.on('cmd:nav', d => { window.__nav = d; }); }")
        pg.locator('.zh-log-place').first.click()
        assert pg.evaluate('window.__nav') == {'aid': 'aaaaaaa1', 'page': 1}
    step('녹음(고지 확인·1분 조각·재시도 대기열·실패 다시 보내기·멈추기)', record)

    def badge():
        pg.evaluate("window.__fake.store.set('side',{open:true,tab:'chat'})")
        pg.evaluate("window.__fake.transcript.push({id:'t50',n:50,at:Date.now(),aid:'aaaaaaa1',page:2,text:'새 기록'}); window.__fake.push('transcript')")
        assert pg.evaluate("window.__fake.store.get('badges').log") == 1
        pg.evaluate("window.__fake.store.set('side',{open:true,tab:'log'})")
        assert pg.evaluate("window.__fake.store.get('badges').log") == 0
    step('안 읽은 기록 배지(badges.log)', badge)

    def end():
        btn('회의 끝내기').click()
        expect(modal()).to_contain_text('끝내면 다시 열 수 없어요')
        modal().locator('button', has_text='회의 끝내기').click()
        expect(pg.locator('.zh-status')).to_have_text('회의가 끝났어요')
        assert calls(pg, 'setState')[-1][0] == 'end', calls(pg, 'setState')
        expect(btn('회의 끝내기')).to_be_hidden()
        expect(btn('판서 잠금')).to_be_hidden()
        expect(pg.locator('#zz-hostbar-upload button')).to_be_disabled()
        expect(pg.locator('#zz-hostbar-record button')).to_be_disabled()
        shot(pg, '10_ended')
    step('회의 끝내기(확인 창) → 끝난 회의 막대', end)
    ctx.close()

    def viewer():
        c2, p2 = new_page(role='viewer', status='live', rec='1')
        expect(p2.locator('.zh-rec-banner')).to_be_attached(timeout=8000)
        p2.evaluate("window.__fake.store.set('side',{open:true,tab:'log'})")
        expect(p2.locator('.zh-rec-banner')).to_be_visible()
        expect(p2.locator('.zh-rec-banner')).to_contain_text('학생 개인정보는 말하지 마세요')
        assert p2.locator('#zz-hostbar-main').inner_html() == '', '참석자에게 주관자 막대가 붙음'
        assert p2.locator('#zz-hostbar-record').inner_html() == '', '참석자에게 녹음 단추가 붙음'
        p2.evaluate("window.__fake.setMeeting({recording:false})")
        expect(p2.locator('.zh-rec-banner')).to_be_hidden()
        shot(p2, '11_viewer_log')
        c2.close()
    step('참석자: 녹음 중 안내만, 주관자 막대·녹음 단추 없음', viewer)

    real_err = [e for e in errors if 'favicon' not in e]
    if REAL:
        print(f'  [{tag}] 진짜 모듈 조립 콘솔 오류 {len(real_err)}개', flush=True)
        for e in real_err[:10]: print('     ', e[:300], flush=True)
    else:
        step('콘솔·페이지 오류 0', lambda: (_ for _ in ()).throw(AssertionError('\n'.join(real_err[:8]))) if real_err else None)
    b.close()
    return ok, fail

def main():
    srv, base = serve()
    total_ok = total_fail = 0
    with sync_playwright() as pw:
        for label, kw in [('edge', {'channel': 'msedge'}), ('chromium', {})]:
            for size in [(1280, 800), (820, 1180)] + ([(390, 844)] if label == 'chromium' else []):
                if os.environ.get('D5_ONLY') and os.environ['D5_ONLY'] != f'{label}:{size[0]}': continue
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
