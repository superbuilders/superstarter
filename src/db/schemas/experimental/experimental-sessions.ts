import { sql } from "drizzle-orm"
import { bigint, index, integer, jsonb, pgEnum, pgTable, uuid, varchar } from "drizzle-orm/pg-core"
import { users } from "@/db/schemas/auth/users"
import { subTypes } from "@/db/schemas/catalog/sub-types"

const experimentalSessionType = pgEnum("experimental_session_type", [
	"practice_test",
	"drill",
	"review"
])

const experimentalCompletionReason = pgEnum("experimental_completion_reason", [
	"completed",
	"abandoned"
])

const experimentalSessions = pgTable(
	"experimental_sessions",
	{
		id: uuid("id").primaryKey().notNull().default(sql`uuidv7()`),
		userId: uuid("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		type: experimentalSessionType("type").notNull(),
		subTypeId: varchar("sub_type_id", { length: 64 }).references(() => subTypes.id),
		targetQuestionCount: integer("target_question_count").notNull(),
		startedAtMs: bigint("started_at_ms", { mode: "number" }).notNull(),
		endedAtMs: bigint("ended_at_ms", { mode: "number" }),
		lastHeartbeatMs: bigint("last_heartbeat_ms", { mode: "number" })
			.notNull()
			.default(sql`(extract(epoch from now()) * 1000)::bigint`),
		completionReason: experimentalCompletionReason("completion_reason"),
		recencyExcludedItemIds: uuid("recency_excluded_item_ids")
			.array()
			.notNull()
			.default(sql`'{}'::uuid[]`),
		metadataJson: jsonb("metadata_json").notNull().default(sql`'{}'::jsonb`)
	},
	(table) => [
		index("experimental_sessions_user_id_idx").on(table.userId),
		index("experimental_sessions_user_type_ended_idx").on(table.userId, table.type, table.endedAtMs),
		index("experimental_sessions_abandon_sweep_idx")
			.on(table.lastHeartbeatMs)
			.where(sql`${table.endedAtMs} IS NULL`),
		index("experimental_sessions_recency_excluded_gin_idx")
			.using("gin", table.recencyExcludedItemIds)
	]
)

export { experimentalCompletionReason, experimentalSessionType, experimentalSessions }
