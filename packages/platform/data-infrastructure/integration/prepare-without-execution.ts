// @effect-diagnostics nodeBuiltinImport:off
import assert from "node:assert/strict"
import { cardinality, pgPreparedStatements } from "@superstarter/database/catalog/pg-catalog"
import {
	POSTGRES_PRINCIPALS,
	type PostgresPrincipal
} from "@superstarter/database/postgres/principals"
import { withPostgresStatement } from "@superstarter/database/postgres/transaction"
import type {
	NativePostgresDatabase,
	PostgresBuilder,
	PostgresQueryScope
} from "@superstarter/database/query/contracts"
import { eq } from "drizzle-orm"
import { Effect } from "effect"

/** The one native plan name every preparation takes; the inspection reads it back by this name. */
const PREPARED_STATEMENT_NAME = "superstarter_integration_statement"

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
const prepareWithoutExecution = <A, E>(
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

/** The prepared plan's catalog row: how many parameter types PostgreSQL inferred, and whether it
 * resolved a result row. */
const preparedPlan = (database: PostgresBuilder) =>
	database
		.select({
			parameters: cardinality(pgPreparedStatements.parameter_types),
			results: cardinality(pgPreparedStatements.result_types)
		})
		.from(pgPreparedStatements)
		.where(eq(pgPreparedStatements.name, PREPARED_STATEMENT_NAME))

type Plan = Awaited<ReturnType<ReturnType<typeof preparedPlan>["execute"]>>[number]

/** A statement's SQL and the parameters it binds. */
type RenderedQuery = Readonly<{ sql: string; params: ReadonlyArray<unknown> }>

/** PostgreSQL's inferred plan against the statement's own binding: one inferred parameter type per
 * parameter the statement binds, and a resolved result row. */
const assertPlanMatches = (plans: ReadonlyArray<Plan>, query: RenderedQuery) => {
	const [plan] = plans
	assert.ok(plan !== undefined, "the prepared plan is catalogued")
	assert.equal(
		plan.parameters,
		query.params.length,
		"PostgreSQL inferred one type per parameter the statement binds"
	)
	assert.ok(plan.results !== null && plan.results > 0, "PostgreSQL resolved the result row")
	return plan
}

/** One statement: PREPARE under the application role, then its plan read back and compared. */
export const preparedOnce = ({
	database,
	query
}: Readonly<{ database: NativePostgresDatabase; query: RenderedQuery }>) =>
	prepareWithoutExecution({
		database,
		statement: query.sql,
		role: POSTGRES_PRINCIPALS.app,
		inspect: (scope) =>
			scope.run(preparedPlan).pipe(Effect.map((plans) => assertPlanMatches(plans, query)))
	})
