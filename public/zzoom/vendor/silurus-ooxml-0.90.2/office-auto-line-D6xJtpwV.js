var e = 1.3;
function t(t, n) {
	if (t == null || n == null || !Number.isFinite(t) || !Number.isFinite(n) || t < 0 || n < 0 || t + n <= 0) return null;
	let r = (e - 1) / 2 * (t + n);
	return {
		ascent: t + r,
		descent: n + r
	};
}
function n(e) {
	let { unitsPerEm: n, hheaAscent: r, hheaDescent: i, hheaLineGap: a, farEastCodePage: o } = e;
	if (!(Number.isFinite(n) && n > 0 && Number.isFinite(r) && r >= 0 && Number.isFinite(i) && i <= 0 && Number.isFinite(a)) || !(r - i > 0)) return null;
	let s = o ? t(e.winAscent, e.winDescent) : {
		ascent: r + a,
		descent: -i
	};
	if (!s) return null;
	let { ascent: c, descent: l } = s;
	return c >= 0 && l >= 0 && c + l > 0 ? Object.freeze({
		lineHeightRatio: (c + l) / n,
		designAscentRatio: c / n,
		designDescentRatio: l / n
	}) : null;
}
function r(e) {
	let { faceSource: n, unitsPerEm: r, hhea: i, win: a, typoMetrics: o, farEastCodePage: s } = e, c = [
		r,
		...i,
		...a,
		...o ?? []
	];
	if (!(r > 0) || !c.every(Number.isFinite)) return null;
	let [l, u, d] = i, [f, p] = a, m, h;
	if (n === "system") {
		if (s) return null;
		m = l + Math.max(0, d), h = -u;
	} else if (s) {
		let e = t(f, p);
		if (!e) return null;
		({ascent: m, descent: h} = e);
	} else if (o) m = o[0] + Math.max(0, o[2]), h = -o[1];
	else {
		let e = f + p;
		m = f + Math.max(0, d - (e - (l - u))), h = p;
	}
	return m >= 0 && h >= 0 && m + h > 0 ? Object.freeze({
		ascentRatio: m / r,
		descentRatio: h / r
	}) : null;
}
export { r as n, n as r, e as t };
