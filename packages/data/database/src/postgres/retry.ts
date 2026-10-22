import { Effect, Predicate, Schedule } from "effect"

/** A SERIALIZABLE conflict or a deadlock changed nothing, so the caller may run the work again: a
 * few times, exponentially spaced with jitter so contenders that lost together do not collide
 * again, before the conflict is its answer. Nothing retries without this. */
export const retryPostgresTransient = <A, E, R>(
	work: Effect.Effect<A, E, R>
): Effect.Effect<A, E, R> =>
	work.pipe(
		Effect.retry({
			while: Predicate.isTagged("PostgresTransientFailure"),
			times: 3,
			schedule: Schedule.exponential("20 millis").pipe(Schedule.jittered)
		})
	)
