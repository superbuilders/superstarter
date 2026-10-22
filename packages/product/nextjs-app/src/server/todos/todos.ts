import "server-only"
import { withPostgresStatement } from "@superstarter/database/postgres/transaction"
import {
	flipTodoStatement,
	insertTodoStatement,
	listTodosStatement,
	removeTodoStatement
} from "@superstarter/database/queries/todos"
import { annotateOperation, observed } from "@superstarter/operational-telemetry/effect"
import { OPERATIONAL_SPANS } from "@superstarter/operational-telemetry/spans"
import { type TodoId, TodoNotFound, type TodoTitle } from "@superstarter/todo-protocol/todos"
import { Array as Arr, Effect } from "effect"
import { withApplicationPostgres } from "#server/postgres/runtime.ts"

/** Every todo, newest first: UUIDv7 ids sort by creation time. */
export const readTodos = withApplicationPostgres(
	withPostgresStatement((scope) => scope.runPrepared(listTodosStatement, {}))
).pipe(observed(OPERATIONAL_SPANS.todosRead))

/** Inserts a todo and answers the one id PostgreSQL minted for it. */
export const insertTodo = (title: TodoTitle) =>
	withApplicationPostgres(
		withPostgresStatement((scope) => scope.runPrepared(insertTodoStatement, { title }))
	).pipe(
		Effect.map(([row]) => row.id),
		Effect.tap((id) =>
			annotateOperation(OPERATIONAL_SPANS.todoCreate, { "superstarter.todo.id": id })
		),
		observed(OPERATIONAL_SPANS.todoCreate)
	)

/** The one row a toggle or delete returned, or the refusal that it named nothing. */
const affectedOf =
	(id: TodoId) =>
	(rows: ReadonlyArray<Readonly<{ id: TodoId }>>): Effect.Effect<void, TodoNotFound> => {
		if (Arr.isReadonlyArrayNonEmpty(rows)) {
			return Effect.void
		}
		return Effect.fail(TodoNotFound.make({ id }))
	}

/** Flips a todo's completion in one statement, so no read can race the write. */
export const flipTodo = (id: TodoId) =>
	withApplicationPostgres(
		withPostgresStatement((scope) => scope.runPrepared(flipTodoStatement, { id }))
	).pipe(
		Effect.flatMap(affectedOf(id)),
		observed(OPERATIONAL_SPANS.todoToggle, { "superstarter.todo.id": id })
	)

/** Deletes a todo. */
export const removeTodo = (id: TodoId) =>
	withApplicationPostgres(
		withPostgresStatement((scope) => scope.runPrepared(removeTodoStatement, { id }))
	).pipe(
		Effect.flatMap(affectedOf(id)),
		observed(OPERATIONAL_SPANS.todoDelete, { "superstarter.todo.id": id })
	)
