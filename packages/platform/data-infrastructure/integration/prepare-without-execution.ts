import type { PostgresPrincipal } from "@superstarter/database/postgres/principals"
import { withPostgresStatement } from "@superstarter/database/postgres/transaction"
import type {
	NativePostgresDatabase,
	PostgresQueryScope
} from "@superstarter/database/query/contracts"
import { Effect } from "effect"

/** The one native plan name every preparation takes; the inspection reads it back by this name. */
export const PREPARED_STATEMENT_NAME = "superstarter_integration_statement"

/** One read-only transaction under a production role on the borrowed physical client: `use`
 * runs after the role is set, and `release` (a rollback first) returns the session as found. */
const readOnlyUnderRole = <A, E>(
	database: NativePostgresDatabase,
	role: PostgresPrincipal,
	use: Effect.Effect<A, E>,
	release: Effect.Effect<unknown>
) =>
	Effect.acquireUseRelease(
		Effect.promise(() => database.$client.query("BEGIN READ ONLY")),
		() =>
			Effect.promise(() => database.$client.query(`SET LOCAL ROLE ${role}`)).pipe(
				Effect.andThen(use)
			),
		() => release
	)

const rollback = (database: NativePostgresDatabase) =>
	Effect.promise(() => database.$client.query("ROLLBACK"))

/** Integration-only custody: parse the production SQL without EXECUTE or dummy values, under the
 * role that runs it in production, so its grants are part of what the parse proves. `inspect`
 * reads the prepared plan's catalog row inside the same read-only transaction, before the
 * rollback and DEALLOCATE release the session. A refusal is a defect carrying PostgreSQL's own
 * error, which names the missing column, grant or parameter type. Every subtest exclusively
 * borrows a physical client. */
export const prepareWithoutExecution = <A, E>(
	input: Readonly<{
		database: NativePostgresDatabase
		statement: string
		role: PostgresPrincipal
		inspect: (scope: PostgresQueryScope) => Effect.Effect<A, E>
	}>
) =>
	readOnlyUnderRole(
		input.database,
		input.role,
		Effect.promise(() =>
			input.database.$client.query(`PREPARE ${PREPARED_STATEMENT_NAME} AS ${input.statement}`)
		).pipe(Effect.andThen(() => withPostgresStatement(input.database, input.inspect))),
		rollback(input.database).pipe(
			Effect.ensuring(Effect.promise(() => input.database.$client.query("DEALLOCATE ALL")))
		)
	)
