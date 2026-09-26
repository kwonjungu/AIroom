// 승인 에셋 manifest 생성기.
//   node lib/vibe/assets/build-manifest.js           → public/vibe-v2/assets/manifest.json 다시 쓰기
//   node lib/vibe/assets/build-manifest.js --check   → 파일과 비교만 (다르면 exit 1)
//
// sha256·바이트·픽셀 크기는 실제 파일에서 계산한다(추측 없음). 출력은 결정적(시각 없음)이라 --check가 안정적이다.
//
// manifest 형식 (schemaVersion 1):
//   urls    {key: url}   ← WP4 createAssetResolver(assets, manifest.urls)에 그대로 넘긴다. 이미지가 있는 키만.
//   entries {key: 메타}  ← 종류·출처·승인·sha256·크기·예산·매칭 키워드. emoji/sfx/색 preset도 여기(src 없음).
// 이모지 preset은 urls에 넣지 않는다 → 렌더러가 글꼴로 즉시 그린다(이미지 로딩 대기 없음).

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { readDimensions } from './image/codec.js';
import { FILE_RULES, FILE_COMMIT, PROVENANCE_GROUPS, EMOJI_PRESETS, BACKGROUND_PRESETS, SFX_PRESETS, BUDGET, STYLE_PACK_ID } from './catalog.js';

const here = path.dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = path.resolve(here, '../../..');
export const ASSET_DIR = path.join(REPO_ROOT, 'public/assets/vibe');
export const MANIFEST_PATH = path.join(REPO_ROOT, 'public/vibe-v2/assets/manifest.json');
export const URL_PREFIX = '/assets/vibe/';
export const MANIFEST_SCHEMA_VERSION = 1;

const LICENSE_INTERNAL = 'AIroom 내부 제작물 — 이 서비스 수업용으로만 사용';

export function sha256(buf) { return crypto.createHash('sha256').update(buf).digest('hex'); }

/**
 * 배포되는 바이트 그대로 읽는다. 텍스트 에셋(SVG)은 git이 LF로 저장·배포하지만 Windows 작업 트리(core.autocrlf=true)에서는
 * CRLF로 풀린다 → hash가 환경마다 달라지지 않게 CRLF를 LF로 정규화한다. 바이너리(PNG/JPG)는 그대로.
 */
export function readAssetBytes(file) {
  const buf = fs.readFileSync(file);
  if (!/\.svg$/i.test(file)) return buf;
  return Buffer.from(buf.toString('utf8').replace(/\r\n/g, '\n'), 'utf8');
}

