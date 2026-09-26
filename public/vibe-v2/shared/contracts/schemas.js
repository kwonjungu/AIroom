// 공유 계약 스키마 (contract v1) — Project / Patch / Job / AssetBrief / Diagnostic / ApiError.
// HARNESS-AND-CONTRACTS.md §2·§3·§6의 구현. WP0(통합 담당) 소유.

import { validate } from './validate.js';
import { MODE_NODES, EDITABLE_PARAMS, SINGLETON_KINDS } from './nodes.js';

export const CONTRACT_VERSION = '1.2.0';
export const PROJECT_SCHEMA_VERSION = 2;
export const PATCH_SCHEMA_VERSION = 1;

export const LIMITS = Object.freeze({
  intentTextChars: 1000,
  apiJsonBytes: 128 * 1024,
  projectBytes: 256 * 1024,
  astNodes: 300,
  nestingDepth: 8,
  patchOperations: 12,
  undoDepth: 50,
});

export const MODES = ['goal', 'shape', 'turtle', 'pixel', 'maze', 'studio'];
export const ENGINE_VERSIONS = {
  goal: 'cards-1', shape: 'cards-1', turtle: 'legacy-1', pixel: 'legacy-1', maze: 'legacy-1', studio: 'studio-2',
};

const ISO = { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}T' };
const NODE_ID = { type: 'string', pattern: '^[a-z][a-z0-9_-]{0,39}$' };

export const AssetRefSchema = {
  type: 'object', additionalProperties: false,
  required: ['slotId', 'assetId', 'preset'],
  properties: {
    slotId: { type: 'string', pattern: '^[a-z][a-z0-9_.-]{0,47}$' },
    assetId: { type: ['string', 'null'], maxLength: 80 },   // 승인된 생성 에셋 (manifest 키)
    preset: { type: ['string', 'null'], maxLength: 80 },    // 기성 에셋·이모지 (manifest 키)
  },
};

export const ProjectSchema = {
  type: 'object', additionalProperties: false,
  required: ['schemaVersion', 'id', 'revision', 'mode', 'title', 'templateId', 'engineVersion',
    'capabilityVersion', 'program', 'assets', 'learning', 'createdAt', 'updatedAt'],
  properties: {
    schemaVersion: { const: PROJECT_SCHEMA_VERSION },
    id: { type: 'string', pattern: '^p_[A-Za-z0-9_-]{4,40}$' },
    revision: { type: 'integer', minimum: 0, maximum: 1e9 },
    mode: { enum: MODES },
    title: { type: 'string', minLength: 1, maxLength: 40 },
    templateId: { type: ['string', 'null'], maxLength: 40 },
    engineVersion: { type: 'string', maxLength: 20 },
    capabilityVersion: { type: 'string', maxLength: 20 },
    program: {
      type: 'object', additionalProperties: false, required: ['nodes', 'entrypoints'],
      properties: {
        nodes: { type: 'array', maxItems: LIMITS.astNodes, items: { type: 'object' } }, // 노드별 검사는 validateProject
        entrypoints: { type: 'array', maxItems: LIMITS.astNodes, items: NODE_ID },
      },
    },
    assets: { type: 'array', maxItems: 40, items: AssetRefSchema },
    learning: {
      type: 'object', additionalProperties: false, required: ['missionId', 'missionVersion'],
      properties: {
        missionId: { type: ['string', 'null'], maxLength: 40 },
        missionVersion: { type: ['string', 'null'], maxLength: 20 },
      },
    },
    createdAt: ISO,
    updatedAt: ISO,
  },
};

