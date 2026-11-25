import { r as e } from "./local-metrics-PuMOXgAD.js";
import { r as t } from "./office-fallback-O-L6rrDh.js";
var n = (e) => t(e), r = class {
	probe;
	installed = /* @__PURE__ */ new Map();
	constructor(e = n) {
		this.probe = e;
	}
	async exclude(t) {
		let n = [...new Set(t.families.map(e))].filter((e) => !this.installed.has(e));
		if (n.length) {
			let r = new Map(t.families.map((t) => [e(t), t])), i = this.probe(n.map((e) => r.get(e))).catch(() => ({
				installed: /* @__PURE__ */ new Set(),
				checked: /* @__PURE__ */ new Set()
			}));
			for (let e of n) {
				let t = i.then(({ installed: t, checked: n }) => n.has(e) ? t.has(e) : void 0);
				this.installed.set(e, t), t.then((n) => {
					n === void 0 && this.installed.get(e) === t && this.installed.delete(e);
				});
			}
		}
		let r = await Promise.all(t.families.map(async (t) => await this.installed.get(e(t)) === !1)), i = t.families.filter((e, t) => r[t]);
		return i.length === t.families.length ? t : Object.freeze({
			...t,
			families: Object.freeze(i)
		});
	}
};
export { r as t };
