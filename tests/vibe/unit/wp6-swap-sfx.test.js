// WP6 클라이언트 교체(AS04·AS05)와 효과음 모듈.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { planSwap, applySwap, checkApplicable, createSwapQueue, mergeResolverMap, isSafeAssetUrl, placeholderFor } from '../../../public/vibe-v2/assets/swap.js';
import { createSfx, SFX, sfxForEvent, MUTE_KEY } from '../../../public/vibe-v2/assets/sfx.js';
import { simulate, recordInputs } from '../../../public/vibe-v2/shared/runtime/simulate.js';
import { createAssetResolver } from '../../../public/vibe-v2/shared/runtime/canvas-renderer.js';
import { catchGame } from '../../../public/vibe-v2/shared/contracts/fixtures.js';
import { createTemplateProject } from '../../../public/vibe-v2/shared/templates/index.js';
import { validateProject } from '../../../public/vibe-v2/shared/contracts/schemas.js';
import { SFX_PRESETS } from '../../../lib/vibe/assets/catalog.js';

const GA = 'ga_' + 'a'.repeat(32);
const arrivedFor = (project, over = {}) => ({
  status: 'ready', slotId: 'player.appearance',
  requestedFrom: { assetId: null, preset: 'emoji:🐱' },
  candidate: { assetId: GA, preset: null, url: '/api/vibe/assets/files/' + GA },
  ...over,
});

test('planSwap: 게임 중이면 미루고, 일시정지·시작 전·끝이면 외형 후보 제안', () => {
  const p = catchGame();
  const a = arrivedFor(p);
  assert.equal(planSwap(p.assets, a, 'playing').action, 'defer');
  for (const s of ['ready', 'paused', 'won', 'lost', 'halted', null]) {
    const plan = planSwap(p.assets, a, s);
    assert.equal(plan.action, 'apply-now', String(s));
    const slot = plan.nextAssets.find(x => x.slotId === 'player.appearance');
    assert.deepEqual(slot, { slotId: 'player.appearance', assetId: GA, preset: 'emoji:🐱' }); // preset은 fallback으로 유지
    assert.deepEqual(plan.resolverAdd, { [GA]: '/api/vibe/assets/files/' + GA });
  }
  assert.deepEqual(p.assets, catchGame().assets); // 원본 불변
});

test('AS04: 슬롯이 바뀌었거나·지워졌거나·취소됐으면 자동 덮어쓰기 0 (보관만)', () => {
  const p = catchGame();
  const changed = p.assets.map(a => (a.slotId === 'player.appearance' ? { ...a, preset: 'emoji:🐶' } : a));
  assert.deepEqual(planSwap(changed, arrivedFor(p), 'paused'), { action: 'keep-only', reason: 'SLOT_CHANGED' });
  const removed = p.assets.filter(a => a.slotId !== 'player.appearance');
  assert.equal(planSwap(removed, arrivedFor(p), 'paused').reason, 'SLOT_REMOVED');
  assert.equal(planSwap(p.assets, arrivedFor(p, { cancelled: true }), 'paused').reason, 'CANCELLED');
  assert.equal(planSwap(p.assets, arrivedFor(p, { status: 'cancelled' }), 'paused').action, 'ignore');
  assert.equal(planSwap(p.assets, arrivedFor(p, { status: 'generating' }), 'paused').action, 'ignore');
  assert.throws(() => applySwap(changed, arrivedFor(p)), /SLOT_CHANGED/);
  // 이미 적용된 것 재도착 → 무시
  const applied = applySwap(p.assets, arrivedFor(p));
  assert.equal(checkApplicable(arrivedFor(p), applied).reason, 'ALREADY_APPLIED');
  assert.equal(planSwap(applied, arrivedFor(p), 'paused').action, 'ignore');
});