// ── 정형 변경 명령 (§2.2) ──
const OPS = [
  { type: 'object', additionalProperties: false, required: ['op', 'nodeId', 'parameter', 'value'],
    properties: { op: { const: 'setParameter' }, nodeId: NODE_ID, parameter: { type: 'string', maxLength: 30 },
      value: { type: ['number', 'string', 'array', 'boolean'] } } },
  { type: 'object', additionalProperties: false, required: ['op', 'parentId', 'node'],
    properties: { op: { const: 'addBehavior' }, parentId: { type: ['string', 'null'], maxLength: 40 },
      node: { type: 'object' } } },
  { type: 'object', additionalProperties: false, required: ['op', 'nodeId'],
    properties: { op: { const: 'removeBehavior' }, nodeId: NODE_ID } },
  { type: 'object', additionalProperties: false, required: ['op', 'nodeId', 'slotId', 'preset'],
    properties: { op: { const: 'setAppearance' }, nodeId: NODE_ID,
      slotId: { type: 'string', pattern: '^[a-z][a-z0-9_.-]{0,47}$' }, preset: { type: 'string', maxLength: 80 } } },
  { type: 'object', additionalProperties: false, required: ['op', 'templateId', 'params'],
    properties: { op: { const: 'instantiateTemplate' }, templateId: { type: 'string', maxLength: 40 },
      params: { type: 'object' } } },
];

export const PatchSchema = {
  type: 'object', additionalProperties: false,
  required: ['schemaVersion', 'baseRevision', 'summary', 'operations', 'assetRequests'],
  properties: {
    schemaVersion: { const: PATCH_SCHEMA_VERSION },
    baseRevision: { type: 'integer', minimum: 0 },
    summary: { type: 'string', minLength: 1, maxLength: 120 },
    operations: { type: 'array', minItems: 1, maxItems: LIMITS.patchOperations, items: { oneOf: OPS, discriminator: 'op' } },
    assetRequests: { type: 'array', maxItems: 4, items: { type: 'object' } },
  },
};

export const DiagnosticSchema = {
  type: 'object', additionalProperties: false,
  required: ['code', 'severity', 'nodeId', 'path', 'message', 'studentHint'],
  properties: {
    code: { type: 'string', pattern: '^[A-Z][A-Z0-9_]{2,40}$' },
    severity: { enum: ['error', 'warning'] },
    nodeId: { type: ['string', 'null'] },
    path: { type: 'string', maxLength: 200 },
    message: { type: 'string', maxLength: 300 },
    studentHint: { type: 'string', maxLength: 120 },
  },
};

// ── 생성 작업 (§4.3) ──
export const JOB_STATES = ['queued', 'planning', 'generating', 'validating', 'repairing', 'ready', 'applied',
  'cancelled', 'failed', 'timed_out', 'superseded'];
export const JOB_TERMINAL = ['applied', 'cancelled', 'failed', 'timed_out', 'superseded'];
export const JOB_TRANSITIONS = {
  queued: ['planning', 'cancelled', 'failed', 'timed_out', 'superseded'],
  planning: ['generating', 'ready', 'cancelled', 'failed', 'timed_out', 'superseded'],
  generating: ['validating', 'cancelled', 'failed', 'timed_out', 'superseded'],
  validating: ['ready', 'repairing', 'cancelled', 'failed', 'timed_out', 'superseded'],
  repairing: ['validating', 'cancelled', 'failed', 'timed_out', 'superseded'],
  ready: ['applied', 'cancelled', 'superseded', 'timed_out'],
};

export const JobSchema = {
  type: 'object', additionalProperties: false,
  required: ['jobId', 'projectId', 'baseRevision', 'requestId', 'status', 'studentMessage', 'candidate',
    'diagnostics', 'attempts', 'createdAt', 'updatedAt'],
  properties: {
    jobId: { type: 'string', pattern: '^j_[A-Za-z0-9_-]{4,40}$' },
    projectId: { type: 'string', maxLength: 44 },
    baseRevision: { type: 'integer', minimum: 0 },
    requestId: { type: 'string', minLength: 8, maxLength: 64 },
    status: { enum: JOB_STATES },
    studentMessage: { type: 'string', maxLength: 120 },
    candidate: {
      type: ['object', 'null'], additionalProperties: false, required: ['hash', 'patch', 'changes'],
      properties: {
        hash: { type: 'string', pattern: '^[a-f0-9]{16,64}$' },
        patch: { type: 'object' },
        changes: { type: 'array', maxItems: 20, items: { type: 'string', maxLength: 80 } }, // "속도 3→5" 같은 학생용 요약
      },
    },
    diagnostics: { type: 'array', maxItems: 20, items: { $ref: 'Diagnostic' } },
    attempts: { type: 'integer', minimum: 0, maximum: 3 },
    createdAt: ISO,
    updatedAt: ISO,
  },
};

