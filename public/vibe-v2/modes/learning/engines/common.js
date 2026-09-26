// 거북이·픽셀·미로 엔진 공용 도구 (WP8). DOM 없음 — Node 테스트와 브라우저가 같은 코드를 쓴다.
// v1(public/vibecoding.html) 파서는 모르는 줄·토큰을 조용히 버렸다. v2는 같은 문법을 읽되
// 버리는 대신 줄 번호가 있는 Diagnostic(path='line:N')을 남긴다. eval/new Function 은 쓰지 않는다.

import { diag as contractDiag } from '../../../shared/contracts/schemas.js';

export const LIMITS = Object.freeze({
  repeatMax: 100,        // v1과 같은 REPEAT 상한
  callDepth: 8,          // v1 resolveCalls 깊이
  turtleSteps: 5000,     // v1 animateTurtle MAX_STEPS
  mazeSteps: 5000,       // v1 mazeFlatten 상한
  pixelSteps: 20000,     // v1에는 없던 상한(중첩 REPEAT 폭주 방지)
  sourceChars: 20000,    // nodes.js legacySource.source maxLength
});

/**
 * @param {string} code  대문자 코드
 * @param {number} line  1부터
 * @param {string} message 교사·개발자용
 * @param {string} studentHint 학생용 한 문장(120자)
 * @param {'error'|'warning'} [severity]
 */
export function lineDiag(code, line, message, studentHint, severity = 'error') {
  return contractDiag(code, { severity, nodeId: 'src', path: 'line:' + line, message, studentHint });
}

export const hasErrors = diags => diags.some(d => d.severity === 'error');

/** 진단 → 줄 번호 (없으면 null) */
export function diagLine(d) {
  const m = /^line:(\d+)$/.exec(d?.path || '');
  return m ? Number(m[1]) : null;
}

/**
 * v1 토큰 파서(픽셀·미로)와 같은 규칙으로 쪼개되 토큰마다 줄 번호를 붙인다.
 * `//`로 시작하는 줄은 주석(v1과 동일). `{` `}`는 붙어 있어도 따로 떼어 낸다.
 * @returns {{t:string, line:number}[]}
 */
export function tokenize(text) {
  const out = [];
  String(text ?? '').split('\n').forEach((raw, i) => {
    if (raw.trim().startsWith('//')) return;
    for (const t of raw.replace(/([{}])/g, ' $1 ').split(/\s+/)) if (t) out.push({ t, line: i + 1 });
  });
  return out;
}

/** 프로젝트 → legacySource 원문 (없으면 '') */
export function sourceOf(project) {
  const n = project?.program?.nodes?.find(x => x.kind === 'legacySource');
  return n ? String(n.args.source ?? '') : '';
}

/** 원문 → legacySource 프로그램 (노드 id 'src' 고정: 편집 사이에서 유지) */
export function programFor(language, source) {
  return {
    nodes: [{ id: 'src', kind: 'legacySource', args: { language, source: String(source).slice(0, LIMITS.sourceChars) }, children: [] }],
    entrypoints: ['src'],
  };
}

export const LANGUAGE = Object.freeze({ turtle: 'turtle-dsl-1', pixel: 'pixel-dsl-1', maze: 'maze-dsl-1' });
