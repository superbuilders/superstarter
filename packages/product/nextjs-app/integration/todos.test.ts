// @effect-diagnostics nodeBuiltinImport:off
import assert from "node:assert/strict"
import { after, afterEach, test } from "node:test"
import { retryPostgresTransient } from "@superstarter/database/postgres/retry"
import {
	withPostgresStatement,
	withPostgresTransaction
} from "@superstarter/database/postgres/transaction"
import { flipTodoStatement, insertTodoStatement } from "@superstarter/database/queries/todos"
import { PostgresStatementRejected } from "@superstarter/database/query/contracts"
import {
	makeOperationalTelemetry,
	OperationalTelemetry
} from "@superstarter/operational-telemetry/effect"
import { SqlState } from "@superstarter/operational-telemetry/failure"
import { TodoId, TodoNotFound, TodoTitle } from "@superstarter/todo-protocol/todos"
import { PostgresTransientFailure } from "@superstarter/todo-protocol/transient-failure"
import { sql } from "drizzle-orm"
import {
	Array as Arr,
	Deferred,
	Effect,
	Exit,
	Fiber,
	Layer,
	ManagedRuntime,
	Option,
	Predicate,
	Schedule,
	Schema
} from "effect"
import { v7 } from "uuid"
import {
	ApplicationPostgres,
	ApplicationPostgresLive,
	withApplicationPostgres
} from "#server/postgres/runtime.ts"
import { flipTodo, insertTodo, readTodos, removeTodo } from "#server/todos/todos.ts"

/**
 * The todo Effects the server actions run, against the throwaway test database `pnpm test` just
 * rebuilt (LOCAL_POSTGRES_DATABASE=superstarter_test), through the application's own pool, signed
 * in as `app` with only the programs' grants.
 */
const runtime = ManagedRuntime.make(
	ApplicationPostgresLive.pipe(
		Layer.provideMerge(
			Layer.effect(
				OperationalTelemetry,
				makeOperationalTelemetry({ service: "superstarter-web", deployment: { kind: "local" } })
			)
		)
	)
)

after(() => runtime.dispose())

/** A consumer's own refusal, which a transaction must hand back exactly as it was raised. */
class ConsumerRefused extends Schema.TaggedError<
	ConsumerRefused,
	{ readonly brand: unique symbol }
>()("ConsumerRefused", {}) {}

const titleOf = Schema.decodeUnknownEffect(TodoTitle)
const missingId = Schema.decodeEffect(TodoId)(v7())

const todoOf = (id: TodoId) =>
	Effect.map(readTodos, (todos) => Arr.findFirst(todos, (todo) => todo.id === id))

/** Every borrow went back: nothing waits, and every open client is idle. */
const poolIsIdle = Effect.flatMap(ApplicationPostgres, ({ pool }) => pool).pipe(
	Effect.map(({ native }) => ({
		waiting: native.waitingCount,
		idle: native.idleCount,
		total: native.totalCount
	}))
)

afterEach(() =>
	runtime.runPromise(
		poolIsIdle.pipe(
			Effect.tap((counts) =>
				Effect.sync(() => {
					assert.equal(counts.waiting, 0, "no borrow is still waiting")
					assert.equal(counts.idle, counts.total, "every client went back to the pool")
					assert.ok(counts.total <= 10, "the pool stayed within its bound")
				})
			)
		)
	)
)

/** The backend the borrowed client is signed in on. */
const backendPid = withPostgresStatement((scope) =>
	scope.run((database) =>
		database.execute<{ pid: number }>(sql`SELECT pg_catalog.pg_backend_pid() AS pid`)
	)
)

/** Whether some session of this database is blocked by the given backend right now. */
const blockedBy = (holder: number) =>
	withApplicationPostgres(
		withPostgresStatement((scope) =>
			scope.run((database) =>
				database.execute<{ blocked: boolean }>(
					sql`SELECT EXISTS (SELECT 1 FROM pg_catalog.pg_stat_activity WHERE ${holder} = ANY (pg_catalog.pg_blocking_pids(pid))) AS blocked`
				)
			)
		)
	).pipe(Effect.map(({ rows }) => Arr.some(rows, ({ blocked }) => blocked)))

/**
 * A SERIALIZABLE transaction flips the todo and holds its row lock while `contender` starts; once
 * the contender is blocked by the holder's backend, the holder commits. The contender's snapshot
 * predates the committed write, so its own update fails with SQLSTATE 40001.
 */
const contendedFlip = <A, E>(
	id: TodoId,
	contender: Effect.Effect<A, E, Effect.Services<typeof readTodos>>
) =>
	Effect.gen(function* () {
		const holding = yield* Deferred.make<number>()
		const release = yield* Deferred.make<void>()
		const holder = yield* withApplicationPostgres((database) =>
			Effect.flatMap(backendPid(database), ({ rows }) =>
				withPostgresTransaction(database, (scope) =>
					scope
						.runPrepared(flipTodoStatement, { id })
						.pipe(
							Effect.andThen(Deferred.succeed(holding, Option.getOrThrow(Arr.head(rows)).pid)),
							Effect.andThen(Deferred.await(release))
						)
				)
			)
		).pipe(Effect.forkChild)
		const pid = yield* Deferred.await(holding)
		const contending = yield* Effect.forkChild(contender)
		yield* blockedBy(pid).pipe(
			Effect.repeat({ until: (blocked) => blocked, schedule: Schedule.spaced("10 millis") })
		)
		yield* Deferred.succeed(release, undefined)
		yield* Fiber.join(holder)
		return yield* Fiber.await(contending)
	})

