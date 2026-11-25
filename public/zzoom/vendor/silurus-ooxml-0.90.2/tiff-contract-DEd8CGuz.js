var e = class e extends Error {
	code = "ooxml-tiff-decode";
	constructor(t, n) {
		super(t, n), this.name = "TiffDecodeError", Object.setPrototypeOf(this, e.prototype);
	}
};
function t(e) {
	if (!(typeof e != "object" || !e)) try {
		let t = e, n = t.code, r = t.message;
		return n === "ooxml-tiff-decode" && typeof r == "string" ? { message: r } : void 0;
	} catch {
		return;
	}
}
function n(e) {
	if (!t(e)) return !1;
	try {
		return typeof e.name == "string";
	} catch {
		return !1;
	}
}
function r(e) {
	if (e.length < 4) return !1;
	let t = e[0] === 73 && e[1] === 73, n = e[0] === 77 && e[1] === 77;
	return !t && !n ? !1 : new DataView(e.buffer, e.byteOffset, e.byteLength).getUint16(2, t) === 42;
}
function i(e) {
	if (!r(e) || e.length < 8) return null;
	let t = e[0] === 73, n = new DataView(e.buffer, e.byteOffset, e.byteLength), i = (e, t) => Number.isSafeInteger(e) && e >= 0 && t >= 0 && e <= n.byteLength - t, a = n.getUint32(4, t);
	if (!i(a, 2)) return null;
	let o = n.getUint16(a, t);
	if (!i(a + 2, o * 12 + 4)) return null;
	let s, c;
	for (let e = 0; e < o; e++) {
		let r = a + 2 + e * 12, i = n.getUint16(r, t);
		if (i !== 256 && i !== 257) continue;
		let o = n.getUint16(r + 2, t);
		if (n.getUint32(r + 4, t) !== 1 || o !== 1 && o !== 3 && o !== 4) return null;
		let l = o === 1 ? n.getUint8(r + 8) : o === 3 ? n.getUint16(r + 8, t) : n.getUint32(r + 8, t);
		i === 256 ? s = l : c = l;
	}
	return s === void 0 || c === void 0 ? null : {
		width: s,
		height: c
	};
}
export { i as a, n as i, t as n, r, e as t };
