var e = 32767, t = 1 << 25, n = 1 << 27, r = n, i = t * 4, a = n * 4, o = Math.floor(t / 4), s = n, c = s / o;
function l(e) {
	return e === "image-dimension" || e === "image-pixels" || e === "active-decoded-bytes" || e === "image-effect-count" || e === "image-effect-work" || e === "tiff-lzw-work" || e === "metafile-path-commands" || e === "metafile-record-points" || e === "metafile-record-polygons" || e === "metafile-record-rectangles" || e === "metafile-record-text-units";
}
function u(e) {
	return typeof e == "number" && Number.isSafeInteger(e) && e >= 0;
}
var d = class e extends RangeError {
	metric;
	limit;
	observed;
	code = "ooxml-decoded-image-limit";
	constructor(t, n, r) {
		super(`OOXML decoded image limit exceeded: ${t} ${r} > ${n}`), this.metric = t, this.limit = n, this.observed = r, this.name = "OoxmlDecodedImageLimitError", Object.setPrototypeOf(this, e.prototype);
	}
};
function f(e) {
	if (!(!e || typeof e != "object")) try {
		let t = e, n = t.code, r = t.metric, i = t.limit, a = t.observed;
		return n !== "ooxml-decoded-image-limit" || !l(r) || !u(i) || !u(a) || a <= i ? void 0 : {
			metric: r,
			limit: i,
			observed: a
		};
	} catch {
		return;
	}
}
function p(e) {
	if (!f(e)) return !1;
	try {
		let t = e;
		return typeof t.name == "string" && typeof t.message == "string";
	} catch {
		return !1;
	}
}
export { s as a, r as c, f as d, p as f, c as i, n as l, i as n, e as o, o as r, t as s, a as t, d as u };
