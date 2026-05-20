import { sql } from "drizzle-orm"
import { bigint, index, integer, jsonb, pgEnum, pgTable, text, uuid, varchar } from "drizzle-orm/pg-core"
import type { AnyPgColumn } from "drizzle-orm/pg-core"
import { users } from "@/db/schemas/auth/users"
import { itemDifficulty, items } from "@/db/schemas/catalog/items"
import { subTypes } from "@/db/schemas/catalog/sub-types"

const experimentalAuditStatus = pgEnum("experimental_audit_status", [
	"unaudited",
	"approved",
	"rejected",
	"needs_revision"
])

const experimentalItems = pgTable(
	"experimental_items",
	{
		id: uuid("id").primaryKey().notNull().default(sql`uuidv7()`),
		subTypeId: varchar("sub_type_id", { length: 64 })
			.notNull()
			.references(() => subTypes.id),
		difficulty: itemDifficulty("difficulty").notNull(),
		body: jsonb("body").notNull(),
		optionsJson: jsonb("options_json").notNull(),
		correctAnswer: varchar("correct_answer", { length: 64 }).notNull(),
		explanation: text("explanation"),
		metadataJson: jsonb("metadata_json").notNull().default(sql`'{}'::jsonb`),
		auditStatus: experimentalAuditStatus("audit_status").notNull().default("unaudited"),
		sourceVersion: integer("source_version").notNull().default(1),
		parentExperimentalItemId: uuid("parent_experimental_item_id").references(
			(): AnyPgColumn => experimentalItems.id,
			{ onDelete: "set null" }
		),
		promotedItemId: uuid("promoted_item_id").references(() => items.id, {
			onDelete: "set null"
		}),
		hiddenAtMs: bigint("hidden_at_ms", { mode: "number" }),
		createdByUserId: uuid("created_by_user_id").references(() => users.id, {
			onDelete: "set null"
		}),
		createdAtMs: bigint("created_at_ms", { mode: "number" })
			.notNull()
			.default(sql`(extract(epoch from now()) * 1000)::bigint`),
		updatedAtMs: bigint("updated_at_ms", { mode: "number" })
			.notNull()
			.default(sql`(extract(epoch from now()) * 1000)::bigint`)
	},
	(table) => [
		index("experimental_items_sub_type_audit_idx").on(table.subTypeId, table.auditStatus),
		index("experimental_items_audit_hidden_idx").on(table.auditStatus, table.hiddenAtMs),
		index("experimental_items_audit_difficulty_idx").on(table.auditStatus, table.difficulty),
		index("experimental_items_parent_idx").on(table.parentExperimentalItemId),
		index("experimental_items_promoted_idx").on(table.promotedItemId)
	]
)

export { experimentalAuditStatus, experimentalItems }
