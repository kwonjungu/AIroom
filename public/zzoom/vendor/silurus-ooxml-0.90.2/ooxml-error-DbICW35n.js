var e = class e extends Error {
	code;
	details;
	violation;
	constructor(t, n, r) {
		super(n), this.name = "OoxmlError", this.code = t, t === "unsupported-content" && r && "format" in r && (this.details = Object.freeze({
			format: r.format,
			reason: r.reason
		})), t === "font-source-limit" && r && "quota" in r && (this.violation = Object.freeze({
			resource: "font-source",
			quota: r.quota,
			metric: r.metric,
			limit: r.limit,
			observed: r.observed
		})), Object.setPrototypeOf(this, e.prototype);
	}
}, t = class e extends Error {
	code = "ooxml-resource-limit";
	details;
	constructor(t, n) {
		super(t), this.name = "OoxmlResourceLimitError";
		let r = n.violation, i = Object.freeze({
			format: r.format,
			operation: r.operation,
			resource: r.resource,
			metric: r.metric,
			...r.part === void 0 ? {} : { part: r.part },
			limit: r.limit,
			observed: r.observed,
			configurable: r.configurable,
			usage: Object.freeze({
				archiveEntryCount: r.usage.archiveEntryCount,
				declaredInflatedBytes: r.usage.declaredInflatedBytes,
				...r.usage.largestInflatedEntryBytes === void 0 ? {} : { largestInflatedEntryBytes: r.usage.largestInflatedEntryBytes },
				distinctInflatedBytes: r.usage.distinctInflatedBytes,
				operationInflatedBytes: r.usage.operationInflatedBytes
			})
		});
		this.details = Object.freeze({
			stage: n.stage,
			violation: i
		}), Object.setPrototypeOf(this, e.prototype);
	}
};
export { t as n, e as t };
