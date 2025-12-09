import { sql } from "drizzle-orm"
import { index, integer, pgSchema, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core"

const schema = pgSchema("core")
export { schema as coreSchema }

const users = schema.table("user", {
	id: uuid("id").defaultRandom().notNull().primaryKey(),
	name: varchar("name", { length: 255 }).notNull().default(""),
	email: varchar("email", { length: 255 }).notNull(),
	emailVerified: timestamp("email_verified", {
		mode: "date",
		withTimezone: true
	}),
	image: varchar("image", { length: 255 }).notNull().default("")
})
export { users as coreUsers }

const accounts = schema.table(
	"account",
	{
		userId: uuid("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		type: varchar("type", { length: 255 }).notNull(),
		provider: varchar("provider", { length: 255 }).notNull(),
		providerAccountId: varchar("provider_account_id", { length: 255 }).notNull(),
		refresh_token: text("refresh_token"),
		access_token: text("access_token"),
		expires_at: integer("expires_at"),
		token_type: varchar("token_type", { length: 255 }),
		scope: varchar("scope", { length: 255 }),
		id_token: text("id_token"),
		session_state: varchar("session_state", { length: 255 })
	},
	(table) => [
		{ primaryKey: [table.provider, table.providerAccountId] },
		index("account_user_id_idx").on(table.userId)
	]
)
export { accounts as coreAccounts }

const sessions = schema.table(
	"session",
	{
		sessionToken: varchar("session_token", { length: 255 }).notNull().primaryKey(),
		userId: uuid("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		expires: timestamp("expires", {
			mode: "date",
			withTimezone: true
		}).notNull()
	},
	(table) => [index("session_user_id_idx").on(table.userId)]
)
export { sessions as coreSessions }

const verificationTokens = schema.table(
	"verification_token",
	{
		identifier: varchar("identifier", { length: 255 }).notNull(),
		token: varchar("token", { length: 255 }).notNull(),
		expires: timestamp("expires", {
			mode: "date",
			withTimezone: true
		}).notNull()
	},
	(table) => [{ primaryKey: [table.identifier, table.token] }]
)
export { verificationTokens as coreVerificationTokens }

const posts = schema.table(
	"post",
	{
		id: uuid("id").defaultRandom().notNull().primaryKey(),
		title: varchar("title", { length: 256 }).notNull(),
		content: text("content").notNull().default(""),
		createdById: uuid("created_by_id")
			.notNull()
			.references(() => users.id),
		createdAt: timestamp("created_at", { withTimezone: true })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
	},
	(table) => [
		index("post_created_by_id_idx").on(table.createdById),
		index("post_title_idx").on(table.title)
	]
)
export { posts as corePosts }
