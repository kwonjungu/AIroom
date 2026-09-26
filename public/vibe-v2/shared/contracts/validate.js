// 최소 JSON Schema 검사기 — 브라우저·Node 공용, 의존성 없음.
// 지원: type, enum, const, required, properties, additionalProperties:false,
//       minimum/maximum, minLength/maxLength, pattern, items, minItems/maxItems,
//       oneOf(discriminator 기반), $ref(로컬 defs 이름).
// 계약 스키마에 쓰는 키워드만 구현한다. 모르는 키워드는 무시하지 않고 예외를 던진다.

const KNOWN = new Set(['type', 'enum', 'const', 'required', 'properties', 'additionalProperties',
  'minimum', 'maximum', 'minLength', 'maxLength', 'pattern', 'items', 'minItems', 'maxItems',
  'oneOf', 'discriminator', '$ref', 'description', 'integer', 'nullable']);

function typeOf(v) {
  if (v === null) return 'null';
  if (Array.isArray(v)) return 'array';
  if (Number.isInteger(v)) return 'integer';
  return typeof v;
}

function typeMatches(want, v) {
  const t = typeOf(v);
  if (want === 'number') return t === 'number' || t === 'integer';
  return want === t;
}

/**
 * @param {object} schema
 * @param {unknown} value
 * @param {{defs?:Record<string,object>, maxDepth?:number}} [opts]
 * @returns {{path:string, message:string}[]} 빈 배열이면 통과
 */
export function validate(schema, value, opts = {}) {
  const errors = [];
  const defs = opts.defs || {};
  const maxDepth = opts.maxDepth ?? 64;
  walk(schema, value, '$', 0);
  return errors;

  function err(path, message) { if (errors.length < 50) errors.push({ path, message }); }

  function walk(s, v, path, depth) {
    if (depth > maxDepth) { err(path, 'nesting too deep'); return; }
    for (const k of Object.keys(s)) if (!KNOWN.has(k)) throw new Error(`validate: unsupported keyword ${k} at ${path}`);
    if (s.$ref) {
      const target = defs[s.$ref];
      if (!target) throw new Error(`validate: unknown $ref ${s.$ref}`);
      walk(target, v, path, depth + 1);
      return;
    }
    if (s.nullable && v === null) return;
    if (s.type) {
      const types = Array.isArray(s.type) ? s.type : [s.type];
      if (!types.some(t => typeMatches(t, v))) { err(path, `expected ${types.join('|')}, got ${typeOf(v)}`); return; }
    }
    if ('const' in s && v !== s.const) err(path, `expected ${JSON.stringify(s.const)}`);
    if (s.enum && !s.enum.includes(v)) err(path, `not one of ${s.enum.join(',')}`);
    if (typeof v === 'number') {
      if (!Number.isFinite(v)) err(path, 'not finite');
      if (s.minimum !== undefined && v < s.minimum) err(path, `< ${s.minimum}`);
      if (s.maximum !== undefined && v > s.maximum) err(path, `> ${s.maximum}`);
    }
    if (typeof v === 'string') {
      if (s.minLength !== undefined && v.length < s.minLength) err(path, `shorter than ${s.minLength}`);
      if (s.maxLength !== undefined && v.length > s.maxLength) err(path, `longer than ${s.maxLength}`);
      if (s.pattern && !new RegExp(s.pattern).test(v)) err(path, `does not match ${s.pattern}`);
    }
    if (Array.isArray(v)) {
      if (s.minItems !== undefined && v.length < s.minItems) err(path, `fewer than ${s.minItems} items`);
      if (s.maxItems !== undefined && v.length > s.maxItems) err(path, `more than ${s.maxItems} items`);
      if (s.items) v.forEach((x, i) => walk(s.items, x, `${path}[${i}]`, depth + 1));
    }
    if (typeOf(v) === 'object') {
      for (const r of s.required || []) if (!(r in v)) err(`${path}.${r}`, 'required');
      const props = s.properties || {};
      for (const [k, x] of Object.entries(v)) {
        if (props[k]) walk(props[k], x, `${path}.${k}`, depth + 1);
        else if (s.additionalProperties === false) err(`${path}.${k}`, 'unknown property');
        else if (s.additionalProperties && typeof s.additionalProperties === 'object') walk(s.additionalProperties, x, `${path}.${k}`, depth + 1);
      }
    }
    if (s.oneOf) {
      const key = s.discriminator;
      if (!key) throw new Error('validate: oneOf requires discriminator');
      const tag = v && typeof v === 'object' ? v[key] : undefined;
      const branch = s.oneOf.find(b => {
        const bs = b.$ref ? defs[b.$ref] : b;
        return bs.properties?.[key]?.const === tag;
      });
      if (!branch) err(`${path}.${key}`, `unknown ${key} ${JSON.stringify(tag)}`);
      else walk(branch, v, path, depth + 1);
    }
  }
}

export function assertValid(schema, value, opts) {
  const errors = validate(schema, value, opts);
  if (errors.length) {
    const e = new Error('schema validation failed: ' + errors.map(x => `${x.path} ${x.message}`).join('; '));
    e.errors = errors;
    throw e;
  }
  return value;
}
