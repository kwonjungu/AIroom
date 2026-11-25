import { a as e, i as t, n, r } from "./font-registry-CA7E7o7P.js";
import { i } from "./resource-policy.generated-D_HlV2Rm.js";
function a(e, t = i) {
	return e.byteLength > 0 && e.byteLength <= t;
}
function o(e, t) {
	let n = s(t), r = e.slice(), i = Math.min(32, r.length);
	for (let e = 0; e < i; e++) r[e] ^= n[e % 16];
	return r;
}
function s(e) {
	let t = e.replace(/[{}\-\s]/g, "");
	if (t.length !== 32 || /[^0-9a-fA-F]/.test(t)) throw Error(`invalid fontKey GUID: ${e}`);
	let n = new Uint8Array(16);
	for (let e = 0; e < 16; e++) n[e] = parseInt(t.slice(e * 2, e * 2 + 2), 16);
	return n.reverse();
}
function c(e, t, n, r) {
	let i = 2166136261;
	for (let e = 0; e < r.length; e++) i ^= r[e], i = Math.imul(i, 16777619);
	return `${e}|${t}|${n}|${r.length}|${(i >>> 0).toString(16)}`;
}
async function l(s, l = i) {
	let u = n();
	if (!u || typeof FontFace > "u") return [];
	let d = [], f = /* @__PURE__ */ new Set(), p = [];
	for (let e of s) try {
		if (!a(e.bytes, l)) {
			p.push(e.family);
			continue;
		}
		let n = e.odttf ? o(e.bytes, e.fontKey ?? "") : e.bytes, r = `embedded:${c(e.family, e.weight, e.style, n)}`;
		if (f.has(r)) continue;
		f.add(r);
		let { face: i } = t(r, u, () => {
			let t = n.buffer.slice(n.byteOffset, n.byteOffset + n.byteLength), r = new FontFace(e.family, t, {
				weight: e.weight,
				style: e.style
			});
			return u.add(r), r;
		});
		d.push(i);
	} catch {
		p.push(e.family);
	}
	let m = d;
	if (d.length > 0) {
		let t = await e(Promise.allSettled(d.map((e) => Promise.resolve().then(() => e.load()))));
		Array.isArray(t) ? (m = [], t.forEach((e, t) => {
			let n = d[t];
			e.status === "fulfilled" ? m.push(n) : (p.push(n.family), r([n]));
		})) : (p.push(...d.map((e) => e.family)), r(d), m = []);
	}
	return p.length > 0 && console.warn(`[ooxml] failed to register embedded font(s): ${[...new Set(p)].join(", ")}; falling back to substitute fonts (text may shift or differ).`), m;
}
function u(e) {
	r(e);
}
export { u as i, a as n, l as r, o as t };
