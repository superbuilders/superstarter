import {
	type DiagLogger,
	DiagLogLevel,
	diag,
	type HrTime,
	isSpanContextValid,
	type Meter,
	metrics,
	type SpanContext
} from "@opentelemetry/api"
import type { ReadableSpan } from "@opentelemetry/sdk-trace-base"
import { Array as Arr, Console, Effect, Record, Result } from "effect"
import type { FlushMethod } from "#flush.ts"
import type { Completion, ExportOutcome, OtlpSignal } from "#otlp-batch.ts"
import { OPERATIONAL_SCOPE } from "#resource.ts"
import type { OperationalOrigin, OutsideRequests } from "#schema.ts"
import { serializeEvidence } from "#span-export.ts"

const boundaries = {
	traces: "span",
	logs: "event",
	metrics: "metric"
} as const satisfies Record<OtlpSignal, string>

type ExportCoordinate = Readonly<{ traceId: string; spanId: string; timeUnixNanoseconds: string }>

/** The native coordinates a packet's records carried, for a receipt that names what failed. */
export type ExportScope =
	| Readonly<{ kind: "unavailable" }>
	| Readonly<{ kind: "records"; records: readonly ExportCoordinate[]; unscopedRecords: number }>

/** The scope of records that carry no native coordinates (metric points), and of any whose
 * coordinates cannot be read. */
export const unavailableScope = (): ExportScope => ({ kind: "unavailable" })

/** Writes a receipt to the host console, never through the OTel pipeline whose failure it may
 * report. A receipt that cannot be written is dropped rather than failing its caller. */
const writeReceipt = (receipt: string | undefined, failed: boolean): void => {
	Result.try(() => {
		Effect.runSync(failed ? Console.error(receipt) : Console.log(receipt))
	})
}

/** The one envelope every receipt carries: the process that wrote it, and what happened. */
const receiptOf = (
	origin: OperationalOrigin,
	event: string,
	facts: Readonly<Record<string, unknown>>
): string | undefined =>
	serializeEvidence({
		v: 1,
		service: origin.service,
		deployment: origin.deployment,
		instanceId: origin.instanceId,
		event,
		...facts
	})

/** Native SDK coordinates, not another synthetic span contract. */
export const exportScopeOf = (
	records: readonly Readonly<{ context: SpanContext | undefined; time: HrTime }>[]
): ExportScope => {
	const coordinates = Arr.flatMap(records, (record) =>
		record.context !== undefined && isSpanContextValid(record.context)
			? [
					{
						traceId: record.context.traceId,
						spanId: record.context.spanId,
						timeUnixNanoseconds: (
							BigInt(record.time[0]) * 1_000_000_000n +
							BigInt(record.time[1])
						).toString()
					}
				]
			: []
	)
	return {
		kind: "records",
		records: coordinates,
		unscopedRecords: records.length - coordinates.length
	}
}

/** The scope a receipt names, or none when the scope itself cannot be read. */
const scopeFor = (scopeOf: () => ExportScope): ExportScope =>
	Result.getOrElse(Result.try(scopeOf), unavailableScope)

/** One send's settlement at the exporter: its signal, wire records, completion and outcome, how
 * long it took, and the coordinates its records carried. */
type ExportObservation = Readonly<{
	signal: OtlpSignal
	count: number
	result: Completion
	outcome: ExportOutcome
	milliseconds: number
	scopeOf: () => ExportScope
}>

/** Records a single record the receiver refused as too large, dropped by the export. */
type DropObservation = Readonly<{
	signal: OtlpSignal
	count: number
	scopeOf: () => ExportScope
}>

/** One drain pass of one owner: which signal, which lifecycle method, and what failed. */
type FlushObservation = Readonly<{
	signal: OtlpSignal | "all"
	method: FlushMethod
	causes: readonly unknown[]
}>

/** One pipeline owner's export health: the counters and histogram its exports and drains record,
 * created once from the owner's meter, and the console receipts its failures write. */
export type ExportHealth = Readonly<{
	observeExportAttempt: (attempt: Readonly<{ signal: OtlpSignal; count: number }>) => void
	observeExport: (observation: ExportObservation) => void
	observeDropped: (observation: DropObservation) => void
	observeFlush: (observation: FlushObservation) => void
	observeSpanLoss: (span: ReadableSpan) => void
}>

/**
 * The export health of one owner. Exporter callbacks expose acknowledgements, not proof that a
 * query can read the data; backend query qualification remains a separate operator action. The
 * original exporter error is retained, never classified through message heuristics. Failure
 * receipts reach the host console, independent of PostHog, so they stay visible when it is down.
 */
