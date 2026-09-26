// [해당 WP 교체 예정] 모드 스텁 — ModeInstance 계약만 충족.
export function createMode(ctx) {
  return {
    enter() { ctx.shell.stageSlot().textContent = 'studio 모드 준비 중 (' + ctx.store.getProject().mode + ')'; },
    pause() {}, resume() {}, dispose() {},
  };
}
