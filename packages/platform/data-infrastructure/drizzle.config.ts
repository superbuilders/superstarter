import { defineConfig } from "drizzle-kit"
import { Config, Effect, Redacted } from "effect"

const databaseUrl = Effect.runSync(Config.Redacted("DATABASE_URL"))

export default defineConfig({
	dialect: "postgresql",
	schema: "../../data/database/drizzle.schema.ts",
	out: "../../data/database/drizzle",
	schemaFilter: ["core"],
	dbCredentials: { url: Redacted.value(databaseUrl) }
})
