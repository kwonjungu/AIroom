// 스타일 팩 + 공급자 프롬프트 구성 (서버 전용).
// 학생 입력은 subject 한 줄뿐이고, 나머지 문장은 전부 서버 템플릿이다. 모델·시스템 문구를 학생에게서 받지 않는다.
// 프롬프트에 실명·학교·학번·전화·이메일을 넣지 않는다(sanitizeSubject). textInImage는 항상 false.

import crypto from 'node:crypto';

export const PROMPT_VERSION = 'asset-prompt-v1';

export const STYLE_PACKS = Object.freeze({
  'toto-world-v1': {
    id: 'toto-world-v1',
    version: 'toto-world-v1@2026-09-26',
    // ASSET_PROMPTS.md §0 공통 스타일 (기존 승인 에셋과 같은 화풍)
    prefix: "Flat vector illustration for a children's educational coding app, thick soft rounded outlines, cel shading with 2 tones, "
      + 'bright saturated friendly colors, simple geometric details, cute mascot style, clean composition.',
    negative: 'realistic, photo, 3d render, text, letters, numbers, words, signature, watermark, logo, scary, gore, weapon, complex details, gradient mesh, checkerboard pattern',
    kinds: {
      sprite: 'A single game character or object sprite, full body, centered with generous empty margin on every side, facing the viewer.',
      card: 'A single illustration for a picture card, centered subject, simple rounded shapes, empty margin on every side.',
      background: 'A wide game background scene with no characters, calm and uncluttered, keep the center area simple so game pieces stay readable, no text or signs.',
    },
    poses: {
      'front-idle': 'standing still, friendly smile',
      'front-happy': 'jumping happily, big smile',
      'side-run': 'running to the side',
      item: 'simple object, no face',
      scene: 'wide scene',
    },
    palettes: {
      'warm-adventure': 'warm palette with coral #FF6B6B, star yellow #FFD166 and soft green #51CF66',
      'cool-space': 'cool palette with navy #1a1a2e, purple #7C4DFF and blue #4A90D9',
      'fresh-meadow': 'fresh palette with grass green #43A047, sky blue #BFE6FF and sunny yellow #FFD166',
      default: 'bright friendly palette',
    },
  },
});

const HANGUL_NAME = '[가-힣]{2,4}';
const PATTERNS = [
  // 학교·학급·번호
  { code: 'SCHOOL', re: /[가-힣A-Za-z]{1,20}\s*(초등학교|중학교|고등학교|학교|초교|분교|유치원|어린이집)/g },
  { code: 'CLASS_NO', re: /\d+\s*학년(\s*\d+\s*반)?(\s*\d+\s*번)?|\d+\s*반\s*\d+\s*번|\d+\s*번/g },
  { code: 'EMAIL', re: /[\w.+-]+@[\w-]+(\.[\w-]+)+/g },
  { code: 'PHONE', re: /0\d{1,2}[\s.-]?\d{3,4}[\s.-]?\d{4}/g },
  { code: 'LONG_NUMBER', re: /\d{4,}/g },
  { code: 'URL', re: /(https?:\/\/|www\.)\S+/gi },
  // 교사 호칭이 붙은 이름: "김민수 선생님". (님·씨·양·친구·야 등은 "공주님·아저씨·어린 양·고양이 친구·고양이야" 오탐이 커서 제외
  //  — 학생 이름은 세션 표시 이름으로 지운다. 반 친구 실명 전체 목록이 없으므로 완전한 실명 제거는 보장하지 못한다.)
  { code: 'TITLED_NAME', re: new RegExp(`${HANGUL_NAME}\\s*(선생님|쌤|선생)`, 'g') },
  { code: 'PORTRAIT', re: /(내|우리|제|저의?|나의?)\s*(얼굴|사진|모습)|사진\s*(속|처럼|같이)|실제\s*사람/g },
];
// 글자를 그림에 넣어 달라는 요청은 제거(textInImage:false)
const TEXT_REQUEST = /["“”'‘’][^"“”'‘’]*["“”'‘’]\s*(라고|이라고)?\s*(쓰인|적힌|써진|써|적어)?|(글자|글씨|문자|텍스트|이름표|간판|말풍선)[가-힣]*/g;
// 수업에 부적절한 요청은 거부(그림 생성 자체를 하지 않는다)
const UNSAFE = /(피투성이|피범벅|잔인|살인|죽이|시체|총|권총|칼로|흉기|폭력|야한|벗은|누드|담배|술병|마약|욕설|혐오)/;

