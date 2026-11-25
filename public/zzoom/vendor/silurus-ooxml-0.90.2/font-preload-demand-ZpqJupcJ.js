import { t as e } from "./font-display-text-BSPHLOZg.js";
import { n as t } from "./symbol-font-Cf7Xu0_f.js";
import { t as n } from "./scalar-demand-bzQ71V_C.js";
import { n as r, r as i, t as a } from "./chart-paint-texts-C9chlISz.js";
function o(i, o, f) {
	let p = new n({
		budget: f,
		committed: o
	}), m = (e) => e ? e.startsWith("+") ? e.startsWith("+mj-") ? i.theme?.majorFont : i.theme?.minorFont : e.split(",")[0] : i.theme?.minorFont, h = /* @__PURE__ */ new Map(), g = t(m(null)) !== void 0, _ = (e) => {
		if (!e) return g;
		let n = h.get(e);
		return n === void 0 && h.set(e, n = t(m(e)) !== void 0), n;
	}, v = /* @__PURE__ */ new Set(), y = (e) => v.has(e) ? !0 : (v.add(e), p.add(e)), b = (e) => p.addSymbolText(e, [], !0), x = (e, t, n) => _(t) || n && _(n) ? p.addSymbolText(e, [m(t), n && m(n)]) : y(e), S = (t) => {
		if (!t) return !0;
		if (t.vert && !c.has(t.vert) || t.vert && l.has(t.vert) && !p.add(a)) return !1;
		for (let n of t.paragraphs) {
			let t = n.bullet;
			if (t?.type === "char") {
				if (!x(t.char, t.fontFamily)) return !1;
			} else if (t?.type === "autoNum") {
				let e = n.runs.find((e) => e.type === "text" && !!e.fontFamily);
				if (!x(u, t.fontFamily ?? (e?.type === "text" ? e.fontFamily : null) ?? n.defFontFamily)) return !1;
			} else if (t?.type !== "none" && t?.type !== "inherit" && t?.type !== "blip") return !1;
			for (let e of n.mathFallbacks ?? []) if (!b(e.text)) return !1;
			for (let t of n.runs) {
				if (t.type === "break") continue;
				if (t.type === "math") {
					if (!b(t.fallbackText ?? "") || !b(s)) return !1;
					continue;
				}
				if (t.type !== "text") return !1;
				let r = t.fontFamily ?? n.defFontFamily, a = e(t, i.slideNumber);
				if (!x(t.text, r, t.fontFamilySym) || a !== t.text && !x(a, r, t.fontFamilySym)) return !1;
			}
		}
		return !0;
	}, C = (e) => {
		if (!d(e) || (e.type === "shape" || e.type === "table") && e.mathFallback && !e.mathFallback.elements.every(C)) return !1;
		switch (e.type) {
			case "shape": return S(e.textBody);
			case "table": return e.rows.every((e) => e.cells.every((e) => S(e.textBody)));
			case "picture":
			case "media": return !0;
			case "chart": {
				let t = r(e.chart);
				return t !== "all" && t.every(y);
			}
			default: return !1;
		}
	};
	return p.isAll || i.parseError || i.background && !d(i.background) || !i.elements.every(C) ? "all" : p.result();
}
var s = "Equation unavailable", c = new Set([
	"horz",
	"vert",
	"vert270",
	"mongolianVert",
	"eaVert",
	"wordArtVert",
	"wordArtVertRtl"
]), l = new Set([
	"eaVert",
	"wordArtVert",
	"wordArtVertRtl"
]), u = `${String.fromCharCode(...Array.from({ length: 95 }, (e, t) => 32 + t))}${String.fromCharCode(...Array.from({ length: 10 }, (e, t) => 65296 + t))}`;
function d(e) {
	return typeof e != "object" || !e || f(e, 0);
}
function f(e, t) {
	if (t > 64) return !1;
	if (Array.isArray(e)) {
		for (let n = 0; n < e.length; n += 1) {
			let r = e[n];
			if (typeof r == "object" && r && !f(r, t + 1)) return !1;
		}
		return !0;
	}
	let n = e;
	for (let e in n) {
		let r = n[e];
		if (typeof r == "string") {
			if (e === "imagePath") {
				if (!i(r, n.mimeType)) return !1;
			} else if (e === "posterPath" && r && !i(r, n.posterMimeType)) return !1;
		} else if (typeof r == "object" && r && e !== "chart" && e !== "mathFallback" && !f(r, t + 1)) return !1;
	}
	return !0;
}
export { o as collectSlideFontDemand };
