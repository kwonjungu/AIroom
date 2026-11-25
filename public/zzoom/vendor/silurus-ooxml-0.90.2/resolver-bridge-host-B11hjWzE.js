import { t as e } from "./font-registry-CA7E7o7P.js";
import { a as t, r as n, s as r, t as i } from "./resolver-failures-0-_PZr5v.js";
import { a, o, r as s, t as c } from "./face-download-BGnp7NTs.js";
import { n as l, t as u } from "./resolver-bridge-messages-DyLfptik.js";
var d = (e) => typeof e == "number" && Number.isSafeInteger(e) && e >= 0, f = class {
	options;
	postToWorker;
	failures;
	responder = null;
	disposed = !1;
	caches = /* @__PURE__ */ new Map();
	cacheFor = (e, t) => {
		let n = this.caches.get(e);
		return n || (n = r(t), this.caches.set(e, n)), n;
	};
	generation = -1;
	waiting = /* @__PURE__ */ new Map();
	acquisitions = /* @__PURE__ */ new Map();
	constructor(e) {
		this.failures = e.resolverFailures ?? /* @__PURE__ */ new Map(), this.postToWorker = e.post, this.options = Array.isArray(e.sources) && e.sources.some((e) => e.kind === "font-resolver") ? e : null, this.options && this.ensureResponder(this.options);
	}
	accept(n) {
		if (!l(n)) return !1;
		let r = this.options;
		if (this.disposed) return !0;
		let i = n;
		if (!d(i.generation) || !d(i.requestId)) return !0;
		if (!r?.sources) return i.kind === "ooxmlResolveFonts" && this.post(i, {
			status: "failed",
			reason: "font resolver function is not available in this realm"
		}), !0;
		let a = `${i.generation}:${i.requestId}`;
		if (i.kind === "ooxmlAcquireFonts") return this.acquire(a, i, r.sources), !0;
		if (i.kind === "ooxmlCancelResolveFonts") {
			let e = this.acquisitions.get(a);
			if (e) return e.controller.abort(), this.acquisitions.delete(a), !0;
			let t = this.waiting.get(a);
			if (t) return clearTimeout(t.timer), this.waiting.delete(a), !0;
		} else {
			if (i.generation < this.generation || this.waiting.has(a)) return !0;
			if (i.generation > this.generation) {
				this.generation = i.generation;
				for (let [e, t] of [...this.waiting]) t.request.generation >= i.generation || (clearTimeout(t.timer), this.waiting.delete(e));
				this.abandonAcquisitionsBefore(i.generation);
			}
			let n = t(this.failures, r.sources, i, this.cacheFor);
			if (n && n.unsettled.length === 0) return this.answer(i, n.settled), !0;
			let { remainingMs: o } = i, s = typeof o == "number" && Number.isFinite(o) && o >= 0 ? Math.min(o, e) : e, c = Date.now() + s, l = setTimeout(() => {
				this.waiting.get(a)?.request === i && (this.waiting.delete(a), this.fail(i, "timed out"));
			}, s);
			this.waiting.set(a, {
				request: i,
				deadline: c,
				timer: l
			});
		}
		return this.ensureResponder(r).then((e) => {
			if (this.disposed) return;
			if (i.kind === "ooxmlCancelResolveFonts") {
				e?.accept(i);
				return;
			}
			let t = this.waiting.get(a);
			if (t?.request !== i) return;
			if (clearTimeout(t.timer), this.waiting.delete(a), !e) {
				this.fail(i, "font resolver bridge unavailable");
				return;
			}
			let n = t.deadline - Date.now();
			if (n <= 0) {
				this.fail(i, "timed out");
				return;
			}
			let r = {
				...i,
				remainingMs: n
			};
			e.accept(r);
		}), !0;
	}
	abandonAcquisitionsBefore(e) {
		for (let [t, n] of [...this.acquisitions]) n.generation >= e || (n.controller.abort(), this.acquisitions.delete(t));
	}
	acquire(t, r, i) {
		if (r.generation < this.generation || this.acquisitions.has(t)) return;
		r.generation > this.generation && (this.generation = r.generation, this.abandonAcquisitionsBefore(r.generation));
		let o = (e, t = []) => {
			if (!this.disposed) try {
				this.postToWorker({
					kind: "ooxmlFontsAcquired",
					generation: r.generation,
					requestId: r.requestId,
					outcome: e
				}, t);
			} catch {}
		}, { sourceIndex: l, resolverId: u, remainingMs: d, families: f } = r, p = typeof l == "number" && Number.isSafeInteger(l) && l >= 0 ? i[l] : void 0;
		if (p?.kind !== "font-resolver" || p.id !== u || !Array.isArray(f)) {
			o({
				status: "failed",
				reason: "malformed font acquire request"
			});
			return;
		}
		let m = this.cacheFor(l, p), h = /* @__PURE__ */ new Set(), g = /* @__PURE__ */ new Set();
		for (let e of f) {
			let { family: t, urls: r } = e ?? {};
			if (typeof t != "string" || !Array.isArray(r)) continue;
			for (let e of r) typeof e == "string" && g.add(e);
			let i = n(this.failures, m, t, m);
			if (i?.kind === "claimed") for (let e of i.declarations) a(e) && h.add(e.url);
		}
		let _ = typeof d == "number" && Number.isFinite(d) && d >= 0 ? Math.min(d, e) : e, v = new AbortController(), y = {
			controller: v,
			generation: r.generation
		};
		this.acquisitions.set(t, y);
		let b = setTimeout(() => v.abort(c), _), x = [...g].filter((e) => h.has(e));
		s(this.failures, m.id, x, {
			signal: v.signal,
			deadline: Date.now() + _,
			holder: this
		}).then((e) => {
			let t = [];
			return [{
				status: "faces",
				faces: [...g].map((n) => {
					let r = e.get(n) ?? { reason: "not a font this document resolved" };
					if ("reason" in r) return {
						url: n,
						reason: r.reason
					};
					let i = r.data.slice(0);
					return t.push(i), {
						url: n,
						data: i
					};
				})
			}, t];
		}, (e) => [{
			status: "failed",
			reason: e instanceof Error ? e.message : String(e)
		}, []]).then(([e, n]) => {
			clearTimeout(b), this.acquisitions.get(t) === y && (this.acquisitions.delete(t), o(e, n));
		});
	}
	ensureResponder(e) {
		return this.responder ??= (e.loadResponder ?? (() => import("./resolver-bridge-responder-BEe__NxL.js")))().then(({ FontResolverResponder: t }) => this.disposed || !this.options?.sources ? null : new t({
			post: e.post,
			sources: e.sources ?? [],
			resolverFailures: this.failures
		}), (e) => (console.warn(`[ooxml] font resolver bridge failed to load: ${e instanceof Error ? e.message : String(e)}`), null)), this.responder;
	}
	fail(e, t) {
		let n = this.options;
		if (this.disposed || !n?.sources) return;
		let r = i(this.failures, n.sources, e, t, this.cacheFor);
		r.status === "families" ? this.answer(e, r.families) : this.post(e, r);
	}
	answer(e, t) {
		let n = u(t);
		this.post(e, {
			status: "families",
			families: n.answers
		}, n.transfer);
	}
	post(e, t, n = []) {
		if (!this.disposed) try {
			this.postToWorker({
				kind: "ooxmlFontsResolved",
				generation: e.generation,
				requestId: e.requestId,
				outcome: t
			}, n);
		} catch {}
	}
	dispose() {
		if (!this.disposed) {
			this.disposed = !0, this.options = null;
			for (let { timer: e } of this.waiting.values()) clearTimeout(e);
			this.waiting.clear();
			for (let { controller: e } of this.acquisitions.values()) e.abort();
			this.acquisitions.clear(), o(this);
			for (let e of this.caches.values()) e.release();
			this.caches.clear(), this.responder?.then((e) => e?.dispose());
		}
	}
};
export { f as FontResolverBridgeHost };
