# 디자인 3팀 화면 시험: python tests/zzoom/draw_e2e.py [스크린샷 폴더]
# 서버·Firebase 없이 진짜 index.html·zzoom.css·draw.js·board.js 를 띄우고, app.js 자리에 가짜 조립(가짜 api·store·2팀 흉내)을 끼운다.
# 엣지(msedge)·크로미움 × 1280x800·820x1180 네 번 돈다. 스크린샷은 저장소 밖 폴더에.
import sys, os, json, mimetypes, tempfile, traceback
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2] / 'public'
SHOTS = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(tempfile.gettempdir()) / 'zz-d3-shots'
SHOTS.mkdir(parents=True, exist_ok=True)
BASE = 'http://zz.test'

FAKE_APP = r"""
// ---- 가짜 조립(app.js 자리) ----
const qs = new URLSearchParams(location.search);
const listeners = new Map();
const state = {};
const store = {
  get: k => state[k],
  set: (k, v) => { const p = state[k]; state[k] = v; (listeners.get(k) || []).slice().forEach(f => f(v, p)); },
  patch: (k, v) => store.set(k, { ...(state[k] || {}), ...v }),
  on: (k, f) => { if (!listeners.has(k)) listeners.set(k, []); listeners.get(k).push(f); return () => { const a = listeners.get(k); const i = a.indexOf(f); if (i >= 0) a.splice(i, 1); }; },
  emit: (k, d) => (listeners.get(k) || []).slice().forEach(f => f(d)),
};
class ZzError extends Error { constructor(status, code, message, extra) { super(message); this.status = status; this.code = code; this.extra = extra || {}; } }
// 가짜 서버 상태
const db = { strokes: [], epochs: {}, seq: {}, calls: [], fail: null, n: 0, lastOk: 0, force429: 0, sub: {}, unsub: {}, r429: 0, epochDelay: 0, esub: {}, eunsub: {} };
const subs = { strokes: new Map(), epoch: new Map() };
const tellStrokes = key => (subs.strokes.get(key) || []).forEach(cb => cb.length === 0 ? cb() : cb(db.strokes.filter(s => s.pageKey === key).sort((a, b) => a.seq - b.seq)));
const tellEpoch = key => (subs.epoch.get(key) || []).forEach(cb => cb(db.epochs[key] || 0));
const later = (fn, ms = 30) => new Promise((res, rej) => setTimeout(() => { try { res(fn()); } catch (e) { rej(e); } }, ms));
const ME = { cid: 'c_me', name: '권선생' };
const api = {
  subscribePageStrokes(key, cb) { db.sub[key] = (db.sub[key] || 0) + 1; db.via = 'page'; const f = () => cb(db.strokes.filter(s => s.pageKey === key && s.epoch === (db.epochs[key] || 0)).sort((a, b) => a.seq - b.seq)); if (!subs.strokes.has(key)) subs.strokes.set(key, []); subs.strokes.get(key).push(f); setTimeout(f, 5); return () => { db.unsub[key] = (db.unsub[key] || 0) + 1; const a = subs.strokes.get(key); a.splice(a.indexOf(f), 1); }; },
  subscribeStrokes(mid, key, cb) { db.sub[key] = (db.sub[key] || 0) + 1; db.via = 'old'; const u0 = () => { db.unsub[key] = (db.unsub[key] || 0) + 1; }; if (!subs.strokes.has(key)) subs.strokes.set(key, []); subs.strokes.get(key).push(cb); setTimeout(() => cb(db.strokes.filter(s => s.pageKey === key)), 5); return () => { u0(); const a = subs.strokes.get(key); a.splice(a.indexOf(cb), 1); }; },
  subscribePageEpoch(mid, key, cb) { if (!subs.epoch.has(key)) subs.epoch.set(key, []); subs.epoch.get(key).push(cb); db.esub[key] = (db.esub[key] || 0) + 1; setTimeout(() => cb(db.epochs[key] || 0), db.epochDelay || 5); return () => { db.eunsub[key] = (db.eunsub[key] || 0) + 1; const a = subs.epoch.get(key); a.splice(a.indexOf(cb), 1); }; },
  saveStrokes(mid, list) {
    db.calls.push(['save', list.length, Date.now()]);
    return later(() => {
      if (db.fail === 'network') throw new ZzError(0, 'network', '연결이 끊겼습니다.');
      if (db.force429 > 0) { db.force429--; db.r429++; throw new ZzError(429, 'rate_limited', '요청이 너무 잦습니다.'); }
      if (Date.now() - db.lastOk < 1000) { db.r429++; throw new ZzError(429, 'rate_limited', '요청이 너무 잦습니다.'); }
      if (list.length > 20) throw new ZzError(400, 'bad_strokes', '선은 한 번에 1~20개입니다.');
      db.lastOk = Date.now();
      for (const s of list) if ((db.epochs[s.pageKey] || 0) !== s.epoch) throw new ZzError(409, 'stale_epoch', '이 쪽은 이미 지워졌습니다.', { pageKey: s.pageKey, epoch: db.epochs[s.pageKey] || 0 });
      const out = list.map(s => {
        const seq = db.seq[s.pageKey] = (db.seq[s.pageKey] || 0) + 1;
        const id = 's' + (++db.n);
        db.strokes.push({ ...s, id, seq, cid: ME.cid, name: ME.name, at: Date.now() });
        return { id, seq, pageKey: s.pageKey };
      });
      setTimeout(() => [...new Set(list.map(s => s.pageKey))].forEach(tellStrokes), 120); // 구독은 조금 늦게 옴
      return { strokes: out, at: Date.now() };
    }, 80);
  },
  deleteStroke(mid, sid) {
    db.calls.push(['delete', sid, Date.now()]);
    return later(() => { const s = db.strokes.find(x => x.id === sid); if (!s) throw new ZzError(404, 'not_found', '선이 없습니다.'); db.strokes = db.strokes.filter(x => x.id !== sid); tellStrokes(s.pageKey); return { ok: true }; });
  },
  clearPage(mid, key) { db.calls.push(['clear', key]); return later(() => { db.epochs[key] = (db.epochs[key] || 0) + 1; db.strokes = db.strokes.filter(s => s.pageKey !== key); tellEpoch(key); tellStrokes(key); return { pageKey: key, epoch: db.epochs[key] }; }); },
  createBoard(mid, bg) { db.calls.push(['board', bg]); return later(() => { const n = state.agenda.filter(a => a.kind === 'board').length + 1; const a = { aid: 'bboard0' + n, title: '화이트보드 ' + n, kind: 'board', bg, pages: 1, sizes: [{ w: 1600, h: 1000 }], ver: 1, boardNo: n }; store.set('agenda', [...state.agenda, a]); return { aid: a.aid, agenda: a, live: null }; }); },
  addBoardPage(mid, aid) { db.calls.push(['addPage', aid]); return later(() => { const ag = state.agenda.map(a => a.aid === aid ? { ...a, pages: a.pages + 1, sizes: [...a.sizes, { w: 1600, h: 1000 }] } : a); store.set('agenda', ag); return { aid, pages: ag.find(a => a.aid === aid).pages }; }); },
};
if (qs.get('old')) delete api.subscribePageStrokes;
const el = id => { const n = document.getElementById(id); if (!n) throw new Error('자리 없음 ' + id); return n; };
const ctx = {
  api, store, el, mid: 'mtest01', t: (s, v) => s.replace(/\{([^}]+)\}/g, (m, k) => (v && k in v ? v[k] : m)),
  assets: n => `/zzoom/assets/${n}.webp`,
  toast: (text, kind = 'info') => store.emit('toast', { text, kind }),
  modal({ title, body, actions = [] }) {
    const root = el('zz-modal-root');
    const back = document.createElement('div'); back.className = 'zz-modal-back';
    const box = document.createElement('div'); box.className = 'zz-modal'; box.setAttribute('role', 'dialog');
    const h = document.createElement('h2'); h.textContent = title;
    const act = document.createElement('div'); act.className = 'zz-modal-actions';
    const close = () => back.remove();
    for (const a of actions) { const b = document.createElement('button'); b.type = 'button'; b.className = 'zz-btn' + (a.primary ? ' primary' : ''); b.textContent = a.label; b.onclick = a.onClick; act.append(b); }
    box.append(h, body, act); back.append(box); root.append(back);
    return { el: box, close };
  },
};
window.__toasts = [];
store.on('toast', d => { window.__toasts.push(d); const t = document.createElement('div'); t.className = 'zz-toast-item ' + (d.kind || ''); t.textContent = d.text; el('zz-toast').append(t); setTimeout(() => t.remove(), 2500); });
store.on('tool', v => document.body.classList.toggle('is-pen', v?.mode === 'pen'));

// ---- 2팀(viewer) 흉내: canvas 크기·viewport·바탕·두 손가락 ----
const stage = el('zz-stage');
const bgc = el('zz-layer-bg'), inkc = el('zz-layer-ink'), tmpc = el('zz-layer-temp');
let paintBoard = null;
let cur = { aid: 'apdf00001', page: 1 };
function layout() {
  const a = state.agenda.find(x => x.aid === cur.aid) || state.agenda[0];
  const sz = a.sizes[cur.page - 1] || a.sizes[0];
  const r = stage.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
  for (const c of [bgc, inkc, tmpc]) { c.width = Math.round(r.width * dpr); c.height = Math.round(r.height * dpr); }
  const scale = Math.min(r.width / sz.w, r.height / sz.h) * 0.92;
  const ox = (r.width - sz.w * scale) / 2, oy = (r.height - sz.h * scale) / 2;
  const g = bgc.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, r.width, r.height);
  const rect = { x: ox, y: oy, w: sz.w * scale, h: sz.h * scale };
  if (a.kind === 'board') { (paintBoard || ((c, q) => { c.fillStyle = '#fff'; c.fillRect(q.x, q.y, q.w, q.h); }))(g, rect, a.bg); }
  else {
    g.fillStyle = '#fff'; g.fillRect(rect.x, rect.y, rect.w, rect.h);
    g.fillStyle = '#1d1d1f'; g.font = `600 ${Math.round(48 * scale)}px sans-serif`; g.fillText('2026 학교 교육과정 협의 (쪽 ' + cur.page + ')', rect.x + 90 * scale, rect.y + 140 * scale);
    g.fillStyle = '#c9c9ce'; for (let i = 0; i < 14; i++) g.fillRect(rect.x + 90 * scale, rect.y + (230 + i * 58) * scale, (1100 - (i % 4) * 140) * scale, 18 * scale);
  }
  const pageKey = `${a.aid}_${cur.page}`;
  store.set('page', { aid: a.aid, page: cur.page, pageKey, view: { cx: .5, cy: .5, z: 1 } });
  store.set('viewport', { aid: a.aid, page: cur.page, pageKey, pageW: sz.w, pageH: sz.h, scale, ox, oy, dpr, stageW: r.width, stageH: r.height });
}
store.on('cmd:nav', d => { cur = { aid: d.aid, page: d.page }; layout(); });
const pts = new Set();
stage.addEventListener('pointerdown', e => { pts.add(e.pointerId); if (pts.size === 2) store.emit('gesture', 'multi'); });
for (const t of ['pointerup', 'pointercancel']) stage.addEventListener(t, e => pts.delete(e.pointerId));
new ResizeObserver(() => layout()).observe(stage);

// ---- 조립 ----
document.body.classList.add('route-meeting', 'zz');
document.body.classList.remove('route-list');
el('zz-meeting').hidden = false;
// 1024px 미만 새 배치: 옆칸은 덮개(처음엔 닫힘) — 진짜 app.js 처럼 side-closed 로 시작
if (innerWidth < 1024) document.body.classList.add('side-closed');
const role = qs.get('role') || 'host';
if (role === 'host') document.body.classList.add('is-host');
store.set('role', { role, cid: ME.cid, name: ME.name, presenter: role === 'host' });
store.set('meeting', { id: 'mtest01', status: 'live', penLock: false });
store.set('agenda', [{ aid: 'apdf00001', title: '교육과정', kind: 'pdf', pages: 3, sizes: [{ w: 1600, h: 1131 }, { w: 1600, h: 1131 }, { w: 1600, h: 1131 }], ver: 1 }]);
const D = await import('/zzoom/draw.js');
const B = await import('/zzoom/board.js');
for (const m of [D, B]) if (m.css) { const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = '/zzoom/' + m.css; document.head.append(l); }
paintBoard = B.paintBoardBackground;
await new Promise(r => setTimeout(r, 50));
layout();
const mods = [D.mount(ctx), B.mount(ctx)];
window.__zz = { store, db, api, D, B, mods, ZzError, layout, agendaAdd() { store.set('agenda', [...state.agenda, { aid: 'apdf00002', title: '학사일정', kind: 'pdf', pages: 2, sizes: [{ w: 1600, h: 1131 }, { w: 1600, h: 1131 }], ver: 1 }]); }, otherStroke(s) { const key = state.page.pageKey; const seq = db.seq[key] = (db.seq[key] || 0) + 1; db.strokes.push({ id: 'o' + (++db.n), pageKey: key, epoch: db.epochs[key] || 0, seq, cid: 'c_other', name: '김○수', at: Date.now(), ...s }); tellStrokes(key); } };
window.__ready = true;
"""

