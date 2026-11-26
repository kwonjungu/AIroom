# -*- coding: utf-8 -*-
"""쭘 운영 판서(펜) 점검. 읽기 위주 시험: 시험 회의를 만들어 그리고 반드시 지운다.
    set ZZ_CODE=4321 ; python tests/zzoom/prod_pen_check.py [기준주소] [너비 목록 예: 1280,820,390]
스크린샷은 %TEMP%\\zz_pen_shots. 메모는 docs/meeting-2026-11-25/reports/PEN_PROD_CHECK.md 에 쌓는다."""
import json, os, random, sys, tempfile, time, urllib.request
try: sys.stdout.reconfigure(encoding='utf-8')
except Exception: pass
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
BASE = (sys.argv[1] if len(sys.argv) > 1 else 'https://a-iroom.vercel.app').rstrip('/')
WIDTHS = [int(x) for x in (sys.argv[2] if len(sys.argv) > 2 else '1280,820,390').split(',')]
sys.argv = [sys.argv[0], BASE]
from prod_check import make_pdf
from playwright.sync_api import sync_playwright, expect
from datetime import datetime

CODE = os.environ.get('ZZ_CODE', '')
SHOTS = os.path.join(tempfile.gettempdir(), 'zz_pen_shots'); os.makedirs(SHOTS, exist_ok=True)
NOTES = os.path.join(HERE, '..', '..', 'docs', 'meeting-2026-11-25', 'reports', 'PEN_PROD_CHECK.md')
T = 20000
expect.set_options(timeout=T)
STAMP = datetime.now().strftime('%H%M%S')
CREATED = []   # (mid, token)


FAILS = []   # !! 줄과 25초 안에 안 사라짐을 실패로 센다 — 끝 코드에 반영(감사 R10 T3-T4)
def note(line):
    print(line, flush=True)
    if '!!' in line or '사라짐: None' in line or '나타남 None' in line: FAILS.append(line.strip())
    try:
        os.makedirs(os.path.dirname(NOTES), exist_ok=True)
        with open(NOTES, 'a', encoding='utf-8') as f: f.write(line + '\n')
    except Exception: pass


def login(device):
    req = urllib.request.Request(BASE + '/api/auth/login', data=json.dumps({'code': CODE}).encode(),
                                 headers={'Content-Type': 'application/json', 'X-Device-Id': device})
    last = None
    for _ in range(8):
        try: return json.loads(urllib.request.urlopen(req, timeout=15).read())['token']
        except Exception as e:
            last = e; time.sleep(25 if getattr(e, 'code', 0) == 429 else 1.5)
    raise last


INK_JS = """(a)=>{
 const tmp=document.getElementById('zz-layer-temp'), ink=document.getElementById('zz-layer-ink');
 const rect=tmp.getBoundingClientRect(); const sx=tmp.width/rect.width, sy=tmp.height/rect.height;
 const res={rect:[rect.left,rect.top,rect.width,rect.height],cw:tmp.width,ch:tmp.height,total:0,cover:null,bbox:null,band:null};
 let minx=1e9,miny=1e9,maxx=-1,maxy=-1; const cs=[];
 for(const c of [ink,tmp]){ if(!c||!c.width) continue; const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data; cs.push([c,d]); }
 const has=(x,y)=>{ x=Math.round(x);y=Math.round(y); for(const [c,d] of cs){ if(x<0||y<0||x>=c.width||y>=c.height) continue; if(d[(y*c.width+x)*4+3]>0) return true;} return false; };
 for(const [c,d] of cs){ for(let y=0;y<c.height;y+=1){ for(let x=0;x<c.width;x+=1){ if(d[(y*c.width+x)*4+3]>0){ res.total++; if(x<minx)minx=x; if(x>maxx)maxx=x; if(y<miny)miny=y; if(y>maxy)maxy=y; } } } }
 if(res.total) res.bbox=[rect.left+minx/sx, rect.top+miny/sy, rect.left+maxx/sx, rect.top+maxy/sy];
 if(a&&a.pts){ let ok=0; const r=a.r||6; for(const p of a.pts){ let f=false; for(let dx=-r;dx<=r&&!f;dx+=2) for(let dy=-r;dy<=r&&!f;dy+=2){ if(has((p[0]-rect.left+dx)*sx,(p[1]-rect.top+dy)*sy)) f=true; } if(f) ok++; } res.cover=ok/a.pts.length; }
 if(a&&a.band){ let n=0; for(const [c,d] of cs){ const y0=Math.max(0,Math.floor((a.band[0]-rect.top)*sy)), y1=Math.min(c.height,Math.ceil((a.band[1]-rect.top)*sy)); for(let y=y0;y<y1;y++) for(let x=0;x<c.width;x++) if(d[(y*c.width+x)*4+3]>0) n++; } res.band=n; }
 return res; }"""

