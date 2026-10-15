# -*- coding: utf-8 -*-
"""설명서 캡처가 중간에 멈춰 남은 '[설명서용]' 채용을 지운다.
    python tools/recruitment-manual/cleanup.py --base https://a-iroom.vercel.app --code 4321"""
import argparse, json, urllib.request
ap = argparse.ArgumentParser(); ap.add_argument('--base', required=True); ap.add_argument('--code', required=True); a = ap.parse_args()
DEV = 'manual-capture-cleanup-0001'
def call(method, path, body=None, token=None):
    req = urllib.request.Request(a.base + path, method=method, data=None if body is None else json.dumps(body).encode(),
                                 headers={'Content-Type': 'application/json', 'X-Device-Id': DEV, **({'X-Auth-Token': token} if token else {})})
    with urllib.request.urlopen(req, timeout=60) as r: return json.loads(r.read().decode())
token = call('POST', '/api/auth/login', {'code': a.code})['token']
items = [x for x in call('GET', '/api/recruitments', token=token)['items'] if x['title'].startswith('[설명서용]')]
for x in items:
    call('DELETE', '/api/recruitments/' + x['id'], {'confirmTitle': x['title'], 'confirmUnfinished': x['status'] != 'finalized'}, token)
    print('지움', x['title'], x['status'])
print('남은 설명서용 채용 정리 끝:', len(items), '건')
