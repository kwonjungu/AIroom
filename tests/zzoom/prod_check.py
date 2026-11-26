# -*- coding: utf-8 -*-
"""쭘 배포 뒤 운영 확인(스모크). 시험용 회의를 하나 만들어 끝까지 돌리고 반드시 지운다.
    set ZZ_CODE=<백암이 접근 코드>           (환경변수. 화면·로그에 찍지 않는다)
    python tests/zzoom/prod_check.py [기준주소=http://127.0.0.1:3000] [스크린샷 폴더]
- 엣지(channel='msedge') 1280x800 과 390 폭에서 각각 한 번씩 돈다. 브라우저는 보이지 않게(headless) 돈다.
- 만든 회의는 제목 「[시험] 자동 점검 <시각>」 으로 찾아 지운다. 다른 회의는 건드리지 않는다.
- 스크린샷은 저장소 밖(%TEMP%\\zz_prod_shots)에 둔다.
- 관리자 코드면 입장하자마자 주관자, 일반 코드면 시험이 정한 주관 코드(무작위 6자리, 출력 안 함)로 주관자가 된다.
  「발표하기」는 회의가 시작돼야 눌려서 「회의 시작」 단계가 끼어 있다.
- 종료 코드: 모두 통과 0, 하나라도 실패 1, 접근 코드 없음 2."""
import json, os, random, sys, tempfile, time, urllib.request
try: sys.stdout.reconfigure(encoding='utf-8')
except Exception: pass
from datetime import datetime
from playwright.sync_api import sync_playwright, expect, TimeoutError as PwTimeout

