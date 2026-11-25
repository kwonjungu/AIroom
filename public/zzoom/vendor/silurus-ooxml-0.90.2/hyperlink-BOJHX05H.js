var e = [
	"http",
	"https",
	"mailto",
	"tel"
];
function t(e) {
	let t = "";
	for (let n of e) {
		let e = n.codePointAt(0);
		e !== void 0 && e > 32 && (t += n);
	}
	let n = /^([a-zA-Z][a-zA-Z0-9+.-]*):/.exec(t);
	return n ? n[1].toLowerCase() : null;
}
function n(n, r = e) {
	if (n === "") return null;
	let i = t(n);
	return i === null || r.includes(i) ? n : null;
}
function r(t, r = e, i = typeof window < "u" ? window : void 0) {
	let a = n(t, r);
	return a === null || !i ? !1 : (i.open(a, "_blank", "noopener,noreferrer"), !0);
}
export { t as n, r, e as t };
