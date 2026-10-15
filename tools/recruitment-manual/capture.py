# -*- coding: utf-8 -*-
"""채용 관리 사용 설명서 캡처. 처음 쓰는 사람처럼 채용 하나를 만들어 끝까지 진행하며 화면을 찍는다.

    python tools/recruitment-manual/capture.py --base https://a-iroom.vercel.app --code 4321 --kind contract --out public/recruitment/manual/shots
    python tools/recruitment-manual/capture.py --base http://127.0.0.1:3199 --code test-code --kind standard --out <dir> --channel ""   (로컬 하네스 = E2E 검증)

--kind standard(강사 채용 표준) | contract(계약제 교원 채용 표준). 끝나면 만든 채용을 지운다(--keep 이면 남김).
누를 곳은 빨간 테두리(강의안과 같은 표시)를 씌워 찍는다. 담당자 화면은 PC 1440, 심사자 화면은 휴대폰 390 과 PC 둘 다.
"""
import argparse, json, re, sys, time, pathlib
from playwright.sync_api import sync_playwright, expect

ap = argparse.ArgumentParser()
ap.add_argument('--base', required=True); ap.add_argument('--code', required=True)
ap.add_argument('--kind', choices=['standard', 'contract'], required=True)
ap.add_argument('--out', required=True); ap.add_argument('--channel', default='msedge')
ap.add_argument('--keep', action='store_true')
a = ap.parse_args()
OUT = pathlib.Path(a.out); OUT.mkdir(parents=True, exist_ok=True)
K = 'k' if a.kind == 'standard' else 'c'          # 파일 이름 앞글자: k=강사, c=계약제
PRESET = 'standard' if a.kind == 'standard' else 'contract-teacher'
log = []

MARK = "el=>{el.dataset.mk=el.style.outline;el.style.outline='4px solid #E11D48';el.style.outlineOffset='3px';el.style.borderRadius=el.style.borderRadius||'10px'}"
UNMARK = "el=>{el.style.outline=el.dataset.mk||'';el.style.outlineOffset=''}"


def shot(page, name, mark=None, full=False, scroll=None):
    """name.png 로 찍는다. mark: 빨간 테두리를 씌울 locator(들). scroll: 화면에 먼저 보이게 할 locator."""
    marks = [m for m in (mark if isinstance(mark, list) else [mark]) if m is not None]
    target = scroll or (marks[0] if marks else None)
    if target is not None:
        target.first.scroll_into_view_if_needed(); page.evaluate("window.scrollBy(0,-120)")
    for m in marks: m.first.evaluate(MARK)
    # 표는 왼쪽 끝부터 보이게, 안내 알림(토스트)은 '완료' 장면에서만 남긴다.
    page.evaluate("(keep)=>{document.querySelectorAll('.table-wrap').forEach(t=>t.scrollLeft=0);const m=document.getElementById('message');if(m&&!keep)m.hidden=true}", name.endswith('done'))
    page.wait_for_timeout(250)
    page.screenshot(path=str(OUT / f'{K}-{name}.png'), full_page=full)
    for m in marks: m.first.evaluate(UNMARK)
    log.append(name); print('  찍음', f'{K}-{name}.png', flush=True)


def draw_sign(page):
    c = page.locator('#sign-pad'); c.scroll_into_view_if_needed(); box = c.bounding_box()
    x, y = box['x'] + 40, box['y'] + box['height'] / 2
    page.mouse.move(x, y); page.mouse.down()
    for i in range(1, 30): page.mouse.move(x + i * 9, y + (12 if i % 4 < 2 else -12))
    page.mouse.up()


def score_all(page, ci_seed=0):
    """채점표의 모든 칸을 처음 쓰는 위원처럼 눌러서 채운다(지원자마다 조금씩 다르게)."""
    rows = page.locator('#score-form tr[data-candidate]')
    for r in range(rows.count()):
        tr = rows.nth(r)
        for k, lst in enumerate(tr.locator('.opt-list').all()):
            opts = lst.locator('.opt'); opts.nth((r + k + ci_seed) % max(1, opts.count() - 1)).click()
        for k, ch in enumerate(tr.locator('.chips.scale').all()):
            chips = ch.locator('.chip'); chips.nth(min(chips.count() - 1, (r + k + ci_seed) % 3)).click()
        for k, box in enumerate(tr.locator('.sum-pick input[type=checkbox]').all()):
            if (r + k) % 2 == 0: box.check()
        for qty in tr.locator('.sum-pick input[type=number]').all(): qty.fill(str(1 + r % 3))
        for cell in tr.locator('input.score').all():
            mx = float(cell.get_attribute('data-max')); cell.fill(str(int(max(0, mx - 1 - (r + ci_seed) % 4))))
            cell.dispatch_event('change')


