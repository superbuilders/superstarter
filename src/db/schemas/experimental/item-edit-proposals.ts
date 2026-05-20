import { sql } from "drizzle-orm"
import { bigint, index, jsonb, pgTable, text, uuid, varchar } from "drizzle-orm/pg-core"
import { users } from "@/db/schemas/auth/users"
import { itemDifficulty } from "@/db/schemas/catalog/items"
import { subTypes } from "@/db/schemas/catalog/sub-types"
import { experimentalItems } from "@/db/schemas/experimental/experimental-items"

const itemEditProposals = pgTable(
	"item_edit_proposals",
	{
		id: uuid("id").primaryKey().notNull().default(sql`uuidv7()`),
		experimentalItemId: uuid("experimental_item_id")
			.notNull()
			.references(() => experimentalItems.id, { onDelete: "cascade" }),
		userId: uuid("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		proposedBody: jsonb("proposed_body"),
		proposedOptionsJson: jsonb("proposed_options_json"),
		proposedCorrectAnswer: varchar("proposed_correct_answer", { length: 64 }),
		proposedExplanation: text("proposed_explanation"),
		suggestedSubject: varchar("suggested_subject", { length: 64 }).references(() => subTypes.id, {
			onDelete: "set null"
		}),
		suggestedDifficulty: itemDifficulty("suggested_difficulty"),
		rationale: text("rationale"),
		submittedAtMs: bigint("submitted_at_ms", { mode: "number" })
			.notNull()
			.default(sql`(extract(epoch from now()) * 1000)::bigint`)
	},
	(table) => [
		index("item_edit_proposals_item_idx").on(table.experimentalItemId),
		index("item_edit_proposals_user_idx").on(table.userId),
		index("item_edit_proposals_submitted_idx").on(table.submittedAtMs)
	]
)

export { itemEditProposals }
