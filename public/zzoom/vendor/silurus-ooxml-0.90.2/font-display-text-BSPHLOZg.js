function e(e, t) {
	let n = e.fieldType === "slidenum" && t !== void 0 ? String(t) : e.text;
	return e.caps === "all" || e.caps === "small" ? n.toUpperCase() : n;
}
export { e as t };
