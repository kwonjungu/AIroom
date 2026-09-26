import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { contrastRatio, extractColorTokens, parseHex } from '../../../public/vibe-v2/ui/contrast.js';

const css = readFileSync(new URL('../../../public/vibe-v2/styles/tokens.css', import.meta.url), 'utf8');
const c = extractColorTokens(css);

test('대비 계산: 알려진 값', () => {
  assert.equal(Math.round(contrastRatio('#000000', '#FFFFFF') * 100) / 100, 21);
  assert.equal(contrastRatio('#777', '#777'), 1);
  // WebAIM 기준값: #767676 on white ≈ 4.54
  assert.ok(Math.abs(contrastRatio('#767676', '#FFFFFF') - 4.54) < 0.01);
  assert.deepEqual(parseHex('#abc'), [170, 187, 204]);
  assert.throws(() => parseHex('red'));
});

test('토큰 파일에서 색을 읽는다', () => {
  for (const k of ['c-bg', 'c-surface', 'c-surface-2', 'c-text', 'c-text-muted', 'c-border', 'c-focus', 'c-success', 'c-warn', 'c-danger', 'c-on-accent', 'c-accent-cards', 'c-accent-make', 'c-accent-learn']) {
    assert.ok(c[k], 'missing token ' + k);
  }
});

const BG = ['c-bg', 'c-surface', 'c-surface-2'];

test('본문 대비 4.5:1 이상 (본문·보조·상태 글자)', () => {
  for (const fg of ['c-text', 'c-text-muted', 'c-success', 'c-warn', 'c-danger']) {
    for (const bg of BG) {
      const r = contrastRatio(c[fg], c[bg]);
      assert.ok(r >= 4.5, `${fg} on ${bg} = ${r.toFixed(2)}`);
    }
  }
});

test('강조색 버튼: 흰 글자 4.5:1 이상, 흰 배경 위 강조색 글자 4.5:1 이상', () => {
  for (const a of ['c-accent-cards', 'c-accent-make', 'c-accent-learn']) {
    const onBtn = contrastRatio(c['c-on-accent'], c[a]);
    assert.ok(onBtn >= 4.5, `on-accent on ${a} = ${onBtn.toFixed(2)}`);
    for (const bg of ['c-surface', 'c-bg']) {
      const r = contrastRatio(c[a], c[bg]);
      assert.ok(r >= 4.5, `${a} on ${bg} = ${r.toFixed(2)}`);
    }
  }
});

test('강조색 옅은 배경(태그·선택 표시) 위 강조색 글자 4.5:1 이상', () => {
  const pairs = [...css.matchAll(/\[data-accent="(\w+)"\]\s*\{\s*--c-accent:\s*var\(--c-accent-(\w+)\);\s*--c-accent-soft:\s*(#[0-9A-Fa-f]{6})/g)];
  assert.equal(pairs.length, 3);
  for (const [, name, key, soft] of pairs) {
    const r = contrastRatio(c['c-accent-' + key], soft);
    assert.ok(r >= 4.5, `${name}: accent on soft = ${r.toFixed(2)}`);
    assert.ok(contrastRatio(c['c-text'], soft) >= 4.5);
  }
});

test('필수 UI 경계·포커스 3:1 이상', () => {
  for (const k of ['c-border', 'c-focus']) {
    for (const bg of BG) {
      const r = contrastRatio(c[k], c[bg]);
      assert.ok(r >= 3, `${k} on ${bg} = ${r.toFixed(2)}`);
    }
  }
});

test('저학년 스코프가 글자·조작 크기를 키운다', () => {
  const low = css.slice(css.indexOf('[data-grade="low"] {'));
  const val = (src, name) => Number((src.match(new RegExp(`--${name}:\\s*(\\d+)px`)) || [])[1]);
  assert.equal(val(css, 'fs-body'), 18);
  assert.equal(val(low, 'fs-body'), 20);
  assert.equal(val(css, 'tap-min'), 48);
  assert.equal(val(low, 'tap-min'), 56);
  assert.ok(val(low, 'btn-h-primary') >= 56 && val(low, 'btn-h-primary') <= 64);
  assert.ok(val(css, 'btn-h-primary') >= 48 && val(css, 'btn-h-primary') <= 56);
  assert.ok(val(low, 'mission-min-w') >= 112 && val(low, 'mission-min-h') >= 128);
  assert.ok(val(css, 'mission-min-w') >= 104 && val(css, 'mission-min-h') >= 120);
  assert.ok(val(low, 'btn-gap') >= 12 && val(css, 'btn-gap') >= 8);
  const succ = Number((css.match(/--dur-success:\s*(\d+)ms/) || [])[1]);
  assert.ok(succ >= 600 && succ <= 1200);
  assert.match(css, /prefers-reduced-motion/);
  assert.doesNotMatch(css, /https?:\/\//, '외부 글꼴·CDN 참조 없음');
});
