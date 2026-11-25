import { n as e } from "./own-key-CzMRhMxt.js";
import { a as t, n } from "./substitutions-_KDT_mVq.js";
import { o as r, s as i, u as a } from "./resource-policy.generated-D_HlV2Rm.js";
import { t as o } from "./font-source-limit-sNrowgTE.js";
import { t as s } from "./bundled-asset-url-Cv8ajMAZ.js";
var c = "ooxml-font-source/v1", l = 64;
function u(e, t) {
	if (!e || typeof e != "object" || Array.isArray(e)) throw TypeError(`${t} must be an object`);
	return e;
}
function d(e, t, n) {
	for (let r of Object.keys(e)) if (!t.includes(r)) throw TypeError(`${n} has unknown property "${r}"`);
}
function f(e, t) {
	if (typeof e != "string" || e.trim() === "" || e.trim() !== e) throw TypeError(`${t} must be a non-empty string without surrounding white space`);
	return e;
}
function p(e, t) {
	if (e !== void 0) {
		if (typeof e != "string" || e.trim() === "") throw TypeError(`${t} must be a non-empty string`);
		return e;
	}
}
function m(e, t) {
	if (e === void 0 || e === "omit" || e === "same-origin") return e;
	throw TypeError(`${t} must be 'omit' or 'same-origin'`);
}
function h(e, t) {
	return e ? Object.getOwnPropertyDescriptor(e, t)?.get : void 0;
}
var g = h(ArrayBuffer.prototype, "byteLength"), _ = h(ArrayBuffer.prototype, "detached"), v = h(ArrayBuffer.prototype, "resizable"), y = h(globalThis.SharedArrayBuffer?.prototype, "byteLength");
function b(e, t) {
	if (!e) return !1;
	try {
		return Reflect.apply(e, t, []), !0;
	} catch {
		return !1;
	}
}
function x(e, t) {
	if (typeof e != "object" || !e) throw TypeError(`${t} must be an ArrayBuffer`);
	if (ArrayBuffer.isView(e)) throw TypeError(`${t} must be an ArrayBuffer, not a view`);
	if (b(y, e)) throw TypeError(`${t} must be an ArrayBuffer, not a SharedArrayBuffer`);
	if (!b(g, e)) throw TypeError(`${t} must be an ArrayBuffer`);
	if (_ && Reflect.apply(_, e, []) === !0) throw TypeError(`${t} must not be detached`);
	if (v && Reflect.apply(v, e, []) === !0) throw TypeError(`${t} must not be resizable`);
	let n = Reflect.apply(g, e, []);
	if (n === 0) throw TypeError(`${t} must not be empty or detached`);
	return n;
}
var S = (e) => e === 9 || e === 10 || e === 12 || e === 13 || e === 32, C = (e) => e >= 48 && e <= 57 ? e - 48 : e >= 65 && e <= 70 ? e - 55 : e >= 97 && e <= 102 ? e - 87 : -1;
function w(e) {
	let t = e.length;
	for (; t > 0 && e.charCodeAt(t - 1) <= 32;) t--;
	let n = 0;
	for (; n < t && e.charCodeAt(n) <= 32;) n++;
	let r = [], i = n, s = () => {
		for (; i < t;) {
			let t = e.charCodeAt(i++);
			if (t !== 9 && t !== 10 && t !== 13) return t;
		}
		return -1;
	};
	for (let e = 0; e < 5; e++) r.push(s());
	if (String.fromCharCode(...r).toLowerCase() !== "data:") return;
	let c = "";
	for (let e = s();; e = s()) {
		if (e === -1 || e === 35) return;
		if (e === 44) break;
		if (c.length > 8192) throw o("url", a, c.length);
		c += String.fromCharCode(e);
	}
	let l = /;\u0020*base64$/i.test(c.replace(/^[\t\n\f\r ]+|[\t\n\f\r ]+$/g, "")), u = 0, d = 0, f = (e) => {
		if (!l) {
			u++;
			return;
		}
		S(e) || (u++, d = e === 61 ? d + 1 : 0);
	};
	for (let n = s(); n !== -1 && n !== 35; n = s()) if (n === 37) {
		let e = i, t = C(s()), n = t < 0 ? -1 : C(s());
		if (n >= 0) {
			f(t * 16 + n);
			continue;
		}
		i = e, f(37);
	} else if (n < 128) f(n);
	else {
		let r = n >= 55296 && n <= 56319 && i < t && e.charCodeAt(i) >= 56320 && e.charCodeAt(i) <= 57343;
		r && i++;
		let a = r ? 4 : n < 2048 ? 2 : 3;
		for (let e = 0; e < a; e++) f(128);
	}
	return l ? (u % 4 == 0 && (u -= Math.min(d, 2)), Math.floor(u * 3 / 4)) : u;
}
function T(e, t, n, r) {
	if (typeof e != "string" || e.trim() === "") throw TypeError(`${t} must be a non-empty URL string`);
	let s = /^data:/i.test(e);
	if (s && n.includes("data:")) {
		let n = w(e);
		if (n === void 0) throw TypeError(`${t} must be a data: URL with a body`);
		if (n > 31457280) throw o("face", i, n);
	} else if (e.length > 8192) throw o("url", a, e.length);
	let c;
	try {
		c = r === void 0 ? new URL(e) : new URL(e, r);
	} catch {
		throw TypeError(`${t} must be an absolute URL`);
	}
	if (!n.includes(c.protocol)) throw TypeError(`${t} must use ${n.join(" / ")}`);
	let l = c.href;
	if (!s && l.length > 8192) throw o("url", a, l.length);
	return s ? e : l;
}
var E = ["https:", "http:"], D = [
	"https:",
	"http:",
	"blob:",
	"data:"
], O = { arabic: !0 };
function k(e, t) {
	if (e !== void 0) {
		if (!Array.isArray(e)) throw TypeError(`${t} must be an array`);
		return Object.freeze(e.map((e, n) => {
			let r = `${t}[${n}]`, i = u(e, r);
			d(i, [
				"for",
				"use",
				"script"
			], r);
			let a = i.script;
			if (a !== void 0 && !(typeof a == "string" && Object.prototype.hasOwnProperty.call(O, a))) throw TypeError(`${r}.script must be one of: ${Object.keys(O).join(", ")}`);
			return Object.freeze({
				for: f(i.for, `${r}.for`),
				use: f(i.use, `${r}.use`),
				...a === void 0 ? {} : { script: a }
			});
		}));
	}
}
function A(e, t = "font face declaration", n = void 0, r = !1) {
	let a = u(e, t);
	r || d(a, [
		"family",
		"url",
		"data",
		"weight",
		"style",
		"stretch",
		"unicodeRange"
	], t);
	let s = f(a.family, `${t}.family`), c = a.url !== void 0;
	if (c === (a.data !== void 0)) throw TypeError(`${t} must have exactly one of url or data`);
	let l, m;
	if (c) l = T(a.url, `${t}.url`, D, n);
	else {
		let e = x(a.data, `${t}.data`);
		if (e > 31457280) throw o("face", i, e);
		m = a.data;
	}
	let h = r && typeof a.weight == "number";
	if (h && !(a.weight >= 1 && a.weight <= 1e3)) throw TypeError(`${t}.weight must be a number from 1 to 1000 or a non-empty string`);
	let g = p(h ? String(a.weight) : a.weight, `${t}.weight`), _ = p(a.style, `${t}.style`), v = p(a.stretch, `${t}.stretch`), y = p(a.unicodeRange, `${t}.unicodeRange`);
	return Object.freeze({
		family: s,
		...l === void 0 ? {} : { url: l },
		...m === void 0 ? {} : { data: m },
		...g === void 0 ? {} : { weight: g },
		..._ === void 0 ? {} : { style: _ },
		...v === void 0 ? {} : { stretch: v },
		...y === void 0 ? {} : { unicodeRange: y }
	});
}
var j = /\{[^{}]*\}/g;
function M(t, r) {
	d(t, [
		"protocol",
		"kind",
		"urlTemplate",
		"query",
		"families",
		"substitutions",
		"credentials",
		"sharedSubsetMetricFamilies",
		"parallelFaceDownloads"
	], r);
	let i = t.parallelFaceDownloads;
	if (i !== void 0 && (typeof i != "number" || !Number.isInteger(i) || i < 1 || i > l)) throw TypeError(`${r}.parallelFaceDownloads must be an integer from 1 to ${l}`);
	let s;
	if (t.sharedSubsetMetricFamilies !== void 0) {
		let e = t.sharedSubsetMetricFamilies;
		if (!Array.isArray(e) || e.some((e) => typeof e != "string" || !n(e))) throw TypeError(`${r}.sharedSubsetMetricFamilies must be an array of family names`);
		s = Object.freeze([...e]);
	}
	let h = t.urlTemplate;
	if (typeof h != "string" || h.trim() === "") throw TypeError(`${r}.urlTemplate must be a non-empty string`);
	if (h.length > 8192) throw o("url", a, h.length);
	let g = h.match(j) ?? [];
	for (let e of g) if (e !== "{family}" && e !== "{query}") throw TypeError(`${r}.urlTemplate has unknown placeholder ${e}`);
	if (!g.includes("{family}")) throw TypeError(`${r}.urlTemplate must contain {family}`);
	if (/[{}]/.test(h.replace(j, ""))) throw TypeError(`${r}.urlTemplate has an unbalanced brace`);
	T(Q(h, "family", "query"), `${r}.urlTemplate`, E, void 0);
	let _ = p(t.query, `${r}.query`), v;
	if (t.families !== void 0) {
		let i = u(t.families, `${r}.families`), a = /* @__PURE__ */ new Set(), o = e();
		for (let [e, t] of Object.entries(i)) {
			let i = `${r}.families[${JSON.stringify(e)}]`;
			f(e, `${i} key`);
			let s = n(e);
			if (a.has(s)) throw TypeError(`${i} duplicates another family`);
			if (a.add(s), t !== !0 && (typeof t != "string" || t.trim() === "")) throw TypeError(`${i} must be true or a non-empty query string`);
			o[e] = t;
		}
		v = Object.freeze(o);
	}
	if (g.includes("{query}") && _ === void 0 && (!v || Object.values(v).some((e) => e === !0))) throw TypeError(`${r}.query is required when urlTemplate contains {query}`);
	if (v) for (let [e, t] of Object.entries(v)) $(h, e, t === !0 ? _ : t);
	else $(h, "", _);
	let y = k(t.substitutions, `${r}.substitutions`), b = m(t.credentials, `${r}.credentials`);
	return Object.freeze({
		protocol: c,
		kind: "font-css-api",
		urlTemplate: h,
		..._ === void 0 ? {} : { query: _ },
		...v === void 0 ? {} : { families: v },
		...y === void 0 ? {} : { substitutions: y },
		...b === void 0 ? {} : { credentials: b },
		...s === void 0 ? {} : { sharedSubsetMetricFamilies: s },
		...i === void 0 ? {} : { parallelFaceDownloads: i }
	});
}
function N(e, t, n) {
	d(e, [
		"protocol",
		"kind",
		"url",
		"substitutions",
		"credentials"
	], t);
	let r = T(e.url, `${t}.url`, E, n), i = k(e.substitutions, `${t}.substitutions`), a = m(e.credentials, `${t}.credentials`);
	return Object.freeze({
		protocol: c,
		kind: "font-css",
		url: r,
		...i === void 0 ? {} : { substitutions: i },
		...a === void 0 ? {} : { credentials: a }
	});
}
function P(e, t, n) {
	d(e, [
		"protocol",
		"kind",
		"faces",
		"substitutions",
		"credentials"
	], t);
	let i = e.faces;
	if (!Array.isArray(i) || i.length === 0) throw TypeError(`${t}.faces must be a non-empty array`);
	if (i.length > 2048) throw o("declarations", r, i.length);
	let a = Object.freeze(i.map((e, r) => A(e, `${t}.faces[${r}]`, n))), s = k(e.substitutions, `${t}.substitutions`), l = m(e.credentials, `${t}.credentials`);
	return Object.freeze({
		protocol: c,
		kind: "font-files",
		faces: a,
		...s === void 0 ? {} : { substitutions: s },
		...l === void 0 ? {} : { credentials: l }
	});
}
var F = /^font-resolver:[1-9]\d*$/;
function I(e, t) {
	if (d(e, [
		"protocol",
		"kind",
		"id",
		"substitutions"
	], t), typeof e.id != "string" || !F.test(e.id)) throw TypeError(`${t}.id must be a font resolver id`);
	let n = k(e.substitutions, `${t}.substitutions`);
	return Object.freeze({
		protocol: c,
		kind: "font-resolver",
		id: e.id,
		...n === void 0 ? {} : { substitutions: n }
	});
}
function L(e, t, n) {
	let r = u(e, t);
	if (r.protocol !== "ooxml-font-source/v1") throw TypeError(`${t} has unsupported protocol ${String(r.protocol)}`);
	switch (r.kind) {
		case "font-css-api": return M(r, t);
		case "font-css": return N(r, t, n);
		case "font-files": return P(r, t, n);
		case "font-resolver": return I(r, t);
		default: throw TypeError(`${t} has unsupported kind ${String(r.kind)}`);
	}
}
var R = /* @__PURE__ */ new WeakSet(), z = Symbol.for("@silurus/ooxml/font-source");
function B(e, t = !0) {
	let n = Object.freeze(Object.defineProperty({ ...e }, z, { value: t }));
	return R.add(n), n;
}
function V(e) {
	if (!Object.isFrozen(e)) return;
	let t = Object.getOwnPropertyDescriptor(e, z)?.value;
	return t === !0 || typeof t == "function" ? t : void 0;
}
function H(e, t, n) {
	let r = u(e, `${t}() options`);
	return d(r, n, `${t}() options`), r;
}
function U(e) {
	return B(M({
		...H(e, "fontCssApi", [
			"urlTemplate",
			"query",
			"families",
			"substitutions",
			"credentials"
		]),
		protocol: c,
		kind: "font-css-api"
	}, "fontCssApi()"));
}
function W(e, t) {
	return B(M({
		...H(e, "fontCssApi", [
			"urlTemplate",
			"query",
			"families",
			"substitutions",
			"credentials"
		]),
		...t.sharedSubsetMetricFamilies ? { sharedSubsetMetricFamilies: t.sharedSubsetMetricFamilies } : {},
		...t.parallelFaceDownloads === void 0 ? {} : { parallelFaceDownloads: t.parallelFaceDownloads },
		protocol: c,
		kind: "font-css-api"
	}, "fontCssApi()"));
}
function G(e) {
	return B(N({
		...H(e, "fontCss", [
			"url",
			"substitutions",
			"credentials"
		]),
		protocol: c,
		kind: "font-css"
	}, "fontCss()", s()));
}
function K(e) {
	return B(P({
		...H(e, "fontFiles", [
			"faces",
			"substitutions",
			"credentials"
		]),
		protocol: c,
		kind: "font-files"
	}, "fontFiles()", s()));
}
var q = /* @__PURE__ */ new WeakMap(), J = globalThis[Symbol.for("@silurus/ooxml/font-resolver-ids")] ??= { next: 1 };
function Y(e, t = {}) {
	if (typeof e != "function") throw TypeError("fontResolver() requires a function");
	let n = H(t, "fontResolver", ["substitutions"]), r = q.get(e);
	return r === void 0 && (r = `font-resolver:${J.next++}`, q.set(e, r)), B(I({
		...n,
		protocol: c,
		kind: "font-resolver",
		id: r
	}, "fontResolver()"), e);
}
function X(e) {
	let t = V(e);
	return typeof t == "function" ? t : void 0;
}
function Z(e) {
	if (!Array.isArray(e)) throw TypeError("fonts must be an array of font sources");
	return Object.freeze(e.map((e, t) => {
		if (typeof e != "object" || !e || !V(e)) throw TypeError(`fonts[${t}] is not a font source factory result`);
		return R.has(e) || L(e, `fonts[${t}]`, void 0), e;
	}));
}
function ee(e) {
	return e === void 0 ? void 0 : Z(e);
}
function te(e) {
	if (!Array.isArray(e)) throw TypeError("fonts must be an array of font sources");
	return Object.freeze(e.map((e, t) => {
		if (R.has(e)) return e;
		let n = L(e, `fonts[${t}]`, void 0);
		return V(e) ? e : n;
	}));
}
function Q(e, t, n) {
	return e.split("{family}").join(t).split("{query}").join(n);
}
function ne(e) {
	let t = e.replace(/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/g, "�");
	return encodeURIComponent(t).replace(/%20/g, "+");
}
function $(e, t, n) {
	let r = Q(e, ne(t), n ?? "");
	if (r.length > 8192) throw o("url", a, r.length);
	let i = new URL(r).href;
	if (i.length > 8192) throw o("url", a, i.length);
	return i;
}
function re(e, r, i = "all") {
	let a = [{ family: r.trim() }, ...t(e.substitutions, r, i).map((e) => ({
		family: e.use,
		substitution: e
	}))], o = [], s = /* @__PURE__ */ new Set();
	for (let t of a) {
		if (!t.family) continue;
		let r = t.family, i = e.query;
		if (e.families) {
			let a = n(t.family), o = Object.entries(e.families).find(([e]) => n(e) === a);
			if (!o) continue;
			r = o[0], o[1] !== !0 && (i = o[1]);
		}
		let a = $(e.urlTemplate, r, i);
		s.has(a) || (s.add(a), o.push({
			family: r,
			url: a,
			...t.substitution ? { substitution: t.substitution } : {}
		}));
	}
	return o;
}
export { re as a, X as c, W as d, A as f, U as i, Z as l, w as n, K as o, G as r, Y as s, te as t, ee as u };
