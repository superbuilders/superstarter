import {
	type DiagLogger,
	DiagLogLevel,
	diag,
	type HrTime,
	isSpanContextValid,
	metrics,
	type SpanContext
} from "@opentelemetry/api"
import { ExportResultCode } from "@opentelemetry/core"
import type { ReadableSpan } from "@opentelemetry/sdk-trace-base"
import { Array as Arr, Console, Effect, Record, Result } from "effect"
import type { Completion, OtlpSignal } from "#otlp-batch.ts"
import { OPERATIONAL_SCOPE } from "#resource.ts"
import type { OperationalOrigin } from "#schema.ts"
import { serializeEvidence } from "#span-export.ts"

const boundaries = {
	traces: "span",
	logs: "event",
	metrics: "metric"
} as const satisfies Record<OtlpSignal, string>

type ExportCoordinate = Readonly<{ traceId: string; spanId: string; timeUnixNanoseconds: string }>
type ExportScope =
	| Readonly<{ kind: "unavailable" }>
	| Readonly<{ kind: "records"; records: readonly ExportCoordinate[]; unscopedRecords: number }>
const unavailableScope = (): ExportScope => ({ kind: "unavailable" })

/** Writes a receipt to the host console, never through the OTel pipeline whose failure it may
 * report. A receipt that cannot be written is dropped rather than failing its caller. */
const writeReceipt = (receipt: string | undefined, failed: boolean): void => {
	Result.try(() => {
		Effect.runSync(failed ? Console.error(receipt) : Console.log(receipt))
	})
}

/** Count wire records only at the exporter handoff. Evidence parts are wire records too; these
 * counters must never be subtracted from SDK queue records. */
export const observeExportAttempt = (
	attempt: Readonly<{ signal: OtlpSignal; count: number }>
): void => {
	metrics
		.getMeter(OPERATIONAL_SCOPE)
		.createCounter("superstarter.telemetry.export.attempted", { unit: "{wire_record}" })
		.add(attempt.count, { signal: attempt.signal })
}

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

/** One packet's settlement at the exporter: its signal, wire records, the exporter's completion,
 * the coordinates it carried, and whether it reached the exporter at all. */
export type ExportObservation = Readonly<{
	origin: OperationalOrigin
	signal: OtlpSignal
	count: number
	result: Completion
	scopeOf?: () => ExportScope
	kind: "export" | "refused"
}>

/** Exporter callbacks expose acknowledgements, not proof that a query can read the data. Backend
 * query qualification remains a separate operator action. The original exporter error is
 * retained, not classified through message heuristics. */
export const observeExport = (observation: ExportObservation): void => {
	const { origin, signal, count, result, kind } = observation
	const acknowledgement = result.code === ExportResultCode.SUCCESS ? "acknowledged" : "rejected"
	const outcome = kind === "refused" ? "refused" : acknowledgement
	const meter = metrics.getMeter(OPERATIONAL_SCOPE)
	meter.createCounter("superstarter.telemetry.export.batches").add(1, { signal, outcome })
	meter
		.createCounter("superstarter.telemetry.export.items", { unit: "{wire_record}" })
		.add(count, { signal, outcome })
	if (outcome === "acknowledged") {
		return
	}
	const diagnostic = Result.getOrElse(
		Result.try(() => serializeEvidence(result.error)),
		() => "error serialization failed"
	)
	const scopeOf = observation.scopeOf === undefined ? unavailableScope : observation.scopeOf
	const scope = Result.getOrElse(Result.try(scopeOf), unavailableScope)
	writeReceipt(
		serializeEvidence({
			v: 1,
			service: origin.service,
			deployment: origin.deployment,
			instanceId: origin.instanceId,
			boundary: boundaries[signal],
			event: "telemetry-export-failed",
			signal,
			outcome,
			count,
			diagnostic,
			scope
		}),
		true
	)
}

/** One drain pass of one owner: which signal, which lifecycle method, and what failed. */
export type FlushObservation = Readonly<{
	origin: OperationalOrigin
	signal: OtlpSignal | "all"
	method: "forceFlush" | "shutdown"
	causes: readonly unknown[]
}>

/** Flush failures are lifecycle evidence, never zero-item export batches. The independent console
 * receipt remains visible if PostHog itself is unavailable. */