export const makeExportHealth = (
	owner: Readonly<{ origin: OperationalOrigin; meter: Meter }>
): ExportHealth => {
	const { origin, meter } = owner
	const attempted = meter.createCounter("superstarter.telemetry.export.attempted", {
		unit: "{wire_record}"
	})
	const batches = meter.createCounter("superstarter.telemetry.export.batches")
	const items = meter.createCounter("superstarter.telemetry.export.items", {
		unit: "{wire_record}"
	})
	const duration = meter.createHistogram("superstarter.telemetry.export.duration", { unit: "ms" })
	const dropped = meter.createCounter("superstarter.telemetry.export.dropped", {
		unit: "{wire_record}"
	})
	const flushes = meter.createCounter("superstarter.telemetry.flush.passes")
	const lost = meter.createCounter("superstarter.telemetry.sdk.dropped")
	return {
		observeExportAttempt: ({ signal, count }) => {
			attempted.add(count, { signal })
		},
		observeExport: ({ signal, count, result, outcome, milliseconds, scopeOf }) => {
			batches.add(1, { signal, outcome })
			items.add(count, { signal, outcome })
			duration.record(milliseconds, { signal, outcome })
			if (outcome !== "rejected") {
				return
			}
			const diagnostic = Result.getOrElse(
				Result.try(() => serializeEvidence(result.error)),
				() => "error serialization failed"
			)
			writeReceipt(
				receiptOf(origin, "telemetry-export-failed", {
					boundary: boundaries[signal],
					signal,
					outcome,
					count,
					diagnostic,
					scope: scopeFor(scopeOf)
				}),
				true
			)
		},
		observeDropped: ({ signal, count, scopeOf }) => {
			dropped.add(count, { signal, reason: "too-large" })
			writeReceipt(
				receiptOf(origin, "telemetry-record-dropped", {
					boundary: boundaries[signal],
					signal,
					reason: "too-large",
					count,
					scope: scopeFor(scopeOf)
				}),
				true
			)
		},
		observeFlush: ({ signal, method, causes }) => {
			const outcome = Arr.isReadonlyArrayNonEmpty(causes) ? "failed" : "completed"
			flushes.add(1, { signal, method, outcome })
			if (outcome === "completed") {
				return
			}
			writeReceipt(receiptOf(origin, "telemetry-flush-failed", { signal, method, causes }), true)
		},
		observeSpanLoss: (span) => {
			const counts = {
				attributes: span.droppedAttributesCount,
				events: span.droppedEventsCount,
				links: span.droppedLinksCount,
				eventAttributes: Arr.reduce(span.events, 0, (count, event) => {
					const loss = event.droppedAttributesCount === undefined ? 0 : event.droppedAttributesCount
					return count + loss
				}),
				linkAttributes: Arr.reduce(span.links, 0, (count, link) => {
					const loss = link.droppedAttributesCount === undefined ? 0 : link.droppedAttributesCount
					return count + loss
				})
			}
			if (Arr.every(Record.values(counts), (count) => count === 0)) {
				return
			}
			for (const [kind, count] of Record.toEntries(counts)) {
				lost.add(count, { kind })
			}
			writeReceipt(
				receiptOf(origin, "telemetry-sdk-data-dropped", {
					dropped: counts,
					scope: exportScopeOf([{ context: span.spanContext(), time: span.startTime }])
				}),
				true
			)
		}
	}
}

type DiagnosticLevel = keyof DiagLogger

/** The SDK diagnostics worth counting and writing as errors. */
const LOUD_LEVELS: ReadonlySet<DiagnosticLevel> = new Set(["error", "warn"])

/** The SDK's own diagnostics: export errors routed through its global error handler, queue
 * overflow, collection timeouts and duplicate registration. Without a logger the API discards
 * them. They go to the host console only, as closed JSON receipts: routing SDK diagnostics through
 * the OTel log provider would make a failing log export report itself. Warnings and errors are
 * also counted, so a dashboard sees them without reading Vercel Logs. The logger is installed
 * before the meter provider exists, so each count reads the meter then, outside the request that
 * may have caused it. `OTEL_LOG_LEVEL`, when set, still replaces this logger in `@vercel/otel`
 * registration.
 * https://opentelemetry.io/docs/languages/js/getting-started/nodejs/#troubleshooting */
export const observeSdkDiagnostics = ({
	origin,
	outsideRequests
}: Readonly<{ origin: OperationalOrigin; outsideRequests: OutsideRequests }>): void => {
	let counting = false
	const count = (level: DiagnosticLevel): void => {
		if (counting || !LOUD_LEVELS.has(level)) {
			return
		}
		counting = true
		Result.try(() => {
			outsideRequests(() => {
				metrics
					.getMeter(OPERATIONAL_SCOPE)
					.createCounter("superstarter.telemetry.sdk.diagnostics", { unit: "{diagnostic}" })
					.add(1, { level })
			})
		})
		counting = false
	}
	const write =
		(level: DiagnosticLevel) =>
		(message: string, ...args: ReadonlyArray<unknown>): void => {
			count(level)
			const receipt = Result.getOrElse(
				Result.try(() => receiptOf(origin, "telemetry-sdk-diagnostic", { level, message, args })),
				() => receiptOf(origin, "telemetry-sdk-diagnostic", { level, message })
			)
			writeReceipt(receipt, LOUD_LEVELS.has(level))
		}
	const logger: DiagLogger = {
		error: write("error"),
		warn: write("warn"),
		info: write("info"),
		debug: write("debug"),
		verbose: write("verbose")
	}
	diag.setLogger(logger, { logLevel: DiagLogLevel.INFO, suppressOverrideMessage: true })
}
