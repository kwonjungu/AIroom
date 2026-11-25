import { n as e } from "./abort-JztSoyw2.js";
var t = "model source load was aborted", n = "ooxml-model-source-module/v2", r = new Set([
	"docx",
	"xlsx",
	"pptx"
]), i = new Set([
	"http:",
	"https:",
	"file:",
	"blob:"
]), a = [
	"protocol",
	"target",
	"moduleUrl",
	"config"
], o = 16, s = 8192, c = 32, l = 8192, u = 16, d = 32, f = /^[A-Za-z][A-Za-z0-9_]{0,63}$/;
function p(e, t, n) {
	if (e !== void 0) {
		if (!Array.isArray(e)) throw TypeError("model sources must be an array");
		if (e.length > o) throw RangeError(`model source selection accepts at most ${o} sources`);
		for (let r of e) {
			if (typeof r != "object" || !r) throw TypeError("each model source must be an object");
			let e = r;
			if (e.target !== t) throw TypeError(`a ${String(e.target)} model source cannot load ${t} input`);
			if (typeof e.claim != "function" || typeof e.beginLoad != "function") throw TypeError("a model source must implement claim() and beginLoad()");
			let i = e.claim(n);
			if (typeof i != "boolean") throw TypeError("model source claim() must return a boolean");
			if (i) return e;
		}
	}
}
function m(...e) {
	let t = e.filter((e) => e !== void 0);
	return t.length === 0 ? void 0 : t;
}
function h(e, t) {
	let n = e.beginLoad();
	if (typeof n != "object" || !n) throw TypeError("model source beginLoad() must return an object");
	let r = n, i = r.release;
	if (typeof i != "function") throw TypeError("model source load must provide release()");
	let a = !1, o = () => {
		a || (a = !0, i.call(n));
	};
	try {
		let e = _(r.module, t), n = r.transfer === void 0 ? [] : r.transfer;
		if (!Array.isArray(n)) throw TypeError("model source load transfer must be an array");
		if (n.length > d) throw RangeError(`model source load transfer accepts at most ${d} items`);
		let i = /* @__PURE__ */ new Set();
		for (let e of n) {
			if (!(e instanceof ArrayBuffer) && !(typeof MessagePort < "u" && e instanceof MessagePort) && !(typeof ImageBitmap < "u" && e instanceof ImageBitmap) && !(typeof OffscreenCanvas < "u" && e instanceof OffscreenCanvas)) throw TypeError("model source load transfer contains an unsupported item");
			if (i.has(e)) throw TypeError("model source load transfer contains a duplicate item");
			i.add(e);
		}
		return Object.freeze({
			module: e,
			transfer: Object.freeze([...n]),
			release: o
		});
	} catch (e) {
		try {
			o();
		} catch {}
		throw e;
	}
}
function g(e, t) {
	return new Proxy(e, { get(e, n) {
		if (n === "postMessage") return (n, r) => {
			if (typeof n == "object" && n) {
				let i = n, a = i[t.discriminator];
				if (a === "init") return;
				if (a === "parse") {
					e.postMessage(t.parseMessage(i), [...r ?? [], ...t.load.transfer]);
					return;
				}
			}
			e.postMessage(n, r ?? []);
		};
		let r = t.member?.(e, n);
		if (r !== void 0) return r;
		let i = Reflect.get(e, n, e);
		return typeof i == "function" ? i.bind(e) : i;
	} });
}
function _(e, t) {
	if (typeof e != "object" || !e || Array.isArray(e)) throw TypeError("model source module descriptor must be an object");
	let o = Reflect.ownKeys(e);
	if (o.length !== a.length || a.some((e) => !o.includes(e))) throw TypeError("model source module descriptor has unknown or missing fields");
	let c = Object.getOwnPropertyDescriptors(e);
	if (a.some((e) => !c[e]?.enumerable || !("value" in c[e]))) throw TypeError("model source module descriptor fields must be data properties");
	let l = c.protocol.value, u = c.target.value, d = c.moduleUrl.value;
	if (l !== "ooxml-model-source-module/v2") throw TypeError("unsupported model source module protocol");
	if (typeof u != "string" || !r.has(u)) throw TypeError("unsupported model source target");
	if (t !== void 0 && u !== t) throw TypeError(`a ${u} model source module cannot load ${t} input`);
	if (typeof d != "string" || d.length === 0 || d.length > s || d.trim() !== d) throw TypeError("model source moduleUrl must be a nonempty absolute URL");
	let f;
	try {
		f = new URL(d);
	} catch {
		throw TypeError("model source moduleUrl must be a nonempty absolute URL");
	}
	if (!i.has(f.protocol)) throw TypeError("model source moduleUrl protocol is unsupported");
	return Object.freeze({
		protocol: n,
		target: u,
		moduleUrl: d,
		config: v(c.config.value)
	});
}
function v(e) {
	if (!T(e)) throw TypeError("model source config must be a plain object");
	let t = Reflect.ownKeys(e);
	if (t.length > c) throw RangeError(`model source config accepts at most ${c} entries`);
	let n = {};
	for (let r of t) {
		if (typeof r != "string" || !f.test(r)) throw TypeError("model source config keys must be short identifiers");
		let t = Object.getOwnPropertyDescriptor(e, r);
		if (!t?.enumerable || !("value" in t)) throw TypeError("model source config entries must be data properties");
		let i = t.value;
		if (typeof i == "string") {
			if (i.length > l) throw RangeError("model source config string is too long");
		} else if (typeof i == "number") {
			if (!Number.isFinite(i)) throw TypeError("model source config numbers must be finite");
		} else if (typeof i != "boolean" && i !== null) throw TypeError("model source config values must be strings, numbers, booleans or null");
		n[r] = i;
	}
	return Object.freeze(n);
}
async function y(n, r, i, a, o = [], s) {
	let c = _(n);
	e(a, t);
	let l = await import(
		/* @vite-ignore */
		c.moduleUrl
), u = typeof l == "object" && l ? l.openModelSource : void 0;
	if (typeof u != "function") throw TypeError("model source module must export openModelSource()");
	e(a, t);
	let d = await u(r, c.config, a, o, s === void 0 ? void 0 : S(s));
	if (typeof d != "object" || !d) throw TypeError("openModelSource() must return an object");
	let f = d, p = f.close;
	if (typeof p != "function") throw TypeError("an opened model source must provide close()");
	let m = !1, h = () => {
		m || (m = !0, p.call(d));
	};
	try {
		let n = i(f.archive), r = C(f.viewDefaults);
		return e(a, t), Object.freeze({
			archive: n,
			viewDefaults: r,
			close: h
		});
	} catch (e) {
		try {
			h();
		} catch {}
		throw e;
	}
}
function b(e, t) {
	if (t && e === null) return null;
	if (typeof e != "number" || !Number.isSafeInteger(e) || e < 0) throw TypeError("model source context limits must be non-negative safe integers");
	return e;
}
function x(e) {
	let t = typeof e == "object" && e ? e : {};
	return Object.freeze({
		maxRows: b(t.maxRows, !1),
		maxCells: b(t.maxCells, !1),
		maxOwnedUtf8Bytes: b(t.maxOwnedUtf8Bytes, !1),
		maxJsonBytes: b(t.maxJsonBytes, !1)
	});
}
function S(e) {
	let t = e.resourcePolicy, n = Object.freeze({
		maxArchiveEntryBytes: b(t?.maxArchiveEntryBytes, !0),
		maxTotalInflatedBytes: b(t?.maxTotalInflatedBytes, !0),
		maxArchiveEntries: b(t?.maxArchiveEntries, !0)
	}), r = e.worksheetPolicy;
	return Object.freeze(r === void 0 ? { resourcePolicy: n } : {
		resourcePolicy: n,
		worksheetPolicy: Object.freeze({
			worksheet: x(r.worksheet),
			cache: x(r.cache),
			maxCoordinateIndexEntries: b(r.maxCoordinateIndexEntries, !1)
		})
	});
}
function C(e) {
	if (e === void 0) return Object.freeze({});
	if (!T(e)) throw TypeError("model source viewDefaults must be a plain object");
	let t = Reflect.ownKeys(e);
	if (t.length > u) throw RangeError("model source viewDefaults has too many entries");
	let n = {};
	for (let r of t) {
		let t = typeof r == "string" ? Object.getOwnPropertyDescriptor(e, r) : void 0;
		if (typeof r != "string" || !f.test(r) || !t?.enumerable || !("value" in t) || typeof t.value != "boolean") throw TypeError("model source viewDefaults entries must be boolean data properties");
		n[r] = t.value;
	}
	return Object.freeze(n);
}
function w(e, t, n) {
	if (typeof e != "object" && typeof e != "function" || e === null) throw TypeError(`${t} model source archive must be an object`);
	for (let r of n) if (typeof e[r] != "function") throw TypeError(`${t} model source archive must implement ${r}()`);
}
function T(e) {
	if (typeof e != "object" || !e || Array.isArray(e)) return !1;
	let t = Object.getPrototypeOf(e);
	return t === Object.prototype || t === null;
}
export { y as a, g as i, h as n, w as o, m as r, p as s, n as t };
