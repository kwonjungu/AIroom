import { M as e, a as t, i as n, m as r, n as i, o as a, p as o } from "./wmf-HY7sNn5s.js";
import { n as s, t as c } from "./ooxml-error-DbICW35n.js";
import { $ as l, $i as u, $r as d, $t as f, A as p, Ai as m, An as h, Ar as g, At as _, B as v, Bi as y, Bn as b, Br as x, Bt as S, C, Ci as w, Cr as T, Ct as E, D, Di as O, Dn as k, Dr as A, Dt as j, E as M, Ei as ee, Er as N, Et as P, F as te, Fi as F, Fr as ne, Ft as I, G as re, H as ie, Hi as ae, Hr as L, Ht as oe, I as se, Ii as R, Ir as ce, It as z, J as le, Ji as B, Jr as ue, Jt as de, K as fe, Ki as pe, Kr as me, L as he, Li as ge, Lr as _e, Lt as ve, M as ye, Mi as V, Mr as be, Mt as H, N as xe, Ni as Se, Nr as Ce, O as we, Oi as Te, On as Ee, Or as De, Ot as Oe, P as ke, Pi as Ae, Pr as je, Q as Me, Qi as Ne, Qt as Pe, R as Fe, Ri as Ie, Rr as Le, Rt as Re, Si as ze, Sn as Be, Sr as Ve, T as U, Ti as He, Tr as W, Tt as G, U as Ue, Ui as We, Ur as Ge, Ut as Ke, V as qe, Vi as Je, Vr as K, Vt as Ye, W as q, Wi as Xe, Wn as Ze, Wr as Qe, Wt as $e, X as et, Xi as J, Xr as Y, Xt as tt, Y as nt, Yi as rt, Yn as it, Yr as at, Yt as ot, Z as st, Zi as ct, Zt as lt, _ as ut, _i as dt, _n as ft, _r as pt, ai as mt, ar as ht, at as gt, bi as _t, bn as vt, br as yt, bt, ci as xt, cn as St, cr as Ct, ct as wt, di as Tt, dn as Et, dr as Dt, dt as Ot, ea as kt, ei as At, en as jt, er as Mt, et as Nt, fi as Pt, fn as Ft, fr as It, ft as Lt, gi as Rt, gr as zt, gt as Bt, hi as Vt, hr as Ht, ht as Ut, ii as Wt, it as Gt, j as Kt, ji as qt, jr as Jt, jt as Yt, k as Xt, ki as Zt, kn as Qt, kr as $t, kt as en, l as tn, li as nn, ln as rn, lr as an, lt as on, m as sn, mi as cn, mr as ln, mt as un, n as dn, ni as fn, nt as pn, o as mn, oi as hn, on as gn, ot as _n, pi as vn, pn as yn, pr as bn, pt as xn, q as Sn, qi as Cn, qr as wn, qt as Tn, r as En, ri as Dn, rt as On, s as kn, sr as An, st as jn, t as Mn, ti as Nn, tt as Pn, ui as Fn, un as In, ur as Ln, ut as Rn, v as zn, vi as Bn, vr as Vn, vt as Hn, w as Un, wi as Wn, wr as Gn, wt as Kn, xn as qn, xr as Jn, xt as Yn, y as Xn, yi as Zn, yr as Qn, yt as $n, z as er, zi as tr, zr as nr, zt as rr } from "./plot-area-frame-BSqoSYxZ.js";
import { i as ir, o as ar } from "./units-BBDOirYi.js";
import { c as or, f as sr, l as X, o as Z, s as Q, u as $ } from "./pixel-budget-DI82Hn3R.js";
import { c as cr, f as lr, o as ur } from "./paint-s8gGHFU5.js";
import { i as dr, n as fr, r as pr, t as mr } from "./chart-number-format-BTQAc_0Z.js";
import { a as hr, i as gr, r as _r, t as vr } from "./tiff-contract-DEd8CGuz.js";
import { n as yr } from "./raster-target-Ca3tyA0L.js";
import { a as br, d as xr, f as Sr, i as Cr, l as wr, m as Tr, n as Er, o as Dr, p as Or, u as kr, v as Ar, y as jr } from "./three-d-w9z2wJm4.js";
var Mr = 7;
function Nr(e) {
	let t = /* @__PURE__ */ new Map();
	for (let n of e.dataPointOverrides ?? []) t.has(n.idx) || t.set(n.idx, n);
	return t;
}
function Pr(e, t) {
	return e.chartexFormatIdx ?? t;
}
function Fr(e) {
	return e != null && Number.isFinite(e) && e !== 0;
}
function Ir(e) {
	return e === "line" || e === "stackedLine" || e === "stackedLinePct" || e === "scatter" || e === "radar" || e === "stock";
}
function Lr(e, t, n = 4 / 3, i, a = !1) {
	if (a || e.series.length === 0) return null;
	let o = an(e), s = g(e), c = Ce(e, !0), l = e.series.some((t, n) => Ln(e.chartType, o[n]) === "scatter" && (t.categories ?? e.categories).some((e) => Number.isFinite(Number.parseFloat(e)))), u = e.dataTable?.showKeys === !0 && It(e.chartType) && (e.categories.length > 0 || e.series.some((e) => (e.categories?.length ?? e.values.length) > 0)), d = 0, f = (e, r = i?.w ?? 1, a = i?.h ?? 1) => {
		if (e == null) return !0;
		let o = e.fillType === "image" ? kn(e, t, r, a, n) : yt(e);
		return e.fillType === "gradient" && o > 4096 || o > 1048576 - d ? !1 : (d += o, !0);
	}, p = (t, n, r, a, o = "dataPoint", s = o === "dataPoint", c = i?.w ?? 1, l = i?.h ?? 1) => (!s || f(Te(e, t, n, r, a), c, l)) && f(Zt(e, o, t, n, r).paint, c, l), m = (t, i, a, o, s) => {
		let c = hn(e.dataTable?.fontSizeHpt, n) ?? 9 * n, l = hn(t.seriesDataLabels?.fontSizeHpt ?? e.dataLabelFontSizeHpt, n) ?? 10 * n;
		for (let e of t.dataLabelOverrides ?? []) l = Math.max(l, hn(e.fontSizeHpt, n) ?? l);
		let u = o === "table" ? c : o === "label" ? l : hn(e.legendFontSizeHpt, n) ?? 10 * n;
		if (o === "table") return {
			width: Math.max(12 * n, u * 1.7),
			height: u
		};
		if (s !== "dataPointLine") {
			let e = Mr * n;
			return {
				width: e,
				height: e
			};
		}
		let d = Zt(e, s, t, i, a), f = lt(d.widthEmu, n), p = r(d.dash ?? "solid", f), m = p.length > 0 ? p.reduce((e, t) => e + t, 0) + p[0] : 0;
		return {
			width: Math.max(u * 1.6, m),
			height: u
		};
	};
	for (let t = 0; t < e.series.length; t++) {
		let n = e.series[t], r = o[t], a = Ln(n.seriesType ?? e.chartType, r);
		r?.kind === "bar3D" || r?.kind === "area3D" || r?.kind === "line3D" ? a = e.chartType : r?.kind === "pie3D" && (a = "pie");
		let d = Nr(n), f = rt(e, t), h = Pr(n, t), g = (e) => f ? e : h, _ = r?.kind === "bar" || r?.kind === "bar3D" || r == null && (a === "clusteredBar" || a === "clusteredBarH" || a === "stackedBar" || a === "stackedBarH" || a === "stackedBarPct" || a === "stackedBarHPct"), v = r?.kind === "pie" || r?.kind === "pie3D" || r?.kind === "doughnut" || r?.kind === "ofPie" || r == null && (a === "pie" || a === "doughnut" || a === "ofPie"), y = r?.kind === "area" || r?.kind === "area3D" || r == null && (a === "area" || a === "stackedArea" || a === "stackedAreaPct"), b = a === "radar" && (r?.radarStyle ?? e.radarStyle) === "filled";
		if (_ || v) {
			let t = Math.max(1, n.values.length, e.categories.length), o = r?.barDirection === "bar" || a.endsWith("BarH") || a.endsWith("BarHPct"), s = _ && !o ? (i?.w ?? 1) / t : i?.w ?? 1, c = _ && o ? (i?.h ?? 1) / t : i?.h ?? 1;
			for (let e = 0; e < n.values.length; e++) if (Fr(n.values[e]) && !p(n, d.get(e), g(e), e, "dataPoint", !0, s, c)) return St + 1;
			if (a === "ofPie") {
				let t = An(e.ofPie, n.values), r = t == null ? void 0 : [...t].find((e) => Fr(n.values[e]));
				if (r != null && !p(n, d.get(r), g(r), r, "dataPoint", !0, i?.w ?? 1, i?.h ?? 1)) return St + 1;
			}
		} else if ((y || b) && (b ? n.values.length >= 3 && n.values.every((e) => e != null && Number.isFinite(e)) : n.values.length > 0) && !p(n, void 0, h, void 0)) return St + 1;
		let x = r?.kind === "bubble" || r == null && e.chartType === "bubble", S = a !== "scatter" || !x;
		if (Ir(a) && !b && S) {
			if (f && a !== "stock") {
				let t = a === "stackedLine" || a === "stackedLinePct" || r?.kind === "line" && (r.grouping === "stacked" || r.grouping === "percentStacked") || a === "line" && e.dispBlanksAs === "zero", i = !t && e.dispBlanksAs === "span", o = [], s = () => {
					for (let e = 1; e < o.length; e++) {
						let t = o[e];
						if (!p(n, d.get(t), t, t, "dataPointLine", !1)) return !1;
					}
					if (a === "radar" && o.length > 1) {
						let e = o[0];
						if (!p(n, d.get(e), e, e, "dataPointLine", !1)) return !1;
					}
					return o = [], !0;
				};
				for (let e = 0; e < n.values.length; e++) {
					if (n.sourceHidden?.[e] === !0) {
						if (!s()) return St + 1;
						continue;
					}
					let r = n.values[e];
					if (r != null && Number.isFinite(r) || t) o.push(e);
					else if (!i && !s()) return St + 1;
				}
				if (!s()) return St + 1;
			} else if (!p(n, void 0, h, void 0, "dataPointLine", !1)) return St + 1;
		}
		let C = v || f, w = Ht(e, n, a, Math.max(n.values.length, n.categories?.length ?? 0, e.categories.length), l, {
			chartType: Ln(e.chartType, r),
			bubbleScale: r?.bubbleScale ?? e.bubbleScale,
			showNegativeBubbles: r?.showNegativeBubbles ?? e.showNegativeBubbles
		}, t), T = ne(c, s, t);
		if (a !== "bubble" && (e.showLegend && T || u || w > 0)) {
			let i = Ir(a) ? "dataPointLine" : "dataPoint", o = i === "dataPoint", f = (e, t, r, a) => {
				let s = m(n, t, r, e, i);
				return p(n, t, r, a, i, o, s.width, s.height);
			};
			if (C) {
				let i = Math.max(n.values.length, n.categories?.length ?? 0, e.categories.length), o = new Map((n.dataLabelOverrides ?? []).map((e) => [e.idx, e]));
				for (let u = 0; u < i; u++) {
					let i = g(u), p = d.get(u), m = o.get(u), h = !nr(n.seriesDataLabels, m) && (m?.showLegendKey ?? n.seriesDataLabels?.showLegendKey ?? !1) === !0 && ln(e, n, a, u, l, {
						chartType: Ln(e.chartType, r),
						bubbleScale: r?.bubbleScale ?? e.bubbleScale,
						showNegativeBubbles: r?.showNegativeBubbles ?? e.showNegativeBubbles
					});
					if (e.showLegend && be(c, s, t, u) && !f("legend", p, i, u) || h && !f("label", p, i, u)) return St + 1;
				}
				let p = d.get(0);
				if (u && !f("table", p, g(0), 0)) return St + 1;
			} else {
				if (e.showLegend && T && !f("legend", void 0, h, void 0) || u && !f("table", void 0, h, void 0)) return St + 1;
				for (let e = 0; e < w; e++) if (!f("label", void 0, h, void 0)) return St + 1;
			}
		}
	}
	let h = (t, n) => {
		let r = t[0], a = t.at(-1);
		if (!r || !a) return !0;
		let o = Math.max(r.values.length, a.values.length);
		for (let t = 0; t < o; t++) {
			let s = r.values[t], c = a.values[t];
			if (s == null || c == null || !Number.isFinite(s) || !Number.isFinite(c) || s === c) continue;
			let l = c > s ? "upBar" : "downBar", u = c > s ? n.up : n.down, d = e.chartType.endsWith("BarH") || e.chartType.endsWith("BarHPct"), p = d ? i?.w ?? 1 : (i?.w ?? 1) / o, m = d ? (i?.h ?? 1) / o : i?.h ?? 1;
			if (!f(V(e, u, l), p, m)) return !1;
		}
		return !0;
	};
	for (let t of e.lineGroupDecorations ?? []) {
		if (!t.upDownBars) continue;
		let n = e.series.filter((e) => e.lineGroupIndex === t.groupIndex);
		if (n.length === 0 && t.groupIndex === 0 && (n = e.series), !h(n, t.upDownBars)) return St + 1;
	}
	if (e.stockUpDownBars) {
		let t = e.plotGroups?.find((e) => e.kind === "stock");
		if (!h(t ? e.series.slice(t.seriesStart, t.seriesStart + t.seriesCount) : e.series, e.stockUpDownBarStyle ?? {
			gapWidthPercent: 150,
			up: {},
			down: {}
		})) return St + 1;
	}
	return d;
}
function Rr(e, t, n = 4 / 3, r, i = !1) {
	return u(() => We(() => Lr(e, t, n, r, i)));
}
var zr = class e extends Error {
	codec;
	code = "ooxml-optional-image-codec-unavailable";
	constructor(t) {
		super(`${t.toUpperCase()} image requires an optional codec`), this.codec = t, this.name = "OptionalImageCodecUnavailableError", Object.setPrototypeOf(this, e.prototype);
	}
};
function Br(e, t) {
	if (typeof e != "object" || !e) return !1;
	try {
		let n = e;
		return n.code === "ooxml-optional-image-codec-unavailable" && n.codec === "tiff" && (t === void 0 || n.codec === t);
	} catch {
		return !1;
	}
}
var Vr = {
	tiff: "TIFF image unavailable",
	pict: "PICT image unsupported",
	equation: "Equation unavailable"
};
function Hr(e, t, n, r) {
	if (![
		n.x,
		n.y,
		n.width,
		n.height
	].every(Number.isFinite) || n.width <= 0 || n.height <= 0) return;
	let i = (n, r, i, a) => {
		e.save();
		try {
			e.fillStyle = "#888", e.font = "11px sans-serif", e.textAlign = "center", e.textBaseline = "middle", e.fillText(Vr[t], n + i / 2, r + a / 2, i);
		} finally {
			e.restore();
		}
	};
	if (!r) {
		i(n.x, n.y, n.width, n.height);
		return;
	}
	let a = it(n.width, n.height, null, r.transform);
	Mt(e, n.x, n.y, a, i);
}
function Ur(e) {
	let t = e.close;
	typeof t == "function" && t.call(e);
}
function Wr(e, t) {
	return e[t] << 8 | e[t + 1];
}
function Gr(e, t) {
	return (e[t] << 24 | e[t + 1] << 16 | e[t + 2] << 8 | e[t + 3]) >>> 0;
}
function Kr(e, t) {
	return e[t] | e[t + 1] << 8;
}
function qr(e, t) {
	return e[t] | e[t + 1] << 8 | e[t + 2] << 16 | e[t + 3] << 24 | 0;
}
function Jr(e) {
	let t = e.length;
	return t >= 24 && e[0] === 137 && e[1] === 80 && e[2] === 78 && e[3] === 71 && e[4] === 13 && e[5] === 10 && e[6] === 26 && e[7] === 10 ? e[12] === 73 && e[13] === 72 && e[14] === 68 && e[15] === 82 ? {
		width: Gr(e, 16),
		height: Gr(e, 20)
	} : null : t >= 10 && e[0] === 71 && e[1] === 73 && e[2] === 70 && e[3] === 56 && (e[4] === 55 || e[4] === 57) && e[5] === 97 ? {
		width: Kr(e, 6),
		height: Kr(e, 8)
	} : t >= 26 && e[0] === 66 && e[1] === 77 ? Yr(e, 14) === 12 ? {
		width: Kr(e, 18),
		height: Kr(e, 20)
	} : {
		width: Math.abs(qr(e, 18)),
		height: Math.abs(qr(e, 22))
	} : t >= 16 && e[0] === 82 && e[1] === 73 && e[2] === 70 && e[3] === 70 && e[8] === 87 && e[9] === 69 && e[10] === 66 && e[11] === 80 ? Xr(e) : t >= 4 && e[0] === 255 && e[1] === 216 ? ei(e) : t >= 4 && (e[0] === 73 && e[1] === 73 || e[0] === 77 && e[1] === 77) ? hr(e) : null;
}
function Yr(e, t) {
	return (e[t] | e[t + 1] << 8 | e[t + 2] << 16 | e[t + 3] << 24) >>> 0;
}
function Xr(e) {
	let t = e.length, n = e[12], r = e[13], i = e[14], a = e[15];
	if (n === 86 && r === 80 && i === 56 && a === 32) return t < 30 ? null : {
		width: Kr(e, 26) & 16383,
		height: Kr(e, 28) & 16383
	};
	if (n === 86 && r === 80 && i === 56 && a === 76) {
		if (t < 25 || e[20] !== 47) return null;
		let n = Yr(e, 21);
		return {
			width: (n & 16383) + 1,
			height: (n >>> 14 & 16383) + 1
		};
	}
	return n === 86 && r === 80 && i === 56 && a === 88 ? t < 30 ? null : {
		width: (e[24] | e[25] << 8 | e[26] << 16) + 1,
		height: (e[27] | e[28] << 8 | e[29] << 16) + 1
	} : null;
}
function Zr(e) {
	return e.length >= 6 && e[0] === 69 && e[1] === 120 && e[2] === 105 && e[3] === 102 && e[4] === 0 && e[5] === 0;
}
function Qr(e) {
	if (e.length < 14 || !Zr(e)) return null;
	let t = e[6] === 73 && e[7] === 73, n = e[6] === 77 && e[7] === 77;
	if (!t && !n) return null;
	let r = new DataView(e.buffer, e.byteOffset, e.byteLength);
	if (r.getUint16(8, t) !== 42) return null;
	let i = r.getUint32(10, t), a = 6 + i;
	if (i < 8 || a + 2 > e.length) return null;
	let o = r.getUint16(a, t), s = a + 2, c = Math.min(o, Math.floor((e.length - s) / 12));
	for (let e = 0; e < c; e++) {
		let n = s + e * 12;
		if (r.getUint16(n, t) !== 274 || r.getUint16(n + 2, t) !== 3 || r.getUint32(n + 4, t) !== 1) continue;
		let i = r.getUint16(n + 8, t);
		if (i >= 1 && i <= 8) return i;
	}
	return null;
}
function $r(e, t) {
	return t !== null && t >= 5 && t <= 8 ? {
		width: e.height,
		height: e.width
	} : e;
}
function ei(e) {
	let t = e.length, n = 2, r = null, i = !1, a = null;
	for (; n + 1 < t;) {
		if (e[n] !== 255) {
			n += 1;
			continue;
		}
		let o = e[n + 1];
		if (o === 255) {
			n += 1;
			continue;
		}
		if (o === 216 || o === 1 || o >= 208 && o <= 215) {
			n += 2;
			continue;
		}
		if (o === 217 || o === 218) return a ? $r(a, r) : null;
		if (n + 3 >= t) return null;
		let s = Wr(e, n + 2);
		if (o >= 192 && o <= 207 && o !== 196 && o !== 200 && o !== 204) {
			if (s < 7 || n + 8 >= t) return null;
			let r = Wr(e, n + 5), i = Wr(e, n + 7);
			a ??= {
				width: i,
				height: r
			};
		}
		if (s < 2) return null;
		let c = n + 2 + s;
		if (c > t) return a ? $r(a, r) : null;
		if (o === 225 && !i) {
			let t = e.subarray(n + 4, c);
			Zr(t) && (i = !0, r = Qr(t));
		}
		n = c;
	}
	return a ? $r(a, r) : null;
}
function ti(e) {
	let { width: t, height: n } = e;
	return !Number.isFinite(t) || !Number.isFinite(n) || t <= 0 || n <= 0 || t > 32767 || n > 32767 ? !0 : t * n > Q;
}
function ni(e) {
	let { width: t, height: n } = e;
	return !Number.isFinite(t) || !Number.isFinite(n) || t <= 0 || n <= 0 || t > 134217728 || n > 134217728 ? !0 : t * n > X;
}
function ri(e) {
	switch (e.split(";", 1)[0]?.trim().toLowerCase()) {
		case "image/png":
		case "image/jpeg":
		case "image/jpg":
		case "image/gif":
		case "image/bmp":
		case "image/x-ms-bmp":
		case "image/webp": return !0;
		default: return !1;
	}
}
function ii(e, t = !1) {
	return e !== null && e !== "wmf" && e !== "emf" && (e !== "tiff" || t);
}
var ai = 64 * 1024;
function oi(e) {
	return n(e) ? "wmf" : i(e) ? "emf" : e.length >= 8 && e[0] === 137 && e[1] === 80 && e[2] === 78 && e[3] === 71 && e[4] === 13 && e[5] === 10 && e[6] === 26 && e[7] === 10 ? "png" : e.length >= 2 && e[0] === 255 && e[1] === 216 ? "jpeg" : e.length >= 6 && e[0] === 71 && e[1] === 73 && e[2] === 70 && e[3] === 56 && (e[4] === 55 || e[4] === 57) && e[5] === 97 ? "gif" : e.length >= 2 && e[0] === 66 && e[1] === 77 ? "bmp" : e.length >= 12 && e[0] === 82 && e[1] === 73 && e[2] === 70 && e[3] === 70 && e[8] === 87 && e[9] === 69 && e[10] === 66 && e[11] === 80 ? "webp" : _r(e) ? "tiff" : null;
}
function si(e) {
	return e >= 192 && e <= 207 && e !== 196 && e !== 200 && e !== 204;
}
async function ci(e) {
	let t = e.slice(2).stream().getReader(), n = !1, r = -1, i = -1, a = 0, o = null, s = 0, c = 0, l = null, u = null, d = 0, f = null, p = !1;
	try {
		for (;;) {
			let { value: e, done: m } = await t.read();
			if (m) return l ? $r(l, f) : null;
			for (let m of e) {
				if (o) {
					if (o[s++] = m, s === o.length) {
						let e = o[1] << 8 | o[2], n = o[3] << 8 | o[4];
						if (l ??= {
							width: n,
							height: e
						}, o = null, s = 0, p) return await t.cancel(), $r(l, f);
						a = c, c = 0;
					}
					continue;
				}
				if (u) {
					if (u[d++] = m, d === u.length && (Zr(u) && (p = !0, f = Qr(u)), u = null, d = 0, p && l)) return await t.cancel(), $r(l, f);
					continue;
				}
				if (a > 0) {
					a--;
					continue;
				}
				if (r >= 0) {
					if (i < 0) {
						i = m;
						continue;
					}
					let e = i << 8 | m;
					if (e < 2) return null;
					if (si(r)) {
						if (e < 7) return null;
						l ? a = e - 2 : (o = new Uint8Array(5), s = 0, c = e - 7);
					} else r === 225 && !p && e > 2 ? (u = new Uint8Array(e - 2), d = 0) : a = e - 2;
					r = -1, i = -1;
					continue;
				}
				if (!n) {
					m === 255 && (n = !0);
					continue;
				}
				if (m !== 255 && (n = !1, m !== 0)) {
					if (m === 217 || m === 218) return await t.cancel(), l ? $r(l, f) : null;
					m === 216 || m === 1 || m >= 208 && m <= 215 || (r = m);
				}
			}
		}
	} finally {
		t.releaseLock();
	}
}
async function li(e, t) {
	if (t.length < 8 || !_r(t)) return null;
	let n = t[0] === 73, r = new DataView(t.buffer, t.byteOffset, t.byteLength).getUint32(4, n);
	if (!Number.isSafeInteger(r) || r < 8 || r > e.size - 2) return null;
	let i = new Uint8Array(await e.slice(r, r + 2).arrayBuffer());
	if (i.length !== 2) return null;
	let a = new DataView(i.buffer, i.byteOffset, 2).getUint16(0, n), o = a * 12;
	if (r + 2 + o > e.size) return null;
	let s = new Uint8Array(await e.slice(r + 2, r + 2 + o).arrayBuffer()), c = new DataView(s.buffer, s.byteOffset, s.byteLength), l, u;
	for (let e = 0; e < a; e++) {
		let t = e * 12, r = c.getUint16(t, n);
		if (r !== 256 && r !== 257) continue;
		let i = c.getUint16(t + 2, n);
		if (c.getUint32(t + 4, n) !== 1 || i !== 1 && i !== 3 && i !== 4) return null;
		let a = i === 1 ? c.getUint8(t + 8) : i === 3 ? c.getUint16(t + 8, n) : c.getUint32(t + 8, n);
		r === 256 ? l = a : u = a;
	}
	return l === void 0 || u === void 0 ? null : {
		width: l,
		height: u
	};
}
async function ui(e, t) {
	let n = t ?? new Uint8Array(await e.slice(0, ai).arrayBuffer()), r = oi(n);
	if (!r) return {
		format: null,
		dimensions: null
	};
	let i = Jr(n);
	return r === "jpeg" ? {
		format: r,
		dimensions: await ci(e) ?? i
	} : i ? {
		format: r,
		dimensions: i
	} : r === "tiff" ? {
		format: r,
		dimensions: await li(e, n)
	} : {
		format: r,
		dimensions: null
	};
}
var di = () => import("./emf-DVvw-BEG.js"), fi = class e extends Error {
	format;
	unsupported;
	code = "ooxml-incomplete-metafile";
	constructor(t, n) {
		super(`OOXML ${t} metafile could not be fully played: ${n.join(", ")}`), this.format = t, this.unsupported = n, this.name = "OoxmlIncompleteMetafileError", Object.setPrototypeOf(this, e.prototype);
	}
};
function pi(e) {
	if (!e || typeof e != "object") return !1;
	try {
		let t = e;
		return t.code === "ooxml-incomplete-metafile" && Array.isArray(t.unsupported);
	} catch {
		return !1;
	}
}
var mi = /* @__PURE__ */ new WeakMap();
function hi(e, t) {
	if (!e || !t || e === t) return;
	let n = mi.get(e);
	n && mi.set(t, n);
}
function gi(e, t, n, r = "emf") {
	if (t.length === 0) return e;
	if (n === "reject") throw e && Ur(e), new fi(r, t);
	return e && mi.set(e, {
		format: r,
		unsupported: t
	}), e;
}
function _i(e, t) {
	return e.width <= 0 || e.height <= 0 || e.width > 32767 || e.height > 32767 || e.width * e.height > t;
}
function vi(e) {
	let t = e.split(";", 1)[0]?.trim().toLowerCase();
	return t === "image/tiff" || t === "image/x-tiff";
}
function yi(e, t, n, r = !1) {
	let i = {
		retainedDimensions: e,
		resizeOptions: null
	}, a = yr(e, typeof t == "number" && Number.isFinite(t) && t > 0 ? t : void 0, typeof n == "number" && Number.isFinite(n) && n > 0 ? n : void 0, r);
	return a ? {
		retainedDimensions: a,
		resizeOptions: {
			resizeWidth: a.width,
			resizeHeight: a.height,
			resizeQuality: "high"
		}
	} : i;
}
function bi(e, t, n) {
	let r = Math.max(e.width, e.height);
	if (!Number.isFinite(r) || r > t) return new $("image-dimension", t, Number.isFinite(r) ? r : 2 ** 53 - 1);
	let i = e.width * e.height;
	return new $("image-pixels", n, Number.isSafeInteger(i) && i >= 0 ? i : 2 ** 53 - 1);
}
async function xi(e, t = {}) {
	return Si(e, t);
}
async function Si(e, r = {}, o) {
	let { widthPt: s = 0, heightPt: c = 0, tiff: l, targetWidthPx: u, targetHeightPx: d, maxRetainedPixels: f = Q, incompleteMetafile: p = "draw-supported", metafileFontFamilies: m } = r, h = Number.isSafeInteger(f) && f > 0 ? Math.min(f, Q) : Q, g = new Uint8Array(await e.slice(0, 64 * 1024).arrayBuffer());
	if (n(g)) {
		let { w: n, h: r } = a(s, c), i = [];
		return Ci(gi(await t(new Uint8Array(await e.arrayBuffer()), n, r, (e) => {
			i = e;
		}, m), i, p, "wmf"), h);
	}
	if (i(g)) {
		let { w: t, h: n } = a(s, c), { renderEmfToBitmap: r } = await di(), i = await r(new Uint8Array(await e.arrayBuffer()), t, n, m);
		return Ci(gi(i.bitmap, i.unsupported, p), h);
	}
	let _ = (o ?? await ui(e, g)).dimensions;
	if (_ && ni(_)) throw bi(_, or, X);
	let v = _r(g) || vi(e.type), y = _ ? yi(_, u, d, v) : null;
	if (y && _i(y.retainedDimensions, h)) throw bi(y.retainedDimensions, Z, h);
	if (v) {
		if (!l) throw new zr("tiff");
		let t;
		try {
			t = await l.render(new Uint8Array(await e.arrayBuffer()), {
				targetWidthPx: u,
				targetHeightPx: d,
				maxRetainedPixels: h
			});
		} catch (e) {
			throw sr(e) || gr(e) ? e : new vr("TIFF codec failed to decode the image", { cause: e });
		}
		if (!t) throw new vr("TIFF codec failed to decode the image");
		return Ci(t, h);
	}
	return Ci(y?.resizeOptions ? await createImageBitmap(e, y.resizeOptions) : await createImageBitmap(e), h);
}
function Ci(e, t = Q) {
	if (!e) return null;
	let n = {
		width: Number(e.width),
		height: Number(e.height)
	};
	if (!_i(n, t)) return e;
	throw Ur(e), bi(n, Z, t);
}
function wi(e) {
	return e instanceof c || e instanceof s || sr(e) || gr(e) || Br(e) || pi(e) ? e : new c("unsupported-image-effect", "Image effect preparation or evaluation failed");
}
var Ti = rn, Ei = St, Di = Ti, Oi = Ei, ki = new Set([
	"pie",
	"line",
	"stackedLine",
	"stackedLinePct",
	"area",
	"stackedArea",
	"stackedAreaPct",
	"clusteredBar",
	"clusteredBarH",
	"stackedBar",
	"stackedBarH",
	"stackedBarPct",
	"stackedBarHPct"
]);
function Ai(e, t, n, r, i) {
	return Se(t, n, r);
}
function ji(e, t, n, r) {
	if (!t.length) return null;
	let i = e.chartexColorStyleMethod;
	return i === "withinLinear" || i === "acrossLinear" || i === "withinLinearReversed" || i === "acrossLinearReversed" ? t[i === "withinLinear" || i === "withinLinearReversed" ? 0 : n % t.length] ?? null : t[n % t.length] ?? null;
}
function Mi(e, t, n) {
	return (e.chartexColorPalette ? ji(e, e.chartexColorPalette, t, n) : null) ?? e.chartexAccents?.[t % (e.chartexAccents.length || 1)] ?? z[t % z.length];
}
function Ni(e, t, n, r) {
	return Ai(e, r, "fill", t, n) ?? Ai(e, e.chartexDataPointStyle, "fill", t, n) ?? Mi(e, t, n);
}
function Pi(e, t, n, r) {
	return Je(t, n);
}
function Fi(e, t, n, r) {
	return tr(t, n);
}
function Ii(e, t, n, r, i, a) {
	let o = a === e.chartexDataPointMarkerStyle ? "dataPointMarker" : a === e.chartexDataPointStyle ? "dataPoint" : Object.entries(e.chartStyleRoles ?? {}).find(([, e]) => e === a)?.[0], s = Ae(r, o ? Ne(e, o) ?? (e.classicChartStyleRoles == null ? a : void 0) : a, t);
	if (s !== void 0) return s;
	if (i) return {
		fillType: "solid",
		color: i
	};
	let c = Fi(e, a, t, n);
	return c === void 0 ? {
		fillType: "solid",
		color: Mi(e, t, n)
	} : c;
}
function Li(e, t, n, r, i, a = e.chartexDataPointStyle) {
	let o = tr(r, t);
	if (o !== void 0) return o;
	if (r && i || i) return {
		fillType: "solid",
		color: i
	};
	let s = tr(a, t);
	return s === void 0 ? {
		fillType: "solid",
		color: Mi(e, t, n)
	} : s;
}
function Ri(e, t, n, r, i, a, o, s = 0) {
	return t.fillType === "solid" ? t.color.startsWith("#") ? t.color : `#${t.color}` : cr(t, e, n, r, i, a, s) ?? o;
}
function zi(e, t, n, r, i, a = 0) {
	if (t === null) return !1;
	if (t?.fillType === "image") {
		e.save(), e.clip();
		let r = zn(e, t, n.x, n.y, n.w, n.h, i, a);
		return e.restore(), r;
	}
	return e.fillStyle = t ? Ri(e, t, n.x, n.y, n.w, n.h, r, a) : r, e.fill(), !0;
}
function Bi(e, t, n, r, i, a = 0) {
	return t === null || !(n.w > 0) || !(n.h > 0) ? !1 : t?.fillType === "image" ? (e.beginPath(), e.rect(n.x, n.y, n.w, n.h), zi(e, t, n, r, i, a)) : (e.fillStyle = t ? Ri(e, t, n.x, n.y, n.w, n.h, r, a) : r, e.fillRect(n.x, n.y, n.w, n.h), !0);
}
function Vi(e, t, n, r, i, a, o = {}) {
	let s = n?.chartexStyle, c = Je(s, r), l = n?.lineHidden === !0 ? null : void 0, u = n?.lineColor != null || l !== void 0, d = Je(t, r), f = c === void 0 ? u ? l === void 0 ? {
		fillType: "solid",
		color: n?.lineColor ?? a
	} : l : d === void 0 ? void 0 : d : c, p = f === void 0 && t?.lineNoStyle === !0 && o.linkedNoStyleFallback !== !0;
	return {
		semanticFallback: f === void 0,
		visible: f !== null && !p,
		color: f?.fillType === "solid" ? f.color : a,
		paint: f?.fillType === "solid" ? void 0 : f,
		widthEmu: s?.lineWidthEmu ?? n?.lineWidthEmu ?? t?.lineWidthEmu ?? null,
		dash: s?.lineCustomDash == null ? s?.lineDash ?? t?.lineDash ?? null : null,
		customDash: s?.lineCustomDash ?? t?.lineCustomDash ?? null,
		cap: s?.lineCap ?? t?.lineCap ?? null,
		join: s?.lineJoin ?? t?.lineJoin ?? null
	};
}
var Hi = 9525;
function Ui(e, t, n, r, i, a = e.chartexDataPointStyle) {
	let o = qt(e, t, n, r, a);
	return o === void 0 ? {
		fillType: "solid",
		color: Mi(e, r, i)
	} : o;
}
function Wi(e) {
	return e.paint != null && e.paint.fillType !== "solid";
}
function Gi(e, t) {
	let n = e?.chartexStyle, r = Je(n, t);
	return !e || !r || r.fillType === "solid" ? e : {
		...e,
		lineColor: null,
		lineHidden: null,
		chartexStyle: {
			...n,
			linePaints: null,
			lineColors: null,
			lineColorIndex: null,
			linePaintAuthored: null,
			lineHidden: null
		}
	};
}
function Ki(e, t, n, r, i, a, o, s = {}) {
	t = Gi(t, i);
	let c = Vi(e, n[0], t, i, a, o, s);
	for (let t of n.slice(1)) {
		if (!c.semanticFallback) break;
		let n = Vi(e, t, null, i, a, o, s);
		n.semanticFallback || (c = n);
	}
	let l = t?.chartexStyle, u = l?.lineDash != null || l?.lineCustomDash != null, d = (c.semanticFallback ? n : r).find((e) => e != null && (e.lineWidthEmu != null || e.lineCap != null || e.lineJoin != null || e.lineDash != null || e.lineCustomDash != null || e.linePaintAuthored === !0 && e.lineNoStyle !== !0)), f = (e) => d ? e(d) ?? null : null, p = d;
	return {
		...c,
		widthEmu: l?.lineWidthEmu ?? t?.lineWidthEmu ?? f((e) => e.lineWidthEmu),
		dash: u ? l?.lineCustomDash == null ? l?.lineDash ?? null : null : p?.lineCustomDash == null ? p?.lineDash ?? null : null,
		customDash: u ? l?.lineCustomDash ?? null : p?.lineCustomDash ?? null,
		cap: l?.lineCap ?? f((e) => e.lineCap),
		join: l?.lineJoin ?? f((e) => e.lineJoin)
	};
}
function qi(e, t, n, r, i, a, o = e.chartexDataPointStyle, s = {}) {
	let c = o === e.chartexDataPointStyle ? [o, e.chartexDataPointLineStyle] : [o];
	if (n = Gi(n, r), !m(n)) return Ki(e, t, [o], c, r, i, a, s);
	let l = n?.chartexStyle, u = t?.chartexStyle, d = l?.lineDash != null || l?.lineCustomDash != null, f = n?.lineColor != null || n?.lineHidden === !0 || l?.linePaintAuthored === !0 || l?.lineHidden === !0 || l?.linePaints?.some((e) => e != null) === !0 || l?.lineColors?.some((e) => e != null) === !0 ? {
		lineColor: n?.lineColor,
		lineHidden: n?.lineHidden,
		style: l
	} : {
		lineColor: t?.lineColor,
		lineHidden: t?.lineHidden,
		style: u
	};
	return Ki(e, {
		lineColor: f.lineColor,
		lineHidden: f.lineHidden,
		lineWidthEmu: n?.lineWidthEmu ?? t?.lineWidthEmu,
		chartexStyle: {
			...l,
			linePaints: f.style?.linePaints,
			lineColors: f.style?.lineColors,
			lineColorIndex: f.style?.lineColorIndex,
			linePaintAuthored: f.style?.linePaintAuthored,
			lineHidden: f.style?.lineHidden,
			lineNoStyle: f.style?.lineNoStyle,
			lineWidthEmu: l?.lineWidthEmu ?? n?.lineWidthEmu ?? u?.lineWidthEmu ?? t?.lineWidthEmu,
			lineDash: d ? l?.lineDash : u?.lineDash,
			lineCustomDash: d ? l?.lineCustomDash : u?.lineCustomDash,
			lineCap: l?.lineCap ?? u?.lineCap,
			lineJoin: l?.lineJoin ?? u?.lineJoin
		}
	}, [o], c, r, i, a, s);
}
function Ji(e, t, n, r, i = 0) {
	if (!t.visible) return !1;
	if (t.paint && t.paint.fillType !== "solid" && r) {
		let n = cr(t.paint, e, r.x, r.y, r.w, r.h, i);
		if (!n) return !1;
		e.strokeStyle = n;
	} else e.strokeStyle = t.color.startsWith("#") ? t.color : `#${t.color}`;
	return e.lineWidth = t.widthEmu == null ? t.semanticFallback ? 1 : lt(Hi, n) : lt(t.widthEmu, n), e.setLineDash(P(t.customDash, t.dash, e.lineWidth)), e.lineCap = t.cap === "rnd" ? "round" : t.cap === "sq" ? "square" : "butt", e.lineJoin = t.join === "round" || t.join === "bevel" ? t.join : "miter", !0;
}
function Yi(e, t, n, r, i, a, o, s, c = {}) {
	return Ji(e, Vi(t, n, r, i, a, o, c), s);
}
function Xi(e, t, n, r, i, a, o, s = !1, c = !0, l = !1) {
	let u = Ki(e, n, [r], r === e.chartexDataPointStyle ? [r, e.chartexDataPointLineStyle] : [r], i, a, o, { linkedNoStyleFallback: s }), d = c && !(l && Wi(u));
	return {
		...C(t, n ?? void 0),
		color: o.replace(/^#/, ""),
		lineHidden: !d || !u.visible,
		lineColor: d && u.visible ? u.color.replace(/^#/, "") : null,
		lineWidthEmu: d ? u.widthEmu ?? (u.visible && !u.semanticFallback ? 9525 : null) : null,
		chartexStyle: {
			linePaints: d && u.paint !== void 0 ? [u.paint] : null,
			linePaintAuthored: d && u.paint !== void 0 ? !0 : null,
			lineDash: d ? u.dash : null,
			lineCustomDash: d ? u.customDash : null,
			lineCap: d ? u.cap : null,
			lineJoin: d ? u.join : null
		}
	};
}
var Zi = .8;
function Qi(e, t, n, r, i) {
	let a = e.chartexDataPointStyle, o = Gi(t, n), s = qi(e, o, void 0, n, r, i, a, { linkedNoStyleFallback: !0 }), c = o != null && (o.lineColor != null || o.lineHidden === !0 || Je(o.chartexStyle, n) !== void 0), l = Je(a, n), u = tr(a, n);
	if (c || !s.visible || s.paint != null || l?.fillType !== "solid" || u?.fillType !== "solid") return {
		line: s,
		darkened: !1
	};
	let d = (e) => e.replace(/^#/, "").toUpperCase(), f = d(l.color);
	if (!/^[0-9A-F]{6}$/.test(f) || f !== d(u.color)) return {
		line: s,
		darkened: !1
	};
	let p = (e) => Math.round(parseInt(f.slice(e, e + 2), 16) * Zi).toString(16).padStart(2, "0");
	return {
		line: {
			...s,
			color: `#${p(0)}${p(2)}${p(4)}`.toUpperCase()
		},
		darkened: !0
	};
}
function $i(e, t, n, r) {
	return Vn(e, t, n, r);
}
function ea(e, t, n, r, i, a, o = Dt(t, n)) {
	let s = t.bubbleSizes?.[r];
	if (s != null && Number.isFinite(s) && s < 0) return t.invertedFillHidden === !0 ? {
		color: "00000000",
		paint: null
	} : t.invertedFill ? {
		color: t.invertedFill.fillType === "solid" ? t.invertedFill.color : a,
		paint: t.invertedFill
	} : o ? {
		color: "FFFFFF",
		paint: void 0
	} : {
		color: "00000000",
		paint: null
	};
	let c = Ne(e, "dataPoint"), l = Ae(n?.chartexStyle, c, r);
	if (l !== void 0) return {
		color: l?.fillType === "solid" ? l.color : a,
		paint: l
	};
	let u = Math.max(0, B(e, t)), d = Xe(e, "dataPoint", u), f = rt(e, u) ? r : i;
	if (n?.fillHidden === !0) {
		let e = R(c);
		if (e !== void 0) return {
			color: "00000000",
			paint: e
		};
	}
	if (n?.color != null) return {
		color: n.color,
		paint: void 0
	};
	let p = t.dataPointColors?.[r];
	if (p != null) return {
		color: p,
		paint: void 0
	};
	let m = Ae(t.chartexStyle, c, i);
	if (m !== void 0) return {
		color: m?.fillType === "solid" ? m.color : a,
		paint: m
	};
	if (t.color != null) return {
		color: t.color,
		paint: void 0
	};
	let h = Fi(e, d, f, t.values.length);
	return h === void 0 ? {
		color: $i(t, n, r, a),
		paint: Qn(t, n, r)
	} : {
		color: h?.fillType === "solid" ? h.color : a,
		paint: h
	};
}
function ta(e, t, n, r, i) {
	let a = n?.chartexStyle, o = t.chartexStyle, s = Math.max(0, B(e, t)), c = Xe(e, "dataPoint", s), l = Ne(e, "dataPoint"), u = rt(e, s) ? r : i, d = c, f = [
		a,
		o,
		d
	], p = n?.lineDash, m;
	if (p == null) {
		for (let e of f) if (e?.lineDash != null || e?.lineCustomDash != null || e?.lineDashAuthored === !0) {
			p = e.lineDash, m = e.lineCustomDash ?? void 0;
			break;
		}
	}
	let h = {
		widthEmu: n?.lineWidthEmu ?? a?.lineWidthEmu ?? t.lineWidthEmu ?? o?.lineWidthEmu ?? d?.lineWidthEmu ?? n?.markerLineWidthEmu ?? t.markerLineWidthEmu,
		dash: p,
		customDash: m,
		cap: a?.lineCap ?? o?.lineCap ?? d?.lineCap,
		join: a?.lineJoin ?? o?.lineJoin ?? d?.lineJoin
	}, g = F(a, l, r);
	if (g !== void 0) return {
		color: g?.fillType === "solid" ? g.color : n?.lineColor ?? null,
		paint: g,
		...h
	};
	if (n?.lineHidden === !0) {
		let e = ge(l);
		if (e !== void 0) return {
			color: null,
			paint: e,
			...h
		};
	}
	if (n?.lineColor != null) return {
		color: n.lineColor,
		paint: void 0,
		...h
	};
	let _ = F(o, l, i);
	if (_ !== void 0) return {
		color: _?.fillType === "solid" ? _.color : t.lineColor ?? null,
		paint: _,
		...h
	};
	if (t.lineHidden === !0) {
		let e = ge(l);
		if (e !== void 0) return {
			color: null,
			paint: e,
			...h
		};
	}
	if (t.lineColor != null) return {
		color: t.lineColor,
		paint: void 0,
		...h
	};
	let v = Pi(e, c, u, t.values.length);
	if (v !== void 0) return {
		color: v?.fillType === "solid" ? v.color : null,
		paint: v,
		...h
	};
	let y = t.bubbleSizes?.[r], b = y != null && Number.isFinite(y) && y < 0 && Dt(t, n) ? "000000" : null;
	return {
		color: n?.markerLine ?? t.markerLine ?? t.lineColor ?? b,
		paint: void 0,
		...h
	};
}
function na(e, t, n, r) {
	let i = e.globalCompositeOperation, a = e.fillStyle;
	e.save(), e.clip();
	let o = (i) => {
		e.globalCompositeOperation = "source-atop", e.fillStyle = i, e.fillRect(t - r / 2, n - r / 2, r, r);
	}, s = t - r * .08, c = n - r * .17, l = e.createRadialGradient(s, c, 0, s, c, r * .55);
	l.addColorStop(0, "rgba(255,255,255,0.72)"), l.addColorStop(.14, "rgba(255,255,255,0.48)"), l.addColorStop(.38, "rgba(255,255,255,0.1)"), l.addColorStop(1, "rgba(255,255,255,0)"), o(l);
	let u = t - r * .08, d = n - r * .18, f = e.createRadialGradient(u, d, 0, u, d, r * .78);
	f.addColorStop(0, "rgba(0,0,0,0)"), f.addColorStop(.3, "rgba(0,0,0,0)"), f.addColorStop(.46, "rgba(0,0,0,0.22)"), f.addColorStop(.66, "rgba(0,0,0,0.48)"), f.addColorStop(1, "rgba(0,0,0,0.62)"), o(f);
	let p = t - r * .2, m = n - r * .45, h = e.createRadialGradient(p, m, 0, p, m, r);
	h.addColorStop(0, "rgba(255,255,255,0)"), h.addColorStop(.76, "rgba(255,255,255,0)"), h.addColorStop(.82, "rgba(255,255,255,0.05)"), h.addColorStop(.87, "rgba(255,255,255,0.12)"), h.addColorStop(.95, "rgba(255,255,255,0.28)"), h.addColorStop(1, "rgba(255,255,255,0)"), o(h), e.globalCompositeOperation = i, e.fillStyle = a, e.restore();
}
function ra(e, t, n, r, i, a, o, s, c, l, u, d, f, p, m, h = void 0, g = void 0, _ = void 0, v = void 0, b = void 0, x = !1, S = !1) {
	let C = S ? k(r?.chartexStyle) : k(r?.markerStyle, r?.chartexStyle), w = k(S ? n.chartexStyle : n.markerStyle), T = C ?? w, E = Math.max(0, B(t, n)), D = n.chartexFormatIdx ?? E, O = rt(t, E), A = C ? i : D, j = Xe(t, "dataPointMarker", E), M = Ne(t, "dataPointMarker"), ee = O ? i : D, N = Ae(r?.markerStyle, M, i), P = Ae(n.markerStyle, M, D), te = N !== void 0 || r?.markerFill != null || r?.markerFillPaintAuthored === !0 && r.markerStyle?.fillHidden !== !0, ne = P !== void 0 || n.markerFill != null || n.markerFillPaintAuthored === !0 && n.markerStyle?.fillHidden !== !0, I = l, re = p;
	if (!S && !te && !ne) {
		let e = Ie(j, M, ee, r?.markerStyle?.shapePropertiesPresent === !0 ? r.markerStyle : n.markerStyle);
		e === null ? (I = "00000000", re = null) : e?.fillType === "solid" ? (I = e.color, re = void 0) : e !== void 0 && (re = e);
	}
	let ie = F(r?.markerStyle, M, i), ae = F(n.markerStyle, M, D), L = u, oe = h;
	if (!S && oe === void 0) if (ie !== void 0) oe = ie?.fillType === "solid" ? void 0 : ie;
	else if (r?.markerLine != null) oe = void 0;
	else if (r?.markerLinePaintAuthored === !0 && r.markerStyle?.lineHidden !== !0 && (r.markerLine == null || r.markerLine === "00000000")) oe = null;
	else if (ae !== void 0) oe = ae?.fillType === "solid" ? void 0 : ae;
	else if (n.markerLine != null) oe = void 0;
	else if (n.markerLinePaintAuthored === !0 && n.markerStyle?.lineHidden !== !0 && (n.markerLine == null || n.markerLine === "00000000")) oe = null;
	else {
		let e = y(j, M, ee, r?.markerStyle?.shapePropertiesPresent === !0 ? r.markerStyle : n.markerStyle);
		e?.fillType === "solid" ? (L = e.color, oe = void 0) : (oe = e, e === null && (L = null));
	}
	let se = S ? void 0 : j, R = f ?? (() => {
		let e = r?.markerStyle?.lineWidthEmu ?? n.markerStyle?.lineWidthEmu ?? se?.lineWidthEmu;
		return e == null ? void 0 : lt(e, d);
	})(), ce = J(g != null || _ != null ? {
		lineDash: g,
		lineCustomDash: _,
		lineDashAuthored: !0
	} : void 0, r?.markerStyle, n.markerStyle, se), z = ce?.lineDash, le = ce?.lineCustomDash, ue = v ?? r?.markerStyle?.lineCap ?? n.markerStyle?.lineCap ?? se?.lineCap, de = b ?? r?.markerStyle?.lineJoin ?? n.markerStyle?.lineJoin ?? se?.lineJoin, fe = S ? Xe(t, x ? "dataPoint3D" : "dataPoint", E) : j, pe = S && rt(t, E) || O ? i : D;
	aa(e, a, o, s, c, I, L, d, R, re, m, oe, z, le, ue, de, x, T, fe, A, pe);
}
function ia(e, t, n = Math.max(0, B(e, t))) {
	return Gn(t) || Xe(e, "dataPointMarker", n) != null;
}
function aa(e, t, n, r, i, a, o, s, c = 1, l = void 0, u = 0, d = void 0, f = void 0, p = void 0, m = void 0, h = void 0, g = !1, _ = void 0, v = void 0, y = 0, b = y) {
	let x = Math.max(2, i * s), S = x / 2;
	if (_ !== void 0 || v !== void 0) {
		Ee(e, _, v, y, {
			x: t - S,
			y: n - S,
			w: x,
			h: x
		}, s, (e) => aa(e, t, n, r, i, a, o, s, c, l, u, d, f, p, m, h, g), b);
		return;
	}
	let C = a.startsWith("#") ? a : `#${a}`, w = o ? o.startsWith("#") ? o : `#${o}` : null;
	e.save(), e.fillStyle = l === void 0 ? C : l == null ? "rgba(0,0,0,0)" : cr(l, e, t - S, n - S, x, x, u) ?? "rgba(0,0,0,0)";
	let T = d === void 0 ? w : d == null ? null : cr(d, e, t - S, n - S, x, x, u), E = T != null;
	T && (e.strokeStyle = T, e.lineWidth = c, e.setLineDash(P(p, f, c)), e.lineCap = m === "rnd" ? "round" : m === "sq" ? "square" : "butt", e.lineJoin = h === "round" || h === "bevel" ? h : "miter");
	let D = l?.fillType === "image" ? l : void 0, O = () => {
		if (!D) {
			l !== null && e.fill();
			return;
		}
		e.save(), e.clip(), zn(e, D, t - S, n - S, x, x, s, u), e.restore();
	}, k = () => {
		g && l !== null && na(e, t, n, x);
	};
	switch (r) {
		case "square":
			D || g ? (e.beginPath(), e.rect(t - S, n - S, x, x), O(), k()) : l !== null && e.fillRect(t - S, n - S, x, x), E && e.strokeRect(t - S, n - S, x, x);
			break;
		case "diamond":
			e.beginPath(), e.moveTo(t, n - S), e.lineTo(t + S, n), e.lineTo(t, n + S), e.lineTo(t - S, n), e.closePath(), O(), k(), E && e.stroke();
			break;
		case "triangle":
			e.beginPath(), e.moveTo(t, n - S), e.lineTo(t + S, n + S), e.lineTo(t - S, n + S), e.closePath(), O(), k(), E && e.stroke();
			break;
		case "x":
			e.strokeStyle = T ?? e.fillStyle, e.lineWidth = Math.max(1, x * .18), e.beginPath(), e.moveTo(t - S, n - S), e.lineTo(t + S, n + S), e.moveTo(t - S, n + S), e.lineTo(t + S, n - S), e.stroke();
			break;
		case "plus":
			e.strokeStyle = T ?? e.fillStyle, e.lineWidth = Math.max(1, x * .18), e.beginPath(), e.moveTo(t - S, n), e.lineTo(t + S, n), e.moveTo(t, n - S), e.lineTo(t, n + S), e.stroke();
			break;
		case "star":
			e.beginPath();
			for (let r = 0; r < 10; r++) {
				let i = r % 2 == 0 ? S : S * .45, a = -Math.PI / 2 + r * Math.PI / 5, o = t + Math.cos(a) * i, s = n + Math.sin(a) * i;
				r === 0 ? e.moveTo(o, s) : e.lineTo(o, s);
			}
			e.closePath(), O(), k(), E && e.stroke();
			break;
		case "dot":
			e.beginPath(), e.ellipse(t, n, x * .25, x * .1, 0, 0, Math.PI * 2), O(), k(), E && e.stroke();
			break;
		case "dash": {
			let r = x * .2;
			D || g ? (e.beginPath(), e.rect(t - S, n - r / 2, x, r), O(), k()) : l !== null && e.fillRect(t - S, n - r / 2, x, r), E && e.strokeRect(t - S, n - r / 2, x, r);
			break;
		}
		case "picture":
			e.beginPath(), e.rect(t - S, n - S, x, x), D && zn(e, D, t - S, n - S, x, x, s, u), k(), E && e.strokeRect(t - S, n - S, x, x), e.restore();
			return;
		default:
			e.beginPath(), e.arc(t, n, S, 0, Math.PI * 2), O(), k(), E && e.stroke();
			break;
	}
	e.restore();
}
function oa(e, t, n, r, i, a, o) {
	if (![
		n,
		r,
		i
	].every(Number.isFinite) || n <= 0 || r <= 0 || t.w <= 0 || t.h <= 0) return null;
	let s = Math.max(4, i * .5), c = Math.min(n, Math.max(0, t.w - s * 2)), l = Math.min(r, t.h), u = t.x + t.w * .75, d = {
		x: o ? Math.max(t.x, Math.min(t.x + t.w - c, u - c)) : Math.max(t.x, t.x + t.w - s - c),
		y: o ? Math.max(t.y, Math.min(t.y + t.h - l, o.y - l + i * .25)) : Math.min(t.y + t.h - l, t.y + s),
		w: c,
		h: l
	};
	if (a) {
		let t = Fn(a, e, d);
		if (t) return {
			...t,
			automatic: !1
		};
	}
	return {
		...d,
		automatic: !0
	};
}
function sa(e, t) {
	return t && t.trim().toLowerCase() !== "general" ? pr(e, t) : fr(Number(e.toPrecision(6)));
}
function ca(e, t, n) {
	if (e.labelText) return e.labelText.split(/\r?\n/);
	if (!t) return [];
	let r = e.labelFormatSourceLinked === !0 ? n : e.labelFormatCode, i = [];
	if (e.dispEq) {
		let e = t.intercept < 0 ? "−" : "+";
		i.push(`y = ${sa(t.slope, r)}x ${e} ${sa(Math.abs(t.intercept), r)}`);
	}
	return e.dispRSqr && i.push(`R² = ${sa(t.rSquared, r)}`), i;
}
function la(e, t, n, r, i, a) {
	if (!i) return;
	let o = ca(t, n, a);
	if (o.length === 0) return;
	let { chart: s, chartRect: c, plotRect: l } = i, u = hn(t.labelFontSizeHpt, r) ?? hn(s.dataLabelFontSizeHpt, r) ?? 10 * r, d = Yn(s, t.labelFontFace ?? s.dataLabelFontFace, "minor"), f = t.labelFontBold ?? s.dataLabelFontBold ?? !1, p = t.labelFontItalic ?? !1;
	e.font = bt(u, d, f, p);
	let m = u * 1.2, h = t.labelFontColor ?? s.dataLabelFontColor, g = t.labelRichRuns?.length ? jr(e, {
		runs: t.labelRichRuns,
		ptToPx: r,
		fontFamily: d,
		fallbackBold: f,
		fallbackItalic: p,
		fallbackBaseline: t.labelFontBaseline ?? void 0,
		fallbackColorHidden: t.labelFontPaintAuthored === !0 && (t.labelFontHidden === !0 || t.labelFontColor == null),
		fontFamilyForFace: (e) => Yn(s, e, "minor")
	}, u, h ? `#${h}` : "#595959") : null, _ = g?.width ?? Math.max(...o.map((t) => e.measureText(t).width)), v = {
		fontColor: t.labelFontColor ?? void 0,
		fontItalic: p,
		fontPaintAuthored: t.labelFontPaintAuthored ?? void 0,
		fontHidden: t.labelFontHidden ?? void 0,
		fontLanguage: t.labelFontLanguage ?? void 0,
		fontBaseline: t.labelFontBaseline ?? void 0,
		textRotation: t.labelTextRotation ?? void 0,
		textWrap: t.labelTextWrap ?? void 0,
		textVerticalAnchor: t.labelTextVerticalAnchor ?? void 0,
		textVerticalMode: t.labelTextVerticalMode ?? void 0,
		textLInsEmu: t.labelTextLInsEmu ?? void 0,
		textTInsEmu: t.labelTextTInsEmu ?? void 0,
		textRInsEmu: t.labelTextRInsEmu ?? void 0,
		textBInsEmu: t.labelTextBInsEmu ?? void 0,
		textBodyAuthored: t.labelTextBodyAuthored ?? void 0
	}, y = Le(v, r), b = _ + y.left + y.right, x = (g?.height ?? o.length * m) + y.top + y.bottom, S = L(b, x, t.labelTextRotation ?? void 0, t.labelTextVerticalMode ?? void 0), C = oa(c, l, S.w, S.h, u, t.labelManualLayout, i.automaticAnchor);
	if (!C) return;
	e.save(), C.automatic && (e.beginPath(), e.rect(l.x, l.y, l.w, l.h), e.clip());
	let w = C.x + C.w / 2, T = C.y + C.h / 2, E = t.labelTextBodyAuthored === !0 || t.labelTextRotation != null || t.labelTextWrap != null || t.labelTextVerticalAnchor != null || t.labelTextVerticalMode != null || t.labelTextLInsEmu != null || t.labelTextTInsEmu != null || t.labelTextRInsEmu != null || t.labelTextBInsEmu != null, D = C.automatic ? {
		x: w - b / 2,
		y: T - x / 2,
		w: b,
		h: x
	} : {
		x: C.x,
		y: C.y,
		w: C.w,
		h: C.h
	}, O = t.labelBox;
	qn(e, O, D, r, i.shapeRotationDeg ?? 0);
	let k = t.labelTextAlign;
	e.textAlign = k === "r" ? "right" : k === "ctr" ? "center" : "left", e.textBaseline = "top", e.fillStyle = h ? `#${h}` : "#595959";
	let A = Math.max(0, D.w - y.left - y.right), j = Math.max(0, D.h - y.top - y.bottom), M = C.automatic && S.radians === 0 && C.w === S.w && C.h === S.h && (t.labelTextWrap == null || t.labelTextWrap === "none"), ee = g ? [] : E && !M ? K(o.join("\n"), A, j, m, (t) => e.measureText(t).width, v) : o;
	if (!g && ee.length === 0) {
		e.restore();
		return;
	}
	let N = E ? e.textAlign === "right" ? D.x + D.w - y.right : e.textAlign === "center" ? D.x + (D.w + y.left - y.right) / 2 : D.x + y.left : e.textAlign === "right" ? C.x + C.w : e.textAlign === "center" ? C.x + C.w / 2 : C.x, P = (t.labelFontBaseline ?? 0) * u, te = E ? t.labelTextVerticalAnchor === "b" ? D.y + D.h - y.bottom - (g?.height ?? ee.length * m) : t.labelTextVerticalAnchor === "ctr" ? D.y + (D.h - (g?.height ?? ee.length * m) + y.top - y.bottom) / 2 : D.y + y.top : C.y, F = C.automatic ? ee.length : Math.min(ee.length, Math.floor(j / m));
	if (S.radians !== 0 && (e.translate(w, T), e.rotate(S.radians), e.translate(-w, -T)), g) Ar(e, g, N, te, e.textAlign, "top", Math.max(g.width, A));
	else if (!(t.labelFontPaintAuthored === !0 && (t.labelFontHidden === !0 || t.labelFontColor == null))) for (let t = 0; t < F; t++) e.fillText(E && v.textWrap === "none" ? ee[t] : _t(e, ee[t], Math.max(0, A || _)), N, te + t * m - P);
	e.restore();
}
function ua(e, t, n, r, i, a, o, s, c) {
	let l = t.trendLines;
	if (!l || l.length === 0) return;
	let u = [], d = [];
	for (let e = 0; e < t.values.length; e++) {
		let n = t.values[e], r = o ? o[e] : e;
		n != null && r != null && Number.isFinite(n) && Number.isFinite(r) && (u.push(r), d.push(n));
	}
	if (u.length < 2) return;
	let f = e.getLineDash ? e.getLineDash() : [];
	for (let o of l) {
		let l = Yt(u, d, o.trendlineType, {
			period: o.period,
			order: o.order,
			intercept: o.intercept,
			forward: o.forward,
			backward: o.backward
		});
		if (l.xs.length < 2 || ![...l.xs, ...l.ys].every(Number.isFinite)) continue;
		let f = o.trendlineType === "linear" ? H(u, d, o.intercept) : null, p = f && [
			f.slope,
			f.intercept,
			f.rSquared
		].every(Number.isFinite) ? f : null, m = l.xs, h = l.ys;
		if (o.trendlineType === "linear") {
			let e = (l.ys[1] - l.ys[0]) / (l.xs[1] - l.xs[0] || 1), t = o.backward ?? 0, n = o.forward ?? 0;
			m = [l.xs[0] - t, l.xs[1] + n], h = [l.ys[0] - e * t, l.ys[1] + e * n];
		}
		if (![...m, ...h].every(Number.isFinite)) continue;
		let g = m.map((e, t) => c ? c(e, h[t]) : {
			x: r(e),
			y: i(h[t])
		});
		if (g.every((e) => Number.isFinite(e.x) && Number.isFinite(e.y))) {
			if (!o.lineHidden && (o.linePaintAuthored !== !0 || o.lineColor != null)) {
				s?.clipLineToPlot && (e.save(), e.beginPath(), e.rect(s.plotRect.x, s.plotRect.y, s.plotRect.w, s.plotRect.h), e.clip()), e.strokeStyle = o.lineColor ? `#${o.lineColor}` : n, e.lineWidth = o.lineWidthEmu ? lt(o.lineWidthEmu, a) : 1.5, e.setLineDash(j(o.lineDash ?? void 0, e.lineWidth)), e.beginPath();
				for (let t = 0; t < g.length; t++) {
					let { x: n, y: r } = g[t];
					t === 0 ? e.moveTo(n, r) : e.lineTo(n, r);
				}
				e.stroke(), s?.clipLineToPlot && e.restore();
			}
			la(e, o, p, a, s ? {
				...s,
				automaticAnchor: g.at(-1)
			} : void 0, t.valFormatCode);
		}
	}
	e.setLineDash(f);
}
function da(e) {
	let t = (e) => {
		switch (e) {
			case "exp": return "Exponential";
			case "log": return "Logarithmic";
			case "poly": return "Polynomial";
			case "power": return "Power";
			case "movingAvg": return "Moving Average";
			default: return "Linear";
		}
	}, n = [];
	for (let r of e) for (let e of r.trendLines ?? []) {
		if (e.lineHidden === !0 || e.linePaintAuthored === !0 && e.lineColor == null) continue;
		let i = r.lineColor ?? r.color;
		n.push({
			name: e.name ?? `${t(e.trendlineType)} (${r.name || "Series"})`,
			color: e.lineColor ?? i,
			lineColor: e.lineColor ?? i,
			lineWidthEmu: e.lineWidthEmu,
			lineHidden: !1,
			chartexStyle: { lineDash: e.lineDash },
			values: [],
			seriesType: "line",
			showMarker: !1
		});
	}
	return n;
}
function fa(e) {
	return je(e.chartType, e.series.length, e.varyColors !== !1) || $t(e) ? e.series : e.series.flatMap((e) => [e, ...da([e])]);
}
function pa(e) {
	return e && (e === "line" || e === "stackedLine" || e === "stackedLinePct" || e === "radar" || e === "scatter" || e === "stock") ? "line" : "fill";
}
function ma(e, t, n) {
	if (e !== "scatter") return !1;
	let r = t ?? "marker";
	return (r === "marker" || r === "line" || r === "lineMarker" || r === "lineNoMarker" || r === "smooth" || r === "smoothMarker" || r === "smoothNoMarker") && n.lineHidden !== !0;
}
function ha(e, t, n, r, i, a) {
	let o = r[i];
	if (!o) return null;
	let s = a ? Math.max(0, B(a, o)) : i, c = a ? Cn(a, s) : void 0, l = a && c ? Ln(a.chartType, c) : o.seriesType ?? e, u = c?.scatterStyle ?? t, d = c?.radarStyle ?? n, f = c?.kind === "bubble" ? "bubble" : l, p = f === "stock", m = f === "line" || f === "stackedLine" || f === "stackedLinePct" || f === "radar" || p, h = f === "bubble", g = f === "scatter" || h;
	if (!m && !g || !W(l, u, c ? {
		...o,
		seriesType: l
	} : o, d)) return null;
	let _ = o.markerSymbol ?? o.automaticMarkerSymbol ?? (p ? "none" : "circle"), v = rr(s, o), y = N(o, v.replace(/^#/, "")), b = h ? !1 : g ? ma("scatter", u, o) : o.lineHidden !== !0;
	if (h && a) {
		let e = S(o, s), t = ea(a, o, void 0, 0, e, v), n = ta(a, o, void 0, 0, e);
		return {
			symbol: "circle",
			fill: t.color,
			fillPaint: t.paint,
			line: n.color,
			lineWidthEmu: n.widthEmu ?? null,
			linePaint: n.paint,
			lineDash: n.dash,
			lineCustomDash: n.customDash,
			lineCap: n.cap,
			lineJoin: n.join,
			bubble3D: Dt(o, void 0),
			withLine: !1,
			directEffect: k(o.chartexStyle),
			fallbackEffect: Xe(a, Dt(o, void 0) ? "dataPoint3D" : "dataPoint", s),
			directEffectIndex: e,
			fallbackEffectIndex: rt(a, s) ? 0 : e
		};
	}
	return a ? _a(a, o, void 0, 0, s, f, u, d) : {
		symbol: _,
		fill: y,
		fillPaint: A(o),
		line: o.markerLine ?? null,
		lineWidthEmu: o.markerLineWidthEmu ?? null,
		withLine: b
	};
}
function ga(e, t, n, r) {
	let i = Math.max(0, B(e, t)), a = rr(i, t), o = S(t, i), s = ea(e, t, n, r, o, a), c = ta(e, t, n, r, o), l = k(n?.chartexStyle), u = k(t.chartexStyle), d = Dt(t, n);
	return {
		symbol: "circle",
		fill: s.color,
		fillPaint: s.paint,
		line: c.color,
		lineWidthEmu: c.widthEmu ?? null,
		linePaint: c.paint,
		lineDash: c.dash,
		lineCustomDash: c.customDash,
		lineCap: c.cap,
		lineJoin: c.join,
		bubble3D: d,
		withLine: !1,
		directEffect: l ?? u,
		fallbackEffect: Xe(e, d ? "dataPoint3D" : "dataPoint", i),
		directEffectIndex: l ? r : o,
		fallbackEffectIndex: rt(e, i) ? r : o
	};
}
function _a(e, t, n, r, i, a, o, s) {
	let c = a === "line" || a === "stackedLine" || a === "stackedLinePct" || a === "radar" || a === "stock";
	if (!c && a !== "scatter") return null;
	let l = zt(t, n, "circle", W(a, o, t, s));
	if (l === "none") return null;
	let u = rr(i, t).replace(/^#/, ""), d = t.chartexFormatIdx ?? i, f = Xe(e, "dataPointMarker", i), p = Ne(e, "dataPointMarker"), m = rt(e, i) ? r : d, h = Ae(n?.markerStyle, p, r), g = Ae(t.markerStyle, p, d), _ = h !== void 0 || n?.markerFill != null || n?.markerFillPaint !== void 0 || n?.markerFillPaintAuthored === !0 && n.markerStyle?.fillHidden !== !0, v = g !== void 0 || t.markerFill != null || t.markerFillPaint !== void 0 || t.markerFillPaintAuthored === !0 && t.markerStyle?.fillHidden !== !0, y = n ? Vn(t, n, r, u) : N(t, u), b = n ? Qn(t, n, r) : A(t);
	if (h === null || h === void 0 && g === null) y = "00000000", b = null;
	else if (!_ && !v) {
		let e = tr(f, m);
		e === null ? (y = "00000000", b = null) : e?.fillType === "solid" ? (y = e.color, b = void 0) : e !== void 0 && (b = e);
	}
	let x = F(n?.markerStyle, p, r), S = F(t.markerStyle, p, d), C = n?.markerLine ?? t.markerLine ?? null, w;
	if (x !== void 0) x?.fillType === "solid" ? C = x.color : w = x;
	else if (n?.markerLinePaintAuthored === !0 && n.markerStyle?.lineHidden !== !0 && n.markerLine == null) w = null;
	else if (S !== void 0) S?.fillType === "solid" ? C = S.color : w = S;
	else if (t.markerLinePaintAuthored === !0 && t.markerStyle?.lineHidden !== !0 && t.markerLine == null) w = null;
	else if (n?.markerLine == null && t.markerLine == null) {
		let e = Je(f, m);
		e?.fillType === "solid" ? C = e.color : (w = e, e === null && (C = null));
	}
	let T = f, E = J(n?.markerStyle, t.markerStyle, T), D = k(n?.markerStyle, n?.chartexStyle), O = k(t.markerStyle);
	return {
		symbol: l,
		fill: y,
		fillPaint: b,
		line: C,
		linePaint: w,
		lineWidthEmu: n?.markerLineWidthEmu ?? n?.markerStyle?.lineWidthEmu ?? t.markerLineWidthEmu ?? t.markerStyle?.lineWidthEmu ?? T?.lineWidthEmu ?? null,
		lineDash: E?.lineDash,
		lineCustomDash: E?.lineCustomDash,
		lineCap: n?.markerStyle?.lineCap ?? t.markerStyle?.lineCap ?? T?.lineCap,
		lineJoin: n?.markerStyle?.lineJoin ?? t.markerStyle?.lineJoin ?? T?.lineJoin,
		withLine: c || ma("scatter", o, t),
		directEffect: D ?? O,
		fallbackEffect: f,
		directEffectIndex: D ? r : d,
		fallbackEffectIndex: m
	};
}
function va(e, t, n, r, i, a, o, s = null, c = void 0, l = void 0, u = null, d = null, f = null, p = void 0, m = null, h = null, g = 1, _ = 0, v, y, b = 0, x = b) {
	if (t !== "none") {
		if (s && !s.withLine) {
			aa(e, r + a / 2, i + o / 2, s.symbol, o * .58 / g, s.fill, s.line, g, s.lineWidthEmu == null ? void 0 : lt(s.lineWidthEmu, g), s.fillPaint, _, s.linePaint, s.lineDash, s.lineCustomDash, s.lineCap, s.lineJoin, s.bubble3D, s.directEffect, s.fallbackEffect, s.directEffectIndex, s.fallbackEffectIndex);
			return;
		}
		Ee(e, v, y, b, {
			x: r,
			y: i,
			w: a,
			h: o
		}, g, (e) => ya(e, t, n, r, i, a, o, c, l, u, d, f, p, m, h, g, _), x), s && aa(e, r + a / 2, i + o / 2, s.symbol, o * .58 / g, s.fill, s.line, g, s.lineWidthEmu == null ? void 0 : lt(s.lineWidthEmu, g), s.fillPaint, _, s.linePaint, s.lineDash, s.lineCustomDash, s.lineCap, s.lineJoin, s.bubble3D, s.directEffect, s.fallbackEffect, s.directEffectIndex, s.fallbackEffectIndex);
	}
}
function ya(e, t, n, r, i, a, s, c, l, u, d, f, p, m, h, g, _) {
	if (e.fillStyle = n, t === "line") {
		if (!(l !== void 0 || u != null || d != null || f != null || m != null || h != null)) {
			e.strokeStyle = n;
			let t = e.lineWidth;
			e.lineWidth = Math.max(1.5, s * .15), e.beginPath();
			let o = i + s / 2;
			e.moveTo(r, o), e.lineTo(r + a, o), e.stroke(), e.lineWidth = t;
			return;
		}
		if (l === null) return;
		e.save();
		let t = l ? cr(l, e, r, i, a, s, _) : u ? `#${u}` : n;
		if (!t) {
			e.restore();
			return;
		}
		e.strokeStyle = t, e.lineWidth = d == null ? Math.max(1.5, s * .15) : lt(d, g), e.setLineDash(o(p, f, e.lineWidth)), e.lineCap = m === "rnd" ? "round" : m === "sq" ? "square" : "butt", e.lineJoin = h === "round" || h === "bevel" ? h : "miter", e.beginPath();
		let c = i + s / 2;
		e.moveTo(r, c), e.lineTo(r + a, c), e.stroke(), e.restore();
	} else {
		Bi(e, c, {
			x: r,
			y: i,
			w: a,
			h: s
		}, n, g, _);
		let t = l === null ? null : l ? cr(l, e, r, i, a, s, _) : u ? `#${u}` : null;
		if (t) {
			let n = lt(d, g);
			e.save(), e.strokeStyle = t, e.lineWidth = n, e.setLineDash(o(p, f, e.lineWidth)), e.lineCap = m === "rnd" ? "round" : m === "sq" ? "square" : "butt", e.lineJoin = h === "round" || h === "bevel" ? h : "miter", e.strokeRect(r + n / 2, i + n / 2, Math.max(0, a - n), Math.max(0, s - n)), e.restore();
		}
	}
}
function ba(e, t) {
	if (t.length === 0) return [...e];
	let n = /* @__PURE__ */ new Map();
	for (let e of t) n.set(e.idx, e);
	let r = [];
	for (let t = 0; t < e.length; t++) {
		let i = n.get(t);
		i?.deleted !== !0 && r.push({
			...e[t],
			textOverride: i ?? null
		});
	}
	return r;
}
function xa(e, t, n, r = !1, i = [], a = [], o = !0, s = [], c, l) {
	let u = je(t, e.length, o);
	if (r || u) {
		let d = e[0], f = d ? d.values.length : 0, p = d?.categories ?? i, m = l && d ? Math.max(0, B(l, d)) : 0, h = l ? Cn(l, m) : void 0, g = h?.kind === "bubble" ? "bubble" : d?.seriesType ?? t, _ = h?.scatterStyle ?? n, v = h?.radarStyle ?? c, y = new Map(d?.dataPointOverrides?.map((e) => [e.idx, e]) ?? []);
		return ba(Array.from({ length: f }, (n, i) => {
			let s = y.get(i), c = l && d ? Ke(l, d, m, i) : i, f = pa(g), h = l && d ? Zt(l, f === "line" ? "dataPointLine" : "dataPoint", d, s, c) : void 0, b = i < a.length ? a[i] : l && d ? Te(l, d, s, c, i) : s?.fillHidden === !0 ? null : s?.color || d?.dataPointColors?.[i] ? void 0 : d?.fillPattern ?? void 0, x = (g === "bubble" && l && d ? ga(l, d, s, i) : null) ?? (l && d ? _a(l, d, s, i, m, g, _, v) : null), C = k(s?.chartexStyle), w = k(d?.chartexStyle), T = l && d ? Xe(l, f === "line" ? "dataPointLine" : "dataPoint", m) : void 0, E = u && d ? $e(i, d, o, 0) : za(t, e, i, r, o);
			return {
				label: (p[i] ?? `Item ${i + 1}`).toString(),
				color: b?.fillType === "solid" ? b.color.startsWith("#") ? b.color : `#${b.color}` : E,
				marker: x,
				swatchStyle: f,
				fillPaint: b,
				outlinePaint: h?.paint?.fillType === "solid" ? void 0 : h?.paint,
				outlineColor: h?.paint?.fillType === "solid" ? h.paint.color : s?.lineColor ?? d?.lineColor ?? null,
				outlineWidthEmu: h?.widthEmu ?? null,
				outlineDash: h?.dash ?? null,
				outlineCustomDash: h?.customDash,
				outlineCap: h?.cap ?? null,
				outlineJoin: h?.join ?? null,
				directEffect: C ?? w,
				fallbackEffect: T,
				directEffectIndex: C ? i : d ? S(d, m) : c,
				fallbackEffectIndex: c,
				textOverride: null
			};
		}), s);
	}
	return l && e.some((e) => {
		let t = B(l, e), n = Cn(l, t);
		return t >= 0 && n?.kind !== "pie" && n?.kind !== "pie3D" && n?.kind !== "doughnut" && n?.kind !== "ofPie" && rt(l, t);
	}) ? ba(e.flatMap((e) => {
		let r = B(l, e), a = Cn(l, r), s = a?.kind === "bubble" ? "bubble" : e.seriesType ?? t;
		return r >= 0 && a?.kind !== "pie" && a?.kind !== "pie3D" && a?.kind !== "doughnut" && a?.kind !== "ofPie" && rt(l, r) ? xa([e], s, a?.scatterStyle ?? n, !0, e.categories ?? i, [], o, [], a?.radarStyle ?? c, l) : xa([e], s, a?.scatterStyle ?? n, !1, e.categories ?? i, [], o, [], a?.radarStyle ?? c, l);
	}), s) : ba(e.map((r, i) => {
		let s = l ? B(l, r, i) : i, u = (l ? Cn(l, s) : void 0)?.kind === "bubble" ? "bubble" : r.seriesType ?? t, d = r.lineHidden !== !0, f = d ? r.lineColor ?? null : null, p = ha(t, n, c, e, i, l), m = u === "stock" && !d && !p ? "none" : pa(u), h = S(r, s >= 0 ? s : i), g = i < a.length ? a[i] : l ? Te(l, r, void 0, h) : tr(r.chartexStyle, r.chartexFormatIdx ?? i) ?? r.fillPattern ?? void 0, _ = l ? Zt(l, m === "line" ? "dataPointLine" : "dataPoint", r, void 0, h) : void 0, v = l ? Xe(l, m === "line" ? "dataPointLine" : "dataPoint", s) : void 0;
		return {
			label: r.name || `Series ${i + 1}`,
			color: m === "line" && _?.paint?.fillType === "solid" ? _.paint.color.startsWith("#") ? _.paint.color : `#${_.paint.color}` : m === "line" && f ? `#${f}` : g?.fillType === "solid" ? g.color.startsWith("#") ? g.color : `#${g.color}` : za(t, e, i, !1, o),
			marker: p,
			swatchStyle: m,
			fillPaint: g,
			outlinePaint: _?.paint?.fillType === "solid" ? void 0 : _?.paint,
			outlineColor: _?.paint?.fillType === "solid" ? _.paint.color : f,
			outlineWidthEmu: _?.widthEmu ?? (d ? r.lineWidthEmu ?? null : null),
			outlineDash: _?.dash ?? (d ? r.chartexStyle?.lineDash ?? null : null),
			outlineCustomDash: _?.customDash,
			outlineCap: _?.cap ?? (d ? r.chartexStyle?.lineCap ?? null : null),
			outlineJoin: _?.join ?? (d ? r.chartexStyle?.lineJoin ?? null : null),
			directEffect: k(r.chartexStyle),
			fallbackEffect: v,
			directEffectIndex: h,
			fallbackEffectIndex: h,
			textOverride: null
		};
	}), s);
}
function Sa(e, t, n = 0) {
	let r = $t(e) || je(e.chartType, e.series.length, e.varyColors !== !1), i = xa(e.series, e.chartType, e.scatterStyle, $t(e), e.categories, [], e.varyColors !== !1, [], e.radarStyle, e), a = Ce(e);
	return (o, s) => {
		let c = r || rt(e, o), l = r ? s : Jt(a, o, c ? s : 0), u = l == null ? void 0 : i[l];
		return u ? {
			entry: u,
			ptToPx: t,
			shapeRotationDeg: n
		} : void 0;
	};
}
function Ca(e, t, n, r) {
	if (!n) return t;
	let i = E(e, n.fontFace) ?? n.fontFace;
	return {
		fontFamily: i ? Hn(i, e) : t.fontFamily,
		color: n.fontColor ? `#${n.fontColor}` : t.color,
		bold: n.fontBold ?? t.bold,
		italic: n.fontItalic ?? t.italic,
		sizePx: hn(n.fontSizeHpt, r) ?? t.sizePx
	};
}
function wa(e, t, n) {
	let r = Aa(t, n);
	return e.font = `${t.italic ? "italic " : ""}${t.bold ? "bold " : ""}${r}px ${t.fontFamily}`, r;
}
var Ta = {
	fontFamily: "sans-serif",
	color: "#333",
	bold: !1,
	italic: !1,
	sizePx: null
}, Ea = 12, Da = 4, Oa = 8, ka = .01;
function Aa(e, t) {
	return e.sizePx ?? 10 * t;
}
function ja(e, t, n) {
	return e.map((e) => {
		if (e.swatchStyle === "fill") return 7 * n;
		let r = t * 1.6;
		if (e.swatchStyle !== "line" || !e.outlineDash) return r;
		let i = e.outlineWidthEmu == null ? Math.max(1.5, t * .15) : lt(e.outlineWidthEmu, n), a = j(e.outlineDash, i), o = a.length > 0 ? a.reduce((e, t) => e + t, 0) + a[0] : 0;
		return Math.max(r, o);
	});
}
function Ma(e, t) {
	return Math.max(0, ...t.map((t, n) => cn(e[n]?.label ?? "") * t)) + 4;
}
function Na(e, t, n) {
	return e.swatchStyle === "fill" ? 7 * n : t;
}
function Pa(e, t, n) {
	if (!(n > 0)) return [];
	let r = Vt(t);
	if (r.length > 1) return r.flatMap((t) => Pa(e, t, n));
	let i = wt(e, t, n);
	return i.length <= 2 ? i : [i[0], _t(e, i.slice(1).join(" "), n)];
}
function Fa(e, t, n, r, i) {
	if (!t.showLegend) return null;
	let a = La(t, i), o = xa(fa(t), t.chartType, t.scatterStyle, $t(t), t.categories, [], t.varyColors !== !1, t.legendEntries ?? [], t.radarStyle, t), s = o.map((e) => Ca(t, a, e.textOverride, i)), c = s.map((e) => Aa(e, i)), l = o.map((e, t) => ja([e], c[t], i)[0]);
	e.save();
	let u = o.map((t, n) => (wa(e, s[n], i), l[n] + 4 + Zn(e, t.label)));
	e.restore();
	let d = t.legendPos ?? "r", f = d === "t" || d === "b", p = Wt(t, n, r, {
		itemWidths: u,
		rowHeight: Ma(o, c),
		itemGap: Ea,
		horizontalPadding: f ? 8 : Oa,
		verticalPadding: Da
	});
	return p ? {
		...p,
		measuredLabels: o.map((e) => e.label),
		entryStyles: s,
		fontSizes: c,
		swatches: l,
		itemWidths: u
	} : null;
}
function Ia(e, t, n, r, i, a, o = "vertical", s, c = Ta, l, u = !1, d = [], f = 1, p = [], m = 0, h = !0, g, _) {
	let v = xa(t, s, l, u, d, p, h, g?.legendEntries ?? [], g?.radarStyle, g), y = _ != null && _.measuredLabels.length === v.length && _.measuredLabels.every((e, t) => e === v[t].label), b = y ? _.entryStyles : v.map((e) => g ? Ca(g, c, e.textOverride, f) : c), x = y ? _.fontSizes : b.map((e) => Aa(e, f));
	b[0] && wa(e, b[0], f), e.textBaseline = "middle";
	let S = Ma(v, x), C = y ? _.swatches : v.map((e, t) => ja([e], x[t], f)[0]), w = y ? _.itemWidths : v.map((t, n) => (wa(e, b[n], f), C[n] + 4 + Zn(e, t.label)));
	if (o === "horizontal") {
		let t = nn(w, i, Ea).slice(0, Math.max(0, Math.floor((a - Da) / S))), o = r + Da / 2;
		for (let r = 0; r < t.length; r++) {
			let a = t[r], s = a.map((e) => Math.min(i, w[e])), c = s.reduce((e, t) => e + t, 0) + Ea * Math.max(0, a.length - 1), l = n + Math.max(0, (i - c) / 2), u = o + r * S + S / 2;
			for (let t = 0; t < a.length; t++) {
				let n = a[t], r = C[n], i = s[t];
				if (i < r) {
					l += i + Ea;
					continue;
				}
				let o = Math.max(0, i - r - 4 + ka);
				wa(e, b[n], f);
				let c = Na(v[n], x[n], f);
				va(e, v[n].swatchStyle, v[n].color, l, u - c / 2, r, c, v[n].marker, v[n].fillPaint, v[n].outlinePaint, v[n].outlineColor, v[n].outlineWidthEmu, v[n].outlineDash, v[n].outlineCustomDash, v[n].outlineCap, v[n].outlineJoin, f, m, v[n].directEffect, v[n].fallbackEffect, v[n].directEffectIndex, v[n].fallbackEffectIndex), e.fillStyle = b[n].color, e.textAlign = "left", dt(e, v[n].label, l + r + 4, u, x[n], o), l += i + Ea;
			}
		}
		return;
	}
	let T = i - Math.max(...C, 0) - 4, E = !u && !je(s, t.length, h), D = v.map((t, n) => (wa(e, b[n], f), E ? Pa(e, t.label, T) : Vt(t.label).map((t) => _t(e, t, T)))), O = D.map((e, t) => e.length * x[t] + 4), k = 0, A = 0;
	for (; k < v.length && A + O[k] <= a;) A += O[k], k++;
	let j = k === v.length ? r + (a - A) / 2 : r;
	for (let t = 0; t < k; t++) {
		let r = C[t], a = O[t];
		if (i < r) {
			j += a;
			continue;
		}
		let o = Na(v[t], x[t], f);
		va(e, v[t].swatchStyle, v[t].color, n, j + (a - o) / 2, r, o, v[t].marker, v[t].fillPaint, v[t].outlinePaint, v[t].outlineColor, v[t].outlineWidthEmu, v[t].outlineDash, v[t].outlineCustomDash, v[t].outlineCap, v[t].outlineJoin, f, m, v[t].directEffect, v[t].fallbackEffect, v[t].directEffectIndex, v[t].fallbackEffectIndex), wa(e, b[t], f), e.fillStyle = b[t].color, e.textAlign = "left", D[t].forEach((i, a) => e.fillText(i, n + r + 4, j + x[t] * (a + .5))), j += a;
	}
}
function La(e, t) {
	let n = E(e, e.legendFontFace) ?? e.themeMinorFontLatin;
	return {
		fontFamily: n ? Hn(n, e) : "sans-serif",
		color: e.legendFontColor ? `#${e.legendFontColor}` : "#333",
		bold: e.legendFontBold ?? !1,
		italic: e.legendFontItalic ?? !1,
		sizePx: hn(e.legendFontSizeHpt, t)
	};
}
function Ra(e, t, n, r, i, a, o, s, c, l, u, d, f, p = [], m = 0) {
	if (!n) return;
	let h = La(t, f), g = fa(t), _ = $t(t), v = Math.min(Oa / 2, Math.max(0, n.reserveW) / 2), y = Math.max(0, n.reserveW - v * 2), b = n.side === "r" ? {
		x: r + a - n.reserveW + v,
		y: c,
		w: y,
		h: u
	} : n.side === "l" ? {
		x: r + v,
		y: c,
		w: y,
		h: u
	} : n.side === "t" ? {
		x: r + 4,
		y: i + d,
		w: Math.max(0, a - 8),
		h: n.reserveH
	} : {
		x: r + 4,
		y: i + o - n.reserveH,
		w: Math.max(0, a - 8),
		h: n.reserveH
	}, x = n.side === "t" || n.side === "b" ? "horizontal" : "vertical", S = t.legendManualLayout, C = S ? Fn(S, {
		x: r,
		y: i,
		w: a,
		h: o
	}, b) : null;
	if (C) {
		let r = C.w >= C.h ? "horizontal" : "vertical";
		ot(e, t, C, f, m), Ia(e, g, C.x, C.y, C.w, C.h, r, t.chartType, h, t.scatterStyle, _, t.categories, f, p, m, t.varyColors !== !1, t, n);
		return;
	}
	ot(e, t, b, f, m), Ia(e, g, b.x, b.y, b.w, b.h, x, t.chartType, h, t.scatterStyle, _, t.categories, f, p, m, t.varyColors !== !1, t, n);
}
function za(e, t, n, r = !1, i = !0) {
	if (r || je(e, t.length, i)) {
		let e = t[0];
		return e ? $e(n, e, i, 0) : `#${ve[n % ve.length]}`;
	}
	return rr(n, t[n]);
}
function Ba(e) {
	return e.dataTable != null && It(e.chartType);
}
function Va(e) {
	return e.catAxisIsDate !== !0 || e.chartType === "clusteredBarH" || e.chartType === "stackedBarH" || e.chartType === "stackedBarHPct";
}
function Ha(e, t) {
	return !Ba(e) || Va(e) ? 0 : e.catAxisHidden || e.catAxisTickLabelPos === "none" || e.catAxisTickLabelPos === "high" ? t : At(t, e.catAxisLabelOffsetPercent, e.cartesianAutoLayoutProfile);
}
function Ua(e, t, n) {
	return !Va(e) && !e.plotAreaManualLayout ? t + n : t;
}
function Wa(e) {
	let t = e.chartType === "clusteredBarH" || e.chartType === "stackedBarH" || e.chartType === "stackedBarHPct", n = e.series.map((e, t) => ({
		series: e,
		sourceIndex: t
	}));
	return t ? n.reverse() : n;
}
function Ga(e, t, n) {
	let r = t.values[n];
	return r == null ? "" : pr(r, t.valFormatCode, e.date1904);
}
function Ka(e, t) {
	let n = Ba(e) ? e.dataTable : null;
	if (!n) return 0;
	let r = hn(n.fontSizeHpt, t) ?? 9 * t, i = Math.max(1, r * 1.2) + 4 * t;
	return (e.series.length + 1) * i;
}
function qa(e, t, n) {
	let r = Ba(t) ? t.dataTable : null;
	if (!r) return 0;
	let i = hn(r.fontSizeHpt, n) ?? 9 * n, a = Yn(t, r.fontFace, "minor");
	e.save(), e.font = bt(i, a, r.fontBold ?? !1, r.fontItalic ?? !1);
	let o = t.series.reduce((t, n) => Math.max(t, Zn(e, n.name)), 0);
	e.restore();
	let s = r.showKeys ? Math.max(12 * n, i * 1.7) : 0, c = r.showKeys ? 4 * n : 0;
	return o + s + c + 6 * n;
}
function Ja(e, t, n, r) {
	let i = Ba(t) ? t.dataTable : null;
	if (!i) return null;
	let a = hn(i.fontSizeHpt, r) ?? 9 * r, o = Math.max(1, a * 1.2), s = o + 4 * r, c = Yn(t, i.fontFace, "minor");
	e.save(), e.font = bt(a, c, i.fontBold ?? !1, i.fontItalic ?? !1);
	let l = t.series.find((e) => e.catFormatCode)?.catFormatCode, u = l ?? t.catAxisFormatCode, d = l == null ? t.catAxisFormatDivisors : null, f = t.series.find((e) => e.catFormatBuiltinId != null)?.catFormatBuiltinId, p = ee(t).map((i) => {
		let a = i.trim() === "" ? NaN : Number(i);
		return wt(e, f === 14 && Number.isFinite(a) ? dr(a, t.date1904) : mr(i, u, t.date1904, d), Math.max(1, n - 4 * r));
	});
	e.restore();
	let m = Math.max(1, ...p.map((e) => e.length)) * o + 4 * r, h = Wa(t), g = ee(t).length, _ = h.map(({ series: e }) => {
		let n = cn(e.name);
		for (let r = 0; r < g; r++) n = Math.max(n, cn(Ga(t, e, r)));
		return (n - 1) * o;
	}), v = _.reduce((e, t) => e + t, 0);
	return {
		fontPx: a,
		lineHeight: o,
		headerLines: p,
		headerHeight: m,
		rowHeight: s,
		rowExtraHeights: _,
		totalHeight: m + h.length * s + v
	};
}
function Ya(e, t, n, r, i, a, o, s) {
	let c = t.dataTable;
	if (!c || !n) return;
	let l = ee(t);
	if (l.length === 0) return;
	let u = a / l.length, d = Yn(t, c.fontFace, "minor"), f = bt(n.fontPx, d, c.fontBold ?? !1, c.fontItalic ?? !1), p = c.showKeys ? Math.max(12 * s, n.fontPx * 1.7) : 0, m = c.showKeys ? 4 * s : 0;
	e.save(), e.font = f;
	let h = t.series.reduce((t, n) => Math.max(t, Zn(e, n.name)), 0) + p + m + 6 * s, g = Math.min(Math.max(0, r - o), h), _ = r - g, v = g + a, y = i + n.totalHeight, b = Wa(t), x = xa(t.series, t.chartType, t.scatterStyle, !1, t.categories, [], !0, [], t.radarStyle, t), S = Ce(t), C = c.fillColor ?? null;
	e.beginPath(), e.rect(_, i, v, n.totalHeight), e.clip();
	let w = c.fontHidden === !0 || c.fontPaintAuthored === !0 && c.fontColor == null ? "transparent" : c.fontColor ? `#${c.fontColor}` : "#000000", T = (e, t, r) => {
		let i = Vt(e);
		if (i.length > 1) {
			let e = r - (i.length - 1) * n.lineHeight / 2;
			i.forEach((r, i) => E(r, t, e + i * n.lineHeight));
			return;
		}
		E(i[0], t, r);
	}, E = (t, r, i) => {
		if (C && t !== "") {
			let a = e.measureText(t).width;
			e.fillStyle = `#${C}`, e.fillRect(r - a / 2, i - n.lineHeight / 2, a, n.lineHeight);
		}
		e.fillStyle = w, e.textAlign = "center", e.fillText(t, r, i);
	};
	e.fillStyle = w, e.textAlign = "center", e.textBaseline = "middle";
	for (let e = 0; e < l.length; e++) {
		let t = r + (e + .5) * u, a = n.headerLines[e] ?? [""], o = a.length * n.lineHeight, s = i + (n.headerHeight - o) / 2 + n.lineHeight / 2;
		a.forEach((e, r) => {
			T(e, t, s + r * n.lineHeight);
		});
	}
	let D = 0;
	for (let a = 0; a < b.length; a++) {
		let { series: o, sourceIndex: d } = b[a], f = n.rowExtraHeights[a] ?? 0, h = i + n.headerHeight + a * n.rowHeight + D + (n.rowHeight + f) / 2;
		if (D += f, g > 0) {
			let t = _ + 3 * s + p + m;
			if (e.textAlign = "left", dt(e, o.name, t, h, n.lineHeight, Math.max(0, r - t - 2 * s)), c.showKeys && p > 0) {
				let t = _ + 3 * s, r = Jt(S, d), i = r == null ? void 0 : x[r];
				if (i) {
					let r = Math.min(n.fontPx, n.rowHeight - 2 * s);
					va(e, i.swatchStyle, i.color, t, h - r / 2, p, r, i.marker, i.fillPaint, i.outlinePaint, i.outlineColor, i.outlineWidthEmu, i.outlineDash, i.outlineCustomDash, i.outlineCap, i.outlineJoin, s, 0, i.directEffect, i.fallbackEffect, i.directEffectIndex, i.fallbackEffectIndex);
				}
				e.fillStyle = w;
			}
		}
		for (let e = 0; e < l.length; e++) T(Ga(t, o, e), r + (e + .5) * u, h);
	}
	if (c.lineHidden !== !0 && (c.linePaintAuthored !== !0 || c.lineColor != null)) {
		if (e.strokeStyle = c.lineColor ? `#${c.lineColor}` : "#808080", e.lineWidth = c.lineWidthEmu == null ? Math.max(.5, s * .75) : lt(c.lineWidthEmu, s), e.setLineDash(j(c.lineDash ?? void 0, e.lineWidth)), c.showHorizontalBorder) {
			let t = i + n.headerHeight;
			for (let r = 0; r < b.length; r++) e.beginPath(), e.moveTo(_, t), e.lineTo(_ + v, t), e.stroke(), t += n.rowHeight + (n.rowExtraHeights[r] ?? 0);
		}
		if (c.showVerticalBorder) {
			e.beginPath(), e.moveTo(r, i), e.lineTo(r, y), e.stroke();
			for (let t = 1; t < l.length; t++) {
				let n = r + t * u;
				e.beginPath(), e.moveTo(n, i), e.lineTo(n, y), e.stroke();
			}
		}
		if (c.showOutline) {
			let t = e.lineWidth / 2;
			e.strokeRect(_ + t, i + t, Math.max(0, v - e.lineWidth), Math.max(0, n.totalHeight - e.lineWidth));
		}
	}
	e.restore();
}
function Xa(e, t, n) {
	if (n) return t + 1;
	let r = e[t];
	if (r == null) return null;
	let i = parseFloat(r);
	return Number.isNaN(i) ? null : i;
}
function Za(e, t) {
	return e.bubbleSizeRepresents === "w" ? t : Math.sqrt(t);
}
function Qa(e, t, n, r, i, a, o, s) {
	if (n.hidden === !0 || n.linePaintAuthored === !0 && n.color == null) return;
	e.save(), e.strokeStyle = n.color ? `#${n.color}` : s, e.lineWidth = n.lineWidthEmu ? Math.max(.5, n.lineWidthEmu / ir) : 1, e.setLineDash(j(n.dash, e.lineWidth));
	let c = n.barType === "plus" || n.barType === "both", l = n.barType === "minus" || n.barType === "both", u = n.dir === "x", d = e.lineWidth / 2;
	for (let s = 0; s < t.values.length; s++) {
		let f = t.values[s];
		if (f == null) continue;
		let p = Xa(r, s, i);
		if (p == null) continue;
		let m = a(p), h = o(f), g = (t) => {
			let r = m, i = h;
			u ? r = a(p + t) : i = o(f + t), e.beginPath(), e.moveTo(m, h), e.lineTo(r, i), e.stroke(), n.noEndCap || (e.save(), e.setLineDash([]), e.beginPath(), u ? (e.moveTo(r, i - d), e.lineTo(r, i + d)) : (e.moveTo(r - d, i), e.lineTo(r + d, i)), e.stroke(), e.restore());
		};
		if (c) {
			let e = n.plus[s];
			e != null && g(e);
		}
		if (l) {
			let e = n.minus[s];
			e != null && g(-e);
		}
	}
	e.restore();
}
function $a(e, t, n, r, i, a, o, s) {
	if (n.hidden === !0 || n.linePaintAuthored === !0 && n.color == null || n.dir === "x") return;
	let c = n.barType === "plus" || n.barType === "both", l = n.barType === "minus" || n.barType === "both";
	e.save(), e.strokeStyle = n.color ? `#${n.color}` : s, e.lineWidth = n.lineWidthEmu ? Math.max(.5, n.lineWidthEmu / ir) : 1, e.setLineDash(j(n.dash, e.lineWidth));
	let u = e.lineWidth / 2;
	for (let s = 0; s < r; s++) {
		if (t.values[s] == null) continue;
		let r = o(s), d = i(s), f = a(r), p = (t) => {
			let i = a(r + t);
			e.beginPath(), e.moveTo(d, f), e.lineTo(d, i), e.stroke(), n.noEndCap || (e.save(), e.setLineDash([]), e.beginPath(), e.moveTo(d - u, i), e.lineTo(d + u, i), e.stroke(), e.restore());
		};
		if (c) {
			let e = n.plus[s];
			e != null && p(e);
		}
		if (l) {
			let e = n.minus[s];
			e != null && p(-e);
		}
	}
	e.restore();
}
function eo(e, t, n) {
	return e.showDataLabelsOverMax === !0 || !Number.isFinite(n) || t <= n;
}
function to(e, t, n, r, i, a, o, s, c = !1, l = "sans-serif", u = "r", d = {
	x: -1e6,
	y: -1e6,
	w: 2e6,
	h: 2e6
}, f = d, p, m, h, g, _ = 0, v) {
	let y = t.dataLabelOverrides ?? [], b = Ye(y);
	if (y.length === 0 && !t.seriesDataLabels) return;
	let S = t.seriesDataLabels;
	for (let y = 0; y < t.values.length; y++) {
		let C = t.values[y];
		if (C == null || g && !g(C)) continue;
		let w = Xa(n, y, r);
		if (w == null) continue;
		let T = b.get(y);
		if (nr(S, T)) continue;
		let E = T?.showCatName ?? S?.showCatName, D = T?.showSerName ?? S?.showSerName, O = T?.showVal ?? S?.showVal, k = T?.showBubbleSize ?? S?.showBubbleSize, A = T?.showLegendKey ?? S?.showLegendKey ?? !1, j = Be({
			customText: T?.text,
			showCategory: E,
			showSeries: D,
			showValue: O,
			showBubbleSize: k,
			category: r ? mr((n[y] ?? String(w)).toString(), t.catFormatCodes?.[y] ?? t.catFormatCode ?? null, c) : pr(w, t.catFormatCodes?.[y] ?? t.catFormatCode ?? null, c),
			seriesName: t.name,
			sourceValue: C,
			bubbleSize: t.bubbleSizes?.[y] ?? void 0,
			valueDivisor: Sn(m),
			formatCode: T?.formatCode ?? S?.formatCode ?? null,
			formatDivisors: T?.formatCode == null ? S?.formatDivisors : null,
			date1904: c,
			separator: T?.separator ?? S?.separator
		}), M = A ? h?.(y) : void 0;
		if (!j && !M) continue;
		let ee = T?.position ?? S?.position ?? u, N = hn(T?.fontSizeHpt ?? S?.fontSizeHpt, s) ?? Math.max(9, Math.min(11, o / 25)), P = T?.fontColor ?? S?.fontColor, te = T?.fontBold ?? S?.fontBold ?? !1, F = T?.fontFace ?? S?.fontFace, ne = F && p ? p(F) : l;
		no(e, i(w), a(C), j, ee, N, P, te, ne, v?.(y) ?? 0, d, T?.manualLayout, f, T?.richRuns, s, p, M, x(T, S), vt(T?.labelBox, S?.labelBox), _);
	}
}
function no(e, t, n, r, i, a, o, s, c = "sans-serif", l = 0, u = {
	x: -1e6,
	y: -1e6,
	w: 2e6,
	h: 2e6
}, d, f = u, p, m = 1, h, g, _, v, y = 0) {
	e.save(), e.font = `${_?.fontItalic ? "italic " : ""}${s ? "bold " : ""}${a}px ${c}`, ao(e, r, {
		kind: "point",
		x: t,
		y: n,
		position: i,
		markerGap: l
	}, u, a, o ? `#${o}` : "#333", d, f, p && p.length > 0 ? {
		runs: p,
		ptToPx: m,
		fontFamily: c,
		fallbackBold: s,
		fallbackItalic: _?.fontItalic,
		fallbackBaseline: _?.fontBaseline,
		fallbackColorHidden: _?.fontPaintAuthored === !0 && (_.fontHidden === !0 || _.fontColor == null),
		fontFamilyForFace: h
	} : void 0, g, _, m, v, y), e.restore();
}
function ro(e, t, n, r, i, a) {
	if (!(!t?.text || !t.richRuns || t.richRuns.length === 0)) return io(e, t.richRuns, n, r, i, a);
}
function io(e, t, n, r, i, a) {
	if (!(!t || t.length === 0)) return {
		runs: t,
		ptToPx: n,
		fontFamily: r,
		fallbackBold: i,
		fallbackItalic: a?.fontItalic,
		fallbackBaseline: a?.fontBaseline,
		fallbackColorHidden: a?.fontPaintAuthored === !0 && (a.fontHidden === !0 || a.fontColor == null),
		fontFamilyForFace: (t) => Yn(e, t, "minor")
	};
}
function ao(e, t, n, r, i, a, o, s = r, c, l, u, d = 1, f, p = 0) {
	if (!t && !l || !Number.isFinite(i) || i <= 0) return;
	if (l) {
		oo(e, t, n, r, i, a, o, s, c, l, u, f);
		return;
	}
	if (c) {
		let t = jr(e, c, i, a);
		if (!t) return;
		let l = Le(u, d), m = L(t.width + l.left + l.right, t.height + l.top + l.bottom, u?.textRotation, u?.textVerticalMode), h = me(n, r, {
			w: m.w,
			h: m.h
		}, i, o, s);
		if (!h) return;
		e.save(), e.beginPath(), e.rect(h.clip.x, h.clip.y, h.clip.w, h.clip.h), e.clip(), qn(e, f, h.rect, d, p);
		let g = _e(u, h.textAlign), _ = ce(h.x, h.y, h.rect, t.height + l.top + l.bottom, u, o != null, g, h.textAlign, t.width + l.left + l.right, m.radians), v = Ge(e, _.x, _.y, m.radians, g, h.textBaseline, l);
		Ar(e, t, v.x, v.y, g, h.textBaseline, o ? Math.max(0, h.rect.w - l.left - l.right) : t.width), e.restore();
		return;
	}
	let m = i * 1.15, h = Qe(t).value.split(/\r?\n/), g = h.reduce((t, n) => Math.max(t, e.measureText(n).width), 0), _ = Math.max(m, h.length * m), v = Le(u, d), y = L(g + v.left + v.right, _ + v.top + v.bottom, u?.textRotation, u?.textVerticalMode), b = me(n, r, {
		w: y.w,
		h: y.h
	}, i, o, s);
	if (!b) return;
	let x = (t) => e.measureText(t).width, S = K(t, b.maxWidth, b.maxHeight, m, x, u);
	if (S.length === 0) return;
	let C = S.reduce((e, t) => Math.max(e, x(t)), 0), w = S.length * m, T = L(C + v.left + v.right, w + v.top + v.bottom, u?.textRotation, u?.textVerticalMode);
	if (b = me(n, r, {
		w: T.w,
		h: T.h
	}, i, o, s), !b) return;
	e.save(), e.beginPath(), e.rect(b.clip.x, b.clip.y, b.clip.w, b.clip.h), e.clip(), qn(e, f, b.rect, d, p);
	let E = u?.fontPaintAuthored === !0 && (u.fontHidden === !0 || u.fontColor == null);
	e.fillStyle = a;
	let D = _e(u, b.textAlign);
	e.textAlign = D, e.textBaseline = b.textBaseline;
	let O = ce(b.x, b.y, b.rect, w + v.top + v.bottom, u, o != null, D, b.textAlign, C + v.left + v.right, T.radians), k = Ge(e, O.x, O.y, T.radians, D, b.textBaseline, v), A = (u?.fontBaseline ?? 0) * i, j = b.textBaseline === "middle" ? k.y - (S.length - 1) * m / 2 : b.textBaseline === "bottom" ? k.y - (S.length - 1) * m : k.y;
	if (!E) for (let t = 0; t < S.length; t++) e.fillText(S[t], k.x, j + t * m - A);
	e.restore();
}
function oo(e, t, n, r, i, a, o, s, c, l, u, d) {
	let { entry: f, ptToPx: p, shapeRotationDeg: m } = l, h = ja([f], i, p)[0] ?? 0, g = Na(f, i, p), _ = t ? 4 : 0, v = t && c ? jr(e, c, i, a) : null;
	if (t && c && !v) return;
	let y = i * 1.15, b = t && !v ? Qe(t).value.split(/\r?\n/) : [], x = v?.width ?? b.reduce((t, n) => Math.max(t, e.measureText(n).width), 0), S = v?.height ?? (b.length > 0 ? Math.max(y, b.length * y) : 0), C = Le(u, p), w = L(h + _ + x + C.left + C.right, Math.max(g, S) + C.top + C.bottom, u?.textRotation, u?.textVerticalMode), T = me(n, r, {
		w: w.w,
		h: w.h
	}, i, o, s);
	if (!T) return;
	let E = b;
	if (t && !v && (E = K(t, Math.max(0, T.maxWidth - h - _), T.maxHeight, y, (t) => e.measureText(t).width, u), E.length === 0)) return;
	let D = v?.width ?? E.reduce((t, n) => Math.max(t, e.measureText(n).width), 0), O = v?.height ?? E.length * y, k = h + _ + D, A = Math.max(g, O), j = k + C.left + C.right, M = A + C.top + C.bottom, ee = L(j, M, u?.textRotation, u?.textVerticalMode);
	if (T = me(n, r, {
		w: ee.w,
		h: ee.h
	}, i, o, s), !T) return;
	let N = T.textAlign === "left" ? T.x + ee.w / 2 : T.textAlign === "right" ? T.x - ee.w / 2 : T.x, P = T.textBaseline === "top" ? T.y + ee.h / 2 : T.textBaseline === "bottom" ? T.y - ee.h / 2 : T.y;
	if (o) {
		let e = _e(u, "center"), t = ce(N, P, T.rect, M, u, !0, e);
		N = e === "left" ? t.x + j / 2 : e === "right" ? t.x - j / 2 : t.x, P = t.y;
	}
	let te = N - j / 2 + C.left, F = P - M / 2 + C.top;
	if (e.save(), e.beginPath(), e.rect(T.clip.x, T.clip.y, T.clip.w, T.clip.h), e.clip(), qn(e, d, T.rect, p, m), ee.radians !== 0 && (e.translate(N, P), e.rotate(ee.radians), e.translate(-N, -P)), va(e, f.swatchStyle, f.color, te, F + (A - g) / 2, h, g, f.marker, f.fillPaint, f.outlinePaint, f.outlineColor, f.outlineWidthEmu, f.outlineDash, f.outlineCustomDash, f.outlineCap, f.outlineJoin, p, m, f.directEffect, f.fallbackEffect, f.directEffectIndex, f.fallbackEffectIndex), t) {
		let t = te + h + _;
		if (v) Ar(e, v, t, F + (A - O) / 2, "left", "top");
		else if (!(u?.fontPaintAuthored === !0 && (u.fontHidden === !0 || u.fontColor == null))) {
			e.fillStyle = a, e.textAlign = "left", e.textBaseline = "top";
			let n = (u?.fontBaseline ?? 0) * i, r = F + (A - O) / 2 - n;
			for (let n = 0; n < E.length; n++) e.fillText(E[n], t, r + n * y);
		}
	}
	e.restore();
}
function so(e, t, n, r, i, a, o, s, c, l, u, d = "sans-serif", f = "t", p = {
	x: -1e6,
	y: -1e6,
	w: 2e6,
	h: 2e6
}, m = p, h, g, _, v, y, b, S = 0) {
	let C = t.dataLabelOverrides ?? [], w = Ye(C), T = t.seriesDataLabels;
	if (C.length === 0 && !T) return !1;
	for (let C = 0; C < r; C++) {
		if (t.sourceHidden?.[C] === !0 || t.values[C] == null && !u) continue;
		let r = o(C);
		if (b && !b(r)) continue;
		let E = t.values[C] ?? 0, D = w.get(C);
		if (nr(T, D)) continue;
		let O = D?.showCatName ?? T?.showCatName, k = D?.showSerName ?? T?.showSerName, A = D?.showVal ?? T?.showVal, j = D?.showPercent ?? T?.showPercent, M = D?.showLegendKey ?? T?.showLegendKey ?? !1, ee = Be({
			customText: D?.text,
			showCategory: O,
			showSeries: k,
			showValue: A,
			showPercent: j,
			category: n[C] ?? "",
			seriesName: t.name,
			sourceValue: E,
			valueDivisor: Sn(v),
			percentRatio: h?.(C),
			formatCode: D?.formatCode ?? T?.formatCode ?? null,
			formatDivisors: D?.formatCode == null ? T?.formatDivisors : null,
			percentFormatCode: D?.formatCode ?? T?.percentFormatCode,
			percentFormatDivisors: D?.formatCode == null ? T?.percentFormatDivisors : null,
			date1904: l,
			separator: D?.separator ?? T?.separator
		}), N = M ? y?.(C) : void 0;
		if (!ee && !N) continue;
		let P = D?.position ?? T?.position ?? f, te = hn(D?.fontSizeHpt ?? T?.fontSizeHpt, c) ?? Math.max(9, Math.min(11, s / 25)), F = D?.fontColor ?? T?.fontColor, ne = D?.fontBold ?? T?.fontBold ?? !1, I = D?.fontFace ?? T?.fontFace, re = I && _ ? _(I) : d;
		no(e, i(C), a(r), ee, P, te, F, ne, re, g?.(C) ?? 0, p, D?.manualLayout, m, D?.richRuns, c, _, N, x(D, T), vt(D?.labelBox, T?.labelBox), S);
	}
	return !0;
}
function co(e, t, n, r, i) {
	let a = 0;
	for (let o of [e?.fillPaint, e?.borderFill]) {
		if (!o) continue;
		let e = o.fillType === "image" ? kn(o, t, n, r, i) : yt(o);
		if (o.fillType === "gradient" && e > Di) return null;
		a += e;
	}
	return a;
}
function lo(e, t, n, r) {
	let i = t.seriesDataLabels;
	return nr(i, r) ? !1 : !!(r?.text || (r?.showVal ?? i?.showVal ?? e.showDataLabels) || (r?.showCatName ?? i?.showCatName) || (r?.showSerName ?? i?.showSerName) || (r?.showPercent ?? i?.showPercent) || (r?.showBubbleSize ?? i?.showBubbleSize) || (r?.showLegendKey ?? i?.showLegendKey)) && n < Math.max(t.values.length, t.categories?.length ?? 0, e.categories.length);
}
function uo(e, t, n, r = ar, i) {
	if (e.chartexSunburst || e.chartexTreemap) return null;
	let a = 0, o = Math.max(1, i?.w ?? 32 * r), s = Math.max(1, i?.h ?? 16 * r), c = (e) => {
		let t = co(e, n, o, s, r);
		return t == null || t > Oi - a ? !1 : (a += t, !0);
	}, l = e.threeD != null && t != null && ki.has(e.chartType), u = e.series.some((t) => (t.seriesType ?? e.chartType) === "scatter" && (t.categories ?? e.categories).some((e) => Number.isFinite(Number.parseFloat(e))));
	for (let t = 0; t < e.series.length; t++) {
		let n = e.series[t], r = Ye(n.dataLabelOverrides), i = n.seriesType ?? e.chartType, a = Math.max(n.values.length, n.categories?.length ?? 0, e.categories.length);
		for (let o = 0; o < a; o++) {
			let a = n.values[o];
			if (l) {
				if (a == null || !Number.isFinite(a)) continue;
				if (e.showDataLabelsOverMax !== !0) {
					let t = n.useSecondaryAxis ? e.secondaryValAxis?.max : e.valMax;
					if (t != null && Number.isFinite(t) && a > t) continue;
				}
			} else if (!bn(e, n, i, o, u, t)) continue;
			let s = r.get(o);
			if (!lo(e, n, o, s)) continue;
			let d = vt(s?.labelBox, n.seriesDataLabels?.labelBox);
			if (d && !c(d)) return Oi + 1;
		}
		if (!l) {
			for (let e of n.trendLines ?? []) if ((e.dispEq === !0 || e.dispRSqr === !0 || e.labelText || e.labelRichRuns?.some((e) => e.text.length > 0) === !0) && e.labelBox && !c(e.labelBox)) return Oi + 1;
		}
	}
	return a;
}
function fo(e, t, n, r = !1) {
	let i = n ?? "gap", a = [], o = [], s = () => {
		o.length > 0 && a.push(o), o = [];
	};
	for (let n = 0; n < t; n++) {
		if (e.sourceHidden?.[n] === !0) {
			s();
			continue;
		}
		if (!r && e.values[n] == null) {
			if (i === "gap") {
				s();
				continue;
			}
			if (i === "span") continue;
		}
		o.push(n);
	}
	return s(), a;
}
function po(e, t, n, r = t.smooth === !0) {
	return r && Zt(e, "dataPointLine", t, void 0, n).paint !== null;
}
var mo = (e) => Math.min(Math.max(e, Number.MIN_VALUE), Number.MAX_VALUE);
function ho(e, t) {
	let n = t != null && Number.isFinite(t) && t >= 2, r = (e) => n ? Math.log(e) / Math.log(t) : e, i = (e) => n ? t ** e : e, a = Infinity, o = -Infinity, s = (e) => {
		e < a && (a = e), e > o && (o = e);
	};
	for (let t of e) {
		if (t.length < 3 || t.some((e) => !Number.isFinite(e) || n && e <= 0)) continue;
		let e = t.map(r);
		for (let t = 0; t < e.length - 1; t++) {
			let n = e[t - 1] ?? e[t], r = e[t], i = e[t + 1], a = e[t + 2] ?? i, o = r + (i - n) / 6, c = i - (a - r) / 6;
			s(r), s(i);
			let l = -r + 3 * o - 3 * c + i, u = 2 * (r - 2 * o + c), d = o - r, f = Math.max(Math.abs(l), Math.abs(u), Math.abs(d));
			if (!(f > 0) || !Number.isFinite(f)) continue;
			let p = l / f, m = u / f, h = d / f, g = [];
			if (Math.abs(p) <= 1e-12) Math.abs(m) > 1e-12 && g.push(-h / m);
			else {
				let e = m * m - 4 * p * h;
				if (e >= 0) {
					let t = Math.sqrt(e);
					g.push((-m + t) / (2 * p), (-m - t) / (2 * p));
				}
			}
			for (let e of g) {
				if (!(e > 0 && e < 1)) continue;
				let t = 1 - e;
				s(t * t * t * r + 3 * t * t * e * o + 3 * t * e * e * c + e * e * e * i);
			}
		}
	}
	return Number.isFinite(a) ? n ? [mo(i(a)), mo(i(o))] : [a, o] : null;
}
function go(e, t, n) {
	let r = t === "smooth" || t === "smoothMarker" || t === "smoothNoMarker";
	return !(t === "marker" && de(e)) && t === "marker" && !n || r;
}
function _o(e, t, n, r, i, a, o, s, c) {
	if (!po(e, t, S(t, n), go(t, a, o))) return null;
	let l = [], u = [];
	for (let e = 0; e < t.values.length; e++) {
		let n = t.values[e];
		if (n == null) continue;
		let a = Xa(r, e, i);
		a != null && (l.push(a), u.push(n));
	}
	return {
		x: ho([l], s),
		y: ho([u], c)
	};
}
function vo(e, t, n) {
	return {
		series: t,
		seriesIndex: n,
		fallbackColor: rr(n, t),
		cats: t.categories ?? e.categories,
		pointOverrides: new Map((t.dataPointOverrides ?? []).map((e) => [e.idx, e]))
	};
}
function yo(e, t, n, r, i) {
	let a = G(e.bubbleScale ?? 100, 0, 300);
	if (a <= 0) return 0;
	let o = 0;
	for (let { series: r, cats: i, pointOverrides: a } of t) if (!(r.showMarker === !1 || r.markerSymbol === "none")) for (let t = 0; t < r.values.length; t++) {
		if (r.values[t] == null || Xa(i, t, n) == null || a.get(t)?.markerSymbol === "none") continue;
		let s = De(e, r.bubbleSizes?.[t]);
		s != null && (o = Math.max(o, Za(e, s)));
	}
	return o <= 0 ? 0 : Math.min(r, i) * a / (300 + a) / o;
}
function bo(e, t, n, r, i, a, o, s, c, l, u, d, f, p, m, h, g, _ = 0, v) {
	let y = p === "line" || p === "lineMarker" || p === "lineNoMarker", b = Ve("scatter", t.chartType, p, t.radarStyle), x = n.map(({ series: e, index: n }) => vo(t, e, n)), C = Sa(t, d), w = v ?? t, T = f ? yo(w, x, r, l, u) : 0;
	for (let { series: n, fallbackColor: o, cats: s } of x) for (let c of n.errBars ?? []) Qa(e, n, Lt(t, c), s, r, i, a, o);
	for (let { series: n, seriesIndex: o, fallbackColor: m, cats: h } of x) {
		let g = p === "marker" && de(n), v = g || y, b = go(n, p, f);
		if (v || b) {
			let f = [];
			for (let e = 0; e < n.values.length; e++) {
				let t = n.values[e];
				if (t == null) continue;
				let o = Xa(h, e, r);
				o != null && f.push({
					x: i(o),
					y: a(t),
					index: e
				});
			}
			if (f.length >= 2) {
				let r = S(n, o), i = {
					x: s,
					y: c,
					w: l,
					h: u
				};
				if (rt(t, o)) {
					oe(e, t, n, [f], b, !1, m, 1.5, d, i, _, !0);
					continue;
				}
				Ee(e, k(n.chartexStyle), t.chartStyleRoles?.dataPointLine, r, i, d, (e) => {
					e.save();
					let a = Re(e, t, "dataPointLine", n, void 0, r, m, 1.5, d, i, _, !0, !1);
					if (a && g && n.dataPointColors?.some(Boolean)) {
						e.lineWidth = 1.5;
						for (let t = 1; t < f.length; t++) e.strokeStyle = `#${n.dataPointColors[t] ?? n.color ?? m.replace(/^#/, "")}`, e.beginPath(), e.moveTo(f[t - 1].x, f[t - 1].y), e.lineTo(f[t].x, f[t].y), e.stroke();
					} else if (a) {
						if (e.beginPath(), e.moveTo(f[0].x, f[0].y), b && f.length >= 3) for (let t = 0; t < f.length - 1; t++) {
							let n = f[t - 1] ?? f[t], r = f[t], i = f[t + 1], a = f[t + 2] ?? i;
							e.bezierCurveTo(r.x + (i.x - n.x) / 6, r.y + (i.y - n.y) / 6, i.x - (a.x - r.x) / 6, i.y - (a.y - r.y) / 6, i.x, i.y);
						}
						else for (let t = 1; t < f.length; t++) e.lineTo(f[t].x, f[t].y);
						e.stroke();
					}
					e.restore();
				});
			}
		}
	}
	for (let { series: n, seriesIndex: o, fallbackColor: s, cats: c, pointOverrides: l } of x) {
		let u = !b && n.showMarker !== !1 && n.markerSymbol !== "none";
		if (u || !b && pt(n)) for (let p = 0; p < n.values.length; p++) {
			let m = n.values[p];
			if (m == null) continue;
			let h = Xa(c, p, r);
			if (h == null) continue;
			let g = l.get(p), v = zt(n, g, f ? "circle" : n.automaticMarkerSymbol ?? "circle", u);
			if (v === "none") continue;
			let y = g?.markerSize ?? n.markerSize ?? 5;
			if (f) {
				if (T <= 0) continue;
				let e = De(w, n.bubbleSizes?.[p]);
				if (e == null) continue;
				y = Za(w, e) * T / d;
			}
			let b = f ? ea(t, n, g, p, S(n, o), s) : null, x = b?.color ?? $i(n, g, p, s), C = f ? ta(t, n, g, p, S(n, o)) : null, E = f ? C.color : g?.markerLine ?? n.markerLine ?? null, D = g?.markerLineWidthEmu ?? n.markerLineWidthEmu, O = C?.widthEmu, k = f ? O : D, A = k == null ? void 0 : lt(k, d), j = f ? Dt(n, g) : !1;
			ra(e, t, n, g, p, i(h), a(m), v, y, x, E, d, A, f ? b.paint : Qn(n, g, p), _, f ? C.paint : void 0, f ? C.dash : void 0, f ? C.customDash : void 0, f ? C.cap : void 0, f ? C.join : void 0, j, f);
		}
	}
	for (let { series: n, seriesIndex: s, cats: l, pointOverrides: p } of x) to(e, n, l, r, i, a, u, d, t.date1904, Yn(t, t.dataLabelFontFace, "minor"), t.dataLabelPosition ?? "r", {
		x: o.x,
		y: c,
		w: o.w,
		h: u
	}, m, (e) => Yn(t, e, "minor"), g, (e) => C(s, e), (e) => eo(t, e, h), _, (e) => {
		if (b) return 0;
		let t = n.showMarker !== !1 && n.markerSymbol !== "none", r = p.get(e);
		if (zt(n, r, "circle", t) === "none") return 0;
		let i = r?.markerSize ?? n.markerSize ?? 5;
		if (f) {
			if (T <= 0) return 0;
			let t = De(w, n.bubbleSizes?.[e]);
			if (t == null) return 0;
			i = Za(w, t) * T / d;
		}
		return Math.max(0, i * d / 2);
	});
	for (let { series: n, fallbackColor: f, cats: p } of x) ua(e, n, f, i, a, d, n.values.map((e, t) => Xa(p, t, r)), {
		chart: t,
		chartRect: o,
		plotRect: {
			x: s,
			y: c,
			w: l,
			h: u
		},
		clipLineToPlot: !0,
		shapeRotationDeg: _
	});
}
function xo(e, t, n) {
	let r = hn(e.legendFontSizeHpt, n) ?? 10 * n, i = hn(e.dataTable?.fontSizeHpt, n) ?? 9 * n, a = hn(t.seriesDataLabels?.fontSizeHpt ?? e.dataLabelFontSizeHpt, n) ?? 10 * n;
	for (let e of t.dataLabelOverrides ?? []) a = Math.max(a, hn(e.fontSizeHpt, n) ?? a);
	return {
		legend: Math.max(2, (2 * r + 4) * .58),
		table: Math.max(2, i),
		labels: Math.max(2, a)
	};
}
function So(e, t, n = ar, r) {
	let i = Ft(e.chartType), a = e.chartexBox != null;
	if (!i && !a) return null;
	let o = an(e), s = e.series.some((t, n) => {
		let r = o[n];
		return (r?.kind === "bubble" || r?.kind === "scatter" ? "scatter" : t.seriesType ?? (e.chartType === "bubble" ? "scatter" : e.chartType)) === "scatter" ? (t.categories ?? e.categories).some((e) => Number.isFinite(Number.parseFloat(e))) : !1;
	}), c = Ba(e) && ee(e).length > 0 && e.dataTable?.showKeys === !0, l = g(e), u = Ce(e, !0), d = e.chartType === "bubble" && r ? yo(e, e.series.map((t, n) => vo(e, t, n)), !s, r.w, r.h) : 0, f = /* @__PURE__ */ new Map();
	if (r) for (let t of e.plotGroups ?? []) {
		if (t.kind !== "bubble" || t.seriesCount === 0) continue;
		let n = e.series.slice(t.seriesStart, t.seriesStart + t.seriesCount).map((n, r) => vo(e, n, t.seriesStart + r));
		f.set(t, yo({
			bubbleScale: t.bubbleScale ?? e.bubbleScale,
			bubbleSizeRepresents: t.bubbleSizeRepresents ?? e.bubbleSizeRepresents,
			showNegativeBubbles: t.showNegativeBubbles ?? e.showNegativeBubbles
		}, n, !s, r.w, r.h));
	}
	let p = 0, m = (e, t = 1) => t <= 0 || e <= 0 ? !0 : !Number.isSafeInteger(t) || e > Math.floor((Ei - p) / t) ? !1 : (p += e * t, !0), h = (e, r = 1, i = Math.max(2, 5 * n)) => {
		if (r <= 0 || e == null) return !0;
		let a = e.fillType === "image" ? kn(e, t, i, i, n) : yt(e);
		return e.fillType === "gradient" && a > Ti ? !1 : m(a, r);
	};
	if (i) for (let t = 0; t < e.series.length; t++) {
		let i = e.series[t], a = o[t], p = a?.kind === "bubble" || a == null && e.chartType === "bubble", g = a?.kind === "bubble" || a?.kind === "scatter" ? "scatter" : i.seriesType ?? (e.chartType === "bubble" ? "scatter" : e.chartType), _ = Ln(e.chartType, a), v = a?.scatterStyle ?? e.scatterStyle, y = a?.radarStyle ?? e.radarStyle, b = {
			chartType: _,
			bubbleScale: a?.bubbleScale ?? e.bubbleScale,
			showNegativeBubbles: a?.showNegativeBubbles ?? e.showNegativeBubbles
		}, x = p ? {
			bubbleScale: b.bubbleScale,
			bubbleSizeRepresents: a?.bubbleSizeRepresents ?? e.bubbleSizeRepresents,
			showNegativeBubbles: b.showNegativeBubbles
		} : void 0, C = a?.kind === "bubble" ? f.get(a) ?? 0 : d;
		if (!(g === "line" || g === "stackedLine" || g === "stackedLinePct" || g === "area" || g === "stackedArea" || g === "stackedAreaPct" || g === "scatter" || g === "radar" || g === "stock") || Ve(g, _, v, y)) continue;
		let w = g === "area" || g === "stackedArea" || g === "stackedAreaPct" ? (i.showMarker === !0 || Gn(i)) && i.markerSymbol !== "none" : g === "stock" ? i.markerSymbol != null && i.markerSymbol !== "none" : i.showMarker !== !1 && i.markerSymbol !== "none";
		if (!w && !pt(i)) continue;
		let T = Math.max(i.values.length, i.categories?.length ?? 0, e.categories.length), E = Ye(i.dataPointOverrides), D = new Map((i.dataLabelOverrides ?? []).map((e) => [e.idx, e])), O = xo(e, i, n), k = u[t]?.pointDriven === !0;
		for (let a = 0; a < T; a++) {
			let o = ln(e, i, g, a, s, b) && (!p || C > 0 && De(x, i.bubbleSizes?.[a]) != null), d = k && e.showLegend && be(u, l, t, a), f = D.get(a), _ = k && o && !nr(i.seriesDataLabels, f) && (f?.showLegendKey ?? i.seriesDataLabels?.showLegendKey ?? !1) === !0, S = k && c && a === 0;
			if (!o && !d && !_ && !S || p && o && (C <= 0 || De(x, i.bubbleSizes?.[a]) == null)) continue;
			let T = E.get(a), A = zt(i, T, "circle", w);
			if (A === "none") continue;
			let j = p ? ga(e, i, T, a) : _a(e, i, T, a, t, g, v, y), M = j ? j.fillPaint : p ? void 0 : Qn(i, T, a), ee = j?.linePaint, N = Jn(j?.symbol ?? A), P = (e) => (!N || h(M, 1, e)) && h(ee, 1, e) && (!p || j?.bubble3D !== !0 || M === null || m(15)), te = Math.max(2, (T?.markerSize ?? i.markerSize ?? 5) * n);
			if (g === "scatter" && p) {
				let e = De(x, i.bubbleSizes?.[a]);
				te = e == null ? 0 : Za(x, e) * C;
			} else g === "radar" && T?.markerSize == null && i.markerSize == null && r && (te = Math.max(4 * n, Math.min(r.w, r.h) * .025));
			if (o && !P(te) || d && !P(O.legend) || S && !P(O.table) || _ && !P(O.labels)) return Ei + 1;
		}
		let j = i.markerSymbol ?? (g === "stock" ? "none" : "circle");
		if (!k && Jn(j) && W(_, v, i, y)) {
			let n = be(u, l, t), r = Ht(e, i, g, T, s, b), a = p ? ea(e, i, void 0, t, S(i, t), rr(t, i)) : null, o = p ? a.paint : A(i), d = p ? ta(e, i, void 0, t, S(i, t)) : null, f = (e, t) => h(o, e, t) && (!p || h(d.paint, e, t)) && (!p || !Dt(i, void 0) || a.paint === null || m(15, e));
			if (e.showLegend && n && !f(1, O.legend) || c && !f(1, O.table) || !f(r, O.labels)) return Ei + 1;
		}
	}
	let _ = e.chartexBox;
	if (_) {
		let t = _.series.length, r = e.chartexDataPointMarkerStyle ?? e.chartexDataPointStyle;
		if (Jn(e.chartStyleMarkerSymbol ?? e.chartexMarkerSymbol ?? "circle")) for (let i = 0; i < t; i++) {
			let a = _.series[i];
			if (!a.showNonoutliers && !a.showOutliers) continue;
			let o = 0;
			for (let e of a.valuesByCategory) {
				let t = Ze(e, a.quartileMethod);
				t && (o += b(t, a.showNonoutliers, a.showOutliers));
			}
			if (!h(Ii(e, S(a, i), t, a.chartexStyle, a.color, r), o, Math.max(2, 3 * n))) return Ei + 1;
		}
	}
	return p;
}
function Co(e, t) {
	if (!e.threeD || !t || !ki.has(e.chartType)) return null;
	let n = 0;
	for (let t of e.series) {
		let r = Math.max(1, t.values.length, t.categories?.length ?? 0), i = t.threeDShape ?? e.threeD.shape ?? "box", a = e.chartType === "pie" ? 36 : e.chartType.toLowerCase().includes("bar") ? i === "box" ? 4 : 36 : e.chartType.toLowerCase().includes("area") ? 4 : t.smooth === !0 ? 25 : 3;
		if (!Number.isSafeInteger(r) || r > Math.floor(1e4 / a) || (n += r * a, n > 1e4)) return gn + 1;
	}
	return n;
}
function wo(e, t, n) {
	return n <= 1e4 ? !1 : (e.fillStyle = "#888", e.font = "12px sans-serif", e.textAlign = "center", e.textBaseline = "middle", e.fillText("(too many data points)", t.x + t.w / 2, t.y + t.h / 2), !0);
}
function To(e, t, n, r) {
	let i = t.chartTextBoxes;
	if (i?.length) for (let a of i) {
		let i = n.x + a.x * n.w, o = n.y + a.y * n.h, s = a.w * n.w, c = a.h * n.h;
		if (!(s > 0 && c > 0)) continue;
		let l = i + (a.lIns ?? 91440) / ir * r, u = o + (a.tIns ?? 45720) / ir * r, d = i + s - (a.rIns ?? 91440) / ir * r, f = o + c - (a.bIns ?? 45720) / ir * r, p = d - l, m = f - u;
		if (!(p > 0 && m > 0)) continue;
		let h = (e, t) => {
			let n = Math.max(1, ...t.map((e) => e.fontPx));
			return {
				paragraph: e,
				runs: t,
				width: t.reduce((e, t) => e + t.width, 0),
				height: n * 1.2,
				baseline: n * .9
			};
		}, g = (e) => {
			if (!e.runs.some((e) => /[\r\n]/.test(e.text))) return [e.runs];
			let t = [[]], n = [void 0];
			for (let r of e.runs) r.text.split(/\r\n|\r|\n/).forEach((e, i) => {
				i > 0 && (t.push([]), n.push(void 0)), e ? t[t.length - 1].push({
					...r,
					text: e
				}) : n[t.length - 1] ??= r;
			});
			return t.map((t, r) => t.length ? t : [{
				...n[r] ?? e.runs[0],
				text: ""
			}]);
		}, _ = a.paragraphs.flatMap((e) => g(e).map((t) => ({
			paragraph: e,
			runs: t
		}))).flatMap(({ paragraph: n, runs: i }) => {
			let o = i.map((n) => {
				let i = Math.max(1, (n.fontSizeHpt ?? 1e3) / 100 * r), a = `${n.bold ? "bold " : ""}${i}px ${Yn(t, n.fontFace, "minor")}`;
				return e.font = a, {
					run: n,
					text: n.text,
					fontPx: i,
					font: a,
					width: e.measureText(n.text).width
				};
			}), s = o.reduce((e, t) => e + t.width, 0);
			if (a.wrap === "none" || s <= p) return [h(n, o)];
			let c = [], l = [], u = 0, d = () => {
				l.length && (c.push(h(n, l)), l = [], u = 0);
			};
			for (let t of o) {
				let n = t.text.match(/\s+|\S+/g) ?? [];
				for (let r of n) {
					let n = /^\s+$/.test(r);
					e.font = t.font;
					let i = e.measureText(r).width;
					l.length && u + i > p && d(), !(n && !l.length) && (l.push({
						...t,
						text: r,
						width: i
					}), u += i);
				}
			}
			return d(), c.length ? c : [h(n, o)];
		}), v = _.reduce((e, t) => e + t.height, 0), y = a.verticalAnchor === "b" ? f - v : a.verticalAnchor === "ctr" ? u + (m - v) / 2 : u;
		e.save(), e.beginPath(), e.rect(i, o, s, c), e.clip(), e.textAlign = "left", e.textBaseline = "alphabetic";
		let b = y;
		for (let t of _) {
			let n = t.paragraph.align, r = n === "ctr" ? l + (p - t.width) / 2 : n === "r" ? d - t.width : l;
			for (let n of t.runs) e.font = n.font, e.fillStyle = n.run.color ? `#${n.run.color}` : "#000000", e.fillText(n.text, r, b + t.baseline), r += n.width;
			b += t.height;
		}
		e.restore();
	}
}
function Eo(e, t, n, r, i, a) {
	let o = Math.max(0, Math.min(a, r / 2, i / 2));
	e.beginPath(), e.moveTo(t + o, n), e.lineTo(t + r - o, n), e.quadraticCurveTo(t + r, n, t + r, n + o), e.lineTo(t + r, n + i - o), e.quadraticCurveTo(t + r, n + i, t + r - o, n + i), e.lineTo(t + o, n + i), e.quadraticCurveTo(t, n + i, t, n + i - o), e.lineTo(t, n + o), e.quadraticCurveTo(t, n, t + o, n), e.closePath();
}
function Do(e, t, n) {
	let r = n / (e.titleFontSizeHpt != null && e.titleFontSizeHpt >= 100 && e.titleFontSizeHpt <= 4e5 ? e.titleFontSizeHpt / 100 : 14), i = hn(t.fontSizeHpt, r) ?? n, a = E(e, t.fontFace ?? e.titleFontFace);
	return {
		font: bt(i, a ? Hn(a, e) : $n(e), t.bold ?? e.titleFontBold ?? !1, t.italic ?? e.titleFontItalic ?? !1),
		fontSize: i,
		color: t.colorPaintAuthored === !0 ? t.colorHidden === !0 || !t.color ? "transparent" : `#${t.color}` : t.color ? `#${t.color}` : e.titleFontPaintAuthored === !0 ? e.titleFontColor ? `#${e.titleFontColor}` : "transparent" : e.titleFontColor ? `#${e.titleFontColor}` : "#333"
	};
}
function Oo(e, t, n, r) {
	let i = t.titleRichRuns?.length ? t.titleRichRuns : t.title ? [{ text: t.title }] : [], a = [{
		pieces: [],
		width: 0,
		height: r
	}], o = () => {
		let e = {
			pieces: [],
			width: 0,
			height: r
		};
		return a.push(e), e;
	}, s = a[0];
	for (let a of i) {
		let i = Do(t, a, r);
		for (let t of a.text.split(/(\n|[\t ]+)/).filter((e) => e.length > 0)) {
			if (t === "\n") {
				s = o();
				continue;
			}
			e.font = i.font;
			let r = e.measureText(t).width, a = /^[\t ]+$/.test(t);
			!a && s.pieces.length > 0 && s.width + r > n && (s = o()), !(a && s.pieces.length === 0) && (s.pieces.push({
				text: t,
				width: r,
				font: i.font,
				color: i.color
			}), s.width += r, s.height = Math.max(s.height, i.fontSize));
		}
	}
	return a;
}
function ko(e, t, n, r, i) {
	let a = d(t, r, i);
	if (a.bandH === 0 || !t.titleRichRuns?.length) return a;
	let o = e.font, s = Oo(e, t, Math.max(1, n), a.fontPx);
	e.font = o;
	let c = s.reduce((e, t) => e + t.height, 0);
	return {
		...a,
		bandH: a.topPad + c + a.bottomPad
	};
}
function Ao(e, t, n, r, i, a) {
	if (!t.title) return;
	let o = Bt(t, t.titleStyle ? { style: t.titleStyle } : void 0, t.chartStyleRoles?.title, Ne(t, "title"), !0), s = a / Math.max(1, (t.titleFontSizeHpt ?? 1400) / 100);
	if (!t.titleRichRuns?.length) {
		let c = E(t, t.titleFontFace);
		e.font = bt(a, c ? Hn(c, t) : $n(t), t.titleFontBold ?? !0, t.titleFontItalic ?? !1), e.fillStyle = t.titleFontColor ? `#${t.titleFontColor}` : "#333", e.textAlign = "center", e.textBaseline = "top";
		let l = Math.min(i, Zn(e, t.title));
		qn(e, o, {
			x: n + (i - l) / 2,
			y: r,
			w: l,
			h: a * 1.2 + Tt(t.title, a)
		}, s), dt(e, t.title, n + i / 2, r, a);
		return;
	}
	e.save();
	let c = Oo(e, t, Math.max(1, i), a), l = Math.min(i, Math.max(...c.map((e) => e.width), 0)), u = c.reduce((e, t) => e + t.height, 0);
	qn(e, o, {
		x: n + (i - l) / 2,
		y: r,
		w: l,
		h: u
	}, s), e.textAlign = "left", e.textBaseline = "top";
	let d = r;
	for (let t of c) {
		let r = n + (i - t.width) / 2;
		for (let n of t.pieces) e.font = n.font, e.fillStyle = n.color, e.fillText(n.text, r, d), r += n.width;
		d += t.height;
	}
	e.restore();
}
function jo(e, t, n, r, i, a, o, s) {
	if (!t.title) return;
	let c = t.titleManualLayout;
	if (c) {
		let l = E(t, t.titleFontFace);
		e.font = bt(s, l ? Hn(l, t) : $n(t), t.titleFontBold ?? !0, t.titleFontItalic ?? !1);
		let u = Oo(e, t, Math.max(1, i), s), d = Math.min(i, Math.max(...u.map((e) => e.width), 0)), f = {
			x: n + (i - d) / 2,
			y: o,
			w: d,
			h: s + (t.titleRichRuns?.length ? 0 : Tt(t.title, s))
		}, p = Fn({
			...c,
			w: void 0,
			h: void 0
		}, {
			x: n,
			y: r,
			w: i,
			h: a
		}, f);
		if (p) {
			Ao(e, t, p.x, p.y, p.w, s);
			return;
		}
	}
	Ao(e, t, n, o, i, s);
}
function Mo(e, t, n, r, i, a, o, s, c, l, u, d = 0) {
	let f = Number.isFinite(c.gapWidthPercent) && c.gapWidthPercent >= 0 ? c.gapWidthPercent : 150, p = Math.max(0, s / (1 + f / 100));
	for (let s = 0; s < r; s++) {
		let r = t(s), f = n(s);
		if (r == null || f == null || !Number.isFinite(r) || !Number.isFinite(f)) continue;
		let m = a(r), h = o(f), g = Math.abs(h - m);
		if (!(p > 0) || !(g > 0) || !Number.isFinite(g)) continue;
		let _ = f >= r ? c.up : c.down, v = _.fillPaintAuthored === !0 || _.fill != null || _.fillColor != null || _.fillHidden === !0 ? void 0 : f >= r ? u?.upFillColor : u?.downFillColor, y = _.fillColor ?? v, b = i(s) - p / 2, x = Math.min(m, h), S = _.linePaintAuthored === !0 || _.lineColor != null || _.lineHidden === !0, C = _.lineColor ?? (S ? void 0 : u?.lineColor), w = _.lineWidthEmu ?? (S ? void 0 : u?.lineWidthEmu);
		Ee(e, _.style, void 0, s, {
			x: b,
			y: x,
			w: p,
			h: g
		}, l, (e) => {
			if (!_.fillHidden && (_.fill != null || y != null) && Bi(e, _.fill ?? (y ? {
				fillType: "solid",
				color: y
			} : null), {
				x: b,
				y: x,
				w: p,
				h: g
			}, y ? `#${y}` : "rgba(0,0,0,0)", l, d), !_.lineHidden && (_.linePaintAuthored !== !0 || C != null) && (C != null || w != null)) {
				let t = e.getLineDash(), n = e.lineCap, r = e.lineJoin;
				e.strokeStyle = `#${C ?? "000000"}`, e.lineWidth = w == null ? Math.max(1, .75 * l) : lt(w, l), e.setLineDash(j(_.lineDash ?? void 0, e.lineWidth)), e.lineCap = _.lineCap === "rnd" ? "round" : _.lineCap === "sq" ? "square" : "butt", e.lineJoin = _.lineJoin === "round" || _.lineJoin === "bevel" ? _.lineJoin : "miter", e.strokeRect(b, x, p, g), e.setLineDash(t), e.lineCap = n, e.lineJoin = r;
			}
		});
	}
}
function No(e, t, n, r, i, a, o, s, c, l, u) {
	for (let d of t.lineGroupDecorations ?? []) {
		let f = t.series.filter((e) => e.lineGroupIndex === d.groupIndex);
		if (f.length === 0 && d.groupIndex === 0 && [
			"line",
			"stackedLine",
			"stackedLinePct"
		].includes(t.chartType) && (f = t.series.filter((e) => e.seriesType == null || e.seriesType === "line")), f.length === 0) continue;
		if (u === "foreground" && d.upDownBars && f.length >= 2) {
			let a = f[0], u = f[f.length - 1], p = t.legacyChartStyle === 2 ? {
				lineColor: "000000",
				lineWidthEmu: 9525,
				upFillColor: "FFFFFF",
				downFillColor: "000000"
			} : void 0, m = {
				...d.upDownBars,
				up: Ot(t, d.upDownBars.up, "upBar", p),
				down: Ot(t, d.upDownBars.down, "downBar", p)
			};
			Mo(e, (e) => o(a, e), (e) => o(u, e), n, r, i(a), i(u), s, m, c, void 0, l);
		}
		if (u === "foreground") continue;
		let p = d.dropLines ? un(t, d.dropLines, "dropLine") : null;
		p && on(e, p, c) && Ut(e, f, n, r, i, a, o);
		let m = d.hiLowLines ? un(t, d.hiLowLines, "hiLoLine") : null;
		if (m && f.length >= 2 && on(e, m, c)) {
			let t = i(f[0]);
			for (let i = 0; i < n; i++) {
				let n = Infinity, a = -Infinity;
				for (let e of f) {
					let t = o(e, i);
					t == null || !Number.isFinite(t) || (n = Math.min(n, t), a = Math.max(a, t));
				}
				!Number.isFinite(n) || !Number.isFinite(a) || (e.beginPath(), e.moveTo(r(i), t(n)), e.lineTo(r(i), t(a)), e.stroke());
			}
		}
	}
}
function Po(e, t, n, r) {
	return e != null && Number.isFinite(e) ? G(e, n, r) : t === "max" ? r : t === "min" ? n : G(0, n, r);
}
function Fo(e, t, n) {
	return Po(e.catAxisCrossesAt, e.catAxisCrosses, t, n);
}
function Io(e) {
	return 7 * e;
}
function Lo(e, t, n, r, i = {}, a = 0) {
	let { x: o, y: s, w: c, h: u } = n, d = t.chartType === "clusteredBarH" || t.chartType === "stackedBarH" || t.chartType === "stackedBarHPct", m = t.chartType.startsWith("stacked"), h = t.chartType === "stackedBarPct" || t.chartType === "stackedBarHPct", g = t.series.filter((e) => e.seriesType !== "line" && e.seriesType !== "scatter" && e.seriesType !== "area"), v = (e) => e.barGroupDirection == null ? d : e.barGroupDirection === "bar", y = g, b = (e) => e.useSecondaryAxis === !0 ? "secondary-default" : "primary-default", x = (e) => e.barGroupIndex == null ? b(e) : `group-${e.barGroupIndex}`, C = (e) => e.barGroupGrouping ?? (h ? "percentStacked" : m ? "stacked" : "clustered"), E = (e) => {
		let t = C(e);
		return t === "stacked" || t === "percentStacked";
	}, A = (e) => C(e) === "percentStacked", j = t.series.filter((e) => e.seriesType === "line"), N = t.series.filter((e) => e.seriesType === "area"), P = t.series.filter((e) => e.seriesType === "scatter"), F = new Map(t.series.map((e, t) => [e, t])), ne = /* @__PURE__ */ new Map();
	for (let e of t.plotGroups ?? []) for (let n = e.seriesStart; n < e.seriesStart + e.seriesCount; n++) {
		let r = t.series[n];
		r && ne.set(r, e);
	}
	let ae = /* @__PURE__ */ new Map();
	for (let e of t.plotGroups ?? []) {
		if (e.seriesCount === 0) continue;
		let t = ae.get(e.valueAxis) ?? {
			count: 0,
			percentCount: 0
		};
		t.count++, e.grouping === "percentStacked" && t.percentCount++, ae.set(e.valueAxis, t);
	}
	let L = (e) => {
		let t = ae.get(e.valueAxis);
		return t != null && t.count === t.percentCount;
	}, ce = Sa(t, r), z = t.series.some((e) => e.useSecondaryAxis === !0), B = !d && t.secondaryValAxis && z ? t.secondaryValAxis : null, de = !d && t.chartexPrimaryAxisRight === !0, fe = B ? y.filter((e) => e.useSecondaryAxis === !0) : [], me = B ? y.filter((e) => e.useSecondaryAxis !== !0) : y, ge = fe.length > 0 ? t.secondaryCatAxis : null, _e = fe[0]?.categories?.length ? fe[0].categories : t.categories, ve = ee(t), V = ve.length;
	if (V === 0) return;
	let be = /* @__PURE__ */ new Map();
	for (let e of y) {
		let t = x(e), n = be.get(t);
		n ? n.push(e) : be.set(t, [e]);
	}
	let H = (e) => be.get(x(e)) ?? [e], Se = /* @__PURE__ */ new Map();
	for (let [e, t] of be) {
		let n = Array(V).fill(0);
		for (let e of t) for (let t = 0; t < V; t++) n[t] += Math.abs(e.values[t] ?? 0);
		Se.set(e, n);
	}
	let Ce = (e, t) => Se.get(x(e))?.[t] || 1, De = (e) => {
		let t = ne.get(e);
		return t == null || L(t) ? 100 : 1;
	}, Oe = (e, t) => A(e) ? De(e) / Ce(e, t) : 1, je = /* @__PURE__ */ new Map(), Ie = /* @__PURE__ */ new Map();
	for (let e of [...j, ...N]) je.set(e, Array.from({ length: V }, (t, n) => e.values[n] ?? 0)), Ie.set(e, Array(V).fill(0));
	for (let e of t.plotGroups ?? []) {
		if (e.kind !== "line" && e.kind !== "area") continue;
		let n = t.series.slice(e.seriesStart, e.seriesStart + e.seriesCount), r = e.grouping === "stacked" || e.grouping === "percentStacked", i = e.grouping === "percentStacked", a = i && L(e) ? 100 : 1;
		for (let e = 0; e < V; e++) {
			let t = i && n.reduce((t, n) => t + Math.abs(n.values[e] ?? 0), 0) || 1, o = 0;
			for (let s of n) {
				let n = s.values[e] ?? 0, c = i ? n / t * a : n, l = Ie.get(s), u = je.get(s);
				l == null || u == null || (l[e] = r ? o : 0, o = r ? o + c : c, u[e] = o);
			}
		}
	}
	let Le = (e, t) => je.get(e)?.[t] ?? e.values[t] ?? 0, Be = (e, t) => Ie.get(e)?.[t] ?? 0, Ve = (e) => A(e) ? (e.errBars ?? []).map((t) => ({
		...t,
		plus: t.plus.map((t, n) => t == null ? t : t * Oe(e, n)),
		minus: t.minus.map((t, n) => t == null ? t : t * Oe(e, n))
	})) : e.errBars ?? [], He = (e) => {
		let n = ne.get(e);
		return n?.kind === "bar" || n?.kind === "bar3D" ? n.seriesCount === 1 && n.varyColors === !0 : $t(t);
	}, W = y.map((e) => new Map((e.dataPointOverrides ?? []).map((e) => [e.idx, e]))), We = y.map((e) => new Map((e.dataLabelOverrides ?? []).map((e) => [e.idx, e]))), Ge = y.map((e, t) => S(e, t)), Ke = pe(t), K = Ke && D(t, y), Ze = /* @__PURE__ */ new Map();
	Ke && y.forEach((e, n) => {
		let r = Ge[n], i = e.color ?? Ni(t, r, y.length, e.chartexStyle);
		Ze.set(e, Xi(t, e.name, e, t.chartexDataPointStyle, r, y.length, i, !1, !0, !0));
	});
	let Qe = y.findIndex(He), J = Qe >= 0 ? y[Qe] : void 0, tt = {
		...t,
		series: (Ke ? y : t.series).map((e) => Ze.get(e) ?? e)
	}, it = ko(e, t, c, u, r), ot = it.fontPx, st = it.topPad, ct = it.bandH, ut = Fe(t.catAxisFontSizeHpt, u, r), ht = Fe(t.valAxisFontSizeHpt, u, r), gt = !d && !Ba(t) && t.catAxisNoMultiLevelLabels !== !0 && (t.categoryLevels?.length ?? 0) > 1 ? t.categoryLevels : null, _t = (e, t) => vn((gt?.[e] ?? []).filter((e) => (e ?? "") !== ""), Rt(t)), yt = gt ? (gt.length - 1) * (ut + 4) : 0;
	for (let e = 1; e < (gt?.length ?? 0); e++) yt += _t(e, ut);
	let St = Ba(t), Ct = St && Va(t), Tt = Ha(t, ut), Et = Ka(t, r), Dt = qa(e, t, r), Ot = Fa(e, tt, c, u, r), { legRightW: kt, legLeftW: jt, legTopH: Mt, legBottomH: Ft } = Dn(Ot, t.legendOverlay === !0), It = fn(t, c, u, r), Bt = It.catFontPx, Ht = It.valFontPx, Ut = d ? t.valAxisTitle ? Ht + Y(u) + 4 + ue(t.valAxisTitle, Ht, "horizontal", t.valAxisTitleRotation, t.valAxisTitleVerticalMode) : 0 : It.catBandH, Wt = d ? t.catAxisTitle ? Bt + Y(c) + 4 + ue(t.catAxisTitle, Bt, "left", t.catAxisTitleRotation, t.catAxisTitleVerticalMode) : 0 : It.valBandW, qt = hn(ge?.fontSizeHpt, r) ?? 9 * r, Jt = ge && !ge.hidden && ge.tickLabelPos !== "none" ? qt + he(_e, ge, t, qt) + w(Nn(qt), ge.labelOffsetPercent) + 2 : 0, Yt = ge?.title ? at(ge.titleFontSizeHpt, r) + 6 + ue(ge.title, at(ge.titleFontSizeHpt, r), "horizontal", ge.titleRotation, ge.titleVerticalMode) : 0, Zt = ct + Mt + ht / 2 + 2 + Jt + Yt, Qt = d ? (t.valAxisHidden ? u * .02 : At(ht)) + Et + Ut + Ft : (St ? 0 : At(ut, t.catAxisLabelOffsetPercent, t.cartesianAutoLayoutProfile)) + yt + Et + Tt + Ut + Ft, en = u - Zt - Qt, tn = 0;
	if (d && !t.catAxisHidden && re(t)) {
		let n = t.catAxisFontSizeHpt == null ? Math.max(8, Math.min(11, en / V * .5)) : ut;
		e.save(), e.font = bt(n, Yn(t, t.catAxisFontFace, "minor"), t.catAxisFontBold ?? !1, t.catAxisFontItalic ?? !1);
		for (let n of ve) tn = Math.max(tn, Zn(e, mr(n, t.catAxisFormatCode, t.date1904, t.catAxisFormatDivisors)));
		e.restore(), tn += w(t.catAxisFontSizeHpt == null ? 4 : Pt(n), t.catAxisLabelOffsetPercent) + wn * r;
	}
	let nn = Math.min(tn, Math.max(0, c / 2 - Wt - jt)), rn = d ? c - ((t.catAxisHidden ? c * .03 : nn) + Wt + jt) - (kt + c * .03) : 0, an = t.valAxisHidden ? void 0 : (d ? rn : en) / r, sn = (e, t) => {
		let n = y[e], r = n?.values[t] ?? 0;
		if (!n || !E(n)) return r;
		let i = H(n), a = A(n), o = 1;
		a && (o = i.reduce((e, n) => e + Math.abs(n.values[t] ?? 0), 0) || 1);
		let s = a ? Oe(n, t) * o : 1, c = a ? r / o * s : r, l = 0, u = i.indexOf(n);
		for (let e = 0; e <= u; e++) {
			let n = i[e]?.values[t] ?? 0, r = a ? n / o * s : n;
			c < 0 == r < 0 && (l += r);
		}
		return l;
	}, cn = (t.plotGroups ?? []).filter((e) => e.seriesCount > 0 && e.valueAxis !== "secondary"), ln = cn.length > 0 ? cn.every((e) => e.grouping === "percentStacked") : me.some(A), dn = 0, mn = 0;
	for (let e = 0; e < V; e++) {
		let t = /* @__PURE__ */ new Map();
		for (let e of me) {
			let n = x(e), r = t.get(n);
			r ? r.push(e) : t.set(n, [e]);
		}
		for (let n of t.values()) {
			let t = n[0], r = E(t), i = A(t), a = i && n.reduce((t, n) => t + Math.abs(n.values[e] ?? 0), 0) || 1, o = 0, s = 0;
			for (let t of n) {
				let n = t.values[e] ?? 0, c = i ? n / a * De(t) : n;
				r ? c >= 0 ? o += c : s += c : (dn = Math.max(dn, c), mn = Math.min(mn, c));
			}
			r && (dn = Math.max(dn, o), mn = Math.min(mn, s));
		}
	}
	let gn = (e, n) => e.seriesType !== "line" || !po(t, e, S(e, F.get(e) ?? 0)) ? null : ho(fo(e, V, t.dispBlanksAs).map((t) => t.map((t) => Le(e, t))), n), yn = null;
	for (let e of [...j, ...N]) {
		if (B && e.useSecondaryAxis === !0) continue;
		for (let t = 0; t < V; t++) {
			if (e.values[t] == null) continue;
			let n = Le(e, t);
			dn = Math.max(dn, n), mn = Math.min(mn, n);
		}
		let n = gn(e, t.valAxisLogBase);
		n && (ln ? yn = yn ? [Math.min(yn[0], n[0]), Math.max(yn[1], n[1])] : n : (mn = Math.min(mn, n[0]), dn = Math.max(dn, n[1])));
	}
	for (let e of me) {
		let t = y.indexOf(e);
		for (let n of Ve(e)) te({
			...e,
			errBars: [n]
		}, d ? "x" : "y", (n) => e.values[n] == null ? null : sn(t, n), (e) => {
			dn = Math.max(dn, e), mn = Math.min(mn, e);
		});
	}
	for (let e of [...j, ...N]) B && e.useSecondaryAxis === !0 || te(e, "y", (t) => e.values[t] ?? null, (e) => {
		let t = e;
		dn = Math.max(dn, t), mn = Math.min(mn, t);
	});
	ln && (me.some((e) => e.values.some((e) => e != null && e > 0)) && (dn = Math.max(dn, 100)), me.some((e) => e.values.some((e) => e != null && e < 0)) && (mn = Math.min(mn, -100))), t.valMax != null && (dn = ln ? t.valMax * 100 : t.valMax), t.valMin != null && (mn = ln ? t.valMin * 100 : t.valMin), dn === 0 && mn === 0 && (dn = 1);
	let bn = K ? Xt(t, me, V, an) : pn(t, mn, dn, an, ln, d ? "horizontal" : "vertical", yn), { step: xn } = bn, Sn = new Set(y), Cn = new Set(g), Tn = (t.plotGroups ?? []).filter((e) => e.seriesCount > 0 && e.valueAxis === "secondary"), En = Tn.length > 0 ? Tn.every((e) => e.grouping === "percentStacked") : fe.some(A), kn = t.series.filter((e) => !Cn.has(e) || Sn.has(e)).map((e) => {
		if (e.useSecondaryAxis !== !0) return e;
		if (je.has(e)) return {
			...e,
			values: e.values.map((t, n) => t == null ? t : Le(e, n)),
			errBars: En ? (e.errBars ?? []).map((e) => ({
				...e,
				plus: e.plus.map((e) => e == null ? e : e * 100),
				minus: e.minus.map((e) => e == null ? e : e * 100)
			})) : e.errBars
		};
		if (Sn.has(e)) {
			let t = y.indexOf(e);
			return {
				...e,
				values: e.values.map((e, n) => e == null ? e : sn(t, n)),
				errBars: Ve(e)
			};
		}
		return En ? {
			...e,
			values: e.values.map((e) => e == null ? e : e * 100),
			errBars: (e.errBars ?? []).map((e) => ({
				...e,
				plus: e.plus.map((e) => e == null ? e : e * 100),
				minus: e.minus.map((e) => e == null ? e : e * 100)
			}))
		} : e;
	});
	if (En && fe[0]) {
		let e = [];
		fe.some((e) => e.values.some((e) => e != null && e > 0)) && e.push(100), fe.some((e) => e.values.some((e) => e != null && e < 0)) && e.push(-100), kn.push({
			...fe[0],
			values: e,
			errBars: []
		});
	}
	let An = [];
	if (B) for (let e of j) {
		if (e.useSecondaryAxis !== !0) continue;
		let t = gn(e, B.logBase);
		t && An.push(...t);
	}
	let Fn = Kt(B, kn, en / r, d ? "x" : "y", En, fe.length > 0, void 0, void 0, An), In = Math.max(8, Math.min(11, u / 20)), Ln = t.valAxisFontSizeHpt == null ? Math.max(8, Math.min(11, en / 20)) : ht, Rn = e.font, zn = 0, Hn = 0;
	if (!d && !t.valAxisHidden) {
		e.font = bt(Ln, Yn(t, t.valAxisFontFace, "minor"), t.valAxisFontBold ?? !1, t.valAxisFontItalic ?? !1);
		let n = 0;
		for (let r of bn.majorLines) {
			let i = Pn(t, r, ln);
			n = Math.max(n, Zn(e, i));
		}
		zn = n, Hn = zn + 16;
	}
	let Wn = hn(B?.fontSizeHpt, r) ?? In, qn = 0;
	if (B && !B.hidden) {
		e.font = `${Wn}px ${Yn(t, B.fontFace, "minor")}`;
		let n = 0;
		for (let r of Fn?.majorLines ?? []) n = Math.max(n, Zn(e, Nt(En ? r / 100 : r, B.formatCode ?? null, t.date1904, B.displayUnits, B.formatDivisors)));
		qn = n + 18;
	}
	e.font = Rn;
	let Jn = t.valAxisHidden || t.valAxisTickLabelPos === "none" ? 0 : vn(bn.majorLines.map((e) => Pn(t, e, ln)), Rt(Ln)), Xn = B && !B.hidden && B.tickLabelPos !== "none" && !d ? vn((Fn?.majorLines ?? []).map((e) => Nt(En ? e / 100 : e, B.formatCode ?? null, t.date1904, B.displayUnits, B.formatDivisors)), Rt(Wn)) : 0, $n = d ? 0 : Math.max(Jn, Xn) / 2, tr = d ? Jn : 0;
	Zt += $n;
	let nr = B && B.title ? se(B, r) : 0, ir = {
		t: Zt,
		r: kt + c * .03 + (de ? Hn + Wt : qn + nr),
		b: Qt + tr,
		l: d ? jt + Math.max((t.catAxisHidden ? c * .03 : nn) + Wt, Dt) : jt + Math.max(de ? qn + nr : Wt + Hn, Dt)
	};
	ir.t = Vo(t, Ot, o, s, c, u, ct, ir.t);
	let ar = d ? {
		t: 0,
		r: t.valAxisHidden ? 0 : Ln / 2,
		b: t.valAxisHidden ? 0 : Ln + tr + Ut,
		l: t.catAxisHidden ? 0 : tn + Wt
	} : mt({
		valAxisHidden: t.valAxisHidden,
		catAxisHidden: t.catAxisHidden,
		valLabelWidth: zn,
		valLabelFontPx: Ln,
		catLabelFontPx: ut,
		valLabelGapPx: t.valAxisFontSizeHpt == null ? 12 : Pt(Ln),
		catLabelGapPx: t.catAxisFontSizeHpt == null ? w(3, t.catAxisLabelOffsetPercent) : w(Nn(ut), t.catAxisLabelOffsetPercent),
		outerTextMarginPx: wn * r,
		valTitleBandW: Wt,
		catTitleBandH: Ut,
		secondaryBandW: qn + nr,
		valLabelExtraTopPx: $n
	}), or = xt(t, o, s, c, u, r, {
		titleBand: it,
		legendReserve: Ot,
		pad: ir,
		honorPlotAreaManualLayout: !0,
		manualOuterInsets: ar
	}), sr = ko(e, t, or.plotRect.pw, u, r);
	Math.abs(sr.bandH - it.bandH) > .01 && (it = sr, ot = it.fontPx, st = it.topPad, ct = it.bandH, Zt = ct + Mt + ht / 2 + 2 + Jt + Yt + $n, ir.t = Vo(t, Ot, o, s, c, u, ct, Zt), or = xt(t, o, s, c, u, r, {
		titleBand: it,
		legendReserve: Ot,
		pad: ir,
		honorPlotAreaManualLayout: !0,
		manualOuterInsets: ar
	}));
	let { px0: X, py0: Z, pw: Q } = or.plotRect, { ph: $ } = or.plotRect;
	if (jo(e, t, t.titleManualLayout || !t.titleRichRuns?.length ? o : X, s, t.titleManualLayout || !t.titleRichRuns?.length ? c : Q, u, s + st, ot), Q <= 0 || $ <= 0) return;
	let cr = p(t, ve, d ? !qe(t) : qe(t)), lr = K ? we(t, y, cr) : null, ur = q(t), dr = [], fr = 0, pr = 0;
	if (!Ct && !d && !cr && !t.catAxisHidden && re(t) && ur === 0) {
		let n = Q / V, r = t.catAxisFontSizeHpt == null ? Math.max(8, Math.min(11, n * .5)) : ut;
		e.save(), e.font = bt(r, Yn(t, t.catAxisFontFace, "minor"), t.catAxisFontBold ?? !1, t.catAxisFontItalic ?? !1);
		for (let i of ve) {
			let a = mr(i, t.catAxisFormatCode, t.date1904, t.catAxisFormatDivisors);
			dr.push(wt(e, a, Math.max(1, n), Bo(a, r)));
		}
		e.restore();
		let i = Math.max(1, ...dr.map((e) => e.length));
		i > 1 && (fr = (i - 1) * (r + 2)), pr = vn(ve.map((e) => mr(e, t.catAxisFormatCode, t.date1904, t.catAxisFormatDivisors)), Rt(r));
	} else if (!Ct && !d && !t.catAxisHidden && re(t)) {
		let e = t.catAxisFontSizeHpt == null ? Math.max(8, Math.min(11, Q / V * .5)) : ut;
		fr = vn(cr ? cr.majorTicks.map((e) => mr(String(e.serial), t.catAxisFormatCode, t.date1904, t.catAxisFormatDivisors)) : ve.map((e) => mr(e.toString(), t.catAxisFormatCode, t.date1904, t.catAxisFormatDivisors)), Rt(e), ur), pr = fr;
	}
	let hr = t.plotAreaManualLayout?.layoutTarget === "inner" && t.plotAreaManualLayout.w != null && t.plotAreaManualLayout.h != null;
	St && (Tt += fr), !hr && fr > 0 && ($ = Math.max(1, $ - fr));
	let gr = Ua(t, Q, de ? 0 : qn + nr), _r = St ? Ja(e, t, gr / V, r) : null;
	_r && _r.totalHeight > Et && ($ = Math.max(1, $ - (_r.totalHeight - Et))), Mn(e, t, X, Z, Q, $, r, a);
	let vr = (e) => Z + $ - bn.frac(e) * $, yr = (e) => X + bn.frac(e) * Q, br = vr(0), xr = yr(0), Sr = (e) => vr(e), Cr = Fn ? Fn.makeToY(Z, $) : vr, wr = (e) => Cr(e), Tr = _n(t, r);
	e.textBaseline = "middle";
	let Er = t.valAxisFontSizeHpt == null ? Math.max(8, Math.min(11, $ / 20)) : ht;
	e.font = bt(Er, Yn(t, t.valAxisFontFace, "minor"), t.valAxisFontBold ?? !1, t.valAxisFontItalic ?? !1);
	let Dr = t.valAxisFontColor ? `#${t.valAxisFontColor}` : "#555";
	if (e.fillStyle = Dr, !t.valAxisHidden) {
		let n = jn(t, r);
		for (let t of bn.minorLines) if (!d) Gt(e, X, Q, vr(t), !1, n);
		else {
			let r = yr(t);
			e.strokeStyle = n.color, e.lineWidth = n.width;
			let i = n.dash.length > 0 && e.getLineDash ? e.getLineDash() : [];
			n.dash.length > 0 && e.setLineDash(n.dash), e.beginPath(), e.moveTo(r, Z), e.lineTo(r, Z + $), e.stroke(), n.dash.length > 0 && e.setLineDash(i);
		}
		let a = l(t), o = t.valAxisTickLabelPos !== "none";
		for (let n of bn.majorLines) {
			let s = Math.abs(n) < xn * 1e-9, c = Pn(t, n, ln);
			if (d) {
				let r = yr(n);
				if (a) {
					e.strokeStyle = Tr.explicit ? Tr.color : s ? "#aaa" : Tr.color, e.lineWidth = Tr.explicit ? Tr.width : s ? 1 : Tr.width;
					let t = Tr.dash.length > 0 && e.getLineDash ? e.getLineDash() : [];
					Tr.dash.length > 0 && e.setLineDash(Tr.dash), e.beginPath(), e.moveTo(r, Z), e.lineTo(r, Z + $), e.stroke(), Tr.dash.length > 0 && e.setLineDash(t);
				}
				if (o) {
					e.textAlign = "center";
					let n = t.valAxisFontSizeHpt == null ? 10 : Nn(Er);
					Bn(e, c, r, Z + $ + n, Rt(Er));
				}
			} else {
				let l = vr(n);
				if (a && Gt(e, X, Q, l, s, Tr), o) {
					e.textAlign = de ? "left" : "right";
					let n = i.gapPolicy === "chartex" ? Io(r) : t.valAxisFontSizeHpt == null ? 12 : Pt(Er);
					dt(e, c, de ? X + Q + n : X - n, l, Rt(Er));
				}
			}
		}
	}
	if (B && Fn && ke(e, B, Fn, Cr, X, Q, r), !t.catAxisHidden && et(t)) {
		let n = ie(t, r);
		e.strokeStyle = n.color, e.lineWidth = n.width;
		let i = n.dash.length > 0 && e.getLineDash ? e.getLineDash() : [];
		n.dash.length > 0 && e.setLineDash(n.dash);
		let a = cr ? cr.majorTicks.map((e) => e.fraction) : Ue(t, V);
		for (let t of a) {
			if (e.beginPath(), d) {
				let n = Z + t * $;
				e.moveTo(X, n), e.lineTo(X + Q, n);
			} else {
				let n = X + t * Q;
				e.moveTo(n, Z), e.lineTo(n, Z + $);
			}
			e.stroke();
		}
		n.dash.length > 0 && e.setLineDash(i);
	}
	let { color: Or, width: kr } = f(t.catAxisLineColor, t.catAxisLineWidthEmu, r), { color: Ar, width: jr } = f(t.valAxisLineColor, t.valAxisLineWidthEmu, r), Mr = !t.catAxisHidden && !t.catAxisLineHidden, Nr = !t.valAxisHidden && !t.valAxisLineHidden && t.valAxisLineColor != null, Pr = Fo(t, bn.min, bn.max), Fr = d ? Z + $ : vr(Pr), Ir = d ? yr(Pr) : X, Lr = !d && (t.catAxisTickLabelPos ?? "nextTo") === "nextTo" ? Fr : Z + $, Rr = Math.max(1, Math.floor(t.catAxisTickMarkSkip ?? 1)), zr = !d && gt != null && cr == null && !t.catAxisLineHidden && Pe(t) && Math.abs(Lr - Fr) < .01, Br = () => {
		if (d) Mr && On(e, Ir, Z, Ir, Z + $, Or, kr, t.catAxisLineDash), Nr && On(e, X, Z + $, X + Q, Z + $, Ar, jr, t.valAxisLineDash);
		else if (Mr && On(e, X, Fr, X + Q, Fr, Or, kr, t.catAxisLineDash), Nr) {
			let n = de ? X + Q : X;
			On(e, n, Z, n, Z + $, Ar, jr, t.valAxisLineDash);
		}
		if (!t.valAxisHidden && t.valAxisMajorTickMark && t.valAxisMajorTickMark !== "none") for (let n of bn.majorLines) d ? le(e, t.valAxisMajorTickMark, "cat", Z + $, yr(n), Ar, jr, !1, t.valAxisLineHidden, "major", r, t.valAxisLineDash) : le(e, t.valAxisMajorTickMark, "val", de ? X + Q : X, vr(n), Ar, jr, de, t.valAxisLineHidden, "major", r, t.valAxisLineDash);
		if (!t.valAxisHidden && t.valAxisMinorTickMark && t.valAxisMinorTickMark !== "none") for (let n of bn.minorTicks) d ? le(e, t.valAxisMinorTickMark, "cat", Z + $, yr(n), Ar, jr, !1, t.valAxisLineHidden, "minor", r, t.valAxisLineDash) : le(e, t.valAxisMinorTickMark, "val", de ? X + Q : X, vr(n), Ar, jr, de, t.valAxisLineHidden, "minor", r, t.valAxisLineDash);
		if (!t.catAxisHidden && t.catAxisMajorTickMark && t.catAxisMajorTickMark !== "none") {
			let n = zr ? [] : Ue(t, V), i = cr ? cr.majorTicks.map((e) => e.fraction) : n.filter((e, t) => t % Rr === 0);
			for (let n of i) d ? le(e, t.catAxisMajorTickMark, "val", Ir, Z + n * $, Or, kr, !1, t.catAxisLineHidden, "major", r, t.catAxisLineDash) : le(e, t.catAxisMajorTickMark, "cat", Fr, X + n * Q, Or, kr, !1, t.catAxisLineHidden, "major", r, t.catAxisLineDash);
		}
		if (!t.catAxisHidden && t.catAxisMinorTickMark && t.catAxisMinorTickMark !== "none") {
			let n = Pe(t) ? Array.from({ length: V }, (e, t) => (t + .5) / V) : Array.from({ length: Math.max(0, V - 1) }, (e, t) => (t + .5) / (V - 1)), i = cr ? cr.minorTicks.map((e) => e.fraction) : n;
			for (let n of i) d ? le(e, t.catAxisMinorTickMark, "val", Ir, Z + n * $, Or, kr, !1, t.catAxisLineHidden, "minor", r, t.catAxisLineDash) : le(e, t.catAxisMinorTickMark, "cat", Fr, X + n * Q, Or, kr, !1, t.catAxisLineHidden, "minor", r, t.catAxisLineDash);
		}
	}, Vr = (e) => e ? $ / V : Q / V, Hr = Vr(d), Ur = qe(t), Wr = (e, t) => t ? Ur ? e : V - 1 - e : Ur ? V - 1 - e : e, Gr = (e, t = d) => cr ? cr.categoryBandFractions[e] * (t ? $ : Q) : Vr(t), Kr = (e, t = d) => cr ? (t ? Z : X) + cr.positions[e] * (t ? $ : Q) - Gr(e, t) / 2 : (t ? Z : X) + Wr(e, t) * Vr(t), qr = (e) => cr ? X + cr.positions[e] * Q : X + Wr(e, !1) * Vr(!1) + Vr(!1) / 2, Jr = (e, n) => {
		let r = e[0], a = r ? E(r) : m, o = a ? 1 : Math.max(1, e.length), s = r?.barGroupOverlap ?? t.barOverlap ?? 0, c = a || !Number.isFinite(s) ? 0 : Math.max(-100, Math.min(100, s)), l = O(r?.barGroupGapWidth ?? t.barGapWidth, i.gapPolicy ?? "legacy"), u = n / (1 + (o - 1) * (1 - c / 100) + l / 100), d = a ? 0 : u * (1 - c / 100);
		return {
			barW: u,
			clusterGap: d,
			catStart: (n - (u + (o - 1) * d)) / 2
		};
	}, Yr = (t.barGroupDecorations ?? []).some((e) => e.seriesLines?.length === 1) ? y.map(() => Array(V).fill(null)) : null;
	for (let n = 0; n < N.length; n++) {
		let i = N[n], o = Ye(i.dataPointOverrides), s = F.get(i) ?? n, c = S(i, s), l = rr(s, i), u = Te(t, i, void 0, c), d = B && i.useSecondaryAxis === !0 ? wr : Sr, f = t.dispBlanksAs ?? "zero", p = [], m = () => {
			if (p.length !== 0) {
				cr && (e.save(), e.beginPath(), e.rect(X, Z, Q, $), e.clip()), e.beginPath(), e.moveTo(p[0].x, p[0].baseY), e.lineTo(p[0].x, p[0].y), Kn(e, p, !1);
				for (let t = p.length - 1; t >= 0; t--) e.lineTo(p[t].x, p[t].baseY);
				e.closePath(), zi(e, u, {
					x: p[0].x,
					y: Z,
					w: Math.max(1, p[p.length - 1].x - p[0].x),
					h: $
				}, l, r, a), Re(e, t, "dataPoint", i, void 0, c, l, 1.5, r, {
					x: X,
					y: Z,
					w: Q,
					h: $
				}, a) && e.stroke(), cr && e.restore(), p = [];
			}
		};
		for (let e = 0; e < V; e++) {
			if (i.sourceHidden?.[e] === !0) {
				m();
				continue;
			}
			i.values[e] == null && (f === "gap" && m(), f !== "zero") || p.push({
				x: qr(e),
				y: d(Le(i, e)),
				baseY: d(Be(i, e))
			});
		}
		m();
		let h = ia(t, i, s), g = (i.showMarker === !0 || Gn(i)) && i.markerSymbol !== "none";
		if (g || pt(i)) {
			let n = Math.max(2, 2.5 * r);
			for (let s = 0; s < V; s++) {
				if (i.sourceHidden?.[s] === !0 || i.values[s] == null) continue;
				let c = o.get(s), u = zt(i, c, "circle", g);
				if (u === "none") continue;
				let f = qr(s), p = d(Le(i, s));
				if (h || T(c)) {
					let n = c?.markerLineWidthEmu ?? i.markerLineWidthEmu;
					ra(e, t, i, c, s, f, p, u, c?.markerSize ?? i.markerSize ?? 5, Vn(i, c, s, l), c?.markerLine ?? i.markerLine ?? null, r, n == null ? void 0 : lt(n, r), Qn(i, c, s), a);
				} else e.fillStyle = l, e.beginPath(), e.arc(f, p, n, 0, Math.PI * 2), e.fill();
			}
		}
	}
	for (let n = 0; n < V; n++) {
		let i = /* @__PURE__ */ new Map(), l = /* @__PURE__ */ new Map();
		for (let d = 0; d < y.length; d++) {
			let f = y[d], p = v(f), m = Gr(n, p), h = B != null && f.useSecondaryAxis === !0, g = H(f), _ = x(f), b = E(f), S = A(f), C = S && g.reduce((e, t) => e + Math.abs(t.values[n] ?? 0), 0) || 1, w = i.get(_) ?? 0, T = l.get(_) ?? 0, D = Math.max(0, g.indexOf(f)), { barW: O, clusterGap: j, catStart: ee } = Jr(g, m), N = h && Fn ? Fn.makeToY(Z, $) : vr, P = Fn ? ge?.crossesAt != null && Number.isFinite(ge.crossesAt) ? Math.max(Fn.min, Math.min(Fn.max, ge.crossesAt)) : ge?.crosses === "max" ? Fn.max : ge?.crosses === "min" ? Fn.min : Math.max(Fn.min, Math.min(Fn.max, 0)) : 0, te = h ? N(P) : br, ne = f.values[n] ?? 0, I = S ? ne / C * De(f) : ne, re = I < 0, ie = h && Fn ? Fn.max : bn.max, ae = re && (f.invertIfNegative === !0 || f.automaticNegativeStyle === !0), L = W[d].get(n), oe = L?.color ?? f.dataPointColors?.[n], se = He(f), z = Ke ? M(t, f, d, n) : se ? n : Ge[d], le = Te(t, f, L, z, n), ue = le?.fillType === "solid" ? le.color.startsWith("#") ? le.color : `#${le.color}` : oe ? `#${oe}` : se ? $e(n, f) : rr(d, f), de = ae ? f.automaticNegativeStyle === !0 || f.invertedFillHidden === !0 ? null : f.invertedFill : void 0, fe = Ne(t, "dataPoint"), pe = Ae(L?.chartexStyle, fe, z), me = L?.fillHidden === !0 ? R(fe) : void 0, he = pe !== void 0 || me !== void 0 || L?.color != null, _e = Ke ? Ui(t, f, L, z, y.length) : void 0, ye = _e === void 0 ? he || de === void 0 ? le : de : _e, V = (e, n) => {
				if (Ke) {
					let n = qi(t, f, L, z, y.length, ue);
					return n.paint && n.paint.fillType !== "solid" ? !1 : Ji(e, n, r);
				}
				if (L?.lineHidden != null || L?.lineColor != null || L?.lineWidthEmu != null || L?.lineDash != null || L?.chartexStyle?.linePaintAuthored === !0 || L?.chartexStyle?.lineHidden === !0) return Re(e, t, "dataPoint", f, L, z, ue, 1, r, n, a, !1);
				if (ae && (f.invertedLineHidden != null || f.invertedLineColor != null || f.invertedLineWidthEmu != null)) return f.invertedLineHidden ? !1 : (e.strokeStyle = `#${f.invertedLineColor ?? "000000"}`, e.lineWidth = lt(f.invertedLineWidthEmu, r), e.setLineDash([]), !0);
				if (f.automaticNegativeStyle === !0) return e.strokeStyle = "#000000", e.lineWidth = .75 * r, e.setLineDash([]), !0;
				let i = ae && t.chartType === "clusteredBar" && t.legacyChartStyle === 2 && f.invertedFillAuthored === !0 && f.invertedFill != null && f.invertedLineAuthored === !1, o = f.lineHidden === !0 || f.lineColor != null || f.lineWidthEmu != null;
				if (i && o) return f.lineHidden || !f.lineColor ? !1 : (e.strokeStyle = `#${f.lineColor}`, e.lineWidth = lt(f.lineWidthEmu, r), e.setLineDash([]), !0);
				if (i) return e.strokeStyle = "#000000", e.lineWidth = .75 * r, e.setLineDash([]), !0;
				let s = Xe(t, "dataPoint", F.get(f) ?? d) ?? t.chartexDataPointStyle, c = Je(L?.chartexStyle, z), l = c === void 0 ? Je(f.chartexStyle, z) : c;
				return !s && !Ke && l === void 0 && !f.lineColor && f.lineHidden !== !0 ? !1 : Re(e, t, "dataPoint", f, L, z, ue, 1, r, n, a, !1);
			}, be = k(L?.chartexStyle, f.chartexStyle), xe = (e, t, n, i, o) => {
				if (Bi(e, ye === void 0 ? f.fillPattern : ye, {
					x: t,
					y: n,
					w: i,
					h: o
				}, ue, r, a), i > 0 && o > 0 && V(e, {
					x: t,
					y: n,
					w: i,
					h: o
				})) {
					let r = e.lineWidth;
					e.strokeRect(t + r / 2, n + r / 2, Math.max(0, i - r), Math.max(0, o - r));
				}
			};
			if (p) {
				let i = D, l = b ? Kr(n, !0) + ee : Kr(n, !0) + ee + i * j, p = b ? yr(re ? T : w) : xr, m = yr(b ? (re ? T : w) + I : I), h = G(Math.min(p, m), X, X + Q), g = G(Math.max(p, m), X, X + Q), _ = Math.max(0, g - h);
				Yr && f.values[n] != null && (Yr[d][n] = {
					categoryStart: l,
					categoryEnd: l + O,
					valueEnd: G(m, X, X + Q)
				}), (!Ke || Un({
					categoryStart: l,
					categoryEnd: l + O,
					valueStart: p,
					valueEnd: m,
					clipCategory: !1,
					valueClipStart: X,
					valueClipEnd: X + Q
				})) && Ee(e, be, Xe(t, "dataPoint", F.get(f) ?? d), z, {
					x: h,
					y: l,
					w: _,
					h: O
				}, r, (e) => xe(e, h, l, _, O));
				let v = f.seriesDataLabels, y = ft(t, f, n, f.categories?.[n] ?? ve[n] ?? "", ne, {
					visible: t.showDataLabels,
					showVal: t.showDataLabels && !S,
					showPercent: t.showDataLabels && S,
					showCatName: !1
				}, We[d], S ? I / 100 : void 0, f.useSecondaryAxis && B ? B.displayUnits : t.valAxisDisplayUnits);
				if (y && eo(t, ne, ie)) {
					let i = hn(y.fontSizeHpt ?? t.dataLabelFontSizeHpt, r) ?? Math.max(7, Math.min(11, O * .6)), p = We[d].get(n), m = y.fontBold || v?.fontBold == null && p?.fontBold == null, g = Yn(t, y.fontFace ?? t.dataLabelFontFace, "minor");
					e.font = `${y.textStyle.fontItalic ? "italic " : ""}${m ? "bold " : ""}${i}px ${g}`, Ro(e, y.text, h, l, _, O, "horizontal", y.position ?? t.dataLabelPosition ?? (b ? "ctr" : null), f.dataLabelColors?.[n] ?? y.fontColor ?? f.labelColor ?? t.dataLabelFontColor ?? null, i, {
						x: X,
						y: Z,
						w: Q,
						h: $
					}, {
						x: o,
						y: s,
						w: c,
						h: u
					}, p?.manualLayout, re, ro(t, p, r, g, m, y.textStyle), y.showLegendKey ? ce(F.get(f) ?? d, n) : void 0, y.textStyle, r, vt(p?.labelBox, v?.labelBox), a);
				}
			} else {
				let i = b ? Kr(n, !1) + ee : Kr(n, !1) + ee + D * j;
				if (!U(lr, d, n) || i + O <= X || i >= X + Q) continue;
				let l = b ? N(re ? T : w) : te, p = N(b ? (re ? T : w) + I : I), m = G(Math.min(l, p), Z, Z + $), h = G(Math.max(l, p), Z, Z + $), g = Math.max(0, h - m);
				Yr && f.values[n] != null && (Yr[d][n] = {
					categoryStart: i,
					categoryEnd: i + O,
					valueEnd: G(p, Z, Z + $)
				}), (!Ke || Un({
					categoryStart: i,
					categoryEnd: i + O,
					valueStart: l,
					valueEnd: p,
					clipCategory: !0,
					categoryClipStart: X,
					categoryClipEnd: X + Q,
					valueClipStart: Z,
					valueClipEnd: Z + $
				})) && Ee(e, be, Xe(t, "dataPoint", F.get(f) ?? d), z, {
					x: i,
					y: m,
					w: O,
					h: g
				}, r, (e) => xe(e, i, m, O, g));
				let _ = f.seriesDataLabels, v = ft(t, f, n, f.categories?.[n] ?? ve[n] ?? "", ne, {
					visible: t.showDataLabels,
					showVal: t.showDataLabels && !S,
					showPercent: t.showDataLabels && S,
					showCatName: !1
				}, We[d], S ? I / 100 : void 0, f.useSecondaryAxis && B ? B.displayUnits : t.valAxisDisplayUnits);
				if (v && eo(t, ne, ie)) {
					let l = hn(v.fontSizeHpt ?? t.dataLabelFontSizeHpt, r) ?? Math.max(7, Math.min(11, O * .6)), p = We[d].get(n), h = v.fontBold || _?.fontBold == null && p?.fontBold == null, y = Yn(t, v.fontFace ?? t.dataLabelFontFace, "minor");
					e.font = `${v.textStyle.fontItalic ? "italic " : ""}${h ? "bold " : ""}${l}px ${y}`, Ro(e, v.text, i, m, g, O, "vertical", v.position ?? t.dataLabelPosition ?? (b ? "ctr" : null), f.dataLabelColors?.[n] ?? v.fontColor ?? f.labelColor ?? t.dataLabelFontColor ?? null, l, {
						x: X,
						y: Z,
						w: Q,
						h: $
					}, {
						x: o,
						y: s,
						w: c,
						h: u
					}, p?.manualLayout, re, ro(t, p, r, y, h, v.textStyle), v.showLegendKey ? ce(F.get(f) ?? d, n) : void 0, v.textStyle, r, vt(p?.labelBox, _?.labelBox), a);
				}
			}
			b && (re ? l.set(_, T + I) : i.set(_, w + I));
		}
	}
	if (Yr) {
		let n = /* @__PURE__ */ new Map();
		for (let e = 0; e < y.length; e++) {
			let t = y[e].barGroupIndex ?? 0, r = n.get(t);
			r ? r.push(e) : n.set(t, [e]);
		}
		for (let i of t.barGroupDecorations ?? []) if (i.seriesLines?.length === 1) {
			if (e.save(), !on(e, un(t, i.seriesLines[0], "seriesLine"), r)) {
				e.restore();
				continue;
			}
			e.beginPath(), e.rect(X, Z, Q, $), e.clip();
			for (let t of n.get(i.groupIndex) ?? []) {
				let n = Yr[t], r = v(y[t]);
				for (let t = 0; t + 1 < V; t++) {
					let i = n[t], a = n[t + 1];
					if (!i || !a) continue;
					let o = (i.categoryStart + i.categoryEnd) / 2, s = (a.categoryStart + a.categoryEnd) / 2 >= o;
					e.beginPath(), r ? (e.moveTo(i.valueEnd, s ? i.categoryEnd : i.categoryStart), e.lineTo(a.valueEnd, s ? a.categoryStart : a.categoryEnd)) : (e.moveTo(s ? i.categoryEnd : i.categoryStart, i.valueEnd), e.lineTo(s ? a.categoryStart : a.categoryEnd, a.valueEnd)), e.stroke();
				}
			}
			e.restore();
		}
	}
	let Xr = (e, t) => {
		let n = H(e), r = Math.max(0, n.indexOf(e)), i = v(e), a = Jr(n, Gr(t, i)), o = Kr(t, i) + a.catStart;
		return E(e) ? o + a.barW / 2 : o + r * a.clusterGap + a.barW / 2;
	}, Zr = (e, t) => {
		if (Number.isInteger(t) && t >= 0 && t < V) return Xr(e, t);
		let n = H(e), r = Math.max(0, n.indexOf(e)), i = v(e), a = Vr(i), o = Jr(n, a), s = i ? Ur ? t : V - 1 - t : Ur ? V - 1 - t : t;
		return (i ? Z : X) + s * a + o.catStart + (E(e) ? 0 : r) * o.clusterGap + o.barW / 2;
	};
	for (let i = 0; i < y.length; i++) {
		let o = y[i], s = v(o), c = B != null && o.useSecondaryAxis === !0, l = s ? yr : c && Fn ? Fn.makeToY(Z, $) : vr, u = rr(i, o), d = (e) => sn(i, e);
		for (let n of Ve(o)) zo(e, o, Lt(t, n), V, s, (e) => Xr(o, e), l, d, u, r);
		ua(e, o, u, (e) => Zr(o, e - 1), l, r, o.values.map((e, t) => t + 1), {
			chart: t,
			chartRect: n,
			plotRect: {
				x: X,
				y: Z,
				w: Q,
				h: $
			},
			shapeRotationDeg: a
		}, (e, t) => s ? {
			x: l(t),
			y: Zr(o, e - 1)
		} : {
			x: Zr(o, e - 1),
			y: l(t)
		});
	}
	if ((!Ct || d) && !t.catAxisHidden && re(t)) {
		e.fillStyle = t.catAxisFontColor ? `#${t.catAxisFontColor}` : "#555";
		let n = t.catAxisFontSizeHpt == null ? Math.max(8, Math.min(11, Hr * .5)) : ut;
		e.font = bt(n, Yn(t, t.catAxisFontFace, "minor"), t.catAxisFontBold ?? !1, t.catAxisFontItalic ?? !1);
		let i = Hr - 4, a = X - 4 - (o + jt + Wt), s = ur, c = cr ? cr.majorTicks.map((e) => ({
			raw: mr(String(e.serial), t.catAxisFormatCode, t.date1904, t.catAxisFormatDivisors),
			fraction: e.fraction,
			categoryIndex: -1
		})) : ve.map((e, n) => ({
			raw: mr(e.toString(), t.catAxisFormatCode, t.date1904, t.catAxisFormatDivisors),
			fraction: null,
			categoryIndex: n
		}));
		for (let r of c) {
			let { raw: c } = r;
			if (d) {
				let i = r.fraction == null ? Z + Wr(r.categoryIndex, !0) * Hr + Hr / 2 : Z + r.fraction * $, s = w(t.catAxisFontSizeHpt == null ? 4 : Pt(n), t.catAxisLabelOffsetPercent), l = o + jt + Wt, u = X - s, d = t.catAxisLabelAlignment, f = d === "l" ? l : d === "ctr" ? (l + u) / 2 : u;
				e.textAlign = d === "l" ? "left" : d === "ctr" ? "center" : "right", e.textBaseline = "middle", dt(e, c, f, i, Rt(n), a);
			} else {
				let a = r.fraction != null || r.categoryIndex < 0 ? {
					fraction: r.fraction ?? .5,
					textAlign: "center"
				} : ze(r.categoryIndex, V, Pe(t), Ur, t.catAxisLabelAlignment), o = X + a.fraction * Q;
				e.textAlign = a.textAlign, e.textBaseline = "top";
				let l = s === 0 ? i : $ * .4, u = w(t.catAxisFontSizeHpt == null ? 3 : Nn(n), t.catAxisLabelOffsetPercent);
				s === 0 ? (r.categoryIndex >= 0 ? dr[r.categoryIndex] ?? Vt(c) : Vt(c)).forEach((t, r) => {
					e.fillText(t, o, Lr + u + r * (n + 2));
				}) : Me(e, c, o, Lr + u, s, Rt(n), l);
			}
		}
		if (!d && gt) {
			let i = w(t.catAxisFontSizeHpt == null ? 3 : Nn(n), t.catAxisLabelOffsetPercent), a = n + 4;
			e.textAlign = "center", e.textBaseline = "top", e.strokeStyle = Or, e.lineWidth = kr, e.setLineDash([]);
			let o = (e) => {
				if (!zr || e % Rr !== 0) return Lr;
				let n = er("major", kr, r);
				return t.catAxisMajorTickMark === "cross" ? Lr - n / 2 : t.catAxisMajorTickMark === "in" ? Lr - n : Lr;
			}, s = /* @__PURE__ */ new Set();
			for (let e = 1; e < gt.length; e++) {
				let t = gt[e] ?? [];
				for (let e = 0; e < V; e++) (t[e] ?? "") !== "" && s.add(e);
				s.add(V);
			}
			let c = pr, l = gt.map((e, t) => t === 0 ? c : _t(t, n)), u = (e) => {
				let t = Lr + i + e * a;
				for (let n = 0; n < e; n++) t += l[n];
				return t;
			}, d = Lr + i + n + 2 + c;
			for (let t = 0; t <= V; t++) {
				if (s.has(t)) continue;
				let n = X + t / V * Q;
				e.beginPath(), e.moveTo(n, o(t)), e.lineTo(n, d), e.stroke();
			}
			let f = /* @__PURE__ */ new Map();
			for (let r = 1; r < gt.length; r++) {
				let i = gt[r] ?? [], a = [];
				for (let e = 0; e < V; e++) (i[e] ?? "") !== "" && a.push(e);
				for (let o = 0; o < a.length; o++) {
					let s = a[o], c = a[o + 1] ?? V, d = i[s] ?? "", p = X + s / V * Q, m = X + c / V * Q, h = u(r), g = t.catAxisLabelAlignment, _ = g === "l" ? p : g === "r" ? m : (p + m) / 2;
					e.textAlign = g === "l" ? "left" : g === "r" ? "right" : "center", dt(e, d, _, h, Rt(n), Math.max(0, m - p - 4));
					let v = h + n + 2 + l[r];
					for (let e of [s, c]) f.set(e, Math.max(f.get(e) ?? Lr, v));
				}
			}
			for (let [t, n] of f) {
				let r = X + t / V * Q;
				e.beginPath(), e.moveTo(r, o(t)), e.lineTo(r, n), e.stroke();
			}
		}
	}
	if (j.length > 0 && !d) {
		No(e, t, V, qr, (e) => B && e.useSecondaryAxis === !0 ? wr : Sr, () => Fr, (e, t) => e.values[t] == null ? null : Le(e, t), Hr, r, a, "background"), cr && (e.save(), e.beginPath(), e.rect(X, Z, Q, $), e.clip());
		for (let o = 0; o < j.length; o++) {
			let s = j[o], c = Ye(s.dataPointOverrides), l = rr(y.length + o, s), u = B && s.useSecondaryAxis === !0 ? wr : Sr, d = F.get(s) ?? o, f = rt(t, d), p = S(s, d), m = s.chartexStyle != null || s.lineHidden != null || s.lineColor != null || s.lineWidthEmu != null || t.chartexDataPointLineStyle != null, h = s.smooth === !0, g = fo(s, V, t.dispBlanksAs).map((e) => e.map((e) => ({
				x: qr(e),
				y: u(Le(s, e)),
				index: e
			})));
			if (f) oe(e, t, s, g, h, !1, l, 2, r, {
				x: X,
				y: Z,
				w: Q,
				h: $
			}, a, i.semanticLineNoStyleFallback !== !1);
			else {
				let n = (e) => {
					e.beginPath();
					for (let t of g) e.moveTo(t[0].x, t[0].y), Kn(e, t, h);
					e.stroke();
				};
				Ee(e, k(s.chartexStyle), t.chartStyleRoles?.dataPointLine, p, {
					x: X,
					y: Z,
					w: Q,
					h: $
				}, r, (e) => {
					if (Ke) {
						let i = [t.chartexDataPointStyle, t.chartexDataPointLineStyle];
						if (!Ji(e, {
							...Ki(t, Gi(s, p), i, i, p, j.length, `#${Ni(t, p, j.length, s.chartexStyle)}`, { linkedNoStyleFallback: !0 }),
							semanticFallback: !1
						}, r)) return;
						n(e);
						return;
					}
					(!m || Yi(e, t, t.chartexDataPointLineStyle, s, p, j.length, l, r, { linkedNoStyleFallback: i.semanticLineNoStyleFallback })) && (m || (e.strokeStyle = l, e.lineWidth = 2, e.setLineDash([])), n(e));
				});
			}
			let _ = s.showMarker !== !1 && s.markerSymbol !== "none", v = _ || pt(s), b = ia(t, s, d);
			if (v) for (let n = 0; n < V; n++) {
				if (s.sourceHidden?.[n] === !0 || s.values[n] == null) continue;
				let i = qr(n), o = u(Le(s, n)), d = c.get(n), f = zt(s, d, "circle", _);
				if (f !== "none") if (b || T(d)) {
					let c = d?.markerLineWidthEmu ?? s.markerLineWidthEmu;
					ra(e, t, s, d, n, i, o, f, d?.markerSize ?? s.markerSize ?? 5, Vn(s, d, n, l), d?.markerLine ?? s.markerLine ?? null, r, c == null ? void 0 : lt(c, r), Qn(s, d, n), a);
				} else e.fillStyle = l, e.beginPath(), e.arc(i, o, 3, 0, Math.PI * 2), e.fill();
			}
			ua(e, s, l, (e) => qr(e), u, r, void 0, {
				chart: t,
				chartRect: n,
				plotRect: {
					x: X,
					y: Z,
					w: Q,
					h: $
				},
				shapeRotationDeg: a
			});
		}
		No(e, t, V, qr, (e) => B && e.useSecondaryAxis === !0 ? wr : Sr, () => Fr, (e, t) => e.values[t] == null ? null : Le(e, t), Hr, r, a, "foreground"), cr && e.restore();
	}
	if (P.length > 0) {
		let i = [], l = [];
		for (let e of P) {
			let n = e.categories ?? [];
			for (let t = 0; t < e.values.length; t++) {
				let r = Xa(n, t, !1), a = e.values[t];
				r == null || a == null || (i.push(r), l.push(a));
			}
			let r = _o(t, e, F.get(e) ?? 0, e.categories ?? t.categories, !1, t.scatterStyle ?? "marker", !1, t.secondaryCatAxis?.logBase, t.secondaryValAxis?.logBase);
			r?.x && i.push(...r.x), r?.y && l.push(...r.y);
		}
		if (i.length && l.length) {
			let d = t.secondaryCatAxis, f = t.secondaryValAxis, p = _(i), m = _(l), h = (e) => e?.minorGridlines === !0 || e?.minorTickMark != null && e.minorTickMark !== "none", g = I({
				dataMin: p.min,
				dataMax: p.max,
				explicitMin: d?.min,
				explicitMax: d?.max,
				axisLenPt: Q / r,
				axisOrientation: "horizontal",
				majorUnit: d?.majorUnit,
				minorUnit: d?.minorUnit,
				needMinor: h(d),
				logBase: d?.logBase,
				reversed: d?.orientation === "maxMin"
			}), v = I({
				dataMin: m.min,
				dataMax: m.max,
				explicitMin: f?.min,
				explicitMax: f?.max,
				axisLenPt: $ / r,
				axisOrientation: "vertical",
				majorUnit: f?.majorUnit,
				minorUnit: f?.minorUnit,
				needMinor: h(f),
				logBase: f?.logBase,
				reversed: f?.orientation === "maxMin"
			});
			bo(e, t, P.map((e, t) => ({
				series: e,
				index: F.get(e) ?? t
			})), !1, (e) => X + g.fraction(e) * Q, (e) => Z + $ - v.fraction(e) * $, n, X, Z, Q, $, r, !1, t.scatterStyle ?? "marker", {
				x: o,
				y: s,
				w: c,
				h: u
			}, v.max, void 0, a);
		}
	}
	Br(), ge && !d && ye(e, t, ge, _e, n, X, Z, Q, r), B && Fn && xe(e, t, B, Fn, Cr, n, X, Z, Q, $, r, Wn, qn, Dr, t.date1904, En, de ? "left" : "right"), _r && Ya(e, t, _r, X, Z + $ + (d ? t.valAxisHidden ? u * .02 : At(ht) : Tt), gr, o + jt, r);
	let Qr = J && t.series.length === 1 ? J.values.map((e, n) => Te(t, J, W[Qe].get(n), n, n)) : Ke ? y.flatMap((e, n) => [Li(t, Ge[n], y.length, e.chartexStyle, e.color), ...da([e]).map(() => void 0)]) : [];
	Ra(e, tt, Ot, o, s, c, u, X, Z, Q, $, ct + 2, r, Qr), nt(e, t, o, s, c, u, X, Z, Q, $, jt, Ft, Bt, Ht, d);
}
function Ro(e, t, n, r, i, a, o, s, c, l, u, d, f, p = !1, m, h, g, _ = 1, v, y = 0) {
	ao(e, t, {
		kind: "bar",
		rect: o === "vertical" ? {
			x: n,
			y: r,
			w: a,
			h: i
		} : {
			x: n,
			y: r,
			w: i,
			h: a
		},
		orientation: o,
		negative: p,
		position: s ?? "outEnd"
	}, u, l, c ? `#${c}` : "#333", f, d, m, h, g, _, v, y);
}
function zo(e, t, n, r, i, a, o, s, c, l) {
	if (n.hidden === !0 || n.linePaintAuthored === !0 && n.color == null || !i && n.dir === "x" || i && n.dir === "y") return;
	let u = n.barType === "plus" || n.barType === "both", d = n.barType === "minus" || n.barType === "both";
	e.save(), e.strokeStyle = n.color ? `#${n.color}` : c, e.lineWidth = n.lineWidthEmu ? Math.max(.5, n.lineWidthEmu / ir * l) : Math.max(.5, l * .75), e.setLineDash(j(n.dash, e.lineWidth));
	let f = Math.max(e.lineWidth / 2, 2 * l);
	for (let c = 0; c < r; c++) {
		if (t.values[c] == null) continue;
		let r = s(c), l = a(c), p = o(r), m = (t) => {
			let a = o(r + t);
			e.beginPath(), i ? (e.moveTo(p, l), e.lineTo(a, l)) : (e.moveTo(l, p), e.lineTo(l, a)), e.stroke(), n.noEndCap || (e.save(), e.setLineDash([]), e.beginPath(), i ? (e.moveTo(a, l - f), e.lineTo(a, l + f)) : (e.moveTo(l - f, a), e.lineTo(l + f, a)), e.stroke(), e.restore());
		};
		if (u) {
			let e = n.plus[c];
			e != null && m(e);
		}
		if (d) {
			let e = n.minus[c];
			e != null && m(-e);
		}
	}
	e.restore();
}
function Bo(e, t) {
	return /^[+-]?(?:\d+(?:[.,]\d*)?|[.,]\d+)%?$/.test(e) ? t * .15 : 0;
}
function Vo(e, t, n, r, i, a, o, s) {
	if (!t || t.side !== "t" || e.legendOverlay === !0 || e.legendManualLayout == null) return s;
	let c = {
		x: n + 4,
		y: r + o + 2,
		w: Math.max(0, i - 8),
		h: t.reserveH
	}, l = Fn(e.legendManualLayout, {
		x: n,
		y: r,
		w: i,
		h: a
	}, c);
	if (!l) return s;
	let u = Math.max(0, r + s - (c.y + c.h));
	return Math.max(s, l.y + l.h - r + u);
}
function Ho(e, t, n, r, i = 0) {
	let { x: a, y: o, w: s, h: c } = n, u = ee(t), d = u.length;
	if (d === 0) return;
	let m = Sa(t, r), h = t.chartType === "stackedLinePct" ? "percentStacked" : t.chartType === "stackedLine" ? "stacked" : "standard", g = t.plotGroups?.filter((e) => e.kind === "line") ?? [{
		kind: "line",
		seriesStart: 0,
		seriesCount: t.series.length,
		categoryAxis: "primary",
		valueAxis: "primary",
		seriesAxis: "none",
		grouping: h
	}], _ = Array(t.series.length).fill(!1), v = Array(t.series.length).fill(!1), y = Array(t.series.length).fill(!1), b = Array(t.series.length).fill(null), x = t.series.map(() => Array(d).fill(0)), C = /* @__PURE__ */ new Map();
	for (let e of g) {
		let t = e.valueAxis;
		C.set(t, (C.get(t) ?? !0) && e.grouping === "percentStacked");
	}
	for (let e of g) {
		let n = e.grouping ?? "standard", r = n === "stacked" || n === "percentStacked", i = n === "percentStacked", a = t.series.slice(e.seriesStart, e.seriesStart + e.seriesCount), o = i && C.get(e.valueAxis) === !0 ? 100 : 1, s = i ? u.map((e, t) => a.reduce((e, n) => e + Math.abs(n.values[t] ?? 0), 0) || 1) : null;
		for (let t = 0; t < a.length; t++) {
			let n = e.seriesStart + t;
			_[n] = r, v[n] = i, y[n] = e.valueAxis === "secondary", b[n] = s;
			for (let e = 0; e < d; e++) {
				let c = a[t].values[e] ?? 0;
				if (!r) {
					x[n][e] = c;
					continue;
				}
				let l = t === 0 ? 0 : x[n - 1][e], u = i && s ? c / s[e] * o : c;
				x[n][e] = l + u;
			}
		}
	}
	let E = (e, t) => x[e]?.[t] ?? 0, D = g.filter((e) => e.valueAxis !== "secondary"), O = D.length > 0 && D.every((e) => e.grouping === "percentStacked"), A = t.dispBlanksAs ?? "gap", j = g.filter((e) => e.valueAxis === "secondary"), M = j.length > 0 && j.every((e) => e.grouping === "percentStacked"), N = t.secondaryValAxis && t.series.some((e, n) => y[n] || t.plotGroups == null && e.useSecondaryAxis === !0) ? t.secondaryValAxis : null, P = new Map(t.series.map((e, t) => [e, t])), F = (e) => {
		let n = P.get(e) ?? -1;
		return N != null && (y[n] || t.plotGroups == null && e.useSecondaryAxis === !0);
	}, ne = Infinity, I = -Infinity;
	for (let e = 0; e < d; e++) for (let n = 0; n < t.series.length; n++) {
		if (F(t.series[n]) || !_[n] && t.series[n].values[e] == null) continue;
		let r = E(n, e);
		ne = Math.min(ne, r), I = Math.max(I, r);
	}
	let ae = (e, n) => {
		let r = t.series[e];
		return po(t, r, S(r, e)) ? ho(fo(r, d, A, _[e]).map((t) => t.map((t) => E(e, t))), n) : null;
	}, L = null;
	for (let e = 0; e < t.series.length; e++) {
		if (F(t.series[e])) continue;
		let n = ae(e, t.valAxisLogBase);
		n && (O ? L = L ? [Math.min(L[0], n[0]), Math.max(L[1], n[1])] : n : (ne = Math.min(ne, n[0]), I = Math.max(I, n[1])));
	}
	let R = [];
	for (let e = 0; e < t.series.length; e++) {
		if (!F(t.series[e])) continue;
		let n = ae(e, N?.logBase);
		n && R.push(...n);
	}
	for (let e = 0; e < t.series.length; e++) {
		let n = t.series[e];
		F(n) || te(n, "y", (t) => n.values[t] == null ? null : E(e, t), (e) => {
			ne = Math.min(ne, e), I = Math.max(I, e);
		});
	}
	isFinite(ne) || (ne = 0, I = 1);
	let ce = t.valAxisLogBase != null && t.valAxisLogBase >= 2;
	t.valMin == null ? O && ne > 0 && !ce && (ne = 0) : ne = O ? t.valMin * 100 : t.valMin, t.valMax == null ? O && I < 0 && (I = 0) : I = O ? t.valMax * 100 : t.valMax;
	let z = ko(e, t, s, c, r), B = z.fontPx, ue = z.topPad, de = z.bandH, fe = Fa(e, t, s, c, r), { legRightW: pe, legLeftW: me, legTopH: he, legBottomH: ge } = Dn(fe, t.legendOverlay === !0), _e = Fe(t.catAxisFontSizeHpt, c, r), ve = Fe(t.valAxisFontSizeHpt, c, r), ye = fn(t, s, c, r), V = ye.catFontPx, be = ye.valFontPx, H = ye.catBandH, Se = ye.valBandW, Ce = Ba(t), we = Ce && Va(t), Te = Ha(t, _e), De = Ka(t, r), Oe = qa(e, t, r), Ae = de + he + ve / 2 + 2, je = (Ce ? De + Te : At(_e, t.catAxisLabelOffsetPercent)) + H + ge, Ne = c - Ae - je, Ie = Kt(N, t.series, Ne / r, "y", M, !1, (e, n) => y[n] || t.plotGroups == null && t.series[n].useSecondaryAxis === !0, (e, t, n) => !_[n] && e.values[t] == null ? null : E(n, t), R), Le = Math.max(8, Math.min(11, c / 20)), Ve = hn(N?.fontSizeHpt, r) ?? Le, U = 0;
	if (N && Ie && !N.hidden) {
		let n = e.font;
		e.font = bt(Ve, Yn(t, N.fontFace, "minor"), !1, N.fontItalic ?? !1);
		let r = 0;
		for (let n of Ie.majorLines) r = Math.max(r, Zn(e, Nt(n, N.formatCode ?? null, t.date1904, N.displayUnits, N.formatDivisors)));
		U = r + 18, e.font = n;
	}
	let He = N && N.title ? se(N, r) : 0, W = me + Math.max(ve * 2.2 + 10 + Se, Oe), G = pe + s * .05 + U + He, We = pn(t, ne, I, Ne / r, O, "vertical", L), Ge = 0;
	if (!t.valAxisHidden && t.valAxisTickLabelPos !== "none" && (t.chartexParetoSortDescending != null || t.plotAreaManualLayout != null && t.plotAreaManualLayout.layoutTarget !== "inner")) {
		let n = e.font;
		e.font = bt(ve, Yn(t, t.valAxisFontFace, "minor"), t.valAxisFontBold ?? !1, t.valAxisFontItalic ?? !1);
		for (let n of We.majorLines) Ge = Math.max(Ge, Zn(e, Pn(t, n, O)));
		e.font = n;
	}
	t.chartexParetoSortDescending != null && (W = Math.max(W, me + Ge + 10 + Se));
	let Ke = Math.max(t.valAxisHidden || t.valAxisTickLabelPos === "none" ? 0 : vn(We.majorLines.map((e) => Pn(t, e, O)), Rt(ve)), N && Ie && !N.hidden && N.tickLabelPos !== "none" ? vn(Ie.majorLines.map((e) => Nt(e, N.formatCode ?? null, t.date1904, N.displayUnits, N.formatDivisors)), Rt(Ve)) : 0) / 2;
	Ae += Ke;
	let Je = {
		t: Ae,
		r: G,
		b: je,
		l: W
	}, K = mt({
		valAxisHidden: t.valAxisHidden,
		catAxisHidden: t.catAxisHidden,
		valLabelWidth: Ge,
		valLabelFontPx: ve,
		catLabelFontPx: _e,
		valLabelGapPx: t.valAxisFontSizeHpt == null ? 6 : Pt(ve),
		catLabelGapPx: t.catAxisFontSizeHpt == null ? w(5, t.catAxisLabelOffsetPercent) : w(Nn(_e), t.catAxisLabelOffsetPercent),
		outerTextMarginPx: wn * r,
		valTitleBandW: Se,
		catTitleBandH: H,
		secondaryBandW: U + He,
		valLabelExtraTopPx: Ke
	}), Xe = xt(t, a, o, s, c, r, {
		titleBand: z,
		legendReserve: fe,
		pad: Je,
		honorPlotAreaManualLayout: !0,
		manualOuterInsets: K
	}), Ze = ko(e, t, Xe.plotRect.pw, c, r);
	Math.abs(Ze.bandH - z.bandH) > .01 && (z = Ze, B = z.fontPx, ue = z.topPad, de = z.bandH, Ae = de + he + ve / 2 + 2 + Ke, Je.t = Ae, Xe = xt(t, a, o, s, c, r, {
		titleBand: z,
		legendReserve: fe,
		pad: Je,
		honorPlotAreaManualLayout: !0,
		manualOuterInsets: K
	}));
	let { px0: Qe, py0: $e, pw: J } = Xe.plotRect, { ph: Y } = Xe.plotRect;
	if (jo(e, t, t.titleManualLayout || !t.titleRichRuns?.length ? a : Qe, o, t.titleManualLayout || !t.titleRichRuns?.length ? s : J, c, o + ue, B), J <= 0 || Y <= 0) return;
	let tt = Ua(t, J, U + He), it = Ce ? Ja(e, t, tt / d, r) : null;
	it && it.totalHeight > De && (Y = Math.max(1, Y - (it.totalHeight - De)));
	let at = p(t, u), ot = q(t), st = Math.max(1, Math.floor(t.catAxisTickLabelSkip ?? 1)), ct = () => at ? at.majorTicks.map((e) => mr(String(e.serial), t.catAxisFormatCode, t.date1904, t.catAxisFormatDivisors)) : Array.from({ length: Math.ceil(d / st) }, (e, n) => mr((u[n * st] ?? "").toString(), t.catAxisFormatCode, t.date1904, t.catAxisFormatDivisors));
	if (!t.catAxisHidden && !we && re(t) && t.catAxisTickLabelPos !== "high") {
		let e = t.plotAreaManualLayout?.layoutTarget === "inner" && t.plotAreaManualLayout.w != null && t.plotAreaManualLayout.h != null, n = vn(ct(), Rt(_e), ot);
		Ce && (Te += n), !e && n > 0 && (Y = Math.max(1, Y - n));
	}
	Mn(e, t, Qe, $e, J, Y, r, i);
	let ut = pn(t, ne, I, Y / r, O, "vertical", L);
	if (ut.max - ut.min === 0) return;
	let ft = (e) => $e + Y - ut.frac(e) * Y, ht = Ie ? Ie.makeToY($e, Y) : ft, gt = (e) => F(e) ? ht : ft, _t = ft(Fo(t, ut.min, ut.max)), vt = N && Ie ? ht(Po(t.secondaryCatAxis?.crossesAt, t.secondaryCatAxis?.crosses, Ie.min, Ie.max)) : _t, yt = (e) => F(e) ? vt : _t, St = f(t.catAxisLineColor, t.catAxisLineWidthEmu, r), Ct = f(t.valAxisLineColor, t.valAxisLineWidthEmu, r), wt = t.catAxisLineColor == null ? void 0 : St.color, Tt = t.catAxisLineWidthEmu == null ? void 0 : St.width, Et = t.valAxisLineColor == null ? void 0 : Ct.color, Dt = t.valAxisLineWidthEmu == null ? void 0 : Ct.width, Ot = Pe(t), kt = qe(t), jt = at ? (e) => Qe + at.positions[e] * J : Ot ? (e) => Qe + ((kt ? d - 1 - e : e) + .5) / d * J : (e) => {
		let t = kt ? d - 1 - e : e;
		return Qe + (d === 1 ? J / 2 : t / (d - 1) * J);
	};
	if (!t.valAxisHidden) {
		e.font = bt(ve, Yn(t, t.valAxisFontFace, "minor"), t.valAxisFontBold ?? !1, t.valAxisFontItalic ?? !1), e.textBaseline = "middle";
		let n = _n(t, r), i = jn(t, r);
		for (let t of ut.minorLines) Gt(e, Qe, J, ft(t), !1, i);
		let a = l(t), o = t.valAxisTickLabelPos !== "none";
		for (let i of ut.majorLines) {
			let s = ft(i);
			if (a && Gt(e, Qe, J, s, i === 0, n), le(e, t.valAxisMajorTickMark, "val", Qe, s, Et, Dt, !1, t.valAxisLineHidden, "major", r, t.valAxisLineDash), o) {
				e.fillStyle = t.valAxisFontColor ? `#${t.valAxisFontColor}` : "#555", e.textAlign = "right";
				let n = t.valAxisFontSizeHpt == null ? 6 : Pt(ve);
				dt(e, Pn(t, i, O), Qe - n, s, Rt(ve));
			}
		}
		if (t.valAxisMinorTickMark && t.valAxisMinorTickMark !== "none") for (let n of ut.minorTicks) le(e, t.valAxisMinorTickMark, "val", Qe, ft(n), Et, Dt, !1, t.valAxisLineHidden, "minor", r, t.valAxisLineDash);
	}
	if (N && Ie && ke(e, N, Ie, ht, Qe, J, r), !t.catAxisHidden && et(t)) {
		let n = ie(t, r);
		e.strokeStyle = n.color, e.lineWidth = n.width;
		let i = n.dash.length > 0 && e.getLineDash ? e.getLineDash() : [];
		n.dash.length > 0 && e.setLineDash(n.dash);
		let a = at ? at.majorTicks.map((e) => e.fraction) : Ue(t, d);
		for (let t of a) {
			let n = Qe + t * J;
			e.beginPath(), e.moveTo(n, $e), e.lineTo(n, $e + Y), e.stroke();
		}
		n.dash.length > 0 && e.setLineDash(i);
	}
	!t.catAxisHidden && !t.catAxisLineHidden && On(e, Qe, _t, Qe + J, _t, St.color, St.width, t.catAxisLineDash), !t.valAxisHidden && !t.valAxisLineHidden && On(e, Qe, $e, Qe, $e + Y, Ct.color, Ct.width, t.valAxisLineDash);
	let Mt = at ? (at.categoryBandFractions[0] ?? 0) * J : Ot ? J / d : d > 1 ? J / (d - 1) : J, Ft = new Map(t.series.map((e, t) => [e, t]));
	No(e, t, d, jt, gt, yt, (e, t) => {
		let n = Ft.get(e);
		return n == null ? null : E(n, t);
	}, Mt, r, i, "background");
	let It = Math.max(1, 2.25 * r), Bt = Math.max(2, 2.5 * r), Vt = Fe(t.dataLabelFontSizeHpt, c, r), Ht = [];
	for (let l = 0; l < t.series.length; l++) {
		let f = t.series[l], p = _[l], h = b[l], g = Ye(f.dataPointOverrides), y = rr(l, f), x = S(f, l), C = gt(f), w = f.smooth === !0, D = fo(f, d, A, p).map((e) => e.map((e) => ({
			x: jt(e),
			y: C(E(l, e)),
			index: e
		}))), O = {
			x: Qe,
			y: $e,
			w: J,
			h: Y
		};
		rt(t, l) ? oe(e, t, f, D, w, !1, y, It, r, O, i) : Ee(e, k(f.chartexStyle), t.chartStyleRoles?.dataPointLine, x, O, r, (e) => {
			if (Re(e, t, "dataPointLine", f, void 0, x, y, It, r, O, i)) {
				e.beginPath();
				for (let t of D) t.length !== 0 && (e.moveTo(t[0].x, t[0].y), Kn(e, t, w));
				e.stroke();
			}
		});
		let j = (e) => E(l, e);
		for (let n of f.errBars ?? []) $a(e, f, Lt(t, n), d, jt, C, j, y);
		e.fillStyle = y;
		let M = f.showMarker !== !1 && f.markerSymbol !== "none", ee = M || pt(f), P = ia(t, f, l), te = (f.dataLabelOverrides?.length ?? 0) > 0 || f.seriesDataLabels != null;
		te && Ht.push(() => {
			so(e, f, u, d, jt, C, j, Y, r, t.date1904 ?? !1, p || A === "zero", Yn(t, t.dataLabelFontFace, "minor"), t.dataLabelPosition ?? "r", {
				x: a,
				y: $e,
				w: s,
				h: Y
			}, {
				x: a,
				y: o,
				w: s,
				h: c
			}, v[l] && h ? (e) => (f.values[e] ?? 0) / h[e] : void 0, (e) => {
				if (!ee) return 0;
				let t = g.get(e);
				return !P && !T(t) ? Bt : zt(f, t, "circle", M) === "none" ? 0 : (t?.markerSize ?? f.markerSize ?? 5) / 2 * r;
			}, (e) => Yn(t, e, "minor"), F(f) ? N?.displayUnits : t.valAxisDisplayUnits, (e) => m(l, e), (e) => eo(t, e, F(f) && Ie ? Ie.max : ut.max), i);
		});
		for (let n = 0; n < d; n++) {
			if (f.sourceHidden?.[n] === !0 || !p && f.values[n] == null && A !== "zero") continue;
			let a = E(l, n);
			if (ee) {
				let o = g.get(n);
				if (P || T(o)) {
					let s = zt(f, o, "circle", M);
					if (s !== "none") {
						let c = o?.markerSize ?? f.markerSize ?? 5, l = Vn(f, o, n, y), u = o?.markerLine ?? f.markerLine ?? null, d = o?.markerLineWidthEmu ?? f.markerLineWidthEmu;
						ra(e, t, f, o, n, jt(n), C(a), s, c, l, u, r, d == null ? void 0 : lt(d, r), Qn(f, o, n), i);
					}
				} else e.beginPath(), e.arc(jt(n), C(a), Bt, 0, Math.PI * 2), e.fill();
			}
		}
		t.showDataLabels && !te && Ht.push(() => {
			for (let n = 0; n < d; n++) {
				if (f.sourceHidden?.[n] === !0 || !p && f.values[n] == null && A !== "zero") continue;
				let r = E(l, n), i = Be({
					showValue: !0,
					sourceValue: f.values[n] ?? 0,
					valueDivisor: Sn(F(f) ? N?.displayUnits : t.valAxisDisplayUnits),
					formatCode: t.dataLabelFormatCode ?? f.valFormatCode ?? null,
					date1904: t.date1904
				});
				no(e, jt(n), C(r), i, t.dataLabelPosition ?? "r", Vt, t.dataLabelFontColor ?? void 0, t.dataLabelFontBold ?? !1, Yn(t, t.dataLabelFontFace, "minor"), ee ? Bt + 1 : 2, {
					x: Qe,
					y: $e,
					w: J,
					h: Y
				});
			}
		}), ua(e, f, y, jt, C, r, void 0, {
			chart: t,
			chartRect: n,
			plotRect: {
				x: Qe,
				y: $e,
				w: J,
				h: Y
			},
			shapeRotationDeg: i
		});
	}
	No(e, t, d, jt, gt, yt, (e, t) => {
		let n = Ft.get(e);
		return n == null ? null : E(n, t);
	}, Mt, r, i, "foreground");
	for (let e of Ht) e();
	if (!t.catAxisHidden) {
		let n = t.catAxisFontColor ? `#${t.catAxisFontColor}` : "#555";
		e.fillStyle = n, e.textAlign = "center", e.textBaseline = "top", e.font = bt(_e, Yn(t, t.catAxisFontFace, "minor"), t.catAxisFontBold ?? !1, t.catAxisFontItalic ?? !1);
		let i = Math.max(1, Math.floor(t.catAxisTickMarkSkip ?? 1)), a = at ? at.majorTicks.map((e) => Qe + e.fraction * J) : Array.from({ length: Math.ceil(d / i) }, (e, t) => jt(t * i));
		for (let n of a) le(e, t.catAxisMajorTickMark, "cat", _t, n, wt, Tt, !1, t.catAxisLineHidden, "major", r, t.catAxisLineDash);
		if (t.catAxisMinorTickMark && t.catAxisMinorTickMark !== "none" && at) for (let n of at.minorTicks) le(e, t.catAxisMinorTickMark, "cat", _t, Qe + n.fraction * J, wt, Tt, !1, t.catAxisLineHidden, "minor", r, t.catAxisLineDash);
		let o = !we && re(t), s = st, c = ot, l = at ? at.majorTicks.map((e) => ({
			label: mr(String(e.serial), t.catAxisFormatCode, t.date1904, t.catAxisFormatDivisors),
			x: Qe + e.fraction * J,
			categoryIndex: -1
		})) : Array.from({ length: Math.ceil(d / s) }, (e, n) => {
			let r = n * s;
			return {
				label: mr((u[r] ?? "").toString(), t.catAxisFormatCode, t.date1904, t.catAxisFormatDivisors),
				x: jt(r),
				categoryIndex: r
			};
		});
		for (let r of l) {
			let i = r.categoryIndex < 0 ? null : ze(r.categoryIndex, d, Pe(t), qe(t), t.catAxisLabelAlignment), a = i ? Qe + i.fraction * J : r.x;
			if (!o) continue;
			e.textAlign = i?.textAlign ?? "center", e.fillStyle = n;
			let s = r.label;
			if (!s) continue;
			let l = w(t.catAxisFontSizeHpt == null ? 5 : Nn(_e), t.catAxisLabelOffsetPercent), u = t.catAxisTickLabelPos ?? "nextTo";
			Me(e, s, a, (u === "nextTo" ? _t : u === "high" ? $e : $e + Y) + l, c, Rt(_e));
		}
	}
	if (N && Ie) {
		let i = t.valAxisFontColor ? `#${t.valAxisFontColor}` : "#555";
		xe(e, t, N, Ie, ht, n, Qe, $e, J, Y, r, Ve, U, i, t.date1904);
	}
	it && Ya(e, t, it, Qe, $e + Y + Te, tt, a + me, r), Ra(e, t, fe, a, o, s, c, Qe, $e, J, Y, de + 2, r), nt(e, t, a, o, s, c, Qe, $e, J, Y, me, ge, V, be);
}
function Uo(e, t, n, r, i = 0) {
	let { x: a, y: o, w: s, h: c } = n, u = ee(t), d = u.length;
	if (d === 0) return;
	let m = Sa(t, r), h = t.plotGroups?.find((e) => e.kind === "stock"), g = h ? t.series.slice(h.seriesStart, h.seriesStart + h.seriesCount) : t.series, _ = t.plotGroups == null ? [] : t.plotGroups.filter((e) => e.kind === "line").flatMap((e) => t.series.slice(e.seriesStart, e.seriesStart + e.seriesCount)), v = [...g, ..._], y = new Map(t.series.map((e, t) => [e, t])), b = g.length >= 4, x = b ? 0 : -1, C = +!!b, T = b ? 2 : 1, E = b ? 3 : 2, D = g[C], O = g[T], A = g[E], j = x >= 0 ? g[x] : void 0, M = g[0], N = g.at(-1), P = t.secondaryValAxis && v.some((e) => e.useSecondaryAxis === !0) ? t.secondaryValAxis : null, F = (e) => P != null && e.useSecondaryAxis === !0, ne = ko(e, t, s, c, r), I = ne.fontPx, ie = ne.topPad, ae = ne.bandH, L = Fa(e, t, s, c, r), { legRightW: R, legLeftW: ce, legBottomH: z, legTopH: B } = Dn(L, t.legendOverlay === !0), ue = Fe(t.catAxisFontSizeHpt, c, r), de = Fe(t.valAxisFontSizeHpt, c, r), fe = fn(t, s, c, r), pe = fe.catFontPx, me = fe.valFontPx, he = fe.catBandH, ge = fe.valBandW, _e = Ba(t), ve = _e && Va(t), ye = Ha(t, ue), V = Ka(t, r), be = qa(e, t, r), H = ae + B + de / 2 + 2, Se = (_e ? V + ye : At(ue, t.catAxisLabelOffsetPercent)) + he + z, Ce = c - H - Se, we = (e, n) => {
		if (!po(t, e, S(e, y.get(e) ?? 0))) return null;
		let r = [[]];
		for (let t = 0; t < d; t++) {
			let n = e.values[t];
			n == null ? r.push([]) : r[r.length - 1].push(n);
		}
		return ho(r, n);
	}, Te = [];
	for (let e of _) {
		if (!F(e)) continue;
		let t = we(e, P?.logBase);
		t && Te.push(...t);
	}
	let De = Kt(P, v, Ce / r, "y", !1, !1, void 0, void 0, Te), Oe = Math.max(8, Math.min(11, c / 20)), Ae = hn(P?.fontSizeHpt, r) ?? Oe, je = 0;
	if (P && De && !P.hidden) {
		let n = e.font;
		e.font = bt(Ae, Yn(t, P.fontFace, "minor"), P.fontBold ?? !1, P.fontItalic ?? !1);
		let r = 0;
		for (let n of De.majorLines) r = Math.max(r, Zn(e, Nt(n, P.formatCode ?? null, t.date1904, P.displayUnits, P.formatDivisors)));
		je = r + 18, e.font = n;
	}
	let Ne = P?.title ? se(P, r) : 0, Ie = Infinity, Le = -Infinity;
	for (let e of v) if (!F(e)) for (let t = 0; t < d; t++) {
		let n = e.values[t];
		n != null && (Ie = Math.min(Ie, n), Le = Math.max(Le, n));
	}
	for (let e of v) F(e) || te(e, "y", (t) => e.values[t] ?? null, (e) => {
		Ie = Math.min(Ie, e), Le = Math.max(Le, e);
	});
	for (let e of _) {
		if (F(e)) continue;
		let n = we(e, t.valAxisLogBase);
		n && (Ie = Math.min(Ie, n[0]), Le = Math.max(Le, n[1]));
	}
	isFinite(Ie) || (Ie = 0, Le = 1), t.valMin != null && (Ie = t.valMin), t.valMax != null && (Le = t.valMax);
	let Be = {
		t: H + Math.max(t.valAxisHidden || t.valAxisTickLabelPos === "none" ? 0 : vn(pn(t, Ie, Le, Ce / r).majorLines.map((e) => Pn(t, e, !1)), Rt(de)), P && De && !P.hidden && P.tickLabelPos !== "none" ? vn(De.majorLines.map((e) => Nt(e, P.formatCode ?? null, t.date1904, P.displayUnits, P.formatDivisors)), Rt(Ae)) : 0) / 2,
		r: R + s * .05 + je + Ne,
		b: Se,
		l: ce + Math.max(de * 2.2 + 10 + ge, be)
	};
	jo(e, t, a, o, s, c, o + ie, I);
	let Ve = xt(t, a, o, s, c, r, {
		titleBand: ne,
		legendReserve: L,
		pad: Be,
		honorPlotAreaManualLayout: !0
	}), { px0: U, py0: He, pw: W } = Ve.plotRect, { ph: G } = Ve.plotRect;
	if (W <= 0 || G <= 0) return;
	let Ue = Ua(t, W, je + Ne), We = _e ? Ja(e, t, Ue / d, r) : null;
	We && We.totalHeight > V && (G = Math.max(1, G - (We.totalHeight - V)));
	let Ge = p(t, u);
	if (!t.catAxisHidden && !ve && re(t)) {
		let e = Math.max(1, Math.floor(t.catAxisTickLabelSkip ?? 1)), n = Ge && Ge.majorTicks.length > 0 ? Ge.majorTicks.map((e) => mr(String(e.serial), t.catAxisFormatCode, t.date1904, t.catAxisFormatDivisors)) : Array.from({ length: Math.ceil(d / e) }, (n, r) => mr((u[r * e] ?? "").toString(), t.catAxisFormatCode, t.date1904, t.catAxisFormatDivisors)), r = t.plotAreaManualLayout?.layoutTarget === "inner" && t.plotAreaManualLayout.w != null && t.plotAreaManualLayout.h != null, i = vn(n, Rt(ue), q(t));
		_e && (ye += i), !r && i > 0 && (G = Math.max(1, G - i));
	}
	Mn(e, t, U, He, W, G, r, i);
	let Ke = pn(t, Ie, Le, G / r);
	if (Ke.max - Ke.min === 0) return;
	let Je = (e) => He + G - Ke.frac(e) * G, K = De?.makeToY(He, G) ?? Je, Xe = (e) => F(e) ? K : Je, Ze = Pe(t), Qe = qe(t), $e = Ge ? (e) => U + Ge.positions[e] * W : Ze ? (e) => U + ((Qe ? d - 1 - e : e) + .5) / d * W : (e) => {
		let t = Qe ? d - 1 - e : e;
		return U + (d === 1 ? W / 2 : t / (d - 1) * W);
	};
	if (!t.valAxisHidden) {
		e.font = bt(de, Yn(t, t.valAxisFontFace, "minor"), t.valAxisFontBold ?? !1, t.valAxisFontItalic ?? !1), e.textBaseline = "middle";
		let n = _n(t, r), i = jn(t, r);
		for (let t of Ke.minorLines) Gt(e, U, W, Je(t), !1, i);
		let a = l(t), o = t.valAxisTickLabelPos !== "none";
		for (let i of Ke.majorLines) {
			let s = Je(i);
			a && Gt(e, U, W, s, i === 0, n), le(e, t.valAxisMajorTickMark, "val", U, s, void 0, void 0, !1, t.valAxisLineHidden, "major", r, t.valAxisLineDash), o && (e.fillStyle = t.valAxisFontColor ? `#${t.valAxisFontColor}` : "#555", e.textAlign = "right", dt(e, Pn(t, i, !1), U - 6, s, Rt(de)));
		}
		for (let n of Ke.minorTicks) le(e, t.valAxisMinorTickMark, "val", U, Je(n), void 0, void 0, !1, t.valAxisLineHidden, "minor", r, t.valAxisLineDash);
	}
	P && De && ke(e, P, De, K, U, W, r);
	let et = f(t.catAxisLineColor, t.catAxisLineWidthEmu, r), J = f(t.valAxisLineColor, t.valAxisLineWidthEmu, r);
	if (!t.catAxisHidden && !t.catAxisLineHidden && On(e, U, He + G, U + W, He + G, et.color, et.width, t.catAxisLineDash), !t.valAxisHidden && !t.valAxisLineHidden && On(e, U, He, U, He + G, J.color, J.width, t.valAxisLineDash), t.stockDropLines) {
		let n = t.stockAutomaticStyle ? {
			lineColors: [t.stockAutomaticStyle.lineColor],
			linePaintAuthored: !0,
			lineWidthEmu: t.stockAutomaticStyle.lineWidthEmu
		} : void 0, i = un(t, t.stockDropLines, "dropLine", n);
		(i.paintAuthored !== !0 || i.color != null) && (i.color != null || i.widthEmu != null || i.dash != null) && on(e, i, r) && Ut(e, g, d, $e, (e) => Xe(e), () => He + G, (e, t) => e.values[t] ?? null);
	}
	if (t.stockHiLowLines === !0 && D != null && O != null && D && O) {
		let n = un(t, t.stockHiLowLineStyle ?? { color: t.stockHiLowLineColor ?? null }, "hiLoLine", t.stockAutomaticStyle ? {
			lineColors: [t.stockAutomaticStyle.lineColor],
			linePaintAuthored: !0,
			lineWidthEmu: t.stockAutomaticStyle.lineWidthEmu
		} : void 0);
		if ((n.paintAuthored !== !0 || n.color != null) && (n.color != null || n.widthEmu != null || n.dash != null) && on(e, n, r)) for (let t = 0; t < d; t++) {
			let n = D.values[t], r = O.values[t];
			if (n == null || r == null) continue;
			let i = $e(t), a = Xe(D), o = Xe(O);
			e.beginPath(), e.moveTo(i, a(n)), e.lineTo(i, o(r)), e.stroke();
		}
	}
	let Y = (n, a, o) => {
		if (!n) return;
		let s = y.get(n) ?? a, c = rr(s, n), l = S(n, s), u = Ye(n.dataPointOverrides), f = n.markerSymbol != null && n.markerSymbol !== "none" && Gn(n), p = Math.max(3, W / d * .22);
		for (let a = 0; a < d; a++) {
			let s = n.values[a];
			if (s == null) continue;
			let d = $e(a), m = Xe(n)(s), h = u.get(a);
			if (h?.markerSymbol === "none" || h?.markerSymbol == null && n.markerSymbol === "none") continue;
			if (f || h?.markerSymbol != null && h.markerSymbol !== "none") {
				let o = h?.markerSymbol ?? n.markerSymbol ?? "circle";
				ra(e, t, n, h, a, d, m, o, h?.markerSize ?? n.markerSize ?? 3, Vn(n, h, a, c), h?.markerLine ?? n.markerLine ?? null, r, (h?.markerLineWidthEmu ?? n.markerLineWidthEmu) == null ? void 0 : lt(h?.markerLineWidthEmu ?? n.markerLineWidthEmu, r), Qn(n, h, a), i);
				continue;
			}
			let g = o === "right" ? d : o === "left" ? d - p : d - p / 2, _ = o === "right" ? d + p : o === "left" ? d : d + p / 2;
			Ee(e, k(h?.chartexStyle, n.chartexStyle), t.chartStyleRoles?.dataPointLine, l, {
				x: g,
				y: m,
				w: _ - g,
				h: 0
			}, r, (e) => {
				Re(e, t, "dataPointLine", n, h, l, c, Math.max(1, .75 * r), r, {
					x: U,
					y: He,
					w: W,
					h: G
				}, i) && (e.beginPath(), e.moveTo(g, m), e.lineTo(_, m), e.stroke());
			});
		}
	};
	for (let a of _) {
		let o = y.get(a) ?? 0, s = rr(Math.max(0, o), a), c = Xe(a), l = Ye(a.dataPointOverrides), u = S(a, o), f = rt(t, o), p = [], m = [], h = () => {
			m.length > 0 && p.push(m), m = [];
		};
		for (let e = 0; e < d; e++) {
			let t = a.values[e];
			if (t == null) {
				h();
				continue;
			}
			m.push({
				x: $e(e),
				y: c(t),
				index: e
			});
		}
		h(), f ? oe(e, t, a, p, a.smooth === !0, !1, s, Math.max(1, 2.25 * r), r, {
			x: U,
			y: He,
			w: W,
			h: G
		}, i) : Ee(e, k(a.chartexStyle), t.chartStyleRoles?.dataPointLine, u, {
			x: U,
			y: He,
			w: W,
			h: G
		}, r, (e) => {
			if (e.save(), Re(e, t, "dataPointLine", a, void 0, u, s, Math.max(1, 2.25 * r), r, {
				x: U,
				y: He,
				w: W,
				h: G
			}, i)) {
				e.beginPath();
				for (let t of p) e.moveTo(t[0].x, t[0].y), Kn(e, t, a.smooth === !0);
				e.stroke();
			}
			e.restore();
		});
		let g = a.showMarker !== !1 && a.markerSymbol !== "none";
		if (g || pt(a)) for (let n = 0; n < d; n++) {
			let o = a.values[n];
			if (o == null) continue;
			let u = l.get(n), d = zt(a, u, "circle", g);
			d !== "none" && ra(e, t, a, u, n, $e(n), c(o), d, u?.markerSize ?? a.markerSize ?? 5, Vn(a, u, n, s), u?.markerLine ?? a.markerLine ?? null, r, (u?.markerLineWidthEmu ?? a.markerLineWidthEmu) == null ? void 0 : lt(u?.markerLineWidthEmu ?? a.markerLineWidthEmu, r), Qn(a, u, n), i);
		}
		ua(e, a, s, $e, c, r, void 0, {
			chart: t,
			chartRect: n,
			plotRect: {
				x: U,
				y: He,
				w: W,
				h: G
			},
			shapeRotationDeg: i
		});
	}
	if (t.stockUpDownBars && M && N) {
		let n = t.stockUpDownBarStyle ?? {
			gapWidthPercent: 150,
			up: {},
			down: {}
		}, a = {
			...n,
			up: Ot(t, n.up, "upBar", t.stockAutomaticStyle ?? void 0),
			down: Ot(t, n.down, "downBar", t.stockAutomaticStyle ?? void 0)
		}, o = Ge ? (Ge.categoryBandFractions[0] ?? 0) * W : Ze ? W / d : d > 1 ? W / (d - 1) : W;
		Mo(e, (e) => M.values[e] ?? null, (e) => N.values[e] ?? null, d, $e, Xe(M), Xe(N), o, a, r, void 0, i);
	}
	Y(j, x, "left"), (D?.markerSymbol != null || D && pt(D)) && Y(D, C, "both"), (O?.markerSymbol != null || O && pt(O)) && Y(O, T, "both"), Y(A, E, "right");
	for (let n of v) {
		let r = rr(y.get(n) ?? 0, n);
		for (let i of n.errBars ?? []) $a(e, n, Lt(t, i), d, $e, Xe(n), (e) => n.values[e] ?? 0, r);
	}
	if (g.length < 3) for (let e = 0; e < g.length; e++) Y(g[e], e, "both");
	for (let a of v) {
		let o = y.get(a) ?? 0;
		to(e, a, u, !0, $e, Xe(a), G, r, t.date1904, Yn(t, t.dataLabelFontFace, "minor"), t.dataLabelPosition ?? "r", {
			x: U,
			y: He,
			w: W,
			h: G
		}, n, (e) => Yn(t, e, "minor"), F(a) ? P?.displayUnits : t.valAxisDisplayUnits, (e) => m(o, e), (e) => eo(t, e, F(a) ? De?.max ?? Ke.max : Ke.max), i);
	}
	if (!t.catAxisHidden) {
		let n = Math.max(1, Math.floor(t.catAxisTickLabelSkip ?? 1)), i = t.catAxisFontColor ? `#${t.catAxisFontColor}` : "#555";
		e.fillStyle = i, e.textAlign = "center", e.textBaseline = "top", e.font = bt(ue, Yn(t, t.catAxisFontFace, "minor"), t.catAxisFontBold ?? !1, t.catAxisFontItalic ?? !1);
		let a = Ge ? (Ge.categoryBandFractions[0] ?? 0) * W - 4 : W / d * n - 4, o = !ve && re(t), s = q(t), c = Ge && Ge.majorTicks.length > 0 ? Ge.majorTicks.map((e) => ({
			label: mr(String(e.serial), t.catAxisFormatCode, t.date1904, t.catAxisFormatDivisors),
			x: U + e.fraction * W,
			categoryIndex: -1
		})) : Array.from({ length: Math.ceil(d / n) }, (e, r) => {
			let i = r * n;
			return {
				label: mr((u[i] ?? "").toString(), t.catAxisFormatCode, t.date1904, t.catAxisFormatDivisors),
				x: $e(i),
				categoryIndex: i
			};
		});
		for (let n of c) {
			let c = n.categoryIndex < 0 ? null : ze(n.categoryIndex, d, Pe(t), qe(t), t.catAxisLabelAlignment), l = c ? U + c.fraction * W : n.x;
			if (le(e, t.catAxisMajorTickMark, "cat", He + G, l, et.color, et.width, !1, t.catAxisLineHidden, "major", r, t.catAxisLineDash), !o) continue;
			e.textAlign = c?.textAlign ?? "center", e.fillStyle = i;
			let u = n.label, f = s === 0 ? a : G * .4;
			Me(e, u, l, He + G + w(5, t.catAxisLabelOffsetPercent), s, Rt(ue), f);
		}
		if (t.catAxisMinorTickMark && t.catAxisMinorTickMark !== "none" && Ge) for (let n of Ge.minorTicks) le(e, t.catAxisMinorTickMark, "cat", He + G, U + n.fraction * W, void 0, void 0, !1, t.catAxisLineHidden, "minor", r, t.catAxisLineDash);
	}
	if (P && De) {
		let i = t.valAxisFontColor ? `#${t.valAxisFontColor}` : "#555";
		xe(e, t, P, De, K, n, U, He, W, G, r, Ae, je, i, t.date1904);
	}
	We && Ya(e, t, We, U, He + G + ye, Ue, a + ce, r), Ra(e, t, L, a, o, s, c, U, He, W, G, ae + 2, r), nt(e, t, a, o, s, c, U, He, W, G, ce, z, pe, me);
}
var Wo = (e) => e[0] + e[2] > e[1] + e[3] ? [[
	0,
	1,
	2
], [
	0,
	2,
	3
]] : [[
	0,
	1,
	3
], [
	1,
	2,
	3
]], Go = 2e5, Ko = 1.25;
function qo(e, t, n) {
	if (e.length === 0) return [];
	let r = [], i = (e) => n ? e.value >= t : e.value <= t, a = e[e.length - 1], o = i(a);
	for (let n of e) {
		let e = i(n);
		if (e !== o) {
			let e = n.value - a.value, i = e === 0 ? 0 : (t - a.value) / e;
			r.push({
				x: a.x + (n.x - a.x) * i,
				y: a.y + (n.y - a.y) * i,
				depth: a.depth + (n.depth - a.depth) * i,
				value: t
			});
		}
		e && r.push(n), a = n, o = e;
	}
	return r;
}
function Jo(e, t, n, i, a = 0) {
	let { x: s, y: c, w: u, h: d } = n, f = ee(t), p = t.series, m = f.length, h = p.length;
	if (m < 2 || h < 2) return;
	let g = Infinity, _ = -Infinity;
	for (let e of p) for (let t = 0; t < m; t++) {
		let n = e.values[t];
		n == null || !Number.isFinite(n) || (g = Math.min(g, n), _ = Math.max(_, n));
	}
	if (!Number.isFinite(g) || !Number.isFinite(_)) return;
	t.valMin != null && (g = t.valMin), t.valMax != null && (_ = t.valMax);
	let v = {
		...t.threeD ?? {},
		rotationX: t.threeD?.rotationX ?? 15,
		rotationY: t.threeD?.rotationY ?? 20,
		rightAngleAxes: t.threeD?.rightAngleAxes ?? !1,
		perspective: t.threeD?.perspective ?? 30
	}, b = wr(v), x = Sr(v), S = Cr(v, n, {
		sceneDepthScale: Ko,
		perspectiveTangentGain: x
	}), C;
	if (S) {
		let e = S.topology.axisX === "min" ? S.front.x : S.front.x + S.front.w, t = S.project(e, S.front.y + S.front.h, S.topology.nearDepth), n = S.project(e, S.front.y, S.topology.nearDepth);
		C = Math.hypot(n.x - t.x, n.y - t.y) / i;
	}
	let T = t.valAxisMajorUnit == null ? en(g, _, C) : null, E = pn(T == null ? t : {
		...t,
		valAxisMajorUnit: T
	}, g, _, C), D = E.step;
	if (!(D > 0) || !Number.isFinite(D)) return;
	let O = t.valMin ?? E.min, k = t.valMax ?? Math.max(O + D, O + Math.ceil((_ - O) / D) * D), A = k - O;
	if (!(A > 0) || !Number.isFinite(A)) return;
	let j = Math.ceil(A / D), M = Math.floor(A / D + 1e-9) + 1, N = (m - 1) * (h - 1) * 2;
	if (!Number.isSafeInteger(j) || !Number.isSafeInteger(M) || j < 1 || M < 2 || N < 1 || j > 512 || M > 512 || j > Math.floor(Go / N) || M > Go) return;
	let P = j, te = gt(t) ? (e) => 1 - (e - O) / A : (e) => (e - O) / A, ne = Array.from({ length: M }, (e, t) => O + t * D), I = (e, t) => {
		let n = Math.min(e, t), r = Math.max(e, t), i = Math.max(1, Math.floor((n - O) / D) + 1), a = Math.min(P - 1, Math.ceil((r - O) / D) - 1), o = [0];
		if (e !== t) for (let n = i; n <= a; n++) o.push((O + n * D - e) / (t - e));
		return o.push(1), o.sort((e, t) => e - t), o;
	}, re = Array.from({ length: P }, (e, n) => t.themeAccentColors?.[n % 6] ? `#${t.themeAccentColors[n % 6]}` : p[n]?.color ? `#${p[n].color}` : rr(n, p[n])), ie = new Map((t.surfaceBandFormats ?? []).map((e) => [e.idx, e])), L = t.linkedChartStyleRoles?.dataPoint3D ?? (t.classicChartStyleRoles == null ? t.chartStyleRoles?.dataPoint3D : void 0), oe = P <= 48 ? t.classicSurfaceBandStyles?.byBandCount?.[P - 1] ?? t.classicSurfaceBandStyles?.fixed : void 0, se = ct(oe, L), ce = t.linkedChartStyleRoles?.dataPointWireframe ?? (t.classicChartStyleRoles == null ? t.chartStyleRoles?.dataPointWireframe : void 0), z = ct(oe, ce), le = (e) => e?.lineNoStyle !== !0 && (e?.linePaintAuthored === !0 || e?.lineHidden === !0 || (e?.lineColors?.length ?? 0) > 0 || (e?.linePaints?.length ?? 0) > 0), B = t.surfaceWireframe === !0 ? [] : Array.from({ length: P }, (e, t) => {
		let n = ie.get(t), r, i = !0;
		if (n?.fillHidden === !0) r = R(L), r !== void 0 && (i = !1);
		else if (n?.fill) r = n.fill, i = !1;
		else {
			let e = Ae(n?.style, L, t);
			e === void 0 ? r = tr(L, t) : (r = e, i = !1);
		}
		return r === void 0 && n?.fillHidden === !0 && (r = tr(L, t)), r === void 0 && (r = tr(oe, t)), {
			recipe: r,
			fromRole: i
		};
	}), ue = B.map((e) => e.recipe), de = t.surfaceWireframe === !0 ? [] : Array.from({ length: P }, (e, t) => {
		let n = ie.get(t), r;
		return r = n?.lineHidden === !0 ? ge(L) : n?.lineColor ? {
			fillType: "solid",
			color: n.lineColor
		} : y(L, L, t, n?.style), r === void 0 && n?.lineHidden === !0 && (r = Je(L, t)), r === void 0 && (r = Je(oe, t)), r;
	}), pe = (e, t) => {
		let n = e, r = n?.lineDashAuthored === !0 || n?.lineDash != null || n?.lineCustomDash != null;
		return {
			lineWidthEmu: n?.lineWidthEmu ?? t.lineWidthEmu,
			lineDash: r ? n?.lineDash : t.lineDash,
			lineCustomDash: r ? n?.lineCustomDash : t.lineCustomDash,
			lineCap: n?.lineCap ?? t.lineCap,
			lineJoin: n?.lineJoin ?? t.lineJoin,
			lineCompound: n?.lineCompound ?? t.lineCompound
		};
	}, me = z?.lineColorIndex, he;
	he = le(z) ? z?.lineHidden === !0 ? Je(z, 0) : me == null ? void 0 : me == null ? null : Je(z, me) : void 0;
	let _e = me == null && le(z) && z?.lineHidden !== !0 ? Array.from({ length: P }, (e, t) => Je(z, t)) : [], ve = z == null ? {
		paint: void 0,
		lineWidthEmu: void 0,
		lineDash: void 0,
		lineCustomDash: void 0,
		lineCap: void 0,
		lineJoin: void 0,
		lineCompound: void 0
	} : {
		paint: he,
		lineWidthEmu: z?.lineWidthEmu,
		lineDash: z?.lineDash,
		lineCustomDash: z?.lineCustomDash,
		lineCap: z?.lineCap,
		lineJoin: z?.lineJoin,
		lineCompound: z?.lineCompound
	}, ye = p[0], V;
	V = ye?.lineHidden === !0 ? ge(ce) : ye?.lineColor == null ? F(ye?.chartexStyle, ce, 0) : {
		fillType: "solid",
		color: ye.lineColor
	};
	let be = pe(ye?.chartexStyle, ve), H = {
		paint: V === void 0 ? he : V,
		...be,
		lineWidthEmu: ye?.lineWidthEmu ?? be.lineWidthEmu
	};
	H.lineCompound != null && H.lineCompound !== "sng" && (H.paint = null);
	let xe = Array.from({ length: P }, (e, t) => {
		let n = ie.get(t);
		if (n) return n.lineHidden === !0 ? ge(ce) : n.lineColor == null ? F(n.style, ce, t) : {
			fillType: "solid",
			color: n.lineColor
		};
	}), Se = xe.map((e, t) => {
		let n = ie.get(t), r = pe(n?.style, H), i = V === void 0 ? _e[t] ?? H.paint : V, a = {
			paint: e === void 0 ? i : e,
			...r,
			lineWidthEmu: n?.lineWidthEmu ?? r.lineWidthEmu
		};
		return a.lineCompound != null && a.lineCompound !== "sng" && (a.paint = null), a;
	}), Ce = (e, t) => e.paint !== void 0 && e.paint === t.paint && e.lineWidthEmu === t.lineWidthEmu && e.lineDash === t.lineDash && e.lineCustomDash === t.lineCustomDash && e.lineCap === t.lineCap && e.lineJoin === t.lineJoin && e.lineCompound === t.lineCompound, we = (e, t) => {
		let n = I(e, t), r = [];
		for (let i = 0; i < n.length - 1; i++) {
			let a = n[i], o = n[i + 1], s = e + (t - e) * ((a + o) / 2), c = Math.max(0, Math.min(P - 1, Math.floor((s - O) / D))), l = r[r.length - 1];
			l && xe[l.band] === void 0 && xe[c] === void 0 && Ce(Se[l.band], Se[c]) ? l.to = o : r.push({
				from: a,
				to: o,
				band: c
			});
		}
		return r;
	};
	if (t.surfaceWireframe === !0) {
		let e = 0, t = (t, n) => t == null || n == null || !Number.isFinite(t) || !Number.isFinite(n) ? !0 : (e += we(t, n).length, e <= Go);
		for (let e = 0; e < h; e++) for (let n = 0; n < m - 1; n++) if (!t(p[e].values[n], p[e].values[n + 1])) return;
		for (let e = 0; e < m; e++) for (let n = 0; n < h - 1; n++) if (!t(p[n].values[e], p[n + 1].values[e])) return;
		for (let t = 0; t < h - 1; t++) for (let n = 0; n < m - 1; n++) {
			let r = [
				p[t].values[n],
				p[t].values[n + 1],
				p[t + 1].values[n + 1],
				p[t + 1].values[n]
			];
			if (r.some((e) => e == null || !Number.isFinite(e))) continue;
			let i = r;
			for (let t of Wo(i)) {
				let n = Math.min(...t.map((e) => i[e])), r = Math.max(...t.map((e) => i[e])), a = Math.max(1, Math.floor((n - O) / D) + 1), o = Math.min(P - 1, Math.ceil((r - O) / D) - 1);
				if (!(o < a) && (e += o - a + 1, e > Go)) return;
			}
		}
	}
	let Te = xe.some((e) => e === void 0) && (V !== void 0 || _e.length === 0), Ee = [
		{
			surface: t.threeD?.floor,
			role: "floor"
		},
		{
			surface: t.threeD?.sideWall,
			role: "wall"
		},
		{
			surface: t.threeD?.backWall,
			role: "wall"
		}
	].map(({ surface: e, role: n }) => ae(t, e, n)), De = 0;
	for (let e of [
		...ue,
		...de,
		...t.surfaceWireframe === !0 && Te ? [H.paint] : [],
		...t.surfaceWireframe === !0 ? _e : [],
		...t.surfaceWireframe === !0 ? xe.filter((e) => e !== void 0) : [],
		...Ee.flatMap((e) => [e.fill, e.line])
	]) {
		if (e == null) continue;
		let t = yt(e);
		if (e.fillType === "gradient" && t > Ti || t > Ei - De) return;
		De += t;
	}
	let Oe = Array.from({ length: P }, (e, t) => {
		let n = O + t * D, r = Math.min(k, n + D);
		return `${fr(n)}-${fr(r)}`;
	}), ke = {
		...t,
		series: Oe.map((e, t) => {
			let n = ue[t], r = de[t];
			return {
				name: e,
				color: n === null ? "00000000" : n?.fillType === "solid" ? n.color.replace(/^#/, "") : re[t].replace(/^#/, ""),
				...r?.fillType === "solid" ? { lineColor: r.color.replace(/^#/, "") } : r === null ? { lineHidden: !0 } : {},
				values: []
			};
		})
	}, je = [...ue];
	Math.abs(v.rotationX) === 90 && (ke.series.reverse(), je.reverse());
	let Me = Fa(e, ke, u, d, i), { legRightW: Ne, legLeftW: Ie, legTopH: Le, legBottomH: Re } = Dn(Me, t.legendOverlay === !0), Be = ko(e, t, u, d, i), Ve = Fe(t.catAxisFontSizeHpt, d, i), U = t.threeD?.seriesAxis, W = hn(U?.fontSizeHpt, i) ?? Ve, { px0: G, py0: We, pw: Ge, ph: Ke } = xt(t, s, c, u, d, i, {
		titleBand: Be,
		legendReserve: Me,
		pad: {
			t: Be.bandH + Le + W / 2,
			r: Ne + W * 3.2 + 12,
			b: At(Ve, t.catAxisLabelOffsetPercent) + Re,
			l: Ie + Ve * 1.5
		},
		honorPlotAreaManualLayout: !0
	}).plotRect;
	if (!(Ge > 0) || !(Ke > 0)) return;
	jo(e, t, t.titleManualLayout || !t.titleRichRuns?.length ? s : G, c, t.titleManualLayout || !t.titleRichRuns?.length ? u : Ge, d, c + Be.topPad, Be.fontPx), Mn(e, t, G, We, Ge, Ke, i, a);
	let K = Cr(v, {
		x: G,
		y: We,
		w: Ge,
		h: Ke
	}, {
		sceneDepthScale: Ko,
		perspectiveTangentGain: x
	});
	if (!K) return;
	K = Er(K, t.threeD ?? {}, {
		x: G,
		y: We,
		w: Ge,
		h: Ke
	});
	let Ye = b || Math.abs(v.rotationX) === 90 && v.rotationY === 0 && v.rightAngleAxes === !1 && v.perspective === 0, { front: q } = K, Xe = t.catAxisOrientation === "maxMin", Ze = Pe(t), Qe = (e) => q.x + He(e, m, Ze, Xe) * q.w, $e = U?.orientation === "maxMin", et = (e) => He(e, h, !1, $e), J = (e) => q.y + q.h - te(e) * q.h, Y = [], tt = [], nt = (e, t) => {
		let n = (n) => ({
			x: e.x + (t.x - e.x) * n,
			y: e.y + (t.y - e.y) * n,
			depth: e.depth + (t.depth - e.depth) * n,
			value: e.value + (t.value - e.value) * n
		});
		for (let r of we(e.value, t.value)) {
			let e = n(r.from), t = n(r.to);
			tt.push({
				points: [K.project(e.x, e.y, e.depth), K.project(t.x, t.y, t.depth)],
				band: r.band
			});
		}
	}, rt = (e) => {
		let t = Math.min(...e.map((e) => e.value)), n = Math.max(...e.map((e) => e.value)), r = Math.max(1, Math.floor((t - O) / D) + 1), i = Math.min(P - 1, Math.ceil((n - O) / D) - 1);
		for (let t = r; t <= i; t++) {
			let n = O + t * D, r = [], i = (e) => {
				r.some((t) => Math.abs(t.x - e.x) < 1e-9 && Math.abs(t.y - e.y) < 1e-9 && Math.abs(t.depth - e.depth) < 1e-9) || r.push(e);
			};
			for (let t = 0; t < e.length; t++) {
				let r = e[t], a = e[(t + 1) % e.length];
				if (r.value === n && i(r), r.value < n && a.value > n || r.value > n && a.value < n) {
					let e = (n - r.value) / (a.value - r.value);
					i({
						x: r.x + (a.x - r.x) * e,
						y: r.y + (a.y - r.y) * e,
						depth: r.depth + (a.depth - r.depth) * e,
						value: n
					});
				}
			}
			r.length === 2 && tt.push({
				points: [K.project(r[0].x, r[0].y, r[0].depth), K.project(r[1].x, r[1].y, r[1].depth)],
				band: t - 1
			});
		}
	}, it = (e) => {
		if (t.surfaceWireframe === !0) {
			rt(e);
			return;
		}
		let n = Math.min(...e.map((e) => e.value)), r = Math.max(...e.map((e) => e.value)), i = Math.max(0, Math.floor((n - O) / D)), a = Math.min(P - 1, Math.floor((r - O) / D));
		for (let t = i; t <= a; t++) {
			let n = O + t * D, r = t === P - 1 ? k : n + D, i = qo(e, n, !0);
			if (i = qo(i, r, !1), i.length < 3) continue;
			let a = i.map((e) => K.project(e.x, e.y, e.depth));
			Y.push({
				points: a,
				scenePoints: i,
				band: t,
				depth: i.reduce((e, t) => e + K.cameraDepth(t.x, t.y, t.depth), 0) / i.length
			});
		}
	};
	e.save(), e.beginPath(), e.rect(G, We, Ge, Ke), e.clip();
	let at = (t, n, i, a, o = !1) => {
		if (t.length < 2) return;
		let s = o ? t.map((e) => K.projectUnbounded(e.x, e.y, e.depth)) : t.map((e) => K.project(e.x, e.y, e.depth));
		e.beginPath(), e.moveTo(s[0].x, s[0].y);
		for (let t = 1; t < s.length; t++) e.lineTo(s[t].x, s[t].y);
		e.strokeStyle = n, e.lineWidth = i, e.setLineDash(r(a ?? "solid", i)), e.stroke();
	}, ot = K.topology.farDepth, st = K.topology.nearDepth, ut = q.y + q.h, ft = q.y, pt = K.topology.farX === "min" ? q.x : q.x + q.w, mt = [
		"floor",
		"sideWall",
		"backWall"
	].map((e) => {
		let n = t.threeD?.[e];
		return br(K, e, n?.thicknessPercent);
	}), ht = [
		"floor",
		"sideWall",
		"backWall"
	], _t = (e, t, n, r, i, a) => {
		let o = mt[e], s = ht[e];
		for (let e of Dr(o, s, t, n)) o.thickness > 0 && !K.cameraFacing(o.faces[e.faceIndex]) || at(e.scenePoints, r, i, a, !0);
	}, vt = (e, t, n, r) => {
		for (let i of e) {
			let e = te(i);
			_t(1, "y", e, t, n, r), _t(2, "y", e, t, n, r);
		}
	}, St = (e, t, n, r) => {
		for (let i of e) _t(0, "x", i, t, n, r), _t(2, "x", i, t, n, r);
	}, Ct = mt.some((e) => e.thickness > 0) ? mt.map((e) => e.faces.filter((t) => e.thickness === 0 || K.cameraFacing(t)).map((e) => e.map((e) => K.projectUnbounded(e.x, e.y, e.depth)))) : [
		[
			K.project(q.x, ut, st),
			K.project(q.x + q.w, ut, st),
			K.project(q.x + q.w, ut, ot),
			K.project(q.x, ut, ot)
		],
		[
			K.project(pt, ut, st),
			K.project(pt, ut, ot),
			K.project(pt, ft, ot),
			K.project(pt, ft, st)
		],
		[
			K.project(q.x, ut, ot),
			K.project(q.x + q.w, ut, ot),
			K.project(q.x + q.w, ft, ot),
			K.project(q.x, ft, ot)
		]
	].map((e) => [e]);
	for (let n = 0; n < Ct.length; n++) {
		let r = Ct[n];
		if (!r.length) continue;
		let a = r.flat(), s = Ee[n], c = s.fill?.fillType === "image" ? s.fill : null;
		if (c) {
			let r = Or(mt[n], i), a = tn(c, r ? dn(c, r.widthPt, r.heightPt) : void 0), o = t.threeD?.[ht[n]];
			a && Tr(e, c, a, o, ht[n], mt[n], mt[n].faces.map((e, t) => ({
				face: e,
				faceIndex: t
			})).filter(({ face: e }) => mt[n].thickness === 0 || K.cameraFacing(e)).map(({ faceIndex: e }) => e), (e) => K.projectUnbounded(e.x, e.y, e.depth), A, (e, t) => tn(c, dn(c, e, t)), i);
		}
		let l = Math.min(...a.map((e) => e.x)), u = Math.max(...a.map((e) => e.x)), d = Math.min(...a.map((e) => e.y)), f = Math.max(...a.map((e) => e.y)), p = c ? null : s.fill?.fillType === "solid" ? `#${s.fill.color}` : s.fill ? cr(s.fill, e, l, d, u - l, f - d) : null, m = s.line?.fillType === "solid" ? `#${s.line.color}` : s.line ? cr(s.line, e, l, d, u - l, f - d) : null, h = s.lineWidthEmu == null ? 1 : lt(s.lineWidthEmu, i);
		for (let t of r) {
			e.beginPath(), e.moveTo(t[0].x, t[0].y);
			for (let n = 1; n < t.length; n++) e.lineTo(t[n].x, t[n].y);
			e.closePath(), p && (e.fillStyle = p, e.fill()), m && (e.strokeStyle = m, e.lineWidth = h, e.setLineDash(o(s.lineCustomDash, s.lineDash, h)), e.lineCap = s.lineCap === "rnd" ? "round" : s.lineCap === "sq" ? "square" : "butt", e.lineJoin = s.lineJoin === "round" || s.lineJoin === "bevel" ? s.lineJoin : "miter", e.stroke());
		}
	}
	if (t.valAxisMinorGridlines === !0) {
		let e = jn(t, i);
		vt(E.minorLines.filter((e) => e >= O && e <= k), e.color, e.width, t.valAxisMinorGridlineDash);
	}
	if (l(t)) {
		let e = jt(t.valAxisGridlineColor, t.valAxisGridlineWidthEmu, i);
		if (t.valAxisMajorGridlines === !0) vt(ne, e.color, e.width, t.valAxisGridlineDash);
		else for (let n of ne) {
			let r = te(n), i = J(n);
			mt[2].thickness > 0 ? _t(2, "y", r, e.color, e.width, t.valAxisGridlineDash) : at([{
				x: q.x,
				y: i,
				depth: ot
			}, {
				x: q.x + q.w,
				y: i,
				depth: ot
			}], e.color, e.width, t.valAxisGridlineDash), mt[1].thickness > 0 ? _t(1, "y", r, e.color, e.width, t.valAxisGridlineDash) : at([{
				x: pt,
				y: i,
				depth: st
			}, {
				x: pt,
				y: i,
				depth: ot
			}], e.color, e.width, t.valAxisGridlineDash);
		}
	}
	if (t.catAxisMinorGridlines === !0) {
		let e = fe(t, i);
		St(Wn(m, Ze), e.color, e.width, t.catAxisMinorGridlineDash);
	}
	if (t.catAxisMajorGridlines) {
		let e = jt(t.catAxisGridlineColor, t.catAxisGridlineWidthEmu, i);
		St(Ue(t, m), e.color, e.width, t.catAxisGridlineDash);
	}
	for (let e = 0; e < h - 1; e++) for (let t = 0; t < m - 1; t++) {
		let n = [
			p[e].values[t],
			p[e].values[t + 1],
			p[e + 1].values[t + 1],
			p[e + 1].values[t]
		];
		if (n.some((e) => e == null || !Number.isFinite(e))) continue;
		let r = [
			{
				x: Qe(t),
				y: J(n[0]),
				depth: et(e),
				value: n[0]
			},
			{
				x: Qe(t + 1),
				y: J(n[1]),
				depth: et(e),
				value: n[1]
			},
			{
				x: Qe(t + 1),
				y: J(n[2]),
				depth: et(e + 1),
				value: n[2]
			},
			{
				x: Qe(t),
				y: J(n[3]),
				depth: et(e + 1),
				value: n[3]
			}
		];
		for (let e of Wo(n)) it(e.map((e) => r[e]));
	}
	if (t.surfaceWireframe === !0) {
		for (let e = 0; e < h; e++) for (let t = 0; t < m - 1; t++) {
			let n = p[e].values[t], r = p[e].values[t + 1];
			n == null || r == null || !Number.isFinite(n) || !Number.isFinite(r) || nt({
				x: Qe(t),
				y: J(n),
				depth: et(e),
				value: n
			}, {
				x: Qe(t + 1),
				y: J(r),
				depth: et(e),
				value: r
			});
		}
		for (let e = 0; e < m; e++) for (let t = 0; t < h - 1; t++) {
			let n = p[t].values[e], r = p[t + 1].values[e];
			n == null || r == null || !Number.isFinite(n) || !Number.isFinite(r) || nt({
				x: Qe(e),
				y: J(n),
				depth: et(t),
				value: n
			}, {
				x: Qe(e),
				y: J(r),
				depth: et(t + 1),
				value: r
			});
		}
	}
	Y.sort((e, t) => e.depth - t.depth);
	let wt = Array.from({ length: P }, () => ({
		minX: Infinity,
		minY: Infinity,
		maxX: -Infinity,
		maxY: -Infinity
	})), Tt = Array.from({ length: P }, () => []);
	for (let e of Y) {
		Tt[e.band].push(e);
		let t = wt[e.band];
		for (let n of e.points) t.minX = Math.min(t.minX, n.x), t.minY = Math.min(t.minY, n.y), t.maxX = Math.max(t.maxX, n.x), t.maxY = Math.max(t.maxY, n.y);
	}
	for (let e of tt) {
		let t = wt[e.band];
		for (let n of e.points) t.minX = Math.min(t.minX, n.x), t.minY = Math.min(t.minY, n.y), t.maxX = Math.max(t.maxX, n.x), t.maxY = Math.max(t.maxY, n.y);
	}
	let Et = (t, n) => {
		if (t == null) return t;
		if (t.fillType === "solid") return `#${t.color}`;
		let r = wt[n];
		return !Number.isFinite(r.minX) || !Number.isFinite(r.minY) || !Number.isFinite(r.maxX) || !Number.isFinite(r.maxY) ? null : cr(t, e, r.minX, r.minY, r.maxX - r.minX, r.maxY - r.minY);
	}, Dt = ue.map(Et), Ot = de.map(Et);
	for (let t = 0; t < P; t++) {
		if (Dt[t] === null) continue;
		let n = Tt[t].filter((e) => e.points.length >= 3);
		n.length && Qt(e, ie.get(t)?.style, se, 0, i, (e) => {
			e.beginPath();
			for (let t of n) {
				e.moveTo(t.points[0].x, t.points[0].y);
				for (let n = 1; n < t.points.length; n++) e.lineTo(t.points[n].x, t.points[n].y);
				e.closePath();
			}
			e.fillStyle = "#000000", e.fill();
		}, t);
	}
	for (let t of Y) {
		let n = ie.get(t.band);
		e.beginPath(), e.moveTo(t.points[0].x, t.points[0].y);
		for (let n = 1; n < t.points.length; n++) e.lineTo(t.points[n].x, t.points[n].y);
		e.closePath();
		let r = Dt[t.band];
		if (r !== null) {
			let n = Ye ? xr(K.cameraNormal(t.scenePoints)) : 1;
			e.fillStyle = typeof r == "string" && B[t.band]?.fromRole ? kr(r, n) : r ?? kr(re[t.band], n), e.fill();
		}
		let a = Ot[t.band];
		if (a != null) {
			let t = n?.style, r = L, s = oe;
			e.strokeStyle = a;
			let c = n?.lineWidthEmu ?? t?.lineWidthEmu ?? r?.lineWidthEmu ?? s?.lineWidthEmu;
			e.lineWidth = c == null ? 1 : lt(c, i), e.setLineDash(o(t?.lineCustomDash ?? r?.lineCustomDash ?? s?.lineCustomDash, t?.lineDash ?? r?.lineDash ?? s?.lineDash, e.lineWidth));
			let l = t?.lineCap ?? r?.lineCap ?? s?.lineCap, u = t?.lineJoin ?? r?.lineJoin ?? s?.lineJoin;
			e.lineCap = l === "rnd" ? "round" : l === "sq" ? "square" : "butt", e.lineJoin = u === "round" || u === "bevel" ? u : "miter", e.stroke();
		}
	}
	if (t.surfaceWireframe === !0) {
		let t = Te ? H.paint?.fillType === "solid" ? `#${H.paint.color}` : H.paint ? cr(H.paint, e, G, We, Ge, Ke) : H.paint : void 0, n = xe.map((e, n) => e === void 0 ? V !== void 0 || _e.length === 0 ? t : Et(_e[n], n) : Et(e, n));
		for (let t of tt) {
			let r = Se[t.band], a = n[t.band];
			if (a === null) continue;
			e.beginPath(), e.moveTo(t.points[0].x, t.points[0].y), e.lineTo(t.points[1].x, t.points[1].y), e.strokeStyle = a ?? re[t.band], e.lineWidth = r.lineWidthEmu == null ? Math.max(1, .75 * i) : lt(r.lineWidthEmu, i), e.setLineDash(o(r.lineCustomDash, r.lineDash, e.lineWidth));
			let s = r.lineCap, c = r.lineJoin;
			e.lineCap = s === "rnd" ? "round" : s === "sq" ? "square" : "butt", e.lineJoin = c === "round" || c === "bevel" ? c : "miter", e.stroke();
		}
	}
	e.restore();
	let kt = K.project(q.x + q.w / 2, q.y + q.h / 2, .5), Mt = (t, n, r, a, o, s, c, l, u) => {
		if (c || t == null || t === "none") return;
		let d = a.x - r.x, f = a.y - r.y, p = Math.hypot(d, f);
		if (!(p > 1e-6)) return;
		let m = -f / p, h = d / p, g = (r.x + a.x) / 2, _ = (r.y + a.y) / 2;
		(g - kt.x) * m + (_ - kt.y) * h < 0 && (m = -m, h = -h);
		let v = er(l, s, i), y = t === "cross" ? v / 2 : v, b = t === "out" || t === "cross" ? y : 0, x = t === "in" || t === "cross" ? y : 0;
		On(e, n.x + m * b, n.y + h * b, n.x - m * x, n.y - h * x, o, s, u);
	}, Nt = K.project(q.x, ut, st), Pt = K.project(q.x + q.w, ut, st), Ft = t.catAxisLineWidthEmu == null ? 1 : lt(t.catAxisLineWidthEmu, i);
	On(e, Nt.x, Nt.y, Pt.x, Pt.y, t.catAxisLineColor ? `#${t.catAxisLineColor}` : "#000000", Ft, t.catAxisLineDash);
	let It = t.catAxisLineColor ? `#${t.catAxisLineColor}` : "#000000", Lt = t.catAxisHidden || t.catAxisLineHidden === !0, zt = Math.max(1, Math.floor(t.catAxisTickMarkSkip ?? 1));
	for (let e = 0; e < m; e += zt) Mt(t.catAxisMajorTickMark, K.project(Qe(e), ut, st), Nt, Pt, It, Ft, Lt, "major", t.catAxisLineDash);
	if (t.catAxisMinorTickMark != null && t.catAxisMinorTickMark !== "none") for (let e = 0; e < m - 1; e++) {
		let n = (He(e, m, Ze, Xe) + He(e + 1, m, Ze, Xe)) / 2;
		Mt(t.catAxisMinorTickMark, K.project(q.x + n * q.w, ut, st), Nt, Pt, It, Ft, Lt, "minor", t.catAxisLineDash);
	}
	e.font = bt(Ve, Yn(t, t.catAxisFontFace, "minor"), t.catAxisFontBold ?? !1, t.catAxisFontItalic ?? !1), e.fillStyle = t.catAxisFontColor ? `#${t.catAxisFontColor}` : "#000000", e.textBaseline = "top";
	for (let n = 0; n < m; n++) {
		let r = ze(n, m, Pe(t), qe(t), t.catAxisLabelAlignment), i = K.project(q.x + r.fraction * q.w, ut, st);
		e.textAlign = r.textAlign, dt(e, f[n] ?? "", i.x, i.y + w(8, t.catAxisLabelOffsetPercent), Rt(Ve));
	}
	if (!U?.hidden) {
		let n = U?.lineWidthEmu == null ? 1 : lt(U.lineWidthEmu, i), r = K.project(q.x, ut, .5), a = K.project(q.x + q.w, ut, .5), o = r.x >= a.x ? q.x : q.x + q.w, s = K.project(o, ut, st), c = K.project(o, ut, ot);
		On(e, s.x, s.y, c.x, c.y, U?.lineColor ? `#${U.lineColor}` : "#000000", n, U?.lineDash);
		let l = U?.lineColor ? `#${U.lineColor}` : "#000000", u = Math.max(1, Math.floor(U?.tickMarkSkip ?? 1));
		for (let e = 0; e < h; e += u) Mt(U?.majorTickMark, K.project(o, ut, et(e)), s, c, l, n, U?.lineHidden === !0, "major", U?.lineDash);
		if (U?.minorTickMark != null && U.minorTickMark !== "none") for (let e = 0; e < h - 1; e++) Mt(U.minorTickMark, K.project(o, ut, (et(e) + et(e + 1)) / 2), s, c, l, n, U.lineHidden === !0, "minor", U.lineDash);
		e.font = bt(W, Yn(t, U?.fontFace, "minor"), U?.fontBold ?? !1, U?.fontItalic ?? !1), e.fillStyle = U?.fontColor ? `#${U.fontColor}` : "#000000", e.textAlign = "left", e.textBaseline = "middle";
		for (let t = 0; t < h; t++) {
			let n = K.project(o, ut, et(t));
			dt(e, p[t].name, n.x + 8, n.y, Rt(W));
		}
	}
	if (!t.valAxisHidden) {
		let n = K.topology.axisX === "min" ? q.x : q.x + q.w, r = K.project(n, q.y + q.h, st), a = K.project(n, q.y, st);
		if (Math.hypot(a.x - r.x, a.y - r.y) > 4) {
			let o = t.valAxisLineWidthEmu == null ? 1 : lt(t.valAxisLineWidthEmu, i);
			On(e, r.x, r.y, a.x, a.y, t.valAxisLineColor ? `#${t.valAxisLineColor}` : "#000000", o, t.valAxisLineDash);
			let s = Fe(t.valAxisFontSizeHpt, d, i);
			e.font = bt(s, Yn(t, t.valAxisFontFace, "minor"), t.valAxisFontBold ?? !1, t.valAxisFontItalic ?? !1), e.fillStyle = t.valAxisFontColor ? `#${t.valAxisFontColor}` : "#000000";
			let c = (r.x + a.x) / 2 < G + Ge / 2;
			e.textAlign = c ? "right" : "left", e.textBaseline = "middle";
			for (let r of ne) {
				let i = K.project(n, J(r), st);
				dt(e, pr(r, t.valAxisFormatCode, t.date1904, t.valAxisFormatDivisors), i.x + (c ? -6 : 6), i.y, Rt(s));
			}
		}
	}
	Ra(e, ke, Me, s, c, u, d, G, We, Ge, Ke, Be.bandH + 2, i, je);
}
function Yo(e, t, n, r, i = 0) {
	let { x: a, y: o, w: s, h: c } = n, u = ee(t), d = u.length;
	if (d === 0) return;
	let m = Sa(t, r), h = t.series.map((e, t) => ({
		series: e,
		chartIndex: t
	})).filter(({ series: e }) => e.seriesType == null || e.seriesType === "area"), g = t.series.map((e, t) => ({
		series: e,
		chartIndex: t
	})).filter(({ series: e }) => e.seriesType === "line");
	if (h.length === 0 && g.length === 0) return;
	let _ = an(t), v = t.chartType === "stackedAreaPct" ? "percentStacked" : t.chartType === "stackedArea" ? "stacked" : "standard", y = t.plotGroups?.filter((e) => e.kind === "area") ?? [{
		kind: "area",
		seriesStart: 0,
		seriesCount: h.length,
		categoryAxis: "primary",
		valueAxis: "primary",
		seriesAxis: "none",
		grouping: v
	}], b = Array(t.series.length).fill(-1);
	for (let e = 0; e < h.length; e++) b[h[e].chartIndex] = e;
	let x = y.map((e) => {
		let n = [], r = Math.min(t.series.length, e.seriesStart + e.seriesCount);
		for (let t = e.seriesStart; t < r; t++) {
			let e = b[t];
			e >= 0 && n.push(e);
		}
		return {
			group: e,
			areaIndices: n
		};
	}), C = Array(h.length).fill(!1), E = Array(h.length).fill(!1), D = Array(h.length).fill(null), O = h.map(() => Array(d).fill(0)), A = h.map(() => Array(d).fill(0)), j = t.plotGroups?.filter((e) => (e.kind === "area" || e.kind === "line") && e.seriesCount > 0) ?? y, M = /* @__PURE__ */ new Map();
	for (let e of j) {
		let t = e.valueAxis;
		M.set(t, (M.get(t) ?? !0) && e.grouping === "percentStacked");
	}
	for (let { group: e, areaIndices: t } of x) {
		let n = e.grouping ?? "standard", r = n === "stacked" || n === "percentStacked", i = n === "percentStacked", a = i && M.get(e.valueAxis) === !0 ? 100 : 1, o = i ? u.map((e, n) => t.reduce((e, t) => e + Math.abs(h[t].series.values[n] ?? 0), 0) || 1) : null;
		for (let e of t) C[e] = r, E[e] = i, D[e] = o;
		for (let e = 0; e < d; e++) {
			let n = 0, s = 0;
			for (let c of t) {
				let t = h[c].series.values[e] ?? 0, l = i && o ? t / o[e] * a : t, u = l >= 0 ? n : s;
				O[c][e] = r ? u : 0, A[c][e] = r ? u + l : l, r && (l >= 0 ? n += l : s += l);
			}
		}
	}
	let N = j.filter((e) => e.valueAxis !== "secondary"), P = N.length > 0 && N.every((e) => e.grouping === "percentStacked"), F = new Map(h.map((e, t) => [e.series, t])), ne = new Map(t.series.map((e, t) => [e, t])), I = (e) => _[ne.get(e) ?? -1]?.valueAxis === "secondary" || t.plotGroups == null && e.useSecondaryAxis === !0, ae = j.filter((e) => e.valueAxis === "secondary"), L = ae.length > 0 && ae.every((e) => e.grouping === "percentStacked"), R = t.secondaryValAxis && t.series.some((e) => I(e)) ? t.secondaryValAxis : null, ce = (e) => R != null && I(e), z = ko(e, t, s, c, r), ue = z.fontPx, de = z.topPad, fe = z.bandH, pe = Fe(t.catAxisFontSizeHpt, c, r), me = Fe(t.valAxisFontSizeHpt, c, r), he = Fa(e, t, s, c, r), { legRightW: ge, legLeftW: _e, legTopH: ve, legBottomH: ye } = Dn(he, t.legendOverlay === !0), V = fn(t, s, c, r), be = V.catFontPx, H = V.valFontPx, Se = V.catBandH, Ce = V.valBandW, we = Ba(t), De = we && Va(t), Oe = Ha(t, pe), Ae = Ka(t, r), je = qa(e, t, r), Me = fe + ve + me / 2 + 2, Ne = (we ? Ae + Oe : At(pe, t.catAxisLabelOffsetPercent)) + Se + ye, Ie = c - Me - Ne, Le = (e, n, r) => po(t, e, S(e, n)) ? ho(fo(e, d, t.dispBlanksAs).map((t) => t.map((t) => e.values[t] ?? 0)), r) : null, Be = [];
	if (R) for (let { series: e, chartIndex: t } of g) {
		if (!ce(e)) continue;
		let n = Le(e, t, R.logBase);
		n && Be.push(...n);
	}
	let Ve = Kt(R, t.series, Ie / r, "y", L, !1, (e) => I(e), (e, t) => {
		let n = F.get(e);
		return n == null ? e.values[t] ?? null : e.values[t] == null ? null : A[n][t] ?? null;
	}, Be), U = Math.max(8, Math.min(11, c / 20)), He = hn(R?.fontSizeHpt, r) ?? U, W = 0;
	if (R && Ve && !R.hidden) {
		let n = e.font;
		e.font = `${He}px ${Yn(t, R.fontFace, "minor")}`;
		let r = 0;
		for (let n of Ve.majorLines) r = Math.max(r, Zn(e, Nt(n, R.formatCode ?? null, t.date1904, R.displayUnits, R.formatDivisors)));
		W = r + 18, e.font = n;
	}
	let G = R && R.title ? se(R, r) : 0, We = (() => {
		let e = Infinity, t = -Infinity;
		for (let n = 0; n < d; n++) {
			for (let r = 0; r < h.length; r++) {
				let { series: i } = h[r];
				ce(i) || i.values[n] == null || (e = Math.min(e, O[r][n], A[r][n]), t = Math.max(t, O[r][n], A[r][n]));
			}
			for (let { series: r } of g) {
				if (ce(r)) continue;
				let i = r.values[n];
				i != null && (e = Math.min(e, i), t = Math.max(t, i));
			}
		}
		return !isFinite(e) || !isFinite(t) ? {
			min: 0,
			max: 1
		} : P ? {
			min: e < 0 ? -100 : 0,
			max: t > 0 ? 100 : 0
		} : {
			min: e,
			max: t
		};
	})();
	if (!P) {
		let e = (e) => {
			We = {
				min: Math.min(We.min, e),
				max: Math.max(We.max, e)
			};
		};
		for (let t = 0; t < h.length; t++) {
			let { series: n } = h[t];
			ce(n) || te(n, "y", (e) => n.values[e] == null ? null : A[t][e], e);
		}
		for (let { series: t } of g) ce(t) || te(t, "y", (e) => t.values[e] ?? null, e);
	}
	let Ge = null;
	for (let { series: e, chartIndex: n } of g) {
		if (ce(e)) continue;
		let r = Le(e, n, t.valAxisLogBase);
		r && (P ? Ge = Ge ? [Math.min(Ge[0], r[0]), Math.max(Ge[1], r[1])] : r : We = {
			min: Math.min(We.min, r[0]),
			max: Math.max(We.max, r[1])
		});
	}
	let Ke = pn(t, We.min, We.max, Ie / r, P, "vertical", Ge), Je = t.valAxisFontSizeHpt == null ? Math.max(8, Math.min(11, Ie / 20)) : me, K = 0;
	if (!t.valAxisHidden && t.plotAreaManualLayout != null && t.plotAreaManualLayout.layoutTarget !== "inner") {
		let n = e.font;
		e.font = bt(Je, Yn(t, t.valAxisFontFace, "minor"), t.valAxisFontBold ?? !1, t.valAxisFontItalic ?? !1);
		for (let n of Ke.majorLines) K = Math.max(K, Zn(e, Pn(t, n, P)));
		e.font = n;
	}
	let q = Math.max(t.valAxisHidden ? 0 : vn(Ke.majorLines.map((e) => Pn(t, e, P)), Rt(Je)), R && Ve && !R.hidden && R.tickLabelPos !== "none" ? vn(Ve.majorLines.map((e) => Nt(e, R.formatCode ?? null, t.date1904, R.displayUnits, R.formatDivisors)), Rt(He)) : 0) / 2, Ze = mt({
		valAxisHidden: t.valAxisHidden,
		catAxisHidden: t.catAxisHidden,
		valLabelWidth: K,
		valLabelFontPx: Je,
		catLabelFontPx: pe,
		valLabelGapPx: t.valAxisFontSizeHpt == null ? 6 : Pt(Je),
		catLabelGapPx: t.catAxisFontSizeHpt == null ? w(3, t.catAxisLabelOffsetPercent) : w(Nn(pe), t.catAxisLabelOffsetPercent),
		outerTextMarginPx: wn * r,
		valTitleBandW: Ce,
		catTitleBandH: Se,
		secondaryBandW: W + G,
		valLabelExtraTopPx: q
	}), Qe = {
		t: Me + q,
		r: ge + s * .05 + W + G,
		b: Ne,
		l: _e + Math.max(s * .12 + Ce, je)
	};
	jo(e, t, a, o, s, c, o + de, ue);
	let $e = xt(t, a, o, s, c, r, {
		titleBand: z,
		legendReserve: he,
		pad: Qe,
		honorPlotAreaManualLayout: !0,
		manualOuterInsets: Ze
	}), { px0: J, py0: Y, pw: tt } = $e.plotRect, { ph: it } = $e.plotRect;
	if (tt <= 0 || it <= 0) return;
	let at = Ua(t, tt, W + G), ot = we ? Ja(e, t, at / d, r) : null;
	ot && ot.totalHeight > Ae && (it = Math.max(1, it - (ot.totalHeight - Ae)));
	let st = p(t, u), ct = Math.max(1, Math.floor(t.catAxisTickLabelSkip ?? 1)), ut = () => st ? st.majorTicks.map((e) => mr(String(e.serial), t.catAxisFormatCode, t.date1904, t.catAxisFormatDivisors)) : Array.from({ length: Math.ceil(d / ct) }, (e, n) => mr((u[n * ct] ?? "").toString(), t.catAxisFormatCode, t.date1904, t.catAxisFormatDivisors));
	if (!De && !t.catAxisHidden && t.catAxisTickLabelPos !== "high") {
		let e = t.catAxisFontSizeHpt == null ? Math.max(8, Math.min(11, tt / d * .8)) : pe, n = t.plotAreaManualLayout?.layoutTarget === "inner" && t.plotAreaManualLayout.w != null && t.plotAreaManualLayout.h != null, r = vn(ut(), Rt(e));
		we && (Oe += r), !n && r > 0 && (it = Math.max(1, it - r));
	}
	Mn(e, t, J, Y, tt, it, r, i);
	let ft = pn(t, We.min, We.max, it / r, P, "vertical", Ge), ht = Pe(t), gt = qe(t), _t = st ? (e) => J + st.positions[e] * tt : ht ? (e) => J + ((gt ? d - 1 - e : e) + .5) / d * tt : (e) => {
		let t = gt ? d - 1 - e : e;
		return J + (d === 1 ? tt / 2 : t / (d - 1) * tt);
	}, vt = (e) => Y + it - ft.frac(e) * it, yt = Ve ? Ve.makeToY(Y, it) : vt, St = (e) => ce(e) ? yt : vt, Ct = vt(Fo(t, ft.min, ft.max)), wt = R && Ve ? yt(Po(t.secondaryCatAxis?.crossesAt, t.secondaryCatAxis?.crosses, Ve.min, Ve.max)) : Ct, Tt = (e) => ce(e) ? wt : Ct, { color: Et, width: Dt } = f(t.catAxisLineColor, t.catAxisLineWidthEmu, r), { color: Ot, width: kt } = f(t.valAxisLineColor, t.valAxisLineWidthEmu, r);
	if (!t.valAxisHidden) {
		let n = _n(t, r), i = jn(t, r);
		if (t.valAxisMinorGridlines) for (let t of ft.minorLines) Gt(e, J, tt, vt(t), !1, i);
		if (l(t)) for (let t of ft.majorLines) Gt(e, J, tt, vt(t), t === 0, n);
	}
	if (R && Ve && ke(e, R, Ve, yt, J, tt, r), !t.catAxisHidden && et(t)) {
		let n = ie(t, r);
		e.strokeStyle = n.color, e.lineWidth = n.width;
		let i = n.dash.length > 0 && e.getLineDash ? e.getLineDash() : [];
		n.dash.length > 0 && e.setLineDash(n.dash);
		let a = st ? st.majorTicks.map((e) => e.fraction) : Ue(t, d);
		for (let t of a) {
			let n = J + t * tt;
			e.beginPath(), e.moveTo(n, Y), e.lineTo(n, Y + it), e.stroke();
		}
		n.dash.length > 0 && e.setLineDash(i);
	}
	let jt = x.flatMap(({ areaIndices: e }) => e), Mt = (e, t) => A[e]?.[t] ?? 0;
	for (let n of jt) {
		let { series: a, chartIndex: o } = h[n], s = rr(o, a), c = S(a, o), l = Te(t, a, void 0, c), u = Y + it, f = St(a), p = a.smooth === !0;
		Ee(e, k(a.chartexStyle), Xe(t, "dataPoint", B(t, a)), c, {
			x: J,
			y: Y,
			w: tt,
			h: it
		}, r, (e) => {
			if (e.beginPath(), C[n]) {
				let t = [];
				for (let e = 0; e < d; e++) t.push({
					x: _t(e),
					y: vt(A[n][e])
				});
				e.moveTo(t[0].x, t[0].y), Kn(e, t, p);
				for (let t = d - 1; t >= 0; t--) e.lineTo(_t(t), vt(O[n][t]));
			} else {
				let t = [];
				for (let e = 0; e < d; e++) t.push({
					x: _t(e),
					y: f(a.values[e] ?? 0)
				});
				e.moveTo(_t(0), u), e.lineTo(t[0].x, t[0].y), Kn(e, t, p), e.lineTo(_t(d - 1), u);
			}
			e.closePath(), zi(e, l, {
				x: J,
				y: Y,
				w: tt,
				h: it
			}, s, r, i), Re(e, t, "dataPoint", a, void 0, c, s, 1.5, r, {
				x: J,
				y: Y,
				w: tt,
				h: it
			}, i) && e.stroke();
		});
	}
	let Ft = /* @__PURE__ */ new Map();
	for (let e = 0; e < h.length; e++) {
		let t = h[e].series, n = t.areaGroupIndex ?? 0, r = Ft.get(n) ?? [];
		r.push({
			series: t,
			areaIndex: e
		}), Ft.set(n, r);
	}
	for (let n of t.areaGroupDecorations ?? []) {
		if (!n.dropLines || !on(e, un(t, n.dropLines, "dropLine"), r)) continue;
		let i = Ft.get(n.groupIndex) ?? [];
		for (let t = 0; t < d; t++) {
			let n = Infinity, r = -Infinity, a = !1;
			for (let e of i) {
				if (e.series.values[t] == null) continue;
				let i = St(e.series)(Mt(e.areaIndex, t)), o = Tt(e.series);
				!Number.isFinite(i) || !Number.isFinite(o) || (n = Math.min(n, i, o), r = Math.max(r, i, o), a = !0);
			}
			!a || Math.abs(r - n) < .01 || (e.beginPath(), e.moveTo(_t(t), n), e.lineTo(_t(t), r), e.stroke());
		}
	}
	{
		let n = Math.max(2, 2.5 * r);
		for (let l = 0; l < h.length; l++) {
			let { series: f, chartIndex: p } = h[l], g = Ye(f.dataPointOverrides), _ = rr(p, f), v = St(f), y = (e) => Mt(l, e), b = D[l];
			for (let n of f.errBars ?? []) $a(e, f, Lt(t, n), d, _t, v, y, _);
			let x = (f.showMarker === !0 || Gn(f)) && f.markerSymbol !== "none", S = ia(t, f, p);
			if (x || pt(f)) for (let a = 0; a < d; a++) {
				if (f.sourceHidden?.[a] === !0 || f.values[a] == null) continue;
				let o = g.get(a), s = zt(f, o, "circle", x);
				if (s === "none") continue;
				let c = _t(a), l = v(y(a));
				if (S || T(o)) {
					let n = o?.markerSize ?? f.markerSize ?? 5, u = Vn(f, o, a, _), d = o?.markerLine ?? f.markerLine ?? null, p = o?.markerLineWidthEmu ?? f.markerLineWidthEmu;
					ra(e, t, f, o, a, c, l, s, n, u, d, r, p == null ? void 0 : lt(p, r), Qn(f, o, a), i);
				} else e.fillStyle = _, e.beginPath(), e.arc(c, l, n, 0, Math.PI * 2), e.fill();
			}
			so(e, f, u, d, _t, v, y, it, r, t.date1904 ?? !1, !0, Yn(t, t.dataLabelFontFace, "minor"), t.dataLabelPosition ?? "ctr", {
				x: J,
				y: Y,
				w: tt,
				h: it
			}, {
				x: a,
				y: o,
				w: s,
				h: c
			}, E[l] && b ? (e) => (f.values[e] ?? 0) / b[e] : void 0, void 0, (e) => Yn(t, e, "minor"), ce(f) ? R?.displayUnits : t.valAxisDisplayUnits, (e) => m(p, e), (e) => eo(t, e, ce(f) && Ve ? Ve.max : ft.max), i);
		}
	}
	for (let { series: l, chartIndex: f } of g) {
		let p = Ye(l.dataPointOverrides), h = rr(f, l), g = l.lineColor ? `#${l.lineColor}` : h, _ = S(l, f), v = St(l), y = rt(t, f), b = fo(l, d, t.dispBlanksAs).map((e) => e.map((e) => ({
			x: _t(e),
			y: v(l.values[e] ?? 0),
			index: e
		})));
		y ? oe(e, t, l, b, l.smooth === !0, !1, h, Math.max(1, 2.25 * r), r, {
			x: J,
			y: Y,
			w: tt,
			h: it
		}, i) : Ee(e, k(l.chartexStyle), t.chartStyleRoles?.dataPointLine, _, {
			x: J,
			y: Y,
			w: tt,
			h: it
		}, r, (e) => {
			if (Re(e, t, "dataPointLine", l, void 0, _, h, Math.max(1, 2.25 * r), r, {
				x: J,
				y: Y,
				w: tt,
				h: it
			}, i)) {
				e.beginPath();
				for (let t of b) e.moveTo(t[0].x, t[0].y), Kn(e, t, l.smooth === !0);
				e.stroke();
			}
		});
		let x = (e) => l.values[e] ?? 0;
		for (let n of l.errBars ?? []) $a(e, l, Lt(t, n), d, _t, v, x, g);
		let C = (l.showMarker === !0 || Gn(l)) && l.markerSymbol !== "none";
		if (C || pt(l)) for (let n = 0; n < d; n++) {
			if (l.sourceHidden?.[n] === !0) continue;
			let a = l.values[n];
			if (a == null) continue;
			let o = p.get(n), s = zt(l, o, "circle", C);
			s !== "none" && ra(e, t, l, o, n, _t(n), v(a), s, o?.markerSize ?? l.markerSize ?? 5, Vn(l, o, n, g), o?.markerLine ?? l.markerLine ?? null, r, (o?.markerLineWidthEmu ?? l.markerLineWidthEmu) == null ? void 0 : lt(o?.markerLineWidthEmu ?? l.markerLineWidthEmu, r), Qn(l, o, n), i);
		}
		so(e, l, u, d, _t, v, x, it, r, t.date1904 ?? !1, !1, Yn(t, t.dataLabelFontFace, "minor"), t.dataLabelPosition ?? "r", {
			x: J,
			y: Y,
			w: tt,
			h: it
		}, {
			x: a,
			y: o,
			w: s,
			h: c
		}, void 0, void 0, (e) => Yn(t, e, "minor"), ce(l) ? R?.displayUnits : t.valAxisDisplayUnits, (e) => m(f, e), (e) => eo(t, e, ce(l) && Ve ? Ve.max : ft.max), i), ua(e, l, g, _t, v, r, void 0, {
			chart: t,
			chartRect: n,
			plotRect: {
				x: J,
				y: Y,
				w: tt,
				h: it
			},
			shapeRotationDeg: i
		});
	}
	if (!t.valAxisHidden) {
		let n = t.valAxisFontSizeHpt == null ? Math.max(8, Math.min(11, it / 20)) : me;
		e.font = bt(n, Yn(t, t.valAxisFontFace, "minor"), t.valAxisFontBold ?? !1, t.valAxisFontItalic ?? !1), e.textBaseline = "middle";
		for (let i of ft.majorLines) {
			let a = vt(i);
			le(e, t.valAxisMajorTickMark, "val", J, a, Ot, kt, !1, t.valAxisLineHidden, "major", r, t.valAxisLineDash), e.fillStyle = t.valAxisFontColor ? `#${t.valAxisFontColor}` : "#555", e.textAlign = "right";
			let o = t.valAxisFontSizeHpt == null ? 6 : Pt(n);
			dt(e, Pn(t, i, P), J - o, a, Rt(n));
		}
		if (t.valAxisMinorTickMark && t.valAxisMinorTickMark !== "none") for (let n of ft.minorTicks) le(e, t.valAxisMinorTickMark, "val", J, vt(n), Ot, kt, !1, t.valAxisLineHidden, "minor", r, t.valAxisLineDash);
	}
	if (!t.catAxisHidden && !t.catAxisLineHidden && On(e, J, Ct, J + tt, Ct, Et, Dt, t.catAxisLineDash), !t.valAxisHidden && !t.valAxisLineHidden && t.valAxisLineColor != null && On(e, J, Y, J, Y + it, Ot, kt, t.valAxisLineDash), !t.catAxisHidden && t.catAxisMajorTickMark && t.catAxisMajorTickMark !== "none") {
		let n = Math.max(1, Math.floor(t.catAxisTickMarkSkip ?? 1));
		if (st) for (let n of st.majorTicks) le(e, t.catAxisMajorTickMark, "cat", Ct, J + n.fraction * tt, Et, Dt, !1, t.catAxisLineHidden, "major", r, t.catAxisLineDash);
		else if (ht) for (let i = 0; i <= d; i += n) le(e, t.catAxisMajorTickMark, "cat", Ct, J + i / d * tt, Et, Dt, !1, t.catAxisLineHidden, "major", r, t.catAxisLineDash);
		else for (let i = 0; i < d; i += n) le(e, t.catAxisMajorTickMark, "cat", Ct, _t(i), Et, Dt, !1, t.catAxisLineHidden, "major", r, t.catAxisLineDash);
	}
	if (!t.catAxisHidden && t.catAxisMinorTickMark && t.catAxisMinorTickMark !== "none" && st) for (let n of st.minorTicks) le(e, t.catAxisMinorTickMark, "cat", Ct, J + n.fraction * tt, Et, Dt, !1, t.catAxisLineHidden, "minor", r, t.catAxisLineDash);
	if (!De && !t.catAxisHidden && re(t)) {
		let n = t.catAxisFontSizeHpt == null ? Math.max(8, Math.min(11, tt / d * .8)) : pe;
		e.fillStyle = t.catAxisFontColor ? `#${t.catAxisFontColor}` : "#555", e.textAlign = "center", e.textBaseline = "top", e.font = bt(n, Yn(t, t.catAxisFontFace, "minor"), t.catAxisFontBold ?? !1, t.catAxisFontItalic ?? !1);
		let r = Math.max(1, Math.floor(t.catAxisTickLabelSkip ?? 1)), i = st ? st.majorTicks.map((e) => ({
			label: mr(String(e.serial), t.catAxisFormatCode, t.date1904, t.catAxisFormatDivisors),
			x: J + e.fraction * tt,
			categoryIndex: -1
		})) : Array.from({ length: Math.ceil(d / r) }, (e, n) => {
			let i = n * r;
			return {
				label: mr((u[i] ?? "").toString(), t.catAxisFormatCode, t.date1904, t.catAxisFormatDivisors),
				x: _t(i),
				categoryIndex: i
			};
		});
		for (let r of i) {
			let i = r.label;
			if (!i) continue;
			let a = r.categoryIndex < 0 ? null : ze(r.categoryIndex, d, Pe(t), qe(t), t.catAxisLabelAlignment), o = w(t.catAxisFontSizeHpt == null ? 3 : Nn(n), t.catAxisLabelOffsetPercent);
			e.textAlign = a?.textAlign ?? "center";
			let s = t.catAxisTickLabelPos ?? "nextTo", c = s === "nextTo" ? Ct : s === "high" ? Y : Y + it;
			dt(e, i, a ? J + a.fraction * tt : r.x, c + o, Rt(n));
		}
	}
	if (R && Ve) {
		let i = t.valAxisFontColor ? `#${t.valAxisFontColor}` : "#555";
		xe(e, t, R, Ve, yt, n, J, Y, tt, it, r, He, W, i, t.date1904);
	}
	ot && Ya(e, t, ot, J, Y + it + Oe, at, a + _e, r), Ra(e, t, he, a, o, s, c, J, Y, tt, it, fe + 2, r), nt(e, t, a, o, s, c, J, Y, tt, it, _e, ye, be, H);
}
var Xo = .88;
function Zo(e, t, n) {
	return e === "ctr" || t > .01 ? (t + n) / 2 : n * Xo;
}
function Qo(e, t, n, r, i = 0) {
	let a = t.series[0];
	if (!a) return;
	let o = An(t.ofPie, a.values);
	if (o == null || o.size === 0) {
		$o(e, {
			...t,
			chartType: "pie"
		}, n, !1, r, i);
		return;
	}
	let s = [], c = [];
	for (let e = 0; e < a.values.length; e++) {
		let t = a.values[e], n = t == null ? 0 : Math.abs(t);
		!(n > 0) || !Number.isFinite(n) || (o.has(e) ? c : s).push({
			sourceIndex: e,
			value: n
		});
	}
	if (c.length === 0) {
		$o(e, {
			...t,
			chartType: "pie"
		}, n, !1, r, i);
		return;
	}
	let l = {
		...t,
		chartType: "pie"
	}, u = Fa(e, l, n.w, n.h, r), d = xt(t, n.x, n.y, n.w, n.h, r, {
		titleTopPadFrac: .035,
		titleBottomPadFrac: .035,
		legendReserve: u,
		radialGapFrac: .02,
		honorPlotAreaManualLayout: !0
	});
	jo(e, t, n.x, n.y, n.w, n.h, n.y + d.title.topPad, d.title.fontPx);
	let { px0: f, py0: p, pw: m, ph: h } = d.plotRect;
	if (!(m > 0) || !(h > 0)) return;
	Mn(e, t, f, p, m, h, r, i);
	let g = t.ofPie, _ = Math.max(.05, Math.min(2, (g?.secondPieSizePercent ?? 75) / 100)), v = Math.max(0, g?.gapWidthPercent ?? 150) / 100, y = Math.min(h * .44, m * .9 / (2 + 2 * _ + v)), b = y * _;
	if (!(y > 0) || !(b > 0)) return;
	let x = f + (m - (2 * y + v * y + 2 * b)) / 2, S = x + y, C = x + 2 * y + v * y + b, w = p + h / 2, T = c.reduce((e, t) => e + t.value, 0), E = Ye(a.dataPointOverrides), D = [...s, {
		sourceIndex: c[0].sourceIndex,
		value: T
	}], O = (n, o, s) => {
		let c = n.reduce((e, t) => e + t.value, 0), l = -Math.PI / 2, u = l, d = l;
		for (let f = 0; f < n.length; f++) {
			let p = n[f], m = c > 0 ? p.value / c * Math.PI * 2 : 0, h = E.get(p.sourceIndex), g = Ke(t, a, 0, p.sourceIndex), _ = $e(p.sourceIndex, a, t.varyColors !== !1, 0), v = Te(t, a, h, g, p.sourceIndex), y = l, b = l + m;
			Ee(e, k(h?.chartexStyle, a.chartexStyle), Xe(t, "dataPoint", 0), g, {
				x: o - s,
				y: w - s,
				w: s * 2,
				h: s * 2
			}, r, (e) => {
				e.beginPath(), e.moveTo(o, w), e.arc(o, w, s, y, b), e.closePath(), zi(e, v, {
					x: o - s,
					y: w - s,
					w: s * 2,
					h: s * 2
				}, _, r, i), os(e, t, a, h, g, "#FFFFFF", r, {
					x: o - s,
					y: w - s,
					w: s * 2,
					h: s * 2
				}, i);
			}), f === n.length - 1 && (u = l, d = l + m), l += m;
		}
		return {
			aggregateStart: u,
			aggregateEnd: d
		};
	}, A = O(D, S, y), j = w - b, M = w + b;
	if ((g?.type ?? "pie") === "bar") {
		let n = w - b, o = b;
		for (let s of c) {
			let c = T > 0 ? 2 * b * s.value / T : 0, l = C - o / 2, u = E.get(s.sourceIndex), d = Ke(t, a, 0, s.sourceIndex), f = $e(s.sourceIndex, a, t.varyColors !== !1, 0), p = Te(t, a, u, d, s.sourceIndex);
			Ee(e, k(u?.chartexStyle, a.chartexStyle), Xe(t, "dataPoint", 0), d, {
				x: l,
				y: n,
				w: o,
				h: c
			}, r, (e) => {
				Bi(e, p, {
					x: l,
					y: n,
					w: o,
					h: c
				}, f, r, i), e.beginPath(), e.rect(l, n, o, c), os(e, t, a, u, d, "#FFFFFF", r, {
					x: l,
					y: n,
					w: o,
					h: c
				}, i);
			}), n += c;
		}
		j = w - b, M = w + b;
	} else O(c, C, b);
	if (g?.seriesLines ?? !0) {
		let n = un(t, g?.seriesLineStyle ?? {}, "seriesLine"), i = on(e, {
			...n,
			color: n.color ?? "808080"
		}, r), a = {
			x: S + Math.cos(A.aggregateStart) * y,
			y: w + Math.sin(A.aggregateStart) * y
		}, o = {
			x: S + Math.cos(A.aggregateEnd) * y,
			y: w + Math.sin(A.aggregateEnd) * y
		};
		i && (e.beginPath(), e.moveTo(a.x, a.y), e.lineTo(C - b, j), e.stroke(), e.beginPath(), e.moveTo(o.x, o.y), e.lineTo(C - b, M), e.stroke());
	}
	u && Ra(e, l, u, n.x, n.y, n.w, n.h, f, p, m, h, d.title.bandH + 2, r);
}
function $o(e, t, n, r, i, a = 0) {
	let { x: o, y: s, w: c, h: l } = n, u = t.series[0];
	if (!u) return;
	let d = u.categories && u.categories.length > 0 ? u.categories : t.categories, f = u.values.map((e) => Math.abs(e ?? 0)), p = f.reduce((e, t) => e + t, 0);
	if (p === 0) return;
	let m = r && t.varyColors === !1 && t.series.length > 1 ? t : {
		...t,
		series: [{
			...u,
			categories: d
		}]
	}, h = Fa(e, m, c, l, i), g = xt(t, o, s, c, l, i, {
		titleTopPadFrac: .035,
		titleBottomPadFrac: .035,
		legendReserve: h,
		radialGapFrac: .02,
		honorPlotAreaManualLayout: !0
	}), _ = g.title.fontPx, v = g.title.bandH;
	jo(e, t, o, s, c, l, s + g.title.topPad, _);
	let { px0: y, py0: b, pw: x, ph: S } = g.plotRect;
	if (!(x > 0) || !(S > 0)) return;
	Mn(e, t, y, b, x, S, i, a);
	let C = g.center.cx, w = g.center.cy, T = Math.min(x, S) * .42, E = -Math.PI / 2 + (t.firstSliceAngle ?? 0) * Math.PI / 180, D = r ? Math.max(1, Math.min(90, t.holeSize ?? 50)) : 0, O = r ? t.series : [u], A = new Map(O.map((e) => [e, Ye(e.dataPointOverrides)])), j = (T - D / 100 * T) / O.length, M = (e, t) => {
		let n = A.get(e)?.get(t)?.explosion ?? e.explosion ?? 0;
		return n > 0 ? n / 100 * T : 0;
	}, ee = u.seriesDataLabels ?? {
		showVal: !1,
		showCatName: !1,
		showSerName: !1,
		showPercent: !1
	}, N = u.seriesDataLabels != null || (u.dataLabelOverrides?.length ?? 0) > 0, P = t.showDataLabels && !N, te = Yn(t, ee.fontFace ?? t.dataLabelFontFace, "minor");
	for (let n = 0; n < O.length; n++) {
		let o = O[n], s = o.values.map((e) => Math.abs(e ?? 0)), c = s.reduce((e, t) => e + t, 0);
		if (c === 0) continue;
		let l = T - n * j, u = l - j, d = E;
		for (let f = 0; f < s.length; f++) {
			let p = s[f] / c * Math.PI * 2;
			if (!(p > 0)) continue;
			let m = Ke(t, o, n, f), h = $e(f, o, t.varyColors !== !1, n), g = A.get(o)?.get(f), _ = d + p / 2, v = M(o, f), y = v > 0 ? Math.cos(_) * v : 0, b = v > 0 ? Math.sin(_) * v : 0, x = Te(t, o, g, m, f), S = {
				x: C + y - l,
				y: w + b - l,
				w: l * 2,
				h: l * 2
			};
			if (Ee(e, k(g?.chartexStyle, o.chartexStyle), Xe(t, "dataPoint", B(t, o)), m, S, i, (e) => {
				e.beginPath(), u > .01 ? (e.arc(C + y, w + b, l, d, d + p), e.arc(C + y, w + b, u, d + p, d, !0)) : (e.moveTo(C + y, w + b), e.arc(C + y, w + b, l, d, d + p)), e.closePath(), zi(e, x, S, h, i, a), os(e, t, o, g, m, h, i, S, a);
			}), P && n === 0 && p > .15) {
				let t = T * (r ? .75 : .6), n = C + y + Math.cos(_) * t, i = w + b + Math.sin(_) * t, a = Math.round(s[f] / c * 100);
				e.font = `bold ${Math.max(8, T * .1)}px ${te}`, e.fillStyle = "#fff", e.textAlign = "center", e.textBaseline = "middle", e.fillText(`${a}%`, n, i);
			}
			d += p;
		}
	}
	N && es(e, t, ee, u, d, f, p, C, w, T, r ? T - j : 0, E, te, i, y, b, x, S, o, s, c, l, f.map((e, t) => M(u, t)), a), h && Ra(e, m, h, o, s, c, l, y, b, x, S, v + 2, i);
}
function es(e, t, n, r, i, a, o, s, c, l, u, d, f, p, m, h, g, _, v, y, b, S, C, w) {
	let T = Ye(r.dataLabelOverrides ?? []), E = Sa({
		...t,
		series: [{
			...r,
			categories: i
		}]
	}, p), D = /* @__PURE__ */ new Set();
	for (let e = 0; e < a.length; e++) {
		if (r.sourceHidden?.[e] === !0) continue;
		let t = T.get(e);
		if (nr(n, t)) continue;
		let i = vt(t?.labelBox, n.labelBox);
		i?.fillHidden !== !0 && (i?.fill != null || i?.fillPaint != null) && D.add(e);
	}
	D.size > 0 && as(e, t, n, r, i, a, o, s, c, l, u, d, f, p, m, g, h, _, v, y, b, S, D, T, C, w);
	let O = [], k = d;
	for (let d = 0; d < a.length; d++) {
		let A = a[d] / o * Math.PI * 2, j = k + A / 2;
		if (k += A, !(A > 0) || r.sourceHidden?.[d] === !0 || D.has(d)) continue;
		let M = T.get(d);
		if (nr(n, M)) continue;
		let ee = M?.showCatName ?? n.showCatName, N = M?.showSerName ?? n.showSerName, P = M?.showVal ?? n.showVal, te = M?.showPercent ?? n.showPercent, F = M?.showLegendKey ?? n.showLegendKey ?? !1, ne = Be({
			customText: M?.text,
			showCategory: ee,
			showSeries: N,
			showValue: P,
			showPercent: te,
			category: (i[d] ?? "").toString(),
			seriesName: r.name,
			sourceValue: a[d],
			percentRatio: a[d] / o,
			formatCode: M?.formatCode ?? n.formatCode ?? r.valFormatCode ?? null,
			formatDivisors: M?.formatCode == null ? n.formatDivisors : null,
			percentFormatCode: M?.formatCode ?? n.percentFormatCode ?? n.formatCode ?? "0%",
			percentFormatDivisors: M?.formatCode == null ? n.percentFormatDivisors : null,
			date1904: t.date1904 ?? !1,
			separator: M?.separator ?? n.separator
		}), I = F ? E(0, d) : void 0;
		if (!ne && !I) continue;
		let re = M?.position ?? n.position ?? "bestFit", ie = re === "outEnd", ae = hn(M?.fontSizeHpt ?? n.fontSizeHpt, p) ?? Math.max(8, l * .1), L = M?.fontBold ?? n.fontBold, oe = M?.fontColor ?? n.fontColor, se = M?.fontFace ?? n.fontFace ? Yn(t, M?.fontFace ?? n.fontFace, "minor") : f, R = x(M, n), ce = ro(t, M, p, se, L ?? !1, R), z = Zo(re, u, l) + (re === "ctr" ? C[d] ?? 0 : 0);
		if (M?.manualLayout) {
			e.font = `${R.fontItalic ? "italic " : ""}${L ? "bold " : ""}${ae}px ${se}`, ao(e, ne, {
				kind: "point",
				x: s + Math.cos(j) * z,
				y: c + Math.sin(j) * z,
				position: "ctr"
			}, {
				x: m,
				y: h,
				w: g,
				h: _
			}, ae, oe ? `#${oe}` : "#fff", M.manualLayout, {
				x: v,
				y,
				w: b,
				h: S
			}, ce, I, R, p, vt(M?.labelBox, n.labelBox), w);
			continue;
		}
		if (ie) {
			e.font = `${R.fontItalic ? "italic " : ""}${L ? "bold " : ""}${ae}px ${se}`;
			let t = ce ? jr(e, ce, ae, oe ? `#${oe}` : "#333") : null, n = ae * 1.15, r = t ? [] : K(ne, Math.max(0, b - ae), Math.max(0, S - ae), n, (t) => e.measureText(t).width, R);
			if (ce && !t || !t && r.length === 0 && !I) continue;
			let i = t?.width ?? r.reduce((t, n) => Math.max(t, e.measureText(n).width), 0), a = t?.height ?? ae + Math.max(0, r.length - 1) * n, o = I ? ja([I.entry], ae, p)[0] ?? 0 : 0, u = I ? Na(I.entry, ae, p) : 0;
			O.push(rs(r, j, s, c, l, Math.min(o + (ne ? 4 : 0) + i, Math.max(0, b - ae)), Math.min(Math.max(u, a), Math.max(0, S - ae)), n, ae, L ?? !1, oe ? `#${oe}` : "#333", se, t ?? void 0, I, R, p));
			continue;
		}
		let le = z, B = s + Math.cos(j) * le, ue = c + Math.sin(j) * le;
		e.font = `${R.fontItalic ? "italic " : ""}${L ? "bold " : ""}${ae}px ${se}`;
		let de = 2 * le * Math.sin(Math.min(Math.PI, Math.abs(A)) / 2) - ae, fe = u > .01 ? l - u - ae : l - ae;
		if (re !== "ctr" && (!(de > 0) || !(fe > 0))) continue;
		let pe = re === "ctr" ? {
			x: m,
			y: h,
			w: g,
			h: _
		} : ss({
			x: B - de / 2,
			y: ue - fe / 2,
			w: de,
			h: fe
		}, {
			x: m,
			y: h,
			w: g,
			h: _
		});
		pe && ao(e, ne, {
			kind: "point",
			x: B,
			y: ue,
			position: "ctr"
		}, pe, ae, oe ? `#${oe}` : "#fff", void 0, {
			x: v,
			y,
			w: b,
			h: S
		}, ce, I, R, p, vt(M?.labelBox, n.labelBox), w);
	}
	is(e, O, v, y, b, S);
}
function ts(e, t, n, r, i, a) {
	let o = Math.max(Math.abs(n - e) - i, 0), s = Math.max(Math.abs(r - t) - a, 0);
	return Math.hypot(o, s);
}
function ns(e, t, n, r, i) {
	let a = Math.cos(e), o = Math.sin(e), s = t + i, c = 0, l = s + Math.hypot(n, r);
	for (let e = 0; e < 32; e++) {
		let e = (c + l) / 2;
		ts(0, 0, a * e, o * e, n, r) >= s ? l = e : c = e;
	}
	return l;
}
function rs(e, t, n, r, i, a, o, s, c, l, u, d, f, p, m = {}, h = 1) {
	let g = L(a, o, m.textRotation, m.textVerticalMode), _ = Le(m, h), v = a + _.left + _.right, y = o + _.top + _.bottom, b = L(v, y, m.textRotation, m.textVerticalMode);
	a = b.w, o = b.h;
	let x = ns(t, i, g.w / 2, g.h / 2, c * .5), S = n + Math.cos(t) * x, C = r + Math.sin(t) * x;
	return {
		lines: e,
		rich: f,
		legendKey: p,
		boxW: a,
		boxH: o,
		unrotatedW: v,
		unrotatedH: y,
		textStyle: m,
		ptToPx: h,
		lineHeight: s,
		fontPx: c,
		bold: l,
		fontColor: u,
		font: d,
		cxBox: S,
		cyBox: C
	};
}
function is(e, t, n, r, i, a) {
	if (t.length !== 0) {
		e.save(), e.beginPath(), e.rect(n, r, i, a), e.clip();
		for (let n of t) {
			let t = Le(n.textStyle, n.ptToPx), r = L(n.unrotatedW, n.unrotatedH, n.textStyle.textRotation, n.textStyle.textVerticalMode), i = n.cxBox + (t.left - t.right) / 2, a = n.cyBox + (t.top - t.bottom) / 2, o = Math.max(0, n.unrotatedW - t.left - t.right), s = _e(n.textStyle, "center"), c = s === "left" ? n.cxBox - n.unrotatedW / 2 + t.left : s === "right" ? n.cxBox + n.unrotatedW / 2 - t.right : i;
			if (e.save(), r.radians !== 0 && (e.translate(n.cxBox, n.cyBox), e.rotate(r.radians), e.translate(-n.cxBox, -n.cyBox)), !n.legendKey) {
				if (n.rich) {
					Ar(e, n.rich, c, a, s, "middle", o), e.restore();
					continue;
				}
				e.font = `${n.textStyle.fontItalic ? "italic " : ""}${n.bold ? "bold " : ""}${n.fontPx}px ${n.font}`, e.fillStyle = n.fontColor, e.textAlign = s, e.textBaseline = "middle";
				let t = (n.textStyle.fontBaseline ?? 0) * n.fontPx, r = a - (n.lines.length - 1) * n.lineHeight / 2 - t;
				if (!(n.textStyle.fontPaintAuthored === !0 && (n.textStyle.fontHidden === !0 || n.textStyle.fontColor == null))) for (let t = 0; t < n.lines.length; t++) e.fillText(n.lines[t], c, r + t * n.lineHeight);
				e.restore();
				continue;
			}
			e.font = `${n.textStyle.fontItalic ? "italic " : ""}${n.bold ? "bold " : ""}${n.fontPx}px ${n.font}`;
			let l = n.legendKey ? ja([n.legendKey.entry], n.fontPx, n.legendKey.ptToPx)[0] ?? 0 : 0, u = n.legendKey ? Na(n.legendKey.entry, n.fontPx, n.legendKey.ptToPx) : 0, d = n.rich?.width ?? n.lines.reduce((t, n) => Math.max(t, e.measureText(n).width), 0), f = n.legendKey && (n.rich || n.lines.length > 0) ? 4 : 0, p = i - (l + f + d) / 2;
			if (n.legendKey && va(e, n.legendKey.entry.swatchStyle, n.legendKey.entry.color, p, a - u / 2, l, u, n.legendKey.entry.marker, n.legendKey.entry.fillPaint, n.legendKey.entry.outlinePaint, n.legendKey.entry.outlineColor, n.legendKey.entry.outlineWidthEmu, n.legendKey.entry.outlineDash, n.legendKey.entry.outlineCustomDash, n.legendKey.entry.outlineCap, n.legendKey.entry.outlineJoin, n.legendKey.ptToPx, n.legendKey.shapeRotationDeg, n.legendKey.entry.directEffect, n.legendKey.entry.fallbackEffect, n.legendKey.entry.directEffectIndex, n.legendKey.entry.fallbackEffectIndex), n.rich) {
				Ar(e, n.rich, p + l + f, a, "left", "middle"), e.restore();
				continue;
			}
			e.fillStyle = n.fontColor, e.textAlign = "left", e.textBaseline = "middle";
			let m = (n.textStyle.fontBaseline ?? 0) * n.fontPx, h = a - (n.lines.length - 1) * n.lineHeight / 2 - m;
			if (!(n.textStyle.fontPaintAuthored === !0 && (n.textStyle.fontHidden === !0 || n.textStyle.fontColor == null))) for (let t = 0; t < n.lines.length; t++) e.fillText(n.lines[t], p + l + f, h + t * n.lineHeight);
			e.restore();
		}
		e.restore();
	}
}
function as(e, t, n, r, i, a, o, s, c, l, u, d, f, p, m, h, g, _, v, y, b, S, C, w, T, E) {
	let D = Sa(t, p), O = (e) => w.get(e), k = hn(n.fontSizeHpt, p) ?? Math.max(9, l * .09), A = n.labelBox, M = [], ee = d;
	for (let d = 0; d < a.length; d++) {
		let w = a[d] / o * Math.PI * 2, E = ee + w / 2;
		if (ee += w, w <= 0 || !C.has(d)) continue;
		let j = O(d);
		if (nr(n, j)) continue;
		let N = j?.showCatName ?? n.showCatName, P = j?.showSerName ?? n.showSerName, te = j?.showVal ?? n.showVal, F = j?.showPercent ?? n.showPercent, ne = j?.showLegendKey ?? n.showLegendKey ?? !1, I = hn(j?.fontSizeHpt, p) ?? k, re = j?.fontBold ?? n.fontBold ?? !1, ie = j?.fontFace ?? n.fontFace ? Yn(t, j?.fontFace ?? n.fontFace, "minor") : f, ae = j?.fontColor ? `#${j.fontColor}` : n.fontColor ? `#${n.fontColor}` : "#000", oe = vt(j?.labelBox, A), se = j?.position ?? n.position ?? "bestFit", R = Be({
			customText: j?.text,
			showCategory: N,
			showSeries: P,
			showValue: te,
			showPercent: F,
			category: (i[d] ?? "").toString(),
			seriesName: r.name,
			sourceValue: a[d],
			percentRatio: a[d] / o,
			formatCode: j?.formatCode ?? n.formatCode ?? r.valFormatCode ?? null,
			formatDivisors: j?.formatCode == null ? n.formatDivisors : null,
			percentFormatCode: j?.formatCode ?? n.percentFormatCode ?? n.formatCode ?? "0%",
			percentFormatDivisors: j?.formatCode == null ? n.percentFormatDivisors : null,
			date1904: t.date1904 ?? !1,
			separator: j?.separator ?? n.separator,
			defaultSeparator: "\n"
		}), ce = ne ? D(0, d) : void 0;
		if (!R && !ce) continue;
		let z = x(j, n), le = ro(t, j, p, ie, re, z), B = z.textBodyAuthored === !0 || z.textLInsEmu != null || z.textTInsEmu != null || z.textRInsEmu != null || z.textBInsEmu != null, ue = Le(z, p), de = B ? ue.left : Math.max(4, I * .45), fe = B ? ue.right : Math.max(4, I * .45), pe = B ? ue.top : Math.max(2, I * .28), he = B ? ue.bottom : Math.max(2, I * .28), ge = I * .22, _e = I + ge;
		e.font = `${z.fontItalic ? "italic " : ""}${re ? "bold " : ""}${I}px ${ie}`;
		let ve = le ? jr(e, le, I, ae) : null;
		if (le && !ve) continue;
		let ye = ve ? [] : K(R, Math.max(0, h - de - fe), Math.max(0, _ - pe - he), _e, (t) => e.measureText(t).width, z);
		if (!ve && ye.length === 0 && !ce) continue;
		let V = ve?.width ?? 0;
		if (!ve) for (let t of ye) V = Math.max(V, e.measureText(t).width);
		let be = ce ? ja([ce.entry], I, p)[0] ?? 0 : 0, H = ce ? Na(ce.entry, I, p) : 0, xe = ce && R ? 4 : 0, Se = be + xe + V + de + fe, Ce = Math.max(H, ve?.height ?? (ye.length > 0 ? ye.length * _e - ge : 0)) + pe + he, we = L(Se, Ce, z.textRotation, z.textVerticalMode), Te = Math.min(we.w, h), Ee = Math.max(H, ve?.height ?? (ye.length > 0 ? ye.length * _e - ge : 0));
		Ee = Math.min(we.h, _);
		let De = s + Math.cos(E) * l, Oe = c + Math.sin(E) * l, ke = Math.cos(E) < 0, Ae = Math.max(Te, Ee) * .55 + l * .06, je = De + Math.cos(E) * Ae, Me = Oe + Math.sin(E) * Ae, Ne, Pe = !1;
		if (j?.manualLayout) {
			let t = me({
				kind: "point",
				x: je,
				y: Me,
				position: "ctr"
			}, {
				x: m,
				y: g,
				w: h,
				h: _
			}, {
				w: Te,
				h: Ee
			}, I, j.manualLayout, {
				x: v,
				y,
				w: b,
				h: S
			});
			if (!t || (Te = t.rect.w, Ee = t.rect.h, Se = Te, Ce = Ee, !ve && (ye = K(R, Math.max(0, Te - de - fe - be - xe), Math.max(0, Ee - pe - he), _e, (t) => e.measureText(t).width, z), ye.length === 0 && !ce))) continue;
			je = t.rect.x + t.rect.w / 2, Me = t.rect.y + t.rect.h / 2, ke = je < s, Ne = t.clip;
		} else if (se !== "bestFit" && se !== "outEnd") {
			let t = Zo(se, u, l) + (se === "ctr" ? T[d] ?? 0 : 0), n = s + Math.cos(E) * t, r = c + Math.sin(E) * t, i = 2 * t * Math.sin(Math.min(Math.PI, Math.abs(w)) / 2) - I, a = u > .01 ? l - u - I : l - I, o = se === "ctr" ? {
				x: m,
				y: g,
				w: h,
				h: _
			} : ss({
				x: n - i / 2,
				y: r - a / 2,
				w: i,
				h: a
			}, {
				x: m,
				y: g,
				w: h,
				h: _
			});
			if (!o) continue;
			if (ve) Te = Math.min(Te, o.w), Ee = Math.min(Ee, o.h);
			else {
				if (ye = K(R, Math.max(0, o.w - de - fe - be - xe), Math.max(0, o.h - pe - he), _e, (t) => e.measureText(t).width, z), ye.length === 0 && !ce) continue;
				V = ye.reduce((t, n) => Math.max(t, e.measureText(n).width), 0), Se = be + xe + V + de + fe, Ce = Math.max(H, ye.length > 0 ? ye.length * _e - ge : 0) + pe + he, we = L(Se, Ce, z.textRotation, z.textVerticalMode), Te = we.w, Ee = we.h;
			}
			let f = me({
				kind: "point",
				x: n,
				y: r,
				position: se === "inBase" || se === "inEnd" ? "ctr" : se
			}, o, {
				w: Te,
				h: Ee
			}, I);
			if (!f) continue;
			je = f.textAlign === "left" ? f.x + Te / 2 : f.textAlign === "right" ? f.x - Te / 2 : f.x, Me = f.textBaseline === "top" ? f.y + Ee / 2 : f.textBaseline === "bottom" ? f.y - Ee / 2 : f.y, ke = je < s, Ne = f.clip, Pe = !0;
		}
		M.push({
			lines: ye,
			rich: ve ?? void 0,
			legendKey: ce,
			lineHeight: _e,
			midAngle: E,
			rimX: De,
			rimY: Oe,
			boxW: Te,
			boxH: Ee,
			unrotatedW: Se,
			unrotatedH: Ce,
			cxBox: je,
			cyBox: Me,
			leftSide: ke,
			fontColor: ae,
			box: oe,
			fontPx: I,
			bold: re,
			font: ie,
			textStyle: z,
			ptToPx: p,
			inside: Pe,
			manualClip: Ne
		});
	}
	let N = g + 2, P = g + _ - 2, te = P - N, F = (e) => {
		if (e.length === 0) return;
		e.sort((e, t) => e.cyBox - t.cyBox);
		let t = 0;
		for (let n of e) t += n.boxH;
		if (t += (e.length - 1) * 3, t > te) {
			let t = e.reduce((e, t) => e + t.boxH, 0), n = e.length;
			if (n === 1) {
				e[0].cyBox = Math.min(Math.max(e[0].cyBox, N + e[0].boxH / 2), P - e[0].boxH / 2);
				return;
			}
			let r = (te - t) / (n - 1), i = N;
			for (let t of e) t.cyBox = i + t.boxH / 2, i += t.boxH + r;
			return;
		}
		for (let t = 1; t < e.length; t++) {
			let n = e[t - 1], r = e[t], i = (n.boxH + r.boxH) / 2 + 3;
			r.cyBox - n.cyBox < i && (r.cyBox = n.cyBox + i);
		}
		let n = e[e.length - 1].cyBox + e[e.length - 1].boxH / 2 - P;
		if (n > 0) for (let t of e) t.cyBox -= n;
		let r = N - (e[0].cyBox - e[0].boxH / 2);
		if (r > 0) for (let t of e) t.cyBox += r;
	};
	F(M.filter((e) => !e.manualClip && !e.leftSide)), F(M.filter((e) => !e.manualClip && e.leftSide));
	for (let e of M) e.manualClip || (e.cyBox = Math.max(N + e.boxH / 2, e.cyBox), e.cyBox = Math.min(P - e.boxH / 2, e.cyBox));
	let ne = m + 2, I = m + h - 2;
	for (let e of M) {
		if (e.manualClip) continue;
		let t = e.boxW / 2;
		e.cxBox - t < ne && (e.cxBox = ne + t), e.cxBox + t > I && (e.cxBox = I - t);
	}
	e.save(), e.beginPath(), e.rect(m, g, h, _), e.clip();
	let re = xn(t, n), ie = re.color ? `#${re.color}` : "#a6a6a6", ae = re.widthEmu ? Math.max(.5, re.widthEmu / ir * p) : 1;
	e.setLineDash(j(re.dash ?? void 0, ae));
	for (let t of M) {
		let r = t.cxBox + (t.leftSide ? t.boxW / 2 : -t.boxW / 2), i = t.cyBox, a = r - t.rimX, o = i - t.rimY, s = Math.hypot(a, o);
		!t.inside && n.showLeaderLines && re.hidden !== !0 && (re.paintAuthored !== !0 || re.color != null) && s > t.fontPx * .9 && (e.beginPath(), e.moveTo(t.rimX, t.rimY), e.lineTo(r, i), e.strokeStyle = ie, e.lineWidth = ae, e.stroke());
	}
	for (let t of M) {
		t.manualClip && (e.save(), e.beginPath(), e.rect(t.manualClip.x, t.manualClip.y, t.manualClip.w, t.manualClip.h), e.clip());
		let n = t.cxBox - t.boxW / 2, r = t.cyBox - t.boxH / 2;
		qn(e, t.box, {
			x: n,
			y: r,
			w: t.boxW,
			h: t.boxH
		}, p, E);
		let i = t.textStyle.textBodyAuthored === !0 || t.textStyle.textLInsEmu != null || t.textStyle.textTInsEmu != null || t.textStyle.textRInsEmu != null || t.textStyle.textBInsEmu != null, a = Le(t.textStyle, t.ptToPx), o = i ? a.left : Math.max(4, t.fontPx * .45), s = i ? a.right : Math.max(4, t.fontPx * .45), c = i ? a.top : Math.max(2, t.fontPx * .28), l = i ? a.bottom : Math.max(2, t.fontPx * .28), u = L(t.unrotatedW, t.unrotatedH, t.textStyle.textRotation, t.textStyle.textVerticalMode), d = t.cxBox + (o - s) / 2, f = t.cyBox + (c - l) / 2, m = n + o, h = n + t.boxW - s, g = Math.max(0, h - m), _ = _e(t.textStyle, "center"), v = _ === "left" ? m : _ === "right" ? h : d, y = (e) => (t.textStyle.textVerticalAnchor ?? (t.textStyle.textBodyAuthored === !0 ? "t" : "ctr")) === "t" ? r + c + e / 2 : (t.textStyle.textVerticalAnchor ?? (t.textStyle.textBodyAuthored === !0 ? "t" : "ctr")) === "b" ? r + t.boxH - l - e / 2 : f, b = (e) => _ === "left" ? m : _ === "right" ? h - e : d - e / 2;
		if (e.save(), e.beginPath(), e.rect(n, r, t.boxW, t.boxH), e.clip(), u.radians !== 0 && (e.translate(t.cxBox, t.cyBox), e.rotate(u.radians), e.translate(-t.cxBox, -t.cyBox)), !t.legendKey) {
			let n = y(t.rich?.height ?? Math.max(0, t.lines.length * t.lineHeight - (t.lineHeight - t.fontPx)));
			if (t.rich) {
				Ar(e, t.rich, v, n, _, "middle", g), e.restore(), t.manualClip && e.restore();
				continue;
			}
			e.font = `${t.textStyle.fontItalic ? "italic " : ""}${t.bold ? "bold " : ""}${t.fontPx}px ${t.font}`, e.fillStyle = t.fontColor, e.textAlign = _, e.textBaseline = "middle";
			let r = t.lineHeight - t.fontPx, i = (t.textStyle.fontBaseline ?? 0) * t.fontPx, a = n - (t.lines.length * t.lineHeight - r) / 2 + t.fontPx / 2 - i;
			if (!(t.textStyle.fontPaintAuthored === !0 && (t.textStyle.fontHidden === !0 || t.textStyle.fontColor == null))) for (let n = 0; n < t.lines.length; n++) e.fillText(t.lines[n], v, a + n * t.lineHeight);
			e.restore(), t.manualClip && e.restore();
			continue;
		}
		let x = t.legendKey ? ja([t.legendKey.entry], t.fontPx, t.legendKey.ptToPx)[0] ?? 0 : 0, S = t.legendKey ? Na(t.legendKey.entry, t.fontPx, t.legendKey.ptToPx) : 0, C = t.legendKey && (t.rich || t.lines.length > 0) ? 4 : 0, w = t.rich?.width ?? t.lines.reduce((t, n) => Math.max(t, e.measureText(n).width), 0), T = x + C + w, D = y(Math.max(S, t.rich?.height ?? Math.max(0, t.lines.length * t.lineHeight - (t.lineHeight - t.fontPx)))), O = b(T);
		if (t.legendKey && va(e, t.legendKey.entry.swatchStyle, t.legendKey.entry.color, O, D - S / 2, x, S, t.legendKey.entry.marker, t.legendKey.entry.fillPaint, t.legendKey.entry.outlinePaint, t.legendKey.entry.outlineColor, t.legendKey.entry.outlineWidthEmu, t.legendKey.entry.outlineDash, t.legendKey.entry.outlineCustomDash, t.legendKey.entry.outlineCap, t.legendKey.entry.outlineJoin, t.legendKey.ptToPx, t.legendKey.shapeRotationDeg, t.legendKey.entry.directEffect, t.legendKey.entry.fallbackEffect, t.legendKey.entry.directEffectIndex, t.legendKey.entry.fallbackEffectIndex), t.rich) {
			Ar(e, t.rich, O + x + C, D, "left", "middle", w), e.restore(), t.manualClip && e.restore();
			continue;
		}
		e.font = `${t.textStyle.fontItalic ? "italic " : ""}${t.bold ? "bold " : ""}${t.fontPx}px ${t.font}`, e.fillStyle = t.fontColor, e.textAlign = "left", e.textBaseline = "middle";
		let k = t.lineHeight - t.fontPx, A = (t.textStyle.fontBaseline ?? 0) * t.fontPx, j = D - (t.lines.length * t.lineHeight - k) / 2 + t.fontPx / 2 - A;
		if (!(t.textStyle.fontPaintAuthored === !0 && (t.textStyle.fontHidden === !0 || t.textStyle.fontColor == null))) for (let n = 0; n < t.lines.length; n++) e.fillText(t.lines[n], O + x + C, j + n * t.lineHeight);
		e.restore(), t.manualClip && e.restore();
	}
	e.restore();
}
function os(e, t, n, r, i, a, o, s, c) {
	let l = r?.chartexStyle, u = B(t, n), d = Xe(t, "dataPoint", u >= 0 ? u : i), f = n.chartexStyle, p = Je(l, r?.idx ?? i) !== void 0 || r?.lineHidden === !0 || r?.lineColor != null, m = Je(f, i) !== void 0 || n.lineHidden === !0 || n.lineColor != null, h = Je(d, i) !== void 0;
	!p && !m && !h || (e.save(), Re(e, t, "dataPoint", n, r, i, a, Math.max(.5, o * .75), o, s, c, !1) && e.stroke(), e.restore());
}
function ss(e, t) {
	let n = Math.max(e.x, t.x), r = Math.max(e.y, t.y), i = Math.min(e.x + e.w, t.x + t.w), a = Math.min(e.y + e.h, t.y + t.h);
	return i > n && a > r ? {
		x: n,
		y: r,
		w: i - n,
		h: a - r
	} : null;
}
function cs(e, t, n, r, i = 0) {
	let { x: a, y: o, w: s, h: c } = n, u = ee(t), d = u.length;
	if (d < 3) return;
	let p = Fa(e, t, s, c, r), m = xt(t, a, o, s, c, r, {
		titleTopPadFrac: .035,
		titleBottomPadFrac: .035,
		legendReserve: p,
		radialGapFrac: .02,
		honorPlotAreaManualLayout: !0
	}), h = m.title.fontPx;
	jo(e, t, a, o, s, c, o + m.title.topPad, h);
	let { px0: g, py0: _, pw: v, ph: y } = m.plotRect;
	if (!(v > 0) || !(y > 0)) return;
	Mn(e, t, g, _, v, y, r, i);
	let b = m.center.cx, x = m.center.cy, C = t.plotAreaManualLayout, T = C?.layoutTarget === "inner" && C.w != null && C.h != null && Number.isFinite(C.w) && Number.isFinite(C.h) && m.plotAreaManualLayoutApplied ? Math.min(v, y) / 2 : Math.min(v, y) * .38, E = Infinity, D = -Infinity;
	for (let e of t.series) for (let t of e.values) t != null && (E = Math.min(E, t), D = Math.max(D, t));
	isFinite(E) || (E = 0, D = 1), D === 0 && (D = 1);
	let O = t.valAxisMinorTickMark != null && t.valAxisMinorTickMark !== "none", A = t.valAxisLogBase != null && Number.isFinite(t.valAxisLogBase) && t.valAxisLogBase >= 2, j = t.valAxisMajorUnit ?? (A ? null : Oe(t.valMin ?? E, t.valMax ?? D, T / r)), M = I({
		dataMin: E,
		dataMax: D,
		explicitMin: t.valMin,
		explicitMax: t.valMax,
		axisLenPt: T / r,
		axisOrientation: "vertical",
		majorUnit: j,
		minorUnit: t.valAxisMinorUnit,
		needMinor: t.valAxisMinorGridlines === !0 || O,
		logBase: t.valAxisLogBase,
		reversed: gt(t)
	}), N = (e) => G(M.fraction(e), 0, 1), P = -Math.PI / 2, te = (e) => P + e / d * Math.PI * 2, F = M.majorTicks.filter((e) => N(e) > 0), ne = (t) => {
		let n = N(t) * T;
		e.beginPath();
		for (let t = 0; t < d; t++) {
			let r = te(t), i = b + Math.cos(r) * n, a = x + Math.sin(r) * n;
			t === 0 ? e.moveTo(i, a) : e.lineTo(i, a);
		}
		e.closePath(), e.stroke();
	};
	if (t.valAxisMinorGridlines) {
		let n = jn(t, r);
		e.strokeStyle = n.color, e.lineWidth = n.width;
		let i = n.dash.length > 0 && e.getLineDash ? e.getLineDash() : [];
		n.dash.length > 0 && e.setLineDash(n.dash);
		for (let e of M.minorTicks) ne(e);
		n.dash.length > 0 && e.setLineDash(i);
	}
	if (!t.valAxisHidden && l(t)) {
		let n = _n(t, r);
		e.strokeStyle = n.color, e.lineWidth = n.width;
		let i = n.dash.length > 0 && e.getLineDash ? e.getLineDash() : [];
		n.dash.length > 0 && e.setLineDash(n.dash);
		for (let e of F) ne(e);
		n.dash.length > 0 && e.setLineDash(i);
	}
	e.strokeStyle = "#bbb", e.lineWidth = .5;
	for (let t = 0; t < d; t++) {
		let n = te(t);
		e.beginPath(), e.moveTo(b, x), e.lineTo(b + Math.cos(n) * T, x + Math.sin(n) * T), e.stroke();
	}
	if (!t.valAxisHidden) {
		let n = Fe(t.valAxisFontSizeHpt, c, r);
		e.font = bt(n, Yn(t, t.valAxisFontFace, "minor"), t.valAxisFontBold ?? !1, t.valAxisFontItalic ?? !1), e.fillStyle = t.valAxisFontColor ? `#${t.valAxisFontColor}` : "#555", e.textAlign = "right", e.textBaseline = "middle";
		for (let i of F) {
			let a = x - N(i) * T, o = f(t.valAxisLineColor, t.valAxisLineWidthEmu, r);
			le(e, t.valAxisMajorTickMark, "val", b, a, o.color, o.width, !1, t.valAxisLineHidden, "major", r, t.valAxisLineDash), t.valAxisTickLabelPos !== "none" && dt(e, Pn(t, i, !1), b - 3, a, Rt(n));
		}
		if (O) {
			let n = f(t.valAxisLineColor, t.valAxisLineWidthEmu, r);
			for (let i of M.minorTicks) le(e, t.valAxisMinorTickMark, "val", b, x - N(i) * T, n.color, n.width, !1, t.valAxisLineHidden, "minor", r, t.valAxisLineDash);
		}
	}
	let ie = t.catAxisFontSizeHpt == null ? Math.max(8, Math.min(11, T * .2)) : Fe(t.catAxisFontSizeHpt, c, r);
	e.font = bt(ie, Yn(t, t.catAxisFontFace, "minor"), t.catAxisFontBold ?? !1, t.catAxisFontItalic ?? !1), e.fillStyle = t.catAxisFontColor ? `#${t.catAxisFontColor}` : "#444", e.textBaseline = "middle";
	let ae = b - v / 2, L = b + v / 2;
	if (!t.catAxisHidden && re(t)) for (let n = 0; n < d; n++) {
		let r = te(n), i = w(12, t.catAxisLabelOffsetPercent), a = b + Math.cos(r) * (T + i), o = x + Math.sin(r) * (T + i), s = t.catAxisLabelAlignment, c = s === "l" ? "left" : s === "r" ? "right" : s === "ctr" ? "center" : Math.cos(r) < -.1 ? "right" : Math.cos(r) > .1 ? "left" : "center";
		e.textAlign = c;
		let l = c === "right" ? a - ae : c === "left" ? L - a : 2 * Math.min(L - a, a - ae);
		dt(e, mr((u[n] ?? "").toString(), t.catAxisFormatCode, t.date1904, t.catAxisFormatDivisors), a, o, Rt(ie), l);
	}
	let se = Ve("radar", t.chartType, t.scatterStyle, t.radarStyle), R = Math.max(2, T * .025);
	for (let n = 0; n < t.series.length; n++) {
		let a = t.series[n], o = rr(n, a), s = S(a, n), c = [];
		for (let e = 0; e < d; e++) {
			let t = a.values[e];
			if (t == null) {
				c.push(null);
				continue;
			}
			let n = N(t), r = te(e);
			c.push([b + Math.cos(r) * T * n, x + Math.sin(r) * T * n]);
		}
		let l = c.every((e) => e != null), u = [], f = [];
		for (let e = 0; e < c.length; e++) {
			let t = c[e];
			t == null ? (f.length > 0 && u.push(f), f = []) : f.push({
				x: t[0],
				y: t[1],
				index: e
			});
		}
		f.length > 0 && u.push(f);
		let p = {
			x: g,
			y: _,
			w: v,
			h: y
		}, m = (e) => {
			let n = e.getLineDash ? e.getLineDash() : [], u = e.lineCap, d = e.lineJoin;
			e.beginPath();
			let f = !1;
			for (let t of c) {
				if (t == null) {
					f = !1;
					continue;
				}
				f ? e.lineTo(t[0], t[1]) : (e.moveTo(t[0], t[1]), f = !0);
			}
			l && e.closePath(), se && l && zi(e, Te(t, a, void 0, s), p, ur(o, .25), r, i), Re(e, t, "dataPointLine", a, void 0, s, o, 2, r, p, i) && e.stroke(), e.setLineDash(n), e.lineCap = u, e.lineJoin = d;
		};
		if (rt(t, n)) {
			if (se && l) {
				let s = Ye(a.dataPointOverrides).get(0);
				Ee(e, k(s?.chartexStyle, a.chartexStyle), Xe(t, "dataPoint", n), 0, p, r, (e) => {
					let n = Te(t, a, s, 0, 0);
					if (n !== null) {
						e.beginPath();
						for (let t = 0; t < c.length; t++) {
							let n = c[t];
							t === 0 ? e.moveTo(n[0], n[1]) : e.lineTo(n[0], n[1]);
						}
						e.closePath(), zi(e, n, p, ur(o, .25), r, i);
					}
				}, 0);
			}
			oe(e, t, a, u, !1, l, o, 2, r, p, i);
		} else Ee(e, k(a.chartexStyle), t.chartStyleRoles?.[se ? "dataPoint" : "dataPointLine"], s, p, r, m);
		let h = !se && a.showMarker !== !1 && a.markerSymbol !== "none";
		if (!se && (h || pt(a))) {
			let n = Ye(a.dataPointOverrides);
			for (let s = 0; s < c.length; s++) {
				let l = c[s];
				if (l == null) continue;
				let u = n.get(s), d = zt(a, u, "circle", h);
				if (d === "none") continue;
				let f = u?.markerSize ?? a.markerSize ?? Math.max(4, R * 2 / r), p = Vn(a, u, s, o), m = u?.markerLine ?? a.markerLine ?? null, g = u?.markerLineWidthEmu ?? a.markerLineWidthEmu;
				ra(e, t, a, u, s, l[0], l[1], d, f, p, m, r, g == null ? 1 : lt(g, r), Qn(a, u, s), i);
			}
		}
	}
	Ra(e, t, p, a, o, s, c, g, _, v, y, m.title.bandH + 2, r);
}
function ls(e, t, n, r, i = 0) {
	let { x: a, y: o, w: s, h: c } = n, u = t.series.map((e, t) => ({
		series: e,
		index: t
	})), d = an(t), p = ({ series: e, index: n }) => d[n]?.categoryAxis === "secondary" || t.plotGroups == null && e.useSecondaryAxis === !0, m = ({ series: e, index: n }) => d[n]?.valueAxis === "secondary" || t.plotGroups == null && e.useSecondaryAxis === !0, h = u.filter((e) => !p(e)), g = u.filter(p), y = u.filter((e) => !m(e)), b = u.filter(m), x = u.filter((e) => !p(e) && !m(e)), S = u.filter((e) => p(e) && m(e)), C = g.length > 0 ? t.secondaryCatAxis : null, w = b.length > 0 ? t.secondaryValAxis : null, T = ((e) => {
		let n = [];
		for (let { series: r } of e) {
			let e = r.categories ?? t.categories;
			for (let t of e) {
				let e = parseFloat(t);
				Number.isFinite(e) && n.push(e);
			}
		}
		return n;
	})(u).length === 0, E = u.length === 1 && u[0].series.bubbleXSourceIsString === !0 ? u[0].series.values.length + 1 : null, D = (e) => {
		if (t.plotGroups == null) {
			let e = t.chartType === "bubble";
			return {
				isBubble: e,
				style: e ? "marker" : t.scatterStyle ?? "marker"
			};
		}
		let n = d[e], r = n?.kind === "bubble";
		return {
			isBubble: r,
			style: r ? "marker" : n?.scatterStyle ?? t.scatterStyle ?? "marker"
		};
	}, O = (e, n, r) => {
		let i = [], a = [];
		for (let { series: o, index: s } of e) {
			let e = o.categories ?? t.categories, { style: c, isBubble: l } = D(s), u = _o(t, o, s, e, T, c, l, n, r);
			u?.x && i.push(...u.x), u?.y && a.push(...u.y);
			for (let t = 0; t < o.values.length; t++) {
				let n = o.values[t];
				if (n == null) continue;
				let r = Xa(e, t, T);
				r != null && (i.push(r), a.push(n));
			}
			te(o, "x", (t) => o.values[t] == null ? null : Xa(e, t, T), (e) => i.push(e)), te(o, "y", (t) => Xa(e, t, T) == null ? null : o.values[t] ?? null, (e) => a.push(e));
		}
		if (T && i.length === 0) {
			let t = 0;
			for (let { series: n } of e) t = Math.max(t, n.values.length);
			for (let e = 0; e < t; e++) i.push(e);
		}
		return {
			x: _(i),
			y: _(a)
		};
	}, k = {
		x: O(h.length > 0 ? h : g, t.catAxisLogBase, t.valAxisLogBase).x,
		y: O(y.length > 0 ? y : b, t.catAxisLogBase, t.valAxisLogBase).y
	}, A = {
		x: O(g, C?.logBase, w?.logBase).x,
		y: O(b, C?.logBase, w?.logBase).y
	}, j = ko(e, t, s, c, r), M = j.fontPx, ee = j.topPad, N = Fe(t.catAxisFontSizeHpt, c, r), P = Fe(t.valAxisFontSizeHpt, c, r), F = Fa(e, t, s, c, r), { legRightW: ne, legLeftW: re, legTopH: ae, legBottomH: L } = Dn(F, t.legendOverlay === !0), oe = fn(t, s, c, r), se = oe.catFontPx, R = oe.valFontPx, ce = oe.catBandH, z = oe.valBandW;
	jo(e, t, a, o, s, c, o + ee, M);
	let B = w ? I({
		dataMin: A.y.min,
		dataMax: A.y.max,
		explicitMin: w.min,
		explicitMax: w.max,
		axisLenPt: Math.max(1, c * .7 / r),
		axisOrientation: "vertical",
		majorUnit: w.majorUnit,
		minorUnit: w.minorUnit,
		needMinor: w.minorGridlines === !0 || w.minorTickMark != null && w.minorTickMark !== "none",
		logBase: w.logBase,
		reversed: w.orientation === "maxMin"
	}) : null, ue = 0;
	if (w && B && !w.hidden && w.tickLabelPos !== "none") {
		let n = e.font;
		e.font = bt(hn(w.fontSizeHpt, r) ?? P, Yn(t, w.fontFace, "minor"), w.fontBold ?? !1, w.fontItalic ?? !1);
		for (let n of B.majorTicks) ue = Math.max(ue, Zn(e, Nt(n, w.formatCode, t.date1904, w.displayUnits, w.formatDivisors)));
		ue += Pt(P) + 4, e.font = n;
	}
	let de = C && !C.hidden && C.tickLabelPos !== "none" ? (hn(C.fontSizeHpt, r) ?? N) + Nn(N) + 2 : 0, pe = (e, t, n, i, a, o, s, c) => I({
		dataMin: t ?? e.min,
		dataMax: n ?? e.max,
		explicitMin: t,
		explicitMax: n,
		axisLenPt: Math.max(1, i * .7 / r),
		axisOrientation: a,
		majorUnit: o,
		minorUnit: null,
		needMinor: !1,
		logBase: s,
		reversed: c
	}).majorTicks, me = t.valAxisHidden || t.valAxisTickLabelPos === "none" ? 0 : vn(pe(k.y, t.valMin, t.valMax, c, "vertical", t.valAxisMajorUnit, t.valAxisLogBase, gt(t)).map((e) => Pn(t, e, !1)), Rt(P)), he = w && B && !w.hidden && w.tickLabelPos !== "none" ? vn(B.majorTicks.map((e) => Nt(e, w.formatCode, t.date1904, w.displayUnits, w.formatDivisors)), Rt(hn(w.fontSizeHpt, r) ?? P)) : 0, ge = t.catAxisHidden || t.catAxisTickLabelPos === "none" ? 0 : vn(pe(k.x, t.catAxisMin ?? (E == null ? null : 0), t.catAxisMax ?? E, s, "horizontal", t.catAxisMajorUnit, t.catAxisLogBase, qe(t)).map((e) => Nt(e, t.catAxisFormatCode, t.date1904, t.catAxisDisplayUnits, t.catAxisFormatDivisors)), Rt(N)), _e = C && !C.hidden && C.tickLabelPos !== "none" ? vn(pe(A.x, C.min, C.max, s, "horizontal", C.majorUnit, C.logBase, C.orientation === "maxMin").map((e) => Nt(e, C.formatCode, t.date1904, C.displayUnits, C.formatDivisors)), Rt(hn(C.fontSizeHpt, r) ?? N)) : 0, ve = t.catAxisTickLabelPos === "high", ye = Math.max(Math.max(me, he) / 2, _e) + (ve ? ge : 0), V = ve ? 0 : ge, { plotRect: { px0: be, py0: H, pw: Se, ph: Ce } } = xt(t, a, o, s, c, r, {
		titleBand: j,
		legendReserve: F,
		pad: {
			t: j.bandH + ae + P / 2 + 2 + de + ye,
			r: ne + s * .05 + ue,
			b: (t.catAxisHidden ? c * .04 : At(N) + V) + ce + L,
			l: (t.valAxisHidden ? s * .04 : s * .12) + z + re
		},
		honorPlotAreaManualLayout: !0
	});
	if (Se <= 0 || Ce <= 0) return;
	Mn(e, t, be, H, Se, Ce, r, i);
	let { min: we, max: Te } = k.x, { min: Ee, max: De } = k.y;
	t.valMin != null && (Ee = t.valMin), t.valMax != null && (De = t.valMax);
	let Oe = t.valAxisMinorGridlines === !0 || t.valAxisMinorTickMark != null && t.valAxisMinorTickMark !== "none", ke = I({
		dataMin: Ee,
		dataMax: De,
		explicitMin: t.valMin,
		explicitMax: t.valMax,
		axisLenPt: Ce / r,
		axisOrientation: "vertical",
		majorUnit: t.valAxisMajorUnit,
		minorUnit: t.valAxisMinorUnit,
		needMinor: Oe,
		logBase: t.valAxisLogBase,
		reversed: gt(t)
	});
	Ee = ke.min, De = ke.max;
	let Ae = t.catAxisMinorGridlines === !0 || t.catAxisMinorTickMark != null && t.catAxisMinorTickMark !== "none", je = I({
		dataMin: we,
		dataMax: Te,
		explicitMin: t.catAxisMin ?? (E == null ? null : 0),
		explicitMax: t.catAxisMax ?? E,
		axisLenPt: Se / r,
		axisOrientation: "horizontal",
		majorUnit: t.catAxisMajorUnit,
		minorUnit: t.catAxisMinorUnit,
		needMinor: Ae,
		logBase: t.catAxisLogBase,
		reversed: qe(t)
	});
	we = je.min, Te = je.max;
	let Me = C ? I({
		dataMin: A.x.min,
		dataMax: A.x.max,
		explicitMin: C.min,
		explicitMax: C.max,
		axisLenPt: Se / r,
		axisOrientation: "horizontal",
		majorUnit: C.majorUnit,
		minorUnit: C.minorUnit,
		needMinor: C.minorGridlines === !0 || C.minorTickMark != null && C.minorTickMark !== "none",
		logBase: C.logBase,
		reversed: C.orientation === "maxMin"
	}) : null, Ne = w ? I({
		dataMin: A.y.min,
		dataMax: A.y.max,
		explicitMin: w.min,
		explicitMax: w.max,
		axisLenPt: Ce / r,
		axisOrientation: "vertical",
		majorUnit: w.majorUnit,
		minorUnit: w.minorUnit,
		needMinor: w.minorGridlines === !0 || w.minorTickMark != null && w.minorTickMark !== "none",
		logBase: w.logBase,
		reversed: w.orientation === "maxMin"
	}) : null, Pe = (e) => be + je.fraction(e) * Se, Ie = (e) => H + Ce - ke.fraction(e) * Ce, Le = (e) => be + (Me?.fraction(e) ?? 0) * Se, Re = (e) => H + Ce - (Ne?.fraction(e) ?? 0) * Ce, ze = je.majorUnit, Be = ke.majorTicks, Ve = ke.minorTicks, U = je.majorTicks, He = je.minorTicks, W = H + Ce;
	if (t.catAxisCrossesAt != null) W = G(Ie(t.catAxisCrossesAt), H, H + Ce);
	else {
		let e = t.catAxisCrosses ?? "autoZero";
		e === "autoZero" && Ee < 0 && De > 0 ? W = G(Ie(0), H, H + Ce) : e === "max" && (W = H);
	}
	let Ue = be;
	if (t.valAxisCrossesAt != null) Ue = G(Pe(t.valAxisCrossesAt), be, be + Se);
	else {
		let e = t.valAxisCrosses ?? "autoZero";
		e === "autoZero" && we < 0 && Te > 0 ? Ue = G(Pe(0), be, be + Se) : e === "max" && (Ue = be + Se);
	}
	let We = _n(t, r);
	if (!t.valAxisHidden) {
		let n = t.valAxisFontSizeHpt == null ? Math.max(8, Math.min(11, Ce / 20)) : Fe(t.valAxisFontSizeHpt, c, r), i = t.valAxisFontSizeHpt == null ? 4 : Pt(n);
		e.font = bt(n, Yn(t, t.valAxisFontFace, "minor"), t.valAxisFontBold ?? !1, t.valAxisFontItalic ?? !1);
		let a = t.valAxisLineColor ? `#${t.valAxisLineColor}` : void 0, o = lt(t.valAxisLineWidthEmu, r), s = t.valAxisLineHidden ? 0 : v(t.valAxisMajorTickMark, "major", o, r);
		if (t.valAxisMinorGridlines) {
			let n = jn(t, r);
			for (let t of Ve) Gt(e, be, Se, Ie(t), !1, n);
		}
		for (let c of Be) {
			let u = Ie(c);
			if (e.strokeStyle = We.color, e.lineWidth = We.width, l(t)) {
				let t = We.dash.length > 0 && e.getLineDash ? e.getLineDash() : [];
				We.dash.length > 0 && e.setLineDash(We.dash), e.beginPath(), e.moveTo(be, u), e.lineTo(be + Se, u), e.stroke(), We.dash.length > 0 && e.setLineDash(t);
			}
			if (t.valAxisTickLabelPos !== "none") {
				e.fillStyle = t.valAxisFontColor ? `#${t.valAxisFontColor}` : "#555";
				let r = t.valAxisTickLabelPos ?? "nextTo", a;
				r === "high" ? (e.textAlign = "left", a = be + Se + i) : r === "low" ? (e.textAlign = "right", a = be - i) : (e.textAlign = "right", a = Ue - s - i), e.textBaseline = "middle", dt(e, Pn(t, c, !1), a, u, Rt(n));
			}
			le(e, t.valAxisMajorTickMark, "val", Ue, u, a, o, !1, t.valAxisLineHidden, "major", r, t.valAxisLineDash);
		}
		if (t.valAxisMinorTickMark && t.valAxisMinorTickMark !== "none") for (let n of Ve) le(e, t.valAxisMinorTickMark, "val", Ue, Ie(n), a, o, !1, t.valAxisLineHidden, "minor", r, t.valAxisLineDash);
	}
	if (!t.catAxisHidden && et(t) && ze > 0) {
		let n = ie(t, r);
		e.strokeStyle = n.color, e.lineWidth = n.width;
		let i = n.dash.length > 0 && e.getLineDash ? e.getLineDash() : [];
		n.dash.length > 0 && e.setLineDash(n.dash);
		for (let t of U) {
			let n = Pe(t);
			e.beginPath(), e.moveTo(n, H), e.lineTo(n, H + Ce), e.stroke();
		}
		n.dash.length > 0 && e.setLineDash(i);
	}
	if (!t.catAxisHidden && t.catAxisMinorGridlines && ze > 0) {
		let n = fe(t, r), i = n.dash.length > 0 && e.getLineDash ? e.getLineDash() : [];
		e.strokeStyle = n.color, e.lineWidth = n.width, n.dash.length > 0 && e.setLineDash(n.dash);
		for (let t of He) {
			let n = Pe(t);
			e.beginPath(), e.moveTo(n, H), e.lineTo(n, H + Ce), e.stroke();
		}
		n.dash.length > 0 && e.setLineDash(i);
	}
	if (!t.catAxisHidden && !t.catAxisLineHidden && (e.save(), e.lineCap = "butt", On(e, be, W, be + Se, W, t.catAxisLineColor ? `#${t.catAxisLineColor}` : "#888", lt(t.catAxisLineWidthEmu, r), t.catAxisLineDash), e.restore()), !t.valAxisHidden && !t.valAxisLineHidden && (e.save(), On(e, Ue, H, Ue, H + Ce, t.valAxisLineColor ? `#${t.valAxisLineColor}` : "#888", lt(t.valAxisLineWidthEmu, r), t.valAxisLineDash), e.restore()), !t.catAxisHidden) {
		let n = t.catAxisFontSizeHpt == null ? Math.max(8, Math.min(11, Ce / 20)) : Fe(t.catAxisFontSizeHpt, c, r), i = t.catAxisFontSizeHpt == null ? 4 : Nn(n);
		e.font = bt(n, Yn(t, t.catAxisFontFace, "minor"), t.catAxisFontBold ?? !1, t.catAxisFontItalic ?? !1), e.fillStyle = t.catAxisFontColor ? `#${t.catAxisFontColor}` : "#555", e.textAlign = "center";
		let a = t.catAxisTickLabelPos ?? "nextTo", o = lt(t.catAxisLineWidthEmu, r), s = t.catAxisLineColor ? `#${t.catAxisLineColor}` : void 0, l = t.catAxisLineHidden ? 0 : v(t.catAxisMajorTickMark, "major", o, r), u = a === "low" ? H + Ce + i : a === "high" ? H - i : W + l + i;
		e.textBaseline = a === "high" ? "bottom" : "top";
		for (let i of U) {
			let c = Pe(i);
			a !== "none" && dt(e, Nt(i, t.catAxisFormatCode, t.date1904, t.catAxisDisplayUnits, t.catAxisFormatDivisors), c, u, Rt(n)), le(e, t.catAxisMajorTickMark, "cat", W, c, s, o, !1, t.catAxisLineHidden, "major", r, t.catAxisLineDash);
		}
		if (t.catAxisMinorTickMark && t.catAxisMinorTickMark !== "none") for (let n of He) le(e, t.catAxisMinorTickMark, "cat", W, Pe(n), s, o, !1, t.catAxisLineHidden, "minor", r, t.catAxisLineDash);
	}
	let Ge = (l, u, d, f, p, m, h, g) => {
		l.length !== 0 && bo(e, t, l, T, f, p, n, be, H, Se, Ce, r, u, d, {
			x: a,
			y: o,
			w: s,
			h: c
		}, m, h, i, g);
	};
	if (t.plotGroups == null) {
		let e = t.chartType === "bubble", n = e ? "marker" : t.scatterStyle ?? "marker";
		Ge(x, e, n, Pe, Ie, ke.max, t.valAxisDisplayUnits), S.length > 0 && Me && Ne && Ge(S, e, n, Le, Re, Ne.max, w?.displayUnits);
	} else for (let e of t.plotGroups) {
		if (e.kind !== "scatter" && e.kind !== "bubble") continue;
		let n = t.series.slice(e.seriesStart, e.seriesStart + e.seriesCount).map((t, n) => ({
			series: t,
			index: e.seriesStart + n
		}));
		if (n.length === 0) continue;
		let r = e.kind === "bubble", i = e.categoryAxis === "secondary", a = e.valueAxis === "secondary";
		Ge(n, r, r ? "marker" : e.scatterStyle ?? t.scatterStyle ?? "marker", i ? Le : Pe, a ? Re : Ie, a && Ne ? Ne.max : ke.max, a ? w?.displayUnits : t.valAxisDisplayUnits, r ? {
			bubbleScale: e.bubbleScale ?? t.bubbleScale,
			bubbleSizeRepresents: e.bubbleSizeRepresents ?? t.bubbleSizeRepresents,
			showNegativeBubbles: e.showNegativeBubbles ?? t.showNegativeBubbles
		} : void 0);
	}
	if (C && Me && !C.hidden) {
		let n = f(C.lineColor, C.lineWidthEmu, r);
		C.lineHidden || On(e, be, H, be + Se, H, n.color, n.width, C.lineDash);
		let i = hn(C.fontSizeHpt, r) ?? N;
		e.font = bt(i, Yn(t, C.fontFace, "minor"), C.fontBold ?? !1, C.fontItalic ?? !1), e.fillStyle = C.fontColor ? `#${C.fontColor}` : "#555", e.textAlign = "center", e.textBaseline = "bottom";
		let a = C.lineHidden ? 0 : v(C.majorTickMark, "major", n.width, r);
		for (let o of Me.majorTicks) {
			let s = Le(o);
			C.tickLabelPos !== "none" && dt(e, Nt(o, C.formatCode, t.date1904, C.displayUnits, C.formatDivisors), s, H - a - Nn(i), Rt(i)), le(e, C.majorTickMark, "cat", H, s, n.color, n.width, !0, C.lineHidden, "major", r, C.lineDash);
		}
		if (C.minorTickMark && C.minorTickMark !== "none") for (let t of Me.minorTicks) le(e, C.minorTickMark, "cat", H, Le(t), n.color, n.width, !0, C.lineHidden, "minor", r, C.lineDash);
	}
	w && Ne && xe(e, t, w, {
		min: Ne.min,
		max: Ne.max,
		step: Ne.majorUnit,
		majorLines: Ne.majorTicks,
		minorTicks: Ne.minorTicks,
		makeToY: () => Re
	}, Re, n, be, H, Se, Ce, r, hn(w.fontSizeHpt, r) ?? P, ue, t.valAxisFontColor ? `#${t.valAxisFontColor}` : "#555", t.date1904), Ra(e, t, F, a, o, s, c, be, H, Se, Ce, j.bandH + 2, r), nt(e, t, a, o, s, c, be, H, Se, Ce, re, L, se, R);
}
var us = (e, t, n, r, i) => Lo(e, t, n, r, {}, i), ds = (e, t, n, r, i) => $o(e, t, n, !1, r, i), fs = (e, t, n, r, i) => $o(e, t, n, !0, r, i), ps = {
	"bar-combo": us,
	"line-groups": Ho,
	"area-groups": Yo,
	"scatter-bubble": ls,
	"stock-line": Uo
}, ms = {
	clusteredBar: us,
	clusteredBarH: us,
	stackedBar: us,
	stackedBarH: us,
	stackedBarPct: us,
	stackedBarHPct: us,
	line: Ho,
	stackedLine: Ho,
	stackedLinePct: Ho,
	area: Yo,
	stackedArea: Yo,
	stackedAreaPct: Yo,
	pie: ds,
	ofPie: Qo,
	doughnut: fs,
	radar: cs,
	scatter: ls,
	bubble: ls,
	stock: Uo,
	surface: Jo,
	surface3D: Jo
};
function hs(e, t, n, r = ar, i = 0, a, o, s, c, l = yn(t)) {
	e.save();
	try {
		if (wo(e, n, l)) return;
		t = Rn(t, r);
		let { x: u, y: d, w: f, h: p } = n, m = t.roundedCorners === !0, h = m ? 10 * r : 0, g = (e) => {
			m ? (Eo(e, u, d, f, p, h), e.fill()) : e.fillRect(u, d, f, p);
		};
		Ee(e, t.chartAreaStyle, t.chartStyleRoles?.chartArea, 0, n, r, (e) => {
			if (t.chartFillHidden !== !0) if (t.chartFill?.fillType === "image") m ? (e.save(), Eo(e, u, d, f, p, h), e.clip(), zn(e, t.chartFill, u, d, f, p, r, i), e.restore()) : zn(e, t.chartFill, u, d, f, p, r, i);
			else if (t.chartFill) {
				let n = cr(t.chartFill, e, u, d, f, p, i);
				n && (e.fillStyle = n), n && g(e);
			} else t.chartBg && (e.fillStyle = `#${t.chartBg}`, g(e));
			if (t.chartBorderHidden !== !0 && (t.chartBorderLineFill || t.chartBorderColor)) {
				e.save();
				let n = t.chartBorderLineFill ? cr(t.chartBorderLineFill, e, u, d, f, p, i) : t.chartBorderColor ? `#${t.chartBorderColor}` : null;
				if (!n) e.restore();
				else {
					e.strokeStyle = n;
					let i = t.chartBorderWidthEmu ? Math.max(.5, t.chartBorderWidthEmu / ir) * r : 1;
					e.setLineDash(P(t.chartBorderCustomDash, t.chartBorderDash, i)), e.lineCap = t.chartBorderCap === "rnd" ? "round" : t.chartBorderCap === "sq" ? "square" : "butt", e.lineJoin = t.chartBorderJoin === "round" || t.chartBorderJoin === "bevel" ? t.chartBorderJoin : "miter", tt(e, u, d, f, p, i, t.chartBorderCompound, m ? h : 0), e.restore();
				}
			}
		});
		let _ = t.chartexBox != null || t.chartexSunburst != null || t.chartexTreemap != null || t.chartexRegionMap != null;
		if (t.series.length === 0 && !_) {
			t.authoredWithoutSeries !== !0 && (e.fillStyle = "#888", e.font = "12px sans-serif", e.textAlign = "center", e.textBaseline = "middle", e.fillText("(no data)", u + f / 2, d + p / 2)), To(e, t, n, r);
			return;
		}
		let v = Et(t), y = (v != null || t.chartexBox != null) && (v ?? 0) <= 1e4 ? So(t, s, r, n) : null, b = Co(t, a), x = v != null && v <= 1e4 ? Rr(t, s, r, n, b != null) : null, S = uo(t, a, s, r, n);
		if ((v != null || y != null || x != null || b != null || S != null) && wo(e, n, Math.max(v ?? 0, y != null && y + (x ?? 0) > Ei ? 10001 : 0, x != null && x > Ei ? 10001 : 0, b ?? 0, S != null && S > Oi ? 10001 : 0))) {
			To(e, t, n, r);
			return;
		}
		let C = Ct(t);
		if (C === "unsupported") {
			e.fillStyle = "#888", e.font = "11px sans-serif", e.textAlign = "center", e.textBaseline = "middle", e.fillText("Unsupported chart", u + f / 2, d + p / 2), To(e, t, n, r);
			return;
		}
		if (C !== "legacy") {
			ps[C]?.(e, t, n, r, i), st(e, t, n, r), To(e, t, n, r);
			return;
		}
		if (a?.render(e, t, n, r, i)) {
			st(e, t, n, r), To(e, t, n, r);
			return;
		}
		if (o?.render(e, t, n, r, i)) {
			To(e, t, n, r);
			return;
		}
		if (c?.render(e, t, n, r, i)) {
			st(e, t, n, r), To(e, t, n, r);
			return;
		}
		let w = Object.hasOwn(ms, t.chartType) ? ms[t.chartType] : void 0;
		w ? w(e, t, n, r, i) : (e.fillStyle = "#888", e.font = "11px sans-serif", e.textAlign = "center", e.textBaseline = "middle", e.fillText("Unsupported chart", u + f / 2, d + p / 2)), st(e, t, n, r), To(e, t, n, r);
	} finally {
		e.restore();
	}
}
function gs(t, n, r = ar, i = 0, a, o, s, l) {
	if (!sn(t).some(({ fill: e }) => mn(e))) return [];
	let u = /* @__PURE__ */ new Map(), d = null;
	try {
		d = e(1, 1);
		let f = d?.getContext("2d");
		if (!d || !f) throw new c("unsupported-image-effect", "Chart occurrence surface unavailable");
		let p = d;
		ut(p), vs(f, t, n, r, i, a, o, (e, t) => {
			if (!mn(e)) return null;
			let n = l?.(e, t);
			if (n !== void 0) return n;
			if (t) {
				let n = En(e, void 0, t);
				u.has(n) || (ht(u.size + 1, 256), u.set(n, {
					fill: e,
					occurrence: t
				}));
			}
			return p;
		}, s);
	} catch (e) {
		throw wi(e);
	} finally {
		d && (d.width = 0);
	}
	return [...u.values()];
}
function _s(e) {
	ht(e, 256);
}
function vs(e, t, n, r = ar, i = 0, a, o, s, c) {
	lr(e, r, () => u(() => {
		We(() => {
			Xn(s, () => {
				let l = yn(t), u = l <= 1e4 ? kt(Tn(t)) : t;
				h(e, () => {
					hs(e, u, n, r, i, a, o, s, c, l);
				}, void 0, l <= 1e4 ? In(u) : 1);
			});
		});
	}));
}
export { qi as A, Ur as B, Gi as C, Qi as D, Bi as E, Si as F, Hr as H, ui as I, ri as L, wi as M, hi as N, Ki as O, xi as P, ii as R, Ii as S, zi as T, Br as V, Ni as _, Io as a, Xi as b, ko as c, io as d, Ra as f, Ji as g, Hi as h, Ho as i, Vi as j, Ui as k, wo as l, aa as m, gs as n, Lo as o, Fa as p, vs as r, jo as s, _s as t, ao as u, Li as v, Ai as w, Wi as x, Ri as y, ti as z };
