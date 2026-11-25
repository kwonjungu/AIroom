import { r as e } from "./own-key-CzMRhMxt.js";
import { t } from "./substitutions-_KDT_mVq.js";
import { d as n, i as r, s as i } from "./scripts-DxEAUeVI.js";
import { t as a } from "./symbol-encoding-E82tqzMG.js";
import { f as o, o as s, s as c, u as l } from "./pixel-budget-DI82Hn3R.js";
import { a as u, i as d, n as f, r as p, t as m } from "./char-data.generated-BWxcHU-4.js";
function h(e) {
	let t = "";
	for (let n of e) {
		let e = n.codePointAt(0) ?? 0;
		n === "\"" || n === "\\" ? t += `\\${n}` : e === 0 ? t += "�" : e <= 31 || e === 127 ? t += `\\${e.toString(16)} ` : t += n;
	}
	return `"${t}"`;
}
var g = new Set([
	"serif",
	"sans-serif",
	"monospace",
	"cursive",
	"fantasy",
	"system-ui",
	"ui-serif",
	"ui-sans-serif",
	"ui-monospace",
	"ui-rounded",
	"math",
	"emoji",
	"fangsong"
]);
function _(e) {
	let t = [], n = 0;
	for (; n < e.length;) {
		for (; n < e.length && /\s/.test(e[n]);) n += 1;
		let r = n, i = "", a = !1;
		if (e[n] === "\"" || e[n] === "'") {
			a = !0;
			let t = e[n];
			n += 1;
			let r = !1;
			for (; n < e.length;) {
				let a = e[n];
				if (a === "\\") {
					let t = /^[0-9a-fA-F]{1,6}\s?/.exec(e.slice(n + 1));
					t ? (i += String.fromCodePoint(Math.min(parseInt(t[0].trim(), 16) || 65533, 1114111)), n += 1 + t[0].length) : (i += e[n + 1] ?? "", n += 2);
					continue;
				}
				if (a === t) {
					r = !0, n += 1;
					break;
				}
				i += a, n += 1;
			}
			if (!r) return null;
			for (; n < e.length && /\s/.test(e[n]);) n += 1;
		} else {
			for (; n < e.length && e[n] !== ",";) n += 1;
			i = e.slice(r, n).trim().replace(/\s+/g, " ");
		}
		let o = e.slice(r, n).trim();
		if (!i || n < e.length && e[n] !== ",") return null;
		t.push({
			text: o,
			name: i,
			generic: !a && g.has(i.toLowerCase())
		}), n += 1;
	}
	return t.length > 0 ? t : null;
}
var v = /* @__PURE__ */ new WeakMap(), y = 1024;
function ee(e, t) {
	if (!t?.size) return e;
	let n = v.get(t);
	n || (n = /* @__PURE__ */ new Map(), v.set(t, n));
	let r = n.get(e);
	if (r !== void 0) return r;
	let i = _(e), a = e;
	if (i) {
		let e = [];
		i.forEach((n, r) => {
			let a = n.generic ? void 0 : t.get(n.name.trim().toLocaleLowerCase("en-US"));
			a !== void 0 && i[r - 1]?.name !== a && e.push(h(a)), e.push(n.text);
		}), e.length !== i.length && (a = e.join(", "));
	}
	return n.size >= y && n.clear(), n.set(e, a), a;
}
function te(e) {
	return e.map(h).join(", ");
}
var b = /[؀-ۿݐ-ݿࢠ-ࣿ]/u;
function x(e) {
	return b.test(e);
}
function S(e) {
	return e ? ["Noto Naskh Arabic", "Noto Sans Arabic"] : ["Noto Sans Arabic"];
}
var ne = Object.freeze(Object.fromEntries(t.map((e) => [e.for.toLowerCase(), e.use])));
function C(t) {
	return e(ne, t.toLowerCase());
}
var re = ["Noto Naskh Arabic", "Noto Sans Arabic"], w = new Set([...t.filter((e) => re.includes(e.use)).map((e) => e.for.toLowerCase()), ...re.map((e) => e.toLowerCase())]), ie = new Set([...t.filter((e) => e.use === "Noto Naskh Arabic").map((e) => e.for.toLowerCase()), "noto naskh arabic"]);
function ae(e, t) {
	return [Math.max(1, Math.ceil(e)), Math.max(1, Math.ceil(t))];
}
function T(e, t) {
	let [n, r] = ae(e, t);
	if (typeof OffscreenCanvas < "u") return new OffscreenCanvas(n, r);
	if (typeof document < "u") {
		let e = document.createElement("canvas");
		return e.width = n, e.height = r, e;
	}
	return null;
}
function oe(e, t, n) {
	let [r, i] = ae(t, n);
	if (typeof OffscreenCanvas < "u") try {
		return new OffscreenCanvas(r, i);
	} catch {}
	if (typeof document < "u") try {
		let e = document.createElement("canvas");
		return e.width = r, e.height = i, e;
	} catch {}
	try {
		let t = e.canvas?.constructor;
		return typeof t == "function" ? new t(r, i) : null;
	} catch {
		return null;
	}
}
var E = s, D = c;
function se(e, t, n, r, i) {
	if (t < 0 || r < 0 || i < 0 || n < 40 || t + n > e.byteLength || r + i > e.byteLength) return null;
	let a = e.getUint32(t, !0);
	if (a < 40 || a > n) return null;
	let o = e.getInt32(t + 4, !0), s = e.getInt32(t + 8, !0), c = e.getUint16(t + 14, !0);
	if (e.getUint32(t + 16, !0) !== 0 || ![
		1,
		4,
		8,
		24,
		32
	].includes(c)) return null;
	let u = s < 0, d = Math.abs(o), f = Math.abs(s);
	if (d <= 0 || f <= 0) return null;
	let p = Math.ceil(d * c / 32) * 4;
	if (p * f > i + p || (d > E || f > E || d * f > D) && (p * f > i || (e.getUint32(t + 32, !0) || (c <= 8 ? 1 << c : 0)) * 4 > n - a)) return null;
	if (d > E || f > E) throw new l("image-dimension", E, Math.max(d, f));
	if (d * f > D) throw new l("image-pixels", D, d * f);
	let m = new Uint8ClampedArray(d * f * 4), h = null;
	if (c <= 8) {
		let r = e.getUint32(t + 32, !0);
		r === 0 && (r = 1 << c);
		let i = t + a;
		h = [];
		for (let a = 0; a < r; a++) {
			let r = i + a * 4;
			if (r + 4 > t + n) break;
			let o = e.getUint8(r), s = e.getUint8(r + 1), c = e.getUint8(r + 2);
			h.push(c << 16 | s << 8 | o);
		}
	}
	let g = (e, t, n, r, i, a) => {
		let o = (e * d + t) * 4;
		m[o] = n, m[o + 1] = r, m[o + 2] = i, m[o + 3] = a;
	}, _ = !1;
	for (let t = 0; t < f; t++) {
		let n = u ? t : f - 1 - t, a = t, o = r + n * p;
		if (o + p > r + i) break;
		if (c === 32) for (let t = 0; t < d; t++) {
			let n = o + t * 4, r = e.getUint8(n), i = e.getUint8(n + 1), s = e.getUint8(n + 2), c = e.getUint8(n + 3);
			c !== 0 && (_ = !0), g(a, t, s, i, r, c);
		}
		else if (c === 24) {
			for (let t = 0; t < d; t++) {
				let n = o + t * 3;
				g(a, t, e.getUint8(n + 2), e.getUint8(n + 1), e.getUint8(n), 255);
			}
			_ = !0;
		} else if (c === 8 && h) {
			for (let t = 0; t < d; t++) {
				let n = e.getUint8(o + t), r = h[n] ?? 0;
				g(a, t, r >> 16 & 255, r >> 8 & 255, r & 255, 255);
			}
			_ = !0;
		} else if (c === 4 && h) {
			for (let t = 0; t < d; t++) {
				let n = e.getUint8(o + (t >> 1)), r = t & 1 ? n & 15 : n >> 4 & 15, i = h[r] ?? 0;
				g(a, t, i >> 16 & 255, i >> 8 & 255, i & 255, 255);
			}
			_ = !0;
		} else if (c === 1 && h) {
			for (let t = 0; t < d; t++) {
				let n = e.getUint8(o + (t >> 3)) >> 7 - (t & 7) & 1, r = h[n] ?? 0;
				g(a, t, r >> 16 & 255, r >> 8 & 255, r & 255, 255);
			}
			_ = !0;
		} else return null;
	}
	if (c === 32 && !_) for (let e = 3; e < m.length; e += 4) m[e] = 255;
	return {
		width: d,
		height: f,
		data: m
	};
}
function ce(e, t, n) {
	if (t < 0 || n < 40 || t + n > e.byteLength) return null;
	e = new DataView(e.buffer, e.byteOffset + t, n), t = 0;
	let r = e.getUint32(t, !0);
	if (r < 40) return null;
	let i = e.getUint16(t + 14, !0), a = 0;
	if (i <= 8) {
		let n = e.getUint32(t + 32, !0);
		n === 0 && (n = 1 << i), a = n;
	} else a = e.getUint32(t + 32, !0);
	let o = r + a * 4, s = t + o, c = n - o;
	return c <= 0 ? null : se(e, t, o, s, c);
}
function O(e, t, n, r, i, a) {
	try {
		let o = T(t.width, t.height);
		if (!o) return !1;
		let s = o.getContext("2d");
		if (!s) return !1;
		let c = s.createImageData(t.width, t.height);
		c.data.set(t.data), s.putImageData(c, 0, 0);
		let l = Math.min(n, i), u = Math.min(r, a), d = Math.abs(i - n), f = Math.abs(a - r);
		return e.drawImage(o, l, u, d, f), !0;
	} catch (e) {
		if (o(e)) throw e;
		return !1;
	}
}
var k = Object.fromEntries(Object.entries(a).map(([e, t]) => [e, String.fromCodePoint(t)])), le = {
	32: " ",
	75: "…",
	76: "⋯",
	77: "⋮",
	78: "⋰",
	79: "⋱"
};
function A(e) {
	let t = e.trim().toLowerCase();
	return t === "symbol" ? k : t === "mt extra" ? le : null;
}
function j(e) {
	return A(e) !== null;
}
var ue = "Symbol";
function de(e, t) {
	return A(t)?.[e];
}
function fe(e, t, n = !1) {
	let r = A(t);
	if (!r) return null;
	let i = "";
	for (let t of e) {
		let e = t.codePointAt(0);
		if (n && (e < 61440 || e > 61695)) {
			i += t;
			continue;
		}
		let a = r[n ? e - 61440 : e];
		if (a === void 0) return null;
		i += a;
	}
	return i;
}
var M = /[\p{P}\p{S}]/u;
function N(e) {
	return M.test(e);
}
function P(e) {
	let t = 0, n = p.length - 1;
	for (; t < n;) {
		let r = t + n + 1 >> 1;
		p[r] <= e ? t = r : n = r - 1;
	}
	return f[t];
}
var F = (() => {
	let e = new Uint8Array(128);
	for (let t = 0; t < e.length; t++) e[t] = P(t);
	return e;
})();
function I(e) {
	return m[Number.isInteger(e) && e >= 0 && e < 128 ? F[e] : P(e)];
}
var pe = (() => {
	let e = /* @__PURE__ */ new Map();
	for (let t = 0; t < u.length; t += 2) e.set(u[t], u[t + 1]);
	return e;
})();
function me(e) {
	return pe.get(e) ?? null;
}
var he = (() => {
	let e = /* @__PURE__ */ new Map();
	for (let t = 0; t < d.length; t += 3) e.set(d[t], {
		pair: d[t + 1],
		type: d[t + 2] === 0 ? "o" : "c"
	});
	return e;
})();
function L(e) {
	return he.get(e) ?? null;
}
var ge = (e) => e === "RLE" || e === "LRE" || e === "RLO" || e === "LRO" || e === "PDF" || e === "BN", R = (e) => e === "LRI" || e === "RLI" || e === "FSI", z = (e) => e === "B" || e === "S" || e === "WS" || e === "ON" || e === "FSI" || e === "LRI" || e === "RLI" || e === "PDI", B = (e) => e & 1 ? e + 2 : e + 1, V = (e) => e & 1 ? e + 1 : e + 2;
function H(e, t, n) {
	let r = 0;
	for (let i = t; i < n; i++) {
		let t = e[i];
		if (R(t)) r++;
		else if (t === "PDI") r > 0 && r--;
		else if (r === 0) {
			if (t === "L") return 0;
			if (t === "R" || t === "AL") return 1;
		}
	}
	return 0;
}
function _e(e) {
	let t = e.length, n = new Int32Array(t).fill(t), r = new Int32Array(t).fill(-1), i = [];
	for (let a = 0; a < t; a++) {
		let t = e[a];
		if (R(t)) i.push(a);
		else if (t === "PDI" && i.length) {
			let e = i.pop();
			n[e] = a, r[a] = e;
		}
	}
	return {
		pdiOf: n,
		initOf: r
	};
}
function ve(e, t, n) {
	let r = e.length, i = Array(r).fill(t), a = e.slice(), o = [{
		level: t,
		override: "neutral",
		isolate: !1
	}], s = 0, c = 0, l = 0, u = () => o[o.length - 1];
	for (let d = 0; d < r; d++) {
		let r = e[d];
		switch (r) {
			case "RLE":
			case "LRE":
			case "RLO":
			case "LRO": {
				i[d] = u().level;
				let e = r === "RLE" || r === "RLO" ? B(u().level) : V(u().level);
				e <= 125 && s === 0 && c === 0 ? o.push({
					level: e,
					override: r === "RLO" ? "R" : r === "LRO" ? "L" : "neutral",
					isolate: !1
				}) : s === 0 && c++;
				break;
			}
			case "RLI":
			case "LRI":
			case "FSI": {
				i[d] = u().level;
				let t = u().override;
				t !== "neutral" && (a[d] = t);
				let f;
				f = r === "RLI" ? "R" : r === "LRI" ? "L" : H(e, d + 1, n[d]) === 1 ? "R" : "L";
				let p = f === "R" ? B(u().level) : V(u().level);
				p <= 125 && s === 0 && c === 0 ? (l++, o.push({
					level: p,
					override: "neutral",
					isolate: !0
				})) : s++;
				break;
			}
			case "PDI":
				if (s > 0) s--;
				else if (l > 0) {
					for (c = 0; !u().isolate;) o.pop();
					o.pop(), l--;
				}
				{
					i[d] = u().level;
					let e = u().override;
					e !== "neutral" && (a[d] = e);
				}
				break;
			case "PDF":
				i[d] = u().level, s > 0 || (c > 0 ? c-- : !u().isolate && o.length >= 2 && o.pop());
				break;
			case "B":
				o.length = 1, s = 0, c = 0, l = 0, i[d] = t;
				break;
			case "BN":
				i[d] = u().level;
				break;
			default: {
				i[d] = u().level;
				let e = u().override;
				e !== "neutral" && (a[d] = e);
				break;
			}
		}
	}
	return {
		levels: i,
		types: a
	};
}
function ye(e) {
	return e === 9001 ? 12296 : e === 9002 ? 12297 : e;
}
function be(e, t, n, r, i, a) {
	let o = e.length, s = [];
	for (let e = 0; e < o; e++) n[e] || s.push(e);
	let c = [];
	for (let e = 0; e < s.length; e++) {
		let n = s[e];
		e === 0 || t[n] !== t[s[e - 1]] ? c.push([n]) : c[c.length - 1].push(n);
	}
	let l = /* @__PURE__ */ new Map();
	for (let e of c) l.set(e[0], e);
	let u = (e) => e & 1 ? "R" : "L", d = [];
	for (let s of c) {
		let c = s[0];
		if (e[c] === "PDI" && a[c] !== -1) continue;
		let f = s, p = s;
		for (;;) {
			if (p !== s) for (let e of p) f.push(e);
			let t = p[p.length - 1];
			if (R(e[t]) && i[t] !== o) {
				let e = l.get(i[t]);
				if (e) {
					f === s && (f = s.slice()), p = e;
					continue;
				}
			}
			break;
		}
		let m = t[f[0]], h = r;
		for (let e = f[0] - 1; e >= 0; e--) if (!n[e]) {
			h = t[e];
			break;
		}
		let g = u(Math.max(m, h)), _ = f[f.length - 1], v = r;
		if (!(R(e[_]) && i[_] === o)) {
			for (let e = _ + 1; e < o; e++) if (!n[e]) {
				v = t[e];
				break;
			}
		}
		let y = u(Math.max(m, v));
		d.push({
			indices: f,
			level: m,
			sos: g,
			eos: y
		});
	}
	return d;
}
var xe = (e) => e === "L" ? "L" : e === "R" || e === "EN" || e === "AN" ? "R" : null;
function Se(e, t, n, r, i) {
	let a = e.indices, o = a.length, { sos: s, eos: c, level: l } = e;
	for (let e = 0; e < o; e++) {
		let t = a[e];
		if (r[t] === "NSM") if (e === 0) r[t] = s;
		else {
			let n = r[a[e - 1]];
			r[t] = n === "LRI" || n === "RLI" || n === "FSI" || n === "PDI" ? "ON" : n;
		}
	}
	{
		let e = s;
		for (let t = 0; t < o; t++) {
			let n = r[a[t]];
			n === "R" || n === "L" || n === "AL" ? e = n : n === "EN" && e === "AL" && (r[a[t]] = "AN"), n === "AL" && (r[a[t]] = "R");
		}
	}
	for (let e = 1; e < o - 1; e++) {
		let t = r[a[e]], n = r[a[e - 1]], i = r[a[e + 1]];
		t === "ES" && n === "EN" && i === "EN" || t === "CS" && n === "EN" && i === "EN" ? r[a[e]] = "EN" : t === "CS" && n === "AN" && i === "AN" && (r[a[e]] = "AN");
	}
	for (let e = 0; e < o; e++) {
		if (r[a[e]] !== "ET") continue;
		let t = e;
		for (; t < o && r[a[t]] === "ET";) t++;
		let n = e > 0 ? r[a[e - 1]] : s, i = t < o ? r[a[t]] : c;
		if (n === "EN" || i === "EN") for (let n = e; n < t; n++) r[a[n]] = "EN";
		e = t - 1;
	}
	{
		let e = s;
		for (let t = 0; t < o; t++) {
			let n = r[a[t]];
			(n === "ES" || n === "ET" || n === "CS") && (r[a[t]] = "ON"), n === "R" || n === "L" ? e = n : n === "EN" && e === "L" && (r[a[t]] = "L");
		}
	}
	let u = l & 1 ? "R" : "L", d = u === "R" ? "L" : "R", f = [];
	{
		let e = [];
		outer: for (let n = 0; n < o; n++) {
			let i = a[n];
			if (r[i] !== "ON") continue;
			let o = L(t[i]);
			if (o) if (o.type === "o") {
				if (e.length === 63) break outer;
				e.push({
					expect: ye(o.pair),
					pos: n
				});
			} else {
				let r = ye(t[i]);
				for (let t = e.length - 1; t >= 0; t--) if (e[t].expect === r) {
					f.push({
						open: e[t].pos,
						close: n
					}), e.length = t;
					break;
				}
			}
		}
		f.sort((e, t) => e.open - t.open);
	}
	let p = (e, t) => {
		for (let i = e + 1; i < o && n[a[i]] === "NSM"; i++) r[a[i]] = t;
	};
	for (let { open: e, close: t } of f) {
		let n = !1, i = !1;
		for (let o = e + 1; o < t; o++) {
			let e = xe(r[a[o]]);
			e === u ? n = !0 : e === d && (i = !0);
		}
		let o = null;
		if (n) o = u;
		else if (i) {
			let t = s;
			for (let n = e - 1; n >= 0; n--) {
				let e = xe(r[a[n]]);
				if (e) {
					t = e;
					break;
				}
			}
			o = t === d ? d : u;
		}
		o && (r[a[e]] = o, r[a[t]] = o, p(e, o), p(t, o));
	}
	for (let e = 0; e < o; e++) {
		if (!z(r[a[e]])) continue;
		let t = e;
		for (; t < o && z(r[a[t]]);) t++;
		let n = e > 0 ? xe(r[a[e - 1]]) : s, i = t < o ? xe(r[a[t]]) : c, l = n && i && n === i ? n : u;
		for (let n = e; n < t; n++) r[a[n]] = l;
		e = t - 1;
	}
	for (let e = 0; e < o; e++) {
		let t = a[e], n = r[t];
		l & 1 ? (n === "L" || n === "EN" || n === "AN") && (i[t] += 1) : n === "R" ? i[t] += 1 : (n === "AN" || n === "EN") && (i[t] += 2);
	}
}
function Ce(e, t, n) {
	let r = e.length, i = Array(r);
	for (let t = 0; t < r; t++) i[t] = n?.[t] ?? I(e[t]);
	let a = t === "rtl" ? 1 : t === "ltr" ? 0 : H(i, 0, r), { pdiOf: o, initOf: s } = _e(i), { levels: c, types: l } = ve(i, a, o), u = Array(r);
	for (let e = 0; e < r; e++) u[e] = ge(i[e]);
	let d = be(i, c, u, a, o, s), f = l;
	for (let t of d) Se(t, e, i, f, c);
	let p = (e) => {
		let t = i[e];
		return t === "WS" || R(t) || t === "PDI" || u[e];
	};
	for (let e = 0; e < r; e++) {
		let t = i[e];
		if (t === "B" || t === "S") {
			c[e] = a;
			for (let t = e - 1; t >= 0 && p(t); t--) u[t] || (c[t] = a);
		}
	}
	for (let e = r - 1; e >= 0 && p(e); e--) u[e] || (c[e] = a);
	for (let e = 0; e < r; e++) u[e] && (c[e] = -1);
	return {
		levels: c,
		paragraphLevel: a
	};
}
function we(e, t, n) {
	let r = [];
	for (let i = t; i < n; i++) {
		let t = e[i];
		t >= 0 && t <= 126 && r.push(i);
	}
	if (r.length === 0) return r;
	let i = 0, a = 127;
	for (let t of r) {
		let n = e[t];
		n > i && (i = n), n & 1 && n < a && (a = n);
	}
	for (let t = i; t >= a; t--) {
		let n = 0;
		for (; n < r.length;) if (e[r[n]] >= t) {
			let i = n + 1;
			for (; i < r.length && e[r[i]] >= t;) i++;
			for (let e = n, t = i - 1; e < t; e++, t--) {
				let n = r[e];
				r[e] = r[t], r[t] = n;
			}
			n = i;
		} else n++;
	}
	return r;
}
function Te(e) {
	let t = [], n = [], r = [];
	for (let i = 0; i < e.length;) {
		let a = e.codePointAt(i), o = a > 65535 ? 2 : 1;
		t.push(a), n.push(o), r.push(i), i += o;
	}
	return {
		cps: t,
		units: n,
		starts: r
	};
}
var Ee = class {
	computeLevels(e, t, n) {
		let { cps: r, units: i, starts: a } = Te(e), { levels: o, paragraphLevel: s } = Ce(r, t, n ? r.map((e, t) => n[a[t]] ?? null) : void 0), c = new Uint8Array(e.length), l = 0;
		for (let e = 0; e < o.length; e++) {
			let t = o[e] === -1 ? 255 : o[e];
			for (let n = 0; n < i[e]; n++) c[l++] = t;
		}
		return {
			levels: c,
			paragraphLevel: s
		};
	}
	reorderVisual(e, t, n) {
		return we(e, t, n);
	}
	getMirror(e) {
		return me(e);
	}
}, De = /* @__PURE__ */ new WeakSet(), Oe = Ee.prototype.computeLevels, ke = Ee.prototype.reorderVisual;
function Ae(e) {
	return De.has(e) && e.computeLevels === Oe && e.reorderVisual === ke;
}
function je() {
	let e = new Ee();
	return De.add(e), e;
}
var Me = null, Ne = Object.freeze({});
function Pe() {
	return Ne;
}
function Fe() {
	return Me === null && (Me = je()), Me;
}
var Ie = /[\u0590-\u08FF\uFB1D-\uFDFF\uFE70-\uFEFF\u200F\u202B\u202E\u2067]|[\u{10800}-\u{10FFF}\u{1E800}-\u{1EFFF}]/u;
function Le(e) {
	return Ie.test(e);
}
function Re(e, t, n) {
	let r = n.length, i = new Uint8Array(r);
	for (let a = 0; a < r; a++) {
		let r = e[n[a]];
		i[a] = r === 255 ? t : r;
	}
	return {
		order: Fe().reorderVisual(i, 0, r),
		segLevels: i
	};
}
var ze = [
	"U",
	"C",
	"D",
	"L",
	"R",
	"T"
], Be = [
	0,
	173,
	174,
	768,
	880,
	1155,
	1162,
	1425,
	1470,
	1471,
	1472,
	1473,
	1475,
	1476,
	1478,
	1479,
	1480,
	1552,
	1563,
	1564,
	1565,
	1568,
	1569,
	1570,
	1574,
	1575,
	1576,
	1577,
	1578,
	1583,
	1587,
	1600,
	1601,
	1608,
	1609,
	1611,
	1632,
	1646,
	1648,
	1649,
	1652,
	1653,
	1656,
	1672,
	1690,
	1728,
	1729,
	1731,
	1740,
	1741,
	1742,
	1743,
	1744,
	1746,
	1748,
	1749,
	1750,
	1757,
	1759,
	1765,
	1767,
	1769,
	1770,
	1774,
	1776,
	1786,
	1789,
	1791,
	1792,
	1807,
	1808,
	1809,
	1810,
	1813,
	1818,
	1822,
	1823,
	1832,
	1833,
	1834,
	1835,
	1836,
	1837,
	1839,
	1840,
	1867,
	1869,
	1870,
	1881,
	1884,
	1899,
	1901,
	1905,
	1906,
	1907,
	1909,
	1912,
	1914,
	1920,
	1958,
	1969,
	1994,
	2027,
	2036,
	2042,
	2043,
	2045,
	2046,
	2070,
	2074,
	2075,
	2084,
	2085,
	2088,
	2089,
	2094,
	2112,
	2113,
	2118,
	2120,
	2121,
	2122,
	2132,
	2133,
	2134,
	2137,
	2140,
	2144,
	2145,
	2146,
	2150,
	2151,
	2152,
	2153,
	2155,
	2160,
	2179,
	2182,
	2183,
	2185,
	2190,
	2191,
	2192,
	2199,
	2208,
	2218,
	2221,
	2222,
	2223,
	2225,
	2227,
	2233,
	2234,
	2249,
	2250,
	2274,
	2275,
	2307,
	2362,
	2363,
	2364,
	2365,
	2369,
	2377,
	2381,
	2382,
	2385,
	2392,
	2402,
	2404,
	2433,
	2434,
	2492,
	2493,
	2497,
	2501,
	2509,
	2510,
	2530,
	2532,
	2558,
	2559,
	2561,
	2563,
	2620,
	2621,
	2625,
	2627,
	2631,
	2633,
	2635,
	2638,
	2641,
	2642,
	2672,
	2674,
	2677,
	2678,
	2689,
	2691,
	2748,
	2749,
	2753,
	2758,
	2759,
	2761,
	2765,
	2766,
	2786,
	2788,
	2810,
	2816,
	2817,
	2818,
	2876,
	2877,
	2879,
	2880,
	2881,
	2885,
	2893,
	2894,
	2901,
	2903,
	2914,
	2916,
	2946,
	2947,
	3008,
	3009,
	3021,
	3022,
	3072,
	3073,
	3076,
	3077,
	3132,
	3133,
	3134,
	3137,
	3142,
	3145,
	3146,
	3150,
	3157,
	3159,
	3170,
	3172,
	3201,
	3202,
	3260,
	3261,
	3263,
	3264,
	3270,
	3271,
	3276,
	3278,
	3298,
	3300,
	3328,
	3330,
	3387,
	3389,
	3393,
	3397,
	3405,
	3406,
	3426,
	3428,
	3457,
	3458,
	3530,
	3531,
	3538,
	3541,
	3542,
	3543,
	3633,
	3634,
	3636,
	3643,
	3655,
	3663,
	3761,
	3762,
	3764,
	3773,
	3784,
	3791,
	3864,
	3866,
	3893,
	3894,
	3895,
	3896,
	3897,
	3898,
	3953,
	3967,
	3968,
	3973,
	3974,
	3976,
	3981,
	3992,
	3993,
	4029,
	4038,
	4039,
	4141,
	4145,
	4146,
	4152,
	4153,
	4155,
	4157,
	4159,
	4184,
	4186,
	4190,
	4193,
	4209,
	4213,
	4226,
	4227,
	4229,
	4231,
	4237,
	4238,
	4253,
	4254,
	4957,
	4960,
	5906,
	5909,
	5938,
	5940,
	5970,
	5972,
	6002,
	6004,
	6068,
	6070,
	6071,
	6078,
	6086,
	6087,
	6089,
	6100,
	6109,
	6110,
	6151,
	6152,
	6154,
	6155,
	6158,
	6159,
	6160,
	6176,
	6265,
	6277,
	6279,
	6313,
	6314,
	6315,
	6432,
	6435,
	6439,
	6441,
	6450,
	6451,
	6457,
	6460,
	6679,
	6681,
	6683,
	6684,
	6742,
	6743,
	6744,
	6751,
	6752,
	6753,
	6754,
	6755,
	6757,
	6765,
	6771,
	6781,
	6783,
	6784,
	6832,
	6878,
	6880,
	6892,
	6912,
	6916,
	6964,
	6965,
	6966,
	6971,
	6972,
	6973,
	6978,
	6979,
	7019,
	7028,
	7040,
	7042,
	7074,
	7078,
	7080,
	7082,
	7083,
	7086,
	7142,
	7143,
	7144,
	7146,
	7149,
	7150,
	7151,
	7154,
	7212,
	7220,
	7222,
	7224,
	7376,
	7379,
	7380,
	7393,
	7394,
	7401,
	7405,
	7406,
	7412,
	7413,
	7416,
	7418,
	7616,
	7680,
	8203,
	8204,
	8205,
	8206,
	8208,
	8234,
	8239,
	8288,
	8293,
	8298,
	8304,
	8400,
	8433,
	11503,
	11506,
	11647,
	11648,
	11744,
	11776,
	12330,
	12334,
	12441,
	12443,
	42607,
	42611,
	42612,
	42622,
	42654,
	42656,
	42736,
	42738,
	43010,
	43011,
	43014,
	43015,
	43019,
	43020,
	43045,
	43047,
	43052,
	43053,
	43072,
	43122,
	43123,
	43204,
	43206,
	43232,
	43250,
	43263,
	43264,
	43302,
	43310,
	43335,
	43346,
	43392,
	43395,
	43443,
	43444,
	43446,
	43450,
	43452,
	43454,
	43493,
	43494,
	43561,
	43567,
	43569,
	43571,
	43573,
	43575,
	43587,
	43588,
	43596,
	43597,
	43644,
	43645,
	43696,
	43697,
	43698,
	43701,
	43703,
	43705,
	43710,
	43712,
	43713,
	43714,
	43756,
	43758,
	43766,
	43767,
	44005,
	44006,
	44008,
	44009,
	44013,
	44014,
	64286,
	64287,
	65024,
	65040,
	65056,
	65072,
	65279,
	65280,
	65529,
	65532,
	66045,
	66046,
	66272,
	66273,
	66422,
	66427,
	68097,
	68100,
	68101,
	68103,
	68108,
	68112,
	68152,
	68155,
	68159,
	68160,
	68288,
	68293,
	68294,
	68295,
	68296,
	68297,
	68299,
	68301,
	68302,
	68307,
	68311,
	68312,
	68317,
	68318,
	68321,
	68322,
	68324,
	68325,
	68327,
	68331,
	68335,
	68336,
	68480,
	68481,
	68482,
	68483,
	68486,
	68489,
	68490,
	68492,
	68493,
	68494,
	68496,
	68497,
	68498,
	68521,
	68525,
	68527,
	68864,
	68865,
	68898,
	68899,
	68900,
	68904,
	68969,
	68974,
	69291,
	69293,
	69314,
	69315,
	69317,
	69318,
	69320,
	69370,
	69376,
	69424,
	69427,
	69428,
	69445,
	69446,
	69457,
	69460,
	69461,
	69488,
	69492,
	69494,
	69506,
	69510,
	69552,
	69553,
	69554,
	69556,
	69559,
	69560,
	69561,
	69563,
	69565,
	69566,
	69568,
	69569,
	69570,
	69572,
	69573,
	69577,
	69578,
	69579,
	69580,
	69633,
	69634,
	69688,
	69703,
	69744,
	69745,
	69747,
	69749,
	69759,
	69762,
	69811,
	69815,
	69817,
	69819,
	69826,
	69827,
	69888,
	69891,
	69927,
	69932,
	69933,
	69941,
	70003,
	70004,
	70016,
	70018,
	70070,
	70079,
	70089,
	70093,
	70095,
	70096,
	70191,
	70194,
	70196,
	70197,
	70198,
	70200,
	70206,
	70207,
	70209,
	70210,
	70367,
	70368,
	70371,
	70379,
	70400,
	70402,
	70459,
	70461,
	70464,
	70465,
	70502,
	70509,
	70512,
	70517,
	70587,
	70593,
	70606,
	70607,
	70608,
	70609,
	70610,
	70611,
	70625,
	70627,
	70712,
	70720,
	70722,
	70725,
	70726,
	70727,
	70750,
	70751,
	70835,
	70841,
	70842,
	70843,
	70847,
	70849,
	70850,
	70852,
	71090,
	71094,
	71100,
	71102,
	71103,
	71105,
	71132,
	71134,
	71219,
	71227,
	71229,
	71230,
	71231,
	71233,
	71339,
	71340,
	71341,
	71342,
	71344,
	71350,
	71351,
	71352,
	71453,
	71454,
	71455,
	71456,
	71458,
	71462,
	71463,
	71468,
	71727,
	71736,
	71737,
	71739,
	71995,
	71997,
	71998,
	71999,
	72003,
	72004,
	72148,
	72152,
	72154,
	72156,
	72160,
	72161,
	72193,
	72203,
	72243,
	72249,
	72251,
	72255,
	72263,
	72264,
	72273,
	72279,
	72281,
	72284,
	72330,
	72343,
	72344,
	72346,
	72544,
	72545,
	72546,
	72549,
	72550,
	72551,
	72752,
	72759,
	72760,
	72766,
	72767,
	72768,
	72850,
	72872,
	72874,
	72881,
	72882,
	72884,
	72885,
	72887,
	73009,
	73015,
	73018,
	73019,
	73020,
	73022,
	73023,
	73030,
	73031,
	73032,
	73104,
	73106,
	73109,
	73110,
	73111,
	73112,
	73459,
	73461,
	73472,
	73474,
	73526,
	73531,
	73536,
	73537,
	73538,
	73539,
	73562,
	73563,
	78896,
	78913,
	78919,
	78934,
	90398,
	90410,
	90413,
	90416,
	92912,
	92917,
	92976,
	92983,
	94031,
	94032,
	94095,
	94099,
	94180,
	94181,
	113821,
	113823,
	113824,
	113828,
	118528,
	118574,
	118576,
	118599,
	119143,
	119146,
	119155,
	119171,
	119173,
	119180,
	119210,
	119214,
	119362,
	119365,
	121344,
	121399,
	121403,
	121453,
	121461,
	121462,
	121476,
	121477,
	121499,
	121504,
	121505,
	121520,
	122880,
	122887,
	122888,
	122905,
	122907,
	122914,
	122915,
	122917,
	122918,
	122923,
	123023,
	123024,
	123184,
	123191,
	123566,
	123567,
	123628,
	123632,
	124140,
	124144,
	124398,
	124400,
	124643,
	124644,
	124646,
	124647,
	124654,
	124656,
	124661,
	124662,
	125136,
	125143,
	125184,
	125252,
	125260,
	917505,
	917506,
	917536,
	917632,
	917760,
	918e3
], Ve = [
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	2,
	0,
	4,
	2,
	4,
	2,
	4,
	2,
	4,
	2,
	1,
	2,
	4,
	2,
	5,
	0,
	2,
	5,
	4,
	0,
	4,
	2,
	4,
	2,
	4,
	2,
	4,
	2,
	4,
	2,
	4,
	2,
	4,
	0,
	4,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	4,
	0,
	2,
	0,
	2,
	0,
	5,
	4,
	5,
	2,
	4,
	2,
	4,
	2,
	4,
	2,
	4,
	2,
	4,
	2,
	4,
	5,
	0,
	4,
	2,
	4,
	2,
	4,
	2,
	4,
	2,
	4,
	2,
	4,
	2,
	0,
	5,
	0,
	2,
	5,
	0,
	1,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	4,
	2,
	4,
	2,
	4,
	2,
	4,
	2,
	4,
	5,
	0,
	2,
	0,
	2,
	0,
	4,
	2,
	4,
	0,
	4,
	1,
	2,
	0,
	2,
	4,
	2,
	0,
	5,
	2,
	4,
	0,
	4,
	2,
	4,
	2,
	4,
	2,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	2,
	0,
	1,
	5,
	0,
	5,
	0,
	2,
	0,
	5,
	2,
	5,
	2,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	1,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	2,
	3,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	2,
	4,
	0,
	4,
	0,
	4,
	0,
	3,
	4,
	2,
	3,
	2,
	4,
	2,
	4,
	0,
	4,
	5,
	0,
	2,
	4,
	0,
	2,
	4,
	2,
	4,
	2,
	4,
	2,
	4,
	2,
	4,
	2,
	4,
	0,
	4,
	2,
	0,
	3,
	2,
	4,
	2,
	5,
	0,
	5,
	0,
	5,
	0,
	4,
	2,
	0,
	2,
	0,
	5,
	0,
	2,
	4,
	2,
	0,
	5,
	2,
	4,
	0,
	2,
	4,
	2,
	5,
	0,
	2,
	0,
	2,
	4,
	0,
	2,
	4,
	2,
	4,
	2,
	0,
	2,
	4,
	2,
	0,
	4,
	2,
	3,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0,
	2,
	5,
	0,
	5,
	0,
	5,
	0,
	5,
	0
];
function U(e) {
	let t = 0, n = Be.length - 1, r = -1;
	for (; t <= n;) {
		let i = t + (n - t >> 1);
		Be[i] <= e ? (r = i, t = i + 1) : n = i - 1;
	}
	return r < 0 ? "U" : ze[Ve[r]] ?? "U";
}
function He(e) {
	let t = U(e);
	return t === "D" || t === "L" || t === "C";
}
function Ue(e) {
	let t = U(e);
	return t === "D" || t === "R" || t === "C";
}
function We(e, t, r) {
	for (let i of n(e, {
		weight: t,
		style: r
	})) {
		let e = i.decoration;
		if (!e || !(i.unitsPerEm > 0)) continue;
		let [t, n, r, a] = e;
		if (!(n > 0) || !(a > 0) || !(r > 0)) continue;
		let o = i.unitsPerEm;
		return Object.freeze({
			underlineTopEm: -t / o,
			underlineThicknessEm: n / o,
			strikeTopEm: -r / o,
			strikeThicknessEm: a / o
		});
	}
	return null;
}
function W(e, t, n) {
	let r = Math.round(t * n) % 2 == 1 ? .5 : 0, i = e * n;
	return (Math.round(i - r) + r) / n - e;
}
function G(e, t) {
	return e.map((e) => e * t);
}
var Ge = {
	dotted: [1, 2],
	dashed: [3, 2],
	dashSmallGap: [3, 1],
	dotDash: [
		1,
		2,
		3,
		2
	],
	dotDotDash: [
		1,
		2,
		1,
		2,
		3,
		2
	],
	dashDotStroked: [
		1,
		2,
		3,
		2
	]
};
function Ke(t, n) {
	let r = e(Ge, t);
	return r ? G(r, n) : [];
}
var qe = {
	hair: [1, 1],
	dashed: [4, 3],
	mediumDashed: [4, 3],
	dotted: [2, 2],
	dashDot: [
		4,
		2,
		1,
		2
	],
	mediumDashDot: [
		4,
		2,
		1,
		2
	],
	dashDotDot: [
		4,
		2,
		1,
		2,
		1,
		2
	],
	mediumDashDotDot: [
		4,
		2,
		1,
		2,
		1,
		2
	],
	slantDashDot: [
		5,
		3,
		1,
		3
	]
};
function Je(t) {
	let n = e(qe, t);
	return n ? G(n, 1) : [];
}
var Ye = {
	dash: [6, 3],
	dot: [1.5, 3],
	dashDot: [
		6,
		3,
		1.5,
		3
	],
	lgDash: [10, 4],
	lgDashDot: [
		10,
		4,
		1.5,
		4
	],
	lgDashDotDot: [
		10,
		4,
		1.5,
		4,
		1.5,
		4
	],
	sysDash: [4, 2],
	sysDot: [1, 2],
	sysDashDot: [
		4,
		2,
		1,
		2
	],
	sysDashDotDot: [
		4,
		2,
		1,
		2,
		1,
		2
	]
};
function Xe(t, n) {
	let r = e(Ye, t);
	return r ? G(r, n) : [];
}
var Ze = 512;
function Qe(e, t, n) {
	if (e != null) {
		let t = [];
		for (let r = 0; r < Math.min(e.length, Ze); r += 1) {
			let i = e[r];
			!Number.isFinite(i.dash) || !Number.isFinite(i.space) || i.dash < 0 || i.space < 0 || i.dash === 0 && i.space === 0 || t.push(i.dash * n, i.space * n);
		}
		return t;
	}
	return Xe(t ?? "solid", n);
}
function $e(e, t) {
	let n = Xe(e, t);
	if (n.length > 0) return n;
	let r = e.trim().split(/[\s,]+/).map(Number);
	return r.length >= 2 && r.every((e) => Number.isFinite(e) && e >= 0) && r.some((e) => e > 0) ? (r.length % 2 != 0 && r.pop(), G(r, t)) : [];
}
var et = {
	dotted: [1.5, 3],
	dottedHeavy: [1.5, 3],
	dash: [6, 3],
	dashHeavy: [6, 3],
	dashLong: [10, 4],
	dashLongHeavy: [10, 4],
	dotDash: [
		6,
		3,
		1.5,
		3
	],
	dotDashHeavy: [
		6,
		3,
		1.5,
		3
	],
	dotDotDash: [
		6,
		3,
		1.5,
		3,
		1.5,
		3
	],
	dotDotDashHeavy: [
		6,
		3,
		1.5,
		3,
		1.5,
		3
	]
};
function tt(t, n) {
	let r = e(et, t);
	return r ? G(r, n) : [];
}
var nt = .05, rt = .32, it = 1.8, at = 1.4, ot = 6, st = 2.5;
function ct(e, t, n, r, i, a, o, s = 1, c, l) {
	let u = c == null ? l ? l.thicknessPx : Math.max(1, i * nt) : Math.max(0, c), d = o === "heavy" || (o?.endsWith("Heavy") ?? !1), f = d ? u * (l ? 1.5 : it) : u, p = l ? n + l.topPx + u / 2 : void 0, m = p === void 0 ? n + Math.max(2, f) : d ? p - f / 2 : p, h = W(m, f, s);
	if (e.strokeStyle = a, e.lineWidth = f, e.setLineDash([]), o && o.startsWith("wavy")) {
		let n = f, i = f * ot;
		e.beginPath(), e.moveTo(t, m);
		let a = Math.max(1, f * .5);
		for (let o = 0; o <= r; o += a) {
			let r = m + Math.sin(o / i * Math.PI * 2) * n;
			e.lineTo(t + o, r);
		}
		if (e.stroke(), o === "wavyDbl") {
			e.beginPath(), e.moveTo(t, m + n * st);
			for (let o = 0; o <= r; o += a) {
				let r = m + n * st + Math.sin(o / i * Math.PI * 2) * n;
				e.lineTo(t + o, r);
			}
			e.stroke();
		}
		return;
	}
	if (o === "dbl") {
		let n = f * at, i = m - n / 2, a = m + n / 2;
		e.beginPath(), e.moveTo(t, i + W(i, f, s)), e.lineTo(t + r, i + W(i, f, s)), e.moveTo(t, a + W(a, f, s)), e.lineTo(t + r, a + W(a, f, s)), e.stroke();
		return;
	}
	e.setLineDash(tt(o ?? "sng", f)), e.beginPath(), e.moveTo(t, m + h), e.lineTo(t + r, m + h), e.stroke(), e.setLineDash([]);
}
var lt = 16, ut = 128, dt = 8192, ft = 2, pt = 6, mt = 8, ht = 24, gt = 256, _t = 2, vt = 0, yt = 2, bt = 130, xt = 255, St = {
	161: "windows-1253",
	162: "windows-1254",
	163: "windows-1258",
	177: "windows-1255",
	178: "windows-1256",
	186: "windows-1257",
	204: "windows-1251",
	222: "windows-874",
	238: "windows-1250"
}, Ct = {
	128: {
		label: "shift_jis",
		lead: (e) => e >= 129 && e <= 159 || e >= 224 && e <= 252,
		cjk: "jp"
	},
	129: {
		label: "euc-kr",
		lead: (e) => e >= 129 && e <= 254,
		cjk: "kr"
	},
	134: {
		label: "gbk",
		lead: (e) => e >= 129 && e <= 254,
		cjk: "sc"
	},
	136: {
		label: "big5",
		lead: (e) => e >= 129 && e <= 254,
		cjk: "tc"
	}
}, wt = [
	8364,
	129,
	8218,
	402,
	8222,
	8230,
	8224,
	8225,
	710,
	8240,
	352,
	8249,
	338,
	141,
	381,
	143,
	144,
	8216,
	8217,
	8220,
	8221,
	8226,
	8211,
	8212,
	732,
	8482,
	353,
	8250,
	339,
	157,
	382,
	376
], Tt = /* @__PURE__ */ new Map();
function Et(e) {
	if (!Tt.has(e)) {
		let t = null;
		try {
			t = new TextDecoder(e, { fatal: !0 });
		} catch {
			t = null;
		}
		Tt.set(e, t);
	}
	return Tt.get(e) ?? null;
}
var Dt = "ÇüéâäàåçêëèïîìÄÅÉæÆôöòûùÿÖÜ¢£¥₧ƒáíóúñÑªº¿⌐¬½¼¡«»░▒▓│┤╡╢╖╕╣║╗╝╜╛┐└┴┬├─┼╞╟╚╔╩╦╠═╬╧╨╤╥╙╘╒╓╫╪┘┌█▄▌▐▀αßΓπΣσµτΦΘΩδ∞φε∩≡±≥≤⌠⌡÷≈°∙·√ⁿ²■\xA0", Ot = [
	-1,
	-1,
	0,
	1,
	2,
	3,
	4,
	5,
	6,
	7,
	8,
	9,
	10,
	11,
	12,
	13,
	14,
	15,
	16,
	17,
	18
], kt = [
	-1,
	-1,
	-1,
	0,
	1,
	2,
	3,
	4,
	-1,
	-1,
	5,
	6,
	7,
	8,
	9,
	10,
	-1,
	-1,
	11,
	12,
	13,
	14,
	15,
	16,
	-1,
	-1,
	17,
	18,
	19,
	20
], At = [
	-1,
	0,
	1,
	2,
	3,
	4,
	5,
	6,
	7,
	8,
	9,
	10,
	11,
	12,
	13,
	14,
	15,
	16,
	-1,
	17,
	18,
	19,
	20,
	21,
	22,
	23,
	24,
	25,
	26,
	27
], jt = [
	12593,
	12594,
	12596,
	12599,
	12600,
	12601,
	12609,
	12610,
	12611,
	12613,
	12614,
	12615,
	12616,
	12617,
	12618,
	12619,
	12620,
	12621,
	12622
], Mt = [
	0,
	12593,
	12594,
	12595,
	12596,
	12597,
	12598,
	12599,
	12601,
	12602,
	12603,
	12604,
	12605,
	12606,
	12607,
	12608,
	12609,
	12610,
	12612,
	12613,
	12614,
	12615,
	12616,
	12618,
	12619,
	12620,
	12621,
	12622
];
function Nt(e) {
	let t = [], n = Et("euc-kr");
	for (let r = 0; r < e.length;) {
		let i = e[r];
		if (i < 128) {
			t.push({
				text: i === 92 ? "₩" : String.fromCharCode(i),
				start: r,
				count: 1,
				face: "authored"
			}), r += 1;
			continue;
		}
		if (r + 1 >= e.length) return { problem: "truncated double-byte character" };
		let a = e[r + 1], o = null;
		if (i >= 132 && i <= 211 && (a >= 65 && a <= 126 || a >= 129) && a !== 255) {
			let e = i << 8 | a, t = Ot[e >> 10 & 31] ?? -1, n = kt[e >> 5 & 31] ?? -1, r = At[e & 31] ?? -1, s = (e >> 10 & 31) == 1, c = (e >> 5 & 31) == 2;
			t >= 0 && n >= 0 && r >= 0 ? o = String.fromCharCode(44032 + (t * 21 + n) * 28 + r) : s && c && r === 0 ? o = "ㅤ" : t >= 0 && c && r === 0 ? o = String.fromCharCode(jt[t]) : s && n >= 0 && r === 0 ? o = String.fromCharCode(12623 + n) : s && c && r > 0 && (o = String.fromCharCode(Mt[r]));
		} else if ((i >= 217 && i <= 222 || i >= 224 && i <= 249) && (a >= 49 && a <= 126 || a >= 145 && a <= 254)) {
			let e = a >= 161, t = (i <= 222 ? (i - 217) * 2 + 33 : (i - 224) * 2 + 74) + +!!e, r = e ? a - 128 : a <= 126 ? a - 16 : a - 34;
			try {
				o = n?.decode(new Uint8Array([t | 128, r | 128])) ?? null;
			} catch {
				o = null;
			}
		}
		if (o === null) return { problem: "byte undefined in code page" };
		t.push({
			text: o,
			start: r,
			count: 2,
			face: "authored"
		}), r += 2;
	}
	return { units: t };
}
function Pt(e, t, n, r) {
	let i = [];
	if (t === yt) {
		let t = Array.from(e, (e) => String.fromCharCode(61440 + e)).join(""), a = !j(n) && e.length > 0 && !r(t), o = a ? ue : n;
		return e.forEach((e, n) => {
			let r = de(e, o);
			i.push(r === void 0 ? {
				text: t[n],
				start: n,
				count: 1,
				face: a ? "substitute" : "authored"
			} : {
				text: r,
				start: n,
				count: 1,
				face: "symbol"
			});
		}), { units: i };
	}
	if (t === vt) return e.forEach((e, t) => i.push({
		text: String.fromCharCode(e >= 128 && e <= 159 ? wt[e - 128] : e),
		start: t,
		count: 1,
		face: "authored"
	})), { units: i };
	if (t === xt) return e.forEach((e, t) => i.push({
		text: String.fromCharCode(e < 128 ? e : Dt.charCodeAt(e - 128)),
		start: t,
		count: 1,
		face: "authored"
	})), { units: i };
	if (t === bt) return Nt(e);
	let a = St[t], o = Ct[t];
	if (!a && !o) return { problem: "undefined character set" };
	let s = Et(a ?? o.label);
	if (!s) return { problem: "character set decoder unavailable" };
	for (let t = 0; t < e.length;) {
		let n = o && o.lead(e[t]) ? 2 : 1;
		if (t + n > e.length) return { problem: "truncated double-byte character" };
		let r;
		try {
			r = s.decode(e.subarray(t, t + n));
		} catch {
			return { problem: "byte undefined in code page" };
		}
		i.push({
			text: r,
			start: t,
			count: n,
			face: "authored"
		}), t += n;
	}
	return { units: i };
}
function Ft(e) {
	let t = new DataView(e.buffer, e.byteOffset, e.byteLength), n = e.byteLength >= 18, r = (e) => n ? t.getInt16(e, !0) : 0, i = e.subarray(18, Math.min(e.byteLength, 50)), a = i.indexOf(0), o = n ? e[13] : 0, s = i.subarray(0, a < 0 ? i.length : a), c = Ct[o]?.label ?? St[o], l = String.fromCharCode(...s);
	if (c) try {
		l = Et(c)?.decode(s) ?? l;
	} catch {}
	return {
		kind: "font",
		height: r(0),
		width: r(2),
		escapement: r(4),
		orientation: r(6),
		weight: r(8),
		italic: n && e[10] !== 0,
		underline: n && e[11] !== 0,
		strikeout: n && e[12] !== 0,
		charset: o,
		pitchAndFamily: n ? e[17] : 0,
		face: l,
		valid: n && a > 0
	};
}
function It(e) {
	switch (e.pitchAndFamily & 240) {
		case 16: return "serif";
		case 32: return "sans-serif";
		case 48: return "monospace";
		case 64: return "cursive";
		case 80: return "fantasy";
		default: break;
	}
	if ((e.pitchAndFamily & 3) == 1) return "monospace";
	let t = i(e.face);
	return t === "mono" ? "monospace" : t === "serif" ? "serif" : "sans-serif";
}
function Lt(e, t) {
	let n = [e.face], i = C(e.face);
	i && n.push(i);
	let a = Ct[e.charset]?.cjk;
	return a && n.push(...r(a, t === "serif" ? "serif" : "sans")), `${n.map(h).join(", ")}, ${t}`;
}
function Rt(e) {
	return e.pitchAndFamily & 240 ? It(e) : "serif";
}
var zt = [
	["a", 64],
	["b", 14],
	["c", 27],
	["d", 35],
	["e", 100],
	["f", 20],
	["g", 14],
	["h", 42],
	["i", 63],
	["j", 3],
	["k", 6],
	["l", 35],
	["m", 20],
	["n", 56],
	["o", 56],
	["p", 17],
	["q", 4],
	["r", 49],
	["s", 56],
	["t", 71],
	["u", 31],
	["v", 10],
	["w", 18],
	["x", 3],
	["y", 18],
	["z", 2],
	[" ", 166]
], K = 1e3;
function Bt(e, t, r, i) {
	let a = t.italic ? "italic" : "normal", o = n(t.face, {
		weight: i,
		style: a
	})[0] ?? n(t.face, { style: a })[0] ?? n(t.face)[0];
	if (o && o.unitsPerEm > 0) {
		let t = o.unitsPerEm, [n, i] = o.win ?? [o.hhea[0], -o.hhea[1]], a = o.xAvgCharWidth;
		return {
			ascentEm: n / t,
			descentEm: i / t,
			avgCharWidthEm: () => a && a > 0 ? a / t : Vt(e, r)
		};
	}
	e.font = r(K);
	let s = e.measureText("Hg"), c = s.fontBoundingBoxAscent, l = s.fontBoundingBoxDescent;
	return !Number.isFinite(c) || !Number.isFinite(l) || c + l <= 0 ? null : {
		ascentEm: c / K,
		descentEm: l / K,
		avgCharWidthEm: () => Vt(e, r)
	};
}
function Vt(e, t) {
	e.font = t(K);
	let n = 0;
	for (let [t, r] of zt) n += e.measureText(t).width * r;
	return n / 1e3 / K;
}
var q = "‍";
function Ht(e, t) {
	let n = e.join("");
	if (!t && !Le(n)) return e.map(() => 0);
	let { levels: r, paragraphLevel: i } = Fe().computeLevels(n, t ? "rtl" : "ltr"), a = 0;
	return e.map((e) => {
		let t = r[a];
		return a += e.length, t === 255 ? i : t;
	});
}
var Ut = 1604, Wt = new Set([
	1570,
	1571,
	1573,
	1575,
	1649
]);
function Gt(e, t, n = e.map(() => 0)) {
	let r = [], i = (t) => e[t].codePointAt(0) ?? 0, a = (t) => [...e[t]].every((e) => U(e.codePointAt(0)) === "T"), o = (e) => {
		let t = e.last;
		for (; t > e.first && a(t);) t--;
		return t;
	};
	for (let s = 0; s < e.length; s++) {
		let c = r.at(-1);
		if (c && t[s] === t[c.first] && n[s] === n[c.first] && e[s].length > 0 && (a(s) || o(c) === c.first && i(c.first) === Ut && Wt.has(i(s)))) {
			c.last = s;
			continue;
		}
		r.push({
			first: s,
			last: s,
			joinBefore: !1,
			joinAfter: !1
		});
	}
	let s = (e) => {
		for (let t = e.first; t <= e.last; t++) if (!a(t)) return !1;
		return !0;
	};
	for (let e = 1; e < r.length; e++) {
		let n = r[e];
		if (s(n)) continue;
		let a = e - 1;
		for (; a >= 0 && t[r[a].first] === t[n.first] && s(r[a]);) a--;
		if (!(a < 0 || t[r[a].first] !== t[n.first]) && He(i(o(r[a]))) && Ue(i(n.first))) {
			for (let t = a; t < e; t++) r[t].joinAfter = !0;
			for (let t = a + 1; t <= e; t++) r[t].joinBefore = !0;
		}
	}
	return r;
}
var Kt = "__ooxml_wmf_missing_face_control_5b2e__";
function qt(e, t, n, r) {
	let i = (t) => {
		e.font = `${K}px ${t}${h(Kt)}, serif`;
		let r = e.measureText(n);
		return [
			r.width,
			r.actualBoundingBoxAscent,
			r.actualBoundingBoxDescent,
			r.actualBoundingBoxLeft,
			r.actualBoundingBoxRight
		];
	}, a = i(`${ee(h(t), r)}, `), o = i("");
	return !a.every((e, t) => Object.is(e, o[t]));
}
function Jt(e, t) {
	let n = e.vpW / e.extX, r = e.vpH / e.extY;
	if (!e.haveExt) return { problem: "logical mapping undefined" };
	if (!(Number.isFinite(n) && Number.isFinite(r) && n !== 0 && r !== 0)) return { problem: "degenerate mapping" };
	if (t.bytes.length === 0) return { drew: t.rect !== null && (t.options & 2) != 0 && Xt(e, t.rect) };
	let i = e.curFont;
	if (!i) return { problem: "no font selected" };
	if (!i.valid) return { problem: "malformed font" };
	if (i.height === 0) return { problem: "default font height" };
	if (i.face.startsWith("@")) return { problem: "vertical font" };
	if (t.options & lt) return { problem: "glyph index string" };
	let a = e.textAlign & pt, o = e.textAlign & ht;
	if (a === 4 || o === 16) return { problem: "undefined text alignment" };
	if (e.textAlign & 1 && !e.currentPositionKnown) return { problem: "current position undefined" };
	let { ctx: s } = e;
	"fontKerning" in s && (s.fontKerning = "none");
	let c = i.weight === 0 ? 400 : Math.min(1e3, Math.max(1, i.weight)), l = i.italic ? "italic " : "", u = ee(Lt(i, It(i)), e.fontFamilies), d = Rt(i), f = ee(`${h(ue)}, ${d}`, e.fontFamilies), p = (e) => (t) => `${l}${c} ${t}px ${e}`, m = Pt(t.bytes, i.charset, i.face, (t) => qt(s, i.face, t, e.fontFamilies));
	if ("problem" in m) return m;
	let { units: g } = m, _ = Bt(s, i, p(u), c);
	if (!_) return { problem: "font metrics unavailable" };
	let v = (i.height < 0 ? -i.height : i.height / (_.ascentEm + _.descentEm)) * Math.abs(r);
	if (!(v > 0 && Number.isFinite(v))) return { problem: "degenerate font size" };
	let y = _.ascentEm * v, te = _.descentEm * v, b = i.width === 0 ? 1 : Math.abs(i.width) * Math.abs(n) / (_.avgCharWidthEm() * v);
	if (!(b > 0 && Number.isFinite(b))) return { problem: "degenerate font width" };
	let x = (e) => p(e.face === "symbol" ? d : e.face === "substitute" ? f : u)(v), S = i.escapement / 10 * (Math.PI / 180), ne = Math.cos(S), C = Math.sin(S), re = Math.sign(n * r) || 1, w = S === 0 ? 0 : -S * re, ie = Math.hypot(ne * n, C * r), ae = Math.hypot(C * n, ne * r) * Math.sign(r), T = (t.options & dt) !== 0, oe = Math.round(e.charExtra * ie), E = e.breakCount > 0 && (e.breakQuotientPx !== 0 || e.breakErrorPx !== 0), D = /* @__PURE__ */ new Map(), se = (e, t) => {
		let n = `${t}\u0000${e}`, r = D.get(n);
		return r === void 0 && (s.font = t, r = s.measureText(e).width * b, D.set(n, r)), r;
	}, ce = t.dx !== null || oe !== 0, O = [], k = 0, le = (n) => {
		if (!E || n.count !== 1 || t.bytes[n.start] !== 32) return 0;
		let r = e.breakQuotientPx;
		return e.breakErrorPx > 0 && (r += 1, --e.breakErrorPx), r;
	}, A = (e.textAlign & gt) !== 0 || (t.options & ut) !== 0;
	if (ce) {
		let e = Gt(g.map((e) => e.text), g.map(x), Ht(g.map((e) => e.text), A));
		for (let n of e) {
			let e = 0, r = 0;
			for (let i = n.first; i <= n.last; i++) {
				let n = g[i];
				if (e += oe + le(n), t.dx) for (let i = n.start; i < n.start + n.count; i++) e += t.dx[T ? i * 2 : i] * ie, T && (r += t.dx[i * 2 + 1] * ae);
			}
			let i = x(g[n.first]), a = g.slice(n.first, n.last + 1).map((e) => e.text).join("");
			t.dx || (e += se(`${n.joinBefore ? q : ""}${a}${n.joinAfter ? q : ""}`, i)), O.push({
				text: a,
				font: i,
				pen: 0,
				rise: k,
				advance: e,
				x: 0,
				level: 0,
				extra: 0,
				brk: !1,
				joinBefore: n.joinBefore,
				joinAfter: n.joinAfter
			}), k += r;
		}
	} else {
		let e = E || g.some((e) => x(e) !== x(g[0])) ? Ht(g.map((e) => e.text), A) : null;
		g.forEach((n, r) => {
			let i = x(n), a = le(n), o = E && n.count === 1 && t.bytes[n.start] === 32, s = e?.[r] ?? 0, c = O.at(-1), l = E && (o || c?.brk === !0) || c !== void 0 && c.level !== s;
			c && c.font === i && !l ? c.text += n.text : O.push({
				text: n.text,
				font: i,
				pen: 0,
				rise: 0,
				advance: 0,
				x: 0,
				level: s,
				extra: a,
				brk: o,
				joinBefore: !1,
				joinAfter: !1
			});
		});
		let n = (e, t) => (t ? [...e].reverse() : [...e]).find((e) => U(e.codePointAt(0)) !== "T");
		for (let e = 1; e < O.length; e++) {
			let t = O[e], r = n(t.text, !1);
			if (t.brk || r === void 0) continue;
			let i = e - 1;
			for (; i >= 0 && !O[i].brk && O[i].font === t.font && n(O[i].text, !0) === void 0;) i--;
			if (!(i < 0 || O[i].brk || O[i].font !== t.font) && He(n(O[i].text, !0).codePointAt(0)) && Ue(r.codePointAt(0))) {
				for (let t = i; t < e; t++) O[t].joinAfter = !0;
				for (let t = i + 1; t <= e; t++) O[t].joinBefore = !0;
			}
		}
	}
	let j = A, de = (e.textAlign & 1) != 0, fe = a !== 0 || j || de || e.bkMode === _t || i.underline || i.strikeout, M = 0;
	if (ce || fe || O.length > 1) for (let e of O) ce || (e.advance = se(`${e.joinBefore ? q : ""}${e.text}${e.joinAfter ? q : ""}`, e.font) + e.extra), e.pen = M, M += e.advance;
	let N = M, P = k, F = O.map((e, t) => t);
	if (O.length > 1) {
		let e = O.map((e) => e.text).join("");
		if (j || Le(e)) {
			let t = Fe(), { levels: n, paragraphLevel: r } = t.computeLevels(e, j ? "rtl" : "ltr"), i = [], a = 0;
			for (let e of O) i.push(a), a += e.text.length;
			let o = Re(n, r, i);
			F = o.order, O.forEach((e, n) => {
				e.level = o.segLevels[n];
				let r = [...e.text], i = r.length === 1 && e.level & 1 ? t.getMirror(r[0].codePointAt(0)) : null;
				i !== null && (e.text = String.fromCodePoint(i));
			});
		}
	}
	{
		let e = 0;
		for (let t of F) O[t].x = e, e += O[t].advance;
	}
	let I = de, pe = I ? e.currentX : t.x, me = I ? e.currentY : t.y, he = e.vpX + (pe - e.orgX) * n, L = e.vpY + (me - e.orgY) * r, ge = a === ft ? -1 : a === pt ? -.5 : 0, R = ge * N, z = ge * P, B = o === ht ? 0 : o === mt ? -te : y, V = i.underline || i.strikeout ? We(i.face, c, i.italic ? "italic" : "normal") : null, H = !1;
	s.save();
	try {
		if (t.rect && t.options & 6) {
			let [n, r, i, a] = Yt(e, t.rect);
			t.options & 2 && (H = Xt(e, t.rect)), t.options & 4 && (s.beginPath(), s.rect(n, r, i, a), s.clip());
		}
		let n = he, r = L;
		w !== 0 && (s.translate(he, L), s.rotate(w), n = 0, r = 0);
		let a = (e) => n + R + e.x;
		if (e.bkMode === _t) {
			s.fillStyle = e.bkColor;
			for (let e of O) e.advance > 0 && s.fillRect(a(e), r + z + B + e.rise - y, e.advance, y + te);
		}
		s.fillStyle = e.textColor, s.textAlign = "left", s.textBaseline = "alphabetic";
		for (let e of O) {
			if (!e.text) continue;
			let t = a(e);
			s.direction = O.length === 1 ? j ? "rtl" : "ltr" : [...e.text].length === 1 ? "ltr" : e.level & 1 ? "rtl" : "ltr";
			let n = r + z + B + e.rise;
			s.font = e.font;
			let i = `${e.joinBefore ? q : ""}${e.text}${e.joinAfter ? q : ""}`;
			b === 1 ? s.fillText(i, t, n) : (s.save(), s.translate(t, n), s.scale(b, 1), s.fillText(i, 0, 0), s.restore());
		}
		if (i.underline || i.strikeout) {
			s.fillStyle = e.textColor;
			let t = V ? V.underlineThicknessEm * v : Math.max(1, v * nt), a = V ? V.strikeThicknessEm * v : t, o = V ? V.underlineTopEm * v : Math.max(2, t), c = V ? V.strikeTopEm * v : -rt * v - a / 2, l = F.map((e) => O[e]), u = 0;
			for (; u < l.length;) {
				let e = u + 1;
				for (; e < l.length && l[e].rise === l[u].rise;) e++;
				let d = l[u], f = l[e - 1], p = d.x, m = f.x + f.advance - d.x;
				if (m > 0) {
					let e = r + z + B + d.rise;
					i.underline && s.fillRect(n + R + p, e + o, m, t), i.strikeout && s.fillRect(n + R + p, e + c, m, a);
				}
				u = e;
			}
		}
	} finally {
		s.restore();
	}
	if (I && a !== pt) {
		let t = a === ft ? -N : N, i = a === ft ? -P : P, o = t * Math.cos(w) - i * Math.sin(w), s = t * Math.sin(w) + i * Math.cos(w);
		e.currentX = pe + o / n, e.currentY = me + s / r;
	}
	return { drew: g.length > 0 || H };
}
function Yt(e, t) {
	let n = e.vpW / e.extX, r = e.vpH / e.extY, [i, a, o, s] = t, c = e.vpX + (i - e.orgX) * n, l = e.vpX + (o - e.orgX) * n, u = e.vpY + (a - e.orgY) * r, d = e.vpY + (s - e.orgY) * r;
	return [
		Math.min(c, l),
		Math.min(u, d),
		Math.abs(l - c),
		Math.abs(d - u)
	];
}
function Xt(e, t) {
	let [n, r, i, a] = Yt(e, t);
	return i > 0 && a > 0 ? (e.ctx.fillStyle = e.bkColor, e.ctx.fillRect(n, r, i, a), !0) : !1;
}
var J = {
	EOF: 0,
	SETBKMODE: 258,
	SETBKCOLOR: 513,
	SETTEXTCHAREXTRA: 264,
	SETTEXTJUSTIFICATION: 522,
	CREATEPALETTE: 247,
	CREATEPATTERNBRUSH: 505,
	DIBCREATEPATTERNBRUSH: 322,
	SETTEXTALIGN: 302,
	SETTEXTCOLOR: 521,
	SETPOLYFILLMODE: 262,
	SETROP2: 260,
	SETMAPMODE: 259,
	SETWINDOWORG: 523,
	SETWINDOWEXT: 524,
	SETVIEWPORTORG: 525,
	SETVIEWPORTEXT: 526,
	OFFSETWINDOWORG: 527,
	OFFSETVIEWPORTORG: 529,
	SCALEWINDOWEXT: 1040,
	SCALEVIEWPORTEXT: 1042,
	INTERSECTCLIPRECT: 1046,
	EXCLUDECLIPRECT: 1045,
	OFFSETCLIPRGN: 544,
	CREATEREGION: 1791,
	SELECTCLIPREGION: 300,
	SAVEDC: 30,
	RESTOREDC: 295,
	SELECTOBJECT: 301,
	DELETEOBJECT: 496,
	LINETO: 531,
	MOVETO: 532,
	TEXTOUT: 1313,
	EXTTEXTOUT: 2610,
	ESCAPE: 1574,
	POLYGON: 804,
	POLYLINE: 805,
	POLYPOLYGON: 1336,
	RECTANGLE: 1051,
	CREATEPENINDIRECT: 762,
	CREATEFONTINDIRECT: 763,
	CREATEBRUSHINDIRECT: 764,
	DIBBITBLT: 2368,
	DIBSTRETCHBLT: 2881,
	STRETCHDIBITS: 3907
}, Zt = 2596720087, Qt = 22, $t = 18, en = 1179469088;
function tn(e, t) {
	if (e.length < t + $t) return !1;
	let n = e[t] | e[t + 1] << 8, r = e[t + 2] | e[t + 3] << 8;
	return (n === 1 || n === 2) && r === 9;
}
function nn(e) {
	return e.length < 4 ? !1 : (e[0] | e[1] << 8 | e[2] << 16 | e[3] << 24) >>> 0 === Zt ? !0 : tn(e, 0);
}
function rn(e) {
	if (e.length < 44) return !1;
	let t = new DataView(e.buffer, e.byteOffset, e.byteLength);
	return t.getUint32(0, !0) === 1 && t.getUint32(40, !0) === en;
}
function an(e) {
	return e === "image/wmf" || e === "image/emf";
}
function Y(e) {
	let t = e & 255, n = e >>> 8 & 255, r = e >>> 16 & 255, i = (e) => e.toString(16).padStart(2, "0");
	return `#${i(t)}${i(n)}${i(r)}`;
}
var on = {
	tree: {
		bounds: [
			-Infinity,
			-Infinity,
			Infinity,
			Infinity
		],
		height: 1
	},
	dx: 0,
	dy: 0
};
function X(e, t) {
	return {
		bounds: [
			Math.min(e.bounds[0], t.bounds[0]),
			Math.min(e.bounds[1], t.bounds[1]),
			Math.max(e.bounds[2], t.bounds[2]),
			Math.max(e.bounds[3], t.bounds[3])
		],
		height: Math.max(e.height, t.height) + 1,
		children: [e, t]
	};
}
function sn(e, t) {
	if (!e) return t;
	if (!t) return e;
	if (e.height > t.height + 1 && e.children) {
		let [n, r] = e.children, i = sn(r, t);
		if (i.height <= n.height + 1) return X(n, i);
		let [a, o] = i.children;
		if (o.height >= a.height) return X(X(n, a), o);
		let [s, c] = a.children;
		return X(X(n, s), X(c, o));
	}
	if (t.height > e.height + 1 && t.children) {
		let [n, r] = t.children, i = sn(e, n);
		if (i.height <= r.height + 1) return X(i, r);
		let [a, o] = i.children;
		if (a.height >= o.height) return X(a, X(o, r));
		let [s, c] = o.children;
		return X(X(a, s), X(c, r));
	}
	return X(e, t);
}
function cn(e, t = 0, n = e.length) {
	if (t === n) return null;
	if (n === t + 1) return {
		bounds: e[t],
		height: 1
	};
	let r = Math.floor((t + n) / 2);
	return X(cn(e, t, r), cn(e, r, n));
}
function Z(e, t) {
	for (let n = 0; n < e.length; n++) if (e[n] == null) {
		e[n] = t;
		return;
	}
	e.push(t);
}
var ln = class {
	b;
	end;
	p = 0;
	constructor(e, t, n) {
		this.b = e, this.end = n, this.p = t;
	}
	get remaining() {
		return this.end - this.p;
	}
	i16() {
		let e = this.u16();
		return e >= 32768 ? e - 65536 : e;
	}
	u16() {
		let e = this.b[this.p] | this.b[this.p + 1] << 8;
		return this.p += 2, e;
	}
	u8() {
		return this.b[this.p++];
	}
	u32() {
		let e = (this.b[this.p] | this.b[this.p + 1] << 8 | this.b[this.p + 2] << 16 | this.b[this.p + 3] << 24) >>> 0;
		return this.p += 4, e;
	}
	bytes(e) {
		let t = Math.min(this.p + Math.max(0, e), this.end), n = this.b.subarray(this.p, t);
		return this.p = t, n;
	}
	skip(e) {
		this.p = Math.min(this.p + Math.max(0, e), this.end);
	}
};
function Q(e, t) {
	return e.vpX + (t - e.orgX) * (e.vpW / e.extX);
}
function $(e, t) {
	return e.vpY + (t - e.orgY) * (e.vpH / e.extY);
}
function un(e, t) {
	if (e.mapMode = t, t <= 6) {
		let n = [
			0,
			1,
			254,
			2540,
			100,
			1e3,
			1440
		][t];
		e.extX = n, e.extY = n, e.vpW = t === 1 ? 1 : 96, e.vpH = t === 1 ? 1 : -96, e.haveExt = !0, e.extTextMappingSafe = !0;
	}
	dn(e);
}
function dn(e) {
	if (e.mapMode !== 7) return;
	let t = Math.min(Math.abs(e.vpW / e.extX), Math.abs(e.vpH / e.extY));
	e.vpW = Math.sign(e.vpW) * Math.abs(e.extX) * t, e.vpH = Math.sign(e.vpH) * Math.abs(e.extY) * t;
}
function fn(e, t) {
	let n = t * Math.abs(e.vpW / e.extX);
	return n >= 1 ? n : 1;
}
function pn(e, t, n) {
	if (e.rop2 !== 13 || !e.curPen || e.curPen.stroke == null || t.length < 2) return;
	let { ctx: r } = e;
	r.strokeStyle = e.curPen.stroke, r.lineWidth = fn(e, e.curPen.width), r.beginPath(), r.moveTo(t[0][0], t[0][1]);
	for (let e = 1; e < t.length; e++) r.lineTo(t[e][0], t[e][1]);
	n && r.closePath(), r.stroke(), e.drew = !0;
}
function mn(e, t) {
	if (!e.mapping) return t;
	let [n, r, i, a] = e.mapping, o = t[0] * n + i, s = t[2] * n + i, c = t[1] * r + a, l = t[3] * r + a;
	return [
		Math.min(o, s),
		Math.min(c, l),
		Math.max(o, s),
		Math.max(c, l)
	];
}
function hn(e, t, n) {
	if (!e) return null;
	let [r, i, a, o] = e.bounds, s = Math.max(r, t[0]), c = Math.max(i, t[1]), l = Math.min(a, t[2]), u = Math.min(o, t[3]);
	if (s >= l || c >= u) return n ? e : null;
	if (s === r && c === i && l === a && u === o) return n ? null : e;
	if (e.children) {
		let [r, i] = e.children, a = hn(r, t, n), o = hn(i, t, n);
		return a === r && o === i ? e : sn(a, o);
	}
	if (!n) return {
		bounds: [
			s,
			c,
			l,
			u
		],
		height: 1
	};
	let d = [];
	return i < c && d.push([
		r,
		i,
		a,
		c
	]), r < s && d.push([
		r,
		c,
		s,
		u
	]), l < a && d.push([
		l,
		c,
		a,
		u
	]), u < o && d.push([
		r,
		u,
		a,
		o
	]), cn(d);
}
function gn(e, t, n) {
	let { dx: r, dy: i, mapping: a } = e.clip, o = [
		t[0] - r,
		t[1] - i,
		t[2] - r,
		t[3] - i
	];
	if (a) {
		let [e, t, n, r] = a, i = (o[0] - n) / e, s = (o[2] - n) / e, c = (o[1] - r) / t, l = (o[3] - r) / t;
		o = [
			Math.min(i, s),
			Math.min(c, l),
			Math.max(i, s),
			Math.max(c, l)
		];
	}
	e.clip = {
		...e.clip,
		tree: hn(e.clip.tree, o, n)
	}, e.clipDirty = !0;
}
function _n(e) {
	if (!e.clipDirty) return;
	e.ctx.restore(), e.ctx.save(), e.ctx.beginPath();
	let t = e.clip.tree ? [e.clip.tree] : [];
	for (; t.length;) {
		let n = t.pop(), r = mn(e.clip, n.bounds), i = Math.max(0, r[0] + e.clip.dx), a = Math.max(0, r[1] + e.clip.dy), o = Math.min(e.W, r[2] + e.clip.dx), s = Math.min(e.H, r[3] + e.clip.dy);
		i >= o || a >= s || (n.children ? t.push(...n.children) : e.ctx.rect(i, a, o - i, s - a));
	}
	e.ctx.clip(), e.clipDirty = !1;
}
function vn(e, t, n, r, i) {
	let a = Q(e, t), o = Q(e, r), s = $(e, n), c = $(e, i);
	return [
		Math.min(a, o),
		Math.min(s, c),
		Math.max(a, o),
		Math.max(s, c)
	];
}
function yn(e) {
	let t = {
		kind: "region",
		tree: null,
		valid: !1
	}, n = [];
	if (e.remaining < 22) return t;
	e.u16();
	let r = e.i16();
	e.u32(), e.i16();
	let i = e.i16();
	if (e.i16(), e.skip(8), r !== 6 || i < 0) return t;
	for (let r = 0; r < i; r++) {
		if (e.remaining < 8) return t;
		let r = e.u16(), i = e.u16(), a = e.u16();
		if (r % 2 != 0 || e.remaining < r * 2 + 2) return t;
		for (let t = 0; t < r; t += 2) {
			let t = e.u16(), r = e.u16();
			t < r && i < a && n.push([
				t,
				i,
				r,
				a
			]);
		}
		if (e.u16() !== r) return t;
	}
	return t.valid = e.remaining === 0, t.valid && (t.tree = cn(n)), t;
}
function bn(e, t, n) {
	let r = [];
	for (let i = 0; i < n && !(t.remaining < 4); i++) {
		let n = t.i16(), i = t.i16();
		r.push([Q(e, n), $(e, i)]);
	}
	return r;
}
function xn(e, t) {
	t.length < 2 || !e.curPen || e.curPen.stroke == null || pn(e, t, !1);
}
function Sn(e, t, n) {
	let r = e.currentX, i = e.currentY, a = e.currentPositionKnown;
	if (e.currentX = t, e.currentY = n, e.currentPositionKnown = !0, e.rop2 !== 13 || !a || !e.lineStateSafe || !e.haveExt || !e.extTextMappingSafe || ![
		e.extX,
		e.extY,
		e.W,
		e.H
	].every(Number.isFinite) || !(e.W > 0 && e.H > 0) || !e.curPen || !e.curPen.lineEligible || e.curPen.stroke == null) return;
	let { ctx: o } = e;
	o.save(), o.beginPath(), o.moveTo(Q(e, r), $(e, i)), o.lineTo(Q(e, t), $(e, n)), o.strokeStyle = e.curPen.stroke, o.lineWidth = e.curPen.lineWidth === 0 ? 1 : Math.abs(e.curPen.lineWidth * (e.vpW / e.extX)), o.lineCap = "round", o.lineJoin = "round", o.setLineDash([]), o.stroke(), o.restore(), e.drew = !0;
}
function Cn(e, t) {
	if (e.rop2 !== 13 || t.length < 2) return;
	let { ctx: n } = e;
	if (e.curBrush && e.curBrush.fill != null) {
		n.beginPath(), n.moveTo(t[0][0], t[0][1]);
		for (let e = 1; e < t.length; e++) n.lineTo(t[e][0], t[e][1]);
		n.closePath(), n.fillStyle = e.curBrush.fill, n.fill(e.fillRule), e.drew = !0;
	}
	pn(e, t, !0);
}
function wn(e, t) {
	if (e.rop2 !== 13) return;
	let n = t.u16();
	if (n === 0) return;
	let r = [];
	for (let e = 0; e < n; e++) {
		if (t.remaining < 2) return;
		r.push(t.u16());
	}
	let { ctx: i } = e;
	i.beginPath();
	let a = !1;
	for (let n of r) {
		if (n < 2) {
			for (let e = 0; e < n && t.remaining >= 4; e++) t.i16(), t.i16();
			continue;
		}
		let r = bn(e, t, n);
		if (!(r.length < 2)) {
			i.moveTo(r[0][0], r[0][1]);
			for (let e = 1; e < r.length; e++) i.lineTo(r[e][0], r[e][1]);
			i.closePath(), a = !0;
		}
	}
	a && (e.curBrush && e.curBrush.fill != null && (i.fillStyle = e.curBrush.fill, i.fill(e.fillRule), e.drew = !0), e.curPen && e.curPen.stroke != null && (i.strokeStyle = e.curPen.stroke, i.lineWidth = fn(e, e.curPen.width), i.stroke(), e.drew = !0));
}
function Tn(e) {
	let t = e.remaining === 10, n = e.u16(), r = e.i16();
	e.i16();
	let i = e.u32();
	return {
		kind: "pen",
		stroke: (n & 255) == 5 ? null : Y(i),
		width: Math.abs(r),
		lineWidth: r,
		lineEligible: t && r >= 0 && (n === 0 || n === 5)
	};
}
function En(e) {
	let t = e.u16(), n = e.u32();
	return e.u16(), {
		kind: "brush",
		fill: t === 1 ? null : Y(n)
	};
}
function Dn(e, t, n) {
	if (!e.extTextSafe) {
		e.unsupported.add(`${t} (text state undefined after an unsupported record)`), e.textAlign & 1 && (e.currentPositionKnown = !1);
		return;
	}
	try {
		let r = Jt(e, n);
		"problem" in r ? (e.unsupported.add(`${t} (${r.problem})`), e.textAlign & 1 && (e.currentPositionKnown = !1)) : r.drew && (e.drew = !0);
	} catch {
		e.unsupported.add(`${t} (text output failed)`), e.textAlign & 1 && (e.currentPositionKnown = !1);
	}
}
function On(e, t) {
	let n = "META_EXTTEXTOUT";
	if (t.remaining < 8) {
		e.unsupported.add(`${n} (malformed)`);
		return;
	}
	let r = t.i16(), i = t.i16(), a = t.i16(), o = t.u16(), s = (o & 6) != 0;
	if (a < 0 || t.remaining < (s ? 8 : 0) + a) {
		e.unsupported.add(`${n} (malformed)`);
		return;
	}
	let c = null;
	s && (c = [
		t.i16(),
		t.i16(),
		t.i16(),
		t.i16()
	]);
	let l = t.bytes(a);
	a & 1 && t.skip(1);
	let u = a * (o & 8192 ? 2 : 1), d = null;
	if (t.remaining > 0 && a > 0) {
		if (t.remaining < u * 2) {
			e.unsupported.add(`${n} (malformed Dx array)`);
			return;
		}
		d = new Int16Array(u);
		for (let e = 0; e < u; e++) d[e] = t.i16();
	}
	Dn(e, n, {
		x: i,
		y: r,
		bytes: l,
		options: o,
		rect: c,
		dx: d
	});
}
var kn = new Set([
	53,
	55,
	261,
	263,
	298,
	299,
	313,
	552,
	561,
	564,
	1048,
	1049,
	1055,
	1065,
	1078,
	1352,
	1564,
	1565,
	2071,
	2074,
	2096,
	2338,
	2851,
	3379
]);
function An(e, t, n, r, i, a) {
	if (!nn(e)) return !1;
	let o = 0;
	(e.length >= 4 ? (e[0] | e[1] << 8 | e[2] << 16 | e[3] << 24) >>> 0 : 0) === Zt && (o = Qt);
	let s = o + $t;
	if (s > e.length) return !1;
	let c = {
		ctx: t,
		W: n,
		H: r,
		orgX: 0,
		orgY: 0,
		extX: n || 1,
		extY: r || 1,
		haveExt: !1,
		vpX: 0,
		vpY: 0,
		vpW: n,
		vpH: r,
		clip: on,
		clipDirty: !1,
		mapMode: 8,
		objects: [],
		curPen: null,
		curBrush: null,
		curFont: null,
		...a ? { fontFamilies: a } : {},
		textColor: "#000000",
		bkColor: "#ffffff",
		textAlign: 0,
		charExtra: 0,
		breakCount: 0,
		breakQuotientPx: 0,
		breakErrorPx: 0,
		fillRule: "nonzero",
		rop2: 13,
		bkMode: 2,
		unsupported: /* @__PURE__ */ new Set(),
		extTextSafe: !0,
		extTextMappingSafe: !1,
		currentX: 0,
		currentY: 0,
		currentPositionKnown: !1,
		lineStateSafe: !0,
		drew: !1
	};
	t.save();
	try {
		jn(e, c, s);
	} finally {
		t.restore();
	}
	return c.unsupported.size > 0 && i?.([...c.unsupported]), c.drew;
}
function jn(e, t, n) {
	let r = [], i = new DataView(e.buffer, e.byteOffset, e.byteLength);
	for (; n + 6 <= e.length;) {
		let a = i.getUint32(n, !0), o = i.getUint16(n + 4, !0);
		if (a < 3) break;
		let s = a * 2, c = n + s;
		if (c > e.length || o === J.EOF) break;
		let l = n + 6, u = new ln(e, l, c);
		switch ((o === J.LINETO || o === J.POLYLINE || o === J.POLYGON || o === J.POLYPOLYGON || o === J.RECTANGLE || o === J.TEXTOUT || o === J.EXTTEXTOUT || o === J.STRETCHDIBITS) && _n(t), o) {
			case J.SETMAPMODE: {
				if (u.remaining !== 2) {
					t.unsupported.add("META_SETMAPMODE malformed");
					break;
				}
				let e = u.u16();
				if (e < 1 || e > 8) {
					t.unsupported.add("META_SETMAPMODE invalid mode");
					break;
				}
				un(t, e);
				break;
			}
			case J.SAVEDC: {
				if (u.remaining !== 0) {
					t.unsupported.add("META_SAVEDC malformed");
					break;
				}
				let { objects: e, unsupported: n, drew: i, ctx: a, clipDirty: o, ...s } = t;
				r.push(s);
				break;
			}
			case J.RESTOREDC: {
				if (u.remaining !== 2) {
					t.unsupported.add("META_RESTOREDC malformed");
					break;
				}
				let e = u.i16(), n = e < 0 ? r.length + e : e - 1;
				if (e === 0 || n < 0 || n >= r.length) {
					t.unsupported.add("META_RESTOREDC invalid level");
					break;
				}
				Object.assign(t, r[n]), r.length = n, t.clipDirty = !0;
				break;
			}
			case J.CREATEREGION: {
				let e = yn(u);
				Z(t.objects, e), e.valid || t.unsupported.add("META_CREATEREGION malformed");
				break;
			}
			case J.SELECTCLIPREGION: {
				let e = u.remaining === 2 ? t.objects[u.u16()] : void 0;
				if (e?.kind !== "region" || !e.valid) {
					t.unsupported.add("META_SELECTCLIPREGION invalid region");
					break;
				}
				t.clip = {
					tree: e.tree,
					mapping: [
						t.vpW / t.extX,
						t.vpH / t.extY,
						Q(t, 0),
						$(t, 0)
					],
					dx: 0,
					dy: 0
				}, t.clipDirty = !0;
				break;
			}
			case J.INTERSECTCLIPRECT:
			case J.EXCLUDECLIPRECT: {
				if (u.remaining !== 8) {
					t.unsupported.add("WMF clip rectangle malformed");
					break;
				}
				let e = u.i16(), n = u.i16(), r = u.i16();
				gn(t, vn(t, u.i16(), r, n, e), o === J.EXCLUDECLIPRECT);
				break;
			}
			case J.OFFSETCLIPRGN: {
				if (u.remaining !== 4) {
					t.unsupported.add("META_OFFSETCLIPRGN malformed");
					break;
				}
				let e = u.i16(), n = u.i16();
				t.clip !== on && (t.clip = {
					...t.clip,
					dx: t.clip.dx + n * t.vpW / t.extX,
					dy: t.clip.dy + e * t.vpH / t.extY
				}, t.clipDirty = !0);
				break;
			}
			case J.SETVIEWPORTORG:
			case J.OFFSETVIEWPORTORG:
			case J.OFFSETWINDOWORG:
			case J.SETVIEWPORTEXT: {
				if (u.remaining !== 4) {
					t.unsupported.add("WMF viewport mapping malformed");
					break;
				}
				let e = u.i16(), n = u.i16();
				o === J.SETVIEWPORTORG ? (t.vpX = n, t.vpY = e) : o === J.OFFSETVIEWPORTORG ? (t.vpX += n, t.vpY += e) : o === J.OFFSETWINDOWORG ? (t.orgX += n, t.orgY += e) : t.mapMode >= 7 && n !== 0 && e !== 0 && (t.vpW = n, t.vpH = e, dn(t));
				break;
			}
			case J.SCALEWINDOWEXT:
			case J.SCALEVIEWPORTEXT: {
				if (u.remaining !== 8) {
					t.unsupported.add("WMF mapping scale malformed");
					break;
				}
				let e = u.i16(), n = u.i16(), r = u.i16(), i = u.i16();
				if (t.mapMode <= 6) break;
				if (r === 0 || e === 0 || i === 0 || n === 0) {
					t.unsupported.add("WMF mapping scale invalid");
					break;
				}
				o === J.SCALEWINDOWEXT ? (t.extX *= i / r, t.extY *= n / e) : (t.vpW *= i / r, t.vpH *= n / e), dn(t);
				break;
			}
			case J.SETWINDOWORG:
				if (u.remaining !== 4) {
					t.extTextSafe = !1, t.currentPositionKnown = !1, t.lineStateSafe = !1;
					break;
				}
				t.orgY = u.i16(), t.orgX = u.i16();
				break;
			case J.SETWINDOWEXT: {
				if (u.remaining !== 4) {
					t.extTextSafe = !1, t.currentPositionKnown = !1, t.lineStateSafe = !1;
					break;
				}
				let e = u.i16(), n = u.i16();
				if (t.mapMode <= 6) break;
				t.extTextMappingSafe = n > 0 && e > 0, t.extY = e || 1, t.extX = n || 1, t.haveExt = !0, dn(t);
				break;
			}
			case J.SETROP2:
				if (u.remaining !== 2 && u.remaining !== 4) {
					t.rop2 = 0, t.unsupported.add("META_SETROP2 malformed");
					break;
				}
				t.rop2 = u.u16(), u.remaining === 2 && u.u16(), t.rop2 !== 11 && t.rop2 !== 13 && t.unsupported.add("META_SETROP2 (unsupported binary mix)");
				break;
			case J.SETPOLYFILLMODE:
				t.fillRule = u.u16() === 1 ? "evenodd" : "nonzero";
				break;
			case J.SETTEXTCOLOR:
				if (u.remaining !== 4) {
					t.extTextSafe = !1;
					break;
				}
				t.textColor = Y(u.u32());
				break;
			case J.SETTEXTALIGN:
				if (u.remaining !== 2 && u.remaining !== 4) {
					t.extTextSafe = !1, t.lineStateSafe = !1;
					break;
				}
				t.textAlign = u.u16(), u.remaining === 2 && u.u16();
				break;
			case J.SETBKMODE:
				if (u.remaining !== 2 && u.remaining !== 4) {
					t.extTextSafe = !1;
					break;
				}
				t.bkMode = u.u16(), u.remaining === 2 && u.u16();
				break;
			case J.SETBKCOLOR:
				if (u.remaining !== 4) {
					t.extTextSafe = !1;
					break;
				}
				t.bkColor = Y(u.u32());
				break;
			case J.SETTEXTCHAREXTRA:
				if (u.remaining !== 2) {
					t.extTextSafe = !1;
					break;
				}
				t.charExtra = u.u16();
				break;
			case J.SETTEXTJUSTIFICATION: {
				if (u.remaining !== 4) {
					t.extTextSafe = !1;
					break;
				}
				t.breakCount = u.u16();
				let e = Math.round(u.u16() * Math.abs(t.vpW / t.extX));
				t.breakQuotientPx = t.breakCount > 0 && Number.isFinite(e) ? Math.trunc(e / t.breakCount) : 0, t.breakErrorPx = t.breakCount > 0 && Number.isFinite(e) ? e - t.breakQuotientPx * t.breakCount : 0;
				break;
			}
			case J.CREATEPALETTE:
			case J.CREATEPATTERNBRUSH:
			case J.DIBCREATEPATTERNBRUSH:
				Z(t.objects, { kind: "other" });
				break;
			case J.CREATEPENINDIRECT:
				u.remaining !== 10 && (t.lineStateSafe = !1), Z(t.objects, Tn(u));
				break;
			case J.CREATEBRUSHINDIRECT:
				u.remaining !== 8 && (t.lineStateSafe = !1), Z(t.objects, En(u));
				break;
			case J.CREATEFONTINDIRECT: {
				let e = Ft(u.bytes(u.remaining));
				e.valid || (t.lineStateSafe = !1), Z(t.objects, e);
				break;
			}
			case J.SELECTOBJECT: {
				if (u.remaining !== 2) {
					t.extTextSafe = !1, t.lineStateSafe = !1;
					break;
				}
				let e = u.u16(), n = t.objects[e];
				n?.kind === "pen" ? t.curPen = n : n?.kind === "brush" ? t.curBrush = n : n?.kind === "font" ? t.curFont = n : (n?.kind === "other" || (t.extTextSafe = !1), t.lineStateSafe = !1);
				break;
			}
			case J.DELETEOBJECT: {
				if (u.remaining !== 2) {
					t.extTextSafe = !1, t.lineStateSafe = !1;
					break;
				}
				let e = u.u16(), n = t.objects[e];
				n && (n === t.curPen && (t.curPen = null), n === t.curBrush && (t.curBrush = null), n === t.curFont && (t.curFont = null), t.objects[e] = null);
				break;
			}
			case J.POLYLINE:
				xn(t, bn(t, u, u.i16()));
				break;
			case J.POLYGON:
				Cn(t, bn(t, u, u.i16()));
				break;
			case J.POLYPOLYGON:
				wn(t, u);
				break;
			case J.RECTANGLE: {
				let e = u.i16(), n = u.i16(), r = u.i16(), i = u.i16();
				Cn(t, [
					[Q(t, i), $(t, r)],
					[Q(t, n), $(t, r)],
					[Q(t, n), $(t, e)],
					[Q(t, i), $(t, e)]
				]);
				break;
			}
			case J.MOVETO:
				if (u.remaining !== 4) {
					t.extTextSafe = !1, t.currentPositionKnown = !1;
					break;
				}
				t.currentY = u.i16(), t.currentX = u.i16(), t.currentPositionKnown = !0;
				break;
			case J.LINETO: {
				if (u.remaining !== 4) {
					t.extTextSafe = !1, t.currentPositionKnown = !1;
					break;
				}
				let e = u.i16();
				Sn(t, u.i16(), e);
				break;
			}
			case J.TEXTOUT: {
				if (u.remaining < 2) {
					t.unsupported.add("META_TEXTOUT (malformed)");
					break;
				}
				let e = u.u16();
				if (u.remaining < e + (e & 1) + 4) {
					t.unsupported.add("META_TEXTOUT (malformed)");
					break;
				}
				let n = u.bytes(e);
				e % 2 != 0 && u.skip(1);
				let r = u.i16();
				Dn(t, "META_TEXTOUT", {
					x: u.i16(),
					y: r,
					bytes: n,
					options: 0,
					rect: null,
					dx: null
				});
				break;
			}
			case J.EXTTEXTOUT:
				On(t, u);
				break;
			case J.ESCAPE: {
				let e = u.remaining >= 4 ? u.u16() : -1, n = u.remaining >= 2 ? u.u16() : -1;
				if (e !== 15 || n < 0 || u.remaining !== n + (n & 1)) {
					t.extTextSafe = !1, t.currentPositionKnown = !1, t.lineStateSafe = !1;
					break;
				}
				let r = u.bytes(n);
				n & 1 && u.skip(1), r.length >= 4 && new DataView(r.buffer, r.byteOffset, r.byteLength).getUint32(0, !0) === 1128680791 && (t.extTextSafe = !1, t.currentPositionKnown = !1, t.lineStateSafe = !1);
				break;
			}
			case J.STRETCHDIBITS: {
				u.u32(), u.i16(), u.i16(), u.i16(), u.i16(), u.u16();
				let e = u.i16(), n = u.i16(), r = u.i16(), a = u.i16(), o = l + 22, s = ce(i, o, c - o);
				if (s) {
					let i = Q(t, a), o = $(t, r), c = Q(t, a + n), l = $(t, r + e);
					O(t.ctx, s, i, o, c, l) && (t.drew = !0);
				}
				break;
			}
			case J.DIBSTRETCHBLT:
			case J.DIBBITBLT: break;
			default:
				if (kn.has(o)) break;
				t.extTextSafe = !1, t.currentPositionKnown = !1, t.lineStateSafe = !1;
				break;
		}
		n = c;
	}
}
var Mn = 2e3, Nn = 2;
function Pn(e, t) {
	let n = e > 0 ? e : 300, r = t > 0 ? t : 300, i = (e) => Math.max(1, Math.min(Mn, Math.round(e)));
	return {
		w: i(n * Nn),
		h: i(r * Nn)
	};
}
async function Fn(e, t, n, r, i) {
	if (!nn(e) || t <= 0 || n <= 0) return null;
	let a = T(t, n);
	if (!a) return null;
	let o = a.getContext("2d");
	return !o || (o.lineJoin = "round", o.lineCap = "round", !An(e, o, t, n, r, i)) ? null : createImageBitmap(a);
}
export { O as A, _ as B, Pe as C, L as D, I as E, ie as F, ee as H, S as I, x as L, T as M, oe as N, N as O, w as P, C as R, Le as S, Ae as T, h as V, W as _, Fn as a, Ue as b, Ft as c, ct as d, Ke as f, Je as g, $e as h, nn as i, se as j, fe as k, nt as l, Xe as m, rn as n, Pn as o, Qe as p, an as r, Pt as s, Y as t, rt as u, U as v, Fe as w, Re as x, He as y, te as z };
