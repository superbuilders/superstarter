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
	operation: Schema.Literals(["statement", "transaction"]),
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

/** A Schema the scope decodes a result with, needing no services. */
export type PostgresResultSchema = Schema.Top & { readonly DecodingServices: never }

/**
 * One named statement: its name, the Schema its result decodes through, and how to render it with
 * its named placeholders. PostgreSQL parses a name once per connection (pg skips PARSE for a name
 * it already prepared on that client), so nothing is cached here. The result decodes once: our own
 * SQL answering anything else is a defect. Spans carry the name, never SQL text or bound values.
 */
export type PreparedPostgresStatement<S extends PostgresResultSchema> = Readonly<{
	name: string
	result: S
	build: (database: PostgresBuilder, name: string) => PgAsyncPreparedQuery<{ execute: unknown }>
}>

/**
 * Declares a named statement, inferring its result Schema.
 * @public
 */
export const preparePostgresStatement = <S extends PostgresResultSchema>(
	statement: PreparedPostgresStatement<S>
): PreparedPostgresStatement<S> => statement

/** Borrowed query custody: neither the client nor transaction control escapes. */
export type PostgresQueryScope = Readonly<{
	run: <A>(
		build: (database: PostgresBuilder) => PostgresStatement<A>
	) => Effect.Effect<A, PostgresOperationFailure>
	runPrepared: <S extends PostgresResultSchema>(
		statement: PreparedPostgresStatement<S>,
		parameters: PostgresParameters
	) => Effect.Effect<S["Type"], PostgresOperationFailure>
}>
