import { t as e } from "./ooxml-error-DbICW35n.js";
var t = [
	208,
	207,
	17,
	224,
	161,
	177,
	26,
	225
], n = 4294967290, r = 4294967294, i = 512, a = 128, o = 4e6, s = 8e6, c = 65536, l = 1e6;
function u(e, n) {
	if (e.length < i) return null;
	for (let n = 0; n < t.length; n++) if (e[n] !== t[n]) return null;
	let r = new DataView(e.buffer, e.byteOffset, e.byteLength), a = d(r);
	if (a === null) return null;
	let o = m(r, e.length, a);
	if (o === null) return null;
	let s = g(r, e.length, a, o, n);
	if (s === null || s.target === null) return null;
	let { target: c, root: l } = s;
	return c.size === 0 ? new Uint8Array() : c.size < a.miniStreamCutoff ? l === null ? null : y(r, e.length, a, o, l, c) : v(r, e.length, a, o, c.startSector, c.size);
}
function d(e) {
	let t = e.getUint16(30, !0);
	if (t !== 9 && t !== 12) return null;
	let n = e.getUint16(32, !0);
	if (n !== 6) return null;
	let r = 1 << t, i = 1 << n, a = e.getUint32(56, !0);
	return {
		sectorSize: r,
		numFatSectors: e.getUint32(44, !0),
		miniSectorSize: i,
		miniStreamCutoff: a,
		firstDirSector: e.getUint32(48, !0),
		firstMiniFatSector: e.getUint32(60, !0),
		firstDifatSector: e.getUint32(68, !0),
		numDifatSectors: e.getUint32(72, !0)
	};
}
function f(e, t) {
	return (e + 1) * t;
}
function p(e) {
	return e >= 0 && e <= n;
}
function m(e, t, n) {
	let { sectorSize: r } = n, i = [], a = /* @__PURE__ */ new Set(), o = Math.max(0, Math.floor(t / r) - 1);
	if (n.numFatSectors > o || n.numDifatSectors > o || n.numDifatSectors > l) return null;
	let s = 0, c = (e) => s++ >= n.numFatSectors ? !p(e) : !p(e) || e >= o || a.has(e) ? !1 : (a.add(e), i.push(e), !0);
	for (let t = 0; t < 109; t++) if (!c(e.getUint32(76 + t * 4, !0))) return null;
	let u = r / 4 - 1, d = n.firstDifatSector, m = /* @__PURE__ */ new Set(), h = 0;
	for (; p(d) && h < n.numDifatSectors && (h++, !m.has(d));) {
		m.add(d);
		let n = f(d, r);
		if (n < 0 || n + r > t) return null;
		for (let t = 0; t < u; t++) if (!c(e.getUint32(n + t * 4, !0))) return null;
		d = e.getUint32(n + u * 4, !0);
	}
	return h !== n.numDifatSectors || p(d) || i.length !== n.numFatSectors ? null : i;
}
function h(e, t, n, r, i) {
	let a = n / 4, o = Math.floor(i / a), s = i % a;
	if (o >= r.length) return null;
	let c = r[o];
	if (!p(c)) return null;
	let l = f(c, n) + s * 4;
	return l < 0 || l + 4 > t ? null : e.getUint32(l, !0);
}
function g(e, t, n, r, i) {
	let { sectorSize: s } = n, l = Math.floor(s / a);
	if (l < 1) return null;
	let u = null, d = null, m = /* @__PURE__ */ new Set(), g = n.firstDirSector, v = 0, y = 0;
	for (; p(g);) {
		if (v++ > o) return null;
		if (m.has(g)) break;
		m.add(g);
		let n = f(g, s);
		if (n < 0 || n + s > t) return null;
		for (let t = 0; t < l; t++) {
			if (y++ > c) return {
				target: u,
				root: d
			};
			let r = n + t * a, o = e.getUint8(r + 66);
			if (o === 0) continue;
			let s = e.getUint32(r + 116, !0), l = e.getUint32(r + 120, !0);
			if (o === 5) {
				d = {
					startSector: s,
					size: l
				};
				continue;
			}
			_(e, r) === i && (u = {
				startSector: s,
				size: l
			});
		}
		let p = h(e, t, s, r, g);
		if (p === null) break;
		g = p;
	}
	return {
		target: u,
		root: d
	};
}
function _(e, t) {
	let n = e.getUint16(t + 64, !0);
	if (n < 2 || n > 64) return "";
	let r = n / 2 - 1, i = "";
	for (let n = 0; n < r; n++) {
		let r = e.getUint16(t + n * 2, !0);
		if (r === 0) break;
		i += String.fromCharCode(r);
	}
	return i;
}
function v(e, t, n, r, i, a) {
	let { sectorSize: s } = n, c = new Uint8Array(a), l = 0, u = i, d = /* @__PURE__ */ new Set(), m = 0;
	for (; p(u) && l < a;) {
		if (m++ > o || d.has(u)) return null;
		d.add(u);
		let n = f(u, s);
		if (n < 0 || n + s > t) return null;
		let i = Math.min(s, a - l);
		c.set(new Uint8Array(e.buffer, e.byteOffset + n, i), l), l += i;
		let p = h(e, t, s, r, u);
		if (p === null) return null;
		u = p;
	}
	return l === a ? c : null;
}
function y(e, t, n, r, i, a) {
	let { sectorSize: o, miniSectorSize: c } = n, l = v(e, t, n, r, i.startSector, i.size);
	if (l === null) return null;
	let u = new Uint8Array(a.size), d = 0, f = a.startSector, m = /* @__PURE__ */ new Set(), h = 0, g = o / 4;
	for (; p(f) && d < a.size;) {
		if (h++ > s || m.has(f)) return null;
		m.add(f);
		let i = f * c;
		if (i < 0 || i + c > l.length) return null;
		let o = Math.min(c, a.size - d);
		u.set(l.subarray(i, i + o), d), d += o;
		let p = b(e, t, n, r, g, f);
		if (p === null) return null;
		f = p;
	}
	return d === a.size ? u : null;
}
function b(e, t, n, i, a, o) {
	let { sectorSize: s } = n, c = Math.floor(o / a), l = o % a, u = n.firstMiniFatSector, d = /* @__PURE__ */ new Set();
	for (let n = 0; n < c; n++) {
		if (!p(u) || d.has(u)) return null;
		d.add(u);
		let n = h(e, t, s, i, u);
		if (n === null) return null;
		u = n;
	}
	if (!p(u)) return null;
	let m = f(u, s) + l * 4;
	if (m < 0 || m + 4 > t) return null;
	let g = e.getUint32(m, !0);
	return g === r ? r : g;
}
var x = [
	208,
	207,
	17,
	224,
	161,
	177,
	26,
	225
], S = 4294967290, C = 512, w = 128, T = 4096, E = 8192, ee = new Set([
	"WordDocument",
	"Workbook",
	"Book",
	"PowerPoint Document"
]), D = "EncryptionInfo";
function O(e) {
	if (e.length < C) return null;
	for (let t = 0; t < x.length; t++) if (e[t] !== x[t]) return null;
	let t = new DataView(e.buffer, e.byteOffset, e.byteLength), n = t.getUint16(30, !0);
	if (n !== 9 && n !== 12) return "cfb-unknown";
	let r = 1 << n, i = t.getUint32(48, !0), a = {
		sectorSize: r,
		numFatSectors: t.getUint32(44, !0),
		firstDifatSector: t.getUint32(68, !0),
		numDifatSectors: t.getUint32(72, !0)
	}, o = m(t, e.length, a);
	if (o === null) return "cfb-unknown";
	let s = k(t, e.length, r, i, o);
	if (s === null) return "cfb-unknown";
	if (s.has(D)) return "encrypted";
	for (let e of s) if (ee.has(e)) return "legacy-binary-format";
	return "cfb-unknown";
}
function k(e, t, n, r, i) {
	if (!M(r)) return null;
	let a = /* @__PURE__ */ new Set(), o = Math.floor(n / w);
	if (o < 1) return null;
	let s = /* @__PURE__ */ new Set(), c = r, l = 0, u = 0;
	for (; M(c) && !(l++ > E || s.has(c));) {
		s.add(c);
		let r = j(c, n);
		if (r < 0 || r + n > t) return null;
		for (let t = 0; t < o; t++) {
			if (u++ > T) return a;
			let n = A(e, r + t * w);
			n && a.add(n);
		}
		let l = h(e, t, n, i, c);
		if (l === null) break;
		c = l;
	}
	return a;
}
function A(e, t) {
	let n = e.getUint16(t + 64, !0);
	if (n < 2 || n > 64) return "";
	let r = n / 2 - 1, i = "";
	for (let n = 0; n < r; n++) {
		let r = e.getUint16(t + n * 2, !0);
		if (r === 0) break;
		i += String.fromCharCode(r);
	}
	return i;
}
function j(e, t) {
	return (e + 1) * t;
}
function M(e) {
	return e >= 0 && e <= S;
}
function N(e) {
	if (typeof atob == "function") {
		let t = atob(e), n = new Uint8Array(t.length);
		for (let e = 0; e < t.length; e++) n[e] = t.charCodeAt(e);
		return n;
	}
	let t = globalThis.Buffer;
	if (t) return new Uint8Array(t.from(e, "base64"));
	throw Error("no base64 decoder available");
}
function P(e, t, n) {
	let r = RegExp(`<(?:[\\w]+:)?${t}\\b[^>]*>`).exec(e);
	if (!r) return null;
	let i = r[0], a = RegExp(`\\b${n}\\s*=\\s*"([^"]*)"`).exec(i);
	return a ? a[1] : null;
}
function F(e) {
	if (e === null) return null;
	let t = Number(e);
	return Number.isFinite(t) ? t : null;
}
function I(e, t) {
	let n = F(P(e, t, "saltSize")), r = F(P(e, t, "blockSize")), i = F(P(e, t, "keyBits")), a = F(P(e, t, "hashSize")), o = P(e, t, "cipherAlgorithm"), s = P(e, t, "cipherChaining"), c = P(e, t, "hashAlgorithm"), l = P(e, t, "saltValue");
	return n === null || r === null || i === null || a === null || !o || !s || !c || l === null ? null : {
		saltSize: n,
		blockSize: r,
		keyBits: i,
		hashSize: a,
		cipherAlgorithm: o,
		cipherChaining: s,
		hashAlgorithm: c,
		saltValue: N(l)
	};
}
function L(e) {
	if (e.length < 8) return { kind: "unknown" };
	let t = new DataView(e.buffer, e.byteOffset, e.byteLength), n = t.getUint16(0, !0), r = t.getUint16(2, !0);
	if (n === 4 && r === 4) {
		let t = te(e.subarray(8));
		return t ? {
			kind: "agile",
			descriptor: t
		} : { kind: "unknown" };
	}
	return r === 16 && (n === 3 || n === 4) ? { kind: "extensible" } : r === 2 && (n === 2 || n === 3 || n === 4) ? { kind: "standard" } : { kind: "unknown" };
}
function te(e) {
	let t = new TextDecoder("utf-8").decode(e), n = I(t, "keyData"), r = I(t, "encryptedKey");
	if (!n || !r) return null;
	let i = F(P(t, "encryptedKey", "spinCount")), a = P(t, "encryptedKey", "encryptedVerifierHashInput"), o = P(t, "encryptedKey", "encryptedVerifierHashValue"), s = P(t, "encryptedKey", "encryptedKeyValue");
	if (i === null || a === null || o === null || s === null) return null;
	let c = {
		...r,
		spinCount: i,
		encryptedVerifierHashInput: N(a),
		encryptedVerifierHashValue: N(o),
		encryptedKeyValue: N(s)
	}, l = null, u = P(t, "dataIntegrity", "encryptedHmacKey"), d = P(t, "dataIntegrity", "encryptedHmacValue");
	return u !== null && d !== null && (l = {
		encryptedHmacKey: N(u),
		encryptedHmacValue: N(d)
	}), {
		keyData: n,
		passwordKeyEncryptor: c,
		dataIntegrity: l
	};
}
var R = {
	verifierHashInput: new Uint8Array([
		254,
		167,
		210,
		118,
		59,
		75,
		158,
		121
	]),
	verifierHashValue: new Uint8Array([
		215,
		170,
		15,
		109,
		48,
		97,
		52,
		78
	]),
	keyValue: new Uint8Array([
		20,
		110,
		11,
		231,
		171,
		172,
		208,
		214
	]),
	hmacKey: new Uint8Array([
		95,
		178,
		173,
		1,
		12,
		185,
		225,
		246
	]),
	hmacValue: new Uint8Array([
		160,
		103,
		127,
		2,
		178,
		44,
		132,
		51
	])
}, z = 54, B = 4096, V = class extends Error {
	reason;
	constructor(e, t) {
		super(t), this.name = "AgileDecryptError", this.reason = e;
	}
};
function H() {
	let e = globalThis.crypto;
	if (!e || !e.subtle) throw new V("unsupported-encryption", "WebCrypto (globalThis.crypto.subtle) is unavailable; cannot decrypt.");
	return e.subtle;
}
function U(e) {
	switch (e.toUpperCase().replace(/[-_]/g, "")) {
		case "SHA512": return "SHA-512";
		case "SHA384": return "SHA-384";
		case "SHA256": return "SHA-256";
		case "SHA1": return "SHA-1";
		default: throw new V("unsupported-encryption", `Unsupported hashAlgorithm "${e}" (only SHA-1/256/384/512).`);
	}
}
function W(e) {
	if (e.cipherAlgorithm.toUpperCase() !== "AES") throw new V("unsupported-encryption", `Unsupported cipherAlgorithm "${e.cipherAlgorithm}" (only AES).`);
	if (e.cipherChaining.toLowerCase() !== "chainingmodecbc") throw new V("unsupported-encryption", `Unsupported cipherChaining "${e.cipherChaining}" (only ChainingModeCBC).`);
	if (e.keyBits !== 128 && e.keyBits !== 192 && e.keyBits !== 256) throw new V("unsupported-encryption", `Unsupported keyBits ${e.keyBits} (only 128/192/256).`);
}
function G(...e) {
	let t = e.reduce((e, t) => e + t.length, 0), n = new Uint8Array(t), r = 0;
	for (let t of e) n.set(t, r), r += t.length;
	return n;
}
function K(e) {
	let t = new Uint8Array(4);
	return new DataView(t.buffer).setUint32(0, e >>> 0, !0), t;
}
function q(e) {
	let t = new Uint8Array(e.length * 2), n = new DataView(t.buffer);
	for (let t = 0; t < e.length; t++) n.setUint16(t * 2, e.charCodeAt(t), !0);
	return t;
}
async function J(e, t) {
	return new Uint8Array(await H().digest(e, t));
}
function Y(e, t) {
	if (e.length > t) return e.slice(0, t);
	let n = new Uint8Array(t);
	return n.set(e), e.length < t && n.fill(z, e.length), n;
}
async function X(e, t, n, r) {
	let i = U(t.hashAlgorithm), a = await J(i, G(t.saltValue, q(e)));
	for (let e = 0; e < n; e++) a = await J(i, G(K(e), a));
	return Y(await J(i, G(a, r)), t.keyBits / 8);
}
async function Z(e, t, n) {
	return Y(n ? await J(U(e.hashAlgorithm), G(t, n)) : t, e.blockSize);
}
async function Q(e, t, n) {
	let r = t.length;
	if (n.length === 0) return new Uint8Array();
	if (n.length % r !== 0) throw new V("corrupt", "ciphertext length is not a multiple of the block size");
	let i = await H().importKey("raw", e, { name: "AES-CBC" }, !1, ["decrypt"]), a = await H().importKey("raw", e, { name: "AES-CBC" }, !1, ["encrypt"]), o = n.subarray(n.length - r), s = ne(new Uint8Array(r).fill(r), o), c = G(n, new Uint8Array(await H().encrypt({
		name: "AES-CBC",
		iv: new Uint8Array(r)
	}, a, s)).subarray(0, r)), l = new Uint8Array(await H().decrypt({
		name: "AES-CBC",
		iv: t
	}, i, c));
	return l.length >= n.length ? l.subarray(0, n.length) : l;
}
function ne(e, t) {
	let n = new Uint8Array(e.length);
	for (let r = 0; r < e.length; r++) n[r] = e[r] ^ t[r];
	return n;
}
async function re(e, t) {
	W(t);
	let n = U(t.hashAlgorithm), r = await Q(await X(e, t, t.spinCount, R.verifierHashInput), await Z(t, t.saltValue, null), t.encryptedVerifierHashInput), i = await Q(await X(e, t, t.spinCount, R.verifierHashValue), await Z(t, t.saltValue, null), t.encryptedVerifierHashValue);
	return ie((await J(n, r)).subarray(0, t.hashSize), i.subarray(0, t.hashSize));
}
function ie(e, t) {
	if (e.length !== t.length) return !1;
	let n = 0;
	for (let r = 0; r < e.length; r++) n |= e[r] ^ t[r];
	return n === 0;
}
async function ae(e, t) {
	return await Q(await X(e, t, t.spinCount, R.keyValue), await Z(t, t.saltValue, null), t.encryptedKeyValue);
}
async function oe(e, t, n) {
	if (W(t), e.length < 8) throw new V("corrupt", "EncryptedPackage is shorter than its size prefix");
	let r = new DataView(e.buffer, e.byteOffset, e.byteLength), i = Number(r.getBigUint64(0, !0)), a = e.subarray(8);
	if (i > a.length) throw new V("corrupt", "EncryptedPackage size prefix exceeds the ciphertext");
	let o = n.slice(0, t.keyBits / 8), s = new Uint8Array(i), c = 0, l = 0;
	for (let e = 0; e < a.length; e += B) {
		let n = a.subarray(e, e + B), r = await Q(o, await Z(t, t.saltValue, K(l)), n), u = Math.min(r.length, i - c);
		if (s.set(r.subarray(0, u), c), c += u, l++, c >= i) break;
	}
	if (c !== i) throw new V("corrupt", "decrypted output is shorter than the declared size");
	return s;
}
async function $(e, t, n) {
	let { keyData: r, passwordKeyEncryptor: i } = e;
	if (W(r), W(i), !await re(n, i)) throw new V("invalid-password", "The supplied password is incorrect.");
	return oe(t, r, await ae(n, i));
}
var se = "EncryptionInfo", ce = "EncryptedPackage";
async function le(e, t) {
	let n = u(e, se), r = u(e, ce);
	if (n === null || r === null) return {
		ok: !1,
		reason: "corrupt"
	};
	let i = L(n);
	if (i.kind !== "agile") return {
		ok: !1,
		reason: "unsupported-encryption"
	};
	try {
		return {
			ok: !0,
			data: await $(i.descriptor, r, t)
		};
	} catch (e) {
		return e instanceof V ? {
			ok: !1,
			reason: e.reason
		} : {
			ok: !1,
			reason: "corrupt"
		};
	}
}
function ue(t) {
	let n = O(t instanceof Uint8Array ? t : new Uint8Array(t));
	if (n !== null) switch (n) {
		case "encrypted": throw new e("encrypted", "This file is password-protected (MS-OFFCRYPTO). Pass LoadOptions.password to decrypt it.");
		case "legacy-binary-format": throw new e("legacy-binary-format", "This is a legacy binary Office file (.doc/.xls/.ppt), not OOXML.");
		case "cfb-unknown": throw new e("not-ooxml", "This file is an OLE2/Compound File container, not an OOXML (ZIP) document.");
		default: throw new e("not-ooxml", "This file is an OLE2/Compound File container of an unrecognised kind, not an OOXML (ZIP) document.");
	}
}
async function de(t, n) {
	let r = t instanceof Uint8Array ? t : new Uint8Array(t), i = O(r);
	if (i === null) return r;
	if (i === "encrypted") {
		if (n === void 0) throw new e("encrypted", "This file is password-protected (MS-OFFCRYPTO). Pass LoadOptions.password to decrypt it.");
		let t = await le(r, n);
		if (t.ok) return t.data;
		switch (t.reason) {
			case "invalid-password": throw new e("invalid-password", "The supplied password is incorrect.");
			case "unsupported-encryption": throw new e("unsupported-encryption", "This file uses an encryption scheme other than Agile ([MS-OFFCRYPTO]) that is not supported (Standard / Extensible / legacy binary encryption).");
			case "corrupt": throw new e("not-ooxml", "This file is an encrypted OLE2/Compound File container but its structure could not be read.");
			default: throw t.reason, new e("not-ooxml", "This encrypted file could not be decrypted.");
		}
	}
	return ue(r), r;
}
function fe(e) {
	if (e.byteOffset === 0 && e.byteLength === e.buffer.byteLength && e.buffer instanceof ArrayBuffer) return e.buffer;
	let t = new Uint8Array(e.byteLength);
	return t.set(e), t.buffer;
}
export { fe as n, de as t };
