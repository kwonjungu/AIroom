import { r as e } from "./own-key-CzMRhMxt.js";
import { B as t, M as n, N as r, V as i } from "./wmf-HY7sNn5s.js";
import { t as a } from "./ooxml-error-DbICW35n.js";
import { a as o } from "./symbol-font-Cf7Xu0_f.js";
import { A as s, F as c, K as l, U as u, j as d } from "./segment-line-BR56kM-V.js";
import { Jn as f, nr as p, qn as m, zn as h } from "./plot-area-frame-BSqoSYxZ.js";
import { a as g, i as _, o as v, s as y, u as b } from "./pixel-budget-DI82Hn3R.js";
import { a as x, s as S, v as C } from "./paint-s8gGHFU5.js";
import { M as w } from "./renderer-D3GIB31w.js";
import { a as T, c as E, i as D, l as ee, r as O, s as k } from "./duotone-CsU0n_8W.js";
import { t as te } from "./mathjax-DvwccQ8e.js";
var ne = 64, re = "\"__ooxml_symbol_probe_absent_7c41__\"", [A, j] = u.map(i), ie = new Set([127, 173]), M = (e, t) => e.every((e, n) => Number.isFinite(e) && e === t[n]);
function ae(e, t, n = 48) {
	try {
		if (t) return t(n, n) ?? null;
		let i = e?.canvas?.ownerDocument;
		if (i && typeof i.createElement == "function") {
			let e = i.createElement("canvas");
			return e.width = n, e.height = n, e;
		}
		return r(e, n, n);
	} catch {}
	return null;
}
function oe(e, t = "32px sans-serif", n) {
	let r, i = !1, a = /* @__PURE__ */ new Map();
	return (o, s = t) => {
		let c = `${s}\u0000${o}`;
		if (a.has(c)) return a.get(c);
		if (!i) {
			i = !0;
			try {
				r = ae(e, n)?.getContext("2d", { willReadFrequently: !0 });
			} catch {
				r = null;
			}
		}
		let l;
		if (r) {
			let e = r, t = (t, n) => {
				if (e.clearRect(0, 0, 48, 48), e.getImageData(0, 0, 48, 48).data.some((e) => e !== 0)) return;
				e.globalAlpha = 1, e.globalCompositeOperation = "source-over", e.fillStyle = t, e.textBaseline = "middle", e.font = s, e.fillText(o, 4, 24);
				let r = e.getImageData(0, 0, 48, 48).data, i = !1;
				for (let e = 0; e < r.length; e += 4) {
					if (r[e + 3] < 64) continue;
					i = !0;
					let t = r[e + n];
					if (t < 200 || r[e] + r[e + 1] + r[e + 2] - t > 48) return !1;
				}
				return i ? !0 : void 0;
			};
			try {
				l = t("#f00", 0), l &&= t("#00f", 2);
			} catch {
				l = void 0;
			}
		}
		return a.size >= 1024 && a.clear(), a.set(c, l), l;
	};
}
function se(e) {
	let t = e?.canvas;
	if (t?.ownerDocument?.fonts) return t.ownerDocument.fonts;
	let n = globalThis;
	return n.document?.fonts ?? n.fonts ?? null;
}
function ce(e, n = {}) {
	let r = n.probeOwner ?? e, i = oe(r, void 0, n.createCanvas), a = /* @__PURE__ */ new Map(), s = "", c = (t, n) => {
		s !== t && (e.font = t, s = t);
		let r = e.measureText(n);
		return [
			r.width,
			r.actualBoundingBoxLeft ?? 0,
			r.actualBoundingBoxRight ?? 0,
			r.actualBoundingBoxAscent ?? 0,
			r.actualBoundingBoxDescent ?? 0
		];
	}, u = (t) => {
		if (!e) return;
		let n = e.font, r = e.direction, i = e.letterSpacing;
		try {
			return r !== void 0 && (e.direction = "ltr"), i !== void 0 && (e.letterSpacing = "0px"), s = "", t();
		} catch {
			return;
		} finally {
			try {
				e.font = n, r !== void 0 && (e.direction = r), i !== void 0 && (e.letterSpacing = i);
			} catch {}
		}
	}, d = (e, n, r, i, a) => {
		let o = String.fromCharCode(61440 + r), s = String.fromCharCode(r), l = `${i}${ne}px `;
		if (e === "sentinel") {
			let e = t(a);
			if (!e) return;
			let r = e.findIndex((e) => e.generic), i = (r < 0 ? e : e.slice(0, r)).map((e) => `${e.text}, `).join(""), u = (e) => !M(c(`${l}${A}`, e), c(`${l}${j}`, e)) && M(c(`${l}${i}${A}`, e), c(`${l}${i}${j}`, e));
			return u(o) ? n || u(s) && M(c(`${l}${i}${A}`, s), c(`${l}${i}${A}`, o)) : !1;
		}
		let u = `${l}${a}`, d = `${l}${re}`;
		if (M(c(d, "i"), c(d, "W"))) return;
		let f = (e) => !M(c(u, e), c(d, e)), p = (e) => {
			let t = String.fromCharCode(e), n = String.fromCharCode(61440 + e);
			return M(c(u, n), c(u, t)) && f(n) && f(t);
		};
		return ie.has(r) ? n && p(65) && f(o) : p(r);
	}, f = (t, n) => {
		let i = t.codePointAt(0) ?? 0, o = i >= 61472 && i <= 61695;
		if (t.length !== 1 || !o && (i < 32 || i > 255)) return !1;
		let c = /^(.*?)\d*\.?\d+px\s+(.+)$/su.exec(n);
		if (!c) return;
		let f = `${c[1]}\u0000${c[2]}\u0000${t}`, p = a.get(f);
		return p === void 0 ? u(() => {
			let t = l(e) ? "sentinel" : se(r) ? null : "plain";
			if (!t) return;
			s = "";
			let n = d(t, o, o ? i - 61440 : i, c[1], c[2]);
			return n !== void 0 && (a.size >= 4096 && a.clear(), a.set(f, n)), n;
		}) : p;
	};
	return Object.freeze({
		draws: f,
		monochrome: (e, t) => i(e, t),
		segments(e, t, n, r, a) {
			return o(e, t, {
				...a ? { keepsShifted: a } : {},
				native: (e) => f(e, n),
				monochrome: (e) => {
					let t = e.replace(/︎/gu, ""), n = i(e, r?.(e));
					return n !== !0 || t === e ? n : i(t, r?.(t));
				}
			});
		}
	});
}
function le(e, t, n, r, i, a, o, l, u, f, p) {
	let m = d(t, i, a, o, void 0, n, r);
	if (!m) return !1;
	let h = !1, g = m.length - 1;
	for (let t = 0; t < m.length; t++) {
		let n = m[t];
		e.beginPath(), c(e, n.path);
		let r = n.fill, i = r !== "none" && l != null;
		if (r !== "none" && p?.paintFill) {
			let t = !1;
			e.save();
			try {
				t = p.paintFill(e);
			} finally {
				e.restore();
			}
			if (t) {
				let t = s(r);
				t && (e.save(), e.fillStyle = t, e.fill(), e.restore()), h ||= (f(), !0);
			}
		} else if (i) {
			e.save(), e.fillStyle = l, e.fill();
			let t = s(r);
			t && (e.fillStyle = t, e.fill()), e.restore(), h ||= (f(), !0);
		}
		if (n.stroke && u) {
			let e = t === g && (n.fill === "none" || n.fill == null);
			p?.skipTrailingStroke && e || u();
		}
	}
	return !0;
}
var ue = class {
	limit;
	used = 0;
	constructor(e = g) {
		this.limit = e;
	}
	charge(e) {
		let t = this.used + e;
		if (!Number.isSafeInteger(e) || e < 0 || !Number.isSafeInteger(t) || t > this.limit) throw new b("image-effect-work", this.limit, Number.isSafeInteger(t) ? t : 2 ** 53 - 1);
		this.used = t;
	}
};
function N() {
	throw new a("unsupported-image-effect", "Malformed image effect parameters");
}
var P = (e) => typeof e == "string" && /^(?:[0-9a-f]{6}|[0-9a-f]{8})$/i.test(e), F = (e) => typeof e == "string" && /^[0-9a-f]{6}$/i.test(e), de = (e) => [
	"over",
	"mult",
	"screen",
	"darken",
	"lighten"
].includes(e);
function I(e, t, n = -Infinity, r = Infinity) {
	for (let i of t) {
		let t = e[i];
		(typeof t != "number" || !Number.isFinite(t) || t < n || t > r) && N();
	}
}
function fe(e) {
	(!e || !F(e.color)) && N(), I(e, ["alpha"], 0, 1), I(e, ["blur", "dist"], 0), I(e, ["dir"]);
	for (let t of [
		"sx",
		"sy",
		"kx",
		"ky"
	]) t in e && I(e, [t]);
	e.algn !== void 0 && ![
		"tl",
		"t",
		"tr",
		"l",
		"ctr",
		"r",
		"bl",
		"b",
		"br"
	].includes(e.algn) && N(), e.rotWithShape !== void 0 && typeof e.rotWithShape != "boolean" && N();
}
function pe(e) {
	switch (e || N(), e.fillType) {
		case "none": return;
		case "solid":
			P(e.color) || N();
			return;
		case "pattern":
			(!P(e.fg) || !P(e.bg) || !e.preset) && N();
			return;
		case "gradient":
			(!Array.isArray(e.stops) || !e.stops.length || !["linear", "radial"].includes(e.gradType)) && N(), I(e, ["angle"]), e.path !== void 0 && ![
				"rect",
				"circle",
				"shape"
			].includes(e.path) && N(), e.flip !== void 0 && ![
				"none",
				"x",
				"y",
				"xy"
			].includes(e.flip) && N(), e.scaled !== void 0 && typeof e.scaled != "boolean" && N(), e.rotWithShape !== void 0 && typeof e.rotWithShape != "boolean" && N();
			for (let t of [e.fillToRect, e.tileRect]) if (t) for (let e of [
				"l",
				"t",
				"r",
				"b"
			]) e in t && I(t, [e]);
			for (let t of e.stops) (!t || !P(t.color)) && N(), I(t, ["position"], 0, 1);
			return;
		case "image":
			if (e.srcRect && I(e.srcRect, [
				"l",
				"t",
				"r",
				"b"
			]), e.fillRect) for (let t of [
				"l",
				"t",
				"r",
				"b"
			]) t in e.fillRect && I(e.fillRect, [t]);
			e.rotWithShape !== void 0 && typeof e.rotWithShape != "boolean" && N(), (!e.imagePath || !e.mimeType) && N(), e.tile != null == (e.stretch === !0) && N();
			return;
		default: N();
	}
}
function me(e, t) {
	switch ((!e || typeof e != "object") && N(), e.type) {
		case "grayscale":
		case "alphaCeiling":
		case "alphaFloor": return;
		case "biLevel":
		case "alphaBiLevel":
			I(e, ["thresh"], 0, 1);
			return;
		case "alphaModFix":
			I(e, ["amt"], 0);
			return;
		case "alphaRepl":
			I(e, ["alpha"], 0, 1);
			return;
		case "alphaInv":
			e.color !== void 0 && !P(e.color) && N();
			return;
		case "colorReplace":
			F(e.color) || N();
			return;
		case "colorChange":
			(!F(e.from) || !F(e.to) || typeof e.useAlpha != "boolean") && N(), I(e, ["fromAlpha", "toAlpha"], 0, 1);
			return;
		case "duotone": {
			let n = e.clr1 ?? t.duotone?.clr1, r = e.clr2 ?? t.duotone?.clr2;
			(!P(n) || !P(r)) && N();
			return;
		}
		case "luminance":
			I(e, ["bright", "contrast"], -1, 1);
			return;
		case "hsl":
			I(e, ["hue"]), I(e, ["sat", "lum"], -1, 1);
			return;
		case "tint":
			I(e, ["hue"]), I(e, ["amt"], -1, 1);
			return;
		case "blur":
			I(e, ["radius"], 0), typeof e.grow != "boolean" && N();
			return;
		case "alphaOutset":
			I(e, ["radius"]);
			return;
		case "softEdge":
			I(e, ["radius"], 0);
			return;
		case "relativeOffset":
			I(e, ["tx", "ty"]);
			return;
		case "transform":
			I(e, [
				"sx",
				"sy",
				"kx",
				"ky",
				"tx",
				"ty"
			]);
			return;
		case "glow":
			(!e.glow || !F(e.glow.color)) && N(), I(e.glow, ["radius"], 0), I(e.glow, ["alpha"], 0, 1);
			return;
		case "shadow":
			fe(e.shadow), e.inner && e.shadow.rotWithShape === !1 && N();
			return;
		case "presetShadow":
			(!Array.isArray(e.shadows) || e.shadows.length < 1 || e.shadows.length > 2) && N(), e.shadows.forEach(fe);
			return;
		case "reflection":
			e.reflection || N(), e.reflection.rotWithShape !== void 0 && typeof e.reflection.rotWithShape != "boolean" && N(), e.reflection.algn !== void 0 && ![
				"tl",
				"t",
				"tr",
				"l",
				"ctr",
				"r",
				"bl",
				"b",
				"br"
			].includes(e.reflection.algn) && N(), I(e.reflection, ["blur", "dist"], 0), I(e.reflection, [
				"stA",
				"stPos",
				"endA",
				"endPos"
			], 0, 1), I(e.reflection, [
				"dir",
				"sx",
				"sy"
			]);
			for (let t of [
				"kx",
				"ky",
				"fadeDir"
			]) t in e.reflection && I(e.reflection, [t]);
			return;
		case "fill":
			pe(e.fill);
			return;
		case "fillOverlay":
			pe(e.fill), de(e.blend) || N();
			return;
		case "blend":
			de(e.blend) || N();
			return;
		case "alphaMod":
		case "container": return;
		case "reference":
			(typeof e.reference != "string" || !e.reference) && N();
			return;
		case "definitions":
			I(e, ["work"], 0), Number.isSafeInteger(e.work) || N();
			return;
		case "unsupported":
		case "effectCountLimit": return;
		default: N();
	}
}
function he(e, t) {
	let n = e.frame ?? {
		x: 0,
		y: 0,
		width: e.width,
		height: e.height
	}, [r, i, a, o, s, c] = t, l = [
		[-n.x, -n.y],
		[e.width - n.x, -n.y],
		[-n.x, e.height - n.y],
		[e.width - n.x, e.height - n.y]
	].map(([e, t]) => [r * e + a * t + s, i * e + o * t + c]), u = Math.floor(Math.min(...l.map((e) => e[0]))), d = Math.floor(Math.min(...l.map((e) => e[1]))), f = Math.max(1, Math.ceil(Math.max(...l.map((e) => e[0]))) - u), p = Math.max(1, Math.ceil(Math.max(...l.map((e) => e[1]))) - d), m = f * p;
	if (![
		u,
		d,
		f,
		p,
		m
	].every(Number.isSafeInteger) || m > 134217728) throw new b("image-effect-work", g, Number.isSafeInteger(m) ? m : 2 ** 53 - 1);
	if (f > 32767 || p > 32767) throw new b("image-dimension", v, Math.max(f, p));
	if (m * 4 > 33554432) throw new b("image-pixels", y, m * 4);
	return {
		width: f,
		height: p,
		frame: {
			x: u === 0 ? 0 : -u,
			y: d === 0 ? 0 : -d,
			width: n.width,
			height: n.height
		}
	};
}
function ge(e, t) {
	let n = he(e, t), r = new Uint8ClampedArray(n.width * n.height * 4), [i, a, o, s, c, l] = t, u = i * s - a * o;
	if (u === 0) return {
		...n,
		data: r
	};
	let d = e.frame ?? {
		x: 0,
		y: 0
	};
	for (let t = 0; t < n.height; t++) for (let f = 0; f < n.width; f++) {
		let p = f + .5 - n.frame.x - c, m = t + .5 - n.frame.y - l, h = (s * p - o * m) / u + d.x - .5, g = (-a * p + i * m) / u + d.y - .5, _ = Math.floor(h), v = Math.floor(g), y = h - _, b = g - v, x = 0, S = 0, C = 0, w = 0;
		for (let t = 0; t < 2; t++) for (let n = 0; n < 2; n++) {
			let r = _ + n, i = v + t;
			if (r < 0 || i < 0 || r >= e.width || i >= e.height) continue;
			let a = (i * e.width + r) * 4, o = (n ? y : 1 - y) * (t ? b : 1 - b), s = e.data[a + 3] * o;
			x += e.data[a] * s, S += e.data[a + 1] * s, C += e.data[a + 2] * s, w += s;
		}
		let T = (t * n.width + f) * 4;
		r[T] = w ? Math.round(x / w) : 0, r[T + 1] = w ? Math.round(S / w) : 0, r[T + 2] = w ? Math.round(C / w) : 0, r[T + 3] = Math.round(w);
	}
	return {
		...n,
		data: r
	};
}
function _e(e, t) {
	let n = e.frame ?? {
		x: 0,
		y: 0,
		width: e.width,
		height: e.height
	}, r = t.frame ?? {
		x: 0,
		y: 0,
		width: t.width,
		height: t.height
	}, i = Math.max(n.x, r.x), a = Math.max(n.y, r.y), o = i + Math.max(e.width - n.x, t.width - r.x), s = a + Math.max(e.height - n.y, t.height - r.y);
	if (!(o <= 32767) || !(s <= 32767)) throw new b("image-dimension", v, Number.isFinite(Math.max(o, s)) ? Math.max(o, s) : 2 ** 53 - 1);
	return {
		width: o,
		height: s,
		frame: {
			x: i,
			y: a,
			width: n.width,
			height: n.height
		}
	};
}
function ve(e, t, n) {
	let r = t.frame ?? {
		x: 0,
		y: 0,
		width: t.width,
		height: t.height
	}, i = n.emuPerPixelX ?? 9525, a = n.emuPerPixelY ?? 9525, o = (e, t, n, r, i, a) => ({
		type: "transform",
		sx: e,
		sy: t,
		kx: n,
		ky: r,
		tx: i,
		ty: a
	}), s = (e) => {
		let t = e.algn ?? "b", s = t.endsWith("r") || t === "r" ? r.width : [
			"t",
			"ctr",
			"b"
		].includes(t) ? r.width / 2 : 0, c = t.startsWith("b") ? r.height : [
			"l",
			"ctr",
			"r"
		].includes(t) ? r.height / 2 : 0, l = e.sx ?? 1, u = Math.tan((e.ky ?? 0) * Math.PI / 180), d = Math.tan((e.kx ?? 0) * Math.PI / 180), f = e.sy ?? 1, [p, m] = R(e.dir, !1, n).map((t) => t * e.dist);
		if (e.rotWithShape === !1) {
			let [e, t] = R(n.hostRotation ?? 0, !1, { effects: [] }), r = n.hostFlipH ? -1 : 1, i = n.hostFlipV ? -1 : 1, a = e * (l * e + d * t) + t * (u * e + f * t), o = r * i * (-t * (l * e + d * t) + e * (u * e + f * t)), s = r * i * (e * (-l * t + d * e) + t * (-u * t + f * e)), c = -t * (-l * t + d * e) + e * (-u * t + f * e);
			[l, u, d, f] = [
				a,
				o,
				s,
				c
			], [p, m] = [r * (e * p + t * m), i * (-t * p + e * m)];
		}
		return o(l, f, Math.atan(d) * 180 / Math.PI, Math.atan(u) * 180 / Math.PI, p + s * (1 - l) * i - d * c * a, m + c * (1 - f) * a - u * s * i);
	};
	switch (e.type) {
		case "relativeOffset": return [o(1, 1, 0, 0, e.tx * t.width * i, e.ty * t.height * a)];
		case "glow": return [
			{
				type: "colorReplace",
				color: e.glow.color
			},
			{
				type: "alphaModFix",
				amt: e.glow.alpha
			},
			{
				type: "blur",
				radius: e.glow.radius,
				grow: !0
			}
		];
		case "shadow": return e.inner ? void 0 : [
			{
				type: "colorReplace",
				color: e.shadow.color
			},
			{
				type: "alphaModFix",
				amt: e.shadow.alpha
			},
			s(e.shadow),
			{
				type: "blur",
				radius: e.shadow.blur,
				grow: !0
			}
		];
		case "presetShadow": return [{
			type: "container",
			container: {
				kind: "sib",
				effects: e.shadows.map((e) => ({
					type: "shadow",
					shadow: {
						...e,
						rotWithShape: !1
					},
					inner: !1
				}))
			}
		}];
		case "softEdge": return e.radius === 0 ? [] : [{
			type: "alphaMod",
			container: {
				kind: "tree",
				effects: [{ type: "alphaCeiling" }, {
					type: "blur",
					radius: e.radius,
					grow: !1
				}]
			}
		}];
		default: return;
	}
}
function L(e, t, n) {
	if (e.type === "alphaOutset") return [
		{ type: "alphaCeiling" },
		{
			type: "blur",
			radius: Math.abs(e.radius),
			grow: e.radius > 0
		},
		{ type: e.radius >= 0 ? "alphaCeiling" : "alphaFloor" }
	];
	if (e.type === "shadow" && e.inner) {
		let [t, r] = R(e.shadow.dir, !1, n);
		return [{
			type: "blur",
			radius: e.shadow.blur,
			grow: !0
		}, {
			type: "transform",
			sx: 1,
			sy: 1,
			kx: 0,
			ky: 0,
			tx: e.shadow.dist * t,
			ty: e.shadow.dist * r
		}];
	}
	if (e.type === "reflection") {
		let r = e.reflection;
		return ve({
			type: "shadow",
			inner: !1,
			shadow: {
				...r,
				color: "000000",
				alpha: 1
			}
		}, t, n).slice(2);
	}
}
function R(e, t, n) {
	let r = t ? e - (n.hostRotation ?? 0) : e, i = (r / 90 % 4 + 4) % 4, [a, o] = Number.isInteger(i) ? [
		[1, 0],
		[0, 1],
		[-1, 0],
		[0, -1]
	][i] : [Math.cos(r * Math.PI / 180), Math.sin(r * Math.PI / 180)];
	return t && (n.hostFlipH && (a = -a), n.hostFlipV && (o = -o)), [a, o];
}
function ye(e, t, n, r, i, a, o) {
	let s = t < 0 ? 0 : e[t + 3] / 255, c = r < 0 ? 0 : n[r + 3] / 255, l = c + s * (1 - c);
	for (let u = 0; u < 3; u++) {
		let d = t < 0 ? 0 : e[t + u] / 255, f = r < 0 ? 0 : n[r + u] / 255, p = o === "darken" ? Math.min(d, f) : o === "lighten" ? Math.max(d, f) : o === "mult" ? d * f : o === "screen" ? d + f - d * f : f;
		i[a + u] = l > 0 ? Math.round(255 * ((1 - c) * s * d + (1 - s) * c * f + s * c * p) / l) : 0;
	}
	i[a + 3] = Math.round(l * 255);
}
function z() {
	throw new b("image-effect-work", g, 2 ** 53 - 1);
}
function B(...e) {
	e.every((e) => Number.isFinite(e) && Math.abs(e) <= 2 ** 53 - 1) || z();
}
function be(e, t, n, r, i = 0) {
	let a = e.tile, o = f(t);
	B(e.dpi ?? 96);
	let s = p(t) ?? {
		x: 0,
		y: 0,
		width: o.w,
		height: o.h
	}, c = e.srcRect, l = 1 - (c?.l ?? 0) - (c?.r ?? 0), u = 1 - (c?.t ?? 0) - (c?.b ?? 0);
	if (B(l, u), !(l > 0 && u > 0)) return null;
	let d = s.width * l, m = s.height * u, h = d * 72 / (e.dpi || 96) * (a.sx ?? 1), _ = m * 72 / (e.dpi || 96) * (a.sy ?? 1);
	B(h, _), h > 0 && _ > 0 || z();
	let v = 0, y = 0;
	if (e.rotWithShape === !1 && i !== 0) {
		B(i);
		let e = i * Math.PI / 180, t = Math.abs(Math.cos(e)), a = Math.abs(Math.sin(e));
		v = Math.max(0, (n * t + r * a - n) / 2), y = Math.max(0, (n * a + r * t - r) / 2);
	}
	let x = Math.ceil(Math.max(0, s.x, o.w - s.x - s.width) / d) + Math.ceil(v / h), S = Math.ceil(Math.max(0, s.y, o.h - s.y - s.height) / m) + Math.ceil(y / _), C = Math.ceil(n / h) + 2 + 2 * x, w = Math.ceil(r / _) + 2 + 2 * S, T = C * w;
	if (!Number.isSafeInteger(T) || T > 134217728) throw new b("image-effect-work", g, Number.isSafeInteger(T) ? T : 2 ** 53 - 1);
	let E = a.algn ?? "tl", D = E.endsWith("r") || E === "r" ? n - h : [
		"t",
		"ctr",
		"b"
	].includes(E) ? (n - h) / 2 : 0, ee = E.startsWith("b") ? r - _ : [
		"l",
		"ctr",
		"r"
	].includes(E) ? (r - _) / 2 : 0, O = D + (a.tx ?? 0) / 12700, k = ee + (a.ty ?? 0) / 12700;
	B(O, k);
	let te = Math.floor(-O / h) - x, ne = Math.floor(-k / _) - S;
	[te, ne].every(Number.isSafeInteger) || z();
	let re = (e, t) => {
		let n = e % t;
		return n > 0 ? n - t : n;
	}, A = re(O, h) - x * h, j = re(k, _) - S * _;
	return B(A + (C - 1) * h, j + (w - 1) * _), {
		cols: C,
		rows: w,
		work: T,
		overlap: (Math.ceil(o.w / d) + 1) * (Math.ceil(o.h / m) + 1),
		x0: te,
		y0: ne,
		px: A,
		py: j,
		tw: h,
		th: _
	};
}
function xe(e, t, n, r, i, o = 0) {
	let s = t.width * t.height;
	if (e.fillType === "none") return 0;
	if (e.fillType === "solid") return s;
	let c = s * 2;
	if (e.fillType === "image" && e.tile && i) {
		let l = i.images?.get(e);
		if (!l) throw new a("unsupported-image-effect", "Image fill source unavailable for work planning");
		let u = t.frame ?? {
			x: 0,
			y: 0,
			width: t.width,
			height: t.height
		}, d = be(e, l, u.width / (12700 / n), u.height / (12700 / r), o);
		d && (c += d.work + s * d.overlap);
	}
	return c;
}
function Se(e, t, n, r, i, o = 0) {
	if (e.fillType === "solid" || e.fillType === "none") {
		let n = new Uint8ClampedArray(t.width * t.height * 4);
		if (e.fillType === "solid") {
			let r = e.color.replace(/^#/, ""), i = [
				0,
				2,
				4
			].map((e) => parseInt(r.slice(e, e + 2), 16));
			i.push(r.length === 8 ? parseInt(r.slice(6), 16) : 255);
			let a = t.frame ?? {
				x: 0,
				y: 0,
				width: t.width,
				height: t.height
			};
			for (let e = 0; e < t.height; e++) for (let r = 0; r < t.width; r++) r + .5 < a.x || r + .5 >= a.x + a.width || e + .5 < a.y || e + .5 >= a.y + a.height || n.set(i, (e * t.width + r) * 4);
		}
		return {
			data: n,
			width: t.width,
			height: t.height
		};
	}
	let s = (i.offscreenFactory ?? O)(t.width, t.height), c = s?.getContext("2d");
	if (s && !c && (s.width = 0), !s || !c) throw new a("unsupported-image-effect", "Image fill surface unavailable");
	let l = t.frame ?? {
		x: 0,
		y: 0,
		width: t.width,
		height: t.height
	}, u = 12700 / n, d = 12700 / r, f = l.width / u, p = l.height / d;
	try {
		if (B(l.x, l.y, u, d, f, p), u > 0 && d > 0 && f >= 0 && p >= 0 || z(), c.translate(l.x, l.y), c.scale(u, d), e.fillType === "image") {
			let t = i.images?.get(e);
			if (!t) throw new a("unsupported-image-effect", "Image fill source unavailable");
			if (c.save(), c.beginPath(), c.rect(0, 0, f, p), c.clip(), e.rotWithShape === !1 && o !== 0 && (c.translate(f / 2, p / 2), c.rotate(-o * Math.PI / 180), c.translate(-f / 2, -p / 2)), e.alpha != null && (c.globalAlpha *= e.alpha), e.tile) {
				let n = e.tile, { cols: r, rows: i, x0: a, y0: s, px: l, py: u, tw: d, th: h } = be(e, t, f, p, o) ?? {
					cols: 0,
					rows: 0,
					x0: 0,
					y0: 0,
					px: 0,
					py: 0,
					tw: 0,
					th: 0
				};
				for (let o = 0; o < i; o++) for (let i = 0; i < r; i++) {
					let r = (n.flip === "x" || n.flip === "xy") && Math.abs((a % 2 + i) % 2) === 1, f = (n.flip === "y" || n.flip === "xy") && Math.abs((s % 2 + o) % 2) === 1;
					c.save(), c.translate(l + i * d, u + o * h), c.scale(r ? -1 : 1, f ? -1 : 1), m(c, t, e.srcRect, r ? -d : 0, f ? -h : 0, d, h), c.restore();
				}
			} else {
				let n = e.fillRect, r = (n?.l ?? 0) * f, i = (n?.t ?? 0) * p, a = f * (1 - (n?.l ?? 0) - (n?.r ?? 0)), o = p * (1 - (n?.t ?? 0) - (n?.b ?? 0));
				B(r, i, a, o, r + a, i + o), m(c, t, e.srcRect, r, i, a, o);
			}
			c.restore();
		} else {
			let t = e.fillType === "gradient" ? {
				...e,
				stops: [...e.stops]
			} : e, n = C(() => S(t, c, 0, 0, f, p, o, 1));
			if (!n || e.fillType === "pattern" && typeof n == "string") throw new a("unsupported-image-effect", "Malformed or unavailable image-effect fill brush");
			c.fillStyle = n, c.fillRect(0, 0, f, p);
		}
		return c.getImageData(0, 0, t.width, t.height);
	} finally {
		s.width = 0;
	}
}
function Ce(e, t, n, r, i) {
	let a = Math.ceil(n), o = Math.ceil(r), s = e + (i ? 2 * a : 0), c = t + (i ? 2 * o : 0), l = 2 * a + 2 * o + 2, u = s * c * (l + 2) + 2 * l, d = (l + 4) * Float64Array.BYTES_PER_ELEMENT, f = s * c;
	if (![
		s,
		c,
		f,
		u
	].every(Number.isSafeInteger) || u > 134217728) throw new b("image-effect-work", g, Number.isSafeInteger(u) ? u : 2 ** 53 - 1);
	if (s > 32767 || c > 32767) throw new b("image-dimension", v, Math.max(s, c));
	let p = (e * t + 2 * f) * 4 + d;
	if (p > 33554432 * 4) throw new b("active-decoded-bytes", y * 4, p);
	return {
		rx: a,
		ry: o,
		width: s,
		height: c,
		work: u,
		kernelBytes: d
	};
}
function we(e, t) {
	let n = new Float64Array(2 * t + 1);
	if (e === 0) return n[0] = 1, n;
	let r = 0;
	for (let i = -t; i <= t; i++) {
		let a = Math.exp(-.5 * (i / (e / 3)) ** 2);
		n[i + t] = a, r += a;
	}
	for (let e = 0; e < n.length; e++) n[e] /= r;
	return n;
}
function Te(e, t, n, r) {
	if (t === 0 && n === 0) return e;
	let { rx: i, ry: a, width: o, height: s } = Ce(e.width, e.height, t, n, r), c = r ? i : 0, l = r ? a : 0, u = we(t, i), d = we(n, a), f = new Uint8ClampedArray(o * s * 4), p = new Uint8ClampedArray(f.length), m = new Float64Array(4);
	for (let t = 0; t < s; t++) for (let n = 0; n < o; n++) {
		let r = t - l;
		if (r < 0 || r >= e.height) continue;
		m.fill(0);
		for (let t = -i; t <= i; t++) {
			let a = n - c + t;
			if (a < 0 || a >= e.width) continue;
			let o = (r * e.width + a) * 4, s = u[t + i], l = e.data[o + 3] / 255;
			for (let t = 0; t < 3; t++) m[t] += e.data[o + t] * l * s;
			m[3] += e.data[o + 3] * s;
		}
		let a = (t * o + n) * 4;
		for (let e = 0; e < 4; e++) f[a + e] = Math.round(m[e]);
	}
	for (let e = 0; e < s; e++) for (let t = 0; t < o; t++) {
		m.fill(0);
		for (let n = -a; n <= a; n++) {
			let r = e + n;
			if (r < 0 || r >= s) continue;
			let i = (r * o + t) * 4, c = d[n + a];
			for (let e = 0; e < 4; e++) m[e] += f[i + e] * c;
		}
		let n = (e * o + t) * 4, r = m[3];
		for (let e = 0; e < 3; e++) p[n + e] = r > 0 ? Math.round(m[e] * 255 / r) : 0;
		p[n + 3] = Math.round(r);
	}
	let h = e.frame ?? {
		x: 0,
		y: 0,
		width: e.width,
		height: e.height
	};
	return {
		data: p,
		width: o,
		height: s,
		frame: {
			...h,
			x: h.x + c,
			y: h.y + l
		}
	};
}
function Ee(e) {
	return typeof e == "object" && !!e && Array.isArray(e.effects);
}
function De(e) {
	let t = [];
	for (let n of V(e, !1)) (n.type === "fillOverlay" || n.type === "fill") && n.fill.fillType === "image" && t.push(n.fill);
	return t;
}
function Oe(e) {
	let t = ke(e, 1, 1);
	return t === null || t.x > 0 || t.y > 0;
}
function ke(e, t, n) {
	let r = 0, i = 0, a = (e) => Number.isFinite(e) ? Math.abs(e) : Infinity;
	for (let o of V(e, !1)) switch (o.type) {
		case "blur":
			o.grow && (r += a(o.radius), i += a(o.radius));
			break;
		case "alphaOutset":
			o.radius > 0 && (r += a(o.radius), i += a(o.radius));
			break;
		case "glow":
			r += a(o.glow.radius), i += a(o.glow.radius);
			break;
		case "shadow":
			if (!o.inner) {
				let e = o.shadow;
				if ((e.sx ?? 1) !== 1 || (e.sy ?? 1) !== 1 || (e.kx ?? 0) !== 0 || (e.ky ?? 0) !== 0) return null;
				let t = a(e.dist) + a(e.blur);
				r += t, i += t;
			}
			break;
		case "presetShadow":
			for (let e of o.shadows) {
				if ((e.sx ?? 1) !== 1 || (e.sy ?? 1) !== 1 || (e.kx ?? 0) !== 0 || (e.ky ?? 0) !== 0) return null;
				let t = a(e.dist) + a(e.blur);
				r += t, i += t;
			}
			break;
		case "reflection": {
			let e = o.reflection;
			if (Math.abs(e.sx ?? 1) > 1 || Math.abs(e.sy ?? -1) > 1 || (e.kx ?? 0) !== 0 || (e.ky ?? 0) !== 0) return null;
			let s = a(e.dist ?? 0) + a(e.blur ?? 0);
			r += t + s, i += n + s;
			break;
		}
		case "relativeOffset":
			if (o.tx !== 0 || o.ty !== 0) return null;
			break;
		case "transform": return null;
		case "reference":
		case "definitions": return null;
		default: break;
	}
	if (r > 0 || i > 0) {
		let a = 0;
		for (let t of V(e, !1)) [
			"blur",
			"alphaOutset",
			"glow",
			"shadow",
			"presetShadow",
			"reflection"
		].includes(t.type) && a++;
		r += a * t, i += a * n;
	}
	let o = Math.max(r, i);
	return Number.isFinite(o) ? {
		x: o,
		y: o
	} : null;
}
function* V(e, t = !0) {
	let n = [{
		list: e,
		index: 0
	}], r = /* @__PURE__ */ new Set(), i = 0;
	for (; n.length;) {
		let e = n[n.length - 1];
		if (e.index === 0) {
			if (!Array.isArray(e.list)) throw new a("unsupported-image-effect", "Invalid effect list");
			if (r.has(e.list)) throw new a("unsupported-image-effect", "Cyclic effect or image fill");
			r.add(e.list);
		}
		if (e.index === e.list.length) {
			r.delete(e.list), n.pop();
			continue;
		}
		if (++i > _) throw new b("image-effect-count", _, i);
		let o = e.list[e.index++];
		if (!o || typeof o != "object") throw new a("unsupported-image-effect", "Invalid effect node");
		let s = o.type === "definitions" ? o.containers : o.type === "alphaMod" || o.type === "container" || o.type === "blend" ? [o.container] : [];
		if (!Array.isArray(s) || s.length > _) throw new a("unsupported-image-effect", "Invalid effect definitions");
		for (let e = s.length - 1; e >= 0; e--) {
			let t = s[e];
			if (!t || !["tree", "sib"].includes(t.kind)) throw new a("unsupported-image-effect", "Invalid effect container");
			n.push({
				list: t.effects,
				index: 0
			});
		}
		if (o.type === "fillOverlay" || o.type === "fill") {
			if (!o.fill) throw new a("unsupported-image-effect", "Invalid effect fill");
			t && o.fill.fillType === "image" && o.fill.blipEffects && n.push({
				list: o.fill.blipEffects,
				index: 0
			});
		}
		yield o;
	}
}
function Ae(e) {
	Ie(e, 0);
	try {
		return JSON.stringify([
			e.effects,
			e.duotone ?? null,
			e.emuPerPixelX ?? null,
			e.emuPerPixelY ?? null,
			e.hostRotation ?? 0,
			e.hostFlipH ?? !1,
			e.hostFlipV ?? !1
		], (e, t) => {
			if (typeof t == "number" && !Number.isFinite(t)) throw new a("unsupported-image-effect", "Non-finite image effect parameter");
			return t;
		});
	} catch (e) {
		throw e instanceof a ? e : new a("unsupported-image-effect", "Image effect recipe is not serializable");
	}
}
function je(e, t, n) {
	return (.2126 * e + .7152 * t + .0722 * n) / 255;
}
function Me(e, t, n) {
	return Math.floor(je(e, t, n) * 255 + 1e-6);
}
function Ne(e, t, n, r) {
	e.duotone && me({ type: "duotone" }, e);
	let i = Pe(e.effects, e), o = {
		width: n?.width ?? t,
		height: n?.height ?? 1,
		frame: n?.frame,
		pixels: t
	}, s = /* @__PURE__ */ new Set(), c = 0, l = 0, u = /* @__PURE__ */ new Set();
	for (let t of e.effects) if (t.type === "definitions") {
		if (!Number.isSafeInteger(t.work) || t.work < 0) throw new a("unsupported-image-effect", "Invalid effect-definition work record");
		l += t.work, u.add(t);
	}
	if (l > 134217728) throw new b("image-effect-work", g, l);
	let d = (t, f) => {
		let { width: p, height: m, pixels: h, frame: g } = f, v = h;
		for (let f of t) {
			if (f.type === "effectCountLimit") throw Number.isSafeInteger(f.observed) && f.observed > _ ? new b("image-effect-count", _, f.observed) : new a("unsupported-image-effect", "Invalid effect-count record");
			if (++c > _) throw new b("image-effect-count", _, c);
			if (f.type === "definitions") {
				u.has(f) || (l += f.work, u.add(f));
				continue;
			}
			if (f.type === "unsupported") throw new a("unsupported-image-effect", `Malformed CT_Blip effect: ${f.effect}`);
			l += h, f.type === "luminance" && (l += 256);
			let t = ve(f, {
				width: p,
				height: m,
				frame: g
			}, e);
			if (t) {
				let e = d(t, {
					width: p,
					height: m,
					frame: g,
					pixels: h
				});
				v = Math.max(v, e.peak), p = e.width, m = e.height, h = e.pixels, g = e.frame;
			} else if (f.type === "transform" && h > 0) {
				let t = he({
					width: p,
					height: m,
					frame: g
				}, Be(f, e));
				v = Math.max(v, h + t.width * t.height), p = t.width, m = t.height, g = t.frame, h = p * m, l += h * 5;
			} else if (L(f, {
				width: p,
				height: m,
				frame: g
			}, e) && h > 0) {
				let t = d(L(f, {
					width: p,
					height: m,
					frame: g
				}, e), {
					width: p,
					height: m,
					frame: g,
					pixels: h
				});
				v = Math.max(v, h + t.peak), l += h * 3 + t.pixels, f.type !== "shadow" && (p = t.width, m = t.height, g = t.frame, h = t.pixels);
			} else if (f.type === "blur" && f.radius !== 0 && h > 0) {
				let t = h, n = Ce(p, m, f.radius / (e.emuPerPixelX ?? 9525), f.radius / (e.emuPerPixelY ?? 9525), f.grow), r = g ?? {
					x: 0,
					y: 0,
					width: p,
					height: m
				};
				g = {
					...r,
					x: r.x + (f.grow ? n.rx : 0),
					y: r.y + (f.grow ? n.ry : 0)
				}, p = n.width, m = n.height, h = p * m, l += n.work, v = Math.max(v, t + h * 2 + n.kernelBytes / 4);
			} else if (f.type === "alphaMod" || f.type === "container" || f.type === "blend" || f.type === "reference") {
				let e = f.type === "reference" ? i.get(f.reference) : f.container;
				if (!e) {
					if (f.type !== "reference" || ![
						"fill",
						"fillLine",
						"line",
						"children"
					].includes(f.reference)) throw new a("unsupported-image-effect", "Invalid effect container reference");
					f.reference === "fill" || f.reference === "fillLine" ? (v = Math.max(v, h + o.pixels), l += o.pixels, {width: p, height: m, frame: g, pixels: h} = o) : v = Math.max(v, h * 2);
					continue;
				}
				if (s.has(e)) throw new a("unsupported-image-effect", "Cyclic effect container");
				if (s.add(e), e.kind !== "tree" && e.kind !== "sib") throw new a("unsupported-image-effect", "Invalid effect container kind");
				l += h * (e.kind === "tree" ? 1 : e.effects.length);
				let t = e.kind === "tree" ? [d(e.effects, {
					width: p,
					height: m,
					frame: g,
					pixels: h
				})] : e.effects.map((e) => d([e], {
					width: p,
					height: m,
					frame: g,
					pixels: h
				})), r = {
					width: p,
					height: m,
					frame: g
				};
				for (let n of t) {
					let t = r.width * r.height, i = e.kind === "tree" ? n : _e(r, n), a = i.width * i.height, o = i.width !== r.width || i.height !== r.height || (i.frame?.x ?? 0) !== (r.frame?.x ?? 0) || (i.frame?.y ?? 0) !== (r.frame?.y ?? 0);
					v = Math.max(v, h + n.peak + (e.kind === "sib" ? t : 0)), e.kind === "sib" && (l += a, v = Math.max(v, h + t + n.pixels + (o ? a : 0))), r = {
						width: i.width,
						height: i.height,
						frame: i.frame
					};
				}
				if (f.type !== "alphaMod") {
					if (f.type === "blend") {
						let e = _e({
							width: p,
							height: m,
							frame: g
						}, r);
						l += e.width * e.height, v = Math.max(v, h + r.width * r.height + e.width * e.height), r = e;
					}
					p = r.width, m = r.height, g = r.frame, h = n ? p * m : h;
				}
				s.delete(e);
			} else (f.type === "fillOverlay" || f.type === "fill") && (v = Math.max(v, h * 3 + x(f.fill) / 4), l += ze(f.fill, {
				width: p,
				height: m,
				frame: g
			}, e, r));
		}
		return {
			count: c,
			work: l,
			width: p,
			height: m,
			frame: g,
			pixels: h,
			peak: v
		};
	}, f = d(e.effects, o);
	e.duotone && !e.effects.some((e) => e.type === "duotone") && (f.count++, f.work += f.pixels);
	let p = f.peak > t || f.pixels !== t;
	return H(e.effects) && (f.peak += t, f.work += t), f.peak = Math.max(f.peak, f.pixels * 3), f.peak += t * (p ? 2 : 1), f;
}
function Pe(e, t) {
	for (let e of [t.emuPerPixelX ?? 9525, t.emuPerPixelY ?? 9525]) if (!Number.isFinite(e) || e <= 0) throw new a("unsupported-image-effect", "Invalid effect sampling");
	if (!Number.isFinite(t.hostRotation ?? 0) || [t.hostFlipH, t.hostFlipV].some((e) => e !== void 0 && typeof e != "boolean")) throw new a("unsupported-image-effect", "Invalid host orientation");
	let n = /* @__PURE__ */ new Map(), r = (e) => {
		if (e.name) {
			let t = n.get(e.name);
			if (t && t !== e) throw new a("unsupported-image-effect", "Duplicate effect container name");
			n.set(e.name, e);
		}
	};
	for (let n of V(e)) {
		if (me(n, t), n.type === "unsupported") throw new a("unsupported-image-effect", `Malformed CT_Blip effect: ${n.effect}`);
		if (n.type === "effectCountLimit") throw Number.isSafeInteger(n.observed) && n.observed > _ ? new b("image-effect-count", _, n.observed) : new a("unsupported-image-effect", "Invalid effect-count record");
	}
	for (let t of V(e, !1)) if (t.type === "definitions") for (let e of t.containers) r(e);
	else (t.type === "alphaMod" || t.type === "container" || t.type === "blend") && r(t.container);
	return n;
}
function Fe(e, t, n, r = {}) {
	return Ne(e, t * n, {
		width: t,
		height: n
	}, r).work;
}
function H(e, t = /* @__PURE__ */ new Set()) {
	for (let n of e) {
		if (n.type === "definitions") {
			for (let e of n.containers) if (!t.has(e) && (t.add(e), H(e.effects, t))) return !0;
		}
		if (n.type === "reference" && ["fill", "fillLine"].includes(n.reference) || (n.type === "alphaMod" || n.type === "container" || n.type === "blend") && !t.has(n.container) && (t.add(n.container), H(n.container.effects, t))) return !0;
	}
	return !1;
}
function Ie(e, t, n, r = 0) {
	let i = Ne(e, t, n);
	if (i.count > _) throw new b("image-effect-count", _, i.count);
	if (!Number.isSafeInteger(i.work) || i.work > 134217728) throw new b("image-effect-work", g, Number.isSafeInteger(i.work) ? i.work : 2 ** 53 - 1);
	if (n && i.peak + r > 33554432) throw new b("active-decoded-bytes", y * 4, Math.ceil((i.peak + r) * 4));
}
function Le(e, t, n = {}) {
	let r = e.data, i = 0;
	for (let e of new Set(n.images?.values())) {
		if (e === n.baseImage) continue;
		let t = e;
		i += t.width * t.height;
	}
	Ie(t, r.length / 4, e, i);
	let a = Ne(t, e.width * e.height, e, n).work;
	if (!Number.isSafeInteger(a) || a > 134217728) throw new b("image-effect-work", g, Number.isSafeInteger(a) ? a : 2 ** 53 - 1);
	let o = new ue(Math.min(a, g)), s = {
		names: Pe(t.effects, t),
		chargedDefinitions: /* @__PURE__ */ new Set(),
		charge: (e) => {
			o.charge(e), n.workLedger?.charge(e);
		}
	};
	try {
		return H(t.effects) && (s.original = W(e, s)), U(e, t, n, s);
	} catch (e) {
		throw w(e);
	}
}
function U(e, t, n, r) {
	let i = e.data, o = !1;
	for (let s of t.effects) {
		if (s.type === "definitions") {
			r.chargedDefinitions.has(s) || (r.charge(s.work), r.chargedDefinitions.add(s));
			continue;
		}
		r.charge(e.width * e.height);
		let c = ve(s, e, t);
		if (c) {
			e = U(e, {
				...t,
				effects: c,
				duotone: void 0
			}, n, r), i = e.data;
			continue;
		}
		switch (s.type) {
			case "effectCountLimit": break;
			case "transform": {
				let n = he(e, Be(s, t));
				r.charge(n.width * n.height * 5), e = ge(e, Be(s, t)), i = e.data;
				break;
			}
			case "alphaOutset": {
				let a = U(W(e, r), {
					...t,
					duotone: void 0,
					effects: L(s, e, t)
				}, n, r);
				r.charge(e.width * e.height * 2 + a.width * a.height);
				for (let t = 0; t < a.height; t++) for (let n = 0; n < a.width; n++) {
					let r = (t * a.width + n) * 4, i = Ue(e, a, n, t);
					for (let e = 0; e < 3; e++) a.data[r + e] = i[e];
				}
				e = a, i = e.data;
				break;
			}
			case "reflection": {
				let a = s.reflection, o = W(e, r);
				r.charge(e.width * e.height * 2);
				let [c, l] = R(a.fadeDir ?? 90, a.rotWithShape === !1, t), u = o.width * (t.emuPerPixelX ?? 9525), d = o.height * (t.emuPerPixelY ?? 9525), f = Math.min(0, c * u) + Math.min(0, l * d), p = Math.abs(c * u) + Math.abs(l * d);
				for (let e = 0; e < o.height; e++) for (let t = 0; t < o.width; t++) {
					let n = ((t + .5) / o.width * u * c + (e + .5) / o.height * d * l - f) / p, r = a.endPos === a.stPos ? +(n >= a.endPos) : Math.max(0, Math.min(1, (n - a.stPos) / (a.endPos - a.stPos))), i = (e * o.width + t) * 4 + 3;
					o.data[i] = Math.round(o.data[i] * (a.stA + (a.endA - a.stA) * r));
				}
				e = U(o, {
					...t,
					duotone: void 0,
					effects: L(s, e, t)
				}, n, r), r.charge(e.width * e.height), i = e.data;
				break;
			}
			case "shadow": {
				let a = s.shadow, o = U(W(e, r), {
					...t,
					duotone: void 0,
					effects: L(s, e, t)
				}, n, r);
				r.charge(e.width * e.height * 2 + o.width * o.height);
				let c = T(a.color) ?? [
					0,
					0,
					0
				];
				for (let t = 0; t < e.height; t++) for (let n = 0; n < e.width; n++) {
					let r = (t * e.width + n) * 4, s = G(o, e, n, t);
					i[r + 3] = Math.round(i[r + 3] * a.alpha * (1 - (s < 0 ? 0 : o.data[s + 3]) / 255));
					for (let e = 0; e < 3; e++) i[r + e] = c[e];
				}
				break;
			}
			case "fill":
				r.charge(ze(s.fill, e, t, n));
				{
					let r = Se(s.fill, e, t.emuPerPixelX ?? 9525, t.emuPerPixelY ?? 9525, n, Re(t));
					e = {
						data: r.data,
						width: r.width,
						height: r.height,
						frame: e.frame
					}, i = e.data;
					break;
				}
			case "glow":
			case "relativeOffset":
			case "softEdge":
			case "presetShadow": break;
			case "alphaMod": {
				let a = K(e, s.container, t, n, r);
				for (let t = 0; t < e.height; t++) for (let n = 0; n < e.width; n++) {
					let r = G(a, e, n, t), o = r < 0 ? 0 : a.data[r + 3], s = (t * e.width + n) * 4 + 3;
					i[s] = Math.round(i[s] * o / 255);
				}
				break;
			}
			case "blend":
			case "container":
				e = s.type === "blend" ? Ve(e, K(e, s.container, t, n, r), s.blend, r) : K(e, s.container, t, n, r), i = e.data;
				break;
			case "reference": {
				let a = r.names.get(s.reference);
				e = a ? K(e, a, t, n, r) : ["fill", "fillLine"].includes(s.reference) ? W(r.original ?? e, r) : {
					width: e.width,
					height: e.height,
					frame: e.frame,
					data: new Uint8ClampedArray(i.length)
				}, i = e.data;
				break;
			}
			case "fillOverlay": {
				r.charge(ze(s.fill, e, t, n));
				let a = Se(s.fill, e, t.emuPerPixelX ?? 9525, t.emuPerPixelY ?? 9525, n, Re(t));
				for (let e = 0; e < i.length; e += 4) ye(i, e, a.data, e, i, e, s.blend);
				break;
			}
			case "blur":
				s.radius !== 0 && r.charge(Ce(e.width, e.height, s.radius / (t.emuPerPixelX ?? 9525), s.radius / (t.emuPerPixelY ?? 9525), s.grow).work), e = Te(e, s.radius / (t.emuPerPixelX ?? 9525), s.radius / (t.emuPerPixelY ?? 9525), s.grow), i = e.data;
				break;
			case "grayscale":
				for (let e = 0; e < i.length; e += 4) {
					let t = Me(i[e], i[e + 1], i[e + 2]);
					i[e] = t, i[e + 1] = t, i[e + 2] = t;
				}
				break;
			case "biLevel":
				for (let e = 0; e < i.length; e += 4) {
					let t = je(i[e], i[e + 1], i[e + 2]) >= s.thresh ? 255 : 0;
					i[e] = t, i[e + 1] = t, i[e + 2] = t;
				}
				break;
			case "colorChange": {
				let e = T(s.from), t = T(s.to);
				if (!e || !t) break;
				let n = Math.round(s.fromAlpha * 255), r = Math.round(s.toAlpha * 255);
				for (let a = 0; a < i.length; a += 4) i[a] !== e[0] || i[a + 1] !== e[1] || i[a + 2] !== e[2] || s.useAlpha && i[a + 3] !== n || (i[a] = t[0], i[a + 1] = t[1], i[a + 2] = t[2], i[a + 3] = r);
				break;
			}
			case "luminance": {
				r.charge(256);
				let e = We(s.bright, s.contrast);
				for (let t = 0; t < i.length; t += 4) i[t] = e[i[t]], i[t + 1] = e[i[t + 1]], i[t + 2] = e[i[t + 2]];
				break;
			}
			case "hsl":
			case "tint": {
				let e = s.type === "tint" ? k(s.hue, 1, .5) : void 0, t = [
					0,
					0,
					0
				], n = [
					0,
					0,
					0
				];
				for (let r = 0; r < i.length; r += 4) if (s.type === "hsl") {
					t[0] = i[r], t[1] = i[r + 1], t[2] = i[r + 2];
					let [e, a, o] = ee(t, n);
					k(e + s.hue, Math.max(0, Math.min(1, a * (1 + s.sat))), Math.max(0, Math.min(1, o * (1 + s.lum))), t);
					for (let e = 0; e < 3; e++) i[r + e] = Math.round(t[e]);
				} else for (let t = 0; t < 3; t++) i[r + t] = E(i[r + t], e[t], s.amt);
				break;
			}
			case "alphaBiLevel":
			case "alphaCeiling":
			case "alphaFloor":
			case "alphaInv":
			case "alphaModFix":
			case "alphaRepl": {
				let e = s.type === "alphaInv" && s.color ? T(s.color.slice(0, 6)) : null;
				for (let t = 3; t < i.length; t += 4) {
					let n = i[t];
					switch (s.type) {
						case "alphaBiLevel":
							i[t] = n / 255 >= s.thresh ? 255 : 0;
							break;
						case "alphaCeiling":
							i[t] = n > 0 ? 255 : 0;
							break;
						case "alphaFloor":
							i[t] = n < 255 ? 0 : 255;
							break;
						case "alphaInv": {
							let r = e;
							r && (i[t - 3] = r[0], i[t - 2] = r[1], i[t - 1] = r[2]), i[t] = 255 - n;
							break;
						}
						case "alphaModFix":
							i[t] = Math.min(255, Math.max(0, Math.round(n * s.amt)));
							break;
						case "alphaRepl":
							i[t] = Math.round(255 * s.alpha);
							break;
					}
				}
				break;
			}
			case "colorReplace": {
				let e = T(s.color);
				if (!e) throw new a("unsupported-image-effect", "Invalid CT_Blip replacement color");
				for (let t = 0; t < i.length; t += 4) i[t] = e[0], i[t + 1] = e[1], i[t + 2] = e[2];
				break;
			}
			case "unsupported": break;
			case "duotone":
				s.clr1 && s.clr2 ? D(e, s.clr1, s.clr2) : t.duotone && D(e, t.duotone.clr1, t.duotone.clr2), o = !0;
				break;
		}
	}
	return !o && t.duotone && (r.charge(e.width * e.height), D(e, t.duotone.clr1, t.duotone.clr2)), e;
}
function Re(e) {
	let t = e.hostRotation ?? 0;
	return (e.hostFlipH ?? !1) === (e.hostFlipV ?? !1) ? t : -t;
}
function ze(e, t, n, r) {
	let i = t.width * t.height > 0 ? xe(e, t, n.emuPerPixelX ?? 9525, n.emuPerPixelY ?? 9525, r, Re(n)) + x(e) : 0;
	return e.fillType === "gradient" && (i += 2 * e.stops.length * (1 + Math.max(1, Math.ceil(Math.log2(e.stops.length))))), i;
}
function Be(e, t) {
	let n = t.emuPerPixelX ?? 9525, r = t.emuPerPixelY ?? 9525;
	return [
		e.sx,
		Math.tan(e.ky * Math.PI / 180) * n / r,
		Math.tan(e.kx * Math.PI / 180) * r / n,
		e.sy,
		e.tx / n,
		e.ty / r
	];
}
function Ve(e, t, n, r) {
	let i = _e(e, t);
	r.charge(i.width * i.height);
	let a = e.frame, o = i.width === e.width && i.height === e.height && i.frame.x === (a?.x ?? 0) && i.frame.y === (a?.y ?? 0) ? e.data : new Uint8ClampedArray(i.width * i.height * 4), s = {
		...i,
		data: o
	};
	for (let r = 0; r < i.height; r++) for (let a = 0; a < i.width; a++) ye(e.data, G(e, s, a, r), t.data, G(t, s, a, r), o, (r * i.width + a) * 4, n);
	return s;
}
function W(e, t) {
	return t.charge(e.width * e.height), {
		width: e.width,
		height: e.height,
		frame: e.frame,
		data: new Uint8ClampedArray(e.data)
	};
}
function G(e, t, n, r) {
	let i = e.frame ?? {
		x: 0,
		y: 0
	}, a = t.frame ?? {
		x: 0,
		y: 0
	}, o = n + i.x - a.x, s = r + i.y - a.y;
	return o < 0 || s < 0 || o >= e.width || s >= e.height ? -1 : (s * e.width + o) * 4;
}
var He = [
	0,
	0,
	0,
	0
];
function Ue(e, t, n, r) {
	let i = G(e, t, n, r);
	return i < 0 ? He : e.data.subarray(i, i + 4);
}
function K(e, t, n, r, i) {
	if (t.kind === "tree") return U(W(e, i), {
		...n,
		duotone: void 0,
		effects: t.effects
	}, r, i);
	let a = {
		width: e.width,
		height: e.height,
		frame: e.frame,
		data: new Uint8ClampedArray(e.data.length)
	};
	for (let o of t.effects) {
		let t = U(W(e, i), {
			...n,
			duotone: void 0,
			effects: [o]
		}, r, i);
		a = Ve(a, t, "over", i);
	}
	return a;
}
function We(e, t) {
	let n = new Uint8ClampedArray(256), r = Math.max(-1, Math.min(1, e)), i = Math.max(-1, Math.min(1, t));
	for (let e = 0; e < 256; e++) {
		let t = e / 255 + r / 2 - .5, a;
		a = i >= 1 ? t > 0 ? 1 : t < 0 ? 0 : .5 + r / 2 : (i <= 0 ? 1 + i : 1 / (1 - i)) * t + .5 + r / 2, n[e] = Math.round(Math.max(0, Math.min(1, a)) * 255);
	}
	return n;
}
var Ge = {
	"&": "&amp;",
	"<": "&lt;",
	">": "&gt;",
	"\"": "&quot;"
}, q = (e) => e.replace(/[&<>"]/g, (e) => Ge[e]);
function Ke(e, t = "roman") {
	if (t === "double-struck" || t === "monospace") return t;
	if (t === "fraktur") return e === "bold" || e === "boldItalic" ? "bold-fraktur" : "fraktur";
	if (t === "script") return e === "bold" || e === "boldItalic" ? "bold-script" : "script";
	if (t === "sans-serif") switch (e) {
		case "roman": return "sans-serif";
		case "italic": return "sans-serif-italic";
		case "bold": return "bold-sans-serif";
		case "boldItalic": return "sans-serif-bold-italic";
	}
	switch (e) {
		case "roman": return "normal";
		case "bold": return "bold";
		case "boldItalic": return "bold-italic";
		case "italic": return null;
	}
}
var qe = new Set([..."⏞⏟⎴⎵︷︸⏜⏝{}[]()¯_‾"]), Je = "+−±∓×÷·∗⋅∘∙*/", Ye = "=≠<>≤≥≈≡∼≅≃→←↔⇒∈∉⊂⊆⊃⊇∝≪≫⊥≔", Xe = "([{⟨⌈⌊", Ze = ")]}⟩⌉⌋", Qe = ",;";
function $e(e, t, n) {
	let r = Ke(t, n), i = r ? ` mathvariant="${r}"` : "", a = "", o = "", s = () => {
		o &&= (a += `<mn${i}>${q(o)}</mn>`, "");
	};
	for (let t of e) {
		if (t === " ") {
			s();
			continue;
		}
		if (t >= "0" && t <= "9") {
			o += t;
			continue;
		}
		s(), Je.includes(t) || Ye.includes(t) || Qe.includes(t) ? a += `<mo>${q(t)}</mo>` : Xe.includes(t) || Ze.includes(t) ? a += `<mo fence="true" stretchy="false">${q(t)}</mo>` : a += `<mi${i}>${q(t)}</mi>`;
	}
	return s(), a;
}
function J(e) {
	return e.map(et).join("");
}
function Y(e) {
	return `<mrow>${J(e)}</mrow>`;
}
function et(e) {
	switch (e.kind) {
		case "run": return $e(e.text, e.style, e.__script);
		case "group": return Y(e.items);
		case "fraction": return `<mfrac${e.bar === !1 ? " linethickness=\"0\"" : ""}>${Y(e.num)}${Y(e.den)}</mfrac>`;
		case "sup": return `<msup>${Y(e.base)}${Y(e.sup ?? [])}</msup>`;
		case "sub": return `<msub>${Y(e.base)}${Y(e.sub ?? [])}</msub>`;
		case "subSup": return `<msubsup>${Y(e.base)}${Y(e.sub ?? [])}${Y(e.sup ?? [])}</msubsup>`;
		case "nary": return lt(e);
		case "delimiter": return ut(e);
		case "radical": return e.index && e.index.length ? `<mroot>${Y(e.radicand)}${Y(e.index)}</mroot>` : `<msqrt>${J(e.radicand)}</msqrt>`;
		case "limit": return ot(e);
		case "array": return st(e);
		case "groupChr": {
			let t = Y(e.base), n = qe.has(e.char), r = e.pos === "top" ? "mover" : "munder", i = `<mo stretchy="${n}">${q(e.char)}</mo>`;
			return n ? `<${r}>${t}${i}</${r}>` : `<${r} accent="true">${t}${i}</${r}>`;
		}
		case "bar": {
			let t = Y(e.base), n = "<mo stretchy=\"true\">&#x2015;</mo>";
			return e.pos === "bot" ? `<munder>${t}${n}</munder>` : `<mover>${t}${n}</mover>`;
		}
		case "accent": return at(e);
		case "func": return `<mrow>${Y(e.name)}<mo>&#x2061;</mo>${Y(e.arg)}</mrow>`;
		case "phant": return tt(e);
		case "sPre": return `<mmultiscripts>${Y(e.base)}<mprescripts/>${Y(e.sub)}${Y(e.sup)}</mmultiscripts>`;
		case "box": return Y(e.base);
		case "borderBox": return nt(e);
	}
}
function tt(e) {
	let t = e.show ? J(e.base) : `<mphantom>${J(e.base)}</mphantom>`, n = [];
	return e.zeroWid && n.push("width=\"0\""), e.zeroAsc && n.push("height=\"0\""), e.zeroDesc && n.push("depth=\"0\""), n.length ? `<mpadded ${n.join(" ")}>${t}</mpadded>` : `<mrow>${t}</mrow>`;
}
function nt(e) {
	let t = [], n = !e.hideTop, r = !e.hideBot, i = !e.hideLeft, a = !e.hideRight;
	n && r && i && a ? t.push("box") : (n && t.push("top"), r && t.push("bottom"), i && t.push("left"), a && t.push("right")), e.strikeH && t.push("horizontalstrike"), e.strikeV && t.push("verticalstrike"), e.strikeBltr && t.push("updiagonalstrike"), e.strikeTlbr && t.push("downdiagonalstrike");
	let o = J(e.base);
	return t.length ? `<menclose notation="${t.join(" ")}">${o}</menclose>` : `<mrow>${o}</mrow>`;
}
var rt = {
	"̀": "`",
	"́": "´",
	"̂": "^",
	"̃": "~",
	"̆": "˘",
	"̇": "˙",
	"̈": "¨",
	"̌": "ˇ",
	"⃗": "→",
	"⃖": "←"
}, it = new Set([
	"̅",
	"̄",
	"¯",
	"‾",
	"̲",
	"̳"
]);
function at(t) {
	let n = Y(t.base);
	if (it.has(t.char)) return `<mover>${n}<mo stretchy="true">&#x2015;</mo></mover>`;
	let r = e(rt, t.char) ?? t.char;
	return `<mover accent="true">${n}<mo stretchy="${r === "→" || r === "←" ? "true" : "false"}">${q(r)}</mo></mover>`;
}
function ot(e) {
	let t = Y(e.base), n = e.lower && e.lower.length ? Y(e.lower) : null, r = e.upper && e.upper.length ? Y(e.upper) : null;
	return n && r ? `<munderover>${t}${n}${r}</munderover>` : n ? `<munder>${t}${n}</munder>` : r ? `<mover>${t}${r}</mover>` : t;
}
function st(e) {
	let t = Math.max(1, ...e.rows.map((e) => e.length)), n;
	n = e.align === "eq" ? Array.from({ length: t }, (e, t) => t % 2 == 0 ? "right" : "left").join(" ") : e.align === "left" ? "left" : "center";
	let r = e.rows.map((e) => `<mtr>${e.map((e) => `<mtd>${J(e)}</mtd>`).join("")}</mtr>`).join("");
	return `<mtable columnalign="${n}" rowspacing="0.2em" columnspacing="0.3em">${r}</mtable>`;
}
var ct = new Set([..."∫∬∭∮∯∰∱∲∳⨌⨍⨎⨏⨐⨑⨒⨓⨔⨕⨖⨗"]);
function lt(e) {
	let t = e.limLoc === "subSup" ? !0 : e.limLoc === "undOvr" ? !1 : ct.has(e.op), n = `<mo largeop="true">${q(e.op)}</mo>`, r = e.sub ?? [], i = e.sup ?? [], a;
	return a = t ? r.length && i.length ? `<msubsup>${n}${Y(r)}${Y(i)}</msubsup>` : r.length ? `<msub>${n}${Y(r)}</msub>` : i.length ? `<msup>${n}${Y(i)}</msup>` : n : r.length && i.length ? `<munderover>${n}${Y(r)}${Y(i)}</munderover>` : r.length ? `<munder>${n}${Y(r)}</munder>` : i.length ? `<mover>${n}${Y(i)}</mover>` : n, `<mrow>${a}${J(e.body)}</mrow>`;
}
function ut(e) {
	let t = (e) => `<mo fence="true" stretchy="true">${q(e)}</mo>`, n = e.items.map((e) => Y(e)).join("<mo separator=\"true\">,</mo>");
	return `<mrow>${t(e.begChar)}${n}${t(e.endChar)}</mrow>`;
}
function dt(e, t) {
	return `<math xmlns="http://www.w3.org/1998/Math/MathML" display="${t ? "block" : "inline"}">${J(e)}</math>`;
}
var X = 256, ft = 64;
function pt(e, t, n) {
	let r = Math.max(1, Math.round(t * X)), i = Math.max(1, Math.round(n * X));
	return e.replace(/<svg([^>]*?)>/, (e, t) => `<svg${t.replace(/\s(?:width|height)="[^"]*"/g, "")} width="${r}" height="${i}">`);
}
function Z(e, t) {
	return RegExp(`(?:^|\\s)${t}="([^"]*)"`).exec(e)?.[1];
}
function Q(e, t, n = 0) {
	let r = Number.parseFloat(Z(e, t) ?? "");
	return Number.isFinite(r) ? r : n;
}
function mt(e) {
	return e.replace(/&(#(?:x[\da-fA-F]+|\d+)|amp|lt|gt|quot|apos);/g, (e, t) => {
		if (t[0] === "#") {
			let n = t[1] === "x" ? Number.parseInt(t.slice(2), 16) : Number.parseInt(t.slice(1), 10);
			return n <= 1114111 ? String.fromCodePoint(n) : e;
		}
		return {
			amp: "&",
			lt: "<",
			gt: ">",
			quot: "\"",
			apos: "'"
		}[t];
	});
}
function ht(e) {
	let t = /* @__PURE__ */ new Map();
	for (let n of [
		"fill",
		"stroke",
		"stroke-width",
		"stroke-linecap",
		"stroke-linejoin",
		"fill-rule",
		"opacity"
	]) {
		let r = Z(e, n);
		r !== void 0 && t.set(n, r);
	}
	let n = Z(e, "style");
	if (n) for (let e of n.split(";")) {
		let n = e.indexOf(":");
		if (n < 0) continue;
		let r = e.slice(0, n).trim(), i = e.slice(n + 1).trim();
		r && i && t.set(r, i);
	}
	return t;
}
function gt(e, t, n) {
	let r = ht(t), i = { ...n }, a = r.get("fill");
	a === "none" ? i.fill = !1 : a && (i.fill = !0, e.fillStyle = a);
	let o = r.get("stroke");
	o === "none" ? i.stroke = !1 : o && (i.stroke = !0, e.strokeStyle = o);
	let s = Number.parseFloat(r.get("stroke-width") ?? "");
	Number.isFinite(s) && (e.lineWidth = s);
	let c = r.get("stroke-linecap");
	(c === "butt" || c === "round" || c === "square") && (e.lineCap = c);
	let l = r.get("stroke-linejoin");
	(l === "bevel" || l === "round" || l === "miter") && (e.lineJoin = l);
	let u = r.get("fill-rule");
	(u === "evenodd" || u === "nonzero") && (i.fillRule = u);
	let d = Number.parseFloat(r.get("opacity") ?? "");
	return Number.isFinite(d) && (e.globalAlpha *= Math.max(0, Math.min(1, d))), i;
}
function _t(e, t) {
	if (!t) return;
	let n = /([a-zA-Z]+)\(([^)]*)\)/g;
	for (let r = n.exec(t); r; r = n.exec(t)) {
		let t = r[2].trim().split(/[\s,]+/).filter(Boolean).map(Number);
		if (!t.some((e) => !Number.isFinite(e))) switch (r[1]) {
			case "matrix":
				t.length >= 6 && e.transform(...t.slice(0, 6));
				break;
			case "translate":
				e.translate(t[0] ?? 0, t[1] ?? 0);
				break;
			case "scale": {
				let n = t[0] ?? 1;
				e.scale(n, t[1] ?? n);
				break;
			}
			case "rotate": {
				let n = (t[0] ?? 0) * Math.PI / 180;
				t.length >= 3 ? (e.translate(t[1], t[2]), e.rotate(n), e.translate(-t[1], -t[2])) : e.rotate(n);
				break;
			}
		}
	}
}
function vt(e, t, n) {
	n.fill && e.fill(t, n.fillRule), n.stroke && e.lineWidth > 0 && e.stroke(t);
}
function yt(e, t, n, r) {
	let i = Z(t.slice(0, t.indexOf(">") + 1), "viewBox")?.trim().split(/[\s,]+/).map(Number);
	if (!i || i.length !== 4 || i.some((e) => !Number.isFinite(e))) throw TypeError("MathJax SVG must contain a finite viewBox");
	let [a, o, s, c] = i;
	if (!(s > 0) || !(c > 0)) throw TypeError("MathJax SVG viewBox must have positive dimensions");
	let l = Math.min(o, 0), u = Math.max(o + c, 0) - l;
	e.save(), e.setTransform(n / s, 0, 0, r / u, -a * n / s, -l * r / u), e.fillStyle = "#000000", e.strokeStyle = "#000000", e.lineWidth = 1;
	let d = {
		fill: !0,
		stroke: !1,
		fillRule: "nonzero"
	}, f = [], p = /<\/?([A-Za-z][\w:-]*)([^>]*)>/g;
	for (let n = p.exec(t); n; n = p.exec(t)) {
		let [r, i, a = ""] = n, o = i.toLowerCase(), s = r.startsWith("</");
		if (o === "svg") continue;
		if (s) {
			o === "g" && (e.restore(), d = f.pop() ?? d);
			continue;
		}
		if (o === "g") {
			f.push(d), e.save(), d = gt(e, a, d), _t(e, Z(a, "transform"));
			continue;
		}
		if (o === "text") {
			let n = t.indexOf("</text>", p.lastIndex);
			if (n < 0) throw TypeError("MathJax SVG text must have a closing tag");
			e.save();
			let r = gt(e, a, d);
			_t(e, Z(a, "transform")), e.font = `${Z(a, "font-style") === "italic" ? "italic " : ""}${Z(a, "font-weight") === "bold" ? "bold " : ""}${Q(a, "font-size", 1e3)}px ${Z(a, "font-family") ?? "serif"}`, e.textBaseline = "alphabetic";
			let i = mt(t.slice(p.lastIndex, n)), o = Q(a, "x"), s = Q(a, "y");
			r.fill && e.fillText(i, o, s), r.stroke && e.lineWidth > 0 && e.strokeText(i, o, s), e.restore(), p.lastIndex = n + 7;
			continue;
		}
		if (o !== "path" && o !== "rect" && o !== "line") continue;
		e.save();
		let c = gt(e, a, d);
		_t(e, Z(a, "transform"));
		let l = o === "path" ? new Path2D(Z(a, "d") ?? "") : new Path2D();
		o === "rect" ? l.rect(Q(a, "x"), Q(a, "y"), Q(a, "width"), Q(a, "height")) : o === "line" && (l.moveTo(Q(a, "x1"), Q(a, "y1")), l.lineTo(Q(a, "x2"), Q(a, "y2"))), vt(e, l, c), e.restore();
	}
	e.restore();
}
async function bt(e, t) {
	let { width: r, height: i } = h(e.widthEm * X, (e.ascentEm + e.descentEm) * X), a = n(r, i), o = a?.getContext("2d");
	if (!a || !o || typeof Path2D > "u") throw Error("Math SVG rasterization requires Canvas 2D and Path2D support");
	yt(o, pt(te(e.svg, t), e.widthEm, e.ascentEm + e.descentEm), r, i);
	let s = a, c = r, l = i, u = ft / X, d = Math.max(1, Math.round(r * u)), f = Math.max(1, Math.round(i * u));
	for (; c > d || l > f;) {
		let e = Math.max(d, Math.ceil(c / 2)), t = Math.max(f, Math.ceil(l / 2)), r = n(e, t), i = r?.getContext("2d");
		if (!r || !i) break;
		i.imageSmoothingEnabled = !0, i.imageSmoothingQuality = "high", i.drawImage(s, 0, 0, e, t), s = r, c = e, l = t;
	}
	return {
		source: s,
		widthPx: c,
		heightPx: l
	};
}
function xt(e, t) {
	let r = n(e.widthPx, e.heightPx);
	if (!r) return e.source;
	let i = r.getContext("2d");
	return i ? (i.drawImage(e.source, 0, 0, e.widthPx, e.heightPx), i.globalCompositeOperation = "source-in", i.fillStyle = t, i.fillRect(0, 0, e.widthPx, e.heightPx), r) : e.source;
}
function St(e, t) {
	let n = e.tinted.get(t);
	if (n) return n;
	let r = xt(e.raster, t);
	return e.tinted.set(t, r), r;
}
function Ct(e) {
	if (typeof HTMLCanvasElement < "u" && e instanceof HTMLCanvasElement) return !0;
	if (typeof e != "object" || !e) return !1;
	let t = e;
	if (t.nodeType !== 1 || t.localName !== "canvas") return !1;
	let n = t.ownerDocument?.defaultView?.HTMLCanvasElement;
	return typeof n == "function" && e instanceof n;
}
function wt(e = 1) {
	return typeof window < "u" && window.devicePixelRatio || e;
}
var Tt = [
	"U",
	"R",
	"Tu",
	"Tr"
], Et = [
	0,
	167,
	168,
	169,
	170,
	174,
	175,
	177,
	178,
	188,
	191,
	215,
	216,
	247,
	248,
	746,
	748,
	4352,
	4608,
	5121,
	5760,
	6320,
	6400,
	8214,
	8215,
	8216,
	8218,
	8220,
	8222,
	8224,
	8226,
	8240,
	8242,
	8251,
	8253,
	8258,
	8259,
	8263,
	8266,
	8273,
	8274,
	8293,
	8294,
	8413,
	8417,
	8418,
	8421,
	8448,
	8450,
	8451,
	8458,
	8463,
	8464,
	8467,
	8469,
	8470,
	8472,
	8478,
	8484,
	8485,
	8486,
	8487,
	8488,
	8489,
	8490,
	8494,
	8495,
	8501,
	8512,
	8517,
	8523,
	8524,
	8526,
	8527,
	8586,
	8588,
	8592,
	8734,
	8735,
	8756,
	8758,
	8960,
	8968,
	8972,
	8992,
	8996,
	9001,
	9003,
	9004,
	9085,
	9115,
	9150,
	9166,
	9167,
	9168,
	9169,
	9180,
	9186,
	9251,
	9252,
	9472,
	9632,
	9754,
	9760,
	10088,
	10102,
	10132,
	11026,
	11056,
	11088,
	11098,
	11159,
	11160,
	11192,
	11218,
	11219,
	11244,
	11248,
	11264,
	11856,
	11858,
	11904,
	12289,
	12291,
	12296,
	12306,
	12308,
	12320,
	12336,
	12337,
	12353,
	12354,
	12355,
	12356,
	12357,
	12358,
	12359,
	12360,
	12361,
	12362,
	12387,
	12388,
	12419,
	12420,
	12421,
	12422,
	12423,
	12424,
	12430,
	12431,
	12437,
	12439,
	12443,
	12445,
	12448,
	12449,
	12450,
	12451,
	12452,
	12453,
	12454,
	12455,
	12456,
	12457,
	12458,
	12483,
	12484,
	12515,
	12516,
	12517,
	12518,
	12519,
	12520,
	12526,
	12527,
	12533,
	12535,
	12540,
	12541,
	12583,
	12584,
	12724,
	12728,
	12731,
	12732,
	12784,
	12800,
	13055,
	13144,
	13179,
	13184,
	42192,
	43360,
	43392,
	44032,
	55296,
	57344,
	64256,
	65040,
	65056,
	65072,
	65097,
	65104,
	65107,
	65112,
	65113,
	65119,
	65123,
	65127,
	65136,
	65281,
	65282,
	65288,
	65290,
	65292,
	65293,
	65294,
	65295,
	65306,
	65308,
	65311,
	65312,
	65339,
	65340,
	65341,
	65342,
	65343,
	65344,
	65371,
	65377,
	65504,
	65507,
	65508,
	65512,
	65520,
	65529,
	65532,
	65534,
	67968,
	68e3,
	71040,
	71168,
	72192,
	72384,
	77824,
	83584,
	94176,
	101888,
	110576,
	110898,
	110899,
	110928,
	110931,
	110933,
	110934,
	110948,
	110952,
	111360,
	118464,
	118736,
	118784,
	119296,
	119520,
	119680,
	120832,
	121520,
	126976,
	127488,
	127490,
	129024,
	129280,
	129792,
	131072,
	196606,
	196608,
	262142,
	983040,
	1048574,
	1048576,
	1114110
], Dt = [
	1,
	0,
	1,
	0,
	1,
	0,
	1,
	0,
	1,
	0,
	1,
	0,
	1,
	0,
	1,
	0,
	1,
	0,
	1,
	0,
	1,
	0,
	1,
	0,
	1,
	3,
	1,
	3,
	1,
	0,
	1,
	0,
	1,
	0,
	1,
	0,
	1,
	0,
	1,
	0,
	1,
	0,
	1,
	0,
	1,
	0,
	1,
	0,
	1,
	0,
	1,
	0,
	1,
	0,
	1,
	0,
	1,
	0,
	1,
	0,
	1,
	0,
	1,
	0,
	1,
	0,
	1,
	0,
	1,
	0,
	1,
	0,
	1,
	0,
	1,
	0,
	1,
	0,
	1,
	0,
	1,
	0,
	1,
	0,
	1,
	0,
	3,
	0,
	1,
	0,
	1,
	0,
	1,
	0,
	1,
	0,
	1,
	0,
	1,
	0,
	1,
	0,
	1,
	0,
	1,
	0,
	1,
	0,
	1,
	0,
	1,
	0,
	1,
	0,
	1,
	0,
	1,
	0,
	1,
	0,
	1,
	0,
	2,
	0,
	3,
	0,
	3,
	0,
	3,
	0,
	2,
	0,
	2,
	0,
	2,
	0,
	2,
	0,
	2,
	0,
	2,
	0,
	2,
	0,
	2,
	0,
	2,
	0,
	2,
	0,
	2,
	0,
	2,
	0,
	3,
	2,
	0,
	2,
	0,
	2,
	0,
	2,
	0,
	2,
	0,
	2,
	0,
	2,
	0,
	2,
	0,
	2,
	0,
	2,
	0,
	2,
	0,
	3,
	0,
	2,
	0,
	2,
	0,
	2,
	0,
	2,
	0,
	2,
	0,
	2,
	0,
	1,
	0,
	1,
	0,
	1,
	0,
	1,
	0,
	1,
	0,
	1,
	2,
	0,
	1,
	3,
	0,
	1,
	0,
	1,
	2,
	0,
	3,
	0,
	2,
	1,
	2,
	0,
	3,
	1,
	2,
	0,
	3,
	0,
	3,
	0,
	3,
	0,
	3,
	1,
	0,
	3,
	0,
	1,
	0,
	1,
	0,
	1,
	0,
	1,
	0,
	1,
	0,
	1,
	0,
	1,
	0,
	1,
	0,
	2,
	0,
	2,
	0,
	2,
	0,
	2,
	0,
	1,
	0,
	1,
	0,
	1,
	0,
	1,
	0,
	1,
	0,
	2,
	0,
	1,
	0,
	1,
	0,
	1,
	0,
	1,
	0,
	1,
	0,
	1
];
function Ot(e) {
	let t = 0, n = Et.length - 1;
	for (; t < n;) {
		let r = t + n + 1 >> 1;
		Et[r] <= e ? t = r : n = r - 1;
	}
	return Dt[t];
}
function kt(e) {
	return Tt[Ot(e)];
}
function At(e) {
	return jt.get(e) ?? null;
}
var jt = new Map([
	[65292, 65040],
	[12289, 65041],
	[12290, 65042]
]);
function Mt(e) {
	return Nt.get(e) ?? null;
}
var Nt = new Map([
	[65288, 65077],
	[65289, 65078],
	[65371, 65079],
	[65373, 65080],
	[12308, 65081],
	[12309, 65082],
	[12304, 65083],
	[12305, 65084],
	[12298, 65085],
	[12299, 65086],
	[12296, 65087],
	[12297, 65088],
	[12300, 65089],
	[12301, 65090],
	[12302, 65091],
	[12303, 65092],
	[12310, 65047],
	[12311, 65048]
]), Pt = new Set([65307]);
function Ft(e) {
	return Pt.has(e);
}
var It = new Set([
	12540,
	12316,
	65374
]);
function Lt(e) {
	return It.has(e);
}
var Rt = 256, zt = 200, Bt = /* @__PURE__ */ new WeakMap();
function Vt(e) {
	let t = e.canvas, n = t?.ownerDocument?.defaultView?.HTMLCanvasElement;
	return typeof n == "function" && t instanceof n || typeof HTMLCanvasElement < "u" && t instanceof HTMLCanvasElement ? t : null;
}
function Ht(e, t) {
	return e.replace(/(^|\s)\d*\.?\d+(?:px|pt|pc|in|cm|mm|q|em|rem|%)(?:\/[^\s]+)?(?=\s)/i, `$1${t}`);
}
function Ut(e, t = !0) {
	let n = e.trim();
	return [...n === "" || n.toLowerCase() === "normal" ? [] : n.split(",").map((e) => e.trim()).filter((e) => !/^(["'])vert\1(?:\s+(?:on|off|\d+))?$/i.test(e)), `"vert" ${+!!t}`].join(", ");
}
function Wt(e) {
	try {
		let t = e.ownerDocument?.defaultView, n = t?.getComputedStyle ? t.getComputedStyle(e) : typeof getComputedStyle == "function" ? getComputedStyle(e) : null;
		if (n?.fontFeatureSettings) return n.fontFeatureSettings;
	} catch {}
	return e.style.fontFeatureSettings;
}
function Gt(e, t) {
	if (e.isConnected) return t();
	let n = e.ownerDocument ?? (typeof document > "u" ? null : document), r = n?.body ?? n?.documentElement;
	if (!r) return t();
	let i = e.parentNode, a = e.nextSibling, o = e.style, s = {
		position: o.position,
		left: o.left,
		top: o.top,
		opacity: o.opacity,
		pointerEvents: o.pointerEvents
	};
	Object.assign(o, {
		position: "fixed",
		left: "-99999px",
		top: "0",
		opacity: "0",
		pointerEvents: "none"
	}), r.appendChild(e);
	let c = !1;
	try {
		return t();
	} catch (e) {
		throw c = !0, e;
	} finally {
		let t;
		try {
			if (i) {
				let t = a?.parentNode === i ? a : null;
				i.insertBefore(e, t);
			} else e.remove();
		} catch (n) {
			t = n;
			try {
				e.remove();
			} catch {}
		} finally {
			Object.assign(o, s);
		}
		if (t !== void 0 && !c) throw t;
	}
}
function Kt(e, t) {
	let n = Vt(e);
	return n === null ? t() : Gt(n, t);
}
function qt(e) {
	let t = Bt.get(e);
	if (t) return t;
	let n = e.createElement("canvas");
	n.width = Rt, n.height = Rt, n.setAttribute("aria-hidden", "true"), Object.assign(n.style, {
		position: "fixed",
		left: "-99999px",
		top: "0",
		opacity: "0",
		pointerEvents: "none"
	});
	let r = {
		canvas: n,
		cache: /* @__PURE__ */ new Map(),
		epoch: 0
	}, i = () => {
		r.epoch += 1, r.cache.clear();
	};
	return e.fonts?.addEventListener?.("loadingdone", i), e.fonts?.addEventListener?.("loadingerror", i), Bt.set(e, r), r;
}
function Jt(e, t) {
	let { width: n, height: r } = e.canvas, i = e.getImageData(0, 0, n, r).data, a = new Uint8ClampedArray(n * r), o = n, s = r, c = -1, l = -1, u = 0, d = 0, f = 0;
	for (let e = 0; e < r; e += 1) for (let t = 0; t < n; t += 1) {
		let r = i[(e * n + t) * 4 + 3];
		a[e * n + t] = r, r !== 0 && (o = Math.min(o, t), s = Math.min(s, e), c = Math.max(c, t), l = Math.max(l, e), u += r, d += t * r, f += e * r);
	}
	if (c < o || l < s || u === 0) return null;
	let p = e.measureText(t), m = (e) => typeof e == "number" && Number.isFinite(e) ? e : 0;
	return {
		alpha: a,
		geometry: [
			o,
			s,
			c,
			l,
			d / u,
			f / u
		],
		metrics: [
			m(p.width),
			m(p.actualBoundingBoxLeft),
			m(p.actualBoundingBoxRight),
			m(p.actualBoundingBoxAscent),
			m(p.actualBoundingBoxDescent)
		]
	};
}
function Yt(e, t, n) {
	let r = e.canvas;
	r.style.fontFeatureSettings = n, e.font = e.font, e.clearRect(0, 0, r.width, r.height);
	let i = String.fromCodePoint(t);
	return e.fillText(i, r.width / 2, r.height / 2), Jt(e, i);
}
function $(e, t) {
	let n = 0, r = Math.min(e.length, t.length);
	for (let i = 0; i < r; i += 1) n += Math.abs(e[i] - t[i]);
	return n;
}
function Xt(e, t, n, r) {
	let i = (e, t, n, r) => {
		let i = Math.max($(e, t), $(n, r));
		return Math.min($(e, n), $(e, r), $(t, n), $(t, r)) > i;
	};
	return i(e.alpha, t.alpha, n.alpha, r.alpha) || i(e.geometry, t.geometry, n.geometry, r.geometry) || i(e.metrics, t.metrics, n.metrics, r.metrics);
}
function Zt(e, t) {
	let n = Vt(e);
	if (n === null || typeof document > "u") return !1;
	let r = n.ownerDocument ?? document, i = qt(r), a = Wt(n), o = `${i.epoch}:${Ht(e.font, "<size>")}:${a}:${t}`, s = i.cache.get(o);
	if (s !== void 0) return s;
	let c = !1, l = r.body ?? r.documentElement;
	if (!l) return !1;
	let u = i.canvas.isConnected;
	u || l.appendChild(i.canvas);
	let d = i.canvas.getContext("2d", { willReadFrequently: !0 });
	if (d !== null) {
		let n = i.canvas.style.fontFeatureSettings;
		try {
			d.font = Ht(e.font, `${zt}px`), d.fillStyle = "#000", d.textAlign = "center", d.textBaseline = "middle";
			let n = Ut(a, !1), r = Ut(a, !0), i = Yt(d, t, n), o = Yt(d, t, n), s = Yt(d, t, r), l = Yt(d, t, r);
			c = i !== null && o !== null && s !== null && l !== null && Xt(i, o, s, l);
		} catch {
			c = !1;
		} finally {
			i.canvas.style.fontFeatureSettings = n, d.font = d.font, d.clearRect(0, 0, i.canvas.width, i.canvas.height), u || i.canvas.remove();
		}
	}
	return i.cache.set(o, c), c;
}
function Qt(e, t) {
	let n = e.canvas;
	return n?.style ? Kt(e, () => {
		let r = n.style, i = r.fontFeatureSettings;
		r.fontFeatureSettings = Ut(Wt(n)), e.font = e.font;
		try {
			return t();
		} finally {
			r.fontFeatureSettings = i, e.font = e.font;
		}
	}) : t();
}
function $t(e, t) {
	return Qt(e, () => {
		let n = e.textAlign, r = e.textBaseline;
		e.textAlign = "center", e.textBaseline = "middle";
		try {
			let n = e.measureText(t), r = Number.isFinite(n.width) ? Math.max(0, n.width) : 0, i = typeof n.actualBoundingBoxAscent == "number" && Number.isFinite(n.actualBoundingBoxAscent) && typeof n.actualBoundingBoxDescent == "number" && Number.isFinite(n.actualBoundingBoxDescent);
			return {
				advancePx: r,
				inkBeforePx: i ? n.actualBoundingBoxAscent : 0,
				inkAfterPx: i ? n.actualBoundingBoxDescent : 0,
				cellAdvancePx: r,
				originInCellPx: r / 2
			};
		} finally {
			e.textAlign = n, e.textBaseline = r;
		}
	});
}
export { ue as C, ae as D, se as E, Ee as S, ce as T, De as _, Mt as a, Fe as b, Lt as c, Ct as d, St as f, Ie as g, Le as h, Kt as i, Ft as l, dt as m, Zt as n, At as o, bt as p, Qt as r, kt as s, $t as t, wt as u, ke as v, le as w, Ae as x, Oe as y };
