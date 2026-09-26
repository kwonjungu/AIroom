// WP4 캔버스 렌더러: letterbox·DPR 상한·포인터 역변환·emoji/이미지/실패 placeholder. Node에서는 가짜 canvas로 검사.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRenderer, createAssetResolver, containBox } from '../../../public/vibe-v2/shared/runtime/canvas-renderer.js';
import { simulate } from '../../../public/vibe-v2/shared/runtime/simulate.js';
import { catchGame } from '../../../public/vibe-v2/shared/contracts/fixtures.js';
import { createTemplateProject } from '../../../public/vibe-v2/shared/templates/index.js';

function fakeCanvas(rect) {
  const calls = [];
  const ctx = new Proxy({}, {
    get(target, k) {
      if (k in target) return target[k];
      return (...args) => { calls.push([k, ...args]); };
    },
    set(target, k, v) { target[k] = v; calls.push(['set:' + String(k), v]); return true; },
  });
  return { width: 0, height: 0, calls, getContext: () => ctx, getBoundingClientRect: () => rect };
}

test('letterbox: 가로로 긴 화면에서 4:3 논리 무대를 가운데 맞추고 DPR은 dprMax로 제한', () => {
  const c = fakeCanvas({ left: 10, top: 20, width: 1000, height: 600 });
  const r = createRenderer(c, { dprMax: 2, devicePixelRatio: 3 });
  const snap = simulate(catchGame(), { seed: 1, ticks: 120 }).finalSnapshot;
  const t = r.render(snap, createAssetResolver(catchGame().assets));
  assert.equal(t.dpr, 2);
  assert.equal(c.width, 2000);
  assert.equal(c.height, 1200);
  assert.equal(t.scale, 1);          // 600/600
  assert.equal(t.ox, 100);           // (1000-800)/2
  assert.equal(t.oy, 0);
  assert.ok(c.calls.some(x => x[0] === 'setTransform' && x[1] === 2 && x[5] === 200 && x[6] === 0));
});

test('toLogical: 렌더와 같은 행렬의 역변환 — 무대 모서리·가운데·letterbox 바깥', () => {
  const c = fakeCanvas({ left: 10, top: 20, width: 400, height: 600 }); // 세로로 긴 화면
  const r = createRenderer(c, { dprMax: 2, devicePixelRatio: 1.5 });
  r.render({ tick: 0, state: 'ready', score: 0, lives: 0, entities: [], events: [], diagnostics: [], background: null, maze: null });
  const t = r.getTransform();
  assert.equal(t.scale, 0.5);
  assert.equal(t.oy, 150);           // (600-300)/2
  const center = r.toLogical(10 + 200, 20 + 300);
  assert.ok(Math.abs(center.x - 400) < 1e-9 && Math.abs(center.y - 300) < 1e-9);
  const tl = r.toLogical(10, 20 + 150);
  assert.ok(Math.abs(tl.x) < 1e-9 && Math.abs(tl.y) < 1e-9 && tl.inside);
  const outside = r.toLogical(10 + 5, 20 + 10);
  assert.equal(outside.inside, false);
  // 정방향과 왕복: 논리 (x,y) → backing 픽셀 → client → 논리
  for (const [x, y] of [[123, 456], [800, 600], [0, 0]]) {
    const bx = t.a * x + t.e, by = t.a * y + t.f;
    const back = r.toLogical(10 + bx / t.dpr, 20 + by / t.dpr);
    assert.ok(Math.abs(back.x - x) < 1e-9 && Math.abs(back.y - y) < 1e-9);
  }
});

test('emoji preset은 글자로, 이미지 preset은 로딩 전·실패 시 placeholder 원, 성공 시 drawImage', () => {
  const c = fakeCanvas({ left: 0, top: 0, width: 800, height: 600 });
  const pending = [];
  const r = createRenderer(c, { devicePixelRatio: 1, loadImage: (src, done) => { pending.push({ src, done }); return { src }; } });
  const snap = { tick: 0, state: 'playing', score: 0, lives: 0, invincible: false, background: 'bg.main', maze: null, events: [], diagnostics: [],
    entities: [
      { id: 'player', entity: 'player', x: 100, y: 100, r: 20, slot: 'player.appearance' },
      { id: 'a-1', entity: 'a', x: 200, y: 200, r: 20, slot: 'a.appearance' },
      { id: 'b-1', entity: 'b', x: 300, y: 300, r: 20, slot: 'b.appearance' },
    ] };
  const resolve = createAssetResolver([
    { slotId: 'bg.main', assetId: null, preset: 'bg-sky' },
    { slotId: 'player.appearance', assetId: null, preset: 'emoji:🐱' },
    { slotId: 'a.appearance', assetId: 'gen-ok', preset: null },
    { slotId: 'b.appearance', assetId: 'gen-bad', preset: null },
  ], { 'gen-ok': '/a.png', 'gen-bad': '/b.png' });
  r.render(snap, resolve);
  assert.ok(c.calls.some(x => x[0] === 'fillText' && x[1] === '🐱'));
  assert.equal(c.calls.filter(x => x[0] === 'arc').length, 2, '두 이미지 모두 로딩 중 → placeholder');
  pending.find(p => p.src === '/a.png').done(true);
  pending.find(p => p.src === '/b.png').done(false);
  assert.equal(r.imageStatus('/b.png'), 'error');
  c.calls.length = 0;
  r.render(snap, resolve);
  assert.equal(c.calls.filter(x => x[0] === 'drawImage').length, 1);
  assert.equal(c.calls.filter(x => x[0] === 'arc').length, 1, '실패한 이미지만 placeholder');
  assert.equal(pending.length, 2, '같은 이미지는 다시 불러오지 않는다');
});