/**
 * @param {string} subject
 * @param {{ studentNames?: string[] }} [ctx]  세션의 표시 이름 등 — 원문 그대로 지운다
 * @returns {{ok:boolean, text:string, removed:string[], code?:string}}
 */
export function sanitizeSubject(subject, ctx = {}) {
  let s = String(subject ?? '').normalize('NFC').replace(/[\u0000-\u001f\u007f<>{}[\]\\`$|^~]/g, ' ');
  const removed = [];
  if (UNSAFE.test(s)) return { ok: false, text: '', removed: ['UNSAFE'], code: 'UNSAFE_SUBJECT' };
  for (const name of ctx.studentNames || []) {
    const n = String(name || '').trim();
    if (n.length < 2) continue;
    const parts = [n, n.length >= 3 ? n.slice(1) : null].filter(Boolean); // 성 뺀 이름도
    for (const p of parts) if (s.includes(p)) { s = s.split(p).join(' '); removed.push('STUDENT_NAME'); }
  }
  for (const { code, re } of PATTERNS) {
    const next = s.replace(re, ' ');
    if (next !== s) { removed.push(code); s = next; }
  }
  const noText = s.replace(TEXT_REQUEST, ' ');
  if (noText !== s) { removed.push('TEXT_REQUEST'); s = noText; }
  s = s.replace(/\s+/g, ' ').trim().slice(0, 60);
  if (!/[가-힣A-Za-z]/.test(s)) return { ok: false, text: '', removed, code: 'EMPTY_SUBJECT' };
  return { ok: true, text: s, removed: [...new Set(removed)] };
}

/**
 * AssetBrief → 공급자 프롬프트.
 * @param {object} brief  AssetBriefSchema 통과한 값
 * @param {{ capabilities?: {transparent?:boolean}, studentNames?: string[] }} [ctx]
 */
export function buildPrompt(brief, ctx = {}) {
  const pack = STYLE_PACKS[brief.stylePack];
  if (!pack) return { ok: false, code: 'UNKNOWN_STYLE_PACK' };
  if (brief.kind === 'sfx') return { ok: false, code: 'SFX_NOT_GENERATED' };
  if (brief.textInImage !== false) return { ok: false, code: 'TEXT_IN_IMAGE_FORBIDDEN' };
  const san = sanitizeSubject(brief.subject, ctx);
  if (!san.ok) return { ok: false, code: san.code, removed: san.removed };
  const wantsAlpha = brief.transparent && brief.kind !== 'background';
  const nativeAlpha = !!ctx.capabilities?.transparent;
  // 공급자가 투명을 못 만들면 단색 크로마 배경을 요청하고 서버가 키잉한다(검증된 후처리)
  const chromaKey = wantsAlpha && !nativeAlpha ? '#00FF00' : null;
  const pose = pack.poses[brief.pose] || pack.poses['front-idle'];
  const palette = pack.palettes[brief.paletteId] || pack.palettes.default;
  const { width, height } = brief.dimensions;
  const aspect = width === height ? 'square 1:1' : `${width}:${height} landscape`;
  const lines = [
    pack.prefix,
    pack.kinds[brief.kind],
    `Subject (described by a child in Korean): "${san.text}".`,
    brief.kind === 'background' ? '' : `Pose: ${pose}.`,
    `Colors: ${palette}.`,
    `Canvas: ${aspect}.`,
    wantsAlpha && nativeAlpha ? 'Transparent background (real alpha channel).' : '',
    chromaKey ? `Background: one flat solid pure green ${chromaKey} color filling everything behind the subject, no shadow on the background, do not use that green inside the subject.` : '',
    'Absolutely no text, letters, numbers, words, logos or watermarks anywhere in the image. Never draw a checkerboard pattern.',
    `Avoid: ${pack.negative}.`,
  ].filter(Boolean);
  return {
    ok: true,
    prompt: lines.join('\n'),
    negative: pack.negative,
    subject: san.text,
    removed: san.removed,
    chromaKey,
    wantsAlpha,
    styleVersion: pack.version,
    promptVersion: PROMPT_VERSION,
  };
}

/** 멱등·캐시용 brief 내용 해시 — 프로젝트·revision·slot과 무관한 "무엇을 그리는가"만 */
export function briefContentHash(brief, sanitizedSubject) {
  const content = {
    kind: brief.kind, subject: sanitizedSubject ?? brief.subject, stylePack: brief.stylePack,
    w: brief.dimensions.width, h: brief.dimensions.height, transparent: brief.transparent, pose: brief.pose, paletteId: brief.paletteId,
  };
  return crypto.createHash('sha256').update(JSON.stringify(content)).digest('hex').slice(0, 32);
}
