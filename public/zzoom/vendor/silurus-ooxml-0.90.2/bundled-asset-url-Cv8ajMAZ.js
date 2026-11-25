function e() {
	let e = globalThis, t = e.document?.baseURI ?? e.location?.href;
	return typeof t == "string" ? t : void 0;
}
function t(t, n) {
	let r = e();
	if (t.startsWith("/") && r) {
		let e;
		try {
			e = new URL("/", n);
		} catch {}
		if (!e || e.protocol === "file:") try {
			return new URL(t, r).href;
		} catch {}
	}
	return new URL(t, n).href;
}
export { t as n, e as t };