DISPATCH_JS = """async (a)=>{
 const el=document.getElementById('zz-layer-temp');
 const mk=(t,p)=>new PointerEvent(t,{pointerId:a.id,pointerType:a.type,isPrimary:true,clientX:p[0],clientY:p[1],pressure:a.type==='pen'?(a.pressure||0.6):(t==='pointerup'?0:0.5),button:0,buttons:t==='pointerup'?0:1,bubbles:true,cancelable:true});
 el.dispatchEvent(mk('pointerdown',a.pts[0]));
 for(let i=1;i<a.pts.length;i++){ el.dispatchEvent(mk('pointermove',a.pts[i])); if(a.delay) await new Promise(r=>setTimeout(r,a.delay)); }
 el.dispatchEvent(mk('pointerup',a.pts[a.pts.length-1])); return true; }"""

INIT_TOAST = """(()=>{window.__toasts=[];const start=()=>{const b=document.getElementById('zz-toast');if(!b){setTimeout(start,300);return;}
 new MutationObserver(m=>{for(const r of m)for(const n of r.addedNodes){if(n.textContent)window.__toasts.push(n.className+'|'+n.textContent.trim());}}).observe(b,{childList:true,subtree:true});};
 document.addEventListener('DOMContentLoaded',start);})();"""


class Run:
    def __init__(self, width, b, pdf):
        self.w, self.b, self.pdf = width, b, pdf
        self.label = f'w{width}'
        self.title = f'[시험] 펜 점검 {STAMP} {self.label}'
        self.host_code = ''.join(random.choice('0123456789') for _ in range(6))
        self.errs = []; self.net = []; self.posts = []; self.n = 0
        self.mid = None; self.tok = None
        touch = width < 1000
        self.touch = touch
        self.ctxs = []

    def shot(self, name, pg):
        self.n += 1
        p = os.path.join(SHOTS, f'{self.label}_{self.n:02d}_{name}.png')
        try: pg.screenshot(path=p)
        except Exception: pass
        return p

    def newctx(self, token, who, width=None, height=None):
        w = width or self.w
        h = height or (800 if w >= 1000 else 844)
        ctx = self.b.new_context(viewport={'width': w, 'height': h}, locale='ko-KR', has_touch=(w < 1000), is_mobile=False)
        ctx.add_init_script("try{localStorage.setItem('airoom_auth_token', %s)}catch(e){}" % json.dumps(token))
        ctx.add_init_script("try{localStorage.setItem('zz_onboarded_v1','viewer,host')}catch(e){}")
        ctx.add_init_script(INIT_TOAST)
        pg = ctx.new_page(); pg.set_default_timeout(T)
        self.ctxs.append(ctx)
        t0 = time.time()
        pg.on('pageerror', lambda e: self.errs.append(f'{who} pageerror {str(e)[:150]}'))
        pg.on('console', lambda m: self.errs.append(f'{who} console {m.text[:200]}') if m.type == 'error' else None)
        def resp(r):
            if '/api/zzoom' in r.url:
                rec = (round(time.time() - t0, 2), who, r.request.method, r.status, r.url.split('/api/zzoom')[-1][:70])
                if r.status >= 400: self.net.append(rec); print('   [net>=400]', rec, flush=True)
                if r.request.method in ('POST', 'DELETE') and '/strokes' in r.url:
                    n = None
                    try:
                        if r.request.method == 'POST': n = len(json.loads(r.request.post_data or '{}').get('strokes', []))
                    except Exception: pass
                    self.posts.append((time.time(), who, r.request.method, r.status, n))
        pg.on('response', resp)
        pg.on('requestfailed', lambda q: self.errs.append(f'{who} reqfailed {q.method} {q.url.split("/api/")[-1][:60]} {q.failure}') if '/api/' in q.url else None)
        return ctx, pg

    # ---- 시작 ----
    def setup(self):
        self.tok = login('zz-pen-a-' + STAMP)
        tokb = login('zz-pen-b-' + STAMP)
        self.ctx, pg = self.newctx(self.tok, 'host'); self.pg = pg
        pg.goto(BASE + '/zzoom', wait_until='domcontentloaded')
        expect(pg.locator('#zz-list .zl-new')).to_be_visible()
        pg.locator('.zl-new').click(); pg.fill('#zl-f-title', self.title); pg.fill('#zl-f-code', self.host_code)
        pg.locator('.zl-form button[type=submit]').click(); pg.locator('.zl-done-back').click()
        card = pg.locator('.zl-card', has_text=self.title); expect(card).to_be_visible()
        self.mid = card.get_attribute('data-mid'); CREATED.append((self.mid, self.tok))
        pg.locator(f'.zl-card[data-mid="{self.mid}"] .zl-enter').click()
        pg.locator('#zz-join .zl-go').click(); expect(pg.locator('#zz-join')).to_be_hidden()
        expect(pg.locator('#zz-wait .za-title')).to_contain_text('오늘의 안건')
        if not pg.locator('.zl-host-chip').count():
            pg.locator('.zl-more').click(); pg.locator('.zl-host-btn').click(); pg.fill('#zl-hostcode', self.host_code)
            pg.locator('.zl-form button[type=submit]').click()
        expect(pg.locator('.zl-host-chip')).to_be_attached(); pg.locator('.zh-bar').wait_for()
        start = pg.locator('.zh-start')
        if not start.is_visible():
            pg.get_by_role('button', name='더 보기').click(); start = pg.locator('.zh-more-item', has_text='회의 시작')
        start.click(); expect(pg.locator('.zh-start')).to_be_hidden()
        if pg.locator('.zz-modal-back').count(): pg.keyboard.press('Escape')
        pg.locator('.za-add').click(); pg.fill('#za-add-title', '[시험] 판서 안건')
        pg.locator('.zz-modal-actions button', has_text='추가').click()
        item = pg.locator('.za-item', has_text='[시험] 판서 안건'); expect(item).to_be_visible()
        with pg.expect_file_chooser() as fc: item.locator('.za-upload').click()
        fc.value.set_files(self.pdf)
        expect(pg.locator('.za-up .za-muted').first).to_contain_text('2쪽', timeout=60000)
        pg.locator('.za-up-actions button', has_text='이대로 올리기').click()
        expect(item.locator('.za-meta')).to_contain_text('2쪽', timeout=60000)
        item.locator('.za-present').click(); pg.locator('.zz-modal-actions button', has_text='예').click()
        expect(pg.locator('.zv-band.is-presenting')).to_be_visible()
        pg.wait_for_function("[...document.images].some(i => i.src.startsWith('blob:') && i.complete && i.naturalWidth > 0)", timeout=45000)
        # 둘째 기기(참여자)
        self.ctx2, p2 = self.newctx(tokb, 'part'); self.p2 = p2
        p2.goto(f'{BASE}/zzoom#/m/{self.mid}', wait_until='domcontentloaded')
        p2.locator('#zz-join .zl-go').click(); expect(p2.locator('#zz-join')).to_be_hidden()
        expect(p2.locator('.zv-pageno')).to_have_text('1 / 2')
        p2.wait_for_function("[...document.images].some(i => i.src.startsWith('blob:') && i.complete && i.naturalWidth > 0)", timeout=45000)
        pg.wait_for_timeout(1500)

    # ---- 도우미 ----
    def pagerect(self, pg):
        return pg.evaluate("""()=>{const c=document.getElementById('zz-layer-bg');const r=c.getBoundingClientRect();
 const sx=c.width/r.width, sy=c.height/r.height; const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;
 const bg=[d[0],d[1],d[2],d[3]]; let mx=1e9,my=1e9,Mx=-1,My=-1;
 for(let y=0;y<c.height;y+=2)for(let x=0;x<c.width;x+=2){const i=(y*c.width+x)*4; if(d[i]!==bg[0]||d[i+1]!==bg[1]||d[i+2]!==bg[2]||d[i+3]!==bg[3]){if(x<mx)mx=x;if(x>Mx)Mx=x;if(y<my)my=y;if(y>My)My=y;}}
 if(Mx<0) return [r.left+r.width*0.25,r.top+r.height*0.25,r.width*0.5,r.height*0.5];
 return [r.left+mx/sx,r.top+my/sy,(Mx-mx)/sx,(My-my)/sy]}""")

    def path(self, pg, band=0.5, span=(0.2, 0.8), n=40, amp=0.04, rect=None):
        l, t, w, h = rect or self.pagerect(pg)
        pts = []
        for i in range(n):
            u = i / (n - 1)
            x = l + w * (span[0] + (span[1] - span[0]) * u)
            y = t + h * (band + amp * __import__('math').sin(u * 6.28))
            pts.append([round(x, 1), round(y, 1)])
        return pts

    def pen_on(self, pg):
        btn = pg.locator('.zd-pen-toggle')
        if btn.count() == 0 or not btn.is_visible(): return False
        if btn.get_attribute('aria-pressed') != 'true': btn.click()
        pg.wait_for_timeout(300)
        return True

    def choose(self, pg, tool, color_idx=0):
        pg.locator(f'.zd-tool[data-tool="{tool}"]').click()
        if tool != 'eraser' and color_idx is not None:
            sw = pg.locator('.zd-swatch')
            if sw.count() > color_idx: sw.nth(color_idx).click()

    def stroke(self, pg, pts, kind):
        """합성 포인터 이벤트(캔버스에 바로 보냄). 실제 입력(hit-test 통과)은 real_try 가 따로 본다."""
        pg.evaluate(DISPATCH_JS, {'pts': pts, 'type': kind, 'id': random.randint(10, 9999), 'delay': 6})

    def real_try(self, pg):
        pr = self.pagerect(pg)
        cx, cy = pr[0] + pr[2] / 2, pr[1] + pr[3] / 2
        hit = pg.evaluate("""([x,y])=>{const e=document.elementFromPoint(x,y);const t=document.getElementById('zz-layer-temp');return {top:e.tagName+'#'+e.id+'.'+e.className, tempPE:getComputedStyle(t).pointerEvents, ovPE:getComputedStyle(document.querySelector('.zv-overlay')).pointerEvents}}""", [cx, cy])
        pg.evaluate("""()=>{const t=document.getElementById('zz-layer-temp');window.__ev=[];['pointerdown','pointermove','pointerup'].forEach(n=>t.addEventListener(n,e=>window.__ev.push(n+':'+e.pointerType)));}""")
        pts = [[cx - 100 + 200 * i / 29, cy + 25 * __import__('math').sin(i / 5)] for i in range(30)]
        b0 = self.ink(pg)['total']
        pg.mouse.move(*pts[0]); pg.mouse.down()
        for p in pts[1:]: pg.mouse.move(*p)
        pg.mouse.up(); pg.wait_for_timeout(500)
        ev_m = pg.evaluate('window.__ev.length'); r = self.ink(pg, pts=pts, r=6)
        note(f'2a. 실제 마우스(page.mouse) 끌기: 맨 위 요소={hit["top"]}, temp pointer-events={hit["tempPE"]}, .zv-overlay pointer-events={hit["ovPE"]}, temp 캔버스가 받은 포인터 이벤트 {ev_m}개, 잉크 {b0}->{r["total"]}, 일치율 {r["cover"]:.2f}')
        self.shot('real_mouse', pg)
        if self.touch:
            pg.evaluate("window.__ev=[]")
            cdp = pg.context.new_cdp_session(pg)
            pts2 = [[x, y + 60] for x, y in pts]
            cdp.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [{'x': pts2[0][0], 'y': pts2[0][1]}]})
            for q in pts2[1:]:
                cdp.send('Input.dispatchTouchEvent', {'type': 'touchMove', 'touchPoints': [{'x': q[0], 'y': q[1]}]}); pg.wait_for_timeout(10)
            cdp.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []}); pg.wait_for_timeout(500)
            r2 = self.ink(pg, pts=pts2, r=6)
            note(f'2b. 실제 터치(CDP) 끌기: temp 가 받은 이벤트 {pg.evaluate("window.__ev.length")}개, 일치율 {r2["cover"]:.2f}, scrollY {pg.evaluate("window.scrollY")}')
            self.shot('real_touch', pg)

    def ink(self, pg, **kw):
        return pg.evaluate(INK_JS, kw or None)

    def wait_ink(self, pg, base_total, timeout=20.0, **kw):
        t0 = time.time()
        while time.time() - t0 < timeout:
            r = self.ink(pg, **kw)
            if r['total'] > base_total + 30 and (kw.get('band') is None or r['band']): return round(time.time() - t0, 2), r
            pg.wait_for_timeout(250)
        return None, self.ink(pg, **kw)

    def toasts(self, pg):
        try: return pg.evaluate('window.__toasts||[]')
        except Exception: return []

    # ---- 시험 ----
    def run(self):
        note(f'\n## 너비 {self.w} ({"터치" if self.touch else "마우스"})  {datetime.now():%H:%M:%S}')
        self.setup()
        pg, p2 = self.pg, self.p2
        self.shot('host_ready', pg); self.shot('part_ready', p2)
        # 1. 발견
        tg = pg.locator('.zd-pen-toggle')
        vis = tg.count() and tg.is_visible()
        label = tg.inner_text().strip() if tg.count() else None
        bb = tg.bounding_box() if vis else None
        note(f'1. 펜 단추 보임={bool(vis)} 라벨={label!r} 크기={bb and (round(bb["width"]),round(bb["height"]))} 위치={bb and (round(bb["x"]),round(bb["y"]))} (뷰포트 {self.w})')
        self.shot('pen_btn', pg)
        if not vis: note('   !! 펜 단추가 없음 — 이후 중단'); return
        kinds = ['mouse'] if not self.touch else ['touch']
        kinds.append('pen')
        self.pen_on(pg)
        pg.wait_for_timeout(300)
        note(f'   펜 켠 뒤: 도구 {[x.strip() for x in pg.locator(".zd-tool").all_inner_texts()]} 색 {pg.locator(".zd-swatch").count()}개 body.is-pen={pg.evaluate("document.body.classList.contains(\'is-pen\')")}')
        self.shot('pen_on', pg)
        self.real_try(pg)
        base = self.ink(pg)['total']
        # 2~4. 그리기 / 정렬 / 둘째 기기 / 새로고침
        for kind in kinds:
            self.choose(pg, 'pen', 0)
            band = 0.35 if kind in ('mouse', 'touch') else 0.55
            pts = self.path(pg, band=band)
            b0 = self.ink(pg)['total']
            t_up = time.time(); self.stroke(pg, pts, kind)
            pg.wait_for_timeout(200)
            r = self.ink(pg, pts=pts, r=6)
            note(f'2. [{kind}] 내 화면 즉시: 잉크픽셀 {b0}->{r["total"]}, 경로 일치율 {r["cover"]:.2f}, 잉크 bbox {[round(v) for v in r["bbox"]] if r["bbox"] else None}, 경로 bbox {[round(pts[0][0]),round(min(p[1] for p in pts)),round(pts[-1][0]),round(max(p[1] for p in pts))]}')
            self.shot(f'drawn_{kind}', pg)
            # 둘째 기기: 같은 쪽 비율 좌표
            pr2 = self.pagerect(p2); pr1 = self.pagerect(pg)
            pts2 = [[pr2[0] + (x - pr1[0]) / pr1[2] * pr2[2], pr2[1] + (y - pr1[1]) / pr1[3] * pr2[3]] for x, y in pts]
            b2 = self.ink(p2)['total']
            dt, r2 = self.wait_ink(p2, b2, timeout=25, pts=pts2, r=7)
            if dt is None: note(f'3. [{kind}] 둘째 기기에 25초 안에 안 나타남 (잉크 {r2["total"]}) !!')
            else:
                await_cov = None
                p2.wait_for_timeout(500); rr = self.ink(p2, pts=pts2, r=7); await_cov = rr['cover']
                note(f'3. [{kind}] 둘째 기기 나타남 {dt}s (손 뗀 시각 기준 약 {round(time.time()-t_up-0.5,1)}s 경과 측정), 경로 일치율 {await_cov:.2f}')
            self.shot(f'part_sees_{kind}', p2)
            self.last_pts = (pts, pts2)
        # 4. 새로고침
        pg.reload(); pg.wait_for_timeout(500)
        try:
            pg.locator('#zz-join .zl-go').click(timeout=6000)
        except Exception: pass
        pg.wait_for_function("[...document.images].some(i => i.src.startsWith('blob:') && i.complete && i.naturalWidth > 0)", timeout=45000)
        pg.wait_for_timeout(2500)
        pts, _ = self.last_pts
        rr = self.ink(pg)
        note(f'4. 새로고침 후 호스트 화면 잉크픽셀 {rr["total"]} (이전 {base}→그린 뒤 위 값)')
        self.shot('after_reload', pg)
        self.pen_on(pg)
        # 5. 형광펜/펜/지우개
        self.choose(pg, 'hl', 0); pts_h = self.path(pg, band=0.6)   # 펜 선(0.8)과 안 겹치게(감사 R7 P4: 판정 오염)
        self.stroke(pg, pts_h, kinds[0]); pg.wait_for_timeout(300)
        rh = self.ink(pg, pts=pts_h, r=6)
        self.choose(pg, 'pen', 1); pts_p = self.path(pg, band=0.8)
        self.stroke(pg, pts_p, kinds[0]); pg.wait_for_timeout(300)
        rp = self.ink(pg, pts=pts_p, r=6)
        note(f'5. 형광펜 일치율 {rh["cover"]:.2f}, 펜(색2) 일치율 {rp["cover"]:.2f}')
        self.shot('hl_pen', pg)
        # 둘째 기기 반영 대기
        pr1 = self.pagerect(pg); pr2 = self.pagerect(p2)
        conv = lambda pts: [[pr2[0] + (x - pr1[0]) / pr1[2] * pr2[2], pr2[1] + (y - pr1[1]) / pr1[3] * pr2[3]] for x, y in pts]
        bandp2 = [min(p[1] for p in conv(pts_p)) - 6, max(p[1] for p in conv(pts_p)) + 6]
        dt, _ = self.wait_ink(p2, 0, timeout=25, band=bandp2)
        note(f'   펜(밴드 0.8) 둘째 기기 나타남 {dt}s')
        # 선이 둘째 기기에 정말 왔는지 먼저 확인 — 안 왔으면 지우개 「사라짐」은 거짓 통과다(감사 R8 N8·R9 S5)
        arrived = self.ink(p2, pts=conv(pts_p), r=3)['cover']
        note(f'   지우기 전 둘째 기기 펜 경로 일치율 {arrived:.2f} (0.5 이상이어야 지우개 판정 의미 있음)')
        # 지우개: 펜 선(0.8) 위를 가로지름
        self.choose(pg, 'eraser', None)
        er_path = [[x, y] for x, y in pts_p]
        t_er = time.time(); self.stroke(pg, er_path, kinds[0])
        pg.wait_for_timeout(400)
        r_after = self.ink(pg, pts=pts_p, r=3)
        note(f'   지우개 후 내 화면 펜 경로 일치율 {r_after["cover"]:.2f} (0.2 미만이면 지워짐)')
        # 둘째 기기
        t0 = time.time(); gone = None
        while arrived >= 0.5 and time.time() - t0 < 25:
            # 지우개 동그라미·형광펜이 섞이지 않게 펜 경로 위 픽셀만 본다(감사 R7 P4)
            if self.ink(p2, pts=conv(pts_p), r=3)['cover'] < 0.2: gone = round(time.time() - t_er, 1); break
            p2.wait_for_timeout(300)
        if arrived < 0.5: note('   !! 둘째 기기에 펜 선이 오지 않아 지우개 판정 못 함(실패로 셈)')
        else: note(f'   둘째 기기에서 사라짐: {gone}s (None=25초 안에 안 사라짐)')
        self.shot('erased_host', pg); self.shot('erased_part', p2)
        # 7. 보기 모드와 충돌 / 터치 스크롤
        self.view_checks(pg)
        # 8. 참여자 펜
        self.part_pen(p2, pg)
        # 6. 빠른 연속(호스트)
        self.rapid(pg, p2, kinds[0])
        # 리사이즈
        self.resize_check(pg, kinds[0])
        # 보고
        tl = self.toasts(pg) + ['(part)' + x for x in self.toasts(p2)]
        note(f'toast 기록: {tl}')
        note(f'>=400 응답: {self.net}')
        note(f'콘솔/페이지 오류 {len(self.errs)}건: {self.errs[:8]}')
        pp = [(round(a - self.posts[0][0], 1), w, m, s, n) for a, w, m, s, n in self.posts[:60]] if self.posts else []
        note(f'획 저장·삭제 요청 {len(self.posts)}건(초,누가,메서드,상태,묶음크기): {pp[:40]}')

    def view_checks(self, pg):
        # 보기 모드로 되돌려 한 손가락/마우스 끌기
        btn = pg.locator('.zd-pen-toggle')
        if btn.get_attribute('aria-pressed') == 'true': btn.click(); pg.wait_for_timeout(300)
        ta = pg.evaluate("()=>{const s=document.getElementById('zz-stage');return {stage:getComputedStyle(s).touchAction, temp:getComputedStyle(document.getElementById('zz-layer-temp')).pointerEvents, sy:window.scrollY, doc:document.documentElement.scrollHeight, ih:innerHeight}}")
        before = self.ink(pg)['total']
        pr = self.pagerect(pg)
        pts = self.path(pg, band=0.15, rect=pr, span=(0.3, 0.7))
        vp0 = [round(v) for v in self.pagerect(pg)]
        if self.touch:
            cdp = pg.context.new_cdp_session(pg)
            def touch_drag(p):
                cdp.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [{'x': p[0][0], 'y': p[0][1]}]})
                for q in p[1:]: cdp.send('Input.dispatchTouchEvent', {'type': 'touchMove', 'touchPoints': [{'x': q[0], 'y': q[1]}]}); pg.wait_for_timeout(10)
                cdp.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []})
            touch_drag(pts)
        else:
            pg.mouse.move(*pts[0]); pg.mouse.down()
            for p in pts[1:]: pg.mouse.move(*p)
            pg.mouse.up()
        pg.wait_for_timeout(400)
        vp1 = [round(v) for v in self.pagerect(pg)]
        after = self.ink(pg)['total']
        sy = pg.evaluate('window.scrollY')
        note(f'7. 보기 모드 끌기: stage touch-action={ta["stage"]}, temp pointer-events={ta["temp"]}, 문서 scrollY {ta["sy"]}->{sy}, 쪽 이동 {vp0}->{vp1}, 잉크 변화 {before}->{after}(그려지면 안 됨)')
        self.shot('view_drag', pg)
        # 확대(ctrl+휠) 뒤 펜
        pg.mouse.move(pr[0] + pr[2] / 2, pr[1] + pr[3] / 2)
        pg.keyboard.down('Control'); pg.mouse.wheel(0, -400); pg.keyboard.up('Control'); pg.wait_for_timeout(600)
        vp2 = [round(v) for v in self.pagerect(pg)]
        zb = pg.locator('[aria-label*="확대"], [aria-label*="맞춤"], .zv-zoom').count()
        note(f'   ctrl+휠 뒤 쪽 크기 {vp0[2]}->{vp2[2]} (확대 단추/요소 {zb}개)')
        self.pen_on(pg); self.choose(pg, 'pen', 2)
        pr = self.pagerect(pg)
        # 보이는 영역 안쪽
        l, t, w, h = pr; sl, st_, sw, sh = pg.evaluate("()=>{const r=document.getElementById('zz-layer-temp').getBoundingClientRect();return [r.left,r.top,r.width,r.height]}")
        cx, cy = sl + sw / 2, st_ + sh / 2
        pts = [[cx - 120 + 240 * i / 39, cy + 30 * __import__('math').sin(i / 6)] for i in range(40)]
        self.stroke(pg, pts, 'mouse' if not self.touch else 'touch')
        pg.wait_for_timeout(300)
        r = self.ink(pg, pts=pts, r=6)
        note(f'   (줌 뒤) 펜 경로 일치율 {r["cover"]:.2f}')
        self.shot('zoomed_pen', pg)
        # 줌 되돌림
        pg.keyboard.down('Control'); pg.mouse.wheel(0, 400); pg.keyboard.up('Control'); pg.wait_for_timeout(400)

    def part_pen(self, p2, pg):
        vis = p2.locator('.zd-pen-toggle').count() and p2.locator('.zd-pen-toggle').is_visible()
        lab = p2.locator('.zd-pen-toggle').inner_text().strip() if p2.locator('.zd-pen-toggle').count() else None
        note(f'8. 참여자 펜 단추 보임={bool(vis)} 라벨={lab!r}')
        if not vis: self.shot('part_nopen', p2); return
        self.pen_on(p2); self.choose(p2, 'pen', 3 if p2.locator('.zd-swatch').count() > 3 else 0)
        pr2 = self.pagerect(p2)
        pts2 = self.path(p2, band=0.25, rect=pr2)
        t_up = time.time(); self.stroke(p2, pts2, 'mouse' if not self.touch else 'touch')
        p2.wait_for_timeout(300)
        r = self.ink(p2, pts=pts2, r=6)
        pr1 = self.pagerect(pg)
        pts1 = [[pr1[0] + (x - pr2[0]) / pr2[2] * pr1[2], pr1[1] + (y - pr2[1]) / pr2[3] * pr1[3]] for x, y in pts2]
        band = [min(p[1] for p in pts1) - 6, max(p[1] for p in pts1) + 6]
        dt, _ = self.wait_ink(pg, 0, timeout=25, band=band)
        note(f'   참여자가 그림: 자기 화면 일치율 {r["cover"]:.2f}; 호스트 화면에 나타남 {dt}s; toast {self.toasts(p2)[-3:]}')
        self.shot('part_drew', p2); self.shot('host_sees_part', pg)

    def rapid(self, pg, p2, kind):
        # 판서 모드 켜기, 빈 밴드 10개(쪽 위쪽부터)
        self.pen_on(pg); self.choose(pg, 'pen', 0)
        l, t, w, h = self.pagerect(pg)
        n0 = len(self.posts); t0 = time.time()
        bands = [0.05 + 0.03 * i for i in range(10)]
        for i, bd in enumerate(bands):
            pts = [[l + w * (0.3 + 0.4 * j / 24), t + h * bd] for j in range(25)]
            self.stroke(pg, pts, kind)
            pg.wait_for_timeout(max(0, int(500 - 40)))
        el = time.time() - t0
        note(f'6. 빠른 10획 소요 {el:.1f}s; 직후 내 화면 밴드별 잉크: {[bool(self.ink(pg, band=[t + h*(b-0.012), t + h*(b+0.012)])["band"]) for b in bands]}')
        pg.wait_for_timeout(12000)
        pr1 = (l, t, w, h); pr2 = self.pagerect(p2)
        have2 = []
        for b in bands:
            y = pr2[1] + pr2[3] * b
            have2.append(bool(self.ink(p2, band=[y - pr2[3] * 0.012, y + pr2[3] * 0.012])['band']))
        note(f'   12초 뒤 둘째 기기에서 보이는 획: {sum(have2)}/10 {have2}')
        post = [x for x in self.posts[n0:] if x[2] == 'POST']
        note(f'   그 사이 POST /strokes {len(post)}번, 상태 {[x[3] for x in post]}, 묶음 크기 {[x[4] for x in post]}; toast {self.toasts(pg)[-4:]}')
        self.shot('rapid_host', pg); self.shot('rapid_part', p2)
        # 새로고침 뒤에도 남는가
        pg.reload()
        try: pg.locator('#zz-join .zl-go').click(timeout=6000)
        except Exception: pass
        pg.wait_for_function("[...document.images].some(i => i.src.startsWith('blob:') && i.complete && i.naturalWidth > 0)", timeout=45000)
        pg.wait_for_timeout(3000)
        l, t, w, h = self.pagerect(pg)
        have = [bool(self.ink(pg, band=[t + h*(b-0.012), t + h*(b+0.012)])['band']) for b in bands]
        note(f'   새로고침 뒤 호스트 화면 획: {sum(have)}/10 {have}')
        self.shot('rapid_after_reload', pg)

    def resize_check(self, pg, kind):
        if self.w < 1000:
            # 폰: 가로로 돌림
            sizes = [(844, 390)]
        else:
            sizes = [(900, 650), (1280, 800)]
        self.pen_on(pg); self.choose(pg, 'pen', 0)
        for (w, h) in sizes:
            pg.set_viewport_size({'width': w, 'height': h}); pg.wait_for_timeout(1200)
            self.pen_on(pg)
            sl, st_, sw, sh = pg.evaluate("()=>{const r=document.getElementById('zz-layer-temp').getBoundingClientRect();return [r.left,r.top,r.width,r.height]}")
            cw, chh, dpr = pg.evaluate("()=>{const c=document.getElementById('zz-layer-temp');return [c.width,c.height,devicePixelRatio]}")
            pr = self.pagerect(pg)
            pts = self.path(pg, band=0.45, rect=pr, span=(0.25, 0.75), amp=0.05)
            # 그리는 도중(손 떼기 전) temp 층 일치
            pg.mouse.move(*pts[0]); pg.mouse.down()
            for p in pts[1:]: pg.mouse.move(*p)
            r_mid = self.ink(pg, pts=pts, r=5)
            pg.mouse.up(); pg.wait_for_timeout(500)
            r = self.ink(pg, pts=pts, r=5)
            note(f'   크기변경 {w}x{h}: 캔버스 {cw}x{chh}(css {sw:.0f}x{sh:.0f}, dpr {dpr}, 배율 x {cw/sw:.2f} y {chh/sh:.2f}); 손 떼기 전 일치율 {r_mid["cover"]:.2f}, 뗀 뒤 {r["cover"]:.2f}')
            self.shot(f'resize_{w}x{h}', pg)

    def cleanup(self):
        for c in self.ctxs:
            try: c.close()
            except Exception: pass


