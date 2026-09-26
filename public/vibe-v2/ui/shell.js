// [WP1 교체 예정] 최소 셸 스텁 — 계약(interfaces.js ShellApi) 모양만 맞춘다.
export function mountHome(root, { fixtures, onStart }) {
  root.innerHTML = '<main style="padding:24px"><h1>바이브코딩 v2 (미리보기)</h1><p>셸 구현 전 임시 화면</p></main>';
  for (const [name, make] of Object.entries(fixtures.ALL_FIXTURES)) {
    const b = document.createElement('button'); b.textContent = name; b.onclick = () => onStart(make);
    root.firstChild.append(b);
  }
}
export function mountWorkspace(root, { title, onBack }) {
  root.innerHTML = `<div data-workspace><header><button data-back>← 돌아가기</button> <b></b></header><section data-stage></section><section data-editor></section><aside data-assist></aside></div>`;
  root.querySelector('b').textContent = title;
  root.querySelector('[data-back]').onclick = onBack;
  const q = s => root.querySelector(s);
  return {
    setStep() {}, setAiStatus() {}, say({ text }) { q('[data-assist]').textContent = text; },
    dialog() { return { close() {} }; },
    stageSlot: () => q('[data-stage]'), editorSlot: () => q('[data-editor]'), assistSlot: () => q('[data-assist]'),
    onBack() {}, destroy() { root.replaceChildren(); },
  };
}
