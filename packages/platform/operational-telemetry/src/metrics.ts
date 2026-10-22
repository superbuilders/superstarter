import {
	type MeterProvider as ApiMeterProvider,
	type Attributes,
	diag,
	type Meter,
	metrics
} from "@opentelemetry/api"
import { ExportResultCode } from "@opentelemetry/core"
import { resourceFromAttributes } from "@opentelemetry/resources"
import {
	type CollectionResult,
	type IMetricReader,
	MeterProvider,
	type MetricProducer,
	PeriodicExportingMetricReader,
	type PushMetricExporter,
	type ResourceMetrics
} from "@opentelemetry/sdk-metrics"
import type { ReadableSpan, SpanProcessor } from "@opentelemetry/sdk-trace-base"
import { Array as Arr, DateTime, Duration, Effect, Order, Record, Result, Schema } from "effect"
import { v7 } from "uuid"
import { OperationalTelemetryProviderConflict } from "#destination.ts"
import { type ExportHealth, makeExportHealth } from "#export-health.ts"
import { emitOperationalLog } from "#logs.ts"
import { aggregationOf, boundedMetricExporter } from "#metric-export.ts"
import { OPERATIONAL_SCOPE, operationalResourceAttributes } from "#resource.ts"

import {
	exportHostOf,
	type OperationalMetricExportRecord,
	type OperationalOrigin,
	type TelemetryLifetime
} from "#schema.ts"
import { CORRELATION_KEYS, telemetryAttributes } from "#span-export.ts"

/** Each metric dimension comes from admitted program metadata. Passes, keys, request ids and
 * trace ids stay in logs and traces, never in metric series. */
const dimensionKeys = ["superstarter.effect.outcome", "superstarter.result.kind"] as const

/**
 * @limitKind published
 * @owner Operational telemetry
 * @unit seconds
 * @scope function duration histogram resolution
 * @constraint advisory threshold
 * @source https://opentelemetry.io/docs/specs/semconv/faas/faas-metrics/
 * ExplicitBucketBoundaries: [0.005, 0.01, 0.025, 0.05, 0.075, 0.1,
 * 0.25, 0.5, 0.75, 1, 2.5, 5, 7.5, 10].
 * @verified 2026-09-13
 */
const FAAS_DURATION_BUCKETS_SECONDS = [
	0.005, 0.01, 0.025, 0.05, 0.075, 0.1, 0.25, 0.5, 0.75, 1, 2.5, 5, 7.5, 10
] as const

/**
 * @limitKind published
 * @owner Operational telemetry
 * @unit seconds
 * @scope production Vercel Fluid invocation
 * @constraint hard quota
 * @source https://vercel.com/docs/functions/limitations#max-duration
 * Pro and Enterprise Fluid functions support up to 800 seconds.
 * This sizes histogram resolution, never controls work or its deadline.
 * @verified 2026-09-13
 */
const WEB_DURATION_COVERAGE_SECONDS = 800

/**
 * @limitKind derived
 * @owner Operational telemetry
 * @unit milliseconds
 * @scope all operation histograms, identical across processes and exports
 * @derivation Repeat the published FaaS boundary ladder over decimal decades until its largest
 * boundary covers WEB_DURATION_COVERAGE_SECONDS; convert to milliseconds and deduplicate. The
 * overflow bucket still records longer operations, whose exact durations remain in traces.
 * Revisit coverage if the deployed host's lifetime changes.
 */
const OPERATION_DURATION_BUCKETS_MILLISECONDS: ReadonlyArray<number> = Arr.sort(
	Arr.dedupe(
		Arr.flatMap(
			Arr.makeBy(
				Math.ceil(
					Math.log10(WEB_DURATION_COVERAGE_SECONDS / Math.max(...FAAS_DURATION_BUCKETS_SECONDS))
				) + 1,
				(decade) =>
					Arr.map(FAAS_DURATION_BUCKETS_SECONDS, (seconds) => seconds * 10 ** decade * 1000)
			),
			(decade) => decade
		)
	),
	Order.Number
)

/**
 * @limitKind published
 * @owner OpenTelemetry JavaScript metrics SDK
 * @unit milliseconds
 * @scope one periodic collection and export of the process's shared meter provider
 * @constraint configurable SDK default cadence, not a transport timeout
 * @source https://github.com/open-telemetry/opentelemetry-js/blob/v2.11.0/packages/sdk-metrics/src/export/PeriodicExportingMetricReader.ts
 * "exportIntervalMillis = 60000". Kept as the least spacing between two exports.
 * @verified 2026-09-29
 */
const METRIC_EXPORT_INTERVAL_MILLISECONDS = 60_000

