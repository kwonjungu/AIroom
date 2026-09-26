// WP1 브라우저 확인: 스크린샷 + 가로 넘침 + 터치 크기 + 대화상자 포커스 + IME DOM 시나리오
// 실행: PORT=4817 node server.js  →  PLAYWRIGHT_CORE=<playwright-core 경로> CHROME_PATH=<chrome.exe> node capture-wp1.cjs <출력폴더>
// 레포에 playwright 의존성을 추가하지 않는다. 이미 설치된 playwright-core 경로를 환경변수로 준다.
const { chromium } = require(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const path = require('path');
const fs = require('fs');

const BASE = process.env.BASE || 'http://localhost:4817/vibe-v2/';
const OUT = process.argv[2] || __dirname;
fs.mkdirSync(OUT, { recursive: true });

const VIEWS = [
  { name: '1366x768', w: 1366, h: 768 },
  { name: '1024x768', w: 1024, h: 768, touch: true },
  { name: '768x1024', w: 768, h: 1024, touch: true },
  { name: '820x1180', w: 820, h: 1180, touch: true },
  { name: '390x844', w: 390, h: 844, touch: true },
  { name: '1440x900', w: 1440, h: 900 },
];

async function measure(page) {
  return page.evaluate(() => {
    const de = document.documentElement;
    const ws = document.querySelector('[data-workspace]');
    const grade = document.querySelector('[data-grade]')?.dataset.grade;
    const min = grade === 'low' ? 56 : 48;
    const small = [];
    for (const el of document.querySelectorAll('.v2 button, .v2 a[href], .v2 [role=tab], .v2 textarea')) {
      if (el.closest('[hidden]') || el.classList.contains('v2-skip')) continue;
      const r = el.getBoundingClientRect();
      if (!r.width) continue;
      if (r.width < min - 0.5 || r.height < min - 0.5) small.push(`${(el.getAttribute('aria-label') || el.textContent || el.tagName).trim().slice(0, 20)} ${Math.round(r.width)}x${Math.round(r.height)}`);
    }
    const out = [];
    for (const el of document.querySelectorAll('.v2 *')) {
      if (el.closest('[hidden]')) continue;
      const r = el.getBoundingClientRect();
      if (r.width && r.right > de.clientWidth + 1) out.push(String(el.className || el.tagName));
    }
    const top = document.querySelector('.ws-top');
    const rows = top ? [...top.querySelectorAll('.ws-row')].map(r => Math.round(r.getBoundingClientRect().height)) : null;
    const m = document.querySelector('.mission');
    const t = document.querySelector('.tpl-card');
    return {
      scrollWidth: de.scrollWidth, clientWidth: de.clientWidth, overflowX: de.scrollWidth > de.clientWidth,
      overflowEls: [...new Set(out)].slice(0, 5),
      layout: ws?.dataset.layout || null, fit: ws?.dataset.fit || null,
      headerRows: rows, headerH: top ? Math.round(top.getBoundingClientRect().height) : null,
      smallTargets: small.slice(0, 8), smallCount: small.length,
      missionCard: m ? `${Math.round(m.getBoundingClientRect().width)}x${Math.round(m.getBoundingClientRect().height)}` : null,
      tplCard: t ? Math.round(t.getBoundingClientRect().width) : null,
      bodyFont: getComputedStyle(document.querySelector('.v2')).fontSize,
    };
  });
}

async function injectDemo(page) {
  // 모드(WP2/WP3)가 아직 스텁이므로 배치 확인용으로 도움·실행 영역에 내용을 넣는다 (제품 코드 아님)
  await page.evaluate(async () => {
    const { createTextInput } = await import('./ui/text-input.js');
    const assist = document.querySelector('[data-assist]');
    const ti = createTextInput({ label: 'AI에게 부탁하기', placeholder: '예) 생선이 조금 더 천천히 떨어지게', onSubmit: () => { window.__sent = (window.__sent || 0) + 1; }, onCancel: () => {} });
    window.__ti = ti;
    assist.append(ti.el);
    const dock = document.querySelector('[data-dock]');
    for (const [t, p] of [['▶ 실행', true], ['⏸ 멈춤'], ['↩ 되돌리기'], ['💾 저장']]) {
      const b = document.createElement('button'); b.className = 'v2-btn' + (p ? ' v2-btn--primary' : ''); b.textContent = t; dock.append(b);
    }
    const ed = document.querySelector('[data-editor]');
    const p = document.createElement('p'); p.textContent = '(편집 영역: WP2/WP3 모드가 채움)'; ed.append(p);
  });
}

(async () => {
  const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
  const report = {};
  for (const grade of ['low', 'mid']) {
    for (const v of VIEWS) {
      const ctx = await browser.newContext({ viewport: { width: v.w, height: v.h }, hasTouch: !!v.touch, isMobile: v.w < 500, deviceScaleFactor: 1 });
      const page = await ctx.newPage();
      const errors = [];
      page.on('pageerror', e => errors.push(String(e)));
      page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
      await page.addInitScript(g => { localStorage.setItem('vibe2_pref_grade', JSON.stringify(g)); }, grade);
      await page.goto(BASE, { waitUntil: 'networkidle' });
      const key = `${grade}-${v.name}`;
      const r = report[key] = {};
      await page.screenshot({ path: path.join(OUT, `${key}-home.png`) });
      r.home = await measure(page);
      const pathId = grade === 'low' ? 'cards' : 'make';
      await page.click(`.path-card[data-path="${pathId}"]`);
      await page.waitForTimeout(150);
      await page.screenshot({ path: path.join(OUT, `${key}-path-${pathId}.png`) });
      r.path = await measure(page);
      if (grade === 'low') await page.click('.mission[data-status="current"]');
      else await page.click('.tpl-card .v2-btn--primary');
      await page.waitForSelector('[data-workspace][data-layout]');
      await injectDemo(page);
      await page.waitForTimeout(150);
      await page.screenshot({ path: path.join(OUT, `${key}-workspace.png`) });
      r.workspace = await measure(page);
      r.errors = errors;
      await ctx.close();
    }
  }

  // ── 상호작용 검사 (1366×768, 3~4학년)
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  await page.addInitScript(() => localStorage.setItem('vibe2_pref_grade', '"mid"'));
  await page.goto(BASE, { waitUntil: 'networkidle' });
  const checks = {};
  await page.keyboard.press('Tab');
  checks.firstTab = await page.evaluate(() => document.activeElement?.className);
  await page.focus('.path-card[data-path="make"]');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(100);
  checks.focusAfterPath = await page.evaluate(() => document.activeElement?.id || document.activeElement?.className);
  await page.focus('.tpl-card .v2-btn--primary');
  await page.keyboard.press('Enter');
  await page.waitForSelector('[data-workspace][data-layout]');
  await injectDemo(page);
  const settings = page.locator('.ws-top button[aria-label="설정"]');
  await settings.focus();
  await page.keyboard.press('Enter');
  await page.waitForSelector('[role=dialog]');
  const dlg = { opened: await page.evaluate(() => { const d = document.querySelector('[role=dialog]'); return { modal: d.getAttribute('aria-modal'), labelled: !!document.getElementById(d.getAttribute('aria-labelledby')), focusInside: d.contains(document.activeElement), bgInert: document.getElementById('app').inert }; }) };
  let escaped = 0;
  for (let i = 0; i < 12; i++) { await page.keyboard.press('Tab'); if (!(await page.evaluate(() => document.querySelector('[role=dialog]').contains(document.activeElement)))) escaped++; }
  for (let i = 0; i < 5; i++) { await page.keyboard.press('Shift+Tab'); if (!(await page.evaluate(() => document.querySelector('[role=dialog]').contains(document.activeElement)))) escaped++; }
  dlg.tabEscapes = escaped;
  await page.screenshot({ path: path.join(OUT, 'mid-1366x768-dialog-settings.png') });
  await page.click('[role=dialog] .v2-seg__btn:has-text("모두 끄기")');
  dlg.mutedPref = await page.evaluate(() => localStorage.getItem('vibe2_pref_muted'));
  dlg.htmlMuted = await page.evaluate(() => document.documentElement.dataset.muted);
  await page.keyboard.press('Escape');
  dlg.closedByEsc = await page.evaluate(() => !document.querySelector('[role=dialog]'));
  dlg.focusReturned = await page.evaluate(() => document.activeElement?.getAttribute('aria-label'));
  dlg.bgInertAfter = await page.evaluate(() => document.getElementById('app').inert);
  checks.dialog = dlg;

  checks.shellApi = await page.evaluate(async () => {
    const { mountWorkspace } = await import('./ui/shell.js');
    const host = document.createElement('div'); document.body.append(host);
    const back = [];
    const s = mountWorkspace(host, { grade: 'mid', title: 'API 확인', onBack: () => back.push(1) });
    s.setStep('try');
    const cur = host.querySelector('.ws-step[aria-current="step"]')?.dataset.step;
    s.setAiStatus('assembling');
    const ai = host.querySelector('.ws-ai').textContent;
    s.setAiStatus('idle');
    const aiHiddenIdle = host.querySelector('.ws-ai').hidden;
    s.say({ text: '네모를 먼저 놓아요. 그다음 세모를 놓아요.', tone: 'hint', actions: [{ label: '다시 보기', onClick() {} }] });
    const sayText = host.querySelector('.ws-say__text').textContent;
    s.setSaveState('error');
    const saveLabel = host.querySelector('.v2-savebadge').textContent;
    const opener = host.querySelector('.ws-back'); opener.focus();
    const d = s.dialog({ title: '확인', body: '정말 비울까요?', actions: [{ label: '취소' }, { label: '비우기', primary: true }] });
    const inDlg = document.querySelector('[role=dialog]').contains(document.activeElement);
    d.close();
    const backFocus = document.activeElement === opener;
    s.onBack(() => back.push(2));
    opener.click();
    s.destroy(); s.destroy();
    const gone = !host.querySelector('[data-workspace]');
    host.remove();
    return { cur, ai, aiHiddenIdle, sayText, saveLabel, inDlg, backFocus, back, gone };
  });

  // 2열에서는 도움이 탭 → 키보드로 탭 전환 확인
  await page.focus('.ws-tab[data-pane="editor"]');
  await page.keyboard.press('ArrowRight');
  checks.tabKeyboard = await page.evaluate(() => ({ focused: document.activeElement?.dataset.pane, assistVisible: !document.querySelector('[data-assist]').hidden, newsCleared: !document.querySelector('.ws-tab[data-pane="assist"]').dataset.news }));
  await page.screenshot({ path: path.join(OUT, 'mid-1366x768-workspace-assist-tab.png') });
  checks.ime = await page.evaluate(async () => {
    window.__sent = 0;
    const ta = document.querySelector('[data-assist] textarea');
    ta.focus(); ta.value = '생선이 천천히';
    const kd = o => ta.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true, ...o }));
    ta.dispatchEvent(new CompositionEvent('compositionstart'));
    kd({ isComposing: true, keyCode: 229 });
    ta.dispatchEvent(new CompositionEvent('compositionend'));
    kd({});
    const early = window.__sent;
    await new Promise(r => setTimeout(r, 120));
    kd({ shiftKey: true });
    const afterShift = window.__sent;
    kd({});
    const final = window.__sent;
    window.__ti.setBusy(true);
    const draftEditable = !ta.disabled && !ta.readOnly;
    kd({});
    const whileBusy = window.__sent;
    const cancelVisible = !document.querySelector('[data-assist] .v2-textinput .v2-btn:not(.v2-btn--primary)').hidden;
    window.__ti.setBusy(false);
    return { early, afterShift, final, draftEditable, whileBusy, cancelVisible };
  });

  await page.fill('[data-assist] textarea', '초안 보존 확인');
  const seq = [];
  for (const [w, h] of [[1366, 768], [1440, 900], [800, 1100], [390, 844], [1024, 768]]) {
    await page.setViewportSize({ width: w, height: h });
    await page.waitForTimeout(150);
    seq.push(await page.evaluate(() => ({ w: innerWidth, layout: document.querySelector('[data-workspace]').dataset.layout, draft: document.querySelector('[data-assist] textarea').value, overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth })));
  }
  checks.resize = seq;

  await page.setViewportSize({ width: 1024, height: 768 });
  await page.click('.ws-back');
  await page.waitForSelector('.v2-home');
  checks.homeRestoredView = await page.evaluate(() => document.querySelector('.home-pathhead h1')?.textContent || 'start');
  checks.errors = errs;
  await ctx.close();

  const c2 = await browser.newContext({ viewport: { width: 1024, height: 768 }, reducedMotion: 'reduce' });
  const p2 = await c2.newPage();
  await p2.goto(BASE, { waitUntil: 'networkidle' });
  checks.reducedMotion = await p2.evaluate(() => ({ attr: document.documentElement.dataset.motion, transition: getComputedStyle(document.querySelector('.path-card')).transitionDuration }));
  await c2.close();

  await browser.close();
  fs.writeFileSync(path.join(OUT, 'measurements.json'), JSON.stringify({ report, checks }, null, 2));
  console.log(JSON.stringify(checks, null, 1));
  for (const [k, r] of Object.entries(report)) {
    console.log(k, ['home', 'path', 'workspace'].map(s => `${s}: sw=${r[s].scrollWidth}/${r[s].clientWidth} ovf=${r[s].overflowX} small=${r[s].smallCount}${r[s].layout ? ' layout=' + r[s].layout + '/' + r[s].fit + ' hdr=' + r[s].headerH + ' rows=' + r[s].headerRows : ''}${r[s].missionCard ? ' mission=' + r[s].missionCard : ''}${r[s].tplCard ? ' tpl=' + r[s].tplCard : ''} font=${r[s].bodyFont} ${r[s].smallTargets.join('|')} ${r[s].overflowEls.join(',')}`).join('\n   '), 'err=' + r.errors.length, r.errors.slice(0, 2).join(' / '));
  }
})().catch(e => { console.error(e); process.exit(1); });
