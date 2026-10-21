import { Effect, Schedule } from "effect"

/** A SERIALIZABLE conflict or a deadlock changed nothing, so the caller may run the work again: a
 * few times, briefly spaced, before the conflict is its answer. Nothing retries without this. */
export const retryPostgresTransient = <A, E extends Readonly<{ _tag: string }>, R>(
	work: Effect.Effect<A, E, R>
): Effect.Effect<A, E, R> =>
	work.pipe(
		Effect.retry({
			while: (error) => error._tag === "PostgresTransientFailure",
			times: 3,
			schedule: Schedule.exponential("20 millis")
		})
	)