// ── 에셋 (§6.2) ──
export const AssetBriefSchema = {
  type: 'object', additionalProperties: false,
  required: ['schemaVersion', 'projectId', 'baseRevision', 'slotId', 'kind', 'subject', 'stylePack',
    'dimensions', 'transparent', 'pose', 'paletteId', 'textInImage'],
  properties: {
    schemaVersion: { const: 1 },
    projectId: { type: 'string', maxLength: 44 },
    baseRevision: { type: 'integer', minimum: 0 },
    slotId: { type: 'string', pattern: '^[a-z][a-z0-9_.-]{0,47}$' },
    kind: { enum: ['sprite', 'background', 'card', 'sfx'] },
    subject: { type: 'string', minLength: 1, maxLength: 60 },
    stylePack: { enum: ['toto-world-v1'] },
    dimensions: { type: 'object', additionalProperties: false, required: ['width', 'height'],
      properties: { width: { enum: [128, 256, 512, 1024] }, height: { enum: [128, 256, 512, 576, 768, 1024] } } },
    transparent: { type: 'boolean' },
    pose: { type: 'string', maxLength: 30 },
    paletteId: { type: 'string', maxLength: 30 },
    textInImage: { const: false },
  },
};
export const ASSET_JOB_STATES = ['queued', 'generating', 'validating', 'processing', 'ready', 'failed', 'cancelled', 'timed_out'];

// ── API 오류 (§3.1) ──
export const API_ERROR_CODES = {
  BAD_REQUEST: 400, UNAUTHENTICATED: 401, FORBIDDEN: 403, NOT_FOUND: 404,
  REVISION_CONFLICT: 409, JOB_NOT_APPLICABLE: 409, TOO_LARGE: 413, RATE_LIMITED: 429, QUOTA_EXCEEDED: 429,
  PROVIDER_UNAVAILABLE: 503, INTERNAL: 500,
};
export const ApiErrorSchema = {
  type: 'object', additionalProperties: false, required: ['error'],
  properties: {
    error: {
      type: 'object', additionalProperties: false,
      required: ['code', 'message', 'retryable', 'retryAfterMs', 'requestId'],
      properties: {
        code: { enum: Object.keys(API_ERROR_CODES) },
        message: { type: 'string', maxLength: 200 },
        retryable: { type: 'boolean' },
        retryAfterMs: { type: ['integer', 'null'], minimum: 0 },
        requestId: { type: 'string', maxLength: 64 },
        // v1.1 선택값: 409의 최신 revision, 검증 진단 등 (학생 원문·개인정보 금지)
        details: { type: 'object', additionalProperties: false, properties: {
          latestRevision: { type: 'integer', minimum: 0 },
          diagnostics: { type: 'array', maxItems: 20, items: { $ref: 'Diagnostic' } },
        } },
      },
    },
  },
};

export const DEFS = { Diagnostic: DiagnosticSchema, AssetRef: AssetRefSchema };

// ── 편의 검사 ──

export function diag(code, { severity = 'error', nodeId = null, path = '', message = code, studentHint = '' } = {}) {
  return { code, severity, nodeId, path, message: String(message).slice(0, 300), studentHint: String(studentHint).slice(0, 120) };
}

/**
 * 구조 + 모드별 노드 args + 그래프(고유 ID·참조·순환·깊이·크기)를 검사한다.
 * @returns {object[]} Diagnostic 배열 (빈 배열 = 통과)
 */
