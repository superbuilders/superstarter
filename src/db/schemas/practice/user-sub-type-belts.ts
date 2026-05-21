// STUB: minimal schema for dashboard read paths; expand in the Belts PRD.
//
// One row per (user, sub_type). Stores the user's current belt level,
// fractional progress toward the next promotion, and a precomputed
// at-risk flag (so the dashboard query is a single index scan, not a
// rolling-window aggregate every page load).
//
// Migration deliberately deferred: the dashboard ships with `loadAllBelts`
// returning 14 white-belt rows, so no rows of this table are read by the
// dashboard yet. The Belts PRD adds the migration, the seed, and the
// promotion-evaluation cron that writes here. Per Dashboard PRD §16 +
// `docs/plans/dashboard.md` §5 commit 2: this file lands as a Drizzle
// definition only — `bun db:generate` / `db:push` / `db:migrate` are NOT
// run as part of the Dashboard round.

import { sql } from "drizzle-orm"
import { bigint, boolean, pgEnum, pgTable, primaryKey, real, uuid, varchar } from "drizzle-orm/pg-core"
import { users } from "@/db/schemas/auth/users"
import { subTypes } from "@/db/schemas/catalog/sub-types"

const beltLevel = pgEnum("belt_level", ["white", "blue", "brown", "black"])

const userSubTypeBelts = pgTable(
	"user_sub_type_belts",
	{
		userId: uuid("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		subTypeId: varchar("sub_type_id", { length: 64 })
			.notNull()
			.references(() => subTypes.id),
		belt: beltLevel("belt").notNull().default("white"),
		progressToNext: real("progress_to_next").notNull().default(0),
		atRisk: boolean("at_risk").notNull().default(false),
		updatedAtMs: bigint("updated_at_ms", { mode: "number" })
			.notNull()
			.default(sql`(extract(epoch from now()) * 1000)::bigint`)
	},
	(table) => [
		primaryKey({
			name: "user_sub_type_belts_user_sub_type_pk",
			columns: [table.userId, table.subTypeId]
		})
	]
)

export { beltLevel, userSubTypeBelts }