/**
 * @limitKind published
 * @owner OpenTelemetry JavaScript metrics SDK
 * @unit metric streams
 * @scope one instrument's attribute sets in one reader
 * @constraint SDK default when the reader has no cardinality selector
 * @source https://github.com/open-telemetry/opentelemetry-js/blob/v2.11.0/packages/sdk-metrics/src/export/MetricReader.ts
 * "return 2000; // default value if no selector is provided"
 * @verified 2026-10-21
 */
const METRIC_CARDINALITY_LIMIT = 2000

/** The reader was asked to collect before its meter provider bound it, or after shutdown. */
class MetricReaderUnavailable extends Schema.TaggedError<
	MetricReaderUnavailable,
	{ readonly brand: unique symbol }
>()("MetricReaderUnavailable", {
	reason: Schema.Literals(["unbound", "shut-down"])
}) {}

/** A reader whose metrics export only when an invocation asks: the process's one OTLP metrics
 * owner, plus the hook the invocation's drain calls. */
type InvocationMetricReader = IMetricReader & Readonly<{ exportIfDue: () => Promise<void> }>

/** The reader's deadline, when the caller gave one: the SDK's own timeout option. */
const withinDeadline = (
	run: () => Promise<void>,
	options: Readonly<{ timeoutMillis?: number }> | undefined
): Promise<void> => {
	const timeoutMillis = options?.timeoutMillis
	if (timeoutMillis === undefined) {
		return run()
	}
	return Effect.runPromise(Effect.promise(run).pipe(Effect.timeout(Duration.millis(timeoutMillis))))
}

/** Where an invocation reader is: not yet bound to its meter provider, idle since its last export
 * began, exporting one pass, or closed for good. */
type ReaderState =
	| Readonly<{ kind: "unbound" }>
	| Readonly<{ kind: "idle"; producer: MetricProducer; lastExportAt: number }>
	| Readonly<{ kind: "exporting"; producer: MetricProducer; pass: Promise<void> }>
	| Readonly<{ kind: "shut-down" }>

/**
 * Collection and export happen only inside a live invocation. A free-running reader's timer fires
 * on an idle Fluid instance, which the platform may suspend mid-export: the request then times out
 * when the next invocation wakes it. This reader exports when an invocation's telemetry drain asks
 * it to (`exportIfDue`) and the cadence has elapsed since the last export began, and once more at
 * shutdown. One pass runs at a time: a drain that arrives during a pass joins it, and a flush waits
 * for it and then runs its own. The cadence is measured on the monotonic clock.
 */
const invocationMetricReader = (exporter: PushMetricExporter): InvocationMetricReader => {
	let state: ReaderState = { kind: "unbound" }
	const collect = (options?: Readonly<{ timeoutMillis?: number }>): Promise<CollectionResult> => {
		switch (state.kind) {
			case "unbound":
				return Promise.reject(MetricReaderUnavailable.make({ reason: "unbound" }))
			case "shut-down":
				return Promise.reject(MetricReaderUnavailable.make({ reason: "shut-down" }))
			case "idle":
			case "exporting": {
				const timeoutMillis = options?.timeoutMillis
				return state.producer.collect(timeoutMillis === undefined ? {} : { timeoutMillis })
			}
		}
	}
	const exported = (resourceMetrics: ResourceMetrics): Promise<void> => {
		const settled = Promise.withResolvers<void>()
		exporter.export(resourceMetrics, () => {
			settled.resolve()
		})
		return settled.promise
	}
	const exportOnce = (): Promise<void> => {
		switch (state.kind) {
			case "unbound":
			case "shut-down":
				return Promise.resolve()
			case "exporting":
				return state.pass.then(exportOnce)
			case "idle": {
				const { producer } = state
				const startedAt = performance.now()
				const pass = collect()
					.then(({ resourceMetrics }) =>
						Arr.isArrayNonEmpty(resourceMetrics.scopeMetrics)
							? exported(resourceMetrics)
							: undefined
					)
					.finally(() => {
						if (state.kind === "exporting" && state.pass === pass) {
							state = { kind: "idle", producer, lastExportAt: startedAt }
						}
					})
				state = { kind: "exporting", producer, pass }
				return pass
			}
		}
	}
	return {
		setMetricProducer(metricProducer) {
			if (state.kind !== "unbound") {
				diag.error("MetricReader can not be bound to a MeterProvider again.")
				return
			}
			state = { kind: "idle", producer: metricProducer, lastExportAt: performance.now() }
		},
		...aggregationOf(exporter),
		selectCardinalityLimit: () => METRIC_CARDINALITY_LIMIT,
		collect,
		forceFlush: (options) => {
			if (state.kind === "shut-down") {
				diag.warn("Cannot forceFlush on already shutdown MetricReader.")
				return Promise.resolve()
			}
			return withinDeadline(() => exportOnce().then(() => exporter.forceFlush()), options)
		},
		shutdown: (options) => {
			if (state.kind === "shut-down") {
				diag.error("Cannot call shutdown twice.")
				return Promise.resolve()
			}
			return withinDeadline(() => exportOnce().then(() => exporter.shutdown()), options).then(
				() => {
					state = { kind: "shut-down" }
				}
			)
		},
		exportIfDue: () => {
			switch (state.kind) {
				case "exporting":
					return state.pass
				case "idle":
					return performance.now() - state.lastExportAt < METRIC_EXPORT_INTERVAL_MILLISECONDS
						? Promise.resolve()
						: exportOnce()
				case "unbound":
				case "shut-down":
					return Promise.resolve()
			}
		}
	}
}

