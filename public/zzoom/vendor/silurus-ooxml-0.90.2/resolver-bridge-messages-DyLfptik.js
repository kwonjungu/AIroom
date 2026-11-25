var e = (e) => typeof e == "object" && e ? e.kind : void 0;
function t(t) {
	let n = e(t);
	return n === "ooxmlResolveFonts" || n === "ooxmlAcquireFonts" || n === "ooxmlCancelResolveFonts";
}
function n(e) {
	let t = /* @__PURE__ */ new Map(), n = (e) => {
		let { data: n } = e;
		if (!n) return e;
		let r = t.get(n);
		return r || (r = n.slice(0), t.set(n, r)), {
			...e,
			data: r
		};
	};
	return {
		answers: e.map((e) => e.kind === "claimed" ? {
			...e,
			declarations: e.declarations.map(n)
		} : e),
		transfer: [...t.values()]
	};
}
export { t as n, n as t };