def sweep(tok):
    try:
        req = urllib.request.Request(BASE + '/api/zzoom/meetings', headers={'X-Auth-Token': tok})
        data = json.loads(urllib.request.urlopen(req, timeout=20).read())
        items = data if isinstance(data, list) else (data.get('meetings') or data.get('items') or [])
        for m in items:
            if str(m.get('title', '')).startswith('[시험] 펜 점검') and m.get('id') not in [c[0] for c in CREATED]:
                CREATED.append((m['id'], tok))
    except Exception as e:
        note(f'정리 목록 조회 실패: {e}')


def delete_all():
    try: sweep(login('zz-pen-sweep'))
    except Exception: pass
    for mid, tok in CREATED:
        try:
            req = urllib.request.Request(f'{BASE}/api/zzoom/meetings/{mid}', method='DELETE', headers={'X-Auth-Token': tok})
            st = urllib.request.urlopen(req, timeout=20).status
        except Exception as e:
            st = f'ERR {e}'
        note(f'정리: 회의 {mid} 삭제 -> {st}')


def main():
    if not CODE: print('ZZ_CODE 없음'); return 2
    pdf = os.path.join(tempfile.gettempdir(), 'zz_pen_check.pdf'); make_pdf(pdf)
    note(f'\n# 실행 {datetime.now():%Y-%m-%d %H:%M:%S}  {BASE}')
    with sync_playwright() as pw:
        b = pw.chromium.launch(channel='msedge', headless=True)
        for w in WIDTHS:
            r = Run(w, b, pdf)
            try: r.run()
            except Exception as e:
                import traceback; traceback.print_exc()
                note(f'   !! 너비 {w} 실행 중 예외: {str(e).strip().splitlines()[0][:200] if str(e).strip() else type(e).__name__}')
                try: r.shot('exception', r.pg)
                except Exception: pass
            finally:
                r.cleanup()
        b.close()
    delete_all()
    print('스크린샷:', SHOTS)
    print(f'결과: 실패 {len(FAILS)}건')
    return 1 if FAILS else 0


if __name__ == '__main__':
    sys.exit(main())
