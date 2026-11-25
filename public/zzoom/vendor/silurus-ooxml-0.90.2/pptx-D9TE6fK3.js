import { t as e } from "./chunk-D5OxutzX.js";
import { i as t, r as n } from "./slide-pull-client-D2ZoyzhO.js";
import { t as r } from "./substitutions-_KDT_mVq.js";
import { n as i, t as a } from "./ooxml-error-DbICW35n.js";
import { u as o } from "./vertical-vert-feature-ru96Mg5B.js";
import { a as s } from "./units-BBDOirYi.js";
import { f as c, u as l } from "./pixel-budget-DI82Hn3R.js";
import { i as u, t as d } from "./tiff-contract-DEd8CGuz.js";
import { _ as f, a as p, c as ee, g as te, h as ne, i as m, l as h, n as re, o as g, r as ie, s as ae, t as oe, u as _, v as se, x as ce } from "./canvas-viewer-mechanics-DrH37lzF.js";
import { a as le, o as ue } from "./chart-context-DqNY4BWJ.js";
import { t as v } from "./visible-index-vN-4BNn7.js";
import { a as y, i as b, n as x, r as S, t as C } from "./presentation-Cti32_db.js";
import { C as w, S as T, _ as de, a as fe, b as pe, c as me, d as he, f as ge, g as _e, h as ve, i as ye, l as be, m as xe, n as Se, o as Ce, p as we, r as E, t as D, u as O, v as k, x as A, y as Te } from "./comment-overlay-controller-ByvOX8Dp.js";
import { r as j } from "./hyperlink-BOJHX05H.js";
import { n as Ee, t as M } from "./highlight-rect-CuBeY9DT.js";
import { s as N } from "./presentation-preflight-CI5kmMvH.js";
import { i as De, o as Oe, r as ke, s as Ae } from "./source-GXgH3t1X.js";
import { n as P, s as F } from "./part-failures-pZSloLZv.js";
import { t as I } from "./comment-occurrence-8XJiNr_2.js";
function L(e) {
	let t = e.textBodyRotation ?? 0, n = e.shapeFlipH === !0, r = e.shapeFlipV === !0;
	if (n || r) return `rotate(${e.rotation}deg) scale(${n ? -1 : 1}, ${r ? -1 : 1})` + (t === 0 ? "" : ` rotate(${t}deg)`);
	let i = e.rotation + t;
	return i === 0 ? "" : `rotate(${i}deg)`;
}
function R(e, t) {
	return `${e.shapeX},${e.shapeY},${e.shapeW},${e.shapeH},${e.cellHorzOverflow ?? "shape"},${t}`;
}
function z(e, t, n, r, i, a) {
	let o = e.createElement("div"), s = t.cellHorzOverflow !== void 0;
	o.style.cssText = `position:absolute;left:${M(t.shapeX, n)};top:${M(t.shapeY, r)};width:${M(t.shapeW, n)};height:${M(t.shapeH, r)};pointer-events:${i};overflow:${s ? "visible" : a};`, t.cellHorzOverflow === "clip" && (o.style.overflowX = "clip", o.style.overflowY = "visible");
	let c = L(t);
	return c && (o.style.transformOrigin = "center center", o.style.transform = c), {
		div: o,
		w: t.shapeW,
		h: t.shapeH
	};
}
function B(e, t, n, r, i, a) {
	e.innerHTML = "", T(e, "ooxmlSelectionSurface", "pptx"), T(e, "slideIndex", a === void 0 ? void 0 : String(a));
	let o = /* @__PURE__ */ new Map(), s = e.ownerDocument ?? document;
	for (let [a, c] of t.entries()) {
		let t = R(c, L(c)), l = o.get(t);
		if (!l) {
			let i = z(s, c, n, r, "all", "visible");
			l = i, o.set(t, l), e.appendChild(i.div);
		}
		let u = s.createElement("span");
		T(u, "ooxmlSelectionRun", "pptx"), T(u, "runIndex", String(a)), c.shapeId !== void 0 && T(u, "shapeId", c.shapeId), c.elementIndex !== void 0 && T(u, "elementIndex", String(c.elementIndex)), c.origin !== void 0 && T(u, "elementOrigin", c.origin), u.textContent = c.text;
		let d = i ? c.hyperlink : void 0;
		u.style.cssText = `position:absolute;left:${M(c.inShapeX, l.w)};top:${M(c.inShapeY, l.h)};font:${c.font};line-height:${c.h}px;letter-spacing:0;white-space:pre;color:transparent;cursor:${d ? "pointer" : "text"};`, d && i && (u.title = d.kind === "external" ? d.url : d.ref, u.addEventListener("click", (e) => {
			e.preventDefault(), i(d);
		})), l.div.appendChild(u);
	}
}
function V(e, t, n, r, i, a, o = {}) {
	e.innerHTML = "";
	let s = o.match ?? "rgba(255, 214, 0, 0.42)", c = o.active ?? "rgba(255, 140, 0, 0.55)", l = e.ownerDocument ?? document, u = /* @__PURE__ */ new Map(), d = (t) => {
		let n = R(t, L(t)), a = u.get(n);
		if (!a) {
			let o = z(l, t, r, i, "none", "hidden");
			a = o, u.set(n, a), e.appendChild(o.div);
		}
		return a;
	};
	for (let e of n) {
		let n = e.active ? c : s;
		for (let r of e.slices) {
			let e = t[r.runIndex];
			if (!e) continue;
			let i = a(e.font), { x: o, width: s } = Ee(e.text, r.start, r.end, i);
			if (s <= 0) continue;
			let c = d(e), u = l.createElement("div");
			u.style.cssText = `position:absolute;left:${M(e.inShapeX + o, c.w)};top:${M(e.inShapeY, c.h)};width:${M(s, c.w)};height:${M(e.h, c.h)};background:${n};pointer-events:none;`, c.div.appendChild(u);
		}
	}
}
function je(e, t) {
	let n = e.tableCell, r = t.tableCell;
	return !n && !r ? !0 : !n || !r ? !1 : (e.renderElementIndex ?? e.elementIndex) === (t.renderElementIndex ?? t.elementIndex) && e.origin === t.origin && e.shapeId === t.shapeId && n.row === r.row && n.column === r.column;
}
function Me(e, t) {
	for (let n = 1; n < t.length; n++) {
		let r = e[t[n - 1].runIndex], i = e[t[n].runIndex];
		if (!r || !i || !je(r, i)) return !1;
	}
	return !0;
}
var H = class extends pe {
	constructor(e, t, n) {
		super(e, t, (e) => ({ slide: e }), Me, n);
	}
	slideRuns(e) {
		return this.unitRuns(e);
	}
	setSlideRuns(e, t) {
		this.setUnitRuns(e, t);
	}
	slideHighlights(e) {
		return this.unitHighlights(e);
	}
	activeSlide() {
		return this.activeUnit();
	}
}, U = {
	color: "#ffffff",
	opacity: .6
};
function W(e) {
	return {
		color: e?.color ?? U.color,
		opacity: e?.opacity ?? U.opacity
	};
}
function Ne(e, t, n, r, i = {}) {
	let a = Te({
		id: e.id,
		author: e.author,
		date: e.date,
		text: e.text,
		status: e.status ?? "active"
	}, (e.replies ?? []).map((e) => ({
		id: e.id,
		author: e.author,
		date: e.date,
		text: e.text,
		status: e.status ?? "active"
	})), i.maxTextCharacters);
	return Object.freeze({
		format: "pptx",
		kind: "comment",
		slideIndex: t,
		commentIndex: n,
		occurrenceId: r,
		...e.id ? { commentId: e.id } : {},
		...Number.isFinite(e.x) && Number.isFinite(e.y) ? { point: Object.freeze({
			x: e.x,
			y: e.y
		}) } : {},
		thread: a.thread,
		truncated: a.truncated,
		truncationReasons: a.truncated ? ["text"] : [],
		textCharacters: a.textCharacters,
		maxTextCharacters: a.maxTextCharacters
	});
}
function Pe(e) {
	for (let t = e; t; t = t.parentElement) {
		let e = A(t.dataset.slideIndex);
		if (e !== null) return e;
	}
	return null;
}
function G(e, t, n = {}) {
	let r = ee(e, t, (e) => {
		let t = Pe(e), n = A(e.dataset.runIndex);
		if (t === null || n === null) return null;
		let r = A(e.dataset.elementIndex), i = e.dataset.elementOrigin, a = r !== null && (i === "master" || i === "layout" || i === "slide");
		return {
			slideIndex: t,
			runIndex: n,
			...e.dataset.shapeId === void 0 ? {} : { shapeId: e.dataset.shapeId },
			...a ? {
				elementIndex: r,
				origin: i
			} : {}
		};
	}, {
		maxChars: n.maxTextCharacters,
		maxLocators: n.maxRunLocators
	});
	if (!r) return null;
	let i = [...r.locators].sort((e, t) => e.slideIndex - t.slideIndex || e.runIndex - t.runIndex);
	return {
		format: "pptx",
		kind: "text",
		text: r.text,
		slideIndexes: [...new Set(i.map((e) => e.slideIndex))],
		shapeIds: [...new Set(i.flatMap((e) => e.shapeId ? [e.shapeId] : []))],
		runs: i,
		truncated: r.truncated,
		truncationReasons: r.truncationReasons,
		textCharacters: r.textCharacters,
		maxTextCharacters: r.maxTextCharacters,
		maxRunLocators: r.maxLocators
	};
}
function K(e, t, n, r, i) {
	return r === "worker" ? e.renderSlideToBitmap(n, i) : e.renderSlide(t, n, i);
}
function q(e) {
	let t = e.ownerDocument ?? document, n = new re(e, "Loading slide"), r = n.layer;
	r.style.backdropFilter = "blur(2px)";
	let i = t.createElement("span");
	return i.className = "ooxml-pptx-progress-circle", i.style.cssText = [
		"width:34px",
		"height:34px",
		"box-sizing:border-box",
		"border-radius:50%",
		"border:3px solid var(--border-bright, rgba(100,116,139,0.28))",
		"border-top-color:var(--signal, #12bfd8)",
		"box-shadow:0 2px 10px rgba(15,23,42,0.08)"
	].join(";"), i.setAttribute("aria-hidden", "true"), r.appendChild(i), !(t.defaultView?.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? !1) && typeof i.animate == "function" && i.animate([{ transform: "rotate(0deg)" }, { transform: "rotate(360deg)" }], {
		duration: 800,
		iterations: Infinity,
		easing: "linear"
	}), n;
}
var J = Symbol("PptxViewer.borrowedPresentation"), Y = class e {
	canvas;
	wrapper;
	canvasMount;
	_scale = null;
	textLayer = null;
	highlightLayer = null;
	elementLayer = null;
	_find;
	_findGeneration = 0;
	_measureCtx = null;
	presentationOwner;
	get engine() {
		return this.presentationOwner.current;
	}
	borrowed;
	hostWindow;
	opts;
	currentSlide = 0;
	_renderedSlide = -1;
	_hiddenMode;
	_findSkipsHidden = !1;
	handle = null;
	_mode;
	renderDispatcher;
	errorRouter;
	destroyed = !1;
	_partFailureDelivery;
	selectionChangeListener = null;
	selectionContextKey = "null";
	elementClickListener = null;
	contextMenuListener = null;
	elementContext = null;
	elementHitGeneration = 0;
	elementHitTolerance;
	_loadingIndicator;
	_layoutUnsubscribe = null;
	_layoutWaiters = /* @__PURE__ */ new Set();
	_layoutFailed = !1;
	_navigationGeneration = 0;
	_renderProgressGeneration = 0;
	_lastReportedSlide = -1;
	_lastReportedTotal = -1;
	_lastReportedAvailable = -1;
	_lastReportedLayoutComplete = null;
	static fromPresentation(t, n, r = {}) {
		return new e(t, {
			...r,
			[J]: n
		});
	}
	constructor(e, t = {}) {
		this.opts = t, this.canvas = e;
		let n = t[J];
		this.borrowed = n !== void 0, this._mode = _("PptxViewer", t.mode, n), this.presentationOwner = new g("PptxViewer", n ?? null, !1);
		let r = e.ownerDocument?.defaultView ?? (typeof window < "u" ? window : null);
		if (!r) throw Error("PptxViewer requires a canvas with an active Window");
		this.hostWindow = r;
		let i = t.elementHitTolerance ?? 6;
		if (!Number.isFinite(i) || i < 0) throw RangeError("elementHitTolerance must be a finite non-negative number.");
		this.elementHitTolerance = i, this._hiddenMode = t.hiddenSlideMode ?? "show", this.canvasMount = new oe(e, {
			wrapperCssText: "position:relative;display:inline-block;vertical-align:top;",
			forceDisplayBlock: !0
		}), this.wrapper = this.canvasMount.wrapper, this.renderDispatcher = new p(e, this._mode === "worker" && !t.enableMediaPlayback), this.errorRouter = new m("PptxViewer", t.onError), F(t.errorPlaceholder), this._partFailureDelivery = new P("PptxViewer", t.onPartFailure, (e) => e.slideIndex);
		let a = new ie(this.wrapper, t.enableTextSelection === !0, t.enableElementSelection === !0);
		this.textLayer = a.textLayer, this.highlightLayer = a.highlightLayer, this.elementLayer = a.elementLayer, this._loadingIndicator = q(this.wrapper), this.wrapper.insertBefore(this._loadingIndicator.layer, this.elementLayer), this.textLayer && (t.onSelectionContextChange || t.enableElementSelection) && (this.selectionChangeListener = () => this._emitSelectionContextChange(), this.wrapper.ownerDocument.addEventListener("selectionchange", this.selectionChangeListener)), t.enableElementSelection && (this.elementClickListener = (e) => {
			this._onElementClick(e).catch((e) => this._reportRenderError(e));
		}, this.wrapper.addEventListener("click", this.elementClickListener)), t.onContextMenu && (this.contextMenuListener = (e) => this._onContextMenu(e), this.wrapper.addEventListener("contextmenu", this.contextMenuListener)), this._find = new H(() => this.slideCount, (e) => this._collectSlideRuns(e), (e) => !(this._findSkipsHidden && this.engine?.isHidden(e))), n && this._bindLayoutPresentation(n);
	}
	async load(e) {
		let t = this._partFailureDelivery.beginLoad();
		try {
			await this._loadSource(e);
		} finally {
			let e = this.destroyed ? null : this.engine;
			this._partFailureDelivery.endLoad(t, e ? N(e) : null);
		}
	}
	async _loadSource(e) {
		if (this.destroyed) throw Error("PptxViewer is destroyed");
		if (this.borrowed) throw Error("PptxViewer.load() is unsupported on a Viewer created by fromPresentation(); the borrowed presentation is already loaded.");
		let t = !1;
		try {
			let n = await this.presentationOwner.replace(() => C.load(e, {
				password: this.opts.password,
				useGoogleFonts: this.opts.useGoogleFonts,
				fonts: this.opts.fonts,
				cjkFallback: this.opts.cjkFallback,
				maxZipEntryBytes: this.opts.maxZipEntryBytes,
				resourceLimits: this.opts.resourceLimits,
				debug: this.opts.debug,
				onResourceMetrics: this.opts.onResourceMetrics,
				workerTimeoutMs: this.opts.workerTimeoutMs,
				wasmUrl: this.opts.wasmUrl,
				math: this.opts.math,
				threeD: this.opts.threeD,
				regionMap: this.opts.regionMap,
				chartEx: this.opts.chartEx,
				tiff: this.opts.tiff,
				mode: this._mode,
				...this.opts.legacyPpt === void 0 ? void 0 : { legacyPpt: this.opts.legacyPpt },
				...this.opts.odp === void 0 ? void 0 : { odp: this.opts.odp },
				progressiveLayout: this.opts.progressiveLayout,
				onLayoutProgress: this.opts.onLayoutProgress,
				onLayoutPartial: this.opts.onLayoutPartial,
				onLayoutComplete: this.opts.onLayoutComplete
			}), () => {
				this._invalidateElementSelection(!1), t = !0, this.renderDispatcher.begin(), this._invalidateFind(), this.handle?.destroy(), this.handle = null, this._unbindLayoutPresentation();
			});
			if (!n) return;
			if (this.destroyed || (this._bindLayoutPresentation(n), this.destroyed)) throw Error("PptxViewer is destroyed");
			if (n !== this.engine) return;
			let r = this._beginNavigation();
			if (this.currentSlide = await this._initialSlide(r), r !== this._navigationGeneration || n !== this.engine) return;
			this._renderedSlide = -1, this._invalidateFind(), await this.renderCurrentSlide();
		} catch (e) {
			throw this.destroyed ? Error("PptxViewer is destroyed") : e instanceof Error ? e : Error(String(e));
		}
		t && !this.destroyed && this._emitSelectionContextChange();
	}
	async goToSlide(e) {
		let t = this._beginNavigation();
		await this._goToSlide(e, t);
	}
	async _goToSlide(e, t, n = !1) {
		if (t !== this._navigationGeneration || !this.engine || this.slideCount === 0) return;
		let r = Math.max(0, Math.min(e, this.slideCount - 1));
		if (this._hiddenMode === "skip") {
			let e = await this._nearestShownSlide(r, t, n);
			if (t !== this._navigationGeneration) return;
			typeof e == "number" && (r = e);
		}
		let i = r !== this.currentSlide;
		i && this._invalidateElementSelection(!1), this.currentSlide = r, await this.renderCurrentSlide(), i && !this.destroyed && this._emitSelectionContextChange();
	}
	async nextSlide() {
		let e = this._beginNavigation(), t = await this._step(1, e);
		await this._goToSlide(t, e);
	}
	async prevSlide() {
		let e = this._beginNavigation(), t = await this._step(-1, e);
		await this._goToSlide(t, e);
	}
	async _step(e, t) {
		let n = this.engine, r = this.currentSlide;
		if (this._hiddenMode !== "skip" || !n) return r + e;
		let i = await this._scanShown(r + e, e, t);
		return typeof i == "number" ? i : r;
	}
	async _scanShown(e, t, n) {
		let r = this.engine;
		if (!r) return null;
		for (let i = e; i >= 0 && i < this.slideCount; i += t) {
			if (i >= r.availableSlideCount && (r.layoutComplete || this._setLoading(!0), !await this._waitForSlide(r, i, () => n === this._navigationGeneration))) return null;
			if (!r.isHidden(i)) return i;
		}
	}
	async _nearestShownSlide(e, t, n = !1) {
		if (n) {
			let n = await this._scanShown(e, -1, t);
			return n === void 0 ? await this._scanShown(e + 1, 1, t) : n;
		}
		let r = await this._scanShown(e, 1, t);
		return r === void 0 ? await this._scanShown(e - 1, -1, t) : r;
	}
	async _initialSlide(e) {
		let t = this.engine;
		if (this._hiddenMode !== "skip" || !t || this.slideCount === 0 || t.availableSlideCount === 0 && !await this._waitForSlide(t, 0, () => e === this._navigationGeneration) || !t.isHidden(0)) return 0;
		let n = await this._step(1, e);
		return n === 0 ? 0 : n;
	}
	_dim() {
		return W(this.opts.hiddenSlideDim);
	}
	async setHiddenSlideMode(e) {
		let t = this._beginNavigation();
		this._hiddenMode === "skip" != (e === "skip") && this._invalidateFind(), this._hiddenMode = e;
		let n = this.currentSlide;
		if (e === "skip" && this.engine) {
			let e = this.engine;
			if (this.currentSlide >= e.availableSlideCount && !await this._waitForSlide(e, this.currentSlide, () => t === this._navigationGeneration)) return;
			e.isHidden(this.currentSlide) && (n = await this._step(1, t), n === this.currentSlide && (n = await this._step(-1, t)));
		}
		if (t !== this._navigationGeneration) return;
		let r = n !== this.currentSlide;
		r && this._invalidateElementSelection(!1), this.currentSlide = n, await this.renderCurrentSlide(), r && !this.destroyed && this._emitSelectionContextChange();
	}
	get hiddenSlideMode() {
		return this._hiddenMode;
	}
	get visibleSlideCount() {
		if (!this.engine) return 0;
		let e = this.engine;
		return v((t) => e.isHidden(t), this.slideCount);
	}
	get slideIndex() {
		return this.currentSlide;
	}
	get slideCount() {
		return this.engine?.slideCount ?? 0;
	}
	get partFailures() {
		return this.destroyed ? [] : this.engine?.partFailures ?? [];
	}
	get availableSlideCount() {
		return this.engine?.availableSlideCount ?? this.slideCount;
	}
	get layoutComplete() {
		return this.engine?.layoutComplete ?? !0;
	}
	async waitUntilLayoutComplete() {
		await this.errorRouter.ownBackgroundLifecycle(async () => {
			await this.engine?.waitUntilLayoutComplete?.();
		});
	}
	getNotes(e) {
		return this.engine?.getNotes(e) ?? null;
	}
	get canvasElement() {
		return this.canvas;
	}
	_naturalWidthPx() {
		let e = this.engine?.slideWidth ?? 0;
		return e > 0 ? e / s : 0;
	}
	_targetWidth() {
		if (this._scale === null) return this.opts.width ?? (this.canvas.offsetWidth || 960);
		let e = this._naturalWidthPx();
		return e <= 0 ? this.opts.width ?? (this.canvas.offsetWidth || 960) : Math.round(e * this._scale);
	}
	getScale() {
		if (this._scale !== null) return this._scale;
		let e = this._naturalWidthPx();
		return e <= 0 ? 1 : this._targetWidth() / e;
	}
	_zoomMin() {
		return this.opts.zoomMin ?? .1;
	}
	_zoomMax() {
		return this.opts.zoomMax ?? 4;
	}
	async setScale(e) {
		let t = ne(e, this._zoomMin(), this._zoomMax()), n = t !== this.getScale();
		this._scale = t, await this.renderCurrentSlide(), n && this.opts.onScaleChange?.(t);
	}
	async zoomIn() {
		await this.setScale(f(this.getScale()));
	}
	async zoomOut() {
		await this.setScale(se(this.getScale()));
	}
	async fitWidth() {
		await this._fit("width");
	}
	async fitPage() {
		await this._fit("page");
	}
	async _fit(e) {
		if (!this.engine) return;
		let t = this.wrapper.parentElement;
		if (!t) return;
		let n = te({
			contentWidth: this.engine.slideWidth / s,
			contentHeight: this.engine.slideHeight / s,
			containerWidth: t.clientWidth,
			containerHeight: t.clientHeight
		}, e);
		n <= 0 || await this.setScale(n);
	}
	async renderCurrentSlide() {
		let e = this.engine;
		if (!e) return;
		let t = this.currentSlide, n = ++this._renderProgressGeneration;
		this._setLoading(t >= this.availableSlideCount && !this.layoutComplete);
		let r = this.renderDispatcher.begin();
		try {
			if (t >= e.availableSlideCount && !await this._waitForSlide(e, t, () => n === this._renderProgressGeneration && this.renderDispatcher.isCurrent(r) && e === this.engine && t === this.currentSlide)) return;
			let i = this._hiddenMode === "dim" && e.isHidden(t) ? this._dim() : void 0, a = this._targetWidth(), s = this.opts.dpr ?? o(), c = a / e.slideWidth, l = Math.round(e.slideHeight * c);
			this.canvas.style.width = `${a}px`, this.canvas.style.height = `${l}px`, this.handle?.destroy(), this.handle = null;
			let u = this._mode === "worker", d = [], f = (e) => d.push(e);
			if (this.opts.enableMediaPlayback) {
				let n = await e.presentSlide(this.canvas, t, {
					width: a,
					dpr: s,
					imageResources: this.opts.imageResources,
					dim: i,
					onTextRun: f,
					...this.opts.errorPlaceholder === void 0 ? {} : { errorPlaceholder: this.opts.errorPlaceholder },
					onError: (e) => {
						this.renderDispatcher.isCurrent(r) && this._reportRenderError(e);
					}
				});
				if (!this.renderDispatcher.isCurrent(r)) {
					n.destroy();
					return;
				}
				this.handle = n;
			} else if (u) {
				let e = await K(this.engine, this.canvas, t, "worker", {
					width: a,
					dpr: s,
					imageResources: this.opts.imageResources,
					dim: i,
					onTextRun: f,
					...this.opts.errorPlaceholder === void 0 ? {} : { errorPlaceholder: this.opts.errorPlaceholder }
				});
				if (!this.renderDispatcher.commitBitmap(r, e)) return;
			} else if (await K(this.engine, this.canvas, t, "main", {
				width: a,
				dpr: s,
				imageResources: this.opts.imageResources,
				onTextRun: f,
				dim: i,
				...this.opts.errorPlaceholder === void 0 ? {} : { errorPlaceholder: this.opts.errorPlaceholder }
			}), !this.renderDispatcher.isCurrent(r)) return;
			this._renderedSlide = t, this._emitSlideChange(!0), this.textLayer && this._buildTextLayer(this.textLayer, d, a, l), this._find.setSlideRuns(t, d), this._buildHighlightLayer(d, a, l);
		} catch (t) {
			if (!this.renderDispatcher.isCurrent(r) && !(e === this.engine && this._layoutFailed)) return;
			throw t;
		} finally {
			n === this._renderProgressGeneration && this._setLoading(!1);
		}
	}
	_bindLayoutPresentation(e) {
		this._unbindLayoutPresentation(), this._layoutFailed = !1;
		let t = !0;
		this._layoutUnsubscribe = x(e, () => ({
			availableSlides: e.availableSlideCount,
			slideCount: e.slideCount,
			exact: e.layoutComplete,
			complete: e.layoutComplete
		}), (n) => {
			if (t) {
				t = !1;
				return;
			}
			this._onLayoutPublication(e, n);
		}, (e) => this._reportRenderError(e)), this._partFailureDelivery.attach(N(e));
	}
	_unbindLayoutPresentation() {
		this._partFailureDelivery.attach(null), this._layoutUnsubscribe?.(), this._layoutUnsubscribe = null, this._layoutFailed = !1, this._navigationGeneration++, this._renderProgressGeneration++, this._wakeLayoutWaiters(), this._setLoading(!1);
	}
	_beginNavigation() {
		let e = ++this._navigationGeneration;
		return this._wakeLayoutWaiters(), e;
	}
	_onLayoutPublication(e, t) {
		if (!(this.destroyed || e !== this.engine)) {
			if (this._wakeLayoutWaiters(), t.error !== void 0) {
				this._layoutFailed = !0, this.errorRouter.reportBackground(t.error, this.opts.onLayoutComplete !== void 0);
				return;
			}
			this._renderedSlide === this.currentSlide && this._emitSlideChange();
		}
	}
	async _waitForSlide(e, t, n) {
		return await this.errorRouter.ownBackgroundLifecycle(async () => {
			for (; !this.destroyed && n() && e === this.engine && t >= e.availableSlideCount && !e.layoutComplete && !this._layoutFailed;) await new Promise((e) => this._layoutWaiters.add(e));
			return this.destroyed || e !== this.engine || ((e.layoutComplete || this._layoutFailed) && await e.waitUntilLayoutComplete?.(), !n()) ? !1 : t < e.availableSlideCount;
		});
	}
	_wakeLayoutWaiters() {
		for (let e of this._layoutWaiters) e();
		this._layoutWaiters.clear();
	}
	_emitSlideChange(e = !1) {
		let t = this.slideCount, n = this.availableSlideCount, r = this.layoutComplete;
		!e && this.currentSlide === this._lastReportedSlide && t === this._lastReportedTotal && n === this._lastReportedAvailable && r === this._lastReportedLayoutComplete || (this._lastReportedSlide = this.currentSlide, this._lastReportedTotal = t, this._lastReportedAvailable = n, this._lastReportedLayoutComplete = r, this.opts.onSlideChange?.(this.currentSlide, t, r));
	}
	_setLoading(e) {
		this._loadingIndicator.setLoading(e);
	}
	_buildHighlightLayer(e, t, n) {
		let r = this.highlightLayer;
		r && V(r, e, this._find.slideHighlights(this.currentSlide), t, n, (e) => this._measureForFont(e), this.opts.findHighlightColors);
	}
	_measureForFont(e) {
		if (!this._measureCtx) {
			let e = document.createElement("canvas");
			this._measureCtx = e.getContext("2d");
		}
		let t = this._measureCtx;
		return t ? (t.font = e, (e) => t.measureText(e).width) : (e) => e.length;
	}
	async _collectSlideRuns(e) {
		return this.engine ? this.engine.collectSlideRuns(e, this._targetWidth()) : [];
	}
	async findText(e, t = {}) {
		let n = this.engine;
		if (!n) return [];
		let r = ++this._findGeneration;
		if (e.length === 0) return this._find.invalidate(), this._redrawHighlights(), [];
		if (n.layoutComplete || await this.errorRouter.ownBackgroundLifecycle(() => n.waitUntilLayoutComplete()), this.destroyed || r !== this._findGeneration || n !== this.engine) return [];
		this._findSkipsHidden = this._hiddenMode === "skip" && this.visibleSlideCount > 0;
		let i = await this.errorRouter.ownAwaitable(() => this._find.find(e, t));
		return this.destroyed || r !== this._findGeneration || n !== this.engine ? [] : (this._redrawHighlights(), i);
	}
	async findNext() {
		return this._activateMatch(this._find.next());
	}
	async findPrev() {
		return this._activateMatch(this._find.prev());
	}
	clearFind() {
		this._invalidateFind(), this._redrawHighlights();
	}
	_invalidateFind() {
		this._findGeneration++, this._find.invalidate();
	}
	async _activateMatch(e) {
		return e ? (e.location.slide === this.currentSlide ? this._redrawHighlights() : await this.goToSlide(e.location.slide), e) : (this._redrawHighlights(), null);
	}
	_redrawHighlights() {
		let e = this._find.slideRuns(this.currentSlide) ?? [], t = this._targetWidth(), n = this.engine ? Math.round(this.engine.slideHeight * (t / this.engine.slideWidth)) : 0;
		this._buildHighlightLayer(e, t, n);
	}
	_buildTextLayer(e, t, n, r) {
		B(e, t, n, r, this._hyperlinkHandler(), this.currentSlide);
	}
	_hyperlinkHandler() {
		if (this.opts.enableHyperlinks !== !1) return (e) => this._onHyperlinkClick(e);
	}
	_onHyperlinkClick(e) {
		let t = this._resolveInternalSlideIndex(e);
		if (this.opts.onHyperlinkClick) {
			this.opts.onHyperlinkClick(t);
			return;
		}
		if (t.kind === "external") {
			j(t.url, void 0, this.hostWindow);
			return;
		}
		if (t.slideIndex !== void 0) {
			let e = y(t.ref), n = this._beginNavigation();
			this._goToSlide(t.slideIndex, n, e).catch((e) => this._reportRenderError(e));
		}
	}
	_resolveInternalSlideIndex(e) {
		if (e.kind !== "internal" || e.slideIndex !== void 0) return e;
		let t = this.engine?.resolveInternalTarget(e.ref, this.currentSlide);
		return t === void 0 ? e : {
			...e,
			slideIndex: t
		};
	}
	_reportRenderError(e) {
		this.errorRouter.report(e);
	}
	async getResourceMetrics() {
		if (!this.engine) throw Error("Presentation not loaded");
		return await this.engine.getResourceMetrics();
	}
	getSelectionContext(e = {}) {
		if (this.destroyed) throw Error("PptxViewer is destroyed");
		return (this.textLayer ? G(this.wrapper, this.wrapper.ownerDocument?.getSelection?.() ?? null, e) : null) ?? (this.elementContext ? b(this.elementContext, e.maxTextCharacters) : null);
	}
	_emitSelectionContextChange() {
		let e = this.getSelectionContext();
		e?.kind === "text" && (this.elementHitGeneration++, this.elementContext = null, this._redrawElementOutline());
		let t = JSON.stringify(e);
		t !== this.selectionContextKey && (this.selectionContextKey = t, this.opts.onSelectionContextChange?.(e ? structuredClone(e) : null));
	}
	_setElementContext(e) {
		this.elementContext = e ? structuredClone(e) : null, this._redrawElementOutline(), this._emitSelectionContextChange();
	}
	_invalidateElementSelection(e = !0) {
		this.elementHitGeneration++, this.elementContext = null, this._redrawElementOutline(), e && this._emitSelectionContextChange();
	}
	_redrawElementOutline() {
		let e = this.elementContext, t = this.engine;
		if (!e || !t || e.slideIndex !== this.currentSlide) {
			h(this.elementLayer, null);
			return;
		}
		h(this.elementLayer, {
			x: e.bounds.x / t.slideWidth,
			y: e.bounds.y / t.slideHeight,
			width: e.bounds.width / t.slideWidth,
			height: e.bounds.height / t.slideHeight,
			rotation: e.bounds.rotation
		});
	}
	async _onElementClick(e) {
		this.destroyed || e.defaultPrevented || e.button !== 0 || await this._resolveContextAt(e);
	}
	_onContextMenu(e) {
		let t;
		this.opts.onContextMenu?.({
			originalEvent: e,
			getContext: () => t ??= this._resolveContextAt(e)
		});
	}
	async _resolveContextAt(e) {
		let t = this.engine;
		if (this.destroyed || !t) return null;
		if (this.textLayer && G(this.wrapper, this.wrapper.ownerDocument?.getSelection?.() ?? null)) return this._emitSelectionContextChange(), this.destroyed ? null : this.getSelectionContext();
		if (!this.opts.enableElementSelection) return this.getSelectionContext();
		let n = this.canvas.getBoundingClientRect();
		if (n.width <= 0 || n.height <= 0) return this._invalidateElementSelection(), null;
		let r = e.clientX - n.left, i = e.clientY - n.top;
		if (r < 0 || i < 0 || r > n.width || i > n.height) return this._invalidateElementSelection(), null;
		let a = ++this.elementHitGeneration, o = this.currentSlide, s = {
			x: r / n.width * t.slideWidth,
			y: i / n.height * t.slideHeight
		}, c;
		try {
			c = await t.getElementContextAt(o, s, {
				tolerance: this.elementHitTolerance / n.width * t.slideWidth,
				maxTextCharacters: S
			});
		} catch (e) {
			if (this.destroyed || a !== this.elementHitGeneration || o !== this.currentSlide || t !== this.engine) return null;
			throw e;
		}
		return this.destroyed || a !== this.elementHitGeneration || o !== this.currentSlide || t !== this.engine ? null : (this._setElementContext(c), this.destroyed ? null : this.getSelectionContext());
	}
	destroy() {
		this.destroyed || (this.destroyed = !0, this.errorRouter.close(), this._partFailureDelivery.close(), this.renderDispatcher.destroy(), n(this.canvas), this.handle?.destroy(), this.handle = null, this._unbindLayoutPresentation(), this.presentationOwner.close(), this._invalidateFind(), this.selectionChangeListener &&= (this.wrapper.ownerDocument.removeEventListener("selectionchange", this.selectionChangeListener), null), this.elementHitGeneration++, this.elementClickListener &&= (this.wrapper.removeEventListener("click", this.elementClickListener), null), this.contextMenuListener &&= (this.wrapper.removeEventListener("contextmenu", this.contextMenuListener), null), this.elementContext = null, this.canvasMount.restore());
	}
}, Fe = class {
	hooks;
	unsubscribe = null;
	constructor(e) {
		this.hooks = e;
	}
	bind(e) {
		this.unbind();
		let t = !0;
		this.unsubscribe = x(e, () => ({
			availableSlides: e.availableSlideCount,
			slideCount: e.slideCount,
			exact: e.layoutComplete,
			complete: e.layoutComplete
		}), (n) => {
			if (t) {
				t = !1;
				return;
			}
			this.onPublication(e, n);
		}, this.hooks.report);
	}
	unbind() {
		this.unsubscribe?.(), this.unsubscribe = null, this.hooks.resetComments(), this.hooks.wakeComments();
	}
	onPublication(e, t) {
		if (!(this.hooks.destroyed() || e !== this.hooks.current())) {
			if (this.hooks.wakeComments(), t.error !== void 0) {
				this.hooks.failComments(), this.hooks.reportBackground(t.error);
				return;
			}
			this.hooks.scanComments(e), this.hooks.renderAvailable(e), this.hooks.emitVisible();
		}
	}
	destroy() {
		this.unbind();
	}
}, Ie = class {
	hooks;
	constructor(e) {
		this.hooks = e;
	}
	renderInteractive(e, t, n, r, i, a, o = !0) {
		let s = this.hooks.presentation();
		if (!s) return Promise.resolve();
		let c = ++t.presentationGeneration;
		t.presentationHandle?.destroy(), t.presentationHandle = null;
		let l = [], u = this.hooks.textSelection() && !!t.textLayer, d = u || this.hooks.findActive();
		return s.presentSlide(t.canvas, e, {
			width: n,
			dpr: r,
			imageResources: this.hooks.imageResources(),
			...this.errorPlaceholderOption(),
			...this.dimOption(e),
			onTextRun: d ? (e) => l.push(e) : void 0,
			onError: (e) => {
				c === t.presentationGeneration && this.hooks.reportError(e);
			}
		}).then((r) => {
			if (!this.isCurrent(e, t, c, a)) {
				r.destroy();
				return;
			}
			t.presentationHandle = r, t.renderedScale = i, u && t.textLayer && B(t.textLayer, l, Math.round(n), Math.round(this.hooks.height()), this.hooks.hyperlinkHandler(), e), d && this.hooks.refreshFindRuns(e, l), this.hooks.commitComments(e, t), this.hooks.redrawHighlights(e, t);
		}).catch((e) => {
			if (c === t.presentationGeneration) if (o) this.hooks.reportError(e);
			else throw e;
		});
	}
	sync(e = this.hooks.mediaRange()) {
		if (this.hooks.mediaEnabled()) for (let [t, n] of this.hooks.slots()) {
			let r = this.hooks.rangeContains(e, t);
			r !== n.mediaInteractive && (r ? (n.mediaInteractive = !0, this.settleInteractive(t, n, this.hooks.width(), this.hooks.dpr(), this.hooks.scale(), this.hooks.epoch())) : (n.mediaInteractive = !1, n.presentationGeneration++, n.presentationHandle?.destroy(), n.presentationHandle = null));
		}
	}
	settleInteractive(e, t, n, r, i, a) {
		let o = this.hooks.presentation();
		if (!o) return;
		let s = ++t.presentationGeneration, c = document.createElement("canvas");
		c.style.cssText = "display:block;background:#fff;";
		let l = this.hooks.shadow();
		l !== !1 && (c.style.boxShadow = l);
		let u = [], d = this.hooks.textSelection() && !!t.textLayer, f = d || this.hooks.findActive();
		o.presentSlide(c, e, {
			width: n,
			dpr: r,
			...this.errorPlaceholderOption(),
			...this.dimOption(e),
			onTextRun: f ? (e) => u.push(e) : void 0,
			onError: (e) => {
				s === t.presentationGeneration && this.hooks.reportError(e);
			}
		}).then((r) => {
			if (!this.isCurrent(e, t, s, a)) {
				r.destroy();
				return;
			}
			let o = t.canvas, l = t.presentationHandle;
			t.dispatcher.destroy(), t.wrapper.insertBefore(c, o), o.remove(), t.canvas = c, t.dispatcher = new p(c, !1), t.presentationHandle = r, t.renderedScale = i, l?.destroy(), t.textLayer && (this.hooks.clearTextPreview(t.textLayer), d && B(t.textLayer, u, Math.round(n), Math.round(this.hooks.height()), this.hooks.hyperlinkHandler(), e)), f && this.hooks.refreshFindRuns(e, u), this.hooks.commitComments(e, t), this.hooks.redrawHighlights(e, t);
		}).catch((e) => {
			s === t.presentationGeneration && this.hooks.reportError(e);
		});
	}
	isCurrent(e, t, n, r) {
		return n === t.presentationGeneration && t.mediaInteractive && r === this.hooks.epoch() && this.hooks.slots().get(e) === t && t.renderedSlide === e;
	}
	dimOption(e) {
		let t = this.hooks.dim?.(e);
		return t ? { dim: t } : {};
	}
	errorPlaceholderOption() {
		let e = this.hooks.errorPlaceholder?.();
		return e === void 0 ? {} : { errorPlaceholder: e };
	}
	destroy() {
		for (let e of this.hooks.slots().values()) e.presentationGeneration++, e.presentationHandle?.destroy(), e.presentationHandle = null, e.mediaInteractive = !1;
	}
}, Le = class {
	hooks;
	generation = 0;
	layoutWaiters = /* @__PURE__ */ new Set();
	layoutFailed = !1;
	constructor(e) {
		this.hooks = e;
	}
	resetLayout() {
		this.layoutFailed = !1, this.wake();
	}
	failLayout() {
		this.layoutFailed = !0, this.wake();
	}
	wake() {
		for (let e of this.layoutWaiters) e();
		this.layoutWaiters.clear();
	}
	begin() {
		let e = ++this.generation;
		return this.wake(), e;
	}
	async waitForSlideMetadata(e, t, n) {
		return await this.hooks.ownBackground(async () => {
			for (; !this.hooks.destroyed() && n === this.generation && e === this.hooks.presentation() && t >= e.availableSlideCount && !e.layoutComplete && !this.layoutFailed;) await new Promise((e) => this.layoutWaiters.add(e));
			return this.hooks.destroyed() || e !== this.hooks.presentation() || ((e.layoutComplete || this.layoutFailed) && await e.waitUntilLayoutComplete?.(), n !== this.generation) ? !1 : t < e.availableSlideCount;
		});
	}
	async resolveBounds(e, t) {
		let n = this.hooks.presentation();
		if (!n) return;
		let r = (t.anchors ?? []).flatMap((e) => (e.type === "drawingElement" || e.type === "textRange") && e.elementId ? [e.elementId] : []);
		if (r.length === 0) return;
		let i = new Map((this.hooks.slots().get(e)?.commentElementBounds ?? []).map((e) => [e.elementId, e.bounds])), a = r.flatMap((e) => {
			let t = i.get(e);
			return t ? [t] : [];
		})[0];
		if (a) return a;
		let o = await n.getElementBoundsByIds(e, r);
		return r.flatMap((e) => {
			let t = o.find((t) => t.elementId === e);
			return t ? [t.bounds] : [];
		})[0];
	}
	scrollToTarget(e, t, n, r) {
		if (!this.hooks.presentation()) return !1;
		let i = this.hooks.slots().get(e), a = new Map((i?.commentElementBounds ?? []).map((e) => [e.elementId, e.bounds])), o = r ?? (t.anchors ?? []).flatMap((e) => {
			if (e.type !== "drawingElement" && e.type !== "textRange" || !e.elementId) return [];
			let t = a.get(e.elementId);
			return t ? [t] : [];
		})[0], c = t.anchors ?? [], l = Number.isFinite(t.x) && Number.isFinite(t.y) && (c.length === 0 || c.some((e) => e.type === "slide"));
		if (!o && !l) return !1;
		let u = o ? o.x + (l ? t.x : o.width) : t.x, d = o ? o.y + (l ? t.y : 0) : t.y, f = u / s * this.hooks.scale(), p = d / s * this.hooks.scale();
		return this.hooks.scrollPoint(e, f, p, n), !0;
	}
	async goToComment(e, t, n) {
		if (this.hooks.destroyed()) throw Error("PptxScrollViewer is destroyed");
		let r = this.hooks.presentation();
		if (!r || !Number.isInteger(e) || !Number.isInteger(t) || e < 0 || e >= r.slideCount || t < 0) return !1;
		let i = this.begin();
		if (e >= r.availableSlideCount && !r.layoutComplete && !await this.waitForSlideMetadata(r, e, i)) return !1;
		if (this.hooks.destroyed()) throw Error("PptxScrollViewer is destroyed");
		if (i !== this.generation || r !== this.hooks.presentation() || this.hooks.reachable && !this.hooks.reachable(e)) return !1;
		let a = r.getComments(e)[t];
		if (!a) return !1;
		let o = await this.resolveBounds(e, a);
		if (this.hooks.destroyed()) throw Error("PptxScrollViewer is destroyed");
		if (i !== this.generation || r !== this.hooks.presentation() || this.hooks.reachable && !this.hooks.reachable(e)) return !1;
		let s = a.anchors ?? [], c = Number.isFinite(a.x) && Number.isFinite(a.y) && (s.length === 0 || s.some((e) => e.type === "slide"));
		return !o && !c || (this.hooks.scrollToSlide(e, n), !this.scrollToTarget(e, a, n, o)) ? !1 : (this.hooks.select(I(a, t, e), e), !0);
	}
	destroy() {
		this.begin();
	}
}, Re = 12, X;
function ze() {
	return X ??= import("./comment-ui-runtime-D1_pVVwH.js");
}
var Z = 440, Be = 20, Q = Symbol("PptxScrollViewer.borrowedPresentation"), $ = class e {
	_presentationOwner;
	get _pres() {
		return this._presentationOwner.current;
	}
	_borrowed;
	_opts;
	_errorRouter;
	_container;
	_shell;
	get _wrapper() {
		return this._shell.wrapper;
	}
	get _scrollHost() {
		return this._shell.scrollHost;
	}
	get _spacer() {
		return this._shell.spacer;
	}
	_mode;
	_viewport = new me({
		options: () => this._opts,
		container: () => this._container,
		scrollHost: () => this._scrollHost
	});
	_zoom = new E({
		scrollHost: () => this._scrollHost,
		spacer: () => this._spacer,
		count: () => this._layoutCount(),
		zoomMin: () => this._opts.zoomMin ?? .1,
		zoomMax: () => this._opts.zoomMax ?? 4,
		baseScale: () => this._baseScale(),
		fitWidthPx: () => this._viewport.fitWidth(),
		fitContentSize: () => this._pres ? {
			width: this._pres.slideWidth / s,
			height: this._pres.slideHeight / s
		} : null,
		indexAt: (e) => this._positionAtOffset(e),
		offset: (e) => this._positionOffset(e),
		height: () => this._uniformSlideHeight,
		totalHeight: () => this._rangeAt(0, this._viewport.overscan()).totalHeight,
		recomputeHeights: () => this._recomputeHeights(),
		syncSpacerWidth: () => this._syncSpacerWidth(),
		padLeft: () => this._viewport.horizontalPadding().left,
		invalidateRender: () => {
			this._renderEpoch++;
		},
		preview: () => this._previewVisible(),
		scheduleSettle: () => this._scheduleSettle(),
		onScaleChange: (e) => this._opts.onScaleChange?.(e),
		relayout: () => this.relayout(),
		mountVisible: () => this._mountVisible(),
		refitOnResize: () => this._opts.refitOnResize !== !1
	});
	get _scale() {
		return this._zoom.scale;
	}
	get _scaleEstablished() {
		return this._zoom.established;
	}
	_scroller = new he({
		spacer: () => this._spacer,
		count: () => this._layoutCount(),
		range: () => this._range(),
		unitAt: (e) => this._slideAt(e),
		createSlot: () => this._createSlot(),
		attachSlot: (e) => this._scrollHost.appendChild(e.wrapper),
		resetSlot: (e, t) => this._resetSlot(e, t),
		positionSlot: (e, t, n) => this._positionSlot(t, e, n),
		renderSlot: (e, t, n) => this._renderSlot(e, t, this._opts.enableMediaPlayback === !0 && this._rangeContains(this._mediaRange(), e), n),
		previewSlot: (e, t, n) => this._previewSlot(t, e, n),
		settleSlot: (e, t) => this._settleSlot(e, t),
		renderedScale: (e) => e.renderedScale,
		scale: () => this._scale,
		syncSpacerWidth: () => this._syncSpacerWidth(),
		onRange: (e) => this._emitVisibleSlideChange(e),
		onNewSlot: (e, t) => this._redrawSlotComments(e, t),
		afterMount: () => {
			this._opts.enableMediaPlayback && this._media.sync();
		},
		awaitInitialRender: (e) => e < this.availableSlideCount,
		shouldSettle: (e) => !this._opts.enableMediaPlayback || this._rangeContains(this._mediaRange(), e)
	});
	_slots = this._scroller.slots;
	_layout = new Fe({
		current: () => this._pres,
		destroyed: () => this._destroyed,
		report: (e) => this._reportRenderError(e),
		reportBackground: (e) => this._errorRouter.reportBackground(e, this._opts.onLayoutComplete !== void 0),
		wakeComments: () => this._commentNavigation.wake(),
		resetComments: () => this._commentNavigation.resetLayout(),
		failComments: () => this._commentNavigation.failLayout(),
		scanComments: (e) => this._scanAvailableComments(e, !0),
		renderAvailable: (e) => {
			this._refreshShownSlides();
			let t = this._opts.enableMediaPlayback ? this._mediaRange() : null;
			for (let [n, r] of this._slots) n >= e.availableSlideCount || r.renderedSlide === n || this._renderSlot(n, r, !!t && this._rangeContains(t, n));
		},
		emitVisible: () => {
			this._scroller.lastRange && this._emitVisibleSlideChange(this._scroller.lastRange);
		}
	});
	_renderHooks = {
		slots: () => this._slots,
		epoch: () => this._renderEpoch,
		scale: () => this._scale,
		slotIndex: (e) => e.renderedSlide,
		token: (e) => e.renderGeneration,
		nextToken: (e) => ++e.renderGeneration,
		wantRuns: (e) => !!(this._opts.enableTextSelection && e.textLayer) || this._findActive,
		reportError: (e) => this._reportRenderError(e)
	};
	_bitmap = new _e({
		...this._renderHooks,
		inFlight: () => this._scroller.inFlight,
		destroyed: () => this._destroyed,
		width: () => this._slideWidthPx(),
		dpr: () => this._viewport.dpr(),
		canRetry: (e) => !(this._opts.enableMediaPlayback && e.mediaInteractive),
		render: (e, t, n, r, i) => K(this._pres, t, e, "worker", {
			width: n,
			dpr: r,
			imageResources: this._opts.imageResources,
			onTextRun: i,
			...this._dimOption(e),
			...this._opts.errorPlaceholder === void 0 ? {} : { errorPlaceholder: this._opts.errorPlaceholder }
		}),
		commitBitmap: (e, t, n, r, i, a) => {
			let o = {
				cssWidth: Math.round(a),
				cssHeight: Math.round(this._slideHeightPx())
			};
			return this._opts.enableMediaPlayback ? n.commitBitmapTo2d(r, i, o) : n.commitBitmap(r, i, o);
		},
		commitRuns: (e, t, n, r, i) => this._commitRenderedRuns(e, t, n, r, i, !0)
	});
	_main = new ve({
		...this._renderHooks,
		render: (e, t, n, r, i, a) => K(this._pres, t, e, "main", {
			width: n,
			dpr: r,
			...a ? {} : { imageResources: this._opts.imageResources },
			onTextRun: i,
			...this._dimOption(e),
			...this._opts.errorPlaceholder === void 0 ? {} : { errorPlaceholder: this._opts.errorPlaceholder }
		}),
		commitRuns: (e, t, n, r, i, a, o) => this._commitRenderedRuns(e, t, n, i, a, o),
		shadow: () => this._pageShadow
	});
	_media = new Ie({
		presentation: () => this._pres,
		slots: () => this._slots,
		epoch: () => this._renderEpoch,
		scale: () => this._scale,
		dpr: () => this._viewport.dpr(),
		width: () => this._slideWidthPx(),
		height: () => this._slideHeightPx(),
		imageResources: () => this._opts.imageResources,
		errorPlaceholder: () => this._opts.errorPlaceholder,
		textSelection: () => this._opts.enableTextSelection === !0,
		findActive: () => this._findActive,
		mediaEnabled: () => this._opts.enableMediaPlayback === !0,
		mediaRange: () => this._mediaRange(),
		rangeContains: (e, t) => this._rangeContains(e, t),
		dim: (e) => this._dimFor(e),
		shadow: () => this._pageShadow,
		hyperlinkHandler: () => this._hyperlinkHandler(),
		refreshFindRuns: (e, t) => this._highlights.refreshRuns(e, t),
		redrawHighlights: (e, t) => this._highlights.redrawSlot(e, t),
		commitComments: (e, t) => this._commitSlotComments(e, t),
		clearTextPreview: (e) => this._clearTextLayerPreview(e),
		reportError: (e) => this._reportRenderError(e)
	});
	_commentNavigation = new Le({
		presentation: () => this._pres,
		destroyed: () => this._destroyed,
		slots: () => this._slots,
		scale: () => this._scale,
		scrollPoint: (e, t, n, r) => {
			let i = this._positionOf(e);
			i >= 0 && this._navigation.scrollToPoint(i, t, n, r);
		},
		reachable: (e) => (this._refreshShownSlides(), this._positionOf(e) >= 0),
		scrollToSlide: (e, t) => this.scrollToSlide(e, t),
		select: (e, t) => {
			this._activeCommentId = e, this._activeCommentSlide = t, this._selection.clearElementContext();
			for (let [e, t] of this._slots) this._redrawSlotComments(e, t);
			this._selection.emitChange();
		},
		ownBackground: (e) => this._errorRouter.ownBackgroundLifecycle(e)
	});
	_navigation = new be({
		host: () => this._scrollHost,
		spacer: () => this._spacer,
		count: () => this._layoutCount(),
		established: () => this._scaleEstablished,
		offset: (e) => this._positionOffset(e),
		height: () => this._uniformSlideHeight,
		indexAt: (e) => this._positionAtOffset(e),
		totalHeight: () => this._rangeAt(0, this._viewport.overscan()).totalHeight,
		width: () => this._slideWidthPx(),
		padLeft: () => this._viewport.horizontalPadding().left,
		marginOrigin: () => this._commentMargin.originPx,
		mount: () => this._mountVisible()
	});
	_selection = new Se({
		wrapper: () => this._wrapper,
		scrollHost: () => this._scrollHost,
		slots: () => this._slots,
		resource: () => this._pres,
		destroyed: () => this._destroyed,
		textSelectionEnabled: () => this._opts.enableTextSelection === !0,
		elementSelectionEnabled: () => this._opts.enableElementSelection === !0,
		textSelected: () => G(this._wrapper, this._wrapper.ownerDocument?.getSelection?.() ?? null) !== null,
		getContext: () => this.getSelectionContext(),
		hitTest: (e, t, n, r, i) => e.getElementContextAt(t, {
			x: n * e.slideWidth,
			y: r * e.slideHeight
		}, {
			tolerance: this._elementHitTolerance / i * e.slideWidth,
			maxTextCharacters: S
		}),
		outline: (e, t, n) => n.slideIndex === t ? {
			x: n.bounds.x / e.slideWidth,
			y: n.bounds.y / e.slideHeight,
			width: n.bounds.width / e.slideWidth,
			height: n.bounds.height / e.slideHeight,
			rotation: n.bounds.rotation
		} : null,
		onChange: (e) => this._opts.onSelectionContextChange?.(e),
		onContextMenu: (e, t) => this._opts.onContextMenu?.({
			originalEvent: e,
			getContext: t
		}),
		reportError: (e) => this._reportRenderError(e)
	});
	_uniformSlideHeight = 0;
	_visibleEvents = new Ce((e, t, n) => this._opts.onVisibleSlideChange?.(e, t, n));
	_loader = new fe({
		name: () => "PptxScrollViewer",
		borrowed: () => this._borrowed,
		borrowedMessage: () => "PptxScrollViewer.load() is unsupported on a Viewer created by fromPresentation(); the borrowed presentation is already loaded.",
		destroyed: () => this._destroyed,
		owner: () => this._presentationOwner,
		acquire: (e) => C.load(e, {
			password: this._opts.password,
			useGoogleFonts: this._opts.useGoogleFonts,
			fonts: this._opts.fonts,
			cjkFallback: this._opts.cjkFallback,
			maxZipEntryBytes: this._opts.maxZipEntryBytes,
			resourceLimits: this._opts.resourceLimits,
			debug: this._opts.debug,
			onResourceMetrics: this._opts.onResourceMetrics,
			workerTimeoutMs: this._opts.workerTimeoutMs,
			wasmUrl: this._opts.wasmUrl,
			math: this._opts.math,
			threeD: this._opts.threeD,
			regionMap: this._opts.regionMap,
			chartEx: this._opts.chartEx,
			tiff: this._opts.tiff,
			mode: this._mode,
			...this._opts.legacyPpt === void 0 ? void 0 : { legacyPpt: this._opts.legacyPpt },
			...this._opts.odp === void 0 ? void 0 : { odp: this._opts.odp },
			progressiveLayout: this._opts.progressiveLayout,
			onLayoutProgress: this._opts.onLayoutProgress,
			onLayoutPartial: this._opts.onLayoutPartial,
			onLayoutComplete: this._opts.onLayoutComplete
		}),
		beforeReplace: (e) => {
			if (this._selection.invalidateElementContext(!1), this._invalidateFind(), this._findActive = !1, this._activeCommentId = null, this._activeCommentSlide = null, this._hasComments = !1, this._commentScanFrontier = 0, this._commentNavigation.begin(), this._partFailureDelivery.attach(null), this._layout.unbind(), this._hiddenKnown = [], this._hiddenFrontier = 0, this._skipActive = !1, e) {
				for (let [e, t] of [...this._slots]) this._recycleSlot(e, t);
				this._visibleEvents.resetIndex();
			}
		},
		afterReplace: (e) => {
			this._invalidateFind(), this._findActive = !1, this._activeCommentId = null, this._activeCommentSlide = null, this._hasComments = !1, this._commentScanFrontier = 0, this._scanAvailableComments(e, !1), this._layout.bind(e), this._partFailureDelivery.attach(N(e));
		},
		mountOpeningWindow: async () => {
			let e = [];
			this._relayout(e), await Promise.all(e);
		},
		selectionChanged: () => this._selection.emitChange()
	});
	_activeCommentId = null;
	_activeCommentSlide = null;
	_commentUi = null;
	_hasComments = !1;
	_commentMargin = new ye({
		container: () => this._container,
		scrollHost: () => this._scrollHost,
		spacer: () => this._spacer,
		enabled: () => this._commentsEnabled(),
		cards: () => this._commentsOptions()?.cards !== !1,
		hasDisplayableComments: () => this._hasComments,
		requestedSide: () => this._commentsOptions()?.side,
		zoom: () => this._scaleEstablished ? this._scale : 1,
		gapPx: Re,
		widthPx: Z,
		fontSizePx: Be
	});
	_layers = new O({
		markerLayer: (e) => e.commentMarkerLayer,
		syncMargin: (e) => this._commentMargin.syncMargin(e),
		marginSide: () => this._commentMargin.side(),
		marginExtent: () => this._commentMargin.extent(),
		commentsEnabled: () => this._commentsEnabled(),
		previewMargin: (e, t) => this._commentUi?.previewReadOnlyCommentMargin(e, t),
		disposeMargin: (e) => {
			this._commentUi?.disposeReadOnlyCommentMargin(e), this._commentUi || e.replaceChildren();
		},
		disposeDecoration: (e) => {
			this._commentUi?.disposeReadOnlyCommentDecoration(e), this._commentUi || e.replaceChildren();
		},
		redrawOutline: (e, t) => this._selection.redrawOutlineForSlot(e, t),
		markerRatio: (e) => Math.round(e * 1e6) / 1e6,
		resetMarkerTransform: () => !1,
		resetDecorationVisibility: () => !0
	});
	_commentOverlay = new D({
		slots: () => this._slots,
		scale: () => this._scale,
		destroyed: () => this._destroyed,
		ownerWindow: () => this._wrapper.ownerDocument.defaultView,
		width: () => this._slideWidthPx(),
		height: () => this._slideHeightPx(),
		side: () => this._commentMargin.side(),
		marginExtent: () => this._commentMargin.extent(),
		connectorOptions: () => this._commentsOptions()?.connectors,
		runtime: () => this._commentUi,
		redrawComments: (e, t) => this._redrawSlotComments(e, t)
	});
	_commentScanFrontier = 0;
	_elementHitTolerance;
	_destroyed = !1;
	_partFailureDelivery;
	get _renderEpoch() {
		return this._scroller.renderEpoch;
	}
	set _renderEpoch(e) {
		this._scroller.renderEpoch = e;
	}
	_pageShadow;
	_find = new H(() => this.slideCount, (e) => this._collectSlideRuns(e), (e) => this._positionOf(e) >= 0);
	_hiddenMode = "show";
	_hiddenKnown = [];
	_hiddenFrontier = 0;
	_skipActive = !1;
	_findGeneration = 0;
	_findActive = !1;
	_highlights = new de({
		slots: () => this._slots,
		active: () => this._findActive,
		runs: (e) => this._find.slideRuns(e),
		setRuns: (e, t) => this._find.setSlideRuns(e, t),
		paint: (e, t, n, r) => V(t.highlightLayer, n, this._find.slideHighlights(e), this._slideWidthPx(), this._slideHeightPx(), r, this._opts.findHighlightColors),
		reveal: (e) => this.scrollToSlide(e),
		unitOf: (e) => e.slide
	});
	static fromPresentation(t, n, r = {}) {
		return new e(t, {
			...r,
			[Q]: n
		});
	}
	constructor(e, t = {}) {
		if (e.tagName === "CANVAS") throw Error("PptxScrollViewer takes a container element (e.g. a <div>), not a <canvas> — the viewer creates and manages its own canvases. Pass a block container; for the single-slide canvas API use PptxViewer.");
		this._container = e, this._opts = t, this._errorRouter = new m("PptxScrollViewer", t.onError), F(t.errorPlaceholder), this._partFailureDelivery = new P("PptxScrollViewer", t.onPartFailure, (e) => e.slideIndex);
		let n = t.elementHitTolerance ?? 6;
		if (!Number.isFinite(n) || n < 0) throw RangeError("elementHitTolerance must be a finite non-negative number.");
		this._elementHitTolerance = n, this._hiddenMode = t.hiddenSlideMode ?? "show", this._pageShadow = t.pageShadow ?? "0 1px 3px rgba(0,0,0,0.2)";
		let r = t[Q];
		this._borrowed = r !== void 0, r ? (this._presentationOwner = new g("PptxScrollViewer", r, !1), this._mode = _("PptxScrollViewer", t.mode, r), this._scanAvailableComments(r, !1)) : (this._presentationOwner = new g("PptxScrollViewer"), this._mode = _("PptxScrollViewer", t.mode, void 0)), this._shell = new k(e, {
			background: t.background,
			comments: !!t.comments,
			onScroll: () => this._onScroll(),
			onOutsideComment: () => {
				if (this._activeCommentId !== null) {
					this._activeCommentId = null, this._activeCommentSlide = null;
					for (let [e, t] of this._slots) this._redrawSlotComments(e, t);
					this._selection.emitChange();
				}
			}
		}), this._commentsEnabled() && ze().then((e) => {
			if (!this._destroyed) {
				this._commentUi = e;
				for (let [e, t] of this._slots) this._redrawSlotComments(e, t);
			}
		}).catch((e) => this._reportRenderError(e)), this._selection.bind(!!t.onSelectionContextChange, !!t.onContextMenu), this._zoom.bind(this._container, this._scrollHost, this._opts.enableZoom !== !1), this._borrowed && (this._layout.bind(r), this._partFailureDelivery.attach(N(r)), this.relayout());
	}
	async load(e) {
		let t = this._partFailureDelivery.beginLoad();
		try {
			await this._loader.load(e);
		} finally {
			let e = this._destroyed ? null : this._pres;
			this._partFailureDelivery.endLoad(t, e ? N(e) : null);
		}
	}
	get slideCount() {
		return this._pres?.slideCount ?? 0;
	}
	get partFailures() {
		return this._destroyed ? [] : this._pres?.partFailures ?? [];
	}
	get availableSlideCount() {
		return this._pres?.availableSlideCount ?? this.slideCount;
	}
	get layoutComplete() {
		return this._pres?.layoutComplete ?? !0;
	}
	async waitUntilLayoutComplete() {
		await this._errorRouter.ownBackgroundLifecycle(async () => {
			await this._pres?.waitUntilLayoutComplete?.();
		});
	}
	_slideWidthPx() {
		return this._pres.slideWidth / s * this._scale;
	}
	_slideHeightPx() {
		return this._pres.slideHeight / s * this._scale;
	}
	_commentsEnabled() {
		return this._opts.comments === !0 || typeof this._opts.comments == "object";
	}
	_commentsOptions() {
		return typeof this._opts.comments == "object" ? this._opts.comments : void 0;
	}
	_scanAvailableComments(e, t) {
		if (!this._commentsEnabled() || this._hasComments) return;
		let n = this._commentsOptions()?.includeResolved === !0, r = Math.min(e.availableSlideCount, e.slideCount);
		for (let i = this._commentScanFrontier; i < r; i++) if (e.getComments(i).some((e) => n || e.status !== "resolved" && e.status !== "closed")) {
			this._commentScanFrontier = r, this._hasComments = !0, t && this._refreshDiscoveredComments();
			return;
		}
		this._commentScanFrontier = Math.max(this._commentScanFrontier, r);
	}
	_refreshDiscoveredComments() {
		this._syncSpacerWidth();
		for (let [e, t] of this._slots) this._redrawSlotComments(e, t);
	}
	_baseScale() {
		if (!this._pres || this._pres.slideCount === 0) return 0;
		let e = this._viewport.fitWidth(), t = this._pres.slideWidth / s;
		return e <= 0 || t <= 0 ? 0 : e / t;
	}
	relayout() {
		this._relayout();
	}
	_relayout(e) {
		this._pres && (this._updateShownSlides(), !(!this._scaleEstablished && !this._zoom.establishBase()) && (this._recomputeHeights(), this._syncSpacer(), this._mountVisible(e)));
	}
	_recomputeHeights() {
		this._uniformSlideHeight = this._slideHeightPx();
	}
	_mediaOverscan() {
		return this._opts.mediaOverscan ?? 1;
	}
	_positionOffset(e) {
		return this._viewport.verticalPadding().leading + e * (this._uniformSlideHeight + this._viewport.gap());
	}
	_positionAtOffset(e) {
		return w(this._layoutCount(), this._uniformSlideHeight, this._viewport.gap(), e, 0, 0, this._viewport.verticalPadding()).topIndex;
	}
	_rangeAt(e, t) {
		return w(this._layoutCount(), this._uniformSlideHeight, this._viewport.gap(), e, this._scrollHost.clientHeight, t, this._viewport.verticalPadding());
	}
	_range() {
		return this._rangeAt(this._scrollHost.scrollTop, this._viewport.overscan());
	}
	_mediaRange() {
		return this._rangeAt(this._scrollHost.scrollTop, this._mediaOverscan());
	}
	_rangeContains(e, t) {
		let n = this._positionOf(t);
		return n >= 0 && n >= e.start && n <= e.end;
	}
	_layoutCount() {
		let e = this._pres?.slideCount ?? 0;
		return this._skipActive ? e - this._hiddenKnown.length : e;
	}
	_hiddenBelow(e) {
		let t = this._hiddenKnown, n = 0, r = t.length;
		for (; n < r;) {
			let i = n + r >> 1;
			t[i] < e ? n = i + 1 : r = i;
		}
		return n;
	}
	_slideAt(e) {
		if (!this._skipActive) return e;
		let t = this._hiddenKnown, n = 0, r = t.length;
		for (; n < r;) {
			let i = n + r >> 1;
			t[i] - i <= e ? n = i + 1 : r = i;
		}
		return e + n;
	}
	_positionOf(e) {
		if (!this._skipActive) return e;
		let t = this._hiddenBelow(e);
		return this._hiddenKnown[t] === e ? -1 : e - t;
	}
	_shownPositionFor(e, t = !1) {
		let n = e - this._hiddenBelow(e);
		return t && this._positionOf(e) === -1 && n > 0 ? n - 1 : Math.min(n, this._layoutCount() - 1);
	}
	_updateShownSlides() {
		let e = this._pres, t = this._skipActive, n = this._hiddenKnown.length;
		if (this._hiddenMode === "skip" && e) {
			let t = Math.min(e.availableSlideCount, e.slideCount);
			for (let n = this._hiddenFrontier; n < t; n++) e.isHidden(n) && this._hiddenKnown.push(n);
			this._hiddenFrontier = Math.max(this._hiddenFrontier, t);
			let n = this._hiddenKnown.length;
			this._skipActive = n > 0 && n < e.slideCount;
		} else this._skipActive = !1;
		return this._skipActive !== t || this._skipActive && this._hiddenKnown.length !== n;
	}
	_topAnchor() {
		if (!this._pres || !this._scaleEstablished || this._layoutCount() === 0) return null;
		let e = this._scrollHost.scrollTop, t = this._positionAtOffset(e);
		return {
			slide: this._slideAt(t),
			offset: e - this._positionOffset(t)
		};
	}
	_relayoutKeeping(e, t) {
		if (!this._pres) return;
		if (!e || !this._scaleEstablished) {
			this._relayout(t);
			return;
		}
		this._recomputeHeights(), this._syncSpacer();
		let n = this._skipActive ? this._shownPositionFor(e.slide) : Math.min(e.slide, this._layoutCount() - 1), r = this._slideAt(n) === e.slide ? e.offset : Math.min(e.offset, 0), i = this._scrollHost, a = Math.max(0, this._rangeAt(0, 0).totalHeight - i.clientHeight);
		i.scrollTop = Math.min(a, Math.max(0, this._positionOffset(n) + r)), this._mountVisible(t), this._restoreZoomPreview();
	}
	_restoreZoomPreview() {
		for (let e of this._slots.values()) if (e.renderedScale > 0 && e.renderedScale !== this._scale) {
			this._previewVisible();
			return;
		}
	}
	_refreshShownSlides() {
		if (this._hiddenMode !== "skip") return;
		let e = this._topAnchor();
		this._updateShownSlides() && this._relayoutKeeping(e);
	}
	_dimFor(e) {
		return this._hiddenMode === "dim" && this._pres?.isHidden(e) ? W(this._opts.hiddenSlideDim) : void 0;
	}
	_dimOption(e) {
		let t = this._dimFor(e);
		return t ? { dim: t } : {};
	}
	_syncSpacer() {
		this._scroller.syncSpacer();
	}
	_syncSpacerWidth() {
		let { left: e, right: t } = this._viewport.horizontalPadding();
		this._commentMargin.syncSpacerWidth(this._slideWidthPx(), e, t);
	}
	_onScroll() {
		!this._pres || !this._scaleEstablished || this._mountVisible(void 0, !1);
	}
	_mountVisible(e, t = !0) {
		this._scroller.mount(e, t);
	}
	_createSlot() {
		let { wrapper: e, canvas: t, textLayer: n, highlightLayer: r } = xe(this._scrollHost, this._opts.enableTextSelection === !0, this._pageShadow), i = q(e), { markerLayer: a, margin: o, decorationLayer: s } = we(e, this._commentsEnabled(), this._commentsOptions()?.cards !== !1, this._commentsOptions()?.connectors !== void 0, (e) => this._commentMargin.syncMargin(e)), c = ae(e, this._opts.enableElementSelection === !0);
		return this._scrollHost.appendChild(e), {
			wrapper: e,
			canvas: t,
			textLayer: n,
			highlightLayer: r,
			elementLayer: c,
			loadingIndicator: i,
			commentMarkerLayer: a,
			commentMargin: o,
			commentDecorationLayer: s,
			commentElementBounds: Object.freeze([]),
			commentGeometry: null,
			commentAnchorSlide: -1,
			commentAnchorGeneration: 0,
			renderedSlide: -1,
			renderedScale: -1,
			dispatcher: new p(t, this._mode === "worker" && !this._opts.enableMediaPlayback),
			presentationHandle: null,
			mediaInteractive: !1,
			renderGeneration: 0,
			presentationGeneration: 0
		};
	}
	_recycleSlot(e, t) {
		this._scroller.recycleSlot(e, t);
	}
	_resetSlot(e, t) {
		t.renderGeneration++, t.presentationGeneration++, t.presentationHandle?.destroy(), t.presentationHandle = null, t.mediaInteractive = !1, t.dispatcher.destroy(), this._destroyed || (t.dispatcher = new p(t.canvas, this._mode === "worker" && !this._opts.enableMediaPlayback)), this._layers.reset(t), t.loadingIndicator.setLoading(!1), t.commentElementBounds = Object.freeze([]), t.commentGeometry = null, t.commentAnchorSlide = -1, t.commentAnchorGeneration++, t.canvas.style.height = "", t.renderedSlide = -1, t.renderedScale = -1, t.wrapper.remove();
	}
	_positionSlot(e, t, n) {
		e.wrapper.dataset.slideIndex = String(t), this._layers.position(t, e, this._positionOffset(this._positionOf(t)), this._slideWidthPx(), this._slideHeightPx(), this._scrollHost.clientWidth, this._viewport.horizontalPadding().left);
	}
	_renderSlot(e, t, n = !1, r = !0) {
		if (!this._pres || t.renderedSlide === e) return null;
		if (e >= this.availableSlideCount && !this.layoutComplete) return t.renderedSlide = -1, t.mediaInteractive = !1, t.loadingIndicator.setLoading(!0), null;
		t.renderedSlide = e;
		let i = ++t.renderGeneration;
		t.loadingIndicator.setLoading(e >= this.availableSlideCount && !this.layoutComplete);
		let a = this._viewport.dpr(), o = this._slideWidthPx(), s = this._renderEpoch, c = this._scale, l = t.dispatcher, u = l.begin();
		return this._opts.enableMediaPlayback && n ? (t.mediaInteractive = !0, this._trackSlotLoading(e, t, i, this._media.renderInteractive(e, t, o, a, c, s, r))) : (t.mediaInteractive = !1, this._mode === "worker" ? this._trackSlotLoading(e, t, i, this._renderSlotBitmap(e, t, o, a, c, i, l, u, r)) : this._trackSlotLoading(e, t, i, this._main.render(e, t, o, a, i, l, u, r)));
	}
	async _trackSlotLoading(e, t, n, r) {
		try {
			await r;
		} finally {
			n === t.renderGeneration && this._slots.get(e) === t && t.renderedSlide === e && t.loadingIndicator.setLoading(!1);
		}
	}
	_emitVisibleSlideChange(e) {
		this._pres && this._visibleEvents.publish({ topIndex: this._slideAt(e.topIndex) }, this._pres.slideCount, this.layoutComplete);
	}
	_reportRenderError(e) {
		this._errorRouter.report(e);
	}
	_commitRenderedRuns(e, t, n, r, i, a) {
		t.textLayer && (a && this._clearTextLayerPreview(t.textLayer), this._opts.enableTextSelection && B(t.textLayer, n, Math.round(r), Math.round(this._slideHeightPx()), this._hyperlinkHandler(), e)), i && this._highlights.refreshRuns(e, n), this._commitSlotComments(e, t), this._highlights.redrawSlot(e, t);
	}
	_renderSlotBitmap(e, t, n, r, i, a = ++t.renderGeneration, o = t.dispatcher, s = o.begin(), c = !0) {
		return this._bitmap.render(e, t, n, r, i, a, o, s, c);
	}
	setScale(e) {
		this._zoom.setScale(e);
	}
	getScale() {
		return this._zoom.getScale();
	}
	zoomIn() {
		this._zoom.zoomIn();
	}
	zoomOut() {
		this._zoom.zoomOut();
	}
	fitWidth() {
		this._zoom.fit("width");
	}
	fitPage() {
		this._zoom.fit("page");
	}
	_previewVisible() {
		this._scroller.preview();
	}
	_previewSlot(e, t, n) {
		this._positionSlot(e, t, n), this._layers.preview(e, this._slideWidthPx(), this._slideHeightPx(), this._scale);
	}
	_clearTextLayerPreview(e) {
		ge(e);
	}
	_scheduleSettle() {
		this._scroller.scheduleSettle(150);
	}
	_settleSlot(e, t) {
		if (!this._pres) return;
		let n = this._viewport.dpr(), r = this._slideWidthPx(), i = this._scale, a = this._renderEpoch;
		if (this._opts.enableMediaPlayback && t.mediaInteractive) {
			this._media.settleInteractive(e, t, r, n, i, a);
			return;
		}
		if (!this._opts.enableMediaPlayback) {
			if (this._mode === "worker") {
				this._renderSlotBitmap(e, t, r, n, i);
				return;
			}
			this._main.settle(e, t, r, n);
		}
	}
	scrollToSlide(e, t) {
		this._scrollToSlide(e, t, !1);
	}
	_scrollToSlide(e, t, n) {
		if (!this._skipActive) {
			this._navigation.scrollToUnit(e, t);
			return;
		}
		let r = Math.max(0, Math.min(e, this.slideCount - 1));
		this._navigation.scrollToUnit(this._shownPositionFor(r, n), t);
	}
	async setHiddenSlideMode(e) {
		if (this._destroyed) throw Error("PptxScrollViewer is destroyed");
		let t = this._hiddenMode;
		if (e === t) return;
		let n = this._topAnchor();
		this._hiddenMode = e, this._commentNavigation.begin(), t === "skip" != (e === "skip") && this.clearFind();
		let r = this._pres;
		if (!r) return;
		let i = this._updateShownSlides(), a = !1;
		if (t === "dim" != (e === "dim")) for (let [e, t] of [...this._slots]) e >= r.availableSlideCount || !r.isHidden(e) || (this._recycleSlot(e, t), a = !0);
		if (!i && !a) return;
		let o = [];
		i ? this._relayoutKeeping(n, o) : this._scaleEstablished && (this._mountVisible(o), this._restoreZoomPreview()), await Promise.all(o);
	}
	get hiddenSlideMode() {
		return this._hiddenMode;
	}
	get visibleSlideCount() {
		let e = this._pres;
		return e ? v((t) => e.isHidden(t), e.slideCount) : 0;
	}
	async goToComment(e, t, n) {
		return this._commentNavigation.goToComment(e, t, n);
	}
	async findText(e, t = {}) {
		let n = this._pres;
		if (!n) return [];
		let r = ++this._findGeneration;
		if (this._findActive = e.length > 0, e.length === 0) return this._find.invalidate(), this._highlights.redrawAll(), [];
		if (n.layoutComplete || await this._errorRouter.ownBackgroundLifecycle(() => n.waitUntilLayoutComplete()), this._destroyed || r !== this._findGeneration || n !== this._pres) return [];
		this._refreshShownSlides();
		let i = await this._errorRouter.ownAwaitable(() => this._find.find(e, t));
		return this._destroyed || r !== this._findGeneration || n !== this._pres ? [] : (this._highlights.redrawAll(), i);
	}
	async findNext() {
		return this._highlights.activate(this._find.next());
	}
	async findPrev() {
		return this._highlights.activate(this._find.prev());
	}
	clearFind() {
		this._findActive = !1, this._invalidateFind(), this._highlights.redrawAll();
	}
	_invalidateFind() {
		this._findGeneration++, this._find.invalidate();
	}
	async _collectSlideRuns(e) {
		return this._pres ? this._pres.collectSlideRuns(e, this._slideWidthPx()) : [];
	}
	_redrawSlotComments(e, t) {
		if (!this._pres || !t.commentMarkerLayer) return;
		this._commentMargin.syncMargin(t.commentMargin);
		let n = this._commentUi;
		if (!n) {
			t.commentMarkerLayer.replaceChildren(), t.commentMargin?.replaceChildren(), t.commentDecorationLayer?.replaceChildren(), t.commentGeometry = null;
			return;
		}
		t.commentGeometry = n.buildPptxCommentMargin(t.commentMarkerLayer, t.commentMargin, this._pres.getComments(e), t.commentElementBounds, e, this._pres.slideWidth, this._pres.slideHeight, this._activeCommentId, (t, n) => {
			let r = n ? t : this._activeCommentId === t ? null : this._activeCommentId;
			if (r !== this._activeCommentId) {
				this._activeCommentId = r, this._activeCommentSlide = r ? e : null, this._selection.clearElementContext();
				for (let [e, t] of this._slots) this._redrawSlotComments(e, t);
				this._selection.emitChange();
			}
		}, this._commentMargin.zoom(), Z, this._commentsOptions()?.markers !== !1, this._commentsOptions()?.includeResolved === !0, t.commentDecorationLayer ? () => this._commentOverlay.schedule(e, t, !1) : void 0, t.commentDecorationLayer ? () => this._commentOverlay.schedule(e, t, !0) : void 0), this._commentOverlay.drawConnectors(e, t);
	}
	_commitSlotComments(e, t) {
		this._ensureSlotCommentAnchors(e, t), this._redrawSlotComments(e, t), t.commentMarkerLayer && (t.commentMarkerLayer.style.visibility = ""), t.commentMargin && (t.commentMargin.style.visibility = ""), t.commentDecorationLayer && (t.commentDecorationLayer.style.visibility = "");
	}
	_ensureSlotCommentAnchors(e, t) {
		let n = this._pres;
		if (!n || t.commentAnchorSlide === e) return;
		t.commentAnchorSlide = e, t.commentElementBounds = Object.freeze([]);
		let r = [...new Set(n.getComments(e).flatMap((e) => (e.anchors ?? []).flatMap((e) => (e.type === "drawingElement" || e.type === "textRange") && e.elementId ? [e.elementId] : [])))];
		if (r.length === 0) return;
		let i = ++t.commentAnchorGeneration;
		n.getElementBoundsByIds(e, r).then((r) => {
			if (this._destroyed || i !== t.commentAnchorGeneration || n !== this._pres || this._slots.get(e) !== t || t.commentAnchorSlide !== e) return;
			t.commentElementBounds = r, this._redrawSlotComments(e, t);
			let a = n.getComments(e).find((t, n) => I(t, n, e) === this._activeCommentId);
			a && this._commentNavigation.scrollToTarget(e, a);
		}).catch((e) => {
			!this._destroyed && i === t.commentAnchorGeneration && this._reportRenderError(e);
		});
	}
	_hyperlinkHandler() {
		if (this._opts.enableHyperlinks !== !1) return (e) => this._onHyperlinkClick(e);
	}
	_onHyperlinkClick(e) {
		let t = this._resolveInternalSlideIndex(e);
		if (this._opts.onHyperlinkClick) {
			this._opts.onHyperlinkClick(t);
			return;
		}
		if (t.kind === "external") {
			j(t.url);
			return;
		}
		t.slideIndex !== void 0 && this._scrollToSlide(t.slideIndex, void 0, y(t.ref));
	}
	_resolveInternalSlideIndex(e) {
		if (e.kind !== "internal" || e.slideIndex !== void 0) return e;
		let t = this._pres?.resolveInternalTarget(e.ref, this._slideAt(this._range().topIndex));
		return t === void 0 ? e : {
			...e,
			slideIndex: t
		};
	}
	get topVisibleSlide() {
		let e = this._scroller.lastRange;
		return e ? Math.max(0, this._slideAt(e.topIndex)) : 0;
	}
	async getResourceMetrics() {
		if (!this._pres) throw Error("Presentation not loaded");
		return await this._pres.getResourceMetrics();
	}
	getSelectionContext(e = {}) {
		if (this._destroyed) throw Error("PptxScrollViewer is destroyed");
		if (this._pres && this._activeCommentId !== null && this._activeCommentSlide !== null) {
			let t = this._pres.getComments(this._activeCommentSlide), n = t.findIndex((e, t) => I(e, t, this._activeCommentSlide) === this._activeCommentId), r = t[n];
			if (r && n >= 0) return Ne(r, this._activeCommentSlide, n, this._activeCommentId, e);
		}
		return (this._opts.enableTextSelection ? G(this._wrapper, this._wrapper.ownerDocument?.getSelection?.() ?? null, e) : null) ?? (this._selection.elementContext ? b(this._selection.elementContext, e.maxTextCharacters) : null);
	}
	destroy() {
		this._destroyed || (this._destroyed = !0, this._commentNavigation.begin(), this._errorRouter.close(), this._partFailureDelivery.close(), this._invalidateFind(), this._findActive = !1, this._layout.unbind(), this._selection.destroy(), this._media.destroy(), this._commentNavigation.destroy(), this._highlights.destroy(), this._commentOverlay.destroy(), this._selection.clearElementContext(), this._scroller.destroy(), this._zoom.destroy(), this._commentMargin.destroy(), this._presentationOwner.close(), this._shell.destroy());
	}
}, Ve = /* @__PURE__ */ e({
	OoxmlDecodedImageLimitError: () => l,
	OoxmlError: () => a,
	OoxmlResourceLimitError: () => i,
	PptxPresentation: () => C,
	PptxScrollViewer: () => $,
	PptxViewer: () => Y,
	TiffDecodeError: () => d,
	autoResize: () => ce,
	buildPptxHighlightLayer: () => V,
	buildPptxTextLayer: () => B,
	fontCss: () => ke,
	fontCssApi: () => De,
	fontFiles: () => Oe,
	fontResolver: () => Ae,
	googleFonts: () => ue,
	googleFontsSubstitutions: () => le,
	isOoxmlDecodedImageLimitError: () => c,
	isTiffDecodeError: () => u,
	officeFontSubstitutions: () => r,
	openExternalHyperlink: () => j,
	readPptxTextSelectionContext: () => G,
	renderSlide: () => t
});
export { V as a, G as i, $ as n, B as o, Y as r, Ve as t };
