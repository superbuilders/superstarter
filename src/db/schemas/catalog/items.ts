import { sql } from "drizzle-orm"
import { index, jsonb, pgEnum, pgTable, text, uuid, varchar } from "drizzle-orm/pg-core"
import { vector } from "@/db/lib/pgvector"
import { strategies } from "@/db/schemas/catalog/strategies"
import { subTypes } from "@/db/schemas/catalog/sub-types"

const itemDifficulty = pgEnum("item_difficulty", ["easy", "medium", "hard", "brutal"])

const itemSource = pgEnum("item_source", ["real", "generated"])

const itemStatus = pgEnum("item_status", ["live", "candidate", "retired"])

const items = pgTable(
	"items",
	{
		id: uuid("id").primaryKey().notNull().default(sql`uuidv7()`),
		subTypeId: varchar("sub_type_id", { length: 64 })
			.notNull()
			.references(() => subTypes.id),
		difficulty: itemDifficulty("difficulty").notNull(),
		source: itemSource("source").notNull(),
		status: itemStatus("status").notNull().default("candidate"),
		body: jsonb("body").notNull(),
		optionsJson: jsonb("options_json").notNull(),
		correctAnswer: varchar("correct_answer", { length: 64 }).notNull(),
		explanation: text("explanation"),
		strategyId: uuid("strategy_id").references(() => strategies.id),
		embedding: vector("embedding", { dimensions: 1536 }),
		metadataJson: jsonb("metadata_json").notNull().default(sql`'{}'::jsonb`),
		// Source provenance (added in phase5-testbank-re-extraction round
		// commit 2 per Q1 redline — column addition over metadata_json keys
		// for forward-compat with admin-portal "show items from {folder}"
		// filter queries). Both nullable: the 50 pre-round seed items have
		// no source provenance and stay at NULL.
		sourceFolder: varchar("source_folder", { length: 128 }),
		sourceFilename: varchar("source_filename", { length: 256 })
	},
	(table) => [
		index("items_sub_type_status_idx").on(table.subTypeId, table.status),
		index("items_sub_type_difficulty_status_idx").on(
			table.subTypeId,
			table.difficulty,
			table.status
		),
		index("items_source_folder_idx").on(table.sourceFolder)
		// IVFFlat / HNSW index on embedding deferred per design decision —
		// sequential scan is faster than the index at v1 bank scale.
	]
)

export { itemDifficulty, items, itemSource, itemStatus }
