import { TodoId, TodoTitle } from "@superstarter/todo-protocol/todos"
import { desc, eq, not, sql } from "drizzle-orm"
import { createSelectSchema } from "drizzle-orm/effect-schema"
import { Schema } from "effect"
import { preparePostgresStatement } from "#query/contracts.ts"
import { coreTodos } from "#schema/core/todos.ts"

/** One todo as the list renders it, derived from the table so its shape has one home. */
export const Todo = createSelectSchema(coreTodos, { id: TodoId, title: TodoTitle })
export type Todo = typeof Todo.Type

/** The id a write answers with when it touched a row. */
const TouchedTodo = Schema.Struct({ id: TodoId })

/** Every todo, newest first: UUIDv7 ids sort by creation time. */
export const listTodosStatement = preparePostgresStatement({
	name: "superstarter_todos_list",
	result: Schema.Array(Todo),
	build: (database, name) =>
		database
			.select({ id: coreTodos.id, title: coreTodos.title, completed: coreTodos.completed })
			.from(coreTodos)
			.orderBy(desc(coreTodos.id))
			.prepare(name)
})

/** Inserts one todo and answers exactly the one id PostgreSQL minted. */
export const insertTodoStatement = preparePostgresStatement({
	name: "superstarter_todos_insert",
	result: Schema.Tuple([TouchedTodo]),
	build: (database, name) =>
		database
			.insert(coreTodos)
			.values({ title: sql.placeholder("title") })
			.returning({ id: coreTodos.id })
			.prepare(name)
})

/** Flips one todo's completion in a single statement, so no read can race the write. It answers
 * the todo's id, or nothing when no todo has that id. */
export const flipTodoStatement = preparePostgresStatement({
	name: "superstarter_todos_flip",
	result: Schema.Array(TouchedTodo),
	build: (database, name) =>
		database
			.update(coreTodos)
			.set({ completed: not(coreTodos.completed) })
			.where(eq(coreTodos.id, sql.placeholder("id")))
			.returning({ id: coreTodos.id })
			.prepare(name)
})

/** Deletes one todo, answering its id, or nothing when no todo has that id. */
export const removeTodoStatement = preparePostgresStatement({
	name: "superstarter_todos_remove",
	result: Schema.Array(TouchedTodo),
	build: (database, name) =>
		database
			.delete(coreTodos)
			.where(eq(coreTodos.id, sql.placeholder("id")))
			.returning({ id: coreTodos.id })
			.prepare(name)
})

/** Every statement this module declares, for the suite that PREPAREs each one under `app`. */
export const TODO_STATEMENTS = [
	listTodosStatement,
	insertTodoStatement,
	flipTodoStatement,
	removeTodoStatement
] as const
