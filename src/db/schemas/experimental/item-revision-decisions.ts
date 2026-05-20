import { sql } from "drizzle-orm"
import { bigint, index, pgEnum, pgTable, text, uuid } from "drizzle-orm/pg-core"
import { users } from "@/db/schemas/auth/users"
import { items } from "@/db/schemas/catalog/items"
import { experimentalItems } from "@/db/schemas/experimental/experimental-items"
import { itemEditProposals } from "@/db/schemas/experimental/item-edit-proposals"

const experimentalRevisionDecision = pgEnum("experimental_revision_decision", [
	"approve_as_is",
	"approve_edit",
	"reject",
	"needs_revision",
	"hide"
])

const itemRevisionDecisions = pgTable(
	"item_revision_decisions",
	{
		id: uuid("id").primaryKey().notNull().default(sql`uuidv7()`),
		experimentalItemId: uuid("experimental_item_id")
			.notNull()
			.references(() => experimentalItems.id, { onDelete: "cascade" }),
		proposalId: uuid("proposal_id").references(() => itemEditProposals.id, {
			onDelete: "set null"
		}),
		actedByUserId: uuid("acted_by_user_id")
			.notNull()
			.references(() => users.id, { onDelete: "restrict" }),
		decision: experimentalRevisionDecision("decision").notNull(),
		promotedItemId: uuid("promoted_item_id").references(() => items.id, {
			onDelete: "set null"
		}),
		decisionNotes: text("decision_notes"),
		actedAtMs: bigint("acted_at_ms", { mode: "number" })
			.notNull()
			.default(sql`(extract(epoch from now()) * 1000)::bigint`)
	},
	(table) => [
		index("item_revision_decisions_item_idx").on(table.experimentalItemId),
		index("item_revision_decisions_proposal_idx").on(table.proposalId),
		index("item_revision_decisions_actor_idx").on(table.actedByUserId),
		index("item_revision_decisions_acted_at_idx").on(table.actedAtMs)
	]
)

export { experimentalRevisionDecision, itemRevisionDecisions }
