import { ExportResultCode } from "@opentelemetry/core"
import { JsonMetricsSerializer } from "@opentelemetry/otlp-transformer"
import {
	AggregationTemporality,
	AggregationType,
	type MetricData,
	type PushMetricExporter
} from "@opentelemetry/sdk-metrics"
import { Array as Arr, Effect, Schema } from "effect"
import { observeExport, observeExportAttempt, observeFlush } from "#export-health.ts"
import { coalescedFlush, rejectedReasons, settled } from "#flush.ts"
import { exportSizedBatch, operationalBatchLimits } from "#otlp-batch.ts"
import type { OperationalOrigin } from "#schema.ts"

/** A metric drain left an export rejected, unsettled or failed in transport. */
class TelemetryMetricDrainFailed extends Schema.TaggedError<
	TelemetryMetricDrainFailed,
	{ readonly brand: unique symbol }
>()("TelemetryMetricDrainFailed", {
	causes: Schema.Array(Schema.Unknown)
}) {}

/** A metric's data points are independent OTLP records; retain each point and its descriptor. */
const points = <T extends MetricData>(metric: T): T[] =>
	Arr.map(metric.dataPoints, (point): T => ({ ...metric, dataPoints: [point] }))

/** The process metric exporter and the process it describes. */
export type BoundedMetricExport = Readonly<{
	exporter: PushMetricExporter
	origin: OperationalOrigin
}>

/** Apply the same receiver byte budget to metrics, using the actual OTLP JSON. SDK collection
 * cadence, aggregation and transport retries remain unchanged. */
export const boundedMetricExporter = ({
	exporter,
	origin
}: BoundedMetricExport): PushMetricExporter => {
	const inFlight = new Set<Promise<void>>()
	let failure: { failedBatches: number; firstCause: unknown } | undefined = undefined
	const drainPass = Effect.gen(function* () {
		const transport = yield* settled([
			Promise.resolve().then(() => exporter.forceFlush()),
			...inFlight
		])
		const pending = failure === undefined ? [] : [failure]
		const causes = [...rejectedReasons(transport), ...pending]
		failure = undefined
		observeFlush({ origin, signal: "metrics", method: "forceFlush", causes })
		if (Arr.isArrayNonEmpty(causes)) {
			return yield* TelemetryMetricDrainFailed.make({ causes })
		}
	})
	const drain = coalescedFlush(() => Effect.runPromise(drainPass))
	const shutdownPass = Effect.gen(function* () {
		const flushed = yield* settled([drain()])
		const closed = yield* settled([Promise.resolve().then(() => exporter.shutdown())])
		const causes = rejectedReasons([...flushed, ...closed])
		observeFlush({ origin, signal: "metrics", method: "shutdown", causes })
		if (Arr.isArrayNonEmpty(causes)) {
			return yield* TelemetryMetricDrainFailed.make({ causes })
		}
	})
	return {
		export(data, callback) {
			const completed = Promise.withResolvers<void>()
			inFlight.add(completed.promise)
			const fragments = Arr.flatMap(data.scopeMetrics, (scope) =>
				Arr.flatMap(scope.metrics, (metric) =>
					Arr.map(points(metric), (point) => ({ ...scope, metrics: [point] }))
				)
			)
			exportSizedBatch({
				items: fragments,
				serialize: (scopeMetrics) =>
					JsonMetricsSerializer.serializeRequest({ ...data, scopeMetrics: [...scopeMetrics] }),
				send: (scopeMetrics, done) => {
					observeExportAttempt({ signal: "metrics", count: scopeMetrics.length })
					exporter.export({ ...data, scopeMetrics: [...scopeMetrics] }, done)
				},
				callback: (result) => {
					if (result.code !== ExportResultCode.SUCCESS) {
						const held =
							failure === undefined
								? {
										failedBatches: 0,
										firstCause: result.error === undefined ? result : result.error
									}
								: failure
						held.failedBatches += 1
						failure = held
					}
					inFlight.delete(completed.promise)
					completed.resolve()
					callback(result)
				},
				observe: (records, result, kind) => {
					observeExport({ origin, signal: "metrics", count: records.length, result, kind })
				},
				limits: operationalBatchLimits,
				signal: "metrics"
			})
		},
		forceFlush: drain,
		shutdown: () => Effect.runPromise(shutdownPass),
		selectAggregation: (kind) =>
			exporter.selectAggregation === undefined
				? { type: AggregationType.DEFAULT }
				: exporter.selectAggregation(kind),
		selectAggregationTemporality: (kind) =>
			exporter.selectAggregationTemporality === undefined
				? AggregationTemporality.CUMULATIVE
				: exporter.selectAggregationTemporality(kind)
	}
}