def goto(pg, url):
    """실서버는 가끔 첫 응답이 늦다. 60초씩 세 번까지 다시 연다."""
    for i in range(3):
        try: return pg.goto(url, wait_until='domcontentloaded', timeout=60000)
        except Exception as e:
            if i == 2: raise
            print('  다시 여는 중', i + 1, str(e).split(chr(10))[0][:80], flush=True); pg.wait_for_timeout(3000)


STAGE_KO = {'document': '서류심사', 'interview': '면접심사', 'demo': '수업실연'}


def submit(page):
    stage = page.locator('#score-form').get_attribute('data-stage')
    btn = page.get_by_role('button', name=re.compile('저장 후 .*제출'))
    btn.first.click()   # 확인 창은 페이지의 dialog 처리기가 받는다
    expect(page.locator('#message')).to_contain_text(f'{STAGE_KO[stage]} 제출이 완료', timeout=20000)


with sync_playwright() as pw:
    b = pw.chromium.launch(channel=a.channel) if a.channel else pw.chromium.launch()
    pc = b.new_context(viewport={'width': 1440, 'height': 900}, device_scale_factor=1, accept_downloads=True, locale='ko-KR')
    page = pc.new_page()
    page.on('dialog', lambda d: d.accept() if d.type in ('confirm', 'alert') else None)

    # ── 1. 로그인 ──
    goto(page, a.base + '/recruitment')
    expect(page.locator('#login-form')).to_be_visible(timeout=20000)
    page.fill('#login-form [name=code]', a.code)
    shot(page, '01-login', mark=page.locator('#login-form .field'))
    page.locator('#login-form button.primary').click()
    expect(page.get_by_role('button', name='+ 새 채용')).to_be_visible(timeout=20000)
    shot(page, '02-home', mark=page.get_by_role('button', name='+ 새 채용'))

    # ── 2. 새 채용 ──
    page.get_by_role('button', name='+ 새 채용').click()
    expect(page.locator('#create-form')).to_be_visible(timeout=10000)
    page.select_option('#create-form [name=preset]', PRESET)
    page.wait_for_timeout(400)
    shot(page, '03-preset', mark=page.locator('#create-form .preset-bar'))
    page.locator('[data-action=fill-example]').click(); page.wait_for_timeout(400)
    title = f"[설명서용] {'방과후 강사' if a.kind == 'standard' else '기간제교사(담임)'} 채용 {time.strftime('%H%M%S')}"
    page.fill('#create-form [name=title]', title)
    page.fill('#create-form [name=school]', '백암초등학교')
    if a.kind == 'standard':
        page.fill('#create-form [name=field]', '방과후학교 강사[컴퓨터]')
        page.fill('#create-form [name=candidateCount]', '5'); page.locator('#create-form [name=candidateCount]').dispatch_event('input')
        for i, n in enumerate(['김하늘', '이하늘', '박하늘', '최하늘', '정하늘']): page.locator('[name=candidate-name]').nth(i).fill(n)
        page.select_option('#create-form [name=summaryOrient]', 'landscape')
    page.select_option('#create-form [name=allowBonus]', 'true')
    page.fill('#create-form [name=shortlistLimit]', '3')
    if a.kind == 'contract':
        shot(page, '04-info', mark=[page.locator('#contract-box .grid'), page.locator('#create-form [name=field]')], scroll=page.locator('#contract-box'))
    else:
        shot(page, '04-info', mark=[page.locator('#create-form [name=field]'), page.locator('[data-summary-orient]')], scroll=page.locator('#create-form .step-title').first)
    shot(page, '05-rubric', mark=page.locator('#rubric-editors'), scroll=page.locator('#rubric-editors'))
    shot(page, '06-people', mark=[page.locator('#reviewer-rows'), page.locator('#candidate-rows')], scroll=page.locator('#reviewer-rows'))
    page.get_by_role('button', name='채용 생성').click()
    expect(page.locator('[data-action=provision]').first).to_be_visible(timeout=20000)
    shot(page, '07-created', mark=page.locator('[data-action=provision]'))

    # ── 3. 평가 시작 · 위원 링크 ──
    page.locator('[data-action=provision]').first.click()
    expect(page.locator('[data-action=invite-all]')).to_be_visible(timeout=20000)
    page.locator('[data-action=invite-all]').click()
    expect(page.locator('#invite-list')).to_be_visible(timeout=20000)
    shot(page, '08-invites', mark=[page.locator('[data-action=copy-all]'), page.locator('[data-action=print-qr]')], scroll=page.locator('#focus-reviewers'))
    links = re.findall(r'https?://\S+', page.locator('#invite-list').input_value())
    with pc.expect_page(timeout=20000) as pop:
        page.locator('[data-action=print-qr]').click()
    qr = pop.value; qr.wait_for_load_state(); qr.wait_for_timeout(600)
    qr.screenshot(path=str(OUT / f'{K}-09-qr.png')); log.append('09-qr'); qr.close()

    # ── 4. 위원: 서약 · 서류 채점 · 제출 (첫 위원은 휴대폰, 나머지는 PC) ──
    def reviewer(idx, link, mobile, stage_shots):
        ctx = b.new_context(viewport={'width': 390, 'height': 844} if mobile else {'width': 1440, 'height': 900}, device_scale_factor=2 if mobile else 1, is_mobile=mobile, has_touch=mobile, locale='ko-KR')
        rp = ctx.new_page(); rp.on('dialog', lambda d: d.accept())
        goto(rp, link)
        expect(rp.locator('#score-form, #sign-pad').first).to_be_visible(timeout=20000)
        pre = 'm' if mobile else 'p'
        if rp.locator('#sign-pad').count():
            if stage_shots: shot(rp, f'{pre}10-pledge', mark=rp.locator('#sign-pad'), scroll=rp.locator('.panel').first)
            draw_sign(rp)
            if stage_shots: shot(rp, f'{pre}11-signed', mark=rp.locator('[data-action=sign-save]'), scroll=rp.locator('#sign-pad'))
            rp.locator('[data-action=sign-save]').click()
            expect(rp.locator('#message')).to_contain_text('서명을 저장', timeout=20000)
        return ctx, rp

    def do_stage(rp, mobile, shots, seed, stage_tag):
        pre = 'm' if mobile else 'p'
        form = rp.locator('#score-form'); expect(form).to_be_visible(timeout=20000)
        expect(rp.locator('#score-form textarea:not([disabled])').first).to_be_visible(timeout=15000)
        if shots:
            shot(rp, f'{pre}{stage_tag}-a-sheet', mark=rp.locator('.guide-panel'), scroll=rp.locator('.guide-panel'))
        score_all(rp, seed)
        if shots:
            first_row = rp.locator('#score-form tr[data-candidate]').first
            pick = first_row.locator('.opt-list, .chips.scale')
            shot(rp, f'{pre}{stage_tag}-b-touch', mark=pick if pick.count() else first_row, scroll=first_row)
            shot(rp, f'{pre}{stage_tag}-c-submit', mark=rp.get_by_role('button', name=re.compile('저장 후 .*제출')))
        submit(rp)
        if shots:
            rp.wait_for_timeout(600)
            # 계약제 면접을 내면 화면이 수업실연 채점표로 넘어간다 — 그때는 전환 단추의 ✓ 를 보여 준다.
            done = rp.locator('.stage-switch') if rp.locator('.stage-switch').count() and not rp.locator('.notice.ok-note').count() else rp.locator('.notice.ok-note, section.next.done')
            shot(rp, f'{pre}{stage_tag}-d-done', mark=done.first, scroll=done.first)

    # 위원 화면은 한 번만 열어 두고, 다음 전형은 화면의 [새로고침]으로 이어 간다(실제 위원도 그렇게 한다).
    sessions = []
    for i, link in enumerate(links):
        mobile = i == 0
        ctx, rp = reviewer(i, link, mobile, stage_shots=(i <= 1))
        do_stage(rp, mobile, shots=(i <= 1), seed=i, stage_tag='12-doc')
        sessions.append((ctx, rp))

    # ── 5. 담당자: 제출 현황 · 서류 통계 · 면접 대상자 ──
    page.locator('.list-head [data-action=refresh]').click(); page.wait_for_timeout(2500)
    page.locator('[data-action=tab][data-tab=evaluation]').click(); page.wait_for_timeout(500)
    shot(page, '13-progress', mark=page.locator('.status-list').first)
    page.locator('[data-action=tab][data-tab=results]').click(); page.wait_for_timeout(800)
    shot(page, '14-doc-results', mark=page.locator('.result-table').first, scroll=page.locator('.result-table').first)
    boxes = page.locator('#shortlist-form [name=candidateId]:not([disabled])')
    for i in range(min(3, boxes.count())): boxes.nth(i).check()
    page.fill('#shortlist-form [name=reason]', '서류 상위 3명 선정(설명서 예시)')
    shot(page, '15-shortlist', mark=page.locator('#shortlist-form'), scroll=page.locator('#shortlist-form'))
    page.locator('#shortlist-form button.primary').click()
    page.wait_for_timeout(2500)

    # ── 6. 위원: 면접(계약제는 수업실연까지) ──
    for i, (ctx, rp) in enumerate(sessions):
        mobile = i == 0
        rp.locator('[data-action=refresh]').first.click(); rp.wait_for_timeout(2500)
        pre = 'm' if mobile else 'p'
        if a.kind == 'contract' and i <= 1:
            shot(rp, f'{pre}16-stage-switch', mark=rp.locator('.stage-switch'), scroll=rp.locator('.stage-switch'))
        do_stage(rp, mobile, shots=(i <= 1), seed=i + 1, stage_tag='17-int')
        if a.kind == 'contract':
            rp.wait_for_timeout(800)
            if not rp.locator('#score-form[data-stage=demo]').count():
                rp.locator('[data-action=eval-stage][data-stage=demo]').click()
            expect(rp.locator('#score-form[data-stage=demo]')).to_be_visible(timeout=15000)
            do_stage(rp, mobile, shots=(i <= 1), seed=i + 2, stage_tag='18-demo')
        ctx.close()

    # ── 7. 결과 확정 · 문서 받기 ──
    page.locator('.list-head [data-action=refresh]').click(); page.wait_for_timeout(2500)
    page.locator('[data-action=tab][data-tab=results]').click(); page.wait_for_timeout(800)
    fin = page.locator('[data-action=finalize]')
    shot(page, '19-final', mark=fin, scroll=page.locator('#focus-final'))
    fin.click(); page.wait_for_timeout(3000)
    shot(page, '20-exports', mark=page.locator('.download-grid'))
    for fmt in ['hwpx', 'xlsx']:
        with page.expect_download(timeout=60000) as dl:
            page.locator(f'[data-action=download][data-format={fmt}]').click()
        dl.value.save_as(str(OUT / f'{K}-result.{fmt}'))
    with pc.expect_page(timeout=30000) as pop:
        page.locator('[data-action=download][data-format=html]').click()
    pr = pop.value; pr.wait_for_timeout(2500)
    pages = pr.locator('section.page')
    picks = {'21-print-doc': 1 + len(links), '22-print-sum': None}
    n = pages.count()
    # 서약서 다음 쪽(서류 채점표)과 가로 쪽(집계표) 하나씩
    pages.nth(min(n - 1, len(links))).screenshot(path=str(OUT / f'{K}-21-print-sheet.png')); log.append('21-print-sheet')
    land = pr.locator('section.page.land')
    (land.first if land.count() else pages.nth(n - 1)).screenshot(path=str(OUT / f'{K}-22-print-land.png')); log.append('22-print-land')
    pages.nth(0).screenshot(path=str(OUT / f'{K}-23-print-pledge.png')); log.append('23-print-pledge')
    pr.close()

    # ── 8. 정리: 설명서용 채용 지우기 ──
    if not a.keep:
        page.locator('[data-action=tab][data-tab=overview]').click(); page.wait_for_timeout(500)
        shot(page, '24-delete', mark=page.locator('[data-action=delete-recruitment]'))
        page.once('dialog', lambda d: d.accept(title))   # 채용명 확인 프롬프트(확인 창은 위 처리기가 받는다)
        page.locator('[data-action=delete-recruitment]').click()
        expect(page.locator('#message')).to_contain_text('삭제', timeout=20000)
    b.close()
json.dump({'kind': a.kind, 'shots': log}, open(OUT / f'{K}-shots.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('완료', len(log), '장')
