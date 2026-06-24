// biome-ignore-all lint/style/noProcessEnv: drizzle.config runs under the shim that injects DATABASE_URL
import * as errors from "@superbuilders/errors"
import type { Config } from "drizzle-kit"
import { logger } from "@/logger"

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
	logger.error("DATABASE_URL not set; run drizzle-kit via the shim (bun db:push, db:migrate, …)")
	throw errors.new("DATABASE_URL not set; run drizzle-kit via the shim")
}

export default {
	schema: "./src/db/schemas/**/*.ts",
	dialect: "postgresql",
	dbCredentials: {
		url: databaseUrl
	}
} satisfies Config
