// 재사용 매핑 — AssetBrief.subject(한국어) + kind로 승인 manifest에서 후보를 고른다.
//
// decision:
//   'reuse'    subject가 알려진 이름 하나로만 이루어짐(꾸밈말 무시) → 생성하지 않는다
//   'generate' 추가 묘사가 있거나(예: "파란 목도리를 한 고양이") 모르는 대상 → 생성. placeholder는 가장 가까운 preset
// 꾸밈말(귀여운·작은·멋진…)만 붙은 경우는 reuse. 색·옷·소품 같은 묘사가 붙으면 학생 의도를 존중해 generate.

const PARTICLES = ['이랑', '에서', '으로', '처럼', '같은', '같이', '에게', '한테', '하고', '인', '을', '를', '이', '가', '은', '는', '의', '와', '과', '랑', '에', '로', '도', '만'];
const FILLER = new Set(['귀여운', '귀엽고', '예쁜', '이쁜', '멋진', '멋있는', '작은', '조그만', '큰', '커다란', '아기', '꼬마', '착한', '웃는', '행복한',
  '그림', '캐릭터', '모양', '하나', '한', '마리', '개', '주인공', '게임', '나의', '내', '우리', '것', '거', '친구', '소리', '효과음', '배경', '카드', '장면', '곳']);

/** 한국어 토큰 정규화: 각 토큰의 [원형, 조사 뗀 형태]. "고양이"의 '이'처럼 명사 일부일 수 있어 원형도 남긴다. */
export function tokenize(subject) {
  return String(subject || '').toLowerCase().normalize('NFC')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/).filter(Boolean)
    .map(t => {
      const forms = [t];
      for (const p of PARTICLES) if (t.length > p.length + 1 && t.endsWith(p)) { forms.push(t.slice(0, -p.length)); break; }
      return forms;
    });
}

const KIND_FILTER = {
  sprite: e => e.kind === 'sprite' && e.category !== 'tile',
  card: e => e.kind === 'card' || (e.kind === 'sprite' && e.category !== 'tile'),
  background: e => e.kind === 'background',
  sfx: e => e.kind === 'sfx',
};

/** manifest.entries → kind별 키워드 색인 (한 번 만들어 재사용) */
export function buildIndex(manifest) {
  const idx = { sprite: [], card: [], background: [], sfx: [] };
  for (const e of Object.values(manifest.entries || {})) {
    if (e.approval !== 'approved' || e.usableInGame === false) continue;
    for (const [kind, ok] of Object.entries(KIND_FILTER)) {
      if (!ok(e)) continue;
      (e.ko || []).forEach((word, i) => idx[kind].push({ word: word.toLowerCase(), key: e.key, primary: i === 0, entry: e }));
    }
  }
  for (const k of Object.keys(idx)) idx[k].sort((a, b) => b.word.length - a.word.length); // 긴 단어 우선
  return idx;
}

/**
 * @param {{kind:string, subject:string}} brief
 * @param {object} manifest
 * @param {{ index?: object, prefer?: 'emoji'|'image' }} [opts]
 * @returns {{decision:'reuse'|'generate', preset:string|null, placeholder:string|null, candidates:{key:string, score:number, src:string|null}[], matchedWord:string|null, extraWords:string[]}}
 */
export function matchBrief(brief, manifest, opts = {}) {
  const index = opts.index || buildIndex(manifest);
  const list = index[brief.kind] || [];
  const prefer = opts.prefer || 'emoji';
  const text = String(brief.subject || '').toLowerCase().normalize('NFC');
  const tokens = tokenize(text);
  const scores = new Map();
  let matchedWord = null;
  const consumed = new Set();      // 토큰 번호
  const consumedWords = new Set(); // 여러 단어 키워드에 쓰인 단어

  // 1) 여러 단어 키워드("파란 하늘")는 원문 포함으로
  for (const it of list) if (it.word.includes(' ') && text.includes(it.word)) {
    bump(scores, it, 6);
    matchedWord ??= it.word;
    it.word.split(' ').forEach(w => consumedWords.add(w));
  }
  // 2) 토큰 단위: 완전 일치 3점(마지막 토큰=머리명사 +1), 끝부분 일치("아기고양이"→고양이) 2점
  tokens.forEach((forms, ti) => {
    const per = new Map(); // 한 토큰은 항목마다 한 번만 점수
    for (const it of list) {
      if (it.word.includes(' ')) continue;
      for (const t of forms) {
        if (t === it.word) { bump(per, it, 3 + (ti === tokens.length - 1 ? 1 : 0)); matchedWord ??= it.word; consumed.add(ti); break; }
        if (it.word.length >= 2 && t.length > it.word.length && t.endsWith(it.word)) { bump(per, it, 2); matchedWord ??= it.word; consumed.add(ti); break; }
      }
    }
    for (const v of per.values()) {
      const cur = scores.get(v.key) || { key: v.key, score: 0, entry: v.entry };
      cur.score += v.score;
      scores.set(v.key, cur);
    }
  });

  const extraWords = tokens.filter((forms, ti) => !consumed.has(ti) && !forms.some(f => FILLER.has(f) || consumedWords.has(f))).map(f => f[0]);
  const ranked = [...scores.values()].sort((a, b) => b.score - a.score || rankKind(a.entry, prefer) - rankKind(b.entry, prefer) || a.key.localeCompare(b.key));
  const candidates = ranked.slice(0, 5).map(r => ({ key: r.key, score: r.score, src: r.entry.src || null }));
  const best = ranked[0] || null;
  const reuse = !!best && extraWords.length === 0;
  return {
    decision: reuse ? 'reuse' : 'generate',
    preset: reuse ? best.key : null,
    placeholder: best ? best.key : defaultPlaceholder(brief.kind),
    candidates, matchedWord, extraWords,
  };
}

function bump(scores, it, s) {
  const cur = scores.get(it.key) || { key: it.key, score: 0, entry: it.entry };
  cur.score = Math.max(cur.score, s + (it.primary ? 0.5 : 0));
  scores.set(it.key, cur);
}
// 같은 점수면: prefer 쪽 → 게임 스프라이트 → 그 외
function rankKind(e, prefer) {
  const isEmoji = e.category === 'emoji';
  if (prefer === 'emoji') return isEmoji ? 0 : e.category === 'hero' || e.category === 'item' || e.category === 'hazard' ? 1 : 2;
  return isEmoji ? 2 : e.category === 'character' ? 1 : 0;
}

export function defaultPlaceholder(kind) {
  if (kind === 'background') return 'bg-sky';
  if (kind === 'sfx') return 'sfx:pop';
  return null; // 스프라이트: 렌더러가 색 원으로 그린다
}
