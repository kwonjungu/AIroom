function e(e) {
	if (e === void 0 || e.state === "builtin") return null;
	if (e.state !== "resolved") throw Error("errorPlaceholder was not resolved on the main thread");
	let t = typeof e.title == "string" ? e.title : null, n = e.detail === null || typeof e.detail == "string" ? e.detail : void 0;
	return Object.freeze({
		title: t,
		detail: n === "" ? null : n
	});
}
var t = 8, n = /* @__PURE__ */ new WeakMap();
function r(e) {
	function r(t, n) {
		return e.clampPartFailureMessage(t?.title ?? n);
	}
	function i(t, n) {
		let r = t === null || t.detail === void 0 ? n : t.detail;
		return r === null ? null : e.clampPartFailureMessage(r);
	}
	function a(t, n, r, i) {
		let a = t.trim().split(/\s+/).filter(Boolean), o = [], s = "", c = (t) => {
			let r = [
				0,
				...e.graphemeClusterOffsets(t),
				t.length
			].filter((e, t, n) => t === 0 || e !== n[t - 1]), a = r.length - 1;
			for (; a > 0 && i(`${t.slice(0, r[a])}…`) > n;) --a;
			return `${t.slice(0, r[a] ?? 0)}…`;
		}, l = () => {
			o.length === 0 ? o.push(c("")) : o[o.length - 1] = c(o[o.length - 1]);
		}, u = (t) => {
			let a = [
				0,
				...e.graphemeClusterOffsets(t),
				t.length
			].filter((e, t, n) => t === 0 || e !== n[t - 1]), s = 0;
			for (; s < a.length - 1;) {
				if (o.length >= r) return l(), !0;
				let e = s + 1;
				for (; e < a.length && i(t.slice(a[s], a[e])) <= n;) e += 1;
				let u = Math.max(s + 1, e - 1), d = t.slice(a[s], a[u]);
				if (o.length >= r - 1 && u < a.length - 1) return o.push(c(d)), !0;
				o.push(d), s = u;
			}
			return !1;
		};
		for (let e = 0; e < a.length; e += 1) {
			let t = a[e], c = s ? `${s} ${t}` : t, d = i(c);
			if (s && d > n) {
				if (o.push(s), s = "", o.length >= r) {
					l();
					break;
				}
				if (i(t) > n) {
					if (u(t)) break;
				} else s = t;
			} else if (!s && d > n) {
				if (u(t)) break;
			} else s = c;
			if (e < a.length - 1 && o.length >= r && !s) {
				l();
				break;
			}
		}
		return s && o.length < r && o.push(s), o;
	}
	function o(e, r, i, o) {
		let s = n.get(e);
		s === void 0 && (s = /* @__PURE__ */ new Map(), n.set(e, s));
		let c = `${e.font}\u0000${i}\u0000${o}\u0000${r}`, l = s.get(c);
		if (l !== void 0) return s.delete(c), s.set(c, l), l;
		let u = Object.freeze(a(r, i, o, (t) => e.measureText(t).width));
		return s.set(c, u), s.size > t && s.delete(s.keys().next().value), u;
	}
	return {
		errorPlaceholderTitle: r,
		errorPlaceholderDetail: i,
		wrapErrorPlaceholderText: a,
		errorPlaceholderCanvasLines: o
	};
}
export { e as n, r as t };
