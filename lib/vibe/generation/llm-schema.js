// 모델 출력 형식 — 모델은 PatchSchema 전체가 아니라 {status, summary, operations}만 낸다.
// schemaVersion·baseRevision·assetRequests는 서버가 채운다(모델이 revision을 고르지 못하게).
//
// strict json_schema(구조화 출력)는 "모든 속성 required + additionalProperties:false"만 받으므로,
// 계약 노드 스키마(STUDIO_NODES)를 기계적으로 변환한다: 선택 속성 → nullable, oneOf → anyOf,
// 범위·패턴 키워드는 제거(서버 검증기가 최종 검사). null 값은 normalize에서 지운다.

import { STUDIO_NODES, EDITABLE_PARAMS } from '../../../public/vibe-v2/shared/contracts/nodes.js';
import { PATCH_SCHEMA_VERSION, LIMITS } from '../../../public/vibe-v2/shared/contracts/schemas.js';
import { TEMPLATES } from '../../../public/vibe-v2/shared/templates/index.js';

export const LLM_OUTPUT_VERSION = 'llm-out-1';

const DROP = new Set(['pattern', 'minimum', 'maximum', 'minLength', 'maxLength', 'minItems', 'maxItems', 'discriminator', 'description']);

/** 계약 스키마 → strict 호환 스키마 */
export function toStrict(s) {
  if (Array.isArray(s)) return s.map(toStrict);
  if (!s || typeof s !== 'object') return s;
  const out = {};
  if ('const' in s) return { type: typeof s.const === 'number' ? 'number' : 'string', enum: [s.const] };
  for (const [k, v] of Object.entries(s)) {
    if (DROP.has(k)) continue;
    if (k === 'oneOf') { out.anyOf = v.map(toStrict); continue; }
    if (k === 'properties') {
      out.properties = {};
      for (const [pk, pv] of Object.entries(v)) {
        const conv = toStrict(pv);
        const optional = !(s.required || []).includes(pk);
        out.properties[pk] = optional ? nullable(conv) : conv;
      }
      out.required = Object.keys(v);
      out.additionalProperties = false;
      continue;
    }
    if (k === 'required' || k === 'additionalProperties') continue;
    if (k === 'type' && v === 'integer') { out.type = 'integer'; continue; }
    out[k] = toStrict(v);
  }
  if (out.type === 'object' && !out.properties) { out.properties = {}; out.required = []; out.additionalProperties = false; }
  if (out.type === 'array' && !out.items) out.items = { type: 'string' };
  return out;
}

function nullable(s) {
  if (s.anyOf) return { anyOf: [...s.anyOf, { type: 'null' }] };
  if (s.enum) return { anyOf: [s, { type: 'null' }] };
  if (typeof s.type === 'string') return { ...s, type: [s.type, 'null'] };
  return { anyOf: [s, { type: 'null' }] };
}

const EDITABLE = [...new Set(Object.values(EDITABLE_PARAMS).flat())].sort();

function opSchemas({ allowTemplate = true, allowAdd = true } = {}) {
  const S = { type: 'string' };
  const ops = [
    { type: 'object', additionalProperties: false, required: ['op', 'nodeId', 'parameter', 'value'], properties: {
      op: { type: 'string', enum: ['setParameter'] }, nodeId: S, parameter: { type: 'string', enum: EDITABLE },
      value: { anyOf: [{ type: 'number' }, { type: 'string' }, { type: 'boolean' }, { type: 'array', items: { type: 'string' } }] } } },
    { type: 'object', additionalProperties: false, required: ['op', 'nodeId'], properties: { op: { type: 'string', enum: ['removeBehavior'] }, nodeId: S } },
    { type: 'object', additionalProperties: false, required: ['op', 'nodeId', 'slotId', 'preset'], properties: {
      op: { type: 'string', enum: ['setAppearance'] }, nodeId: S, slotId: S, preset: S } },
  ];
  if (allowAdd) {
    const addable = ['spawner', 'onTouch', 'winWhen', 'loseWhen', 'stats'];
    ops.push({ type: 'object', additionalProperties: false, required: ['op', 'parentId', 'node'], properties: {
      op: { type: 'string', enum: ['addBehavior'] }, parentId: { type: 'null' },
      node: { anyOf: addable.map(k => toStrict(STUDIO_NODES[k])) } } });
  }
  if (allowTemplate) {
    for (const t of Object.values(TEMPLATES)) {
      const params = {};
      for (const [k, spec] of Object.entries(t.params)) params[k] = spec.type === 'enum' ? { anyOf: [{ type: 'string', enum: spec.values }, { type: 'null' }] } : { type: ['integer', 'null'] };
      ops.push({ type: 'object', additionalProperties: false, required: ['op', 'templateId', 'params'], properties: {
        op: { type: 'string', enum: ['instantiateTemplate'] }, templateId: { type: 'string', enum: [t.id] },
        params: { type: 'object', additionalProperties: false, required: Object.keys(params), properties: params } } });
    }
  }
  return ops;
}

/**
 * @param {{ task:'plan'|'rule' }} o  plan = 새 게임(instantiateTemplate만), rule = 수정(템플릿 교체 금지)
 */
export function buildOutputSchema({ task }) {
  const ops = task === 'plan'
    ? opSchemas().filter(s => s.properties.op.enum[0] === 'instantiateTemplate')
    : opSchemas({ allowTemplate: false });
  return {
    type: 'object', additionalProperties: false, required: ['status', 'summary', 'operations'],
    properties: {
      status: { type: 'string', enum: ['patch', 'unsupported'] },
      summary: { type: 'string' },
      operations: { type: 'array', items: { anyOf: ops } },
    },
  };
}

function stripNulls(v) {
  if (Array.isArray(v)) return v.map(stripNulls);
  if (v && typeof v === 'object') {
    const o = {};
    for (const [k, x] of Object.entries(v)) if (x !== null) o[k] = stripNulls(x);
    return o;
  }
  return v;
}

/**
 * 모델 JSON → {kind:'patch', patch} | {kind:'unsupported'} | {kind:'malformed', reason}
 * addBehavior의 node.children이 빠지면 [] 로 채운다(모델 편의). 그 밖의 형식 오류는 V1이 잡도록 그대로 둔다.
 */
export function normalizeModelOutput(json, baseRevision) {
  if (!json || typeof json !== 'object') return { kind: 'malformed', reason: 'not_object' };
  if (json.status === 'unsupported') return { kind: 'unsupported' };
  if (!Array.isArray(json.operations)) return { kind: 'malformed', reason: 'operations_missing' };
  const operations = json.operations.slice(0, LIMITS.patchOperations + 1).map(op => {
    const o = stripNulls(op);
    if (o && o.op === 'addBehavior' && o.node && typeof o.node === 'object') {
      if (!Array.isArray(o.node.children)) o.node.children = [];
      if (o.parentId === undefined) o.parentId = null;
    }
    if (o && o.op === 'instantiateTemplate' && (o.params === undefined)) o.params = {};
    return o;
  });
  return {
    kind: 'patch',
    patch: {
      schemaVersion: PATCH_SCHEMA_VERSION,
      baseRevision,
      summary: typeof json.summary === 'string' && json.summary.trim() ? json.summary.trim().slice(0, 120) : '작품을 바꿨어요.',
      operations,
      assetRequests: [],
    },
  };
}
