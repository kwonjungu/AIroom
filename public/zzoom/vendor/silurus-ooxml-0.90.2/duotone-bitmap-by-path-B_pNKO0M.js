import { o as e } from "./wmf-HY7sNn5s.js";
import { t } from "./ooxml-error-DbICW35n.js";
import { C as n, S as r, _ as i, b as a, g as o, h as s, x as c } from "./vertical-vert-feature-ru96Mg5B.js";
import { Jn as l } from "./plot-area-frame-BSqoSYxZ.js";
import { a as u, n as d, o as f, r as p, s as m, t as h, u as g } from "./pixel-budget-DI82Hn3R.js";
import { B as _, F as ee, I as te, M as v, N as ne, P as re, z as ie } from "./renderer-D3GIB31w.js";
import { n as ae, r as oe } from "./raster-target-Ca3tyA0L.js";
import { n as se, t as ce } from "./duotone-CsU0n_8W.js";
var y = /* @__PURE__ */ new WeakMap();
async function b(e, t) {
	let n = y.get(e);
	n || (n = {
		active: 0,
		waiters: []
	}, y.set(e, n)), n.active >= 2 || n.waiters.length > 0 ? await new Promise((e) => n.waiters.push(e)) : n.active++;
	try {
		return await Promise.resolve(), await t();
	} finally {
		let t = n.waiters.shift();
		t ? t() : (n.active--, n.active === 0 && y.delete(e));
	}
}
function x(e = void 0) {
	if (e !== void 0 && (typeof e != "object" || !e || Array.isArray(e))) throw TypeError("imageResources must be an object when provided");
	let t = e?.decodedByteBudget ?? 134217728;
	if (!Number.isSafeInteger(t) || t < 4 || t > 536870912) throw RangeError(`imageResources.decodedByteBudget must be a safe integer from 4 to ${h} bytes`);
	let n = e?.strategy ?? "adaptive";
	if (n !== "adaptive" && n !== "strict") throw TypeError("imageResources.strategy must be 'adaptive' or 'strict'");
	let r = e?.resolution ?? "native-if-fit";
	if (r !== "native-if-fit" && r !== "display") throw TypeError("imageResources.resolution must be 'native-if-fit' or 'display'");
	return Object.freeze({
		decodedByteBudget: t,
		strategy: n,
		resolution: r
	});
}
function S(e) {
	return Number.isFinite(e) && e > 0 ? Math.max(1, Math.ceil(e)) : 1;
}
function le(e) {
	return Number.isSafeInteger(e) && (e ?? 0) > 0 ? e : 1;
}
function C(e, t) {
	let n = 0;
	for (let r of e.values()) {
		let e = t(r), i = e.width * e.height * r.surfaces * 4;
		n = Math.min(2 ** 53 - 1, n + i);
	}
	return n;
}
function ue(e, t) {
	let n = /* @__PURE__ */ new Map();
	for (let t of e) {
		let e = S(t.targetWidthPx), r = S(t.targetHeightPx), i = t.sourceWidthPx !== void 0 && t.sourceHeightPx !== void 0, a = i ? S(t.sourceWidthPx) : void 0, o = i ? S(t.sourceHeightPx) : void 0, s = le(t.retainedSurfaceCount), c = n.get(t.key);
		c ? (c.targetWidth = Math.max(c.targetWidth, e), c.targetHeight = Math.max(c.targetHeight, r), a !== void 0 && o !== void 0 && (c.sourceWidth = Math.max(c.sourceWidth ?? 0, a), c.sourceHeight = Math.max(c.sourceHeight ?? 0, o)), c.surfaces = Math.max(c.surfaces, s)) : n.set(t.key, {
			targetWidth: e,
			targetHeight: r,
			sourceWidth: a,
			sourceHeight: o,
			surfaces: s
		});
	}
	let r = (e) => ({
		width: e.sourceWidth ?? e.targetWidth,
		height: e.sourceHeight ?? e.targetHeight
	}), i = (e, t) => ({
		width: Math.max(1, Math.floor(e.targetWidth * t)),
		height: Math.max(1, Math.floor(e.targetHeight * t))
	}), a = (e, t) => {
		let n = i(e, t);
		return e.sourceWidth === void 0 || e.sourceHeight === void 0 ? n : ae({
			width: e.sourceWidth,
			height: e.sourceHeight
		}, n.width, n.height) ?? {
			width: e.sourceWidth,
			height: e.sourceHeight
		};
	}, o = (e, t, n) => {
		let r = i(e, t), o = a(e, t), s = o.width * o.height;
		return Object.freeze({
			...r,
			retainedWidth: o.width,
			retainedHeight: o.height,
			retainedPixels: s,
			maxRetainedPixels: n ?? s
		});
	}, s = C(n, r), c = [...n.values()].every((e) => {
		let t = r(e);
		return t.width * t.height <= m;
	}), l = [...n.values()].some((e) => e.sourceWidth === void 0 || e.sourceHeight === void 0), u = t.resolution === "native-if-fit" && !l && c && s <= t.decodedByteBudget, d = C(n, (e) => a(e, 1));
	if (u) {
		let e = /* @__PURE__ */ new Map();
		for (let [t, i] of n) {
			let n = r(i);
			e.set(t, Object.freeze({
				width: n.width,
				height: n.height,
				retainedWidth: n.width,
				retainedHeight: n.height,
				retainedPixels: n.width * n.height,
				maxRetainedPixels: n.width * n.height
			}));
		}
		return Object.freeze({
			targets: e,
			idealBytes: d,
			plannedBytes: s,
			qualityScale: 1,
			degraded: !1
		});
	}
	if (t.resolution === "native-if-fit" && t.strategy === "adaptive" && l && d <= t.decodedByteBudget) {
		let e = Math.sqrt(t.decodedByteBudget / Math.max(1, d));
		for (let t of n.values()) {
			let n = a(t, 1);
			e = Math.min(e, Math.sqrt(m / (n.width * n.height)));
		}
		let r = /* @__PURE__ */ new Map(), i = Math.floor(t.decodedByteBudget / 4), s = 0;
		for (let [t, c] of n) {
			let n = a(c, 1), l = n.width * n.height, u = Math.max(l, Math.floor(l * e * e)), d = Math.max(1, Math.min(u, Math.floor(i / c.surfaces))), f = Math.min(2, Math.sqrt(d / l));
			r.set(t, o(c, f, d));
			let p = d * c.surfaces;
			i -= p, s += p * 4;
		}
		return Object.freeze({
			targets: r,
			idealBytes: d,
			plannedBytes: s,
			qualityScale: 1,
			degraded: !1
		});
	}
	if (t.strategy === "strict" && d > t.decodedByteBudget) throw new g("active-decoded-bytes", t.decodedByteBudget, d);
	if (t.strategy === "adaptive") {
		let e = C(n, (e) => a(e, 0));
		if (e > t.decodedByteBudget) throw new g("active-decoded-bytes", t.decodedByteBudget, e);
	}
	let f = 1;
	if (t.strategy === "adaptive" && d > t.decodedByteBudget) {
		let e = 0, r = 1;
		for (let i = 0; i < 40; i++) {
			let i = (e + r) / 2;
			C(n, (e) => a(e, i)) <= t.decodedByteBudget ? e = i : r = i;
		}
		f = e;
	}
	let p = /* @__PURE__ */ new Map();
	for (let [e, t] of n) p.set(e, o(t, f));
	let h = C(n, (e) => a(e, f)), _ = f < 1 && n.size > 0 ? Math.min(...[...n.entries()].flatMap(([e, t]) => {
		let n = p.get(e);
		return [n.width / t.targetWidth, n.height / t.targetHeight];
	})) : f;
	return Object.freeze({
		targets: p,
		idealBytes: d,
		plannedBytes: h,
		qualityScale: _,
		degraded: f < 1
	});
}
function w(e) {
	return typeof e == "number" && Number.isFinite(e) && e > 0 ? Math.ceil(e) : void 0;
}
function T(e, t) {
	if (!Number.isFinite(e) || !Number.isFinite(t) || !(e > 0) || !(t > 0)) throw Error(`invalid SVG raster size: ${e}x${t}`);
	let n = Math.sqrt(m) / Math.sqrt(e) / Math.sqrt(t), r = Math.min(1, f / e, f / t, n);
	return {
		width: Math.min(f, Math.max(1, Math.floor(e * r))),
		height: Math.min(f, Math.max(1, Math.floor(t * r)))
	};
}
function de(e, t, n, r) {
	let i = n === void 0 ? 0 : n / e, a = r === void 0 ? 0 : r / t, o = n === void 0 && r === void 0 ? 1 : Math.max(i, a), s = Math.min(f / e, f / t, Math.sqrt(m) / Math.sqrt(e) / Math.sqrt(t));
	if (!Number.isFinite(o) || !(o > 0) || !Number.isFinite(s) || !(s > 0)) throw Error(`invalid SVG raster scale: ${Math.min(o, s)}`);
	return s < o ? T(Math.max(1, Math.floor(e * s)), Math.max(1, Math.floor(t * s))) : n !== void 0 && i >= a ? T(n, Math.max(1, Math.ceil(t * n / e))) : r === void 0 ? T(Math.ceil(e), Math.ceil(t)) : T(Math.max(1, Math.ceil(e * r / t)), r);
}
function fe(e, t, n) {
	let r = w(n.targetWidthPx), i = w(n.targetHeightPx);
	if (r === void 0 && i === void 0 || !(e > 0) || !(t > 0) || !(r === void 0 || e > r) || !(i === void 0 || t > i)) return;
	let a = de(e, t, r, i);
	throw new g("image-pixels", a.width * a.height, e * t);
}
async function pe(e, t = {}) {
	if (typeof Image > "u") throw Error("SVG host decode requires HTMLImageElement");
	let n = URL.createObjectURL(e);
	try {
		let e = new Image(), r = w(t.targetWidthPx), i = w(t.targetHeightPx);
		await new Promise((t, r) => {
			e.onload = () => {
				typeof e.decode == "function" ? e.decode().then(t).catch(t) : t();
			}, e.onerror = () => r(/* @__PURE__ */ Error("SVG host decode failed")), e.src = n;
		});
		let a = Number.isFinite(e.naturalWidth) && e.naturalWidth > 0 && Number.isFinite(e.naturalHeight) && e.naturalHeight > 0, o = de(a ? e.naturalWidth : 300, a ? e.naturalHeight : 150, r, i);
		e.width = o.width, e.height = o.height;
		let s;
		if (typeof OffscreenCanvas < "u") {
			let t = new OffscreenCanvas(o.width, o.height), n = t.getContext("2d");
			if (!n) throw Error("SVG host raster target has no 2-D context");
			n.drawImage(e, 0, 0, o.width, o.height), s = t.transferToImageBitmap();
		} else {
			let t = document.createElement("canvas");
			t.width = o.width, t.height = o.height;
			let n = t.getContext("2d");
			if (!n) throw Error("SVG host raster target has no 2-D context");
			n.drawImage(e, 0, 0, o.width, o.height), s = await createImageBitmap(t);
		}
		let c = s.width * s.height;
		if (s.width > 32767 || s.height > 32767 || c > 33554432) throw _(s), new g("image-pixels", m, c);
		return s;
	} finally {
		URL.revokeObjectURL(n);
	}
}
function me(e) {
	return typeof e == "object" && !!e || typeof e == "function";
}
var he = 256, E = /* @__PURE__ */ new WeakMap(), D = /* @__PURE__ */ new WeakMap(), ge = /* @__PURE__ */ new WeakMap(), _e = /* @__PURE__ */ new WeakMap();
function O(e) {
	return ge.get(e) ?? 0;
}
function ve(e, t) {
	return _e.get(e)?.get(t) ?? 0;
}
function k(e, t) {
	if (O(e) !== t) throw Error("Decoded bitmap cache was dropped during raster inspection");
}
function ye(e, t) {
	return {
		owner: e,
		ownerGeneration: O(e),
		namespace: t,
		namespaceGeneration: ve(e, t)
	};
}
function A(e, t) {
	if (t.owner !== e || O(e) !== t.ownerGeneration) throw Error("Decoded bitmap cache was dropped during a derived image operation");
}
function j(e, t, n) {
	if (A(e, n), n.namespace !== t || ve(e, t) !== n.namespaceGeneration) throw Error("Decoded bitmap cache namespace was dropped during a derived image operation");
}
function be(e) {
	let t = D.get(e);
	if (t) for (let e of t.values()) e.then((e) => {
		e.initialBlob = void 0;
	}).catch(() => {});
}
function M(e, t, n, r) {
	let i = D.get(e);
	i || (i = /* @__PURE__ */ new Map(), D.set(e, i));
	let a = i.get(t);
	if (a) return a;
	let o = b(e, async () => {
		let e = await r(t, n);
		return {
			inspection: await te(e),
			initialBlob: e
		};
	}).catch((e) => {
		throw i?.delete(t), e;
	});
	return i.set(t, o), o;
}
async function xe(e, t, n, r = n) {
	return (await M(r, e, t, n)).inspection;
}
function N(e) {
	let t = E.get(e);
	return t || (t = {
		entries: /* @__PURE__ */ new Map(),
		retainedBytes: 0,
		retainedLimit: d
	}, E.set(e, t)), t;
}
var P = /* @__PURE__ */ new WeakMap(), F = /* @__PURE__ */ new WeakMap();
async function Se(e, t, n) {
	let r = F.get(e);
	if (!r) {
		let i;
		r = {
			tail: new Promise((e) => {
				i = e;
			}),
			pending: 1
		}, F.set(e, r);
		let a;
		try {
			return a = R(e, t), await n();
		} finally {
			be(e), a?.(), i(), r.pending--, r.pending === 0 && F.delete(e);
		}
	}
	let i = r, a = i.tail.catch(() => {}), o, s = new Promise((e) => {
		o = e;
	});
	i.pending++, i.tail = a.then(() => s), await a;
	let c;
	try {
		return c = R(e, t), await n();
	} finally {
		be(e), c?.(), o(), i.pending--, i.pending === 0 && F.delete(e);
	}
}
var I = /* @__PURE__ */ new WeakSet();
function L(e) {
	!e || I.has(e) || (I.add(e), _(e));
}
function Ce(e) {
	try {
		L(e);
	} catch {}
}
function we(e) {
	return R(e, { decodedByteBudget: N(e).retainedLimit });
}
function R(e, t) {
	let n = x(t), r = P.get(e);
	r || (r = {
		count: 0,
		deferred: [],
		activeBytes: 0,
		activeBitmaps: /* @__PURE__ */ new WeakSet(),
		limits: /* @__PURE__ */ new Map(),
		activeLimit: n.decodedByteBudget
	}, P.set(e, r));
	let i = r, a = Symbol("decoded-image-lease");
	i.limits.set(a, n.decodedByteBudget), i.activeLimit = Math.min(...i.limits.values());
	let o = N(e);
	for (o.retainedLimit = i.activeLimit; o.retainedBytes > o.retainedLimit && z(e, o););
	i.count++;
	let s = !1;
	return () => {
		if (s) return;
		if (s = !0, i.count--, i.limits.delete(a), i.count > 0) {
			i.activeLimit = Math.min(...i.limits.values());
			let t = E.get(e);
			t && (t.retainedLimit = i.activeLimit);
			return;
		}
		for (let e of i.deferred) e.then((e) => L(e)).catch(() => {});
		i.deferred = [], i.activeBytes = 0, i.activeBitmaps = /* @__PURE__ */ new WeakSet(), P.delete(e);
		let t = E.get(e);
		t && (t.retainedLimit = d);
	};
}
function Te(e) {
	if (!e) return 0;
	let t = Number(e.width), n = Number(e.height);
	return Number.isSafeInteger(t) && t > 0 && Number.isSafeInteger(n) && n > 0 ? t * n * 4 : 0;
}
function Ee(e, t) {
	if (!t) return;
	let n = P.get(e);
	if (!n || n.count === 0 || n.activeBitmaps.has(t)) return;
	let r = n.activeBytes + Te(t);
	if (r > n.activeLimit) throw new g("active-decoded-bytes", n.activeLimit, r);
	n.activeBitmaps.add(t), n.activeBytes = r;
}
function z(e, t, n) {
	let r = [...t.entries].find(([e]) => e !== n);
	if (!r) return !1;
	let [i, a] = r;
	return t.entries.delete(i), t.retainedBytes -= a.weight, B(e, a.ownedPromise), !0;
}
function B(e, t) {
	let n = P.get(e);
	if (n && n.count > 0) {
		n.deferred.push(t);
		return;
	}
	t.then((e) => L(e)).catch(() => {});
}
var V = /* @__PURE__ */ new WeakMap();
function De(e, t) {
	if (!t?.families.size) {
		V.delete(e);
		return;
	}
	let n = [...t.families].sort(([e], [t]) => e < t ? -1 : +(e > t));
	V.set(e, {
		families: t.families,
		key: `:f${t.faces.length}${JSON.stringify(n)}`
	});
}
var H = /* @__PURE__ */ new WeakMap();
function Oe(e, t) {
	t ? H.get(e)?.demand !== t && H.set(e, {
		demand: t,
		runs: /* @__PURE__ */ new Map(),
		generation: O(e)
	}) : H.delete(e);
}
function U(e, t) {
	if (e.metafileFonts) return e;
	let n = V.get(t);
	return n ? {
		...e,
		metafileFonts: n
	} : e;
}
function W(e) {
	if (!(typeof e != "number" || !Number.isFinite(e) || !(e > 0))) return Math.ceil(e);
}
function G(e) {
	return {
		...e,
		targetWidthPx: W(e.targetWidthPx),
		targetHeightPx: W(e.targetHeightPx)
	};
}
function K(e) {
	let t = e.maxRetainedPixels;
	return typeof t == "number" && Number.isSafeInteger(t) && t > 0 ? Math.min(t, d / 4) : d / 4;
}
function ke(e) {
	return K(e) < d / 4;
}
function q(e, t) {
	if (!e) return null;
	let n = K(t), r = Number(e.width), i = Number(e.height), a = Math.max(r, i);
	if (!Number.isFinite(a) || a > 32767) throw new g("image-dimension", f, Number.isFinite(a) ? a : 2 ** 53 - 1);
	let o = r * i;
	if (!(r > 0) || !(i > 0) || o > n) throw new g("image-pixels", n, Number.isSafeInteger(o) && o >= 0 ? o : 2 ** 53 - 1);
	return e;
}
function J(e, t = {}) {
	let n = W(t.targetWidthPx), r = W(t.targetHeightPx), i = `${e.length}:${e}`, a = K(t);
	return n || r ? `raster:${i}:${n ?? 0}x${r ?? 0}:p${a}` : `native:${i}`;
}
function Ae(e) {
	return e.inspection.format === "wmf" || e.inspection.format === "emf";
}
function je(t) {
	let n = e(t.widthPt ?? 0, t.heightPt ?? 0);
	return {
		width: n.w,
		height: n.h,
		pixelLimit: K(t),
		rejectIncomplete: t.incompleteMetafile === "reject",
		fonts: t.metafileFonts?.key ?? ""
	};
}
function Me(e, t) {
	let n = `${e.length}:${e}`, r = t.rejectIncomplete ? "r1:" : "", i = t.fonts ? `${t.fonts}:` : "";
	return `metafile:${n}:p${t.pixelLimit}:${r}${i}`;
}
function Y(e, t, n) {
	let r = je(t), i = W(n?.width) ?? r.width, a = W(n?.height) ?? r.height;
	return `${Me(e, r)}${i}x${a}`;
}
function Ne(e, t, n) {
	let r = je(n), i = `${Z}${Me(t, r)}`, a;
	for (let t of E.get(e)?.entries.keys() ?? []) {
		if (!t.startsWith(i)) continue;
		let e = /^(\d+)x(\d+)$/.exec(t.slice(i.length));
		if (!e) continue;
		let n = Number(e[1]), o = Number(e[2]);
		if (n < r.width || o < r.height) continue;
		let s = n * o;
		(!a || s < a.pixels) && (a = {
			key: t.slice(Z.length),
			pixels: s
		});
	}
	return a?.key;
}
function Pe(e, t, n, r) {
	let i = W(n.targetWidthPx), a = W(n.targetHeightPx);
	if (!i && !a) return;
	let o = K(n), s = `${Z}raster:${`${t.length}:${t}`}:`, c;
	for (let [t, n] of E.get(e)?.entries ?? []) {
		if (!t.startsWith(s)) continue;
		let e = /^(\d+)x(\d+):p(\d+)$/.exec(t.slice(s.length));
		if (!e) continue;
		let l = Number(e[1]), u = Number(e[2]);
		if (Number(e[3]) !== o || l < (i ?? 0) || u < (a ?? 0)) continue;
		let d = Number(n.bitmap?.width), f = Number(n.bitmap?.height), p = Number.isFinite(d) && d > 0 && Number.isFinite(f) && f > 0, m = r ? ae(r, l, u) ?? r : void 0, h = p ? d * f : m ? m.width * m.height : l * u;
		(!c || h < c.pixels) && (c = {
			key: t.slice(Z.length),
			pixels: h
		});
	}
	return c?.key;
}
function Fe(e, t = {}) {
	let n = K(t), r = e.inspection.dimensions;
	if (!r) return !1;
	let i = r.width * r.height;
	if (t.maxRetainedPixels !== void 0 && !ie(r) && i <= n) return !1;
	let a = W(t.targetWidthPx), o = W(t.targetHeightPx);
	return (e.inspection.format === "tiff" ? (a !== void 0 || o !== void 0) && (a === void 0 || a < r.width) && (o === void 0 || o < r.height) : a !== void 0 && o !== void 0 && (a < r.width || o < r.height)) || ie(r) || i > n;
}
async function Ie(e, t, n, r = {}, i, a) {
	i && A(n, i);
	let o = U(G(r), n), s = i?.ownerGeneration ?? O(n), c = await M(n, e, t, n);
	i ? A(n, i) : k(n, s);
	let l = Ae(c);
	if (a) return l ? Y(e, o, {
		width: Number(a.width),
		height: Number(a.height)
	}) : J(e, {
		targetWidthPx: Number(a.width),
		targetHeightPx: Number(a.height),
		maxRetainedPixels: o.maxRetainedPixels
	});
	if (l) return Ne(n, e, o) ?? Y(e, o);
	if (!o.targetWidthPx && !o.targetHeightPx) return J(e);
	let u = `${Z}${J(e)}`;
	return !ke(o) && E.get(n)?.entries.has(u) ? J(e) : Fe(c, o) ? Pe(n, e, o, c.inspection.dimensions) ?? J(e, o) : J(e);
}
function Le(e, t, n, r) {
	let i = N(t), a = i.entries, o = a.get(e);
	if (o) return a.delete(e), a.set(e, o), o.promise.then((e) => (Ee(t, e), e));
	let s = r ? Promise.resolve().then(r).then(() => b(t, n)) : b(t, n), c = s.then(({ bitmap: e, owned: t }) => t ? e : null).catch(() => null), l = s.then(({ bitmap: e, owned: n }) => {
		try {
			return Ee(t, e), e;
		} catch (t) {
			throw n && L(e), t;
		}
	}), u = {
		promise: l,
		ownedPromise: c,
		weight: 0
	};
	for (s.then(({ bitmap: n, owned: r }) => {
		if (a.get(e) === u) {
			if (u.bitmap = n, !r) {
				a.delete(e);
				return;
			}
			for (u.weight = Te(n), i.retainedBytes += u.weight; i.retainedBytes > i.retainedLimit && z(t, i, e););
		}
	}).catch(() => {}), l.catch(() => {
		a.get(e) === u && (a.delete(e), i.retainedBytes -= u.weight, B(t, c));
	}), a.set(e, u); a.size > he && z(t, i, e););
	return l;
}
var X = "base", Z = `${X}:`, Re = "derived:";
function ze(e, t, n, r) {
	return Le(`${e}:${t}`, n, r);
}
function Be(e, t, n, r, i, a) {
	return i && j(n, e, i), Le(`${Re}${e}:${t}`, n, () => (i && j(n, e, i), r()), a ? async () => {
		i && j(n, e, i), await a(), i && j(n, e, i);
	} : void 0);
}
function Q(e, t, n, r = {}, i = n) {
	let a = U(G(r), i), { widthPt: o = 0, heightPt: s = 0, tiff: c, targetWidthPx: l, targetHeightPx: u, maxRetainedPixels: d, svgDecoder: f, incompleteMetafile: p } = a;
	if (t === "image/svg+xml" && f) return ze(X, J(e, a), i, async () => {
		let r = await f(await n(e, t), {
			targetWidthPx: l,
			targetHeightPx: u
		});
		try {
			q(r, a), r && fe(r.width, r.height, {
				targetWidthPx: l,
				targetHeightPx: u
			});
		} catch (e) {
			throw L(r), e;
		}
		return {
			bitmap: r,
			owned: !0
		};
	}).then((e) => q(e, a));
	let m = (r, f, m = !0, h = a) => {
		let g = f?.initialBlob;
		return f && (f.initialBlob = void 0), ze(X, r, i, async () => {
			let r = g ?? await n(e, t), i = {
				widthPt: o,
				heightPt: s,
				tiff: c,
				targetWidthPx: m ? l : void 0,
				targetHeightPx: m ? u : void 0,
				maxRetainedPixels: d,
				incompleteMetafile: p,
				...h.metafileFonts ? { metafileFontFamilies: h.metafileFonts.families } : {}
			};
			return {
				bitmap: f ? await ee(r, i, f.inspection) : await re(r, i),
				owned: !0
			};
		}).then((e) => q(e, h));
	}, h = O(i);
	return M(i, e, t, n).then((o) => {
		if (k(i, h), Ae(o)) {
			let s = (t) => m(Ne(i, e, t) ?? Y(e, t), o, !0, t), c = r.metafileFonts ? void 0 : H.get(i);
			if (!c) return s(a);
			c.generation !== h && (c.runs.clear(), c.generation = h);
			let l = c.runs.get(e);
			return l || (l = b(i, async () => {
				let r = o.initialBlob ?? await n(e, t);
				return { loading: c.demand(new Uint8Array(await r.arrayBuffer())) };
			}).then(({ loading: e }) => e).then((e) => {
				O(i) === h && H.get(i) === c && De(i, e);
			}, () => void 0), c.runs.set(e, l)), l.then(() => (k(i, h), s(U(G(r), i))));
		}
		if (!l && !u) return m(J(e), o, !1);
		let s = `${Z}${J(e)}`;
		if (!ke(a) && E.get(i)?.entries.has(s)) return m(J(e), o, !1);
		let c = Fe(o, a);
		return m(c ? Pe(i, e, a, o.inspection.dimensions) ?? J(e, a) : J(e), o, c);
	});
}
function Ve(e, t) {
	return E.get(t)?.entries.get(`${Z}${J(e)}`)?.bitmap;
}
function He(e) {
	if (!me(e)) return;
	ge.set(e, O(e) + 1), _e.delete(e), D.delete(e);
	let t = E.get(e);
	if (t) {
		for (let n of t.entries.values()) B(e, n.ownedPromise);
		t.entries.clear(), t.retainedBytes = 0, E.delete(e);
	}
}
var $ = /* @__PURE__ */ new WeakMap(), Ue = 256;
function We(e) {
	let t = $.get(e);
	return t || (t = { imgs: /* @__PURE__ */ new Map() }, $.set(e, t)), t;
}
function Ge(e, t, n = {}) {
	if (typeof Image > "u") return Q(e, "image/svg+xml", t, {
		targetWidthPx: n.targetWidthPx,
		targetHeightPx: n.targetHeightPx,
		maxRetainedPixels: n.maxRetainedPixels,
		svgDecoder: n.workerDecoder
	}).then((t) => {
		if (!t) throw Error(`svg decode failed: ${e}`);
		return t;
	});
	let r = We(t), i = r.imgs.get(e);
	if (i) return r.imgs.delete(e), r.imgs.set(e, i), i.promise;
	let a = {};
	if (a.promise = b(t, async () => {
		if (r.imgs.get(e) !== a) throw Error("SVG decode was superseded before it started");
		let n = await t(e, "image/svg+xml"), i = URL.createObjectURL(n);
		try {
			let t = new Image();
			return await new Promise((n, r) => {
				t.onload = () => {
					typeof t.decode == "function" ? t.decode().then(n).catch(n) : n();
				}, t.onerror = () => r(/* @__PURE__ */ Error(`svg load failed: ${e}`)), t.src = i;
			}), t;
		} finally {
			URL.revokeObjectURL(i);
		}
	}), a.promise.catch(() => {
		r.imgs.get(e) === a && r.imgs.delete(e);
	}), r.imgs.set(e, a), r.imgs.size > Ue) {
		let e = r.imgs.keys().next().value;
		r.imgs.delete(e);
	}
	return a.promise;
}
function Ke(e) {
	let t = $.get(e);
	t && (t.imgs.clear(), $.delete(e));
}
function qe(e) {
	return e.svgImagePath != null && e.srcRect == null;
}
var Je = "duotone";
async function Ye(e, n, r, i, a = {}) {
	try {
		let { offscreenFactory: o, failClosedOnDuotoneFailure: s = !1, ...c } = a, u = r ? {
			...c,
			maxRetainedPixels: Math.min(c.maxRetainedPixels ?? 33554432, p)
		} : c, d = r && n !== "image/svg+xml" ? {
			...u,
			targetWidthPx: void 0,
			targetHeightPx: void 0
		} : u;
		r?.preflight(0);
		let f = r ? ye(i, Je) : void 0, m = await Q(e, n, i, d);
		if (!r || !m) return m;
		r.preflight(m.width * m.height, m.width, m.height);
		let h = await Ie(e, n, i, d, f, m), g = oe(Number(m.width), Number(m.height), c.targetWidthPx, c.targetHeightPx), _ = g ? `|resize:${g.resizeWidth}x${g.resizeHeight}` : "";
		return await Be(Je, JSON.stringify([
			h,
			r.key,
			_,
			s
		]), i, async () => {
			let { w: e, h: n } = l(m);
			if (e <= 0 || n <= 0) {
				if (r.strict) throw new t("unsupported-image-effect", "Invalid image effect source dimensions");
				return {
					bitmap: s ? null : m,
					owned: !1
				};
			}
			let i = {
				width: e,
				height: n,
				offscreenFactory: o,
				targetWidthPx: c.targetWidthPx,
				targetHeightPx: c.targetHeightPx,
				releaseReadbackSurface: r.strict,
				strict: r.strict
			}, a = await r.apply(m, i);
			if (a === m) {
				if (r.strict) throw new t("unsupported-image-effect", "Image effects unavailable");
				if (s) return {
					bitmap: null,
					owned: !1
				};
				if (!g) return {
					bitmap: m,
					owned: !1
				};
				if (typeof createImageBitmap > "u") throw Error("createImageBitmap is unavailable for duotone fallback resampling");
				let e = await createImageBitmap(m, g);
				return ne(m, e), {
					bitmap: e,
					owned: e !== m
				};
			}
			let u = a;
			return ne(m, u), {
				bitmap: u,
				owned: u !== m
			};
		}, f, r.prepare ? () => r.prepare(m) : void 0);
	} catch (e) {
		throw r?.strict ? v(e) : e;
	}
}
function Xe(e, t) {
	return t ? `${e}|duo:${t.clr1}:${t.clr2}` : e;
}
function Ze(e, t, n, r, i = {}) {
	return Ye(e, t, n ? {
		key: `duo:${n.clr1}:${n.clr2}`,
		strict: !1,
		preflight() {},
		apply: (e, t) => ce(e, n, t)
	} : void 0, r, i);
}
function Qe(e, t) {
	return r(t) ? `${e}|fx:${c(t)}` : Xe(e, t);
}
async function $e(e, t, a, s, c = {}) {
	if (!r(a)) return Ze(e, t, a, s, c);
	try {
		o(a, 0);
		let r = i(a.effects).length ? we(s) : void 0;
		return await et(e, t, a, s, c, {
			work: 0,
			execution: new n()
		}).finally(() => r?.());
	} catch (e) {
		throw v(e);
	}
}
async function et(e, n, r, l, d, f) {
	if (![d.widthPt ?? 0, d.heightPt ?? 0].every((e) => Number.isFinite(e) && e >= 0)) throw new t("unsupported-image-effect", "Invalid physical image effect dimensions");
	let p = (e, n) => {
		let i = {
			...r,
			emuPerPixelX: d.widthPt && e ? d.widthPt * 12700 / e : r.emuPerPixelX,
			emuPerPixelY: d.heightPt && n ? d.heightPt * 12700 / n : r.emuPerPixelY
		};
		if (![i.emuPerPixelX ?? 9525, i.emuPerPixelY ?? 9525].every((e) => Number.isFinite(e) && e > 0)) throw new t("unsupported-image-effect", "Unrepresentable physical image effect sampling");
		return i;
	}, m = /* @__PURE__ */ new Map();
	return Ye(e, n, {
		key: `fx:${c(r)}|physical:${JSON.stringify([d.widthPt ?? 0, d.heightPt ?? 0])}`,
		strict: !0,
		preflight: (e, t, n) => {
			o(p(t, n), e, t && n ? {
				width: t,
				height: n
			} : void 0);
		},
		prepare: async (e) => {
			let n = p(e.width, e.height);
			for (let r of i(n.effects)) {
				let i = !r.blipEffects?.length && qe(r), a = i ? r.svgImagePath : r.imagePath, o = i ? "image/svg+xml" : r.mimeType, s = {
					...n,
					effects: r.blipEffects ?? [],
					duotone: r.duotone,
					hostRotation: r.rotWithShape === !1 ? 0 : n.hostRotation
				}, c = {
					...d,
					targetWidthPx: void 0,
					targetHeightPx: void 0,
					widthPt: 0,
					heightPt: 0
				};
				if (r.tile) s.emuPerPixelX = s.emuPerPixelY = 914400 / (r.dpi || 96);
				else {
					let t = r.srcRect, i = r.fillRect, a = 1 - (t?.l ?? 0) - (t?.r ?? 0), o = 1 - (t?.t ?? 0) - (t?.b ?? 0);
					c.widthPt = e.width * (n.emuPerPixelX ?? 9525) / 12700 * (1 - (i?.l ?? 0) - (i?.r ?? 0)) / (a > 0 ? a : 1), c.heightPt = e.height * (n.emuPerPixelY ?? 9525) / 12700 * (1 - (i?.t ?? 0) - (i?.b ?? 0)) / (o > 0 ? o : 1);
				}
				let u = r.blipEffects?.length || r.duotone ? await et(a, o, s, l, c, f) : await Ze(a, o, r.duotone, l, c);
				if (!u) throw new t("unsupported-image-effect", "Image fill decode unavailable");
				m.set(r, u);
			}
			let r = 0;
			for (let t of new Set(m.values())) {
				if (t === e) continue;
				let n = t;
				r += n.width * n.height;
			}
			if (o(n, e.width * e.height, e, r), f.work += a(n, e.width, e.height, { images: m }), f.work > 134217728) throw new g("image-effect-work", u, f.work);
		},
		apply: (e, t) => se(e, (t) => s(t, p(e.width, e.height), {
			offscreenFactory: d.offscreenFactory,
			images: m,
			baseImage: e,
			workLedger: f.execution
		}), t)
	}, l, d);
}
export { pe as _, Ge as a, ye as c, Be as d, xe as f, Se as g, Ie as h, Ke as i, He as l, Ce as m, $e as n, Oe as o, Ve as p, qe as r, De as s, Qe as t, Q as u, x as v, ue as y };
