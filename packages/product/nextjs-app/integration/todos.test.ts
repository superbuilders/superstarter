// @effect-diagnostics nodeBuiltinImport:off
import assert from "node:assert/strict"
import { after, test } from "node:test"
import { retryPostgresTransient } from "@superstarter/database/postgres/retry"
import {
	withPostgresStatement,
	withPostgresTransaction
} from "@superstarter/database/postgres/transaction"
import { flipTodoStatement } from "@superstarter/database/queries/todos"
import {
	makeOperationalTelemetry,
	OperationalTelemetry
} from "@superstarter/operational-telemetry/effect"
import { TodoId, TodoTitle } from "@superstarter/todo-protocol/todos"
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
	Schedule,
	Schema
} from "effect"
import { v7 } from "uuid"
import { ApplicationPostgresLive, withApplicationPostgres } from "#server/postgres/runtime.ts"
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

const titleOf = Schema.decodeUnknownEffect(TodoTitle)
const missingId = Schema.decodeEffect(TodoId)(v7())

const todoOf = (id: TodoId) =>
	Effect.map(readTodos, (todos) => Arr.findFirst(todos, (todo) => todo.id === id))

/** Whether some session of this database is waiting on a lock right now. */
const someoneWaitsOnALock = withApplicationPostgres(
	withPostgresStatement((scope) =>
		scope.run((database) =>
			database.execute<{ waiting: boolean }>(
				sql`SELECT count(*) > 0 AS waiting FROM pg_catalog.pg_stat_activity WHERE datname = pg_catalog.current_database() AND wait_event_type = 'Lock'`
			)
		)
	)
).pipe(Effect.map(({ rows }) => Arr.some(rows, ({ waiting }) => waiting)))

/**
 * A SERIALIZABLE transaction flips the todo and holds its row lock while `contender` starts; once
 * the contender is waiting on that lock, the holder commits. The contender's snapshot predates the
 * committed write, so its own update fails with SQLSTATE 40001.
 */
const contendedFlip = <A, E>(
	id: TodoId,
	contender: Effect.Effect<A, E, Effect.Services<typeof readTodos>>
) =>
	Effect.gen(function* () {
		const flipped = yield* Deferred.make<void>()
		const release = yield* Deferred.make<void>()
		const holder = yield* withApplicationPostgres(
			withPostgresTransaction((scope) =>
				scope
					.runPrepared(flipTodoStatement, { id })
					.pipe(
						Effect.andThen(Deferred.succeed(flipped, undefined)),
						Effect.andThen(Deferred.await(release))
					)
			)
		).pipe(Effect.forkChild)
		yield* Deferred.await(flipped)
		const contending = yield* Effect.forkChild(contender)
		yield* someoneWaitsOnALock.pipe(
			Effect.repeat({ until: (waiting) => waiting, schedule: Schedule.spaced("10 millis") })
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
			const created = yield* todoOf(id)
			assert.ok(Option.isSome(created), "the list holds the new todo")
			assert.deepEqual(created.value, { id, title, completed: false })
			yield* flipTodo(id)
			const toggled = yield* todoOf(id)
			assert.ok(toggled._tag === "Some" && toggled.value.completed, "the toggle completed it")
			yield* removeTodo(id)
			assert.equal((yield* todoOf(id))._tag, "None", "the delete removed it")
		})
	))

void test("a toggle or delete of a missing todo answers TodoNotFound", () =>
	runtime.runPromise(
		Effect.gen(function* () {
			const id = yield* missingId
			assert.equal((yield* Effect.flip(flipTodo(id)))._tag, "TodoNotFound")
			assert.equal((yield* Effect.flip(removeTodo(id)))._tag, "TodoNotFound")
		})
	))

void test("a SERIALIZABLE conflict is transient, and the retry answers it", () =>
	runtime.runPromise(
		Effect.gen(function* () {
			const id = yield* insertTodo(yield* titleOf("settle the conflict"))
			const conflicted = yield* contendedFlip(id, flipTodo(id))
			assert.ok(Exit.isFailure(conflicted), "the contending flip failed")
			assert.equal(
				(yield* Effect.flip(conflicted))._tag,
				"PostgresTransientFailure",
				"its failure is the transient one"
			)
			const retried = yield* contendedFlip(id, retryPostgresTransient(flipTodo(id)))
			assert.ok(Exit.isSuccess(retried), "the retried flip succeeded")
			const settled = yield* todoOf(id)
			assert.ok(
				settled._tag === "Some" && settled.value.completed,
				"three flips committed: the holder twice and the retry once"
			)
			yield* removeTodo(id)
		})
	))
