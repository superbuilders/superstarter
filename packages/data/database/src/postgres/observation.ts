import { observed } from "@superstarter/operational-telemetry/effect"
import { OPERATIONAL_SPANS } from "@superstarter/operational-telemetry/spans"
import type { Effect } from "effect"

/** How a scope issued one statement: a Drizzle builder, or a code-named prepared plan. Spans carry
 * the plan's name, never SQL text or bound values. */
export type PostgresStatementIdentity =
	| Readonly<{ kind: "builder" }>
	| Readonly<{ kind: "prepared"; name: string }>

const statementAttributesOf = (identity: PostgresStatementIdentity) => {
	if (identity.kind === "prepared") {
		return { "db.system.name": "postgresql", "db.operation.name": identity.name } as const
	}
	return { "db.system.name": "postgresql" } as const
}

/** One span per issued statement. */
export const observeStatement =
	(identity: PostgresStatementIdentity) =>
	<A, E, R>(statement: Effect.Effect<A, E, R>): Effect.Effect<A, E, R> =>
		statement.pipe(observed(OPERATIONAL_SPANS.postgresStatement, statementAttributesOf(identity)))

type TransactionAccess =
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
