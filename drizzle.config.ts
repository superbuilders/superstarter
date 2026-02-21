import type { Config } from "drizzle-kit"

import { env } from "@/env"

export default {
	schema: "./src/db/schemas/core.ts",
	dialect: "postgresql",
	dbCredentials: {
		url: env.DATABASE_URL
	},
	schemaFilter: ["core"],
	migrations: {
		table: "__drizzle_migrations",
		schema: "core"
	}
} satisfies Config