export function validateProject(project) {
  const out = validate(ProjectSchema, project, { defs: DEFS })
    .map(e => diag('SCHEMA_INVALID', { path: e.path, message: e.message, studentHint: '작품 파일이 올바르지 않아요.' }));
  if (out.length) return out;

  let bytes = 0;
  try { bytes = new TextEncoder().encode(JSON.stringify(project)).length; } catch { bytes = Infinity; }
  if (bytes > LIMITS.projectBytes) out.push(diag('PROJECT_TOO_LARGE', { message: `${bytes} bytes`, studentHint: '작품이 너무 커요. 조금 줄여 볼까?' }));

  const allowed = MODE_NODES[project.mode];
  const byId = new Map();
  project.program.nodes.forEach((n, i) => {
    const path = `$.program.nodes[${i}]`;
    const schema = allowed[n?.kind];
    if (!schema) { out.push(diag('NODE_KIND_NOT_ALLOWED', { nodeId: n?.id ?? null, path, message: `kind ${n?.kind} not allowed in ${project.mode}`, studentHint: '이 모드에서 쓸 수 없는 블록이 있어요.' })); return; }
    for (const e of validate(schema, n)) out.push(diag('NODE_INVALID', { nodeId: n.id ?? null, path: path + e.path.slice(1), message: e.message, studentHint: '값이 허용 범위를 벗어났어요.' }));
    if (byId.has(n.id)) out.push(diag('DUPLICATE_NODE_ID', { nodeId: n.id, path }));
    byId.set(n.id, n);
  });
  if (out.some(d => d.severity === 'error')) return out;

  for (const k of SINGLETON_KINDS) {
    const c = project.program.nodes.filter(n => n.kind === k).length;
    if (c > 1) out.push(diag('SINGLETON_DUPLICATED', { message: `${k} x${c}`, studentHint: '같은 설정이 두 번 들어 있어요.' }));
  }
  const referenced = new Set();
  for (const n of byId.values()) for (const c of n.children) {
    if (!byId.has(c)) out.push(diag('UNKNOWN_CHILD', { nodeId: n.id, message: `child ${c} missing` }));
    if (referenced.has(c)) out.push(diag('SHARED_CHILD', { nodeId: c, message: 'node has two parents' }));
    referenced.add(c);
  }
  for (const e of project.program.entrypoints) {
    if (!byId.has(e)) out.push(diag('UNKNOWN_ENTRYPOINT', { nodeId: e }));
    if (referenced.has(e)) out.push(diag('ENTRYPOINT_IS_CHILD', { nodeId: e }));
  }
  // 깊이·순환
  const depthOf = (id, seen) => {
    if (seen.has(id)) return Infinity;
    const n = byId.get(id); if (!n) return 0;
    seen.add(id);
    let d = 1; for (const c of n.children) d = Math.max(d, 1 + depthOf(c, seen));
    seen.delete(id); return d;
  };
  for (const e of project.program.entrypoints) {
    const d = depthOf(e, new Set());
    if (d === Infinity) out.push(diag('CYCLE', { nodeId: e, studentHint: '블록이 서로 꼬여 있어요.' }));
    else if (d > LIMITS.nestingDepth) out.push(diag('TOO_DEEP', { nodeId: e, message: `depth ${d}`, studentHint: '블록을 너무 깊이 넣었어요.' }));
  }
  const reachable = new Set();
  const mark = id => { if (reachable.has(id)) return; reachable.add(id); byId.get(id)?.children.forEach(mark); };
  project.program.entrypoints.forEach(mark);
  for (const id of byId.keys()) if (!reachable.has(id)) out.push(diag('ORPHAN_NODE', { severity: 'warning', nodeId: id }));
  return out;
}

export function validatePatchShape(patch) {
  return validate(PatchSchema, patch).map(e => diag('PATCH_SCHEMA_INVALID', { path: e.path, message: e.message }));
}

export function validateJob(job) { return validate(JobSchema, job, { defs: DEFS }); }
export function validateAssetBrief(b) { return validate(AssetBriefSchema, b); }
export function validateApiError(e) { return validate(ApiErrorSchema, e, { defs: DEFS }); }

export { EDITABLE_PARAMS };
