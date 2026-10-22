import {
	Array as Arr,
	type Cause,
	Option,
	Predicate,
	Record,
	Result,
	Schema,
	type SchemaIssue
} from "effect"

/** Closed classifications by `_tag` or `name`, never arbitrary messages, stacks, URLs or nested
 * provider bodies. A tagged error the application defines gets a row here; any other is
 * `unknown`, which still says the failure happened. */
const FAILURE_CODES = {
	OperationalTelemetryProviderConflict: "telemetry-provider-conflict",
	TelemetryFlushFailure: "telemetry-flush-failed",
	PostgresStatementRejected: "postgres-statement",
	PostgresTransientFailure: "postgres-transient",
	PostgresConnectRejected: "postgres-connect",
	ConfigError: "runtime-config",
	SchemaError: "runtime-schema-admission",
	NoSuchElementError: "runtime-no-such-element",
	UnknownError: "runtime-unknown-error",
	AssertionError: "runtime-assertion",
	Error: "runtime-error",
	TypeError: "runtime-type-error",
	RangeError: "runtime-range-error",
	ReferenceError: "runtime-reference-error",
	SyntaxError: "runtime-syntax-error",
	EvalError: "runtime-eval-error",
	URIError: "runtime-uri-error",
	AggregateError: "runtime-aggregate-error",
	AbortError: "aborted",
	TimeoutError: "timeout"
} as const
type BaseCode = (typeof FAILURE_CODES)[keyof typeof FAILURE_CODES]

/** Operational taxonomy, not a second domain protocol: a base code refined by one closed field of
 * its error. An unrecognized detail keeps the base code. */
const DETAIL_CODES = {
	"postgres-statement": {
		field: "operation",
		codes: {
			statement: "postgres-statement-rejected",
			transaction: "postgres-transaction-boundary"
		}
	},
	"postgres-transient": {
		field: "reason",
		codes: {
			"serialization-failure": "postgres-serialization-failure",
			deadlock: "postgres-deadlock"
		}
	}
} as const satisfies Partial<
	Record<BaseCode, Readonly<{ field: string; codes: Readonly<Record<string, string>> }>>
>

type DetailCode = {
	[
		Base in keyof typeof DETAIL_CODES
	]: (typeof DETAIL_CODES)[Base]["codes"][keyof (typeof DETAIL_CODES)[Base]["codes"]]
}[keyof typeof DETAIL_CODES]

const ErrorCode = Schema.Literals([
	...Record.values(FAILURE_CODES),
	...Arr.flatMap(
		Record.values(DETAIL_CODES),
		({ codes }: Readonly<{ codes: Readonly<Record<string, DetailCode>> }>) => Record.values(codes)
	),
	"unknown"
])
type ErrorCode = typeof ErrorCode.Type
export const FailureCode = Schema.Literals([...ErrorCode.literals, "interrupted"])
export type FailureCode = typeof FailureCode.Type

/** Reason kind and multiplicity survive; raw errors and interrupt identities do not. */
const FailureReason = Schema.Union([
	Schema.Struct({ kind: Schema.Literal("fail"), code: ErrorCode }),
	Schema.Struct({ kind: Schema.Literal("die"), code: ErrorCode }),
	Schema.Struct({ kind: Schema.Literal("interrupt") })
])
type FailureReason = typeof FailureReason.Type

/** The same tables, read by an arbitrary tag, code and detail. */
const FAILURE_CODE_BY_TAG: Readonly<Record<string, BaseCode>> = FAILURE_CODES
const DETAIL_CODE_BY_BASE: Readonly<
	Record<string, Readonly<{ field: string; codes: Readonly<Record<string, ErrorCode>> }>>
> = DETAIL_CODES

const codeOfTag = (tag: unknown): Option.Option<BaseCode> =>
	typeof tag === "string" ? Record.get(FAILURE_CODE_BY_TAG, tag) : Option.none()

/** The base code refined by its error's detail field, when the table names one. */
const refinedCode = (error: object, code: BaseCode): ErrorCode => {
	const details = Record.get(DETAIL_CODE_BY_BASE, code)
	if (Option.isNone(details)) {
		return code
	}
	const detail: unknown = Reflect.get(error, details.value.field)
	const refined =
		typeof detail === "string" ? Record.get(details.value.codes, detail) : Option.none()
	return Option.getOrElse(refined, (): ErrorCode => code)
}

const classifyFailure = (error: unknown): ErrorCode => {
	if (typeof error !== "object" || error === null) {
		return "unknown"
	}
	const base = Option.orElse(codeOfTag(Reflect.get(error, "_tag")), () =>
		codeOfTag(Reflect.get(error, "name"))
	)
	return Option.match(base, {
		onNone: (): ErrorCode => "unknown",
		onSome: (code) => refinedCode(error, code)
	})
}

