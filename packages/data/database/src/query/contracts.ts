import type { PostgresTransientFailure } from "@superstarter/todo-protocol/transient-failure"
import type { NodePgDatabase } from "drizzle-orm/node-postgres"
import type { PgAsyncPreparedQuery } from "drizzle-orm/pg-core/async/session"
import type { QueryPromise } from "drizzle-orm/query-promise"
import { type Effect, Schema } from "effect"
import type { Client, PoolClient } from "pg"
import { PostgresDiagnostic } from "#postgres/diagnostic.ts"

/** A connected driver handle: one pg client, borrowed from a pool or owned by one caller. */
export type NativePostgresDatabase = NodePgDatabase & Readonly<{ $client: Client | PoolClient }>

/** No session could be opened. Credentials name no provider detail, which can carry secrets. */
export class PostgresConnectRejected extends Schema.TaggedError<
	PostgresConnectRejected,
	{ readonly brand: unique symbol }
>()("PostgresConnectRejected", {
	failure: Schema.Union([
		Schema.Struct({ stage: Schema.Literal("credentials") }),
		Schema.Struct({ stage: Schema.Literal("connect"), diagnostic: PostgresDiagnostic })
	])
}) {}

/** A statement or transaction PostgreSQL refused, with its admitted diagnostic only. */
export class PostgresStatementRejected extends Schema.TaggedError<
	PostgresStatementRejected,
	{ readonly brand: unique symbol }
>()("PostgresStatementRejected", {
	operation: Schema.Literals(["construction", "statement", "transaction"]),
	diagnostic: PostgresDiagnostic
}) {}

export type PostgresOperationFailure = PostgresStatementRejected | PostgresTransientFailure

/** The construction-only Drizzle surface. Only the scope that lends it issues a statement, so no
 * caller reaches `transaction` or the client. */
export type PostgresBuilder = Pick<
	NodePgDatabase,
	| "$with"
	| "with"
	| "select"
	| "selectDistinct"
	| "selectDistinctOn"
	| "insert"
	| "update"
	| "delete"
	| "execute"
>

export type PostgresStatement<A> = QueryPromise<A> | PgAsyncPreparedQuery<{ execute: A }>

/** Bound values of a prepared statement: scalars and arrays of scalars, never objects. */
type PostgresParameter = string | number | boolean | null | ReadonlyArray<string | number | boolean>
export type PostgresParameters = Readonly<Record<string, PostgresParameter>>

/** A named plan, built once per physical client that runs it. The name is the plan's and the
 * statement's telemetry name; spans never carry its SQL or parameters. */
export type PreparedPostgresStatement<A> = Readonly<{
	statementName: string
	handleOf: (
		database: PostgresBuilder,
		client: Client | PoolClient
	) => PgAsyncPreparedQuery<{ execute: A }>
}>

/**
 * A prepared statement's name and how to build it.
 * @public
 */
export type PostgresStatementPlan<A> = Readonly<{
	name: string
	build: (database: PostgresBuilder, name: string) => PgAsyncPreparedQuery<{ execute: A }>
}>

/**
 * Declares a named plan. It is built lazily, once per physical client, on first use.
 * @public
 */
export const preparePostgresStatement = <A>(
	plan: PostgresStatementPlan<A>
): PreparedPostgresStatement<A> => {
	const { name: statementName, build } = plan
	const handles = new WeakMap<Client | PoolClient, PgAsyncPreparedQuery<{ execute: A }>>()
	return {
		statementName,
		handleOf: (database, client) => {
			const existing = handles.get(client)
			if (existing !== undefined) {
				return existing
			}
			const statement = build(database, statementName)
			handles.set(client, statement)
			return statement
		}
	}
}

/** Borrowed query custody: neither the client nor transaction control escapes. */
export type PostgresQueryScope = Readonly<{
	run: <A>(
		build: (database: PostgresBuilder) => PostgresStatement<A>
	) => Effect.Effect<A, PostgresOperationFailure>
	runPrepared: <A>(
		statement: PreparedPostgresStatement<A>,
		parameters: PostgresParameters
	) => Effect.Effect<A, PostgresOperationFailure>
}>
