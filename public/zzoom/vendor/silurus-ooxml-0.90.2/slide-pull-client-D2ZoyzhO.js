import { n as e, r as t } from "./own-key-CzMRhMxt.js";
import { H as n, I as r, L as i, M as a, N as o, R as s, V as c, _ as l, d as u, l as d, u as f, z as p } from "./wmf-HY7sNn5s.js";
import { n as m } from "./substitutions-_KDT_mVq.js";
import { t as h } from "./font-display-text-BSPHLOZg.js";
import { n as g, t as _ } from "./ooxml-error-DbICW35n.js";
import { p as v } from "./resource-policy.generated-D_HlV2Rm.js";
import { c as y, i as b, m as x } from "./substitute-script-COw3MRyd.js";
import { r as S } from "./local-metrics-PuMOXgAD.js";
import { c as C, d as w, i as T, l as E, n as D, o as O, s as k, t as A } from "./scripts-DxEAUeVI.js";
import { a as j, t as M } from "./symbol-font-Cf7Xu0_f.js";
import { A as N, B as P, D as F, E as I, O as L, R, S as ee, T as z, _ as B, a as V, b as te, f as H, g as U, h as ne, k as W, p as re, r as ie, w as G, x as ae, y as oe, z as se } from "./segment-line-BR56kM-V.js";
import { T as ce, a as le, c as ue, d as de, f as fe, l as pe, m as me, n as he, o as ge, p as _e, r as ve, s as ye, u as be, w as xe } from "./vertical-vert-feature-ru96Mg5B.js";
import { $n as Se, Fn as Ce, In as we, Ln as Te, Mn as Ee, Nn as De, Pn as Oe, Rn as ke, Xn as Ae, Zn as je, a as Me, c as Ne, d as Pe, h as Fe, i as Ie, jn as Le, m as Re, nr as ze, o as Be, qn as Ve, r as He, rr as Ue, tr as We, u as Ge, zn as Ke } from "./plot-area-frame-BSqoSYxZ.js";
import { a as qe, i as K } from "./units-BBDOirYi.js";
import { a as Je, f as Ye, i as Xe, u as Ze } from "./pixel-budget-DI82Hn3R.js";
import { _ as Qe, d as $e, h as et, l as tt, m as nt, n as rt, o as it, p as at, s as ot, u as st } from "./paint-s8gGHFU5.js";
import { H as ct, L as lt, M as ut, R as dt, V as ft, n as pt, r as mt, t as ht } from "./renderer-D3GIB31w.js";
import { i as gt } from "./tiff-contract-DEd8CGuz.js";
import { _ as _t, g as vt, h as yt } from "./three-d-w9z2wJm4.js";
import { i as bt, r as xt, t as St } from "./vertical-glyph-metrics-ZbpD5TpZ.js";
import { _ as Ct, a as wt, f as Tt, g as Et, n as Dt, p as Ot, r as kt, t as At, u as jt, v as Mt, y as Nt } from "./duotone-bitmap-by-path-B_pNKO0M.js";
import { a as Pt, o as Ft } from "./duotone-CsU0n_8W.js";
import { a as It, i as Lt, r as Rt, s as zt, t as Bt } from "./line-distribute-DcBhkyOb.js";
import { u as Vt } from "./error-wire-Dr1HjXGZ.js";
import { t as Ht } from "./pull-session-CJuB3jmq.js";
import { n as Ut, t as Wt } from "./hyperlink-BOJHX05H.js";
import { _ as Gt, c as Kt, d as qt, f as Jt, g as Yt, h as Xt, m as Zt, p as Qt, u as $t, v as en } from "./presentation-preflight-CI5kmMvH.js";
import { n as tn, r as nn } from "./chart-font-sources-B96UtO2E.js";
import { a as rn, c as an, i as on, l as sn, s as cn, t as ln } from "./part-failures-pZSloLZv.js";
import { a as un, c as dn, d as fn, f as pn, g as mn, h as hn, i as gn, l as _n, m as vn, n as yn, o as bn, r as xn, s as Sn, t as Cn, u as wn } from "./stacked-glyphs-B5TfEXN9.js";
function Tn(e, t, n) {
	let r = typeof e.getTransform == "function" ? e.getTransform() : {
		a: 1,
		b: 0,
		c: 0,
		d: 1,
		e: 0,
		f: 0
	};
	if (![
		t,
		n,
		t + n,
		e.canvas.width,
		e.canvas.height,
		r.a,
		r.b,
		r.c,
		r.d,
		r.e,
		r.f
	].every(Number.isFinite)) return;
	let i = Math.max(Math.abs(r.a), Math.abs(r.c)), a = Math.max(Math.abs(r.b), Math.abs(r.d));
	if (i === 0 || a === 0) return;
	let o = r.a / i, s = r.c / i, c = r.b / a, l = o * (r.d / a) - c * s;
	if (l === 0) return;
	let u = Infinity, d = -Infinity;
	for (let t of [0, e.canvas.width]) for (let n of [0, e.canvas.height]) {
		let e = ((c === 0 ? 0 : -c * ((t - r.e) / i)) + (o === 0 ? 0 : o * ((n - r.f) / a))) / l;
		if (!Number.isFinite(e)) return;
		u = Math.min(u, e), d = Math.max(d, e);
	}
	let f = d - u;
	Number.isFinite(f) && (e.beginPath(), e.rect(t, u, n, f), e.clip());
}
function En(e, t) {
	let n = o(e, 1, 1)?.getContext("2d");
	if (!n) return;
	let r = { paths: [] }, i = Infinity, a = Infinity, s = -Infinity, c = -Infinity, l = (e) => {
		if (!(!e || ![
			e.x,
			e.y,
			e.w,
			e.h
		].every(Number.isFinite)) && (i = Math.min(i, e.x), a = Math.min(a, e.y), s = Math.max(s, e.x + e.w), c = Math.max(c, e.y + e.h), n.shadowColor !== "rgba(0, 0, 0, 0)" && n.shadowColor !== "transparent")) {
			let t = 3 * n.shadowBlur;
			i = Math.min(i, e.x + n.shadowOffsetX - t), a = Math.min(a, e.y + n.shadowOffsetY - t), s = Math.max(s, e.x + e.w + n.shadowOffsetX + t), c = Math.max(c, e.y + e.h + n.shadowOffsetY + t);
		}
	}, u = (e, t, r, i, a = 0) => {
		let o = n.getTransform(), s = [
			[e, t],
			[e + r, t],
			[e + r, t + i],
			[e, t + i]
		], c = s.map(([e, t]) => o.a * e + o.c * t + o.e), u = s.map(([e, t]) => o.b * e + o.d * t + o.f), d = a * Math.hypot(o.a, o.c), f = a * Math.hypot(o.b, o.d);
		l({
			x: Math.min(...c) - d,
			y: Math.min(...u) - f,
			w: Math.max(...c) - Math.min(...c) + 2 * d,
			h: Math.max(...u) - Math.min(...u) + 2 * f
		});
	};
	return t(new Proxy(n, {
		get(t, i) {
			if (i === "canvas") return e.canvas;
			let a = Reflect.get(t, i, t);
			return typeof a == "function" ? (...e) => {
				let o = String(i), s = n.getTransform();
				if (et(r, {
					a: s.a,
					b: s.b,
					c: s.c,
					d: s.d,
					e: s.e,
					f: s.f
				}, o, e), o === "fillText" || o === "strokeText") {
					let [t, r, i, a] = e, s = n.measureText(t), c = a !== void 0 && s.width > a ? a / s.width : 1;
					u(r - s.actualBoundingBoxLeft * c, i - s.actualBoundingBoxAscent, (s.actualBoundingBoxLeft + s.actualBoundingBoxRight) * c, s.actualBoundingBoxAscent + s.actualBoundingBoxDescent, o === "strokeText" ? n.lineWidth / 2 * (n.lineJoin === "miter" ? n.miterLimit : 1) : 0);
					return;
				}
				if (o === "fill" || o === "stroke") {
					if (s.a * s.d - s.b * s.c === 0) return;
					l(Qe(r, s, {
						lineWidth: o === "stroke" ? n.lineWidth : 0,
						lineCap: n.lineCap,
						lineJoin: n.lineJoin,
						miterLimit: n.miterLimit,
						dash: n.getLineDash()
					}));
					return;
				}
				if (o === "fillRect" || o === "strokeRect") {
					let [t, r, i, a] = e;
					u(t, r, i, a, o === "strokeRect" ? n.lineWidth / 2 * Math.max(1, n.miterLimit) : 0);
					return;
				}
				if (o === "drawImage") {
					let t = e[0], [n, r, i, a] = e.length === 9 ? e.slice(5) : e.length === 5 ? e.slice(1) : [
						e[1],
						e[2],
						t.width,
						t.height
					];
					u(n, r, i, a);
					return;
				}
				if (o !== "clearRect") return Reflect.apply(a, t, e);
			} : a;
		},
		set(e, t, n) {
			return Reflect.set(e, t, n, e);
		}
	})), s > i && c > a ? {
		x: i,
		y: a,
		w: s - i,
		h: c - a
	} : void 0;
}
var Dn = 6.28, On = 26;
function q(e = 0, t = 0, n = 0, r = 0, i = 0) {
	return {
		kind: "orthographic",
		baseLat: e,
		baseLon: t,
		baseRev: n,
		fovDeg: 0,
		shearX: r,
		shearY: i
	};
}
function J(e, t, n, r = 45) {
	return {
		kind: "perspective",
		baseLat: e,
		baseLon: t,
		baseRev: n,
		fovDeg: r,
		sceneInches: Dn,
		shearX: 0,
		shearY: 0
	};
}
var kn = {
	isometricBottomDown: q(35.4, 314.7, 299.8),
	isometricBottomUp: q(35.4, 45.3, 60.2),
	isometricLeftDown: q(35, 45, 0),
	isometricLeftUp: q(325, 45, 0),
	isometricOffAxis1Left: q(18, 64, 0),
	isometricOffAxis1Right: q(18, 334, 0),
	isometricOffAxis1Top: q(301.3, 306.5, 57.6),
	isometricOffAxis2Left: q(18, 26, 0),
	isometricOffAxis2Right: q(18, 296, 0),
	isometricOffAxis2Top: q(301.3, 53.5, 302.4),
	isometricOffAxis3Bottom: q(58.7, 306.5, 302.4),
	isometricOffAxis3Left: q(342, 64, 0),
	isometricOffAxis3Right: q(342, 334, 0),
	isometricOffAxis4Bottom: q(58.7, 53.5, 57.6),
	isometricOffAxis4Left: q(342, 26, 0),
	isometricOffAxis4Right: q(342, 296, 0),
	isometricRightDown: q(325, 315, 0),
	isometricRightUp: q(35, 315, 0),
	isometricTopDown: q(324.6, 45.3, 299.8),
	isometricTopUp: q(324.6, 314.7, 60.2),
	obliqueBottom: q(0, 0, 0, 0, -.3),
	obliqueBottomLeft: q(0, 0, 0, .3 / Math.sqrt(2), -.3 / Math.sqrt(2)),
	obliqueBottomRight: q(0, 0, 0, -.3 / Math.sqrt(2), -.3 / Math.sqrt(2)),
	obliqueLeft: q(0, 0, 0, .3, 0),
	obliqueRight: q(0, 0, 0, -.3, 0),
	obliqueTop: q(0, 0, 0, 0, .3),
	obliqueTopLeft: q(0, 0, 0, .3 / Math.sqrt(2), .3 / Math.sqrt(2)),
	obliqueTopRight: q(0, 0, 0, -.3 / Math.sqrt(2), .3 / Math.sqrt(2)),
	orthographicFront: q(0, 0, 0),
	perspectiveAbove: J(340, 0, 0),
	perspectiveAboveLeftFacing: J(39.3, 14.3, 341.1),
	perspectiveAboveRightFacing: J(39.3, 345.7, 18.9),
	perspectiveBelow: J(20, 0, 0),
	perspectiveContrastingLeftFacing: J(10.4, 43.9, 356.4),
	perspectiveContrastingRightFacing: J(10.4, 316.1, 3.6),
	perspectiveFront: J(0, 0, 0),
	perspectiveHeroicExtremeLeftFacing: J(8.1, 34.5, 357.1, 80),
	perspectiveHeroicExtremeRightFacing: J(8.1, 325.5, 2.9, 80),
	perspectiveHeroicLeftFacing: J(349, 14.3, 2.6),
	perspectiveHeroicRightFacing: J(349, 345.7, 357.4),
	perspectiveLeft: J(0, 20, 0),
	perspectiveRelaxed: J(309.6, 0, 0),
	perspectiveRelaxedModerately: J(324.8, 0, 0),
	perspectiveRight: J(0, 340, 0)
}, An = {
	...J(0, 0, 0, On),
	sceneInches: void 0
};
function jn(e, t) {
	let n = Array(9).fill(0);
	for (let r = 0; r < 3; r++) for (let i = 0; i < 3; i++) {
		let a = 0;
		for (let n = 0; n < 3; n++) a += e[r * 3 + n] * t[n * 3 + i];
		n[r * 3 + i] = a;
	}
	return n;
}
function Mn(e) {
	let t = e * Math.PI / 180, n = Math.cos(t), r = Math.sin(t);
	return [
		1,
		0,
		0,
		0,
		n,
		-r,
		0,
		r,
		n
	];
}
function Nn(e) {
	let t = e * Math.PI / 180, n = Math.cos(t), r = Math.sin(t);
	return [
		n,
		0,
		r,
		0,
		1,
		0,
		-r,
		0,
		n
	];
}
function Pn(e) {
	let t = e * Math.PI / 180, n = Math.cos(t), r = Math.sin(t);
	return [
		n,
		-r,
		0,
		r,
		n,
		0,
		0,
		0,
		1
	];
}
function Fn(e, t, n, r) {
	return [
		e[0] * t + e[1] * n + e[2] * r,
		e[3] * t + e[4] * n + e[5] * r,
		e[6] * t + e[7] * n + e[8] * r
	];
}
function In(e, t) {
	let n = t ? t.lat : e.baseLat, r = t ? t.lon : e.baseLon;
	return jn(Pn(-(t ? t.rev : e.baseRev)), jn(Mn(-n), Nn(-r)));
}
function Ln(e) {
	return t(kn, e) || (e.startsWith("perspective") ? An : kn.orthographicFront);
}
function Rn(e, t, n, r, i, a) {
	let o = e.fov ?? t.fovDeg, s = Math.max(1, Math.min(179, o)) * Math.PI / 180, c = (t.sceneInches === void 0 ? Math.max(r, i) / 2 : t.sceneInches * (e.unitsPerInch ?? 96)) / Math.tan(s / 2), l = Math.max(0, e.sceneDepth ?? 0, a), u = Math.abs(n[6]) * r / 2 + Math.abs(n[7]) * i / 2, d = -n[8] * l, f = u + Math.max(0, d), p = 2 * u + Math.abs(d);
	return Math.max(c, f + .02 * p);
}
function zn(e, t, n, r = 0) {
	let i = Ln(e.prst), a = In(i, e.rot);
	if (t <= 0 || n <= 0) return {
		corners: [
			{
				x: 0,
				y: 0
			},
			{
				x: t,
				y: 0
			},
			{
				x: t,
				y: n
			},
			{
				x: 0,
				y: n
			}
		],
		isAffine: !0,
		isIdentity: !0
	};
	let o = t / 2, s = n / 2, c = [
		[-o, -s],
		[o, -s],
		[o, s],
		[-o, s]
	], l = e.zoom ?? 1, u;
	if (i.kind === "perspective") {
		let o = Rn(e, i, a, t, n, r);
		u = c.map(([e, t]) => {
			let [n, i, s] = Fn(a, e, t, -r), c = o / (o - s);
			return [n * c, i * c];
		});
	} else u = c.map(([e, t]) => {
		let [n, o, s] = Fn(a, e, t, -r);
		return [n + s * i.shearX, o + s * i.shearY];
	});
	u = u.map(([e, t]) => [e * l, t * l]);
	let d = u.map(([e, r]) => ({
		x: t / 2 + e,
		y: n / 2 + r
	})), f = .001 * Math.max(t, n), p = d[0].x + d[2].x - (d[1].x + d[3].x), m = d[0].y + d[2].y - (d[1].y + d[3].y), h = Math.abs(p) < f && Math.abs(m) < f, g = [
		[0, 0],
		[t, 0],
		[t, n],
		[0, n]
	], _ = !0;
	for (let e = 0; e < 4; e++) if (Math.abs(d[e].x - g[e][0]) > f || Math.abs(d[e].y - g[e][1]) > f) {
		_ = !1;
		break;
	}
	return {
		corners: d,
		isAffine: h,
		isIdentity: _
	};
}
function Bn(e, t, n, r = 0) {
	if (t !== void 0 && n !== void 0) {
		if (t <= 0 || n <= 0) return !1;
		if (e = {
			...e,
			sceneDepth: Math.max(e.sceneDepth ?? 0, r)
		}, !zn(e, t, n).isIdentity) return !0;
		if (r <= 0) return !1;
		let i = zn(e, t, n, r);
		if (Ln(e.prst).sceneInches === void 0) return !i.isIdentity;
		let a = .001 * Math.max(t, n);
		return i.corners.some((e) => e.x < -a || e.y < -a || e.x > t + a || e.y > n + a);
	}
	let i = Ln(e.prst), a = In(i, e.rot), o = i.kind === "perspective" ? [
		a[0] - 1,
		a[1],
		a[3],
		a[4] - 1,
		a[6],
		a[7]
	] : [
		a[0] + i.shearX * a[6] - 1,
		a[1] + i.shearX * a[7],
		a[3] + i.shearY * a[6],
		a[4] + i.shearY * a[7] - 1
	];
	if (r > 0) {
		if (i.kind === "perspective") return !0;
		o.push(a[2] + i.shearX * a[8], a[5] + i.shearY * a[8]);
	}
	return (e.zoom ?? 1) !== 1 || o.some((e) => Math.abs(e) > 1e-12);
}
function Vn(e) {
	let t = Ln(e.prst), n = In(t, e.rot);
	return {
		rotation: n,
		backFacing: n[8] - t.shearX * n[2] - t.shearY * n[5] < 0
	};
}
function Hn(e, t, n, r) {
	let i = Ln(e.prst), a = In(i, e.rot);
	if (t <= 0 || n <= 0 || r === 0) return {
		x: 0,
		y: 0
	};
	let o = e.zoom ?? 1, s = i.kind === "perspective" ? Rn(e, i, a, t, n, r) : 0, c = (e) => {
		let [t, n, r] = Fn(a, 0, 0, e);
		if (i.kind === "perspective") {
			let e = s / (s - r);
			return [t * e * o, n * e * o];
		}
		return [(t + r * i.shearX) * o, (n + r * i.shearY) * o];
	}, [l, u] = c(0), [d, f] = c(-r);
	return {
		x: d - l,
		y: f - u
	};
}
var Un = {
	angle: [[1, 1]],
	artDeco: [[
		0,
		.184095,
		.149238,
		.333333,
		.333333,
		.333333
	], [
		.333333,
		.701523,
		.63181,
		1,
		1,
		1
	]],
	circle: [[
		0,
		.55627,
		.44373,
		1,
		1,
		1
	]],
	convex: [
		[
			0,
			.07082,
			.0297458,
			.1,
			.101416,
			.1
		],
		[
			.501416,
			.1,
			.9,
			.7,
			.901416,
			.899999
		],
		[
			.9,
			.97167,
			.93343,
			1,
			1,
			1
		]
	],
	coolSlant: [[
		0,
		.138122,
		0,
		.2,
		.271356,
		.775535
	], [
		.377654,
		1,
		.519455,
		1,
		.583589,
		1
	]],
	cross: [
		[
			0,
			.05563,
			.04437,
			.1,
			.1,
			.1
		],
		[.4, .1],
		[
			.45563,
			.1,
			.5,
			.14437,
			.5,
			.2
		],
		[.5, .9],
		[
			.5,
			.95563,
			.54437,
			1,
			.6,
			1
		]
	],
	divot: [
		[
			0,
			.236604,
			.119276,
			.607024,
			.263046,
			.760235
		],
		[
			.361098,
			.864726,
			.457934,
			.909567,
			.537806,
			.925082
		],
		[
			.559245,
			.929246,
			.567625,
			.89793,
			.542066,
			.845567
		],
		[
			.484073,
			.726757,
			.477103,
			.393693,
			.551651,
			.393693
		],
		[.899894, .393693],
		[
			.99148,
			.393693,
			.958466,
			.746659,
			.907348,
			.779629
		],
		[.879394, .797658],
		[
			.845545,
			.819489,
			.848775,
			.954172,
			.874334,
			.971627
		],
		[
			.915883,
			1,
			1,
			1
		]
	],
	hardEdge: [
		[
			0,
			.092437,
			.042353,
			.305322
		],
		[.170124, .947558],
		[
			.177203,
			.983142,
			.2,
			1,
			.268235,
			.998599
		],
		[.614118, .998599],
		[
			.647059,
			.998599,
			.656471,
			.987395,
			.663529,
			.969188
		],
		[
			.687006,
			.908633,
			.802353,
			.822129,
			1,
			.822129
		]
	],
	relaxedInset: [[
		0,
		.367,
		.124605,
		.82,
		.507899,
		1
	], [
		.724115,
		.737,
		.790455,
		.64,
		1,
		.64
	]],
	riblet: [
		[
			0,
			.238519,
			.132047,
			.500741,
			.357567,
			.731852
		],
		[
			.513167,
			.891311,
			.563798,
			.912593,
			.735905,
			.912593
		],
		[.873887, .912593],
		[
			.956973,
			.912593,
			.878338,
			1,
			1,
			1
		]
	],
	slope: [
		[
			0,
			.125,
			.025,
			.25
		],
		[.125, .75],
		[
			.175,
			1,
			.25,
			1,
			.375,
			1
		],
		[.5, 1],
		[
			.625,
			1,
			.7,
			1,
			.75,
			.75
		],
		[.875, .125],
		[
			.9,
			.01,
			.98,
			.01,
			1,
			.01
		]
	],
	softRound: [[
		0,
		.4775,
		.0968736,
		1,
		.156301,
		1
	], [
		.264179,
		1,
		.376919,
		.33333,
		1,
		.33333
	]]
}, Wn = 1024;
function Gn(e) {
	let t = new Float64Array(1025).fill(-Infinity), n = new Float64Array(1025), r = [0], i = [0], a = 0, o = 0;
	for (let t of e) {
		let e = t.length / 2;
		for (let n = 1; n <= 256; n++) {
			let s = n / 256, c = 1 - s;
			e === 1 ? (r.push(c * a + s * t[0]), i.push(c * o + s * t[1])) : e === 2 ? (r.push(c * c * a + 2 * c * s * t[0] + s * s * t[2]), i.push(c * c * o + 2 * c * s * t[1] + s * s * t[3])) : (r.push(c * c * c * a + 3 * c * c * s * t[0] + 3 * c * s * s * t[2] + s * s * s * t[4]), i.push(c * c * c * o + 3 * c * c * s * t[1] + 3 * c * s * s * t[3] + s * s * s * t[5]));
		}
		a = t[t.length - 2], o = t[t.length - 1];
	}
	let s = Math.max(...i);
	for (let e = 1; e < r.length; e++) {
		let a = r[e - 1], o = r[e], c = i[e - 1] / s, l = o - a, u = i[e] / s - c;
		if (l === 0) continue;
		let d = Math.max(0, Math.ceil(Math.min(a, o) * Wn)), f = Math.min(Wn, Math.floor(Math.max(a, o) * Wn));
		for (let e = d; e <= f; e++) {
			let r = c + (e / Wn - a) * u / l;
			r > t[e] && (t[e] = r, n[e] = u / l);
		}
	}
	for (let e = 0; e <= Wn; e++) e / Wn >= a && (t[e] = o / s, n[e] = 0);
	return {
		height: t,
		slope: n
	};
}
var Kn = /* @__PURE__ */ new Map();
function qn(e) {
	let t = Object.hasOwn(Un, e) ? e : "circle", n = Kn.get(t);
	return n === void 0 && (n = Gn(Un[t]), Kn.set(t, n)), n;
}
function Jn(e, t) {
	let n = Math.max(0, Math.min(1, t)) * Wn, r = Math.min(Wn - 1, Math.floor(n));
	return e[r] + (e[r + 1] - e[r]) * (n - r);
}
function Yn(e, t) {
	return Jn(qn(e).slope, t);
}
function Xn(e, t, n, r, i, a, o, s) {
	let c = e.slice(), l = new Int8Array(r * i);
	for (let t = 0; t < i; t++) for (let a = 0; a < r; a++) {
		let o = t * r + a, s = (a + 1 < r ? n[o + 1] : 0) - (a > 0 ? n[o - 1] : 0), c = (t + 1 < i ? n[o + r] : 0) - (t > 0 ? n[o - r] : 0);
		l[o] = Math.floor((Math.atan2(c, s) + Math.PI) * 16 / Math.PI) % 32, e[o * 4 + 3] = 0;
	}
	let u = (t, n, a, o) => {
		if (t < 0 || t >= r || n < 0 || n >= i) return;
		let s = (n * r + t) * 4, l = a * 4, u = c[l + 3] * Math.min(1, Math.max(0, o));
		u <= e[s + 3] || (e[s] = c[l], e[s + 1] = c[l + 1], e[s + 2] = c[l + 2], e[s + 3] = u);
	}, d = s && Number.isFinite(s.x) ? s.x : 0, f = s && Number.isFinite(s.y) ? s.y : 0, p = s ? new Uint8Array(r * i) : void 0;
	for (let e = 0; e < i; e++) for (let c = 0; c < r; c++) {
		let m = e * r + c;
		if (t[m] === 0) continue;
		let h = Math.max(0, n[m] - .5), g = Math.max(0, Math.min(1, o + .5 - h)), _ = a > o ? Math.max(0, o / 2 + .5 - Math.abs(h - a)) : 0, v = c + 1 < r && t[m + 1] > 0 && l[m] !== l[m + 1] || e + 1 < i && t[m + r] > 0 && l[m] !== l[m + r], y = Math.max(g, _, a > 0 && h <= a && v ? 1 : 0);
		y > 0 && (u(c, e, m, y), s && u(Math.round(c + d), Math.round(e + f), m, y)), p && g > 0 && v && (p[m] = 1);
	}
	if (!p || d === 0 && f === 0) return;
	let m = Math.abs(d) >= Math.abs(f), h = m ? r : i, g = m ? i : r, _ = m ? d : f, v = (m ? f : d) / _, y = _ > 0 ? 1 : -1, b = new Int32Array(g + 2 * h + 1).fill(-1), x = new Float64Array(b.length);
	for (let e = y > 0 ? 0 : h - 1; e >= 0 && e < h; e += y) {
		let t = Math.round(v * e);
		for (let n = 0; n < g; n++) {
			let i = m ? e : n, a = m ? n : e, o = a * r + i, s = n - t + h;
			p[o] && (b[s] = o, x[s] = y * e + Math.abs(_)), b[s] >= 0 && y * e <= x[s] && u(i, a, b[s], 1);
		}
	}
}
var Zn = {
	threePt: {
		ambient: 0,
		lights: [
			{
				rgb: [
					1.141,
					1.141,
					1.141
				],
				direction: [
					-.6515,
					-.2693,
					-.7093
				],
				scale: 1,
				offset: 0,
				specular: !0,
				diffuse: !0
			},
			{
				rgb: [
					.5,
					.5,
					.5
				],
				direction: [
					.8482,
					.2469,
					-.4686
				],
				scale: 1,
				offset: 0,
				specular: !0,
				diffuse: !0
			},
			{
				rgb: [
					1,
					1,
					1
				],
				direction: [
					.5634,
					-.2812,
					.7769
				],
				scale: 1,
				offset: 0,
				specular: !0,
				diffuse: !0
			}
		]
	},
	balanced: {
		ambient: .13,
		lights: [
			{
				rgb: [
					1.05,
					1.05,
					1.05
				],
				direction: [
					.5263,
					-.4092,
					-.7453
				],
				scale: 1,
				offset: 0,
				specular: !0,
				diffuse: !0
			},
			{
				rgb: [
					1,
					1,
					1
				],
				direction: [
					-.9386,
					.3426,
					-.041
				],
				scale: 1,
				offset: 0,
				specular: !0,
				diffuse: !0
			},
			{
				rgb: [
					.5,
					.5,
					.5
				],
				direction: [
					.0934,
					.763,
					.6396
				],
				scale: 1,
				offset: 0,
				specular: !0,
				diffuse: !0
			}
		]
	},
	soft: {
		ambient: .3,
		lights: [{
			rgb: [
				.8,
				.8,
				.8
			],
			direction: [
				-.6897,
				.2484,
				-.6802
			],
			scale: .5,
			offset: .5,
			specular: !0,
			diffuse: !0
		}]
	},
	harsh: {
		ambient: .28,
		lights: [{
			rgb: [
				.88,
				.88,
				.88
			],
			direction: [
				.6689,
				-.6755,
				-.3104
			],
			scale: 1,
			offset: 0,
			specular: !0,
			diffuse: !0
		}, {
			rgb: [
				.88,
				.88,
				.88
			],
			direction: [
				-.592,
				-.7371,
				-.326
			],
			scale: 1,
			offset: 0,
			specular: !0,
			diffuse: !0
		}]
	},
	flood: {
		ambient: .13,
		lights: [
			{
				rgb: [
					1.1,
					1.1,
					1.1
				],
				direction: [
					.5685,
					-.7651,
					-.3022
				],
				scale: 1,
				offset: 0,
				specular: !0,
				diffuse: !0
			},
			{
				rgb: [
					1.1,
					1.1,
					1.1
				],
				direction: [
					-.2366,
					-.9595,
					-.1531
				],
				scale: 1,
				offset: 0,
				specular: !0,
				diffuse: !0
			},
			{
				rgb: [
					.55,
					.55,
					.55
				],
				direction: [
					-.8982,
					.1386,
					-.4171
				],
				scale: 1,
				offset: 0,
				specular: !0,
				diffuse: !0
			}
		]
	},
	contrasting: {
		ambient: 1,
		lights: [{
			rgb: [
				1,
				1,
				1
			],
			direction: [
				0,
				-1,
				0
			],
			scale: 1,
			offset: 0,
			specular: !0,
			diffuse: !1
		}, {
			rgb: [
				1,
				1,
				1
			],
			direction: [
				0,
				1,
				0
			],
			scale: 1,
			offset: 0,
			specular: !0,
			diffuse: !1
		}]
	},
	morning: {
		ambient: 0,
		lights: [
			{
				rgb: [
					.669,
					.648,
					.596
				],
				direction: [
					.6574,
					-.7316,
					-.1806
				],
				scale: 1,
				offset: 0,
				specular: !0,
				diffuse: !0
			},
			{
				rgb: [
					.459,
					.454,
					.385
				],
				direction: [
					-.2781,
					-.4509,
					-.8482
				],
				scale: 1,
				offset: 0,
				specular: !1,
				diffuse: !0
			},
			{
				rgb: [
					.9,
					.86,
					.83
				],
				direction: [
					.672,
					-.6185,
					-.4073
				],
				scale: 1,
				offset: 0,
				specular: !1,
				diffuse: !0
			},
			{
				rgb: [
					.911,
					.846,
					.728
				],
				direction: [
					-.1825,
					.968,
					.1722
				],
				scale: 1,
				offset: 0,
				specular: !0,
				diffuse: !0
			}
		]
	},
	sunrise: {
		ambient: 0,
		lights: [
			{
				rgb: [
					.667,
					.63,
					.527
				],
				direction: [
					.6574,
					-.7316,
					-.1806
				],
				scale: 1,
				offset: 0,
				specular: !0,
				diffuse: !0
			},
			{
				rgb: [
					.459,
					.459,
					.371
				],
				direction: [
					-.2781,
					-.4509,
					-.8482
				],
				scale: 1,
				offset: 0,
				specular: !1,
				diffuse: !0
			},
			{
				rgb: [
					.826,
					.712,
					.638
				],
				direction: [
					.672,
					-.6185,
					-.4073
				],
				scale: 1,
				offset: 0,
				specular: !1,
				diffuse: !0
			},
			{
				rgb: [
					1.511,
					1.319,
					.994
				],
				direction: [
					-.1825,
					.968,
					.1722
				],
				scale: 1,
				offset: 0,
				specular: !1,
				diffuse: !0
			}
		]
	},
	sunset: {
		ambient: 0,
		lights: [
			{
				rgb: [
					.672,
					.169,
					.169
				],
				direction: [
					.6574,
					-.7316,
					-.1806
				],
				scale: 1,
				offset: 0,
				specular: !0,
				diffuse: !0
			},
			{
				rgb: [
					.459,
					.448,
					.327
				],
				direction: [
					.0922,
					-.3551,
					-.9303
				],
				scale: 1,
				offset: 0,
				specular: !1,
				diffuse: !0
			},
			{
				rgb: [
					.775,
					.612,
					.502
				],
				direction: [
					.672,
					-.6185,
					-.4073
				],
				scale: 1,
				offset: 0,
				specular: !1,
				diffuse: !0
			},
			{
				rgb: [
					.761,
					.69,
					.397
				],
				direction: [
					-.424,
					.8891,
					.1722
				],
				scale: 1,
				offset: 0,
				specular: !1,
				diffuse: !0
			}
		]
	},
	chilly: {
		ambient: .11,
		lights: [
			{
				rgb: [
					.31,
					.32,
					.32
				],
				direction: [
					.6574,
					-.7316,
					-.1806
				],
				scale: 1,
				offset: 0,
				specular: !0,
				diffuse: !0
			},
			{
				rgb: [
					.45,
					.45,
					.45
				],
				direction: [
					-.3539,
					-.1505,
					-.9231
				],
				scale: 1,
				offset: 0,
				specular: !1,
				diffuse: !0
			},
			{
				rgb: [
					1.03,
					1.02,
					1.15
				],
				direction: [
					.672,
					-.6185,
					-.4073
				],
				scale: 1,
				offset: 0,
				specular: !1,
				diffuse: !0
			},
			{
				rgb: [
					.41,
					.45,
					.48
				],
				direction: [
					-.5781,
					.7976,
					.1722
				],
				scale: 1,
				offset: 0,
				specular: !0,
				diffuse: !0
			}
		]
	},
	freezing: {
		ambient: 0,
		lights: [
			{
				rgb: [
					.53,
					.567,
					.661
				],
				direction: [
					.6574,
					-.7316,
					-.1806
				],
				scale: 1,
				offset: 0,
				specular: !0,
				diffuse: !0
			},
			{
				rgb: [
					.37,
					.461,
					.461
				],
				direction: [
					-.2781,
					-.4509,
					-.8482
				],
				scale: 1,
				offset: 0,
				specular: !1,
				diffuse: !0
			},
			{
				rgb: [
					.649,
					.638,
					.904
				],
				direction: [
					.672,
					-.6185,
					-.4073
				],
				scale: 1,
				offset: 0,
				specular: !1,
				diffuse: !0
			},
			{
				rgb: [
					.971,
					1.19,
					1.363
				],
				direction: [
					-.1825,
					.968,
					.1722
				],
				scale: 1,
				offset: 0,
				specular: !0,
				diffuse: !0
			}
		]
	},
	flat: {
		ambient: 1,
		lights: [
			{
				rgb: [
					.821,
					.821,
					.821
				],
				direction: [
					-.9546,
					-.1619,
					-.2502
				],
				scale: 1,
				offset: 0,
				specular: !0,
				diffuse: !1
			},
			{
				rgb: [
					2.072,
					2.54,
					2.91
				],
				direction: [
					9e-4,
					.8605,
					.5095
				],
				scale: 1,
				offset: 0,
				specular: !0,
				diffuse: !1
			},
			{
				rgb: [
					3.843,
					3.843,
					3.843
				],
				direction: [
					.6574,
					-.7316,
					-.1806
				],
				scale: 1,
				offset: 0,
				specular: !0,
				diffuse: !1
			}
		]
	},
	twoPt: {
		ambient: .25,
		lights: [{
			rgb: [
				.84,
				.84,
				.84
			],
			direction: [
				.5266,
				-.4089,
				-.7454
			],
			scale: 1,
			offset: 0,
			specular: !0,
			diffuse: !0
		}, {
			rgb: [
				.3,
				.3,
				.3
			],
			direction: [
				-.8983,
				.2365,
				-.3704
			],
			scale: 1,
			offset: 0,
			specular: !0,
			diffuse: !0
		}]
	},
	glow: {
		ambient: 1,
		lights: [{
			rgb: [
				1,
				1,
				1
			],
			direction: [
				0,
				-1,
				0
			],
			scale: 1,
			offset: 0,
			specular: !0,
			diffuse: !0
		}, {
			rgb: [
				.7,
				.7,
				.7
			],
			direction: [
				0,
				1,
				0
			],
			scale: 1,
			offset: 0,
			specular: !0,
			diffuse: !0
		}]
	},
	brightRoom: {
		ambient: 1.5,
		lights: [
			{
				rgb: [
					1,
					1,
					1
				],
				direction: [
					0,
					-1,
					0
				],
				scale: 1,
				offset: 0,
				specular: !1,
				diffuse: !0
			},
			{
				rgb: [
					1,
					1,
					1
				],
				direction: [
					.8227,
					-.1882,
					-.5364
				],
				scale: 1,
				offset: 0,
				specular: !0,
				diffuse: !1
			},
			{
				rgb: [
					-.5,
					-.5,
					-.5
				],
				direction: [
					0,
					0,
					-1
				],
				scale: 1,
				offset: 0,
				specular: !1,
				diffuse: !0
			},
			{
				rgb: [
					.5,
					.5,
					.5
				],
				direction: [
					0,
					1,
					0
				],
				scale: 1,
				offset: 0,
				specular: !1,
				diffuse: !0
			}
		]
	}
}, Qn = e();
for (let [e, t, n, r, i, a] of [
	[
		"Flat",
		.58,
		.58,
		.305,
		.5,
		.5
	],
	[
		"Normal",
		.671,
		.366,
		.153,
		.5,
		.5
	],
	[
		"Harsh",
		.793,
		.214,
		.061,
		1,
		0
	]
]) for (let o = 1; o <= 4; o++) {
	let s = o === 1 ? [
		0,
		0,
		-.2
	] : [
		o - 3,
		-1,
		-.2
	], c = o === 1 ? [
		0,
		0,
		-.2
	] : [
		0,
		1,
		-.2
	];
	Qn[`legacy${e}${o}`] = {
		ambient: r,
		lights: [{
			rgb: [
				t,
				t,
				t
			],
			direction: s,
			scale: 1,
			offset: 0,
			specular: !0,
			diffuse: !0
		}, {
			rgb: [
				n,
				n,
				n
			],
			direction: c,
			scale: i,
			offset: a,
			specular: !1,
			diffuse: !0
		}]
	};
}
function $n(e) {
	return Object.hasOwn(Zn, e) ? Zn[e] : Object.hasOwn(Qn, e) ? Qn[e] : Zn.threePt;
}
function Y(e, t, n, r, i, a = !1, o = 0, s = 0, c = 1, l = c, u = 0) {
	return {
		specularShape: e,
		specularWhite: t,
		diffuseShape: n,
		diffuseWhite: r,
		power: i,
		blinn: a,
		diffuseFresnel: o,
		alphaFresnel: s,
		diffuseAlpha: c,
		ambientAlpha: l,
		emissive: u
	};
}
var er = {
	legacyMatte: Y(0, 0, 1, 0, 0, !0),
	legacyPlastic: Y(0, 1, 1, 0, 32, !0),
	legacyMetal: Y(1, 0, 2 / 3, 0, 32, !0),
	legacyWireframe: Y(0, 0, 0, 0, 0),
	matte: Y(0, 0, 1, 0, 0),
	plastic: Y(0, .6, 1, 0, 12),
	metal: Y(-.32, 1.32, 1, 0, 12, !1, 4),
	warmMatte: Y(0, .3, 1, 0, 8),
	translucentPowder: Y(0, .3, 1, 0, 10, !0, 2, -1, .7),
	powder: Y(0, .3, .5, .5, 10, !0, 2),
	dkEdge: Y(0, 1, 1, 0, 35, !1, -2),
	softEdge: Y(0, 1, 1, 0, 35, !1, 4, -10),
	clear: Y(0, .6, 1, 0, 20, !1, -8, 1, .1, 1),
	flat: Y(0, .8, 0, 0, 50, !1, -4, 0, 1, 1, 1),
	softmetal: Y(.5, .5, 1, 0, 8)
};
function tr(e) {
	return e && Object.hasOwn(er, e) ? e : "matte";
}
var nr = {
	t: 0,
	tr: 45,
	r: 90,
	br: 135,
	b: 180,
	bl: 225,
	l: 270,
	tl: 315
};
function rr(e, t, n) {
	let r = $n(e), i = Math.PI / 180, a = (n?.lat ?? 0) * i, o = (n?.lon ?? 0) * i, s = (n ? n.rev : Object.hasOwn(nr, t) ? nr[t] : 0) * i, c = Math.cos(a), l = Math.sin(a), u = Math.cos(o), d = Math.sin(o), f = Math.cos(s), p = Math.sin(s), m = r.lights.map((e) => {
		let [t, n, r] = e.direction, i = Math.hypot(t, n, r) || 1, a = n / i, o = t / i, s = -r / i, m = f * a - p * o, h = p * a + f * o, g = c * h - l * s, _ = l * h + c * s, v = u * m + d * _, y = -d * m + u * _, b = Math.hypot(v, g, y + 1) || 1;
		return {
			x: v,
			y: g,
			z: y,
			hx: v / b,
			hy: g / b,
			hz: (y + 1) / b,
			rgb: e.rgb,
			scale: e.scale,
			offset: e.offset,
			specular: e.specular,
			diffuse: e.diffuse
		};
	});
	return {
		x: m[0].x,
		y: m[0].y,
		z: m[0].z,
		rigLights: m,
		rigAmbient: r.ambient
	};
}
function ir(e, t) {
	let n = t, r = Math.hypot(t.x, t.y, t.z + 1) || 1, i = {
		material: er[e],
		ambient: n.rigAmbient ?? 0,
		lights: n.rigLights ?? [{
			...t,
			hx: t.x / r,
			hy: t.y / r,
			hz: (t.z + 1) / r,
			rgb: [
				1,
				1,
				1
			],
			scale: 1,
			offset: 0,
			specular: !0,
			diffuse: !0
		}],
		terms: new Float64Array(6),
		flatTerms: new Float64Array(6)
	};
	return ar(i.flatTerms, 0, 0, 1, i), i;
}
function ar(e, t, n, r, i) {
	let a = i.material, o = 0, s = 0, c = 0, l = 0, u = 0, d = 0;
	for (let e of i.lights) {
		let i = t * e.x + n * e.y + r * e.z;
		if (e.diffuse) {
			let t = Math.max(0, i * e.scale + e.offset);
			o += e.rgb[0] * t, s += e.rgb[1] * t, c += e.rgb[2] * t;
		}
		if (e.specular && i > 0 && (a.specularShape !== 0 || a.specularWhite !== 0)) {
			let o = a.blinn ? t * e.hx + n * e.hy + r * e.hz : 2 * i * r - e.z, s = Math.max(0, o) ** +a.power;
			l += e.rgb[0] * s, u += e.rgb[1] * s, d += e.rgb[2] * s;
		}
	}
	e[0] = o, e[1] = s, e[2] = c, e[3] = l, e[4] = u, e[5] = d;
}
function or(e, t, n, r, i, a, o, s, c) {
	let l = c.material, u = 1 - Math.min(1, Math.abs(s)), d = l.diffuseFresnel === 0 ? 0 : u ** +Math.abs(l.diffuseFresnel), f = l.alphaFresnel === 0 ? 0 : u ** +Math.abs(l.alphaFresnel), p = l.diffuseAlpha;
	l.alphaFresnel > 0 ? p += (1 - p) * f : l.alphaFresnel < 0 && (p *= 1 - f);
	let m = a === 0 && o === 0 && s === 1 ? c.flatTerms : c.terms;
	m === c.terms && ar(m, a, o, s, c);
	for (let i = 0; i < 3; i++) {
		let a = (i === 0 ? t : i === 1 ? n : r) / 255, o = a * l.diffuseShape + l.diffuseWhite;
		o = l.diffuseFresnel > 0 ? o + (1 - o) * d : o * (1 - d);
		let s = a * l.specularShape + l.specularWhite, u = a * l.emissive + (a * l.diffuseShape + l.diffuseWhite) * c.ambient + o * m[i] + s * m[i + 3];
		e[i] = Math.max(0, Math.min(255, u * 255));
	}
	e[3] = i * Math.max(0, Math.min(1, p));
}
function sr(e) {
	let t = e.length, n = new Float64Array(t);
	if (t === 0) return n;
	let r = new Int32Array(t), i = new Float64Array(t + 1), a = 0;
	r[0] = 0, i[0] = -Infinity, i[1] = Infinity;
	for (let n = 1; n < t; n++) {
		let t = (e[n] + n * n - (e[r[a]] + r[a] * r[a])) / (2 * n - 2 * r[a]);
		for (; t <= i[a];) a--, t = (e[n] + n * n - (e[r[a]] + r[a] * r[a])) / (2 * n - 2 * r[a]);
		a++, r[a] = n, i[a] = t, i[a + 1] = Infinity;
	}
	a = 0;
	for (let o = 0; o < t; o++) {
		for (; i[a + 1] < o;) a++;
		let t = o - r[a];
		n[o] = t * t + e[r[a]];
	}
	return n;
}
function cr(e, t = 3) {
	if (e <= 0) return Array(t).fill(1);
	let n = Math.sqrt(12 * e * e / t + 1), r = Math.floor(n);
	r % 2 == 0 && r--;
	let i = r + 2, a = (12 * e * e - t * r * r - 4 * t * r - 3 * t) / (-4 * r - 4), o = Math.round(a), s = [];
	for (let e = 0; e < t; e++) s.push(e < o ? r : i);
	return s;
}
function lr(e, t, n, r, i, a) {
	let o = 1 / (2 * i + 1);
	if (a) for (let a = 0; a < r; a++) {
		let r = a * n, s = 0;
		for (let t = 0; t <= i; t++) t < n && (s += e[r + t]);
		for (let a = 0; a < n; a++) {
			t[r + a] = s * o;
			let c = a + i + 1, l = a - i;
			c < n && (s += e[r + c]), l >= 0 && (s -= e[r + l]);
		}
	}
	else for (let a = 0; a < n; a++) {
		let s = 0;
		for (let t = 0; t <= i; t++) t < r && (s += e[t * n + a]);
		for (let c = 0; c < r; c++) {
			t[c * n + a] = s * o;
			let l = c + i + 1, u = c - i;
			l < r && (s += e[l * n + a]), u >= 0 && (s -= e[u * n + a]);
		}
	}
}
function ur(e, t, n, r) {
	let i = Float64Array.from(e);
	if (r <= 0 || t <= 0 || n <= 0) return i;
	let a = new Float64Array(t * n);
	for (let e of cr(r, 3)) {
		let r = Math.max(1, (e - 1) / 2);
		lr(i, a, t, n, r, !0), lr(a, i, t, n, r, !1);
	}
	return i;
}
function dr(e, t, n, r = 128) {
	let i = new Float64Array(t * n);
	for (let a = 0; a < t * n; a++) i[a] = (e[a] ?? 0) >= r ? 0x56bc75e2d63100000 : 0;
	let a = new Float64Array(n);
	for (let e = 0; e < t; e++) {
		for (let r = 0; r < n; r++) a[r] = i[r * t + e];
		let r = sr(a);
		for (let a = 0; a < n; a++) i[a * t + e] = r[a];
	}
	let o = new Float64Array(t);
	for (let e = 0; e < n; e++) {
		for (let n = 0; n < t; n++) o[n] = i[e * t + n];
		let n = sr(o);
		for (let r = 0; r < t; r++) i[e * t + r] = n[r];
	}
	for (let e = 0; e < n; e++) for (let r = 0; r < t; r++) {
		let a = e * t + r;
		if (i[a] === 0) continue;
		let o = (e + 1) * (e + 1), s = (n - e) * (n - e), c = (r + 1) * (r + 1), l = (t - r) * (t - r), u = Math.min(o, s, c, l);
		u < i[a] && (i[a] = u);
	}
	for (let e = 0; e < t * n; e++) i[e] = Math.sqrt(i[e]);
	return i;
}
function fr(e, t, n, r, i, a) {
	let o = new Float32Array(t * n * 3), s = new Uint8Array(t * n), c = new Float32Array(t * n);
	if (t <= 0 || n <= 0) return {
		normals: o,
		bandMask: s,
		bandWeight: c
	};
	let l = dr(e, t, n, 1), u = r > 0 ? ur(l, t, n, Math.max(1, r * .25)) : l;
	for (let d = 0; d < n; d++) for (let f = 0; f < t; f++) {
		let p = d * t + f;
		if (o[p * 3 + 2] = 1, (e[p] ?? 0) === 0 || r <= 0 || a <= 0) continue;
		let m = Math.max(0, l[p] - .5);
		if (m >= r) continue;
		s[p] = 1, c[p] = 1;
		let h = Math.max(0, f - 1), g = Math.min(t - 1, f + 1), _ = Math.max(0, d - 1), v = Math.min(n - 1, d + 1), y = (u[d * t + g] - u[d * t + h]) / (g - h || 1), b = (u[v * t + f] - u[_ * t + f]) / (v - _ || 1), x = Math.hypot(y, b), S = Yn(i, m / r) * a / r, C = x > 1e-9 ? -S * y / x : 0, w = x > 1e-9 ? -S * b / x : 0, T = Math.hypot(C, w, 1);
		o[p * 3] = C / T, o[p * 3 + 1] = w / T, o[p * 3 + 2] = 1 / T;
	}
	return {
		normals: o,
		bandMask: s,
		bandWeight: c
	};
}
function pr(e, t, n) {
	return rr(e, t, n);
}
function mr(e) {
	return tr(e);
}
function hr(e, t, n) {
	if (!e) return {
		x: 0,
		y: 0,
		w: t,
		h: n
	};
	let r = Math.max(0, Math.floor(e.x)), i = Math.max(0, Math.floor(e.y)), a = Math.min(t, Math.ceil(e.x + e.w)), o = Math.min(n, Math.ceil(e.y + e.h));
	return {
		x: r,
		y: i,
		w: Math.max(0, a - r),
		h: Math.max(0, o - i)
	};
}
function gr(e, t, n) {
	if (e.canvas.width <= 0 || e.canvas.height <= 0) return;
	let r = t.camera ? Vn(t.camera) : void 0, i = r?.backFacing ?? !1;
	if (!!t.bottom !== i) return;
	let { x: a, y: o, w: s, h: c } = hr(n, e.canvas.width, e.canvas.height);
	if (s <= 0 || c <= 0) return;
	let l = e.getImageData(a, o, s, c), u = l.data, d = new Uint8ClampedArray(s * c);
	for (let e = 0; e < s * c; e++) d[e] = u[e * 4 + 3] > 0 ? 255 : 0;
	if (t.material === "legacyWireframe") {
		Xn(u, d, dr(d, s, c), s, c, t.widthPx, t.wireframeLinePx ?? 1, t.wireframeDepth), e.putImageData(l, a, o);
		return;
	}
	let { normals: f } = fr(d, s, c, t.widthPx, t.prst, t.heightPx), p = ir(t.material, t.light), m = new Float64Array(4);
	for (let e = 0; e < s * c; e++) {
		let n = e * 4;
		if (u[n + 3] === 0) continue;
		let i = f[e * 3], a = f[e * 3 + 1], o = f[e * 3 + 2];
		if (t.bottom && r) {
			let e = r.rotation, t = e[0] * i + e[1] * a - e[2] * o, n = e[3] * i + e[4] * a - e[5] * o;
			o = e[6] * i + e[7] * a - e[8] * o, i = t, a = n;
		}
		or(m, u[n], u[n + 1], u[n + 2], u[n + 3], i, a, o, p), u[n] = m[0], u[n + 1] = m[1], u[n + 2] = m[2], u[n + 3] = m[3];
	}
	e.putImageData(l, a, o);
}
function _r(e, t, n) {
	let r = e.canvas.width, i = e.canvas.height;
	if (r <= 0 || i <= 0) return;
	let a = t.offsetX, o = t.offsetY, s = Math.hypot(a, o);
	if (s < .75) return;
	let { x: c, y: l, w: u, h: d } = hr(n, r, i);
	if (u <= 0 || d <= 0) return;
	let f = e.getImageData(c, l, u, d), p = f.data, m = new Uint8ClampedArray(u * d);
	for (let e = 0; e < u * d; e++) m[e] = p[e * 4 + 3];
	let h = Math.max(1, Math.ceil(s)), [g, _, v] = t.rgb;
	for (let e = 0; e < d; e++) for (let t = 0; t < u; t++) {
		let n = e * u + t;
		if (m[n] > 0) continue;
		let r = !1;
		for (let n = 1; n <= h; n++) {
			let i = n / h, s = Math.round(t - a * i), c = Math.round(e - o * i);
			if (!(s < 0 || c < 0 || s >= u || c >= d) && m[c * u + s] > 0) {
				r = !0;
				break;
			}
		}
		if (!r) continue;
		let i = n * 4;
		p[i] = g, p[i + 1] = _, p[i + 2] = v, p[i + 3] = 255;
	}
	e.putImageData(f, c, l);
}
function vr(e, t) {
	return {
		top: e - t * .85,
		height: t * 1.1
	};
}
function yr(e, t, n, r, i = 0) {
	let a = [], o = 0, s = 0;
	for (let c of t) a.push({
		text: e.slice(o, c).join(""),
		dx: r(e.slice(0, o).join("")) + o * i + s * n
	}), o = c, s++;
	return a.push({
		text: e.slice(o).join(""),
		dx: r(e.slice(0, o).join("")) + o * i + s * n
	}), a;
}
function br(e) {
	return e;
}
var xr = .5;
function Sr(e, t) {
	if (!(t > 0) || !(e.h > 0)) return [{
		y: e.y,
		h: Math.max(0, e.h),
		radius: 0
	}];
	let n = Math.max(4, Math.min(24, Math.ceil(t / xr) + 1)), r = e.y + e.h, i = [];
	for (let a = 0; a < n; a++) {
		let o = Math.sqrt(a / (n - 1)), s = a === 0 ? 0 : Math.sqrt((a - 1) / (n - 1)), c = a === n - 1 ? 1 : Math.sqrt((a + 1) / (n - 1)), l = a === 0 ? 0 : (s + o) / 2, u = a === n - 1 ? 1 : (o + c) / 2, d = r - u * e.h;
		i.push({
			y: d,
			h: (u - l) * e.h,
			radius: t * a / (n - 1)
		});
	}
	return i;
}
function Cr(e, t, n, r, i) {
	for (let a of Sr(n, r)) e.save(), e.beginPath(), e.rect(0, a.y, i, a.h), e.clip(), e.filter = a.radius > 0 ? `blur(${a.radius}px)` : "none", e.drawImage(t, 0, 0), e.restore();
}
function wr(e, t) {
	let n = e !== void 0 && e !== "" ? e : void 0, r = t !== void 0 && t !== "" ? t : void 0;
	if (n === void 0 && r === void 0) return;
	if (r !== void 0) return {
		kind: "internal",
		ref: n ?? r
	};
	let i = n, a = Ut(i);
	return a !== null && Wt.includes(a) ? {
		kind: "external",
		url: i
	} : {
		kind: "internal",
		ref: i
	};
}
function Tr(e, t, n, r, i, a) {
	let o = Math.max(18, Math.min(32, Math.min(r, i) * .25));
	if (e.save(), e.shadowColor = "rgba(0, 0, 0, 0.3)", e.shadowBlur = o * .35, e.fillStyle = "rgba(20, 20, 20, 0.7)", e.beginPath(), e.arc(t, n, o, 0, Math.PI * 2), e.fill(), e.shadowColor = "transparent", e.shadowBlur = 0, e.fillStyle = "#fff", a === "paused") {
		e.beginPath();
		let r = o * .48;
		e.moveTo(t - r * .4, n - r), e.lineTo(t - r * .4, n + r), e.lineTo(t + r * .75, n), e.closePath(), e.fill();
	} else {
		let r = o * .2, i = o * .8, a = o * .15;
		e.fillRect(t - a - r, n - i / 2, r, i), e.fillRect(t + a, n - i / 2, r, i);
	}
	e.restore();
}
var Er = { isTab: (e) => "isTab" in e }, Dr = (e) => V(e), Or = (e, t) => ie(e, t, Er), kr = (e) => /\s/.test(String.fromCodePoint(e));
function Ar(e, t, n, r, i) {
	if (r === "just" && i) return null;
	let a = t - n;
	if (a <= .5) return null;
	let o = Bt(e, a, {
		firstContentSi: 0,
		lastDrawnSi: e.length,
		isGapChar: x,
		isWhitespace: kr,
		seaClusterGaps: r === "thaiDist"
	});
	if (!o) return null;
	let { perGap: s, perSeg: c } = o, l = [];
	for (let t = 0; t < e.length; t++) {
		let n = e[t], r = c.get(t), i = r?.trailingGap ? s : 0, a = r?.splitBefore;
		a && a.length > 0 ? l.push({
			...n,
			jext: i,
			splitBefore: [...a],
			perGap: s
		}) : l.push({
			...n,
			jext: i
		});
	}
	return l;
}
function jr(e) {
	let t = e ? Pt(e.replace(/^#/, "").slice(0, 6)) : null;
	return t ? {
		r: t[0],
		g: t[1],
		b: t[2]
	} : {
		r: 0,
		g: 0,
		b: 0
	};
}
function Mr(e) {
	let t = jr(e);
	return .299 * t.r + .587 * t.g + .114 * t.b;
}
function Nr(e, t) {
	if (!e && !t) return null;
	if (!e) return t;
	if (!t) return e;
	if (e.width !== t.width) return e.width > t.width ? e : t;
	let n = Mr(e.color), r = Mr(t.color);
	return n === r || n < r ? e : t;
}
function Pr(e) {
	let t = Pt(e.length === 8 ? e.slice(0, 6) : e);
	if (!t) return null;
	let n = Ft(t[0], t[1], t[2]);
	if (e.length !== 8) return n;
	let r = Number.parseInt(e.slice(6, 8), 16);
	if (Number.isNaN(r)) return null;
	let i = r / 255;
	return i * n + (1 - i);
}
function Fr(e) {
	if (!e) return null;
	if (e.fillType === "solid") return Pr(e.color);
	if (e.fillType === "gradient") {
		let t = e.stops.map((e) => ({
			p: Math.min(1, Math.max(0, e.position)),
			l: Pr(e.color)
		})).filter((e) => e.l !== null).sort((e, t) => e.p - t.p);
		if (t.length === 0) return null;
		let n = t[0], r = t[t.length - 1], i = n.l * n.p + r.l * (1 - r.p);
		for (let e = 0; e + 1 < t.length; e++) i += (t[e].l + t[e + 1].l) / 2 * (t[e + 1].p - t[e].p);
		return i;
	}
	return null;
}
function Ir(e) {
	return e.name === "SmartArt" && e.id === void 0;
}
function Lr(e, t) {
	let n = Fr(e);
	if (n === null || n >= .5) return null;
	let r = Pr(t.replace(/^#/, ""));
	return r !== null && r >= .5 ? null : "#FFFFFF";
}
function Rr(e, t, n, r, i, a = 0) {
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
var zr = () => !1;
function Br(e, t, n, r, i, a, o = "fill", s = zr) {
	let c = e.textAlign, l = e.textBaseline, u = o === "stroke" ? e.strokeText.bind(e) : e.fillText.bind(e), d = r - bt(e, t, i), f = 0;
	for (let o of t) {
		let t = o.codePointAt(0) ?? 0, l = ye(t), p = e.measureText(o).width + a, m = l === "Tr" ? le(t) : null, h = l === "Tr" && m === null && pe(t), g = l === "U" || l === "Tu" || m !== null || h;
		if (ue(t) && s(t)) {
			let t = n + f + p / 2;
			e.save(), e.translate(t, d), e.rotate(-Math.PI / 2), e.textAlign = "center", e.textBaseline = "middle", ve(e, () => u(o, 0, 0)), e.restore();
		} else if (g) {
			let r = m === null && l === "Tu" ? ge(t) : null, a = m === null ? r : m, s = a === null ? o : String.fromCodePoint(a), c = n + f + p / 2, h = r === null ? St(e, s) / i : 0;
			e.save(), e.translate(c, d), e.rotate(-Math.PI / 2), e.textAlign = "center", e.textBaseline = "middle", u(s, 0, h * i), e.restore();
		} else if (l === "Tr") {
			let t = n + f + p / 2;
			e.textAlign = "center", e.textBaseline = "middle", u(o, t, d);
		} else e.textAlign = c, e.textBaseline = "alphabetic", u(o, n + f, r);
		f += p;
	}
	e.textAlign = c, e.textBaseline = l;
}
function Vr(e, t, n, r, i, a, o = "fill") {
	Br(e, t, n, r, i, a, o, (t) => he(e, t));
}
var Hr = /* @__PURE__ */ new WeakMap();
function Ur(e) {
	let t = 0;
	for (let n of e) t++;
	return t;
}
function Wr(e) {
	let t = Hr.get(e);
	if (t !== void 0) return t;
	let n = e, r = n.letterSpacing;
	if (typeof r != "string") return Hr.set(e, !1), !1;
	let i = !1;
	try {
		n.letterSpacing = "0px";
		let t = e.measureText("ii").width;
		n.letterSpacing = "1px";
		let r = e.measureText("ii").width;
		i = Number.isFinite(t) && Number.isFinite(r) && r !== t;
	} catch {
		i = !1;
	} finally {
		try {
			n.letterSpacing = r;
		} catch {}
	}
	return Hr.set(e, i), i;
}
function Gr(e, t, n = 0) {
	let r = e, i = r.letterSpacing;
	if (n !== 0 && Wr(e)) try {
		r.letterSpacing = `${n}px`;
		let i = e.measureText(t).width;
		if (Number.isFinite(i)) return t.length > 0 ? i - n : i;
	} finally {
		try {
			r.letterSpacing = i;
		} catch {}
	}
	return e.measureText(t).width + n * Math.max(0, Ur(t) - 1);
}
function Kr(e, t) {
	let n = t.lineMetric?.glyph ?? (t.faceFamily ? Sn(t.faceFamily, /\bbold\b/.test(t.font), /\bitalic\b/.test(t.font)) : void 0);
	if (n) return n;
	e.font = t.font;
	let r = e.measureText("M"), i = t.sizePx || 1, a = r.fontBoundingBoxAscent, o = r.fontBoundingBoxDescent;
	return Number.isFinite(a) && Number.isFinite(o) && a + o > 0 ? {
		ascent: a / i,
		descent: o / i
	} : {
		ascent: .9,
		descent: .25
	};
}
function qr(e) {
	let t = /* @__PURE__ */ new Map();
	return (n, r, i = !1) => {
		let a = t.get(r);
		a || (a = Kr(e, r), t.set(r, a));
		let o = r.faceFamily ?? "", s = a.ascent + a.descent, c = bn * s * r.sizePx, l = r.faceFamilyLatin ?? o, u = r.lineMetricLatin?.glyph ?? Sn(l, /\bbold\b/.test(r.font), /\bitalic\b/.test(r.font)), d = l === o ? s : u ? u.ascent + u.descent : s, f = Math.max(c, bn * d * r.sizePx), p = r.letterSpacingPx ?? 0;
		return xn(n, {
			family: o,
			bold: /\bbold\b/.test(r.font),
			italic: /\bitalic\b/.test(r.font)
		}, {
			upright: c,
			verticalGlyph: r.sizePx,
			rotated: (t) => (e.font = r.font, e.measureText(t).width)
		}, i).map(({ text: e, kind: t, advance: n, nominal: i }) => ({
			text: e,
			style: r,
			kind: t,
			advance: n + p,
			thickness: f,
			space: e === " ",
			box: a,
			cell: c,
			...i ? { nominal: i } : {}
		}));
	};
}
function Jr(e, t) {
	let n = qr(e), r = t.paragraphs.map((e) => e.marker && "text" in e.marker ? n(e.marker.text, e.marker.style, !0) : []), i = dn(t.paragraphs.map((e, t) => ({
		runs: e.runs.map((e) => e.type === "object" && e.style.math ? {
			...e,
			width: e.style.math.ascent + e.style.math.descent
		} : e),
		alignment: e.alignment,
		marginStart: e.marginStart,
		marginEnd: e.marginEnd,
		firstLineIndent: e.firstLineIndent,
		firstLinePrefix: e.marker && ("text" in e.marker ? {
			advance: r[t].reduce((e, t) => e + t.advance, 0),
			thickness: r[t].reduce((e, t) => Math.max(e, t.thickness), 0)
		} : e.marker),
		lineSpacing: e.lineSpacing,
		spaceBefore: e.spaceBefore,
		spaceAfter: e.spaceAfter,
		emptyThickness: n("M", e.markStyle)[0].thickness,
		eastAsianLineBreak: e.eastAsianLineBreak
	})), {
		direction: t.vert,
		rect: t.rect,
		anchor: t.anchor,
		anchorCtr: t.anchorCtr,
		wrap: t.wrap,
		spcFirstLastPara: t.spcFirstLastPara,
		lnSpcReduction: t.lnSpcReduction,
		pxPerPt: t.pxPerPt,
		glyphs: n,
		sameStyle: t.sameStyle,
		objectGlyph: ({ style: e }) => {
			if (!e.math || !t.drawObject) throw Error("Missing stacked equation adapter");
			let n = e.math.ascent + e.math.descent;
			return {
				text: "",
				style: e,
				kind: "upright",
				advance: n,
				thickness: e.math.width,
				space: !1,
				box: {
					ascent: 0,
					descent: 0
				},
				cell: n
			};
		}
	}), a = i.columns.map(() => ({
		descent: 0,
		size: 0
	}));
	for (let e of i.glyphs) {
		if (e.style.math) continue;
		let t = a[e.column];
		t.descent = Math.max(t.descent, e.box.descent * e.style.sizePx), t.size = Math.max(t.size, e.style.sizePx);
	}
	if (t.drawUnderline) {
		let n, r = () => {
			if (!n) return;
			let r = i.columns[n.column], o = a[n.column];
			e.save(), e.translate(r.axisX - r.thickness / 2 + o.descent, n.top), e.rotate(Math.PI / 2), t.drawUnderline(n.style, n.bottom - n.top, o.size), e.restore();
		};
		for (let e of i.glyphs) {
			if (e.style.math) {
				r(), n = void 0;
				continue;
			}
			n && n.column === e.column && (t.sameUnderline?.(n.style, e.style) ?? n.style === e.style) ? n.bottom = e.cellTop + e.advance : (r(), n = {
				style: e.style,
				column: e.column,
				top: e.cellTop,
				bottom: e.cellTop + e.advance
			});
		}
		r();
	}
	let o = [], s = e.textAlign, c = e.textBaseline, l = (n, r, i, a) => {
		let s = a !== void 0, { style: c, box: l } = n;
		if (c.math) {
			t.drawObject(c, r - n.thickness / 2, i);
			return;
		}
		let u = c.sizePx;
		s || o.push({
			text: n.text,
			font: c.font,
			fontSize: u,
			x: r - n.thickness / 2,
			y: i,
			w: n.thickness,
			h: n.advance,
			...c.hyperlink ? { hyperlink: c.hyperlink } : {}
		}), e.font = c.font;
		let d = (n, r, i, a = !1) => {
			if (s || !c.strikethrough || !t.drawStrike) return;
			let o = e.measureText(n).width;
			t.drawStrike(c, a ? r - o / 2 : r, i, o);
		};
		if (!c.noFill) if (e.fillStyle = s && t.markerPaint ? t.markerPaint(a, r, i + n.cell - l.descent * u) : c.color, n.kind === "upright") {
			e.textAlign = "center", e.textBaseline = "alphabetic";
			let t = gn(i, n.cell, l, u);
			d(n.text, r, t, !0), n.space || e.fillText(n.text, r, t);
		} else if (n.kind === "verticalGlyph") {
			let a = un(n);
			if (a !== null) yn(e, a, r, i, l, u, (e, t) => d(a, e, t));
			else {
				let a = r - (l.ascent + l.descent) * u / 2;
				if (e.save(), e.translate(a + u / 2, i + u / 2), e.rotate(Math.PI / 2), e.textAlign = "center", !s && c.strikethrough && t.drawStrike) {
					e.textBaseline = "alphabetic";
					let t = e.measureText(n.text).fontBoundingBoxAscent;
					e.textBaseline = "middle";
					let r = e.measureText(n.text).fontBoundingBoxAscent, i = Number.isFinite(t - r) ? t - r : (l.ascent - l.descent) * u / 2;
					d(n.text, 0, i, !0);
				}
				e.textBaseline = "middle", e.fillText(n.text, 0, 0), e.restore();
			}
		} else Cn(e, n.text, r, i, l, u, () => d(n.text, 0, 0));
	}, u = 0;
	for (let [a, o] of i.columns.entries()) {
		if (o.prefixTop !== void 0) {
			let e = o.prefixTop;
			for (let t of r[o.paragraph]) l(t, o.axisX, e, o.paragraph), e += t.advance;
			t.drawMarker?.(o.paragraph, o.axisX, o.prefixTop);
		}
		let s;
		for (; u < i.glyphs.length && i.glyphs[u].column === a;) {
			let e = i.glyphs[u++];
			l(e, e.axisX, e.cellTop), s = e;
		}
		let c = t.paragraphs[o.paragraph].endMarkStyle ?? s?.style;
		if (s && c && !c.math && c.strikethrough && t.drawStrike && i.columns[a + 1]?.paragraph !== o.paragraph) {
			let r = n(" ", c)[0];
			e.font = c.font;
			let i = e.measureText(" ").width;
			t.drawStrike(c, o.axisX - i / 2, s.cellTop + s.advance + r.cell - r.box.descent * c.sizePx, i);
		}
	}
	return e.textAlign = s, e.textBaseline = c, o;
}
var Yr = [
	[12288, 40959],
	[44032, 55203],
	[63744, 64255],
	[65280, 65519]
], Xr = "/////wEA/zj+////////////f/7///////////////8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD//wAAAAD/////TwD+/wAAAAD///////////8P//////////////////////////9/+P//////////////P////39EAAAAAFAAAAAAAAAABQAAAAAEAAAAIBCCAAAIAAAAAAAAAIAAAAAAAAAAYAhAAAAAAAAAQAEAACAAAAQAABAAIAAAAAAAAAAABAAAAAAAAAAAQgIAAAAAAIAAAAAAAAAAAAAAAAAAAAAAAAAGGCAAACAAAAAAAAACAAAABAEQIAEAAAAAgEAAAQAAEAIAAAAAAAAAAAAAAAAAAAAAAAAEAACABAAAAAAAAAAAAIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAgAAAAAAAAAAAAAAMAAAAQAAABAABQEAAAAAAAAAAAggACAIQAAEABAAAggAAAAAAEAAIAAAEAAAAAAAAAAAAAAAAAAAAAAAAAACAAEAAAAAAAAAAJAAAAAAAAAAAAQAAAAAAAABAAAAAABABAAAAAAACAAAAAAAACAAAAAAEEBAAAIABAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAIAAAACkAAAAAAAAQAAAAAKAAAAAAAAAAAAAAAAAAgAAAAEAAAAAAAAIAAAAAAAAAAAAAAAAACgAAAAAAAAAAIEAAAgAAAAAAAAAAAAQgAAAAABAQAgAgEAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAQABAIAAAAAAEAAAAAAgAAAgAAAAAAAAAAAAAAAAAAAAAAAAAAEABAAABgBAEAAAAAAAICAAAQAQAAAIAAAAIQAAAEAAAAAAAACEAACAAAAAIAAAAAAAAAAAAACAAAAABAAAAACAEAAAAgAAAAAAAAAIAAAAgAAAAAAAAAAKAAAAAAAAAAAAAAAAQAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAgAABAAAAAAAAQQAAAAAAAAAAAAAAAACAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAAAgAAABBAAAAAAAgAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAgAAAAAAAAAAAAAAAAAAAAABAQEAAABAAAAAIAAAQAAAAAAAAAAAAAAAAAAAAAAAAAQAAIAAAAAAIAAAAAAAAAAAAAAAAAAgAAAAAAAAAAAAAAAAAAAAAAAv//3w1r/Z5u/6eL3DAM6wmV/9vt3+Uke3+3x7z/p7/gP/+c2AMD7f837//8Z1uv/fv/f7wPo5Pp//5e9f8Bv9ff+3//+f20K79fvlu00dyF75X/fD7S/br32e/f+435O33v1/4q1vp///72VdX/qWX3+7yN/P//1fL9ueed2/2f/Tf4htEfvH7i+8P171r+jvTf+nfm+83/7t/f7/xf/z++96/+7vy//7z+eX+vyv++cQVinc+/9LS3//O7///8FHv8P7NP/cnvd5yLA1H/7uHv/Z5D3/47/32cAAWf3TvTz83EAAMxue/O2y31bAAD438+e95h/RYD6Wp79HALA4uDn1wsAk/+73/oZSF+/dgXxnTDm5XveUC//i//7ac+mn79uvf/3menl9AcC9u+73g4buPafFwkhydn88Nsi8f99PyDq06Q3pgO+t8eWCyXTq7/Z8EdPDl++df/3N9qfPmS+fT++/+/h2MO/76//fDsefOyquPGNXlovH/b4zdaJG3KO1bmnYRDzEyFE7DSAzBAITd6FEC79VpvBFGtGYSwDG8AqJjRVQSsY9/14yyv1+//7v3zz/5f/8t3v99t75f7/zsRde2f/Y+0r3r/zcz6AlRegzz/+XaAKhSID53cswmj3r90KEqLMXS+SF7ZJxp4dvaqVWJU3iHrPa/9LvmvNOHavIentYbla89keff3/m8zgFPU96uNO33/+Lxvb/9//+/v++/P5s3XbO9++v/e/v89zl/+7M7g733MX/2+9gOT9v/evKgTPP/emv7+jwH5//u39B/959M86/69B/z/P9//ehx3z9vZ/KOet2f/Zn2zft7F/RFfP/yHw7rL09Zt3f/zPzh3r33t/XRvhSv495v9bQBnq/vT3/z8D9P7wnj9Lg4CvZP5e/r0b4Hv2vZ3Xdc///zRoe8N/HCt+/AdApt1Rdbdx5ATIHr2LolgvqIEv73p7Dfq2frcF/7b37DOHWPtc3vb/uOP3480YtSW+V6e7+/i9s37b1YvnMzfe3fd+8P//+55/34b////535t7x79VaDbb39NQvkFbvf+r6/z6xX3a5eLze/J/9P/YstrvP0eC/zt/x59/1tL/2h4A2eOGvx/7f3e/u4jI995+odm/7+9/Hni//7e7/ec++//PHm4Fe6tkRrh+f/+//wdkdhnj6Zfdq/3LY6zvfuovnL7uH0/97/BPZ4vWDA7F22qT+C/cG+lOE3v8lBUPPPyOx+ibmeTvyHZdq//eue9/LuDJHf+///n73I3K2IqCNOefithR+M0H7LX+ha1db/4z/Z8GbB//drb/Pq//HwiR3I7O8M9++zIAgN/71pETp3f+GwDctLP13Wfvd9//H7EPqO7/+lRfOP/e+YzJTOgFsEmzpezerL//OmIA+JTrVrd7DW2+b9kigJ7/V/ERdd9534X7xWtS7wcwzRPba3bjrqLtyZGVVphfMmE42mFxYkb0ixD4mw8AjXqzEBACJvibEFZD6EMR4l7vVvVTACKxlXSOBdEPxhtb/ZbhcCDbwSOprBC9df/v2e3/j8uW+5diTAiF8VdC31LliycymH+0LMz7tN/+7jjgxeHJ36cf+0750WUvrLpl/0xi62ay7/sGCgx2/3+G2yiu/t3vT0Dri4fX788nrgCXWd3dz9edenDu1fufz//Z/5f+977//+bePzY8CL/3//S8+5/SH9afv2z7/yM9H/8fZJO291d9/3lp/v/l0aduf9Ta+1VXW9NftN514/B35eTE3f8dHfYReHLEtfZr+ogipt799hsZZHI2Iu9wtYS40QZwG90UVML0uuWaty/84l9/jNOV3O7DUAfe4X4z/POP+/2lK4TeM/x6OcLPG++Xv3bl/z4DGY1/st+D6Lf//fPhsq8uced/Df/BCdZp3vj/Lr7vv1Pv1I0Wy+n/e6rj+3cg8fa/htDq9/8jtHc995/QLnEn/Vff+p7K6x3a52m0//+78i1yzqq1yfdpz/615/z3xYp0Tf2v/39P/C/2//nLfu5Fb69uu8r+zfz/7/385nd/v3YOMw+n+M/57u76bHXn5u4p+873f30AAAAAAAAAAAAAAAAAAAAAAABA/bjwP7n7b6fj7f3TdF7nVLNr1TSIa9sN/v/9//NTUfn+WQRExVeh/+ryW0h/9r4WB3j19G9z4H9/7C/AXZmSK3bgXL+A4+uTh3/NaX0dQz3tb+/q77s9f/+/993/Bl/8F/nKwrfd7dbrm25er/v/n/9gAL/e/63abv9fwPkO+f83veb/AQwAqbn1Znz/xT8i4KPWW7Ejj9c72vyqAgWWIjPg58af//77NzYIvdJCpxb/1/9LFoDUl7zNULvd/rx84EvP7/cfr4Du85+bu/X/0feG7iG3cyfI3vVsz0+WokG3R2D9/5+a4g6AP2o12q/7g/tqtt758gB//e8f1yrDlv4peqqje8VWmfw7qcON+Crs009lln287s/q7n/fjmFnHn9/7v8fi6fqBynE3xVNs/Q//D77goG/c9b0bXfhDedPf7LE3F/svfzLr/md45b9tAEA9DXoKlqjvdX/6X+8+nzrY/9573rv3v2678f7883a3L///Nd4+9X3fNP+QzmJUn7zXt9IutfzO/x99gAAAAAAAAAAAAAAAAAAAAAAAIDn4t+7L14/aF/kfh17l//dv//van5ftbf9uu/dCAAAAAAAAAAA8HrbgDYlI8JJmaxe5d3yrrqdP7Byn1PgzwT7I5f/Mfofslcevi4/b4b+a0z7vRaYDGmDf62X/fvr//jP//a+8T4AAAAAAAD4++H33XdsPwR97/Nvf/n774/3/tO+/n977/P1t7/fowtvhX9hulWk+zap9eB1IfVXreLXNsj/3A++NrwP7m6/UVb9f73/+9v/+vbjuvN2/3F40/nX/e/Df/fD4/spZ+6fsanEv+/5rbO7d42fVaEz9//f/AyQL/ddsf579Ae99E3ae3EG+j/L8/YBoi+e4/mHAsh+rToVLt4P7afwGgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgEPd/17j/ztU/sg/f/d3AAAAAAAAcHbVnr8XuNX5flT9/X7v8r/5x98/835m/wyPxw7951p+ngVPa97n5l/fb9q/c6rh1015ftf6f5t7E+D+jf7131d7+L150Pz+T+ycGwAAAAAAAO3TnfwZAJjv7l9wrBf//ddZPn7ne7fbAQAAAAAAwOtocT+2egM//4R8N/s+3E9GnWnrQb989q00DgAAAAAAAAD19dtbwf/b/f6+rn97Rb/t774+PvnyTWr9/IP57t/kwX+X28PH16m+za+nVb9/f/7n5276x939qW/lDQAAAAAAAAAAAAAAAOAa3QLMS6b5SJ0d/P4FH/I/ns1c2ObsBxLeNr/fhvjG6eodZ4RkZ34AAAAAAAAAAAAAIL+/2e7pcPc5/1j5N/ux8fe7jMP/jkeclv76zPzlz/fvJACg93AvAAAAcAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIwAAQAAAAAAAAQAAAAAAAAAAAAAAAQAAEAAAAAAPz////z/////////wMAAAAAAAAAAAAAAAAAAAAAAOD/////////////////////////DwAAAAAAAADw9wc=", Zr = [
	[12288, 12291],
	[12293, 12306],
	[12308, 12309],
	[12316, 12318],
	[12321, 12329],
	[12336, 12336],
	[12353, 12435],
	[12443, 12446],
	[12449, 12534],
	[12539, 12542],
	[12549, 12585],
	[12690, 12703],
	[12736, 12751],
	[12849, 12849],
	[12963, 12963],
	[13198, 13199],
	[13212, 13214],
	[13217, 13217],
	[13252, 13252],
	[13262, 13262],
	[13265, 13266],
	[13269, 13269],
	[13312, 19893],
	[19968, 40883],
	[40903, 40907],
	[63744, 64045],
	[65281, 65374],
	[65377, 65439],
	[65504, 65509],
	[65517, 65517]
], Qr = [
	[12288, 12351],
	[12353, 12438],
	[12441, 12543],
	[12549, 12587],
	[12688, 12727],
	[12736, 12751],
	[12784, 12799],
	[12849, 12849],
	[12963, 12963],
	[13198, 13199],
	[13212, 13214],
	[13217, 13217],
	[13252, 13252],
	[13262, 13262],
	[13265, 13266],
	[13269, 13269],
	[13312, 19893],
	[19968, 40883],
	[63744, 64045],
	[65281, 65470],
	[65474, 65479],
	[65482, 65487],
	[65490, 65495],
	[65498, 65500],
	[65504, 65510],
	[65512, 65518]
], $r = [
	"MS Mincho",
	"PMingLiU",
	"Batang"
], ei = [
	"MS Gothic",
	"Microsoft JhengHei",
	"Malgun Gothic"
], ti = Object.freeze([
	"Arial",
	"Angsana New",
	"Mangal",
	"Latha"
]), ni = /\p{Script=Thai}/u, ri = /\p{Script=Devanagari}/u, ii = /\p{Script=Tamil}/u;
function ai(e) {
	return ni.test(e) ? "Angsana New" : ri.test(e) ? "Mangal" : ii.test(e) ? "Latha" : "Arial";
}
var oi;
function si() {
	if (oi) return oi;
	let e = atob(Xr), t = new Uint8Array(e.length);
	for (let n = 0; n < e.length; n++) t[n] = e.charCodeAt(n);
	return oi = t, t;
}
function ci(e) {
	let t = 0;
	for (let [n, r] of Yr) {
		if (e >= n && e <= r) return t + e - n;
		t += r - n + 1;
	}
	return -1;
}
function li(e, t) {
	let n = 0, r = t.length - 1;
	for (; n <= r;) {
		let i = n + r >> 1, [a, o] = t[i];
		if (e < a) r = i - 1;
		else if (e > o) n = i + 1;
		else return !0;
	}
	return !1;
}
function ui(e) {
	let t = ci(e);
	return t < 0 ? !1 : (si()[t >> 3] & 1 << (t & 7)) != 0;
}
function di(e, t) {
	for (let n of t) {
		let t = n.codePointAt(0) ?? 0;
		if (!/\s/u.test(n) && !(e === "MS Mincho" || e === "MS Gothic" ? ui(t) : e === "PMingLiU" ? li(t, Zr) : e === "Microsoft JhengHei" && li(t, Qr))) return !1;
	}
	return !0;
}
function fi(e) {
	let t = w(e, { source: "office-mac" });
	return t.length > 0 ? t : w(e);
}
function pi(e) {
	return fi(e).some((e) => e.farEastCodePage === !0);
}
function mi(e) {
	return fi(e).some((e) => {
		let t = e.panose;
		return !!t && t[0] === 2 && t[1] >= 2 && t[1] <= 10;
	});
}
function hi(e, t) {
	if (e && pi(e)) return O(e) === "jp" ? [
		e,
		"Microsoft JhengHei",
		"Malgun Gothic"
	] : [
		e,
		"PMingLiU",
		"Batang"
	];
	let n = e && mi(e) ? $r : ei, r = n.slice(0, 2).find((e) => di(e, t));
	return r ? [r, ...n.filter((e) => e !== r)] : [
		n[2],
		n[0],
		n[1]
	];
}
var gi = new Set([
	167,
	168,
	176,
	177,
	180
]), _i = new Set([
	215,
	247,
	8263,
	8264
]), vi = /^(?:ja|ko|zh)(?:[-_]|$)/i, yi = /^(?:ar|he|hi|th)(?:[-_]|$)/i;
function bi(e, t) {
	return gi.has(e) || e >= 9312 && e <= 9471 || e >= 9632 && e <= 10175 || e >= 65072 && e <= 65103 ? !0 : _i.has(e) ? !yi.test(t ?? "") : e >= 8216 && e <= 8222 && vi.test(t ?? "");
}
function X(e, t) {
	return e * t;
}
function xi(e, t, n, r) {
	let i = je(Math.abs(e * n), Math.abs(t * n), r);
	return i ? {
		targetWidthPx: i.width,
		targetHeightPx: i.height
	} : void 0;
}
function Si(e, t) {
	return e.blipEffects?.length ? t.catch((e) => {
		throw ut(e);
	}) : t;
}
function Ci(e) {
	return e instanceof _ && e.code === "unsupported-image-effect";
}
function Z(e, t = e) {
	if (!e.blipEffects?.length) return e.duotone ?? void 0;
	let n = e.tile ? 914400 / (e.dpi != null && e.dpi > 0 ? e.dpi : 96) : void 0;
	return {
		effects: e.blipEffects,
		duotone: e.duotone ?? null,
		hostRotation: e.rotWithShape === !1 ? 0 : t.rotation,
		hostFlipH: t.flipH,
		hostFlipV: t.flipV,
		...n === void 0 ? {} : {
			emuPerPixelX: n,
			emuPerPixelY: n
		}
	};
}
function wi(e, t, n) {
	return e.tile && e.blipEffects?.length ? {
		widthPt: 0,
		heightPt: 0
	} : {
		widthPt: t,
		heightPt: n
	};
}
function Ti(e, t) {
	return At(e, t);
}
function Ei(e, t) {
	let n = e.targets.get(t);
	return n ? {
		targetWidthPx: n.width,
		targetHeightPx: n.height,
		maxRetainedPixels: n.maxRetainedPixels
	} : void 0;
}
function Di(e) {
	return !Z(e) && kt(e) ? e.svgImagePath : e.imagePath;
}
function Oi(e, t, n, r) {
	let i = br(t.bullet);
	if (i.type !== "blip") return;
	let a;
	for (let e of t.runs) if (e.type === "text" && e.fontSize != null) {
		a = e.fontSize;
		break;
	}
	let o = a ?? t.defFontSize ?? e.defaultFontSize ?? 18, s = i.sizePts == null ? o * ((i.sizePct ?? 100) / 100) : i.sizePts;
	return Math.max(1, s * K * n * r);
}
async function ki(e, t, n, r, i, a, o, s, c, l) {
	let u = Mt(a), d = [], f = [], p = (e, t, n, r, i, a = 1, o = i) => {
		if (!(!t || !i)) {
			if (lt(r) && (u.resolution === "display" || u.strategy === "adaptive")) {
				d.push({
					key: e,
					...t,
					retainedSurfaceCount: a
				});
				return;
			}
			f.push(Tt(n, r, i, o).then((n) => n.dimensions && dt(n.format, l !== void 0) ? {
				key: e,
				...t,
				sourceWidthPx: n.dimensions.width,
				sourceHeightPx: n.dimensions.height,
				retainedSurfaceCount: a
			} : null).catch((e) => {
				if (e instanceof g || Ci(e) || Ye(e)) throw e;
				return null;
			}));
		}
	}, m = e.background;
	if (m?.fillType === "image" && m.imagePath && !m.tile && !Z(m)) {
		let e = m.fillRect ?? {}, r = t * (1 - (e.l ?? 0) - (e.r ?? 0)), a = n * (1 - (e.t ?? 0) - (e.b ?? 0));
		p(Ti(m.imagePath, Z(m)), xi(r, a, i, m.srcRect), m.imagePath, m.mimeType, o, 1);
	}
	for (let t of e.elements) {
		for (let { fill: e, width: n, height: a } of Ai(t)) if (!e.tile && !Z(e)) {
			let t = e.fillRect ?? {}, s = X(n, r) * (1 - (t.l ?? 0) - (t.r ?? 0)), c = X(a, r) * (1 - (t.t ?? 0) - (t.b ?? 0));
			e.mimeType === "image/svg+xml" || kt(e) || p(Ti(e.imagePath, Z(e)), xi(s, c, i, e.srcRect), e.imagePath, e.mimeType, o, 1);
		}
		if (t.type === "picture") !(kt(t) || t.mimeType === "image/svg+xml") && !Z(t) && p(Ti(t.imagePath, Z(t)), xi(X(t.width, r), X(t.height, r), i, t.srcRect), t.imagePath, t.mimeType, o, 1);
		else if (t.type === "media" && t.posterPath) {
			let e = s ? xo(s) : void 0;
			p(Ti(t.posterPath), xi(X(t.width, r), X(t.height, r), i), t.posterPath, t.posterMimeType || "application/octet-stream", e, 1, c ?? e);
		} else if (t.type === "chart") {
			if (!Number.isFinite(t.width) || !Number.isFinite(t.height) || t.width < 0 || t.height < 0) throw new _("unsupported-image-effect", "Invalid chart image frame");
			if (!(t.width > 0 && t.height > 0)) continue;
			let e = {
				widthPt: t.width / K,
				heightPt: t.height / K,
				targetWidthPx: X(t.width, r) * i,
				targetHeightPx: X(t.height, r) * i
			};
			for (let n of Re(t.chart)) {
				let t = n.fill, r = Pe(n, e);
				!(t.mimeType === "image/svg+xml" || kt({
					svgImagePath: t.svgImagePath,
					srcRect: n.hasSourceCrop ? !0 : null
				})) && !Z(t) && !n.preserveNaturalSize && r?.targetWidthPx && r.targetHeightPx && p(Ti(t.imagePath, Z(t)), {
					targetWidthPx: r.targetWidthPx,
					targetHeightPx: r.targetHeightPx
				}, t.imagePath, t.mimeType, o, 1);
			}
		} else if (t.type === "shape") {
			if (!t.textBody) continue;
			for (let e of t.textBody.paragraphs) {
				let n = br(e.bullet);
				if (n.type !== "blip") continue;
				let a = Oi(t.textBody, e, r, i);
				!a || !o || f.push(Tt(n.imagePath, n.mimeType, o).then((e) => e.dimensions && e.dimensions.width > 0 && e.dimensions.height > 0 && dt(e.format, l !== void 0) ? {
					key: Ti(n.imagePath),
					targetWidthPx: a * e.dimensions.width / e.dimensions.height,
					targetHeightPx: a,
					sourceWidthPx: e.dimensions.width,
					sourceHeightPx: e.dimensions.height
				} : null).catch((e) => {
					if (e instanceof g || Ci(e) || Ye(e)) throw e;
					return null;
				}));
			}
		}
	}
	return d.push(...(await Promise.all(f)).filter((e) => e !== null)), Nt(d, u);
}
function* Ai(e) {
	let t = (t, n, r) => t?.fillType === "image" && Ma(t) ? {
		fill: t,
		width: n,
		height: r,
		host: e
	} : null;
	if (e.type === "shape") {
		if (e.fill?.fillType === "image" && (![e.width, e.height].every(Number.isFinite) || e.width < 0 || e.height < 0)) throw new _("unsupported-image-effect", "Invalid image fill frame");
		let n = t(e.fill, e.width, e.height);
		n && e.height > 0 && (yield n);
	} else if (e.type === "table") {
		let n = [0];
		for (let t of e.cols) n.push(n[n.length - 1] + t);
		let r = [0];
		for (let t of e.rows) r.push(r[r.length - 1] + t.height);
		let i = n[n.length - 1], a = r[r.length - 1] || e.height, o = t(e.background, i, a);
		o && (yield o);
		for (let i = 0; i < e.rows.length; i++) {
			let a = e.rows[i];
			for (let o = 0; o < a.cells.length; o++) {
				let s = a.cells[o];
				if (s.hMerge || s.vMerge || s.fill?.fillType !== "image" || !Ma(s.fill)) continue;
				let c = (n[Math.min(o + (s.gridSpan || 1), e.cols.length)] ?? 0) - (n[o] ?? 0), l = r[Math.min(i + (s.rowSpan || 1), e.rows.length)] - r[i] || e.height, u = t(s.fill, c, l);
				u && (yield u);
			}
		}
	}
}
function* ji(e) {
	for (let t of e.elements) yield* Ai(t);
}
function Mi(e) {
	return e.background?.fillType === "image" ? !0 : e.elements.some((e) => e.type === "picture" ? !0 : e.type === "media" ? !!e.posterPath : e.type === "chart" ? Re(e.chart).length > 0 : !Ai(e).next().done || (e.type === "shape" || e.type === "table") && e.mathFallback?.elements.length ? !0 : e.type === "shape" && (e.fill?.fillType === "image" || !!e.textBody?.paragraphs.some((e) => br(e.bullet).type === "blip")));
}
var Q = it;
function Ni(e, t, n, r, i, a, o, s) {
	let c = s?.glyph, { top: l, height: u } = s && c ? (() => {
		let e = n + 1.2 * i * (1 - s.share), t = (c.ascent + c.descent) * i;
		return {
			top: e - t,
			height: t
		};
	})() : vr(n, i);
	e.fillStyle = a, e.fillRect(t, l, r, u), e.fillStyle = o;
}
function Pi(e, t, n, r, i, a, o = 0, s = 4 / 3, c, l) {
	return ot(e, t, n, r, i, a, o, s, void 0, c, l);
}
function Fi(e, t, n, r, i, a, o, s, c = t.drawSizePx ?? t.sizePx) {
	if (t.underline && !t.underlineLineNoFill && (!t.noFill || t.underlineFill || t.underlineColor || t.underlineLine?.fill)) {
		let l = t.underlineFill ? ot(t.underlineFill, e, n, r, i, c * .05, 0, o * 12700) ?? "rgba(0,0,0,0)" : t.underlineLine?.fill ? ot(t.underlineLine.fill, e, n, r, i, c * .05, 0, o * 12700) ?? "rgba(0,0,0,0)" : t.underlineColor ?? a, d = t.lineMetric?.decoration;
		u(e, n, r, i, c, l, t.underlineStyle, s, t.underlineLine?.width ? X(t.underlineLine.width, o) : void 0, d ? {
			topPx: d.underlineTopEm * c,
			thicknessPx: d.underlineThicknessEm * c
		} : void 0);
	}
}
function Ii(e, t, n, r, i, a, o) {
	let s = t.drawSizePx ?? t.sizePx;
	if (t.strikethrough && !t.noFill) {
		let c = t.lineMetric?.decoration, u = c ? c.strikeThicknessEm * s : Math.max(1, s * d);
		e.strokeStyle = a, e.lineWidth = u, e.setLineDash([]);
		let p = c ? r + c.strikeTopEm * s + u / 2 : r - s * f;
		if (t.strikeDouble) {
			let t = c ? u : u * .9, r = p - t, a = p + t;
			e.beginPath(), e.moveTo(n, r + l(r, u, o)), e.lineTo(n + i, r + l(r, u, o)), e.moveTo(n, a + l(a, u, o)), e.lineTo(n + i, a + l(a, u, o)), e.stroke();
		} else {
			let t = p + l(p, u, o);
			e.beginPath(), e.moveTo(n, t), e.lineTo(n + i, t), e.stroke();
		}
	}
}
function Li(e, t, n, r, i, a, o, s) {
	Fi(e, t, n, r, i, a, o, s), Ii(e, t, n, r, i, a, s);
}
var Ri = /* @__PURE__ */ new WeakMap(), zi = /* @__PURE__ */ new WeakSet();
function* Bi(e) {
	if (e.type === "shape" && e.textBody) yield e.textBody;
	else if (e.type === "table") for (let t of e.rows) for (let e of t.cells) e.textBody && (yield e.textBody);
}
function Vi(e) {
	let t = [];
	for (let n of e.elements) for (let e of Bi(n)) for (let n of e.paragraphs) for (let e of n.runs) e.type === "math" && t.push({
		nodes: e.nodes,
		display: e.display
	});
	return t;
}
async function Hi(e, t) {
	let n = Vi(e);
	if (n.length !== 0) {
		try {
			await t.loadMathJax();
		} catch (e) {
			if (e instanceof g || Ye(e)) throw e;
			for (let e of n) Ri.has(e.nodes) || zi.add(e.nodes);
			return;
		}
		for (let e of n) if (!Ri.has(e.nodes)) try {
			let n = await t.mathMLToSvg(me(e.nodes, e.display)), r = await _e(n, "#000000");
			zi.delete(e.nodes), Ri.set(e.nodes, {
				raster: r,
				widthEm: n.widthEm,
				ascentEm: n.ascentEm,
				descentEm: n.descentEm,
				tinted: /* @__PURE__ */ new Map()
			});
		} catch (t) {
			if (t instanceof g || Ci(t) || Ye(t)) throw t;
			zi.add(e.nodes);
		}
	}
}
function Ui(e, t, n, r) {
	let i = t.math, a = i.unavailable ? void 0 : Ri.get(i.nodes), o = i.ascent + i.descent;
	if (i.width > 0 && o > 0) if (a) e.drawImage(fe(a, t.color), n, r, i.width, o);
	else if (i.fallbackText) {
		e.font = t.font, e.fillStyle = t.color;
		let a = e.textBaseline, o = e.textAlign;
		e.textBaseline = "top", e.textAlign = "left", e.fillText(i.fallbackText, n, r), e.textBaseline = a, e.textAlign = o;
	} else i.unavailable && ct(e, "equation", {
		x: n,
		y: r,
		width: i.width,
		height: o
	});
}
function Wi(e, t, n, r, i) {
	return t.patternFill ? ot(t.patternFill, e, n, r, 0, 0, 0, i * 12700) ?? t.color : t.color;
}
function Gi(e, t) {
	let n = (e) => t.embeddedFontAliases?.get(e.trim().toLowerCase()) ?? e;
	if (!e) return n(t.themeMinorFont ?? "sans-serif");
	if (e.startsWith("+")) return n(e === "+mj-lt" || e === "+mj-ea" || e === "+mj-cs" ? t.themeMajorFont ?? "sans-serif" : t.themeMinorFont ?? "sans-serif");
	let r = e.split(",")[0].trim();
	return r ? n(r) : t.themeMinorFont ?? "sans-serif";
}
function Ki(e) {
	return !!e?.trim();
}
var qi = new Set([
	"serif",
	"sans-serif",
	"monospace",
	"cursive",
	"fantasy",
	"system-ui"
]);
function Ji(e) {
	let t = k(e);
	return t === "mono" ? "monospace" : t === "serif" ? "serif" : "sans-serif";
}
function Yi(e) {
	if (s(e)?.includes("Arabic")) return !0;
	let t = e.toLowerCase();
	return /arabic|naskh|kufi|nastaliq|amiri|scheherazade|lateef|aldhabi|urdu|farsi|العرب|[؀-ۿ]/.test(t);
}
function Xi(e, t, n) {
	let r = n?.get(m(e));
	return r && b(r, t, "any") ? r.family : void 0;
}
function Zi(e, t = e, n, a = "", o) {
	let s = Ji(t), l = i(a), u = Xi(t, a, o), d = u ? `${c(u)}, ` : "", f = r(s === "serif"), m = l ? `${p(f)}, ` : "";
	if (Yi(t) && l) {
		let t = n ? T(n, "sans") : [];
		return `${c(e)}, ${d}${m}${t.length ? `${p(t)}, ` : ""}${s}`;
	}
	let h = s === "serif" ? "serif" : "sans", g = O(t), _ = g ?? n, v = _ ? T(_, h).filter((e) => e !== u) : [], y = v.length > 0 ? `${p(v)}, ` : "", b = `${p(h === "serif" ? D : A)}, `;
	return g ? `${c(e)}, ${d}${y}${b}${m}${s}` : `${c(e)}, ${d}${b}${y}${m}${s}`;
}
function Qi(e) {
	return e ? e.kind === "external" ? `e:${e.url}` : `i:${e.ref}` : "";
}
function $i(e) {
	let t = e.toLowerCase();
	return /\bthin\b/.test(t) ? 100 : /\b(extra[- ]?light|ultra[- ]?light)\b/.test(t) ? 200 : /\blight\b/.test(t) ? 300 : /\b(black|heavy)\b/.test(t) ? 900 : /\b(extra[- ]?bold|ultra[- ]?bold)\b/.test(t) ? 800 : /\b(semi[- ]?bold|demi[- ]?bold)\b/.test(t) ? 600 : /\bbold\b/.test(t) ? 700 : /\bmedium\b/.test(t) ? 500 : /\b(normal|regular)\b/.test(t) ? 400 : null;
}
function ea(e, t, n, r, i, o, s, c) {
	let l = Math.max(0, r.blur * i), u = Math.ceil(l * 3) + 2, d = Math.max(0, Math.floor(n.x - u)), f = Math.max(0, Math.floor(n.y - u)), p = Math.min(s, Math.ceil(n.x + n.w + u)), m = Math.min(c, Math.ceil(n.y + n.h + u)), h = Math.max(1, p - d), g = Math.max(1, m - f), _ = a(h, g), v = _?.getContext("2d");
	if (!_ || !v) return;
	v.save(), v.setTransform(o.a, o.b, o.c, o.d, o.e - d, o.f - f), st(e, v, () => t(v), {
		x: d,
		y: f
	}), v.restore();
	let y = n.y - f, b = y + n.h, x = _, S = v;
	if (l > 0) {
		let e = a(h, g), t = e?.getContext("2d");
		e && t && (x = e, S = t);
	}
	x !== _ && Cr(S, _, {
		x: n.x - d,
		y,
		w: n.w,
		h: n.h
	}, l, h);
	let C = Math.max(0, Math.min(1, r.stPos)), w = Math.max(0, Math.min(1, r.endPos)), T = Math.max(1, b - y);
	try {
		let e = S.getImageData(0, 0, h, g);
		for (let t = 0; t < g; t++) {
			let n = Math.max(0, Math.min(1, (b - (t + .5)) / T)), i;
			if (n <= C) i = r.stA;
			else if (n >= w || w <= C) i = r.endA;
			else {
				let e = (n - C) / (w - C);
				i = r.stA + (r.endA - r.stA) * e;
			}
			let a = Math.max(0, Math.min(1, i));
			for (let n = t * h * 4 + 3; n < (t + 1) * h * 4; n += 4) e.data[n] = Math.round(e.data[n] * a);
		}
		S.putImageData(e, 0, 0);
	} catch {
		S.save(), S.globalCompositeOperation = "destination-in", S.fillStyle = `rgba(0,0,0,${Math.max(0, Math.min(1, r.stA))})`, S.fillRect(0, 0, h, g), S.restore();
	}
	let E = r.dist * i, D = r.dir * Math.PI / 180, O = n.y + n.h;
	e.save(), e.setTransform(1, 0, 0, 1, 0, 0), e.translate(n.x + Math.cos(D) * E, O + Math.sin(D) * E), e.scale(r.sx, r.sy), e.translate(-n.x, -O), e.drawImage(x, d, f), e.restore();
}
function $(e, t, r, i, a, o = "", s = !0, c = []) {
	let l = t ? "italic " : "", u = Gi(i, a), { authoredFamily: d, officeRoute: f } = na(u, e, t, a), m = $i(d), h = e ? "bold " : m ? `${m} ` : "", g = s ? f : void 0, _ = C(o) ? a.cjkFallback ?? O(a.themeMajorFont) ?? O(a.themeMinorFont) ?? void 0 : void 0;
	if (qi.has(u)) {
		let e = _ ? T(_, u === "serif" ? "serif" : "sans") : [], t = u === "monospace" ? ["Courier New", "Liberation Mono"] : u === "serif" ? [
			...D,
			"Times New Roman",
			"Liberation Serif"
		] : [
			...A,
			"Arial",
			"Helvetica",
			"Liberation Sans"
		];
		return `${l}${h}${r}px ${n(`${e.length ? `${p([...t, ...e])}, ` : ""}${u}`, a.fontSources?.families)}`;
	}
	let v = Zi(g?.family ?? u, d, _, o, a.fontSources?.substitutions), y = c.filter((e) => e !== u);
	return `${l}${h}${r}px ${n(y.length ? v.replace(/^("(?:[^"\\]|\\.)*"), /u, (e, t) => `${t}, ${p(y)}, `) : v, a.fontSources?.families)}`;
}
function ta(e, t, n, r) {
	if (qi.has(e)) return;
	let { authoredFamily: i, embedded: a, officeRoute: o } = na(Gi(e, r), t, n, r);
	if (o) return Zt(a ? i : e, t, n);
	if (!(a || !aa(i, r))) return Zt(e, t, n);
}
function na(e, n, r, i) {
	let a = i.embeddedFontAuthoredFamilies?.get(e), o = a ?? e, s = $i(o), c = `${o.toLowerCase()}:${n || s === 700 ? 700 : 400}:${r ? "italic" : "normal"}`, l = i.embeddedFontTuples?.has(c) ? void 0 : i.officeFontRoutes ? t(i.officeFontRoutes, oa(o, qt(o, n, r), r)) : void 0;
	return {
		authoredFamily: o,
		embedded: a !== void 0,
		officeRoute: l
	};
}
function ra(e, t, n, r, i, a, o = !1) {
	let { authoredFamily: s } = na(t, n, r, i);
	return i.symbolFaces ? o && i.symbolFaces.draws(e, a) === void 0 ? [{
		text: e,
		mapped: !1
	}] : i.symbolFaces.segments(e, s, a, (e) => $(n, r, 32, "sans-serif", i, e)) : o ? [{
		text: e,
		mapped: !1
	}] : j(e, s);
}
function ia(e, t) {
	return t.embeddedFontAuthoredFamilies?.get(e) ?? e;
}
function aa(e, t) {
	return t.officeInstalledFamilies?.includes(S(e)) === !0;
}
function oa(e, t, n) {
	let r = S(e);
	return t === 400 && !n ? r : `${r}:${t}:${n ? "italic" : "normal"}`;
}
function sa(e) {
	return e.bullet.type === "char" || e.bullet.type === "autoNum" || br(e.bullet).type === "blip";
}
function ca(e, t, n) {
	let r = null;
	for (let e of t.runs) if (e.type === "text" && e.fontSize != null) {
		r = e.fontSize;
		break;
	}
	let i = r ?? t.defFontSize ?? e.defaultFontSize ?? 18;
	return n.sizePts == null ? i * ((n.sizePct ?? 100) / 100) : n.sizePts;
}
function la(e, t) {
	return e ? 0 : t;
}
var ua = /[\p{Script=Devanagari}\p{Script=Thai}\p{Script=Bengali}\p{Script=Tamil}\p{Script=Telugu}\p{Script=Kannada}\p{Script=Malayalam}\p{Script=Gujarati}\p{Script=Gurmukhi}\p{Script=Oriya}\p{Script=Sinhala}\p{Script=Khmer}\p{Script=Lao}\p{Script=Myanmar}\p{Script=Tibetan}]/u, da = [
	[1, .9],
	[.925, .9],
	[.85, .9],
	[.85, .8],
	[.775, .8],
	[.7, .8],
	[.625, .8],
	[.55, .8],
	[.475, .8],
	[.4, .8],
	[.325, .8],
	[.25, .8]
];
function fa(e, t) {
	let n = t.textXOffset;
	for (let r of t.line.segments) r.isTab ? n += r.tabWidthPx ?? 0 : r.math ? n += r.math.width : r.text && (e.font = r.font, n += (r.leadingLetterSpacingPx ?? 0) + va(e, r.text, r.letterSpacingPx ?? 0));
	return n > t.textMaxW + .5;
}
function pa(e, t) {
	return t != null && t !== 0 ? e * .65 : e;
}
function ma(e, t, n, r, i, a, o, s) {
	let c = (t.defaultFontSize ?? 18) * K * a;
	for (let l of t.paragraphs) {
		let u = X(l.marL, a), d = X(l.marR, a), f = X(l.indent, a), p = la(sa(l), f), m = n - r - i - u - d - p, { input: h } = ya(l, l.defFontSize == null ? c : l.defFontSize * K * a, "", a, t.defaultBold ?? !1, t.defaultItalic ?? !1, 1, s, o), g = 0, _;
		for (let t of h) {
			if (t.type !== "text") {
				_ = void 0;
				continue;
			}
			e.font = t.style.font;
			let n = t.style.letterSpacingPx ?? 0;
			if (g += va(e, t.text, n), _?.sourceRunId === t.style.sourceRunId && (g += n), _ = t.style, g > m) return !0;
		}
	}
	return !1;
}
function ha(e) {
	let t = 0;
	for (let n of e) t++;
	return t;
}
var ga = /* @__PURE__ */ new WeakMap();
function _a(e) {
	let t = ga.get(e);
	if (t != null) return t;
	let n = e, r = n.letterSpacing;
	if (typeof r != "string") return ga.set(e, !1), !1;
	let i = !1;
	try {
		n.letterSpacing = "0px";
		let t = e.measureText("ii").width;
		n.letterSpacing = "1px";
		let r = e.measureText("ii").width;
		i = Number.isFinite(t) && Number.isFinite(r) && r !== t;
	} catch {
		i = !1;
	} finally {
		try {
			n.letterSpacing = r;
		} catch {}
	}
	return ga.set(e, i), i;
}
function va(e, t, n) {
	let r = e, i = r.letterSpacing;
	if (n !== 0 && _a(e)) try {
		r.letterSpacing = `${n}px`;
		let i = e.measureText(t).width;
		if (Number.isFinite(i)) return t.length > 0 ? i - n : i;
	} finally {
		try {
			r.letterSpacing = i;
		} catch {}
	}
	let a = Math.max(0, ha(t) - 1);
	return e.measureText(t).width + n * a;
}
function ya(e, t, n, r, a, o, s, c, l, u = !1, d) {
	let f = [], p = e.runs.map((e) => e.type === "text" ? h(e, c) : null), m = [], g = "";
	for (let e of p) m.push(g.length), g += e ?? "\n";
	let _ = y(g);
	_.push(g.length);
	let v = 0, b = (e) => {
		for (; v < _.length && _[v] < e;) v++;
		return v < _.length ? _[v] : g.length;
	}, S = null, w = /* @__PURE__ */ new Map(), T;
	if (e.mathFallbacks?.length) {
		T = /* @__PURE__ */ new Map();
		let t = [0];
		for (let n of e.runs) t.push(t[t.length - 1] + (n.type === "math" && zi.has(n.nodes) ? 1 : 0));
		for (let n of e.mathFallbacks) {
			let { start: r, end: i } = n;
			Number.isInteger(r) && Number.isInteger(i) && r >= 0 && i <= e.runs.length && i > r && e.runs[r].type === "math" && t[i] > t[r] && i >= (T.get(r)?.end ?? r) && T.set(r, n);
		}
	}
	let D = 0;
	for (let [c, h] of e.runs.entries()) {
		if (c < D) continue;
		let g = T?.get(c);
		if (g && (D = g.end), h.type !== "text" && (S = null), h.type === "break") {
			let i = h.fontSize == null ? t : h.fontSize * K * r * s, c = Gi(h.fontFamily ?? e.defFontFamily ?? null, l), u = h.bold ?? e.defBold ?? a, d = h.italic ?? e.defItalic ?? o, p = h.fontSize != null || h.fontFamily != null || h.bold != null || h.italic != null ? {
				text: "",
				sizePx: i,
				color: n,
				font: $(u, d, i, c, l, ""),
				underline: !1,
				strikethrough: !1,
				lineMetric: ta(c, u, d, l)
			} : void 0;
			w.set(f.length, {
				text: "",
				sizePx: i,
				color: n,
				font: $(u, d, i, c, l, ""),
				underline: !1,
				strikethrough: !1,
				lineMetric: ta(c, u, d, l),
				markFace: {
					family: c,
					bold: u,
					italic: d
				}
			}), f.push({
				type: "break",
				style: p
			});
			continue;
		}
		if (h.type === "math") {
			let e = g ? void 0 : Ri.get(h.nodes), i = h.fontSize == null ? t : h.fontSize * K * r * s, a = !!g || !e && zi.has(h.nodes), o = g?.text ?? (a ? h.fallbackText : void 0);
			d && (d.font = `${i}px sans-serif`);
			let c = e ? e.widthEm * i : a ? d?.measureText(o ?? "Equation unavailable").width ?? 0 : 0, l = {
				text: "",
				font: `${i}px sans-serif`,
				sizePx: i,
				color: h.color ? Q(h.color) : n,
				underline: !1,
				strikethrough: !1,
				math: {
					nodes: h.nodes,
					display: h.display,
					width: c,
					ascent: e ? e.ascentEm * i : a ? i : 0,
					descent: e ? e.descentEm * i : 0,
					fallbackText: o,
					unavailable: a
				}
			};
			f.push({
				type: "object",
				width: c,
				style: l,
				display: h.display
			});
			continue;
		}
		let _ = h.fontSize == null ? t : h.fontSize * K * r * s, v = pa(_, h.baseline ?? void 0), y = Gi(h.fontFamily ?? e.defFontFamily ?? null, l), O = h.fontFamilySym ? Gi(h.fontFamilySym, l) : null, k = h.bold ?? e.defBold ?? a, A = h.italic ?? e.defItalic ?? o, j = p[c] ?? "", N = h.fontFamilyEa ? [] : hi(h.fontFamily ?? e.defFontFamily ?? l.themeMinorFont ?? null, [...j].filter((e) => x(e.codePointAt(0) ?? 0)).join("")), P = h.fontFamilyEa ? Gi(h.fontFamilyEa, l) : N[0], F = h.fontFamilyCs ? Gi(h.fontFamilyCs, l) : null, I = m[c], L = I + j.length;
		if (S && j) {
			let e = Math.min(b(I), L);
			e > I && (S.text += j.slice(0, e - I), j = j.slice(e - I), I = e);
		}
		let R = $(k, A, v, P, l, j, !0, N.slice(1)), ee = /* @__PURE__ */ new Map(), z = (e, t, n, r = []) => {
			let a = `${e}\0${+!!n}\0${+!!C(t)}\0${+!!i(t)}\0${r.join("\0")}`, o = ee.get(a);
			if (o !== void 0) return o;
			let s = $(k, A, v, e, l, t, n, r);
			return ee.set(a, s), s;
		}, B = (e, t) => z(e, t, !0, ti), V = (h.letterSpacing ?? 0) * K * r, te = {
			text: "",
			font: "",
			sizePx: _,
			drawSizePx: v,
			color: h.color ? Q(h.color) : h.hyperlink && !h.hyperlinkUsesTextFill && l.themeHlinkColor ? Q(l.themeHlinkColor) : n,
			patternFill: h.hyperlink && !h.hyperlinkUsesTextFill ? void 0 : h.patternFill,
			noFill: h.noFill,
			underline: h.underline || h.hyperlink !== void 0,
			underlineStyle: h.underlineStyle,
			underlineColor: h.underlineColor ? Q(h.underlineColor) : void 0,
			underlineFill: h.underlineFill,
			underlineLine: h.underlineLine,
			underlineLineNoFill: h.underlineLineNoFill,
			strikethrough: h.strikethrough,
			strikeDouble: h.strikeDouble === !0,
			letterSpacingPx: V || void 0,
			sourceRunId: c,
			lang: h.lang,
			baseline: h.baseline ?? void 0,
			shadow: h.shadow,
			reflection: h.reflection,
			outline: h.outline,
			highlight: h.highlight ? Q(h.highlight) : void 0,
			hyperlink: wr(h.hyperlink)
		}, H = "", U = "", ne, W = y, re = ta(y, k, A, l) ?? null, ie = () => {
			H && f.push({
				type: "text",
				text: H,
				style: {
					...te,
					font: U,
					lineMetric: ne,
					lineMetricLatin: re,
					faceFamily: W,
					faceFamilyLatin: y
				}
			}), H = "";
		}, G = M(ia(y, l)), ae = 0, oe = !1, se = "", ce = u && xa.test(h.lang ?? "");
		for (; ae < j.length;) {
			let t = Math.min(b(I + ae + 1), L) - I, n = j.slice(ae, t);
			ae = t, oe = !0;
			let r = String.fromCodePoint(n.codePointAt(0) ?? 0), i = n, a = r.codePointAt(0) ?? 0, o = !x(a) && !!h.fontFamilyEa && bi(a, h.lang), s = o || x(a), c = E(a) || ua.test(r), u = c ? F ?? ai(r) : y, d = o ? z(P, n, !0) : s ? R : c ? B(u, n) : z(y, n, Ki(h.fontFamily ?? e.defFontFamily)), f = s ? P : u, p = ta(f, k, A, l), m = a >= 61472 && a <= 61695, g = !s && !c && G, _ = m ? O ?? (g ? y : null) : g && a > 32 && a <= 255 ? y : null;
			if (_) {
				let e = ra(r, _, k, A, l, m ? $(k, A, v, _, l, r) : d, !m), t = e.some((e) => e.mapped);
				t || m ? (i = e.map((e) => e.text).join("") + n.slice(r.length), d = $(k, A, v, t ? "sans-serif" : _, l, i), p = void 0, f = t ? "sans-serif" : _) : e[0].text !== r && (i = e[0].text + n.slice(r.length));
			}
			let S = ce && (Sa(n) && Ca(se) || Sa(se) && Ca(n));
			H && (d !== U || p !== ne || S) && ie(), H += i, U = d, ne = p, W = f, se = n;
		}
		if (ie(), oe) {
			let e = f[f.length - 1];
			S = e?.type === "text" ? e : null;
		}
	}
	return {
		input: f,
		sameStyle: (e, t) => e.font === t.font && e.color === t.color && e.patternFill === t.patternFill && e.noFill === t.noFill && e.sizePx === t.sizePx && e.drawSizePx === t.drawSizePx && e.underline === t.underline && e.underlineStyle === t.underlineStyle && e.underlineColor === t.underlineColor && e.underlineFill === t.underlineFill && e.underlineLine === t.underlineLine && e.underlineLineNoFill === t.underlineLineNoFill && e.strikethrough === t.strikethrough && e.strikeDouble === t.strikeDouble && e.letterSpacingPx === t.letterSpacingPx && e.baseline === t.baseline && e.shadow === t.shadow && e.reflection === t.reflection && e.outline === t.outline && e.highlight === t.highlight && Qi(e.hyperlink) === Qi(t.hyperlink) && (!e.letterSpacingPx || e.sourceRunId === t.sourceRunId) && e.lineMetric === t.lineMetric && e.lineMetricLatin === t.lineMetricLatin,
		breakMarks: w
	};
}
var ba = /^ja(?:[-_]|$)/i, xa = /^(?:en-US|ja-JP)$/i;
function Sa(e) {
	return e === "“" || e === "”";
}
function Ca(e) {
	return /^\p{Script=Han}/u.test(e);
}
function wa(e, t, n, r) {
	return ba.test(e.lang ?? "") && ba.test(t.lang ?? "") && (Sa(n) && Ca(r) || Ca(n) && Sa(r));
}
function Ta(e, t, n, r, i, a, o, s = !1, c = !1, l = 1, u, d = {
	themeMajorFont: null,
	themeMinorFont: null,
	dpr: 1
}, f = 0) {
	let { input: p, sameStyle: m, breakMarks: h } = ya(t, r, i, a, s, c, l, u, d, !0, e), g = X(t.marR, a), _ = mn(p, {
		maxWidth: n,
		firstLineIndent: f,
		measureText(t, n) {
			return e.font = n.font, Gr(e, t, n.letterSpacingPx ?? 0);
		},
		sameStyle: m,
		boundaryAdvance: (e, t) => e.sourceRunId === t.sourceRunId ? t.letterSpacingPx ?? 0 : 0,
		tabStops: (t.tabStops ?? []).map((e) => ({
			pos: X(e.pos, a),
			algn: e.algn
		})),
		defaultTabSize: X(t.defTabSz ?? 914400, a),
		tabStartPen: (e) => t.rtl ? g : o + (e === 0 ? f : 0),
		nonMonotoneMeasure: p.some((e) => e.type === "text" && (e.style.letterSpacingPx ?? 0) < 0),
		eastAsianLineBreak: t.eaLnBrk !== !1,
		kinsokuAcrossRuns: wa
	}), v = t.endRunProperties, y = v?.fontSize == null ? r : v.fontSize * K * a * l, b = Gi(v?.fontFamily ?? t.defFontFamily ?? null, d), x = v?.bold ?? t.defBold ?? s, S = v?.italic ?? t.defItalic ?? c, C = v && (v.fontSize != null || v.fontFamily != null || v.bold != null || v.italic != null) ? {
		text: "",
		sizePx: y,
		color: i,
		font: $(x, S, y, b, d, ""),
		underline: !1,
		strikethrough: !1,
		lineMetric: ta(b, x, S, d)
	} : void 0, w = v ? {
		text: "",
		sizePx: y,
		color: i,
		font: $(x, S, y, b, d, ""),
		underline: !1,
		strikethrough: !1,
		lineMetric: ta(b, x, S, d),
		markFace: {
			family: b,
			bold: x,
			italic: S
		}
	} : void 0, T = (e, t) => {
		let n = t[t.length - 1];
		if (!n || !e.markFace || n.sizePx === e.sizePx) return {
			...e,
			text: ""
		};
		let { family: r, bold: i, italic: a } = e.markFace;
		return {
			...e,
			text: "",
			sizePx: n.sizePx,
			font: $(i, a, n.sizePx, r, d, "")
		};
	};
	return _.map((e, t) => {
		let n = t === _.length - 1, r = [...n && e.segments.length === 0 && C ? [C] : [], ...e.segments.length === 0 && e.lineFeedRun !== void 0 && !(n && C) && p[e.lineFeedRun]?.type === "text" ? [{
			...p[e.lineFeedRun].style,
			text: ""
		}] : e.segments.map((t, n) => {
			if (t.type === "text") {
				let r = e.segments[n - 1], i = r?.type === "text" && r.style.sourceRunId === t.style.sourceRunId ? t.style.letterSpacingPx : void 0;
				return {
					...t.style,
					text: t.text,
					leadingLetterSpacingPx: i
				};
			}
			return t.type === "tab" ? {
				...t.style,
				text: "",
				isTab: !0,
				tabWidthPx: t.width
			} : {
				...t.style,
				text: ""
			};
		})], i = e.endBreakRun !== void 0 && p[e.endBreakRun]?.type === "break", a = i ? p[e.endBreakRun].style : void 0, o = i ? h.get(e.endBreakRun) : void 0, s = e.segments.length > 0, c = s ? [...o ? [T(o, r)] : [], ...n && w ? [T(w, r)] : []] : [];
		return {
			segments: [...r, ...!s && a ? [{
				...a,
				text: ""
			}] : []],
			...c.length > 0 ? { metricMarks: c } : {},
			...e.endsWithBreak ? { endsWithBreak: !0 } : {}
		};
	});
}
var Ea = { paint: () => {} };
async function Da(e, t, n, r, i, a, o, s) {
	if (e && e.fillType === "image") {
		let c = (e) => {
			e.fillStyle = "#FFFFFF", e.fillRect(0, 0, t, n);
		};
		if (!e.imagePath || !e.mimeType || !i) return { paint: c };
		let l = (e) => ft(e, "tiff") ? { paint: (e) => {
			c(e), ct(e, "tiff", {
				x: 0,
				y: 0,
				width: t,
				height: n
			});
		} } : e instanceof g || Ci(e) || Ye(e) || gt(e) ? {
			paint: c,
			failure: { error: e }
		} : { paint: c }, u, d;
		try {
			let c = s && !Z(e) ? Ei(s, Ti(e.imagePath, Z(e))) : void 0;
			d = e.tile ? await Si(e, Tt(e.imagePath, e.mimeType, i)) : void 0, u = await Dt(e.imagePath, e.mimeType, Z(e.tile ? {
				...e,
				dpi: void 0
			} : e), i, {
				...e.blipEffects?.length && !e.tile ? ((e) => ({
					widthPt: e.width,
					heightPt: e.height
				}))(Se(t / r / K, n / r / K, e.srcRect, e.fillRect)) : wi(e, t / r / K, n / r / K),
				...c ?? {},
				tiff: a,
				svgDecoder: o
			});
		} catch (e) {
			return l(e);
		}
		if (!u) return { paint: c };
		let f = u;
		return { paint: (i) => {
			c(i);
			try {
				let a = e.fillRect ?? {}, o = a.l ?? 0, s = a.t ?? 0, c = a.r ?? 0, l = a.b ?? 0, u = o * t, p = s * n, m = t * (1 - o - c), h = n * (1 - s - l);
				i.save();
				try {
					i.beginPath(), i.rect(0, 0, t, n), i.clip(), e.alpha != null && (i.globalAlpha = e.alpha), e.tile ? Aa(i, f, e.tile, t, n, r, e.srcRect, d?.dimensions ?? void 0) : Ve(i, f, e.srcRect, u, p, m, h);
				} finally {
					i.restore();
				}
			} catch (r) {
				if (ft(r, "tiff")) {
					ct(i, "tiff", {
						x: 0,
						y: 0,
						width: t,
						height: n
					});
					return;
				}
				if (r instanceof g || Ci(r) || Ye(r) || gt(r)) throw r;
				if (e.blipEffects?.length) throw ut(r);
			}
		} };
	}
	return { paint: (i) => {
		i.fillStyle = Pi(e, i, 0, 0, t, n, 0, r * 12700) ?? "#FFFFFF", i.fillRect(0, 0, t, n);
	} };
}
function Oa(e, t, n, r, i) {
	let a;
	a = e === "t" || e === "ctr" || e === "b" ? (t - r) / 2 : e === "tr" || e === "r" || e === "br" ? t - r : 0;
	let o;
	return o = e === "l" || e === "ctr" || e === "r" ? (n - i) / 2 : e === "bl" || e === "b" || e === "br" ? n - i : 0, {
		ax: a,
		ay: o
	};
}
function ka(e, t, n) {
	return {
		width: e * (n ? 1 - n.l - n.r : 1),
		height: t * (n ? 1 - n.t - n.b : 1)
	};
}
function Aa(e, t, n, r, i, o, s, c, l = 96, u = {
	x: 0,
	y: 0,
	w: r,
	h: i
}) {
	let d = ze(t), f = ka(c?.width ?? d?.width ?? t.width, c?.height ?? d?.height ?? t.height, s), p = qe * 96 / l, m = f.width * p * (n.sx ?? 1) * o, h = f.height * p * (n.sy ?? 1) * o;
	if (![m, h].every((e) => Number.isFinite(e) && e > 0)) throw new _("unsupported-image-effect", "Unrepresentable picture tile size");
	let g = n.flip === "x" || n.flip === "xy", v = n.flip === "y" || n.flip === "xy", y = m * (g ? 2 : 1), b = h * (v ? 2 : 1);
	if (!Number.isFinite(y) || !Number.isFinite(b)) throw new _("unsupported-image-effect", "Unrepresentable picture tile cell");
	let x = Math.max(1, Math.ceil(y)), S = Math.max(1, Math.ceil(b)), C = x > 32767 || S > 32767 || x > Math.floor(16777216 / S);
	if (C && (x = Math.min(ke, Math.max(1, Math.ceil(Math.min(y, f.width * (g ? 2 : 1))))), S = Math.min(ke, Math.max(1, Math.ceil(Math.min(b, f.height * (v ? 2 : 1))))), x * S > 16777216)) {
		let e = Math.sqrt(Te / (x * S));
		x = Math.max(1, Math.floor(x * e)), S = Math.max(1, Math.floor(S * e));
	}
	let w = C ? x / y : 1, T = C ? S / b : 1, E = a(x, S);
	if (!E) throw new _("unsupported-image-effect", "Picture tile surface unavailable");
	let D = E.getContext("2d");
	if (!D) throw new _("unsupported-image-effect", "Picture tile surface unavailable");
	D.scale(w, T);
	let O = (e, n, r, i) => {
		D.save(), D.translate(e + (r ? m : 0), n + (i ? h : 0)), D.scale(r ? -1 : 1, i ? -1 : 1), Ve(D, t, s, 0, 0, m, h), D.restore();
	}, k = Ue(t, s != null), A = Math.ceil(k.x / (g ? 2 : 1)), j = Math.ceil(k.y / (v ? 2 : 1)), M = (2 * A + 1) * (2 * j + 1) * (g ? 2 : 1) * (v ? 2 : 1);
	if (!Number.isSafeInteger(M) || M > Xe * Xe) throw E.width = 0, new Ze("image-effect-work", Xe * Xe, Number.isSafeInteger(M) ? M : 2 ** 53 - 1);
	let N = M > (g ? 2 : 1) * (v ? 2 : 1) ? M * x * S : 0;
	if (!Number.isSafeInteger(N) || N > 134217728) throw E.width = 0, new Ze("image-effect-work", Je, Number.isSafeInteger(N) ? N : 2 ** 53 - 1);
	for (let e = -j; e <= j; e++) for (let t = -A; t <= A; t++) {
		let n = t * y, r = e * b;
		O(n, r, !1, !1), g && O(n + m, r, !0, !1), v && O(n, r + h, !1, !0), g && v && O(n + m, r + h, !0, !0);
	}
	let P = e.createPattern(E, "repeat");
	if (!P) throw new _("unsupported-image-effect", "Picture tile surface unavailable");
	let { ax: F, ay: I } = Oa(n.algn ?? "tl", r, i, m, h), L = F + X(n.tx ?? 0, o), R = I + X(n.ty ?? 0, o);
	if (![L, R].every(Number.isFinite)) throw new _("unsupported-image-effect", "Unrepresentable picture tile phase");
	return typeof P.setTransform == "function" && typeof DOMMatrix < "u" ? (P.setTransform(new DOMMatrix().translateSelf(L, R).scaleSelf(1 / w, 1 / T)), e.fillStyle = P, e.fillRect(u.x, u.y, u.w, u.h)) : (e.save(), e.translate(L, R), e.scale(1 / w, 1 / T), e.fillStyle = P, e.fillRect((u.x - L) * w, (u.y - R) * T, u.w * w, u.h * T), e.restore()), !0;
}
function ja(e, t, n, r = {}) {
	return JSON.stringify([
		e.svgImagePath ?? null,
		Ti(e.imagePath, Z(e, r)),
		...e.blipEffects?.length ? ((e) => [e.width, e.height])(e.tile ? {
			width: t,
			height: n
		} : Se(t, n, e.srcRect, e.fillRect)) : []
	]);
}
function Ma(e) {
	return e.tile != null != (e.stretch === !0);
}
function Na(e, t, n, r, i, a = !1, o = {
	rotation: 0,
	flipH: !1,
	flipV: !1
}) {
	if (![
		r.x,
		r.y,
		r.w,
		r.h,
		i
	].every(Number.isFinite) || r.w < 0 || r.h < 0) throw new _("unsupported-image-effect", "Invalid image fill geometry");
	if (!n || !(r.w > 0) || !(r.h > 0) || !Ma(t)) return !1;
	let { x: s, y: c, w: l, h: u } = r;
	e.save();
	try {
		e.clip(a ? "evenodd" : "nonzero"), t.alpha != null && (e.globalAlpha *= Math.max(0, Math.min(1, t.alpha)));
		let r = 0;
		if (t.rotWithShape === !1 && o.rotation !== 0) {
			let t = o.flipH === o.flipV ? -1 : 1;
			e.translate(s + l / 2, c + u / 2), r = t * o.rotation * Math.PI / 180, e.rotate(r), e.translate(-(s + l / 2), -(c + u / 2));
		}
		if (t.tile) {
			let a = Math.abs(Math.cos(r)), o = Math.abs(Math.sin(r)), d = l * a + u * o, f = l * o + u * a;
			e.translate(s, c);
			try {
				return Aa(e, n.image, t.tile, l, u, i, t.srcRect, n.intrinsicSize, t.dpi && t.dpi > 0 ? t.dpi : 96, {
					x: (l - d) / 2,
					y: (u - f) / 2,
					w: d,
					h: f
				});
			} catch (e) {
				throw t.blipEffects?.length ? ut(e) : e;
			}
		}
		let d = t.fillRect ?? {}, f = s + (d.l ?? 0) * l, p = c + (d.t ?? 0) * u, m = (1 - (d.l ?? 0) - (d.r ?? 0)) * l, h = (1 - (d.t ?? 0) - (d.b ?? 0)) * u;
		if (![
			f,
			p,
			m,
			h
		].every(Number.isFinite)) throw new _("unsupported-image-effect", "Unrepresentable image fill rectangle");
		return !(m > 0) || !(h > 0) ? !1 : (Ve(e, n.image, t.srcRect, f, p, m, h), !0);
	} finally {
		e.restore();
	}
}
function Pa(e, t, n) {
	if (!t) return;
	let r = t.dir * Math.PI / 180, i = X(t.dist, n);
	e.shadowColor = Q(t.color, t.alpha), e.shadowBlur = 0, e.shadowOffsetX = Math.cos(r) * i, e.shadowOffsetY = Math.sin(r) * i;
}
function Fa(e, t, n) {
	t && (e.shadowColor = Q(t.color, t.alpha), e.shadowBlur = X(t.radius, n), e.shadowOffsetX = 0, e.shadowOffsetY = 0);
}
function Ia(e) {
	e.shadowColor = "transparent", e.shadowBlur = 0, e.shadowOffsetX = 0, e.shadowOffsetY = 0;
}
var La = 8, Ra = 1, za = 1, Ba = 256;
function Va(e, t, n, r, i, o, s, c, l, u, d, f, p, m, h, g, _ = 0) {
	if (r <= 0) return;
	let v = e.measureText(t), y = v.actualBoundingBoxAscent > 0 ? v.actualBoundingBoxAscent : r, b = v.actualBoundingBoxDescent > 0 ? v.actualBoundingBoxDescent : r * .25, x = v.actualBoundingBoxLeft > 0 ? v.actualBoundingBoxLeft : 0, S = v.actualBoundingBoxRight > 0 ? v.actualBoundingBoxRight : r, C = r * u * i, w = Math.min(Ba, Math.max(1, Math.round(C / La))), T = (e) => Wa(e, o, r, s, c, l, d, f), E = T(w), D = Ka(E, o, s, c, l, d, f, u, i, -y, b);
	for (; D > za && w < Ba;) {
		let e = Math.min(Ba, w * 2), t = T(e), n = Ka(t, o, s, c, l, d, f, u, i, -y, b);
		if (n >= D * .75) {
			E = t;
			break;
		}
		w = e, E = t, D = n;
	}
	let O = 1e4, k = Ra / (u * i), A = E.length - 1, j = (e, t, n) => e === 0 ? -1e4 : t - n - k, M = (e, t, n) => e === A ? O : t - n + k, N = (e, r) => {
		_ > 0 ? (e.strokeStyle = r, e.lineWidth = _, e.lineJoin = "round") : e.fillStyle = r;
		for (let r = 0; r <= A; r++) {
			let { s0: i, s1: a, g: o } = E[r], s = (i + a) / 2;
			e.save(), e.translate(p + o.x, m + o.y), e.rotate(o.angle), o.shear !== 0 && e.transform(1, 0, o.shear, 1, 0, 0), (u !== 1 || o.vScale !== 1) && e.scale(u, o.vScale), e.beginPath();
			let c = j(r, i, s), l = M(r, a, s);
			e.rect(c, -1e4, l - c, 2 * O), e.clip(), _ > 0 ? e.strokeText(t, -s + n / 2, 0) : e.fillText(t, -s + n / 2, 0), e.restore();
		}
	}, P = typeof h == "string" ? Ha(h) : 1, F = typeof e.globalAlpha == "number" ? e.globalAlpha : 1;
	if (typeof h == "string" && P >= 1 && F >= 1) {
		N(e, h);
		return;
	}
	if (P <= 0 || F <= 0) return;
	let I = typeof e.getTransform == "function" ? e.getTransform() : null;
	if (!I) {
		N(e, h);
		return;
	}
	let L = Infinity, R = Infinity, ee = -Infinity, z = -Infinity;
	for (let e = 0; e <= A; e++) {
		let { s0: t, s1: r, g: i } = E[e], a = (t + r) / 2, o = -a + n / 2, s = Math.max(j(e, t, a), o - x), c = Math.min(M(e, r, a), o + S);
		if (!(c <= s)) for (let [e, t] of [
			[s, -y],
			[c, -y],
			[s, b],
			[c, b]
		]) {
			let n = Ga(i, u, e, t), r = p + n.x, a = m + n.y, o = I.a * r + I.c * a + I.e, s = I.b * r + I.d * a + I.f;
			o < L && (L = o), o > ee && (ee = o), s < R && (R = s), s > z && (z = s);
		}
	}
	if (!(ee > L && z > R)) return;
	let B = 2 + _ * i, V = Math.floor(L - B), te = Math.floor(R - B), H = Math.ceil(ee + B) - V, U = Math.ceil(z + B) - te, ne = a(H, U), W = ne ? ne.getContext("2d") : null;
	if (!ne || !W) {
		N(e, h);
		return;
	}
	W.font = e.font, W.textAlign = "left", W.textBaseline = "alphabetic", W.setTransform(I.a, I.b, I.c, I.d, I.e - V, I.f - te), typeof h == "string" ? N(W, Ua(h)) : (N(W, "#fff"), W.save(), W.setTransform(1, 0, 0, 1, 0, 0), W.globalCompositeOperation = "source-in", st(e, W, () => {
		W.fillStyle = g?.(W) ?? h, W.fillRect(0, 0, H, U);
	}, {
		x: V,
		y: te
	}), W.restore()), e.save(), e.setTransform(1, 0, 0, 1, 0, 0), e.globalAlpha = F * P, e.drawImage(ne, V, te), e.restore();
}
function Ha(e) {
	let t = /^rgba?\(\s*[\d.]+\s*,\s*[\d.]+\s*,\s*[\d.]+\s*,\s*([\d.]+)\s*\)$/i.exec(e);
	if (!t) return 1;
	let n = parseFloat(t[1]);
	return Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 1;
}
function Ua(e) {
	let t = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/i.exec(e);
	return t ? `rgb(${t[1]}, ${t[2]}, ${t[3]})` : e;
}
function Wa(e, t, n, r, i, a, o, s) {
	let c = Array(e);
	for (let l = 0; l < e; l++) {
		let u = l / e * n, d = (l + 1) / e * n;
		c[l] = {
			s0: u,
			s1: d,
			g: zt(t, (r + (u + d) / 2) / i * a, o, s)
		};
	}
	return c;
}
function Ga(e, t, n, r) {
	let i = n * t, a = r * e.vScale, o = i + e.shear * a, s = Math.cos(e.angle), c = Math.sin(e.angle);
	return {
		x: e.x + s * o - c * a,
		y: e.y + c * o + s * a
	};
}
function Ka(e, t, n, r, i, a, o, s, c, l, u) {
	let d = 0;
	for (let f of e) {
		let e = (f.s0 + f.s1) / 2;
		for (let p of [f.s0, f.s1]) {
			let m = zt(t, (n + p) / r * i, a, o);
			for (let t of [l, u]) {
				let n = Ga(m, s, 0, t), r = Ga(f.g, s, p - e, t), i = Math.hypot(r.x - n.x, r.y - n.y) * c;
				i > d && (d = i);
			}
		}
	}
	return d;
}
function qa(e, t, n, r, i, a, o, s, c, l, u) {
	let f = i, p = a, m = Math.max(1, o), h = Math.max(1, s), g = Rt(n, r, m, h);
	if (!g) return;
	let _ = t.defaultBold ?? !1, v = t.defaultItalic ?? !1, y = (t.defaultFontSize ?? 18) * K * c, b = [], x = 0;
	for (let n of t.paragraphs) {
		let t = n.defFontSize == null ? y : n.defFontSize * K * c, r = Ta(e, n, Infinity, t, n.defColor ? Q(n.defColor) : l, c, 0, _, v, 1, void 0, u, 0);
		b.length > 0 && (x += (n.spaceBefore ?? 0) / 100 * K * c);
		for (let e of r) {
			let r = e.segments.reduce((e, t) => Math.max(e, t.sizePx), 0) || t, i = n.spaceLine?.type === "pts" ? n.spaceLine.val * K * c : r * 1.2 * (n.spaceLine ? n.spaceLine.val / 1e5 : 1);
			b.push({
				line: e,
				alignment: n.alignment,
				baseline: x + i * .8
			}), x += i;
		}
		x += (n.spaceAfter ?? 0) / 100 * K * c;
	}
	if (b.length === 0) return;
	e.save(), e.textAlign = "left", e.textBaseline = "alphabetic";
	let S = -1, C = () => {
		if (S >= 0) return S;
		let t = typeof e.getTransform == "function" ? e.getTransform() : null, n = t ? Math.abs(t.a * t.d - t.b * t.c) : 1;
		return S = n > 0 ? Math.sqrt(n) : 1, S;
	}, w = b.length, T = g.top[0], E = g.top[1], D = T && E ? (T.x - m / 2) * (E.y - h / 2) - (T.y - h / 2) * (E.x - m / 2) > 0 : !0, O = b[D ? w - 1 : 0].baseline;
	for (let t = 0; t < w; t++) {
		let { line: i, alignment: a } = b[t], o = t / w, s = (t + 1) / w, l = 0, u = 0, _ = 0, v = 0;
		for (let t of i.segments) {
			if (t.math) {
				l += t.math.width, u = Math.max(u, t.sizePx), _ = Math.max(_, t.math.ascent), v = Math.max(v, t.math.descent);
				continue;
			}
			e.font = t.font;
			let n = t.letterSpacingPx ?? 0, r = e.measureText(t.text);
			l += r.width + n * ha(t.text), u = Math.max(u, t.sizePx), r.actualBoundingBoxAscent > 0 && (_ = Math.max(_, r.actualBoundingBoxAscent)), r.actualBoundingBoxDescent > 0 && (v = Math.max(v, r.actualBoundingBoxDescent));
		}
		if (l <= 0) continue;
		let y = g.singleEdge ? Math.max(0, D ? O - b[t].baseline : b[t].baseline - O) : 0, x = y > 0 ? Rt(n, r, m + 2 * y, h + 2 * y) ?? g : g, S = _ + v > 0 ? _ + v : u, T = g.singleEdge ? .8 : S > 0 ? _ / S : .8, E = g.singleEdge ? 1 : m / l, k = g.singleEdge ? S : S / (s - o), A = Lt(x, l), j = g.singleEdge ? (1 - A) * (a === "r" ? 1 : a === "ctr" ? .5 : 0) : 0, M = 0;
		for (let t of i.segments) {
			let n = M, r = g.singleEdge ? T : o + T * (s - o);
			if (t.math) {
				M += t.math.width;
				continue;
			}
			e.font = t.font;
			let i = Wi(e, t, f, p, c);
			e.fillStyle = i;
			let a = t.outline && t.outline.width > 0 ? t.outline : void 0, u = a?.fill, _ = a ? u ? ot(u, e, f, p, m, h, 0, c * K) : a.color ? `#${a.color}` : t.noFill ? void 0 : i : void 0, v = a ? Math.max(.5, X(a.width, c)) : 0, b = t.letterSpacingPx ?? 0, S = [...t.text];
			for (let n of S) {
				let r = e.measureText(n).width + b;
				if (t.noFill && !_) {
					M += r;
					continue;
				}
				let d = g.singleEdge ? T : o + T * (s - o);
				if (!g.singleEdge && r > 0) {
					t.noFill || Va(e, n, b, r, C(), g, M, l, A, E, k, d, f, p, i, t.patternFill ? (e) => Wi(e, t, f, p, c) : void 0), _ && a && Va(e, n, b, r, C(), g, M, l, A, E, k, d, f, p, _, u ? (e) => ot(u, e, f, p, m, h, 0, c * 12700) ?? "rgba(0,0,0,0)" : void 0, v), M += r;
					continue;
				}
				let S = zt(x, j + (M + r / 2) / l * A, k, d);
				S.x -= y, S.y -= y, e.save(), e.translate(f + S.x, p + S.y), e.rotate(S.angle), S.shear !== 0 && e.transform(1, 0, S.shear, 1, 0, 0), (E !== 1 || S.vScale !== 1) && e.scale(E, S.vScale), t.noFill || e.fillText(n, -r / 2 + b / 2, 0), _ && (e.strokeStyle = _, e.lineWidth = v, e.lineJoin = "round", e.strokeText(n, -r / 2 + b / 2, 0)), e.restore(), M += r;
			}
			if (t.underline && !t.underlineLineNoFill && M > n && (!t.noFill || t.underlineFill || t.underlineColor || t.underlineLine?.fill)) {
				let a = t.underlineFill ? ot(t.underlineFill, e, f, p, m, h, 0, c * K) : t.underlineLine?.fill ? ot(t.underlineLine.fill, e, f, p, m, h, 0, c * K) : t.underlineColor ?? i;
				if (a) {
					e.save(), e.strokeStyle = a, e.lineWidth = t.underlineLine?.width ? X(t.underlineLine.width, c) : Math.max(1, t.sizePx * d), e.beginPath();
					let i = Math.max(2, Math.ceil((M - n) / 8));
					for (let t = 0; t <= i; t++) {
						let a = zt(x, j + (n + (M - n) * t / i) / l * A, k, r), o = Math.max(2, e.lineWidth) * a.vScale, s = f + a.x - y - Math.sin(a.angle) * o, c = p + a.y + Math.cos(a.angle) * o;
						t === 0 ? e.moveTo(s, c) : e.lineTo(s, c);
					}
					e.stroke(), e.restore();
				}
			}
		}
	}
	e.restore();
}
function Ja(e, t, n, r, i, a, o) {
	let s = Math.min(r, i);
	switch (e) {
		case "rightarrow":
		case "leftarrow": {
			let c = Math.min(Math.max(a ?? 5e4, 0), 1e5), l = s * Math.min(Math.max(o ?? 5e4, 0), 1e5) / 1e5, u = i * c / 2e5, d = n + i / 2 - u, f = 2 * u, p = Math.max(0, r - l);
			return e === "rightarrow" ? {
				tx: t,
				ty: d,
				tw: p,
				th: f
			} : {
				tx: t + l,
				ty: d,
				tw: p,
				th: f
			};
		}
		case "roundrect": {
			let e = s * Math.min(Math.max(a ?? 16667, 0), 1e5) / 1e5 * (1 - 1 / Math.SQRT2);
			return {
				tx: t + e,
				ty: n + e,
				tw: Math.max(0, r - 2 * e),
				th: Math.max(0, i - 2 * e)
			};
		}
		default: return null;
	}
}
function Ya(e, t) {
	return e.defaultTextColor ? Q(e.defaultTextColor) : t.smartArtFallbackTextColor != null && Ir(e) ? t.smartArtFallbackTextColor : null;
}
function Xa(e, t, n) {
	return {
		outerRotation: e,
		localFlipH: t,
		localFlipV: n
	};
}
function Za(e, t, n, r, i) {
	let a = [
		{
			x: t,
			y: n
		},
		{
			x: t + r,
			y: n
		},
		{
			x: t,
			y: n + i
		},
		{
			x: t + r,
			y: n + i
		}
	].map((t) => ({
		x: e.a * t.x + e.c * t.y + e.e,
		y: e.b * t.x + e.d * t.y + e.f
	})), o = Math.min(...a.map((e) => e.x)), s = Math.min(...a.map((e) => e.y)), c = Math.max(...a.map((e) => e.x)), l = Math.max(...a.map((e) => e.y));
	return {
		x: o,
		y: s,
		w: c - o,
		h: l - s
	};
}
var Qa = {
	tl: [0, 0],
	t: [.5, 0],
	tr: [1, 0],
	l: [0, .5],
	ctr: [.5, .5],
	r: [1, .5],
	bl: [0, 1],
	b: [.5, 1],
	br: [1, 1]
};
function $a(e, t, n) {
	return [e.a * t + e.c * n + e.e, e.b * t + e.d * n + e.f];
}
function eo(e, n, r, i, a, o) {
	let [s, c] = t(Qa, o ?? "b") ?? Qa.b;
	return $a(e, n + s * i, r + c * a);
}
function to(e, t, n, r = 0, i = 0, a = 1) {
	r > (e.sceneDepth ?? 0) && (e = {
		...e,
		sceneDepth: r
	});
	let o = zn(e, t, n), [s, c, , l] = o.corners, u = (c.x - s.x) * (l.y - s.y) - (c.y - s.y) * (l.x - s.x) < 0, d = u && r > 0 ? zn(e, t, n, r) : o, f = Math.max(0, Math.ceil(i * a)), p = f > 0 ? vt(d.corners, f / a / t, f / a / n) : null;
	return p || (f = 0), {
		face: d.corners,
		corners: p ?? d.corners,
		backFacing: u,
		padDev: f,
		padCss: f / a
	};
}
function no(e, n, r, i, a, o, s, c, l = 0) {
	let u = Math.abs(n.a * n.d - n.b * n.c), { face: d, corners: f } = to(e, a, o, l, s, u > 0 ? Math.sqrt(u) : 1), p = f.map((e) => $a(n, r + e.x, i + e.y)), m = p.map(([e]) => e), h = p.map(([, e]) => e), g = Math.min(...m), _ = Math.min(...h), v = Math.max(...m), y = Math.max(...h), [b, x] = t(Qa, c ?? "b") ?? Qa.b, S = _t(d, b, x);
	return {
		bbox: {
			x: g,
			y: _,
			w: v - g,
			h: y - _
		},
		anchor: S ? $a(n, r + S.x, i + S.y) : eo(n, r, i, a, o, c)
	};
}
function ro(e, t, n, r, i) {
	let o = Math.floor(n.x) - 1, s = Math.floor(n.y) - 1, c = Math.max(1, Math.ceil(n.x + n.w) - o + 1), l = Math.max(1, Math.ceil(n.y + n.h) - s + 1);
	if (r && (o + c <= 0 || s + l <= 0 || o >= r.w || s >= r.h) || Ke(c, l).clamped) return e;
	let u = null;
	try {
		u = a(c, l);
	} catch {
		return e;
	}
	let d = u?.getContext("2d");
	if (!u || !d) return e;
	d.setTransform(t.a, t.b, t.c, t.d, t.e - o, t.f - s), i ? st(i, d, () => e(d), {
		x: o,
		y: s
	}) : e(d);
	let f = {
		a: 1,
		b: 0,
		c: 0,
		d: 1,
		e: 0,
		f: 0
	};
	return (e) => {
		e.save(), e.setTransform(f), e.drawImage(u, o, s), e.restore();
	};
}
function io(e, t, n, r, i, a, o, s, c, l = !0, u = !1) {
	let d = e.canvas.width || 0, f = e.canvas.height || 0, p = d > 0 && f > 0, m = {
		a: 1,
		b: 0,
		c: 0,
		d: 1,
		e: 0,
		f: 0
	}, h = (e) => e.setTransform(c), g = (t) => {
		h(t), st(e, t, () => n(t));
	}, _ = (t) => {
		h(t), st(e, t, () => r(t));
	}, v = u && p && (t.softEdge || t.innerShadow) ? Ce(_, we(i, t, s, d, f)) : null, y = !u || !!v, b = !1;
	t.shadow && p ? (e.save(), e.setTransform(m), b = !Ee(e, g, i, t.shadow, s, d, f, Math.atan2(c.b, c.a) * 180 / Math.PI, a), e.restore()) : t.shadow && (b = !0), t.reflection && p && (e.save(), e.setTransform(m), De(e, g, i, t.reflection, s, d, f), e.restore()), b ? Pa(e, t.shadow ?? null, o) : t.glow && Fa(e, t.glow, o), t.softEdge && p && y ? (e.save(), e.setTransform(m), Oe(e, g, i, t.softEdge, s, d, f, v ?? _), e.restore()) : n(e), (b || t.glow) && Ia(e), t.innerShadow && l && p && y && (e.save(), e.setTransform(m), Le(e, v ?? _, i, t.innerShadow, s, d, f), e.restore());
}
function ao(e, t, n) {
	if (t === n || !Number.isFinite(e)) return e;
	let r = ((e + 180) % 360 + 360) % 360 - 180;
	return r > 90 ? r -= 180 : r < -90 && (r += 180), Object.is(r, -0) ? 0 : r;
}
function oo(e, t, n, r) {
	return e === "wordArtVert" || e === "wordArtVertRtl" ? t + (r ? 180 : 0) : ao(t, n, r);
}
function so(e, t, n, r = "#000000", i, a = {
	themeMajorFont: null,
	themeMinorFont: null,
	dpr: 1
}, o, s) {
	tt(t.stroke?.fill) && (e = nt(e));
	let c = X(t.x, n), l = X(t.y, n), u = X(t.width, n), d = X(t.height, n), f = o && t.id !== void 0 ? (e) => o({
		...e,
		shapeId: t.id
	}) : o;
	if (d === 0 && t.textBody?.verticalAnchor === "b") {
		if (t.stroke && (e.save(), e.beginPath(), e.moveTo(c, l), e.lineTo(c + u, l), ko(e, t.stroke, n, {
			x: c,
			y: l,
			w: u,
			h: 1
		}, t.rotation), e.stroke(), e.restore()), t.textBody) {
			let o = Ya(t, a);
			mo(e, t.textBody, c, l, u, d, n, o, t.rotation, t.flipH, t.flipV, r, i, a, f, !1, s);
		}
		return;
	}
	let p = t.scene3d && {
		...t.scene3d.camera,
		unitsPerInch: 914400 * n,
		sceneDepth: (t.sp3d?.extrusionH ?? 0) * n
	}, m = p && Bn(p, u, d, (t.sp3d?.extrusionH ?? 0) * n) ? {
		...t.scene3d,
		camera: p
	} : null;
	if (m && u > 0 && d > 0) {
		let o = e.getTransform(), s = Math.abs(o.a * o.d - o.b * o.c), f = s > 0 ? Math.sqrt(s) : 1, p = ho(t.sp3d, t.scene3d?.lightRig, t.sp3d?.prstMaterial, n, f, m.camera), h = (p.find((e) => e.bottom)?.depthPx ?? 0) / f, g = go(t.sp3d, m.camera, u, d, n, f), _ = Xa(t.rotation, t.flipH, t.flipV);
		e.save(), _.outerRotation !== 0 && (e.translate(c + u / 2, l + d / 2), e.rotate(_.outerRotation * Math.PI / 180), e.translate(-(c + u / 2), -(l + d / 2)));
		let v = {
			...t,
			x: 0,
			y: 0,
			rotation: 0,
			flipH: _.localFlipH,
			flipV: _.localFlipV,
			scene3d: void 0,
			sp3d: void 0,
			shadow: null,
			innerShadow: void 0,
			glow: void 0,
			softEdge: void 0,
			reflection: void 0
		}, y = {
			...v,
			textBody: null
		}, b = {
			...v,
			fill: null,
			stroke: null
		}, x = (t.stroke ? t.stroke.width * n / 2 : 0) + (t.sp3d?.contourW ? t.sp3d.contourW * n : 0) + (g ? Math.hypot(g.offsetX, g.offsetY) / f : 0) + 2, S = t.textBody?.paragraphs.some((e) => e.runs.some((e) => e.type === "text" && (e.patternFill?.fillType === "pattern" || e.outline?.fill?.fillType === "pattern" || e.underlineFill?.fillType === "pattern"))) ?? !1, C = (e, t, o, s = !1) => vo(e, m.camera, c, l, u, d, (e) => {
			so(e, t, n, r, i, a, void 0);
		}, o ? {
			bevels: p,
			backDepthCss: h,
			extrusion: g ?? void 0,
			edgePadCss: x,
			preservePatternFrame: s
		} : {
			preservePatternFrame: s,
			measureOverflow: !0
		}), w = (e) => C(e, y, !0), T = (e) => {
			!t.textBody || C(e, b, !1, S) || (e.save(), e.translate(c, l), so(e, b, n, r, i, a), e.restore());
		};
		if (t.shadow || t.innerShadow || t.glow || t.softEdge || t.reflection) {
			let r = e.getTransform(), i = Math.abs(r.a * r.d - r.b * r.c), a = i > 0 ? Math.sqrt(i) : 1, o = no(m.camera, r, c, l, u, d, x, t.shadow?.algn, h), s = !1, f = ro((e) => {
				s = w(e) || s;
			}, r, o.bbox, {
				w: e.canvas.width || 0,
				h: e.canvas.height || 0
			}, e);
			if (io(e, t, f, f, o.bbox, o.anchor, n, n * a, r, !!t.fill, !0), s) {
				T(e), e.restore();
				return;
			}
		} else if (p.length > 0 ? w(e) : C(e, v, !0, S && t.fill?.fillType !== "pattern")) {
			p.length > 0 && T(e), e.restore();
			return;
		}
		e.restore();
	}
	e.save(), (t.rotation !== 0 || t.flipH || t.flipV) && (e.translate(c + u / 2, l + d / 2), e.rotate(t.rotation * Math.PI / 180), t.flipH && e.scale(-1, 1), t.flipV && e.scale(1, -1), e.translate(-(c + u / 2), -(l + d / 2)));
	let h = t.geometry.toLowerCase(), g = (e, n, r, i, a) => {
		t.custGeom ? co(e, t.custGeomPaint?.length === t.custGeom.length ? t.custGeom.filter((e, n) => t.custGeomPaint?.[n].fill !== "none") : t.custGeom, n, r, i, a) : I(e, h, n, r, i, a, [
			t.adj,
			t.adj2,
			t.adj3,
			t.adj4,
			t.adj5,
			t.adj6,
			t.adj7,
			t.adj8
		]) || z(e, h, n, r, i, a, t.adj, t.adj2, t.adj3, t.adj4);
	}, _ = Pi(t.fill, e, c, l, u, d, t.rotation, n * K, g), v = t.fill?.fillType === "image" && Ma(t.fill) ? t.fill : null, y = v ? a.shapeFillImages?.get(ja(v, t.width, t.height, t)) : void 0, b = !!(v && y);
	t.shadow || Fa(e, t.glow ?? null, n);
	let x = ne(h, t.stroke, n, K, !0), S = t.stroke?.headEnd ? ee(t.stroke.headEnd, t.stroke, n, K) : 0, C = t.stroke?.tailEnd ? ee(t.stroke.tailEnd, t.stroke, n, K) : 0, w = t.custGeom && t.custGeom.length > 0 && (S > 0 || C > 0) ? R(t.custGeom) : null, T = w?.start ? S : 0, E = w?.end ? C : 0, D = !t.custGeom && W(h), O = (r, i, a = {
		x: c,
		y: l,
		w: u,
		h: d
	}) => {
		tt(t.stroke?.fill) && (r = nt(r));
		let { x: o, y: s, w: f, h: p } = a, m = i ?? (r === e && o === c && s === l && f === u && p === d ? _ : Pi(t.fill, r, o, s, f, p, t.rotation, n * 12700, g)), b = i ? null : t.stroke ? () => {
			ko(r, t.stroke, n, {
				x: o,
				y: s,
				w: f,
				h: p
			}, t.rotation), r.stroke();
		} : null, S = () => Ia(r), C = h === "donut" || h === "smileyface" || h === "frame", w = v && !i ? (e, r = C) => Na(e, v, y, {
			x: o,
			y: s,
			w: f,
			h: p
		}, n, r, t) : void 0;
		if (D && !i) {
			let e = x?.restroke != null;
			xe(r, h, o, s, f, p, [
				t.adj,
				t.adj2,
				t.adj3,
				t.adj4,
				t.adj5,
				t.adj6,
				t.adj7,
				t.adj8
			], m, b, S, e || w ? {
				...e ? { skipTrailingStroke: !0 } : {},
				paintFill: w
			} : void 0);
			return;
		}
		let O = t.custGeom && t.custGeomPaint?.length === t.custGeom.length ? t.custGeomPaint : null;
		if (t.custGeom && O) {
			let e = !1;
			t.custGeom.forEach((n, a) => {
				let c = O[a], l = c.fill !== "none", u = c.fillRule === "evenodd" ? "evenodd" : "nonzero";
				if (!(i && !l)) {
					if (r.beginPath(), co(r, [n], o, s, f, p), l) {
						let t = !1;
						if (w) {
							r.save();
							try {
								t = w(r, C || u === "evenodd");
							} finally {
								r.restore();
							}
						} else m && (r.fillStyle = m, r.fill(u), t = !0);
						let n = t && !i ? N(c.fill) : null;
						n && (r.save(), r.fillStyle = n, r.fill(u), r.restore()), t && !i && !e && (S(), e = !0);
					}
					if (c.stroke && b) {
						let e = a === 0 ? T : 0, i = a === t.custGeom.length - 1 ? E : 0;
						(e > 0 || i > 0) && (r.beginPath(), te(r, (e) => co(e, [n], o, s, f, p), e, i)), b();
					}
				}
			});
			return;
		}
		r.beginPath(), t.custGeom && t.custGeom.length > 0 ? co(r, t.custGeom, o, s, f, p) : z(r, h, o, s, f, p, t.adj, t.adj2, t.adj3, t.adj4), w && h !== "arc" ? w(r) && S() : m && h !== "arc" && (r.fillStyle = m, C ? r.fill("evenodd") : r.fill(), i || S()), b && (t.custGeom && t.custGeom.length > 0 && (T > 0 || E > 0) && (r.beginPath(), te(r, (e) => co(e, t.custGeom, o, s, f, p), T, E)), b());
	}, k = e.getTransform(), A = Math.abs(k.a * k.d - k.b * k.c), j = A > 0 ? Math.sqrt(A) : 1, M = (t.shadow || t.reflection || t.softEdge || t.innerShadow ? D ? L(h, c, l, u, d, [
		t.adj,
		t.adj2,
		t.adj3,
		t.adj4,
		t.adj5,
		t.adj6,
		t.adj7,
		t.adj8
	]) : t.custGeom && t.custGeom.length > 0 ? P(t.custGeom, c, l, u, d) : null : null) ?? {
		x: c,
		y: l,
		w: u,
		h: d
	}, V = t.stroke ? t.stroke.width * n / 2 : 0, ie = t.stroke ? Math.max(t.stroke.headEnd ? ae(t.stroke.headEnd, t.stroke, n, K) : 0, t.stroke.tailEnd ? ae(t.stroke.tailEnd, t.stroke, n, K) : 0) : 0, se = t.sp3d?.contourW ? t.sp3d.contourW * n : 0, ce = Math.max(V, ie, se), le = ce > 0 ? {
		x: M.x - ce,
		y: M.y - ce,
		w: M.w + ce * 2,
		h: M.h + ce * 2
	} : M, ue = Za(k, le.x, le.y, le.w, le.h), de = n * j, fe = m ? [] : ho(t.sp3d, t.scene3d?.lightRig, t.sp3d?.prstMaterial, n, j, t.scene3d?.camera), pe = (t.stroke ? t.stroke.width * n / 2 : 0) + 2, me = (e) => {
		if (tt(t.stroke?.fill) && (e = nt(e)), t.stroke && re(h)) {
			let r = [
				t.adj,
				t.adj2,
				t.adj3,
				t.adj4,
				t.adj5,
				t.adj6,
				t.adj7,
				t.adj8
			], i = F(h, c, l, u, d, r);
			if (!i) return;
			let a = t.stroke.cmpd, o = h === "line" || h === "straightconnector1";
			if (x?.restroke && !(a && o) && (e.beginPath(), U(e, x, h, i, c, l, u, d, r) && (ko(e, t.stroke, n, {
				x: c,
				y: l,
				w: u,
				h: d
			}, t.rotation), e.stroke())), a && o) {
				let r = G([{
					op: "moveTo",
					args: [i.start.x, i.start.y]
				}, {
					op: "lineTo",
					args: [i.end.x, i.end.y]
				}], S, C);
				r.length === 2 && Oo(e, {
					x: r[0].args[0],
					y: r[0].args[1]
				}, {
					x: r[1].args[0],
					y: r[1].args[1]
				}, t.stroke, a, n, t.rotation);
			}
			H(e, i, t.stroke, n, K, {
				x: c,
				y: l,
				w: u,
				h: d
			}, t.rotation, n * K);
			return;
		}
		if (!t.stroke || !t.custGeom || t.custGeom.length === 0 || (!t.stroke.headEnd || t.stroke.headEnd.type === "none") && (!t.stroke.tailEnd || t.stroke.tailEnd.type === "none")) return;
		let { start: r, end: i } = R(t.custGeom);
		r && t.stroke.headEnd && t.stroke.headEnd.type !== "none" && B(e, c + r.x * u, l + r.y * d, Math.atan2(r.dy * d, r.dx * u), t.stroke.headEnd, t.stroke, n, K, oe(e, t.stroke, n, K, c + r.x * u, l + r.y * d, Math.atan2(r.dy * d, r.dx * u), t.stroke.headEnd, {
			x: c,
			y: l,
			w: u,
			h: d
		}, t.rotation, n * K)), i && t.stroke.tailEnd && t.stroke.tailEnd.type !== "none" && B(e, c + i.x * u, l + i.y * d, Math.atan2(i.dy * d, i.dx * u), t.stroke.tailEnd, t.stroke, n, K, oe(e, t.stroke, n, K, c + i.x * u, l + i.y * d, Math.atan2(i.dy * d, i.dx * u), t.stroke.tailEnd, {
			x: c,
			y: l,
			w: u,
			h: d
		}, t.rotation, n * K));
	}, he = (e) => {
		if (fe.length > 0 && yo(e, c, l, u, d, fe, (e, t, n, r, i) => O(e, void 0, {
			x: t,
			y: n,
			w: r,
			h: i
		}), void 0, pe)) {
			me(e), Ia(e);
			return;
		}
		O(e), me(e);
	};
	if (io(e, t, he, he, ue, eo(k, c, l, u, d, t.shadow?.algn), n, de, k, !!_ || b, !0), t.textBody) {
		let o = Ya(t, a), p = oo(t.textBody.vert, t.rotation, t.flipH, t.flipV);
		if (e.save(), t.flipH || t.flipV) {
			let n = c + u / 2, r = l + d / 2;
			e.translate(n, r), t.flipH && e.scale(-1, 1), t.flipV && e.scale(1, -1), e.translate(-n, -r);
		}
		let m = (p - t.rotation) % 360;
		if (m !== 0) {
			let t = c + u / 2, n = l + d / 2;
			e.translate(t, n), e.rotate(m * Math.PI / 180), e.translate(-t, -n);
		}
		let g = c, _ = l, v = u, y = d;
		if (t.textRect) g = X(t.textRect.x, n), _ = X(t.textRect.y, n), v = X(t.textRect.width, n), y = X(t.textRect.height, n);
		else if (h === "ellipse") {
			let e = u * (1 - 1 / Math.SQRT2) / 2, t = d * (1 - 1 / Math.SQRT2) / 2;
			g = c + e, _ = l + t, v = u / Math.SQRT2, y = d / Math.SQRT2;
		} else {
			let e = Ja(h, c, l, u, d, t.adj, t.adj2);
			e && (g = e.tx, _ = e.ty, v = e.tw, y = e.th);
		}
		mo(e, t.textBody, g, _, v, y, n, o, p, !1, !1, r, i, a, f, !1, s), e.restore();
	}
	e.restore();
}
var co = se;
function lo(e) {
	for (let t of e.runs) if (t.type === "text" && t.text !== "" || t.type === "math") return !0;
	return !1;
}
function uo(e, t) {
	let n = lo(e);
	if (e.bullet.type === "char") return t.clear(), n ? e.bullet.char : "";
	if (e.bullet.type === "autoNum") {
		if (!n) return "";
		let r = e.lvl;
		return t.has(r) ? t.set(r, t.get(r) + 1) : t.set(r, e.bullet.startAt ?? 1), en(t.get(r), e.bullet.numType);
	}
	return t.clear(), "";
}
function fo(e, t, n, r, i, a, o) {
	let s = (() => {
		for (let e of t.runs) if (e.type === "text" && e.fontSize != null) return e.fontSize;
		return t.defFontSize ?? e.defaultFontSize ?? 18;
	})() * K * r * i, c = (() => {
		for (let e of t.runs) if (e.type === "text" && e.color) return e.color;
		return null;
	})(), l = c ? Q(c) : n, u = (() => {
		for (let e of t.runs) if (e.type === "text" && e.fontFamily) return e.fontFamily;
		return t.defFontFamily ?? null;
	})(), d = "", f = s, p = "sans-serif", m = $(!1, !1, f, p, a), h = l, g = !1, _ = null;
	d = uo(t, o);
	let v = br(t.bullet);
	if (v.type === "char") {
		let e = v, t = e.sizePts == null ? e.sizePct == null ? s : s * (e.sizePct / 100) : e.sizePts * K * r * i, n = Gi(e.fontFamily ?? null, a), o = $(!1, !1, t, n, a, d, Ki(e.fontFamily)), c = d && M(ia(n, a)) ? ra(d, n, !1, !1, a, o) : null, u = c?.some((e) => e.mapped) === !0 && ![...d].some((e) => a.symbolFaces?.draws(e, o) === !0);
		c && (u || !c.some((e) => e.mapped)) ? d = c.map((e) => e.text).join("") : c && (d = [...d].map((e) => {
			let t = ra(e, n, !1, !1, a, o);
			return t.length === 1 && !t[0].mapped ? t[0].text : e;
		}).join(""));
		let _ = u ? "sans-serif" : n;
		f = t, p = _, m = $(!1, !1, t, _, a, d, Ki(e.fontFamily)), h = e.color ? Q(e.color) : l, g = !e.color;
	} else if (v.type === "autoNum") {
		let e = v, t = e.sizePts == null ? e.sizePct == null ? s : s * (e.sizePct / 100) : e.sizePts * K * r * i;
		f = t, p = Gi(e.fontFamily ?? u, a), m = $(!1, !1, t, Gi(e.fontFamily ?? u, a), a, d, Ki(e.fontFamily ?? u)), h = v.color ? Q(v.color) : l, g = !v.color;
	} else if (v.type === "blip") {
		let n = v, a = ca(e, t, n) * K * r * i;
		_ = {
			imagePath: n.imagePath,
			mimeType: n.mimeType,
			sizePx: a
		};
	}
	return {
		bulletLabel: d,
		bulletFont: m,
		bulletSizePx: f,
		bulletFamily: p,
		bulletColor: h,
		bulletFollowsText: g,
		bulletImage: _
	};
}
function po(e, t, n, r, i, a, o, s, c, l, u, d, f, p) {
	let m = t.autoFit === "norm" && t.fontScale != null && t.fontScale > 0 && t.fontScale < 1 ? t.fontScale : 1, h = K * s, g = hn(a, o, {
		lIns: t.lIns,
		rIns: t.rIns,
		tIns: t.tIns,
		bIns: t.bIns
	}, s), _ = (t.defaultFontSize ?? 18) * h * m, v = t.defaultBold ?? !1, y = t.defaultItalic ?? !1, b, x = /* @__PURE__ */ new Map(), S = [], C = t.paragraphs.map((n) => {
		let r = n.defFontSize == null ? _ : n.defFontSize * h * m, i = n.defColor ? Q(n.defColor) : c, a = fo(t, n, i, s, m, d, x);
		S.push(a);
		let o = ya(n, r, i, s, v, y, m, u, d, !1, e);
		b ??= o.sameStyle;
		let l = o.input.find((e) => e.type === "text"), f = Gi(n.defFontFamily ?? null, d), p = n.defBold ?? v, g = n.defItalic ?? y, C = l?.type === "text" ? l.style : {
			text: "",
			font: $(p, g, r, f, d, ""),
			sizePx: r,
			color: i,
			underline: !1,
			strikethrough: !1,
			lineMetric: ta(f, p, g, d),
			faceFamily: f
		}, w = n.endRunProperties, T = w ? ya({
			...n,
			runs: [{
				...w,
				type: "text",
				text: " "
			}]
		}, r, i, s, v, y, m, u, d, !1, e).input.find((e) => e.type === "text") : void 0, E = (e, t) => t == null ? e == null ? void 0 : {
			type: "pts",
			val: e / 100 * m
		} : {
			type: "pct",
			val: t
		};
		return {
			runs: o.input,
			marginStart: X(n.marL, s),
			marginEnd: X(n.marR, s),
			firstLineIndent: X(n.indent, s),
			marker: lo(n) ? a.bulletLabel ? {
				text: a.bulletLabel,
				style: {
					text: a.bulletLabel,
					font: a.bulletFont,
					sizePx: a.bulletSizePx,
					color: a.bulletColor,
					underline: !1,
					strikethrough: !1,
					faceFamily: a.bulletFamily,
					lineMetric: ta(a.bulletFamily, !1, !1, d)
				}
			} : a.bulletImage ? {
				advance: a.bulletImage.sizePx,
				thickness: a.bulletImage.sizePx
			} : void 0 : void 0,
			alignment: n.alignment,
			lineSpacing: n.spaceLine?.type === "pts" ? {
				type: "pts",
				val: Qt(n.spaceLine.val)
			} : n.spaceLine,
			spaceBefore: E(n.spaceBefore, n.spaceBeforePct),
			spaceAfter: E(n.spaceAfter, n.spaceAfterPct),
			markStyle: C,
			endMarkStyle: T?.type === "text" ? T.style : void 0,
			eastAsianLineBreak: n.eaLnBrk !== !1
		};
	}), w = Jr(e, {
		vert: n,
		rect: {
			left: r + g.left,
			top: i + g.top,
			width: g.width,
			height: g.height
		},
		anchor: t.verticalAnchor,
		anchorCtr: t.anchorCtr === !0,
		wrap: t.wrap !== "none",
		spcFirstLastPara: t.spcFirstLastPara === !0,
		lnSpcReduction: t.autoFit === "norm" ? t.lnSpcReduction ?? 0 : 0,
		pxPerPt: h,
		paragraphs: C,
		sameStyle: b,
		drawMarker: (n, r, i) => {
			let a = t.paragraphs[n];
			if (!lo(a)) return;
			let o = S[n], s = i;
			e.save();
			let c = o.bulletImage, l = c ? d.pictureBulletImages?.has(c.imagePath) ? d.pictureBulletImages.get(c.imagePath) : p ? Ot(c.imagePath, p) : null : null;
			if (c && l) {
				let t = c.sizePx, n = l.height > 0 ? t * l.width / l.height : t;
				e.drawImage(l, r - n / 2, s, n, t);
			}
			e.restore();
		},
		markerPaint: (t, n, r) => {
			let i = S[t], a = C[t].runs.find((e) => e.type === "text");
			return i.bulletFollowsText && a?.type === "text" && a.style.patternFill ? Wi(e, a.style, n, r, s) : i.bulletColor;
		},
		drawUnderline: (t, n, r) => {
			Fi(e, t, 0, 0, n, t.color, s, d.dpr, r);
		},
		sameUnderline: (e, t) => e.underline === t.underline && e.underlineStyle === t.underlineStyle && e.underlineColor === t.underlineColor && e.underlineFill === t.underlineFill && e.underlineLine === t.underlineLine && e.underlineLineNoFill === t.underlineLineNoFill && e.color === t.color && e.noFill === t.noFill,
		drawStrike: (t, n, r, i) => {
			Ii(e, t, n, r, i, t.color, d.dpr);
		},
		drawObject: (t, n, r) => {
			Ui(e, t, n, r);
		}
	});
	if (f) for (let e of w) f({
		text: e.text,
		inShapeX: e.x - r,
		inShapeY: e.y - i,
		w: e.w,
		h: e.h,
		fontSize: e.fontSize,
		font: e.font,
		shapeX: r,
		shapeY: i,
		shapeW: a,
		shapeH: o,
		rotation: l,
		...e.hyperlink ? { hyperlink: e.hyperlink } : {}
	});
}
function mo(e, t, n, r, i, a, o, s = null, c = 0, l = !1, u = !1, d = "#000000", f, p = {
	themeMajorFont: null,
	themeMinorFont: null,
	dpr: 1
}, m, h = !1, g, _ = !1, v = h) {
	if (t.vert === "wordArtVert" || t.vert === "wordArtVertRtl") {
		if (h) return i;
		po(e, t, t.vert, n, r, i, a, o, s ?? d, c, f, p, m, g);
		return;
	}
	let y = t.vert === "vert" || t.vert === "eaVert", b = t.vert === "vert270";
	if (y || b) {
		let l = n + i / 2, u = r + a / 2, _ = y ? 90 : -90, v = m ? (e) => m({
			...e,
			inShapeX: e.inShapeX - a / 2 + i / 2,
			inShapeY: e.inShapeY - i / 2 + a / 2,
			shapeX: n,
			shapeY: r,
			shapeW: i,
			shapeH: a,
			rotation: c,
			textBodyRotation: _
		}) : void 0;
		if (h) return i;
		e.save(), e.translate(l, u), e.rotate(b ? -Math.PI / 2 : Math.PI / 2), mo(e, {
			...t,
			vert: "horz"
		}, -a / 2, -i / 2, a, i, o, s, 0, !1, !1, d, f, p, v, !1, g, t.vert === "eaVert"), e.restore();
		return;
	}
	let x = t.textWarp;
	if (!h && x && It(x.preset)) {
		qa(e, t, x.preset, x.adj ?? [], n, r, i, a, o, s ?? d, p);
		return;
	}
	let S = hn(i, a, {
		lIns: t.lIns,
		rIns: t.rIns,
		tIns: t.tIns,
		bIns: t.bIns
	}, o).left, C = X(t.rIns, o), w = X(t.tIns, o), T = X(t.bIns, o), E = t.wrap !== "none", D = t.autoFit === "sp", O = D ? E && ma(e, t, i, S, C, o, p, f) : E, k = Math.max(1, t.numCol ?? 1), A = X(t.spcCol ?? 0, o), j = t.defaultBold ?? !1, M = t.defaultItalic ?? !1, N = s ?? d, P = (r, a, s) => {
		let c = (t.defaultFontSize ?? 18) * K * o * r, l = s == null ? t.autoFit === "norm" && t.lnSpcReduction != null ? t.lnSpcReduction : null : 1 - s, u = [], d = 0, m = 0, g = a, _ = /* @__PURE__ */ new Map();
		for (let y = 0; y < t.paragraphs.length; y++) {
			let b = t.paragraphs[y], x = X(b.marL, o), w = X(b.marR, o), T = X(b.indent, o), E = b.defFontSize == null ? c : b.defFontSize * K * o * r, P = b.defColor ? Q(b.defColor) : N, F = sa(b), { bulletLabel: I, bulletFont: L, bulletColor: R, bulletFollowsText: ee, bulletImage: z } = fo(t, b, P, o, r, p, _), B = k > 1 ? (i - S - C - (k - 1) * A) / k : i - S - C, V = n + S + x, te = n + S + x + T, H = B - x - w, U = Ta(e, b, O ? H : Infinity, E, P, o, x, j, M, r, f, p, la(F, T)), ne = s ?? r, W = b.spaceBefore == null ? 0 : b.spaceBefore / 100 * K * o * ne, re = b.spaceAfter == null ? 0 : b.spaceAfter / 100 * K * o * ne;
			for (let n = 0; n < U.length; n++) {
				let r = U[n], i = n === 0, s = n === U.length - 1, c = 0, f = [], p = 0;
				for (let t of r.segments) {
					let n = t.math ? Math.max(t.sizePx, (t.math.ascent + t.math.descent) / 1.2) : t.sizePx;
					if (n > c && (c = n), t.math ? g = !1 : t.isTab || (t.lineMetric === void 0 ? g = !1 : f.push({
						sizePx: t.sizePx,
						face: t.lineMetric
					}), t.lineMetricLatin === null ? g = !1 : t.lineMetricLatin !== void 0 && t.lineMetricLatin !== t.lineMetric && f.push({
						sizePx: t.sizePx,
						face: t.lineMetricLatin
					})), !t.math && D) {
						e.font = t.font;
						let n = e.measureText(t.text || "M"), r = (n.fontBoundingBoxAscent ?? 0) + (n.fontBoundingBoxDescent ?? 0);
						r > p && (p = r);
					}
				}
				for (let e of r.metricMarks ?? []) e.lineMetric !== void 0 && f.push({
					sizePx: e.sizePx,
					face: e.lineMetric
				});
				c === 0 && (c = E);
				let _ = c;
				if (i && I) {
					e.font = L;
					let t = e.measureText("M"), n = t.actualBoundingBoxAscent + t.actualBoundingBoxDescent;
					n > c && (c = n);
				}
				i && z && z.sizePx > c && (c = z.sizePx), c > _ && (g = !1);
				let x = c * 1.2, S = D && p > x, C = pn(x, b.spaceLine, K * o);
				h && !D && !v && (b.spaceLine || (C = c));
				let w = b.spaceLine?.type === "pct" ? c * (b.spaceLine.val / 1e5) : C;
				l != null && b.spaceLine?.type !== "pts" && (C *= 1 - l);
				let O, k, A = x, j = t.compatLnSpc === !1;
				a && g && j && (f.length === 0 || f.some((e) => e.face.excel === void 0)) && (g = !1);
				let M = b.fontAlgn, N;
				if (a && g && M && f.length > 0) {
					let e = $t * K * o;
					N = Yt(M, f, j, e), N || (g = !1);
					for (let t of r.segments) {
						if (!N) break;
						if (t.isTab || !t.text) continue;
						let n = t.lineMetric && Xt(M, {
							sizePx: t.sizePx,
							face: t.lineMetric
						}, j, e);
						if (n === void 0) {
							g = !1;
							break;
						}
						t.fontAlgnOffsetPx = n;
					}
				}
				if (a && g && !(h && !D && !v && !b.spaceLine)) {
					let e = N ?? (j ? Jt(f.map((e) => ({
						sizePx: e.sizePx,
						box: e.face.excel
					}))) : f.length > 0 ? Gt(f.map((e) => ({
						sizePx: e.sizePx,
						share: e.face.share
					}))) : {
						ascent: x * .8,
						descent: x * .2
					});
					j && (A = e.ascent + e.descent);
					let t = vn(e, b.spaceLine?.type === "pts" ? {
						type: "pts",
						val: Qt(b.spaceLine.val)
					} : b.spaceLine, K * o, l ?? 0);
					C = t.ascent + t.descent, O = t.ascent, k = e.descent;
				}
				let P = s && b.spaceAfterPct != null ? A * (b.spaceAfterPct / 1e5) : re, B = i && b.spaceBeforePct != null ? A * (b.spaceBeforePct / 1e5) : W, ne = t.spcFirstLastPara === !0, ie = y === t.paragraphs.length - 1, G = C + (s && (ne || !ie) ? P : 0), ae = i && (ne || y > 0) ? B : 0, oe = i ? la(F, T) : 0, se = r.segments.some((e) => e.text && e.text.length > 0 || e.math != null), ce = i && se ? z : null;
				u.push({
					line: r,
					linePx: G,
					lineHeight: C,
					baselineLineHeight: w,
					topGapPx: ae,
					textXOffset: oe,
					bulletLabel: i ? I : "",
					bulletFont: L,
					bulletColor: R,
					bulletFollowsText: ee,
					bulletX: te,
					bulletImage: ce,
					textX: V,
					textMaxW: H,
					alignment: b.alignment,
					isLastLine: s,
					para: b,
					useResolvedFontMetrics: O === void 0 && S,
					metricAscent: O,
					metricNaturalDescent: k
				});
				let le = d + ae;
				d += G + ae, m = Math.max(m, d, le + (S && O === void 0 ? Math.max(C, p) : C) + (G - C));
			}
		}
		return {
			allLines: u,
			totalHeight: d,
			requiredHeight: m,
			metricOk: g
		};
	}, F = !0, I = (e, t) => {
		let n = P(e, F, t);
		return F && !n.metricOk && (F = !1, n = P(e, !1, t)), n;
	}, { allLines: L, requiredHeight: R } = I(1);
	if (t.autoFit === "norm") {
		if (t.fontScale != null && t.fontScale > 0) t.fontScale < 1 && ({allLines: L, requiredHeight: R} = I(t.fontScale));
		else if (t.shrinkOnOverflow && !h) {
			let t = Math.max(0, a - w - T), n = (e, n) => {
				if (k <= 1 || n <= t) return n > t;
				let r = Math.ceil(e.length / k);
				for (let n = 0; n < e.length; n += r) {
					let i = 0;
					for (let t of e.slice(n, n + r)) i += t.topGapPx + t.linePx;
					if (i > t + .5) return !0;
				}
				return !1;
			}, r = (t, r) => n(t, r) || t.some((t) => fa(e, t));
			if (r(L, R)) {
				for (let [e, t] of da) if ({allLines: L, requiredHeight: R} = I(e, t), !r(L, R)) break;
			}
		}
	}
	if (h) return w + R + T;
	let ee = t.verticalAnchor ?? "t", z = r, B;
	a === 0 && ee === "b" ? (B = w + R + T, z = r - B) : B = t.autoFit === "sp" && a === 0 ? w + R + T : a;
	let V = L[L.length - 1], te = (() => {
		if (!t.shrinkOnOverflow || k <= 1 || a === 0 || L.length === 0) return null;
		let e = Math.max(0, V.linePx - V.lineHeight);
		if (R - e <= Math.max(0, a - w - T) + .5) return null;
		let n = Math.ceil(L.length / k), r = 0;
		for (let e = 0; e < L.length; e += n) {
			let t = 0;
			for (let r of L.slice(e, e + n)) t += r.topGapPx + r.linePx;
			r = Math.max(r, t);
		}
		return r;
	})() ?? (V?.metricAscent !== void 0 && V.metricNaturalDescent !== void 0 ? R - (V.lineHeight - V.metricAscent) + V.metricNaturalDescent : R), H, U = Math.max(0, B - w - T);
	H = ee === "ctr" ? z + fn("ctr", {
		left: S,
		top: w,
		width: i - S - C,
		height: U
	}, te) : ee === "b" ? z + B - T - te : z + w, e.save(), e.textAlign = "left", e.textBaseline = "alphabetic";
	let ne = H, W = k > 1 ? (i - S - C - (k - 1) * A) / k + A : 0, re = Math.max(0, B - w - T), ie = L[L.length - 1], G = ie ? Math.max(0, ie.linePx - ie.lineHeight) : 0, ae = R - G, oe = a === 0 || ae <= re + .5, se = k > 1 && !oe ? Math.ceil(L.length / k) : L.length, ce = 0, le = 0;
	for (let s of L) {
		let { line: l, linePx: u, lineHeight: d, topGapPx: f, textXOffset: h, bulletLabel: v, bulletFont: y, bulletColor: b, bulletFollowsText: x, bulletImage: S, alignment: C, isLastLine: w, useResolvedFontMetrics: T, metricAscent: E } = s;
		k > 1 && ce < k - 1 && le >= se && (ce++, le = 0, H = ne), H += f, le++;
		let D = (t.rtlCol ? k - 1 - ce : ce) * W, O = s.textX + D, A = s.bulletX + D, j = s.textMaxW, M = s.para.rtl === !0, N = M || Dr(l.segments), P = l.segments.some((e) => e.isTab);
		if (P) {
			let t = X(s.para.marL, o), n = X(s.para.marR, o), r = M ? n : t + h, i = j + t + n;
			e.font = l.segments.find((e) => e.isTab).font;
			let a = e.measureText(" ").width, c = Rr(l.segments.map((t) => {
				if (t.isTab) return {
					isTab: !0,
					width: 0
				};
				if (t.math) return {
					isTab: !1,
					width: t.math.width
				};
				e.font = t.font;
				let n = t.letterSpacingPx ?? 0;
				return {
					isTab: !1,
					width: t.text ? (t.leadingLetterSpacingPx ?? 0) + va(e, t.text, n) : 0
				};
			}), (s.para.tabStops ?? []).map((e) => ({
				pos: X(e.pos, o),
				algn: e.algn
			})), r, i, a, X(s.para.defTabSz ?? 914400, o));
			for (let e = 0; e < l.segments.length; e++) l.segments[e].isTab && (l.segments[e].tabWidthPx = c[e]);
		}
		let F = 0, I = 0, L = 0, R = 0;
		for (let t of l.segments) {
			if (t.isTab) {
				F += t.tabWidthPx ?? 0;
				continue;
			}
			if (t.math) {
				F += t.math.width, I = Math.max(I, t.math.ascent);
				continue;
			}
			e.font = t.font;
			let n = e.measureText(t.text || "M"), r = t.letterSpacingPx ?? 0;
			if (F += t.leadingLetterSpacingPx ?? 0, F += t.text ? va(e, t.text, r) : 0, n.actualBoundingBoxAscent > 0 && (I = Math.max(I, n.actualBoundingBoxAscent)), T) {
				let e = n.fontBoundingBoxAscent ?? 0, t = e + (n.fontBoundingBoxDescent ?? 0);
				t > R && (R = t, L = e);
			}
		}
		let z = T && R > 0 ? ee === "t" && I > 0 ? s.para.spaceLine?.type === "pct" ? Math.max(I, L + (s.baselineLineHeight - R) / 2) : I : Math.max(I, L + Math.max(0, d - R) / 2) : Math.max(d * .8, I), B = E === void 0 ? H + z : H + E, V = B + (l.segments.find((e) => !e.isTab && !e.math && !!e.text)?.fontAlgnOffsetPx ?? 0), te = O + j, U = S && g ? p.pictureBulletImages?.has(S.imagePath) ? p.pictureBulletImages.get(S.imagePath) : Ot(S.imagePath, g) : void 0, re = 0;
		if (N && M) {
			if (v) e.font = y, re = e.measureText(v).width;
			else if (S && U) {
				let e = S.sizePx;
				re = U.height > 0 ? e * (U.width / U.height) : e;
			}
		}
		if (v) {
			e.font = y;
			let t = l.segments.find((e) => !e.isTab && !e.math && !!e.text);
			if (e.fillStyle = x && t?.patternFill ? Wi(e, t, A, V, o) : b, N && M) {
				let t = e.direction;
				e.direction = "rtl", e.fillText(v, te - re, V), e.direction = t;
			} else e.fillText(v, A, V);
		}
		if (S && g && U) {
			let t = S.sizePx, n = U.height > 0 ? t * (U.width / U.height) : t, r = V - t;
			N && M ? e.drawImage(U, te - n, r, n, t) : e.drawImage(U, A, r, n, t);
		}
		let ie = O + h, G;
		G = P ? M ? O + j - re - F : ie : C === "ctr" ? wn("ctr", ie, j - h, F, !1, !0) : C === "r" ? wn("r", O - re, j, F, !1, !0) : ie;
		let ae = C === "just" || C === "justLow" ? "just" : C === "thaiDist" ? "thaiDist" : C === "dist" ? "dist" : null, oe = w || (l.endsWithBreak ?? !1), ue = (ae && !N && !P && _n(C, w, l.endsWithBreak ?? !1) ? Ar(l.segments, j - h, F, ae, oe) : null) ?? l.segments, de = N ? Or(l.segments, M) : null, fe = (e, t) => {
			if (Math.abs(e - t) !== 1) return 0;
			let n = l.segments[Math.min(e, t)], r = l.segments[Math.max(e, t)];
			return n.isTab || n.math || r.isTab || r.math || n.sourceRunId == null || n.sourceRunId !== r.sourceRunId ? 0 : r.leadingLetterSpacingPx ?? 0;
		}, pe = ue.length;
		for (let t = 0; t < pe; t++) {
			let s = de ? de.order[t] : t, l = ue[s], u = de ? de.rtl[s] : !1;
			if (N && (e.direction = u ? "rtl" : "ltr"), t > 0) {
				let e = de ? de.order[t - 1] : t - 1;
				G += fe(e, s);
			}
			if (l.isTab) {
				G += l.tabWidthPx ?? 0;
				continue;
			}
			let f = l.jext ?? 0, h = l.splitBefore, g = l.perGap ?? 0, v = h && h.length > 0 ? h.length * g : 0;
			if (l.math) {
				let t = l.math.width;
				Ui(e, l, G, V - l.math.ascent), G += t, G += f;
				continue;
			}
			e.font = l.font;
			let y = l.drawSizePx ?? l.sizePx, b = l.baseline ? -(l.baseline / 1e5) * l.sizePx : 0, x = B + (l.fontAlgnOffsetPx ?? 0) + b, S = Wi(e, l, G, x, o);
			e.fillStyle = S;
			let C = l.letterSpacingPx ?? 0;
			if (l.highlight && l.text) {
				let t = va(e, l.text, C) + v + f;
				Ni(e, G, x, t, y, l.highlight, S, l.lineMetric);
			}
			let w = l.shadow, T = (e, t, n, r) => {
				let i = r === "fill" ? e.fillText.bind(e) : e.strokeText.bind(e);
				if (C !== 0 && ha(t) > 1) {
					let r = e, a = r.letterSpacing;
					if (_a(e)) {
						r.letterSpacing = `${C}px`, i(t, n, x);
						try {
							r.letterSpacing = a;
						} catch {}
					} else {
						let r = n, a = [...t];
						for (let t = 0; t < a.length; t++) {
							let n = a[t];
							i(n, r, x), t < a.length - 1 && (r += e.measureText(n).width + C);
						}
					}
				} else i(t, n, x);
			}, E = (t) => va(e, t, C), D = h && h.length > 0 ? yr([...l.text], h, g, E) : null, O = [...l.text], k = !!h && h.length === O.length - 1 && O.length > 1, A = (e, t) => {
				if (_) {
					let n = k ? C + g : C;
					Vr(e, l.text, G, x, y, n, t);
					return;
				}
				if (k) {
					let n = t === "fill" ? e.fillText.bind(e) : e.strokeText.bind(e), r = C + g;
					if (_a(e)) {
						let t = e, i = t.letterSpacing;
						t.letterSpacing = `${r}px`, n(l.text, G, x);
						try {
							t.letterSpacing = i;
						} catch {}
					} else {
						let t = G;
						for (let i = 0; i < O.length; i++) {
							let a = O[i];
							n(a, t, x), i < O.length - 1 && (t += e.measureText(a).width + r);
						}
					}
				} else if (D) for (let { text: n, dx: r } of D) T(e, n, G + r, t);
				else T(e, l.text, G, t);
			}, j = l.reflection;
			if (j && l.text && !l.noFill) {
				let t = e.canvas.width || 0, n = e.canvas.height || 0;
				if (t > 0 && n > 0) {
					e.font = l.font;
					let r = e.measureText(l.text), i = Number.isFinite(r.actualBoundingBoxAscent) ? r.actualBoundingBoxAscent : y * .8, a = Number.isFinite(r.actualBoundingBoxDescent) ? r.actualBoundingBoxDescent : y * .2, s = Number.isFinite(r.actualBoundingBoxLeft) ? r.actualBoundingBoxLeft : 0, c = Number.isFinite(r.actualBoundingBoxRight) ? r.actualBoundingBoxRight : r.width, u = e.getTransform(), d = Math.abs(u.a * u.d - u.b * u.c), f = d > 0 ? Math.sqrt(d) : 1;
					ea(e, (e) => {
						e.font = l.font, e.fillStyle = Wi(e, l, G, x, o), A(e, "fill");
					}, {
						x: (G - s) * f,
						y: (x - i) * f,
						w: Math.max(1, s + c) * f,
						h: Math.max(1, i + a) * f
					}, j, o * f, u, t, n), e.font = l.font, e.fillStyle = S;
				}
			}
			if (w && !l.noFill) {
				let t = w.dir * Math.PI / 180, n = X(w.dist, o);
				e.save(), e.shadowColor = Q(w.color, w.alpha), e.shadowBlur = X(w.blur, o), e.shadowOffsetX = Math.cos(t) * n, e.shadowOffsetY = Math.sin(t) * n;
			}
			l.noFill || A(e, "fill"), w && !l.noFill && e.restore(), e.font = l.font;
			let M = va(e, l.text, C) + v, P = l.outline;
			P && P.width > 0 && (e.save(), e.lineWidth = Math.max(.5, X(P.width, o)), e.strokeStyle = P.fill ? ot(P.fill, e, G, x - y, Math.max(1, M), y, 0, o * 12700) ?? "rgba(0,0,0,0)" : P.color ? `#${P.color}` : l.noFill ? "rgba(0,0,0,0)" : S, (!l.noFill || P.fill || P.color) && (e.lineJoin = "round", A(e, "stroke")), e.restore()), m && l.text && m({
				text: l.text,
				inShapeX: G - n,
				inShapeY: H - r,
				w: M + f,
				h: d,
				fontSize: y,
				font: l.font,
				shapeX: n,
				shapeY: r,
				shapeW: i,
				shapeH: a,
				rotation: c,
				hyperlink: l.hyperlink
			}), Li(e, l, G, x, M + f, S, o, p.dpr), G += M, G += f;
		}
		N && (e.direction = "ltr"), H += u;
	}
	e.restore();
}
function ho(e, t, n, r, i, a) {
	if (!e) return [];
	let o = pr(t?.rig ?? "threePt", t?.dir ?? "t", t?.rot), s = mr(n), c = r * i, l = [];
	if (e.bevelT && e.bevelT.w > 0 && e.bevelT.h > 0 && l.push({
		widthPx: e.bevelT.w * c,
		heightPx: e.bevelT.h * c,
		prst: e.bevelT.prst || "circle",
		material: s,
		light: o,
		camera: a,
		wireframeLinePx: i
	}), e.bevelB && e.bevelB.w > 0 && e.bevelB.h > 0 && l.push({
		widthPx: e.bevelB.w * c,
		heightPx: e.bevelB.h * c,
		prst: e.bevelB.prst || "circle",
		material: s,
		light: o,
		bottom: !0,
		camera: a,
		depthPx: (e.extrusionH ?? 0) * c,
		wireframeLinePx: i
	}), s === "legacyWireframe") for (let t of [!1, !0]) l.some((e) => !!e.bottom === t) || l.push({
		widthPx: 0,
		heightPx: 0,
		prst: "circle",
		material: s,
		light: o,
		camera: a,
		bottom: t,
		depthPx: t ? (e.extrusionH ?? 0) * c : 0,
		wireframeLinePx: i
	});
	return l;
}
function go(e, t, n, r, i, a) {
	if (!e || !e.extrusionH || e.extrusionH <= 0) return null;
	let o = e.extrusionH * i * a, s = Hn({
		...t,
		unitsPerInch: (t.unitsPerInch ?? 96) * a,
		sceneDepth: (t.sceneDepth ?? 0) * a
	}, n * a, r * a, o);
	if (Math.hypot(s.x, s.y) < .75) return null;
	let c = [
		64,
		64,
		64
	];
	if (e.extrusionClr) {
		let t = e.extrusionClr.replace("#", "");
		t.length >= 6 && (c = [
			parseInt(t.slice(0, 2), 16),
			parseInt(t.slice(2, 4), 16),
			parseInt(t.slice(4, 6), 16)
		]);
	}
	return {
		offsetX: s.x,
		offsetY: s.y,
		rgb: c
	};
}
function _o(e, t, n, r, i, a = n) {
	let o = e.a * e.d - e.b * e.c;
	if (Math.abs(o) <= 1e-12) return;
	let s = e.d / o, c = -e.b / o, l = -e.c / o, u = e.a / o, d = -(s * e.e + l * e.f), f = -(c * e.e + u * e.f);
	return {
		a: t * s,
		b: t * c,
		c: t * l,
		d: t * u,
		e: n + t * (d - r),
		f: a + t * (f - i)
	};
}
function vo(e, t, n, r, i, o, s, c = {}) {
	if (i <= 0 || o <= 0) return !1;
	let l = e.getTransform(), u = Math.abs(l.a * l.d - l.b * l.c), d = u > 0 ? Math.sqrt(u) : 1, f = c.backDepthCss ?? 0, { face: p, corners: m, backFacing: h, padDev: g } = to(t, i, o, f, c.edgePadCss, d), _ = m, v = g, y = g, b = Math.max(1, Math.ceil(i * d) + 2 * g), x = Math.max(1, Math.ceil(o * d) + 2 * g);
	if (c.measureOverflow) {
		let t = En(e, (e) => s(e, 0, 0, i, o));
		if (t) {
			let e = Math.min(-g, Math.floor(t.x * d) - 1), n = Math.min(-g, Math.floor(t.y * d) - 1), r = Math.max(b - g, Math.ceil((t.x + t.w) * d) + 1), a = Math.max(x - g, Math.ceil((t.y + t.h) * d) + 1), s = [
				[e, n],
				[r, n],
				[r, a],
				[e, a]
			].map(([e, t]) => _t(p, e / d / i, t / d / o));
			if (s.some((e) => !e)) return _t(p, .5, .5) === null;
			_ = s, v = -e, y = -n, b = r - e, x = a - n;
		}
	}
	if (c.measureOverflow && (!Number.isFinite(b * x) || b > 32767 || x > 32767 || b * x > 16777216)) return !1;
	let S = a(b, x);
	if (!S) return !1;
	let C = S.getContext("2d");
	if (!C) return !1;
	C.save(), C.scale(d, d), C.translate(v / d, y / d), c.preservePatternFrame ? st(e, C, () => s(C, 0, 0, i, o), void 0, _o(l, d, v, n, r, y)) : s(C, 0, 0, i, o), C.restore();
	let w = Math.ceil(i * d), T = Math.ceil(o * d), E = (e) => ({
		x: v - e,
		y: y - e,
		w: w + 2 * e,
		h: T + 2 * e
	}), D = c.extrusion && h && f > 0 ? {
		...c.extrusion,
		offsetX: -c.extrusion.offsetX,
		offsetY: -c.extrusion.offsetY
	} : c.extrusion, O = c.bevels?.some((e) => e.material === "legacyWireframe"), k = h && c.bevels?.some((e) => e.bottom), A = () => {
		!D || O || _r(C, D, E(Math.ceil(Math.hypot(D.offsetX, D.offsetY)) + 2));
	};
	if (k || A(), c.bevels && c.bevels.length > 0) for (let e of c.bevels) {
		let t = O && D ? {
			x: D.offsetX,
			y: D.offsetY
		} : void 0, n = e.widthPx + (t ? Math.hypot(t.x, t.y) : 0);
		gr(C, t ? {
			...e,
			wireframeDepth: t
		} : e, E(Math.ceil(n) + 2));
	}
	k && A(), c.paintEdges && (C.save(), C.scale(d, d), C.translate(v / d, y / d), c.paintEdges(C, 0, 0, i, o), C.restore());
	let j = _.map((e) => ({
		x: n + e.x,
		y: r + e.y
	}));
	return yt(S, e, b, x, j), !0;
}
function yo(e, t, n, r, i, o, s, c, l = 0) {
	if (r <= 0 || i <= 0 || o.length === 0) return !1;
	let u = e.getTransform(), d = Math.abs(u.a * u.d - u.b * u.c), f = d > 0 ? Math.sqrt(d) : 1, p = Math.max(0, Math.ceil(l * f)), m = p / f, h = Math.max(1, Math.ceil(r * f) + 2 * p), g = Math.max(1, Math.ceil(i * f) + 2 * p), _ = a(h, g);
	if (!_) return !1;
	let v = _.getContext("2d");
	if (!v) return !1;
	v.save(), v.scale(f, f), v.translate(m, m), st(e, v, () => s(v, 0, 0, r, i), void 0, _o(u, f, p, t, n)), v.restore();
	let y = Math.ceil(r * f), b = Math.ceil(i * f);
	for (let e of o) {
		let t = Math.ceil(e.widthPx) + 2;
		gr(v, e, {
			x: p - t,
			y: p - t,
			w: y + 2 * t,
			h: b + 2 * t
		});
	}
	return c && (v.save(), v.scale(f, f), v.translate(m, m), c(v, 0, 0, r, i), v.restore()), e.drawImage(_, t - m, n - m, h / f, g / f), !0;
}
var bo = /* @__PURE__ */ new WeakMap();
function xo(e) {
	let t = bo.get(e);
	return t || (t = async (t, n) => {
		let r = await e(t);
		return r.type === n ? r : new Blob([r], { type: n });
	}, bo.set(e, t)), t;
}
function So(e, t, n = xo(t), r, i, a) {
	let o = xo(t);
	return jt(e.posterPath, e.posterMimeType || "application/octet-stream", o, {
		tiff: r,
		svgDecoder: a,
		...i ?? {}
	}, n).then((e) => {
		if (!e) throw Error("Media poster could not be decoded");
		return e;
	});
}
function Co(e, t, n, r = "tiff") {
	let i = X(t.x, n), a = X(t.y, n), o = X(t.width, n), s = X(t.height, n);
	e.save();
	try {
		t.alpha != null && (e.globalAlpha *= t.alpha), (t.rotation !== 0 || t.flipH || t.flipV) && (e.translate(i + o / 2, a + s / 2), e.rotate(t.rotation * Math.PI / 180), e.scale(t.flipH ? -1 : 1, t.flipV ? -1 : 1), e.translate(-(i + o / 2), -(a + s / 2))), ct(e, r, {
			x: i,
			y: a,
			width: o,
			height: s
		});
	} finally {
		e.restore();
	}
}
async function wo(e, t, n, r, i = 1, a, o) {
	if (e.mimeType === "image/x-pict") return { paint: (n) => Co(n, e, t, "pict") };
	if (!n) return Ea;
	try {
		let s = e.mimeType === "image/svg+xml", c = Ae(e.mimeType, e.srcRect, e.width / K, e.height / K);
		if (!c) return Ea;
		let { widthPt: l, heightPt: u } = c, d = xi(X(e.width, t), X(e.height, t), i, e.srcRect), f = kt(e) || s, p = f ? d : o && !Z(e) ? Ei(o, Ti(Di(e), f ? void 0 : Z(e))) : void 0, m = p && "maxRetainedPixels" in p ? p.maxRetainedPixels : void 0, h = {
			...p ? {
				targetWidthPx: p.targetWidthPx,
				targetHeightPx: p.targetHeightPx,
				...m === void 0 ? {} : { maxRetainedPixels: m }
			} : {},
			workerDecoder: a
		}, _;
		if (!Z(e) && kt(e)) try {
			_ = await wt(e.svgImagePath, n, h);
		} catch (t) {
			if (t instanceof g || Ci(t) || Ye(t)) throw t;
			_ = s ? await wt(e.imagePath, n, h) : await Dt(e.imagePath, e.mimeType, Z(e), n, {
				widthPt: l,
				heightPt: u,
				...p ?? {},
				tiff: r
			});
		}
		else if (s && !Z(e)) _ = await wt(e.imagePath, n, h);
		else {
			let t = e.blipEffects?.length ? Se(e.width / K, e.height / K, e.srcRect, null) : null;
			_ = await Dt(e.imagePath, e.mimeType, Z(e), n, {
				widthPt: t?.width ?? l,
				heightPt: t?.height ?? u,
				...p ?? {},
				tiff: r,
				svgDecoder: a
			});
		}
		if (!_) return Ea;
		let v = _;
		return { paint: (n) => Eo(n, e, v, t) };
	} catch (n) {
		return To(e, t, n);
	}
}
function To(e, t, n) {
	return ft(n, "tiff") ? { paint: (n) => Co(n, e, t) } : n instanceof g || Ci(n) || Ye(n) || gt(n) ? {
		...Ea,
		failure: { error: n }
	} : Ea;
}
function Eo(e, t, n, r) {
	try {
		e.save(), t.alpha != null && (e.globalAlpha *= t.alpha);
		let i = X(t.x, r), a = X(t.y, r), o = X(t.width, r), s = X(t.height, r);
		(t.rotation !== 0 || t.flipH || t.flipV) && (e.translate(i + o / 2, a + s / 2), e.rotate(t.rotation * Math.PI / 180), t.flipH && e.scale(-1, 1), t.flipV && e.scale(1, -1), e.translate(-(i + o / 2), -(a + s / 2)));
		let c = (e, n, r, i, a) => {
			t.custGeom && t.custGeom.length > 0 ? co(e, t.custGeom, n, r, i, a) : t.prstGeom && I(e, t.prstGeom, n, r, i, a, t.prstAdjust ?? []) || e.rect(n, r, i, a);
		}, l = (e, t, n, r, i) => {
			e.beginPath(), c(e, t, n, r, i);
		}, u = (e, r, i, a, o) => {
			!(t.prstGeom === "rect" && !t.custGeom?.length && We(n)) && (t.prstGeom || t.custGeom && t.custGeom.length > 0) && (l(e, r, i, a, o), e.clip());
		}, d = (e, n, i, a, o) => {
			t.stroke && (tt(t.stroke?.fill) && (e = nt(e)), e.save(), l(e, n, i, a, o), ko(e, t.stroke, r, {
				x: n,
				y: i,
				w: a,
				h: o
			}, t.rotation), e.stroke(), e.restore());
		}, f = (e, n, i, a, o) => {
			let s = t.sp3d;
			if (s && (s.contourW ?? 0) > 0 && s.contourClr) {
				let t = Math.max(.5, s.contourW * r);
				e.save(), e.beginPath();
				let u = t * 2 + Math.max(a, o);
				e.rect(n - u, i - u, a + 2 * u, o + 2 * u), c(e, n, i, a, o), e.clip("evenodd"), e.beginPath(), l(e, n, i, a, o), e.strokeStyle = Q(s.contourClr), e.lineWidth = t * 2, e.setLineDash([]), e.stroke(), e.restore();
			}
		}, p = t.scene3d && {
			...t.scene3d.camera,
			unitsPerInch: 914400 * r,
			sceneDepth: (t.sp3d?.extrusionH ?? 0) * r
		}, m = p && Bn(p, o, s, (t.sp3d?.extrusionH ?? 0) * r) ? {
			...t.scene3d,
			camera: p
		} : null, h = (e, i, a, o, s) => {
			let d = t.fill && t.fill.fillType !== "none" && t.fill.fillType !== "image" ? Pi(t.fill, e, i, a, o, s, t.rotation, r * K, c) : null;
			d && (e.save(), l(e, i, a, o, s), e.fillStyle = d, e.fill(), e.restore()), e.save(), u(e, i, a, o, s), Ve(e, n, t.srcRect, i, a, o, s), e.restore();
		}, g = (e, t, n, r, i) => {
			h(e, t, n, r, i), d(e, t, n, r, i), f(e, t, n, r, i);
		}, _ = (e, t, n, r, i) => {
			h(e, t, n, r, i), d(e, t, n, r, i);
		}, v = e.getTransform(), y = Math.abs(v.a * v.d - v.b * v.c), b = y > 0 ? Math.sqrt(y) : 1, x = ho(t.sp3d, t.scene3d?.lightRig, t.sp3d ? t.sp3d.prstMaterial : void 0, r, b, t.scene3d?.camera), S = (x.find((e) => e.bottom)?.depthPx ?? 0) / b, C = m ? go(t.sp3d, m.camera, o, s, r, b) : null, w = t.stroke ? t.stroke.width * r / 2 : 0, T = t.sp3d?.contourW ? t.sp3d.contourW * r : 0, E = C ? Math.hypot(C.offsetX, C.offsetY) / b : 0, D = w + T + E + 2, O = (e) => {
			if (m) {
				if (vo(e, m.camera, i, a, o, s, _, {
					bevels: x,
					backDepthCss: S,
					extrusion: C ?? void 0,
					paintEdges: f,
					edgePadCss: D
				})) return;
			} else if (x.length > 0 && yo(e, i, a, o, s, x, _, f, D)) return;
			g(e, i, a, o, s);
		}, k = (e, t, n, r, i, a) => {
			e.save(), u(e, n, r, i, a), e.fillStyle = t, e.fillRect(n, r, i, a), e.restore();
		}, A = e.getTransform(), j = Math.abs(A.a * A.d - A.b * A.c), M = j > 0 ? Math.sqrt(j) : 1, N = w + T, F = (t.custGeom && t.custGeom.length > 0 ? P(t.custGeom, i, a, o, s) : t.prstGeom && W(t.prstGeom.toLowerCase()) ? L(t.prstGeom.toLowerCase(), i, a, o, s, t.prstAdjust ?? []) : null) ?? {
			x: i,
			y: a,
			w: o,
			h: s
		}, R = m ? no(m.camera, A, i, a, o, s, D, t.shadow?.algn, S) : {
			bbox: Za(A, F.x - N, F.y - N, F.w + N * 2, F.h + N * 2),
			anchor: eo(A, i, a, o, s, t.shadow?.algn)
		}, ee = r * M, z = !!(t.shadow || t.innerShadow || t.glow || t.softEdge || t.reflection), B = (e) => k(e, "#000", i, a, o, s), V = m && z ? ro(O, A, R.bbox, {
			w: e.canvas.width || 0,
			h: e.canvas.height || 0
		}) : O, te = !!m || x.length > 0;
		io(e, t, V, te ? V : B, R.bbox, R.anchor, r, ee, A, !0, te), e.restore();
	} catch (n) {
		let i = To(t, r, n);
		if (i.paint(e), i.failure) throw i.failure.error;
	}
}
async function Do(e, t, n, r, i, a, o = 1, s, c) {
	let l = X(e.x, t), u = X(e.y, t), d = X(e.width, t), f = X(e.height, t), p, m = !1;
	if (e.posterPath && n) try {
		p = await So(e, n, i, a, e.posterMimeType === "image/svg+xml" ? xi(d, f, o) : c ? Ei(c, Ti(e.posterPath)) : void 0, s);
	} catch (e) {
		if (ft(e, "tiff")) m = !0;
		else if (e instanceof g || Ci(e) || Ye(e) || gt(e)) return {
			...Ea,
			failure: { error: e }
		};
	}
	return { paint: (n) => {
		n.save(), Ao(n, e, t), p ? n.drawImage(p, l, u, d, f) : (n.fillStyle = e.mediaKind === "video" ? "#111" : "#f0f0f0", n.fillRect(l, u, d, f), m && ct(n, "tiff", {
			x: l,
			y: u,
			width: d,
			height: f
		})), r || Tr(n, l + d / 2, u + f / 2, d, f, "paused"), n.restore();
	} };
}
function Oo(e, t, n, r, i, a, o) {
	let s = Math.max(.5, X(r.width, a)), c = n.x - t.x, l = n.y - t.y, u = Math.hypot(c, l);
	if (u === 0) return;
	let d = -l / u, f = c / u, p;
	switch (i) {
		case "dbl":
			p = [{
				offset: -1 / 3,
				widthFrac: 1 / 3
			}, {
				offset: 1 / 3,
				widthFrac: 1 / 3
			}];
			break;
		case "thinThick":
			p = [{
				offset: -3 / 8,
				widthFrac: 1 / 4
			}, {
				offset: 1 / 4,
				widthFrac: 1 / 2
			}];
			break;
		case "thickThin":
			p = [{
				offset: -1 / 4,
				widthFrac: 1 / 2
			}, {
				offset: 3 / 8,
				widthFrac: 1 / 4
			}];
			break;
		case "tri":
			p = [
				{
					offset: -2 / 5,
					widthFrac: 1 / 5
				},
				{
					offset: 0,
					widthFrac: 3 / 5
				},
				{
					offset: 2 / 5,
					widthFrac: 1 / 5
				}
			];
			break;
		default: return;
	}
	e.save(), e.globalCompositeOperation = "destination-out", e.strokeStyle = "#000", e.lineWidth = s + .5, e.setLineDash([]), e.beginPath(), e.moveTo(t.x, t.y), e.lineTo(n.x, n.y), e.stroke(), e.globalCompositeOperation = "source-over", e.strokeStyle = (r.fill ? Pi(r.fill, e, Math.min(t.x, n.x), Math.min(t.y, n.y), Math.max(1, Math.abs(n.x - t.x)), Math.max(1, Math.abs(n.y - t.y)), o, a * 12700) : null) ?? Q(r.color);
	for (let i of p) {
		let c = d * (s * i.offset), l = f * (s * i.offset);
		if (e.lineWidth = Math.max(.5, s * i.widthFrac), e.beginPath(), e.moveTo(t.x + c, t.y + l), e.lineTo(n.x + c, n.y + l), r.fill && tt(r.fill)) {
			let i = Pi(r.fill, e, Math.min(t.x, n.x), Math.min(t.y, n.y), Math.max(1, Math.abs(n.x - t.x)), Math.max(1, Math.abs(n.y - t.y)), o, a * K, void 0, at(e));
			i && (e.strokeStyle = i);
		}
		e.stroke();
	}
	e.restore();
}
function ko(e, t, n, r, i = 0) {
	if (rt(e, t, n), t?.fill && r) {
		let a = Pi(t.fill, e, r.x, r.y, r.w, r.h, i, n * K, void 0, at(e));
		a && (e.strokeStyle = a);
	}
}
function Ao(e, t, n) {
	if (t.rotation === 0 && !t.flipH && !t.flipV) return;
	let r = X(t.x, n), i = X(t.y, n), a = X(t.width, n), o = X(t.height, n);
	e.translate(r + a / 2, i + o / 2), e.rotate(t.rotation * Math.PI / 180), t.flipH && e.scale(-1, 1), t.flipV && e.scale(1, -1), e.translate(-(r + a / 2), -(i + o / 2));
}
function jo(e, t, n, r, i = {
	themeMajorFont: null,
	themeMinorFont: null,
	dpr: 1
}, a) {
	e.save(), Ao(e, t, n);
	let o = X(t.x, n), s = X(t.y, n), c = (e) => e.spcFirstLastPara ? {
		...e,
		spcFirstLastPara: !1
	} : e, u = t.cols.map((e) => X(e, n)), d = u.length, f = (e, t) => {
		let n = 0;
		for (let r = 0; r < t; r++) n += u[e + r] ?? 0;
		return n;
	}, p = [...t.rows.map((e) => X(e.height, n))], m = t.rows.reduce((e, t) => e + t.height, 0), h = t.height > m;
	for (let a = 0; a < t.rows.length; a++) {
		let o = t.rows[a];
		for (let t = 0; t < o.cells.length; t++) {
			let s = o.cells[t];
			if (s.hMerge || s.vMerge || (s.rowSpan || 1) > 1 || !s.textBody || s.textBody.shrinkOnOverflow || o.height > 0 && !h) continue;
			let l = f(t, s.gridSpan || 1), u = mo(e, c(s.textBody), 0, 0, l, 0, n, null, 0, !1, !1, "#000000", r, i, void 0, !0, void 0, !1, o.height === 0) || 0;
			u > p[a] && (p[a] = u);
		}
	}
	for (let a = 0; a < t.rows.length; a++) {
		let o = t.rows[a];
		for (let s = 0; s < o.cells.length; s++) {
			let l = o.cells[s];
			if (l.hMerge || l.vMerge) continue;
			let u = l.rowSpan || 1;
			if (u <= 1 || !l.textBody || l.textBody.shrinkOnOverflow) continue;
			let d = f(s, l.gridSpan || 1), m = t.rows.slice(a, Math.min(t.rows.length, a + u)).some((e) => e.height === 0);
			if (!m && !h) continue;
			let g = mo(e, c(l.textBody), 0, 0, d, 0, n, null, 0, !1, !1, "#000000", r, i, void 0, !0, void 0, !1, m) || 0, _ = 0;
			for (let e = 0; e < u && a + e < p.length; e++) _ += p[a + e];
			if (g > _) {
				let e = (g - _) / u;
				for (let t = 0; t < u && a + t < p.length; t++) p[a + t] += e;
			}
		}
	}
	let g = u.reduce((e, t) => e + t, 0), _ = Array(d);
	if (t.rtl) {
		let e = o + g;
		for (let t = 0; t < d; t++) e -= u[t], _[t] = e;
	} else {
		let e = o;
		for (let t = 0; t < d; t++) _[t] = e, e += u[t];
	}
	let v = (e, n) => t.rtl ? _[e + n - 1] : _[e], y = Array(t.rows.length);
	{
		let e = s;
		for (let n = 0; n < t.rows.length; n++) y[n] = e, e += p[n];
	}
	let b, x, S = {
		row: 0,
		column: 0
	};
	if (a) {
		let e = X(t.width, n), r = X(t.height, n), i = o + e / 2, c = s + r / 2, l = t.rotation * Math.PI / 180, u = Math.cos(l), d = Math.sin(l);
		b = (e) => {
			let n = e.shapeX + e.shapeW / 2 - i, r = e.shapeY + e.shapeH / 2 - c;
			t.flipH && (n = -n), t.flipV && (r = -r);
			let o = i + u * n - d * r, s = c + d * n + u * r;
			a({
				...e,
				...t.id === void 0 ? {} : { shapeId: t.id },
				shapeX: o - e.shapeW / 2,
				shapeY: s - e.shapeH / 2,
				rotation: t.rotation,
				...t.flipH ? { shapeFlipH: !0 } : {},
				...t.flipV ? { shapeFlipV: !0 } : {},
				tableCell: S,
				...x === void 0 ? {} : { cellHorzOverflow: x }
			});
		};
	}
	let C = [], w = t.rows.map(() => Array(d).fill(-1));
	for (let e = 0; e < t.rows.length; e++) {
		let n = t.rows[e], r = y[e];
		for (let i = 0; i < n.cells.length; i++) {
			let a = n.cells[i];
			if (a.hMerge || a.vMerge) continue;
			let o = a.gridSpan || 1, s = a.rowSpan || 1, c = f(i, o), l = 0;
			for (let t = 0; t < s; t++) l += p[e + t] ?? 0;
			let u = v(i, o), m = Math.min(e + s - 1, t.rows.length - 1), h = C.length;
			C.push({
				cell: a,
				colX: u,
				rowY: r,
				cellW: c,
				cellH: l,
				ci: i,
				ri: e,
				span: o,
				lastRi: m
			});
			for (let t = e; t <= m; t++) for (let e = i; e < i + o && e < d; e++) w[t][e] = h;
		}
	}
	let T = p.reduce((e, t) => e + t, 0), E = (r, a, o, s, c, l, u) => {
		if (r?.fillType === "image") e.beginPath(), e.rect(a, o, s, c), Na(e, r, i.shapeFillImages?.get(ja(r, l, u, t)), {
			x: a,
			y: o,
			w: s,
			h: c
		}, n, !1, t);
		else {
			let i = Pi(r, e, a, o, s, c, t.rotation, n * K);
			i && (e.fillStyle = i, e.fillRect(a, o, s, c));
		}
	}, D = [0], O = [0];
	for (let e of t.cols) D.push(D[D.length - 1] + e);
	for (let e of t.rows) O.push(O[O.length - 1] + e.height);
	let k = D[D.length - 1], A = O[O.length - 1] || t.height;
	E(t.background ?? null, o, s, g, T, k, A);
	for (let { cell: a, colX: o, rowY: s, cellW: l, cellH: u, ci: d, ri: f } of C) {
		let p = (D[Math.min(d + (a.gridSpan || 1), t.cols.length)] ?? 0) - (D[d] ?? 0), m = O[Math.min(f + (a.rowSpan || 1), t.rows.length)] - O[f] || t.height;
		if (E(a.fill, o, s, l, u, p, m), a.textBody) {
			b && (S = {
				row: f,
				column: d
			});
			let t = a.textColor ? Q(a.textColor) : null, p = a.textBody.vert;
			x = p === void 0 || typeof p == "string" && /^[ \t\r\n]*horz[ \t\r\n]*$/.test(p) ? a.horzOverflow === "overflow" ? "overflow" : "clip" : void 0, e.save();
			try {
				x === "clip" && Tn(e, o, l), mo(e, c(a.textBody), o, s, l, u, n, t, 0, !1, !1, "#000000", r, i, b);
			} finally {
				e.restore();
			}
		}
	}
	let j = i.dpr, M = (e, t) => {
		if (e < 0 || e >= w.length || t < 0 || t >= d) return null;
		let n = w[e][t];
		return n < 0 ? null : C[n];
	}, N = (r, i, a, o, s) => {
		if (ko(e, r, n, {
			x: Math.min(i, o),
			y: Math.min(a, s),
			w: Math.max(1, Math.abs(o - i)),
			h: Math.max(1, Math.abs(s - a))
		}, t.rotation), r.cmpd === "dbl" && !r.dashStyle && !r.customDash?.length && (i === o || a === s)) {
			e.fillStyle = e.strokeStyle, xt(e, i, a, o, s, Math.max(.5, X(r.width, n)), j);
			return;
		}
		let c = i === o ? l(i, e.lineWidth, j) : 0, u = a === s ? l(a, e.lineWidth, j) : 0;
		e.beginPath(), e.moveTo(i + c, a + u), e.lineTo(o + c, s + u), e.stroke();
	};
	for (let r of C) {
		let { cell: i, colX: a, rowY: o, cellW: s, cellH: c } = r;
		e.save();
		let l = t.rtl ? i.borderR : i.borderL, u = t.rtl ? i.borderL : i.borderR, m = t.rtl ? r.ci + r.span === d : r.ci === 0, h = t.rtl ? r.ci === 0 : r.ci + r.span === d, g = t.rtl ? r.ci - 1 : r.ci + r.span, _ = (e) => t.rtl ? e.borderR : e.borderL;
		if (r.ri === 0 && i.borderT && N(i.borderT, a, o, a + s, o), m && l && N(l, a, o, a, o + c), r.lastRi === t.rows.length - 1) {
			let e = i.borderB;
			e && N(e, a, o + c, a + s, o + c);
		} else {
			let e = r.lastRi + 1, t = o + c, n = Math.min(r.ci + r.span, d), a = r.ci;
			for (; a < n;) {
				let r = w[e][a], o = a + 1;
				for (; o < n && w[e][o] === r;) o++;
				let s = M(e, a), c = Nr(i.borderB, s ? s.cell.borderT : null);
				if (c) {
					let e = v(a, o - a);
					N(c, e, t, e + f(a, o - a), t);
				}
				a = o;
			}
		}
		if (h) {
			let e = u;
			e && N(e, a + s, o, a + s, o + c);
		} else {
			let e = a + s, t = r.ri;
			for (; t <= r.lastRi;) {
				let n = w[t][g], i = t;
				for (; i + 1 <= r.lastRi && w[i + 1][g] === n;) i++;
				let a = M(t, g), o = Nr(u, a ? _(a.cell) : null);
				o && N(o, e, y[t], e, y[i] + p[i]), t = i + 1;
			}
		}
		i.diagonalTl && (ko(e, i.diagonalTl, n, {
			x: a,
			y: o,
			w: s,
			h: c
		}, t.rotation), e.beginPath(), e.moveTo(a, o), e.lineTo(a + s, o + c), e.stroke()), i.diagonalTr && (ko(e, i.diagonalTr, n, {
			x: a,
			y: o,
			w: s,
			h: c
		}, t.rotation), e.beginPath(), e.moveTo(a + s, o), e.lineTo(a, o + c), e.stroke()), e.restore();
	}
	e.restore();
}
function Mo(e, t, n, r) {
	e.save(), e.globalAlpha = t.opacity, e.fillStyle = t.color, e.fillRect(0, 0, n, r), e.restore();
}
var No = /* @__PURE__ */ new WeakMap();
function Po(e) {
	No.set(e, (No.get(e) ?? 0) + 1);
}
var Fo = /* @__PURE__ */ rn(async () => (await import("./parse-error-placeholder-CAt4mti4.js")).parseErrorPlaceholder(ln));
async function Io(e, t, n, r, i = {}, a) {
	return Lo(e, t, n, r, i, a);
}
async function Lo(e, t, n, r, i = {}, a) {
	if (i.errorPlaceholder !== void 0) {
		let { errorPlaceholder: e, ...n } = i, r = cn(e);
		i = n, t.parseError && i.errorPlaceholderText === void 0 && (i = {
			...n,
			errorPlaceholderText: sn(an(r, Object.freeze({
				kind: "slide",
				slideIndex: t.index,
				slideNumber: t.slideNumber,
				message: on(t.parseError)
			})))
		});
	}
	let o = i.fetchImage ?? (i.fetchMedia ? xo(i.fetchMedia) : void 0), s = (No.get(e) ?? 0) + 1;
	No.set(e, s);
	let c = () => No.get(e) !== s, l = () => c() ? Promise.resolve(e) : Ro(e, t, n, r, i, a, o, c);
	return o && Mi(t) ? Et(o, i.imageResources, l) : l();
}
async function Ro(e, t, n, r, i = {}, a, o, s = () => !1) {
	let c = i.svgDecoder ?? (typeof Image < "u" ? Ct : void 0), l = i.width ?? ((de(e) ? e.offsetWidth : 0) || 960), u = l / n, d = Math.round(l), f = Math.round(r * u), p = i.dpr ?? be(), m = Ke(d * p, f * p), h = m.clamped ? p * m.scale : p;
	if (i.math && (await Hi(t, i.math), s())) return e;
	let _, v = t;
	if (i.math) {
		let e = [0], n = /* @__PURE__ */ new Map();
		for (let n of t.elements) {
			let t = !1;
			for (let e of Bi(n)) if (e.paragraphs.some((e) => e.runs.some((e) => e.type === "math" && zi.has(e.nodes)))) {
				t = !0;
				break;
			}
			e.push(e[e.length - 1] + +!!t);
		}
		t.elements.forEach((r, i) => {
			if (r.type !== "shape" && r.type !== "table" || !r.mathFallback) return;
			let a = r.mathFallback, o = i - a.before, s = i + a.after + 1;
			o >= 0 && s <= t.elements.length && e[s] > e[o] && s > (n.get(o)?.end ?? o) && n.set(o, {
				end: s,
				elements: a.elements
			});
		});
		let r = [];
		_ = [];
		for (let e = 0; e < t.elements.length;) {
			let i = n.get(e);
			if (i) {
				for (let e of i.elements) r.push(e), _.push(void 0);
				e = i.end;
			} else _.push(e), r.push(t.elements[e++]);
		}
		t = {
			...t,
			elements: r
		};
	}
	let y = await ki(t, d, f, u, h, i.imageResources, i.fetchImage, i.fetchMedia, o, i.tiff), b = () => {
		e.width = m.width, e.height = m.height, de(e) && (e.style.width = `${d}px`, e.style.display || (e.style.display = "block"));
		let t = e.getContext("2d");
		if (!t) throw Error("Could not get 2D context");
		return t.scale(h, h), t;
	};
	if (t.parseError) {
		let n = Fo.loaded;
		return !n && (n = await Fo.load(), s()) || n(b(), d, f, t.slideNumber, t.parseError, i.errorPlaceholderText), e;
	}
	let x = t.theme ? t.theme.defaultTextColor : i.defaultTextColor, S = x ? `#${x}` : "#000000", C = i.parsedTextChain ? "#000000" : S, w = /* @__PURE__ */ new Map(), T = /* @__PURE__ */ new Map(), E = {
		cjkFallback: i.cjkFallback ? Kt(t, t.theme ? t.theme.majorFont : i.majorFont ?? null, t.theme ? t.theme.minorFont : i.minorFont ?? null, i.cjkFallback) : void 0,
		themeMajorFont: t.theme ? t.theme.majorFont : i.majorFont ?? null,
		themeMinorFont: t.theme ? t.theme.minorFont : i.minorFont ?? null,
		themeHlinkColor: t.theme ? t.theme.hlinkColor : i.hlinkColor ?? null,
		embeddedFontAliases: i.embeddedFontAliases,
		embeddedFontAuthoredFamilies: i.embeddedFontAuthoredFamilies,
		embeddedFontTuples: i.embeddedFontTuples,
		officeFontRoutes: i.officeFontRoutes,
		officeInstalledFamilies: i.officeInstalledFamilies,
		fontSources: i.fontSources,
		symbolFaces: i.symbolFaces ? i.symbolFaces.oracleFor(e.getContext("2d")) : ce(e.getContext("2d"), i.createCanvas ? { createCanvas: i.createCanvas } : {}),
		dpr: h,
		smartArtFallbackTextColor: Lr(t.background, S) ?? S,
		pictureBulletImages: w,
		shapeFillImages: T
	}, D = [], O = () => D.some((e) => e.failure);
	if (D.push(await Da(t.background, d, f, u, i.fetchImage, i.tiff, c, y)), s()) return e;
	let k = t.slideNumber, A = O() ? [] : t.elements.map((e) => e.type === "picture" ? wo(e, u, i.fetchImage, i.tiff, h, c, y) : e.type === "media" ? Do(e, u, i.fetchMedia, i.skipMediaControls, o, i.tiff, h, c, y) : Promise.resolve(null)).map((e) => e.catch((e) => ({
		...Ea,
		failure: { error: e }
	}))), j = /* @__PURE__ */ new Map();
	if (!O() && i.fetchImage) {
		let n = i.fetchImage, r = /* @__PURE__ */ new Map();
		for (let { fill: e, width: n, height: i, host: a } of ji(t)) {
			if (!(n > 0) || !(i >= 0)) continue;
			let t = e.blipEffects?.length && !e.tile ? Se(n, i, e.srcRect, e.fillRect) : {
				width: n,
				height: i
			}, o = ja(e, n, i, a), s = r.get(o), c = t.width / K, l = t.height / K, d = e.fillRect ?? {}, f = xi(X(n, u) * (1 - (d.l ?? 0) - (d.r ?? 0)), X(i, u) * (1 - (d.t ?? 0) - (d.b ?? 0)), h, e.srcRect);
			r.set(o, s ? {
				fill: s.fill,
				host: s.host,
				widthPt: Math.max(s.widthPt, c),
				heightPt: Math.max(s.heightPt, l),
				targetWidthPx: Math.max(s.targetWidthPx ?? 0, f?.targetWidthPx ?? 0) || void 0,
				targetHeightPx: Math.max(s.targetHeightPx ?? 0, f?.targetHeightPx ?? 0) || void 0,
				preserveNaturalSize: s.preserveNaturalSize || e.tile != null,
				hasSourceCrop: s.hasSourceCrop || e.srcRect != null
			} : {
				fill: e,
				host: a,
				widthPt: c,
				heightPt: l,
				targetWidthPx: f?.targetWidthPx,
				targetHeightPx: f?.targetHeightPx,
				preserveNaturalSize: e.tile != null,
				hasSourceCrop: e.srcRect != null
			});
		}
		let a = /* @__PURE__ */ new Map(), o = [];
		for (let e of t.elements) {
			if (e.type !== "chart" || !Number.isFinite(e.width) || e.width <= 0 || !Number.isFinite(e.height) || e.height <= 0) continue;
			let t = {
				widthPt: e.width / K,
				heightPt: e.height / K,
				targetWidthPx: X(e.width, u) * h,
				targetHeightPx: X(e.height, u) * h
			}, n = [], r = !0;
			for (let i of Re(e.chart)) {
				let e = Pe(i, t);
				if (!e) {
					r = !1;
					break;
				}
				n.push({
					usage: i,
					size: e
				});
			}
			r && o.push({
				element: e,
				frame: t,
				usages: n
			});
		}
		let l = /* @__PURE__ */ new Map(), d = /* @__PURE__ */ new Set();
		for (let e of Fe(o.map(({ element: e }) => e.chart), (e, t) => Pe(e, o[t].frame) != null)) d.add(Me(e.fill));
		for (let { element: e, usages: t } of o) {
			let n = {
				rotation: e.rotation,
				flipH: e.flipH,
				flipV: e.flipV
			};
			for (let { usage: e, size: r } of t) {
				let { fill: t } = e;
				if (!d.has(Me(t)) || Be(t)) continue;
				let i = Ie(t, n), a = l.get(i) ?? {
					fill: t,
					widthPt: 0,
					heightPt: 0,
					preserveNaturalSize: e.preserveNaturalSize,
					hasSourceCrop: e.hasSourceCrop,
					...t.blipEffects?.length ? { host: n } : {}
				}, o = a.preserveNaturalSize || e.preserveNaturalSize, s = a.hasSourceCrop || e.hasSourceCrop, c = !Z(t) && (t.mimeType === "image/svg+xml" || kt({
					svgImagePath: t.svgImagePath,
					srcRect: s ? !0 : null
				})), u = o || Z(t) || c ? void 0 : Ei(y, Ti(t.imagePath, Z(t)));
				l.set(i, {
					...a,
					widthPt: Math.max(a.widthPt, r.widthPt),
					heightPt: Math.max(a.heightPt, r.heightPt),
					targetWidthPx: o ? void 0 : u?.targetWidthPx ?? (c && Math.max(a.targetWidthPx ?? 0, r.targetWidthPx ?? 0) || void 0),
					targetHeightPx: o ? void 0 : u?.targetHeightPx ?? (c && Math.max(a.targetHeightPx ?? 0, r.targetHeightPx ?? 0) || void 0),
					maxRetainedPixels: u?.maxRetainedPixels,
					preserveNaturalSize: o,
					hasSourceCrop: s
				});
			}
		}
		let f = (e) => {
			let t = [];
			for (let { element: n } of o) {
				let r = {
					rotation: n.rotation,
					flipH: n.flipH,
					flipV: n.flipV
				};
				for (let { fill: a, occurrence: o } of pt(nn(n.chart, tn(E.fontSources)), {
					x: X(n.x, u),
					y: X(n.y, u),
					w: X(n.width, u),
					h: X(n.height, u)
				}, K * u, n.rotation, i.threeD, i.regionMap, i.chartEx, e ? Ge(j, r, !1) : void 0)) {
					if (!d.has(Me(a))) continue;
					let e = He(a, r, o);
					l.has(e) || (l.set(e, {
						fill: a,
						widthPt: o.widthPt,
						heightPt: o.heightPt,
						preserveNaturalSize: !0,
						hasSourceCrop: a.srcRect != null,
						host: r,
						renderedSize: o
					}), t.push(e));
				}
			}
			return ht(l.size), t;
		};
		f(!1);
		for (let e of t.elements) if (!(e.type !== "shape" || !e.textBody)) for (let t of e.textBody.paragraphs) {
			let n = br(t.bullet);
			if (n.type === "blip") {
				let r = ca(e.textBody, t, n) * K * u * h, i = a.get(n.imagePath);
				i ? Number.isFinite(r) && r > 0 && (i.targetHeightPx = Math.max(i.targetHeightPx ?? 0, r)) : a.set(n.imagePath, {
					mimeType: n.mimeType,
					...Number.isFinite(r) && r > 0 ? { targetHeightPx: r } : {}
				});
			}
		}
		if (a.size > 0 || l.size > 0 || r.size > 0) {
			let t = [...a].map(async ([e, { mimeType: t, targetHeightPx: r }]) => {
				try {
					let a = t === "image/svg+xml" ? r === void 0 ? {} : {
						targetWidthPx: 1,
						targetHeightPx: r
					} : Ei(y, Ti(e)) ?? {}, o = t === "image/svg+xml" ? await wt(e, n, {
						...a,
						workerDecoder: c
					}) : await jt(e, t, n, {
						tiff: i.tiff,
						...a
					});
					w.set(e, o);
				} catch (t) {
					if (ft(t, "tiff")) {
						w.set(e, null);
						return;
					}
					if (t instanceof g || Ci(t) || Ye(t) || gt(t)) throw t;
					w.set(e, null);
				}
			}), o = async ([e, t]) => {
				let { fill: r, widthPt: a, heightPt: o, targetWidthPx: s, targetHeightPx: l, maxRetainedPixels: u, hasSourceCrop: d, host: f, renderedSize: p } = t, m = s && l ? {
					targetWidthPx: s,
					targetHeightPx: l,
					...u === void 0 ? {} : { maxRetainedPixels: u }
				} : void 0;
				try {
					let t = () => r.mimeType === "image/svg+xml" && !Z(r) ? wt(r.imagePath, n, {
						...m ?? {},
						workerDecoder: c
					}) : Dt(r.imagePath, r.mimeType, Ne(r, f, p) ?? void 0, n, {
						widthPt: p ? p.widthPt : r.blipEffects?.length ? 0 : a,
						heightPt: p ? p.heightPt : r.blipEffects?.length ? 0 : o,
						...m ?? {},
						failClosedOnDuotoneFailure: !0,
						tiff: i.tiff,
						svgDecoder: c
					}), s, l = {
						svgImagePath: r.svgImagePath,
						srcRect: d ? !0 : null
					};
					if (!Z(r) && kt(l)) try {
						s = await wt(l.svgImagePath, n, {
							...m ?? {},
							workerDecoder: c
						});
					} catch (e) {
						if (e instanceof g || Ci(e) || Ye(e)) throw e;
						s = await t();
					}
					else s = await t();
					j.set(e, s);
				} catch (t) {
					if (ft(t, "tiff")) {
						j.set(e, null);
						return;
					}
					if (t instanceof g || Ci(t) || Ye(t) || gt(t)) throw t;
					j.set(e, null);
				}
			}, u = [(async () => {
				for (await Promise.all([...l].map(o));;) {
					let e = f(!0);
					if (e.length === 0) break;
					await Promise.all(e.map((e) => o([e, l.get(e)])));
				}
			})()], d = [...r].map(async ([e, { fill: t, host: r, widthPt: a, heightPt: o, targetWidthPx: s, targetHeightPx: l, preserveNaturalSize: u, hasSourceCrop: d }]) => {
				let f = t.mimeType === "image/svg+xml" || !Z(t, r) && kt({
					svgImagePath: t.svgImagePath,
					srcRect: d ? !0 : null
				}), p = !u && !Z(t, r) ? Ei(y, Ti(t.imagePath, Z(t, r))) : void 0, m = f ? !u && s && l ? {
					targetWidthPx: s,
					targetHeightPx: l
				} : void 0 : p;
				try {
					let s = u ? (await Si(t, Tt(t.imagePath, t.mimeType, n))).dimensions ?? void 0 : void 0, l = () => t.mimeType === "image/svg+xml" && !Z(t, r) ? wt(t.imagePath, n, {
						...m ?? {},
						workerDecoder: c
					}) : Dt(t.imagePath, t.mimeType, Z(t, r), n, {
						...wi(t, a, o),
						...m ?? {},
						failClosedOnDuotoneFailure: !0,
						tiff: i.tiff,
						svgDecoder: c
					}), f;
					if (!Z(t, r) && kt({
						svgImagePath: t.svgImagePath,
						srcRect: d ? !0 : null
					})) try {
						f = await wt(t.svgImagePath, n, {
							...m ?? {},
							workerDecoder: c
						});
					} catch (e) {
						if (e instanceof g || Ci(e) || Ye(e)) throw e;
						f = await l();
					}
					else f = await l();
					T.set(e, f ? {
						image: f,
						intrinsicSize: s
					} : null);
				} catch (t) {
					if (ft(t, "tiff")) {
						T.set(e, null);
						return;
					}
					if (t instanceof g || Ci(t) || Ye(t) || gt(t)) throw t;
					T.set(e, null);
				}
			});
			try {
				await Promise.all([
					...t,
					...u,
					...d
				]);
			} catch (e) {
				D.push({
					...Ea,
					failure: { error: e }
				});
			}
			if (s()) return e;
		}
	}
	let M = [];
	if (!O()) for (let t of A) {
		let n = await t;
		if (s()) return e;
		if (M.push(n), n?.failure) break;
	}
	if (s()) return e;
	let N = b();
	for (let e of D) if (e.paint(N), e.failure) throw e.failure.error;
	let P = {
		a: h,
		d: h
	};
	for (let [n, r] of t.elements.entries()) {
		if (s()) return e;
		let t = _ ? _[n] : n, o = a ? (e) => {
			a(t === void 0 ? {
				...e,
				renderElementIndex: n,
				elementIndex: void 0,
				origin: void 0,
				shapeId: void 0
			} : {
				...e,
				renderElementIndex: n,
				elementIndex: t,
				origin: v.elementSources?.[t]?.origin ?? "slide"
			});
		} : void 0;
		if (r.type === "shape") $e(N, P, () => so(N, r, u, C, k, E, o, i.fetchImage));
		else if (r.type === "picture" || r.type === "media") {
			let e = M[n];
			if (e && ($e(N, P, () => e.paint(N)), e.failure)) throw e.failure.error;
		} else if (r.type === "table") $e(N, P, () => jo(N, r, u, k, E, o));
		else if (r.type === "chart") {
			let e = K * u;
			$e(N, P, () => {
				N.save(), Ao(N, r, u), mt(N, nn(r.chart, tn(E.fontSources)), {
					x: X(r.x, u),
					y: X(r.y, u),
					w: X(r.width, u),
					h: X(r.height, u)
				}, e, r.rotation, i.threeD, i.regionMap, Ge(j, {
					rotation: r.rotation,
					flipH: r.flipH,
					flipV: r.flipV
				}), i.chartEx), N.restore();
			});
		}
	}
	return s() || i.dim && Mo(N, i.dim, d, f), e;
}
var zo = 1024 * 1024, Bo = class {
	options;
	active = /* @__PURE__ */ new Set();
	nextSessionId = 1;
	constructor(e) {
		if (this.options = e, !Number.isSafeInteger(e.slideCount) || e.slideCount < 0) throw TypeError("slideCount must be a non-negative safe integer");
		if (e.generation !== void 0 && (!Number.isSafeInteger(e.generation) || e.generation <= 0)) throw TypeError("generation must be a positive safe integer");
	}
	async load(e, t = !0, n) {
		this.assertSlideIndex(e);
		let r = this.nextSessionId++, i = {
			sessionId: r,
			operationId: r,
			generation: this.options.generation ?? 1
		}, a = new Ht(this.options.transport, {
			...i,
			maxByteCredit: v,
			timeoutMs: n
		});
		this.active.add(a);
		try {
			await this.options.open(e, i, n);
			let r = await Vt(a, zo, v);
			try {
				let e = r.usage ?? a.usageCheckpoint;
				e && this.options.onUsage?.(e);
				let n = t ? JSON.parse(new TextDecoder().decode(new Uint8Array(r.payload))) : void 0;
				return await r.ack(), n;
			} finally {
				r.disposeTransferred();
			}
		} catch (e) {
			throw await a.cancel("request-error").catch(() => void 0), e;
		} finally {
			this.active.delete(a);
		}
	}
	cancelAll() {
		for (let e of this.active) e.cancel("closed").catch(() => void 0);
		this.active.clear();
	}
	assertSlideIndex(e) {
		if (!Number.isSafeInteger(e) || e < 0 || e >= this.options.slideCount) throw RangeError(`Slide index ${e} out of range (count: ${this.options.slideCount})`);
	}
};
function Vo(e) {
	return !!e && typeof e == "object" && e.protocol === "ooxml-pull-v1";
}
export { Lo as a, Io as i, Vo as n, Tr as o, Po as r, Bo as t };