/** A hostile accessor on an external error must not replace the original operation's failure. */
const failureCodeOf = (error: unknown): ErrorCode =>
	Result.getOrElse(
		Result.try(() => classifyFailure(error)),
		(): ErrorCode => "unknown"
	)

/**
 * One refused leaf of a Schema admission: where in the input it was refused, the issue's kind,
 * and what the schema expected there. Never the input: an issue's `actual` and its formatted
 * message quote the refused value, which may be a credential or a user's words. `expected` comes
 * from the schema (an AST tag or a filter's own description), not from the value.
 */
const AdmissionIssue = Schema.Struct({
	path: Schema.String,
	issue: Schema.Literals([
		"InvalidType",
		"InvalidValue",
		"MissingKey",
		"UnexpectedKey",
		"Forbidden",
		"OneOf",
		"AnyOf",
		"Filter"
	]),
	expected: Schema.String
})
type AdmissionIssue = typeof AdmissionIssue.Type

/** A key a schema declares reads as itself; any other key (a record's, which is data) is masked. */
const DECLARED_KEY = /^[A-Za-z_][A-Za-z0-9_]*$/

const pathSegment = (key: PropertyKey): string => {
	if (typeof key === "number") {
		return `[${key}]`
	}
	return typeof key === "string" && DECLARED_KEY.test(key) ? `.${key}` : "[*]"
}

const admissionLeaves = (issue: SchemaIssue.Issue, path: string): readonly AdmissionIssue[] => {
	const at = path === "" ? "$" : `$${path}`
	switch (issue._tag) {
		case "Pointer":
			return admissionLeaves(issue.issue, path + Arr.join(Arr.map(issue.path, pathSegment), ""))
		case "Composite":
			return Arr.flatMap(issue.issues, (inner) => admissionLeaves(inner, path))
		case "Encoding":
			return admissionLeaves(issue.issue, path)
		case "AnyOf":
			return Arr.isReadonlyArrayNonEmpty(issue.issues)
				? Arr.flatMap(issue.issues, (inner) => admissionLeaves(inner, path))
				: [{ path: at, issue: "AnyOf", expected: issue.ast._tag }]
		case "Filter":
			return [
				{ path: at, issue: "Filter", expected: expectedOf(issue.filter.annotations, "filter") }
			]
		case "InvalidType":
			return [{ path: at, issue: "InvalidType", expected: issue.ast._tag }]
		case "InvalidValue":
			return [{ path: at, issue: "InvalidValue", expected: expectedOf(issue.annotations, "value") }]
		case "MissingKey":
			return [{ path: at, issue: "MissingKey", expected: "key" }]
		case "UnexpectedKey":
			return [{ path: at, issue: "UnexpectedKey", expected: "no key" }]
		case "Forbidden":
			return [{ path: at, issue: "Forbidden", expected: "permitted" }]
		case "OneOf":
			return [{ path: at, issue: "OneOf", expected: issue.ast._tag }]
	}
}

/** A schema's own `expected` annotation, else the leaf's kind. */
const expectedOf = (
	annotations: Readonly<{ expected?: string | undefined }> | undefined,
	fallback: string
): string => {
	const expected = annotations?.expected
	return typeof expected === "string" ? expected : fallback
}

/** The refused leaves of a Schema admission failure, else none. Decoding stops at the first
 * error by default, so the tree holds one path per union member tried. */
const admissionIssuesOf = (error: unknown): readonly AdmissionIssue[] =>
	Result.getOrElse(
		Result.try(() => (Schema.isSchemaError(error) ? admissionLeaves(error.issue, "") : [])),
		(): readonly AdmissionIssue[] => []
	)

/** Never squash, stringify, or walk nested causes: they may contain credentials or user data. */
const failureReasonsOf = (cause: Cause.Cause<unknown>): readonly FailureReason[] =>
	Arr.map(cause.reasons, (reason): FailureReason => {
		switch (reason._tag) {
			case "Fail":
				return { kind: "fail", code: failureCodeOf(reason.error) }
			case "Die":
				return { kind: "die", code: failureCodeOf(reason.defect) }
			case "Interrupt":
				return { kind: "interrupt" }
		}
	})

/** Deliberately lossy metric labels, not evidence of Cause kind or multiplicity. */
export const failureCodesOf = (cause: Cause.Cause<unknown>): readonly FailureCode[] =>
	Arr.dedupe(
		Arr.map(failureReasonsOf(cause), (reason): FailureCode =>
			reason.kind === "interrupt" ? "interrupted" : reason.code
		)
	)

