function e(e) {
	return e >= 12288 && e <= 40959 || e >= 44032 && e <= 55203 || e >= 63744 && e <= 64255 || e >= 65280 && e <= 65519;
}
function t(t) {
	return t === 32 || t === 9 || t === 10 || t === 13 ? !1 : !e(t);
}
function n(e) {
	return e === "my" || e === "bo";
}
function r(e) {
	return e >= 3584 && e <= 3711 || e >= 3712 && e <= 3839 || e >= 6016 && e <= 6143 || e >= 4096 && e <= 4255 || e >= 43616 && e <= 43647 || e >= 43488 && e <= 43519 || e >= 3840 && e <= 4095;
}
function i(e) {
	return e === 3633 || e >= 3635 && e <= 3642 || e >= 3655 && e <= 3662 || e === 3761 || e >= 3763 && e <= 3772 || e >= 3784 && e <= 3790 || e >= 6068 && e <= 6099 || e === 6109;
}
function a(e) {
	return e <= 3711 ? "th" : e <= 3839 ? "lo" : e <= 4095 ? "bo" : e <= 4255 ? "my" : e <= 6143 ? "km" : "my";
}
function o(e) {
	for (let t of e) if (r(t.codePointAt(0))) return !0;
	return !1;
}
function s(e) {
	for (let t of e) {
		let e = t.codePointAt(0);
		if (r(e)) return n(a(e));
	}
	return !1;
}
function c(e) {
	let t = !1;
	for (let i of e) {
		let e = i.codePointAt(0);
		if (r(e)) {
			if (n(a(e))) return !1;
			t = !0;
		}
	}
	return t;
}
var l = /* @__PURE__ */ new Map();
function u(e) {
	let t = l.get(e);
	if (t !== void 0) return t;
	let n = null;
	try {
		typeof Intl < "u" && typeof Intl.Segmenter == "function" && (n = new Intl.Segmenter(e, { granularity: "word" }));
	} catch {
		n = null;
	}
	return l.set(e, n), n;
}
function d(e) {
	let t = u(e);
	return t ? (e) => t.segment(e) : null;
}
function f(e) {
	if (!o(e)) return [];
	let t = [], i = e.length, s = 0;
	for (; s < i;) {
		let o = e.codePointAt(s), c = o > 65535 ? 2 : 1;
		if (!r(o)) {
			s += c;
			continue;
		}
		let l = a(o), u = n(l), f = s + c;
		for (; f < i;) {
			let t = e.codePointAt(f);
			if (!r(t) || n(a(t)) !== u) break;
			f += t > 65535 ? 2 : 1;
		}
		let p = e.slice(s, f);
		if (u) for (let e of x(p)) t.push(s + e);
		else {
			let e = d(l);
			if (e) {
				let n = [];
				try {
					for (let t of e(p)) t.index > 0 && (t.isWordLike ?? !0) && n.push(s + t.index);
					for (let e of n) t.push(e);
				} catch {}
			}
		}
		s = f;
	}
	return t;
}
function p(e) {
	if (!o(e)) return [];
	let t = [], n = e.length, i = e.codePointAt(0), a = i > 65535 ? 2 : 1;
	for (; a < n;) {
		let n = e.codePointAt(a), o = n > 65535 ? 2 : 1;
		r(i) !== r(n) && !m(i) && !m(n) && t.push(a), i = n, a += o;
	}
	return t;
}
function m(e) {
	return e === 32 || e === 9 || e === 10 || e === 13 || e === 12288 || e === 160 || e === 8199 || e === 8239 || e === 8288 || e === 65279;
}
function h(t, n) {
	if (!o(t)) return [];
	let r = t.length, i = new Set(f(t)), a = new Set(x(t)), s = (e) => {
		a.has(e) && i.add(e);
	};
	for (let e of p(t)) s(e);
	if (n?.cjk) {
		let n = t.codePointAt(0), i = n > 65535 ? 2 : 1;
		for (; i < r;) {
			let r = t.codePointAt(i);
			(e(r) || e(n)) && s(i), n = r, i += r > 65535 ? 2 : 1;
		}
	}
	let c = n?.kinsoku, l = c != null && c.enabled !== !1, u = [];
	for (let e of i) if (!(e <= 0 || e >= r)) {
		if (l) {
			let n = t.codePointAt(e), r = g(t, e);
			if (r !== void 0 && c.lineEndForbidden.has(r) || c.lineStartForbidden.has(n)) continue;
		}
		u.push(e);
	}
	return u.sort((e, t) => e - t), u;
}
function g(e, t) {
	if (t <= 0) return;
	let n = e.charCodeAt(t - 1);
	if (n >= 56320 && n <= 57343 && t >= 2) {
		let n = e.charCodeAt(t - 2);
		if (n >= 55296 && n <= 56319) return e.codePointAt(t - 2);
	}
	return n;
}
function _(e, t, n, r, i, a = !1) {
	let o = e.length;
	if (n >= o) return n;
	if (a) {
		if (i(e.slice(n, o)) <= r) return o;
		let a = 0, s = t.length - 1, c = n;
		for (; a <= s;) {
			let l = a + s >> 1, u = t[l];
			u <= n ? a = l + 1 : u >= o ? s = l - 1 : i(e.slice(n, u)) <= r ? (c = u, a = l + 1) : s = l - 1;
		}
		return c;
	}
	let s = n;
	for (let a of t) a <= n || a >= o || i(e.slice(n, a)) <= r && (s = a);
	return i(e.slice(n, o)) <= r && (s = o), s;
}
var v, y = /^[\u0000-\u00ff\u3000-\u3029\u3030-\u303f\u3041-\u3096\u309b-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uff01-\uff9d]*$/;
function b() {
	if (v !== void 0) return v;
	let e = null;
	try {
		typeof Intl < "u" && typeof Intl.Segmenter == "function" && (e = new Intl.Segmenter(void 0, { granularity: "grapheme" }));
	} catch {
		e = null;
	}
	return v = e, e;
}
function x(e) {
	if (y.test(e) && !e.includes("\r\n")) {
		let t = Array(Math.max(0, e.length - 1));
		for (let n = 1; n < e.length; n += 1) t[n - 1] = n;
		return t;
	}
	let t = b();
	if (t) try {
		let n = [];
		for (let r of t.segment(e)) r.index > 0 && n.push(r.index);
		return n;
	} catch {}
	let n = [];
	for (let t = 0; t < e.length;) {
		let r = e.codePointAt(t);
		t += r > 65535 ? 2 : 1, t < e.length && n.push(t);
	}
	return n;
}
var S = Object.freeze(["arabic"]), C = /^\p{Cf}$/u, w = /^\s$/u, T = /^\p{M}$/u, E = /^\p{Script_Extensions=Arabic}$/u, D = /^(?=\p{Script=Arabic})\p{L}$/u;
function O(e, t) {
	for (let n of t) if (!(w.test(n) || C.test(n))) switch (e) {
		case "arabic": return D.test(n) ? "proof" : E.test(n) ? T.test(n) ? "proof" : "extension" : T.test(n) ? "neutral" : "other";
	}
	return "neutral";
}
function k(e, t, n) {
	let r = [...new Set([
		0,
		...x(t),
		t.length
	])].sort((e, t) => e - t), i = r.slice(0, -1).map((i, a) => {
		let o = r[a + 1], s = O(e, t.slice(i, o));
		return {
			start: i,
			end: o,
			cls: s !== "neutral" && s !== "other" && n && !n(i, o) ? "other" : s
		};
	}), a = [], o = 0;
	for (; o < i.length;) {
		if (i[o].cls === "other") {
			a.push({
				...i[o],
				inScope: !1
			}), o += 1;
			continue;
		}
		let e = o;
		for (; e < i.length && i[e].cls !== "other";) e += 1;
		let t = i.slice(o, e).some((e) => e.cls === "proof"), n = !1;
		for (let r = o; r < e; r += 1) {
			let e = i[r], o = t && (e.cls === "neutral" ? n : !0);
			a.push({
				...e,
				inScope: o
			}), n = o;
		}
		o = e;
	}
	return a;
}
function A(e, t, n) {
	let r = k(e, t), i = r.some((e) => e.cls === "proof");
	return n === "any" ? i : i && r.every((e) => e.cls !== "other");
}
function j(e, t, n) {
	return !e?.script || A(e.script, t, n);
}
export { o as a, x as c, i as d, r as f, t as h, j as i, c as l, e as m, A as n, _ as o, h as p, k as r, b as s, S as t, s as u };
