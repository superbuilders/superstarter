import { ExportResultCode } from "@opentelemetry/core"
import type { LogRecordExporter } from "@opentelemetry/sdk-logs"
import { Array as Arr, Cause, Effect, Predicate, Result, Schema } from "effect"
import type { ExportHealth, ExportScope } from "#export-health.ts"

/** The native exporter's completion: a result code and, when it failed, its error. */
export type Completion = Parameters<Parameters<LogRecordExporter["export"]>[1]>[0]

export type OtlpSignal = "logs" | "traces" | "metrics"

/** How one send settled at the exporter. */
export type ExportOutcome = "acknowledged" | "rejected" | "too-large"

/**
 * PostHog refuses an OTLP request body over its limit with 413 and has no per-record cap: hosted
 * ingestion takes 10 MiB, a self-hosted one 2 MiB by default. Its SDK spec answers a 413 by halving
 * the batch and retrying the same records, and drops a single record that is still refused, with a
 * warning; nothing splits a record. The native OTLP exporter does not retry a 413, and the local
 * file sink never answers one.
 * https://github.com/PostHog/sdk-specs/blob/main/openspec/specs/logs/spec.md
 */
const isTooLarge = (error: unknown): boolean =>
	Predicate.hasProperty(error, "code") && error.code === 413

/** The receiver refused one record on its own as too large: it is dropped, never split or retried. */
class TelemetryRecordRefused extends Schema.TaggedError<
	TelemetryRecordRefused,
	{ readonly brand: unique symbol }
>()("TelemetryRecordRefused", {
	reason: Schema.Literal("too-large")
}) {}

/** The native exporter threw instead of calling back, or the export run itself died; the batch's
 * completion is still delivered, so the SDK processor never waits on it. */
class TelemetryExportThrew extends Schema.TaggedError<
	TelemetryExportThrew,
	{ readonly brand: unique symbol }
>()("TelemetryExportThrew", {
	cause: Schema.Unknown
}) {}

/** One batch export: its signal and records, how the native exporter sends them, where the batch's
 * completion goes, the owner's export health, and the coordinates its records carry. */
export type BisectedExport<T> = Readonly<{
	signal: OtlpSignal
	records: readonly T[]
	send: (records: readonly T[], callback: (result: Completion) => void) => void
	callback: (result: Completion) => void
	health: ExportHealth
	scopeOf?: (records: readonly T[]) => ExportScope
}>

const SUCCEEDED: Completion = { code: ExportResultCode.SUCCESS }

const outcomeOf = (result: Completion): ExportOutcome => {
	if (result.code === ExportResultCode.SUCCESS) {
		return "acknowledged"
	}
	return isTooLarge(result.error) ? "too-large" : "rejected"
}

/** The first failure of a sequence of sends, else the last success. */
const firstFailureOf = (first: Completion, next: Completion): Completion =>
	first.code === ExportResultCode.SUCCESS ? next : first

/** Sends the batch as it is and halves it on each 413, sending the halves in order; a single
 * record still refused is dropped with its receipt. The batch's completion is the first failure,
 * else success. */
export const exportBisecting = <T>(batch: BisectedExport<T>): void => {
	const { signal, health } = batch
	const scopeOf = (records: readonly T[]) => {
		const scope = batch.scopeOf
		return scope === undefined ? undefined : () => scope(records)
	}
	const sent = (records: readonly T[]): Effect.Effect<Completion> =>
		Effect.callback<Completion>((resume) => {
			const handed = Result.try(() => {
				batch.send(records, (result) => {
					resume(Effect.succeed(result))
				})
			})
			if (Result.isFailure(handed)) {
				resume(
					Effect.succeed({
						code: ExportResultCode.FAILED,
						error: TelemetryExportThrew.make({ cause: handed.failure })
					})
				)
			}
		})
	const transmit = (records: readonly T[]) => {
		health.observeExportAttempt({ signal, count: records.length })
		const started = performance.now()
		return sent(records).pipe(
			Effect.map((result) => {
				const outcome = outcomeOf(result)
				health.observeExport({
					signal,
					count: records.length,
					result,
					outcome,
					milliseconds: performance.now() - started,
					scopeOf: scopeOf(records)
				})
				return { result, outcome }
			})
		)
	}
	const exportRecords = (records: readonly T[]): Effect.Effect<Completion> =>
		transmit(records).pipe(
			Effect.flatMap(({ result, outcome }) => {
				if (outcome !== "too-large") {
					return Effect.succeed(result)
				}
				if (records.length > 1) {
					const middle = Math.ceil(records.length / 2)
					return exportInOrder([Arr.take(records, middle), Arr.drop(records, middle)])
				}
				return Effect.sync((): Completion => {
					health.observeDropped({ signal, count: records.length, scopeOf: scopeOf(records) })
					return {
						code: ExportResultCode.FAILED,
						error: TelemetryRecordRefused.make({ reason: "too-large" })
					}
				})
			})
		)
	const exportInOrder = (parts: ReadonlyArray<readonly T[]>): Effect.Effect<Completion> =>
		Effect.reduce(
			parts,
			(): Completion => SUCCEEDED,
			(first, part) => exportRecords(part).pipe(Effect.map((next) => firstFailureOf(first, next)))
		)
	const work = Arr.isReadonlyArrayNonEmpty(batch.records)
		? exportRecords(batch.records)
		: Effect.succeed(SUCCEEDED)
	Effect.runFork(
		work.pipe(
			Effect.catchCause((cause) =>
				Effect.succeed<Completion>({
					code: ExportResultCode.FAILED,
					error: TelemetryExportThrew.make({ cause: Cause.squash(cause) })
				})
			),
			Effect.tap((result) =>
				Effect.sync(() => {
					batch.callback(result)
				})
			)
		)
	)
}