test('교체 대기열: 게임 중 도착 → 일시정지 때 적용, 그 사이 학생이 바꾼 슬롯은 보관만', () => {
  const p = catchGame();
  const q = createSwapQueue();
  const fishGa = 'ga_' + 'b'.repeat(32);
  q.offer(p.assets, arrivedFor(p), 'playing');
  q.offer(p.assets, { status: 'ready', slotId: 'fish.appearance', requestedFrom: { assetId: null, preset: 'emoji:🐟' }, candidate: { assetId: fishGa, preset: null, url: '/api/vibe/assets/files/' + fishGa } }, 'playing');
  assert.equal(q.size(), 2);
  assert.equal(q.flush(p.assets, 'playing').applied.length, 0);   // 아직 게임 중
  const edited = p.assets.map(a => (a.slotId === 'fish.appearance' ? { ...a, preset: 'emoji:🍎' } : a));
  const r = q.flush(edited, 'paused');
  assert.deepEqual(r.applied, ['player.appearance']);
  assert.deepEqual(r.kept, [{ slotId: 'fish.appearance', reason: 'SLOT_CHANGED' }]);
  assert.equal(r.nextAssets.find(a => a.slotId === 'fish.appearance').preset, 'emoji:🍎');
  assert.equal(q.size(), 0);
});

test('AS05: 이미지 교체 전후 simulate 결과(trace·점수·위치·collider)가 완전히 같다', () => {
  const projects = [catchGame(), ...['avoid', 'collect', 'maze'].map(id => createTemplateProject(id, {}).project)];
  assert.equal(projects.filter(Boolean).length, 4);
  let events = 0;
  for (const p of projects) {
    assert.deepEqual(validateProject(p).filter(d => d.severity === 'error'), []);
    const slot = p.assets.find(a => a.slotId !== 'bg.main') || p.assets[0];
    const arrived = { status: 'ready', slotId: slot.slotId, requestedFrom: { assetId: slot.assetId, preset: slot.preset }, candidate: { assetId: GA, preset: null, url: '/api/vibe/assets/files/' + GA } };
    const swapped = { ...p, assets: applySwap(p.assets, arrived) };
    assert.deepEqual(swapped.program, p.program);                  // 규칙·collider(radius)·속도는 program에만 있다
    assert.deepEqual(validateProject(swapped).filter(d => d.severity === 'error'), []);
    const policy = s => { const pl = s.entities.find(e => e.id === 'player'); const t = s.entities.find(e => e.id !== 'player'); return !pl || !t ? {} : { left: t.x < pl.x - 5, right: t.x > pl.x + 5 }; };
    const { inputScript } = recordInputs(p, { seed: 7, ticks: 900, policy });
    const a = simulate(p, { seed: 7, ticks: 900, inputScript });
    const b = simulate(swapped, { seed: 7, ticks: 900, inputScript });
    assert.deepEqual(b.trace, a.trace);
    events += a.trace.length;
    const strip = s => ({ ...s, entities: s.entities.map(({ slot, ...rest }) => rest) });
    assert.deepEqual(strip(b.finalSnapshot), strip(a.finalSnapshot));
    // 렌더러는 교체된 슬롯에서 새 이미지를 받는다
    const resolve = createAssetResolver(swapped.assets, mergeResolverMap({}, [arrived]));
    assert.deepEqual(resolve(slot.slotId), { src: '/api/vibe/assets/files/' + GA });
    // 이미지가 없으면(맵에 없음) 기존 preset으로 그린다
    assert.equal(createAssetResolver(swapped.assets, {})(slot.slotId), slot.preset);
  }
  assert.ok(events > 20, 'trace가 실제 게임 사건을 담아야 비교가 의미 있다: ' + events);
});

test('mergeResolverMap: 같은 출처 경로만 — 임의 원격 URL은 캔버스에 넣지 않는다', () => {
  const ok = { status: 'ready', candidate: { assetId: GA, url: '/api/vibe/assets/files/' + GA } };
  const evil = { status: 'ready', candidate: { assetId: 'ga_' + 'c'.repeat(32), url: 'https://evil.example/x.png' } };
  const js = { status: 'ready', candidate: { assetId: 'ga_' + 'd'.repeat(32), url: 'javascript:alert(1)' } };
  const m = mergeResolverMap({ 'sprite:cat': '/assets/vibe/sp-cat.png' }, [ok, evil, js]);
  assert.deepEqual(Object.keys(m).sort(), [GA, 'sprite:cat'].sort());
  assert.equal(isSafeAssetUrl('/assets/vibe/sp-cat.png'), true);
  assert.equal(isSafeAssetUrl('//evil.example/a.png'), false);
  assert.equal(placeholderFor('sprite', { assetId: null, preset: 'emoji:🐱' }), 'emoji:🐱');
  assert.equal(placeholderFor('background', null), 'bg-sky');
  assert.equal(placeholderFor('sprite', null, 'emoji:🐉'), 'emoji:🐉');
});

