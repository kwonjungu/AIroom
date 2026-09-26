// 프로젝트 저장소 — 키 단위 저장, revision CAS, 최근 스냅샷 20개, lastGood 포인터.
// 소유권 메타(proj:{id}:meta)는 본문(proj:{id})과 분리한다. 클라이언트가 보낸 id·owner·revision은 권한 근거가 아니다.
//
// 키:
//   proj:{id}            {revision, project, applied:{[jobId]:revision}}   ← CAS 대상
//   proj:{id}:meta       {ownerId, classId, kind, createdAt}
//   proj:{id}:snap:{rev} project (revision별, 최근 SNAPSHOT_KEEP개)
//   proj:{id}:lastgood   {revision, project}
//   stu:{sid}:projects   zset(score=생성시각, member=projectId)

import { ENGINE_VERSIONS, MODES, PROJECT_SCHEMA_VERSION, validateProject } from '../../../public/vibe-v2/shared/contracts/schemas.js';
import { randomId } from '../auth/tokens.js';

export const SNAPSHOT_KEEP = 20;
export const MAX_PROJECTS_PER_STUDENT = 100;
const DAY = 86_400_000;
export const PROJECT_TTL = Object.freeze({ class: 180 * DAY, practice: 7 * DAY, snapshot: 30 * DAY });
const APPLIED_KEEP = 20;

export class ProjectError extends Error {
  constructor(kind, message, extra = {}) { super(message || kind); this.kind = kind; Object.assign(this, extra); }
}

const clone = v => JSON.parse(JSON.stringify(v));
const PROJECT_ID = /^p_[A-Za-z0-9_-]{4,40}$/;

/**
 * @param {{ kv:object, now:()=>number }} deps
 */
