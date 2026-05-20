import { sql } from "drizzle-orm"
import { boolean, index, integer, jsonb, pgTable, uuid, varchar } from "drizzle-orm/pg-core"
import { experimentalItems } from "@/db/schemas/experimental/experimental-items"
import { experimentalSessions } from "@/db/schemas/experimental/experimental-sessions"

const experimentalAttempts = pgTable(
	"experimental_attempts",
	{
		id: uuid("id").primaryKey().notNull().default(sql`uuidv7()`),
		sessionId: uuid("session_id")
			.notNull()
			.references(() => experimentalSessions.id, { onDelete: "cascade" }),
		experimentalItemId: uuid("experimental_item_id")
			.notNull()
			.references(() => experimentalItems.id, { onDelete: "cascade" }),
		selectedAnswer: varchar("selected_answer", { length: 64 }),
		correct: boolean("correct").notNull(),
		latencyMs: integer("latency_ms").notNull(),
		metadataJson: jsonb("metadata_json").notNull().default(sql`'{}'::jsonb`)
	},
	(table) => [
		index("experimental_attempts_session_id_idx").on(table.sessionId),
		index("experimental_attempts_item_id_idx").on(table.experimentalItemId)
	]
)

export { experimentalAttempts }
