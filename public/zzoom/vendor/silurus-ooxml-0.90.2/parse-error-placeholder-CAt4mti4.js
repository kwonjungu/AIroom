import { n as e, t } from "./error-placeholder-text-DT-UPN5r.js";
function n(n) {
	let { errorPlaceholderCanvasLines: r, errorPlaceholderDetail: i, errorPlaceholderTitle: a } = t(n);
	function o(t, n, o, s, c, l) {
		let u = e(l);
		t.save(), t.fillStyle = "#f7f7f8", t.fillRect(0, 0, n, o);
		let d = Math.max(12, Math.min(n, o) * .04);
		t.strokeStyle = "#c8ccd2", t.lineWidth = Math.max(1, Math.min(n, o) * .004), t.setLineDash([t.lineWidth * 6, t.lineWidth * 5]), t.strokeRect(d, d, n - d * 2, o - d * 2), t.setLineDash([]);
		let f = n / 2, p = Math.max(18, Math.min(n, o) * .14);
		t.fillStyle = "#b23b3b", t.textAlign = "center", t.textBaseline = "middle", t.font = `${p}px sans-serif`, t.fillText("⚠", f, o * .34);
		let m = Math.max(11, Math.min(n, o) * .045);
		t.fillStyle = "#333333", t.font = `600 ${m}px sans-serif`;
		let h = n - d * 4, g = a(u, `Slide ${s} could not be displayed`);
		for (let e of r(t, g, h, 1)) t.fillText(e, f, o * .52);
		let _ = i(u, c);
		if (_ === null) {
			t.restore();
			return;
		}
		let v = Math.max(9, Math.min(n, o) * .028);
		t.fillStyle = "#666666", t.font = `${v}px sans-serif`;
		let y = r(t, _, h, 4), b = v * 1.35, x = o * .6 + b;
		for (let e of y) t.fillText(e, f, x), x += b;
		t.restore();
	}
	return o;
}
export { n as parseErrorPlaceholder };