BASE = (sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:3000').rstrip('/')
SHOTS = sys.argv[2] if len(sys.argv) > 2 else os.path.join(tempfile.gettempdir(), 'zz_prod_shots')
CODE = os.environ.get('ZZ_CODE', '')
CONFIRM = '지금부터 화면이 전송됩니다'
STAMP = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
TITLE = f'[시험] 자동 점검 {STAMP}'
AGENDA = '[시험] 점검 안건'
CHAT = '[시험] 채팅 한 줄'
os.makedirs(SHOTS, exist_ok=True)
T = 20000  # 기본 기다림(ms)


def make_pdf(path, pages=2):
    """글자 몇 개만 있는 작은 PDF(2쪽). 쪽 넘김 확인용."""
    objs = [b'<< /Type /Catalog /Pages 2 0 R >>']
    kids = ' '.join(f'{3 + 2 * i} 0 R' for i in range(pages))
    objs.append(f'<< /Type /Pages /Kids [{kids}] /Count {pages} >>'.encode())
    font = 3 + 2 * pages
    for i in range(pages):
        objs.append(f'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 400 300] /Contents {4 + 2 * i} 0 R /Resources << /Font << /F1 {font} 0 R >> >> >>'.encode())
        s = f'BT /F1 48 Tf 40 140 Td (Page {i + 1}) Tj ET'.encode()
        objs.append(b'<< /Length %d >>\nstream\n' % len(s) + s + b'\nendstream')
    objs.append(b'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>')
    out = bytearray(b'%PDF-1.4\n')
    offs = []
    for n, o in enumerate(objs, 1):
        offs.append(len(out))
        out += b'%d 0 obj\n' % n + o + b'\nendobj\n'
    x = len(out)
    out += b'xref\n0 %d\n0000000000 65535 f \n' % (len(objs) + 1)
    for o in offs:
        out += b'%010d 00000 n \n' % o
    out += b'trailer\n<< /Size %d /Root 1 0 R >>\nstartxref\n%d\n%%%%EOF\n' % (len(objs) + 1, x)
    with open(path, 'wb') as f:
        f.write(out)


def login(device):
    req = urllib.request.Request(BASE + '/api/auth/login', data=json.dumps({'code': CODE}).encode(),
                                 headers={'Content-Type': 'application/json', 'X-Device-Id': device})
    last = None
    for _ in range(5):   # 이 PC 는 연결 일부가 끊겨 재시도
        try:
            return json.loads(urllib.request.urlopen(req, timeout=15).read())['token']
        except Exception as e:
            last = e
            time.sleep(1.5)
    raise last


class Run:
    def __init__(self, label, width, browser, pdf):
        self.title = f'{TITLE} {label}'   # 너비마다 다른 제목(같은 제목이면 다른 실행의 회의를 집는다)
        self.label, self.width, self.b, self.pdf = label, width, browser, pdf
        self.rows = []          # (단계, 결과, 메모)
        self.n = 0
        self.errors = []
        self.mid = None
        self.host_code = ''.join(random.choice('0123456789') for _ in range(6))
        self.ctx = self.pg = self.ctx2 = self.pg2 = None
        self.stop = False       # 앞 단계가 막히면 뒤 단계는 건너뜀

    def shot(self, name, pg=None):
        self.n += 1
        try:
            (pg or self.pg).screenshot(path=os.path.join(SHOTS, f'{self.label}_{self.n:02d}_{name}.png'))
        except Exception:
            pass

    def step(self, name, fn, needs_ok=True):
        if self.stop and needs_ok:
            self.rows.append((name, '건너뜀', '앞 단계 실패'))
            return
        try:
            note = fn() or ''
            self.rows.append((name, '통과', note))
            print(f'  OK   [{self.label}] {name}', flush=True)
        except Exception as e:
            msg = str(e).strip().splitlines()[0][:160] if str(e).strip() else type(e).__name__
            self.rows.append((name, '실패', msg))
            print(f'  FAIL [{self.label}] {name} -> {msg}', flush=True)
            self.stop = True
        finally:
            if self.pg and not self.pg.is_closed():
                self.shot(name.split(' ')[0][:12])

    def new_ctx(self, token):
        ctx = self.b.new_context(viewport={'width': self.width, 'height': 800 if self.width >= 1000 else 844},
                                 locale='ko-KR', accept_downloads=False)
        ctx.add_init_script("try{localStorage.setItem('airoom_auth_token', %s)}catch(e){}" % json.dumps(token))
        ctx.add_init_script("try{localStorage.setItem('zz_onboarded_v1','viewer,host')}catch(e){}")   # 첫 입장 안내는 easy_a_e2e 가 따로 본다
        pg = ctx.new_page()
        pg.set_default_timeout(T)
        pg.on('pageerror', lambda e: self.errors.append(f'pageerror: {str(e)[:120]}'))
        def _resp(r):
            if '/api/' in r.url and (r.status >= 400 or os.environ.get('ZZ_NETLOG')):
                print(f'    [net] {r.status} {r.request.method} {r.url.split("/api/")[-1][:70]}', flush=True)
        pg.on('response', _resp)
        if os.environ.get('ZZ_REQLOG'):
            import time as _t
            t0 = _t.time()
            pg.on('request', lambda q: print(f'    [req {(_t.time()-t0):6.1f}] {q.method} {q.url[:110]}', flush=True) if not q.url.startswith('data:') else None)
            pg.on('requestfinished', lambda q: print(f'    [fin {(_t.time()-t0):6.1f}] {q.method} {q.url[:110]}', flush=True) if '/api/' in q.url else None)
        pg.on('requestfailed', lambda q: print(f'    [net] 실패 {q.method} {q.url.split("/api/")[-1][:70]} {q.failure}', flush=True) if '/api/' in q.url else None)
        pg.on('console', lambda m: print(f'    [console] {m.text[:600]}', flush=True) if m.type == 'error' else None)
        return ctx, pg

    # ---- 흐름 ----
    def go(self):
        try:
            self.flow()
        finally:
            self.cleanup()

    def flow(self):
        tok = {}

        def s_login():
            tok['a'] = login('zz-prod-check-a')
            self.ctx, self.pg = self.new_ctx(tok['a'])
            self.pg.goto(BASE + '/zzoom', wait_until='domcontentloaded')
            expect(self.pg.locator('#zz-list .zl-new')).to_be_visible()
        self.step('백암이 로그인 후 /zzoom 목록', s_login)

        def s_create():
            pg = self.pg
            pg.locator('.zl-new').click()
            pg.fill('#zl-f-title', self.title)
            pg.fill('#zl-f-code', self.host_code)
            pg.locator('.zl-form button[type=submit]').click()
            pg.locator('.zl-done-back').click()   # EASY_UX: 만든 뒤 안내 창
            card = pg.locator('.zl-card', has_text=self.title)
            expect(card).to_be_visible()
            self.mid = card.get_attribute('data-mid')
            assert self.mid, '회의 id 를 못 읽음'
        self.step('회의 만들기', s_create)

        def s_enter():
            pg = self.pg
            pg.locator(f'.zl-card[data-mid="{self.mid}"] .zl-enter').click()
            go = pg.locator('#zz-join .zl-go')
            expect(go).to_be_visible()
            assert go.inner_text().strip() == '회의 들어가기'
            n_in = pg.locator('#zz-join input, #zz-join textarea').count()
            assert n_in == 0, f'이름 등 입력 칸이 {n_in}개 있음'
            assert '이름' not in pg.locator('#zz-join').inner_text().replace('이름은 저장되지 않아요', ''), '이름을 묻는 글이 있음'
            self.shot('join')
            go.click()
            expect(pg.locator('#zz-join')).to_be_hidden()
            expect(pg.locator('.zl-more')).to_have_text('메뉴')
        self.step('입장하기(이름 안 물음)', s_enter)

        def s_wait():
            expect(self.pg.locator('#zz-wait .za-title')).to_contain_text('오늘의 안건')
        self.step('대기 화면 「오늘의 안건」', s_wait)

        def s_host():
            pg = self.pg
            # 일반 코드면 주관 코드 넣기, 관리자 코드면 이미 주관자
            if not pg.locator('.zl-host-chip').count():
                pg.locator('.zl-more').click()
                pg.locator('.zl-host-btn').click()
                pg.fill('#zl-hostcode', self.host_code)
                pg.locator('.zl-form button[type=submit]').click()
            expect(pg.locator('.zl-host-chip')).to_be_attached()   # 폰 폭에서는 CSS 로 숨김(list.css:111)
            pg.locator('.zh-bar').wait_for(timeout=T)
            start = pg.locator('.zh-start')
            if not start.is_visible():
                pg.get_by_role('button', name='더 보기').click()
                start = pg.locator('.zh-more-item', has_text='회의 시작')
            start.click()
            expect(pg.locator('.zh-start')).to_be_hidden(timeout=T)   # 시작되면 주 단추가 사라진다
            expect(pg.locator('.zh-status-text')).not_to_contain_text('시작 전', timeout=T)
            if pg.locator('.zz-modal-back').count():
                pg.keyboard.press('Escape')
        self.step('주관자 확인과 회의 시작(발표하기 준비)', s_host)

        def s_agenda():
            pg = self.pg
            pg.locator('.za-add').click()
            pg.fill('#za-add-title', AGENDA)
            pg.locator('.zz-modal-actions button', has_text='추가').click()
            expect(pg.locator('.za-item', has_text=AGENDA)).to_be_visible()
        self.step('제목만 안건 추가', s_agenda)

        def s_upload():
            pg = self.pg
            item = pg.locator('.za-item', has_text=AGENDA)
            with pg.expect_file_chooser() as fc:
                item.locator('.za-upload').click()
            fc.value.set_files(self.pdf)
            expect(pg.locator('.za-up .za-muted').first).to_contain_text('2쪽', timeout=60000)
            pg.locator('.za-up-actions button', has_text='이대로 올리기').click()
            expect(item.locator('.za-meta')).to_contain_text('2쪽', timeout=60000)
        self.step('PDF 올리기와 쪽 수(2쪽) 표시', s_upload)

        def s_present():
            pg = self.pg
            item = pg.locator('.za-item', has_text=AGENDA)
            item.locator('.za-present').click()
            body = pg.locator('.zz-modal .za-confirm')
            expect(body).to_be_visible()
            assert body.inner_text().strip() == CONFIRM, f'확인 창 본문이 다름: {body.inner_text().strip()[:40]}'
            before = pg.locator('.za-chip-live').count()
            pg.locator('.zz-modal-actions button', has_text='아니오').click()
            expect(pg.locator('.zz-modal')).to_have_count(0)
            assert pg.locator('.za-chip-live').count() == before, '아니오인데 발표 상태가 바뀜'
            self.shot('present_no')
            item.locator('.za-present').click()
            pg.locator('.zz-modal-actions button', has_text='예').click()
            expect(pg.locator('.zv-band.is-presenting')).to_be_visible(timeout=T)   # EASY_UX 「내가 발표 중이에요」 띠
            expect(pg.locator('.zv-pageno')).to_have_text('1 / 2')
        self.step('발표하기: 확인 창 문구, 아니오 무변화, 예 발표 중', s_present)

        def s_follow():
            tok['b'] = login('zz-prod-check-b')
            self.ctx2, self.pg2 = self.new_ctx(tok['b'])
            p2 = self.pg2
            p2.goto(f'{BASE}/zzoom#/m/{self.mid}', wait_until='domcontentloaded')
            p2.locator('#zz-join .zl-go').click()
            expect(p2.locator('#zz-join')).to_be_hidden()
            expect(p2.locator('.zv-pageno')).to_have_text('1 / 2', timeout=T)
            self.shot('b_joined', p2)
            self.pg.locator('button[aria-label="다음 쪽"]').click()
            expect(self.pg.locator('.zv-pageno')).to_have_text('2 / 2')
            expect(p2.locator('.zv-pageno')).to_have_text('2 / 2', timeout=T)
            self.shot('b_followed', p2)
        self.step('다른 기기로 입장해 발표자 쪽 넘김 따라가기', s_follow)

        def open_chat(pg):
            if pg.locator('#zz-side-toggle').is_visible() and pg.locator('body.side-closed').count():
                pg.locator('#zz-side-toggle').click()
            pg.locator('#zz-tab-chat').click()
            expect(pg.locator('#zz-side-chat textarea')).to_be_visible()

        def s_chat():
            open_chat(self.pg)
            self.pg.fill('#zz-side-chat textarea', CHAT)
            self.pg.locator('#zz-side-chat button[type=submit]').click()
            open_chat(self.pg2)
            msg2 = self.pg2.locator('#zz-side-chat .zs-msg', has_text=CHAT)
            expect(msg2).to_be_visible(timeout=T)
            assert msg2.locator('.zs-name').count() == 0, '남이 본 글에 이름 칸이 있음'
            mine = self.pg.locator('#zz-side-chat .zs-msg', has_text=CHAT)
            expect(mine).to_be_visible()
            names = [t.strip() for t in mine.locator('.zs-name').all_inner_texts()]
            assert names in ([], ['나']), f'내 글의 이름 표시가 이상함: {names}'
            self.shot('b_chat', self.pg2)
        self.step('채팅 1건에 이름이 안 보임', s_chat)

        # 정리는 cleanup() (finally)

    def cleanup(self):
        def s_del():
            pg = self.pg
            if self.mid is None:
                return '만든 회의가 없어 지울 것 없음'
            if not pg or pg.is_closed():
                raise RuntimeError('화면이 없어 지우지 못함')
            if self.pg2 and not self.pg2.is_closed():
                self.ctx2.close()
            pg.goto(f'{BASE}/zzoom#/', wait_until='domcontentloaded')
            pg.reload()
            expect(pg.locator('#zz-list .zl-new')).to_be_visible()
            # 회의 id 를 못 얻은 경우에도 제목이 정확히 같은 시험 회의만 찾는다
            card = pg.locator(f'.zl-card[data-mid="{self.mid}"]') if self.mid else pg.locator('.zl-card', has=pg.locator('.zl-card-title', has_text=self.title))
            try: card.first.wait_for(timeout=15000)
            except Exception: pass
            if card.count() == 0:
                if self.mid is None:
                    return '만든 회의가 없어 지울 것 없음'
                raise AssertionError('만든 회의가 목록에 없음')
            mid = self.mid or card.get_attribute('data-mid')
            card.locator('.zl-del').click()
            pg.locator('.zz-modal-actions button, .zl-form-actions button', has_text='회의 지우기').click()
            deadline = time.time() + 45
            while time.time() < deadline:
                pg.wait_for_timeout(2500)
                pg.reload()
                try: expect(pg.locator('#zz-list .zl-new')).to_be_visible(timeout=15000)
                except Exception: continue
                if pg.locator(f'.zl-card[data-mid="{mid}"]').count() == 0:
                    return '목록에서 사라짐'
            raise AssertionError('45초 안에 목록에서 사라지지 않음')
        self.stop = False
        self.step('정리: 만든 회의 삭제 후 목록에서 사라짐', s_del, needs_ok=False)
        for c in (self.ctx, self.ctx2):
            try:
                if c: c.close()
            except Exception:
                pass


def main():
    if not CODE:
        print('환경변수 ZZ_CODE(접근 코드)가 없습니다.')
        return 2
    pdf = os.path.join(tempfile.gettempdir(), 'zz_prod_check.pdf')
    make_pdf(pdf)
    allrows, bad = [], 0
    with sync_playwright() as pw:
        b = pw.chromium.launch(channel='msedge', headless=True)
        print(f'기준 주소 {BASE}, 브라우저 {b.version}, 시험 제목 {TITLE}', flush=True)
        for label, width in [x for x in (('pc1280', 1280), ('m390', 390)) if x[0] in os.environ.get('ZZ_ONLY', 'pc1280,m390')]:
            r = Run(label, width, b, pdf)
            print(f'[{label}] 시작', flush=True)
            r.go()
            allrows.append((label, r))
            bad += sum(1 for x in r.rows if x[1] == '실패')
        b.close()
    print('\n=== 단계별 통과표 ===')
    for label, r in allrows:
        print(f'[{label}]')
        for name, res, note in r.rows:
            print(f'  {res:<4} {name}' + (f'  ({note})' if note else ''))
        if r.errors:
            print(f'  페이지 오류 {len(r.errors)}건: {r.errors[:3]}')
    print(f'\n스크린샷: {SHOTS}')
    print('결과:', '모두 통과' if not bad else f'실패 {bad}건')
    return 1 if bad else 0


if __name__ == '__main__':
    sys.exit(main())
