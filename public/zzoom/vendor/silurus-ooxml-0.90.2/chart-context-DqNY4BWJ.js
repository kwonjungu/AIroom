import { n as e, t } from "./substitutions-_KDT_mVq.js";
import { t as n } from "./font-registry-CA7E7o7P.js";
import { B as r } from "./renderer-D3GIB31w.js";
import { _ as i } from "./duotone-bitmap-by-path-B_pNKO0M.js";
import { t as a } from "./abort-JztSoyw2.js";
import { d as o, l as s } from "./source-GXgH3t1X.js";
import { n as c } from "./resolver-bridge-messages-DyLfptik.js";
import { u as l } from "./part-failures-pZSloLZv.js";
function u() {
	return a("worker request aborted");
}
var d = class {
	_worker;
	_opts;
	_pending = /* @__PURE__ */ new Map();
	_orphaned = /* @__PURE__ */ new Map();
	_nextId = 1;
	_terminated = !1;
	_failure;
	constructor(e, t) {
		this._worker = e, this._opts = t, this._worker.addEventListener("message", this._handle), this._worker.addEventListener("messageerror", this._handleWorkerError), this._worker.addEventListener("error", this._handleWorkerError);
	}
	_handle = (e) => {
		let t = e.data, n = this._opts.correlate(t);
		if (n === void 0) {
			this._opts.onUnsolicited?.(t);
			return;
		}
		let r = this._pending.get(n);
		if (!r) {
			try {
				let e = this._orphaned.get(n);
				e ? (this._orphaned.delete(n), e(t)) : this._opts.onOrphanedResponse?.(t);
			} catch {}
			return;
		}
		this._pending.delete(n), r.cleanup();
		let i = this._opts.toError?.(t);
		i === void 0 ? r.resolve(t) : r.reject(i instanceof Error ? i : Error(i));
	};
	_handleWorkerError = (e) => {
		let t = "message" in e && e.message ? `: ${e.message}` : "", n = e.type === "error" && !t && globalThis.origin === "null" ? ": this page has an opaque origin; a sandboxed iframe without allow-same-origin can block Worker loading" : "";
		this._failure ??= /* @__PURE__ */ Error(`Worker error${t}${n}`), this._rejectAll(this._failure);
	};
	_rejectAll(e) {
		let t = [...this._pending.values()];
		this._pending.clear();
		for (let n of t) n.cleanup(), n.reject(e);
	}
	nextId() {
		return this._nextId++;
	}
	request(e, t, n) {
		let r = this._nextId++, i = n?.timeoutMs === !1 ? void 0 : n?.timeoutMs ?? this._opts.timeoutMs, a = n?.signal, o = (e) => {
			try {
				n?.onCancel?.(r, e);
			} catch {}
		};
		return new Promise((s, c) => {
			if (this._terminated) {
				c(/* @__PURE__ */ Error("Worker terminated"));
				return;
			}
			if (this._failure) {
				c(this._failure);
				return;
			}
			if (a?.aborted) {
				o("abort"), c(u());
				return;
			}
			let l, d;
			this._pending.set(r, {
				resolve: s,
				reject: c,
				cleanup: () => {
					l !== void 0 && (clearTimeout(l), l = void 0), d && a && (a.removeEventListener("abort", d), d = void 0);
				},
				onOrphanedResponse: n?.onOrphanedResponse
			}), i !== void 0 && (l = setTimeout(() => {
				let e = this._pending.get(r);
				e && (this._pending.delete(r), e.onOrphanedResponse && this._orphaned.set(r, e.onOrphanedResponse), e.cleanup(), o("timeout"), e.reject(/* @__PURE__ */ Error(`worker request timed out after ${i}ms`)));
			}, i)), a && (d = () => {
				let e = this._pending.get(r);
				e && (this._pending.delete(r), e.onOrphanedResponse && this._orphaned.set(r, e.onOrphanedResponse), e.cleanup(), o("abort"), e.reject(u()));
			}, a.addEventListener("abort", d));
			try {
				this._worker.postMessage(e(r), t);
			} catch (e) {
				let t = this._pending.get(r);
				if (!t) return;
				this._pending.delete(r), t.cleanup(), t.reject(e instanceof Error ? e : Error(String(e)));
			}
		});
	}
	transport(e) {
		return {
			request: (t, n, r) => this.request(t, n, {
				...r,
				onOrphanedResponse: r?.onOrphanedResponse ? (t) => {
					e(t) && r.onOrphanedResponse?.(t);
				} : void 0
			}).then((t) => {
				if (!e(t)) throw Error("worker response does not match the selected transport");
				return t;
			}),
			forgetOrphaned: (e) => this.forgetOrphaned(e),
			terminate: () => this.terminate()
		};
	}
	post(e, t) {
		this._worker.postMessage(e, t);
	}
	forgetOrphaned(e) {
		for (let t of e) this._orphaned.delete(t);
	}
	get orphanedRequestCount() {
		return this._orphaned.size;
	}
	terminate() {
		this._terminated || (this._terminated = !0, this._worker.removeEventListener("message", this._handle), this._worker.removeEventListener("messageerror", this._handleWorkerError), this._worker.removeEventListener("error", this._handleWorkerError), this._worker.terminate(), this._rejectAll(/* @__PURE__ */ Error("Worker terminated")), this._orphaned.clear());
	}
};
function f(e) {
	return !!e && typeof e == "object" && e.kind === "ooxmlDecodeSvg";
}
function p(e, t) {
	return f(t) ? (i(new Blob([t.bytes], { type: "image/svg+xml" }), t).then((n) => {
		try {
			e({
				kind: "ooxmlSvgDecoded",
				decodeId: t.decodeId,
				bitmap: n
			}, [n]);
		} catch {
			r(n);
		}
	}).catch((n) => {
		try {
			e({
				kind: "ooxmlSvgDecodeFailed",
				decodeId: t.decodeId,
				message: n instanceof Error ? n.message : String(n)
			});
		} catch {}
	}), !0) : !1;
}
var m = "https://fonts.googleapis.com", h = "ital,wght@0,400;0,700;1,400;1,700", g = "wght@400;700", _ = Object.freeze({
	Carlito: h,
	Caladea: h,
	"Libre Franklin": "ital,wght@0,400;0,600;0,700;1,400;1,600;1,700",
	"Nunito Sans": h,
	Nunito: h,
	"Open Sans": h,
	Roboto: h,
	Lato: h,
	Montserrat: h,
	Poppins: h,
	Raleway: h,
	"Playfair Display": h,
	Ubuntu: h,
	"Noto Naskh Arabic": g,
	"Noto Sans Arabic": g,
	"Noto Sans KR": g,
	"Noto Sans SC": g,
	"Noto Sans TC": g,
	"Noto Sans HK": g,
	"Noto Sans JP": g,
	"Noto Serif KR": g,
	"Noto Serif SC": g,
	"Noto Serif TC": g,
	"Noto Serif JP": g,
	"Noto Sans": g,
	"Noto Serif": g,
	"Noto Sans Devanagari": g,
	"Noto Sans Thai": g,
	"Noto Sans Hebrew": g,
	"Noto Serif Hebrew": g
}), v = Object.freeze([
	["Noto Sans CJK SC", "Noto Sans SC"],
	["Noto Serif CJK SC", "Noto Serif SC"],
	["Noto Sans CJK TC", "Noto Sans TC"],
	["Noto Serif CJK TC", "Noto Serif TC"],
	["Noto Sans CJK JP", "Noto Sans JP"],
	["Noto Serif CJK JP", "Noto Serif JP"],
	["Noto Sans CJK KR", "Noto Sans KR"],
	["Noto Serif CJK KR", "Noto Serif KR"],
	["Noto Sans CJK HK", "Noto Sans HK"]
].map(([e, t]) => Object.freeze({
	for: e,
	use: t
}))), y = Object.freeze([...t, ...v]);
function b(e) {
	if (typeof e != "string") throw TypeError("googleFonts() baseUrl must be a string");
	let t = e.endsWith("/") ? e.slice(0, -1) : e, n;
	try {
		n = new URL(t);
	} catch {
		throw TypeError("googleFonts() baseUrl must be an absolute http(s) origin");
	}
	if (n.protocol !== "https:" && n.protocol !== "http:" || n.origin !== t) throw TypeError("googleFonts() baseUrl must be an http(s) origin without path, query or credentials");
	return t;
}
function x(t) {
	if (t === void 0) return _;
	if (!t || typeof t != "object" || Array.isArray(t)) throw TypeError("googleFonts() additionalFamilies must be an object");
	let n = Object.entries(t);
	for (let [e, t] of n) if (typeof t != "string") throw TypeError(`googleFonts() additionalFamilies[${JSON.stringify(e)}] must be a query string`);
	let r = new Set(n.map(([t]) => e(t)));
	return Object.fromEntries([...Object.entries(_).filter(([t]) => !r.has(e(t))), ...n]);
}
function S(t) {
	let n = new Set(Object.keys(t ?? {}).map(e));
	return Object.keys(_).filter((t) => !n.has(e(t)));
}
function C(e = {}) {
	if (!e || typeof e != "object" || Array.isArray(e)) throw TypeError("googleFonts() options must be an object");
	for (let t of Object.keys(e)) if (t !== "baseUrl" && t !== "substitutions" && t !== "additionalFamilies") throw TypeError(`googleFonts() options has unknown property "${t}"`);
	let t = e.baseUrl === void 0 ? m : b(e.baseUrl);
	return o({
		urlTemplate: `${t}/css2?family={family}:{query}&display=swap`,
		families: x(e.additionalFamilies),
		substitutions: e.substitutions === void 0 ? y : e.substitutions
	}, t === "https://fonts.googleapis.com" ? {
		sharedSubsetMetricFamilies: S(e.additionalFamilies),
		parallelFaceDownloads: 32
	} : {});
}
var w = "font resolver bridge unavailable", T = (e) => typeof e == "number" && Number.isSafeInteger(e) && e >= 0, E = class {
	postToWorker;
	host = null;
	construction = null;
	state;
	early = [];
	timer;
	readyDeadline = 0;
	disposed = !1;
	waiters = [];
	sessionState = {
		ready: () => this.state === "pending" && !this.disposed ? new Promise((e) => {
			this.waiters.push(e);
		}) : void 0,
		unavailable: () => this.state === "unavailable" ? w : void 0
	};
	constructor(e) {
		this.postToWorker = e.post;
		let { sources: t } = e;
		if (!Array.isArray(t) || !t.some((e) => e.kind === "font-resolver")) {
			this.state = "none", this.signal({
				kind: "ooxmlFontBridgeState",
				state: "ready"
			});
			return;
		}
		this.state = "pending", this.construction = {
			post: e.post,
			sources: t,
			...e.resolverFailures ? { resolverFailures: e.resolverFailures } : {}
		}, this.signal({
			kind: "ooxmlFontBridgeState",
			state: "pending"
		});
		let r = `it did not load within ${n} ms`;
		this.readyDeadline = Date.now() + n, this.timer = setTimeout(() => this.unavailable(r), n);
		let i;
		try {
			i = (e.loadHost ?? (() => import("./resolver-bridge-host-B11hjWzE.js")))();
		} catch (e) {
			i = Promise.reject(e);
		}
		i.then(({ FontResolverBridgeHost: e }) => {
			let t = this.construction;
			if (this.disposed || this.state !== "pending" || !t) return;
			if (Date.now() >= this.readyDeadline) {
				this.unavailable(r);
				return;
			}
			clearTimeout(this.timer), this.construction = null;
			let n = new e(t);
			this.host = n, this.state = "ready", this.signal({
				kind: "ooxmlFontBridgeState",
				state: "ready"
			});
			for (let e of this.early.splice(0)) n.accept(e);
			for (let e of this.waiters.splice(0)) e();
		}).catch((e) => {
			this.unavailable(e instanceof Error ? e.message : String(e));
		});
	}
	accept(e) {
		if (!c(e)) return !1;
		if (this.disposed) return !0;
		switch (this.state) {
			case "ready": return this.host.accept(e);
			case "pending": return this.early.push(e), !0;
			case "none": return this.refuse(e, "font resolver function is not available in this realm", !1), !0;
			case "unavailable": return this.refuse(e, w, !0), !0;
		}
	}
	unavailable(e) {
		if (!(this.disposed || this.state !== "pending")) {
			clearTimeout(this.timer), this.construction = null, this.state = "unavailable", console.warn(`[ooxml] font resolver bridge failed to load: ${e}; fontResolver families fall back`), this.signal({
				kind: "ooxmlFontBridgeState",
				state: "unavailable",
				reason: w
			});
			for (let e of this.early.splice(0)) this.refuse(e, w, !0);
			for (let e of this.waiters.splice(0)) e();
		}
	}
	refuse(e, t, n) {
		let r = e;
		if (!T(r.generation) || !T(r.requestId)) return;
		let { generation: i, requestId: a } = r;
		r.kind === "ooxmlResolveFonts" ? this.signal({
			kind: "ooxmlFontsResolved",
			generation: i,
			requestId: a,
			outcome: {
				status: "failed",
				reason: t
			}
		}) : r.kind === "ooxmlAcquireFonts" && n && this.signal({
			kind: "ooxmlFontsAcquired",
			generation: i,
			requestId: a,
			outcome: {
				status: "failed",
				reason: t
			}
		});
	}
	signal(e) {
		try {
			this.postToWorker(e);
		} catch {}
	}
	dispose() {
		if (!this.disposed) {
			this.disposed = !0, clearTimeout(this.timer), this.construction = null, this.postToWorker = () => void 0, this.early = [];
			for (let e of this.waiters.splice(0)) e();
			this.host?.dispose(), this.host = null;
		}
	}
}, D = "[ooxml] useGoogleFonts is deprecated: from 0.91.0 it is ignored (no web fonts are loaded). Replace it with fonts: [googleFonts()] — import { googleFonts } from '@silurus/ooxml' (also exported from the docx/xlsx/pptx entries). When fonts is also given, fonts wins and useGoogleFonts is ignored. A Google-compatible mirror is googleFonts({ baseUrl }); other sources are fontCssApi(), fontCss(), fontFiles() and fontResolver(). See https://github.com/yukiyokotani/office-open-xml-viewer/blob/main/docs/migration-0.90.md.", O = !1;
function k(e) {
	let { useGoogleFonts: t, fonts: n, ...r } = e;
	t !== void 0 && (O || (O = !0, console.warn(D)));
	let i = n === void 0 && t === !0 ? [C()] : n;
	return i !== void 0 && s(i), i !== void 0 && i.length > 0 ? {
		...r,
		fonts: Object.freeze([...i])
	} : r;
}
var A = 65536;
function j(e) {
	let t = e ?? 16384;
	if (!Number.isFinite(t) || t < 0) throw RangeError("maxTextCharacters must be a finite non-negative number.");
	return Math.min(A, Math.floor(t));
}
function M(e, t) {
	let n = j(t), r = [], i = 0, a = !1, o = !1, s = (e, t) => {
		if (t && o) {
			if (i >= n) return a = !0, !1;
			r.push("\n"), i++;
		}
		o = !0;
		let s = l(e, Math.max(0, n - i));
		return r.push(s), i += s.length, s.length < e.length ? (a = !0, !1) : !0;
	};
	if (!s(`Chart type: ${e.chartType}`, !0) || e.title !== null && !s(`Title: ${e.title}`, !0)) return {
		text: r.join(""),
		truncated: a,
		textCharacters: i,
		maxTextCharacters: n
	};
	if (e.categories.length > 0) {
		if (!s("Categories: ", !0)) return {
			text: r.join(""),
			truncated: a,
			textCharacters: i,
			maxTextCharacters: n
		};
		for (let [t, o] of e.categories.entries()) if (!s(`${t === 0 ? "" : ", "}${o}`, !1)) return {
			text: r.join(""),
			truncated: a,
			textCharacters: i,
			maxTextCharacters: n
		};
	}
	for (let t of e.series) {
		if (!s(`Series ${t.name || "(unnamed)"}: `, !0)) break;
		for (let [e, o] of t.values.entries()) if (!s(`${e === 0 ? "" : ", "}${o === null ? "" : o}`, !1)) return {
			text: r.join(""),
			truncated: a,
			textCharacters: i,
			maxTextCharacters: n
		};
		if (a) break;
	}
	return {
		text: r.join(""),
		truncated: a,
		textCharacters: i,
		maxTextCharacters: n
	};
}
export { y as a, d as c, E as i, M as n, C as o, k as r, p as s, A as t };
