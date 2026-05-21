import { bigint, pgTable, primaryKey, varchar } from "drizzle-orm/pg-core"

const verificationTokens = pgTable(
	"verification_tokens",
	{
		identifier: varchar("identifier", { length: 320 }).notNull(),
		token: varchar("token", { length: 256 }).notNull(),
		expiresMs: bigint("expires_ms", { mode: "number" }).notNull()
	},
	(table) => [
		primaryKey({
			name: "verification_tokens_identifier_token_pk",
			columns: [table.identifier, table.token]
		})
	]
)

export { verificationTokens }
