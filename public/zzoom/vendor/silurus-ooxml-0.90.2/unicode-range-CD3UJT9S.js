var e = (e) => e >= 48 && e <= 57 || e >= 65 && e <= 70 || e >= 97 && e <= 102, t = (e) => e === 32 || e >= 9 && e <= 13 || e === 160 || e === 5760 || e >= 8192 && e <= 8202 || e === 8232 || e === 8233 || e === 8239 || e === 8287 || e === 12288 || e === 65279;
function n(n) {
	if (n === void 0) return null;
	let r = n.length, i = [], a = 0;
	for (;;) {
		for (; a < r && t(n.charCodeAt(a));) a++;
		if (a + 1 >= r || (n.charCodeAt(a) | 32) != 117 || n.charCodeAt(a + 1) !== 43) return null;
		a += 2;
		let o = 0, s = 0;
		for (; a < r && s < 6; a++, s++) {
			let t = n.charCodeAt(a);
			if (!e(t)) break;
			o = o * 16 + (t <= 57 ? t - 48 : (t | 32) - 87);
		}
		let c = o, l = a < r ? n.charCodeAt(a) : -1;
		if (l === 63) {
			let e = 0;
			for (; a < r && n.charCodeAt(a) === 63; a++) e++;
			if (s + e > 6) return null;
			o *= 16 ** e, c = o + 16 ** e - 1;
		} else {
			if (s === 0) return null;
			if (l === 45) {
				a++, c = 0;
				let t = 0;
				for (; a < r && t < 6; a++, t++) {
					let t = n.charCodeAt(a);
					if (!e(t)) break;
					c = c * 16 + (t <= 57 ? t - 48 : (t | 32) - 87);
				}
				if (t === 0) return null;
			}
		}
		for (; a < r && t(n.charCodeAt(a));) a++;
		if (o > c || c > 1114111) return null;
		if (i.push(o, c), a >= r) return Uint32Array.from(i);
		if (n.charCodeAt(a) !== 44) return null;
		a++;
	}
}
function r(e) {
	let t = n(e);
	if (!t) return null;
	let r = [];
	for (let e = 0; e < t.length; e += 2) r.push([t[e], t[e + 1]]);
	return r;
}
export { n, r as t };
