import { desc, eq, not, sql } from "drizzle-orm"
import { preparePostgresStatement } from "#query/contracts.ts"
import { coreTodos } from "#schema/core/todos.ts"

/** Every todo, newest first: UUIDv7 ids sort by creation time. */
export const listTodosStatement = preparePostgresStatement({
	name: "superstarter_todos_list",
	build: (database, name) =>
		database
			.select({ id: coreTodos.id, title: coreTodos.title, completed: coreTodos.completed })
			.from(coreTodos)
			.orderBy(desc(coreTodos.id))
			.prepare(name)
})

/** Inserts one todo and returns the id PostgreSQL minted. */
export const insertTodoStatement = preparePostgresStatement({
	name: "superstarter_todos_insert",
	build: (database, name) =>
		database
			.insert(coreTodos)
			.values({ title: sql.placeholder("title") })
			.returning({ id: coreTodos.id })
			.prepare(name)
})

/** Flips one todo's completion in a single statement, so no read can race the write. */
export const flipTodoStatement = preparePostgresStatement({
	name: "superstarter_todos_flip",
	build: (database, name) =>
		database
			.update(coreTodos)
			.set({ completed: not(coreTodos.completed) })
			.where(eq(coreTodos.id, sql.placeholder("id")))
			.returning({ id: coreTodos.id })
			.prepare(name)
})

/** Deletes one todo. */
export const removeTodoStatement = preparePostgresStatement({
	name: "superstarter_todos_remove",
	build: (database, name) =>
		database
			.delete(coreTodos)
			.where(eq(coreTodos.id, sql.placeholder("id")))
			.returning({ id: coreTodos.id })
			.prepare(name)
})
