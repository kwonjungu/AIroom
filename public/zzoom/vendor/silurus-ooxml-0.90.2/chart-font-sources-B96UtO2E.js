import { n as e } from "./substitutions-_KDT_mVq.js";
var t = /^(?:fontFace|[A-Za-z]+FontFace|themeMajorFontLatin|themeMinorFontLatin)$/;
function n(e) {
	let n = /* @__PURE__ */ new Set(), r = e, i = [e], a = /* @__PURE__ */ new Set();
	for (; i.length;) {
		let e = i.pop();
		if (!(typeof e != "object" || !e || a.has(e) || ArrayBuffer.isView(e))) {
			a.add(e);
			for (let [a, o] of Object.entries(e)) if (typeof o == "string") {
				if (!t.test(a)) continue;
				let e = (o.startsWith("+mj") ? r?.themeMajorFontLatin : o.startsWith("+mn") ? r?.themeMinorFontLatin : o)?.trim();
				e && !e.startsWith("+") && n.add(e);
			} else typeof o == "object" && o && i.push(o);
		}
	}
	return [...n];
}
var r = /* @__PURE__ */ new WeakMap();
function i(t) {
	if (!t?.families.size) return;
	let n = r.get(t);
	if (n === void 0) {
		let i = Object.create(null);
		for (let [e, n] of t.families) i[e] = n;
		for (let [n, r] of t.substitutions) {
			let a = r.script ? void 0 : t.families.get(e(r.family));
			a && (i[n] = a);
		}
		n = Object.keys(i).length ? Object.freeze(i) : null, r.set(t, n);
	}
	return n ?? void 0;
}
function a(e, t) {
	return t ? {
		...e,
		fontSubstitutions: t
	} : e;
}
export { i as n, a as r, n as t };
