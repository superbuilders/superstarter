import { sql } from "drizzle-orm"
import { bigint, index, pgTable, text, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core"
import { users } from "@/db/schemas/auth/users"

const accounts = pgTable(
	"accounts",
	{
		id: uuid("id").primaryKey().notNull().default(sql`uuidv7()`),
		userId: uuid("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		type: varchar("type", { length: 64 }).notNull(),
		provider: varchar("provider", { length: 128 }).notNull(),
		providerAccountId: varchar("provider_account_id", { length: 256 }).notNull(),
		refreshToken: text("refresh_token"),
		accessToken: text("access_token"),
		expiresAtMs: bigint("expires_at_ms", { mode: "number" }),
		refreshTokenExpiresAtMs: bigint("refresh_token_expires_at_ms", { mode: "number" }),
		tokenType: varchar("token_type", { length: 64 }),
		scope: text("scope"),
		idToken: text("id_token"),
		sessionState: text("session_state")
	},
	(table) => [
		uniqueIndex("accounts_provider_provider_account_id_unique_idx").on(
			table.provider,
			table.providerAccountId
		),
		index("accounts_user_id_idx").on(table.userId)
	]
)

export { accounts }
