import { r as e } from "./own-key-CzMRhMxt.js";
import { M as t, N as n, h as r, p as i } from "./wmf-HY7sNn5s.js";
import { t as a } from "./ooxml-error-DbICW35n.js";
function o(e, t, n, r) {
	if (t === 0) return e;
	let i = -t * Math.PI / 180, a = Math.cos(i), o = Math.sin(i), s = e.a ?? 1, c = e.b ?? 0, l = e.c ?? 0, u = e.d ?? 1, d = (e.e ?? 0) - n, f = (e.f ?? 0) - r;
	return {
		a: a * s - o * c,
		b: o * s + a * c,
		c: a * l - o * u,
		d: o * l + a * u,
		e: n + a * d - o * f,
		f: r + o * d + a * f
	};
}
var s = {
	pct5: "#......./......../......../......../....#.../......../......../........",
	pct10: "#......./......../....#.../......../#......./......../....#.../........",
	pct20: "#...#.../......../..#...#./......../#...#.../......../..#...#./........",
	pct25: "#...#.../..#...#./#...#.../..#...#./#...#.../..#...#./#...#.../..#...#.",
	pct30: "#.#.#.#./.#...#../#.#.#.#./...#...#/#.#.#.#./.#...#../#.#.#.#./...#...#",
	pct40: "#.#.#.#./.#.#.#.#/#.#.#.#./.#.#...#/#.#.#.#./.#.#.#.#/#.#.#.#./...#.#.#",
	pct50: "#.#.#.#./.#.#.#.#/#.#.#.#./.#.#.#.#/#.#.#.#./.#.#.#.#/#.#.#.#./.#.#.#.#",
	pct60: "###.###./.#.#.#.#/#.###.##/.#.#.#.#/###.###./.#.#.#.#/#.###.##/.#.#.#.#",
	pct70: ".###.###/##.###.#/.###.###/##.###.#/.###.###/##.###.#/.###.###/##.###.#",
	pct75: ".###.###/########/##.###.#/########/.###.###/########/##.###.#/########",
	pct80: "###.####/########/#######./########/###.####/########/#######./########",
	pct90: "########/########/########/####.###/########/########/########/.#######",
	horz: "########/......../......../......../......../......../......../........",
	vert: "#......./#......./#......./#......./#......./#......./#......./#.......",
	ltHorz: "########/......../......../......../########/......../......../........",
	ltVert: "#...#.../#...#.../#...#.../#...#.../#...#.../#...#.../#...#.../#...#...",
	dkHorz: "########/########/......../......../########/########/......../........",
	dkVert: "##..##../##..##../##..##../##..##../##..##../##..##../##..##../##..##..",
	narHorz: "########/......../########/......../########/......../########/........",
	narVert: ".#.#.#.#/.#.#.#.#/.#.#.#.#/.#.#.#.#/.#.#.#.#/.#.#.#.#/.#.#.#.#/.#.#.#.#",
	dashHorz: "####..../......../......../......../....####/......../......../........",
	dashVert: "#......./#......./#......./#......./....#.../....#.../....#.../....#...",
	cross: "########/#......./#......./#......./#......./#......./#......./#.......",
	dnDiag: "#+.....+/+#+...../.+#+..../..+#+.../...+#+../....+#+./.....+#+/+.....+#",
	upDiag: "+.....+#/.....+#+/....+#+./...+#+../..+#+.../.+#+..../+#+...../#+.....+",
	ltDnDiag: "#...#.../.#...#../..#...#./...#...#/#...#.../.#...#../..#...#./...#...#",
	ltUpDiag: "...#...#/..#...#./.#...#../#...#.../...#...#/..#...#./.#...#../#...#...",
	dkDnDiag: "##..##../.##..##./..##..##/#..##..#/##..##../.##..##./..##..##/#..##..#",
	dkUpDiag: "..##..##/.##..##./##..##../#..##..#/..##..##/.##..##./##..##../#..##..#",
	wdDnDiag: "##.....#/###...../.###..../..###.../...###../....###./.....###/#.....##",
	wdUpDiag: "#.....##/.....###/....###./...###../..###.../.###..../###...../##.....#",
	dashDnDiag: "......../......../#...#.../.#...#../..#...#./...#...#/......../........",
	dashUpDiag: "......../......../...#...#/..#...#./.#...#../#...#.../......../........",
	diagCross: "#+....+#/+#+..+#+/.+#++#+./..+##+../..+##+../.+#++#+./+#+..+#+/#+....+#",
	smCheck: "#..##..#/.##..##./.##..##./#..##..#/#..##..#/.##..##./.##..##./#..##..#",
	lgCheck: "####..../####..../####..../####..../....####/....####/....####/....####",
	smGrid: "########/#...#.../#...#.../#...#.../########/#...#.../#...#.../#...#...",
	lgGrid: "########/#......./#......./#......./#......./#......./#......./#.......",
	dotGrid: "#.#.#.#./......../#......./......../#......./......../#......./........",
	smConfetti: "#......./....#.../.#....../......#./...#..../.......#/..#...../.....#..",
	lgConfetti: "#.##...#/..##..../......##/...##.##/##.##.../##....../....##../#...##.#",
	horzBrick: "########/#......./#......./#......./########/....#.../....#.../....#...",
	diagBrick: ".......#/......#./.....#../....#.../...##.../..#..#../.#....#./#......#",
	solidDmnd: "...#..../..###.../.#####../#######./.#####../..###.../...#..../........",
	openDmnd: "#.....#./.#...#../..#.#.../...#..../..#.#.../.#...#../#.....#./.......#",
	dotDmnd: "#......./......../..#...#./......../....#.../......../..#...#./........",
	plaid: "#.#.#.#./.#.#.#.#/#.#.#.#./.#.#.#.#/####..../####..../####..../####....",
	sphere: ".###.###/#...#..#/#...####/#...####/.###.###/#..##.../#####.../#####...",
	weave: "#...#.../.#.#.#../..#...#./.#...#.#/#...#.../...#.#../..#...#./.#.#...#",
	divot: "......../...#..../....#.../...#..../......../#......./.......#/#.......",
	shingle: "......##/#....#../.#..#.../..##..../....##../......#./.......#/.......#",
	wave: "......../...##.../..#..#.#/##....../......../...##.../..#..#.#/##......",
	trellis: "########/.##..##./########/#..##..#/########/.##..##./########/#..##..#",
	zigZag: "#......#/.#....#./..#..#../...##.../#......#/.#....#./..#..#../...##..."
};
function c(n, r, i) {
	let a = e(s, n);
	if (typeof a != "string") return null;
	let o = t(64, 64);
	if (!o) return null;
	let c = o.getContext("2d");
	if (!c) return null;
	let d = l(i), f = l(r), p = u(r, i), m = a.split("/");
	for (let e = 0; e < 8; e++) for (let t = 0; t < 8; t++) {
		let n = m[e][t];
		c.fillStyle = n === "#" ? f : n === "+" ? p : d, c.fillRect(t * 8, e * 8, 8, 8);
	}
	return o;
}
function l(e) {
	return `rgba(${parseInt(e.slice(0, 2), 16)},${parseInt(e.slice(2, 4), 16)},${parseInt(e.slice(4, 6), 16)},${e.length >= 8 ? parseInt(e.slice(6, 8), 16) / 255 : 1})`;
}
function u(e, t) {
	let n = (e, t) => parseInt(e.slice(t, t + 2), 16), r = Math.round((n(e, 0) + n(t, 0)) / 2), i = Math.round((n(e, 2) + n(t, 2)) / 2), a = Math.round((n(e, 4) + n(t, 4)) / 2), o = (e) => e.length >= 8 ? n(e, 6) / 255 : 1;
	return `rgba(${r},${i},${a},${(o(e) + o(t)) / 2})`;
}
function d(e, t) {
	if (!Number.isFinite(t) || t < 0) throw RangeError("Invalid DrawingML stroke scale");
	if (!e) return Object.freeze({
		lineWidth: 0,
		lineCap: "butt",
		lineJoin: "miter",
		miterLimit: 10,
		dash: Object.freeze([])
	});
	if (!Number.isFinite(e.width) || e.width < 0) throw RangeError("Invalid DrawingML stroke width");
	let n = Math.max(.5, e.width * t), a = e.customDash == null ? e.dashStyle ? r(e.dashStyle, n) : [] : i(e.customDash, null, n), o = e.lineCap ?? "butt", s = a.some((e, t) => t % 2 == 0 && e === 0), c = {
		lineWidth: n,
		lineCap: o === "butt" && s ? "square" : o,
		lineJoin: e.lineJoin ?? "miter",
		miterLimit: e.miterLimit ?? 10,
		dash: Object.freeze(a)
	};
	if (!Number.isFinite(c.lineWidth) || !Number.isFinite(c.miterLimit) || c.miterLimit <= 0 || !c.dash.every((e) => Number.isFinite(e) && e >= 0)) throw RangeError("Invalid resolved DrawingML stroke");
	return Object.freeze(c);
}
var f = 0;
function p(e) {
	f++;
	try {
		return e();
	} finally {
		f--;
	}
}
function m() {
	if (f > 0) throw new a("unsupported-image-effect", "Brush surface unavailable");
	return null;
}
var h = 512, g = 2, _ = 16, v = Math.PI / 32, y = (e, t, n) => [e[0] * t + e[2] * n + e[4], e[1] * t + e[3] * n + e[5]], b = (e, t) => [
	e[0] * t[0] + e[2] * t[1],
	e[1] * t[0] + e[3] * t[1],
	e[0] * t[2] + e[2] * t[3],
	e[1] * t[2] + e[3] * t[3],
	e[0] * t[4] + e[2] * t[5] + e[4],
	e[1] * t[4] + e[3] * t[5] + e[5]
];
function x(e) {
	let t = e[0] * e[3] - e[1] * e[2], n = Math.max(Math.abs(e[0]), Math.abs(e[1]), Math.abs(e[2]), Math.abs(e[3]));
	return !Number.isFinite(t) || !(Math.abs(t) > n * n * 1e-12) ? null : [
		e[3] / t,
		-e[1] / t,
		-e[2] / t,
		e[0] / t,
		(e[2] * e[5] - e[3] * e[4]) / t,
		(e[1] * e[4] - e[0] * e[5]) / t
	];
}
function S(e, t, n) {
	let r = [], i = [], a = [
		1,
		0,
		0,
		1,
		0,
		0
	], o = [], s = () => {
		let e = (e, t, n) => (t[0] - e[0]) * (n[1] - t[1]) === (t[1] - e[1]) * (n[0] - t[0]) && (t[0] - e[0]) * (n[0] - t[0]) + (t[1] - e[1]) * (n[1] - t[1]) >= 0, t = [];
		for (let n of i) {
			let r = t[t.length - 1];
			if (!(r && n[0] === r[0] && n[1] === r[1])) {
				for (; t.length >= 2 && e(t[t.length - 2], t[t.length - 1], n);) t.pop();
				t.push(n);
			}
		}
		t.length > 1 && t[0][0] === t[t.length - 1][0] && t[0][1] === t[t.length - 1][1] && t.pop();
		let n = 0;
		for (; t.length - n >= 3;) if (e(t[t.length - 2], t[t.length - 1], t[n])) t.pop();
		else if (e(t[t.length - 1], t[n], t[n + 1])) n++;
		else break;
		t.length - n >= 3 && r.push(t.slice(n)), i = [];
	}, c = () => {
		let e = i[i.length - 1], t = e ? x(a) : null;
		return e && t ? y(t, e[0], e[1]) : void 0;
	}, l = (e, t) => {
		Number.isFinite(e) && Number.isFinite(t) && i.push(y(a, e, t));
	}, u = (e, t, n, r, i, a, o, s) => {
		let c = Math.PI * 2, u = o - a;
		!s && u >= c ? u = c : s && -u >= c ? u = -c : s ? (u %= c, u > 0 && (u -= c)) : (u %= c, u < 0 && (u += c));
		let d = Math.max(1, Math.ceil(Math.abs(u) / v)), f = Math.cos(i), p = Math.sin(i);
		for (let i = 0; i <= d; i++) {
			let o = a + u * i / d, s = n * Math.cos(o), c = r * Math.sin(o);
			l(e + s * f - c * p, t + s * p + c * f);
		}
	}, d = (e, t) => {
		let n = c() ?? [t[0], t[1]];
		i.length === 0 && l(t[0], t[1]);
		for (let r = 1; r <= _; r++) {
			let i = r / _, a = 1 - i;
			e === 2 ? l(a * a * n[0] + 2 * a * i * t[0] + i * i * t[2], a * a * n[1] + 2 * a * i * t[1] + i * i * t[3]) : l(a * a * a * n[0] + 3 * a * a * i * t[0] + 3 * a * i * i * t[2] + i * i * i * t[4], a * a * a * n[1] + 3 * a * a * i * t[1] + 3 * a * i * i * t[3] + i * i * i * t[5]);
		}
	}, f = {
		beginPath: () => {
			r.length = 0, i = [];
		},
		moveTo: (e, t) => {
			s(), l(e, t);
		},
		lineTo: (e, t) => l(e, t),
		closePath: () => {
			let e = i[0];
			s(), e && i.push(e);
		},
		bezierCurveTo: (...e) => d(3, e),
		quadraticCurveTo: (...e) => d(2, e),
		arcTo: (e, t) => l(e, t),
		arc: (e, t, n, r, i, a) => u(e, t, n, n, 0, r, i, !!a),
		ellipse: (e, t, n, r, i, a, o, s) => u(e, t, n, r, i, a, o, !!s),
		rect: (e, t, n, r) => {
			s(), l(e, t), l(e + n, t), l(e + n, t + r), l(e, t + r), s(), l(e, t);
		},
		roundRect: (e, t, n, r, i) => {
			let a = Array.isArray(i) ? i : [i ?? 0], o = (e) => {
				let t = typeof e == "number" ? e : typeof e == "object" && e ? Number(e.x ?? 0) : 0;
				return Math.max(0, Math.min(Math.abs(n) / 2, Math.abs(r) / 2, Number.isFinite(t) ? t : 0));
			}, [c, d, f, p] = a.length === 1 ? [
				a[0],
				a[0],
				a[0],
				a[0]
			] : a.length === 2 ? [
				a[0],
				a[1],
				a[0],
				a[1]
			] : a.length === 3 ? [
				a[0],
				a[1],
				a[2],
				a[1]
			] : a;
			s();
			let m = [
				[
					e + n - o(d),
					t + o(d),
					o(d),
					-Math.PI / 2
				],
				[
					e + n - o(f),
					t + r - o(f),
					o(f),
					0
				],
				[
					e + o(p),
					t + r - o(p),
					o(p),
					Math.PI / 2
				],
				[
					e + o(c),
					t + o(c),
					o(c),
					Math.PI
				]
			];
			for (let [e, t, n, r] of m) u(e, t, n, n, 0, r, r + Math.PI / 2, !1);
			s(), l(e, t);
		},
		save: () => {
			o.push(a);
		},
		restore: () => {
			a = o.pop() ?? a;
		},
		translate: (e, t) => {
			a = b(a, [
				1,
				0,
				0,
				1,
				e,
				t
			]);
		},
		scale: (e, t) => {
			a = b(a, [
				e,
				0,
				0,
				t,
				0,
				0
			]);
		},
		rotate: (e) => {
			let t = Math.cos(e), n = Math.sin(e);
			a = b(a, [
				t,
				n,
				-n,
				t,
				0,
				0
			]);
		},
		transform: (e, t, n, r, i, o) => {
			a = b(a, [
				e,
				t,
				n,
				r,
				i,
				o
			]);
		},
		setTransform: (e, t, n, r, i, o) => {
			a = [
				e,
				t,
				n,
				r,
				i,
				o
			];
		},
		resetTransform: () => {
			a = [
				1,
				0,
				0,
				1,
				0,
				0
			];
		}
	};
	return e(new Proxy(t, {
		get(e, t) {
			if (typeof t == "string" && Object.prototype.hasOwnProperty.call(f, t)) return f[t];
			let n = Reflect.get(e, t);
			return typeof n == "function" ? () => void 0 : n;
		},
		set() {
			return !0;
		}
	}), n.x, n.y, n.w, n.h), s(), r;
}
function C(e, t, n) {
	let r = Math.hypot(n.w, n.h);
	if (!(r > 0)) return !1;
	let i = r * 1e-9, a = 0, o = 0;
	for (let n of e) for (let e = 0; e < n.length; e++) {
		let r = n[e], s = n[(e + 1) % n.length], c = Math.hypot(s[0] - r[0], s[1] - r[1]);
		if (c <= i) continue;
		let l = r[0] - t[0], u = r[1] - t[1], d = s[0] - t[0], f = s[1] - t[1], p = l * f - u * d;
		if (Math.abs(p) / c <= i || a !== 0 && Math.sign(p) !== a) return !1;
		a = Math.sign(p), o += Math.atan2(p, l * d + u * f);
	}
	return a !== 0 && Math.abs(Math.abs(o) - Math.PI * 2) < 1e-6;
}
function w(e) {
	let t = e.fillToRect;
	return !!t && ((t.l ?? 0) + (t.r ?? 0) > 1 || (t.t ?? 0) + (t.b ?? 0) > 1);
}
function T(e) {
	let t = e.fillToRect;
	return t ? {
		origin: [t.l ?? 0, t.t ?? 0],
		size: [1 - ((t.l ?? 0) + (t.r ?? 0)), 1 - ((t.t ?? 0) + (t.b ?? 0))]
	} : {
		origin: [.5, .5],
		size: [0, 0]
	};
}
var E = (e) => [
	[e.x, e.y],
	[e.x + e.w, e.y],
	[e.x + e.w, e.y + e.h],
	[e.x, e.y + e.h]
];
function D(e) {
	let t = Infinity, n = Infinity, r = -Infinity, i = -Infinity;
	for (let [a, o] of e) t = Math.min(t, a), n = Math.min(n, o), r = Math.max(r, a), i = Math.max(i, o);
	return {
		x: t,
		y: n,
		w: r - t,
		h: i - n
	};
}
function ee(e, t) {
	let r = n(e, 1024, 1), i = r?.getContext("2d");
	if (!r || !i) return null;
	let a = i.createLinearGradient(0, 0, 1024, 0);
	for (let e of t) {
		let t = e.color.replace(/^#/, "");
		a.addColorStop(Math.max(0, Math.min(1, e.position)), `#${t}`);
	}
	return i.fillStyle = a, i.fillRect(0, 0, 1024, 1), i.getImageData(0, 0, 1024, 1).data;
}
function te(e) {
	let t = e.replace(/^#/, ""), n = (e) => Number.parseInt(t.slice(e, e + 2), 16);
	return [
		n(0),
		n(2),
		n(4),
		t.length >= 8 ? n(6) : 255
	];
}
function ne(e, t, n, r, i, a, o, s, c, l) {
	let u = e - o - n * c, d = o - n * (1 - c), f = t - s - r * l, p = s - r * (1 - l), m = c, h = 1 - c, g = l, _ = 1 - l, v = a * d * _ - i * p * h, y = a * (u * _ + d * g) - i * (f * h + p * m), b = a * u * g - i * f * m, x = [];
	if (Math.abs(v) < 1e-12) Math.abs(y) > 1e-12 && x.push(-b / y);
	else {
		let e = y * y - 4 * v * b;
		if (e >= 0) {
			let t = Math.sqrt(e);
			x.push((-y - t) / (2 * v), (-y + t) / (2 * v));
		}
	}
	let S = -1, C = i * i + a * a;
	if (c <= 1e-12 || l <= 1e-12) {
		let u = c > 1e-12 && Math.abs(i) > 1e-12 ? ((e - o) / c - n) / i : l > 1e-12 && Math.abs(a) > 1e-12 ? ((t - s) / l - r) / a : 0;
		if (u >= -1e-9 && u <= 1.000000001 && Math.abs(o + c * (n + u * i) - e) <= 1e-9 && Math.abs(s + l * (r + u * a) - t) <= 1e-9) return 0;
	}
	for (let c of x) {
		if (!(c >= -1e-9 && c <= 1.000000001)) continue;
		let l = m + h * c, u = g + _ * c;
		if (l <= 1e-12 || u <= 1e-12) continue;
		let d = (e - (1 - c) * o) / l, f = (t - (1 - c) * s) / u, p = ((d - n) * i + (f - r) * a) / C;
		if (p < -1e-9 || p > 1.000000001) continue;
		let v = Math.min(1, Math.max(0, c));
		(S < 0 || v < S) && (S = v);
	}
	return S;
}
function O(e, t, n) {
	return e[1] > t[1] && ([e, t] = [t, e]), n === e[1] ? e[0] : n === t[1] ? t[0] : e[0] + (n - e[1]) / (t[1] - e[1]) * (t[0] - e[0]);
}
function re(e) {
	let t = e.filter((t, n) => {
		let r = e[(n + 1) % e.length];
		return t[0] !== r[0] || t[1] !== r[1];
	}), n = 0;
	for (let e = 0; e < t.length; e++) {
		let r = t[e], i = t[(e + 1) % t.length], a = t[(e + 2) % t.length], o = (i[0] - r[0]) * (a[1] - i[1]) - (i[1] - r[1]) * (a[0] - i[0]);
		if (o !== 0) {
			if (n && Math.sign(o) !== n) return null;
			n = Math.sign(o);
		}
	}
	return n ? t : [];
}
function ie(e, t) {
	let n = Infinity, r = -Infinity;
	for (let i = 0; i < e.length; i++) {
		let a = e[i], o = e[(i + 1) % e.length];
		if (!(t < Math.min(a[1], o[1]) || t > Math.max(a[1], o[1]))) if (a[1] === o[1]) n = Math.min(n, a[0], o[0]), r = Math.max(r, a[0], o[0]);
		else {
			let e = O(a, o, t);
			n = Math.min(n, e), r = Math.max(r, e);
		}
	}
	return n <= r ? [[n, r]] : [];
}
function ae(e, t) {
	let [n, r, i, a] = e, o = a[0] - n[0], s = a[1] - n[1], c = r[0] - n[0], l = r[1] - n[1], u = i[0] - a[0] - c, d = i[1] - a[1] - l, f = t - n[1];
	if (l === 0 && d === 0 && s !== 0) {
		let e = f / s;
		if (e < 0 || e > 1) return [];
		let o = O(n, a, t), c = O(r, i, t);
		return [[Math.min(o, c), Math.max(o, c)]];
	}
	let p = [{ s: 0 }, { s: 1 }];
	for (let [e, o] of [[n, a], [r, i]]) {
		if (e[1] === o[1]) continue;
		let n = (t - e[1]) / (o[1] - e[1]);
		n > 0 && n < 1 && p.push({
			s: n,
			x: O(e, o, t)
		});
	}
	if (d !== 0) {
		let e = -l / d;
		e > 0 && e < 1 && p.push({ s: e });
	}
	p.sort((e, t) => e.s - t.s);
	let m = n[0] * l + c * f, h = n[0] * d + o * l + u * f - c * s, g = o * d - u * s, _ = [], v = g * d, y = 2 * g * l, b = h * l - m * d;
	if (v === 0) y !== 0 && _.push(-b / y);
	else {
		let e = y * y - 4 * v * b;
		if (e >= 0) {
			let t = Math.sqrt(e);
			_.push((-y - t) / (2 * v), (-y + t) / (2 * v));
		}
	}
	let x = (e) => {
		let t = l + d * e;
		return Math.abs(t) > 1e-12 ? (m + e * (h + e * g)) / t : d === 0 ? n[0] + o * e : (h + 2 * g * e) / d;
	}, S = [];
	for (let e = 0; e < p.length - 1; e++) {
		let m = p[e].s, h = p[e + 1].s, g = (m + h) / 2, v = l + d * g;
		if (Math.abs(v) <= 1e-12) {
			if (Math.abs(f - s * g) <= 1e-12) {
				let e = [m, h].flatMap((e) => [n[0] + o * e, n[0] + o * e + c + u * e]);
				S.push([Math.min(...e), Math.max(...e)]);
			}
			continue;
		}
		let y = (f - s * g) / v;
		if (y < 0 || y > 1) continue;
		let b = (e) => e.x === void 0 ? e.s === 0 && n[1] !== r[1] ? O(n, r, t) : e.s === 1 && a[1] !== i[1] ? O(a, i, t) : x(e.s) : e.x, C = [
			b(p[e]),
			b(p[e + 1]),
			..._.filter((e) => e > m && e < h).map(x)
		];
		S.push([Math.min(...C), Math.max(...C)]);
	}
	return S;
}
function k(e, t, r, i, a, s, c, l = 0) {
	if (w(e)) return null;
	let [u, d] = T(e).size;
	if (u === 0 != (d === 0) || e.path === "rect" && u === 0 && d === 0 || ![r, i].every((e) => [
		e.x,
		e.y,
		e.w,
		e.h
	].every(Number.isFinite) && e.w > 0 && e.h > 0) || typeof t.getTransform != "function" || e.stops.length === 0) return null;
	let f = a ? S(a, t, i) : [], p = f.length > 0 ? f : [E(i)];
	if (!C(p, [i.x + i.w / 2, i.y + i.h / 2], i)) return null;
	let _ = t.getTransform(), v = [
		_.a,
		_.b,
		_.c,
		_.d,
		_.e,
		_.f
	], k = v.every(Number.isFinite) ? x(v) : null;
	if (!k) return null;
	let A = p, j = r;
	if (!(j.w > 0 && j.h > 0)) return null;
	let M = D([...A.flat(), ...E(j)].map((e) => y(v, e[0], e[1]))), N = s ? D([...E(M), ...E(s)]) : M;
	if (l !== 0) {
		let e = E(N).map((e) => {
			let t = y(k, e[0], e[1]), n = o({
				e: t[0],
				f: t[1]
			}, -l, i.x + i.w / 2, i.y + i.h / 2);
			return y(v, n.e ?? t[0], n.f ?? t[1]);
		});
		N = D([...E(N), ...e]);
	}
	if (![
		N.x,
		N.y,
		N.w,
		N.h
	].every(Number.isFinite)) return null;
	let P = Math.min(1, (h - 2 * g - 1) / Math.max(N.w, 1e-9), (h - 2 * g - 1) / Math.max(N.h, 1e-9)), F = P === 1 ? Math.floor(N.x) : N.x, I = P === 1 ? Math.floor(N.y) : N.y, L = h - 2 * g, R = Math.max(1, Math.min(L, Math.ceil((N.x + N.w - F) * P))) + 2 * g, z = Math.max(1, Math.min(L, Math.ceil((N.y + N.h - I) * P))) + 2 * g, B = [
		1 / P,
		0,
		0,
		1 / P,
		F - g / P,
		I - g / P
	], V = x(B);
	if (!V) return null;
	let H = b(b(V, v), [
		j.w,
		0,
		0,
		j.h,
		j.x,
		j.y
	]), U = x(H);
	if (!U) return null;
	let W = n(t, R, z), G = W?.getContext("2d"), K = [...e.stops].sort((e, t) => e.position - t.position), q = ee(t, K);
	if (!W || !G || !q || typeof G.createImageData != "function") return m();
	let oe = te(K[0].color), se = te(K[K.length - 1].color), J = new Float64Array(R * z).fill(NaN);
	c && (c.edgeRows = 0, c.solves = 0, c.rejected = 0, c.pixels = R * z);
	{
		let { origin: [t, n], size: [r, i] } = T(e), a = (e) => [(e[0] - j.x) / j.w, (e[1] - j.y) / j.h], o = e.path === "shape" ? A.map((e) => e.map(a)) : [E({
			x: 0,
			y: 0,
			w: 1,
			h: 1
		})], s = 0, l = new Int32Array(z * (R + 1)), u = new Int32Array(l.length), d = new Uint8Array(l.length);
		for (let e = 0; e < z; e++) for (let t = 0; t <= R; t++) l[e * (R + 1) + t] = u[e * (R + 1) + t] = t;
		let f = (e, t) => {
			let n = e * (R + 1), r = t;
			for (; l[n + r] !== r;) r = l[n + r];
			for (; l[n + t] !== r;) {
				let e = l[n + t];
				l[n + t] = r, t = e;
			}
			return r;
		}, p = (e, t) => u[e * (R + 1) + f(e, t)], m = (e, t) => {
			let n = e * (R + 1), r = f(e, t), i = f(e, t + 1);
			r !== i && (d[n + r] < d[n + i] && ([r, i] = [i, r]), l[n + i] = r, u[n + r] = Math.max(u[n + r], u[n + i]), d[n + r] === d[n + i] && d[n + r]++);
		}, h = [];
		for (let e of o) for (let t = 0; t < e.length; t++) h.push([e[t], e[(t + 1) % e.length]]);
		let g = (e) => [t + r * e[0], n + i * e[1]];
		if (r > 0 && i > 0) {
			let e = h.map(([e, t]) => [g(e), g(t)].map((e) => y(H, e[0], e[1])));
			for (let t = 0; t < z; t++) {
				let n = t + .5, r = [];
				for (let [t, i] of e) t[1] <= n != i[1] <= n && r.push([O(t, i, n), i[1] > t[1] ? 1 : -1]);
				r.sort((e, t) => e[0] - t[0]);
				let i = 0;
				for (let e = 0; e < r.length - 1; e++) {
					if (i += r[e][1], i === 0) continue;
					let n = Math.max(0, Math.ceil(r[e][0] - .5)), a = Math.min(R - 1, Math.floor(r[e + 1][0] - .5));
					if (!(n > a)) for (let e = p(t, n); e <= a; e = p(t, e)) J[t * R + e] = 0, m(t, e);
				}
			}
		}
		for (let e = h.length - 1; e >= 0; e--) {
			let [a, o] = h[e], l = o[0] - a[0], u = o[1] - a[1];
			if (l === 0 && u === 0) continue;
			let d = [
				g(a),
				g(o),
				o,
				a
			].map((e) => y(H, e[0], e[1])), f = re(d);
			if (f?.length === 0) continue;
			let _ = d.map((e) => e[1]), v = Math.max(0, Math.ceil(Math.min(..._) - .5)), b = Math.min(z - 1, Math.floor(Math.max(..._) - .5));
			for (let e = v; e <= b; e++) {
				c && c.edgeRows++;
				for (let [o, h] of f ? ie(f, e + .5) : ae(d, e + .5)) {
					let d = Math.min(R - 1, Math.floor(h - .5)), f = Math.max(0, Math.ceil(o - .5));
					if (f > d) continue;
					let g = p(e, f);
					for (; g <= d;) {
						let [o, d] = y(U, g + .5, e + .5);
						if (s >= R * z) return null;
						s++, c && c.solves++;
						let f = ne(o, d, a[0], a[1], l, u, t, n, r, i);
						f >= 0 && (J[e * R + g] = f, m(e, g)), f < 0 && c && c.rejected++, g = p(e, g + 1);
					}
				}
			}
		}
	}
	let Y = G.createImageData(R, z), X = Y.data;
	for (let e = 0, t = 0; e < J.length; e++, t += 4) {
		let n = Number.isNaN(J[e]) ? 1 : J[e], r = n <= 0 ? oe : n >= 1 ? se : void 0;
		if (r) X[t] = r[0], X[t + 1] = r[1], X[t + 2] = r[2], X[t + 3] = r[3];
		else {
			let e = Math.min(1023, Math.floor(n * 1024)) * 4;
			X[t] = q[e], X[t + 1] = q[e + 1], X[t + 2] = q[e + 2], X[t + 3] = q[e + 3];
		}
	}
	G.putImageData(Y, 0, 0);
	let Z = t.createPattern(W, "no-repeat");
	if (!Z || typeof Z.setTransform != "function") return m();
	let Q = b(k, B);
	return Z.setTransform(o({
		a: Q[0],
		b: Q[1],
		c: Q[2],
		d: Q[3],
		e: Q[4],
		f: Q[5]
	}, l, i.x + i.w / 2, i.y + i.h / 2)), Z;
}
function A() {
	return 6566400;
}
function j(e, t, n, r) {
	if (![
		"beginPath",
		"moveTo",
		"lineTo",
		"closePath",
		"rect",
		"roundRect",
		"quadraticCurveTo",
		"bezierCurveTo",
		"arc",
		"ellipse"
	].includes(n)) return;
	let i = (n === "roundRect" ? r.slice(0, 4) : r).map((e) => typeof e == "boolean" ? Number(e) : e);
	if (!i.every(Number.isFinite) || !Object.values(t).every(Number.isFinite)) throw RangeError("Non-finite path enclosure input");
	let a = (e, n) => {
		let r = t;
		return [r.a * e + r.c * n + r.e, r.b * e + r.d * n + r.f];
	}, o = (e, n) => {
		let r = t;
		return [r.a * e + r.c * n, r.b * e + r.d * n];
	}, s = (t) => {
		let n = {
			origin: t,
			segments: [],
			closed: !1
		};
		e.paths.push(n), e.current = n, e.pen = t;
	}, c = (t) => {
		if (!e.pen || !e.current) {
			s(t);
			return;
		}
		let n = [t[0] - e.pen[0], t[1] - e.pen[1]];
		e.current.segments.push({
			points: [e.pen, t],
			start: n,
			end: n,
			curved: !1
		}), e.pen = t;
	}, l = () => {
		e.current && (c(e.current.origin), e.current.closed = !0);
	}, u = (t, n, r, i, l, u, d, f) => {
		let p = Math.cos(l), m = Math.sin(l), h = (e) => a(t + r * Math.cos(e) * p - i * Math.sin(e) * m, n + r * Math.cos(e) * m + i * Math.sin(e) * p), g = (e) => {
			let t = f ? -1 : 1;
			return o(t * (-r * Math.sin(e) * p - i * Math.cos(e) * m), t * (-r * Math.sin(e) * m + i * Math.cos(e) * p));
		}, _ = h(u);
		e.current ? c(_) : s(_);
		let v = a(t, n), y = o(r * p, r * m), b = o(-i * m, i * p), x = Math.hypot(y[0], b[0]), S = Math.hypot(y[1], b[1]);
		e.current?.segments.push({
			points: [
				_,
				h(d),
				[v[0] - x, v[1] - S],
				[v[0] + x, v[1] + S]
			],
			start: g(u),
			end: g(d),
			curved: !0
		}), e.pen = h(d);
	};
	((t, n) => {
		switch (t) {
			case "beginPath":
				e.paths = [], e.current = void 0, e.pen = void 0;
				break;
			case "moveTo":
				s(a(n[0], n[1]));
				break;
			case "lineTo":
				c(a(n[0], n[1]));
				break;
			case "closePath":
				l();
				break;
			case "rect":
			case "roundRect":
				if (s(a(n[0], n[1])), c(a(n[0] + n[2], n[1])), c(a(n[0] + n[2], n[1] + n[3])), c(a(n[0], n[1] + n[3])), l(), t === "roundRect" && e.current) for (let t of e.current.segments) t.curved = !0;
				break;
			case "quadraticCurveTo":
			case "bezierCurveTo": {
				let t = [];
				for (let e = 0; e < n.length; e += 2) t.push(a(n[e], n[e + 1]));
				e.pen || s(t[0]);
				let r = [e.pen, ...t], i = r.length - 1, o = (e, t) => {
					for (let n = e + t; n >= 0 && n <= i; n += t) {
						let i = [(r[n][0] - r[e][0]) * t, (r[n][1] - r[e][1]) * t];
						if (i[0] !== 0 || i[1] !== 0) return i;
					}
					return [0, 0];
				};
				e.current?.segments.push({
					points: r,
					start: o(0, 1),
					end: o(i, -1),
					curved: !0
				}), e.pen = r[i];
				break;
			}
			case "arc":
				u(n[0], n[1], n[2], n[2], 0, n[3], n[4], !!n[5]);
				break;
			case "ellipse":
				u(n[0], n[1], n[2], n[3], n[4], n[5], n[6], !!n[7]);
				break;
		}
	})(n, i);
}
function M(e, t, n) {
	let r = { paths: [] };
	for (let n of e) j(r, t, n.op, n.args);
	return N(r, t, n);
}
function N(e, t, n) {
	if (e.paths.length === 0) return;
	let r = t, i = r.a * r.d - r.b * r.c;
	if (!Number.isFinite(i) || i === 0) throw RangeError("Invalid path enclosure transform");
	let a = n.lineWidth / 2, o = a * Math.hypot(r.a, r.c), s = a * Math.hypot(r.b, r.d), c = n.dash.some((e) => e > 0), l = c && n.lineCap === "square", u = Infinity, d = -Infinity, f = Infinity, p = -Infinity, m = (e, t = 0, n = 0) => {
		u = Math.min(u, e[0] - t), d = Math.max(d, e[0] + t), f = Math.min(f, e[1] - n), p = Math.max(p, e[1] + n);
	}, h = (e) => {
		let t = (r.d * e[0] - r.c * e[1]) / i, n = (-r.b * e[0] + r.a * e[1]) / i, a = Math.hypot(t, n);
		return a > 0 ? [t / a, n / a] : [0, 0];
	}, g = (e, t, n) => {
		m([e[0] + r.a * t + r.c * n, e[1] + r.b * t + r.d * n]);
	};
	for (let t of e.paths) {
		let e = t.segments.filter((e) => e.start[0] !== 0 || e.start[1] !== 0);
		e.length === 0 && t.segments.length > 0 && !t.closed && n.lineCap === "round" && m(t.origin, o, s);
		for (let t of e) if (t.curved) for (let e of t.points) m(e, l ? Math.SQRT2 * o : o, l ? Math.SQRT2 * s : s);
		else {
			let [e, r] = h(t.start);
			for (let i of t.points) if (g(i, -r * a, e * a), g(i, r * a, -e * a), l) for (let t of [-1, 1]) g(i, a * (t * e - r), a * (t * r + e)), g(i, a * (t * e + r), a * (t * r - e));
			else c && n.lineCap === "round" && m(i, o, s);
		}
		for (let r = 0; r < e.length; r++) {
			let i = e[r], c = e[(r + 1) % e.length];
			if (!t.closed && r === e.length - 1) break;
			let l = i.points[i.points.length - 1];
			if (n.lineJoin === "round") {
				m(l, o, s);
				continue;
			}
			if (n.lineJoin !== "miter") continue;
			let u = h(i.end), d = h(c.start), f = 1 + u[0] * d[0] + u[1] * d[1];
			if (f <= 0 || Math.sqrt(2 / f) > n.miterLimit) continue;
			let p = -a * (u[1] + d[1]) / f, _ = a * (u[0] + d[0]) / f;
			g(l, p, _), g(l, -p, -_);
		}
		if (!t.closed && e.length > 0) {
			let t = e[0], r = e[e.length - 1];
			for (let [e, i, c] of [[
				t.points[0],
				t.start,
				-1
			], [
				r.points[r.points.length - 1],
				r.end,
				1
			]]) if (n.lineCap === "round") m(e, o, s);
			else if (n.lineCap === "square") {
				let [t, n] = h(i);
				g(e, a * (c * t - n), a * (c * n + t)), g(e, a * (c * t + n), a * (c * n - t));
			}
		}
	}
	if (u === Infinity) return;
	let _ = {
		x: u,
		y: f,
		w: d - u,
		h: p - f
	};
	if (!Object.values(_).every(Number.isFinite)) throw RangeError("Non-finite path enclosure");
	return _;
}
var P = /* @__PURE__ */ new WeakMap(), F = /* @__PURE__ */ new WeakMap(), I = (e) => F.get(e) ?? e, L = /* @__PURE__ */ new WeakMap();
function R(e) {
	if (P.has(e)) return e;
	let t = L.get(e);
	if (t) return t;
	let n = { paths: [] }, r = () => typeof e.getTransform == "function" ? e.getTransform() : {
		a: 1,
		b: 0,
		c: 0,
		d: 1,
		e: 0,
		f: 0
	}, i = (e, t) => j(n, r(), e, t), a = new Proxy(e, {
		get(e, t) {
			let n = Reflect.get(e, t, e);
			return typeof n == "function" ? (...r) => (typeof t == "string" && i(t, r), Reflect.apply(n, e, r)) : n;
		},
		set(e, t, n) {
			return Reflect.set(e, t, n, e);
		}
	});
	return P.set(a, n), F.set(a, e), L.set(e, a), a;
}
function z(e) {
	let t = P.get(e);
	if (!t || typeof e.getTransform != "function") return;
	let n = e.getTransform(), r = n.a * n.d - n.b * n.c;
	if (!(!Number.isFinite(r) || r === 0)) return N(t, n, {
		lineWidth: e.lineWidth,
		lineCap: e.lineCap,
		lineJoin: e.lineJoin,
		miterLimit: e.miterLimit,
		dash: typeof e.getLineDash == "function" ? e.getLineDash() : []
	});
}
function B(e, t) {
	if (typeof e.getTransform != "function") return;
	let n = e.getTransform(), r = (e.lineWidth ?? 1) / 2, i = e.lineJoin === "miter" && e.miterLimit >= Math.SQRT2, a = r * (i ? Math.abs(n.a) + Math.abs(n.c) : Math.hypot(n.a, n.c)), o = r * (i ? Math.abs(n.b) + Math.abs(n.d) : Math.hypot(n.b, n.d)), s = [
		[t.x, t.y],
		[t.x + t.w, t.y],
		[t.x, t.y + t.h],
		[t.x + t.w, t.y + t.h]
	], c = s.map(([e, t]) => n.a * e + n.c * t + n.e), l = s.map(([e, t]) => n.b * e + n.d * t + n.f);
	return {
		x: Math.min(...c) - a,
		y: Math.min(...l) - o,
		w: Math.max(...c) - Math.min(...c) + 2 * a,
		h: Math.max(...l) - Math.min(...l) + 2 * o
	};
}
var V = 512;
function H(e) {
	return e?.fillType === "gradient" && e.gradType === "radial" && (e.path === "rect" || e.path === "shape") && (e.tileRect?.l ?? 0) === 0 && (e.tileRect?.t ?? 0) === 0 && (e.tileRect?.r ?? 0) === 0 && (e.tileRect?.b ?? 0) === 0;
}
function U(e, t, r, i, a, s, c) {
	let l = e.tileRect;
	if (!l || (l.l ?? 0) === 0 && (l.t ?? 0) === 0 && (l.r ?? 0) === 0 && (l.b ?? 0) === 0) return null;
	let u = r + a * (l.l ?? 0), d = i + s * (l.t ?? 0), f = a * (1 - (l.l ?? 0) - (l.r ?? 0)), p = s * (1 - (l.t ?? 0) - (l.b ?? 0));
	if (!Number.isFinite(f) || !Number.isFinite(p) || Math.abs(f) < 1e-9 || Math.abs(p) < 1e-9) return null;
	let h = Math.min(1, V / Math.abs(f), V / Math.abs(p)), g = Math.max(1, Math.ceil(Math.abs(f) * h)), _ = Math.max(1, Math.ceil(Math.abs(p) * h)), v = n(t, g, _), y = v?.getContext("2d");
	if (!v || !y) return m();
	let b = {
		...e,
		tileRect: void 0,
		flip: void 0,
		rotWithShape: !0
	}, x = e.gradType === "radial" ? W(b, y, {
		x: 0,
		y: 0,
		w: g,
		h: _
	}) : Y(b, y, 0, 0, g, _, c);
	if (!x) return m();
	y.fillStyle = x, y.fillRect(0, 0, g, _);
	let S = e.flip === "x" || e.flip === "xy", C = e.flip === "y" || e.flip === "xy", w = v;
	if (S || C) {
		let e = n(t, g * (S ? 2 : 1), _ * (C ? 2 : 1)), r = e?.getContext("2d");
		if (!e || !r) return m();
		for (let e = 0; e < (C ? 2 : 1); e += 1) for (let t = 0; t < (S ? 2 : 1); t += 1) r.save(), r.translate(t * g, e * _), r.scale(t === 1 ? -1 : 1, e === 1 ? -1 : 1), r.drawImage(v, t === 1 ? -g : 0, e === 1 ? -_ : 0), r.restore();
		w = e;
	}
	let T = t.createPattern(w, "repeat");
	return !T || typeof T.setTransform != "function" ? m() : (T.setTransform(o({
		a: f / g,
		b: 0,
		c: 0,
		d: p / _,
		e: u,
		f: d
	}, e.rotWithShape === !1 ? c : 0, r + a / 2, i + s / 2)), T);
}
function W(e, t, n, r = 0, i = n) {
	let a = e.fillToRect, s = n.x + n.w * (a?.l ?? 0), c = n.y + n.h * (a?.t ?? 0), l = n.w * (1 - (a?.l ?? 0) - (a?.r ?? 0)), u = n.h * (1 - (a?.t ?? 0) - (a?.b ?? 0)), d = s + l / 2, f = c + u / 2, p = Math.max(Math.abs(d - n.x), Math.abs(n.x + n.w - d)), m = Math.max(Math.abs(f - n.y), Math.abs(n.y + n.h - f)), h = e.path === "rect" ? Math.max(p, m) : Math.sqrt(p * p + m * m), g = o({
		e: d,
		f
	}, e.rotWithShape === !1 ? r : 0, i.x + i.w / 2, i.y + i.h / 2), _ = t.createRadialGradient(g.e ?? d, g.f ?? f, 0, g.e ?? d, g.f ?? f, Math.max(h, 1e-9));
	for (let t of e.stops) _.addColorStop(Math.min(1, Math.max(0, t.position)), G(t.color));
	return _;
}
function G(e, t = 1) {
	let n = e.charCodeAt(0) === 35 ? e.slice(1) : e;
	return `rgba(${parseInt(n.slice(0, 2), 16)},${parseInt(n.slice(2, 4), 16)},${parseInt(n.slice(4, 6), 16)},${n.length >= 8 ? parseInt(n.slice(6, 8), 16) / 255 : t})`;
}
function K(e) {
	let t = e.startsWith("#") ? e.slice(1) : e;
	if (t.length < 8) return !0;
	let n = Number.parseInt(t.slice(6, 8), 16);
	return !Number.isFinite(n) || n !== 0;
}
function q(e) {
	return !e || e.fillType === "none" ? !1 : e.fillType === "solid" ? K(e.color) : e.fillType === "gradient" ? e.stops.some((e) => K(e.color)) : e.fillType === "pattern" ? K(e.fg) || K(e.bg) : e.alpha == null || !Number.isFinite(e.alpha) || e.alpha > 0;
}
function oe(e) {
	let t = e.charCodeAt(0) === 35 ? e.slice(1) : e, n = parseInt(t.slice(0, 2), 16), r = parseInt(t.slice(2, 4), 16), i = parseInt(t.slice(4, 6), 16);
	return .299 * n + .587 * r + .114 * i;
}
function se(e) {
	return e && oe(e) < 128 ? "#FFFFFF" : "#000000";
}
function J(e) {
	return e.fillType === "pattern" ? 4096 * 4 : e.fillType === "gradient" ? e.tileRect ? V ** 2 * 4 * 5 : e.gradType === "radial" && (e.path === "shape" || e.path === "rect") ? A() : 0 : 0;
}
function Y(e, t, n, r, i, a, o = 0, s, c, l, u) {
	return X(e, t, n, r, i, a, o, s, c, l, u, !0);
}
function X(e, t, n, r, i, a, s = 0, c, l, u, d, f = !0) {
	if (!e || e.fillType === "none") return null;
	if (e.fillType === "solid") return G(e.color);
	if (e.fillType === "pattern") {
		let n = $.get(I(t));
		return me(e, t, c ?? Q.get(I(t)) ?? 4 / 3, l ?? (n ? ce(t.getTransform(), n) : void 0));
	}
	if (e.fillType === "gradient") {
		let c = t.getTransform?.();
		c && c.a * c.d - c.b * c.c < 0 && (s = -s);
		let l = e.stops;
		if (l.length === 0) return null;
		if (l.length === 1) return G(l[0].color);
		let p = U(e, t, n, r, i, a, s);
		if (p) return p;
		let m, h = e.tileRect, g = n + i * (h?.l ?? 0), _ = r + a * (h?.t ?? 0), v = i * (1 - (h?.l ?? 0) - (h?.r ?? 0)), y = a * (1 - (h?.t ?? 0) - (h?.b ?? 0));
		if (f && H(e)) return k(e, t, {
			x: g,
			y: _,
			w: v,
			h: y
		}, {
			x: n,
			y: r,
			w: i,
			h: a
		}, u, d ?? B(t, {
			x: n,
			y: r,
			w: i,
			h: a
		}), void 0, e.rotWithShape === !1 ? s : 0) ?? W(e, t, {
			x: g,
			y: _,
			w: v,
			h: y
		}, s, {
			x: n,
			y: r,
			w: i,
			h: a
		});
		if (e.gradType === "radial") return W(e, t, {
			x: g,
			y: _,
			w: v,
			h: y
		}, s, {
			x: n,
			y: r,
			w: i,
			h: a
		});
		{
			let c = e.angle * Math.PI / 180, l = Math.cos(c), u = Math.sin(c);
			if (e.scaled === !0) {
				l *= v, u *= y;
				let e = Math.hypot(l, u);
				e > 0 && (l /= e, u /= e);
			}
			let d = g + v / 2, f = _ + y / 2, p = (Math.abs(l) * v + Math.abs(u) * y) / 2, h = e.rotWithShape === !1 ? s : 0, b = o({
				e: d - l * p,
				f: f - u * p
			}, h, n + i / 2, r + a / 2), x = o({
				e: d + l * p,
				f: f + u * p
			}, h, n + i / 2, r + a / 2);
			m = t.createLinearGradient(b.e, b.f, x.e, x.f);
		}
		for (let e of l) m.addColorStop(Math.min(1, Math.max(0, e.position)), G(e.color));
		return m;
	}
	return null;
}
function Z(...e) {
	let [t, n, r, i, a, o, s, c, l, u, d] = e;
	return X(t, n, r, i, a, o, s, c, l, u, d, !1);
}
var Q = /* @__PURE__ */ new WeakMap(), $ = /* @__PURE__ */ new WeakMap();
function ce(e, t) {
	let n = e.a ?? 1, r = e.b ?? 0, i = e.c ?? 0, a = e.d ?? 1, o = e.e ?? 0, s = e.f ?? 0, c = n * a - r * i;
	if (Math.abs(c) < 1e-12) return;
	let l = a / c, u = -r / c, d = -i / c, f = n / c, p = -(l * o + d * s), m = -(u * o + f * s);
	return {
		a: l * t.a + d * t.b,
		b: u * t.a + f * t.b,
		c: l * t.c + d * t.d,
		d: u * t.c + f * t.d,
		e: l * t.e + d * t.f + p,
		f: u * t.e + f * t.f + m
	};
}
function le(e, t, n) {
	let r = $.get(I(e));
	$.set(I(e), {
		a: t.a ?? 1,
		b: t.b ?? 0,
		c: t.c ?? 0,
		d: t.d ?? 1,
		e: t.e ?? 0,
		f: t.f ?? 0
	});
	try {
		return n();
	} finally {
		r ? $.set(I(e), r) : $.delete(I(e));
	}
}
function ue(e, t, n) {
	let r = Q.get(I(e));
	Q.set(I(e), t);
	try {
		return n();
	} finally {
		r === void 0 ? Q.delete(I(e)) : Q.set(I(e), r);
	}
}
function de(e, t, n, r, i) {
	e = I(e);
	let a = Q.get(e), o = $.get(e), s = o && i ? {
		a: i.a * o.a + i.c * o.b,
		b: i.b * o.a + i.d * o.b,
		c: i.a * o.c + i.c * o.d,
		d: i.b * o.c + i.d * o.d,
		e: i.a * o.e + i.c * o.f + i.e,
		f: i.b * o.e + i.d * o.f + i.f
	} : o && r ? {
		...o,
		e: o.e - r.x,
		f: o.f - r.y
	} : o, c = () => s ? le(t, s, n) : n();
	return a === void 0 ? c() : ue(t, a, c);
}
var fe = /* @__PURE__ */ new WeakMap(), pe = 256;
function me(e, t, n, r) {
	let i = r, a = `${e.preset}|${e.fg}|${e.bg}|${n}|${i?.a ?? 1},${i?.b ?? 0},${i?.c ?? 0},${i?.d ?? 1},${i?.e ?? 0},${i?.f ?? 0}`, o = fe.get(t);
	o || (o = /* @__PURE__ */ new Map(), fe.set(t, o));
	let s = o.get(a);
	if (s) return s;
	let l = c(e.preset, e.fg, e.bg);
	if (!l) return G(e.fg);
	let u = t.createPattern(l, "repeat");
	if (!u) return G(e.fg);
	if (typeof u.setTransform == "function") {
		let e = n / 8;
		u.setTransform({
			a: (i?.a ?? 1) * e,
			b: (i?.b ?? 0) * e,
			c: (i?.c ?? 0) * e,
			d: (i?.d ?? 1) * e,
			e: i?.e ?? 0,
			f: i?.f ?? 0
		});
	}
	if (o.size >= pe) {
		let e = o.keys().next().value;
		e !== void 0 && o.delete(e);
	}
	return o.set(a, u), u;
}
function he(e, t) {
	e.lineWidth = t.lineWidth, e.lineCap = t.lineCap, e.lineJoin = t.lineJoin, e.miterLimit = t.miterLimit, e.setLineDash([...t.dash]);
}
function ge(e, t, n) {
	e.strokeStyle = t ? G(t.color) : "transparent", he(e, d(t, n));
}
export { N as _, J as a, Z as c, le as d, ue as f, M as g, j as h, q as i, H as l, R as m, ge as n, G as o, z as p, se as r, Y as s, he as t, de as u, p as v, d as y };
