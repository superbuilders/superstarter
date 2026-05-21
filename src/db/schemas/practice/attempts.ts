import { sql } from "drizzle-orm"
import { boolean, index, integer, jsonb, pgTable, uuid, varchar } from "drizzle-orm/pg-core"
import { itemDifficulty, items } from "@/db/schemas/catalog/items"
import { practiceSessions } from "@/db/schemas/practice/practice-sessions"

const attempts = pgTable(
	"attempts",
	{
		id: uuid("id").primaryKey().notNull().default(sql`uuidv7()`),
		sessionId: uuid("session_id")
			.notNull()
			.references(() => practiceSessions.id, { onDelete: "cascade" }),
		itemId: uuid("item_id")
			.notNull()
			.references(() => items.id),
		selectedAnswer: varchar("selected_answer", { length: 64 }),
		correct: boolean("correct").notNull(),
		latencyMs: integer("latency_ms").notNull(),
		servedAtTier: itemDifficulty("served_at_tier").notNull(),
		fallbackFromTier: itemDifficulty("fallback_from_tier"),
		metadataJson: jsonb("metadata_json").notNull().default(sql`'{}'::jsonb`)
	},
	(table) => [
		index("attempts_session_id_idx").on(table.sessionId),
		index("attempts_item_id_idx").on(table.itemId)
	]
)

export { attempts }
