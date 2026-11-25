import { M as e } from "./wmf-HY7sNn5s.js";
import { ir as t } from "./plot-area-frame-BSqoSYxZ.js";
import { r as n } from "./raster-target-Ca3tyA0L.js";
function r([e, t, n], r = [
	0,
	0,
	0
]) {
	let i = e / 255, a = t / 255, o = n / 255, s = Math.max(i, a, o), c = Math.min(i, a, o), l = (s + c) / 2, u = s - c;
	if (u === 0) return r[0] = 0, r[1] = 0, r[2] = l, r;
	let d = u / (1 - Math.abs(2 * l - 1));
	return r[0] = ((s === i ? (a - o) / u % 6 : s === a ? (o - i) / u + 2 : (i - a) / u + 4) * 60 + 360) % 360, r[1] = d, r[2] = l, r;
}
function i(e, t, n, r = [
	0,
	0,
	0
]) {
	let i = (1 - Math.abs(2 * n - 1)) * t, a = (e % 360 + 360) % 360 / 60, o = i * (1 - Math.abs(a % 2 - 1)), [s, c, l] = a < 1 ? [
		i,
		o,
		0
	] : a < 2 ? [
		o,
		i,
		0
	] : a < 3 ? [
		0,
		i,
		o
	] : a < 4 ? [
		0,
		o,
		i
	] : a < 5 ? [
		o,
		0,
		i
	] : [
		i,
		0,
		o
	], u = n - i / 2;
	return r[0] = (s + u) * 255, r[1] = (c + u) * 255, r[2] = (l + u) * 255, r;
}
function a(e, t, n) {
	return Math.round(Math.max(0, Math.min(255, e + (t - e) * n)));
}
function o(e) {
	return /^[0-9a-fA-F]{6}$/.test(e) ? [
		parseInt(e.slice(0, 2), 16),
		parseInt(e.slice(2, 4), 16),
		parseInt(e.slice(4, 6), 16)
	] : null;
}
function s(e, t, n) {
	return (.299 * e + .587 * t + .114 * n) / 255;
}
function c(e, t, n) {
	let r = /^(?:[0-9a-f]{6}|[0-9a-f]{8})$/i.test(t) ? o(t.slice(0, 6)) : null, i = /^(?:[0-9a-f]{6}|[0-9a-f]{8})$/i.test(n) ? o(n.slice(0, 6)) : null;
	if (!r || !i) return e;
	let c = t.length === 8 ? parseInt(t.slice(6), 16) / 255 : 1, l = n.length === 8 ? parseInt(n.slice(6), 16) / 255 : 1, [u, d, f] = r, [p, m, h] = i, g = e.data;
	for (let e = 0; e < g.length; e += 4) {
		let t = s(g[e], g[e + 1], g[e + 2]);
		g[e] = a(u, p, t), g[e + 1] = a(d, m, t), g[e + 2] = a(f, h, t), g[e + 3] = Math.round(g[e + 3] * (c + (l - c) * t));
	}
	return e;
}
var l = (t, n) => e(t, n);
async function u(e, t, n) {
	return d(e, (e) => {
		c(e, t.clr1, t.clr2);
	}, n);
}
async function d(e, r, i) {
	let { width: a, height: o } = i;
	if (a <= 0 || o <= 0 || typeof createImageBitmap > "u") return e;
	let s = (i.offscreenFactory ?? l)(a, o);
	if (!s) return e;
	let c = !1;
	try {
		let l = s.getContext("2d");
		if (!l) return e;
		l.drawImage(e, 0, 0);
		let u;
		try {
			u = l.getImageData(0, 0, a, o);
		} catch (t) {
			if (i.strict) throw t;
			return e;
		}
		let d = s;
		i.releaseReadbackSurface && (d.width = 0);
		let f = r(u), p = {
			width: f?.width ?? a,
			height: f?.height ?? o
		}, m = f?.frame;
		if (f && f !== u) {
			if (i.releaseReadbackSurface || (d.width = 0), typeof ImageData < "u") u = new ImageData(f.data, f.width, f.height);
			else {
				if (!l.createImageData) throw Error("ImageData allocation is unavailable");
				let e = l.createImageData(f.width, f.height);
				e.data.set(f.data), u = e;
			}
			f = void 0;
		}
		(i.releaseReadbackSurface || p.width !== a || p.height !== o || d.width === 0) && (d.width = p.width, d.height = p.height), l.putImageData(u, 0, 0);
		let h = n(p.width, p.height, i.targetWidthPx, i.targetHeightPx), g = h ? await createImageBitmap(s, h) : await createImageBitmap(s);
		if (m) {
			let e = g.width / p.width, n = g.height / p.height;
			t(g, {
				x: m.x * e,
				y: m.y * n,
				width: m.width * e,
				height: m.height * n
			});
		}
		return c = !0, g;
	} finally {
		c || (s.width = 0);
	}
}
export { o as a, a as c, c as i, r as l, d as n, s as o, l as r, i as s, u as t };
