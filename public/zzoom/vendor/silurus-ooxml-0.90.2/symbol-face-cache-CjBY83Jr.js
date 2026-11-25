import { D as e, E as t, T as n } from "./vertical-vert-feature-ru96Mg5B.js";
function r(r) {
	let i, a = null, o = [], s = [], c = !1, l = (e) => [
		e.status,
		e.family,
		e.style,
		e.weight,
		e.stretch,
		e.unicodeRange,
		e.featureSettings,
		e.variationSettings
	].join("\0"), u = (e) => {
		if (e !== a) return !1;
		if (!e) return !0;
		let t = 0;
		for (let n of e) {
			if (o[t] !== n || s[t] !== l(n)) return !1;
			t++;
		}
		return t === o.length;
	}, d = (e) => {
		if (a = e, o = [], s = [], e) for (let t of e) o.push(t), s.push(l(t));
	}, f = r ? { createCanvas: r } : {}, p = (a) => {
		if (!c) try {
			let o = t(a);
			if (i && u(o)) return i;
			let s = e(a, r, 1)?.getContext("2d");
			return i = void 0, s ? (d(o), i = n(s, f), i) : void 0;
		} catch {
			i = void 0;
			return;
		}
	};
	return {
		oracleFor(e) {
			if (!e) return n(e, f);
			let t, r, i = () => (t || (t = p(e) ?? (r ??= n(e, f)), queueMicrotask(() => {
				t = void 0;
			})), t);
			return Object.freeze({
				draws: (e, t) => i().draws(e, t),
				monochrome: (e, t) => i().monochrome(e, t),
				segments: (...e) => i().segments(...e)
			});
		},
		dispose() {
			c = !0, i = void 0, a = null, o = [], s = [];
		}
	};
}
export { r as t };
