import { Schema } from "effect"

/** The attempt changed nothing and may succeed when run again. Every transaction runs SERIALIZABLE,
 * so this is an ordinary outcome of concurrency. It crosses into the browser through server
 * actions, so this module imports nothing but Effect. */
export class PostgresTransientFailure extends Schema.TaggedError<
	PostgresTransientFailure,
	{ readonly brand: unique symbol }
>()("PostgresTransientFailure", {
	operation: Schema.Literals(["statement", "transaction"]),
	reason: Schema.Literals(["serialization-failure", "deadlock"])
}) {}
