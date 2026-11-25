import { a as e, n as t, o as n, t as r } from "./slide-pull-client-D2ZoyzhO.js";
import { n as i, r as a } from "./own-key-CzMRhMxt.js";
import { n as o } from "./ooxml-error-DbICW35n.js";
import { n as s, t as c } from "./cfb-guard-reswPjey.js";
import { d as l, m as u } from "./resource-policy.generated-D_HlV2Rm.js";
import { i as d } from "./embedded-B4q5SDVm.js";
import { r as f } from "./local-metrics-PuMOXgAD.js";
import { i as p, n as m } from "./office-fallback-O-L6rrDh.js";
import { n as h } from "./cjk-fallback-CxqXJu32.js";
import { G as g } from "./segment-line-BR56kM-V.js";
import { d as _, u as v } from "./vertical-vert-feature-ru96Mg5B.js";
import { t as y } from "./symbol-face-cache-CjBY83Jr.js";
import { a as ee } from "./units-BBDOirYi.js";
import { f as te } from "./pixel-budget-DI82Hn3R.js";
import { i as b, l as x, m as S, o as C, s as w } from "./duotone-bitmap-by-path-B_pNKO0M.js";
import { n as T } from "./renderer-module-contract-BuTx2FWJ.js";
import { c as ne, i as re, n as ie, r as ae, s as oe } from "./chart-context-DqNY4BWJ.js";
import { n as se, r as E } from "./error-wire-Dr1HjXGZ.js";
import { i as ce, n as le, r as ue } from "./resource-debug-D8EBjKbZ.js";
import { t as de } from "./rejected-load-CS5sDp04.js";
import "./pull-session-CJuB3jmq.js";
import { a as fe, i as D, l as pe, n as me, o as he, r as O, s as ge, t as _e } from "./presentation-preflight-CI5kmMvH.js";
import { n as ve, t as ye } from "./bundled-asset-url-Cv8ajMAZ.js";
import { u as be } from "./source-GXgH3t1X.js";
import { c as xe, l as Se, s as Ce, u as k } from "./part-failures-pZSloLZv.js";
import { n as we, t as Te } from "./bounded-raw-part-cache-TU72wntZ.js";
import { n as Ee, r as De, t as Oe } from "./deferred-D2gd0MY2.js";
import { n as ke } from "./resource-measurement-b6dkzjLJ.js";
import { n as A, r as Ae } from "./embedded-fonts-CcydyKMB.js";
function je(e, t) {
	let n = t.startsWith("/") ? [] : e.split("/").filter((e) => e !== "");
	for (let e of t.split("/")) if (e === "..") n.pop();
	else if (e === "." || e === "") continue;
	else n.push(e);
	return n.join("/");
}
function j(e) {
	let t = /[?&]jump=([a-zA-Z]+)/.exec(e);
	if (!t) return null;
	let n = t[1].toLowerCase();
	return n === "firstslide" || n === "lastslide" || n === "nextslide" || n === "previousslide" ? n : null;
}
function Me(e, t, n) {
	if (!(n <= 0)) switch (e) {
		case "firstslide": return 0;
		case "lastslide": return n - 1;
		case "nextslide": return Math.min(t + 1, n - 1);
		case "previousslide": return Math.max(t - 1, 0);
	}
}
function Ne(e) {
	let t = /* @__PURE__ */ new Map();
	for (let n = 0; n < e.length; n++) {
		let r = e[n];
		r !== void 0 && r !== "" && !t.has(r) && t.set(r, n);
	}
	return t;
}
function Pe(e, t) {
	if (e === "") return;
	if (e.startsWith("ppt/")) return t.get(e);
	let n = je("ppt/slides", e);
	return t.get(n);
}
function Fe(e, t, n) {
	let r = j(e);
	return r === null ? Pe(e, t) : Me(r, n, t.size);
}
function Ie(e) {
	return j(e) === "previousslide";
}
async function Le(e) {
	return e ? (await import("./font-preload-demand-ZpqJupcJ.js")).collectSlideFontDemand : void 0;
}
function Re() {
	try {
		return ve(new URL("./pptx-font-demand.mjs", import.meta.url).href, import.meta.url);
	} catch {
		return "";
	}
}
var M = (e) => e >= "0" && e <= "9";
function ze(e) {
	let t = 0;
	for (let n = 0; n < 10; n++) t = Math.max(t, e.measureText(String(n)).width);
	return t;
}
function N(e, t, n) {
	let r = 0;
	for (let i of t) r += M(i) ? n : e.measureText(i).width;
	return r;
}
function Be(e, t, n, r, i) {
	let a = e.textAlign;
	e.textAlign = "left";
	let o = n;
	for (let n of t) if (M(n)) {
		let t = e.measureText(n).width;
		e.fillText(n, o + (i - t) / 2, r), o += i;
	} else e.fillText(n, o, r), o += e.measureText(n).width;
	e.textAlign = a;
}
var P = (e, t) => e / ee * t;
async function Ve(e, t, r) {
	let i = e.getContext("2d");
	if (!i) throw Error("2D context not available");
	let a = r.width / (r.slideWidthEmu / ee);
	await r.drawBase();
	let s = document.createElement("canvas");
	s.width = e.width, s.height = e.height;
	let c = s.getContext("2d");
	if (!c) throw Error("base 2D context not available");
	c.drawImage(e, 0, 0);
	let l = [], u = !1, d = () => {
		for (let e of l) {
			e.detachListeners(), e.media.pause(), e.media.removeAttribute("src");
			try {
				e.media.load();
			} catch {}
			URL.revokeObjectURL(e.objectUrl);
		}
		l.length = 0;
	}, f = (e) => {
		u || (r.onError ? r.onError(e) : console.error("[ooxml] PPTX embedded media failed:", e));
	};
	for (let e of t) {
		let t;
		try {
			t = await r.fetchMedia(e.mediaPath);
		} catch (t) {
			throw d(), t instanceof o || te(t) ? t : We(e, t);
		}
		let n = e.mimeType || t.type, i = t.type === n ? t : new Blob([t], { type: n }), s = URL.createObjectURL(i), c = e.mediaKind === "video" ? document.createElement("video") : document.createElement("audio");
		c.src = s, c.preload = "metadata", e.mediaKind === "video" && (c.playsInline = !0);
		let p = He(e, a), m = {
			el: e,
			rect: e.mediaKind === "audio" ? {
				x: p.x + p.w / 2 - Math.max(p.w, 260) / 2,
				y: p.y,
				w: Math.max(p.w, 260),
				h: p.h + 36
			} : p,
			posterRect: p,
			media: c,
			objectUrl: s,
			loadState: "loading",
			detachListeners: () => {}
		}, h = () => {
			u || (m.loadState = "metadata");
		}, g = () => {
			u || (m.loadState = "ready");
		}, _ = () => {
			u || (m.loadState = "error", f(F(e, c, "decode")));
		};
		c.addEventListener("loadedmetadata", h), c.addEventListener("canplay", g), c.addEventListener("error", _), m.detachListeners = () => {
			c.removeEventListener("loadedmetadata", h), c.removeEventListener("canplay", g), c.removeEventListener("error", _);
		}, l.push(m);
		try {
			c.load();
		} catch (t) {
			let n = F(e, c, "load", t);
			throw d(), n;
		}
	}
	let p = null, m = null, h = () => {
		i.setTransform(e.width / r.width, 0, 0, e.height / r.height, 0, 0), i.drawImage(s, 0, 0, e.width, e.height, 0, 0, r.width, r.height);
		for (let e of l) {
			let t = e.media;
			if (e.loadState !== "loading") {
				if (e.loadState === "error") {
					Ue(i, e.posterRect, "Media unavailable");
					continue;
				}
				if (e.el.mediaKind === "video" && t.readyState >= 2) {
					let { x: n, y: r, w: a, h: o } = e.posterRect;
					i.drawImage(t, n, r, a, o);
				}
				if (e === m || y?.state === e) qe(i, e, t);
				else if (t.paused) {
					let { x: t, y: r, w: a, h: o } = e.posterRect;
					n(i, t + a / 2, r + o / 2, a, o, "paused");
				}
			}
		}
	}, g = () => {
		u || (h(), p = requestAnimationFrame(g));
	}, _ = (t, n) => {
		let i = e.getBoundingClientRect();
		return {
			x: (t - i.left) / i.width * r.width,
			y: (n - i.top) / i.height * r.height
		};
	}, v = (e, t) => {
		for (let n of l) {
			let { x: r, y: i, w: a, h: o } = n.rect;
			if (e < r || e > r + a || t < i || t > i + o) continue;
			let s = U(n), c = s.y - 12, l = s.y + s.h + 8;
			return (Number.isFinite(n.media.duration) ? n.media.duration : 0) > 0 && e >= s.x && e <= s.x + s.w && t >= c && t <= l ? {
				kind: "seek",
				state: n,
				fraction: Math.max(0, Math.min(1, (e - s.x) / s.w))
			} : {
				kind: "toggle",
				state: n
			};
		}
		return null;
	}, y = null, b = (e, t) => {
		let n = Number.isFinite(e.media.duration) ? e.media.duration : 0;
		n <= 0 || (e.media.currentTime = n * t);
	}, x = (e) => {
		try {
			e.media.play().catch((t) => {
				f(F(e.el, e.media, "play", t));
			});
		} catch (t) {
			f(F(e.el, e.media, "play", t));
		}
	}, S = (t) => {
		let { x: n, y: r } = _(t.clientX, t.clientY), i = v(n, r);
		i && (i.kind === "seek" ? (y = {
			state: i.state,
			wasPlaying: !i.state.media.paused
		}, i.state.media.pause(), b(i.state, i.fraction), e.setPointerCapture(t.pointerId), t.preventDefault()) : i.state.media.paused ? x(i.state) : i.state.media.pause());
	}, C = (e) => {
		let { x: t, y: n } = _(e.clientX, e.clientY);
		m = null;
		for (let e of l) {
			let { x: r, y: i, w: a, h: o } = e.rect;
			if (t >= r && t <= r + a && n >= i && n <= i + o) {
				m = e;
				break;
			}
		}
		if (y) {
			let e = U(y.state), n = Math.max(0, Math.min(1, (t - e.x) / e.w));
			b(y.state, n);
		}
	}, w = () => {
		m = null;
	}, T = (t) => {
		if (!y) return;
		let { wasPlaying: n, state: r } = y;
		y = null, e.releasePointerCapture(t.pointerId), n && x(r);
	};
	return l.length > 0 && (e.addEventListener("pointerdown", S), e.addEventListener("pointermove", C), e.addEventListener("pointerleave", w), e.addEventListener("pointerup", T), e.addEventListener("pointercancel", T), e.style.cursor = "pointer", g()), {
		play(e) {
			for (let t of l) (!e || t.el.mediaPath === e) && x(t);
		},
		pause(e) {
			for (let t of l) (!e || t.el.mediaPath === e) && t.media.pause();
		},
		destroy() {
			u || (u = !0, p !== null && cancelAnimationFrame(p), e.removeEventListener("pointerdown", S), e.removeEventListener("pointermove", C), e.removeEventListener("pointerleave", w), e.removeEventListener("pointerup", T), e.removeEventListener("pointercancel", T), e.style.cursor = "", d());
		}
	};
}
function He(e, t) {
	return {
		x: P(e.x, t),
		y: P(e.y, t),
		w: P(e.width, t),
		h: P(e.height, t)
	};
}
function Ue(e, t, n) {
	let r = Math.max(10, Math.min(14, t.h * .12));
	e.save(), e.font = `500 ${r}px system-ui, -apple-system, sans-serif`, e.textAlign = "center", e.textBaseline = "middle";
	let i = r + 12, a = Math.min(t.w, Math.max(100, e.measureText(n).width + 24));
	W(e, t.x + (t.w - a) / 2, t.y + (t.h - i) / 2, a, i, i / 2), e.fillStyle = "rgba(20, 20, 20, 0.72)", e.fill(), e.fillStyle = "rgba(255, 255, 255, 0.95)", e.fillText(n, t.x + t.w / 2, t.y + t.h / 2), e.restore();
}
function We(e, t) {
	return /* @__PURE__ */ Error(`Embedded ${e.mediaKind} fetch failed for "${e.mediaPath}" (mime=${e.mimeType || "unknown"}): ${I(t)}`);
}
function F(e, t, n, r) {
	let i = "";
	try {
		i = e.mimeType ? t.canPlayType(e.mimeType) : "";
	} catch {}
	let a = t.error, o = [
		`mime=${e.mimeType || "unknown"}`,
		`canPlayType=${i || "no"}`,
		`readyState=${t.readyState}`,
		`networkState=${t.networkState}`
	];
	a && o.push(`mediaError=${a.code}${a.message ? ` ${a.message}` : ""}`);
	let s = r === void 0 ? "" : `: ${I(r)}`;
	return /* @__PURE__ */ Error(`Embedded ${e.mediaKind} ${n} failed for "${e.mediaPath}" (${o.join("; ")})${s}`);
}
function I(e) {
	return e instanceof Error ? `${e.name || "Error"}${e.message ? `: ${e.message}` : ""}` : String(e);
}
var L = 28, R = 14, Ge = 72, Ke = 10, z = 3;
function qe(e, t, r) {
	let i = Number.isFinite(r.duration) ? r.duration : 0, a = i > 0 ? Math.min(1, r.currentTime / i) : 0, o = t.posterRect;
	n(e, o.x + o.w / 2, o.y + o.h / 2, o.w, o.h, r.paused ? "paused" : "playing"), t.el.mediaKind === "audio" ? Ye(e, t, r, i, a) : Je(e, t, r, i, a);
}
function Je(e, t, n, r, i) {
	let { x: a, y: o, w: s, h: c } = t.rect, l = Math.max(28, Math.min(56, c * .22)), u = o + c - l;
	e.save();
	let d = e.createLinearGradient(0, u, 0, o + c);
	d.addColorStop(0, "rgba(0, 0, 0, 0)"), d.addColorStop(1, "rgba(0, 0, 0, 0.55)"), e.fillStyle = d, e.fillRect(a, u, s, l), e.restore();
	let f = U(t);
	V(e, f, i, r > 0), e.save(), e.font = "500 11px system-ui, -apple-system, sans-serif", e.textBaseline = "middle", e.shadowColor = "rgba(0, 0, 0, 0.75)", e.shadowBlur = 3, e.fillStyle = "rgba(255, 255, 255, 0.95)", B(e, n.currentTime, r, f.x, f.y - 10, "bottom"), e.restore();
}
function Ye(e, t, n, r, i) {
	let a = H(t.rect);
	e.save(), W(e, a.x, a.y, a.w, a.h, a.h / 2), e.fillStyle = "rgba(20, 20, 20, 0.72)", e.fill(), e.font = "500 11px system-ui, -apple-system, sans-serif", e.textBaseline = "middle", e.fillStyle = "rgba(255, 255, 255, 0.95)", B(e, n.currentTime, r, a.x + R, a.y + a.h / 2, "middle"), e.restore(), V(e, U(t), i, r > 0);
}
function B(e, t, n, r, i, a) {
	let o = G(t), s = G(n), c = ze(e), l = N(e, o, c), u = N(e, s, c), d = e.measureText(" / ").width, f = Math.max(l, u);
	Be(e, o, r + f - l, i, c);
	let p = e.textAlign;
	e.textAlign = "left", e.fillText(" / ", r + f, i), e.textAlign = p, Be(e, s, r + f + d, i, c);
}
function V(e, t, n, r) {
	let i = t.h / 2;
	if (e.save(), W(e, t.x, t.y, t.w, t.h, i), e.fillStyle = "rgba(255, 255, 255, 0.35)", e.fill(), n > 0 && (W(e, t.x, t.y, t.w * n, t.h, i), e.fillStyle = "#fff", e.fill()), r) {
		let r = Math.max(t.x + 5, Math.min(t.x + t.w - 5, t.x + t.w * n));
		e.shadowColor = "rgba(0, 0, 0, 0.3)", e.shadowBlur = 3, e.fillStyle = "#fff", e.beginPath(), e.arc(r, t.y + t.h / 2, 5, 0, Math.PI * 2), e.fill();
	}
	e.restore();
}
function H(e) {
	let t = Math.max(220, e.w - 24);
	return {
		x: e.x + e.w / 2 - t / 2,
		y: e.y + e.h - L - 4,
		w: t,
		h: L
	};
}
function U(e) {
	if (e.el.mediaKind === "audio") {
		let t = H(e.rect), n = t.x + R + Ge + Ke, r = Math.max(40, t.x + t.w - R - n);
		return {
			x: n,
			y: t.y + (t.h - z) / 2,
			w: r,
			h: z
		};
	}
	let t = e.rect, n = Math.max(12, t.w * .025), r = Math.max(12, Math.min(18, t.h * .05));
	return {
		x: t.x + n,
		y: t.y + t.h - z - r,
		w: t.w - n * 2,
		h: z
	};
}
function W(e, t, n, r, i, a) {
	let o = Math.min(a, i / 2, r / 2);
	e.beginPath(), e.moveTo(t + o, n), e.lineTo(t + r - o, n), e.quadraticCurveTo(t + r, n, t + r, n + o), e.lineTo(t + r, n + i - o), e.quadraticCurveTo(t + r, n + i, t + r - o, n + i), e.lineTo(t + o, n + i), e.quadraticCurveTo(t, n + i, t, n + i - o), e.lineTo(t, n + o), e.quadraticCurveTo(t, n, t + o, n), e.closePath();
}
function G(e) {
	if (!Number.isFinite(e) || e < 0) return "0:00";
	let t = Math.floor(e);
	return `${Math.floor(t / 60)}:${(t % 60).toString().padStart(2, "0")}`;
}
function K(e) {
	let t = f(e.family);
	return e.presenceOnly ? `presence:${t}` : `${t}:${e.weight ?? 400}:${e.style ?? "normal"}`;
}
async function Xe(e, t, n, r = null) {
	let o = /* @__PURE__ */ new Map();
	for (let n of t) {
		let t = K(n);
		!e.has(t) && !o.has(t) && o.set(t, n);
	}
	if (o.size > 0) {
		let t = n([...o.values()]);
		for (let n of o.keys()) e.set(n, t);
	}
	let s = new Set(t.map((t) => e.get(K(t)))), c = await Promise.all(s), l = Object.assign(i(), ...c.map((e) => e.routes)), u = new Set(c.flatMap((e) => e.installed ?? [])), d = i(), p = /* @__PURE__ */ new Set();
	for (let e of t) {
		let t = f(e.family);
		if (e.presenceOnly) {
			u.has(t) && p.add(t);
			continue;
		}
		let n = Qe(e), r = a(l, n);
		r && (d[n] = r, p.add(t));
	}
	for (let e of Ze(r)) p.delete(e);
	return {
		routes: d,
		installed: [...p].sort()
	};
}
function Ze(e) {
	return !e || typeof e[Symbol.iterator] != "function" ? /* @__PURE__ */ new Set() : new Set([...e].map((e) => f(e.family.replace(/^(['"])(.*)\1$/u, "$2"))));
}
function Qe(e) {
	let t = f(e.family), n = e.weight ?? 400, r = e.style ?? "normal";
	return n === 400 && r === "normal" ? t : `${t}:${n}:${r}`;
}
function $e(e) {
	return [...new Set(e.values())];
}
var q = class {
	#e;
	#t;
	#n;
	#r = 0;
	#i = Promise.resolve();
	#a;
	#o;
	constructor(e) {
		if (!Number.isSafeInteger(e.slideCount) || e.slideCount < 0) throw TypeError("slideCount must be a non-negative safe integer");
		this.#e = e.slideCount, this.#t = e.loadSlide, this.#n = new we({
			maxEntries: e.maxCachedSlides,
			maxWeight: e.maxCachedStructuralBytes,
			measure: (e) => ke(e).jsonBytes
		});
	}
	get slideCount() {
		return this.#e;
	}
	get usage() {
		return this.#n.usage;
	}
	withSlide(e, t) {
		this.#c(e);
		let n = this.#r, r = this.#i.then(async () => {
			if (n !== this.#r) throw this.#a ? this.#a : Error("PPTX slide repository generation is stale");
			if (this.#a) throw this.#a;
			let r = await this.#s(e, n);
			try {
				return await t(r);
			} catch (e) {
				let t = J(e);
				throw t ? (this.#l(t, n), this.#o === n ? this.#a ?? t : t) : e;
			}
		});
		return this.#i = r.then(() => void 0, () => void 0), r;
	}
	async #s(e, t) {
		return this.#n.getOrLoad(e, async () => {
			let n;
			try {
				n = await this.#t(e);
			} catch (e) {
				let n = J(e);
				throw n ? (this.#l(n, t), this.#o === t ? this.#a ?? n : n) : e;
			}
			if (this.#o === t && this.#a) throw this.#a;
			return n;
		});
	}
	clear() {
		this.#r += 1, this.#a = void 0, this.#o = void 0, this.#n.clear();
	}
	#c(e) {
		if (!Number.isSafeInteger(e) || e < 0 || e >= this.#e) throw RangeError(`Slide index ${e} out of range (count: ${this.#e})`);
	}
	#l(e, t) {
		t !== this.#r || this.#a || (this.#a = e, this.#o = t, this.#r += 1, this.#n.clear());
	}
};
function J(e) {
	return e instanceof o ? e : E(e);
}
var Y = "var e=(e,t)=>()=>(e&&(t=e(e=0)),t);const t=new Set([`http:`,`https:`,`file:`,`blob:`]);async function n(e){if(typeof e!=`string`||e.length===0||e.trim()!==e)throw TypeError(`worker sidecar URL must be a nonempty absolute URL`);let n;try{n=new URL(e)}catch{throw TypeError(`worker sidecar URL must be a nonempty absolute URL`)}if(!t.has(n.protocol))throw TypeError(`worker sidecar URL protocol is unsupported`);return import(e)}var r,i,a,o,s,c=e((()=>{r=134217728,i=268435456,a=4096,o=67108864,s=67108864}));\n/*! Symbol encoding table derived from \"Adobe Symbol Encoding to Unicode\"\n* (table version 1.0, 2011 July 12), published by Unicode, Inc. at\n* https://www.unicode.org/Public/MAPPINGS/VENDORS/ADOBE/symbol.txt\n* Its notice, which travels with this data (also in THIRD_PARTY_NOTICES.md):\n*\n* Copyright (c) 1991-2011 Unicode, Inc. All Rights reserved.\n*\n* This file is provided as-is by Unicode, Inc. (The Unicode Consortium). No\n* claims are made as to fitness for any particular purpose. No warranties of\n* any kind are expressed or implied. The recipient agrees to determine\n* applicability of information provided. If this file has been provided on\n* magnetic media by Unicode, Inc., the sole remedy for any claim will be\n* exchange of defective media within 90 days of receipt.\n*\n* Unicode, Inc. hereby grants the right to freely use the information\n* supplied in this file in the creation of products supporting the\n* Unicode Standard, and to make copies of this file in any form for\n* internal or external distribution as long as this notice remains\n* attached.\n*/\nfunction l(e,t){let n={},r=e,i=0;for(let e of t.split(`,`))e&&(i+=Number.parseInt(e,36),n[r]=i),r++;return Object.freeze(n)}var u,d,f=e((()=>{u=l(32,`w,1,6ov,-6ot,6ow,-6ou,1,6p1,-6oz,1,6pa,-6p8,1,6p2,-6p0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,6py,-62c,1,l,-j,1,h,-j,4,2,1k,-1j,1,1,1,2,1,-8,9,2,1,1,t,-p,-b,a,-i,-mz,6op,-6on,6rs,-6rq,,nm,1,l,-j,1,w,-y,4,2,d,-c,1,1,1,2,1,-8,9,2,1,1,h,-d,-b,a,-i,-mz,1,1,6nz,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,-b4,-5p6,5ls,fm,-f4,d6,-6fg,79t,3,-1,-5,-y4,-4,1,1,1,-6hv,1,682,fm,-6mm,6km,-r,-dc,-65n,6ll,1,-p,-f6,,,b3,-3k,-10,b,-4,an,-2,-40,10,1,2h,4,-3,-2,4,-3i,1,n,-p,,,,8,b,4r,-6qh,6m3,1,-2c,-4,1,1,1,s7,-ip,,,,-7s,,,,,,,,,,,,7t,-73,6t,,1,,,,,,,,,`),d={96:8254,189:9168,190:9135,210:174,211:169,212:8482,226:174,227:169,228:8482,230:9115,231:9116,232:9117,233:9121,234:9122,235:9123,236:9127,237:9128,238:9129,239:9130,244:9134,246:9118,247:9119,248:9120,249:9124,250:9125,251:9126,252:9131,253:9132,254:9133}})),p,m,h,g,_=e((()=>{p=`,2r2h,-2jd3,-1,2j4i,7u,1,1,g,-2jcp,2jcs,1,-49,1,1,1,5v,1,d,1,1,-c,-2k0h,2jzv,2,2,1,1,-9,1,-2jdx,6,2jcx,-2jcy,2jcz,-8y,1,-2jaq,2,-1,2jju,-7,-2jiu,2jme,-2jmf,2jca,5q,-am,-2,-2j1l,-5o,2j1i,-2iu6,2j9e,-2jag,2jai,-2jag,1,-6v,5,2jh6,-2jgx,g,1,1,1,1,1,1,1,1,1,1,1,2jod,5,-2jm2,2jdf,-2jia,2jyr,1,-2jpb,1,2jpp,-2j78,-th,b4,2jpf,-2kj6,1oy,-1pd,2jtp,1,hs,1,,-12k,-2idn,1,1,1,1,1,1,1,1,1,2idf,-2ide,1,1,1,1,1,1,1,1,1,2jf3,-2,1,2,-5,-2,1,2,-2khy,-dz,263,1n,2iwe,2,2,1,-gc,-2jkl,2k10,1f,4,-2k00,2k06,4,4,-2,-2iv5,-1q2,1q0,1,2,-x3,6,2ja8,1,1,1,1,1,1,1,1,1,1,1,-2iej,1,1,1,1,1,1,1,2ilv,1,-m,-1,3,-1,-6,1,1,1,-2ka0,-5,1o2,2,-1,2,-j,2,-1,2,2j19,2,-1,2,1,1,2,-1,a,2,-1,2,1,1,2,-1,-2kyg,2,-1,2,1sr,-1sh,1se,-1,3,-1,2j6y,1,-jb,-2jfn,2jfo,2,`,m=`,2r2i,1,1,1,-2jd5,-4,2jcu,-1,20,1,1,1,1,1,1,1,1,-76,7a,3,-v,1,1,1,-b,2,2,-v,1,5,1,1,1,-9f,1,9f,1,1,1,1,1,-9n,1,9n,1,-i,2r,4,-3,-2jms,14c,-14b,14c,1,2io8,-2j2n,2j09,3,-2,1,-2kvq,2kvw,1,1,-l,-2,1,2,-d,-2,1,2,-2jxt,-3u,1,1,1,1,1,1,1,1,1,46,hj,1,1,1,1,1,1,1,1,1,,-ae,2j2k,-2j14,1,1kx,-1eq,2jai,l,1,1,1,1,1,1,1,1,1,1,1,75,1,-2kdg,2klb,-2j9f,-qa,-4,2jzu,2,2,-2kmo,1eu,2j7x,1,-2jyn,-2m,1,2k1c,1,1,1,-2k1d,2k1e,1,1,1,-2iy7,-4,-126,2k0j,-2k0i,2k0j,1,1,1,-2iyc,-3,-125,2k0m,-2k0a,1,16b,1,-b,1,-4i,4j,-4f,-1,4h,1,2iu5,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,2,2,3,1,-2jro,2jrq,2,2,2,-2jrt,2jre,4,-2jrs,2jry,7,-2ivc,1,-2aa,7,,,,,,`,h=`,8kg,2,-1,2,3,1,2,-1,8,2,-1,2,3,2,3,2,-p,1,5,2,-1,2,-w,2b,1,1,1,1,1,1,1,-n,1,1,1,-j,3,-5,1,5,2,-1,2,8,-2,1,-2,-u,1,-1k4,-2v,-x,y,72,-4m,-b7,1xq,2j1k,1,1,1,1,1,1,1,1,1,1,1,-2j,2,-1,2,1,1,2,-1,2,1,-2k6f,a,-9,a,3,-a,b,-a,18,-1,2,1,2jyz,2,-1,,2,-2ita,1,1,1,-18,2,-1,2,2iy9,2,-1,2,1,2,-1,2,1,2,-1,2,1,2,-1,2,-v,2,-1,2,1,2,-1,2,1,2,-1,2,l,2,2,2,2,2,2,34,1,1,1,-35,2,2,2,2,2,2,-1,2,2l,2,-1,2,-2n,2,-1,2,1,2,-1,2,1,2,-1,2,-2izj,1,1,1,1,1,1,1,2j01,2,-1,2,1,1,2,-1,a,2,-1,2,1,1,2,-1,a,2,-1,2,1,1,2,-1,a,2,-1,2,1,2,-1,2,,,,,,,,,,,,,,,`,g=`,2r1z,1,-6,4,-c0,-1c,dt,2p,1,7,1,-jf,2p,kn,-2,-4n,1,1,-2k0z,1,1,1,-d,-1,5,-1,b,1,1,2k0w,p,6l,-ll,1,1,1,2,h,-i,5,-a,7,li,-d2,-8p,31,1,-2s,-9,lr,-lh,lw,-av,-1,-3,-2o,-ac,1,gn,41,-40,-3,1,-2ijb,-w0,2jku,-2is6,2ith,-e3,ej,-2ity,2ira,1j,x,7,60,-gk,-2ij4,2itd,-29,-58,1,-2jd2,2jkv,-2z,6,-2jkq,jp,-1eq,2kgn,-5b,-2k2m,2k2n,3,,5j,1,f,1,-e,-fz,-4y,-2j10,2j0r,a,-2,-6,9,1,ju,-54,76,-fm,-55,58,-21,af,1,1,-2jec,2jbp,1,-2,3,1f,1,1,-1y,-5,25,1,-6r,7b,1,-2t,-44,78,1,-s,-1,-6,-en,-h,-4,1,e,7s,-81,9l,-9k,d,9d,-4,5,-3,-9t,1,9r,-1r,6i,1,1,-1a,-cr,ct,1,-4d,4i,-1,14,1,m,-l,1e,-5m,1,5m,-6w,-1,3z,-gg,1,1,1,-2j39,2j3b,-1,2,1,2,-1,-f,5,q2,4,-nm,-5,nq,-1,-2k20,ca,2jpj,-8u,-dx,gh,1,1,1,77,-iz,-p,-7,-a,-d,h0,2,-1,2,-39,-kt,2,-1,fw`}));function v(e){let t=e?.trim().toLowerCase();return t&&re.has(t)?t:void 0}function y(e){let t={},n=32,r=0;for(let i of e.split(`,`))i&&(r+=Number.parseInt(i,36),t[n]=String.fromCodePoint(r)),n++;return t}function ee(e,t,n){let r=e=>e===void 0?void 0:{text:e,mapped:!0},i=e.codePointAt(0),a=i>=61472&&i<=61695,o=a?i-61440:i;if(!a&&(i<32||i>255))return;let s=oe.get(t)?.[o],c=se.get(t)?.[o];if((s??e)===e&&(c??e)===e)return;let l=n.native?.(e),u=l&&!a&&de.test(e)?String.fromCharCode(61440+o):void 0,d=u!==void 0&&n.keepsShifted?.(u)===!1;if(l&&!d)return u===void 0?void 0:{text:u,mapped:!1};let f=l===void 0?c:s;if(!(f===void 0||f===e)){if(ce.test(f)){let e=f+ue,t=n.monochrome?.(e);return r(t===void 0?l===void 0&&!le.test(f)?e:void 0:t?e:void 0)}return n.monochrome?.(f)===!1?void 0:r(f)}}function te(e,t,n={}){let r=v(t);if(!r||e.length===0)return[{text:e,mapped:!1}];let i=[],a=``,o=null;for(let t of e){let e=ee(t,r,n),s=e?.mapped===!0,c=e?.text??t;o===null||s===o?(o=s,a+=c):(i.push({text:a,mapped:o}),o=s,a=c)}return a.length>0&&i.push({text:a,mapped:o??!1}),i}function ne(e,t,n={}){return te(e,t,n).map(e=>e.text).join(``)}var re,ie,ae,oe,se,ce,le,ue,de,fe=e((()=>{f(),_(),re=new Set([`symbol`,`wingdings`,`wingdings 2`,`wingdings 3`,`webdings`]),ie=Object.freeze(Object.fromEntries(Object.entries({...u,...d}).map(([e,t])=>[Number(e),String.fromCodePoint(t)]))),ae=Object.freeze(y(p)),oe=new Map([[`symbol`,ie],[`wingdings`,ae],[`wingdings 2`,y(m)],[`wingdings 3`,y(h)],[`webdings`,y(g)]]),se=new Map([[`symbol`,Object.fromEntries([163,167,168,169,170,171,172,173,174,175,176,177,179,180,183,184,185].map(e=>[e,ie[e]]))],[`wingdings`,{33:`✏`,34:`✂`,36:`👓`,74:`☺`,75:`😐`,76:`☹`,108:`●`,110:`■`,116:`◆`,118:`❖`,119:`◆`,167:`▪`,223:`←`,224:`→`,225:`↑`,226:`↓`,227:`↖`,228:`↗`,229:`↙`,230:`↘`,251:`✗`,252:`✓`,253:`☒`,254:`☑`}]]),ce=/(?![#*0-9])\\p{Emoji}/u,le=/\\p{Emoji_Presentation}/u,ue=`︎`,de=/[()<>[\\]{}\\u00AB\\u00BB]/u})),b,x,pe=e((()=>{b=class e extends Error{code;details;violation;constructor(t,n,r){super(n),this.name=`OoxmlError`,this.code=t,t===`unsupported-content`&&r&&`format`in r&&(this.details=Object.freeze({format:r.format,reason:r.reason})),t===`font-source-limit`&&r&&`quota`in r&&(this.violation=Object.freeze({resource:`font-source`,quota:r.quota,metric:r.metric,limit:r.limit,observed:r.observed})),Object.setPrototypeOf(this,e.prototype)}},x=class e extends Error{code=`ooxml-resource-limit`;details;constructor(t,n){super(t),this.name=`OoxmlResourceLimitError`;let r=n.violation,i=Object.freeze({format:r.format,operation:r.operation,resource:r.resource,metric:r.metric,...r.part===void 0?{}:{part:r.part},limit:r.limit,observed:r.observed,configurable:r.configurable,usage:Object.freeze({archiveEntryCount:r.usage.archiveEntryCount,declaredInflatedBytes:r.usage.declaredInflatedBytes,...r.usage.largestInflatedEntryBytes===void 0?{}:{largestInflatedEntryBytes:r.usage.largestInflatedEntryBytes},distinctInflatedBytes:r.usage.distinctInflatedBytes,operationInflatedBytes:r.usage.operationInflatedBytes})});this.details=Object.freeze({stage:n.stage,violation:i}),Object.setPrototypeOf(this,e.prototype)}}}));function me(){if(ge!==void 0)return ge;let e=null;try{typeof Intl<`u`&&typeof Intl.Segmenter==`function`&&(e=new Intl.Segmenter(void 0,{granularity:`grapheme`}))}catch{e=null}return ge=e,e}function he(e){if(_e.test(e)&&!e.includes(`\\r\n`)){let t=Array(Math.max(0,e.length-1));for(let n=1;n<e.length;n+=1)t[n-1]=n;return t}let t=me();if(t)try{let n=[];for(let r of t.segment(e))r.index>0&&n.push(r.index);return n}catch{}let n=[];for(let t=0;t<e.length;){let r=e.codePointAt(t);t+=r>65535?2:1,t<e.length&&n.push(t)}return n}var ge,_e,ve=e((()=>{_e=/^[\\u0000-\\u00ff\\u3000-\\u3029\\u3030-\\u303f\\u3041-\\u3096\\u309b-\\u30ff\\u3400-\\u4dbf\\u4e00-\\u9fff\\uff01-\\uff9d]*$/}));function ye(e,t){for(let n of t)if(!(we.test(n)||Ce.test(n)))switch(e){case`arabic`:return De.test(n)?`proof`:Ee.test(n)?Te.test(n)?`proof`:`extension`:Te.test(n)?`neutral`:`other`}return`neutral`}function be(e,t,n){let r=[...new Set([0,...he(t),t.length])].sort((e,t)=>e-t),i=r.slice(0,-1).map((i,a)=>{let o=r[a+1],s=ye(e,t.slice(i,o));return{start:i,end:o,cls:s!==`neutral`&&s!==`other`&&n&&!n(i,o)?`other`:s}}),a=[],o=0;for(;o<i.length;){if(i[o].cls===`other`){a.push({...i[o],inScope:!1}),o+=1;continue}let e=o;for(;e<i.length&&i[e].cls!==`other`;)e+=1;let t=i.slice(o,e).some(e=>e.cls===`proof`),n=!1;for(let r=o;r<e;r+=1){let e=i[r],o=t&&(e.cls===`neutral`?n:!0);a.push({...e,inScope:o}),n=o}o=e}return a}function xe(e,t,n){let r=be(e,t),i=r.some(e=>e.cls===`proof`);return n===`any`?i:i&&r.every(e=>e.cls!==`other`)}function Se(e,t,n){return!e?.script||xe(e.script,t,n)}var S,Ce,we,Te,Ee,De,Oe=e((()=>{ve(),S=Object.freeze([`arabic`]),Ce=/^\\p{Cf}$/u,we=/^\\s$/u,Te=/^\\p{M}$/u,Ee=/^\\p{Script_Extensions=Arabic}$/u,De=/^(?=\\p{Script=Arabic})\\p{L}$/u}));function C(e){if(!e)return null;let t=e.trim(),n=t.toLowerCase(),r=n.match(/^noto\\s+(?:sans|serif)\\s+(?:cjk\\s+)?(sc|tc|hk|jp|kr)$/);return r?r[1]:/[ᄀ-ᇿ㄰-㆏가-힯]/.test(t)?`kr`:/[぀-ヿ]/.test(t)?`jp`:/jhenghei|微軟正黑|新細明|細明|pmingliu|mingliu|dfkai|標楷|華康|cns11643|kaiti tc|ming\\s*liu/.test(n)||/新細明體|細明體|標楷體|微軟正黑體|華康/.test(t)?`tc`:/simsun|nsimsun|simhei|simkai|simfang|yahei|dengxian|fangsong|kaiti|youyuan|lisu|stsong|stkaiti|stfangsong|stheiti|stxihei|stzhongsong|songti sc|heiti sc|微软雅黑/.test(n)||/宋体|黑体|楷体|仿宋|等线|微软雅黑|隶书|幼圆/.test(t)?`sc`:/malgun|batang|gulim|dotum|gungsuh|nanum|new gulim|hancom|hy(gothic|graphic|namu)?/.test(n)?`kr`:/\\bmeiryo\\b|\\byu\\s*(gothic|mincho)\\b|yugothic|yumincho|hiragino|\\bms\\s*(gothic|mincho|pgothic|pmincho|ui\\s*gothic)\\b|\\bms[pg]?(gothic|mincho)\\b|ipa(ex)?(gothic|mincho)|noto\\s+(sans|serif)\\s+jp|游ゴシック|游明朝|ＭＳ|メイリオ|ヒラギノ/.test(n)||/游ゴシック|游明朝|ＭＳ ゴシック|ＭＳ 明朝|ＭＳ Ｐゴシック|メイリオ|ヒラギノ/.test(t)?`jp`:null}function ke(e){return/\\p{Script=Han}/u.test(e)}function Ae(e,t,n=!1){let r=new je(t);return r.addText(e),r.names(n)}var je,Me=e((()=>{je=class e{cjkLang;hasHan=!1;hasHangul=!1;hasKana=!1;hasArabic=!1;hasThai=!1;hasHebrew=!1;hasDevanagari=!1;hasCyrGreek=!1;constructor(e){this.cjkLang=e}scriptCjkLanguage(){return this.hasHangul?`kr`:this.hasKana?`jp`:null}preferredCjkLanguage(){return this.scriptCjkLanguage()??this.cjkLang??`jp`}clone(){let t=new e(this.cjkLang);return t.hasHan=this.hasHan,t.hasHangul=this.hasHangul,t.hasKana=this.hasKana,t.hasArabic=this.hasArabic,t.hasThai=this.hasThai,t.hasHebrew=this.hasHebrew,t.hasDevanagari=this.hasDevanagari,t.hasCyrGreek=this.hasCyrGreek,t}addText(e){let t=()=>this.hasHan&&this.hasHangul&&this.hasKana&&this.hasArabic&&this.hasThai&&this.hasHebrew&&this.hasDevanagari&&this.hasCyrGreek;outer:for(let n of e)if(n)for(let e of n){let n=e.codePointAt(0);if(n!==void 0&&!(n<=591)&&(n>=4352&&n<=4607||n>=12592&&n<=12687||n>=44032&&n<=55215?this.hasHangul=!0:n>=12352&&n<=12543?this.hasKana=!0:ke(e)?this.hasHan=!0:n>=1536&&n<=1791||n>=1872&&n<=1919||n>=2208&&n<=2303||n>=64336&&n<=65023||n>=65136&&n<=65279?this.hasArabic=!0:n>=3584&&n<=3711?this.hasThai=!0:n>=1424&&n<=1535||n>=64285&&n<=64335?this.hasHebrew=!0:n>=2304&&n<=2431?this.hasDevanagari=!0:(n>=1024&&n<=1279||n>=880&&n<=1023)&&(this.hasCyrGreek=!0),t()))break outer}}names(e=!1){let t=[],n=new Set;this.hasHangul&&n.add(`kr`),this.hasKana&&n.add(`jp`),this.hasHan&&(n.size===0||e)&&n.add(this.cjkLang??`jp`);for(let e of[`kr`,`sc`,`tc`,`hk`,`jp`])if(n.has(e)){let n={kr:`KR`,sc:`SC`,tc:`TC`,hk:`HK`,jp:`JP`}[e];t.push(`Noto Sans ${n}`),e!==`hk`&&t.push(`Noto Serif ${n}`)}return this.hasCyrGreek&&t.push(`Noto Sans`,`Noto Serif`),this.hasArabic&&t.push(`Noto Naskh Arabic`,`Noto Sans Arabic`),this.hasThai&&t.push(`Noto Sans Thai`),this.hasHebrew&&t.push(`Noto Sans Hebrew`,`Noto Serif Hebrew`),this.hasDevanagari&&t.push(`Noto Sans Devanagari`),t}}}));function Ne(e){return e===`image-dimension`||e===`image-pixels`||e===`active-decoded-bytes`||e===`image-effect-count`||e===`image-effect-work`||e===`tiff-lzw-work`||e===`metafile-path-commands`||e===`metafile-record-points`||e===`metafile-record-polygons`||e===`metafile-record-rectangles`||e===`metafile-record-text-units`}function Pe(e){return typeof e==`number`&&Number.isSafeInteger(e)&&e>=0}function Fe(e){if(!(!e||typeof e!=`object`))try{let t=e,n=t.code,r=t.metric,i=t.limit,a=t.observed;return n!==`ooxml-decoded-image-limit`||!Ne(r)||!Pe(i)||!Pe(a)||a<=i?void 0:{metric:r,limit:i,observed:a}}catch{return}}var Ie,Le,Re,ze,Be,Ve=e((()=>{Ie=1<<25,Le=1<<27,Ie*4,Le*4,Re=Math.floor(Ie/4),ze=Le,ze/Re,Be=class e extends RangeError{metric;limit;observed;code=`ooxml-decoded-image-limit`;constructor(t,n,r){super(`OOXML decoded image limit exceeded: ${t} ${r} > ${n}`),this.metric=t,this.limit=n,this.observed=r,this.name=`OoxmlDecodedImageLimitError`,Object.setPrototypeOf(this,e.prototype)}}}));function He(e){return Object.freeze(e.map(e=>Object.freeze({...e})))}function Ue(e){return e.trim().replace(/^(['\"])(.*)\\1$/s,`$2`).trim().toLocaleLowerCase(`en-US`)}var We=e((()=>{He([{for:`Calibri`,use:`Carlito`},{for:`Cambria`,use:`Caladea`},{for:`Franklin Gothic Book`,use:`Libre Franklin`},{for:`Franklin Gothic Medium`,use:`Libre Franklin`},{for:`Sakkal Majalla`,use:`Noto Naskh Arabic`,script:`arabic`},{for:`Traditional Arabic`,use:`Noto Naskh Arabic`,script:`arabic`},{for:`Simplified Arabic`,use:`Noto Naskh Arabic`,script:`arabic`},{for:`Arabic Typesetting`,use:`Noto Naskh Arabic`,script:`arabic`},{for:`Univers Next Arabic`,use:`Noto Sans Arabic`,script:`arabic`}])}));function Ge(e){if(!(typeof e!=`object`||!e))try{let t=e,n=t.code,r=t.message;return n===`ooxml-tiff-decode`&&typeof r==`string`?{message:r}:void 0}catch{return}}var Ke,qe=e((()=>{Ke=class e extends Error{code=`ooxml-tiff-decode`;constructor(t,n){super(t,n),this.name=`TiffDecodeError`,Object.setPrototypeOf(this,e.prototype)}}}));function Je(e){if(!e.startsWith(`data:`))return null;let t=e.indexOf(`,`);if(t===-1)return null;let n=atob(e.slice(t+1)),r=new Uint8Array(n.length);for(let e=0;e<n.length;e++)r[e]=n.charCodeAt(e);return r.buffer}var Ye=e((()=>{}));function Xe(e){return typeof e==`number`&&Number.isSafeInteger(e)&&e>=0}function Ze(e){return`Font source limit exceeded (${e.quota}): ${e.metric} ${e.observed} > ${e.limit}`}function Qe(e){if(!e||typeof e!=`object`||Array.isArray(e))return;let{resource:t,quota:n,metric:r,limit:i,observed:a}=e;if(t!==`font-source`||typeof n!=`string`||!Object.prototype.hasOwnProperty.call(w,n))return;let o=n;if(!(r!==w[o]||!Xe(i)||!Xe(a)||a<=i))return{resource:t,quota:o,metric:w[o],limit:i,observed:a}}var w,$e=e((()=>{w={stylesheet:`bytes`,declarations:`entry-count`,families:`entry-count`,face:`bytes`,retained:`bytes`,url:`length`}}));function et(e){return typeof e==`number`&&Number.isSafeInteger(e)&&e>0}function tt(e){if(!e||typeof e!=`object`||Array.isArray(e))return!1;let t=e;return et(t.requiredBytes)&&et(t.offeredBytes)&&t.requiredBytes>t.offeredBytes}function nt(e){if(e instanceof T)return e;let t=e instanceof Error?e.message:String(e);if(!t.startsWith(at))return;let n;try{n=JSON.parse(t.slice(26))}catch{return}if(!n||typeof n!=`object`||Array.isArray(n))return;let r=n;if(!(r.code!==`ooxml-insufficient-credit`||!tt(r)))return new T(r)}function rt(e,t,n){let r=nt(e);if(!(!r||r.offeredBytes!==t||r.requiredBytes>n))return r}var it,at,T,ot=e((()=>{it=`ooxml-insufficient-credit`,at=`OOXML_INSUFFICIENT_CREDIT:`,T=class e extends RangeError{code=it;requiredBytes;offeredBytes;constructor(t){super(`Pull unit requires ${t.requiredBytes} bytes but credit is ${t.offeredBytes}`),this.name=`PullSessionInsufficientCreditError`,this.requiredBytes=t.requiredBytes,this.offeredBytes=t.offeredBytes,Object.setPrototypeOf(this,e.prototype)}}}));function E(e){return typeof e==`number`&&Number.isSafeInteger(e)&&e>=0}function st(e){if(!e||typeof e!=`object`||Array.isArray(e))return!1;let t=e;return E(t.archiveEntryCount)&&E(t.declaredInflatedBytes)&&(t.largestInflatedEntryBytes===void 0||E(t.largestInflatedEntryBytes))&&E(t.distinctInflatedBytes)&&E(t.operationInflatedBytes)}function ct(e){let t;try{t=JSON.parse(new TextDecoder().decode(e))}catch{throw TypeError(`OOXML resource usage checkpoint is not valid JSON`)}if(!st(t))throw TypeError(`OOXML resource usage checkpoint is invalid`);return t}function lt(e){return e===`docx`||e===`xlsx`||e===`pptx`}function ut(e){return e===`container`||e===`decompression`||e===`parsing`||e===`serialization`||e===`layout`||e===`rendering`||e===`worker`}function D(e,t){return typeof e==`string`&&e.length>0&&e.length<=t&&!/[\\u0000-\\u001f\\u007f]/u.test(e)}function O(e){return D(e,A)&&/^[a-z0-9][a-z0-9-]*$/u.test(e)}function dt(e){return!D(e,Mt)||e.startsWith(`/`)||e.startsWith(`\\\\`)||e.includes(`\\\\`)||e.includes(`?`)||e.includes(`#`)||e.includes(`://`)||/^[a-z]:/iu.test(e)?!1:e.split(`/`).every(e=>e!==``&&e!==`.`&&e!==`..`)}function ft(e){if(!e||typeof e!=`object`||Array.isArray(e))return!1;let t=e;return!lt(t.format)||!D(t.operation,jt)||!O(t.resource)||!O(t.metric)||!E(t.limit)||!E(t.observed)||typeof t.configurable!=`boolean`||!st(t.usage)?!1:!(`part`in t)||dt(t.part)}function pt(e){if(!e||typeof e!=`object`||Array.isArray(e))return!1;let t=e;if(!ut(t.stage)||!ft(t.violation))return!1;let n=t.violation,r=Nt.get(`${n.resource}:${n.metric}`);return r?t.stage!==r.stage||r.configurable===!1&&n.configurable!==!1?!1:r.part===`required`?n.part!==void 0:r.part===`forbidden`?n.part===void 0:!0:!(Pt.has(n.resource)&&Ft.has(n.metric))}function mt(e){return{archiveEntryCount:e.archiveEntryCount,declaredInflatedBytes:e.declaredInflatedBytes,...e.largestInflatedEntryBytes===void 0?{}:{largestInflatedEntryBytes:e.largestInflatedEntryBytes},distinctInflatedBytes:e.distinctInflatedBytes,operationInflatedBytes:e.operationInflatedBytes}}function ht(e){if(!pt(e))return;let t=e.violation,n={stage:e.stage,violation:{format:t.format,operation:t.operation,resource:t.resource,metric:t.metric,...t.part===void 0?{}:{part:t.part},limit:t.limit,observed:t.observed,configurable:t.configurable,usage:mt(t.usage)}};return pt(n)?n:void 0}function gt(e){let t=e.violation;return`OOXML resource limit exceeded${t.part?` for ${t.part}`:``} (${t.resource}, ${e.stage}): ${t.metric} ${t.observed} > ${t.limit}`}function _t(e){let t=e instanceof Error?e.message:String(e);if(!t.startsWith(kt))return;let n;try{n=JSON.parse(t.slice(21))}catch{return}if(!n||typeof n!=`object`)return;let r=n;if(!(r.code!==`ooxml-resource-limit`||!pt(r.details)))return new x(gt(r.details),r.details)}function vt(e){try{return e()}catch(e){throw e instanceof x||typeof e!=`string`&&!(e instanceof Error)?e:_t(e)??e}}function yt(e){let t=e instanceof Error?e.message:String(e);if(t.startsWith(At))return new b(`not-ooxml`,`This file is not an Office Open XML document: ${t.slice(16)}`)}function bt(e){if(!e||typeof e!=`object`||Array.isArray(e))return;let t=e,n=t.format,r=t.reason;if(!(!O(n)||r!==`source-subset`))return{format:n,reason:r}}function xt(e){return new b(`unsupported-content`,`Input is outside the source’s supported subset.`,e)}function St(e){let t=typeof e==`string`?e:e instanceof Error?e.message:``;if(!(!t.startsWith(`MODEL_SOURCE_UNSUPPORTED:`)||t.length>1024))try{let e=bt(JSON.parse(t.slice(25)));return e?xt(e):void 0}catch{return}}function Ct(e){return e===`OOXML_SOURCE_UNSUPPORTED_ENCRYPTION`||e instanceof Error&&e.message===`OOXML_SOURCE_UNSUPPORTED_ENCRYPTION`?new b(`unsupported-encryption`,`The configured source cannot decrypt this input.`):St(e)??_t(e)??yt(e)}function wt(e){let t=Fe(e);if(t){let e=new Be(t.metric,t.limit,t.observed);return{message:e.message,errorName:e.name,code:e.code,decodedImage:t}}let n=Ge(e);if(n)return{message:n.message,errorName:`TiffDecodeError`,code:`ooxml-tiff-decode`};let r=nt(e);if(r)return{message:r.message,errorName:r.name,code:r.code,insufficientCredit:{requiredBytes:r.requiredBytes,offeredBytes:r.offeredBytes}};let i=e instanceof b||e instanceof x?e:Ct(e),a=i??e;if(i instanceof x||a&&typeof a==`object`&&a.code===`ooxml-resource-limit`){let e=a,t=ht(e.details);return t?{message:typeof e.message==`string`?e.message:gt(t),errorName:`OoxmlResourceLimitError`,code:`ooxml-resource-limit`,resourceLimit:t}:{message:`Invalid OOXML resource-limit error payload`,errorName:`Error`}}if(a&&typeof a==`object`&&a.code===`unsupported-content`){let e=bt(a.details);return e?{message:xt(e).message,code:`unsupported-content`,unsupportedContent:e}:{message:`Invalid unsupported-content error payload`,errorName:`Error`}}if(a&&typeof a==`object`&&a.code===`font-source-limit`){let e=Qe(a.violation);return e?{message:Ze(e),errorName:`OoxmlError`,code:`font-source-limit`,fontSourceLimit:e}:{message:`Invalid font-source-limit error payload`,errorName:`Error`}}if(i instanceof b)return{message:typeof i.message==`string`?i.message:String(i.message),errorName:D(i.name,A)?i.name:`OoxmlError`,...O(i.code)?{code:i.code}:{}};let o=e instanceof Error?e.message:String(e);if(typeof o==`string`&&o.startsWith(kt))return{message:`Invalid OOXML resource-limit payload`,errorName:`Error`};let s=e instanceof Error?e:Error(o),c=s;return{message:typeof s.message==`string`?s.message:String(s.message),errorName:D(s.name,A)?s.name:`Error`,...typeof c.code==`string`?{code:c.code}:{}}}function k(e){try{return wt(e)}catch{return{message:`Worker operation failed with an unreadable error`,errorName:`Error`}}}function Tt(e){return typeof e==`string`&&Object.prototype.hasOwnProperty.call(Lt,e)}function Et(e,t){if(e!==`ooxml-decoded-image-limit`||!t||typeof t!=`object`)return;let n=t,r=n.metric,i=n.limit,a=n.observed;if(!(!Tt(r)||!E(i)||!E(a)||a<=i))return{metric:r,limit:i,observed:a}}function Dt(e){let t=e.message,n=e.errorName,r=e.code,i=e.decodedImage,a=e.insufficientCredit,o=e.resourceLimit,s=e.unsupportedContent,c=e.fontSourceLimit,l=typeof t==`string`?t:`Worker operation failed with an invalid error payload`,u=D(n,A)?n:void 0,d=typeof r==`string`?r:void 0;if(d===`unsupported-content`){let e=bt(s);return e?xt(e):Error(`Invalid unsupported-content error payload`)}if(d===`font-source-limit`){let e=Qe(c);return e?new b(`font-source-limit`,Ze(e),e):Error(`Invalid font-source-limit error payload`)}let f=Et(d,i);if(f)return new Be(f.metric,f.limit,f.observed);if(d===`ooxml-tiff-decode`)return new Ke(l);if(d===`ooxml-insufficient-credit`&&tt(a))return new T(a);if(d===`ooxml-resource-limit`&&pt(o))return new x(l,o);if(d&&It.has(d))return new b(d,l);let p=u===`TypeError`?TypeError(l):u===`RangeError`?RangeError(l):Error(l);return u&&(p.name=u),d!==void 0&&Object.assign(p,{code:d}),p}function Ot(e){try{return Dt(e)}catch{return Error(`Worker operation failed with an unreadable error payload`)}}var kt,At,A,jt,Mt,Nt,Pt,Ft,It,Lt,Rt=e((()=>{pe(),$e(),Ve(),qe(),ot(),kt=`OOXML_RESOURCE_LIMIT:`,At=`OOXML_NOT_OOXML:`,A=128,jt=256,Mt=4096,Nt=new Map([[`archive-entry:declared-inflated-bytes`,{stage:`container`,part:`required`}],[`archive-entry:actual-inflated-bytes`,{stage:`decompression`,part:`required`}],[`archive:entry-count`,{stage:`container`,part:`forbidden`}],[`archive:central-directory-bytes`,{stage:`container`,part:`forbidden`,configurable:!1}],[`archive:distinct-inflated-bytes`,{stage:`decompression`,part:`required`}],[`xml-event:bytes`,{stage:`parsing`,part:`optional`,configurable:!1}],[`xml-context:bytes`,{stage:`parsing`,part:`optional`,configurable:!1}],[`image-effect:work`,{stage:`parsing`,part:`forbidden`,configurable:!1}],[`chartex-allocation:elements`,{stage:`parsing`,part:`forbidden`,configurable:!1}],[`chartex-allocation:bytes`,{stage:`parsing`,part:`forbidden`,configurable:!1}],[`chart-cache:points`,{stage:`parsing`,part:`forbidden`,configurable:!1}],[`numbering-marker:bytes`,{stage:`parsing`,part:`forbidden`,configurable:!1}],[`chart-style-formats:entries`,{stage:`parsing`,part:`required`,configurable:!1}],[`chart-custom-number-formats:entries`,{stage:`parsing`,part:`required`,configurable:!1}],[`chart-number-format-bytes:bytes`,{stage:`parsing`,part:`required`,configurable:!1}],[`xml-tree:depth`,{stage:`parsing`,part:`optional`,configurable:!1}],[`worksheet-row:projected-bytes`,{stage:`parsing`,part:`optional`,configurable:!1}],[`worksheet-shell:projected-bytes`,{stage:`parsing`,part:`optional`,configurable:!1}],[`theme-style-reparse:bytes`,{stage:`parsing`,part:`forbidden`,configurable:!1}],[`style-inheritance:depth`,{stage:`parsing`,part:`required`,configurable:!1}],[`complex-field:depth`,{stage:`parsing`,part:`forbidden`,configurable:!1}]]),Pt=new Set([...Nt.keys()].map(e=>e.slice(0,e.indexOf(`:`)))),Ft=new Set([...Nt.keys()].map(e=>e.slice(e.indexOf(`:`)+1))),It=new Set([`encrypted`,`invalid-password`,`unsupported-encryption`,`legacy-binary-format`,`not-ooxml`,`invalid-numbering`,`unsupported-image-effect`]),Lt={\"image-dimension\":!0,\"image-pixels\":!0,\"active-decoded-bytes\":!0,\"image-effect-count\":!0,\"image-effect-work\":!0,\"tiff-lzw-work\":!0,\"metafile-path-commands\":!0,\"metafile-record-points\":!0,\"metafile-record-polygons\":!0,\"metafile-record-rectangles\":!0,\"metafile-record-text-units\":!0}})),zt,Bt=e((()=>{zt=class{initialize;reinitialize;normalizeFailure;state=`uninitialized`;generationValue=0;readiness;poisonListeners=new Set;constructor(e,t,n){this.initialize=e,this.reinitialize=t,this.normalizeFailure=n}get generation(){return this.generationValue}get poisoned(){return this.state===`poisoned`}onPoison(e){return this.poisonListeners.add(e),()=>this.poisonListeners.delete(e)}async ensureReady(){if(this.state!==`ready`){if(!this.readiness){let e=this.state===`uninitialized`?this.initialize:this.reinitialize;this.readiness=Promise.resolve().then(e).then(()=>{this.generationValue+=1,this.state=`ready`,this.readiness=void 0},e=>{throw this.readiness=void 0,e})}await this.readiness}}run(e){try{return e()}catch(e){let t=this.normalizeFailure(e);throw t?(this.poison(t),t):e}}tryRunReady(e){if(this.state!==`ready`)return{current:!1};let t=this.generationValue,n=this.run(e);return this.state!==`ready`||t!==this.generationValue?{current:!1}:{current:!0,generation:t,value:n}}poison(e){this.state=`poisoned`,this.readiness=void 0;for(let t of this.poisonListeners)t(e)}assertCurrent(e){if(this.state!==`ready`||e!==this.generationValue)throw Error(`WASM archive session belongs to a discarded runtime generation`)}}}));function Vt(e){let t=globalThis.WebAssembly?.RuntimeError;return t&&e instanceof t||e instanceof RangeError?!0:e instanceof Error?e.name===`RuntimeError`||e.name===`CompileError`||e.name===`LinkError`||e.name===`InternalError`||e.name===`OOMError`:!1}function Ht(e){try{if((typeof e!=`object`||!e)&&typeof e!=`function`)return;let t=Reflect.get(e,`__destroy_into_raw`);typeof t==`function`&&Reflect.apply(t,e,[])}catch{}}function Ut(e,t){return e({module_or_path:t})}function Wt(e){return Vt(e)?new Gt(`WASM parser trapped and was recycled: ${e instanceof Error?e.message:String(e)}`):null}var Gt,Kt,qt=e((()=>{Rt(),Bt(),Gt=class e extends Error{code=`parser-crashed`;constructor(t){super(t),this.name=`WasmTrapError`,Object.setPrototypeOf(this,e.prototype)}},Kt=class{init;options;runtime;wasmInput=null;currentArchive=null;constructor(e,t={}){this.init=e,this.options=t,this.runtime=new zt(()=>this.invokeConfigured(this.init),()=>this.invokeConfigured(this.options.reinit??this.init),Wt),this.runtime.onPoison(()=>this.dropPoisonedArchive())}setWasmInput(e){this.wasmInput=e,this.runtime.ensureReady().catch(()=>void 0)}setWasmUrl(e){this.setWasmInput(e)}get archive(){return this.currentArchive}setArchive(e){this.freeArchive(),this.currentArchive=e}disposeArchive(){this.freeArchive()}get poisoned(){return this.runtime.poisoned}async ensureReady(){await this.runtime.ensureReady()}run(e){return vt(()=>this.runtime.run(e))}poison(){this.runtime.poison(new Gt(`WASM parser was recycled`))}invokeConfigured(e){return this.wasmInput===null?Promise.reject(Error(`WasmParserHost: setWasmInput was never called`)):Ut(e,this.wasmInput)}freeArchive(){this.currentArchive!==null&&this.options.freeArchive&&this.options.freeArchive(this.currentArchive),this.currentArchive=null}dropPoisonedArchive(){let e=this.currentArchive;this.currentArchive=null,Ht(e)}}}));function Jt(e){return e.byteOffset===0&&e.byteLength===e.buffer.byteLength&&e.buffer instanceof ArrayBuffer?e.buffer:e.slice().buffer}var Yt=e((()=>{}));function Xt(e){return[e.maxArchiveEntryBytes===null?0n:BigInt(e.maxArchiveEntryBytes),e.maxTotalInflatedBytes===null?0n:BigInt(e.maxTotalInflatedBytes),e.maxArchiveEntries===null?0n:BigInt(e.maxArchiveEntries)]}var Zt=e((()=>{c(),Object.freeze({maxArchiveEntryBytes:r,maxTotalInflatedBytes:i,maxArchiveEntries:a})}));function j(e,t){if(!Number.isSafeInteger(e)||e<=0)throw RangeError(`${t} must be a positive safe integer`)}function Qt(e){if(!(typeof e==`string`&&e.length>0||typeof e==`number`&&Number.isSafeInteger(e)&&e>0))throw RangeError(`session id must be a non-empty string or positive safe integer`)}var M,$t,en,tn=e((()=>{Rt(),ot(),M=`ooxml-pull-v1`,$t=class{owner;queue=Promise.resolve();leases=new Map;retainedBytes=0;retainedCount=0;maxRetainedBytes;maxRetainedCount;cleanups=new Set;pendingFatalCleanups=[];poisonRunning=!1;fatal;constructor(e){this.maxRetainedBytes=e?.maxRetainedBytes??64*1024*1024,this.maxRetainedCount=e?.maxRetainedCount??256,j(this.maxRetainedBytes,`max retained lease bytes`),j(this.maxRetainedCount,`max retained lease count`)}enqueue(e){let t=this.queue.then(e,e);return this.queue=t.then(()=>void 0,()=>void 0),t}acquire(e){return this.owner===void 0?(this.owner=e,!0):this.owner===e}release(e){this.owner===e&&(this.owner=void 0)}retainLease(e,t,n){if(!Number.isSafeInteger(n)||n<0)throw RangeError(`retained lease bytes are invalid`);let r=this.leases.get(e)??new Map;if(r.has(t))throw Error(`driver returned a duplicate lease id`);if(this.retainedCount+1>this.maxRetainedCount)throw RangeError(`retained lease count exceeds limit`);if(this.retainedBytes+n>this.maxRetainedBytes)throw RangeError(`retained lease bytes exceed limit`);r.set(t,n),this.leases.set(e,r),this.retainedCount++,this.retainedBytes+=n}releaseLease(e,t){let n=this.leases.get(e),r=n?.get(t);r!==void 0&&(n?.delete(t),n?.size===0&&this.leases.delete(e),this.retainedCount--,this.retainedBytes-=r)}registerCleanup(e){return this.fatal?(this.poisonRunning?this.pendingFatalCleanups.push(e):this.enqueue(e).catch(()=>void 0),()=>void 0):(this.cleanups.add(e),()=>this.cleanups.delete(e))}get fatalError(){return this.fatal}get registeredHostCount(){return this.cleanups.size}async poison(e){if(this.fatal??=e,this.poisonRunning)return this.fatal;this.poisonRunning=!0,this.pendingFatalCleanups.push(...this.cleanups);try{let e;for(;(e=this.pendingFatalCleanups.shift())!==void 0;)await e().catch(()=>void 0)}finally{this.poisonRunning=!1}return this.fatal}},en=class{options;coordinator;coordinatorOwner=Symbol(`pull-session-host`);unregisterCleanup;sequence=0;unacked;leases=new Map;activeDriverLeases=new Set;nextWireLeaseId;cancelRequested=!1;cancelComplete=!1;closeRequested=!1;closeComplete=!1;driverCancelComplete=!1;driverCloseComplete=!1;completed=!1;constructor(e){Qt(e.sessionId),j(e.operationId,`operation id`),j(e.generation,`generation`),j(e.maxByteCredit,`max byte credit`),e.wireLeaseIdStart!==void 0&&j(e.wireLeaseIdStart,`wire lease id start`),this.options=e,this.coordinator=e.coordinator,this.nextWireLeaseId=e.wireLeaseIdStart??1,this.unregisterCleanup=this.coordinator.registerCleanup(()=>this.forceFatalCleanup())}dispatch(e,t){return this.coordinator.enqueue(async()=>{let n=await this.execute(e);try{t(n.response,n.transfer)}catch(e){throw await this.rollbackFailedPost(n),e}})}async rollbackFailedPost(e){let t=e.response;if(t.kind===`chunk`){let n=t.leaseId===void 0?void 0:this.leases.get(t.leaseId);try{await this.options.driver.disposeInvalidChunk?.({payload:t.payload,byteLength:t.byteLength,done:t.done,leaseId:n?.driverLeaseId,retainedBytes:n?.retainedBytes,transfer:e.transfer})}catch{}}this.unacked=void 0,this.coordinator.release(this.coordinatorOwner);for(let[e,t]of[...this.leases])try{await this.options.driver.releaseLease?.(t.driverLeaseId)}catch{}finally{this.leases.delete(e),this.activeDriverLeases.delete(t.driverLeaseId),this.coordinator.releaseLease(this.coordinatorOwner,e)}if(this.cancelRequested=!0,!this.driverCancelComplete)try{await this.options.driver.cancel?.(),this.driverCancelComplete=!0}catch{}this.unregisterCleanup()}async execute(e){try{if(this.isStaleLifecycle(e)){let t=e.kind===`cancel`?`cancel`:`close`;return this.sameOperationIdentity(e)?{response:this.accepted(e,t,!0)}:{response:this.errorResponse(e,{message:`stale lifecycle targets another session or operation`,errorName:`PullSessionProtocolError`,code:`ooxml-stale-lifecycle`})}}this.validateCommandIdentity(e);let t=this.coordinator.fatalError;if(t)return e.kind===`pull`?{response:this.errorResponse(e,t)}:(e.kind===`cancel`?await this.cancel():e.kind===`close`?await this.close():e.kind===`release`&&await this.release(e.leaseId),{response:this.accepted(e,e.kind)});switch(e.kind){case`pull`:return await this.pull(e);case`ack`:return await this.ack(e.sequence),{response:this.accepted(e,`ack`)};case`release`:return await this.release(e.leaseId),{response:this.accepted(e,`release`)};case`cancel`:return await this.cancel(),{response:this.accepted(e,`cancel`)};case`close`:return await this.close(),{response:this.accepted(e,`close`)}}}catch(t){let n=k(t);return n.code===`ooxml-resource-limit`&&(n=await this.coordinator.poison(n)),{response:this.errorResponse(e,n)}}}async pull(e){if(this.closeRequested||this.cancelRequested||this.completed)throw Error(`pull session is closed`);if(this.unacked)throw Error(`previous chunk is not acknowledged`);if(!Number.isSafeInteger(e.sequence)||e.sequence<0||e.sequence!==this.sequence)throw Error(`pull command sequence mismatch`);if(this.validateHostCredit(e.byteCredit),!this.coordinator.acquire(this.coordinatorOwner))throw Error(`another operation has an unacknowledged package chunk`);let t;try{t=await this.options.driver.pull(e.byteCredit)}catch(e){throw this.coordinator.release(this.coordinatorOwner),e}let n=!1,r=!1,i,a;try{let o=this.options.driver.measureChunk(t),s=this.arrayBufferTransferBytes(t.transfer);if(o<s)throw RangeError(`measured chunk bytes are below ArrayBuffer transfer bytes`);if(a=Math.max(o,s),t.leaseId!==void 0){if(j(t.leaseId,`lease id`),t.retainedBytes===void 0)throw Error(`retained lease bytes are required`);if(this.activeDriverLeases.has(t.leaseId))throw r=!0,Error(`driver returned an active duplicate lease id`);i=this.allocateWireLeaseId(),this.coordinator.retainLease(this.coordinatorOwner,i,t.retainedBytes),this.leases.set(i,{driverLeaseId:t.leaseId,retainedBytes:t.retainedBytes}),this.activeDriverLeases.add(t.leaseId),n=!0}else if(t.retainedBytes!==void 0)throw Error(`retained lease bytes require a lease id`);if(!Number.isSafeInteger(a)||a<0)throw RangeError(`host chunk byte length must be a non-negative safe integer`);if(a>e.byteCredit)throw RangeError(`host chunk exceeds byte credit`)}catch(e){let a;try{await this.options.driver.disposeInvalidChunk?.(t)}catch(e){a=e}if(n&&i!==void 0)try{await this.release(i)}catch(e){a??=e}else if(t.leaseId!==void 0&&!r)try{await this.options.driver.releaseLease?.(t.leaseId)}catch(e){a??=e}if(r)try{await this.cancel()}catch(e){a??=e}throw this.coordinator.release(this.coordinatorOwner),a||e}return this.unacked={sequence:this.sequence,done:t.done},{response:{kind:`chunk`,protocol:M,...this.identity(),requestId:e.requestId,sequence:this.sequence,byteLength:a,done:t.done,payload:t.payload,leaseId:i,usage:this.resourceUsage()},transfer:t.transfer}}async ack(e){if(!Number.isSafeInteger(e)||e<0)throw RangeError(`invalid ack sequence`);if(e<this.sequence)return;if(!this.unacked||e!==this.sequence)throw Error(`ack sequence mismatch`);let t=this.unacked.done;await this.options.driver.acknowledge?.(e),this.unacked=void 0,this.coordinator.release(this.coordinatorOwner),this.sequence++,t&&(this.completed=!0,this.maybeUnregisterCompleted())}async release(e){j(e,`wire lease id`);let t=this.leases.get(e);t&&(await this.options.driver.releaseLease?.(t.driverLeaseId),this.leases.delete(e),this.activeDriverLeases.delete(t.driverLeaseId),this.coordinator.releaseLease(this.coordinatorOwner,e),this.maybeUnregisterCompleted())}async cancel(){if(this.cancelComplete)return;this.cancelRequested=!0,this.unacked=void 0,this.coordinator.release(this.coordinatorOwner);let e;try{await this.releaseAllLeases()}catch(t){e=t}if(!this.driverCancelComplete)try{await this.options.driver.cancel?.(),this.driverCancelComplete=!0}catch(t){e??=t}if(e)throw e;this.cancelComplete=!0,this.unregisterCleanup()}async close(){if(this.closeComplete)return;this.closeRequested=!0,this.unacked=void 0,this.coordinator.release(this.coordinatorOwner);let e;try{await this.releaseAllLeases()}catch(t){e=t}if(!this.driverCloseComplete)try{await this.options.driver.close?.(),this.driverCloseComplete=!0}catch(t){e??=t}if(e)throw e;this.closeComplete=!0,this.unregisterCleanup()}async releaseAllLeases(){let e;for(let t of[...this.leases.keys()])try{await this.release(t)}catch(t){e??=t}if(e)throw e}validateCommandIdentity(e){if(e.protocol!==`ooxml-pull-v1`||e.sessionId!==this.options.sessionId||e.operationId!==this.options.operationId||e.generation!==this.options.generation||!Number.isSafeInteger(e.requestId)||e.requestId<=0)throw Error(`stale or mismatched pull session command`)}validateHostCredit(e){if(j(e,`byte credit`),e>this.options.maxByteCredit)throw RangeError(`byte credit exceeds host maximum`)}accepted(e,t,n=!1){return{kind:`accepted`,protocol:M,...n?{sessionId:e.sessionId,operationId:e.operationId,generation:e.generation}:this.identity(),requestId:e.requestId,command:t,usage:this.resourceUsage()}}identity(){return{sessionId:this.options.sessionId,operationId:this.options.operationId,generation:this.options.generation}}isStaleLifecycle(e){return(e.kind===`cancel`||e.kind===`close`)&&e.protocol===`ooxml-pull-v1`&&Number.isSafeInteger(e.requestId)&&e.requestId>0&&Number.isSafeInteger(e.generation)&&e.generation>0&&e.generation<this.options.generation}sameOperationIdentity(e){return e.sessionId===this.options.sessionId&&e.operationId===this.options.operationId}errorResponse(e,t){return{kind:`error`,protocol:M,sessionId:e.sessionId,operationId:e.operationId,generation:e.generation,requestId:e.requestId,error:t,usage:this.errorResourceUsage()}}async forceFatalCleanup(){this.cancelRequested=!0,this.unacked=void 0,this.coordinator.release(this.coordinatorOwner);let e;for(let t of[...this.leases.keys()])try{await this.release(t)}catch(t){e??=t}if(!this.driverCancelComplete)try{await this.options.driver.cancel?.(),this.driverCancelComplete=!0}catch(t){e??=t}if(e)throw e;this.unregisterCleanup()}allocateWireLeaseId(){if(!Number.isSafeInteger(this.nextWireLeaseId)||this.nextWireLeaseId<=0)throw RangeError(`wire lease id space exhausted`);return this.nextWireLeaseId++}arrayBufferTransferBytes(e){let t=0;for(let n of e??[])if(n instanceof ArrayBuffer&&(t+=n.byteLength,!Number.isSafeInteger(t)))throw RangeError(`ArrayBuffer transfer bytes overflow`);return t}maybeUnregisterCompleted(){this.completed&&this.leases.size===0&&this.unregisterCleanup()}resourceUsage(){return this.options.driver.resourceUsage?.()}errorResourceUsage(){try{return this.resourceUsage()}catch{return}}}})),N=e((()=>{Ye(),pe(),qt(),Rt(),ot(),Yt(),Ve(),qe(),f(),We(),Me(),Zt(),c(),tn()})),nn=e((()=>{pe(),c(),Oe(),Me(),fe(),Ve(),f(),We(),qe(),N(),ve()}));async function rn(e){if(!e)return an;try{let t=await n(e);return typeof t.collectSlideFontDemand==`function`?t.collectSlideFontDemand:an}catch{return an}}const an=()=>`all`;nn();function P(e,t){if(!Number.isSafeInteger(e)||e<0)throw Error(`${t} must be a non-negative safe integer`)}function F(e,t,n){return P(e,`resource measurement`),P(t,`resource measurement`),P(n,`resource measurement limit`),e>n||t>n||t>n-e?n===2**53-1?n:n+1:e+t}function on(e,t=2**53-1){P(t,`resource measurement limit`);let n=0;for(let r=0;r<e.length;r+=1){let i=e.charCodeAt(r),a;if(i<=127)a=1;else if(i<=2047)a=2;else if(i>=55296&&i<=56319&&r+1<e.length){let t=e.charCodeAt(r+1);t>=56320&&t<=57343?(a=4,r+=1):a=3}else a=3;if(n=F(n,a,t),n>t)return n}return n}function sn(e,t=2**53-1){P(t,`resource measurement limit`);let n=F(0,2,t);if(n>t)return n;for(let r=0;r<e.length;r+=1){let i=e.charCodeAt(r),a;if(i===34||i===92||i===8||i===9||i===10||i===12||i===13)a=2;else if(i<=31)a=6;else if(i<=127)a=1;else if(i<=2047)a=2;else if(i>=55296&&i<=56319&&r+1<e.length){let t=e.charCodeAt(r+1);t>=56320&&t<=57343?(a=4,r+=1):a=6}else a=i>=55296&&i<=57343?6:3;if(n=F(n,a,t),n>t)return n}return n}function I(e,t){return F(0,e,t)}function L(e,t=2**53-1,n=!1){if(P(t,`resource measurement limit`),e===null)return{jsonBytes:I(4,t),stringValueUtf8Bytes:0};if(typeof e==`string`)return{jsonBytes:sn(e,t),stringValueUtf8Bytes:on(e,t)};if(typeof e==`boolean`)return{jsonBytes:I(e?4:5,t),stringValueUtf8Bytes:0};if(typeof e==`number`)return{jsonBytes:I((Number.isFinite(e)?String(Object.is(e,-0)?0:e):`null`).length,t),stringValueUtf8Bytes:0};if(typeof e==`bigint`)throw TypeError(`BigInt values cannot be serialized to JSON`);if(Array.isArray(e)){let n=I(2,t),r=0;for(let i=0;i<e.length;i+=1){i!==0&&(n=F(n,1,t));let a=L(e[i],t,!0);n=F(n,a.jsonBytes,t),r=F(r,a.stringValueUtf8Bytes,t)}return{jsonBytes:n,stringValueUtf8Bytes:r}}if(typeof e==`object`){let n=I(2,t),r=0,i=0;for(let[a,o]of Object.entries(e)){if(o===void 0||typeof o==`function`||typeof o==`symbol`)continue;i++!==0&&(n=F(n,1,t)),n=F(n,sn(a,t),t),n=F(n,1,t);let e=L(o,t);n=F(n,e.jsonBytes,t),r=F(r,e.stringValueUtf8Bytes,t)}return{jsonBytes:n,stringValueUtf8Bytes:r}}return{jsonBytes:n?I(4,t):0,stringValueUtf8Bytes:0}}const cn=/^(?:fontFace|[A-Za-z]+FontFace|themeMajorFontLatin|themeMinorFontLatin)$/;function ln(e){let t=new Set,n=e,r=[e],i=new Set;for(;r.length;){let e=r.pop();if(!(typeof e!=`object`||!e||i.has(e)||ArrayBuffer.isView(e))){i.add(e);for(let[i,a]of Object.entries(e))if(typeof a==`string`){if(!cn.test(i))continue;let e=(a.startsWith(`+mj`)?n?.themeMajorFontLatin:a.startsWith(`+mn`)?n?.themeMinorFontLatin:a)?.trim();e&&!e.startsWith(`+`)&&t.add(e)}else typeof a==`object`&&a&&r.push(a)}}return[...t]}function un(e,t){let n=`${e}`,r=e>=1&&e<=26?String.fromCharCode(96+e):n,i=e>=1&&e<=26?String.fromCharCode(64+e):n,a=dn(e).toLowerCase(),o=dn(e),s=n.replace(/[0-9]/g,e=>String.fromCharCode(65296+(e.charCodeAt(0)-48)));switch(t){case`arabicPlain`:return n;case`arabicPeriod`:return`${n}.`;case`arabicParenR`:return`${n})`;case`arabicParenBoth`:return`(${n})`;case`arabicDbPlain`:return s;case`arabicDbPeriod`:return`${s}.`;case`alphaLcPlain`:return r;case`alphaLcPeriod`:return`${r}.`;case`alphaLcParenR`:return`${r})`;case`alphaLcParenBoth`:return`(${r})`;case`alphaUcPlain`:return i;case`alphaUcPeriod`:return`${i}.`;case`alphaUcParenR`:return`${i})`;case`alphaUcParenBoth`:return`(${i})`;case`romanLcPlain`:return a;case`romanLcPeriod`:return`${a}.`;case`romanLcParenR`:return`${a})`;case`romanLcParenBoth`:return`(${a})`;case`romanUcPlain`:return o;case`romanUcPeriod`:return`${o}.`;case`romanUcParenR`:return`${o})`;case`romanUcParenBoth`:return`(${o})`;default:return`${n}.`}}function dn(e){let t=[1e3,900,500,400,100,90,50,40,10,9,5,4,1],n=[`M`,`CM`,`D`,`CD`,`C`,`XC`,`L`,`XL`,`X`,`IX`,`V`,`IV`,`I`],r=``;for(let i=0;i<t.length;i++)for(;e>=t[i];)r+=n[i],e-=t[i];return r}Me(),Oe(),We();function*fn(e){let t=[e[Symbol.iterator]()];for(;t.length;){let e=t[t.length-1].next();if(e.done){t.pop();continue}let n=e.value;yield n,(n.type===`shape`||n.type===`table`)&&n.mathFallback&&t.push(n.mathFallback.elements[Symbol.iterator]())}}function*pn(e){for(let t of e?.paragraphs??[]){for(let e of t.mathFallbacks??[])yield e.text;for(let e of t.runs)e.type===`text`&&(yield e.text),e.type===`math`&&e.fallbackText&&(yield e.fallbackText)}}function*mn(e){for(let t of e?.paragraphs??[]){t.defFontFamily&&(yield t.defFontFamily);for(let e of t.runs)e.type===`text`&&(e.fontFamily&&(yield e.fontFamily),e.fontFamilyEa&&(yield e.fontFamilyEa),e.fontFamilyCs&&(yield e.fontFamilyCs),e.fontFamilySym&&(yield e.fontFamilySym))}}function*hn(e){for(let t of fn(e.elements))if(t.type===`shape`)yield*pn(t.textBody);else if(t.type===`table`)for(let e of t.rows)for(let t of e.cells)yield*pn(t.textBody);else if(t.type===`chart`){t.chart.title&&(yield t.chart.title);for(let e of t.chart.categories)yield e;for(let e of t.chart.series)e.name&&(yield e.name)}}const gn={arabic:/\\p{Script_Extensions=Arabic}/u};function _n(e){for(let t of S)if(gn[t].test(e))return!0;return!1}function vn(e){return{scripts:new Map([...e.scripts].map(([e,t])=>[e,new Set(t)]))}}var yn=class e{majorFont;minorFont;fallback;scriptNames;scripts;families;demand;constructor(e,t,n,r,i,a=new Set,o=!1){this.majorFont=e,this.minorFont=t,this.fallback=i,this.scriptNames=a;let s=C(e)??C(t)??i??null;this.scripts=n??new je(s),this.families=r??new Set,this.demand=o===!1?null:o===!0?{scripts:new Map}:o,e&&this.addThemeFamily(e),t&&this.addThemeFamily(t)}addThemeFamily(e){this.families.add(e),this.demand&&this.demand.scripts.set(Ue(e),new Set(S))}addSlide(e){e.theme?.majorFont&&this.addThemeFamily(e.theme.majorFont),e.theme?.minorFont&&this.addThemeFamily(e.theme.minorFont),this.scripts.addText(hn(e));for(let t of Ae(hn(e),C(e.theme?e.theme.majorFont:this.majorFont)??C(e.theme?e.theme.minorFont:this.minorFont)??this.fallback??null))this.scriptNames.add(t);let t=e=>{for(let t of mn(e))this.families.add(t);this.demand&&this.proveSubstituteScripts(e)};for(let n of fn(e.elements))if(n.type===`shape`)t(n.textBody);else if(n.type===`table`)for(let e of n.rows)for(let n of e.cells)t(n.textBody);if(this.demand){let t=e.theme?e.theme.majorFont:this.majorFont,n=e.theme?e.theme.minorFont:this.minorFont,r=new Set([...this.families].map(e=>e.toLowerCase()));for(let[i,a]of Cn(e,t,n))r.has(i)||this.families.add(a);for(let t of e.elements)if(t.type===`chart`)for(let e of ln(t.chart))this.families.add(e)}}proveSubstituteScripts(e){let t=this.demand.scripts,n=(e,n)=>{for(let r of S)if(Se({script:r},e,`any`))for(let e of n){let n=e?.split(`,`)[0]?.trim();if(!n)continue;let i=Ue(n);t.set(i,(t.get(i)??new Set).add(r))}};for(let t of e?.paragraphs??[]){for(let e of t.runs)e.type!==`text`||!_n(e.text)||n(e.text,[e.fontFamily??t.defFontFamily,e.fontFamilyEa,e.fontFamilyCs,e.fontFamilySym]);let e=t.bullet;if(e.type===`char`)e.char&&_n(e.char)&&ne(e.char,e.fontFamily??null)===e.char&&n(e.char,[e.fontFamily]);else if(e.type===`autoNum`){let r=un(e.startAt??1,e.numType);if(_n(r)){let i=t.runs.find(e=>e.type===`text`&&!!e.fontFamily);n(r,[e.fontFamily??(i?.type===`text`?i.fontFamily:null)??t.defFontFamily])}}}}names(){return[...new Set([...this.families,...this.scripts.names(),...this.scriptNames])]}demandFacts(){if(!this.demand)return;let e=Object.create(null);for(let[t,n]of this.demand.scripts)n.size&&(e[t]=Object.freeze([...n].sort()));return Object.freeze({familyCount:this.families.size,substituteScripts:Object.freeze(e)})}withSlide(t){let n=new e(this.majorFont,this.minorFont,this.scripts.clone(),new Set(this.families),this.fallback,new Set(this.scriptNames),this.demand?vn(this.demand):!1);return n.addSlide(t),n}};const bn=new Set([`serif`,`sans-serif`,`monospace`,`cursive`,`fantasy`,`system-ui`]);function xn(e,t,n){let r=e.startsWith(`+mn-`)?n:e.startsWith(`+mj-`)?t:e.split(`,`)[0]?.trim()??null;return!r||bn.has(r.toLowerCase())?null:r}function Sn(e,t){let n=(e,n,r)=>{e&&t(e,n,r)},r=e=>{for(let t of e?.paragraphs??[]){for(let r of t.runs){if(r.type===`break`){n(r.fontFamily??t.defFontFamily,r.bold??t.defBold??e?.defaultBold??!1,r.italic??t.defItalic??e?.defaultItalic??!1);continue}if(r.type!==`text`)continue;let i=r.bold??t.defBold??e?.defaultBold??!1,a=r.italic??t.defItalic??e?.defaultItalic??!1;n(r.fontFamily??t.defFontFamily,i,a),r.fontFamilyEa&&n(r.fontFamilyEa,i,a),r.fontFamilyCs&&n(r.fontFamilyCs,i,a),r.fontFamilySym&&n(r.fontFamilySym,i,a)}let r=t.endRunProperties;if(r&&n(r.fontFamily??t.defFontFamily,r.bold??t.defBold??e?.defaultBold??!1,r.italic??t.defItalic??e?.defaultItalic??!1),t.bullet.type===`char`||t.bullet.type===`autoNum`){let e=t.runs.find(e=>e.type===`text`&&!!e.fontFamily),r=e?.type===`text`?e.fontFamily:null;n(t.bullet.fontFamily??(t.bullet.type===`autoNum`?r??t.defFontFamily:void 0),!1,!1)}}};for(let t of fn(e.elements))if(t.type===`shape`&&r(t.textBody),t.type===`table`)for(let e of t.rows)for(let t of e.cells)r(t.textBody)}function Cn(e,t,n){e.theme&&(t=e.theme.majorFont,n=e.theme.minorFont);let r=new Map,i=new Map;return Sn(e,e=>{let a=r.get(e);if(a===void 0){let i=xn(e,t,n);r.set(e,a=i?[i.toLowerCase(),i]:null)}a&&i.set(a[0],a[1])}),i}function wn(e,t){let n=Math.min(e.length,t);if(n>0&&n<e.length){let t=e.charCodeAt(n-1),r=e.charCodeAt(n);t>=55296&&t<=56319&&r>=56320&&r<=57343&&n--}return e.slice(0,n)}ve(),Object.freeze({state:`builtin`}),Object.freeze({kind:`none`});function Tn(e){let t=0;for(let n=0;n<e.length;n+=1){let r=e.charCodeAt(n);if(r<128)t+=1;else if(r<2048)t+=2;else if(r>=55296&&r<=56319&&n+1<e.length){let r=e.charCodeAt(n+1);r>=56320&&r<=57343?(t+=4,n+=1):t+=3}else t+=3}return t}function En(e,t=1024){let n=wn(e,t+1);if(n.length===e.length&&Tn(e)<=t)return e;let r=t-3,i=he(n),a=0,o=0,s=0;for(let e of i){if(e>=n.length||(s+=Tn(n.slice(o,e)),s>r))break;a=e,o=e}return`${n.slice(0,a)}…`}var Dn=class{keyOf;compare;#e=new Map;#t=new Set;#n=0;#r=null;#i=!1;constructor(e,t){this.keyOf=e,this.compare=t}get size(){return this.#e.size}has(e){return this.#e.has(e)}get(e){return this.#e.get(e)}get list(){return this.#r===null&&(this.#r=Object.freeze([...this.#e.values()].sort(this.compare))),this.#r}add(e){if(this.#i)return;let t=this.keyOf(e);if(this.#e.has(t))return;let n=En(String(e.message)),r=Tn(n);this.#n+r>1048576?n=``:this.#n+=r;let i=Object.freeze({...e,message:n});this.#e.set(t,i),this.#r=null;for(let e of[...this.#t])try{e(i)}catch(e){console.error(`[ooxml] part failure listener failed:`,e)}return i}subscribe(e){return this.#i?()=>{}:(this.#t.add(e),()=>{this.#t.delete(e)})}close(){this.#i=!0,this.#t.clear(),this.#e.clear(),this.#r=Object.freeze([]),this.#n=0}};function On(){return new Dn(e=>e.slideIndex,(e,t)=>e.slideIndex-t.slideIndex)}nn(),N(),Oe();const kn=Object.freeze({archiveEntryCount:0,declaredInflatedBytes:0,distinctInflatedBytes:0,operationInflatedBytes:0}),An=s;function R(e,t){return t?{fontPreloadNames:e,fontPreloadFacts:t}:{fontPreloadNames:e}}new Set(S);function z(e,t){if(e!==null&&typeof e!=`string`)throw Error(`invalid PPTX presentation bootstrap ${t}`)}function jn(e,t){if(!e||typeof e!=`object`||Array.isArray(e))throw Error(`invalid PPTX presentation bootstrap slide at ${t}`);let n=e;if(n.index!==t)throw Error(`invalid PPTX presentation bootstrap slide index ${n.index}`);if(n.partName!==void 0&&typeof n.partName!=`string`)throw Error(`invalid PPTX presentation bootstrap slide partName at ${t}`);return Object.freeze({index:n.index,...n.partName===void 0?{}:{partName:n.partName}})}function Mn(e,t){if(!e||typeof e!=`object`||Array.isArray(e))throw Error(`invalid PPTX presentation bootstrap embedded font at ${t}`);let n=e;if(typeof n.fontName!=`string`||n.fontName.length===0||![`regular`,`bold`,`italic`,`boldItalic`].includes(n.style??``)||typeof n.partPath!=`string`||n.partPath.length===0||n.partPath.startsWith(`/`)||n.partPath.split(`/`).includes(`..`)||![`application/x-font-ttf`,`application/x-fontdata`].includes(n.contentType??``))throw Error(`invalid PPTX presentation bootstrap embedded font fields at ${t}`);return Object.freeze({fontName:n.fontName,style:n.style,partPath:n.partPath,contentType:n.contentType})}function Nn(e){if(!e||typeof e!=`object`||Array.isArray(e))throw Error(`invalid PPTX presentation bootstrap payload`);let t=e;if(!Number.isSafeInteger(t.slideCount)||(t.slideCount??-1)<0||!Number.isSafeInteger(t.slideWidth)||(t.slideWidth??0)<=0||!Number.isSafeInteger(t.slideHeight)||(t.slideHeight??0)<=0||!Array.isArray(t.embeddedFonts)||!Array.isArray(t.slides)||t.slides.length!==t.slideCount)throw Error(`invalid PPTX presentation bootstrap dimensions or slide count`);return z(t.defaultTextColor,`defaultTextColor`),z(t.majorFont,`majorFont`),z(t.minorFont,`minorFont`),z(t.hlinkColor,`hlinkColor`),z(t.folHlinkColor,`folHlinkColor`),Object.freeze({slideCount:t.slideCount,slideWidth:t.slideWidth,slideHeight:t.slideHeight,defaultTextColor:t.defaultTextColor,majorFont:t.majorFont,minorFont:t.minorFont,hlinkColor:t.hlinkColor,folHlinkColor:t.folHlinkColor,embeddedFonts:Object.freeze(t.embeddedFonts.map(Mn)),slides:Object.freeze(t.slides.map(jn))})}function Pn(e){return Object.freeze({type:`media`,x:e.x,y:e.y,width:e.width,height:e.height,rotation:e.rotation,flipH:e.flipH,flipV:e.flipV,mediaKind:e.mediaKind,posterPath:e.posterPath,posterMimeType:e.posterMimeType,mediaPath:e.mediaPath,mimeType:e.mimeType})}function Fn(e){return Object.freeze({...e.id===void 0?{}:{id:e.id},...e.authorId===void 0?{}:{authorId:e.authorId},...e.author===void 0?{}:{author:e.author},...e.date===void 0?{}:{date:e.date},...e.status===void 0?{}:{status:e.status},text:e.text})}function In(e){return Object.freeze({...e})}function Ln(e){return Object.freeze({...e.authorId===void 0?{}:{authorId:e.authorId},...e.modernAuthorId===void 0?{}:{modernAuthorId:e.modernAuthorId},...e.id===void 0?{}:{id:e.id},...e.index===void 0?{}:{index:e.index},...e.author===void 0?{}:{author:e.author},...e.date===void 0?{}:{date:e.date},...e.x===void 0?{}:{x:e.x},...e.y===void 0?{}:{y:e.y},...e.anchors?.length?{anchors:Object.freeze(e.anchors.map(In))}:{},...e.status===void 0?{}:{status:e.status},text:e.text,...e.replies?.length?{replies:Object.freeze(e.replies.map(Fn))}:{}})}function Rn(e,t){if(e.index!==t.index||e.partName!==t.partName)throw Error(`PPTX pulled slide identity does not match bootstrap index ${t.index}`);return Object.freeze({index:t.index,...t.partName===void 0?{}:{partName:t.partName},notes:e.notes??null,hidden:e.hidden??!1,mediaElements:Object.freeze(e.elements.filter(e=>e.type===`media`).map(Pn)),...e.comments?.length?{comments:Object.freeze(e.comments.map(Ln))}:{}})}function zn(e,t,n){if(!(e<=t))throw new x(`PPTX presentation preflight exceeded its hard limit of ${t} projected bytes`,{stage:`parsing`,violation:{format:`pptx`,operation:`presentation-preflight`,resource:`presentation-preflight`,metric:`projected-bytes`,limit:t,observed:Math.min(e,t+1),configurable:!1,usage:n}})}var Bn=class{slideCountValue;slideWidthValue;slideHeightValue;defaultTextColorValue;majorFontValue;minorFontValue;hlinkColorValue;folHlinkColorValue;embeddedFontsValue;descriptors;slides=[];fonts;fontPreloadNames;fontPreloadFacts;fontProjectionBytes;projectionBytesValue;limit;pending=null;finished=null;demandPoints;demandAll=!1;demandBytes=0;demandMembershipBytes=0;demandDeltaBytes=0;collectFontDemand;demandDelta;partFailureLog=On();latestPartFailureValue;constructor(e,t={}){let n=Nn(e),r=t.maxProjectionBytes??An;if(!Number.isSafeInteger(r)||r<=0||r>An)throw Error(`invalid PPTX presentation preflight limit`);this.limit=r,this.collectFontDemand=t.collectFontDemand,this.demandPoints=this.collectFontDemand?new Set:void 0,this.demandBytes=this.collectFontDemand?L({fontPreloadDemand:[]},this.limit).jsonBytes-1:0,this.demandMembershipBytes=this.demandBytes,this.slideCountValue=n.slideCount,this.slideWidthValue=n.slideWidth,this.slideHeightValue=n.slideHeight,this.defaultTextColorValue=n.defaultTextColor,this.majorFontValue=n.majorFont,this.minorFontValue=n.minorFont,this.hlinkColorValue=n.hlinkColor,this.folHlinkColorValue=n.folHlinkColor,this.embeddedFontsValue=n.embeddedFonts,this.descriptors=[...n.slides],this.fonts=new yn(this.majorFontValue,this.minorFontValue,void 0,void 0,t.cjkFallback,void 0,this.collectFontDemand!==void 0),this.fontPreloadNames=Object.freeze(this.fonts.names()),this.fontPreloadFacts=this.fonts.demandFacts(),this.fontProjectionBytes=L(R(this.fontPreloadNames,this.fontPreloadFacts),this.limit).jsonBytes,this.projectionBytesValue=L({slideCount:this.slideCountValue,slideWidth:this.slideWidthValue,slideHeight:this.slideHeightValue,defaultTextColor:this.defaultTextColorValue,majorFont:this.majorFontValue,minorFont:this.minorFontValue,hlinkColor:this.hlinkColorValue,folHlinkColor:this.folHlinkColorValue,embeddedFonts:this.embeddedFontsValue,remainingSlides:this.descriptors,slides:[],...R(this.fontPreloadNames,this.fontPreloadFacts)},this.limit).jsonBytes,this.projectionBytesValue+this.demandBytes>this.limit&&(this.demandAll=!0,this.demandBytes=0,this.demandMembershipBytes=0),this.projectionBytesValue=F(this.projectionBytesValue,this.demandBytes,this.limit),zn(this.projectionBytesValue,this.limit,kn)}get acceptedSlideCount(){return this.finished?.slideCount??this.slides.length}get projectedBytes(){return this.projectionBytesValue}get remainingDescriptorCount(){return this.descriptors.reduce((e,t)=>e+Number(t!==void 0),0)}get latestSlide(){return this.slides[this.slides.length-1]}get currentFontPreloadNames(){return this.fontPreloadNames}get currentFontPreloadFacts(){return this.fontPreloadFacts}get currentFontPreloadDemandDelta(){return this.demandDelta}get partFailures(){return this.partFailureLog.list}get latestPartFailure(){return this.latestPartFailureValue}snapshot(){if(this.finished)return this.finished;if(this.pending)throw Error(`PPTX presentation preflight has an uncommitted slide`);return Object.freeze({slideCount:this.slideCountValue,slideWidth:this.slideWidthValue,slideHeight:this.slideHeightValue,defaultTextColor:this.defaultTextColorValue,majorFont:this.majorFontValue,minorFont:this.minorFontValue,hlinkColor:this.hlinkColorValue,folHlinkColor:this.folHlinkColorValue,embeddedFonts:this.embeddedFontsValue,slides:Object.freeze([...this.slides]),...R(this.fontPreloadNames,this.fontPreloadFacts)})}addSlide(e,t=kn){this.prepareSlide(e,t).commit()}prepareSlide(e,t=kn){if(this.finished)throw Error(`PPTX presentation preflight is already finished`);if(this.pending)throw Error(`PPTX presentation preflight already has a prepared slide`);let n=this.slides.length,r=this.descriptors[n];if(!r)throw Error(`PPTX presentation preflight received an extra slide`);let i=Rn(e,r),a=this.fonts.withSlide(e),o=Object.freeze(a.names()),s=a.demandFacts(),c=L(R(o,s),this.limit).jsonBytes,l=L(i,this.limit).jsonBytes,u=this.projectionBytesValue-this.demandBytes-this.fontProjectionBytes-L(r,this.limit).jsonBytes+4;u=F(u,c,this.limit),u=F(u,l,this.limit),this.slides.length!==0&&(u=F(u,1,this.limit));let d=L({slide:i,...R(o,s)},this.limit).jsonBytes,f=F(this.projectionBytesValue-this.demandBytes,d,this.limit),p=u;zn(Math.max(f,p),this.limit,t);let m=f+this.demandBytes;u+=this.demandBytes,Math.max(m,u)>this.limit&&this.demandBytes&&(this.projectionBytesValue-=this.demandBytes,this.demandBytes=0,this.demandMembershipBytes=0,this.demandDeltaBytes=0,this.demandPoints?.clear(),this.demandAll=!0,this.demandDelta=`all`,m=f,u=p);let h,g=this.demandBytes,_=this.demandMembershipBytes,v=this.demandDeltaBytes;if(this.collectFontDemand){let t=L([],this.limit).jsonBytes,n=this.limit-m,r=this.limit-p-this.demandMembershipBytes,i=Math.min(n,Math.floor((r+t-Number((this.demandPoints?.size??0)>0))/2));if(h=this.demandAll?`all`:this.collectFontDemand(e,this.demandPoints,Math.max(0,i)),h===`all`)g=0,_=0,v=0;else{v=L(h,this.limit).jsonBytes;let e=h.length===0?0:v-t+Number((this.demandPoints?.size??0)>0);_+=e,g=_+v,m+=v}u=p+g}zn(Math.max(m,u),this.limit,t);let y={state:`prepared`,fact:i,fonts:a,fontNames:o,fontFacts:s,fontBytes:c,committedBytes:u,demandDelta:h,demandBytes:g,demandMembershipBytes:_,demandDeltaBytes:v,partFailure:e.parseError===void 0?null:{kind:`slide`,slideIndex:n,slideNumber:n+1,message:e.parseError}};return this.pending=y,{projectedBytes:m,commit:()=>{if(y.state!==`committed`){if(y.state===`rolled-back`)throw Error(`PPTX presentation preflight cannot commit a rolled-back slide`);if(this.pending!==y)throw Error(`PPTX presentation preflight prepared slide is stale`);if(this.descriptors[n]=void 0,this.slides.push(y.fact),this.fonts=y.fonts,this.fontPreloadNames=y.fontNames,this.fontPreloadFacts=y.fontFacts,this.fontProjectionBytes=y.fontBytes,this.projectionBytesValue=y.committedBytes,this.demandDelta=y.demandDelta,y.demandDelta===`all`)this.demandAll=!0,this.demandPoints?.clear();else for(let e of y.demandDelta??[])this.demandPoints?.add(e);this.demandBytes=y.demandBytes,this.demandMembershipBytes=y.demandMembershipBytes,this.demandDeltaBytes=y.demandDeltaBytes,this.latestPartFailureValue=y.partFailure===null?void 0:this.partFailureLog.add(y.partFailure)??this.partFailureLog.get(n),y.state=`committed`,this.pending=null}},rollback:()=>{if(y.state!==`rolled-back`){if(y.state===`committed`)throw Error(`PPTX presentation preflight cannot roll back a committed slide`);if(this.pending!==y)throw Error(`PPTX presentation preflight prepared slide is stale`);y.state=`rolled-back`,this.pending=null}}}}finish(){if(this.finished)return this.finished;if(this.pending)throw Error(`PPTX presentation preflight has an uncommitted slide`);if(this.slides.length!==this.slideCountValue)throw Error(`PPTX presentation preflight is incomplete: ${this.slides.length}/${this.slideCountValue} slides`);return this.finished=Object.freeze({slideCount:this.slideCountValue,slideWidth:this.slideWidthValue,slideHeight:this.slideHeightValue,defaultTextColor:this.defaultTextColorValue,majorFont:this.majorFontValue,minorFont:this.minorFontValue,hlinkColor:this.hlinkColorValue,folHlinkColor:this.folHlinkColorValue,embeddedFonts:this.embeddedFontsValue,slides:Object.freeze([...this.slides]),...R(this.fontPreloadNames,this.fontPreloadFacts),...this.collectFontDemand&&!this.demandAll&&this.demandBytes?{fontPreloadDemand:Object.freeze([...this.demandPoints??[]])}:{}}),this.demandPoints?.clear(),this.demandDelta=void 0,this.descriptors=[],this.slides=[],this.projectionBytesValue=L(this.finished,this.limit).jsonBytes,this.finished}};N();function Vn(e){try{return ct(e(e=>e.slide_cursor_resource_usage()))}catch(e){if(String(e).includes(`slide cursor usage is unavailable`))return;throw e}}function Hn(e,t,n,r,i){let a,o;try{if(i){if(!r)throw Error(`slide payload is missing before acknowledgement`);let t=i(n,r,Vn(e));typeof t==`function`?a=t:t&&({rollback:a,commit:o}=t)}e(e=>e.acknowledge_slide(t.operationId,t.generation)),o?.()}catch(e){try{a?.()}catch{}throw e}}nn(),N();var Un=class{archive;acceptSlide;executeArchive;coordinatorGeneration=new $t;sessions=new Map;pendingOpens=new Map;operationTail=Promise.resolve();resourceFailure;lifecycleState=`ready`;resetBarrier;resetIdentities=new Map;constructor(e,t,n=e=>e(this.requireArchive())){this.archive=e,this.acceptSlide=t,this.executeArchive=n}get coordinator(){return this.coordinatorGeneration}reserveOpen(e){if(this.assertReady(),Gn(e),this.pendingOpens.has(e.sessionId)||this.sessions.has(e.sessionId))throw Error(`slide pull session id is already reserved`);this.pendingOpens.set(e.sessionId,{identity:e,canceled:!1})}abandonOpen(e){this.pendingOpens.delete(e)}get pendingOpenCount(){return this.pendingOpens.size}async open(e,t){if(this.assertReady(),this.resourceFailure)throw this.resourceFailure;if(!Number.isSafeInteger(e)||e<0)throw RangeError(`slide index must be a non-negative safe integer`);let n=this.pendingOpens.get(t.sessionId);if(!n||!Kn(n.identity,t))throw Error(`slide pull session open reservation is stale or missing`);let r,i=new Promise(e=>{r=e}),a=this.operationTail.then(()=>this.coordinator.enqueue(async()=>{if(n.canceled)throw Error(`slide pull session open was canceled`);let i,a=!1,s=new en({...t,maxByteCredit:o,coordinator:this.coordinator,driver:{pull:n=>{let r;try{r=this.executeArchive(r=>r.pull_slide(e,t.operationId,t.generation,n))}catch(e){throw rt(e,n,o)||(this.latchResourceFailure(e),e)}let s=Jt(r);return this.acceptSlide&&(i=JSON.parse(new TextDecoder().decode(new Uint8Array(s)))),a=!0,{payload:s,byteLength:s.byteLength,done:!0,transfer:[s]}},measureChunk:({payload:e})=>e.byteLength,acknowledge:()=>{if(!a)throw Error(`slide unit is not awaiting acknowledgement`);try{Hn(this.executeArchive,t,e,i,this.acceptSlide)}catch(e){throw this.latchResourceFailure(e),e}a=!1,i=void 0,this.sessions.delete(t.sessionId),r()},cancel:async()=>{try{this.archive()&&await this.executeArchive(e=>e.cancel_slide())}finally{i=void 0,a=!1,this.sessions.delete(t.sessionId),r()}},close:async()=>{try{this.archive()&&await this.executeArchive(e=>e.cancel_slide())}finally{i=void 0,a=!1,this.sessions.delete(t.sessionId),r()}},resourceUsage:()=>{try{return this.readResourceUsage()}catch(e){throw this.latchResourceFailure(e),e}}}});this.sessions.set(t.sessionId,{host:s,identity:t}),this.pendingOpens.delete(t.sessionId)}));this.operationTail=a.then(()=>i,()=>void 0);try{await a}catch(e){throw this.pendingOpens.delete(t.sessionId),r(),e}}async postOpenedSafely(e,t,n){if(this.lifecycleState!==`ready`){try{n(this.lifecycleError())}catch{}return}try{t()}catch(t){await this.closeIdentity(e);try{n(t)}catch{}}}dispatch(e,t){if(this.lifecycleState!==`ready`)return t(this.responseDuringReset(e)),Promise.resolve();let n=this.sessions.get(e.sessionId);if(n)return n.host.dispatch(e,t);let r=this.pendingOpens.get(e.sessionId);if(r&&(e.kind===`cancel`||e.kind===`close`)){let n=Kn(r.identity,e);return n&&(r.canceled=!0),t(n?{protocol:M,kind:`accepted`,sessionId:e.sessionId,operationId:e.operationId,generation:e.generation,requestId:e.requestId,command:e.kind}:this.staleLifecycleResponse(e)),Promise.resolve()}return e.kind===`cancel`||e.kind===`close`?(t({protocol:M,kind:`accepted`,sessionId:e.sessionId,operationId:e.operationId,generation:e.generation,requestId:e.requestId,command:e.kind}),Promise.resolve()):(t({protocol:M,kind:`error`,sessionId:e.sessionId,operationId:e.operationId,generation:e.generation,requestId:e.requestId,error:k(Error(`slide pull session is not open`))}),Promise.resolve())}async dispatchSafely(e,t){try{await this.dispatch(e,t)}catch(n){try{t({protocol:M,kind:`error`,sessionId:e.sessionId,operationId:e.operationId,generation:e.generation,requestId:e.requestId,error:k(n)})}catch{}}}run(e){if(this.lifecycleState!==`ready`)return Promise.reject(this.lifecycleError());let t=this.operationTail.then(()=>this.coordinator.enqueue(async()=>{if(this.resourceFailure)throw this.resourceFailure;return e()})).catch(e=>{throw this.latchResourceFailure(e),e});return this.operationTail=t.then(()=>void 0,()=>void 0),t}reset(){if(this.resetBarrier)return this.resetBarrier;this.lifecycleState=`resetting`,this.captureResetIdentities();let e=this.performReset().then(()=>{this.resetIdentities.clear(),this.lifecycleState=`ready`},e=>{throw this.lifecycleState=`reset-failed`,e}).finally(()=>{this.resetBarrier===e&&(this.resetBarrier=void 0)});return this.resetBarrier=e,e}async performReset(){for(let e of this.pendingOpens.values())e.canceled=!0;let e=1;for(let{host:t,identity:n}of[...this.sessions.values()]){let r;if(await t.dispatch({protocol:M,kind:`close`,...n,requestId:e++},e=>{e.kind===`error`&&(r=Ot(e.error))}),r)throw r}this.sessions.clear(),await this.operationTail,this.pendingOpens.clear(),this.archive()&&await this.executeArchive(e=>e.close_presentation_session()),this.coordinatorGeneration=new $t,this.resourceFailure=void 0}assertReady(){if(this.lifecycleState!==`ready`)throw this.lifecycleError()}lifecycleError(){let e=this.lifecycleState===`reset-failed`,t=Error(e?`slide pull worker reset failed; retry reset before new work`:`slide pull worker reset is in progress`);return t.name=`PullSessionLifecycleError`,Object.assign(t,{code:e?`ooxml-pull-reset-failed`:`ooxml-pull-resetting`})}captureResetIdentities(){for(let{identity:e}of this.sessions.values())this.resetIdentities.set(e.sessionId,e);for(let{identity:e}of this.pendingOpens.values())this.resetIdentities.set(e.sessionId,e)}responseDuringReset(e){if(e.kind===`cancel`||e.kind===`close`){let t=this.resetIdentities.get(e.sessionId);return t&&!Kn(t,e)?this.staleLifecycleResponse(e):{protocol:M,kind:`accepted`,sessionId:e.sessionId,operationId:e.operationId,generation:e.generation,requestId:e.requestId,command:e.kind}}return{protocol:M,kind:`error`,sessionId:e.sessionId,operationId:e.operationId,generation:e.generation,requestId:e.requestId,error:k(this.lifecycleError())}}requireArchive(){let e=this.archive();if(!e)throw Error(`Presentation not loaded`);return e}async closeIdentity(e){if(this.lifecycleState!==`ready`)return;let t=this.sessions.get(e.sessionId);if(t){await t.host.dispatch({protocol:M,kind:`close`,...e,requestId:1},()=>void 0);return}let n=this.pendingOpens.get(e.sessionId);n&&Kn(n.identity,e)&&(n.canceled=!0)}readResourceUsage(){return Vn(this.executeArchive)}latchResourceFailure(e){let t=e instanceof x?e:_t(e);t&&(this.resourceFailure??=t)}staleLifecycleResponse(e){return{protocol:M,kind:`error`,sessionId:e.sessionId,operationId:e.operationId,generation:e.generation,requestId:e.requestId,error:{message:`stale lifecycle targets another slide operation`,errorName:`PullSessionProtocolError`,code:`ooxml-stale-lifecycle`}}}};function Wn(e){return!!e&&typeof e==`object`&&e.protocol===`ooxml-pull-v1`}function Gn(e){if(!Number.isSafeInteger(e.sessionId)||e.sessionId<=0)throw RangeError(`session id must be a positive safe integer`);if(!Number.isSafeInteger(e.operationId)||e.operationId<=0)throw RangeError(`operation id must be a positive safe integer`);if(!Number.isSafeInteger(e.generation)||e.generation<=0)throw RangeError(`generation must be a positive safe integer`)}function Kn(e,t){return e.sessionId===t.sessionId&&e.operationId===t.operationId&&e.generation===t.generation}var qn=class{__destroy_into_raw(){let e=this.__wbg_ptr;return this.__wbg_ptr=0,Yn.unregister(this),e}free(){let e=this.__destroy_into_raw();J.__wbg_pptxarchive_free(e,0)}acknowledge_slide(e,t){let n=J.pptxarchive_acknowledge_slide(this.__wbg_ptr,e,t);if(n[1])throw G(n[0])}assert_healthy(){let e=J.pptxarchive_assert_healthy(this.__wbg_ptr);if(e[1])throw G(e[0])}cancel_slide(){J.pptxarchive_cancel_slide(this.__wbg_ptr)}close_presentation_session(){J.pptxarchive_close_presentation_session(this.__wbg_ptr)}extract_font(e){let t=$n(e,J.__wbindgen_malloc,J.__wbindgen_realloc),n=q,r=J.pptxarchive_extract_font(this.__wbg_ptr,t,n);if(r[3])throw G(r[2]);var i=B(r[0],r[1]).slice();return J.__wbindgen_free(r[0],r[1]*1,1),i}extract_image(e){let t=$n(e,J.__wbindgen_malloc,J.__wbindgen_realloc),n=q,r=J.pptxarchive_extract_image(this.__wbg_ptr,t,n);if(r[3])throw G(r[2]);var i=B(r[0],r[1]).slice();return J.__wbindgen_free(r[0],r[1]*1,1),i}extract_media(e){let t=$n(e,J.__wbindgen_malloc,J.__wbindgen_realloc),n=q,r=J.pptxarchive_extract_media(this.__wbg_ptr,t,n);if(r[3])throw G(r[2]);var i=B(r[0],r[1]).slice();return J.__wbindgen_free(r[0],r[1]*1,1),i}constructor(e,t,n,r){let i=Qn(e,J.__wbindgen_malloc),a=q,o=J.pptxarchive_new(i,a,!W(t),W(t)?BigInt(0):t,!W(n),W(n)?BigInt(0):n,!W(r),W(r)?BigInt(0):r);if(o[2])throw G(o[1]);return this.__wbg_ptr=o[0]>>>0,Yn.register(this,this.__wbg_ptr,this),this}parse(){let e=J.pptxarchive_parse(this.__wbg_ptr);if(e[3])throw G(e[2]);var t=B(e[0],e[1]).slice();return J.__wbindgen_free(e[0],e[1]*1,1),t}presentation_bootstrap(){let e=J.pptxarchive_presentation_bootstrap(this.__wbg_ptr);if(e[3])throw G(e[2]);var t=B(e[0],e[1]).slice();return J.__wbindgen_free(e[0],e[1]*1,1),t}pull_slide(e,t,n,r){let i=J.pptxarchive_pull_slide(this.__wbg_ptr,e,t,n,r);if(i[3])throw G(i[2]);var a=B(i[0],i[1]).slice();return J.__wbindgen_free(i[0],i[1]*1,1),a}resource_usage(){let e=J.pptxarchive_resource_usage(this.__wbg_ptr);if(e[3])throw G(e[2]);var t=B(e[0],e[1]).slice();return J.__wbindgen_free(e[0],e[1]*1,1),t}slide_cursor_resource_usage(){let e=J.pptxarchive_slide_cursor_resource_usage(this.__wbg_ptr);if(e[3])throw G(e[2]);var t=B(e[0],e[1]).slice();return J.__wbindgen_free(e[0],e[1]*1,1),t}to_markdown(){let e,t;try{let i=J.pptxarchive_to_markdown(this.__wbg_ptr);var n=i[0],r=i[1];if(i[3])throw n=0,r=0,G(i[2]);return e=n,t=r,Zn(n,r)}finally{J.__wbindgen_free(e,t,1)}}};Symbol.dispose&&(qn.prototype[Symbol.dispose]=qn.prototype.free);function Jn(){return{__proto__:null,\"./pptx_parser_bg.js\":{__proto__:null,__wbg___wbindgen_throw_6b64449b9b9ed33c:function(e,t){throw Error(Zn(e,t))},__wbg_error_a6fa202b58aa1cd3:function(e,t){let n,r;try{n=e,r=t,console.error(Zn(e,t))}finally{J.__wbindgen_free(n,r,1)}},__wbg_new_227d7c05414eb861:function(){return Error()},__wbg_stack_3b0d974bbf31e44f:function(e,t){let n=t.stack,r=$n(n,J.__wbindgen_malloc,J.__wbindgen_realloc),i=q;Xn().setInt32(e+4,i,!0),Xn().setInt32(e+0,r,!0)},__wbindgen_cast_0000000000000001:function(e,t){return Zn(e,t)},__wbindgen_init_externref_table:function(){let e=J.__wbindgen_externrefs,t=e.grow(4);e.set(0,void 0),e.set(t+0,void 0),e.set(t+1,null),e.set(t+2,!0),e.set(t+3,!1)}}}}const Yn=typeof FinalizationRegistry>`u`?{register:()=>{},unregister:()=>{}}:new FinalizationRegistry(e=>J.__wbg_pptxarchive_free(e>>>0,1));function B(e,t){return e>>>=0,U().subarray(e/1,e/1+t)}let V=null;function Xn(){return(V===null||V.buffer.detached===!0||V.buffer.detached===void 0&&V.buffer!==J.memory.buffer)&&(V=new DataView(J.memory.buffer)),V}function Zn(e,t){return e>>>=0,nr(e,t)}let H=null;function U(){return(H===null||H.byteLength===0)&&(H=new Uint8Array(J.memory.buffer)),H}function W(e){return e==null}function Qn(e,t){let n=t(e.length*1,1)>>>0;return U().set(e,n/1),q=e.length,n}function $n(e,t,n){if(n===void 0){let n=K.encode(e),r=t(n.length,1)>>>0;return U().subarray(r,r+n.length).set(n),q=n.length,r}let r=e.length,i=t(r,1)>>>0,a=U(),o=0;for(;o<r;o++){let t=e.charCodeAt(o);if(t>127)break;a[i+o]=t}if(o!==r){o!==0&&(e=e.slice(o)),i=n(i,r,r=o+e.length*3,1)>>>0;let t=U().subarray(i+o,i+r),a=K.encodeInto(e,t);o+=a.written,i=n(i,r,o,1)>>>0}return q=o,i}function G(e){let t=J.__wbindgen_externrefs.get(e);return J.__externref_table_dealloc(e),t}let er=new TextDecoder(`utf-8`,{ignoreBOM:!0,fatal:!0});er.decode();let tr=0;function nr(e,t){return tr+=t,tr>=2146435072&&(er=new TextDecoder(`utf-8`,{ignoreBOM:!0,fatal:!0}),er.decode(),tr=t),er.decode(U().subarray(e,e+t))}const K=new TextEncoder;`encodeInto`in K||(K.encodeInto=function(e,t){let n=K.encode(e);return t.set(n),{read:e.length,written:n.length}});let q=0,J;function rr(e,t){return J=e.exports,V=null,H=null,J.__wbindgen_start(),J}async function ir(e,t){if(typeof Response==`function`&&e instanceof Response){if(typeof WebAssembly.instantiateStreaming==`function`)try{return await WebAssembly.instantiateStreaming(e,t)}catch(t){if(e.ok&&n(e.type)&&e.headers.get(`Content-Type`)!==`application/wasm`)console.warn(\"`WebAssembly.instantiateStreaming` failed because your server does not serve Wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\\n\",t);else throw t}let r=await e.arrayBuffer();return await WebAssembly.instantiate(r,t)}else{let n=await WebAssembly.instantiate(e,t);return n instanceof WebAssembly.Instance?{instance:n,module:e}:n}function n(e){switch(e){case`basic`:case`cors`:case`default`:return!0}return!1}}async function ar(e){if(J!==void 0)return J;e!==void 0&&(Object.getPrototypeOf(e)===Object.prototype?{module_or_path:e}=e:console.warn(`using deprecated parameters for the initialization function; pass a single object instead`));let t=Jn();(typeof e==`string`||typeof Request==`function`&&e instanceof Request||typeof URL==`function`&&e instanceof URL)&&(e=fetch(e));let{instance:n,module:r}=await ir(await e,t);return rr(n,r)}async function or(e){return J=void 0,V=null,H=null,ar(e)}nn(),N();const Y=new Kt(ar,{freeArchive:e=>e.free(),reinit:or});let X=null,Z=`empty`;function sr(){if(Z!==`empty`){let e=Error(`this PPTX worker already owns a presentation parse`);throw e.name=`PptxWorkerStateError`,Object.assign(e,{code:`ooxml-pptx-parse-already-started`})}Z=`opening`}const Q=new Un(()=>Y.archive,(e,t,n)=>{if(X){if(e!==X.acceptedSlideCount)throw Error(`PPTX preflight expected slide ${X.acceptedSlideCount}, received ${e}`);return X.prepareSlide(t,n)}},e=>{let t=Y.archive;if(!t)throw Error(`Presentation not loaded`);return Y.run(()=>e(t))}),$=(e,t)=>self.postMessage(e,t);self.onmessage=async e=>{let t=e.data;if(Wn(t)){await Q.dispatchSafely(t,$);return}if(t.kind===`init`){Y.setWasmInput(Je(t.wasmUrl)??t.wasmUrl);return}let n=t.id,r=!1;try{if(t.kind===`openSlideSession`&&Q.reserveOpen(t),t.kind===`parse`&&(sr(),r=!0),t.kind===`openSlideSession`){await Y.ensureReady(),await Q.open(t.slideIndex,t),await Q.postOpenedSafely(t,()=>$({kind:`slideSessionOpened`,id:n,sessionId:t.sessionId,operationId:t.operationId,generation:t.generation}),e=>$({kind:`error`,id:n,...k(e)}));return}t.kind===`parse`&&await Q.reset(),await Q.run(async()=>{if(await Y.ensureReady(),t.kind!==`parse`&&Y.archive){let e=Y.archive;Y.run(()=>e.assert_healthy())}if(t.kind===`parse`){X=null;let e=typeof t.collectFontDemand==`string`&&!t.progressiveLayout?rn(t.collectFontDemand):void 0;e?.catch(()=>void 0);let[r,i,a]=Xt(t.resourcePolicy),o=Y.run(()=>{let e=new qn(new Uint8Array(t.buffer),r,i,a);return Y.setArchive(e),JSON.parse(new TextDecoder().decode(e.presentation_bootstrap()))});X=t.progressiveLayout?null:new Bn(o,{cjkFallback:t.cjkFallback,collectFontDemand:await e}),$({kind:`presentationOpened`,id:n,bootstrap:o}),Z=`ready`;return}let e=Y.archive;if(!e)throw Error(`No pptx loaded`);if(t.kind===`finishPresentationPreflight`){if(!X)throw Error(`PPTX presentation preflight is not active`);let e=X.finish(),t=X.partFailures;X=null,$({kind:`presentationPreflightReady`,id:n,preflight:e,...t.length===0?{}:{partFailures:t}});return}if(t.kind===`extractMedia`){let r=Y.run(()=>e.extract_media(t.path).buffer);$({kind:`mediaExtracted`,id:n,bytes:r},[r]);return}if(t.kind===`extractImage`){let r=Y.run(()=>e.extract_image(t.path).buffer);$({kind:`imageExtracted`,id:n,bytes:r},[r]);return}if(t.kind===`extractFont`){let r=Y.run(()=>e.extract_font(t.path).buffer);$({kind:`fontExtracted`,id:n,bytes:r},[r]);return}if(t.kind===`resourceUsage`){$({kind:`resourceUsage`,id:n,usage:ct(Y.run(()=>e.resource_usage()))});return}t.kind===`toMarkdown`&&$({kind:`markdownRendered`,id:n,markdown:Y.run(()=>e.to_markdown())})})}catch(e){r&&(Z=`failed`),t.kind===`openSlideSession`&&Q.abandonOpen(t.sessionId);try{$({kind:`error`,id:n,...k(e)})}catch{}}};", X = typeof self < "u" && self.Blob && new Blob(["URL.revokeObjectURL(import.meta.url);", Y], { type: "text/javascript;charset=utf-8" });
function et(e) {
	let t;
	try {
		if (t = X && (self.URL || self.webkitURL).createObjectURL(X), !t) throw "";
		let n = new Worker(t, {
			type: "module",
			name: e?.name
		});
		return n.addEventListener("error", () => {
			(self.URL || self.webkitURL).revokeObjectURL(t);
		}), n;
	} catch {
		return new Worker("data:text/javascript;charset=utf-8," + encodeURIComponent(Y), {
			type: "module",
			name: e?.name
		});
	}
}
var tt = new URL("pptx_parser_bg.wasm", import.meta.url).href, Z = 65536, nt = 16384, rt = new Set(["line", "straightconnector1"]);
function it(e, t) {
	let n = e.x + e.width / 2, r = e.y + e.height / 2, i = -e.rotation * Math.PI / 180, a = Math.cos(i), o = Math.sin(i), s = t.x - n, c = t.y - r, l = n + a * s - o * c, u = r + o * s + a * c;
	return e.flipH && (l = 2 * n - l), e.flipV && (u = 2 * r - u), {
		x: l,
		y: u
	};
}
function at(e, t, n) {
	let r = n.x - t.x, i = n.y - t.y, a = r * r + i * i;
	if (a === 0) return Math.hypot(e.x - t.x, e.y - t.y);
	let o = Math.max(0, Math.min(1, ((e.x - t.x) * r + (e.y - t.y) * i) / a));
	return Math.hypot(e.x - (t.x + o * r), e.y - (t.y + o * i));
}
function ot(e, t, n = 0) {
	if (!Number.isFinite(t.x) || !Number.isFinite(t.y)) return !1;
	let r = it(e, t), i = Number.isFinite(n) && n > 0 ? n : 0;
	if (e.type === "shape" && (rt.has(e.geometry.toLowerCase()) || e.width === 0 || e.height === 0)) return at(r, {
		x: e.x,
		y: e.y
	}, {
		x: e.x + e.width,
		y: e.y + e.height
	}) <= i;
	let a = Math.min(e.x, e.x + e.width), o = Math.max(e.x, e.x + e.width), s = Math.min(e.y, e.y + e.height), c = Math.max(e.y, e.y + e.height);
	return r.x >= a && r.x <= o && r.y >= s && r.y <= c;
}
function* st(e) {
	if (e) for (let t of e.paragraphs) {
		let e = !0;
		for (let n of t.runs) {
			let t = n.type === "text" ? n.text : n.type === "break" ? "\n" : "[equation]";
			t && (yield {
				text: t,
				beginsPart: e
			}, e = !1);
		}
	}
}
function* ct(e) {
	if (e.type === "shape") {
		yield* st(e.textBody);
		return;
	}
	if (e.type === "table") {
		for (let t of e.rows) for (let e of t.cells) yield* st(e.textBody);
		return;
	}
}
function lt(e, t = nt) {
	if (!Number.isFinite(t) || t < 0) throw RangeError("maxTextCharacters must be a finite non-negative number.");
	let n = Math.min(Z, Math.floor(t)), r = e.text, i = r === void 0 ? void 0 : k(r, n), a = r !== void 0 && i.length < r.length;
	return {
		...structuredClone(e),
		...i === void 0 ? {} : { text: i },
		truncated: e.truncated || a,
		truncationReasons: e.truncated || a ? ["text"] : [],
		textCharacters: i?.length ?? 0,
		maxTextCharacters: n
	};
}
function ut(e, t) {
	let n = [], r = 0, i = !1, a = !1;
	for (let o of e) {
		if (a = !0, o.beginsPart && n.length > 0) {
			if (r >= t) {
				i = !0;
				break;
			}
			n.push("\n"), r++;
		}
		let e = Math.max(0, t - r), s = k(o.text, e);
		if (n.push(s), r += s.length, s.length < o.text.length) {
			i = !0;
			break;
		}
	}
	return a ? {
		text: n.join(""),
		truncated: i,
		textCharacters: r
	} : {
		truncated: !1,
		textCharacters: 0
	};
}
function dt(e, t, n, r = {}) {
	if (!Number.isFinite(n.x) || !Number.isFinite(n.y)) throw RangeError("PPTX hit-test point must contain finite coordinates.");
	let i = r.maxTextCharacters ?? nt;
	if (!Number.isFinite(i) || i < 0) throw RangeError("maxTextCharacters must be a finite non-negative number.");
	let a = Math.min(Z, Math.floor(i)), o = r.tolerance ?? 0;
	if (!Number.isFinite(o) || o < 0) throw RangeError("tolerance must be a finite non-negative number.");
	for (let r = t.elements.length - 1; r >= 0; r--) {
		let i = t.elements[r];
		if (!ot(i, n, o)) continue;
		let s = i.type === "chart" ? ie(i.chart, a) : ut(ct(i), a);
		return {
			format: "pptx",
			kind: "element",
			slideIndex: e,
			elementIndex: r,
			origin: t.elementSources?.[r]?.origin ?? "unknown",
			elementType: i.type,
			point: { ...n },
			bounds: {
				x: i.x,
				y: i.y,
				width: i.width,
				height: i.height,
				rotation: i.rotation,
				flipH: i.flipH,
				flipV: i.flipV
			},
			...i.type === "shape" ? {
				...i.id === void 0 ? {} : { shapeId: i.id },
				...i.name === void 0 ? {} : { name: i.name },
				geometry: i.geometry
			} : {},
			...s.text === void 0 ? {} : { text: s.text },
			...i.type === "picture" ? { mimeType: i.mimeType } : {},
			...i.type === "media" ? {
				mimeType: i.mimeType,
				mediaKind: i.mediaKind
			} : {},
			...i.type === "table" ? {
				rowCount: i.rows.length,
				columnCount: i.cols.length
			} : {},
			...i.type === "chart" ? { seriesCount: i.chart.series.length } : {},
			truncated: s.truncated,
			truncationReasons: s.truncated ? ["text"] : [],
			textCharacters: s.textCharacters,
			maxTextCharacters: a
		};
	}
	return null;
}
function ft(e, t) {
	let n = new Set(t.filter((e) => e.length > 0));
	if (n.size === 0) return Object.freeze([]);
	let r = /* @__PURE__ */ new Map();
	for (let [t, i] of e.elements.entries()) {
		let a = i.id;
		if (!a || !n.has(a)) continue;
		let o = e.elementSources?.[t]?.origin ?? "unknown", s = o === "slide" ? 3 : o === "layout" ? 2 : +(o === "master"), c = r.get(a), l = c?.origin === "slide" ? 3 : c?.origin === "layout" ? 2 : +(c?.origin === "master");
		c && l > s || r.set(a, Object.freeze({
			elementId: a,
			elementIndex: t,
			origin: o,
			elementType: i.type,
			bounds: Object.freeze({
				x: i.x,
				y: i.y,
				width: i.width,
				height: i.height,
				rotation: i.rotation,
				flipH: i.flipH,
				flipV: i.flipV
			})
		}));
	}
	return Object.freeze(t.flatMap((e) => {
		let t = r.get(e);
		return t ? [t] : [];
	}));
}
var Q = /* @__PURE__ */ new WeakMap();
function $(e, t) {
	let n = Object.freeze({ ...t });
	for (let t of [...Q.get(e) ?? []]) try {
		t.notify(n);
	} catch (e) {
		try {
			t.report(e);
		} catch {}
	}
}
function pt(e, t, n, r) {
	let i = Q.get(e);
	i || (i = /* @__PURE__ */ new Set(), Q.set(e, i));
	let a = Object.freeze({
		notify: n,
		report: r
	});
	i.add(a);
	try {
		n(Object.freeze({ ...t() }));
	} catch (e) {
		try {
			r(e);
		} catch {}
	}
	return () => {
		i?.delete(a), i?.size === 0 && Q.delete(e);
	};
}
function mt() {
	return new Promise((e) => {
		let t = new MessageChannel();
		t.port1.onmessage = () => {
			t.port1.close(), t.port2.close(), e();
		}, t.port2.postMessage(void 0);
	});
}
var ht = class n {
	_cjkFallback = "jp";
	_fonts;
	_parsedTextChain = !0;
	_metrics = null;
	_worker;
	_bridge;
	_mode = "main";
	_bootstrap = null;
	_preflight = null;
	_availableSlideCount = 0;
	_layoutLifecycle = new De();
	_layoutObservers = new Ee();
	_layoutCompletion = null;
	_parseRequestId = null;
	_progressive = null;
	_progressiveWatchdog;
	_progressiveWatchdogMs;
	_layoutWaiters = /* @__PURE__ */ new Set();
	_slides = null;
	_slidePullClient = null;
	_resourceFailure = null;
	_slidePartIndex = null;
	_rawParts = new Te({
		maxEntries: 64,
		maxBytes: u
	});
	_fontSources = null;
	_metafileFontDemand;
	_symbolFaces = y();
	_fontResolverBridge = null;
	_installedFamilies = null;
	_officeFontLoads = /* @__PURE__ */ new Map();
	_symbolSentinels = /* @__PURE__ */ new Map();
	_embeddedFontFaces = [];
	_embeddedFontAliases = /* @__PURE__ */ new Map();
	_embeddedFontAuthoredFamilies = /* @__PURE__ */ new Map();
	_embeddedFontTuples = /* @__PURE__ */ new Set();
	_destroyed = !1;
	_fetchImage = (e, t) => this.getImage(e, t);
	_fetchMedia = (e) => this.getMedia(e);
	_math;
	_threeD;
	_regionMap;
	_chartEx;
	_tiff;
	constructor(e, t, n) {
		this._worker = e, this._mode = t, this._bridge = new ne(this._worker, {
			correlate: (e) => "protocol" in e && e.protocol === "ooxml-pull-v1" ? e.requestId : "id" in e ? e.id : void 0,
			toError: (e) => !("protocol" in e) && e.kind === "error" ? se(e) : void 0,
			onUnsolicited: (e) => this._onWorkerLayoutPush(e)
		});
		let r = new URL(n ?? tt, ye()).href;
		this._bridge.post({
			kind: "init",
			wasmUrl: r
		});
	}
	_assertResourceHealthy() {
		if (this._resourceFailure) throw this._resourceFailure;
	}
	_rethrowWithResourceFailure(e) {
		let t = e instanceof o ? e : E(e);
		throw t ? (this._resourceFailure ??= t, this._resourceFailure) : e;
	}
	static async load(e, t = {}) {
		if (t = ae(t), t.legacyPpt !== void 0 || t.odp !== void 0) {
			let { loadPptxModelSource: n } = await import("./presentation-model-source-DhSU3GnD.js");
			return n(e, t);
		}
		let r = h(t.cjkFallback), i = ce(t), a = t.mode ?? "main";
		a === "main" && t.fonts && import("./font-source-load-ldveMjyW.js").catch(() => void 0);
		let o = new le({
			enabled: !0,
			format: "pptx",
			mode: a,
			policy: i.policy,
			onMetrics: i.onResourceMetrics,
			emitToConsole: i.debug
		});
		try {
			if (a === "worker" && (typeof Worker > "u" || typeof OffscreenCanvas > "u")) throw Error("mode: 'worker' requires Worker and OffscreenCanvas support");
			let l;
			if (typeof e == "string") {
				let t = await fetch(e);
				if (!t.ok) throw Error(`Failed to fetch: ${t.status} ${t.statusText}`);
				l = await t.arrayBuffer();
			} else l = e;
			l = s(await c(l, t.password)), o.setSourceBytes(l.byteLength), o.checkpoint("container ready");
			let u = a === "worker" ? (await import("./render-worker-host-DznCpFun.js")).createRenderWorker() : new et(), d = a === "worker" ? T(t) : void 0, f;
			try {
				f = new n(u, a, t.wasmUrl), f._metrics = o, t.math && a === "worker" && !d?.math && console.warn("[ooxml] a custom math renderer cannot cross the worker boundary; equations will be skipped in mode: 'worker'. Use the math renderer from @silurus/ooxml/math."), t.threeD && a === "worker" && !d?.threeD && console.warn("[ooxml] a custom 3-D chart renderer cannot cross the worker boundary; charts use their 2-D family fallback in mode: 'worker'. Use the renderer from @silurus/ooxml/three-d."), f._cjkFallback = r, f._math = a === "worker" ? void 0 : t.math, f._threeD = a === "worker" ? void 0 : t.threeD, t.regionMap && a === "worker" && !d?.regionMap && console.warn("[ooxml] a custom Region Map renderer cannot cross the worker boundary; geospatial charts use the unsupported-chart placeholder in mode: 'worker'. Use the renderer from @silurus/ooxml/region-map."), f._regionMap = a === "worker" ? void 0 : t.regionMap, t.chartEx && a === "worker" && !d?.chartEx && console.warn("[ooxml] a custom ChartEx renderer cannot cross the worker boundary; ChartEx charts use the unsupported-chart placeholder in mode: 'worker'. Use the renderer from @silurus/ooxml/chart-ex."), f._chartEx = a === "worker" ? void 0 : t.chartEx, t.tiff && a === "worker" && !d?.tiff && console.warn("[ooxml] a custom TIFF codec cannot cross the worker boundary; recognized TIFF images will use an unavailable-image placeholder in mode: 'worker'. Use the codec from @silurus/ooxml/tiff to display them."), f._tiff = a === "worker" ? void 0 : t.tiff;
				let e = t.progressiveLayout ? {
					onProgress: t.onLayoutProgress,
					onPartial: t.onLayoutPartial,
					onComplete: t.onLayoutComplete,
					firstPublication: Oe(),
					published: !1,
					deferred: !1,
					settled: !1
				} : void 0;
				return f._fonts = be(t.fonts), await f._parse(l, i.policy, f._fonts, t.workerTimeoutMs, (e) => o.observeUsage(e), d, e), o.checkpoint("presentation preflight ready"), a === "main" && t.fonts && f._preflight && !e && await f._ensureFontSources(f._preflight.fontPreloadNames, f._preflight.fontPreloadFacts, f._preflight.fontPreloadDemand), o.succeed({ slides: f.slideCount }), f;
			} catch (e) {
				let t = f;
				throw de(u, t ? () => t.destroy() : void 0), e;
			}
		} catch (e) {
			throw o.fail(e), e;
		}
	}
	async _ensureFontSources(e, t, n) {
		if (this._destroyed || !this._fonts?.length) return;
		let { FontSourceSession: r, PptxInstalledFamilies: i, metafileFontDemand: a, pptxFontDemand: o } = await import("./font-source-load-ldveMjyW.js");
		if (this._destroyed || !this._fonts) return;
		this._installedFamilies ??= new i();
		let s = await this._installedFamilies.exclude(o(e, t, n, this._embeddedFontAliases));
		this._destroyed || !this._fonts || (this._fontSources ??= new r({ sources: this._fonts }), this._metafileFontDemand = a(this._fontSources), await this._fontSources.ensure(s));
	}
	_attachFontResolverBridge(e) {
		this._fontResolverBridge?.dispose(), this._fontResolverBridge = new re({
			post: (e, t) => this._worker.postMessage(e, t),
			sources: e
		});
	}
	async _parse(e, n, i = void 0, a, o, s, c) {
		if (this._mode === "worker" && this._attachFontResolverBridge(i), c) {
			this._progressive = c, this._mode === "worker" ? await this._parseWorkerProgressively(e, n, i, a, o, s, c) : await this._parseMainProgressively(e, n, i, a, o, c, !!i && !s);
			return;
		}
		let u = await this._bridge.request((t) => this._mode === "worker" ? {
			kind: "parse",
			id: t,
			buffer: e,
			resourcePolicy: n,
			...i ? { fonts: i } : {},
			cjkFallback: this._cjkFallback,
			renderers: s
		} : {
			kind: "parse",
			id: t,
			buffer: e,
			resourcePolicy: n,
			cjkFallback: this._cjkFallback,
			...i && !s ? { collectFontDemand: Re() } : {}
		}, [e], { timeoutMs: a });
		if (this._mode === "worker") {
			let e = u;
			e.usage && o?.(e.usage), this._preflight = D(u.preflight), this._bootstrap = this._preflight, this._admitPartFailures(e.partFailures, this._preflight.slideCount), this._availableSlideCount = this._preflight.slideCount;
			return;
		}
		let f = O(u.bootstrap);
		this._bootstrap = f;
		let p = A(f.embeddedFonts, (e) => this.getFontBytes(e)).then((e) => {
			this._destroyed ? d(e.faces) : (this._embeddedFontFaces = e.faces, this._embeddedFontAliases = e.aliases, this._embeddedFontAuthoredFamilies = e.authoredFamilies, this._embeddedFontTuples = e.tuples);
		});
		p.catch(() => void 0), this._slidePullClient = new r({
			slideCount: f.slideCount,
			transport: this._bridge.transport(t),
			open: async (e, t, n) => {
				await this._bridge.request((n) => ({
					kind: "openSlideSession",
					id: n,
					slideIndex: e,
					...t
				}), void 0, { timeoutMs: n });
			},
			onUsage: o
		});
		let m, h;
		try {
			for (let e = 0; e < f.slideCount; e += 1) {
				let t = await this._slidePullClient.load(e, e === 0, a);
				e === 0 && (m = t);
			}
			h = await this._bridge.request((e) => ({
				kind: "finishPresentationPreflight",
				id: e
			}), void 0, { timeoutMs: a }), await p;
		} catch (e) {
			throw p.catch(() => void 0), e;
		}
		this._preflight = D(h.preflight), this._admitPartFailures(h.partFailures, this._preflight.slideCount), this._availableSlideCount = this._preflight.slideCount, this._slides = new q({
			slideCount: this._preflight.slideCount,
			maxCachedSlides: 8,
			maxCachedStructuralBytes: l,
			loadSlide: async (e) => {
				if (e === 0 && m) {
					let e = m;
					return m = void 0, e;
				}
				let t = await this._slidePullClient?.load(e, !0, a);
				if (!t) throw Error("PPTX slide pull client is unavailable");
				return t;
			}
		}), m && this._slides.withSlide(0, () => void 0).catch(() => void 0);
	}
	async _parseMainProgressively(e, t, n, r, i, a, o = !!n) {
		let s = O((await this._bridge.request((n) => ({
			kind: "parse",
			id: n,
			buffer: e,
			resourcePolicy: t,
			cjkFallback: this._cjkFallback,
			progressiveLayout: !0
		}), [e], { timeoutMs: r })).bootstrap);
		this._bootstrap = s;
		let c = A(s.embeddedFonts, (e) => this.getFontBytes(e)).then((e) => {
			this._destroyed ? d(e.faces) : (this._embeddedFontFaces = e.faces, this._embeddedFontAliases = e.aliases, this._embeddedFontAuthoredFamilies = e.authoredFamilies, this._embeddedFontTuples = e.tuples);
		});
		c.catch(() => void 0), this._slidePullClient = this._createSlidePullClient(s.slideCount, r, i), this._slides = new q({
			slideCount: s.slideCount,
			maxCachedSlides: 8,
			maxCachedStructuralBytes: l,
			loadSlide: async (e) => {
				let t = await this._slidePullClient?.load(e, !0, r);
				if (!t) throw Error("PPTX slide pull client is unavailable");
				return t;
			}
		});
		let u = new _e(s, {
			cjkFallback: this._cjkFallback,
			collectFontDemand: o ? await Le(!0) : void 0
		}), f = async () => {
			await c, n && await this._ensureFontSources(u.currentFontPreloadNames, u.currentFontPreloadFacts, u.currentFontPreloadDemandDelta);
		}, p = (async () => {
			for (let e = 0; e < s.slideCount; e += 1) {
				await this._slides.withSlide(e, (e) => {
					u.addSlide(e);
				}), await f();
				let t = u.latestPartFailure;
				t && !a.settled && this._partFailureLog.add(t), this._applyProgressivePrefix(u.snapshot(), a), e === 0 && a.deferred && await mt();
			}
			await c, this._finishProgressiveLayout(u.finish(), a);
		})();
		this._layoutCompletion = p.then(() => void 0, (e) => this._failProgressiveLayout(e, a)), await a.firstPublication.promise;
	}
	async _parseWorkerProgressively(e, t, n, r, i, a, o) {
		this._progressiveWatchdogMs = r;
		let s = this._bridge.request((r) => (this._parseRequestId = r, {
			kind: "parse",
			id: r,
			buffer: e,
			resourcePolicy: t,
			...n ? { fonts: n } : {},
			cjkFallback: this._cjkFallback,
			renderers: a,
			progressiveLayout: !0
		}), [e], { timeoutMs: !1 });
		this._rearmProgressiveWatchdog(), this._layoutCompletion = s.then((e) => {
			this._parseRequestId = null;
			let t = e;
			t.usage && i?.(t.usage);
			let n = D(t.preflight);
			!o.settled && !this._destroyed && this._admitPartFailures(t.partFailures, n.slideCount), this._finishProgressiveLayout(n, o);
		}, (e) => {
			this._parseRequestId = null, this._failProgressiveLayout(e, o);
		}), await o.firstPublication.promise;
	}
	_createSlidePullClient(e, n, i) {
		return new r({
			slideCount: e,
			transport: this._bridge.transport(t),
			open: async (e, t, r) => {
				await this._bridge.request((n) => ({
					kind: "openSlideSession",
					id: n,
					slideIndex: e,
					...t
				}), void 0, { timeoutMs: r ?? n });
			},
			onUsage: i
		});
	}
	_onWorkerLayoutPush(e) {
		if (this._fontResolverBridge?.accept(e) || oe((e, t) => this._worker.postMessage(e, t), e) || !("kind" in e) || e.kind !== "presentationLayoutPartial" || e.forId !== this._parseRequestId || !this._progressive) return;
		let t = this._progressive;
		try {
			this._rearmProgressiveWatchdog(), e.usage && this._metrics?.observeUsage(e.usage), e.bootstrap && (this._bootstrap = O(e.bootstrap));
			let n = this._bootstrap;
			if (!n) throw Error("PPTX progressive worker published before bootstrap");
			let r = this._preflight?.slides ?? [];
			if (e.availableSlides !== r.length + 1 || e.slide.index !== r.length) throw Error("PPTX progressive worker published a non-sequential slide");
			if (e.partFailure !== void 0) {
				let r = he(e.partFailure, n.slideCount);
				if (r.slideIndex !== e.slide.index) throw Error("PPTX progressive worker published a failure for another slide");
				if (this._partFailureLog.add(r), this._destroyed || this._progressive !== t) return;
			}
			this._applyProgressivePrefix(fe({
				...n,
				slides: [...r, e.slide],
				fontPreloadNames: e.fontPreloadNames
			}), t), mt().then(() => {
				this._destroyed || this._parseRequestId !== e.forId || this._bridge.post({
					kind: "continuePresentationPreflight",
					forId: e.forId,
					availableSlides: e.availableSlides
				});
			}).catch((t) => {
				this._destroyed || this._parseRequestId !== e.forId || !this._progressive || (this._failProgressiveLayout(t, this._progressive), this._bridge.terminate());
			});
		} catch (e) {
			if (this._destroyed || this._progressive !== t) return;
			this._failProgressiveLayout(e, t), this._bridge.terminate();
		}
	}
	_applyProgressivePrefix(e, t) {
		if (!(t.settled || this._destroyed)) {
			if (this._preflight = e, this._availableSlideCount = e.slides.length, !t.published && e.slides.length === e.slideCount) {
				t.published = !0, t.deferred = !1;
				return;
			}
			if (this._layoutLifecycle.begin(), this._wakeLayoutWaiters(), this._layoutObservers.notify("onLayoutProgress", t.onProgress, { committedUnits: this._availableSlideCount }), $(this, {
				availableSlides: this._availableSlideCount,
				slideCount: this.slideCount,
				exact: !1,
				complete: !1
			}), !t.published) {
				t.published = !0, t.deferred = e.slides.length < e.slideCount, t.firstPublication.resolve();
				return;
			}
			this._layoutObservers.notify("onLayoutPartial", t.onPartial, {
				availableUnits: this._availableSlideCount,
				totalUnits: this.slideCount,
				exact: !1
			});
		}
	}
	_finishProgressiveLayout(e, t) {
		t.settled || this._destroyed || (t.settled = !0, this._clearProgressiveWatchdog(), this._preflight = e, this._bootstrap ??= e, this._availableSlideCount = e.slideCount, this._layoutLifecycle.succeed(), this._wakeLayoutWaiters(), t.firstPublication.resolve(), $(this, {
			availableSlides: this._availableSlideCount,
			slideCount: this.slideCount,
			exact: !0,
			complete: !0
		}), this._layoutObservers.notify("onLayoutComplete", t.onComplete));
	}
	_failProgressiveLayout(e, t) {
		if (t.settled || (t.settled = !0, this._clearProgressiveWatchdog(), this._destroyed)) return;
		if (!t.deferred) {
			t.firstPublication.reject(e);
			return;
		}
		let n = this._layoutLifecycle.fail(e);
		this._wakeLayoutWaiters(), $(this, {
			availableSlides: this._availableSlideCount,
			slideCount: this.slideCount,
			exact: !1,
			complete: !1,
			error: n
		}), this._layoutObservers.notify("onLayoutComplete", t.onComplete, n);
	}
	_wakeLayoutWaiters() {
		for (let e of this._layoutWaiters) e();
		this._layoutWaiters.clear();
	}
	_rearmProgressiveWatchdog() {
		this._progressiveWatchdogMs !== void 0 && (clearTimeout(this._progressiveWatchdog), this._progressiveWatchdog = setTimeout(() => {
			let e = this._progressive, t = this._progressiveWatchdogMs;
			if (!e || e.settled || t === void 0 || this._destroyed) return;
			let n = /* @__PURE__ */ Error(`worker layout produced no progress for ${t}ms`);
			this._failProgressiveLayout(n, e), this._bridge.terminate();
		}, this._progressiveWatchdogMs));
	}
	_clearProgressiveWatchdog() {
		clearTimeout(this._progressiveWatchdog), this._progressiveWatchdog = void 0, this._progressiveWatchdogMs = void 0;
	}
	async _waitForSlide(e) {
		for (; !this._destroyed && e >= this._availableSlideCount && !this._layoutLifecycle.settled;) await new Promise((e) => this._layoutWaiters.add(e));
		e >= this._availableSlideCount && await this.waitUntilLayoutComplete();
	}
	_assertSlideIndex(e) {
		if (!Number.isInteger(e) || e < 0 || e >= this.slideCount) throw Error(`Slide index ${e} out of range (count: ${this.slideCount})`);
	}
	get slideCount() {
		return this._bootstrap?.slideCount ?? this._preflight?.slideCount ?? 0;
	}
	get availableSlideCount() {
		return this._availableSlideCount;
	}
	get partFailures() {
		return this._partFailureLog.list;
	}
	get _partFailureLog() {
		return ge(this);
	}
	_admitPartFailures(e, t) {
		if (e !== void 0) {
			if (!Array.isArray(e)) throw Error("PPTX worker returned invalid part failures");
			for (let n of e) this._partFailureLog.add(he(n, t));
		}
	}
	_errorPlaceholderText(e, t) {
		let n = Ce(t);
		if (n.kind === "none") return;
		let r = this._partFailureLog.get(e);
		if (!r) return;
		let i = xe(n, r);
		return i === null ? void 0 : Se(i);
	}
	get layoutComplete() {
		return this._layoutLifecycle.complete;
	}
	async waitUntilLayoutComplete() {
		this._layoutCompletion && await this._layoutCompletion, this._layoutLifecycle.throwIfFailed();
	}
	get slideWidth() {
		return this._bootstrap?.slideWidth ?? this._preflight?.slideWidth ?? 0;
	}
	get slideHeight() {
		return this._bootstrap?.slideHeight ?? this._preflight?.slideHeight ?? 0;
	}
	get mode() {
		return this._mode;
	}
	getNotes(e) {
		return Number.isInteger(e) ? this._preflight?.slides[e]?.notes ?? null : null;
	}
	getComments(e) {
		return Number.isInteger(e) ? this._preflight?.slides[e]?.comments ?? [] : [];
	}
	isHidden(e) {
		return Number.isInteger(e) ? this._preflight?.slides[e]?.hidden ?? !1 : !1;
	}
	_partNames() {
		return (this._bootstrap?.slides ?? this._preflight?.slides ?? []).map((e) => e.partName);
	}
	_partIndex() {
		return this._slidePartIndex ||= Ne(this._partNames()), this._slidePartIndex;
	}
	getSlideIndexByPartName(e) {
		return this._partIndex().get(e);
	}
	resolveInternalTarget(e, t = 0) {
		return Fe(e, this._partIndex(), t);
	}
	async _officeRoutesForRequests(e, t) {
		if (this._destroyed) throw Error("Presentation destroyed");
		if (!t) return {
			routes: {},
			installed: []
		};
		let n = this._symbolSentinels.get(t);
		if (n || (n = g(t).catch(() => null), this._symbolSentinels.set(t, n)), await n, this._destroyed) throw Error("Presentation destroyed");
		let r = Ae(e, this._embeddedFontTuples), i = this._officeFontLoads.get(t);
		i || (i = /* @__PURE__ */ new Map(), this._officeFontLoads.set(t, i));
		let a = await Xe(i, r, (e) => m(e, t), t);
		if (this._destroyed) throw Error("Presentation destroyed");
		return a;
	}
	async renderSlide(t, n, r = {}) {
		this._assertResourceHealthy();
		try {
			if (this._mode === "worker") throw Error("renderSlide(canvas) is unavailable in mode: 'worker'; use renderSlideToBitmap() and paint it via an ImageBitmapRenderingContext");
			if (this._assertSlideIndex(n), await this._waitForSlide(n), this._destroyed) throw Error("Presentation destroyed");
			let i = this._preflight, a = this._slides;
			if (!i || !a) throw Error("Presentation not loaded");
			let o = this._errorPlaceholderText(n, r.errorPlaceholder), s = r.dpr ?? v(), c = r.width ?? ((_(t) ? t.offsetWidth : 0) || 960), l = await a.withSlide(n, (e) => pe(e, i.majorFont, i.minorFont));
			if (this._destroyed) throw Error("Presentation destroyed");
			let u = _(t) ? t.ownerDocument.fonts : typeof document < "u" ? document.fonts : null, { routes: d, installed: f } = await this._officeRoutesForRequests(l, u);
			await a.withSlide(n, (n) => {
				if (this._destroyed) throw Error("Presentation destroyed");
				return this._assertResourceHealthy(), w(this._fetchImage, this._fontSources?.loaded), C(this._fetchImage, this._fontSources ? this._metafileFontDemand : void 0), e(t, n, i.slideWidth, i.slideHeight, {
					width: c,
					dpr: s,
					defaultTextColor: i.defaultTextColor,
					parsedTextChain: this._parsedTextChain,
					cjkFallback: this._cjkFallback,
					majorFont: i.majorFont,
					minorFont: i.minorFont,
					hlinkColor: i.hlinkColor,
					embeddedFontAliases: this._embeddedFontAliases,
					embeddedFontAuthoredFamilies: this._embeddedFontAuthoredFamilies,
					embeddedFontTuples: this._embeddedFontTuples,
					officeFontRoutes: d,
					officeInstalledFamilies: f,
					fontSources: this._fontSources?.loaded,
					symbolFaces: this._symbolFaces,
					fetchMedia: this._fetchMedia,
					fetchImage: this._fetchImage,
					skipMediaControls: r.skipMediaControls,
					dim: r.dim,
					math: this._math,
					threeD: this._threeD,
					regionMap: this._regionMap,
					chartEx: this._chartEx,
					tiff: this._tiff,
					imageResources: r.imageResources,
					...o === void 0 ? {} : { errorPlaceholderText: o }
				}, r.onTextRun);
			});
		} catch (e) {
			this._rethrowWithResourceFailure(e);
		}
	}
	async renderSlideToBitmap(e, t = {}) {
		this._assertResourceHealthy();
		try {
			this._assertSlideIndex(e), await this._waitForSlide(e);
			let n = t.width ?? 960, r = t.dpr ?? v();
			if (this._mode === "worker") {
				let i = this._errorPlaceholderText(e, t.errorPlaceholder), a = new OffscreenCanvas(1, 1), o = await this._bridge.request((o) => ({
					kind: "renderSlide",
					id: o,
					slideIndex: e,
					width: n,
					dpr: r,
					imageResources: t.imageResources,
					skipMediaControls: t.skipMediaControls,
					dim: t.dim,
					...i === void 0 ? {} : { errorPlaceholderText: i },
					canvas: a
				}), [a]);
				try {
					if (t.onTextRun) for (let e of o.runs) t.onTextRun(e);
				} catch (e) {
					throw S(o.bitmap), e;
				}
				return o.bitmap;
			}
			let i = new OffscreenCanvas(1, 1);
			return await this.renderSlide(i, e, {
				width: n,
				dpr: r,
				imageResources: t.imageResources,
				skipMediaControls: t.skipMediaControls,
				dim: t.dim,
				onTextRun: t.onTextRun,
				...t.errorPlaceholder === void 0 ? {} : { errorPlaceholder: t.errorPlaceholder }
			}), i.transferToImageBitmap();
		} catch (e) {
			this._rethrowWithResourceFailure(e);
		}
	}
	async collectSlideRuns(e, t = 960) {
		this._assertResourceHealthy();
		try {
			if (this._assertSlideIndex(e), await this._waitForSlide(e), this._mode === "worker") {
				let n = new OffscreenCanvas(1, 1);
				return (await this._bridge.request((r) => ({
					kind: "collectRuns",
					id: r,
					slideIndex: e,
					width: t,
					canvas: n
				}), [n])).runs;
			}
			let n = [], r = new OffscreenCanvas(1, 1);
			return await this.renderSlide(r, e, {
				width: t,
				onTextRun: (e) => n.push(e)
			}), n;
		} catch (e) {
			this._rethrowWithResourceFailure(e);
		}
	}
	async getElementContextAt(e, t, n = {}) {
		this._assertResourceHealthy(), this._assertSlideIndex(e);
		try {
			if (await this._waitForSlide(e), this._mode === "worker") return (await this._bridge.request((r) => ({
				kind: "hitTestElement",
				id: r,
				slideIndex: e,
				point: t,
				options: n
			}))).context;
			if (!this._slides) throw Error("Presentation not loaded");
			return await this._slides.withSlide(e, (r) => dt(e, r, t, n));
		} catch (e) {
			this._rethrowWithResourceFailure(e);
		}
	}
	async getElementBoundsByIds(e, t) {
		this._assertResourceHealthy(), this._assertSlideIndex(e);
		let n = Object.freeze(t.filter((e) => typeof e == "string" && e.length > 0));
		if (n.length === 0) return Object.freeze([]);
		try {
			if (await this._waitForSlide(e), this._mode === "worker") return (await this._bridge.request((t) => ({
				kind: "resolveElementBounds",
				id: t,
				slideIndex: e,
				elementIds: n
			}))).bounds;
			if (!this._slides) throw Error("Presentation not loaded");
			return await this._slides.withSlide(e, (e) => ft(e, n));
		} catch (e) {
			this._rethrowWithResourceFailure(e);
		}
	}
	async getMedia(e) {
		this._assertResourceHealthy();
		try {
			let t = this._findMimeTypeForPath(e);
			return await this._rawParts.get(e, t, async () => {
				let n = (await this._bridge.request((t) => ({
					kind: "extractMedia",
					id: t,
					path: e
				}))).bytes;
				return new Blob([n], { type: t });
			});
		} catch (e) {
			this._rethrowWithResourceFailure(e);
		}
	}
	_findMimeTypeForPath(e) {
		return this._preflight ? me(this._preflight, e) : "";
	}
	async getImage(e, t) {
		this._assertResourceHealthy();
		try {
			return await this._rawParts.get(e, t, async () => {
				let n = (await this._bridge.request((t) => ({
					kind: "extractImage",
					id: t,
					path: e
				}))).bytes;
				return new Blob([n], { type: t });
			});
		} catch (e) {
			this._rethrowWithResourceFailure(e);
		}
	}
	async getFontBytes(e) {
		this._assertResourceHealthy();
		try {
			let t = await this._bridge.request((t) => ({
				kind: "extractFont",
				id: t,
				path: e
			}));
			return new Uint8Array(t.bytes);
		} catch (e) {
			this._rethrowWithResourceFailure(e);
		}
	}
	async getResourceMetrics() {
		let e = this._metrics;
		if (!e) throw Error("Presentation not loaded");
		return ue(e, async (e) => (await this._bridge.request((e) => ({
			kind: "resourceUsage",
			id: e
		}), void 0, { timeoutMs: e })).usage);
	}
	async toMarkdown() {
		this._assertResourceHealthy();
		try {
			return (await this._bridge.request((e) => ({
				kind: "toMarkdown",
				id: e
			}))).markdown;
		} catch (e) {
			this._rethrowWithResourceFailure(e);
		}
	}
	async presentSlide(e, t, n = {}) {
		this._assertResourceHealthy();
		try {
			if (this._assertSlideIndex(t), await this._waitForSlide(t), !this._preflight) throw Error("Presentation not loaded");
			let r = n.dpr ?? v(), i = n.width ?? (e.offsetWidth || 960), a = this.slideWidth > 0 ? i * this.slideHeight / this.slideWidth : 0;
			e.style.width = `${Math.round(i)}px`, e.style.height = `${Math.round(a)}px`, e.style.display || (e.style.display = "block");
			let o = this._mode === "worker" ? async () => {
				let a = await this.renderSlideToBitmap(t, {
					width: i,
					dpr: r,
					imageResources: n.imageResources,
					skipMediaControls: !0,
					dim: n.dim,
					onTextRun: n.onTextRun,
					...n.errorPlaceholder === void 0 ? {} : { errorPlaceholder: n.errorPlaceholder }
				});
				try {
					e.width = a.width, e.height = a.height;
					let t = e.getContext("2d");
					if (!t) throw Error("2D context not available");
					t.drawImage(a, 0, 0);
				} finally {
					S(a);
				}
			} : () => this.renderSlide(e, t, {
				width: i,
				dpr: r,
				imageResources: n.imageResources,
				skipMediaControls: !0,
				dim: n.dim,
				onTextRun: n.onTextRun,
				...n.errorPlaceholder === void 0 ? {} : { errorPlaceholder: n.errorPlaceholder }
			});
			return await Ve(e, this._preflight.slides[t]?.mediaElements ?? [], {
				width: i,
				height: a,
				slideWidthEmu: this.slideWidth,
				fetchMedia: this._fetchMedia,
				fetchImage: this._fetchImage,
				drawBase: o,
				onError: n.onError
			});
		} catch (e) {
			this._rethrowWithResourceFailure(e);
		}
	}
	destroy() {
		this._destroyed = !0, this._partFailureLog.close(), this._clearProgressiveWatchdog(), this._slidePullClient?.cancelAll(), this._bridge.terminate(), this._slides?.clear(), this._slides = null, this._slidePullClient = null, this._bootstrap = null, this._preflight = null, this._availableSlideCount = 0, this._layoutLifecycle.succeed(), this._layoutCompletion = null, this._progressive = null, this._parseRequestId = null, this._wakeLayoutWaiters(), this._resourceFailure = null, this._slidePartIndex = null, this._rawParts.clear();
		let e = this._fontSources;
		this._fontSources = null, this._metafileFontDemand = void 0, C(this._fetchImage, void 0), e?.release(), this._fontResolverBridge?.dispose(), this._fontResolverBridge = null, this._fonts = void 0, this._installedFamilies = null, this._symbolFaces?.dispose(), this._symbolFaces = y();
		for (let e of this._officeFontLoads.values()) for (let t of $e(e)) t.then((e) => p(e.faces));
		this._officeFontLoads.clear();
		for (let e of this._symbolSentinels.values()) e.then((e) => {
			e && p(e);
		});
		this._symbolSentinels.clear(), this._embeddedFontFaces.length > 0 && (d(this._embeddedFontFaces), this._embeddedFontFaces = []), this._embeddedFontAliases = /* @__PURE__ */ new Map(), this._embeddedFontAuthoredFamilies = /* @__PURE__ */ new Map(), this._embeddedFontTuples = /* @__PURE__ */ new Set(), x(this._fetchImage), b(this._fetchImage);
	}
};
export { Ie as a, lt as i, pt as n, Z as r, ht as t };
