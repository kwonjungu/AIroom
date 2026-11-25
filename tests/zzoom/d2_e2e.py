# -*- coding: utf-8 -*-
"""D2 보기·따라가기 화면 시험. 사용: python tests/zzoom/d2_e2e.py [스크린샷 폴더]
진짜 index.html(app.js 대신 tests/zzoom/d2_harness.js)·zzoom.css·viewer.js·board.js 를 작은 서버로 서빙한다(서버·Firebase 없음).
엣지(channel='msedge')와 크로미움 둘 다, 창 1280x800 과 820x1180 두 가지. 콘솔 오류 0 이어야 통과."""
import sys, os, re, threading, http.server, socketserver, time, json
from playwright.sync_api import sync_playwright

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SHOT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.environ.get('TEMP', '.'), 'd2shots')
os.makedirs(SHOT, exist_ok=True)

with open(os.path.join(ROOT, 'public', 'zzoom', 'index.html'), encoding='utf-8') as f:
    HTML = f.read()
HTML = HTML.replace('<script type="module" src="/zzoom/app.js"></script>',
                    '<link rel="stylesheet" href="/zzoom/viewer.css">\n<script type="module" src="/d2_harness.js"></script>')
assert 'd2_harness' in HTML, 'index.html 의 app.js 줄을 못 찾음'


