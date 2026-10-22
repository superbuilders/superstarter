import { ExportResultCode } from "@opentelemetry/core"
import { Array as Arr, Cause, Effect, Exit, Schema } from "effect"
import type { Completion, OtlpSignal } from "#otlp-batch.ts"

/** The reasons of the settled promises that rejected. */
export const rejectedReasons = (results: readonly PromiseSettledResult<unknown>[]): unknown[] =>
	Arr.flatMap(results, (result): ReadonlyArray<unknown> =>
		result.status === "rejected" ? [result.reason] : []
	)

/** One settlement of every pending promise, never short-circuited by the first rejection. */
export const settled = (promises: readonly Promise<unknown>[]) =>
	Effect.promise(() => Promise.allSettled(promises))

/** How a drain pass ends an owner's pending work: flushing it, or closing for good. */
export type FlushMethod = "forceFlush" | "shutdown"

/** Which owner a drain belongs to: one signal's, or the whole pipeline's. */
type FlushSignal = OtlpSignal | "all"

/** A drain or shutdown of a telemetry owner left a signal, an exporter or an export unsettled. */
export class TelemetryFlushFailure extends Schema.TaggedError<
	TelemetryFlushFailure,
	{ readonly brand: unique symbol }
>()("TelemetryFlushFailure", {
	signal: Schema.Literals(["logs", "traces", "metrics", "all"]),
	method: Schema.Literals(["forceFlush", "shutdown"]),
	causes: Schema.Array(Schema.Unknown)
}) {}

/** The exports one owner handed to its exporter and has not yet seen settle, and the failures among
 * those that settled since its last receipt. */
export type ExportLedger = Readonly<{
	/** The batch's own completion, counted as in flight until it is called. */
	track: (callback: (result: Completion) => void) => (result: Completion) => void
	/** Waits for every export in flight, then takes the failures recorded since the last receipt. */
	receipt: Effect.Effect<ReadonlyArray<unknown>>
}>

type ExportFailures = Readonly<{ signal: OtlpSignal; failedBatches: number; firstFailure: unknown }>

export const makeExportLedger = (signal: OtlpSignal): ExportLedger => {
	const inFlight = new Set<Promise<void>>()
	let failures: ExportFailures | undefined = undefined
	const recorded = (result: Completion): ExportFailures => {
		if (failures === undefined) {
			return {
				signal,
				failedBatches: 1,
				firstFailure: result.error === undefined ? result : result.error
			}
		}
		return { ...failures, failedBatches: failures.failedBatches + 1 }
	}
	return {
		track: (callback) => {
			const completed = Promise.withResolvers<void>()
			inFlight.add(completed.promise)
			return (result) => {
				if (result.code !== ExportResultCode.SUCCESS) {
					failures = recorded(result)
				}
				inFlight.delete(completed.promise)
				completed.resolve()
				callback(result)
			}
		},
		receipt: Effect.suspend(() => settled([...inFlight])).pipe(
			Effect.map(() => {
				const taken = failures
				failures = undefined
				return taken === undefined ? [] : [taken]
			})
		)
	}
}

/** One active drain and one shared pending drain. Each call joins the next pass that has not
 * started, so that pass includes everything submitted before the call. A caller arriving during
 * an active pass never borrows its older receipt. Rejected passes settle their callers without
 * poisoning the next pass. No records, timer, retries or second exporter are owned here. */
const coalescedFlush = (flush: () => Promise<void>): (() => Promise<void>) => {
	let pending: PromiseWithResolvers<void> | undefined = undefined
	let running = false
	const run = (): Promise<void> => {
		const pass = pending
		if (pass === undefined) {
			running = false
			return Promise.resolve()
		}
		pending = undefined
		return Promise.resolve().then(flush).then(pass.resolve, pass.reject).then(run)
	}
	return () => {
		const pass = pending === undefined ? Promise.withResolvers<void>() : pending
		pending = pass
		if (!running) {
			running = true
			queueMicrotask(() => {
				void run()
			})
		}
		return pass.promise
	}
}

/** An owner's flush and shutdown over its one drain pass. */
export type DrainLifecycle = Readonly<{
	forceFlush: () => Promise<void>
	shutdown: () => Promise<void>
}>

/** Flushes coalesce into the next pass that has not started. Shutdown runs once: it flushes, then
 * runs the shutdown pass, and every later flush or shutdown answers with its receipt. */
export const drainLifecycle = (
	owner: Readonly<{
		signal: FlushSignal
		pass: (method: FlushMethod) => Effect.Effect<void, TelemetryFlushFailure>
	}>
): DrainLifecycle => {
	const drain = coalescedFlush(() => Effect.runPromise(owner.pass("forceFlush")))
	const close = Effect.gen(function* () {
		const flushed = yield* settled([drain()])
		const closed = yield* Effect.exit(owner.pass("shutdown"))
		const causes = [
			...rejectedReasons(flushed),
			...(Exit.isFailure(closed) ? [Cause.squash(closed.cause)] : [])
		]
		if (Arr.isArrayNonEmpty(causes)) {
			return yield* TelemetryFlushFailure.make({ signal: owner.signal, method: "shutdown", causes })
		}
	})
	let closing: Promise<void> | undefined = undefined
	const shutdown = (): Promise<void> => {
		if (closing !== undefined) {
			return closing
		}
		const receipt = Effect.runPromise(close)
		closing = receipt
		return receipt
	}
	return {
		forceFlush: () => (closing === undefined ? drain() : closing),
		shutdown
	}
}