/** @returns {object} manifest */
export function buildManifest({ assetDir = ASSET_DIR } = {}) {
  const files = fs.readdirSync(assetDir, { withFileTypes: true }).filter(d => d.isFile()).map(d => d.name).sort();
  const unknown = files.filter(f => !FILE_RULES[f]);
  if (unknown.length) throw new Error('카탈로그에 없는 에셋(미승인): ' + unknown.join(', ') + ' — lib/vibe/assets/catalog.js에 등록하세요.');
  const missing = Object.keys(FILE_RULES).filter(f => !files.includes(f));
  if (missing.length) throw new Error('카탈로그에 있으나 파일이 없음: ' + missing.join(', '));

  const entries = {};
  const urls = {};
  for (const file of files) {
    const rule = FILE_RULES[file];
    const buf = readAssetBytes(path.join(assetDir, file));
    const dim = readDimensions(buf);
    if (!dim) throw new Error('크기를 읽을 수 없음: ' + file);
    const commit = FILE_COMMIT[file];
    const prov = PROVENANCE_GROUPS[commit];
    if (!prov) throw new Error('출처 미기록: ' + file);
    const budget = BUDGET[rule.kind];
    const src = URL_PREFIX + file;
    const entry = {
      key: rule.key, kind: rule.kind, category: rule.category, src, file,
      mime: dim.mime, width: dim.width, height: dim.height, bytes: buf.length, sha256: sha256(buf),
      provenance: { ...prov, commit }, license: LICENSE_INTERNAL, approval: 'approved',
      usableInGame: rule.usableInGame !== false, ko: rule.ko, emoji: rule.emoji || null,
      budget: { targetBytes: budget.targetBytes, maxBytes: budget.maxBytes, withinTarget: buf.length <= budget.targetBytes, withinMax: buf.length <= budget.maxBytes },
      // 파생본(128/256/512)은 기존 승인 파일에 대해 만들지 않았다: 모든 게임 스프라이트가 이미 ≤ 13KB라 첫 화면 예산 안이다.
      derivatives: [],
      styleCompatible: rule.kind === 'sprite' || rule.kind === 'card' ? STYLE_PACK_ID : null,
    };
    if (dim.fromViewBox) entry.dimensionsFrom = 'svg-viewBox';
    entries[rule.key] = entry;
    urls[rule.key] = src;
    for (const alias of rule.aliases || []) {
      entries[alias] = { key: alias, kind: rule.kind, aliasOf: rule.key, src, approval: 'approved', usableInGame: true,
        ko: BACKGROUND_PRESETS[alias]?.ko || [], color: BACKGROUND_PRESETS[alias]?.color || null, sha256: entry.sha256,
        provenance: entry.provenance, license: entry.license };
      urls[alias] = src;
    }
  }
  for (const [key, bp] of Object.entries(BACKGROUND_PRESETS)) {
    if (entries[key]) continue; // 이미지 별칭이 있는 preset은 위에서 등록됨
    entries[key] = { key, kind: 'background', category: 'color', src: null, color: bp.color, approval: 'approved', usableInGame: true, ko: bp.ko,
      provenance: { type: 'color', label: '단색(렌더러 기본색)' }, license: LICENSE_INTERNAL };
  }
  for (const [emoji, ko] of EMOJI_PRESETS) {
    const key = 'emoji:' + emoji;
    entries[key] = { key, kind: 'sprite', category: 'emoji', src: null, emoji, approval: 'approved', usableInGame: true, ko,
      provenance: { type: 'system-emoji', label: '시스템 이모지 글꼴(기기마다 모양 다름)' }, license: 'OS 이모지 글꼴' };
  }
  for (const [key, s] of Object.entries(SFX_PRESETS)) {
    entries[key] = { key, kind: 'sfx', category: s.uiOnly ? 'ui-sound' : 'game-sound', src: null, synth: true, durationMs: s.durationMs,
      gameEvent: s.gameEvent, approval: 'approved', usableInGame: !s.uiOnly, ko: s.ko, bytes: 0,
      provenance: { type: 'synth', label: '손제작(WebAudio 합성, v1 playSfx 이식)' }, license: LICENSE_INTERNAL };
  }
  const sorted = Object.fromEntries(Object.keys(entries).sort().map(k => [k, entries[k]]));
  const sortedUrls = Object.fromEntries(Object.keys(urls).sort().map(k => [k, urls[k]]));
  const firstScreen = summarizeBudget(sorted);
  const body = { schemaVersion: MANIFEST_SCHEMA_VERSION, stylePack: STYLE_PACK_ID, urls: sortedUrls, entries: sorted, budget: firstScreen };
  const manifestVersion = sha256(JSON.stringify(body)).slice(0, 16);
  return { schemaVersion: MANIFEST_SCHEMA_VERSION, manifestVersion, generatedBy: 'lib/vibe/assets/build-manifest.js', ...body };
}

function summarizeBudget(entries) {
  const over = [], overTarget = [];
  for (const e of Object.values(entries)) {
    if (!e.budget) continue;
    if (!e.budget.withinMax) over.push(e.key);
    else if (!e.budget.withinTarget) overTarget.push(e.key);
  }
  // 게임 공방 첫 화면: 템플릿 기본 배경(최대) + 주인공·아이템 스프라이트
  const game = Object.values(entries).filter(e => e.src && e.usableInGame && !e.aliasOf && (e.kind === 'sprite' && e.category !== 'character' && e.category !== 'tile'));
  const maxSprite = Math.max(0, ...game.map(e => e.bytes));
  const bgs = ['bg-space', 'bg-meadow', 'bg-ruins'].map(k => entries[entries[k]?.aliasOf]?.bytes || 0);
  return {
    overMax: over, overTarget,
    gameSpriteMaxBytes: maxSprite,
    templateBackgroundMaxBytes: Math.max(0, ...bgs),
    note: '첫 화면 = 배경 1 + 스프라이트 2~3. 원본이 이미 예산 안이라 파생본 없이 원본을 전달한다.',
  };
}

export function serialize(m) { return JSON.stringify(m, null, 2) + '\n'; }

// CLI
if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  const m = buildManifest();
  const text = serialize(m);
  if (process.argv.includes('--check')) {
    const cur = fs.existsSync(MANIFEST_PATH) ? fs.readFileSync(MANIFEST_PATH, 'utf8').replace(/\r\n/g, '\n') : '';
    if (cur !== text) { console.error('manifest.json이 실제 파일과 다릅니다. node lib/vibe/assets/build-manifest.js 로 다시 만드세요.'); process.exit(1); }
    console.log(`manifest ok (${Object.keys(m.entries).length} entries, version ${m.manifestVersion})`);
  } else {
    fs.mkdirSync(path.dirname(MANIFEST_PATH), { recursive: true });
    fs.writeFileSync(MANIFEST_PATH, text);
    console.log(`wrote ${path.relative(REPO_ROOT, MANIFEST_PATH)} (${Object.keys(m.entries).length} entries, ${Object.keys(m.urls).length} urls, version ${m.manifestVersion})`);
    if (m.budget.overMax.length) console.log('예산 상한 초과:', m.budget.overMax.join(', '));
  }
}
