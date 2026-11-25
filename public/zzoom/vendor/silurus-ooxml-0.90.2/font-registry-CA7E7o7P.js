var e = /* @__PURE__ */ new Map();
function t(t, n, r) {
	let i = e.get(t), a = i?.get(n);
	if (a) return a.refs++, {
		face: a.face,
		isNew: !1
	};
	let o = r(), s = i ?? /* @__PURE__ */ new Map();
	return s.set(n, {
		face: o,
		set: n,
		refs: 1
	}), e.set(t, s), {
		face: o,
		isNew: !0
	};
}
function n(t) {
	let n = /* @__PURE__ */ new Set();
	for (let r of t) if (!n.has(r)) {
		n.add(r);
		for (let [t, n] of e) {
			let i = !1;
			for (let [a, o] of n) if (o.face === r) {
				if (i = !0, o.refs--, o.refs <= 0) {
					try {
						o.set.delete(r);
					} catch {}
					n.delete(a), n.size === 0 && e.delete(t);
				}
				break;
			}
			if (i) break;
		}
	}
}
var r = 15e3;
function i(e) {
	return Promise.race([e, new Promise((e) => setTimeout(e, r))]);
}
function a() {
	return typeof document < "u" && document && document.fonts ? document.fonts : typeof self < "u" && self && "fonts" in self ? self.fonts : null;
}
export { i as a, t as i, a as n, n as r, r as t };
