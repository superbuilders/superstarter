import { sql } from "drizzle-orm"
import { bigint, boolean, index, integer, pgEnum, pgTable, real, text, uuid } from "drizzle-orm/pg-core"
import { items } from "@/db/schemas/catalog/items"

const promotionDecision = pgEnum("promotion_decision", ["promote", "retire", "hold"])

const candidatePromotionLog = pgTable(
	"candidate_promotion_log",
	{
		id: uuid("id").primaryKey().notNull().default(sql`uuidv7()`),
		itemId: uuid("item_id")
			.notNull()
			.references(() => items.id),
		decision: promotionDecision("decision").notNull(),
		observedAttempts: integer("observed_attempts").notNull(),
		observedAccuracy: real("observed_accuracy").notNull(),
		observedMedianLatencyMs: integer("observed_median_latency_ms").notNull(),
		decisionReason: text("decision_reason"),
		enforced: boolean("enforced").notNull().default(false),
		decidedAtMs: bigint("decided_at_ms", { mode: "number" }).notNull()
	},
	(table) => [
		index("candidate_promotion_log_item_id_idx").on(table.itemId),
		index("candidate_promotion_log_decided_at_idx").on(table.decidedAtMs)
	]
)

export { candidatePromotionLog, promotionDecision }
