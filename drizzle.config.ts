import type { Config } from "drizzle-kit"

import { env } from "@/env"

export default {
	schema: "./src/db/schemas/index.ts",
	dialect: "postgresql",
	dbCredentials: {
		url: env.DATABASE_URL
	},
	schemaFilter: ["core"]
} satisfies Config
