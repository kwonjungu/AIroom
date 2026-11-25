import { r as e } from "./own-key-CzMRhMxt.js";
import { n as t } from "./substitutions-_KDT_mVq.js";
import { n } from "./ooxml-error-DbICW35n.js";
import { f as r } from "./resource-policy.generated-D_HlV2Rm.js";
import { i, t as a } from "./substitute-script-COw3MRyd.js";
import { a as o, d as s, o as c, r as l, u } from "./scripts-DxEAUeVI.js";
import { r as d } from "./symbol-font-Cf7Xu0_f.js";
import { n as f, t as p } from "./synthetic-em-box-ls5vK0gE.js";
import { t as m } from "./chart-font-sources-B96UtO2E.js";
import { n as h } from "./office-auto-line-D6xJtpwV.js";
import { o as g, r as _ } from "./part-failures-pZSloLZv.js";
import { n as v, t as y } from "./resource-measurement-b6dkzjLJ.js";
function b(e, t) {
	let n = `${e}`, r = e >= 1 && e <= 26 ? String.fromCharCode(96 + e) : n, i = e >= 1 && e <= 26 ? String.fromCharCode(64 + e) : n, a = x(e).toLowerCase(), o = x(e), s = n.replace(/[0-9]/g, (e) => String.fromCharCode(65296 + (e.charCodeAt(0) - 48)));
	switch (t) {
		case "arabicPlain": return n;
		case "arabicPeriod": return `${n}.`;
		case "arabicParenR": return `${n})`;
		case "arabicParenBoth": return `(${n})`;
		case "arabicDbPlain": return s;
		case "arabicDbPeriod": return `${s}.`;
		case "alphaLcPlain": return r;
		case "alphaLcPeriod": return `${r}.`;
		case "alphaLcParenR": return `${r})`;
		case "alphaLcParenBoth": return `(${r})`;
		case "alphaUcPlain": return i;
		case "alphaUcPeriod": return `${i}.`;
		case "alphaUcParenR": return `${i})`;
		case "alphaUcParenBoth": return `(${i})`;
		case "romanLcPlain": return a;
		case "romanLcPeriod": return `${a}.`;
		case "romanLcParenR": return `${a})`;
		case "romanLcParenBoth": return `(${a})`;
		case "romanUcPlain": return o;
		case "romanUcPeriod": return `${o}.`;
		case "romanUcParenR": return `${o})`;
		case "romanUcParenBoth": return `(${o})`;
		default: return `${n}.`;
	}
}
function x(e) {
	let t = [
		1e3,
		900,
		500,
		400,
		100,
		90,
		50,
		40,
		10,
		9,
		5,
		4,
		1
	], n = [
		"M",
		"CM",
		"D",
		"CD",
		"C",
		"XC",
		"L",
		"XL",
		"X",
		"IX",
		"V",
		"IV",
		"I"
	], r = "";
	for (let i = 0; i < t.length; i++) for (; e >= t[i];) r += n[i], e -= t[i];
	return r;
}
var ee = {
	palatino: "Palatino Linotype",
	helvetica: "Arial",
	"helvetica neue": "Arial"
};
function S(t) {
	let n = t.trim();
	return e(ee, n.toLocaleLowerCase("en-US")) ?? n;
}
var C = /* @__PURE__ */ new Map();
function w(e, t, n) {
	let r = `${e.trim().toLocaleLowerCase("en-US")}|${t ? 700 : 400}|${n ? "i" : "n"}`, i = C.get(r);
	if (i !== void 0) return C.delete(r), C.set(r, i), i ?? void 0;
	let a = te(e, t, n);
	if (C.set(r, a ?? null), C.size > 256) {
		let e = C.keys().next().value;
		e !== void 0 && C.delete(e);
	}
	return a;
}
var T = (e, t, n) => {
	let r = t ? 700 : 400, i = S(e);
	if (!i) return r;
	let a = n ? "italic" : "normal";
	if (s(i, {
		weight: r,
		style: a
	}).length > 0) return r;
	let o = s(i, { style: a });
	return o.length > 0 && o.every((e) => e.weight === o[0].weight) ? o[0].weight : r;
};
function E(e, t, n) {
	let r = S(e);
	if (!r) return [];
	let i = n ? "italic" : "normal", a = s(r, {
		weight: t ? 700 : 400,
		style: i
	});
	if (a.length === 0) {
		let e = s(r, { style: i });
		e.length > 0 && e.every((t) => t.weight === e[0].weight) && (a = e);
	}
	let o = a.filter((e) => e.source === "macos-supplemental");
	return o.length > 0 ? o : a.filter((e) => e.source === "office-mac");
}
function te(e, t, n) {
	let r = E(e, t, n);
	if (r.length === 0) return;
	let i;
	for (let e of r) {
		let t;
		if (e.typoMetrics) {
			let [n, r, i] = e.typoMetrics, a = n + Math.max(0, i);
			t = a / (a - r);
		} else if (e.win) {
			let [n, r] = e.win;
			t = n / (n + r);
		}
		if (t === void 0 || !Number.isFinite(t) || t <= 0 || t >= 1 || i !== void 0 && Math.abs(i - t) > 1e-12) return;
		i = t;
	}
	return i;
}
function ne(e, t, n) {
	let r = E(e, t, n);
	if (r.length === 0) return;
	let i;
	for (let e of r) {
		let t;
		if (e.typoMetrics) {
			let [n, r, i] = e.typoMetrics;
			t = {
				ascent: (n + Math.max(0, i)) / e.unitsPerEm,
				descent: -r / e.unitsPerEm
			};
		} else if (e.win) {
			let [n, r] = e.win;
			t = {
				ascent: n / e.unitsPerEm,
				descent: r / e.unitsPerEm
			};
		}
		if (t === void 0 || !(e.unitsPerEm > 0)) return;
		let n = t.ascent / (t.ascent + t.descent);
		if (!Number.isFinite(n) || n <= 0 || n >= 1 || i && (Math.abs(i.ascent - t.ascent) > 1e-12 || Math.abs(i.descent - t.descent) > 1e-12)) return;
		i = t;
	}
	return i;
}
function re(e, t, n) {
	let r;
	for (let i of E(e, t, n)) {
		if (i.farEastCodePage == null || !i.win) return;
		let e = h({
			faceSource: i.source === "macos-supplemental" ? "system" : "office-bundle",
			unitsPerEm: i.unitsPerEm,
			hhea: i.hhea,
			win: i.win,
			typoMetrics: i.typoMetrics,
			farEastCodePage: i.farEastCodePage
		});
		if (!e || r && (r.ascent !== e.ascentRatio || r.descent !== e.descentRatio)) return;
		r = {
			ascent: e.ascentRatio,
			descent: e.descentRatio
		};
	}
	return r;
}
function ie(e, t, n) {
	let r;
	for (let i of E(e, t, n)) {
		let e = i.decoration;
		if (!e || !(i.unitsPerEm > 0)) return;
		let [t, n, a, o] = e;
		if (!(n > 0) || !(o > 0) || !(a > 0)) return;
		let s = i.unitsPerEm, c = {
			underlineTopEm: -t / s,
			underlineThicknessEm: n / s,
			strikeTopEm: -a / s,
			strikeThicknessEm: o / s
		};
		if (r && Object.keys(c).some((e) => Math.abs(r[e] - c[e]) > 1e-12)) return;
		r = Object.freeze(c);
	}
	return r;
}
var D = /* @__PURE__ */ new Map();
function O(e, t, n) {
	let r = `${e.trim().toLocaleLowerCase("en-US")}|${t ? 700 : 400}|${n ? "i" : "n"}`, i = D.get(r);
	if (i !== void 0) return D.delete(r), D.set(r, i), i ?? void 0;
	let a = w(e, t, n), o = a === void 0 ? null : Object.freeze({
		share: a,
		glyph: ne(e, t, n),
		excel: re(e, t, n),
		decoration: ie(e, t, n)
	});
	if (D.set(r, o), D.size > 256) {
		let e = D.keys().next().value;
		e !== void 0 && D.delete(e);
	}
	return o ?? void 0;
}
function k(e) {
	let t = 0, n = 0, r = 0;
	for (let i of e) t = Math.max(t, i.sizePx), n = Math.max(n, 1.2 * i.sizePx * i.share), r = Math.max(r, 1.2 * i.sizePx * (1 - i.share));
	let i = 1.2 * t;
	if (!(n + r > 0)) return {
		ascent: i * p,
		descent: i * f
	};
	let a = i * n / (n + r);
	return {
		ascent: a,
		descent: i - a
	};
}
function ae(e) {
	return Math.floor(e + .5);
}
function oe(e) {
	let t = 0, n = 0;
	for (let r of e) t = Math.max(t, r.box.ascent * r.sizePx), n = Math.max(n, r.box.descent * r.sizePx);
	return {
		ascent: t,
		descent: n
	};
}
var se = .72;
function A(e, t) {
	return t ? e.face.excel : e.face.glyph;
}
function ce(e, t, n, r) {
	if (t.length === 0) return;
	let i = [];
	for (let e of t) {
		let t = A(e, n);
		if (!t) return;
		i.push({
			ascent: t.ascent * e.sizePx,
			descent: t.descent * e.sizePx
		});
	}
	if (!n) {
		let n = 0;
		for (let e of t) n = Math.max(n, e.sizePx);
		let i = 1.2 * n;
		if (e === "t") return {
			ascent: 0,
			descent: i
		};
		if (e === "ctr") return {
			ascent: i / 2,
			descent: i / 2
		};
		let a = k(t.map((e) => ({
			sizePx: e.sizePx,
			share: e.face.share
		}))), o = (i - Math.round(a.ascent / r) * r) / 2;
		return {
			ascent: i - o,
			descent: o
		};
	}
	if (e === "b") {
		let e = 0, t = 0;
		for (let n of i) e = Math.max(e, n.ascent + n.descent / 2), t = Math.max(t, n.descent / 2);
		return {
			ascent: e,
			descent: t
		};
	}
	let a = 0;
	for (let e of i) a = Math.max(a, e.ascent + e.descent);
	return e === "t" ? {
		ascent: 0,
		descent: a
	} : {
		ascent: a / 2,
		descent: a / 2
	};
}
function le(e, t, n, r) {
	let i = A(t, n);
	if (!i) return;
	let a = i.ascent * t.sizePx, o = i.descent * t.sizePx;
	if (e === "b") return -Math.round(o / 2 / r) * r;
	let s = e === "t" ? a : (a - o) / 2;
	return Math.round(s / r) * r;
}
function* j(e) {
	let t = [e[Symbol.iterator]()];
	for (; t.length;) {
		let e = t[t.length - 1].next();
		if (e.done) {
			t.pop();
			continue;
		}
		let n = e.value;
		yield n, (n.type === "shape" || n.type === "table") && n.mathFallback && t.push(n.mathFallback.elements[Symbol.iterator]());
	}
}
function* M(e) {
	for (let t of e?.paragraphs ?? []) {
		for (let e of t.mathFallbacks ?? []) yield e.text;
		for (let e of t.runs) e.type === "text" && (yield e.text), e.type === "math" && e.fallbackText && (yield e.fallbackText);
	}
}
function* ue(e) {
	for (let t of e?.paragraphs ?? []) {
		t.defFontFamily && (yield t.defFontFamily);
		for (let e of t.runs) e.type === "text" && (e.fontFamily && (yield e.fontFamily), e.fontFamilyEa && (yield e.fontFamilyEa), e.fontFamilyCs && (yield e.fontFamilyCs), e.fontFamilySym && (yield e.fontFamilySym));
	}
}
function* N(e) {
	for (let t of j(e.elements)) if (t.type === "shape") yield* M(t.textBody);
	else if (t.type === "table") for (let e of t.rows) for (let t of e.cells) yield* M(t.textBody);
	else if (t.type === "chart") {
		t.chart.title && (yield t.chart.title);
		for (let e of t.chart.categories) yield e;
		for (let e of t.chart.series) e.name && (yield e.name);
	}
}
var de = { arabic: /\p{Script_Extensions=Arabic}/u };
function P(e) {
	for (let t of a) if (de[t].test(e)) return !0;
	return !1;
}
function fe(e) {
	return { scripts: new Map([...e.scripts].map(([e, t]) => [e, new Set(t)])) };
}
var pe = class e {
	majorFont;
	minorFont;
	fallback;
	scriptNames;
	scripts;
	families;
	demand;
	constructor(e, t, n, r, i, a = /* @__PURE__ */ new Set(), o = !1) {
		this.majorFont = e, this.minorFont = t, this.fallback = i, this.scriptNames = a;
		let s = c(e) ?? c(t) ?? i ?? null;
		this.scripts = n ?? new l(s), this.families = r ?? /* @__PURE__ */ new Set(), this.demand = o === !1 ? null : o === !0 ? { scripts: /* @__PURE__ */ new Map() } : o, e && this.addThemeFamily(e), t && this.addThemeFamily(t);
	}
	addThemeFamily(e) {
		this.families.add(e), this.demand && this.demand.scripts.set(t(e), new Set(a));
	}
	addSlide(e) {
		e.theme?.majorFont && this.addThemeFamily(e.theme.majorFont), e.theme?.minorFont && this.addThemeFamily(e.theme.minorFont), this.scripts.addText(N(e));
		for (let t of u(N(e), c(e.theme ? e.theme.majorFont : this.majorFont) ?? c(e.theme ? e.theme.minorFont : this.minorFont) ?? this.fallback ?? null)) this.scriptNames.add(t);
		let t = (e) => {
			for (let t of ue(e)) this.families.add(t);
			this.demand && this.proveSubstituteScripts(e);
		};
		for (let n of j(e.elements)) if (n.type === "shape") t(n.textBody);
		else if (n.type === "table") for (let e of n.rows) for (let n of e.cells) t(n.textBody);
		if (this.demand) {
			let t = e.theme ? e.theme.majorFont : this.majorFont, n = e.theme ? e.theme.minorFont : this.minorFont, r = new Set([...this.families].map((e) => e.toLowerCase()));
			for (let [i, a] of L(e, t, n)) r.has(i) || this.families.add(a);
			for (let t of e.elements) if (t.type === "chart") for (let e of m(t.chart)) this.families.add(e);
		}
	}
	proveSubstituteScripts(e) {
		let n = this.demand.scripts, r = (e, r) => {
			for (let o of a) if (i({ script: o }, e, "any")) for (let e of r) {
				let r = e?.split(",")[0]?.trim();
				if (!r) continue;
				let i = t(r);
				n.set(i, (n.get(i) ?? /* @__PURE__ */ new Set()).add(o));
			}
		};
		for (let t of e?.paragraphs ?? []) {
			for (let e of t.runs) e.type !== "text" || !P(e.text) || r(e.text, [
				e.fontFamily ?? t.defFontFamily,
				e.fontFamilyEa,
				e.fontFamilyCs,
				e.fontFamilySym
			]);
			let e = t.bullet;
			if (e.type === "char") e.char && P(e.char) && d(e.char, e.fontFamily ?? null) === e.char && r(e.char, [e.fontFamily]);
			else if (e.type === "autoNum") {
				let n = b(e.startAt ?? 1, e.numType);
				if (P(n)) {
					let i = t.runs.find((e) => e.type === "text" && !!e.fontFamily);
					r(n, [e.fontFamily ?? (i?.type === "text" ? i.fontFamily : null) ?? t.defFontFamily]);
				}
			}
		}
	}
	names() {
		return [...new Set([
			...this.families,
			...this.scripts.names(),
			...this.scriptNames
		])];
	}
	demandFacts() {
		if (!this.demand) return;
		let e = Object.create(null);
		for (let [t, n] of this.demand.scripts) n.size && (e[t] = Object.freeze([...n].sort()));
		return Object.freeze({
			familyCount: this.families.size,
			substituteScripts: Object.freeze(e)
		});
	}
	withSlide(t) {
		let n = new e(this.majorFont, this.minorFont, this.scripts.clone(), new Set(this.families), this.fallback, new Set(this.scriptNames), this.demand ? fe(this.demand) : !1);
		return n.addSlide(t), n;
	}
}, me = new Set([
	"serif",
	"sans-serif",
	"monospace",
	"cursive",
	"fantasy",
	"system-ui"
]);
function F(e, t, n) {
	let r = e.startsWith("+mn-") ? n : e.startsWith("+mj-") ? t : e.split(",")[0]?.trim() ?? null;
	return !r || me.has(r.toLowerCase()) ? null : r;
}
function I(e, t) {
	let n = (e, n, r) => {
		e && t(e, n, r);
	}, r = (e) => {
		for (let t of e?.paragraphs ?? []) {
			for (let r of t.runs) {
				if (r.type === "break") {
					n(r.fontFamily ?? t.defFontFamily, r.bold ?? t.defBold ?? e?.defaultBold ?? !1, r.italic ?? t.defItalic ?? e?.defaultItalic ?? !1);
					continue;
				}
				if (r.type !== "text") continue;
				let i = r.bold ?? t.defBold ?? e?.defaultBold ?? !1, a = r.italic ?? t.defItalic ?? e?.defaultItalic ?? !1;
				n(r.fontFamily ?? t.defFontFamily, i, a), r.fontFamilyEa && n(r.fontFamilyEa, i, a), r.fontFamilyCs && n(r.fontFamilyCs, i, a), r.fontFamilySym && n(r.fontFamilySym, i, a);
			}
			let r = t.endRunProperties;
			if (r && n(r.fontFamily ?? t.defFontFamily, r.bold ?? t.defBold ?? e?.defaultBold ?? !1, r.italic ?? t.defItalic ?? e?.defaultItalic ?? !1), t.bullet.type === "char" || t.bullet.type === "autoNum") {
				let e = t.runs.find((e) => e.type === "text" && !!e.fontFamily), r = e?.type === "text" ? e.fontFamily : null;
				n(t.bullet.fontFamily ?? (t.bullet.type === "autoNum" ? r ?? t.defFontFamily : void 0), !1, !1);
			}
		}
	};
	for (let t of j(e.elements)) if (t.type === "shape" && r(t.textBody), t.type === "table") for (let e of t.rows) for (let t of e.cells) r(t.textBody);
}
function L(e, t, n) {
	e.theme && (t = e.theme.majorFont, n = e.theme.minorFont);
	let r = /* @__PURE__ */ new Map(), i = /* @__PURE__ */ new Map();
	return I(e, (e) => {
		let a = r.get(e);
		if (a === void 0) {
			let i = F(e, t, n);
			r.set(e, a = i ? [i.toLowerCase(), i] : null);
		}
		a && i.set(a[0], a[1]);
	}), i;
}
function R(e, t, n) {
	e.theme && (t = e.theme.majorFont, n = e.theme.minorFont);
	let r = /* @__PURE__ */ new Map(), i = /* @__PURE__ */ new Map(), a = (e, r, i) => {
		let a = F(e, t, n);
		if (!a) return null;
		let o = T(a, r, i), s = i ? "italic" : "normal";
		return [
			`${a.toLowerCase()}\0${o}\0${s}`,
			{
				family: a,
				weight: o,
				style: s
			},
			`\0${a.toLowerCase()}`,
			{
				family: a,
				presenceOnly: !0
			}
		];
	};
	return I(e, (e, t, n) => {
		let o = i.get(e);
		o || i.set(e, o = []);
		let s = (t ? 2 : 0) + +!!n, c = o[s];
		c === void 0 && (o[s] = c = a(e, t, n)), c && (r.set(c[0], c[1]), r.set(c[2], c[3]));
	}), [...r.values()];
}
function z(e, t, n, r) {
	return o(N(e), c(t) ?? c(n) ?? r);
}
function B() {
	return new _((e) => e.slideIndex, (e, t) => e.slideIndex - t.slideIndex);
}
function he(e, t) {
	let n = e;
	if (typeof n != "object" || !n || n.kind !== "slide" || !Number.isInteger(n.slideIndex) || n.slideIndex < 0 || n.slideIndex >= t || !Number.isInteger(n.slideNumber) || typeof n.message != "string") throw Error("PPTX worker returned an invalid part failure");
	return {
		kind: "slide",
		slideIndex: n.slideIndex,
		slideNumber: n.slideNumber,
		message: n.message
	};
}
function ge(e) {
	return g(e, B);
}
var V = Object.freeze({
	archiveEntryCount: 0,
	declaredInflatedBytes: 0,
	distinctInflatedBytes: 0,
	operationInflatedBytes: 0
}), H = r;
function U(e, t) {
	return t ? {
		fontPreloadNames: e,
		fontPreloadFacts: t
	} : { fontPreloadNames: e };
}
var _e = new Set(a);
function ve(e, t) {
	let n = () => /* @__PURE__ */ Error("invalid PPTX presentation preflight font demand facts");
	if (!e || typeof e != "object" || Array.isArray(e)) throw n();
	let r = e, i = r.familyCount;
	if (typeof i != "number" || !Number.isSafeInteger(i) || i < 0 || i > t) throw n();
	let a = r.substituteScripts;
	if (!a || typeof a != "object" || Array.isArray(a)) throw n();
	let o = Object.create(null);
	for (let [e, t] of Object.entries(a)) {
		if (!Array.isArray(t) || !t.every((e) => typeof e == "string" && _e.has(e))) throw n();
		o[e] = Object.freeze([...t]);
	}
	return Object.freeze({
		familyCount: i,
		substituteScripts: Object.freeze(o)
	});
}
function W(e, t) {
	if (e !== null && typeof e != "string") throw Error(`invalid PPTX presentation bootstrap ${t}`);
}
function ye(e, t) {
	if (!e || typeof e != "object" || Array.isArray(e)) throw Error(`invalid PPTX presentation bootstrap slide at ${t}`);
	let n = e;
	if (n.index !== t) throw Error(`invalid PPTX presentation bootstrap slide index ${n.index}`);
	if (n.partName !== void 0 && typeof n.partName != "string") throw Error(`invalid PPTX presentation bootstrap slide partName at ${t}`);
	return Object.freeze({
		index: n.index,
		...n.partName === void 0 ? {} : { partName: n.partName }
	});
}
function G(e, t) {
	if (!e || typeof e != "object" || Array.isArray(e)) throw Error(`invalid PPTX presentation bootstrap embedded font at ${t}`);
	let n = e;
	if (typeof n.fontName != "string" || n.fontName.length === 0 || ![
		"regular",
		"bold",
		"italic",
		"boldItalic"
	].includes(n.style ?? "") || typeof n.partPath != "string" || n.partPath.length === 0 || n.partPath.startsWith("/") || n.partPath.split("/").includes("..") || !["application/x-font-ttf", "application/x-fontdata"].includes(n.contentType ?? "")) throw Error(`invalid PPTX presentation bootstrap embedded font fields at ${t}`);
	return Object.freeze({
		fontName: n.fontName,
		style: n.style,
		partPath: n.partPath,
		contentType: n.contentType
	});
}
function K(e) {
	if (!e || typeof e != "object" || Array.isArray(e)) throw Error("invalid PPTX presentation bootstrap payload");
	let t = e;
	if (!Number.isSafeInteger(t.slideCount) || (t.slideCount ?? -1) < 0 || !Number.isSafeInteger(t.slideWidth) || (t.slideWidth ?? 0) <= 0 || !Number.isSafeInteger(t.slideHeight) || (t.slideHeight ?? 0) <= 0 || !Array.isArray(t.embeddedFonts) || !Array.isArray(t.slides) || t.slides.length !== t.slideCount) throw Error("invalid PPTX presentation bootstrap dimensions or slide count");
	return W(t.defaultTextColor, "defaultTextColor"), W(t.majorFont, "majorFont"), W(t.minorFont, "minorFont"), W(t.hlinkColor, "hlinkColor"), W(t.folHlinkColor, "folHlinkColor"), Object.freeze({
		slideCount: t.slideCount,
		slideWidth: t.slideWidth,
		slideHeight: t.slideHeight,
		defaultTextColor: t.defaultTextColor,
		majorFont: t.majorFont,
		minorFont: t.minorFont,
		hlinkColor: t.hlinkColor,
		folHlinkColor: t.folHlinkColor,
		embeddedFonts: Object.freeze(t.embeddedFonts.map(G)),
		slides: Object.freeze(t.slides.map(ye))
	});
}
function q(e) {
	return Object.freeze({
		type: "media",
		x: e.x,
		y: e.y,
		width: e.width,
		height: e.height,
		rotation: e.rotation,
		flipH: e.flipH,
		flipV: e.flipV,
		mediaKind: e.mediaKind,
		posterPath: e.posterPath,
		posterMimeType: e.posterMimeType,
		mediaPath: e.mediaPath,
		mimeType: e.mimeType
	});
}
function J(e) {
	return Object.freeze({
		...e.id === void 0 ? {} : { id: e.id },
		...e.authorId === void 0 ? {} : { authorId: e.authorId },
		...e.author === void 0 ? {} : { author: e.author },
		...e.date === void 0 ? {} : { date: e.date },
		...e.status === void 0 ? {} : { status: e.status },
		text: e.text
	});
}
function be(e) {
	return Object.freeze({ ...e });
}
function Y(e) {
	return Object.freeze({
		...e.authorId === void 0 ? {} : { authorId: e.authorId },
		...e.modernAuthorId === void 0 ? {} : { modernAuthorId: e.modernAuthorId },
		...e.id === void 0 ? {} : { id: e.id },
		...e.index === void 0 ? {} : { index: e.index },
		...e.author === void 0 ? {} : { author: e.author },
		...e.date === void 0 ? {} : { date: e.date },
		...e.x === void 0 ? {} : { x: e.x },
		...e.y === void 0 ? {} : { y: e.y },
		...e.anchors?.length ? { anchors: Object.freeze(e.anchors.map(be)) } : {},
		...e.status === void 0 ? {} : { status: e.status },
		text: e.text,
		...e.replies?.length ? { replies: Object.freeze(e.replies.map(J)) } : {}
	});
}
function X(e, t, n) {
	if (e !== void 0 && typeof e != "string") throw Error(`invalid PPTX presentation preflight comment ${t} at slide ${n}`);
}
function xe(e, t) {
	if (!e || typeof e != "object" || Array.isArray(e)) throw Error(`invalid PPTX presentation preflight comment reply at slide ${t}`);
	let n = e;
	for (let e of [
		"id",
		"authorId",
		"author",
		"date",
		"status"
	]) X(n[e], e, t);
	if (typeof n.text != "string") throw Error(`invalid PPTX presentation preflight comment reply text at slide ${t}`);
	if (n.status !== void 0 && ![
		"active",
		"resolved",
		"closed"
	].includes(n.status)) throw Error(`invalid PPTX presentation preflight comment reply status at slide ${t}`);
	return J(n);
}
function Se(e, t) {
	if (!e || typeof e != "object" || Array.isArray(e)) throw Error(`invalid PPTX presentation preflight comment at slide ${t}`);
	let n = e;
	for (let e of [
		"modernAuthorId",
		"id",
		"author",
		"date",
		"status"
	]) X(n[e], e, t);
	for (let e of [
		"authorId",
		"index",
		"x",
		"y"
	]) {
		let r = n[e];
		if (r !== void 0 && (typeof r != "number" || !Number.isSafeInteger(r))) throw Error(`invalid PPTX presentation preflight comment ${e} at slide ${t}`);
	}
	if (typeof n.text != "string" || n.replies !== void 0 && !Array.isArray(n.replies) || n.anchors !== void 0 && !Array.isArray(n.anchors)) throw Error(`invalid PPTX presentation preflight comment fields at slide ${t}`);
	if (n.status !== void 0 && ![
		"active",
		"resolved",
		"closed"
	].includes(n.status)) throw Error(`invalid PPTX presentation preflight comment status at slide ${t}`);
	return Y({
		...n,
		...n.anchors?.length ? { anchors: n.anchors.map((e) => Ce(e, t)) } : {},
		...n.replies?.length ? { replies: n.replies.map((e) => xe(e, t)) } : {}
	});
}
function Ce(e, t) {
	if (!e || typeof e != "object" || Array.isArray(e)) throw Error(`invalid PPTX presentation preflight comment anchor at slide ${t}`);
	let n = e;
	if (n.type === "slide" || n.type === "unknown") return Object.freeze({ type: n.type });
	if (n.type === "drawingElement") return X(n.elementId, "anchor.elementId", t), X(n.creationId, "anchor.creationId", t), Object.freeze({
		type: "drawingElement",
		...n.elementId === void 0 ? {} : { elementId: n.elementId },
		...n.creationId === void 0 ? {} : { creationId: n.creationId }
	});
	if (n.type === "textRange") {
		X(n.elementId, "anchor.elementId", t);
		for (let e of ["start", "length"]) {
			let r = n[e];
			if (r !== void 0 && (typeof r != "number" || !Number.isSafeInteger(r))) throw Error(`invalid PPTX presentation preflight comment anchor.${e} at slide ${t}`);
		}
		return Object.freeze({
			type: "textRange",
			...n.elementId === void 0 ? {} : { elementId: n.elementId },
			...n.start === void 0 ? {} : { start: n.start },
			...n.length === void 0 ? {} : { length: n.length }
		});
	}
	throw Error(`invalid PPTX presentation preflight comment anchor type at slide ${t}`);
}
function we(e, t) {
	if (!e || typeof e != "object" || Array.isArray(e)) throw Error(`invalid PPTX presentation preflight media at slide ${t}`);
	let n = e;
	for (let e of [
		"x",
		"y",
		"width",
		"height",
		"rotation"
	]) if (typeof n[e] != "number" || !Number.isFinite(n[e])) throw Error(`invalid PPTX presentation preflight media ${e} at slide ${t}`);
	if (n.type !== "media" || typeof n.flipH != "boolean" || typeof n.flipV != "boolean" || n.mediaKind !== "audio" && n.mediaKind !== "video" || typeof n.posterPath != "string" || typeof n.posterMimeType != "string" || typeof n.mediaPath != "string" || typeof n.mimeType != "string") throw Error(`invalid PPTX presentation preflight media fields at slide ${t}`);
	return q(n);
}
function Z(e, t) {
	if (!e || typeof e != "object" || Array.isArray(e)) throw Error("invalid PPTX presentation preflight payload");
	let n = e;
	if (!Number.isSafeInteger(n.slideCount) || (n.slideCount ?? -1) < 0 || !Number.isSafeInteger(n.slideWidth) || (n.slideWidth ?? 0) <= 0 || !Number.isSafeInteger(n.slideHeight) || (n.slideHeight ?? 0) <= 0 || !Array.isArray(n.embeddedFonts) || !Array.isArray(n.slides) || (t ? n.slides.length > (n.slideCount ?? -1) : n.slides.length !== n.slideCount) || !Array.isArray(n.fontPreloadNames)) throw Error("invalid PPTX presentation preflight dimensions or slide count");
	W(n.defaultTextColor, "defaultTextColor"), W(n.majorFont, "majorFont"), W(n.minorFont, "minorFont"), W(n.hlinkColor, "hlinkColor"), W(n.folHlinkColor, "folHlinkColor");
	let r = n.slides.map((e, t) => {
		if (!e || typeof e != "object" || Array.isArray(e)) throw Error(`invalid PPTX presentation preflight slide at ${t}`);
		let n = e;
		if (n.index !== t || n.partName !== void 0 && typeof n.partName != "string" || n.notes !== null && typeof n.notes != "string" || typeof n.hidden != "boolean" || !Array.isArray(n.mediaElements) || n.comments !== void 0 && !Array.isArray(n.comments)) throw Error(`invalid PPTX presentation preflight slide fields at ${t}`);
		return Object.freeze({
			index: t,
			...n.partName === void 0 ? {} : { partName: n.partName },
			notes: n.notes,
			hidden: n.hidden,
			mediaElements: Object.freeze(n.mediaElements.map((e) => we(e, t))),
			...n.comments?.length ? { comments: Object.freeze(n.comments.map((e) => Se(e, t))) } : {}
		});
	}), i;
	if (n.fontPreloadDemand !== void 0) {
		let e = n.fontPreloadDemand;
		if (e === "all") i = "all";
		else if (Array.isArray(e) && e.every((e) => Number.isInteger(e) && e >= 0 && e <= 1114111 && !(e >= 55296 && e <= 57343))) i = Object.freeze([...new Set(e)]);
		else throw Error("invalid PPTX presentation preflight font demand");
	}
	let a = n.fontPreloadNames.map((e, t) => {
		if (e !== null && typeof e != "string") throw Error(`invalid PPTX presentation preflight font at ${t}`);
		return e;
	}), o = n.fontPreloadFacts === void 0 ? void 0 : ve(n.fontPreloadFacts, a.length);
	return Object.freeze({
		slideCount: n.slideCount,
		slideWidth: n.slideWidth,
		slideHeight: n.slideHeight,
		defaultTextColor: n.defaultTextColor,
		majorFont: n.majorFont,
		minorFont: n.minorFont,
		hlinkColor: n.hlinkColor,
		folHlinkColor: n.folHlinkColor,
		embeddedFonts: Object.freeze(n.embeddedFonts.map(G)),
		slides: Object.freeze(r),
		fontPreloadNames: Object.freeze(a),
		...i === void 0 ? {} : { fontPreloadDemand: i },
		...o === void 0 ? {} : { fontPreloadFacts: o }
	});
}
function Q(e) {
	return Z(e, !1);
}
function Te(e) {
	return Z(e, !0);
}
function Ee(e, t) {
	for (let n of e.slides) for (let e of n.mediaElements) {
		if (e.mediaPath === t) return e.mimeType;
		if (e.posterPath === t) return e.posterMimeType;
	}
	return "";
}
function De(e, t) {
	if (e.index !== t.index || e.partName !== t.partName) throw Error(`PPTX pulled slide identity does not match bootstrap index ${t.index}`);
	return Object.freeze({
		index: t.index,
		...t.partName === void 0 ? {} : { partName: t.partName },
		notes: e.notes ?? null,
		hidden: e.hidden ?? !1,
		mediaElements: Object.freeze(e.elements.filter((e) => e.type === "media").map(q)),
		...e.comments?.length ? { comments: Object.freeze(e.comments.map(Y)) } : {}
	});
}
function $(e, t, r) {
	if (!(e <= t)) throw new n(`PPTX presentation preflight exceeded its hard limit of ${t} projected bytes`, {
		stage: "parsing",
		violation: {
			format: "pptx",
			operation: "presentation-preflight",
			resource: "presentation-preflight",
			metric: "projected-bytes",
			limit: t,
			observed: Math.min(e, t + 1),
			configurable: !1,
			usage: r
		}
	});
}
var Oe = class {
	slideCountValue;
	slideWidthValue;
	slideHeightValue;
	defaultTextColorValue;
	majorFontValue;
	minorFontValue;
	hlinkColorValue;
	folHlinkColorValue;
	embeddedFontsValue;
	descriptors;
	slides = [];
	fonts;
	fontPreloadNames;
	fontPreloadFacts;
	fontProjectionBytes;
	projectionBytesValue;
	limit;
	pending = null;
	finished = null;
	demandPoints;
	demandAll = !1;
	demandBytes = 0;
	demandMembershipBytes = 0;
	demandDeltaBytes = 0;
	collectFontDemand;
	demandDelta;
	partFailureLog = B();
	latestPartFailureValue;
	constructor(e, t = {}) {
		let n = K(e), r = t.maxProjectionBytes ?? H;
		if (!Number.isSafeInteger(r) || r <= 0 || r > H) throw Error("invalid PPTX presentation preflight limit");
		this.limit = r, this.collectFontDemand = t.collectFontDemand, this.demandPoints = this.collectFontDemand ? /* @__PURE__ */ new Set() : void 0, this.demandBytes = this.collectFontDemand ? v({ fontPreloadDemand: [] }, this.limit).jsonBytes - 1 : 0, this.demandMembershipBytes = this.demandBytes, this.slideCountValue = n.slideCount, this.slideWidthValue = n.slideWidth, this.slideHeightValue = n.slideHeight, this.defaultTextColorValue = n.defaultTextColor, this.majorFontValue = n.majorFont, this.minorFontValue = n.minorFont, this.hlinkColorValue = n.hlinkColor, this.folHlinkColorValue = n.folHlinkColor, this.embeddedFontsValue = n.embeddedFonts, this.descriptors = [...n.slides], this.fonts = new pe(this.majorFontValue, this.minorFontValue, void 0, void 0, t.cjkFallback, void 0, this.collectFontDemand !== void 0), this.fontPreloadNames = Object.freeze(this.fonts.names()), this.fontPreloadFacts = this.fonts.demandFacts(), this.fontProjectionBytes = v(U(this.fontPreloadNames, this.fontPreloadFacts), this.limit).jsonBytes, this.projectionBytesValue = v({
			slideCount: this.slideCountValue,
			slideWidth: this.slideWidthValue,
			slideHeight: this.slideHeightValue,
			defaultTextColor: this.defaultTextColorValue,
			majorFont: this.majorFontValue,
			minorFont: this.minorFontValue,
			hlinkColor: this.hlinkColorValue,
			folHlinkColor: this.folHlinkColorValue,
			embeddedFonts: this.embeddedFontsValue,
			remainingSlides: this.descriptors,
			slides: [],
			...U(this.fontPreloadNames, this.fontPreloadFacts)
		}, this.limit).jsonBytes, this.projectionBytesValue + this.demandBytes > this.limit && (this.demandAll = !0, this.demandBytes = 0, this.demandMembershipBytes = 0), this.projectionBytesValue = y(this.projectionBytesValue, this.demandBytes, this.limit), $(this.projectionBytesValue, this.limit, V);
	}
	get acceptedSlideCount() {
		return this.finished?.slideCount ?? this.slides.length;
	}
	get projectedBytes() {
		return this.projectionBytesValue;
	}
	get remainingDescriptorCount() {
		return this.descriptors.reduce((e, t) => e + Number(t !== void 0), 0);
	}
	get latestSlide() {
		return this.slides[this.slides.length - 1];
	}
	get currentFontPreloadNames() {
		return this.fontPreloadNames;
	}
	get currentFontPreloadFacts() {
		return this.fontPreloadFacts;
	}
	get currentFontPreloadDemandDelta() {
		return this.demandDelta;
	}
	get partFailures() {
		return this.partFailureLog.list;
	}
	get latestPartFailure() {
		return this.latestPartFailureValue;
	}
	snapshot() {
		if (this.finished) return this.finished;
		if (this.pending) throw Error("PPTX presentation preflight has an uncommitted slide");
		return Object.freeze({
			slideCount: this.slideCountValue,
			slideWidth: this.slideWidthValue,
			slideHeight: this.slideHeightValue,
			defaultTextColor: this.defaultTextColorValue,
			majorFont: this.majorFontValue,
			minorFont: this.minorFontValue,
			hlinkColor: this.hlinkColorValue,
			folHlinkColor: this.folHlinkColorValue,
			embeddedFonts: this.embeddedFontsValue,
			slides: Object.freeze([...this.slides]),
			...U(this.fontPreloadNames, this.fontPreloadFacts)
		});
	}
	addSlide(e, t = V) {
		this.prepareSlide(e, t).commit();
	}
	prepareSlide(e, t = V) {
		if (this.finished) throw Error("PPTX presentation preflight is already finished");
		if (this.pending) throw Error("PPTX presentation preflight already has a prepared slide");
		let n = this.slides.length, r = this.descriptors[n];
		if (!r) throw Error("PPTX presentation preflight received an extra slide");
		let i = De(e, r), a = this.fonts.withSlide(e), o = Object.freeze(a.names()), s = a.demandFacts(), c = v(U(o, s), this.limit).jsonBytes, l = v(i, this.limit).jsonBytes, u = this.projectionBytesValue - this.demandBytes - this.fontProjectionBytes - v(r, this.limit).jsonBytes + 4;
		u = y(u, c, this.limit), u = y(u, l, this.limit), this.slides.length !== 0 && (u = y(u, 1, this.limit));
		let d = v({
			slide: i,
			...U(o, s)
		}, this.limit).jsonBytes, f = y(this.projectionBytesValue - this.demandBytes, d, this.limit), p = u;
		$(Math.max(f, p), this.limit, t);
		let m = f + this.demandBytes;
		u += this.demandBytes, Math.max(m, u) > this.limit && this.demandBytes && (this.projectionBytesValue -= this.demandBytes, this.demandBytes = 0, this.demandMembershipBytes = 0, this.demandDeltaBytes = 0, this.demandPoints?.clear(), this.demandAll = !0, this.demandDelta = "all", m = f, u = p);
		let h, g = this.demandBytes, _ = this.demandMembershipBytes, b = this.demandDeltaBytes;
		if (this.collectFontDemand) {
			let t = v([], this.limit).jsonBytes, n = this.limit - m, r = this.limit - p - this.demandMembershipBytes, i = Math.min(n, Math.floor((r + t - Number((this.demandPoints?.size ?? 0) > 0)) / 2));
			if (h = this.demandAll ? "all" : this.collectFontDemand(e, this.demandPoints, Math.max(0, i)), h === "all") g = 0, _ = 0, b = 0;
			else {
				b = v(h, this.limit).jsonBytes;
				let e = h.length === 0 ? 0 : b - t + Number((this.demandPoints?.size ?? 0) > 0);
				_ += e, g = _ + b, m += b;
			}
			u = p + g;
		}
		$(Math.max(m, u), this.limit, t);
		let x = {
			state: "prepared",
			fact: i,
			fonts: a,
			fontNames: o,
			fontFacts: s,
			fontBytes: c,
			committedBytes: u,
			demandDelta: h,
			demandBytes: g,
			demandMembershipBytes: _,
			demandDeltaBytes: b,
			partFailure: e.parseError === void 0 ? null : {
				kind: "slide",
				slideIndex: n,
				slideNumber: n + 1,
				message: e.parseError
			}
		};
		return this.pending = x, {
			projectedBytes: m,
			commit: () => {
				if (x.state !== "committed") {
					if (x.state === "rolled-back") throw Error("PPTX presentation preflight cannot commit a rolled-back slide");
					if (this.pending !== x) throw Error("PPTX presentation preflight prepared slide is stale");
					if (this.descriptors[n] = void 0, this.slides.push(x.fact), this.fonts = x.fonts, this.fontPreloadNames = x.fontNames, this.fontPreloadFacts = x.fontFacts, this.fontProjectionBytes = x.fontBytes, this.projectionBytesValue = x.committedBytes, this.demandDelta = x.demandDelta, x.demandDelta === "all") this.demandAll = !0, this.demandPoints?.clear();
					else for (let e of x.demandDelta ?? []) this.demandPoints?.add(e);
					this.demandBytes = x.demandBytes, this.demandMembershipBytes = x.demandMembershipBytes, this.demandDeltaBytes = x.demandDeltaBytes, this.latestPartFailureValue = x.partFailure === null ? void 0 : this.partFailureLog.add(x.partFailure) ?? this.partFailureLog.get(n), x.state = "committed", this.pending = null;
				}
			},
			rollback: () => {
				if (x.state !== "rolled-back") {
					if (x.state === "committed") throw Error("PPTX presentation preflight cannot roll back a committed slide");
					if (this.pending !== x) throw Error("PPTX presentation preflight prepared slide is stale");
					x.state = "rolled-back", this.pending = null;
				}
			}
		};
	}
	finish() {
		if (this.finished) return this.finished;
		if (this.pending) throw Error("PPTX presentation preflight has an uncommitted slide");
		if (this.slides.length !== this.slideCountValue) throw Error(`PPTX presentation preflight is incomplete: ${this.slides.length}/${this.slideCountValue} slides`);
		return this.finished = Object.freeze({
			slideCount: this.slideCountValue,
			slideWidth: this.slideWidthValue,
			slideHeight: this.slideHeightValue,
			defaultTextColor: this.defaultTextColorValue,
			majorFont: this.majorFontValue,
			minorFont: this.minorFontValue,
			hlinkColor: this.hlinkColorValue,
			folHlinkColor: this.folHlinkColorValue,
			embeddedFonts: this.embeddedFontsValue,
			slides: Object.freeze([...this.slides]),
			...U(this.fontPreloadNames, this.fontPreloadFacts),
			...this.collectFontDemand && !this.demandAll && this.demandBytes ? { fontPreloadDemand: Object.freeze([...this.demandPoints ?? []]) } : {}
		}), this.demandPoints?.clear(), this.demandDelta = void 0, this.descriptors = [], this.slides = [], this.projectionBytesValue = v(this.finished, this.limit).jsonBytes, this.finished;
	}
};
export { k as _, Te as a, z as c, T as d, oe as f, ce as g, le as h, Q as i, R as l, O as m, Ee as n, he as o, ae as p, K as r, ge as s, Oe as t, se as u, b as v };