/** Epoch milliseconds now, for the export receipt's wall-clock fields. */
const epochMillisecondsNow = (): number => DateTime.toEpochMillis(DateTime.nowUnsafe())

/** The process metrics pipeline: who it describes, its OTLP exporter, and how long it lives. */
export type OperationalMetricsPipeline = Readonly<{
	origin: OperationalOrigin
	exporter: PushMetricExporter
	lifetime: TelemetryLifetime
}>

/** The reader a lifetime exports through, and the hook a request's drain calls. A process exports
 * on the SDK's own timer, where no invocation ever drains and no idle instance is ever suspended. */
const readerOf = (
	lifetime: TelemetryLifetime,
	exporter: PushMetricExporter
): Readonly<{ reader: IMetricReader; exportIfDue: () => Promise<void> }> => {
	if (lifetime.kind === "process") {
		return {
			reader: new PeriodicExportingMetricReader({
				exporter,
				exportIntervalMillis: METRIC_EXPORT_INTERVAL_MILLISECONDS
			}),
			exportIfDue: () => Promise.resolve()
		}
	}
	const reader = invocationMetricReader(exporter)
	return { reader, exportIfDue: () => reader.exportIfDue() }
}

/** The installed metrics owner: its provider, the pipeline's one export health built on it, the
 * hook a request's drain calls, and its shutdown. */
export type OperationalMetrics = Readonly<{
	meterProvider: ApiMeterProvider
	health: ExportHealth
	exportIfDue: () => Promise<void>
	shutdown: () => Promise<void>
}>

/** The process's own resource use: resident memory, its peak, and CPU time by mode. */
const observeProcess = (meter: Meter): void => {
	meter
		.createObservableGauge("superstarter.process.memory", { unit: "By" })
		.addCallback((result) => {
			result.observe(process.memoryUsage().rss, { kind: "rss" })
			result.observe(process.resourceUsage().maxRSS * 1024, {
				kind: "rss-peak-since-process-start"
			})
		})
	meter.createObservableCounter("process.cpu.time", { unit: "s" }).addCallback((result) => {
		const usage = process.cpuUsage()
		result.observe(usage.user / 1_000_000, { "cpu.mode": "user" })
		result.observe(usage.system / 1_000_000, { "cpu.mode": "system" })
	})
}

/** One native OTLP metrics owner per process, exported only inside live invocations on Vercel
 * (see `invocationMetricReader`) and periodically elsewhere. Stable explicit buckets permit PostHog
 * to combine processes and windows; hosts export delta counters. Shutdown performs the last
 * collection. The installed provider is returned so every later SDK component binds its
 * self-observability to it explicitly: a component built before this call would bind the API's
 * no-op provider permanently.
 * https://posthog.com/docs/metrics */
export const startOperationalMetrics = ({
	origin,
	exporter,
	lifetime
}: OperationalMetricsPipeline): Effect.Effect<
	OperationalMetrics,
	OperationalTelemetryProviderConflict
