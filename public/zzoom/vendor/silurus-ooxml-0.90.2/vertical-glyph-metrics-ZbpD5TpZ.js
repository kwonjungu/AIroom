var e = .38;
function t(t, n, r) {
	let i = t.textBaseline;
	t.textBaseline = "alphabetic";
	let a = t.measureText(n);
	t.textBaseline = i;
	let o = a.fontBoundingBoxAscent, s = a.fontBoundingBoxDescent;
	return typeof o == "number" && typeof s == "number" && (o !== 0 || s !== 0) ? (o - s) / 2 : e * r;
}
function n(e, t) {
	let n = Math.max(1, Math.round(e * t / 3)), r = Math.max(1, Math.round(e * t / 3));
	return {
		railDev: n,
		gapDev: r,
		spanDev: 2 * n + r
	};
}
function r(e, t, r, i, a, o, s) {
	let { railDev: c, gapDev: l, spanDev: u } = n(o, s);
	if (r === a) {
		let n = Math.round(r * s - u / 2);
		e.fillRect(t, n / s, i - t, c / s), e.fillRect(t, (n + c + l) / s, i - t, c / s);
	} else {
		let n = Math.round(t * s - u / 2);
		e.fillRect(n / s, r, c / s, a - r), e.fillRect((n + c + l) / s, r, c / s, a - r);
	}
}
function i(e, t) {
	let n = e.textAlign, r = e.textBaseline;
	e.textAlign = "center", e.textBaseline = "middle";
	let i = e.measureText(t);
	e.textAlign = n, e.textBaseline = r;
	let a = i.actualBoundingBoxAscent, o = i.actualBoundingBoxDescent;
	return typeof a == "number" && typeof o == "number" ? (a - o) / 2 : 0;
}
export { t as i, n, r, i as t };
