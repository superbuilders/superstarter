import { PostgresTransientFailure } from "@superstarter/todo-protocol/transient-failure"
import { type SQL, sql } from "drizzle-orm"
import { Cause, Effect, Exit, Function as Fn, Option, Schema } from "effect"
import { postgresDiagnosticOf, transientReasonOf } from "#postgres/diagnostic.ts"
import {
	observeStatement,
	observeTransaction,
	type TransactionAccess
} from "#postgres/observation.ts"

import {
	type NativePostgresDatabase,
	type PostgresBuilder,
	type PostgresOperationFailure,
	type PostgresQueryScope,
	PostgresStatementRejected
} from "#query/contracts.ts"

type ScopeConsumer<A, E, R> = (scope: PostgresQueryScope) => Effect.Effect<A, E, R>

/** A scope lender, data-first or data-last: `consume` runs with a scope over the database. */
type ScopeRunner = {
	<A, E, R>(
		consume: ScopeConsumer<A, E, R>
	): (database: NativePostgresDatabase) => Effect.Effect<A, E | PostgresOperationFailure, R>
	<A, E, R>(
		database: NativePostgresDatabase,
		consume: ScopeConsumer<A, E, R>
	): Effect.Effect<A, E | PostgresOperationFailure, R>
}

/** The one decode of an issued statement's or transaction's native failure: a transient SQLSTATE
 * becomes its own error, every other refusal keeps its admitted diagnostic. */
const issueFailureOf =
	(operation: PostgresStatementRejected["operation"]) =>
	(error: unknown): PostgresOperationFailure => {
		const diagnostic = postgresDiagnosticOf(error)
		return Option.match(transientReasonOf(diagnostic), {
			onNone: (): PostgresOperationFailure =>
				PostgresStatementRejected.make({ operation, diagnostic }),
			onSome: (reason) => PostgresTransientFailure.make({ operation, reason })
		})
	}

/** Builders are ours and pure: rendering issues nothing, so a throw while rendering is a defect.
 * Issuing is uninterruptible, so a client is never released mid-protocol. */
const issue = <Statement, A>(
	build: () => Statement,
	execute: (statement: Statement) => Promise<A>
): Effect.Effect<A, PostgresOperationFailure> =>
	Effect.sync(build).pipe(
		Effect.flatMap((statement) =>
			Effect.tryPromise({
				try: () => execute(statement),
				catch: issueFailureOf("statement")
			}).pipe(Effect.uninterruptible)
		)
	)

const scopeOf = (database: PostgresBuilder): PostgresQueryScope => ({
	run: (build) =>
		issue(
			() => build(database),
			(statement) => statement.execute()
		).pipe(observeStatement({ "db.system.name": "postgresql" })),
	runPrepared: (statement, parameters) =>
		issue(
			() => statement.build(database, statement.name),
			(prepared) => prepared.execute(parameters)
		).pipe(
			Effect.flatMap((result) =>
				Schema.decodeUnknownEffect(statement.result)(result).pipe(Effect.orDie)
			),
			observeStatement({ "db.system.name": "postgresql", "db.operation.name": statement.name })
		)
})

/** The statements that open and close a transaction. Every transaction is SERIALIZABLE. A read-only
 * one is also DEFERRABLE: it waits for a snapshot no writer can invalidate, so a read never fails
 * with a serialization conflict. */
const CONTROL = {
	"begin-read-write": sql`BEGIN ISOLATION LEVEL SERIALIZABLE READ WRITE`,
	"begin-read-only": sql`BEGIN ISOLATION LEVEL SERIALIZABLE READ ONLY DEFERRABLE`,
	commit: sql`COMMIT`,
	rollback: sql`ROLLBACK`
} as const satisfies Readonly<Record<`begin-${TransactionAccess}` | "commit" | "rollback", SQL>>

/** One control statement on the borrowed client. A SERIALIZABLE conflict PostgreSQL reports at
 * COMMIT is the transaction's own transient failure. */
const control = (database: NativePostgresDatabase, statement: keyof typeof CONTROL) =>
	Effect.tryPromise({
		try: () => database.execute(CONTROL[statement]),
		catch: issueFailureOf("transaction")
	})

/**
 * One transaction on the borrowed client: BEGIN, `consume` (the only interruptible part), then
 * COMMIT when it succeeded or ROLLBACK when it failed or was interrupted. Control statements never
 * run interrupted, so the client always goes back to the pool outside a transaction. A failed
 * ROLLBACK joins the consumer's cause rather than replacing it.
 */
const transactionOf = (access: TransactionAccess): ScopeRunner =>
	Fn.dual(
		2,
		<A, E, R>(
			database: NativePostgresDatabase,
			consume: ScopeConsumer<A, E, R>
		): Effect.Effect<A, E | PostgresOperationFailure, R> =>
			Effect.uninterruptibleMask((restore) =>
				Effect.gen(function* () {
					yield* control(database, `begin-${access}`)
					const consumed = yield* Effect.exit(restore(consume(scopeOf(database))))
					if (Exit.isSuccess(consumed)) {
						yield* control(database, "commit")
						return consumed.value
					}
					const rolledBack = yield* Effect.exit(control(database, "rollback"))
					return yield* Effect.failCause(
						Exit.isFailure(rolledBack)
							? Cause.combine(consumed.cause, rolledBack.cause)
							: consumed.cause
					)
				})
			).pipe(observeTransaction(access))
	)

/** One autocommit statement scope, without BEGIN and COMMIT round trips. Each statement is its own
 * SERIALIZABLE transaction through the session default. */
export const withPostgresStatement: ScopeRunner = Fn.dual(
	2,
	<A, E, R>(
		database: NativePostgresDatabase,
		consume: ScopeConsumer<A, E, R>
	): Effect.Effect<A, E | PostgresOperationFailure, R> =>
		Effect.suspend(() => consume(scopeOf(database)))
)

/**
 * A SERIALIZABLE read-write transaction: several statements that commit together or not at all.
 * @public
 */
export const withPostgresTransaction: ScopeRunner = transactionOf("read-write")

/**
 * A SERIALIZABLE READ ONLY DEFERRABLE transaction: several reads that must agree on one snapshot.
 * @public
 */
export const withPostgresReadTransaction: ScopeRunner = transactionOf("read-only")
