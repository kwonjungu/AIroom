import { n as e } from "./ooxml-error-DbICW35n.js";
import { i as t, r as n } from "./embedded-B4q5SDVm.js";
import { f as r } from "./pixel-budget-DI82Hn3R.js";
import { r as i } from "./error-wire-Dr1HjXGZ.js";
function a(e, t) {
	return e.filter((e) => !t.has(`${e.family.toLowerCase()}:${e.weight}:${e.style}`));
}
var o = 1;
function s(e) {
	return e.trim().toLowerCase();
}
async function c(a, c) {
	if (a.length === 0) return {
		faces: [],
		aliases: /* @__PURE__ */ new Map(),
		authoredFamilies: /* @__PURE__ */ new Map(),
		tuples: /* @__PURE__ */ new Set()
	};
	let l = o++, u = /* @__PURE__ */ new Map();
	for (let e of a) {
		let t = s(e.fontName);
		u.has(t) || u.set(t, `__ooxml_pptx_${l}_${u.size + 1}`);
	}
	let d = [], f = /* @__PURE__ */ new Set();
	try {
		for (let o = 0; o < a.length; o += 2) {
			let l = (await Promise.all(a.slice(o, o + 2).map(async (t) => {
				try {
					return {
						family: u.get(s(t.fontName)),
						bytes: await c(t.partPath),
						odttf: !1,
						weight: t.style === "bold" || t.style === "boldItalic" ? "bold" : "normal",
						style: t.style === "italic" || t.style === "boldItalic" ? "italic" : "normal"
					};
				} catch (t) {
					if (t instanceof e || r(t)) throw t;
					let n = i(t);
					if (n) throw n;
					return null;
				}
			}))).filter((e) => e !== null);
			if (l.length !== 0) for (let e of await n(l)) f.has(e) ? t([e]) : (f.add(e), d.push(e));
		}
	} catch (e) {
		throw t(d), e;
	}
	let p = new Set(d.map((e) => s(e.family))), m = new Map([...u].filter(([, e]) => p.has(s(e)))), h = new Map([...m].map(([e, t]) => [t, e]));
	return {
		faces: d,
		aliases: m,
		authoredFamilies: h,
		tuples: new Set(d.map((e) => `${h.get(e.family)}:${e.weight === "bold" || e.weight === "700" ? 700 : 400}:${e.style === "italic" ? "italic" : "normal"}`))
	};
}
function l(e, t) {
	return e.filter((e) => e === null || !t.has(e.trim().toLowerCase()));
}
export { c as n, a as r, l as t };
