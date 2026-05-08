import { sql } from "drizzle-orm"
import { bigint, integer, pgTable, text, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core"

const users = pgTable(
	"users",
	{
		id: uuid("id").primaryKey().notNull().default(sql`uuidv7()`),
		name: varchar("name", { length: 256 }),
		email: varchar("email", { length: 320 }).notNull(),
		emailVerifiedMs: bigint("email_verified_ms", { mode: "number" }),
		image: text("image"),
		targetPercentile: integer("target_percentile"),
		targetDateMs: bigint("target_date_ms", { mode: "number" }),
		// Practice round commit 3 (`docs/plans/practice-round.md` §5
		// commit 3 + decision 2): target raw score the user is aiming
		// for on a 50-question CCAT full sim. notNull + default 40 per
		// decision 2 mirrors the dashboard round's STUB_GOAL_SCORE so
		// loadUserProfile can drop the stub and read this column
		// directly (commit 4). Migration 0004_*.sql backfills every
		// existing row to 40.
		targetScore: integer("target_score").notNull().default(40),
		createdAtMs: bigint("created_at_ms", { mode: "number" })
			.notNull()
			.default(sql`(extract(epoch from now()) * 1000)::bigint`)
	},
	(table) => [uniqueIndex("users_email_idx").on(table.email)]
)

export { users }
