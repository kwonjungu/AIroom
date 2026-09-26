// WP6 승인 manifest(AS06)·재사용 매칭·스타일/프롬프트 정제.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { buildManifest, serialize, readAssetBytes, MANIFEST_PATH, REPO_ROOT } from '../../../lib/vibe/assets/build-manifest.js';
import { readDimensions } from '../../../lib/vibe/assets/image/codec.js';
import { matchBrief, buildIndex } from '../../../lib/vibe/assets/match.js';
import { sanitizeSubject, buildPrompt, briefContentHash } from '../../../lib/vibe/assets/style.js';
import { createAssetResolver, BACKGROUND_COLORS } from '../../../public/vibe-v2/shared/runtime/canvas-renderer.js';
import { HEROES, CATCH_ITEMS, HAZARDS, GEMS } from '../../../public/vibe-v2/shared/templates/index.js';
import { catchGame } from '../../../public/vibe-v2/shared/contracts/fixtures.js';
import { validateAssetBrief } from '../../../public/vibe-v2/shared/contracts/schemas.js';

const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));

test('AS06: manifest.json이 실제 파일에서 다시 만든 결과와 바이트 단위로 같다(오래된 manifest 금지)', () => {
  // 작업 트리 줄바꿈(CRLF)과 무관하게 비교
  assert.equal(fs.readFileSync(MANIFEST_PATH, 'utf8').replace(/\r\n/g, '\n'), serialize(buildManifest()));
});

