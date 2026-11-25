import { n as e } from "./font-registry-CA7E7o7P.js";
import { i as t, n, r, t as i } from "./local-metrics-PuMOXgAD.js";
import { d as a } from "./scripts-DxEAUeVI.js";
var o = 32, s = 8e3;
function c(e) {
	let t = e.family.trim();
	if (!t) return;
	let n = e.weight ?? 400, i = e.style ?? "normal";
	if (!Number.isInteger(n) || n < 1 || n > 1e3 || i !== "normal" && i !== "italic") return;
	let o = a(t, {
		weight: n,
		style: i
	});
	if (o.length === 0) return;
	let s = new Set([t, ...o.map((e) => e.family)]), c = new Set([...s].flatMap((e) => a(e)).filter((e) => e.weight !== n || e.style !== i).flatMap((e) => e.aliases.map(r))), l = [...new Set(o.flatMap((e) => e.aliases))].filter((e) => !c.has(r(e)));
	if (n === 400 && i === "normal") for (let e of o) l.some((t) => r(t) === r(e.family)) || l.push(e.family);
	if (l.length !== 0) return {
		family: t,
		weight: n,
		style: i,
		localNames: l
	};
}
function l(e) {
	let t = r(e.family);
	return e.weight === 400 && e.style === "normal" ? t : `${t}:${e.weight}:${e.style}`;
}
function u(e, t) {
	let n = e.trim().toLowerCase();
	if (n === "normal") return t === 400;
	if (n === "bold") return t === 700;
	let r = /^(\d+)(?:\s+(\d+))?$/u.exec(n);
	if (!r) return !1;
	let i = Number(r[1]), a = Number(r[2] ?? r[1]);
	return i <= t && t <= a;
}
function d(e, t) {
	return e.status !== "loaded" || r(e.family.replace(/^(['"])(.*)\1$/u, "$2")) !== r(t.family) || e.style.trim().toLowerCase() !== t.style ? !1 : u(e.weight, t.weight);
}
async function f(t, n = e()) {
	let r = t.filter((e) => e.presenceOnly).map((e) => e.family), [i, a] = await Promise.all([p(t.filter((e) => !e.presenceOnly), n), r.length > 0 ? g(r, n) : Promise.resolve(void 0)]);
	return a ? {
		...i,
		...a.installed.size > 0 ? { installed: [...a.installed].sort() } : {},
		presenceChecked: [...a.checked].sort()
	} : i;
}
async function p(e, r) {
	if (!r || typeof FontFace > "u") return {
		faces: [],
		routes: {},
		checked: []
	};
	let a = typeof r[Symbol.iterator] == "function" ? [...r] : [], u = [...new Map(e.map(c).filter((e) => !!e).filter((e) => !a.some((t) => d(t, e))).map((e) => [l(e), e])).values()];
	if (u.length === 0) return {
		faces: [],
		routes: {},
		checked: []
	};
	let f = /* @__PURE__ */ new Map();
	for (let e of u) {
		let t = JSON.stringify([
			e.localNames,
			e.weight,
			e.style
		]), n = f.get(t) ?? [];
		n.push(e), f.set(t, n);
	}
	let p = [...f.values()].slice(0, o), m = Array(p.length), h = 0, g = !0, _ = Array.from({ length: Math.min(4, p.length) }, async () => {
		for (; g && h < p.length;) {
			let e = h++, i = await n(p[e].map((e) => ({
				family: e.family,
				localNames: e.localNames,
				weight: e.weight,
				style: e.style
			})), r);
			g ? m[e] = i : t(i.faces);
		}
	}), v, y = await Promise.race([Promise.allSettled(_), new Promise((e) => {
		v = setTimeout(() => e(null), s);
	})]);
	v !== void 0 && clearTimeout(v), g = !1;
	let b = y?.find((e) => e.status === "rejected");
	if (b) throw t(m.flatMap((e) => e?.faces ?? [])), b.reason;
	let x = Object.assign(Object.create(null), ...m.flatMap((e) => e ? [e.metrics] : [])), S = Object.create(null);
	for (let e of u) {
		let t = l(e), n = x[t];
		if (!n) continue;
		let r = `office-local:${n.sourceIdentity ?? e.localNames.join(",")}`;
		S[t] = {
			requestedFamily: e.family,
			family: n.family,
			source: "local",
			resourceIdentity: r,
			weight: e.weight,
			style: e.style,
			metric: {
				...n,
				sourceIdentity: r
			}
		};
	}
	return {
		faces: m.flatMap((e) => e?.faces ?? []),
		routes: S,
		checked: m.flatMap((e, t) => e && !i(e) ? p[t].map(l) : [])
	};
}
function m(e) {
	t(e);
}
function h(e) {
	let t = r(e), n = a(e).flatMap((e) => {
		if (r(e.family) === t) return e.aliases;
		let n = new Set(a(e.family).filter((t) => t.weight !== e.weight || t.style !== e.style).flatMap((e) => e.aliases.map(r)));
		return e.aliases.filter((e) => !n.has(r(e)));
	});
	return [...new Set([e, ...n])];
}
async function g(e, i) {
	let a = [...new Map(e.map((e) => e.trim()).filter(Boolean).map((e) => [r(e), e])).values()].slice(0, o), c = /* @__PURE__ */ new Set(), l = /* @__PURE__ */ new Set();
	if (!i || typeof FontFace > "u" || a.length === 0) return {
		installed: c,
		checked: l
	};
	let u = 0, d = !0, f = Array.from({ length: Math.min(4, a.length) }, async () => {
		for (; d && u < a.length;) {
			let e = a[u++], o = await n([{
				family: e,
				localNames: h(e)
			}], i);
			t(o.faces), d && (l.add(r(e)), Object.keys(o.metrics).length > 0 && c.add(r(e)));
		}
	}), p;
	return await Promise.race([Promise.allSettled(f), new Promise((e) => {
		p = setTimeout(e, s);
	})]), p !== void 0 && clearTimeout(p), d = !1, {
		installed: new Set(c),
		checked: new Set(l)
	};
}
async function _(t, n = e()) {
	let i = [...new Map(t.map((e) => e.trim()).filter(Boolean).map((e) => [r(e), e])).values()], a = /* @__PURE__ */ new Set(), s = /* @__PURE__ */ new Set();
	for (let e = 0; e < i.length; e += o) {
		let t = await g(i.slice(e, e + o), n);
		for (let e of t.installed) a.add(e);
		for (let e of t.checked) s.add(e);
	}
	return {
		installed: a,
		checked: s
	};
}
export { m as i, f as n, _ as r, u as t };