results = []
def check(name, cond, info=''):
    results.append((name, bool(cond), info))
    print(('  PASS ' if cond else '  FAIL ') + name + (f'  ({info})' if info and not cond else ''))

def route(r):
    url = r.request.url
    path = url[len(BASE):].split('?')[0].split('#')[0]
    if path == '/zzoom/app.js':
        return r.fulfill(status=200, content_type='text/javascript', body=FAKE_APP)
    if path in ('/zzoom', '/zzoom/'):
        path = '/zzoom/index.html'
    f = ROOT / path.lstrip('/')
    if f.is_file():
        ct = mimetypes.guess_type(str(f))[0] or 'application/octet-stream'
        if f.suffix in ('.js', '.mjs'): ct = 'text/javascript'
        if f.suffix == '.webp': ct = 'image/webp'
        return r.fulfill(status=200, content_type=ct, body=f.read_bytes())
    return r.fulfill(status=404, body='')

def ink_pixels(page, layer='zz-layer-ink'):
    return page.evaluate("""(id) => { const c = document.getElementById(id); const d = c.getContext('2d').getImageData(0,0,c.width,c.height).data; let n=0; for (let i=3;i<d.length;i+=4) if (d[i]>0) n++; return n; }""", layer)

def stage_box(page):
    return page.evaluate("""() => { const v = window.__zz.store.get('viewport'); const r = document.getElementById('zz-stage').getBoundingClientRect(); return {x: r.left + v.ox, y: r.top + v.oy, w: v.pageW*v.scale, h: v.pageH*v.scale}; }""")

