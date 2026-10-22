import { observed } from "@superstarter/operational-telemetry/effect"
import { OPERATIONAL_SPANS } from "@superstarter/operational-telemetry/spans"
import type { Effect } from "effect"

type StatementAttributes = typeof OPERATIONAL_SPANS.postgresStatement.opened.Type

/** One span per issued statement. A prepared plan names itself; a builder statement has no name,
 * and SQL text or bound values never become one. */
export const observeStatement =
	(attributes: StatementAttributes) =>
	<A, E, R>(statement: Effect.Effect<A, E, R>): Effect.Effect<A, E, R> =>
		statement.pipe(observed(OPERATIONAL_SPANS.postgresStatement, attributes))

export type TransactionAccess =
	(typeof OPERATIONAL_SPANS.postgresTransaction.opened.Type)["superstarter.postgres.access"]

/** One span per transaction, around BEGIN through COMMIT or ROLLBACK. */
export const observeTransaction =
	(access: TransactionAccess) =>
	<A, E, R>(transaction: Effect.Effect<A, E, R>): Effect.Effect<A, E, R> =>
		transaction.pipe(
			observed(OPERATIONAL_SPANS.postgresTransaction, {
				"db.system.name": "postgresql",
				"superstarter.postgres.access": access
			})
		)
