import "server-only"
import { withPostgresStatement } from "@superstarter/database/postgres/transaction"
import {
	flipTodoStatement,
	insertTodoStatement,
	listTodosStatement,
	removeTodoStatement
} from "@superstarter/database/queries/todos"
import type { PostgresQueryScope } from "@superstarter/database/query/contracts"
import { coreTodos } from "@superstarter/database/schema/core/todos"
import { annotateOperation, observed } from "@superstarter/operational-telemetry/effect"
import { OPERATIONAL_SPANS } from "@superstarter/operational-telemetry/spans"
import { TodoId, TodoNotFound, TodoTitle } from "@superstarter/todo-protocol/todos"
import { createSelectSchema } from "drizzle-orm/effect-schema"
import { Array as Arr, Effect, Schema } from "effect"
import { withApplicationPostgres } from "#server/postgres/runtime.ts"

/** One todo as the list renders it, derived from the table so its shape has one home. */
const Todo = createSelectSchema(coreTodos, { id: TodoId, title: TodoTitle })
export type Todo = typeof Todo.Type

const decodeTodos = Schema.decodeEffect(Schema.Array(Todo))

/** Our own SQL decodes once; a row that does not decode is a defect, never a state. */
const listTodos = (scope: PostgresQueryScope) =>
	scope
		.runPrepared(listTodosStatement, {})
		.pipe(Effect.flatMap((rows) => decodeTodos(rows).pipe(Effect.orDie)))

/** Every todo, newest first: UUIDv7 ids sort by creation time. */
export const readTodos = withApplicationPostgres(withPostgresStatement(listTodos)).pipe(
	observed(OPERATIONAL_SPANS.todosRead)
)

/** Inserts a todo and answers its new id. An INSERT that returns no row is a defect. */
export const insertTodo = (title: TodoTitle) =>
	withApplicationPostgres(
		withPostgresStatement((scope) => scope.runPrepared(insertTodoStatement, { title }))
	).pipe(
		Effect.flatMap((rows) => Effect.fromOption(Arr.head(rows)).pipe(Effect.orDie)),
		Effect.map((row) => row.id),
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
