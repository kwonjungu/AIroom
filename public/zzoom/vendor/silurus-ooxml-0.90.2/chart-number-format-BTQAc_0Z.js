import { t as e } from "./own-key-CzMRhMxt.js";
var t = 864e5, n = Date.UTC(1899, 11, 30), r = Date.UTC(1904, 0, 1);
function i(e, t = !1) {
	return Number.isFinite(e) && e >= 0 && e < (t ? 2957004 : 2958466);
}
function a(e, n, r, a) {
	let o = e + Math.round(n * t);
	return i(r, a) ? Math.min(o, Date.UTC(1e4, 0, 1) - 1) : o;
}
function o(e, t = !1) {
	if (t) return new Date(a(r, e, e, t));
	let i = e < 60 ? e + 1 : e;
	return new Date(a(n, i, e, t));
}
function s(e, i = !1) {
	if (i) return (e.getTime() - r) / t;
	let a = (e.getTime() - n) / t;
	return a <= 60 ? a - 1 : a;
}
var c = {
	black: "#000000",
	blue: "#0000FF",
	cyan: "#00FFFF",
	green: "#008000",
	magenta: "#FF00FF",
	red: "#FF0000",
	white: "#FFFFFF",
	yellow: "#FFFF00"
}, l = /* @__PURE__ */ "#000000.#FFFFFF.#FF0000.#00FF00.#0000FF.#FFFF00.#FF00FF.#00FFFF.#000000.#FFFFFF.#FF0000.#00FF00.#0000FF.#FFFF00.#FF00FF.#00FFFF.#800000.#008000.#000080.#808000.#800080.#008080.#C0C0C0.#808080.#9999FF.#993366.#FFFFCC.#CCFFFF.#660066.#FF8080.#0066CC.#CCCCFF.#000080.#FF00FF.#FFFF00.#00FFFF.#800080.#800000.#008080.#0000FF.#00CCFF.#CCFFFF.#CCFFCC.#FFFF99.#99CCFF.#FF99CC.#CC99FF.#FFCC99.#3366FF.#33CCCC.#99CC00.#FFCC00.#FF9900.#FF6600.#666699.#969696.#003366.#339966.#003300.#333300.#993300.#993366.#333399.#333333".split(".");
function u(t) {
	let n = "", r, i, a = !1, o = 0;
	for (; o < t.length;) {
		let s = t[o];
		if (s === "\"") {
			for (n += s, o++; o < t.length && t[o] !== "\"";) n += t[o++];
			o < t.length && (n += t[o++]);
		} else if (s === "\\" || s === "_" || s === "*") n += s, o + 1 < t.length && (n += t[o + 1]), o += 2;
		else if (s === "[") {
			let u = a ? -1 : t.indexOf("]", o);
			if (u < 0) {
				a = !0, n += s, o++;
				continue;
			}
			let d = t.slice(o + 1, u), f = d.toLowerCase(), p = f.match(/^color(\d{1,2})$/), m = d.match(/^(<=|>=|<>|<|>|=)\s*([-+]?[0-9.]+(?:[eE][-+]?\d+)?)$/);
			if (e(c, f)) r = c[f];
			else if (p) {
				let e = parseInt(p[1], 10);
				e >= 1 && e <= 56 && (r = l[e + 7] ?? r);
			} else m ? i = {
				op: m[1],
				value: Number(m[2])
			} : n += t.slice(o, u + 1);
			o = u + 1;
		} else n += s, o++;
	}
	return {
		body: n,
		color: r,
		condition: i
	};
}
function d(e, t) {
	switch (e.op) {
		case "<": return t < e.value;
		case "<=": return t <= e.value;
		case ">": return t > e.value;
		case ">=": return t >= e.value;
		case "=": return t === e.value;
		case "<>": return t !== e.value;
	}
}
function f(e, t) {
	let n = h(t), r = m(n), i = n.filter((e, t) => t !== r).map(u);
	if (i.length === 0) return null;
	if (i.some((e) => e.condition)) {
		for (let t = 0; t < i.length; t++) {
			let n = i[t];
			if (!n.condition) return {
				section: n,
				index: t,
				useMagnitude: !1
			};
			if (d(n.condition, e)) return {
				section: n,
				index: t,
				useMagnitude: e < 0
			};
		}
		return "none";
	}
	if (e > 0) return {
		section: i[0],
		index: 0,
		useMagnitude: !1
	};
	if (e < 0) return i.length > 1 ? {
		section: i[1],
		index: 1,
		useMagnitude: !0
	} : {
		section: i[0],
		index: 0,
		useMagnitude: !1
	};
	let a = i.length > 2 ? 2 : 0;
	return {
		section: i[a],
		index: a,
		useMagnitude: !1
	};
}
function p(e) {
	let t = "", n = "", r = !1, i = !1, a = (e) => {
		r ? n += e : t += e;
	}, o = 0;
	for (; o < e.length;) {
		let t = e[o];
		if (t === "\"") {
			let t = e.indexOf("\"", o + 1);
			a(e.slice(o + 1, t < 0 ? e.length : t)), o = t < 0 ? e.length : t + 1;
		} else if (t === "\\") a(e[o + 1] ?? ""), o += 2;
		else if (t === "_") a(" "), o += 2;
		else if (t === "*") o += 2;
		else if (t === "[") {
			let t = e.indexOf("]", o);
			if (t < 0) return null;
			let n = /^\$([^-\]]*)/.exec(e.slice(o + 1, t));
			n && a(n[1]), o = t + 1;
		} else if (/^general/i.test(e.slice(o, o + 7))) {
			if (r) return null;
			r = !0, o += 7;
		} else if (t === "%") i = !0, a(t), o++;
		else if (/[\s$+\-()/:!^&'~{}<>=]/.test(t)) a(t), o++;
		else return null;
	}
	return r ? {
		prefix: t,
		suffix: n,
		percent: i
	} : null;
}
function m(e) {
	if (e.length >= 4) return 3;
	let t = e[e.length - 1], n = 0;
	for (; n < t.length;) {
		let r = t[n];
		if (r === "\\" || r === "_" || r === "*") n += 2;
		else if (r === "\"") {
			let e = t.indexOf("\"", n + 1);
			n = e < 0 ? t.length : e + 1;
		} else if (r === "[") {
			let e = t.indexOf("]", n);
			n = e < 0 ? t.length : e + 1;
		} else if (r === "@") return e.length - 1;
		else n++;
	}
	return -1;
}
function h(e) {
	let t = [], n = "", r = 0;
	for (; r < e.length;) {
		let i = e[r];
		if (i === "\"") {
			for (n += i, r++; r < e.length && e[r] !== "\"";) n += e[r++];
			r < e.length && (n += e[r++]);
		} else if (i === "\\" || i === "_" || i === "*") n += i, r + 1 < e.length && (n += e[r + 1]), r += 2;
		else if (i === "[") {
			for (n += i, r++; r < e.length && e[r] !== "]";) n += e[r++];
			r < e.length && (n += e[r++]);
		} else i === ";" ? (t.push(n), n = "", r++) : (n += i, r++);
	}
	return t.push(n), t;
}
var g = [
	"January",
	"February",
	"March",
	"April",
	"May",
	"June",
	"July",
	"August",
	"September",
	"October",
	"November",
	"December"
], _ = [
	"Sunday",
	"Monday",
	"Tuesday",
	"Wednesday",
	"Thursday",
	"Friday",
	"Saturday"
], v = [
	"日",
	"月",
	"火",
	"水",
	"木",
	"金",
	"土"
], y = [
	"日曜日",
	"月曜日",
	"火曜日",
	"水曜日",
	"木曜日",
	"金曜日",
	"土曜日"
], b = [
	{
		start: new Date(Date.UTC(2019, 4, 1)),
		abbr: "R",
		short: "令",
		long: "令和"
	},
	{
		start: new Date(Date.UTC(1989, 0, 8)),
		abbr: "H",
		short: "平",
		long: "平成"
	},
	{
		start: new Date(Date.UTC(1926, 11, 25)),
		abbr: "S",
		short: "昭",
		long: "昭和"
	},
	{
		start: new Date(Date.UTC(1912, 6, 30)),
		abbr: "T",
		short: "大",
		long: "大正"
	},
	{
		start: new Date(Date.UTC(1868, 0, 25)),
		abbr: "M",
		short: "明",
		long: "明治"
	}
];
function x(e) {
	for (let t of b) if (e.getTime() >= t.start.getTime()) return {
		abbr: t.abbr,
		short: t.short,
		long: t.long,
		year: e.getUTCFullYear() - t.start.getUTCFullYear() + 1
	};
	let t = b[b.length - 1];
	return {
		abbr: t.abbr,
		short: t.short,
		long: t.long,
		year: e.getUTCFullYear()
	};
}
var S = /^(?:(Q{1,2})|WW(?::([0-6]),([1-7]))?)$/, C = [
	"1st",
	"2nd",
	"3rd",
	"4th"
], w = [
	"第１四半期",
	"第２四半期",
	"第３四半期",
	"第４四半期"
];
function T(e, t, n) {
	let r = 864e5, i = (e) => {
		let i = Date.UTC(e, 0, 1), a = (new Date(i).getUTCDay() - t + 7) % 7, o = i - a * r;
		return 7 - a < n ? o + 7 * r : o;
	}, a = Date.UTC(e.getUTCFullYear(), e.getUTCMonth(), e.getUTCDate()), o = e.getUTCFullYear();
	return a >= i(o + 1) ? o += 1 : a < i(o) && --o, Math.floor((a - i(o)) / (7 * r)) + 1;
}
function E(e, t, n = !1) {
	let r = j(t), a = k(t), s = i(e, n);
	if (!Number.isFinite(e) || !Number.isFinite(e * 864e5) || !r && !s) return "#";
	let c = 10 ** (3 - (a || 3)), l = Math.round(Math.abs(e) * 864e5 / c) * c, u = (e < 0 ? -l : l) / 864e5, d = o(a && (!s || i(u, n)) ? u : e, n), f = d.getUTCFullYear(), p = d.getUTCMonth() + 1, m = d.getUTCDate(), h = d.getUTCDay(), b = r ? Math.floor(l / 36e5) % 24 : d.getUTCHours(), E = r ? Math.floor(l / 6e4) % 60 : d.getUTCMinutes(), D = r ? Math.floor(l / 1e3) % 60 : d.getUTCSeconds(), M = A(t), N = O(t), P = null, F = () => P ??= x(d), I = "", L = 0, R = !1;
	for (; L < t.length;) {
		let n = t[L];
		if (n === "\"") {
			for (L++; L < t.length && t[L] !== "\"";) I += t[L++];
			L < t.length && L++, R = !1;
		} else if (n === "[") {
			let n = t.indexOf("]", L), r = n > L ? t.slice(L + 1, n) : "", i = r.match(/^([hms])\1*$/i);
			if (i) {
				let a = i[1].toLowerCase(), o = e < 0 ? "-" : "", s = Math.floor(l / 1e3), c;
				c = a === "h" ? Math.floor(s / 3600) : a === "m" ? Math.floor(s / 60) : s;
				let u = r.length >= 2 ? String(c).padStart(r.length, "0") : String(c);
				I += o + u, L = n + 1;
				let d = a === "s" ? /^\.(0{1,3})(?!0)/.exec(t.slice(L)) : null;
				if (d) {
					let e = d[1].length;
					I += "." + String(Math.floor(l % 1e3 / 10 ** (3 - e))).padStart(e, "0"), L += d[0].length;
				}
				R = a === "h";
			} else {
				let e = S.exec(r);
				if (e) {
					if (!s) return "#";
					if (e[1]) {
						let t = Math.floor((p - 1) / 3);
						I += e[1].length === 1 ? `Q${t + 1}` : N ? w[t] : `${C[t]} quarter`;
					} else I += String(T(d, Number(e[2] ?? 0), Number(e[3] ?? 1)));
					R = !1;
				}
				for (; L < t.length && t[L] !== "]";) L++;
				L < t.length && L++;
			}
		} else if (n === "_") L += 2;
		else if (n === "*") L += 2;
		else if (n === "\\") {
			let e = t[L + 1];
			e !== void 0 && (I += e), L += 2, e !== ":" && e !== "/" && e !== "-" && e !== "." && e !== " " && (R = !1);
		} else if (n === "y" || n === "Y") {
			if (!s) return "#";
			let e = 0;
			for (; L < t.length && t[L].toLowerCase() === "y";) e++, L++;
			I += e <= 2 ? String(f).slice(-2) : String(f).padStart(4, "0"), R = !1;
		} else if (n === "m" || n === "M") {
			let e = 0;
			for (; L < t.length && t[L].toLowerCase() === "m";) e++, L++;
			let n = t.slice(L).replace(/\[[^\]]*\]/g, "");
			if (R || /^:s/i.test(n)) I += e >= 2 ? String(E).padStart(2, "0") : String(E);
			else {
				if (!s) return "#";
				e === 1 ? I += String(p) : e === 2 ? I += String(p).padStart(2, "0") : e === 3 ? I += g[p - 1].slice(0, 3) : e === 4 ? I += g[p - 1] : I += g[p - 1][0];
			}
			R = !1;
		} else if (n === "d" || n === "D") {
			if (!s) return "#";
			let e = 0;
			for (; L < t.length && t[L].toLowerCase() === "d";) e++, L++;
			e === 1 ? I += String(m) : e === 2 ? I += String(m).padStart(2, "0") : e === 3 ? I += _[h].slice(0, 3) : I += _[h], R = !1;
		} else if (n === "h" || n === "H") {
			let e = 0;
			for (; L < t.length && t[L].toLowerCase() === "h";) e++, L++;
			let n = M ? b % 12 || 12 : b;
			I += e >= 2 ? String(n).padStart(2, "0") : String(n), R = !0;
		} else if (n === "s" || n === "S") {
			let e = 0;
			for (; L < t.length && t[L].toLowerCase() === "s";) e++, L++;
			I += e >= 2 ? String(D).padStart(2, "0") : String(D);
			let n = /^\.(0{1,3})(?!0)/.exec(t.slice(L));
			if (n) {
				let e = n[1].length, t = r ? l % 1e3 : d.getUTCMilliseconds();
				I += "." + String(Math.floor(t / 10 ** (3 - e))).padStart(e, "0"), L += n[0].length;
			}
			R = !1;
		} else if (n === "g" || n === "G") {
			let e = 0;
			for (; L < t.length && t[L].toLowerCase() === "g";) e++, L++;
			if (N) {
				if (!s) return "#";
				let t = F();
				e === 1 ? I += t.abbr : e === 2 ? I += t.short : I += t.long;
			}
			R = !1;
		} else if (n === "e" || n === "E") {
			if (!s) return "#";
			let e = 0;
			for (; L < t.length && t[L].toLowerCase() === "e";) e++, L++;
			if (N) {
				let t = F().year;
				I += e >= 2 ? String(t).padStart(2, "0") : String(t);
			} else I += String(f).padStart(4, "0");
			R = !1;
		} else if (n === "r" || n === "R") {
			if (!s) return "#";
			let e = 0;
			for (; L < t.length && t[L].toLowerCase() === "r";) e++, L++;
			if (N) {
				let t = F();
				I += (e >= 2 ? t.long : "") + String(t.year).padStart(2, "0");
			} else I += String(f).padStart(4, "0");
			R = !1;
		} else if (n === "A" || n === "a") {
			let e = t.slice(L).toUpperCase();
			if (e.startsWith("AAAA")) {
				if (!s) return "#";
				I += y[h], L += 4;
			} else if (e.startsWith("AAA")) {
				if (!s) return "#";
				I += v[h], L += 3;
			} else e.startsWith("AM/PM") ? (I += b < 12 ? "AM" : "PM", L += 5) : e.startsWith("A/P") ? (I += b < 12 ? "A" : "P", L += 3) : (I += n, L++);
			R = !1;
		} else I += n, L++, n !== ":" && n !== "/" && n !== "-" && n !== "." && n !== " " && (R = !1);
	}
	return I;
}
function D(e) {
	let t = [];
	if (/m{3}/i.test(e) && t.push(...g), /d{3}/i.test(e) && t.push(..._), /a{3}/i.test(e) && t.push(...v, ...y), /[ap]/i.test(e) && t.push("AM", "PM", "A", "P"), /\[QQ?\]/.test(e) && t.push("Q", ...C, " quarter", ...w), /g|r{2}/i.test(e) && O(e)) for (let e of b) t.push(e.abbr, e.short, e.long);
	return t;
}
function O(e) {
	let t = 0;
	for (; t < e.length;) {
		let n = e[t];
		if (n === "\\" || n === "_" || n === "*") t += 2;
		else if (n === "\"") {
			let n = e.indexOf("\"", t + 1);
			t = n < 0 ? e.length : n + 1;
		} else if (n === "[") {
			let n = e.indexOf("]", t);
			if (n < 0) break;
			let r = /^\$[^-]*-([0-9a-f]+)$/i.exec(e.slice(t + 1, n));
			if (r && (parseInt(r[1], 16) & 65535) == 1041) return !0;
			t = n + 1;
		} else t++;
	}
	return !1;
}
function k(e) {
	let t = 0;
	for (let n = 0; n < e.length;) {
		let r = e[n];
		if (r === "\\" || r === "_" || r === "*") n += 2;
		else if (r === "[") {
			let r = /^\[s+\]\.(0{1,3})(?!0)/i.exec(e.slice(n));
			r && (t = Math.max(t, r[1].length));
			let i = e.indexOf("]", n + 1);
			n = r ? n + r[0].length : i < 0 ? e.length : i + 1;
		} else if (r === "\"") {
			let t = e.indexOf("\"", n + 1);
			n = t < 0 ? e.length : t + 1;
		} else if (r === "s" || r === "S") {
			let r = /^s+\.(0{1,3})(?!0)/i.exec(e.slice(n));
			if (r) t = Math.max(t, r[1].length), n += r[0].length;
			else for (; n < e.length && e[n].toLowerCase() === "s";) n++;
		} else n++;
	}
	return t;
}
function A(e) {
	let t = 0;
	for (; t < e.length;) {
		let n = e[t];
		if (n === "\\" || n === "_" || n === "*") t += 2;
		else if (n === "\"") {
			let n = e.indexOf("\"", t + 1);
			t = n < 0 ? e.length : n + 1;
		} else if (n === "[") {
			let n = e.indexOf("]", t);
			t = n < 0 ? e.length : n + 1;
		} else if (/^(am\/pm|a\/p)/i.test(e.slice(t))) return !0;
		else t++;
	}
	return !1;
}
function j(e) {
	let t = 0;
	for (; t < e.length;) {
		let n = e[t];
		if (n === "\\" || n === "_" || n === "*") t += 2;
		else if (n === "\"") {
			let n = e.indexOf("\"", t + 1);
			t = n < 0 ? e.length : n + 1;
		} else if (n === "[") {
			let n = e.indexOf("]", t);
			if (n < 0) return !1;
			if (/^([hms])\1*$/i.test(e.slice(t + 1, n))) return !0;
			t = n + 1;
		} else t++;
	}
	return !1;
}
function M(e) {
	let t = 0, n = !1;
	for (; t < e.length;) {
		let r = e[t];
		if (r === "\\" || r === "_" || r === "*") t += 2;
		else if (r === "\"") {
			let n = e.indexOf("\"", t + 1);
			t = n < 0 ? e.length : n + 1;
		} else if (r === "[") {
			let n = e.indexOf("]", t);
			if (n < 0) return !1;
			let r = e.slice(t + 1, n);
			if (/^([hms])\1*$/i.test(r) || S.test(r)) return !0;
			t = n + 1;
		} else if (/^general/i.test(e.slice(t))) t += 7;
		else if (/[ymdhsgr]/i.test(r)) return !0;
		else if (r === "e" || r === "E") {
			if (!n && !/[-+0#?]/.test(e[t + 1] ?? "")) return !0;
			t++;
		} else if (r === "0" || r === "#" || r === "?") n = !0, t++;
		else if (/^(am\/pm|a\/p|a{3,})/i.test(e.slice(t))) return !0;
		else t++;
	}
	return !1;
}
function N(e, t) {
	if (!Number.isFinite(e)) return String(e);
	let n = Math.max(0, Math.trunc(t)), r = e < 0, [i, a = ""] = P(Math.abs(e).toString()).split("."), o = a.padEnd(n + 1, "0"), s = o.slice(0, n), c = o.charCodeAt(n) - 48, l = (i + s).split("").map((e) => e.charCodeAt(0) - 48);
	if (c >= 5) {
		let e = l.length - 1;
		for (; e >= 0; e--) if (l[e] === 9) l[e] = 0;
		else {
			l[e] += 1;
			break;
		}
		e < 0 && l.unshift(1);
	}
	let u = l.map((e) => String(e)).join(""), d = n, f = (d > 0 ? u.slice(0, u.length - d) : u) || "0", p = d > 0 ? u.slice(u.length - d) : "", m = f.replace(/^0+(?=\d)/, ""), h = p.length > 0 ? `${m}.${p}` : m, g = /^[0.]*$/.test(h) && !/[1-9]/.test(h);
	return r && !g ? `-${h}` : h;
}
function P(e) {
	let t = /^(\d+)(?:\.(\d+))?[eE]([+-]?\d+)$/.exec(e);
	if (!t) return e;
	let [, n, r = "", i] = t, a = parseInt(i, 10), o = n + r, s = n.length + a;
	return s <= 0 ? "0." + "0".repeat(-s) + o : s >= o.length ? o + "0".repeat(s - o.length) : o.slice(0, s) + "." + o.slice(s);
}
var F = /* @__PURE__ */ new Map();
function I(e, t = !1, n = typeof navigator > "u" ? void 0 : navigator.language) {
	if (!i(e, t)) return "#";
	let r = n ?? "", a = F.get(r);
	return a || (a = new Intl.DateTimeFormat(n, {
		year: "numeric",
		month: "numeric",
		day: "numeric",
		timeZone: "UTC"
	}), F.set(r, a)), a.format(o(e, t));
}
function L(e = typeof navigator > "u" ? void 0 : navigator.language) {
	let t = new Intl.DateTimeFormat(e, {
		year: "numeric",
		month: "numeric",
		day: "numeric",
		timeZone: "UTC"
	}), n = t.resolvedOptions(), r = (e, n) => {
		let r = [];
		for (let i of e) for (let e of n) r.push(t.format(Date.UTC(i, e, 28)));
		return r;
	}, i = (e, t, n) => Array.from({ length: Math.floor((t - e) / n) + 1 }, (t, r) => e + r * n);
	if (n.calendar !== "gregory" || n.numberingSystem !== "latn") return Object.freeze({
		texts: Object.freeze([
			t.format(Date.UTC(1900, 0, 1)),
			...r(i(1899, 2101, 1), [0, 11]),
			...r(i(2110, 9990, 10), [0])
		]),
		complete: !1
	});
	let a = ["0123456789"];
	for (let e of [
		Date.UTC(1900, 0, 1),
		Date.UTC(2e3, 11, 31),
		Date.UTC(9999, 11, 31)
	]) for (let n of t.formatToParts(e)) if (n.type === "literal") a.push(n.value);
	else if (n.type !== "year" && n.type !== "month" && n.type !== "day" || !/^[0-9]+$/.test(n.value)) return Object.freeze({
		texts: Object.freeze([...a, n.value]),
		complete: !1
	});
	return Object.freeze({
		texts: Object.freeze(a),
		complete: !0
	});
}
function R(e) {
	return Number.isInteger(e) ? String(e) : N(e, 6).replace(/\.?0+$/, "");
}
function z(e, t, n = !1, r) {
	if (!t || H(t)) return R(e / V(r, 0));
	let i = f(e, t);
	if (i === null) return R(e);
	if (i === "none") return "#";
	let a = h(t), o = m(a), s = a.filter((e, t) => t !== o)[i.index];
	if (s === "") return "";
	let c = i.useMagnitude;
	e /= V(r, i.index);
	let l = p(i.section.body);
	if (l) {
		let t = l.percent ? e * 100 : e, n = c ? Math.abs(t) : t;
		return (n < 0 ? "-" : "") + l.prefix + R(Math.abs(n)) + l.suffix;
	}
	return M(s) ? E(c ? -e : e, s, n) : (e < 0 && !c ? "-" : "") + U(Math.abs(e), s);
}
function B(e, t, n = !1, r) {
	if (!t || e.trim() === "") return e;
	let i = Number(e);
	return Number.isFinite(i) ? z(i, t, n, r) : e;
}
function V(e, t) {
	let n = e?.[t];
	return n != null && Number.isFinite(n) && n > 0 ? n : 1;
}
function H(e) {
	return e.trim().toLowerCase() === "general";
}
function U(e, t) {
	let n = [], r = 0, i = !1, a = !1, o = null, s = !1, c = (e) => e === "0" || e === "#" || e === "?";
	for (; r < t.length;) {
		let e = t[r];
		if (e === "\"") {
			r++;
			let e = "";
			for (; r < t.length && t[r] !== "\"";) e += t[r], r++;
			r < t.length && r++, n.push({
				kind: "lit",
				text: e
			});
			continue;
		}
		if (e === "\\" && r + 1 < t.length) {
			n.push({
				kind: "lit",
				text: t[r + 1]
			}), r += 2;
			continue;
		}
		if (e === "_" && r + 1 < t.length) {
			n.push({
				kind: "lit",
				text: " "
			}), r += 2;
			continue;
		}
		if (e === "*" && r + 1 < t.length) {
			r += 2;
			continue;
		}
		if (e === "[") {
			for (r++; r < t.length && t[r] !== "]";) r++;
			r < t.length && r++;
			continue;
		}
		if (e === "%") {
			a = !0, n.push({
				kind: "lit",
				text: "%"
			}), r++;
			continue;
		}
		if (e === "#" || e === "0" || e === "." || e === "," || e === "?") {
			let e = "";
			for (; r < t.length && (t[r] === "#" || t[r] === "0" || t[r] === "." || t[r] === "," || t[r] === "?");) e += t[r], r++;
			n.push({
				kind: "num",
				text: e
			}), i = !0;
			continue;
		}
		if ((e === "E" || e === "e") && i && !o && !s && (t[r + 1] === "+" || t[r + 1] === "-") && c(t[r + 2])) {
			let e = r + 2, i = 0;
			for (; c(t[e]);) t[e] === "0" && i++, e++;
			o = {
				plus: t[r + 1] === "+",
				digits: i
			}, n.push({
				kind: "exp",
				text: ""
			}), r = e;
			continue;
		}
		if (e === "/" && !s && !o && n[n.length - 1]?.kind === "num" && (c(t[r + 1]) || /[1-9]/.test(t[r + 1] ?? ""))) {
			let e = r + 1;
			for (; c(t[e]) || /[0-9]/.test(t[e] ?? "");) e++;
			s = !0, n.push({
				kind: "slash",
				text: "/"
			}, {
				kind: "den",
				text: t.slice(r + 1, e)
			}), r = e;
			continue;
		}
		n.push({
			kind: "lit",
			text: e
		}), r++;
	}
	if (!i) return n.map((e) => e.text).join("");
	let l = a ? e * 100 : e;
	if (s) return G(l, n);
	if (o) {
		let e = "";
		for (let t of n) t.kind === "num" && (e += t.text);
		let t = Math.max(1, (e.split(".")[0].match(/[#0?]/g) ?? []).length), [r, i] = l === 0 ? ["0", "0"] : l.toExponential().split("e"), a = Math.floor(Number(i) / t) * t, s = K(Number(`${r}e${Number(i) - a}`), e);
		Number(s.replace(/,/g, "")) >= 10 ** t && (a += t, s = K(Number(`${r}e${Number(i) - a}`), e));
		let c = `E${a < 0 ? "-" : o.plus ? "+" : ""}${String(Math.abs(a)).padStart(o.digits, "0")}`, u = !1;
		return n.map((e) => e.kind === "lit" ? e.text : e.kind === "exp" ? c : u ? "" : (u = !0, s)).join("");
	}
	let u = "";
	for (let e of n) e.kind === "num" && (u += e.text);
	let d = K(l, u), f = !1;
	return n.map((e) => e.kind === "lit" ? e.text : f ? "" : (f = !0, d)).join("");
}
function W(e, t) {
	let [n, r, i, a] = [
		0,
		1,
		1,
		0
	], o = e;
	for (let e = 0; e < 64; e++) {
		let e = Math.floor(o), s = r + e * a;
		if (s > t) break;
		[n, r, i, a] = [
			i,
			a,
			n + e * i,
			s
		];
		let c = o - e;
		if (c < 1e-12) return [i, a];
		o = 1 / c;
	}
	let s = Math.floor((t - r) / a), [c, l] = [n + s * i, r + s * a];
	return Math.abs(c / l - e) < Math.abs(i / a - e) ? [c, l] : [i, a];
}
function G(e, t) {
	let n = t.findIndex((e) => e.kind === "slash"), r = n - 1, i = t[n + 1].text, a = t.slice(0, r).filter((e) => e.kind === "num"), o = a.length > 0, s = /^[0-9]+$/.test(i) && Number(i) > 0 ? Number(i) : null, c = o ? Math.floor(e) : 0, l = e - c, [u, d] = s === null ? W(l, 10 ** Math.min(i.length, 7) - 1) : [Math.round(l * s), s], f = c;
	o && u >= d && (f += 1, u -= d);
	let p = o ? K(f, a.map((e) => e.text).join("")) : "", m = t.findIndex((e) => e.kind === "num"), h = o && (f !== 0 || u === 0), g = !o || u !== 0;
	return t.map((e, t) => o && t > m && t < r ? h && g && e.kind === "lit" ? e.text : "" : t === m && o ? h ? p || "0" : "" : t === r ? g ? String(u) : "" : e.kind === "slash" ? g ? "/" : "" : e.kind === "den" ? g ? String(d) : "" : e.kind === "lit" ? e.text : "").join("");
}
function K(e, t) {
	let n = t.indexOf("."), r = n >= 0 ? t.slice(0, n) : t, i = n >= 0 ? t.slice(n + 1) : "", a = /,/.test(r), o = (i.match(/[#0?]/g) ?? []).length, s = (r.replace(/,/g, "").match(/0/g) ?? []).length, [c, l = ""] = N(e, o).split("."), u = c.padStart(s, "0"), d = a ? u.replace(/\B(?=(\d{3})+(?!\d))/g, ",") : u;
	return o === 0 ? d : `${d}.${l.padEnd(o, "0")}`;
}
export { L as a, E as c, f as d, h as f, s as g, i as h, I as i, p as l, o as m, R as n, N as o, m as p, z as r, D as s, B as t, M as u };
