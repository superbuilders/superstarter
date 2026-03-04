import "@/env"
import * as errors from "@superbuilders/errors"
import { sql } from "drizzle-orm"
import { db } from "@/db"
import { logger } from "@/logger"

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

		const result = await errors.try(
			db.execute(sql`DROP SCHEMA IF EXISTS ${sql.identifier(schemaName)} CASCADE`)
		)
		if (result.error) {
			logger.error(
				{
					schema: schemaName,
					error: result.error
				},
				"failed to drop schema"
			)
			success = false
		} else {
			logger.info({ schema: schemaName }, "successfully dropped schema")
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
await dropSchemas(schemaNames)
