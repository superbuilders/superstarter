import type { Config } from "drizzle-kit"

import { env } from "@/env"

export default {
	schema: "./src/db/schemas/agent.ts",
	dialect: "postgresql",
	dbCredentials: {
		url: env.DATABASE_URL
	},
	schemaFilter: ["agent"]
} satisfies Config
