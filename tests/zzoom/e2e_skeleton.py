# -*- coding: utf-8 -*-
"""쭘 뼈대 조립 시험(빈 화면). server.js 를 로컬로 띄운 뒤 돌린다(Firebase·Redis 없이).
    PORT=3297 node server.js &      (로컬 기본 접근 코드 1234)
    python tests/zzoom/e2e_skeleton.py http://127.0.0.1:3297 [접근코드=1234]
브라우저 두 가지(엣지 channel='msedge', 기본 크로미움)로 같은 시험을 돈다.
- 아직 없는 팀 모듈(list.js 등)은 시험이 빈 모듈로 바꿔 끼운다(있으면 진짜 파일을 쓴다).
- 서버 설정 있음은 /api/zzoom/health·meetings 를 가로채 흉내 낸다. Firebase 에는 닿지 않는다.
- 모든 단계에서 콘솔 오류·페이지 오류 0 이어야 통과."""
import json, sys, urllib.request
from playwright.sync_api import sync_playwright, expect

BASE = sys.argv[1].rstrip('/') if len(sys.argv) > 1 else 'http://127.0.0.1:3297'
CODE = sys.argv[2] if len(sys.argv) > 2 else '1234'
TEAM = ['list', 'join', 'viewer', 'draw', 'board', 'chat', 'hands', 'poll', 'record', 'host', 'upload']
SLOTS = ['zz-header', 'zz-brand', 'zz-meeting-title', 'zz-status', 'zz-header-actions', 'zz-notice', 'zz-gate', 'zz-list',
         'zz-meeting', 'zz-agenda', 'zz-center', 'zz-follow-bar', 'zz-stage', 'zz-layer-bg', 'zz-layer-ink', 'zz-layer-temp',
         'zz-stage-overlay', 'zz-toolbar', 'zz-pagebar', 'zz-board-actions', 'zz-quick-hand', 'zz-side', 'zz-side-tabs',
         'zz-side-chat', 'zz-side-poll', 'zz-side-hands', 'zz-side-log', 'zz-hostbar', 'zz-hostbar-main', 'zz-hostbar-upload',
         'zz-hostbar-board', 'zz-hostbar-record', 'zz-join', 'zz-modal-root', 'zz-toast']
MID = 'mabcdefghij12'

def login():
    req = urllib.request.Request(BASE + '/api/auth/login', data=json.dumps({'code': CODE}).encode(),
                                 headers={'Content-Type': 'application/json', 'X-Device-Id': 'zzoom-e2e-skeleton'})
    return json.loads(urllib.request.urlopen(req, timeout=10).read())['token']

def stub(name):
    # 빈 모듈: 붙이고 뗀 기록과 ctx 를 남긴다
    return ("export function mount(ctx){ (window.__zzMounted ||= []).push('%s'); window.__zzCtx = ctx;"
            " return { unmount(){ (window.__zzUnmounted ||= []).push('%s'); } }; }" % (name, name))

