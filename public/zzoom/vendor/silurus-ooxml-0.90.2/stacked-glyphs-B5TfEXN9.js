import { a as e, c as t, m as n, p as r } from "./substitute-script-COw3MRyd.js";
import { d as i } from "./scripts-DxEAUeVI.js";
import { l as a, o, s, u as c } from "./segment-line-BR56kM-V.js";
import { a as l, o as u } from "./vertical-vert-feature-ru96Mg5B.js";
function d(e, t, n, r, i, a = 0) {
	let o = e.map((e) => e.width), s = (t) => {
		let n = 0;
		for (let r = t; r < e.length && !e[r].isTab; r++) n += o[r];
		return n;
	}, c = n;
	for (let n = 0; n < e.length; n++) {
		if (!e[n].isTab) {
			c += o[n];
			continue;
		}
		let l = null;
		for (let e of t) e.pos > c && (l === null || e.pos < l.pos) && (l = e);
		if (l === null) if (a > 0) l = {
			pos: (Math.floor(c / a) + 1) * a,
			algn: "l"
		};
		else {
			o[n] = i, c += i;
			continue;
		}
		let u = s(n + 1), d = l.algn === "ctr" ? .5 : +(l.algn === "r" || l.algn === "dec"), f = l.pos - u * d;
		f + u > r && (f = r - u), f < c && (f = c), o[n] = f - c, c = f;
	}
	return o;
}
var f = /^\p{Script_Extensions=Latin}$/u, p = (e) => e.type === "text" && e.text === " ", m = (e) => e.type === "text" && n(e.text.codePointAt(0) ?? 0);
function h(n, i) {
	let l = i.sameStyle ?? ((e, t) => e === t), u = [[]], h = [], g = [-1], _ = [], v = 0;
	for (let e of n) {
		if (h.push(u.length - 1), e.type === "break") {
			_[u.length - 1] = v, u.push([]), g.push(-1), v++;
			continue;
		}
		if (e.type === "object") {
			e.display && u.at(-1).length > 0 && (u.push([]), g.push(-1)), u.at(-1).push({
				type: "object",
				style: e.style,
				run: v,
				width: e.width,
				payload: e.payload
			}), e.display && (u.push([]), g.push(-1)), v++;
			continue;
		}
		let n = [
			0,
			...t(e.text),
			e.text.length
		];
		for (let t = 0; t + 1 < n.length; t++) {
			let r = e.text.slice(n[t], n[t + 1]);
			r === "\n" ? (u.push([]), g.push(v)) : r === "	" ? u.at(-1).push({
				type: "tab",
				style: e.style,
				run: v
			}) : r !== "\r" && u.at(-1).push({
				type: "text",
				text: r,
				style: e.style,
				run: v
			});
		}
		v++;
	}
	let y = [], b = [], x = [], S = new Uint8Array(n.length);
	for (let t = 0; t < u.length; t++) {
		let n = u[t];
		if (b.push(y.length), t === u.length - 1) for (; n.length > 0 && p(n.at(-1));) n.pop();
		let h = n.length, v = /* @__PURE__ */ new Set();
		if (n.some((t) => t.type === "text" && e(t.text))) {
			let e = "", t = [0];
			for (let r of n) e += r.type === "text" ? r.text : "￼", t.push(e.length);
			let i = new Set(r(e, { cjk: !0 }));
			for (let e = 1; e < t.length; e++) i.has(t[e]) && v.add(e);
		}
		let C = i.eastAsianLineBreak !== !1, w = (e) => e === 160 || e === 8239 || e === 8288 || e === 65279, T = (e) => {
			if (e <= 0 || e >= h) return !1;
			let t = n[e - 1], r = n[e];
			if (r.type === "tab") return !0;
			if (t.type === "tab") return !1;
			if (p(t) || p(r) || v.has(e) || t.type === "object" || r.type === "object") return !0;
			let i = [...t.text].at(-1)?.codePointAt(0), a = r.text.codePointAt(0);
			if (i === void 0 || a === void 0) return !1;
			if (i === 8203 || !C && (m(t) || m(r)) && !w(i) && !w(a)) return !0;
			if (o(i, a)) return !1;
			if (m(t) || m(r)) return !0;
			if (e > 1 && (s(i) === "HY" || s(i) === "HH")) {
				let t = n[e - 2];
				if (t.type === "text" && f.test([...t.text].at(-1) ?? "") && f.test([...r.text][0] ?? "")) return !0;
			}
			return !1;
		}, E = new Uint8Array(h + 1);
		for (let e = 1; e < h; e++) E[e] = +!!T(e);
		let D = n[0]?.style, O = h > 0 && n.every((e) => e.type === "text" && l(D, e.style)) ? n.map((e) => e.type === "text" ? e.text : "").join("") : null, k = O === null ? null : new Int32Array(h + 1);
		if (k) for (let e = 0; e < h; e++) {
			let t = n[e];
			k[e + 1] = k[e] + (t.type === "text" ? t.text.length : 0);
		}
		let A = null, j = 0, M = (e) => {
			let t = n[e], r = n[e + 1];
			if (t?.type !== "tab" || !i.tabStops?.length || r?.type !== "text" || !/^[\p{Script_Extensions=Latin}\p{Number}]$/u.test(r.text)) return !1;
			if (A === null) {
				j = $, A = new Uint8Array(h - j + 1), A[h - j] = 1;
				for (let e = h - 1; e >= j; e--) {
					let t = n[e], r = e - j;
					A[r] = A[r + 1] && t.type === "text" && !p(t) && !m(t) ? 1 : 0;
				}
			}
			return A[e + 1 - j] === 1;
		}, N = null, P = 0, F = () => {
			if (N === null) {
				P = $;
				let e = [], t = new Int32Array(h - P + 1);
				for (let r = P; r < h; r++) {
					let i = n[r];
					if (i.type === "text") for (let t of i.text) e.push(t);
					t[r + 1 - P] = e.length;
				}
				N = {
					chars: e,
					offsets: t
				};
			}
			return N;
		}, I = (e, t) => e.type === "text" && t.type === "text" && i.kinsokuAcrossRuns?.(e.style, t.style, e.text, t.text) === !0, L = null, R = 0, z = (e) => {
			if (L === null) {
				R = $, L = new Int32Array(h - $ + 1);
				let e = $ + 1;
				for (let t = $ + 1; t < h; t++) {
					let r = n[t - 1], i = n[t];
					(r.type !== "text" || i.type !== "text" || r.run !== i.run && !I(r, i)) && (e = t), L[t - R] = e;
				}
			}
			return Math.max($ + 1, L[e - R]);
		}, B = (e, t) => {
			if (t.type === "text") {
				let n = e.at(-1);
				if (n?.type === "text" && l(n.style, t.style)) {
					n.text += t.text;
					return;
				}
				e.push({
					type: "text",
					text: t.text,
					style: t.style,
					width: 0
				});
			} else t.type === "tab" ? e.push({
				type: "tab",
				style: t.style,
				width: 0
			}) : e.push({
				type: "object",
				style: t.style,
				width: t.width,
				payload: t.payload
			});
		}, V = (e, t) => {
			let n = 0, r = e.map((t, r) => {
				if (t.type === "text") {
					t.width = i.measureText(t.text, t.style);
					let n = e[r - 1];
					n?.type === "text" && (t.width += i.boundaryAdvance?.(n.style, t.style) ?? 0);
				}
				return t.type === "tab" && (t.width = 0, n = i.measureText(" ", t.style)), {
					isTab: t.type === "tab",
					width: t.width
				};
			});
			if (r.some((e) => e.isTab)) {
				let a = d(r, i.tabStops ?? [], i.tabStartPen?.(t) ?? (t === 0 ? i.firstLineIndent ?? 0 : 0), Infinity, n, i.defaultTabSize ?? 0);
				for (let t = 0; t < e.length; t++) e[t].width = a[t];
			}
			return e.reduce((e, t) => e + t.width, 0);
		}, H = (e, t, r) => {
			if (O !== null && k && D !== void 0) {
				let n = O.slice(k[e], k[t]), r = i.measureText(n, D);
				return {
					segments: [{
						type: "text",
						text: n,
						style: D,
						width: r
					}],
					width: r
				};
			}
			let a = [];
			for (let r = e; r < t; r++) B(a, n[r]);
			return {
				segments: a,
				width: V(a, r)
			};
		}, U = null, W = (e, t) => {
			let r = "";
			for (let i = e; i < t; i++) {
				let e = n[i];
				e.type === "text" && (r += e.text);
			}
			return r;
		}, G = (e) => {
			let t = new Float64Array(Math.ceil(e.length / 32)).fill(Infinity);
			for (let n = 0; n < e.length; n++) {
				let r = Math.floor(n / 32);
				e[n] < t[r] && (t[r] = e[n]);
			}
			return t;
		}, K = () => {
			let e = new Int32Array(h).fill(-1), t = new Int32Array(h).fill(-1), r = new Float64Array(h).fill(NaN), a = new Float64Array(h), o = new Float64Array(h + 1), s = new Float64Array(h + 1), c = new Int32Array(h + 1), u = -1, d, f = null, p = 0, m = 0, g = (e) => {
				for (let n = u; u >= 0 && n < e; n++) t[n] = e;
			};
			for (let t = 0; t < h; t++) {
				let h = n[t];
				if (c[t + 1] = c[t] + +(h.type === "tab"), h.type === "text" && u >= 0 && l(d, h.style) || (g(t), p = s[t], h.type === "text" ? (f = u >= 0 ? i.boundaryAdvance?.(d, h.style) ?? 0 : null, u = t, d = h.style) : (u = -1, d = void 0)), h.type === "text") {
					let n = d;
					if (e[t] = u, t - u <= 8) m = i.measureText(W(u, t + 1), n), r[t] = m;
					else {
						let e = W(t - 8, t);
						a[t] = i.measureText(e + h.text, n) - i.measureText(e, n), m += a[t];
					}
					s[t + 1] = p + (f === null ? m : m + f);
				} else s[t + 1] = p + (h.type === "object" ? h.width : 0);
				o[t + 1] = o[t] + a[t];
			}
			g(h);
			let _ = new Float64Array(h + 1);
			_[h] = s[h];
			for (let e = h - 1; e >= 0; e--) _[e] = Math.min(s[e], _[e + 1]);
			let v = new Float64Array(h + 1).fill(Infinity);
			for (let e = h; e >= 1; e--) n[e - 1].type === "text" && (v[e] = e === t[e - 1] ? o[e] : Math.min(o[e], v[e + 1]));
			let y = new Int32Array(h), b = [];
			for (let e = 0; e < h; e++) {
				let t = n[e];
				if (t.type !== "tab" || (i.defaultTabSize ?? 0) > 0) continue;
				let r = i.measureText(" ", t.style), a = b.indexOf(r);
				a < 0 && (a = b.push(r) - 1), y[e] = a;
			}
			return b.length === 0 && b.push(0), {
				segStart: e,
				segEnd: t,
				head: r,
				tail: a,
				tailSum: o,
				tailBlockMin: G(o),
				natural: s,
				naturalBlockMin: G(s),
				naturalSuffixMin: _,
				tailSuffixMin: v,
				tabsBefore: c,
				tabGap: y,
				gapValues: b
			};
		}, q = (e, t, n, r, i, a) => {
			let o = i;
			for (; o > r;) {
				let i = Math.floor(o / 32) * 32;
				if (i > r && n + t[i / 32] > a) {
					o = i - 1;
					continue;
				}
				if (n + e[o] <= a) return o;
				o--;
			}
			return -1;
		}, J = /* @__PURE__ */ new Map(), Y = (e, t, r) => {
			if (t === e.segStart[t]) {
				let n = Math.min(r, t + 8 + 1) - 1;
				return e.head[n] + (e.tailSum[r] - e.tailSum[n + 1]);
			}
			let a = Math.min(r, t + 8 + 1), o = J.get(a);
			return o === void 0 && (o = i.measureText(W(t, a), n[t].style), J.set(a, o)), o + (e.tailSum[r] - e.tailSum[a]);
		}, ee = (e, t, r) => {
			let a = U ??= K();
			if (J.clear(), a.tabsBefore[h] !== a.tabsBefore[e]) return te(a, e, t, r);
			let o = n[e], s = o.type === "text" ? a.segEnd[e] : e + 1, c = o.type === "text" ? Y(a, e, s) : o.type === "object" ? o.width : 0;
			if (s < h) {
				let t = n[s], l = o.type === "text" && t.type === "text" && i.boundaryAdvance ? i.boundaryAdvance(o.style, t.style) - i.boundaryAdvance(n[a.segStart[e]].style, t.style) : 0, u = q(a.natural, a.naturalBlockMin, c + l - a.natural[s], s, h, r);
				if (u >= 0) return u;
			}
			if (c <= r) return s;
			if (o.type !== "text") return e;
			let l = e + 8 + 1;
			if (s - 1 > l) {
				let t = Y(a, e, l) - a.tailSum[l], n = q(a.tailSum, a.tailBlockMin, t, l, s - 1, r);
				if (n >= 0) return n;
			}
			for (let t = Math.min(s - 1, l); t > e; t--) if (Y(a, e, t) <= r) return t;
			return e;
		}, te = (e, t, r, a) => {
			let o = i.tabStartPen?.(r) ?? (r === 0 ? i.firstLineIndent ?? 0 : 0), s = i.tabStops ?? [], c = i.defaultTabSize ?? 0, l = e.gapValues, u = l.length, d = new Float64Array(u), f = new Float64Array(u).fill(o), p = new Float64Array(u), m = new Float64Array(u), g = new Float64Array(u), _ = new Uint8Array(u), v = new Float64Array(u), y = !1, b = 0, x = 0, S = !1, C = n[t], w = C.type === "text" ? e.segEnd[t] : t + 1, T = C.type === "text" ? Y(e, t, w) : C.type === "object" ? C.width : 0, E = n[w], D = T + (w < h && C.type === "text" && E.type === "text" && i.boundaryAdvance ? i.boundaryAdvance(C.style, E.style) - i.boundaryAdvance(n[e.segStart[t]].style, E.style) : 0) - e.natural[w], O = t + 8 + 1, k = C.type === "text" && w > O ? Y(e, t, O) - e.tailSum[O] : 0, A = l.every((e) => e >= 0), j = 1e-9 * Math.max(1, Math.abs(a)), M = (t) => {
				if (!A || t < O && t < w) return !1;
				let n = Infinity;
				return t < w && (n = k + e.tailSuffixMin[t + 1]), w < h && (n = Math.min(n, D + e.naturalSuffixMin[Math.max(t + 1, w + 1)])), n > a + j;
			}, N = t, P = -1, F = null;
			for (let r = t + 1; r <= h; r++) {
				let o = r - 1, C = n[o];
				if (C.type === "text" && P >= 0 && e.segStart[o] === e.segStart[o - 1]) {
					let n = X(e, P, t, r);
					x = F === null ? n : n + F;
				} else {
					if (S) for (let e = 0; e < u; e++) y ? v[e] += x : (d[e] += x, f[e] += x);
					if (C.type === "tab") {
						for (let e = 0; e < u; e++) {
							if (y) {
								let t = v[e], n = p[e] + l[e];
								_[e] || (n = m[e] - t * g[e], n < p[e] && (n = p[e])), d[e] += n - p[e] + t, f[e] = n + t;
							}
							p[e] = f[e];
							let t = null;
							for (let n of s) n.pos > f[e] && (t === null || n.pos < t.pos) && (t = n);
							t === null && c > 0 && (t = {
								pos: (Math.floor(f[e] / c) + 1) * c,
								algn: "l"
							}), _[e] = +(t === null), m[e] = t?.pos ?? 0, g[e] = t?.algn === "ctr" ? .5 : +(t?.algn === "r" || t?.algn === "dec"), v[e] = 0;
						}
						y = !0, b = e.tabGap[o], P = -1, x = 0, S = !1;
					} else if (C.type === "text") {
						let a = P >= 0 ? n[P] : void 0;
						F = a?.type === "text" ? i.boundaryAdvance?.(a.style, C.style) ?? 0 : null, P = o;
						let s = X(e, P, t, r);
						x = F === null ? s : s + F, S = !0;
					} else P = -1, x = C.width, S = !0;
				}
				let w;
				if (!y) w = d[b] + x;
				else {
					let e = v[b] + x, t = l[b];
					if (!_[b]) {
						let n = m[b] - e * g[b];
						n < p[b] && (n = p[b]), t = n - p[b];
					}
					w = d[b] + t + e;
				}
				if (w <= a) {
					if (r === h) return h;
					N = r;
				}
				if (r < h && M(r)) break;
			}
			return N;
		}, X = (e, t, n, r) => t === n ? Y(e, n, r) : Y(e, t, r), Z = new Int32Array(h).fill(-1);
		x.push(Z);
		let Q = (e, t) => {
			for (let r = e; r < t; r++) Z[r] = y.length - 1, S[n[r].run] = 1;
		}, $ = 0;
		if (h === 0) {
			y.push({
				segments: [],
				width: 0,
				...t + 1 < u.length ? { endsWithBreak: !0 } : {},
				...g[t] >= 0 ? { lineFeedRun: g[t] } : {},
				..._[t] === void 0 ? {} : { endBreakRun: _[t] }
			});
			continue;
		}
		for (; $ < h;) {
			let e = y.length, r = i.maxWidth - (e === 0 ? i.firstLineIndent ?? 0 : 0), o = (t) => O !== null && k && D !== void 0 ? i.measureText(O.slice(k[$], k[t]), D) : H($, t, e).width, s = h;
			if (Number.isFinite(r) && i.nonMonotoneMeasure) s = ee($, e, r);
			else if (Number.isFinite(r)) {
				let e = $, t = h, n = 1;
				for (; e < h;) {
					let i = Math.min(h, $ + n);
					if (o(i) <= r) {
						if (e = i, i === h) break;
						n *= 2;
					} else {
						t = i - 1;
						break;
					}
				}
				for (; e < t;) {
					let n = Math.ceil((e + t) / 2);
					o(n) <= r ? e = n : t = n - 1;
				}
				s = e;
			}
			if (s >= h) {
				let n = H($, h, e);
				t + 1 < u.length && (n.endsWithBreak = !0), y.push(n), Q($, h);
				break;
			}
			let l = 0;
			for (let e = $ + 1; e <= s; e++) E[e] && (l = e);
			if (l > $ && M(l) && (l = h), M($)) for (l = $ + 2; l < h && !p(n[l]) && n[l].type !== "tab";) l++;
			if (l === 0) if (n[$].type === "tab" && s <= $ + 1) {
				if (l = $ + 1, l < h && n[l].type === "text") for (l++; l < h && !E[l];) l++;
			} else l = Math.max($ + 1, s);
			let d = n[l - 1], f = l < h ? n[l] : void 0;
			if (C && f && (m(d) || m(f)) && (d.run === f.run || I(d, f))) {
				let { chars: e, offsets: t } = F(), n = t[$ - P], r = t[l - P];
				if (r - n > 1 && r < e.length) {
					let i = d.run !== f.run, o = i ? z(l) : $ + 1, s = a(e, r, c, i ? t[o - P] : n + 1), u = r - s;
					if (u > 0) if (i) {
						let e = o, n = l;
						for (; e < n;) {
							let r = Math.floor((e + n) / 2);
							t[r - P] < s ? e = r + 1 : n = r;
						}
						l = e;
					} else l - u > $ && (l -= u);
				}
			}
			for (y.push(H($, l, e)), Q($, l), $ = l; $ < h && p(n[$]);) $++;
		}
	}
	for (let e = 0; e < _.length; e++) {
		let t = _[e];
		if (t === void 0) continue;
		let n = b[e], r = e + 1 < b.length ? b[e + 1] : y.length;
		r > n && (y[r - 1].endBreakRun = t);
	}
	for (let e = 0; e < n.length; e++) {
		if (n[e].type !== "text" || S[e]) continue;
		let t = h[e], r = u[t], i = x[t], a = 0, o = r.length;
		for (; a < o;) {
			let t = a + o >> 1;
			r[t].run < e ? a = t + 1 : o = t;
		}
		let s = b[t];
		for (let e = a - 1; e >= 0; e--) if (i[e] >= 0) {
			s = i[e];
			break;
		}
		(y[s].hiddenRuns ??= []).push(e);
	}
	return y;
}
function g(e, t, n, r) {
	let i = n.lIns * r, a = n.rIns * r, o = n.tIns * r, s = n.bIns * r;
	return {
		left: i,
		top: o,
		width: Math.max(0, e - i - a),
		height: Math.max(0, t - o - s)
	};
}
function _(e, t, n, r = 0) {
	let i = t?.type === "pts" ? t.val * n : e * (t?.type === "pct" ? t.val / 1e5 : 1);
	return t?.type === "pts" ? i : i * (1 - r);
}
function v(e, t, n, r = 0) {
	let i = e.ascent + e.descent, a = _(i, t, n, r);
	if (a === i) return {
		ascent: e.ascent,
		descent: e.descent
	};
	let o = Math.max(0, e.descent - .25 * i), s = a < i ? Math.min(e.descent, .25 * a + o) : .25 * a <= e.descent ? e.descent : .25 * a + o;
	return {
		ascent: a - s,
		descent: s
	};
}
function y(e, t, n) {
	return e ? e.type === "pts" ? e.val * n : t * (e.val / 1e5) : 0;
}
function b(e, t, n) {
	return e === "ctr" ? t.top + (t.height - n) / 2 : e === "b" ? t.top + Math.max(0, t.height - n) : t.top;
}
function x(e, t, n, r, i = !1, a = !1) {
	let o = a ? n - r : Math.max(0, n - r);
	return e === "ctr" ? t + o / 2 : e === "r" || i && (e === "l" || e == null) ? t + o : t;
}
function S(e, t, n) {
	return e === "dist" || e === "thaiDist" ? !0 : e === "just" || e === "justLow" ? !t && !n : !1;
}
var C = (e) => e.reduce((e, t) => e + t.advance, 0);
function w(e) {
	let t = e.length;
	for (; t > 0 && e[t - 1].space;) t--;
	return t;
}
function T(e, t) {
	let { rect: n, pxPerPt: r } = t, i = t.lnSpcReduction ?? 0, a = [], o = [];
	e.forEach((s, c) => {
		let l = h(s.runs, {
			maxWidth: t.wrap ? Math.max(0, n.height - (s.marginStart ?? 0) - (s.marginEnd ?? 0)) : Infinity,
			firstLineIndent: (s.firstLineIndent ?? 0) + (s.firstLinePrefix?.advance ?? 0),
			measureText: (e, n) => C(t.glyphs(e, n)),
			sameStyle: t.sameStyle,
			eastAsianLineBreak: s.eastAsianLineBreak
		}), u = l.map((e, n) => {
			let a = e.segments.flatMap((e) => {
				if (e.type === "text") return t.glyphs(e.text, e.style);
				if (e.type === "object") {
					if (!t.objectGlyph) throw Error("Stacked inline objects require a host object adapter");
					let n = t.objectGlyph(e);
					return n.advance === 0 && n.thickness === 0 ? [] : [n];
				}
				return [];
			}), o = a.length > 0 ? 0 : s.emptyThickness;
			for (let e of a) e.thickness > o && (o = e.thickness);
			n === 0 && s.firstLinePrefix && (o = Math.max(o, s.firstLinePrefix.thickness));
			let u = v({
				ascent: o / 2,
				descent: o / 2
			}, s.lineSpacing, r, i);
			return {
				glyphs: a,
				paragraph: c,
				firstInParagraph: n === 0,
				lastInParagraph: n === l.length - 1,
				endsWithBreak: e.endsWithBreak === !0,
				thickness: o,
				ascent: u.ascent,
				descent: u.descent
			};
		});
		if (u.length === 0) {
			let e = s.emptyThickness, t = v({
				ascent: e / 2,
				descent: e / 2
			}, s.lineSpacing, r, i);
			u.push({
				glyphs: [],
				paragraph: c,
				firstInParagraph: !0,
				lastInParagraph: !0,
				endsWithBreak: !1,
				thickness: e,
				ascent: t.ascent,
				descent: t.descent
			});
		}
		let d = c === 0, f = c === e.length - 1, p = t.spcFirstLastPara === !0, m = d && !p ? 0 : y(s.spaceBefore, u[0].thickness, r), g = f && !p ? 0 : y(s.spaceAfter, u[u.length - 1].thickness, r), _ = [];
		m && _.push({
			type: "gap",
			size: m
		});
		for (let e of u) _.push({
			type: "line",
			line: e
		}), a.push(e);
		g && _.push({
			type: "gap",
			size: g
		}), o.push(_);
	});
	let s = a[a.length - 1];
	s && s.descent < s.thickness / 2 && (s.descent = s.thickness / 2);
	let c = t.direction === "wordArtVertRtl", l = [], u = 0;
	for (let e of o) {
		let t = c ? e : e.slice().reverse(), n = e.filter((e) => e.type === "line"), r = 0;
		for (let e of t) {
			if (e.type === "gap") {
				u += e.size;
				continue;
			}
			let t = n[r++].line;
			l.push(u + (c ? t.ascent : t.descent)), u += t.ascent + t.descent;
		}
	}
	let d = u, f = n.width - d, p = t.anchor === "ctr" ? f / 2 : t.anchor === "b" ? Math.max(0, f) : 0, m = n.top, g = n.height;
	if (t.anchorCtr) {
		let t = 0;
		for (let n of a) t = Math.max(t, C(n.glyphs.slice(0, w(n.glyphs))) + (n.firstInParagraph ? e[n.paragraph].firstLinePrefix?.advance ?? 0 : 0));
		m = n.top + (n.height - t) / 2, g = t;
	}
	let _ = [], b = [];
	return a.forEach((t, r) => {
		let i = c ? n.left + n.width - p - l[r] : n.left + p + l[r], a = e[t.paragraph], o = a.alignment, s = t.firstInParagraph ? a.firstLinePrefix : void 0, u = s?.advance ?? 0, d = (a.marginStart ?? 0) + (t.firstInParagraph ? a.firstLineIndent ?? 0 : 0) + u, f = a.marginEnd ?? 0, h = m + d, v = w(t.glyphs), y = C(t.glyphs.slice(0, v)), x = g - d - f - y, T = h, E = () => 0, D = t.lastInParagraph;
		if (o === "dist" || o === "thaiDist") v <= 1 ? T = h + x / 2 : E = (e) => e < v - 1 ? Math.max(0, x) / (v - 1) : 0;
		else if (S(o, D, t.endsWithBreak)) {
			let e = t.glyphs.slice(0, v).filter((e) => e.space).length;
			e > 0 && (E = (n) => n < v && t.glyphs[n].space ? Math.max(0, x) / e : 0);
		} else o === "ctr" ? T = h + x / 2 : o === "r" && (T = h + x);
		b.push({
			axisX: i,
			thickness: t.thickness,
			paragraph: t.paragraph,
			...s ? { prefixTop: T - u } : {}
		});
		let O = T;
		t.glyphs.forEach((e, t) => {
			_.push({
				...e,
				axisX: i,
				cellTop: O,
				column: r
			}), O += e.advance + E(t);
		});
	}), {
		glyphs: _,
		columns: b,
		blockWidth: d
	};
}
var E = 7 / 6;
function D(e, t, n) {
	let r = t ? 700 : 400, a = i(e, {
		weight: r,
		style: n ? "italic" : "normal"
	});
	return a.length === 0 && (a = i(e, { weight: r })), a.length === 0 && (a = i(e)), a.find((e) => e.source === "macos-supplemental") ?? a.find((e) => e.source === "office-mac") ?? a[0];
}
function O(e, t, n) {
	let r = D(e, t, n);
	if (!(!r || !(r.unitsPerEm > 0))) {
		if (r.typoMetrics) {
			let [e, t, n] = r.typoMetrics;
			return {
				ascent: (e + Math.max(0, n)) / r.unitsPerEm,
				descent: -t / r.unitsPerEm
			};
		}
		if (r.win) return {
			ascent: r.win[0] / r.unitsPerEm,
			descent: r.win[1] / r.unitsPerEm
		};
	}
}
var k = new Set([..."()<>[]{}…‥‐←→↑↓―∥、。ー～＝＿￣｜（）〔〕［］｛｝〈〉《》「」『』【】〖〗"].map((e) => e.codePointAt(0)));
function A(e) {
	return k.has(e);
}
function j(e, t, n = !1, r = !1) {
	if (!k.has(t)) return;
	let i = D(e, n, r), a = String.fromCodePoint(t);
	return i?.stackedVerticalGlyphs?.includes(a) ? "vert" : t >= 128 && i?.stackedVrt2OnlyGlyphs?.includes(a) ? "nominal" : void 0;
}
function M(e, n, r, i = !1) {
	let a = [], o = t(e);
	o.push(e.length);
	let s = 0;
	for (let t of o) {
		let o = e.slice(s, t);
		if (s = t, !o) continue;
		let c = o.codePointAt(0) ?? 0, l = i ? void 0 : j(n.family, c, n.bold, n.italic);
		i || !A(c) ? a.push({
			text: o,
			kind: "upright",
			advance: r.upright
		}) : l ? a.push({
			text: o,
			kind: "verticalGlyph",
			advance: r.verticalGlyph,
			...l === "nominal" ? { nominal: !0 } : {}
		}) : a.push({
			text: o,
			kind: "rotated",
			advance: r.rotated(o)
		});
	}
	return a;
}
function N(e) {
	return e.nominal ? e.text : P(e.text);
}
function P(e) {
	let t = e.codePointAt(0) ?? 0;
	if (String.fromCodePoint(t) !== e) return null;
	let n = u(t) ?? l(t);
	return n === null ? null : String.fromCodePoint(n);
}
function F(e, t, n, r) {
	return e + t - n.descent * r;
}
function I(e, t, n, r, i, a, o) {
	let s = n - (i.ascent + i.descent) * a / 2, c = r + i.ascent * a;
	e.textAlign = "left", e.textBaseline = "alphabetic", o?.(s, c), e.fillText(t, s, c);
}
function L(e, t, n, r, i, a, o) {
	e.save(), e.translate(n - (i.ascent - i.descent) * a / 2, r), e.rotate(Math.PI / 2), e.textAlign = "left", e.textBaseline = "alphabetic", o?.(), e.fillText(t, 0, 0), e.restore();
}
export { N as a, T as c, b as d, _ as f, h as g, g as h, F as i, S as l, v as m, I as n, E as o, y as p, M as r, O as s, L as t, x as u };
