import { a as e, i as t, n, r } from "./font-registry-CA7E7o7P.js";
var i = /* @__PURE__ */ new WeakSet();
function a(e) {
	return i.has(e);
}
function o(e) {
	return e.trim().toLowerCase();
}
function s(e) {
	return `local("${e.replaceAll("\\", "\\\\").replaceAll("\"", "\\\"")}")`;
}
function c(e) {
	return `__ooxml_local_${[...e].map((e) => (e.codePointAt(0) ?? 0).toString(16).padStart(6, "0")).join("")}`;
}
function l() {
	return typeof OffscreenCanvas < "u" ? new OffscreenCanvas(1, 1).getContext("2d") : typeof document < "u" && document?.createElement ? document.createElement("canvas").getContext("2d") : null;
}
async function u(a, u = n()) {
	let d = u;
	if (!d || typeof FontFace > "u") return {
		faces: [],
		metrics: {}
	};
	let f = [], p = Object.create(null), m = !1, h = /* @__PURE__ */ new Map();
	for (let e of a) {
		let t = e.family.trim(), n = e.localNames.map((e) => e.trim()).filter(Boolean);
		if (!t || n.length === 0 || e.lineHeightMultiplier != null && !(e.lineHeightMultiplier > 0)) continue;
		let r = e.weight ?? 400, i = e.style ?? "normal";
		if (!(Number.isInteger(r) && r >= 1 && r <= 1e3) || i !== "normal" && i !== "italic") continue;
		let a = n.map(s).join(", "), c = o(t), l = `local-face:${a}:${r}:${i}`, u = h.get(l) ?? {
			source: a,
			requests: []
		};
		u.requests.push({
			...e,
			family: t,
			normalizedFamily: c,
			source: a,
			weight: r,
			style: i
		}), h.set(l, u);
	}
	for (let [n, i] of h) {
		let a = c(n), { face: o } = t(n, d, () => {
			let e = i.requests[0], t = new FontFace(a, i.source, {
				weight: String(e.weight),
				style: e.style
			});
			return d.add(t), t;
		});
		try {
			let t = await e(o.load());
			if ((!t || o.status !== "loaded") && (m = !0), !t || o.status !== "loaded") throw Error("local font load timed out");
			let n = !1;
			for (let e of i.requests) {
				let t;
				if (e.lineHeightMultiplier != null) {
					let n = l();
					if (!n) continue;
					n.font = `${e.style} ${e.weight} 100px "${a}"`;
					let r = n.measureText("Hg国"), i = r.fontBoundingBoxAscent, o = r.fontBoundingBoxDescent;
					if (!(Number.isFinite(i) && Number.isFinite(o) && i + o > 0)) continue;
					t = (i + o) / 100 * e.lineHeightMultiplier;
				}
				let r = e.weight === 400 && e.style === "normal" ? e.normalizedFamily : `${e.normalizedFamily}:${e.weight}:${e.style}`;
				p[r] = {
					family: a,
					...t == null ? {} : { lineHeightRatio: t },
					requestedFamily: e.family,
					weight: e.weight,
					style: e.style,
					sourceIdentity: e.source,
					synthesized: !1
				}, n = !0;
			}
			if (!n) throw Error("exact local font route unavailable");
			f.push(o);
		} catch {
			r([o]);
		}
	}
	let g = {
		faces: f,
		metrics: p
	};
	return m && i.add(g), g;
}
function d(e) {
	r(e);
}
export { d as i, u as n, o as r, a as t };
