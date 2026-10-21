import { type Attributes, SpanKind, SpanStatusCode } from "@opentelemetry/api"
import type { ReadableLogRecord } from "@opentelemetry/sdk-logs"
import type { ReadableSpan } from "@opentelemetry/sdk-trace-base"
import { Array as Arr, Effect, Predicate, Record, Schema, String as Str } from "effect"
import { correlationAttributes, searchableTelemetryAttributes } from "#span-export.ts"

/** Even one byte of payload does not fit beside the record's own envelope: the record is refused
 * whole rather than reinterpreted by the receiver. */
export class TelemetryEvidenceEnvelopeTooLarge extends Schema.TaggedError<
	TelemetryEvidenceEnvelopeTooLarge,
	{ readonly brand: unique symbol }
>()("TelemetryEvidenceEnvelopeTooLarge", {}) {}

/** One record too large for a single packet, its exact native bytes, and the packet admission
 * test each part must pass. */
export type Oversized<T> = Readonly<{
	item: T
	serialized: Uint8Array
	fits: (part: T) => boolean
}>

type Evidence = Readonly<{ sha256: string; bytes: number }>
type Part = Readonly<{ offset: number; end: number }>

const textEncoder = new TextEncoder()

/** SHA-256 through the platform's Web Crypto, hex encoded. */
const digest = (data: Uint8Array | string): Effect.Effect<string> => {
	const bytes = typeof data === "string" ? textEncoder.encode(data) : Uint8Array.from(data)
	return Effect.promise(() => crypto.subtle.digest("SHA-256", bytes)).pipe(
		Effect.map((hash) => Buffer.from(hash).toString("hex"))
	)
}

const manifest = (evidence: Evidence, count: number): Attributes => ({
	"superstarter.evidence.format": "otlp-json-base64",
	"superstarter.evidence.sha256": evidence.sha256,
	"superstarter.evidence.bytes": evidence.bytes,
	"superstarter.evidence.parts": count
})

type PartOf<T> = (metadata: Attributes, payload: string, offset: number) => Effect.Effect<T>

/** Split exact native OTLP bytes, not character estimates. Probe envelopes with the maximum
 * possible part/index cardinality (one part per source byte), then verify every final envelope.
 * Base64 permits arbitrary byte boundaries and has no JSON escaping expansion. Every part uses
 * the original payload's checksum. */
const evidenceRecords = <T>(
	oversized: Readonly<{ serialized: Uint8Array; fits: (record: T) => boolean }>,
	original: (metadata: Attributes) => T,
	part: PartOf<T>
): Effect.Effect<readonly T[], TelemetryEvidenceEnvelopeTooLarge> =>
	Effect.gen(function* () {
		const { serialized, fits } = oversized
		const evidence = { sha256: yield* digest(serialized), bytes: serialized.byteLength }
		const bytes = Buffer.from(serialized)
		const record = (range: Part, index: number, count: number) =>
			part(
				{
					...manifest(evidence, count),
					"superstarter.evidence.part.index": index,
					"superstarter.evidence.part.offset": range.offset,
					"superstarter.evidence.part.bytes": range.end - range.offset
				},
				bytes.subarray(range.offset, range.end).toString("base64"),
				range.offset
			)
		const admit = (
			range: Part
		): Effect.Effect<readonly Part[], TelemetryEvidenceEnvelopeTooLarge> =>
			Effect.gen(function* () {
				if (fits(yield* record(range, bytes.byteLength, bytes.byteLength))) {
					return [range]
				}
				if (range.end - range.offset <= 1) {
					return yield* TelemetryEvidenceEnvelopeTooLarge.make({})
				}
				const middle = range.offset + Math.ceil((range.end - range.offset) / 2)
				const head = yield* admit({ offset: range.offset, end: middle })
				const tail = yield* admit({ offset: middle, end: range.end })
				return [...head, ...tail]
			})
		const admitted = yield* admit({ offset: 0, end: bytes.byteLength })
		const parts = yield* Effect.forEach(admitted, (range, index) =>
			record(range, index, admitted.length)
		)
		const records = [original(manifest(evidence, admitted.length)), ...parts]
		if (!Arr.every(records, fits)) {
			return yield* TelemetryEvidenceEnvelopeTooLarge.make({})
		}
		return records
	})

