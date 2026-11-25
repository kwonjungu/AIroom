import { n as e, t } from "./ooxml-error-DbICW35n.js";
import { E as n, T as r, t as i, w as a } from "./resource-policy.generated-D_HlV2Rm.js";
import { u as o } from "./pixel-budget-DI82Hn3R.js";
var s = class {
	initialize;
	reinitialize;
	normalizeFailure;
	state = "uninitialized";
	generationValue = 0;
	readiness;
	poisonListeners = /* @__PURE__ */ new Set();
	constructor(e, t, n) {
		this.initialize = e, this.reinitialize = t, this.normalizeFailure = n;
	}
	get generation() {
		return this.generationValue;
	}
	get poisoned() {
		return this.state === "poisoned";
	}
	onPoison(e) {
		return this.poisonListeners.add(e), () => this.poisonListeners.delete(e);
	}
	async ensureReady() {
		if (this.state !== "ready") {
			if (!this.readiness) {
				let e = this.state === "uninitialized" ? this.initialize : this.reinitialize;
				this.readiness = Promise.resolve().then(e).then(() => {
					this.generationValue += 1, this.state = "ready", this.readiness = void 0;
				}, (e) => {
					throw this.readiness = void 0, e;
				});
			}
			await this.readiness;
		}
	}
	run(e) {
		try {
			return e();
		} catch (e) {
			let t = this.normalizeFailure(e);
			throw t ? (this.poison(t), t) : e;
		}
	}
	tryRunReady(e) {
		if (this.state !== "ready") return { current: !1 };
		let t = this.generationValue, n = this.run(e);
		return this.state !== "ready" || t !== this.generationValue ? { current: !1 } : {
			current: !0,
			generation: t,
			value: n
		};
	}
	poison(e) {
		this.state = "poisoned", this.readiness = void 0;
		for (let t of this.poisonListeners) t(e);
	}
	assertCurrent(e) {
		if (this.state !== "ready" || e !== this.generationValue) throw Error("WASM archive session belongs to a discarded runtime generation");
	}
}, c = class e extends Error {
	code = "parser-crashed";
	constructor(t) {
		super(t), this.name = "WasmTrapError", Object.setPrototypeOf(this, e.prototype);
	}
};
function l(e) {
	let t = globalThis.WebAssembly?.RuntimeError;
	return t && e instanceof t || e instanceof RangeError ? !0 : e instanceof Error ? e.name === "RuntimeError" || e.name === "CompileError" || e.name === "LinkError" || e.name === "InternalError" || e.name === "OOMError" : !1;
}
function u(e) {
	try {
		if ((typeof e != "object" || !e) && typeof e != "function") return;
		let t = Reflect.get(e, "__destroy_into_raw");
		typeof t == "function" && Reflect.apply(t, e, []);
	} catch {}
}
var d = Object.freeze({
	maxArchiveEntryBytes: r,
	maxTotalInflatedBytes: n,
	maxArchiveEntries: a
});
function f(e, t, n) {
	if (t === void 0) return n;
	if (t === null) return null;
	if (!Number.isSafeInteger(t) || t <= 0) throw RangeError(`resourceLimits.${e} must be null or a positive safe integer number of bytes`);
	return t;
}
function p(e) {
	if (e === void 0) return d.maxArchiveEntries;
	if (e === null) return null;
	if (!Number.isSafeInteger(e) || e <= 0) throw RangeError("resourceLimits.maxArchiveEntries must be null or a positive safe integer");
	if (e > 2e4) throw RangeError(`resourceLimits.maxArchiveEntries must not exceed the internal hard ceiling of ${i}`);
	return e;
}
function m(e) {
	if (!(e === void 0 || !(e > 0))) {
		if (!Number.isSafeInteger(e)) throw RangeError("maxZipEntryBytes must be a positive safe integer number of bytes");
		return e;
	}
}
function h(e) {
	let t = e.resourceLimits;
	if (t !== void 0 && (typeof t != "object" || !t || Array.isArray(t))) throw TypeError("resourceLimits must be an object when provided");
	let n = m(e.maxZipEntryBytes), r = t?.maxArchiveEntryBytes;
	if (n !== void 0 && r !== void 0 && n !== r) throw RangeError("maxZipEntryBytes conflicts with resourceLimits.maxArchiveEntryBytes");
	return Object.freeze({
		maxArchiveEntryBytes: f("maxArchiveEntryBytes", r === void 0 ? n : r, d.maxArchiveEntryBytes),
		maxTotalInflatedBytes: f("maxTotalInflatedBytes", t?.maxTotalInflatedBytes, d.maxTotalInflatedBytes),
		maxArchiveEntries: p(t?.maxArchiveEntries)
	});
}
function g(e) {
	if (e.debug !== void 0 && typeof e.debug != "boolean") throw TypeError("debug must be a boolean when provided");
	if (e.onResourceMetrics !== void 0 && typeof e.onResourceMetrics != "function") throw TypeError("onResourceMetrics must be a function when provided");
	return Object.freeze({
		policy: h(e),
		debug: e.debug ?? !1,
		...e.onResourceMetrics ? { onResourceMetrics: e.onResourceMetrics } : {}
	});
}
function _(e) {
	return [
		e.maxArchiveEntryBytes === null ? 0n : BigInt(e.maxArchiveEntryBytes),
		e.maxTotalInflatedBytes === null ? 0n : BigInt(e.maxTotalInflatedBytes),
		e.maxArchiveEntries === null ? 0n : BigInt(e.maxArchiveEntries)
	];
}
var v = [
	"font-family: \"SFMono-Regular\", Menlo, Monaco, Consolas, monospace",
	"font-size: 12px",
	"line-height: 1.35",
	"font-variant-ligatures: none",
	"letter-spacing: 0",
	"white-space: pre"
].join(";");
function y(e) {
	if (b()) {
		console.log(`%c${e}`, v);
		return;
	}
	console.log(e);
}
function b() {
	return typeof window < "u" && globalThis.process?.release?.name !== "node";
}
function x(e) {
	let t = e.scope === "session" ? "SESSION" : "LOAD", n = e.status === "ok" ? e.scope === "session" ? "COMPLETE" : "READY" : "FAILED", r = [E(` OOXML ${t}  ${e.format.toUpperCase()}  ${n} `, 68)];
	if (r.push(O(`mode ${e.mode.padEnd(8)}  elapsed ${w(e.elapsedMs)}`, 68)), e.sourceBytes !== void 0 && r.push(O(`source ${C(e.sourceBytes)}`, 68)), r.push(D(" admission ", 68)), r.push(k("largest entry", e.usage?.largestInflatedEntryBytes, e.policy.maxArchiveEntryBytes, 68)), r.push(k("total inflated", e.usage?.distinctInflatedBytes, e.policy.maxTotalInflatedBytes, 68)), r.push(O(`entry count ${e.usage ? T(e.usage.archiveEntryCount) : "—"} / ${e.policy.maxArchiveEntries === null ? "public off" : T(e.policy.maxArchiveEntries)}`, 68)), e.usage ? r.push(O(`declared inflated ${C(e.usage.declaredInflatedBytes)}`, 68)) : r.push(O("usage unavailable for this report", 68)), e.checkpoints.length > 0) {
		r.push(D(" checkpoints ", 68));
		for (let t of e.checkpoints) {
			let e = t.usage ? C(t.usage.distinctInflatedBytes) : "—";
			r.push(O(`${w(t.elapsedMs).padStart(8)}  ${t.name.padEnd(25)} ${e.padStart(12)}`, 68));
		}
	}
	if (e.outcome && Object.keys(e.outcome).length > 0 && (r.push(D(" result ", 68)), r.push(O(Object.entries(e.outcome).map(([e, t]) => `${e} ${T(t)}`).join("  "), 68))), e.error) {
		r.push(D(" failure ", 68));
		let t = [
			e.error.code,
			e.error.stage,
			e.error.resource,
			e.error.metric
		].filter((e) => !!e).join(" · ");
		r.push(O(t || "unclassified error", 68));
	}
	return r.push(`└${"─".repeat(68)}┘`), r.join("\n");
}
function S(e) {
	y(x(e));
}
function C(e) {
	if (!Number.isFinite(e) || e < 0) return "—";
	let t = [
		"B",
		"KiB",
		"MiB",
		"GiB",
		"TiB"
	], n = e, r = 0;
	for (; n >= 1024 && r < t.length - 1;) n /= 1024, r += 1;
	let i = r === 0 || n >= 100 ? 0 : n >= 10 ? 1 : 2;
	return `${n.toFixed(i)} ${t[r]}`;
}
function w(e) {
	return e < 1e3 ? `${Math.round(e)} ms` : `${(e / 1e3).toFixed(2)} s`;
}
function T(e) {
	return Number.isSafeInteger(e) ? e.toLocaleString("en-US") : "—";
}
function E(e, t) {
	let n = e.slice(0, t);
	return `┌${n}${"─".repeat(t - n.length)}┐`;
}
function D(e, t) {
	let n = e.slice(0, t);
	return `├${n}${"─".repeat(t - n.length)}┤`;
}
function O(e, t) {
	let n = e.slice(0, t - 2);
	return `│ ${n}${" ".repeat(t - n.length - 2)} │`;
}
function k(e, t, n, r) {
	let i = t === void 0 || n === null || n <= 0 ? 0 : Math.min(1, t / n), a = Math.round(i * 16), o = `${"█".repeat(a)}${"░".repeat(16 - a)}`, s = `${t === void 0 ? "—" : C(t)} / ${n === null ? "public off" : C(n)}`;
	return O(`${e.padEnd(14)} ${o}  ${s}`, r);
}
var A = 1e3;
async function j(e, t) {
	e.observeUsage(await t(A));
	let n = e.current();
	if (!n) throw Error("OOXML resource metrics are not ready");
	return n;
}
var M = class {
	options;
	now;
	startedAt;
	policy;
	checkpoints = [];
	sourceBytes;
	lastUsage;
	mode;
	finished = !1;
	terminalStatus;
	terminalError;
	terminalOutcome;
	terminalElapsedMs;
	constructor(e) {
		this.options = e, this.now = e.now ?? F, this.startedAt = this.now(), this.policy = Object.freeze({
			maxArchiveEntryBytes: e.policy.maxArchiveEntryBytes,
			maxTotalInflatedBytes: e.policy.maxTotalInflatedBytes,
			maxArchiveEntries: e.policy.maxArchiveEntries,
			...Object.fromEntries(Object.entries(e.formatLimits ?? {}).map(([e, t]) => [e, Object.freeze({ ...t })]))
		}), this.mode = e.mode;
	}
	setMode(e) {
		!this.options.enabled || this.finished || (this.mode = e);
	}
	setSourceBytes(e) {
		this.options.enabled && (!Number.isSafeInteger(e) || e < 0 || (this.sourceBytes = e));
	}
	checkpoint(e, t) {
		if (!this.options.enabled || this.finished) return;
		t && (this.lastUsage = I(t));
		let n = this.lastUsage;
		this.checkpoints.push(Object.freeze({
			name: z(e),
			elapsedMs: R(this.startedAt, this.now()),
			...n ? { usage: n } : {}
		}));
	}
	observeUsage(e) {
		!this.options.enabled || !e || (this.lastUsage = I(e));
	}
	current() {
		if (!(!this.options.enabled || !this.terminalStatus)) return this.report(this.terminalStatus, this.terminalError, this.terminalOutcome);
	}
	succeed(e) {
		return this.finish("ok", void 0, e);
	}
	fail(e) {
		return this.finish("error", e);
	}
	finish(e, t, n) {
		if (!this.options.enabled || this.finished) return;
		this.finished = !0, this.terminalStatus = e, this.terminalError = t, this.terminalOutcome = n, this.terminalElapsedMs = R(this.startedAt, this.now());
		let r = this.report(e, t, n);
		return this.options.onMetrics && N(this.options.onMetrics, r), (this.options.emitToConsole ?? this.options.onMetrics === void 0) && N(S, r), r;
	}
	report(e, t, n) {
		let r = L(t) ?? this.lastUsage;
		return Object.freeze({
			schemaVersion: 1,
			scope: this.options.scope ?? "load",
			format: this.options.format,
			mode: this.mode,
			status: e,
			...this.sourceBytes === void 0 ? {} : { sourceBytes: this.sourceBytes },
			elapsedMs: this.terminalElapsedMs ?? R(this.startedAt, this.now()),
			policy: this.policy,
			...r ? { usage: r } : {},
			checkpoints: Object.freeze([...this.checkpoints]),
			...n ? { outcome: B(n) } : {},
			...e === "error" ? { error: V(t) } : {}
		});
	}
};
function N(e, t) {
	try {
		let n = e(t);
		P(n) && Promise.resolve(n).catch(() => void 0);
	} catch {}
}
function P(e) {
	return (typeof e == "object" && !!e || typeof e == "function") && typeof e.then == "function";
}
function F() {
	return typeof performance > "u" ? Date.now() : performance.now();
}
function I(e) {
	return Object.freeze({
		archiveEntryCount: e.archiveEntryCount,
		declaredInflatedBytes: e.declaredInflatedBytes,
		...e.largestInflatedEntryBytes === void 0 ? {} : { largestInflatedEntryBytes: e.largestInflatedEntryBytes },
		distinctInflatedBytes: e.distinctInflatedBytes,
		operationInflatedBytes: e.operationInflatedBytes
	});
}
function L(t) {
	try {
		return t instanceof e ? I(t.details.violation.usage) : void 0;
	} catch {
		return;
	}
}
function R(e, t) {
	return Math.max(0, Math.round((t - e) * 10) / 10);
}
function z(e) {
	return e.replace(/[^a-z0-9 -]/giu, "").trim().slice(0, 32) || "checkpoint";
}
function B(e) {
	return Object.freeze(Object.fromEntries(Object.entries(e).filter(([e, t]) => /^[a-z][a-z0-9-]{0,31}$/u.test(e) && Number.isSafeInteger(t) && t >= 0)));
}
function V(n) {
	try {
		if (n instanceof e) {
			let e = n.details.violation;
			return Object.freeze({
				code: n.code,
				stage: n.details.stage,
				resource: e.resource,
				metric: e.metric
			});
		}
		if (n instanceof t || n instanceof o) return Object.freeze({ code: n.code });
		if (n instanceof c || typeof n == "object" && n && n.code === "parser-crashed") return Object.freeze({ code: "parser-crashed" });
	} catch {}
	return Object.freeze({});
}
export { h as a, u as c, g as i, l, M as n, _ as o, j as r, c as s, A as t, s as u };
