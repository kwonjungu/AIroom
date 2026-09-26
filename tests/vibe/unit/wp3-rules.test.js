// WP3 게임 공방: 규칙 카드 문장·학년별 값 단계·규칙 편집 연산 (DOM 없음)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  summarizeRules, ruleSentence, describeValue, nearestStep, controlFor, setValueOps, removeRuleOps,
  addPresetOps, availablePresets, setLookOps, exampleChips, controlsLine, josa,
} from '../../../public/vibe-v2/modes/studio/rules.js';
import { preflightEdit, verifyProject } from '../../../public/vibe-v2/modes/studio/flow.js';
import { catchGame, legacyStudio } from '../../../public/vibe-v2/shared/contracts/fixtures.js';
import { createTemplateProject } from '../../../public/vibe-v2/shared/templates/index.js';
import { EDITABLE_PARAMS } from '../../../public/vibe-v2/shared/contracts/nodes.js';

const node = (p, id) => p.program.nodes.find(n => n.id === id);
const texts = (p, g) => summarizeRules(p, g).map(c => c.text);
const GENRES = ['catch', 'avoid', 'collect', 'maze'];
const tpl = id => createTemplateProject(id, {}, { id: 'p_t_' + id }).project;

test('받기 fixture 규칙 요약 (high: 수치 그대로)', () => {
  const t = texts(catchGame(), 'high');
  assert.ok(t.includes('🐟 생선이 0.9초마다 떨어져요 · 속도 120'), t.join('\n'));
  assert.ok(t.includes('🐟에 닿으면 점수 +1, 생선은 사라져요'));
  assert.ok(t.includes('점수 10이면 성공'));
  assert.ok(t.includes('시간이 끝나면 실패'));
  assert.ok(t.includes('제한 시간 60초'));
  assert.ok(t.some(x => x.startsWith('주인공 🐱는 좌우로 움직여요 · 속도 320')));
  // 목숨 0 = 목숨 규칙 없음 → 카드로 보이지 않는다
  assert.ok(!t.some(x => x.startsWith('목숨')));
});

test('받기 fixture 규칙 요약 (mid: 단계 표기, 정확하지 않은 값은 "쯤")', () => {
  const t = texts(catchGame(), 'mid');
  assert.ok(t.includes('🐟 생선이 보통 떨어져요 · 속도 보통쯤'), t.join('\n'));
  assert.ok(t.some(x => x === '주인공 🐱는 좌우로 움직여요 · 속도 보통'));
});

test('low 학년은 mid 표기를 쓴다 (공방은 3~6학년 기본)', () => {
  assert.deepEqual(texts(catchGame(), 'low'), texts(catchGame(), 'mid'));
});

test('describeValue / nearestStep 학년별 매핑', () => {
  const p = catchGame();
  const sp = node(p, 'fish-fall');
  assert.equal(describeValue(sp, 'speed', 80, 'mid'), '느리게');
  assert.equal(describeValue(sp, 'speed', 84, 'mid'), '느리게쯤');
  assert.equal(describeValue(sp, 'speed', 84, 'high'), '84');
  assert.equal(describeValue(sp, 'intervalMs', 900, 'high'), '0.9초');
  assert.equal(describeValue(sp, 'intervalMs', 500, 'mid'), '자주');
  assert.equal(describeValue(node(p, 'win'), 'value', 10, 'mid'), '10점');
  assert.equal(nearestStep([{ v: 1 }, { v: 5 }, { v: 9 }], 6).v, 5);
  assert.equal(nearestStep([], 3), null);
});

test('controlFor: mid는 단계 버튼, high는 범위 슬라이더(계약 범위 안)', () => {
  const p = catchGame();
  const sp = node(p, 'fish-fall');
  const mid = controlFor(sp, 'speed', 'mid', p);
  assert.equal(mid.kind, 'steps');
  assert.deepEqual(mid.options.map(o => o.label), ['느리게', '보통', '빠르게', '아주 빠르게']);
  const high = controlFor(sp, 'speed', 'high', p);
  assert.equal(high.kind, 'range');
  assert.ok(high.min >= 0 && high.max <= 600);
  assert.equal(controlFor(sp, 'entity', 'high', p), null, 'EDITABLE_PARAMS 밖은 조작 없음');
});

test('모든 장르 × 학년: 모든 조작 선택지가 사전 검사를 통과하고 EDITABLE_PARAMS 안에 있다', () => {
  for (const g of GENRES) {
    const p = tpl(g);
    assert.ok(verifyProject(p).ok, g);
    for (const grade of ['mid', 'high']) {
      const cards = summarizeRules(p, grade);
      assert.ok(cards.length >= 3, `${g} 카드 ${cards.length}`);
      for (const c of cards) {
        const n = node(p, c.nodeId);
        for (const ctl of c.controls) {
          assert.ok(EDITABLE_PARAMS[n.kind].includes(ctl.param), `${g} ${n.kind}.${ctl.param}`);
          const values = ctl.kind === 'range' ? [ctl.min, ctl.max, ctl.value] : ctl.options.map(o => o.value);
          for (const v of values) {
            const r = preflightEdit(p, setValueOps(p, n.id, ctl.param, v));
            // 미로 지도는 주인공 크기와 맞지 않는 지도가 있을 수 있다 → 그때는 적용 거부가 정답
            if (!r.ok) assert.equal(ctl.param, 'rows', `${g} ${n.id}.${ctl.param}=${JSON.stringify(v)} 거부: ${r.hint}`);
          }
        }
      }
    }
  }
});

