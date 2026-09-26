// 카드 코딩 미션 카탈로그 — WP1 홈/지도 화면이 소비한다. DOM 없음.
//
// getCatalog(progress) → [{id, title, mode, missions:[{id, title, icon, status, makeProject}]}]
//   status: 'done'(완료) | 'current'(지금 할 차례) | 'locked'(앞 미션을 먼저) | 'open'(선생님이 모두 열어 둠)
//   잠금은 학습 순서 안내일 뿐이다. progress.unlockAll 이면 모두 'open'(완료는 'done' 유지).
// progress: { done?: string[] | Set<string>, unlockAll?: boolean } (null 허용)

import { GOAL_MISSIONS, GOAL_CHAPTERS, getGoalMission } from './missions/goal.js';
import { SHAPE_MISSIONS, SHAPE_CHAPTERS, getShapeMission } from './missions/shape.js';

export const MISSION_VERSION = '2';

function uid() {
  const t = Date.now().toString(36);
  const r = Math.random().toString(36).slice(2, 8);
  return `${t}${r}`;
}

export function findMission(missionId) {
  if (!missionId) return null;
  return getGoalMission(missionId) || getShapeMission(missionId);
}

/** 도형 미션의 시작 프로그램 (cardsPlaced면 카드가 줄에 놓인 채로 시작) */
export function startProgram(mission, mode) {
  if (mode === 'shape' && mission.cardsPlaced) {
    const nodes = mission.cards.map((a, i) => ({ id: 's' + (i + 1), kind: 'stamp', args: { ...a }, children: [] }));
    return { nodes, entrypoints: nodes.map(n => n.id) };
  }
  return { nodes: [], entrypoints: [] };
}

/**
 * @param {'goal'|'shape'} mode
 * @param {object|null} mission  null이면 자유 연습
 * @param {{now?: string}} [opts]
 */
export function makeMissionProject(mode, mission, opts = {}) {
  const now = opts.now || new Date().toISOString();
  const key = mission?.id || `${mode}-free`;
  return {
    schemaVersion: 2,
    id: `p_${key}_${uid()}`.slice(0, 42),
    revision: 0,
    mode,
    title: (mission?.title || (mode === 'goal' ? '별까지 가기' : '도형 겹치기')).slice(0, 40),
    templateId: null,
    engineVersion: 'cards-1',
    capabilityVersion: '1',
    program: mission ? startProgram(mission, mode) : { nodes: [], entrypoints: [] },
    assets: [],
    learning: { missionId: mission?.id || null, missionVersion: mission ? MISSION_VERSION : null },
    createdAt: now,
    updatedAt: now,
  };
}

function doneSet(progress) {
  const d = progress?.done;
  if (!d) return new Set();
  return d instanceof Set ? d : new Set(d);
}

function statusList(missions, progress) {
  const done = doneSet(progress);
  let currentGiven = false;
  return missions.map(m => {
    if (done.has(m.id)) return 'done';
    if (progress?.unlockAll) return 'open';
    if (!currentGiven) { currentGiven = true; return 'current'; }
    return 'locked';
  });
}

function group(mode, chapters, missions, progress) {
  // 모드 안에서는 순서대로 한 미션씩 '지금 할 차례'가 된다 (챕터를 넘어 이어짐)
  const status = statusList(missions, progress);
  const byMission = new Map(missions.map((m, i) => [m.id, status[i]]));
  return chapters.map(ch => ({
    id: ch.id,
    title: ch.title,
    story: ch.story,
    mode,
    missions: missions.filter(m => m.chapter === ch.id).map(m => ({
      id: m.id,
      title: m.title,
      icon: m.icon,
      concept: m.concept || null,
      status: byMission.get(m.id),
      makeProject: () => makeMissionProject(mode, m),
    })),
  }));
}

/** @param {{done?:string[]|Set<string>, unlockAll?:boolean}|null} progress */
export function getCatalog(progress = null) {
  return [
    ...group('goal', GOAL_CHAPTERS, GOAL_MISSIONS, progress),
    ...group('shape', SHAPE_CHAPTERS, SHAPE_MISSIONS, progress),
  ];
}

/** 진도에 완료 미션 추가 (원본 불변) */
export function markDone(progress, missionId) {
  const done = [...doneSet(progress)];
  if (missionId && !done.includes(missionId)) done.push(missionId);
  return { ...(progress || {}), done };
}

/** 같은 모드의 다음 미션 (없으면 null) */
export function nextMission(missionId) {
  for (const list of [GOAL_MISSIONS, SHAPE_MISSIONS]) {
    const i = list.findIndex(m => m.id === missionId);
    if (i >= 0) return list[i + 1] || null;
  }
  return null;
}
