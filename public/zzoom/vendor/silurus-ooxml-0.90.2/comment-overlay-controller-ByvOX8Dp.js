import { u as e } from "./vertical-vert-feature-ru96Mg5B.js";
import { _ as t, a as n, b as r, d as i, f as a, g as o, l as s, m as c, p as l, r as u, v as d, y as f } from "./canvas-viewer-mechanics-DrH37lzF.js";
import { u as p } from "./part-failures-pZSloLZv.js";
function m(e, t, n) {
	return e < t ? t : e > n ? n : e;
}
function h(e, t) {
	return Math.min(Math.max(0, t), Math.ceil(Math.max(0, e)));
}
function g(e, t, n) {
	let r = e.length;
	if (r === 0) return {
		offsets: [],
		totalHeight: 0
	};
	let i = n?.leading ?? 0, a = n?.trailing ?? 0, o = Array(r), s = 0;
	for (let n = 0; n < r; n++) o[n] = i + s + n * t, s += e[n];
	return {
		offsets: o,
		totalHeight: i + s + (r - 1) * t + a
	};
}
function _(e, t, n, r) {
	let i = e.offsets, a = i.length;
	if (a === 0) return {
		start: 0,
		end: -1,
		topIndex: 0,
		offsets: i,
		totalHeight: 0
	};
	let o = 0, s = a;
	for (; o < s;) {
		let e = o + s >>> 1;
		i[e] <= t ? o = e + 1 : s = e;
	}
	let c = m(o - 1, 0, a - 1), l = t + n;
	for (o = 0, s = a; o < s;) {
		let e = o + s >>> 1;
		i[e] < l ? o = e + 1 : s = e;
	}
	let u = m(o - 1, 0, a - 1);
	return {
		start: m(c - r, 0, a - 1),
		end: m(u + r, 0, a - 1),
		topIndex: c,
		offsets: i,
		totalHeight: e.totalHeight
	};
}
function v(e, t, n, r, i, a, o) {
	if (e === 0) return {
		start: 0,
		end: -1,
		topIndex: 0,
		totalHeight: 0
	};
	let s = o?.leading ?? 0, c = o?.trailing ?? 0, l = t + n, u = m(r < s ? 0 : l > 0 ? Math.floor((r - s) / l) : e - 1, 0, e - 1), d = r + i, f = m(d <= s ? 0 : l > 0 ? Math.ceil((d - s) / l) - 1 : e - 1, 0, e - 1);
	return {
		start: m(u - a, 0, e - 1),
		end: m(f + a, 0, e - 1),
		topIndex: u,
		totalHeight: s + e * t + (e - 1) * n + c
	};
}
function y(e, t, n) {
	e.dataset ? n === void 0 ? delete e.dataset[t] : e.dataset[t] = n : n !== void 0 && e.setAttribute?.(`data-${t.replace(/[A-Z]/g, (e) => `-${e.toLowerCase()}`)}`, n);
}
function b(e) {
	if (e === void 0 || !/^\d+$/.test(e)) return null;
	let t = Number(e);
	return Number.isSafeInteger(t) ? t : null;
}
var x = class {
	_count;
	_collectRuns;
	_location;
	_acceptMatch;
	_includeUnit;
	_runs = /* @__PURE__ */ new Map();
	_matches = [];
	_active = -1;
	_generation = 0;
	_runsRevision = 0;
	constructor(e, t, n, r = () => !0, i = () => !0) {
		this._count = e, this._collectRuns = t, this._location = n, this._acceptMatch = r, this._includeUnit = i;
	}
	invalidate() {
		this._generation++, this._runsRevision++, this._runs.clear(), this._matches = [], this._active = -1;
	}
	unitRuns(e) {
		return this._runs.get(e);
	}
	setUnitRuns(e, t) {
		this._runsRevision++, this._runs.set(e, t);
	}
	unitHighlights(e) {
		let t = [];
		for (let n = 0; n < this._matches.length; n++) {
			let r = this._matches[n];
			r.unit === e && t.push({
				slices: r.slices,
				active: n === this._active
			});
		}
		return t;
	}
	activeUnit() {
		return this._matches[this._active]?.unit ?? null;
	}
	matches() {
		return this._matches.map((e, t) => ({
			matchIndex: t,
			text: e.text,
			location: this._location(e.unit)
		}));
	}
	async find(e, t = {}) {
		let n = ++this._generation;
		if (e.length === 0) return this._runsRevision++, this._runs.clear(), this._matches = [], this._active = -1, [];
		let r = this._runsRevision, i = new Map(this._runs), a = this._count(), o = [];
		for (let e = 0; e < a; e++) o.push(this._includeUnit(e));
		for (let e = 0; e < a; e++) {
			if (!o[e]) continue;
			let t = i.get(e);
			if (!t) {
				try {
					t = await this._collectRuns(e);
				} catch (e) {
					if (n !== this._generation) return [];
					throw e;
				}
				if (n !== this._generation) return [];
				i.set(e, t);
			}
		}
		if (n !== this._generation) return [];
		let s = r === this._runsRevision ? i : new Map([...i, ...this._runs]), u = [];
		for (let n = 0; n < a; n++) {
			if (!o[n]) continue;
			let r = s.get(n) ?? [];
			for (let i of c(l(r), e, t)) {
				if (!this._acceptMatch(r, i.slices)) continue;
				let e = i.slices.map((e) => r[e.runIndex].text.slice(e.start, e.end)).join("");
				u.push({
					unit: n,
					text: e,
					slices: i.slices
				});
			}
		}
		return this._runsRevision++, this._runs = s, this._matches = u, this._active = -1, this.matches();
	}
	next() {
		return this._active = i(this._active, this._matches.length), this._activePublic();
	}
	prev() {
		return this._active = a(this._active, this._matches.length), this._activePublic();
	}
	_activePublic() {
		let e = this._matches[this._active];
		return e ? {
			matchIndex: this._active,
			text: e.text,
			location: this._location(e.unit)
		} : null;
	}
}, S = 65536;
function C(e) {
	if (e !== void 0 && (!Number.isFinite(e) || e < 0)) throw RangeError("maxTextCharacters must be a finite non-negative number.");
	return Math.min(S, Math.floor(e ?? 65536));
}
function w(e, t, n) {
	let r = C(n), i = 0, a = !1, o = (e) => {
		let t = p(e.text, Math.max(0, r - i));
		return i += t.length, t.length < e.text.length && (a = !0), {
			...e,
			text: t
		};
	}, s = Object.freeze({
		root: Object.freeze(o(e)),
		replies: Object.freeze(t.map((e) => Object.freeze(o(e))))
	});
	return Object.freeze({
		thread: s,
		truncated: a,
		textCharacters: i,
		maxTextCharacters: r
	});
}
function T(e, t) {
	return e.dataset?.[t] !== void 0;
}
function E(e, t, n) {
	let r = typeof e.composedPath == "function" ? e.composedPath() : [];
	if (r.length > 0) {
		let e = !1;
		for (let i of r) {
			if (i === t) return e;
			T(i, n) && (e = !0);
		}
	}
	let i = e.target;
	if (!i || !t.contains(i)) return !1;
	let a = i;
	for (; a;) {
		if (T(a, n)) return !0;
		if (a === t) break;
		a = a.parentElement;
	}
	return !1;
}
var D = class {
	wrapper;
	scrollHost;
	spacer;
	onScroll;
	onPointerDown;
	constructor(e, t) {
		let n = e.ownerDocument ?? document;
		this.wrapper = n.createElement("div"), this.wrapper.style.cssText = "position:relative;width:100%;height:100%;overflow:hidden;", this.scrollHost = n.createElement("div"), this.scrollHost.style.cssText = "position:absolute;inset:0;overflow:auto;", this.scrollHost.style.scrollbarGutter = "stable", t.background && (this.scrollHost.style.background = t.background), this.spacer = n.createElement("div"), this.spacer.style.cssText = "position:absolute;top:0;left:0;width:1px;height:0;pointer-events:none;", this.scrollHost.appendChild(this.spacer), this.wrapper.appendChild(this.scrollHost), e.appendChild(this.wrapper), this.onScroll = t.onScroll, this.scrollHost.addEventListener("scroll", this.onScroll), this.onPointerDown = t.comments ? (e) => {
			E(e, this.wrapper, "ooxmlCommentId") || t.onOutsideComment();
		} : null, this.onPointerDown && n.addEventListener("pointerdown", this.onPointerDown);
	}
	destroy() {
		this.scrollHost.removeEventListener("scroll", this.onScroll), this.onPointerDown && this.wrapper.ownerDocument.removeEventListener("pointerdown", this.onPointerDown), this.wrapper.remove();
	}
}, O = class {
	hooks;
	measureContext;
	constructor(e) {
		this.hooks = e;
	}
	redrawAll() {
		for (let [e, t] of this.hooks.slots()) this.redrawSlot(e, t);
	}
	redrawSlot(e, t) {
		let n = this.hooks.active() ? this.hooks.runs(e) : void 0;
		if (!n) {
			t.highlightLayer.innerHTML = "";
			return;
		}
		this.hooks.paint(e, t, n, (e) => this.measure(e));
	}
	refreshRuns(e, t) {
		this.hooks.active() && this.hooks.setRuns(e, t);
	}
	async activate(e) {
		return e && this.hooks.reveal(this.hooks.unitOf(e.location)), this.redrawAll(), e;
	}
	measure(e) {
		if (this.measureContext === void 0) {
			let e = document.createElement("canvas");
			this.measureContext = e.getContext("2d");
		}
		let t = this.measureContext;
		return !t || typeof t.measureText != "function" ? (e) => e.length : (t.font = e, (e) => t.measureText(e).width);
	}
	destroy() {
		this.measureContext = void 0;
	}
}, k = class {
	hooks;
	pending = /* @__PURE__ */ new Map();
	constructor(e) {
		this.hooks = e;
	}
	render(e, t, n, r, i, a = this.hooks.nextToken(t), o = t.dispatcher, s = o.begin(), c = !0) {
		if (this.hooks.inFlight().has(e)) return (this.pending.get(e) ?? Promise.resolve()).catch(() => {});
		if (this.hooks.slots().get(e) !== t) return Promise.resolve();
		let l = this.paint(e, t, n, r, i, a, o, s, c);
		this.pending.set(e, l);
		let u = () => {
			this.pending.get(e) === l && this.pending.delete(e);
		};
		return l.then(u, u), l;
	}
	async paint(e, t, n, r, i, a, o, s, c) {
		let l = this.hooks.inFlight(), u = this.hooks.epoch(), d = t.canvas;
		l.add(e);
		let f = !1, p = [], m = this.hooks.wantRuns(t);
		try {
			let c = await this.hooks.render(e, d, n, r, m ? (e) => p.push(e) : void 0);
			if (!this.isCurrent(e, t, a, o, s, d, u)) {
				c.close();
				return;
			}
			if (!this.hooks.commitBitmap(e, t, o, s, c, n)) return;
			t.renderedScale = i, this.hooks.commitRuns(e, t, p, n, m), f = !0;
		} catch (n) {
			if (this.isCurrent(e, t, a, o, s, d, u)) if (c) this.hooks.reportError(n);
			else throw n;
		} finally {
			l.delete(e);
			let n = this.hooks.slots().get(e);
			if (!f && n && this.hooks.canRetry(n) && (n !== t || u !== this.hooks.epoch() || a !== this.hooks.token(n) || !o.isCurrent(s)) && !l.has(e) && !this.hooks.destroyed()) {
				let t = n.dispatcher;
				await this.render(e, n, this.hooks.width(e), this.hooks.dpr(), this.hooks.scale(), this.hooks.nextToken(n), t, t.begin(), c);
			}
		}
	}
	isCurrent(e, t, n, r, i, a, o) {
		return n === this.hooks.token(t) && r.isCurrent(i) && a === t.canvas && o === this.hooks.epoch() && this.hooks.slots().get(e) === t && this.hooks.slotIndex(t) === e;
	}
}, A = class {
	hooks;
	constructor(e) {
		this.hooks = e;
	}
	render(e, t, n, r, i, a, o, s) {
		let c = this.hooks.epoch(), l = this.hooks.scale(), u = t.canvas, d = [], f = this.hooks.wantRuns(t), p;
		try {
			p = this.hooks.render(e, u, n, r, f ? (e) => d.push(e) : void 0, !1);
		} catch (e) {
			return s ? (this.hooks.reportError(e), Promise.resolve()) : Promise.reject(e);
		}
		return p.then(() => {
			this.isCurrent(e, t, i, a, o, u, c) && (t.renderedScale = l, this.hooks.commitRuns(e, t, d, u, n, f, !1));
		}).catch((n) => {
			if (this.isCurrent(e, t, i, a, o, u, c)) if (s) this.hooks.reportError(n);
			else throw n;
		});
	}
	settle(e, t, r, i) {
		let a = this.hooks.scale(), o = this.hooks.epoch(), s = document.createElement("canvas");
		s.style.cssText = "display:block;background:#fff;";
		let c = this.hooks.shadow();
		c !== !1 && (s.style.boxShadow = c);
		let l = this.hooks.nextToken(t), u = new n(s, !1), d = u.begin(), f = [], p = this.hooks.wantRuns(t), m;
		try {
			m = this.hooks.render(e, s, r, i, p ? (e) => f.push(e) : void 0, !0);
		} catch (n) {
			this.isCurrent(e, t, l, u, d, s, o, !0) && this.hooks.reportError(n), u.destroy();
			return;
		}
		m.then(() => {
			if (!this.isCurrent(e, t, l, u, d, s, o, !0)) {
				u.destroy();
				return;
			}
			let n = t.canvas;
			t.dispatcher.destroy(), t.wrapper.insertBefore(s, n), n.remove(), t.canvas = s, t.dispatcher = u, t.renderedScale = a, this.hooks.commitRuns(e, t, f, s, r, p, !0);
		}).catch((n) => {
			this.isCurrent(e, t, l, u, d, s, o, !0) && this.hooks.reportError(n), u.destroy();
		});
	}
	isCurrent(e, t, n, r, i, a, o, s = !1) {
		return n === this.hooks.token(t) && r.isCurrent(i) && (s || a === t.canvas) && o === this.hooks.epoch() && this.hooks.slots().get(e) === t && this.hooks.slotIndex(t) === e;
	}
}, j = class {
	hooks;
	slots = /* @__PURE__ */ new Map();
	free = [];
	inFlight = /* @__PURE__ */ new Set();
	lastRange = null;
	renderEpoch = 0;
	_settleTimer = null;
	_destroyed = !1;
	constructor(e) {
		this.hooks = e;
	}
	syncSpacer() {
		let e = this.hooks.range();
		this.lastRange = e, this.hooks.spacer().style.height = `${e.totalHeight}px`, this.hooks.syncSpacerWidth();
	}
	acquireSlot() {
		let e = this.free.pop();
		return e ? (this.hooks.attachSlot(e), e) : this.hooks.createSlot();
	}
	recycleSlot(e, t) {
		this.slots.delete(e), this.hooks.resetSlot(e, t), this.free.push(t);
	}
	mount(e, t = !0) {
		if (this._destroyed || this.hooks.count() === 0) return;
		let n = this.hooks.range();
		this.lastRange = n;
		let r = this.unitsIn(n);
		for (let [e, t] of [...this.slots]) r.has(e) || this.recycleSlot(e, t);
		for (let i of r) {
			let r = this.slots.get(i);
			if (r) {
				if (!t) continue;
				this.hooks.positionSlot(i, r, n);
				let a = this.hooks.onExistingSlot?.(i, r, e === void 0);
				e && a && e.push(a);
				continue;
			}
			let a = this.acquireSlot();
			this.hooks.positionSlot(i, a, n), this.slots.set(i, a), this.hooks.onNewSlot?.(i, a);
			let o = this.hooks.renderSlot(i, a, e === void 0);
			e && o && (this.hooks.awaitInitialRender?.(i) ?? !0) && e.push(o);
		}
		this.hooks.afterMount?.(n), this.hooks.onRange(n);
	}
	preview() {
		if (this._destroyed || this.hooks.count() === 0) return;
		let e = this.hooks.range();
		this.lastRange = e;
		let t = this.unitsIn(e);
		for (let [e, n] of [...this.slots]) t.has(e) || this.recycleSlot(e, n);
		for (let n of t) {
			let t = this.slots.get(n);
			if (t) {
				this.hooks.previewSlot(n, t, e);
				continue;
			}
			let r = this.acquireSlot();
			this.hooks.positionSlot(n, r, e), this.slots.set(n, r), this.hooks.onNewSlot?.(n, r), this.hooks.renderSlot(n, r, !0);
		}
		this.hooks.afterMount?.(e), this.hooks.onRange(e);
	}
	unitsIn(e) {
		let t = /* @__PURE__ */ new Set(), n = this.hooks.unitAt;
		for (let r = e.start; r <= e.end; r++) t.add(n ? n(r) : r);
		return t;
	}
	scheduleSettle(e) {
		this._settleTimer !== null && clearTimeout(this._settleTimer), this._settleTimer = setTimeout(() => {
			this._settleTimer = null, this.settle();
		}, e);
	}
	settle() {
		if (!(this._destroyed || this.hooks.count() === 0)) for (let [e, t] of [...this.slots]) this.hooks.renderedScale(t) !== this.hooks.scale() && (this.hooks.shouldSettle && !this.hooks.shouldSettle(e, t) || this.hooks.settleSlot(e, t));
	}
	destroy() {
		if (!this._destroyed) {
			this._destroyed = !0, this._settleTimer !== null && clearTimeout(this._settleTimer), this._settleTimer = null;
			for (let [e, t] of [...this.slots]) this.recycleSlot(e, t);
			this.inFlight.clear(), this.free.length = 0;
		}
	}
};
function M(e) {
	e.style.transform = "", e.style.transformOrigin = "", e.style.width = "100%", e.style.height = "100%";
}
function N(e, t, n) {
	let r = e.ownerDocument, i = r.createElement("div");
	i.style.cssText = "position:absolute;";
	let a = r.createElement("canvas");
	a.style.cssText = "display:block;background:#fff;", n !== !1 && (a.style.boxShadow = n), i.appendChild(a);
	let { textLayer: o, highlightLayer: s } = new u(i, t);
	return {
		wrapper: i,
		canvas: a,
		textLayer: o,
		highlightLayer: s
	};
}
function P(e, t, n, r) {
	if (e.canvas.style.width = `${t}px`, e.canvas.style.height = `${n}px`, e.renderedScale <= 0) return null;
	let i = r / e.renderedScale;
	return e.textLayer && (e.textLayer.style.transformOrigin = "0 0", e.textLayer.style.width = `${t / i}px`, e.textLayer.style.height = `${n / i}px`, e.textLayer.style.transform = `scale(${i})`), i;
}
function F(e) {
	e.textLayer && (e.textLayer.innerHTML = "", M(e.textLayer)), e.highlightLayer.innerHTML = "", e.highlightLayer.style.transform = "", e.highlightLayer.style.transformOrigin = "";
}
function I(e, t, n, r, i) {
	if (!t) return {
		markerLayer: null,
		margin: null,
		decorationLayer: null
	};
	let a = e.ownerDocument, o = a.createElement("div");
	if (o.setAttribute("data-overlay", "comment-marker"), o.style.cssText = "position:absolute;inset:0;overflow:hidden;pointer-events:none;", e.appendChild(o), !n) return {
		markerLayer: o,
		margin: null,
		decorationLayer: null
	};
	let s = a.createElement("div");
	s.style.cssText = "position:absolute;top:0;height:100%;box-sizing:border-box;overflow-x:hidden;overflow-y:auto;pointer-events:auto;", i(s);
	let c = null;
	return r && (c = a.createElement("div"), c.style.cssText = "position:absolute;top:0;left:0;overflow:visible;pointer-events:none;", e.appendChild(c)), e.appendChild(s), {
		markerLayer: o,
		margin: s,
		decorationLayer: c
	};
}
var L = class {
	hooks;
	constructor(e) {
		this.hooks = e;
	}
	position(e, t, n, r, i, a, o) {
		if (t.wrapper.style.top = `${n}px`, t.wrapper.style.width = `${r}px`, t.wrapper.style.height = `${i}px`, this.hooks.syncMargin(t.commentMargin), t.commentDecorationLayer) {
			let e = this.hooks.marginExtent();
			t.commentDecorationLayer.style.left = this.hooks.marginSide() === "left" ? `${-e}px` : "0px", t.commentDecorationLayer.style.width = `${r + e}px`, t.commentDecorationLayer.style.height = `${i}px`;
		}
		this.hooks.redrawOutline(e, t);
		let s = Math.max(o, (a - r) / 2);
		t.wrapper.style.left = this.hooks.marginSide() === "left" && this.hooks.commentsEnabled() ? `calc(${s}px + var(--ooxml-review-origin-x, 0px))` : `${s}px`;
	}
	preview(e, t, n, r) {
		let i = P(e, t, n, r), a = this.hooks.markerLayer(e);
		if (i !== null) {
			e.commentMargin && this.hooks.previewMargin(e.commentMargin, i);
			for (let e of a?.children ?? []) e.dataset.ooxmlCommentMarker !== void 0 && (e.style.transform = `translate(-50%,-50%) scale(${this.hooks.markerRatio(i)})`);
		}
		let o = i === null ? "hidden" : "";
		a && (a.style.visibility = o), e.commentMargin && (e.commentMargin.style.visibility = o), e.commentDecorationLayer && (e.commentDecorationLayer.style.visibility = o);
	}
	reset(e) {
		F(e);
		let t = this.hooks.markerLayer(e);
		t && (t.replaceChildren(), this.hooks.resetMarkerTransform() && (t.style.transform = "", t.style.transformOrigin = ""), t.style.visibility = ""), e.commentMargin && (this.hooks.disposeMargin(e.commentMargin), e.commentMargin.style.visibility = ""), e.commentDecorationLayer && (this.hooks.disposeDecoration(e.commentDecorationLayer), this.hooks.resetDecorationVisibility() && (e.commentDecorationLayer.style.visibility = "")), s(e.elementLayer, null);
	}
}, R = class {
	hooks;
	constructor(e) {
		this.hooks = e;
	}
	scrollToUnit(e, t) {
		if (this.hooks.count() === 0 || !this.hooks.established()) return;
		let n = Math.max(0, Math.min(e, this.hooks.count() - 1)), r = this.hooks.host(), i = Math.max(0, this.hooks.totalHeight() - r.clientHeight), a = h(this.hooks.offset(n), i);
		typeof r.scrollTo == "function" ? r.scrollTo({
			top: a,
			behavior: t?.behavior ?? "auto"
		}) : r.scrollTop = a, this.hooks.mount();
	}
	scrollToPoint(e, t, n, r) {
		let i = this.hooks.host(), a = Math.max(this.hooks.padLeft(), (i.clientWidth - this.hooks.width(e)) / 2) + this.hooks.marginOrigin(), o = Math.max(0, this.hooks.totalHeight() - i.clientHeight), s = this.hooks.spacer(), c = s.offsetWidth || Number.parseFloat(s.style.width) || 0, l = Math.max(0, c - i.clientWidth), u = Math.min(o, Math.max(0, this.hooks.offset(e) + n - i.clientHeight / 2)), d = Math.min(l, Math.max(0, a + t - i.clientWidth / 2));
		typeof i.scrollTo == "function" ? i.scrollTo({
			top: u,
			left: d,
			behavior: r?.behavior ?? "auto"
		}) : (i.scrollTop = u, i.scrollLeft = d), this.hooks.mount();
	}
	contentAtViewportY(e) {
		let t = this.hooks.host().scrollTop + e, n = this.hooks.indexAt(t), r = this.hooks.height(n);
		return {
			unit: n,
			frac: r > 0 ? Math.min(1, Math.max(0, (t - this.hooks.offset(n)) / r)) : 0
		};
	}
	viewportYOf(e, t) {
		return this.hooks.offset(e) + t * this.hooks.height(e) - this.hooks.host().scrollTop;
	}
}, z = "0 1px 3px rgba(0,0,0,0.2)", B = class {
	hooks;
	constructor(e) {
		this.hooks = e;
	}
	gap() {
		return this.hooks.options().gap ?? 16;
	}
	overscan() {
		return this.hooks.options().overscan ?? 1;
	}
	verticalPadding() {
		let e = this.hooks.options(), t = this.gap();
		return {
			leading: e.paddingTop ?? t,
			trailing: e.paddingBottom ?? t
		};
	}
	horizontalPadding() {
		let e = this.hooks.options(), t = this.gap();
		return {
			left: e.paddingLeft ?? t,
			right: e.paddingRight ?? t
		};
	}
	fitWidth() {
		let e = this.hooks.options().width;
		if (e && e > 0) return e;
		let t = this.hooks.scrollHost().clientWidth || this.hooks.container().clientWidth;
		if (t <= 0) return 0;
		let { left: n, right: r } = this.horizontalPadding();
		return Math.max(0, t - n - r);
	}
	dpr() {
		return this.hooks.options().dpr ?? e();
	}
}, V = class {
	notify;
	lastIndex = -1;
	lastTotal = -1;
	lastComplete = null;
	constructor(e) {
		this.notify = e;
	}
	publish(e, t, n) {
		e.topIndex === this.lastIndex && t === this.lastTotal && n === this.lastComplete || (this.lastIndex = e.topIndex, this.lastTotal = t, this.lastComplete = n, this.notify(e.topIndex, t, n));
	}
	reset() {
		this.lastIndex = -1, this.lastTotal = -1, this.lastComplete = null;
	}
	resetIndex() {
		this.lastIndex = -1;
	}
}, H = class {
	hooks;
	constructor(e) {
		this.hooks = e;
	}
	async load(e) {
		let t = this.hooks.name();
		if (this.hooks.destroyed()) throw Error(`${t} is destroyed`);
		if (this.hooks.borrowed()) throw Error(this.hooks.borrowedMessage());
		let n = this.hooks.beginLoad?.(), r = !1;
		try {
			let i = await this.hooks.owner().replace(() => this.hooks.acquire(e, n), (e) => {
				this.hooks.beforeReplace(e), r = !0;
			});
			if (!i) return;
			if (this.hooks.destroyed()) throw Error(`${t} is destroyed`);
			if (this.hooks.isCurrentLoad && !this.hooks.isCurrentLoad(n) || (this.hooks.afterReplace(i, n), await this.hooks.mountOpeningWindow(), this.hooks.isCurrentLoad && !this.hooks.isCurrentLoad(n))) return;
		} catch (e) {
			if (this.hooks.destroyed()) throw Error(`${t} is destroyed`);
			if (this.hooks.isCurrentLoad && !this.hooks.isCurrentLoad(n)) return;
			throw e instanceof Error ? e : Error(String(e));
		} finally {
			this.hooks.finishLoad?.(n);
		}
		r && !this.hooks.destroyed() && this.hooks.selectionChanged();
	}
}, U = class {
	hooks;
	_originPx = 0;
	constructor(e) {
		this.hooks = e;
	}
	enabled() {
		return this.hooks.enabled();
	}
	zoom() {
		return this.hooks.zoom();
	}
	get originPx() {
		return this._originPx;
	}
	hasMargin() {
		return this.hooks.enabled() && this.hooks.cards() && this.hooks.hasDisplayableComments();
	}
	side() {
		let e = this.hooks.requestedSide();
		if (e === "left" || e === "right") return e;
		let t = this.hooks.container();
		return (t.ownerDocument.defaultView?.getComputedStyle?.(t).direction || t.dir || t.style.direction) === "rtl" ? "left" : "right";
	}
	extent() {
		return this.hasMargin() ? (this.hooks.gapPx + this.hooks.widthPx) * this.hooks.zoom() : 0;
	}
	syncMargin(e) {
		if (!e) return;
		e.style.display = this.hasMargin() ? "" : "none";
		let t = this.hooks.zoom(), n = `calc(100% + ${this.hooks.gapPx * t}px)`;
		e.style.left = this.side() === "right" ? n : "", e.style.right = this.side() === "left" ? n : "", e.style.width = `${this.hooks.widthPx * t}px`, e.style.fontSize = `${this.hooks.fontSizePx}px`, e.dataset.ooxmlCommentZoom = String(t);
	}
	syncSpacerWidth(e, t, n) {
		let r = this.extent(), i = this.side() === "left" ? r : 0, a = i - this._originPx, o = this.hooks.scrollHost(), s = Math.max(0, o.scrollLeft + a);
		this.hooks.spacer().style.width = `${e + r + t + n}px`, a !== 0 && (this._originPx = i, o.style["--ooxml-review-origin-x"] = `${i}px`, o.scrollLeft = s);
	}
	destroy() {
		this._originPx = 0;
	}
}, W = class {
	hooks;
	scale = 1;
	established = !1;
	pendingScale = null;
	pendingAnchor = null;
	prevBase = 0;
	lastFitWidth = 0;
	_wheelListener = null;
	_resizeObserver = null;
	constructor(e) {
		this.hooks = e;
	}
	bind(e, t, n) {
		n && (this._wheelListener = (e) => {
			if (!(e.ctrlKey || e.metaKey) || (e.preventDefault(), e.deltaY === 0)) return;
			let n = t.getBoundingClientRect(), i = e.clientX - n.left, a = e.clientY - n.top;
			this.pendingAnchor = Number.isFinite(i) && Number.isFinite(a) ? {
				x: i,
				y: a
			} : null, this.setScale(r(this.scale, e.deltaY, e.deltaMode));
		}, t.addEventListener("wheel", this._wheelListener, { passive: !1 })), typeof ResizeObserver < "u" && (this._resizeObserver = new ResizeObserver(() => this.onResize()), this._resizeObserver.observe(e));
	}
	establishBase() {
		let e = this.hooks.baseScale();
		if (e <= 0) return !1;
		if (this.scale = e, this.prevBase = e, this.lastFitWidth = this.hooks.fitWidthPx(), this.established = !0, this.pendingScale !== null) {
			let e = this.pendingScale;
			this.pendingScale = null, e !== this.scale && (this.scale = e, this.hooks.onScaleChange(e));
		}
		return !0;
	}
	setScale(e) {
		let t = Math.min(this.hooks.zoomMax(), Math.max(this.effectiveMin(), e)), n = this.pendingAnchor;
		if (this.pendingAnchor = null, this.hooks.count() === 0 || !this.established) {
			this.pendingScale = t;
			return;
		}
		if (t === this.scale) return;
		let r = this.scale, i = n?.y ?? 0, a = this.hooks.scrollHost(), o = a.scrollTop, s = o + i, c = this.hooks.indexAt(s), l = this.hooks.height(c), u = this.hooks.offset(c), d = Math.min(1, Math.max(0, l > 0 ? (s - u) / l : 0)), p = this.hooks.padLeft(), m = a.scrollLeft || 0;
		this.hooks.invalidateRender(), this.scale = t, this.hooks.recomputeHeights();
		let h = this.hooks.totalHeight();
		this.hooks.spacer().style.height = `${h}px`, this.hooks.syncSpacerWidth();
		let g = Math.max(0, h - a.clientHeight), _ = this.hooks.offset(c) + d * this.hooks.height(c), v = s < u && c === 0 ? o : _ - i;
		if (a.scrollTop = Math.min(g, Math.max(0, v)), n) {
			let e = Math.max(0, (this.hooks.spacer().offsetWidth || 0) - a.clientWidth);
			a.scrollLeft = f(m, n.x - p, r, t, { maxScroll: e });
		}
		this.hooks.preview(), this.hooks.scheduleSettle(), this.hooks.onScaleChange(t);
	}
	getScale() {
		return this.established ? this.scale : this.pendingScale ?? 1;
	}
	zoomIn() {
		this.setScale(t(this.getScale()));
	}
	zoomOut() {
		this.setScale(d(this.getScale(), this.effectiveMin()));
	}
	effectiveMin() {
		let e = this.hooks.zoomMin();
		return this.established && this.prevBase > 0 ? Math.min(e, this.prevBase) : e;
	}
	fit(e) {
		if (this.hooks.count() === 0) return;
		let t = this.hooks.fitContentSize(e);
		if (!t) return;
		let n = o({
			contentWidth: t.width,
			contentHeight: t.height,
			containerWidth: this.hooks.fitWidthPx(),
			containerHeight: this.hooks.scrollHost().clientHeight
		}, e);
		n > 0 && this.setScale(n);
	}
	onResize() {
		if (this.hooks.count() === 0) return;
		if (!this.established) {
			this.hooks.relayout();
			return;
		}
		if (!this.hooks.refitOnResize()) {
			this.lastFitWidth = this.hooks.fitWidthPx(), this.hooks.mountVisible();
			return;
		}
		let e = this.hooks.baseScale();
		if (e <= 0) return;
		let t = this.hooks.fitWidthPx();
		if (t === this.lastFitWidth) {
			this.hooks.mountVisible();
			return;
		}
		this.lastFitWidth = t;
		let n = this.prevBase > 0 ? this.scale / this.prevBase : 1;
		this.prevBase = e, this.setScale(e * n), this.hooks.mountVisible();
	}
	destroy() {
		this.pendingAnchor = null, this._wheelListener &&= (this.hooks.scrollHost().removeEventListener("wheel", this._wheelListener), null), this._resizeObserver?.disconnect(), this._resizeObserver = null;
	}
}, G = class {
	hooks;
	elementContext = null;
	_generation = 0;
	_contextKey = "null";
	_selectionChangeListener = null;
	_elementClickListener = null;
	_contextMenuListener = null;
	constructor(e) {
		this.hooks = e;
	}
	bind(e, t) {
		let n = this.hooks.wrapper(), r = this.hooks.scrollHost();
		this.hooks.textSelectionEnabled() && (e || this.hooks.elementSelectionEnabled()) && (this._selectionChangeListener = () => this.emitChange(), n.ownerDocument.addEventListener("selectionchange", this._selectionChangeListener)), this.hooks.elementSelectionEnabled() && (this._elementClickListener = (e) => {
			this.onElementClick(e).catch((e) => this.hooks.reportError(e));
		}, r.addEventListener("click", this._elementClickListener)), t && this.hooks.onContextMenu && (this._contextMenuListener = (e) => {
			let t;
			this.hooks.onContextMenu?.(e, () => t ??= this.resolveContextAt(e));
		}, r.addEventListener("contextmenu", this._contextMenuListener));
	}
	emitChange() {
		let e = this.hooks.getContext();
		e?.kind === "text" && (this._generation++, this.elementContext = null, this.redrawOutlines());
		let t = JSON.stringify(e);
		t !== this._contextKey && (this._contextKey = t, this.hooks.onChange(e ? structuredClone(e) : null));
	}
	setElementContext(e) {
		this.elementContext = e ? structuredClone(e) : null, this.redrawOutlines(), this.emitChange();
	}
	invalidateElementContext(e = !0) {
		this._generation++, this.elementContext = null, this.redrawOutlines(), e && this.emitChange();
	}
	clearElementContext() {
		this.elementContext = null;
	}
	redrawOutlines() {
		for (let [e, t] of this.hooks.slots()) this.redrawOutlineForSlot(e, t);
	}
	redrawOutlineForSlot(e, t) {
		let n = this.elementContext, r = this.hooks.resource();
		s(t.elementLayer, n && r ? this.hooks.outline(r, e, n) : null);
	}
	async onElementClick(e) {
		this.hooks.destroyed() || e.defaultPrevented || e.button !== 0 || await this.resolveContextAt(e);
	}
	async resolveContextAt(e) {
		let t = this.hooks.resource();
		if (this.hooks.destroyed() || !t) return null;
		if (this.hooks.textSelectionEnabled() && this.hooks.textSelected()) return this.emitChange(), this.hooks.destroyed() ? null : this.hooks.getContext();
		if (!this.hooks.elementSelectionEnabled()) return this.hooks.getContext();
		let n = e.target, r = [...this.hooks.slots()].find(([, e]) => n !== null && e.wrapper.contains(n));
		if (!r) return this.invalidateElementContext(), null;
		let [i, a] = r, o = a.canvas.getBoundingClientRect();
		if (o.width <= 0 || o.height <= 0) return this.invalidateElementContext(), null;
		let s = e.clientX - o.left, c = e.clientY - o.top;
		if (s < 0 || c < 0 || s > o.width || c > o.height) return this.invalidateElementContext(), null;
		let l = ++this._generation, u;
		try {
			u = await this.hooks.hitTest(t, i, s / o.width, c / o.height, o.width);
		} catch (e) {
			if (this.hooks.destroyed() || l !== this._generation || t !== this.hooks.resource()) return null;
			throw e;
		}
		return this.hooks.destroyed() || l !== this._generation || t !== this.hooks.resource() ? null : (this.setElementContext(u), this.hooks.destroyed() ? null : this.hooks.getContext());
	}
	destroy() {
		this._generation++;
		let e = this.hooks.wrapper(), t = this.hooks.scrollHost();
		this._selectionChangeListener &&= (e.ownerDocument.removeEventListener("selectionchange", this._selectionChangeListener), null), this._elementClickListener &&= (t.removeEventListener("click", this._elementClickListener), null), this._contextMenuListener &&= (t.removeEventListener("contextmenu", this._contextMenuListener), null), this.elementContext = null;
	}
}, K = class {
	hooks;
	_scheduled = !1;
	_frame = null;
	_pending = /* @__PURE__ */ new Map();
	constructor(e) {
		this.hooks = e;
	}
	drawConnectors(e, t) {
		let n = t.commentDecorationLayer, r = t.commentMargin, i = t.commentGeometry, a = this.hooks.connectorOptions(), o = this.hooks.runtime();
		if (!n || !r || !i || !a || !o) return;
		let s = this.hooks.width(e), c = this.hooks.height(e), l = this.hooks.side(), u = this.hooks.marginExtent();
		o.buildReadOnlyCommentDecoration(n, Object.freeze({
			surfaceBounds: Object.freeze({
				x: l === "left" ? -u : 0,
				y: 0,
				width: s + u,
				height: c
			}),
			contentBounds: Object.freeze({
				x: 0,
				y: 0,
				width: s,
				height: c
			}),
			side: l,
			threads: o.projectReadOnlyCommentMarginScroll(i, r.scrollTop)
		}), {
			route: a.route ?? "bezier",
			stroke: a.stroke ?? "solid",
			color: a.color,
			activeColor: a.activeColor
		});
	}
	schedule(e, t, n = !1) {
		let r = this._pending.get(e);
		if (this._pending.set(e, {
			slot: t,
			connectorsOnly: r?.slot === t ? r.connectorsOnly && n : n
		}), this._scheduled) return;
		this._scheduled = !0;
		let i = () => {
			this._scheduled = !1, this._frame = null;
			let e = [...this._pending];
			if (this._pending.clear(), !this.hooks.destroyed()) for (let [t, n] of e) this.hooks.slots().get(t) !== n.slot || n.slot.renderedScale !== this.hooks.scale() || (n.connectorsOnly ? this.drawConnectors(t, n.slot) : this.hooks.redrawComments(t, n.slot));
		}, a = this.hooks.ownerWindow();
		a?.requestAnimationFrame ? this._frame = a.requestAnimationFrame(i) : queueMicrotask(i);
	}
	destroy() {
		this._frame !== null && this.hooks.ownerWindow()?.cancelAnimationFrame?.(this._frame), this._frame = null, this._scheduled = !1, this._pending.clear();
	}
};
export { v as C, y as S, g as T, O as _, H as a, x as b, B as c, j as d, M as f, k as g, A as h, U as i, R as l, N as m, G as n, V as o, I as p, W as r, z as s, K as t, L as u, D as v, _ as w, b as x, w as y };
