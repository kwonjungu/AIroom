import { a as e, f as t, s as n, u as r } from "./chart-number-format-BTQAc_0Z.js";
function i(i) {
	let o = [u], s = !1, d = [i], f = /* @__PURE__ */ new Set(), p = /* @__PURE__ */ new Set();
	for (; d.length;) {
		let e = d.pop();
		if (typeof e != "object" || !e || f.has(e) || ArrayBuffer.isView(e)) continue;
		f.add(e);
		let i = e;
		if (!Array.isArray(e)) {
			if (i.chartType === "regionMap" || typeof i.imagePath == "string" && !a(i.imagePath, i.mimeType)) return "all";
			i.catFormatBuiltinId === 14 && (s = !0);
		}
		let u = Array.isArray(e) && p.has(e);
		for (let e in i) {
			let a = i[e];
			if (typeof a == "string") {
				if (l.test(e) || (o.push(a), !u && !c.test(e))) continue;
				for (let e of t(a)) r(e) && o.push(...n(e));
			} else typeof a == "object" && a && (Array.isArray(a) && c.test(e) && p.add(a), d.push(a));
		}
	}
	if (s) {
		let t = e();
		if (!t.complete) return "all";
		o.push(...t.texts);
	}
	return o;
}
function a(e, t) {
	return typeof e == "string" && s.test(e) ? !0 : typeof t == "string" && o.has(t.toLowerCase());
}
var o = new Set([
	"image/png",
	"image/jpeg",
	"image/jpg",
	"image/gif",
	"image/bmp",
	"image/webp",
	"image/tiff",
	"image/svg+xml",
	"image/wmf",
	"image/emf"
]), s = /\.(?:wmf|emf|wmz|emz)$/i, c = /format/i, l = /^(?:fontFace|[A-Za-z]+FontFace|themeMajorFontLatin|themeMinorFontLatin)$/, u = `${String.fromCharCode(...Array.from({ length: 95 }, (e, t) => 32 + t))}…≤≥−²\ufffd`, d = String.fromCharCode(...Array.from({ length: 10 }, (e, t) => 65040 + t), ...Array.from({ length: 32 }, (e, t) => 65072 + t));
export { i as n, a as r, d as t };