class H(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        p = self.path.split('?')[0]
        if p == '/d2':
            body = HTML.encode('utf-8')
            self.send_response(200); self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.send_header('Content-Length', str(len(body))); self.end_headers(); self.wfile.write(body); return
        return super().do_GET()

    def translate_path(self, path):
        path = path.split('?')[0]
        if path == '/d2_harness.js':
            return os.path.join(ROOT, 'tests', 'zzoom', 'd2_harness.js')
        return os.path.join(ROOT, 'public', path.lstrip('/').replace('/', os.sep))

    def guess_type(self, path):
        if str(path).endswith(('.js', '.mjs')): return 'text/javascript'
        return super().guess_type(path)

    def log_message(self, *a): pass

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()


srv = socketserver.ThreadingTCPServer(('127.0.0.1', 0), H)
srv.daemon_threads = True
PORT = srv.server_address[1]
threading.Thread(target=srv.serve_forever, daemon=True).start()
URL = f'http://127.0.0.1:{PORT}/d2'

PAGE_PIX = """([x, y]) => { const v = window.__d2.store.get('viewport'); if (!v) return null;
  const c = document.getElementById('zz-layer-bg');
  const sx = (v.ox + x * v.pageW * v.scale) * v.dpr, sy = (v.oy + y * v.pageH * v.scale) * v.dpr;
  const d = c.getContext('2d').getImageData(Math.round(sx), Math.round(sy), 1, 1).data; return [d[0], d[1], d[2]]; }"""


def close(a, b, tol=30):
    return a is not None and all(abs(x - y) <= tol for x, y in zip(a, b))


def run(pw, label, launch_kw, size):
    ok, fail, errors = [], [], []
    b = pw.chromium.launch(**launch_kw)
    tag = f'{label} {size[0]}x{size[1]}'
    print(f'[{tag}] 브라우저 {b.version}', flush=True)

    def step(name, fn):
        try:
            fn(); ok.append(name); print(f'  OK   [{tag}] {name}', flush=True)
        except Exception as e:
            fail.append(name); print(f'  FAIL [{tag}] {name} -> {str(e)[:500]}', flush=True)

    def page(opts=None, touch=False):
        ctx = b.new_context(viewport={'width': size[0], 'height': size[1]}, locale='ko-KR', has_touch=touch)
        pg = ctx.new_page()
        pg.on('console', lambda m: errors.append(f'console: {m.text}') if m.type == 'error' else None)
        pg.on('pageerror', lambda e: errors.append(f'pageerror: {e}'))
        pg.goto(URL)
        pg.wait_for_function('window.__d2ready === true')
        pg.evaluate('o => window.__d2.mount(o)', opts or {})
        pg.wait_for_function("() => { const v = window.__d2.store.get('viewport'); return v && v.stageW > 0; }")
        return ctx, pg

    S = lambda pg, k: pg.evaluate('k => window.__d2.store.get(k)', k)
    pk = lambda pg: (S(pg, 'page') or {}).get('pageKey')
    pix = lambda pg, x=0.5, y=0.6: pg.evaluate(PAGE_PIX, [x, y])
    color = lambda pg, aid, p: pg.evaluate('([a,p]) => window.__d2.hex(window.__d2.pageColor(a,p))', [aid, p])

    def wait_color(pg, aid, p, ms=4000):
        want = color(pg, aid, p); t0 = time.time()
        while time.time() - t0 < ms / 1000:
            if close(pix(pg), want): return
            pg.wait_for_timeout(50)
        raise AssertionError(f'{aid}:{p} 색 {want} 아님, 실제 {pix(pg)}')

    def open_agenda(pg):
        # 진짜 app.js 처럼: 1024 미만이면 안건 목록은 덮개(처음 닫힘). 768~1023 은 「안건 목록」 단추, 그보다 좁으면 덮개 열기 단추(.zv-list-btn)
        if size[0] >= 1024: return
        if pg.locator('#zz-agenda[data-open]').count(): return
        if size[0] >= 768: pg.locator('#zz-agenda-toggle').click()
        else: pg.locator('.zv-list-btn').click()
        pg.wait_for_timeout(300)

    def stage_box(pg):
        return pg.locator('#zz-stage').bounding_box()

    # ---------- 1. 처음 붙기·그리기·viewport ----------
    ctx, pg = page()
    def t_mount():
        wait_color(pg, 'a1', 1)
        v = S(pg, 'viewport')
        dims = pg.evaluate("() => { const s = document.getElementById('zz-stage'); return ['zz-layer-bg','zz-layer-ink','zz-layer-temp'].map(id => { const c = document.getElementById(id); return [c.width, c.height]; }).concat([[s.clientWidth, s.clientHeight, devicePixelRatio]]); }")
        sw, sh, dpr = dims[3]
        for w, h in dims[:3]:
            assert w == round(sw * dpr) and h == round(sh * dpr), f'canvas 크기 {dims}'
        assert abs(v['ox'] + 0.5 * v['pageW'] * v['scale'] - v['stageW'] / 2) < 0.01, v
        assert v['pageKey'] == 'a1_1' and v['pageW'] == 1000 and v['pageH'] == 1414, v
        assert pk(pg) == 'a1_1'
        assert pg.locator('.zv-agenda-item').count() == 3
        assert pg.locator('.zv-thumb').count() == 5
        assert pg.locator('#mark-board').count() == 1 and pg.locator('#mark-hand').count() == 1, '다른 팀 자리가 지워짐'
        assert pg.locator('.zv-pageno').inner_text().strip() == '1 / 5'
        assert S(pg, 'follow') == 'follow'
    step('붙기·첫 쪽 그림·canvas 크기·viewport 식', t_mount)

    def t_prefetch():
        pg.wait_for_timeout(300)
        full = [x for x in pg.evaluate('window.__d2.log.img') if not x.endswith(':t')]
        assert sorted(set(full)) == ['a1:1', 'a1:2'], f'지금·다음 쪽만 받아야 함: {full}'
    step('현재·다음 쪽만 미리 받기', t_prefetch)
    pg.wait_for_timeout(400)
    pg.screenshot(path=os.path.join(SHOT, f'{label}_{size[0]}_1_follow.png'))

    # ---------- 2. 따라가기·자유 보기·띠 ----------
    def t_follow():
        pg.evaluate("() => window.__d2.store.set('live', {aid:'a1', page:3, view:{cx:.5,cy:.5,z:1}, rev:2, epoch:1, forceSeq:2})")
        pg.wait_for_function("() => window.__d2.store.get('page')?.pageKey === 'a1_3'")
        wait_color(pg, 'a1', 3)
        full = [x for x in pg.evaluate('window.__d2.log.img') if not x.endswith(':t')]
        assert 'a1:4' in full and 'a1:5' not in full, full
    step('진행자 쪽으로 따라감', t_follow)

    def t_free():
        bx = stage_box(pg)
        pg.mouse.move(bx['x'] + bx['width'] / 2, bx['y'] + bx['height'] / 2)
        pg.mouse.wheel(0, -400)
        pg.wait_for_function("() => window.__d2.store.get('follow') === 'free'")
        z = S(pg, 'page')
        pg.wait_for_timeout(350)
        assert S(pg, 'page')['view']['z'] > 1.2, S(pg, 'page')
        bar = pg.locator('.zv-follow-btn')
        band = pg.locator('.zv-band')
        assert bar.is_visible() and bar.inner_text().strip() == '발표 화면으로 돌아가기', bar.inner_text()
        assert band.get_attribute('data-state') == 'free' and '1번 안건 3쪽' in band.inner_text(), band.inner_text()
        pg.evaluate("() => window.__d2.store.set('live', {aid:'a1', page:4, view:{cx:.5,cy:.5,z:1}, rev:3, epoch:1, forceSeq:2})")
        pg.wait_for_timeout(200)
        assert pk(pg) == 'a1_3', '자유 보기 중에는 그대로'
        assert '1번 안건 4쪽' in band.inner_text(), band.inner_text()
    step('휠 확대 → 자유 보기 + 띠, live 와서도 그대로', t_free)
    pg.screenshot(path=os.path.join(SHOT, f'{label}_{size[0]}_2_free.png'))

    def t_back():
        pg.locator('.zv-follow-btn').click()
        pg.wait_for_function("() => window.__d2.store.get('page')?.pageKey === 'a1_4'")
        assert S(pg, 'follow') == 'follow'
        assert pg.locator('.zv-band').get_attribute('data-state') == 'follow'   # EASY_UX: 띠는 늘 보이고 상태만 바뀐다
        assert pg.locator('.zv-follow-btn').count() == 0
        assert abs(S(pg, 'viewport')['scale'] - S(pg, 'viewport')['scale']) < 1e-9
        wait_color(pg, 'a1', 4)
    step('「발표 화면으로 돌아가기」', t_back)

    def t_force():
        pg.locator('.zv-pager button', has_text='이전').click()
        pg.wait_for_function("() => window.__d2.store.get('follow') === 'free'")
        assert pk(pg) == 'a1_3'
        # 같은 forceSeq 의 live 는 끌어오지 않는다
        pg.evaluate("() => window.__d2.store.set('live', {aid:'a1', page:5, view:{cx:.5,cy:.5,z:1}, rev:4, epoch:1, forceSeq:2})")
        pg.wait_for_timeout(150)
        assert pk(pg) == 'a1_3'
        # forceSeq+1 이면 한 번 따라간다
        pg.evaluate("() => window.__d2.store.set('live', {aid:'a2', page:2, view:{cx:.5,cy:.5,z:1}, rev:5, epoch:1, forceSeq:3})")
        pg.wait_for_function("() => window.__d2.store.get('page')?.pageKey === 'a2_2'")
        assert S(pg, 'follow') == 'follow'
        wait_color(pg, 'a2', 2)
    step('forceSeq: 옛 값은 무시, +1 이면 따라감', t_force)

    def t_keys():
        pg.locator('.zv-pager button', has_text='이전').click()   # a2_1
        pg.keyboard.press('ArrowRight')
        pg.wait_for_function("() => window.__d2.store.get('page')?.pageKey === 'a2_2'")
        pg.keyboard.press('ArrowRight')
        pg.wait_for_function("() => window.__d2.store.get('page')?.pageKey === 'b1_1'")
        assert pg.locator('.zv-pager button', has_text='다음').is_enabled()
        pg.keyboard.press('ArrowRight')
        pg.wait_for_function("() => window.__d2.store.get('page')?.pageKey === 'b1_2'")
        assert not pg.locator('.zv-pager button', has_text='다음').is_enabled(), '끝 쪽에서 다음 막힘'
    step('자판·안건 넘어 쪽 넘기기', t_keys)

    def t_board():
        pg.wait_for_timeout(300)
        c = pix(pg, 0.5, 0.5); edge = pix(pg, 0.013, 0.5)
        assert sum(c) > 600, f'화이트보드 바탕이 흰색이어야 함 {c}'
        assert S(pg, 'viewport')['pageW'] == 1600 and S(pg, 'viewport')['pageH'] == 1000
        assert pg.locator('.zv-thumbs.is-board .zv-thumb').count() == 2
    step('화이트보드 바탕(board.js paintBoardBackground)', t_board)
    pg.screenshot(path=os.path.join(SHOT, f'{label}_{size[0]}_3_board.png'))

    def t_cmdnav():
        pg.evaluate("() => window.__d2.store.emit('cmd:nav', {aid:'a1', page:2})")
        pg.wait_for_function("() => window.__d2.store.get('page')?.pageKey === 'a1_2'")
        assert S(pg, 'follow') == 'free'
        pg.evaluate("() => window.__d2.store.emit('cmd:follow')")
        pg.wait_for_function("() => window.__d2.store.get('page')?.pageKey === 'a2_2'")
        assert S(pg, 'follow') == 'follow'
    step('cmd:nav(자유 보기)·cmd:follow', t_cmdnav)

    def t_unmount():
        n = pg.evaluate('window.__d2.unmount()')
        assert n == 2, f'남은 store 구독 {n} (받침 자신의 tool·toast 2개만 남아야 함)'
        assert pg.locator('.zv-pager').count() == 0 and pg.locator('.zv-agenda').count() == 0
        assert pg.locator('#mark-board').count() == 1 and pg.locator('#mark-hand').count() == 1
        pg.evaluate("() => { window.__d2.store.emit('cmd:nav', {aid:'a1', page:1}); window.__d2.store.set('live', null); }")
        bx = stage_box(pg)
        pg.mouse.move(bx['x'] + 50, bx['y'] + 50); pg.mouse.wheel(0, -200)
        pg.keyboard.press('ArrowRight')
    step('unmount: 내 것만 지우고 구독·창 이벤트 해제', t_unmount)
    ctx.close()

    # ---------- 3. 늦은 렌더 취소 ----------
    ctx, pg = page({'delays': {'a2:1': 1500}})
    def t_cancel():
        wait_color(pg, 'a1', 1)
        open_agenda(pg)
        pg.locator('.zv-agenda-item[data-aid="a2"]').click()      # a2:1 은 1.5초 늦게 옴
        pg.wait_for_function("() => window.__d2.store.get('page')?.pageKey === 'a2_1'")
        assert pg.locator('.zv-ov-loading').is_visible()
        pg.keyboard.press('ArrowRight')                              # 곧바로 a2:2
        pg.wait_for_function("() => window.__d2.store.get('page')?.pageKey === 'a2_2'")
        wait_color(pg, 'a2', 2)
        pg.wait_for_timeout(1700)                                    # 늦게 온 a2:1 이 덮어쓰지 않아야 함
        assert close(pix(pg), color(pg, 'a2', 2)), f'늦은 렌더가 덮어씀 {pix(pg)}'
        assert pg.locator('.zv-ov-loading').count() == 0
    step('요청 번호로 늦은 렌더 버림', t_cancel)
    ctx.close()

    # ---------- 4. 진행자: 300ms 묶음·409·force ----------
    host = {'role': {'role': 'host', 'cid': 'h1', 'name': '주관', 'presenter': True}}
    ctx, pg = page(host)
    def t_batch():
        wait_color(pg, 'a1', 1)
        assert pg.locator('.zv-band.is-presenting').is_visible()   # EASY_UX: 「내가 발표 중이에요」 띠
        assert pg.locator('.zv-band .zv-end-btn').inner_text().strip() == '발표 마치기'
        bx = stage_box(pg); cx, cy = bx['x'] + bx['width'] / 2, bx['y'] + bx['height'] / 2
        pg.mouse.move(cx, cy); pg.mouse.wheel(0, -500)
        pg.wait_for_timeout(450)
        pg.evaluate('window.__d2.log.live.length = 0')
        pg.mouse.down()
        moves = 30
        for i in range(moves):
            pg.mouse.move(cx - i * 6, cy - i * 3); pg.wait_for_timeout(20)
        pg.mouse.up()
        pg.wait_for_timeout(700)
        calls = pg.evaluate('window.__d2.log.live')
        assert 1 <= len(calls) <= 5, f'묶음 보내기 횟수 {len(calls)}'
        gaps = [calls[i + 1]['t'] - calls[i]['t'] for i in range(len(calls) - 1)]
        assert all(g >= 250 for g in gaps), f'간격 {gaps}'
        last = calls[-1]; v = S(pg, 'page')['view']
        assert abs(last['view']['cx'] - v['cx']) < 2e-3 and abs(last['view']['z'] - v['z']) < 2e-3, (last, v)
        assert 'baseRev' not in last, 'baseRev 는 api.js 가 채움'
    step('진행자 이동을 300ms 로 묶어 live 보내기', t_batch)
    pg.screenshot(path=os.path.join(SHOT, f'{label}_{size[0]}_4_presenter.png'))

    def t_echo():
        pg.wait_for_timeout(200)
        before = S(pg, 'page')
        pg.evaluate("() => { const l = window.__d2.store.get('live'); window.__d2.store.set('live', {...l}); }")
        pg.wait_for_timeout(100)
        assert S(pg, 'page')['pageKey'] == before['pageKey']
    step('내 live 메아리는 화면을 흔들지 않음', t_echo)

    def t_stale():
        pg.evaluate("() => window.__d2.setLiveMode('stale', {aid:'a1', page:4, view:{cx:.5,cy:.5,z:1}, rev:40, epoch:1, forceSeq:2})")
        pg.keyboard.press('ArrowRight')
        pg.wait_for_function("() => window.__d2.store.get('page')?.pageKey === 'a1_4'", timeout=3000)
        pg.wait_for_timeout(500)
        assert pk(pg) == 'a1_4', '409 최신 상태로 맞춤'
        n0 = len(pg.evaluate('window.__d2.log.live'))
        pg.keyboard.press('ArrowRight')
        pg.wait_for_timeout(500)
        calls = pg.evaluate('window.__d2.log.live')
        assert len(calls) == n0 + 1 and calls[-1]['page'] == 5, calls[-1]
    step('409 stale_rev → 서버 최신으로 맞추고 이어서 보냄', t_stale)

    def t_force_host():
        n0 = len(pg.evaluate('window.__d2.log.live'))
        pg.evaluate("() => window.__d2.store.emit('cmd:force')")
        pg.wait_for_timeout(250)
        calls = pg.evaluate('window.__d2.log.live')
        assert len(calls) == n0 + 1 and calls[-1].get('force') is True, calls[-1:]
    step('cmd:force → force:true 로 바로 보냄', t_force_host)

    def t_lose():
        pg.evaluate("() => { const m = window.__d2.store.get('meeting'); window.__d2.store.set('meeting', {...m, presenter:{cid:'h2', name:'다른', epoch:2}}); window.__d2.store.patch('role', {presenter:false}); }")
        n0 = len(pg.evaluate('window.__d2.log.live'))
        pg.evaluate("() => window.__d2.store.set('live', {aid:'a2', page:1, view:{cx:.5,cy:.5,z:1}, rev:60, epoch:2, forceSeq:3})")
        pg.wait_for_function("() => window.__d2.store.get('page')?.pageKey === 'a2_1'")
        pg.keyboard.press('ArrowRight')
        pg.wait_for_timeout(450)
        assert len(pg.evaluate('window.__d2.log.live')) == n0, '진행권 잃으면 안 보냄'
        assert S(pg, 'follow') == 'free'
        assert pg.locator('.zv-follow-btn').is_visible()
    step('진행권 잃음 → 보내기 멈추고 참석자처럼', t_lose)
    ctx.close()

    # ---------- 5. 펜 모드 손짓 나눔 ----------
    ctx, pg = page(None, touch=True)
    def t_pen():
        wait_color(pg, 'a1', 1)
        bx = stage_box(pg); cx, cy = bx['x'] + bx['width'] / 2, bx['y'] + bx['height'] / 2
        pg.mouse.move(cx, cy); pg.mouse.wheel(0, -500); pg.wait_for_timeout(350)
        pg.evaluate("() => window.__d2.store.set('tool', {mode:'pen', tool:'pen', color:'#E5484D', w:0.004})")
        v0 = S(pg, 'page')['view']
        pg.mouse.move(cx, cy); pg.mouse.down(); pg.mouse.move(cx + 120, cy + 80, steps=8); pg.mouse.up()
        pg.wait_for_timeout(350)
        v1 = S(pg, 'page')['view']
        assert abs(v0['cx'] - v1['cx']) < 1e-4 and abs(v0['cy'] - v1['cy']) < 1e-4, '펜 모드 한 손가락(마우스)은 이동 안 함'
        cdp = ctx.new_cdp_session(pg)
        def touch(kind, pts):
            cdp.send('Input.dispatchTouchEvent', {'type': kind, 'touchPoints': [{'x': x, 'y': y, 'id': i} for i, (x, y) in enumerate(pts)]})
        touch('touchStart', [(cx - 40, cy)])
        touch('touchMove', [(cx - 30, cy)])
        assert not any(e[0] == 'gesture' for e in pg.evaluate('window.__d2.log.events')), '한 손가락에서는 gesture 없음'
        touch('touchStart', [(cx - 30, cy), (cx + 40, cy)])
        for k in range(1, 8):
            touch('touchMove', [(cx - 30 - k * 12, cy), (cx + 40 + k * 12, cy)])
            pg.wait_for_timeout(16)
        touch('touchEnd', [])
        pg.wait_for_timeout(350)
        ev = [e for e in pg.evaluate('window.__d2.log.events') if e[0] == 'gesture']
        assert ev and ev[0][1] == 'multi', ev
        assert S(pg, 'page')['view']['z'] > v1['z'] * 1.3, (v1, S(pg, 'page')['view'])
    step('펜 모드: 한 손가락은 3팀, 두 손가락은 확대 + gesture', t_pen)

    def t_swipe():
        pg.evaluate("() => window.__d2.store.set('tool', {mode:'view', tool:'pen', color:'#E5484D', w:0.004})")
        pg.keyboard.press('0')                                        # 쪽 맞춤(좁으면 단추가 숨겨질 수 있어 자판으로)
        pg.wait_for_timeout(350)
        assert abs(S(pg, 'page')['view']['z'] - 1) < 1e-6, S(pg, 'page')
        bx = stage_box(pg); cx, cy = bx['x'] + bx['width'] / 2, bx['y'] + bx['height'] / 2
        cdp = ctx.new_cdp_session(pg)
        cdp.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [{'x': cx + 100, 'y': cy}]})
        for k in range(1, 6):
            cdp.send('Input.dispatchTouchEvent', {'type': 'touchMove', 'touchPoints': [{'x': cx + 100 - k * 40, 'y': cy}]})
        cdp.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []})
        pg.wait_for_function("() => window.__d2.store.get('page')?.pageKey === 'a1_2'")
    step('맞춤 상태에서 밀어 쪽 넘기기', t_swipe)
    ctx.close()

    # ---------- 6. 빈 안건·live 없음 ----------
    ctx, pg = page({'agenda': [], 'live': None, 'meeting': {'id': 'm1', 'status': 'ready'}})
    def t_empty():
        assert pg.locator('.zv-ov-empty').is_visible()
        assert pg.locator('.zv-agenda-empty').is_visible()
        assert pg.locator('.zv-pageno').inner_text().strip() == '0 / 0'
        pg.evaluate("() => window.__d2.store.set('agenda', window.__d2.AGENDA.slice(0, 1))")
        wait_color(pg, 'a1', 1)
        bx = stage_box(pg); pg.mouse.move(bx['x'] + 200, bx['y'] + 200); pg.mouse.wheel(0, -300)
        pg.wait_for_timeout(100)
        assert S(pg, 'follow') == 'follow', 'live 없을 때 혼자 넘겨도 자유 보기 띠 없음'
    step('빈 안건 그림 → 안건 도착하면 첫 쪽', t_empty)
    pg.evaluate("() => window.__d2.store.set('agenda', [])")
    pg.wait_for_timeout(100)
    pg.screenshot(path=os.path.join(SHOT, f'{label}_{size[0]}_5_empty.png'))
    ctx.close()

    step('콘솔 오류 0', lambda: (_ for _ in ()).throw(AssertionError('\n'.join(errors[:10]))) if errors else None)
    b.close()
    return ok, fail