/** The failed value of a reason: a typed failure's error, a defect's thrown value. */
const failedValueOf = (reason: Cause.Reason<unknown>): Option.Option<unknown> => {
	switch (reason._tag) {
		case "Fail":
			return Option.some(reason.error)
		case "Die":
			return Option.some(reason.defect)
		case "Interrupt":
			return Option.none()
	}
}

const tagOf = (error: unknown): Option.Option<string> => {
	if (typeof error !== "object" || error === null) {
		return Option.none()
	}
	const tag: unknown = Reflect.get(error, "_tag")
	if (typeof tag === "string") {
		return Option.some(tag)
	}
	const name: unknown = Reflect.get(error, "name")
	return typeof name === "string" ? Option.some(name) : Option.none()
}

/** The first failure's type: a tagged error's `_tag`, a native error's class name. A hostile
 * accessor on an external error yields no tag rather than a second failure. */
const failureTagOf = (cause: Cause.Cause<unknown>): string =>
	Option.getOrElse(
		Arr.findFirst(cause.reasons, (reason) =>
			Result.getOrElse(
				Result.try(() => Option.flatMap(failedValueOf(reason), tagOf)),
				() => Option.none<string>()
			)
		),
		() => "EffectFailure"
	)

/** A PostgreSQL SQLSTATE as the wire spells it: five digits or upper-case letters. */
export const SqlState = Schema.String.check(Schema.isPattern(/^[0-9A-Z]{5}$/)).pipe(
	Schema.brand("SqlState")
)
export type SqlState = typeof SqlState.Type

const isSqlState = Schema.is(SqlState)

/** The admitted PostgreSQL diagnostic a failure carries, recognized by shape rather than class
 * (Next's error hook runs in its own bundle copy of the database modules): a statement or
 * transaction rejection holds it as `diagnostic`, a connect rejection under its `failure`. */
const diagnosticOf = (value: unknown): unknown => {
	if (Predicate.hasProperty(value, "diagnostic")) {
		return value.diagnostic
	}
	if (
		Predicate.hasProperty(value, "failure") &&
		Predicate.hasProperty(value.failure, "diagnostic")
	) {
		return value.failure.diagnostic
	}
	return undefined
}

/** The SQLSTATE PostgreSQL answered, when the failure's diagnostic is one. */
const sqlStateOf = (value: unknown): Option.Option<string> => {
	const diagnostic = diagnosticOf(value)
	if (
		!Predicate.hasProperty(diagnostic, "kind") ||
		diagnostic.kind !== "sqlstate" ||
		!Predicate.hasProperty(diagnostic, "sqlState")
	) {
		return Option.none()
	}
	const sqlState = diagnostic.sqlState
	return isSqlState(sqlState) ? Option.some(sqlState) : Option.none()
}

/** What a reporter logs about any cause: its closed failure reasons, the SQLSTATEs PostgreSQL
 * answered and where a Schema admission refused its input, never the cause itself. */
export const loggedFailureOf = (cause: Cause.Cause<unknown>) => {
	const values = Arr.getSomes(Arr.map(cause.reasons, failedValueOf))
	return {
		reasons: failureReasonsOf(cause),
		sqlStates: Arr.dedupe(
			Arr.getSomes(
				Arr.map(values, (value) =>
					Result.getOrElse(
						Result.try(() => sqlStateOf(value)),
						() => Option.none<string>()
					)
				)
			)
		),
		admission: Arr.flatMap(values, admissionIssuesOf)
	}
}

/** The carrier of a failure's closed identity to Error Tracking: a real `Error`, because PostHog's
 * coercer rewrites a plain object's value and manufactures a synthetic SDK stack. Its stack is
 * exactly its header line, non-empty (no synthetic replacement) yet parsing to zero frames. */
class FailureException extends Schema.Error<FailureException, { readonly brand: unique symbol }>(
	"FailureException"
)({
	message: Schema.String,
	stack: Schema.String
}) {}

/** What a failed span's exception event and an Error Tracking event may say about a cause: its
 * tag as the type and its comma-joined failure codes as the value. No cause message and no
 * frames: a Schema error quotes the value it refused and a provider body can quote the user, so
 * only the closed vocabularies above leave the process. Log bodies keep the whole cause through
 * `serializeEvidence`. The type is the failure's own tag, so it is defined on the carrier rather
 * than declared as a field. */
export const failureExceptionOf = (cause: Cause.Cause<unknown>): Error => {
	const name = failureTagOf(cause)
	const message = Arr.join(failureCodesOf(cause), ",")
	return Object.defineProperty(
		FailureException.make({ message, stack: `${name}: ${message}` }),
		"name",
		{ value: name }
	)
}
