import { M as e, N as t } from "./wmf-HY7sNn5s.js";
import { Gn as n, Jn as r, Kn as i, Ln as a, an as o, ar as s, f as c, g as l, in as u, nn as d, nr as f, oi as p, or as m, p as h, qn as g, rn as _, rr as v, sn as y, tn as b, vt as x } from "./plot-area-frame-BSqoSYxZ.js";
var S = 4096, C = 4, w = S;
function T(e, t, n, r) {
	let i = [[]], a = [null], o = 0, s = (e) => {
		if (!e) return null;
		let t = e.startsWith("#") ? e.slice(1) : e;
		return /^[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$/.test(t) ? `#${t}` : null;
	};
	outer: for (let c = 0; c < t.runs.length && c < w; c++) {
		let l = t.runs[c];
		l.text !== "\n" && a[i.length - 1] == null && (a[i.length - 1] = l.paragraphAlign ?? null);
		let u = p(l.fontSizeHpt, t.ptToPx) ?? n, d = l.fontFace?.trim().replaceAll("\"", ""), f = d && !d.startsWith("+") ? d : null, m = d && t.fontFamilyForFace ? t.fontFamilyForFace(d) : f ? x(f) : t.fontFamily, h = `${l.italic ?? t.fallbackItalic ?? !1 ? "italic " : ""}${l.bold ?? t.fallbackBold ? "bold " : ""}${u}px ${m}`, g = (l.baseline ?? t.fallbackBaseline ?? 0) * u, _ = l.colorPaintAuthored === !0 || l.color != null || l.colorHidden === !0 ? l.colorHidden === !0 ? null : s(l.color) : t.fallbackColorHidden === !0 ? null : r, v = "", y = () => {
			v &&= (e.font = h, i[i.length - 1].push({
				text: v,
				font: h,
				fillStyle: _,
				width: e.measureText(v).width,
				fontSizePx: u,
				baselineShiftPx: g
			}), "");
		}, b = !1;
		for (let e of l.text) {
			if (b && e === "\n") {
				b = !1;
				continue;
			}
			b = !1;
			let t = e === "\r" ? "\n" : e;
			if (e === "\r" && (b = !0), o >= S) {
				y();
				break outer;
			}
			if (o++, t === "\n") {
				if (y(), i.length >= C) break outer;
				i.push([]), a.push(l.paragraphAlign ?? null);
			} else v += t;
		}
		y();
	}
	if (!i.some((e) => e.length > 0)) return null;
	let c = i.map((e) => Math.max(n * 1.15, ...e.map((e) => e.fontSizePx * 1.15 + Math.abs(e.baselineShiftPx)))), l = i.map((e) => e.reduce((e, t) => e + t.width, 0));
	return {
		lines: i,
		lineAligns: a,
		lineHeights: c,
		lineWidths: l,
		width: Math.max(0, ...l),
		height: c.reduce((e, t) => e + t, 0)
	};
}
function E(e, t, n, r, i = "center", a = "middle", o = t.width) {
	let s = a === "top" ? r : a === "bottom" ? r - t.height : r - t.height / 2;
	for (let r = 0; r < t.lines.length; r++) {
		let c = t.lines[r], l = t.lineWidths[r], u = t.lineAligns[r], d = u === "l" ? "left" : u === "r" ? "right" : u === "ctr" ? "center" : i, f = i === "left" ? n : i === "right" ? n - o : n - o / 2, p = f + o, m = d === "left" ? f : d === "right" ? p - l : f + (o - l) / 2, h = a === "top" ? s : a === "bottom" ? s + t.lineHeights[r] : s + t.lineHeights[r] / 2;
		for (let t of c) {
			if (e.font = t.font, t.fillStyle == null) {
				m += t.width;
				continue;
			}
			e.fillStyle = t.fillStyle, e.textAlign = "left", e.textBaseline = a, e.fillText(t.text, m, h - t.baselineShiftPx), m += t.width;
		}
		s += t.lineHeights[r];
	}
}
function D(e, t, n, r) {
	let i = e.x, a = e.y, o = t.x, s = t.y, c = n.x, l = n.y, u = r.x, d = r.y, f = o - c, p = u - c, m = i - o + c - u, h = s - l, g = d - l, _ = a - s + l - d, v, y;
	if (Math.abs(m) < 1e-12 && Math.abs(_) < 1e-12) v = 0, y = 0;
	else {
		let e = f * g - p * h;
		if (Math.abs(e) < 1e-12) return null;
		v = (m * g - p * _) / e, y = (f * _ - m * h) / e;
	}
	return [
		o - i + v * o,
		u - i + y * u,
		i,
		s - a + v * s,
		d - a + y * d,
		a,
		v,
		y,
		1
	];
}
function O(e, t, n) {
	let r = e[6] * t + e[7] * n + e[8];
	return {
		x: (e[0] * t + e[1] * n + e[2]) / r,
		y: (e[3] * t + e[4] * n + e[5]) / r
	};
}
var k = 1;
function A(e, t) {
	let [n, r, i, a, o, s] = e, [c, l, u, d, f, p] = t;
	return [
		n * c + i * l,
		r * c + a * l,
		n * u + i * d,
		r * u + a * d,
		n * f + i * p + o,
		r * f + a * p + s
	];
}
function j(e, t, n, r, i, a, o, s, c, l, u, d, f) {
	let p = c - o, m = l - s;
	if (p <= 0 || m <= 0) return;
	let h = (d.x - u.x) / p, g = (d.y - u.y) / p, _ = (f.x - u.x) / m, v = (f.y - u.y) / m, y = (Math.hypot(d.x - u.x, d.y - u.y) || 1) * a, b = (Math.hypot(f.x - u.x, f.y - u.y) || 1) * a, x = k * p / y, S = k * m / b, C = Math.max(0, o - x), w = Math.max(0, s - S), T = Math.min(n, c + x), E = Math.min(r, l + S), D = T - C, O = E - w;
	if (D <= 0 || O <= 0) return;
	e.save();
	let [j, M, N, P, F, I] = A(i, [
		h,
		g,
		_,
		v,
		u.x - o * h - s * _,
		u.y - o * g - s * v
	]);
	e.setTransform(j, M, N, P, F, I), e.drawImage(t, C, w, D, O, C, w, D, O), e.restore();
}
function M(e, t, n, r, i, a, o, s, c, l, u, d, f, p) {
	let m = O(o, c, l), h = O(o, u, l), g = O(o, c, d), _ = O(o, u, d), v = (c + u) / 2, y = (l + d) / 2, b = O(o, v, y), x = {
		x: (m.x + h.x + g.x + _.x) / 4,
		y: (m.y + h.y + g.y + _.y) / 4
	}, S = P(i), C = Math.hypot(b.x - x.x, b.y - x.y) * S;
	if (p <= 0 || C <= f) {
		let o = s.x1 - s.x0, f = s.y1 - s.y0;
		j(e, t, n, r, i, a, s.x0 + c * o, s.y0 + l * f, s.x0 + u * o, s.y0 + d * f, m, h, g);
		return;
	}
	u - c >= d - l ? (M(e, t, n, r, i, a, o, s, c, l, v, d, f, p - 1), M(e, t, n, r, i, a, o, s, v, l, u, d, f, p - 1)) : (M(e, t, n, r, i, a, o, s, c, l, u, y, f, p - 1), M(e, t, n, r, i, a, o, s, c, y, u, d, f, p - 1));
}
function N(e, t, n, r, i, a = .5, o) {
	if (n <= 0 || r <= 0) return;
	let s = o ?? {
		x0: 0,
		y0: 0,
		x1: n,
		y1: r
	};
	if (![
		s.x0,
		s.y0,
		s.x1,
		s.y1
	].every(Number.isFinite) || s.x0 < 0 || s.y0 < 0 || s.x1 > n || s.y1 > r || s.x1 <= s.x0 || s.y1 <= s.y0) return;
	let [c, l, u, d] = i;
	if (Math.abs(c.x * l.y - l.x * c.y + l.x * u.y - u.x * l.y + u.x * d.y - d.x * u.y + d.x * c.y - c.x * d.y) / 2 < 1e-6) return;
	let f = D(i[0], i[1], i[2], i[3]);
	if (!f) return;
	let p = t.getTransform(), m = [
		p.a,
		p.b,
		p.c,
		p.d,
		p.e,
		p.f
	], h = P(m);
	B(e, t, n, r, i, m, h, f, s, a, 14) || (R(), t.save(), t.beginPath(), t.moveTo(i[0].x, i[0].y), t.lineTo(i[1].x, i[1].y), t.lineTo(i[2].x, i[2].y), t.lineTo(i[3].x, i[3].y), t.closePath(), t.clip(), M(t, e, n, r, m, h, f, s, 0, 0, 1, 1, a, 14), t.restore());
}
function P(e) {
	return Math.sqrt(Math.abs(e[0] * e[3] - e[1] * e[2])) || 1;
}
function F(e, t, n) {
	let r = D(e[0], e[1], e[2], e[3]);
	if (!r) return null;
	let i = [
		[-t, -n],
		[1 + t, -n],
		[1 + t, 1 + n],
		[-t, 1 + n]
	], a = [];
	for (let [e, t] of i) {
		if (!(r[6] * e + r[7] * t + r[8] > 1e-9)) return null;
		a.push(O(r, e, t));
	}
	return a;
}
function I(e, t, n) {
	let r = D(e[0], e[1], e[2], e[3]);
	return r && r[6] * t + r[7] * n + r[8] > 1e-9 ? O(r, t, n) : null;
}
var L = !1;
function R() {
	L || (L = !0, typeof console < "u" && typeof console.warn == "function" && console.warn("[ooxml] scene3d: no offscreen canvas available — using the direct warp fallback (per-cell bleed only, no supersample). Textured-source seams may be faintly visible; the silhouette and geometry are unaffected."));
}
var z = 2;
function B(t, n, r, i, a, o, s, c, l, u, d) {
	let f = a.map((e) => ({
		x: o[0] * e.x + o[2] * e.y + o[4],
		y: o[1] * e.x + o[3] * e.y + o[5]
	})), p = Infinity, m = Infinity, h = -Infinity, g = -Infinity;
	for (let e of f) e.x < p && (p = e.x), e.y < m && (m = e.y), e.x > h && (h = e.x), e.y > g && (g = e.y);
	p = Math.floor(p) - 1, m = Math.floor(m) - 1, h = Math.ceil(h) + 1, g = Math.ceil(g) + 1;
	let _ = h - p, v = g - m;
	if (_ <= 0 || v <= 0) return !1;
	let y = Math.max(1, Math.ceil(_ * z)), b = Math.max(1, Math.ceil(v * z)), x = e(y, b);
	if (!x || x.width !== y || x.height !== b) return !1;
	let S = x.getContext("2d") ?? null;
	if (!S) return !1;
	let C = z, w = [
		o[0] * C,
		o[1] * C,
		o[2] * C,
		o[3] * C,
		(o[4] - p) * C,
		(o[5] - m) * C
	];
	S.save(), S.setTransform(w[0], w[1], w[2], w[3], w[4], w[5]), S.beginPath(), S.moveTo(a[0].x, a[0].y), S.lineTo(a[1].x, a[1].y), S.lineTo(a[2].x, a[2].y), S.lineTo(a[3].x, a[3].y), S.closePath(), S.clip(), M(S, t, r, i, w, s, c, l, 0, 0, 1, 1, u * C, d), S.restore(), n.save(), n.setTransform(1, 0, 0, 1, 0, 0);
	let T = n.imageSmoothingEnabled, E = n.imageSmoothingQuality;
	return n.imageSmoothingEnabled = !0, n.imageSmoothingQuality = "high", n.drawImage(x, 0, 0, _ * C, v * C, p, m, _, v), n.imageSmoothingEnabled = T, n.imageSmoothingQuality = E, n.restore(), !0;
}
function V(e, t) {
	if (!t || ![
		t.l,
		t.t,
		t.r,
		t.b
	].some((e) => (e ?? 0) !== 0)) return e;
	let n = t.l ?? 0, r = t.t ?? 0, i = 1 - (t.r ?? 0), a = 1 - (t.b ?? 0), o = [
		I(e, n, r),
		I(e, i, r),
		I(e, i, a),
		I(e, n, a)
	];
	return o.every((e) => e != null) ? o : m();
}
function H(e, t) {
	if (e.length !== 4) return null;
	let n = e.map((e, n) => ({
		scenePoint: e,
		projected: t(e),
		index: n
	})).sort((e, t) => e.projected.y - t.projected.y || e.projected.x - t.projected.x);
	n.some(({ projected: e }) => ![e.x, e.y].every(Number.isFinite)) && m();
	let r = n.slice(0, 2).sort((e, t) => e.projected.x - t.projected.x), i = n.slice(2).sort((e, t) => e.projected.x - t.projected.x);
	return new Set([...r, ...i].map((e) => e.index)).size === 4 ? [
		r[0].scenePoint,
		r[1].scenePoint,
		i[1].scenePoint,
		i[0].scenePoint
	] : null;
}
function U(e, t, n, r) {
	if (e.thickness === 0 && n === 0) return [
		e.inner[3],
		e.inner[2],
		e.inner[1],
		e.inner[0]
	];
	let i = H(e.faces[n] ?? [], r);
	return !i || t !== "backWall" || n !== 4 ? i : [
		i[1],
		i[2],
		i[3],
		i[0]
	];
}
function W(e, t, n) {
	if (!(e != null && Number.isFinite(e) && e > 0) || !(t > 0) || !(n > 0)) return null;
	let r = e * n / t;
	return Number.isFinite(r) && r > 0 ? r : null;
}
function G(e, t, n) {
	return Math.hypot(e.x - t.x, e.y - t.y, (e.depth - t.depth) * n);
}
function K(e, t) {
	if (e.inner.length !== 4 || !(t > 0)) return null;
	let n = G(e.inner[0], e.inner[1], e.modelDepth) / t, r = G(e.inner[1], e.inner[2], e.modelDepth) / t;
	return [n, r].every((e) => Number.isFinite(e) && e > 0) ? {
		widthPt: n,
		heightPt: r
	} : null;
}
function q(e, p, x, S, C, w, T, E, D, O, k = 1) {
	let A = b(p, S, C, D), j = (e, t = 0, n = 1) => {
		if (!O) return x;
		let r = G(e[3], e[2], w.modelDepth) / k, i = G(e[3], e[0], w.modelDepth) * (n - t) / k;
		return [r, i].every((e) => Number.isFinite(e) && e > 0) ? O(r, i) : null;
	};
	if (!A) return !1;
	w.inner.length !== 4 && m();
	let M;
	try {
		M = n(p.srcRect);
	} catch {
		m();
	}
	let P = (e) => {
		let t = f(e), n = r(e), a = t ? {
			w: t.width,
			h: t.height
		} : n;
		[a.w, a.h].every((e) => Number.isFinite(e) && e > 0) || m();
		let o = i(t ? {
			width: t.width,
			height: t.height
		} : e, p.srcRect, M), s = t?.x ?? 0, c = t?.y ?? 0;
		return {
			grid: n,
			natural: a,
			crop: o,
			sourceRect: o ? {
				x0: s + o.sx,
				y0: c + o.sy,
				x1: s + o.sx + o.sw,
				y1: c + o.sy + o.sh
			} : t ? {
				x0: s,
				y0: c,
				x1: s + a.w,
				y1: c + a.h
			} : void 0
		};
	}, { natural: F } = P(x);
	if (A.mode === "stack" && l(x)) return !1;
	let I = (t, n) => {
		let r = P(t);
		N(t, e, r.grid.w, r.grid.h, n, .5, r.sourceRect);
	}, L = [
		E(w.inner[3]),
		E(w.inner[2]),
		E(w.inner[1]),
		E(w.inner[0])
	], R = (e, t, n) => ({
		x: e.x + (t.x - e.x) * n,
		y: e.y + (t.y - e.y) * n,
		depth: e.depth + (t.depth - e.depth) * n
	}), z = (e, t, n) => [
		E(R(e[3], e[0], n)),
		E(R(e[2], e[1], n)),
		E(R(e[2], e[1], t)),
		E(R(e[3], e[0], t))
	], B = A.mode === "stack" ? W(w.pictureStackAspect, F.w, F.h) : null, H = A.mode === "tile" ? c(p, x) : null, K = [];
	try {
		if (A.mode === "stack") {
			B ?? m();
			let e = 0, t = !1;
			for (let n of T) {
				if (!d(A, n) || !U(w, C, n, E)) continue;
				let r = u(A, n) ? Math.ceil(1 / B) : 1;
				r < 1 && m(), s(r, y), e += r, s(e, y), t = !0;
			}
			if (!t) return !1;
		}
		if (A.mode === "tile") {
			H || m();
			let n = 0, r = 0, i = !1;
			for (let o of T) {
				if (!d(A, o)) continue;
				let c = U(w, C, o, E);
				if (!c) continue;
				let l = G(c[0], c[1], w.modelDepth), u = G(c[0], c[3], w.modelDepth);
				if ([l, u].every(Number.isFinite) || m(), !(l > 0) || !(u > 0)) continue;
				let f = h(H, l, u), g = v(x, p.srcRect != null), _ = Math.floor(-f.x / H.tileW) - g.x, b = Math.floor(-f.y / H.tileH) - g.y, S = Math.ceil((l - f.x) / H.tileW) + g.x, T = Math.ceil((u - f.y) / H.tileH) + g.y;
				[
					_,
					b,
					S,
					T
				].every(Number.isSafeInteger) || s(2 ** 53 - 1, y);
				let D = Math.max(0, S - _), O = Math.max(0, T - b);
				(D === 0 || O === 0) && m();
				let k = D * O;
				s(k, y), n += k, s(n, y);
				let j = Math.ceil(l), M = Math.ceil(u);
				(!(j > 0 && j <= 32767) || !(M > 0 && M <= 32767) || j > Math.floor((16777216 - r) / M)) && s(2 ** 53 - 1, a), r += j * M;
				let N = t(e, j, M), P = N?.getContext("2d");
				(!N || !P) && (N && (N.width = 0), m()), K.push({
					faceIndex: o,
					width: l,
					height: u,
					origin: f,
					firstColumn: _,
					firstRow: b,
					lastColumn: S,
					lastRow: T,
					canvas: N,
					context: P
				}), i = !0;
			}
			if (!i) return !1;
		}
		if (e.save(), p.alpha != null && (e.globalAlpha *= p.alpha), A.mode === "stretch") for (let t of T) {
			if (!d(A, t)) continue;
			let n = U(w, C, t, E), r = w.thickness === 0 && t === 0 ? L : n?.map(E);
			if (!r) continue;
			let i = n ? j(n) : null;
			if (!i) continue;
			let { grid: a, crop: o, sourceRect: s } = P(i), c = V(r, p.fillRect);
			if (!c) continue;
			let l = o ? V(c, {
				l: o.dxFraction,
				t: o.dyFraction,
				r: 1 - o.dxFraction - o.dwFraction,
				b: 1 - o.dyFraction - o.dhFraction
			}) : c;
			if (l) {
				e.save(), e.beginPath(), e.moveTo(r[0].x, r[0].y);
				for (let t = 1; t < r.length; t++) e.lineTo(r[t].x, r[t].y);
				e.closePath(), e.clip(), N(i, e, a.w, a.h, l, .5, s), e.restore();
			}
		}
		else for (let t of T) {
			if (!d(A, t)) continue;
			let n = U(w, C, t, E);
			if (!n) continue;
			let r = n.map(E);
			e.save(), e.beginPath(), e.moveTo(r[0].x, r[0].y);
			for (let t = 1; t < r.length; t++) e.lineTo(r[t].x, r[t].y);
			e.closePath(), e.clip();
			let i = _(A, t);
			if (A.mode === "tile") {
				if (!H) continue;
				let n = K.find((e) => e.faceIndex === t);
				if (!n) continue;
				let i = n.canvas.width / n.width, a = n.canvas.height / n.height;
				n.context.save(), n.context.scale(i, a);
				for (let e = 0; e < n.lastRow - n.firstRow; e++) {
					let t = n.firstRow + e;
					for (let e = 0; e < n.lastColumn - n.firstColumn; e++) {
						let r = n.firstColumn + e, i = n.origin.x + r * H.tileW, a = n.origin.y + t * H.tileH, o = H.flipX && Math.abs(r) % 2 == 1, s = H.flipY && Math.abs(t) % 2 == 1;
						n.context.save(), n.context.translate(i + (o ? H.tileW : 0), a + (s ? H.tileH : 0)), n.context.scale(o ? -1 : 1, s ? -1 : 1), g(n.context, x, p.srcRect, 0, 0, H.tileW, H.tileH), n.context.restore();
					}
				}
				n.context.restore(), N(n.canvas, e, n.canvas.width, n.canvas.height, r, .5);
			} else if (A.mode === "stack") {
				if (B == null) continue;
				if (u(A, t)) for (let e = 0; e < Math.ceil(1 / B); e++) {
					let t = j(n, e * B, (e + 1) * B);
					t && I(t, z(n, e * B, (e + 1) * B));
				}
				else {
					let e = j(n);
					e && I(e, r);
				}
			} else if (A.stackUnit != null && o(A, t)) for (let e = 0; e < i; e++) {
				let t = e * A.stackUnit / D, r = (e + 1) * A.stackUnit / D, i = j(n, t, r);
				i && I(i, z(n, t, r));
			}
			else if (A.stackUnit != null) {
				let e = j(n);
				e && I(e, r);
			}
			e.restore();
		}
		return e.restore(), !0;
	} finally {
		for (let e of K) e.canvas.width = 0;
	}
}
function J(e) {
	return e.rotationX === 15 && e.rotationY === 20 && e.rightAngleAxes === !1 && e.perspective === 30;
}
function ee(e) {
	return J(e) ? 2 : 1;
}
function te(e, t) {
	let n = e.replace(/^#/, "");
	if (!/^[0-9a-f]{6}$/i.test(n) || !Number.isFinite(t)) return e;
	let r = Math.max(0, t), i = (e) => Math.max(0, Math.min(255, Math.round(Number.parseInt(n.slice(e, e + 2), 16) * r))).toString(16).padStart(2, "0");
	return `#${i(0)}${i(2)}${i(4)}`.toUpperCase();
}
function Y(e) {
	if (!e) return 1;
	let t = e.z < 0 ? {
		x: -e.x,
		y: -e.y,
		z: -e.z
	} : e, n = {
		x: .24,
		y: .42,
		z: .88
	}, r = Math.hypot(n.x, n.y, n.z), i = Math.max(0, (t.x * n.x + t.y * n.y + t.z * n.z) / r);
	return Math.max(.48, Math.min(1.22, .48 + .78 * i));
}
function ne(e, t, n, r, i) {
	let a = Number.isFinite(e) && e > 0 ? e : 0, o = Number.isFinite(t) ? $(t, 0, 500) : 150, s = Math.max(1, Math.trunc(r)), c = $(Math.trunc(n), 0, s - 1), l = i ? 1 : s, u = a / (l + o / 100);
	return {
		offset: (a - u * l) / 2 + (i ? 0 : c * u),
		size: u
	};
}
function re(e, t, n) {
	if (![
		e,
		t,
		n
	].every(Number.isFinite)) return 1;
	let r = e >= 0 ? n : t;
	return 1 - Math.min(1, Math.abs(e) / Math.max(Number.MIN_VALUE, Math.abs(r)));
}
function X(e) {
	return !(e.heightPercentAuthored ?? e.heightPercent != null) || e.heightPercent == null || !Number.isFinite(e.heightPercent) || e.heightPercent < 5 || e.heightPercent > 500 ? 1 : e.heightPercent / 100;
}
function Z(e, t, n, r) {
	if (!t.length || t.length > 1e5 || ![
		n.x,
		n.y,
		n.w,
		n.h
	].every(Number.isFinite) || n.w <= 0 || n.h <= 0 || !t.every((e) => Number.isFinite(e.x) && Number.isFinite(e.y))) return e;
	let i = Infinity, a = -Infinity, o = Infinity, s = -Infinity;
	for (let e of t) i = Math.min(i, e.x), a = Math.max(a, e.x), o = Math.min(o, e.y), s = Math.max(s, e.y);
	let c = a - i, l = s - o;
	if (!(c > 2 ** -52) || !(l > 2 ** -52)) return e;
	let u = $(Q(r, .06), 0, .45), d = n.w * (1 - 2 * u), f = n.h * (1 - 2 * u), p = Math.min(d / c, f / l);
	if (!(p > 0) || !Number.isFinite(p)) return e;
	let m = {
		x: (i + a) / 2,
		y: (o + s) / 2
	}, h = {
		x: n.x + n.w / 2,
		y: n.y + n.h / 2
	}, g = (e) => (t, n, r) => {
		let i = e(t, n, r);
		return {
			x: h.x + (i.x - m.x) * p,
			y: h.y + (i.y - m.y) * p
		};
	};
	return {
		...e,
		project: g(e.project),
		projectUnbounded: g(e.projectUnbounded),
		depthX: e.depthX * p,
		depthY: e.depthY * p
	};
}
function ie(e, t, n, r = .06) {
	return !t.length || t.length > 1e5 ? e : Z(e, t.map((t) => e.project(t.x, t.y, t.depth)), n, r);
}
var ae = 4294967295;
function oe(e, t, n) {
	let { front: r } = e, i = r.x, a = r.x + r.w, o = e.topology.farX === "min" ? i : a, s = e.topology.axisY === "min" ? r.y : r.y + r.h, c = s === r.y ? r.y + r.h : r.y, { nearDepth: l, farDepth: u } = e.topology, d = [
		e.projectUnbounded(i, c, u),
		e.projectUnbounded(a, c, u),
		e.projectUnbounded(i, s, u)
	], f = [i, a].flatMap((t) => [c, s].flatMap((n) => [l, u].map((r) => e.projectUnbounded(t, n, r).x))), p = Math.max(...f) - Math.min(...f), m = Math.hypot(d[0].x - d[2].x, d[0].y - d[2].y), h = p > 0 && m > 0 ? p / m : null, g = n ?? 0, _ = Number.isFinite(g) && g >= 0 && g <= ae ? g : 0, v = Math.max(r.w, r.h, e.modelDepth) * _ / 100, y, b;
	if (t === "floor") {
		y = [
			{
				x: i,
				y: s,
				depth: l
			},
			{
				x: a,
				y: s,
				depth: l
			},
			{
				x: a,
				y: s,
				depth: u
			},
			{
				x: i,
				y: s,
				depth: u
			}
		];
		let e = s + (s === r.y ? -v : v);
		b = y.map((t) => ({
			...t,
			y: e
		}));
	} else if (t === "sideWall") {
		y = [
			{
				x: o,
				y: s,
				depth: l
			},
			{
				x: o,
				y: s,
				depth: u
			},
			{
				x: o,
				y: c,
				depth: u
			},
			{
				x: o,
				y: c,
				depth: l
			}
		];
		let e = o + (o === i ? -v : v);
		b = y.map((t) => ({
			...t,
			x: e
		}));
	} else {
		y = [
			{
				x: i,
				y: s,
				depth: u
			},
			{
				x: a,
				y: s,
				depth: u
			},
			{
				x: a,
				y: c,
				depth: u
			},
			{
				x: i,
				y: c,
				depth: u
			}
		];
		let t = e.modelDepth > 0 ? v / e.modelDepth : 0, n = u === 0 ? -t : 1 + t;
		b = y.map((e) => ({
			...e,
			depth: n
		}));
	}
	if (!(v > 0)) return {
		thickness: 0,
		inner: y,
		outer: [...y],
		faces: [y],
		pictureStackAspect: h,
		modelDepth: e.modelDepth
	};
	let x = y.map((e, t) => [
		e,
		y[(t + 1) % y.length],
		b[(t + 1) % b.length],
		b[t]
	]), S = [
		y,
		b,
		...x
	], C = [...y, ...b].reduce((e, t) => ({
		x: e.x + t.x / 8,
		y: e.y + t.y / 8,
		depth: e.depth + t.depth / 8
	}), {
		x: 0,
		y: 0,
		depth: 0
	}), w = S.map((e) => {
		let [t, n, r] = e, i = {
			x: n.x - t.x,
			y: n.y - t.y,
			depth: n.depth - t.depth
		}, a = {
			x: r.x - t.x,
			y: r.y - t.y,
			depth: r.depth - t.depth
		}, o = {
			x: i.y * a.depth - i.depth * a.y,
			y: i.depth * a.x - i.x * a.depth,
			depth: i.x * a.y - i.y * a.x
		}, s = e.reduce((t, n) => ({
			x: t.x + n.x / e.length,
			y: t.y + n.y / e.length,
			depth: t.depth + n.depth / e.length
		}), {
			x: 0,
			y: 0,
			depth: 0
		}), c = {
			x: s.x - C.x,
			y: s.y - C.y,
			depth: s.depth - C.depth
		};
		return o.x * c.x + o.y * c.y + o.depth * c.depth < 0 ? [...e].reverse() : e;
	});
	return {
		thickness: v,
		inner: y,
		outer: b,
		faces: w,
		pictureStackAspect: h,
		modelDepth: e.modelDepth
	};
}
function se(e, t, n, r) {
	if (!Number.isFinite(r) || r < 0 || r > 1 || n === "x" && t === "sideWall" || n === "y" && t === "floor") return [];
	let i = (e, t) => ({
		x: e.x + (t.x - e.x) * r,
		y: e.y + (t.y - e.y) * r,
		depth: e.depth + (t.depth - e.depth) * r
	}), a, o, s, c, l, u;
	n === "x" ? (a = i(e.inner[0], e.inner[1]), o = i(e.inner[3], e.inner[2]), s = i(e.outer[0], e.outer[1]), c = i(e.outer[3], e.outer[2]), l = 2, u = 4) : (a = i(e.inner[0], e.inner[3]), o = i(e.inner[1], e.inner[2]), s = i(e.outer[0], e.outer[3]), c = i(e.outer[1], e.outer[2]), l = 5, u = 3);
	let d = [{
		faceIndex: 0,
		scenePoints: [a, o]
	}];
	return e.thickness > 0 && d.push({
		faceIndex: 1,
		scenePoints: [s, c]
	}, {
		faceIndex: l,
		scenePoints: [a, s]
	}, {
		faceIndex: u,
		scenePoints: [o, c]
	}), d;
}
function ce(e, t, n) {
	let r = [
		["floor", t.floor?.thicknessPercent],
		["sideWall", t.sideWall?.thicknessPercent],
		["backWall", t.backWall?.thicknessPercent]
	].map(([t, n]) => oe(e, t, n));
	return r.some((e) => e.thickness > 0) ? Z(e, r.flatMap((e) => e.faces.flat()).map((t) => e.projectUnbounded(t.x, t.y, t.depth)), n, .03) : e;
}
var Q = (e, t) => typeof e == "number" && Number.isFinite(e) ? e : t, $ = (e, t, n) => Math.min(n, Math.max(t, e));
function le(e, t, n = {}) {
	if (![
		t.x,
		t.y,
		t.w,
		t.h
	].every(Number.isFinite) || t.w <= 0 || t.h <= 0) return null;
	let r = $(Q(e.rotationX, 15), -90, 90), i = ($(Q(e.rotationY, 20), 0, 360) + 180) % 360 - 180, a = $(Q(e.depthPercent, 100), 20, 2e3), o = $(Q(e.perspective, 30), 0, 240), s = $(Q(e.gapDepthPercent, 150), 0, 500), c = (e.heightPercentAuthored ?? e.heightPercent != null) && e.heightPercent != null && Number.isFinite(e.heightPercent) ? $(e.heightPercent, 5, 500) : null, l = n.sceneHeightScale != null && Number.isFinite(n.sceneHeightScale) ? $(n.sceneHeightScale * 100, 5, 500) : null, u = c ?? l, d = t;
	if (u != null) {
		let e = u / 100, n = Math.min(t.w, t.h / e), r = n * e;
		d = {
			x: t.x + (t.w - n) / 2,
			y: t.y + (t.h - r) / 2,
			w: n,
			h: r
		};
	}
	let f = Math.PI / 180, p = $(Q(n.sceneDepthScale, .1), .01, 2), m = d.w * p * (a / 100), h = d.x + d.w / 2, g = d.y + d.h / 2, _ = -i * f, v = r * f, y = Math.cos(_), b = Math.sin(_), x = Math.cos(v), S = Math.sin(v), C = e.rightAngleAxes !== !0 && o > 0, w = $(o * .25, .25, 60) * f, T = $(Q(n.perspectiveTangentGain, 2), .25, 4), E = Math.atan(T * Math.tan(w)), D = Math.hypot(d.w, d.h, m), O = C ? D * .5 / Math.tan(E) : Infinity, k = (e, t, n, r = !0) => {
		let i = e - h, a = g - t, o = Number.isFinite(n) ? n : 0, s = (.5 - (r ? $(o, 0, 1) : o)) * m, c = y * i + b * s, l = -b * i + y * s;
		return {
			x: c,
			y: x * a - S * l,
			z: S * a + x * l
		};
	}, A = (e) => {
		if (e.length < 3) return null;
		let t = e.map((e) => k(e.x, e.y, e.depth, !1)), n = t[0], r = null;
		for (let e = 1; e + 1 < t.length && !r; e++) for (let i = e + 1; i < t.length; i++) {
			let a = t[e], o = t[i], s = {
				x: a.x - n.x,
				y: a.y - n.y,
				z: a.z - n.z
			}, c = {
				x: o.x - n.x,
				y: o.y - n.y,
				z: o.z - n.z
			}, l = {
				x: s.y * c.z - s.z * c.y,
				y: s.z * c.x - s.x * c.z,
				z: s.x * c.y - s.y * c.x
			}, u = Math.hypot(l.x, l.y, l.z);
			if (u > 2 ** -52) {
				r = {
					x: l.x / u,
					y: l.y / u,
					z: l.z / u
				};
				break;
			}
		}
		return r ? {
			normal: r,
			centroid: t.reduce((e, n) => ({
				x: e.x + n.x / t.length,
				y: e.y + n.y / t.length,
				z: e.z + n.z / t.length
			}), {
				x: 0,
				y: 0,
				z: 0
			})
		} : null;
	}, j = -Infinity;
	for (let e of [d.x, d.x + d.w]) for (let t of [d.y, d.y + d.h]) for (let n of [0, 1]) j = Math.max(j, k(e, t, n).z);
	let M = C ? Math.max(O, j + D * .01) : Infinity, N = (e, t, n, r = !0) => {
		let i = k(e, t, n, r);
		if (!C) return {
			x: i.x,
			y: -i.y
		};
		let a = M / Math.max(M * 1e-9, M - i.z);
		return {
			x: i.x * a,
			y: -i.y * a
		};
	}, P = [];
	for (let e of [d.x, d.x + d.w]) for (let t of [d.y, d.y + d.h]) for (let n of [0, 1]) P.push(N(e, t, n));
	let F = Math.min(...P.map((e) => e.x)), I = Math.max(...P.map((e) => e.x)), L = Math.min(...P.map((e) => e.y)), R = Math.max(...P.map((e) => e.y)), z = Math.max(Number.MIN_VALUE, I - F), B = Math.max(Number.MIN_VALUE, R - L), V = Math.min(t.w / z, t.h / B) * .94, H = t.x + (t.w - z * V) / 2 - F * V, U = t.y + (t.h - B * V) / 2 - L * V, W = (e, t, n) => {
		let r = N(e, t, n);
		return {
			x: H + r.x * V,
			y: U + r.y * V
		};
	}, G = (e, t, n) => {
		let r = N(e, t, n, !1);
		return {
			x: H + r.x * V,
			y: U + r.y * V
		};
	}, K = { ...d }, q = W(h, g, 0), J = W(h, g, 1), ee = J.x - q.x, te = J.y - q.y, Y = (e, t) => k(e === "x" ? t === "min" ? d.x : d.x + d.w : h, e === "y" ? t === "min" ? d.y : d.y + d.h : g, e === "depth" ? t === "min" ? 0 : 1 : .5).z, ne = Y("x", "min") <= Y("x", "max") ? "min" : "max", re = Y("y", "min") <= Y("y", "max") ? "min" : "max", X = Y("depth", "min") >= Y("depth", "max") ? 0 : 1, Z = +(X === 0), ie = (e) => {
		let t = e === "min" ? d.x : d.x + d.w, n = W(t, d.y, X), r = W(t, d.y + d.h, X);
		return (n.x + r.x) / 2;
	}, ae = (e) => {
		let t = e === "min" ? d.y : d.y + d.h, n = W(d.x, t, X), r = W(d.x + d.w, t, X);
		return (n.y + r.y) / 2;
	}, oe = ie("min") <= ie("max") ? "min" : "max", se = ae("min") >= ae("max") ? "min" : "max", ce = (e) => 1 / Math.max(1, Math.trunc(e)) / (1 + s / 100), le = (e, t, n = !1) => n || t <= 1 ? .5 : ($(Math.trunc(e), 0, Math.max(0, t - 1)) + .5) / t;
	return {
		scene: d,
		front: K,
		depthX: ee,
		depthY: te,
		modelDepth: m,
		pieScaleY: $(Math.sin(Math.max(1, Math.abs(r)) * f) ** 1.15, .2, 1),
		pieThicknessFraction: .3 * Math.max(0, Math.cos(Math.abs(r) * f)),
		project: W,
		projectUnbounded: G,
		cameraDepth(e, t, n) {
			return k(e, t, n, !1).z;
		},
		cameraProjectionWeight(e, t, n) {
			if (!C) return 1;
			let r = k(e, t, n, !1).z;
			return 1 / Math.max(M * 1e-9, M - r);
		},
		cameraFacing(e) {
			let t = A(e);
			if (!t) return !1;
			let { normal: n, centroid: r } = t, i = C ? {
				x: -r.x,
				y: -r.y,
				z: M - r.z
			} : {
				x: 0,
				y: 0,
				z: 1
			}, a = n.x * i.x + n.y * i.y + n.z * i.z, o = Math.hypot(i.x, i.y, i.z);
			return o > 0 && a > o * 1e-10;
		},
		cameraNormal(e) {
			return A(e)?.normal ?? null;
		},
		topology: {
			farX: ne,
			farY: re,
			axisX: oe,
			axisY: se,
			nearDepth: X,
			farDepth: Z
		},
		seriesDepth: le,
		prismDepth: ce,
		prismInterval(e, t, n = !1) {
			let r = le(e, t, n), i = ce(n ? 1 : t) / 2;
			return {
				near: $(r - i, 0, 1),
				far: $(r + i, 0, 1)
			};
		}
	};
}
export { I as _, oe as a, re as c, Y as d, ee as f, F as g, N as h, le as i, J as l, q as m, ce as n, se as o, K as p, X as r, ne as s, ie as t, te as u, E as v, T as y };
