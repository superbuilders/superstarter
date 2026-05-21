import { sql } from "drizzle-orm"
import { bigint, index, jsonb, pgEnum, pgTable, text, uuid } from "drizzle-orm/pg-core"
import { users } from "@/db/schemas/auth/users"
import { items } from "@/db/schemas/catalog/items"

// Admin action audit trail (Phase 4 sub-phase b §1.0 per Q7).
//
// Records every admin action against a candidate item: edit, approve,
// reject, flag, unflag. The before_json / after_json snapshot pair
// captures the full row state at action time, enabling replay-of-edits
// for forensics. created_at_ms is bigint epoch ms per project no-
// timestamp-columns convention.
//
// FK cascade rules (per redirector ratification at §1.0 commit-0):
// - item_id ON DELETE CASCADE: admin-action history is meaningless if
//   the item is hard-deleted. Items are NEVER hard-deleted under the
//   Q6 soft-delete model (status='rejected' is the soft-delete path);
//   this CASCADE is a "shouldn't fire" guard.
// - admin_user_id ON DELETE RESTRICT: don't allow user deletion if they
//   have authored audit actions. Preserves admin attribution. If a
//   former admin must be removed operationally, NULL out their
//   admin_user_id rather than weakening the FK.

const itemAdminActionType = pgEnum("item_admin_action_type", [
	"edit",
	"approve",
	"reject",
	"flag",
	"unflag"
])

const itemAdminActions = pgTable(
	"item_admin_actions",
	{
		id: uuid("id").primaryKey().notNull().default(sql`uuidv7()`),
		itemId: uuid("item_id")
			.notNull()
			.references(() => items.id, { onDelete: "cascade" }),
		adminUserId: uuid("admin_user_id")
			.notNull()
			.references(() => users.id, { onDelete: "restrict" }),
		actionType: itemAdminActionType("action_type").notNull(),
		beforeJson: jsonb("before_json").notNull(),
		afterJson: jsonb("after_json").notNull(),
		reason: text("reason"),
		createdAtMs: bigint("created_at_ms", { mode: "number" })
			.notNull()
			.default(sql`(extract(epoch from now()) * 1000)::bigint`)
	},
	(table) => [
		index("item_admin_actions_item_created_idx").on(table.itemId, table.createdAtMs),
		index("item_admin_actions_admin_user_idx").on(table.adminUserId)
	]
)

export { itemAdminActions, itemAdminActionType }
