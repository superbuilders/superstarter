import {
	AggregationTemporality,
	AggregationType,
	type IMetricReader,
	type MetricData,
	type PushMetricExporter,
	type ResourceMetrics
} from "@opentelemetry/sdk-metrics"
import { Array as Arr } from "effect"
import { type ExportHealth, unavailableScope } from "#export-health.ts"
import { drainLifecycle, makeExportLedger } from "#flush.ts"
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

/** One data point as a record the halving can separate, by its place in the collection: its
 * scope's, its metric's and its own index. A request is rebuilt from the collection, so the points
 * of one metric travel under one descriptor. */
type PointAddress = `${number}/${number}/${number}`

const addressOf = (scope: number, metric: number, point: number): PointAddress =>
	`${scope}/${metric}/${point}`

/** The metric with only the points a request carries. */
const withPoints = <T extends MetricData>(metric: T, sent: (point: number) => boolean): T => ({
	...metric,
	dataPoints: Arr.flatten(
		Arr.map(metric.dataPoints, (point, index) => (sent(index) ? [point] : []))
	)
})

/** The collection cut down to the points of one request: each scope once, each metric once under
 * its scope, holding every point of it the request carries, and nothing the request does not. */
const requestOf = (data: ResourceMetrics, sent: ReadonlySet<PointAddress>): ResourceMetrics => ({
	...data,
	scopeMetrics: Arr.filter(
		Arr.map(data.scopeMetrics, (scope, scopeIndex) => ({
			...scope,
			metrics: Arr.filter(
				Arr.map(scope.metrics, (metric, metricIndex) =>
					withPoints(metric, (point) => sent.has(addressOf(scopeIndex, metricIndex, point)))
				),
				(metric) => metric.dataPoints.length > 0
			)
		})),
		(scope) => Arr.isReadonlyArrayNonEmpty(scope.metrics)
	)
})

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
	const lifecycle = drainLifecycle({
		signal: "metrics",
		ledger,
		get health() {
			return health()
		},
		steps: (method) => [() => exporter[method]()]
	})
	return {
		export(data, callback) {
			exportBisecting<PointAddress>({
				signal: "metrics",
				records: Arr.flatMap(data.scopeMetrics, (scope, scopeIndex) =>
					Arr.flatMap(scope.metrics, (metric, metricIndex) =>
						Arr.makeBy(metric.dataPoints.length, (point) =>
							addressOf(scopeIndex, metricIndex, point)
						)
					)
				),
				send: (addresses, done) => {
					exporter.export(requestOf(data, new Set(addresses)), done)
				},
				callback: ledger.track(callback),
				health: health(),
				scopeOf: unavailableScope
			})
		},
		forceFlush: lifecycle.forceFlush,
		shutdown: lifecycle.shutdown,
		...aggregationOf(exporter)
	}
}
