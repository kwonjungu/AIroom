// 정형 변경 적용기 — 서버·클라이언트 공용 순수 함수. 입력 프로젝트를 절대 변경하지 않는다.
// 실패 시 { ok:false } 와 진단만 돌려주며, 호출자는 기존 프로젝트를 그대로 유지한다.

import { EDITABLE_PARAMS, MODE_NODES } from './nodes.js';
import { validatePatchShape, validateProject, diag } from './schemas.js';
import { validate } from './validate.js';

const clone = v => JSON.parse(JSON.stringify(v));

/**
 * @param {object} project  현재 프로젝트 (검증된 상태여야 함)
 * @param {object} patch    PatchSchema 형태
 * @param {{ now?: string, instantiate?: (templateId:string, params:object, project:object) => ({nodes:object[], entrypoints:string[], assets?:object[]}|null) }} [opts]
 * @returns {{ ok:true, project:object, changes:string[], diagnostics:object[] } | { ok:false, diagnostics:object[] }}
 */
export function applyPatch(project, patch, opts = {}) {
  const shape = validatePatchShape(patch);
  if (shape.length) return { ok: false, diagnostics: shape };
  if (patch.baseRevision !== project.revision) {
    return { ok: false, diagnostics: [diag('REVISION_CONFLICT', { message: `base ${patch.baseRevision} != ${project.revision}`, studentHint: '그 사이에 작품이 바뀌었어요. 다시 요청해 볼까?' })] };
  }
  const next = clone(project);
  const nodes = next.program.nodes;
  const find = id => nodes.find(n => n.id === id);
  const changes = [];
  const fail = (code, i, extra = {}) => ({ ok: false, diagnostics: [diag(code, { path: `$.operations[${i}]`, ...extra })] });

  for (let i = 0; i < patch.operations.length; i++) {
    const op = patch.operations[i];
    switch (op.op) {
      case 'setParameter': {
        const n = find(op.nodeId);
        if (!n) return fail('UNKNOWN_NODE', i, { nodeId: op.nodeId });
        if (!(EDITABLE_PARAMS[n.kind] || []).includes(op.parameter)) return fail('PARAMETER_NOT_EDITABLE', i, { nodeId: n.id, message: `${n.kind}.${op.parameter}` });
        const before = n.args[op.parameter];
        n.args[op.parameter] = op.value;
        const errs = validate(MODE_NODES[next.mode][n.kind], n);
        if (errs.length) return fail('VALUE_OUT_OF_RANGE', i, { nodeId: n.id, message: errs[0].path + ' ' + errs[0].message, studentHint: '그 값은 너무 크거나 작아요.' });
        changes.push(`${n.id}.${op.parameter}: ${fmt(before)} → ${fmt(op.value)}`);
        break;
      }
      case 'addBehavior': {
        const nn = op.node;
        if (find(nn?.id)) return fail('DUPLICATE_NODE_ID', i, { nodeId: nn.id });
        const schema = MODE_NODES[next.mode][nn?.kind];
        if (!schema) return fail('NODE_KIND_NOT_ALLOWED', i, { message: String(nn?.kind) });
        const errs = validate(schema, nn);
        if (errs.length) return fail('NODE_INVALID', i, { message: errs[0].path + ' ' + errs[0].message });
        if (nn.children.length) return fail('ADD_WITH_CHILDREN', i, { nodeId: nn.id, message: 'add children separately' });
        if (op.parentId === null) next.program.entrypoints.push(nn.id);
        else {
          const p = find(op.parentId);
          if (!p) return fail('UNKNOWN_NODE', i, { nodeId: op.parentId });
          p.children.push(nn.id);
        }
        nodes.push(clone(nn));
        changes.push(`+ ${nn.kind} ${nn.id}`);
        break;
      }
      case 'removeBehavior': {
        const n = find(op.nodeId);
        if (!n) return fail('UNKNOWN_NODE', i, { nodeId: op.nodeId });
        const doomed = new Set();
        const walk = id => { if (doomed.has(id)) return; doomed.add(id); find(id)?.children.forEach(walk); };
        walk(n.id);
        next.program.nodes = nodes.filter(x => !doomed.has(x.id));
        nodes.length = 0; nodes.push(...next.program.nodes); next.program.nodes = nodes;
        next.program.entrypoints = next.program.entrypoints.filter(e => !doomed.has(e));
        for (const x of nodes) x.children = x.children.filter(c => !doomed.has(c));
        changes.push(`- ${n.kind} ${n.id}`);
        break;
      }
      case 'setAppearance': {
        const n = find(op.nodeId);
        if (!n) return fail('UNKNOWN_NODE', i, { nodeId: op.nodeId });
        if (!('appearance' in n.args) && !('background' in n.args)) return fail('NO_APPEARANCE', i, { nodeId: n.id });
        const key = 'appearance' in n.args ? 'appearance' : 'background';
        n.args[key] = op.slotId;
        const ref = next.assets.find(a => a.slotId === op.slotId);
        const before = ref?.preset ?? ref?.assetId ?? null;
        if (ref) { ref.preset = op.preset; ref.assetId = null; }
        else next.assets.push({ slotId: op.slotId, assetId: null, preset: op.preset });
        changes.push(`${n.id} 모습: ${fmt(before)} → ${op.preset}`);
        break;
      }
      case 'instantiateTemplate': {
        if (typeof opts.instantiate !== 'function') return fail('TEMPLATE_UNAVAILABLE', i);
        const made = opts.instantiate(op.templateId, op.params, clone(next));
        if (!made) return fail('UNKNOWN_TEMPLATE', i, { message: op.templateId, studentHint: '아직 준비되지 않은 게임 종류예요.' });
        next.program = { nodes: made.nodes, entrypoints: made.entrypoints };
        nodes.length = 0; nodes.push(...next.program.nodes); next.program.nodes = nodes;
        if (made.assets) next.assets = made.assets;
        next.templateId = op.templateId;
        changes.push(`템플릿 ${op.templateId}`);
        break;
      }
      default:
        return fail('UNKNOWN_OPERATION', i);
    }
  }

  next.revision = project.revision + 1;
  next.updatedAt = opts.now || new Date().toISOString();
  const errs = validateProject(next).filter(d => d.severity === 'error');
  if (errs.length) return { ok: false, diagnostics: errs };
  return { ok: true, project: next, changes, diagnostics: validateProject(next) };
}

function fmt(v) {
  if (v === undefined || v === null) return '없음';
  if (Array.isArray(v)) return `[${v.length}]`;
  return String(v);
}

/** 두 프로젝트의 노드 차이 (UI 비교 화면·의도 검사용). 좌표·순서 외 의미만 비교한다. */
export function diffPrograms(a, b) {
  const ma = new Map(a.program.nodes.map(n => [n.id, n]));
  const mb = new Map(b.program.nodes.map(n => [n.id, n]));
  const added = [...mb.keys()].filter(k => !ma.has(k));
  const removed = [...ma.keys()].filter(k => !mb.has(k));
  const changed = [];
  for (const [id, na] of ma) {
    const nb = mb.get(id); if (!nb) continue;
    for (const k of new Set([...Object.keys(na.args), ...Object.keys(nb.args)])) {
      if (JSON.stringify(na.args[k]) !== JSON.stringify(nb.args[k])) changed.push({ nodeId: id, parameter: k, before: na.args[k], after: nb.args[k] });
    }
    if (JSON.stringify(na.children) !== JSON.stringify(nb.children)) changed.push({ nodeId: id, parameter: '(children)', before: na.children, after: nb.children });
  }
  return { added, removed, changed };
}
