import { sql } from "drizzle-orm"
import { boolean, index, pgTable, uuid, varchar } from "drizzle-orm/pg-core"

const coreTodos = pgTable(
	"core_todos",
	{
		id: uuid("id").primaryKey().notNull().default(sql`uuidv7()`),
		title: varchar("title", { length: 256 }).notNull(),
		completed: boolean("completed").notNull().default(false)
	},
	(table) => [index("core_todos_completed_idx").on(table.completed)]
)

export { coreTodos }