def drag(page, pts, steps=12):
    page.mouse.move(*pts[0]); page.mouse.down()
    for p in pts[1:]: page.mouse.move(*p, steps=steps)
    page.mouse.up()

OLD = False
def run(pw, browser_name, size, old=False):
    global OLD
    OLD = old
    tag = f'{browser_name}-{size[0]}x{size[1]}' + ('-old' if old else '')
    print(f'== {tag}')
    kw = {'channel': 'msedge'} if browser_name == 'msedge' else {}
    br = pw.chromium.launch(**kw)
    errors = []
    try:
        cx = br.new_context(viewport={'width': size[0], 'height': size[1]}, device_scale_factor=2 if size[0] < 1000 else 1, has_touch=size[0] < 1000)
        cx.add_init_script('window.__zzBoot = 1')   # app.js 를 가짜로 바꾸므로 첫 화면 감시(index.html)가 다시 읽지 않게
        cx.route(f'{BASE}/**', route)
        cx.route('https://cdn.jsdelivr.net/**', lambda r: r.fulfill(status=200, content_type='text/css', body=''))
        page = cx.new_page()
        page.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None)
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.goto(f'{BASE}/zzoom/' + ('?old=1' if old else '') + '#/m/mtest01')
        page.wait_for_function('window.__ready === true', timeout=10000)
        page.wait_for_timeout(200)

        # 1. 도구 막대·펜 모드
        check(f'{tag} 도구 막대 그려짐', page.locator('#zz-toolbar .zd-bar').count() == 1)
        check(f'{tag} 보기 모드에서는 도구 숨김', page.locator('.zd-tools').is_hidden())
        page.screenshot(path=str(SHOTS / f'{tag}-1-view.png'))
        page.get_by_role('button', name='펜으로 쓰기').click()
        check(f'{tag} 단추 글자가 「펜 끄기」로', page.locator('.zd-pen-toggle').inner_text().strip() == '펜 끄기')
        check(f'{tag} 펜 모드 → body.is-pen', page.evaluate("document.body.classList.contains('is-pen')"))
        check(f'{tag} store tool.mode=pen', page.evaluate("window.__zz.store.get('tool').mode") == 'pen')
        check(f'{tag} 44px 터치 영역', page.evaluate("""() => [...document.querySelectorAll('#zz-toolbar button:not([hidden])')].filter(b => b.offsetParent).every(b => { const r = b.getBoundingClientRect(); return r.width >= 44 && r.height >= 44; })"""))
        # 2. 형광펜 한 획 → 1초 안팎에 저장
        b = stage_box(page)
        drag(page, [(b['x'] + b['w']*0.15, b['y'] + b['h']*0.13), (b['x'] + b['w']*0.6, b['y'] + b['h']*0.14)])
        page.wait_for_timeout(40)  # 한 프레임
        check(f'{tag} 그린 즉시 내 화면에 보임(낙관적)', ink_pixels(page) > 50)
        page.wait_for_function("window.__zz.db.strokes.length >= 1", timeout=4000)
        s = page.evaluate("window.__zz.db.strokes[0]")
        check(f'{tag} 저장 모양(pageKey·epoch·tool·색·w)', s['pageKey'] == 'apdf00001_1' and s['epoch'] == 0 and s['tool'] == 'hl' and s['color'] == '#FFE14D' and abs(s['w'] - 0.018) < 1e-9, json.dumps({k: s[k] for k in ('pageKey', 'epoch', 'tool', 'color', 'w')}))
        p = s['pts']
        check(f'{tag} pts 3의 배수·0~1·자릿수', len(p) % 3 == 0 and len(p) >= 6 and all(0 <= v <= 1 for v in p) and all(round(v, 4) == v for v in p))
        check(f'{tag} 쪽 비율 좌표가 맞음', abs(p[0] - 0.15) < 0.01 and abs(p[1] - 0.13) < 0.01, f'{p[0]},{p[1]}')
        check(f'{tag} 마우스는 p=0.5', all(p[i] == 0.5 for i in range(2, len(p), 3)))
        # 3. 펜 빨강, 두 획 빨리 → 1초 1회로 묶여 감
        page.get_by_role('button', name='펜', exact=True).click()
        page.get_by_role('button', name='빨강').click()
        n0 = page.evaluate("window.__zz.db.calls.filter(c => c[0]==='save').length")
        drag(page, [(b['x'] + b['w']*0.15, b['y'] + b['h']*0.3), (b['x'] + b['w']*0.3, b['y'] + b['h']*0.4), (b['x'] + b['w']*0.45, b['y'] + b['h']*0.3)])
        drag(page, [(b['x'] + b['w']*0.5, b['y'] + b['h']*0.3), (b['x'] + b['w']*0.7, b['y'] + b['h']*0.42)])
        page.wait_for_function("window.__zz.db.strokes.length >= 3", timeout=5000)
        saves = page.evaluate("window.__zz.db.calls.filter(c => c[0]==='save')")
        gaps = [saves[i][2] - saves[i-1][2] for i in range(1, len(saves))]
        check(f'{tag} 저장 간격 1초 이상', all(g >= 1000 for g in gaps), str(gaps))
        check(f'{tag} 펜 빨강 저장', page.evaluate("window.__zz.db.strokes.slice(-1)[0].color") == '#E5484D')
        # 4. 필압 펜(포인터 이벤트 직접)
        page.evaluate("""() => { const t = document.getElementById('zz-layer-temp'); const r = t.getBoundingClientRect(); const v = window.__zz.store.get('viewport');
          const at = (x, y, p, type) => t.dispatchEvent(new PointerEvent(type, { pointerId: 77, pointerType: 'pen', isPrimary: true, pressure: p, clientX: r.left + v.ox + x*v.pageW*v.scale, clientY: r.top + v.oy + y*v.pageH*v.scale, bubbles: true, buttons: 1 }));
          at(.2, .6, .2, 'pointerdown'); for (let i = 1; i <= 30; i++) at(.2 + i*.015, .6 + Math.sin(i/4)*.03, .2 + i*.02, 'pointermove'); at(.65, .6, .8, 'pointerup'); }""")
        page.wait_for_function("window.__zz.db.strokes.length >= 4", timeout=5000)
        pp = page.evaluate("window.__zz.db.strokes.slice(-1)[0].pts")
        check(f'{tag} 펜 필압 저장(0.5 아님)', len(set(pp[2::3])) > 3 and min(pp[2::3]) < 0.3 and max(pp[2::3]) > 0.7)
        # 5. 1,500점 넘는 획 → group·part 로 나눔
        page.evaluate("""() => { const t = document.getElementById('zz-layer-temp'); const r = t.getBoundingClientRect(); const v = window.__zz.store.get('viewport');
          const at = (x, y, type) => t.dispatchEvent(new PointerEvent(type, { pointerId: 78, pointerType: 'mouse', isPrimary: true, button: 0, buttons: 1, clientX: r.left + v.ox + x*v.pageW*v.scale, clientY: r.top + v.oy + y*v.pageH*v.scale, bubbles: true }));
          at(.1, .75, 'pointerdown'); for (let i = 1; i <= 2400; i++) at(.1 + (i % 600) / 600 * .8, .75 + (i % 2) * .02 + Math.floor(i/600)*.03, 'pointermove'); at(.9, .9, 'pointerup'); }""")
        page.wait_for_function("window.__zz.db.strokes.filter(s => s.group).length >= 2", timeout=6000)
        parts = page.evaluate("window.__zz.db.strokes.filter(s => s.group).map(s => [s.group, s.part, s.pts.length])")
        check(f'{tag} 긴 획 나눔(1,500점 이하 조각, 같은 group)', len(parts) >= 2 and len({x[0] for x in parts}) == 1 and all(x[2] <= 4500 for x in parts) and sorted(x[1] for x in parts) == list(range(len(parts))), str(parts))
        page.wait_for_timeout(400)
        page.screenshot(path=str(SHOTS / f'{tag}-2-drawn.png'))
        # 6. 실패하면 흐리게 + 다시 보내기
        page.evaluate("Object.assign(window.__zz.D.RETRY, { tries: 3, base: 150, max: 400 }); window.__zz.db.fail = 'network'")
        page.get_by_role('button', name='파랑').click()
        drag(page, [(b['x'] + b['w']*0.2, b['y'] + b['h']*0.5), (b['x'] + b['w']*0.8, b['y'] + b['h']*0.55)])
        page.wait_for_selector('.zd-retry:not([hidden])', timeout=30000)
        check(f'{tag} 실패 안내 문구', '선 1개를 보내지 못했어요' in page.inner_text('.zd-retry'))
        page.screenshot(path=str(SHOTS / f'{tag}-3-failed.png'))
        before = page.evaluate("window.__zz.db.strokes.length")
        c0 = page.evaluate("window.__zz.db.calls.filter(c => c[0]==='save').length")
        page.evaluate("window.__zz.store.set('conn', { server: 'ok', firebase: 'ok' }); window.__zz.store.set('conn', { server: 'ok', firebase: 'ok' })")
        page.wait_for_timeout(400)
        check(f'{tag} heartbeat 마다 같은 ok 는 다시 보내기 안 함', page.evaluate("window.__zz.db.calls.filter(c => c[0]==='save').length") == c0 and page.locator('.zd-retry').is_visible())
        page.evaluate("window.__zz.store.set('conn', { server: 'off', firebase: 'ok' }); window.__zz.store.set('conn', { server: 'ok', firebase: 'ok' })")
        page.wait_for_timeout(400)
        check(f'{tag} 연결 off 에서 ok 로 돌아오면 한 번 다시 보냄', page.evaluate("window.__zz.db.calls.filter(c => c[0]==='save').length") > c0)
        page.wait_for_selector('.zd-retry:not([hidden])', timeout=30000)
        page.evaluate("window.__zz.db.fail = null")
        page.get_by_role('button', name='다시 보내기').click()
        page.wait_for_function(f"window.__zz.db.strokes.length > {before}", timeout=5000)
        page.wait_for_selector('.zd-retry', state='hidden', timeout=3000)
        check(f'{tag} 다시 보내기 성공 뒤 안내 사라짐', True)
        # 7. 두 손가락 시작(gesture) → 그리던 획 버림
        cnt = page.evaluate("window.__zz.db.strokes.length")
        page.mouse.move(b['x'] + b['w']*0.3, b['y'] + b['h']*0.85); page.mouse.down(); page.mouse.move(b['x'] + b['w']*0.5, b['y'] + b['h']*0.86, steps=6)
        page.evaluate("window.__zz.store.emit('gesture', 'multi')")
        check(f'{tag} gesture 뒤 임시 canvas 비움', (page.wait_for_timeout(60) or ink_pixels(page, 'zz-layer-temp')) == 0)
        page.mouse.up(); page.wait_for_timeout(1300)
        check(f'{tag} gesture 로 버린 획은 저장 안 함', page.evaluate("window.__zz.db.strokes.length") == cnt)
        # 8. 남의 선은 지우개로 못 지움(viewer 규칙은 host 아닌 경우 시험), 내 선은 지움
        page.evaluate("window.__zz.otherStroke({ tool: 'pen', color: '#2F6FEB', w: 0.004, pts: [0.1,0.95,0.5, 0.9,0.95,0.5] })")
        page.get_by_role('button', name='지우개').click()
        check(f'{tag} 지우개에서는 색 숨김', page.locator('.zd-colors').is_hidden())
        mine = page.evaluate("window.__zz.db.strokes.find(s => s.color === '#E5484D' && !s.group).id")
        drag(page, [(b['x'] + b['w']*0.3, b['y'] + b['h']*0.25), (b['x'] + b['w']*0.3, b['y'] + b['h']*0.45)], steps=20)
        page.wait_for_function(f"!window.__zz.db.strokes.some(s => s.id === '{mine}')", timeout=4000)
        check(f'{tag} 지우개로 내 선 지움', True)
        # 9. 쪽 지우기(주관자) → epoch+1, 화면 비움
        page.get_by_role('button', name='이 쪽 글씨 모두 지우기').click()
        page.wait_for_timeout(300)
        page.screenshot(path=str(SHOTS / f'{tag}-4-clear-modal.png'))
        page.get_by_role('button', name='모두 지우기', exact=True).click()
        page.wait_for_function("window.__zz.db.epochs['apdf00001_1'] === 1", timeout=3000)
        page.wait_for_timeout(200)
        check(f'{tag} 쪽 지우기 뒤 선 0', ink_pixels(page) == 0)
        # 10. 옛 epoch 로 보낸 선은 버림(다른 기기가 지운 직후)
        page.get_by_role('button', name='펜', exact=True).click()
        page.evaluate("window.__zz.db.epochs['apdf00001_1'] = 2")  # 구독 알림 전
        drag(page, [(b['x'] + b['w']*0.2, b['y'] + b['h']*0.2), (b['x'] + b['w']*0.4, b['y'] + b['h']*0.3)])
        page.wait_for_function("window.__toasts.some(t => t.text.includes('쪽이 지워져서'))", timeout=4000)
        page.wait_for_timeout(200)
        check(f'{tag} stale_epoch 선 버림·안내', ink_pixels(page) == 0 and page.locator('.zd-retry').is_hidden())
        # 10-2. 빠른 손글씨(0.25초 간격 12획) + 일부러 429 두 번 → 하나도 안 버림, 흐리게 안 됨
        page.evaluate("Object.assign(window.__zz.D.RETRY, { tries: 6, base: 1000, max: 16000 }); window.__zz.db.force429 = 2; window.__zz.db.r429 = 0")
        page.evaluate("window.__zz.db.epochs['apdf00001_1'] = 2; window.__zz.store.emit('cmd:nav', { aid: 'apdf00001', page: 2 })")
        page.wait_for_timeout(150)
        k0 = page.evaluate("window.__zz.db.strokes.length")
        for i in range(12):
            y = b['y'] + b['h'] * (0.1 + i * 0.06)
            drag(page, [(b['x'] + b['w']*0.2, y), (b['x'] + b['w']*0.35, y + 4)], steps=3)
            page.wait_for_timeout(250)
        page.wait_for_timeout(40)
        check(f'{tag} 빠른 손글씨 12획 모두 화면에', ink_pixels(page) > 300)
        page.wait_for_function(f"window.__zz.db.strokes.length >= {k0} + 12", timeout=15000)
        check(f'{tag} 빠른 손글씨 12획 모두 저장(429 {page.evaluate("window.__zz.db.r429")}번 겪고도)', page.evaluate("window.__zz.db.strokes.length") == k0 + 12)
        sv = page.evaluate("window.__zz.db.calls.filter(c => c[0]==='save').slice(-6).map(c => c[1])")
        check(f'{tag} 묶음으로 보냄(한 요청 여러 획)', max(sv) >= 2, str(sv))
        check(f'{tag} 429 는 흐리게 안 함', page.locator('.zd-retry').is_hidden())
        # 10-3. 그리고 곧바로 쪽을 넘겨도 원래 쪽·epoch 로 저장
        page.evaluate("window.__zz.db.lastOk = Date.now()")  # 다음 보내기가 1초 기다리게
        drag(page, [(b['x'] + b['w']*0.6, b['y'] + b['h']*0.5), (b['x'] + b['w']*0.8, b['y'] + b['h']*0.6)])
        page.evaluate("window.__zz.store.emit('cmd:nav', { aid: 'apdf00001', page: 3 })")
        page.wait_for_function("window.__zz.db.strokes.some(s => s.pageKey === 'apdf00001_2' && s.pts[0] > 0.55)", timeout=5000)
        check(f'{tag} 쪽 넘겨도 원래 pageKey 로 저장', page.evaluate("window.__zz.db.strokes.filter(s => s.pageKey === 'apdf00001_3').length") == 0)
        # 10-4. 구독: 지금 쪽 하나만(최근 3쪽 유지는 api.js 몫). 다시 온 쪽은 다시 그려짐.
        page.evaluate("window.__zz.store.emit('cmd:nav', { aid: 'apdf00001', page: 1 })")
        page.evaluate("window.__zz.store.emit('cmd:nav', { aid: 'apdf00001', page: 2 })")
        page.wait_for_timeout(80)
        sub, un = page.evaluate("window.__zz.db.sub"), page.evaluate("window.__zz.db.unsub")
        active = [k for k in sub if sub[k] - un.get(k, 0) > 0]
        check(f'{tag} 판서 구독은 지금 쪽 하나만', active == ['apdf00001_2'], json.dumps([sub, un]))
        check(f'{tag} 구독 경로 ({OLD and "옛 함수 어댑터" or "subscribePageStrokes"})', page.evaluate("window.__zz.db.via") == ('old' if OLD else 'page'))
        check(f'{tag} 다시 온 쪽 선이 다시 보임', ink_pixels(page) > 300)
        page.evaluate("window.__zz.store.emit('cmd:nav', { aid: 'apdf00001', page: 1 })")
        # 10-5. U03: 지운 적 있는 쪽으로 넘기자마자(epoch 도착 전) 그린 선은 버리지 않고 그 epoch 로 저장
        page.evaluate("window.__zz.db.epochs['apdf00001_3'] = 4; window.__zz.db.epochDelay = 700; window.__toasts.length = 0")
        page.evaluate("window.__zz.store.emit('cmd:nav', { aid: 'apdf00001', page: 3 })")
        page.wait_for_timeout(60)
        drag(page, [(b['x'] + b['w']*0.2, b['y'] + b['h']*0.7), (b['x'] + b['w']*0.5, b['y'] + b['h']*0.72)])
        page.wait_for_timeout(40)
        check(f'{tag} epoch 모를 때 그린 선도 바로 보임', ink_pixels(page) > 50)
        page.wait_for_function("window.__zz.db.strokes.some(s => s.pageKey === 'apdf00001_3')", timeout=5000)
        page.wait_for_timeout(200)
        s3 = page.evaluate("window.__zz.db.strokes.filter(s => s.pageKey === 'apdf00001_3').map(s => s.epoch)")
        check(f'{tag} U03 epoch 도착 뒤 그 epoch 로 저장', s3 == [4], str(s3))
        check(f'{tag} U03 선이 남고 「지워져서」 안내 없음', ink_pixels(page) > 50 and not page.evaluate("window.__toasts.some(t => t.text.includes('지워져서'))"))
        # 넘기자마자 그리고 epoch 도착 전에 또 넘겨도(구독은 epoch 받을 때까지 유지) 저장
        page.evaluate("window.__zz.db.epochs['apdf00001_2'] = 3")
        page.evaluate("window.__zz.store.emit('cmd:nav', { aid: 'apdf00001', page: 2 })")
        page.wait_for_timeout(60)
        drag(page, [(b['x'] + b['w']*0.6, b['y'] + b['h']*0.15), (b['x'] + b['w']*0.8, b['y'] + b['h']*0.2)])
        page.evaluate("window.__zz.store.emit('cmd:nav', { aid: 'apdf00001', page: 1 })")
        page.wait_for_function("window.__zz.db.strokes.some(s => s.pageKey === 'apdf00001_2' && s.epoch === 3)", timeout=5000)
        page.wait_for_timeout(100)
        es, eu = page.evaluate("window.__zz.db.esub['apdf00001_2']"), page.evaluate("window.__zz.db.eunsub['apdf00001_2'] || 0")
        check(f'{tag} U03 떠난 쪽 선도 epoch 받은 뒤 저장, 그 뒤 구독 끊음', es == eu, f'{es} {eu}')
        page.evaluate("window.__zz.db.epochDelay = 0")
        # 11. 화이트보드 띄우기 → 모눈 → + 새 쪽
        page.get_by_role('button', name='빈 칠판 띄우기').click()
        page.wait_for_selector('.zd-bg-card')
        page.locator('.zd-bg-card[data-bg="grid"]').click()
        page.wait_for_timeout(300)  # 모달 나타나는 움직임 끝난 뒤
        check(f'{tag} 고른 바탕 표시', page.locator('.zd-bg-card[data-bg="grid"]').get_attribute('aria-checked') == 'true')
        page.screenshot(path=str(SHOTS / f'{tag}-5-board-modal.png'))
        page.get_by_role('button', name='띄우기', exact=True).click()
        page.wait_for_function("window.__zz.store.get('page').aid === 'bboard01'", timeout=3000)
        check(f'{tag} 화이트보드 만들기 bg=grid', page.evaluate("window.__zz.db.calls.find(c => c[0]==='board')[1]") == 'grid')
        check(f'{tag} + 새 쪽 단추 보임', page.locator('#zz-board-actions .zd-board-add').is_visible())
        b2 = stage_box(page)
        page.get_by_role('button', name='형광펜').click()
        page.get_by_role('button', name='연두').click()
        drag(page, [(b2['x'] + b2['w']*0.1, b2['y'] + b2['h']*0.2), (b2['x'] + b2['w']*0.5, b2['y'] + b2['h']*0.2)])
        page.get_by_role('button', name='펜', exact=True).click()
        page.get_by_role('button', name='검정').click()
        drag(page, [(b2['x'] + b2['w']*0.1, b2['y'] + b2['h']*0.4), (b2['x'] + b2['w']*0.25, b2['y'] + b2['h']*0.6), (b2['x'] + b2['w']*0.45, b2['y'] + b2['h']*0.35)])
        page.wait_for_function("window.__zz.db.strokes.filter(s => s.pageKey === 'bboard01_1').length >= 2", timeout=5000)
        page.wait_for_timeout(300)
        page.screenshot(path=str(SHOTS / f'{tag}-6-board.png'))
        page.locator('#zz-board-actions .zd-board-add').click()
        page.wait_for_function("window.__zz.store.get('page').page === 2", timeout=3000)
        check(f'{tag} 새 쪽으로 이동', page.evaluate("window.__zz.store.get('page').pageKey") == 'bboard01_2')
        page.wait_for_timeout(200)
        check(f'{tag} 새 쪽은 선 없음', ink_pixels(page) == 0)
        # 12. 판서 잠금(참석자) → 펜 모드 풀림
        page.evaluate("window.__zz.store.set('role', { role: 'viewer', cid: 'c_me', name: '권선생', presenter: false }); window.__zz.store.patch('meeting', { penLock: true })")
        page.wait_for_timeout(100)
        check(f'{tag} 잠금 → 보기 모드로', page.evaluate("window.__zz.store.get('tool').mode") == 'view' and not page.evaluate("document.body.classList.contains('is-pen')"))
        check(f'{tag} 잠금 → 펜 단추 숨김·안내', page.locator('.zd-pen-toggle').is_hidden() and '회의 담당자만' in page.inner_text('.zd-note'))
        check(f'{tag} viewer 에게는 화이트보드 단추 없음', page.locator('#zz-hostbar-board button').count() == 0 and page.locator('#zz-board-actions button').count() == 0)
        page.screenshot(path=str(SHOTS / f'{tag}-7-locked.png'))
        # 13. 풀리면 다시, viewer 는 남의 선 못 지움
        page.evaluate("window.__zz.store.patch('meeting', { penLock: false })")
        page.get_by_role('button', name='펜으로 쓰기').click()
        page.evaluate("window.__zz.store.emit('cmd:nav', { aid: 'bboard01', page: 1 })")
        page.wait_for_timeout(200)
        page.evaluate("window.__zz.otherStroke({ tool: 'pen', color: '#2F6FEB', w: 0.004, pts: [0.1,0.9,0.5, 0.9,0.9,0.5] })")
        page.get_by_role('button', name='지우개').click()
        b3 = stage_box(page)
        n1 = page.evaluate("window.__zz.db.calls.filter(c => c[0]==='delete').length")
        drag(page, [(b3['x'] + b3['w']*0.5, b3['y'] + b3['h']*0.85), (b3['x'] + b3['w']*0.5, b3['y'] + b3['h']*0.95)], steps=10)
        page.wait_for_timeout(600)
        check(f'{tag} viewer 는 남의 선 지우기 요청 안 함', page.evaluate("window.__zz.db.calls.filter(c => c[0]==='delete').length") == n1)
        # 14. 쪽 지우기 단추는 host 만
        check(f'{tag} viewer 에게 쪽 지우기 없음', page.locator('.zd-clear').is_hidden())
        # 15-0. U05: 보내기 기다리는 중 unmount 하면 늦게라도 보내지 않음
        # 앞 보내기가 1초 넘게 전이면 손을 떼는 즉시 보내므로(기다리는 것 없음) 결과가 기기 속도에 따라 달랐다.
        # 먼저 한 획을 보내 draw.js 의 1초 간격(SEND_GAP)을 걸고, 그 안에 두 번째 획을 그린 뒤 바로 unmount 한다.
        page.get_by_role('button', name='펜', exact=True).click()
        n4 = page.evaluate("window.__zz.db.calls.filter(c => c[0]==='save').length")
        drag(page, [(b3['x'] + b3['w']*0.2, b3['y'] + b3['h']*0.2), (b3['x'] + b3['w']*0.4, b3['y'] + b3['h']*0.25)])
        page.wait_for_function(f"window.__zz.db.calls.filter(c => c[0]==='save').length > {n4}", timeout=3000)
        n5 = page.evaluate("window.__zz.db.calls.filter(c => c[0]==='save').length")
        drag(page, [(b3['x'] + b3['w']*0.2, b3['y'] + b3['h']*0.3), (b3['x'] + b3['w']*0.4, b3['y'] + b3['h']*0.35)])
        check(f'{tag} U05 두 번째 획은 간격 때문에 기다리는 중', page.evaluate("window.__zz.db.calls.filter(c => c[0]==='save').length") == n5)
        page.evaluate("window.__zz.mods.forEach(m => m.unmount())")
        page.wait_for_timeout(1600)
        check(f'{tag} U05 unmount 뒤 보내지 않음', page.evaluate("window.__zz.db.calls.filter(c => c[0]==='save').length") == n5)
        # 15. unmount 정리
        check(f'{tag} unmount 뒤 구독 모두 끊음', page.evaluate("Object.keys(window.__zz.db.sub).every(k => window.__zz.db.sub[k] === (window.__zz.db.unsub[k] || 0))"), json.dumps(page.evaluate("[window.__zz.db.sub, window.__zz.db.unsub]")))
        check(f'{tag} unmount 뒤 자리 비움', page.evaluate("document.getElementById('zz-toolbar').children.length + document.getElementById('zz-hostbar-board').children.length + document.getElementById('zz-board-actions').children.length") == 0)
        check(f'{tag} 콘솔 오류 0', not errors, ' | '.join(errors[:3]))
    except Exception as e:
        traceback.print_exc()
        check(f'{tag} 예외 없이 끝남', False, str(e)[:200])
        try: page.screenshot(path=str(SHOTS / f'{tag}-error.png'))
        except Exception: pass
    finally:
        br.close()

