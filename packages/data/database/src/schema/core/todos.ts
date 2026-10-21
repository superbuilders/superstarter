import {
	TODO_TITLE_MAX_LENGTH,
	type TodoId,
	type TodoTitle
} from "@superstarter/todo-protocol/todos"
import { sql } from "drizzle-orm"
import { boolean, check, index, primaryKey, uuid, varchar } from "drizzle-orm/pg-core"
import { core } from "#schema/core/namespace.ts"

export const coreTodos = core.table(
	"todos",
	{
		id: uuid()
			.$type<TodoId>()
			.default(sql`uuidv7()`)
			.notNull(),
		title: varchar({ length: TODO_TITLE_MAX_LENGTH }).$type<TodoTitle>().notNull(),
		completed: boolean().notNull().default(false)
	},
	(table) => [
		primaryKey({ name: "todos_pk", columns: [table.id] }),
		check("todos_id_v7_ck", sql`uuid_extract_version(${table.id}) = 7`),
		check("todos_title_ck", sql`char_length(btrim(${table.title})) > 0`),
		index("todos_completed_idx").on(table.completed)
	]
)
