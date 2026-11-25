import { a as e, n as t } from "./substitutions-_KDT_mVq.js";
import { o as n } from "./resource-policy.generated-D_HlV2Rm.js";
import { t as r } from "./substitute-script-COw3MRyd.js";
import { t as i } from "./abort-JztSoyw2.js";
import { t as a } from "./font-source-limit-sNrowgTE.js";
import { c as o, f as s } from "./source-GXgH3t1X.js";
import { i as c, n as l, o as u, r as d } from "./resolver-failures-0-_PZr5v.js";
function f(e) {
	let n = /* @__PURE__ */ new Map();
	for (let r of e) {
		let e = t(r.family), i = n.get(e);
		i ? i.push(r) : n.set(e, [r]);
	}
	return n;
}
function p(n, r, i, a = "all") {
	let o = n.get(t(r));
	if (o?.length) return {
		kind: "claimed",
		served: o[0].family,
		declarations: o
	};
	for (let o of e(i, r, a)) {
		let e = n.get(t(o.use));
		if (e?.length) return {
			kind: "claimed",
			served: e[0].family,
			substitution: o,
			declarations: e
		};
	}
	return { kind: "absent" };
}
function m(e, n, r, i = () => "all") {
	n.index ??= f(e.faces);
	let a = n.index;
	return new Map(r.map((n) => [t(n), p(a, n, e.substitutions, i(n))]));
}
function h(e) {
	if (!Array.isArray(e)) return {
		ok: !1,
		reason: "resolver did not return an array"
	};
	if (e.length > 2048) return {
		ok: !1,
		reason: a("declarations", n, e.length).message
	};
	try {
		return {
			ok: !0,
			declarations: Object.freeze(e.map((e, t) => s(e, `font resolver declaration ${t}`, void 0, !0)))
		};
	} catch (e) {
		return {
			ok: !1,
			reason: e instanceof Error ? e.message : String(e)
		};
	}
}
var g = class {
	families;
	constructor(e) {
		this.families = e;
	}
}, _ = new Set(r);
function v(e) {
	if (e === void 0) return () => "all";
	if (!e || typeof e != "object" || Array.isArray(e)) throw TypeError("font demand substituteScripts must be an object");
	let n = /* @__PURE__ */ new Map();
	for (let [r, i] of Object.entries(e)) {
		if (!Array.isArray(i) || !i.every((e) => typeof e == "string" && _.has(e))) throw TypeError(`font demand substituteScripts[${JSON.stringify(r)}] must list substitute scripts`);
		n.set(t(r), Object.freeze([...new Set(i)].sort()));
	}
	return (e) => n.get(t(e)) ?? [];
}
var y = (e, t, n) => {
	let r = o(e);
	if (!r) throw Error("font resolver function is not available in this realm");
	return r(t, n);
};
function b(n, r, i) {
	let a = [t(r), ...e(i, r).map(({ use: e }) => t(e))], o = [...new Set(a)].flatMap((e) => n.get(e) ?? []);
	return o.length ? {
		kind: "claimed",
		served: o[0].family,
		declarations: Object.freeze(o)
	} : { kind: "absent" };
}
function x(e, t, n, r) {
	return e.kind === "claimed" ? p(f(e.declarations), t, n, r) : e;
}
async function S(e) {
	let { source: n, cache: r, runner: i, signal: a, holder: o, sourceIndex: s, remainingMs: f, failures: p } = e, m = /* @__PURE__ */ new Map(), h = e.families.filter(({ name: e }) => {
		let n = d(p, r, e, o);
		return n ? (m.set(t(e), n), !1) : !0;
	}), g = h.filter(({ name: e }) => !r.families.has(t(e))), _;
	if (g.length) {
		let e = Object.freeze({
			authoredFamilies: Object.freeze(g.filter((e) => !e.fallback).map(({ name: e }) => e)),
			fallbackFamilies: Object.freeze(g.filter((e) => e.fallback).map(({ name: e }) => e))
		});
		_ = new u((t) => C(i, n, e, t, {
			sourceIndex: s,
			remainingMs: f()
		}), () => void 0);
	}
	let v = await Promise.all(h.map(async ({ name: e }) => {
		let n = t(e), i = await r.families.join(n, async (e) => {
			if (!_) return { kind: "absent" };
			let t = await _.join(e), r = t.get(n) ?? { kind: "absent" };
			return t.delete(n), r;
		}, a, o), s = i.kind === "failed" ? i.reason : p?.get(c(r.id, e));
		return s === void 0 ? [n, i] : [n, l(p, r, [{ name: e }], s, o).get(n) ?? i];
	}));
	return new Map([...m, ...v]);
}
async function C(e, n, r, a, o) {
	let s = [...r.authoredFamilies, ...r.fallbackFamilies], c = (e) => new Map(s.map((n) => [t(n), {
		kind: "failed",
		reason: e
	}])), l = Date.now() + o.remainingMs, u = () => e === y && Date.now() > l, d;
	try {
		d = await e(n, r, Object.freeze({ signal: a }), o);
	} catch (e) {
		if (a.aborted) throw e;
		return u() ? c("timed out") : c(e instanceof Error ? e.message : String(e));
	}
	if (a.aborted) throw i("Font resolver abandoned");
	if (u()) return c("timed out");
	let p = (e, t) => b(e, t, n.substitutions);
	if (d instanceof g) {
		let e = d.families;
		return new Map(s.map((n) => {
			let r = t(n), i = e.get(r);
			if (!i || i.kind === "absent") return [r, { kind: "absent" }];
			if (i.kind === "failed") return [r, {
				kind: "failed",
				reason: i.reason
			}];
			let a = h(i.declarations);
			return a.ok ? [r, p(f(a.declarations), n)] : [r, {
				kind: "failed",
				reason: a.reason
			}];
		}));
	}
	let m = h(d);
	if (!m.ok) return c(m.reason);
	let _ = f(m.declarations);
	return new Map(s.map((e) => [t(e), p(_, e)]));
}
export { p as a, v as i, S as n, f as o, y as r, m as s, x as t };
