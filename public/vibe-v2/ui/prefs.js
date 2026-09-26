// 소리·움직임 설정. app.js prefs와 같은 저장 규칙: localStorage 'vibe2_pref_<key>' = JSON 값.
//   vibe2_pref_muted          true|false   전체 음소거 (기본 false = 소리 켬)
//   vibe2_pref_reduceMotion   'system'|'on'|'off'   움직임 줄이기 (기본 'system' = 기기 설정 따름)
// 바뀌면 window에 'vibe2:prefs' CustomEvent(detail = 현재 설정)를 보낸다. 모드는 이 이벤트나
// prefs.get('muted')로 소리를 판단한다.

export const PREF_PREFIX = 'vibe2_pref_';
export const DEFAULT_PREFS = Object.freeze({ muted: false, reduceMotion: 'system' });
export const PREFS_EVENT = 'vibe2:prefs';

/** @param {Storage|null} [storage] 테스트에서는 가짜 저장소를 넣는다 */
export function createPrefStore(storage) {
  const st = storage === undefined ? safeLocalStorage() : storage;
  return {
    get(k) { try { const raw = st?.getItem(PREF_PREFIX + k); return raw == null ? null : JSON.parse(raw); } catch { return null; } },
    set(k, v) { try { st?.setItem(PREF_PREFIX + k, JSON.stringify(v)); } catch { /* 저장 불가 환경: 이번 화면에서만 유지 */ } },
  };
}

function safeLocalStorage() { try { return globalThis.localStorage || null; } catch { return null; } }

/** 저장값 → 정규화된 설정 (순수 함수) */
export function readSettings(prefs) {
  const muted = prefs.get('muted');
  const rm = prefs.get('reduceMotion');
  return {
    muted: typeof muted === 'boolean' ? muted : DEFAULT_PREFS.muted,
    reduceMotion: rm === 'on' || rm === 'off' || rm === 'system' ? rm : DEFAULT_PREFS.reduceMotion,
  };
}

/** 설정 + 기기 설정 → 실제 움직임 줄이기 여부 (순수 함수) */
export function effectiveReduceMotion(pref, systemReduce) {
  if (pref === 'on') return true;
  if (pref === 'off') return false;
  return !!systemReduce;
}

function systemPrefersReduce() {
  try { return globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches || false; } catch { return false; }
}

/** 문서에 반영: <html data-motion="reduce|full" data-muted="true|false"> */
export function applySettings(settings, doc = globalThis.document) {
  if (!doc) return;
  const reduce = effectiveReduceMotion(settings.reduceMotion, systemPrefersReduce());
  doc.documentElement.dataset.motion = reduce ? 'reduce' : 'full';
  doc.documentElement.dataset.muted = String(!!settings.muted);
}

export function isMuted(prefs = createPrefStore()) { return readSettings(prefs).muted; }
export function isReducedMotion(prefs = createPrefStore()) {
  return effectiveReduceMotion(readSettings(prefs).reduceMotion, systemPrefersReduce());
}

/** 한 항목을 바꾸고 문서 반영 + 이벤트 발송 */
export function updateSetting(prefs, key, value) {
  if (!(key in DEFAULT_PREFS)) throw new Error('unknown pref ' + key);
  prefs.set(key, value);
  const s = readSettings(prefs);
  applySettings(s);
  try { globalThis.dispatchEvent?.(new CustomEvent(PREFS_EVENT, { detail: s })); } catch { /* 이벤트 미지원 */ }
  if (key === 'muted' && value) { try { globalThis.speechSynthesis?.cancel(); } catch { /* 없음 */ } }
  return s;
}

export const MOTION_LABELS = { system: '기기 설정 따르기', on: '줄이기', off: '보통' };
