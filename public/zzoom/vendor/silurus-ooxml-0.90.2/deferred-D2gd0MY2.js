var e = class {
	state = Object.freeze({ status: "complete" });
	get complete() {
		return this.state.status === "complete";
	}
	get settled() {
		return this.state.status !== "pending";
	}
	begin() {
		this.state = Object.freeze({ status: "pending" });
	}
	succeed() {
		this.state = Object.freeze({ status: "complete" });
	}
	fail(e) {
		let t = e instanceof Error ? e : Error(String(e));
		return this.state = Object.freeze({
			status: "failed",
			error: t
		}), t;
	}
	throwIfFailed() {
		if (this.state.status === "failed") throw this.state.error;
	}
}, t = class {
	failed = /* @__PURE__ */ new WeakMap();
	notify(e, t, ...n) {
		if (!(!t || this.failed.get(t)?.has(e))) try {
			let r = t(...n);
			r && typeof r.then == "function" && Promise.resolve(r).catch((n) => this.reportOnce(e, t, n));
		} catch (n) {
			this.reportOnce(e, t, n);
		}
	}
	reportOnce(e, t, n) {
		let r = this.failed.get(t) ?? /* @__PURE__ */ new Set();
		if (r.has(e)) return;
		r.add(e), this.failed.has(t) || this.failed.set(t, r);
		let i = n instanceof Error ? n : Error(String(n));
		console.error(`[ooxml] ${e} callback failed and was disabled:`, i);
	}
};
function n() {
	let e, t;
	return {
		promise: new Promise((n, r) => {
			e = n, t = r;
		}),
		resolve: e,
		reject: t
	};
}
export { t as n, e as r, n as t };
