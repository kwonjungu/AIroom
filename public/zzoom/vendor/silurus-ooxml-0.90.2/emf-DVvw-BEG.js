import { A as e, H as t, M as n, j as r, k as i, n as a, t as o } from "./wmf-HY7sNn5s.js";
import { f as s, o as c, s as l, t as u, u as d } from "./pixel-budget-DI82Hn3R.js";
var f = {
	HEADER: 16385,
	EOF: 16386,
	COMMENT: 16387,
	GET_DC: 16388,
	OBJECT: 16392,
	CLEAR: 16393,
	DRAW_IMAGE: 16410,
	SET_ANTI_ALIAS_MODE: 16414,
	SET_TEXT_RENDERING_HINT: 16415,
	SET_TEXT_CONTRAST: 16416,
	SET_INTERPOLATION_MODE: 16417,
	SET_PIXEL_OFFSET_MODE: 16418,
	SET_COMPOSITING_MODE: 16419,
	SET_COMPOSITING_QUALITY: 16420,
	SAVE: 16421,
	RESTORE: 16422,
	SET_WORLD_TRANSFORM: 16426,
	RESET_WORLD_TRANSFORM: 16427,
	MULTIPLY_WORLD_TRANSFORM: 16428,
	TRANSLATE_WORLD_TRANSFORM: 16429,
	SCALE_WORLD_TRANSFORM: 16430,
	ROTATE_WORLD_TRANSFORM: 16431,
	SET_PAGE_TRANSFORM: 16432
}, p = new Set([
	16394,
	16395,
	16396,
	16397,
	16398,
	16399,
	16400,
	16401,
	16402,
	16403,
	16404,
	16405,
	16406,
	16407,
	16408,
	16409,
	16410,
	16411,
	16412,
	16438
]), m = 5, h = 8, g = 2498570, _ = 925707, v = 2, y = 4, b = u;
function* x(e, t, n, r) {
	if (n - t < 16 || e.getUint32(t + 12, !0) !== 726027589) return;
	let i = e.getUint32(t + 8, !0);
	if (i < 4 || t + 12 + i > n) {
		r("EMF+ comment (invalid DataSize)");
		return;
	}
	let a = t + 12 + i, o = t + 16;
	for (; o < a;) {
		if (a - o < 12) {
			r("EMF+ record (truncated header)");
			return;
		}
		let t = e.getUint16(o, !0), n = e.getUint16(o + 2, !0), i = e.getUint32(o + 4, !0), s = e.getUint32(o + 8, !0);
		if (i < 12 || i > a - o || s > i - 12) {
			r(`EMF+ record 0x${t.toString(16)} (invalid Size or DataSize)`);
			return;
		}
		yield {
			type: t,
			flags: n,
			start: o + 12,
			end: o + 12 + s
		}, o += i;
	}
}
function S(e) {
	let t = new DataView(e.buffer, e.byteOffset, e.byteLength), n = !1, r = !1, i = !1, a = !1, o = {
		ctx: null,
		W: 1,
		H: 1,
		left: 0,
		top: 0,
		boundsW: 1,
		boundsH: 1,
		drew: !1,
		unsupported: /* @__PURE__ */ new Set()
	}, s = new T(o, !0), c = () => {}, l = 0;
	for (; l + 8 <= e.length;) {
		let u = t.getUint32(l, !0), d = t.getUint32(l + 4, !0);
		if (d < 8 || d & 3 || l + d > e.length) {
			o.unsupported.add("EMF record stream (truncated or invalid record size)");
			break;
		}
		if (u === 70) {
			d >= 16 && t.getUint32(l + 12, !0) === 726027589 && (r = !0);
			for (let e of x(t, l, l + d, c)) e.type === f.HEADER && (n = !0, i = (e.flags & 1) != 0), p.has(e.type) && (a = !0);
			s.playComment(t, l, l + d);
		}
		if (u === 14) break;
		l += d;
	}
	s.finish();
	let u = r ? [...o.unsupported] : [];
	return {
		present: n,
		dual: i,
		play: n && a && u.length === 0,
		failures: u
	};
}
var C = {
	a: 1,
	b: 0,
	c: 0,
	d: 1,
	e: 0,
	f: 0
};
function w(e, t) {
	return {
		a: e.a * t.a + e.b * t.c,
		b: e.a * t.b + e.b * t.d,
		c: e.c * t.a + e.d * t.c,
		d: e.c * t.b + e.d * t.d,
		e: e.e * t.a + e.f * t.c + t.e,
		f: e.e * t.b + e.f * t.d + t.f
	};
}
var T = class {
	target;
	dry;
	world = C;
	pageUnit = v;
	pageScale = 1;
	sourceCopy = !1;
	objects = /* @__PURE__ */ new Map();
	saved = /* @__PURE__ */ new Map();
	pending = null;
	gdiAllowed = !1;
	drawFailed = !1;
	constructor(e, t = !1) {
		this.target = e, this.dry = t;
	}
	playComment(e, t, n) {
		let r = (e) => this.target.unsupported.add(e);
		for (let i of x(e, t, n, r)) {
			this.gdiAllowed = !1, this.pending && !(i.type === f.OBJECT && i.flags & 32768) && this.abandonPending();
			let t = this.target.unsupported.size;
			try {
				this.play(e, i);
			} catch (e) {
				if (s(e)) throw e;
				this.target.unsupported.add(`EMF+ record 0x${i.type.toString(16)} (malformed)`);
			}
			!this.dry && this.target.unsupported.size > t && (this.drawFailed = !0);
		}
	}
	finish() {
		this.pending && this.abandonPending();
	}
	abandonPending() {
		this.target.unsupported.add("EMF+ continued object (unfinished)"), this.pending = null;
	}
	play(e, t) {
		let n = (n) => e.getFloat32(t.start + n, !0), r = (e) => {
			if (t.end - t.start < e) throw RangeError("Truncated EMF+ record");
		};
		switch (t.type) {
			case f.HEADER:
			case f.EOF:
			case f.COMMENT:
			case f.SET_ANTI_ALIAS_MODE:
			case f.SET_TEXT_RENDERING_HINT:
			case f.SET_TEXT_CONTRAST:
			case f.SET_INTERPOLATION_MODE:
			case f.SET_PIXEL_OFFSET_MODE:
			case f.SET_COMPOSITING_QUALITY: return;
			case f.GET_DC:
				this.gdiAllowed = !0;
				return;
			case f.SET_PAGE_TRANSFORM:
				r(4), this.pageUnit = t.flags & 255, this.pageScale = n(0);
				return;
			case f.SET_COMPOSITING_MODE:
				this.sourceCopy = (t.flags & 255) == 1;
				return;
			case f.SET_WORLD_TRANSFORM:
				r(24), this.world = {
					a: n(0),
					b: n(4),
					c: n(8),
					d: n(12),
					e: n(16),
					f: n(20)
				};
				return;
			case f.RESET_WORLD_TRANSFORM:
				this.world = C;
				return;
			case f.MULTIPLY_WORLD_TRANSFORM: {
				r(24);
				let e = {
					a: n(0),
					b: n(4),
					c: n(8),
					d: n(12),
					e: n(16),
					f: n(20)
				};
				this.world = t.flags & 8192 ? w(this.world, e) : w(e, this.world);
				return;
			}
			case f.TRANSLATE_WORLD_TRANSFORM:
			case f.SCALE_WORLD_TRANSFORM:
			case f.ROTATE_WORLD_TRANSFORM: {
				let e;
				if (t.type === f.ROTATE_WORLD_TRANSFORM) {
					r(4);
					let t = n(0) * Math.PI / 180;
					e = {
						a: Math.cos(t),
						b: Math.sin(t),
						c: -Math.sin(t),
						d: Math.cos(t),
						e: 0,
						f: 0
					};
				} else r(8), e = t.type === f.TRANSLATE_WORLD_TRANSFORM ? {
					a: 1,
					b: 0,
					c: 0,
					d: 1,
					e: n(0),
					f: n(4)
				} : {
					a: n(0),
					b: 0,
					c: 0,
					d: n(4),
					e: 0,
					f: 0
				};
				this.world = t.flags & 8192 ? w(this.world, e) : w(e, this.world);
				return;
			}
			case f.SAVE:
				r(4), this.saved.set(e.getUint32(t.start, !0), {
					world: this.world,
					unit: this.pageUnit,
					scale: this.pageScale,
					sourceCopy: this.sourceCopy
				});
				return;
			case f.RESTORE: {
				r(4);
				let n = this.saved.get(e.getUint32(t.start, !0));
				if (!n) {
					this.target.unsupported.add("EMF+ Restore of an unsaved graphics state");
					return;
				}
				this.world = n.world, this.pageUnit = n.unit, this.pageScale = n.scale, this.sourceCopy = n.sourceCopy;
				return;
			}
			case f.CLEAR:
				r(4), this.clear(e.getUint32(t.start, !0));
				return;
			case f.OBJECT:
				this.object(e, t);
				return;
			case f.DRAW_IMAGE:
				this.drawImage(e, t);
				return;
			default: this.target.unsupported.add(`EMF+ record 0x${t.type.toString(16)}`);
		}
	}
	clear(e) {
		let { ctx: t, W: n, H: r } = this.target;
		if (this.dry || !t) return;
		let i = (e >>> 24) / 255;
		try {
			t.clearRect(0, 0, n, r), i > 0 && (t.fillStyle = `rgba(${e >>> 16 & 255},${e >>> 8 & 255},${e & 255},${i})`, t.fillRect(0, 0, n, r), this.target.drew = !0);
		} catch {}
	}
	object(e, t) {
		let n = t.flags & 255, r = t.flags >> 8 & 127, i = new Uint8Array(e.buffer, e.byteOffset + t.start, t.end - t.start), a = null, o = 0;
		if (t.flags & 32768) {
			if (i.length < 4) throw RangeError("Truncated EMF+ object");
			let s = e.getUint32(t.start, !0);
			this.pending && (this.pending.id !== n || this.pending.kind !== r || this.pending.total !== s) && this.abandonPending(), this.pending ||= {
				id: n,
				kind: r,
				total: s,
				parts: [],
				length: 0
			};
			let c = i.subarray(4);
			if (c.length > this.pending.total - this.pending.length) {
				this.target.unsupported.add("EMF+ continued object (fragments exceed TotalObjectSize)"), this.pending = null, this.objects.delete(n);
				return;
			}
			if (c.length && this.pending.parts.push(c), this.pending.length += c.length, this.pending.length < this.pending.total) return;
			a = this.pending.parts, o = this.pending.total, this.pending = null, i = new Uint8Array(Math.min(28, o));
			let l = 0;
			for (let e of a) {
				let t = e.subarray(0, i.length - l);
				if (i.set(t, l), l += t.length, l === i.length) break;
			}
		}
		let s = new DataView(i.buffer, i.byteOffset, i.byteLength);
		if (this.objects.delete(n), r === h) {
			if (i.length < 24) throw RangeError("Truncated EMF+ image attributes");
			let e = s.getUint32(8, !0);
			if (e > y || s.getUint32(16, !0) > 1) {
				this.target.unsupported.add("EMF+ image attributes (invalid wrap or clamp)");
				return;
			}
			this.objects.set(n, {
				kind: "attributes",
				wrapMode: e
			});
			return;
		}
		if (r !== m) {
			this.target.unsupported.add(`EMF+ object type ${r}`);
			return;
		}
		if (i.length < 28) throw RangeError("Truncated EMF+ image");
		let u = s.getUint32(4, !0), f = s.getInt32(8, !0), p = s.getInt32(12, !0), v = s.getInt32(16, !0), b = s.getUint32(20, !0), x = s.getUint32(24, !0);
		if (u !== 1 || x !== 0 || b !== g && b !== _) {
			this.target.unsupported.add("EMF+ image other than an uncompressed 32-bit bitmap");
			return;
		}
		if (f <= 0 || p <= 0 || v < f * 4 || 28 + v * p > (a ? o : i.length)) throw RangeError("Invalid EMF+ bitmap");
		if (f > 32767 || p > 32767) throw new d("image-dimension", c, Math.max(f, p));
		if (f * p > 33554432) throw new d("image-pixels", l, f * p);
		if (this.admit(o + f * p * 4, n), this.dry) {
			this.objects.set(n, {
				kind: "image",
				bitmap: {
					width: f,
					height: p,
					data: new Uint8ClampedArray()
				}
			});
			return;
		}
		if (a) {
			i = new Uint8Array(o);
			let e = 0;
			for (let t of a) i.set(t, e), e += t.length;
		}
		let S = new Uint8ClampedArray(f * p * 4), C = b === _;
		for (let e = 0; e < p; e++) {
			let t = 28 + e * v, n = e * f * 4;
			for (let e = 0; e < f; e++, t += 4, n += 4) {
				let e = i[t + 3], r = C && e > 0 && e < 255 ? 255 / e : 1;
				S[n] = i[t + 2] * r, S[n + 1] = i[t + 1] * r, S[n + 2] = i[t] * r, S[n + 3] = e;
			}
		}
		this.objects.set(n, {
			kind: "image",
			bitmap: {
				width: f,
				height: p,
				data: S
			}
		});
	}
	retainedBytes(e) {
		let t = 0;
		for (let [n, r] of this.objects) n !== e && r.kind === "image" && (t += r.bitmap.width * r.bitmap.height * 4);
		return t;
	}
	admit(e, t) {
		let n = this.retainedBytes(t) + e;
		if (n > b) throw new d("active-decoded-bytes", b, n);
	}
	toTarget(e, t) {
		let n = this.world, r = (n.a * e + n.c * t + n.e) * this.pageScale, i = (n.b * e + n.d * t + n.f) * this.pageScale, a = this.target;
		return [(r - a.left) * a.W / a.boundsW, (i - a.top) * a.H / a.boundsH];
	}
	drawImage(t, n) {
		let r = (n.flags & 16384) != 0;
		if (n.end - n.start < 24 + (r ? 8 : 16)) throw RangeError("Truncated EMF+ DrawImage");
		let i = this.objects.get(n.flags & 255);
		if (i?.kind !== "image") {
			this.target.unsupported.add("EMF+ DrawImage of an unavailable image");
			return;
		}
		let a = i.bitmap;
		if (this.objects.get(t.getUint32(n.start, !0))?.kind !== "attributes") {
			this.target.unsupported.add("EMF+ DrawImage without its image attributes");
			return;
		}
		let o = t.getInt32(n.start + 4, !0), s = (e) => t.getFloat32(n.start + e, !0), [c, l, u, d] = [
			s(8),
			s(12),
			s(16),
			s(20)
		], [f, p, m, h] = r ? [
			0,
			2,
			4,
			6
		].map((e) => t.getInt16(n.start + 24 + e, !0)) : [
			s(24),
			s(28),
			s(32),
			s(36)
		], g = this.world, [_, y] = this.toTarget(f, p), [b, x] = this.toTarget(f + m, p + h);
		if (![
			c,
			l,
			u,
			d,
			f,
			p,
			m,
			h,
			g.a,
			g.b,
			g.c,
			g.d,
			g.e,
			g.f,
			this.pageScale,
			_,
			y,
			b,
			x
		].every(Number.isFinite)) {
			this.target.unsupported.add("EMF+ DrawImage placement (non-finite value)");
			return;
		}
		let S = Math.abs(g.b) < 1e-9 && Math.abs(g.c) < 1e-9;
		if (o !== v || this.pageUnit !== v || !S || !(m > 0) || !(h > 0) || !(u > 0) || !(d > 0) || g.a <= 0 || g.d <= 0 || !(this.pageScale > 0)) {
			this.target.unsupported.add("EMF+ DrawImage placement (units, rotation or mirroring)");
			return;
		}
		let C = Math.round(c), w = Math.round(l), T = Math.round(c + u), E = Math.round(l + d);
		if (C < 0 || w < 0 || T > a.width || E > a.height || T <= C || E <= w) {
			this.target.unsupported.add("EMF+ DrawImage source outside the image");
			return;
		}
		let D = C !== 0 || w !== 0 || T !== a.width || E !== a.height, O = (T - C) * (E - w) * 4;
		if (this.admit((D ? O : 0) + 2 * O), this.dry) return;
		let k = a;
		if (D) {
			let e = T - C, t = new Uint8ClampedArray(e * (E - w) * 4);
			for (let n = w; n < E; n++) t.set(a.data.subarray((n * a.width + C) * 4, (n * a.width + T) * 4), (n - w) * e * 4);
			k = {
				width: e,
				height: E - w,
				data: t
			};
		}
		let { ctx: A } = this.target;
		if (A) {
			if (this.sourceCopy) try {
				A.clearRect(Math.min(_, b), Math.min(y, x), Math.abs(b - _), Math.abs(x - y));
			} catch {}
			e(A, k, _, y, b, x) ? this.target.drew = !0 : this.target.unsupported.add("EMF+ DrawImage (the bitmap could not be drawn)");
		}
	}
}, E = {
	HEADER: 1,
	POLYBEZIER: 2,
	POLYGON: 3,
	POLYLINE: 4,
	POLYBEZIERTO: 5,
	POLYLINETO: 6,
	POLYPOLYLINE: 7,
	POLYPOLYGON: 8,
	SETWINDOWEXTEX: 9,
	SETWINDOWORGEX: 10,
	SETVIEWPORTEXTEX: 11,
	SETVIEWPORTORGEX: 12,
	EOF: 14,
	SETMAPMODE: 17,
	SETPOLYFILLMODE: 19,
	SETBKMODE: 18,
	SETTEXTALIGN: 22,
	SETTEXTCOLOR: 24,
	MOVETOEX: 27,
	SCALEVIEWPORTEXTEX: 31,
	SCALEWINDOWEXTEX: 32,
	SAVEDC: 33,
	RESTOREDC: 34,
	SETWORLDTRANSFORM: 35,
	MODIFYWORLDTRANSFORM: 36,
	SELECTOBJECT: 37,
	CREATEPEN: 38,
	CREATEBRUSHINDIRECT: 39,
	DELETEOBJECT: 40,
	ANGLEARC: 41,
	ELLIPSE: 42,
	RECTANGLE: 43,
	ROUNDRECT: 44,
	ARC: 45,
	CHORD: 46,
	PIE: 47,
	LINETO: 54,
	ARCTO: 55,
	POLYDRAW: 56,
	BEGINPATH: 59,
	ENDPATH: 60,
	CLOSEFIGURE: 61,
	FILLPATH: 62,
	STROKEANDFILLPATH: 63,
	STROKEPATH: 64,
	FLATTENPATH: 65,
	WIDENPATH: 66,
	SELECTCLIPPATH: 67,
	ABORTPATH: 68,
	EXTCREATEFONTINDIRECTW: 82,
	EXTTEXTOUTA: 83,
	EXTTEXTOUTW: 84,
	POLYBEZIER16: 85,
	POLYGON16: 86,
	POLYLINE16: 87,
	POLYBEZIERTO16: 88,
	POLYLINETO16: 89,
	POLYPOLYLINE16: 90,
	POLYPOLYGON16: 91,
	POLYDRAW16: 92,
	CREATEMONOBRUSH: 93,
	CREATEDIBPATTERNBRUSHPT: 94,
	EXTCREATEPEN: 95,
	POLYTEXTOUTA: 96,
	POLYTEXTOUTW: 97,
	SMALLTEXTOUT: 108,
	BITBLT: 76,
	STRETCHDIBITS: 81,
	SETPIXELV: 15,
	OFFSETCLIPRGN: 26,
	SETMETARGN: 28,
	EXCLUDECLIPRECT: 29,
	INTERSECTCLIPRECT: 30,
	EXTFLOODFILL: 53,
	SETARCDIRECTION: 57,
	GDICOMMENT: 70,
	FILLRGN: 71,
	FRAMERGN: 72,
	INVERTRGN: 73,
	PAINTRGN: 74,
	EXTSELECTCLIPRGN: 75,
	STRETCHBLT: 77,
	MASKBLT: 78,
	PLGBLT: 79,
	SETDIBITSTODEVICE: 80,
	ALPHABLEND: 114,
	TRANSPARENTBLT: 116,
	GRADIENTFILL: 118
}, D = {
	[E.POLYDRAW]: "EMR_POLYDRAW",
	[E.POLYDRAW16]: "EMR_POLYDRAW16",
	[E.EXTTEXTOUTA]: "EMR_EXTTEXTOUTA",
	[E.POLYTEXTOUTA]: "EMR_POLYTEXTOUTA",
	[E.POLYTEXTOUTW]: "EMR_POLYTEXTOUTW",
	[E.SMALLTEXTOUT]: "EMR_SMALLTEXTOUT",
	[E.SETPIXELV]: "EMR_SETPIXELV",
	[E.EXTFLOODFILL]: "EMR_EXTFLOODFILL",
	[E.FILLRGN]: "EMR_FILLRGN",
	[E.FRAMERGN]: "EMR_FRAMERGN",
	[E.INVERTRGN]: "EMR_INVERTRGN",
	[E.PAINTRGN]: "EMR_PAINTRGN",
	[E.STRETCHBLT]: "EMR_STRETCHBLT",
	[E.MASKBLT]: "EMR_MASKBLT",
	[E.PLGBLT]: "EMR_PLGBLT",
	[E.SETDIBITSTODEVICE]: "EMR_SETDIBITSTODEVICE",
	[E.ALPHABLEND]: "EMR_ALPHABLEND",
	[E.TRANSPARENTBLT]: "EMR_TRANSPARENTBLT",
	[E.GRADIENTFILL]: "EMR_GRADIENTFILL"
}, O = 1, k = 2, A = 1, ee = 4, j = 5, M = {
	WHITE_BRUSH: 2147483648,
	LTGRAY_BRUSH: 2147483649,
	GRAY_BRUSH: 2147483650,
	DKGRAY_BRUSH: 2147483651,
	BLACK_BRUSH: 2147483652,
	NULL_BRUSH: 2147483653,
	WHITE_PEN: 2147483654,
	BLACK_PEN: 2147483655,
	NULL_PEN: 2147483656,
	DC_BRUSH: 2147483666,
	DC_PEN: 2147483662
}, N = {
	TEXT: 1,
	LOMETRIC: 2,
	HIMETRIC: 3,
	LOENGLISH: 4,
	HIENGLISH: 5,
	TWIPS: 6,
	ISOTROPIC: 7,
	ANISOTROPIC: 8
}, te = () => ({
	m11: 1,
	m12: 0,
	m21: 0,
	m22: 1,
	dx: 0,
	dy: 0
});
function ne(e, t) {
	return {
		m11: e.m11 * t.m11 + e.m21 * t.m12,
		m12: e.m12 * t.m11 + e.m22 * t.m12,
		m21: e.m11 * t.m21 + e.m21 * t.m22,
		m22: e.m12 * t.m21 + e.m22 * t.m22,
		dx: e.m11 * t.dx + e.m21 * t.dy + e.dx,
		dy: e.m12 * t.dx + e.m22 * t.dy + e.dy
	};
}
var re = class {
	dv;
	start;
	end;
	p;
	constructor(e, t, n) {
		this.dv = e, this.start = t, this.end = n, this.p = t;
	}
	get pos() {
		return this.p;
	}
	set pos(e) {
		if (!Number.isInteger(e) || e < this.start || e > this.end) throw RangeError("Invalid EMF cursor position");
		this.p = e;
	}
	get remaining() {
		return this.end - this.p;
	}
	require(e) {
		if (!Number.isInteger(e) || e < 0 || this.remaining < e) throw RangeError("Truncated EMF record");
	}
	u16() {
		this.require(2);
		let e = this.dv.getUint16(this.p, !0);
		return this.p += 2, e;
	}
	i16() {
		this.require(2);
		let e = this.dv.getInt16(this.p, !0);
		return this.p += 2, e;
	}
	i32() {
		this.require(4);
		let e = this.dv.getInt32(this.p, !0);
		return this.p += 4, e;
	}
	u32() {
		this.require(4);
		let e = this.dv.getUint32(this.p, !0);
		return this.p += 4, e;
	}
	f32() {
		this.require(4);
		let e = this.dv.getFloat32(this.p, !0);
		return this.p += 4, e;
	}
	xform() {
		return {
			m11: this.f32(),
			m12: this.f32(),
			m21: this.f32(),
			m22: this.f32(),
			dx: this.f32(),
			dy: this.f32()
		};
	}
	skip(e) {
		this.require(e), this.p += e;
	}
}, ie = 2162688, ae = class {
	buf = oe();
	moveTo(e, t) {
		this.buf.ops.push(ce, e, t);
	}
	lineTo(e, t) {
		this.buf.ops.push(le, e, t);
	}
	bezierCurveTo(e, t, n, r, i, a) {
		this.buf.ops.push(ue, e, t, n, r, i, a);
	}
	closePath() {
		this.buf.ops.push(de);
	}
};
function oe() {
	return {
		ops: [],
		commands: 0,
		saved: []
	};
}
function se(e, t) {
	let n = t.saved[t.saved.length - 1] ?? {
		length: 0,
		commands: 0
	};
	t.ops.length <= n.length && t.commands <= n.commands || (e.pathRetained -= t.commands - n.commands, t.commands = n.commands, t.ops.length = n.length);
}
var ce = 0, le = 1, ue = 2, de = 3;
function fe(e, t) {
	e.beginPath();
	for (let n = 0; n < t.length;) switch (t[n]) {
		case ce:
			e.moveTo(t[n + 1], t[n + 2]), n += 3;
			break;
		case le:
			e.lineTo(t[n + 1], t[n + 2]), n += 3;
			break;
		case ue:
			e.bezierCurveTo(t[n + 1], t[n + 2], t[n + 3], t[n + 4], t[n + 5], t[n + 6]), n += 7;
			break;
		default: e.closePath(), n += 1;
	}
}
function P(e) {
	return e.inPath ? e.path : e.ctx;
}
function pe(e) {
	let t = e.path.buf;
	e.path.buf = oe(), se(e, t);
}
function F(e) {
	pe(e), e.inPath = !1, e.pathHeld = !1, e.pathDiscarded = !1;
}
function I(e, t) {
	if (!e.inPath) return !0;
	if (e.pathDiscarded) return !1;
	let n = e.pathRetained + t;
	if (!Number.isSafeInteger(n) || t < 0 || n > e.maxPathCommands) throw pe(e), e.pathDiscarded = !0, new d("metafile-path-commands", e.maxPathCommands, Number.isSafeInteger(n) && n > e.maxPathCommands ? n : 2 ** 53 - 1);
	return e.pathRetained = n, e.path.buf.commands += t, !0;
}
function L(e, t, n) {
	let r = n === W ? 4 : 8;
	return Math.min(t, Math.floor(e.remaining / r));
}
function me(e, t, n) {
	return e.wt.m11 * t + e.wt.m21 * n + e.wt.dx;
}
function he(e, t, n) {
	return e.wt.m12 * t + e.wt.m22 * n + e.wt.dy;
}
function R(e) {
	return e.winExtX === 0 ? 1 : e.vpExtX / e.winExtX;
}
function z(e) {
	return e.winExtY === 0 ? 1 : e.vpExtY / e.winExtY;
}
function B(e) {
	return Math.min(Math.abs(R(e)), Math.abs(z(e)));
}
function ge(e) {
	return e.mapMode === N.ISOTROPIC ? R(e) < 0 ? -B(e) : B(e) : R(e);
}
function V(e) {
	return e.mapMode === N.ISOTROPIC ? z(e) < 0 ? -B(e) : B(e) : z(e);
}
function _e(e, t) {
	return (t - e.winOrgX) * ge(e) + e.vpOrgX;
}
function ve(e, t) {
	return (t - e.winOrgY) * V(e) + e.vpOrgY;
}
function H(e, t, n) {
	let r = _e(e, me(e, t, n)), i = ve(e, he(e, t, n));
	return [(r - e.left) * e.W / e.boundsW, (i - e.top) * e.H / e.boundsH];
}
function ye(e) {
	return (Math.hypot(e.wt.m11, e.wt.m12) + Math.hypot(e.wt.m21, e.wt.m22)) / 2;
}
function be(e) {
	return (Math.abs(ge(e)) + Math.abs(V(e))) / 2;
}
function xe(e) {
	return (e.W / e.boundsW + e.H / e.boundsH) / 2;
}
function Se(e) {
	return Math.hypot(e.wt.m21, e.wt.m22);
}
function Ce(e) {
	return e.H / e.boundsH;
}
function U(e, t) {
	let n = t * ye(e) * be(e) * xe(e);
	return Math.max(.75, n);
}
function we(e, t) {
	if (e.mapMode = t, t === N.TEXT) {
		e.winOrgX = 0, e.winOrgY = 0, e.vpOrgX = 0, e.vpOrgY = 0, e.winExtX = 1, e.winExtY = 1, e.vpExtX = 1, e.vpExtY = 1;
		return;
	}
	if (t === N.ANISOTROPIC || t === N.ISOTROPIC || e.devPxPerMmX <= 0 || e.devPxPerMmY <= 0) return;
	let n = 25.4, r = t === N.LOMETRIC ? .1 : t === N.HIMETRIC ? .01 : t === N.LOENGLISH ? .01 * n : t === N.HIENGLISH ? .001 * n : t === N.TWIPS ? n / 1440 : 0;
	r <= 0 || (e.winOrgX = 0, e.winOrgY = 0, e.vpOrgX = 0, e.vpOrgY = 0, e.winExtX = 1, e.winExtY = 1, e.vpExtX = r * e.devPxPerMmX, e.vpExtY = -(r * e.devPxPerMmY));
}
var Te = {
	[M.WHITE_BRUSH]: {
		kind: "brush",
		fill: "#ffffff"
	},
	[M.LTGRAY_BRUSH]: {
		kind: "brush",
		fill: "#c0c0c0"
	},
	[M.GRAY_BRUSH]: {
		kind: "brush",
		fill: "#808080"
	},
	[M.DKGRAY_BRUSH]: {
		kind: "brush",
		fill: "#404040"
	},
	[M.BLACK_BRUSH]: {
		kind: "brush",
		fill: "#000000"
	},
	[M.NULL_BRUSH]: {
		kind: "brush",
		fill: null
	}
}, Ee = {
	[M.WHITE_PEN]: {
		kind: "pen",
		stroke: "#ffffff",
		width: 1
	},
	[M.BLACK_PEN]: {
		kind: "pen",
		stroke: "#000000",
		width: 1
	},
	[M.NULL_PEN]: {
		kind: "pen",
		stroke: null,
		width: 1
	},
	[M.DC_PEN]: {
		kind: "pen",
		stroke: "#000000",
		width: 1
	}
};
function De(e, t) {
	let n = Te[t];
	if (n) {
		e.curBrush = n;
		return;
	}
	let r = Ee[t];
	if (r) {
		e.curPen = r;
		return;
	}
	t === M.DC_BRUSH && (e.curBrush = e.curBrush ?? {
		kind: "brush",
		fill: "#000000"
	});
}
function Oe(e) {
	let t = 0, n = 0, r = 0, i = 0;
	for (let a = 0; a < e.data.length; a += 4) e.data[a + 3] !== 0 && (t += e.data[a], n += e.data[a + 1], r += e.data[a + 2], i++);
	if (i === 0) return "#808080";
	let a = (e) => Math.round(e / i).toString(16).padStart(2, "0");
	return `#${a(t)}${a(n)}${a(r)}`;
}
var W = (e) => [e.i16(), e.i16()], G = (e) => [e.i32(), e.i32()], ke = 1048576, Ae = 2097152, je = 65536, Me = 65536, Ne = 65536;
function K(e, t, n) {
	if (t <= ke) return !0;
	if (L(e, t, n) !== t) return !1;
	throw new d("metafile-record-points", ke, t);
}
function Pe(e, t, n) {
	if (t.remaining < 20) return;
	t.skip(16);
	let r = t.u32();
	if (r < 2 || !K(t, r, n) || !e.inPath && (!e.curPen || e.curPen.stroke == null)) return;
	let { ctx: i } = e, a = P(e), o = I(e, L(t, r, n));
	e.inPath || i.beginPath();
	let s = 0, c = 0;
	for (let i = 0, l = L(t, r, n); i < l; i++) {
		let [r, l] = n(t), [u, d] = H(e, r, l);
		o && (i === 0 ? a.moveTo(u, d) : a.lineTo(u, d)), s = r, c = l;
	}
	!e.inPath && e.curPen?.stroke != null && (i.strokeStyle = e.curPen.stroke, i.lineWidth = U(e, e.curPen.width), i.stroke(), e.drew = !0), e.curX = s, e.curY = c;
}
function Fe(e, t, n) {
	if (t.remaining < 20) return;
	t.skip(16);
	let r = t.u32();
	if (r < 1 || !K(t, r, n)) return;
	let { ctx: i } = e, a = e.inPath || e.curPen != null && e.curPen.stroke != null, o = !e.inPath || I(e, L(t, r, n));
	if (a && !e.inPath) {
		i.beginPath();
		let [t, n] = H(e, e.curX, e.curY);
		i.moveTo(t, n);
	}
	for (let i = 0, s = L(t, r, n); i < s; i++) {
		let [r, i] = n(t);
		if (a && o) {
			let [t, n] = H(e, r, i);
			P(e).lineTo(t, n);
		}
		e.curX = r, e.curY = i;
	}
	a && !e.inPath && e.curPen && (i.strokeStyle = e.curPen.stroke, i.lineWidth = U(e, e.curPen.width), i.stroke(), e.drew = !0);
}
function Ie(e, t, n) {
	if (t.remaining < 20) return;
	t.skip(16);
	let r = t.u32();
	if (r < 2 || !K(t, r, n)) return;
	let { ctx: i } = e, a = P(e), o = L(t, r, n), s = I(e, o > 0 ? o + 1 : 0);
	e.inPath || i.beginPath();
	let c = !1;
	for (let i = 0, o = L(t, r, n); i < o; i++) {
		let [r, i] = n(t), [o, l] = H(e, r, i);
		c ? s && a.lineTo(o, l) : (s && a.moveTo(o, l), c = !0);
	}
	c && (s && a.closePath(), !e.inPath && (e.curBrush && e.curBrush.fill != null && (i.fillStyle = e.curBrush.fill, i.fill(e.fillRule), e.drew = !0), e.curPen && e.curPen.stroke != null && (i.strokeStyle = e.curPen.stroke, i.lineWidth = U(e, e.curPen.width), i.stroke(), e.drew = !0)));
}
function q(e, t, n, r) {
	if (t.remaining < 20) return;
	t.skip(16);
	let i = t.u32();
	if (i < 1 || !K(t, i, n)) return;
	let a = L(t, i, n), o = +!r, s = a < o + 3 ? 0 : o + Math.floor((a - o) / 3), c = !e.inPath || I(e, s);
	if (e.inPath && !c) {
		for (let r = 0; r < a; r++) {
			let [r, i] = n(t);
			e.curX = r, e.curY = i;
		}
		return;
	}
	let l = [];
	for (let e = 0, r = L(t, i, n); e < r; e++) l.push(n(t));
	if (l.length < (r ? 3 : 4)) {
		l.length && (e.curX = l[l.length - 1][0], e.curY = l[l.length - 1][1]);
		return;
	}
	let u = e.inPath || e.curPen != null && e.curPen.stroke != null, { ctx: d } = e, f = P(e);
	if (u) {
		e.inPath || d.beginPath();
		let t = r ? H(e, e.curX, e.curY) : H(e, l[0][0], l[0][1]);
		(!r || !e.inPath) && f.moveTo(t[0], t[1]);
	}
	let p = +!r;
	for (; p + 2 < l.length + +!!r; p += 3) {
		let t = l[p], n = l[p + 1], r = l[p + 2];
		if (!t || !n || !r) break;
		if (u) {
			let i = H(e, t[0], t[1]), a = H(e, n[0], n[1]), o = H(e, r[0], r[1]);
			f.bezierCurveTo(i[0], i[1], a[0], a[1], o[0], o[1]);
		}
		e.curX = r[0], e.curY = r[1];
	}
	u && !e.inPath && e.curPen && (d.strokeStyle = e.curPen.stroke, d.lineWidth = U(e, e.curPen.width), d.stroke(), e.drew = !0);
}
function J(e, t, n, r) {
	if (t.remaining < 24) return;
	t.skip(16);
	let i = t.u32(), a = t.u32();
	if (i === 0 || i > Math.floor(t.remaining / 4)) return;
	let o = t.pos, s = 0;
	for (let e = 0; e < i; e++) if (s += t.u32(), s > a) return;
	if (s !== a) return;
	let c = L(t, a, n);
	if (i > je || a > Ae) {
		if (c !== a) return;
		throw i > je ? new d("metafile-record-polygons", je, i) : new d("metafile-record-points", Ae, a);
	}
	if (a === 0) return;
	let l = t.pos;
	t.pos = o;
	let u = [], f = c, p = 0;
	for (let e = 0; e < i; e++) {
		let e = t.u32(), n = Math.min(e, f);
		f -= n, u.push(e), e >= 2 && n > 0 && (p += n + +!!r);
	}
	t.pos = l;
	let { ctx: m } = e, h = I(e, p), g = P(e);
	e.inPath || m.beginPath();
	let _ = !1;
	for (let i of u) {
		let a = L(t, i, n);
		if (i < 2 || a === 0) {
			for (let e = 0; e < a; e++) n(t);
			continue;
		}
		for (let r = 0; r < a; r++) {
			let [i, a] = n(t);
			if (h) {
				let [t, n] = H(e, i, a);
				r === 0 ? g.moveTo(t, n) : g.lineTo(t, n);
			}
		}
		r && h && g.closePath(), _ = !0;
	}
	!_ || e.inPath || (r && e.curBrush && e.curBrush.fill != null && (m.fillStyle = e.curBrush.fill, m.fill(e.fillRule), e.drew = !0), e.curPen && e.curPen.stroke != null && (m.strokeStyle = e.curPen.stroke, m.lineWidth = U(e, e.curPen.width), m.stroke(), e.drew = !0));
}
function Le(e, t, n, r, i) {
	let { ctx: a } = e, o = H(e, t, n), s = H(e, r, n), c = H(e, r, i), l = H(e, t, i), u = P(e), d = I(e, 5);
	e.inPath || a.beginPath(), d && (u.moveTo(o[0], o[1]), u.lineTo(s[0], s[1]), u.lineTo(c[0], c[1]), u.lineTo(l[0], l[1]), u.closePath()), !e.inPath && (e.curBrush && e.curBrush.fill != null && (a.fillStyle = e.curBrush.fill, a.fill(e.fillRule), e.drew = !0), e.curPen && e.curPen.stroke != null && (a.strokeStyle = e.curPen.stroke, a.lineWidth = U(e, e.curPen.width), a.stroke(), e.drew = !0));
}
function Re(e, t, n) {
	if (!e.pathHeld) return;
	let r = !e.pathDiscarded, i = e.path.buf.ops;
	if (r && fe(e.ctx, i), F(e), !r) return;
	let { ctx: a } = e;
	t && e.curBrush?.fill != null && (a.fillStyle = e.curBrush.fill, a.fill(e.fillRule), e.drew = !0), n && e.curPen?.stroke != null && (a.strokeStyle = e.curPen.stroke, a.lineWidth = U(e, e.curPen.width), a.stroke(), e.drew = !0), a.beginPath();
}
function Y(e, t, n, r, i, a) {
	let o = Math.max(1, Math.ceil(Math.abs(a) / (Math.PI / 2) - 1e-9)), s = a / o, c = 4 / 3 * Math.tan(s / 4), l = (i) => [e + n * Math.cos(i), t + r * Math.sin(i)], u = [];
	for (let e = 0; e < o; e++) {
		let t = i + e * s, a = t + s, [o, d] = l(t), [f, p] = l(a);
		u.push([
			[o - c * n * Math.sin(t), d + c * r * Math.cos(t)],
			[f + c * n * Math.sin(a), p - c * r * Math.cos(a)],
			[f, p]
		]);
	}
	return {
		start: l(i),
		curves: u,
		end: l(i + a)
	};
}
function ze(e, t, n) {
	let r = t - e;
	if (n === k) {
		for (; r <= 0;) r += 2 * Math.PI;
		for (; r > 2 * Math.PI;) r -= 2 * Math.PI;
	} else {
		for (; r >= 0;) r -= 2 * Math.PI;
		for (; r < -2 * Math.PI;) r += 2 * Math.PI;
	}
	return r;
}
function Be(e, t, n, r) {
	let [i, a, o, s] = e, c = Math.abs(o - i) / 2, l = Math.abs(s - a) / 2;
	if (c === 0 || l === 0) return null;
	let u = (i + o) / 2, d = (a + s) / 2, f = Math.atan2((t[1] - d) / l, (t[0] - u) / c);
	return {
		...Y(u, d, c, l, f, ze(f, Math.atan2((n[1] - d) / l, (n[0] - u) / c), r)),
		center: [u, d]
	};
}
function X(e) {
	let [t, n] = H(e, 0, 0), [r, i] = H(e, 1, 0), [a, o] = H(e, 0, 1);
	return (r - t) * (o - n) - (i - n) * (a - t) < 0;
}
function Z(e, t, n) {
	for (let [r, i, a] of n.curves) {
		let n = H(e, r[0], r[1]), o = H(e, i[0], i[1]), s = H(e, a[0], a[1]);
		t.bezierCurveTo(n[0], n[1], o[0], o[1], s[0], s[1]);
	}
}
function Ve(e, t) {
	let { ctx: n } = e;
	t && e.curBrush && e.curBrush.fill != null && (n.fillStyle = e.curBrush.fill, n.fill(e.fillRule), e.drew = !0), e.curPen && e.curPen.stroke != null && (n.strokeStyle = e.curPen.stroke, n.lineWidth = U(e, e.curPen.width), n.stroke(), e.drew = !0);
}
function Q(e, t) {
	e.unsupported.add(t);
}
function $(e, t, n, r) {
	let i = [
		t.i32(),
		t.i32(),
		t.i32(),
		t.i32()
	], a = [t.i32(), t.i32()], o = [t.i32(), t.i32()];
	if (X(e)) {
		Q(e, `${r} (reflected mapping)`);
		return;
	}
	let s = Be(i, a, o, e.arcDirection);
	if (!s) return;
	let c = n === "pie" ? 3 : n === "chord" ? 2 : 1;
	if (!I(e, s.curves.length + c)) return;
	let { ctx: l } = e, u = P(e), d = H(e, s.start[0], s.start[1]);
	e.inPath || l.beginPath(), n === "arcTo" ? (e.inPath || l.moveTo(...H(e, e.curX, e.curY)), u.lineTo(d[0], d[1])) : n === "pie" ? (u.moveTo(...H(e, s.center[0], s.center[1])), u.lineTo(d[0], d[1])) : u.moveTo(d[0], d[1]), Z(e, u, s), (n === "chord" || n === "pie") && u.closePath(), n === "arcTo" && (e.curX = s.end[0], e.curY = s.end[1]), e.inPath || Ve(e, n === "chord" || n === "pie");
}
function He(e, t) {
	let n = t.i32(), r = t.i32(), i = t.u32(), a = t.f32(), o = t.f32();
	if (!Number.isFinite(a) || !Number.isFinite(o)) return;
	if (X(e)) {
		Q(e, "EMR_ANGLEARC (reflected mapping)");
		return;
	}
	if (e.inPath && Math.abs(o) > 360) {
		Q(e, "EMR_ANGLEARC (multiple sweeps in a path)");
		return;
	}
	let s = Math.max(-360, Math.min(360, o)), c = Y(n, r, i, i, -a * Math.PI / 180, -s * Math.PI / 180);
	if (!I(e, (s === 0 ? 0 : c.curves.length) + 1)) return;
	let { ctx: l } = e, u = P(e), d = H(e, c.start[0], c.start[1]);
	e.inPath || (l.beginPath(), l.moveTo(...H(e, e.curX, e.curY))), u.lineTo(d[0], d[1]), s !== 0 && Z(e, u, c), e.curX = c.end[0], e.curY = c.end[1], e.inPath || Ve(e, !1);
}
function Ue(e, t) {
	let n = t.i32(), r = t.i32(), i = t.i32(), a = t.i32(), o = t.i32(), s = t.i32();
	if (X(e)) {
		Q(e, "EMR_ROUNDRECT (reflected mapping)");
		return;
	}
	let [c, l] = n <= i ? [n, i] : [i, n], [u, d] = r <= a ? [r, a] : [a, r], f = Math.min(Math.abs(o) / 2, (l - c) / 2), p = Math.min(Math.abs(s) / 2, (d - u) / 2), m = f > 0 && p > 0;
	if (!I(e, m ? 9 : 5)) return;
	let { ctx: h } = e, g = P(e);
	e.inPath || h.beginPath();
	let _ = e.arcDirection === k, v = [
		[
			l - f,
			u + p,
			-Math.PI / 2
		],
		[
			l - f,
			d - p,
			0
		],
		[
			c + f,
			d - p,
			Math.PI / 2
		],
		[
			c + f,
			u + p,
			Math.PI
		]
	];
	(_ ? v : [...v].reverse()).forEach(([t, n, r], i) => {
		let a = _ ? Y(t, n, f, p, r, Math.PI / 2) : Y(t, n, f, p, r + Math.PI / 2, -Math.PI / 2), o = H(e, a.start[0], a.start[1]);
		i === 0 ? g.moveTo(o[0], o[1]) : g.lineTo(o[0], o[1]), m && Z(e, g, a);
	}), g.closePath(), e.inPath || Ve(e, !0);
}
function We(e, t, n) {
	let r = t.i32(), i = t.i32(), a = t.i32(), o = t.i32(), s = [
		H(e, r, i),
		H(e, a, i),
		H(e, a, o),
		H(e, r, o)
	];
	Ge(e, n ? "evenodd" : "nonzero", (e) => {
		n && Ye(e), e.moveTo(...s[0]);
		for (let t of s.slice(1)) e.lineTo(...t);
		e.closePath();
	});
}
function Ge(e, t, n) {
	e.ctx.beginPath(), n(e.ctx), Ke(e, t);
}
function Ke(e, t) {
	try {
		e.ctx.clip(t), e.clipped = !0;
	} catch {}
}
function qe(e, t) {
	return e.clipped ? e.outerClipped ? (e.unsupported.add(`${t} (reset of an inherited clip)`), !1) : (e.ctx.restore(), e.ctx.save(), e.clipped = !1, !0) : !0;
}
function Je(e, t) {
	let n = t.u32(), r = t.u32(), i = "EMR_EXTSELECTCLIPRGN";
	if (r === j && n === 0) {
		qe(e, i);
		return;
	}
	if (n < 32 || t.remaining < n) throw RangeError("Truncated EMF region");
	t.u32(), t.u32();
	let a = t.u32();
	if (t.u32(), t.skip(16), a > Math.floor((n - 32) / 16)) throw RangeError("Invalid EMF region");
	if (a > Me) throw new d("metafile-record-rectangles", Me, a);
	if (r !== A && r !== j && r !== ee) {
		e.unsupported.add(`${i} (mode ${r})`);
		return;
	}
	if (r === j && !qe(e, i)) return;
	let o = (t, n) => [(t - e.left) * e.W / e.boundsW, (n - e.top) * e.H / e.boundsH], s = [];
	for (let e = 0; e < a; e++) s.push([
		t.i32(),
		t.i32(),
		t.i32(),
		t.i32()
	]);
	let c = (e, [t, n, r, i]) => {
		e.moveTo(...o(t, n)), e.lineTo(...o(r, n)), e.lineTo(...o(r, i)), e.lineTo(...o(t, i)), e.closePath();
	};
	if (r === ee) {
		for (let t of s) Ge(e, "evenodd", (e) => {
			Ye(e), c(e, t);
		});
		return;
	}
	Ge(e, "nonzero", (e) => {
		for (let t of s) c(e, t);
	});
}
function Ye(e) {
	e.moveTo(-1e7, -1e7), e.lineTo(1e7, -1e7), e.lineTo(1e7, 1e7), e.lineTo(-1e7, 1e7), e.closePath();
}
function Xe(e) {
	let t = e.u32(), n = e.u32(), r = e.i32();
	e.i32();
	let i = e.u32();
	return [t, {
		kind: "pen",
		stroke: (n & 255) == 5 ? null : o(i),
		width: Math.abs(r)
	}];
}
function Ze(e) {
	let t = e.u32();
	e.skip(16);
	let n = e.u32(), r = e.u32();
	e.u32();
	let i = e.u32();
	return [t, {
		kind: "pen",
		stroke: (n & 255) == 5 ? null : o(i),
		width: Math.abs(r)
	}];
}
function Qe(e) {
	let t = e.u32(), n = e.u32(), r = e.u32();
	return e.u32(), [t, {
		kind: "brush",
		fill: n === 1 ? null : o(r)
	}];
}
function $e(e, t, n, i, a, o, s) {
	let c = e.pos - n;
	return i < c || o < c ? null : r(t, n + i, a, n + o, s);
}
function et(e, t, n) {
	let r = e.u32();
	e.u32();
	let i = e.u32(), a = e.u32(), o = e.u32(), c = e.u32(), l = "#808080";
	try {
		let r = $e(e, t, n, i, a, o, c);
		r && (l = Oe(r));
	} catch (e) {
		if (s(e)) throw e;
	}
	return [r, {
		kind: "brush",
		fill: l
	}];
}
function tt(e, t, n) {
	if (e.remaining < 96) throw RangeError("Truncated EMF LOGFONTW");
	let r = e.u32(), i = n + 12, a = t.getInt32(i, !0), o = t.getInt32(i + 8, !0), s = t.getInt32(i + 16, !0), c = t.getUint8(i + 20), l = t.getUint8(i + 23), u = "";
	for (let e = 0; e < 32; e++) {
		let n = i + 28 + e * 2;
		if (n + 2 > t.byteLength) break;
		let r = t.getUint16(n, !0);
		if (r === 0) break;
		u += String.fromCharCode(r);
	}
	return [r, {
		kind: "font",
		charset: l,
		height: Math.abs(a),
		weight: s,
		italic: c !== 0,
		face: u,
		escapement: o
	}];
}
function nt(e, n, r, a) {
	let o = n.pos + n.remaining;
	if (n.remaining < 48) throw RangeError("Truncated EMF text record");
	n.skip(16), n.u32(), n.f32(), n.f32();
	let s = n.i32(), c = n.i32(), l = n.u32(), u = n.u32(), f = n.u32(), p = f & 256 ? 60 : 76;
	if (a + p > o) throw RangeError("Truncated EMF text header");
	if (l === 0) return;
	if (u < p || a + u + l * 2 > o) throw RangeError("Truncated EMF text string");
	if (l > Ne) throw new d("metafile-record-text-units", Ne, l);
	let m = "";
	for (let e = 0; e < l; e++) {
		let t = a + u + e * 2;
		if (t + 2 > r.byteLength) break;
		m += String.fromCharCode(r.getUint16(t, !0));
	}
	if (m.length === 0) return;
	let h = e.curFont, g = !1;
	if (h?.charset === 2 && /[\uf000-\uf0ff]/.test(m)) {
		let t = f === 0 ? i(m, h.face, !0) : null;
		t === null ? Q(e, "EMR_EXTTEXTOUTW (unsupported symbol encoding)") : (m = t, g = !0), g && l > 1 && r.getUint32(a + p - 4, !0) !== 0 && Q(e, "EMR_EXTTEXTOUTW (symbol character advances)");
	}
	let _ = Math.abs(h?.height ?? 0) * Se(e) * Math.abs(V(e)) * Ce(e);
	if (!Number.isFinite(_) || _ < 1) return;
	let { ctx: v } = e, [y, b] = H(e, s, c);
	v.fillStyle = e.textColor;
	let x = h && h.weight >= 700 ? "bold " : "";
	v.font = `${h?.italic ? "italic " : ""}${x}${_}px ${g ? "serif" : h?.face ? t(h.face, e.fontFamilies) : "sans-serif"}`;
	let S = e.textAlign & 6;
	v.textAlign = S === 2 ? "right" : S === 6 ? "center" : "left", v.textBaseline = (e.textAlign & 24) == 24 ? "alphabetic" : "top";
	let C = h?.escapement ?? 0;
	try {
		if (C !== 0) {
			v.save();
			try {
				v.translate(y, b), v.rotate(-C / 10 * (Math.PI / 180)), v.fillText(m, 0, 0);
			} finally {
				v.restore();
			}
		} else v.fillText(m, y, b);
		e.drew = !0;
	} catch {}
}
function rt(t, n, r, i, a, o, s, c, l, u, d, f) {
	if (o === 0 || c === 0) return;
	let p = $e(n, r, i, a, o, s, c);
	if (!p) {
		t.unsupported.add("EMF bitmap (DIB encoding)");
		return;
	}
	let [m, h] = H(t, l, u), [g, _] = H(t, d, f);
	e(t.ctx, p, m, h, g, _) && (t.drew = !0);
}
function it(e, t, n, r) {
	t.skip(16);
	let i = t.i32(), a = t.i32(), o = t.i32(), s = t.i32(), c = t.u32();
	t.i32(), t.i32(), t.skip(24), t.u32(), t.u32();
	let l = t.u32(), u = t.u32(), d = t.u32(), f = t.u32();
	if (u === 0 || f === 0) {
		if (c === 11141161) return;
		let t = c === 15728673 ? e.curBrush?.fill ?? null : c === 66 ? "#000000" : c === 16711778 ? "#ffffff" : void 0;
		if (t === void 0) {
			e.unsupported.add(`EMR_BITBLT (raster operation 0x${c.toString(16)})`);
			return;
		}
		if (t === null) return;
		let n = [
			H(e, i, a),
			H(e, i + o, a),
			H(e, i + o, a + s),
			H(e, i, a + s)
		];
		e.ctx.beginPath(), e.ctx.moveTo(...n[0]);
		for (let t of n.slice(1)) e.ctx.lineTo(...t);
		e.ctx.closePath(), e.ctx.fillStyle = t, e.ctx.fill("nonzero"), e.drew = !0;
		return;
	}
	rt(e, t, n, r, l, u, d, f, i, a, i + o, a + s);
}
function at(e, t, n, r) {
	t.skip(16);
	let i = t.i32(), a = t.i32();
	t.i32(), t.i32(), t.i32(), t.i32();
	let o = t.u32(), s = t.u32(), c = t.u32(), l = t.u32();
	t.u32(), t.u32();
	let u = t.i32(), d = t.i32();
	rt(e, t, n, r, o, s, c, l, i, a, i + u, a + d);
}
function ot(e, t, n, r, i = {}) {
	let o = i;
	if (!a(e) || n <= 0 || r <= 0) return !1;
	let s = new DataView(e.buffer, e.byteOffset, e.byteLength), c = () => ({
		ctx: t,
		W: n,
		H: r,
		left: 0,
		top: 0,
		boundsW: n,
		boundsH: r,
		wt: te(),
		mapMode: N.TEXT,
		winOrgX: 0,
		winOrgY: 0,
		winExtX: 1,
		winExtY: 1,
		vpOrgX: 0,
		vpOrgY: 0,
		vpExtX: 1,
		vpExtY: 1,
		devPxPerMmX: 0,
		devPxPerMmY: 0,
		objects: /* @__PURE__ */ new Map(),
		curPen: null,
		curBrush: null,
		curFont: null,
		...i.fontFamilies ? { fontFamilies: i.fontFamilies } : {},
		textColor: "#000000",
		bkMode: 1,
		textAlign: 0,
		fillRule: "nonzero",
		curX: 0,
		curY: 0,
		stack: [],
		drew: !1,
		path: new ae(),
		inPath: !1,
		pathHeld: !1,
		pathDiscarded: !1,
		pathRetained: 0,
		maxPathCommands: Number.isSafeInteger(o.maxPathCommands) && o.maxPathCommands > 0 ? Math.min(o.maxPathCommands, ie) : ie,
		arcDirection: O,
		clipped: !1,
		outerClipped: !1,
		unsupported: /* @__PURE__ */ new Set()
	}), l = S(e), u = c();
	if (l.play) {
		let i = new T(u);
		if (st(u, i, l.dual, s, e), i.drawFailed && l.dual) {
			let i = [...u.unsupported];
			try {
				t.clearRect(0, 0, n, r);
			} catch {}
			u = c(), st(u, null, !1, s, e);
			for (let e of i) u.unsupported.add(e);
		}
	} else {
		if (!l.dual) for (let e of l.failures) u.unsupported.add(e);
		st(u, null, !1, s, e);
	}
	return u.unsupported.size > 0 && i.onUnsupported?.([...u.unsupported]), u.drew;
}
function st(e, t, n, r, i) {
	let a = e.ctx;
	a.save();
	try {
		ct(e, t, n, r, i);
	} finally {
		for (let t = 0; t <= e.stack.length; t++) a.restore();
	}
}
function ct(e, t, n, r, i) {
	let a = e.ctx, c = 0;
	for (; c + 8 <= i.length;) {
		let l = r.getUint32(c, !0), u = r.getUint32(c + 4, !0);
		if (u < 8 || u & 3 || c + u > i.length) {
			e.unsupported.add("EMF record stream (truncated or invalid record size)");
			break;
		}
		let d = c + u;
		if (l === E.EOF) break;
		let f = new DataView(r.buffer, r.byteOffset, d), p = new re(f, c + 8, d);
		if (t && l !== E.HEADER) {
			if (l === E.GDICOMMENT) {
				if (t.playComment(f, c, d), n && t.drawFailed) break;
				c = d;
				continue;
			}
			if (!t.gdiAllowed) {
				c = d;
				continue;
			}
		}
		try {
			switch (l) {
				case E.HEADER: {
					let t = p.i32(), n = p.i32(), r = p.i32(), i = p.i32();
					if (e.left = t, e.top = n, e.boundsW = Math.max(1, r - t), e.boundsH = Math.max(1, i - n), d >= c + 88) {
						let t = f.getInt32(c + 24, !0), n = f.getInt32(c + 28, !0), r = f.getInt32(c + 32, !0), i = f.getInt32(c + 36, !0), a = f.getInt32(c + 72, !0), o = f.getInt32(c + 76, !0), s = f.getInt32(c + 80, !0), l = f.getInt32(c + 84, !0), u = r - t, d = i - n;
						if (u > 0 && d > 0 && a > 0 && o > 0 && s > 0 && l > 0) {
							let r = a / (s * 100), i = o / (l * 100);
							e.left = t * r, e.top = n * i, e.boundsW = Math.max(1, u * r), e.boundsH = Math.max(1, d * i), e.devPxPerMmX = a / s, e.devPxPerMmY = o / l;
						}
					}
					break;
				}
				case E.SETWORLDTRANSFORM:
					e.wt = p.xform();
					break;
				case E.MODIFYWORLDTRANSFORM: {
					let t = p.xform(), n = p.u32();
					n === 1 ? e.wt = te() : n === 2 ? e.wt = ne(t, e.wt) : n === 3 ? e.wt = ne(e.wt, t) : n === 4 && (e.wt = t);
					break;
				}
				case E.SETMAPMODE:
					we(e, p.u32());
					break;
				case E.SETWINDOWORGEX: {
					let t = p.i32(), n = p.i32();
					e.winOrgX = t, e.winOrgY = n;
					break;
				}
				case E.SETWINDOWEXTEX: {
					let t = p.i32(), n = p.i32();
					t !== 0 && (e.winExtX = t), n !== 0 && (e.winExtY = n);
					break;
				}
				case E.SETVIEWPORTORGEX: {
					let t = p.i32(), n = p.i32();
					e.vpOrgX = t, e.vpOrgY = n;
					break;
				}
				case E.SETVIEWPORTEXTEX: {
					let t = p.i32(), n = p.i32();
					t !== 0 && (e.vpExtX = t), n !== 0 && (e.vpExtY = n);
					break;
				}
				case E.SCALEWINDOWEXTEX: {
					let t = p.i32(), n = p.i32(), r = p.i32(), i = p.i32();
					n !== 0 && (e.winExtX = e.winExtX * t / n), i !== 0 && (e.winExtY = e.winExtY * r / i);
					break;
				}
				case E.SCALEVIEWPORTEXTEX: {
					let t = p.i32(), n = p.i32(), r = p.i32(), i = p.i32();
					n !== 0 && (e.vpExtX = e.vpExtX * t / n), i !== 0 && (e.vpExtY = e.vpExtY * r / i);
					break;
				}
				case E.SAVEDC:
					e.ctx.save(), e.stack.push({
						wt: { ...e.wt },
						mapMode: e.mapMode,
						winOrgX: e.winOrgX,
						winOrgY: e.winOrgY,
						winExtX: e.winExtX,
						winExtY: e.winExtY,
						vpOrgX: e.vpOrgX,
						vpOrgY: e.vpOrgY,
						vpExtX: e.vpExtX,
						vpExtY: e.vpExtY,
						curPen: e.curPen,
						curBrush: e.curBrush,
						curFont: e.curFont,
						textColor: e.textColor,
						bkMode: e.bkMode,
						textAlign: e.textAlign,
						fillRule: e.fillRule,
						curX: e.curX,
						curY: e.curY,
						arcDirection: e.arcDirection,
						clipped: e.clipped,
						outerClipped: e.outerClipped,
						pathBuf: e.path.buf,
						pathLength: e.path.buf.ops.length,
						pathCommands: e.path.buf.commands,
						inPath: e.inPath,
						pathHeld: e.pathHeld,
						pathDiscarded: e.pathDiscarded
					}), e.path.buf.saved.push({
						length: e.path.buf.ops.length,
						commands: e.path.buf.commands
					}), e.outerClipped = e.clipped;
					break;
				case E.RESTOREDC: {
					let t = p.i32(), n = Math.min(Math.abs(t) || 1, e.stack.length), r, i = /* @__PURE__ */ new Set();
					for (let t = 0; t < n; t++) r = e.stack.pop(), e.ctx.restore(), r && (r.pathBuf.saved.pop(), i.add(r.pathBuf));
					if (r) {
						e.wt = r.wt, e.mapMode = r.mapMode, e.winOrgX = r.winOrgX, e.winOrgY = r.winOrgY, e.winExtX = r.winExtX, e.winExtY = r.winExtY, e.vpOrgX = r.vpOrgX, e.vpOrgY = r.vpOrgY, e.vpExtX = r.vpExtX, e.vpExtY = r.vpExtY, e.curPen = r.curPen, e.curBrush = r.curBrush, e.curFont = r.curFont, e.textColor = r.textColor, e.bkMode = r.bkMode, e.textAlign = r.textAlign, e.fillRule = r.fillRule, e.curX = r.curX, e.curY = r.curY, e.arcDirection = r.arcDirection, e.clipped = r.clipped, e.outerClipped = r.outerClipped, i.add(e.path.buf);
						let t = r.pathBuf;
						e.path.buf = t, i.delete(t), e.pathRetained -= t.commands - r.pathCommands, t.commands = r.pathCommands, t.ops.length = r.pathLength;
						for (let t of i) se(e, t);
						e.inPath = r.inPath, e.pathHeld = r.pathHeld, e.pathDiscarded = r.pathDiscarded;
					}
					break;
				}
				case E.BEGINPATH:
					F(e), e.inPath = !0;
					break;
				case E.CLOSEFIGURE:
					e.inPath && I(e, 1) && e.path.closePath();
					break;
				case E.ENDPATH:
					e.inPath && (e.pathHeld = !0), e.inPath = !1;
					break;
				case E.FILLPATH:
					Re(e, !0, !1);
					break;
				case E.STROKEANDFILLPATH:
					Re(e, !0, !0);
					break;
				case E.STROKEPATH:
					Re(e, !1, !0);
					break;
				case E.ABORTPATH:
					F(e);
					break;
				case E.FLATTENPATH: break;
				case E.WIDENPATH:
					e.pathHeld && e.unsupported.add("EMR_WIDENPATH");
					break;
				case E.SELECTCLIPPATH: {
					let t = p.remaining >= 4 ? p.u32() : A;
					if (!e.pathHeld) break;
					t !== A && t !== j ? e.unsupported.add(`EMR_SELECTCLIPPATH (mode ${t})`) : t === j && qe(e, "EMR_SELECTCLIPPATH"), e.pathDiscarded || (fe(e.ctx, e.path.buf.ops), Ke(e, e.fillRule)), F(e);
					break;
				}
				case E.INTERSECTCLIPRECT:
					We(e, p, !1);
					break;
				case E.EXCLUDECLIPRECT:
					We(e, p, !0);
					break;
				case E.EXTSELECTCLIPRGN:
					Je(e, p);
					break;
				case E.OFFSETCLIPRGN:
					e.clipped && e.unsupported.add("EMR_OFFSETCLIPRGN");
					break;
				case E.SETARCDIRECTION: {
					let t = p.u32();
					(t === O || t === k) && (e.arcDirection = t);
					break;
				}
				case E.GDICOMMENT: break;
				case E.SELECTOBJECT: {
					let t = p.u32();
					if (t & 2147483648) De(e, t >>> 0);
					else {
						let n = e.objects.get(t);
						n?.kind === "pen" ? e.curPen = n : n?.kind === "brush" ? e.curBrush = n : n?.kind === "font" && (e.curFont = n);
					}
					break;
				}
				case E.DELETEOBJECT: {
					let t = p.u32(), n = e.objects.get(t);
					n && (n === e.curPen && (e.curPen = null), n === e.curBrush && (e.curBrush = null), n === e.curFont && (e.curFont = null), e.objects.delete(t));
					break;
				}
				case E.CREATEPEN: {
					let [t, n] = Xe(p);
					e.objects.set(t, n);
					break;
				}
				case E.EXTCREATEPEN: {
					let [t, n] = Ze(p);
					e.objects.set(t, n);
					break;
				}
				case E.CREATEBRUSHINDIRECT: {
					let [t, n] = Qe(p);
					e.objects.set(t, n);
					break;
				}
				case E.CREATEMONOBRUSH:
				case E.CREATEDIBPATTERNBRUSHPT: {
					let [t, n] = et(p, f, c);
					e.objects.set(t, n);
					break;
				}
				case E.EXTCREATEFONTINDIRECTW: {
					let [t, n] = tt(p, f, c);
					e.objects.set(t, n);
					break;
				}
				case E.POLYLINE16:
					Pe(e, p, W);
					break;
				case E.POLYLINE:
					Pe(e, p, G);
					break;
				case E.POLYLINETO16:
					Fe(e, p, W);
					break;
				case E.POLYLINETO:
					Fe(e, p, G);
					break;
				case E.POLYGON16:
					Ie(e, p, W);
					break;
				case E.POLYGON:
					Ie(e, p, G);
					break;
				case E.POLYBEZIER16:
					q(e, p, W, !1);
					break;
				case E.POLYBEZIER:
					q(e, p, G, !1);
					break;
				case E.POLYBEZIERTO16:
					q(e, p, W, !0);
					break;
				case E.POLYBEZIERTO:
					q(e, p, G, !0);
					break;
				case E.POLYPOLYGON16:
					J(e, p, W, !0);
					break;
				case E.POLYPOLYGON:
					J(e, p, G, !0);
					break;
				case E.POLYPOLYLINE16:
					J(e, p, W, !1);
					break;
				case E.POLYPOLYLINE:
					J(e, p, G, !1);
					break;
				case E.MOVETOEX: {
					let t = p.i32(), n = p.i32();
					if (e.curX = t, e.curY = n, e.inPath && I(e, 1)) {
						let [t, n] = H(e, e.curX, e.curY);
						e.path.moveTo(t, n);
					}
					break;
				}
				case E.LINETO: {
					let t = p.i32(), n = p.i32();
					if (e.inPath) I(e, 1) && e.path.lineTo(...H(e, t, n));
					else if (e.curPen && e.curPen.stroke != null) {
						let [r, i] = H(e, e.curX, e.curY), [a, o] = H(e, t, n);
						e.ctx.beginPath(), e.ctx.moveTo(r, i), e.ctx.lineTo(a, o), e.ctx.strokeStyle = e.curPen.stroke, e.ctx.lineWidth = U(e, e.curPen.width), e.ctx.stroke(), e.drew = !0;
					}
					e.curX = t, e.curY = n;
					break;
				}
				case E.RECTANGLE:
					Le(e, p.i32(), p.i32(), p.i32(), p.i32());
					break;
				case E.ELLIPSE: {
					let t = p.i32(), n = p.i32(), r = p.i32(), i = p.i32();
					if (e.inPath) {
						if (X(e)) {
							Q(e, "EMR_ELLIPSE (reflected mapping)");
							break;
						}
						let a = Math.abs(r - t) / 2, o = Math.abs(i - n) / 2;
						if (a === 0 || o === 0) break;
						let s = e.arcDirection === k ? 2 * Math.PI : -2 * Math.PI, c = Y((t + r) / 2, (n + i) / 2, a, o, 0, s);
						if (!I(e, c.curves.length + 2)) break;
						e.path.moveTo(...H(e, c.start[0], c.start[1])), Z(e, e.path, c), e.path.closePath();
						break;
					}
					let [o, s] = [(t + r) / 2, (n + i) / 2], [c, l] = H(e, o, s), [u] = H(e, r, s), [, d] = H(e, o, i), f = Math.abs(u - c), m = Math.abs(d - l);
					a.beginPath(), a.ellipse(c, l, f, m, 0, 0, Math.PI * 2), e.curBrush && e.curBrush.fill != null && (a.fillStyle = e.curBrush.fill, a.fill(e.fillRule), e.drew = !0), e.curPen && e.curPen.stroke != null && (a.strokeStyle = e.curPen.stroke, a.lineWidth = U(e, e.curPen.width), a.stroke(), e.drew = !0);
					break;
				}
				case E.SETPOLYFILLMODE:
					e.fillRule = p.u32() === 1 ? "evenodd" : "nonzero";
					break;
				case E.SETTEXTCOLOR:
					e.textColor = o(p.u32());
					break;
				case E.SETTEXTALIGN:
					e.textAlign = p.u32();
					break;
				case E.SETBKMODE:
					e.bkMode = p.u32();
					break;
				case E.EXTTEXTOUTW:
					e.inPath && Q(e, "EMR_EXTTEXTOUTW (glyph path)"), nt(e, p, f, c);
					break;
				case E.BITBLT:
					it(e, p, f, c);
					break;
				case E.STRETCHDIBITS:
					at(e, p, f, c);
					break;
				case E.ARC:
					$(e, p, "arc", "EMR_ARC");
					break;
				case E.ARCTO:
					$(e, p, "arcTo", "EMR_ARCTO");
					break;
				case E.CHORD:
					$(e, p, "chord", "EMR_CHORD");
					break;
				case E.PIE:
					$(e, p, "pie", "EMR_PIE");
					break;
				case E.ANGLEARC:
					He(e, p);
					break;
				case E.ROUNDRECT:
					Ue(e, p);
					break;
				default: {
					let t = D[l];
					t && Q(e, t);
					break;
				}
			}
		} catch (t) {
			if (s(t)) throw t;
			e.unsupported.add(`EMF record ${l} (malformed)`);
		}
		c = d;
	}
}
async function lt(e, t, r, i) {
	let o = {
		bitmap: null,
		unsupported: []
	};
	if (!a(e) || t <= 0 || r <= 0) return o;
	let s = n(t, r);
	if (!s) return o;
	let c = s.getContext("2d");
	if (!c) return o;
	c.lineJoin = "round", c.lineCap = "round";
	let l = [];
	return {
		bitmap: ot(e, c, t, r, {
			onUnsupported: (e) => {
				l = e;
			},
			...i ? { fontFamilies: i } : {}
		}) ? await createImageBitmap(s) : null,
		unsupported: l
	};
}
export { ot as playEmf, lt as renderEmfToBitmap };
