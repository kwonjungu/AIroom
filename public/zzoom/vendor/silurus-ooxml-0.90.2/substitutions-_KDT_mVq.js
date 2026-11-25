function e(e) {
	return Object.freeze(e.map((e) => Object.freeze({ ...e })));
}
var t = e([
	{
		for: "Calibri",
		use: "Carlito"
	},
	{
		for: "Cambria",
		use: "Caladea"
	},
	{
		for: "Franklin Gothic Book",
		use: "Libre Franklin"
	},
	{
		for: "Franklin Gothic Medium",
		use: "Libre Franklin"
	},
	{
		for: "Sakkal Majalla",
		use: "Noto Naskh Arabic",
		script: "arabic"
	},
	{
		for: "Traditional Arabic",
		use: "Noto Naskh Arabic",
		script: "arabic"
	},
	{
		for: "Simplified Arabic",
		use: "Noto Naskh Arabic",
		script: "arabic"
	},
	{
		for: "Arabic Typesetting",
		use: "Noto Naskh Arabic",
		script: "arabic"
	},
	{
		for: "Univers Next Arabic",
		use: "Noto Sans Arabic",
		script: "arabic"
	}
]);
function n(e) {
	return e.trim().replace(/^(['"])(.*)\1$/s, "$2").trim().toLocaleLowerCase("en-US");
}
function r(e, t, r = "all") {
	if (!e || e.length === 0) return [];
	let i = n(t);
	return e.filter((e) => n(e.for) === i && (e.script === void 0 || r === "all" || r.includes(e.script)));
}
function i(e, t) {
	let r = n(e);
	return t === "all" ? r : `${r}\u0000${[...t].sort().join(",")}`;
}
function a(e) {
	let t = /* @__PURE__ */ new Map();
	for (let n of e) {
		if (n.status !== "loaded" || n.style !== "normal" || n.weight !== "400" && n.weight !== "normal") continue;
		let e = n.family.trim().replace(/^(['"])(.*)\1$/s, "$2").trim();
		if (!e) continue;
		let r = `${e.toLocaleLowerCase("en-US")} regular`;
		t.has(r) || t.set(r, e);
	}
	return t;
}
export { r as a, i, n, a as r, t };