/** Retain native numbers on the original operation only. Its complete serialized source
 * (including every omitted field) remains in the evidence. */
const numericAttributes = (attributes: Readonly<Record<string, unknown>>): Attributes =>
	Record.filter(attributes, Predicate.or(Predicate.isNumber, Predicate.isBoolean))

/** Parts are generic child spans. Their explicit source coordinates refer to the original span;
 * no new operation identity is invented. Native events remain on the original manifest because
 * PostHog derives error properties from exception events. If that event/resource/status envelope
 * alone cannot fit, the span is refused rather than reinterpreted by the receiver.
 * https://github.com/PostHog/posthog/blob/master/rust/capture/src/otel/error_status.rs */
export const spanEvidenceParts = ({
	item: span,
	serialized,
	fits
}: Oversized<ReadableSpan>): Effect.Effect<
	readonly ReadableSpan[],
	TelemetryEvidenceEnvelopeTooLarge
> => {
	const source = span.spanContext()
	const coordinates = {
		...correlationAttributes(span.attributes),
		"superstarter.evidence.source.trace_id": source.traceId,
		"superstarter.evidence.source.span_id": source.spanId
	}
	const structure: ReadableSpan = { ...span, spanContext: () => source, links: [] }
	return evidenceRecords(
		{ serialized, fits },
		(metadata) => ({
			...structure,
			attributes: { ...numericAttributes(span.attributes), ...coordinates, ...metadata }
		}),
		(metadata, payload, offset) =>
			digest(
				`${source.traceId}:${source.spanId}:${String(metadata["superstarter.evidence.sha256"])}:${offset}`
			).pipe(
				Effect.map((identity): ReadableSpan => ({
					...structure,
					name: "telemetry.evidence.part",
					events: [],
					kind: SpanKind.INTERNAL,
					status: { code: SpanStatusCode.UNSET },
					startTime: span.startTime,
					endTime: span.startTime,
					duration: [0, 0],
					parentSpanContext: source,
					// Native span ids are 8 bytes; source hash and offset give a stable part identity.
					spanContext: () => ({ ...source, spanId: Str.slice(0, 16)(identity) }),
					droppedAttributesCount: 0,
					droppedEventsCount: 0,
					droppedLinksCount: 0,
					attributes: {
						...coordinates,
						...metadata,
						"superstarter.evidence.part.content": payload
					}
				}))
			)
	)
}

/** Log parts retain native time, resource and span correlation. The manifest and checksum
 * distinguish payloads even when several logs share a span and a time. */
export const logEvidenceParts = ({
	item: log,
	serialized,
	fits
}: Oversized<ReadableLogRecord>): Effect.Effect<
	readonly ReadableLogRecord[],
	TelemetryEvidenceEnvelopeTooLarge
> => {
	// Native LogRecordImpl exposes severity, event and drop fields through prototype getters.
	// Copy the public contract explicitly; object spread loses them.
	const original: ReadableLogRecord = {
		hrTime: log.hrTime,
		hrTimeObserved: log.hrTimeObserved,
		...(log.spanContext === undefined ? {} : { spanContext: log.spanContext }),
		...(log.severityNumber === undefined ? {} : { severityNumber: log.severityNumber }),
		...(log.severityText === undefined ? {} : { severityText: log.severityText }),
		...(log.eventName === undefined ? {} : { eventName: log.eventName }),
		attributes: log.attributes,
		resource: log.resource,
		instrumentationScope: log.instrumentationScope,
		droppedAttributesCount: log.droppedAttributesCount
	}
	const coordinates = {
		...correlationAttributes(searchableTelemetryAttributes(log.attributes)),
		"superstarter.evidence.source.trace_id": log.spanContext?.traceId,
		"superstarter.evidence.source.span_id": log.spanContext?.spanId
	}
	return evidenceRecords(
		{ serialized, fits },
		(metadata) => ({
			...original,
			body: "telemetry.evidence.manifest",
			attributes: { ...numericAttributes(log.attributes), ...coordinates, ...metadata }
		}),
		(metadata, payload) =>
			Effect.succeed({
				...original,
				eventName: "telemetry.evidence.part",
				body: payload,
				droppedAttributesCount: 0,
				attributes: { ...coordinates, ...metadata }
			})
	)
}
