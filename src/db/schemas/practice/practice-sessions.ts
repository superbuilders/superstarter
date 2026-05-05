import { sql } from "drizzle-orm"
import { bigint, index, integer, pgEnum, pgTable, uuid, varchar } from "drizzle-orm/pg-core"
import { users } from "@/db/schemas/auth/users"
import { subTypes } from "@/db/schemas/catalog/sub-types"

const sessionType = pgEnum("session_type", [
	"diagnostic",
	"drill",
	"full_length",
	"simulation"
])

const timerMode = pgEnum("timer_mode", ["standard"])

const completionReason = pgEnum("completion_reason", ["completed", "abandoned"])

const practiceSessions = pgTable(
	"practice_sessions",
	{
		id: uuid("id").primaryKey().notNull().default(sql`uuidv7()`),
		userId: uuid("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		type: sessionType("type").notNull(),
		subTypeId: varchar("sub_type_id", { length: 64 }).references(() => subTypes.id),
		timerMode: timerMode("timer_mode"),
		targetQuestionCount: integer("target_question_count").notNull(),
		startedAtMs: bigint("started_at_ms", { mode: "number" }).notNull(),
		endedAtMs: bigint("ended_at_ms", { mode: "number" }),
		lastHeartbeatMs: bigint("last_heartbeat_ms", { mode: "number" })
			.notNull()
			.default(sql`(extract(epoch from now()) * 1000)::bigint`),
		completionReason: completionReason("completion_reason"),
		recencyExcludedItemIds: uuid("recency_excluded_item_ids")
			.array()
			.notNull()
			.default(sql`'{}'::uuid[]`),
		diagnosticOvertimeNoteShownAtMs: bigint("diagnostic_overtime_note_shown_at_ms", {
			mode: "number"
		})
	},
	(table) => [
		index("practice_sessions_user_id_idx").on(table.userId),
		index("practice_sessions_user_type_ended_idx").on(table.userId, table.type, table.endedAtMs),
		index("practice_sessions_abandon_sweep_idx")
			.on(table.lastHeartbeatMs)
			.where(sql`${table.endedAtMs} IS NULL`),
		index("practice_sessions_recency_excluded_gin_idx")
			.using("gin", table.recencyExcludedItemIds)
	]
)

export { completionReason, practiceSessions, sessionType, timerMode }
