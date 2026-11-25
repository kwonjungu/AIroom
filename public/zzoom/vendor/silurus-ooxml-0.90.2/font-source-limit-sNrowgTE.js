import { t as e } from "./ooxml-error-DbICW35n.js";
var t = {
	stylesheet: "bytes",
	declarations: "entry-count",
	families: "entry-count",
	face: "bytes",
	retained: "bytes",
	url: "length"
};
function n(e) {
	return typeof e == "number" && Number.isSafeInteger(e) && e >= 0;
}
function r(e) {
	return `Font source limit exceeded (${e.quota}): ${e.metric} ${e.observed} > ${e.limit}`;
}
function i(n, i, a) {
	let o = {
		resource: "font-source",
		quota: n,
		metric: t[n],
		limit: i,
		observed: a
	};
	return new e("font-source-limit", r(o), o);
}
function a(e) {
	if (!e || typeof e != "object" || Array.isArray(e)) return;
	let { resource: r, quota: i, metric: a, limit: o, observed: s } = e;
	if (r !== "font-source" || typeof i != "string" || !Object.prototype.hasOwnProperty.call(t, i)) return;
	let c = i;
	if (!(a !== t[c] || !n(o) || !n(s) || s <= o)) return {
		resource: r,
		quota: c,
		metric: t[c],
		limit: o,
		observed: s
	};
}
export { r as n, a as r, i as t };
