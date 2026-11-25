import { c as e } from "./substitute-script-COw3MRyd.js";
function t(e, t) {
	let n = Math.min(e.length, t);
	if (n > 0 && n < e.length) {
		let t = e.charCodeAt(n - 1), r = e.charCodeAt(n);
		t >= 55296 && t <= 56319 && r >= 56320 && r <= 57343 && n--;
	}
	return e.slice(0, n);
}
var n = Object.freeze({ state: "builtin" }), r = (e) => e === null ? "null" : typeof e;
function i(e, t = "errorPlaceholder") {
	if (e === void 0) return null;
	if (typeof e != "object" || !e || Array.isArray(e)) throw TypeError(`${t} must be an object with optional title/detail strings, got ${r(e)}`);
	let n = e, i = n.title, a = n.detail;
	if (i !== void 0 && typeof i != "string") throw TypeError(`${t}.title must be a string, got ${r(i)}`);
	if (a != null && typeof a != "string") throw TypeError(`${t}.detail must be a string or null, got ${r(a)}`);
	return i === void 0 && a === void 0 ? null : Object.freeze({
		title: i ?? null,
		detail: a === "" ? null : a
	});
}
var a = Object.freeze({ kind: "none" });
function o(e, t = "errorPlaceholder") {
	return e === void 0 ? a : Object.freeze(typeof e == "function" ? {
		kind: "function",
		resolve: e
	} : {
		kind: "static",
		text: i(e, t)
	});
}
function s(e, t, n = "errorPlaceholder") {
	return e.kind === "none" ? null : e.kind === "static" ? e.text : i(e.resolve(t), `${n}() result`);
}
function c(e) {
	return e === null ? n : Object.freeze({
		state: "resolved",
		title: e.title,
		detail: e.detail
	});
}
var l = 1024, u = "…", d = 3;
function f(e) {
	let t = 0;
	for (let n = 0; n < e.length; n += 1) {
		let r = e.charCodeAt(n);
		if (r < 128) t += 1;
		else if (r < 2048) t += 2;
		else if (r >= 55296 && r <= 56319 && n + 1 < e.length) {
			let r = e.charCodeAt(n + 1);
			r >= 56320 && r <= 57343 ? (t += 4, n += 1) : t += 3;
		} else t += 3;
	}
	return t;
}
function p(n, r = l) {
	let i = t(n, r + 1);
	if (i.length === n.length && f(n) <= r) return n;
	let a = r - d, o = e(i), s = 0, c = 0, p = 0;
	for (let e of o) {
		if (e >= i.length || (p += f(i.slice(c, e)), p > a)) break;
		s = e, c = e;
	}
	return `${i.slice(0, s)}${u}`;
}
var m = class {
	keyOf;
	compare;
	#e = /* @__PURE__ */ new Map();
	#t = /* @__PURE__ */ new Set();
	#n = 0;
	#r = null;
	#i = !1;
	constructor(e, t) {
		this.keyOf = e, this.compare = t;
	}
	get size() {
		return this.#e.size;
	}
	has(e) {
		return this.#e.has(e);
	}
	get(e) {
		return this.#e.get(e);
	}
	get list() {
		return this.#r === null && (this.#r = Object.freeze([...this.#e.values()].sort(this.compare))), this.#r;
	}
	add(e) {
		if (this.#i) return;
		let t = this.keyOf(e);
		if (this.#e.has(t)) return;
		let n = p(String(e.message)), r = f(n);
		this.#n + r > 1048576 ? n = "" : this.#n += r;
		let i = Object.freeze({
			...e,
			message: n
		});
		this.#e.set(t, i), this.#r = null;
		for (let e of [...this.#t]) try {
			e(i);
		} catch (e) {
			console.error("[ooxml] part failure listener failed:", e);
		}
		return i;
	}
	subscribe(e) {
		return this.#i ? () => {} : (this.#t.add(e), () => {
			this.#t.delete(e);
		});
	}
	close() {
		this.#i = !0, this.#t.clear(), this.#e.clear(), this.#r = Object.freeze([]), this.#n = 0;
	}
}, h = /* @__PURE__ */ new WeakMap();
function g(e, t) {
	let n = h.get(e);
	return n || (n = t(), h.set(e, n)), n;
}
var _ = /* @__PURE__ */ Object.freeze({
	clampPartFailureMessage: p,
	graphemeClusterOffsets: e
});
function v(e) {
	let t, n;
	return {
		get loaded() {
			return t;
		},
		load: () => n ??= e().then((e) => t = e, (e) => {
			throw n = void 0, e;
		})
	};
}
var y = class {
	viewerName;
	callback;
	keyOf;
	#e = 0;
	#t = null;
	#n = !1;
	#r = !1;
	#i = 0;
	#a = [];
	#o = /* @__PURE__ */ new WeakMap();
	constructor(e, t, n) {
		this.viewerName = e, this.callback = t, this.keyOf = n;
	}
	attach(e) {
		if (this.#n) return;
		let t = ++this.#e;
		if (this.#t?.(), this.#t = null, !(!e || !this.callback)) {
			this.#t = e.subscribe((n) => {
				this.#s(t, e, n);
			});
			for (let n of e.list) this.#s(t, e, n);
		}
	}
	beginLoad() {
		return this.attach(null), ++this.#i;
	}
	endLoad(e, t) {
		this.#n || e !== this.#i || this.attach(t);
	}
	close() {
		this.#n || (this.#n = !0, this.#e++, this.#t?.(), this.#t = null, this.#a.length = 0);
	}
	#s(e, t, n) {
		if (!(this.#n || e !== this.#e) && (this.#a.push({
			generation: e,
			log: t,
			key: this.keyOf(n),
			failure: n
		}), !this.#r)) {
			this.#r = !0;
			try {
				for (; this.#a.length > 0;) {
					let e = this.#a.shift();
					if (this.#n || e.generation !== this.#e) continue;
					let t = this.#o.get(e.log);
					if (t || (t = /* @__PURE__ */ new Set(), this.#o.set(e.log, t)), t.has(e.key)) continue;
					t.add(e.key);
					let n = (e) => {
						console.error(`[ooxml] ${this.viewerName} onPartFailure callback failed:`, e);
					};
					try {
						let t = this.callback(e.failure);
						t && typeof t.then == "function" && Promise.resolve(t).catch(n);
					} catch (e) {
						n(e);
					}
				}
			} finally {
				this.#r = !1;
			}
		}
	}
};
export { v as a, s as c, p as i, c as l, y as n, g as o, m as r, o as s, _ as t, t as u };
