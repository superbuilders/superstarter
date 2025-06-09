import { loadEnvConfig } from "@next/env"
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { sql } from "drizzle-orm"
import { db } from "@/db"

const projectDir = process.cwd()
loadEnvConfig(projectDir)

async function dropSchemas(schemaNames: string[]) {
	if (schemaNames.length === 0) {
		logger.info("no schemas specified to drop")
		process.exit(0)
	}

	let success = true

	for (const schemaName of schemaNames) {
		if (!schemaName.trim()) {
			logger.warn("skipping empty schema name")
			continue
		}

		const result = await errors.try(db.execute(sql`DROP SCHEMA IF EXISTS ${sql.identifier(schemaName)} CASCADE`))
		if (result.error) {
			logger.error("failed to drop schema", { schema: schemaName, error: result.error })
			success = false
		} else {
			logger.info("successfully dropped schema", { schema: schemaName })
		}
	}

	if (success) {
		logger.info("all specified schemas dropped successfully")
		process.exit(0)
	} else {
		logger.error("some schemas failed to drop")
		process.exit(1)
	}
}

const schemaNames = process.argv.slice(2)
dropSchemas(schemaNames)
