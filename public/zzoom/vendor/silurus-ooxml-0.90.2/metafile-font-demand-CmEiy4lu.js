import { c as e, i as t, k as n, n as r, s as i } from "./wmf-HY7sNn5s.js";
import { i as a, n as o, r as s } from "./substitutions-_KDT_mVq.js";
import { t as c } from "./ooxml-error-DbICW35n.js";
import { n as l, t as u } from "./font-registry-CA7E7o7P.js";
import { l as d, o as f } from "./resource-policy.generated-D_HlV2Rm.js";
import { t as p } from "./abort-JztSoyw2.js";
import { t as m } from "./font-source-limit-sNrowgTE.js";
import { a as h, f as g, n as ee, t as _ } from "./source-GXgH3t1X.js";
import { a as v, i as y, n as b, o as x, r as te, s as S, t as ne } from "./resolver-resolution-BSl7OugA.js";
import { c as re, d as C, l as ie, m as w, n as ae, p as T, s as oe, u as se } from "./resolver-failures-0-_PZr5v.js";
import { n as ce, t as le } from "./unicode-range-CD3UJT9S.js";
import { a as ue, i as de, n as fe, o as pe, s as me, t as he } from "./face-download-BGnp7NTs.js";
import { t as ge } from "./scalar-demand-bzQ71V_C.js";
var E = (e) => e === 32 || e === 9 || e === 10 || e === 12 || e === 13, _e = (e) => e >= 48 && e <= 57 || e >= 65 && e <= 90 || e >= 97 && e <= 122 || e === 45 || e === 95 || e >= 128;
function ve(e, t) {
	let n = e.indexOf("*/", t + 2);
	return n < 0 ? e.length : n + 2;
}
var ye = "()[]{},:;", D = (e) => e !== void 0 && e >= "0" && e <= "9";
function be(e, t) {
	let n = e[t];
	return D(n) ? !0 : n === "." ? D(e[t + 1]) : n === "+" || n === "-" ? D(e[t + 1]) || e[t + 1] === "." && D(e[t + 2]) : !1;
}
function xe(e, t) {
	let n = L(e, t);
	if (e[n.end] !== "(") return {
		token: {
			type: "ident",
			value: n.value
		},
		end: n.end
	};
	if (n.value.toLowerCase() === "url") {
		let t = n.end + 1;
		for (; t < e.length && E(e.charCodeAt(t));) t++;
		if (e[t] !== "\"" && e[t] !== "'") {
			let t = Fe(e, n.end + 1);
			return {
				token: t.value === null ? { type: "bad-url" } : {
					type: "url",
					value: t.value
				},
				end: t.end
			};
		}
	}
	return {
		token: {
			type: "function",
			value: n.value
		},
		end: n.end + 1
	};
}
function O(e, t) {
	let n = e[t];
	if (n === "/" && e[t + 1] === "*") return {
		token: { type: "comment" },
		end: ve(e, t)
	};
	if (E(e.charCodeAt(t))) {
		let n = t + 1;
		for (; n < e.length && E(e.charCodeAt(n));) n++;
		return {
			token: { type: "whitespace" },
			end: n
		};
	}
	if (n === "\"" || n === "'") {
		let n = Oe(e, t);
		return {
			token: n.bad ? { type: "bad-string" } : {
				type: "string",
				value: n.value
			},
			end: n.end
		};
	}
	if (be(e, t)) {
		Ie.lastIndex = t;
		let n = Ie.exec(e), r = Number(n[0]), i = t + n[0].length;
		if (I(e, i)) {
			let t = L(e, i);
			return {
				token: {
					type: "dimension",
					value: r,
					unit: t.value.toLowerCase()
				},
				end: t.end
			};
		}
		return e[i] === "%" ? {
			token: {
				type: "percentage",
				value: r
			},
			end: i + 1
		} : {
			token: {
				type: "number",
				value: r
			},
			end: i
		};
	}
	if (n === "#" && (_e(e.charCodeAt(t + 1)) || F(e, t + 1))) {
		let n = I(e, t + 1), r = L(e, t + 1);
		return {
			token: {
				type: "hash",
				value: r.value,
				id: n
			},
			end: r.end
		};
	}
	if (n === "-" && e.startsWith("-->", t)) return {
		token: { type: "CDC" },
		end: t + 3
	};
	if (n === "<" && e.startsWith("<!--", t)) return {
		token: { type: "CDO" },
		end: t + 4
	};
	if (n === "@" && I(e, t + 1)) {
		let n = L(e, t + 1);
		return {
			token: {
				type: "at-keyword",
				value: n.value
			},
			end: n.end
		};
	}
	if (I(e, t)) return xe(e, t);
	if (ye.includes(n)) return {
		token: { type: n },
		end: t + 1
	};
	let r = e.codePointAt(t);
	return {
		token: {
			type: "delim",
			value: String.fromCodePoint(r)
		},
		end: t + (r > 65535 ? 2 : 1)
	};
}
function Se(e) {
	return e.replace(/\r\n?|\f/g, "\n").replace(/\0|[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/g, N);
}
function k(e, t, n) {
	let r = [], i = t;
	for (; i < e.length;) {
		let { token: t, end: a } = O(e, i), o = t.type;
		if (r.length === 0 && o.length === 1 && n.includes(o)) return i;
		o === "(" || o === "function" ? r.push(")") : o === "[" ? r.push("]") : o === "{" ? r.push("}") : r.length && o === r[r.length - 1] && r.pop(), i = a;
	}
	return e.length;
}
function Ce(e, t) {
	let n = k(e, t + 1, "}");
	return n < e.length ? n : -1;
}
function A(e) {
	let t = "";
	for (let n = 0; n < e.length;) {
		let { token: r, end: i } = O(e, n);
		t += r.type === "comment" ? " " : e.slice(n, i), n = i;
	}
	return t;
}
function we(e, t) {
	let n = [], r = 0;
	for (; r <= e.length;) {
		let i = k(e, r, t);
		n.push(e.slice(r, i)), r = i + 1;
	}
	return n;
}
var Te = /^[ \t\n]*([A-Za-z][A-Za-z-]*)[ \t\n]*:((?:[^;'"\\(){}[\]!<*/]|\/(?!\*)|'[^'\\\n;{}()[\]*]*'|\((?:[^()'"\\;{}[\]\n*]|'[^'\\\n;{}()[\]*]*')*\))*)$/, j = /\/\*[^]*?\*\/|@font-face[ \t\n]*\{([^{}]*)\}|[ \t\n]+|[^]/gy;
function Ee(e) {
	let t = [];
	j.lastIndex = 0;
	for (let n = j.exec(e); n; n = j.exec(e)) {
		let [e, r] = n;
		if (r === void 0) {
			if (e.length > 1 || /[ \t\n]/.test(e)) continue;
			return null;
		}
		let i = it();
		for (let e of r.split(";")) {
			if (/^[ \t\n]*$/.test(e)) continue;
			let t = Te.exec(e);
			if (!t) return null;
			rt(i, t[1].toLowerCase(), t[2]);
		}
		t.push(i);
	}
	return t;
}
var M = (e) => e === "\n" || e === "\r" || e === "\f", De = (e) => e >= 48 && e <= 57 || e >= 65 && e <= 70 || e >= 97 && e <= 102, N = "�";
function P(e, t) {
	let n = t + 1;
	if (n >= e.length) return {
		value: N,
		end: n
	};
	let r = 0;
	for (; r < 6 && n + r < e.length && De(e.charCodeAt(n + r));) r++;
	if (r === 0) {
		let t = e.codePointAt(n);
		return {
			value: t === 0 ? N : String.fromCodePoint(t),
			end: n + (t > 65535 ? 2 : 1)
		};
	}
	let i = parseInt(e.slice(n, n + r), 16);
	return n += r, e.startsWith("\r\n", n) ? n += 2 : n < e.length && E(e.charCodeAt(n)) && n++, {
		value: i === 0 || i >= 55296 && i <= 57343 || i > 1114111 ? N : String.fromCodePoint(i),
		end: n
	};
}
function Oe(e, t) {
	let n = e[t], r = "", i = t + 1;
	for (; i < e.length;) {
		let t = e[i];
		if (t === n) return {
			value: r,
			end: i + 1,
			bad: !1
		};
		if (M(t)) return {
			value: r,
			end: i,
			bad: !0
		};
		if (t !== "\\") {
			r += t, i++;
			continue;
		}
		let a = e[i + 1];
		if (a === void 0) {
			i++;
			continue;
		}
		if (M(a)) {
			i += e.startsWith("\r\n", i + 1) ? 3 : 2;
			continue;
		}
		let o = P(e, i);
		r += o.value, i = o.end;
	}
	return {
		value: r,
		end: i,
		bad: !1
	};
}
function ke(e) {
	if (e[0] !== "\"" && e[0] !== "'") return null;
	let t = Oe(e, 0);
	return t.bad || t.end !== e.length ? null : t.value;
}
var Ae = new Set([
	"inherit",
	"initial",
	"unset",
	"revert",
	"revert-layer",
	"default",
	"serif",
	"sans-serif",
	"monospace",
	"cursive",
	"fantasy",
	"system-ui",
	"math",
	"emoji",
	"fangsong"
]), je = (e) => e !== void 0 && (/[A-Za-z_]/.test(e) || e.charCodeAt(0) >= 128), F = (e, t) => e[t] === "\\" && !M(e[t + 1]);
function I(e, t) {
	return e[t] === "-" ? e[t + 1] === "-" || je(e[t + 1]) || F(e, t + 1) : je(e[t]) || F(e, t);
}
function L(e, t) {
	let n = "", r = t;
	for (; r < e.length;) if (F(e, r)) {
		let t = P(e, r);
		n += t.value, r = t.end;
	} else if (_e(e.charCodeAt(r))) n += e[r++];
	else break;
	return {
		value: n,
		end: r
	};
}
function Me(e) {
	let t = [], n = 0;
	for (; n < e.length;) {
		if (E(e.charCodeAt(n))) {
			n++;
			continue;
		}
		if (!I(e, n)) return null;
		let r = L(e, n);
		if (n = r.end, n < e.length && !E(e.charCodeAt(n))) return null;
		t.push(r.value);
	}
	return t;
}
function Ne(e) {
	let t = R(e);
	if (t.startsWith("\"") || t.startsWith("'")) return ke(t)?.trim() || null;
	let n = Me(t);
	return !n?.length || n.length === 1 && Ae.has(n[0].toLowerCase()) ? null : n.join(" ").trim() || null;
}
var R = (e) => e.replace(/^[ \t\n\f\r]+|[ \t\n\f\r]+$/g, ""), Pe = (e) => e <= 8 || e === 11 || e >= 14 && e <= 31 || e === 127;
function Fe(e, t) {
	let n = t;
	for (; n < e.length && E(e.charCodeAt(n));) n++;
	let r = "", i = () => {
		for (; n < e.length;) {
			if (e[n] === ")") return {
				value: null,
				end: n + 1
			};
			F(e, n) ? n = P(e, n).end : n++;
		}
		return {
			value: null,
			end: n
		};
	};
	for (; n < e.length;) {
		let t = e[n], a = e.charCodeAt(n);
		if (t === ")") return {
			value: r,
			end: n + 1
		};
		if (E(a)) {
			for (; n < e.length && E(e.charCodeAt(n));) n++;
			return n >= e.length ? {
				value: r,
				end: n
			} : e[n] === ")" ? {
				value: r,
				end: n + 1
			} : i();
		}
		if (t === "\"" || t === "'" || t === "(" || Pe(a)) return i();
		if (t === "\\") {
			if (!F(e, n)) return i();
			let t = P(e, n);
			r += t.value, n = t.end;
			continue;
		}
		r += t, n++;
	}
	return {
		value: r,
		end: n
	};
}
var Ie = /[+-]?(?:\d+(?:\.\d+)?|\.\d+)(?:[eE][+-]?\d+)?/y;
function z(e) {
	let t = [], n = 0;
	for (; n < e.length;) {
		let { token: r, end: i } = O(e, n);
		switch (r.type) {
			case "whitespace":
			case "comment": break;
			case "string":
			case "ident":
			case "url":
				t.push({
					type: r.type,
					value: r.value
				});
				break;
			case "number":
			case "percentage":
				t.push({
					type: r.type,
					value: r.value
				});
				break;
			case "dimension":
				t.push({
					type: "dimension",
					value: r.value,
					unit: r.unit
				});
				break;
			case "bad-string":
			case "bad-url":
				t.push({ type: "bad" });
				break;
			case ",":
				t.push({ type: "comma" });
				break;
			case "function": {
				let a = k(e, i, ")");
				if (a >= e.length) return t.push({ type: "bad" }), t;
				t.push({
					type: "function",
					name: r.value.toLowerCase(),
					args: e.slice(i, a)
				}), n = a + 1;
				continue;
			}
			default:
				t.push({
					type: "delim",
					value: e.slice(n, i)
				});
				break;
		}
		n = i;
	}
	return t;
}
function Le(e) {
	let t = [[]];
	for (let n of e) n.type === "comma" ? t.push([]) : t[t.length - 1].push(n);
	return t;
}
var Re = new Set([
	"calc",
	"min",
	"max",
	"clamp",
	"round",
	"mod",
	"rem",
	"sin",
	"cos",
	"tan",
	"asin",
	"acos",
	"atan",
	"atan2",
	"pow",
	"sqrt",
	"hypot",
	"log",
	"exp",
	"abs",
	"sign"
]), B = (e) => e.type === "function" && Re.has(e.name) ? `${e.name}(${e.args})` : null, V = (e) => e?.type === "ident" ? e.value.toLowerCase() : void 0;
function ze(e, t) {
	let n = z(e);
	if (n.length === 0 || n.length > 2) return null;
	if (n.length === 1 && V(n[0]) === "auto") return {};
	let r = n.map(t);
	return r.every((e) => e !== null) ? { value: r.join(" ") } : null;
}
function Be(e) {
	return ze(e, (e) => {
		let t = V(e);
		return t === "normal" || t === "bold" ? t : e.type === "number" ? e.value >= 1 && e.value <= 1e3 ? String(e.value) : null : B(e);
	});
}
var Ve = new Set([
	"normal",
	"ultra-condensed",
	"extra-condensed",
	"condensed",
	"semi-condensed",
	"semi-expanded",
	"expanded",
	"extra-expanded",
	"ultra-expanded"
]);
function He(e) {
	return ze(e, (e) => {
		let t = V(e);
		return t === void 0 ? e.type === "percentage" ? e.value >= 0 ? `${e.value}%` : null : B(e) : Ve.has(t) ? t : null;
	});
}
var Ue = {
	deg: 1,
	grad: .9,
	rad: 180 / Math.PI,
	turn: 360
};
function We(e) {
	let t = z(e);
	if (t.length === 0) return null;
	let n = V(t[0]);
	if (t.length === 1 && n === "auto") return {};
	if (t.length === 1 && (n === "normal" || n === "italic")) return { value: n };
	if (n !== "oblique" || t.length > 3) return null;
	let r = [];
	for (let e of t.slice(1)) {
		let t = B(e);
		if (t) {
			r.push(t);
			continue;
		}
		if (e.type !== "dimension" || !Object.hasOwn(Ue, e.unit)) return null;
		let n = e.value * Ue[e.unit];
		if (!(n >= -90 && n <= 90)) return null;
		r.push(`${e.value}${e.unit}`);
	}
	return { value: ["oblique", ...r].join(" ") };
}
var Ge = new Set([
	"collection",
	"embedded-opentype",
	"opentype",
	"svg",
	"truetype",
	"woff",
	"woff2"
]), Ke = new Set([
	"woff2",
	"woff",
	"truetype",
	"opentype",
	"collection",
	"woff2-variations",
	"woff-variations",
	"truetype-variations",
	"opentype-variations"
]), qe = new Set([
	"woff2",
	"woff",
	"truetype",
	"opentype",
	"woff2-variations",
	"woff-variations",
	"truetype-variations",
	"opentype-variations"
]), Je = new Set([
	"features-opentype",
	"features-aat",
	"features-graphite",
	"color-colrv0",
	"color-colrv1",
	"color-svg",
	"color-sbix",
	"color-cbdt",
	"variations",
	"palettes",
	"incremental-patch",
	"incremental-range",
	"incremental-auto"
]);
function Ye(e) {
	let [t, ...n] = e;
	if (!t) return null;
	if (t.type === "function" && t.name === "local") return n.length === 0 && Ne(t.args) !== null ? { url: null } : null;
	let r = null;
	if (t.type === "url") r = t.value;
	else if (t.type === "function" && t.name === "url") {
		let e = z(t.args);
		if (r = e.length === 1 && e[0].type === "string" ? e[0].value : null, r === null) return null;
	} else return null;
	let i = 0, a = r !== "", o = n[i];
	if (o?.type === "function" && o.name === "format") {
		let e = z(o.args);
		if (e.length !== 1) return null;
		let [t] = e;
		if (t.type !== "string" && !(t.type === "ident" && Ge.has(t.value.toLowerCase()))) return null;
		let n = t.value.toLowerCase();
		if (!Ke.has(n)) return null;
		a &&= qe.has(n), i++;
	}
	let s = n[i];
	if (s?.type === "function" && s.name === "tech") {
		if (!Le(z(s.args)).every((e) => e.length === 1 && Je.has(V(e[0]) ?? ""))) return null;
		a = !1, i++;
	}
	return i === n.length ? { url: a ? r : null } : null;
}
function Xe(e, t) {
	let n = !1, r = null;
	for (let i of we(e, ",")) {
		let e = Ye(z(i));
		(t ? t(R(i)) : e !== null) && (n = !0, r === null && e?.url && (r = e.url));
	}
	return n ? { url: r } : null;
}
var Ze = /^[ \t\n]*url\(([^\s"'()\\\x00-\x08\x0b\x0e-\x1f\x7f]+)\)[ \t\n]+format\('(woff2|woff|truetype|opentype)'\)[ \t\n]*$/;
function Qe(e, t) {
	let n = Ze.exec(e);
	if (n) return t && !t.srcEntry(`url(u) format('${n[2]}')`) ? null : { url: n[1] };
}
function $e(e) {
	let t = R(A(e));
	return t.includes("\\") || !le(t) ? null : { value: t.split(",").map(R).join(", ") };
}
var et = {
	weight: Be,
	style: We,
	stretch: He,
	unicodeRange: $e
}, H = "ooxml-descriptor-probe", tt = /* @__PURE__ */ new WeakMap();
function nt() {
	let e = globalThis.FontFace;
	if (typeof e != "function") return null;
	let t = tt.get(e);
	t || (t = w((t) => {
		let n = t.indexOf("\n"), r = t.slice(0, n), i = t.slice(n + 1);
		try {
			let t = r === "src" ? new e(H, i) : new e(H, `local(${H})`, { [r]: i });
			return t.loaded?.catch(() => void 0), t.status !== "error";
		} catch {
			return !1;
		}
	}, 1 << 20), tt.set(e, t));
	let n = t;
	return {
		descriptor: (e, t) => n(`${e}\n${t}`) ? { value: t } : null,
		srcEntry: (e) => n(`src\n${e}`)
	};
}
function rt(e, t, n) {
	switch (t) {
		case "font-family":
			e.family = Ne(n) ?? e.family;
			break;
		case "src":
			e.srcCandidates.push(n);
			break;
		case "font-weight":
			e.candidates.weight.push(R(n));
			break;
		case "font-style":
			e.candidates.style.push(R(n));
			break;
		case "font-stretch":
			e.candidates.stretch.push(R(n));
			break;
		case "unicode-range":
			e.candidates.unicodeRange.push(R(n));
			break;
		default: break;
	}
}
var it = () => ({
	family: null,
	srcCandidates: [],
	candidates: {
		weight: [],
		style: [],
		stretch: [],
		unicodeRange: []
	}
});
function at(e) {
	let t = it();
	for (let n of we(e, ";")) {
		let e = A(n), r = k(e, 0, ":{");
		if (r >= e.length || e[r] !== ":") continue;
		let i = Me(e.slice(0, r));
		if (i?.length !== 1) continue;
		let a = e.slice(r + 1);
		k(a, 0, "{") < a.length || /!\s*important\s*$/i.test(a) || rt(t, i[0].toLowerCase(), a);
	}
	return t;
}
function ot({ family: e, srcCandidates: t, candidates: n }, r, i, a) {
	let o = {};
	for (let e of Object.keys(n)) {
		let t = n[e];
		for (let n = t.length - 1; n >= 0; n--) {
			let r = a ? a.descriptor(e, t[n]) : et[e](t[n]);
			if (r !== null) {
				r.value !== void 0 && (o[e] = r.value);
				break;
			}
		}
	}
	let s = null;
	for (let e = t.length - 1; e >= 0; e--) {
		let n = Qe(t[e], a) ?? Xe(t[e], a ? a.srcEntry : null);
		if (n !== null) {
			s = n.url;
			break;
		}
	}
	if (!e || !s) return null;
	let l = s;
	if (!/^\s*data:/i.test(s)) try {
		l = new URL(s, r).href;
	} catch {
		return null;
	}
	try {
		return g({
			family: e,
			url: l,
			...o
		}, i);
	} catch (e) {
		if (e instanceof c) throw e;
		return null;
	}
}
function st(e) {
	let t = 0;
	for (let n = 0; n < e.length; n++) {
		let r = e.charCodeAt(n);
		r < 128 ? t += 1 : r < 2048 ? t += 2 : r >= 55296 && r <= 56319 && n + 1 < e.length && e.charCodeAt(n + 1) >= 56320 && e.charCodeAt(n + 1) <= 57343 ? (t += 4, n++) : t += 3;
	}
	return t;
}
function ct(e, t) {
	if (e.length * 3 > 1048576) {
		let t = st(e);
		if (t > 1048576) throw m("stylesheet", d, t);
	}
	e = Se(e);
	let n = [], r = nt(), i = Ee(e);
	if (i) {
		for (let e of i) {
			let i = ot(e, t, `stylesheet @font-face #${n.length + 1}`, r);
			if (i) {
				if (n.length >= 2048) throw m("declarations", f, n.length + 1);
				n.push(i);
			}
		}
		return n;
	}
	let a = 0;
	for (; a < e.length;) {
		let { token: i, end: o } = O(e, a), s = i.type;
		if (s === "whitespace" || s === "comment" || s === "CDO" || s === "CDC") {
			a = o;
			continue;
		}
		let c = i.type === "at-keyword" ? i.value : void 0, l = c !== void 0, u = l ? o : a, d = k(e, u, l ? ";{" : "{");
		if (d >= e.length) break;
		if (e[d] === ";") {
			a = d + 1;
			continue;
		}
		let p = Ce(e, d);
		if (c?.toLowerCase() === "font-face" && A(e.slice(u, d)).trim() === "" && p >= 0) {
			let i = ot(at(e.slice(d + 1, p)), t, `stylesheet @font-face #${n.length + 1}`, r);
			if (i) {
				if (n.length >= 2048) throw m("declarations", f, n.length + 1);
				n.push(i);
			}
		}
		if (p < 0) break;
		a = p + 1;
	}
	return n;
}
function lt(e) {
	try {
		e.body?.cancel?.().catch(() => void 0);
	} catch {}
}
async function ut(e) {
	let t = d, n = Number(e.headers?.get("content-length") ?? NaN);
	if (Number.isSafeInteger(n) && n > t) throw lt(e), m("stylesheet", t, n);
	let r = typeof e.body?.getReader == "function" ? e.body.getReader() : null;
	if (!r) {
		let n = await e.text(), r = st(n);
		if (r > t) throw m("stylesheet", t, r);
		return n;
	}
	let i = new TextDecoder("utf-8"), a = 0, o = "";
	for (;;) {
		let { done: e, value: n } = await r.read();
		if (e) break;
		if (n) {
			if (a += n.byteLength, a > t) throw r.cancel().catch(() => void 0), m("stylesheet", t, a);
			o += i.decode(n, { stream: !0 });
		}
	}
	return o + i.decode();
}
async function dt(e, t, n) {
	if (typeof fetch != "function") return {
		ok: !1,
		reason: "fetch is unavailable"
	};
	let r = new AbortController(), i = () => r.abort();
	n.addEventListener("abort", i, { once: !0 }), n.aborted && r.abort();
	let a = !1, o, s;
	try {
		if (o = await fetch(e, {
			credentials: t ?? "same-origin",
			signal: r.signal
		}), !o.ok) return lt(o), {
			ok: !1,
			reason: `HTTP ${o.status ?? "error"}`
		};
		s = await ut(o), a = !0;
	} catch (e) {
		if (n.aborted && !(e instanceof c)) throw e;
		return {
			ok: !1,
			reason: e instanceof Error ? e.message : String(e)
		};
	} finally {
		n.removeEventListener("abort", i), a || r.abort();
	}
	let l = o.url || e;
	if (!/^https?:/i.test(l)) return {
		ok: !1,
		reason: "stylesheet redirected off http(s)"
	};
	let u;
	try {
		u = ct(s, l);
	} catch (e) {
		if (!(e instanceof c)) throw e;
		return {
			ok: !1,
			reason: e.message
		};
	}
	return u.length === 0 ? {
		ok: !1,
		reason: "no usable @font-face rule"
	} : {
		ok: !0,
		declarations: u,
		finalUrl: l
	};
}
function ft(e, t, n, r, i) {
	return e.stylesheets.join(t, (e) => dt(t, n, e), r, i);
}
var pt = /* @__PURE__ */ new WeakMap();
async function mt(e, t, n, r, i, a) {
	let s;
	try {
		s = h(e, n, a);
	} catch (e) {
		if (!(e instanceof c)) throw e;
		return {
			kind: "failed",
			reason: e.message
		};
	}
	if (s.length === 0) return { kind: "absent" };
	let l = await Promise.all(s.map((n) => ft(t, n.url, e.credentials, r, i))), u = [];
	for (let e = 0; e < s.length; e++) {
		let t = s[e], n = l[e];
		if (!n.ok) {
			u.push(n.reason);
			continue;
		}
		let r = o(t.family), i = n.declarations.filter((e) => o(e.family) === r);
		if (i.length === 0) {
			u.push(`no @font-face rule for ${t.family}`);
			continue;
		}
		return {
			kind: "claimed",
			served: i[0].family,
			...t.substitution ? { substitution: t.substitution } : {},
			declarations: i
		};
	}
	return {
		kind: "failed",
		reason: u.join("; ")
	};
}
async function ht(e, t, n, r, i, a) {
	let o = await ft(t, e.url, e.credentials, r, i);
	if (!o.ok) return {
		kind: "failed",
		reason: o.reason
	};
	let s = pt.get(o);
	return s || (s = x(o.declarations), pt.set(o, s)), v(s, n, e.substitutions, a);
}
async function gt(e, t, n, r, i = () => "all") {
	let s = await Promise.all(n.map(async (n) => {
		let s = o(n), c = i(n);
		return [s, await t.families.join(a(n, c), (r, i) => e.kind === "font-css-api" ? mt(e, t, n, r, i, c) : ht(e, t, n, r, i, c), r, t)];
	}));
	return new Map(s);
}
var _t = class {
	limit;
	active = 0;
	queue = [];
	jobs = /* @__PURE__ */ new Map();
	constructor(e) {
		this.limit = e;
	}
	run(e, t, n, r) {
		if (r?.aborted) return Promise.reject(p("Decode wait aborted"));
		let i = this.jobs.get(e);
		if (!i) {
			let t, r = new Promise((e) => {
				t = e;
			});
			i = {
				key: e,
				work: n,
				holders: /* @__PURE__ */ new Set(),
				started: !1,
				done: r,
				settle: t
			}, this.jobs.set(e, i), this.queue.push(i);
		}
		if (i.holders.add(t), this.pump(), !r) return i.done;
		let a = i;
		return new Promise((e, n) => {
			let i = () => {
				this.leave(a, t), n(p("Decode wait aborted"));
			};
			r.addEventListener("abort", i, { once: !0 }), a.done.then(() => {
				r.removeEventListener("abort", i), e();
			});
		});
	}
	release(e) {
		for (let t of [...this.jobs.values()]) this.leave(t, e);
	}
	get size() {
		return this.jobs.size;
	}
	leave(e, t) {
		if (e.holders.delete(t), e.started || e.holders.size > 0) return;
		let n = this.queue.indexOf(e);
		n >= 0 && this.queue.splice(n, 1), this.jobs.get(e.key) === e && this.jobs.delete(e.key), e.settle();
	}
	pump() {
		for (; this.active < this.limit && this.queue.length > 0;) {
			let e = this.queue.shift();
			e.started = !0, this.active++, e.work().catch(() => void 0).then(() => {
				this.active--, this.jobs.get(e.key) === e && this.jobs.delete(e.key), e.settle(), this.pump();
			});
		}
	}
}, U = /* @__PURE__ */ new WeakMap(), vt = 0, yt = new _t(2);
function bt(e, t, n, r) {
	return U.has(e) ? Promise.resolve() : yt.run(e, n, () => xt(e, t), r);
}
async function xt(e, t) {
	if (U.has(e)) return;
	let n = null;
	try {
		n = await t(e);
	} catch {
		n = null;
	}
	U.set(e, n);
}
var St = Object.freeze({
	faces: Object.freeze([]),
	substitutions: /* @__PURE__ */ new Map(),
	regularAliases: /* @__PURE__ */ new Map(),
	families: /* @__PURE__ */ new Map()
});
function Ct(e, t) {
	if (e === void 0) return [];
	if (!Array.isArray(e)) throw TypeError(`${t} must be an array of family names`);
	return e.map((e, n) => {
		if (typeof e != "string") throw TypeError(`${t}[${n}] must be a string`);
		return e.trim();
	});
}
function wt(e) {
	if (!e || typeof e != "object") throw TypeError("font demand must be an object");
	let t = [], n = /* @__PURE__ */ new Set(), r = y(e.substituteScripts), i = (e, i) => {
		for (let a of e) {
			let e = W(a);
			!e || n.has(e) || (n.add(e), t.push({
				name: a,
				fallback: i,
				scripts: r(a)
			}));
		}
	};
	return i(Ct(e.families, "font demand families"), !1), i(Ct(e.fallbackFamilies, "font demand fallbackFamilies"), !0), {
		names: t,
		scalars: Tt(e.scalars)
	};
}
function Tt(e) {
	if (e === "all") return "all";
	if (!Array.isArray(e)) throw TypeError("font demand scalars must be 'all' or an array");
	let t = /* @__PURE__ */ new Set();
	for (let n of e) {
		if (!Number.isInteger(n) || n < 0 || n > 1114111) throw TypeError("font demand scalars must be integers in U+0000..U+10FFFF");
		t.add(n);
	}
	return t.size > 65536 ? "all" : [...t].sort((e, t) => e - t);
}
var W = w(o, 65536), Et = w(ce, 1 << 20);
function G(e) {
	return e === void 0 ? null : Et(e);
}
function Dt(e, t) {
	let n = t.length;
	for (let r = 0; r < e.length; r += 2) {
		let i = e[r], a = 0, o = n;
		for (; a < o;) {
			let e = a + o >>> 1;
			t[e] < i ? a = e + 1 : o = e;
		}
		if (a < n && t[a] <= e[r + 1]) return !0;
	}
	return !1;
}
function K(e) {
	let t = /* @__PURE__ */ new Map();
	return (n) => {
		let r = t.get(n);
		return r === void 0 && t.set(n, r = Dt(n, e)), r;
	};
}
function q({ style: e = "normal" }) {
	let t = e.trim().toLowerCase();
	return t === "normal" || t === "italic" || t === "oblique" ? t : void 0;
}
function Ot(e, t) {
	let n = q(e), r = q(t);
	return n === void 0 || r === void 0 || n === r;
}
function kt(e) {
	let t = e.map((e) => G(e.unicodeRange)), n = "";
	for (let r = 0; r < t.length && n !== void 0; r++) {
		let i = t[r], a = i ? At.get(i) : void 0;
		i && a === void 0 && At.set(i, a = ++jt), n += `${a ?? ""}${q(e[r])?.[0] ?? "?"},`, n.length > Mt && (n = void 0);
	}
	let r = n === void 0 ? void 0 : J.get(n);
	if (r) return [...r];
	let i = e.map((e, t) => t), a = (e) => {
		for (; i[e] !== e;) i[e] = i[i[e]], e = i[e];
		return e;
	}, o = (e, t) => {
		let n = a(e), r = a(t);
		n !== r && (i[Math.max(n, r)] = Math.min(n, r));
	}, s = /* @__PURE__ */ new Map(), c = 0, l = [];
	t.forEach((e, t) => {
		if (e === null) return;
		let n = s.get(e);
		if (n !== void 0) {
			o(n, t);
			return;
		}
		s.set(e, t), l.push(t), c += e.length / 2;
	});
	let u = new Uint32Array(c), d = new Uint32Array(c), f = new Float64Array(c), p = 0;
	for (let e of l) {
		let n = t[e];
		for (let t = 0; t < n.length; t += 2) u[p] = n[t + 1], d[p] = e, f[p] = n[t] * 4294967296 + p, p++;
	}
	e.forEach((n, r) => {
		t[r] === null && e.forEach((e, t) => {
			t !== r && Ot(n, e) && o(r, t);
		});
	}), f.sort();
	let m = -1, h = -1;
	for (let e = 0; e < c; e++) {
		let t = f[e], n = t % 4294967296, r = (t - n) / 4294967296, i = u[n], a = d[n];
		r <= m && o(h, a), i > m && (m = i, h = a);
	}
	let g = e.map((e, t) => a(t));
	return n !== void 0 && (Y += n.length, Y > Nt && (J.clear(), Y = n.length), J.set(n, [...g])), g;
}
var At = /* @__PURE__ */ new WeakMap(), jt = 0, J = /* @__PURE__ */ new Map(), Y = 0, Mt = 65536, Nt = 1 << 20;
function Pt(e) {
	return [
		W(e.family),
		e.weight ?? "",
		e.style ?? "",
		e.stretch ?? "",
		e.unicodeRange ?? "",
		e.data === void 0 ? e.url ?? "" : C(e.data)
	].join("|");
}
function Ft(e, t) {
	let { data: n, url: r = "" } = t, i = n === void 0 && /^\s*data:/i.test(r);
	return [
		e,
		W(t.family),
		t.weight ?? "",
		t.style ?? "",
		t.stretch ?? "",
		t.unicodeRange ?? "",
		n === void 0 ? i ? C(r) : r : C(n)
	].join("|");
}
function It(e) {
	let t = e.kind === "font-css-api" ? e.parallelFaceDownloads : void 0;
	return `${e.credentials ?? "same-origin"}\u0000${t ?? ""}`;
}
function X(e) {
	let t = {};
	return e.weight && (t.weight = e.weight), e.style && (t.style = e.style), e.stretch && (t.stretch = e.stretch), e.unicodeRange && (t.unicodeRange = e.unicodeRange), t;
}
var Lt = 1e3;
function Rt({ weight: e = "normal" }) {
	let t = e.trim().toLowerCase();
	return t === "normal" ? 400 : t === "bold" ? 700 : /^[0-9]+$/.test(t) ? Number(t) : void 0;
}
function zt(e) {
	if (!e) return;
	let t = [...new Set(e)].sort((e, t) => e - t);
	return t.length >= 2 && t.every((e) => Number.isInteger(e) && e >= 1 && e <= 1e3) ? Object.freeze(t) : void 0;
}
var Bt = /* @__PURE__ */ new WeakSet();
function Vt(e, t) {
	if (t === void 0) return e;
	let n = Object.freeze({
		...e,
		weight: t
	});
	Bt.add(n);
	let r = Z.get(e);
	return r !== void 0 && Z.set(n, r), n;
}
var Z = /* @__PURE__ */ new WeakMap();
function Ht(e) {
	if (e?.kind !== "font-css-api" || e.parallelFaceDownloads === void 0) return !1;
	let t = globalThis;
	try {
		return t.document !== void 0 && !t.navigator?.serviceWorker?.controller;
	} catch {
		return !1;
	}
}
function Ut(e, t, n, r) {
	let i = me(t, n), a = Z.get(t) ?? t.url;
	return a !== void 0 && Ht(e) && r(a, n.byteLength) && Z.set(i, a), i;
}
function Q(e) {
	return `url("${e.replace(/[\\"\n\r\f]/g, (e) => e === "\\" || e === "\"" ? `\\${e}` : `\\${e.charCodeAt(0).toString(16)} `)}")`;
}
function Wt(e) {
	console.warn(`[ooxml] failed to preload web font(s): ${e.map(([e, t]) => `${e} (${t})`).join(", ")}; falling back to system fonts (text may shift or differ).`);
}
function Gt(e, t, n) {
	return m(e, t, n).message;
}
var Kt = () => void 0, qt = (e) => e instanceof Error && e.name === "AbortError";
function $(e, t) {
	let n = new AbortController(), r = !1, i = Date.now() + t, a = () => n.abort();
	e.addEventListener("abort", a, { once: !0 });
	let o = setTimeout(() => {
		r = !0, n.abort(he);
	}, t);
	return e.aborted && n.abort(), {
		signal: n.signal,
		expired: () => r,
		remaining: () => r ? 0 : Math.max(0, i - Date.now()),
		dispose: () => {
			clearTimeout(o), e.removeEventListener("abort", a), n.abort();
		}
	};
}
function Jt(e, t) {
	return t.aborted ? Promise.resolve(void 0) : new Promise((n, r) => {
		let i = () => n(void 0);
		t.addEventListener("abort", i, { once: !0 }), e.then((e) => {
			t.removeEventListener("abort", i), n(e);
		}, (e) => {
			t.removeEventListener("abort", i), r(e);
		});
	});
}
function Yt(e, t) {
	return e === "all" || t === "all" ? "all" : Object.freeze([...new Set([...e, ...t])].sort());
}
function Xt(e, t) {
	return e === "all" ? !1 : t === "all" || t.some((t) => !e.includes(t));
}
var Zt = class {
	sources;
	caches;
	fontSet;
	runResolver;
	resolverFailures;
	acquireResolverFaces;
	ownsAcquiredFaces;
	readMetricTables;
	requestedWeights;
	urlRegistrationMinBytes;
	now;
	acquiredFaces = /* @__PURE__ */ new Map();
	acquiredFaceBytes = 0;
	runnerOwnsCeiling;
	resolverBridge;
	controller = new AbortController();
	detachSignal = () => void 0;
	closed = !1;
	abortedByCaller = !1;
	failure = void 0;
	queue = Promise.resolve();
	families = /* @__PURE__ */ new Map();
	owned = /* @__PURE__ */ new Map();
	aliases = /* @__PURE__ */ new Map();
	prepared = /* @__PURE__ */ new Map();
	urlLoads = /* @__PURE__ */ new Map();
	stopReclaim;
	serial = ++vt;
	claimedDeclarations = /* @__PURE__ */ new Set();
	all = !1;
	points = /* @__PURE__ */ new Set();
	warned = /* @__PURE__ */ new Set();
	snapshot = St;
	constructor(e) {
		this.sources = _(e.sources), this.fontSet = e.fontSet === void 0 ? l() : e.fontSet, this.runResolver = e.runResolver ?? te, this.resolverFailures = e.resolverFailures, this.runnerOwnsCeiling = e.resolverCeilingOwnedByRunner === !0, this.resolverBridge = this.sources.some((e) => e.kind === "font-resolver") ? e.resolverBridge : void 0, this.acquireResolverFaces = e.acquireResolverFaces ?? de(e.resolverFailures), this.ownsAcquiredFaces = e.acquiredFacesOwnedBySession === !0, this.readMetricTables = e.readMetricTables, this.requestedWeights = zt(e.requestedWeights), this.urlRegistrationMinBytes = e.urlRegistrationMinBytes ?? 1048576;
		let { performance: t } = globalThis;
		this.now = e.now ?? (t ? () => t.now() : Date.now), this.caches = this.sources.map(oe);
		let n = e.signal;
		if (n) {
			let e = () => {
				this.abortedByCaller = !0, this.release();
			};
			n.aborted ? e() : (n.addEventListener("abort", e, { once: !0 }), this.detachSignal = () => n.removeEventListener("abort", e));
		}
	}
	get loaded() {
		return this.snapshot;
	}
	ensure(e) {
		return this.enqueue(e);
	}
	ensureWithScalars(e, t) {
		return this.enqueue({
			...e,
			scalars: []
		}, t);
	}
	enqueue(e, t) {
		let n;
		try {
			n = wt(e);
		} catch (e) {
			return Promise.reject(e);
		}
		let r = this.queue.then(() => this.ensureNow(n, t));
		return this.queue = r.then(() => void 0, () => void 0), r;
	}
	release() {
		if (!this.closed) {
			this.closed = !0, this.controller.abort(), this.detachSignal(), this.dropPrepared();
			for (let { cancel: e } of [...this.urlLoads.values()]) e();
			for (let e of this.owned.values()) this.fontSet?.delete(e.face), e.replaced && this.fontSet?.delete(e.replaced), T(e.bytes);
			this.owned.clear(), this.aliases.clear(), this.claimedDeclarations.clear(), this.families.clear(), this.points.clear();
			for (let e of this.caches) e.release();
			pe(this), yt.release(this), this.acquiredFaces.clear(), T(this.acquiredFaceBytes), this.acquiredFaceBytes = 0, this.caches = [], this.sources = [], this.fontSet = null, this.runResolver = en, this.resolverBridge = void 0, this.resolverFailures = void 0, this.acquireResolverFaces = void 0, this.warned.clear(), this.snapshot = St;
		}
	}
	settledState() {
		if (this.abortedByCaller) throw p("Font source session aborted");
		if (this.failure !== void 0) throw this.failure;
		return this.snapshot;
	}
	async ensureNow(e, t) {
		if (this.closed || this.failure !== void 0) return this.settledState();
		if (!this.fontSet || typeof FontFace > "u" || this.sources.length === 0) return this.snapshot;
		try {
			let n = [], r = /* @__PURE__ */ new Map(), i = [], a = this.families.size;
			for (let t of e.names) {
				let e = W(t.name), r = this.families.get(e);
				if (!r) {
					if (a >= 256) {
						i.push(t.name);
						continue;
					}
					a++, n.push(t);
					continue;
				}
				r.kind === "absent" && Xt(r.scripts, t.scripts) && n.push({
					...t,
					scripts: Yt(r.scripts, t.scripts)
				});
			}
			i.length && Wt([[`families over the limit: ${i.length} [${i.slice(0, 8).join(", ")}${i.length > 8 ? ", …" : ""}]`, Gt("families", 256, a + i.length)]]);
			let o = n.length ? this.resolve(n) : void 0, s = e.scalars;
			if (t) {
				if (o && (o.catch(() => void 0), await new Promise((e) => setTimeout(e, 0)), this.closed)) return this.settledState();
				s = Tt(t());
			}
			let c = this.addScalars(s), l = o ? await o : /* @__PURE__ */ new Map();
			if (this.closed) return this.settledState();
			let d = $(this.controller.signal, u);
			try {
				return await this.acquireRegisterLoad(n, l, c, d, r);
			} finally {
				d.dispose();
			}
		} catch (e) {
			if (this.closed) return this.settledState();
			throw this.failure = e, this.release(), e;
		}
	}
	async acquireRegisterLoad(e, t, n, r, i) {
		for (let { name: n, scripts: r } of e) {
			let e = W(n), a = t.get(e) ?? {
				kind: "absent",
				name: n,
				scripts: r
			};
			if (a.kind === "claimed") {
				let { sourceIndex: e } = a, t = new Set(a.declarations.map((t) => `${e}\u0000${Pt(t)}`)), r = this.claimedDeclarations.size;
				for (let e of t) this.claimedDeclarations.has(e) || r++;
				if (r > 2048) a = {
					kind: "failed",
					name: n,
					reason: Gt("declarations", f, r)
				};
				else {
					for (let e of t) this.claimedDeclarations.add(e);
					a = {
						...a,
						demand: {
							component: kt(a.declarations),
							settled: a.declarations.map(() => !1),
							...this.sharedWeightRange(a.declarations)
						}
					};
				}
			}
			this.families.set(e, a), a.kind === "failed" && i.set(n, a.reason);
		}
		let a = /* @__PURE__ */ new Set(), o = await this.registerDemanded(a, i, r);
		if (this.closed) return this.settledState();
		let s = o && r.remaining() === 0 ? $(this.controller.signal, u) : void 0;
		try {
			await this.load(n, a, i, s ?? r);
		} finally {
			s?.dispose();
		}
		if (this.closed) return this.settledState();
		let c = this.readMetricTables;
		return c && await Promise.all([...this.owned.values()].flatMap((e) => e.face.status === "loaded" && e.declaration.data !== void 0 ? [bt(e.declaration.data, c, this, this.controller.signal)] : [])), this.closed ? this.settledState() : (this.warn(i), this.snapshot = this.takeSnapshot(), this.snapshot);
	}
	async registerDemanded(e, t, n) {
		let r = K(this.all ? [] : [...this.points].sort((e, t) => e - t)), i = [];
		for (let e of this.families.values()) {
			if (e.kind !== "claimed" || !e.demand) continue;
			let { component: t, settled: n } = e.demand, a = /* @__PURE__ */ new Set();
			if (e.declarations.forEach((e, i) => {
				if (n[i]) return;
				let o = G(e.unicodeRange);
				(this.all || o === null || r(o)) && a.add(t[i]);
			}), !a.size) continue;
			let o = e.declarations.flatMap((e, r) => !n[r] && a.has(t[r]) ? [r] : []);
			i.push({
				state: e,
				demand: e.demand,
				indices: o
			});
		}
		if (!i.length) return !1;
		let a = /* @__PURE__ */ new Map(), o = /* @__PURE__ */ new Map(), s = /* @__PURE__ */ new Map();
		for (let { state: e, indices: t } of i) {
			let n = this.sources[e.sourceIndex];
			for (let r of t) {
				let t = e.declarations[r];
				if (!ue(t)) continue;
				let i = t.url;
				if (n.kind === "font-resolver") {
					let t = s.get(e.sourceIndex);
					t || (t = /* @__PURE__ */ new Map(), s.set(e.sourceIndex, t)), t.set(e.name, [...t.get(e.name) ?? [], i]);
				} else {
					let r = n.credentials ?? "same-origin", s = n.kind === "font-css-api" ? n.parallelFaceDownloads : void 0, c = It(n), l = a.get(c);
					l || (l = {
						credentials: r,
						parallel: s,
						urls: /* @__PURE__ */ new Set()
					}, a.set(c, l)), l.urls.add(i);
					let u = o.get(i);
					u || (u = [], o.set(i, u)), u.push({
						sourceIndex: e.sourceIndex,
						declaration: Vt(t, e.demand?.weightRange)
					});
				}
			}
		}
		let c = Date.now() + n.remaining(), l = /* @__PURE__ */ new Map(), u = [], d = [], f, m = () => {
			f = void 0;
			let e = 0;
			for (; e < d.length && te(...d[e]);) e++;
			d.splice(0, e);
		}, h = (e, t) => {
			this.closed || (d.push([e, t]), f ??= setTimeout(m, 0));
		}, g = /* @__PURE__ */ new Map(), ee = this.now(), _ = 0, v = 0, y = 0, b = 0, x = (e, t) => {
			let n = g.get(e);
			return n === void 0 && (n = _ >= this.urlRegistrationMinBytes || v > .5 * (this.now() - ee), n || (_ += t), g.set(e, n)), n;
		}, te = (e, t) => {
			for (let { sourceIndex: n, declaration: r } of o.get(e) ?? []) {
				if (this.closed || Date.now() + Lt > c) return !1;
				let e = Ut(this.sources[n], r, t, x), i = Ft(n, e);
				if (!(this.owned.has(i) || this.prepared.has(i)) && ie(t.byteLength)) try {
					let n = Z.get(e), r = this.now(), a = new FontFace(`ooxml-font-source-${this.serial}-prepared`, n === void 0 ? t : Q(n), X(e));
					if (n === void 0) {
						let e = this.now() - r;
						v += e, y += e, b += t.byteLength;
					}
					n !== void 0 && a.load().catch(Kt), this.prepared.set(i, {
						face: a,
						bytes: t.byteLength,
						...n === void 0 ? {} : { url: n }
					}), this.stopReclaim ??= re(() => this.dropPrepared());
				} catch {
					T(t.byteLength);
				}
			}
			return !0;
		};
		for (let [e, { credentials: t, parallel: r, urls: i }] of a) u.push(fe(i, {
			credentials: t,
			signal: n.signal,
			deadline: c,
			holder: this,
			onAcquired: h,
			...r === void 0 ? {} : { parallel: r }
		}).then((t) => {
			l.set(e, t);
		}));
		let S = this.acquireResolverFaces;
		for (let [e, t] of s) {
			if (!S) break;
			u.push(this.acquireResolverUrls(S, e, t, n, c).then((t) => {
				l.set(`resolver:${e}`, t);
			}));
		}
		try {
			if (await Promise.all(u), this.closed) throw p("Font source session released");
			for (let [e, t] of d) {
				let n = (o.get(e) ?? []).filter(({ sourceIndex: e }) => Ht(this.sources[e])).length;
				n && !g.has(e) && !x(e, t.byteLength) && b && (v += n * t.byteLength * (y / b));
			}
			this.registerAcquired(i, l, e, t, x);
		} finally {
			f !== void 0 && clearTimeout(f), d.length = 0, this.dropPrepared();
		}
		return s.size > 0 && S !== void 0;
	}
	dropPrepared() {
		for (let e of this.prepared.values()) T(e.bytes);
		this.prepared.clear(), this.stopReclaim?.(), this.stopReclaim = void 0;
	}
	registerAcquired(e, t, n, r, i) {
		for (let { state: a, demand: o, indices: s } of e) {
			let e = this.sources[a.sourceIndex], c = t.get(e.kind === "font-resolver" ? `resolver:${a.sourceIndex}` : It(e)), l = [];
			for (let t of s) {
				o.settled[t] = !0;
				let n = a.declarations[t];
				if (!ue(n)) {
					l.push(t);
					continue;
				}
				let s = c?.get(n.url) ?? { reason: "font download failed" };
				"data" in s ? (a.declarations[t] = Ut(e, n, s.data, i), l.push(t)) : r.has(a.name) || r.set(a.name, s.reason);
			}
			this.register(a, n, r, l);
		}
	}
	async acquireResolverUrls(e, t, n, r, i) {
		let a = /* @__PURE__ */ new Map(), o = [];
		for (let [e, r] of n) {
			let n = [...new Set(r)].filter((e) => {
				let n = this.acquiredFaces.get(`${t}\u0000${e}`);
				return n && a.set(e, { data: n }), !n;
			});
			n.length && o.push({
				family: e,
				urls: n
			});
		}
		if (!o.length) return a;
		let s = await e({
			source: this.sources[t],
			sourceIndex: t,
			families: o
		}, {
			signal: r.signal,
			cancel: this.controller.signal,
			deadline: i,
			holder: this
		});
		for (let [e, n] of s) {
			let r = `${t}\u0000${e}`;
			if (!("data" in n) || this.closed) {
				a.set(e, n);
				continue;
			}
			let i = this.acquiredFaces.get(r);
			if (i) {
				a.set(e, { data: i });
				continue;
			}
			if (this.ownsAcquiredFaces) {
				try {
					se(n.data.byteLength);
				} catch (t) {
					a.set(e, { reason: t instanceof Error ? t.message : String(t) });
					continue;
				}
				this.acquiredFaceBytes += n.data.byteLength;
			}
			this.acquiredFaces.set(r, n.data), a.set(e, n);
		}
		return a;
	}
	addScalars(e) {
		if (this.all) return [];
		if (e !== "all") {
			let t = [];
			for (let n of e) this.points.has(n) || (this.points.add(n), t.push(n));
			if (this.points.size <= 65536) return t;
		}
		return this.all = !0, this.points.clear(), "all";
	}
	async resolve(e) {
		let t = /* @__PURE__ */ new Map(), n = e, r = this.resolverBridge?.ready();
		if (r && (await Jt(r, this.controller.signal), this.closed)) throw p("Font source session released");
		let i = $(this.controller.signal, u);
		try {
			for (let e = 0; e < this.sources.length && n.length; e++) {
				if (this.closed) throw p("Font source session released");
				let r, a = this.sources[e], o = a.kind === "font-resolver" && this.runnerOwnsCeiling ? this.controller.signal : i.signal;
				try {
					r = await this.resolveWithSource(e, n, o, i.remaining);
				} catch (s) {
					let c = qt(s) && i.expired() && o === i.signal;
					if (qt(s) && !c) throw s;
					let l = c ? "timed out" : s instanceof Error ? s.message : String(s);
					if (a.kind !== "font-resolver") {
						for (let { name: e } of n) t.set(W(e), {
							kind: "failed",
							name: e,
							reason: l
						});
						n = [];
						break;
					}
					let u = this.caches[e];
					r = this.claimFromCandidates(a, n, ae(this.resolverFailures, u, n, l, u));
				}
				let s = [];
				for (let i of n) {
					let n = W(i.name), a = r.get(n) ?? { kind: "absent" };
					a.kind === "absent" ? s.push(i) : a.kind === "failed" ? t.set(n, {
						kind: "failed",
						name: i.name,
						reason: a.reason
					}) : t.set(n, {
						kind: "claimed",
						name: i.name,
						sourceIndex: e,
						served: a.served,
						...a.substitution ? { substitution: a.substitution } : {},
						declarations: [...a.declarations],
						faces: []
					});
				}
				n = s;
			}
		} finally {
			i.dispose();
		}
		return t;
	}
	claimFromCandidates(e, t, n) {
		let r = new Map(n);
		for (let { name: i, scripts: a } of t) {
			let t = W(i), o = n.get(t);
			o && r.set(t, ne(o, i, e.substitutions, a));
		}
		return r;
	}
	async resolveWithSource(e, t, n, r) {
		let i = this.sources[e], a = this.caches[e], o = t.map(({ name: e }) => e), s = new Map(t.map(({ name: e, scripts: t }) => [W(e), t])), c = (e) => s.get(W(e)) ?? "all";
		switch (i.kind) {
			case "font-css-api":
			case "font-css": return gt(i, a, o, n, c);
			case "font-files": return S(i, a, o, c);
			case "font-resolver": {
				let o = this.resolverBridge?.unavailable();
				return o === void 0 ? this.claimFromCandidates(i, t, await this.resolveWithResolver(i, e, a, t, n, r)) : new Map(t.map(({ name: e }) => [W(e), {
					kind: "failed",
					reason: o
				}]));
			}
		}
	}
	resolveWithResolver(e, t, n, r, i, a) {
		return b({
			source: e,
			cache: n,
			runner: this.runResolver,
			families: r,
			signal: i,
			holder: n,
			sourceIndex: t,
			remainingMs: a,
			...this.resolverFailures ? { failures: this.resolverFailures } : {}
		});
	}
	sharedWeightRange(e) {
		let t = this.requestedWeights;
		if (!t || this.all || !e.length) return {};
		let n = new Map(t.map((e) => [e, []])), r = /* @__PURE__ */ new Set();
		for (let t of e) {
			let e = Rt(t), i = e === void 0 ? void 0 : n.get(e);
			if (!i) return {};
			let a = t.data === void 0 ? t.url ?? "" : C(t.data), o = [
				t.style ?? "",
				t.stretch ?? "",
				t.unicodeRange ?? "",
				a
			].join("|");
			if (r.has(`${e}|${o}`)) return {};
			r.add(`${e}|${o}`), i.push(o);
		}
		let [i, ...a] = [...n.values()];
		return a.some((e) => e.length !== i.length || e.some((e, t) => e !== i[t])) ? {} : { weightRange: `${t[0]} ${t[t.length - 1]}` };
	}
	register(e, t, n, r) {
		let i = this.fontSet, a = r.map((t) => Vt(e.declarations[t], e.demand?.weightRange)).map((t) => {
			let { data: n, url: r = "" } = t, i = n === void 0 && /^\s*data:/i.test(r);
			return {
				declaration: t,
				signature: Ft(e.sourceIndex, t),
				data: n,
				url: r,
				dataUrl: i
			};
		}), o = new Map(a.map(({ signature: e }, t) => [e, t]));
		for (let [r, { declaration: s, signature: c, data: l, url: u, dataUrl: d }] of a.entries()) {
			if (o.get(c) !== r) continue;
			let a = this.owned.get(c);
			if (a) {
				a.families.add(e.name), e.faces.push(a);
				continue;
			}
			let f = l === void 0 ? d ? ee(u) ?? 0 : 0 : l.byteLength, p = W(s.family), m = this.aliases.get(p) ?? `ooxml-font-source-${this.serial}-${this.aliases.size}`, h, g = !1;
			try {
				let e = this.prepared.get(c);
				this.prepared.delete(c), e || se(f), g = !0;
				let t = Z.get(s);
				e && e.url === t ? (h = e.face, h.family = m) : h = new FontFace(m, t === void 0 ? l ?? Q(u) : Q(t), X(s));
				try {
					i.add(h);
				} catch (e) {
					throw i.delete(h), e;
				}
			} catch (t) {
				g && T(f), n.set(e.name, t instanceof Error ? t.message : String(t));
				continue;
			}
			this.aliases.set(p, m);
			let _ = {
				face: h,
				declaration: s,
				sourceIndex: e.sourceIndex,
				ranges: G(s.unicodeRange),
				bytes: f,
				families: new Set([e.name]),
				...Z.has(s) ? { quiet: !0 } : {}
			};
			this.owned.set(c, _), e.faces.push(_), t.add(_);
		}
	}
	async load(e, t, n, r) {
		let i = r.signal, a = Date.now() + r.remaining() - Lt, o = { placed: !1 };
		if (Date.now() >= a) for (let { fallback: e } of [...this.urlLoads.values()]) e();
		let s = e === "all", c = e === "all" ? [] : [...e].sort((e, t) => e - t), l = K(t.size && !this.all ? [...this.points].sort((e, t) => e - t) : c), u = K(c), d = [];
		for (let e of this.owned.values()) {
			if (e.readiness && !e.quiet) {
				d.push(e);
				continue;
			}
			let n = t.has(e), r = this.all && (s || n) || e.ranges === null || (n ? l : u)(e.ranges);
			if (r && (e.quiet = !1), e.readiness) {
				d.push(e);
				continue;
			}
			!r && !(n && e.quiet) || (e.readiness = Promise.resolve().then(() => this.closed ? void 0 : this.loadFace(e, a, o)).then(() => {
				e.outcome = !0;
			}, () => {
				e.outcome = !1;
			}), d.push(e));
		}
		if (!d.length) {
			this.placeReplaced();
			return;
		}
		if (await Jt(Promise.all(d.map((e) => e.readiness)), i), !this.closed) {
			this.placeReplaced(), o.placed = !0;
			for (let e of d) {
				if (e.outcome === !0 || e.quiet) continue;
				let t = e.outcome === !1 ? "font load failed" : "timed out";
				for (let r of e.families) n.has(r) || n.set(r, t);
			}
		}
	}
	loadFace(e, t, n) {
		return !Z.has(e.declaration) || e.declaration.data === void 0 ? e.face.load() : e.face.status !== "loaded" && Date.now() >= t ? (this.fallBackToBytes(e), e.face.load()) : this.loadUrlFace({ entry: e }, e.face, t, n);
	}
	loadUrlFace(e, t, n, r) {
		return new Promise((i, a) => {
			let o = () => {
				e.entry && this.urlLoads.delete(e.entry), e.entry = void 0, clearTimeout(c);
			}, s = (t) => {
				let n = e.entry;
				if (n) {
					if (o(), this.closed) {
						i();
						return;
					}
					try {
						this.fallBackToBytes(n);
					} catch (e) {
						a(e);
						return;
					}
					t && r.placed && this.placeReplaced(), n.face.load().then(() => i(), a);
				}
			}, c = setTimeout(() => s(!0), Math.max(0, n - Date.now()));
			this.urlLoads.set(e.entry, {
				fallback: () => s(!1),
				cancel: () => {
					o(), i();
				}
			}), t.load().then(() => {
				e.entry && (o(), i());
			}, () => s(!0));
		});
	}
	fallBackToBytes(e) {
		if (e.fromBytes) return;
		let t = new FontFace(e.face.family, e.declaration.data, X(e.declaration));
		e.fromBytes = !0, e.replaced = e.face, e.face = t;
	}
	placeReplaced() {
		let e = this.fontSet;
		if (!e) return;
		let t = !1;
		for (let n of this.owned.values()) {
			if (n.replaced) e.delete(n.replaced), n.replaced = void 0, t = !0;
			else if (!t || !e.delete(n.face)) continue;
			e.add(n.face);
		}
	}
	warn(e) {
		let t = [...e].filter(([e]) => !this.warned.has(W(e)));
		if (t.length) {
			for (let [e] of t) this.warned.add(W(e));
			Wt(t);
		}
	}
	takeSnapshot() {
		let e = [], t = [];
		for (let n of this.owned.values()) {
			if (n.face.status !== "loaded") continue;
			let { declaration: r } = n;
			t.push({
				family: r.family,
				weight: Bt.has(r) && this.requestedWeights?.includes(400) ? "400" : r.weight ?? "normal",
				style: r.style ?? "normal"
			});
			let i = this.readMetricTables && r.data && U.get(r.data) || void 0, a = i ? void 0 : r.data ?? (r.url === void 0 ? void 0 : Q(r.url));
			e.push(Object.freeze({
				family: r.family,
				weight: r.weight ?? "normal",
				style: r.style ?? "normal",
				stretch: r.stretch ?? "normal",
				unicodeRange: r.unicodeRange ?? "U+0-10FFFF",
				sourceIndex: n.sourceIndex,
				face: n.face,
				...i ? { resourceMetrics: i } : {},
				...a === void 0 ? {} : { probeSource: a },
				...a !== void 0 && $t(this.sources[n.sourceIndex], r.family) ? { sharedSubsetMetrics: !0 } : {}
			}));
		}
		let n = /* @__PURE__ */ new Map();
		for (let [e, t] of this.families) {
			if (t.kind !== "claimed" || !t.substitution || !t.faces.some((e) => e.face.status === "loaded")) continue;
			let r = t.substitution.script;
			n.set(e, Object.freeze({
				family: t.served,
				...r ? { script: r } : {}
			}));
		}
		return Object.freeze({
			faces: Object.freeze(e),
			substitutions: n,
			regularAliases: s(t.map((e) => ({
				...e,
				status: "loaded"
			}))),
			families: new Map(this.aliases)
		});
	}
}, Qt = /* @__PURE__ */ new WeakMap();
function $t(e, t) {
	if (e?.kind !== "font-css-api" || !e.sharedSubsetMetricFamilies) return !1;
	let n = Qt.get(e);
	return n || Qt.set(e, n = new Set(e.sharedSubsetMetricFamilies.map(W))), n.has(W(t));
}
var en = () => {
	throw p("Font source session released");
}, tn = [
	"Hg",
	"abcdefghijklmnopqrstuvwxyz ",
	"‍"
], nn = 0, rn = 30, an = 295, on = 301, sn = 496, cn = 1313, ln = 2610, un = 763, dn = new Set([
	247,
	505,
	322,
	762,
	764,
	1791
]), fn = 16, pn = 2, mn = 2596720087, hn = 14, gn = 84, _n = 65536, vn = ["Symbol", "MT Extra"];
function yn(e, n) {
	t(e) ? bn(e, n) : r(e) && xn(e, n);
}
function bn(t, n) {
	let r = new DataView(t.buffer, t.byteOffset, t.byteLength), a = (t.length >= 4 && r.getUint32(0, !0) === mn ? 22 : 0) + 18, o = [], s = null, c = [], l = !1, u = (e) => e + 2 <= t.length ? r.getUint16(e, !0) : 0, d = (e) => e + 2 <= t.length ? r.getInt16(e, !0) : 0, f = (e) => {
		let t = o.indexOf(null);
		t < 0 ? o.push(e) : o[t] = e;
	}, p = (e, t) => {
		if (!s || !s.valid || s.height === 0 || s.face.startsWith("@") || t & fn || e.length === 0) return !0;
		if (!l) {
			l = !0;
			for (let e of tn) if (!n(e)) return !1;
		}
		let r = s.charset === pn;
		if (r && !n(Array.from(e, (e) => String.fromCharCode(61440 + e)).join(""))) return !1;
		for (let t of r ? [!1, !0] : [!1]) {
			let r = i(e, s.charset, s.face, () => t);
			if (!("problem" in r)) {
				for (let e of r.units) if (!n(e.text)) return !1;
				if (!n(r.units.map((e) => e.text).join(""))) return !1;
			}
		}
		return !0;
	};
	for (; a + 6 <= t.length;) {
		let n = r.getUint32(a, !0), i = r.getUint16(a + 4, !0);
		if (n < 3) break;
		let l = a + n * 2;
		if (l > t.length || i === nn) break;
		let m = a + 6, h = l - m;
		switch (i) {
			case rn:
				h === 0 && c.push(s);
				break;
			case an: {
				if (h !== 2) break;
				let e = d(m), t = e < 0 ? c.length + e : e - 1;
				if (e === 0 || t < 0 || t >= c.length) break;
				s = c[t], c.length = t;
				break;
			}
			case un:
				f(e(t.subarray(m, l)));
				break;
			case on: {
				if (h !== 2) break;
				let e = o[u(m)];
				e?.kind === "font" && (s = e);
				break;
			}
			case sn: {
				if (h !== 2) break;
				let e = u(m), t = o[e];
				t && (t === s && (s = null), o[e] = null);
				break;
			}
			case cn: {
				if (h < 2) break;
				let e = u(m);
				if (h - 2 < e + (e & 1) + 4) break;
				if (!p(t.subarray(m + 2, m + 2 + e), 0)) return;
				break;
			}
			case ln: {
				if (h < 8) break;
				let e = d(m + 4), n = u(m + 6), r = n & 6 ? 8 : 0;
				if (e < 0 || h - 8 < r + e) break;
				let i = m + 8 + r;
				if (!p(t.subarray(i, i + e), n)) return;
				break;
			}
			default:
				dn.has(i) && f({ kind: "other" });
				break;
		}
		a = l;
	}
}
function xn(e, t) {
	let r = new DataView(e.buffer, e.byteOffset, e.byteLength), i = 0;
	for (; i + 8 <= e.length;) {
		let a = r.getUint32(i, !0), o = r.getUint32(i + 4, !0);
		if (o < 8 || o & 3 || i + o > e.length) break;
		let s = i + o;
		if (a === hn) break;
		if (a === gn && o >= 56) {
			let e = r.getUint32(i + 44, !0), a = r.getUint32(i + 48, !0), o = r.getUint32(i + 52, !0), c = o & 256 ? 60 : 76;
			if (i + c <= s && e > 0 && e <= _n && a >= c && i + a + e * 2 <= s) {
				let s = "";
				for (let t = 0; t < e; t++) s += String.fromCharCode(r.getUint16(i + a + t * 2, !0));
				if (!t(s)) return;
				if (o === 0 && /[\uf000-\uf0ff]/.test(s)) for (let e of vn) {
					let r = n(s, e, !0);
					if (r !== null && !t(r)) return;
				}
			}
		}
		i = s;
	}
}
function Sn(e) {
	let t = new ge({ budget: Infinity });
	return yn(e, (e) => t.addSymbolText(e, [], !0)), t.result();
}
var Cn = /* @__PURE__ */ new WeakMap();
function wn(e) {
	let t = Cn.get(e);
	return t || (t = (t) => e.ensure({
		families: [],
		fallbackFamilies: [],
		scalars: Sn(t)
	}), Cn.set(e, t)), t;
}
export { Zt as n, wn as t };
