function e(e) {
	if (!e?.trim()) return null;
	let t;
	try {
		t = new Intl.Locale(e.trim());
	} catch {
		return null;
	}
	let { language: n, script: r, region: i } = t;
	return n === "ja" ? !r || [
		"Jpan",
		"Hani",
		"Hira",
		"Kana"
	].includes(r) ? "jp" : null : n === "ko" ? !r || [
		"Kore",
		"Hang",
		"Hani"
	].includes(r) ? "kr" : null : n === "zh" ? r === "Hans" ? "sc" : r === "Hant" ? "tc" : r ? null : i === "HK" || i === "MO" ? "hk" : i === "TW" ? "tc" : "sc" : null;
}
function t(t = "auto") {
	if (t !== "auto") {
		if ([
			"sc",
			"tc",
			"hk",
			"jp",
			"kr"
		].includes(t)) return t;
		throw TypeError("cjkFallback must be auto, sc, tc, hk, jp, or kr");
	}
	let n = typeof document > "u" ? null : e(document.documentElement?.lang);
	if (n) return n;
	if (typeof navigator < "u") {
		for (let t of navigator.languages ?? []) {
			let n = e(t);
			if (n) return n;
		}
		let t = e(navigator.language);
		if (t) return t;
	}
	return "jp";
}
export { t as n, e as t };
