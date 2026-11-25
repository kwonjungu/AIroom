function e(e) {
	return typeof e == "number" && Number.isFinite(e) && e > 0 ? e : void 0;
}
function t(t, n, r, i = !1) {
	if (!Number.isFinite(t.width) || !Number.isFinite(t.height) || !(t.width > 0) || !(t.height > 0)) return null;
	let a = e(n), o = e(r);
	if ((i ? a === void 0 && o === void 0 : a === void 0 || o === void 0) || a !== void 0 && !(a < t.width) || o !== void 0 && !(o < t.height)) return null;
	let s = a === void 0 ? 0 : a / t.width, c = o === void 0 ? 0 : o / t.height, l, u;
	if (a !== void 0 && s >= c) l = Math.max(1, Math.ceil(a)), u = Math.max(1, Math.ceil(t.height * l / t.width));
	else if (o !== void 0) u = Math.max(1, Math.ceil(o)), l = Math.max(1, Math.ceil(t.width * u / t.height));
	else return null;
	return l < t.width && u < t.height ? {
		width: l,
		height: u
	} : null;
}
function n(n, r, i, a = !1) {
	if (!Number.isFinite(n.width) || !Number.isFinite(n.height) || !(n.width > 0) || !(n.height > 0)) return null;
	let o = e(r), s = e(i);
	if (o !== void 0 && s !== void 0) {
		let e = Math.min(n.width, Math.max(1, Math.ceil(o))), t = Math.min(n.height, Math.max(1, Math.ceil(s)));
		return e < n.width || t < n.height ? {
			width: e,
			height: t
		} : null;
	}
	return t(n, o, s, a);
}
function r(e, t, r, i) {
	let a = n({
		width: e,
		height: t
	}, r, i, !0);
	return a ? {
		resizeWidth: a.width,
		resizeHeight: a.height,
		resizeQuality: "high"
	} : void 0;
}
export { n, r, t };
