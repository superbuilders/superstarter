import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { db } from "@/db"
import { programs } from "@/db/programs"

async function main() {
	logger.info("applying database programs", { count: programs.length })
	for (const program of programs) {
		const result = await errors.try(db.execute(program))
		if (result.error) {
			logger.error("program execution failed", { error: result.error })
			throw errors.wrap(result.error, "program execution")
		}
	}
	logger.info("done")
}

const result = await errors.try(main())
if (result.error) {
	logger.error("apply programs failed", { error: result.error })
	process.exit(1)
}
