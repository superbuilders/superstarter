import { defineConfig } from "drizzle-kit"
import { Config, Effect, Redacted } from "effect"

// drizzle-kit runs only under scripts/studio.ts, which signs in as the master user and hands the
// connection string over in DATABASE_URL. The schema and its migrations belong to
// @superstarter/database, which never holds a credential.
const databaseUrl = Effect.runSync(Config.Redacted("DATABASE_URL"))

export default defineConfig({
	dialect: "postgresql",
	schema: "../../data/database/drizzle.schema.ts",
	out: "../../data/database/drizzle",
	schemaFilter: ["core"],
	dbCredentials: { url: Redacted.value(databaseUrl) }
})
