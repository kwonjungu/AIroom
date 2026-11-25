import { M as e, m as t, p as n, r } from "./wmf-HY7sNn5s.js";
import { n as i } from "./substitutions-_KDT_mVq.js";
import { t as a } from "./ooxml-error-DbICW35n.js";
import { i as o, n as s, o as c, t as l } from "./units-BBDOirYi.js";
import { u } from "./pixel-budget-DI82Hn3R.js";
import { c as d, i as f, o as p, u as m } from "./paint-s8gGHFU5.js";
import { g as h, m as g, n as _, r as v, t as y } from "./chart-number-format-BTQAc_0Z.js";
var b = [
	"fontSizeHpt",
	"fontBold",
	"fontItalic",
	"fontFace",
	"fontLanguage",
	"fontBaseline",
	"textRotation",
	"textWrap",
	"textVerticalAnchor",
	"textVerticalMode",
	"textLInsEmu",
	"textTInsEmu",
	"textRInsEmu",
	"textBInsEmu",
	"textBodyAuthored"
], x = [
	"fontColor",
	"fontColors",
	"fontColorIndex",
	"fontFormattingIndices",
	"fontPaintAuthored",
	"fontHidden"
], S = [
	"fillPaints",
	"fillColors",
	"fillHidden",
	"fillPaintAuthored",
	"fillNoStyle",
	"fillColorIndex",
	"fillFormattingIndices",
	"fillSemanticFallbackIndices"
], C = [
	"lineColors",
	"linePaints",
	"linePaintAuthored",
	"lineHidden",
	"lineNoStyle",
	"lineColorIndex",
	"lineFormattingIndices",
	"lineSemanticFallbackIndices"
], w = [
	"shapePropertiesPresent",
	"allowNoFillOverride",
	"allowNoLineOverride"
], T = [
	"lineWidthEmu",
	"lineCap",
	"lineJoin",
	"lineCompound"
], E = [
	"lineDash",
	"lineDashAuthored",
	"lineCustomDash"
], D;
function O(e) {
	if (D) return e();
	D = /* @__PURE__ */ new WeakMap();
	try {
		return e();
	} finally {
		D = void 0;
	}
}
function k(e) {
	let t = D?.get(e);
	if (t) return t;
	let n = /* @__PURE__ */ new WeakMap();
	for (let t = 0; t < e.series.length; t++) n.set(e.series[t], t);
	let r = new Int32Array(e.series.length);
	r.fill(-1);
	for (let t = 0; t < (e.plotGroups?.length ?? 0); t++) {
		let n = e.plotGroups[t], i = Math.min(e.series.length, n.seriesStart + n.seriesCount);
		for (let e = Math.max(0, n.seriesStart); e < i; e++) r[e] = t;
	}
	let i = {
		series: n,
		groupBySeries: r
	};
	return D?.set(e, i), i;
}
function A(e, t, n = -1) {
	return k(e).series.get(t) ?? n;
}
function j(e, t) {
	return t >= 0 && t < e.series.length ? k(e).groupBySeries[t] ?? -1 : -1;
}
function ee(e, t) {
	let n = j(e, t);
	return n >= 0 ? e.plotGroups?.[n] : void 0;
}
function M(...e) {
	for (let t of e) if (t != null && (t.lineDashAuthored === !0 || t.lineDash != null || t.lineCustomDash != null)) return t;
}
var N = [
	"shadows",
	"innerShadows",
	"glows",
	"softEdges",
	"reflections",
	"effectAuthored",
	"effectNoStyle",
	"effectUnsupported",
	"effectFormattingIndices",
	"effectColorIndex"
];
function P(e, t, n) {
	if (!t) return;
	let r = e, i = t;
	for (let e of n) {
		let t = i[e];
		t != null && (r[e] = t);
	}
}
function F(e, t) {
	let n = e;
	return t.some((e) => n[e] !== void 0 && n[e] !== null);
}
function I(e, t) {
	if (!e) return t ?? void 0;
	if (!t) return e;
	let n = {};
	if (P(n, e, b), P(n, t, b), P(n, e, x), F(t, x)) {
		for (let e of x) delete n[e];
		P(n, t, x);
	}
	if (P(n, e, S), t.fillNoStyle !== !0 && F(t, S)) {
		for (let e of S) delete n[e];
		P(n, t, S);
	}
	if (P(n, e, C), P(n, e, T), P(n, e, E), t.lineNoStyle !== !0 && F(t, C)) {
		for (let e of C) delete n[e];
		P(n, t, C);
	}
	if (P(n, t, T), F(t, E)) {
		for (let e of E) delete n[e];
		P(n, t, E);
	}
	if (P(n, e, N), t.effectNoStyle !== !0 && F(t, N)) {
		for (let e of N) delete n[e];
		P(n, t, N);
	}
	return P(n, t, w), n;
}
var te = [
	"dataPoint",
	"dataPoint3D",
	"dataPointLine",
	"dataPointMarker",
	"dataPointWireframe",
	"upBar",
	"downBar",
	"hiLoLine"
], ne = new Set([
	"boxWhisker",
	"clusteredColumn",
	"funnel",
	"histogram",
	"pareto",
	"paretoLine",
	"regionMap",
	"sunburst",
	"treemap",
	"waterfall"
]), re = Symbol("chartExDelegate");
function ie(e, t) {
	return {
		...e,
		...t,
		[re]: !0
	};
}
function L(e) {
	return ne.has(e.chartType) || e[re] === !0;
}
function ae(e) {
	if (!e) return e;
	let t = { ...e };
	for (let e of te) delete t[e];
	return t;
}
function oe(e) {
	let t = e.classicChartStyleRoles, n = !L(e), r = e.linkedChartStyleRoles ?? e.chartStyleRoles, i = n ? ae(r) : r;
	if (!t) return n ? {
		...e,
		linkedChartStyleRoles: ae(e.linkedChartStyleRoles),
		chartStyleRoles: ae(e.chartStyleRoles),
		chartexDataPointStyle: void 0,
		chartexDataPointLineStyle: void 0,
		chartexDataPointMarkerStyle: void 0
	} : e;
	let a = new Set([...Object.keys(t), ...Object.keys(i ?? {})]), o = {};
	for (let e of a) {
		let n = I(t[e], i?.[e]);
		n && (o[e] = n);
	}
	let s = {};
	for (let n of [
		"dataPoint",
		"dataPoint3D",
		"dataPointLine",
		"dataPointMarker"
	]) {
		let r = I(e.classicVaryingPointChartStyleRoles?.[n] ?? t[n], i?.[n]);
		r && (s[n] = r);
	}
	let c = e.classicVaryingPointChartStyleRolesByGroup?.map((e) => {
		if (!e) return null;
		let t = {};
		for (let n of [
			"dataPoint",
			"dataPoint3D",
			"dataPointLine",
			"dataPointMarker"
		]) {
			let r = I(e[n], i?.[n]);
			r && (t[n] = r);
		}
		return t;
	});
	return {
		...e,
		linkedChartStyleRoles: i,
		chartStyleRoles: o,
		varyingPointChartStyleRoles: Object.keys(s).length > 0 ? s : void 0,
		varyingPointChartStyleRolesByGroup: c,
		chartexDataPointStyle: o.dataPoint,
		chartexDataPointLineStyle: o.dataPointLine,
		chartexSeriesLineStyle: o.seriesLine,
		chartexDataPointMarkerStyle: o.dataPointMarker
	};
}
function R(e, t) {
	return e.linkedChartStyleRoles?.[t] ?? (e.classicChartStyleRoles == null ? e.chartStyleRoles?.[t] : void 0);
}
function z(e, t) {
	let n = ee(e, t);
	return n ? n.kind === "pie" || n.kind === "pie3D" || n.kind === "doughnut" || n.kind === "ofPie" ? n.varyColors !== !1 : n.kind === "bubble" ? n.seriesCount === 1 && n.varyColors !== !1 : n.kind === "line" || n.kind === "scatter" ? n.seriesCount === 1 && n.varyColors === !0 : n.kind === "radar" ? n.radarStyle !== "filled" && n.seriesCount === 1 && n.varyColors === !0 : (n.kind === "bar" || n.kind === "bar3D") && n.seriesCount === 1 && n.varyColors === !0 : e.chartType === "pie" || e.chartType === "pie3D" || e.chartType === "doughnut" || e.chartType === "ofPie" ? e.varyColors !== !1 : e.chartType === "bubble" ? e.series.length === 1 && e.varyColors !== !1 : e.varyColors === !0 && e.series.length === 1 && (e.chartType.includes("Bar") || e.chartType === "line" || e.chartType === "stackedLine" || e.chartType === "stackedLinePct" || e.chartType === "scatter" || e.chartType === "radar" && e.radarStyle !== "filled");
}
function B(e, t, n) {
	if (!z(e, n)) return e.chartStyleRoles?.[t];
	let r = j(e, n), i = r >= 0 ? e.varyingPointChartStyleRolesByGroup?.[r] : void 0;
	return i == null ? e.varyingPointChartStyleRoles?.[t] ?? e.chartStyleRoles?.[t] : i[t];
}
var V;
function se(e) {
	if (V) return e();
	V = {
		compact: /* @__PURE__ */ new WeakMap(),
		membership: /* @__PURE__ */ new WeakMap()
	};
	try {
		return e();
	} finally {
		V = void 0;
	}
}
function ce(e, t) {
	if (!V) return e.indexOf(t);
	let n = V.compact.get(e);
	if (!n) {
		let t = /* @__PURE__ */ new Map();
		for (let n = 0; n < e.length; n++) {
			let r = e[n];
			t.has(r) || t.set(r, n);
		}
		n = t, V.compact.set(e, n);
	}
	return n.get(t) ?? -1;
}
function le(e, t) {
	if (!e) return !1;
	if (!V) return e.includes(t);
	let n = V.membership.get(e);
	return n || (n = new Set(e), V.membership.set(e, n)), n.has(t);
}
function ue(e, t, n) {
	let r = t === "font" ? e.fontFormattingIndices : t === "fill" ? e.fillFormattingIndices : t === "line" ? e.lineFormattingIndices : e.effectFormattingIndices, i = r ? ce(r, n) : -1;
	return i >= 0 ? i : n;
}
function de(e, t) {
	if (!e) return null;
	if (!e.fontColors?.length) return e.fontColor ?? null;
	let n = e.fontColorIndex ?? ue(e, "font", t);
	return e.fontColors[n % e.fontColors.length] ?? null;
}
function fe(e, t, n) {
	if (!e) return null;
	let r = t === "fill" ? e.fillColors : e.lineColors;
	return r?.length ? r[((t === "fill" ? e?.fillColorIndex : e?.lineColorIndex) ?? ue(e, t, n)) % r.length] ?? null : null;
}
function pe(e, t) {
	if (!e) return null;
	let n = e.fillPaints;
	return n?.length ? n[(e.fillColorIndex ?? ue(e, "fill", t)) % n.length] ?? null : null;
}
function me(e, t) {
	if (!e) return null;
	let n = e.linePaints;
	return n?.length ? n[(e.lineColorIndex ?? ue(e, "line", t)) % n.length] ?? null : null;
}
function H(e, t) {
	if (!e) return;
	if (e.fillHidden) return e.fillNoStyle ? void 0 : null;
	if (le(e.fillSemanticFallbackIndices, t)) return;
	let n = pe(e, t);
	if (n) return n;
	let r = fe(e, "fill", t);
	return r ? {
		fillType: "solid",
		color: r
	} : e.fillPaintAuthored === !0 ? null : void 0;
}
function U(e, t) {
	if (!e) return;
	if (e.lineHidden) return e.lineNoStyle ? void 0 : null;
	if (le(e.lineSemanticFallbackIndices, t)) return;
	let n = me(e, t);
	if (n) return n;
	let r = fe(e, "line", t);
	return r ? {
		fillType: "solid",
		color: r
	} : e.linePaintAuthored === !0 ? null : void 0;
}
function he(e) {
	let t = e?.chartexStyle;
	return e?.fillHidden === !0 || e?.color != null || t != null && t.fillNoStyle !== !0 && (t.fillPaintAuthored === !0 || t.fillHidden === !0 || t.fillColors?.some((e) => e != null) === !0 || t.fillPaints?.some((e) => e != null) === !0);
}
function ge(e) {
	let t = e?.chartexStyle;
	return e?.lineHidden != null || e?.lineColor != null || e?.lineWidthEmu != null || e?.lineDash != null || t?.linePaintAuthored === !0 || t?.lineHidden != null || t?.lineColors?.some((e) => e != null) === !0 || t?.linePaints?.some((e) => e != null) === !0 || t?.lineWidthEmu != null || t?.lineDash != null || t?.lineCustomDash != null || t?.lineCap != null || t?.lineJoin != null;
}
function _e(e, t, n, r, i = e.chartexDataPointStyle) {
	let a = he(n), o = a ? n?.fillHidden === !0 ? {
		...n.chartexStyle,
		fillHidden: !0,
		fillPaintAuthored: !0
	} : n?.chartexStyle : t?.chartexStyle, s = a ? n?.color : t?.color, c = H(o, r);
	return c === void 0 ? s ? {
		fillType: "solid",
		color: s
	} : H(i, r) : c;
}
function ve(e, t, n, r, i = e.chartexDataPointStyle) {
	for (let e of [n, t]) {
		if (!e) continue;
		if (e.lineHidden === !0) return null;
		let t = U(e.chartexStyle, r);
		if (t !== void 0) return t;
		if (e.lineColor) return {
			fillType: "solid",
			color: e.lineColor
		};
	}
	return U(i, r);
}
function ye(e, t) {
	return e == null ? !0 : t === "fill" ? e.fillNoStyle === !0 || e.allowNoFillOverride === !0 : e.lineNoStyle === !0 || e.allowNoLineOverride === !0;
}
function W(e, t, n) {
	let r = H(e, n);
	return r === null && e?.fillHidden === !0 && !ye(t, "fill") ? void 0 : r;
}
function be(e, t, n) {
	let r = U(e, n);
	return r === null && e?.lineHidden === !0 && !ye(t, "line") ? void 0 : r;
}
function G(e) {
	return ye(e, "fill") ? null : void 0;
}
function xe(e) {
	return ye(e, "line") ? null : void 0;
}
function K(e, t, n, ...r) {
	for (let e of r) {
		let r = W(e, t, n);
		if (r !== void 0) return r;
	}
	return H(e, n);
}
function Se(e, t, n, ...r) {
	for (let e of r) {
		let r = be(e, t, n);
		if (r !== void 0) return r;
	}
	return U(e, n);
}
function Ce(e, t, n) {
	let r = R(e, n);
	if (t.fillHidden === !0) {
		let e = G(r);
		if (e !== void 0) return e;
	}
	if (t.fill != null) return t.fill;
	if (t.fillColor != null) return {
		fillType: "solid",
		color: t.fillColor
	};
	let i = W(t.style, r, 0);
	return i === void 0 ? t.fillPaintAuthored === !0 && t.fillHidden !== !0 ? null : K(e.chartStyleRoles?.[n], r, 0, t.style) : i;
}
function we(e, t, n) {
	let r = t?.style, i = e.chartStyleRoles?.[n], a = R(e, n), o;
	t?.fillHidden === !0 ? (o = G(a), o === void 0 && (o = H(i, 0))) : o = t?.fillColor ? {
		fillType: "solid",
		color: t.fillColor
	} : K(i, a, 0, r);
	let s;
	t?.lineHidden === !0 ? (s = xe(a), s === void 0 && (s = U(i, 0))) : s = t?.lineColor ? {
		fillType: "solid",
		color: t.lineColor
	} : Se(i, a, 0, r);
	let c = i, l = M(t?.lineDash == null ? void 0 : {
		lineDash: t.lineDash,
		lineDashAuthored: !0
	}, r, c);
	return {
		fill: o,
		line: s,
		lineWidthEmu: t?.lineWidthEmu ?? r?.lineWidthEmu ?? c?.lineWidthEmu,
		lineDash: l?.lineDash,
		lineCustomDash: l?.lineCustomDash,
		lineCap: r?.lineCap ?? c?.lineCap,
		lineJoin: r?.lineJoin ?? c?.lineJoin
	};
}
function Te(e, t, n, r, i) {
	let a = r?.chartexStyle, o = n.chartexStyle, s = A(e, n), c = B(e, t, s >= 0 ? s : i) ?? (t === "dataPoint" ? e.chartexDataPointStyle : e.chartexDataPointLineStyle), l = R(e, t), u = L(e) ? ve(e, n, r, i) : r?.lineHidden === !0 ? null : be(a, l, r?.idx ?? i);
	u === void 0 && r?.lineColor && (u = {
		fillType: "solid",
		color: r.lineColor
	}), u === void 0 && (u = n.lineHidden === !0 ? null : be(o, l, i)), u === void 0 && n.lineColor && (u = {
		fillType: "solid",
		color: n.lineColor
	}), u === void 0 && (u = U(c, i));
	let d = M(r?.lineDash == null ? void 0 : {
		lineDash: r.lineDash,
		lineDashAuthored: !0
	}, a, o, c);
	return {
		paint: u,
		widthEmu: r?.lineWidthEmu ?? a?.lineWidthEmu ?? n.lineWidthEmu ?? o?.lineWidthEmu ?? c?.lineWidthEmu,
		dash: d?.lineDash,
		customDash: d?.lineCustomDash,
		cap: a?.lineCap ?? o?.lineCap ?? c?.lineCap,
		join: a?.lineJoin ?? o?.lineJoin ?? c?.lineJoin
	};
}
function Ee(e, t, n, r, i) {
	if (L(e)) return _e(e, t, n, r);
	let a = A(e, t), o = B(e, "dataPoint", a >= 0 ? a : r) ?? e.chartexDataPointStyle, s = R(e, "dataPoint"), c = W(n?.chartexStyle, s, n?.idx ?? r);
	if (c !== void 0) return c;
	if (n?.fillHidden === !0) {
		let e = G(s);
		if (e !== void 0) return e;
	}
	if (n?.color === "00000000") return null;
	if (n?.color) return {
		fillType: "solid",
		color: n.color
	};
	let l = i == null ? null : t.dataPointColors?.[i];
	if (l === "00000000") return null;
	if (l) return {
		fillType: "solid",
		color: l
	};
	let u = W(t.chartexStyle, s, r);
	return u === void 0 ? t.color === "00000000" ? null : t.fillPattern ? t.fillPattern : H(o, r) : u;
}
function De(e, t) {
	return t == null || !Number.isFinite(t) ? e : e * Math.max(0, Math.min(1e3, t)) / 100;
}
function Oe(e, t, n, r = !1) {
	let i = Math.max(0, t - 1), a = Number.isFinite(e) ? Math.max(0, Math.min(i, e)) : 0, o = n ? (a + .5) / Math.max(1, t) : t === 1 ? .5 : a / i;
	return r ? 1 - o : o;
}
function ke(e, t) {
	if (e <= 0) return [];
	let n = [], r = t ? e : e - 1;
	for (let i = 0; i <= r; i++) n.push(t ? i / e : e === 1 ? .5 : i / (e - 1));
	return n;
}
function Ae(e, t) {
	return e <= 0 ? [] : t ? Array.from({ length: e }, (t, n) => (n + .5) / e) : e <= 1 ? [] : Array.from({ length: e - 1 }, (t, n) => (n + .5) / (e - 1));
}
function je(e, t, n, r, i) {
	if (i == null) return {
		fraction: Oe(e, t, n, r),
		textAlign: "center"
	};
	let a = Math.max(0, t - 1), o = Number.isFinite(e) ? Math.max(0, Math.min(a, e)) : 0, s, c;
	if (t <= 1 ? (s = 0, c = 1) : n ? (s = o / t, c = (o + 1) / t) : (s = o === 0 ? 0 : (o - .5) / a, c = o === a ? 1 : (o + .5) / a), r) {
		let e = 1 - c;
		c = 1 - s, s = e;
	}
	return i === "l" ? {
		fraction: s,
		textAlign: "left"
	} : i === "r" ? {
		fraction: c,
		textAlign: "right"
	} : {
		fraction: (s + c) / 2,
		textAlign: "center"
	};
}
function Me(e, t) {
	return e != null && Number.isFinite(e) ? Math.max(0, Math.min(500, e)) : t === "legacy" ? 150 : 33;
}
function Ne(e) {
	if (e.categories.length > 0) return e.categories;
	let t = e.series[0];
	if (t?.categories && t.categories.length > 0) return t.categories;
	let n = 0;
	for (let t of e.series) t.values.length > n && (n = t.values.length);
	return n > 0 ? Array.from({ length: n }, (e, t) => String(t + 1)) : [];
}
var Pe = "…";
function Fe(e, t, n) {
	if (t === "" || n <= 0) return "";
	if (e.measureText(t).width <= n) return t;
	if (e.measureText(Pe).width > n) return "";
	let r = 0, i = t.length - 1, a = 0;
	for (; r <= i;) {
		let o = r + i >> 1;
		e.measureText(t.slice(0, o) + Pe).width <= n ? (a = o, r = o + 1) : i = o - 1;
	}
	let o = a > 0 ? t.charCodeAt(a - 1) : 0;
	return o >= 55296 && o <= 56319 && a--, t.slice(0, a) + Pe;
}
var Ie = /\r\n|\r|\n/, Le = /^(?:\r\n|\r|\n)+|(?:\r\n|\r|\n)+$/g;
function Re(e) {
	return e + 2;
}
function ze(e) {
	return Ie.test(e) ? e.replace(Le, "").split(Ie) : [e];
}
function Be(e) {
	return ze(e).length;
}
function Ve(e) {
	let t = 1;
	for (let n of e) t = Math.max(t, Be(n));
	return t;
}
function He(e, t, n = 0) {
	let r = Ve(e) - 1;
	if (r <= 0) return 0;
	let i = r * t;
	return n === 0 ? i : i * Math.abs(Math.cos(n));
}
function Ue(e, t) {
	let n = ze(t);
	if (n.length === 1) return e.measureText(n[0]).width;
	let r = 0;
	for (let t of n) r = Math.max(r, e.measureText(t).width);
	return r;
}
function We(e, t, n) {
	let r = (t - 1) * n, i = e.textBaseline;
	return i === "top" || i === "hanging" ? 0 : i === "middle" ? -r / 2 : -r;
}
function Ge(e, t, n, r, i, a) {
	qe(e, t, n, r, i, a, !1);
}
function Ke(e, t, n, r, i, a) {
	qe(e, t, n, r, i, a, !0);
}
function qe(e, t, n, r, i, a, o) {
	let s = ze(t), c = (t) => a == null ? t : Fe(e, t, a);
	if (s.length === 1) {
		e.fillText(c(s[0]), n, r);
		return;
	}
	let l = o ? r : r + We(e, s.length, i);
	s.forEach((t, r) => {
		let a = c(t);
		a && e.fillText(a, n, l + r * i);
	});
}
function Je(e, t, n) {
	let r = Math.max(1, t), i = [], a = [], o = 0;
	for (let t = 0; t < e.length; t++) {
		let s = Math.min(r, Math.max(0, e[t])), c = a.length === 0 ? s : o + n + s;
		a.length > 0 && c > r ? (i.push(a), a = [t], o = s) : (a.push(t), o = c);
	}
	return a.length > 0 && i.push(a), i;
}
var Ye = 14;
function Xe(e, t) {
	return typeof e == "number" && Number.isFinite(e) && e >= 100 && e <= 4e5 ? e / 100 * t : null;
}
function Ze(e, t, n) {
	return Xe(e.titleFontSizeHpt, n) ?? Ye * n;
}
var Qe = .62;
function $e(e, t, n, r, i) {
	if (!e.title && !e.titlePresent) return {
		fontPx: 0,
		topPad: 0,
		bottomPad: 0,
		bandH: 0
	};
	let a = Ze(e, t, n), o = a + t * r + t * i, s = Math.min(Math.max(0, o - a), a * Qe);
	return ot(e, {
		fontPx: a,
		topPad: s,
		bottomPad: o - a - s,
		bandH: o
	});
}
function et(e, t, n, r) {
	if (!e.showLegend) return null;
	let i = e.legendPos ?? "r", a = i === "l" ? "l" : i === "t" ? "t" : i === "b" ? "b" : "r";
	if (a === "r" || a === "l") {
		let e = Math.min(80, t * .3), n = t * .3, i = Math.max(0, ...r.itemWidths) + r.horizontalPadding;
		return {
			side: a,
			reserveW: Math.min(n, Math.max(e, i)),
			reserveH: 0
		};
	}
	let o = Math.max(1, t - r.horizontalPadding), s = Je(r.itemWidths, o, r.itemGap).length * r.rowHeight + r.verticalPadding;
	return {
		side: a,
		reserveW: 0,
		reserveH: Math.min(n * .3, s)
	};
}
function tt(e, t = !1) {
	return t ? {
		legRightW: 0,
		legLeftW: 0,
		legTopH: 0,
		legBottomH: 0
	} : {
		legRightW: e?.side === "r" ? e.reserveW : 0,
		legLeftW: e?.side === "l" ? e.reserveW : 0,
		legTopH: e?.side === "t" ? e.reserveH : 0,
		legBottomH: e?.side === "b" ? e.reserveH : 0
	};
}
var nt = 10;
function rt(e, t) {
	return Xe(e, t) ?? nt * t;
}
function it(e, t) {
	return Math.max(0, e != null && Number.isFinite(e) ? e : 0) / o * t;
}
function at(e, t) {
	return e ? He([e], t) : 0;
}
function ot(e, t) {
	if (e.titleRichRuns?.length) return t;
	let n = at(e.title, t.fontPx);
	return n > 0 ? {
		...t,
		bandH: t.bandH + n
	} : t;
}
function st(e, t, n, r, i) {
	let a = at(e, t);
	if (a === 0) return 0;
	let o = ct(n, r, i);
	return a * Math.abs(n === "horizontal" ? Math.cos(o) : Math.sin(o));
}
function ct(e, t, n) {
	let r = 0, i = !1;
	if (n != null) switch (i = !0, n) {
		case "horz": break;
		case "vert270":
			r -= 90;
			break;
		case "vert":
		case "wordArtVert":
		case "eaVert":
		case "mongolianVert":
		case "wordArtVertRtl":
			r += 90;
			break;
	}
	return t != null && Number.isFinite(t) && (r += t / 6e4, i = !0), i ? r * Math.PI / 180 : e === "left" || e === "right" ? -Math.PI / 2 : 0;
}
function lt(e) {
	return Math.max(8, e * .02);
}
function ut(e, t, n, r) {
	let i = rt(e.catAxisTitleFontSizeHpt, r), a = rt(e.valAxisTitleFontSizeHpt, r), o = it(e.catAxisTitleTextVerticalInsetEmu, r), s = it(e.valAxisTitleTextVerticalInsetEmu, r);
	return {
		catFontPx: i,
		valFontPx: a,
		catBandH: e.catAxisTitle ? i + o + lt(n) + 4 + st(e.catAxisTitle, i, "horizontal", e.catAxisTitleRotation, e.catAxisTitleVerticalMode) : 0,
		valBandW: e.valAxisTitle ? a + s + lt(t) + 4 + st(e.valAxisTitle, a, "left", e.valAxisTitleRotation, e.valAxisTitleVerticalMode) : 0
	};
}
var dt = 2.25, ft = 2.75, pt = 2.15, mt = 3.05;
function ht(e, t, n) {
	if (!e.title && !e.titlePresent) return {
		fontPx: 0,
		topPad: 0,
		bottomPad: 0,
		bandH: 0
	};
	let r = Ze(e, t, n), i = r * (e.cartesianAutoLayoutProfile === "wordClassicColumn" ? pt : dt), a = Math.min(Math.max(0, i - r), r * Qe);
	return ot(e, {
		fontPx: r,
		topPad: a,
		bottomPad: i - r - a,
		bandH: i
	});
}
function gt(e, t, n) {
	let r = _t(e), i = De(r, t);
	return e * (n === "wordClassicColumn" ? mt : ft) + i - r;
}
function _t(e) {
	return 5 / 6 * e;
}
function vt(e) {
	return e;
}
var yt = 1.5;
function bt(e) {
	let t = e.outerTextMarginPx ?? 0;
	return {
		t: e.valAxisHidden ? 0 : e.valLabelFontPx / 2 + (e.valLabelExtraTopPx ?? 0) + t,
		r: (e.secondaryBandW ?? 0) > 0 ? (e.secondaryBandW ?? 0) + t : 0,
		b: e.catAxisHidden ? 0 : e.catLabelFontPx + (e.catLabelGapPx ?? _t(e.catLabelFontPx)) + e.catTitleBandH + t,
		l: e.valAxisHidden ? 0 : e.valLabelWidth + (e.valLabelGapPx ?? vt(e.valLabelFontPx)) + e.valTitleBandW + t
	};
}
function xt(e, t, n) {
	let r = e.xMode || "factor", i = e.yMode || "factor", a = e.wMode || "factor", o = e.hMode || "factor", s = r === "edge" ? t.x + e.x * t.w : n.x + e.x * t.w, c = i === "edge" ? t.y + e.y * t.h : n.y + e.y * t.h, l = e.w == null ? n.w : a === "edge" ? t.x + e.w * t.w - s : e.w * t.w, u = e.h == null ? n.h : o === "edge" ? t.y + e.h * t.h - c : e.h * t.h;
	return ![
		s,
		c,
		l,
		u
	].every(Number.isFinite) || l <= 0 || u <= 0 ? null : {
		x: s,
		y: c,
		w: l,
		h: u
	};
}
function St(e, t, n, r, i, a, o) {
	let s = o.titleBand ?? $e(e, i, a, o.titleTopPadFrac ?? 0, o.titleBottomPadFrac ?? 0), c = o.legendReserve, l = tt(c, e.legendOverlay === !0), u = ut(e, r, i, a), d, f, p, m;
	if (o.radialGapFrac != null) {
		let e = i * o.radialGapFrac;
		p = r - l.legRightW - l.legLeftW, m = i - s.bandH - l.legTopH - l.legBottomH - e, d = t + l.legLeftW, f = n + s.bandH + l.legTopH + e;
	} else {
		let e = o.pad;
		if (!e) throw Error("computeChartFrame: cartesian frame requires params.pad");
		d = t + e.l, f = n + e.t, p = r - e.l - e.r, m = i - e.t - e.b;
	}
	let h = !1, g = o.honorPlotAreaManualLayout ? e.plotAreaManualLayout : null;
	if (g) {
		let e = g.layoutTarget === "inner" ? {
			t: 0,
			r: 0,
			b: 0,
			l: 0
		} : o.manualOuterInsets ?? {
			t: 0,
			r: 0,
			b: 0,
			l: 0
		}, a = g.layoutTarget === "inner" ? {
			x: d,
			y: f,
			w: p,
			h: m
		} : {
			x: d - e.l,
			y: f - e.t,
			w: p + e.l + e.r,
			h: m + e.t + e.b
		}, s = xt(g, {
			x: t,
			y: n,
			w: r,
			h: i
		}, a);
		s && s.w > e.l + e.r && s.h > e.t + e.b && (d = s.x + e.l, f = s.y + e.t, p = s.w - e.l - e.r, m = s.h - e.t - e.b, h = !0);
	}
	return {
		title: s,
		legend: c,
		legendBands: l,
		axisTitles: u,
		plotRect: {
			px0: d,
			py0: f,
			pw: p,
			ph: m
		},
		plotAreaManualLayoutApplied: h,
		center: {
			cx: d + p / 2,
			cy: f + m / 2
		}
	};
}
var Ct = (e) => [
	e.x,
	e.y,
	e.w,
	e.h
].every(Number.isFinite) && e.w > 0 && e.h > 0;
function wt(e, t) {
	let n = Math.max(e.x, t.x), r = Math.max(e.y, t.y), i = Math.min(e.x + e.w, t.x + t.w), a = Math.min(e.y + e.h, t.y + t.h);
	return i > n && a > r ? {
		x: n,
		y: r,
		w: i - n,
		h: a - r
	} : null;
}
function Tt(e, t, n) {
	return Math.min(Math.max(e, t), n);
}
function Et(e, t, n, r, i, a = t) {
	if (!Ct(t) || !Ct(a) || !Number.isFinite(r) || r <= 0 || ![n.w, n.h].every(Number.isFinite) || n.w < 0 || n.h <= 0) return null;
	let o = r * .5, s = t, c, l, u = !1, d = "center", f = "middle";
	if (e.kind === "point") {
		if (![
			e.x,
			e.y,
			e.markerGap ?? 0
		].every(Number.isFinite)) return null;
		let t = o + Math.max(0, e.markerGap ?? 0);
		switch (c = e.x, l = e.y, e.position ?? "r") {
			case "l":
				c -= t + n.w / 2, d = "right";
				break;
			case "t":
				l -= t + n.h / 2, f = "bottom";
				break;
			case "b":
				l += t + n.h / 2, f = "top";
				break;
			case "ctr":
			case "inEnd":
			case "bestFit": break;
			default:
				c += t + n.w / 2, d = "left";
				break;
		}
	} else if (e.kind === "box") {
		if (![
			e.rect.x,
			e.rect.y,
			e.rect.w,
			e.rect.h
		].every(Number.isFinite) || e.rect.w <= 0 || e.rect.h <= 0) return null;
		let r = wt(e.rect, t);
		if (!r) return null;
		let i = e.position ?? "ctr";
		c = r.x + r.w / 2, l = r.y + r.h / 2, i === "inBase" ? (s = {
			x: r.x + o,
			y: r.y + o,
			w: r.w - o,
			h: r.h - o
		}, c = s.x + n.w / 2, l = s.y + n.h / 2, d = "left", f = "top") : i === "inEnd" ? (s = {
			x: r.x + o,
			y: r.y,
			w: r.w - o,
			h: r.h - o
		}, c = s.x + n.w / 2, l = s.y + s.h - n.h / 2, d = "left", f = "bottom") : i === "l" ? (s = {
			x: r.x + o,
			y: r.y + o,
			w: r.w - o,
			h: r.h - o * 2
		}, c = s.x + n.w / 2, d = "left") : i === "r" || i === "outEnd" ? (s = {
			x: r.x,
			y: r.y + o,
			w: r.w - o,
			h: r.h - o * 2
		}, c = s.x + s.w - n.w / 2, d = "right") : i === "t" ? (s = {
			x: r.x + o,
			y: r.y + o,
			w: r.w - o * 2,
			h: r.h - o
		}, l = s.y + n.h / 2, f = "top") : i === "b" ? (s = {
			x: r.x + o,
			y: r.y,
			w: r.w - o * 2,
			h: r.h - o
		}, l = s.y + s.h - n.h / 2, f = "bottom") : s = {
			x: r.x + o,
			y: r.y + o,
			w: r.w - o * 2,
			h: r.h - o * 2
		};
	} else {
		if (![
			e.rect.x,
			e.rect.y,
			e.rect.w,
			e.rect.h
		].every(Number.isFinite) || e.rect.w < 0 || e.rect.h < 0) return null;
		let r = e.position ?? "outEnd", i = r === "inBase" || r === "inEnd" || r === "ctr";
		if (u = !i, i) {
			let n = wt(e.rect, t);
			if (!n) return null;
			s = n;
		} else if (e.orientation === "vertical" && e.rect.w <= 0 || e.orientation === "horizontal" && e.rect.h <= 0) return null;
		let a = e.rect.x + e.rect.w / 2, p = e.rect.y + e.rect.h / 2;
		if (c = a, l = p, e.orientation === "vertical") {
			let t = e.negative ? e.rect.y + e.rect.h : e.rect.y, i = e.negative ? e.rect.y : e.rect.y + e.rect.h;
			r === "inBase" ? (l = i + (e.negative ? 1 : -1) * (o + n.h / 2), f = e.negative ? "top" : "bottom") : r === "inEnd" ? (l = t + (e.negative ? -1 : 1) * (o + n.h / 2), f = e.negative ? "bottom" : "top") : r !== "ctr" && (l = t + (e.negative ? 1 : -1) * (o + n.h / 2), f = e.negative ? "top" : "bottom");
		} else {
			let t = e.negative ? e.rect.x : e.rect.x + e.rect.w, i = e.negative ? e.rect.x + e.rect.w : e.rect.x;
			r === "inBase" ? (c = i + (e.negative ? -1 : 1) * (o + n.w / 2), d = e.negative ? "right" : "left") : r === "inEnd" ? (c = t + (e.negative ? 1 : -1) * (o + n.w / 2), d = e.negative ? "left" : "right") : r !== "ctr" && (c = t + (e.negative ? -1 : 1) * (o + n.w / 2), d = e.negative ? "right" : "left");
		}
	}
	let p = Math.max(2, r * .5), m = Math.max(2, r * .9);
	if (s.w < p || s.h < m) return null;
	let h = {
		x: c - Math.min(n.w, s.w) / 2,
		y: l - Math.min(n.h, s.h) / 2,
		w: Math.min(n.w, s.w),
		h: Math.min(n.h, s.h)
	};
	if (i) {
		let e = xt(i, a, h);
		if (!e) return null;
		h = e, d = "center", f = "middle";
		let n = wt(e, t);
		if (!n || (s = n, s.w < p || s.h < m)) return null;
	}
	let g = Math.min(Math.max(p, h.w), s.w), _ = Math.min(Math.max(m, h.h), s.h), v = g / 2, y = _ / 2, b = u || i ? h.x + h.w / 2 : Tt(h.x + h.w / 2, s.x + v, s.x + s.w - v), x = u || i ? h.y + h.h / 2 : Tt(h.y + h.h / 2, s.y + y, s.y + s.h - y);
	return [b, x].every(Number.isFinite) ? {
		x: d === "left" ? b - v : d === "right" ? b + v : b,
		y: f === "top" ? x - y : f === "bottom" ? x + y : x,
		textAlign: d,
		textBaseline: f,
		maxWidth: s.w,
		maxHeight: s.h,
		clip: s,
		rect: h
	} : null;
}
var Dt = 4096, Ot = 4;
function kt(e, t, n) {
	if (n(e) <= t) return e;
	if (n("…") > t) return "";
	let r = 0, i = Array.from(e), a = i.length;
	for (; r < a;) {
		let e = Math.ceil((r + a) / 2);
		n(`${i.slice(0, e).join("")}…`) <= t ? r = e : a = e - 1;
	}
	return `${i.slice(0, r).join("")}…`;
}
function At(e) {
	let t = "", n = 0;
	for (let r of e) {
		if (n >= Dt) return {
			value: t,
			truncated: !0
		};
		t += r, n++;
	}
	return {
		value: t,
		truncated: !1
	};
}
function jt(e, t, n, r, i) {
	if (![
		t,
		n,
		r
	].every(Number.isFinite) || t <= 0 || n < r || r <= 0) return [];
	let a = Math.max(1, Math.min(Ot, Math.floor(n / r))), o = At(e), s = o.value.split(/\r?\n/), c = [], l = o.truncated, u = (e) => {
		let n = [], r = "";
		for (let a of Array.from(e)) {
			let e = `${r}${a}`;
			r && i(e) > t ? (n.push(r), r = a) : r = e;
		}
		return r && n.push(r), n.filter((e) => i(e) <= t);
	};
	for (let e of s) {
		if (i(e) <= t) {
			c.push(e);
			continue;
		}
		let n = e.match(/\S+\s*|\s+/g) ?? [];
		if (n.length <= 1) c.push(...u(e));
		else {
			let e = "";
			for (let r of n) {
				let n = `${e}${r}`;
				if (i(n) <= t) e = n;
				else {
					e && c.push(e);
					let t = u(r);
					e = t.pop() ?? "", c.push(...t);
				}
			}
			e && c.push(e);
		}
	}
	l ||= c.length > a;
	let d = c.slice(0, a);
	return l && d.length > 0 && !d[d.length - 1].endsWith("…") && (d[d.length - 1] = kt(`${d[d.length - 1]}…`, t, i)), d;
}
function Mt(e, t) {
	return (t?.deleted ?? e?.deleted) === !0;
}
function Nt(e, t) {
	let n = e?.fontPaintAuthored === !0 || e?.fontColor != null || e?.fontHidden === !0, r = t?.fontPaintAuthored === !0 || t?.fontColor != null || t?.fontHidden === !0;
	return {
		fontColor: n ? e.fontColor : e?.fontColor ?? t?.fontColor,
		fontItalic: e?.fontItalic ?? t?.fontItalic,
		fontLanguage: e?.fontLanguage ?? t?.fontLanguage,
		fontBaseline: e?.fontBaseline ?? t?.fontBaseline,
		fontPaintAuthored: n ? !0 : r || void 0,
		fontHidden: n ? e.fontHidden : t?.fontHidden,
		textRotation: e?.textRotation ?? t?.textRotation,
		textWrap: e?.textWrap ?? t?.textWrap,
		textVerticalAnchor: e?.textVerticalAnchor ?? t?.textVerticalAnchor,
		textVerticalMode: e?.textVerticalMode ?? t?.textVerticalMode,
		textLInsEmu: e?.textLInsEmu ?? t?.textLInsEmu,
		textTInsEmu: e?.textTInsEmu ?? t?.textTInsEmu,
		textRInsEmu: e?.textRInsEmu ?? t?.textRInsEmu,
		textBInsEmu: e?.textBInsEmu ?? t?.textBInsEmu,
		textBodyAuthored: e?.textBodyAuthored === !0 || t?.textBodyAuthored === !0 || void 0,
		textAlign: e?.textAlign ?? t?.textAlign
	};
}
function Pt(e, t) {
	return e?.textAlign === "l" ? "left" : e?.textAlign === "r" ? "right" : e?.textAlign === "ctr" ? "center" : t;
}
function Ft(e, t) {
	let n = t / o, r = e?.textBodyAuthored === !0 ? l : 0, i = e?.textBodyAuthored === !0 ? s : 0;
	return {
		left: (e?.textLInsEmu ?? r) * n,
		top: (e?.textTInsEmu ?? i) * n,
		right: (e?.textRInsEmu ?? r) * n,
		bottom: (e?.textBInsEmu ?? i) * n
	};
}
function It(e, t) {
	let n = Number.isFinite(e) ? e / 6e4 * Math.PI / 180 : 0;
	return t === "vert" ? n + Math.PI / 2 : t === "vert270" ? n + Math.PI * 3 / 2 : n;
}
function Lt(e, t, n, r) {
	let i = It(n, r);
	if (i === 0) return {
		w: e,
		h: t,
		radians: i
	};
	let a = Math.abs(Math.cos(i)), o = Math.abs(Math.sin(i));
	return {
		w: e * a + t * o,
		h: e * o + t * a,
		radians: i
	};
}
function Rt(e, t, n, r, i, a, o) {
	return r !== 0 && (e.translate(t, n), e.rotate(r), e.translate(-t, -n)), {
		x: t + (i === "left" ? o.left : i === "right" ? -o.right : (o.left - o.right) / 2),
		y: n + (a === "top" ? o.top : a === "bottom" ? -o.bottom : (o.top - o.bottom) / 2)
	};
}
function zt(e, t, n, r, i, a) {
	return a?.textWrap === "none" ? ![
		t,
		n,
		r
	].every(Number.isFinite) || t <= 0 || n <= 0 || r <= 0 ? [] : At(e).value.split(/\r?\n/) : jt(e, t, n, r, i);
}
function Bt(e, t, n, r, i, a, o = "center", s = "center", c = n.w, l = 0) {
	if (!a) {
		let n = Math.max(0, c) / 2, r = (e) => e === "left" ? -n : e === "right" ? n : 0, i = r(o) - r(s);
		return {
			x: e + Math.cos(l) * i,
			y: t + Math.sin(l) * i
		};
	}
	let u = o === "left" ? n.x : o === "right" ? n.x + n.w : n.x + n.w / 2, d = i?.textVerticalAnchor ?? (i?.textBodyAuthored === !0 ? "t" : "ctr");
	return d === "t" ? {
		x: u,
		y: n.y + Math.min(r, n.h) / 2
	} : d === "b" ? {
		x: u,
		y: n.y + n.h - Math.min(r, n.h) / 2
	} : {
		x: u,
		y: n.y + n.h / 2
	};
}
function Vt(e, t = 1, n = !0) {
	return e === "pie" || e === "ofPie" ? !0 : e === "doughnut" && (t <= 1 || n);
}
function Ht(e) {
	return e.chartType === "bubble" && e.series.length === 1 && e.series[0]?.bubbleXSourceIsString === !0 ? !0 : !!e.varyColors && e.series.length === 1 && typeof e.chartType == "string" && (/Bar/.test(e.chartType) || e.chartType === "line" || e.chartType === "stackedLine" || e.chartType === "stackedLinePct" || e.chartType === "scatter" || e.chartType === "radar" && e.radarStyle !== "filled");
}
function Ut(e, t) {
	let n = 0;
	for (let r of e.series[t]?.trendLines ?? []) r.lineHidden === !0 || r.linePaintAuthored === !0 && r.lineColor == null || n++;
	return n;
}
function Wt(e, t = !1) {
	let n = e.series.map(() => ({
		firstIndex: -1,
		count: 0,
		pointDriven: !1
	}));
	if (e.series.length === 0) return n;
	let r = Vt(e.chartType, e.series.length, e.varyColors !== !1), i = Ht(e);
	if (r || i) return n[0] = {
		firstIndex: 0,
		count: e.series[0]?.values.length ?? 0,
		pointDriven: !0
	}, n;
	let a = 0;
	for (let r = 0; r < e.series.length; r++) {
		let i = ee(e, r), o = i?.kind !== "pie" && i?.kind !== "pie3D" && i?.kind !== "doughnut" && i?.kind !== "ofPie" && z(e, r), s = o ? e.series[r].values.length : 1;
		n[r] = {
			firstIndex: a,
			count: s,
			pointDriven: o
		}, a += s + (t ? Ut(e, r) : 0);
	}
	return n;
}
function Gt(e, t, n = 0) {
	let r = e[t];
	if (!r || r.firstIndex < 0 || r.count === 0) return null;
	let i = r.pointDriven ? n : 0;
	return i >= 0 && i < r.count ? r.firstIndex + i : null;
}
function Kt(e) {
	let t = /* @__PURE__ */ new Set();
	for (let n of e.legendEntries ?? []) n.deleted === !0 && t.add(n.idx);
	return t;
}
function qt(e, t, n, r = 0) {
	let i = Gt(e, n, r);
	return i != null && !t.has(i);
}
function Jt(e, t, n) {
	let r = e[n];
	if (!r || r.firstIndex < 0) return !1;
	for (let e = 0; e < r.count; e++) if (!t.has(r.firstIndex + e)) return !0;
	return !1;
}
function Yt(e) {
	return e.markerSymbol != null || e.markerSize != null || e.markerFill != null || e.markerFillPaint !== void 0 || e.markerFillPaintAuthored === !0 || e.markerStyle != null || e.markerLine != null || e.markerLinePaintAuthored === !0 || e.markerLineWidthEmu != null;
}
function Xt(e) {
	return e != null && (e.markerSymbol != null || e.markerSize != null || e.markerFill != null || e.color != null || e.markerFillPaint !== void 0 || e.markerFillPaintAuthored === !0 || e.chartexStyle != null || e.markerStyle != null || e.markerLine != null || e.markerLinePaintAuthored === !0 || e.markerLineWidthEmu != null);
}
function Zt(e, t) {
	return t == null || !Number.isFinite(t) || t === 0 || t < 0 && e.showNegativeBubbles !== !0 ? null : Math.abs(t);
}
function Qt(e, t) {
	return e.bubble3D ?? e.bubble3DGroupDefault ?? !1;
}
function $t(e) {
	return e !== "none" && e !== "x" && e !== "plus";
}
function en(e, t, n, r, i, a) {
	if (t.sourceHidden?.[r] === !0) return !1;
	let o = a?.chartType ?? e.chartType, s = t.values[r] != null;
	if (!s && (n === "line" || n === "stackedLine" || n === "stackedLinePct") && (s = (o === "line" || o === "stackedLine" || o === "stackedLinePct") && (o !== "line" || e.dispBlanksAs === "zero")), !s) return !1;
	if (n === "scatter" && i) {
		let n = (t.categories ?? e.categories)[r];
		if (n == null || !Number.isFinite(Number.parseFloat(n))) return !1;
	}
	if (n === "scatter" && o === "bubble") {
		let n = t.bubbleSizes?.[r];
		if (n == null || !Number.isFinite(n) || n === 0) return !1;
		let i = a?.showNegativeBubbles ?? e.showNegativeBubbles;
		return n < 0 && i !== !0 ? !1 : (a?.bubbleScale ?? e.bubbleScale ?? 100) > 0;
	}
	return !0;
}
function tn(e, t, n, r, i, a = 0) {
	if (t.sourceHidden?.[r] === !0 || n === "surface" || n === "ofPie" || n === "doughnut" && a > 0) return !1;
	if (n === "area" || n === "stackedArea" || n === "stackedAreaPct") return r < Math.max(e.categories.length, t.categories?.length ?? 0, t.values.length);
	let o = t.values[r];
	if ((n === "line" || n === "stackedLine" || n === "stackedLinePct") && o == null) return (e.chartType === "line" || e.chartType === "stackedLine" || e.chartType === "stackedLinePct") && (e.chartType !== "line" || e.dispBlanksAs === "zero");
	if (o == null || !Number.isFinite(o)) return !1;
	if (n === "pie" || n === "doughnut" || n === "ofPie") return t.values.some((e) => e != null && Number.isFinite(e) && Math.abs(e) > 0);
	if (n === "scatter") {
		if (!i) return !0;
		let n = (t.categories ?? e.categories)[r];
		return n != null && Number.isFinite(Number.parseFloat(n));
	}
	return !0;
}
function nn(e, t, n, r, i, a, o = 0) {
	if (n === "radar" || !t.seriesDataLabels && !t.dataLabelOverrides?.length) return 0;
	let s = new Map((t.dataLabelOverrides ?? []).map((e) => [e.idx, e])), c = 0;
	for (let a = 0; a < r; a++) {
		let r = s.get(a);
		Mt(t.seriesDataLabels, r) || (r?.showLegendKey ?? t.seriesDataLabels?.showLegendKey ?? !1) === !0 && tn(e, t, n, a, i, o) && c++;
	}
	return c;
}
function rn(e) {
	return e === "line" || e === "stackedLine" || e === "stackedLinePct" || e === "area" || e === "stackedArea" || e === "stackedAreaPct" || e === "stock" || e === "clusteredBar" || e === "clusteredBarH" || e === "stackedBar" || e === "stackedBarH" || e === "stackedBarPct" || e === "stackedBarHPct";
}
function an(e) {
	return e.dataPointOverrides?.some((e) => e.markerSymbol != null && e.markerSymbol !== "none") === !0;
}
function on(e, t, n, r) {
	return e === "radar" ? r === "filled" : e === "scatter" && t !== "bubble" && (n === "lineNoMarker" || n === "smoothNoMarker");
}
function sn(e, t, n, r) {
	let i = n.seriesType ?? e;
	return !(i === "line" || i === "stackedLine" || i === "stackedLinePct" || i === "stock" || i === "radar") && i !== "scatter" && i !== "bubble" || i === "radar" && r === "filled" || i === "scatter" && (t === "lineNoMarker" || t === "smoothNoMarker") ? !1 : (n.markerSymbol ?? (i === "stock" ? "none" : "circle")) !== "none" && n.showMarker !== !1;
}
function cn(e, t, n, r) {
	return t?.markerSymbol == null ? !r || e.markerSymbol === "none" ? "none" : e.markerSymbol ?? n : t.markerSymbol;
}
function ln(e, t, n) {
	if (t?.markerFillPaint !== void 0) return t.markerFillPaint;
	if (!(t?.markerFill != null || t?.color != null || t?.markerFillPaintAuthored === !0) && e.dataPointColors?.[n] == null && e.markerFillPaint !== void 0) return e.markerFillPaint;
}
function un(e, t, n, r) {
	return t?.markerFill == null ? t?.color == null ? e.dataPointColors?.[n] ?? (t?.markerFillPaintAuthored === !0 ? "00000000" : e.markerFill == null ? e.markerFillPaintAuthored === !0 ? "00000000" : r : e.markerFill) : t.color : t.markerFill;
}
function dn(e) {
	return e.markerFillPaint;
}
function fn(e, t) {
	return e.markerFill == null ? e.markerFillPaintAuthored === !0 ? "00000000" : t : e.markerFill;
}
function pn(e) {
	return e?.fillType === "gradient" ? e.stops.length : e == null ? 0 : 1;
}
var mn = new Set([
	"area3D",
	"line3D",
	"pie3D",
	"bar3D",
	"surface3D"
]);
function hn(e, t) {
	return t === "bar" || t === "bar3D" ? e.includes("Bar") : t === "line" || t === "line3D" ? e.includes("Line") : t === "area" || t === "area3D" ? e.includes("Area") : t === "pie" || t === "pie3D" ? e === "pie" : t === "surface" || t === "surface3D" ? e === "surface" || e === "surface3D" : e === t;
}
function gn(e) {
	if (e.plotGroups == null) return !0;
	let t = 0;
	for (let n of e.plotGroups) {
		if (!Number.isSafeInteger(n.seriesStart) || n.seriesStart !== t || !Number.isSafeInteger(n.seriesCount) || n.seriesCount < 0 || n.seriesCount > e.series.length - t) return !1;
		t += n.seriesCount;
	}
	return t === e.series.length;
}
function _n(e) {
	let t = Array(e.series.length);
	for (let n of e.plotGroups ?? []) {
		let r = Math.min(e.series.length, n.seriesStart + n.seriesCount);
		for (let e = n.seriesStart; e < r; e++) t[e] = n;
	}
	return t;
}
function vn(e, t) {
	return t ? t.kind === "bubble" ? "bubble" : t.kind === "line" ? t.grouping === "percentStacked" ? "stackedLinePct" : t.grouping === "stacked" ? "stackedLine" : "line" : t.kind === "area" ? t.grouping === "percentStacked" ? "stackedAreaPct" : t.grouping === "stacked" ? "stackedArea" : "area" : t.kind : e;
}
function yn(e) {
	if (e.plotGroups == null || e.plotGroups.length <= 1) return "legacy";
	if (!gn(e)) return "unsupported";
	let t = e.plotGroups.filter((e) => e.seriesCount > 0);
	if (t.length === 0) return "legacy";
	if (t.length === 1) return hn(e.chartType, t[0].kind) ? "legacy" : "unsupported";
	if (t.some((e) => e.categoryAxis === "none" || e.valueAxis === "none") || t.some((t) => t.categoryAxis === "secondary" && e.secondaryCatAxis == null || t.valueAxis === "secondary" && e.secondaryValAxis == null)) return "unsupported";
	let n = new Set(t.map((e) => e.kind)), r = n.size === 1 && n.has("bar") || t.length === 2 && n.has("bar") && n.has("area"), i = e.secondaryCatAxis?.pairedBesidePrimary !== !0, a = (e) => e.kind === "scatter" || e.kind === "bubble" || e.kind === "bar" && r && i, o = Ne(e).length, s = t.some((t) => t.kind === "bar" && (t.barDirection ?? (e.chartType.endsWith("H") ? "bar" : "col")) === "bar"), c = e.secondaryCatAxis?.hidden === !0 && (e.secondaryCatAxis.orientation ?? "minMax") === "minMax" && (e.catAxisOrientation ?? "minMax") === "minMax" && e.secondaryCatAxis.dateAxis !== !0 && e.catAxisIsDate !== !0 && (e.secondaryValAxis?.crossBetween ?? "between") === (e.catAxisCrossBetween ?? "between") && !s && t.every((t) => t.kind === "scatter" || t.kind === "bubble" || e.series.slice(t.seriesStart, t.seriesStart + t.seriesCount).every((e) => (e.categories?.length ? e.categories.length : o) === o));
	if (e.secondaryCatAxis?.hidden === !0 && !c && t.some((e) => e.categoryAxis === "secondary" && !a(e))) return "unsupported";
	let l = (e) => e.categoryAxis === "primary" || e.categoryAxis === "secondary" && c;
	if (t.some((e) => mn.has(e.kind))) return "unsupported";
	if (t.length === 2 && t[0].kind === "bar" && t[1].kind === "scatter") {
		let [n, r] = t, i = e.series.slice(n.seriesStart, n.seriesStart + n.seriesCount), a = e.series.slice(r.seriesStart, r.seriesStart + r.seriesCount);
		return n.categoryAxis === "primary" && (n.valueAxis === "primary" || n.valueAxis === "unresolved") && (r.categoryAxis === "secondary" || r.categoryAxis === "unresolved") && r.valueAxis === "secondary" && e.secondaryCatAxis != null && e.secondaryValAxis != null && i.every((e) => e.useSecondaryAxis !== !0) && a.every((e) => e.useSecondaryAxis === !0) ? "bar-combo" : "unsupported";
	}
	if (t.some((e) => e.categoryAxis === "unresolved" || e.valueAxis === "unresolved" || e.seriesAxis === "unresolved")) return "unsupported";
	if (n.size === 1) {
		let n = t[0].kind;
		if (n === "line" || n === "area") return t.every(l) ? n === "line" ? "line-groups" : "area-groups" : "unsupported";
		if (n === "scatter" || n === "bubble") return "scatter-bubble";
		if (n === "bar") {
			let n = e.chartType.endsWith("H") ? "bar" : "col";
			return new Set(t.map((e) => e.barDirection ?? n)).size > 1 && (t.length !== 2 || t.some((e) => e.categoryAxis !== "primary" || e.valueAxis !== "primary")) ? "unsupported" : "bar-combo";
		}
		return "unsupported";
	}
	if (t.length === 2 && n.has("bar") && n.has("area")) {
		let e = t.find((e) => e.kind === "line" || e.kind === "area");
		return e == null || !l(e) ? "unsupported" : "bar-combo";
	}
	if (t.length === 2 && t[0].kind === "area" && t[1].kind === "line" && (t.every((e) => e.categoryAxis === "primary" && e.valueAxis === "primary") || t.every(l) && (t[1].grouping ?? "standard") === "standard")) return "area-groups";
	if (n.size === 2 && n.has("bar") && n.has("line")) {
		let n = t.filter((e) => e.kind === "bar"), r = t.filter((e) => e.kind === "line"), i = e.chartType.endsWith("H") ? "bar" : "col", a = new Set(n.map((e) => e.barDirection ?? i));
		return n.length <= 2 && r.length === 1 && t.length <= 3 && a.size === 1 && t.every(l) ? "bar-combo" : "unsupported";
	}
	return [...n].every((e) => e === "scatter" || e === "bubble") ? t.length > 2 ? "unsupported" : "scatter-bubble" : t.length === 2 && t[0].kind === "stock" && t[1].kind === "line" && (t[0].seriesCount === 3 || t[0].seriesCount === 4) && (t[1].grouping == null || t[1].grouping === "standard") && t.every((e) => e.categoryAxis === "primary" && e.valueAxis === "primary") ? "stock-line" : "unsupported";
}
function bn(e, t) {
	let n = e?.splitType ?? "auto", r = e?.splitPos, i = /* @__PURE__ */ new Set();
	if ((e?.splitPosAuthored === !0 || r != null) && (![
		"percent",
		"pos",
		"val"
	].includes(n) || r == null || !Number.isFinite(r))) return null;
	if (n === "auto") {
		if (e?.splitTypeAuthored === !0) return null;
		let n = Math.ceil(t.length / 3);
		for (let e = Math.max(0, t.length - n); e < t.length; e++) i.add(e);
		return i;
	}
	if (n === "cust") {
		if (e?.customSplitIndices == null) return null;
		for (let n of e.customSplitIndices) Number.isSafeInteger(n) && n >= 0 && n < t.length && i.add(n);
		return i;
	}
	if (r == null || !Number.isFinite(r)) return null;
	if (n === "pos") {
		if (!Number.isInteger(r) || r < 0 || r > 32e3) return null;
		let e = Math.min(t.length, r);
		for (let n = t.length - e; n < t.length; n++) i.add(n);
		return i;
	}
	if (n === "val") {
		for (let e = 0; e < t.length; e++) {
			let n = t[e];
			n != null && Number.isFinite(n) && n < r && i.add(e);
		}
		return i;
	}
	if (r < 0 || r > 100) return null;
	let a = 0;
	for (let e of t) e != null && Number.isFinite(e) && (a += Math.abs(e));
	if (!(a > 0)) return i;
	for (let e = 0; e < t.length; e++) {
		let n = t[e];
		n != null && Number.isFinite(n) && Math.abs(n) / a * 100 < r && i.add(e);
	}
	return i;
}
function xn(e, t) {
	if (!Number.isSafeInteger(e) || e < 0 || e > t) throw new u("image-effect-work", t, Number.isSafeInteger(e) && e >= 0 ? e : 2 ** 53 - 1);
}
function q() {
	throw new a("unsupported-image-effect", "Unrepresentable chart image geometry");
}
var Sn = /* @__PURE__ */ new WeakMap();
function Cn(e) {
	return Sn.get(e);
}
function wn(e, t) {
	t && Sn.set(e, t);
}
function Tn(e) {
	let t = Sn.get(e);
	if (!t) return !1;
	let n = e;
	return t.x > 0 || t.y > 0 || n.width > t.x + t.width || n.height > t.y + t.height;
}
function En(e, t) {
	let n = Sn.get(e);
	if (!n || t || !(n.width > 0) || !(n.height > 0)) return {
		x: 0,
		y: 0
	};
	let r = e;
	return {
		x: Math.ceil(Math.max(0, n.x, r.width - n.x - n.width) / n.width),
		y: Math.ceil(Math.max(0, n.y, r.height - n.y - n.height) / n.height)
	};
}
function Dn(e) {
	if (!e) return !0;
	if (![
		e.l,
		e.t,
		e.r,
		e.b
	].every(Number.isFinite)) return !1;
	let t = e.l, n = e.t, r = 1 - e.r, i = 1 - e.b;
	return r > t && i > n && Math.min(1, r) > Math.max(0, t) && Math.min(1, i) > Math.max(0, n);
}
function On(e) {
	let t = e;
	return {
		w: t.naturalWidth || (typeof t.width == "number" ? t.width : 0) || 0,
		h: t.naturalHeight || (typeof t.height == "number" ? t.height : 0) || 0
	};
}
function kn(e) {
	if (!e || ![
		e.l,
		e.t,
		e.r,
		e.b
	].every(Number.isFinite) || !(e.l || e.t || e.r || e.b)) return null;
	let t = e.l, n = e.t, r = 1 - e.r, i = 1 - e.b, a = r - t, o = i - n;
	if (!(a > 0) || !(o > 0)) return Object.freeze({
		sourceX: 0,
		sourceY: 0,
		sourceWidth: 0,
		sourceHeight: 0,
		dxFraction: 0,
		dyFraction: 0,
		dwFraction: 0,
		dhFraction: 0
	});
	let s = Math.max(0, t), c = Math.max(0, n), l = Math.min(1, r), u = Math.min(1, i), d = Math.max(0, l - s), f = Math.max(0, u - c);
	return Object.freeze({
		sourceX: s,
		sourceY: c,
		sourceWidth: d,
		sourceHeight: f,
		dxFraction: (s - t) / a,
		dyFraction: (c - n) / o,
		dwFraction: d / a,
		dhFraction: f / o
	});
}
function An(e) {
	if (e) {
		let { l: t, t: n, r, b: i } = e;
		if (![
			t,
			n,
			r,
			i,
			1 - r - t,
			1 - i - n
		].every(Number.isFinite)) throw RangeError("Image crop is not representable");
	}
	let t = kn(e);
	if (t && !Object.values(t).every(Number.isFinite)) throw RangeError("Image crop projection overflow");
	return t;
}
function jn(e, t, n) {
	let r = n === void 0 ? kn(t) : n;
	if (!r) return null;
	let { w: i, h: a } = On(e);
	return i <= 0 || a <= 0 ? null : {
		sx: r.sourceX * i,
		sy: r.sourceY * a,
		sw: r.sourceWidth * i,
		sh: r.sourceHeight * a,
		dxFraction: r.dxFraction,
		dyFraction: r.dyFraction,
		dwFraction: r.dwFraction,
		dhFraction: r.dhFraction
	};
}
function Mn(e, t, n, r = {}) {
	let i = r.rotation ?? 0, a = i * Math.PI / 180, o = i !== 0 || !!r.flipH || !!r.flipV, s = e / 2, c = t / 2, l = kn(n), u = Object.freeze({
		x: o ? -s : 0,
		y: o ? -c : 0,
		width: e,
		height: t
	});
	return Object.freeze({
		width: e,
		height: t,
		transformed: o,
		centerX: s,
		centerY: c,
		rotationRad: a,
		scaleX: r.flipH ? -1 : 1,
		scaleY: r.flipV ? -1 : 1,
		alpha: r.alpha ?? 1,
		destination: u,
		crop: l
	});
}
function Nn(e, t, n, r, i) {
	let a = r.alpha < 1;
	a && (e.save(), e.globalAlpha *= r.alpha);
	try {
		if (!r.transformed) i(t + r.destination.x, n + r.destination.y, r.width, r.height);
		else {
			e.save();
			try {
				e.translate(t + r.centerX, n + r.centerY), e.rotate(r.rotationRad), e.scale(r.scaleX, r.scaleY), i(r.destination.x, r.destination.y, r.width, r.height);
			} finally {
				e.restore();
			}
		}
	} finally {
		a && e.restore();
	}
}
function Pn(e, t, n, r, i, o, s, c) {
	let l = (r, i, o, s, c) => {
		let l = Cn(t);
		if (l) {
			let { w: u, h: d } = On(t), f;
			try {
				f = c === void 0 ? An(n) : c;
			} catch {
				throw new a("unsupported-image-effect", "Unrepresentable image effect crop");
			}
			let p = (...n) => {
				if (!n.every(Number.isFinite)) throw new a("unsupported-image-effect", "Unrepresentable image effect paint projection");
				n.length, e.drawImage(t, ...n);
			};
			f ? f.sourceWidth > 0 && f.sourceHeight > 0 && p(l.x + f.sourceX * l.width, l.y + f.sourceY * l.height, f.sourceWidth * l.width, f.sourceHeight * l.height, r + f.dxFraction * o, i + f.dyFraction * s, f.dwFraction * o, f.dhFraction * s) : p(r - l.x / l.width * o, i - l.y / l.height * s, u / l.width * o, d / l.height * s);
			return;
		}
		let u = jn(t, n, c);
		u ? u.sw > 0 && u.sh > 0 && u.dwFraction > 0 && u.dhFraction > 0 && e.drawImage(t, u.sx, u.sy, u.sw, u.sh, r + u.dxFraction * o, i + u.dyFraction * s, u.dwFraction * o, u.dhFraction * s) : e.drawImage(t, r, i, o, s);
	};
	if (!c) {
		l(r, i, o, s);
		return;
	}
	let u = Mn(o, s, n, c.transform);
	Nn(e, r, i, u, (e, t, n, r) => l(e, t, n, r, u.crop));
}
function Fn(e, t, n) {
	if (!Number.isFinite(e) || !Number.isFinite(t) || !(e > 0) || !(t > 0)) return null;
	let r = n ? 1 - n.l - n.r : 1, i = n ? 1 - n.t - n.b : 1;
	if (!Number.isFinite(r) || !Number.isFinite(i) || !(r > 0) || !(i > 0) || !Dn(n)) return null;
	let a = Math.ceil(e / r), o = Math.ceil(t / i);
	return Number.isFinite(a) && Number.isFinite(o) ? {
		width: a,
		height: o
	} : null;
}
function In(e, t, n, i) {
	if (!t || !r(e)) return {
		widthPt: n,
		heightPt: i
	};
	if (!Dn(t)) return null;
	let a = 1 - t.l - t.r, o = 1 - t.t - t.b;
	return {
		widthPt: n / a,
		heightPt: i / o
	};
}
function Ln(e, t, n, r) {
	let i = e * (1 - (r?.l ?? 0) - (r?.r ?? 0)), a = t * (1 - (r?.t ?? 0) - (r?.b ?? 0)), o = 1 - (n?.l ?? 0) - (n?.r ?? 0), s = 1 - (n?.t ?? 0) - (n?.b ?? 0);
	return {
		width: Math.max(0, o > 0 ? i / o : i),
		height: Math.max(0, s > 0 ? a / s : a)
	};
}
var Rn = .06;
function zn(e) {
	let t = Math.floor(e.length / 2);
	return e.length % 2 == 1 ? e[t] : e[t - 1] / 2 + e[t] / 2;
}
function Bn(e) {
	let t = 0;
	for (let n of e) t = Math.max(t, Math.abs(n));
	if (t === 0) return 0;
	let n = 0;
	for (let r of e) n += r / t;
	return n / e.length * t;
}
function Vn(e, t) {
	let n = e + (e - t) * 1.5;
	if (Number.isFinite(n)) return n;
	let r = e / 4, i = r + (r - t / 4) * 1.5, a = i * 4;
	return Number.isFinite(a) ? a : i < 0 ? -Number.MAX_VALUE : Number.MAX_VALUE;
}
function Hn(e, t) {
	if (t <= 1) return e[0];
	if (t >= e.length) return e[e.length - 1];
	let n = Math.floor(t), r = t - n, i = e[n - 1], a = e[n];
	if (r === 0 || i === a) return i;
	let o = i * (1 - r) + a * r;
	return Math.min(a, Math.max(i, o));
}
function Un(e, t) {
	let n = e.filter((e) => typeof e == "number" && Number.isFinite(e)).sort((e, t) => e - t);
	if (n.length === 0) return null;
	let r = n.length, i = zn(n), a = t === "inclusive" ? (e) => (r - 1) * e + 1 : (e) => (r + 1) * e, o = Hn(n, a(.25)), s = Hn(n, a(.75)), c = Vn(o, s), l = Vn(s, o), u = [], d = [];
	for (let e of n) e < c || e > l ? d.push(e) : u.push(e);
	return {
		q1: o,
		median: i,
		q3: s,
		lowerFence: c,
		upperFence: l,
		whiskerLo: u[0] ?? n[0],
		whiskerHi: u[u.length - 1] ?? n[n.length - 1],
		mean: Bn(n),
		outliers: d,
		inner: u
	};
}
function Wn(e, t, n, r, i) {
	let a = null;
	return e.map((e) => {
		if (!e || !t && !n) return [];
		let o = t ? e.inner.slice(1, -1) : [], s = n ? e.outliers.filter((t) => t < e.lowerFence) : [], c = n ? e.outliers.filter((t) => t > e.upperFence) : [], l = [];
		for (let e of [
			...s,
			...o,
			...c
		]) {
			let t = r(e);
			a !== null && Math.abs(t - a) < i || (l.push(e), a = t);
		}
		return l;
	});
}
function Gn(e, t, n) {
	return (t ? Math.max(0, e.inner.length - 2) : 0) + (n ? e.outliers.length : 0);
}
function Kn(e, t) {
	let n = 0;
	for (let r of e) for (let e of r) if (n += e.length, !Number.isSafeInteger(n) || n > t) return t + 1;
	return n;
}
function qn(e, t, n, r, i, a, o) {
	if (!Number.isFinite(e) || !Number.isFinite(t) || t <= 0 || !Number.isInteger(n) || n <= 0 || !Number.isInteger(r) || r <= 0 || !Number.isInteger(i) || i < 0 || i >= n || !Number.isInteger(a) || a < 0 || a >= r || !Number.isFinite(o) || o < 0) return null;
	let s = t / n, c = s / (r + o / 100), l = c * r, u = c * Rn, d = c - u, f = e + s * (i + .5) - l / 2 + a * c + u / 2;
	return {
		boxX: f,
		boxWidth: d,
		centerX: f + d / 2
	};
}
var Jn = 32767, Yn = 1 << 24;
function Xn(e, t) {
	let n = Number.isFinite(e) && e > 0 ? Math.max(1, Math.round(e)) : 1, r = Number.isFinite(t) && t > 0 ? Math.max(1, Math.round(t)) : 1, i = Math.min(1, Jn / n, Jn / r), a = n * r, o = a > 16777216 ? Math.sqrt(Yn / a) : 1, s = Math.min(i, o);
	return s >= 1 ? {
		width: n,
		height: r,
		scale: 1,
		clamped: !1
	} : {
		width: Math.max(1, Math.floor(n * s)),
		height: Math.max(1, Math.floor(r * s)),
		scale: s,
		clamped: !0
	};
}
var Zn = !1;
function Qn() {
	return !Zn && typeof console < "u" && typeof console.warn == "function" && (Zn = !0, console.warn("[ooxml] effects: geometric coverage canvas unavailable or exceeds canvas limits; soft edge and inner shadow omitted; the original body is still painted.")), null;
}
function $n(t, n) {
	let r = Math.floor(n.x), i = Math.floor(n.y), a = Math.max(1, Math.ceil(n.x + n.w) - r), o = Math.max(1, Math.ceil(n.y + n.h) - i);
	if (Xn(a, o).clamped) return Qn();
	let s;
	try {
		s = e(a, o);
	} catch {
		return Qn();
	}
	let c = s ? tr(s) : null;
	if (!s || !c) return Qn();
	t(or(c, {
		x: r,
		y: i,
		w: a,
		h: o
	}));
	let l = c.getImageData(0, 0, a, o);
	for (let e = 0; e < l.data.length; e += 4) l.data[e] = l.data[e + 1] = l.data[e + 2] = 0, l.data[e + 3] = l.data[e + 3] > 0 ? 255 : 0;
	return c.putImageData(l, 0, 0), (e) => {
		e.save(), e.setTransform({
			a: 1,
			b: 0,
			c: 0,
			d: 1,
			e: 0,
			f: 0
		}), e.drawImage(s, r, i), e.restore();
	};
}
function er(e, t) {
	return [t === "tl" || t === "l" || t === "bl" ? e.x : t === "tr" || t === "r" || t === "br" ? e.x + e.w : e.x + e.w / 2, t === "tl" || t === "t" || t === "tr" ? e.y : t === "l" || t === "ctr" || t === "r" ? e.y + e.h / 2 : e.y + e.h];
}
function J(e, t) {
	return e * t;
}
function tr(e) {
	return e.getContext("2d") ?? null;
}
function nr(e, t, n, r) {
	let i = Math.max(0, Math.floor(e.x - t)), a = Math.max(0, Math.floor(e.y - t)), o = Math.min(n, Math.ceil(e.x + e.w + t)), s = Math.min(r, Math.ceil(e.y + e.h + t));
	return {
		x: i,
		y: a,
		w: Math.max(1, o - i),
		h: Math.max(1, s - a)
	};
}
function rr(e, t) {
	return Math.ceil(J(e.radius, t)) + 2;
}
function ir(e, t) {
	return Math.ceil(3 * J(e.blur, t) + Math.abs(J(e.dist, t))) + 2;
}
function ar(e, t, n, r, i) {
	return nr(e, Math.max(t.softEdge ? rr(t.softEdge, n) : 0, t.innerShadow ? ir(t.innerShadow, n) : 0), r, i);
}
function or(e, t) {
	if (t.x === 0 && t.y === 0) return e;
	let n = t.x, r = t.y;
	return new Proxy(e, {
		get(e, t) {
			if (t === "setTransform") return (t) => {
				e.setTransform(t.a, t.b, t.c, t.d, t.e - n, t.f - r);
			};
			let i = Reflect.get(e, t);
			return typeof i == "function" ? i.bind(e) : i;
		},
		set(e, t, n) {
			return e[t] = n, !0;
		}
	});
}
function sr(t, n, r, i, a, o, s, c = 0, l) {
	let u = Math.max(0, J(i.blur, a)), d = J(i.dist, a), f = i.rotWithShape === !1 ? 0 : c, m = (i.dir + f) * Math.PI / 180, h = Math.cos(m) * d, g = Math.sin(m) * d, _ = nr(r, Math.ceil(u * 3 + Math.max(Math.abs(h), Math.abs(g))) + 2, o, s), v = e(_.w, _.h);
	if (!v) return !1;
	let y = tr(v);
	if (!y) return !1;
	n(or(y, _)), y.save(), y.setTransform(1, 0, 0, 1, 0, 0), y.globalCompositeOperation = "source-in", y.fillStyle = p(i.color, i.alpha), y.fillRect(0, 0, _.w, _.h), y.restore(), t.save(), u > 0 && (t.filter = `blur(${u}px)`);
	let [b, x] = l ?? er(r, i.algn ?? "b"), S = i.sx ?? 1, C = i.sy ?? 1, w = Math.tan((i.kx ?? 0) * Math.PI / 180), T = Math.tan((i.ky ?? 0) * Math.PI / 180);
	return t.translate(h, g), t.translate(b, x), f !== 0 && t.rotate(f * Math.PI / 180), t.transform(S, T, w, C, 0, 0), f !== 0 && t.rotate(-f * Math.PI / 180), t.translate(-b, -x), t.drawImage(v, _.x, _.y), t.restore(), !0;
}
function cr(t, n, r, i, a, o, s) {
	let c = J(i.blur, a), l = J(i.dist, a), u = i.dir * Math.PI / 180, d = Math.cos(u) * l, f = Math.sin(u) * l, m = nr(r, ir(i, a), o, s), h = e(m.w, m.h);
	if (!h) return;
	let g = tr(h);
	if (!g) return;
	let _ = e(m.w, m.h), v = _ ? tr(_) : null;
	!_ || !v || (n(or(v, m)), g.drawImage(_, 0, 0), g.globalCompositeOperation = "source-in", g.fillStyle = p(i.color, i.alpha), g.fillRect(0, 0, m.w, m.h), g.globalCompositeOperation = "destination-out", g.filter = c > 0 ? `blur(${c}px)` : "none", g.drawImage(_, d, f), g.globalCompositeOperation = "destination-in", g.filter = "none", g.drawImage(_, 0, 0), t.save(), t.drawImage(h, m.x, m.y), t.restore());
}
function lr(t, n, r, i, a, o, s, c) {
	let l = J(i.radius, a);
	if (l <= 0) {
		n(t);
		return;
	}
	let u = nr(r, rr(i, a), o, s), d = r.x - u.x, f = r.y - u.y, p = e(u.w, u.h);
	if (!p) {
		n(t);
		return;
	}
	let m = tr(p);
	if (!m) {
		n(t);
		return;
	}
	let h = or(m, u), g = c ?? n;
	n(h);
	let _ = e(u.w, u.h), v = e(u.w, u.h), y = _ ? tr(_) : null, b = v ? tr(v) : null;
	if (_ && y && v && b) {
		let e = or(y, u);
		e.fillStyle = "#000", g(e), b.drawImage(p, d, f, r.w, r.h, d - l, f - l, r.w + l * 2, r.h + l * 2), b.globalCompositeOperation = "destination-out", b.drawImage(_, 0, 0), b.globalCompositeOperation = "source-over", b.drawImage(p, 0, 0), b.globalCompositeOperation = "destination-in", b.filter = `blur(${l / 3}px)`, b.drawImage(_, 0, 0), b.filter = "none", b.globalCompositeOperation = "source-over", t.save(), t.drawImage(v, u.x, u.y), t.restore();
		return;
	}
	t.save(), t.drawImage(p, 0, 0), t.restore();
}
function ur(t, n, r, i, a, o, s) {
	let c = e(o, s);
	if (!c) return;
	let l = tr(c);
	if (!l) return;
	let u = J(i.blur, a);
	l.save(), u > 0 && (l.filter = `blur(${u}px)`), n(l), l.restore(), l.save(), l.globalCompositeOperation = "destination-in";
	let d = r.y, f = r.y + r.h, p = l.createLinearGradient(0, f, 0, d), m = dr(i.stPos), h = dr(i.endPos);
	p.addColorStop(0, `rgba(0,0,0,${i.stA})`), m > 0 && p.addColorStop(m, `rgba(0,0,0,${i.stA})`), h < 1 && h > m && p.addColorStop(h, `rgba(0,0,0,${i.endA})`), p.addColorStop(1, `rgba(0,0,0,${i.endA})`), l.fillStyle = p, l.fillRect(0, 0, o, s), l.restore();
	let g = J(i.dist, a), _ = i.dir * Math.PI / 180, v = Math.cos(_) * g, y = Math.sin(_) * g;
	t.save(), t.translate(r.x + v, f + y), t.scale(i.sx, i.sy), t.translate(-r.x, -f), t.drawImage(c, 0, 0), t.restore();
}
function dr(e) {
	return e < 0 ? 0 : e > 1 ? 1 : e;
}
var fr = Yn, pr = /* @__PURE__ */ new WeakMap();
function mr(e, t, n = fr, r = 1) {
	let i = pr.get(e), a = Number.isSafeInteger(r) && r > 0 ? r : 1;
	pr.set(e, { perConsumerMaximum: Math.floor(Math.max(0, n) / a) });
	try {
		return t();
	} finally {
		i ? pr.set(e, i) : pr.delete(e);
	}
}
function hr(e) {
	return e?.effectAuthored === !0 || e?.effectUnsupported === !0 || e?.effectNoStyle === !0 || e?.shadows != null || e?.innerShadows != null || e?.glows != null || e?.softEdges != null || e?.reflections != null;
}
function Y(...e) {
	return e.find(hr) ?? void 0;
}
function gr(e, t) {
	if (e?.length) return e[t % e.length] ?? void 0;
}
function _r(e, t, n, r = n) {
	let i = hr(e), a = i ? e : t;
	if (!a || a.effectNoStyle === !0 || a.effectUnsupported === !0) return;
	let o = i ? n : r, s = a.effectFormattingIndices ? ce(a.effectFormattingIndices, o) : -1, c = a.effectColorIndex ?? (s >= 0 ? s : o), l = {
		shadow: gr(a.shadows, c),
		innerShadow: gr(a.innerShadows, c),
		glow: gr(a.glows, c),
		softEdge: gr(a.softEdges, c),
		reflection: gr(a.reflections, c)
	};
	return Object.values(l).some(Boolean) ? l : void 0;
}
function vr(e) {
	if (typeof e.getTransform == "function") {
		let t = e.getTransform();
		if ([
			t.a,
			t.b,
			t.c,
			t.d,
			t.e,
			t.f
		].every(Number.isFinite)) return t;
	}
	return {
		a: 1,
		b: 0,
		c: 0,
		d: 1,
		e: 0,
		f: 0
	};
}
function yr(e, t, n) {
	return [e.a * t + e.c * n + e.e, e.b * t + e.d * n + e.f];
}
function br(e, t) {
	let n = [
		yr(e, t.x, t.y),
		yr(e, t.x + t.w, t.y),
		yr(e, t.x, t.y + t.h),
		yr(e, t.x + t.w, t.y + t.h)
	], r = n.map((e) => e[0]), i = n.map((e) => e[1]), a = Math.min(...r), o = Math.max(...r), s = Math.min(...i), c = Math.max(...i);
	return {
		x: a,
		y: s,
		w: o - a,
		h: c - s
	};
}
function xr(e, t, n) {
	let r = Math.max(1, Math.ceil(e.x + e.w + t) - Math.floor(e.x - t)) * Math.max(1, Math.ceil(e.y + e.h + t) - Math.floor(e.y - t)) * n;
	return Number.isSafeInteger(r) ? r : Infinity;
}
function Sr(e, t, n, r, i) {
	let a = e.softEdge ? Math.ceil(e.softEdge.radius * 3 * n) + 2 : 0, o = e.innerShadow ? Math.ceil((e.innerShadow.blur * 3 + Math.abs(e.innerShadow.dist)) * n) + 2 : 0, s = e.shadow ? Math.ceil((e.shadow.blur * 3 + Math.abs(e.shadow.dist)) * n) + 2 : 0, c = e.reflection ? r * i : 0, l = ar(t, e, n, r, i);
	return c + (e.shadow ? xr(t, s, 1) : 0) + (e.softEdge ? xr(t, a, 3) : 0) + (e.innerShadow ? xr(t, o, 2) : 0) + (e.softEdge || e.innerShadow ? xr(l, 0, 2) : 0);
}
function Cr(e, t, n) {
	let r = t.dir * Math.PI / 180, i = t.dist / o * n;
	e.shadowColor = p(t.color, t.alpha), e.shadowBlur = Math.max(0, t.blur / o * n), e.shadowOffsetX = Math.cos(r) * i, e.shadowOffsetY = Math.sin(r) * i;
}
function wr(e, t, n) {
	e.shadowColor = p(t.color, t.alpha), e.shadowBlur = Math.max(0, t.radius / o * n), e.shadowOffsetX = 0, e.shadowOffsetY = 0;
}
function Tr(e, t, n, r, i, a, o = r) {
	let s = _r(t, n, r, o), c = s?.shadow ?? s?.glow;
	c && (e.save(), e.globalCompositeOperation = "destination-over", "radius" in c ? wr(e, c, i) : Cr(e, c, i), a(e), e.restore());
}
function Er(e) {
	let t = e.canvas;
	return [t?.width ?? 0, t?.height ?? 0];
}
function Dr(e, t, n, r, i, a, s, c = r) {
	let l = _r(t, n, r, c);
	if (!l) {
		s(e);
		return;
	}
	let u = vr(e), d = br(u, i), f = Math.max(Math.hypot(u.a, u.b), Math.hypot(u.c, u.d)), p = Math.max(0, a * f / o), [h, g] = Er(e), _ = h > 0 && g > 0, v = (t) => {
		m(e, t, () => {
			t.setTransform(u), s(t);
		});
	}, y = () => e.setTransform(1, 0, 0, 1, 0, 0), b = Sr(l, d, p, h, g), x = pr.get(e), S = _ && Number.isSafeInteger(b) && b <= (x?.perConsumerMaximum ?? 0), C = S && (l.softEdge || l.innerShadow) ? $n(v, ar(d, l, p, h, g)) : null, w = !1;
	S && l.shadow && (e.save(), y(), w = sr(e, v, d, l.shadow, p, h, g, Math.atan2(u.b, u.a) * 180 / Math.PI), e.restore());
	let T = w ? l.glow : l.shadow ?? l.glow;
	S && l.reflection && (e.save(), y(), ur(e, v, d, l.reflection, p, h, g), e.restore());
	let E = !1;
	!T && S && l.softEdge && C && (e.save(), y(), lr(e, v, d, l.softEdge, p, h, g, C), e.restore(), E = !0), E || (e.save(), T && ("radius" in T ? wr(e, T, a) : Cr(e, T, a)), s(e), e.restore()), S && l.innerShadow && C && (e.save(), y(), cr(e, C, d, l.innerShadow, p, h, g), e.restore());
}
var Or = 512;
function kr(e) {
	if (e.length > 1e4) return !0;
	let t = 0;
	for (let n of e) {
		if (n.path.length > Or || t > 1e4 - n.path.length) return !0;
		t += n.path.length;
	}
	return !1;
}
function Ar(e, t = !1) {
	let n = {
		label: "",
		layoutWeight: 0,
		value: 0,
		depth: -1,
		children: [],
		branchIndex: -1,
		labelIndex: -1,
		a0: 0,
		a1: 0
	}, r = e.reduce((e, t) => Number.isFinite(t.size) && t.size > e ? t.size : e, 0), i = (e, t) => e > Number.MAX_VALUE - t ? Number.MAX_VALUE : e + t, a = /* @__PURE__ */ new WeakMap();
	for (let o of e) {
		let e = Number.isFinite(o.size) && o.size > 0 ? o.size : 0, s = r > 0 ? e / r : 0, c = n;
		for (let n = 0; n < o.path.length; n++) {
			let r = o.path[n], l = a.get(c);
			l || (l = /* @__PURE__ */ new Map(), a.set(c, l));
			let u = t && n === o.path.length - 1, d = u ? void 0 : l.get(r);
			d || (d = {
				label: r,
				layoutWeight: 0,
				value: 0,
				depth: n,
				children: [],
				branchIndex: n === 0 ? c.children.length : c.branchIndex,
				labelIndex: -1,
				a0: 0,
				a1: 0
			}, c.children.push(d), u || l.set(r, d)), d.layoutWeight += s, d.value = i(d.value, e), c = d;
		}
	}
	n.layoutWeight = n.children.reduce((e, t) => e + t.layoutWeight, 0), n.value = n.children.reduce((e, t) => i(e, t.value), 0);
	let o = 0, s = [...n.children].reverse();
	for (; s.length > 0;) {
		let e = s.pop();
		e.labelIndex = o++;
		for (let t = e.children.length - 1; t >= 0; t--) s.push(e.children[t]);
	}
	return n;
}
function jr(e) {
	let t = [e];
	for (; t.length > 0;) {
		let e = t.pop(), n = 0;
		for (let t of e.children) n += t.layoutWeight;
		if (n <= 0) continue;
		let r = e.a0;
		for (let i of e.children) {
			let a = (e.a1 - e.a0) * i.layoutWeight / n;
			i.a0 = r, i.a1 = r + a, r = i.a1, t.push(i);
		}
	}
}
function Mr(e) {
	let t = e.depth, n = [e];
	for (; n.length > 0;) {
		let e = n.pop();
		t = Math.max(t, e.depth);
		for (let t = e.children.length - 1; t >= 0; t--) n.push(e.children[t]);
	}
	return t;
}
function Nr(e) {
	if (e.customText) return e.customText;
	let t = [];
	if (e.showCategory && e.category && t.push(e.category), e.showSeries && e.seriesName && t.push(e.seriesName), e.showValue && e.sourceValue != null) {
		let n = e.valueDivisor != null && Number.isFinite(e.valueDivisor) && e.valueDivisor > 0 ? e.valueDivisor : 1;
		t.push(v(e.sourceValue / n, e.formatCode ?? null, e.date1904, e.formatDivisors));
	}
	return e.showPercent && e.percentRatio != null && t.push(v(e.percentRatio, e.percentFormatCode ?? e.formatCode ?? "0%", e.date1904, e.percentFormatCode == null ? null : e.percentFormatDivisors)), e.showBubbleSize && e.bubbleSize != null && t.push(v(e.bubbleSize, e.formatCode ?? null, e.date1904, e.formatDivisors)), t.filter((e) => e !== "").join(e.separator ?? e.defaultSeparator ?? " ");
}
var Pr;
function Fr(e, t) {
	let n = Pr;
	Pr = e;
	try {
		return t();
	} finally {
		Pr = n;
	}
}
function Ir(e, t, n, r, i, a, o, s = 0) {
	return Pr?.(e, t, n, r, i, a, o, s) ?? !1;
}
function Lr(e, t, n, r, i = 0, a = i) {
	if (!t || !e && !r) return e ?? void 0;
	let o = e ?? {}, s = t.fillNoStyle !== !0 && (t.fillPaintAuthored === !0 || t.fillHidden === !0 || t.fillPaints != null || t.fillColors != null), c = o.fillHidden === !0 ? G(n) : void 0, l = W(o.style, n, i), u = o.fillPaint != null || o.fill != null || l !== void 0 || o.fillHidden === !0 && c !== void 0 || o.fillPaintAuthored === !0 && o.fillHidden !== !0, d = c === void 0 ? o.fillPaint ?? (o.fill ? {
		fillType: "solid",
		color: o.fill
	} : l === void 0 ? o.fillPaintAuthored === !0 && o.fillHidden !== !0 ? null : H(t, a) : l) : c;
	return {
		fill: d?.fillType === "solid" ? d.color : void 0,
		fillPaint: d != null && d.fillType !== "solid" ? d : void 0,
		fillHidden: d === null ? !0 : void 0,
		fillPaintAuthored: u || s ? !0 : o.fillPaintAuthored
	};
}
function Rr(e) {
	if (!e) return !1;
	let t = e.fillHidden !== !0 && (e.fillPaint == null ? e.fill != null && f({
		fillType: "solid",
		color: e.fill
	}) : f(e.fillPaint)), n = e.borderHidden !== !0 && (e.borderFill == null ? e.borderColor != null && f({
		fillType: "solid",
		color: e.borderColor
	}) : f(e.borderFill));
	return t || n;
}
function zr(e, t) {
	if (!e) return t ?? void 0;
	if (!t) return e;
	let n = e.fillPaintAuthored === !0 || e.fill != null || e.fillPaint != null || e.fillHidden === !0, r = e.borderPaintAuthored === !0 || e.borderColor != null || e.borderFill != null || e.borderHidden === !0, i = e.borderDashAuthored === !0 || e.borderDash != null || e.borderCustomDash != null;
	return {
		...t,
		...e,
		fill: n ? e.fill : t.fill,
		fillPaint: n ? e.fillPaint : t.fillPaint,
		fillHidden: n ? e.fillHidden : t.fillHidden,
		fillPaintAuthored: n ? e.fillPaintAuthored : t.fillPaintAuthored,
		borderColor: r ? e.borderColor : t.borderColor,
		borderFill: r ? e.borderFill : t.borderFill,
		borderHidden: r ? e.borderHidden : t.borderHidden,
		borderPaintAuthored: r ? e.borderPaintAuthored : t.borderPaintAuthored,
		borderWidthEmu: e.borderWidthEmu ?? t.borderWidthEmu,
		borderDash: i ? e.borderDash : t.borderDash,
		borderCustomDash: i ? e.borderCustomDash : t.borderCustomDash,
		borderDashAuthored: i ? e.borderDashAuthored : t.borderDashAuthored,
		borderCap: e.borderCap ?? t.borderCap,
		borderJoin: e.borderJoin ?? t.borderJoin,
		borderCompound: e.borderCompound ?? t.borderCompound,
		style: Y(e.style, t.style),
		effectFallbackStyle: e.effectFallbackStyle ?? t.effectFallbackStyle,
		effectStyleIndex: e.effectStyleIndex ?? t.effectStyleIndex,
		effectFallbackIndex: e.effectFallbackIndex ?? t.effectFallbackIndex
	};
}
function Br(e, t, r, i, a = 0) {
	t && Dr(e, t.style, t.effectFallbackStyle, t.effectStyleIndex ?? 0, r, i, (e) => {
		if (t.fillHidden !== !0) {
			let n = t.fillPaint?.fillType === "image" && Ir(e, t.fillPaint, r.x, r.y, r.w, r.h, i, a) ? null : t.fillPaint ? d(t.fillPaint, e, r.x, r.y, r.w, r.h, a) : t.fill ? `#${t.fill}` : null;
			n && (e.fillStyle = n, e.fillRect(r.x, r.y, r.w, r.h));
		}
		if (t.borderHidden === !0) return;
		let s = t.borderFill ? d(t.borderFill, e, r.x, r.y, r.w, r.h, a) : t.borderColor ? `#${t.borderColor}` : null;
		s && (e.save(), e.strokeStyle = s, e.lineWidth = t.borderWidthEmu == null ? Math.max(.25, .75 * i) : Math.max(.25, t.borderWidthEmu / o * i), e.setLineDash(n(t.borderCustomDash, t.borderDash, e.lineWidth)), t.borderCap === "rnd" ? e.lineCap = "round" : t.borderCap === "sq" ? e.lineCap = "square" : t.borderCap === "flat" && (e.lineCap = "butt"), t.borderJoin === "round" ? e.lineJoin = "round" : t.borderJoin === "bevel" ? e.lineJoin = "bevel" : t.borderJoin === "miter" && (e.lineJoin = "miter"), e.strokeRect(r.x, r.y, r.w, r.h), e.restore());
	}, t.effectFallbackIndex ?? t.effectStyleIndex ?? 0);
}
function Vr(e) {
	let t = e?.divisor;
	return t != null && Number.isFinite(t) && t > 0 ? t : 1;
}
function Hr(e, t, n, r, i, a, o, s, c) {
	if (!t) return null;
	let l = t.seriesDataLabels, u = o.get(n);
	if (Mt(l, u) || !l && !u && !a.visible) return null;
	let d = typeof s == "boolean" ? s : !1, f = typeof s == "number" ? s : void 0, p = !d && (u?.showVal ?? l?.showVal ?? a.showVal), m = u?.showCatName ?? l?.showCatName ?? a.showCatName, h = u?.showSerName ?? l?.showSerName ?? a.showSerName ?? !1, g = u?.showPercent ?? l?.showPercent ?? a.showPercent ?? !1, _ = u?.showLegendKey ?? l?.showLegendKey ?? !1, v = u?.formatCode ?? l?.formatCode ?? e.dataLabelFormatCode ?? null, y = Nr({
		customText: u?.text,
		showCategory: m,
		showSeries: h,
		showValue: p,
		showPercent: g,
		category: r,
		seriesName: t.name,
		sourceValue: i,
		valueDivisor: Vr(c),
		percentRatio: f,
		formatCode: v ?? t.valFormatCode ?? null,
		formatDivisors: u?.formatCode == null ? l?.formatDivisors : null,
		percentFormatCode: u?.formatCode ?? l?.percentFormatCode ?? v ?? "0%",
		percentFormatDivisors: u?.formatCode == null ? l?.percentFormatDivisors : null,
		date1904: e.date1904,
		separator: u?.separator ?? l?.separator
	});
	return !y && !_ ? null : {
		text: y,
		showLegendKey: _,
		position: u?.position ?? l?.position,
		fontColor: u?.fontColor ?? l?.fontColor,
		fontSizeHpt: u?.fontSizeHpt ?? l?.fontSizeHpt,
		fontBold: u?.fontBold ?? l?.fontBold,
		fontFace: u?.fontFace ?? l?.fontFace,
		manualLayout: u?.manualLayout,
		labelBox: zr(u?.labelBox, l?.labelBox),
		richRuns: u?.text ? u.richRuns : void 0,
		textStyle: Nt(u, l)
	};
}
function Ur(e, t) {
	let n = e.chartexSunburst ? {
		rows: e.chartexSunburst.rows,
		kind: "sunburst"
	} : e.chartexTreemap ? {
		rows: e.chartexTreemap.rows,
		kind: "treemap"
	} : void 0;
	if (!n) return "not-hierarchy";
	if (n.rows.length === 0) return "ok";
	if (kr(n.rows)) return "too-large";
	let r = Ar(n.rows, n.kind === "treemap");
	if (r.layoutWeight <= 0 || r.children.length === 0) return "ok";
	n.kind === "sunburst" && (r.a0 = -Math.PI / 2, r.a1 = r.a0 + Math.PI * 2, jr(r));
	let i = e.chartexTreemap?.parentLabelLayout ?? "overlapping", a = e.series[0], o = new Map((a?.dataLabelOverrides ?? []).map((e) => [e.idx, e])), s = [...r.children];
	for (; s.length > 0;) {
		let r = s.pop();
		for (let e of r.children) s.push(e);
		if (r.layoutWeight <= 0 || n.kind === "sunburst" && r.a1 - r.a0 <= 1e-4) continue;
		let c = n.kind === "treemap" && r.children.length > 0 && i === "banner" ? Hr(e, a, r.labelIndex, r.label, r.value, {
			visible: !0,
			showVal: !1,
			showCatName: !0
		}, o, !0) : null;
		t({
			node: r,
			kind: n.kind,
			paintsBody: n.kind === "sunburst" || r.children.length === 0 || c != null
		});
	}
	return "ok";
}
function Wr(e, t) {
	let n = e.chartexSunburst ? {
		rows: e.chartexSunburst.rows,
		kind: "sunburst"
	} : e.chartexTreemap ? {
		rows: e.chartexTreemap.rows,
		kind: "treemap"
	} : void 0;
	if (!n) return "not-hierarchy";
	if (n.rows.length === 0) return "ok";
	if (kr(n.rows)) return "too-large";
	let r = Ar(n.rows, n.kind === "treemap");
	if (r.layoutWeight <= 0 || r.children.length === 0) return "ok";
	n.kind === "sunburst" && (r.a0 = -Math.PI / 2, r.a1 = r.a0 + Math.PI * 2, jr(r));
	let i = e.series[0], a = new Map((i?.dataLabelOverrides ?? []).map((e) => [e.idx, e])), o = e.chartexTreemap?.parentLabelLayout ?? "overlapping", s = [...r.children];
	for (; s.length > 0;) {
		let r = s.pop();
		for (let e of r.children) s.push(e);
		if (r.layoutWeight <= 0 || n.kind === "sunburst" && r.a1 - r.a0 <= 1e-4) continue;
		let c;
		n.kind === "sunburst" ? c = Hr(e, i, r.labelIndex, r.label, r.value, {
			visible: !1,
			showVal: !1,
			showCatName: !1
		}, a) : r.children.length > 0 ? (c = Hr(e, i, r.labelIndex, r.label, r.value, {
			visible: o !== "none",
			showVal: !1,
			showCatName: !0
		}, a), o === "overlapping" && r.depth !== 0 && (c = null)) : c = Hr(e, i, r.labelIndex, r.label, r.value, {
			visible: !1,
			showVal: !1,
			showCatName: !1
		}, a), c && t({
			label: c,
			styleIndex: r.labelIndex,
			linkedStyleIndex: a.has(r.labelIndex) ? r.labelIndex : i?.chartexFormatIdx ?? 0
		});
	}
	return "ok";
}
function Gr(e, t, n) {
	let r = Math.max(e.length, t), i = new Set(n), a = !1, o = (e, t) => {
		let n = e + t;
		return Number.isFinite(n) ? n : (a = !0, n < 0 ? -Number.MAX_VALUE : Number.MAX_VALUE);
	}, s = 0, c = -Infinity, l = 0, u = [];
	for (let t = 0; t < r; t++) {
		let n = e[t], r = n != null && Number.isFinite(n), a = n == null || r, d = r ? n : 0;
		if (i.has(t)) {
			let e = {
				start: 0,
				end: d,
				isSub: !0,
				isPos: !0,
				hasValue: r,
				paintSlot: a,
				semanticIndex: 2
			};
			u.push(e), a && (c = Math.max(c, e.start, e.end), l = Math.min(l, e.start, e.end)), r && (s = d);
		} else {
			let e = o(s, d), t = d >= 0 ? s : e, n = d >= 0 ? e : s, i = {
				start: t,
				end: n,
				isSub: !1,
				isPos: d >= 0,
				hasValue: r,
				paintSlot: a,
				semanticIndex: d >= 0 ? 0 : 1
			};
			u.push(i), a && (c = Math.max(c, t, n), l = Math.min(l, t, n)), r && (s = e);
		}
	}
	return {
		bars: u,
		rawMin: l,
		rawMax: c,
		cumulativeOverflow: a
	};
}
var Kr = 1e4, qr = 4096, Jr = 1048576, Yr = 4096;
function Xr(e, t, n, r = n) {
	return _r(e, t, n, r) != null;
}
function Zr(e, t, n, r) {
	let i = r[n];
	return i?.kind === "bubble" || i?.kind === "scatter" ? "scatter" : i?.kind === "line" ? e.chartType === "stackedLinePct" ? "stackedLinePct" : e.chartType === "stackedLine" ? "stackedLine" : "line" : i?.kind === "area" ? e.chartType === "stackedAreaPct" ? "stackedAreaPct" : e.chartType === "stackedArea" ? "stackedArea" : "area" : i?.kind ?? t.seriesType ?? (e.chartType === "bubble" ? "scatter" : e.chartType);
}
function Qr(e, t) {
	let n = e.series.filter((e) => e.lineGroupIndex === t);
	return n.length > 0 || t !== 0 || ![
		"line",
		"stackedLine",
		"stackedLinePct"
	].includes(e.chartType) ? n : e.series.filter((e) => e.seriesType == null || e.seriesType === "line");
}
function $r(e, t, n) {
	return !!(n?.text || (n?.showVal ?? t.seriesDataLabels?.showVal ?? e.showDataLabels) || (n?.showCatName ?? t.seriesDataLabels?.showCatName) || (n?.showSerName ?? t.seriesDataLabels?.showSerName) || (n?.showPercent ?? t.seriesDataLabels?.showPercent) || (n?.showBubbleSize ?? t.seriesDataLabels?.showBubbleSize) || (n?.showLegendKey ?? t.seriesDataLabels?.showLegendKey));
}
function ei(e, t, n, r) {
	return e.threeD || r[t]?.kind.endsWith("3D") === !0 || z(e, t) ? null : n === "line" || n === "stackedLine" || n === "stackedLinePct" ? "dataPointLine" : n === "area" || n === "stackedArea" || n === "stackedAreaPct" ? "dataPoint" : n === "radar" ? (r[t]?.radarStyle ?? e.radarStyle) === "filled" ? "dataPoint" : "dataPointLine" : null;
}
function ti(e) {
	let t = ri(e.chartType), n = _n(e), r = e.series.map((t, r) => Zr(e, t, r, n)), i = e.series.some((t, n) => r[n] === "scatter" && (t.categories ?? e.categories).some((e) => Number.isFinite(Number.parseFloat(e)))), a = 0, o = (e, t, n = 0, r = n) => {
		Xr(e, t, n, r) && a++;
	};
	o(e.chartAreaStyle, e.chartStyleRoles?.chartArea), o(e.plotAreaStyle, e.chartStyleRoles?.[e.threeD ? "plotArea3D" : "plotArea"]), e.showLegend && o(e.legendStyle, e.chartStyleRoles?.legend), (e.titlePresent === !0 || e.title != null || (e.titleRichRuns?.length ?? 0) > 0) && o(e.titleStyle, e.chartStyleRoles?.title), e.catAxisTitle != null && o(e.catAxisTitleStyle, e.chartStyleRoles?.axisTitle), e.valAxisTitle != null && o(e.valAxisTitleStyle, e.chartStyleRoles?.axisTitle);
	for (let t of [e.secondaryValAxis, e.secondaryCatAxis]) t?.title != null && o(t.titleStyle, e.chartStyleRoles?.axisTitle), t?.displayUnits?.label != null && o(t.displayUnits.label.boxStyle?.style, e.chartStyleRoles?.axisTitle);
	if (e.threeD?.seriesAxis?.title != null && o(e.threeD.seriesAxis.titleStyle, e.chartStyleRoles?.axisTitle), e.valAxisDisplayUnits?.label != null && o(e.valAxisDisplayUnits.label.boxStyle?.style, e.chartStyleRoles?.axisTitle), e.catAxisDisplayUnits?.label != null && o(e.catAxisDisplayUnits.label.boxStyle?.style, e.chartStyleRoles?.axisTitle), Wr(e, ({ label: t, linkedStyleIndex: n }) => {
		let r = t.labelBox, i = Rr(r) ? e.chartStyleRoles?.dataLabelCallout ?? e.chartStyleRoles?.dataLabel : e.chartStyleRoles?.dataLabel;
		o(r?.style, i, 0, n);
	}), e.chartType === "waterfall") {
		let t = e.series[0], n = new Map((t?.dataPointOverrides ?? []).map((e) => [e.idx, e])), r = Gr(t?.values ?? [], e.categories.length, e.subtotalIndices);
		if (!r.cumulativeOverflow && r.rawMax > r.rawMin) for (let i = 0; i < r.bars.length; i++) {
			let a = r.bars[i];
			a.paintSlot && o(Y(n.get(i)?.chartexStyle, t?.chartexStyle), e.chartexDataPointStyle, a.semanticIndex, a.semanticIndex);
		}
	} else if (e.chartType === "funnel") {
		let t = e.series[0], n = t?.values ?? [];
		if (n.some((e) => e != null && e > 0)) {
			let r = Math.max(n.length, e.categories.length);
			for (let i = 0; i < r; i++) (n[i] ?? 0) > 0 && o(t?.chartexStyle, e.chartexDataPointStyle, 0, 0);
		}
	}
	for (let t = 0; t < (e.chartexBox?.series.length ?? 0); t++) {
		let n = e.chartexBox.series[t], r = n.chartexFormatIdx ?? t;
		for (let t of n.valuesByCategory) Un(t, n.quartileMethod) && o(n.chartexStyle, e.chartexDataPointStyle, r, r);
	}
	let s = e.series[0];
	Ur(e, ({ node: t, paintsBody: n }) => {
		n && o(s?.chartexStyle, e.chartexDataPointStyle, s?.chartexFormatIdx ?? 0, t.branchIndex);
	});
	let c = Wt(e), l = Kt(e);
	for (let a = 0; a < e.series.length; a++) {
		let s = e.series[a], u = r[a], d = n[a], f = vn(e.chartType, d), p = s.chartexFormatIdx ?? a, m = new Map((s.dataPointOverrides ?? []).map((e) => [e.idx, e])), h = ei(e, a, u, n), g = z(e, a), _ = e.threeD != null || d?.kind.endsWith("3D") === !0, v = d?.kind === "bubble" || d == null && e.chartType === "bubble", y = u === "radar" && (d?.radarStyle ?? e.radarStyle) === "filled", b = u === "scatter" && !v, x = g && (u === "line" || u === "stackedLine" || u === "stackedLinePct" || u === "radar" && !y || b), S = /* @__PURE__ */ new Set();
		if (x) if (u === "scatter") {
			let t = [];
			for (let n = 0; n < s.values.length; n++) en(e, s, u, n, i, { chartType: f }) && t.push(n);
			for (let e = 1; e < t.length; e++) S.add(t[e]);
		} else {
			let t = u === "stackedLine" || u === "stackedLinePct" || d?.kind === "line" && (d.grouping === "stacked" || d.grouping === "percentStacked") || u === "line" && e.dispBlanksAs === "zero", n = u !== "radar" && !t && e.dispBlanksAs === "span", r = [], i = () => {
				for (let e = 1; e < r.length; e++) S.add(r[e]);
				u === "radar" && r.length === s.values.length && r.length > 1 && S.add(r[0]), r = [];
			};
			for (let e = 0; e < s.values.length; e++) {
				if (s.sourceHidden?.[e] === !0) {
					i();
					continue;
				}
				let a = s.values[e];
				a != null && Number.isFinite(a) || t ? r.push(e) : n || i();
			}
			i();
		}
		if (t && h && (!g || h === "dataPoint" && (u === "area" || u === "stackedArea" || u === "stackedAreaPct")) && o(Y(s.chartexStyle), B(e, h, a), p), t && g && y && s.values.length >= 3 && s.values.every((e, t) => e != null && Number.isFinite(e) && s.sourceHidden?.[t] !== !0) && o(Y(m.get(0)?.chartexStyle, s.chartexStyle), B(e, "dataPoint", a), 0, 0), t && u === "scatter" && !g && b) {
			let t = 0;
			for (let n = 0; n < s.values.length; n++) en(e, s, u, n, i, { chartType: f }) && t++;
			t >= 2 && o(Y(s.chartexStyle), B(e, "dataPointLine", a), p);
		}
		let C = Math.max(s.values.length, s.categories?.length ?? 0, s.bubbleSizes?.length ?? 0, e.categories.length);
		if (t && !e.threeD && d?.kind.endsWith("3D") !== !0) for (let t = 0; t < C; t++) {
			let n = m.get(t), r = en(e, s, u, t, i, {
				chartType: f,
				bubbleScale: d?.bubbleScale ?? e.bubbleScale,
				showNegativeBubbles: d?.showNegativeBubbles ?? e.showNegativeBubbles
			}), c = v ? "bubble" : u, l = c === "area" || c === "stackedArea" || c === "stackedAreaPct", _ = c === "line" || c === "stackedLine" || c === "stackedLinePct" || l || c === "scatter" || c === "bubble" || c === "radar" || c === "stock", y = on(c, f, d?.scatterStyle ?? e.scatterStyle, d?.radarStyle ?? e.radarStyle), b = l ? (s.showMarker === !0 || Yt(s)) && s.markerSymbol !== "none" : c === "stock" ? s.markerSymbol != null && s.markerSymbol !== "none" : s.showMarker !== !1 && s.markerSymbol !== "none", C = r && _ && !y && cn(s, n, "circle", b) !== "none", w = s.values[t], T = r && (!(u === "pie" || u === "doughnut" || u === "ofPie") || w != null && Number.isFinite(w) && Math.abs(w) > 0), E = d?.kind === "stock" ? d.seriesStart : 0, D = d?.kind === "stock" ? d.seriesCount : e.series.length, O = u === "stock" && (a === E + D - 1 || D >= 4 && a === E);
			if ((x ? S.has(t) : h == null && (v || u !== "scatter" && u !== "radar")) && T && (u !== "stock" || O && !C)) {
				let r = v ? Qt(s, n) ? "dataPoint3D" : "dataPoint" : u === "line" || u === "stackedLine" || u === "stackedLinePct" || u === "stock" || u === "scatter" || u === "radar" ? "dataPointLine" : "dataPoint";
				o(Y(n?.chartexStyle, s.chartexStyle), B(e, r, a), u === "stock" ? p : n?.chartexStyle ? t : p, u === "stock" ? p : g ? t : p);
			}
			C && !v && o(Y(n?.markerStyle, n?.chartexStyle, s.markerStyle), B(e, "dataPointMarker", a), n?.markerStyle || n?.chartexStyle ? t : p, g ? t : p);
		}
		if (t && u === "ofPie") {
			let t = bn(e.ofPie, s.values), n = t == null ? void 0 : [...t].find((e) => {
				let t = s.values[e];
				return t != null && Number.isFinite(t) && Math.abs(t) > 0;
			});
			n != null && o(Y(m.get(n)?.chartexStyle, s.chartexStyle), B(e, "dataPoint", a), g ? n : p);
		}
		if (t && _ && (d?.kind === "line3D" || d?.kind === "area3D" || u === "line" || u === "stackedLine" || u === "stackedLinePct" || u === "area" || u === "stackedArea" || u === "stackedAreaPct")) {
			let t = (d?.kind === "area3D" || u === "area" || u === "stackedArea" || u === "stackedAreaPct" ? s.showMarker === !0 || Yt(s) : s.showMarker === !0) && s.markerSymbol !== "none";
			for (let n = 0; n < C; n++) {
				let r = m.get(n), i = t || r?.markerSymbol != null && r.markerSymbol !== "none", c = s.values[n];
				!i || s.sourceHidden?.[n] === !0 || c == null || !Number.isFinite(c) || o(Y(r?.markerStyle, r?.chartexStyle, s.markerStyle), B(e, "dataPointMarker", a), r?.markerStyle || r?.chartexStyle ? n : p, p);
			}
		}
		let w = u === "scatter" && !v && s.lineHidden !== !0, T = d?.kind === "line3D" || u === "line" || u === "stackedLine" || u === "stackedLinePct" || u === "stock" || w || u === "radar" && !y, E = v || u === "scatter" && !w, D = _ ? "dataPoint3D" : T ? "dataPointLine" : "dataPoint", O = (t, n) => {
			let r = n ? m.get(t) : void 0, i = n ? t : a;
			if (!E) {
				let c = Y(r?.chartexStyle, s.chartexStyle);
				o(c, B(e, D, a), _ ? c === r?.chartexStyle ? t : p : r?.chartexStyle ? t : p, _ ? g ? i : p : n ? t : p);
			}
			if (!((_ ? T && s.showMarker === !0 && s.markerSymbol !== "none" : sn(f, d?.scatterStyle ?? e.scatterStyle, s, d?.radarStyle ?? e.radarStyle)) || r?.markerSymbol != null && r.markerSymbol !== "none")) return;
			let c = v && Qt(s, r) ? "dataPoint3D" : v ? "dataPoint" : "dataPointMarker";
			o(Y(r?.markerStyle, r?.chartexStyle, v ? s.chartexStyle : s.markerStyle), B(e, c, a), r?.markerStyle || r?.chartexStyle ? t : p, _ ? p : n ? t : p);
		};
		if (e.showLegend) {
			let e = c[a];
			if (e) for (let t = 0; t < e.count; t++) l.has(e.firstIndex + t) || O(e.pointDriven ? t : 0, e.pointDriven);
		}
		if (e.dataTable?.showKeys === !0 && rn(e.chartType) && O(0, c[a]?.pointDriven === !0), nn(e, s, u, C, i, {
			chartType: f,
			bubbleScale: d?.bubbleScale ?? e.bubbleScale,
			showNegativeBubbles: d?.showNegativeBubbles ?? e.showNegativeBubbles
		}, a) > 0) {
			let t = new Map((s.dataLabelOverrides ?? []).map((e) => [e.idx, e]));
			for (let n = 0; n < C; n++) {
				let r = t.get(n);
				Mt(s.seriesDataLabels, r) || (r?.showLegendKey ?? s.seriesDataLabels?.showLegendKey) !== !0 || !tn(e, s, u, n, i, a) || O(n, c[a]?.pointDriven === !0);
			}
		}
		for (let t of s.dataLabelOverrides ?? []) {
			if (s.sourceHidden?.[t.idx] === !0 || Mt(s.seriesDataLabels, t) || !$r(e, s, t) || !tn(e, s, u, t.idx, i, a)) continue;
			let n = zr(t.labelBox, s.seriesDataLabels?.labelBox);
			o(Y(t.labelBox?.style, s.seriesDataLabels?.labelBox?.style), Rr(n) ? e.chartStyleRoles?.dataLabelCallout ?? e.chartStyleRoles?.dataLabel : e.chartStyleRoles?.dataLabel, 0, t.idx);
		}
		let k = new Set((s.dataLabelOverrides ?? []).map((e) => e.idx));
		if (s.seriesDataLabels?.labelBox != null || e.chartStyleRoles?.dataLabel != null) {
			let t = Math.max(s.values.length, s.categories?.length ?? 0, e.categories.length);
			for (let n = 0; n < t; n++) k.has(n) || tn(e, s, u, n, i, a) && $r(e, s, void 0) && o(s.seriesDataLabels?.labelBox?.style, Rr(s.seriesDataLabels?.labelBox) ? e.chartStyleRoles?.dataLabelCallout ?? e.chartStyleRoles?.dataLabel : e.chartStyleRoles?.dataLabel, 0, s.chartexFormatIdx ?? a);
		}
		for (let n of t ? s.trendLines ?? [] : []) (n.dispEq === !0 || n.dispRSqr === !0 || n.labelText || n.labelRichRuns?.some((e) => e.text.length > 0) === !0) && o(n.labelBox?.style, e.chartStyleRoles?.trendlineLabel, 0, s.chartexFormatIdx ?? a);
	}
	for (let t = 0; t < (e.chartexBox?.series.length ?? 0); t++) {
		let n = e.chartexBox.series[t];
		if ((e.chartStyleMarkerSymbol ?? e.chartexMarkerSymbol ?? "circle") === "none" || !n.showNonoutliers && !n.showOutliers) continue;
		let r = n.chartexFormatIdx ?? t;
		for (let t of n.valuesByCategory) {
			let i = Un(t, n.quartileMethod);
			if (!i) continue;
			let a = Gn(i, n.showNonoutliers, n.showOutliers);
			for (let t = 0; t < a; t++) o(Y(n.chartexStyle), e.chartStyleRoles?.dataPointMarker, r);
		}
	}
	let u = (t, n) => {
		let r = t[0], i = t.at(-1);
		if (!r || !i) return;
		let a = Math.max(r.values.length, i.values.length);
		for (let t = 0; t < a; t++) {
			let a = r.values[t], s = i.values[t];
			if (a == null || s == null || !Number.isFinite(a) || !Number.isFinite(s) || a === s) continue;
			let c = s > a ? "upBar" : "downBar";
			o((c === "upBar" ? n.up : n.down).style, e.chartStyleRoles?.[c], t);
		}
	};
	if (e.stockUpDownBars) {
		let t = e.plotGroups?.find((e) => e.kind === "stock");
		u(t ? e.series.slice(t.seriesStart, t.seriesStart + t.seriesCount) : e.series, e.stockUpDownBarStyle ?? {
			gapWidthPercent: 150,
			up: {},
			down: {}
		});
	}
	for (let t of e.lineGroupDecorations ?? []) t.upDownBars && u(Qr(e, t.groupIndex), t.upDownBars);
	return Math.max(1, a);
}
var ni = new Set([
	"clusteredBar",
	"clusteredBarH",
	"stackedBar",
	"stackedBarH",
	"stackedBarPct",
	"stackedBarHPct",
	"clusteredColumn",
	"line",
	"stackedLine",
	"stackedLinePct",
	"area",
	"stackedArea",
	"stackedAreaPct",
	"pie",
	"doughnut",
	"ofPie",
	"radar",
	"scatter",
	"bubble",
	"stock",
	"surface",
	"surface3D"
]);
function ri(e) {
	return ni.has(e);
}
function ii(e) {
	let t = 0, n = (e) => !Number.isSafeInteger(e) || e < 0 || e > 1e4 - t ? !1 : (t += e, !0), r = (e, n) => !Number.isSafeInteger(e) || e < 0 || !Number.isSafeInteger(n) || n < 0 || e !== 0 && n > Math.floor((1e4 - t) / e) ? !1 : (t += e * n, !0);
	if (!n(e.legendEntries?.length ?? 0) || !n(e.plotGroups?.length ?? 0)) return 10001;
	if (e.plotGroups != null) {
		let t = 0;
		for (let n of e.plotGroups) {
			if (!Number.isSafeInteger(n.seriesStart) || n.seriesStart < 0 || !Number.isSafeInteger(n.seriesCount) || n.seriesCount < 0 || n.seriesStart !== t || n.seriesCount > e.series.length - t) return 10001;
			t += n.seriesCount;
		}
		if (t !== e.series.length) return 10001;
	}
	for (let t of e.series) {
		let i = Math.max(1, e.categories.length, t.values.length, t.categories?.length ?? 0, t.bubbleSizes?.length ?? 0, t.dataPointOverrides?.length ?? 0, t.dataLabelOverrides?.length ?? 0);
		if (!n(i) || !r(t.trendLines?.length ?? 0, Math.max(1, t.values.length)) || !n(t.errBars?.length ?? 0)) return 10001;
		for (let e of t.errBars ?? []) if (!n(Math.max(i, e.plus.length, e.minus.length))) return 10001;
	}
	if (!n(e.chartexSunburst?.rows.length ?? 0) || !n(e.chartexTreemap?.rows.length ?? 0) || !n(e.chartexRegionMap?.rows.length ?? 0) || !n(e.chartexBox?.categories.length ?? 0) || !n(e.chartexBox?.series.length ?? 0)) return 10001;
	for (let t of e.chartexBox?.series ?? []) for (let e of t.valuesByCategory) if (!n(e.length)) return 10001;
	return n(e.ofPie?.customSplitIndices?.length ?? 0) ? t : 10001;
}
function ai(e) {
	if (!ri(e.chartType)) return null;
	let t = 0;
	for (let n of e.series) {
		let r = 0;
		for (let e of n.errBars ?? []) r = Math.max(r, e.plus.length, e.minus.length);
		let i = Math.max(1, e.categories.length, n.categories?.length ?? 0, n.values.length, n.bubbleSizes?.length ?? 0, n.dataPointOverrides?.length ?? 0, n.dataLabelOverrides?.length ?? 0, n.trendLines?.length ?? 0, r);
		if (!Number.isSafeInteger(i) || i > 1e4 - t) return 10001;
		t += i;
	}
	return t;
}
function oi(e, t) {
	return !Number.isSafeInteger(t) || t < 0 ? !1 : e.slabFaces ? t === 0 ? e.slabFaces.front : t === 1 || t >= 6 ? !1 : t % 2 == 0 ? e.slabFaces.end : e.slabFaces.sides : t === 0;
}
function si(e, t) {
	return e.mode !== "stack" && e.mode !== "stackScale" || !oi(e, t) ? !1 : !e.slabFaces || t === 0 || t % 2 == 1;
}
function ci(e, t) {
	return oi(e, t) ? li(e, t) ? e.repetitions : 1 : 0;
}
function li(e, t) {
	return e.mode === "stackScale" && si(e, t);
}
function ui(e) {
	let t = 0;
	for (let n = 0; n < 6; n++) t += ci(e, n), xn(t, Yr);
	return e;
}
function di(e) {
	return e == null || [
		e.l,
		e.t,
		e.r,
		e.b
	].every((e) => (e ?? 0) === 0);
}
function fi(e) {
	if (!e) return !0;
	let t = e.l ?? 0, n = e.t ?? 0, r = e.r ?? 0, i = e.b ?? 0, a = [
		t,
		n,
		r,
		i
	], o = 1 - r, s = 1 - i;
	return (!a.every(Number.isFinite) || !Number.isFinite(o - t) || !Number.isFinite(s - n)) && q(), o > t && s > n && Math.min(1, o) > Math.max(0, t) && Math.min(1, s) > Math.max(0, n);
}
function pi(e, t, n, r) {
	if (e.tile != null == (e.stretch === !0) || !fi(e.srcRect) || !fi(e.fillRect) || e.rotWithShape === !1 || e.alpha != null && (!Number.isFinite(e.alpha) || e.alpha < 0 || e.alpha > 1)) return null;
	let i = t?.pictureOptions;
	if (i?.pictureFormatAuthored === !0 && i.pictureFormat == null || i?.pictureStackUnitAuthored === !0 && i.pictureStackUnit == null) return null;
	let a = i?.pictureFormat ?? "stretch";
	if ((!di(e.srcRect) || !di(e.fillRect)) && a !== "stretch") return null;
	let o = t?.thicknessPercent ?? 0;
	(!Number.isFinite(o) || o < 0) && q();
	let s = o === 0 ? void 0 : {
		front: i?.applyToFront !== !1,
		sides: i?.applyToSides !== !1,
		end: i?.applyToEnd !== !1
	};
	if (s && !Object.values(s).some(Boolean) || !s && (n === "backWall" && i?.applyToFront === !1 || (n === "floor" || n === "sideWall") && i?.applyToSides === !1) || (i?.pictureStackUnitAuthored === !0 || i?.pictureStackUnit != null) && a !== "stackScale") return null;
	if (e.tile) return a !== "stretch" || !di(e.fillRect) ? null : ui({
		mode: "tile",
		repetitions: 1,
		slabFaces: s
	});
	if (a === "stretch") return ui({
		mode: "stretch",
		repetitions: 1,
		slabFaces: s
	});
	if (a === "stack") return ui({
		mode: "stack",
		repetitions: 1,
		slabFaces: s
	});
	if (a !== "stackScale") return null;
	let c = i?.pictureStackUnit;
	if (c == null) return null;
	if (Number.isFinite(c) && c > 0 || q(), n === "floor") return ui({
		mode: "stretch",
		repetitions: 1,
		slabFaces: s
	});
	if (r == null) return ui({
		mode: "stackScale",
		repetitions: 1,
		stackUnit: c,
		slabFaces: s
	});
	Number.isFinite(r) && r > 0 || q();
	let l = Math.ceil(r / c);
	return xn(l, Yr), ui({
		mode: "stackScale",
		repetitions: l,
		stackUnit: c,
		slabFaces: s
	});
}
function mi(e, t) {
	return e ? Math.max(.5, e / o) * t : 1;
}
function hi(e, t, n) {
	return {
		color: e ? `#${e}` : "#aaa",
		width: mi(t, n)
	};
}
function gi(e, t, n) {
	return {
		color: e ? `#${e}` : "#e0e0e0",
		width: t ? mi(t, n) : .5
	};
}
function _i(e) {
	return e.catAxisCrossBetween !== "midCat";
}
function vi(e, t) {
	if (!Number.isFinite(e) || e <= 0) return [];
	let n = t === "dbl" ? [
		1,
		1,
		1
	] : t === "thinThick" ? [
		1,
		1,
		3
	] : t === "thickThin" ? [
		3,
		1,
		1
	] : t === "tri" ? [
		1,
		1,
		2,
		1,
		1
	] : [1], r = e / n.reduce((e, t) => e + t, 0), i = [], a = 0;
	for (let e = 0; e < n.length; e += 2) {
		let t = n[e] * r;
		i.push({
			center: a + t / 2,
			width: t
		}), a += t + (n[e + 1] ?? 0) * r;
	}
	return i;
}
function yi(e, t, n, r, i, a) {
	let o = Math.max(0, Math.min(a, r / 2, i / 2));
	e.beginPath(), e.moveTo(t + o, n), e.lineTo(t + r - o, n), e.quadraticCurveTo(t + r, n, t + r, n + o), e.lineTo(t + r, n + i - o), e.quadraticCurveTo(t + r, n + i, t + r - o, n + i), e.lineTo(t + o, n + i), e.quadraticCurveTo(t, n + i, t, n + i - o), e.lineTo(t, n + o), e.quadraticCurveTo(t, n, t + o, n), e.closePath();
}
function bi(e, t, n, r, i, a, o, s = 0) {
	if (r > 0 && i > 0) for (let c of vi(a, o)) {
		let a = Math.max(0, r - c.center * 2), o = Math.max(0, i - c.center * 2);
		a > 0 && o > 0 && (e.lineWidth = c.width, s > 0 ? (yi(e, t + c.center, n + c.center, a, o, Math.max(0, s - c.center)), e.stroke()) : e.strokeRect(t + c.center, n + c.center, a, o));
	}
}
function xi(e) {
	let t = R(e, "legend"), n = e.legendFillHidden === !0 && G(t) === void 0;
	if (!(e.legendFillHidden === !0 && !n)) {
		if (e.legendFill != null) return e.legendFill;
		if (!(e.legendFillColor != null || e.legendFillPaintAuthored === !0 && !n)) return K(e.chartStyleRoles?.legend, t, 0, e.legendStyle) ?? void 0;
	}
}
function Si(e, t, r, i, a = 0) {
	(!t.legendFill && !t.legendFillColor || t.legendFillHidden === !0) && (!t.legendLineFill && !t.legendLineColor || t.legendLineHidden === !0) || Dr(e, t.legendStyle, t.chartStyleRoles?.legend, 0, r, i, (e) => {
		if (e.save(), t.legendFillHidden !== !0 && (t.legendFill || t.legendFillColor)) {
			let n = t.legendFill?.fillType === "image" && Ir(e, t.legendFill, r.x, r.y, r.w, r.h, i, a) ? null : t.legendFill ? d(t.legendFill, e, r.x, r.y, r.w, r.h, a) : t.legendFillColor ? `#${t.legendFillColor}` : null;
			n && (e.fillStyle = n), n && e.fillRect(r.x, r.y, r.w, r.h);
		}
		if (t.legendLineHidden !== !0 && (t.legendLineFill || t.legendLineColor) && r.w > 0 && r.h > 0) {
			let o = mi(t.legendLineWidthEmu, i), s = t.legendLineFill ? d(t.legendLineFill, e, r.x, r.y, r.w, r.h, a) : t.legendLineColor ? `#${t.legendLineColor}` : null;
			s && (e.strokeStyle = s, e.lineCap = t.legendLineCap === "rnd" ? "round" : t.legendLineCap === "sq" ? "square" : "butt", e.lineJoin = t.legendLineJoin === "round" || t.legendLineJoin === "bevel" ? t.legendLineJoin : "miter", e.setLineDash(n(t.legendLineCustomDash, t.legendLineDash, o)), bi(e, r.x, r.y, r.w, r.h, o, t.legendLineCompound));
		}
		e.restore();
	});
}
function Ci(e, t) {
	if (!e.some(Boolean)) return null;
	let n = Math.max(t, e.length), r = [], i = new Int32Array(n);
	i.fill(-1);
	for (let t = 0; t < n; t++) e[t] !== !0 && (i[t] = r.length, r.push(t));
	return {
		keep: r,
		remap: i
	};
}
function X(e, t) {
	if (e == null) return e;
	let n = [];
	for (let r of t.keep) r < e.length && n.push(e[r]);
	return n;
}
function wi(e, t) {
	if (e == null) return e;
	let n = [];
	for (let r of e) {
		if (r.idx >= t.remap.length) continue;
		let e = t.remap[r.idx];
		e >= 0 && n.push({
			...r,
			idx: e
		});
	}
	return n;
}
function Ti(e) {
	return Math.max(e.values.length, e.categories?.length ?? 0, e.sourceHidden?.length ?? 0, e.dataPointColors?.length ?? 0, e.dataLabelColors?.length ?? 0, e.catFormatCodes?.length ?? 0, e.bubbleSizes?.length ?? 0, ...(e.errBars ?? []).flatMap((e) => [e.plus.length, e.minus.length]));
}
function Ei(e, t) {
	return {
		...e,
		values: X(e.values, t) ?? [],
		categories: X(e.categories, t),
		sourceHidden: X(e.sourceHidden, t),
		dataPointColors: X(e.dataPointColors, t),
		dataLabelColors: X(e.dataLabelColors, t),
		catFormatCodes: X(e.catFormatCodes, t),
		bubbleSizes: X(e.bubbleSizes, t),
		dataPointOverrides: wi(e.dataPointOverrides, t),
		dataLabelOverrides: wi(e.dataLabelOverrides, t),
		errBars: e.errBars?.map((e) => ({
			...e,
			plus: X(e.plus, t) ?? [],
			minus: X(e.minus, t) ?? []
		}))
	};
}
function Di(e) {
	let t = e.sourceHidden;
	if (!t?.some(Boolean)) return e;
	let n = (e, n) => e == null ? e : e.map((e, r) => t[r] === !0 ? n : e);
	return {
		...e,
		values: n(e.values, null) ?? [],
		bubbleSizes: n(e.bubbleSizes, null),
		errBars: e.errBars?.map((e) => ({
			...e,
			plus: n(e.plus, null) ?? [],
			minus: n(e.minus, null) ?? []
		}))
	};
}
function Oi(e) {
	return e.chartType === "scatter" || e.chartType === "bubble";
}
function ki(e) {
	let t = e.sourceHidden;
	return t != null && t.length > 0 && t.every(Boolean);
}
function Ai(e, t) {
	if (e.plotGroups == null) return e.plotGroups;
	let n = new Set(t), r = 0;
	return e.plotGroups.map((e) => {
		let t = 0, i = e.seriesStart + e.seriesCount;
		for (let r = e.seriesStart; r < i; r++) n.has(r) && t++;
		let a = {
			...e,
			seriesStart: r,
			seriesCount: t
		};
		return r += t, a;
	});
}
var ji = [
	"diamond",
	"square",
	"triangle",
	"x",
	"star",
	"circle"
], Mi = /* @__PURE__ */ new WeakSet();
function Ni(e) {
	return Mi.has(e);
}
function Pi(e, t) {
	let n = e.themeAccentColors, r = t.dataPointColors?.some((e) => e != null) === !0 || (t.dataPointOverrides?.length ?? 0) > 0, i = t.markerSymbol != null || t.markerFill != null || t.markerFillPaintAuthored === !0 || t.markerLine != null || t.markerLinePaintAuthored === !0;
	if (e.scatterStyle !== "marker" || !n?.length || r || i || t.lineHidden === !0) return t;
	let a = {
		...t,
		dataPointColors: t.values.map((e, t) => n[t % n.length]),
		dataPointOverrides: t.values.map((e, t) => ({
			idx: t,
			markerSymbol: ji[t % ji.length]
		}))
	};
	return Mi.add(a), a;
}
function Fi(e) {
	if (e.plotVisibleOnly !== !0) return e;
	if (Oi(e)) {
		let t = [];
		return {
			...e,
			series: e.series.flatMap((n, r) => {
				let i = n.categories == null ? {
					...n,
					categories: e.categories
				} : n, a = i.sourceHidden, o = a && Ci(a, Ti(i));
				if (!o) return t.push(r), [i];
				if (o.keep.length === 0) return [];
				t.push(r);
				let s = Ei(i, o);
				return e.chartType === "scatter" ? [Pi(e, s)] : [s];
			}),
			plotGroups: Ai(e, t)
		};
	}
	let t = Math.max(e.categories.length, ...e.categoryLevels?.map((e) => e.length) ?? [], ...e.series.map(Ti)), n = e.categorySourceHidden ? Ci(e.categorySourceHidden, t) : null, r = [], i = e.series.flatMap((e, t) => {
		let i = n ? Ei(e, n) : e;
		return n?.keep.length === 0 || ki(i) ? [] : (r.push(t), [Di(i)]);
	}), a = Ai(e, r);
	if (!n) return {
		...e,
		series: i,
		plotGroups: a
	};
	let o = e.subtotalIndices.flatMap((e) => {
		if (e >= n.remap.length) return [];
		let t = n.remap[e];
		return t >= 0 ? [t] : [];
	});
	return {
		...e,
		categories: X(e.categories, n) ?? [],
		categoryLevels: e.categoryLevels?.map((e) => X(e, n) ?? []),
		categorySourceHidden: X(e.categorySourceHidden, n),
		subtotalIndices: o,
		series: i,
		plotGroups: a
	};
}
function Ii() {
	throw new u("image-effect-work", Yr, 2 ** 53 - 1);
}
function Li(e, t, n, r) {
	let i = t * (r ? 2 : 1);
	return (![
		e,
		t,
		n,
		i
	].every(Number.isFinite) || !(t > 0) || !(n > 0) || n + t === n) && Ii(), (Math.abs(e) + i) * Ri * 2 ** -52 > Math.min(zi, t / 8) && Ii(), e % i;
}
var Ri = 4, zi = 1 / 16;
function Bi(e) {
	return e != null && Number.isFinite(e) ? e : null;
}
function Vi(e) {
	let t = String(Math.abs(e));
	if (t.includes("e")) return Infinity;
	let n = t.indexOf(".");
	return n < 0 ? 0 : t.length - n - 1;
}
function Hi(e) {
	return (t) => !Number.isFinite(t) || t === 0 ? t === 0 ? 0 : t : e <= 15 && Math.abs(t) * 10 ** e < 9e15 ? Number(t.toFixed(e)) : Number(t.toPrecision(15));
}
function Ui(e, t) {
	let n = !e || e.trim().toLowerCase() === "general";
	return (r) => {
		let i = r === 0 ? 0 : r;
		return n ? String(i) : v(i, e, t);
	};
}
function Wi(e) {
	let t = 0, n = 0, r = 0;
	for (let i of e) {
		if (i == null || !Number.isFinite(i)) continue;
		t++;
		let e = i - n;
		n += e / t, r += e * (i - n);
	}
	if (t <= 1) return 5;
	let i = Math.sqrt(r / (t - 1));
	if (!(i > 0)) return 5;
	let a = Number((3.5 * i / Math.cbrt(t)).toPrecision(2));
	return a > 0 ? a : 5;
}
function Gi(e, t, n, r = !1) {
	if (e.length > 1048576) return { kind: "tooManyInputPoints" };
	let i = Ui(t.edgeFormatCode ?? n, r), a = t.intervalClosed === "r" ? "r" : "l", o = Bi(t.underflow), s = Bi(t.overflow);
	o != null && s != null && o >= s && (o = null, s = null);
	let c = (e) => o != null && (a === "r" ? e <= o : e < o), l = (e) => s != null && (a === "r" ? e > s : e >= s), u = Infinity, d = -Infinity, f = 0, p = 0, m = 0;
	for (let t of e) {
		let e = Bi(t);
		e != null && (c(e) ? p++ : l(e) ? m++ : (f++, u = Math.min(u, e), d = Math.max(d, e)));
	}
	if (f + p + m === 0) return {
		kind: "bins",
		categories: [],
		counts: []
	};
	let h = [], g = [];
	if (o != null && (h.push(`${a === "r" ? "≤" : "<"} ${i(o)}`), g.push(p)), f > 0) {
		let n = o ?? u, r = s ?? d, p = r - n;
		if (!Number.isFinite(p)) h.push(`[${i(n)}, ${i(r)}]`), g.push(f);
		else {
			let u = Bi(t.binSize), d = t.binCount != null && Number.isFinite(t.binCount) && t.binCount > 0 ? Math.max(1, Math.floor(t.binCount)) : null, f = u != null && u > 0, m = f || d == null, _ = 0, v;
			if (m) {
				if (_ = f ? u : Wi(e), v = 1, p > 0 && Number.isFinite(_) && _ > 0) {
					let e = Hi(Math.max(Vi(_), Vi(n))), t = (t) => e(n + _ * t), i = Math.max(1, Math.ceil(p / _));
					if (Number.isFinite(i) && i <= 512 * 4) {
						for (; i > 1 && t(i - 1) >= r;) i--;
						for (; t(i) < r && i <= 512 * 4;) i++;
					}
					v = i;
				}
				Number.isFinite(v) || (v = 1);
			} else v = d;
			let y = p <= 0 ? 1 : Math.min(512, v), b = m && v <= 512 && Number.isFinite(_) && _ > 0, x = b ? _ : p === 0 ? 1 : p / y, S = Array(y).fill(0), C = Hi(b ? Math.max(Vi(x), Vi(n)) : Infinity), w = [];
			for (let e = 0; e <= y; e++) {
				let t = b ? n + x * e : n + p * e / y;
				w.push(C(s == null ? t : Math.min(t, s)));
			}
			let T = !0;
			for (let e = 1; e <= y; e++) w[e] > w[e - 1] || (T = !1);
			for (let t of e) {
				let e = Bi(t);
				if (e == null || c(e) || l(e)) continue;
				let r;
				if (T) {
					let t = 0, n = y - 1;
					if (a === "r") for (; t < n;) {
						let r = t + n >> 1;
						e <= w[r + 1] ? n = r : t = r + 1;
					}
					else for (; t < n;) {
						let r = t + n + 1 >> 1;
						e >= w[r] ? t = r : n = r - 1;
					}
					r = t;
				} else {
					let t = p === 0 ? 0 : (e - n) / p * y, i = a === "r" ? Math.ceil(t) - 1 : Math.floor(t);
					r = Math.max(0, Math.min(y - 1, i));
				}
				S[r]++;
			}
			for (let e = 0; e < y; e++) {
				let t = i(w[e]), n = i(w[e + 1]), r = e === y - 1, c = a === "r" && (o != null || e > 0), l = a === "l" && !(r && s == null);
				h.push(`${c ? "(" : "["}${t}, ${n}${l ? ")" : "]"}`), g.push(S[e]);
			}
		}
	}
	return s != null && (h.push(`${a === "r" ? ">" : "≥"} ${i(s)}`), g.push(m)), {
		kind: "bins",
		categories: h,
		counts: g
	};
}
function Ki(e, t) {
	return e == null ? e : e.flatMap((e) => {
		let n = t.get(e.idx);
		return n == null ? [] : [{
			...e,
			idx: n
		}];
	});
}
function qi(e, t) {
	return e == null ? e : t.map((t) => e[t] ?? null);
}
function Ji(e, t, n = {}) {
	let r = e.values.map((e, t) => ({
		value: e,
		sourceIndex: t
	})).filter((e) => e.value != null && Number.isFinite(e.value) && e.value >= 0);
	n.sortDescending !== !1 && r.sort((e, t) => t.value - e.value || e.sourceIndex - t.sourceIndex);
	let i = r.reduce((e, t) => Math.max(e, t.value), 0), a = i > 0 ? r.reduce((e, t) => e + t.value / i, 0) : 0, o = 0, s = r.map((n) => (i > 0 && (o += n.value / i), {
		sourceIndex: n.sourceIndex,
		category: e.categories?.[n.sourceIndex] ?? t[n.sourceIndex] ?? String(n.sourceIndex + 1),
		value: n.value,
		cumulativeFraction: a > 0 ? o >= a ? 1 : o / a : 0
	})), c = s.map((e) => e.sourceIndex);
	if (n.keepUnvaluedCategories) {
		for (let n = 0; n < t.length; n++) e.values[n] == null && t[n] !== "" && c.push(n);
		n.sortDescending === !1 && c.sort((e, t) => e - t);
	}
	let l = new Map(c.map((e, t) => [e, t])), u = c.map((n) => e.categories?.[n] ?? t[n] ?? String(n + 1)), d = c.map((t) => {
		let n = e.values[t];
		return n != null && Number.isFinite(n) && n >= 0 ? n : null;
	}), f = new Map(s.map((e) => [e.sourceIndex, e.cumulativeFraction])), p = 0, m = c.map((e) => (p = f.get(e) ?? p, p)), h = {
		...e,
		categories: u,
		catFormatCodes: qi(e.catFormatCodes, c),
		dataPointColors: qi(e.dataPointColors, c),
		dataLabelColors: qi(e.dataLabelColors, c),
		dataPointOverrides: Ki(e.dataPointOverrides, l),
		dataLabelOverrides: Ki(e.dataLabelOverrides, l)
	};
	return {
		points: s,
		categories: u,
		orderedSeries: {
			...h,
			values: d
		},
		series: {
			...h,
			values: m
		}
	};
}
var Yi = [
	"4472C4",
	"ED7D31",
	"A9D18E",
	"FF0000",
	"70AD47",
	"4BACC6",
	"FFC000",
	"9E480E",
	"843C0C",
	"636363",
	"255E91",
	"967300"
], Xi = [
	"5B9BD5",
	"ED7D31",
	"A5A5A5",
	"FFC000",
	"4472C4",
	"70AD47"
];
function Zi(e, t) {
	return t?.color ? `#${t.color}` : `#${Yi[e % Yi.length]}`;
}
function Qi(e) {
	let t = /* @__PURE__ */ new Map();
	for (let n of e ?? []) t.has(n.idx) || t.set(n.idx, n);
	return t;
}
function $i(e, t, n = !0, r = e) {
	let i = t.dataPointColors?.[e];
	return i ? `#${i}` : t.color === "00000000" ? "#00000000" : n ? `#${Yi[e % Yi.length]}` : Zi(r, t);
}
function ea(e, t, n, r) {
	return z(e, n) ? r : ra(t, n);
}
function ta(e, t, r, i, a, o, s, c, l, u, f, p = !0, m = !0) {
	let h = Te(t, r, i, a, o), { paint: g } = h;
	if (g === void 0 && !p || (g === void 0 && (g = {
		fillType: "solid",
		color: s.replace(/^#/, "")
	}), g === null)) return !1;
	let _ = g.fillType === "solid" ? g.color.startsWith("#") ? g.color : `#${g.color}` : d(g, e, u.x, u.y, u.w, u.h, f);
	if (!_) return !1;
	e.strokeStyle = _, e.lineWidth = h.widthEmu == null ? c : mi(h.widthEmu, l);
	let v = n(h.customDash, h.dash, e.lineWidth), y = typeof e.getLineDash == "function" ? e.getLineDash() ?? [] : [];
	return (m || v.length > 0 || y.length > 0) && e.setLineDash(v), e.lineCap = h.cap === "rnd" ? "round" : h.cap === "sq" ? "square" : "butt", e.lineJoin = h.join === "round" || h.join === "bevel" ? h.join : "miter", !0;
}
function na(e, t, n, r, i, a, o, s, c, l, u, d = !0) {
	let f = Math.max(0, A(t, n)), p = Qi(n.dataPointOverrides), m = B(t, "dataPointLine", f), h = (r, a, f, h, g = !1) => {
		let _ = p.get(a.index);
		Dr(e, Y(_?.chartexStyle, n.chartexStyle), m, a.index, l, c, (e) => {
			if (e.save(), ta(e, t, "dataPointLine", n, _, a.index, o, s, c, l, u, d)) {
				if (e.beginPath(), e.moveTo(r.x, r.y), i && !g) {
					let t = f[h - 1] ?? r, n = f[h + 2] ?? a;
					e.bezierCurveTo(r.x + (a.x - t.x) / 6, r.y + (a.y - t.y) / 6, a.x - (n.x - r.x) / 6, a.y - (n.y - r.y) / 6, a.x, a.y);
				} else e.lineTo(a.x, a.y);
				e.stroke();
			}
			e.restore();
		}, a.index);
	};
	for (let e of r) {
		for (let t = 0; t + 1 < e.length; t++) h(e[t], e[t + 1], e, t);
		a && e.length > 1 && h(e[e.length - 1], e[0], e, e.length - 1, !0);
	}
}
function ra(e, t) {
	return e?.chartexFormatIdx ?? t;
}
function ia(e, t = {
	min: 0,
	max: 1
}) {
	let n = Infinity, r = -Infinity;
	for (let t of e) t == null || !Number.isFinite(t) || (t < n && (n = t), t > r && (r = t));
	return Number.isFinite(n) && Number.isFinite(r) ? {
		min: n,
		max: r
	} : t;
}
function aa(e, t = 5) {
	if (e === 0) return 1;
	let n = e / t, r = 10 ** Math.floor(Math.log10(n)), i = n / r;
	return (i < 1.5 ? 1 : i < 3.5 ? 2 : i < 7.5 ? 5 : 10) * r;
}
function oa(e, t, n, r) {
	let i = Number.isFinite(e) ? e : 0, a = Number.isFinite(t) ? t : 100, o = a > i ? a - i : 100, s = i < 0 && a > 0, c = n === "horizontal" || r == null || !Number.isFinite(r) || r < 120 ? s ? 4 : 5 : 10;
	return la(a > i ? fa(i, a, c) : o / c);
}
function sa(e, t, n) {
	let r = Number.isFinite(e) ? e : 0, i = Number.isFinite(t) ? t : 1, a = i > r ? null : 1, o = n != null && Number.isFinite(n) ? n < 45 ? 4 : n < 90 ? 8 : 10 : 8;
	return la(i > r ? fa(r, i, o) : (a ?? 1) / o);
}
function ca(e, t, n) {
	let r = Number.isFinite(e) ? e : 0, i = Number.isFinite(t) ? t : 1;
	return la((i > r ? i - r : 1) / (n != null && Number.isFinite(n) && n > 0 ? Math.max(5, Math.round(n / 28)) : 5));
}
function la(e) {
	if (!(e > 0) || !isFinite(e)) return 1;
	let t = 10 ** Math.floor(Math.log10(e));
	if (!(t > 0) || !isFinite(t)) return e;
	let n = e / t, r = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
	return Math.min(Number.MAX_VALUE, r * t);
}
function ua(e) {
	return e != null && isFinite(e) ? e : null;
}
function da(e) {
	return e != null && isFinite(e) && e > 0 ? e : null;
}
function fa(e, t, n) {
	let r = t - e, i = isFinite(r) ? r / n : t / n - e / n;
	return i > 0 && isFinite(i) ? i : r > 0 && isFinite(r) ? Number.MIN_VALUE : Number.MAX_VALUE;
}
function pa(e, t, n) {
	if (!isFinite(e) || !isFinite(t) || !(t >= e) || !(n > 0) || !isFinite(n)) return 0;
	let r = t - e, i = isFinite(r) ? r / n : t / n - e / n;
	return !isFinite(i) || i > 2 ** 53 - 1 ? Infinity : Math.max(1, Math.floor(i + 1e-9) + 1);
}
function ma(e, t, n, r, i) {
	let a = pa(e, t, n);
	if (a === 0 || a > 512 && r === "skip") return [];
	let o = Math.min(a, 512), s = [], c = t - e, l = Math.max(Math.abs(n), isFinite(c) ? Math.abs(c) : Math.max(Math.abs(e), Math.abs(t))) * 1e-9, u = -Infinity;
	for (let r = 0; r < o; r++) {
		let a = r * n, o = e + a;
		if ((!isFinite(a) || !isFinite(o) || r > 0 && !(o > u)) && (o = (e / n + r) * n), !isFinite(o) || o > t + l || r > 0 && !(o > u)) break;
		if (u = o, i != null) {
			if (o >= t - l) break;
			let n = o - e, r = isFinite(n) ? n / i : o / i - e / i;
			if (isFinite(r) && Math.abs(r - Math.round(r)) <= 1e-8) continue;
		}
		s.push(o);
	}
	return s;
}
function ha(e) {
	let t = isFinite(e.dataMin) ? e.dataMin : 0, n = isFinite(e.dataMax) ? e.dataMax : 1;
	t > n && ([t, n] = [n, t]);
	let r, i, a;
	if (t === 0 && n === 0) r = 0, i = 1, a = .1;
	else {
		t === n && (t = Math.min(0, t), n = Math.max(0, n));
		let e = t >= 0 && (t === 0 || n > 1.2 * t), o = n <= 0 && (n === 0 || Math.abs(t) > 1.2 * Math.abs(n)), s = e ? 0 : t, c = o ? 0 : n, l = c - s, u = isFinite(l) ? l * .05 : c * .05 - s * .05, d = e ? 0 : t - u, f = o ? 0 : n + u;
		a = la(f / 10 - d / 10), r = Math.floor(d / a) * a, i = Math.ceil(f / a) * a, (!isFinite(r) || !isFinite(i) || !(i > r)) && (r = Math.min(t, 0), i = Math.max(n, r + a));
	}
	let o = ua(e.explicitMin), s = ua(e.explicitMax), c = da(e.majorUnit), l = o ?? (c == null ? r : Math.floor(r / c) * c), u = s ?? (c == null ? i : Math.ceil(i / c) * c), d = a;
	if (c == null && o != null && s != null && s > o) {
		if (e.axisOrientation === "horizontal") d = la(fa(o, s, e.axisLenPt != null && isFinite(e.axisLenPt) && e.axisLenPt > 0 ? Math.max(5, Math.round(e.axisLenPt / 38)) : 8));
		else if (e.axisOrientation === "vertical") {
			let t = e.axisLenPt != null && isFinite(e.axisLenPt) && e.axisLenPt > 0 ? Math.max(5, Math.round(e.axisLenPt / 28)) : 7;
			d = Math.max(la(fa(o, s, 10)), Math.min(Number.MAX_VALUE, aa(fa(o, s, t), 1)));
		}
	}
	let f = c ?? d;
	c == null && pa(l, u, f) > 512 && (f = la(u / 511 - l / 511));
	let p = da(e.minorUnit);
	e.needMinor && c == null && p == null && pa(l, u, f / 5) > 512 && (f = la(u / 102 - l / 102));
	let m = f / 5, h = e.needMinor ? p ?? (m > 0 && isFinite(m) ? m : f) : null, g = ma(l, u, f, c == null ? "skip" : "truncate"), _ = h == null ? [] : ma(l, u, h, "skip", f);
	return {
		min: l,
		max: u,
		majorUnit: f,
		minorUnit: h,
		majorTicks: g,
		minorTicks: _
	};
}
function ga(e, t, n, r) {
	let i, a = r?.logBase;
	if (a != null && isFinite(a) && a >= 2 && t > 0 && n > 0) {
		let r = Math.log(t), a = Math.log(n) - r;
		i = a === 0 ? 0 : (Math.log(Math.max(e, Number.MIN_VALUE)) - r) / a;
	} else {
		let r = n - t;
		if (r === 0) i = 0;
		else if (Number.isFinite(r) && Number.isFinite(e - t)) i = (e - t) / r;
		else {
			let r = Math.max(Math.abs(e), Math.abs(t), Math.abs(n)), a = n / r - t / r;
			i = a === 0 ? 0 : (e / r - t / r) / a;
		}
	}
	return r?.reversed ? 1 - i : i;
}
function _a(e, t, n, r, i) {
	let a = isFinite(n) && n >= 2 ? n : 10, o = (e) => Math.log(e) / Math.log(a), s = t > 0 ? t : 1, c = Math.floor(o(e > 0 ? e : s)), l = Math.ceil(o(s)), u = (e) => {
		let t = a ** +e;
		return t === 0 ? Number.MIN_VALUE : isFinite(t) ? t : Number.MAX_VALUE;
	}, d = r ?? u(c), f = i ?? u(Math.max(l, c + 1)), p = [], m = Math.ceil(o(d) - 1e-9), h = Math.floor(o(f) + 1e-9);
	if (!isFinite(m) || !isFinite(h) || h < m) return {
		min: d,
		max: f,
		lines: p
	};
	let g = h - m + 1, _ = Math.max(1, Math.ceil((g - 1) / 511)), v = Math.min(512, Math.floor((g - 1) / _) + 1);
	for (let e = 0; e < v; e++) {
		let t = u(m + e * _);
		t >= d && t <= f && (p.length === 0 || t > p[p.length - 1]) && p.push(t);
	}
	let y = u(h);
	return p.length < 512 && y >= d && y <= f && y > (p[p.length - 1] ?? 0) && p.push(y), {
		min: d,
		max: f,
		lines: p
	};
}
function va(e) {
	let t = e.logBase;
	if (t != null && Number.isFinite(t) && t >= 2) {
		let { min: n, max: r, lines: i } = _a(e.dataMin, e.dataMax, t, ua(e.explicitMin), ua(e.explicitMax));
		return {
			min: n,
			max: r,
			majorUnit: i.length > 1 ? i[1] - i[0] : r - n,
			minorUnit: null,
			majorTicks: i,
			minorTicks: [],
			fraction: (i) => ga(i, n, r, {
				logBase: t,
				reversed: e.reversed
			})
		};
	}
	let n = ha(e);
	return {
		...n,
		fraction: (t) => ga(t, n.min, n.max, { reversed: e.reversed })
	};
}
function ya(e, t, n) {
	let r = Math.min(e.length, t.length);
	if (r < 2) return null;
	let i = 0, a = 0, o = 0, s = 0;
	for (let n = 0; n < r; n++) i += e[n], a += t[n], o += e[n] * e[n], s += e[n] * t[n];
	let c, l;
	if (n != null && isFinite(n)) c = o === 0 ? 0 : (s - n * i) / o, l = n;
	else {
		let e = r * o - i * i;
		c = e === 0 ? 0 : (r * s - i * a) / e, l = (a - c * i) / r;
	}
	let u = a / r, d = 0, f = 0;
	for (let n = 0; n < r; n++) {
		let r = t[n] - (c * e[n] + l);
		d += r * r;
		let i = t[n] - u;
		f += i * i;
	}
	let p = f === 0 ? +(d === 0) : 1 - d / f;
	return {
		slope: c,
		intercept: l,
		rSquared: p
	};
}
function ba(e, t, n, r) {
	let i = Math.min(e.length, t.length);
	if (i < 2) return {
		xs: [],
		ys: []
	};
	if (n === "linear") {
		let n = ya(e, t, r?.intercept);
		if (!n) return {
			xs: [],
			ys: []
		};
		let a = e[0], o = e[i - 1];
		return {
			xs: [a, o],
			ys: [n.slope * a + n.intercept, n.slope * o + n.intercept]
		};
	}
	if (n === "movingAvg") {
		let n = Math.max(2, Math.round(r?.period ?? 2));
		if (i < n) return {
			xs: [],
			ys: []
		};
		let a = [], o = [], s = 0;
		for (let e = 0; e < n; e++) s += t[e];
		for (let r = n - 1; r < i; r++) {
			a.push(e[r]), o.push(s / n);
			let c = r + 1;
			c < i && (s += t[c] - t[c - n]);
		}
		return {
			xs: a,
			ys: o
		};
	}
	let a = [];
	for (let r = 0; r < i; r++) {
		let i = e[r], o = t[r];
		!Number.isFinite(i) || !Number.isFinite(o) || n === "log" && i <= 0 || n === "exp" && o <= 0 || n === "power" && (i <= 0 || o <= 0) || a.push({
			x: i,
			y: o
		});
	}
	if (a.length < 2) return {
		xs: [],
		ys: []
	};
	let o = Infinity, s = -Infinity;
	for (let e of a) o = Math.min(o, e.x), s = Math.max(s, e.x);
	if (!Number.isFinite(o) || !Number.isFinite(s) || s <= o) return {
		xs: [],
		ys: []
	};
	let c = Number.isFinite(r?.backward) ? Math.max(0, r?.backward ?? 0) : 0, l = Number.isFinite(r?.forward) ? Math.max(0, r?.forward ?? 0) : 0, u = o - c, d = s + l;
	if ((n === "log" || n === "power") && (u = Math.max(Number.MIN_VALUE, u)), !Number.isFinite(u) || !Number.isFinite(d) || d <= u) return {
		xs: [],
		ys: []
	};
	let f = (e) => {
		let t = [], n = [];
		for (let r = 0; r <= 64; r++) {
			let i = r / 64, a = u * (1 - i) + d * i, o = e(a);
			if (!Number.isFinite(a) || !Number.isFinite(o)) return {
				xs: [],
				ys: []
			};
			t.push(a), n.push(o);
		}
		return {
			xs: t,
			ys: n
		};
	};
	if (n === "exp" || n === "log" || n === "power") {
		let e = ya(a.map((e) => n === "log" || n === "power" ? Math.log(e.x) : e.x), a.map((e) => n === "exp" || n === "power" ? Math.log(e.y) : e.y));
		if (!e || ![e.slope, e.intercept].every(Number.isFinite)) return {
			xs: [],
			ys: []
		};
		if (n === "exp") {
			let t = Math.exp(e.intercept);
			return f((n) => t * Math.exp(e.slope * n));
		}
		if (n === "log") return f((t) => e.slope * Math.log(t) + e.intercept);
		let t = Math.exp(e.intercept);
		return f((n) => t * n ** e.slope);
	}
	if (n === "poly") {
		let e = Math.min(6, a.length - 1, Math.max(2, Math.round(r?.order ?? 2)));
		if (e < 2) return {
			xs: [],
			ys: []
		};
		let t = o / 2 + s / 2, n = Math.max(Math.abs(o - t), Math.abs(s - t));
		if (!Number.isFinite(t) || !Number.isFinite(n) || n <= 0) return {
			xs: [],
			ys: []
		};
		let i = a.length, c = e + 1, l = Array.from({ length: c }, () => Array(i).fill(0));
		for (let e = 0; e < i; e++) {
			let r = (a[e].x - t) / n, i = 1;
			for (let t = 0; t < c; t++) l[t][e] = i, i *= r;
		}
		let u = [], d = Array.from({ length: c }, () => Array(c).fill(0)), p = Array(c).fill(0);
		for (let e = 0; e < c; e++) {
			let t = l[e].slice();
			for (let n = 0; n < e; n++) {
				let r = 0;
				for (let e = 0; e < i; e++) r += u[n][e] * t[e];
				d[n][e] = r;
				for (let e = 0; e < i; e++) t[e] -= r * u[n][e];
			}
			let n = 0;
			for (let e of t) n += e * e;
			let r = Math.sqrt(n);
			if (!Number.isFinite(r) || r <= 2 ** -52 * Math.sqrt(i)) return {
				xs: [],
				ys: []
			};
			d[e][e] = r;
			let o = t.map((e) => e / r);
			u.push(o);
			let s = 0;
			for (let e = 0; e < i; e++) s += o[e] * a[e].y;
			if (!Number.isFinite(s)) return {
				xs: [],
				ys: []
			};
			p[e] = s;
		}
		let m = Array(c).fill(0);
		for (let e = c - 1; e >= 0; e--) {
			let t = p[e];
			for (let n = e + 1; n < c; n++) t -= d[e][n] * m[n];
			if (m[e] = t / d[e][e], !Number.isFinite(m[e])) return {
				xs: [],
				ys: []
			};
		}
		return f((r) => {
			let i = (r - t) / n, a = m[e];
			for (let t = e - 1; t >= 0; t--) a = a * i + m[t];
			return a;
		});
	}
	return {
		xs: [],
		ys: []
	};
}
function xa(e, t, n) {
	return e < t ? t : e > n ? n : e;
}
function Sa(e, t, n) {
	if (t.length !== 0) if (n && t.length >= 3) for (let n = 0; n < t.length - 1; n++) {
		let r = t[n - 1] ?? t[n], i = t[n], a = t[n + 1], o = t[n + 2] ?? a, s = i.x + (a.x - r.x) / 6, c = i.y + (a.y - r.y) / 6, l = a.x - (o.x - i.x) / 6, u = a.y - (o.y - i.y) / 6;
		e.bezierCurveTo(s, c, l, u, a.x, a.y);
	}
	else for (let n = 1; n < t.length; n++) e.lineTo(t[n].x, t[n].y);
}
function Z(e, n = 1) {
	return t(e ?? "solid", Number.isFinite(n) && n > 0 ? n : 1);
}
function Ca(e, t, r = 1) {
	return n(e, t, Number.isFinite(r) && r > 0 ? r : 1);
}
var wa = "Calibri, Arial, sans-serif";
function Ta(e, t) {
	let n = e?.fontSubstitutions;
	if (!n) return;
	let r = i(t);
	if (!Object.prototype.hasOwnProperty.call(n, r)) return;
	let a = n[r];
	return typeof a == "string" && a ? a : void 0;
}
function Ea(e, t) {
	let n = Ta(t, e);
	return n ? `"${e}", "${n.replace(/["\\]/g, "")}"` : `"${e}"`;
}
function Da(e) {
	if (!e?.fontSubstitutions) return wa;
	let t = (t) => {
		let n = Ta(e, t);
		return n ? `${t}, "${n.replace(/["\\]/g, "")}"` : t;
	};
	return `${t("Calibri")}, ${t("Arial")}, sans-serif`;
}
function Oa(e, t) {
	return `${Ea(e, t)}, ${Da(t)}`;
}
function ka(e, t) {
	return t && (t.startsWith("+mj") ? e.themeMajorFontLatin ?? null : t.startsWith("+mn") ? e.themeMinorFontLatin ?? null : t);
}
function Aa(e, t, n) {
	let r = n === "major" ? e.themeMajorFontLatin : e.themeMinorFontLatin, i = ka(e, t) ?? r;
	return i ? Oa(i, e) : "sans-serif";
}
function ja(e, t, n = !1, r = !1) {
	return `${r ? "italic " : ""}${n ? "bold " : ""}${e}px ${t}`;
}
function Ma(e, t, n, r = {
	x: 0,
	y: 0,
	w: Math.max(1, e.canvas?.width ?? 1),
	h: Math.max(1, e.canvas?.height ?? 1)
}, i = 0) {
	if (t.hidden === !0 || t.paintAuthored === !0 && t.color == null && t.fill == null) return !1;
	let a = t.fill == null ? t.color == null ? "#000000" : `#${t.color}` : d(t.fill, e, r.x, r.y, r.w, r.h, i);
	return a == null ? !1 : (e.strokeStyle = a, e.lineWidth = t.widthEmu == null ? Math.max(1, .75 * n) : mi(t.widthEmu, n), e.setLineDash(Z(t.dash ?? void 0, e.lineWidth)), e.lineCap = t.cap === "rnd" ? "round" : t.cap === "sq" ? "square" : "butt", e.lineJoin = t.join === "round" || t.join === "bevel" ? t.join : "miter", !0);
}
function Na(e, t, n, r) {
	let i = r ? I(I(e.classicChartStyleRoles?.[n], r), e.linkedChartStyleRoles?.[n] ?? (e.classicChartStyleRoles == null ? e.chartStyleRoles?.[n] : void 0)) : e.chartStyleRoles?.[n], a = R(e, n), o = t.paintAuthored === !0 || t.fill != null || t.color != null || t.hidden === !0, s = be(t.style, a, 0), c = t.hidden === !0 ? xe(a) : void 0, l = c === void 0 ? t.fill ?? (t.color ? {
		fillType: "solid",
		color: t.color
	} : s === void 0 ? t.paintAuthored === !0 && t.hidden !== !0 ? null : Se(i, a, 0, t.style) : s) : c, u = M(t.dash == null ? void 0 : {
		lineDash: t.dash,
		lineDashAuthored: !0
	}, t.style, i);
	return {
		style: Y(t.style, i),
		fill: l != null && l.fillType !== "solid" ? l : null,
		color: l?.fillType === "solid" ? l.color : null,
		paintAuthored: o ? t.paintAuthored : l === void 0 ? void 0 : !0,
		widthEmu: t.widthEmu ?? t.style?.lineWidthEmu ?? i?.lineWidthEmu ?? null,
		dash: u?.lineDash ?? null,
		cap: t.cap ?? t.style?.lineCap ?? i?.lineCap ?? null,
		join: t.join ?? t.style?.lineJoin ?? i?.lineJoin ?? null,
		hidden: l === null ? !0 : null
	};
}
function Pa(e, t, n, r) {
	let i = r ? {
		fillColors: [n === "upBar" ? r.upFillColor : r.downFillColor],
		fillPaintAuthored: !0,
		lineColors: [r.lineColor],
		linePaintAuthored: !0,
		lineWidthEmu: r.lineWidthEmu
	} : void 0, a = i ? I(I(e.classicChartStyleRoles?.[n], i), e.linkedChartStyleRoles?.[n] ?? (e.classicChartStyleRoles == null ? e.chartStyleRoles?.[n] : void 0)) : e.chartStyleRoles?.[n], o = R(e, n), s = t.fillPaintAuthored === !0 || t.fillColor != null || t.fill != null || t.fillHidden === !0, c = t.linePaintAuthored === !0 || t.lineColor != null || t.lineHidden === !0, l = W(t.style, o, 0), u = be(t.style, o, 0), d = t.fillHidden === !0 ? G(o) : void 0, f = t.lineHidden === !0 ? xe(o) : void 0, p = d === void 0 ? t.fill == null ? t.fillColor == null ? l === void 0 ? t.fillPaintAuthored === !0 && t.fillHidden !== !0 ? null : K(a, o, 0, t.style) : l : {
		fillType: "solid",
		color: t.fillColor
	} : t.fill : d, m = f === void 0 ? t.lineColor ? {
		fillType: "solid",
		color: t.lineColor
	} : u === void 0 ? t.linePaintAuthored === !0 && t.lineHidden !== !0 ? null : Se(a, o, 0, t.style) : u : f;
	return {
		style: Y(t.style, a),
		fillColor: p?.fillType === "solid" ? p.color : null,
		fill: p != null && p.fillType !== "solid" && p.fillType !== "none" ? p : null,
		fillPaintAuthored: s ? t.fillPaintAuthored : p === void 0 ? void 0 : !0,
		fillHidden: p === null ? !0 : null,
		lineColor: m?.fillType === "solid" ? m.color : null,
		linePaintAuthored: c ? t.linePaintAuthored : m === void 0 ? void 0 : !0,
		lineWidthEmu: t.lineWidthEmu ?? a?.lineWidthEmu ?? null,
		lineDash: t.lineDash ?? a?.lineDash ?? null,
		lineCap: t.lineCap ?? a?.lineCap ?? null,
		lineJoin: t.lineJoin ?? a?.lineJoin ?? null,
		lineHidden: m === null ? !0 : null
	};
}
function Fa(e, t, n, r, i, a, o) {
	for (let s = 0; s < n; s++) {
		let n = Infinity, c = -Infinity, l = !1;
		for (let e of t) {
			let t = o(e, s);
			if (t == null || !Number.isFinite(t)) continue;
			let r = i(e)(t), u = a(e);
			!Number.isFinite(r) || !Number.isFinite(u) || (n = Math.min(n, r, u), c = Math.max(c, r, u), l = !0);
		}
		!l || Math.abs(c - n) < .01 || (e.beginPath(), e.moveTo(r(s), n), e.lineTo(r(s), c), e.stroke());
	}
}
function Ia(e, t) {
	let n = Na(e, {
		style: t.style,
		color: t.color,
		paintAuthored: t.linePaintAuthored,
		widthEmu: t.lineWidthEmu,
		dash: t.dash,
		hidden: t.hidden
	}, "errorBar");
	return {
		...t,
		color: n.color ?? void 0,
		lineWidthEmu: n.widthEmu ?? void 0,
		dash: n.dash ?? void 0,
		hidden: n.hidden ?? void 0,
		linePaintAuthored: n.paintAuthored
	};
}
function La(e, t) {
	return Na(e, {
		style: t.leaderLineStyle,
		color: t.leaderLineColor,
		paintAuthored: t.leaderLinePaintAuthored,
		widthEmu: t.leaderLineWidthEmu,
		dash: t.leaderLineDash,
		hidden: t.leaderLineHidden
	}, "leaderLine");
}
function Ra(e, t) {
	let n = Na(e, {
		style: t.style,
		color: t.lineColor,
		paintAuthored: t.linePaintAuthored,
		widthEmu: t.lineWidthEmu,
		dash: t.lineDash,
		hidden: t.lineHidden
	}, "trendline");
	return {
		...t,
		lineColor: n.color ?? void 0,
		lineWidthEmu: n.widthEmu ?? void 0,
		lineDash: n.dash ?? void 0,
		lineHidden: n.hidden ?? void 0,
		linePaintAuthored: n.paintAuthored
	};
}
function za(e, t) {
	let n = e.chartStyleRoles?.dataTable, r = R(e, "dataTable"), i = Na(e, {
		style: t.style,
		color: t.lineColor,
		paintAuthored: t.linePaintAuthored,
		widthEmu: t.lineWidthEmu,
		dash: t.lineDash,
		hidden: t.lineHidden
	}, "dataTable"), a = W(t.style, r, 0), o = t.fillHidden === !0 ? G(r) : void 0, s = o === void 0 ? t.fill ?? (t.fillColor ? {
		fillType: "solid",
		color: t.fillColor
	} : a === void 0 ? t.fillPaintAuthored === !0 && t.fillHidden !== !0 ? null : K(n, r, 0, t.style) : a) : o, c = s != null && s.fillType !== "solid" && s.fillType !== "image" && s.fillType !== "none" ? s : null, l = s?.fillType === "solid" ? s.color : null, u = s === null ? !0 : null, d = t.fillPaintAuthored ?? (s === void 0 ? void 0 : !0), f = Q(e, t.fontColor, t.fontPaintAuthored, n);
	return {
		...t,
		fontSizeHpt: t.fontSizeHpt ?? e.chartTextStyle?.fontSizeHpt ?? n?.fontSizeHpt,
		fontBold: t.fontBold ?? e.chartTextStyle?.fontBold ?? n?.fontBold,
		fontItalic: t.fontItalic ?? e.chartTextStyle?.fontItalic ?? n?.fontItalic,
		fontColor: f.color ?? void 0,
		fontPaintAuthored: f.authored,
		fontHidden: t.fontPaintAuthored === !0 ? t.fontHidden : n?.fontHidden,
		fontFace: t.fontFace ?? e.chartTextStyle?.fontFace ?? n?.fontFace,
		fill: c,
		fillColor: l,
		fillHidden: u,
		fillPaintAuthored: d,
		lineColor: i.color ?? void 0,
		lineWidthEmu: i.widthEmu ?? void 0,
		lineDash: i.dash ?? void 0,
		lineHidden: i.hidden ?? void 0,
		linePaintAuthored: i.paintAuthored
	};
}
function Ba(e, t, n, r, i, a, o, s) {
	if (n !== !0) return {
		visible: n,
		color: r,
		widthEmu: i,
		dash: a,
		paintAuthored: o
	};
	let c = Na(e, {
		style: s,
		color: r,
		widthEmu: i,
		dash: a,
		paintAuthored: o
	}, t);
	return {
		visible: c.hidden !== !0 && !(c.paintAuthored === !0 && c.color == null),
		color: c.color,
		widthEmu: c.widthEmu,
		dash: c.dash,
		paintAuthored: c.paintAuthored
	};
}
function Va(e, t) {
	if (!t || !e.chartStyleRoles?.gridlineMajor && !e.chartStyleRoles?.gridlineMinor) return t;
	let n = Ba(e, "gridlineMajor", t.majorGridlines, t.majorGridlineColor, t.majorGridlineWidthEmu, t.majorGridlineDash, t.majorGridlinePaintAuthored, t.majorGridlineStyle), r = Ba(e, "gridlineMinor", t.minorGridlines, t.minorGridlineColor, t.minorGridlineWidthEmu, t.minorGridlineDash, t.minorGridlinePaintAuthored, t.minorGridlineStyle);
	return n.visible !== t.majorGridlines || n.color !== t.majorGridlineColor || n.widthEmu !== t.majorGridlineWidthEmu || n.dash !== t.majorGridlineDash || n.paintAuthored !== t.majorGridlinePaintAuthored || r.visible !== t.minorGridlines || r.color !== t.minorGridlineColor || r.widthEmu !== t.minorGridlineWidthEmu || r.dash !== t.minorGridlineDash || r.paintAuthored !== t.minorGridlinePaintAuthored ? {
		...t,
		majorGridlines: n.visible ?? void 0,
		majorGridlineColor: n.color,
		majorGridlineWidthEmu: n.widthEmu,
		majorGridlineDash: n.dash,
		majorGridlinePaintAuthored: n.paintAuthored,
		minorGridlines: r.visible ?? void 0,
		minorGridlineColor: r.color,
		minorGridlineWidthEmu: r.widthEmu,
		minorGridlineDash: r.dash,
		minorGridlinePaintAuthored: r.paintAuthored
	} : t;
}
function Ha(e, t, n, r, i, a, o, s) {
	return Na(e, {
		style: s,
		color: n,
		widthEmu: r,
		dash: i,
		paintAuthored: o,
		hidden: a ? !0 : void 0
	}, t);
}
function Ua(e) {
	return e.hidden === !0 || e.paintAuthored === !0 && e.color == null;
}
function Wa(e, t, n) {
	let r = e.chartStyleRoles?.[n];
	if (!t || !r && !e.chartTextStyle) return t;
	let i = Ha(e, n, t.lineColor, t.lineWidthEmu, t.lineDash, t.lineHidden, t.linePaintAuthored, t.style), a = Ua(i), o = t.fontSizeHpt ?? e.chartTextStyle?.fontSizeHpt ?? r?.fontSizeHpt, s = t.fontBold ?? e.chartTextStyle?.fontBold ?? r?.fontBold, c = t.fontItalic ?? e.chartTextStyle?.fontItalic ?? r?.fontItalic, l = Q(e, t.fontColor, t.fontPaintAuthored, r), u = l.color, d = t.fontFace ?? e.chartTextStyle?.fontFace ?? r?.fontFace, f = e.chartStyleRoles?.axisTitle, p = t.titleFontSizeHpt ?? e.chartTextStyle?.fontSizeHpt ?? f?.fontSizeHpt, m = t.titleFontBold ?? e.chartTextStyle?.fontBold ?? f?.fontBold, h = t.titleFontItalic ?? e.chartTextStyle?.fontItalic ?? f?.fontItalic, g = Q(e, t.titleFontColor, t.titleFontPaintAuthored, f), _ = g.color, v = t.titleFontFace ?? e.chartTextStyle?.fontFace ?? f?.fontFace;
	return i.color === t.lineColor && i.widthEmu === t.lineWidthEmu && i.dash === t.lineDash && a === t.lineHidden && o === t.fontSizeHpt && s === t.fontBold && c === t.fontItalic && u === t.fontColor && l.authored === t.fontPaintAuthored && d === t.fontFace && p === t.titleFontSizeHpt && m === t.titleFontBold && h === t.titleFontItalic && _ === t.titleFontColor && g.authored === t.titleFontPaintAuthored && v === t.titleFontFace ? t : {
		...t,
		lineColor: i.color,
		lineWidthEmu: i.widthEmu,
		lineDash: i.dash,
		linePaintAuthored: i.paintAuthored,
		lineHidden: a,
		fontSizeHpt: o,
		fontBold: s,
		fontItalic: c,
		fontColor: u,
		fontPaintAuthored: l.authored,
		fontFace: d,
		titleFontSizeHpt: p,
		titleFontBold: m,
		titleFontItalic: h,
		titleFontColor: _,
		titleFontPaintAuthored: g.authored,
		titleFontFace: v
	};
}
function Ga(e) {
	let t = e.threeD?.seriesAxis, n = e.chartStyleRoles?.seriesAxis;
	if (!t || !n && !e.chartTextStyle) return e;
	let r = Na(e, {
		style: t.style,
		color: t.lineColor,
		widthEmu: t.lineWidthEmu,
		dash: t.lineDash,
		hidden: t.lineHidden ? !0 : void 0,
		paintAuthored: t.linePaintAuthored
	}, "seriesAxis"), i = Ua(r), a = t.fontSizeHpt ?? e.chartTextStyle?.fontSizeHpt ?? n?.fontSizeHpt, o = t.fontBold ?? e.chartTextStyle?.fontBold ?? n?.fontBold, s = t.fontItalic ?? e.chartTextStyle?.fontItalic ?? n?.fontItalic, c = Q(e, t.fontColor, t.fontPaintAuthored, n), l = c.color, u = t.fontFace ?? e.chartTextStyle?.fontFace ?? n?.fontFace, d = e.chartStyleRoles?.axisTitle, f = t.titleFontSizeHpt ?? e.chartTextStyle?.fontSizeHpt ?? d?.fontSizeHpt, p = t.titleFontBold ?? e.chartTextStyle?.fontBold ?? d?.fontBold, m = t.titleFontItalic ?? e.chartTextStyle?.fontItalic ?? d?.fontItalic, h = Q(e, t.titleFontColor, t.titleFontPaintAuthored, d), g = h.color, _ = t.titleFontFace ?? e.chartTextStyle?.fontFace ?? d?.fontFace;
	return r.color === t.lineColor && r.widthEmu === t.lineWidthEmu && r.dash === t.lineDash && i === t.lineHidden && a === t.fontSizeHpt && o === t.fontBold && s === t.fontItalic && l === t.fontColor && c.authored === t.fontPaintAuthored && u === t.fontFace && f === t.titleFontSizeHpt && p === t.titleFontBold && m === t.titleFontItalic && g === t.titleFontColor && h.authored === t.titleFontPaintAuthored && _ === t.titleFontFace ? e : {
		...e,
		threeD: {
			...e.threeD,
			seriesAxis: {
				...t,
				lineColor: r.color,
				lineWidthEmu: r.widthEmu,
				lineDash: r.dash,
				lineHidden: i,
				fontSizeHpt: a,
				fontBold: o,
				fontItalic: s,
				fontColor: l,
				fontPaintAuthored: c.authored,
				fontFace: u,
				titleFontSizeHpt: f,
				titleFontBold: p,
				titleFontItalic: m,
				titleFontColor: g,
				titleFontPaintAuthored: h.authored,
				titleFontFace: _
			}
		}
	};
}
function Ka(e, t, n) {
	if (n?.kind === "bubble" || n == null && e.chartType === "bubble") return !1;
	let r = n?.kind === "scatter" ? "scatter" : t.seriesType ?? e.chartType;
	return r === "line" || r === "stackedLine" || r === "stackedLinePct" || r === "area" || r === "stackedArea" || r === "stackedAreaPct" || r === "scatter" || r === "radar" || r === "stock";
}
function qa(e, t, n, r, i) {
	let a = z(e, n) ? void 0 : e.chartStyleRoles?.dataPointMarker, o = z(e, n) ? void 0 : R(e, "dataPointMarker");
	if (!Ka(e, t, i) || (t.showMarker === !1 || t.markerSymbol === "none") && !an(t)) return t;
	let s = ra(t, n), c = W(t.markerStyle, o, s), l = t.markerFillPaintAuthored === !0 && t.markerStyle?.fillHidden !== !0 || t.markerFill != null || t.markerFillPaint !== void 0 || c !== void 0, u = l ? c : K(a, o, s, t.markerStyle), d = t.markerFill ?? (u?.fillType === "solid" ? u.color : u === null ? "00000000" : null), f = t.markerFillPaint === void 0 ? u?.fillType === "gradient" || u?.fillType === "pattern" || u?.fillType === "image" ? u : void 0 : t.markerFillPaint, p = l ? t.markerFillPaintAuthored : u === void 0 ? void 0 : !0, m = be(t.markerStyle, o, s), h = t.markerLine != null || t.markerLinePaintAuthored === !0 && t.markerStyle?.lineHidden !== !0 || m !== void 0, g = h ? m : Se(a, o, s, t.markerStyle), _ = t.markerLine ?? (g?.fillType === "solid" ? g.color : g === null || h ? "00000000" : null), v = t.markerLineWidthEmu ?? t.markerStyle?.lineWidthEmu ?? a?.lineWidthEmu ?? null, y = t.markerSize ?? e.chartStyleMarkerSizePt, b = t.markerSymbol ?? e.chartStyleMarkerSymbol, x = t.dataPointOverrides?.map((e) => {
		if (!Xt(e)) return e;
		let n = W(e.markerStyle, o, e.idx), r = be(e.markerStyle, o, e.idx), i = e.markerFillPaintAuthored === !0 && e.markerStyle?.fillHidden !== !0 || e.markerFill != null || e.markerFillPaint !== void 0 || n !== void 0, c = e.markerLine != null || e.markerLinePaintAuthored === !0 && e.markerStyle?.lineHidden !== !0 || r !== void 0, d = i ? void 0 : l ? u : K(a, o, s, t.markerStyle), f = e.markerFill ?? (n?.fillType === "solid" ? n.color : n === null ? "00000000" : void 0) ?? (d?.fillType === "solid" ? d.color : d === null ? "00000000" : void 0), p = e.markerFillPaint === void 0 ? n?.fillType === "gradient" || n?.fillType === "pattern" || n?.fillType === "image" ? n : d?.fillType === "gradient" || d?.fillType === "pattern" || d?.fillType === "image" ? d : void 0 : e.markerFillPaint, m = e.markerLine ?? (r?.fillType === "solid" ? r.color : r === null ? "00000000" : void 0) ?? (c ? "00000000" : g?.fillType === "solid" ? g.color : g === null ? "00000000" : void 0), _ = e.markerLineWidthEmu ?? e.markerStyle?.lineWidthEmu ?? (!c && !h ? a?.lineWidthEmu ?? void 0 : void 0);
		return f === e.markerFill && p === e.markerFillPaint && m === e.markerLine && _ === e.markerLineWidthEmu ? e : {
			...e,
			markerFill: f,
			markerFillPaint: p,
			markerFillPaintAuthored: e.markerFillPaintAuthored ?? (d === void 0 ? void 0 : !0),
			markerLine: m,
			markerLinePaintAuthored: c ? e.markerLinePaintAuthored : void 0,
			markerLineWidthEmu: _
		};
	});
	return d === t.markerFill && f === t.markerFillPaint && p === t.markerFillPaintAuthored && _ === t.markerLine && v === t.markerLineWidthEmu && y === t.markerSize && b === t.markerSymbol && x?.every((e, n) => e === t.dataPointOverrides?.[n]) !== !1 ? t : {
		...t,
		markerFill: d,
		markerFillPaint: f,
		markerFillPaintAuthored: p,
		markerLine: _,
		markerLinePaintAuthored: h ? t.markerLinePaintAuthored : void 0,
		markerLineWidthEmu: v,
		markerSize: y,
		markerSymbol: b,
		dataPointOverrides: x
	};
}
function Ja(e, t, n, r, i = 0, a = i) {
	if (!n) return t;
	let { color: o, fill: s, hidden: c } = t, l = c === !0 ? xe(r) : void 0, u = be(t.style, r, i), d = s != null || o != null || l !== void 0 || u !== void 0 || t.paintAuthored === !0 && c !== !0, f = n.lineNoStyle !== !0 && (n.linePaintAuthored === !0 || n.lineHidden === !0 || n.linePaints != null || n.lineColors != null);
	if (!d) {
		let e = U(n, a);
		e === null ? c = !0 : e?.fillType === "solid" ? (o = e.color, s = null, c = null) : e !== void 0 && (s = e, o = null, c = null);
	} else if (l !== void 0) c = !0, o = null, s = null;
	else if (s != null || o != null) c = null;
	else if (s == null && o == null) {
		let e = u === void 0 ? t.paintAuthored === !0 ? null : void 0 : u;
		e === null ? c = !0 : e?.fillType === "solid" ? (o = e.color, s = null, c = null) : e !== void 0 && (s = e, o = null, c = null);
	}
	let p = t.dash, m = t.customDash, h = t.dashAuthored;
	return h !== !0 && p == null && m == null && (p = n.lineDash, m = n.lineCustomDash, h = n.lineDashAuthored), {
		color: o,
		fill: s,
		hidden: c,
		paintAuthored: d || f ? !0 : t.paintAuthored,
		widthEmu: t.widthEmu ?? t.style?.lineWidthEmu ?? n.lineWidthEmu,
		dash: p,
		dashAuthored: h,
		customDash: m,
		cap: t.cap ?? t.style?.lineCap ?? n.lineCap,
		join: t.join ?? t.style?.lineJoin ?? n.lineJoin,
		compound: t.compound ?? t.style?.lineCompound ?? n.lineCompound
	};
}
function Ya(e, t, n, r, i, a = 0) {
	if (!n || !t && !i) return t ?? void 0;
	let o = t ?? {}, s = Lr(o, n, r, i, 0, a), c = Ja(e, {
		style: o.style,
		color: o.borderColor,
		fill: o.borderFill,
		widthEmu: o.borderWidthEmu,
		dash: o.borderDash,
		dashAuthored: o.borderDashAuthored,
		customDash: o.borderCustomDash,
		cap: o.borderCap,
		join: o.borderJoin,
		compound: o.borderCompound,
		hidden: o.borderHidden,
		paintAuthored: o.borderPaintAuthored
	}, n, r, 0, a);
	return {
		...o,
		style: o.style,
		effectFallbackStyle: n,
		effectStyleIndex: 0,
		effectFallbackIndex: a,
		...s,
		borderColor: c.color ?? void 0,
		borderFill: c.fill ?? void 0,
		borderWidthEmu: c.widthEmu ?? void 0,
		borderDash: c.dash ?? void 0,
		borderDashAuthored: c.dashAuthored ?? void 0,
		borderCustomDash: c.customDash ?? void 0,
		borderCap: c.cap ?? void 0,
		borderJoin: c.join ?? void 0,
		borderCompound: c.compound ?? void 0,
		borderHidden: c.hidden ?? void 0,
		borderPaintAuthored: c.paintAuthored ?? void 0
	};
}
function Xa(e, t, n) {
	let r = Rr(t.labelBox), i = r ? e.chartStyleRoles?.dataLabelCallout ?? e.chartStyleRoles?.dataLabel : e.chartStyleRoles?.dataLabel, a = r ? R(e, "dataLabelCallout") ?? R(e, "dataLabel") : R(e, "dataLabel"), o = i ? Ya(e, t.labelBox, i, a, !0, n) : t.labelBox, s = t.fontPaintAuthored === !0 || t.fontColor != null || t.fontHidden === !0, c = Q(e, t.fontColor, t.fontPaintAuthored, i, n);
	return {
		...t,
		fontSizeHpt: t.fontSizeHpt ?? e.chartTextStyle?.fontSizeHpt ?? i?.fontSizeHpt ?? void 0,
		fontBold: t.fontBold ?? e.chartTextStyle?.fontBold ?? i?.fontBold ?? void 0,
		fontItalic: t.fontItalic ?? e.chartTextStyle?.fontItalic ?? i?.fontItalic ?? void 0,
		fontColor: c.color ?? void 0,
		fontPaintAuthored: c.authored,
		fontHidden: s ? t.fontHidden : e.chartTextStyle?.fontHidden ?? i?.fontHidden ?? void 0,
		fontFace: t.fontFace ?? e.chartTextStyle?.fontFace ?? i?.fontFace ?? void 0,
		fontLanguage: t.fontLanguage ?? e.chartTextStyle?.fontLanguage ?? i?.fontLanguage ?? void 0,
		fontBaseline: t.fontBaseline ?? e.chartTextStyle?.fontBaseline ?? i?.fontBaseline ?? void 0,
		textRotation: t.textRotation ?? e.chartTextStyle?.textRotation ?? i?.textRotation ?? void 0,
		textWrap: t.textWrap ?? e.chartTextStyle?.textWrap ?? i?.textWrap ?? void 0,
		textVerticalAnchor: t.textVerticalAnchor ?? e.chartTextStyle?.textVerticalAnchor ?? i?.textVerticalAnchor ?? void 0,
		textVerticalMode: t.textVerticalMode ?? e.chartTextStyle?.textVerticalMode ?? i?.textVerticalMode ?? void 0,
		textLInsEmu: t.textLInsEmu ?? e.chartTextStyle?.textLInsEmu ?? i?.textLInsEmu ?? void 0,
		textTInsEmu: t.textTInsEmu ?? e.chartTextStyle?.textTInsEmu ?? i?.textTInsEmu ?? void 0,
		textRInsEmu: t.textRInsEmu ?? e.chartTextStyle?.textRInsEmu ?? i?.textRInsEmu ?? void 0,
		textBInsEmu: t.textBInsEmu ?? e.chartTextStyle?.textBInsEmu ?? i?.textBInsEmu ?? void 0,
		textBodyAuthored: t.textBodyAuthored === !0 || e.chartTextStyle?.textBodyAuthored === !0 || i?.textBodyAuthored === !0 || void 0,
		labelBox: o
	};
}
function Za(e, t, n) {
	let r = e.chartStyleRoles?.trendlineLabel, i = R(e, "trendlineLabel"), a = t.labelFontPaintAuthored === !0 || t.labelFontColor != null || t.labelFontHidden === !0, o = Q(e, t.labelFontColor, t.labelFontPaintAuthored, r, n);
	return {
		...t,
		labelBox: r ? Ya(e, t.labelBox, r, i, !0, n) : t.labelBox,
		labelFontSizeHpt: t.labelFontSizeHpt ?? e.chartTextStyle?.fontSizeHpt ?? r?.fontSizeHpt ?? void 0,
		labelFontBold: t.labelFontBold ?? e.chartTextStyle?.fontBold ?? r?.fontBold ?? void 0,
		labelFontItalic: t.labelFontItalic ?? e.chartTextStyle?.fontItalic ?? r?.fontItalic ?? void 0,
		labelFontColor: o.color ?? void 0,
		labelFontPaintAuthored: o.authored,
		labelFontHidden: a ? t.labelFontHidden : e.chartTextStyle?.fontHidden ?? r?.fontHidden ?? void 0,
		labelFontFace: t.labelFontFace ?? e.chartTextStyle?.fontFace ?? r?.fontFace ?? void 0,
		labelFontLanguage: t.labelFontLanguage ?? e.chartTextStyle?.fontLanguage ?? r?.fontLanguage ?? void 0,
		labelFontBaseline: t.labelFontBaseline ?? e.chartTextStyle?.fontBaseline ?? r?.fontBaseline ?? void 0,
		labelTextRotation: t.labelTextRotation ?? e.chartTextStyle?.textRotation ?? r?.textRotation ?? void 0,
		labelTextWrap: t.labelTextWrap ?? e.chartTextStyle?.textWrap ?? r?.textWrap ?? void 0,
		labelTextVerticalAnchor: t.labelTextVerticalAnchor ?? e.chartTextStyle?.textVerticalAnchor ?? r?.textVerticalAnchor ?? void 0,
		labelTextVerticalMode: t.labelTextVerticalMode ?? e.chartTextStyle?.textVerticalMode ?? r?.textVerticalMode ?? void 0,
		labelTextLInsEmu: t.labelTextLInsEmu ?? e.chartTextStyle?.textLInsEmu ?? r?.textLInsEmu ?? void 0,
		labelTextTInsEmu: t.labelTextTInsEmu ?? e.chartTextStyle?.textTInsEmu ?? r?.textTInsEmu ?? void 0,
		labelTextRInsEmu: t.labelTextRInsEmu ?? e.chartTextStyle?.textRInsEmu ?? r?.textRInsEmu ?? void 0,
		labelTextBInsEmu: t.labelTextBInsEmu ?? e.chartTextStyle?.textBInsEmu ?? r?.textBInsEmu ?? void 0,
		labelTextBodyAuthored: t.labelTextBodyAuthored === !0 || e.chartTextStyle?.textBodyAuthored === !0 || r?.textBodyAuthored === !0 || void 0
	};
}
function Qa(e, t, n) {
	let r = zr(t.labelBox, n?.labelBox), i = Rr(r), a = i ? e.chartStyleRoles?.dataLabelCallout ?? e.chartStyleRoles?.dataLabel : e.chartStyleRoles?.dataLabel, o = i ? R(e, "dataLabelCallout") ?? R(e, "dataLabel") : R(e, "dataLabel"), s = a ? Ya(e, r, a, o, !0, t.idx) : r, c = t.fontPaintAuthored === !0 || t.fontColor != null || t.fontHidden === !0, l = n?.fontPaintAuthored === !0 || n?.fontColor != null || n?.fontHidden === !0, u = Q(e, c ? t.fontColor : l ? n?.fontColor : void 0, c ? t.fontPaintAuthored : n?.fontPaintAuthored, a, t.idx);
	return {
		...t,
		fontSizeHpt: t.fontSizeHpt ?? n?.fontSizeHpt ?? e.chartTextStyle?.fontSizeHpt ?? a?.fontSizeHpt ?? void 0,
		fontBold: t.fontBold ?? n?.fontBold ?? e.chartTextStyle?.fontBold ?? a?.fontBold ?? void 0,
		fontItalic: t.fontItalic ?? n?.fontItalic ?? e.chartTextStyle?.fontItalic ?? a?.fontItalic ?? void 0,
		fontColor: u.color ?? void 0,
		fontPaintAuthored: u.authored,
		fontHidden: c ? t.fontHidden : l ? n?.fontHidden : e.chartTextStyle?.fontHidden ?? a?.fontHidden ?? void 0,
		fontFace: t.fontFace ?? n?.fontFace ?? e.chartTextStyle?.fontFace ?? a?.fontFace ?? void 0,
		fontLanguage: t.fontLanguage ?? n?.fontLanguage ?? e.chartTextStyle?.fontLanguage ?? a?.fontLanguage ?? void 0,
		fontBaseline: t.fontBaseline ?? n?.fontBaseline ?? e.chartTextStyle?.fontBaseline ?? a?.fontBaseline ?? void 0,
		textRotation: t.textRotation ?? n?.textRotation ?? e.chartTextStyle?.textRotation ?? a?.textRotation ?? void 0,
		textWrap: t.textWrap ?? n?.textWrap ?? e.chartTextStyle?.textWrap ?? a?.textWrap ?? void 0,
		textVerticalAnchor: t.textVerticalAnchor ?? n?.textVerticalAnchor ?? e.chartTextStyle?.textVerticalAnchor ?? a?.textVerticalAnchor ?? void 0,
		textVerticalMode: t.textVerticalMode ?? n?.textVerticalMode ?? e.chartTextStyle?.textVerticalMode ?? a?.textVerticalMode ?? void 0,
		textLInsEmu: t.textLInsEmu ?? n?.textLInsEmu ?? e.chartTextStyle?.textLInsEmu ?? a?.textLInsEmu ?? void 0,
		textTInsEmu: t.textTInsEmu ?? n?.textTInsEmu ?? e.chartTextStyle?.textTInsEmu ?? a?.textTInsEmu ?? void 0,
		textRInsEmu: t.textRInsEmu ?? n?.textRInsEmu ?? e.chartTextStyle?.textRInsEmu ?? a?.textRInsEmu ?? void 0,
		textBInsEmu: t.textBInsEmu ?? n?.textBInsEmu ?? e.chartTextStyle?.textBInsEmu ?? a?.textBInsEmu ?? void 0,
		textBodyAuthored: t.textBodyAuthored === !0 || n?.textBodyAuthored === !0 || e.chartTextStyle?.textBodyAuthored === !0 || a?.textBodyAuthored === !0 || void 0,
		textAlign: t.textAlign ?? n?.textAlign,
		labelBox: s
	};
}
function $a(e) {
	let t = e.chartStyleRoles?.legend, n = R(e, "legend");
	if (!t && !e.chartTextStyle) return e;
	let r = e.legendFill, i = e.legendFillColor, a = e.legendFillHidden, o = e.legendFillPaintAuthored, s = a === !0 ? G(n) : void 0;
	if (!(r != null || i != null || s !== void 0 || e.legendFillPaintAuthored === !0 && a !== !0)) {
		let s = K(t, n, 0, e.legendStyle);
		s === null ? a = !0 : s?.fillType === "solid" ? (i = s.color, r = null, a = null) : s !== void 0 && (r = s, i = null, a = null), s !== void 0 && (o = !0);
	}
	let c = Ja(e, {
		style: e.legendStyle,
		color: e.legendLineColor,
		fill: e.legendLineFill,
		widthEmu: e.legendLineWidthEmu,
		dash: e.legendLineDash,
		dashAuthored: e.legendLineDashAuthored,
		customDash: e.legendLineCustomDash,
		cap: e.legendLineCap,
		join: e.legendLineJoin,
		compound: e.legendLineCompound,
		hidden: e.legendLineHidden,
		paintAuthored: e.legendLinePaintAuthored
	}, t, R(e, "legend")), l = Q(e, e.legendFontColor, e.legendFontPaintAuthored, t);
	return r === e.legendFill && i === e.legendFillColor && a === e.legendFillHidden && o === e.legendFillPaintAuthored && c.color === e.legendLineColor && c.fill === e.legendLineFill && c.widthEmu === e.legendLineWidthEmu && c.dash === e.legendLineDash && c.dashAuthored === e.legendLineDashAuthored && c.customDash === e.legendLineCustomDash && c.cap === e.legendLineCap && c.join === e.legendLineJoin && c.compound === e.legendLineCompound && c.hidden === e.legendLineHidden && c.paintAuthored === e.legendLinePaintAuthored && (e.legendFontSizeHpt ?? e.chartTextStyle?.fontSizeHpt ?? t?.fontSizeHpt) === e.legendFontSizeHpt && (e.legendFontBold ?? e.chartTextStyle?.fontBold ?? t?.fontBold) === e.legendFontBold && (e.legendFontItalic ?? e.chartTextStyle?.fontItalic ?? t?.fontItalic) === e.legendFontItalic && (e.legendFontLanguage ?? e.chartTextStyle?.fontLanguage ?? t?.fontLanguage) === e.legendFontLanguage && (e.legendFontBaseline ?? e.chartTextStyle?.fontBaseline ?? t?.fontBaseline) === e.legendFontBaseline && l.color === e.legendFontColor && l.authored === e.legendFontPaintAuthored && (e.legendFontFace ?? e.chartTextStyle?.fontFace ?? t?.fontFace) === e.legendFontFace ? e : {
		...e,
		legendFontSizeHpt: e.legendFontSizeHpt ?? e.chartTextStyle?.fontSizeHpt ?? t?.fontSizeHpt,
		legendFontBold: e.legendFontBold ?? e.chartTextStyle?.fontBold ?? t?.fontBold,
		legendFontItalic: e.legendFontItalic ?? e.chartTextStyle?.fontItalic ?? t?.fontItalic,
		legendFontLanguage: e.legendFontLanguage ?? e.chartTextStyle?.fontLanguage ?? t?.fontLanguage,
		legendFontBaseline: e.legendFontBaseline ?? e.chartTextStyle?.fontBaseline ?? t?.fontBaseline,
		legendFontColor: l.color,
		legendFontPaintAuthored: l.authored,
		legendFontFace: e.legendFontFace ?? e.chartTextStyle?.fontFace ?? t?.fontFace,
		legendFill: r,
		legendFillColor: i,
		legendFillHidden: a,
		legendFillPaintAuthored: o,
		legendLineColor: c.color,
		legendLineFill: c.fill,
		legendLineWidthEmu: c.widthEmu,
		legendLineDash: c.dash,
		legendLineDashAuthored: c.dashAuthored,
		legendLineCustomDash: c.customDash,
		legendLineCap: c.cap,
		legendLineJoin: c.join,
		legendLineCompound: c.compound,
		legendLineHidden: c.hidden,
		legendLinePaintAuthored: c.paintAuthored
	};
}
function eo(e, t, n, r = 0) {
	return t === !0 || e != null ? {
		color: e ?? "00000000",
		authored: !0
	} : n && (n.fontPaintAuthored === !0 || n.fontColor != null || n.fontColors != null || n.fontHidden === !0) ? {
		color: n.fontHidden === !0 ? "00000000" : de(n, r) ?? "00000000",
		authored: !0
	} : {
		color: e,
		authored: void 0
	};
}
function Q(e, t, n, r, i = 0) {
	let a = eo(t, n, e.chartTextStyle, i);
	return a.authored === !0 || a.color != null ? a : eo(t, n, r, i);
}
function to(e) {
	let t = e.threeD ? e.chartStyleRoles?.plotArea3D : e.chartStyleRoles?.plotArea, n = R(e, e.threeD ? "plotArea3D" : "plotArea");
	if (!t) return e;
	let r = e.plotAreaFill, i = e.plotAreaBg, a = e.plotAreaFillHidden, o = e.plotAreaFillPaintAuthored, s = a === !0 ? G(n) : void 0;
	if (!((r != null || i != null) && e.plotAreaFillAutomatic !== !0 || s !== void 0 || e.plotAreaFillPaintAuthored === !0 && a !== !0)) {
		let s = K(t, n, 0, e.plotAreaStyle);
		s === null ? a = !0 : s?.fillType === "solid" ? (i = s.color, r = null, a = null) : s !== void 0 && (r = s, i = null, a = null), s !== void 0 && (o = !0);
	}
	let c = Ja(e, {
		style: e.plotAreaStyle,
		color: e.plotAreaLineColor,
		fill: e.plotAreaLineFill,
		widthEmu: e.plotAreaLineWidthEmu,
		dash: e.plotAreaLineDash,
		dashAuthored: e.plotAreaLineDashAuthored,
		customDash: e.plotAreaLineCustomDash,
		cap: e.plotAreaLineCap,
		join: e.plotAreaLineJoin,
		compound: e.plotAreaLineCompound,
		hidden: e.plotAreaLineHidden,
		paintAuthored: e.plotAreaLinePaintAuthored
	}, t, R(e, e.threeD ? "plotArea3D" : "plotArea"));
	return r === e.plotAreaFill && i === e.plotAreaBg && a === e.plotAreaFillHidden && o === e.plotAreaFillPaintAuthored && c.color === e.plotAreaLineColor && c.fill === e.plotAreaLineFill && c.widthEmu === e.plotAreaLineWidthEmu && c.dash === e.plotAreaLineDash && c.dashAuthored === e.plotAreaLineDashAuthored && c.customDash === e.plotAreaLineCustomDash && c.cap === e.plotAreaLineCap && c.join === e.plotAreaLineJoin && c.compound === e.plotAreaLineCompound && c.hidden === e.plotAreaLineHidden && c.paintAuthored === e.plotAreaLinePaintAuthored ? e : {
		...e,
		plotAreaFill: r,
		plotAreaBg: i,
		plotAreaFillHidden: a,
		plotAreaFillPaintAuthored: o,
		plotAreaLineColor: c.color,
		plotAreaLineFill: c.fill,
		plotAreaLineWidthEmu: c.widthEmu,
		plotAreaLineDash: c.dash,
		plotAreaLineDashAuthored: c.dashAuthored,
		plotAreaLineCustomDash: c.customDash,
		plotAreaLineCap: c.cap,
		plotAreaLineJoin: c.join,
		plotAreaLineCompound: c.compound,
		plotAreaLineHidden: c.hidden,
		plotAreaLinePaintAuthored: c.paintAuthored
	};
}
function no(e) {
	let t = e.chartStyleRoles?.chartArea, n = R(e, "chartArea");
	if (!t) return e;
	let r = e.chartFill, i = e.chartBg, a = e.chartFillHidden, o = e.chartFillPaintAuthored, s = a === !0 ? G(n) : void 0;
	if (!(r != null || s !== void 0 || e.chartFillPaintAuthored === !0 && a !== !0)) {
		let s = K(t, n, 0, e.chartAreaStyle);
		s === null ? (r = null, i = null, a = !0) : s?.fillType === "solid" ? (i = s.color, r = null, a = null) : s !== void 0 && (r = s, i = null, a = null), s !== void 0 && (o = !0);
	}
	let c = Ja(e, {
		style: e.chartAreaStyle,
		color: e.chartBorderColor,
		fill: e.chartBorderLineFill,
		widthEmu: e.chartBorderWidthEmu,
		dash: e.chartBorderDash,
		dashAuthored: e.chartBorderDashAuthored,
		customDash: e.chartBorderCustomDash,
		cap: e.chartBorderCap,
		join: e.chartBorderJoin,
		compound: e.chartBorderCompound,
		hidden: e.chartBorderHidden,
		paintAuthored: e.chartBorderPaintAuthored
	}, t, R(e, "chartArea"));
	return r === e.chartFill && i === e.chartBg && a === e.chartFillHidden && o === e.chartFillPaintAuthored && c.color === e.chartBorderColor && c.fill === e.chartBorderLineFill && c.widthEmu === e.chartBorderWidthEmu && c.dash === e.chartBorderDash && c.dashAuthored === e.chartBorderDashAuthored && c.customDash === e.chartBorderCustomDash && c.cap === e.chartBorderCap && c.join === e.chartBorderJoin && c.compound === e.chartBorderCompound && c.hidden === e.chartBorderHidden && c.paintAuthored === e.chartBorderPaintAuthored ? e : {
		...e,
		chartFill: r,
		chartBg: i,
		chartFillHidden: a,
		chartFillPaintAuthored: o,
		chartBorderColor: c.color,
		chartBorderLineFill: c.fill,
		chartBorderWidthEmu: c.widthEmu,
		chartBorderDash: c.dash,
		chartBorderDashAuthored: c.dashAuthored,
		chartBorderCustomDash: c.customDash,
		chartBorderCap: c.cap,
		chartBorderJoin: c.join,
		chartBorderCompound: c.compound,
		chartBorderHidden: c.hidden,
		chartBorderPaintAuthored: c.paintAuthored
	};
}
function ro(e, t) {
	let n = e.chartStyleRoles;
	if (!n || !(Number.isFinite(t) && t > 0)) return e;
	let r = o / t, i = !1, a = new Set([
		"categoryAxis",
		"seriesAxis",
		"valueAxis",
		"gridlineMajor",
		"gridlineMinor"
	]), s = Object.fromEntries(Object.entries(n).map(([e, t]) => !a.has(e) || !t || t.lineWidthEmu == null || !Number.isFinite(t.lineWidthEmu) || t.lineWidthEmu <= 0 || t.lineWidthEmu >= r ? [e, t] : (i = !0, [e, {
		...t,
		lineWidthEmu: r
	}])));
	return i ? {
		...e,
		chartStyleRoles: s
	} : e;
}
function io(e, t) {
	if (e = ro(e, t), !e.chartStyleRoles?.errorBar && !e.chartStyleRoles?.leaderLine && !e.chartStyleRoles?.trendline && !e.chartStyleRoles?.trendlineLabel && !e.chartStyleRoles?.dataLabel && !e.chartStyleRoles?.dataLabelCallout && !e.chartStyleRoles?.dataTable && !e.chartStyleRoles?.gridlineMajor && !e.chartStyleRoles?.gridlineMinor && !e.chartStyleRoles?.categoryAxis && !e.chartStyleRoles?.valueAxis && !e.chartStyleRoles?.seriesAxis && !e.chartStyleRoles?.dataPointMarker && !e.chartStyleRoles?.legend && !e.chartStyleRoles?.plotArea && !e.chartStyleRoles?.plotArea3D && !e.chartStyleRoles?.chartArea && !e.chartStyleRoles?.title && !e.chartStyleRoles?.axisTitle && e.chartTextStyle == null && e.chartStyleMarkerSizePt == null && e.chartStyleMarkerSymbol == null) return e;
	let n = !1, r = _n(e), i = e.series.map((t, i) => {
		let a = qa(e, t, i, e.series.length, r[i]);
		n ||= a !== t;
		let o = e.chartStyleRoles?.errorBar ? a.errBars?.map((t) => {
			let r = Ia(e, t);
			return n ||= r.color !== t.color || r.lineWidthEmu !== t.lineWidthEmu || r.dash !== t.dash || r.hidden !== t.hidden, r;
		}) : a.errBars, s = a.seriesDataLabels;
		if (s && (e.chartTextStyle || e.chartStyleRoles?.dataLabel || e.chartStyleRoles?.dataLabelCallout)) {
			let t = Xa(e, s, ra(a, i));
			n ||= t !== s, s = t;
		}
		let c = e.chartTextStyle || e.chartStyleRoles?.dataLabelCallout || e.chartStyleRoles?.dataLabel ? a.dataLabelOverrides?.map((r) => {
			let i = Qa(e, r, t.seriesDataLabels);
			return n ||= i !== r, i;
		}) : a.dataLabelOverrides;
		if (s && e.chartStyleRoles?.leaderLine) {
			let t = La(e, s), r = {
				...s,
				leaderLineColor: t.color ?? void 0,
				leaderLineWidthEmu: t.widthEmu ?? void 0,
				leaderLineDash: t.dash ?? void 0,
				leaderLineHidden: t.hidden ?? void 0,
				leaderLinePaintAuthored: t.paintAuthored
			};
			n ||= r.leaderLineColor !== s.leaderLineColor || r.leaderLineWidthEmu !== s.leaderLineWidthEmu || r.leaderLineDash !== s.leaderLineDash || r.leaderLineHidden !== s.leaderLineHidden || r.leaderLinePaintAuthored !== s.leaderLinePaintAuthored, s = r;
		}
		let l = e.chartStyleRoles?.trendline || e.chartTextStyle || e.chartStyleRoles?.trendlineLabel ? a.trendLines?.map((t) => {
			let r = e.chartStyleRoles?.trendline ? Ra(e, t) : t;
			return (e.chartTextStyle || e.chartStyleRoles?.trendlineLabel) && (r = Za(e, r, ra(a, i))), n ||= r.lineColor !== t.lineColor || r.lineWidthEmu !== t.lineWidthEmu || r.lineDash !== t.lineDash || r.lineHidden !== t.lineHidden || r !== t, r;
		}) : a.trendLines;
		return o === a.errBars && s === a.seriesDataLabels && c === a.dataLabelOverrides && l === a.trendLines ? a : {
			...a,
			errBars: o,
			seriesDataLabels: s,
			dataLabelOverrides: c,
			trendLines: l
		};
	}), a = e.dataTable;
	if (a && (e.chartStyleRoles?.dataTable || e.chartTextStyle)) {
		let t = za(e, a);
		n ||= t !== a, a = t;
	}
	let o = Ba(e, "gridlineMajor", e.valAxisMajorGridlines, e.valAxisGridlineColor, e.valAxisGridlineWidthEmu, e.valAxisGridlineDash, e.valAxisGridlinePaintAuthored, e.valAxisMajorGridlineStyle), s = Ba(e, "gridlineMajor", e.catAxisMajorGridlines, e.catAxisGridlineColor, e.catAxisGridlineWidthEmu, e.catAxisGridlineDash, e.catAxisGridlinePaintAuthored, e.catAxisMajorGridlineStyle), c = Ba(e, "gridlineMinor", e.valAxisMinorGridlines, e.valAxisMinorGridlineColor, e.valAxisMinorGridlineWidthEmu, e.valAxisMinorGridlineDash, e.valAxisMinorGridlinePaintAuthored, e.valAxisMinorGridlineStyle), l = Ba(e, "gridlineMinor", e.catAxisMinorGridlines, e.catAxisMinorGridlineColor, e.catAxisMinorGridlineWidthEmu, e.catAxisMinorGridlineDash, e.catAxisMinorGridlinePaintAuthored, e.catAxisMinorGridlineStyle), u = Va(e, e.secondaryValAxis), d = Va(e, e.secondaryCatAxis), f = Wa(e, u, "valueAxis"), p = Wa(e, d, "categoryAxis"), m = Ha(e, "categoryAxis", e.catAxisLineColor, e.catAxisLineWidthEmu, e.catAxisLineDash, e.catAxisLineHidden, e.catAxisLinePaintAuthored, e.catAxisStyle), h = Ha(e, "valueAxis", e.valAxisLineColor, e.valAxisLineWidthEmu, e.valAxisLineDash, e.valAxisLineHidden, e.valAxisLinePaintAuthored, e.valAxisStyle), g = Ua(m), _ = Ua(h), v = e.chartStyleRoles?.categoryAxis, y = e.chartStyleRoles?.valueAxis, b = e.chartStyleRoles?.title, x = e.chartStyleRoles?.axisTitle, S = e.chartStyleRoles?.dataLabel, C = e.catAxisFontSizeHpt ?? e.chartTextStyle?.fontSizeHpt ?? v?.fontSizeHpt ?? null, w = e.catAxisFontBold ?? e.chartTextStyle?.fontBold ?? v?.fontBold, T = e.catAxisFontItalic ?? e.chartTextStyle?.fontItalic ?? v?.fontItalic, E = Q(e, e.catAxisFontColor, e.catAxisFontPaintAuthored, v), D = E.color, O = e.catAxisFontFace ?? e.chartTextStyle?.fontFace ?? v?.fontFace, k = e.valAxisFontSizeHpt ?? e.chartTextStyle?.fontSizeHpt ?? y?.fontSizeHpt ?? null, A = e.valAxisFontBold ?? e.chartTextStyle?.fontBold ?? y?.fontBold, j = e.valAxisFontItalic ?? e.chartTextStyle?.fontItalic ?? y?.fontItalic, ee = Q(e, e.valAxisFontColor, e.valAxisFontPaintAuthored, y), M = ee.color, N = e.valAxisFontFace ?? e.chartTextStyle?.fontFace ?? y?.fontFace, P = e.titleFontSizeHpt ?? e.chartTextStyle?.fontSizeHpt ?? b?.fontSizeHpt ?? null, F = e.titleFontBold ?? e.chartTextStyle?.fontBold ?? b?.fontBold, I = e.titleFontItalic ?? e.chartTextStyle?.fontItalic ?? b?.fontItalic, te = e.titleFontLanguage ?? e.chartTextStyle?.fontLanguage ?? b?.fontLanguage, ne = e.titleFontBaseline ?? e.chartTextStyle?.fontBaseline ?? b?.fontBaseline, re = Q(e, e.titleFontColor, e.titleFontPaintAuthored, b), ie = re.color ?? null, L = e.titleFontFace ?? e.chartTextStyle?.fontFace ?? b?.fontFace ?? null, ae = e.catAxisTitleFontSizeHpt ?? e.chartTextStyle?.fontSizeHpt ?? x?.fontSizeHpt, oe = e.catAxisTitleFontBold ?? e.chartTextStyle?.fontBold ?? x?.fontBold, R = e.catAxisTitleFontItalic ?? e.chartTextStyle?.fontItalic ?? x?.fontItalic, z = Q(e, e.catAxisTitleFontColor, e.catAxisTitleFontPaintAuthored, x), B = z.color, V = e.catAxisTitleFontFace ?? e.chartTextStyle?.fontFace ?? x?.fontFace, se = e.valAxisTitleFontSizeHpt ?? e.chartTextStyle?.fontSizeHpt ?? x?.fontSizeHpt, ce = e.valAxisTitleFontBold ?? e.chartTextStyle?.fontBold ?? x?.fontBold, le = e.valAxisTitleFontItalic ?? e.chartTextStyle?.fontItalic ?? x?.fontItalic, ue = Q(e, e.valAxisTitleFontColor, e.valAxisTitleFontPaintAuthored, x), de = ue.color, fe = e.valAxisTitleFontFace ?? e.chartTextStyle?.fontFace ?? x?.fontFace, pe = e.dataLabelFontSizeHpt ?? e.chartTextStyle?.fontSizeHpt ?? S?.fontSizeHpt ?? null, me = e.dataLabelFontBold ?? e.chartTextStyle?.fontBold ?? S?.fontBold, H = e.dataLabelFontItalic ?? e.chartTextStyle?.fontItalic ?? S?.fontItalic, U = e.dataLabelFontLanguage ?? e.chartTextStyle?.fontLanguage ?? S?.fontLanguage, he = e.dataLabelFontBaseline ?? e.chartTextStyle?.fontBaseline ?? S?.fontBaseline, ge = Q(e, e.dataLabelFontColor, e.dataLabelFontPaintAuthored, S), _e = ge.color, ve = e.dataLabelFontFace ?? e.chartTextStyle?.fontFace ?? S?.fontFace;
	return n ||= o.visible !== e.valAxisMajorGridlines || o.color !== e.valAxisGridlineColor || o.widthEmu !== e.valAxisGridlineWidthEmu || o.dash !== e.valAxisGridlineDash || o.paintAuthored !== e.valAxisGridlinePaintAuthored || s.visible !== e.catAxisMajorGridlines || s.color !== e.catAxisGridlineColor || s.widthEmu !== e.catAxisGridlineWidthEmu || s.dash !== e.catAxisGridlineDash || s.paintAuthored !== e.catAxisGridlinePaintAuthored || c.visible !== e.valAxisMinorGridlines || c.color !== e.valAxisMinorGridlineColor || c.widthEmu !== e.valAxisMinorGridlineWidthEmu || c.dash !== e.valAxisMinorGridlineDash || c.paintAuthored !== e.valAxisMinorGridlinePaintAuthored || l.visible !== e.catAxisMinorGridlines || l.color !== e.catAxisMinorGridlineColor || l.widthEmu !== e.catAxisMinorGridlineWidthEmu || l.dash !== e.catAxisMinorGridlineDash || l.paintAuthored !== e.catAxisMinorGridlinePaintAuthored || f !== e.secondaryValAxis || p !== e.secondaryCatAxis || m.color !== e.catAxisLineColor || m.widthEmu !== e.catAxisLineWidthEmu || m.dash !== e.catAxisLineDash || g !== e.catAxisLineHidden || m.paintAuthored !== e.catAxisLinePaintAuthored || h.color !== e.valAxisLineColor || h.widthEmu !== e.valAxisLineWidthEmu || h.dash !== e.valAxisLineDash || _ !== e.valAxisLineHidden || h.paintAuthored !== e.valAxisLinePaintAuthored || C !== e.catAxisFontSizeHpt || w !== e.catAxisFontBold || T !== e.catAxisFontItalic || D !== e.catAxisFontColor || E.authored !== e.catAxisFontPaintAuthored || O !== e.catAxisFontFace || k !== e.valAxisFontSizeHpt || A !== e.valAxisFontBold || j !== e.valAxisFontItalic || M !== e.valAxisFontColor || ee.authored !== e.valAxisFontPaintAuthored || N !== e.valAxisFontFace || P !== e.titleFontSizeHpt || F !== e.titleFontBold || I !== e.titleFontItalic || te !== e.titleFontLanguage || ne !== e.titleFontBaseline || ie !== e.titleFontColor || re.authored !== e.titleFontPaintAuthored || L !== e.titleFontFace || ae !== e.catAxisTitleFontSizeHpt || oe !== e.catAxisTitleFontBold || R !== e.catAxisTitleFontItalic || B !== e.catAxisTitleFontColor || z.authored !== e.catAxisTitleFontPaintAuthored || V !== e.catAxisTitleFontFace || se !== e.valAxisTitleFontSizeHpt || ce !== e.valAxisTitleFontBold || le !== e.valAxisTitleFontItalic || de !== e.valAxisTitleFontColor || ue.authored !== e.valAxisTitleFontPaintAuthored || fe !== e.valAxisTitleFontFace || pe !== e.dataLabelFontSizeHpt || me !== e.dataLabelFontBold || H !== e.dataLabelFontItalic || U !== e.dataLabelFontLanguage || he !== e.dataLabelFontBaseline || _e !== e.dataLabelFontColor || ge.authored !== e.dataLabelFontPaintAuthored || ve !== e.dataLabelFontFace, $a(to(no(Ga(n ? {
		...e,
		series: i,
		dataTable: a,
		valAxisMajorGridlines: o.visible,
		valAxisGridlineColor: o.color,
		valAxisGridlineWidthEmu: o.widthEmu,
		valAxisGridlineDash: o.dash,
		valAxisGridlinePaintAuthored: o.paintAuthored,
		catAxisMajorGridlines: s.visible,
		catAxisGridlineColor: s.color,
		catAxisGridlineWidthEmu: s.widthEmu,
		catAxisGridlineDash: s.dash,
		catAxisGridlinePaintAuthored: s.paintAuthored,
		valAxisMinorGridlines: c.visible,
		valAxisMinorGridlineColor: c.color,
		valAxisMinorGridlineWidthEmu: c.widthEmu,
		valAxisMinorGridlineDash: c.dash,
		valAxisMinorGridlinePaintAuthored: c.paintAuthored,
		catAxisMinorGridlines: l.visible,
		catAxisMinorGridlineColor: l.color,
		catAxisMinorGridlineWidthEmu: l.widthEmu,
		catAxisMinorGridlineDash: l.dash,
		catAxisMinorGridlinePaintAuthored: l.paintAuthored,
		secondaryValAxis: f,
		secondaryCatAxis: p,
		catAxisLineColor: m.color,
		catAxisLineWidthEmu: m.widthEmu,
		catAxisLineDash: m.dash,
		catAxisLineHidden: g,
		catAxisLinePaintAuthored: m.paintAuthored,
		valAxisLineColor: h.color,
		valAxisLineWidthEmu: h.widthEmu,
		valAxisLineDash: h.dash,
		valAxisLineHidden: _,
		valAxisLinePaintAuthored: h.paintAuthored,
		catAxisFontSizeHpt: C,
		catAxisFontBold: w,
		catAxisFontItalic: T,
		catAxisFontColor: D,
		catAxisFontPaintAuthored: E.authored,
		catAxisFontFace: O,
		valAxisFontSizeHpt: k,
		valAxisFontBold: A,
		valAxisFontItalic: j,
		valAxisFontColor: M,
		valAxisFontPaintAuthored: ee.authored,
		valAxisFontFace: N,
		titleFontSizeHpt: P,
		titleFontBold: F,
		titleFontItalic: I,
		titleFontLanguage: te,
		titleFontBaseline: ne,
		titleFontColor: ie,
		titleFontPaintAuthored: re.authored,
		titleFontFace: L,
		catAxisTitleFontSizeHpt: ae,
		catAxisTitleFontBold: oe,
		catAxisTitleFontItalic: R,
		catAxisTitleFontColor: B,
		catAxisTitleFontPaintAuthored: z.authored,
		catAxisTitleFontFace: V,
		valAxisTitleFontSizeHpt: se,
		valAxisTitleFontBold: ce,
		valAxisTitleFontItalic: le,
		valAxisTitleFontColor: de,
		valAxisTitleFontPaintAuthored: ue.authored,
		valAxisTitleFontFace: fe,
		dataLabelFontSizeHpt: pe,
		dataLabelFontBold: me,
		dataLabelFontItalic: H,
		dataLabelFontLanguage: U,
		dataLabelFontBaseline: he,
		dataLabelFontColor: _e,
		dataLabelFontPaintAuthored: ge.authored,
		dataLabelFontFace: ve
	} : e))));
}
function ao(e, t, n, r, i, a, o, s = !1, c = !1, l = "major", u = 1, d) {
	if (c || t === "none" || !t) return;
	let f = so(l, o, u), p = t === "cross" ? f / 2 : f, m = e.strokeStyle, h = e.lineWidth, g = e.getLineDash?.() ?? [];
	if (e.strokeStyle = a ?? "#888", e.lineWidth = o ?? 1, e.setLineDash(Z(d ?? void 0, e.lineWidth)), e.beginPath(), n === "val") {
		let n = r, a = i, o = s ? 1 : -1, c = t === "out" || t === "cross" ? o * p : 0, l = t === "in" || t === "cross" ? -o * p : 0;
		e.moveTo(n + c, a), e.lineTo(n + l, a);
	} else {
		let n = r, a = i, o = s ? -1 : 1, c = t === "out" || t === "cross" ? o * p : 0, l = t === "in" || t === "cross" ? -o * p : 0;
		e.moveTo(a, n + c), e.lineTo(a, n + l);
	}
	e.stroke(), e.strokeStyle = m, e.lineWidth = h, e.setLineDash(g);
}
function oo(e, t, n, r, i, a, o, s) {
	let c = e.getLineDash?.() ?? [], l = Z(s ?? void 0, o), u = l.length !== c.length || l.some((e, t) => e !== c[t]);
	e.strokeStyle = a, e.lineWidth = o, u && e.setLineDash(l), e.beginPath(), e.moveTo(t, n), e.lineTo(r, i), e.stroke(), u && e.setLineDash(c);
}
function so(e, t, n) {
	let r = (e === "minor" ? 4 : 6) * n;
	return t ? Math.max(r, t + 2 * n) : r;
}
function co(e, t, n, r) {
	if (e !== "out" && e !== "cross") return 0;
	let i = so(t, n, r);
	return e === "cross" ? i / 2 : i;
}
function lo(e, t, n, r, i, a) {
	a && a.explicit ? (e.strokeStyle = a.color, e.lineWidth = a.width) : (e.strokeStyle = i ? "#aaa" : a?.color ?? "#e0e0e0", e.lineWidth = i ? 1 : a?.width ?? .5);
	let o = a?.dash ?? [], s = o.length > 0 && e.getLineDash ? e.getLineDash() : [];
	o.length > 0 && e.setLineDash(o), e.beginPath(), e.moveTo(t, r), e.lineTo(t + n, r), e.stroke(), o.length > 0 && e.setLineDash(s);
}
function uo(e, t) {
	let { color: n, width: r } = gi(e.valAxisGridlineColor, e.valAxisGridlineWidthEmu, t);
	return {
		color: n,
		width: r,
		explicit: e.valAxisGridlineColor != null || e.valAxisGridlineWidthEmu != null || e.valAxisGridlineDash != null,
		dash: Z(e.valAxisGridlineDash ?? void 0, r)
	};
}
function fo(e, t) {
	let { color: n, width: r } = gi(e.valAxisMinorGridlineColor, e.valAxisMinorGridlineWidthEmu, t);
	return {
		color: n,
		width: r,
		explicit: e.valAxisMinorGridlineColor != null,
		dash: Z(e.valAxisMinorGridlineDash ?? void 0, r)
	};
}
function po(e, t) {
	let { color: n, width: r } = gi(e.minorGridlineColor, e.minorGridlineWidthEmu, t);
	return {
		color: n,
		width: r,
		explicit: e.minorGridlineColor != null || e.minorGridlineWidthEmu != null || e.minorGridlineDash != null,
		dash: Z(e.minorGridlineDash ?? void 0, r)
	};
}
function mo(e, t) {
	let { color: n, width: r } = gi(e.majorGridlineColor, e.majorGridlineWidthEmu, t);
	return {
		color: n,
		width: r,
		explicit: e.majorGridlineColor != null || e.majorGridlineWidthEmu != null || e.majorGridlineDash != null,
		dash: Z(e.majorGridlineDash ?? void 0, r)
	};
}
function ho(e) {
	return e.catAxisMajorGridlines === !0;
}
function go(e, t) {
	let n = gi(e.catAxisGridlineColor, e.catAxisGridlineWidthEmu, t);
	return {
		...n,
		dash: Z(e.catAxisGridlineDash ?? void 0, n.width)
	};
}
function _o(e, t) {
	let n = gi(e.catAxisMinorGridlineColor, e.catAxisMinorGridlineWidthEmu, t);
	return {
		...n,
		dash: Z(e.catAxisMinorGridlineDash ?? void 0, n.width)
	};
}
function vo(e, t) {
	if (t <= 0) return [];
	let n = _i(e), r = [], i = n ? t : t - 1;
	for (let e = 0; e <= i; e++) r.push(n ? e / t : t === 1 ? .5 : e / (t - 1));
	return r;
}
function yo(e) {
	return e.valAxisOrientation === "maxMin";
}
function bo(e) {
	return e.catAxisOrientation === "maxMin";
}
function xo(e) {
	return e.valAxisMajorGridlines !== !1;
}
function So(e, t) {
	return e == null || !t ? e : e * 100;
}
function Co(e, t, n) {
	return v((n ? t / 100 : t) / wo(e.valAxisDisplayUnits), n ? e.valAxisFormatCode ?? "0%" : e.valAxisFormatCode, e.date1904, e.valAxisFormatDivisors);
}
function wo(e) {
	let t = e?.divisor;
	return t != null && Number.isFinite(t) && t > 0 ? t : 1;
}
function To(e, t, n, r, i) {
	return v(e / wo(r), t, n, i);
}
function Eo(e) {
	return e.builtInUnit ? {
		hundreds: "Hundreds",
		thousands: "Thousands",
		tenThousands: "Ten Thousands",
		hundredThousands: "Hundred Thousands",
		millions: "Millions",
		tenMillions: "Ten Millions",
		hundredMillions: "Hundred Millions",
		billions: "Billions",
		trillions: "Trillions"
	}[e.builtInUnit] ?? e.builtInUnit : _(e.divisor);
}
function Do(e, t, n, r) {
	let i = [
		{
			units: t.valAxisDisplayUnits,
			vertical: !0,
			fallbackX: n.x + n.w * .08,
			fallbackY: n.y + n.h * .12,
			axis: {
				size: t.valAxisFontSizeHpt,
				bold: t.valAxisFontBold,
				italic: t.valAxisFontItalic,
				color: t.valAxisFontColor,
				paintAuthored: t.valAxisFontPaintAuthored,
				face: t.valAxisFontFace
			}
		},
		{
			units: t.catAxisDisplayUnits,
			vertical: !1,
			fallbackX: n.x + n.w * .82,
			fallbackY: n.y + n.h * .82,
			axis: {
				size: t.catAxisFontSizeHpt,
				bold: t.catAxisFontBold,
				italic: t.catAxisFontItalic,
				color: t.catAxisFontColor,
				paintAuthored: t.catAxisFontPaintAuthored,
				face: t.catAxisFontFace
			}
		},
		{
			units: t.secondaryValAxis?.displayUnits,
			vertical: !0,
			fallbackX: n.x + n.w * .92,
			fallbackY: n.y + n.h * .12,
			axis: {
				size: t.secondaryValAxis?.fontSizeHpt,
				bold: t.secondaryValAxis?.fontBold,
				italic: t.secondaryValAxis?.fontItalic,
				color: t.secondaryValAxis?.fontColor,
				paintAuthored: t.secondaryValAxis?.fontPaintAuthored,
				face: t.secondaryValAxis?.fontFace
			}
		},
		{
			units: t.secondaryCatAxis?.displayUnits,
			vertical: !1,
			fallbackX: n.x + n.w * .82,
			fallbackY: n.y + n.h * .08,
			axis: {
				size: t.secondaryCatAxis?.fontSizeHpt,
				bold: t.secondaryCatAxis?.fontBold,
				italic: t.secondaryCatAxis?.fontItalic,
				color: t.secondaryCatAxis?.fontColor,
				paintAuthored: t.secondaryCatAxis?.fontPaintAuthored,
				face: t.secondaryCatAxis?.fontFace
			}
		}
	];
	for (let { units: a, vertical: o, fallbackX: s, fallbackY: c, axis: l } of i) {
		let i = a?.label;
		if (!a || !i) continue;
		let u = i.text ?? Eo(a), d = t.chartTextStyle, f = Xe(i.fontSizeHpt ?? l.size ?? d?.fontSizeHpt, r) ?? 10 * r, p = i.fontBold ?? l.bold ?? d?.fontBold ?? !1, m = i.fontItalic ?? l.italic ?? d?.fontItalic ?? !1, h = i.fontPaintAuthored === !0 ? {
			color: i.fontColor,
			hidden: i.fontHidden === !0 || i.fontColor == null
		} : l.paintAuthored === !0 ? {
			color: l.color,
			hidden: l.color == null
		} : d?.fontPaintAuthored === !0 ? {
			color: d.fontColor,
			hidden: d.fontColor == null
		} : {
			color: i.fontColor ?? l.color ?? d?.fontColor,
			hidden: !1
		};
		if (h.hidden) continue;
		let g = h.color, _ = i.fontFace ?? l.face ?? d?.fontFace;
		e.save(), e.font = ja(f, Aa(t, _, "minor"), p, m);
		let v = i.rotation == null ? o ? -Math.PI / 2 : 0 : i.rotation / 6e4 * Math.PI / 180, y = Ue(e, u), b = Re(f), x = f + He([u], b), S = Math.abs(Math.cos(v)) * y + Math.abs(Math.sin(v)) * x, C = Math.abs(Math.sin(v)) * y + Math.abs(Math.cos(v)) * x, w = {
			x: s - S / 2,
			y: c - C / 2,
			w: S,
			h: C
		}, T = i.manualLayout ? xt({
			...i.manualLayout,
			w: void 0,
			h: void 0
		}, n, w) : w;
		if (!T) {
			e.restore();
			continue;
		}
		let E = T.x + T.w / 2, D = T.y + T.h / 2;
		Br(e, Ya(t, i.boxStyle, t.chartStyleRoles?.axisTitle, R(t, "axisTitle"), !0), T, r), e.translate(E, D), v !== 0 && e.rotate(v), e.fillStyle = g ? `#${g}` : "#595959", e.textAlign = "center", e.textBaseline = "middle", Ge(e, u, 0, 0, b), e.restore();
	}
}
function Oo(e, t, n, r, i = !1, a = "vertical", o = null) {
	let s = yo(e), c = e.valAxisLogBase, l = c != null && isFinite(c) && c >= 2, u = i && o != null && e.valMin == null && o[0] < Math.min(t, 0), d = i && o != null && e.valMax == null && o[1] > Math.max(n, 0), f = u && o ? o[0] : t, p = d && o ? o[1] : n, m = So(e.valAxisMajorUnit, i), h = i && !l && !(m != null && isFinite(m) && m > 0) ? oa(f, p, a, r) : m, g = h != null && isFinite(h) && h > 0 && !l ? h : null, _ = u && g != null ? Math.floor(f / g) * g : t, v = d && g != null ? Math.ceil(p / g) * g : n, y = So(e.valMin, i) ?? (i ? _ : e.valMin), b = So(e.valMax, i) ?? (i ? v : e.valMax), x = e.valAxisMinorTickMark != null && e.valAxisMinorTickMark !== "none", S = va({
		dataMin: _,
		dataMax: v,
		explicitMin: y,
		explicitMax: b,
		axisLenPt: r,
		axisOrientation: a,
		majorUnit: h,
		minorUnit: So(e.valAxisMinorUnit, i),
		needMinor: e.valAxisMinorGridlines === !0 || x,
		logBase: c,
		reversed: s
	}), { min: C, max: w, majorUnit: T, majorTicks: E } = S;
	return {
		min: C,
		max: w,
		step: T,
		majorLines: E,
		minorLines: e.valAxisMinorGridlines ? S.minorTicks : [],
		minorTicks: S.minorTicks,
		frac: S.fraction
	};
}
function ko(e, t, n) {
	return Xe(e, n) ?? Math.max(8, t * .045);
}
function Ao(e, t, n, r = 0) {
	let i = t.trim().split(/\r\n|\r|\n/);
	return i.length === 1 ? jo(e, i[0], n, r) : i.flatMap((t) => jo(e, t, n, r));
}
function jo(e, t, n, r) {
	let i = t.trim().split(/\s+/).filter(Boolean);
	if (i.length === 0) return [""];
	let a = [], o = "", s = (t) => {
		let i = o ? `${o} ${t}` : t;
		if (e.measureText(i).width <= n) {
			o = i;
			return;
		}
		if (o &&= (a.push(o), ""), e.measureText(t).width <= n + r) {
			o = t;
			return;
		}
		let s = Array.from(t), c = 0;
		for (; c < s.length;) {
			let t = c + 1, r = s.length, i = c + 1;
			for (; t <= r;) {
				let a = Math.floor((t + r) / 2);
				e.measureText(s.slice(c, a).join("")).width <= n ? (i = a, t = a + 1) : r = a - 1;
			}
			let l = s.slice(c, i).join("");
			c = i, c < s.length ? a.push(l) : o = l;
		}
	};
	for (let e of i) s(e);
	return o && a.push(o), a.length ? a : [""];
}
function Mo(e) {
	return e.catAxisTickLabelPos !== "none";
}
var No = 54e5;
function Po(e) {
	let t = e.catAxisLabelRotation;
	return t == null || t === 0 || Math.abs(t) > No ? 0 : t / 6e4 * (Math.PI / 180);
}
function Fo(e, t, n, r, i, a, o) {
	if (i === 0) {
		Ge(e, t, n, r, a, o);
		return;
	}
	e.save(), e.translate(n, r), e.rotate(i), e.textAlign = "right", e.textBaseline = "middle", Ge(e, t, 0, 0, a, o), e.restore();
}
function Io(e, t, n, r, i, a, o, s, c, l, u = "sans-serif", d, f, p, m, h, g = 1) {
	e.save(), e.font = ja(a, u, o, s), e.fillStyle = c;
	let _ = ze(t), v = p ? t : _.length === 1 ? Fe(e, t, l) : _.map((t) => Fe(e, t, l)).join("\n"), y = a + at(v, a), b = ct(i, d, f), x = n, S = r;
	if (p && m) {
		let t = Ue(e, v), i = Math.abs(Math.cos(b)), a = Math.abs(Math.sin(b)), o = t * i + y * a, s = t * a + y * i, c = {
			x: n - o / 2,
			y: r - s / 2,
			w: o,
			h: s
		}, l = xt({
			...p,
			w: void 0,
			h: void 0
		}, m, c);
		l && (x = l.x + l.w / 2, S = l.y + l.h / 2);
	}
	e.translate(x, S), b !== 0 && e.rotate(b);
	let C = Ue(e, v);
	Br(e, h, {
		x: -C / 2,
		y: -y / 2,
		w: C,
		h: y
	}, g), e.textAlign = "center", e.textBaseline = "middle", Ge(e, v, 0, 0, a), e.restore();
}
function Lo(e) {
	return e ? `#${e}` : "#555";
}
function Ro(e, t, n, r, i, a, o, s, c, l, u, d, f, p, m = !1) {
	let h = (f, p, m, h, g, _, v, y, b, x, S) => {
		let C = Ya(t, S ? { style: S } : void 0, t.chartStyleRoles?.axisTitle, R(t, "axisTitle"), !0), w = st(f, m, p, y, b) / 2;
		if (p === "left") {
			Io(e, f, n + u + lt(i) + m / 2 + w, s + l / 2, p, m, h, g, _, l, v, y, b, x, {
				x: n,
				y: r,
				w: i,
				h: a
			}, C, m / 10);
			return;
		}
		Io(e, f, o + c / 2, r + a - d - lt(a) - m / 2 - w, p, m, h, g, _, c, v, y, b, x, {
			x: n,
			y: r,
			w: i,
			h: a
		}, C, m / 10);
	};
	t.valAxisTitle && h(t.valAxisTitle, m ? "horizontal" : "left", p, t.valAxisTitleFontBold ?? !0, t.valAxisTitleFontItalic ?? !1, Lo(t.valAxisTitleFontColor), Aa(t, t.valAxisTitleFontFace, "major"), t.valAxisTitleRotation, t.valAxisTitleVerticalMode, t.valAxisTitleManualLayout, t.valAxisTitleStyle), t.catAxisTitle && h(t.catAxisTitle, m ? "left" : "horizontal", f, t.catAxisTitleFontBold ?? !0, t.catAxisTitleFontItalic ?? !1, Lo(t.catAxisTitleFontColor), Aa(t, t.catAxisTitleFontFace, "major"), t.catAxisTitleRotation, t.catAxisTitleVerticalMode, t.catAxisTitleManualLayout, t.catAxisTitleStyle);
}
function zo(e) {
	return e === "days" || e === "months" || e === "years" ? e : null;
}
function Bo(e, t) {
	switch (t) {
		case "years": return new Date(Date.UTC(e.getUTCFullYear(), 0, 1));
		case "months": return new Date(Date.UTC(e.getUTCFullYear(), e.getUTCMonth(), 1));
		case "days": return new Date(Date.UTC(e.getUTCFullYear(), e.getUTCMonth(), e.getUTCDate()));
	}
}
function Vo(e, t, n) {
	if (n === "days") return new Date(e.getTime() + t * 864e5);
	let r = new Date(e.getTime());
	return n === "months" ? r.setUTCMonth(r.getUTCMonth() + t) : r.setUTCFullYear(r.getUTCFullYear() + t), r;
}
function Ho(e, t) {
	switch (t) {
		case "years": return e.getUTCFullYear();
		case "months": return e.getUTCFullYear() * 12 + e.getUTCMonth();
		case "days": return Math.floor(e.getTime() / 864e5);
	}
}
function Uo(e) {
	let t = e.categories.map((e) => Number(e));
	if (t.length === 0 || t.some((e) => !Number.isFinite(e))) return null;
	let n = e.date1904 === !0, r = zo(e.baseTimeUnit) ?? "days", i = zo(e.majorTimeUnit) ?? r, a = zo(e.minorTimeUnit) ?? r, o = (e, t) => e == null || !(e > 0) || !Number.isFinite(e) ? null : t === "days" || e >= 1 && Number.isInteger(e) ? e : null, s = o(e.majorUnit, i), c = o(e.minorUnit, a), l = (e) => Ho(g(e, n), r), u = Array(t.length), d = Infinity, f = -Infinity, p = Infinity, m = -Infinity;
	for (let e = 0; e < t.length; e++) {
		let n = t[e], r = l(n);
		u[e] = r, d = Math.min(d, r), f = Math.max(f, r), p = Math.min(p, n), m = Math.max(m, n);
	}
	let _ = e.explicitMin, v = e.explicitMax, y = _ != null && Number.isFinite(_) ? l(_) : null, b = v != null && Number.isFinite(v) ? l(v) : null, x = e.crossBetween !== !1, S = y ?? d, C = (b ?? f) + +!!x;
	C > S || (S -= .5, C += .5);
	let w = C - S, T = (e) => (l(e) - S) / w, E = e.reversed ? (e) => 1 - T(e) : T, D = (e) => (l(e) + (x ? .5 : 0) - S) / w, O = e.reversed ? (e) => 1 - D(e) : D, k = t.map(O), A = t.map(() => 1 / w), j = _ != null && Number.isFinite(_) ? _ : p, ee = v != null && Number.isFinite(v) ? v : m, M = (e, t) => {
		if (t == null) return [];
		let r = Bo(g(j, n), e), i = h(r, n);
		for (let a = 0; i < j && a < 512; a++) {
			let a = Vo(r, t, e), o = h(a, n);
			if (!(o > i)) return [];
			r = a, i = o;
		}
		if (i < j) return [];
		let a = [];
		for (; i <= ee;) {
			if (a.length === 512) return [];
			a.push({
				serial: i,
				fraction: E(i)
			});
			let o = Vo(r, t, e), s = h(o, n);
			if (!(s > i)) break;
			r = o, i = s;
		}
		return a;
	}, N = M(i, s), P = new Set(N.map((e) => l(e.serial)));
	return {
		positions: k,
		categoryBandFractions: A,
		majorTicks: N,
		minorTicks: c == null ? [] : M(a, c).filter((e) => !P.has(l(e.serial)))
	};
}
function Wo(e, t, n = bo(e)) {
	return e.catAxisIsDate === !0 ? Uo({
		categories: t,
		date1904: e.date1904,
		baseTimeUnit: e.catAxisBaseTimeUnit,
		majorTimeUnit: e.catAxisMajorTimeUnit,
		majorUnit: e.catAxisMajorUnit,
		minorTimeUnit: e.catAxisMinorTimeUnit,
		minorUnit: e.catAxisMinorUnit,
		explicitMin: e.catAxisMin,
		explicitMax: e.catAxisMax,
		crossBetween: _i(e),
		reversed: n
	}) : null;
}
function Go(e, t, n, r) {
	for (let i of e.errBars ?? []) {
		if (i.dir !== t) continue;
		let a = i.barType === "plus" || i.barType === "both", o = i.barType === "minus" || i.barType === "both", s = Math.max(e.values.length, i.plus.length, i.minus.length);
		for (let e = 0; e < s; e++) {
			let t = n(e);
			if (t == null || !Number.isFinite(t)) continue;
			let s = i.plus[e], c = i.minus[e];
			a && s != null && Number.isFinite(s) && r(t + s), o && c != null && Number.isFinite(c) && r(t - c);
		}
	}
}
function Ko(e, t, n, r = "y", i = !1, a = !1, o = (e) => e.useSecondaryAxis === !0, s = () => null, c = []) {
	if (!e) return null;
	let l = Infinity, u = -Infinity, d = (e) => {
		Number.isFinite(e) && (l = Math.min(l, e), u = Math.max(u, e));
	};
	a && d(0);
	for (let e = 0; e < t.length; e++) {
		let n = t[e];
		if (o(n, e)) {
			for (let t = 0; t < n.values.length; t++) {
				let r = s(n, t, e) ?? n.values[t];
				r != null && d(r);
			}
			Go(n, r, (t) => s(n, t, e) ?? n.values[t] ?? null, d);
		}
	}
	let f = Infinity, p = -Infinity;
	for (let e of c) Number.isFinite(e) && (f = Math.min(f, e), p = Math.max(p, e));
	i || (d(f), d(p)), (!Number.isFinite(l) || !Number.isFinite(u)) && (l = 0, u = 1);
	let m = So(e.majorUnit, i), h = So(e.min, i), g = So(e.max, i), _ = e.logBase != null && Number.isFinite(e.logBase) && e.logBase >= 2, v = Math.min(l, 0), y = Math.max(u, 0), b = i && !_ && h == null && f < v, x = i && !_ && g == null && p > y;
	if (b || x) {
		let e = b ? f : v, t = x ? p : y, r = m != null && Number.isFinite(m) && m > 0 ? m : oa(e, t, "vertical", n);
		b && (h = Math.floor(e / r) * r), x && (g = Math.ceil(t / r) * r), m = r;
	}
	let S = va({
		dataMin: l,
		dataMax: u,
		explicitMin: h,
		explicitMax: g,
		axisLenPt: n,
		axisOrientation: "vertical",
		majorUnit: m,
		minorUnit: So(e.minorUnit, i),
		needMinor: e.minorGridlines === !0 || e.minorTickMark != null && e.minorTickMark !== "none",
		logBase: e.logBase,
		reversed: e.orientation === "maxMin"
	}), { min: C, max: w, majorUnit: T } = S;
	return {
		min: C,
		max: w,
		step: T,
		majorLines: S.majorTicks,
		minorTicks: S.minorTicks,
		makeToY: (e, t) => (n) => e + t - S.fraction(n) * t
	};
}
function qo(e, t, n, r, i, a, o) {
	if (!t.hidden) {
		if (e.save(), t.minorGridlines) {
			let s = po(t, o);
			for (let t of n.minorTicks) lo(e, i, a, r(t), !1, s);
		}
		if (t.majorGridlines) {
			let s = mo(t, o);
			for (let t of n.majorLines) lo(e, i, a, r(t), !1, s);
		}
		e.restore();
	}
}
function Jo(e, t, n, r, i, a, o, s, c, l, u, d, f, p, m, h = !1, g = "right") {
	let _ = g === "left" ? o : o + c, { color: v, width: y } = hi(n.lineColor, n.lineWidthEmu, u);
	if (n.lineHidden || oo(e, _, s, _, s + l, v, y, n.lineDash), !n.hidden) {
		e.font = `${n.fontItalic ? "italic " : ""}${n.fontBold ? "bold " : ""}${d}px ${Aa(t, n.fontFace, "minor")}`, e.fillStyle = n.fontColor ? `#${n.fontColor}` : p, e.textAlign = g === "left" ? "right" : "left", e.textBaseline = "middle";
		for (let t of r.majorLines) {
			let r = i(t);
			ao(e, n.majorTickMark, "val", _, r, v, y, g === "right", n.lineHidden, "major", u, n.lineDash), n.tickLabelPos !== "none" && Ge(e, To(h ? t / 100 : t, n.formatCode ?? null, m, n.displayUnits, n.formatDivisors), g === "left" ? _ - 14 : _ + 14, r, Re(d));
		}
		if (n.minorTickMark && n.minorTickMark !== "none") for (let t of r.minorTicks) ao(e, n.minorTickMark, "val", _, i(t), v, y, g === "right", n.lineHidden, "minor", u, n.lineDash);
	}
	n.title && Yo(e, t, n, a, o, s, c, l, f, u, g);
}
function Yo(e, t, n, r, i, a, o, s, c, l, u = "right") {
	if (!n.title) return;
	let d = rt(n.titleFontSizeHpt, l), f = n.titleFontColor ? `#${n.titleFontColor}` : n.fontColor ? `#${n.fontColor}` : "#555", p = st(n.title, d, u, n.titleRotation, n.titleVerticalMode) / 2;
	Io(e, n.title, u === "left" ? i - c - d * .6 - p : i + o + c + d * .6 + p, a + s / 2, u, d, n.titleFontBold ?? !0, n.titleFontItalic ?? !1, f, s, Aa(t, n.titleFontFace, "major"), n.titleRotation, n.titleVerticalMode, n.titleManualLayout, r, Ya(t, n.titleStyle ? { style: n.titleStyle } : void 0, t.chartStyleRoles?.axisTitle, R(t, "axisTitle"), !0), l);
}
function Xo(e, t, n, r, i, a, o, s, c) {
	if (n.hidden || r.length === 0) return;
	let { color: l, width: u } = hi(n.lineColor, n.lineWidthEmu, c);
	n.lineHidden || oo(e, a, o, a + s, o, l, u, n.lineDash);
	let d = n.orientation === "maxMin", f = Math.max(1, Math.floor(n.tickLabelSkip ?? 1)), p = Math.max(1, Math.floor(n.tickMarkSkip ?? 1)), m = r.length, h = (e) => je(e, m, _i(t), d, n.labelAlignment);
	if (!n.lineHidden && n.majorTickMark !== "none") {
		let r = _i(t), i = r ? m : m - 1;
		for (let t = 0; t <= i; t += p) {
			let f = d ? i - t : t, p = r ? f / m : m === 1 ? .5 : f / (m - 1);
			ao(e, n.majorTickMark, "cat", o, a + p * s, l, u, !0, n.lineHidden, "major", c, n.lineDash);
		}
	}
	let g = Xe(n.fontSizeHpt, c) ?? 9 * c;
	if (n.tickLabelPos !== "none") {
		e.font = ja(g, Aa(t, n.fontFace, "minor"), n.fontBold ?? !1, n.fontItalic ?? !1), e.fillStyle = n.fontColor ? `#${n.fontColor}` : "#555", e.textBaseline = "bottom";
		let i = Math.max(1, s / m - 4), c = De(_t(g), n.labelOffsetPercent);
		for (let l = 0; l < m; l += f) {
			let u = h(l);
			e.textAlign = u.textAlign, Ge(e, y(r[l], n.formatCode, t.date1904, n.formatDivisors), a + u.fraction * s, o - c, Re(g), i);
		}
	}
	if (n.title) {
		let l = rt(n.titleFontSizeHpt, c);
		Io(e, n.title, a + s / 2, o - (n.tickLabelPos === "none" ? 0 : g + Zo(r, n, t, g) + De(_t(g), n.labelOffsetPercent)) - l / 2 - 4 - st(n.title, l, "horizontal", n.titleRotation, n.titleVerticalMode) / 2, "horizontal", l, n.titleFontBold ?? !0, n.titleFontItalic ?? !1, n.titleFontColor ? `#${n.titleFontColor}` : "#555", s, Aa(t, n.titleFontFace, "major"), n.titleRotation, n.titleVerticalMode, n.titleManualLayout, i, Ya(t, n.titleStyle ? { style: n.titleStyle } : void 0, t.chartStyleRoles?.axisTitle, R(t, "axisTitle"), !0), c);
	}
}
function Zo(e, t, n, r) {
	if (t.tickLabelPos === "none") return 0;
	let i = Math.max(1, Math.floor(t.tickLabelSkip ?? 1)), a = [];
	for (let r = 0; r < e.length; r += i) a.push(y(e[r], t.formatCode, n.date1904, t.formatDivisors));
	return He(a, Re(r));
}
function Qo(e, t) {
	let n = rt(e.titleFontSizeHpt, t);
	return n + 8 + st(e.title, n, "right", e.titleRotation, e.titleVerticalMode);
}
function $o(e, t) {
	let n = new Set(t);
	if (e.series.some((e) => !n.has(e))) return !1;
	let r = e.chartType === "clusteredBarH" || e.chartType === "stackedBarH" || e.chartType === "stackedBarHPct", i = e.chartType.startsWith("stacked") ? e.chartType.endsWith("Pct") ? "percentStacked" : "stacked" : "clustered", a = /* @__PURE__ */ new Set();
	for (let e of t) {
		if (e.useSecondaryAxis === !0) return !1;
		let t = e.barGroupDirection == null ? r : e.barGroupDirection === "bar", n = e.barGroupGrouping ?? i;
		if (t || n === "stacked" || n === "percentStacked" || (a.add(e.barGroupIndex == null ? "primary-default" : `group-${e.barGroupIndex}`), a.size > 1)) return !1;
	}
	return !0;
}
function es(e, t, n, r) {
	let i = 0, a = 0, o = (e) => {
		i = Math.min(i, e), a = Math.max(a, e);
	};
	for (let e of t) {
		for (let t = 0; t < Math.min(e.values.length, n); t++) {
			let n = e.values[t];
			n == null || !Number.isFinite(n) || o(n);
		}
		Go(e, "y", (t) => t < n ? e.values[t] ?? null : null, o);
	}
	return e.valMax != null && (a = e.valMax), e.valMin != null && (i = e.valMin), i === 0 && a === 0 && (a = 1), Oo(e, i, a, r, !1, "vertical");
}
function ts(e, t, n, r) {
	let i = (e) => Math.max(n, Math.min(r, e)), a = i(Math.min(e, t)), o = i(Math.max(e, t));
	return Number.isFinite(a) && Number.isFinite(o) && o > a;
}
function ns(e) {
	return (!e.clipCategory || ts(e.categoryStart, e.categoryEnd, e.categoryClipStart ?? 0, e.categoryClipEnd ?? 1)) && ts(e.valueStart, e.valueEnd, e.valueClipStart ?? 0, e.valueClipEnd ?? 1);
}
function rs(e, t, n, r) {
	let i = e.chartType === "clusteredBarH" || e.chartType === "stackedBarH" || e.chartType === "stackedBarHPct", a = e.chartType.startsWith("stacked"), o = e.chartType === "stackedBarPct" || e.chartType === "stackedBarHPct", s = (e) => e.barGroupDirection == null ? i : e.barGroupDirection === "bar", c = (e) => e.barGroupGrouping ?? (o ? "percentStacked" : a ? "stacked" : "clustered"), l = (e) => {
		let t = c(e);
		return t === "stacked" || t === "percentStacked";
	}, u = (e) => c(e) === "percentStacked", d = (e) => e.barGroupIndex == null ? e.useSecondaryAxis === !0 ? "secondary-default" : "primary-default" : `group-${e.barGroupIndex}`, f = /* @__PURE__ */ new Map(), p = new Set(t);
	for (let e of t) {
		let t = d(e), n = f.get(t);
		n ? n.push(e) : f.set(t, [e]);
	}
	let m = !i && e.secondaryValAxis != null && e.series.some((e) => e.useSecondaryAxis === !0), h = /* @__PURE__ */ new Map(), g = /* @__PURE__ */ new Map();
	for (let t of e.plotGroups ?? []) {
		if (t.seriesCount > 0) {
			let e = g.get(t.valueAxis) ?? {
				count: 0,
				percentCount: 0
			};
			e.count++, t.grouping === "percentStacked" && e.percentCount++, g.set(t.valueAxis, e);
		}
		for (let n = t.seriesStart; n < t.seriesStart + t.seriesCount; n++) {
			let r = e.series[n];
			r && h.set(r, t);
		}
	}
	let _ = (e) => {
		if (!u(e)) return 1;
		let t = h.get(e);
		if (!t) return 100;
		let n = g.get(t.valueAxis);
		return n != null && n.count === n.percentCount ? 100 : 1;
	}, v = m ? t.filter((e) => e.useSecondaryAxis !== !0) : [...t], y = /* @__PURE__ */ new Map();
	for (let e of v) {
		let t = d(e), n = y.get(t);
		n ? n.push(e) : y.set(t, [e]);
	}
	let b = (e.plotGroups ?? []).filter((e) => e.seriesCount > 0 && e.valueAxis !== "secondary"), x = b.length > 0 ? b.every((e) => e.grouping === "percentStacked") : v.some(u), S = 0, C = 0, w = (e) => {
		Number.isFinite(e) && (S = Math.min(S, e), C = Math.max(C, e));
	};
	for (let e = 0; e < n; e++) for (let t of y.values()) {
		let n = t[0];
		if (!n) continue;
		let r = l(n), i = u(n), a = i && t.reduce((t, n) => t + Math.abs(n.values[e] ?? 0), 0) || 1, o = 0, s = 0;
		for (let n of t) {
			let t = n.values[e] ?? 0, c = i ? t / a * _(n) : t;
			r ? c < 0 ? s += c : o += c : w(c);
		}
		r && (w(s), w(o));
	}
	for (let t of e.series) if (!(p.has(t) || t.seriesType !== "line" && t.seriesType !== "area" || m && t.useSecondaryAxis === !0)) for (let e = 0; e < Math.min(t.values.length, n); e++) {
		let n = t.values[e];
		n != null && w(n);
	}
	x && (v.some((e) => e.values.some((e) => e != null && e > 0)) && (C = Math.max(C, 100)), v.some((e) => e.values.some((e) => e != null && e < 0)) && (S = Math.min(S, -100))), e.valMax != null && (C = x ? e.valMax * 100 : e.valMax), e.valMin != null && (S = x ? e.valMin * 100 : e.valMin), S === 0 && C === 0 && (C = 1);
	let T = Oo(e, S, C, void 0, x, i ? "horizontal" : "vertical"), E = (e, t) => {
		let n = e.values[t] ?? 0;
		if (!l(e)) return n;
		let r = f.get(d(e)) ?? [e], i = u(e), a = i && r.reduce((e, n) => e + Math.abs(n.values[t] ?? 0), 0) || 1, o = i ? n / a * _(e) : n, s = 0;
		for (let n = 0; n <= r.indexOf(e); n++) {
			let c = r[n]?.values[t] ?? 0, l = i ? c / a * _(e) : c;
			l < 0 == o < 0 && (s += l);
		}
		return s;
	}, D = m ? t.filter((e) => e.useSecondaryAxis === !0) : [], O = (e.plotGroups ?? []).filter((e) => e.seriesCount > 0 && e.valueAxis === "secondary"), k = O.length > 0 ? O.every((e) => e.grouping === "percentStacked") : D.some(u), A = e.series.map((e) => e.useSecondaryAxis === !0 ? p.has(e) ? {
		...e,
		values: e.values.map((t, n) => t == null ? t : E(e, n))
	} : k ? {
		...e,
		values: e.values.map((e) => e == null ? e : e * 100)
	} : e : e), j = e.secondaryValAxis && m ? Ko(e.secondaryValAxis, A, 1, i ? "x" : "y", k, D.length > 0) : null, ee = j ? e.secondaryCatAxis?.crossesAt != null && Number.isFinite(e.secondaryCatAxis.crossesAt) ? Math.max(j.min, Math.min(j.max, e.secondaryCatAxis.crossesAt)) : e.secondaryCatAxis?.crosses === "max" ? j.max : e.secondaryCatAxis?.crosses === "min" ? j.min : Math.max(j.min, Math.min(j.max, 0)) : 0, M = j?.makeToY(0, 1), N = bo(e), P = (e, t) => t ? N ? e : n - 1 - e : N ? n - 1 - e : e, F = (e) => r ? r.categoryBandFractions[e] ?? 0 : 1 / Math.max(1, n), I = (e, t) => r ? (r.positions[e] ?? NaN) - F(e) / 2 : P(e, t) / Math.max(1, n), te = t.map(() => /* @__PURE__ */ new Set());
	for (let r = 0; r < n; r++) {
		let n = /* @__PURE__ */ new Map(), i = /* @__PURE__ */ new Map();
		for (let a = 0; a < t.length; a++) {
			let o = t[a], c = f.get(d(o)) ?? [o], p = s(o), h = l(o), g = u(o), v = g && c.reduce((e, t) => e + Math.abs(t.values[r] ?? 0), 0) || 1, y = o.values[r] ?? 0, b = g ? y / v * _(o) : y, x = b < 0, S = d(o), C = n.get(S) ?? 0, w = i.get(S) ?? 0, E = Math.max(0, c.indexOf(o)), D = F(r), O = h ? 1 : Math.max(1, c.length), k = c[0]?.barGroupOverlap ?? e.barOverlap ?? 0, A = h || !Number.isFinite(k) ? 0 : Math.max(-100, Math.min(100, k)), j = Me(c[0]?.barGroupGapWidth ?? e.barGapWidth, "chartex"), N = D / (1 + (O - 1) * (1 - A / 100) + j / 100), P = h ? 0 : N * (1 - A / 100), ne = N + (O - 1) * P, re = I(r, p) + (D - ne) / 2 + (h ? 0 : E * P), ie = !p && m && o.useSecondaryAxis === !0, L = h ? x ? w : C : ie ? ee : 0, ae = h ? L + b : b, oe = ie && M ? M(L) : T.frac(L), R = ie && M ? M(ae) : T.frac(ae);
			ns({
				categoryStart: re,
				categoryEnd: re + N,
				valueStart: oe,
				valueEnd: R,
				clipCategory: !p
			}) && te[a].add(r), h && (x ? i.set(S, w + b) : n.set(S, C + b));
		}
	}
	return te;
}
function is(e, t, n, r) {
	return z(e, n) ? r : ra(t, n);
}
function as(e, t, n) {
	if (!n) return null;
	let r = t[0], i = r?.barGroupOverlap ?? e.barOverlap ?? 0, a = Number.isFinite(i) ? Math.max(-100, Math.min(100, i)) : 0, o = Me(r?.barGroupGapWidth ?? e.barGapWidth, "chartex");
	return {
		positions: n.positions,
		categoryBandFractions: n.categoryBandFractions,
		seriesCount: Math.max(1, t.length),
		overlapPct: a,
		gapWidthPct: o
	};
}
function os(e, t, n) {
	if (!e) return !0;
	let r = e.positions[n], i = e.categoryBandFractions[n];
	if (r == null || i == null) return !1;
	let a = 1 - e.overlapPct / 100, o = i / (1 + (e.seriesCount - 1) * a + e.gapWidthPct / 100), s = o * a, c = o + (e.seriesCount - 1) * s, l = r - i / 2 + (i - c) / 2 + t * s;
	return l + o > 0 && l < 1;
}
function ss(e, t) {
	return {
		name: e,
		values: [],
		color: null,
		trendLines: t?.trendLines
	};
}
function cs(e, t, n, r = []) {
	let i = ie(e, {
		chartType: "clusteredBar",
		categories: n,
		series: [...t, ...r]
	}), a = Ne(i).length, o = $o(i, t), s = Wo(i, Ne(i));
	return {
		kind: "columns",
		series: t,
		categoryCount: a,
		delegateChart: i,
		valueAxis: es(i, t, a),
		dateCategoryVisibility: as(i, t, o ? s : null),
		genericBodyVisibility: o ? null : rs(i, t, a, s),
		sharedGeometry: o
	};
}
function ls(e, t = (e) => e) {
	if (![
		"clusteredColumn",
		"histogram",
		"pareto"
	].includes(e.chartType)) return null;
	let n = () => cs(e, [], []);
	if (e.chartexSuppressGeometry) return n();
	if (e.chartType === "histogram") {
		let t = e.series[0];
		if (!t) return n();
		let r = Gi(t.values, e.chartexHistogramBinning ?? {}, t.valFormatCode, e.date1904 === !0);
		return r.kind === "tooManyInputPoints" ? r : cs(e, [{
			...t,
			categories: void 0,
			values: r.counts,
			valFormatCode: null
		}], r.categories);
	}
	let r = e.chartType === "pareto" ? e.series.filter((e) => e.seriesType !== "line") : e.series, i = 0;
	for (let e of r) if (i += e.values.length, i > 1e4) return { kind: "tooManyInputPoints" };
	let a = r.map((e, n) => t(e, n, r.length)), o = e.chartType === "pareto" || e.chartexParetoSortDescending ? a.map((t) => Ji(t, e.categories, {
		sortDescending: e.chartexParetoSortDescending ?? !0,
		keepUnvaluedCategories: !0
	})) : null, s = o ? o.map((e) => e.orderedSeries) : a, c = s[0]?.categories ?? e.categories;
	if (e.chartType === "pareto") {
		let t = o?.[e.chartexParetoOwnerIndex ?? 0], r = o?.[0];
		if (!t || !r || t.points.length === 0 || r.points.length === 0) return n();
		e.chartexParetoFlatEndpoint === !0 && r.categories.length === r.points.length && (c = [...c, ""]);
	}
	let l = e.chartType === "pareto" ? s : s.filter((e) => e.seriesType !== "line" && e.seriesType !== "scatter" && e.seriesType !== "area"), u = e.chartType === "clusteredColumn" ? s.filter((e) => e.seriesType === "line" || e.seriesType === "scatter" || e.seriesType === "area") : [], d = e.chartType === "pareto" && l[0] || e.chartexShowUnpairedPercentageAxis && l[0] ? [{
		...l[0],
		values: [],
		seriesType: "line",
		useSecondaryAxis: !0
	}] : [];
	return cs(e, l, c, [...u, ...d]);
}
function us(e, t) {
	for (let n = 0; n < e.series.length; n++) {
		let r = e.series[n], i = new Map((r.dataPointOverrides ?? []).map((e) => [e.idx, e]));
		for (let a = 0; a < Math.min(r.values.length, e.categoryCount); a++) {
			let o = r.values[a];
			if (o == null || !Number.isFinite(o) || o === 0) continue;
			if (e.sharedGeometry) {
				if (!os(e.dateCategoryVisibility, n, a) || !ts(e.valueAxis.frac(0), e.valueAxis.frac(o), 0, 1)) continue;
			} else if (e.genericBodyVisibility?.[n]?.has(a) !== !0) continue;
			let s = is(e.delegateChart, r, n, a);
			if (t(r, i.get(a), s, e.series.length) === !1) return;
		}
	}
}
function ds(e, t) {
	if (!e.delegateChart.showLegend || e.series.length === 0) return;
	let n = {
		...e.delegateChart,
		series: e.series.map((e) => ss(e.name, e))
	}, r = Wt(n, !0), i = Kt(n);
	for (let n = 0; n < e.series.length; n++) {
		if (!qt(r, i, n)) continue;
		let a = e.series[n];
		if (t(a, void 0, ra(a, n), e.series.length) === !1) return;
	}
}
var fs = new Set([
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
	"stackedBarHPct",
	"surface",
	"surface3D"
]);
function ps(e) {
	return JSON.stringify([
		e.imagePath,
		e.svgImagePath ?? null,
		e.duotone?.clr1 ?? null,
		e.duotone?.clr2 ?? null,
		e.blipEffects?.length ? [e.blipEffects, Cs(e)] : null
	]);
}
var ms = new Set([
	"blur",
	"softEdge",
	"glow",
	"shadow",
	"presetShadow",
	"reflection",
	"transform",
	"alphaOutset"
]);
function hs(e, t = 0) {
	if (t > 64) return !0;
	for (let n of e) {
		let e = n?.type;
		if (typeof e != "string") continue;
		if (ms.has(e) || (e === "fill" || e === "fillOverlay") && n.fill?.fillType === "image") return !0;
		let r = n.container;
		if (r?.effects && hs(r.effects, t + 1) || n.containers?.some((e) => e?.effects && hs(e.effects, t + 1))) return !0;
	}
	return !1;
}
function gs(e) {
	return !e.tile && !!e.blipEffects?.length && hs(e.blipEffects);
}
function _s(e, t, n) {
	if (!gs(e)) return;
	let r = Ln(t, n, e.srcRect, e.fillRect), i = (e) => Number(e.toPrecision(6));
	return [r.width, r.height].every(Number.isFinite) || q(), {
		widthPt: i(r.width),
		heightPt: i(r.height)
	};
}
function vs(e, t, n) {
	let r = Ts(e, t);
	return n ? JSON.stringify([
		r,
		n.widthPt,
		n.heightPt
	]) : r;
}
function ys(e, t, n = !0) {
	return (r, i) => {
		if (!gs(r)) return e.get(vs(r, t));
		if (i) {
			let a = e.get(vs(r, t, i));
			if (a !== void 0) return a;
			if (!n) return;
		}
		let o = `[${JSON.stringify(Ts(r, t))},`, s = !1;
		for (let [t, n] of e) {
			if (!t.startsWith(o)) continue;
			if (s = !0, !i) {
				if (n) return n;
				continue;
			}
			let [, e, r] = JSON.parse(t), a = (e, t) => Math.abs(e - t) <= Math.max(.01, .01 * Math.max(e, t));
			if (a(e, i.widthPt) && a(r, i.heightPt)) return n;
		}
		if (n && s && i) throw new a("unsupported-image-effect", "Chart picture occurrence was not prepared");
	};
}
var bs = /* @__PURE__ */ new WeakSet();
function xs(e) {
	bs.add(e);
}
function Ss(e) {
	return bs.has(e);
}
function Cs(e) {
	return e.dpi != null && e.dpi > 0 ? e.dpi : 96;
}
function ws(e, t, n) {
	if (!e.blipEffects?.length) return e.duotone ?? null;
	let r = {
		hostRotation: e.rotWithShape === !1 ? 0 : t?.rotation ?? 0,
		hostFlipH: t?.flipH ?? !1,
		hostFlipV: t?.flipV ?? !1
	};
	if (n) return {
		effects: e.blipEffects,
		duotone: e.duotone ?? null,
		...r
	};
	let i = 914400 / Cs(e);
	return {
		effects: e.blipEffects,
		duotone: e.duotone ?? null,
		emuPerPixelX: i,
		emuPerPixelY: i,
		...r
	};
}
function Ts(e, t) {
	return e.blipEffects?.length ? JSON.stringify([
		ps(e),
		e.rotWithShape === !1 ? 0 : t?.rotation ?? 0,
		t?.flipH ?? !1,
		t?.flipV ?? !1
	]) : ps(e);
}
var Es;
function Ds(e, t) {
	let n = Es;
	Es = e;
	try {
		return Fr(Ws, t);
	} finally {
		Es = n;
	}
}
function Os(e, t, n, r, i) {
	let a = e;
	return {
		x: a.endsWith("r") || a === "r" ? t - r : a === "t" || a === "ctr" || a === "b" ? (t - r) / 2 : 0,
		y: a.startsWith("b") || a === "b" ? n - i : a === "l" || a === "ctr" || a === "r" ? (n - i) / 2 : 0
	};
}
var ks = new Set([
	"tl",
	"t",
	"tr",
	"l",
	"ctr",
	"r",
	"bl",
	"b",
	"br"
]), As = new Set([
	"none",
	"x",
	"y",
	"xy"
]);
function js(e) {
	for (let t of [e.srcRect, e.fillRect]) t && ![
		t.l ?? 0,
		t.t ?? 0,
		t.r ?? 0,
		t.b ?? 0
	].every(Number.isFinite) && q();
	return e.tile != null != (e.stretch === !0) && Dn(e.srcRect);
}
function Ms(e) {
	let t = e.tile;
	if (!t) return null;
	let { algn: n, tx: r, ty: i, sx: a, sy: o } = t, s = t.flip ?? "none", c = e.dpi;
	return (!n || !ks.has(n) || !As.has(s) || !Number.isFinite(r) || !Number.isFinite(i) || !(c != null && Number.isFinite(c) && c > 0) || !(Number.isFinite(a) && a > 0) || !(Number.isFinite(o) && o > 0)) && q(), {
		alignment: n,
		tx: r,
		ty: i,
		sx: a,
		sy: o,
		dpi: c,
		flipX: s === "x" || s === "xy",
		flipY: s === "y" || s === "xy"
	};
}
function Ns(e, t) {
	return !js(e) || !f(e) ? null : Es?.(e, t) ?? null;
}
function Ps(e, t, n = c) {
	let r = Ms(e);
	if (!r) return null;
	let i = Cn(t), a = i ? {
		w: i.width,
		h: i.height
	} : On(t);
	(!(Number.isFinite(a.w) && a.w > 0) || !(Number.isFinite(a.h) && a.h > 0)) && q();
	let s = 96 / r.dpi * (n / c), l = a.w * r.sx * s, u = a.h * r.sy * s;
	return [l, u].every((e) => Number.isFinite(e) && e > 0) || q(), {
		alignment: r.alignment,
		tileW: l,
		tileH: u,
		offsetX: r.tx / o * n,
		offsetY: r.ty / o * n,
		flipX: r.flipX,
		flipY: r.flipY
	};
}
function Fs(e, t, n) {
	let r = Os(e.alignment, t, n, e.tileW, e.tileH);
	return {
		x: Li(r.x + e.offsetX, e.tileW, t, e.flipX),
		y: Li(r.y + e.offsetY, e.tileH, n, e.flipY)
	};
}
function Is(e, t, n, r, i) {
	let a = Ps(e, t, i);
	if (!a) return null;
	let { tileW: o, tileH: s } = a, c = En(t, e.srcRect != null), l = Math.ceil(n / o) + 2 + 2 * c.x, u = Math.ceil(r / s) + 2 + 2 * c.y, d = l * u;
	return Number.isSafeInteger(d) || q(), {
		...a,
		columns: l,
		rows: u,
		repetitions: d,
		padX: c.x,
		padY: c.y
	};
}
function Ls(e, t, n, r, i = c) {
	if ((![
		n,
		r,
		i
	].every(Number.isFinite) || n < 0 || r < 0) && q(), !(n > 0) || !(r > 0) || !js(e) || !f(e)) return 0;
	let a = (t ?? Es)?.(e);
	if (!a) return 0;
	if (!e.tile) return 1;
	let o = Is(e, a, n, r, i);
	return o ? Math.min(o.repetitions, Yr) : 0;
}
function $(e) {
	return Number.isFinite(e) && e > 0;
}
function Rs(e, t) {
	(!$(t.widthPt) || !$(t.heightPt) || !$(e.metafileWidthFactor) || !$(e.metafileHeightFactor) || !Number.isFinite(e.targetWidthFactor) || e.targetWidthFactor < 0 || !Number.isFinite(e.targetHeightFactor) || e.targetHeightFactor < 0) && q();
	let n = t.widthPt * e.metafileWidthFactor, r = t.heightPt * e.metafileHeightFactor;
	(!$(n) || !$(r)) && q();
	let i = t.targetWidthPx, a = t.targetHeightPx;
	if (i != null != (a != null) && q(), i == null || a == null) return {
		widthPt: n,
		heightPt: r
	};
	(!$(i) || !$(a)) && q();
	let o = i * e.targetWidthFactor, s = a * e.targetHeightFactor;
	(!Number.isFinite(o) || o < 0 || e.targetWidthFactor > 0 && o === 0 || !Number.isFinite(s) || s < 0 || e.targetHeightFactor > 0 && s === 0) && q();
	let c = Math.ceil(o), l = Math.ceil(s);
	return (!Number.isFinite(c) || !Number.isFinite(l)) && q(), {
		widthPt: n,
		heightPt: r,
		targetWidthPx: c,
		targetHeightPx: l
	};
}
function zs(e) {
	if (!js(e) || !f(e)) return null;
	let t = e.srcRect ? 1 - e.srcRect.l - e.srcRect.r : 1, n = e.srcRect ? 1 - e.srcRect.t - e.srcRect.b : 1;
	(!(Number.isFinite(t) && t > 0) || !(Number.isFinite(n) && n > 0)) && q();
	let r = e.srcRect != null;
	if (e.tile) {
		Ms(e) || q();
		let i = 1 / t, a = 1 / n;
		return (!$(i) || !$(a)) && q(), {
			preserveNaturalSize: !0,
			hasSourceCrop: r,
			targetWidthFactor: 0,
			targetHeightFactor: 0,
			metafileWidthFactor: i,
			metafileHeightFactor: a
		};
	}
	let i = e.fillRect, a = i?.l ?? 0, o = i?.t ?? 0, s = i?.r ?? 0, c = i?.b ?? 0;
	[
		a,
		o,
		s,
		c
	].every(Number.isFinite) || q();
	let l = 1 - a - s, u = 1 - o - c;
	(!$(l) || !$(u)) && q();
	let d = l / t, p = u / n;
	return (!$(d) || !$(p)) && q(), {
		preserveNaturalSize: !1,
		hasSourceCrop: r,
		targetWidthFactor: d,
		targetHeightFactor: p,
		metafileWidthFactor: d,
		metafileHeightFactor: p
	};
}
function Bs(e, t) {
	return {
		fill: e.fill,
		preserveNaturalSize: e.preserveNaturalSize || t.preserveNaturalSize,
		hasSourceCrop: e.hasSourceCrop || t.hasSourceCrop,
		targetWidthFactor: Math.max(e.targetWidthFactor, t.targetWidthFactor),
		targetHeightFactor: Math.max(e.targetHeightFactor, t.targetHeightFactor),
		metafileWidthFactor: Math.max(e.metafileWidthFactor, t.metafileWidthFactor),
		metafileHeightFactor: Math.max(e.metafileHeightFactor, t.metafileHeightFactor)
	};
}
function Vs(e, t) {
	let n = ii(e);
	n > 1e4 && xn(n, Kr), e = Fi(e), e = oe(e);
	let r = /* @__PURE__ */ new Map(), i = !1, a = (e) => {
		if (i || !e || typeof e != "object" || e.fillType !== "image") return;
		let n = e, a = zs(n);
		if (!a) return;
		let o = ps(n), s = {
			fill: n,
			...a
		};
		if (t && !t(s)) {
			i = !0;
			return;
		}
		let c = r.get(o);
		if (c) {
			r.set(o, Bs(c, s));
			return;
		}
		r.size >= 256 && xn(r.size + 1, 256), r.set(o, s);
	}, o = (e, t) => {
		let n = H(e, t);
		return n?.fillType === "image" || n == null ? n : null;
	}, s = (e, t, n) => {
		let r = W(e, t, n);
		return r?.fillType === "image" || r == null ? r : null;
	}, c = (e, t, n, r) => {
		let i = H(e, r);
		if (i !== void 0) return i?.fillType === "image" ? i : null;
		if (t) return null;
		let a = H(n, r);
		return a?.fillType === "image" || a == null ? a : null;
	}, l = (t, n, r) => {
		let i = _e(e, n, t, r);
		return i?.fillType === "image" || i == null ? i : null;
	}, u = (e, t, n, r, i, a, o) => {
		if (n === !0) {
			let e = G(a);
			if (e !== void 0) return e;
		}
		if (e?.fillType === "image") return e;
		if (e != null || t != null || r === !0 && n !== !0) return null;
		if (i?.fillNoStyle === !0) return;
		let s = K(i, a, 0, o);
		return s?.fillType === "image" || s == null ? s : null;
	}, d = u(e.chartFill, void 0, e.chartFillHidden, e.chartFillPaintAuthored, e.chartStyleRoles?.chartArea, R(e, "chartArea"), e.chartAreaStyle);
	d && a(d);
	let f = u(e.plotAreaFill, e.plotAreaBg, e.plotAreaFillHidden, e.plotAreaFillPaintAuthored, e.threeD ? e.chartStyleRoles?.plotArea3D : e.chartStyleRoles?.plotArea, R(e, e.threeD ? "plotArea3D" : "plotArea"), e.plotAreaStyle);
	f && a(f), e.showLegend && a(xi(e));
	let p = (e, t, n, r = 0) => {
		a(Lr(e, t, n, !0, 0, r)?.fillPaint);
	};
	e.title && p(e.titleStyle ? { style: e.titleStyle } : void 0, e.chartStyleRoles?.title, R(e, "title")), e.catAxisTitle && p(e.catAxisTitleStyle ? { style: e.catAxisTitleStyle } : void 0, e.chartStyleRoles?.axisTitle, R(e, "axisTitle")), e.valAxisTitle && p(e.valAxisTitleStyle ? { style: e.valAxisTitleStyle } : void 0, e.chartStyleRoles?.axisTitle, R(e, "axisTitle"));
	for (let t of [e.secondaryValAxis, e.secondaryCatAxis]) t?.title && p(t.titleStyle ? { style: t.titleStyle } : void 0, e.chartStyleRoles?.axisTitle, R(e, "axisTitle")), t?.displayUnits?.label && p(t.displayUnits.label.boxStyle, e.chartStyleRoles?.axisTitle, R(e, "axisTitle"));
	e.threeD?.seriesAxis?.title && p(e.threeD.seriesAxis.titleStyle ? { style: e.threeD.seriesAxis.titleStyle } : void 0, e.chartStyleRoles?.axisTitle, R(e, "axisTitle"));
	for (let t of [e.valAxisDisplayUnits, e.catAxisDisplayUnits]) t?.label && p(t.label.boxStyle, e.chartStyleRoles?.axisTitle, R(e, "axisTitle"));
	let m = e.series.some((e) => e.values.some((e) => e != null && Number.isFinite(e))), h = Math.max(e.categories.length, ...e.series.map((e) => e.categories?.length ?? e.values.length)), g = e.chartType === "surface" || e.chartType === "surface3D" ? e.series.length >= 2 && h >= 2 && m : m;
	if (e.threeD && fs.has(e.chartType) && g) {
		let t = e.valMin != null && Number.isFinite(e.valMin) && e.valMax != null && Number.isFinite(e.valMax) ? e.valMax - e.valMin : void 0;
		for (let [n, r] of [
			["floor", "floor"],
			["sideWall", "wall"],
			["backWall", "wall"]
		]) {
			let i = e.threeD[n], o = we(e, i, r).fill;
			o?.fillType === "image" && pi(o, i, n, t) && a(o);
		}
	}
	let _ = _n(e), v = (t, n) => {
		let r = Ce(e, t, n);
		return r?.fillType === "image" || r == null ? r : null;
	}, y = (e, t, n) => {
		if (!e || !t) return;
		let r = !1, i = !1, o = Math.max(e.values.length, t.values.length);
		for (let n = 0; n < o && !(r && i); n++) {
			let a = e.values[n], o = t.values[n];
			a == null || o == null || !Number.isFinite(a) || !Number.isFinite(o) || a === o || (o > a ? r = !0 : i = !0);
		}
		r && a(v(n.up, "upBar")), i && a(v(n.down, "downBar"));
	};
	for (let t of e.lineGroupDecorations ?? []) {
		if (!t.upDownBars) continue;
		let n = e.series.filter((e) => e.lineGroupIndex === t.groupIndex);
		n.length === 0 && t.groupIndex === 0 && [
			"line",
			"stackedLine",
			"stackedLinePct"
		].includes(e.chartType) && (n = e.series.filter((e) => e.seriesType == null || e.seriesType === "line")), y(n[0], n.at(-1), t.upDownBars);
	}
	if (e.stockUpDownBars) {
		let t = e.plotGroups?.find((e) => e.kind === "stock"), n = t ? e.series.slice(t.seriesStart, t.seriesStart + t.seriesCount) : e.series;
		y(n[0], n.at(-1), e.stockUpDownBarStyle ?? {
			gapWidthPercent: 150,
			up: {},
			down: {}
		});
	}
	let b = e.series.some((t, n) => {
		let r = _[n];
		return (r?.kind === "bubble" || r?.kind === "scatter" ? "scatter" : t.seriesType ?? (e.chartType === "bubble" ? "scatter" : e.chartType)) === "scatter" && (t.categories ?? e.categories).some((e) => Number.isFinite(Number.parseFloat(e)));
	}), x = Kt(e), S = Wt(e, !0), C = e.categories.length > 0 || (e.series[0]?.categories?.length ?? 0) > 0 || e.series.some((e) => e.values.length > 0);
	for (let t = 0; t < e.series.length; t++) {
		let n = e.series[t], r = n.chartexFormatIdx ?? t, i = z(e, t), c = B(e, "dataPointMarker", t), l = _[t], u = l?.kind === "bubble" || l == null && e.chartType === "bubble", d = l?.kind === "bubble" || l?.kind === "scatter" ? "scatter" : n.seriesType ?? (e.chartType === "bubble" ? "scatter" : e.chartType), f = vn(e.chartType, l), m = l?.scatterStyle ?? e.scatterStyle, h = l?.radarStyle ?? e.radarStyle, g = {
			chartType: f,
			bubbleScale: l?.bubbleScale ?? e.bubbleScale,
			showNegativeBubbles: l?.showNegativeBubbles ?? e.showNegativeBubbles
		}, v = d === "line" || d === "stackedLine" || d === "stackedLinePct" || d === "area" || d === "stackedArea" || d === "stackedAreaPct" || d === "scatter" || d === "radar" || d === "stock", y = d === "area" || d === "stackedArea" || d === "stackedAreaPct", w = y ? (n.showMarker === !0 || Yt(n)) && n.markerSymbol !== "none" : d === "stock" ? n.markerSymbol != null && n.markerSymbol !== "none" : n.showMarker !== !1 && n.markerSymbol !== "none", T = Jt(S, x, t), E = Math.max(n.values.length, n.categories?.length ?? 0, e.categories.length), D = new Map((n.dataLabelOverrides ?? []).map((e) => [e.idx, e]));
		for (let i = 0; i < E; i++) {
			let a = D.get(i);
			if (Mt(n.seriesDataLabels, a) || !(a?.text || (a?.showVal ?? n.seriesDataLabels?.showVal ?? e.showDataLabels) || (a?.showCatName ?? n.seriesDataLabels?.showCatName) || (a?.showSerName ?? n.seriesDataLabels?.showSerName) || (a?.showPercent ?? n.seriesDataLabels?.showPercent) || (a?.showBubbleSize ?? n.seriesDataLabels?.showBubbleSize) || (a?.showLegendKey ?? n.seriesDataLabels?.showLegendKey)) || !tn(e, n, d, i, b, t)) continue;
			let o = zr(a?.labelBox, n.seriesDataLabels?.labelBox), s = Rr(o);
			p(o, s ? e.chartStyleRoles?.dataLabelCallout ?? e.chartStyleRoles?.dataLabel : e.chartStyleRoles?.dataLabel, s ? R(e, "dataLabelCallout") ?? R(e, "dataLabel") : R(e, "dataLabel"), a ? i : r);
		}
		for (let t of n.trendLines ?? []) (t.dispEq === !0 || t.dispRSqr === !0 || t.labelText || t.labelRichRuns?.some((e) => e.text.length > 0) === !0) && p(t.labelBox, e.chartStyleRoles?.trendlineLabel, R(e, "trendlineLabel"), r);
		let O = nn(e, n, d, E, b, g, t) > 0, k = new Map((n.dataLabelOverrides ?? []).map((e) => [e.idx, e])), A = (r) => {
			let i = k.get(r);
			return !Mt(n.seriesDataLabels, i) && (i?.showLegendKey ?? n.seriesDataLabels?.showLegendKey ?? !1) === !0 && tn(e, n, d, r, b, t);
		}, j = S[t]?.pointDriven === !0, ee = !j && sn(f, m, n, h) && (e.showLegend && T || e.dataTable?.showKeys === !0 && rn(e.chartType) && C || O), M = n.markerSymbol ?? (d === "stock" ? "none" : "circle"), N = l?.kind === "bar3D" || l?.kind === "pie3D" || l?.kind === "area3D" || l?.kind === "line3D" || l?.kind === "surface3D", P = L(e) && (e.chartType === "clusteredColumn" || e.chartType === "histogram" || e.chartType === "pareto") && (l?.kind === "bar" || d === "bar" || d === "clusteredBar" || d === "clusteredBarH" || d === "stackedBar" || d === "stackedBarH" || d === "stackedBarPct" || d === "stackedBarHPct");
		if (!N && (l?.kind === "bar" || d === "bar" || d === "clusteredBar" || d === "clusteredBarH" || d === "stackedBar" || d === "stackedBarH" || d === "stackedBarPct" || d === "stackedBarHPct" || d === "pie" || d === "doughnut" || d === "ofPie" || y || d === "radar" && h === "filled")) {
			let o = new Map((n.dataPointOverrides ?? []).map((e) => [e.idx, e])), s = y ? n.values.length > 0 : d === "radar" ? E > 2 && Array.from({ length: E }, (e, t) => n.values[t] != null && Number.isFinite(n.values[t])).every(Boolean) : n.values.some((e) => e != null && Number.isFinite(e) && e !== 0), c = !P && e.showLegend && T || e.dataTable?.showKeys === !0 && rn(e.chartType) && C || O, l = i || d === "pie" || d === "doughnut" || d === "ofPie";
			if (s || c) if (y || d === "radar" && !i) {
				let t = Ee(e, n, void 0, r);
				t?.fillType === "image" && a(t);
			} else if (d === "radar") {
				let t = o.get(0), r = Ee(e, n, t, 0, 0);
				r?.fillType === "image" && a(r);
			} else {
				if (c && !l) {
					let t = Ee(e, n, void 0, r);
					t?.fillType === "image" && a(t);
				}
				for (let s = 0; s < E; s++) {
					let c = n.values[s], u = !P && c != null && Number.isFinite(c) && c !== 0, d = l && (!P && e.showLegend && qt(S, x, t, s) || e.dataTable?.showKeys === !0 && rn(e.chartType) && C && s === 0 || A(s));
					if (!u && !d) continue;
					let f = o.get(s), p = Ee(e, n, f, i ? s : r, s);
					p?.fillType === "image" && a(p);
				}
			}
		}
		if (!v || on(d, f, m, h)) continue;
		if (ee && $t(M)) {
			if (u) {
				let i = R(e, "dataPoint"), c = s(n.chartexStyle, i, r);
				if (c && a(c), c === void 0 && n.color == null) {
					let n = o(B(e, "dataPoint", t), r);
					n && a(n);
				}
			} else a(n.markerFillPaint);
			if (!u && n.markerFillPaint === void 0 && n.markerFill == null && !(n.markerFillPaintAuthored === !0 && n.markerStyle?.fillHidden !== !0) && !i) {
				let t = K(c, R(e, "dataPointMarker"), r, n.markerStyle);
				t?.fillType === "image" && a(t);
			}
		}
		if (!w && !an(n)) continue;
		let F = new Map((n.dataPointOverrides ?? []).map((e) => [e.idx, e]));
		for (let f = 0; f < E; f++) {
			let p = en(e, n, d, f, b, g) && (!u || (l?.bubbleScale ?? e.bubbleScale ?? 100) > 0 && Zt({ showNegativeBubbles: l?.showNegativeBubbles ?? e.showNegativeBubbles }, n.bubbleSizes?.[f]) != null), m = j && e.showLegend && qt(S, x, t, f), h = j && e.dataTable?.showKeys === !0 && rn(e.chartType) && C && f === 0, _ = j && A(f);
			if (!p && !m && !h && !_) continue;
			let v = F.get(f);
			if (!$t(cn(n, v, "circle", w))) continue;
			if (u) {
				if ((n.bubbleSizes?.[f] ?? 0) < 0) continue;
				let i = B(e, "dataPoint", t), c = z(e, t) ? f : r, l = R(e, "dataPoint"), u = W(v?.chartexStyle, l, f), d = u?.fillType === "image" || u == null ? u : null;
				d && a(d);
				let p = v?.fillHidden === !0 ? G(l) : void 0;
				if (d !== void 0 || p !== void 0 || v?.color != null || n.dataPointColors?.[f] != null) continue;
				let m = s(n.chartexStyle, l, r);
				if (m && a(m), m !== void 0 || n.color != null) continue;
				let h = o(i, c);
				h && a(h);
				continue;
			}
			let y = ln(n, v, f);
			if (a(y), y === void 0 && v?.markerFill == null && v?.color == null && n.dataPointColors?.[f] == null && n.markerFill == null && !(v?.markerFillPaintAuthored === !0 && v.markerStyle?.fillHidden !== !0) && !(n.markerFillPaintAuthored === !0 && n.markerStyle?.fillHidden !== !0)) {
				let t = v?.markerStyle?.shapePropertiesPresent === !0 ? v.markerStyle : n.markerStyle, o = K(c, R(e, "dataPointMarker"), i ? f : r, t);
				o?.fillType === "image" && a(o);
			}
		}
	}
	for (let t = 0; t < (e.chartexBox?.series.length ?? 0); t++) {
		let n = e.chartexBox.series[t];
		if (!$t(e.chartStyleMarkerSymbol ?? e.chartexMarkerSymbol ?? "circle") || !(n.showNonoutliers || n.showOutliers)) continue;
		let r = 0;
		for (let e of n.valuesByCategory) {
			let t = Un(e, n.quartileMethod);
			t && (r += Gn(t, n.showNonoutliers, n.showOutliers));
		}
		if (r === 0) continue;
		let i = n.chartexFormatIdx ?? t, c = n.chartexStyle, l = e.chartexDataPointMarkerStyle ?? e.chartexDataPointStyle ?? void 0, u = s(c, e.chartexDataPointMarkerStyle == null ? R(e, "dataPoint") ?? (e.classicChartStyleRoles == null ? l : void 0) : R(e, "dataPointMarker") ?? (e.classicChartStyleRoles == null ? l : void 0), i);
		if (u && a(u), u !== void 0 || n.color != null) continue;
		let d = o(l, i);
		d && a(d);
	}
	let w = ls(e, (t, n) => n !== 0 || !e.chartexParetoOutlineOwner ? t : {
		...t,
		chartexStyle: {
			...t.chartexStyle,
			fillHidden: !0,
			fillPaintAuthored: !0
		}
	});
	if (w?.kind === "columns" && (us(w, (e, t, n) => {
		a(l(t, e, n));
	}), ds(w, (e, t, n) => {
		a(l(t, e, n));
	})), e.chartType === "waterfall") {
		let t = e.series[0], n = new Map((t?.dataPointOverrides ?? []).map((e) => [e.idx, e])), r = Gr(t?.values ?? [], e.categories.length, e.subtotalIndices);
		if (!r.cumulativeOverflow && r.rawMax > r.rawMin) for (let e = 0; e < r.bars.length; e++) {
			let i = r.bars[e];
			i.paintSlot && a(l(n.get(e), t, i.semanticIndex));
		}
	} else if (e.chartType === "funnel") {
		let t = e.series[0], n = t?.values ?? [];
		if (n.some((e) => e != null && e > 0)) {
			let r = new Map((t?.dataPointOverrides ?? []).map((e) => [e.idx, e])), i = Math.max(n.length, e.categories.length);
			for (let e = 0; e < i; e++) (n[e] ?? 0) > 0 && a(l(r.get(e), t, 0));
		}
	}
	for (let t = 0; t < (e.chartexBox?.series.length ?? 0); t++) {
		let n = e.chartexBox.series[t];
		n.valuesByCategory.some((e) => Un(e, n.quartileMethod) != null) && a(c(n.chartexStyle, n.color, e.chartexDataPointStyle, n.chartexFormatIdx ?? t));
	}
	let T = e.series[0], E = new Map((T?.dataPointOverrides ?? []).map((e) => [e.idx, e]));
	return Ur(e, ({ node: e, paintsBody: t }) => {
		t && a(l(E.get(e.labelIndex), T, e.branchIndex));
	}), Wr(e, ({ label: t, linkedStyleIndex: n }) => {
		let r = t.labelBox, i = Rr(r), o = i ? e.chartStyleRoles?.dataLabelCallout ?? e.chartStyleRoles?.dataLabel : e.chartStyleRoles?.dataLabel, s = Lr(r, o, i ? R(e, "dataLabelCallout") ?? R(e, "dataLabel") : R(e, "dataLabel"), o != null, 0, n);
		s?.fillPaint?.fillType === "image" && a(s.fillPaint);
	}), {
		usages: i ? [] : [...r.values()],
		usageRejected: i
	};
}
function Hs(e) {
	return O(() => se(() => Vs(e).usages));
}
function Us(e, t) {
	return O(() => se(() => {
		let n = /* @__PURE__ */ new Map();
		for (let r = 0; r < e.length; r++) {
			let i = e[r], a = Vs(i, t ? (e) => t(e, r) : void 0);
			if (!a.usageRejected) for (let e of a.usages) {
				let t = ps(e.fill), r = n.get(t);
				if (r) {
					n.set(t, Bs(r, e));
					continue;
				}
				n.size >= 256 && xn(n.size + 1, 256), n.set(t, e);
			}
		}
		return [...n.values()];
	}));
}
function Ws(e, t, n, r, i, a, o = c, s = 0) {
	if ((![
		n,
		r,
		i,
		a,
		o,
		s
	].every(Number.isFinite) || i < 0 || a < 0) && q(), !js(t) || !f(t) || !(i > 0) || !(a > 0)) return !1;
	let l = Es?.(t, _s(t, i / o, a / o));
	if (!l || s !== 0 && t.rotWithShape == null) return !1;
	e.save();
	try {
		if (e.beginPath(), e.rect(n, r, i, a), e.clip(), t.rotWithShape === !1 && s !== 0 && (e.translate(n + i / 2, r + a / 2), e.rotate(-s * Math.PI / 180), e.translate(-(n + i / 2), -(r + a / 2))), t.alpha != null && (e.globalAlpha *= Math.max(0, Math.min(1, t.alpha))), !t.tile) {
			let o = t.fillRect, s = n + (o?.l ?? 0) * i, c = r + (o?.t ?? 0) * a, u = (1 - (o?.l ?? 0) - (o?.r ?? 0)) * i, d = (1 - (o?.t ?? 0) - (o?.b ?? 0)) * a;
			return [
				s,
				c,
				u,
				d
			].every(Number.isFinite) || q(), u > 0 && d > 0 && Pn(e, l, t.srcRect, s, c, u, d), u > 0 && d > 0;
		}
		let c = Is(t, l, i, a, o);
		c || q(), xn(c.repetitions, Yr);
		let { tileW: u, tileH: d, flipX: f, flipY: p, columns: m, rows: h } = c, g = Fs(c, i, a), _ = n + g.x, v = r + g.y, y = Math.floor((n - _) / u) - 1 - c.padX, b = Math.floor((r - v) / d) - 1 - c.padY;
		[
			y,
			b,
			y + m,
			b + h
		].every(Number.isSafeInteger) || xn(2 ** 53 - 1, Yr);
		for (let n = 0; n < h; n++) {
			let r = b + n;
			for (let n = 0; n < m; n++) {
				let i = y + n, a = _ + i * u, o = v + r * d, s = f && Math.abs(i) % 2 == 1, c = p && Math.abs(r) % 2 == 1;
				e.save(), e.translate(a + (s ? u : 0), o + (c ? d : 0)), e.scale(s ? -1 : 1, c ? -1 : 1), Pn(e, l, t.srcRect, 0, 0, u, d), e.restore();
			}
		}
		return !0;
	} finally {
		e.restore();
	}
}
function Gs(e, t, r, i, a, s, c, l = 0) {
	Dr(e, t.plotAreaStyle, t.threeD ? t.chartStyleRoles?.plotArea3D : t.chartStyleRoles?.plotArea, 0, {
		x: r,
		y: i,
		w: a,
		h: s
	}, c, (e) => {
		if (t.plotAreaFillHidden !== !0) if (t.plotAreaFill?.fillType === "image") Ws(e, t.plotAreaFill, r, i, a, s, c, l);
		else {
			let n = t.plotAreaFill ? d(t.plotAreaFill, e, r, i, a, s, l) : t.plotAreaBg ? `#${t.plotAreaBg}` : null;
			n && (e.fillStyle = n, e.fillRect(r, i, a, s));
		}
		if (t.plotAreaLineHidden === !0 || !t.plotAreaLineFill && !t.plotAreaLineColor) return;
		let u = t.plotAreaLineWidthEmu ? Math.max(.5, t.plotAreaLineWidthEmu / o) * c : 1;
		e.save();
		let f = t.plotAreaLineFill ? d(t.plotAreaLineFill, e, r, i, a, s, l) : t.plotAreaLineColor ? `#${t.plotAreaLineColor}` : null;
		f && (e.strokeStyle = f, e.setLineDash(n(t.plotAreaLineCustomDash, t.plotAreaLineDash, u)), e.lineCap = t.plotAreaLineCap === "rnd" ? "round" : t.plotAreaLineCap === "sq" ? "square" : "butt", e.lineJoin = t.plotAreaLineJoin === "round" || t.plotAreaLineJoin === "bevel" ? t.plotAreaLineJoin : "miter", bi(e, r, i, a, s, u, t.plotAreaLineCompound)), e.restore();
	});
}
export { xo as $, O as $i, Ln as $n, ht as $r, hi as $t, Wo as A, ge as Ai, mr as An, Kt as Ar, ia as At, co as B, Se as Bi, Gn as Bn, Nt as Br, ra as Bt, ss as C, De as Ci, Ar as Cn, Xt as Cr, ka as Ct, $o as D, Me as Di, Y as Dn, dn as Dr, Z as Dt, is as E, Ne as Ei, Mr as En, fn as Er, Ca as Et, Go as F, be as Fi, $n as Fn, Jt as Fr, va as Ft, Mo as G, ie as Gi, An as Gn, jt as Gr, Ji as Gt, go as H, we as Hi, Wn as Hn, Lt as Hr, na as Ht, Qo as I, G as Ii, ar as In, Bt as Ir, Xi as It, ao as J, A as Ji, On as Jn, st as Jr, Ni as Jt, _o as K, L as Ki, jn as Kn, Et as Kr, Gi as Kt, Zo as L, xe as Li, Yn as Ln, Pt as Lr, Yi as Lt, Xo as M, Ce as Mi, sr as Mn, qt as Mr, ya as Mt, Jo as N, fe as Ni, ur as Nn, Wt as Nr, aa as Nt, as as O, Ee as Oi, Dr as On, Zt as Or, sa as Ot, qo as P, W as Pi, lr as Pn, Vt as Pr, ha as Pt, Fo as Q, R as Qi, Dn as Qn, it as Qr, _i as Qt, ko as R, K as Ri, Jn as Rn, Ft as Rr, ta as Rt, us as S, je as Si, Nr as Sn, on as Sr, Ta as St, os as T, Oe as Ti, jr as Tn, sn as Tr, xa as Tt, vo as U, se as Ui, Kn as Un, Rt as Ur, ea as Ut, bo as V, U as Vi, qn as Vn, zt as Vr, Qi as Vt, Po as W, B as Wi, Un as Wn, At as Wr, $i as Wt, ho as X, M as Xi, In as Xn, lt as Xr, bi as Xt, Ro as Y, z as Yi, Mn as Yn, rt as Yr, Si as Yt, Do as Z, I as Zi, Fn as Zn, ct as Zr, mi as Zt, xs as _, Ge as _i, Hr as _n, an as _r, Ea as _t, ps as a, bt as ai, li as an, xn as ar, yo as at, ls as b, Fe as bi, zr as bn, pn as br, ja as bt, ws as c, St as ci, Jr as cn, yn as cr, Ao as ct, Rs as d, at as di, ai as dn, Qt as dr, Pa as dt, oe as ea, gt as ei, gi as en, Nn as er, To as et, Ps as f, vt as fi, ri as fn, rn as fr, Ia as ft, Ss as g, Re as gi, Wr as gn, cn as gr, Ya as gt, Us as h, ze as hi, Ur as hn, nn as hr, Fa as ht, Ts as i, et as ii, si as in, wn as ir, lo as it, Ko as j, _e as ji, cr as jn, Gt as jr, ba as jt, es as k, Te as ki, Tr as kn, Ht as kr, ca as kt, Ns as l, Je as li, qr as ln, _n as lr, Ma as lt, Hs as m, Be as mi, Gr as mn, en as mr, Na as mt, _s as n, ut as ni, oi as nn, Cn as nr, Oo as nt, gs as o, Xe as oi, Kr as on, q as or, uo as ot, Fs as p, He as pi, ii as pn, tn as pr, La as pt, wo as q, ee as qi, Pn as qn, yt as qr, Fi as qt, vs as r, tt as ri, ci as rn, En as rr, oo as rt, Ls as s, $e as si, Yr as sn, bn as sr, fo as st, Gs as t, _t as ti, pi as tn, Tn as tr, Co as tt, ys as u, xt as ui, ti as un, vn as ur, io as ut, Ws as v, Ke as vi, Rr as vn, un as vr, Oa as vt, ns as w, Ae as wi, kr as wn, Yt as wr, Sa as wt, ds as x, ke as xi, Br as xn, $t as xr, Aa as xt, Ds as y, Ue as yi, Lr as yn, ln as yr, Da as yt, so as z, H as zi, Xn as zn, Mt as zr, Zi as zt };
