import type { Attributes } from "@opentelemetry/api"
import type { ReadableSpan } from "@opentelemetry/sdk-trace-base"
import { Array as Arr, Formatter, Option, Predicate, Record, Schema, String as Str } from "effect"
import { SqlState } from "#failure.ts"
import type { SharedAttributes } from "#schema.ts"

/** Three fields of a PostgreSQL error report quote the failing statement's data rather than
 * describe the failure: DETAIL ("Key (...)=(...)", "Failing row contains (...)"), WHERE (the
 * PL/pgSQL context with its variable values) and the internal query. Row values can be a user's
 * words, so a diagnostic crosses with its SQLSTATE, message, hint and object names only.
 * https://www.postgresql.org/docs/current/protocol-error-fields.html */
const POSTGRES_ROW_VALUE_FIELDS: ReadonlySet<string> = new Set(["detail", "where", "internalQuery"])

const isSqlState = Schema.is(SqlState)

/** A PostgreSQL error report is recognized by protocol, not content: its `code` is a SQLSTATE. */
const isPostgresErrorReport = (item: object): boolean => isSqlState(Reflect.get(item, "code"))

const withoutPostgresRowValues = (
	entries: readonly (readonly [string, unknown])[]
): readonly (readonly [string, unknown])[] =>
	Arr.filter(entries, ([name]) => !POSTGRES_ROW_VALUE_FIELDS.has(name))

/** Every own property of a native error, its non-enumerable `message`, `stack` and `cause`
 * included, which JSON alone would drop. */
const errorEntries = (error: Error): readonly (readonly [string, unknown])[] =>
	Arr.map(Object.getOwnPropertyNames(error), (name) => [name, Reflect.get(error, name)] as const)

const evidenceOf = (item: unknown): unknown => {
	if (Error.isError(item)) {
		const entries = errorEntries(item)
		return Record.fromEntries(
			isPostgresErrorReport(item) ? withoutPostgresRowValues(entries) : entries
		)
	}
	if (typeof item === "object" && item !== null && !Arr.isArray(item)) {
		return isPostgresErrorReport(item)
			? Record.fromEntries(withoutPostgresRowValues(Record.toEntries({ ...item })))
			: item
	}
	return typeof item === "bigint" ? item.toString() : item
}

/** JSON evidence for log bodies and export receipts preserves the source value, including native
 * Error properties, except the PostgreSQL report fields that carry row values. Spans and Error
 * Tracking never see a cause's message or stack: a failed span leaves the process as its tag and
 * failure codes only (`failureExceptionOf`). Secrets belong in Effect Redacted values at their
 * source, never in a regex scrubber. */
export const serializeEvidence = (value: unknown): string | undefined =>
	JSON.stringify(value, (...[, item]: readonly [string, unknown]) => evidenceOf(item))

/** An array slot a native attribute admits: the array's one scalar kind, or a nullish hole. */
const isNativeSlot = (kind: "string" | "number" | "boolean") =>
	Predicate.or(Predicate.isNullish, (item: unknown) => typeof item === kind)

/** The values every OTLP exporter encodes natively: scalars and homogeneous arrays, including
 * their nullish slots. Anything else reaches an exporter as JSON text. */
type NativeAttributeValue =
	| string
	| number
	| boolean
	| Array<string | null | undefined>
	| Array<number | null | undefined>
	| Array<boolean | null | undefined>
	| undefined
export type NativeAttributes = Readonly<Record<string, NativeAttributeValue>>

/** Structured evidence is serialized only when the destination needs attributes. */
const isNativeAttribute = (value: unknown): value is NativeAttributeValue => {
	if (
		value === undefined ||
		typeof value === "string" ||
		typeof value === "number" ||
		typeof value === "boolean"
	) {
		return true
	}
	return (
		Arr.isArray(value) &&
		Arr.some(["string", "number", "boolean"] as const, (kind) =>
			Arr.every(value, isNativeSlot(kind))
		)
	)
}

export const telemetryAttributes = (values: Readonly<Record<string, unknown>>): NativeAttributes =>
	Record.map(values, (value) => (isNativeAttribute(value) ? value : Formatter.formatJson(value)))

/** Logs retain the complete record in their body once. Native scalar fields are
 * searchable; duplicating nested JSON into attributes adds bytes without evidence. */
export const searchableTelemetryAttributes = (
	values: Readonly<Record<string, unknown>>
): NativeAttributes => Record.filter(values, isNativeAttribute)

export const definedAttributes = (attributes: Attributes): Attributes =>
	Record.filter(attributes, (value) => value !== undefined)

/** The coordinates every child span inherits and every sink spells one way: the Effect tracer
 * copies them onto each Effect child (`effect.ts`), the span processor onto each SDK child, fetch
 * and PostgreSQL spans included (`remote.ts`), and `metrics.ts` counts their presence. */
