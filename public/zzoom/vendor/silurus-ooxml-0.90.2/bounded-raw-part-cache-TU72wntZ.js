function e(e, t) {
	if (!Number.isSafeInteger(e) || e <= 0) throw TypeError(`${t} must be a positive safe integer`);
}
function t(e) {
	if (!Number.isSafeInteger(e) || e < 0) throw TypeError("cache entry weight must be a non-negative safe integer");
}
var n = class {
	#e;
	#t;
	#n;
	#r;
	#i = /* @__PURE__ */ new Map();
	#a = /* @__PURE__ */ new Map();
	#o = 0;
	constructor(t) {
		e(t.maxEntries, "maxEntries"), e(t.maxWeight, "maxWeight"), this.#e = t.maxEntries, this.#t = t.maxWeight, this.#n = t.measure, this.#r = t.onRemove;
	}
	get usage() {
		return {
			entries: this.#i.size,
			weight: this.#o,
			pending: this.#a.size
		};
	}
	has(e) {
		return this.#i.has(e);
	}
	get(e) {
		let t = this.#i.get(e);
		if (t !== void 0) return this.#i.delete(e), this.#i.set(e, t), t.value;
	}
	getOrLoad(e, t) {
		let n = this.get(e);
		if (n !== void 0 || this.#i.has(e)) return Promise.resolve(n);
		let r = this.#a.get(e);
		if (r !== void 0) return r.promise;
		let i = {}, a = Promise.resolve().then(t).then((t) => this.#c(e, i, t), (t) => {
			throw this.#s(e, i), t;
		});
		return this.#a.set(e, {
			token: i,
			promise: a
		}), a;
	}
	delete(e) {
		let t = this.#a.delete(e), n = this.#i.get(e);
		return n === void 0 ? t : (this.#i.delete(e), this.#o -= n.weight, this.#l(n.value, e, "deleted"), !0);
	}
	clear() {
		this.#a.clear();
		let e = [...this.#i];
		this.#i.clear(), this.#o = 0;
		for (let [t, n] of e) this.#l(n.value, t, "cleared");
	}
	#s(e, t) {
		this.#a.get(e)?.token === t && this.#a.delete(e);
	}
	#c(e, n, r) {
		if (this.#a.get(e)?.token !== n) return r;
		let i;
		try {
			i = this.#n(r), t(i);
		} catch (t) {
			throw this.#s(e, n), t;
		}
		if (this.#a.get(e)?.token !== n || (this.#a.delete(e), i > this.#t)) return r;
		let a = [];
		for (; this.#i.size >= this.#e || i > this.#t - this.#o;) {
			let e = this.#i.entries().next().value;
			if (e === void 0) break;
			let [t, n] = e;
			this.#i.delete(t), this.#o -= n.weight, a.push([t, n]);
		}
		this.#i.set(e, {
			value: r,
			weight: i
		}), this.#o += i;
		for (let [e, t] of a) this.#l(t.value, e, "evicted");
		return r;
	}
	#l(e, t, n) {
		try {
			this.#r?.(e, t, n);
		} catch {}
	}
}, r = class {
	#e;
	constructor(e) {
		this.#e = new n({
			maxEntries: e.maxEntries,
			maxWeight: e.maxBytes,
			measure: (e) => e.size
		});
	}
	get usage() {
		let e = this.#e.usage;
		return {
			entries: e.entries,
			bytes: e.weight,
			pending: e.pending
		};
	}
	async get(e, t, n) {
		if (typeof e != "string" || e.length === 0) throw TypeError("raw package part path must be a non-empty string");
		if (typeof t != "string") throw TypeError("raw package part MIME type must be a string");
		let r = await this.#e.getOrLoad(e, async () => {
			let e = await n();
			if (!(e instanceof Blob)) throw TypeError("raw package part loader must return a Blob");
			return e;
		});
		return t === "" || r.type === t ? r : r.slice(0, r.size, t);
	}
	clear() {
		this.#e.clear();
	}
};
export { n, r as t };