test('미로 스냅샷은 벽·도착 칸을 그린다', () => {
  const { project } = createTemplateProject('maze', { map: 'first' }, { now: '2026-09-26T00:00:00.000Z' });
  const snap = simulate(project, { seed: 1, ticks: 1 }).finalSnapshot;
  const c = fakeCanvas({ left: 0, top: 0, width: 800, height: 600 });
  createRenderer(c, { devicePixelRatio: 1 }).render(snap, createAssetResolver(project.assets));
  const rects = c.calls.filter(x => x[0] === 'fillRect');
  const walls = project.program.nodes.find(n => n.kind === 'mazeMap').args.rows.join('').split('').filter(ch => ch === '#').length;
  assert.ok(rects.length >= walls + 1);
});

test('이미지 스프라이트는 비율 유지(contain): 107×160이면 r*2 상자 안에 세로 꽉, 가로 가운데', () => {
  const c = fakeCanvas({ left: 0, top: 0, width: 800, height: 600 });
  const r = createRenderer(c, { devicePixelRatio: 1, loadImage: (src, done) => { done(true); return { src, naturalWidth: 107, naturalHeight: 160 }; } });
  const snap = { tick: 0, state: 'playing', score: 0, lives: 0, background: null, maze: null, events: [], diagnostics: [],
    entities: [{ id: 'player', entity: 'player', x: 200, y: 300, r: 40, slot: 'player.appearance' }] };
  const resolve = createAssetResolver([{ slotId: 'player.appearance', assetId: null, preset: 'sprite:cat' }], { 'sprite:cat': '/assets/vibe/sp-cat.png' });
  r.render(snap, resolve);
  const [, , dx, dy, dw, dh] = c.calls.find(x => x[0] === 'drawImage');
  assert.equal(dh, 80);
  assert.ok(Math.abs(dw - 80 * 107 / 160) < 1e-9);
  assert.ok(Math.abs(dx + dw / 2 - 200) < 1e-9 && Math.abs(dy + dh / 2 - 300) < 1e-9, '가운데 정렬');
  assert.deepEqual(containBox({ width: 300, height: 100 }, 60), { w: 60, h: 20 });
  assert.deepEqual(containBox({}, 60), { w: 60, h: 60 }, '크기를 모르면 정사각형');
});

test('createAssetResolver: 실제 WP6 manifest.json(전체·urls 둘 다)으로 preset·assetId 해석', () => {
  const manifest = JSON.parse(readFileSync(new URL('../../../public/vibe-v2/assets/manifest.json', import.meta.url), 'utf8'));
  assert.equal(typeof manifest.urls, 'object');
  const gid = 'ga_0123456789abcdef0123456789abcdef';
  const assets = [
    { slotId: 'bg.main', assetId: null, preset: 'bg-meadow' },
    { slotId: 'player.appearance', assetId: null, preset: 'sprite:cat' },
    { slotId: 'apple.appearance', assetId: null, preset: 'emoji:🍎' },
    { slotId: 'sky', assetId: null, preset: 'bg-sky' },
    { slotId: 'gen', assetId: gid, preset: 'sprite:robot' },
  ];
  for (const m of [manifest, manifest.urls]) {
    const resolve = createAssetResolver(assets, m);
    assert.deepEqual(resolve('bg.main'), { src: manifest.urls['bg-meadow'] });
    assert.match(resolve('bg.main').src, /^\/assets\/vibe\/.+\.(jpg|png)$/);
    assert.deepEqual(resolve('player.appearance'), { src: '/assets/vibe/sp-cat.png' });
    assert.equal(resolve('apple.appearance'), 'emoji:🍎');
    assert.equal(resolve('sky'), 'bg-sky', 'manifest에 없는 배경 preset은 색으로');
    assert.deepEqual(resolve('gen'), { src: manifest.urls['sprite:robot'] }, '생성 에셋이 아직 없으면 preset 이미지');
    assert.equal(resolve('nope'), null);
  }
  const arrived = createAssetResolver(assets, { ...manifest.urls, [gid]: `/api/vibe/assets/files/${gid}` });
  assert.match(arrived('gen').src, /^\/api\/vibe\/assets\/files\/ga_/);
  for (const k of ['bg-meadow', 'bg-ruins', 'bg-space']) assert.ok(manifest.urls[k], `템플릿 배경 ${k}`);
});