def run_narrow(pw, browser_name):
    # 600px 미만: 「빈 칠판 띄우기」도 글자가 보인다(EASY_UX: 그림만 단추 금지)
    tag = f'{browser_name}-390x844'
    print(f'== {tag}')
    kw = {'channel': 'msedge'} if browser_name == 'msedge' else {}
    br = pw.chromium.launch(**kw)
    errors = []
    try:
        cx = br.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, has_touch=True)
        cx.add_init_script('window.__zzBoot = 1')   # app.js 를 가짜로 바꾸므로 첫 화면 감시(index.html)가 다시 읽지 않게
        cx.route(f'{BASE}/**', route)
        cx.route('https://cdn.jsdelivr.net/**', lambda r: r.fulfill(status=200, content_type='text/css', body=''))
        page = cx.new_page()
        page.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None)
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.goto(f'{BASE}/zzoom/#/m/mtest01')
        page.wait_for_function('window.__ready === true', timeout=10000)
        page.wait_for_timeout(300)
        btn = page.get_by_role('button', name='빈 칠판 띄우기')
        box = btn.bounding_box()
        check(f'{tag} 칠판 단추 44px 이상', btn.count() == 1 and box['height'] >= 44, str(box))
        check(f'{tag} 글자가 보임', page.locator('.zd-board-open-text').is_visible())
        page.get_by_role('button', name='펜으로 쓰기').click()
        check(f'{tag} 도구 막대 무대 안', page.evaluate("(() => { const b = document.querySelector('.zd-bar').getBoundingClientRect(); return b.left >= 0 && b.right <= innerWidth; })()"))
        page.screenshot(path=str(SHOTS / f'{tag}-hostbar.png'))
        btn.click()
        page.wait_for_selector('.zd-bg-card')
        page.wait_for_timeout(300)
        page.screenshot(path=str(SHOTS / f'{tag}-board-modal.png'))
        check(f'{tag} 콘솔 오류 0', not errors, ' | '.join(errors[:3]))
    except Exception as e:
        traceback.print_exc()
        check(f'{tag} 예외 없이 끝남', False, str(e)[:200])
    finally:
        br.close()

with sync_playwright() as pw:
    if os.environ.get('ZZ_ONLY_NARROW'):
        for bn in ('msedge', 'chromium'): run_narrow(pw, bn)
        ok = sum(1 for r in results if r[1]); print(f'결과: 통과 {ok} / 실패 {len(results) - ok}'); sys.exit(1 if ok < len(results) else 0)
    for bn in ('msedge', 'chromium'): run_narrow(pw, bn)
    for bn in ('msedge', 'chromium'):
        for size in ((1280, 800), (820, 1180)):
            run(pw, bn, size)
    run(pw, 'chromium', (1280, 800), old=True)   # api.js 에 subscribePageStrokes 가 없을 때(어댑터)

ok = sum(1 for r in results if r[1]); bad = len(results) - ok
print(f'\n결과: 통과 {ok} / 실패 {bad} (스크린샷 {SHOTS})')
sys.exit(1 if bad else 0)
