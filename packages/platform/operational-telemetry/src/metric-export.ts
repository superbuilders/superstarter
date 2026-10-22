import {
	AggregationTemporality,
	AggregationType,
	type IMetricReader,
	type MetricData,
	type PushMetricExporter
} from "@opentelemetry/sdk-metrics"
import { Array as Arr, Effect } from "effect"
import type { ExportHealth } from "#export-health.ts"
import {
	drainLifecycle,
	type FlushMethod,
	makeExportLedger,
	rejectedReasons,
	settled,
	TelemetryFlushFailure
} from "#flush.ts"
import { exportBisecting } from "#otlp-batch.ts"

/** A reader's or a wrapper's aggregation choices: the wrapped exporter's own, else the SDK's
 * defaults, as the SDK's own periodic reader resolves them. */
export const aggregationOf = (
	exporter: PushMetricExporter
): Pick<IMetricReader, "selectAggregation" | "selectAggregationTemporality"> => ({
	selectAggregation: (kind) =>
		exporter.selectAggregation === undefined
			? { type: AggregationType.DEFAULT }
			: exporter.selectAggregation(kind),
	selectAggregationTemporality: (kind) =>
		exporter.selectAggregationTemporality === undefined
			? AggregationTemporality.CUMULATIVE
			: exporter.selectAggregationTemporality(kind)
})

/** A metric's data points are independent OTLP records; retain each point and its descriptor. */
const points = <T extends MetricData>(metric: T): T[] =>
	Arr.map(metric.dataPoints, (point): T => ({ ...metric, dataPoints: [point] }))

/** The process metric exporter, and the export health its owner creates once the meter provider
 * this exporter feeds exists. */
export type BoundedMetricExport = Readonly<{
	exporter: PushMetricExporter
	health: () => ExportHealth
}>

/** The receiver's 413 halving, applied to metrics: each data point is a record the halving can
 * separate. SDK collection cadence, aggregation and transport retries remain unchanged. */
export const boundedMetricExporter = ({
	exporter,
	health
}: BoundedMetricExport): PushMetricExporter => {
	const ledger = makeExportLedger("metrics")
	const pass = (method: FlushMethod) =>
		Effect.gen(function* () {
			const native = yield* settled([Promise.resolve().then(() => exporter[method]())])
			const failed = yield* ledger.receipt
			const causes = [...rejectedReasons(native), ...failed]
			health().observeFlush({ signal: "metrics", method, causes })
			if (Arr.isArrayNonEmpty(causes)) {
				return yield* TelemetryFlushFailure.make({ signal: "metrics", method, causes })
			}
		})
	const lifecycle = drainLifecycle({ signal: "metrics", pass })
	return {
		export(data, callback) {
			const fragments = Arr.flatMap(data.scopeMetrics, (scope) =>
				Arr.flatMap(scope.metrics, (metric) =>
					Arr.map(points(metric), (point) => ({ ...scope, metrics: [point] }))
				)
			)
			exportBisecting({
				signal: "metrics",
				records: fragments,
				send: (scopeMetrics, done) => {
					exporter.export({ ...data, scopeMetrics: [...scopeMetrics] }, done)
				},
				callback: ledger.track(callback),
				health: health()
			})
		},
		forceFlush: lifecycle.forceFlush,
		shutdown: lifecycle.shutdown,
		...aggregationOf(exporter)
	}
}
