import { n as e, t } from "./metafile-font-demand-CmEiy4lu.js";
import { t as n } from "./installed-families-ChA8CUiK.js";
import { t as r } from "./embedded-fonts-CcydyKMB.js";
var i = new Set([
	"serif",
	"sans-serif",
	"monospace",
	"cursive",
	"fantasy",
	"system-ui"
]);
function a(e) {
	let t = e?.trim();
	return !!t && !t.startsWith("+mj-") && !t.startsWith("+mn-") && !i.has(t.toLowerCase());
}
function o(e, t, n, i) {
	let o = t?.familyCount ?? e.length, s = r(e.slice(0, o), i).filter(a), c = r(e.slice(o), i).filter(a);
	return Object.freeze({
		families: Object.freeze(s),
		fallbackFamilies: Object.freeze(c),
		scalars: n ?? "all",
		...t ? { substituteScripts: t.substituteScripts } : {}
	});
}
export { e as FontSourceSession, n as PptxInstalledFamilies, t as metafileFontDemand, o as pptxFontDemand };
