import { PostgresTransientFailure } from "@superstarter/todo-protocol/transient-failure"
import { TransactionRollbackError } from "drizzle-orm/errors"
import type { PgTransactionConfig } from "drizzle-orm/pg-core"
import { Cause, Effect, Exit, Function as Fn } from "effect"
import type { Client, PoolClient } from "pg"
import { postgresDiagnosticOf, transientReasonOf } from "#postgres/diagnostic.ts"
import { observeStatement, observeTransaction } from "#postgres/observation.ts"
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
	(operation: PostgresTransientFailure["operation"]) =>
	(error: unknown): PostgresOperationFailure => {
		const diagnostic = postgresDiagnosticOf(error)
		const reason = transientReasonOf(diagnostic)
		if (reason === undefined) {
			return PostgresStatementRejected.make({ operation, diagnostic })
		}
		return PostgresTransientFailure.make({ operation, reason })
	}

/** Builders construct synchronously and issue nothing; a throw while building is the statement's
 * own failure, and never a transient one, since nothing was issued. Issuing is uninterruptible, so
 * a client is never released mid-protocol. */
const issue = <Statement, A>(
	build: () => Statement,
	execute: (statement: Statement) => Promise<A>
): Effect.Effect<A, PostgresOperationFailure> =>
	Effect.try({
		try: build,
		catch: (error) =>
			PostgresStatementRejected.make({
				operation: "construction",
				diagnostic: postgresDiagnosticOf(error)
			})
	}).pipe(
		Effect.flatMap((statement) =>
			Effect.tryPromise({
				try: () => execute(statement),
				catch: issueFailureOf("statement")
			}).pipe(Effect.uninterruptible)
		)
	)

const scopeOf = (database: PostgresBuilder, client: Client | PoolClient): PostgresQueryScope => ({
	run: (build) =>
		issue(
			() => build(database),
			(statement) => statement.execute()
		).pipe(observeStatement({ kind: "builder" })),
	runPrepared: (statement, parameters) =>
		issue(
			() => statement.handleOf(database, client),
			(prepared) => prepared.execute(parameters)
		).pipe(observeStatement({ kind: "prepared", name: statement.statementName }))
})

/** A failed `consume` rolls back through Drizzle's own rollback; a failure of BEGIN, COMMIT or
 * ROLLBACK itself joins the consumer's cause rather than replacing it. */
const transactionCauseOf = <E>(
	consumed: Exit.Exit<unknown, E | PostgresOperationFailure> | undefined,
	error: unknown
): Cause.Cause<E | PostgresOperationFailure> => {
	const failed = consumed !== undefined && Exit.isFailure(consumed) ? consumed.cause : undefined
	if (failed !== undefined && error instanceof TransactionRollbackError) {
		return failed
	}
	const native = Cause.fail(issueFailureOf("transaction")(error))
	if (failed === undefined) {
		return native
	}
	return Cause.combine(failed, native)
}

/**
 * Drizzle owns BEGIN, COMMIT and ROLLBACK on the borrowed client, and `consume` runs inside its
 * callback with the caller's services. Interruption reaches `consume` through the signal, and the
 * borrow waits for Drizzle to settle before the client goes back to the pool.
 */
const withNativeTransaction = <A, E, R>(
	database: NativePostgresDatabase,
	config: PgTransactionConfig,
	consume: ScopeConsumer<A, E, R>
): Effect.Effect<A, E | PostgresOperationFailure, R> =>
	Effect.gen(function* () {
		const run = Effect.runPromiseExitWith(yield* Effect.context<R>())
		return yield* Effect.callback<A, E | PostgresOperationFailure>(function (resume, signal) {
			let consumed: Exit.Exit<A, E | PostgresOperationFailure> | undefined = undefined
			const settled = database
				.transaction(
					(transaction) =>
						run(consume(scopeOf(transaction, database.$client)), {
							signal,
							scheduler: this
						}).then((exit) => {
							consumed = exit
							if (Exit.isFailure(exit)) {
								return transaction.rollback()
							}
							return exit.value
						}),
					config
				)
				.then(
					(value) => {
						resume(Effect.succeed(value))
					},
					(error: unknown) => {
						resume(Effect.failCause(transactionCauseOf(consumed, error)))
					}
				)
			return Effect.promise(() => settled).pipe(Effect.uninterruptible)
		})
	})

const READ_WRITE: PgTransactionConfig = { isolationLevel: "serializable", accessMode: "read write" }

/** A read-only SERIALIZABLE DEFERRABLE transaction waits for a snapshot no writer can invalidate,
 * so a read never fails with a serialization conflict. */
const READ_ONLY: PgTransactionConfig = {
	isolationLevel: "serializable",
	accessMode: "read only",
	deferrable: true
}

/** One autocommit statement scope, without BEGIN and COMMIT round trips. Each statement is its own
 * SERIALIZABLE transaction through the session default. */
export const withPostgresStatement: ScopeRunner = Fn.dual(
	2,
	<A, E, R>(
		database: NativePostgresDatabase,
		consume: ScopeConsumer<A, E, R>
	): Effect.Effect<A, E | PostgresOperationFailure, R> =>
		Effect.suspend(() => consume(scopeOf(database, database.$client)))
)

/**
 * A SERIALIZABLE read-write transaction: several statements that commit together or not at all.
 * @public
 */
export const withPostgresTransaction: ScopeRunner = Fn.dual(
	2,
	<A, E, R>(
		database: NativePostgresDatabase,
		consume: ScopeConsumer<A, E, R>
	): Effect.Effect<A, E | PostgresOperationFailure, R> =>
		withNativeTransaction(database, READ_WRITE, consume).pipe(observeTransaction("read-write"))
)

/**
 * A SERIALIZABLE READ ONLY DEFERRABLE transaction: several reads that must agree on one snapshot.
 * @public
 */
export const withPostgresReadTransaction: ScopeRunner = Fn.dual(
	2,
	<A, E, R>(
		database: NativePostgresDatabase,
		consume: ScopeConsumer<A, E, R>
	): Effect.Effect<A, E | PostgresOperationFailure, R> =>
		withNativeTransaction(database, READ_ONLY, consume).pipe(observeTransaction("read-only"))
)
