import { sql } from "drizzle-orm"
import { bigint, boolean, index, pgTable, text, uuid, varchar } from "drizzle-orm/pg-core"
import { users } from "@/db/schemas/auth/users"
import { itemDifficulty } from "@/db/schemas/catalog/items"
import { subTypes } from "@/db/schemas/catalog/sub-types"
import { experimentalAttempts } from "@/db/schemas/experimental/experimental-attempts"
import { experimentalItems } from "@/db/schemas/experimental/experimental-items"
import { experimentalSessions } from "@/db/schemas/experimental/experimental-sessions"

const itemAudits = pgTable(
	"item_audits",
	{
		id: uuid("id").primaryKey().notNull().default(sql`uuidv7()`),
		experimentalItemId: uuid("experimental_item_id")
			.notNull()
			.references(() => experimentalItems.id, { onDelete: "cascade" }),
		userId: uuid("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		experimentalSessionId: uuid("experimental_session_id").references(
			() => experimentalSessions.id,
			{ onDelete: "set null" }
		),
		experimentalAttemptId: uuid("experimental_attempt_id").references(
			() => experimentalAttempts.id,
			{ onDelete: "set null" }
		),
		makesSense: boolean("makes_sense"),
		correctAnswerIsRight: boolean("correct_answer_is_right"),
		subjectTagIsRight: boolean("subject_tag_is_right"),
		difficultyIsRight: boolean("difficulty_is_right"),
		suggestedSubject: varchar("suggested_subject", { length: 64 }).references(() => subTypes.id, {
			onDelete: "set null"
		}),
		suggestedDifficulty: itemDifficulty("suggested_difficulty"),
		notes: text("notes"),
		submittedAtMs: bigint("submitted_at_ms", { mode: "number" })
			.notNull()
			.default(sql`(extract(epoch from now()) * 1000)::bigint`)
	},
	(table) => [
		index("item_audits_item_idx").on(table.experimentalItemId),
		index("item_audits_user_idx").on(table.userId),
		index("item_audits_session_idx").on(table.experimentalSessionId),
		index("item_audits_attempt_idx").on(table.experimentalAttemptId)
	]
)

export { itemAudits }
