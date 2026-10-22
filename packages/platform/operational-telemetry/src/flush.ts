import { Array as Arr, Effect } from "effect"

/** The reasons of the settled promises that rejected. */
export const rejectedReasons = (results: readonly PromiseSettledResult<unknown>[]): unknown[] =>
	Arr.flatMap(results, (result): ReadonlyArray<unknown> =>
		result.status === "rejected" ? [result.reason] : []
	)

/** One settlement of every pending promise, never short-circuited by the first rejection. */
export const settled = (promises: readonly Promise<unknown>[]) =>
	Effect.promise(() => Promise.allSettled(promises))

/** One active drain and one shared pending drain. Each call joins the next pass that has not
 * started, so that pass includes everything submitted before the call. A caller arriving during
 * an active pass never borrows its older receipt. Rejected passes settle their callers without
 * poisoning the next pass. No records, timer, retries or second exporter are owned here. */
export const coalescedFlush = (flush: () => Promise<void>): (() => Promise<void>) => {
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