def run(pw, label, launch_kw, token):
    ok, fail, errors, stubbed = [], [], [], set()
    def step(name, fn):
        try: fn(); ok.append(name); print(f'  OK   [{label}] {name}', flush=True)
        except Exception as e: fail.append(name); print(f'  FAIL [{label}] {name} -> {str(e)[:600]}', flush=True)
    b = pw.chromium.launch(**launch_kw)
    print(f'[{label}] 브라우저 {b.version}', flush=True)

    def new_page(with_token=True, configured=False, width=1280):
        ctx = b.new_context(viewport={'width': width, 'height': 820}, locale='ko-KR')
        if with_token:
            ctx.add_init_script("try{localStorage.setItem('airoom_auth_token', %s)}catch(e){}" % json.dumps(token))
        def team_js(route):
            name = route.request.url.split('/zzoom/')[-1].split('?')[0][:-3]
            try: resp = route.fetch()
            except Exception: return            # 창을 닫는 중
            if resp.status == 404 and name in TEAM:
                stubbed.add(name)
                route.fulfill(status=200, content_type='text/javascript; charset=utf-8', body=stub(name))
            else:
                route.fulfill(response=resp)
        ctx.route(lambda u: '/zzoom/' in u and u.split('?')[0].endswith('.js') and '/zzoom/convert/' not in u and '/zzoom/vendor/' not in u, team_js)
        if configured:
            ctx.route('**/api/zzoom/health', lambda r: r.fulfill(status=200, content_type='application/json', body='{"ok":true,"firebase":true,"redis":true}'))
            ctx.route('**/api/zzoom/meetings', lambda r: r.fulfill(status=200, content_type='application/json', body='{"meetings":[],"isAdmin":true}'))
        pg = ctx.new_page()
        pg.on('console', lambda m: errors.append(f'console: {m.text}') if m.type == 'error' else None)
        pg.on('response', lambda r: errors.append(f'http {r.status}: {r.request.method} {r.url}') if r.status >= 400 else None)
        pg.on('pageerror', lambda e: errors.append(f'pageerror: {e}'))
        return ctx, pg

    def gate():
        ctx, pg = new_page(with_token=False)
        pg.goto(BASE + '/zzoom')
        expect(pg.locator('#zz-gate')).to_be_visible()
        expect(pg.locator('#zz-gate')).to_contain_text('백암이에서 먼저 로그인')
        assert pg.locator('#zz-gate a[href="/"]').count() == 1, '/ 링크 없음'
        assert not pg.evaluate('window.__zzMounted'), '로그인 전에 모듈이 붙음'
        ctx.close()
    step('토큰 없으면 로그인 안내와 / 링크', gate)

    def unconfigured_list():
        ctx, pg = new_page()
        pg.goto(BASE + '/zzoom')
        expect(pg.locator('#zz-notice')).to_be_visible()
        expect(pg.locator('#zz-list .zz-empty')).to_be_visible()
        assert not pg.evaluate('window.__zzMounted'), '설정 없음인데 모듈이 붙음'
        ctx.close()
    step('서버 설정 없음(실제 서버 health ok:false): 목록 자리 안내, 요청 안 보냄', unconfigured_list)

    def unconfigured_meeting():
        ctx, pg = new_page()
        pg.goto(BASE + '/zzoom#/m/' + MID)
        expect(pg.locator('#zz-notice')).to_be_visible()
        for s in SLOTS: assert pg.locator('#' + s).count() == 1, f'#{s} 없음'
        expect(pg.locator('#zz-meeting')).to_be_visible()
        assert pg.locator('#zz-join').is_hidden(), '설정 없음인데 입장 화면이 뜸'
        ctx.close()
    step('서버 설정 없음: 회의 화면 틀과 자리 id 전부', unconfigured_meeting)

    def configured_list():
        ctx, pg = new_page(configured=True)
        pg.goto(BASE + '/zzoom')
        pg.wait_for_function("(window.__zzMounted||[]).includes('list') || document.querySelector('#zz-list').childElementCount > 0")
        assert pg.locator('#zz-notice').is_hidden(), '설정 있음인데 안내 띠'
        assert pg.locator('#zz-meeting').is_hidden(), '목록에서 회의 틀이 보임'
        ctx.close()
    step('서버 설정 있음(흉내): 목록 모듈 붙음', configured_list)

    def configured_meeting():
        ctx, pg = new_page(configured=True)
        pg.goto(BASE + '/zzoom#/m/' + MID)
        expect(pg.locator('#zz-join')).to_be_visible()
        for s in SLOTS: assert pg.locator('#' + s).count() == 1, f'#{s} 없음'
        pg.wait_for_function("(window.__zzMounted||[]).includes('join') || !!document.querySelector('#zz-join').childElementCount")
        # 입장한 것처럼 role 을 넣으면 나머지 모듈이 붙는다(참석자)
        pg.evaluate("window.__zzoom.store.set('role', {role:'viewer', cid:'ctest001', name:'시험', presenter:false})")
        expect(pg.locator('#zz-join')).to_be_hidden()
        assert pg.locator('#zz-hostbar').is_hidden(), '참석자에게 주관자 막대가 보임'
        if stubbed:
            pg.wait_for_function("['viewer','draw','board','chat','hands','poll','record'].filter(n => !%s.includes(n) || (window.__zzMounted||[]).includes(n)).length === 7" % json.dumps(sorted(stubbed)))
        # 주관자로 바뀌면 host·upload 가 붙고 주관자 막대가 보인다
        pg.evaluate("window.__zzoom.store.set('role', {role:'host', cid:'ctest001', name:'시험', presenter:false})")
        expect(pg.locator('#zz-hostbar')).to_be_visible()
        assert pg.evaluate("document.body.classList.contains('is-host')")
        # 펜 모드 → body.is-pen, 임시 canvas 가 포인터를 받음
        pg.evaluate("window.__zzoom.store.set('tool', {mode:'pen', tool:'pen', color:'#E5484D', w:0.004})")
        assert pg.evaluate("getComputedStyle(document.getElementById('zz-layer-temp')).pointerEvents") == 'auto'
        # 옆칸 탭·배지
        pg.locator('#zz-tab-poll').click()
        expect(pg.locator('#zz-side-poll')).to_be_visible(); expect(pg.locator('#zz-side-chat')).to_be_hidden()
        pg.evaluate("window.__zzoom.store.set('badges', {chat: 3})")
        expect(pg.locator('#zz-tab-chat .zz-badge')).to_have_text('3')
        # 토스트
        pg.evaluate("window.__zzoom.store.emit('toast', {text:'시험 토스트', kind:'ok'})")
        expect(pg.locator('#zz-toast')).to_contain_text('시험 토스트')
        # ctx 모양(빈 모듈이 하나라도 있을 때만 잡힘)
        if pg.evaluate('!!window.__zzCtx'):
            assert pg.evaluate("window.__zzCtx.assets('icon-pen')") == '/zzoom/assets/icon-pen.webp'
            assert pg.evaluate("window.__zzCtx.t('안건 {n}', {n:3})") == '안건 3'
            assert pg.evaluate("(()=>{try{window.__zzCtx.el('zz-없는자리');return false}catch(e){return true}})()")
            pg.evaluate("window.__m = window.__zzCtx.modal({title:'시험 모달', body:document.createTextNode('내용'), actions:[{label:'확인', primary:true}]})")
            expect(pg.get_by_role('dialog', name='시험 모달')).to_be_visible()
            pg.get_by_role('button', name='확인').click()
            expect(pg.get_by_role('dialog')).to_have_count(0)
        # 참석자로 내려가면 host·upload 가 떨어진다
        pg.evaluate("window.__zzoom.store.set('role', {role:'viewer', cid:'ctest001', name:'시험', presenter:false})")
        expect(pg.locator('#zz-hostbar')).to_be_hidden()
        for n in ('host', 'upload'):
            if n in stubbed: assert n in pg.evaluate('window.__zzUnmounted || []'), f'{n} unmount 안 됨'
        # 목록으로 돌아가면 회의 모듈이 모두 떨어진다
        pg.evaluate("location.hash = '#/'")
        expect(pg.locator('#zz-meeting')).to_be_hidden()
        if 'viewer' in stubbed: pg.wait_for_function("(window.__zzUnmounted||[]).includes('viewer')")
        ctx.close()
    step('서버 설정 있음(흉내): 회의 화면 조립, 역할 바뀜, 옆칸, 모달, 토스트, 떼기', configured_meeting)

    def narrow():
        ctx, pg = new_page(configured=True, width=600)
        pg.goto(BASE + '/zzoom#/m/' + MID)
        pg.evaluate("window.__zzoom.store.set('role', {role:'viewer', cid:'ctest001', name:'시험', presenter:false})")
        assert pg.evaluate("getComputedStyle(document.getElementById('zz-side')).position") == 'fixed', '좁은 화면 옆칸이 서랍이 아님'
        assert pg.evaluate("document.body.classList.contains('side-closed')"), '좁은 화면에서 서랍이 처음부터 열림'
        assert pg.evaluate("document.documentElement.scrollWidth <= window.innerWidth"), '가로 넘침'
        pg.locator('#zz-tab-chat').click()
        assert not pg.evaluate("document.body.classList.contains('side-closed')"), '탭을 눌러도 서랍이 안 열림'
        ctx.close()
    step('768px 미만: 옆칸은 아래 서랍', narrow)

    b.close()
    for e in errors: print(f'  콘솔 [{label}] {e}')
    if errors: fail.append(f'콘솔 오류 {len(errors)}건')
    return ok, fail, len(errors), stubbed

with sync_playwright() as pw:
    token = login()
    total_ok = total_fail = 0
    for label, kw in [('edge', {'channel': 'msedge'}), ('chromium', {})]:
        try:
            ok, fail, nerr, stubbed = run(pw, label, kw, token)
        except Exception as e:
            print(f'  FAIL [{label}] 브라우저 실행 -> {e}'); total_fail += 1; continue
        print(f'[{label}] 통과 {len(ok)} / 실패 {len(fail)} / 콘솔 오류 {nerr} / 빈 모듈로 바꿔 낀 팀 파일 {len(stubbed)}개 {sorted(stubbed)}')
        total_ok += len(ok); total_fail += len(fail)
    print(f'합계: 통과 {total_ok}, 실패 {total_fail}')
    sys.exit(1 if total_fail else 0)