test('규칙 추가: 받기에 폭탄 → 목숨·실패 규칙까지 함께 붙고 실행 검증 통과', () => {
  const p = catchGame();
  assert.ok(availablePresets(p).some(x => x.id === 'bomb'));
  const r = preflightEdit(p, addPresetOps(p, 'bomb'));
  assert.ok(r.ok, r.hint);
  const q = r.preview;
  assert.equal(node(q, 'stats').args.lives, 3);
  assert.ok(q.program.nodes.some(n => n.kind === 'loseWhen' && n.args.stat === 'livesZero'));
  assert.ok(q.assets.some(a => a.slotId === 'bomb.appearance' && a.preset === 'emoji:💣'));
  assert.ok(verifyProject(q).ok);
  assert.ok(!availablePresets(q).some(x => x.id === 'bomb'), '이미 있으면 선택지에서 빠진다');
  // 원래 규칙 유지
  assert.equal(node(q, 'fish-fall').args.speed, 120);
  assert.equal(node(q, 'win').args.value, 10);
  assert.ok(texts(q, 'high').includes('💣 폭탄이 1.5초마다 떨어져요 · 속도 170'));
});

test('규칙 추가: 모든 장르에서 모든 선택지가 성립한다', () => {
  for (const g of GENRES) {
    const p = tpl(g);
    for (const pr of availablePresets(p)) {
      const r = preflightEdit(p, addPresetOps(p, pr.id));
      assert.ok(r.ok, `${g}+${pr.id}: ${r.hint}`);
      assert.ok(verifyProject(r.preview).ok, `${g}+${pr.id} 실행 검증`);
    }
  }
});

test('규칙 빼기: 물건과 닿기 규칙을 함께 빼고, 유일한 점수 물건은 뺄 수 없다', () => {
  const p = catchGame();
  const only = preflightEdit(p, removeRuleOps(p, 'fish-fall'));
  assert.equal(only.ok, false);
  assert.match(only.hint, /점수/);
  const withBomb = preflightEdit(p, addPresetOps(p, 'bomb')).preview;
  const ops = removeRuleOps(withBomb, 'bomb-fall');
  assert.deepEqual(ops.map(o => o.nodeId), ['bomb-fall', 'touch-bomb']);
  assert.ok(preflightEdit(withBomb, ops).ok);
  // 시간 제한 빼기 → 제한 시간 0으로
  const t = removeRuleOps(p, 'lose');
  assert.deepEqual(t[1], { op: 'setParameter', nodeId: 'world', parameter: 'timeLimitSec', value: 0 });
  assert.ok(preflightEdit(p, t).ok);
});

test('removable: 주인공·무대·승리 조건·닿기 규칙은 빼기 버튼 없음', () => {
  const cards = summarizeRules(catchGame(), 'mid');
  const rm = Object.fromEntries(cards.map(c => [c.nodeId, c.removable]));
  assert.equal(rm.player, false);
  assert.equal(rm.win, false);
  assert.equal(rm['touch-fish'], false);
  assert.equal(rm['fish-fall'], true);
  assert.equal(rm.lose, true);
});

test('모습 바꾸기 → setAppearance (collider·규칙 불변)', () => {
  const p = catchGame();
  const r = preflightEdit(p, setLookOps(p, 'player', '🐶'));
  assert.ok(r.ok);
  assert.equal(r.preview.assets.find(a => a.slotId === 'player.appearance').preset, 'emoji:🐶');
  assert.deepEqual(node(r.preview, 'player').args, node(p, 'player').args);
});

test('예시 칩은 현재 작품의 물건 이름을 쓴다', () => {
  assert.deepEqual(exampleChips(catchGame()), ['생선이 조금 더 천천히 떨어지게', '생선이 조금 더 빨리 떨어지게', '목표 점수를 15점으로']);
  const col = exampleChips(tpl('collect'));
  assert.ok(col[0].startsWith('보석이 '));
  assert.deepEqual(exampleChips(tpl('maze')), []);
});

test('첫 조작 설명 한 줄', () => {
  assert.equal(controlsLine(catchGame()), '← → 방향키(A D)나 좌우 버튼으로 🐱를 움직여요. 점수 10이면 성공!');
  assert.match(controlsLine(tpl('maze')), /방향키\(WASD\).*도착\(G\)/);
});

test('옛 작품: legacySource는 보관 카드로만 보이고 조작이 없다', () => {
  const cards = summarizeRules(legacyStudio(), 'high');
  assert.equal(cards.length, 1);
  assert.equal(cards[0].controls.length, 0);
  assert.equal(cards[0].removable, false);
  assert.match(ruleSentence(legacyStudio().program.nodes[0], legacyStudio()).text, /보관/);
});

test('josa', () => {
  assert.equal(josa('생선', '이', '가'), '이');
  assert.equal(josa('사과', '이', '가'), '가');
  assert.equal(josa('🐟', '은', '는'), '는');
});
