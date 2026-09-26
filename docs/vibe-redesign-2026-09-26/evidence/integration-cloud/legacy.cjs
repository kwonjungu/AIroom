const { chromium } = require(process.env.PW);
const SRC = `PLAYER 🐢 200 260
BG #0d3b66
SET 목숨 3
SHOW_VAR 목숨
ON_KEY LEFT { MOVE_X -20 }
ON_KEY RIGHT { MOVE_X 20 }
EVERY 1000 { SPAWN_RANDOM 🍎 }
EVERY 2000 { SPAWN_RANDOM 💣 }
EVERY 100 { MOVE_ALL 🍎 0 5
MOVE_ALL 💣 0 7 }
ON_TOUCH 🍎 { SCORE 1
REMOVE }
ON_TOUCH 💣 { CHANGE 목숨 -1
REMOVE }
ON_VAR 목숨 <= 0 { END_LOSE }
ON_SCORE 10 { END_WIN }`;
(async () => {
  const [port, out] = [process.argv[2], process.argv[3]];
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1366, height: 768 } });
  const errs = []; const api = [];
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push(m.text()); });
  p.on('pageerror', e => errs.push(String(e)));
  p.on('response', r => { if (r.url().includes('/api/vibe')) api.push(r.request().method() + ' ' + new URL(r.url()).pathname.replace(/[pj]_[\w-]+/g, ':id') + ' ' + r.status()); });
  await p.goto(`http://127.0.0.1:${port}/vibe-v2/`, { waitUntil: 'networkidle' });
  await p.evaluate(async (src) => {
    const { legacyStudio } = await import('/vibe-v2/shared/contracts/fixtures.js');
    const { createIndexedDbStorage } = await import('/vibe-v2/persistence/storage.js');
    const pr = legacyStudio();
    pr.id = 'p_legacy_apple'; pr.title = '예전 사과 게임';
    pr.program.nodes[0].args.source = src;
    await createIndexedDbStorage().put('project:' + pr.id, { format: 1, project: pr, remoteId: null, serverRevision: null, dirty: false, savedAt: new Date().toISOString() });
  }, SRC);
  await p.reload({ waitUntil: 'networkidle' });
  await p.getByText('예전 사과 게임').first().click();
  await p.waitForTimeout(1500);
  await p.screenshot({ path: out + '-open.png' });
  const conv = p.locator('[data-convert]');
  console.log('convert button', await conv.count());
  if (!(await conv.isVisible().catch(() => false))) { await p.getByRole('button', { name: /만들기/ }).first().click().catch(() => {}); }
  await conv.click();
  await p.waitForTimeout(1500);
  console.log('badge after convert', JSON.stringify(await p.locator('[role=status]').first().innerText().catch(()=>'')));
  console.log('idb right after convert', JSON.stringify(await p.evaluate(async () => { const { createIndexedDbStorage } = await import('/vibe-v2/persistence/storage.js'); return (await createIndexedDbStorage().keys()); })));
  const title = await p.locator('header, [data-workspace]').first().innerText().catch(() => '');
  console.log('after title', JSON.stringify(title.split('\n').slice(0, 3)));
  await p.getByRole('button', { name: /해보기/ }).first().click();
  await p.waitForTimeout(300);
  await p.getByRole('button', { name: /해보기|시작/ }).nth(1).click().catch(() => {});
  await p.keyboard.down('ArrowLeft'); await p.waitForTimeout(1500); await p.keyboard.up('ArrowLeft');
  await p.waitForTimeout(1500);
  await p.screenshot({ path: out + '-converted-play.png' });
  await p.getByRole('button', { name: /돌아가기/ }).first().click(); await p.waitForTimeout(1200);
  const recent = await p.getByText(/예전 사과 게임/).allTextContents();
  console.log('home recent', JSON.stringify(recent));
  await p.screenshot({ path: out + '-home.png' });
  console.log('idb', JSON.stringify(await p.evaluate(async () => { const { createIndexedDbStorage } = await import('/vibe-v2/persistence/storage.js'); const s = createIndexedDbStorage(); const ks = await s.keys(); return Promise.all(ks.map(async k => [k, (await s.get(k)).project.title, (await s.get(k)).project.program.nodes.map(n=>n.kind).join(',')])); })));
  console.log('api', JSON.stringify(api));
  console.log('errors', JSON.stringify(errs));
  await b.close();
})();
