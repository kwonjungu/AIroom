import { t as e } from "./font-registry-CA7E7o7P.js";
import { c as t } from "./source-GXgH3t1X.js";
import { n, r } from "./resolver-resolution-BSl7OugA.js";
import { s as i, t as a } from "./resolver-failures-0-_PZr5v.js";
import { t as o } from "./resolver-bridge-messages-DyLfptik.js";
var s = (e) => typeof e == "number" && Number.isSafeInteger(e) && e >= 0;
function c(e) {
	if (!(!Array.isArray(e) || e.length > 256)) return e.every((e) => typeof e == "string") ? Object.freeze([...e]) : void 0;
}
function l(e) {
	if (typeof e != "object" || !e) return;
	let t = e;
	if (Object.keys(t).some((e) => e !== "authoredFamilies" && e !== "fallbackFamilies")) return;
	let n = c(t.authoredFamilies), r = c(t.fallbackFamilies);
	if (!(!n || !r || n.length + r.length > 256)) return Object.freeze({
		authoredFamilies: n,
		fallbackFamilies: r
	});
}
var u = class {
	post;
	sources;
	failures;
	disposed = !1;
	generation = -1;
	calls = /* @__PURE__ */ new Map();
	caches = /* @__PURE__ */ new Map();
	constructor(e) {
		this.post = e.post, this.sources = e.sources, this.failures = e.resolverFailures ?? /* @__PURE__ */ new Map();
	}
	accept(e) {
		if (this.disposed) return;
		let t = e;
		if (!s(t.generation) || !s(t.requestId)) return;
		let n = `${t.generation}:${t.requestId}`;
		if (e.kind === "ooxmlCancelResolveFonts") {
			this.calls.get(n)?.controller.abort(), this.calls.delete(n);
			return;
		}
		if (!(e.kind !== "ooxmlResolveFonts" || this.calls.has(n)) && !(t.generation < this.generation)) {
			if (t.generation > this.generation) {
				this.generation = t.generation;
				for (let [e, n] of [...this.calls]) n.generation >= t.generation || (n.controller.abort(), this.calls.delete(e));
			}
			this.respond(n, t.generation, t.requestId, t);
		}
	}
	dispose() {
		if (this.disposed) return;
		this.disposed = !0;
		let e = [...this.calls.values()];
		this.calls.clear();
		for (let { controller: t } of e) t.abort();
		for (let e of this.caches.values()) e.release();
		this.caches.clear(), this.sources = [], this.failures.clear();
	}
	get pendingCount() {
		return this.calls.size;
	}
	async respond(t, n, r, i) {
		let s = new AbortController(), c = {
			controller: s,
			generation: n
		};
		this.calls.set(t, c);
		let l = (e) => this.disposed ? {
			status: "failed",
			reason: e
		} : a(this.failures, this.sources, i, e, (e, t) => this.cacheOf(e, t)), { remainingMs: u } = i, d = typeof u == "number" && Number.isFinite(u) && u >= 0 ? Math.min(u, e) : e, f = !1, p = setTimeout(() => {
			f = !0, s.abort();
		}, d), m;
		try {
			m = await this.resolve(i, s.signal, () => f, l);
		} finally {
			clearTimeout(p);
		}
		let h = this.calls.get(t) === c;
		if (this.calls.delete(t), this.disposed || !h || s.signal.aborted && !f) return;
		f && (m = l("timed out"));
		let g = m, _ = [];
		if (m.status === "families") {
			let e = o(m.families);
			g = {
				status: "families",
				families: e.answers
			}, _ = e.transfer;
		}
		try {
			this.post({
				kind: "ooxmlFontsResolved",
				generation: n,
				requestId: r,
				outcome: g
			}, _);
		} catch (e) {
			let t = l(e instanceof Error ? e.message : String(e));
			try {
				this.post({
					kind: "ooxmlFontsResolved",
					generation: n,
					requestId: r,
					outcome: t
				});
			} catch {}
		}
	}
	cacheOf(e, t) {
		let n = this.caches.get(e);
		return n || (n = i(t), this.caches.set(e, n)), n;
	}
	async resolve(e, i, a, o) {
		let { sourceIndex: c, resolverId: u } = e, d = l(e.demand);
		if (!d || typeof u != "string" || !s(c)) return o("malformed font resolver request");
		let f = this.sources[c];
		if (f?.kind !== "font-resolver" || f.id !== u || !t(f)) return o("font resolver function is not available in this realm");
		let p = [...d.authoredFamilies.map((e) => ({
			name: e,
			fallback: !1
		})), ...d.fallbackFamilies.map((e) => ({
			name: e,
			fallback: !0
		}))], m = this.cacheOf(c, f), h = Date.now();
		try {
			let t = await n({
				source: f,
				cache: m,
				runner: r,
				families: p,
				signal: i,
				holder: m,
				sourceIndex: c,
				failures: this.failures,
				remainingMs: () => Math.max(0, (e.remainingMs ?? 15e3) - (Date.now() - h))
			});
			return a() ? o("timed out") : {
				status: "families",
				families: [...t].map(([e, t]) => t.kind === "claimed" ? {
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
				})
			};
		} catch (e) {
			return a() ? o("timed out") : o(e instanceof Error ? e.message : String(e));
		}
	}
};
export { u as FontResolverResponder, l as copyBridgedFontDemand };
