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
		createdAtMs: bigint("created_at_ms", { mode: "number" })
			.notNull()
			.default(sql`(extract(epoch from now()) * 1000)::bigint`)
	},
	(table) => [uniqueIndex("users_email_idx").on(table.email)]
)

export { users }