export const CORRELATION_KEYS = [
	"session.id"
] as const satisfies readonly (keyof SharedAttributes)[]

/** The correlation coordinates of one attribute set, with PostHog's protocol aliases for the
 * replay session. Aliases, not content rules: one representation serves logs and tracing. */
export const correlationAttributes = (
	attributes: Readonly<Record<string, unknown>>
): Readonly<Record<string, string | undefined>> => {
	const session: unknown = attributes["session.id"]
	const replay = typeof session === "string" ? session : undefined
	return { "session.id": replay, sessionId: replay, $session_id: replay }
}

/** An outbound HTTP request as its span admits it: the method, the parsed request URL and the
 * caller's declared route template. `@vercel/otel/fetch` names every client span
 * `{fetch|http} {method} {full URL}` and records that URL as `http.url`, so a query string would
 * reach PostHog verbatim.
 * https://github.com/vercel/otel/blob/main/packages/otel/src/instrumentations/fetch.ts */
type HttpClientRequest = Readonly<{
	method: string | undefined
	url: URL
	template: string | undefined
}>

const stringAttribute = (attributes: Attributes, key: string): string | undefined => {
	const value = attributes[key]
	return typeof value === "string" ? value : undefined
}

const httpClientRequestOf = (attributes: Attributes): HttpClientRequest | undefined => {
	const raw = stringAttribute(attributes, "http.url")
	const url = raw === undefined ? null : URL.parse(raw)
	if (url === null) {
		return undefined
	}
	return {
		method: stringAttribute(attributes, "http.method"),
		url,
		template: stringAttribute(attributes, "url.template")
	}
}

type ExportedIdentity = Readonly<{ name: string; attributes: Attributes }>

/** Request-line attributes whose value may end in a query string. Next's server span records the
 * raw request target as `http.target` and `@vercel/otel` copies the inbound `Referer` onto the
 * root span; Next's request-error hook reports a path with its query. Only the path crosses; the
 * query, like a client URL's, stays in the process. `url.query` is the query itself.
 * https://opentelemetry.io/docs/specs/semconv/http/http-spans/#http-server-semantic-conventions */
const QUERY_BEARING_ATTRIBUTES = ["http.target", "http.route", "http.referer", "url.full"] as const

const withoutQuery = (value: string): string =>
	Option.getOrElse(Arr.head(Str.split(value, "?")), () => value)

const queryFreeAttributes = (attributes: Attributes): Attributes =>
	Record.fromEntries([
		...Arr.flatMap(QUERY_BEARING_ATTRIBUTES, (key) => {
			const value = attributes[key]
			return typeof value === "string" ? [[key, withoutQuery(value)] as const] : []
		}),
		...("url.query" in attributes ? [["url.query", undefined] as const] : [])
	])

/** An HTTP client span is named by its method and route template, or by its server address when
 * the caller declared no template (the HTTP client naming convention, with the address standing
 * in for an absent template). The native name is discarded, so no path or query reaches a span
 * name. The URL attribute keeps origin and path, the value of the library's own `resource.name`.
 * https://opentelemetry.io/docs/specs/semconv/http/http-spans/#name */
const exportedIdentityOf = (span: ReadableSpan): ExportedIdentity => {
	const request = httpClientRequestOf(span.attributes)
	if (request === undefined) {
		return { name: withoutQuery(span.name), attributes: queryFreeAttributes(span.attributes) }
	}
	const route = request.template === undefined ? request.url.host : request.template
	const name = request.method === undefined ? route : `${request.method} ${route}`
	return {
		name,
		attributes: {
			...queryFreeAttributes(span.attributes),
			"http.url": `${request.url.origin}${request.url.pathname}`,
			"server.address": request.url.hostname
		}
	}
}

/** The native span with its request identity query-free and PostHog's session coordinates added.
 * Built at export time only, never at span end. */
export const operationalSpan = (span: ReadableSpan): ReadableSpan => {
	const identity = exportedIdentityOf(span)
	const attributes = { ...span.attributes, ...identity.attributes }
	const parent = span.parentSpanContext
	return {
		name: identity.name,
		kind: span.kind,
		spanContext: () => span.spanContext(),
		...(parent === undefined ? {} : { parentSpanContext: parent }),
		startTime: span.startTime,
		endTime: span.endTime,
		duration: span.duration,
		ended: span.ended,
		status: span.status,
		attributes: { ...attributes, ...definedAttributes(correlationAttributes(attributes)) },
		links: span.links,
		events: span.events,
		resource: span.resource,
		instrumentationScope: span.instrumentationScope,
		droppedAttributesCount: span.droppedAttributesCount,
		droppedEventsCount: span.droppedEventsCount,
		droppedLinksCount: span.droppedLinksCount
	}
}