void test("a todo is created, listed, toggled and deleted", () =>
	runtime.runPromise(
		Effect.gen(function* () {
			const title = yield* titleOf("water the plants")
			const id = yield* insertTodo(title)
			assert.deepEqual(yield* todoOf(id), Option.some({ id, title, completed: false }))
			yield* flipTodo(id)
			assert.deepEqual(yield* todoOf(id), Option.some({ id, title, completed: true }))
			yield* removeTodo(id)
			assert.deepEqual(yield* todoOf(id), Option.none())
		})
	))

void test("a toggle or delete of a missing todo answers TodoNotFound", () =>
	runtime.runPromise(
		Effect.gen(function* () {
			const id = yield* missingId
			assert.deepEqual(yield* Effect.flip(flipTodo(id)), TodoNotFound.make({ id }))
			assert.deepEqual(yield* Effect.flip(removeTodo(id)), TodoNotFound.make({ id }))
		})
	))

void test("a SERIALIZABLE conflict is transient, and the retry answers it", () =>
	runtime.runPromise(
		Effect.gen(function* () {
			const title = yield* titleOf("settle the conflict")
			const id = yield* insertTodo(title)
			const conflicted = yield* contendedFlip(id, flipTodo(id))
			assert.deepEqual(
				Exit.findErrorOption(conflicted),
				Option.some(
					PostgresTransientFailure.make({
						operation: "statement",
						reason: "serialization-failure"
					})
				)
			)
			const retried = yield* contendedFlip(id, retryPostgresTransient(flipTodo(id)))
			assert.ok(Exit.isSuccess(retried), "the retried flip succeeded")
			assert.deepEqual(
				yield* todoOf(id),
				Option.some({ id, title, completed: true }),
				"three flips committed: the holder twice and the retry once"
			)
			yield* removeTodo(id)
		})
	))

void test("concurrent flips of one todo lose no update", () =>
	runtime.runPromise(
		Effect.gen(function* () {
			const title = yield* titleOf("flip it fifty times")
			const id = yield* insertTodo(title)
			const exits = yield* Effect.forEach(
				Arr.makeBy(50, () => Effect.exit(retryPostgresTransient(flipTodo(id)))),
				(flip) => flip,
				{ concurrency: "unbounded" }
			)
			const successes = Arr.filter(exits, Exit.isSuccess).length
			for (const exit of Arr.filter(exits, Exit.isFailure)) {
				assert.ok(
					Option.exists(Exit.findErrorOption(exit), Predicate.isTagged("PostgresTransientFailure")),
					"a flip that gave up gave up on a conflict"
				)
			}
			assert.deepEqual(
				yield* todoOf(id),
				Option.some({ id, title, completed: successes % 2 === 1 }),
				"the todo was flipped exactly once per successful flip"
			)
			yield* removeTodo(id)
		})
	))

void test("a transaction whose consumer fails rolls back and answers the consumer's own error", () =>
	runtime.runPromise(
		Effect.gen(function* () {
			const title = yield* titleOf("never committed")
			const inserted = yield* Deferred.make<TodoId>()
			const exit = yield* withApplicationPostgres(
				withPostgresTransaction((scope) =>
					scope.runPrepared(insertTodoStatement, { title }).pipe(
						Effect.flatMap(([row]) => Deferred.succeed(inserted, row.id)),
						Effect.andThen(Effect.fail(ConsumerRefused.make({})))
					)
				)
			).pipe(Effect.exit)
			assert.deepEqual(Exit.findErrorOption(exit), Option.some(ConsumerRefused.make({})))
			assert.deepEqual(yield* todoOf(yield* Deferred.await(inserted)), Option.none())
		})
	))

void test("an interrupted transaction rolls back and leaves the pool clean", () =>
	runtime.runPromise(
		Effect.gen(function* () {
			const title = yield* titleOf("interrupted mid-transaction")
			const inserted = yield* Deferred.make<TodoId>()
			const open = yield* withApplicationPostgres(
				withPostgresTransaction((scope) =>
					scope.runPrepared(insertTodoStatement, { title }).pipe(
						Effect.flatMap(([row]) => Deferred.succeed(inserted, row.id)),
						Effect.andThen(Effect.never)
					)
				)
			).pipe(Effect.forkChild)
			const id = yield* Deferred.await(inserted)
			yield* Fiber.interrupt(open)
			const exit = yield* Fiber.await(open)
			assert.ok(Exit.hasInterrupts(exit), "the transaction ended interrupted")
			assert.deepEqual(yield* todoOf(id), Option.none(), "its insert was rolled back")
			const later = yield* insertTodo(yield* titleOf("the next borrow is clean"))
			assert.ok(Option.isSome(yield* todoOf(later)), "a later write commits normally")
			yield* removeTodo(later)
		})
	))

void test("the column refuses a title the TodoTitle brand refuses", () =>
	runtime.runPromise(
		Effect.gen(function* () {
			const checkViolation = yield* Schema.decodeEffect(SqlState)("23514")
			const refused = yield* withApplicationPostgres(
				withPostgresStatement((scope) =>
					scope.run((database) =>
						database.execute(sql`INSERT INTO core.todos (title) VALUES ('  padded ')`)
					)
				)
			).pipe(Effect.flip)
			assert.deepEqual(
				refused,
				PostgresStatementRejected.make({
					operation: "statement",
					diagnostic: { kind: "sqlstate", sqlState: checkViolation, constraint: "todos_title_ck" }
				}),
				"the CHECK and the brand agree"
			)
		})
	))
