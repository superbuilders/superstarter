import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { file, Glob, SQL } from "bun"
import { env } from "@/env"

const programsDir = `${import.meta.dir}/../programs`

async function apply(dir: string) {
	const glob = new Glob("*.sql")
	const fullPath = `${programsDir}/${dir}`
	const result = await errors.try(Array.fromAsync(glob.scan({ cwd: fullPath })))
	if (result.error) {
		logger.debug("directory does not exist, skipping", { dir })
		return
	}

	const sqlFiles = result.data.sort()
	if (sqlFiles.length === 0) {
		logger.debug("no sql files found", { dir })
		return
	}

	await using stack = new AsyncDisposableStack()
	const sql = new SQL(env.DATABASE_URL)
	stack.defer(async () => {
		await sql.close()
	})

	for (const f of sqlFiles) {
		const content = await file(`${fullPath}/${f}`).text()
		logger.info("applying", { file: `${dir}/${f}` })
		await sql.unsafe(content)
	}
}

async function main() {
	logger.info("applying database programs")
	await apply("functions")
	await apply("triggers")
	logger.info("done")
}

main()
