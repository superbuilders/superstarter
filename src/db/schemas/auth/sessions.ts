import { bigint, pgTable, uuid, varchar } from "drizzle-orm/pg-core"
import { users } from "@/db/schemas/auth/users"

const authSessions = pgTable("sessions", {
	sessionToken: varchar("session_token", { length: 256 }).primaryKey(),
	userId: uuid("user_id")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	expiresMs: bigint("expires_ms", { mode: "number" }).notNull()
})

export { authSessions }