def narrow(pw, launch_kw, label):
    """좁은 화면(390): 안건 덮개 열고 닫기, 스크린샷."""
    b = pw.chromium.launch(**launch_kw)
    ctx = b.new_context(viewport={'width': 390, 'height': 844}, locale='ko-KR')
    pg = ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(URL); pg.wait_for_function('window.__d2ready === true')
    pg.evaluate("document.body.classList.add('side-closed')")   # app 은 좁은 화면에서 옆칸 서랍을 닫아 둔다
    pg.evaluate('window.__d2.mount({})')
    pg.wait_for_timeout(600)
    pg.locator('.zv-list-btn').click(); pg.wait_for_timeout(300)
    assert pg.locator('#zz-agenda').get_attribute('data-open') is not None
    pg.screenshot(path=os.path.join(SHOT, f'{label}_390_drawer.png'))
    pg.locator('.zv-agenda-item[data-aid="a2"]').click(); pg.wait_for_timeout(400)
    assert pg.locator('#zz-agenda').get_attribute('data-open') is None
    pg.screenshot(path=os.path.join(SHOT, f'{label}_390_stage.png'))
    b.close()
    assert not errs, errs


if __name__ == '__main__':
    total_ok = total_fail = 0
    with sync_playwright() as pw:
        for label, kw in [('edge', {'channel': 'msedge'}), ('chromium', {})]:
            for size in [(1280, 800), (820, 1180)]:
                try:
                    o, f = run(pw, label, kw, size)
                except Exception as e:
                    print(f'  FAIL [{label}] 실행 -> {e}'); o, f = [], ['실행']
                total_ok += len(o); total_fail += len(f)
            try:
                narrow(pw, kw, label); total_ok += 1; print(f'  OK   [{label} 390] 좁은 화면 안건 덮개')
            except Exception as e:
                total_fail += 1; print(f'  FAIL [{label} 390] 좁은 화면 -> {e}')
    print(f'\n합계: 통과 {total_ok} / 실패 {total_fail}  스크린샷 {SHOT}')
    sys.exit(1 if total_fail else 0)
