import { t as e } from "./ooxml-error-DbICW35n.js";
import { s as t } from "./resource-policy.generated-D_HlV2Rm.js";
import { t as n } from "./abort-JztSoyw2.js";
import { t as r } from "./font-source-limit-sNrowgTE.js";
import { f as i, o as a, p as o, u as s } from "./resolver-failures-0-_PZr5v.js";
var c = Symbol("font deadline");
function l(e) {
	return e.url !== void 0 && /^(?:https?|blob):/i.test(e.url);
}
var u = /* @__PURE__ */ new Map();
async function d(e, t) {
	let r = u.get(t);
	r || u.set(t, r = {
		active: 0,
		queued: []
	});
	let { queued: i } = r;
	r.active < t ? r.active++ : await new Promise((t, r) => {
		let a = () => {
			e.removeEventListener("abort", o), t();
		}, o = () => {
			let e = i.indexOf(a);
			e >= 0 && i.splice(e, 1), r(n("Font download abandoned"));
		};
		if (e.aborted) {
			o();
			return;
		}
		e.addEventListener("abort", o, { once: !0 }), i.push(a);
	});
	let a = !1;
	return () => {
		if (a) return;
		a = !0;
		let e = i.shift();
		e ? e() : r.active--;
	};
}
async function f(e, n) {
	let i = t, a = Number(e.headers?.get("content-length") ?? NaN);
	if (Number.isSafeInteger(a) && a > i) throw e.body?.cancel?.().catch(() => void 0), r("face", i, a);
	let o = typeof e.body?.getReader == "function" ? e.body.getReader() : null;
	if (!o) {
		let t = await e.arrayBuffer();
		if (t.byteLength > i) throw r("face", i, t.byteLength);
		return n(t.byteLength), t;
	}
	let s = [], c = 0;
	try {
		for (;;) {
			let { done: e, value: t } = await o.read();
			if (e) break;
			if (t) {
				if (c += t.byteLength, c > i) throw r("face", i, c);
				n(t.byteLength), s.push(t);
			}
		}
	} catch (e) {
		throw o.cancel().catch(() => void 0), e;
	}
	let [l] = s;
	if (s.length === 1 && l.byteOffset === 0 && l.byteLength === l.buffer.byteLength && l.buffer instanceof ArrayBuffer) return l.buffer;
	let u = new Uint8Array(c), d = 0;
	for (let e of s) u.set(e, d), d += e.byteLength;
	return u.buffer;
}
var p = /* @__PURE__ */ new WeakSet(), m = class {
	task;
	leases = /* @__PURE__ */ new Map();
	charged = 0;
	settled;
	constructor(e, t) {
		this.task = new a((t) => e(t, this), () => t(this));
	}
}, h = /* @__PURE__ */ new Map();
function g(e, t) {
	h.get(e) === t && h.delete(e), o(t.charged), t.charged = 0;
}
async function _(t, r, i, a, o, c) {
	let l = (e) => {
		s(e), o.charged += e;
	}, u = await d(a, c), p;
	try {
		if (typeof fetch != "function") p = { reason: "fetch is unavailable" };
		else {
			let e = await fetch(r, {
				mode: "cors",
				credentials: i,
				signal: a
			});
			if (!e.ok) e.body?.cancel?.().catch(() => void 0), p = { reason: `HTTP ${e.status ?? "error"}` };
			else {
				let t = await f(e, l);
				p = t.byteLength ? { data: t } : { reason: "empty font file" };
			}
		}
	} catch (r) {
		if (g(t, o), a.aborted && !(r instanceof e)) throw n("Font download abandoned");
		return { reason: r instanceof Error ? r.message : String(r) };
	} finally {
		u();
	}
	return "reason" in p || h.get(t) !== o ? (g(t, o), p) : (o.settled = p, o.leases.size === 0 && g(t, o), p);
}
function v(e, t) {
	e.leases.set(t, (e.leases.get(t) ?? 0) + 1);
}
function y(e, t, n) {
	let r = t.leases.get(n);
	r !== void 0 && (r > 1 ? t.leases.set(n, r - 1) : t.leases.delete(n), t.leases.size === 0 && t.settled && g(e, t));
}
async function b(e, t, n, r, i) {
	if (n.aborted || p.has(r)) return { reason: "timed out" };
	let a = `${t}\u0000${e}`, o = h.get(a);
	if (o || (o = new m((n, r) => _(a, e, t, n, r, i), (e) => {
		h.get(a) === e && h.delete(a);
	}), h.set(a, o)), v(o, r), o.settled) return o.settled;
	let s;
	try {
		s = await o.task.join(n);
	} catch (e) {
		throw y(a, o, r), e;
	}
	return p.has(r) ? { reason: "timed out" } : !("data" in s) || n.aborted ? (y(a, o, r), "data" in s ? { reason: "timed out" } : s) : s;
}
function x(e, t, n) {
	if (p.has(n)) return;
	let r = h.get(`${t}\u0000${e}`);
	if (!(!r?.settled || !("data" in r.settled))) return v(r, n), r.settled.data;
}
async function S(e, t) {
	let { credentials: n, holder: r, deadline: i, signal: a, onAcquired: o } = t, s = t.parallel ?? 6, l = () => p.has(r) || a.aborted && a.reason !== c, u = [...new Set(e)], d = await Promise.all(u.map(async (e) => {
		let t = `${n}\u0000${e}`, c;
		try {
			if (c = await b(e, n, a, r, s), Date.now() > i && "data" in c) {
				let e = h.get(t);
				e && y(t, e, r), c = { reason: "timed out" };
			}
		} catch {
			c = { reason: "timed out" };
		}
		if (l() && !("data" in c)) return [e, { reason: "timed out" }];
		if (o && "data" in c) try {
			o(e, c.data);
		} catch {}
		return [e, c];
	}));
	return new Map(d);
}
function C(e) {
	p.add(e);
	for (let [t, n] of [...h]) n.leases.delete(e) && n.leases.size === 0 && n.settled && g(t, n);
}
function w(e, t) {
	let { family: n, weight: r, style: i, stretch: a, unicodeRange: o } = e;
	return Object.freeze({
		family: n,
		data: t,
		...r === void 0 ? {} : { weight: r },
		...i === void 0 ? {} : { style: i },
		...a === void 0 ? {} : { stretch: a },
		...o === void 0 ? {} : { unicodeRange: o }
	});
}
function T(e, t) {
	return `${e}\u0000acquire\u0000${t}`;
}
function E(e, t) {
	return `${e}\u0000acquired\u0000${t}`;
}
function D(e) {
	return (t, n) => O(e, i(t.source), t.families.flatMap(({ urls: e }) => e), n);
}
async function O(e, t, n, r) {
	let i = "same-origin", a = !1, o = () => {
		a = r.signal.reason !== c;
	};
	r.signal.aborted ? o() : r.signal.addEventListener("abort", o, { once: !0 });
	let s = (n) => {
		let o = e?.get(T(t, n));
		if (o !== void 0) return { reason: o };
		if (!e?.has(E(t, n))) return;
		if (a) return { reason: "timed out" };
		let s = x(n, i, r.holder);
		return s ? { data: s } : void 0;
	}, l = /* @__PURE__ */ new Map(), u = [];
	for (let e of new Set(n)) {
		let t = s(e);
		t ? l.set(e, t) : u.push(e);
	}
	let d;
	try {
		d = await S(u, {
			credentials: i,
			...r
		});
	} finally {
		r.signal.removeEventListener("abort", o);
	}
	for (let [n, r] of d) {
		let i = s(n);
		if (i) {
			l.set(n, i);
			continue;
		}
		l.set(n, r), !(!e || a) && ("data" in r ? e.set(E(t, n), "") : e.has(E(t, n)) || e.set(T(t, n), r.reason));
	}
	return l;
}
export { l as a, D as i, S as n, C as o, O as r, w as s, c as t };
