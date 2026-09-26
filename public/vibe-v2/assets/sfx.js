// 효과음 — v1 public/vibecoding.html의 playSfx(WebAudio 합성 7종)를 재사용 가능한 모듈로 이식. 파일 없음(0 byte).
// 규칙 (§6.2): 게임 이벤트음 0.2~1초, 자동 큰 소리 금지, 사용자 제스처 후에만 AudioContext 시작, 전체 음소거 존중.
//  - unlock()은 반드시 pointerdown/keydown 같은 사용자 제스처 처리기 안에서 부른다. 그 전 play()는 소리 없이 false.
//  - 음소거는 v1과 같은 localStorage 'vibe_muted'('1'=끔)를 공유한다.
//  - click(50ms)·pop(90ms)은 v1 그대로의 UI 틱이라 0.2초보다 짧다(게임 이벤트에는 쓰지 않음). hit만 v2 신규.

export const MUTE_KEY = 'vibe_muted';
const MASTER = 0.8; // 전체 상한

/** 합성 정의 — 각 소리의 길이(ms)는 마지막 음의 start+dur 기준 */
export const SFX = Object.freeze({
  click: { durationMs: 50, uiOnly: true },
  pop: { durationMs: 90, uiOnly: true },
  run: { durationMs: 220 },
  hit: { durationMs: 260 },
  star: { durationMs: 300 },
  fail: { durationMs: 520 },
  unlock: { durationMs: 540 },
  success: { durationMs: 580 },
});

/** 게임 런타임 이벤트 → 효과음 */
export const EVENT_SFX = Object.freeze({ start: 'run', collect: 'star', hit: 'hit', shielded: 'pop', win: 'success', lose: 'fail' });
export function sfxForEvent(type) { return EVENT_SFX[type] || null; }

function safeStorage(s) {
  return {
    get(k) { try { return s?.getItem(k) ?? null; } catch { return null; } },
    set(k, v) { try { s?.setItem(k, v); } catch { /* 사생활 보호 모드 등 */ } },
  };
}

/**
 * @param {{ storage?: Storage|null, AudioContext?: any, random?: () => number }} [o]
 */
export function createSfx(o = {}) {
  const store = safeStorage(o.storage !== undefined ? o.storage : globalThis.localStorage);
  const Ctor = o.AudioContext || globalThis.AudioContext || globalThis.webkitAudioContext || null;
  const random = o.random || Math.random;
  let muted = store.get(MUTE_KEY) === '1';
  let unlocked = false;
  let ctx = null;

  function context() {
    if (muted || !unlocked || !Ctor) return null;
    try {
      if (!ctx) ctx = new Ctor();
      if (ctx.state === 'suspended') ctx.resume?.();
      return ctx;
    } catch { return null; }
  }

  function play(name, pitch) {
    if (!SFX[name]) return false;
    const c = context();
    if (!c) return false;
    const t = c.currentTime;
    const out = c.createGain(); out.gain.value = MASTER; out.connect(c.destination);
    const tone = (freq, start, dur, opt = {}) => {
      const osc = c.createOscillator(), g = c.createGain();
      osc.type = opt.type || 'sine';
      osc.frequency.setValueAtTime(freq, t + start);
      if (opt.slide) osc.frequency.exponentialRampToValueAtTime(opt.slide, t + start + dur);
      g.gain.setValueAtTime(0, t + start);
      g.gain.linearRampToValueAtTime(Math.min(opt.vol || 0.16, 0.2), t + start + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + start + dur);
      osc.connect(g); g.connect(out);
      osc.start(t + start); osc.stop(t + start + dur + 0.03);
    };
    switch (name) {
      case 'click': tone(1400, 0, 0.05, { type: 'triangle', vol: 0.09 }); break;
      case 'run': { // 휙 — 밴드패스 노이즈 스윕
        const dur = 0.22, buf = c.createBuffer(1, Math.floor(c.sampleRate * dur), c.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = (random() * 2 - 1) * (1 - i / d.length);
        const src = c.createBufferSource(); src.buffer = buf;
        const f = c.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 1.2;
        f.frequency.setValueAtTime(500, t);
        f.frequency.exponentialRampToValueAtTime(2600, t + dur);
        const g = c.createGain();
        g.gain.setValueAtTime(0.2, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        src.connect(f); f.connect(g); g.connect(out); src.start(t);
        break;
      }
      case 'success': // 도-미-솔
        tone(523.25, 0, 0.18, { type: 'triangle', vol: 0.15 });
        tone(659.25, 0.12, 0.18, { type: 'triangle', vol: 0.15 });
        tone(783.99, 0.24, 0.34, { type: 'triangle', vol: 0.17 });
        tone(1567.98, 0.24, 0.34, { type: 'sine', vol: 0.06 });
        break;
      case 'star': { // 상승 글리산도 — pitch(1~3)
        const k = Math.max(1, Math.min(3, pitch || 1));
        const base = 520 * Math.pow(1.25, k - 1);
        tone(base, 0, 0.3, { type: 'sine', vol: 0.15, slide: base * 2 });
        tone(base * 3, 0.05, 0.2, { type: 'sine', vol: 0.05, slide: base * 4 });
        break;
      }
      case 'fail': // 부드러운 2음 하강 (버저 금지)
        tone(392, 0, 0.22, { type: 'sine', vol: 0.13 });
        tone(311.13, 0.18, 0.34, { type: 'sine', vol: 0.12 });
        break;
      case 'unlock':
        tone(880, 0, 0.1, { type: 'triangle', vol: 0.11 });
        tone(1174.66, 0.08, 0.1, { type: 'triangle', vol: 0.11 });
        tone(1567.98, 0.16, 0.22, { type: 'triangle', vol: 0.12 });
        tone(2349.32, 0.24, 0.3, { type: 'sine', vol: 0.07 });
        break;
      case 'pop': tone(300, 0, 0.09, { type: 'sine', vol: 0.18, slide: 640 }); break;
      case 'hit': // 쿵 — 낮게 떨어지는 짧은 음 (v2 신규, 부드럽게)
        tone(220, 0, 0.26, { type: 'sine', vol: 0.16, slide: 110 });
        tone(440, 0, 0.08, { type: 'triangle', vol: 0.05 });
        break;
      default: return false;
    }
    return true;
  }

  return {
    play,
    playEvent(type) { const n = sfxForEvent(type); return n ? play(n) : false; },
    /** 사용자 제스처 처리기 안에서 호출 */
    unlock() { unlocked = true; if (!muted) context(); return !muted && !!Ctor; },
    isUnlocked: () => unlocked,
    isMuted: () => muted,
    setMuted(v) {
      muted = !!v;
      store.set(MUTE_KEY, muted ? '1' : '0');
      if (muted && ctx?.suspend) { try { ctx.suspend(); } catch { /* 무시 */ } }
      if (!muted) play('pop'); // 켰을 때 확인음 (v1과 같음, 이미 제스처 후일 때만 들림)
      return muted;
    },
    toggleMute() { return this.setMuted(!muted); },
  };
}