> =>
	Effect.suspend(() => {
		const transport = boundedMetricExporter({ exporter, health: () => health })
		const observedExporter: PushMetricExporter = {
			export: (data, callback) => {
				const startedAtMilliseconds = epochMillisecondsNow()
				const start = performance.now()
				const record = {
					v: 2,
					service: origin.service,
					deployment: origin.deployment,
					event: "telemetry-metric-export",
					batchId: v7(),
					instanceId: origin.instanceId,
					metricRecords: Arr.reduce(
						data.scopeMetrics,
						0,
						(count, scope) => count + scope.metrics.length
					),
					dataPoints: Arr.reduce(data.scopeMetrics, 0, (count, scope) =>
						Arr.reduce(scope.metrics, count, (points, metric) => points + metric.dataPoints.length)
					),
					startedAtMilliseconds
				} as const
				const report = (lifecycle: () => OperationalMetricExportRecord["lifecycle"]) =>
					Result.try(() => {
						const observed = lifecycle()
						const failed = observed.kind === "settled" && observed.outcome === "failed"
						emitOperationalLog({
							body: { ...record, lifecycle: observed } satisfies OperationalMetricExportRecord,
							attributes: record,
							level: failed ? "Error" : "Info"
						})
					})
				report(() => ({ kind: "started", host: exportHostOf(lifetime) }))
				transport.export(data, (result) => {
					report(() => ({
						kind: "settled",
						host: exportHostOf(lifetime),
						outcome: result.code === ExportResultCode.SUCCESS ? "acknowledged" : "failed",
						endedAtMilliseconds: epochMillisecondsNow(),
						elapsedMilliseconds: Math.max(0, performance.now() - start)
					}))
					callback(result)
				})
			},
			forceFlush: () => transport.forceFlush(),
			shutdown: () => transport.shutdown(),
			...aggregationOf(exporter)
		}
		const { reader, exportIfDue } = readerOf(lifetime, observedExporter)
		const provider = new MeterProvider({
			resource: resourceFromAttributes(operationalResourceAttributes(origin)),
			readers: [reader]
		})
		const meter = provider.getMeter(OPERATIONAL_SCOPE)
		const health = makeExportHealth({ origin, meter })
		if (!metrics.setGlobalMeterProvider(provider)) {
			return OperationalTelemetryProviderConflict.make({ signal: "metrics" })
		}
		observeProcess(meter)
		return Effect.succeed({
			meterProvider: provider,
			health,
			exportIfDue,
			shutdown: () =>
				provider.shutdown().then(() => {
					metrics.disable()
				})
		})
	})

const attributesOf = (span: ReadableSpan): Attributes => ({
	scope: span.instrumentationScope.name,
	"span.kind": span.kind,
	"status.code": span.status.code,
	...telemetryAttributes(
		Record.fromEntries(Arr.map(dimensionKeys, (key) => [key, span.attributes[key]] as const))
	)
})

const presence = (span: ReadableSpan) =>
	Record.fromEntries(
		Arr.map(CORRELATION_KEYS, (key) => {
			const value = span.attributes[key]
			const present = typeof value === "string" && value !== ""
			return [key, present ? "present" : "absent"] as const
		})
	)

/** Every native span contributes. Instrumentation scope is the metric dimension; unbounded URLs,
 * span names and request identities stay in logs and traces. */
export const createSpanMeasurements = (meterProvider: ApiMeterProvider): SpanProcessor => {
	const meter = meterProvider.getMeter(OPERATIONAL_SCOPE)
	const terminals = meter.createCounter("superstarter.operation.count")
	const duration = meter.createHistogram("superstarter.operation.duration", {
		unit: "ms",
		advice: { explicitBucketBoundaries: [...OPERATION_DURATION_BUCKETS_MILLISECONDS] }
	})

	const correlation = meter.createCounter("superstarter.telemetry.correlation.spans", {
		unit: "{span}"
	})
	const active = new Map<string, Readonly<{ scope: string; start: number }>>()
	const scopes = new Set<string>()
	meter.createObservableGauge("superstarter.operation.active").addCallback((result) => {
		const counts = new Map<string, number>()
		for (const { scope } of active.values()) {
			const count = counts.get(scope)
			counts.set(scope, count === undefined ? 1 : count + 1)
		}
		for (const scope of scopes) {
			const count = counts.get(scope)
			result.observe(count === undefined ? 0 : count, { scope })
		}
	})
	meter
		.createObservableGauge("superstarter.operation.oldest_active", { unit: "ms" })
		.addCallback((result) => {
			const now = performance.now()
			const oldest = new Map<string, number>()
			for (const { scope, start } of active.values()) {
				const held = oldest.get(scope)
				oldest.set(scope, held === undefined ? start : Math.min(held, start))
			}
			for (const scope of scopes) {
				const start = oldest.get(scope)
				result.observe(start === undefined ? 0 : Math.max(0, now - start), { scope })
			}
		})
	return {
		onStart(span) {
			const scope = span.instrumentationScope.name
			scopes.add(scope)
			active.set(span.spanContext().spanId, { scope, start: performance.now() })
		},
		onEnd(span) {
			active.delete(span.spanContext().spanId)
			const attributes = attributesOf(span)
			terminals.add(1, attributes)
			correlation.add(1, { scope: span.instrumentationScope.name, ...presence(span) })
			duration.record(span.duration[0] * 1000 + span.duration[1] / 1_000_000, attributes)
		},
		forceFlush: () => Promise.resolve(),
		shutdown: () => Promise.resolve()
	}
}
