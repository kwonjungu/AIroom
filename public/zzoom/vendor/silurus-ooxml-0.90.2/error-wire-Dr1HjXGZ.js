import { n as e, t } from "./ooxml-error-DbICW35n.js";
import { d as n, u as r } from "./pixel-budget-DI82Hn3R.js";
import { n as i, t as a } from "./tiff-contract-DEd8CGuz.js";
import { n as o, r as s } from "./font-source-limit-sNrowgTE.js";
var c = "ooxml-insufficient-credit", l = "OOXML_INSUFFICIENT_CREDIT:";
function u(e) {
	return typeof e == "number" && Number.isSafeInteger(e) && e > 0;
}
function d(e) {
	if (!e || typeof e != "object" || Array.isArray(e)) return !1;
	let t = e;
	return u(t.requiredBytes) && u(t.offeredBytes) && t.requiredBytes > t.offeredBytes;
}
var f = class e extends RangeError {
	code = c;
	requiredBytes;
	offeredBytes;
	constructor(t) {
		super(`Pull unit requires ${t.requiredBytes} bytes but credit is ${t.offeredBytes}`), this.name = "PullSessionInsufficientCreditError", this.requiredBytes = t.requiredBytes, this.offeredBytes = t.offeredBytes, Object.setPrototypeOf(this, e.prototype);
	}
};
function p(e) {
	if (e instanceof f) return e;
	let t = e instanceof Error ? e.message : String(e);
	if (!t.startsWith(l)) return;
	let n;
	try {
		n = JSON.parse(t.slice(26));
	} catch {
		return;
	}
	if (!n || typeof n != "object" || Array.isArray(n)) return;
	let r = n;
	if (!(r.code !== "ooxml-insufficient-credit" || !d(r))) return new f(r);
}
function m(e, t, n) {
	let r = p(e);
	if (!(!r || r.offeredBytes !== t || r.requiredBytes > n)) return r;
}
function h(e, t, n) {
	if (_(e)) return e.offeredBytes === t && e.requiredBytes <= n ? e.requiredBytes : void 0;
}
async function g(e, t, n, r) {
	try {
		return await e.pull(t, { signal: r });
	} catch (i) {
		let a = h(i, t, n);
		if (a === void 0) throw i;
		return e.pull(a, { signal: r });
	}
}
function _(e) {
	return e instanceof f || !!e && typeof e == "object" && e.code === "ooxml-insufficient-credit" && d(e);
}
var v = "OOXML_RESOURCE_LIMIT:", y = "OOXML_NOT_OOXML:", b = 128, x = 256, S = 4096;
function C(e) {
	return typeof e == "number" && Number.isSafeInteger(e) && e >= 0;
}
function w(e) {
	if (!e || typeof e != "object" || Array.isArray(e)) return !1;
	let t = e;
	return C(t.archiveEntryCount) && C(t.declaredInflatedBytes) && (t.largestInflatedEntryBytes === void 0 || C(t.largestInflatedEntryBytes)) && C(t.distinctInflatedBytes) && C(t.operationInflatedBytes);
}
function T(e) {
	let t;
	try {
		t = JSON.parse(new TextDecoder().decode(e));
	} catch {
		throw TypeError("OOXML resource usage checkpoint is not valid JSON");
	}
	if (!w(t)) throw TypeError("OOXML resource usage checkpoint is invalid");
	return t;
}
function E(e) {
	return e === "docx" || e === "xlsx" || e === "pptx";
}
function D(e) {
	return e === "container" || e === "decompression" || e === "parsing" || e === "serialization" || e === "layout" || e === "rendering" || e === "worker";
}
function O(e, t) {
	return typeof e == "string" && e.length > 0 && e.length <= t && !/[\u0000-\u001f\u007f]/u.test(e);
}
function k(e) {
	return O(e, b) && /^[a-z0-9][a-z0-9-]*$/u.test(e);
}
function A(e) {
	return !O(e, S) || e.startsWith("/") || e.startsWith("\\") || e.includes("\\") || e.includes("?") || e.includes("#") || e.includes("://") || /^[a-z]:/iu.test(e) ? !1 : e.split("/").every((e) => e !== "" && e !== "." && e !== "..");
}
var j = new Map([
	["archive-entry:declared-inflated-bytes", {
		stage: "container",
		part: "required"
	}],
	["archive-entry:actual-inflated-bytes", {
		stage: "decompression",
		part: "required"
	}],
	["archive:entry-count", {
		stage: "container",
		part: "forbidden"
	}],
	["archive:central-directory-bytes", {
		stage: "container",
		part: "forbidden",
		configurable: !1
	}],
	["archive:distinct-inflated-bytes", {
		stage: "decompression",
		part: "required"
	}],
	["xml-event:bytes", {
		stage: "parsing",
		part: "optional",
		configurable: !1
	}],
	["xml-context:bytes", {
		stage: "parsing",
		part: "optional",
		configurable: !1
	}],
	["image-effect:work", {
		stage: "parsing",
		part: "forbidden",
		configurable: !1
	}],
	["chartex-allocation:elements", {
		stage: "parsing",
		part: "forbidden",
		configurable: !1
	}],
	["chartex-allocation:bytes", {
		stage: "parsing",
		part: "forbidden",
		configurable: !1
	}],
	["chart-cache:points", {
		stage: "parsing",
		part: "forbidden",
		configurable: !1
	}],
	["numbering-marker:bytes", {
		stage: "parsing",
		part: "forbidden",
		configurable: !1
	}],
	["chart-style-formats:entries", {
		stage: "parsing",
		part: "required",
		configurable: !1
	}],
	["chart-custom-number-formats:entries", {
		stage: "parsing",
		part: "required",
		configurable: !1
	}],
	["chart-number-format-bytes:bytes", {
		stage: "parsing",
		part: "required",
		configurable: !1
	}],
	["xml-tree:depth", {
		stage: "parsing",
		part: "optional",
		configurable: !1
	}],
	["worksheet-row:projected-bytes", {
		stage: "parsing",
		part: "optional",
		configurable: !1
	}],
	["worksheet-shell:projected-bytes", {
		stage: "parsing",
		part: "optional",
		configurable: !1
	}],
	["theme-style-reparse:bytes", {
		stage: "parsing",
		part: "forbidden",
		configurable: !1
	}],
	["style-inheritance:depth", {
		stage: "parsing",
		part: "required",
		configurable: !1
	}],
	["complex-field:depth", {
		stage: "parsing",
		part: "forbidden",
		configurable: !1
	}]
]), M = new Set([...j.keys()].map((e) => e.slice(0, e.indexOf(":")))), N = new Set([...j.keys()].map((e) => e.slice(e.indexOf(":") + 1)));
function P(e) {
	if (!e || typeof e != "object" || Array.isArray(e)) return !1;
	let t = e;
	return !E(t.format) || !O(t.operation, x) || !k(t.resource) || !k(t.metric) || !C(t.limit) || !C(t.observed) || typeof t.configurable != "boolean" || !w(t.usage) ? !1 : !("part" in t) || A(t.part);
}
function F(e) {
	if (!e || typeof e != "object" || Array.isArray(e)) return !1;
	let t = e;
	if (!D(t.stage) || !P(t.violation)) return !1;
	let n = t.violation, r = j.get(`${n.resource}:${n.metric}`);
	return r ? t.stage !== r.stage || r.configurable === !1 && n.configurable !== !1 ? !1 : r.part === "required" ? n.part !== void 0 : r.part === "forbidden" ? n.part === void 0 : !0 : !(M.has(n.resource) && N.has(n.metric));
}
function I(e) {
	return {
		archiveEntryCount: e.archiveEntryCount,
		declaredInflatedBytes: e.declaredInflatedBytes,
		...e.largestInflatedEntryBytes === void 0 ? {} : { largestInflatedEntryBytes: e.largestInflatedEntryBytes },
		distinctInflatedBytes: e.distinctInflatedBytes,
		operationInflatedBytes: e.operationInflatedBytes
	};
}
function L(e) {
	if (!F(e)) return;
	let t = e.violation, n = {
		stage: e.stage,
		violation: {
			format: t.format,
			operation: t.operation,
			resource: t.resource,
			metric: t.metric,
			...t.part === void 0 ? {} : { part: t.part },
			limit: t.limit,
			observed: t.observed,
			configurable: t.configurable,
			usage: I(t.usage)
		}
	};
	return F(n) ? n : void 0;
}
function R(e) {
	let t = e.violation;
	return `OOXML resource limit exceeded${t.part ? ` for ${t.part}` : ""} (${t.resource}, ${e.stage}): ${t.metric} ${t.observed} > ${t.limit}`;
}
function z(t) {
	let n = t instanceof Error ? t.message : String(t);
	if (!n.startsWith(v)) return;
	let r;
	try {
		r = JSON.parse(n.slice(21));
	} catch {
		return;
	}
	if (!r || typeof r != "object") return;
	let i = r;
	if (!(i.code !== "ooxml-resource-limit" || !F(i.details))) return new e(R(i.details), i.details);
}
function B(t) {
	try {
		return t();
	} catch (t) {
		throw t instanceof e || typeof t != "string" && !(t instanceof Error) ? t : z(t) ?? t;
	}
}
function V(e) {
	let n = e instanceof Error ? e.message : String(e);
	if (n.startsWith(y)) return new t("not-ooxml", `This file is not an Office Open XML document: ${n.slice(16)}`);
}
function H(e) {
	if (!e || typeof e != "object" || Array.isArray(e)) return;
	let t = e, n = t.format, r = t.reason;
	if (!(!k(n) || r !== "source-subset")) return {
		format: n,
		reason: r
	};
}
function U(e) {
	return new t("unsupported-content", "Input is outside the source’s supported subset.", e);
}
function W(e) {
	let t = typeof e == "string" ? e : e instanceof Error ? e.message : "";
	if (!(!t.startsWith("MODEL_SOURCE_UNSUPPORTED:") || t.length > 1024)) try {
		let e = H(JSON.parse(t.slice(25)));
		return e ? U(e) : void 0;
	} catch {
		return;
	}
}
function G(e) {
	return e === "OOXML_SOURCE_UNSUPPORTED_ENCRYPTION" || e instanceof Error && e.message === "OOXML_SOURCE_UNSUPPORTED_ENCRYPTION" ? new t("unsupported-encryption", "The configured source cannot decrypt this input.") : W(e) ?? z(e) ?? V(e);
}
function K(a) {
	let c = n(a);
	if (c) {
		let e = new r(c.metric, c.limit, c.observed);
		return {
			message: e.message,
			errorName: e.name,
			code: e.code,
			decodedImage: c
		};
	}
	let l = i(a);
	if (l) return {
		message: l.message,
		errorName: "TiffDecodeError",
		code: "ooxml-tiff-decode"
	};
	let u = p(a);
	if (u) return {
		message: u.message,
		errorName: u.name,
		code: u.code,
		insufficientCredit: {
			requiredBytes: u.requiredBytes,
			offeredBytes: u.offeredBytes
		}
	};
	let d = a instanceof t || a instanceof e ? a : G(a), f = d ?? a;
	if (d instanceof e || f && typeof f == "object" && f.code === "ooxml-resource-limit") {
		let e = f, t = L(e.details);
		return t ? {
			message: typeof e.message == "string" ? e.message : R(t),
			errorName: "OoxmlResourceLimitError",
			code: "ooxml-resource-limit",
			resourceLimit: t
		} : {
			message: "Invalid OOXML resource-limit error payload",
			errorName: "Error"
		};
	}
	if (f && typeof f == "object" && f.code === "unsupported-content") {
		let e = H(f.details);
		return e ? {
			message: U(e).message,
			code: "unsupported-content",
			unsupportedContent: e
		} : {
			message: "Invalid unsupported-content error payload",
			errorName: "Error"
		};
	}
	if (f && typeof f == "object" && f.code === "font-source-limit") {
		let e = s(f.violation);
		return e ? {
			message: o(e),
			errorName: "OoxmlError",
			code: "font-source-limit",
			fontSourceLimit: e
		} : {
			message: "Invalid font-source-limit error payload",
			errorName: "Error"
		};
	}
	if (d instanceof t) return {
		message: typeof d.message == "string" ? d.message : String(d.message),
		errorName: O(d.name, b) ? d.name : "OoxmlError",
		...k(d.code) ? { code: d.code } : {}
	};
	let m = a instanceof Error ? a.message : String(a);
	if (typeof m == "string" && m.startsWith(v)) return {
		message: "Invalid OOXML resource-limit payload",
		errorName: "Error"
	};
	let h = a instanceof Error ? a : Error(m), g = h;
	return {
		message: typeof h.message == "string" ? h.message : String(h.message),
		errorName: O(h.name, b) ? h.name : "Error",
		...typeof g.code == "string" ? { code: g.code } : {}
	};
}
function q(e) {
	try {
		return K(e);
	} catch {
		return {
			message: "Worker operation failed with an unreadable error",
			errorName: "Error"
		};
	}
}
var J = new Set([
	"encrypted",
	"invalid-password",
	"unsupported-encryption",
	"legacy-binary-format",
	"not-ooxml",
	"invalid-numbering",
	"unsupported-image-effect"
]), Y = {
	"image-dimension": !0,
	"image-pixels": !0,
	"active-decoded-bytes": !0,
	"image-effect-count": !0,
	"image-effect-work": !0,
	"tiff-lzw-work": !0,
	"metafile-path-commands": !0,
	"metafile-record-points": !0,
	"metafile-record-polygons": !0,
	"metafile-record-rectangles": !0,
	"metafile-record-text-units": !0
};
function X(e) {
	return typeof e == "string" && Object.prototype.hasOwnProperty.call(Y, e);
}
function Z(e, t) {
	if (e !== "ooxml-decoded-image-limit" || !t || typeof t != "object") return;
	let n = t, r = n.metric, i = n.limit, a = n.observed;
	if (!(!X(r) || !C(i) || !C(a) || a <= i)) return {
		metric: r,
		limit: i,
		observed: a
	};
}
function Q(n) {
	let i = n.message, c = n.errorName, l = n.code, u = n.decodedImage, p = n.insufficientCredit, m = n.resourceLimit, h = n.unsupportedContent, g = n.fontSourceLimit, _ = typeof i == "string" ? i : "Worker operation failed with an invalid error payload", v = O(c, b) ? c : void 0, y = typeof l == "string" ? l : void 0;
	if (y === "unsupported-content") {
		let e = H(h);
		return e ? U(e) : /* @__PURE__ */ Error("Invalid unsupported-content error payload");
	}
	if (y === "font-source-limit") {
		let e = s(g);
		return e ? new t("font-source-limit", o(e), e) : /* @__PURE__ */ Error("Invalid font-source-limit error payload");
	}
	let x = Z(y, u);
	if (x) return new r(x.metric, x.limit, x.observed);
	if (y === "ooxml-tiff-decode") return new a(_);
	if (y === "ooxml-insufficient-credit" && d(p)) return new f(p);
	if (y === "ooxml-resource-limit" && F(m)) return new e(_, m);
	if (y && J.has(y)) return new t(y, _);
	let S = v === "TypeError" ? TypeError(_) : v === "RangeError" ? RangeError(_) : Error(_);
	return v && (S.name = v), y !== void 0 && Object.assign(S, { code: y }), S;
}
function $(e) {
	try {
		return Q(e);
	} catch {
		return /* @__PURE__ */ Error("Worker operation failed with an unreadable error payload");
	}
}
export { R as a, _ as c, G as i, m as l, $ as n, q as o, z as r, B as s, T as t, g as u };
