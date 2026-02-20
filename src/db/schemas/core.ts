import { sql } from "drizzle-orm"
import { boolean, index, pgSchema, timestamp, uuid, varchar } from "drizzle-orm/pg-core"

const coreSchema = pgSchema("core")

const coreTodos = coreSchema.table(
	"todo",
	{
		id: uuid("id").defaultRandom().notNull().primaryKey(),
		title: varchar("title", { length: 256 }).notNull(),
		completed: boolean("completed").notNull().default(false),
		createdAt: timestamp("created_at", { withTimezone: true })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
	},
	(table) => [
		index("todo_completed_idx").on(table.completed),
		index("todo_created_at_idx").on(table.createdAt)
	]
)

export { coreSchema, coreTodos }
