import { sql } from "drizzle-orm"
import { index, pgEnum, pgTable, text, uuid, varchar } from "drizzle-orm/pg-core"
import { subTypes } from "@/db/schemas/catalog/sub-types"

const strategyKind = pgEnum("strategy_kind", ["recognition", "technique", "trap"])

const strategies = pgTable(
	"strategies",
	{
		id: uuid("id").primaryKey().notNull().default(sql`uuidv7()`),
		subTypeId: varchar("sub_type_id", { length: 64 })
			.notNull()
			.references(() => subTypes.id),
		kind: strategyKind("kind").notNull(),
		text: text("text").notNull()
	},
	(table) => [index("strategies_sub_type_idx").on(table.subTypeId)]
)

export { strategies, strategyKind }
