import { bigint, boolean, pgEnum, pgTable, primaryKey, uuid, varchar } from "drizzle-orm/pg-core"
import { users } from "@/db/schemas/auth/users"
import { subTypes } from "@/db/schemas/catalog/sub-types"

const masteryLevel = pgEnum("mastery_level", ["learning", "fluent", "mastered", "decayed"])

const masteryState = pgTable(
	"mastery_state",
	{
		userId: uuid("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		subTypeId: varchar("sub_type_id", { length: 64 })
			.notNull()
			.references(() => subTypes.id),
		currentState: masteryLevel("current_state").notNull(),
		wasMastered: boolean("was_mastered").notNull().default(false),
		updatedAtMs: bigint("updated_at_ms", { mode: "number" }).notNull()
	},
	(table) => [
		primaryKey({
			name: "mastery_state_user_sub_type_pk",
			columns: [table.userId, table.subTypeId]
		})
	]
)

export { masteryLevel, masteryState }
