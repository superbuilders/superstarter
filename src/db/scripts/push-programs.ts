import "@/env"
import * as errors from "@superbuilders/errors"
import { createAdminDb } from "@/db/admin"
import { programs } from "@/db/programs"
import { logger } from "@/logger"

async function main() {
	await using adminDb = await createAdminDb()
	logger.info({ count: programs.length }, "applying database programs")
	for (const program of programs) {
		const result = await errors.try(adminDb.db.execute(program))
		if (result.error) {
			logger.error({ error: result.error }, "program execution failed")
			throw errors.wrap(result.error, "program execution")
		}
	}
	logger.info("done")
}

const result = await errors.try(main())
if (result.error) {
	logger.error({ error: result.error }, "apply programs failed")
	process.exit(1)
}
