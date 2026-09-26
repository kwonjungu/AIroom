// 카드 줄 편집 연산 — 순수 함수. 입력 program을 바꾸지 않고 새 program을 돌려준다.
// program = { nodes:[{id,kind,args,children}], entrypoints:[id] }. 반복 카드(repeat)만 children을 가진다.
// 반복 안의 반복은 만들지 않는다(v1과 같은 1단계 중첩).

const clone = v => JSON.parse(JSON.stringify(v));

export function emptyProgram() { return { nodes: [], entrypoints: [] }; }

export function getNode(program, id) { return program.nodes.find(n => n.id === id) || null; }

/** id가 들어 있는 목록의 주인: null = 맨 위 줄, 그 밖에는 반복 카드 id. 없으면 undefined */
export function parentOf(program, id) {
  if (program.entrypoints.includes(id)) return null;
  const p = program.nodes.find(n => n.children.includes(id));
  return p ? p.id : undefined;
}

export function listOf(program, parentId) {
  if (parentId === null || parentId === undefined) return program.entrypoints;
  return getNode(program, parentId)?.children || [];
}

function setList(program, parentId, list) {
  if (parentId === null) program.entrypoints = list;
  else getNode(program, parentId).children = list;
}

/** 번호 붙은 카드 목록 (화면 표시·실행 강조용). 맨 위 카드는 '1', 반복 안은 '2-1' */
export function orderedCards(program) {
  const out = [];
  program.entrypoints.forEach((id, i) => {
    const n = getNode(program, id); if (!n) return;
    out.push({ node: n, parentId: null, index: i, label: String(i + 1) });
    n.children.forEach((cid, j) => {
      const c = getNode(program, cid); if (c) out.push({ node: c, parentId: id, index: j, label: `${i + 1}-${j + 1}` });
    });
  });
  return out;
}

export function countNodes(program) { return program.nodes.length; }

/** 가장 큰 숫자 꼬리 (c3, s12 → 12). 새 id 발급용 카운터 초기값 */
export function maxIdNumber(program) {
  let m = 0;
  for (const n of program.nodes) { const k = /(\d+)$/.exec(n.id); if (k) m = Math.max(m, Number(k[1])); }
  return m;
}

/**
 * 새 카드를 넣는다.
 * @param {object} node  {id, kind, args, children:[]}
 * @param {string|null} parentId  null = 맨 위 줄
 * @param {number} [index]  생략하면 끝
 * @returns {object|null} 새 program (규칙 위반이면 null)
 */
export function insertNode(program, node, parentId = null, index) {
  if (getNode(program, node.id)) return null;
  if (parentId !== null) {
    const p = getNode(program, parentId);
    if (!p || p.kind !== 'repeat' || node.kind === 'repeat') return null;
  }
  const next = clone(program);
  next.nodes.push(clone({ ...node, children: [] }));
  const list = [...listOf(next, parentId)];
  const at = index === undefined ? list.length : Math.max(0, Math.min(list.length, index));
  list.splice(at, 0, node.id);
  setList(next, parentId, list);
  return next;
}

/** 카드와 (반복이면) 안의 카드를 함께 뺀다 */
export function removeNode(program, id) {
  if (!getNode(program, id)) return null;
  const next = clone(program);
  const doomed = new Set([id, ...(getNode(next, id).children || [])]);
  next.nodes = next.nodes.filter(n => !doomed.has(n.id));
  next.entrypoints = next.entrypoints.filter(e => !doomed.has(e));
  for (const n of next.nodes) n.children = n.children.filter(c => !doomed.has(c));
  return next;
}

/** 같은 줄 안에서 delta(−1 먼저 / +1 나중에)만큼 옮긴다. 더 갈 곳이 없으면 null */
export function moveNode(program, id, delta) {
  const parentId = parentOf(program, id);
  if (parentId === undefined) return null;
  const list = [...listOf(program, parentId)];
  const i = list.indexOf(id), j = i + delta;
  if (j < 0 || j >= list.length) return null;
  const next = clone(program);
  list.splice(i, 1); list.splice(j, 0, id);
  setList(next, parentId, list);
  return next;
}

/** 다른 줄(또는 같은 줄의 다른 자리)로 옮긴다 — 드래그용. index는 옮기기 전 목록 기준 삽입 위치 */
export function moveNodeTo(program, id, parentId, index) {
  const from = parentOf(program, id);
  if (from === undefined) return null;
  const node = getNode(program, id);
  if (parentId !== null) {
    const p = getNode(program, parentId);
    if (!p || p.kind !== 'repeat' || node.kind === 'repeat' || parentId === id) return null;
  }
  const next = clone(program);
  const src = [...listOf(next, from)];
  const oldIdx = src.indexOf(id);
  src.splice(oldIdx, 1);
  setList(next, from, src);
  const dst = [...listOf(next, parentId)];
  let at = index;
  if (from === parentId && oldIdx < index) at -= 1;
  at = Math.max(0, Math.min(dst.length, at));
  dst.splice(at, 0, id);
  setList(next, parentId, dst);
  return next;
}

/** 카드 args만 바꾼 새 program */
export function setArgs(program, id, args) {
  const next = clone(program);
  const n = getNode(next, id); if (!n) return null;
  n.args = { ...n.args, ...args };
  return next;
}

/** 모든 카드의 id가 서로 다르고 참조가 맞는지 (테스트·방어용) */
export function programIntegrity(program) {
  const ids = program.nodes.map(n => n.id);
  const uniq = new Set(ids);
  const refs = [...program.entrypoints, ...program.nodes.flatMap(n => n.children)];
  return {
    duplicateIds: ids.length - uniq.size,
    danglingRefs: refs.filter(r => !uniq.has(r)).length,
    doubleRefs: refs.length - new Set(refs).size,
    orphans: ids.filter(id => !refs.includes(id)).length,
  };
}