export function createProjectStore({ kv, now }) {
  const iso = () => new Date(now()).toISOString();
  const ttlFor = kind => (kind === 'practice' ? PROJECT_TTL.practice : PROJECT_TTL.class);

  /** 학생이 보낸 초안에서 허용 필드만 취해 서버 프로젝트를 만든다. */
  function buildNew(draft) {
    if (!draft || typeof draft !== 'object' || Array.isArray(draft)) throw new ProjectError('BAD', '작품 정보가 없어요.');
    const mode = draft.mode;
    if (!MODES.includes(mode)) throw new ProjectError('BAD', '모드가 올바르지 않아요.');
    const t = iso();
    return {
      schemaVersion: PROJECT_SCHEMA_VERSION,
      id: randomId('p_', 12),
      revision: 0,
      mode,
      title: typeof draft.title === 'string' && draft.title.trim() ? draft.title.trim().slice(0, 40) : '내 작품',
      templateId: draft.templateId ?? null,
      engineVersion: typeof draft.engineVersion === 'string' ? draft.engineVersion : ENGINE_VERSIONS[mode],
      capabilityVersion: typeof draft.capabilityVersion === 'string' ? draft.capabilityVersion : '1',
      program: draft.program ?? { nodes: [], entrypoints: [] },
      assets: draft.assets ?? [],
      learning: draft.learning ?? { missionId: null, missionVersion: null },
      createdAt: t,
      updatedAt: t,
    };
  }

  function errorsOf(project) { return validateProject(project).filter(d => d.severity === 'error'); }

  async function create(student, draft) {
    const count = await kv.zcard(`stu:${student.studentId}:projects`);
    if (count >= MAX_PROJECTS_PER_STUDENT) throw new ProjectError('LIMIT', '작품이 너무 많아요. 안 쓰는 작품을 정리해 주세요.');
    const project = buildNew(draft);
    const errs = errorsOf(project);
    if (errs.length) throw new ProjectError('INVALID', errs[0].code, { diagnostics: errs });
    const ttlMs = ttlFor(student.kind);
    const meta = { ownerId: student.studentId, classId: student.classId, kind: student.kind, createdAt: project.createdAt };
    // 메타를 먼저 nx로 기록 → id 충돌(사실상 불가) 시 덮어쓰지 않음
    if (!(await kv.set(`proj:${project.id}:meta`, meta, { nx: true, ttlMs }))) throw new ProjectError('RETRY', 'id collision');
    const r = await kv.casJson(`proj:${project.id}`, null, { revision: 0, project, applied: {} }, { ttlMs });
    if (!r.ok) throw new ProjectError('RETRY', 'id collision');
    await kv.set(`proj:${project.id}:snap:0`, project, { ttlMs: PROJECT_TTL.snapshot });
    await kv.zadd(`proj:${project.id}:snaps`, 0, '0');
    await kv.zadd(`stu:${student.studentId}:projects`, now(), project.id);
    await kv.expire(`stu:${student.studentId}:projects`, ttlMs);
    return project;
  }

  /** 소유자가 아니면 존재 여부도 숨기고 null */
  async function getOwned(student, id) {
    if (typeof id !== 'string' || !PROJECT_ID.test(id)) return null;
    const meta = await kv.get(`proj:${id}:meta`);
    if (!meta || meta.ownerId !== student.studentId) return null;
    const env = await kv.get(`proj:${id}`);
    if (!env) return null;
    return { envelope: env, meta };
  }

  async function list(student, { cursor = 0, limit = 20 } = {}) {
    const start = Math.max(0, Number.isInteger(cursor) ? cursor : 0);
    const n = Math.min(50, Math.max(1, limit));
    const ids = await kv.zrange(`stu:${student.studentId}:projects`, start, start + n - 1);
    const items = [];
    for (const id of ids) {
      const got = await getOwned(student, id); // 목록 인덱스도 소유권을 다시 확인한다
      if (!got) continue;
      const p = got.envelope.project;
      items.push({ id: p.id, title: p.title, mode: p.mode, revision: p.revision, templateId: p.templateId, updatedAt: p.updatedAt });
    }
    return { items, nextCursor: ids.length === n ? start + n : null };
  }

  /**
   * revision CAS 기록. next.revision은 envelope.revision보다 커야 한다.
   * @returns {Promise<{ok:true, project:object} | {ok:false, current:object|null}>}
   */
  async function write(meta, prevEnvelope, next, { appliedJobId } = {}) {
    const errs = errorsOf(next);
    if (errs.length) throw new ProjectError('INVALID', errs[0].code, { diagnostics: errs });
    if (!(next.revision > prevEnvelope.revision)) throw new ProjectError('BAD', 'revision must increase');
    const applied = { ...(prevEnvelope.applied || {}) };
    if (appliedJobId) {
      applied[appliedJobId] = next.revision;
      const keys = Object.keys(applied);
      if (keys.length > APPLIED_KEEP) for (const k of keys.slice(0, keys.length - APPLIED_KEEP)) delete applied[k];
    }
    const env = { revision: next.revision, project: next, applied };
    const r = await kv.casJson(`proj:${next.id}`, prevEnvelope.revision, env, { ttlMs: ttlFor(meta.kind) });
    if (!r.ok) return { ok: false, current: r.current };
    // 스냅샷은 본문 기록 뒤(실패해도 본문은 정확). revision이 건너뛸 수 있어 SNAPSHOT_KEEP 목록을 별도 zset으로 관리.
    await kv.set(`proj:${next.id}:snap:${next.revision}`, next, { ttlMs: PROJECT_TTL.snapshot });
    await kv.zadd(`proj:${next.id}:snaps`, next.revision, String(next.revision));
    const all = await kv.zrange(`proj:${next.id}:snaps`, 0, -1);
    if (all.length > SNAPSHOT_KEEP) {
      for (const rev of all.slice(0, all.length - SNAPSHOT_KEEP)) {
        await kv.zrem(`proj:${next.id}:snaps`, rev);
        await kv.del(`proj:${next.id}:snap:${rev}`);
      }
    }
    return { ok: true, project: next };
  }

  /** 전체 교체(카드·블록 편집기) — 허용 필드만 가져오고 id·mode·createdAt은 서버 값 유지 */
  function buildReplacement(current, incoming, baseRevision) {
    if (!incoming || typeof incoming !== 'object' || Array.isArray(incoming)) throw new ProjectError('BAD', '작품 정보가 없어요.');
    if (incoming.mode !== undefined && incoming.mode !== current.mode) throw new ProjectError('BAD', '작품 모드는 바꿀 수 없어요.');
    const claimed = Number.isInteger(incoming.revision) ? incoming.revision : 0;
    // 클라이언트 store는 편집마다 revision을 올린다. 서버는 base+1 이상, 과도한 점프는 제한.
    const revision = Math.max(baseRevision + 1, Math.min(claimed, baseRevision + 1000));
    return {
      ...clone(current),
      title: incoming.title ?? current.title,
      templateId: incoming.templateId !== undefined ? incoming.templateId : current.templateId,
      engineVersion: incoming.engineVersion ?? current.engineVersion,
      capabilityVersion: incoming.capabilityVersion ?? current.capabilityVersion,
      program: incoming.program ?? current.program,
      assets: incoming.assets ?? current.assets,
      learning: incoming.learning ?? current.learning,
      revision,
      updatedAt: iso(),
    };
  }

  async function snapshots(id) {
    const revs = await kv.zrange(`proj:${id}:snaps`, 0, -1);
    return revs.map(Number).sort((a, b) => b - a);
  }
  async function snapshot(id, rev) { return kv.get(`proj:${id}:snap:${rev}`); }

  async function setLastGood(meta, envelope, revision) {
    let project = null;
    if (revision === envelope.revision) project = envelope.project;
    else project = await snapshot(envelope.project.id, revision);
    if (!project) return null;
    await kv.set(`proj:${project.id}:lastgood`, { revision, project }, { ttlMs: ttlFor(meta.kind) });
    return { revision };
  }
  async function getLastGood(id) { return kv.get(`proj:${id}:lastgood`); }

  return { create, getOwned, list, write, buildReplacement, snapshots, snapshot, setLastGood, getLastGood, iso };
}
