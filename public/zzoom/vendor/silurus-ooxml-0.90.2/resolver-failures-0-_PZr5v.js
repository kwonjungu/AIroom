import { n as e } from "./substitutions-_KDT_mVq.js";
import { c as t } from "./resource-policy.generated-D_HlV2Rm.js";
import { t as n } from "./abort-JztSoyw2.js";
import { t as r } from "./font-source-limit-sNrowgTE.js";
import { n as i } from "./source-GXgH3t1X.js";
function a(e, t) {
	let n = /* @__PURE__ */ new Map(), r = 0;
	return (i) => {
		if (n.has(i)) return n.get(i);
		let a = e(i);
		return i.length <= t && (r += i.length, r > t && (n.clear(), r = i.length), n.set(i, a)), a;
	};
}
var o = class {
	h1 = 3735928559;
	h2 = 1103547991;
	unit(e) {
		this.h1 = Math.imul(this.h1 ^ e, 2654435761), this.h2 = Math.imul(this.h2 ^ e, 1597334677);
	}
	text(e) {
		if (e === void 0) return this.unit(1114112), this;
		this.unit(e.length);
		for (let t = 0; t < e.length; t++) this.unit(e.charCodeAt(t));
		return this;
	}
	bytes(e) {
		this.unit(1114113), this.unit(e.length);
		let t = this.h1, n = this.h2;
		for (let r = 0; r < e.length; r++) {
			let i = e[r];
			t = Math.imul(t ^ i, 2654435761), n = Math.imul(n ^ i, 1597334677);
		}
		return this.h1 = t, this.h2 = n, this;
	}
	digest() {
		let e = this.h1, t = this.h2;
		return e = Math.imul(e ^ e >>> 16, 2246822507) ^ Math.imul(t ^ t >>> 13, 3266489909), t = Math.imul(t ^ t >>> 16, 2246822507) ^ Math.imul(e ^ e >>> 13, 3266489909), (t >>> 0).toString(16).padStart(8, "0") + (e >>> 0).toString(16).padStart(8, "0");
	}
}, s = /* @__PURE__ */ new WeakMap(), c = /* @__PURE__ */ new Map(), l = new FinalizationRegistry((e) => {
	let t = c.get(e.length);
	if (!t) return;
	t.unhashed.delete(e);
	let n = e.hash === void 0 ? void 0 : t.byHash.get(e.hash);
	n?.delete(e) && n.size === 0 && t.byHash.delete(e.hash), t.unhashed.size === 0 && t.byHash.size === 0 && c.delete(e.length);
}), u = 0, d = (e) => new o().bytes(new Uint8Array(e)).digest();
function f(e, t, n) {
	t.hash = n;
	let r = e.byHash.get(n);
	r || e.byHash.set(n, r = /* @__PURE__ */ new Set()), r.add(t);
}
function p(e, t) {
	let n = e.byteLength;
	if (n % 4 == 0) {
		let n = new Uint32Array(e), r = new Uint32Array(t);
		for (let e = 0; e < n.length; e++) if (n[e] !== r[e]) return !1;
		return !0;
	}
	let r = new Uint8Array(e), i = new Uint8Array(t);
	for (let e = 0; e < n; e++) if (r[e] !== i[e]) return !1;
	return !0;
}
function m(e) {
	if (typeof e == "string") return `data:${e.length}:${new o().text(e).digest()}`;
	let t = e.byteLength;
	if (t === 0) return `bytes:0:${d(e)}`;
	let n = s.get(e);
	if (n !== void 0) return n;
	let r = c.get(t);
	r || c.set(t, r = {
		unhashed: /* @__PURE__ */ new Set(),
		byHash: /* @__PURE__ */ new Map()
	});
	let i = {
		length: t,
		ref: new WeakRef(e)
	};
	if (r.unhashed.size > 0 || r.byHash.size > 0) {
		for (let e of r.unhashed) {
			r.unhashed.delete(e);
			let n = e.ref.deref();
			n && n.byteLength === t && f(r, e, d(n));
		}
		let a = d(e);
		for (let i of r.byHash.get(a) ?? []) {
			let r = i.ref.deref();
			if (r && r.byteLength === t && p(r, e)) {
				n = s.get(r);
				break;
			}
		}
		f(r, i, a);
	} else r.unhashed.add(i);
	return n ??= `bytes:${t}:${++u}`, s.set(e, n), l.register(e, i), n;
}
function h(e, t) {
	e.text(t === void 0 ? void 0 : String(t.length));
	for (let n of t ?? []) e.text(n.for).text(n.use).text(n.script);
}
function g(e, t) {
	e.text(t.family).text(t.weight).text(t.style).text(t.stretch).text(t.unicodeRange), t.data ? e.bytes(new Uint8Array(t.data)) : e.text(t.url);
}
var _ = /* @__PURE__ */ new WeakMap();
function v(e) {
	let t = _.get(e);
	if (t) return t;
	let n = new o().text(e.protocol).text(e.kind);
	switch (e.kind) {
		case "font-css-api": {
			n.text(e.urlTemplate).text(e.query).text(e.credentials ?? "same-origin");
			let t = e.families ? Object.entries(e.families) : void 0;
			n.text(t === void 0 ? void 0 : String(t.length));
			for (let [e, r] of t ?? []) n.text(e).text(r === !0 ? void 0 : r);
			n.text(e.sharedSubsetMetricFamilies === void 0 ? void 0 : String(e.sharedSubsetMetricFamilies.length));
			for (let t of e.sharedSubsetMetricFamilies ?? []) n.text(t);
			n.text(e.parallelFaceDownloads === void 0 ? void 0 : String(e.parallelFaceDownloads));
			break;
		}
		case "font-css":
			n.text(e.url).text(e.credentials ?? "same-origin");
			break;
		case "font-files":
			n.text(e.credentials ?? "same-origin").text(String(e.faces.length));
			for (let t of e.faces) g(n, t);
			break;
		case "font-resolver":
			n.text(e.id);
			break;
	}
	h(n, e.substitutions);
	let r = `${e.kind}:${n.digest()}`;
	return _.set(e, r), r;
}
function y(e, t) {
	return e.aborted ? (t(), () => void 0) : (e.addEventListener("abort", t, { once: !0 }), () => e.removeEventListener("abort", t));
}
var b = class {
	onAbandon;
	controller = new AbortController();
	promise;
	waiters = 0;
	settled = !1;
	produce;
	constructor(e, t) {
		this.onAbandon = t, this.produce = e;
	}
	start() {
		let e = this.controller.signal, t = this.produce;
		this.produce = void 0;
		let r = Promise.resolve().then(() => {
			if (e.aborted) throw n("Font source request abandoned");
			return t(e);
		}).finally(() => {
			this.settled = !0;
		});
		return r.catch(() => void 0), r;
	}
	join(e) {
		if (e.aborted || this.controller.signal.aborted) return this.waiters === 0 && !this.settled && this.abandon(), Promise.reject(n("Font source request abandoned"));
		this.waiters++;
		let t = this.promise ??= this.start();
		return new Promise((r, i) => {
			let a = !1, o = () => {
				a || (a = !0, this.waiters--);
			}, s = y(e, () => {
				a || (o(), this.waiters === 0 && !this.settled && this.abandon(), i(n("Font source request abandoned")));
			});
			t.then((e) => {
				s(), a || (o(), r(e));
			}, (e) => {
				s(), a || (o(), i(e));
			});
		});
	}
	abandon() {
		this.produce = void 0, this.controller.abort(), this.onAbandon();
	}
}, x = 0, S = /* @__PURE__ */ new Set();
function C(e) {
	return S.add(e), () => {
		S.delete(e);
	};
}
function w(e) {
	if (!(e <= 0)) {
		if (x + e > 268435456) for (let e of [...S]) e();
		if (x + e > 268435456) throw r("retained", t, x + e);
		x += e;
	}
}
function T(e) {
	return e <= 0 ? !0 : x + e > 268435456 ? !1 : (x += e, !0);
}
function E(e) {
	e > 0 && (x -= e);
}
function D(e) {
	let t = /* @__PURE__ */ new Set(), n = 0;
	for (let r of e) r.data ? t.has(r.data) || (t.add(r.data), n += r.data.byteLength) : r.url && /^\s*data:/i.test(r.url) && (n += i(r.url) ?? 0);
	return n;
}
var O = class {
	evict;
	weigh;
	onDrop;
	failed;
	tasks = /* @__PURE__ */ new Map();
	charged = /* @__PURE__ */ new Map();
	values = /* @__PURE__ */ new Map();
	holders = /* @__PURE__ */ new Map();
	held = /* @__PURE__ */ new Map();
	constructor(e = () => !1, t = () => 0, n = () => void 0, r) {
		this.evict = e, this.weigh = t, this.onDrop = n, this.failed = r;
	}
	drop(e, t) {
		this.tasks.get(e) === t && this.tasks.delete(e), this.values.delete(t);
		let n = this.charged.get(t);
		n !== void 0 && (this.charged.delete(t), E(n)), this.onDrop(t);
	}
	hold(e, t) {
		let n = this.holders.get(e);
		n || (n = /* @__PURE__ */ new Set(), this.holders.set(e, n)), n.add(t);
		let r = this.held.get(t);
		r || (r = /* @__PURE__ */ new Set(), this.held.set(t, r)), r.add(e);
	}
	join(e, t, r, i) {
		if (r.aborted) return Promise.reject(n("Font source request abandoned"));
		this.hold(e, i);
		let a = this.tasks.get(e);
		if (!a) {
			let n = new b(async (r) => {
				try {
					let i = await t(r, n);
					if (this.tasks.get(e) !== n) return this.onDrop(n), i;
					if (this.evict(i)) return this.drop(e, n), i;
					let a = this.weigh(i);
					try {
						w(a);
					} catch (t) {
						if (!this.failed || !(t instanceof Error)) throw t;
						return this.drop(e, n), this.failed(t.message);
					}
					return a > 0 && this.charged.set(n, a), this.values.set(n, i), i;
				} catch (t) {
					throw this.drop(e, n), t;
				}
			}, () => this.drop(e, n));
			a = n, this.tasks.set(e, a);
		}
		return a.join(r);
	}
	release(e) {
		let t = this.held.get(e);
		if (t) {
			this.held.delete(e);
			for (let n of t) {
				let t = this.holders.get(n);
				if (t?.delete(e), t && t.size > 0) continue;
				this.holders.delete(n);
				let r = this.tasks.get(n);
				r && this.drop(n, r);
			}
		}
	}
	holdKept(e, t) {
		let n = this.tasks.get(e), r = n ? this.values.get(n) : void 0;
		return r !== void 0 && this.hold(e, t), r;
	}
	has(e) {
		return this.tasks.has(e);
	}
	get size() {
		return this.tasks.size;
	}
	clear() {
		for (let [e, t] of [...this.tasks]) this.drop(e, t);
		for (let e of this.charged.values()) E(e);
		this.charged.clear(), this.values.clear(), this.holders.clear(), this.held.clear();
	}
}, k = /* @__PURE__ */ new Map();
function A(e) {
	let t = v(e), n = k.get(t);
	if (n) return n.refs++, j(n);
	let r = new O((e) => !e.ok, (e) => e.ok ? D(e.declarations) : 0, void 0, (e) => ({
		ok: !1,
		reason: e
	})), i = {
		refs: 1,
		cache: {
			id: t,
			stylesheets: r,
			families: new O((e) => e.kind === "failed", (t) => e.kind === "font-resolver" && t.kind === "claimed" ? D(t.declarations) : 0, (e) => r.release(e), (e) => ({
				kind: "failed",
				reason: e
			})),
			release: () => void 0
		}
	};
	return k.set(t, i), j(i);
}
function j(e) {
	let t = !1, { cache: n } = e, r = {
		id: n.id,
		stylesheets: n.stylesheets,
		families: n.families,
		get index() {
			return n.index;
		},
		set index(e) {
			n.index = e;
		},
		release() {
			t || (t = !0, n.families.release(r), e.refs--, !(e.refs > 0 || k.get(n.id) !== e) && (k.delete(n.id), n.stylesheets.clear(), n.families.clear(), n.index = void 0));
		}
	};
	return r;
}
function M(t, n) {
	return `${t}\u0000${e(n)}`;
}
function N(e, t, n, r) {
	if (e) for (let { name: i } of n) {
		let n = M(t, i);
		e.has(n) || e.set(n, r);
	}
}
function P(t, n, r, i) {
	let a = t?.get(M(n.id, r));
	return a === void 0 ? n.families.holdKept(e(r), i) : {
		kind: "failed",
		reason: a
	};
}
function F(t, n, r, i, a) {
	let o = /* @__PURE__ */ new Map();
	for (let { name: s } of r) {
		let r = P(t, n, s, a);
		if (r) {
			o.set(e(s), r);
			continue;
		}
		N(t, n.id, [{ name: s }], i), o.set(e(s), {
			kind: "failed",
			reason: i
		});
	}
	return o;
}
function I(e) {
	if (typeof e != "object" || !e) return [];
	let t = e;
	return [t.authoredFamilies, t.fallbackFamilies].flatMap((e) => Array.isArray(e) ? e.filter((e) => typeof e == "string") : []).map((e) => ({ name: e }));
}
function L(e, t) {
	return t.kind === "claimed" ? {
		family: e,
		kind: "claimed",
		declarations: t.declarations
	} : t.kind === "failed" ? {
		family: e,
		kind: "failed",
		reason: t.reason
	} : {
		family: e,
		kind: "absent"
	};
}
function R(t, n, r, i) {
	let { sourceIndex: a, resolverId: o } = r;
	if (typeof a != "number" || !Number.isSafeInteger(a) || a < 0) return;
	let s = n[a];
	if (s?.kind !== "font-resolver" || s.id !== o) return;
	let c = i(a, s), l = [], u = [];
	for (let { name: n } of I(r.demand)) {
		let r = P(t, c, n, c);
		r ? l.push(L(e(n), r)) : u.push({ name: n });
	}
	return {
		settled: l,
		unsettled: u,
		cache: c
	};
}
function z(e, t, n, r, i) {
	let { sourceIndex: a, resolverId: o } = n;
	if (typeof a != "number" || !Number.isSafeInteger(a) || a < 0) return {
		status: "failed",
		reason: r
	};
	let s = t[a];
	if (s?.kind !== "font-resolver" || s.id !== o) return {
		status: "failed",
		reason: r
	};
	let c = i(a, s);
	return {
		status: "families",
		families: [...F(e, c, I(n.demand), r, c)].map(([e, t]) => L(e, t))
	};
}
export { R as a, C as c, m as d, v as f, M as i, T as l, a as m, F as n, b as o, E as p, P as r, A as s, z as t, w as u };