test('AS06: 모든 이미지 항목의 sha256·바이트·픽셀 크기가 실제 파일과 일치, 출처·승인·라이선스 기록', () => {
  let files = 0;
  for (const e of Object.values(manifest.entries)) {
    assert.ok(e.approval === 'approved', e.key);
    assert.ok(e.provenance && e.provenance.label, 'provenance ' + e.key);
    if (!e.src || e.aliasOf) continue;
    const buf = readAssetBytes(REPO_ROOT + '/public' + e.src); // SVG는 배포본(LF) 기준
    assert.equal(crypto.createHash('sha256').update(buf).digest('hex'), e.sha256, e.key);
    assert.equal(buf.length, e.bytes, e.key);
    const d = readDimensions(buf);
    assert.deepEqual([d.width, d.height], [e.width, e.height], e.key);
    assert.ok(e.license, e.key);
    assert.ok(['hand', 'ai'].includes(e.provenance.type), e.key);
    if (e.provenance.type === 'ai') assert.match(e.provenance.label, /^AI 생성\(Nano Banana, 배치 /);
    else assert.equal(e.provenance.label, '손제작');
    files++;
  }
  assert.equal(files, fs.readdirSync(REPO_ROOT + '/public/assets/vibe').filter(f => /\.(png|jpg|svg)$/.test(f)).length);
  // 별칭은 원본과 같은 hash
  for (const e of Object.values(manifest.entries)) if (e.aliasOf) assert.equal(e.sha256, manifest.entries[e.aliasOf].sha256);
  // 버전 = 내용 hash
  assert.match(manifest.manifestVersion, /^[a-f0-9]{16}$/);
});

test('AS06: urls는 createAssetResolver가 그대로 읽는다 — 이모지는 글꼴, 배경 preset은 이미지, 색 preset은 색', () => {
  const assets = [...catchGame().assets, { slotId: 'bg.alt', assetId: null, preset: 'bg-sky' }, { slotId: 'x.appearance', assetId: null, preset: 'sprite:cat' }];
  assets[0] = { slotId: 'bg.main', assetId: null, preset: 'bg-space' };
  const resolve = createAssetResolver(assets, manifest.urls);
  assert.deepEqual(resolve('bg.main'), { src: '/assets/vibe/bg-stage-space.jpg' });
  assert.equal(resolve('player.appearance'), 'emoji:🐱');       // urls에 이모지 없음 → 즉시 글꼴로
  assert.equal(resolve('bg.alt'), 'bg-sky');                     // 색 preset
  assert.deepEqual(resolve('x.appearance'), { src: '/assets/vibe/sp-cat.png' });
  for (const [k, v] of Object.entries(manifest.urls)) {
    assert.ok(!k.startsWith('emoji:'), k);
    assert.match(v, /^\/assets\/vibe\/[a-z0-9-]+\.(png|jpg|svg)$/);
  }
  for (const k of Object.keys(BACKGROUND_COLORS)) assert.ok(manifest.entries[k], 'bg preset ' + k);
});

test('manifest: 템플릿 이모지 preset 전부 등록, 첫 화면 예산 초과 없음, UI·도형 그림은 게임 슬롯 제외', () => {
  for (const e of [...Object.values(HEROES), ...Object.values(CATCH_ITEMS), ...Object.values(HAZARDS), ...Object.values(GEMS)]) {
    assert.ok(manifest.entries['emoji:' + e], 'emoji ' + e);
  }
  assert.deepEqual(manifest.budget.overMax, []);
  assert.ok(manifest.budget.gameSpriteMaxBytes <= 100 * 1024);
  for (const e of Object.values(manifest.entries)) if (e.kind === 'ui') assert.equal(e.usableInGame, false, e.key);
  for (const k of ['ui:shape-tri', 'ui:shape-rect', 'ui:shape-circle']) assert.equal(manifest.entries[k].usableInGame, false);
  for (const e of Object.values(manifest.entries)) if (e.kind === 'sfx' && !e.usableInGame) assert.ok(e.durationMs < 200);
  for (const e of Object.values(manifest.entries)) if (e.kind === 'sfx' && e.usableInGame) assert.ok(e.durationMs >= 200 && e.durationMs <= 1000, e.key);
});

test('match: 알려진 이름만이면 재사용(생성 안 함), 묘사가 붙으면 생성 + 가까운 placeholder', () => {
  const idx = buildIndex(manifest);
  const m = (kind, subject) => matchBrief({ kind, subject }, manifest, { index: idx });
  assert.equal(m('sprite', '고양이').preset, 'emoji:🐱');
  assert.equal(m('sprite', '귀여운 고양이를').decision, 'reuse');
  assert.equal(m('sprite', '아기고양이').preset, 'emoji:🐱');
  assert.equal(m('sprite', '사과').preset, 'emoji:🍎');
  assert.ok(m('sprite', '사과').candidates.some(c => c.key === 'sprite:apple'));
  assert.equal(m('sprite', '고양이', { prefer: 'image' }).decision, 'reuse');
  assert.equal(matchBrief({ kind: 'sprite', subject: '로켓' }, manifest, { prefer: 'image' }).preset, 'sprite:rocket');
  const g = m('sprite', '파란 목도리를 한 고양이');
  assert.equal(g.decision, 'generate');
  assert.equal(g.placeholder, 'emoji:🐱');
  assert.deepEqual(g.extraWords, ['파란', '목도리를']);
  assert.equal(m('sprite', '반짝이는 해파리 기사').decision, 'generate');
  assert.equal(m('sprite', '반짝이는 해파리 기사').placeholder, null);
  assert.equal(m('background', '우주').preset, 'bg-space');
  assert.equal(m('background', '파란 하늘').preset, 'bg-sky');
  assert.equal(m('background', '바닷속').preset, 'bg:canvas-ocean');
  assert.equal(m('card', '용암 행성').preset, 'card:planet-lava');
  assert.equal(m('sfx', '성공 소리').preset, 'sfx:success');
  // 게임에 쓰지 않는 그림(도형·UI)은 후보가 되지 않는다
  assert.ok(!m('sprite', '삼각형').candidates.some(c => c.key.startsWith('ui:')));
});

test('sanitizeSubject: 학교·학년반번호·전화·이메일·학생 이름·교사 이름 제거, 부적절 요청 거부', () => {
  const r = sanitizeSubject('백암초등학교 3학년 2반 15번 권민지가 그린 고양이 010-1234-5678 a@b.com 김철수 선생님', { studentNames: ['권민지'] });
  assert.equal(r.ok, true);
  for (const bad of ['백암', '초등학교', '3학년', '15번', '민지', '010', '@', '김철수', '선생님']) assert.ok(!r.text.includes(bad), bad + ' in ' + r.text);
  assert.ok(r.text.includes('고양이'));
  for (const c of ['SCHOOL', 'CLASS_NO', 'PHONE', 'EMAIL', 'STUDENT_NAME', 'TITLED_NAME']) assert.ok(r.removed.includes(c), c);
  // 오탐 없어야 하는 평범한 묘사
  for (const ok of ['고양이 친구', '공주님', '어린 양', '경찰 아저씨', '고양이야']) assert.equal(sanitizeSubject(ok).text, ok);
  assert.equal(sanitizeSubject('피투성이 괴물').code, 'UNSAFE_SUBJECT');
  assert.equal(sanitizeSubject('"안녕"이라고 쓰인 간판 든 곰').text.includes('안녕'), false);
  assert.equal(sanitizeSubject('12345').ok, false);
});

const brief = (over = {}) => ({
  schemaVersion: 1, projectId: 'p_demo1234', baseRevision: 3, slotId: 'player.appearance', kind: 'sprite',
  subject: '파란 목도리를 한 고양이', stylePack: 'toto-world-v1', dimensions: { width: 512, height: 512 },
  transparent: true, pose: 'front-idle', paletteId: 'warm-adventure', textInImage: false, ...over,
});

test('buildPrompt: 서버 스타일 템플릿 + 정제된 subject, 글자 금지, 투명 미지원 공급자는 크로마 배경 요청', () => {
  assert.deepEqual(validateAssetBrief(brief()), []);
  const p = buildPrompt(brief({ subject: '민지네 파란 고양이' }), { capabilities: { transparent: false }, studentNames: ['권민지'] });
  assert.equal(p.ok, true);
  assert.ok(p.prompt.includes('Flat vector illustration'));
  assert.ok(!p.prompt.includes('민지'));
  assert.match(p.prompt, /no text, letters, numbers/i);
  assert.equal(p.chromaKey, '#00FF00');
  assert.equal(buildPrompt(brief(), { capabilities: { transparent: true } }).chromaKey, null);
  assert.equal(buildPrompt(brief({ kind: 'background', transparent: false, dimensions: { width: 1024, height: 576 } }), { capabilities: { transparent: false } }).chromaKey, null);
  assert.equal(buildPrompt({ ...brief(), textInImage: true }).code, 'TEXT_IN_IMAGE_FORBIDDEN');
  assert.equal(buildPrompt(brief({ kind: 'sfx' })).code, 'SFX_NOT_GENERATED');
  // 내용 hash: 프로젝트·revision·슬롯과 무관
  assert.equal(briefContentHash(brief()), briefContentHash(brief({ projectId: 'p_other999', baseRevision: 9, slotId: 'cat.appearance' })));
  assert.notEqual(briefContentHash(brief()), briefContentHash(brief({ subject: '빨간 고양이' })));
});
