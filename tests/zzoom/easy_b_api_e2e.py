# -*- coding: utf-8 -*-
"""EASY_UX 팀 B: 진짜 public/zzoom/api.js 의 presenterEnd 와 업로드 허가 취소(서버 감사 R4 P3) 시험. 서버·Firebase 없이 돈다.
    python tests/zzoom/easy_b_api_e2e.py
- /api/zzoom/* 와 /api/firebase-config 는 가짜 응답, gstatic Firebase 모듈은 작은 가짜 모듈로 바꿔 끼운다.
- 엣지(channel='msedge')와 크로미움에서 돈다(화면이 없는 시험이라 창 크기는 하나)."""
import os, sys, json, threading, functools
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from playwright.sync_api import sync_playwright

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
PUBLIC = os.path.join(ROOT, 'public')
MID = 'mabcdefghij12'

class Quiet(SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
    def guess_type(self, path):
        return 'text/javascript' if str(path).endswith('.js') else super().guess_type(path)

PAGE = """<!doctype html><meta charset="utf-8"><title>t</title>
<script type="module">
import * as api from '/zzoom/api.js';
const data = {};
api.bindStore({ get: k => data[k], set: (k, v) => { data[k] = v; }, patch: (k, v) => { data[k] = { ...(data[k] || {}), ...v }; }, emit() {}, on() { return () => {}; } });
window.__api = api; window.__data = data; window.__ready = true;
</script>"""

FB_STUBS = {
    'app': "export const getApps = () => []; export const initializeApp = () => ({});",
    'auth': "export const inMemoryPersistence = {}; export const initializeAuth = () => ({}); export const getAuth = () => ({}); export const signInWithCustomToken = async () => ({}); export const signOut = async () => {};",
    'firestore': "export const getFirestore = () => ({}); export const doc = () => ({}); export const collection = () => ({}); export const onSnapshot = () => () => {}; export const query = () => ({}); export const orderBy = () => ({}); export const limit = () => ({}); export const where = () => ({});",
    'storage': "export const getStorage = () => ({}); export const ref = (st, p) => p; export const getDownloadURL = async () => ''; export const getBlob = async () => new Blob();"
               " export const uploadBytes = async (r) => { window.__puts = (window.__puts || 0) + 1; if (window.__failPut) throw Object.assign(new Error('x'), { code: 'storage/unknown' }); await new Promise(s => setTimeout(s, window.__putDelay || 5)); };",
}

def run(pw, label, kw, base):
    ok, fail = [], []
    def step(name, fn):
        try: fn(); ok.append(name); print(f'  OK   [{label}] {name}', flush=True)
        except Exception as e: fail.append(name); print(f'  FAIL [{label}] {name} -> {str(e)[:400]}', flush=True)
    b = pw.chromium.launch(**kw)
    ctx = b.new_context()
    ctx.add_init_script("try{localStorage.setItem('airoom_auth_token','fake-token')}catch(e){}")
    calls = []
    srv = {'commit': 'ok', 'end': 'ok'}
    def fb(route):
        name = route.request.url.split('firebase-')[-1].split('.js')[0]
        route.fulfill(status=200, content_type='text/javascript', body=FB_STUBS[name])
    ctx.route('https://www.gstatic.com/**', fb)
    def j(route, status, obj): route.fulfill(status=status, content_type='application/json', body=json.dumps(obj))
    def apiroute(route):
        req = route.request
        path = req.url.split('/api/zzoom')[-1].split('?')[0]
        body = req.post_data or ''
        calls.append([req.method, path, body])
        if path == f'/{MID}/join': return j(route, 200, {'pt': 'pt1', 'cid': 'c-me', 'role': 'viewer', 'token': 'tok', 'exp': 4102444800000, 'until': 4102444800000, 'meeting': {'status': 'live', 'presenter': {'cid': 'c-me', 'epoch': 3}}})
        if path == f'/{MID}/heartbeat': return j(route, 200, {})
        if path == f'/{MID}/uploads' and req.method == 'POST':
            n = sum(1 for c in calls if c[1] == f'/{MID}/uploads')
            return j(route, 200, {'uploadId': f'u{n}', 'path': 'zzoom/x/', 'files': {'pages': ['p1.webp'], 'thumbs': ['t1.webp'], 'original': 'orig.png'}, 'originalTypes': ['image/png']})
        if path.endswith('/commit'):
            if srv['commit'] == 'fail': return j(route, 500, {'error': 'commit_failed', 'message': '저장 실패'})
            return j(route, 200, {'aid': 'aaaaaaa1', 'agenda': {}})
        if req.method == 'DELETE' and '/uploads/' in path: return j(route, 200, {'ok': True})
        if path == f'/{MID}/presenter/end':
            if srv['end'] == '403': return j(route, 403, {'error': 'not_presenter', 'message': '안 돼요'})
            return j(route, 200, {'presenter': {'cid': None, 'epoch': 4}, 'live': {'aid': None, 'page': 1, 'rev': 9, 'epoch': 4, 'forceSeq': 2}, 'changed': True})
        return j(route, 404, {'error': 'nope'})
    ctx.route('**/api/zzoom/**', apiroute)
    ctx.route('**/api/firebase-config', lambda r: j(r, 200, {'apiKey': 'k', 'projectId': 'p'}))
    ctx.route('**/t.html', lambda r: r.fulfill(status=200, content_type='text/html; charset=utf-8', body=PAGE))
    pg = ctx.new_page()
    errors = []
    pg.on('pageerror', lambda e: errors.append(str(e)))
    pg.goto(f'{base}/t.html')
    pg.wait_for_function('window.__ready === true')
    pg.evaluate(f"() => window.__api.join('{MID}')")

    UPLOAD = """async ([fn, abortAfter]) => {
      const blob = new Blob([new Uint8Array(10)], { type: 'image/webp' });
      const converted = { pages: [{ blob, w: 100, h: 80, type: 'image/webp' }], thumbs: [blob] };
      const file = new File([new Uint8Array(20)], 'a.png', { type: 'image/png' });
      const ac = new AbortController();
      if (abortAfter) setTimeout(() => ac.abort(), abortAfter);
      try {
        if (fn === 'attach') await window.__api.attachAgendaFile('%s', 'aaaaaaa1', { file, converted, signal: ac.signal });
        else await window.__api.uploadAgenda('%s', { file, converted, title: '안건', signal: ac.signal });
        return 'ok';
      } catch (e) { return 'err:' + e.code; }
    }""" % (MID, MID)
    deletes = lambda: [c[1] for c in calls if c[0] == 'DELETE']
    def settle(): pg.wait_for_timeout(150)

    for fn in ['attach', 'upload']:
        def ok_case():
            n0 = len(deletes()); srv['commit'] = 'ok'
            r = pg.evaluate(UPLOAD, [fn, 0]); settle()
            assert r == 'ok', r
            assert len(deletes()) == n0, f'성공했는데 허가 취소: {deletes()}'
        step(f'{fn}: 성공하면 허가를 취소하지 않음', ok_case)
        def put_fail():
            n0 = len(deletes()); pg.evaluate('window.__failPut = true')
            r = pg.evaluate(UPLOAD, [fn, 0]); pg.evaluate('window.__failPut = false'); settle()
            assert r == 'err:upload_failed', r
            d = deletes()[n0:]
            last = [c[1] for c in calls if c[1] == f'/{MID}/uploads'][-1:]
            assert len(d) == 1 and d[0].startswith(f'/{MID}/uploads/u'), d
        step(f'{fn}: 쪽 올리기 실패면 DELETE /uploads/:uploadId', put_fail)
        def abort_case():
            n0 = len(deletes()); pg.evaluate('window.__putDelay = 400')
            r = pg.evaluate(UPLOAD, [fn, 150]); pg.evaluate('window.__putDelay = 5'); settle()
            assert r == 'err:aborted', r
            assert len(deletes()[n0:]) == 1, deletes()
        step(f'{fn}: 취소(창 닫기)면 허가 취소', abort_case)
        def commit_fail():
            n0 = len(deletes()); srv['commit'] = 'fail'
            r = pg.evaluate(UPLOAD, [fn, 0]); srv['commit'] = 'ok'; settle()
            assert r == 'err:commit_failed', r
            assert len(deletes()[n0:]) == 1, deletes()
        step(f'{fn}: commit 실패면 허가 취소', commit_fail)

    def end_ok():
        r = pg.evaluate(f"async () => {{ const d = await window.__api.presenterEnd('{MID}'); return {{ d, m: window.__data.meeting, l: window.__data.live }}; }}")
        c = [x for x in calls if x[1] == f'/{MID}/presenter/end']
        assert c and c[-1][0] == 'POST' and json.loads(c[-1][2] or '{}') == {}, c
        assert r['d']['changed'] is True
        assert r['m']['presenter']['cid'] is None and r['l']['aid'] is None, r
    step('presenterEnd: POST /presenter/end 본문 {}, store meeting.presenter·live 를 비움', end_ok)
    def end_403():
        srv['end'] = '403'
        r = pg.evaluate(f"async () => {{ try {{ await window.__api.presenterEnd('{MID}'); return 'ok'; }} catch (e) {{ return e.status + ':' + e.code; }} }}")
        srv['end'] = 'ok'
        assert r == '403:not_presenter', r
    step('presenterEnd: 403 not_presenter 는 ZzError 로 던짐', end_403)
    step('페이지 오류 0', lambda: (_ for _ in ()).throw(AssertionError(errors[:3])) if errors else None)
    b.close()
    return ok, fail

def main():
    srv = ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Quiet, directory=PUBLIC))
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    base = f'http://127.0.0.1:{srv.server_address[1]}'
    tok = tfail = 0
    with sync_playwright() as pw:
        for label, kw in [('edge', {'channel': 'msedge'}), ('chromium', {})]:
            try: ok, fail = run(pw, label, kw, base)
            except Exception as e: print(f'[{label}] 실행 실패: {e}', flush=True); ok, fail = [], ['launch']
            tok += len(ok); tfail += len(fail)
    srv.shutdown()
    print(f'\n합계: 통과 {tok}, 실패 {tfail}', flush=True)
    sys.exit(1 if tfail else 0)

if __name__ == '__main__':
    main()
