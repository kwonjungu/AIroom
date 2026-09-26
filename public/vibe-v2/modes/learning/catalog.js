// 3~6학년 학습 미션 카탈로그 (거북이·픽셀·미로) — 홈이 소비한다. DOM 없음.
// WP2 modes/cards/catalog.js 와 같은 모양:
//   getLearningCatalog(progress) → [{id, title, story, mode, missions:[{id, title, icon, concept, status, makeProject}]}]
//   status: 'done' | 'current' | 'locked' | 'open'. 모드 안에서 순서대로 한 미션씩 '지금 할 차례'. unlockAll이면 모두 open.
// progress: { done?: string[] | Set<string>, unlockAll?: boolean } (prefs 'learning.progress')

import { TURTLE_MISSIONS, TURTLE_CHAPTERS } from './missions/turtle.js';
import { PIXEL_MISSIONS, PIXEL_CHAPTERS } from './missions/pixel.js';
import { MAZE_MISSIONS, MAZE_CHAPTERS } from './missions/maze.js';
import { programFor, LANGUAGE } from './engines/common.js';

export const LEARNING_MISSION_VERSION = '1';
export const LEARNING_MODES = ['turtle', 'pixel', 'maze'];
const LISTS = { turtle: TURTLE_MISSIONS, pixel: PIXEL_MISSIONS, maze: MAZE_MISSIONS };
const CHAPTERS = { turtle: TURTLE_CHAPTERS, pixel: PIXEL_CHAPTERS, maze: MAZE_CHAPTERS };
const MODE_TITLE = { turtle: '거북이', pixel: '픽셀', maze: '미로' };

export function allLearningMissions() { return [...TURTLE_MISSIONS, ...PIXEL_MISSIONS, ...MAZE_MISSIONS]; }

export function findLearningMission(id) {
  if (!id) return null;
  const mode = String(id).split('-')[0];
  return LISTS[mode]?.find(m => m.id === id) || null;
}

export function nextLearningMission(id) {
  const m = findLearningMission(id);
  if (!m) return null;
  const list = LISTS[m.mode];
  return list[list.indexOf(m) + 1] || null;
}

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }

/**
 * @param {'turtle'|'pixel'|'maze'} mode
 * @param {object|null} mission null이면 자유 연습
 * @param {{now?:string, source?:string}} [opts]
 */
export function makeLearningProject(mode, mission, opts = {}) {
  const now = opts.now || new Date().toISOString();
  const key = mission?.id || `${mode}-free`;
  return {
    schemaVersion: 2,
    id: `p_${key}_${uid()}`.slice(0, 42),
    revision: 0,
    mode,
    title: (mission?.title ? `${MODE_TITLE[mode]} · ${mission.title}` : `${MODE_TITLE[mode]} 연습`).slice(0, 40),
    templateId: null,
    engineVersion: 'legacy-1',
    capabilityVersion: '1',
    program: programFor(LANGUAGE[mode], opts.source ?? ''),
    assets: [],
    learning: { missionId: mission?.id || null, missionVersion: mission ? LEARNING_MISSION_VERSION : null },
    createdAt: now,
    updatedAt: now,
  };
}

function doneSet(progress) {
  const d = progress?.done;
  if (!d) return new Set();
  return d instanceof Set ? d : new Set(d);
}

export function learningStatusList(missions, progress) {
  const done = doneSet(progress);
  let currentGiven = false;
  return missions.map(m => {
    if (done.has(m.id)) return 'done';
    if (progress?.unlockAll) return 'open';
    if (!currentGiven) { currentGiven = true; return 'current'; }
    return 'locked';
  });
}

/** @param {{done?:string[]|Set<string>, unlockAll?:boolean}|null} progress */
export function getLearningCatalog(progress = null) {
  const out = [];
  for (const mode of LEARNING_MODES) {
    const missions = LISTS[mode];
    const status = learningStatusList(missions, progress);
    const byId = new Map(missions.map((m, i) => [m.id, status[i]]));
    for (const ch of CHAPTERS[mode]) {
      out.push({
        id: ch.id,
        title: `${MODE_TITLE[mode]} · ${ch.title}`,
        story: ch.story,
        mode,
        missions: missions.filter(m => m.chapter === ch.id).map(m => ({
          id: m.id,
          title: m.title,
          icon: m.icon,
          concept: m.level || null,
          status: byId.get(m.id),
          makeProject: () => makeLearningProject(mode, m),
        })),
      });
    }
  }
  return out;
}

export function markLearningDone(progress, missionId) {
  const done = [...doneSet(progress)];
  if (missionId && !done.includes(missionId)) done.push(missionId);
  return { ...(progress || {}), done };
}
