import type { SpanLimits } from "@opentelemetry/sdk-trace-base"

/**
 * @limitKind published
 * @owner OpenTelemetry JavaScript trace SDK
 * @unit spans
 * @scope one BatchSpanProcessor export
 * @constraint configurable SDK default, not a receiver quota
 * @source https://github.com/open-telemetry/opentelemetry-js/blob/v2.11.0/packages/sdk-trace/src/export/BatchSpanProcessorBase.ts
 * "options.maxExportBatchSize ?? 512". Receiver batching further partitions it.
 * @verified 2026-09-20
 */
const EXPORT_BATCH_SPANS = 512

/**
 * @limitKind published
 * @owner OpenTelemetry JavaScript trace SDK
 * @unit spans
 * @scope pending queue of one BatchSpanProcessor
 * @constraint configurable SDK default; overflow is reported, not reliability
 * @source https://github.com/open-telemetry/opentelemetry-js/blob/v2.11.0/packages/sdk-trace/src/export/BatchSpanProcessorBase.ts
 * "options.maxQueueSize ?? 2048"
 * @verified 2026-09-20
 */
const EXPORT_QUEUE_SPANS = 2048

/**
 * @limitKind published
 * @owner OpenTelemetry JavaScript trace SDK
 * @unit milliseconds
 * @scope one BatchSpanProcessor scheduled export
 * @constraint configurable SDK default
 * @source https://github.com/open-telemetry/opentelemetry-js/blob/v2.11.0/packages/sdk-trace/src/export/BatchSpanProcessorBase.ts
 * "options.scheduledDelayMillis ?? 5000"; host finalization also flushes.
 * @verified 2026-09-20
 */
const EXPORT_INTERVAL_MILLISECONDS = 5000

/**
 * @limitKind published
 * @owner OpenTelemetry JavaScript trace SDK
 * @unit milliseconds
 * @scope one BatchSpanProcessor export
 * @constraint configurable SDK default, not the Vercel invocation deadline
 * @source https://github.com/open-telemetry/opentelemetry-js/blob/v2.11.0/packages/sdk-trace/src/export/BatchSpanProcessorBase.ts
 * "options.exportTimeoutMillis ?? 30000"
 * @verified 2026-09-20
 */
const EXPORT_TIMEOUT_MILLISECONDS = 30_000

export const traceBatchDefaults = {
	maxExportBatchSize: EXPORT_BATCH_SPANS,
	maxQueueSize: EXPORT_QUEUE_SPANS,
	scheduledDelayMillis: EXPORT_INTERVAL_MILLISECONDS,
	exportTimeoutMillis: EXPORT_TIMEOUT_MILLISECONDS
}

/**
 * @limitKind published
 * @owner OpenTelemetry trace SDK
 * @unit items
 * @scope attributes, events and links per span; attributes per event or link
 * @constraint configurable SDK defaults; actual dropped counters are exported
 * @source https://opentelemetry.io/docs/specs/otel/configuration/sdk-environment-variables/#span-limits
 * Each count limit defaults to 128. These are protective SDK budgets, not a
 * claim that every operation fits them. No string truncation is introduced.
 * @verified 2026-09-20
 */
const SPAN_ITEM_COUNT = 128

export const nativeSpanLimits: SpanLimits = {
	attributeCountLimit: SPAN_ITEM_COUNT,
	eventCountLimit: SPAN_ITEM_COUNT,
	linkCountLimit: SPAN_ITEM_COUNT,
	attributePerEventCountLimit: SPAN_ITEM_COUNT,
	attributePerLinkCountLimit: SPAN_ITEM_COUNT,
	// The SDK's default is unlimited string length. Receiver bytes bound exports.
	attributeValueLengthLimit: Number.POSITIVE_INFINITY
}
