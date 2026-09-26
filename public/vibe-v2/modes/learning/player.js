// 단계 재생기 (WP8) — trace를 한 단계씩·천천히·일시정지·리셋. DOM 없음, 타이머는 주입.
//
// v1 픽셀 실행 버튼 결함: 전역 pixelAnimCancel 을 실행 시작 때 false로 되돌리는 순서 때문에 이전 실행의
// 비동기 루프가 살아남아 새 실행과 섞였다. 여기서는 실행마다 세대(gen) 번호를 두고, 예약된 타이머는
// 항상 하나뿐이며, 예약 콜백은 자기 세대가 아니면 아무것도 하지 않는다. reset/play/dispose 모두 타이머를 먼저 끊는다.

/**
 * @param {{
 *   length: number,
 *   delayOf?: (i:number) => number,          // i번째 단계를 보여 준 뒤 다음 단계까지 기다릴 ms
 *   schedule?: (fn:()=>void, ms:number) => any,
 *   cancel?: (id:any) => void,
 *   onStep?: (i:number, info:{done:boolean}) => void,
 *   onDone?: () => void,
 * }} o
 */
export function createPlayer(o) {
  const schedule = o.schedule || ((fn, ms) => setTimeout(fn, ms));
  const cancel = o.cancel || (id => clearTimeout(id));
  let length = o.length;
  let i = -1;
  let playing = false;
  let timer = null;
  let gen = 0;
  let disposed = false;

  function stopTimer() { if (timer !== null) { cancel(timer); timer = null; } }
  const done = () => length > 0 && i >= length - 1;

  function emit() {
    o.onStep?.(i, { done: done() });
    if (done()) { playing = false; stopTimer(); o.onDone?.(); }
  }
  function advance() {
    if (disposed || done()) return;
    i++;
    emit();
  }
  function tick() {
    stopTimer();
    if (!playing || disposed || done()) return;
    const my = gen;
    const ms = Math.max(0, i < 0 ? 0 : (o.delayOf ? o.delayOf(i) : 300));
    timer = schedule(() => {
      timer = null;
      if (my !== gen || !playing || disposed) return;
      advance();
      tick();
    }, ms);
  }

  const api = {
    play() {
      if (disposed || done() || length <= 0) { if (length <= 0) o.onDone?.(); return; }
      playing = true; gen++;
      if (i < 0) { advance(); }
      tick();
    },
    pause() { playing = false; gen++; stopTimer(); },
    /** 한 단계만 (재생 중이면 멈추고 한 단계) */
    step() {
      if (disposed) return;
      playing = false; gen++; stopTimer();
      if (length <= 0) { o.onDone?.(); return; }
      advance();
    },
    reset() { playing = false; gen++; stopTimer(); i = -1; o.onStep?.(i, { done: false }); },
    /** 새 trace로 교체 (처음부터) */
    load(n) { playing = false; gen++; stopTimer(); length = n; i = -1; },
    /** 실행 중 속도 변경: 다음 예약부터 적용 */
    retime() { if (playing) tick(); },
    get index() { return i; },
    get playing() { return playing; },
    get done() { return done(); },
    get pending() { return timer === null ? 0 : 1; },
    dispose() { disposed = true; playing = false; gen++; stopTimer(); },
  };
  return api;
}

export const SPEEDS = Object.freeze({ slow: 700, normal: 320, fast: 90 });
