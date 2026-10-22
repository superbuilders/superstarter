import { defineConfig } from "drizzle-kit"
import { Effect, Redacted } from "effect"
import { databaseUrl } from "#env.ts"

export default defineConfig({
	dialect: "postgresql",
	schema: "../../data/database/drizzle.schema.ts",
	out: "../../data/database/drizzle",
	schemaFilter: ["core"],
	dbCredentials: { url: Redacted.value(Effect.runSync(databaseUrl)) }
})