export const observeFlush = ({ origin, signal, method, causes }: FlushObservation): void => {
	const outcome = Arr.isReadonlyArrayNonEmpty(causes) ? "failed" : "completed"
	metrics
		.getMeter(OPERATIONAL_SCOPE)
		.createCounter("superstarter.telemetry.flush.passes")
		.add(1, { signal, method, outcome })
	if (outcome === "completed") {
		return
	}
	writeReceipt(
		serializeEvidence({
			v: 1,
			service: origin.service,
			deployment: origin.deployment,
			instanceId: origin.instanceId,
			event: "telemetry-flush-failed",
			signal,
			method,
			causes
		}),
		true
	)
}

/** One observation per native span before export. Includes nested SDK event and link losses;
 * preserving counters in OTLP alone is not an alert. */
export const observeSpanLoss = (
	loss: Readonly<{ origin: OperationalOrigin; span: ReadableSpan }>
): void => {
	const { origin, span } = loss
	const dropped = {
		attributes: span.droppedAttributesCount,
		events: span.droppedEventsCount,
		links: span.droppedLinksCount,
		eventAttributes: Arr.reduce(span.events, 0, (count, event) => {
			const lost = event.droppedAttributesCount === undefined ? 0 : event.droppedAttributesCount
			return count + lost
		}),
		linkAttributes: Arr.reduce(span.links, 0, (count, link) => {
			const lost = link.droppedAttributesCount === undefined ? 0 : link.droppedAttributesCount
			return count + lost
		})
	}
	if (Arr.every(Record.values(dropped), (count) => count === 0)) {
		return
	}
	const counter = metrics
		.getMeter(OPERATIONAL_SCOPE)
		.createCounter("superstarter.telemetry.sdk.dropped")
	for (const [kind, count] of Record.toEntries(dropped)) {
		counter.add(count, { kind })
	}
	writeReceipt(
		serializeEvidence({
			v: 1,
			service: origin.service,
			deployment: origin.deployment,
			event: "telemetry-sdk-data-dropped",
			dropped,
			scope: exportScopeOf([{ context: span.spanContext(), time: span.startTime }])
		}),
		true
	)
}

type DiagnosticLevel = keyof DiagLogger

/** The SDK diagnostics worth counting and writing as errors. */
const LOUD_LEVELS: ReadonlySet<DiagnosticLevel> = new Set(["error", "warn"])

/** The SDK's own diagnostics: export errors routed through its global error handler, queue
 * overflow, collection timeouts and duplicate registration. Without a logger the API discards
 * them. They go to the host console only, as closed JSON receipts: routing SDK diagnostics through
 * the OTel log provider would make a failing log export report itself. Warnings and errors are
 * also counted, so a dashboard sees them without reading Vercel Logs. `OTEL_LOG_LEVEL`, when set,
 * still replaces this logger in `@vercel/otel` registration.
 * https://opentelemetry.io/docs/languages/js/getting-started/nodejs/#troubleshooting */
export const observeSdkDiagnostics = (origin: OperationalOrigin): void => {
	// Counting reaches the meter API, which itself reports through diag (a shut-down provider
	// warns on every getMeter). A diagnostic raised while counting one is written, not counted.
	let counting = false
	const count = (level: DiagnosticLevel): void => {
		if (counting || !LOUD_LEVELS.has(level)) {
			return
		}
		counting = true
		Result.try(() => {
			metrics
				.getMeter(OPERATIONAL_SCOPE)
				.createCounter("superstarter.telemetry.sdk.diagnostics", { unit: "{diagnostic}" })
				.add(1, { level })
		})
		counting = false
	}
	const write =
		(level: DiagnosticLevel) =>
		(message: string, ...args: ReadonlyArray<unknown>): void => {
			count(level)
			const receipt = Result.getOrElse(
				Result.try(() =>
					serializeEvidence({
						v: 1,
						service: origin.service,
						deployment: origin.deployment,
						instanceId: origin.instanceId,
						event: "telemetry-sdk-diagnostic",
						level,
						message,
						args
					})
				),
				() =>
					serializeEvidence({
						v: 1,
						service: origin.service,
						event: "telemetry-sdk-diagnostic",
						level,
						message
					})
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
	// INFO is the API's own default threshold for a logger installed without one.
	diag.setLogger(logger, { logLevel: DiagLogLevel.INFO, suppressOverrideMessage: true })
}