// ── 효과음 ──
function fakeAudio() {
  const made = [];
  class Node { connect() { return this; } }
  class Param { setValueAtTime() {} linearRampToValueAtTime() {} exponentialRampToValueAtTime() {} }
  class Ctx {
    constructor() { made.push(this); this.state = 'suspended'; this.currentTime = 0; this.sampleRate = 8000; this.destination = new Node(); this.tones = 0; this.resumed = 0; }
    resume() { this.resumed++; this.state = 'running'; }
    suspend() { this.state = 'suspended'; }
    createGain() { const n = new Node(); n.gain = Object.assign(new Param(), { value: 1 }); return n; }
    createOscillator() { this.tones++; const n = new Node(); n.frequency = new Param(); n.start = () => {}; n.stop = () => {}; return n; }
    createBuffer(ch, len) { return { getChannelData: () => new Float32Array(len) }; }
    createBufferSource() { const n = new Node(); n.start = () => {}; return n; }
    createBiquadFilter() { const n = new Node(); n.frequency = new Param(); n.Q = { value: 0 }; return n; }
  }
  return { Ctx, made };
}
function memStorage(init = {}) { const m = new Map(Object.entries(init)); return { getItem: k => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)), m }; }

test('sfx: 사용자 제스처(unlock) 전에는 AudioContext를 만들지 않고 소리 없음', () => {
  const { Ctx, made } = fakeAudio();
  const s = createSfx({ AudioContext: Ctx, storage: memStorage() });
  assert.equal(s.play('success'), false);
  assert.equal(made.length, 0);
  assert.equal(s.unlock(), true);
  assert.equal(made.length, 1);
  assert.equal(made[0].state, 'running');
  for (const name of Object.keys(SFX)) assert.equal(s.play(name), true, name);
  assert.equal(s.play('nope'), false);
});

test('sfx: 전체 음소거 존중(v1과 같은 저장 키), 저장소 오류에도 동작', () => {
  const { Ctx, made } = fakeAudio();
  const st = memStorage({ [MUTE_KEY]: '1' });
  const s = createSfx({ AudioContext: Ctx, storage: st });
  assert.equal(s.isMuted(), true);
  s.unlock();
  assert.equal(s.play('star'), false);
  assert.equal(made.length, 0);
  s.setMuted(false);
  assert.equal(st.m.get(MUTE_KEY), '0');
  assert.equal(s.play('star'), true);
  s.toggleMute();
  assert.equal(made[0].state, 'suspended');
  const broken = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); } };
  const s2 = createSfx({ AudioContext: Ctx, storage: broken });
  assert.equal(s2.isMuted(), false);
  s2.setMuted(true);
  assert.equal(s2.isMuted(), true);
  assert.equal(createSfx({ AudioContext: null, storage: null }).play('pop'), false); // 오디오 없는 환경
});

test('sfx: 게임 이벤트음은 0.2~1초, 카탈로그 길이와 합성 정의가 같다, 이벤트 매핑', () => {
  for (const [name, d] of Object.entries(SFX)) {
    if (!d.uiOnly) assert.ok(d.durationMs >= 200 && d.durationMs <= 1000, name);
    assert.equal(SFX_PRESETS['sfx:' + name].durationMs, d.durationMs, name);
  }
  assert.equal(sfxForEvent('collect'), 'star');
  assert.equal(sfxForEvent('win'), 'success');
  assert.equal(sfxForEvent('lose'), 'fail');
  assert.equal(sfxForEvent('hit'), 'hit');
  assert.equal(sfxForEvent('spawn'), null); // 잦은 이벤트에는 소리 없음
  for (const ev of ['start', 'collect', 'hit', 'win', 'lose']) assert.ok(!SFX[sfxForEvent(ev)].uiOnly || ev === 'shielded', ev);
});
