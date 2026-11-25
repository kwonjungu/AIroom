function e(e, t) {
	if (!Number.isSafeInteger(e) || e < 0) throw Error(`${t} must be a non-negative safe integer`);
}
function t(t, n, r) {
	return e(t, "resource measurement"), e(n, "resource measurement"), e(r, "resource measurement limit"), t > r || n > r || n > r - t ? r === 2 ** 53 - 1 ? r : r + 1 : t + n;
}
function n(n, r = 2 ** 53 - 1) {
	e(r, "resource measurement limit");
	let i = 0;
	for (let e = 0; e < n.length; e += 1) {
		let a = n.charCodeAt(e), o;
		if (a <= 127) o = 1;
		else if (a <= 2047) o = 2;
		else if (a >= 55296 && a <= 56319 && e + 1 < n.length) {
			let t = n.charCodeAt(e + 1);
			t >= 56320 && t <= 57343 ? (o = 4, e += 1) : o = 3;
		} else o = 3;
		if (i = t(i, o, r), i > r) return i;
	}
	return i;
}
function r(n, r = 2 ** 53 - 1) {
	e(r, "resource measurement limit");
	let i = t(0, 2, r);
	if (i > r) return i;
	for (let e = 0; e < n.length; e += 1) {
		let a = n.charCodeAt(e), o;
		if (a === 34 || a === 92 || a === 8 || a === 9 || a === 10 || a === 12 || a === 13) o = 2;
		else if (a <= 31) o = 6;
		else if (a <= 127) o = 1;
		else if (a <= 2047) o = 2;
		else if (a >= 55296 && a <= 56319 && e + 1 < n.length) {
			let t = n.charCodeAt(e + 1);
			t >= 56320 && t <= 57343 ? (o = 4, e += 1) : o = 6;
		} else o = a >= 55296 && a <= 57343 ? 6 : 3;
		if (i = t(i, o, r), i > r) return i;
	}
	return i;
}
function i(e, n) {
	return t(0, e, n);
}
function a(o, s = 2 ** 53 - 1, c = !1) {
	if (e(s, "resource measurement limit"), o === null) return {
		jsonBytes: i(4, s),
		stringValueUtf8Bytes: 0
	};
	if (typeof o == "string") return {
		jsonBytes: r(o, s),
		stringValueUtf8Bytes: n(o, s)
	};
	if (typeof o == "boolean") return {
		jsonBytes: i(o ? 4 : 5, s),
		stringValueUtf8Bytes: 0
	};
	if (typeof o == "number") return {
		jsonBytes: i((Number.isFinite(o) ? String(Object.is(o, -0) ? 0 : o) : "null").length, s),
		stringValueUtf8Bytes: 0
	};
	if (typeof o == "bigint") throw TypeError("BigInt values cannot be serialized to JSON");
	if (Array.isArray(o)) {
		let e = i(2, s), n = 0;
		for (let r = 0; r < o.length; r += 1) {
			r !== 0 && (e = t(e, 1, s));
			let i = a(o[r], s, !0);
			e = t(e, i.jsonBytes, s), n = t(n, i.stringValueUtf8Bytes, s);
		}
		return {
			jsonBytes: e,
			stringValueUtf8Bytes: n
		};
	}
	if (typeof o == "object") {
		let e = i(2, s), n = 0, c = 0;
		for (let [i, l] of Object.entries(o)) {
			if (l === void 0 || typeof l == "function" || typeof l == "symbol") continue;
			c++ !== 0 && (e = t(e, 1, s)), e = t(e, r(i, s), s), e = t(e, 1, s);
			let o = a(l, s);
			e = t(e, o.jsonBytes, s), n = t(n, o.stringValueUtf8Bytes, s);
		}
		return {
			jsonBytes: e,
			stringValueUtf8Bytes: n
		};
	}
	return {
		jsonBytes: c ? i(4, s) : 0,
		stringValueUtf8Bytes: 0
	};
}
export { a as n, n as r, t };
